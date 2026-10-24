import type { IWorkbookData } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'
import type { FWorkbook } from '@univerjs/sheets/facade'
import type { Univer } from '@univerjs/presets'
import type { WorkspaceLeaf } from 'obsidian'

import { ICommandService, IUndoRedoService } from '@univerjs/core'
import { ScrollCommand } from '@univerjs/preset-sheets-core'
import { TextFileView } from 'obsidian'
import { bootUniver, LocaleType } from '@/univer/boot'
import { isChinese } from './lang'
import type UniverPlugin from './main'

export const VIEW_TYPE = 'univer-sheet'

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
 * One Univer instance per open `.usheet` file.
 *
 * The file itself is a plain JSON snapshot (`IWorkbookData`), which is also
 * what Univer writes back. That makes files portable between Univer releases
 * and keeps them diffable in git.
 */
export class USheetView extends TextFileView {
  private readonly plugin: UniverPlugin
  private univer: Univer | null = null
  private univerAPI: FUniver | null = null
  private workbook: FWorkbook | null = null
  private undoRedoSubscription: { unsubscribe: () => void } | null = null
  private lastUndoCount = 0
  private lastRedoCount = 0
  private lastSerialized: string | null = null
  private contentDirty = false
  private stateSaveTimer: number | null = null
  private restoreTimer: number | null = null
  private stateDirty = false
  private restoring = false
  private uiSubscriptions: Array<{ dispose: () => void }> = []

  constructor(leaf: WorkspaceLeaf, plugin: UniverPlugin) {
    super(leaf)
    this.plugin = plugin
  }

  override getViewType(): string {
    return VIEW_TYPE
  }

  override getIcon(): string {
    return 'univer'
  }

  override getDisplayText(): string {
    return this.file?.basename ?? 'Univer'
  }

  override async onOpen(): Promise<void> {
    this.contentEl.addClass('univer-view-content')
    this.registerEvent(this.app.workspace.on('css-change', () => {
      this.univerAPI?.toggleDarkMode(isDarkTheme())
    }))
    this.registerDomEvent(window, 'resize', () => this.plugin.syncStatusBarLayout())
  }

  override setViewData(data: string, clear: boolean): void {
    this.data = data

    // Obsidian hands the data back to us after a save. Do not rebuild the
    // spreadsheet in that case: it would reset the viewport and selection.
    if (this.lastSerialized !== null && data === this.lastSerialized) {
      this.lastSerialized = null
      return
    }

    if (clear)
      this.destroyUniver()

    this.render(data)
  }

  override getViewData(): string {
    if (!this.workbook)
      return this.data ?? ''

    // Untouched files stay byte-for-byte identical: Obsidian asks for the
    // view data when a tab is closed, and serializing here would rewrite the
    // whole file (and trigger a sync) for no reason.
    if (!this.contentDirty && this.data)
      return this.data

    try {
      const json = JSON.stringify(this.workbook.save())
      this.data = json
      this.lastSerialized = json
      this.contentDirty = false
      return json
    }
    catch (error) {
      console.error('[univer] failed to serialize workbook', error)
      return this.data ?? ''
    }
  }

  override clear(): void {
    this.destroyUniver()
    this.contentEl.empty()
  }

  override async onClose(): Promise<void> {
    this.persistViewState(true)

    // Only flush when something actually changed. Re-saving an untouched file
    // would rewrite it in the current Univer format for no reason.
    if (this.contentDirty && this.workbook && this.file) {
      try {
        this.data = this.getViewData()
        await this.save()
      }
      catch (error) {
        console.error('[univer] failed to save workbook', error)
      }
    }

    this.destroyUniver()
    this.contentEl.empty()
    this.plugin.syncStatusBarLayout()
  }

  /** Rebuild the view, e.g. after the language setting changed. */
  rerender(): void {
    if (!this.workbook)
      return

    this.persistViewState(true)
    const current = this.getViewData()
    this.destroyUniver()
    this.render(current)
  }

  private render(raw: string): void {
    this.destroyUniver()
    this.contentEl.empty()

    let workbookData: Partial<IWorkbookData> | null = null
    if (raw.trim()) {
      try {
        workbookData = JSON.parse(raw) as Partial<IWorkbookData>
      }
      catch (error) {
        console.error('[univer] invalid .usheet JSON', error)
        this.showError()
        return
      }
    }

    const container = this.contentEl.createDiv({ cls: 'univer-app' })
    const { univer, univerAPI } = bootUniver(container, {
      locale: resolveLocale(this.plugin.settings.language),
      darkMode: isDarkTheme(),
      header: true,
      toolbar: true,
      ribbonType: 'simple',
      formulaBar: true,
      footer: true,
    })

    this.univer = univer
    this.univerAPI = univerAPI

    try {
      this.workbook = univerAPI.createWorkbook(workbookData ?? {})
    }
    catch (error) {
      console.error('[univer] failed to create workbook', error)
      this.showError()
      return
    }

    // Univer reports cell edits as plain commands, so listen to the undo/redo
    // history instead: only real content changes push an undo item.
    const undoRedoService = univer.__getInjector().get(IUndoRedoService)
    const workbookId = this.workbook.getId()
    const initialStatus = undoRedoService.getUndoRedoStatus(workbookId)
    this.lastUndoCount = initialStatus.undos
    this.lastRedoCount = initialStatus.redos
    this.undoRedoSubscription = undoRedoService.undoRedoStatus$.subscribe(() => {
      const status = undoRedoService.getUndoRedoStatus(workbookId)
      if (status.undos === this.lastUndoCount && status.redos === this.lastRedoCount)
        return

      this.lastUndoCount = status.undos
      this.lastRedoCount = status.redos
      this.contentDirty = true
      this.requestSave()
    })

    // A brand new file is empty until it is first saved.
    if (!raw.trim()) {
      this.contentDirty = true
      this.requestSave()
    }

    this.restoreViewState()
    this.subscribeViewState()

    requestAnimationFrame(() => this.plugin.syncStatusBarLayout())
    window.setTimeout(() => this.plugin.syncStatusBarLayout(), 300)
    window.setTimeout(() => this.plugin.syncStatusBarLayout(), 1000)
  }

  /**
   * Restore the sheet, scroll position and zoom that were visible when the
   * file was last closed.
   */
  private restoreViewState(): void {
    if (!this.workbook || !this.file)
      return

    const state = this.plugin.getViewState(this.file.path)
    if (!state)
      return

    const workbook = this.workbook
    const sheet = workbook.getSheetBySheetId(state.sheetId) ?? workbook.getActiveSheet()

    if (workbook.getActiveSheet().getSheetId() !== sheet.getSheetId())
      workbook.setActiveSheet(sheet)

    // The render unit is created asynchronously; scrolling before that fails.
    // Retry until Univer is ready, and ignore scroll events meanwhile so the
    // restored position is not overwritten by the initial layout.
    this.restoring = true
    const apply = (attempt: number) => {
      this.restoreTimer = null

      try {
        const commandService = this.univer?.__getInjector().get(ICommandService)
        const ok = commandService?.syncExecuteCommand(ScrollCommand.id, {
          unitId: workbook.getId(),
          sheetId: sheet.getSheetId(),
          sheetViewStartRow: state.row,
          sheetViewStartColumn: state.column,
          offsetX: state.offsetX,
          offsetY: state.offsetY,
        })

        if (!ok)
          throw new Error('scroll command was rejected')

        this.restoring = false

        // Zoom after the skeleton is ready; applying it too early makes the
        // zoom command fail inside Univer.
        if (state.zoom >= 0.1 && state.zoom <= 4) {
          window.setTimeout(() => {
            try {
              sheet.zoom(state.zoom)
            }
            catch {
              // The view may have been closed in the meantime.
            }
          }, 100)
        }
      }
      catch (error) {
        if (attempt < 20) {
          this.restoreTimer = window.setTimeout(() => apply(attempt + 1), 100)
        }
        else {
          this.restoring = false
          console.error('[univer] failed to restore view state', error)
        }
      }
    }

    this.restoreTimer = window.setTimeout(() => apply(0), 500)
  }

  private subscribeViewState(): void {
    if (!this.univerAPI)
      return

    const schedule = () => this.scheduleViewStateSave()
    this.uiSubscriptions.push(
      this.univerAPI.addEvent(this.univerAPI.Event.Scroll, schedule),
      this.univerAPI.addEvent(this.univerAPI.Event.SelectionChanged, schedule),
      this.univerAPI.addEvent(this.univerAPI.Event.SheetZoomChanged, schedule),
    )
  }

  private scheduleViewStateSave(): void {
    if (this.restoring)
      return

    this.stateDirty = true

    if (this.stateSaveTimer !== null)
      window.clearTimeout(this.stateSaveTimer)

    this.stateSaveTimer = window.setTimeout(() => {
      this.stateSaveTimer = null
      this.persistViewState(false)
    }, 800)
  }

  private persistViewState(immediate: boolean): void {
    if (!this.stateDirty || !this.workbook || !this.file)
      return

    const sheet = this.workbook.getActiveSheet()
    const scroll = sheet.getScrollState()

    if (!scroll)
      return

    this.plugin.setViewState(this.file.path, {
      sheetId: sheet.getSheetId(),
      row: scroll.sheetViewStartRow,
      column: scroll.sheetViewStartColumn,
      offsetX: scroll.offsetX,
      offsetY: scroll.offsetY,
      zoom: sheet.getZoom(),
    }, immediate)

    this.stateDirty = false
  }

  private showError(): void {
    this.destroyUniver()
    this.contentEl.empty()

    const zh = isChinese()
    const container = this.contentEl.createDiv({ cls: 'univer-error' })
    container.createEl('h3', {
      text: zh ? '无法打开这个表格' : 'Could not open this spreadsheet',
    })
    container.createEl('p', {
      text: zh
        ? '文件内容不是有效的 Univer 表格 JSON。为避免覆盖原始数据，已停止加载。'
        : 'The file is not a valid Univer workbook snapshot. Loading stopped so the original data is not overwritten.',
    })
    container.createEl('p', {
      cls: 'univer-error-hint',
      text: this.file?.path ?? '',
    })
  }

  private destroyUniver(): void {
    this.undoRedoSubscription?.unsubscribe()
    this.undoRedoSubscription = null

    for (const subscription of this.uiSubscriptions)
      subscription.dispose()
    this.uiSubscriptions = []

    if (this.stateSaveTimer !== null) {
      window.clearTimeout(this.stateSaveTimer)
      this.stateSaveTimer = null
    }
    if (this.restoreTimer !== null) {
      window.clearTimeout(this.restoreTimer)
      this.restoreTimer = null
    }
    this.restoring = false

    try {
      this.univer?.dispose()
    }
    catch (error) {
      console.error('[univer] failed to dispose instance', error)
    }

    this.univer = null
    this.univerAPI = null
    this.workbook = null
    this.contentDirty = false
  }
}
