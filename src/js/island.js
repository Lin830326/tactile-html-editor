/* Tactile — island.js: the floating island, one group of pill buttons fixed to a corner of the window.
 *
 * It needs no script: a link is an <a>, a small panel is a popover its button opens, and back-to-top is a link to "#".
 *   <div class="tfi" data-tfi data-tfi-pos="br" data-tfi-space role="group" aria-label="…">
 *     <button class="tfi-btn" type="button" popovertarget="tfi-panel-1">…</button>
 *     <a class="tfi-btn" href="mailto:you@example.com">…</a>
 *     <a class="tfi-btn" href="#" data-tfi-top>…</a>
 *     <div class="tfi-panel" id="tfi-panel-1" popover data-tfi-panel>…</div>
 *   </div>
 * The island is a child of <body>, one per document. The editor keeps <style data-he-style="island"> and the ids of
 * the panels in step with it (sync, which also runs as a history closer, so whatever wrote the island gets them in
 * the same undo step). In the edit frame a panel is closed; an editor-only <style> there shows the one being edited.
 *
 *   HE.island = {init, get(), holds(el), create(), setPosition(pos), setSpace(on), setColors({bg, ink}), addButton(kind, opts),
 *                updateButton(id, {label, href, page}), removeButton(id), moveButton(id, dir), showPanel(id|null),
 *                sync(), blockHTML()}
 */
(function () {
  'use strict';
  const HE = window.HE;
  const ID = HE.ID_ATTR;
  const t = HE.t;

  const BOX = '[data-tfi]';
  const PANEL = '[data-tfi-panel]';
  const STYLE_KEY = 'island';
  const LIVE_CSS_ID = '__he_island_css';
  const POSITIONS = ['br', 'bl', 'tr', 'tl'];
  const KINDS = ['link', 'panel', 'top'];
  const SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);
  const SAMPLE_MAIL = 'mailto:you@example.com';
  const SAMPLE_URL = 'https://example.com/';
  const LABEL_MAX = 60;

  const HEAD_NOTE = '/* Tactile 浮動島：依文件中 data-tfi 的元素自動產生，請在編輯器選取浮動島後，在「設計」分頁修改。 */'; // i18n-ok: written into the document's CSS
  const HEAD_NOTE_HANS = '/* Tactile 浮动岛：根据文档中 data-tfi 的元素自动生成，请在编辑器选中浮动岛后，在“设计”标签页中修改。 */'; // i18n-ok: written into the document's CSS
  const HEAD_NOTE_EN = '/* Tactile floating island: generated for the element with data-tfi. Select the island in the editor and change it under Design. */';

  const edge = (px, side) => 'calc(' + px + 'px + env(safe-area-inset-' + side + ', 0px))';
  /** The corner an island sits in, and where its panels open: beside it, toward the middle of the window. */
  function cornerCss(pos) {
    const top = pos[0] === 't', left = pos[1] === 'l';
    const sel = '[data-tfi][data-tfi-pos="' + pos + '"]';
    const inset = (px) => [top ? edge(px, 'top') : 'auto', left ? 'auto' : edge(16, 'right'), top ? 'auto' : edge(px, 'bottom'), left ? edge(16, 'left') : 'auto'].join(' ');
    return [
      sel + ' { inset: ' + inset(16) + '; justify-content: ' + (left ? 'flex-start' : 'flex-end') + '; }',
      sel + ' [data-tfi-panel] { inset: ' + inset(76) + '; }',
    ];
  }
  /** Where anchor positioning works, a panel sits 12px from the island itself, however many rows its buttons take. */
  function anchorCss(pos) {
    const top = pos[0] === 't', left = pos[1] === 'l';
    const gap = (side) => 'calc(anchor(' + side + ') + 12px)';
    const sel = pos === 'br' ? '[data-tfi]' : '[data-tfi][data-tfi-pos="' + pos + '"]';
    return sel + ' [data-tfi-panel] { inset: ' + [top ? gap('bottom') : 'auto', left ? 'auto' : 'anchor(right)', top ? 'auto' : gap('top'), left ? 'anchor(left)' : 'auto'].join(' ') + '; }';
  }
  const SPACE_H = 88; // px: the room data-tfi-space leaves under the page for one row of buttons
  const SPACE_SEL = ':root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after';
  // The layout and the colours have ordinary weight: a page's own `a { color: … }` or `h3 { color: … }` must not take the
  // text of a button or of a panel away from its background. The rest of the look sits inside :where(), which gives it
  // no weight, so any rule of the page wins.
  const CSS_LINES = [
    '[data-tfi] { position: fixed; z-index: 1000; inset: auto ' + edge(16, 'right') + ' ' + edge(16, 'bottom') + ' auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; box-sizing: border-box; max-width: calc(100vw - 32px); margin: 0; }',
    '[data-tfi] [data-tfi-panel] { position: fixed; inset: auto ' + edge(16, 'right') + ' ' + edge(76, 'bottom') + ' auto; box-sizing: border-box; width: min(360px, calc(100vw - 32px)); max-height: 70vh; margin: 0; overflow: auto; }',
    '[data-tfi] .tfi-btn { background: var(--tfi-bg, #1f2328); color: var(--tfi-ink, #fff); text-decoration: none; }',
    '[data-tfi] [data-tfi-panel] { background: #fff; color: #1f2328; }',
    '[data-tfi] [data-tfi-panel] :where(h1, h2, h3, h4, h5, h6, p, li, strong, em, small, span) { color: inherit; }',
  ].concat(cornerCss('bl'), cornerCss('tr'), cornerCss('tl'), [
    ':where(.tfi) { font: 500 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }',
    ':where(.tfi-btn) { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px; padding: 0 18px; border: 1px solid rgb(127 127 127 / .35); border-radius: 999px; box-shadow: 0 4px 16px rgb(0 0 0 / .2); font: inherit; white-space: nowrap; cursor: pointer; }',
    ':where(.tfi-panel) { padding: 16px 20px; border: 1px solid rgb(127 127 127 / .35); border-radius: 16px; box-shadow: 0 12px 40px rgb(0 0 0 / .25); font-size: 15px; font-weight: 400; line-height: 1.6; }',
    ':where(.tfi-panel) > :where(:first-child) { margin-top: 0; }',
    ':where(.tfi-panel) > :where(:last-child) { margin-bottom: 0; }',
    // Progressive: without anchor positioning the panel keeps its place 76px from the edge, right for one row of buttons.
    '@supports (anchor-name: --a) { [data-tfi] { anchor-name: --tfi; } [data-tfi] [data-tfi-panel] { position-anchor: --tfi; } ' + POSITIONS.map(anchorCss).join(' ') + ' }',
    // data-tfi-space on an island at the bottom: room after the last content, so the buttons cover nothing at the end of the page.
    SPACE_SEL + ' { content: ""; display: block; height: calc(' + SPACE_H + 'px + env(safe-area-inset-bottom, 0px)); }',
    '@media print { [data-tfi] { display: none; } ' + SPACE_SEL + ' { display: none; } }',
    '@supports not selector(:popover-open) { [data-tfi-panel] { display: none; } }',
  ]);

  // forced: the data-he-id of the panel showPanel asked for; it lasts until the selection changes.
  const S = { syncing: false, forced: null };

  /* ------------------------------------------------------------------ */
  /* Reading                                                             */
  /* ------------------------------------------------------------------ */

  const heId = (el) => (el ? el.getAttribute(ID) : null);
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const attrSel = (v) => '"' + String(v).replace(/["\\]/g, '\\$&') + '"';

  function islands() {
    const b = HE.doc.model ? HE.doc.body : null;
    return b ? Array.from(b.querySelectorAll(BOX)).filter((e) => e.hasAttribute(ID)) : [];
  }
  /** The island of the document (the first, when a paste left a second one), as a model element. */
  function box() { return islands()[0] || null; }
  function buttonsOf(isl) {
    return Array.from(isl.querySelectorAll('.tfi-btn')).filter((b) => b.hasAttribute(ID) && !b.closest(PANEL));
  }
  function panelsOf(isl) {
    return Array.from(isl.querySelectorAll(PANEL)).filter((p) => p.hasAttribute(ID));
  }
  function kindOf(btn) {
    if (btn.hasAttribute('popovertarget')) return 'panel';
    return btn.hasAttribute('data-tfi-top') ? 'top' : 'link';
  }
  function panelOf(isl, btn) {
    const want = (btn.getAttribute('popovertarget') || '').trim();
    return (want && panelsOf(isl).find((p) => p.getAttribute('id') === want)) || null;
  }
  function pageAnchors() {
    return HE.pages && typeof HE.pages.list === 'function' ? HE.pages.list().map((p) => p.anchor).filter(Boolean) : [];
  }
  function fragmentOf(href) {
    const s = String(href || '').trim();
    if (!s.startsWith('#') || s.length < 2) return '';
    try { return decodeURIComponent(s.slice(1)); } catch (e) { return s.slice(1); }
  }
  const posOf = (isl) => (POSITIONS.includes(isl.getAttribute('data-tfi-pos')) ? isl.getAttribute('data-tfi-pos') : 'br');

  /**
   * The island as the panels show it, or null: {id, pos, space (it leaves room at the end of the page), bg, ink (as written on it, '' = the default), multipage,
   * buttons: [{id, kind: 'link'|'panel'|'top', label, href, page (the fragment of the page a link opens, else ''),
   * panel (the panel's HTML id), panelId (its data-he-id)}]}.
   */
  function get() {
    const isl = box();
    if (!isl) return null;
    const anchors = pageAnchors();
    return {
      id: heId(isl),
      pos: posOf(isl),
      space: isl.hasAttribute('data-tfi-space'),
      bg: isl.style ? isl.style.getPropertyValue('--tfi-bg').trim() : '',
      ink: isl.style ? isl.style.getPropertyValue('--tfi-ink').trim() : '',
      multipage: anchors.length > 0,
      buttons: buttonsOf(isl).map((b) => {
        const kind = kindOf(b);
        const href = kind === 'panel' ? '' : (b.getAttribute('href') || '').trim();
        const frag = kind === 'link' ? fragmentOf(href) : '';
        const p = kind === 'panel' ? panelOf(isl, b) : null;
        return {
          id: heId(b), kind, label: clean(b.textContent), href, page: frag && anchors.includes(frag) ? frag : '',
          panel: kind === 'panel' ? (b.getAttribute('popovertarget') || '').trim() : '', panelId: heId(p),
        };
      }),
    };
  }

  /** A model element is the island or inside it. */
  function holds(el) {
    const isl = box();
    return !!(isl && el && el.nodeType === 1 && isl.contains(el));
  }

  /* ------------------------------------------------------------------ */
  /* The generated CSS and the panels' ids                               */
  /* ------------------------------------------------------------------ */

  /** The note follows the document's language, not the interface's (the rule of pages.js). */
  function headNote() {
    const lang = (HE.doc.model && HE.doc.model.documentElement.getAttribute('lang')) || '';
    if (/^zh-(hans|cn|sg)/i.test(lang)) return HEAD_NOTE_HANS;
    return !lang || /^zh/i.test(lang) ? HEAD_NOTE : HEAD_NOTE_EN;
  }
  function buildCss() { return [headNote()].concat(CSS_LINES).join('\n'); }

  function firstWithId(a) { return HE.doc.model.querySelector('[id=' + attrSel(a) + ']'); }
  /** tfi-panel-1, or the first number that no element of the document has. */
  function freePanelId(taken) {
    for (let n = 1; ; n++) {
      const a = 'tfi-panel-' + n;
      if (!(taken && taken.has(a)) && !firstWithId(a)) return a;
    }
  }

  /**
   * Give each panel of one island an id of its own, and point its button at it. A panel keeps its id when it is the
   * first element of the document that has it. Otherwise it gets a free one, and with it go: of the buttons that
   * named the old id, the one in the same place among them as the panel among the panels of that id (the first panel
   * keeps the first button); for a panel that had no id, the next button whose target names nothing.
   * A panel no button points at stays as it is. Returns whether something was written.
   */
  function fixPanels(isl, label) {
    const panels = panelsOf(isl);
    if (!panels.length) return false;
    const openers = buttonsOf(isl).filter((b) => b.hasAttribute('popovertarget'));
    const was = new Map(openers.map((b) => [b, (b.getAttribute('popovertarget') || '').trim()]));
    const stray = openers.filter((b) => !was.get(b) || !firstWithId(was.get(b)));
    const seen = new Map(); // an id -> how many panels of this island had it so far
    const taken = new Set();
    let changed = false;
    for (const p of panels) {
      const cur = (p.getAttribute('id') || '').trim();
      const nth = seen.get(cur) || 0;
      seen.set(cur, nth + 1);
      if (cur && !/\s/.test(cur) && !taken.has(cur) && firstWithId(cur) === p) { taken.add(cur); continue; }
      const id = freePanelId(taken);
      taken.add(id);
      HE.ops.setAttr(heId(p), { id }, label);
      changed = true;
      const mine = cur ? openers.filter((b) => was.get(b) === cur)[nth] : stray.shift();
      if (mine) HE.ops.setAttr(heId(mine), { popovertarget: id }, label);
    }
    return changed;
  }

  /**
   * Bring the document in step with its island, writing only what differs, inside the open transaction (or its own):
   * the island as a child of <body>, an id of its own for every panel, the island CSS. A document without an island
   * loses the island CSS.
   */
  function sync() {
    if (S.syncing || !HE.doc.model) return false;
    S.syncing = true;
    let changed = false;
    try {
      HE.history.transact(t('更新浮動島'), () => {
        const label = { label: t('更新浮動島') };
        const all = islands();
        if (!all.length) {
          if (HE.ops.getHeadStyle(STYLE_KEY)) { HE.ops.setHeadStyle(STYLE_KEY, '', label); changed = true; }
          return;
        }
        const b = HE.doc.body;
        // Inside a page of a multi-page document it would show on that page only, and a transformed box would carry it along.
        if (all[0].parentElement !== b && HE.ops.move(heId(all[0]), HE.doc.idOf(b), 'append', label)) changed = true;
        for (const isl of all) if (fixPanels(isl, label)) changed = true;
        const css = buildCss();
        if (HE.ops.getHeadStyle(STYLE_KEY) !== css) { HE.ops.setHeadStyle(STYLE_KEY, css, label); changed = true; }
      });
    } finally {
      S.syncing = false;
    }
    paint();
    return changed;
  }

  /* ------------------------------------------------------------------ */
  /* The edit frame                                                      */
  /* ------------------------------------------------------------------ */

  /** The panel to keep open while editing: the one the selection is in or whose button is selected, else the one showPanel asked for. */
  function shownPanel() {
    const isl = box();
    if (!isl) return null;
    const sel = HE.sel.primary ? HE.doc.byId(HE.sel.primary) : null;
    if (sel && isl.contains(sel)) {
      const p = sel.closest(PANEL) || (sel.closest('[popovertarget]') ? panelOf(isl, sel.closest('[popovertarget]')) : null);
      if (p && p.hasAttribute(ID)) return heId(p);
    }
    const forced = S.forced ? HE.doc.byId(S.forced) : null;
    return forced && isl.contains(forced) ? S.forced : null;
  }

  /**
   * Edit mode: a popover stays closed (clicks do nothing there), so an editor-only <style> shows the panel being
   * edited, in the place the document's CSS gives it. Preview: no such style; the buttons open and close the panels.
   * Only the live frame is touched; the model and an export never see it.
   */
  function paint() {
    const d = HE.live && HE.live.doc;
    if (!d || !d.head || !HE.doc.model) return;
    const id = HE.mode === 'edit' ? shownPanel() : null;
    let el = d.getElementById(LIVE_CSS_ID);
    if (!id) { if (el) el.remove(); return; }
    const css = '[data-tfi-panel][' + ID + '="' + id + '"] { display: block !important; }';
    if (!el) {
      el = d.createElement('style');
      el.id = LIVE_CSS_ID;
      el.setAttribute('data-he-editor', 'island');
      d.head.append(el);
    }
    if (el.textContent !== css) el.textContent = css;
  }

  /** Back in edit mode: a panel the preview left open closes, or it would stay over the page with nothing to close it. */
  function closeOpened() {
    const d = HE.live && HE.live.doc;
    if (!d || !d.body) return;
    for (const p of d.querySelectorAll('[popover]')) {
      try { if (p.matches(':popover-open')) p.hidePopover(); } catch (e) { /* a browser without popovers */ }
    }
  }

  /** Keep a panel open in the edit frame: `id` is its data-he-id or its button's. null lets it close. The next selection decides again. */
  function showPanel(id) {
    const isl = box();
    const m = id && isl ? HE.doc.byId(id) : null;
    let p = null;
    if (m && isl.contains(m)) p = m.matches(PANEL) ? m : panelOf(isl, m);
    S.forced = heId(p);
    paint();
    return !!p || id == null;
  }

  /* ------------------------------------------------------------------ */
  /* Changes                                                             */
  /* ------------------------------------------------------------------ */

  /** False (with a message) while a change may not be made. Commits the text being typed first. */
  function ready() {
    if (HE.ai && HE.ai.busy) { HE.ui.toast(t('AI 助理正在修改文件，請等它完成後再調整浮動島'), { type: 'error' }); return false; }
    const c = HE.canvas;
    if (c && c.isEditingText && c.isEditingText()) c.endTextEdit(true);
    return !!HE.doc.model;
  }

  /**
   * The address a link button may open, as it is stored, or '' when it may not: only http, https, mailto and tel.
   * A bare e-mail address becomes a mailto link.
   */
  function linkHref(raw) {
    let s = String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (/^[^\s@:/?#]+@[^\s@:/?#]+\.[^\s@:/?#]+$/.test(s)) s = 'mailto:' + s;
    const m = /^([a-z][a-z0-9+.-]*):(.+)$/i.exec(s);
    if (!m || !SCHEMES.has(m[1].toLowerCase()) || HE.util.isScriptUrl('a', 'href', s)) return '';
    if (/^https?$/i.test(m[1])) {
      try { if (!new URL(s).hostname) return ''; } catch (e) { return ''; }
    }
    return s;
  }
  /** The attributes of a link button for an address: another site opens in a new tab. */
  function linkAttrs(href) {
    const out = /^https?:/i.test(href);
    return { href, target: out ? '_blank' : null, rel: out ? 'noopener' : null };
  }
  function badLink() {
    HE.ui.toast(t('這個網址無法使用。按鈕只能連到 https://、http://、mailto: 或 tel: 開頭的網址'), { type: 'error' });
    return false;
  }
  /** opts.page (a page's fragment) or opts.href, as the attributes of a link button; null (after a message) when neither may be used. */
  function targetAttrs(opts) {
    if (opts.page != null && opts.page !== '') {
      const a = String(opts.page).replace(/^#/, '');
      if (!pageAnchors().includes(a)) { HE.ui.toast(t('這份文件沒有「{page}」這個頁面', { page: '#' + a }), { type: 'error' }); return null; }
      return { href: '#' + a, target: null, rel: null };
    }
    const href = linkHref(opts.href);
    if (!href) { badLink(); return null; }
    return linkAttrs(href);
  }

  const e = (s) => HE.util.esc(s);
  const attrsHTML = (attrs) => Object.entries(attrs).filter(([, v]) => v != null).map(([k, v]) => ' ' + k + '="' + e(v) + '"').join('');
  const linkHTML = (label, attrs) => '<a class="tfi-btn"' + attrsHTML(attrs) + '>' + e(label) + '</a>';
  const topHTML = (label) => '<a class="tfi-btn" href="#" data-tfi-top>' + e(label) + '</a>';
  const openerHTML = (label, panel) => '<button class="tfi-btn" type="button" popovertarget="' + e(panel) + '">' + e(label) + '</button>';
  const panelHTML = (panel, inner) => '<div class="tfi-panel" id="' + e(panel) + '" popover data-tfi-panel>' + inner + '</div>';

  /**
   * The 浮動島 block of the insert panel: a helper panel with sample questions, a report link and back-to-top.
   * Its first words follow the interface language. A multi-page document gets no back-to-top: "#" names no page,
   * so the link would go back to the first page.
   */
  function blockHTML() {
    const panel = freePanelId();
    const faq = [
      [t('營業時間是什麼時候？'), t('週一到週五，上午 9 點到下午 6 點。')],
      [t('怎麼聯絡你們？'), t('按「問題回報」寫信給我們，我們會在 2 個工作天內回覆。')],
    ];
    return '<div class="tfi" data-tfi data-tfi-pos="br" data-tfi-space role="group" aria-label="' + e(t('快速功能')) + '">' +
      openerHTML(t('小幫手'), panel) +
      linkHTML(t('問題回報'), linkAttrs(SAMPLE_MAIL)) +
      (pageAnchors().length ? '' : topHTML(t('回到頂端'))) +
      panelHTML(panel, '<h3>' + e(t('常見問題')) + '</h3>' + faq.map(([q, a]) => '<p><strong>' + e(q) + '</strong><br>' + e(a) + '</p>').join('')) +
      '</div>';
  }

  /** Put the island into a document that has none, as the last child of <body>. One undo step. Returns its id (the one already there, if any). */
  function create() {
    if (!ready()) return null;
    const have = box();
    if (have) return heId(have);
    let id = null;
    HE.history.transact(t('插入{label}', { label: t('浮動島') }), () => {
      const ids = HE.ops.insertHTML(null, 'append', blockHTML());
      id = (ids && ids[0]) || null;
      if (id) sync();
    });
    return id;
  }

  function setPosition(pos) {
    const isl = box();
    if (!isl || !POSITIONS.includes(pos) || !ready()) return false;
    const id = heId(isl);
    HE.history.transact(t('修改浮動島的位置'), () => {
      HE.ops.setAttr(id, { 'data-tfi-pos': pos });
      // Offsets a drag on the canvas wrote would keep it out of the corner.
      HE.ops.setStyle(id, { left: '', top: '', right: '', bottom: '', inset: '', translate: '' });
    });
    return true;
  }

  /** Room at the end of the page for an island at the bottom (data-tfi-space), so that it covers no content there. One undo step. */
  function setSpace(on) {
    const isl = box();
    if (!isl || !ready()) return false;
    if (isl.hasAttribute('data-tfi-space') === !!on) return true;
    HE.ops.setAttr(heId(isl), { 'data-tfi-space': on ? '' : null }, { label: t('修改浮動島的留白') });
    return true;
  }

  const validColor = (v) => { try { return !(window.CSS && CSS.supports) || CSS.supports('color', v); } catch (err) { return true; } };

  /** The colours of the buttons, written on the island as --tfi-bg and --tfi-ink. '' takes one back to its default. opts.coalesce as HE.ops. */
  function setColors(colors, opts = {}) {
    const isl = box();
    if (!isl || !colors || !ready()) return false;
    const styles = {};
    for (const [key, prop] of [['bg', '--tfi-bg'], ['ink', '--tfi-ink']]) {
      if (colors[key] == null) continue;
      const v = String(colors[key]).trim();
      if (v && !validColor(v)) return false;
      styles[prop] = v;
    }
    if (!Object.keys(styles).length) return false;
    HE.ops.setStyle(heId(isl), styles, { label: t('修改浮動島的顏色'), coalesce: opts.coalesce });
    return true;
  }

  /**
   * A new button after the last one. kind 'link': opts {label, href | page}; 'panel': opts {label}, with a new panel;
   * 'top': opts {label}, not in a multi-page document. One undo step. Returns the button's id, or null.
   */
  function addButton(kind, opts = {}) {
    const isl = box();
    if (!isl || !KINDS.includes(kind) || !ready()) return null;
    const given = clean(opts.label).slice(0, LABEL_MAX);
    let html = '';
    let panel = '';
    if (kind === 'link') {
      const attrs = targetAttrs(opts.page || opts.href ? opts : { href: SAMPLE_URL });
      if (!attrs) return null;
      html = linkHTML(given || t('新連結'), attrs);
    } else if (kind === 'top') {
      if (pageAnchors().length) { HE.ui.toast(t('多頁面文件不提供「回到頂端」：這個連結會跳回第 1 頁')); return null; }
      html = topHTML(given || t('回到頂端'));
    } else {
      panel = freePanelId();
      html = openerHTML(given || t('小面板'), panel);
    }
    const last = buttonsOf(isl).pop();
    const islId = heId(isl);
    let id = null;
    HE.history.transact(t('新增浮動島按鈕'), () => {
      const ids = last ? HE.ops.insertHTML(heId(last), 'after', html) : HE.ops.insertHTML(islId, 'prepend', html);
      id = (ids && ids[0]) || null;
      if (id && panel) HE.ops.insertHTML(islId, 'append', panelHTML(panel, '<h3>' + e(given || t('小面板')) + '</h3><p>' + e(t('在這裡輸入內容')) + '</p>'));
    });
    return id;
  }

  /** The text of a button becomes `label`: the whole text of a plain one, else its first run of text (an icon stays). */
  function setLabel(m, label) {
    if (!m.children.length) { HE.ops.setText(heId(m), label); return; }
    HE.ops.mutate(heId(m), (el, d) => {
      const walk = d.createTreeWalker(el, 4); // text nodes
      for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.data.trim()) { n.data = label; return; }
      el.append(label);
    });
  }

  /**
   * Change a button: its text (label), and for a link where it leads (href: an http, https, mailto or tel address;
   * or page: the fragment of a page of a multi-page document). False, with a message, for any other address.
   */
  function updateButton(id, change = {}) {
    const isl = box();
    const m = isl && id ? HE.doc.byId(id) : null;
    if (!m || !buttonsOf(isl).includes(m) || !ready()) return false;
    const label = change.label == null ? null : clean(change.label).slice(0, LABEL_MAX);
    let attrs = null;
    if (change.href != null || change.page != null) {
      if (kindOf(m) !== 'link') return false;
      attrs = targetAttrs(change);
      if (!attrs) return false;
    }
    if (label === '' || (label == null && !attrs)) return false;
    HE.history.transact(t('修改浮動島按鈕'), () => {
      if (label != null && label !== clean(m.textContent)) setLabel(m, label);
      if (attrs) HE.ops.setAttr(id, attrs);
    });
    return true;
  }

  /** Remove a button; a panel goes with the button that opens it, unless another button opens it too. */
  function removeButton(id) {
    const isl = box();
    const m = isl && id ? HE.doc.byId(id) : null;
    if (!m || !buttonsOf(isl).includes(m) || !ready()) return false;
    const gone = [id];
    const p = kindOf(m) === 'panel' ? panelOf(isl, m) : null;
    if (p && !buttonsOf(isl).some((b) => b !== m && panelOf(isl, b) === p)) gone.push(heId(p));
    const islId = heId(isl);
    if (!HE.ops.remove(gone, { label: t('刪除浮動島按鈕') })) return false;
    // The selection was in what went: the island takes it, so its settings stay on screen.
    if (!HE.sel.ids.length && HE.doc.byId(islId)) HE.sel.set([islId]);
    return true;
  }

  /** One place earlier (dir -1) or later (+1) among the buttons. */
  function moveButton(id, dir) {
    const isl = box();
    if (!isl || !ready()) return false;
    const ids = buttonsOf(isl).map(heId);
    const i = ids.indexOf(id);
    const other = ids[i + (dir < 0 ? -1 : 1)];
    if (i < 0 || !other) return false;
    return !!HE.ops.move(id, other, dir < 0 ? 'before' : 'after', { label: t('移動浮動島按鈕') });
  }

  /* ------------------------------------------------------------------ */
  /* Wiring                                                              */
  /* ------------------------------------------------------------------ */

  /** History closer, and after each tool of an AI run: whatever wrote the island, its CSS and panel ids follow in the same undo step. */
  function closer() {
    if (!S.syncing && HE.doc.model) sync();
  }

  function init() {
    HE.history.addCloser(closer);
    HE.on('doc:loaded', () => { S.forced = null; });
    HE.on('doc:changed', (data) => {
      // An AI run keeps one transaction open across its tools: an island it wrote gets its CSS now.
      if (data && data.partial && HE.history.active) closer();
      paint();
    });
    HE.on('canvas:ready', paint);
    HE.on('mode:changed', () => {
      if (HE.mode === 'edit') closeOpened();
      paint();
    });
    HE.on('selection:changed', () => { S.forced = null; paint(); });
  }

  HE.island = { init, get, holds, create, setPosition, setSpace, setColors, addButton, updateButton, removeButton, moveButton, showPanel, sync, blockHTML };
})();
