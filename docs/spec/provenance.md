# Provenance specification

Version: draft 1. Date: 2026-11-12. Corresponds to roadmap item 4.

This document defines the formats of 4 kinds of files, and how the programs divide the work. The implementation of items 5 to 8 must follow this document.

## 1. Purpose and scope

A reader clicks a number in the report and sees which cell of which file the number comes from. Programs recompute the reconciliation rules. The AI does not vouch for any number.

Scope of the first version:

- Source files can be Excel (`.xlsx`), Word (`.docx`, section 3.3) and PDF (section 3.4).
- A number in the report can only be the value of a source cell, plus a fixed display conversion (multiplier, number of decimal places).
- There are only 2 kinds of reconciliation rules: sum and equal.

The first version does not do:

- Derived calculations inside the report, for example growth rates. If the report needs a derived number, add a formula cell in Excel, then cite that cell.
- Scanned PDFs. `ingest` does not do text recognition (OCR).
- The full chart format. Section 8 only reserves the attribute names.

## 2. Data flow

```
source file (.xlsx)
   │ ingest (program)
   ▼
facts.json ──► facts.md ──► AI writes the report draft (number positions stay empty, only IDs)
   │                              │
   │   rules.yaml (a person approves)  │
   ▼              ▼               ▼
        fill (program): fills numbers, computes rules, embeds the provenance block
                      │
                      ▼
               report .html (single file)
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   editor: shows sources,   verify (program):
   recomputes rules,        compares again with
   marks hand changes       the source files
```

| File | Written by | Read by | Format |
|---|---|---|---|
| `facts.json` | `ingest` | `fill`, `verify` | JSON |
| `facts.md` | `ingest` | AI | Markdown |
| `rules.yaml` | A person (the AI can draft it) | `fill`, `verify`, people | YAML |
| Report `.html` | The AI writes the draft, `fill` completes it | Readers, the editor, `verify` | HTML |

`ingest`, `fill` and `verify` are the 3 commands of the ingest package. The names are provisional.

## 3. Facts and addresses

### 3.1 Facts

A "fact" is the content of 1 cell in a source file. Each fact has 1 ID. The ID is the address.

### 3.2 ID syntax

```
<file name>/<sheet>/<cell>
```

Example: `2026Q3.xlsx/損益表/D14` (`損益表` is the sheet name; it means "income statement").

- The file name includes the extension and does not include the folder path. File names must not repeat within one batch of source files.
- The sheet name is the original text from Excel and is case-sensitive. Excel does not allow `/` in a sheet name, so the separator is not ambiguous.
- The cell uses A1 notation, in upper case, without `$`. A merged cell uses its top-left cell.
- The ID is case-sensitive. It must not have leading or trailing whitespace.

PDF addresses are in section 3.4. The syntax the draft originally reserved, `p<page number>/b<block index>`, is cancelled: a PDF stores no blocks, so a program would have to guess the block index.

The address determines the ID. When the same file is ingested again, the IDs do not change. If the user inserts a row in Excel, the IDs after it point to other cells. `verify` detects this case with the hash of the source file (section 7).

### 3.3 Addresses in Word documents

A `.docx` has no sheets. `ingest` maps its content to the same 3-part IDs, so the syntax of ranges, rules and charts does not change.

| Content | ID | Example |
|---|---|---|
| A table cell | `<file name>/t<table index>/<cell>` | `2026Q3.docx/t1/D6` |
| A paragraph outside tables | `<file name>/body/A<paragraph index>` | `2026Q3.docx/body/A2` |
| The Nth number in a paragraph | `<file name>/body/<column N+1><paragraph index>` | `2026Q3.docx/body/B2` is the 1st number in paragraph 2 |

- Table indexes start at 1, in the order in which the tables start in the document. A nested table inside a cell has its own index.
- The column of a cell is the column the reader sees: a horizontally merged cell takes the columns it spans. The content of a merged cell is in its top-left cell.
- Paragraph indexes start at 1. They include empty paragraphs and do not include paragraphs inside tables.
- Not ingested: headers, footers, footnotes, text boxes, text inside shapes, deleted tracked changes. Inserted tracked changes count as content.

Word stores only text, not numeric values. `ingest` uses the rules below to decide whether a piece of text is a number. The rules are fixed. `ingest` does not guess.

| Text | `type` | `value` |
|---|---|---|
| `482,000,000`, `1234567`, `0.1065` | `number` | The numeric value without thousands separators |
| `-2.5`, `−2.5` (U+2212), `(398,765,432)` | `number` | A negative number. Parentheses mean negative |
| `6.9%` | `number` | `0.069`, the same way Excel stores a percentage |
| `$1,200`, `NT$1,200`, `US$31.5` | `number` | The numeric value without the currency symbol |
| `4.82億`, `12 km`, `2026-09-30`, `1,23` | `text` | The original text |

The whole text must contain exactly 1 number to be a `number`. Thousands separators must group every 3 digits. A cell with a unit after the number is `text`; the AI must not cite it as a number.

Word facts have no `format`, `formula` or `refs`. `text` is the original text in the document.

These facts have 1 limitation that Excel facts do not have: the numeric value is parsed. So `facts.md`, the output of `verify`, the MCP server and the editor's source card must all state this note. The program determines the kind of source from the extension in the ID, not from a field in the provenance block, so changing the block cannot remove the note.

### 3.4 Addresses in PDFs

A PDF stores only text, and the page coordinates at which each piece of text is drawn. A PDF stores no lines, columns or tables. `ingest` works out lines and columns from the coordinates, then maps them to the same 3-part IDs.

| Content | ID | Example |
|---|---|---|
| 1 text segment in 1 line | `<file name>/p<page number>/<column><line>` | `2026Q3.pdf/p1/D10` is the 4th segment of line 10 on page 1 |
| The Nth number in text | `<file name>/p<page number>n/<column N><line>` | `2026Q3.pdf/p1n/A2` is the 1st number in the text of line 2 on page 1 |

The rules for working them out are fixed:

1. Page numbers start at 1, in the order in the file, not the page number printed on the page.
2. Lines: pieces of text whose baselines are within 0.5 of a character height are on the same line. Line numbers start at 1, from top to bottom. Lines without text do not count.
3. Segments: the text on one line is ordered from left to right. A gap of more than 2 character heights splits it into 2 segments. The 1st segment is column A, the 2nd segment is column B.
4. Between 2 adjacent pieces of text in the same segment, 1 space may be added. The condition is any 1 of these: the gap is more than 0.2 of a character height; the font sizes differ; the baselines differ; they overlap. Reason: a footnote mark must not become the last digit of a number. Example: `482,000` plus the footnote mark `1` is the text `482,000 1`.
5. Numeric values are parsed from the text with the rules in section 3.3. A segment with exactly 1 number is a `number`; anything else is `text`.
6. The numbers inside a `text` segment are also placed under `p<page number>n`: the column is the position of the number among the numbers on that line. Its `labels.row` is the full text of that segment.
7. Kangxi radical characters (U+2F00 to U+2FD5) are replaced with the ordinary Han character they stand for, for example `⾏` becomes `行`. Reason: some PDFs record ordinary Han characters as radical characters, and without the replacement a search does not find them.

These facts have 3 limitations that the reader must know:

- The column is the position of the segment on that line, not the column of the table. If a row of a table has an empty cell, the numbers after it on that row shift 1 column to the left. So a vertical range (for example `D6:D9`) may include numbers from another column. Writing a `sum` rule for every total finds most errors of this kind.
- A paragraph that wraps becomes 2 lines. A PDF stores no paragraphs.
- When the gap between 2 columns is less than 2 character heights, the 2 columns merge into 1 text segment, which is not a number.

Not ingested: scanned images (pages without text), vertical text, rotated text, text inside pictures, form fields, annotations. If the whole file has no text, `ingest` reports an error. A password-protected PDF also reports an error.

`facts.md`, the output of `verify`, the MCP server and the editor's source card must all state the PDF note, in the same way as for Word (section 3.3).

PDF facts have no `format`, `formula`, `refs` or `merge`.

Reading uses `pdfjs-dist` 6.5.438. It needs Node 22.13 or later. There are 4 settings:

- Do not run code inside the PDF (`isEvalSupported: false`).
- Do not read XFA forms.
- Do not use system fonts.
- Do not install the optional drawing package (`omit=optional` in `ingest/.npmrc`).

## 4. Structure layer: `facts.json`

For programs to read. It is the single source of data. `facts.md` and the provenance block in the report are both generated from it.

```json
{
  "tactileFacts": 1,
  "tool": { "name": "tactile-ingest", "version": "0.1.0" },
  "createdAt": "2026-11-11T03:40:00Z",
  "sources": [
    {
      "file": "2026Q3.xlsx",
      "sha256": "9f2c…",
      "bytes": 48213,
      "sheets": [
        { "name": "損益表", "range": "A1:E20", "hidden": false }
      ]
    }
  ],
  "facts": [
    {
      "id": "2026Q3.xlsx/損益表/D14",
      "type": "number",
      "value": 482000000,
      "text": "482,000,000",
      "format": "#,##0",
      "formula": "SUM(D10:D13)",
      "refs": [
        "2026Q3.xlsx/損益表/D10",
        "2026Q3.xlsx/損益表/D11",
        "2026Q3.xlsx/損益表/D12",
        "2026Q3.xlsx/損益表/D13"
      ],
      "labels": { "row": "營業收入合計", "col": "2026 Q3" }
    }
  ]
}
```

### 4.1 Fields of `sources`

| Field | Required | Description |
|---|---|---|
| `file` | Yes | The file name, the same as the 1st part of the ID |
| `sha256` | Yes | The SHA-256 of the file content, in lower-case hexadecimal |
| `bytes` | Yes | The file size |
| `sheets[].name` | Yes | The sheet name |
| `sheets[].range` | Yes | The range that has content |
| `sheets[].hidden` | Yes | Whether the sheet is hidden. Hidden sheets are also ingested |

### 4.2 Fields of `facts`

| Field | Required | Description |
|---|---|---|
| `id` | Yes | The ID from section 3.2 |
| `type` | Yes | `number`, `text`, `date`, `bool`, `error` |
| `value` | Yes | See the table below |
| `text` | Yes | The display text. `ingest` computes it from the number format code of the cell. See section 4.4 |
| `format` | No | The Excel number format code |
| `formula` | No | The formula, without the leading `=`. Omitted when there is no formula. A shared formula must be expanded into this cell's own formula |
| `refs` | No | The IDs of the cells the formula cites directly. Ranges are expanded into individual IDs, and only cells with content are listed. Only cells inside the same source file are listed |
| `merge` | No | The merged range, for example `A1:C1` |
| `labels` | No | The guessed row heading and column heading. See section 4.3 |

`value` depends on `type`:

| `type` | `value` |
|---|---|
| `number` | A JSON number. Excel and JSON both use 64-bit floating point, so the value is the same |
| `text` | A string |
| `date` | An ISO 8601 string, for example `2026-09-30` or `2026-09-30T08:00:00`. No time zone. A value with only a time and no date is written as `08:30:00` |
| `bool` | `true` or `false` |
| `error` | The Excel error code string, for example `#DIV/0!` |

What is ingested: every non-empty cell in every sheet, including text. The `value` of a formula cell is the computed result that Excel stored in the file. `ingest` does not recompute formulas.

**Caution**: If a program generated the source file and the file was never opened in Excel, a formula may have no stored result. In this case `ingest` must report an error and stop. It must not write 0, and it must not skip the cell.

`ingest` decides how to read a file from its extension: `.xlsx`, `.docx` or `.pdf`. Other extensions report an error. The content of a `.pdf` must have `%PDF-` within the first 1,024 bytes. A `.docx` must be a zip container that contains `word/document.xml`.

`ingest` must first confirm that the content of the file is in `.xlsx` format (a zip container). Reason: the library used for reading also reads a text file as CSV.

### 4.3 `labels` are a guess

`ingest` finds headings with a fixed method: it looks left for the 1st text cell on the same row, and looks up for the 1st text cell in the same column. This method finds the wrong heading in complex tables.

`labels` are only a reference for people and the AI. No verification may use `labels`.

### 4.4 Differences between `text` and the Excel screen

`ingest` computes `text`; it does not read it from Excel. An Excel file stores only values and format codes, not display text.

Tested on 2026-11-11 with a file generated by Excel 16: for 47 of 48 cells, `text` is the same as the Excel screen. The 1 different cell is a date.

Cause: Excel's built-in date formats (for example number 14) display according to the computer's regional settings. Excel in Taiwan displays `2026/9/30`; the library computes `9/30/26`.

So the rules are:

- When `type` is `date`, `text` equals `value`, that is, the ISO 8601 form. `ingest` does not compute the date text from the format code.
- Deciding `date`: the value of the cell is a number, and the format code is a date or time format.
- For other `type` values, `text` is computed from the format code. Text inside a custom format (for example `0.00"億"`) appears in `text`.

Shared formulas: Excel stores a filled-down formula only once, and the other cells store only an index. `ingest` must expand every cell into its own formula.

## 5. Reading layer: `facts.md`

For the AI to read. It is generated from `facts.json` and can be deleted and regenerated at any time. Programs do not read it.

Each sheet is 1 section, and a table reproduces the grid. The column headings are the column letters, and the 1st column is the row number. The AI gets the address from the position in the grid.

```markdown
# 2026Q3.xlsx

## 損益表

ID syntax: `2026Q3.xlsx/損益表/<cell>`, for example `2026Q3.xlsx/損益表/D14`.

|    | A            | B       | C       | D           |
|----|--------------|---------|---------|-------------|
| 9  | 項目         | 2026 Q1 | 2026 Q2 | 2026 Q3     |
| 10 | 倉儲服務     | 120,000,000 | 131,000,000 | 142,000,000 |
| 14 | 營業收入合計 | 420,000,000 | 451,000,000 | 482,000,000 |

Formulas:

- `D14` = `SUM(D10:D13)`
```

Rules:

- The content of a cell is the `text` field, that is, the text Excel displays.
- A row that is entirely empty is omitted. Row numbers are the original row numbers and are not renumbered.
- Formulas are listed after the table, so the AI can see the sum relations. The AI can use them to draft `rules.yaml`.
- A `|` in the content is written as `\|`, and a line break is written as a space.

If a sheet is too large to fit in the AI's context, `ingest` can output only the range the user specifies. The complete data is still in `facts.json`.

## 6. Report HTML

### 6.1 The draft the AI writes

At the position of a number, the AI writes 1 empty element that carries only the ID:

```html
<p>第三季營收 <span data-fact="2026Q3.xlsx/損益表/D14" data-fact-scale="1e-8" data-fact-digits="2"></span> 億元。</p>
```

The AI must not write numbers in the draft. Units (`億元`, "hundred million yuan", in the example; `%`) are written outside the element, as ordinary text.

### 6.2 Attributes

Attributes the AI writes:

| Attribute | Required | Value | Description |
|---|---|---|---|
| `data-fact` | Yes | An ID | Which fact this element displays |
| `data-fact-scale` | No | A positive number, for example `1e-8`, `100`, `0.001` | Displayed value = source value × this number |
| `data-fact-digits` | No | An integer from 0 to 10 | The number of decimal places |
| `data-fact-group` | No | `on` (default), `off` | Whether to add the thousands separator `,` |
| `data-fact-sign` | No | `auto` (default), `always` | With `always`, a positive number gets a leading `+` |
| `data-fact-none` | No | One sentence giving the reason | Placed on an element that contains a number but cites no source, for example a page number |

An element with `data-fact` can contain only text. It must not contain child elements.

`fill` does not change the attributes the AI wrote. `fill` writes 3 things: the text content of the elements, the SVG of the charts (section 9), and the provenance block (section 6.5).

Attributes the editor writes:

| Attribute | Description |
|---|---|
| `data-fact-was` | The user changed this number by hand. The value is the original ID. See section 6.4 |

### 6.3 How the display text is computed

`fill`, `verify` and the editor must compute the same text. The computation is fixed as follows.

If the element has neither `data-fact-scale` nor `data-fact-digits`: display text = the `text` field of the fact. This applies to every `type`.

If it has either attribute, the `type` of the fact must be `number`; otherwise it is an error:

1. Convert the source value to a decimal string. Use the shortest form that restores the same floating-point number, for example `0.1` is not written as `0.1000000000000000055`.
2. Multiply by `data-fact-scale` with decimal arithmetic. Do not use floating-point arithmetic. Without this attribute, do not multiply.
3. Round to `data-fact-digits` decimal places. At exactly one half, round away from zero. Without this attribute, the default is 0 places.
4. If `data-fact-group` is not `off`, add 1 `,` for every 3 digits of the integer part.
5. A negative number gets a leading `-` (U+002D). When the rounded result equals 0, no sign is added. With `data-fact-sign="always"`, a positive number gets a leading `+`.

Examples:

| Source value | `scale` | `digits` | Display text |
|---|---|---|---|
| 482000000 | `1e-8` | 2 | `4.82` |
| 0.1065 | `100` | 1 | `10.7` |
| 1234567.5 | (none) | 0 | `1,234,568` |
| -0.004 | (none) | 2 | `0.00` |

When comparing, first remove the leading and trailing whitespace of the element text, then compare. All other characters must be exactly the same.

### 6.4 The 5 states of a number

| State | Condition | What the editor shows |
|---|---|---|
| Matches | Has `data-fact`; the ID is in the provenance block; the text equals the computed display text | A click shows the source |
| Does not match | Has `data-fact`; the text does not equal the computed display text | Marked in red, listed in the panel |
| Not found | Has `data-fact`; the ID is not in the provenance block | Marked in red, listed in the panel |
| Changed by hand | Has `data-fact-was` | Marked in yellow, shows the original source and the source value |
| No source | The text contains a number, but it is not inside any of the elements above and has no `data-fact-none` | Listed in the panel, no colour mark |

When the user changes the text of an element with `data-fact` in the editor, and the new text does not equal the computed display text:

1. The editor renames `data-fact` to `data-fact-was`. The value does not change.
2. The conversion attributes (`data-fact-scale` and the others) are kept.
3. These 2 changes and the text change belong to the same undo step.

The user can press "Restore the source value". The editor changes the attribute back to `data-fact` and fills in the computed display text again.

How "changed" is decided: at the end of each undo step, the editor compares the text before and after the step. Numbers the AI assistant changes are marked by the same rule. An element whose text already differs from the source value when the file is opened has the state "Does not match", and the editor does not change its attributes.

An element in the state "Does not match" also has "Restore the source value". The editor only fills in the computed display text again; the attributes do not change.

Deciding "No source": any Arabic digit (0 to 9) in the text inside `<body>` counts. Text inside `<script>`, `<style>`, `<template>` and `<svg>` does not count. For an element with `data-fact`, `data-fact-was` or `data-fact-none`, none of the text inside it counts. This check lists numbers such as years and reference numbers, and a person judges them. For those confirmed to need no provenance, add `data-fact-none`.

### 6.5 The provenance block

`fill` writes 1 block before `</body>`. The report therefore stays a single file, and it can show sources without `facts.json`.

```html
<script type="application/json" id="tactile-provenance">
{
  "tactileProvenance": 1,
  "tool": { "name": "tactile-ingest", "version": "0.1.0" },
  "filledAt": "2026-11-11T03:45:00Z",
  "sources": [
    { "file": "2026Q3.xlsx", "sha256": "9f2c…", "bytes": 48213 }
  ],
  "facts": {
    "2026Q3.xlsx/損益表/D14": {
      "type": "number", "value": 482000000, "text": "482,000,000",
      "formula": "SUM(D10:D13)",
      "labels": { "row": "營業收入合計", "col": "2026 Q3" }
    }
  },
  "rules": {
    "sha256": "41ab…",
    "approvedBy": "林雅婷",
    "approvedOn": "2026-11-10",
    "items": [
      {
        "id": "營收合計",
        "type": "sum",
        "total": "2026Q3.xlsx/損益表/D14",
        "parts": ["2026Q3.xlsx/損益表/D10", "2026Q3.xlsx/損益表/D11", "2026Q3.xlsx/損益表/D12", "2026Q3.xlsx/損益表/D13"],
        "tolerance": 0
      }
    ]
  }
}
</script>
```

Rules:

- `facts` holds only the facts the report uses: facts cited by `data-fact`, `data-fact-was`, a chart or a rule.
- Each entry of `facts` follows the fields of `facts.json`, but without `id`, `refs`, `merge` and `format`.
- `sources` lists only the source files the report uses.
- `rules.items` are the rules of `rules.yaml`, with ranges already expanded into individual IDs. `tolerance` is written as a decimal string, for example `"0.5"`. The block does not store rule results. The reading program recomputes them itself.
- `rules.sha256` is the SHA-256 of the content of the `rules.yaml` file. When there is no rules file, the whole `rules` is omitted.
- Every `<` in the JSON text must be written as `\u003c`. Reason: `</script>` would end the block early, and `<!--` would change how the HTML is parsed. `\u003c` is a legal JSON escape, so the reading program does not need to restore it separately.
- A report can have only 1 provenance block. When `fill` runs again, it replaces the existing block.

A `<script>` with `type="application/json"` does not run. The editor does not count it as a page script (`scanScript` in `src/js/core.js` only accepts JavaScript types).

### 6.6 Errors from `fill`

In the cases below, `fill` must stop and not write the report:

| Case | The message must include |
|---|---|
| The ID of a `data-fact` is not in `facts.json` | The ID, the position of the element in the HTML |
| There are conversion attributes, but the `type` of the fact is not `number` | The ID, the `type` |
| The value of an attribute does not follow the rules (section 6.2) | The attribute name, the value |
| An element with `data-fact` contains child elements | The ID |
| An ID that a rule cites is not in `facts.json` | The `id` of the rule, the ID |
| A chart cannot be drawn (any item of section 9.1 is not met) | The position of the element in the HTML, the cause |

In the cases below, `fill` writes the report and lists warnings:

- An element with `data-fact` already had text. `fill` replaces it.
- There are numbers in the state "No source" (section 6.4).
- A rule fails, or cannot be computed.
- The ID of a `data-fact-was` is not in `facts.json`.

## 7. The 3 levels of verification

The provenance block is inside the report file. Anyone can change both a number and the block with a text editor. So verification has 3 levels, and the interface must state which level has been reached.

| Level | What is checked | Who does it | What is needed |
|---|---|---|---|
| 1. Internally consistent | Every number equals the text computed from the value in the block; rules are recomputed from the values in the block | The editor, `verify` | Only the report |
| 2. Same source file | The user provides the source file; the SHA-256 of the file equals the `sha256` in the block | `verify`; the editor can do it | The report and the source file |
| 3. Re-ingested | The source file is read again, and every fact in the block is compared one by one | `verify` | The report and the source file |

When the editor reaches only Level 1, it must show "Not checked against the source file". It must not show "Verified".

Level 2 passing and Level 3 failing means the block was changed. Level 2 failing means the source file changed after it was ingested, or the user gave a different file.

### 7.1 How `verify` works

`verify` does not modify any file. It outputs a result for each of the 3 levels: pass, fail, or skipped.

| Finding | Category | Which level it affects |
|---|---|---|
| A number is "Does not match" or "Not found" | Problem | Level 1 fails |
| A rule is `fail` or `unknown` | Problem | Level 1 fails |
| A chart differs from the redrawn result (section 9.3) | Problem | Level 1 fails |
| The provenance block does not exist, is not JSON, or has an unknown version | Problem | Level 1 fails, Levels 2 and 3 are skipped |
| The SHA-256 of a source file differs from the one in the block | Problem | Level 2 fails |
| The `type`, `value`, `text`, `formula` or `labels` of a fact in the block differs from the source file | Problem | Level 3 fails |
| The block has a fact, but `sources` does not list its source file | Problem | Level 3 fails |
| A number is "Changed by hand" | Warning | None |
| A number is "No source" | Warning | None |
| The user provided no source files, or only some of them | Warning | Levels 2 and 3 are "skipped" |
| The user provided no rules file | Warning | None |

If the report cites facts from a Word document or a PDF, `verify` also outputs 1 "note" (sections 3.3 and 3.4). The note states that the numeric values were parsed from text. Level 3 only means that parsing again gives the same result. A note is neither a problem nor a warning; adding `--strict` does not change the result either.

When there is any problem, the result is fail. Warnings do not affect the result. The user can add `--strict` so that warnings also count as fail.

When Level 2 fails, `verify` still does Level 3. Reason: the user needs to know which cells changed value.

Level 3 also compares `labels`. Section 4.3 forbids verification from using `labels`; that means `labels` must not be used to judge whether a number is right. What is compared here is "whether the block equals the ingested result". Readers rely on `labels` to judge whether the wrong cell was cited, so a change to `labels` must be detectable.

When the user provides the rules file, `verify` does 2 more checks:

1. The SHA-256 of the rules file equals `rules.sha256` in the block.
2. The rules file, expanded against the source files, equals `rules.items` in the block. This check needs all the source files.

Reason: a person who changes only the block can raise `tolerance` so that a failing rule passes. Level 1 cannot see this.

The output must state which level was reached. When only Level 1 was reached, it must say "Not checked against the source file".

There is 1 more kind of error that none of the 3 levels can find. The AI cited a cell that exists, but cited the wrong one. For example, it put the cost cell after the word "revenue". There are 2 countermeasures:

- When the editor shows a source, it also shows `labels` and the source value, so the reader can compare them.
- Reconciliation rules check the relations between numbers.

## 8. Reconciliation rules: `rules.yaml`

For people to read, change and sign off. The AI can draft it from the formulas in `facts.md`, but a person must approve it.

```yaml
tactileRules: 1
report: 季營運報告
approvedBy: 林雅婷
approvedOn: 2026-11-10
rules:
  - id: 營收合計
    type: sum
    total: 2026Q3.xlsx/損益表/D14
    parts: 2026Q3.xlsx/損益表/D10:D13
    tolerance: 0

  - id: 兩表營收一致
    type: equal
    left: 2026Q3.xlsx/損益表/D14
    right: 2026Q3.xlsx/摘要/B3
    tolerance: 0.5
    note: 摘要表以元為單位，四捨五入到整數
```

| Field | Required | Description |
|---|---|---|
| `tactileRules` | Yes | The format version, currently `1` |
| `report` | No | Which kind of report these rules are for |
| `approvedBy`, `approvedOn` | No | Who approved the rules, and on which day. Without these 2 fields, the interface shows "The rules are not approved yet" |
| `rules[].id` | Yes | The name of the rule. It must not repeat within the file |
| `rules[].type` | Yes | `sum` or `equal` |
| `rules[].tolerance` | No | The allowed difference, default 0. It must be ≥ 0 |
| `rules[].note` | No | An explanation for people |

`sum`: the sum of `parts` must equal `total`. `parts` can be 1 range, or a list; each item of the list is an ID or a range. A range is written as an ID followed by `:` and the end cell, and it must stay within one sheet.

Empty cells, text, dates and booleans inside a range are not counted, the same as Excel's `SUM`. When a range contains an error value, the result is `unknown`. An ID written directly in the list must be a number; otherwise the result is `unknown`.

`equal`: `left` must equal `right`.

The condition to pass: `|difference| ≤ tolerance`. The sum and the difference use decimal arithmetic (the same method as section 6.3).

The 3 results of a rule:

| Result | Condition |
|---|---|
| `pass` | The difference is within the allowed range |
| `fail` | The difference exceeds the allowed range. The interface must show the values on both sides and the difference |
| `unknown` | A cited fact does not exist, or its `type` is not `number` |

`equal` compares 2 cells. The owner confirmed this definition on 2026-11-11.

Rules check source values, not the text displayed in the report. "The number in the report equals the source value" is a check that every `data-fact` element always gets (section 6.4), so it does not need to be written in `rules.yaml`.

## 9. Charts

The AI writes 1 empty element that says which cells to draw. `fill` computes every coordinate and writes inline SVG into the element. The AI does not write coordinates, and does not write the numbers on the chart.

```html
<figure>
  <figcaption>第三季各服務營收（百萬元）</figcaption>
  <div data-chart="bar"
       data-chart-facts="2026Q3.xlsx/損益表/D10:D13"
       data-chart-labels="2026Q3.xlsx/損益表/A10:A13"
       data-chart-scale="1e-6" data-chart-digits="1"></div>
</figure>
```

### 9.1 Attributes the AI writes

| Attribute | Required | Value | Description |
|---|---|---|---|
| `data-chart` | Yes | `bar`, `line`, `pie` | Bar chart, line chart, pie chart |
| `data-chart-facts` | Yes | A list of series | The facts to draw. They must be numbers |
| `data-chart-labels` | Yes | A list of IDs | The label of each value, for example an item name or a quarter. A cell of any type is allowed |
| `data-chart-series` | Required with 2 or more series | A list of IDs | The name of each series, drawn as the legend |
| `data-chart-scale` | No | A positive number | The same as `data-fact-scale` |
| `data-chart-digits` | No | An integer from 0 to 10 | The same as `data-fact-digits` |
| `data-chart-group` | No | `on` (default), `off` | The same as `data-fact-group` |

How lists are written:

- Each item of a list is an ID or a range, separated by `;`. A range is written the same way as in the rules file, for example `2026Q3.xlsx/損益表/D10:D13`.
- A range is expanded in row order, and from left to right within a row. Empty cells inside a range are skipped.
- `data-chart-facts` can have 2 or more series, separated by `|`. Every series must have the same number of values.
- There must be as many labels as each series has values.
- If a sheet name contains `;` or `|`, the cells of that sheet cannot be used in charts.

Limits:

- Each series has at most 24 values. There are at most 8 series. Reason: charts use 8 fixed colours and do not reuse them.
- A pie chart can have only 1 series, with at most 8 values. The values must not be negative, and must not all be 0.
- An element with `data-chart` must be empty. The title, unit and explanation are written outside the element.
- One element must not have both `data-chart` and `data-fact`.

### 9.2 The chart that `fill` draws

`fill` replaces the content of an element with `data-chart` with 1 `<svg>`. When `fill` runs again, it replaces the existing chart.

| Thing on the chart | How it is written |
|---|---|
| Data shapes: bars, points of a line, slices of a pie | Carries `data-chart-fact`, whose value is the ID. Contains a `<title>` that shows the label and the value on hover |
| Values written on the chart | A `<text>` with `data-fact` and the conversion attributes. It is an ordinary citation, and sections 6.3 and 6.4 apply |
| Labels and series names | A `<text>` with `data-fact`. If a label is too long and is truncated, it has no `data-fact` |
| Axis ticks | Ordinary text. `fill` computes the ticks from the data range; they are not source values |

Rules:

- The vertical axis starts at 0. With negative numbers, the vertical axis extends downward, and bars are drawn downward from the 0 position.
- With only 1 series and no more than 12 values, every value is written on the chart. Otherwise only the shapes are drawn, and the values are in `<title>`.
- 2 or more series have a legend.
- Text uses the text colour of the page (`currentColor`). Data shapes use 8 fixed colours, assigned in series order.
- The same input must produce the same SVG text. `verify` relies on this to check charts.
- Coordinates are rounded to 2 decimal places.
- Before source text is written into the SVG, `&`, `<`, `>` and `"` must all be escaped.

The facts, labels and series names that a chart cites are all written into `facts` of the provenance block.

### 9.3 Verification

`verify` redraws every chart from the values in the provenance block, then compares it with the chart in the report. The comparison ignores whitespace between elements and the order of attributes. With any difference, Level 1 fails, and the message is "The chart differs from the chart drawn from the source values".

This check covers the position and size of the shapes, the values on the chart, the labels, and the attributes of the chart.

The editor treats the `<svg>` as 1 object, so the user cannot change the text or shapes of a chart in the editor. The editor does 2 things:

- It checks text on the chart that has `data-fact` according to section 6.4, and lists it in the panel.
- When a data shape is clicked, it shows the source value and position of the shape.

The editor does not check the position and size of the shapes, and the interface must state this.

## 10. Versions

`tactileFacts`, `tactileProvenance` and `tactileRules` are all integers. A reading program that meets a version newer than its own must stop and explain. It must not guess.

All `data-fact*` and `data-chart*` attributes and `id="tactile-provenance"` are reserved names. So is the CSS variable `--tactile-chart-surface`: charts use it to draw the gaps between shapes, and the default is white.

## 11. Things not decided yet

1. Derived numbers. The first version requires adding a formula in Excel. If users often cannot change the source file, the second version must add expressions.
2. Whether the editor does Level 2 verification. Chromium can compute SHA-256 with `crypto.subtle` under `file://` (tested on 2026-11-11). Firefox and Safari are not tested yet.

## 12. Things already tested

On 2026-11-11, `dist/tactile.html` was opened in Chromium with `file://`, a page with provenance attributes and a provenance block was loaded, and then exported:

- `data-fact`, `data-fact-scale`, `data-fact-digits`, `data-fact-was` and `data-fact-none` are kept as they are.
- The text of the provenance block is identical character for character.
- The editor does not count the provenance block as a page script, and shows no script prompt.
- For the 4 examples in section 6.3, plus 4 more boundary values, the results from the reference implementation equal the expected results.

On 2026-11-11, 1 test file was generated with Excel 16. Its content has formulas, shared formulas, merged cells and a hidden sheet. Its formats include percentage, negative numbers in parentheses, custom formats, dates, error values and booleans. Read with `xlsx` 0.18.5:

- Values, formulas, format codes, merged ranges and whether a sheet is hidden can all be read.
- Shared formulas are already expanded into each cell's own formula.
- The display text is the same as the Excel screen for 47 of 48 cells (section 4.4).
- `exceljs` 4.4.0 can also read the first 2 items, but it does not compute display text, and it converts dates to times with a time zone.

On 2026-11-11, `fill` was run with the draft and the rules file in `ingest/examples/zh-hant/`. After the generated report was loaded into the editor and exported, the 9 `data-fact` elements and the provenance block were identical character for character.

On the same day the test was repeated with `xlsx` 0.20.3 (the patched version, placed in `ingest/vendor/`), and the results were the same. 2 more things were found, and `ingest` already blocks both:

- When a formula has no stored result, the library by default skips that cell without reporting an error.
- When a text file is renamed to `.xlsx`, the library reads it as CSV.

On 2026-11-11, the editor's provenance feature was tested in Chromium with Playwright (`tests/provenance.spec.js`, 8 tests):

- The editor and `fill` use the same vector file (`ingest/test/fixtures/display-vectors.json`). For 18 sets of display text and 5 sets of rules, both sides give the same results.
- Loading `ingest/examples/zh-hant/report.html`: all 9 numbers are "Matches", both rules are "Passed", and the panel shows "Not checked against the source file".
- Changing 1 number: `data-fact` becomes `data-fact-was`, and 1 undo returns to the original state.
- Changing a number, an ID and a value in the block inside the file: the editor marks them "Does not match", "Not found" and the rule "Failed" respectively.
- When a row heading from the source contains `<img onerror=…>`, the editor shows it as text and does not run it.
- The marks the editor draws on the page are not written into the exported file.

On 2026-11-12, `verify` was tested (`ingest/test/verify.test.mjs`, 12 tests):

- A report generated by `fill`, plus the source file and the rules file: all 3 levels pass.
- Changing only the text in the report: Level 1 fails.
- Changing the text in the report and the value in the block so that they agree: Levels 1 and 2 pass, Level 3 fails and points to the cell.
- Changing 1 cell of the source file: Level 2 fails, and Level 3 points to that cell.
- Raising `tolerance` only in the block: not detected without the rules file; detected with the rules file and the source file.
- The report cites 2 source files and only 1 is provided: Levels 2 and 3 are "skipped".

On 2026-11-12, charts were tested (`ingest/test/chart.test.mjs`, 10 tests; `tests/provenance.spec.js` adds 1):

- `ingest/examples/zh-hant/charts-draft.html` has 4 charts: bar, line, bar with 3 series, pie. After `fill` draws them, all 3 levels of `verify` pass.
- The height of a bar is proportional to the source value, with an error below 0.2%. The slices of the pie join end to end.
- Running `fill` 1 more time on an already filled report gives output that is identical character for character.
- Making 1 bar taller, changing 1 number on a chart, changing 1 attribute of a chart, deleting 1 chart: `verify` points to the chart in every case.
- After the report is loaded into the editor and exported, `verify` still passes.
- When a label from the source contains `</text><script>`, the SVG has no `<script>` element.
- The 4 charts were viewed on screen in Chromium.

On 2026-11-12, 1 `.docx` test file was generated with Word 16: 8 paragraphs, 2 tables, 1 horizontal merge, 1 vertical merge. `ingest` read 54 facts; `fill` and `verify` reached Level 3. Nested tables, tracked changes, content controls and text boxes were tested only with hand-written XML, not with files generated by Word.

On 2026-11-12, PDF was tested (`ingest/test/pdf.test.mjs`, 8 tests) with Node 24.22.3:

- Word saved the `.docx` test file as a PDF. `ingest` read 19 lines and 59 facts; all 4 columns of the table are aligned. `fill` and `verify` reached Level 3.
- Chromium printed a 2-page HTML to PDF, and a person looked at the result; it is not in the tests: the table is aligned; a superscript footnote mark turns that cell into text; the row with an empty cell shifted 1 column to the left; Chromium recorded 9 Han characters as radical characters, of which the Kangxi radicals were replaced back, and `⻑` (U+2ED1, outside the Kangxi radicals block) was not replaced.
- A page rotated 90 degrees, multiple pages, a page without text, text of different sizes: tested only with hand-written PDFs.
- Not tested: real financial report PDFs, multi-column layouts, password-protected PDFs, vertical text, files of 100 pages or more.

## 13. Assumptions not verified yet

- In real PDF reports, how many table rows shift left because of an empty cell. This decides whether vertical ranges are usable on PDFs.
- A segment gap of 2 character heights suits most PDF tables. Only 2 PDFs were looked at.
- In real Word reports, how many numbers carry a unit and become text. This decides how useful Word input is in practice.
- The AI can build IDs correctly from the grid table. The rate of wrong citations must be tested with 10 or more real reports.
- Users can accept the number of numbers that the "No source" check lists.
- The chart colours are clear enough on pages with a dark background. There is currently only 1 set of colours, and none was chosen separately for dark backgrounds.
- Different versions of Node compute the same coordinates. Pie charts use `Math.sin` and `Math.cos`, and the results are rounded to 2 decimal places. Tested on Node 20 and Node 24.
