# Third-party notices

Tactile is released under the [MIT License](LICENSE). It includes or uses the work listed here.

## In the editor (`dist/tactile.html`, `dist/artifact.html`)

### SheetJS, in the editor

- Where: `src/js/vendor/xlsx.mini.min.js`, SheetJS Community Edition 0.20.3, unchanged; both built files contain it.
- Why: the editor reads a dropped `.xlsx` with the library and the reader `tactile-ingest` uses, so that both give the same facts. It is the `xlsx.mini.min.js` of the package in `ingest/vendor/`; a test compares the two files byte for byte.
- License: Apache-2.0. Full text: [licenses/SHEETJS.txt](licenses/SHEETJS.txt). `build.mjs` writes the same text into the comment at the top of both built files.

### Lucide icons

- Where: the icon paths in `src/js/core.js` (`ICONS`), 90 icons.
- License: ISC; some Lucide icons are derived from Feather, which is MIT. Full text: [licenses/LUCIDE.txt](licenses/LUCIDE.txt). `build.mjs` writes the same text into the comment at the top of both built files.
- What is known: how the icons were made was not recorded. They follow Lucide's conventions (24 px grid, round strokes). They were compared, shape by shape, with the 2,356 icons of `lucide-static` 1.72.0 on 2026-11-12:
  - 4 are identical to a Lucide icon: chevron-down (Lucide: chevron-down), parent (Lucide: corner-up-left), wrap (Lucide: square-square), more (Lucide: more-horizontal).
  - 5 share one or two strokes with a Lucide icon: undo (Lucide: corner-up-left), redo (Lucide: corner-up-right), download (Lucide: download), cut (Lucide: scissors), underline (Lucide: underline).
  - The other 80 share no stroke with any Lucide icon of that version, apart from a plain circle in 2 of them.
  - 1 icon was added on 2026-11-14 and was taken from Lucide as it is: crop (Lucide: crop). It was not part of that comparison.
- Why the notice covers all of them: the comparison only finds identical strokes, and only against one version of Lucide. It cannot show that the rest were drawn without reference to Lucide. The notice costs nothing and the ISC License asks for nothing else.

The editor has no other third-party code, fonts or images. It loads nothing from the network.

## In the command-line tool (`ingest/`)

| Package | Version | License | How it is included |
|---|---|---|---|
| [SheetJS Community Edition](https://sheetjs.com) (`xlsx`) | 0.20.3 | Apache-2.0 | The publisher's package file, unchanged, in `ingest/vendor/xlsx-0.20.3.tgz`. Its license is inside the file (`package/LICENSE`). |
| [parse5](https://github.com/inikulin/parse5) | 8.0.1 | MIT | Installed by `npm ci`; not in this repository. |
| [entities](https://github.com/fb55/entities) | 8.1.0 | BSD-2-Clause | Installed by `npm ci` because `parse5` needs it; not in this repository. |
| [yaml](https://github.com/eemeli/yaml) | 2.9.1 | ISC | Installed by `npm ci`; not in this repository. |
| [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) | 6.5.438 | Apache-2.0 | Installed by `npm ci`; not in this repository. Its optional package `@napi-rs/canvas` is left out (`ingest/.npmrc`). |

The colours of the charts that `fill` draws are plain colour values chosen for this project.

## For development only

[Playwright](https://playwright.dev) (Apache-2.0) runs the tests. It is installed by `npm ci` and is not part of anything that is distributed.
