export interface SheetViewState {
  /** Currently active sheet id. */
  sheetId: string
  /** First visible row of the main viewport. */
  row: number
  /** First visible column of the main viewport. */
  column: number
  /** Pixel offset inside the first visible row. */
  offsetX: number
  /** Pixel offset inside the first visible column. */
  offsetY: number
  /** Zoom ratio (0.1 – 4). */
  zoom: number
}

export interface UniverSettings {
  /**
   * UI language of the spreadsheet. `auto` follows Obsidian's language.
   */
  language: 'auto' | 'zh' | 'en'
  /**
   * Last viewport per file path, so reopening a sheet returns to the same
   * place. Stored in the plugin's data.json, not in the sheet itself.
   */
  viewStates: Record<string, SheetViewState>
  /**
   * Univer Bases (relational table) license text. Empty means evaluation mode.
   * Kept in the plugin's data.json and never committed to the repository.
   */
  basesLicense: string
}

export const DEFAULT_SETTINGS: UniverSettings = {
  language: 'auto',
  viewStates: {},
  basesLicense: '',
}
