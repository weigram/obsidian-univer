# Univer 2.0.0

Spreadsheet-only Obsidian plugin powered by Univer **1.2.0**.

### Changes

- Upgrade to Univer 1.2.0 (preset architecture), keeping the `.usheet` JSON snapshot format
- Spreadsheet-only: documents, Excel import/export and collaboration are removed
- Compact single-row toolbar, formula bar, sheet tabs and zoom controls
- Remember the active sheet, scroll position and zoom per file
- Obsidian's status bar is merged into the single-row sheet footer, before the zoom controls
- Compact toolbar: 14px icons, 13px labels, 22px buttons and a 36px ribbon row
- Light/dark theme support, Chinese/English UI, locale switching without restart
- Invalid `.usheet` files show an error instead of being overwritten
- Fix saving of formatting/value edits (the view no longer shadows Obsidian's internal dirty flag)

### Compatibility

- Obsidian **1.6.0+**, desktop only
- Opens existing `.usheet` snapshots from Univer 0.2.x and 1.x

### Installation

Copy `main.js`, `manifest.json` and `styles.css` into
`<vault>/.obsidian/plugins/univer/`, then enable the plugin.
