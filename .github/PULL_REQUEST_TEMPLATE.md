## What and why

<!-- What does this change, and why is it needed? Link the issue: "Closes #123". -->

## How I tested it

<!-- Browsers and versions, edit mode / preview / export, templates or sample documents used. -->

## Checklist

- [ ] `node build.mjs` run, and the updated `dist/` files committed
- [ ] `npm test` passes, and `npm test` in `ingest/` if that package changed
- [ ] A test covers the change
- [ ] Undo and redo restore the document exactly
- [ ] Exported HTML has no editor attributes and still works
- [ ] `README.md` and `README.zh-TW.md` updated for user-visible changes
- [ ] `CONTRACT.md` updated for module APIs or rules; `docs/spec/provenance.md` for the report format
- [ ] `CHANGELOG.md` (`Unreleased`) updated
- [ ] Screenshots attached for interface changes

### Script boundary

- [ ] This change does **not** touch the script boundary (`hasScript` / `scriptBits` / `stripScript`, `HE.live.clean`, `HE.PAGE_SANDBOX`, the run frame, the message listener, compat mode, paste, the AI's write tools)
- [ ] It does, and I describe below which inputs I tested and how the isolation in SECURITY.md still holds
