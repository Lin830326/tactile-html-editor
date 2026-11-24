// Reads a PDF into facts. A PDF stores characters and where each one is drawn; it stores no lines, no columns and
// no tables. Everything below the page number is therefore worked out here, from the coordinates:
//
//   <file>/p<n>/<column><line>    page n; `line` is the n-th line of text from the top, `column` the n-th piece
//                                 of that line, where pieces are parted by a gap wider than 2 em
//   <file>/p<n>n/<column><line>   the 1st, 2nd… number that stands inside the text pieces of that line
//
// Where the rules cannot tell, the result is text and never a number: characters of two sizes, or drawn over each
// other, are joined with a space, so a footnote mark after a figure does not become its last digit.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { guessLabels, IngestError, ordered } from './ingest.mjs';
import { say } from './lang.mjs';
import { numbersIn, parseNumberText } from './number.mjs';

const COLUMN_GAP = 2; // em: a wider gap starts a new piece
const WORD_GAP = 0.2; // em: a wider gap is written as a space
const SAME_LINE = 0.5; // em of the larger text: baselines closer than this are one line, so a raised mark stays in its line
const SAME_SIZE = 0.05; // share of the size: closer than this is the same size
const SAME_BASE = 0.1; // em: closer than this is the same baseline

let library;
/** pdf.js, loaded when the first PDF is read: it needs a newer Node than the rest of this package. */
async function pdfjs() {
  if (library) return library;
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    throw new IngestError(say('Reading a PDF needs Node 22.13 or later. This is ' + process.versions.node, '讀取 PDF 需要 Node 22.13 以上。目前是 ' + process.versions.node));
  }
  // The library reports, as it loads, that it has no canvas to draw on. Reading text needs none.
  const warn = console.warn;
  console.warn = () => {};
  try { library = await import('pdfjs-dist/legacy/build/pdf.mjs'); } finally { console.warn = warn; }
  return library;
}

// The library wants its data folders with forward slashes and one at the end.
const dataFolder = (name) => path.join(path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')), name).split(path.sep).join('/') + '/';

const times = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

/**
 * The lines of one page, top to bottom, each a list of pieces (strings), left to right.
 * items: [{str, x, y, width, em}] with y counted downwards. Exported for tests.
 */
export function linesOf(items) {
  const sorted = items.filter((it) => it.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const line = lines[lines.length - 1];
    if (line && it.y - line.y <= SAME_LINE * Math.max(it.em, line.em)) line.items.push(it);
    else lines.push({ y: it.y, em: it.em, items: [it] });
  }
  return lines.map((line) => {
    const pieces = [];
    let prev = null;
    for (const it of line.items.sort((a, b) => a.x - b.x || a.y - b.y)) {
      const str = it.str.replace(/\s+/g, ' ');
      if (!prev) { pieces.push(str); prev = it; continue; }
      const em = Math.max(prev.em, it.em);
      const gap = it.x - (prev.x + prev.width);
      const alike = Math.abs(prev.em - it.em) <= SAME_SIZE * em && Math.abs(prev.y - it.y) <= SAME_BASE * em;
      if (gap > COLUMN_GAP * em) pieces.push(str);
      else if (alike && gap <= WORD_GAP * em && gap >= -WORD_GAP * em) pieces[pieces.length - 1] += str;
      else pieces[pieces.length - 1] += ' ' + str;
      prev = it;
    }
    return pieces.map((s) => plain(s).replace(/ +/g, ' ').trim()).filter(Boolean);
  }).filter((pieces) => pieces.length);
}

// Some PDFs name a character by its Kangxi radical (U+2F00 to U+2FD5: ⾏ for 行). Each has one ordinary character it
// stands for, and that one is written, so that the text can be found by typing it.
const plain = (s) => s.replace(/[⼀-⿕]/g, (ch) => ch.normalize('NFKC'));

const colName = (c) => XLSX.utils.encode_col(c);

/** One PDF as {source, facts}, in the shape readWorkbook returns. */
export async function readPdf(bytes, file) {
  if (bytes.length < 5 || Buffer.from(bytes.subarray(0, 1024)).indexOf('%PDF-') < 0) {
    throw new IngestError(say('Cannot read "' + file + '": the content is not in PDF format', '無法讀取「' + file + '」：內容不是 PDF 格式'));
  }
  const lib = await pdfjs();
  const task = lib.getDocument({
    data: new Uint8Array(bytes), // a copy: the library takes the array it is given
    verbosity: 0,
    isEvalSupported: false,
    enableXfa: false,
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: true,
    cMapUrl: dataFolder('cmaps'),
    cMapPacked: true,
    standardFontDataUrl: dataFolder('standard_fonts'),
  });
  const pages = [];
  try {
    const doc = await task.promise;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const view = page.getViewport({ scale: 1 }).transform; // turns the page upright and counts y downwards
      const content = await page.getTextContent({ includeMarkedContent: false });
      const items = [];
      for (const it of content.items) {
        if (typeof it.str !== 'string') continue;
        const m = times(view, it.transform);
        const em = Math.hypot(m[0], m[1]);
        // Only text that runs left to right on the upright page: turned and vertical text has no line here.
        if (!(em > 0) || m[0] <= 0 || Math.abs(m[1]) > 0.02 * em || it.dir === 'ttb') continue;
        items.push({ str: it.str, x: m[4], y: m[5], width: it.width, em });
      }
      pages.push(linesOf(items));
      page.cleanup();
    }
  } catch (err) {
    if (err instanceof IngestError) throw err;
    if (err && err.name === 'PasswordException') throw new IngestError(say('Cannot read "' + file + '": this PDF has a password. Remove the password first', '無法讀取「' + file + '」：這個 PDF 有密碼。請先移除密碼'));
    throw new IngestError(say('Cannot read "' + file + '": this is not a valid PDF file (' + (err && err.message) + ')', '無法讀取「' + file + '」：這不是有效的 PDF 檔案（' + (err && err.message) + '）'));
  } finally {
    await task.destroy();
  }
  if (!pages.some((lines) => lines.length)) {
    throw new IngestError(say('"' + file + '" holds no text. If it is a scanned image, run text recognition (OCR) on it first, then ingest it again', '「' + file + '」沒有文字。如果它是掃描的影像，請先做文字辨識（OCR），再重新擷取'));
  }

  const source = { file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, sheets: [] };
  const facts = [];
  const finish = (name, known, label) => {
    if (!known.size) return;
    let c1 = 0, r0 = Infinity, r1 = -1;
    if (label) guessLabels(known);
    for (const fact of known.values()) {
      const { r, c } = fact._at;
      c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      delete fact._at;
      facts.push(ordered(fact));
    }
    source.sheets.push({ name, range: 'A' + (r0 + 1) + ':' + colName(c1) + (r1 + 1), hidden: false });
  };
  pages.forEach((lines, p) => {
    const grid = new Map();
    const inText = new Map();
    lines.forEach((pieces, r) => {
      let k = 0;
      pieces.forEach((text, c) => {
        const value = parseNumberText(text);
        const id = file + '/p' + (p + 1) + '/' + colName(c) + (r + 1);
        grid.set(colName(c) + (r + 1), value === null ? { id, type: 'text', value: text, text, _at: { r, c } } : { id, type: 'number', value, text, _at: { r, c } });
        if (value !== null) return;
        for (const num of numbersIn(text)) {
          const addr = colName(k) + (r + 1);
          inText.set(addr, { id: file + '/p' + (p + 1) + 'n/' + addr, type: 'number', value: num.value, text: num.text, labels: { row: text }, _at: { r, c: k } });
          k++;
        }
      });
    });
    finish('p' + (p + 1), grid, true);
    finish('p' + (p + 1) + 'n', inText, false);
  });
  return { source, facts };
}
