# Univer for Obsidian

English | [简体中文](README.zh-CN.md)

Obsidian plugin for Univer spreadsheets and relational tables, powered by Univer **1.2.0**.

![Univer spreadsheet inside Obsidian](./assets/screenshot.png)

## What it does

- Opens, edits and saves `.usheet` spreadsheets and `.ubase` relational tables inside Obsidian.
- Single-select fields can create a missing option directly from the record editor (press Enter).
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
| `@univerjs-pro/bases` | 1.2.0 | Univer Bases model and commands (relational tables) |
| `@univerjs-pro/bases-ui` | 1.2.0 | Bases UI and render integration |
| `@univerjs-pro/license` | 1.2.0 | Univer Pro license registration |
| `@univerjs-pro/engine-formula` | 1.2.0 | Pro formula engine required by Bases |

All `@univerjs/*` packages are pinned to the same version (`1.2.0`).

Only the sheets-core preset and the Bases plugins are registered; docs, Excel
import/export and collaboration packages are intentionally not included.

> **Univer Bases is part of Univer Pro.** This build bundles `@univerjs-pro`
> packages. Keep the repository private and do not redistribute it without a
> commercial Univer Pro license. Add a license in the plugin settings to leave
> evaluation mode.
