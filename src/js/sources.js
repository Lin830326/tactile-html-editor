/* Tactile — sources.js: the source files a report takes its numbers from, read in the browser.
 *
 * A dropped .xlsx becomes {source, facts}: the same shape, by the same code (workbook-core.js, generated from
 * ingest/src/workbook.mjs) and the same library as `tactile-ingest ingest`, so that a report filled here can be
 * checked against the file with `tactile-ingest verify`. The files stay in this tab's memory: nothing is stored
 * and nothing is sent anywhere by reading them.
 *
 *   HE.sources = {read(file), add(file), remove(name), all(), fact(id), available, SourceError}
 *   read(file) -> Promise<{source: {file, sha256, bytes, sheets}, facts: [...]}>   (does not keep it)
 *   add(file)  -> the same, and keeps it; a file of the same name is replaced. Emits 'sources:changed'.
 */
(function () {
  'use strict';
  const HE = window.HE;
  const t = HE.t;

  const MAX_BYTES = 30 * 1024 * 1024; // a workbook past this is read too slowly to do it without asking
  const list = []; // [{source, facts, byId: Map(id -> fact)}]

  /** A file that cannot be read; its message is for the user. */
  class SourceError extends Error {}

  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  const available = () => !!(window.XLSX && HE.workbookCore && window.crypto && window.crypto.subtle);

  async function read(file) {
    const name = String((file && file.name) || '');
    if (!/\.xlsx$/i.test(name)) throw new SourceError(t('「{name}」不是 .xlsx 檔案', { name }));
    if (name.includes('/')) throw new SourceError(t('檔名「{name}」不可包含 /', { name }));
    if (file.size > MAX_BYTES) throw new SourceError(t('「{name}」有 {size}，超過 30 MB 的上限', { name, size: HE.util.bytes ? HE.util.bytes(file.size) : file.size + ' bytes' }));
    if (!available()) throw new SourceError(t('這個瀏覽器或這個版本無法讀取試算表'));
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha256 = hex(await window.crypto.subtle.digest('SHA-256', bytes));
    // The reader's own messages (a formula with no stored result, a file that is not a workbook) are written in
    // Chinese for the command-line tool; each carries a code, and the editor says it in the interface language.
    const core = HE.workbookCore(window.XLSX, (message, code, vars) => new SourceError(HE.ingestText ? HE.ingestText({ message, code, vars }) : message));
    return core.readWorkbook(bytes, name, sha256);
  }

  async function add(file) {
    const got = await read(file);
    const entry = { source: got.source, facts: got.facts, byId: new Map(got.facts.map((f) => [f.id, f])) };
    const at = list.findIndex((e) => e.source.file === entry.source.file);
    if (at >= 0) list[at] = entry; else list.push(entry);
    HE.emit('sources:changed', { file: entry.source.file });
    return got;
  }

  function remove(name) {
    const at = list.findIndex((e) => e.source.file === name);
    if (at < 0) return false;
    list.splice(at, 1);
    HE.emit('sources:changed', { file: name });
    return true;
  }

  function fact(id) {
    for (const e of list) { const f = e.byId.get(id); if (f) return f; }
    return null;
  }

  /* ---- What the AI's tools read. Plain data, short enough to send. ---- */

  const cellOf = (file, id) => { const rest = id.slice(file.length + 1); const at = rest.lastIndexOf('/'); return { sheet: rest.slice(0, at), cell: rest.slice(at + 1) }; };
  /** One fact as the model reads it: the ID to cite, what the cell holds, and what tells the cell apart. */
  function brief(f) {
    const out = { id: f.id, type: f.type, value: f.value };
    if (String(f.text) !== String(f.value)) out.text = f.text;
    if (f.formula !== undefined) out.formula = '=' + f.formula;
    if (f.labels) out.labels = f.labels;
    return out;
  }

  /** Every source of the tab: its sheets, their used ranges, how many cells. */
  function overview() {
    return list.map((e) => ({
      file: e.source.file,
      cells: e.facts.length,
      sheets: e.source.sheets.map((s) => ({ name: s.name, range: s.range, hidden: s.hidden || undefined })),
    }));
  }

  /** The cells of one sheet inside a range ('A1:D20'; the whole sheet without one), at most `limit`. */
  function range(file, sheet, ref, limit = 300) {
    const e = list.find((x) => x.source.file === file);
    if (!e) throw new SourceError('No source file named "' + file + '". Files: ' + (list.map((x) => x.source.file).join(', ') || 'none'));
    const meta = e.source.sheets.find((s) => s.name === sheet);
    if (!meta) throw new SourceError('"' + file + '" has no sheet named "' + sheet + '". Sheets: ' + e.source.sheets.map((s) => s.name).join(', '));
    let box = null;
    if (ref) {
      try { box = window.XLSX.utils.decode_range(String(ref).replace(/\$/g, '')); } catch (err) { box = null; }
      if (!box || !(box.s.r >= 0) || !(box.e.r >= 0)) throw new SourceError('"' + ref + '" is not a range such as A1:D20.');
    }
    const cells = [];
    let more = 0;
    for (const f of e.facts) {
      const at = cellOf(file, f.id);
      if (at.sheet !== sheet) continue;
      if (box) {
        const c = window.XLSX.utils.decode_cell(at.cell);
        if (c.r < box.s.r || c.r > box.e.r || c.c < box.s.c || c.c > box.e.c) continue;
      }
      if (cells.length < limit) cells.push(brief(f)); else more++;
    }
    return { file, sheet, range: ref || meta.range, cells, more: more || undefined };
  }

  /** Cells whose text, value, formula or headings contain the words asked for (all of them), at most `limit`. */
  function search(query, limit = 40) {
    const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) throw new SourceError('query is empty.');
    const hits = [];
    let more = 0;
    for (const e of list) {
      for (const f of e.facts) {
        const hay = [f.id, f.text, f.value, f.formula, f.labels && f.labels.row, f.labels && f.labels.col].filter((v) => v !== undefined && v !== null).join('\n').toLowerCase();
        if (!words.every((w) => hay.includes(w))) continue;
        if (hits.length < limit) hits.push(brief(f)); else more++;
      }
    }
    return { query, cells: hits, more: more || undefined };
  }

  HE.sources = {
    read, add, remove, fact, overview, range, search,
    all: () => list.map((e) => ({ source: e.source, facts: e.facts })),
    get available() { return available(); },
    SourceError,
  };
})();
