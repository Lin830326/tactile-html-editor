import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse as parseHtml } from 'parse5';
import { dec, format, readShow, shownText, SpecError } from '../src/decimal.mjs';
import { FillError, fillReport, scanReport } from '../src/fill.mjs';
import { buildFacts } from '../src/ingest.mjs';
import { expandRules, parseRules, runRule } from '../src/rules.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const cli = path.join(root, 'bin', 'tactile-ingest.mjs');
const xlsx = path.join(here, 'fixtures', '2026Q3.xlsx');
const facts = buildFacts([{ name: xlsx, bytes: fs.readFileSync(xlsx) }]);
const byId = new Map(facts.facts.map((f) => [f.id, f]));
const draft = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'report-draft.html'), 'utf8');
const rulesText = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'rules.yaml'), 'utf8');
const now = new Date('2026-11-11T03:45:00Z');
const P = '2026Q3.xlsx/損益表/';

const page = (body) => '<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><title>t 2026</title></head>\n<body>\n' + body + '\n</body>\n</html>\n';
const blockOf = (html) => {
  const scan = scanReport(html);
  return JSON.parse(scan.block.childNodes[0].value);
};
const problems = (fn) => { try { fn(); } catch (err) { assert.ok(err instanceof FillError, String(err)); return err.problems; } assert.fail('no error'); };

test('the shown text follows the spec table, digit for digit', () => {
  const show = (value, attrs) => shownText({ type: 'number', value, text: 'T' }, readShow(attrs));
  assert.equal(show(482000000, { scale: '1e-8', digits: '2' }), '4.82');
  assert.equal(show(0.1065, { scale: '100', digits: '1' }), '10.7');
  assert.equal(show(1234567.5, { digits: '0' }), '1,234,568');
  assert.equal(show(-0.004, { digits: '2' }), '0.00');
  // Half goes away from zero, in decimal: the double nearest 2.675 is below it, its shortest text is not.
  assert.equal(show(2.675, { digits: '2' }), '2.68');
  assert.equal(show(-1234.5, { digits: '0' }), '-1,235');
  assert.equal(show(0.107, { scale: '100', digits: '1', sign: 'always' }), '+10.7');
  assert.equal(show(1234567, { digits: '0', group: 'off' }), '1234567');
  assert.equal(show(1e21, { scale: '1', group: 'off' }), '1000000000000000000000');
  // Without scale or digits the text is the source's own, whatever the type.
  assert.equal(show(5, {}), 'T');
  assert.equal(shownText({ type: 'date', value: '2026-09-30', text: '2026-09-30' }, readShow({})), '2026-09-30');
  assert.equal(format(dec('0.5'), { digits: 0 }), '1');
  assert.equal(format(dec('-0.5'), { digits: 0 }), '-1');
});

test('display attributes outside the rules are refused by name', () => {
  for (const [attrs, name] of [
    [{ scale: '0' }, 'data-fact-scale'], [{ scale: '-1' }, 'data-fact-scale'], [{ scale: 'abc' }, 'data-fact-scale'],
    [{ digits: '11' }, 'data-fact-digits'], [{ digits: '1.5' }, 'data-fact-digits'], [{ digits: '-1' }, 'data-fact-digits'],
    [{ group: 'yes' }, 'data-fact-group'], [{ sign: 'plus' }, 'data-fact-sign'],
  ]) {
    assert.throws(() => readShow(attrs), (err) => err instanceof SpecError && err.message.includes(name), JSON.stringify(attrs));
  }
  assert.throws(() => shownText({ type: 'text', value: 'x', text: 'x' }, readShow({ digits: '1' })), /不是 number/);
});

test('the example draft is filled from the source, and nothing else in the file changes', () => {
  const out = fillReport(draft, facts, { rulesText, now });
  assert.equal(out.filled, 9);
  assert.deepEqual(out.warnings, []);
  const text = (id, n = 0) => {
    const hits = scanReport(out.html).cited.filter((c) => c.id === id);
    return hits[n].el.childNodes.map((x) => x.value).join('');
  };
  assert.equal(text(P + 'B2'), '2026-09-30');
  assert.equal(text(P + 'D14'), '4.82');
  assert.equal(text(P + 'D14', 1), '482.0');
  assert.equal(text(P + 'D15'), '+6.9');
  assert.equal(text(P + 'D20'), '96.8%');
  assert.equal(text(P + 'D11'), '236.0');
  // Taking the numbers and the block back out gives the draft, byte for byte.
  const scan = scanReport(out.html);
  let back = out.html;
  const cuts = scan.cited.map((c) => [c.el.sourceCodeLocation.startTag.endOffset, c.el.sourceCodeLocation.endTag.startOffset]);
  cuts.push([scan.block.sourceCodeLocation.startOffset, scan.block.sourceCodeLocation.endOffset + 1]);
  for (const [a, b] of cuts.sort((x, y) => y[0] - x[0])) back = back.slice(0, a) + back.slice(b);
  assert.equal(back, draft);
});

test('the block holds what the report uses and no more, and reads back as JSON', () => {
  const out = fillReport(draft, facts, { rulesText, now });
  const block = blockOf(out.html);
  assert.equal(block.tactileProvenance, 1);
  assert.equal(block.filledAt, '2026-11-11T03:45:00Z');
  assert.deepEqual(block.sources, [{ file: '2026Q3.xlsx', sha256: facts.sources[0].sha256, bytes: facts.sources[0].bytes }]);
  // Cited: B2 D10 D11 D12 D13 D14 D15 D20. From the rules: 摘要/B3.
  assert.deepEqual(Object.keys(block.facts).sort(), [
    P + 'B2', P + 'D10', P + 'D11', P + 'D12', P + 'D13', P + 'D14', P + 'D15', P + 'D20', '2026Q3.xlsx/摘要/B3',
  ].sort());
  assert.deepEqual(block.facts[P + 'D14'], {
    type: 'number', value: 482000000, text: '482,000,000', formula: 'SUM(D10:D13)', labels: { row: '營業收入合計', col: '2026 Q3' },
  });
  assert.equal(block.rules.sha256, createHash('sha256').update(rulesText).digest('hex'));
  assert.equal(block.rules.approvedBy, '林雅婷');
  assert.equal(block.rules.approvedOn, '2026-11-10');
  // The range is written out; no result is stored.
  assert.deepEqual(block.rules.items[0], {
    id: '營收合計', type: 'sum', total: P + 'D14', parts: [P + 'D10', P + 'D11', P + 'D12', P + 'D13'], tolerance: '0',
  });
  assert.equal(block.rules.items[1].note, '摘要表的營收引用損益表的合計');
  assert.deepEqual(out.rules.map((r) => r.result), ['pass', 'pass']);
  // The page stays one well-formed document with the block last in <body>.
  const doc = parseHtml(out.html);
  const body = doc.childNodes.find((n) => n.tagName === 'html').childNodes.find((n) => n.tagName === 'body');
  const last = body.childNodes.filter((n) => n.tagName).pop();
  assert.equal(last.tagName, 'script');
  assert.equal(last.attrs.find((a) => a.name === 'type').value, 'application/json');
});

test('filling again replaces the block and gives the same file', () => {
  const once = fillReport(draft, facts, { rulesText, now });
  const twice = fillReport(once.html, facts, { rulesText, now });
  assert.equal(twice.html, once.html);
  assert.equal(twice.html.split('id="tactile-provenance"').length, 2);
  assert.deepEqual(twice.warnings, []);
});

test('text from the source cannot become markup, in the page or in the block', () => {
  const evil = {
    tactileFacts: 1,
    sources: [{ file: 'a.xlsx', sha256: 'x', bytes: 1, sheets: [] }],
    facts: [{ id: 'a.xlsx/S/A1', type: 'text', value: '</script><img src=x onerror=alert(1)><!--', text: '</script><img src=x onerror=alert(1)><!-- & "' }],
  };
  const out = fillReport(page('<p data-fact="a.xlsx/S/A1"></p>'), evil, { now });
  assert.ok(!out.html.includes('<img'));
  assert.equal(out.html.split('</script>').length, 2);
  const scan = scanReport(out.html);
  assert.equal(scan.cited[0].el.childNodes[0].value, evil.facts[0].text);
  assert.equal(blockOf(out.html).facts['a.xlsx/S/A1'].value, evil.facts[0].value);
});

test('a draft with errors is not written, and every error is listed with its line', () => {
  const body = [
    '<p><span data-fact="' + P + 'Z99"></span></p>',
    '<p><span data-fact="' + P + 'A14" data-fact-digits="1"></span></p>',
    '<p><span data-fact="' + P + 'D14" data-fact-scale="-2"></span></p>',
    '<p data-fact="' + P + 'D14"><b>482</b></p>',
    '<img data-fact="' + P + 'D14" alt="">',
  ].join('\n');
  const list = problems(() => fillReport(page(body), facts, { now }));
  assert.equal(list.length, 5);
  assert.match(list[0], /^第 4 行.*Z99.*不在 facts\.json/);
  assert.match(list[1], /^第 5 行.*類型是 text/);
  assert.match(list[2], /^第 6 行.*data-fact-scale.*「-2」/);
  assert.match(list[3], /^第 7 行.*不可含子元素/);
  assert.match(list[4], /^第 8 行.*不能有文字內容/);
  assert.deepEqual(problems(() => fillReport(page(''), { tactileFacts: 2, sources: [], facts: [] })), ['facts.json 的格式版本是 2，這支程式只讀得懂版本 1']);
});

test('numbers the AI wrote itself are replaced or reported, never left looking sourced', () => {
  const body = [
    '<p>營收 <span data-fact="' + P + 'D14" data-fact-scale="1e-8" data-fact-digits="2">5.10</span> 億元，成長 12%。</p>',
    '<p data-fact-none="頁碼">第 3 頁</p>',
    '<p>已改 <span data-fact-was="' + P + 'D10" data-fact-digits="0">999</span>，另一個 <span data-fact-was="' + P + 'Z1">7</span></p>',
    '<svg viewBox="0 0 10 10"><text>50</text></svg><style>p{margin:0 4px}</style>',
  ].join('\n');
  const out = fillReport(page(body), facts, { now });
  assert.equal(out.warnings.length, 3);
  assert.match(out.warnings[0], /第 4 行.*原本寫「5\.10」，已改成來源值「4\.82」/);
  assert.match(out.warnings[1], /第 6 行.*data-fact-was.*Z1.*不在 facts\.json/);
  assert.match(out.warnings[2], /第 4 行有無出處的數字：「億元，成長 12%。」/);
  assert.ok(out.html.includes('data-fact-digits="2">4.82</span>'));
  // A number the user changed by hand is left as it is, and its source stays in the block for the editor to show.
  assert.ok(out.html.includes('data-fact-digits="0">999</span>'));
  assert.ok(blockOf(out.html).facts[P + 'D10']);
  // The <title> is not on the page: its digits are not reported.
  assert.ok(!out.warnings.some((w) => w.includes('t 2026')));
});

test('rules: a sum over a range, a tolerance, a violation and a value that cannot be summed', () => {
  const run = (yaml) => expandRules(parseRules('tactileRules: 1\nrules:\n' + yaml), byId).map((item) => runRule(item, byId));
  // D10:D13 hold 142,000,000 + 236,000,000.5 + 71,000,000 + 32,999,999.5 = 482,000,000 exactly.
  assert.deepEqual(run('  - {id: a, type: sum, total: ' + P + 'D14, parts: ' + P + 'D10:D13}'), [
    { id: 'a', result: 'pass', left: '482000000', right: '482000000', diff: '0' },
  ]);
  // Three of the four parts: short by 32,999,999.5, in decimal with no rounding error.
  const short = '[' + ['D10', 'D11', 'D12'].map((c) => P + c).join(', ') + ']';
  assert.deepEqual(run('  - {id: b, type: sum, total: ' + P + 'D14, parts: ' + short + '}'), [
    { id: 'b', result: 'fail', left: '482000000', right: '449000000.5', diff: '32999999.5' },
  ]);
  assert.equal(run('  - {id: c, type: sum, total: ' + P + 'D14, parts: ' + short + ', tolerance: 32999999.5}')[0].result, 'pass');
  assert.equal(run('  - {id: d, type: sum, total: ' + P + 'D14, parts: ' + short + ', tolerance: 32999999.4}')[0].result, 'fail');
  // A range passes over headings and other text: A9:B11 gives the two numbers in it.
  const wide = expandRules(parseRules('tactileRules: 1\nrules:\n  - {id: e, type: sum, total: ' + P + 'D14, parts: ' + P + 'A9:B11}'), byId)[0];
  assert.deepEqual(wide.parts, [P + 'B10', P + 'B11']);
  assert.deepEqual(run('  - {id: f, type: equal, left: ' + P + 'D14, right: ' + P + 'A14}'), [
    { id: 'f', result: 'unknown', why: P + 'A14 的類型是 text，不是 number' },
  ]);
  // An error cell in a range makes the sum unknown instead of being skipped.
  assert.equal(run('  - {id: g, type: sum, total: ' + P + 'D14, parts: ' + P + 'D17:D18}')[0].result, 'unknown');
  // 0.1 + 0.2 = 0.3 here.
  const small = new Map([['a', { type: 'number', value: 0.1 }], ['b', { type: 'number', value: 0.2 }], ['c', { type: 'number', value: 0.3 }]]);
  assert.equal(runRule({ id: 'h', type: 'sum', total: 'c', parts: ['a', 'b'], tolerance: '0' }, small).result, 'pass');
});

test('a rules file with a mistake is refused, naming the rule', () => {
  const bad = (yaml, re) => assert.throws(() => expandRules(parseRules(yaml), byId), (err) => err instanceof SpecError && re.test(err.message), yaml);
  bad('rules: []', /缺少 tactileRules/);
  bad('tactileRules: 2\nrules: []', /只讀得懂版本 1/);
  bad('tactileRules: 1\nrules: {}', /必須是清單/);
  bad('tactileRules: 1\nrules:\n  - {type: sum}', /第 1 條規則缺少 id/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: ratio}', /「a」.*只支援 sum 與 equal/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: equal, left: ' + P + 'D14}', /「a」缺少 right/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: equal, left: ' + P + 'D14, right: ' + P + 'D10:D13}', /不可是範圍/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: equal, left: ' + P + 'D14, right: ' + P + 'D14, tolerance: -1}', /tolerance 必須是 0 或正數/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: equal, left: ' + P + 'D14, right: ' + P + 'Z9}', /「a」引用的 .*Z9 不在 facts\.json/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: sum, total: ' + P + 'D14, parts: ' + P + 'X1:Z5}', /範圍 .* 裡沒有任何值/);
  bad('tactileRules: 1\nrules:\n  - {id: a, type: equal, left: ' + P + 'D14, right: ' + P + 'D14}\n  - {id: a, type: equal, left: ' + P + 'D14, right: ' + P + 'D14}', /出現 2 次/);
  bad('tactileRules: 1\nrules: [', /不是有效的 YAML/);
  // A broken rules file stops the fill.
  assert.match(problems(() => fillReport(draft, facts, { rulesText: 'tactileRules: 1\nrules:\n  - {id: a, type: ratio}', now }))[0], /只支援 sum 與 equal/);
  // A violated rule does not: the report is written and the rule is in the warnings.
  const out = fillReport(draft, facts, { rulesText: 'tactileRules: 1\nrules:\n  - {id: 少一項, type: sum, total: ' + P + 'D14, parts: ' + P + 'D10:D12}', now });
  assert.deepEqual(out.warnings, ['規則「少一項」違反：482000000 與 449000000.5 相差 32999999.5']);
  assert.equal(blockOf(out.html).rules.approvedBy, undefined);
});

test('the command fills a draft, and a draft with errors leaves no file behind', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-fill-'));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  try {
    assert.equal(run('ingest', xlsx, '--out', dir).status, 0);
    const ok = run('fill', path.join(root, 'examples', 'zh-hant', 'report-draft.html'), '--facts', path.join(dir, 'facts.json'), '--rules', path.join(root, 'examples', 'zh-hant', 'rules.yaml'), '--out', path.join(dir, 'report.html'));
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /已填入 9 個數字/);
    assert.match(ok.stdout, /勾稽規則 2 條：通過 2，違反 0，無法計算 0/);
    assert.ok(fs.readFileSync(path.join(dir, 'report.html'), 'utf8').includes('data-fact-digits="2">4.82</span>'));

    fs.writeFileSync(path.join(dir, 'bad.html'), page('<p data-fact="nope/S/A1"></p>'));
    const bad = run('fill', path.join(dir, 'bad.html'), '--facts', path.join(dir, 'facts.json'), '--out', path.join(dir, 'bad-out.html'));
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /錯誤 1 個，沒有寫出報告/);
    assert.equal(fs.existsSync(path.join(dir, 'bad-out.html')), false);
    assert.equal(run('fill', path.join(dir, 'bad.html')).status, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the vectors shared with the editor give the same text and the same rule results here', () => {
  const vectors = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'display-vectors.json'), 'utf8'));
  for (const v of vectors.shown) {
    const run = () => shownText(v.fact, readShow(v.attrs));
    if (v.error) assert.throws(run, SpecError, JSON.stringify(v));
    else assert.equal(run(), v.want, JSON.stringify(v));
  }
  for (const v of vectors.rules) {
    const r = runRule(v.item, v.facts);
    for (const [k, want] of Object.entries(v.want)) assert.equal(r[k], want, v.item.id + ' ' + k);
  }
});
