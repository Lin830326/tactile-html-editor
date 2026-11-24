#!/usr/bin/env node
// Checks the English interface against the code.
//
//   node tools/i18n-check.mjs            every text of the finished files has a translation, and none is left unwrapped
//   node tools/i18n-check.mjs --todo     also count the texts of the files not done yet
//   node tools/i18n-check.mjs --file ai.js --extra entries.json
//                                        check one unfinished file, with its entries still in a JSON file
//
// A file is finished when every interface text in it goes through t(). Add it to DONE then.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const JS = join(ROOT, 'src', 'js');
export const DONE = ['core.js', 'app.js', 'layers.js', 'canvas.js', 'inspector.js', 'insert.js', 'contextmenu.js', 'effects.js',
  'ai.js', 'fileio.js', 'provenance.js', 'pages.js', 'island.js', 'tidy.js', 'snap.js', 'sources.js', 'fill.js', 'ingest-text.js'];
// The code the editor shares with tactile-ingest. Its errors carry a code; src/js/ingest-text.js words each one.
const SHARED = ['decimal.mjs', 'rules-core.mjs', 'chart.mjs', 'workbook.mjs', 'yaml-lite.mjs'];
const CODE = /'((?:show|rules|chart|book|yaml)\.[a-z0-9-]+)'/g;

/** {thrown: Map(code → the file of ingest/src that throws it), texts: Map(code → its text in ingest-text.js)}. */
export function sharedCodes() {
  const thrown = new Map();
  for (const f of SHARED) {
    for (const line of readFileSync(join(ROOT, 'ingest', 'src', f), 'utf8').split(/\r?\n/)) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      for (const m of line.matchAll(CODE)) if (!thrown.has(m[1])) thrown.set(m[1], f);
    }
  }
  const texts = new Map();
  for (const m of readFileSync(join(JS, 'ingest-text.js'), 'utf8').matchAll(/^\s*'([a-z]+\.[a-z0-9-]+)': \(v\) => t\('((?:[^'\\]|\\.)*)', v\),\s*$/gm)) texts.set(m[1], m[2].replace(/\\(.)/g, '$1'));
  return { thrown, texts };
}
// Texts of documents (templates and what the editor writes into a page), which are not interface text.
const NOT_INTERFACE = ['samples.js', 'samples-en.js', 'samples-zh-hans.js', 'samples-site.js', 'workbook-core.js', 'ingest-core.js', 'lang-en.js', 'lang-zh-cn.js'];
const FILES = { en: 'lang-en.js', 'zh-CN': 'lang-zh-cn.js' };
// Chinese characters, and the full-width punctuation that goes with them.
const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;
const CALL = /\b(?:HE\.)?t\(\s*'((?:[^'\\]|\\.)*)'/g;

/** The dictionary of a language, read by running its file with a stand-in for HE. */
export function dictionary(lang = 'en') {
  const d = {};
  vm.runInNewContext(readFileSync(join(JS, FILES[lang]), 'utf8'), { window: { HE: { i18n: { add: (l, map) => { if (l === lang) Object.assign(d, map); } } } } });
  return d;
}

/** A line of code without its comments and without the texts that go through t(). */
function bare(line) {
  const s = line.trim();
  if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) return '';
  return line.replace(CALL, 't(').replace(/\/\*.*?\*\//g, '').replace(/\s\/\/ .*$/, '');
}

/** opts.file: check that one file as if it were finished, with the entries of opts.extra (an object) added. */
export function check(opts = {}) {
  const dict = Object.assign(dictionary(), opts.extra || {});
  const done = opts.file ? [opts.file] : DONE;
  const problems = [];
  const used = new Set();
  const todo = {};
  for (const f of readdirSync(JS).filter((n) => n.endsWith('.js') && !NOT_INTERFACE.includes(n))) {
    const lines = readFileSync(join(JS, f), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const s = line.trim();
      if (line.includes('i18n-ok') || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) return;
      for (const m of line.matchAll(CALL)) {
        const text = m[1].replace(/\\(.)/g, '$1');
        if (!CJK.test(text)) continue;
        // t('…', vars, 'ctx'): the entry '…|ctx' when there is one, else the entry '…'.
        const ctx = /^\s*,\s*(?:null|\{[^}]*\})\s*,\s*'([a-z-]+)'/.exec(line.slice(m.index + m[0].length));
        const key = ctx && (text + '|' + ctx[1]) in dict ? text + '|' + ctx[1] : text;
        used.add(key);
        if (!(key in dict)) problems.push(f + ':' + (i + 1) + ' has no translation: ' + text);
      }
      if (CJK.test(bare(line))) {
        if (done.includes(f)) problems.push(f + ':' + (i + 1) + ' has a text that does not go through t(): ' + line.trim().slice(0, 80));
        else todo[f] = (todo[f] || 0) + 1;
      }
    });
  }
  // index.html is translated in place when the editor starts (HE.i18n.applyStatic).
  const index = readFileSync(join(ROOT, 'src', 'index.html'), 'utf8');
  const body = index.slice(index.indexOf('@build:body-start'), index.indexOf('@build:body-end'));
  const statics = [...body.matchAll(/(?:aria-label|title|placeholder)="([^"]*)"|>([^<>]+)</g)].map((m) => (m[1] || m[2] || '').trim()).filter((s) => CJK.test(s));
  for (const text of statics) { used.add(text); if (!(text in dict)) problems.push('index.html has no translation: ' + text); }
  for (const [text, en] of Object.entries(dict)) {
    if (!used.has(text)) problems.push('lang-en.js has an entry nothing uses: ' + text);
    const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    if (vars(text.replace(/\|[a-z-]+$/, '')) !== vars(en)) problems.push('lang-en.js: the {names} differ from the text as written: ' + text);
    if (CJK.test(en)) problems.push('lang-en.js: the translation holds Chinese: ' + text);
  }
  // The other languages hold the same entries as the English one.
  let others = 0;
  for (const lang of Object.keys(FILES).filter((l) => l !== 'en' && !opts.file)) {
    const d = dictionary(lang);
    others += Object.keys(d).length;
    const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const text of Object.keys(dict)) if (!(text in d)) problems.push(FILES[lang] + ' lacks the entry: ' + text);
    for (const [text, v] of Object.entries(d)) {
      if (!(text in dict)) problems.push(FILES[lang] + ' has an entry lang-en.js does not have: ' + text);
      else if (vars(text.replace(/\|[a-z-]+$/, '')) !== vars(v)) problems.push(FILES[lang] + ': the {names} differ from the text as written: ' + text);
    }
  }
  if (opts.file) {
    const mine = new Set(Object.keys(opts.extra || {}));
    return { problems: problems.filter((p) => p.startsWith(opts.file + ':') || [...mine].some((k) => p.endsWith(': ' + k))), todo, count: mine.size };
  }
  // Every code the shared code throws has a text in ingest-text.js, and that text a translation in each language.
  const { thrown, texts } = sharedCodes();
  for (const [code, f] of thrown) if (!texts.has(code)) problems.push('ingest-text.js has no text for the code ' + code + ' (ingest/src/' + f + ' throws it)');
  for (const code of texts.keys()) if (!thrown.has(code)) problems.push('ingest-text.js has a code that ingest/src does not throw: ' + code);
  for (const lang of Object.keys(FILES)) {
    const d = lang === 'en' ? dict : dictionary(lang);
    for (const [code, text] of texts) if (!(text in d)) problems.push(FILES[lang] + ' has no translation for the code ' + code + ': ' + text);
  }
  return { problems, todo, count: Object.keys(dict).length, others, codes: thrown.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : ''; };
  // --file <name.js> --extra <entries.json>: for work on one file before its entries are in lang-en.js.
  const r = check({ file: arg('--file'), extra: arg('--extra') ? JSON.parse(readFileSync(arg('--extra'), 'utf8')) : null });
  for (const p of r.problems) console.error(p);
  if (process.argv.includes('--todo')) {
    const rows = Object.entries(r.todo).sort((a, b) => b[1] - a[1]);
    for (const [f, n] of rows) console.log('not done: ' + f + ', ' + n + ' lines hold Chinese');
    console.log(rows.length + ' files not done, ' + rows.reduce((n, x) => n + x[1], 0) + ' lines in all.');
  }
  console.log(r.problems.length ? r.problems.length + ' problems.' : 'Interface translations: ' + r.count + ' English entries, ' + (r.others || 0) + ' in the other languages, ' + DONE.length + ' files checked, ' + (r.codes || 0) + ' error codes of the shared code. No problems.');
  process.exitCode = r.problems.length ? 1 : 0;
}
