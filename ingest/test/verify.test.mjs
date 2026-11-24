import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { fillReport } from '../src/fill.mjs';
import { buildFacts } from '../src/ingest.mjs';
import { verifyReport } from '../src/verify.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const cli = path.join(root, 'bin', 'tactile-ingest.mjs');
const xlsx = path.join(here, 'fixtures', '2026Q3.xlsx');
const bytes = fs.readFileSync(xlsx);
const source = { name: xlsx, bytes };
const facts = buildFacts([source]);
const draft = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'report-draft.html'), 'utf8');
const rulesText = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'rules.yaml'), 'utf8');
const report = fillReport(draft, facts, { rulesText }).html;
const P = '2026Q3.xlsx/損益表/';
const has = (list, part) => list.some((x) => x.includes(part));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

/** The workbook with one cell given another number, written again: a source changed after the report was made. */
function changedSource() {
  const wb = XLSX.read(bytes, { cellFormula: true, cellNF: true });
  wb.Sheets['損益表'].D10.v += 1;
  delete wb.Sheets['損益表'].D10.w;
  return { name: '2026Q3.xlsx', bytes: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) };
}

test('a report straight from fill passes all 3 levels against its source and its rules file', () => {
  const r = verifyReport(report, { sources: [source], rulesText });
  assert.deepEqual(r.levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.counts.ok, 9);
  assert.equal(r.rules.filter((x) => x.result === 'pass').length, 2);
  assert.equal(r.ok, true);
  // The example in the repository is such a report.
  const example = fs.readFileSync(path.join(root, 'examples', 'zh-hant', 'report.html'), 'utf8');
  assert.equal(verifyReport(example, { sources: [source], rulesText }).ok, true);
});

test('without a source only level 1 is done, and the result says the source was not checked', () => {
  const r = verifyReport(report);
  assert.deepEqual(r.levels, { 1: 'pass', 2: 'skipped', 3: 'skipped' });
  assert.equal(r.ok, true);
  assert.ok(has(r.warnings, '尚未與來源檔核對'));
  assert.ok(has(r.warnings, '沒有提供規則檔'));
});

test('a number changed on the page fails level 1, with its line and both texts', () => {
  const bad = report.replace('>482.0</td>', '>490.0</td>');
  assert.notEqual(bad, report);
  const r = verifyReport(bad, { sources: [source], rulesText });
  assert.equal(r.levels[1], 'fail');
  assert.equal(r.levels[3], 'pass');
  assert.equal(r.counts.mismatch, 1);
  assert.ok(r.problems.some((p) => /第 \d+ 行/.test(p) && p.includes('「490.0」') && p.includes('「482.0」')));
  assert.equal(r.ok, false);
});

test('a number and its block changed together pass levels 1 and 2 and fail level 3', () => {
  // The attack level 1 cannot see: the value in the block and the text on the page are changed to agree.
  const bad = report
    .replace(/("2026Q3\.xlsx\/損益表\/D14": \{\s*"type": "number",\s*"value": )482000000/, '$1582000000')
    .replace(/("2026Q3\.xlsx\/損益表\/D10": \{\s*"type": "number",\s*"value": )(\d+)/, (m, head, v) => head + (Number(v) + 100000000))
    .replace(/("2026Q3\.xlsx\/摘要\/B3": \{\s*"type": "number",\s*"value": )482000000/, '$1582000000')
    .replace('>482.0</td>', '>582.0</td>');
  const first = verifyReport(bad);
  // Other elements cite the same cells; make every one agree with the changed block, as a careful forger would.
  let forged = bad;
  for (const p of first.problems) {
    const m = /報告寫「([^」]*)」，依來源值必須寫「([^」]*)」/.exec(p);
    if (m) forged = forged.replace('>' + m[1] + '<', '>' + m[2] + '<');
  }
  const alone = verifyReport(forged);
  assert.equal(alone.levels[1], 'pass', alone.problems.join('\n'));
  assert.equal(alone.ok, true);

  const r = verifyReport(forged, { sources: [source] });
  assert.equal(r.levels[1], 'pass');
  assert.equal(r.levels[2], 'pass');
  assert.equal(r.levels[3], 'fail');
  assert.ok(has(r.problems, P + 'D14 的 value'));
  assert.equal(r.ok, false);
});

test('a source changed after the report was made fails level 2, and level 3 names the cell', () => {
  const r = verifyReport(report, { sources: [changedSource()] });
  assert.equal(r.levels[1], 'pass');
  assert.equal(r.levels[2], 'fail');
  assert.equal(r.levels[3], 'fail');
  assert.ok(has(r.problems, 'SHA-256'));
  assert.ok(has(r.problems, P + 'D10 的 value'));
});

test('a source that is not an .xlsx is a problem, not a crash', () => {
  const r = verifyReport(report, { sources: [{ name: '2026Q3.xlsx', bytes: Buffer.from('a,b\n1,2\n') }] });
  assert.equal(r.levels[2], 'fail');
  assert.equal(r.levels[3], 'fail');
  assert.ok(has(r.problems, '不是 .xlsx 格式'));
});

test('a hand-changed number and a number without a source are warnings: no check can settle them', () => {
  const edited = report
    .replace(/data-fact="(2026Q3\.xlsx\/損益表\/D14)"([^>]*)>482\.0</, 'data-fact-was="$1"$2>500.0<')
    .replace('</h1>', '</h1>\n<p>全年目標 20 億元</p>');
  assert.ok(edited.includes('data-fact-was='));
  const r = verifyReport(edited, { sources: [source], rulesText });
  assert.equal(r.counts.was, 1);
  assert.equal(r.counts.uncited, 1);
  assert.ok(has(r.warnings, '已偏離來源'));
  assert.ok(has(r.warnings, '全年目標 20 億元'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
});

test('a block that is missing, broken or from a newer version stops at level 1', () => {
  const none = verifyReport(draft);
  assert.equal(none.levels[1], 'fail');
  assert.ok(has(none.problems, '沒有出處區塊'));
  const newer = verifyReport(report.replace('"tactileProvenance": 1', '"tactileProvenance": 2'), { sources: [source] });
  assert.ok(has(newer.problems, '版本'));
  assert.equal(newer.levels[2], 'skipped');
  const broken = verifyReport(report.replace('"tactileProvenance": 1,', '"tactileProvenance": 1,,'));
  assert.ok(has(broken.problems, '不是有效的 JSON'));
  assert.equal(broken.ok, false);
});

test('a broken rule and an unknown ID fail level 1', () => {
  const bad = report
    .replace(/("2026Q3\.xlsx\/損益表\/D10": \{\s*"type": "number",\s*"value": )\d+/, '$1 1')
    .replace('data-fact="2026Q3.xlsx/損益表/D20"', 'data-fact="2026Q3.xlsx/損益表/Z99"');
  const r = verifyReport(bad);
  assert.equal(r.levels[1], 'fail');
  assert.equal(r.counts.missing, 1);
  assert.ok(has(r.problems, '規則「營收合計」違反'));
});

test('the rules file is checked against what fill recorded, and the block cannot loosen a rule unseen', () => {
  const other = verifyReport(report, { sources: [source], rulesText: rulesText.replace('tolerance: 0', 'tolerance: 5') });
  assert.ok(has(other.problems, '規則檔的 SHA-256'));
  const loose = report.replace(/"tolerance": "0"/, '"tolerance": "999999999"');
  assert.notEqual(loose, report);
  assert.equal(verifyReport(loose, { sources: [source] }).ok, true);
  const r = verifyReport(loose, { sources: [source], rulesText });
  assert.ok(has(r.problems, '出處區塊裡的規則與規則檔展開的結果不同'));
});

test('with 2 sources and 1 supplied, levels 2 and 3 are not counted as done', () => {
  const shared = path.join(here, 'fixtures', 'shared.xlsx');
  const both = [source, { name: shared, bytes: fs.readFileSync(shared) }];
  const page = '<!doctype html><html><head><title>t</title></head><body><p><b data-fact="' + P + 'D14"></b> <b data-fact="shared.xlsx/損益表/D14"></b></p></body></html>';
  const two = fillReport(page, buildFacts(both)).html;
  const one = verifyReport(two, { sources: [source] });
  assert.deepEqual(one.levels, { 1: 'pass', 2: 'skipped', 3: 'skipped' });
  assert.ok(has(one.warnings, '沒有提供來源檔 「shared.xlsx」'));
  assert.deepEqual(verifyReport(two, { sources: both }).levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
  const extra = verifyReport(report, { sources: both });
  assert.ok(has(extra.warnings, '沒有引用來源檔「shared.xlsx」'));
  assert.equal(extra.ok, true);
});

test('the command: exit codes, --strict, --json, and the report is never written', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-verify-'));
  try {
    const file = path.join(dir, 'report.html');
    fs.writeFileSync(file, report);
    const full = run('verify', file, '--source', xlsx, '--rules', path.join(root, 'examples', 'zh-hant', 'rules.yaml'), '--strict');
    assert.equal(full.status, 0, full.stdout + full.stderr);
    assert.match(full.stdout, /第 3 級 重新擷取：通過/);
    assert.match(full.stdout, /結果：通過。做到第 3 級/);

    const alone = run('verify', file);
    assert.equal(alone.status, 0);
    assert.match(alone.stdout, /第 2 級 來源檔相同：沒做/);
    assert.match(alone.stdout, /做到第 1 級，尚未與來源檔核對/);
    assert.doesNotMatch(alone.stdout, /已驗證/);
    assert.equal(run('verify', file, '--strict').status, 1);

    const json = run('verify', file, '--source', xlsx, '--json');
    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.pass, true);
    assert.equal(parsed.reached, 3);

    const bad = path.join(dir, 'bad.html');
    const badText = report.replace('>482.0</td>', '>490.0</td>');
    fs.writeFileSync(bad, badText);
    const failed = run('verify', bad, '--source', xlsx);
    assert.equal(failed.status, 1);
    assert.match(failed.stdout, /結果：不通過。第 1 級沒有通過/);
    assert.equal(fs.readFileSync(bad, 'utf8'), badText);

    assert.equal(run('verify').status, 2);
    assert.equal(run('verify', file, '--facts', 'x').status, 2);
    assert.equal(run('verify', path.join(dir, 'nope.html')).status, 1);
    assert.equal(run('verify', file, '--source', path.join(dir, 'nope.xlsx')).status, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
