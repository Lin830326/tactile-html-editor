/* Tactile — pages.js: the 頁面 pane. It lists the slides of a deck, or the pages of a multi-page document, and is where
 * they are added, renamed, copied, removed and put in order.
 *
 * A deck is found by its layout, not by a class name: the nearest box under <body> whose children in the flow are
 * two or more landscape boards of one size (see findDeck). Every change goes through HE.ops, so each is one undo step.
 *
 * A multi-page document holds its pages in one file and switches between them with CSS only (:target and :has()):
 *   <nav class="tpg-nav" data-tpg-nav><a href="#home">…</a><a href="#news">…</a></nav>
 *   <div class="tpg" data-tpg>
 *     <section class="tpg-page" id="home" data-tpg-title="…">…</section>
 *     <section class="tpg-page" id="news" data-tpg-title="…">…</section>
 *   </div>
 * The editor keeps <style data-he-style="pages"> and the links of every [data-tpg-nav] in step with the pages
 * (sync, which also runs as a history closer, so whatever changed the pages gets them in the same undo step).
 * The edit frame does not depend on :target: an editor-only <style> there shows the page HE.pages remembers.
 *
 *   HE.pages = {init, findDeck(doc), state(), mode(), list(), add(afterId, opts), duplicate(id), remove(id), step(id, dir),
 *               moveTo(id, refId, position), go(id), rename(id, title), convert(), sync(), takeDuplicates(),
 *               freeze(copyDoc), blockHTML()}
 */
(function () {
  'use strict';
  const HE = window.HE;
  const ID = HE.ID_ATTR;
  const h = HE.ui.h;
  const t = HE.t;
  const TITLE_MAX = 60;

  // boxKnown: a deck was found in this document, in `boxId` ('' = <body>). It keeps the list when the layout stops
  // looking like a deck: one slide left, or a phone width where the slides grow taller than their ratio.
  const S = { pane: null, list: null, boxKnown: false, boxId: '', dirty: true, dragId: null, last: null };

  /* ------------------------------------------------------------------ */
  /* Finding the deck                                                    */
  /* ------------------------------------------------------------------ */

  function flow(el) {
    const win = el.ownerDocument.defaultView;
    return Array.from(el.children).filter((c) => {
      if (!c.offsetWidth || !c.offsetHeight) return false;
      return !/^(absolute|fixed)$/.test(win.getComputedStyle(c).position);
    });
  }

  /**
   * The deck of a laid-out document: {box, boards, ratio (width / height), selector (for the boards)}, or null.
   * Looks at most 4 levels down from <body>, through boxes that hold a single child.
   */
  function findDeck(doc) {
    if (!doc || !doc.body || !doc.defaultView) return null;
    let box = doc.body;
    let path = 'body';
    for (let depth = 0; depth < 4 && box; depth++) {
      const kids = flow(box);
      if (kids.length >= 2) {
        const w = kids[0].offsetWidth;
        const ratio = w / kids[0].offsetHeight;
        const same = kids.every((k) => Math.abs(k.offsetWidth - w) <= 2 && Math.abs(k.offsetWidth / k.offsetHeight / ratio - 1) < 0.03);
        return same && w >= 240 && ratio > 1.2 && ratio < 2.6 ? { box, boards: kids, ratio, selector: path + ' > *' } : null;
      }
      if (kids.length !== 1) return null;
      path += ' > :nth-child(' + (Array.prototype.indexOf.call(box.children, kids[0]) + 1) + ')';
      box = kids[0];
    }
    return null;
  }

  function titleOf(m) {
    const head = m.querySelector('h1, h2, h3, h4, h5, h6');
    const text = ((head || m).textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return t('（沒有文字）');
    return text.length > TITLE_MAX ? text.slice(0, TITLE_MAX - 1) + '…' : text;
  }

  /** What the pane shows: {slides: [{id, title, bg, ink}], ratio, exact (the layout is a deck right now), current (id)}. */
  function state() {
    const out = { slides: [], ratio: 16 / 9, exact: false, current: null };
    const d = HE.live && HE.live.doc;
    if (!d || !d.body || !HE.doc.model) return out;
    let boards = [];
    const deck = findDeck(d);
    if (deck && deck.boards.every((b) => b.hasAttribute(ID)) && (deck.box === d.body || deck.box.hasAttribute(ID))) {
      S.boxKnown = true;
      S.boxId = deck.box === d.body ? '' : deck.box.getAttribute(ID);
      boards = deck.boards;
      out.exact = true;
    } else if (S.boxKnown) {
      const box = S.boxId ? HE.live.byId(S.boxId) : d.body;
      boards = box ? flow(box).filter((b) => b.hasAttribute(ID)) : [];
      if (!boards.length) S.boxKnown = false;
    }
    const win = d.defaultView;
    const sel = HE.sel.primary ? HE.doc.byId(HE.sel.primary) : null;
    for (const b of boards) {
      const id = b.getAttribute(ID);
      const m = HE.doc.byId(id);
      if (!m) continue;
      const cs = win.getComputedStyle(b);
      const clear = /^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor);
      out.slides.push({ id, title: titleOf(m), bg: clear ? '' : cs.backgroundColor, ink: clear ? '' : cs.color });
      if (sel && m.contains(sel)) out.current = id;
    }
    if (boards.length && boards[0].offsetHeight) out.ratio = boards[0].offsetWidth / boards[0].offsetHeight;
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Changes                                                             */
  /* ------------------------------------------------------------------ */

  /** False (with a message) while a change may not be made. Commits the text being typed first. */
  function ready() {
    if (HE.ai && HE.ai.busy) { HE.ui.toast(t('AI 助理正在修改文件，請等它完成後再調整投影片'), { type: 'error' }); return false; }
    const c = HE.canvas;
    if (c && c.isEditingText && c.isEditingText()) c.endTextEdit(true);
    return !!HE.doc.model;
  }

  function goSlide(id) {
    if (!HE.doc.byId(id)) return false;
    HE.sel.set([id]);
    // After the frame has the change: a new slide may still be on its way into it.
    requestAnimationFrame(() => { if (HE.canvas && HE.canvas.scrollIntoView) HE.canvas.scrollIntoView(id); });
    return true;
  }

  const numberOf = (id) => state().slides.findIndex((s) => s.id === id) + 1;

  /** A new slide after `afterId` (default: the current slide, else the last). It takes the tag and the classes every slide shares. */
  function addSlide(afterId) {
    if (!ready()) return null;
    const st = state();
    if (!st.slides.length) return null;
    const ref = afterId && st.slides.some((s) => s.id === afterId) ? afterId : st.current || st.slides[st.slides.length - 1].id;
    const models = st.slides.map((s) => HE.doc.byId(s.id));
    const tag = HE.util.tag(HE.doc.byId(ref));
    const shared = Array.from(models[0].classList).filter((c) => models.every((m) => m.classList.contains(c)));
    const cls = shared.length ? ' class="' + HE.util.esc(shared.join(' ')) + '"' : '';
    // The new slide's first words follow the interface language, as the blocks of the insert panel do.
    const html = '<' + tag + cls + '><h2>' + HE.util.esc(t('新投影片')) + '</h2><p>' + HE.util.esc(t('在這裡輸入內容')) + '</p></' + tag + '>';
    const ids = HE.ops.insertHTML(ref, 'after', html, { label: t('新增投影片') });
    const id = ids && ids[0];
    if (!id) return null;
    goSlide(id);
    HE.ui.status(t('已新增第 {n} 張投影片', { n: numberOf(id) }));
    return id;
  }

  function duplicateSlide(id) {
    if (!ready() || !HE.doc.byId(id)) return null;
    const ids = HE.ops.duplicate([id], { label: t('複製投影片') });
    const copy = ids && ids[0];
    if (!copy) return null;
    goSlide(copy);
    HE.ui.status(t('已複製成第 {n} 張投影片', { n: numberOf(copy) }));
    return copy;
  }

  function removeSlide(id) {
    if (!ready()) return false;
    const st = state();
    const i = st.slides.findIndex((s) => s.id === id);
    if (i < 0) return false;
    if (st.slides.length === 1) { HE.ui.toast(t('這是最後 1 張投影片，不能刪除')); return false; }
    const next = st.slides[i + 1] || st.slides[i - 1];
    if (!HE.ops.remove([id], { label: t('刪除投影片') })) return false;
    goSlide(next.id);
    HE.ui.status(t('已刪除第 {n} 張投影片。按 {key} 可以復原', { n: i + 1, key: HE.ui.kbd('mod+z') }));
    return true;
  }

  function moveSlide(id, refId, position) {
    if (!ready() || id === refId) return false;
    const st = state();
    if (!st.slides.some((s) => s.id === id) || !st.slides.some((s) => s.id === refId)) return false;
    const pos = position === 'before' ? 'before' : 'after';
    // Already there: no undo step for a drop on the slide's own edge.
    const i = st.slides.findIndex((s) => s.id === id), j = st.slides.findIndex((s) => s.id === refId);
    if ((pos === 'before' && i === j - 1) || (pos === 'after' && i === j + 1)) return false;
    if (!HE.ops.move(id, refId, pos, { label: t('移動投影片') })) return false;
    goSlide(id);
    HE.ui.status(t('已移到第 {n} 張', { n: numberOf(id) }));
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Pages of one document: reading                                      */
  /* ------------------------------------------------------------------ */

  const BOX = '[data-tpg]';
  const NAV = '[data-tpg-nav]';
  const TITLE = 'data-tpg-title';
  const STYLE_KEY = 'pages';
  const LIVE_CSS_ID = '__he_pages_css';
  const NON_VISUAL = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript', 'base', 'title']);
  const BLOCK_ANCHORS = ['home', 'about', 'contact'];
  // The look of a navigation bar with the class tpg-nav. :where() gives the rules no weight, so any rule of the page wins.
  const NAV_CSS = [
    ':where(.tpg-nav) { display: flex; flex-wrap: wrap; gap: .25em 1.25em; margin: 0 0 1.5rem; padding: .75em clamp(16px, 4vw, 40px); border-bottom: 1px solid rgb(127 127 127 / .3); }',
    ':where(.tpg-nav a) { color: inherit; text-decoration: none; }',
  ];
  const CURRENT_LINK = '{ font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }';
  const HEAD_NOTE = '/* Tactile 多頁面：依文件中 data-tpg 裡的頁面自動產生，請在編輯器的「頁面」分頁修改。 */'; // i18n-ok: written into the document's CSS
  const HEAD_NOTE_HANS = '/* Tactile 多页面：根据文档中 data-tpg 里的页面自动生成，请在编辑器的“页面”标签页中修改。 */'; // i18n-ok: written into the document's CSS
  const HEAD_NOTE_EN = '/* Tactile pages: generated from the pages inside data-tpg. Change them in the editor, under Pages. */';

  // cur: the data-he-id of the page the edit frame shows. anchors: the page ids at the last sync (a link to one that
  // has gone since is a page's link and goes too; any other link in a navigation bar is the user's own and stays).
  // prev: the page shown before `cur`, which comes back when `cur` is gone (an undo takes a new page away).
  // replaced: the document was swapped whole since the last sync (a source edit), so a link of a page that has gone
  // goes only when nothing else has its id. aiLinks: the data-he-ids of the links the navigation bars had when the
  // AI run began or at its last sync (null outside a run). dupes: the duplicate links removed since takeDuplicates() was last called.
  const P = { cur: null, prev: null, anchors: null, syncing: false, replaced: false, aiLinks: null, dupes: 0 };
  function setCurrent(id) {
    if (id === P.cur) return;
    P.prev = P.cur;
    P.cur = id;
  }

  const heId = (el) => (el ? el.getAttribute(ID) : null);
  const anchorOf = (m) => (m.getAttribute('id') || '').trim();

  function box() {
    const b = HE.doc.model ? HE.doc.body : null;
    return b ? b.querySelector(BOX) : null;
  }
  /** The pages, as model elements: the .tpg-page children of the first [data-tpg]. */
  function pageEls() {
    const b = box();
    return b ? Array.from(b.children).filter((c) => c.classList.contains('tpg-page') && c.hasAttribute(ID)) : [];
  }
  function navEls() {
    const b = HE.doc.model ? HE.doc.body : null;
    return b ? Array.from(b.querySelectorAll(NAV)).filter((n) => n.hasAttribute(ID)) : [];
  }
  const isPages = () => pageEls().length > 0;

  function pageTitle(m) {
    const own = (m.getAttribute(TITLE) || '').replace(/\s+/g, ' ').trim();
    if (own) return own;
    const head = m.querySelector('h1, h2, h3, h4, h5, h6');
    const text = ((head && head.textContent) || '').replace(/\s+/g, ' ').trim();
    return (text.length > TITLE_MAX ? text.slice(0, TITLE_MAX - 1) + '…' : text) || anchorOf(m) || t('（沒有文字）');
  }

  /** The page the edit frame shows (default: the first). */
  function currentEl(pages) {
    const list = pages || pageEls();
    if (!list.length) return null;
    const m = (P.cur && list.find((p) => heId(p) === P.cur)) || (P.prev && list.find((p) => heId(p) === P.prev)) || list[0];
    P.cur = heId(m);
    return m;
  }

  function mode() {
    if (!HE.doc.model) return '';
    if (isPages()) return 'pages';
    return state().slides.length ? 'deck' : '';
  }

  /** The pages of a multi-page document: [{id (data-he-id), anchor (the HTML id), title, current}]. Empty for any other document. */
  function list() {
    if (!HE.doc.model) return [];
    const pages = pageEls();
    const cur = currentEl(pages);
    return pages.map((m) => ({ id: heId(m), anchor: anchorOf(m), title: pageTitle(m), current: m === cur }));
  }

  /* ------------------------------------------------------------------ */
  /* Pages: ids for the address bar                                      */
  /* ------------------------------------------------------------------ */

  function idTaken(a, taken) {
    return (!!taken && taken.has(a)) || !!HE.doc.model.querySelector('[id="' + a.replace(/["\\]/g, '\\$&') + '"]');
  }
  /** `base`, or `base-2`, `base-3`… when another element has it. */
  function freeId(base, taken) {
    if (!idTaken(base, taken)) return base;
    for (let n = 2; ; n++) if (!idTaken(base + '-' + n, taken)) return base + '-' + n;
  }
  /** An id made of a title's letters and digits; a title with none of them (Chinese) gets a number, from `n` up: page-2. */
  function anchorFor(title, taken, n) {
    const s = String(title || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
    if (s) return freeId(/^[a-z]/.test(s) ? s : 'page-' + s, taken);
    for (let i = n || pageEls().length + 1; ; i++) if (!idTaken('page-' + i, taken)) return 'page-' + i;
  }

  /* ------------------------------------------------------------------ */
  /* Pages: the generated CSS                                            */
  /* ------------------------------------------------------------------ */

  /** The note follows the document's language, not the interface's (the rule of effects.js). */
  function headNote() {
    const lang = (HE.doc.model && HE.doc.model.documentElement.getAttribute('lang')) || '';
    if (/^zh-(hans|cn|sg)/i.test(lang)) return HEAD_NOTE_HANS;
    return !lang || /^zh/i.test(lang) ? HEAD_NOTE : HEAD_NOTE_EN;
  }
  const linkSel = (a) => '[data-tpg-nav] a[href="#' + a.replace(/["\\]/g, '\\$&') + '"]';

  /**
   * One page shows: the one the address names (:target), else the first. A browser without :has() shows them all.
   * The first page is the first .tpg-page, whatever else sits in the container before it.
   */
  function buildCss(anchors) {
    const lines = [headNote()].concat(NAV_CSS, [
      '.tpg > .tpg-page { display: none; }',
      '.tpg > .tpg-page:target { display: block; }',
      '.tpg:not(:has(> .tpg-page:target)) > .tpg-page:not(.tpg-page ~ .tpg-page) { display: block; }',
      '@supports not selector(:has(*)) { .tpg > .tpg-page { display: block; } }',
      // Paper has no links: every page prints, each on a new sheet, and the navigation bars stay out.
      '@media print { .tpg > .tpg-page { display: block; } .tpg > .tpg-page ~ .tpg-page { break-before: page; } [data-tpg-nav] { display: none !important; } }',
    ]);
    anchors.forEach((a, i) => {
      if (!a) return;
      if (!i) lines.push(':root:not(:has(.tpg > .tpg-page:target)) ' + linkSel(a) + ' ' + CURRENT_LINK);
      lines.push(':root:has(#' + CSS.escape(a) + ':target) ' + linkSel(a) + ' ' + CURRENT_LINK);
    });
    return lines.join('\n');
  }

  /**
   * A picture has no address: in a copy of the document that is about to be drawn (the PNG export), the page CSS
   * becomes one that shows the page the canvas shows and marks its link, whatever :target says. `doc` is that copy,
   * never the model. Returns whether it holds pages.
   */
  function freeze(doc) {
    const pages = pageEls();
    const cur = currentEl(pages);
    const sheet = doc && doc.querySelector('style[data-he-style="' + STYLE_KEY + '"]');
    if (!cur || !sheet) return false;
    const a = anchorOf(cur);
    sheet.textContent = NAV_CSS.concat([
      '.tpg > .tpg-page { display: none; }',
      '.tpg > .tpg-page[id="' + a.replace(/["\\]/g, '\\$&') + '"] { display: block; }',
      linkSel(a) + ' ' + CURRENT_LINK,
    ]).join('\n');
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Pages: the edit frame                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Edit mode: an editor-only <style> shows the current page and marks its link, and the frame's copy of the
   * document's own page CSS is switched off (it would mark the first page's link, since the frame has no :target).
   * Preview: neither, so the document's CSS and links work as they will in the exported file.
   * Only the live frame is touched; the model and an export never see it.
   */
  function paint() {
    const d = HE.live && HE.live.doc;
    if (!d || !d.head || !HE.doc.model) return;
    const pages = pageEls();
    const edit = HE.mode === 'edit' && pages.length > 0;
    for (const sheet of d.querySelectorAll('style[data-he-style="' + STYLE_KEY + '"]')) {
      if (edit) { if (sheet.getAttribute('media') !== 'not all') sheet.setAttribute('media', 'not all'); }
      else if (sheet.hasAttribute('media')) sheet.removeAttribute('media');
    }
    let el = d.getElementById(LIVE_CSS_ID);
    if (!edit) { if (el) el.remove(); return; }
    const cur = currentEl(pages);
    const css = NAV_CSS.join('\n') + '\n.tpg > .tpg-page { display: none !important } .tpg > .tpg-page[' + ID + '="' + heId(cur) + '"] { display: block !important }' +
      (anchorOf(cur) ? '\n' + linkSel(anchorOf(cur)) + ' ' + CURRENT_LINK : '');
    if (!el) { el = d.createElement('style'); el.id = LIVE_CSS_ID; d.head.append(el); }
    if (el.textContent !== css) el.textContent = css;
  }

  function hashOf(win) {
    const raw = String(win.location.hash || '').slice(1);
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
  }
  /** Preview in the edit frame: open on the page that was being edited. */
  function showInPreview() {
    const d = HE.live && HE.live.doc;
    const win = d && d.defaultView;
    const pages = pageEls();
    const cur = currentEl(pages);
    if (!win || !cur || !anchorOf(cur)) return;
    try {
      const have = hashOf(win);
      if (have !== anchorOf(cur) && (cur !== pages[0] || have)) win.location.hash = anchorOf(cur);
    } catch (e) { /* a frame on its way out */ }
  }
  /** Back in edit mode: stay on the page the preview was left on. */
  function adoptPreviewPage() {
    const d = HE.live && HE.live.doc;
    const win = d && d.defaultView;
    if (!win) return;
    let have = '';
    try { have = hashOf(win); } catch (e) { return; }
    const m = have ? pageEls().find((p) => anchorOf(p) === have) : null;
    if (m) setCurrent(heId(m));
  }
  /** The page that holds the selection becomes the one shown. True when that changed it. */
  function followSelection() {
    const sel = HE.sel.primary ? HE.doc.byId(HE.sel.primary) : null;
    if (!sel) return false;
    const m = pageEls().find((p) => p.contains(sel));
    if (!m || heId(m) === P.cur) return false;
    setCurrent(heId(m));
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Pages: keeping the navigation bars and the CSS in step              */
  /* ------------------------------------------------------------------ */

  function linkAnchor(a) {
    const href = (a.getAttribute('href') || '').trim();
    if (!href.startsWith('#') || href.length < 2) return '';
    try { return decodeURIComponent(href.slice(1)); } catch (e) { return href.slice(1); }
  }
  /** What moves with a link: the <li> around it when it is that item's only link, else the link. */
  function itemOf(a, nav) {
    const p = a.parentElement;
    return p && p !== nav && p.localName === 'li' && p.querySelectorAll('a').length === 1 ? p : a;
  }
  function newItem(nav, like, anchor, title) {
    const d = nav.ownerDocument;
    const copy = (from, to) => { for (const n of ['class', 'style']) if (from && from.hasAttribute(n)) to.setAttribute(n, from.getAttribute(n)); };
    const a = d.createElement('a');
    a.setAttribute('href', '#' + anchor);
    copy(like, a);
    a.textContent = title;
    const item = like ? itemOf(like, nav) : null;
    if (!item || item === like) return a;
    const li = d.createElement(item.localName);
    copy(item, li);
    li.append(a);
    return li;
  }

  /**
   * Make one navigation bar (a model element) match the pages: drop the links of pages that are gone, add a link
   * for each page that has none, put the pages' links in the pages' order. Nothing else in the bar is touched.
   * With `dry` nothing is changed. Returns whether there is (was) something to change.
   * `known` (during an AI run only): the data-he-ids of the links that were there when the run began or at its last
   * sync. A page with more than one link keeps those; of the links written since it keeps the first, and only when
   * the page had none. `out.dupes` counts the links removed that way.
   */
  function fixNav(nav, pages, gone, dry, known, out) {
    const anchors = pages.map(anchorOf);
    let changed = false;
    const first = new Map(); // anchor -> its first link in the bar
    const all = new Map(); // anchor -> all its links in the bar
    let last = null;
    for (const a of Array.from(nav.querySelectorAll('a[href]'))) {
      const an = linkAnchor(a);
      if (!an) continue;
      if (anchors.includes(an)) {
        if (!all.has(an)) all.set(an, []);
        all.get(an).push(a);
      } else if (gone.has(an)) {
        if (dry) return true;
        itemOf(a, nav).remove();
        changed = true;
      }
    }
    for (const [an, links] of all) {
      let keep = links;
      if (known && links.length > 1) {
        const old = links.filter((a) => known.has(heId(a)));
        keep = old.length ? old : [links[0]];
        if (keep.length < links.length) {
          if (dry) return true;
          for (const a of links) if (!keep.includes(a)) { itemOf(a, nav).remove(); if (out) out.dupes++; }
          changed = true;
        }
      }
      first.set(an, keep[0]);
      last = keep[keep.length - 1];
    }
    // The link new ones are modelled on: the last link of a page in the bar's own order.
    if (last) last = Array.from(nav.querySelectorAll('a[href]')).filter((a) => first.has(linkAnchor(a))).pop() || last;
    const like = last || Array.from(nav.querySelectorAll('a')).pop() || null;
    for (let i = 0; i < pages.length; i++) {
      const an = anchors[i];
      if (!an || first.has(an)) continue;
      if (dry) return true;
      const item = newItem(nav, like, an, pageTitle(pages[i]));
      let before = null;
      for (let j = i - 1; j >= 0 && !before; j--) if (first.has(anchors[j])) before = itemOf(first.get(anchors[j]), nav);
      let after = null;
      for (let j = i + 1; j < pages.length && !before && !after; j++) if (first.has(anchors[j])) after = itemOf(first.get(anchors[j]), nav);
      if (before) {
        // The white space the bar's source has between two links goes between these two as well.
        const gap = before.previousSibling;
        before.after(item);
        if (gap && gap.nodeType === 3 && !gap.data.trim()) before.after(gap.cloneNode());
      } else if (after) after.before(item);
      else if (like) itemOf(like, nav).after(item);
      else nav.append(item);
      first.set(an, item.localName === 'a' ? item : item.querySelector('a'));
      changed = true;
    }
    // Order: the pages' links trade places among themselves, when they are siblings.
    const want = anchors.filter((an) => first.has(an)).map((an) => itemOf(first.get(an), nav));
    if (want.length > 1 && want.every((it) => it.parentNode === want[0].parentNode)) {
      const have = Array.from(want[0].parentNode.childNodes).filter((n) => want.includes(n));
      if (have.some((n, i) => n !== want[i])) {
        if (dry) return true;
        const marks = have.map((n) => { const c = nav.ownerDocument.createComment(''); n.before(c); return c; });
        marks.forEach((c, i) => c.replaceWith(want[i]));
        changed = true;
      }
    }
    return changed;
  }

  /**
   * Bring the document in step with its pages, writing only what differs, inside the open transaction (or its own):
   * the container's class, an id and a name for each page, the links of every navigation bar, the page CSS.
   * A document without pages loses the page CSS. opts.gone: ids of pages removed just now.
   */
  function sync(opts = {}) {
    if (P.syncing || !HE.doc.model) return false;
    P.syncing = true;
    let changed = false;
    try {
      HE.history.transact(t('更新頁面導覽'), () => {
        const label = { label: t('更新頁面導覽') };
        const b = box();
        const pages = pageEls();
        // A page that was there at the last sync and is gone, however it went: its links go too. After the whole
        // document was swapped the ids seen before prove less, so there a link stays when it still leads somewhere.
        const goneNow = (seen) => {
          const gone = new Set(opts.gone || []);
          if (P.anchors) for (const a of P.anchors) if (!seen.has(a) && !(P.replaced && idTaken(a))) gone.add(a);
          for (const a of seen) gone.delete(a);
          return gone;
        };
        const fixNavs = (gone) => {
          const known = HE.ai && HE.ai.busy ? P.aiLinks : null;
          for (const nav of navEls()) {
            if (!fixNav(nav, pages, gone, true, known)) continue;
            HE.ops.mutate(heId(nav), (m) => { fixNav(m, pages, gone, false, known, P); }, label);
            changed = true;
          }
        };
        if (!pages.length) {
          // The last page went (the Delete key, or the container itself): no link of a page is left behind.
          fixNavs(goneNow(new Set()));
          if (HE.ops.getHeadStyle(STYLE_KEY)) { HE.ops.setHeadStyle(STYLE_KEY, '', label); changed = true; }
          P.anchors = new Set();
          P.replaced = false;
          return;
        }
        if (!b.classList.contains('tpg')) {
          HE.ops.setClasses(heId(b), ((b.getAttribute('class') || '') + ' tpg').trim(), label);
          changed = true;
        }
        const seen = new Set();
        for (const p of pages) {
          const attrs = {};
          let a = anchorOf(p);
          if (!a || /\s/.test(a) || seen.has(a)) { a = anchorFor(pageTitle(p), seen, pages.indexOf(p) + 1); attrs.id = a; }
          seen.add(a);
          if (!(p.getAttribute(TITLE) || '').trim()) attrs[TITLE] = pageTitle(p);
          if (Object.keys(attrs).length) { HE.ops.setAttr(heId(p), attrs, label); changed = true; }
        }
        fixNavs(goneNow(seen));
        const css = buildCss(pages.map(anchorOf));
        if (HE.ops.getHeadStyle(STYLE_KEY) !== css) { HE.ops.setHeadStyle(STYLE_KEY, css, label); changed = true; }
        P.anchors = seen;
        P.replaced = false;
        // What is in the bars now is in step: a link written from here on is the one that goes when it doubles one of these.
        if (P.aiLinks) P.aiLinks = navLinksNow();
      });
    } finally {
      P.syncing = false;
    }
    paint();
    return changed;
  }

  function anchorsNow() { return HE.doc.model ? new Set(pageEls().map(anchorOf).filter(Boolean)) : null; }

  /** The data-he-ids of every link the navigation bars hold now. */
  function navLinksNow() {
    const ids = new Set();
    for (const nav of navEls()) for (const a of nav.querySelectorAll('a[href]')) if (a.hasAttribute(ID)) ids.add(heId(a));
    return ids;
  }
  /** How many duplicate page links sync has removed during this AI run since the last call (the AI's tool results say so). */
  function takeDuplicates() {
    const n = P.dupes;
    P.dupes = 0;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* Pages: changes                                                      */
  /* ------------------------------------------------------------------ */

  /** As ready(), for pages. The AI's own tools pass {ai: true}: they run while it is busy. */
  function readyPages(opts) {
    if (!(opts && opts.ai) && HE.ai && HE.ai.busy) { HE.ui.toast(t('AI 助理正在修改文件，請等它完成後再調整頁面'), { type: 'error' }); return false; }
    const c = HE.canvas;
    if (c && c.isEditingText && c.isEditingText()) c.endTextEdit(true);
    return !!HE.doc.model;
  }

  /** wrap: the page's one inner box ({tag, cls}) when the page next to it has one, so that the new page gets the same margins. */
  function pageHTML(tag, cls, anchor, title, text, wrap) {
    const e = HE.util.esc;
    let inner = '<h2>' + e(title) + '</h2><p>' + e(text) + '</p>';
    if (wrap) inner = '<' + wrap.tag + (wrap.cls ? ' class="' + e(wrap.cls) + '"' : '') + '>' + inner + '</' + wrap.tag + '>';
    return '<' + tag + ' class="' + e(cls) + '" id="' + e(anchor) + '" ' + TITLE + '="' + e(title) + '">' + inner + '</' + tag + '>';
  }

  /** The one box that holds everything in a page (a centred column, usually), or null. A second <main> would be wrong: it becomes a div. */
  function innerBox(page) {
    const only = page.children.length === 1 ? page.children[0] : null;
    if (!only || !only.children.length || !/^(main|div|article|section)$/.test(HE.util.tag(only))) return null;
    return { tag: HE.util.tag(only) === 'main' ? 'div' : HE.util.tag(only), cls: only.getAttribute('class') || '' };
  }

  /** The 多頁面 block of the insert panel: a navigation bar and three pages. Their first words follow the interface language. */
  function blockHTML() {
    const e = HE.util.esc;
    const taken = new Set();
    const pages = [
      [t('首頁'), t('這是第 1 頁。用上方的導覽列切換頁面。')],
      [t('關於'), t('在這裡介紹你們是誰、做什麼。')],
      [t('聯絡'), t('在這裡寫下聯絡方式。')],
    ].map(([title, text], i) => {
      const anchor = freeId(BLOCK_ANCHORS[i], taken);
      taken.add(anchor);
      return { title, text, anchor };
    });
    return '<nav class="tpg-nav" data-tpg-nav>' + pages.map((p) => '<a href="#' + e(p.anchor) + '">' + e(p.title) + '</a>').join('') + '</nav>' +
      '<div class="tpg" data-tpg>' + pages.map((p) => pageHTML('section', 'tpg-page', p.anchor, p.title, p.text)).join('') + '</div>';
  }

  function goPage(id) {
    const pages = pageEls();
    const m = pages.find((p) => heId(p) === id);
    if (!m) return false;
    setCurrent(id);
    paint();
    if (HE.mode === 'preview') showInPreview();
    HE.sel.set([id]);
    paintCurrent();
    // After the frame has the change: a new page may still be on its way into it.
    requestAnimationFrame(() => { if (HE.mode === 'edit' && HE.canvas && HE.canvas.scrollIntoView) HE.canvas.scrollIntoView(id); });
    return true;
  }

  const pageNumber = (id) => pageEls().findIndex((p) => heId(p) === id) + 1;

  /** A new page after `afterId` (default: the page shown), with a heading and a paragraph. opts: {title, ai}. */
  function addPage(afterId, opts = {}) {
    if (!readyPages(opts)) return null;
    const pages = pageEls();
    if (!pages.length) return null;
    const ref = (afterId && pages.find((p) => heId(p) === afterId)) || currentEl(pages);
    const title = String(opts.title || '').replace(/\s+/g, ' ').trim() || t('新頁面');
    const shared = Array.from(pages[0].classList).filter((c) => pages.every((m) => m.classList.contains(c)));
    let id = null;
    HE.history.transact(t('新增頁面'), () => {
      const ids = HE.ops.insertHTML(heId(ref), 'after', pageHTML(HE.util.tag(ref), shared.join(' '), anchorFor(title), title, t('在這裡輸入內容'), innerBox(ref)));
      id = (ids && ids[0]) || null;
      if (id) sync();
    });
    if (!id) return null;
    goPage(id);
    HE.ui.status(t('已新增第 {n} 頁', { n: pageNumber(id) }));
    return id;
  }

  function duplicatePage(id, opts = {}) {
    if (!readyPages(opts)) return null;
    const src = pageEls().find((p) => heId(p) === id);
    if (!src) return null;
    let copy = null;
    HE.history.transact(t('複製頁面'), () => {
      const ids = HE.ops.duplicate([id]);
      copy = (ids && ids[0]) || null;
      if (!copy) return;
      // The copy gets an address of its own (news → news-2) before sync looks at the links.
      const base = anchorOf(src).replace(/-\d+$/, '') || 'page';
      HE.ops.setAttr(copy, { id: freeId(base, new Set([anchorOf(src)])), [TITLE]: t('{title} 的副本', { title: pageTitle(src) }) });
      sync();
    });
    if (!copy) return null;
    goPage(copy);
    HE.ui.status(t('已複製成第 {n} 頁', { n: pageNumber(copy) }));
    return copy;
  }

  function removePage(id, opts = {}) {
    if (!readyPages(opts)) return false;
    const pages = pageEls();
    const i = pages.findIndex((p) => heId(p) === id);
    if (i < 0) return false;
    if (pages.length === 1) { HE.ui.toast(t('這是最後 1 個頁面，不能刪除')); return false; }
    const next = heId(pages[i + 1] || pages[i - 1]);
    const gone = anchorOf(pages[i]);
    let ok = false;
    HE.history.transact(t('刪除頁面'), () => {
      ok = !!HE.ops.remove([id]);
      if (ok) sync({ gone: gone ? [gone] : [] });
    });
    if (!ok) return false;
    goPage(next);
    HE.ui.status(t('已刪除第 {n} 頁。按 {key} 可以復原', { n: i + 1, key: HE.ui.kbd('mod+z') }));
    return true;
  }

  function movePage(id, refId, position, opts = {}) {
    if (!readyPages(opts) || id === refId) return false;
    const ids = pageEls().map(heId);
    const i = ids.indexOf(id), j = ids.indexOf(refId);
    if (i < 0 || j < 0) return false;
    const pos = position === 'before' ? 'before' : 'after';
    if ((pos === 'before' && i === j - 1) || (pos === 'after' && i === j + 1)) return false;
    let ok = false;
    HE.history.transact(t('移動頁面'), () => {
      ok = !!HE.ops.move(id, refId, pos);
      if (ok) sync();
    });
    if (!ok) return false;
    goPage(id);
    HE.ui.status(t('已移到第 {n} 頁', { n: pageNumber(id) }));
    return true;
  }

  /** The text of a link becomes `title`: the whole text of a plain link, else its first run of text (an icon stays). */
  function setLinkText(a, title) {
    if (!a.children.length) { if (a.textContent !== title) HE.ops.setText(heId(a), title); return; }
    HE.ops.mutate(heId(a), (m, d) => {
      const walk = d.createTreeWalker(m, 4); // text nodes
      for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.data.trim()) { n.data = title; return; }
    });
  }

  /** A page's name, on the pane and on its links in every navigation bar. Its id (the address) stays. */
  function rename(id, title, opts = {}) {
    if (!readyPages(opts)) return false;
    const m = pageEls().find((p) => heId(p) === id);
    const name = String(title == null ? '' : title).replace(/\s+/g, ' ').trim();
    if (!m || !name) return false;
    const anchor = anchorOf(m);
    HE.history.transact(t('頁面改名'), () => {
      HE.ops.setAttr(id, { [TITLE]: name });
      sync(); // a page without a link gets one, under its new name
      for (const nav of navEls()) {
        for (const a of Array.from(nav.querySelectorAll('a[href]'))) if (anchor && linkAnchor(a) === anchor && a.hasAttribute(ID)) setLinkText(a, name);
      }
    });
    HE.ui.status(t('已改名為「{title}」', { title: name }));
    return true;
  }

  async function renameDialog(id) {
    const m = pageEls().find((p) => heId(p) === id);
    if (!m) return false;
    const value = await HE.ui.prompt(t('頁面的名稱'), { title: t('頁面改名'), value: pageTitle(m), okLabel: t('改名') });
    if (value == null || !value.trim()) return false;
    return rename(id, value);
  }

  /**
   * Turn an ordinary document into a multi-page one: what <body> holds becomes the first page, and a navigation
   * bar goes in front of it. Scripts, styles and the like stay where they are. One undo step. Returns the page's id.
   */
  function convert(opts = {}) {
    if (!readyPages(opts) || box()) return null;
    const body = HE.doc.body;
    const title = t('首頁');
    const anchor = freeId('home');
    let id = null;
    HE.history.transact(t('改成多頁面'), () => {
      HE.ops.mutate(HE.doc.idOf(body), (b, d) => {
        const moved = Array.from(b.childNodes).filter((n) => !(n.nodeType === 1 && NON_VISUAL.has(HE.util.tag(n))));
        const wrap = d.createElement('div');
        wrap.setAttribute('class', 'tpg');
        wrap.setAttribute('data-tpg', '');
        const page = d.createElement('section');
        page.setAttribute('class', 'tpg-page');
        page.setAttribute('id', anchor);
        page.setAttribute(TITLE, title);
        wrap.append(page);
        if (moved.length) moved[0].before(wrap); else b.prepend(wrap);
        page.append(...moved);
        if (!page.children.length) {
          const h2 = d.createElement('h2');
          h2.textContent = title;
          const p = d.createElement('p');
          p.textContent = t('在這裡輸入內容');
          page.append(h2, p);
        }
        const nav = d.createElement('nav');
        nav.setAttribute('class', 'tpg-nav');
        nav.setAttribute('data-tpg-nav', '');
        const a = d.createElement('a');
        a.setAttribute('href', '#' + anchor);
        a.textContent = title;
        nav.append(a);
        wrap.before(nav);
      });
      const made = pageEls()[0];
      id = made ? heId(made) : null;
      sync();
    });
    if (!id) return null;
    setCurrent(id);
    HE.ui.status(t('已改成多頁面。現有的內容是第 1 頁'));
    return id;
  }

  /* ------------------------------------------------------------------ */
  /* Slides or pages: the public calls                                   */
  /* ------------------------------------------------------------------ */

  function go(id) { return isPages() ? goPage(id) : goSlide(id); }
  function add(afterId, opts) { return isPages() ? addPage(afterId, opts) : addSlide(afterId); }
  function duplicate(id, opts) { return isPages() ? duplicatePage(id, opts) : duplicateSlide(id); }
  function remove(id, opts) { return isPages() ? removePage(id, opts) : removeSlide(id); }
  function moveTo(id, refId, position, opts) { return isPages() ? movePage(id, refId, position, opts) : moveSlide(id, refId, position); }

  /** One place earlier (dir -1) or later (+1). */
  function step(id, dir, opts) {
    const ids = isPages() ? pageEls().map(heId) : state().slides.map((s) => s.id);
    const i = ids.indexOf(id);
    const other = ids[i + (dir < 0 ? -1 : 1)];
    if (i < 0 || !other) return false;
    return moveTo(id, other, dir < 0 ? 'before' : 'after', opts);
  }

  /* ------------------------------------------------------------------ */
  /* The pane                                                            */
  /* ------------------------------------------------------------------ */

  function button(icon, label, act) {
    const b = h('button', 'btn icon ghost pg-act', HE.ui.icon(icon, 14));
    b.type = 'button';
    b.title = label;
    b.setAttribute('aria-label', label);
    b.dataset.act = act;
    return b;
  }

  function row(s, i, st) {
    const r = h('div', 'pg-row');
    r.dataset.id = s.id;
    r.setAttribute('role', 'option');
    r.setAttribute('aria-selected', String(s.id === st.current));
    r.setAttribute('aria-label', st.pages ? t('第 {n} 頁：{title}', { n: i + 1, title: s.title }) : t('第 {n} 張：{title}', { n: i + 1, title: s.title }));
    r.tabIndex = s.id === (st.current || st.slides[0].id) ? 0 : -1;
    r.draggable = true;
    const thumb = h('span', 'pg-thumb');
    thumb.style.aspectRatio = String(Math.round(st.ratio * 1000) / 1000);
    if (s.bg) { thumb.style.background = s.bg; thumb.style.color = s.ink; }
    thumb.textContent = String(i + 1);
    let title = h('span', 'pg-title');
    title.textContent = s.title;
    if (st.pages) {
      // The name, the address of the page and a mark on the one the canvas shows.
      const name = h('span', 'pg-name');
      const anchor = h('span', 'pg-anchor mono');
      anchor.textContent = '#' + s.anchor;
      const mark = h('span', 'pg-shown');
      mark.textContent = t('顯示中');
      name.append(title, anchor, mark);
      title = name;
    }
    const acts = h('span', 'pg-acts');
    const up = button('arrow-up', t('上移'), 'up');
    const down = button('arrow-down', t('下移'), 'down');
    up.disabled = i === 0;
    down.disabled = i === st.slides.length - 1;
    const del = button('trash', t('刪除'), 'remove');
    del.disabled = st.slides.length === 1;
    acts.append(up, down);
    if (st.pages) acts.append(button('pencil', t('改名'), 'rename'));
    acts.append(button('duplicate', t('複製'), 'duplicate'), del);
    r.append(thumb, title, acts);
    return r;
  }

  function render() {
    S.dirty = false;
    const pane = S.pane;
    const paged = HE.doc.model ? list() : [];
    // The pages are listed in the shape of the slides, so both lists share their rows and their handlers.
    const st = paged.length
      ? { pages: true, slides: paged.map((p) => ({ id: p.id, title: p.title, anchor: p.anchor, bg: '', ink: '' })), ratio: 1.6, exact: true, current: (paged.find((p) => p.current) || paged[0]).id }
      : state();
    S.last = st;
    const focusId = S.list && S.list.contains(document.activeElement) ? (document.activeElement.closest('.pg-row') || {}).dataset : null;
    pane.textContent = '';
    S.list = null;
    if (!st.slides.length) {
      const empty = h('div', 'pg-empty');
      empty.append(
        h('p', null, t('這份文件不是簡報。')),
        h('p', 'field-help', t('判斷方式：同一個容器裡有 2 個以上的區塊，寬度相同，而且是同一個橫向比例，例如 16:9。')),
        h('p', 'field-help', t('如果你的簡報在手機寬度下沒有列出來，請切換到桌面寬度。')),
      );
      if (HE.doc.model && !box()) {
        const make = h('button', 'btn pg-convert');
        make.type = 'button';
        make.id = 'pg-convert';
        make.textContent = t('把這份文件改成多頁面');
        make.addEventListener('click', () => convert());
        empty.append(make, h('p', 'field-help', t('現有的內容會成為第 1 頁，最前面會加上導覽列。頁面之間用導覽列切換，不需要腳本。')));
      }
      pane.append(empty);
      return;
    }
    const head = h('div', 'pg-head');
    const count = h('span', 'pg-count');
    count.textContent = st.pages ? t('{n} 個頁面', { n: st.slides.length }) : t('{n} 張投影片', { n: st.slides.length });
    const addBtn = h('button', 'btn pg-add', HE.ui.icon('plus', 14) + '<span>' + t('新增', null, 'slide') + '</span>');
    addBtn.type = 'button';
    addBtn.id = 'pg-add';
    addBtn.title = st.pages ? t('在目前這一頁之後新增 1 個頁面') : t('在目前這張之後新增 1 張投影片');
    addBtn.addEventListener('click', () => add());
    head.append(count, addBtn);
    const rows = h('div', 'pg-list');
    rows.setAttribute('role', 'listbox');
    rows.setAttribute('aria-label', st.pages ? t('頁面') : t('投影片'));
    st.slides.forEach((s, i) => rows.append(row(s, i, st)));
    S.list = rows;
    wireList(rows);
    pane.append(head, rows, h('p', 'field-help pg-note', t('拖曳可以調整順序。選取 1 列後，按 {up} 或 {down} 也可以。', { up: HE.ui.kbd('alt+up'), down: HE.ui.kbd('alt+down') })));
    if (st.pages) pane.append(h('p', 'field-help pg-note', t('畫布一次顯示 1 頁。新增、改名、刪除或移動頁面後，導覽列的連結會跟著更新。')));
    if (!st.exact) pane.append(h('p', 'field-help pg-note', t('在目前的寬度，這些頁面不是同一個比例。這裡仍然列出同一個容器裡的頁面。')));
    if (focusId && focusId.id) {
      const again = rows.querySelector('.pg-row[data-id="' + focusId.id + '"]');
      if (again) again.focus();
    }
  }

  const rowOf = (el) => (el && el.closest ? el.closest('.pg-row') : null);

  function focusRow(id) {
    // The list is drawn again after every change: look the row up when it is there.
    setTimeout(() => {
      if (S.dirty) render();
      const r = S.list && S.list.querySelector('.pg-row[data-id="' + id + '"]');
      if (r) r.focus();
    }, 0);
  }

  function clearDrop(list) {
    for (const r of list.querySelectorAll('.is-drop-before, .is-drop-after')) r.classList.remove('is-drop-before', 'is-drop-after');
  }

  function wireList(list) {
    list.addEventListener('click', (e) => {
      const r = rowOf(e.target);
      if (!r) return;
      const id = r.dataset.id;
      const act = e.target.closest('[data-act]');
      if (!act) { go(id); return; }
      if (act.dataset.act === 'up') { if (step(id, -1)) focusRow(id); }
      else if (act.dataset.act === 'down') { if (step(id, 1)) focusRow(id); }
      else if (act.dataset.act === 'duplicate') { const c = duplicate(id); if (c) focusRow(c); }
      else if (act.dataset.act === 'rename') renameDialog(id).then((ok) => { if (ok) focusRow(id); });
      else if (act.dataset.act === 'remove') remove(id);
    });
    list.addEventListener('keydown', (e) => {
      const r = rowOf(e.target);
      if (!r || e.target !== r || e.isComposing) return;
      const id = r.dataset.id;
      const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (dir && e.altKey) { e.preventDefault(); if (step(id, dir)) focusRow(id); return; }
      if (dir) {
        e.preventDefault();
        const other = dir < 0 ? r.previousElementSibling : r.nextElementSibling;
        if (other) { other.focus(); go(other.dataset.id); }
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(id); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(id); }
    });
    list.addEventListener('dragstart', (e) => {
      const r = rowOf(e.target);
      if (!r) return;
      S.dragId = r.dataset.id;
      e.dataTransfer.effectAllowed = 'move';
      // Firefox starts a drag only when it carries data.
      try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* nothing to carry */ }
      r.classList.add('is-dragging');
    });
    list.addEventListener('dragover', (e) => {
      const r = rowOf(e.target);
      if (!S.dragId || !r) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const box = r.getBoundingClientRect();
      const before = e.clientY < box.top + box.height / 2;
      clearDrop(list);
      if (r.dataset.id !== S.dragId) r.classList.add(before ? 'is-drop-before' : 'is-drop-after');
    });
    list.addEventListener('dragleave', (e) => { if (!list.contains(e.relatedTarget)) clearDrop(list); });
    list.addEventListener('drop', (e) => {
      const r = rowOf(e.target);
      if (!S.dragId) return;
      e.preventDefault();
      e.stopPropagation();
      const id = S.dragId;
      S.dragId = null;
      if (!r) return;
      const box = r.getBoundingClientRect();
      moveTo(id, r.dataset.id, e.clientY < box.top + box.height / 2 ? 'before' : 'after');
    });
    list.addEventListener('dragend', () => {
      S.dragId = null;
      clearDrop(list);
      for (const r of list.querySelectorAll('.is-dragging')) r.classList.remove('is-dragging');
    });
  }

  function paintCurrent() {
    if (!S.list || S.dirty) return;
    if (S.last && S.last.pages) {
      for (const r of S.list.querySelectorAll('.pg-row')) r.setAttribute('aria-selected', String(r.dataset.id === P.cur));
      return;
    }
    const sel = HE.sel.primary ? HE.doc.byId(HE.sel.primary) : null;
    for (const r of S.list.querySelectorAll('.pg-row')) {
      const m = HE.doc.byId(r.dataset.id);
      r.setAttribute('aria-selected', String(!!(sel && m && m.contains(sel))));
    }
  }

  /** History closer, and after each tool of an AI run: whatever changed the pages, their links and CSS follow in the same undo step. */
  function closer() {
    if (!P.syncing && HE.doc.model) sync();
  }

  function init() {
    S.pane = document.getElementById('pages-pane');
    HE.history.addCloser(closer);
    const shown = () => !!S.pane && HE.ui.currentTab('left') === 'pages';
    const later = HE.util.debounce(() => { if (shown()) render(); }, 80);
    const changed = () => { S.dirty = true; later(); };
    HE.on('doc:loaded', () => { S.boxKnown = false; S.boxId = ''; P.cur = null; P.prev = null; P.anchors = anchorsNow(); P.replaced = false; changed(); });
    // The whole document was swapped inside one undo step (編輯整份 HTML, the AI's replace_document): the pages seen
    // before are still the ones to compare with, so a page the new source leaves out loses its links (sync, with
    // P.replaced). An undo or a redo across such a step reads the pages afresh (doc:changed follows).
    HE.on('doc:replaced', (data) => {
      S.boxKnown = false;
      if (data && data.history) P.anchors = null; else P.replaced = true;
      // Every element has a new data-he-id: the links the new document came with count as there before the run.
      if (P.aiLinks) P.aiLinks = navLinksNow();
      changed();
    });
    HE.on('ai:busy', (data) => { P.aiLinks = data && data.busy && HE.doc.model ? navLinksNow() : null; P.dupes = 0; });
    HE.on('doc:changed', (data) => {
      if (data && data.history) { P.anchors = anchorsNow(); P.replaced = false; }
      // An AI run keeps one transaction open across its tools: pages it wrote get their links and CSS now.
      else if (data && data.partial && HE.history.active) closer();
      followSelection();
      paint();
      changed();
    });
    HE.on('history:changed', changed);
    HE.on('canvas:ready', (p) => {
      paint();
      if (HE.mode === 'preview') showInPreview();
      changed();
      // The device buttons change the frame's width, and with it whether the slides keep one ratio.
      const d = (p && p.doc) || HE.live.doc;
      const win = d && d.defaultView;
      if (win) win.addEventListener('resize', changed);
    });
    HE.on('live:headstyle', (data) => { if (data && data.key === STYLE_KEY) paint(); });
    HE.on('mode:changed', () => {
      if (HE.mode === 'edit') adoptPreviewPage();
      paint();
      if (HE.mode === 'preview') showInPreview();
      paintCurrent();
    });
    HE.on('selection:changed', () => {
      if (followSelection()) paint();
      paintCurrent();
    });
    HE.on('tab:changed', ({ group, name }) => { if (group === 'left' && name === 'pages' && S.pane) render(); });
    if (shown()) render();
  }

  HE.pages = { init, findDeck, state, mode, list, add, duplicate, remove, step, moveTo, go, rename, convert, sync, takeDuplicates, freeze, blockHTML };
})();
