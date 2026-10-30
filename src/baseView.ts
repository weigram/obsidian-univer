import type { IBaseSnapshot } from '@univerjs/core'
import { BaseFieldType } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'
import type { FBase, FBaseTable, FBaseTableField } from '@univerjs-pro/bases/facade'
import type { Univer } from '@univerjs/presets'
import type { WorkspaceLeaf } from 'obsidian'

import { TextFileView } from 'obsidian'
import { bootBases, LocaleType } from '@/univer/bases'
import { isChinese } from './lang'
import type UniverPlugin from './main'

export const BASE_VIEW_TYPE = 'univer-base'

interface IDisposableLike {
  dispose: () => void
}

function isDarkTheme(): boolean {
  return document.body.classList.contains('theme-dark')
}

function resolveLocale(language: UniverPlugin['settings']['language']): LocaleType {
  if (language === 'zh')
    return LocaleType.ZH_CN
  if (language === 'en')
    return LocaleType.EN_US

  return isChinese() ? LocaleType.ZH_CN : LocaleType.EN_US
}

/**
 * One Univer Bases instance per `.ubase` file.
 *
 * The file stores a Base snapshot (tables, fields, records, views) as JSON.
 * Univer Bases is a Pro product: without a license it runs in evaluation mode
 * (watermark / feature limits). The license text is supplied via settings.
 */
export class UBaseView extends TextFileView {
  private readonly plugin: UniverPlugin
  private univer: Univer | null = null
  private univerAPI: FUniver | null = null
  private base: FBase | null = null
  private commandSubscription: IDisposableLike | null = null
  private lastSerialized: string | null = null
  private contentDirty = false
  private checkTimer: number | null = null
  private pendingSelectFieldName: string | null = null
  private syncingTimestamps = false

  constructor(leaf: WorkspaceLeaf, plugin: UniverPlugin) {
    super(leaf)
    this.plugin = plugin
  }

  override getViewType(): string {
    return BASE_VIEW_TYPE
  }

  override getIcon(): string {
    return 'univer'
  }

  override getDisplayText(): string {
    return this.file?.basename ?? 'Univer Base'
  }

  override async onOpen(): Promise<void> {
    this.contentEl.addClass('univer-view-content', 'univer-base-view')
    this.registerEvent(this.app.workspace.on('css-change', () => {
      this.univerAPI?.toggleDarkMode(isDarkTheme())
    }))
    this.registerDomEvent(document, 'pointerdown', event => this.rememberSelectField(event), true)
    this.registerDomEvent(document, 'keydown', event => this.handleSelectKeydown(event), true)
  }

  override setViewData(data: string, clear: boolean): void {
    this.data = data

    if (this.lastSerialized !== null && data === this.lastSerialized) {
      this.lastSerialized = null
      return
    }

    if (clear)
      this.destroyUniver()

    this.render(data)
  }

  override getViewData(): string {
    if (!this.base)
      return this.data ?? ''

    if (!this.contentDirty && this.data)
      return this.data

    try {
      const json = JSON.stringify(this.base.save())
      this.data = json
      this.lastSerialized = json
      this.contentDirty = false
      return json
    }
    catch (error) {
      console.error('[univer] failed to serialize base', error)
      return this.data ?? ''
    }
  }

  override clear(): void {
    this.destroyUniver()
    this.contentEl.empty()
  }

  override async onClose(): Promise<void> {
    if (this.base && this.file) {
      try {
        const json = JSON.stringify(this.base.save())
        if (json !== this.lastSerialized) {
          this.data = json
          this.contentDirty = true
          await this.save()
        }
      }
      catch (error) {
        console.error('[univer] failed to save base', error)
      }
    }

    this.destroyUniver()
    this.contentEl.empty()
  }

  rerender(): void {
    if (!this.base)
      return

    const current = this.getViewData()
    this.destroyUniver()
    this.render(current)
  }

  private render(raw: string): void {
    this.destroyUniver()
    this.contentEl.empty()

    let snapshot: Partial<IBaseSnapshot> | null = null
    if (raw.trim()) {
      try {
        snapshot = JSON.parse(raw) as Partial<IBaseSnapshot>
      }
      catch (error) {
        console.error('[univer] invalid .ubase JSON', error)
        this.showError()
        return
      }
    }

    const container = this.contentEl.createDiv({ cls: 'univer-app univer-base-app' })
    const { univer, univerAPI } = bootBases(container, {
      locale: resolveLocale(this.plugin.settings.language),
      darkMode: isDarkTheme(),
      license: this.plugin.settings.basesLicense,
    })

    this.univer = univer
    this.univerAPI = univerAPI

    try {
      this.base = univerAPI.createBase(snapshot ?? {})
    }
    catch (error) {
      console.error('[univer] failed to create base', error)
      this.showError()
      return
    }

    this.lastSerialized = JSON.stringify(this.base.save())

    this.commandSubscription = univerAPI.addEvent(univerAPI.Event.CommandExecuted, () => {
      this.scheduleSaveCheck()
    })

    if (!raw.trim()) {
      this.contentDirty = true
      this.requestSave()
    }

    // Existing Bases may not have the timestamp fields yet.
    window.setTimeout(() => {
      if (this.syncKanbanTimestamps()) {
        this.contentDirty = true
        this.requestSave()
      }
    }, 800)
  }

  /**
   * Remember which single-select field opened the record editor. The floating
   * editor is rendered in a body-level portal and carries no field id, so the
   * row label is the only reliable link back to the field.
   */
  private rememberSelectField(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLElement))
      return

    const row = target.closest<HTMLElement>('[data-field-type="singleSelect"]')
    if (!row)
      return

    const label = (row.parentElement ?? row)
      .querySelector<HTMLElement>('button[aria-label^="编辑 "], button[aria-label^="Edit "]')
    const labelText = label?.getAttribute('aria-label')?.replace(/^(编辑|Edit)\s+/i, '')
    if (labelText)
      this.pendingSelectFieldName = labelText
  }

  /**
   * Univer Bases' single-select editor only filters existing options. When the
   * user types a value that does not exist and presses Enter, add the option to
   * the field and select it in the open editor.
   */
  private handleSelectKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement))
      return

    const input = event.target
    if (!input.placeholder.includes('选择或添加') && !input.placeholder.toLowerCase().includes('select or add'))
      return
    if (!input.closest('[data-u-comp="base-record-detail-floating-editor"]'))
      return

    const value = input.value.trim()
    const fieldName = this.pendingSelectFieldName
    if (!value || !fieldName || !this.base)
      return

    const field = this.findSelectField(fieldName)
    if (!field)
      return

    const config = field.getConfig() as { options?: Array<{ id: string, name: string, color?: string } | string> } & Record<string, unknown>
    const options = (config.options ?? []).map(option => typeof option === 'string' ? { id: option, name: option } : option)
    if (options.some(option => option.name === value))
      return

    const option = {
      id: `opt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: value,
      color: '#3b82f6',
    }
    if (!field.setConfig({ ...config, options: [...options, option] }))
      return

    event.preventDefault()
    event.stopPropagation()

    // The option list is controlled by the field config, so let it re-render
    // and then select the freshly added option.
    window.setTimeout(() => {
      const editor = document.querySelector('[data-u-comp="base-select-cell-editor"]')
      if (!editor)
        return
      const candidate = Array.from(editor.querySelectorAll<HTMLElement>('button, [role="option"]'))
        .find(element => element.textContent?.trim() === value)
      candidate?.click()
    }, 180)
  }

  private findSelectField(name: string) {
    for (const table of this.base?.getTables() ?? []) {
      const field = table.getFields().find(item => item.getName() === name)
      if (field)
        return field
    }
    return null
  }

  private scheduleSaveCheck(): void {
    if (this.checkTimer !== null)
      window.clearTimeout(this.checkTimer)

    this.checkTimer = window.setTimeout(() => {
      this.checkTimer = null
      this.checkForChanges()
    }, 600)
  }

  private checkForChanges(): void {
    if (!this.base)
      return

    try {
      if (this.syncKanbanTimestamps()) {
        this.contentDirty = true
        this.requestSave()
      }

      const json = JSON.stringify(this.base.save())
      if (json !== this.lastSerialized) {
        this.contentDirty = true
        this.requestSave()
      }
    }
    catch (error) {
      console.error('[univer] failed to read base snapshot', error)
    }
  }

  /**
   * Maintain timestamp fields the user created by hand.
   *
   * - Any `date` field whose config has `defaultMode: 'recordCreatedAt'` is
   *   backfilled from `record.createdAt`. Univer only evaluates that default
   *   inside the field/date editors, so records created normally (and records
   *   that already existed) would otherwise stay empty.
   * - `完成时间` is set when a Kanban card enters `已完成`, and cleared when it
   *   leaves. It is only touched when the field exists.
   */
  private syncKanbanTimestamps(): boolean {
    if (!this.base || this.syncingTimestamps)
      return false

    this.syncingTimestamps = true
    let changed = false

    try {
      for (const table of this.base.getTables()) {
        this.fillRecordCreatedAtDefaults(table, () => {
          changed = true
        })

        const kanban = table.getViews().find(view => view.getType() === 'kanban')
        if (!kanban)
          continue

        const groupFieldId = (kanban.getConfig() as { groupFieldId?: string }).groupFieldId
        if (!groupFieldId)
          continue

        const statusField = table.getFields().find(field => field.getId() === groupFieldId)
        const statusConfig = statusField?.getConfig() as { options?: Array<{ id: string, name: string } | string> } | undefined
        const doneOption = (statusConfig?.options ?? [])
          .map(option => typeof option === 'string' ? { id: option, name: option } : option)
          .find(option => option.name === '已完成')
        if (!doneOption)
          continue

        const doneField = table.getFields().find(field =>
          field.getName() === '完成时间' && field.getType() === BaseFieldType.Date)

        for (const record of table.getRecords()) {
          const values = record.getValues()

          if (!doneField)
            continue

          const isDone = values[groupFieldId] === doneOption.id
          const completedAt = values[doneField.getId()]
          if (isDone && (completedAt == null || completedAt === '')) {
            if (record.setValue(doneField.getId(), this.toBaseDate(Date.now(), doneField)))
              changed = true
          }
          else if (!isDone && completedAt != null && completedAt !== '') {
            if (record.setValue(doneField.getId(), null))
              changed = true
          }
        }
      }
    }
    catch (error) {
      console.error('[univer] failed to sync Kanban timestamps', error)
    }
    finally {
      this.syncingTimestamps = false
    }

    return changed
  }

  /**
   * Backfill user-created `date` fields configured with the
   * `recordCreatedAt` default mode. Only empty cells are written, so an
   * explicit value is never overwritten.
   */
  private fillRecordCreatedAtDefaults(
    table: FBaseTable,
    onChange: () => void,
  ): void {
    const targets = table.getFields().filter((field) => {
      if (field.getType() !== BaseFieldType.Date)
        return false
      const config = field.getConfig() as { defaultMode?: string }
      return config.defaultMode === 'recordCreatedAt'
    })

    if (!targets.length)
      return

    for (const record of table.getRecords()) {
      const values = record.getValues()
      const createdAt = record.getRecord().createdAt
      if (!createdAt)
        continue

      for (const field of targets) {
        const current = values[field.getId()]
        if (current != null && current !== '')
          continue
        if (record.setValue(field.getId(), this.toBaseDate(createdAt, field)))
          onChange()
      }
    }
  }

  /**
   * Convert a JS timestamp to the Excel serial used by Base date fields and
   * follow the field's `includeTime` setting: date-only fields get an integer.
   */
  private toBaseDate(timestamp: number, field: FBaseTableField): number {
    const serial = timestamp / 86_400_000 + 25_569
    const config = field.getConfig() as { includeTime?: boolean }
    return config.includeTime ? serial : Math.floor(serial)
  }

  private showError(): void {
    this.destroyUniver()
    this.contentEl.empty()

    const zh = isChinese()
    const container = this.contentEl.createDiv({ cls: 'univer-error' })
    container.createEl('h3', {
      text: zh ? '无法打开这个多维表格' : 'Could not open this base',
    })
    container.createEl('p', {
      text: zh
        ? '文件内容不是有效的 Univer Bases JSON。为避免覆盖原始数据，已停止加载。'
        : 'The file is not a valid Univer Bases snapshot. Loading stopped so the original data is not overwritten.',
    })
    container.createEl('p', {
      cls: 'univer-error-hint',
      text: this.file?.path ?? '',
    })
  }

  private destroyUniver(): void {
    this.commandSubscription?.dispose()
    this.commandSubscription = null

    if (this.checkTimer !== null) {
      window.clearTimeout(this.checkTimer)
      this.checkTimer = null
    }

    try {
      this.univer?.dispose()
    }
    catch (error) {
      console.error('[univer] failed to dispose base instance', error)
    }

    this.univer = null
    this.univerAPI = null
    this.base = null
    this.contentDirty = false
  }
}
