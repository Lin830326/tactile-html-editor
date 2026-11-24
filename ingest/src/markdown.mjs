// The reading layer (facts.md) of docs/spec/provenance.md: made from facts.json alone, for an AI to read.
import { kindNote } from './ingest.mjs';
import { say } from './lang.mjs';

const A = 'A'.charCodeAt(0);

export function colName(c) {
  let s = '';
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(A + ((n - 1) % 26)) + s;
  return s;
}

/** "D14" → {c: 3 (from 0), r: 14 (the row number)}. */
export function parseCell(addr) {
  const m = /^([A-Z]+)([0-9]+)$/.exec(addr);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - A + 1);
  return { c: c - 1, r: Number(m[2]) };
}

export const inCell = (text) => String(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\s*[\r\n]+\s*/g, ' ');
export const inCode = (text) => (String(text).includes('`') ? '`` ' + text + ' ``' : '`' + text + '`');

/** facts (the object buildFacts returns, or facts.json parsed) → Markdown text. */
export function factsToMarkdown(facts) {
  const lines = [];
  for (const source of facts.sources) {
    lines.push('# ' + source.file, '');
    const note = kindNote(source.file);
    if (note) lines.push(note, '');
    for (const sheet of source.sheets) {
      const prefix = source.file + '/' + sheet.name + '/';
      const cells = facts.facts.filter((f) => f.id.startsWith(prefix) && /^[A-Z]+[0-9]+$/.test(f.id.slice(prefix.length)));
      lines.push('## ' + sheet.name + (sheet.hidden ? say(' (hidden sheet)', '（隱藏的工作表）') : ''), '');
      if (!cells.length) { lines.push(say('This sheet is empty.', '這個工作表沒有內容。'), ''); continue; }
      const first = cells[0].id.slice(prefix.length);
      lines.push(say('ID syntax: ' + inCode(prefix + '<cell>') + ', for example ' + inCode(prefix + first) + '.', 'ID 的寫法：' + inCode(prefix + '<儲存格>') + '，例如 ' + inCode(prefix + first) + '。'), '');
      const rows = new Map();
      let c0 = Infinity, c1 = -1;
      for (const f of cells) {
        const { r, c } = parseCell(f.id.slice(prefix.length));
        if (!rows.has(r)) rows.set(r, new Map());
        rows.get(r).set(c, f);
        c0 = Math.min(c0, c); c1 = Math.max(c1, c);
      }
      const cols = [];
      for (let c = c0; c <= c1; c++) cols.push(c);
      lines.push('|  | ' + cols.map(colName).join(' | ') + ' |');
      lines.push('|---|' + cols.map(() => '---').join('|') + '|');
      for (const r of [...rows.keys()].sort((a, b) => a - b)) {
        const row = rows.get(r);
        lines.push('| ' + r + ' | ' + cols.map((c) => (row.has(c) ? inCell(row.get(c).text) : '')).join(' | ') + ' |');
      }
      lines.push('');
      const formulas = cells.filter((f) => f.formula);
      if (formulas.length) {
        lines.push(say('Formulas:', '公式：'), '');
        for (const f of formulas) lines.push('- ' + inCode(f.id.slice(prefix.length)) + ' = ' + inCode(f.formula));
        lines.push('');
      }
      const merged = cells.filter((f) => f.merge);
      if (merged.length) {
        lines.push(say('Merged cells (the content is in the top left cell): ' + merged.map((f) => inCode(f.merge)).join(', '), '合併儲存格（內容在左上角那一格）：' + merged.map((f) => inCode(f.merge)).join('、')), '');
      }
    }
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}
