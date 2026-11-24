import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildFacts, IngestError } from '../src/ingest.mjs';
import { factsToMarkdown } from '../src/markdown.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => path.join(here, 'fixtures', name);
const input = (name) => ({ name: fixture(name), bytes: fs.readFileSync(fixture(name)) });
const cli = path.join(here, '..', 'bin', 'tactile-ingest.mjs');

// 2026Q3.xlsx was saved by Excel 16 (zh-TW); test/fixtures/README.md lists what is in it.
const facts = buildFacts([input('2026Q3.xlsx')], { now: new Date('2026-11-11T03:40:00Z') });
const get = (tail) => facts.facts.find((f) => f.id === '2026Q3.xlsx/' + tail);

test('the file is identified by name, size and SHA-256, and every sheet is listed, hidden ones too', () => {
  const bytes = fs.readFileSync(fixture('2026Q3.xlsx'));
  assert.equal(facts.tactileFacts, 1);
  assert.equal(facts.createdAt, '2026-11-11T03:40:00Z');
  assert.deepEqual(facts.sources, [{
    file: '2026Q3.xlsx',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    sheets: [
      { name: '損益表', range: 'A1:D22', hidden: false },
      { name: '摘要', range: 'A3:B4', hidden: false },
      { name: '隱藏參數', range: 'A1:B1', hidden: true },
    ],
  }]);
  assert.equal(get('隱藏參數/B1').value, 32.15);
});

test('a number keeps its exact value, the text Excel shows, its format, formula and what the formula reads', () => {
  assert.deepEqual(get('損益表/D14'), {
    id: '2026Q3.xlsx/損益表/D14',
    type: 'number',
    value: 482000000,
    text: '482,000,000',
    format: '#,##0',
    formula: 'SUM(D10:D13)',
    refs: ['2026Q3.xlsx/損益表/D10', '2026Q3.xlsx/損益表/D11', '2026Q3.xlsx/損益表/D12', '2026Q3.xlsx/損益表/D13'],
    labels: { row: '營業收入合計', col: '2026 Q3' },
  });
  // The value is not the rounded text.
  assert.equal(get('損益表/D11').value, 236000000.5);
  assert.equal(get('損益表/D11').text, '236,000,001');
  assert.equal(get('損益表/D15').value, 0.06873614190687362);
  assert.equal(get('損益表/D15').text, '6.9%');
  assert.equal(get('損益表/D16').text, '(398,765,432)');
  assert.equal(get('損益表/D17').text, '4.82億');
  // General format: no `format` field.
  assert.equal(get('損益表/D21').format, undefined);
  assert.equal(get('損益表/D21').text, '0.1065');
});

test('a reference to another sheet resolves to that sheet', () => {
  assert.deepEqual(get('摘要/B3').refs, ['2026Q3.xlsx/損益表/D14']);
  assert.deepEqual(get('損益表/D15').refs, ['2026Q3.xlsx/損益表/D14', '2026Q3.xlsx/損益表/C14']);
});

test('dates are ISO text whatever the regional format; errors, booleans and text keep their kind', () => {
  // Excel shows this cell as 2026/9/30 on a zh-TW machine and 9/30/26 on a US one.
  assert.deepEqual(get('損益表/B2'), {
    id: '2026Q3.xlsx/損益表/B2', type: 'date', value: '2026-09-30', text: '2026-09-30', format: 'm/d/yy',
    // The title above is a merged cell whose text sits in A1, so column B has no heading: labels are a guess.
    formula: 'DATE(2026,9,30)', labels: { row: '資料日期' },
  });
  assert.equal(get('摘要/B4').value, '2026-09-30T08:30:00');
  assert.equal(get('損益表/D18').type, 'error');
  assert.equal(get('損益表/D18').value, '#DIV/0!');
  assert.equal(get('損益表/D19').type, 'bool');
  assert.equal(get('損益表/D19').value, true);
  // A number stored as text stays text, leading zeros and all.
  assert.deepEqual(get('損益表/D22'), { id: '2026Q3.xlsx/損益表/D22', type: 'text', value: '00123', text: '00123', format: '@' });
  assert.equal(get('損益表/A1').merge, 'A1:D1');
  assert.equal(get('損益表/A1').labels, undefined);
});

test('a filled-down formula is written out for each of its cells', () => {
  const shared = buildFacts([input('shared.xlsx')]);
  const f = (cell) => shared.facts.find((x) => x.id === 'shared.xlsx/損益表/' + cell);
  assert.deepEqual(['E10', 'E11', 'E12', 'E13'].map((c) => f(c).formula), ['B10+C10+$D10', 'B11+C11+$D11', 'B12+C12+$D12', 'B13+C13+$D13']);
  assert.deepEqual(f('E12').refs, ['shared.xlsx/損益表/B12', 'shared.xlsx/損益表/C12', 'shared.xlsx/損益表/D12']);
  assert.equal(f('E12').value, 196000000);
});

test('a formula with no stored result stops the read instead of becoming a number', () => {
  assert.throws(() => buildFacts([input('no-cached-values.xlsx')]), (err) => {
    assert.ok(err instanceof IngestError);
    assert.match(err.message, /S!A3/);
    assert.match(err.message, /SUM\(A1:A2\)/);
    assert.match(err.message, /用 Excel 開啟/);
    return true;
  });
});

test('two files of one name, and files that are not .xlsx, are refused', () => {
  const a = input('2026Q3.xlsx');
  assert.throws(() => buildFacts([a, { name: 'other/2026Q3.xlsx', bytes: a.bytes }]), /檔名不可重複/);
  assert.throws(() => buildFacts([{ name: 'a.csv', bytes: Buffer.from('1,2') }]), /不是 \.xlsx、\.docx 或 \.pdf 檔案/);
  // Text under an .xlsx name is not read as CSV.
  assert.throws(() => buildFacts([{ name: 'bad.xlsx', bytes: Buffer.from('a,b;1,2') }]), /不是 \.xlsx 格式/);
  assert.throws(() => buildFacts([{ name: 'bad.xlsx', bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x20, 0x21]) }]), IngestError);
  assert.throws(() => buildFacts([]), /沒有指定來源檔/);
});

test('the Markdown shows the grid with its own row numbers and column letters, then the formulas', () => {
  const md = factsToMarkdown(facts);
  assert.match(md, /^# 2026Q3\.xlsx\n\n## 損益表\n/);
  assert.ok(md.includes('ID 的寫法：`2026Q3.xlsx/損益表/<儲存格>`，例如 `2026Q3.xlsx/損益表/A1`。'));
  assert.ok(md.includes('|  | A | B | C | D |'));
  assert.ok(md.includes('| 14 | 營業收入合計 | 420,000,000 | 451,000,000 | 482,000,000 |'));
  // Empty rows 3 to 8 are left out and the numbering is the sheet's.
  assert.ok(md.includes('| 2 | 資料日期 | 2026-09-30 |  |  |\n| 9 | 項目 |'));
  assert.ok(md.includes('- `D14` = `SUM(D10:D13)`'));
  assert.ok(md.includes('## 隱藏參數（隱藏的工作表）'));
  assert.ok(md.includes('合併儲存格（內容在左上角那一格）：`A1:D1`'));
  // The reading layer is made from the structural layer alone.
  assert.equal(factsToMarkdown(JSON.parse(JSON.stringify(facts))), md);
});

test('a pipe or a line break in a cell cannot break the Markdown table', () => {
  const md = factsToMarkdown({
    sources: [{ file: 'a.xlsx', sheets: [{ name: 'S', range: 'A1:A1', hidden: false }] }],
    facts: [{ id: 'a.xlsx/S/A1', type: 'text', value: 'x', text: 'a|b\nc\\d' }],
  });
  assert.ok(md.includes('| 1 | a\\|b c\\\\d |'));
});

test('the command writes facts.json and facts.md, and fails with exit code 1 and a message', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-ingest-'));
  try {
    const stdout = execFileSync(process.execPath, [cli, 'ingest', fixture('2026Q3.xlsx'), '--out', out], { encoding: 'utf8' });
    assert.match(stdout, /已擷取 1 個檔案、3 個工作表、表格或頁、50 個儲存格/);
    const written = JSON.parse(fs.readFileSync(path.join(out, 'facts.json'), 'utf8'));
    assert.deepEqual(written.facts, facts.facts);
    assert.equal(fs.readFileSync(path.join(out, 'facts.md'), 'utf8'), factsToMarkdown(written));

    const bad = spawnSync(process.execPath, [cli, 'ingest', fixture('no-cached-values.xlsx'), '--out', path.join(out, 'x')], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /^錯誤：/);
    assert.equal(fs.existsSync(path.join(out, 'x', 'facts.json')), false);
    assert.equal(spawnSync(process.execPath, [cli, 'nope'], { encoding: 'utf8' }).status, 2);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
