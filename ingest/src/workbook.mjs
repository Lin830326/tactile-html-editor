// Reads one .xlsx into facts (docs/spec/provenance.md 3 and 4). This file imports nothing: the command-line tool and
// the editor both run it, each with its own copy of the spreadsheet library, so that a report made in the browser
// holds the same facts as `tactile-ingest ingest` and passes `verify` against the same file.
//
// build.mjs writes src/js/workbook-core.js from this file. Change this one.
//
// XLSX: SheetJS (the build both sides use is checked to read alike, test/ingest.test.mjs).
// fail(message, code, vars): makes the error to throw for a file that cannot be read. message is the text
// tactile-ingest prints, in the language of messages (English, or Traditional Chinese when the user chose it);
// code (a short English name) and vars (what varies in the message) let the editor say the same in its interface
// language.
export function workbookReader(XLSX, fail) {
  const err = (code, vars, message) => fail(message, code, vars);
  // The same choice of language as say() of decimal.mjs, written again because this file imports nothing.
  const say = (en, zh) => {
    const g = globalThis;
    if (g.TACTILE_LANG !== 'en' && g.TACTILE_LANG !== 'zh') {
      const env = (g.process && g.process.env) || {};
      let v = env.TACTILE_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG;
      if (!v) { try { v = Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) { v = ''; } }
      g.TACTILE_LANG = /^zh/i.test(String(v || '')) ? 'zh' : 'en';
    }
    return g.TACTILE_LANG === 'zh' ? zh : en;
  };
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  /** An Excel serial number as ISO 8601 without a zone: a date, a date and time, or (below 1) a time of day. */
  function serialToIso(v, date1904) {
    const p = XLSX.SSF.parse_date_code(v, { date1904 });
    if (!p) return null;
    const time = pad(p.H) + ':' + pad(p.M) + ':' + pad(p.S);
    if (v >= 0 && v < 1) return time;
    const date = pad(p.y, 4) + '-' + pad(p.m) + '-' + pad(p.d);
    return p.H || p.M || p.S ? date + 'T' + time : date;
  }

  const idOf = (file, sheet, cell) => file + '/' + sheet + '/' + cell;

  /**
   * The cells a formula reads directly, as [sheet, range] with range = {s: {r, c}, e: {r, c}}. String literals are
   * skipped; so are other workbooks ([1]Sheet!A1), names, and whole rows or columns (A:A), which have no single cell.
   */
  function formulaRanges(formula, ownSheet) {
    const out = [];
    const bare = formula.replace(/"(?:[^"]|"")*"/g, '""');
    const re = /(?:('(?:[^']|'')+'|[^\s!'"()+\-*\/^&=<>,;:%{}\[\]]+)!)?\$?([A-Z]{1,3})\$?([0-9]{1,7})(?::\$?([A-Z]{1,3})\$?([0-9]{1,7}))?/g;
    let m;
    while ((m = re.exec(bare))) {
      const before = bare[m.index - 1] || '';
      const after = bare[re.lastIndex] || '';
      // Part of a longer word (a name, a function such as LOG10(), or a reference into another workbook.
      if (/[\w.$\]!']/.test(before) || /[\w.(!]/.test(after)) continue;
      let sheet = ownSheet;
      if (m[1]) {
        sheet = m[1][0] === "'" ? m[1].slice(1, -1).replace(/''/g, "'") : m[1];
        if (sheet.includes('[')) continue;
      }
      const a = XLSX.utils.decode_cell(m[2] + m[3]);
      const b = m[4] ? XLSX.utils.decode_cell(m[4] + m[5]) : a;
      out.push([sheet, { s: { r: Math.min(a.r, b.r), c: Math.min(a.c, b.c) }, e: { r: Math.max(a.r, b.r), c: Math.max(a.c, b.c) } }]);
    }
    return out;
  }

  /**
   * One workbook as {source, facts}. `file` is the name the IDs carry (no folder). Every cell that is not empty
   * becomes a fact; a formula whose result the file does not hold stops the read, because a guess would be a number
   * nobody computed.
   */
  function readWorkbook(bytes, file, sha256) {
    // The library also reads CSV, HTML and old .xls from the same call: only a zip container is an .xlsx.
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      throw err('book.not-xlsx', { file }, say('Cannot read "' + file + '": the content is not in .xlsx format. If it is an .xls or .csv file, save it as .xlsx in Excel first', '無法讀取「' + file + '」：內容不是 .xlsx 格式。如果它是 .xls 或 .csv，請先用 Excel 另存成 .xlsx'));
    }
    let wb;
    try {
      wb = XLSX.read(bytes, { cellFormula: true, cellNF: true, cellText: true, cellDates: false, sheetStubs: true });
    } catch (e) {
      throw err('book.invalid', { file, error: e.message }, say('Cannot read "' + file + '": this is not a valid Excel file (' + e.message + ')', '無法讀取「' + file + '」：這不是有效的 Excel 檔案（' + e.message + '）'));
    }
    const date1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    const meta = (wb.Workbook && wb.Workbook.Sheets) || [];
    const source = {
      file,
      sha256,
      bytes: bytes.length,
      sheets: [],
    };
    const facts = [];
    const cellsOf = new Map(); // sheet name → Map(address → fact)

    wb.SheetNames.forEach((name, i) => {
      const ws = wb.Sheets[name];
      const known = new Map();
      cellsOf.set(name, known);
      const hidden = !!(meta[i] && meta[i].Hidden);
      if (!ws || !ws['!ref']) { source.sheets.push({ name, range: '', hidden }); return; }
      const full = XLSX.utils.decode_range(ws['!ref']);
      const merges = new Map((ws['!merges'] || []).map((r) => [XLSX.utils.encode_cell(r.s), XLSX.utils.encode_range(r)]));
      const used = { s: { r: Infinity, c: Infinity }, e: { r: -1, c: -1 } };
      for (let r = full.s.r; r <= full.e.r; r++) {
        for (let c = full.s.c; c <= full.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (!cell) continue;
          if (cell.t === 'z' || cell.v === undefined) {
            if (cell.f) {
              throw err('book.no-result', { file, sheet: name, cell: addr, formula: cell.f }, say(
                name + '!' + addr + ' in "' + file + '" has a formula (=' + cell.f + '), but the file holds no computed result. ' +
                'Open the file in Excel and save it, then ingest it again.',
                '「' + file + '」的 ' + name + '!' + addr + ' 有公式（=' + cell.f + '），但檔案裡沒有計算結果。' +
                '請用 Excel 開啟這個檔案並儲存，再重新擷取。'));
            }
            continue;
          }
          if (cell.t === 's' && cell.v === '') continue;
          const fact = { id: idOf(file, name, addr) };
          const fmt = cell.z == null ? 'General' : String(cell.z);
          if (cell.t === 'n' && XLSX.SSF.is_date(fmt)) {
            const iso = serialToIso(cell.v, date1904);
            if (iso == null) throw err('book.bad-date', { file, sheet: name, cell: addr, value: cell.v }, say(name + '!' + addr + ' in "' + file + '" has a date format, but the value ' + cell.v + ' is not a valid date', '「' + file + '」的 ' + name + '!' + addr + ' 是日期格式，但數值 ' + cell.v + ' 不是有效的日期'));
            fact.type = 'date'; fact.value = iso; fact.text = iso;
          } else if (cell.t === 'n') {
            if (!Number.isFinite(cell.v)) throw err('book.not-finite', { file, sheet: name, cell: addr }, say(name + '!' + addr + ' in "' + file + '" is not a finite number', '「' + file + '」的 ' + name + '!' + addr + ' 不是有限的數字'));
            fact.type = 'number'; fact.value = cell.v; fact.text = cell.w != null ? String(cell.w) : String(cell.v);
          } else if (cell.t === 'b') {
            fact.type = 'bool'; fact.value = !!cell.v; fact.text = cell.w != null ? String(cell.w) : cell.v ? 'TRUE' : 'FALSE';
          } else if (cell.t === 'e') {
            const code = cell.w != null ? String(cell.w) : '#ERROR!';
            fact.type = 'error'; fact.value = code; fact.text = code;
          } else {
            fact.type = 'text'; fact.value = String(cell.v); fact.text = String(cell.v);
          }
          if (fmt !== 'General') fact.format = fmt;
          if (cell.f) fact.formula = String(cell.f);
          if (merges.has(addr)) fact.merge = merges.get(addr);
          fact._at = { r, c };
          known.set(addr, fact);
          facts.push(fact);
          used.s.r = Math.min(used.s.r, r); used.s.c = Math.min(used.s.c, c);
          used.e.r = Math.max(used.e.r, r); used.e.c = Math.max(used.e.c, c);
        }
      }
      source.sheets.push({ name, range: used.e.r < 0 ? '' : XLSX.utils.encode_range(used), hidden, _used: used });
    });

    // Second pass, once every sheet's cells are known: what each formula reads, and the guessed headings.
    const usedOf = new Map(source.sheets.map((s) => [s.name, s._used]));
    for (const [sheet, known] of cellsOf) {
      for (const fact of known.values()) {
        if (fact.formula) {
          const refs = [];
          const seen = new Set();
          for (const [target, range] of formulaRanges(fact.formula, sheet)) {
            const cells = cellsOf.get(target);
            const used = usedOf.get(target);
            if (!cells || !used || used.e.r < 0) continue;
            // A range reaches no further than the sheet's cells: SUM(A1:A1048576) lists what is there.
            const r0 = Math.max(range.s.r, used.s.r), r1 = Math.min(range.e.r, used.e.r);
            const c0 = Math.max(range.s.c, used.s.c), c1 = Math.min(range.e.c, used.e.c);
            for (let r = r0; r <= r1; r++) {
              for (let c = c0; c <= c1; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                if (!cells.has(addr)) continue;
                const id = idOf(file, target, addr);
                if (!seen.has(id)) { seen.add(id); refs.push(id); }
              }
            }
          }
          if (refs.length) fact.refs = refs;
        }
      }
      guessLabels(known);
    }
    for (const f of facts) delete f._at;
    for (const s of source.sheets) delete s._used;
    return { source, facts: facts.map(ordered) };
  }

  /**
   * The guessed headings of every cell that is not text (spec 4.3): the first text cell to its left, and the first
   * above it. known: Map(address → fact), each fact with _at = {r, c} counted from 0.
   */
  function guessLabels(known) {
    for (const fact of known.values()) {
      if (fact.type === 'text') continue;
      const labels = {};
      const { r, c } = fact._at;
      for (let cc = c - 1; cc >= 0; cc--) {
        const f = known.get(XLSX.utils.encode_cell({ r, c: cc }));
        if (f && f.type === 'text') { labels.row = f.text; break; }
      }
      for (let rr = r - 1; rr >= 0; rr--) {
        const f = known.get(XLSX.utils.encode_cell({ r: rr, c }));
        if (f && f.type === 'text') { labels.col = f.text; break; }
      }
      if (labels.row !== undefined || labels.col !== undefined) fact.labels = labels;
    }
  }

  const FIELD_ORDER = ['id', 'type', 'value', 'text', 'format', 'formula', 'refs', 'merge', 'labels'];
  function ordered(fact) {
    const out = {};
    for (const k of FIELD_ORDER) if (fact[k] !== undefined) out[k] = fact[k];
    return out;
  }

  return { readWorkbook, guessLabels, ordered };
}
