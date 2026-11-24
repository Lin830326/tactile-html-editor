# Contributing to Tactile

Thank you for helping. Issues and pull requests are welcome in English or Chinese (歡迎用中文).

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems privately as described in [SECURITY.md](SECURITY.md), never in a public issue.

## Ways to help

- **Report a bug.** Use the bug report form. Attach the smallest HTML document that shows the problem, and remove anything confidential from it first. Never paste an API key.
- **Suggest a feature.** Describe the editing task you are trying to do, not only the button you want.
- **Improve the docs**, including the English and Chinese READMEs.
- **Send a pull request.** For anything larger than a small fix, open an issue first so we can agree on the approach before you spend time on it.

## Development setup

You need [Node.js](https://nodejs.org) 22.13 or later (CI uses 24) and a current browser. The repository holds two packages:

| Folder | What it is | Dependencies |
|---|---|---|
| the root | The editor: one HTML file that works offline. | SheetJS (`src/js/vendor/xlsx.mini.min.js`, built in, to read .xlsx). Playwright, for the tests only. |
| `ingest/` | `tactile-ingest`, a command-line tool that reads Excel (.xlsx), Word (.docx) and PDF files and fills a report so that every number can be traced to its cell or page. It also holds an MCP server that answers questions about the numbers it read. | `parse5`, `yaml`, `pdfjs-dist`, and SheetJS from `ingest/vendor/`. |

```bash
git clone https://github.com/Lin830326/tactile-html-editor.git
cd tactile-html-editor
npm ci
node build.mjs
```

Open `dist/tactile.html` in the browser. `build.mjs` inlines `src/` into `dist/tactile.html` and `dist/artifact.html`; run it again after each change to `src/`, then reload the page.

For the command-line tool:

```bash
cd ingest
npm ci --ignore-scripts
node bin/tactile-ingest.mjs --help
```

## How the code is organised

Read [CONTRACT.md](CONTRACT.md) before changing code. The rules that matter most:

- **The editor has no frameworks, one built-in library (SheetJS, to read .xlsx the way `ingest/` does) and no build step beyond `build.mjs`.** Do not add another library without an issue first. (`ingest/` is a separate Node package and may use its listed dependencies.) Every module is a plain ES2020 classic script wrapped in an IIFE that adds itself to `window.HE`. At load time a module only defines `HE.<name>`; DOM work happens in its `init()`.
- **Two DOMs.** `HE.doc.model` is the clean source of truth that gets exported; `HE.live.doc` is the canvas. Every user-visible change goes through `HE.ops.*`, which updates both and records an undo step. Do not edit either DOM directly.
- **One format, two readers.** The editor and `ingest/` both implement [docs/spec/provenance.md](docs/spec/provenance.md): the shown text of a number and the rules are computed in both, in decimal. `ingest/test/fixtures/display-vectors.json` is read by both test suites; a change to either side needs a vector there.
- **Script trust is a security boundary.** Read the "Page scripts and trust" section of CONTRACT.md and [SECURITY.md](SECURITY.md) before touching `HE.util.hasScript`, `scriptBits` or `stripScript`, `HE.live.clean`, `HE.PAGE_SANDBOX`, the canvas run frame, the message listener, compat mode, paste handling or the AI's write tools. Pull requests in these areas get a closer review and need a test case for each new kind of input they handle.
- **Style.** Match `core.js`: two-space indent, single quotes, semicolons, short comments only where the reason is not obvious. Use the tokens and classes in `base.css`; no literal colours, no emoji in the UI, icons only through `HE.ui.icon`. Every form control gets a stable `id`. The layout must work at 360px wide and respect `prefers-reduced-motion`.
- **Third-party work.** Say in the pull request where any icon, image, font or code that you did not write comes from, and under which license. New icons go into `ICONS` in `core.js`; if one comes from Lucide, that is already covered by [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and anything else needs an entry there.
- **Never use `alert`, `confirm`, `prompt` or `window.open`.** They are blocked in the Artifact build; use `HE.ui.confirm`, `HE.ui.prompt` and `HE.ui.modal`.
- **Interface text is written in Traditional Chinese (zh-TW) and goes through `HE.t()`.** Add the English to `src/js/lang-en.js` and the Simplified Chinese to `src/js/lang-zh-cn.js` in the same change; a reviewer can help with the wording of any of them. The rules are in the "Interface language" section of CONTRACT.md. `node tools/i18n-check.mjs` fails when a text lacks either.

## Testing

Run what CI runs before you open a pull request:

```bash
node build.mjs
git diff --exit-code -- dist      # prints nothing when dist/ matches src/
npx playwright install chromium   # once
npm test                          # the editor, in Chromium
cd ingest && npm test             # the command-line tool
npm run eval:injection -- --mock obey   # the prompt-injection eval with a scripted model: no network, no cost
node tools/set-repo.mjs --check   # every link to the repository matches package.json
node tools/i18n-check.mjs         # every interface text of the finished files has its English
```

Add a test with every change in behaviour. The editor's tests are in `tests/` (Playwright); the tool's are in `ingest/test/` (`node --test`).

Two things about the editor's tests:

- Do not drag on the canvas with Playwright's `page.mouse`. The edit frame's sandbox does not allow scripts, and the move never returns. `tests/move-mode.spec.js` shows how to send the mouse events from inside the page.
- CI runs Chromium only. If your change touches layout, selection or the clipboard, please also try it by hand in Firefox or Safari and say so in the pull request.

Tests must not call a real AI service. Mock the endpoint, as `tests/design-check.spec.js` does.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep each pull request to one change. Don't mix refactoring with behaviour changes.
3. Run `node build.mjs` and commit the updated `dist/` files with your change. CI fails if `dist/` does not match the sources.
4. If the change shows in the pictures of the READMEs (`docs/img/`), take them again with `node tools/screenshots.mjs` (English, for `README.md`) and `node tools/screenshots.mjs --lang zh-TW` (for `README.zh-TW.md`), and look at them before you commit.
5. Update the docs that your change affects: `README.md` **and** `README.zh-TW.md` for user-visible behaviour (the Chinese one holds the full description of each feature), `CONTRACT.md` for module APIs and rules, `docs/spec/provenance.md` and `ingest/SKILL.md` for the report format, and the `Unreleased` section of `CHANGELOG.md`.
6. Fill in the pull request template.

Commit messages may be in English or Chinese. Write a short summary line, then explain why the change is needed if it is not obvious.

### License of contributions

The project is released under the [MIT License](LICENSE). By sending a pull request you agree that your contribution is released under the same license, and you confirm that you wrote it or otherwise have the right to submit it.

## Questions

Open an issue, or start a discussion if Discussions are enabled.
