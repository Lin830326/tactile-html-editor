# tactile-ingest

[English](README.md)

把來源檔讀成帶位址的值，讓報告裡的每個數字都能追溯到來源。格式定義在 [`docs/spec/provenance.md`](../docs/spec/provenance.md)。

有 `ingest`、`fill`、`verify`、`mcp` 4 個指令。來源檔支援 Excel 的 `.xlsx`、Word 的 `.docx` 與 PDF。給 AI 代理的使用說明在 [`SKILL.md`](SKILL.md)。

## 安裝

需要 Node 22.13 以上。

這個資料夾的 `.npmrc` 設定 `omit=optional`：不安裝 `pdfjs-dist` 選用的繪圖套件（`@napi-rs/canvas`）。讀文字不需要它。

```bash
npm ci
```

## 使用

```bash
node bin/tactile-ingest.mjs ingest 2026Q3.xlsx --out out
```

寫出 2 個檔案：

- `out/facts.json`：給程式讀。每個非空儲存格 1 筆，有 ID、值、顯示文字、公式。
- `out/facts.md`：給 AI 讀。每個工作表 1 個表格，欄是欄字母，列是列號。

ID 的寫法是 `檔名/工作表/儲存格`，例如 `2026Q3.xlsx/損益表/D14`。

## 使用：填入報告

AI 依 `facts.md` 寫報告草稿。數字的位置留空，只寫 ID：

```html
<span data-fact="2026Q3.xlsx/損益表/D14" data-fact-scale="1e-8" data-fact-digits="2"></span> 億元
```

```bash
node bin/tactile-ingest.mjs fill examples/zh-hant/report-draft.html --facts out/facts.json --rules examples/zh-hant/rules.yaml --out out/report.html
```

`fill` 做 3 件事：

1. 把每個 `data-fact` 元素填上來源值。
2. 計算 `rules.yaml` 的勾稽規則。
3. 把報告用到的值與規則內嵌進報告。報告仍然是單一檔案。

`examples/zh-hant/` 有 1 份草稿、1 份規則檔，以及 `fill` 產生的 `report.html`。

## 使用：圖表

草稿裡寫 1 個空的元素，說明要畫哪些儲存格。`fill` 計算座標，畫出 inline SVG：

```html
<div data-chart="bar"
     data-chart-facts="2026Q3.xlsx/損益表/D10:D13"
     data-chart-labels="2026Q3.xlsx/損益表/A10:A13"
     data-chart-scale="1e-6" data-chart-digits="1"></div>
```

支援 `bar`、`line`、`pie`。`verify` 會重畫每張圖並比對。範例：`examples/zh-hant/charts-draft.html` 與 `fill` 產生的 `examples/zh-hant/charts.html`。

## 使用：檢查報告

```bash
node bin/tactile-ingest.mjs verify out/report.html --source 2026Q3.xlsx --rules examples/zh-hant/rules.yaml
```

`verify` 不修改任何檔案。它分 3 級檢查，並寫出每一級的結果：

| 層級 | 檢查什麼 | 需要 |
|---|---|---|
| 1. 內部一致 | 報告上每個數字等於出處區塊算出的文字；規則重算後通過 | 報告 |
| 2. 來源檔相同 | `--source` 的檔案與擷取時是同一個檔案（SHA-256 相同） | 報告與來源檔 |
| 3. 重新擷取 | 重新讀來源檔，出處區塊的每個值都與來源檔相同 | 報告與來源檔 |

沒有 `--source` 時只做第 1 級，結果會寫「尚未與來源檔核對」。報告引用幾個來源檔，就必須給幾個 `--source`。

- `--rules`：核對規則檔與填入時是同一個檔案，而且出處區塊裡的規則沒有被改過。
- `--strict`：「已偏離來源」「無出處」「有層級沒做」也算不通過。
- `--json`：用 JSON 輸出結果。

結束代碼：0 通過；1 不通過，或檔案讀不到；2 指令寫錯。

## 使用：Word 文件

`ingest` 也讀 `.docx`，可以與 `.xlsx` 一起給：

```bash
node bin/tactile-ingest.mjs ingest 2026Q3.docx 2026Q3.xlsx --out out
```

Word 文件沒有工作表，所以 ID 的第 2 段是另一種寫法：

| ID | 指的是 |
|---|---|
| `2026Q3.docx/t1/D6` | 第 1 個表格的 D6 |
| `2026Q3.docx/body/A2` | 表格以外的第 2 個段落 |
| `2026Q3.docx/body/B2` | 第 2 個段落裡的第 1 個數字（`C2` 是第 2 個） |

Word 只儲存文字。`ingest` 把「只有 1 個數字」的文字讀成數值：千分位、小數、負號、括號負數、`%`、開頭的貨幣符號。其他文字維持文字，例如 `4.82億`。完整規則在[規格](../docs/spec/provenance.md)第 3.3 節。

因為數值是解析出來的，`facts.md` 與 `verify` 的輸出都會寫出 1 句說明。建議替 Word 表格的合計寫 `sum` 規則：Word 的合計是人打的字，不是公式。

不擷取：頁首、頁尾、註腳、文字方塊、已刪除的追蹤修訂。`.doc` 必須先用 Word 另存成 `.docx`。

範例：`examples/zh-hant/word-draft.html`、`examples/zh-hant/word-rules.yaml` 與 `fill` 產生的 `examples/zh-hant/word-report.html`；來源檔是 `test/fixtures/2026Q3.docx`。

圖表的文字（給螢幕閱讀器的圖表名稱、提示文字裡的連接符號）跟著報告的 `<html lang>`：`zh-Hans`、`zh-CN`、`zh-SG` 用簡體與大陸用語（柱状图、折线图、饼图）；其他中文或沒有寫時用繁體；其他語言用英文。`fill` 與 `verify` 用同一條規則，所以英文報告的圖表也能重畫比對。英文報告的完整範例在 `examples/traceable/`，簡體中文的在 `examples/traceable-zh-hans/`。

## 使用：PDF

`ingest` 也讀 `.pdf`。讀取 PDF 需要 Node 22.13 以上。

```bash
node bin/tactile-ingest.mjs ingest 2026Q3.pdf --out out
```

PDF 沒有儲存表格，只儲存文字與座標。`ingest` 從座標推算行與欄：

| ID | 指的是 |
|---|---|
| `2026Q3.pdf/p1/D10` | 第 1 頁、由上到下第 10 行、由左到右第 4 段文字 |
| `2026Q3.pdf/p1n/A2` | 第 1 頁第 2 行的文字裡的第 1 個數字（`B2` 是第 2 個） |

使用前必須知道 3 件事：

1. 欄是那一行的第幾段，不是表格的第幾欄。表格的某一列有空格時，那一列後面的數字往左移 1 欄。先看 `facts.md` 的表格，確認要引用的範圍對齊。
2. 建議替每個合計寫 `sum` 規則。範圍沒有對齊時，規則大多會違反。
3. 掃描的 PDF 沒有文字，`ingest` 回報錯誤。這個工具不做文字辨識。

數值的解析規則與 Word 相同。數字後面有註腳記號時，那一段是文字。完整規則在[規格](../docs/spec/provenance.md)第 3.4 節。

`facts.md` 與 `verify` 的輸出都會寫出 1 句說明。如果同一份資料有 `.xlsx` 或 `.docx`，建議用它，不用 PDF：它們的位址是檔案儲存的，不是推算的。

範例：`examples/zh-hant/pdf-draft.html`、`examples/zh-hant/pdf-rules.yaml` 與 `fill` 產生的 `examples/zh-hant/pdf-report.html`；來源檔是 `test/fixtures/2026Q3.pdf`。

## 使用：MCP 伺服器

來源檔很大時，`facts.md` 可能超過 AI 的上下文容量。`mcp` 指令啟動 1 個 MCP 伺服器，AI 一次只查詢需要的部分。

```bash
node bin/tactile-ingest.mjs mcp --facts out/facts.json
```

這個指令由 AI 用戶端啟動，用 stdio 溝通。它只讀取 `facts.json`，不修改任何檔案，不連線到網路。`facts.json` 被重新擷取後，下一次查詢會讀到新的內容。

用戶端的設定範例（Claude Code 的 `.mcp.json`；路徑改成你的位置）：

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

有 5 個工具，都只讀取資料：

| 工具 | 回傳什麼 |
|---|---|
| `list_sources` | 來源檔與工作表：檔名、SHA-256、範圍、儲存格數、公式數 |
| `read_range` | 1 個工作表的一部分：與 `facts.md` 相同的表格，加上範圍內的公式。預設最多 400 個儲存格；超過時寫出接著要查的範圍 |
| `search_facts` | 文字、數值、標題或公式含有關鍵字的儲存格。數字可以不寫千分位 |
| `get_facts` | 依 ID 取得完整記錄（JSON），一次最多 100 個 |
| `trace_formula` | 1 個儲存格的公式讀取哪些儲存格，預設展開 2 層 |

問法不對時（例如工作表名稱寫錯），工具回傳錯誤訊息，並列出可以用的名稱。

伺服器沒有 `fill` 與 `verify` 的工具。這 2 個步驟仍然用指令執行，因為它們會讀寫檔案。

## 會停止並回報錯誤的情況

`ingest`：

- 公式儲存格沒有儲存的計算結果。請用 Excel 開啟檔案並儲存。
- 檔案不是 `.xlsx`、`.docx` 或 `.pdf`，或內容不是副檔名表示的格式。
- PDF 沒有文字（掃描的影像），或有密碼。
- 2 個來源檔的檔名相同。

`fill`（不寫出報告，列出每個錯誤與行號）：

- `data-fact` 的 ID 不在 `facts.json`。
- 換算屬性的值不合規定，或值不是數字卻有換算屬性。
- 帶 `data-fact` 的元素含子元素。
- 規則檔寫錯，或規則引用的 ID 不存在。

## 只警告、仍然寫出報告的情況

- 草稿原本寫了數字，而且與來源值不同。`fill` 用來源值取代它。
- 文字裡有無出處的數字。確認不需要出處的，在元素加 `data-fact-none="理由"`。
- 有規則違反，或無法計算。

## 測試

```bash
npm test
```
