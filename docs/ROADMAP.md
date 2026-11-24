# Roadmap

What Tactile is for, what has been decided, what is not done yet and what is not known. What each release contains is in [CHANGELOG.md](../CHANGELOG.md).

## Goal

People in companies can trust the HTML reports and slides that an AI produces, and can change them.

Two problems stand in the way:

1. **It cannot be changed.** The person who receives HTML from an AI agent cannot change it, and has to go back to the agent to have it made again.
2. **It cannot be trusted.** A number in a report may be wrong, and the reader cannot see where it comes from.

Tactile answers each with one part:

1. **The editor.** Change the HTML by hand, save it back, export it.
2. **Sources and reconciliation.** Every number can be clicked back to its source. A program computes the rules again; the AI does not vouch for them.

## Who it is for

- People who produce HTML with AI agents such as Claude Code, Codex CLI or Cursor.
- The people who receive that HTML. They do not write code, and most of the value is with them.

## Decisions

| Item | Decision |
|---|---|
| License | MIT |
| Packages | Two: the editor (one offline file) and `ingest/` (needs Node) |
| Editing PDF files | Not planned. PDF is an export format only |
| Verification | Done by a program. The AI must not vouch for correctness |
| Precision of a source | A cell, or a position on a page, for example `2026Q3.xlsx/Income/D14` |
| Citing numbers | The AI cites a number by the address of its cell. The program writes the value |
| Intermediate format | Two layers: JSON for programs (values, addresses, formulas) and Markdown for the AI, where every value carries its address |
| YAML | Only for files that people read, change and approve: the reconciliation rules |
| Charts | Inline SVG, no chart library. The program computes the shapes from the cells; the AI chooses the type |
| Reading Excel | SheetJS 0.20.3, from the publisher's package file in `ingest/vendor/`. The 0.18.5 on npm has known vulnerabilities that are not fixed |
| Source files after a reload | Not kept. Storing them in the browser would let other pages opened from disk read them |

## Not done yet

### Sources of numbers

- The editor reads `.xlsx` only. Word and PDF sources need the command-line tool.
- `.xls` and `.csv` are not read in the editor.
- PDF: columns are not aligned by position, so a table row with an empty cell shifts to the left. Scanned PDFs are not read. Real financial-report PDFs have not been tested.
- Charts: no stacked charts, and no colours for dark backgrounds.
- The MCP server has read-only tools. It has no tools for `fill` and `verify`, and no HTTP transport.
- Rules that `tactile-ingest fill` wrote and the editor did not change: the file the editor downloads and the hash recorded in the report differ.

### The editor

- Slides panel: no thumbnails, and one slide is selected at a time.
- Compressing pictures skips CSS background pictures. Unused CSS rules are not removed.
- The AI assistant sees a picture only when it is selected.
- Several pages in one file: a document recognises one set of pages. A link to an element inside a page that is not on show does not reveal it.
- Floating island: the room left at the end of the page fits one row of buttons. In browsers without `popover`, a panel does not open.
- Other settings than the AI key are still in the storage that pages opened from disk share. A page opened in the same tab as the editor can read that tab's autosave. See [SECURITY.md](../SECURITY.md).

### The project

- `tactile-ingest` is used from a clone. Publishing it to npm is not decided.
- The built file does not record its version.
- Build provenance for the release file, and signed tags. See [RELEASING.md](RELEASING.md).

## Not verified

- **Real Safari.** The suite was run in Playwright's WebKit, not in Safari.
- **Real models.** The assistant citing spreadsheet cells was run with a real model once, with one request and one workbook. Pie and line charts, `equal` rules and cropping pictures have not been run with a real model. `evals/injection.mjs` has not been run with a real model either, so how often a model obeys instructions it meets in a page is not known.
- **The English and Simplified Chinese texts** have not been read by native readers. The Simplified Chinese templates have not been reviewed by someone who knows the advertising rules of mainland China.
- **The email newsletter template** has not been tested in Outlook or Gmail.
- **Names in the templates.** The company names are made up, and have not been checked against real ones.
- **Whether company users will approve reconciliation rules** once for each kind of report. There is no evidence from real users yet.
- **Other converters** (for example `markitdown`, `docling`): whether they keep cell addresses and page numbers has not been checked.

## Notes for testing

- Playwright's `page.mouse` cannot drag on the canvas: while a button is held it runs a script in every frame, and the edit frame allows none. `tests/move-mode.spec.js` sends mouse events inside the page instead.
- Tests cannot control the system's folder picker and cannot simulate dropping a real folder.
- CI runs Chromium. The results in Firefox and WebKit, and why some tests fail there, are in the [README](../README.md#browsers).
