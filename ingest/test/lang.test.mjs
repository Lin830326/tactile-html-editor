import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readShow, SpecError } from '../src/decimal.mjs';
import { FillError, fillReport } from '../src/fill.mjs';
import { buildFacts, IngestError } from '../src/ingest.mjs';
import { say, setLang } from '../src/lang.mjs';
import { factsToMarkdown } from '../src/markdown.mjs';
import { toolList } from '../src/mcp.mjs';
import { verifyReport } from '../src/verify.mjs';
import { parseYamlLite } from '../src/yaml-lite.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const cli = path.join(root, 'bin', 'tactile-ingest.mjs');
const xlsx = path.join(here, 'fixtures', '2026Q3.xlsx');
const draftFile = path.join(root, 'examples', 'zh-hant', 'report-draft.html');
const rulesFile = path.join(root, 'examples', 'zh-hant', 'rules.yaml');
const source = { name: xlsx, bytes: fs.readFileSync(xlsx) };
const now = new Date('2026-11-11T03:45:00Z');
const page = (body) => '<!doctype html>\n<html><head><meta charset="utf-8"><title>t</title></head>\n<body>\n' + body + '\n</body>\n</html>\n';
// Chinese characters, and the full-width punctuation that goes with them.
const CJK = /[　-〿㐀-鿿＀-￯]/;

// The variables that choose the language, taken out of the environment so that the machine's own do not decide.
const LANG_VARS = ['TACTILE_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG'];
function run(env, ...args) {
  const clean = {};
  for (const [k, v] of Object.entries(process.env)) if (!LANG_VARS.includes(k.toUpperCase())) clean[k] = v;
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...clean, ...env } });
}
const firstLine = (r) => r.stdout.split('\n')[0];

test('the language comes from TACTILE_LANG, then LC_ALL, LC_MESSAGES and LANG; zh… is Chinese, anything else English', () => {
  assert.equal(firstLine(run({ TACTILE_LANG: 'en' }, '--help')), 'Usage:');
  assert.equal(firstLine(run({ TACTILE_LANG: 'zh' }, '--help')), '用法：');
  assert.equal(firstLine(run({ LANG: 'zh_TW.UTF-8' }, '--help')), '用法：');
  assert.equal(firstLine(run({ LANG: 'en_US.UTF-8' }, '--help')), 'Usage:');
  // An earlier variable wins over a later one, and a value in any case counts.
  assert.equal(firstLine(run({ TACTILE_LANG: 'en', LANG: 'zh_TW.UTF-8' }, '--help')), 'Usage:');
  assert.equal(firstLine(run({ LC_ALL: 'ZH_tw', LANG: 'en_US.UTF-8' }, '--help')), '用法：');
  assert.equal(firstLine(run({ LC_MESSAGES: 'zh_TW', LANG: 'C' }, '--help')), '用法：');
  assert.equal(firstLine(run({ LC_ALL: 'C', LANG: 'zh_TW.UTF-8' }, '--help')), 'Usage:');
  assert.equal(firstLine(run({ LANG: 'ja_JP.UTF-8' }, '--help')), 'Usage:');
});

test('--help: the English text holds no Chinese; both name --lang and TACTILE_LANG', () => {
  const en = run({ TACTILE_LANG: 'en' }, '--help');
  assert.equal(en.status, 0);
  assert.ok(!CJK.test(en.stdout), 'the English help holds Chinese');
  assert.match(en.stdout, /tactile-ingest verify <report\.html>/);
  assert.match(en.stdout, /--lang /);
  assert.match(en.stdout, /TACTILE_LANG/);
  assert.match(en.stdout, /Exit codes: 0 done/);
  const zh = run({ TACTILE_LANG: 'zh' }, '--help');
  assert.equal(zh.status, 0);
  assert.match(zh.stdout, /tactile-ingest verify <報告\.html>/);
  assert.match(zh.stdout, /--lang /);
  assert.match(zh.stdout, /TACTILE_LANG/);
  assert.match(zh.stdout, /結束代碼：0 完成/);
});

test('--lang chooses the language before anything is printed, wherever it stands', () => {
  assert.equal(firstLine(run({ TACTILE_LANG: 'en' }, '--lang', 'zh', '--help')), '用法：');
  assert.equal(firstLine(run({ TACTILE_LANG: 'zh' }, '--help', '--lang', 'en')), 'Usage:');
  assert.equal(firstLine(run({ LANG: 'zh_TW.UTF-8' }, '--lang', 'en')), 'Usage:');
  const wrong = run({ TACTILE_LANG: 'zh' }, 'nope', '--lang', 'en');
  assert.equal(wrong.status, 2);
  assert.match(wrong.stderr, /^Unknown command "nope"\n\nUsage:/);
  const noFacts = run({ TACTILE_LANG: 'en' }, '--lang', 'zh', 'fill', 'x.html');
  assert.equal(noFacts.status, 2);
  assert.match(noFacts.stderr, /^fill 需要 --facts <facts\.json>/);
  const bad = run({ TACTILE_LANG: 'en' }, '--lang', 'fr', '--help');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^--lang must be followed by en or zh\n\nUsage:/);
  assert.equal(run({ TACTILE_LANG: 'en' }, '--lang').status, 2);
});

test('say and setLang: a language already chosen is kept', () => {
  setLang('en');
  assert.equal(say('yes', '是'), 'yes');
  assert.equal(globalThis.TACTILE_LANG, 'en');
  setLang('zh');
  assert.equal(say('yes', '是'), '是');
  setLang('fr');
  assert.equal(say('yes', '是'), 'yes');
});

test('errors of the shared modules are in English, with the same codes', () => {
  setLang('en');
  const caught = (fn, kind = SpecError) => { try { fn(); } catch (err) { assert.ok(err instanceof kind); return err; } assert.fail('nothing was thrown'); };
  const digits = caught(() => readShow({ digits: '11' }));
  assert.equal(digits.code, 'show.digits');
  assert.equal(digits.message, 'Attribute data-fact-digits has the value "11", which is not allowed: it must be a whole number from 0 to 10');
  const yaml = caught(() => parseYamlLite('a: 1\nb: &x 2\n'));
  assert.equal(yaml.code, 'yaml.anchor');
  assert.equal(yaml.message, 'Line 2: Anchors (&) are not supported');
  const book = caught(() => buildFacts([{ name: 'a.xlsx', bytes: Buffer.from('not a zip') }]), IngestError);
  assert.match(book.message, /^Cannot read "a\.xlsx": the content is not in \.xlsx format/);
  assert.ok(!CJK.test(digits.message + yaml.message + book.message));

  setLang('zh');
  assert.equal(caught(() => readShow({ digits: '11' })).message, '屬性 data-fact-digits 的值「11」不合規定：必須是 0～10 的整數');
  assert.equal(caught(() => parseYamlLite('a: 1\nb: &x 2\n')).message, '第 2 行：不支援錨點（&）');
});

test('fill: an error is in English, and what it writes does not depend on the language', () => {
  const facts = buildFacts([source]);
  const draft = fs.readFileSync(draftFile, 'utf8');
  const rulesText = fs.readFileSync(rulesFile, 'utf8');
  setLang('en');
  assert.throws(() => fillReport(page('<p><span data-fact="2026Q3.xlsx/nope/A1"></span></p>'), facts), (err) => {
    assert.ok(err instanceof FillError);
    assert.deepEqual(err.problems, ['Line 4, <span data-fact="2026Q3.xlsx/nope/A1">: this ID is not in facts.json']);
    return true;
  });
  assert.throws(() => fillReport(page('<p><span data-fact="2026Q3.xlsx/損益表/D14" data-fact-digits="x"></span></p>'), facts), (err) => {
    assert.match(err.problems[0], /: Attribute data-fact-digits has the value "x", which is not allowed: it must be a whole number from 0 to 10$/);
    return true;
  });
  const en = fillReport(draft, facts, { rulesText, now });
  const enCheck = verifyReport(en.html, { sources: [source], rulesText });
  setLang('zh');
  const zh = fillReport(draft, facts, { rulesText, now });
  assert.equal(en.html, zh.html);
  // A report filled under one language passes verify under the other.
  const zhCheck = verifyReport(en.html, { sources: [source], rulesText });
  assert.equal(enCheck.ok, true);
  assert.equal(zhCheck.ok, true);
  assert.deepEqual(enCheck.levels, { 1: 'pass', 2: 'pass', 3: 'pass' });
  assert.deepEqual(zhCheck.levels, enCheck.levels);
  assert.deepEqual(zhCheck.counts, enCheck.counts);
});

test('facts.md and the MCP tool descriptions follow the language', () => {
  const facts = buildFacts([source]);
  setLang('en');
  const md = factsToMarkdown(facts);
  assert.match(md, /^ID syntax: `2026Q3\.xlsx\/[^`]+\/<cell>`, for example `[^`]+`\.$/m);
  assert.match(md, /^Formulas:$/m);
  assert.ok(!/ID 的寫法|公式：/.test(md));
  for (const tool of toolList()) {
    assert.ok(!CJK.test(JSON.stringify(tool)), tool.name + ' holds Chinese');
    assert.ok(tool.description.length > 20);
  }
  setLang('zh');
  assert.match(factsToMarkdown(facts), /^ID 的寫法：`[^`]+<儲存格>`，例如 `[^`]+`。$/m);
  assert.match(toolList()[0].description, /^列出來源檔與工作表/);
});

test('command line in English: ingest, fill and verify print English, and --json keeps its keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-lang-'));
  try {
    const report = path.join(dir, 'report.html');
    const ingest = run({ TACTILE_LANG: 'en' }, 'ingest', xlsx, '--out', dir);
    assert.equal(ingest.status, 0);
    assert.match(ingest.stdout, /^Ingested\. Files: 1\. Sheets, tables or pages: \d+\. Cells: \d+\nWrote /);
    assert.match(fs.readFileSync(path.join(dir, 'facts.md'), 'utf8'), /^ID syntax: /m);

    const missing = run({ TACTILE_LANG: 'en' }, 'fill', draftFile, '--facts', path.join(dir, 'none.json'), '--out', report);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /^Error: Cannot open "/);

    const fill = run({ TACTILE_LANG: 'en' }, 'fill', draftFile, '--facts', path.join(dir, 'facts.json'), '--rules', rulesFile, '--out', report);
    assert.equal(fill.status, 0);
    assert.match(fill.stdout, /^Numbers filled: \d+\. Wrote /);
    assert.match(fill.stdout, /^Reconciliation rules \(\d+\): \d+ pass, 0 fail, 0 unknown$/m);

    const full = run({ TACTILE_LANG: 'en' }, 'verify', report, '--source', xlsx, '--rules', rulesFile);
    assert.equal(full.status, 0);
    assert.match(full.stdout, /^Level 1: internally consistent: pass\nLevel 2: same source file: pass\nLevel 3: re-ingested: pass\n/);
    assert.match(full.stdout, /^Numbers: \d+ match, 0 do not match, 0 not found, 0 changed by hand, \d+ with no source$/m);
    assert.match(full.stdout, /\nResult: pass\. Reached level 3\n$/);

    const alone = run({ TACTILE_LANG: 'en' }, 'verify', report);
    assert.equal(alone.status, 0);
    assert.match(alone.stdout, /^Level 2: same source file: skipped$/m);
    assert.match(alone.stdout, /^- Not checked against the source file\./m);
    assert.match(alone.stdout, /\nResult: pass\. Reached level 1, not checked against the source file\n$/);

    // The same report read in Chinese: the result is the same, the words are not.
    const zh = run({ TACTILE_LANG: 'zh' }, 'verify', report, '--source', xlsx, '--rules', rulesFile);
    assert.equal(zh.status, 0);
    assert.match(zh.stdout, /^第 1 級 內部一致：通過\n第 2 級 來源檔相同：通過\n第 3 級 重新擷取：通過\n/);

    const json = (lang) => JSON.parse(run({ TACTILE_LANG: lang }, 'verify', report, '--json').stdout);
    const a = json('en'), b = json('zh');
    assert.deepEqual(Object.keys(a), ['pass', 'reached', 'levels', 'counts', 'rules', 'problems', 'warnings', 'notes']);
    assert.deepEqual(Object.keys(b), Object.keys(a));
    assert.deepEqual(a.levels, b.levels);
    assert.deepEqual(a.counts, b.counts);
    assert.ok(a.warnings.some((w) => w.startsWith('Not checked against the source file.')));
    assert.ok(b.warnings.some((w) => w.startsWith('尚未與來源檔核對。')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
