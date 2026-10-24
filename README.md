# Univer for Obsidian

English | [简体中文](README.zh-CN.md)

Spreadsheet-only Obsidian plugin, powered by Univer **1.2.0**.

![Univer spreadsheet inside Obsidian](./assets/screenshot.png)

## What it does

- Opens, edits and saves `.usheet` spreadsheets inside Obsidian.
- Spreadsheet-only interface: compact toolbar, formula bar, sheet tabs and zoom.
- Keeps cell formatting, formulas, multiple sheets and row/column sizes.
- Remembers the active sheet, scroll position and zoom per file, and follows
  Obsidian's light/dark theme and language.

## Univer dependencies

| Package | Version | Used for |
| --- | --- | --- |
| `@univerjs/presets` | 1.2.0 | `createUniver`, locale merging, `defaultTheme` |
| `@univerjs/preset-sheets-core` | 1.2.0 | `UniverSheetsCorePreset`, toolbar, formula bar, number formats, sheet commands |
| `@univerjs/core` | 1.2.0 | core services and types (`ICommandService`, `IUndoRedoService`, `IWorkbookData`) |
| `@univerjs/sheets` | 1.2.0 | workbook / worksheet model and facade types |
| `react` / `react-dom` | 18.3.1 | peer dependencies required by the Univer UI |
| `rxjs` | 7.8.2 | peer dependency required by Univer |

All `@univerjs/*` packages are pinned to the same version (`1.2.0`).

Only the sheets-core preset is registered; docs, Excel import/export and
collaboration packages are intentionally not included.
