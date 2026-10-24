import type { IBaseSnapshot } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'
import type { FBase } from '@univerjs-pro/bases/facade'
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
