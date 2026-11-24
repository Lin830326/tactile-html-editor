/* Tactile — fill.js: writes cited values and charts into the document and keeps its provenance block.
 *
 * The browser's side of `tactile-ingest fill` (docs/spec/provenance.md 6, 8 and 9):
 *   - an element with data-fact="<id>" gets the text of that fact, computed as HE.prov.shownText computes it;
 *   - an empty element with data-chart gets the drawing HE.ingestCore.drawChart makes, the same text as the
 *     command-line tool writes for the same attributes and the same cells;
 *   - the block <script type="application/json" id="tactile-provenance"> lists the facts the document uses, the
 *     files they come from, and the reconciliation rules.
 * A fact is taken from the tab's sources (HE.sources) or, for a file that is not loaded, from the block the
 * document already carries.
 *
 * The rules live in the block. For rules made here, rulesYaml() writes them out as one text that is always the
 * same for the same rules: the block's rules.sha256 is the SHA-256 of that text, so the file the user downloads
 * passes `tactile-ingest verify --rules`. Rules loaded from the user's own rules.yaml (loadRules) carry that
 * file's SHA-256 instead, and the file is given back as it was while the rules are unchanged. Any change to the
 * rules takes the approval off.
 *
 * A report filled here passes `tactile-ingest verify` against the same workbook (tests/fill.spec.js,
 * tests/charts-rules.spec.js).
 *
 *   HE.fill = {run({rules}?) -> {filled, charts, problems: [text], facts}, refill() -> the same and {changed},
 *              rulesNow() -> the block's rules | null, rules() -> {items, approvedBy, approvedOn, results} | null,
 *              addRule(spec), removeRule(id), approveRules(name), loadRules(text) -> Promise<{rules: [result]} | {error}>,
 *              rulesFile() -> Promise<{text, same, original?} | null>}
 */
(function () {
  'use strict';
  const HE = window.HE;
  const t = HE.t;
  const ID = HE.ID_ATTR;
  const BLOCK_ID = 'tactile-provenance';
  const ROW_FIELDS = ['type', 'value', 'text', 'formula', 'labels'];

  function oldBlock(model) {
    const el = model.querySelector('script#' + BLOCK_ID);
    if (!el) return { el: null, block: null };
    try {
      const b = JSON.parse(el.textContent);
      return { el, block: b && b.tactileProvenance === 1 && b.facts && typeof b.facts === 'object' ? b : null };
    } catch (err) {
      return { el, block: null };
    }
  }

  const rowOf = (f) => { const row = {}; for (const k of ROW_FIELDS) if (f[k] !== undefined) row[k] = f[k]; return row; };
  const markup = (block) => '\n' + JSON.stringify(block, null, 1).replace(/</g, '\\u003c') + '\n';
  const itemIds = (item) => [item.total, item.left, item.right].concat(Array.isArray(item.parts) ? item.parts : []).filter((id) => typeof id === 'string');

  /** Every fact there is, id → fact: what the block knows, then the loaded files, which win. Ranges are expanded against this. */
  function allFacts(old) {
    const facts = new Map();
    if (old) for (const id of Object.keys(old.facts)) facts.set(id, old.facts[id]);
    if (HE.sources) for (const s of HE.sources.all()) for (const f of s.facts) facts.set(f.id, f);
    return facts;
  }

  /** A tree as nested lists, without the white space between elements, the editor's ids, and with attributes in name order. */
  function shape(nodes) {
    const out = [];
    for (const n of nodes) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(n.nodeValue); continue; }
      if (n.nodeType !== 1) continue;
      const attrs = Array.from(n.attributes).filter((a) => a.name !== ID).map((a) => [a.name, a.value]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      out.push([n.localName, attrs, shape(n.childNodes)]);
    }
    return out;
  }
  /** True when the element holds exactly the drawing `svg` (text): the comparison `tactile-ingest verify` makes. */
  const holdsDrawing = (el, svg) => JSON.stringify(shape(el.childNodes)) === JSON.stringify(shape(HE.util.fragment(svg, HE.doc.model).childNodes));

  /**
   * Draw the chart of one element. Returns the IDs it reads, or null after naming the problem: the element then
   * stays as it is. A chart drawn by an earlier fill is replaced; anything else inside is not ours to remove.
   */
  function drawChart(el, facts, lang, out, label) {
    const C = HE.ingestCore;
    const fail = (why) => { out.problems.push(t('圖表 [{id}]（data-chart="{type}"）：{why}', { id: el.getAttribute(ID), type: el.getAttribute('data-chart'), why })); return null; };
    if (HE.util.isVoid(el)) return fail(t('這種元素不能有內容'));
    if (el.hasAttribute('data-fact')) return fail(t('同一個元素不可同時有 data-chart 與 data-fact'));
    const kids = Array.from(el.childNodes).filter((n) => !(n.nodeType === 3 && !n.nodeValue.trim()));
    if (kids.some((n) => !(n.nodeType === 1 && n.localName === 'svg' && n.hasAttribute('data-chart-drawn')))) {
      return fail(t('帶 data-chart 的元素必須是空的。標題與說明寫在元素外面'));
    }
    let chart;
    try {
      chart = C.readChart((name) => { const v = el.getAttribute(name); return v === null ? undefined : v; }, facts);
    } catch (err) {
      if (!(err instanceof C.SpecError)) throw err;
      return fail(HE.ingestText(err)); // the code ingest shares names the problem; the editor words it
    }
    const svg = C.drawChart(chart, lang);
    if (!holdsDrawing(el, svg)) { HE.ops.setInnerHTML(el.getAttribute(ID), '\n' + svg + '\n', { label }); out.charts++; }
    return C.chartIds(chart);
  }

  /**
   * Fill every citation, draw every chart and rewrite the block. Changes go through HE.ops, inside the caller's
   * undo step when there is one. Nothing is written when the document cites nothing and carries no block.
   * opts.rules: the block's rules from now on (null: none); left out, the rules stay as they are.
   */
  function run(opts = {}) {
    const model = HE.doc.model;
    const out = { filled: 0, charts: 0, problems: [], facts: 0 };
    if (!model || !model.body || !HE.prov) return out;
    const cited = Array.from(model.querySelectorAll('[data-fact]')).filter((el) => !el.closest('[data-chart]'));
    const charts = HE.ingestCore ? Array.from(model.querySelectorAll('[data-chart]')).filter((el) => !el.parentElement || !el.parentElement.closest('[data-chart]')) : [];
    const { el: blockEl, block: old } = oldBlock(model);
    if (!cited.length && !charts.length && !blockEl && opts.rules === undefined) return out;
    const loaded = HE.sources ? HE.sources.all() : [];
    const lookup = (id) => (HE.sources && HE.sources.fact(id)) || (old && Object.prototype.hasOwnProperty.call(old.facts, id) ? old.facts[id] : null);

    const used = new Set();
    const label = t('填入出處的數字');
    for (const el of cited) {
      const id = el.getAttribute('data-fact');
      const fact = lookup(id);
      if (!fact) { out.problems.push(t('「{id}」不在來源檔或出處資料裡', { id })); continue; }
      if (el.children.length) { out.problems.push(t('帶 data-fact 的元素只能含文字，不可含子元素（{id}）', { id })); continue; }
      const shown = HE.prov.shownText(fact, {
        scale: el.getAttribute('data-fact-scale'), digits: el.getAttribute('data-fact-digits'),
        group: el.getAttribute('data-fact-group'), sign: el.getAttribute('data-fact-sign'),
      });
      if (shown.error) { out.problems.push(t('{id}：{error}', { id, error: shown.error })); continue; }
      used.add(id);
      // An element the user changed by hand carries data-fact-was, not data-fact: what is here is the editor's to write.
      if (el.textContent !== shown.text) { HE.ops.setText(el.getAttribute(ID), shown.text, { label }); out.filled++; }
    }
    if (charts.length) {
      const facts = allFacts(old);
      const lang = (model.documentElement.getAttribute('lang') || '').trim();
      for (const el of charts) for (const id of drawChart(el, facts, lang, out, label) || []) used.add(id);
    }
    // What a number changed by hand refers to stays in the block, and so does what a chart that could not be drawn again shows.
    for (const el of model.querySelectorAll('[data-fact-was],[data-chart-fact],[data-chart] [data-fact]')) {
      const id = el.getAttribute('data-fact-was') || el.getAttribute('data-chart-fact') || el.getAttribute('data-fact');
      if (id && lookup(id)) used.add(id);
    }
    const rules = opts.rules !== undefined ? opts.rules : old && old.rules ? old.rules : null;
    if (rules && Array.isArray(rules.items)) for (const item of rules.items) for (const id of itemIds(item)) if (lookup(id)) used.add(id);

    const block = { tactileProvenance: 1, tool: { name: 'tactile-editor', version: HE.version }, filledAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), sources: [], facts: {} };
    // In the order of the files: the loaded ones cell by cell, then what only the old block knows.
    for (const s of loaded) for (const f of s.facts) if (used.has(f.id)) block.facts[f.id] = rowOf(f);
    if (old) for (const id of Object.keys(old.facts)) if (used.has(id) && !block.facts[id]) block.facts[id] = rowOf(old.facts[id]);
    const ids = Object.keys(block.facts);
    const named = new Set();
    for (const s of loaded) {
      if (ids.some((id) => id.startsWith(s.source.file + '/'))) { block.sources.push({ file: s.source.file, sha256: s.source.sha256, bytes: s.source.bytes }); named.add(s.source.file); }
    }
    for (const s of (old && Array.isArray(old.sources) ? old.sources : [])) {
      if (s && !named.has(s.file) && ids.some((id) => id.startsWith(s.file + '/'))) block.sources.push(s);
    }
    if (rules) block.rules = rules;
    out.facts = ids.length;

    // The time of filling alone is no change: a block that says the same is left as it is.
    const same = old && JSON.stringify(Object.assign({}, old, { filledAt: '', tool: null })) === JSON.stringify(Object.assign({}, block, { filledAt: '', tool: null }));
    if (blockEl && same) return out;
    if (blockEl) HE.ops.setText(blockEl.getAttribute(ID), markup(block), { label });
    else if (ids.length || rules) HE.ops.insertHTML(null, 'append', '<script type="application/json" id="' + BLOCK_ID + '">' + markup(block) + '</script>', { label });
    return out;
  }

  /**
   * Fill again on the user's word, as one undo step: after citations or charts written by hand, or after a newer
   * copy of a source file was dropped in. Returns what run() returns and `changed`; with nothing to update no
   * step is recorded.
   */
  function refill() {
    const top = HE.history.top();
    let out;
    HE.history.transact(t('重新填入'), () => { out = run(); });
    out.changed = HE.history.top() !== top;
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Reconciliation rules (spec 8)                                       */
  /* ------------------------------------------------------------------ */

  // A string as JSON writes it, which YAML 1.2 reads as the same string. The characters YAML may take for a line
  // break or a byte order mark are written as escapes, so that no reader splits the line.
  const quoted = (s) => JSON.stringify(String(s)).replace(/[\u007f-\u009f\u2028\u2029\ufeff]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

  /**
   * The rules of a block as rules.yaml text: {approvedBy?, approvedOn?, items}. One way of writing, so the same
   * rules always give the same text: parts as a list of IDs, every string in double quotes, lines ending in \n.
   */
  function rulesYaml(rules) {
    let out = 'tactileRules: 1\n';
    if (rules.approvedBy !== undefined) out += 'approvedBy: ' + quoted(rules.approvedBy) + '\n';
    if (rules.approvedOn !== undefined) out += 'approvedOn: ' + quoted(rules.approvedOn) + '\n';
    out += 'rules:\n';
    for (const item of rules.items) {
      out += '  - id: ' + quoted(item.id) + '\n    type: ' + item.type + '\n';
      if (item.type === 'sum') {
        out += '    total: ' + quoted(item.total) + '\n    parts:\n';
        for (const id of item.parts) out += '      - ' + quoted(id) + '\n';
      } else {
        out += '    left: ' + quoted(item.left) + '\n    right: ' + quoted(item.right) + '\n';
      }
      out += '    tolerance: ' + quoted(item.tolerance === undefined ? '0' : item.tolerance) + '\n';
      if (item.note) out += '    note: ' + quoted(item.note) + '\n';
    }
    return out;
  }

  async function sha256(text) {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  const blockRules = (block) => (block && block.rules && Array.isArray(block.rules.items) ? block.rules : null);

  /** The rules of the document with each rule computed against the block: {items, approvedBy, approvedOn, results}, or null without rules. */
  function rules() {
    const model = HE.doc.model;
    if (!model || !HE.ingestCore) return null;
    const { block } = oldBlock(model);
    const r = blockRules(block);
    if (!r || !r.items.length) return null;
    return {
      items: r.items, approvedBy: r.approvedBy, approvedOn: r.approvedOn,
      results: r.items.map((item) => {
        try { return Object.assign({ type: item.type }, HE.ingestCore.runRule(item, block.facts)); }
        catch (err) { return { id: item && item.id, type: item && item.type, result: 'unknown', why: String(err && err.message) }; }
      }),
    };
  }

  /** Rules as readRules writes them (tolerance as text, fields in one order). Rules it cannot read stay as they are. */
  function normal(items) {
    try { return HE.ingestCore.readRules({ tactileRules: 1, rules: items }).items; } catch (err) { return items; }
  }

  // The rules.yaml the user loaded last, as it was read: {sha256, text}. Kept in this tab only, never in the
  // document. While the block's rules still carry this SHA-256 they are that file's, and rulesFile() gives it back.
  let loaded = null;

  /**
   * One change to the rules, as one undo step. make(items, facts) returns {items, approvedBy?, approvedOn?, text?}
   * or throws SpecError. text: the rules file these rules were read from; its SHA-256 is recorded in place of the
   * canonical text's. The SHA-256 is worked out before anything is written, because the browser computes it later.
   */
  async function change(label, make) {
    const C = HE.ingestCore;
    const model = HE.doc.model;
    if (!C || !model || !model.body || !(window.crypto && window.crypto.subtle)) return { error: t('這個瀏覽器或這個版本無法計算勾稽規則') };
    const { block: old } = oldBlock(model);
    const before = blockRules(old);
    let next;
    try { next = make(before ? before.items.slice() : [], allFacts(old)); } catch (err) {
      if (!(err instanceof C.SpecError)) throw err;
      return { error: HE.ingestText(err) };
    }
    let sealed = null;
    // A loaded file is recorded even when it holds no rule, as `tactile-ingest fill --rules` records it.
    if (next.items.length || next.text !== undefined) {
      sealed = { sha256: await sha256(next.text !== undefined ? next.text : rulesYaml(next)) };
      if (next.approvedBy !== undefined) sealed.approvedBy = next.approvedBy;
      if (next.approvedOn !== undefined) sealed.approvedOn = next.approvedOn;
      sealed.items = next.items;
    }
    HE.history.transact(label, () => run({ rules: sealed }));
    const now = rules();
    return { rules: now ? now.results : [] };
  }

  const text = (v) => (v === undefined || v === null ? '' : String(v).trim());

  /**
   * Add one rule. spec: {type: 'sum' | 'equal', id, total, parts (a list, or text with ';' or line breaks between
   * the items; each an ID or a range), left, right, tolerance, note}. Checked and expanded by the code ingest runs.
   */
  function addRule(spec) {
    const C = HE.ingestCore;
    const s = spec || {};
    const raw = { id: text(s.id), type: text(s.type) };
    if (raw.type === 'sum') {
      raw.total = text(s.total);
      raw.parts = (Array.isArray(s.parts) ? s.parts : text(s.parts).split(/[;\n]/)).map(text).filter(Boolean);
    } else {
      raw.left = text(s.left);
      raw.right = text(s.right);
    }
    if (text(s.tolerance)) raw.tolerance = text(s.tolerance);
    if (text(s.note)) raw.note = text(s.note);
    return change(t('新增勾稽規則'), (items, facts) => {
      const read = C.readRules({ tactileRules: 1, rules: items.concat([raw]) }).items;
      const added = C.expandRules({ items: [read[read.length - 1]] }, facts)[0];
      return { items: read.slice(0, -1).concat([added]) };
    });
  }

  function removeRule(id) {
    const C = HE.ingestCore;
    return change(t('刪除勾稽規則'), (items) => {
      if (!items.some((item) => item.id === id)) throw new C.SpecError(t('沒有名稱是「{id}」的規則', { id }));
      return { items: normal(items.filter((item) => item.id !== id)) };
    });
  }

  /** The user says the rules are right: their name, and today's date where they are. */
  function approveRules(name) {
    const C = HE.ingestCore;
    const who = text(name);
    return change(t('確認勾稽規則'), (items) => {
      if (!who) throw new C.SpecError(t('請填確認人的名字'));
      if (!items.length) throw new C.SpecError(t('這份報告沒有勾稽規則。'));
      const d = new Date();
      const on = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return { items: normal(items), approvedBy: who, approvedOn: on };
    });
  }

  /**
   * The rules of a rules.yaml the user wrote, in place of the rules the document has. text: the file as it is
   * (decoded UTF-8, a byte order mark kept). Read by the subset reader the editor carries (parseYamlLite), then
   * checked and expanded against the facts there are, as `tactile-ingest fill --rules` does: the block gets the
   * same items, the file's approvedBy and approvedOn, and the SHA-256 of the file's bytes, so that
   * `tactile-ingest verify --rules <that file>` passes. A file that cannot be read writes nothing.
   * Only the user loads rules, in the pane or by dropping the file: this is not a tool of the AI.
   */
  async function loadRules(text) {
    const C = HE.ingestCore;
    const file = String(text);
    const done = await change(t('載入 rules.yaml'), (items, facts) => {
      const read = C.readRules(C.parseYamlLite(file));
      return { items: C.expandRules(read, facts), approvedBy: read.approvedBy, approvedOn: read.approvedOn, text: file };
    });
    if (!done.error) {
      const now = rulesNow();
      if (now && typeof now.sha256 === 'string') loaded = { sha256: now.sha256, text: file };
    }
    return done;
  }

  /**
   * The rules as a rules.yaml file. same: whether its SHA-256 is the one the block records; it is not for rules
   * that tactile-ingest filled in from a file of its own and that were not changed here since. original: the text
   * is the file the user loaded here, which the rules still are.
   */
  async function rulesFile() {
    const model = HE.doc.model;
    const r = model ? blockRules(oldBlock(model).block) : null;
    if (!r || !r.items.length || !(window.crypto && window.crypto.subtle)) return null;
    if (loaded && loaded.sha256 === r.sha256) return { text: loaded.text, same: true, original: true };
    try {
      const out = rulesYaml(r);
      return { text: out, same: (await sha256(out)) === r.sha256 };
    } catch (err) {
      return null; // rules no reader can write out: a block changed by hand
    }
  }

  /** The rules exactly as the block holds them (null: none), to hand back to run({rules}) after something else wrote the document. */
  function rulesNow() {
    const { block } = HE.doc.model ? oldBlock(HE.doc.model) : { block: null };
    return block && block.rules ? block.rules : null;
  }

  HE.fill = { run, refill, rules, rulesNow, addRule, removeRule, approveRules, loadRules, rulesFile };
})();
