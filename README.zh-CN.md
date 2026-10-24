# Univer for Obsidian

简体中文 | [English](README.md)

仅支持表格的 Obsidian 插件，基于 Univer **1.2.0**。

![Obsidian 中的 Univer 表格](./assets/screenshot.png)

## 功能简介

- 在 Obsidian 中打开、编辑和保存 `.usheet` 表格。
- 仅表格界面：紧凑工具栏、公式栏、Sheet 标签和缩放控件。
- 保留单元格格式、公式、多工作表和行列尺寸。
- 记住每个文件的工作表与滚动位置，并跟随 Obsidian 的明暗主题和语言。

## Univer 依赖

| 包 | 版本 | 用途 |
| --- | --- | --- |
| `@univerjs/presets` | 1.2.0 | `createUniver`、语言包合并、`defaultTheme` |
| `@univerjs/preset-sheets-core` | 1.2.0 | `UniverSheetsCorePreset`、工具栏、公式栏、数字格式、表格命令 |
| `@univerjs/core` | 1.2.0 | 核心服务与类型（`ICommandService`、`IUndoRedoService`、`IWorkbookData`） |
| `@univerjs/sheets` | 1.2.0 | 工作簿 / 工作表模型与 facade 类型 |
| `react` / `react-dom` | 18.3.1 | Univer UI 必需的 peer 依赖 |
| `rxjs` | 7.8.2 | Univer 必需的 peer 依赖 |

所有 `@univerjs/*` 包固定在同一版本（`1.2.0`）。

只注册 sheets-core preset；不包含文档、Excel 导入导出和协作模块。
