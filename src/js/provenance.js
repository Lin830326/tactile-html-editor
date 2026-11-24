/* Tactile — provenance.js: where each number of a report comes from (docs/spec/provenance.md).
 *
 * A report filled by tactile-ingest carries elements with data-fact and one block,
 * <script type="application/json" id="tactile-provenance">, holding the source values and the rules. This
 * module reads both from the model and
 *   - marks the numbers in the edit frame and shows the source of the one the user clicks,
 *   - lists the numbers and the rules in the 出處 pane, where the user adds, removes and approves rules, loads
 *     them from a rules.yaml of their own and downloads them as one (the changes themselves are HE.fill's),
 *   - lets the user cite a cell without the AI (插入引用: search, insert, how the number is shown) and fill the
 *     document again (重新填入),
 *   - renames data-fact to data-fact-was, in the same undo step, when an edit makes a number differ from its source.
 * It checks the report against its own block only (level 1 of the spec), and says so.
 *
 *   HE.prov = {init, state(), shownText(fact, attrs), runRule(item, facts), show(id), hide(), restore(id),
 *              loadRulesFile(file) -> Promise<bool>, cite(factId) -> {id, where} | {error},
 *              setShow(id, {scale?, digits?, group?}) -> '' | why not, refill() -> HE.fill.refill()'s result | null,
 *              uncitedIn(ids | null, max) -> [{id, text}]}
 */
(function () {
  'use strict';
  const HE = window.HE;
  const t = HE.t;
  const ID = HE.ID_ATTR;
  const BLOCK_ID = 'tactile-provenance';
  const LIVE_CSS_ID = '__he_prov_css';
  const NOT_PROSE = new Set(['script', 'style', 'template', 'svg', 'noscript']);
  const LIST_MAX = 60;
  const LEVEL_NOTE = t('尚未與來源檔核對');
  const LEVEL_WHY = t('這裡只檢查報告與它內嵌的出處資料是否一致。出處資料與來源檔是否相同，必須用 tactile-ingest 的 verify 核對。');

  const S = { state: null, baseline: new Map(), shown: null, pop: null, pane: null, tab: null, queued: false, blockText: null, block: null, blockError: '', form: null, approver: null, rulesInput: null, cite: null, caret: null, refillProblems: [] };

  /* ------------------------------------------------------------------ */
  /* Decimal arithmetic: the same results as ingest/src/decimal.mjs      */
  /* ------------------------------------------------------------------ */

  const DEC = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
  const SCALE = /^\d+(\.\d+)?([eE][+-]?\d+)?$|^\.\d+([eE][+-]?\d+)?$/;
  function dec(x) {
    const s = typeof x === 'number' ? (Number.isFinite(x) ? String(x) : '') : typeof x === 'string' ? x.trim() : '';
    const m = DEC.exec(s);
    if (!m || !(m[2] || m[3])) return null;
    const frac = m[3] || '';
    const exp = m[4] ? Number(m[4]) : 0;
    if (Math.abs(exp) > 400) return null;
    let n = BigInt((m[2] || '0') + frac);
    if (m[1] === '-') n = -n;
    return { n, e: exp - frac.length };
  }
  const pow10 = (k) => 10n ** BigInt(k);
  const align = (a, b) => { const e = Math.min(a.e, b.e); return [a.n * pow10(a.e - e), b.n * pow10(b.e - e), e]; };
  const add = (a, b) => { const [x, y, e] = align(a, b); return { n: x + y, e }; };
  const sub = (a, b) => { const [x, y, e] = align(a, b); return { n: x - y, e }; };
  const cmpAbs = (a, b) => { const [x, y] = align({ n: a.n < 0n ? -a.n : a.n, e: a.e }, b); return x < y ? -1 : x > y ? 1 : 0; };
  function toText(a) {
    let { n, e } = a;
    const neg = n < 0n;
    if (neg) n = -n;
    let s = n.toString();
    if (e >= 0) s += '0'.repeat(e);
    else {
      s = s.padStart(-e + 1, '0');
      s = (s.slice(0, e) + '.' + s.slice(e)).replace(/\.?0+$/, '');
    }
    return (neg && s !== '0' ? '-' : '') + s;
  }
  function format(a, digits, group, plus) {
    let n = a.n;
    const shift = a.e + digits;
    if (shift >= 0) n *= pow10(shift);
    else {
      const p = pow10(-shift);
      const neg = n < 0n;
      let q = neg ? -n : n;
      const r = q % p;
      q /= p;
      if (r * 2n >= p) q += 1n;
      n = neg ? -q : q;
    }
    const neg = n < 0n;
    const s = (neg ? -n : n).toString().padStart(digits + 1, '0');
    let int = digits ? s.slice(0, -digits) : s;
    if (group) int = int.replace(/\B(?=(\d{3})+$)/g, ',');
    return (n === 0n ? '' : neg ? '-' : plus ? '+' : '') + int + (digits ? '.' + s.slice(-digits) : '');
  }

  /**
   * The text an element shows for a fact (spec 6.3). attrs: {scale, digits, group, sign}, each a string or
   * null. Returns {text} or {error: why the text cannot be worked out}.
   */
  function shownText(fact, attrs) {
    const has = (v) => v !== null && v !== undefined;
    const bad = (name, value, want) => ({ error: t('屬性 {name} 的值「{value}」不合規定：{want}', { name, value, want }) });
    let scale = null, digits = 0, group = true, plus = false;
    if (has(attrs.scale)) {
      const s = attrs.scale.trim();
      scale = SCALE.test(s) ? dec(s) : null;
      if (!scale || scale.n <= 0n) return bad('data-fact-scale', attrs.scale, t('必須是正數'));
    }
    if (has(attrs.digits)) {
      if (!/^(\d|10)$/.test(attrs.digits.trim())) return bad('data-fact-digits', attrs.digits, t('必須是 0～10 的整數'));
      digits = Number(attrs.digits.trim());
    }
    if (has(attrs.group)) {
      if (attrs.group !== 'on' && attrs.group !== 'off') return bad('data-fact-group', attrs.group, t('必須是 on 或 off'));
      group = attrs.group === 'on';
    }
    if (has(attrs.sign)) {
      if (attrs.sign !== 'auto' && attrs.sign !== 'always') return bad('data-fact-sign', attrs.sign, t('必須是 auto 或 always'));
      plus = attrs.sign === 'always';
    }
    if (!has(attrs.scale) && !has(attrs.digits)) return { text: String(fact.text) };
    if (fact.type !== 'number') return { error: t('有換算屬性，但值的類型是 {type}，不是 number', { type: fact.type }) };
    let v = dec(fact.value);
    if (!v) return { error: t('值 {value} 不是有限的數字', { value: fact.value }) };
    if (scale) v = { n: v.n * scale.n, e: v.e + scale.e };
    return { text: format(v, digits, group, plus) };
  }

  /** One rule of the block against its facts (spec 8): {id, result: 'pass' | 'fail' | 'unknown', left, right, diff, why}. */
  function runRule(item, facts) {
    const num = (id) => {
      const f = facts[id];
      if (!f) return { why: t('{id} 不存在', { id }) };
      if (f.type !== 'number') return { why: t('{id} 的類型是 {type}，不是 number', { id, type: f.type }) };
      const d = dec(f.value);
      return d ? { d } : { why: t('{id} 不是有限的數字', { id }) };
    };
    const unknown = (why) => ({ id: item.id, result: 'unknown', why });
    if (item.type !== 'sum' && item.type !== 'equal') return unknown(t('不認得的規則類型「{type}」', { type: item.type }));
    const a = num(item.type === 'sum' ? item.total : item.left);
    if (a.why) return unknown(a.why);
    let b;
    if (item.type === 'sum') {
      b = dec('0');
      if (!Array.isArray(item.parts)) return unknown(t('parts 不是清單'));
      for (const id of item.parts) {
        const p = num(id);
        if (p.why) return unknown(p.why);
        b = add(b, p.d);
      }
    } else {
      const r = num(item.right);
      if (r.why) return unknown(r.why);
      b = r.d;
    }
    const diff = sub(a.d, b);
    const tol = dec(item.tolerance === undefined ? '0' : String(item.tolerance));
    if (!tol || tol.n < 0n) return unknown(t('tolerance 不是 0 或正數'));
    return { id: item.id, result: cmpAbs(diff, tol) <= 0 ? 'pass' : 'fail', left: toText(a.d), right: toText(b), diff: toText(diff) };
  }

  /* ------------------------------------------------------------------ */
  /* Reading the model                                                   */
  /* ------------------------------------------------------------------ */

  const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const clip = (s, n = 40) => { const flat = String(s).replace(/\s+/g, ' ').trim(); return flat.length > n ? flat.slice(0, n - 1) + '…' : flat; };
  const showAttrs = (el) => ({
    scale: el.getAttribute('data-fact-scale'), digits: el.getAttribute('data-fact-digits'),
    group: el.getAttribute('data-fact-group'), sign: el.getAttribute('data-fact-sign'),
  });

  /** The block of the model, parsed once per text. Sets S.block (null without a usable one) and S.blockError. */
  function readBlock(model) {
    const el = model.querySelector('script#' + BLOCK_ID);
    const text = el ? el.textContent : null;
    if (text === S.blockText) return;
    S.blockText = text;
    S.block = null;
    S.blockError = '';
    if (text === null) return;
    try {
      const b = JSON.parse(text);
      if (!b || b.tactileProvenance !== 1) S.blockError = t('出處資料的格式版本是 {version}，這個編輯器只讀得懂版本 1。', { version: b && b.tactileProvenance });
      else if (!b.facts || typeof b.facts !== 'object') S.blockError = t('出處資料沒有 facts 欄位。');
      else S.block = b;
    } catch (err) {
      S.blockError = t('出處資料不是有效的 JSON：{error}', { error: err.message });
    }
  }

  const CITES = '[data-fact],[data-fact-was],[data-chart-fact]';
  /**
   * The key of a citing element. The editor treats a drawing (svg) as one object, so what is inside has no ID of
   * its own: its key is the ID of the nearest element that has one, '>' and its place among that element's citing
   * descendants. The same key finds the element in the model and on the page.
   */
  function keyOf(el) {
    const mine = el.getAttribute(ID);
    if (mine) return mine;
    const host = el.parentElement && el.parentElement.closest('[' + ID + ']');
    if (!host) return null;
    return host.getAttribute(ID) + '>' + Array.prototype.indexOf.call(host.querySelectorAll(CITES), el);
  }
  const hostOf = (key) => String(key).split('>')[0];
  const inner = (key) => String(key).indexOf('>') >= 0;
  function find(byId, key) {
    const parts = String(key).split('>');
    const host = byId(parts[0]);
    if (!host || parts.length === 1) return host || null;
    return host.querySelectorAll(CITES)[Number(parts[1])] || null;
  }
  const modelEl = (key) => find((id) => HE.doc.byId(id), key);
  const liveEl = (key) => find((id) => HE.live.byId(id), key);

  /** What the element with data-fact (or data-fact-was) should show: {fact, text} or {fact, error} or {} when the ID is unknown. */
  function expectedOf(el, factId) {
    const fact = S.block && own(S.block.facts, factId) ? S.block.facts[factId] : null;
    if (!fact) return {};
    return Object.assign({ fact }, shownText(fact, showAttrs(el)));
  }

  /**
   * The whole picture: {has, fillable, blockError, block, numbers: [{id, factId, status: 'ok' | 'mismatch' | 'missing' | 'was',
   * text, expected, error, fact}], uncited: [{id, text}], rules: [{item, id, result, left, right, diff, why}]}.
   */
  function compute() {
    const model = HE.doc.model;
    const out = { has: false, fillable: false, blockError: '', block: null, numbers: [], marks: [], uncited: [], rules: [] };
    if (!model || !model.body) return out;
    readBlock(model);
    // What 重新填入 would have something to do with: a citation, a chart (drawn or not yet), or a block.
    out.fillable = S.blockText !== null || !!model.body.querySelector('[data-fact],[data-chart]');
    out.block = S.block;
    out.blockError = S.blockError;
    for (const el of model.body.querySelectorAll('[data-fact],[data-fact-was]')) {
      const id = keyOf(el);
      if (!id) continue;
      const cited = el.hasAttribute('data-fact');
      const factId = el.getAttribute(cited ? 'data-fact' : 'data-fact-was');
      const text = el.textContent.trim();
      const want = expectedOf(el, factId);
      const n = { id, factId, text, expected: want.text, error: want.error || '', fact: want.fact || null };
      if (!cited) n.status = 'was';
      else if (!want.fact) n.status = 'missing';
      else n.status = want.text !== undefined && want.text === text ? 'ok' : 'mismatch';
      out.numbers.push(n);
    }
    // The shapes of a chart (a bar, a point, a slice) name the cell they draw. There is no text to compare.
    for (const el of model.body.querySelectorAll('[data-chart-fact]')) {
      const id = keyOf(el);
      if (!id) continue;
      const factId = el.getAttribute('data-chart-fact');
      const fact = S.block && own(S.block.facts, factId) ? S.block.facts[factId] : null;
      out.marks.push({ id, factId, mark: true, status: fact ? 'mark' : 'missing', text: '', fact });
    }
    out.has = S.blockText !== null || out.numbers.length > 0 || out.marks.length > 0;
    if (!out.has) return out;
    const walk = (node) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) {
          if (/[0-9]/.test(c.nodeValue)) out.uncited.push({ id: node.getAttribute(ID), text: clip(c.nodeValue) });
        } else if (c.nodeType === 1) {
          if (NOT_PROSE.has(c.localName)) continue;
          if (c.hasAttribute('data-fact') || c.hasAttribute('data-fact-was') || c.hasAttribute('data-fact-none')) continue;
          walk(c);
        }
      }
    };
    walk(model.body);
    const items = S.block && S.block.rules && Array.isArray(S.block.rules.items) ? S.block.rules.items : [];
    out.rules = items.map((item) => Object.assign({ item }, runRule(item, S.block.facts)));
    return out;
  }

  // Where text is not prose that could cite: the rule of ingest/src/fill.mjs scanReport.
  const QUIET = '[data-fact],[data-fact-was],[data-fact-none],[data-chart],svg,script,style,template';
  /**
   * The text with a digit that cites nothing, inside the elements `ids` (null: the whole body), at most `max`:
   * [{id (the data-he-id of the element that holds the text), text (cut short)}]. For the AI, after it wrote.
   */
  function uncitedIn(ids, max = 12) {
    const model = HE.doc.model;
    const out = [];
    if (!model || !model.body) return out;
    const all = ids ? ids.map((id) => HE.doc.byId(id)).filter((el) => el && model.body.contains(el)) : [model.body];
    const roots = all.filter((el, i) => all.indexOf(el) === i && !all.some((o) => o !== el && o.contains(el)));
    const walk = (node) => {
      for (const c of node.childNodes) {
        if (out.length >= max) return;
        if (c.nodeType === 3) { if (/[0-9]/.test(c.nodeValue)) out.push({ id: node.getAttribute(ID), text: clip(c.nodeValue) }); }
        else if (c.nodeType === 1 && !c.matches(QUIET)) walk(c);
      }
    };
    for (const el of roots) if (!el.closest(QUIET)) walk(el);
    return out;
  }

  const byStatus = (st, status) => st.numbers.filter((n) => n.status === status);
  const problems = (st) => st.numbers.filter((n) => n.status !== 'ok').length + st.rules.filter((r) => r.result !== 'pass').length + (st.blockError ? 1 : 0);

  /* ------------------------------------------------------------------ */
  /* Edits that leave the source                                         */
  /* ------------------------------------------------------------------ */

  function takeBaseline() {
    S.baseline = new Map();
    const model = HE.doc.model;
    if (!model || !model.body) return;
    for (const el of model.body.querySelectorAll('[data-fact]')) {
      const id = el.getAttribute(ID);
      if (id) S.baseline.set(id, el.textContent.trim());
    }
  }

  /** Runs as each undo step closes: a cited number whose text this step changed away from its source is no longer cited. */
  function onClose() {
    if (!S.baseline.size) return;
    const model = HE.doc.model;
    if (!model || !model.body) return;
    readBlock(model);
    const moved = [];
    for (const el of model.body.querySelectorAll('[data-fact]')) {
      const id = el.getAttribute(ID);
      if (!id || !S.baseline.has(id)) continue;
      const text = el.textContent.trim();
      if (text === S.baseline.get(id)) continue;
      const factId = el.getAttribute('data-fact');
      if (expectedOf(el, factId).text === text) continue;
      moved.push([id, factId]);
    }
    for (const [id, factId] of moved) HE.ops.setAttr(id, { 'data-fact': null, 'data-fact-was': factId });
    if (moved.length) HE.ui.status(t('這個數字已經不等於來源值，標示為「已偏離來源」'));
  }

  /** Put the source value back: the text for a number that differs, and data-fact for one that left its source. */
  function restore(id) {
    const m = HE.doc.byId(id);
    if (!m) return false;
    const was = m.hasAttribute('data-fact-was');
    const factId = m.getAttribute(was ? 'data-fact-was' : 'data-fact');
    readBlock(HE.doc.model);
    const want = expectedOf(m, factId);
    if (want.text === undefined) return false;
    HE.history.transact(t('還原為來源值'), () => {
      if (was) HE.ops.setAttr(id, { 'data-fact-was': null, 'data-fact': factId });
      HE.ops.setText(id, want.text);
    });
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Marks in the edit frame                                             */
  /* ------------------------------------------------------------------ */

  function liveCSS(st) {
    if (HE.mode !== 'edit' || !st.has) return '';
    const sel = (list) => list.filter((n) => !inner(n.id)).map((n) => '[' + ID + '="' + CSS.escape(n.id) + '"]').join(',');
    let css = '[data-fact]{text-decoration:underline dotted rgba(33,73,200,.55)!important;text-underline-offset:3px!important}';
    const bad = st.numbers.filter((n) => n.status === 'mismatch' || n.status === 'missing');
    if (bad.length) css += sel(bad) + '{outline:2px solid #c0352e!important;outline-offset:1px!important;background-color:rgba(192,53,46,.14)!important;text-decoration:none!important}';
    css += '[data-fact-was]{outline:2px solid #c98a00!important;outline-offset:1px!important;background-color:rgba(201,138,0,.18)!important}';
    return css;
  }

  function paintLive(st) {
    const d = HE.live.doc;
    if (!d || !d.head) return;
    const css = liveCSS(st);
    let el = d.getElementById(LIVE_CSS_ID);
    if (!css) { if (el) el.remove(); return; }
    if (!el) { el = d.createElement('style'); el.id = LIVE_CSS_ID; d.head.append(el); }
    if (el.textContent !== css) el.textContent = css;
  }

  /* ------------------------------------------------------------------ */
  /* The source of one number                                            */
  /* ------------------------------------------------------------------ */

  function mk(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function button(cls, text, fn) {
    const b = mk('button', 'btn sm ' + cls, text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  const STATUS = {
    ok: ['ok', t('相符')], mismatch: ['bad', t('不符')], missing: ['bad', t('找不到')], was: ['warn', t('已偏離來源')],
    pass: ['ok', t('通過')], fail: ['bad', t('違反')], unknown: ['warn', t('無法計算')], mark: ['warn', t('圖表的圖形')],
  };
  const pill = (key) => mk('span', 'prov-pill prov-' + STATUS[key][0], STATUS[key][1]);

  /** 「2026Q3.xlsx › 損益表 › D14」 */
  function address(factId) {
    const parts = String(factId).split('/');
    return parts.length >= 3 ? [parts.slice(0, -2).join('/'), parts[parts.length - 2], parts[parts.length - 1]].join(' › ') : String(factId);
  }
  function labelsOf(fact) {
    const l = fact && fact.labels;
    return l ? [l.row, l.col].filter((x) => x !== undefined && x !== null && x !== '').join(' · ') : '';
  }
  function conversion(m) {
    const a = showAttrs(m);
    const bits = [];
    if (a.scale !== null) bits.push('× ' + a.scale);
    if (a.digits !== null) bits.push(t('小數 {n} 位', { n: a.digits }));
    return bits.join(t('，'));
  }
  function row(dl, name, value, mono) {
    if (value === '' || value === undefined || value === null) return;
    dl.append(mk('dt', null, name), mk('dd', mono ? 'mono' : null, value));
  }

  const MARK_NOTE = t('編輯器不檢查圖形的大小與位置。請用 tactile-ingest 的 verify 指令檢查。');
  // The same sentence tactile-ingest writes (ingest.mjs kindNote). The kind is read from the ID, which the block cannot hide.
  const WORD_NOTE = t('來源是 Word 文件。Word 只儲存文字，這個數值是程式從文字解析出來的。');
  const PDF_NOTE = t('來源是 PDF。PDF 沒有儲存表格：這個數值的行與欄是程式從座標推算的，數值是從文字解析出來的。');
  const kindNote = (factId) => {
    const file = String(factId).split('/')[0];
    return /\.docx$/i.test(file) ? WORD_NOTE : /\.pdf$/i.test(file) ? PDF_NOTE : '';
  };

  function card(n) {
    const m = modelEl(n.id);
    const box = mk('div', 'prov-card');
    const head = mk('div', 'prov-card-head');
    head.append(pill(n.status), mk('span', 'prov-level', LEVEL_NOTE));
    head.lastChild.title = LEVEL_WHY;
    box.append(head);
    const what = labelsOf(n.fact);
    if (what) box.append(mk('div', 'prov-what', what));
    if (n.status === 'mark') box.append(mk('p', 'prov-say', MARK_NOTE));
    if (n.status === 'missing') box.append(mk('p', 'prov-say', t('這個數字標示的來源不在報告的出處資料裡，無法核對。')));
    if (n.status === 'was') box.append(mk('p', 'prov-say', t('有人在編輯器改過這個數字，它已經不等於來源值。')));
    if (n.status === 'mismatch') box.append(mk('p', 'prov-say', n.error || t('報告上的數字不等於來源值算出的文字。')));
    const dl = mk('dl', 'prov-dl');
    if (!n.mark) row(dl, t('報告上寫'), n.text === '' ? t('（空白）') : n.text);
    if (n.fact) {
      if (n.expected !== undefined && n.expected !== n.text) row(dl, t('依來源應寫'), n.expected);
      row(dl, t('來源值'), String(n.fact.text));
      if (m && !n.mark) row(dl, t('換算'), conversion(m));
      if (n.fact.formula !== undefined) row(dl, t('公式'), '=' + n.fact.formula, true);
    }
    row(dl, t('位置', null, 'source'), address(n.factId), true);
    box.append(dl);
    if (n.fact && n.fact.type === 'number' && kindNote(n.factId)) box.append(mk('p', 'prov-say prov-kind', kindNote(n.factId)));
    if (inner(n.id) && n.status !== 'ok' && !n.mark) box.append(mk('p', 'prov-say', t('這個數字在圖表裡。編輯器不能改圖表裡的文字，請重新執行 fill。')));
    if (!n.mark && !inner(n.id) && n.status !== 'ok' && n.expected !== undefined && n.expected !== n.text) {
      box.append(button('prov-restore', t('還原為來源值'), () => { restore(n.id); }));
    }
    return box;
  }

  function place() {
    const pop = S.pop;
    if (!pop || pop.hidden || !S.shown) return;
    const el = liveEl(S.shown);
    const frame = HE.canvas && HE.canvas.frame;
    if (!el || !frame) { hide(); return; }
    const r = el.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    const out = r.bottom < 0 || r.top > fr.height || r.right < 0 || r.left > fr.width;
    pop.style.visibility = out ? 'hidden' : '';
    if (out) return;
    const a = HE.canvas.toPage(r.left, r.bottom);
    const b = HE.canvas.toPage(r.left, r.top);
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(Math.max(8, a.x), window.innerWidth - w - 8);
    let top = a.y + 8;
    if (top + h > window.innerHeight - 8 && b.y - 8 - h > 8) top = b.y - 8 - h;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function show(id) {
    const st = S.state || (S.state = compute());
    const n = st.numbers.find((x) => x.id === id) || st.marks.find((x) => x.id === id);
    if (!n || !S.pop) { hide(); return false; }
    S.shown = id;
    S.pop.replaceChildren(card(n));
    S.pop.hidden = false;
    place();
    return true;
  }
  function hide() {
    S.shown = null;
    if (S.pop) { S.pop.hidden = true; S.pop.replaceChildren(); }
  }

  /** Select the number on the page, bring it into view and show its source. */
  function reveal(id, withCard) {
    if (!id || !modelEl(id)) return;
    const host = hostOf(id);
    HE.sel.set([host]);
    if (HE.canvas && HE.canvas.scrollIntoView) HE.canvas.scrollIntoView(host);
    if (HE.canvas && HE.canvas.flash) HE.canvas.flash(host);
    if (withCard) show(id); else hide();
  }

  function onFrameClick(e) {
    if (HE.canvas && HE.canvas.editingId) return;
    const hit = e.target && e.target.closest ? e.target.closest('[data-fact],[data-fact-was],[data-chart-fact]') : null;
    const id = hit ? keyOf(hit) : null;
    if (id) show(id); else hide();
  }

  /* ------------------------------------------------------------------ */
  /* The 出處 pane                                                        */
  /* ------------------------------------------------------------------ */

  function section(title, count) {
    const s = mk('section', 'prov-sec');
    const h = mk('h3', 'prov-h', title);
    if (count !== undefined) h.append(mk('span', 'prov-count', count));
    s.append(h);
    return s;
  }
  function numberRow(n) {
    const b = mk('button', 'prov-row');
    b.type = 'button';
    b.dataset.id = n.id;
    const main = mk('span', 'prov-row-main');
    main.append(mk('span', 'prov-row-text', n.text === '' ? t('（空白）') : clip(n.text, 24)), mk('span', 'prov-row-sub', labelsOf(n.fact) || address(n.factId)));
    b.append(pill(n.status), main);
    b.addEventListener('click', () => reveal(n.id, true));
    return b;
  }
  const grouped = (text) => String(text).replace(/^(-?)(\d+)/, (all, s, int) => s + int.replace(/\B(?=(\d{3})+$)/g, ','));
  function ruleRow(r) {
    const box = mk('div', 'prov-rule');
    const head = mk('div', 'prov-rule-head');
    head.append(pill(r.result), mk('span', 'prov-rule-name', r.id));
    box.append(head);
    const sum = r.item.type === 'sum';
    if (r.result === 'unknown') box.append(mk('p', 'prov-say', r.why));
    else {
      const dl = mk('dl', 'prov-dl');
      row(dl, sum ? t('合計') : t('左邊'), grouped(r.left));
      row(dl, sum ? t('各項相加') : t('右邊'), grouped(r.right));
      row(dl, t('差距'), grouped(r.diff));
      if (r.item.tolerance !== undefined && String(r.item.tolerance) !== '0') row(dl, t('允許的差距'), String(r.item.tolerance));
      box.append(dl);
    }
    if (r.item.note) box.append(mk('p', 'prov-note', r.item.note));
    if (HE.fill && HE.fill.removeRule && HE.ingestCore) box.append(button('prov-rule-del', t('刪除規則'), () => act(HE.fill.removeRule(r.id))));
    return box;
  }

  /** Shows what a change to the rules could not do. The change itself re-renders the pane. */
  function act(promise, say) {
    return Promise.resolve(promise).then(
      (r) => { const error = r && r.error ? r.error : ''; if (say) say(error); else if (error) HE.ui.toast(error, { type: 'error' }); return !error; },
      (err) => { console.error('[HE] prov: rules', err); const error = String((err && err.message) || err); if (say) say(error); else HE.ui.toast(error, { type: 'error' }); return false; },
    );
  }

  function field(labelText, control) {
    const l = mk('label', 'prov-field');
    l.append(mk('span', 'prov-field-name', labelText), control);
    return l;
  }
  function input(name, placeholder, tag) {
    const e = mk(tag || 'input', tag === 'textarea' ? 'textarea' : 'input');
    e.name = name;
    if (tag === 'textarea') e.rows = 2; else e.type = 'text';
    e.spellcheck = false;
    e.autocomplete = 'off';
    if (placeholder) e.placeholder = placeholder;
    return e;
  }

  /** The form that adds a rule. Made once and put back on every render, so that what the user typed stays. */
  function ruleForm() {
    if (S.form) return S.form;
    const form = (S.form = mk('form', 'prov-form'));
    form.noValidate = true;
    const kind = mk('select', 'select');
    kind.name = 'type';
    for (const [value, text] of [['sum', t('合計等於各項的總和')], ['equal', t('2 個值相等')]]) { const o = mk('option', null, text); o.value = value; kind.append(o); }
    const example = t('檔名.xlsx/工作表/D14');
    const sum = mk('div', 'prov-form-kind');
    sum.append(field(t('合計的儲存格 ID'), input('total', example)), field(t('各項：1 個範圍，或多個 ID（用 ; 或換行分隔）'), input('parts', t('檔名.xlsx/工作表/D10:D13'), 'textarea')));
    const equal = mk('div', 'prov-form-kind');
    equal.append(field(t('左邊的儲存格 ID'), input('left', example)), field(t('右邊的儲存格 ID'), input('right', example)));
    equal.hidden = true;
    kind.addEventListener('change', () => { sum.hidden = kind.value !== 'sum'; equal.hidden = kind.value !== 'equal'; });
    const tolerance = input('tolerance');
    tolerance.value = '0';
    tolerance.inputMode = 'decimal';
    const error = mk('p', 'prov-form-error');
    error.hidden = true;
    error.setAttribute('role', 'alert');
    const add = mk('button', 'btn sm prov-rule-add', t('新增規則'));
    add.type = 'submit';
    form.append(mk('h4', 'prov-form-h', t('新增規則')), field(t('種類'), kind), field(t('名稱'), input('id')), sum, equal,
      field(t('允許的差距'), tolerance), field(t('說明（選填）'), input('note')), error, add);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (name) => form.elements[name].value;
      add.disabled = true;
      act(HE.fill.addRule({ type: v('type'), id: v('id'), total: v('total'), parts: v('parts'), left: v('left'), right: v('right'), tolerance: v('tolerance'), note: v('note') }),
        (why) => { error.textContent = why; error.hidden = !why; })
        .then((ok) => {
          add.disabled = false;
          if (!ok) return;
          for (const name of ['id', 'total', 'parts', 'left', 'right', 'note']) form.elements[name].value = '';
          form.elements.tolerance.value = '0';
        });
    });
    return form;
  }

  /** Who approved the rules, or the field and the button that approve them. A rule changed since is not approved. */
  function approval(info) {
    const box = mk('div', 'prov-approve');
    if (info.approvedBy !== undefined && info.approvedOn !== undefined) {
      box.append(mk('p', 'prov-say', t('確認人：{name}，{date}', { name: info.approvedBy, date: info.approvedOn })));
      return box;
    }
    box.append(mk('p', 'prov-say prov-unapproved', t('規則尚未確認')));
    if (!S.approver) {
      S.approver = input('approver', t('確認人的名字'));
      S.approver.setAttribute('aria-label', t('確認人的名字'));
    }
    const row = mk('div', 'prov-approve-row');
    row.append(S.approver, button('prov-approve-do', t('確認規則'), () => act(HE.fill.approveRules(S.approver.value)).then((ok) => { if (ok) S.approver.value = ''; })));
    box.append(row, mk('p', 'prov-note', t('確認表示你看過每一條規則，認為它們是對的。日期用今天。改動規則後必須重新確認。')));
    return box;
  }

  async function downloadRules() {
    const file = await HE.fill.rulesFile();
    if (!file) return;
    await HE.fileio.downloadText(file.text, 'rules.yaml', 'text/yaml;charset=utf-8');
    if (!file.same) HE.ui.toast(t('這份報告的規則是由別的規則檔填入的。下載的檔案內容相同，但寫法不同，SHA-256 與報告記錄的不一樣。在這裡確認規則後，兩者才會一致。'), { timeout: 10000 });
  }

  const RULES_MAX = 1024 * 1024; // a rules file is a page or two of text
  const busy = () => {
    if (!(HE.ai && HE.ai.busy)) return false;
    HE.ui.toast(t('AI 助理正在修改文件，請等它完成後再操作'), { type: 'error' });
    return true;
  };
  const stopTyping = () => { if (HE.canvas && HE.canvas.isEditingText && HE.canvas.isEditingText()) HE.canvas.endTextEdit(true); };

  /**
   * The user's own rules.yaml takes the place of the document's rules: from the button in the pane, or dropped on
   * the window (fileio.js). The file is text nobody checked: it is read as data, and what it says is shown with
   * textContent. Resolves to true when the rules were written.
   */
  async function loadRulesFile(file) {
    const name = String((file && file.name) || 'rules.yaml');
    const fail = (why) => { HE.ui.toast(why, { type: 'error', timeout: 12000 }); return false; };
    if (!file || !HE.fill || !HE.fill.loadRules || !HE.ingestCore || !HE.ingestCore.parseYamlLite) return fail(t('這個瀏覽器或這個版本無法計算勾稽規則'));
    if (busy()) return false;
    if (file.size > RULES_MAX) return fail(t('「{name}」有 {size}，超過規則檔 1 MB 的上限。沒有載入。', { name, size: HE.util.bytes(file.size) }));
    let text;
    // The bytes as they are: a byte order mark stays, so that the SHA-256 of the text is the SHA-256 of the file.
    try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer()); }
    catch (err) { return fail(t('無法載入「{name}」：它不是 UTF-8 編碼的文字檔', { name })); }
    stopTyping();
    const now = HE.fill.rules();
    if (now && now.items.length) {
      const ok = await HE.ui.confirm(t('這份文件已經有 {n} 條勾稽規則。載入「{name}」會取代全部規則，確認人與日期也改成檔案裡寫的。', { n: now.items.length, name }), { title: t('取代勾稽規則'), okLabel: t('取代') });
      if (!ok) return false;
      if (busy()) return false;
    }
    let done;
    try { done = await HE.fill.loadRules(text); } catch (err) { console.error('[HE] prov: rules file', err); done = { error: String((err && err.message) || err) }; }
    if (done.error) return fail(t('無法載入「{name}」：{why}', { name, why: done.error }));
    HE.ui.status(t('已載入「{name}」：{n} 條勾稽規則', { name, n: done.rules.length }));
    return true;
  }

  /** The file field behind 載入 rules.yaml. Made once and put back on every render. */
  function rulesInput() {
    if (S.rulesInput) return S.rulesInput;
    const input = (S.rulesInput = mk('input'));
    input.type = 'file';
    input.id = 'prov-rules-input';
    input.accept = '.yaml,.yml';
    input.hidden = true;
    input.setAttribute('aria-label', t('載入 rules.yaml'));
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = ''; // the same file can be chosen again
      if (file) loadRulesFile(file);
    });
    return input;
  }

  function rulesSection(st) {
    const rules = section(t('勾稽規則'), st.rules.length);
    const info = st.block && st.block.rules;
    const can = !!(HE.fill && HE.fill.addRule && HE.ingestCore);
    const files = mk('div', 'prov-rules-files');
    if (!st.rules.length) rules.append(mk('p', 'prov-say', t('這份報告沒有勾稽規則。')));
    else {
      rules.append(can ? approval(info) : mk('p', 'prov-say', info.approvedBy !== undefined && info.approvedOn !== undefined ? t('確認人：{name}，{date}', { name: info.approvedBy, date: info.approvedOn }) : t('規則尚未確認')));
      const order = { fail: 0, unknown: 1, pass: 2 };
      for (const r of st.rules.slice().sort((a, b) => order[a.result] - order[b.result])) rules.append(ruleRow(r));
      if (can) files.append(button('prov-rules-file', t('下載 rules.yaml'), downloadRules));
    }
    if (can) {
      if (HE.fill.loadRules && HE.ingestCore.parseYamlLite) files.append(button('prov-rules-load', t('載入 rules.yaml'), () => rulesInput().click()), rulesInput());
      rules.append(files);
      rules.append(mk('p', 'prov-note', t('規則檢查的是來源值，不是報告上顯示的文字。')));
      rules.append(ruleForm());
    }
    return rules;
  }

  /* ------------------------------------------------------------------ */
  /* 重新填入                                                             */
  /* ------------------------------------------------------------------ */

  function doRefill() {
    if (!HE.fill || !HE.fill.refill || busy()) return null;
    stopTyping();
    const r = HE.fill.refill();
    S.refillProblems = r.problems.slice();
    const n = { filled: r.filled, charts: r.charts, problems: r.problems.length };
    if (r.changed) HE.ui.status(t('已重新填入：{filled} 個數字、{charts} 張圖表，{problems} 個問題', n));
    else HE.ui.status(r.problems.length ? t('沒有需要更新的內容。有 {problems} 個問題', n) : t('沒有需要更新的內容'));
    queue();
    return r;
  }

  function refillBox() {
    const box = mk('div', 'prov-refill');
    const b = button('prov-refill-do', t('重新填入'), doRefill);
    b.title = t('用來源檔與出處資料，重新寫入每個引用的數字、重畫每張圖表');
    box.append(b);
    if (S.refillProblems.length) {
      box.append(mk('p', 'prov-say', t('重新填入時有 {n} 個問題：', { n: S.refillProblems.length })));
      const list = mk('ul', 'prov-problems');
      for (const p of S.refillProblems.slice(0, LIST_MAX)) list.append(mk('li', null, p));
      box.append(list);
    }
    return box;
  }

  /* ------------------------------------------------------------------ */
  /* 插入引用                                                             */
  /* ------------------------------------------------------------------ */

  const CITE_MAX = 20;
  // [value of data-fact-scale, name]. '' is no attribute; anything else is typed under 自訂.
  const SCALES = [['', t('原值')], ['1e-3', t('千（÷ 1,000）')], ['1e-4', t('萬（÷ 10,000）')], ['1e-6', t('百萬（÷ 1,000,000）')], ['1e-8', t('億（÷ 100,000,000）')], ['100', t('百分比（× 100）')]];
  /** The fact of an ID: from a loaded source file, else from the block the document carries. */
  function sourceFact(factId) {
    const loaded = HE.sources ? HE.sources.fact(factId) : null;
    if (loaded) return loaded;
    if (HE.doc.model) readBlock(HE.doc.model);
    return S.block && own(S.block.facts, factId) ? S.block.facts[factId] : null;
  }

  /**
   * Put a new citation into the text of `el` (a model element) after `offset` characters. The element that holds
   * that text gets its content written again with the citation in place. Returns the new element's id, or null.
   */
  function insertAt(el, offset, factId, label) {
    const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let before = 0, node, hit = null;
    while ((node = walker.nextNode())) {
      if (offset <= before + node.nodeValue.length) { hit = node; break; }
      before += node.nodeValue.length;
    }
    const host = hit && hit.parentElement;
    const hostId = host && host.getAttribute(ID);
    // Inside another citation there is nothing to split: that element holds one value.
    if (!hostId || host.closest('[data-fact],[data-fact-was],[data-chart]')) return null;
    const copy = host.cloneNode(true);
    const tail = copy.childNodes[Array.prototype.indexOf.call(host.childNodes, hit)].splitText(offset - before);
    const span = el.ownerDocument.createElement('span');
    span.setAttribute('data-fact', factId);
    copy.insertBefore(span, tail);
    const nth = Array.prototype.indexOf.call(copy.querySelectorAll('span[data-fact]'), span);
    HE.ops.setInnerHTML(hostId, copy.innerHTML, { label });
    const now = HE.doc.byId(hostId);
    const made = now ? now.querySelectorAll('span[data-fact]')[nth] : null;
    return made ? made.getAttribute(ID) : null;
  }

  /**
   * Cite one cell where the user is: an empty <span data-fact> that is filled at once, in one undo step. In the
   * text that was being typed in it goes where the caret was; in a selected text element, after its text; after
   * a selected citation. Returns {id, where: 'caret' | 'end' | 'after'} or {error}.
   */
  function cite(factId) {
    if (busy()) return { error: 'busy' };
    stopTyping(); // commits the text; 'textedit:end' leaves the caret in S.caret
    const no = (error) => { HE.ui.toast(error, { type: 'error', timeout: 8000 }); return { error }; };
    if (!sourceFact(factId)) return no(t('「{id}」不在來源檔或出處資料裡', { id: factId }));
    const id = HE.sel.primary;
    const el = id ? HE.doc.byId(id) : null;
    if (!el || HE.sel.ids.length !== 1) return no(t('請先在頁面上選取 1 個文字元素（例如段落、標題或表格的儲存格），再插入引用。'));
    const label = t('插入引用');
    const html = '<span data-fact="' + HE.util.esc(factId) + '"></span>';
    const cited = el.closest('[data-fact],[data-fact-was]');
    const textual = (e) => !!e && !HE.doc.isRoot(e) && HE.util.isTextEditable(e) && !e.closest('head,svg,[data-chart]');
    if (cited ? !textual(cited.parentElement) : !textual(el)) return no(t('選取的元素不能放引用。請選取 1 段文字（例如段落、標題或表格的儲存格）。'));
    const caret = S.caret && S.caret.id === id && S.caret.text === el.textContent ? S.caret.offset : null;
    let made = null, where = 'end';
    HE.history.transact(label, () => {
      if (cited) { made = (HE.ops.insertHTML(cited.getAttribute(ID), 'after', html, { label }) || [])[0] || null; where = 'after'; }
      else {
        if (caret !== null) { made = insertAt(el, caret, factId, label); if (made) where = 'caret'; }
        if (!made) made = (HE.ops.insertHTML(id, 'append', html, { label }) || [])[0] || null;
      }
      if (made) HE.fill.run();
    });
    S.caret = null;
    if (!made) return no(t('無法在這裡插入引用。'));
    HE.sel.set([made]);
    HE.ui.status(where === 'caret' ? t('已在游標處插入引用') : where === 'after' ? t('已在選取的引用後面插入引用') : t('已把引用加在文字最後'));
    return { id: made, where };
  }

  /**
   * How a citation shows its number: data-fact-scale, data-fact-digits, data-fact-group (null takes one off). The
   * new text is worked out first; a setting that cannot be shown writes nothing. One undo step, filled at once.
   * Returns '' or why not.
   */
  function setShow(id, next) {
    const m = HE.doc.byId(id);
    if (!m || !m.hasAttribute('data-fact')) return t('選取的元素不是引用');
    if (busy()) return 'busy';
    const factId = m.getAttribute('data-fact');
    const fact = sourceFact(factId);
    if (!fact) return t('「{id}」不在來源檔或出處資料裡', { id: factId });
    const attrs = Object.assign(showAttrs(m), next);
    for (const k of ['scale', 'digits', 'group']) if (attrs[k] === '' || attrs[k] === undefined) attrs[k] = null;
    const shown = shownText(fact, attrs);
    if (shown.error) return shown.error;
    HE.history.transact(t('變更引用的顯示方式'), () => {
      HE.ops.setAttr(id, { 'data-fact-scale': attrs.scale, 'data-fact-digits': attrs.digits, 'data-fact-group': attrs.group });
      HE.fill.run();
    });
    return '';
  }

  /** The controls for the selected citation: the factor, the decimals, the thousands separators. */
  function renderShow() {
    const box = S.cite && S.cite.show;
    if (!box) return;
    const id = HE.sel.ids.length === 1 ? HE.sel.primary : null;
    const m = id ? HE.doc.byId(id) : null;
    const on = !!m && m.hasAttribute('data-fact') && !m.closest('[data-chart]');
    const a = on ? showAttrs(m) : null;
    const factId = on ? m.getAttribute('data-fact') : '';
    const fact = on ? sourceFact(factId) : null;
    // The pane is rendered again after every change. Controls that would come out the same stay as they are, so
    // that a list the user has open, or a field being typed in, is not replaced under the pointer.
    const key = on ? JSON.stringify([id, factId, a, fact ? String(fact.text) : null]) : '';
    if (key === S.cite.showKey) return;
    S.cite.showKey = key;
    box.replaceChildren();
    if (!on) return;
    box.append(mk('h4', 'prov-form-h', t('選取的引用怎麼顯示')));
    const dl = mk('dl', 'prov-dl');
    row(dl, t('位置', null, 'source'), address(factId), true);
    if (fact) row(dl, t('來源值'), String(fact.text));
    box.append(dl);
    const error = mk('p', 'prov-form-error');
    error.hidden = true;
    error.setAttribute('role', 'alert');
    let asWritten = () => {};
    // A setting that is refused is said here, and the controls go back to what the element has.
    const apply = (next, keep) => {
      const why = setShow(id, next);
      if (!why) return;
      if (why !== 'busy') { error.textContent = why; error.hidden = false; }
      if (!keep) asWritten();
    };

    const scale = mk('select', 'select');
    scale.id = 'prov-show-scale';
    for (const [value, name] of SCALES.concat([['custom', t('自訂')]])) { const o = mk('option', null, name); o.value = value; scale.append(o); }
    const known = a.scale === null ? '' : SCALES.some((s) => s[0] === a.scale.trim()) ? a.scale.trim() : 'custom';
    scale.value = known;
    const custom = input('scale', '0.001');
    custom.id = 'prov-show-scale-custom';
    custom.inputMode = 'decimal';
    custom.setAttribute('aria-label', t('自訂的倍率'));
    custom.value = known === 'custom' ? a.scale : '';
    custom.hidden = known !== 'custom';
    scale.addEventListener('change', () => {
      custom.hidden = scale.value !== 'custom';
      if (scale.value === 'custom') { custom.focus(); return; } // nothing is written until a factor is typed
      apply({ scale: scale.value });
    });
    // What was typed stays in the field when it is refused, to be corrected.
    custom.addEventListener('change', () => apply({ scale: custom.value.trim() }, true));

    const digits = mk('select', 'select');
    digits.id = 'prov-show-digits';
    const asIs = mk('option', null, t('不指定'));
    asIs.value = '';
    digits.append(asIs);
    for (let d = 0; d <= 10; d++) { const o = mk('option', null, String(d)); o.value = String(d); digits.append(o); }
    digits.value = a.digits === null ? '' : a.digits.trim();
    digits.addEventListener('change', () => apply({ digits: digits.value }));

    const group = mk('input');
    group.type = 'checkbox';
    group.id = 'prov-show-group';
    group.checked = a.group !== 'off';
    group.addEventListener('change', () => apply({ group: group.checked ? null : 'off' }));
    const groupLabel = mk('label', 'prov-check');
    groupLabel.append(group, mk('span', null, t('千分位（,）')));

    asWritten = () => {
      scale.value = known;
      custom.hidden = known !== 'custom';
      digits.value = a.digits === null ? '' : a.digits.trim();
      group.checked = a.group !== 'off';
    };
    box.append(field(t('倍率'), scale), custom, field(t('小數位數'), digits), groupLabel, error);
    if (a.scale === null && a.digits === null) box.append(mk('p', 'prov-note', t('沒有倍率也沒有小數位數時，顯示來源檔裡的文字，千分位的設定不起作用。')));
  }

  function renderHits() {
    const c = S.cite;
    if (!c) return;
    c.hits.replaceChildren();
    const q = c.q.value.trim();
    if (!q || !HE.sources || !HE.sources.all().length) return;
    let got;
    try { got = HE.sources.search(q, CITE_MAX); } catch (err) { return; }
    if (!got.cells.length) { c.hits.append(mk('p', 'prov-say', t('找不到符合的儲存格。'))); return; }
    for (const cell of got.cells) {
      const b = mk('button', 'prov-row prov-cite-hit');
      b.type = 'button';
      b.dataset.cell = cell.id;
      const main = mk('span', 'prov-row-main');
      const what = labelsOf(cell);
      main.append(mk('span', 'prov-row-text', clip(cell.text !== undefined ? cell.text : cell.value, 32)), mk('span', 'prov-row-sub', what ? address(cell.id) + ' · ' + what : address(cell.id)));
      b.append(main);
      b.title = t('插入這個儲存格的引用');
      b.addEventListener('click', () => cite(cell.id));
      c.hits.append(b);
    }
    if (got.more) c.hits.append(mk('p', 'prov-say', t('還有 {n} 個沒有列出。', { n: got.more })));
  }

  /** 插入引用: a search of the source files, and the controls of the selected citation. Made once, like the rule form. */
  function citeSection() {
    if (!S.cite) {
      const sec = section(t('插入引用'));
      sec.classList.add('prov-cite');
      const hint = mk('p', 'prov-say prov-cite-hint', t('還沒有來源檔。把 Excel 檔（.xlsx）拖進視窗，就能搜尋儲存格並插入引用。'));
      const how = mk('p', 'prov-say', t('先在頁面上選取 1 段文字，或把游標放在文字裡；再搜尋儲存格，點 1 筆結果。數字由編輯器填入。'));
      const q = input('cite', t('搜尋儲存格：文字、標題或位址'));
      q.id = 'prov-cite-q';
      q.type = 'search';
      q.setAttribute('aria-label', t('搜尋儲存格：文字、標題或位址'));
      q.addEventListener('input', renderHits);
      const hits = mk('div', 'prov-cite-hits');
      const show = mk('div', 'prov-cite-show');
      sec.append(hint, how, q, hits, show);
      S.cite = { sec, hint, how, q, hits, show, showKey: null };
    }
    const has = !!(HE.sources && HE.sources.all().length);
    S.cite.hint.hidden = has;
    S.cite.how.hidden = !has;
    S.cite.q.hidden = !has;
    // The results change with what is typed and with the source files (init), not with the document: a result
    // under the pointer is the same element when the click that began on it ends.
    renderShow();
    return S.cite.sec;
  }

  function renderPane(st) {
    const pane = S.pane;
    if (!pane) return;
    const keep = pane.scrollTop;
    // The fields the user is typing in are put back as the same elements; the one in use keeps the cursor.
    const typing = document.activeElement && pane.contains(document.activeElement) && /^(input|textarea|select)$/i.test(document.activeElement.tagName) ? document.activeElement : null;
    const done = () => { pane.scrollTop = keep; if (typing && pane.contains(typing)) typing.focus(); };
    pane.replaceChildren();
    if (!st.has) {
      const empty = mk('div', 'prov-empty');
      empty.append(mk('p', null, t('這份文件沒有出處資料。')), mk('p', null, t('把 Excel 檔（.xlsx）拖進視窗，再請 AI 助理用它寫報告；或用 tactile-ingest 的 fill 指令產生報告。這 2 種報告會記下每個數字來自來源檔的哪一格。')));
      pane.append(empty);
      // A chart or a citation written by hand, not filled yet.
      if (st.fillable) pane.append(refillBox());
      pane.append(citeSection());
      // With a source file in the tab, a rule can be the first thing that cites it.
      if (HE.sources && HE.sources.all().length) pane.append(rulesSection(st));
      done();
      return;
    }
    const banner = mk('div', 'prov-banner');
    banner.append(mk('strong', null, LEVEL_NOTE), mk('p', null, LEVEL_WHY));
    pane.append(banner);
    if (st.blockError) pane.append(mk('p', 'prov-error', st.blockError));
    else if (!st.block) pane.append(mk('p', 'prov-error', t('這份文件有標示來源的數字，但沒有出處資料，無法核對。')));

    const counts = mk('div', 'prov-counts');
    const count = (key, n) => { const c = mk('span', 'prov-stat'); c.append(mk('b', null, n), document.createTextNode(' ' + key)); counts.append(c); };
    count(t('相符'),byStatus(st, 'ok').length);
    count(t('不符'),byStatus(st, 'mismatch').length);
    count(t('找不到'),byStatus(st, 'missing').length);
    count(t('已偏離'),byStatus(st, 'was').length);
    count(t('無出處'),st.uncited.length);
    pane.append(counts);
    if (st.marks.length) pane.append(mk('p', 'prov-note', t('圖表的圖形 {n} 個。{note}', { n: st.marks.length, note: MARK_NOTE })));
    if (st.fillable) pane.append(refillBox());

    pane.append(citeSection());
    pane.append(rulesSection(st));

    const flagged = st.numbers.filter((n) => n.status !== 'ok');
    if (flagged.length) {
      const sec = section(t('需要看的數字'),flagged.length);
      for (const n of flagged) sec.append(numberRow(n));
      pane.append(sec);
    }
    if (st.uncited.length) {
      const sec = section(t('無出處的數字'),st.uncited.length);
      sec.append(mk('p', 'prov-say', t('這些文字含有數字，但沒有標示來源。年份與編號也會列在這裡，由你判斷。')));
      for (const u of st.uncited.slice(0, LIST_MAX)) {
        const b = mk('button', 'prov-row');
        b.type = 'button';
        b.append(mk('span', 'prov-row-text', u.text));
        b.addEventListener('click', () => reveal(u.id, false));
        sec.append(b);
      }
      if (st.uncited.length > LIST_MAX) sec.append(mk('p', 'prov-say', t('還有 {n} 個沒有列出。', { n: st.uncited.length - LIST_MAX })));
      pane.append(sec);
    }
    const fine = byStatus(st, 'ok');
    if (fine.length) {
      const sec = section(t('相符的數字'),fine.length);
      for (const n of fine.slice(0, LIST_MAX)) sec.append(numberRow(n));
      if (fine.length > LIST_MAX) sec.append(mk('p', 'prov-say', t('還有 {n} 個沒有列出。', { n: fine.length - LIST_MAX })));
      pane.append(sec);
    }
    if (st.block && Array.isArray(st.block.sources) && st.block.sources.length) {
      const sec = section(t('來源檔'),st.block.sources.length);
      for (const s of st.block.sources) {
        const dl = mk('dl', 'prov-dl');
        row(dl, t('檔案'), s.file);
        row(dl, t('大小'), typeof s.bytes === 'number' ? t('{n} 位元組', { n: s.bytes.toLocaleString('en-US') }) : '');
        row(dl, 'SHA-256', typeof s.sha256 === 'string' ? s.sha256.slice(0, 16) + '…' : '', true);
        if (typeof s.sha256 === 'string') dl.lastChild.title = s.sha256;
        sec.append(dl);
      }
      if (st.block.filledAt) sec.append(mk('p', 'prov-say', t('填入時間：{time}', { time: st.block.filledAt })));
      pane.append(sec);
    }
    done();
  }

  function renderTab(st) {
    if (!S.tab) return;
    const n = st.has ? problems(st) : 0;
    S.tab.textContent = t('出處');
    if (n) S.tab.append(mk('span', 'prov-badge', n));
    S.tab.title = n ? t('有 {n} 個項目需要看', { n }) : '';
  }

  /* ------------------------------------------------------------------ */

  function refresh() {
    S.queued = false;
    const st = (S.state = compute());
    takeBaseline();
    paintLive(st);
    renderTab(st);
    renderPane(st);
    if (S.shown) { if (!show(S.shown)) hide(); }
  }
  function queue() {
    if (S.queued) return;
    S.queued = true;
    requestAnimationFrame(refresh);
  }

  function init() {
    const nav = document.querySelector('[data-tabs="right"] .tabs');
    S.pane = document.getElementById('prov-pane');
    S.tab = nav ? nav.querySelector('[data-tab="prov"]') : null;
    S.pop = mk('div', 'prov-pop');
    S.pop.id = 'prov-pop';
    S.pop.hidden = true;
    S.pop.setAttribute('role', 'dialog');
    S.pop.setAttribute('aria-label', t('數字的來源'));
    (document.getElementById('layer-root') || document.body).append(S.pop);

    HE.history.addCloser(onClose);
    // The baseline is what each cited number said before the step that is about to run.
    HE.on('doc:loaded', () => { S.blockText = null; S.caret = null; S.refillProblems = []; hide(); takeBaseline(); queue(); });
    HE.on('doc:changed', () => { takeBaseline(); queue(); });
    HE.on('mode:changed', queue);
    HE.on('sources:changed', () => { renderHits(); queue(); });
    HE.on('textedit:start', hide);
    // Where the caret was in the text the user just left: a citation inserted next goes there (cite()).
    HE.on('textedit:end', (p) => {
      const m = p && typeof p.caret === 'number' ? HE.doc.byId(p.id) : null;
      S.caret = m ? { id: p.id, offset: p.caret, text: m.textContent } : null;
    });
    HE.on('selection:changed', ({ ids }) => {
      renderShow();
      if (!S.shown) return;
      const shown = modelEl(S.shown);
      const ok = shown && (ids || []).some((id) => { const m = HE.doc.byId(id); return m && (m === shown || m.contains(shown)); });
      if (!ok) hide();
    });
    HE.on('canvas:ready', (p) => {
      const d = (p && p.doc) || HE.live.doc;
      const win = d && d.defaultView;
      if (win) {
        win.addEventListener('click', onFrameClick, true);
        win.addEventListener('scroll', place, true);
      }
      paintLive(S.state || (S.state = compute()));
      place();
    });
    window.addEventListener('resize', place);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.shown) hide(); });
    queue();
  }

  HE.prov = { init, state: () => S.state || (S.state = compute()), shownText, runRule, show, hide, restore, refresh, loadRulesFile, cite, setShow, refill: doRefill, uncitedIn };
})();
