// Questions about a facts.json, answered a piece at a time: for an AI whose context cannot hold all of facts.md.
// Every answer is text made from the facts alone; nothing here reads a source file.
import { kindNote } from './ingest.mjs';
import { say } from './lang.mjs';
import { colName, inCell, inCode, parseCell } from './markdown.mjs';

/** A question that cannot be answered as asked. The message says what to ask instead. */
export class QueryError extends Error {}

const CELL = /^[A-Z]{1,3}[0-9]{1,7}$/;
const TYPES = ['number', 'text', 'date', 'bool', 'error'];
export const LIMITS = { cells: 400, cellsMax: 2000, ids: 100, hits: 20, hitsMax: 100, depth: 2, depthMax: 5, nodes: 200 };

/** facts (facts.json parsed) → an index the functions below read. */
export function indexFacts(facts) {
  if (!facts || typeof facts !== 'object' || !Array.isArray(facts.sources) || !Array.isArray(facts.facts)) {
    throw new QueryError(say('This is not a facts.json: sources and facts are not found. Make one with tactile-ingest ingest', '這不是 facts.json：找不到 sources 與 facts。請用 tactile-ingest ingest 產生'));
  }
  const sheets = new Map();
  for (const source of facts.sources) {
    for (const sheet of source.sheets || []) {
      sheets.set(source.file + '/' + sheet.name, { file: source.file, name: sheet.name, hidden: !!sheet.hidden, range: sheet.range || '', cells: [] });
    }
  }
  const byId = new Map();
  for (const fact of facts.facts) {
    if (!fact || typeof fact.id !== 'string') continue;
    byId.set(fact.id, fact);
    // A file name and a sheet name hold no "/", so the last one ends the sheet.
    const cut = fact.id.lastIndexOf('/');
    const sheet = sheets.get(fact.id.slice(0, cut));
    const addr = fact.id.slice(cut + 1);
    if (!sheet || !CELL.test(addr)) continue;
    const { r, c } = parseCell(addr);
    sheet.cells.push({ fact, r, c, addr });
  }
  for (const s of sheets.values()) s.cells.sort((a, b) => a.r - b.r || a.c - b.c);
  return { facts, sheets, byId };
}

const count = (n) => n.toLocaleString('en-US');
const labelsOf = (fact) => (fact.labels ? [fact.labels.row, fact.labels.col].filter((x) => x !== undefined).join(' › ') : '');

/** What was read: every file with its SHA-256, and every sheet with its range and how much it holds. */
export function overview(ix) {
  const f = ix.facts;
  const lines = [say('Source files: ' + f.sources.length + '. Cells: ' + count(f.facts.length) + '.' + (f.createdAt ? ' Ingested at: ' + f.createdAt + '.' : ''), '來源檔 ' + f.sources.length + ' 個，儲存格 ' + count(f.facts.length) + ' 個。' + (f.createdAt ? '擷取時間：' + f.createdAt + '。' : '')), ''];
  for (const source of f.sources) {
    lines.push('# ' + source.file, '', say('- SHA-256: ' + inCode(source.sha256) + ', ' + count(source.bytes) + ' bytes', '- SHA-256：' + inCode(source.sha256) + '，' + count(source.bytes) + ' 位元組'));
    if (kindNote(source.file)) lines.push('- ' + kindNote(source.file));
    for (const s of source.sheets || []) {
      const sheet = ix.sheets.get(source.file + '/' + s.name);
      const formulas = sheet.cells.filter((x) => x.fact.formula).length;
      lines.push(say(
        '- Sheet ' + inCode(s.name) + (s.hidden ? ' (hidden)' : '') + ': ' +
        (sheet.cells.length ? 'range ' + s.range + ', cells ' + count(sheet.cells.length) + ', formulas ' + count(formulas) : 'empty'),
        '- 工作表 ' + inCode(s.name) + (s.hidden ? '（隱藏）' : '') + '：' +
        (sheet.cells.length ? '範圍 ' + s.range + '，儲存格 ' + count(sheet.cells.length) + ' 個，公式 ' + count(formulas) + ' 個' : '沒有內容')));
    }
    lines.push('');
  }
  lines.push(say('ID syntax: ' + inCode('<file>/<sheet>/<cell>') + '.', 'ID 的寫法：' + inCode('<檔名>/<工作表>/<儲存格>') + '。'));
  return lines.join('\n');
}

function pickSheet(ix, file, sheet) {
  const files = ix.facts.sources.map((s) => s.file);
  let f = file;
  if (f === undefined || f === '') {
    if (files.length !== 1) throw new QueryError(say('There are ' + files.length + ' source files, so file must be given: ' + files.map(inCode).join(', '), '有 ' + files.length + ' 個來源檔，必須指定 file：' + files.map(inCode).join('、')));
    f = files[0];
  }
  if (!files.includes(f)) throw new QueryError(say('There is no source file "' + f + '". There are: ' + files.map(inCode).join(', '), '沒有來源檔「' + f + '」。有的是：' + files.map(inCode).join('、')));
  const names = ix.facts.sources.find((s) => s.file === f).sheets.map((s) => s.name);
  if (sheet === undefined || sheet === '') throw new QueryError(say('sheet must be given. The sheets of "' + f + '": ' + names.map(inCode).join(', '), '必須指定 sheet。「' + f + '」的工作表：' + names.map(inCode).join('、')));
  const found = ix.sheets.get(f + '/' + sheet);
  if (!found) throw new QueryError(say('"' + f + '" has no sheet "' + sheet + '". There are: ' + names.map(inCode).join(', '), '「' + f + '」沒有工作表「' + sheet + '」。有的是：' + names.map(inCode).join('、')));
  return found;
}

function parseRange(text) {
  const m = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})(?::\$?([A-Za-z]{1,3})\$?([0-9]{1,7}))?$/.exec(String(text).trim());
  if (!m) throw new QueryError(say('The range "' + text + '" is not written correctly. Write A1:D22, or 1 cell such as D14', 'range「' + text + '」的寫法不對。寫成 A1:D22，或 1 個儲存格 D14'));
  const a = parseCell(m[1].toUpperCase() + m[2]);
  const b = m[3] ? parseCell(m[3].toUpperCase() + m[4]) : a;
  return { r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r), c0: Math.min(a.c, b.c), c1: Math.max(a.c, b.c) };
}

function limit(value, normal, most, name) {
  if (value === undefined || value === null) return normal;
  if (!Number.isInteger(value) || value < 1) throw new QueryError(say(name + ' must be a whole number of 1 or more', name + ' 必須是 1 以上的整數'));
  return Math.min(value, most);
}

/**
 * A part of one sheet as the table facts.md shows, with the formulas of that part. Rows are left out, whole,
 * once more than max_cells cells are shown; the answer then says which range to ask for next.
 */
export function readRange(ix, args = {}) {
  const sheet = pickSheet(ix, args.file, args.sheet);
  const most = limit(args.max_cells, LIMITS.cells, LIMITS.cellsMax, 'max_cells');
  const prefix = sheet.file + '/' + sheet.name + '/';
  if (!sheet.cells.length) return say('The sheet ' + inCode(sheet.name) + ' is empty.', '工作表 ' + inCode(sheet.name) + ' 沒有內容。');
  const want = args.range === undefined || args.range === '' ? null : parseRange(args.range);
  const inside = want ? sheet.cells.filter((x) => x.r >= want.r0 && x.r <= want.r1 && x.c >= want.c0 && x.c <= want.c1) : sheet.cells;
  if (!inside.length) return say(args.range + ' in the sheet ' + inCode(sheet.name) + ' is empty. The range of this sheet is ' + sheet.range + '.', '工作表 ' + inCode(sheet.name) + ' 的 ' + args.range + ' 沒有內容。這個工作表的範圍是 ' + sheet.range + '。');

  const rows = new Map();
  for (const x of inside) {
    if (!rows.has(x.r)) rows.set(x.r, []);
    rows.get(x.r).push(x);
  }
  const shown = [];
  let cells = 0;
  let next = null;
  for (const [r, list] of rows) {
    // Always one row, however wide: an answer with nothing in it would make the caller ask again for the same.
    if (shown.length && cells + list.length > most) { next = r; break; }
    shown.push([r, list]);
    cells += list.length;
  }
  let c0 = Infinity, c1 = -1;
  for (const [, list] of shown) for (const x of list) { c0 = Math.min(c0, x.c); c1 = Math.max(c1, x.c); }
  const cols = [];
  for (let c = c0; c <= c1; c++) cols.push(c);
  const lines = [
    '# ' + sheet.file + ' › ' + sheet.name + (sheet.hidden ? say(' (hidden sheet)', '（隱藏的工作表）') : ''), '',
    say('ID syntax: ' + inCode(prefix + '<cell>') + ', for example ' + inCode(prefix + shown[0][1][0].addr) + '.', 'ID 的寫法：' + inCode(prefix + '<儲存格>') + '，例如 ' + inCode(prefix + shown[0][1][0].addr) + '。'), '',
    '|  | ' + cols.map(colName).join(' | ') + ' |',
    '|---|' + cols.map(() => '---').join('|') + '|',
  ];
  for (const [r, list] of shown) {
    const at = new Map(list.map((x) => [x.c, x.fact]));
    lines.push('| ' + r + ' | ' + cols.map((c) => (at.has(c) ? inCell(at.get(c).text) : '')).join(' | ') + ' |');
  }
  lines.push('');
  const all = shown.flatMap(([, list]) => list);
  const formulas = all.filter((x) => x.fact.formula);
  if (formulas.length) {
    lines.push(say('Formulas:', '公式：'), '');
    for (const x of formulas) lines.push('- ' + inCode(x.addr) + ' = ' + inCode(x.fact.formula));
    lines.push('');
  }
  const merged = all.filter((x) => x.fact.merge);
  if (merged.length) lines.push(say('Merged cells (the content is in the top left cell): ' + merged.map((x) => inCode(x.fact.merge)).join(', '), '合併儲存格（內容在左上角那一格）：' + merged.map((x) => inCode(x.fact.merge)).join('、')), '');
  if (next !== null) {
    const last = [...rows.keys()].pop();
    const col = (c) => colName(c);
    const span = want ? [col(want.c0), col(want.c1)] : [col(Math.min(...inside.map((x) => x.c))), col(Math.max(...inside.map((x) => x.c)))];
    lines.push(say(
      'Shown up to row ' + shown[shown.length - 1][0] + ' (' + count(cells) + ' cells). Not shown: ' + count(inside.length - cells) +
      ' cells. Ask next for range ' + inCode(span[0] + next + ':' + span[1] + last) + '.',
      '只顯示到第 ' + shown[shown.length - 1][0] + ' 列（' + count(cells) + ' 個儲存格）。還有 ' + count(inside.length - cells) +
      ' 個沒有顯示。接著查 range ' + inCode(span[0] + next + ':' + span[1] + last) + '。'), '');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

/** The whole record of each fact, as JSON text: {facts: [...], notFound: [...]}. */
export function getFacts(ix, args = {}) {
  const ids = args.ids;
  if (!Array.isArray(ids) || !ids.length || ids.some((x) => typeof x !== 'string')) throw new QueryError(say('ids must be 1 or more IDs', 'ids 必須是 1 個以上的 ID'));
  if (ids.length > LIMITS.ids) throw new QueryError(say('At most ' + LIMITS.ids + ' IDs can be asked for at once. This call gave ' + ids.length, '一次最多查 ' + LIMITS.ids + ' 個 ID，這次給了 ' + ids.length + ' 個'));
  const out = { facts: [], notFound: [] };
  for (const id of new Set(ids)) {
    if (ix.byId.has(id)) out.facts.push(ix.byId.get(id));
    else out.notFound.push(id);
  }
  return JSON.stringify(out, null, 2);
}

function line(fact) {
  const labels = labelsOf(fact);
  return say(inCode(fact.id) + ' = ' + inCell(fact.text) + ' (' + fact.type + (labels ? '; ' + inCell(labels) : '') + ')', inCode(fact.id) + ' = ' + inCell(fact.text) + '（' + fact.type + (labels ? '；' + inCell(labels) : '') + '）');
}

/**
 * The cells whose text, value, headings or formula contain `query`, upper or lower case alike. A query of digits
 * also finds a number shown with separators: 482000000 finds 482,000,000.
 */
export function search(ix, args = {}) {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  if (!query) throw new QueryError(say('query must be the text or number to find', 'query 必須是要找的文字或數字'));
  if (args.type !== undefined && !TYPES.includes(args.type)) throw new QueryError(say('type must be one of: ' + TYPES.join(', '), 'type 必須是：' + TYPES.join('、')));
  const most = limit(args.limit, LIMITS.hits, LIMITS.hitsMax, 'limit');
  let pool;
  if ((args.file !== undefined && args.file !== '') || (args.sheet !== undefined && args.sheet !== '')) {
    if (args.sheet === undefined || args.sheet === '') {
      const files = ix.facts.sources.map((s) => s.file);
      if (!files.includes(args.file)) throw new QueryError(say('There is no source file "' + args.file + '". There are: ' + files.map(inCode).join(', '), '沒有來源檔「' + args.file + '」。有的是：' + files.map(inCode).join('、')));
      pool = [...ix.sheets.values()].filter((s) => s.file === args.file).flatMap((s) => s.cells.map((x) => x.fact));
    } else pool = pickSheet(ix, args.file, args.sheet).cells.map((x) => x.fact);
  } else pool = [...ix.sheets.values()].flatMap((s) => s.cells.map((x) => x.fact));

  const q = query.toLowerCase();
  const digits = /^[0-9.,\-]+$/.test(query) ? query.replace(/,/g, '') : null;
  const hit = (fact) => {
    if (args.type && fact.type !== args.type) return false;
    const parts = [fact.text, String(fact.value), fact.formula, fact.labels && fact.labels.row, fact.labels && fact.labels.col];
    if (parts.some((p) => typeof p === 'string' && p.toLowerCase().includes(q))) return true;
    return !!digits && fact.type === 'number' && (String(fact.value).includes(digits) || String(fact.text).replace(/,/g, '').includes(digits));
  };
  const hits = pool.filter(hit);
  if (!hits.length) return say('No cell contains "' + query + '".', '找不到含有「' + query + '」的儲存格。');
  const lines = [say('Cells found: ' + count(hits.length) + (hits.length > most ? '. The first ' + most + ' are shown. Narrow the search with file, sheet or type' : '') + ':', '找到 ' + count(hits.length) + ' 個儲存格' + (hits.length > most ? '，顯示前 ' + most + ' 個。用 file、sheet 或 type 縮小範圍' : '') + '：'), ''];
  for (const fact of hits.slice(0, most)) lines.push('- ' + line(fact) + (fact.formula ? say('  formula ' + inCode(fact.formula), '　公式 ' + inCode(fact.formula)) : ''));
  return lines.join('\n') + '\n';
}

/** What a cell's formula reads, and what those cells read, `depth` levels down. */
export function trace(ix, args = {}) {
  if (typeof args.id !== 'string' || !args.id) throw new QueryError(say('id must be the ID of 1 cell', 'id 必須是 1 個儲存格的 ID'));
  const top = ix.byId.get(args.id);
  if (!top) throw new QueryError(say('The ID "' + args.id + '" is not found. Find the correct ID with search_facts or read_range', '找不到 ID「' + args.id + '」。用 search_facts 或 read_range 找出正確的 ID'));
  const depth = limit(args.depth, LIMITS.depth, LIMITS.depthMax, 'depth');
  const lines = [];
  let nodes = 0;
  let cut = false;
  const walk = (fact, level, path) => {
    if (nodes >= LIMITS.nodes) { cut = true; return; }
    nodes++;
    const refs = fact.refs || [];
    lines.push('  '.repeat(level) + '- ' + line(fact) + (fact.formula ? say('  formula ' + inCode(fact.formula), '　公式 ' + inCode(fact.formula)) : ''));
    if (!refs.length) return;
    if (level >= depth) { lines.push('  '.repeat(level + 1) + say('- (reads ' + refs.length + ' cells, not expanded)', '- （讀取 ' + refs.length + ' 個儲存格，沒有展開）')); return; }
    for (const id of refs) {
      const child = ix.byId.get(id);
      if (!child) continue;
      if (path.includes(id)) { lines.push('  '.repeat(level + 1) + '- ' + inCode(id) + say(' (circular reference, not expanded again)', '（循環參照，不再展開）')); continue; }
      walk(child, level + 1, path.concat(id));
    }
  };
  walk(top, 0, [top.id]);
  if (!top.formula) lines.push('', say('This cell has no formula. Its value was typed in.', '這個儲存格沒有公式，值是直接輸入的。'));
  if (cut) lines.push('', say('Only the first ' + LIMITS.nodes + ' cells are shown.', '只顯示前 ' + LIMITS.nodes + ' 個儲存格。'));
  return lines.join('\n') + '\n';
}
