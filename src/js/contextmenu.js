/* Tactile — contextmenu.js
 *
 * Right-click menu for canvas/layer elements, the element clipboard
 * (internal buffer + native copy/cut/paste events), and structural helpers
 * for tables (row/column ops on a real grid map) and lists.
 *
 *   HE.contextmenu = {init, open(x, y, id)}
 *   HE.clipboard   = {copy(ids), cut(ids), paste({refId, position}), has()}
 *   HE.tables      = {cellInfo, insertRow, deleteRow, insertCol, deleteCol, deleteTable}
 *   HE.lists       = {addItem, toggleType}
 */
(function () {
  'use strict';

  const HE = window.HE;
  const t = HE.t;
  const util = HE.util;
  const tag = (el) => util.tag(el);
  const idOf = (el) => (el && el.getAttribute ? el.getAttribute(HE.ID_ATTR) : null);

  const BUSY_MSG = t('AI 正在修改頁面，請等它完成再編輯。');
  // Only act as a summary/caption while they are direct children of their parent.
  const NO_WRAP = new Set(['summary', 'legend', 'figcaption']);
  // Elements that must not receive pasted flow content inside them.
  const NOT_CONTAINER = new Set(['html', 'head', 'script', 'style', 'title', 'meta', 'link', 'base', 'template', 'noscript',
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'table', 'caption', 'colgroup', 'col', 'dl', 'dt', 'select', 'option',
    'optgroup', 'datalist', 'textarea', 'button', 'label', 'legend', 'summary', 'iframe', 'canvas', 'video', 'audio',
    'picture', 'object', 'embed', 'svg', 'math', 'progress', 'meter', 'output']);
  // Unwrapping these would break the page structure or orphan id-less descendants.
  const NO_UNWRAP = new Set(['table', 'svg', 'math', 'select', 'picture', 'video', 'audio', 'object', 'iframe', 'textarea',
    'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col']);
  // Poor selection targets when picking a neighbour after a delete.
  const SKIP_NEIGHBOUR = new Set(['script', 'style', 'link', 'meta', 'template', 'noscript', 'title', 'base']);
  // Dropped from HTML pasted from other apps.
  const DROP_TAGS = new Set(['script', 'style', 'meta', 'link', 'title', 'base', 'noscript', 'template', 'xml']);
  const BIG_IMAGE = 1.5 * 1048576;

  /* ------------------------------------------------------------------ */
  /* Shared helpers                                                      */
  /* ------------------------------------------------------------------ */

  function isBusy() { return !!(HE.ai && HE.ai.busy); }
  function hasCanvas(name) { return !!(HE.canvas && typeof HE.canvas[name] === 'function'); }
  function callCanvas(name, ...args) {
    if (!hasCanvas(name)) return undefined;
    try { return HE.canvas[name](...args); } catch (err) { console.error('[HE] canvas.' + name + ' failed:', err); return undefined; }
  }
  function inBody(el) {
    const body = HE.doc.body;
    return !!(body && el && (el === body || body.contains(el)));
  }

  /** Run fn once every id has a live node (now, or after the next canvas render). */
  function whenLive(ids, fn) {
    const ready = () => ids.every((id) => HE.live.byId(id));
    if (ready()) { fn(); return; }
    let off = null;
    const timer = setTimeout(() => { if (off) off(); }, 4000);
    off = HE.on('canvas:ready', () => { off(); clearTimeout(timer); if (ready()) fn(); });
  }
  function flash(ids) {
    const list = (ids || []).filter(Boolean);
    if (list.length && hasCanvas('flash')) whenLive(list, () => callCanvas('flash', list));
  }
  function reveal(id) {
    if (id && hasCanvas('scrollIntoView')) whenLive([id], () => callCanvas('scrollIntoView', id));
  }

  /** Model elements for ids: no roots, de-duplicated, document order, ancestors only (a selected child of a selected parent is dropped). */
  function topLevel(ids) {
    const els = Array.from(new Set((ids || []).map((id) => HE.doc.byId(id)).filter((el) => el && !HE.doc.isRoot(el))));
    els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return els.filter((el) => !els.some((o) => o !== el && o.contains(el)));
  }

  /** The element to select once `els` are gone: next sibling, else previous sibling, else the parent (unless a root). */
  function neighbourId(els) {
    const gone = new Set(els);
    const ok = (s) => s && !gone.has(s) && !SKIP_NEIGHBOUR.has(tag(s));
    let s = els[els.length - 1].nextElementSibling;
    while (s && !ok(s)) s = s.nextElementSibling;
    if (!s) {
      s = els[0].previousElementSibling;
      while (s && !ok(s)) s = s.previousElementSibling;
    }
    if (!s) {
      s = els[0].parentElement;
      if (s && HE.doc.isRoot(s)) s = null;
    }
    return s ? idOf(s) : null;
  }

  /** Remove elements as one undo step and select a sensible neighbour. Returns how many were removed. */
  function removeElements(ids, label) {
    const els = topLevel(ids);
    if (!els.length) return 0;
    const next = neighbourId(els);
    let n = 0;
    HE.history.transact(label, () => {
      n = HE.ops.remove(els.map(idOf), { label });
      HE.sel.set(next && HE.doc.byId(next) ? [next] : []);
    });
    return n;
  }

  function duplicateElements(ids) {
    const els = topLevel(ids);
    if (!els.length) return [];
    let out = [];
    HE.history.transact(t('建立副本'), () => {
      // HE.ops.duplicate also renames HTML ids the copy would repeat.
      out = HE.ops.duplicate(els.map(idOf), { label: t('建立副本') }) || [];
    });
    if (out.length) { HE.sel.set(out); flash(out); }
    return out;
  }

  /** Can any of the elements move out of their parent (dir -1) or into the sibling above (dir +1)? */
  function canChangeLevel(ids, dir) {
    const skip = new Set(ids);
    return topLevel(ids).some((el) => HE.ops.levelTarget(el, dir, skip));
  }
  /** Move the elements out of / into a level, then show where they went. Returns the moved ids. */
  function changeLevel(ids, dir) {
    const moved = HE.ops.changeLevel(topLevel(ids).map(idOf), dir);
    if (!moved.length) return moved;
    const p = HE.sel.primary;
    const focus = moved.includes(p) ? p : moved[0];
    if (HE.layers) {
      // The new parent may be collapsed in the layers tree; open it so the moved rows stay in view.
      HE.layers.refresh();
      moved.filter((id) => id !== focus).concat(focus).forEach((id) => HE.layers.reveal(id));
    }
    flash(moved);
    reveal(focus);
    return moved;
  }
  function levelKey(dir) {
    if (HE.mode !== 'edit' || !HE.doc.model || !HE.sel.ids.length) return false;
    if (isBusy()) { HE.ui.status(BUSY_MSG); return true; }
    if (!changeLevel(HE.sel.ids.slice(), dir).length) HE.ui.status(dir < 0 ? t('這裡不能再移出父層') : t('上方沒有可以移入的元素'));
    return true;
  }

  /**
   * util.canPlace() checks only the direct parent, but a block anywhere inside a <p> (after an
   * image in a link, say) still closes the <p> on the next parse.
   */
  function canPlace(ref, pos, child) {
    if (!util.canPlace(ref, pos, child)) return false;
    const para = (pos === 'before' || pos === 'after' ? ref.parentElement : ref).closest('p');
    return !para || util.canContain(para, child);
  }

  /**
   * The selected siblings of the first selected element, and a wrapper the parser keeps around
   * them there: a div, or a span inside phrasing content (a div would split a <p>). Null: cannot wrap.
   */
  function wrapPlan(ids) {
    const all = topLevel(ids).filter((el) => inBody(el));
    if (!all.length) return null;
    const parent = all[0].parentElement;
    const els = all.filter((el) => el.parentElement === parent);
    if (!parent || els.some((el) => NO_WRAP.has(tag(el)))) return null;
    const fits = (w) => canPlace(parent, 'append', w) && els.every((el) => util.canContain(w, el));
    // Inline content in an inline parent gets a span: that parent may itself sit in a <p>.
    const phrasing = util.isInline(parent) && els.every((el) => util.isInline(el));
    const wrapper = !phrasing && fits('div') ? 'div' : fits('span') ? 'span' : null;
    return wrapper ? { els, wrapper, total: all.length } : null;
  }

  function wrapElements(ids) {
    const plan = wrapPlan(ids);
    if (!plan) return null;
    const wid = HE.ops.wrap(plan.els.map(idOf), plan.wrapper, {}, { label: t('包進容器') });
    if (!wid) return null;
    HE.sel.set([wid]);
    flash([wid]);
    if (plan.els.length < plan.total) HE.ui.toast(t('只有和第一個元素同一層的元素會被包進容器'));
    return wid;
  }

  /** Unwrapping must leave every child somewhere the parser keeps it (no <li> outside a list). */
  function canUnwrap(el) {
    const parent = el.parentElement;
    if (!parent || NO_UNWRAP.has(tag(el))) return false;
    const text = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (text && !util.canContain(parent, 'span')) return false;
    return Array.from(el.children).every((k) => util.canContain(parent, k));
  }

  /** Replace an element with its children; if it was selected, select what it contained. */
  function unwrapElement(id, label) {
    const el = HE.doc.byId(id);
    if (!el || HE.doc.isRoot(el)) return false;
    const kids = Array.from(el.children).map(idOf).filter(Boolean);
    const parent = el.parentElement;
    const parentId = parent && !HE.doc.isRoot(parent) ? idOf(parent) : null;
    const wasSelected = HE.sel.has(id);
    let ok = false;
    HE.history.transact(label, () => {
      ok = HE.ops.unwrap(id, { label });
      if (ok && wasSelected) HE.sel.set(kids.length ? kids : parentId ? [parentId] : []);
    });
    if (ok && kids.length) flash(kids);
    return ok;
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Clipboard                                                           */
  /* ------------------------------------------------------------------ */

  // {html, count, key: whitespace-normalised html, preferOnPaste}
  // preferOnPaste: the system clipboard may not hold our copy (write was refused), so a
  // paste event should use the buffer instead of whatever stale content the system has.
  let buffer = null;

  function normText(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function fillBuffer(els) {
    const html = els.map((el) => HE.doc.html(idOf(el))).join('\n');
    buffer = { html, count: els.length, key: normText(html), preferOnPaste: false };
    return buffer;
  }

  /** Best-effort write of a menu copy to the system clipboard (must run inside the click). */
  function writeSystemClipboard(b) {
    b.preferOnPaste = true;
    const cb = navigator.clipboard;
    if (!cb) return;
    let p = null;
    try {
      if (typeof cb.write === 'function' && typeof window.ClipboardItem === 'function') {
        const item = new window.ClipboardItem({
          'text/html': new Blob([b.html], { type: 'text/html' }),
          'text/plain': new Blob([b.html], { type: 'text/plain' }),
        });
        p = cb.write([item]).catch(() => cb.writeText(b.html));
      } else if (typeof cb.writeText === 'function') {
        p = cb.writeText(b.html);
      }
    } catch (err) { p = null; }
    if (p && typeof p.then === 'function') p.then(() => { b.preferOnPaste = false; }, () => { /* keep using the buffer */ });
  }

  function defaultTarget() {
    const id = HE.sel.primary;
    return id && HE.doc.byId(id) ? { refId: id, position: 'after' } : { refId: null, position: 'append' };
  }

  /**
   * Adjust an insertion point so pasted content lands somewhere valid:
   * nothing goes into <head>, table internals receive only matching parts
   * (a paragraph pasted "after" a cell goes inside the cell), lists take items inside.
   */
  function fitTarget(target, tops) {
    const ref = target.refId ? HE.doc.byId(target.refId) : null;
    if (!ref || !inBody(ref)) return { refId: null, position: 'append' };
    const pos = target.position;
    if (pos !== 'before' && pos !== 'after') return target;
    const t = tag(ref);
    const all = (...names) => tops.length > 0 && tops.every((x) => names.includes(x));
    const tableId = () => idOf(ref.closest('table'));
    const inside = pos === 'after' ? 'append' : 'prepend';
    if (t === 'td' || t === 'th') {
      if (all('td', 'th')) return target;
      if (all('tr')) return { refId: idOf(ref.parentElement), position: pos };
      return { refId: target.refId, position: 'append' };
    }
    if (t === 'tr') {
      if (all('tr')) return target;
      return all('td', 'th') ? { refId: target.refId, position: inside } : { refId: tableId(), position: pos };
    }
    if (t === 'thead' || t === 'tbody' || t === 'tfoot') {
      if (all('thead', 'tbody', 'tfoot')) return target;
      return all('tr') ? { refId: target.refId, position: inside } : { refId: tableId(), position: pos };
    }
    if (t === 'caption' || t === 'colgroup' || t === 'col') return { refId: tableId(), position: pos };
    if ((t === 'ul' || t === 'ol') && all('li')) return { refId: target.refId, position: inside };
    return target;
  }

  /**
   * The target itself when the HTML parser keeps `frag` there on the next parse (undo, export),
   * else next to the nearest ancestor that can hold it: a section pasted on an image inside a
   * paragraph lands after the paragraph. Null when nothing up to <body> fits.
   */
  function parserSafe(target, frag) {
    const body = HE.doc.body;
    const ref = (target.refId && HE.doc.byId(target.refId)) || body;
    let pos = target.position;
    if (ref === body && (pos === 'before' || pos === 'after')) pos = pos === 'before' ? 'prepend' : 'append';
    if (canPlace(ref, pos, frag)) return { refId: target.refId, position: pos };
    const sibling = pos === 'before' || pos === 'after';
    const out = pos === 'before' || pos === 'prepend' ? 'before' : 'after';
    for (let cur = sibling ? ref.parentElement : ref; cur && !HE.doc.isRoot(cur); cur = cur.parentElement) {
      if (canPlace(cur, out, frag)) return { refId: idOf(cur), position: out };
    }
    return null;
  }

  function misfitMessage(tops) {
    const has = (...names) => tops.some((x) => names.includes(x));
    if (has('tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'col')) {
      return t('表格的列和儲存格只能貼進表格。請先選取表格裡的列或儲存格，再貼上。');
    }
    if (has('li')) return t('清單項目只能貼進清單。請先選取清單或其中的項目，再貼上。');
    if (has('dt', 'dd')) return t('定義清單的項目只能貼進定義清單（dl）。');
    if (has('option', 'optgroup')) return t('選項只能貼進下拉選單。');
    return t('這些元素不能放在這裡：瀏覽器重新讀取頁面時會改變它們的結構。請選取其他位置再貼上。');
  }

  /** Insert html at target as one undo step; select, flash and reveal the result. */
  function insertAt(target, html, label) {
    if (!HE.doc.model || !html) return [];
    const t = document.createElement('template');
    t.innerHTML = html;
    const tops = Array.from(t.content.children).map(tag);
    const where = parserSafe(fitTarget(target, tops), t.content);
    if (!where) { HE.ui.toast(misfitMessage(tops)); return []; }
    if (HE.util.renameClashingIds([t.content], (el, attrs) => { for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); })) {
      html = t.innerHTML;
    }
    const ids = HE.ops.insertHTML(where.refId, where.position, html, { label }) || [];
    if (ids.length) {
      HE.sel.set(ids);
      flash(ids);
      reveal(ids[0]);
      HE.ui.status(HE.t('已貼上 {n} 個元素', { n: ids.length }));
    }
    return ids;
  }

  /* ---------- cleaning HTML that comes from other apps ---------- */

  /** Split a style attribute on ';' outside quotes and parentheses (data: URLs contain ';'). */
  function splitDeclarations(css) {
    const out = [];
    let depth = 0;
    let quote = '';
    let cur = '';
    for (const ch of css) {
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map((d) => d.trim()).filter(Boolean);
  }

  function cleanAttributes(el) {
    for (const at of Array.from(el.attributes)) {
      const n = at.name.toLowerCase();
      // javascript:/vbscript: URLs and data: documents in a frame, link or form (the rule hasScript uses).
      const scriptUrl = HE.util.isScriptUrl(el, n, at.value);
      // Namespaced attributes are Office junk (xmlns:o, v:shapes…), except SVG references.
      const junkNs = n.includes(':') && n !== 'xlink:href';
      if (n.startsWith('on') || n === HE.ID_ATTR || junkNs || scriptUrl) el.removeAttribute(at.name);
    }
    const cls = el.getAttribute('class');
    if (cls != null) {
      const kept = cls.split(/\s+/).filter((c) => c && !/^mso/i.test(c));
      if (kept.length) el.setAttribute('class', kept.join(' ')); else el.removeAttribute('class');
    }
    const style = el.getAttribute('style');
    if (style != null && /mso-|tab-stops/i.test(style)) {
      const kept = splitDeclarations(style).filter((d) => !/^(mso-|tab-stops\s*:)/i.test(d));
      if (kept.length) el.setAttribute('style', kept.join('; ')); else el.removeAttribute('style');
    }
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  }

  /** Clean clipboard HTML from browsers, Word, Google Docs: wrappers, fragment markers, scripts, styles, mso junk. */
  function sanitizeHTML(raw) {
    const s = String(raw || '');
    const d = new DOMParser().parseFromString(/<(html|body)[\s>]/i.test(s) ? s : '<!doctype html><body>' + s, 'text/html');
    const body = d.body;
    if (!body) return '';
    const comments = [];
    const walker = d.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    for (const el of Array.from(body.querySelectorAll('*'))) {
      if (!body.contains(el)) continue; // went away with a dropped ancestor
      const t = el.tagName.toLowerCase();
      if (DROP_TAGS.has(t)) { el.remove(); continue; }
      // Office namespaced tags (o:p, v:shape, w:sdt…) and the Google Docs <b id="docs-internal-guid-…"> wrapper.
      if (t.includes(':') || (t === 'b' && /^docs-internal-guid/.test(el.getAttribute('id') || ''))) {
        el.replaceWith(...el.childNodes);
        continue;
      }
      cleanAttributes(el);
      if (t === 'span' && !el.attributes.length) el.replaceWith(...el.childNodes);
    }
    return body.innerHTML.trim();
  }

  function htmlHasText(html) {
    if (!html) return false;
    const d = new DOMParser().parseFromString(html, 'text/html');
    return !!(d.body && d.body.textContent.trim());
  }

  /** Inline-only content becomes a paragraph so it does not float between blocks. */
  function blockify(html) {
    if (!html) return '';
    const f = util.fragment(html, document);
    const kids = Array.from(f.children);
    if (!kids.length && !f.textContent.trim()) return '';
    if (kids.some((c) => !util.isInline(c))) return html;
    return '<p>' + html + '</p>';
  }

  /** Plain text that is HTML source: a full document keeps its body (plus head styles); a fragment is kept as is. */
  function htmlFromSource(src) {
    let html = src;
    if (/^<!doctype|^<html[\s>]/i.test(src)) {
      const d = new DOMParser().parseFromString(src, 'text/html');
      // Not the effect styles HE.fx manages: they belong in the head, and sync regenerates them from the tfx-* classes.
      const styles = Array.from(d.head.querySelectorAll('style:not([data-he-style="fx"]):not([data-he-style="fx-motion"])')).map((st) => st.outerHTML);
      html = styles.concat([d.body.innerHTML.trim()]).join('\n');
    }
    const t = document.createElement('template');
    t.innerHTML = html;
    if (!t.content.children.length) return '';
    t.content.querySelectorAll('[' + HE.ID_ATTR + ']').forEach((el) => el.removeAttribute(HE.ID_ATTR));
    return t.innerHTML.trim();
  }

  function textToHTML(text) {
    const src = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!src) return '';
    if (src.startsWith('<')) {
      const asHTML = htmlFromSource(src);
      if (asHTML) return blockify(asHTML);
    }
    return src.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => '<p>' + util.esc(p).replace(/\n/g, '<br>') + '</p>').join('\n');
  }

  function imageFiles(cd) {
    const out = [];
    try {
      for (const it of Array.from(cd.items || [])) {
        if (it.kind === 'file' && /^image\//i.test(it.type)) { const f = it.getAsFile(); if (f) out.push(f); }
      }
      if (!out.length) for (const f of Array.from(cd.files || [])) if (/^image\//i.test(f.type)) out.push(f);
    } catch (err) { /* clipboard items unavailable */ }
    return out;
  }

  function pasteImages(files, target) {
    Promise.all(files.map(readAsDataURL)).then((urls) => {
      const html = urls.filter(Boolean)
        .map((u) => '<img src="' + util.esc(u) + '" alt="" style="max-width:100%;height:auto">').join('\n');
      if (!html) return;
      // The target may have been removed while the files were read.
      const where = target.refId && HE.doc.byId(target.refId) ? target : { refId: null, position: 'append' };
      insertAt(where, html, t('貼上圖片'));
      const total = files.reduce((n, f) => n + (f.size || 0), 0);
      if (total > BIG_IMAGE) HE.ui.toast(t('圖片已直接嵌入檔案（{size}），匯出的檔案會變大。', { size: util.bytes(total) }));
    }).catch(() => HE.ui.toast(t('無法讀取剪貼簿裡的圖片'), { type: 'error' }));
  }

  /* ---------- native copy / cut / paste events ---------- */

  function hasNativeSelection(target) {
    const d = (target && target.ownerDocument) || document;
    const a = d.activeElement;
    if (a && (tag(a) === 'input' || tag(a) === 'textarea')) {
      try { if (a.selectionStart !== a.selectionEnd) return true; } catch (err) { /* input type without a selection API */ }
    }
    // In the canvas the element selection wins; in the editor UI a real text selection means "copy this text".
    if (d !== document) return false;
    const s = document.getSelection ? document.getSelection() : null;
    return !!(s && !s.isCollapsed && s.toString().trim());
  }

  function shouldHandle(e, copyLike) {
    if (e.defaultPrevented || !HE.doc.model || HE.mode !== 'edit') return false;
    if (util.isTypingTarget(e.target)) return false;
    if (hasCanvas('isEditingText') && HE.canvas.isEditingText()) return false;
    if (document.querySelector('.modal-backdrop')) return false;
    if (copyLike && hasNativeSelection(e.target)) return false;
    return true;
  }

  function onCopyCut(e) {
    if (!shouldHandle(e, true)) {
      // The browser copies text natively, so the system clipboard is fresher than the buffer.
      if (buffer) buffer.preferOnPaste = false;
      return;
    }
    const els = topLevel(HE.sel.ids);
    if (!els.length) return;
    const cut = e.type === 'cut';
    if (cut && isBusy()) { e.preventDefault(); HE.ui.status(BUSY_MSG); return; }
    const b = fillBuffer(els);
    let wrote = false;
    if (e.clipboardData) {
      try {
        e.clipboardData.setData('text/html', b.html);
        e.clipboardData.setData('text/plain', b.html);
        wrote = true;
      } catch (err) { wrote = false; }
    }
    b.preferOnPaste = !wrote;
    e.preventDefault();
    if (cut) removeElements(els.map(idOf), t('剪下'));
    HE.ui.toast(cut ? t('已剪下 {n} 個元素', { n: els.length }) : t('已複製 {n} 個元素', { n: els.length }));
  }

  function clipText(cd, type) {
    try { return cd.getData(type) || ''; } catch (err) { return ''; }
  }

  function onPaste(e) {
    if (!shouldHandle(e, false)) return;
    if (isBusy()) { e.preventDefault(); HE.ui.status(BUSY_MSG); return; }
    const target = defaultTarget();
    if (buffer && buffer.preferOnPaste) { e.preventDefault(); insertAt(target, buffer.html, t('貼上')); return; }
    const cd = e.clipboardData;
    if (!cd) return;
    const html = clipText(cd, 'text/html');
    const text = clipText(cd, 'text/plain');
    // Images win, except when the HTML carries text (Word/Excel also offer a picture of the selection).
    const files = imageFiles(cd);
    if (files.length && !htmlHasText(html)) { e.preventDefault(); pasteImages(files, target); return; }
    let out = '';
    if (buffer && text && normText(text) === buffer.key) out = buffer.html; // our own copy: keep styles and scripts
    else if (html.trim()) out = blockify(sanitizeHTML(html));
    if (!out && text.trim()) out = textToHTML(text);
    if (!out) return;
    e.preventDefault();
    insertAt(target, out, t('貼上'));
  }

  const attachedDocs = new WeakSet();
  function attach(d) {
    if (!d || attachedDocs.has(d)) return;
    attachedDocs.add(d);
    d.addEventListener('copy', onCopyCut);
    d.addEventListener('cut', onCopyCut);
    d.addEventListener('paste', onPaste);
  }

  const clipboard = (HE.clipboard = {
    has() { return !!buffer; },

    /** Copy elements (default: the selection) into the buffer and, when allowed, the system clipboard. */
    copy(ids) {
      const els = topLevel(ids == null ? HE.sel.ids : ids);
      if (!els.length) { HE.ui.status(t('沒有可以複製的元素')); return 0; }
      writeSystemClipboard(fillBuffer(els));
      HE.ui.toast(t('已複製 {n} 個元素', { n: els.length }));
      return els.length;
    },

    cut(ids) {
      const els = topLevel(ids == null ? HE.sel.ids : ids);
      if (!els.length) { HE.ui.status(t('沒有可以剪下的元素')); return 0; }
      writeSystemClipboard(fillBuffer(els));
      removeElements(els.map(idOf), t('剪下'));
      HE.ui.toast(t('已剪下 {n} 個元素', { n: els.length }));
      return els.length;
    },

    /** Paste the internal buffer (the system clipboard cannot be read from a menu inside the Artifact). */
    paste(opts = {}) {
      if (!buffer) { HE.ui.toast(t('剪貼簿是空的，請先複製元素')); return []; }
      const target = opts.refId && HE.doc.byId(opts.refId)
        ? { refId: opts.refId, position: HE.ops.POSITIONS.includes(opts.position) ? opts.position : 'after' }
        : defaultTarget();
      return insertAt(target, buffer.html, t('貼上'));
    },
  });

  /* ------------------------------------------------------------------ */
  /* Tables                                                              */
  /* ------------------------------------------------------------------ */

  function isCell(el) { const t = tag(el); return t === 'td' || t === 'th'; }
  function setSpan(el, name, n) { if (n > 1) el.setAttribute(name, String(n)); else el.removeAttribute(name); }

  /** Rows in visual order: every thead, then tbody / direct tr in tree order, then every tfoot. */
  function orderedRows(table) {
    const head = [];
    const mid = [];
    const foot = [];
    for (const sec of Array.from(table.children)) {
      const t = tag(sec);
      if (t === 'tr') { mid.push({ tr: sec, group: table }); continue; }
      if (t !== 'thead' && t !== 'tbody' && t !== 'tfoot') continue;
      const bucket = t === 'thead' ? head : t === 'tfoot' ? foot : mid;
      for (const tr of Array.from(sec.children)) if (tag(tr) === 'tr') bucket.push({ tr, group: sec });
    }
    return head.concat(mid, foot);
  }

  /**
   * Grid map of a table: grid[row][col] = the cell covering that slot (or null for a hole).
   * Honours colspan and rowspan (rowspan="0" and over-long spans stop at the end of their row group).
   */
  function buildGrid(table) {
    const rows = orderedRows(table);
    const n = rows.length;
    const groupEnd = new Array(n);
    for (let i = n - 1; i >= 0; i--) groupEnd[i] = i + 1 < n && rows[i + 1].group === rows[i].group ? groupEnd[i + 1] : i + 1;
    const grid = rows.map(() => []);
    const cells = new Map();
    let width = 0;
    rows.forEach((row, r) => {
      let c = 0;
      for (const cell of Array.from(row.tr.children)) {
        if (!isCell(cell)) continue;
        while (grid[r][c]) c++;
        let colSpan = parseInt(cell.getAttribute('colspan'), 10);
        colSpan = colSpan >= 1 ? Math.min(colSpan, 1000) : 1;
        let rowSpan = parseInt(cell.getAttribute('rowspan'), 10);
        if (!(rowSpan >= 0)) rowSpan = 1;
        const room = groupEnd[r] - r;
        rowSpan = rowSpan === 0 ? room : Math.min(rowSpan, room);
        for (let dr = 0; dr < rowSpan; dr++) for (let dc = 0; dc < colSpan; dc++) grid[r + dr][c + dc] = cell;
        cells.set(cell, { row: r, col: c, rowSpan, colSpan });
        c += colSpan;
        width = Math.max(width, c);
      }
    });
    for (const line of grid) for (let c = 0; c < width; c++) if (!line[c]) line[c] = null;
    return { rows: rows.map((x) => x.tr), grid, cells, width };
  }

  /** Make span attributes match the grid (rowspan="0", over-long spans) so inserted rows do not overlap them. */
  function normalizeSpans(g) {
    for (const [cell, p] of g.cells) {
      if (cell.hasAttribute('rowspan') && parseInt(cell.getAttribute('rowspan'), 10) !== p.rowSpan) setSpan(cell, 'rowspan', p.rowSpan);
      if (cell.hasAttribute('colspan') && parseInt(cell.getAttribute('colspan'), 10) !== p.colSpan) setSpan(cell, 'colspan', p.colSpan);
    }
  }

  /**
   * Where an element sits in its nearest table. scope: 'cell' (a cell or inside one),
   * 'row' (a tr) or 'table' (the table itself, a section, a caption…; uses the first cell).
   */
  function locate(el) {
    if (!el || el.nodeType !== 1) return null;
    const t = tag(el);
    const table = el.closest('table');
    if (!table) return null;
    let cell = null;
    let tr = null;
    let scope = 'table';
    if (isCell(el)) { cell = el; scope = 'cell'; }
    else if (t === 'tr') { tr = el; scope = 'row'; }
    else {
      const c = el.closest('td, th');
      if (c && table.contains(c)) { cell = c; scope = 'cell'; }
    }
    const g = buildGrid(table);
    if (!g.rows.length) return null;
    if (scope === 'cell') {
      const p = g.cells.get(cell);
      if (!p) return null;
      return { table, cell, scope, row: p.row, col: p.col, rowSpan: p.rowSpan, colSpan: p.colSpan, g };
    }
    if (scope === 'row') {
      const row = g.rows.indexOf(tr);
      if (row < 0) return null;
      const first = Array.from(tr.children).find((k) => g.cells.has(k)) || null;
      const p = first ? g.cells.get(first) : { col: 0, colSpan: 1 };
      return { table, cell: first, scope, row, col: p.col, rowSpan: 1, colSpan: p.colSpan, g };
    }
    const first = g.cells.size ? g.cells.keys().next().value : null;
    const p = first ? g.cells.get(first) : { row: 0, col: 0, rowSpan: 1, colSpan: 1 };
    return { table, cell: first, scope, row: p.row, col: p.col, rowSpan: p.rowSpan, colSpan: p.colSpan, g };
  }

  /** Copy the presentational attributes of src (in source order, for tidy diffs). */
  function copyLook(src, dst, extra) {
    const names = ['class', 'style', 'align', 'valign'].concat(extra || []);
    for (const a of Array.from(src.attributes)) if (names.includes(a.name)) dst.setAttribute(a.name, a.value);
  }
  /** Empty cell with the tag, class and style of `ref` (th stays th, so header rows/columns stay headers). */
  function makeCell(mdoc, ref) {
    const th = tag(ref) === 'th';
    const cell = mdoc.createElement(th ? 'th' : 'td');
    copyLook(ref, cell, th ? ['scope'] : []);
    return cell;
  }

  /** Keep <colgroup>/<col> in step with an inserted ('before'|'after') or deleted ('delete') column. */
  function adjustCols(table, c, mode) {
    let idx = 0;
    for (const cg of Array.from(table.children)) {
      if (tag(cg) !== 'colgroup') continue;
      const cols = Array.from(cg.children).filter((k) => tag(k) === 'col');
      for (const unit of cols.length ? cols : [cg]) {
        const span = Math.max(1, parseInt(unit.getAttribute('span'), 10) || 1);
        if (c >= idx && c < idx + span) {
          if (mode === 'delete') {
            if (span > 1) setSpan(unit, 'span', span - 1);
            else unit.remove();
            if (unit !== cg && !cg.children.length) cg.remove();
          } else if (span > 1 || unit === cg) {
            setSpan(unit, 'span', span + 1);
          } else {
            const copy = unit.cloneNode(false);
            copy.removeAttribute(HE.ID_ATTR);
            if (mode === 'after') unit.after(copy); else unit.before(copy);
          }
          return;
        }
        idx += span;
      }
    }
  }

  function selectCellNear(tableId, r, c) {
    const table = HE.doc.byId(tableId);
    if (!table) return;
    const g = buildGrid(table);
    if (!g.rows.length || !g.width) { HE.sel.set([tableId]); return; }
    const line = g.grid[Math.min(r, g.rows.length - 1)];
    const cell = line[Math.min(c, g.width - 1)] || line.find(Boolean);
    HE.sel.set([cell ? idOf(cell) : tableId]);
  }

  const tables = (HE.tables = {
    /**
     * Grid position of an element's cell. grid holds model cell elements (null for holes).
     * Returns {tableId, cellId, scope, rowIndex, colIndex, rowSpan, colSpan, rowCount, colCount, grid} or null.
     */
    cellInfo(id) {
      const loc = locate(HE.doc.byId(id));
      if (!loc) return null;
      return {
        tableId: idOf(loc.table),
        cellId: loc.cell ? idOf(loc.cell) : null,
        scope: loc.scope,
        rowIndex: loc.row,
        colIndex: loc.col,
        rowSpan: loc.rowSpan,
        colSpan: loc.colSpan,
        rowCount: loc.g.rows.length,
        colCount: loc.g.width,
        grid: loc.g.grid,
      };
    },

    /** Insert an empty row above/below the element's row (the table itself: at the top/bottom). Returns the new cell ids. */
    insertRow(id, where) {
      const loc = locate(HE.doc.byId(id));
      if (!loc) return [];
      const below = where !== 'above';
      const g = loc.g;
      let r = loc.row;
      if (loc.scope === 'table') r = below ? g.rows.length - 1 : 0;
      else if (loc.scope === 'cell' && below) r = loc.row + loc.rowSpan - 1;
      const wantCol = loc.scope === 'cell' ? loc.col : 0;
      const made = [];
      HE.history.transact(t('插入列'), () => {
        HE.ops.mutate(idOf(loc.table), (_table, mdoc) => {
          normalizeSpans(g);
          const refTr = g.rows[r];
          const tr = mdoc.createElement('tr');
          copyLook(refTr, tr);
          const seen = new Set();
          for (let c = 0; c < g.width; c++) {
            const x = g.grid[r][c];
            if (!x || seen.has(x)) continue;
            seen.add(x);
            const p = g.cells.get(x);
            // A cell spanning across the new row's position grows instead of getting a sibling.
            if (below ? p.row + p.rowSpan - 1 > r : p.row < r) { setSpan(x, 'rowspan', p.rowSpan + 1); continue; }
            const cell = makeCell(mdoc, x);
            setSpan(cell, 'colspan', p.colSpan);
            tr.append(cell);
            made.push({ el: cell, col: p.col, span: p.colSpan });
          }
          if (below) refTr.after(tr); else refTr.before(tr);
        }, { label: t('插入列') });
        const hit = made.find((m) => wantCol >= m.col && wantCol < m.col + m.span) || made[0];
        if (hit) HE.sel.set([idOf(hit.el)]);
      });
      const ids = made.map((m) => idOf(m.el)).filter(Boolean);
      flash(ids);
      return ids;
    },

    /** Insert an empty column left/right of the element's column (the table itself: leftmost/rightmost). Returns the new cell ids. */
    insertCol(id, where) {
      const loc = locate(HE.doc.byId(id));
      if (!loc) return [];
      const right = where !== 'left';
      const g = loc.g;
      let c = right ? loc.col + loc.colSpan - 1 : loc.col;
      if (loc.scope === 'table') c = right ? g.width - 1 : 0;
      const wantRow = loc.scope === 'table' ? 0 : loc.row;
      const made = [];
      HE.history.transact(t('插入欄'), () => {
        HE.ops.mutate(idOf(loc.table), (table, mdoc) => {
          normalizeSpans(g);
          for (let r = 0; r < g.rows.length; r++) {
            const y = g.grid[r][c];
            if (!y) continue; // ragged row: left as it is
            const p = g.cells.get(y);
            if (p.row !== r) continue; // handled at the row where the cell starts
            if (right ? p.col + p.colSpan - 1 > c : p.col < c) { setSpan(y, 'colspan', p.colSpan + 1); continue; }
            const cell = makeCell(mdoc, y);
            setSpan(cell, 'rowspan', p.rowSpan);
            if (right) y.after(cell); else y.before(cell);
            made.push({ el: cell, row: r, span: p.rowSpan });
          }
          adjustCols(table, c, right ? 'after' : 'before');
        }, { label: t('插入欄') });
        const hit = made.find((m) => wantRow >= m.row && wantRow < m.row + m.span) || made[0];
        if (hit) HE.sel.set([idOf(hit.el)]);
      });
      const ids = made.map((m) => idOf(m.el)).filter(Boolean);
      flash(ids);
      return ids;
    },

    /** Delete the element's row (the last row deletes the table). Cells spanning into it shrink; cells starting in it move down. */
    deleteRow(id) {
      const loc = locate(HE.doc.byId(id));
      if (!loc) return false;
      const g = loc.g;
      const tableId = idOf(loc.table);
      if (g.rows.length <= 1) return tables.deleteTable(tableId);
      const r = loc.row;
      const wantCol = loc.scope === 'cell' ? loc.col : 0;
      HE.history.transact(t('刪除列'), () => {
        HE.ops.mutate(tableId, (table) => {
          normalizeSpans(g);
          const tr = g.rows[r];
          const next = g.rows[r + 1] || null;
          const seen = new Set();
          for (let c = 0; c < g.width; c++) {
            const x = g.grid[r][c];
            if (!x || seen.has(x)) continue;
            seen.add(x);
            const p = g.cells.get(x);
            if (p.rowSpan === 1) continue; // goes away with the row
            setSpan(x, 'rowspan', p.rowSpan - 1);
            if (p.row === r && next) {
              // Keep a tall cell (and its content) by moving it into the next row at its column.
              let before = null;
              for (const k of Array.from(next.children)) {
                const q = g.cells.get(k);
                if (q && q.row === r + 1 && q.col > p.col) { before = k; break; }
              }
              next.insertBefore(x, before);
            }
          }
          const group = tr.parentElement;
          tr.remove();
          if (group && group !== table && !Array.from(group.children).some((k) => tag(k) === 'tr')) group.remove();
        }, { label: t('刪除列') });
        selectCellNear(tableId, r, wantCol);
      });
      return true;
    },

    /** Delete the element's column (the last column deletes the table). Cells spanning it shrink. */
    deleteCol(id) {
      const loc = locate(HE.doc.byId(id));
      if (!loc) return false;
      const g = loc.g;
      const tableId = idOf(loc.table);
      if (g.width <= 1) return tables.deleteTable(tableId);
      const c = loc.col;
      const wantRow = loc.row;
      let empty = false;
      HE.history.transact(t('刪除欄'), () => {
        HE.ops.mutate(tableId, (table) => {
          normalizeSpans(g);
          const seen = new Set();
          for (let r = 0; r < g.rows.length; r++) {
            const x = g.grid[r][c];
            if (!x || seen.has(x)) continue;
            seen.add(x);
            const p = g.cells.get(x);
            if (p.colSpan > 1) setSpan(x, 'colspan', p.colSpan - 1); else x.remove();
          }
          adjustCols(table, c, 'delete');
          empty = buildGrid(table).cells.size === 0;
        }, { label: t('刪除欄') });
        if (empty) removeElements([tableId], t('刪除欄'));
        else selectCellNear(tableId, wantRow, c);
      });
      return true;
    },

    deleteTable(id) {
      const el = HE.doc.byId(id);
      const table = el && (tag(el) === 'table' ? el : el.closest('table'));
      if (!table) return false;
      return removeElements([idOf(table)], t('刪除表格')) > 0;
    },
  });

  /* ------------------------------------------------------------------ */
  /* Lists                                                               */
  /* ------------------------------------------------------------------ */

  function isList(el) { const t = tag(el); return t === 'ul' || t === 'ol'; }
  function listOf(el) {
    if (!el || el.nodeType !== 1) return null;
    if (isList(el)) return el;
    const li = el.closest('li');
    if (li && isList(li.parentElement)) return li.parentElement;
    return el.closest('ul, ol');
  }

  const lists = (HE.lists = {
    /** Insert an empty li before/after the element's item (a list itself: at its start/end), then edit its text. Returns the new id. */
    addItem(id, where) {
      const el = HE.doc.byId(id);
      if (!el) return null;
      const before = where === 'before';
      let refId = null;
      let pos = before ? 'before' : 'after';
      let sample = null;
      if (isList(el)) {
        const items = Array.from(el.children).filter((k) => tag(k) === 'li');
        sample = before ? items[0] : items[items.length - 1];
        if (sample) refId = idOf(sample);
        else { refId = id; pos = before ? 'prepend' : 'append'; }
      } else {
        sample = el.closest('li');
        if (!sample) return null;
        refId = idOf(sample);
      }
      const cls = sample && sample.getAttribute('class');
      const html = '<li' + (cls ? ' class="' + util.esc(cls) + '"' : '') + '></li>';
      const ids = HE.ops.insertHTML(refId, pos, html, { label: t('新增清單項目') }) || [];
      const nid = ids[0];
      if (!nid) return null;
      HE.sel.set([nid]);
      flash([nid]);
      // Deferred so the menu click finishes before the canvas takes focus for editing.
      whenLive([nid], () => setTimeout(() => { if (HE.doc.byId(nid)) callCanvas('startTextEdit', nid); }, 0));
      return nid;
    },

    /** Swap ul <-> ol for the element's list, keeping attributes, children and ids. Returns the list id. */
    toggleType(id) {
      const list = listOf(HE.doc.byId(id));
      if (!list) return null;
      const to = tag(list) === 'ul' ? 'ol' : 'ul';
      const copy = HE.doc.model.createElement(to);
      for (const a of Array.from(list.attributes)) copy.setAttribute(a.name, a.value);
      for (const n of Array.from(list.childNodes)) copy.append(n.cloneNode(true));
      const ids = HE.ops.replaceHTML(idOf(list), copy.outerHTML, { label: to === 'ol' ? t('轉換成編號清單') : t('轉換成項目符號清單') }) || [];
      flash(ids);
      return ids[0] || null;
    },
  });

  /* ------------------------------------------------------------------ */
  /* Menu actions that need dialogs                                      */
  /* ------------------------------------------------------------------ */

  let imageInput = null;
  function pickImageFile(id) {
    if (!imageInput) {
      imageInput = document.createElement('input');
      imageInput.type = 'file';
      imageInput.accept = 'image/*';
      imageInput.id = 'cm-image-file';
      imageInput.hidden = true;
      imageInput.tabIndex = -1;
      imageInput.setAttribute('aria-hidden', 'true');
      imageInput.addEventListener('change', () => {
        const file = imageInput.files && imageInput.files[0];
        const target = imageInput.dataset.target;
        imageInput.value = '';
        if (!file || !target) return;
        readAsDataURL(file).then((url) => {
          const img = HE.doc.byId(target);
          if (!img || !url) return;
          const attrs = { src: url };
          if (img.hasAttribute('srcset')) attrs.srcset = null; // srcset would keep showing the old picture
          HE.ops.setAttr(target, attrs, { label: t('替換圖片') });
          flash([target]);
          if (file.size > BIG_IMAGE) HE.ui.toast(t('圖片已直接嵌入檔案（{size}），匯出的檔案會變大。', { size: util.bytes(file.size) }));
        }).catch(() => HE.ui.toast(t('無法讀取這個圖片檔'), { type: 'error' }));
      });
      document.body.append(imageInput);
    }
    imageInput.dataset.target = id;
    imageInput.click();
  }

  function replaceImage(id) {
    if (HE.inspector && typeof HE.inspector.replaceImage === 'function') HE.inspector.replaceImage(id);
    else pickImageFile(id);
  }

  async function editAlt(id) {
    const img = HE.doc.byId(id);
    if (!img) return;
    const value = await HE.ui.prompt(t('描述圖片內容，給螢幕閱讀器和圖片載入失敗時使用。純裝飾的圖片可以留空。'), {
      title: t('替代文字'), value: img.getAttribute('alt') || '', okLabel: t('套用'),
    });
    if (value == null || !HE.doc.byId(id)) return;
    HE.ops.setAttr(id, { alt: value.trim() }, { label: t('修改替代文字') });
  }

  async function editLink(id) {
    const a = HE.doc.byId(id);
    if (!a) return;
    const value = await HE.ui.prompt(t('連結網址（留空會移除網址）'), {
      title: t('編輯連結'), value: a.getAttribute('href') || '', placeholder: 'https://', okLabel: t('套用'),
    });
    if (value == null || !HE.doc.byId(id)) return;
    HE.ops.setAttr(id, { href: value.trim() || null }, { label: t('修改連結') });
  }

  function showSourceModal(html) {
    const wrap = HE.ui.h('div', 'field-stack');
    const label = HE.ui.h('label', 'field-label');
    label.htmlFor = 'cm-source-text';
    label.textContent = t('瀏覽器不允許直接寫入剪貼簿。原始碼已全選，按 {key} 就能複製。', { key: HE.ui.kbd('mod+c') });
    const ta = HE.ui.h('textarea', 'textarea mono');
    ta.id = 'cm-source-text';
    ta.readOnly = true;
    ta.rows = 14;
    ta.spellcheck = false;
    ta.value = html;
    wrap.append(label, ta);
    HE.ui.modal({
      title: t('複製 HTML 原始碼'),
      body: wrap,
      width: 680,
      actions: [
        { label: t('關閉'), kind: 'ghost' },
        {
          label: t('複製'),
          kind: 'primary',
          onClick: () => {
            ta.focus();
            ta.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            if (ok) { HE.ui.toast(t('已複製 HTML 原始碼')); return undefined; }
            HE.ui.status(t('請按 {key} 複製已選取的原始碼', { key: HE.ui.kbd('mod+c') }));
            return false;
          },
        },
      ],
    });
    // After the modal's own focus handling, select everything for a manual copy.
    setTimeout(() => { ta.focus(); ta.select(); ta.scrollTop = 0; }, 0);
  }

  /** Copy clean source to the system clipboard; must be called synchronously inside the click. */
  function copySource(ids, fallbackId) {
    const els = topLevel(ids);
    const html = els.length ? els.map((el) => HE.doc.html(idOf(el))).join('\n') : HE.doc.html(fallbackId);
    if (!html) return;
    const fail = () => showSourceModal(html);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(html).then(() => HE.ui.toast(t('已複製 HTML 原始碼')), fail);
      } else fail();
    } catch (err) { fail(); }
  }

  /* ------------------------------------------------------------------ */
  /* Context menu                                                        */
  /* ------------------------------------------------------------------ */

  /** Can the buffer go inside el? Lists, rows and row groups only take matching parts. */
  function acceptsInside(el) {
    if (!inBody(el)) return false;
    const t = tag(el);
    const parts = t === 'ul' || t === 'ol' || t === 'tr' || t === 'thead' || t === 'tbody' || t === 'tfoot';
    if (!parts && (NOT_CONTAINER.has(t) || util.isVoid(el) || util.isInline(el))) return false;
    if (!buffer) return !parts;
    return util.canContain(el, util.fragment(buffer.html, document));
  }

  function tableSubmenu(id, locked) {
    const info = tables.cellInfo(id);
    const scope = info ? info.scope : 'table';
    const noGrid = !info;
    return {
      label: t('表格'),
      icon: 'table',
      disabled: locked,
      children: [
        { label: t('在上方插入列'), icon: 'row-above', disabled: noGrid, onClick: () => tables.insertRow(id, 'above') },
        { label: t('在下方插入列'), icon: 'row-below', disabled: noGrid, onClick: () => tables.insertRow(id, 'below') },
        { label: t('刪除這一列'), icon: 'row-delete', disabled: noGrid || scope === 'table', onClick: () => tables.deleteRow(id) },
        { separator: true },
        { label: t('在左側插入欄'), icon: 'col-left', disabled: noGrid || scope === 'row', onClick: () => tables.insertCol(id, 'left') },
        { label: t('在右側插入欄'), icon: 'col-right', disabled: noGrid || scope === 'row', onClick: () => tables.insertCol(id, 'right') },
        { label: t('刪除這一欄'), icon: 'col-delete', disabled: noGrid || scope !== 'cell', onClick: () => tables.deleteCol(id) },
        { separator: true },
        { label: t('刪除表格'), icon: 'trash', danger: true, onClick: () => tables.deleteTable(id) },
      ],
    };
  }

  function listSubmenu(id, list, locked) {
    const ordered = tag(list) === 'ol';
    return {
      label: t('清單'),
      icon: 'list',
      disabled: locked,
      children: [
        { label: t('在後面新增項目'), icon: 'plus', onClick: () => lists.addItem(id, 'after') },
        { label: t('在前面新增項目'), icon: 'plus', onClick: () => lists.addItem(id, 'before') },
        { separator: true },
        {
          label: ordered ? t('轉換成項目符號清單') : t('轉換成編號清單'),
          icon: ordered ? 'list' : 'list-ordered',
          onClick: () => lists.toggleType(id),
        },
      ],
    };
  }

  /** 動態效果: one list per kind (the primary's preset is checked; choosing it again removes it), preview, remove. */
  function effectsSubmenu(ids, id, locked) {
    const fx = HE.fx;
    const targets = ids.filter((x) => fx.canHost(HE.doc.byId(x)));
    const cur = fx.of(HE.sel.has(id) && HE.sel.primary ? HE.sel.primary : id);
    const children = [];
    for (const kind of fx.KINDS) {
      children.push({ heading: fx.KIND_ZH[kind] });
      for (const p of fx.presets(kind)) {
        const on = cur[kind] === p.name;
        children.push({
          label: p.label,
          checked: on,
          onClick: () => {
            const res = fx.apply(targets, { [kind]: on ? 'none' : p.name }, { label: on ? t('移除「{name}」', { name: p.label }) : t('套用「{name}」', { name: p.label }) });
            if (res.notes.length) HE.ui.status(Array.from(new Set(res.notes)).join(t('；')));
          },
        });
      }
    }
    const any = targets.some((x) => fx.has(x));
    children.push({ separator: true });
    children.push({ label: t('預覽效果'), icon: 'play', disabled: !any || HE.mode !== 'edit', onClick: () => fx.demo(targets) });
    children.push({ label: t('移除動態效果'), icon: 'x', disabled: !any, onClick: () => fx.remove(targets, null, { label: t('移除動態效果') }) });
    return { label: t('動態效果'), icon: 'motion', disabled: locked || !targets.length, children };
  }

  function buildItems(el, id) {
    const ids = HE.sel.has(id) ? HE.sel.ids.slice() : [id];
    const locked = isBusy();
    const model = HE.doc.model;
    const tn = tag(el);
    const root = HE.doc.isRoot(el);
    const inPage = inBody(el);
    const parent = el.parentElement;
    const parentId = !root && parent && parent !== model.documentElement && parent !== model.head ? idOf(parent) : null;
    const canCopy = topLevel(ids).length > 0;
    const hasKids = el.children.length > 0 || (el.textContent || '').trim() !== '';
    const hasAI = !!(HE.ai && typeof HE.ai.focus === 'function');
    const hasEditHTML = !!(HE.inspector && typeof HE.inspector.editHTML === 'function');

    const items = [{ heading: ids.length > 1 ? t('{name}（已選取 {n} 個）', { name: util.label(el), n: ids.length }) : util.label(el) }];
    if (util.isTextEditable(el) && hasCanvas('startTextEdit')) {
      items.push({ label: t('編輯文字'), icon: 'pencil', shortcut: 'enter', disabled: locked, onClick: () => callCanvas('startTextEdit', id) });
    }
    items.push({ label: t('交給 AI 修改…'), icon: 'sparkles', shortcut: 'mod+k', disabled: !hasAI, onClick: () => HE.ai.focus({ ids: HE.sel.ids.slice() }) });

    items.push({ separator: true });
    items.push({ label: t('剪下'), icon: 'cut', shortcut: 'mod+x', disabled: locked || !canCopy, onClick: () => clipboard.cut(ids) });
    items.push({ label: t('複製'), icon: 'copy', shortcut: 'mod+c', disabled: !canCopy, onClick: () => clipboard.copy(ids) });
    items.push({ label: t('貼上'), icon: 'paste', shortcut: 'mod+v', disabled: locked || !buffer, onClick: () => clipboard.paste({ refId: id, position: 'after' }) });
    if (acceptsInside(el)) {
      items.push({ label: t('貼到裡面'), icon: 'paste', disabled: locked || !buffer, onClick: () => clipboard.paste({ refId: id, position: 'append' }) });
    }
    items.push({ label: t('建立副本'), icon: 'duplicate', shortcut: 'mod+d', disabled: locked || !canCopy, onClick: () => duplicateElements(ids) });
    items.push({ label: t('刪除'), icon: 'trash', shortcut: 'delete', danger: true, disabled: locked || !canCopy, onClick: () => removeElements(ids, t('刪除')) });

    items.push({ separator: true });
    items.push({ label: t('選取父層'), icon: 'parent', shortcut: 'escape', disabled: !parentId, onClick: () => HE.sel.set([parentId]) });
    items.push({ label: t('上移'), icon: 'arrow-up', shortcut: 'alt+up', disabled: locked || root || !HE.ops.visualSibling(el, -1), onClick: () => HE.ops.nudge(id, -1) });
    items.push({ label: t('下移'), icon: 'arrow-down', shortcut: 'alt+down', disabled: locked || root || !HE.ops.visualSibling(el, 1), onClick: () => HE.ops.nudge(id, 1) });
    items.push({ label: t('移出父層'), icon: 'outdent', shortcut: 'alt+shift+left', disabled: locked || !canChangeLevel(ids, -1), onClick: () => changeLevel(ids, -1) });
    items.push({ label: t('移入上方元素'), icon: 'indent', shortcut: 'alt+shift+right', disabled: locked || !canChangeLevel(ids, 1), onClick: () => changeLevel(ids, 1) });
    items.push({ label: t('包進容器'), icon: 'wrap', disabled: locked || root || !inPage || !wrapPlan(ids), onClick: () => wrapElements(ids) });
    items.push({ label: t('解除容器'), icon: 'unwrap', disabled: locked || root || !inPage || !hasKids || !canUnwrap(el), onClick: () => unwrapElement(id, t('解除容器')) });

    const extra = [];
    if (HE.fx && !root && HE.fx.canHost(el)) extra.push(effectsSubmenu(ids, id, locked));
    if (inPage && el.closest('table')) extra.push(tableSubmenu(id, locked));
    const list = inPage ? listOf(el) : null;
    if (list && (isList(el) || el.closest('li'))) extra.push(listSubmenu(id, list, locked));
    if (tn === 'img') {
      extra.push({ label: t('替換圖片…'), icon: 'image', disabled: locked, onClick: () => replaceImage(id) });
      extra.push({ label: t('裁切圖片…'), icon: 'crop', disabled: locked || !(HE.inspector && HE.inspector.cropImage), onClick: () => HE.inspector.cropImage(id) });
      extra.push({ label: t('替代文字…'), icon: 'text', disabled: locked, onClick: () => editAlt(id) });
    }
    const link = inPage ? el.closest('a') : null;
    if (link) {
      const linkId = idOf(link);
      extra.push({ label: t('編輯連結…'), icon: 'link', disabled: locked, onClick: () => editLink(linkId) });
      extra.push({ label: t('移除連結'), icon: 'unlink', disabled: locked, onClick: () => unwrapElement(linkId, t('移除連結')) });
    }
    if (extra.length) items.push({ separator: true }, ...extra);

    items.push({ separator: true });
    items.push({ label: t('編輯 HTML…'), icon: 'code', disabled: locked || !hasEditHTML, onClick: () => HE.inspector.editHTML(id) });
    items.push({ label: t('複製 HTML 原始碼'), icon: 'clipboard', onClick: () => copySource(ids, id) });
    return items;
  }

  /** Top-window point near the element's top-left corner, for opening the menu without a pointer. */
  function anchorPoint(id) {
    const frame = HE.canvas && HE.canvas.frame;
    const l = HE.live.byId(id);
    if (frame && frame.getBoundingClientRect && l && l.getBoundingClientRect) {
      const fr = frame.getBoundingClientRect();
      const scale = frame.offsetWidth ? fr.width / frame.offsetWidth : 1;
      const r = l.getBoundingClientRect();
      return {
        x: util.clamp(fr.left + (r.left + Math.min(24, r.width / 2)) * scale, fr.left, fr.right),
        y: util.clamp(fr.top + (r.top + Math.min(16, r.height / 2)) * scale, fr.top, fr.bottom),
      };
    }
    return { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 3) };
  }

  let initialised = false;

  HE.contextmenu = {
    init() {
      if (initialised) return;
      initialised = true;
      attach(document);
      // Same keys as promote/demote in PowerPoint and Word outlines.
      HE.keys.register('alt+shift+left', () => levelKey(-1));
      HE.keys.register('alt+shift+right', () => levelKey(1));
      HE.on('canvas:ready', (p) => attach((p && p.doc) || HE.live.doc));
      if (HE.live.doc) attach(HE.live.doc);
      // Leaving the app (not just focusing the canvas iframe) may change the system clipboard.
      window.addEventListener('blur', () => {
        setTimeout(() => { if (buffer && !document.hasFocus()) buffer.preferOnPaste = false; }, 0);
      });
    },

    /** Open the element menu at top-window client coords (x/y omitted: next to the element). Returns {close} or null. */
    open(x, y, id) {
      if (!HE.doc.model || HE.mode !== 'edit') return null;
      const targetId = id || HE.sel.primary;
      if (!targetId || !HE.doc.byId(targetId)) return null;
      // Commit an in-place text edit first so menu actions see the current content.
      if (hasCanvas('isEditingText') && HE.canvas.isEditingText()) callCanvas('endTextEdit', true);
      const el = HE.doc.byId(targetId);
      if (!el) return null;
      if (!HE.sel.has(targetId)) HE.sel.set([targetId]);
      const pos = x == null || y == null ? anchorPoint(targetId) : { x, y };
      return HE.ui.menu(buildItems(el, targetId), pos);
    },
  };
})();
