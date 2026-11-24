# Security policy

[README](README.md) · [繁體中文說明](README.zh-TW.md)

Tactile edits HTML documents that may come from anywhere, including AI output and files from strangers, in the same browser tab that holds the user's AI keys. Keeping the document's scripts away from the editor is the project's main security property. This page describes that model and how to report a problem with it.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private reporting: the repository's **Security** tab, then **Report a vulnerability** (or [open an advisory directly](https://github.com/Lin830326/tactile-html-editor/security/advisories/new)). This is the only channel; the project has no security mailbox. Only the maintainer can read what you send there.

Please include:

- the build you used (`dist/tactile.html` opened from disk, served over HTTP(S), or the claude.ai Artifact) and the commit or release;
- browser and version, and operating system;
- a minimal HTML document that shows the problem, and the steps from opening it to the result;
- what an attacker gains (for example: reads the stored API key, runs script with the editor's origin, gets script into an export without the user's consent).

What to expect:

- an acknowledgement within 7 days;
- an assessment and a planned fix date within 30 days;
- a fix, a release and a GitHub security advisory (with a CVE where it applies), crediting you unless you ask us not to. We ask you to keep the issue private for up to 90 days, or until a fix is released if that is sooner.

This is a small project maintained by volunteers. There is no bug bounty.

## Supported versions

Before 1.0, only the latest release receives security fixes. Once 1.0 ships, this table will list the supported release lines.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Older releases | No |

## The security model

### What is protected

The **editor's origin** holds the user's AI provider settings and keys, autosaved documents, the editor's own code (`window.HE`) and, in the Artifact build, `window.claude` (the viewer's Claude account). The document being edited is **untrusted**. Its scripts must not reach any of this unless the user turns on compat mode.

### How documents are shown

The editor keeps two copies of the document:

- **The model**, a `DOMParser` document. Scripts never run in it, and it is what gets exported.
- **The edit frame**, an iframe rendered from the model with `sandbox="allow-same-origin"` and no `allow-scripts`. The editor needs to reach its DOM to select and edit elements, so the page's scripts never run there. Links and forms do not fire in edit mode. Safari is the exception in how this is done, described next.
- **The edit frame in WebKit (Safari).** WebKit runs no event listener in a frame sandboxed without `allow-scripts`, the editor's own included, so the frame above cannot be clicked there. The editor tests for this when it starts (it sends an event to an empty frame of that kind), and only where the event is not heard it builds the edit frame another way:
  - The frame is made with `sandbox="allow-same-origin allow-scripts"`, and the first element of its head is `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; frame-src 'none'; object-src 'none'">`. The policy refuses script elements, event-handler attributes and `javascript:` URLs, also in markup written into the frame later, and it cannot be loosened from inside the document. Nested pages are refused because a frame inside would inherit `allow-scripts`.
  - As soon as the frame has loaded, the editor sets its `sandbox` back to `allow-same-origin`. The loaded document keeps its flags; any page the frame navigates itself to (a refresh `<meta>`) is made without scripts, and the editor then draws the document again. The canvas's copy of a refresh `<meta>` has its `http-equiv` left out; the model and the export keep it.
  - What this rests on: in this one browser the barrier between the document's script and the editor's origin is the content security policy, not the sandbox flag. A way around the policy in WebKit would be a way to run script with the editor's power. The policy comes from the editor and sits before anything of the document, and `tests/guard-frame.spec.js` checks each route named here in Chromium (made to take this path) and in Playwright's WebKit. Real Safari has not been tested.

When the user previews a document that has scripts, and the scripts are allowed, the canvas shows a separate **run frame**:

- It is an iframe with `sandbox="allow-scripts allow-forms allow-modals allow-popups"` (never `allow-same-origin`), which gives it an opaque origin, and `referrerpolicy="no-referrer"`.
- It holds a fixed wrapper document, and the page itself sits in a nested iframe with the same sandbox. The page's base URL is `about:srcdoc`, so it does not learn the editor's address (on disk, the user's folder names).
- These sandbox flags are a frozen constant (`HE.PAGE_SANDBOX`) that the canvas and file modules copy when they load, so they cannot be widened later at runtime.
- The editor accepts only three fixed messages from it, each checked against the sending window: a navigation report from the wrapper, and two drag notices from a small guard script in the page. It never accepts files or markup over this channel.
- The editor reads nothing from the run frame and writes nothing into it; it rebuilds it from the model.

"Preview in new tab" uses the same sandbox (plus `allow-downloads`) and always runs the page's scripts in isolation.

### Consent

- Built-in templates are trusted. Opened, pasted and dropped files, and autosaves of them, are untrusted: their scripts run in preview only after the user confirms.
- **New script stops a trusted document's scripts until the user allows them again.** One scanner (`HE.util.hasScript`, `scriptBits`, `stripScript`) decides what counts as script: `<script>`, `on*` attributes, `javascript:` and `vbscript:` URLs, `data:` documents that a frame loads or a link, form or SVG animation opens, `srcdoc`, `<object>` and `<embed>`, `<base href>`, a refresh `<meta>` to any of these, and the same inside `<template>`. Pasted content, AI output, source edits and new attributes all pass through it.
- Text typed into the canvas is cleaned before it reaches the model, so script cannot enter the document through the edit frame.
- Embedding or linking another site (`<iframe src="https://…">`, links, forms) is not treated as new script. Those pages inherit the sandbox of the frame they appear in.

### Compat mode

Some pages only render correctly when their scripts run while editing. **Compat mode** ("Also run while editing (compat mode)" in the Scripts menu) gives such a page the editor's own origin: it can read the stored AI keys, control the editor and change its settings, including where AI requests go. It is therefore:

- off by default, behind a confirmation that says this;
- limited to the current document, kept in memory only and never stored;
- turned off when another document opens, when the document is replaced, or when its scripts are stopped;
- not available in the Artifact build.

Turning compat mode off cannot undo what the page already did in the editor's realm, so the editor asks the user to reload the tab, and offers to restore AI settings that changed while it was on. **Anything a document does while compat mode is on is outside the isolation model.**

### Exports

An exported file keeps every script and is an ordinary web page with no isolation. When it is opened from disk in Chromium-based browsers, it shares local storage with an editor that was also opened from disk. It can read, and change, the editor's settings. It cannot read the AI keys or the autosaved documents, which are not stored there (see below). To avoid the sharing altogether, serve the editor over HTTP(S) instead of opening it from disk, or open exports in a different browser or profile.

### Where keys live

| How the editor was opened | Where the AI keys are |
|---|---|
| From disk (`file://`) | In the tab's memory only. They are gone after a reload. |
| Over HTTP(S), or as the claude.ai Artifact | In the origin's localStorage. The Artifact build needs no key. |

The reason for the first row: Chromium gives every page opened from disk one local storage, so a stored key could be read by any HTML file the user opens. A key that an earlier build stored is removed the first time the editor loads from disk, and the user is told.

Autosaved documents follow the same rule. Over HTTP(S) they are in the origin's localStorage, and a new tab continues the last document. From disk each tab keeps its own in sessionStorage: it comes back after a reload, a reopened tab or a restored session, a new tab starts with the sample, and a page in another tab cannot read or replace it. Two limits remain from disk. A page opened in the same tab as the editor shares that tab's sessionStorage. And a record that an earlier build left in localStorage is still restored once, into a new tab, without its permission to run scripts, because any local page could have written it; it is then moved into the tab.

Keys are never written into exported files. A script running with the editor's origin can still read a key: the editor itself, and a compat-mode page. On a shared computer served over HTTP(S), don't save a key.

### Where AI requests go

The Anthropic API address is fixed in the code. The address of an OpenAI-compatible service is a setting, and from disk another page can change the stored copy. So, when the editor runs from disk, it shows any service address that is not on this computer (`localhost`, `*.localhost`, `127.x.x.x`, `[::1]`) and asks the user to agree before the first request of a tab goes there, and before the connection test sends a key to an address that was already stored. This relies on the user reading the address.

### The AI assistant and page content

The assistant reads the page, and a page can contain text written to steer it (prompt injection). The editor tells the model that everything from the document is data, not instructions, and marks the user's request in each message with a random marker that page text cannot know in advance. This lowers the risk; it does not remove it. What limits the damage:

- the assistant can only call the editor's tools, which change the open document and nothing else;
- one AI edit is one undo step;
- script that the assistant adds is new script: it does not run until the user allows it.

`evals/injection.mjs` measures this with a real model: 10 reports, each with an instruction for an AI in a different place (visible text, a comment, a hidden element, an attribute, CSS, text that imitates the editor's own lines), and a check of the document afterwards. It needs an API key and costs money, so the tests do not run it; they only check, with a scripted model, that it tells the two outcomes apart. No result from a real model has been recorded yet. A result holds for the model and the 10 cases it was run with, and for nothing else.

### Sources of numbers

A report filled by `tactile-ingest` carries its source values in a block inside the file. Anyone can edit the numbers and that block together, so a check against the block alone proves little. The format therefore has three levels of verification (`docs/spec/provenance.md`, section 7), and each tool must say which level it reached. The editor only reaches level 1 and says "Not checked against the source file"; it never says a report is verified. `tactile-ingest verify` with the source file reaches level 3.

Reconciliation rules count as confirmed only when a person puts a name to them in the Sources pane. The assistant has no tool for that, any change to the rules removes the confirmation, and after each of the assistant's other tools the editor puts the rules and their confirmation back as they were, so a tool that rewrites HTML cannot write a confirmation into the block. A person who edits the file by hand still can: the name is a record, not a signature. A `rules.yaml` is loaded only by the user, in the interface; the assistant has no tool for it. The file is untrusted text: its reader takes a small part of YAML, refuses the rest (anchors, tags, block scalars, more than one document), and stops at 1 MB.

Text from a spreadsheet is untrusted: the editor shows labels and values with `textContent`, and `fill` escapes them before writing them into HTML or SVG.

## Data that leaves the browser

Tactile has no backend and sends no telemetry. The editor opens and works without any network access.

| When | Destination | Data |
|---|---|---|
| AI assistant runs | The configured provider: `api.anthropic.com`, the OpenAI-compatible base URL, or claude.ai in the Artifact build | API key, the user's request, earlier turns of the conversation, the file name, the page language and canvas width, a summary of the styling (how many style sheets, their size, the names of the effects in use), whether page scripts and the screenshot check are on, an outline of the page, the HTML of selected elements, an image of the selected elements when they hold a picture (the image itself when one image is selected), the corner and the buttons of the floating island (kind, text, link address), the numbers in the text the assistant just wrote that cite no source, when the document has source files or source data (the element's id and the start of its text), the reconciliation rules of the report (how many there are, their results, whether they are confirmed; when the assistant changes them, each rule's name, the two source values it compares and their difference), the names of the dropped source files and of their sheets, the cells of those files that the assistant asks for (address, value, shown text, formula, headings), and any HTML, CSS, computed styles or design-check results the assistant fetches with its tools. That HTML includes what the page does not show: comments, scripts, the data of embedded pictures, and the block of source values a `tactile-ingest` report carries. With 「修改後看畫面」 on, a screenshot of what was changed. |
| The edited page references remote resources | Those hosts | Requests made by the page's own images, styles, fonts and frames |

The AI settings dialog shows the same list. Documents, autosaves and settings stay in the browser (localStorage and sessionStorage; see "Where keys live"). `tactile-ingest` reads and writes local files only.

## In scope

- A document's script running with the editor's origin, or reaching `window.HE`, `window.claude`, stored keys or settings, **without compat mode**.
- Script entering the model or an export without being detected as new script (a gap in `hasScript` / `stripScript`), so it would run without the user's consent.
- Script running in the edit frame outside compat mode.
- Forged messages to the editor doing more than raising the drag shield or showing a status line.
- AI requests or keys going to a host other than the one configured or, from disk, other than one the user agreed to.
- An AI key written to storage when the editor runs from disk.
- `tactile-ingest verify` reporting a level as passed for a report whose numbers, charts or embedded values differ from the source file it was given.
- Text from a source file becoming markup or script in a filled report or in the editor.
- Cross-site scripting in the editor's own interface from document content, file names or AI output.

## Out of scope

- Anything a document does while compat mode is on.
- Exported files behaving as ordinary web pages, including sharing storage with a disk-opened editor (documented above).
- The AI assistant following instructions written in a page, as long as it stays within the editor's tools (documented above). Reports of ways to make it act outside them are in scope.
- A report whose embedded values were changed together with its numbers passing level 1. That is what levels 2 and 3 are for.
- A user agreeing to a service address they did not read.
- Attacks that need the user to allow scripts after the confirmation, to paste a key into a malicious page, or to install a malicious browser extension; or that need access to the user's computer or browser profile.
- How AI providers handle the data sent to them.
- Documents that are slow or crash the tab because of their size or content (please report these as ordinary bugs).
