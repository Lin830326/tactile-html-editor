# Fixtures

`2026Q3.xlsx` and `shared.xlsx` were saved by Excel 16 on a zh-TW machine, so formulas carry the results Excel
computed. The company and the figures are made up.

`2026Q3.xlsx`:

- 損益表: a merged title (A1:D1), a date in a regional format (B2), numbers with `#,##0`, sums (row 14),
  percentages (row 15), a negative in brackets (D16), a custom format with text (D17), an error (D18), a boolean
  (D19), a General-format decimal (D21), a number stored as text (D22).
- 摘要: a reference to the other sheet (B3), a date with a time (B4).
- 隱藏參數: a hidden sheet.

`shared.xlsx` is the same workbook with E10:E13 filled down, which Excel stores as one shared formula.

`2026Q3.docx` was saved by Word 16 on the same machine, through a script: 8 paragraphs outside tables (the third is
empty), table 1 with the same figures as 損益表 rows 9 to 14, and table 2 with a merged heading row (A1:C1), a
vertical merge (C6:C7), a negative in brackets, a percentage, a number with a unit and one with a currency sign.

`2026Q3.pdf` is `2026Q3.docx` saved as PDF by the same Word, through a script: 1 page, 19 lines of text. Its
author field holds the placeholder `USER`.

`no-cached-values.xlsx` was written by openpyxl and never opened in Excel: A3 holds a formula and no result.
