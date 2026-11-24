# tactile-ingest

[繁體中文](README.zh-TW.md)

Reads source files into values that carry an address, so that every number in a report can be traced back to its source. The format is defined in [`docs/spec/provenance.md`](../docs/spec/provenance.md).

There are 4 commands: `ingest`, `fill`, `verify` and `mcp`. Source files can be Excel `.xlsx`, Word `.docx` and PDF. The instructions for AI agents are in [`SKILL.md`](SKILL.md).

## Install

Node 22.13 or later is required.

The `.npmrc` in this folder sets `omit=optional`: the optional drawing package of `pdfjs-dist` (`@napi-rs/canvas`) is not installed. Reading text does not need it.

The tool runs from a clone of the repository. Every command on this page is run in the `ingest/` folder:

```bash
cd ingest
npm ci --ignore-scripts
```

## Language of the messages

The command-line tool writes its messages in English by default. It writes them in Traditional Chinese when the system language is Chinese. `--lang en` or `--lang zh` chooses the language for one run, and the environment variable `TACTILE_LANG` (`en` or `zh`) chooses it for every run. What `fill` writes into a report does not depend on this choice.

## Usage

```bash
node bin/tactile-ingest.mjs ingest examples/traceable/2026Q3.xlsx --out out
```

It writes 2 files:

- `out/facts.json`: for programs. One record for each non-empty cell, with its ID, value, display text and formula.
- `out/facts.md`: for the AI. One table for each sheet. The columns are column letters and the rows are row numbers.

An ID is written as `file name/sheet/cell`, for example `2026Q3.xlsx/Income/D14`.

## Usage: fill a report

The AI writes a draft of the report from `facts.md`. It leaves the place of each number empty and writes only the ID:

```html
$<span data-fact="2026Q3.xlsx/Income/D14" data-fact-scale="1e-6" data-fact-digits="1"></span>M
```

```bash
node bin/tactile-ingest.mjs fill examples/traceable/draft.html --facts out/facts.json --rules examples/traceable/rules.yaml --out out/report.html
```

`fill` does 3 things:

1. It fills every `data-fact` element with the source value.
2. It computes the reconciliation rules in `rules.yaml`.
3. It embeds the values and rules that the report uses into the report. The report is still a single file.

`examples/traceable/` has 1 source file, 1 draft, 1 rules file, and the `report.html` that `fill` produced.

## Usage: charts

In the draft, write 1 empty element that says which cells to draw. `fill` computes the coordinates and draws an inline SVG:

```html
<div data-chart="bar"
     data-chart-facts="2026Q3.xlsx/Income/D10:D13"
     data-chart-labels="2026Q3.xlsx/Income/A10:A13"
     data-chart-scale="1e-6" data-chart-digits="1"></div>
```

`bar`, `line` and `pie` are supported. `verify` draws every chart again and compares. Example: `examples/traceable/charts-draft.html` and the `examples/traceable/charts.html` that `fill` produced.

## Usage: check a report

```bash
node bin/tactile-ingest.mjs verify out/report.html --source examples/traceable/2026Q3.xlsx --rules examples/traceable/rules.yaml
```

`verify` does not change any file. It checks at 3 levels and writes the result of each level:

| Level | What it checks | Needs |
|---|---|---|
| 1. Internally consistent | Every number in the report equals the text computed from the provenance block; the rules pass when computed again | The report |
| 2. Same source file | The `--source` file is the same file as at ingest time (same SHA-256) | The report and the source file |
| 3. Re-ingested | The source file is read again, and every value in the provenance block equals the source file | The report and the source file |

Without `--source`, only Level 1 is done, and the result says "not checked against the source file". Give one `--source` for each source file that the report cites.

- `--rules`: checks that the rules file is the same file as at fill time, and that the rules in the provenance block were not changed.
- `--strict`: "changed by hand", "no source" and "a level was skipped" also count as a failure.
- `--json`: writes the result as JSON.

Exit codes: 0 pass; 1 fail, or a file cannot be read; 2 the command is written wrongly.

## Usage: Word documents

`ingest` also reads `.docx`. You can give it together with an `.xlsx`:

```bash
node bin/tactile-ingest.mjs ingest test/fixtures/2026Q3.docx examples/traceable/2026Q3.xlsx --out out
```

A Word document has no sheets, so the 2nd part of the ID is written differently:

| ID | Refers to |
|---|---|
| `2026Q3.docx/t1/D6` | D6 of the 1st table |
| `2026Q3.docx/body/A2` | The 2nd paragraph outside the tables |
| `2026Q3.docx/body/B2` | The 1st number in the 2nd paragraph (`C2` is the 2nd number) |

Word stores text only. When a table cell or a whole paragraph (such as `t1/D6` or `body/A2`) holds exactly 1 number and nothing else, `ingest` reads it as a numeric value: thousands separators, decimals, a minus sign, a negative number in parentheses, `%`, a leading currency symbol. Other text stays text, for example `4.82億`; the numbers inside a paragraph of prose get addresses of their own (`body/B2`, `body/C2`). The full rules are in section 3.3 of the [specification](../docs/spec/provenance.md).

Because the numeric values are parsed, both `facts.md` and the output of `verify` write 1 sentence that says so. We recommend a `sum` rule for each total of a Word table: a total in Word is typed by a person, not a formula.

Not ingested: headers, footers, footnotes, text boxes, deleted tracked changes. A `.doc` file must first be saved as `.docx` in Word.

The Word and PDF examples are in Chinese, in `examples/zh-hant/`; their source files are `test/fixtures/2026Q3.docx` and `2026Q3.pdf`. Word example: `examples/zh-hant/word-draft.html`, `examples/zh-hant/word-rules.yaml`, and the `examples/zh-hant/word-report.html` that `fill` produced; the source file is `test/fixtures/2026Q3.docx`.

The text of a chart (the chart name for screen readers, the separators in tooltip text) follows the `<html lang>` of the report. **Write `<html lang="en">` in an English report**: a report that names no language gets Traditional Chinese chart text, as before. The rule: `zh-Hans`, `zh-CN` and `zh-SG` use Simplified Chinese and mainland terms (柱状图, 折线图, 饼图); other Chinese, or no language, uses Traditional Chinese; other languages use English. `fill` and `verify` use the same rule, so the charts of an English report can also be drawn again and compared. The full example of an English report is in `examples/traceable/`, and the Simplified Chinese one is in `examples/traceable-zh-hans/`.

## Usage: PDF

`ingest` also reads `.pdf`. Reading a PDF requires Node 22.13 or later.

```bash
node bin/tactile-ingest.mjs ingest test/fixtures/2026Q3.pdf --out out
```

A PDF does not store tables. It stores only text and coordinates. `ingest` works out the lines and columns from the coordinates:

| ID | Refers to |
|---|---|
| `2026Q3.pdf/p1/D10` | Page 1, the 10th line from the top, the 4th piece of text from the left |
| `2026Q3.pdf/p1n/A2` | The 1st number in the text of line 2 on page 1 (`B2` is the 2nd number) |

You must know 3 things before you use it:

1. The column is the position of the piece of text in its line, not the column of the table. When a row of a table has an empty cell, the numbers after it in that row move 1 column to the left. Look at the table in `facts.md` first, and confirm that the range you want to cite is aligned.
2. We recommend a `sum` rule for each total. When a range is not aligned, the rule fails in most cases.
3. A scanned PDF has no text, and `ingest` reports an error. This tool does not do text recognition.

The rules for parsing numeric values are the same as for Word. When a footnote mark follows a number, that piece is text. The full rules are in section 3.4 of the [specification](../docs/spec/provenance.md).

Because the positions and the values of a PDF are worked out, both `facts.md` and the output of `verify` write 1 sentence that says so. If the same data exists as `.xlsx` or `.docx`, we recommend that file instead of the PDF: its addresses are stored in the file, not worked out.

PDF example (in Chinese): `examples/zh-hant/pdf-draft.html`, `examples/zh-hant/pdf-rules.yaml`, and the `examples/zh-hant/pdf-report.html` that `fill` produced; the source file is `test/fixtures/2026Q3.pdf`.

## Usage: MCP server

When a source file is large, `facts.md` can exceed the context size of the AI. The `mcp` command starts 1 MCP server, and the AI queries only the part it needs each time.

```bash
node bin/tactile-ingest.mjs mcp --facts out/facts.json
```

The AI client starts this command and talks to it over stdio. It only reads `facts.json`. It does not change any file and does not connect to the network. After `facts.json` is ingested again, the next query reads the new content.

Example client configuration (`.mcp.json` of Claude Code; change the paths to your own):

```json
{
  "mcpServers": {
    "tactile-facts": {
      "command": "node",
      "args": ["/path/to/ingest/bin/tactile-ingest.mjs", "mcp", "--facts", "/path/to/out/facts.json"]
    }
  }
}
```

There are 5 tools. All of them only read data:

| Tool | What it returns |
|---|---|
| `list_sources` | The source files and sheets: file name, SHA-256, range, number of cells, number of formulas |
| `read_range` | Part of 1 sheet: the same table as in `facts.md`, plus the formulas in the range. At most 400 cells by default; when there are more, it writes the range to query next |
| `search_facts` | The cells whose text, value, heading or formula contains the keyword. A number can be written without thousands separators |
| `get_facts` | The full records (JSON) by ID, at most 100 at a time |
| `trace_formula` | The cells that the formula of 1 cell reads, expanded 2 levels by default |

When a query is wrong (for example a misspelled sheet name), the tool returns an error message and lists the names that can be used.

The server has no tools for `fill` and `verify`. These 2 steps still run as commands, because they read and write files.

## Cases that stop with an error

`ingest`:

- A formula cell has no stored result. Open the file in Excel and save it.
- The file is not `.xlsx`, `.docx` or `.pdf`, or its content is not the format that the extension says.
- The PDF has no text (scanned images), or it has a password.
- 2 source files have the same file name.

`fill` (it writes no report, and lists every error with its line number):

- The ID of a `data-fact` is not in `facts.json`.
- The value of a conversion attribute is not valid, or the value is not a number but has a conversion attribute.
- An element with `data-fact` contains child elements.
- The rules file is written wrongly, or a rule cites an ID that does not exist.

## Cases that only warn and still write the report

- The draft already had a number, and it differs from the source value. `fill` replaces it with the source value.
- The text has a number with no source. If you confirm that it needs no source, add `data-fact-none="reason"` to the element.
- A rule fails, or cannot be computed.

## Tests

```bash
npm test
```
