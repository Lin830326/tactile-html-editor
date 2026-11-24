---
name: tactile-report
description: Writes an HTML report from Excel, Word or PDF source files, in which every number can be traced back to a cell. Use it when the user gives an .xlsx, .docx or .pdf file and asks for a report, a summary or slides; or asks you to check whether the numbers of a report are the same as the source file.
---

# Write a report whose numbers can be traced

These instructions are for AI agents. The full definition of the format is in [`docs/spec/provenance.md`](../docs/spec/provenance.md).

## The core rule

You must not write the numbers of the source file into the report. You write only the ID of each number, and the program `fill` fills in the number.

Reason: a model can copy a number wrongly, and the reader cannot see it. A number that the program fills in always equals the source value.

## What you need

- Node 22.13 or later.
- This folder. Before the first use, run `npm ci` in this folder.
- The source file. `.xlsx`, `.docx` and `.pdf` are supported. If the same data exists in 2 kinds of file, use the `.xlsx` or `.docx`, not the `.pdf`.

Run all the commands below in this folder. `<work-folder>` is where you put the output files.

## Steps

1. Ingest the source file.

   ```bash
   node bin/tactile-ingest.mjs ingest <source.xlsx> --out <work-folder>
   ```

   Expected result: `facts.json` and `facts.md` appear in `<work-folder>`.

2. Read `facts.md`. You do not need to read `facts.json`.

   `facts.md` has 1 table for each sheet. The columns are column letters and the rows are row numbers. The formulas are listed below the table.

   If `facts.md` is too large, you do not need to read all of it. If you have the MCP tools of `tactile-facts`, query with the tools instead: first `list_sources`, then read the range you need with `read_range`, or find cells with `search_facts`. The table that a tool returns is the same as in `facts.md`. The server configuration is in "Usage: MCP server" of [`README.md`](README.md).

   The table holds the text that the source file displays, not the raw value. For example `(398,765,432)` is a negative number, and the raw value of `6.9%` is `0.069`. If you want to add a conversion attribute and cannot tell the raw value, find the `type` and `value` of this ID in `facts.json`, or look it up with the `get_facts` tool.

3. Write the draft of the report and save it as `<work-folder>/draft.html`. See "How to write the draft".

4. Draft `<work-folder>/rules.yaml`. See "How to write the rules file".

5. Run `fill`.

   ```bash
   node bin/tactile-ingest.mjs fill <work-folder>/draft.html --facts <work-folder>/facts.json --rules <work-folder>/rules.yaml --out <work-folder>/report.html
   ```

   Expected result: the exit code is 0, and `report.html` appears.

6. If the exit code is 1, change the draft or the rules file as each error line says, then run step 5 again. `fill` writes no report when there are errors.

7. Read every warning that `fill` lists, and change the draft as "What to do about warnings" says. Then run step 5 again.

8. Run `verify`.

   ```bash
   node bin/tactile-ingest.mjs verify <work-folder>/report.html --source <source.xlsx> --rules <work-folder>/rules.yaml
   ```

   Expected result: all 3 levels are "pass", and the exit code is 0.

9. Report to the user. See "What to report".

## How to write the draft

The draft is a complete HTML document. The styles are written in `<style>`. Example: [`examples/traceable/draft.html`](examples/traceable/draft.html).

Write each number that comes from the source file as 1 empty element with `data-fact`:

```html
Total revenue $<span data-fact="2026Q3.xlsx/Income/D14" data-fact-scale="1e-6" data-fact-digits="1"></span>M
```

An ID is written as `file name/sheet/cell`. `facts.md` writes the first part of the ID at the start of each sheet.

| Attribute | Value | Effect |
|---|---|---|
| `data-fact` | ID | Cites 1 cell |
| `data-fact-scale` | A positive number, for example `1e-6`, `100` | The source value is multiplied by this number |
| `data-fact-digits` | An integer from 0 to 10 | The number of decimal places. Rounded half up |
| `data-fact-group` | `on` (default) or `off` | Thousands separators |
| `data-fact-sign` | `auto` (default) or `always` | With `always`, a `+` is written before a positive number |
| `data-fact-none` | Reason | The numbers in this element need no source |

Rules:

- An element with `data-fact` must be empty, and must not contain child elements.
- Without `data-fact-scale` and without `data-fact-digits`, `fill` fills in the text that the source file displays, for example `96.8%`, `2026-09-30`.
- With either of these 2 attributes, the type of the source value must be a number. `fill` fills in only the number, not the unit. Write the unit outside the element.
- A percentage can be written in 2 ways. Both are allowed. Without conversion attributes: `fill` fills in the text that the source file displays, for example `96.8%`. To change the number of decimal places: write `data-fact-scale="100" data-fact-digits="1"`, and write `%` outside the element.
- Negative numbers: the text that `fill` fills in starts with `-`. `data-fact-scale` must be a positive number, so you cannot display a negative number as a positive one. If the source file stores costs and expenses as negative numbers, display them as negative numbers, and tell the user in your report.
- You can cite cells that hold text and dates, for example the column heading `Q1 2026`. In that case you must not add conversion attributes.
- You can cite cells that have a formula. The number that the source file computed is the source value.
- Before you cite a cell, look at its row heading and column heading, and confirm that the cell is the item you want. The program cannot detect "a cell that exists was cited, but it is the wrong one".

What you must not do:

- Do not compute numbers yourself. Examples: growth rates, shares, differences, averages. If the source file does not have the number, tell the user: add 1 formula column in Excel, then ingest again.
- Do not write numbers of the source file in the text, including approximations such as "about 480 million".
- Do not write or change `<script id="tactile-provenance">` by hand. `fill` produces this block.
- Do not write `data-fact-was`. The editor adds this attribute when a person changes a number by hand.

Some numbers do not come from the source file. Examples: the year in a title, a section number, a target that the user gave in conversation. Add `data-fact-none="reason"` to the element that holds such a number. The reason says where the number comes from, for example `data-fact-none="target given by the user in conversation"`.

## When the source is a Word document

The steps are the same. 4 things differ:

1. The 2nd part of the ID is not a sheet. Tables are `t1`, `t2`…, for example `report.docx/t1/D6`. Paragraphs outside the tables are `body`: `body/A2` is the full text of the 2nd paragraph, and `body/B2` is the 1st number in the 2nd paragraph.
2. Word stores text only, and the program parses the numeric values. A cell with a unit after the number (for example `4.82億`) is text, and you must not cite it with `data-fact` as a number. List it under item 5 of "What to report".
3. A total in Word is typed by a person, not a formula. Write a `sum` rule for each total.
4. `verify` writes 1 more "note". Pass this note on to the user word for word.

The Word and PDF examples are in Chinese, in `examples/zh-hant/`; their source files are `test/fixtures/2026Q3.docx` and `2026Q3.pdf`.

## When the source is a PDF

The steps are the same. 5 things differ:

1. The 2nd part of the ID is the page. `report.pdf/p1/D10` is the 4th piece of text in line 10 of page 1. `report.pdf/p1n/A2` is the 1st number in the text of line 2 on page 1.
2. A PDF does not store tables. The program works out the lines and columns from the coordinates. The column is the position of the piece of text in its line, not the column of the table.
3. Before you write a range, confirm row by row in `facts.md` that every cell in the range is the number you want. If a row has moved to the left, you must not use a range; cite cell by cell instead, and write this under item 5 of "What to report".
4. Write a `sum` rule for each total.
5. `verify` writes 1 more "note". Pass this note on to the user word for word.

A piece of text with a footnote mark or a unit after the number is text, and you must not cite it with `data-fact` as a number. If `ingest` reports that the PDF has no text, tell the user that it is a scanned file, then stop.

## How to write charts

A chart is also 1 empty element. `fill` computes the coordinates and draws the SVG. You must not write an `<svg>` yourself to draw data.

```html
<figure>
  <figcaption>Q3 2026 revenue by operating segment (USD millions)</figcaption>
  <div data-chart="bar"
       data-chart-facts="2026Q3.xlsx/Income/D10:D13"
       data-chart-labels="2026Q3.xlsx/Income/A10:A13"
       data-chart-scale="1e-6" data-chart-digits="1"></div>
</figure>
```

| Attribute | Value | Effect |
|---|---|---|
| `data-chart` | `bar`, `line`, `pie` | Bar chart, line chart, pie chart |
| `data-chart-facts` | An ID or a range | The values to draw. They must be numbers |
| `data-chart-labels` | An ID or a range | The label of each value. There must be as many labels as values |
| `data-chart-series` | An ID or a range | The name of each series. Required with 2 or more series |
| `data-chart-scale`, `data-chart-digits`, `data-chart-group` | The same as `data-fact-*` | How the values and the axis ticks of the chart are displayed |

- A range is written as `2026Q3.xlsx/Income/D10:D13`. Separate several IDs or ranges with `;`.
- Separate several series with `|`, for example 1 series for each of 3 quarters: `…/B10:B13 | …/C10:C13 | …/D10:D13`. In that case write `…/B9:D9` in `data-chart-series`.
- An element with `data-chart` must be empty. Write the title and the unit outside it, for example in `<figcaption>`.
- Each series has at most 24 values, and there are at most 8 series. A pie chart can have only 1 series, at most 8 values, and no negative numbers.
- How to choose a chart: use `bar` to compare sizes; use `line` for change over time; use `pie` only for the parts of a whole, and only with 5 items or fewer.
- Example: [`examples/traceable/charts-draft.html`](examples/traceable/charts-draft.html).

## How to write the rules file

The rules file lets the program compute the reconciliation of the source file again. Example: [`examples/traceable/rules.yaml`](examples/traceable/rules.yaml).

```yaml
tactileRules: 1
report: Quarterly financial report
rules:
  - id: Segments add up to total revenue
    type: sum
    total: 2026Q3.xlsx/Income/D14
    parts: 2026Q3.xlsx/Income/D10:D13
    tolerance: 0

  - id: Summary revenue equals the income statement total
    type: equal
    left: 2026Q3.xlsx/Income/D14
    right: 2026Q3.xlsx/Summary/B2
```

- `sum`: the sum of `parts` must equal `total`. `parts` is 1 range, or a list of IDs and ranges.
- `equal`: `left` must equal `right`. Each side is 1 cell.
- `tolerance`: the difference that is allowed. The default is 0.
- Draft the rules from the formulas in `facts.md`: write 1 `sum` rule for each `SUM` formula; write 1 `equal` rule when one sheet cites the same number from another sheet.
- Other formulas have no matching rule type, for example ratios and subtractions. You do not need to write rules for them.
- You must not fill in `approvedBy` and `approvedOn`. These 2 fields mean that a person has confirmed the rules. Ask the user to read the rules file; the user fills them in.
- The rules file can be left out. In that case, run `fill` and `verify` without `--rules`.

## What to do about warnings

| Warning | What to do |
|---|---|
| The draft had "…", and it was replaced with the source value | The element in the draft is not empty. Empty it |
| There is a number with no source | If the number comes from the source file, use `data-fact` instead. If not, add `data-fact-none="reason"` |
| A rule fails | You must not raise `tolerance` or delete the rule to make it pass. Tell the user the values of both sides and the difference |
| A rule cannot be computed | Check whether the cells that the rule cites are numbers. If the source file itself has an error value, tell the user |

## Check a report that someone gives you

```bash
node bin/tactile-ingest.mjs verify <report.html> --source <source.xlsx> --json
```

`verify` does not change any file. With `--json` it writes JSON: `pass`, `reached` (the level it reached), `levels`, `counts`, `problems`, `warnings`.

| Level | What it checks | Needs |
|---|---|---|
| 1 | Every number in the report equals the text computed from the provenance block; the rules pass when computed again | The report |
| 2 | The source file is the same file as at ingest time (same SHA-256) | The report and the source file |
| 3 | The source file is read again, and every value in the provenance block equals the source file | The report and the source file |

How to read the result:

- Without `--source`, only Level 1 is done. In that case you must not tell the user "verified". You must say "only confirmed that the report agrees with the data embedded in it; not checked against the source file". Reason: a person can change the numbers of the report and the embedded data together, and Level 1 cannot see that.
- Level 2 fails: the source file was changed after ingest, or the user gave a different file.
- Level 2 passes and Level 3 fails: the data embedded in the report was changed.
- "Changed by hand": a person changed this number by hand in the editor. This is a warning. List these numbers for the user.
- Give one `--source` for each source file that the report cites. When some are missing, Levels 2 and 3 are "skipped".
- With `--strict`, any warning is a failure. Use it for automated gates.

Exit codes: 0 pass; 1 fail, or a file cannot be read; 2 the command is written wrongly.

## What to report

When you deliver the report, tell the user:

1. The path of the report.
2. The level that `verify` reached, and the result of each level.
3. Every rule that fails or cannot be computed, with the values of both sides and the difference.
4. Every number that has `data-fact-none`, and the reason.
5. The numbers that you could not write into the report, and the formulas that the user must add in Excel. Also list here the amounts that are displayed as negative numbers.
6. Nobody has confirmed the rules file yet. Ask the user to read `rules.yaml` and fill in `approvedBy` and `approvedOn`.
7. The program cannot check "is the cited cell the right item". The user can open the report in the Tactile editor, click a number, and see its row heading, column heading and source value.

## Limits

- Only `.xlsx`, `.docx` and `.pdf` source files are supported. `.xls` and `.csv` must first be saved as `.xlsx` in Excel; `.doc` must first be saved as `.docx` in Word. Scanned PDFs are not supported.
- If a formula cell has no stored result, `ingest` stops. Ask the user to open the file in Excel and save it.
- If the user inserts or deletes rows in Excel, the addresses of the cells change. In that case you must ingest again and check every ID in the draft.
- There are only 3 kinds of chart: bar, line and pie. There are no stacked charts, dual-axis charts or scatter charts.
