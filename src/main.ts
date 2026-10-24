import { addIcon, normalizePath, Notice, Plugin, TFile } from 'obsidian'
import { univerIcon } from './icon'
import { isChinese } from './lang'
import { DEFAULT_SETTINGS, type SheetViewState, type UniverSettings } from './settings'
import { UniverSettingTab } from './settingsTab'
import { BASE_VIEW_TYPE, UBaseView } from './baseView'
import { USheetView, VIEW_TYPE } from './view'

import './styles/univer.css'

export default class UniverPlugin extends Plugin {
  settings: UniverSettings = { ...DEFAULT_SETTINGS }
  private viewStateSaveTimer: number | null = null

  async onload(): Promise<void> {
    await this.loadSettings()

    addIcon('univer', univerIcon)
    this.registerView(VIEW_TYPE, leaf => new USheetView(leaf, this))
    this.registerExtensions(['usheet'], VIEW_TYPE)

    this.registerView(BASE_VIEW_TYPE, leaf => new UBaseView(leaf, this))
    this.registerExtensions(['ubase', 'bases'], BASE_VIEW_TYPE)

    this.addRibbonIcon('univer', this.t('新建表格', 'New spreadsheet'), () => {
      void this.createSpreadsheet()
    })

    this.addCommand({
      id: 'create-spreadsheet',
      name: this.t('新建表格', 'New spreadsheet'),
      callback: () => void this.createSpreadsheet(),
    })

    this.addCommand({
      id: 'create-base',
      name: this.t('新建多维表格', 'New relational table'),
      callback: () => void this.createBase(),
    })

    this.addSettingTab(new UniverSettingTab(this.app, this))

    // Keep Obsidian's status bar on the same row as Univer's sheet footer
    // while a spreadsheet is the active view.
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.syncStatusBarLayout()))
    this.registerEvent(this.app.workspace.on('layout-change', () => this.syncStatusBarLayout()))
    this.registerDomEvent(window, 'resize', () => this.syncStatusBarLayout())
    this.app.workspace.onLayoutReady(() => this.syncStatusBarLayout())
  }

  onunload(): void {
    if (this.viewStateSaveTimer !== null)
      window.clearTimeout(this.viewStateSaveTimer)
    document.body.classList.remove('univer-sheet-active', 'univer-status-narrow')
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData() ?? {}) as { language?: unknown, viewStates?: unknown, basesLicense?: unknown }
    const language = loaded.language

    // v1 stored upper-case language codes; keep existing vaults working.
    this.settings = {
      language: language === 'ZH' || language === 'zh'
        ? 'zh'
        : language === 'EN' || language === 'en'
          ? 'en'
          : 'auto',
      viewStates: this.parseViewStates(loaded.viewStates),
      basesLicense: typeof loaded.basesLicense === 'string' ? loaded.basesLicense : '',
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings)
  }

  getViewState(path: string): SheetViewState | undefined {
    return this.settings.viewStates[path]
  }

  setViewState(path: string, state: SheetViewState, immediate = false): void {
    const previous = this.settings.viewStates[path]
    if (previous
      && previous.sheetId === state.sheetId
      && previous.row === state.row
      && previous.column === state.column
      && previous.offsetX === state.offsetX
      && previous.offsetY === state.offsetY
      && previous.zoom === state.zoom) {
      return
    }

    this.settings.viewStates[path] = state

    if (this.viewStateSaveTimer !== null) {
      window.clearTimeout(this.viewStateSaveTimer)
      this.viewStateSaveTimer = null
    }

    if (immediate) {
      void this.saveSettings()
      return
    }

    this.viewStateSaveTimer = window.setTimeout(() => {
      this.viewStateSaveTimer = null
      void this.saveSettings()
    }, 800)
  }

  /**
   * Position Obsidian's status bar inside Univer's footer row, just before
   * the zoom controls. Obsidian renders the status bar as a fixed overlay,
   * which otherwise creates a second row below the sheet tabs.
   */
  syncStatusBarLayout(): void {
    const activeView = this.app.workspace.activeLeaf?.view
    const isSheet = activeView?.getViewType?.() === VIEW_TYPE

    document.body.classList.toggle('univer-sheet-active', isSheet)
    document.body.classList.toggle('univer-status-narrow', false)

    if (!isSheet || !(activeView instanceof USheetView))
      return

    // Toggling the body class reflows the workspace (Obsidian's status bar
    // leaves the normal flow), so measure on the next frame.
    requestAnimationFrame(() => this.measureStatusBar(activeView))
  }

  private measureStatusBar(view: USheetView, attempt = 0): void {
    if (this.app.workspace.activeLeaf?.view !== view)
      return

    const container = view.contentEl.querySelector<HTMLElement>('.univer-app')
    const footer = view.contentEl.querySelector<HTMLElement>('footer')
    const section = footer?.querySelector<HTMLElement>('section')
    const groups = section
      ? Array.from(section.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
      : []
    const rightGroup = groups[1] ?? groups[groups.length - 1]

    if (!container || !footer || !rightGroup) {
      document.body.classList.add('univer-status-narrow')
      if (attempt < 10)
        window.setTimeout(() => this.measureStatusBar(view, attempt + 1), 100)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const footerRect = footer.getBoundingClientRect()
    const rightRect = rightGroup.getBoundingClientRect()

    if (containerRect.width < 780) {
      document.body.classList.add('univer-status-narrow')
      return
    }

    document.body.style.setProperty(
      '--univer-status-right',
      `${Math.max(12, Math.round(window.innerWidth - rightRect.left + 8))}px`,
    )
    document.body.style.setProperty(
      '--univer-status-bottom',
      `${Math.max(0, Math.round(window.innerHeight - footerRect.bottom + 5))}px`,
    )
  }

  /**
   * Ask every open spreadsheet view to rebuild with the current settings
   * (currently only the UI language can change).
   */
  refreshOpenViews(): void {
    for (const type of [VIEW_TYPE, BASE_VIEW_TYPE]) {
      for (const leaf of this.app.workspace.getLeavesOfType(type)) {
        const view = leaf.view
        if (view instanceof USheetView || view instanceof UBaseView)
          view.rerender()
      }
    }
  }

  private async createSpreadsheet(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile()
    const folder = activeFile
      ? this.app.fileManager.getNewFileParent(activeFile.path)
      : this.app.vault.getRoot()

    const baseName = isChinese() ? '未命名表格' : 'Untitled'
    let path = normalizePath(`${folder.path}/${baseName}.usheet`)
    let index = 1
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${folder.path}/${baseName} ${index}.usheet`)
      index += 1
    }

    let file: TFile
    try {
      file = await this.app.vault.create(path, '')
    }
    catch (error) {
      console.error('[univer] failed to create spreadsheet', error)
      new Notice(this.t('无法创建表格文件', 'Could not create spreadsheet'))
      return
    }

    await this.app.workspace.getLeaf('tab').openFile(file)
  }

  private async createBase(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile()
    const folder = activeFile
      ? this.app.fileManager.getNewFileParent(activeFile.path)
      : this.app.vault.getRoot()

    const baseName = isChinese() ? '未命名多维表格' : 'Untitled base'
    let path = normalizePath(`${folder.path}/${baseName}.ubase`)
    let index = 1
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${folder.path}/${baseName} ${index}.ubase`)
      index += 1
    }

    let file: TFile
    try {
      file = await this.app.vault.create(path, '')
    }
    catch (error) {
      console.error('[univer] failed to create base', error)
      new Notice(this.t('无法创建多维表格文件', 'Could not create relational table'))
      return
    }

    await this.app.workspace.getLeaf('tab').openFile(file)
  }

  private parseViewStates(value: unknown): Record<string, SheetViewState> {
    if (!value || typeof value !== 'object')
      return {}

    const states: Record<string, SheetViewState> = {}
    for (const [path, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!raw || typeof raw !== 'object')
        continue

      const state = raw as Partial<SheetViewState>
      if (typeof state.sheetId !== 'string' || typeof state.row !== 'number' || typeof state.column !== 'number')
        continue

      states[path] = {
        sheetId: state.sheetId,
        row: Math.max(0, Math.floor(state.row)),
        column: Math.max(0, Math.floor(state.column)),
        offsetX: typeof state.offsetX === 'number' ? Math.max(0, state.offsetX) : 0,
        offsetY: typeof state.offsetY === 'number' ? Math.max(0, state.offsetY) : 0,
        zoom: typeof state.zoom === 'number' ? state.zoom : 1,
      }
    }

    return states
  }

  private t(zh: string, en: string): string {
    return isChinese() ? zh : en
  }
}

