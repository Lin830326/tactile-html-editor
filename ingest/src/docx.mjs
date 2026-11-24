// Reads a Word document (.docx) into facts. What the file stores is kept as it is: which table, which row, which
// cell, and the characters in it. What is worked out here is whether those characters are a number (number.mjs).
//
//   <file>/t<n>/<cell>     cell of the n-th table, in document order; a nested table has a number of its own
//   <file>/body/A<n>       the n-th paragraph outside tables
//   <file>/body/B<n>, C<n> the 1st, 2nd… number that stands in that paragraph
import { createHash } from 'node:crypto';
import * as XLSX from 'xlsx';
import { guessLabels, IngestError, ordered } from './ingest.mjs';
import { say } from './lang.mjs';
import { numbersIn, parseNumberText } from './number.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (all, e) => {
  if (e[0] !== '#') return Object.prototype.hasOwnProperty.call(ENTITIES, e) ? ENTITIES[e] : all;
  const code = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
});

/** A small XML reader for the well-formed files Word writes: {name, attrs, kids}, text as strings. */
function parseXml(xml) {
  const root = { name: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([^\s>]+)\s*>|<([^\s>\/!?]+)((?:\s+[^\s=>\/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.kids.push(m[1]);
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      const el = { name: m[3], attrs: {}, kids: [] };
      for (const a of m[4].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) el.attrs[a[1]] = decode(a[2] !== undefined ? a[2] : a[3]);
      top.kids.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6] !== undefined) top.kids.push(decode(m[6]));
  }
  return root;
}

const child = (el, name) => el.kids.find((k) => k.name === name);
// Wrappers whose content stands where they stand: content controls, tracked insertions, smart tags.
const THROUGH = new Set(['w:sdt', 'w:sdtContent', 'w:ins', 'w:moveTo', 'w:smartTag', 'w:customXml', 'w:hyperlink', 'w:fldSimple', 'w:r', 'mc:AlternateContent', 'mc:Choice']);
// Not the document's text: deleted text, the older copy of a drawing, field codes, text boxes and drawings.
const SKIP = new Set(['w:del', 'w:moveFrom', 'mc:Fallback', 'w:instrText', 'w:delText', 'w:pict', 'w:drawing', 'w:object', 'w:rPr', 'w:pPr']);

/** The paragraphs and tables that are direct content of `el` (a body or a table cell), in order. */
function blocks(el, out = []) {
  for (const k of el.kids) {
    if (typeof k === 'string') continue;
    if (k.name === 'w:p' || k.name === 'w:tbl') out.push(k);
    else if (THROUGH.has(k.name)) blocks(k, out);
  }
  return out;
}

function paraText(p) {
  let s = '';
  const walk = (el) => {
    for (const k of el.kids) {
      if (typeof k === 'string' || SKIP.has(k.name)) continue;
      if (k.name === 'w:t') s += k.kids.filter((x) => typeof x === 'string').join('');
      else if (k.name === 'w:tab') s += '\t';
      else if (k.name === 'w:br' || k.name === 'w:cr') s += '\n';
      else if (k.name === 'w:noBreakHyphen') s += '-';
      else walk(k);
    }
  };
  walk(p);
  return s;
}

const colName = (c) => XLSX.utils.encode_col(c);

function cellFact(id, text) {
  const value = parseNumberText(text);
  return value === null ? { id, type: 'text', value: text, text } : { id, type: 'number', value, text };
}

/** One document as {source, facts}, in the shape readWorkbook returns. */
export function readDocx(bytes, file) {
  const notDocx = () => new IngestError(say('Cannot read "' + file + '": the content is not in .docx format. If it is a .doc file, save it as .docx in Word first', '無法讀取「' + file + '」：內容不是 .docx 格式。如果它是 .doc，請先用 Word 另存成 .docx'));
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) throw notDocx();
  let xml;
  try {
    const zip = XLSX.CFB.read(bytes, { type: 'buffer' });
    const entry = XLSX.CFB.find(zip, '/word/document.xml'); // the library files a zip's entries under a root of its own
    if (!entry || !entry.content) throw notDocx();
    xml = Buffer.from(entry.content).toString('utf8');
  } catch (err) {
    if (err instanceof IngestError) throw err;
    throw new IngestError(say('Cannot read "' + file + '": this is not a valid Word file (' + err.message + ')', '無法讀取「' + file + '」：這不是有效的 Word 檔案（' + err.message + '）'));
  }
  const doc = child(parseXml(xml), 'w:document');
  const body = doc && child(doc, 'w:body');
  if (!body) throw notDocx();

  const source = { file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, sheets: [] };
  const facts = [];
  const sheetOf = (name) => {
    const known = new Map();
    const sheet = { name, known, used: { r0: Infinity, c0: Infinity, r1: -1, c1: -1 } };
    return sheet;
  };
  const put = (sheet, r, c, text, make = cellFact) => {
    const addr = colName(c) + (r + 1);
    const fact = make(file + '/' + sheet.name + '/' + addr, text);
    fact._at = { r, c };
    sheet.known.set(addr, fact);
    const u = sheet.used;
    u.r0 = Math.min(u.r0, r); u.c0 = Math.min(u.c0, c); u.r1 = Math.max(u.r1, r); u.c1 = Math.max(u.c1, c);
    return fact;
  };

  const tables = [];
  function readTable(tbl) {
    const sheet = sheetOf('t' + (tables.length + 1));
    tables.push(sheet);
    const rows = [];
    const collectRows = (el) => {
      for (const k of el.kids) {
        if (typeof k === 'string') continue;
        if (k.name === 'w:tr') rows.push(k);
        else if (THROUGH.has(k.name)) collectRows(k);
      }
    };
    collectRows(tbl);
    const open = new Map(); // column → the fact a vertical merge started in
    rows.forEach((tr, r) => {
      const trPr = child(tr, 'w:trPr');
      const before = trPr && child(trPr, 'w:gridBefore');
      let c = before ? Number(before.attrs['w:val']) || 0 : 0;
      const cells = [];
      const collectCells = (el) => {
        for (const k of el.kids) {
          if (typeof k === 'string') continue;
          if (k.name === 'w:tc') cells.push(k);
          else if (THROUGH.has(k.name)) collectCells(k);
        }
      };
      collectCells(tr);
      const seen = new Set();
      for (const tc of cells) {
        const pr = child(tc, 'w:tcPr');
        const spanEl = pr && child(pr, 'w:gridSpan');
        const span = Math.max(1, spanEl ? Number(spanEl.attrs['w:val']) || 1 : 1);
        const vm = pr && child(pr, 'w:vMerge');
        const inner = blocks(tc);
        for (const b of inner) if (b.name === 'w:tbl') readTable(b);
        if (vm && vm.attrs['w:val'] !== 'restart') {
          // The lower part of a vertical merge: the cell above holds the content.
          const top = open.get(c);
          if (top) { top._merge.r1 = r; seen.add(c); }
          c += span;
          continue;
        }
        const text = inner.filter((b) => b.name === 'w:p').map(paraText).join('\n').trim();
        if (text) {
          const fact = put(sheet, r, c, text);
          fact._merge = { r0: r, c0: c, r1: r, c1: c + span - 1 };
          if (vm) { open.set(c, fact); seen.add(c); }
        }
        c += span;
      }
      for (const key of [...open.keys()]) if (!seen.has(key)) open.delete(key);
    });
  }

  const paragraphs = sheetOf('body');
  let n = 0;
  for (const b of blocks(body)) {
    if (b.name === 'w:tbl') { readTable(b); continue; }
    const r = n++;
    const text = paraText(b).trim();
    if (!text) continue;
    const first = put(paragraphs, r, 0, text);
    if (first.type !== 'text') continue;
    numbersIn(text).forEach((num, i) => put(paragraphs, r, i + 1, num.text, (id, t) => ({ id, type: 'number', value: num.value, text: t })));
  }

  for (const sheet of [paragraphs, ...tables]) {
    if (sheet === paragraphs && !sheet.known.size) continue;
    guessLabels(sheet.known);
    const u = sheet.used;
    source.sheets.push({ name: sheet.name, range: u.r1 < 0 ? '' : colName(u.c0) + (u.r0 + 1) + ':' + colName(u.c1) + (u.r1 + 1), hidden: false });
    for (const fact of sheet.known.values()) {
      const m = fact._merge;
      if (m && (m.r1 > m.r0 || m.c1 > m.c0)) fact.merge = colName(m.c0) + (m.r0 + 1) + ':' + colName(m.c1) + (m.r1 + 1);
      delete fact._merge;
      delete fact._at;
      facts.push(ordered(fact));
    }
  }
  return { source, facts };
}
