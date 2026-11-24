# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0, a minor version may include breaking changes.

Add each change under `Unreleased` in the pull request that makes it. `docs/RELEASING.md` describes how the section becomes a release.

## [Unreleased]

## [0.1.0] - 2026-11-25

The first release.

### Added

- English and Simplified Chinese interfaces beside the Traditional Chinese one: the editor follows the browser's language, and a menu in the top bar switches.
- Twelve templates written in English for readers anywhere, each in a look of its own: an investor pitch deck, an annual report, an analytics dashboard, a product launch page, a traceable financial report (made by `tactile-ingest fill`), a conference page, a design case study, an email newsletter, a quarterly business review, a business update deck, meeting notes and an invoice.
- Eight templates written in Simplified Chinese for readers in mainland China: a quarterly business report, a year-end work report deck, a sales-event dashboard, a new-product page, a long article for phones, a quotation with VAT and the amount in words, a traceable business report and an invitation page. The Simplified Chinese interface lists them first and opens the report on a first visit.
- `tactile-ingest`: the words a chart carries (its name for screen readers, the joints of a tooltip) follow the report's `<html lang>`. A report in Simplified Chinese gets mainland terms (柱状图, 折线图, 饼图); one in Traditional Chinese, or one that names no language, is drawn as before. The New menu lists the templates of the interface language first.
- `tactile-ingest` writes its messages in English by default, and in Traditional Chinese when the system language is Chinese. `--lang en|zh` or the environment variable `TACTILE_LANG` chooses. What `fill` writes into a report does not depend on the language.
- The documents of `ingest/`, the format specification and the roadmap are in English; `ingest/README.zh-TW.md` keeps the Chinese guide. English examples with charts are in `ingest/examples/traceable/`; the Chinese examples moved to `ingest/examples/zh-hant/`.
- A demo page: `dist/tactile.html` is published at https://lin830326.github.io/tactile-html-editor/ whenever it changes on `main` (`.github/workflows/pages.yml`).
- `evals/injection.mjs`: an eval that runs 10 reports carrying instructions for an AI through the editor's assistant with a real model, and checks whether the document shows that the model obeyed the page. Run by hand with an API key; `--mock` checks the script without a network.
- Visual editing of existing HTML: click to select, double-click to edit text, drag to move, resize with handles, multiple selection.
- Layers panel with drag-to-reorder, and an insert panel of common blocks.
- Inspector for text, spacing, colour, border and page CSS, and editing an element's or the whole document's HTML source.
- Context menu: copy, cut, paste, duplicate, delete, wrap and unwrap, and table row and column operations.
- Move elements out of their parent or into the element above (`Alt+Shift+←/→`), shared by the context menu and the layers panel; placements the HTML parser would rewrite are refused.
- Device preview for desktop, tablet, phone and foldables (iPhone Duo, Galaxy Z Fold and Flip, Pixel Fold), folded or open, with the crease shown.
- Hover, entrance and scroll effects (14 kinds, including bar grow for bar charts), CSS only, with intensity, timing and colour, and a ▶ preview.
- Undo and redo for every step; one AI edit is one step.
- Open, paste and drop HTML files, export HTML, built-in templates, and per-tab autosave.
- Documents with several pages in one file: pages that a navigation bar switches between with CSS only (`:target` and `:has()`). The Pages panel adds, renames, copies, removes and reorders them and keeps the links and the CSS in step; a block in the insert panel starts one, and the AI assistant has two tools for them.
- A floating island: a group of pill buttons fixed to a corner of the window, each a link, a small panel (a `popover`) or back to top, with no script. A block in the insert panel adds it; the Design panel sets its corner, its colours and its buttons, and the editor keeps its CSS in step.
- A template in each of the three languages that shows both: a small magazine site with four pages in one file and a floating island with a help panel and a report link.
- The design check no longer reports text inside a `position: fixed` or `sticky` box as overlapping the text that scrolls under it.
- Reports with traceable numbers, made in the editor: drop an `.xlsx`, and the AI assistant reads it with three tools and cites cells; the editor writes each value in and keeps the source data of the document. The workbook is read by the reader and the library `tactile-ingest` uses, and a report made this way passes `tactile-ingest verify` against the same file.
- Charts and reconciliation rules in the editor, with the code `tactile-ingest` runs (`build.mjs` makes `src/js/ingest-core.js` from it): the editor draws bar, line and pie charts from the cells an element names, and the Sources panel adds, removes, confirms and downloads rules. The AI assistant can draft rules with a new tool but cannot confirm them, and a tool that rewrites HTML cannot change the rules or their confirmation. A report made this way passes `tactile-ingest verify`, with and without the downloaded `rules.yaml`.
- The editor reads a `rules.yaml` you wrote yourself (dropped on the window or loaded in the Sources panel), with a small reader for the YAML that rules files use. It refuses what it does not read and names the line, and whatever it accepts it reads as the `yaml` package does; `tactile-ingest` still uses that package.
- The Sources panel inserts a cited number without the assistant (search the cells, click one, set scale and decimals) and fills every citation and chart in again on request. The assistant is told which numbers in the text it just wrote cite no source.
- Errors from the code shared with `tactile-ingest` have codes, and the editor shows them in the interface language.
- Multi-page documents: print and PDF put every page on paper; a page's links go with it however it is removed; during an AI run a second link to the same page is taken out. PNG export draws the page on show.
- Floating island: a panel opens beside the buttons however many rows they take (CSS anchor positioning, where the browser has it), and an option leaves room at the end of the page.
- Crop dialog: fixed ratios, and the frame and its handles work from the keyboard.
- `tools/resync-templates.mjs` rewrites the CSS the editor maintains inside the built-in templates, and a test fails when a template is out of step.
- Simplified Chinese interface: quotation marks follow mainland usage.
- The canvas works in WebKit (Safari's engine), where a frame sandboxed without scripts hears no events: there the edit frame allows scripts under a content security policy that refuses every script of the document, and gives the permission back once it has loaded. Nested pages do not load while editing in that browser. See `SECURITY.md`.
- In WebKit the phone and tablet canvases are as wide as the device, and an exported PNG is as wide as the canvas's page: the editor's own scrollbar rule no longer gives those frames a scrollbar that takes 10px.
- The Traditional Chinese slides template (簡報：產品發表) no longer cuts its content off at phone width in WebKit: a slide's 16:9 is a `min-height` now, not `aspect-ratio`.
- A capture of the page (the AI's look at the canvas, the design check's picture) draws text sized in `vw` at its real size where the page's scrollbar takes room; it was about 1.5% smaller.
- Compressing embedded pictures no longer changes the layout in Firefox: the editor waits for the picture to load before it compares sizes.
- Crop an embedded image by hand: a dialog with a frame to drag or percentages to type, from the image's menu or the inspector. The pixels outside are removed from the document, and Undo brings them back.
- The AI assistant sees a picture you select: an image of the selection goes with the request (the image itself when one image is selected), and a `crop_image` tool keeps one part of an embedded image.
- AI assistant that edits elements, styles, effects and the whole document, using the Anthropic API, an OpenAI-compatible service, or the viewer's Claude account in the claude.ai Artifact build.
- Two builds from one source: `dist/tactile.html` (single file, opens from disk) and `dist/artifact.html` (claude.ai Artifact).
- Free move: drag an element anywhere on the page, stored as a CSS `translate`.
- Embedding a page's relative pictures and style sheets into the document, so that it stays one file.
- A design check that measures contrast, small text, clipped content and overlap, for the user and for the AI assistant; and a screenshot check after AI edits.
- Sources of numbers (`docs/spec/provenance.md`): a report can say which spreadsheet cell each number comes from.
  - `tactile-ingest ingest` reads an `.xlsx` into `facts.json` and `facts.md`, one fact per cell with its address.
  - `tactile-ingest fill` writes each cited number into a report, runs the reconciliation rules of a `rules.yaml` (`sum`, `equal`) and embeds what the report used.
  - `tactile-ingest verify` checks a report at three levels: against its own embedded data, against the source file's SHA-256, and against the source read again.
  - Charts: `fill` draws bar, line and pie charts as inline SVG from cited cells, and `verify` draws them again and compares.
  - In the editor, clicking a number shows its cell, source value and formula; a Sources tab lists the rules and every number's state; a number changed by hand is marked "Changed by hand" in the same undo step.
  - `tactile-ingest mcp` serves a `facts.json` over the Model Context Protocol (stdio), with five read-only tools: `list_sources`, `read_range`, `search_facts`, `get_facts`, `trace_formula`. It adds no dependency.
  - Word documents (`.docx`) as sources: each table is `t1`, `t2`…, paragraphs outside tables are `body`, and the numbers in a paragraph have addresses of their own. Text becomes a number only when it is a number and nothing else; `facts.md`, `verify`, the MCP server and the editor say that such a value was parsed from text. It adds no dependency.
  - PDFs as sources, read with pdf.js (`pdfjs-dist` 6.5.438): a page is `p1`, `p2`…, a row is a line of text counted from the top, and a column is a piece of that line, parted from the next by a gap wider than 2 em. The numbers inside a line of text are in `p1n`. A PDF stores no tables, so these positions are worked out from coordinates; `facts.md`, `verify`, the MCP server and the editor say so. A PDF with no text (a scan) is refused. The package now needs Node 22.13 or later.
  - `ingest/SKILL.md` tells an AI agent how to write such a report by citing cell IDs only.
- A Pages tab that lists the slides of a deck: add, copy, remove and reorder them, by button, by dragging or with `Alt+↑/↓`. A deck is recognised by its layout, with the rule the PDF export already used.
- "Compress embedded pictures" in the export menu: re-encodes the pictures embedded as data URLs, as one undo step, without changing the layout.
- "Export a cleaned copy" in the export menu: downloads a copy without comments, author and generator marks, scripts or provenance data, as chosen. Comments that state a licence stay, and the document in the editor does not change.
- `THIRD_PARTY_NOTICES.md`, and the Lucide license notice in the built files, for the icons.

### Security

- Page scripts never run in the edit frame. In preview they run in an isolated, sandboxed frame with an opaque origin, so they cannot reach the editor, its settings or the stored AI keys.
- Opened, pasted and dropped documents run their scripts only after the user allows it; new script added by paste, the AI or a source edit stops the scripts until it is allowed again.
- Compat mode, which runs page scripts with the editor's privileges, asks first, applies to the current document only and is never stored.
- Opened from disk, the editor keeps AI keys in memory only. Chromium gives every page opened from disk one local storage, so a stored key could be read by any HTML file. A key stored by an earlier build is removed on the first load.
- Opened from disk, the editor keeps each tab's autosaved document in that tab's sessionStorage, where pages in other tabs cannot read or replace it. It comes back after a reload, a reopened tab or a restored session; a new tab starts with the sample. A record an earlier version left in the shared storage is restored once, without its permission to run scripts.
- Opened from disk, the editor shows an OpenAI-compatible service address that is not on this computer and asks before the first request of a tab goes to it, because another page opened from disk could have changed it.
- The AI settings list what is sent to the service. The assistant is told that page content is data, not instructions, and each message marks the user's request with a random marker that page text cannot know.

[Unreleased]: https://github.com/Lin830326/tactile-html-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Lin830326/tactile-html-editor/releases/tag/v0.1.0
