// A reader for the part of YAML that a rules file uses (docs/spec/provenance.md 8). It is for the editor: one
// offline HTML file cannot carry the yaml package. tactile-ingest itself keeps reading rules with that package
// (rules.mjs), so its behaviour does not depend on this file.
//
// The promise: for every text this accepts, the result is what the yaml package's parse() returns (YAML 1.2,
// core schema); test/yaml-lite.test.mjs compares the two. Whatever is outside the subset throws SpecError with
// the line and the construct. Nothing is guessed and nothing is passed over.
//
// Read: block mappings; block sequences whose items are scalars, mappings or sequences; plain, 'single' and
// "double" quoted scalars on one line; decimal numbers, true/false/null; flow sequences of scalars on one line
// ([a, b]); # comments, blank lines, one leading ---, a byte order mark, CRLF.
// Refused: anchors, aliases, tags, block scalars (| >), flow mappings, more than one document, directives, tabs,
// duplicate keys, complex keys (?), merge keys (<<), scalars that go on over lines, keys that are not strings,
// hexadecimal, octal, .inf and .nan.
import { say, SpecError } from './decimal.mjs';

const err = (code, vars, message) => new SpecError(say('Line ' + vars.line + ': ' + message, '第 ' + vars.line + ' 行：' + message), code, vars);

const MAX_DEPTH = 64;
const MAX_KEY = 1000;
// C0 and C1 controls, DEL, the Unicode line breaks, a byte order mark that is not the first character.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\ufeff]/;
const ESCAPES = { 0: '\0', a: '\x07', b: '\b', e: '\x1b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', N: '\u0085', _: '\u00a0', L: '\u2028', P: '\u2029', ' ': ' ', '"': '"', '/': '/', '\\': '\\' };
const HEX = { x: 2, u: 4, U: 8 };
const clip = (s) => (s.length > 40 ? s.slice(0, 39) + '…' : s);

// Only the space is white space here: String.trim() would also take a no-break or an ideographic space, which YAML keeps.
const rtrim = (s) => { let n = s.length; while (n > 0 && s[n - 1] === ' ') n--; return s.slice(0, n); };
const isSeq = (t) => t === '-' || t.startsWith('- ');
/** Where a comment starts in t at or after `from` (a # after a space), or t.length. */
function commentAt(t, from) {
  for (let i = Math.max(from, 1); i < t.length; i++) if (t[i] === '#' && t[i - 1] === ' ') return i;
  return t.length;
}

/** A scalar that starts with an indicator this reader does not take. */
function refuseStart(s, line) {
  const c = s[0];
  if (c === '&') throw err('yaml.anchor', { line }, say('Anchors (&) are not supported', '不支援錨點（&）'));
  if (c === '*') throw err('yaml.alias', { line }, say('Aliases (*) are not supported', '不支援別名（*）'));
  if (c === '!') throw err('yaml.tag', { line }, say('Tags (!) are not supported', '不支援標籤（!）'));
  if (c === '|' || c === '>') throw err('yaml.block-scalar', { line }, say('Block scalars (| and >) are not supported. Write the text on one line, in double quotes when needed', '不支援區塊純量（| 與 >）。請把文字寫在同一行，需要時加雙引號'));
  if (c === '{' || c === '}') throw err('yaml.flow-map', { line }, say('Flow mappings ({ }) are not supported. Write 1 "key: value" on each line', '不支援流式對應（{ }）。請改寫成每行 1 個「鍵: 值」'));
  if (c === '?') throw err('yaml.complex-key', { line }, say('Complex keys (?) are not supported', '不支援複雜鍵（?）'));
  if (c === '-' && (s.length === 1 || s[1] === ' ')) throw err('yaml.dash', { line }, say('The list item "-" must stand at the start of its own line', '清單項目「-」必須自己在行首'));
  if (c === undefined || c === ':' || c === ',' || c === '[' || c === ']' || c === '%' || c === '@' || c === '`' || c === '#') {
    throw err('yaml.indicator', { line, char: c === undefined ? ':' : c }, say('Text must not start with "' + (c === undefined ? ':' : c) + '". Put it in quotes', '文字不可用「' + (c === undefined ? ':' : c) + '」開頭。請加引號'));
  }
}

/** A plain (unquoted) scalar as the YAML 1.2 core schema types it. */
function plain(s, line) {
  refuseStart(s, line);
  if (/^(?:~|[Nn]ull|NULL)$/.test(s)) return null;
  if (/^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/.test(s)) return s[0] === 't' || s[0] === 'T';
  if (/^0o[0-7]+$/.test(s) || /^0x[0-9a-fA-F]+$/.test(s) || /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/.test(s)) {
    throw err('yaml.number-form', { line, text: clip(s) }, say('"' + clip(s) + '" is written as hexadecimal, octal, infinity or not-a-number. Write a decimal number, or put it in quotes as text', '「' + clip(s) + '」是十六進位、八進位、無限大或非數字的寫法。請寫成十進位的數字，或加引號當作文字'));
  }
  let n;
  if (/^[-+]?[0-9]+$/.test(s)) n = parseInt(s, 10);
  else if (/^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/.test(s) || /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/.test(s)) n = parseFloat(s);
  else return s;
  if (!Number.isFinite(n)) throw err('yaml.number-range', { line, text: clip(s) }, say('The number "' + clip(s) + '" is too large to represent', '數字「' + clip(s) + '」太大，無法表示'));
  return n;
}

/** The quoted scalar that starts at t[at]: {value, end} with end the index after the closing quote. */
function quoted(t, at, line) {
  const q = t[at];
  let out = '';
  let i = at + 1;
  for (;;) {
    if (i >= t.length) throw err('yaml.quote-open', { line }, say('The quote does not close on the same line. Text over several lines is not supported', '引號沒有在同一行結束。不支援跨行的文字'));
    const c = t[i];
    if (q === "'") {
      if (c !== "'") { out += c; i++; continue; }
      if (t[i + 1] === "'") { out += "'"; i += 2; continue; }
      return { value: out, end: i + 1 };
    }
    if (c === '"') return { value: out, end: i + 1 };
    if (c !== '\\') { out += c; i++; continue; }
    const e = t[i + 1];
    if (e !== undefined && Object.prototype.hasOwnProperty.call(ESCAPES, e)) { out += ESCAPES[e]; i += 2; continue; }
    const size = HEX[e];
    const digits = size ? t.slice(i + 2, i + 2 + size) : '';
    const code = size && digits.length === size && /^[0-9a-fA-F]+$/.test(digits) ? parseInt(digits, 16) : NaN;
    if (!(code <= 0x10ffff)) {
      // A backslash that ends the line would join the next line: also a scalar over lines.
      if (e === undefined) throw err('yaml.quote-open', { line }, say('The quote does not close on the same line. Text over several lines is not supported', '引號沒有在同一行結束。不支援跨行的文字'));
      throw err('yaml.escape', { line, seq: '\\' + clip(e + digits) }, say('The escape "\\' + clip(e + digits) + '" in double quotes is not valid', '雙引號裡的跳脫「\\' + clip(e + digits) + '」不是有效的寫法'));
    }
    out += String.fromCodePoint(code);
    i += 2 + size;
  }
}

/** After a quoted scalar or a flow sequence only a comment may follow. */
function tail(t, at, line) {
  let i = at;
  while (t[i] === ' ') i++;
  if (i < t.length && !(t[i] === '#' && i > at)) throw err('yaml.after-value', { line }, say('There is extra content after the quote or ]', '引號或 ] 後面有多餘的內容'));
}

/** [a, "b", 3]: scalars only, on one line. */
function flow(t, line) {
  const out = [];
  let i = 1;
  const skip = () => { while (t[i] === ' ') i++; };
  skip();
  if (t[i] === ']') { tail(t, i + 1, line); return out; }
  for (;;) {
    skip();
    if (i >= t.length) throw err('yaml.flow-open', { line }, say('[ is not closed by ] on the same line', '[ 沒有在同一行用 ] 結束'));
    if (t[i] === '"' || t[i] === "'") {
      const q = quoted(t, i, line);
      out.push(q.value);
      i = q.end;
    } else {
      const from = i;
      while (i < t.length && t[i] !== ',' && t[i] !== ']') {
        const c = t[i];
        if (c === '[' || c === '{' || c === '}') throw err('yaml.flow-nested', { line }, say('[ ] takes only scalars, not another [ ] or { }', '[ ] 裡面只能放純量，不可再放 [ ] 或 { }'));
        if (c === '#' || (c === ':' && (i + 1 >= t.length || ' ,]'.includes(t[i + 1])))) {
          throw err('yaml.flow-syntax', { line }, say('An item inside [ ] contains "' + c + '". Put that item in quotes', '[ ] 裡面的項目含有「' + c + '」。請把這個項目加上引號'));
        }
        i++;
      }
      const raw = rtrim(t.slice(from, i));
      if (raw === '') throw err('yaml.flow-empty', { line }, say('[ ] has an empty item, or an extra comma at the end', '[ ] 裡面有空的項目，或結尾多了逗號'));
      out.push(plain(raw, line));
    }
    skip();
    if (t[i] === ']') { tail(t, i + 1, line); return out; }
    if (t[i] !== ',') throw err(i >= t.length ? 'yaml.flow-open' : 'yaml.flow-syntax', { line }, i >= t.length ? say('[ is not closed by ] on the same line', '[ 沒有在同一行用 ] 結束') : say('Items inside [ ] must be separated by commas', '[ ] 裡面的項目之間必須用逗號分隔'));
    i++;
    skip();
    if (t[i] === ']') throw err('yaml.flow-empty', { line }, say('[ ] has an empty item, or an extra comma at the end', '[ ] 裡面有空的項目，或結尾多了逗號'));
  }
}

/** A value written on the line: a quoted or plain scalar, or a flow sequence. */
function value(t, line) {
  if (t[0] === '"' || t[0] === "'") { const q = quoted(t, 0, line); tail(t, q.end, line); return q.value; }
  if (t[0] === '[') return flow(t, line);
  const s = rtrim(t.slice(0, commentAt(t, 0)));
  refuseStart(s, line);
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ':' && (i + 1 === s.length || s[i + 1] === ' ')) throw err('yaml.nested-colon', { line }, say('The value contains ": " or ends with ":". Put the value in quotes', '值裡面有「: 」或以「:」結尾。請把值加上引號'));
  }
  return plain(s, line);
}

/** 'key: rest' → {key, rest} (rest without its comment when it is only a comment), or null when the line has no key. */
function entry(t, line) {
  let key, at;
  if (t[0] === '[') return null;
  if (t[0] === '"' || t[0] === "'") {
    const q = quoted(t, 0, line);
    at = q.end;
    while (t[at] === ' ') at++;
    if (t[at] !== ':' || (at + 1 < t.length && t[at + 1] !== ' ')) return null;
    key = q.value;
  } else {
    refuseStart(t, line);
    at = -1;
    const stop = commentAt(t, 0);
    for (let i = 0; i < stop; i++) if (t[i] === ':' && (i + 1 === t.length || t[i + 1] === ' ')) { at = i; break; }
    if (at < 0) return null;
    const raw = rtrim(t.slice(0, at));
    key = plain(raw, line);
    if (typeof key !== 'string') throw err('yaml.key-type', { line, key: clip(raw) }, say('The key "' + clip(raw) + '" would be read as a number, a boolean or null. Put it in quotes', '鍵「' + clip(raw) + '」會被讀成數字、布林值或空值。請加引號'));
    if (key === '<<') throw err('yaml.merge-key', { line }, say('Merge keys (<<) are not supported', '不支援合併鍵（<<）'));
  }
  if (key.length > MAX_KEY) throw err('yaml.key-long', { line, max: MAX_KEY }, say('The key is longer than ' + MAX_KEY + ' characters', '鍵超過 ' + MAX_KEY + ' 個字元'));
  let rest = t.slice(at + 1);
  let i = 0;
  while (rest[i] === ' ') i++;
  rest = rest.slice(i);
  return { key, rest: rest[0] === '#' ? '' : rest };
}

/** Reads YAML text of the subset above into plain values: objects, arrays, strings, numbers, booleans, null. */
export function parseYamlLite(text) {
  const src = String(text);
  const lines = []; // the lines that hold something: {line (from 1), indent, text (no indent, no trailing spaces)}
  (src.charCodeAt(0) === 0xfeff ? src.slice(1) : src).split('\n').forEach((row, i) => {
    const line = i + 1;
    const s = row.endsWith('\r') ? row.slice(0, -1) : row;
    if (s.includes('\t')) throw err('yaml.tab', { line }, say('There is a tab character. Indent with spaces; write a tab in text as \\t inside double quotes', '有 Tab 字元。縮排請用空白；文字裡的 Tab 請在雙引號裡寫成 \\t'));
    if (CONTROL.test(s)) throw err('yaml.control', { line }, say('There is a control character or an unsupported line break character', '有控制字元或不支援的換行字元'));
    const body = rtrim(s);
    let indent = 0;
    while (body[indent] === ' ') indent++;
    if (indent === body.length || body[indent] === '#') return;
    lines.push({ line, indent, text: body.slice(indent) });
  });
  if (lines.length && lines[0].indent === 0 && lines[0].text[0] === '%') throw err('yaml.directive', { line: lines[0].line }, say('Directives (%) are not supported', '不支援指令（%）'));
  if (lines.length && lines[0].indent === 0 && /^---(?: +#.*)?$/.test(lines[0].text)) lines.shift();
  lines.forEach((l, i) => {
    if (l.indent !== 0 || !/^(?:---|\.\.\.)(?: |$)/.test(l.text)) return;
    if (i === 0 && l.text.startsWith('---')) throw err('yaml.doc-inline', { line: l.line }, say('Nothing may follow --- on the same line', '--- 的同一行不可有內容'));
    throw err('yaml.multi-doc', { line: l.line }, say('Multiple documents (--- and ...) are not supported. 1 file holds only 1 document', '不支援多份文件（--- 與 ...）。1 個檔案只能有 1 份'));
  });

  let pos = 0;
  const more = () => pos < lines.length;
  const bad = (l) => err('yaml.indent', { line: l.line }, say('The indent does not line up with the content above', '縮排與上面的內容對不起來'));
  const noMore = (indent) => {
    if (more() && lines[pos].indent > indent) throw err('yaml.multiline', { line: lines[pos].line }, say('This line is indented more than the line above, but that line already has a value. Text over several lines is not supported', '這一行的縮排比上一行多，但上一行已經有值。不支援跨行的文字'));
  };

  function node(depth) {
    const l = lines[pos];
    if (depth > MAX_DEPTH) throw err('yaml.depth', { line: l.line, max: MAX_DEPTH }, say('Nesting is deeper than ' + MAX_DEPTH + ' levels', '巢狀超過 ' + MAX_DEPTH + ' 層'));
    if (isSeq(l.text)) return seq(l.indent, depth);
    if (entry(l.text, l.line)) return map(l.indent, depth);
    throw err('yaml.no-colon', { line: l.line }, say('This line is neither "key: value" nor "- item". Text over several lines is not supported', '這一行不是「鍵: 值」，也不是「- 項目」。不支援跨行的文字'));
  }

  function seq(indent, depth) {
    const out = [];
    while (more()) {
      const l = lines[pos];
      if (l.indent < indent) break;
      if (l.indent > indent) throw bad(l);
      if (!isSeq(l.text)) break;
      let k = 1;
      while (l.text[k] === ' ') k++;
      const rest = l.text.slice(k);
      if (rest === '' || rest[0] === '#') {
        pos++;
        out.push(more() && lines[pos].indent > indent ? node(depth + 1) : null);
      } else if (isSeq(rest) || entry(rest, l.line)) {
        // '- key: value' and '- - item': what follows the dash is a block of its own, at the column where it starts.
        lines[pos] = { line: l.line, indent: indent + k, text: rest };
        out.push(node(depth + 1));
      } else {
        out.push(value(rest, l.line));
        pos++;
        noMore(indent);
      }
    }
    return out;
  }

  function map(indent, depth) {
    const out = {};
    const seen = new Set();
    while (more()) {
      const l = lines[pos];
      if (l.indent < indent) break;
      if (l.indent > indent) throw bad(l);
      if (isSeq(l.text)) break;
      const e = entry(l.text, l.line);
      if (!e) throw err('yaml.no-colon', { line: l.line }, say('This line is neither "key: value" nor "- item". Text over several lines is not supported', '這一行不是「鍵: 值」，也不是「- 項目」。不支援跨行的文字'));
      if (seen.has(e.key)) throw err('yaml.duplicate-key', { line: l.line, key: clip(e.key) }, say('The key "' + clip(e.key) + '" is repeated', '鍵「' + clip(e.key) + '」重複'));
      seen.add(e.key);
      pos++;
      let v;
      if (e.rest !== '') { v = value(e.rest, l.line); noMore(indent); }
      else if (more() && lines[pos].indent > indent) v = node(depth + 1);
      // A list may sit at its key's own indent.
      else if (more() && lines[pos].indent === indent && isSeq(lines[pos].text)) v = seq(indent, depth + 1);
      else v = null;
      // As the yaml package does: a key named __proto__ is a field of its own, not the object's prototype.
      Object.defineProperty(out, e.key, { value: v, writable: true, enumerable: true, configurable: true });
    }
    return out;
  }

  if (!lines.length) return null;
  let out;
  if (lines.length === 1 && !isSeq(lines[0].text) && !entry(lines[0].text, lines[0].line)) { out = value(lines[0].text, lines[0].line); pos = 1; }
  else out = node(0);
  if (more()) throw bad(lines[pos]);
  return out;
}
