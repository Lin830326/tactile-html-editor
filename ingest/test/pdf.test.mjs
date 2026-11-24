import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fillReport } from '../src/fill.mjs';
import { buildFacts, IngestError, kindNote, kindOf, prepareSources } from '../src/ingest.mjs';
import { factsToMarkdown } from '../src/markdown.mjs';
import { linesOf, readPdf } from '../src/pdf.mjs';
import { indexFacts, overview, readRange } from '../src/query.mjs';
import { verifyReport } from '../src/verify.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const cli = path.join(root, 'bin', 'tactile-ingest.mjs');
const pdf = path.join(here, 'fixtures', '2026Q3.pdf');
const bytes = fs.readFileSync(pdf);
const [source] = await prepareSources([{ name: pdf, bytes }]);
const facts = buildFacts([source]);
const byId = new Map(facts.facts.map((f) => [f.id, f]));
const get = (addr) => byId.get('2026Q3.pdf/' + addr);
const draft = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'pdf-draft.html'), 'utf8');
const rulesText = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'pdf-rules.yaml'), 'utf8');

/**
 * A PDF written by hand: pages = [{ops, rotate}], ops being the content stream. Fonts: /F1 is Helvetica, which the
 * file does not embed.
 */
function pdfOf(pages) {
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalog = add('');
  const tree = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = pages.map((p) => {
    const stream = add('<< /Length ' + Buffer.byteLength(p.ops) + ' >>\nstream\n' + p.ops + '\nendstream');
    return add('<< /Type /Page /Parent ' + tree + ' 0 R /MediaBox [0 0 612 792]' + (p.rotate ? ' /Rotate ' + p.rotate : '') +
      ' /Resources << /Font << /F1 ' + font + ' 0 R >> >> /Contents ' + stream + ' 0 R >>');
  });
  objects[catalog - 1] = '<< /Type /Catalog /Pages ' + tree + ' 0 R >>';
  objects[tree - 1] = '<< /Type /Pages /Count ' + kids.length + ' /Kids [' + kids.map((k) => k + ' 0 R').join(' ') + '] >>';
  let out = '%PDF-1.4\n';
  const at = [];
  objects.forEach((body, i) => { at.push(Buffer.byteLength(out)); out += (i + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = Buffer.byteLength(out);
  out += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + at.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  out += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalog + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}
const text = (size, x, y, s) => 'BT /F1 ' + size + ' Tf ' + x + ' ' + y + ' Td (' + s + ') Tj ET';

test('items become lines by their baseline and pieces by the gaps between them', () => {
  const it = (str, x, y, width, em = 12) => ({ str, x, y, width, em });
  // Two lines; in the second, a gap of 6 is a space and a gap of 40 parts two pieces.
  assert.deepEqual(linesOf([
    it('Total', 72, 120, 30), it('1,200', 200, 120.4, 30),
    it('Revenue', 72, 100, 45), it('for', 123, 100, 15), it('Q3', 144, 100, 14), it('482,000', 200, 100, 43),
    it('   ', 60, 100, 9),
  ]), [['Revenue for Q3', '482,000'], ['Total', '1,200']]);
  // Items that touch are one word: a number drawn digit group by digit group stays one number.
  assert.deepEqual(linesOf([it('482,', 72, 100, 24), it('000', 96, 100, 20)]), [['482,000']]);
  // A footnote mark is smaller and raised: it must not become the last digit.
  assert.deepEqual(linesOf([it('482,000', 72, 100, 43), it('1', 115, 96, 4.4, 8)]), [['482,000 1']]);
  // The same text drawn twice, a little apart (bold made by overprinting), is not one longer number.
  assert.deepEqual(linesOf([it('482', 72, 100, 20), it('482', 72.4, 100, 20)]), [['482 482']]);
  // Columns closer than 2 em stay one piece, which is then text and not 2 numbers.
  assert.deepEqual(linesOf([it('120', 72, 100, 20), it('131', 110, 100, 20)]), [['120 131']]);
  // A Kangxi radical is written as the character it stands for.
  assert.deepEqual(linesOf([it('⾏⽇', 72, 100, 24)]), [['行日']]);
  assert.deepEqual(linesOf([]), []);
});

test('a PDF saved by Word: lines, pieces and the numbers in the text', () => {
  assert.equal(facts.sources.length, 1);
  assert.equal(facts.sources[0].file, '2026Q3.pdf');
  assert.deepEqual(facts.sources[0].sheets, [
    { name: 'p1', range: 'A1:D19', hidden: false },
    { name: 'p1n', range: 'A1:C19', hidden: false },
  ]);
  assert.equal(facts.facts.length, 59);
  assert.deepEqual(get('p1/A1'), { id: '2026Q3.pdf/p1/A1', type: 'text', value: '雲朵物流 2026 第三季營運摘要', text: '雲朵物流 2026 第三季營運摘要' });
  assert.deepEqual(get('p1/D10'), { id: '2026Q3.pdf/p1/D10', type: 'number', value: 482000000, text: '482,000,000', labels: { row: '營業收入合計', col: '2026 Q3' } });
  assert.equal(get('p1/B14').value, -398765432);
  assert.equal(get('p1/B15').value, 0.069);
  assert.equal(get('p1/B16').type, 'text');
  assert.equal(get('p1/B16').value, '4.82 億');
  assert.equal(get('p1/B17').value, 31.5);
  assert.equal(get('p1/B18').value, -2.5);
  // A line the page wraps is 2 lines: a PDF does not store paragraphs.
  assert.equal(get('p1/A3').value, '1,204 件。');
  // The numbers inside a line of text, with the line as their heading.
  assert.deepEqual(get('p1n/A2'), { id: '2026Q3.pdf/p1n/A2', type: 'number', value: 482000000, text: '482,000,000',
    labels: { row: '第三季營業收入 482,000,000 元，比上一季成長 6.9%。準時率 96.8%，客訴' } });
  assert.equal(get('p1n/B2').value, 0.069);
  assert.equal(get('p1n/C2').value, 0.968);
  assert.equal(get('p1n/A3').value, 1204);
  assert.equal(get('p1n/A19').value, 1900000000);
  // A piece that is a number is in the grid only.
  assert.equal(get('p1n/A6'), undefined);
});

test('reading the same PDF again gives the same facts', async () => {
  const again = await readPdf(bytes, '2026Q3.pdf');
  assert.deepEqual(again.facts, facts.facts);
  assert.deepEqual(again.source, facts.sources[0]);
});

test('pages are numbered from 1, a turned page is read upright, and a mark of another size is kept apart', async () => {
  const made = pdfOf([
    { ops: [text(12, 72, 700, 'Revenue'), text(12, 300, 700, '1,200'), text(12, 72, 650, '482,000'), text(8, 115.4, 654, '1')].join('\n') },
    { ops: '' },
    // On a page turned 90 degrees, text drawn sideways is what a reader sees upright.
    { rotate: 90, ops: 'BT /F1 12 Tf 0 1 -1 0 300 72 Tm (Total) Tj ET\nBT /F1 12 Tf 0 1 -1 0 300 300 Tm (\\(300\\)) Tj ET\n' + text(12, 72, 400, 'sideways') },
  ]);
  const read = await readPdf(made, 'made.pdf');
  const cells = new Map(read.facts.map((f) => [f.id.slice('made.pdf/'.length), f]));
  assert.deepEqual(read.source.sheets.map((s) => s.name), ['p1', 'p1n', 'p3']);
  assert.equal(cells.get('p1/A1').value, 'Revenue');
  assert.equal(cells.get('p1/B1').value, 1200);
  assert.equal(cells.get('p1/A2').type, 'text');
  assert.equal(cells.get('p1/A2').value, '482,000 1');
  // The figure can still be cited, as a number that stands in text.
  assert.equal(cells.get('p1n/A2').value, 482000);
  assert.equal(cells.get('p3/A1').value, 'Total');
  assert.equal(cells.get('p3/B1').value, -300);
  // Text that runs up the upright page has no line here.
  assert.ok(![...cells.values()].some((f) => f.value === 'sideways'));
});

test('what is not a readable PDF is refused with what to do', async () => {
  await assert.rejects(readPdf(Buffer.from('plain text'), 'a.pdf'), (e) => e instanceof IngestError && /不是 PDF 格式/.test(e.message));
  await assert.rejects(readPdf(Buffer.from('%PDF-1.4\nnothing that follows is a PDF'), 'a.pdf'), (e) => e instanceof IngestError && /不是有效的 PDF 檔案/.test(e.message));
  // Pages with no text: a scan.
  await assert.rejects(readPdf(pdfOf([{ ops: '' }]), 'scan.pdf'), (e) => e instanceof IngestError && /沒有文字.*文字辨識/.test(e.message));
  // Through the usual path the same error comes out of buildFacts.
  const bad = await prepareSources([{ name: 'a.pdf', bytes: Buffer.from('plain text') }]);
  assert.throws(() => buildFacts(bad), (e) => e instanceof IngestError && /不是 PDF 格式/.test(e.message));
  // A PDF that did not go through prepareSources is a mistake in the calling program, not in the input.
  assert.throws(() => buildFacts([{ name: 'a.pdf', bytes }]), (e) => !(e instanceof IngestError) && /prepareSources/.test(e.message));
  assert.throws(() => buildFacts([{ name: 'a.csv', bytes }]), /不是 \.xlsx、\.docx 或 \.pdf 檔案。只支援這 3 種/);
  assert.equal(kindOf('報告.PDF'), 'pdf');
  assert.match(kindNote('a.pdf'), /^PDF 只儲存文字與座標/);
});

test('facts.md and the MCP answers say that a PDF stores no tables', () => {
  const md = factsToMarkdown(facts);
  assert.match(md, /^# 2026Q3\.pdf\n\nPDF 只儲存文字與座標，沒有儲存表格。/);
  assert.match(md, /\| 10 \| 營業收入合計 \| 420,000,000 \| 451,000,000 \| 482,000,000 \|/);
  const ix = indexFacts(facts);
  assert.match(overview(ix), /- PDF 只儲存文字與座標/);
  assert.match(readRange(ix, { sheet: 'p1', range: 'A10:D10' }), /\| 10 \| 營業收入合計 \| 420,000,000 \| 451,000,000 \| 482,000,000 \|/);
});

test('a report from a PDF fills, passes 3 levels, and carries the note', async () => {
  const filled = fillReport(draft, facts, { rulesText });
  assert.equal(filled.filled, 6);
  assert.equal(filled.charts, 1);
  assert.deepEqual(filled.rules.map((r) => r.result), ['pass', 'pass']);
  assert.match(filled.html, /約 <span[^>]*>4\.82<\/span> 億元/);
  const stamp = (html) => html.replace(/"(filledAt|createdAt)":\s*"[^"]*"/g, '"$1":""');
  assert.equal(stamp(filled.html), stamp(fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'pdf-report.html'), 'utf8')));

  const r = verifyReport(filled.html, { sources: [source], rulesText });
  assert.deepEqual(r.levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.notes.length, 1);
  assert.match(r.notes[0], /^「2026Q3\.pdf」：PDF 只儲存文字與座標.*第 3 級只表示重新解析的結果相同。$/);

  // Another PDF under the same name: levels 2 and 3 fail.
  const other = await prepareSources([{ name: '2026Q3.pdf', bytes: pdfOf([{ ops: text(12, 72, 700, 'Revenue') }]) }]);
  const bad = verifyReport(filled.html, { sources: other });
  assert.equal(bad.levels[2], 'fail');
  assert.equal(bad.levels[3], 'fail');
  // A file that is no PDF at all is a problem in the result, not a crash.
  const broken = await prepareSources([{ name: '2026Q3.pdf', bytes: Buffer.from('plain text') }]);
  assert.ok(verifyReport(filled.html, { sources: broken }).problems.some((p) => /不是 PDF 格式/.test(p)));
});

test('the command reads a PDF beside a workbook, and verify prints the note', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-pdf-'));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  try {
    const both = run('ingest', pdf, path.join(here, 'fixtures', '2026Q3.xlsx'), '--out', dir);
    assert.equal(both.status, 0, both.stderr);
    assert.equal(both.stderr, '');
    assert.match(both.stdout, /已擷取 2 個檔案、5 個工作表、表格或頁/);
    const report = path.join(dir, 'report.html');
    assert.equal(run('fill', path.join(root, 'examples', 'zh-hant', 'pdf-draft.html'), '--facts', path.join(dir, 'facts.json'), '--out', report).status, 0);
    const v = run('verify', report, '--source', pdf, '--strict');
    assert.equal(v.status, 0, v.stdout);
    assert.match(v.stdout, /說明 1 個：\n- 「2026Q3\.pdf」：PDF 只儲存文字與座標/);
    assert.match(v.stdout, /結果：通過。做到第 3 級/);
    const scan = path.join(dir, 'scan.pdf');
    fs.writeFileSync(scan, pdfOf([{ ops: '' }]));
    const refused = run('ingest', scan, '--out', dir);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /錯誤：「scan\.pdf」沒有文字/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
