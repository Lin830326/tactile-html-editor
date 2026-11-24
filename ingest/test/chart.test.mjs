import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';
import { drawChart, readChart, reportLang } from '../src/chart.mjs';
import { SpecError } from '../src/decimal.mjs';
import { FillError, fillReport, scanReport } from '../src/fill.mjs';
import { buildFacts } from '../src/ingest.mjs';
import { verifyReport } from '../src/verify.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const xlsx = path.join(here, 'fixtures', '2026Q3.xlsx');
const source = { name: xlsx, bytes: fs.readFileSync(xlsx) };
const facts = buildFacts([source]);
const byId = new Map(facts.facts.map((f) => [f.id, f]));
const P = '2026Q3.xlsx/損益表/';
const draft = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'charts-draft.html'), 'utf8');

const reader = (o) => (name) => o[name];
const chart = (o, f = byId) => readChart(reader(o), f);
const page = (body) => '<!doctype html>\n<html><head><meta charset="utf-8"><title>t</title></head>\n<body>\n' + body + '\n</body>\n</html>\n';
const div = (a) => '<div ' + Object.entries(a).map(([k, v]) => k + '="' + v + '"').join(' ') + '></div>';
const BAR = { 'data-chart': 'bar', 'data-chart-facts': P + 'D10:D13', 'data-chart-labels': P + 'A10:A13', 'data-chart-scale': '1e-6', 'data-chart-digits': '1' };
const problems = (fn) => { try { fn(); } catch (err) { assert.ok(err instanceof FillError, String(err)); return err.problems; } assert.fail('no error'); };
const says = (o, part) => assert.throws(() => chart(o), (err) => err instanceof SpecError && err.message.includes(part), part);

/** Every element of a drawing, flat: [{tag, attrs: {name: value}, text}]. */
function elements(svg) {
  const out = [];
  const walk = (n) => {
    for (const c of n.childNodes || []) {
      if (!c.tagName) continue;
      out.push({ tag: c.tagName, attrs: Object.fromEntries(c.attrs.map((a) => [a.name, a.value])), text: (c.childNodes || []).filter((t) => t.nodeName === '#text').map((t) => t.value).join('') });
      walk(c);
    }
  };
  walk(parseFragment(svg));
  return out;
}
/** The top (data end) and the baseline of a bar, read back from its path. */
function barEnds(d) {
  const m = /^M[\d.]+ ([\d.]+)V[\d.]+Q[\d.]+ ([\d.]+) /.exec(d);
  return { base: Number(m[1]), top: Number(m[2]) };
}

test('a bar chart: one bar per value, heights in proportion, and each number written as a cited number', () => {
  const svg = drawChart(chart(BAR));
  const els = elements(svg);
  const bars = els.filter((e) => e.tag === 'path' && e.attrs['data-chart-fact']);
  assert.deepEqual(bars.map((b) => b.attrs['data-chart-fact']), ['D10', 'D11', 'D12', 'D13'].map((c) => P + c));
  const h = bars.map((b) => { const e = barEnds(b.attrs.d); return e.base - e.top; });
  const v = ['D10', 'D11', 'D12', 'D13'].map((c) => byId.get(P + c).value);
  for (let i = 1; i < 4; i++) assert.ok(Math.abs(h[i] / h[0] - v[i] / v[0]) < 0.002, 'bar ' + i);

  const values = els.filter((e) => e.tag === 'text' && e.attrs['data-fact-scale']);
  assert.deepEqual(values.map((t) => t.text), ['142.0', '236.0', '71.0', '33.0']);
  assert.deepEqual(values.map((t) => t.attrs['data-fact']), bars.map((b) => b.attrs['data-chart-fact']));
  assert.equal(values[0].attrs['data-fact-digits'], '1');
  const labels = els.filter((e) => e.tag === 'text' && e.attrs['data-fact'] && !e.attrs['data-fact-scale']);
  assert.deepEqual(labels.map((t) => t.text), ['倉儲服務', '配送服務', '加值服務', '其他']);
  assert.deepEqual(labels.map((t) => t.attrs['data-fact']), ['A10', 'A11', 'A12', 'A13'].map((c) => P + c));
  // The axis runs from 0 in round steps and covers the largest value.
  const ticks = els.filter((e) => e.tag === 'text' && !e.attrs['data-fact']).map((t) => t.text);
  assert.deepEqual(ticks, ['0', '50', '100', '150', '200', '250']);
  assert.equal(els.filter((e) => e.tag === 'title')[1].text, '配送服務：236.0');
  // The same input gives the same text.
  assert.equal(drawChart(chart(BAR)), svg);
});

test('several series: a legend with the names, one colour per series, and no number on every bar', () => {
  const svg = drawChart(chart({
    'data-chart': 'bar', 'data-chart-facts': P + 'B10:B13 | ' + P + 'C10:C13 | ' + P + 'D10:D13',
    'data-chart-labels': P + 'A10:A13', 'data-chart-series': P + 'B9:D9', 'data-chart-scale': '1e-6',
  }));
  const els = elements(svg);
  const bars = els.filter((e) => e.tag === 'path' && e.attrs['data-chart-fact']);
  assert.equal(bars.length, 12);
  assert.equal(new Set(bars.map((b) => b.attrs.fill)).size, 3);
  assert.equal(bars[0].attrs.fill, bars[1].attrs.fill);
  assert.deepEqual(els.filter((e) => e.tag === 'text' && /^2026 Q/.test(e.text)).map((t) => t.text), ['2026 Q1', '2026 Q2', '2026 Q3']);
  assert.equal(els.filter((e) => e.attrs['data-fact-scale']).length, 0);
  assert.ok(els.some((e) => e.tag === 'title' && e.text === '2026 Q3，配送服務：236'));
});

test('a line chart puts one point per value, and a negative value falls below the zero line', () => {
  const line = drawChart(chart({ 'data-chart': 'line', 'data-chart-facts': P + 'B14:D14', 'data-chart-labels': P + 'B9:D9', 'data-chart-scale': '1e-8', 'data-chart-digits': '2' }));
  const pts = elements(line).filter((e) => e.tag === 'circle');
  assert.deepEqual(pts.map((p) => p.attrs['data-chart-fact']), ['B14', 'C14', 'D14'].map((c) => P + c));
  assert.ok(Number(pts[0].attrs.cy) > Number(pts[1].attrs.cy) && Number(pts[1].attrs.cy) > Number(pts[2].attrs.cy));
  assert.deepEqual(elements(line).filter((e) => e.attrs['data-fact-scale']).map((t) => t.text), ['4.20', '4.51', '4.82']);

  const mixed = elements(drawChart(chart({ 'data-chart': 'bar', 'data-chart-facts': P + 'D14; ' + P + 'D16', 'data-chart-labels': P + 'A14; ' + P + 'A16', 'data-chart-scale': '1e-6' })));
  const [up, down] = mixed.filter((e) => e.tag === 'path' && e.attrs['data-chart-fact']).map((b) => barEnds(b.attrs.d));
  assert.equal(up.base, down.base);
  assert.ok(up.top < up.base && down.top > down.base);
  assert.ok(mixed.some((e) => e.tag === 'text' && e.text === '-400'));
});

test('a pie chart: the slices close the circle and each takes its share', () => {
  const svg = drawChart(chart({ ...BAR, 'data-chart': 'pie' }));
  const slices = elements(svg).filter((e) => e.tag === 'path');
  assert.equal(slices.length, 4);
  const ends = slices.map((s) => /^M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)A\d+ \d+ 0 ([01]) 1 ([\d.]+) ([\d.]+)Z$/.exec(s.attrs.d).slice(1).map(Number));
  // Each slice starts where the one before ended, and the last ends where the first began (the top).
  for (let i = 1; i < 4; i++) assert.deepEqual([ends[i][2], ends[i][3]], [ends[i - 1][5], ends[i - 1][6]]);
  assert.deepEqual([ends[3][5], ends[3][6]], [ends[0][2], ends[0][3]]);
  // 236 of 482 is the only share under half that is close to it; none is over half here.
  assert.deepEqual(ends.map((e) => e[4]), [0, 0, 0, 0]);
  assert.deepEqual(elements(svg).filter((e) => e.attrs['data-fact-scale']).map((t) => t.text), ['142.0', '236.0', '71.0', '33.0']);

  const whole = { a: { type: 'number', value: 5, text: '5' }, b: { type: 'number', value: 0, text: '0' }, x: { type: 'text', value: 'A', text: 'A' }, y: { type: 'text', value: 'B', text: 'B' } };
  const one = elements(drawChart(chart({ 'data-chart': 'pie', 'data-chart-facts': 'a; b', 'data-chart-labels': 'x; y' }, whole)));
  assert.equal(one.filter((e) => e.tag === 'circle').length, 1);
  assert.equal(one.filter((e) => e.tag === 'path').length, 0);
});

test('a label too long for its place is shortened and then no longer cites its cell', () => {
  const f = { v: { type: 'number', value: 1, text: '1' }, w: { type: 'number', value: 2, text: '2' } };
  const ids = [];
  for (let i = 0; i < 12; i++) { f['l' + i] = { type: 'text', value: 'x', text: '這是一個非常非常長的項目名稱' + i }; f['n' + i] = { type: 'number', value: i, text: String(i) }; ids.push(i); }
  const els = elements(drawChart(chart({ 'data-chart': 'bar', 'data-chart-facts': ids.map((i) => 'n' + i).join(';'), 'data-chart-labels': ids.map((i) => 'l' + i).join(';') }, f)));
  const cut = els.filter((e) => e.tag === 'text' && e.text.endsWith('…'));
  assert.equal(cut.length, 12);
  assert.ok(cut.every((t) => t.attrs['data-fact'] === undefined));
  assert.ok(els.some((e) => e.tag === 'title' && e.text === '這是一個非常非常長的項目名稱3：3'));
});

test('text from the source cannot become markup in the drawing', () => {
  const f = { v: { type: 'number', value: 1, text: '1' }, l: { type: 'text', value: 'x', text: '</text><script>alert(1)</script>"&' } };
  const svg = drawChart(chart({ 'data-chart': 'bar', 'data-chart-facts': 'v', 'data-chart-labels': 'l' }, f));
  assert.ok(!svg.includes('<script'));
  assert.equal(elements(svg).filter((e) => e.tag === 'script').length, 0);
  assert.ok(elements(svg).some((e) => e.tag === 'title' && e.text === '</text><script>alert(1)</script>"&：1'));
});

test('a chart that cannot be drawn is refused with the reason', () => {
  says({ ...BAR, 'data-chart': 'radar' }, '只支援 bar、line、pie');
  says({ 'data-chart': 'bar', 'data-chart-labels': P + 'A10:A13' }, '缺少 data-chart-facts');
  says({ 'data-chart': 'bar', 'data-chart-facts': P + 'D10:D13' }, '缺少 data-chart-labels');
  says({ ...BAR, 'data-chart-labels': P + 'A10:A12' }, '3 個標籤，但每組數列有 4 個值');
  says({ ...BAR, 'data-chart-facts': P + 'D10:D13 | ' + P + 'C10:C12', 'data-chart-series': P + 'C9:D9' }, '相同數量');
  says({ ...BAR, 'data-chart-facts': P + 'D10:D13 | ' + P + 'C10:C13' }, 'data-chart-series 必須給 2 個名稱');
  says({ ...BAR, 'data-chart-facts': P + 'Z99', 'data-chart-labels': P + 'A10' }, 'Z99 不在來源資料裡');
  says({ ...BAR, 'data-chart-facts': P + 'X1:X4' }, '裡沒有任何值');
  says({ ...BAR, 'data-chart-facts': P + 'A10:A13' }, '不是 number');
  says({ ...BAR, 'data-chart-scale': '-1' }, 'data-chart-scale');
  says({ ...BAR, 'data-chart-digits': '11' }, 'data-chart-digits');
  says({ ...BAR, 'data-chart': 'pie', 'data-chart-facts': P + 'D10:D13 | ' + P + 'C10:C13', 'data-chart-series': P + 'C9:D9' }, '只能有 1 組數列');
  says({ 'data-chart': 'pie', 'data-chart-facts': P + 'D14; ' + P + 'D16', 'data-chart-labels': P + 'A14; ' + P + 'A16' }, '不可是負數');
  says({ ...BAR, 'data-chart-facts': Array(25).fill(P + 'D10').join(';'), 'data-chart-labels': Array(25).fill(P + 'A10').join(';') }, '上限是 24');
});

test('fill draws every chart of the draft, keeps what the charts read in the block, and a second fill changes nothing', () => {
  const now = new Date('2026-11-12T01:00:00Z');
  const first = fillReport(draft, facts, { now });
  assert.equal(first.charts, 4);
  assert.deepEqual(first.warnings, []);
  const scan = scanReport(first.html);
  assert.equal(scan.charts.length, 4);
  assert.deepEqual(scan.cited, []);
  for (const id of ['A10', 'B9', 'B10', 'C13', 'D14']) assert.ok(first.block.facts[P + id], id);
  assert.equal(first.block.facts[P + 'D16'], undefined);
  assert.equal(fillReport(first.html, facts, { now }).html, first.html);
  // The example in the repository is this report, apart from the time it was filled.
  const example = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'charts.html'), 'utf8');
  const noTime = (s) => s.replace(/"filledAt": "[^"]*"/, '');
  assert.equal(noTime(example.replace(/\r\n/g, '\n')), noTime(first.html.replace(/\r\n/g, '\n')));
});

test('fill refuses a chart element with content of its own, and names the line of a chart it cannot draw', () => {
  const full = problems(() => fillReport(page('<div data-chart="bar" data-chart-facts="' + P + 'D10" data-chart-labels="' + P + 'A10"><p>說明</p></div>'), facts));
  assert.match(full[0], /第 4 行.*必須是空的/);
  const bad = problems(() => fillReport(page(div({ ...BAR, 'data-chart-labels': P + 'A10:A11' })), facts));
  assert.match(bad[0], /第 4 行的 <div data-chart="bar">：.*2 個標籤/);
  const both = problems(() => fillReport(page(div({ ...BAR, 'data-fact': P + 'D10' })), facts));
  assert.match(both[0], /不可同時有 data-chart 與 data-fact/);
});

test('verify draws each chart again: a moved bar, a changed number and a changed attribute are all found', () => {
  const report = fillReport(draft, facts).html;
  const ok = verifyReport(report, { sources: [source] });
  assert.deepEqual(ok.levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
  assert.equal(ok.counts.charts, 4);
  assert.equal(ok.counts.chartsBad, 0);
  assert.deepEqual(ok.problems, []);

  // White space and attribute order do not matter; what is drawn does.
  const loose = report.replace(/<svg xmlns="([^"]*)" viewBox="([^"]*)"/, '<svg viewBox="$2"   xmlns="$1"').replace(/<\/svg>\n<\/div>/, '</svg>\n\n   </div>');
  assert.notEqual(loose, report);
  assert.equal(verifyReport(loose).ok, true);

  const taller = report.replace(/(<path d="M[\d.]+ [\d.]+V)([\d.]+)/, (m, head, y) => head + (Number(y) - 40));
  assert.notEqual(taller, report);
  const r1 = verifyReport(taller);
  assert.equal(r1.levels[1], 'fail');
  assert.equal(r1.counts.chartsBad, 1);
  assert.ok(r1.problems.some((p) => /第 \d+ 行的 <div data-chart="bar">：圖表與來源值畫出的圖不同/.test(p)));

  const number = verifyReport(report.replace('>236.0</text>', '>263.0</text>'));
  assert.equal(number.counts.chartsBad, 1);
  const attr = verifyReport(report.replace('data-chart-scale="1e-8"', 'data-chart-scale="1e-7"'));
  assert.equal(attr.counts.chartsBad, 1);
  const gone = verifyReport(report.replace(/<svg[^]*?<\/svg>/, ''));
  assert.equal(gone.counts.chartsBad, 1);

  // The value in the block and the whole drawing changed to agree: only the source file can tell.
  const forgedFacts = { ...facts, facts: facts.facts.map((f) => (f.id === P + 'D10' ? { ...f, value: 242000000, text: '242,000,000' } : f)) };
  const forged = fillReport(draft, forgedFacts).html;
  assert.equal(verifyReport(forged).ok, true);
  const r2 = verifyReport(forged, { sources: [source] });
  assert.equal(r2.levels[1], 'pass');
  assert.equal(r2.levels[3], 'fail');
  assert.ok(r2.problems.some((p) => p.includes(P + 'D10 的 value')));
});

test('the words of a chart follow the language of the report, and Chinese stays what it was', () => {
  const zh = drawChart(chart(BAR));
  assert.equal(drawChart(chart(BAR), ''), zh);
  assert.equal(drawChart(chart(BAR), 'zh-Hant'), zh);
  assert.match(zh, /aria-label="長條圖"/);
  const en = drawChart(chart(BAR), 'en');
  assert.match(en, /aria-label="Bar chart"/);
  assert.ok(!en.includes('長條圖') && !/<title>[^<]*[，：][^<]*<\/title>/.test(en) && /<title>[^<]+: [^<]+<\/title>/.test(en));
  assert.match(drawChart(chart({ ...BAR, 'data-chart': 'pie' }), 'en-GB'), /aria-label="Pie chart"/);
  assert.match(drawChart(chart(BAR), 'zh-Hans'), /aria-label="柱状图"/);
  assert.match(drawChart(chart({ ...BAR, 'data-chart': 'pie' }), 'zh-CN'), /aria-label="饼图"/);
  // Only the words differ: the same marks at the same places.
  assert.equal(en.replace(/<title>[^<]*<\/title>/g, '').replace('Bar chart', ''), zh.replace(/<title>[^<]*<\/title>/g, '').replace('長條圖', ''));
  assert.equal(reportLang('<!doctype html><html lang="en"><head>'), 'en');
  assert.equal(reportLang("<html class=x lang='zh-Hant'>"), 'zh-Hant');
  assert.equal(reportLang('<html data-lang="en"><body lang="en">'), '');
});
