/* Tactile — ingest-text.js: the messages of the code shared with tactile-ingest, in the interface language.
 *
 * ingest/src/decimal.mjs, rules-core.mjs, chart.mjs, workbook.mjs and yaml-lite.mjs throw errors whose message is
 * the Traditional Chinese text the command-line tool prints. Each also carries `code` (a short English name) and
 * `vars` (what varies in the message). This table gives every code a text of the editor's own, which goes through
 * HE.t() like any interface text. The editor has no facts.json: where the tool names that file, the text here says
 * 來源檔或出處資料. An error with no code, or a code this table does not know, is shown as its message.
 *
 * `node tools/i18n-check.mjs` fails when one of the five files throws a code that has no line here, or when a line
 * here names a code none of them throws.
 *
 *   HE.ingestText(err) -> text      err: an Error, or anything with {message, code?, vars?}
 */
(function () {
  'use strict';
  const HE = window.HE;
  const t = HE.t;

  const TEXT = {
    /* decimal.mjs: how a cited number is shown */
    'show.scale': (v) => t('屬性 {name} 的值「{value}」不合規定：必須是正數，例如 1e-8、100、0.001', v),
    'show.digits': (v) => t('屬性 {name} 的值「{value}」不合規定：必須是 0～10 的整數', v),
    'show.group': (v) => t('屬性 {name} 的值「{value}」不合規定：必須是 on 或 off', v),
    'show.sign': (v) => t('屬性 {name} 的值「{value}」不合規定：必須是 auto 或 always', v),
    'show.not-number': (v) => t('有換算屬性，但值的類型是 {type}，不是 number', v),
    'show.not-finite': (v) => t('值 {value} 不是有限的數字', v),

    /* rules-core.mjs: reconciliation rules */
    'rules.top': (v) => t('規則檔的最外層必須是欄位，例如 tactileRules 與 rules', v),
    'rules.no-version': (v) => t('規則檔缺少 tactileRules（格式版本）', v),
    'rules.version': (v) => t('規則檔的格式版本是 {found}，這個編輯器只讀得懂版本 {want}', v),
    'rules.not-list': (v) => t('規則檔的 rules 必須是清單', v),
    'rules.field-text': (v) => t('{field} 必須是文字', v),
    'rules.item-shape': (v) => t('第 {n} 條規則必須是一組欄位', v),
    'rules.id-text': (v) => t('第 {n} 條規則的 id 必須是文字', v),
    'rules.no-id': (v) => t('第 {n} 條規則缺少 id', v),
    'rules.duplicate': (v) => t('規則「{rule}」出現 2 次。規則的 id 不可重複', v),
    'rules.ref': (v) => t('規則「{rule}」缺少 {key}，或它不是 ID', v),
    'rules.ref-range': (v) => t('規則「{rule}」的 {key} 必須是 1 個儲存格，不可是範圍', v),
    'rules.tolerance': (v) => t('規則「{rule}」的 tolerance 必須是 0 或正數', v),
    'rules.parts': (v) => t('規則「{rule}」的 parts 必須是 1 個範圍，或 ID 的清單', v),
    'rules.type': (v) => t('規則「{rule}」的 type 是「{type}」。只支援 sum 與 equal', v),
    'rules.note-text': (v) => t('規則「{rule}」的 note 必須是文字', v),
    'rules.fact-missing': (v) => t('規則「{rule}」引用的 {id} 不在來源檔或出處資料裡', v),
    'rules.range-empty': (v) => t('規則「{rule}」的範圍 {range} 裡沒有任何值', v),
    'rules.no-numbers': (v) => t('規則「{rule}」的 parts 裡沒有數字', v),

    /* chart.mjs: charts */
    'chart.type': (v) => t('data-chart 的值是「{type}」。只支援 bar、line、pie', v),
    'chart.range-empty': (v) => t('{name} 的範圍 {range} 裡沒有任何值', v),
    'chart.fact-missing': (v) => t('{name} 引用的 {id} 不在來源檔或出處資料裡', v),
    'chart.no-facts': (v) => t('圖表缺少 data-chart-facts', v),
    'chart.series-empty': (v) => t('data-chart-facts 有 1 組數列是空的', v),
    'chart.no-labels': (v) => t('圖表缺少 data-chart-labels', v),
    'chart.series-uneven': (v) => t('data-chart-facts 的每組數列必須有相同數量的值。現在是 {counts}', v),
    'chart.labels-count': (v) => t('data-chart-labels 有 {labels} 個標籤，但每組數列有 {count} 個值。兩者必須相同', v),
    'chart.too-many-points': (v) => t('每組數列有 {count} 個值。上限是 {max}', v),
    'chart.too-many-series': (v) => t('有 {count} 組數列。上限是 {max}', v),
    'chart.pie-series': (v) => t('圓餅圖只能有 1 組數列', v),
    'chart.pie-points': (v) => t('圓餅圖有 {count} 個值。上限是 {max}', v),
    'chart.names-count': (v) => t('有 {series} 組數列，data-chart-series 必須給 {series} 個名稱。現在是 {names}', v),
    'chart.names-single': (v) => t('只有 1 組數列，data-chart-series 最多給 1 個名稱', v),
    'chart.not-number': (v) => t('data-chart-facts 引用的 {id} 的類型是 {type}，不是 number', v),
    'chart.pie-negative': (v) => t('圓餅圖的值不可是負數', v),
    'chart.pie-zero': (v) => t('圓餅圖的值全部是 0，畫不出來', v),

    /* workbook.mjs: reading a dropped .xlsx */
    'book.not-xlsx': (v) => t('無法讀取「{file}」：內容不是 .xlsx 格式。如果它是 .xls 或 .csv，請先用 Excel 另存成 .xlsx', v),
    'book.invalid': (v) => t('無法讀取「{file}」：這不是有效的 Excel 檔案（{error}）', v),
    'book.no-result': (v) => t('「{file}」的 {sheet}!{cell} 有公式（={formula}），但檔案裡沒有計算結果。請用 Excel 開啟這個檔案並儲存，再拖進來。', v),
    'book.bad-date': (v) => t('「{file}」的 {sheet}!{cell} 是日期格式，但數值 {value} 不是有效的日期', v),
    'book.not-finite': (v) => t('「{file}」的 {sheet}!{cell} 不是有限的數字', v),

    /* yaml-lite.mjs: reading a rules.yaml the user loads */
    'yaml.tab': (v) => t('規則檔第 {line} 行：有 Tab 字元。縮排請用空白；文字裡的 Tab 請在雙引號裡寫成 \\t', v),
    'yaml.control': (v) => t('規則檔第 {line} 行：有控制字元或不支援的換行字元', v),
    'yaml.directive': (v) => t('規則檔第 {line} 行：不支援指令（%）', v),
    'yaml.doc-inline': (v) => t('規則檔第 {line} 行：--- 的同一行不可有內容', v),
    'yaml.multi-doc': (v) => t('規則檔第 {line} 行：不支援多份文件（--- 與 ...）。1 個檔案只能有 1 份', v),
    'yaml.anchor': (v) => t('規則檔第 {line} 行：不支援錨點（&）', v),
    'yaml.alias': (v) => t('規則檔第 {line} 行：不支援別名（*）', v),
    'yaml.tag': (v) => t('規則檔第 {line} 行：不支援標籤（!）', v),
    'yaml.block-scalar': (v) => t('規則檔第 {line} 行：不支援區塊純量（| 與 >）。請把文字寫在同一行，需要時加雙引號', v),
    'yaml.flow-map': (v) => t('規則檔第 {line} 行：不支援流式對應（{ }）。請改寫成每行 1 個「鍵: 值」', v),
    'yaml.complex-key': (v) => t('規則檔第 {line} 行：不支援複雜鍵（?）', v),
    'yaml.merge-key': (v) => t('規則檔第 {line} 行：不支援合併鍵（<<）', v),
    'yaml.dash': (v) => t('規則檔第 {line} 行：清單項目「-」必須自己在行首', v),
    'yaml.indicator': (v) => t('規則檔第 {line} 行：文字不可用「{char}」開頭。請加引號', v),
    'yaml.number-form': (v) => t('規則檔第 {line} 行：「{text}」是十六進位、八進位、無限大或非數字的寫法。請寫成十進位的數字，或加引號當作文字', v),
    'yaml.number-range': (v) => t('規則檔第 {line} 行：數字「{text}」太大，無法表示', v),
    'yaml.quote-open': (v) => t('規則檔第 {line} 行：引號沒有在同一行結束。不支援跨行的文字', v),
    'yaml.escape': (v) => t('規則檔第 {line} 行：雙引號裡的跳脫「{seq}」不是有效的寫法', v),
    'yaml.after-value': (v) => t('規則檔第 {line} 行：引號或 ] 後面有多餘的內容', v),
    'yaml.flow-open': (v) => t('規則檔第 {line} 行：[ 沒有在同一行用 ] 結束', v),
    'yaml.flow-nested': (v) => t('規則檔第 {line} 行：[ ] 裡面只能放純量，不可再放 [ ] 或 { }', v),
    'yaml.flow-syntax': (v) => t('規則檔第 {line} 行：[ ] 裡面的寫法不支援。項目之間用逗號分隔；含有「:」或「#」的項目請加引號', v),
    'yaml.flow-empty': (v) => t('規則檔第 {line} 行：[ ] 裡面有空的項目，或結尾多了逗號', v),
    'yaml.nested-colon': (v) => t('規則檔第 {line} 行：值裡面有「: 」或以「:」結尾。請把值加上引號', v),
    'yaml.key-type': (v) => t('規則檔第 {line} 行：鍵「{key}」會被讀成數字、布林值或空值。請加引號', v),
    'yaml.key-long': (v) => t('規則檔第 {line} 行：鍵超過 {max} 個字元', v),
    'yaml.duplicate-key': (v) => t('規則檔第 {line} 行：鍵「{key}」重複', v),
    'yaml.indent': (v) => t('規則檔第 {line} 行：縮排與上面的內容對不起來', v),
    'yaml.multiline': (v) => t('規則檔第 {line} 行：這一行的縮排比上一行多，但上一行已經有值。不支援跨行的文字', v),
    'yaml.no-colon': (v) => t('規則檔第 {line} 行：這一行不是「鍵: 值」，也不是「- 項目」。不支援跨行的文字', v),
    'yaml.depth': (v) => t('規則檔第 {line} 行：巢狀超過 {max} 層', v),
  };

  HE.ingestText = function (err) {
    const code = err && err.code;
    if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(TEXT, code)) return TEXT[code](err.vars || {});
    return String((err && err.message) || err);
  };
  HE.ingestText.codes = Object.keys(TEXT);
})();
