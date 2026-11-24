import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { SpecError } from '../src/decimal.mjs';
import { readRules } from '../src/rules-core.mjs';
import { parseRules } from '../src/rules.mjs';
import { parseYamlLite } from '../src/yaml-lite.mjs';
import { setLang } from '../src/lang.mjs';

// These tests read the Traditional Chinese messages; test/lang.test.mjs reads the English ones.
setLang('zh');
process.env.TACTILE_LANG = 'zh'; // for the commands these tests start

const example = (name) => readFileSync(new URL('../examples/zh-hant/' + name, import.meta.url), 'utf8');
/** The yaml package's answer, or the error it throws. */
const theirs = (text) => { try { return { value: parseYaml(text) }; } catch (err) { return { error: err }; } };
/** parseYamlLite must say what the yaml package says. */
function same(text, name = JSON.stringify(text)) {
  const want = theirs(text);
  assert.equal(want.error, undefined, name + ': the yaml package refuses this text, so it does not belong among the accepted cases');
  assert.deepStrictEqual(parseYamlLite(text), want.value, name);
}

// Each text is accepted, and read as the yaml package reads it.
const ACCEPTED = [
  // the shapes a rules file has
  'tactileRules: 1\nrules:\n  - id: a\n    type: sum\n',
  'a: 1\nb:\n  c: 2\n  d:\n    e: 3\n      \nf: 4\n',
  'rules:\n- id: a\n- id: b\n',
  'rules:\n  -   id: a\n      type: sum\n  - id: b\n',
  'a:\n  - 1\n  - two\n  -\n    k: v\n  - - x\n    - y\n',
  '- a\n- b: 1\n  c: 2\n-\n- ~\n',
  'a:\n  b:\n    c:\n      d:\n        e:\n          f:\n            - g: 1\n              h:\n                - i\n',
  'parts: [x.xlsx/S/D10, x.xlsx/S/D11, "a, b", 3, true, ~]\nempty: []\nspaced: [ a , b ]\n',
  '- [a, b]\n- []\n',
  // empty values and null
  'a:\nb: ~\nc: null\nd: Null\ne: NULL\nf: nULL\ng: ""\nh: \'\'\n',
  'a:\n',
  'a: # only a comment\nb: 1\n',
  '-\n-   # nothing\n- x\n',
  // booleans and the words that are not
  'a: true\nb: True\nc: TRUE\nd: false\ne: False\nf: FALSE\ng: yes\nh: no\ni: on\nj: off\nk: tRue\nl: y\n',
  // numbers and the texts that look like them
  'a: 0\nb: 7\nc: -7\nd: +7\ne: 007\nf: -0\ng: 12345678901234567890\n',
  'a: 0.5\nb: .5\nc: 5.\nd: -0.0\ne: +1.25\nf: 1e3\ng: 1E3\nh: 1.5e-3\ni: .5e2\nj: 5.e1\nk: 1e+2\n',
  'a: 2026-11-10\nb: 1_000\nc: 1,000\nd: 0b11\ne: 12:30\nf: 1e\ng: e3\nh: .\ni: +\nj: --5\nk: 1.2.3\nl: 0x\nm: 0o8\nn: .e3\n',
  'a: "1"\nb: \'true\'\nc: "null"\nd: "~"\ne: "0x10"\n',
  'tolerance: 0.50\nother: 1.0\n',
  // quotes and escapes
  'a: "x: y"\nb: \'it\'\'s\'\nc: "say \\"hi\\""\nd: \'# not a comment\'\ne: "# neither"\n',
  'a: "tab\\there\\nline\\\\ back\\/slash \\0 \\a \\b \\e \\f \\r \\v \\N \\_ \\L \\P \\  end"\n',
  'a: "\\x41\\u4e2d\\U0001F600\\ud83d\\ude00"\n',
  'a: \'back\\slash stays\'\nb: "a\'b"\nc: \'a"b\'\n',
  '"quoted key": 1\n\'single key\': 2\n"": 3\n"a: b": 4\n"1": 5\n"true": 6\n',
  '- "a: b"\n- \'c\': d\n- "e" # comment\n',
  // comments
  '# top\na: 1 # after a value\n  # indented\nb: x#y\nc: x #y\nd: "x" # after a quote\ne: [a, b] # after a list\n',
  'a: b #\nc: d# e\n',
  // colons, dashes and other marks inside values
  'a: x.xlsx/損益表/D10:D13\nb: http://example.com/a?b=c#d\nc: a:b:c\nd: -x\ne: a - b\nf: a, b\ng: a [b] {c}\nh: 50%\ni: a & b\nj: a * b\nk: a ! b\nl: a | b > c\nm: a ? b\n',
  'a: it\'s\nb: say "hi"\nc: =SUM(D10:D13)\nd: <b>bold</b>\ne: $1\nf: ~x\ng: .x\nh: (x)\ni: /x\nj: \\x\n',
  'key with spaces: v\nkey : v2\n-dash: 3\nk#h: 4\n',
  // Chinese, and spaces that are not YAML white space
  '報告: 季營運報告\n確認人: 林雅婷\n規則:\n  - 名稱: 營收合計\n    說明: 摘要表的營收引用損益表的合計\n',
  'a: \u3000全形空白開頭\nb: 結尾有不換行空白\u00a0\n',
  // the start of a document, line ends, trailing spaces
  '---\na: 1\n',
  '--- # the rules\na: 1\n',
  '\ufeffa: 1\n',
  '\ufeff---\r\na: 1\r\nb:\r\n  - x\r\n',
  'a: 1   \nb:   2\nc:    \n   \n\n',
  'a: 1',
  '  a: 1\n  b: 2\n',
  // documents that are not a mapping
  '',
  '# nothing but a comment\n',
  '---\n',
  'just text\n',
  '42\n',
  '"quoted"\n',
  '- 1\n',
  // a key named like a property every object has
  '__proto__: 1\nconstructor: 2\ntoString: 3\nhasOwnProperty: 4\n',
  'a:\n  __proto__:\n    b: 1\n',
];

// Each text is refused with this code. Some are valid YAML that the reader does not take; some are not YAML.
const REFUSED = [
  ['a: &x 1\nb: *x\n', 'yaml.anchor', 1],
  ['a: 1\nb: *a\n', 'yaml.alias', 2],
  ['a: !!str 1\n', 'yaml.tag', 1],
  ['!!map\na: 1\n', 'yaml.tag', 1],
  ['a: |\n  text\n', 'yaml.block-scalar', 1],
  ['a: >-\n  text\n', 'yaml.block-scalar', 1],
  ['a: {b: 1}\n', 'yaml.flow-map', 1],
  ['{a: 1}\n', 'yaml.flow-map', 1],
  ['- {a: 1}\n', 'yaml.flow-map', 1],
  ['a: 1\n---\nb: 2\n', 'yaml.multi-doc', 2],
  ['a: 1\n...\n', 'yaml.multi-doc', 2],
  ['---\na: 1\n---\n', 'yaml.multi-doc', 3],
  ['--- a: 1\n', 'yaml.doc-inline', 1],
  ['--- text\n', 'yaml.doc-inline', 1],
  ['%YAML 1.2\n---\na: 1\n', 'yaml.directive', 1],
  ['a:\n\tb: 1\n', 'yaml.tab', 2],
  ['a:\t1\n', 'yaml.tab', 1],
  ['a: "x\ty"\n', 'yaml.tab', 1],
  ['a: 1\na: 2\n', 'yaml.duplicate-key', 2],
  ['a: 1\n"a": 2\n', 'yaml.duplicate-key', 2],
  ['- a: 1\n  a: 2\n', 'yaml.duplicate-key', 2],
  ['? a\n: b\n', 'yaml.complex-key', 1],
  ['? [a, b]\n: c\n', 'yaml.complex-key', 1],
  ['<<: x\n', 'yaml.merge-key', 1],
  ['1: a\n', 'yaml.key-type', 1],
  ['true: a\n', 'yaml.key-type', 1],
  ['~: a\n', 'yaml.key-type', 1],
  ['1.5: a\n', 'yaml.key-type', 1],
  // scalars over lines
  ['a: b\n  c\n', 'yaml.multiline', 2],
  ['- a\n  b\n', 'yaml.multiline', 2],
  ['a:\n  just text\n', 'yaml.no-colon', 2],
  ['a: "b\n  c"\n', 'yaml.quote-open', 1],
  ['a: \'b\n', 'yaml.quote-open', 1],
  ['a: "b\\\n  c"\n', 'yaml.quote-open', 1],
  ['text\nmore text\n', 'yaml.no-colon', 1],
  // structure
  ['a: 1\n  b: 2\n', 'yaml.multiline', 2],
  ['a:\n    b: 1\n  c: 2\n', 'yaml.indent', 3],
  ['- a\n - b\n', 'yaml.multiline', 2],
  ['a: 1\n- b\n', 'yaml.indent', 2],
  ['- a\nb: 1\n', 'yaml.indent', 2],
  ['a: b: c\n', 'yaml.nested-colon', 1],
  ['a: b:\n', 'yaml.nested-colon', 1],
  ['a: - b\n', 'yaml.dash', 1],
  ['a: -\n', 'yaml.dash', 1],
  ['a\nb: 1\n', 'yaml.no-colon', 1],
  ['a: 1\nb\n', 'yaml.no-colon', 2],
  ['"a":b\n', 'yaml.after-value', 1],
  ['"a":b\nc: 1\n', 'yaml.no-colon', 1],
  // quotes and what follows them
  ['a: "x" y\n', 'yaml.after-value', 1],
  ['a: "x"# no space\n', 'yaml.after-value', 1],
  ['a: [x] y\n', 'yaml.after-value', 1],
  ['a: "\\q"\n', 'yaml.escape', 1],
  ['a: "\\x4"\n', 'yaml.escape', 1],
  ['a: "\\u12g4"\n', 'yaml.escape', 1],
  ['a: "\\U00110000"\n', 'yaml.escape', 1],
  // indicators at the start of a scalar
  ['a: @x\n', 'yaml.indicator', 1],
  ['a: `x`\n', 'yaml.indicator', 1],
  ['a: %x\n', 'yaml.indicator', 1],
  ['a: ,x\n', 'yaml.indicator', 1],
  ['a: ]\n', 'yaml.indicator', 1],
  [': a\n', 'yaml.indicator', 1],
  ['a: :x\n', 'yaml.indicator', 1],
  ['[a]: b\n', 'yaml.after-value', 1],
  // flow sequences
  ['a: [x, y\n', 'yaml.flow-open', 1],
  ['a: [x,\n  y]\n', 'yaml.flow-open', 1],
  ['a: [x, ]\n', 'yaml.flow-empty', 1],
  ['a: [, x]\n', 'yaml.flow-empty', 1],
  ['a: [x,, y]\n', 'yaml.flow-empty', 1],
  ['a: [[x]]\n', 'yaml.flow-nested', 1],
  ['a: [{x: 1}]\n', 'yaml.flow-nested', 1],
  ['a: [x: 1]\n', 'yaml.flow-syntax', 1],
  ['a: ["x": 1]\n', 'yaml.flow-syntax', 1],
  ['a: [x #c]\n', 'yaml.flow-syntax', 1],
  ['a: ["x" "y"]\n', 'yaml.flow-syntax', 1],
  ['a: [&x 1]\n', 'yaml.anchor', 1],
  // numbers written in a form the reader does not take
  ['a: 0x1F\n', 'yaml.number-form', 1],
  ['a: 0o17\n', 'yaml.number-form', 1],
  ['a: .inf\n', 'yaml.number-form', 1],
  ['a: -.Inf\n', 'yaml.number-form', 1],
  ['a: .NaN\n', 'yaml.number-form', 1],
  ['a: 1e999\n', 'yaml.number-range', 1],
  // characters
  ['a: x\u0000y\n', 'yaml.control', 1],
  ['a: 1\rb: 2\n', 'yaml.control', 1],
  ['a: x\u2028y\n', 'yaml.control', 1],
  ['a: 1\n\ufeffb: 2\n', 'yaml.control', 2],
  ['a: x\u0085y\n', 'yaml.control', 1],
  ['k'.repeat(1001) + ': 1\n', 'yaml.key-long', 1],
  ['- '.repeat(70) + 'x\n', 'yaml.depth', 1],
];

test('parseYamlLite reads the example rules files as the yaml package does, and they give the same rules', () => {
  for (const name of ['rules.yaml', 'word-rules.yaml', 'pdf-rules.yaml']) {
    const text = example(name);
    same(text, name);
    assert.deepStrictEqual(readRules(parseYamlLite(text)), parseRules(text), name);
    // With Windows line ends and a byte order mark, as an editor on Windows may save it.
    same('\ufeff' + text.replace(/\r?\n/g, '\r\n'), name + ' (CRLF, BOM)');
  }
  assert.equal(parseYamlLite(example('rules.yaml')).approvedOn, '2026-11-10'); // a date is text, not a Date
});

test('parseYamlLite: every accepted text reads as the yaml package reads it', () => {
  assert.ok(ACCEPTED.length >= 40, 'at least 40 hand-written cases');
  assert.equal(new Set(ACCEPTED).size, ACCEPTED.length, 'no case twice');
  for (const text of ACCEPTED) same(text);
  // The types the cases are there to tell apart.
  assert.deepStrictEqual(parseYamlLite('a: 0.5\nb: 1e3\nc: 007\nd: 2026-11-10\ne: yes\nf: ~\ng:\nh: "1"\n'), { a: 0.5, b: 1000, c: 7, d: '2026-11-10', e: 'yes', f: null, g: null, h: '1' });
});

test('parseYamlLite: what is outside the subset is refused with the line and the construct, never guessed', () => {
  assert.equal(new Set(REFUSED.map((r) => r[0])).size, REFUSED.length, 'no case twice');
  for (const [text, code, line] of REFUSED) {
    const name = JSON.stringify(text.length > 80 ? text.slice(0, 80) + '…' : text);
    assert.throws(() => parseYamlLite(text), (err) => {
      assert.ok(err instanceof SpecError, name + ': ' + err);
      assert.equal(err.code, code, name + ': ' + err.message);
      assert.equal(err.vars.line, line, name + ': ' + err.message);
      assert.ok(err.message.startsWith('第 ' + line + ' 行：'), name + ': ' + err.message);
      return true;
    }, name);
  }
});

// A generator of small texts made of the pieces YAML is written with. The same seed gives the same texts.
function generator(seed) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const pick = (list) => list[Math.floor(next() * list.length)];
  const KEYS = ['a', 'b', 'c', 'id', 'type', 'parts', 'k k', '"q"', "'s'", '名稱', 'a-b', 'a.b', 'x1', '-k', '1', 'true', '~', '<<', '"a: b"', 'a#b', '?', 'k:'];
  const VALUES = ['', '1', '-1', '+1', '007', '0.5', '.5', '5.', '1e3', '1E-2', '0x1F', '0o7', '.inf', '.nan', 'true', 'False', 'null', '~', 'yes', 'text', 'two words',
    '2026-11-10', 'x.xlsx/S/D10:D13', 'a:b', 'a: b', 'a :b', 'a #c', 'a#c', '#c', '"q"', '"q" #c', '"q"x', "'s'", "'it''s'", '"e\\n\\u4e2d"', '"bad\\q"', '"open', "'open",
    '[a, b]', '[]', '[a, "b", 1]', '[a,]', '[a: b]', '[a:b]', '[a b, c]', '[[a]]', '[a', '{a: 1}', '&a 1', '*a', '!!str 1', '|', '>', '- x', '-', '-x', 'a - b', ': x', ':x', '?x', '? x',
    '@x', '`x', '%x', ',x', 'a, b', '中文', '=SUM(A1:A2)', '1_000', '12:30', '-0', '-0.0', '1.0', '00', '+.5', '-.5e1', 'a\u00a0', '\u3000a', 'a  b', "it's", 'say "hi"', 'a]', 'a}', 'a[0]', '.', '..', '...', '---', '--', '+', 'e3', '1e', '0b1', 'NaN', 'Infinity', 'nUll', 'TRUE', 'FALSE', 'NULL', 'Null'];
  const line = () => {
    const indent = ' '.repeat(pick([0, 0, 0, 2, 2, 4, 1, 3, 6]));
    const kind = next();
    const tail = pick(['', '', '', ' ', ' # c', '  ']);
    if (kind < 0.04) return pick(['', '   ', '# comment', '  # comment', '---', '...', '--- # c']);
    if (kind < 0.5) return indent + pick(KEYS) + pick([':', ': ', ':  ', ' : ']) + pick(VALUES) + tail;
    if (kind < 0.75) return indent + pick(['- ', '-   ', '-']) + pick(VALUES) + tail;
    if (kind < 0.9) return indent + pick(['- ', '-  ']) + pick(KEYS) + pick([': ', ':']) + pick(VALUES) + tail;
    if (kind < 0.95) return indent + pick(['- - ', '- - - ']) + pick(VALUES);
    return indent + pick(VALUES) + tail;
  };
  return () => { const n = 1 + Math.floor(next() * 6); const out = []; for (let i = 0; i < n; i++) out.push(line()); return out.join(pick(['\n', '\n', '\r\n'])) + pick(['\n', '']); };
}

test('parseYamlLite: on 60,000 generated texts it never reads anything differently from the yaml package', () => {
  const make = generator(20261116);
  let accepted = 0;
  let refused = 0;
  for (let i = 0; i < 60000; i++) {
    const text = make();
    let mine;
    try { mine = parseYamlLite(text); } catch (err) {
      assert.ok(err instanceof SpecError, JSON.stringify(text) + ' threw ' + (err && err.stack));
      assert.ok(err.code && err.code.startsWith('yaml.') && err.vars.line >= 1, JSON.stringify(text));
      refused++;
      continue;
    }
    accepted++;
    const want = theirs(text);
    assert.equal(want.error, undefined, 'accepted, but the yaml package refuses it: ' + JSON.stringify(text));
    assert.deepStrictEqual(mine, want.value, JSON.stringify(text));
  }
  // The generator makes both kinds, so that neither side of the comparison is empty.
  assert.ok(accepted > 5000, 'accepted ' + accepted);
  assert.ok(refused > 5000, 'refused ' + refused);
});
