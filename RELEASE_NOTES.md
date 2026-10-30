# Univer Sheet 2.3.2

Spreadsheet and relational-table support for Obsidian, powered by Univer **1.2.0**.

> This release renames the plugin to **Univer Sheet** with the new plugin id `univer-sheet`.

### Relational tables (Univer Bases)

- New `.ubase` / `.bases` view, plus "New relational table" command and folder
  right-click entries.
- Records can be created and edited in the side panel; Kanban and calendar
  views are available.
- Single-select fields can create a missing option straight from the record
  editor (press Enter).
- Text fields grow to multiple lines instead of clipping.
- A `date` field using the "record creation time" default is backfilled from
  each record's creation timestamp.
- A manually created `完成时间` date field is filled when a Kanban card enters
  `已完成`, and cleared when it leaves.

### Fixed

- Cmd+Enter / Ctrl+Enter inserts a line break in Base record text fields;
  plain Enter still saves.
- Base checkboxes and primary buttons are aligned and outlined correctly.

### UI polish

- Compact Bases labels, icons and toolbar so they match the spreadsheet view.
- Flat toolbar/menu buttons with a proper pressed state; primary buttons keep
  their accent fill without an outline.
- Fixed Base dialogs, menus, color picker and view tabs.
- Base popups stay inside the window.
- No outer scroll bar in the Base view, and Obsidian's status bar is hidden in
  sheet and Base views.

### Dependencies

- Univer 1.2.0
- `@univerjs-pro/bases`, `bases-ui`, `license`, `engine-formula` 1.2.0

> Univer Bases is part of Univer Pro. Keep this repository private and do not
> redistribute the Pro packages without a commercial license.

### Licensing

- Plugin code: Apache-2.0 (`LICENSE`)
- Attribution: `NOTICE`
- Bundled components and the Univer Pro terms: `THIRD-PARTY-NOTICES.md`
