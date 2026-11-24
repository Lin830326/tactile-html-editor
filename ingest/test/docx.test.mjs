import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { readDocx } from '../src/docx.mjs';
import { fillReport } from '../src/fill.mjs';
import { buildFacts, IngestError, kindNote, kindOf } from '../src/ingest.mjs';
import { factsToMarkdown } from '../src/markdown.mjs';
import { numbersIn, parseNumberText } from '../src/number.mjs';
import { indexFacts, overview, readRange } from '../src/query.mjs';
import { verifyReport } from '../src/verify.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const cli = path.join(root, 'bin', 'tactile-ingest.mjs');
const docx = path.join(here, 'fixtures', '2026Q3.docx');
const bytes = fs.readFileSync(docx);
const source = { name: docx, bytes };
const facts = buildFacts([source]);
const byId = new Map(facts.facts.map((f) => [f.id, f]));
const get = (addr) => byId.get('2026Q3.docx/' + addr);
const draft = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'word-draft.html'), 'utf8');
const rulesText = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'word-rules.yaml'), 'utf8');

/** A .docx that holds only the given body XML: enough for the reader, which opens word/document.xml alone. */
function docxOf(bodyXml) {
  const cfb = XLSX.CFB.utils.cfb_new();
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><w:body>' +
    bodyXml + '<w:sectPr/></w:body></w:document>';
  XLSX.CFB.utils.cfb_add(cfb, 'word/document.xml', Buffer.from(xml, 'utf8'));
  return XLSX.CFB.write(cfb, { fileType: 'zip', type: 'buffer' });
}
const p = (text) => '<w:p><w:r><w:t xml:space="preserve">' + text + '</w:t></w:r></w:p>';
const tc = (inner, pr = '') => '<w:tc>' + (pr ? '<w:tcPr>' + pr + '</w:tcPr>' : '') + inner + '</w:tc>';
const read = (bodyXml) => new Map(readDocx(docxOf(bodyXml), 'a.docx').facts.map((f) => [f.id.slice('a.docx/'.length), f]));

test('text becomes a number only when it is a number and nothing else', () => {
  const yes = [
    ['482,000,000', 482000000], ['1234567', 1234567], ['0.1065', 0.1065], ['-2.5', -2.5], ['−2.5', -2.5], ['+3', 3],
    ['(398,765,432)', -398765432], ['6.9%', 0.069], ['96.8%', 0.968], ['-12.5%', -0.125], ['100%', 1], ['0.5%', 0.005],
    ['$1,200', 1200], ['NT$1,200.50', 1200.5], ['US$31.5', 31.5], ['-$5', -5], ['$-5', -5], ['($5)', -5], ['  42  ', 42],
  ];
  for (const [text, want] of yes) assert.equal(parseNumberText(text), want, text);
  const no = ['', '4.82億', '12 km', '1,23', '12,3456', '1,234,56', '2026-09-30', '2026/9/30', '1.2.3', '(5', '5)', '--5', '(-5)',
    '1e5', '１２３', 'N/A', '-', '3 - 5', '12:30', '.5', '5.', '1 000', '$', '%'];
  for (const text of no) assert.equal(parseNumberText(text), null, text);
});

test('the numbers in a sentence are found in order, and codes and dates are left alone', () => {
  assert.deepEqual(numbersIn('第三季營業收入 482,000,000 元，比上一季成長 6.9%。準時率 96.8%，客訴 1,204 件。'),
    [{ text: '482,000,000', value: 482000000 }, { text: '6.9%', value: 0.069 }, { text: '96.8%', value: 0.968 }, { text: '1,204', value: 1204 }]);
  assert.deepEqual(numbersIn('2026 年 Q3，A4 紙，版本 1.2.3，日期 2026-09-30 與 2026/9/30，時間 12:30。').map((n) => n.text), ['2026']);
  assert.deepEqual(numbersIn('降幅 -3.5%，共 3 項。').map((n) => n.value), [-0.035, 3]);
  assert.deepEqual(numbersIn('沒有數字'), []);
});

test('a document saved by Word: tables, merged cells and the numbers in the text', () => {
  assert.deepEqual(facts.sources[0].sheets, [
    { name: 'body', range: 'A1:E8', hidden: false },
    { name: 't1', range: 'A1:D6', hidden: false },
    { name: 't2', range: 'A1:C7', hidden: false },
  ]);
  assert.equal(facts.sources[0].file, '2026Q3.docx');
  assert.match(facts.sources[0].sha256, /^[0-9a-f]{64}$/);

  assert.deepEqual(get('t1/D6'), { id: '2026Q3.docx/t1/D6', type: 'number', value: 482000000, text: '482,000,000', labels: { row: '營業收入合計', col: '2026 Q3' } });
  assert.deepEqual(get('t1/A1'), { id: '2026Q3.docx/t1/A1', type: 'text', value: '項目', text: '項目' });
  // Brackets are a negative amount, a percentage is stored as the hundredth, and a unit keeps the cell text.
  assert.equal(get('t2/B3').value, -398765432);
  assert.equal(get('t2/B3').text, '(398,765,432)');
  assert.equal(get('t2/B4').value, 0.069);
  assert.equal(get('t2/B5').type, 'text');
  assert.equal(get('t2/B6').value, 31.5);
  assert.equal(get('t2/B7').value, -2.5);
  // Merged cells: the content is in the upper left cell, and the others are not facts.
  assert.equal(get('t2/A1').merge, 'A1:C1');
  assert.equal(get('t2/B1'), undefined);
  assert.equal(get('t2/C6').merge, 'C6:C7');
  assert.equal(get('t2/C7'), undefined);

  // Paragraphs outside tables: the text in A, its numbers after it. The empty paragraph 3 keeps its number.
  assert.equal(get('body/A2').type, 'text');
  assert.deepEqual(['B2', 'C2', 'D2', 'E2'].map((a) => get('body/' + a).value), [482000000, 0.069, 0.968, 1204]);
  assert.equal(get('body/B2').labels.row, get('body/A2').text);
  assert.equal(get('body/A3'), undefined);
  assert.equal(get('body/A4').text, '表 1：各服務營收（元）');
  assert.equal(get('body/B8').value, 1900000000);
});

test('reading the same file again gives the same facts', () => {
  const again = buildFacts([source]);
  assert.deepEqual(again.facts, facts.facts);
  assert.deepEqual(again.sources, facts.sources);
});

test('tracked changes, text boxes, field codes and nested tables', () => {
  const cells = read(
    '<w:p><w:r><w:t>保留</w:t></w:r><w:del><w:r><w:delText>刪除的 999</w:delText></w:r></w:del><w:ins><w:r><w:t>新增 7</w:t></w:r></w:ins></w:p>' +
    '<w:p><w:r><w:t>A</w:t><w:tab/><w:t>B</w:t><w:br/><w:t>C &amp; D &#x4E2D;</w:t></w:r></w:p>' +
    '<w:p><w:r><w:fldChar/><w:instrText>PAGE 12</w:instrText></w:r><w:r><w:t>頁</w:t></w:r></w:p>' +
    '<w:p><w:r><mc:AlternateContent><mc:Choice><w:drawing><w:t>圖裡的 55</w:t></w:drawing></mc:Choice><mc:Fallback><w:pict><w:t>圖裡的 55</w:t></w:pict></mc:Fallback></mc:AlternateContent></w:r><w:r><w:t>圖說</w:t></w:r></w:p>' +
    '<w:tbl><w:tr>' + tc(p('外 1')) + tc(p('第一段') + p('10') + '<w:tbl><w:tr>' + tc(p('內')) + tc(p('20')) + '</w:tr></w:tbl>' + p('')) + '</w:tr></w:tbl>' +
    '<w:sdt><w:sdtContent>' + p('內容控制項裡的 3 件') + '</w:sdtContent></w:sdt>');
  assert.equal(cells.get('body/A1').text, '保留新增 7');
  assert.equal(cells.get('body/B1').value, 7);
  assert.equal(cells.get('body/A2').text, 'A\tB\nC & D 中');
  assert.equal(cells.get('body/A3').text, '頁');
  assert.equal(cells.get('body/A4').text, '圖說');
  assert.equal(cells.get('body/B4'), undefined);
  // The outer table is t1 and the table inside its cell t2; the cell's own text does not repeat the inner table.
  assert.equal(cells.get('t1/A1').text, '外 1');
  assert.equal(cells.get('t1/B1').text, '第一段\n10');
  assert.equal(cells.get('t2/A1').text, '內');
  assert.equal(cells.get('t2/B1').value, 20);
  assert.equal(cells.get('body/A5').text, '內容控制項裡的 3 件');
  assert.equal(cells.get('body/B5').value, 3);
});

test('column spans and vertical merges give each cell the column a reader sees', () => {
  const span = (n) => '<w:gridSpan w:val="' + n + '"/>';
  const cells = read('<w:tbl>' +
    '<w:tr>' + tc(p('標題'), span(2)) + tc(p('右')) + '</w:tr>' +
    '<w:tr>' + tc(p('甲'), '<w:vMerge w:val="restart"/>') + tc(p('1')) + tc(p('2')) + '</w:tr>' +
    '<w:tr>' + tc(p(''), '<w:vMerge/>') + tc(p('3')) + tc(p('4')) + '</w:tr>' +
    '<w:tr>' + tc(p('乙')) + tc(p('5')) + tc(p('6')) + '</w:tr>' +
    '<w:tr><w:trPr><w:gridBefore w:val="1"/></w:trPr>' + tc(p('7')) + tc(p('8')) + '</w:tr>' +
    '</w:tbl>');
  assert.equal(cells.get('t1/A1').merge, 'A1:B1');
  assert.equal(cells.get('t1/C1').text, '右');
  assert.equal(cells.get('t1/A2').merge, 'A2:A3');
  assert.equal(cells.get('t1/A3'), undefined);
  assert.equal(cells.get('t1/B3').value, 3);
  assert.equal(cells.get('t1/A4').merge, undefined);
  assert.equal(cells.get('t1/B5').value, 7);
  assert.equal(cells.get('t1/C5').value, 8);
  assert.deepEqual(cells.get('t1/C4').labels, { row: '乙', col: '右' });
});

test('what is not a .docx is refused with what to do', () => {
  assert.throws(() => readDocx(Buffer.from('plain text'), 'a.docx'), (e) => e instanceof IngestError && /不是 \.docx 格式/.test(e.message));
  // A zip that is not a Word document: an .xlsx renamed.
  assert.throws(() => readDocx(fs.readFileSync(path.join(here, 'fixtures', '2026Q3.xlsx')), 'a.docx'), /不是 \.docx 格式/);
  assert.throws(() => buildFacts([{ name: 'a.doc', bytes }]), /不是 \.xlsx、\.docx 或 \.pdf 檔案/);
  assert.throws(() => buildFacts([{ name: 'a.txt', bytes }]), /只支援這 3 種/);
  assert.equal(kindOf('報告.DOCX'), 'docx');
  assert.equal(kindOf('a.xlsx'), 'xlsx');
  assert.equal(kindOf('a.docx.txt'), null);
  assert.equal(kindNote('a.xlsx'), '');
});

test('facts.md and the MCP answers say that a Word document stores text', () => {
  const md = factsToMarkdown(facts);
  assert.match(md, /^# 2026Q3\.docx\n\nWord 文件只儲存文字。數值是程式從文字解析出來的/);
  assert.match(md, /## t1\n\nID 的寫法：`2026Q3\.docx\/t1\/<儲存格>`/);
  assert.match(md, /合併儲存格（內容在左上角那一格）：`A1:C1`、`C6:C7`/);
  const ix = indexFacts(facts);
  assert.match(overview(ix), /- Word 文件只儲存文字/);
  assert.match(readRange(ix, { sheet: 't1', range: 'A6:D6' }), /\| 6 \| 營業收入合計 \| 420,000,000 \| 451,000,000 \| 482,000,000 \|/);
  // A workbook's facts.md carries no such note.
  const xlsx = path.join(here, 'fixtures', '2026Q3.xlsx');
  assert.ok(!factsToMarkdown(buildFacts([{ name: xlsx, bytes: fs.readFileSync(xlsx) }])).includes('Word'));
});

test('a report from a Word document fills, passes 3 levels, and carries the note', () => {
  const filled = fillReport(draft, facts, { rulesText });
  assert.equal(filled.filled, 6);
  assert.equal(filled.charts, 1);
  assert.deepEqual(filled.rules.map((r) => r.result), ['pass', 'pass']);
  assert.match(filled.html, /約 <span[^>]*>4\.82<\/span> 億元/);
  assert.match(filled.html, /營業成本 <span[^>]*>\(398,765,432\)<\/span>/);
  // The example in the repository is this report, filled at another time.
  const stamp = (html) => html.replace(/"(filledAt|createdAt)":\s*"[^"]*"/g, '"$1":""');
  assert.equal(stamp(filled.html), stamp(fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'word-report.html'), 'utf8')));

  const r = verifyReport(filled.html, { sources: [source], rulesText });
  assert.deepEqual(r.levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0], /^「2026Q3\.docx」：Word 文件只儲存文字。.*第 3 級只表示重新解析的結果相同。$/);
  // The note follows the IDs, so a block without its list of sources still gets it.
  assert.equal(verifyReport(filled.html.replace(/"sources":\[[^\]]*\]/, '"sources":[]')).notes.length, 1);

  // A total typed wrongly in Word is what a rule is for.
  const wrong = fillReport(draft, facts, { rulesText: rulesText.replace('D2:D5', 'D2:D4') });
  assert.equal(wrong.rules[0].result, 'fail');
  // A workbook's report has no note.
  const xlsx = path.join(here, 'fixtures', '2026Q3.xlsx');
  const example = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'report.html'), 'utf8');
  assert.deepEqual(verifyReport(example, { sources: [{ name: xlsx, bytes: fs.readFileSync(xlsx) }] }).notes, []);
});

test('the command reads a workbook and a document together, and verify prints the note', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-docx-'));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  try {
    const both = run('ingest', docx, path.join(here, 'fixtures', '2026Q3.xlsx'), '--out', dir);
    assert.equal(both.status, 0, both.stderr);
    assert.match(both.stdout, /已擷取 2 個檔案、6 個工作表、表格或頁/);
    const report = path.join(dir, 'report.html');
    assert.equal(run('fill', path.join(root, 'examples', 'zh-hant', 'word-draft.html'), '--facts', path.join(dir, 'facts.json'), '--out', report).status, 0);
    const v = run('verify', report, '--source', docx, '--strict');
    assert.equal(v.status, 0, v.stdout);
    assert.match(v.stdout, /說明 1 個：\n- 「2026Q3\.docx」：Word 文件只儲存文字/);
    assert.match(v.stdout, /結果：通過。做到第 3 級/);
    assert.equal(JSON.parse(run('verify', report, '--source', docx, '--json').stdout).notes.length, 1);
    const bad = run('ingest', path.join(here, 'fixtures', 'display-vectors.json'), '--out', dir);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /不是 \.xlsx、\.docx 或 \.pdf 檔案/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
