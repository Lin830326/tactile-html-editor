/* Tactile HTML editor — layers.js
 *
 * The structure tree of the page body (left panel, 圖層 tab).
 * Rows are built from the model and only for expanded branches; the tree is
 * rebuilt (debounced) whenever the document or the canvas changes. Only the
 * rows in and near the pane's view are in the DOM (all rows are ROW_H tall, so
 * spacers stand in for the rest and a row's place follows from its index); a
 * big page would otherwise rebuild thousands of rows on every edit. Expansion
 * and "hide in editor" state live in memory, keyed by element id. Hiding only
 * sets data-he-hidden on the live element (core strips it on commit), so it is
 * never written to the model or exported; the canvas's run frame marks its own
 * copy (hiddenIds()).
 */
(function () {
  'use strict';

  const HE = window.HE;
  const t = HE.t;
  const util = HE.util;
  const ui = HE.ui;
  const ID = HE.ID_ATTR;

  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta']);
  const OPAQUE = new Set(['svg', 'math']);
  const SECTION_TAGS = new Set(['section', 'header', 'footer', 'main', 'article', 'nav', 'div', 'aside', 'form',
    'fieldset', 'details', 'dialog', 'address', 'hgroup', 'search']);
  const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']);

  const DEFAULT_OPEN_DEPTH = 2;
  const INDENT = 12;
  const INDENT_FULL_LEVELS = 6; // deeper levels are compressed so rows keep room for text
  const INDENT_DEEP = 4;
  const INDENT_MAX = 120;
  const MAX_ROWS = 50000;
  const ROW_H = 26; // .lyr-row height in left.css
  const OVERSCAN = 20; // rows rendered beyond each edge of the view
  const ROW_ID = 'lyr-row-';
  const HIDDEN_ATTR = 'data-he-hidden';
  const HIDDEN_CSS = '[' + HIDDEN_ATTR + ']{display:none !important}';
  const DRAG_THRESHOLD = 4;
  const ARCHIVED_STATE_LIMIT = 100000;
  const MATCH_CANDIDATES_LIMIT = 64;
  const MATCH_NODES_LIMIT = 40000;
  const MATCH_CHARS_LIMIT = 2000000;

  let pane = null;
  let searchBox = null;
  let searchInput = null;
  let clearBtn = null;
  let countEl = null;
  let tree = null;
  let dropLine = null;

  const expandState = new Map(); // id -> bool, overrides the default depth rule
  const hidden = new Set();
  // A whole-document replacement assigns new editor IDs. Remember the previous model until the replacement event,
  // and retain bounded state for IDs in history snapshots so undo can restore an otherwise unmatched layer.
  let stateModel = null;
  const archivedState = new Map();
  let query = '';
  let filter = null; // {visible:Set, matches:Set} while searching
  let rows = []; // [{el, id, depth, hasKids, open, pos, size}] in display order
  let rowIndex = new Map(); // id -> index in rows
  let truncated = false;
  let shown = new Map(); // id -> row element, for the rows in the DOM
  let winStart = 0; // rows[winStart, winEnd) are in the DOM
  let winEnd = 0;
  let dirty = true;
  let pendingReveal = null;
  let hoverId = null;
  let canvasHoverId = null;
  let liveMap = null; // {doc, els: id -> live element}, built lazily; dropped when the document or the canvas changes
  let drag = null;
  let suppressClick = false;

  const scheduleRender = util.debounce(renderNow, 120);

  /* ------------------------------------------------------------------ */
  /* Model helpers                                                       */
  /* ------------------------------------------------------------------ */

  function bodyEl() { return HE.doc.body; }
  function aiBusy() { return !!(HE.ai && HE.ai.busy); }
  function idOf(el) { return el && el.getAttribute ? el.getAttribute(ID) : null; }
  function listed(el) { return !SKIP.has(util.tag(el)) && el.hasAttribute(ID); }

  function uniqueUserIds(d) {
    const ids = new Map();
    if (!d) return ids;
    for (const el of d.querySelectorAll('[id]')) {
      const id = el.getAttribute('id');
      if (!id) continue;
      ids.set(id, ids.has(id) ? null : el);
    }
    return ids;
  }

  function matchKey(el) {
    let length = 0;
    for (const attr of el.attributes) {
      length += attr.name.length + attr.value.length;
      if (length > 100000) return null;
    }
    const attrs = Array.from(el.attributes).filter((a) => a.name !== ID)
      .map((a) => [a.namespaceURI || '', a.name, a.value]);
    attrs.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify([el.namespaceURI || '', el.localName, attrs]);
  }

  function replaceLayerState(previous, next, history) {
    if (!previous || !next || previous === next || !previous.body || !next.body) return;
    const oldEls = Array.from(previous.body.querySelectorAll('[' + ID + ']')).filter(listed);
    const newEls = Array.from(next.body.querySelectorAll('[' + ID + ']')).filter(listed);
    const oldIds = uniqueUserIds(previous);
    const newIds = uniqueUserIds(next);
    const pairs = [];
    const matchedOld = new Set();
    const matchedNew = new Set();
    let remainingNodes = MATCH_NODES_LIMIT;
    let remainingChars = MATCH_CHARS_LIMIT;
    const signatures = new Map();
    const signature = (el) => {
      if (signatures.has(el)) return signatures.get(el);
      const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_ALL);
      let node = el;
      while (node) {
        remainingNodes--;
        remainingChars -= (node.nodeName || '').length + (node.nodeValue || '').length;
        if (node.attributes) for (const attr of node.attributes) remainingChars -= attr.name.length + attr.value.length;
        if (remainingNodes < 0 || remainingChars < 0) { signatures.set(el, null); return null; }
        node = walker.nextNode();
      }
      const copy = el.cloneNode(true);
      copy.removeAttribute(ID);
      copy.querySelectorAll('[' + ID + ']').forEach((child) => child.removeAttribute(ID));
      const result = copy.outerHTML;
      signatures.set(el, result);
      return result;
    };

    for (const el of oldEls) {
      const userId = el.getAttribute('id');
      const other = userId && oldIds.get(userId) === el ? newIds.get(userId) : null;
      if (!other || !next.body.contains(other) || !listed(other) ||
          other.localName !== el.localName || other.namespaceURI !== el.namespaceURI) continue;
      pairs.push([el, other]);
      matchedOld.add(el);
      matchedNew.add(other);
    }

    // Elements without author IDs can be matched only when their complete unchanged subtree is unique on both sides.
    // Bound the work: an ambiguous or unusually large group falls back to the default layer state.
    const relevant = new Set();
    for (const el of oldEls) {
      const id = idOf(el);
      if (!el.hasAttribute('id') && (expandState.has(id) || hidden.has(id))) {
        const key = matchKey(el);
        if (key) relevant.add(key);
      }
    }
    for (const el of newEls) {
      if (!el.hasAttribute('id') && archivedState.has(idOf(el))) {
        const key = matchKey(el);
        if (key) relevant.add(key);
      }
    }
    const oldGroups = new Map();
    const newGroups = new Map();
    const group = (els, groups, matched) => {
      for (const el of els) {
        if (matched.has(el) || el.hasAttribute('id')) continue;
        const key = matchKey(el);
        if (!relevant.has(key)) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(el);
      }
    };
    if (relevant.size) { group(oldEls, oldGroups, matchedOld); group(newEls, newGroups, matchedNew); }
    for (const [key, olds] of oldGroups) {
      const news = newGroups.get(key) || [];
      if (!news.length || olds.length > MATCH_CANDIDATES_LIMIT || news.length > MATCH_CANDIDATES_LIMIT || remainingNodes <= 0 || remainingChars <= 0) continue;
      const groupedSignatures = (els) => {
        const found = new Map();
        for (const el of els) {
          const s = signature(el);
          if (s == null) return null;
          found.set(s, found.has(s) ? null : el);
        }
        return found;
      };
      const a = groupedSignatures(olds), b = groupedSignatures(news);
      if (!a || !b) continue;
      for (const [s, el] of a) if (el && b.get(s)) pairs.push([el, b.get(s)]);
    }

    for (const el of oldEls) {
      archivedState.delete(idOf(el));
    }
    // Deleted elements can still be restored by an older undo step. Their IDs remain in the state maps.
    for (const id of new Set([...expandState.keys(), ...hidden])) {
      archivedState.delete(id);
      archivedState.set(id, { expanded: expandState.has(id) ? expandState.get(id) : null, hidden: hidden.has(id) });
    }
    while (archivedState.size > ARCHIVED_STATE_LIMIT) archivedState.delete(archivedState.keys().next().value);
    const oldExpand = new Map(expandState), oldHidden = new Set(hidden);
    expandState.clear();
    hidden.clear();
    for (const el of newEls) {
      const id = idOf(el), state = archivedState.get(id);
      if (!state) continue;
      if (state.expanded !== null) expandState.set(id, state.expanded);
      if (state.hidden) hidden.add(id);
    }
    const preservedHidden = new Set();
    for (const [oldEl, newEl] of pairs) {
      const a = idOf(oldEl), b = idOf(newEl);
      if (oldExpand.has(a)) expandState.set(b, oldExpand.get(a)); else expandState.delete(b);
      const needsProof = oldHidden.has(a) || archivedState.has(b);
      const oldSignature = needsProof && a !== b ? signature(oldEl) : null;
      const same = a === b || !needsProof || (oldSignature !== null && oldSignature === signature(newEl));
      if (same) {
        if (oldHidden.has(a)) { hidden.add(b); preservedHidden.add(a); } else hidden.delete(b);
      }
    }
    if (!history && oldEls.some((el) => oldHidden.has(idOf(el)) && !preservedHidden.has(idOf(el)))) {
      ui.toast(t('部分隱藏圖層無法確認對應，重新載入後已恢復顯示；請檢查圖層。'), { timeout: 8000 });
    }
    pendingReveal = null;
    canvasHoverId = null;
  }

  function kidsOf(el) {
    if (OPAQUE.has(util.tag(el))) return [];
    return Array.from(el.children).filter(listed);
  }
  function hasKids(el) {
    if (OPAQUE.has(util.tag(el))) return false;
    for (const c of el.children) if (listed(c)) return true;
    return false;
  }
  function hasVisibleKids(el) {
    if (OPAQUE.has(util.tag(el))) return false;
    for (const c of el.children) if (filter.visible.has(idOf(c))) return true;
    return false;
  }

  function isOpen(el, depth) {
    const id = idOf(el);
    if (expandState.has(id)) return expandState.get(id);
    return depth < DEFAULT_OPEN_DEPTH && !util.isTextEditable(el);
  }
  function depthOf(el) {
    const b = bodyEl();
    let d = 0;
    for (let p = el.parentElement; p && p !== b; p = p.parentElement) d++;
    return d;
  }

  function indentPx(depth) {
    const px = depth <= INDENT_FULL_LEVELS ? depth * INDENT : INDENT_FULL_LEVELS * INDENT + (depth - INDENT_FULL_LEVELS) * INDENT_DEEP;
    return Math.min(px, INDENT_MAX);
  }

  /* ------------------------------------------------------------------ */
  /* Live helpers (computed style for row icons, hide-in-editor)         */
  /* ------------------------------------------------------------------ */

  function buildLiveMap() {
    liveMap = { doc: HE.live.doc, els: new Map() };
    try {
      liveMap.doc.querySelectorAll('[' + ID + ']').forEach((n) => liveMap.els.set(n.getAttribute(ID), n));
    } catch (e) { /* frame detached */ }
  }
  function liveEl(id) {
    if (!HE.live.doc) return null;
    if (!liveMap || liveMap.doc !== HE.live.doc) buildLiveMap();
    let l = liveMap.els.get(id);
    // Page scripts (compat mode) can replace elements without doc:changed or canvas:ready.
    if (l && !l.isConnected) { buildLiveMap(); l = liveMap.els.get(id); }
    return l || null;
  }
  function computed(id) {
    const l = liveEl(id);
    if (!l) return null;
    try {
      const view = l.ownerDocument.defaultView;
      return view ? view.getComputedStyle(l) : null;
    } catch (e) { return null; }
  }

  function isLayoutBox(el, id) {
    const cs = computed(id);
    let display = cs ? cs.display : '';
    if (!cs) {
      const m = /(?:^|;)\s*display\s*:\s*([a-z-]+)/i.exec(el.getAttribute('style') || '');
      display = m ? m[1] : '';
    }
    return /flex|grid/i.test(display);
  }
  function looksLikeButton(el, id) {
    if (el.getAttribute('role') === 'button') return true;
    if (/(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(el.getAttribute('class') || '')) return true;
    const cs = computed(id);
    if (!cs) return false;
    const bg = cs.backgroundColor || '';
    const filled = !!bg && bg !== 'transparent' && !/,\s*0\)$/.test(bg) && !/\/\s*0\)$/.test(bg);
    const bordered = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none';
    const padded = parseFloat(cs.paddingLeft) >= 6 && parseFloat(cs.paddingTop) >= 2;
    return (filled || bordered) && padded;
  }

  function typeIcon(el, id) {
    const tag = util.tag(el);
    if (/^h[1-6]$/.test(tag)) return 'heading';
    switch (tag) {
      case 'p': case 'span': return 'text';
      case 'img': case 'picture': case 'svg': case 'canvas': case 'figure': return 'image';
      case 'table': case 'thead': case 'tbody': case 'tfoot': case 'tr': case 'colgroup': return 'table';
      case 'ul': case 'ol': case 'li': case 'dl': case 'menu': return 'list';
      case 'pre': case 'code': return 'code';
      case 'video': case 'iframe': case 'audio': case 'embed': case 'object': return 'video';
      case 'button': return 'button';
      case 'a': return looksLikeButton(el, id) ? 'button' : 'link';
      case 'blockquote': return 'quote';
      case 'hr': return 'minus';
      default: break;
    }
    if (tag === 'input' && /^(button|submit|reset)$/i.test(el.getAttribute('type') || '')) return 'button';
    const textual = util.isTextEditable(el);
    if (!textual && isLayoutBox(el, id)) return 'columns';
    if (SECTION_TAGS.has(tag)) return 'section';
    return textual ? 'text' : 'section';
  }

  function ownText(el) {
    let s = '';
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.textContent;
    return s.replace(/\s+/g, ' ').trim();
  }
  function shorten(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function srcName(src) {
    if (!src) return '';
    if (/^data:/i.test(src)) return t('內嵌檔案');
    const path = src.split(/[?#]/)[0];
    const last = path.split('/').filter(Boolean).pop() || path;
    try { return decodeURIComponent(last); } catch (e) { return last; }
  }
  /** {text, soft}: soft text is a muted hint (e.g. the content of a collapsed container). */
  function snippetOf(el, open) {
    const tag = util.tag(el);
    if (tag === 'img') {
      const alt = el.getAttribute('alt');
      return alt ? { text: shorten(alt, 48), soft: false } : { text: srcName(el.getAttribute('src')), soft: true };
    }
    if (tag === 'input' || tag === 'textarea') return { text: el.getAttribute('placeholder') || el.getAttribute('value') || '', soft: true };
    if (tag === 'iframe' || tag === 'video' || tag === 'audio' || tag === 'source') return { text: srcName(el.getAttribute('src')), soft: true };
    if (OPAQUE.has(tag)) return { text: el.getAttribute('aria-label') || '', soft: true };
    if (util.isTextEditable(el)) return { text: util.snippet(el, 48), soft: false };
    const own = ownText(el);
    if (own) return { text: shorten(own, 48), soft: false };
    if (!open) return { text: util.snippet(el, 36), soft: true };
    return { text: '', soft: false };
  }

  /* ------------------------------------------------------------------ */
  /* Search filter                                                       */
  /* ------------------------------------------------------------------ */

  function matchesQuery(el, q) {
    const tag = util.tag(el);
    const idAttr = (el.getAttribute('id') || '').toLowerCase();
    const cls = (el.getAttribute('class') || '').toLowerCase();
    if (q.length > 1 && q[0] === '#') return idAttr.includes(q.slice(1));
    if (q.length > 1 && q[0] === '.') return cls.includes(q.slice(1));
    if (tag.startsWith(q) || idAttr.includes(q) || cls.includes(q)) return true;
    let text;
    if (tag === 'img') text = el.getAttribute('alt') || '';
    else if (OPAQUE.has(tag)) text = el.getAttribute('aria-label') || '';
    else text = util.isTextEditable(el) ? el.textContent : ownText(el);
    return text.replace(/\s+/g, ' ').toLowerCase().includes(q);
  }

  /** Matching elements plus their ancestors, so every hit shows where it lives. */
  function computeFilter(q) {
    const visible = new Set();
    const matches = new Set();
    const visit = (el) => {
      if (!listed(el)) return false;
      let keep = false;
      if (!OPAQUE.has(util.tag(el))) for (const c of el.children) if (visit(c)) keep = true;
      const id = idOf(el);
      if (matchesQuery(el, q)) { matches.add(id); keep = true; }
      if (keep) visible.add(id);
      return keep;
    };
    const b = bodyEl();
    if (b) for (const c of b.children) visit(c);
    return { visible, matches };
  }

  function setQuery(value, render = true) {
    const raw = String(value || '');
    if (searchInput.value !== raw) searchInput.value = raw;
    clearBtn.hidden = !raw;
    const q = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (q === query) return false;
    query = q;
    tree.classList.toggle('is-filtering', !!q);
    if (render) { renderNow(); pane.scrollTop = 0; }
    return true;
  }

  function updateCount() {
    if (!countEl) return;
    const n = filter ? filter.matches.size : 0;
    countEl.hidden = !filter || !n;
    countEl.textContent = n ? t('符合 {n} 個元素', { n }) : '';
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function rowHTML(r) {
    const { el, id, depth, hasKids: kids, open } = r;
    const label = util.label(el);
    // Kept on the row until the next render: scrolling re-renders the same rows (a collapsed snippet reads a whole subtree).
    const snip = r.snip || (r.snip = snippetOf(el, open));
    const icon = r.icon || (r.icon = typeIcon(el, id));
    const isHidden = hidden.has(id);
    const eid = util.esc(id);
    let cls = 'lyr-row';
    if (isHidden) cls += ' is-hidden';
    if (filter && !filter.matches.has(id)) cls += ' is-context';
    const eyeLabel = isHidden ? t('在編輯器中顯示') : t('在編輯器中隱藏');
    const eyeTitle = isHidden ? eyeLabel : t('在編輯器中隱藏（不影響匯出）');
    const fx = HE.fx ? HE.fx.describe(el) : '';
    const fxLabel = fx ? util.esc(t('動態效果：{fx}', { fx })) : '';
    const fxBadge = fx ? '<span class="lyr-fx" role="img" aria-label="' + fxLabel + '" title="' + fxLabel + '">' +
      ui.icon('motion', 12) + '</span>' : '';
    // setsize/posinset: the siblings outside the view are not in the DOM to be counted.
    return '<div class="' + cls + '" role="treeitem" id="' + ROW_ID + eid + '" data-id="' + eid + '" aria-level="' + (depth + 1) + '"' +
      ' aria-setsize="' + r.size + '" aria-posinset="' + r.pos + '"' +
      (kids ? ' aria-expanded="' + open + '"' : '') + ' aria-selected="false" style="--lyr-indent:' + indentPx(depth) + 'px">' +
      '<span class="lyr-caret' + (kids ? '' : ' is-leaf') + '"' + (kids ? ' data-act="toggle"' : '') + ' aria-hidden="true">' +
        (kids ? ui.icon('chevron-right', 12) : '') + '</span>' +
      '<span class="lyr-type" aria-hidden="true">' + ui.icon(icon, 14) + '</span>' +
      '<span class="lyr-name' + (snip.text ? '' : ' is-solo') + '" title="' + util.esc(label) + '">' + util.esc(label) + '</span>' +
      (snip.text ? '<span class="lyr-text' + (snip.soft ? ' is-soft' : '') + '">' + util.esc(snip.text) + '</span>' : '') +
      fxBadge +
      '<button type="button" class="lyr-eye" id="lyr-eye-' + eid + '" data-act="eye" tabindex="-1" aria-pressed="' + isHidden + '"' +
        ' aria-label="' + util.esc(eyeLabel) + '" title="' + util.esc(eyeTitle) + '">' +
        ui.icon(isHidden ? 'eye-off' : 'eye', 14) + '</button>' +
      '</div>';
  }

  function emptyHTML() {
    if (query) {
      return '<div class="empty lyr-empty">' + ui.icon('search', 28) +
        '<div>' + util.esc(t('找不到符合「{q}」的元素。', { q: searchInput.value.trim() })) + '</div></div>';
    }
    return '<div class="empty lyr-empty">' + ui.icon('layers', 28) +
      '<div>' + t('頁面還沒有任何內容。') + '</div>' +
      '<button type="button" class="btn sm" id="layers-empty-insert">' + ui.icon('plus', 14) + t('插入第一個區塊') + '</button></div>';
  }

  function collectRows() {
    const out = [];
    let cut = false;
    const b = bodyEl();
    if (!b) return { out, truncated: cut };
    const walk = (parent, depth) => {
      const level = [];
      for (const el of parent.children) {
        if (cut) break;
        if (!listed(el)) continue;
        const id = idOf(el);
        if (filter && !filter.visible.has(id)) continue;
        // Cut only when a row is left over, so a tree of exactly MAX_ROWS rows is not reported as cut.
        if (out.length >= MAX_ROWS) { cut = true; break; }
        const kids = filter ? hasVisibleKids(el) : hasKids(el);
        const open = kids && (filter ? true : isOpen(el, depth));
        const r = { el, id, depth, hasKids: kids, open, pos: level.length + 1, size: 0 };
        level.push(r);
        out.push(r);
        if (open) walk(el, depth + 1);
      }
      for (const r of level) r.size = level.length;
    };
    walk(b, 0);
    return { out, truncated: cut };
  }

  function renderNow() {
    scheduleRender.cancel();
    if (!tree) return;
    if (pane.hidden) { dirty = true; return; }
    dirty = false;
    const keepScroll = pane.scrollTop;
    rowIndex = new Map();
    liveMap = null;
    if (!HE.doc.model) {
      rows = [];
      shown = new Map();
      tree.innerHTML = '';
      return;
    }
    filter = query ? computeFilter(query) : null;
    const res = collectRows();
    rows = res.out;
    truncated = res.truncated;
    rows.forEach((r, i) => rowIndex.set(r.id, i));
    updateCount();
    if (rows.length) paintWindow(true);
    else {
      shown = new Map();
      tree.innerHTML = emptyHTML();
      paintRowStates();
    }
    pane.scrollTop = keepScroll;
    paintWindow(false); // fewer rows than before may have clamped the scroll
  }

  /** Put the rows in and near the pane's view into the DOM. force: re-render even if they are already there. */
  function paintWindow(force) {
    if (!tree || pane.hidden || !rows.length) return;
    const pr = pane.getBoundingClientRect();
    const top = tree.getBoundingClientRect().top;
    const first = util.clamp(Math.floor((pr.top - top) / ROW_H), 0, rows.length);
    const last = util.clamp(Math.ceil((pr.bottom - top) / ROW_H), 0, rows.length);
    // Re-render while half the overscan is still left: the scroll may be painted before this handler runs.
    const lo = winStart === 0 ? 0 : winStart + OVERSCAN / 2;
    const hi = winEnd === rows.length ? winEnd : winEnd - OVERSCAN / 2;
    if (!force && first >= lo && last <= hi) return;
    winStart = Math.max(0, first - OVERSCAN);
    winEnd = Math.min(rows.length, last + OVERSCAN);
    // The primary row stays in the DOM wherever it is, so the tree keeps its active descendant.
    const pi = HE.sel.primary ? rowIndex.get(HE.sel.primary) : undefined;
    const pin = pi != null && (pi < winStart || pi >= winEnd) ? pi : -1;
    let html = '';
    let at = 0; // rows before this index are in html (as rows or spacers)
    const put = (i) => {
      if (i > at) html += '<div aria-hidden="true" style="height:' + (i - at) * ROW_H + 'px"></div>';
      if (i < rows.length) html += rowHTML(rows[i]);
      at = i + 1;
    };
    if (pin >= 0 && pin < winStart) put(pin);
    for (let i = winStart; i < winEnd; i++) put(i);
    if (pin >= winEnd) put(pin);
    put(rows.length);
    if (truncated) html += '<div class="lyr-more muted">' + t('還有更多元素沒有列出。收合部分圖層，或用搜尋縮小範圍。') + '</div>';
    // A row's eye button can hold focus (mousedown, menu refocus); replacing the rows would drop it to the page.
    if (document.activeElement !== tree && tree.contains(document.activeElement)) tree.focus({ preventScroll: true });
    tree.innerHTML = html;
    shown = new Map();
    tree.querySelectorAll('.lyr-row').forEach((row) => shown.set(row.dataset.id, row));
    paintRowStates();
  }

  /** Re-render one row in place (eye toggle) without rebuilding the tree. */
  function rerenderRow(id) {
    const i = rowIndex.get(id);
    if (i == null) return;
    // Undo/redo swaps the model document, so rows may still point at old elements.
    const el = HE.doc.byId(id);
    if (!el) { renderNow(); return; }
    rows[i].el = el;
    rows[i].snip = rows[i].icon = null;
    const row = shown.get(id);
    if (!row) return; // rendered fresh when it scrolls into view
    liveMap = null;
    const tmp = document.createElement('div');
    tmp.innerHTML = rowHTML(rows[i]);
    const fresh = tmp.firstElementChild;
    row.replaceWith(fresh);
    shown.set(id, fresh);
    paintSelection();
    paintHover();
  }

  function paintRowStates() {
    paintSelection();
    paintHover();
    paintDrag();
  }

  function paintSelection() {
    if (!tree) return;
    tree.querySelectorAll('.lyr-row.is-selected').forEach((r) => {
      r.classList.remove('is-selected', 'is-primary');
      r.setAttribute('aria-selected', 'false');
    });
    const primary = HE.sel.primary;
    for (const id of HE.sel.ids) {
      const row = shown.get(id);
      if (!row) continue;
      row.classList.add('is-selected');
      row.setAttribute('aria-selected', 'true');
      if (id === primary) row.classList.add('is-primary');
    }
    // Only a row in the DOM can be the active descendant; paintWindow keeps the primary row there.
    const p = primary ? shown.get(primary) : null;
    if (p) tree.setAttribute('aria-activedescendant', p.id);
    else tree.removeAttribute('aria-activedescendant');
  }

  function paintHover() {
    if (!tree) return;
    tree.querySelectorAll('.lyr-row.is-hover').forEach((r) => r.classList.remove('is-hover'));
    const row = canvasHoverId ? shown.get(canvasHoverId) : null;
    if (row) row.classList.add('is-hover');
  }

  function paintDrag() {
    if (!tree || !drag || !drag.active) return;
    for (const id of drag.ids) {
      const row = shown.get(id);
      if (row) row.classList.add('is-dragging');
    }
    paintDropIndicator();
  }

  /** Scroll row i into view (below the sticky search box) and into the DOM. */
  function scrollToRow(i) {
    if (i == null || !rows[i] || !pane || pane.hidden) return;
    const pr = pane.getBoundingClientRect();
    const rowTop = tree.getBoundingClientRect().top + i * ROW_H;
    const top = pr.top + (searchBox ? searchBox.offsetHeight : 0) + 4;
    if (rowTop < top) pane.scrollTop -= top - rowTop;
    else if (rowTop + ROW_H > pr.bottom - 4) pane.scrollTop += rowTop + ROW_H - pr.bottom + 4;
    paintWindow(false);
  }

  /* ------------------------------------------------------------------ */
  /* Expansion and reveal                                                */
  /* ------------------------------------------------------------------ */

  function setOpen(id, open) {
    if (filter) return;
    expandState.set(id, !!open);
    renderNow();
  }
  function toggle(id, deep) {
    const el = HE.doc.byId(id);
    if (!el || filter) return;
    const open = !isOpen(el, depthOf(el));
    if (!deep) { setOpen(id, open); return; }
    const visit = (n) => {
      if (!hasKids(n)) return;
      expandState.set(idOf(n), open);
      for (const c of kidsOf(n)) visit(c);
    };
    visit(el);
    renderNow();
  }

  /** Expand the ancestors of `id`, render if needed and scroll its row into view. */
  function revealRow(id, clearFilter) {
    if (!tree) return;
    const el = HE.doc.byId(id);
    const b = bodyEl();
    if (!el || !b || el === b || !b.contains(el)) return;
    const chain = [];
    for (let p = el.parentElement; p && p !== b; p = p.parentElement) chain.unshift(p);
    let changed = false;
    chain.forEach((p, depth) => {
      const pid = idOf(p);
      if (pid && !isOpen(p, depth)) { expandState.set(pid, true); changed = true; }
    });
    if (filter && !filter.visible.has(id)) {
      if (!clearFilter) return;
      setQuery('', false);
      changed = true;
    }
    if (pane.hidden) {
      if (changed) dirty = true;
      pendingReveal = id;
      return;
    }
    if (changed || !rowIndex.has(id)) renderNow();
    scrollToRow(rowIndex.get(id));
  }

  /* ------------------------------------------------------------------ */
  /* Hide in editor                                                      */
  /* ------------------------------------------------------------------ */

  // The canvas may also style [data-he-hidden]; this keeps hiding working on its own.
  function ensureHiddenStyle() {
    const d = HE.live.doc;
    if (!d || !d.head || d.head.querySelector('style[data-he-editor="layers"]')) return;
    const s = d.createElement('style');
    s.setAttribute('data-he-editor', 'layers');
    s.textContent = HIDDEN_CSS;
    d.head.append(s);
  }

  function applyHidden() {
    if (!hidden.size || !HE.live.doc) return;
    ensureHiddenStyle();
    for (const id of hidden) {
      const l = HE.live.byId(id);
      if (l && !l.hasAttribute(HIDDEN_ATTR)) l.setAttribute(HIDDEN_ATTR, '');
    }
  }

  function setHidden(id, on) {
    if (!id || !HE.doc.byId(id)) return;
    on = !!on;
    if (on === hidden.has(id)) return;
    if (on) hidden.add(id); else hidden.delete(id);
    if (archivedState.has(id)) archivedState.get(id).hidden = on;
    const l = HE.live.byId(id);
    if (l) {
      if (on) { ensureHiddenStyle(); l.setAttribute(HIDDEN_ATTR, ''); } else l.removeAttribute(HIDDEN_ATTR);
    }
    rerenderRow(id);
    ui.status(on ? t('已在編輯器中隱藏（匯出時仍會保留）') : t('已在編輯器中重新顯示'));
    HE.emit('layers:hidden', { id, hidden: on });
  }

  /* ------------------------------------------------------------------ */
  /* Pointer: hover, select, edit, context menu                          */
  /* ------------------------------------------------------------------ */

  function rowOf(target) {
    const row = target && target.closest ? target.closest('.lyr-row') : null;
    return row && tree.contains(row) ? row : null;
  }

  function setHover(id) {
    if (id === hoverId) return;
    hoverId = id;
    if (HE.canvas && typeof HE.canvas.highlight === 'function') HE.canvas.highlight(id);
  }

  function onClick(e) {
    if (e.target.closest('#layers-empty-insert')) { ui.showTab('left', 'insert'); return; }
    if (suppressClick) return;
    const row = rowOf(e.target);
    if (!row) return;
    const id = row.dataset.id;
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'toggle') { toggle(id, e.altKey); return; }
    if (act && act.dataset.act === 'eye') {
      setHidden(id, !hidden.has(id));
      tree.focus({ preventScroll: true });
      return;
    }
    if (e.shiftKey || e.metaKey || e.ctrlKey) HE.sel.toggle(id);
    else HE.sel.set([id]);
    if (HE.sel.has(id) && HE.canvas && typeof HE.canvas.scrollIntoView === 'function') HE.canvas.scrollIntoView(id);
  }

  function startEdit(id) {
    const el = HE.doc.byId(id);
    if (!el || !util.isTextEditable(el) || !HE.canvas || typeof HE.canvas.startTextEdit !== 'function') return false;
    HE.sel.set([id]);
    if (typeof HE.canvas.scrollIntoView === 'function') HE.canvas.scrollIntoView(id);
    HE.canvas.startTextEdit(id);
    return true;
  }

  function onDblClick(e) {
    if (e.target.closest('[data-act]')) return;
    const row = rowOf(e.target);
    if (!row) return;
    const id = row.dataset.id;
    if (startEdit(id)) return;
    const i = rowIndex.get(id);
    if (i != null && rows[i].hasKids) toggle(id, false);
  }

  function onContextMenu(e) {
    const row = rowOf(e.target);
    if (!row) return;
    e.preventDefault();
    const id = row.dataset.id;
    if (!HE.sel.has(id)) HE.sel.set([id]);
    if (HE.contextmenu && typeof HE.contextmenu.open === 'function') HE.contextmenu.open(e.clientX, e.clientY, id);
  }

  /* ------------------------------------------------------------------ */
  /* Drag and drop reorder (pointer events)                              */
  /* ------------------------------------------------------------------ */

  function movingIds(id) {
    const base = HE.sel.has(id) ? HE.sel.ids.slice() : [id];
    const els = base.map((x) => HE.doc.byId(x)).filter((m) => m && !HE.doc.isRoot(m));
    const top = els.filter((m) => !els.some((o) => o !== m && o.contains(m)));
    top.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return top.map(idOf);
  }

  function onPointerDown(e) {
    if (e.button !== 0 || drag || aiBusy()) return;
    const row = rowOf(e.target);
    if (!row || e.target.closest('[data-act]')) return;
    // Touch scrolls the list; on touch only the type icon works as a drag handle.
    if (e.pointerType === 'touch' && !e.target.closest('.lyr-type')) return;
    drag = {
      id: row.dataset.id, pointerId: e.pointerId,
      x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      active: false, ids: [], target: null, ghost: null, raf: 0,
      expandFor: null, expandTimer: 0, highlighted: undefined,
    };
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.active) {
      if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) <= DRAG_THRESHOLD) return;
      if (!startDrag()) return;
    }
    e.preventDefault();
    updateDrop();
  }

  function startDrag() {
    const el = HE.doc.byId(drag.id);
    const ids = el ? movingIds(drag.id) : [];
    if (!ids.length) { endDrag(); return false; }
    drag.active = true;
    drag.ids = ids;
    try { tree.setPointerCapture(drag.pointerId); } catch (err) { /* pointer already released */ }
    tree.classList.add('is-dragging');
    setHover(null);
    const ghost = ui.h('div', 'lyr-ghost');
    ghost.textContent = ids.length > 1 ? t('{name} 等 {n} 個', { name: util.label(el), n: ids.length }) : util.label(el);
    (document.getElementById('layer-root') || document.body).append(ghost);
    drag.ghost = ghost;
    paintDrag();
    drag.raf = requestAnimationFrame(autoScroll);
    window.addEventListener('keydown', onDragKey, true);
    return true;
  }

  function targetAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !tree.contains(hit) || !rows.length) return null;
    // The row under the pointer follows from its index, so it need not be rendered yet.
    const top = tree.getBoundingClientRect().top;
    let i = Math.floor((y - top) / ROW_H);
    let pos = null;
    if (i < 0) return null;
    if (i >= rows.length) {
      // Below the last row: drop after the last top-level element.
      i = -1;
      for (let j = rows.length - 1; j >= 0; j--) if (rows[j].depth === 0) { i = j; break; }
      if (i < 0) return null;
      pos = 'after';
    }
    const meta = rows[i];
    const id = meta.id;
    const el = HE.doc.byId(id);
    if (!el) return null;
    const movers = drag.ids.map((mid) => HE.doc.byId(mid));
    // Rejects placements the HTML parser would rewrite on the next parse (a row outside its table, a <p> in a <tr>).
    const fits = (p) => movers.every((m) => util.keepsChild(p === 'before' || p === 'after' ? el.parentElement : el, m));
    const inside = util.acceptsDrop(el) && fits('append');
    if (!pos) {
      const f = (y - top - i * ROW_H) / ROW_H;
      if (inside) pos = f < 0.3 ? 'before' : f > 0.7 ? 'after' : 'append';
      else pos = f < 0.5 ? 'before' : 'after';
      // The bottom edge of an open parent sits right above its first child.
      if (pos === 'after' && meta.open && inside) pos = 'prepend';
    }
    const valid = movers.every((m) => m && m !== el && !m.contains(el)) && fits(pos);
    return { id, i, pos, valid, depth: meta.depth, canOpen: meta.hasKids && !meta.open && inside };
  }

  /** Last visible row of the subtree that starts at row index i. */
  function subtreeEnd(i) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1].depth > rows[i].depth) j++;
    return j;
  }

  function paintDropIndicator() {
    tree.querySelectorAll('.lyr-row.is-drop-inside').forEach((r) => r.classList.remove('is-drop-inside'));
    const t = drag && drag.active ? drag.target : null;
    tree.classList.toggle('is-nodrop', !!(t && !t.valid));
    // A render since the target was found (a collapsed parent opening) may have moved its row.
    if (!t || !t.valid || !rows[t.i] || rows[t.i].id !== t.id) { dropLine.hidden = true; return; }
    if (t.pos === 'append') {
      const row = shown.get(t.id);
      if (row) row.classList.add('is-drop-inside');
      dropLine.hidden = true;
      return;
    }
    const depth = t.pos === 'prepend' ? t.depth + 1 : t.depth;
    // "after" lands below the whole visible subtree, so draw the line there.
    const at = t.pos === 'before' ? t.i : t.pos === 'after' ? subtreeEnd(t.i) + 1 : t.i + 1;
    dropLine.style.top = (tree.offsetTop + at * ROW_H - 1) + 'px';
    dropLine.style.left = (indentPx(depth) + 28) + 'px';
    dropLine.hidden = false;
  }

  function updateDrop() {
    if (!drag || !drag.active) return;
    if (drag.ghost) {
      drag.ghost.style.left = (drag.x + 14) + 'px';
      drag.ghost.style.top = (drag.y + 12) + 'px';
    }
    const t = targetAt(drag.x, drag.y);
    drag.target = t;
    paintDropIndicator();
    const hl = t && t.valid ? t.id : null;
    if (hl !== drag.highlighted) {
      drag.highlighted = hl;
      if (HE.canvas && typeof HE.canvas.highlight === 'function') HE.canvas.highlight(hl);
    }
    // Hovering the middle of a collapsed container opens it after a moment.
    const want = t && t.valid && t.pos === 'append' && t.canOpen ? t.id : null;
    if (want !== drag.expandFor) {
      clearTimeout(drag.expandTimer);
      drag.expandFor = want;
      if (want) {
        drag.expandTimer = setTimeout(() => {
          if (!drag || drag.expandFor !== want) return;
          expandState.set(want, true);
          renderNow();
          updateDrop();
        }, 650);
      }
    }
  }

  function autoScroll() {
    if (!drag || !drag.active) return;
    const pr = pane.getBoundingClientRect();
    const top = Math.max(pr.top, searchBox.getBoundingClientRect().bottom);
    const edge = 28;
    let dy = 0;
    if (drag.y < top + edge) dy = -Math.ceil((top + edge - drag.y) / 3);
    else if (drag.y > pr.bottom - edge) dy = Math.ceil((drag.y - (pr.bottom - edge)) / 3);
    if (dy) {
      const before = pane.scrollTop;
      pane.scrollTop += util.clamp(dy, -18, 18);
      if (pane.scrollTop !== before) updateDrop();
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function onDragKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    endDrag();
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    endDrag();
    if (!d.active) return;
    e.preventDefault();
    // The click that follows this pointerup must not reselect the source row.
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    if (d.target && d.target.valid) performMove(d.ids, d.target.id, d.target.pos);
  }

  function endDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('pointercancel', endDrag, true);
    window.removeEventListener('keydown', onDragKey, true);
    if (!d.active) return;
    cancelAnimationFrame(d.raf);
    clearTimeout(d.expandTimer);
    try { if (tree.hasPointerCapture(d.pointerId)) tree.releasePointerCapture(d.pointerId); } catch (err) { /* released */ }
    if (d.ghost) d.ghost.remove();
    tree.classList.remove('is-dragging', 'is-nodrop');
    tree.querySelectorAll('.lyr-row.is-dragging, .lyr-row.is-drop-inside').forEach((r) => r.classList.remove('is-dragging', 'is-drop-inside'));
    dropLine.hidden = true;
    if (d.highlighted && HE.canvas && typeof HE.canvas.highlight === 'function') HE.canvas.highlight(null);
  }

  function performMove(ids, refId, pos) {
    // Inside the AI's open transaction the move would be undone together with the AI's changes.
    if (aiBusy()) { ui.status(t('AI 正在修改頁面，請等它完成再編輯。')); return; }
    if (pos === 'append' || pos === 'prepend') expandState.set(refId, true);
    let moved = false;
    // Moving one by one keeps document order: forwards for before/append, backwards for after/prepend.
    const order = pos === 'after' || pos === 'prepend' ? ids.slice().reverse() : ids;
    HE.history.transact(t('移動'), () => {
      for (const id of order) if (HE.ops.move(id, refId, pos, { label: t('移動') })) moved = true;
    });
    renderNow();
    if (!moved) return;
    HE.sel.set(ids);
    if (HE.canvas && typeof HE.canvas.flash === 'function') HE.canvas.flash(ids);
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard                                                            */
  /* ------------------------------------------------------------------ */

  function go(i, extend) {
    if (i < 0 || i >= rows.length) return;
    const id = rows[i].id;
    if (extend) HE.sel.add(id); else HE.sel.set([id]);
    scrollToRow(rowIndex.get(id));
    // Stepping through rows never leaves a scripted preview (the canvas says why nothing shows).
    if (HE.canvas && typeof HE.canvas.scrollIntoView === 'function') HE.canvas.scrollIntoView(id, { stay: true });
  }

  function parentIndex(i) {
    const d = rows[i].depth;
    for (let j = i - 1; j >= 0; j--) if (rows[j].depth < d) return j;
    return -1;
  }

  function onTreeKey(e) {
    // Modified keys (alt+↑ nudge, mod+D …) and Delete/Escape fall through to the global shortcuts.
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing || !NAV_KEYS.has(e.key) || drag) return;
    if (!rows.length) return;
    e.preventDefault();
    e.stopPropagation();
    const primary = HE.sel.primary;
    const cur = primary && rowIndex.has(primary) ? rowIndex.get(primary) : -1;
    const r = cur >= 0 ? rows[cur] : null;
    switch (e.key) {
      case 'ArrowDown': go(cur < 0 ? 0 : cur + 1, e.shiftKey); break;
      case 'ArrowUp': go(cur < 0 ? rows.length - 1 : cur - 1, e.shiftKey); break;
      case 'Home': go(0, false); break;
      case 'End': go(rows.length - 1, false); break;
      case 'ArrowLeft':
        if (!r) go(0, false);
        else if (r.open && !filter) setOpen(r.id, false);
        else go(parentIndex(cur), false);
        break;
      case 'ArrowRight':
        if (!r) go(0, false);
        else if (r.hasKids && !r.open) setOpen(r.id, true);
        else if (r.open && rows[cur + 1] && rows[cur + 1].depth > r.depth) go(cur + 1, false);
        break;
      case 'Enter':
        if (r && !startEdit(r.id) && r.hasKids) setOpen(r.id, !r.open);
        break;
      default: break;
    }
  }

  function onSearchKey(e) {
    // 229: the key that ends an IME composition (Safari reports isComposing=false for it).
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape' && searchInput.value) {
      e.preventDefault();
      e.stopPropagation();
      onSearchInput.cancel();
      setQuery('');
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      onSearchInput.cancel();
      setQuery(searchInput.value);
      if (!rows.length) return;
      let i = filter ? rows.findIndex((r) => filter.matches.has(r.id)) : 0;
      if (i < 0) i = 0;
      tree.focus({ preventScroll: true });
      go(i, false);
    }
  }

  const onSearchInput = util.debounce(() => setQuery(searchInput.value), 120);

  /* ------------------------------------------------------------------ */
  /* Init and events                                                     */
  /* ------------------------------------------------------------------ */

  function buildDOM() {
    const root = ui.h('div', 'lyr');
    searchBox = ui.h('div', 'lyr-search');
    searchBox.innerHTML =
      '<div class="lyr-search-box">' +
        '<span class="lyr-search-icon" aria-hidden="true">' + ui.icon('search', 14) + '</span>' +
        '<input id="layers-search" class="input" type="text" placeholder="' + util.esc(t('搜尋標籤、id 或文字')) + '" aria-label="' + util.esc(t('搜尋圖層')) + '"' +
          ' title="' + util.esc(t('依標籤、id、class 或文字篩選。以 # 開頭只找 id，以 . 開頭只找 class。')) + '" autocomplete="off" spellcheck="false">' +
        '<button id="layers-search-clear" class="btn icon sm ghost lyr-search-clear" type="button" aria-label="' + util.esc(t('清除搜尋')) + '" title="' + util.esc(t('清除搜尋')) + '" hidden>' + ui.icon('x', 14) + '</button>' +
      '</div>' +
      '<div id="layers-count" class="lyr-count muted" aria-live="polite" hidden></div>';
    searchInput = searchBox.querySelector('#layers-search');
    clearBtn = searchBox.querySelector('#layers-search-clear');
    countEl = searchBox.querySelector('#layers-count');

    const body = ui.h('div', 'lyr-body');
    tree = ui.h('div', 'lyr-tree');
    tree.id = 'layers-tree';
    tree.tabIndex = 0;
    tree.setAttribute('role', 'tree');
    tree.setAttribute('aria-label', t('頁面結構'));
    tree.setAttribute('aria-multiselectable', 'true');
    dropLine = ui.h('div', 'lyr-drop-line');
    dropLine.hidden = true;
    body.append(tree, dropLine);
    root.append(searchBox, body);
    pane.replaceChildren(root);
  }

  function wire() {
    searchInput.addEventListener('input', (e) => {
      clearBtn.hidden = !searchInput.value;
      if (!e.isComposing) onSearchInput();
    });
    searchInput.addEventListener('compositionend', () => onSearchInput());
    searchInput.addEventListener('keydown', onSearchKey);
    clearBtn.addEventListener('click', () => {
      onSearchInput.cancel();
      setQuery('');
      searchInput.focus();
    });

    tree.addEventListener('click', onClick);
    tree.addEventListener('dblclick', onDblClick);
    tree.addEventListener('contextmenu', onContextMenu);
    tree.addEventListener('keydown', onTreeKey);
    tree.addEventListener('pointerdown', onPointerDown);
    tree.addEventListener('pointerover', (e) => {
      if (drag && drag.active) return;
      const row = rowOf(e.target);
      setHover(row ? row.dataset.id : null);
    });
    tree.addEventListener('pointerleave', () => { if (!drag || !drag.active) setHover(null); });
    pane.addEventListener('scroll', () => paintWindow(false), { passive: true });
    if (window.ResizeObserver) new ResizeObserver(() => paintWindow(false)).observe(pane);

    HE.on('doc:loaded', () => {
      endDrag();
      expandState.clear();
      hidden.clear();
      archivedState.clear();
      stateModel = HE.doc.model;
      pendingReveal = null;
      canvasHoverId = null;
      setQuery('', false);
      scheduleRender();
    });
    HE.on('doc:replaced', (event) => {
      replaceLayerState(stateModel, HE.doc.model, event && event.history);
      stateModel = HE.doc.model;
      liveMap = null;
    });
    HE.on('doc:changed', (event) => {
      // Ordinary undo/redo can restore an element deleted before a document replacement.
      if (event && event.history && stateModel !== HE.doc.model && archivedState.size && HE.doc.body) {
        for (const el of HE.doc.body.querySelectorAll('[' + ID + ']')) {
          const id = idOf(el), state = archivedState.get(id);
          if (!state) continue;
          if (!expandState.has(id) && state.expanded !== null) expandState.set(id, state.expanded);
          if (state.hidden) hidden.add(id);
        }
      }
      stateModel = HE.doc.model; liveMap = null; applyHidden(); scheduleRender();
    });
    HE.on('ai:busy', (data) => { if (data && data.busy) endDrag(); });
    HE.on('canvas:ready', () => { liveMap = null; applyHidden(); scheduleRender(); });
    HE.on('selection:changed', () => {
      const p = HE.sel.primary;
      if (p) revealRow(p, false);
      paintSelection();
    });
    HE.on('hover:changed', (data) => {
      canvasHoverId = data && data.id ? data.id : null;
      paintHover();
    });
    HE.on('tab:changed', ({ group, name }) => {
      if (group !== 'left' || name !== 'layers') return;
      if (dirty) renderNow();
      if (pendingReveal) {
        const id = pendingReveal;
        pendingReveal = null;
        revealRow(id, false);
      }
    });
  }

  function init() {
    pane = document.getElementById('layers-pane');
    if (!pane) return;
    buildDOM();
    wire();
    renderNow();
  }

  HE.layers = {
    init,
    /** Rebuild the tree now. */
    refresh() { renderNow(); },
    /** Expand the ancestors of `id` and scroll its row into view (clears a search that hides it). opts.showTab switches to the 圖層 tab first. */
    reveal(id, opts = {}) {
      if (opts.showTab && ui.currentTab('left') !== 'layers') ui.showTab('left', 'layers');
      revealRow(id, true);
    },
    isHidden(id) { return hidden.has(id); },
    /** The ids hidden in the editor (a copy). The canvas carries them into its run frame. */
    hiddenIds() { return Array.from(hidden); },
    /** The rule that hides them (on [data-he-hidden]); the run frame uses it too, so both frames look the same. */
    hiddenCSS: HIDDEN_CSS,
    /** Hide or show an element in the editor only (never exported). */
    setHidden(id, on) { setHidden(id, on); },
    toggleHidden(id) { setHidden(id, !hidden.has(id)); },
  };
})();
