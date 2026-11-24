/* Tactile — canvas.js: the iframe canvas, the selection overlay and all direct manipulation.
 *
 * The iframe is rendered from HE.doc.snapshot() (ids kept) and double-buffered: a new iframe
 * loads hidden on top of the old one and is swapped in on load, so re-renders do not flash.
 * Geometry and computed styles are read from the live document; every committed change goes
 * through HE.ops. The overlay sits exactly over the iframe, so an element's client rect inside
 * the iframe is also its position in the overlay.
 */
(function () {
  'use strict';

  const HE = window.HE;
  const ID = HE.ID_ATTR;
  const util = HE.util;
  const t = HE.t;
  // Between two whole sentences shown one after the other: Chinese sets them solid, English needs a space.
  const SEP = HE.langIsChinese ? '' : ' ';

  const DEVICES = {
    desktop: { width: null, icon: 'desktop', label: t('桌面'), hint: '100%' },
    tablet: { width: 768, icon: 'tablet', label: t('平板'), hint: '768px' },
    phone: { width: 390, icon: 'phone', label: t('手機'), hint: '390px' },
    fold: { width: null, icon: 'fold', label: t('摺疊機'), hint: t('摺起／展開') },
  };
  // Foldable screens in CSS px, as the phone is held (open book-style phones are held landscape).
  // crease: where the fold runs on the open screen. iPhone Duo: WebKit's published Safari 27.1 viewports;
  // Galaxy Z Fold7: measured; the rest are panel px / the Fold7's DPR 2.625, so `estimated` until measured.
  const FOLDABLES = {
    iphoneduo: { label: 'iPhone Duo', folded: { w: 382, h: 618 }, open: { w: 951, h: 620 }, crease: 'vertical' },
    zfold8ultra: { label: 'Galaxy Z Fold8 Ultra', folded: { w: 412, h: 960 }, open: { w: 860, h: 954 }, crease: 'vertical', estimated: true },
    zfold8: { label: 'Galaxy Z Fold8', folded: { w: 476, h: 752 }, open: { w: 933, h: 704 }, crease: 'vertical', estimated: true },
    zflip8: { label: 'Galaxy Z Flip8', folded: { w: 362, h: 400 }, open: { w: 412, h: 960 }, crease: 'horizontal', estimated: true },
    zfold7: { label: 'Galaxy Z Fold7', folded: { w: 412, h: 960 }, open: { w: 750, h: 832 }, crease: 'vertical' },
    pixel11profold: { label: 'Pixel 11 Pro Fold', folded: { w: 444, h: 961 }, open: { w: 755, h: 783 }, crease: 'vertical', estimated: true },
  };
  const FOLD_DEFAULT = 'iphoneduo';
  const DRAG_THRESHOLD = 4;
  const EDITOR_CSS_ID = '__he_editor_css';
  // The edit frame: the editor works on its DOM directly, so it never runs page scripts, except in compat mode.
  // The run frame's flags are copied at load, before any page script could run in this realm.
  const PAGE_SANDBOX = HE.PAGE_SANDBOX;
  const EDIT_SANDBOX = 'allow-same-origin';
  const COMPAT_SANDBOX = 'allow-same-origin ' + PAGE_SANDBOX;
  // WebKit (Safari) runs no event listener in a frame sandboxed without allow-scripts, not even the editor's own:
  // the canvas could not be clicked. Where deafFrames() finds that, the edit frame is made with allow-scripts and a
  // policy as the first thing in its head that refuses every script of the page (elements, handlers, script URLs)
  // and every nested document (a frame inside would inherit allow-scripts; an <object> can hold a page). The policy
  // stays with the document whatever is written into it later. As soon as the frame has loaded, allow-scripts
  // comes off the element: the loaded document keeps hearing, and a page it navigates itself to (a refresh <meta>)
  // is made without scripts, as in the other browsers. See SECURITY.md.
  const GUARD_SANDBOX = 'allow-same-origin allow-scripts';
  const GUARD_CSP = '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; frame-src \'none\'; object-src \'none\'">';
  const REFRESH = /^\s*refresh\s*$/i;
  // Phones and tablets overlay their scrollbars: the page gets the full screen width (and an open foldable's
  // crease stays at the page's centre). Only the page's own scroller: inner overflow boxes keep their scrollbars.
  const NO_PAGE_SCROLLBARS = 'html,body{scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}';
  const RUN_REBUILD_MS = 300;
  const RUN_TITLE = t('頁面預覽（腳本在隔離的框架中執行）');
  // The run frame's own document is a fixed wrapper around the page's frame (both srcdoc, both PAGE_SANDBOX: a
  // nested frame's flags can only add to its parent's). An about:srcdoc page falls back to its parent's base: the
  // wrapper's <base href="about:srcdoc">, out of the page's reach, keeps the editor's URL (on disk: the user's
  // folders and name) out of the page's baseURI even once it removes its own <base>, and '#id' links resolve
  // against about:srcdoc, so they stay in the page. (A blob: page has no such fallback, but in an opaque-origin
  // frame Chrome refuses its '#id' links.)
  const RUN_WRAP_CSS = 'html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}';
  // The wrapper's one script: its page frame's load counter. Every load after the first is the page navigating
  // itself (a reload, a form, a link out), which never loads the run frame itself again. The editor takes the
  // message only from the wrapper's window, and a page cannot post as the wrapper.
  const RUN_NAV_ONLOAD = 'var n=+this.dataset.n+1||1;this.dataset.n=n;if(n>1)parent.postMessage({tactile:"run-nav"},"*")';
  // The one script the editor adds to the page (never to the model or an export). One task after load, in the
  // bubble phase on window, so the page's own handlers decide first (window ones its load handlers add included): a
  // file drag the page did not take is cancelled (the browser would load the file into the frame) and reported to
  // the editor (parent.parent: the wrapper is the page's parent), so it can raise .cv-run-shield and take the drop
  // itself. A drag that started in the page (an image, a link) is the page's own, as fileio's internalDrag is: noted
  // in the capture phase before any page listener, and reset by the next pointer move, since dragend is lost when
  // its source node goes. It sends no file data.
  const RUN_GUARD = '<script>(function(){var w=window,p=w.parent.parent,t=0,own=0;' +
    'w.addEventListener("dragstart",function(){own=1},true);w.addEventListener("dragend",function(){own=0},true);' +
    'w.addEventListener("pointermove",function(){own=0},true);' +
    'function files(e){var y=e.dataTransfer&&e.dataTransfer.types;return !own&&!e.defaultPrevented&&!!y&&Array.prototype.indexOf.call(y,"Files")>=0}' +
    'w.addEventListener("load",function(){setTimeout(function(){' +
    'w.addEventListener("dragover",function(e){if(!files(e))return;e.preventDefault();var n=Date.now();' +
    'if(n-t>=200){t=n;p.postMessage({tactile:"run-filedrag"},"*")}});' +
    'w.addEventListener("drop",function(e){if(!files(e))return;e.preventDefault();p.postMessage({tactile:"run-drop"},"*")})},0)})})()</script>';
  const RUN_SHIELD_MS = 900;
  const RUN_DROP_MSG = t('檔案放在預覽中的頁面上，頁面沒有接收。請再拖一次，或切換到編輯模式。');
  const RUN_NAV_STOP = t('這個頁面一直自行跳轉，已停止執行它的腳本，畫布改為顯示文件本身。按「重新整理畫布」可以再執行一次。');
  const SCRIPT_WARNING = t('這個頁面有部分內容由程式產生，無法直接選取。關閉相容模式即可編輯原始內容。');
  const UNTRUSTED_NOTICE = t('為了安全，這份文件的腳本目前不會執行。允許後，腳本只在預覽中、於隔離的框架裡執行。');
  const EDIT_SHOWS_SOURCE = t('編輯模式顯示頁面的原始內容，頁面腳本在預覽中執行');
  const RUN_IN_PREVIEW = t('頁面腳本會在預覽模式中、於隔離的框架裡執行；編輯模式顯示原始內容。');
  // The isolation promise covers the editor's preview only: an exported file is an ordinary page (see trustConfirm()).
  const TRUST_CONFIRM = t('允許後，這份文件的腳本會在預覽模式中、於隔離的框架裡執行：讀不到這裡儲存的資料（包括 AI 金鑰），也無法操作編輯器或 AI 助理；編輯模式仍顯示原始內容。腳本仍可以開啟彈出視窗和對話框、連線到其他網站，只在文件來源可信任時才允許。');
  const EXPORT_NOTE = t('匯出的檔案一律保留頁面腳本；直接開啟匯出的檔案時，它是一般網頁，腳本不在隔離的框架裡執行。');
  // The same sentence when the editor runs from disk. Chromium gives every file:// page one localStorage: an export
  // opened from disk shares this editor's. The AI keys are not in it (from file:// they stay in memory), nor are the
  // autosaved documents (each tab keeps its own); the other settings are.
  const EXPORT_FILE_NOTE = t('匯出的檔案一律保留頁面腳本；直接開啟匯出的檔案時，它是一般網頁，腳本不在隔離的框架裡執行，而且可能和這個編輯器共用瀏覽器的本機儲存空間（編輯器的設定；自動保存的文件與 AI 金鑰不在裡面）。');
  const COMPAT_CONFIRM = t('相容模式讓這份文件的腳本在編輯時也以編輯器的權限執行：腳本可以讀取這裡儲存的資料（包括 AI 金鑰），可以操作編輯器和 AI 助理，也能改寫自動保存的內容和編輯器的設定（例如 AI 要求送往哪裡）。只在頁面內容必須由腳本產生、而且文件來源完全可信任時才開啟。相容模式只對目前這份文件有效，開啟其他文件或腳本被停止時會自動關閉；但關閉不會還原頁面已經做過的事，頁面的程式也可能繼續執行到重新載入分頁為止。如果文件來源並非完全可信任，關閉後請檢查 AI 設定，並更換 AI 金鑰。');
  // After compat mode: page code may still run in this tab (timers, listeners made in the editor's realm).
  const TAINT_NOTICE = t('相容模式已關閉，但頁面腳本曾以編輯器的權限執行，可能仍在這個分頁中運作。重新載入分頁後才完全恢復隔離。');
  const TAINT_LABEL = t('請重新載入以恢復隔離');
  const TAINT_STATE = t('這個分頁開啟過相容模式，重新載入分頁之前，隔離並不完整。');
  const BUSY_MSG = t('AI 正在修改頁面，請等它完成再編輯。');
  // Replaced and widget elements read as boxes even when their display is inline,
  // so selection never climbs past them (an <img> in a paragraph stays selectable).
  const ATOMIC = new Set(['img', 'svg', 'video', 'audio', 'canvas', 'iframe', 'object', 'embed', 'picture',
    'input', 'select', 'textarea', 'button', 'meter', 'progress', 'math']);
  const SPLIT_TAGS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'div']);
  // Elements whose content model is phrasing only: never offered as a drop container.
  const PHRASING_ONLY = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'button', 'label', 'legend',
    'summary', 'dt', 'caption', 'a', 'span', 'strong', 'em', 'b', 'i', 'u', 'small', 'code']);
  const NON_VISUAL = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript', 'title', 'head', 'base']);
  const TABLE_PARTS = new Set(['thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col']);
  const CELLS = new Set(['td', 'th']);
  const SECTIONS = new Set(['thead', 'tbody', 'tfoot']);
  const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const HANDLE_CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
  const FORMAT_STATES = [['bold', 'bold'], ['italic', 'italic'], ['underline', 'underline'], ['strike', 'strikeThrough']];

  const S = {
    // DOM
    host: null, viewport: null, wrap: null, box: null, deviceLabel: null, overlay: null, crease: null,
    hoverBox: null, hoverTag: null, pBox: null, pLabel: null, pName: null, pDims: null, boxes: [],
    drop: null, ghost: null, shield: null, tbar: null, tf: {}, tbarColor: null, tbarHilite: null, buttons: {}, runLabel: null,
    runShield: null, runShieldTimer: 0,
    // rendering
    frame: null, pending: null, renderToken: 0, renderQueued: false, pendingStale: false, staleRetries: 0,
    // deaf: this browser needs the guarded edit frame; sandboxes: the flags each edit frame was made with
    deaf: false, sandboxes: new WeakMap(),
    resetScroll: false, userScrolled: false, bodyRO: null, ro: null,
    // the isolated run frame (page scripts while previewing); runSrc: the page of the latest build (or the stopped
    // one); runPages: each run frame's page; runStopped: the self-navigation limit stopped that page (no run frame,
    // the document shows) until it changes or is asked for again
    run: null, runPending: null, runToken: 0, runTimer: 0, runNavs: [], runSrc: '', runPages: new WeakMap(), runStopped: false,
    keysHinted: false,
    // what a plain drag does to an element in the page flow: 'flow' reorders it, 'free' shifts it with `translate`;
    // Alt gives the other one for that drag. moveHinted: the reorder drag has said so once since the tab loaded
    moveMode: 'flow', moveHinted: false, holding: false,
    // settings; compat is per document and session, never stored; compatBits: the scripts it was confirmed over
    device: 'desktop', fold: null, folded: false, scripts: true, compat: false, compatBits: null,
    // tainted: compat mode was on in this tab (until it reloads); taintAI: the AI settings when it first went on
    tainted: false, taintAI: null, taintToasts: [],
    // overlay state
    hoverId: null, highlightId: null, flashes: [], raf: 0, asRaf: 0,
    // text editing (editDirty: the user changed the text, not only a page script)
    editingId: null, editEl: null, editModel: null, editSaved: null, savedRange: null, modalOpen: false, editDirty: false,
    // the current pointer gesture (press / move / resize / insert)
    g: null, lastPress: null,
    warnedDoc: false, previewToastAt: 0, busyToastAt: 0, trustNotice: false, loadSeq: 0,
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function h(tag, cls, html) { return HE.ui.h(tag, cls, html); }
  function idOf(el) { return el && el.getAttribute ? el.getAttribute(ID) : null; }
  function aiBusy() { return !!(HE.ai && HE.ai.busy); }
  /** True (after telling the user) while the AI is running: edits would join its undo step. */
  function refuseBusy() {
    if (!aiBusy()) return false;
    const now = Date.now();
    if (now - S.busyToastAt > 2000) { S.busyToastAt = now; HE.ui.toast(BUSY_MSG); }
    return true;
  }
  /** The page's scripts may run (in the run frame while previewing, and in compat mode): the preference is on and the document trusted. */
  function scriptsAllowed() { return S.scripts && !!HE.doc.trusted; }
  /** Compat mode: the scripts also run in the edit frame, with the editor's origin. Never in the Artifact (window.claude). */
  function compatOn() { return S.compat && scriptsAllowed() && !HE.env.inArtifact; }
  /** The edit frame is the guarded kind (see GUARD_SANDBOX): this browser needs it, and compat mode is off. */
  function guarded() { return S.deaf && !compatOn(); }
  function editSandbox() { return compatOn() ? COMPAT_SANDBOX : S.deaf ? GUARD_SANDBOX : EDIT_SANDBOX; }
  /** Whether a same-origin frame without allow-scripts hears nothing here. An about:blank frame, so the answer is immediate. */
  function deafFrames() {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', EDIT_SANDBOX);
    f.hidden = true;
    let heard = false;
    try {
      document.body.appendChild(f);
      const d = f.contentDocument;
      d.addEventListener('he-probe', () => { heard = true; });
      d.dispatchEvent(new Event('he-probe'));
    } catch (e) { heard = true; } // no answer: keep the frame without scripts
    f.remove();
    return !heard;
  }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function px(n) { return Math.round(n) + 'px'; }
  function styleOf(el) {
    try { return el.ownerDocument.defaultView.getComputedStyle(el); } catch (e) { return null; }
  }
  /** Nearest identified ancestor-or-self of a live node. */
  function identified(node) {
    const el = node && node.nodeType === 3 ? node.parentElement : node;
    return el && el.closest ? el.closest('[' + ID + ']') : null;
  }
  function isPageRoot(el) {
    const d = HE.live.doc;
    return !el || !d || el === d.documentElement || el === d.body || el === d.head;
  }
  /** Climb out of inline phrasing (a <strong> inside a paragraph selects the paragraph). */
  function climb(el) {
    const d = HE.live.doc;
    while (el && !isPageRoot(el)) {
      if (ATOMIC.has(util.tag(el))) break;
      const parent = identified(el.parentElement);
      if (!parent || parent === d.body || parent === d.documentElement) break;
      const s = styleOf(el);
      if (!s || s.display !== 'inline') break;
      el = parent;
    }
    return el;
  }
  /** Selection target for a pointer target: id or null for html/body. */
  function pickId(target) {
    const el = identified(target);
    if (!el || isPageRoot(el)) return null;
    return idOf(climb(el));
  }
  function frameRect() {
    return S.frame ? S.frame.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  /** Pointer position in iframe client coordinates, whichever document delivered the event. */
  function toFrame(e, fromFrame) {
    if (fromFrame) return { x: e.clientX, y: e.clientY };
    const r = frameRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  /** Iframe client coordinates -> editor viewport coordinates. */
  function toPage(x, y) {
    const r = frameRect();
    return { x: r.left + x, y: r.top + y };
  }
  /** The part of the frame the stage shows, in iframe client coordinates (a foldable can be larger than the stage). */
  function shownRect() {
    const win = S.frame && S.frame.contentWindow;
    const vw = win ? win.innerWidth : 0, vh = win ? win.innerHeight : 0;
    if (!S.viewport) return { left: 0, top: 0, right: vw, bottom: vh };
    const fr = frameRect(), v = S.viewport.getBoundingClientRect();
    const l = v.left + S.viewport.clientLeft - fr.left, t = v.top + S.viewport.clientTop - fr.top;
    return {
      left: Math.max(0, l), top: Math.max(0, t),
      right: Math.min(vw, l + S.viewport.clientWidth), bottom: Math.min(vh, t + S.viewport.clientHeight),
    };
  }
  function inShown(x, y) {
    const s = shownRect();
    return x >= s.left && y >= s.top && x <= s.right && y <= s.bottom;
  }
  function elRect(el) {
    if (!el || !el.isConnected || !el.getBoundingClientRect) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height && !el.getClientRects().length) return null;
    return r;
  }
  function modelLabel(id) {
    const m = HE.doc.byId(id);
    return m ? util.label(m) : '';
  }
  function restoreStyle(el, saved) {
    if (saved == null) el.removeAttribute('style'); else el.setAttribute('style', saved);
  }
  function restoreAttr(el, name, value) {
    if (value == null) el.removeAttribute(name); else el.setAttribute(name, value);
  }
  function docOrder(ids) {
    const els = ids.map((id) => HE.doc.byId(id)).filter(Boolean);
    els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return els.map((m) => m.getAttribute(ID));
  }
  function rgbToHex(c) {
    const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c || '');
    if (!m) return '#000000';
    return '#' + [m[1], m[2], m[3]].map((v) => Math.min(255, Math.round(+v)).toString(16).padStart(2, '0')).join('');
  }
  function setBox(node, x, y, w, hgt) {
    node.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    node.style.width = Math.max(0, Math.round(w)) + 'px';
    node.style.height = Math.max(0, Math.round(hgt)) + 'px';
  }
  /** Start offset of a positioned element along one side, in px. */
  function startOffset(el, s, side) {
    const raw = s[side];
    if (/px$/.test(raw)) return parseFloat(raw);
    const margin = parseFloat(side === 'left' ? s.marginLeft : s.marginTop) || 0;
    return (side === 'left' ? el.offsetLeft : el.offsetTop) - margin;
  }
  /** Whether an inset of a positioned element is set rather than auto (getComputedStyle reports used px either way). */
  function insetSet(el, side) {
    try { if (el.computedStyleMap) return String(el.computedStyleMap().get(side)) !== 'auto'; } catch (e) { /* unsupported */ }
    // No typed OM: an auto inset is the one whose removal leaves the box where it is.
    const saved = el.getAttribute('style');
    const a = el.getBoundingClientRect();
    el.style.setProperty(side, 'auto', 'important');
    const b = el.getBoundingClientRect();
    restoreStyle(el, saved);
    return a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height;
  }
  function pinsOf(el) {
    return { l: insetSet(el, 'left'), t: insetSet(el, 'top'), r: insetSet(el, 'right'), b: insetSet(el, 'bottom') };
  }
  /** Insets for a positioned element moved by (mx, my). Shifting every set inset keeps an auto width/height. */
  function freeStyles(f, mx, my) {
    const st = {};
    if (f.pin.l || !f.pin.r) st.left = px(f.left + mx);
    if (f.pin.r) st.right = px(f.right - mx);
    if (f.pin.t || !f.pin.b) st.top = px(f.top + my);
    if (f.pin.b) st.bottom = px(f.bottom - my);
    return st;
  }
  /** Computed `translate` -> [x, y, z] strings. */
  function parseTranslate(v) {
    if (!v || v === 'none') return ['0px', '0px', ''];
    const parts = v.trim().split(/\s+(?![^(]*\))/);
    return [parts[0] || '0px', parts[1] || '0px', parts[2] || ''];
  }
  function addPx(base, d) {
    const m = /^(-?[\d.]+)px$/.exec(base);
    if (m) return px(parseFloat(m[1]) + d);
    return 'calc(' + base + ' + ' + Math.round(d) + 'px)';
  }
  function translateValue(start, dx, dy) {
    const x = addPx(start[0], dx);
    const y = addPx(start[1], dy);
    if (x === '0px' && y === '0px' && !start[2]) return '';
    return [x, y, start[2]].filter(Boolean).join(' ');
  }

  /* ------------------------------------------------------------------ */
  /* Shell: view toolbar, stage, overlay, floating text toolbar          */
  /* ------------------------------------------------------------------ */

  function iconButton(id, cls, iconName, title) {
    const b = h('button', cls, HE.ui.icon(iconName));
    b.type = 'button';
    b.id = id;
    b.title = title;
    b.setAttribute('aria-label', title);
    return b;
  }

  function buildViewToolbar() {
    const bar = document.getElementById('toolbar-view');
    if (!bar) return;
    bar.classList.add('cv-toolbar');
    bar.textContent = '';

    const devices = h('div', 'seg');
    devices.setAttribute('role', 'group');
    devices.setAttribute('aria-label', t('裝置寬度'));
    for (const [key, d] of Object.entries(DEVICES)) {
      const b = iconButton('cv-device-' + key, 'btn icon', d.icon, t('{label}（{hint}）', { label: d.label, hint: d.hint }));
      b.addEventListener('click', () => (key === 'fold' ? openFoldMenu(b) : setDevice(key)));
      S.buttons['device-' + key] = b;
      devices.append(b);
    }
    const foldToggle = iconButton('cv-fold-toggle', 'btn icon ghost', 'fold-closed', t('摺起', null, 'action'));
    foldToggle.addEventListener('click', () => setFold(S.fold, !S.folded));
    S.buttons.foldToggle = foldToggle;

    const toggle = HE.ui.kbd('alt+p');
    const modes = h('div', 'seg');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', t('模式'));
    const edit = iconButton('cv-mode-edit', 'btn icon', 'pencil', t('編輯：點選、拖曳、雙擊打字（{key} 切換）', { key: toggle }));
    const preview = iconButton('cv-mode-preview', 'btn icon', 'play', t('預覽頁面（{key} 切換）；頁面腳本依設定執行。', { key: toggle }) + SEP + keysHint());
    edit.addEventListener('click', () => HE.setMode('edit'));
    preview.addEventListener('click', () => HE.setMode('preview'));
    S.buttons.edit = edit;
    S.buttons.preview = preview;
    modes.append(edit, preview);

    const moves = h('div', 'seg');
    moves.setAttribute('role', 'group');
    moves.setAttribute('aria-label', t('拖曳方式'));
    const flow = iconButton('cv-move-flow', 'btn icon', 'list', t('排列：拖曳元素會換順序（按住 Alt 拖曳改為自由移動）'));
    const free = iconButton('cv-move-free', 'btn icon', 'move', t('自由移動：拖曳元素到任意位置（按住 Alt 拖曳改為換順序）'));
    flow.addEventListener('click', () => setMoveMode('flow'));
    free.addEventListener('click', () => setMoveMode('free'));
    S.buttons.moveFlow = flow;
    S.buttons.moveFree = free;
    moves.append(flow, free);

    const scripts = h('button', 'btn ghost cv-scripts', HE.ui.icon('code') + '<span class="cv-btn-text">' + util.esc(t('腳本')) + '</span>' + HE.ui.icon('chevron-down', 12));
    scripts.type = 'button';
    scripts.id = 'cv-scripts';
    scripts.setAttribute('aria-haspopup', 'menu');
    scripts.addEventListener('click', () => openScriptsMenu(scripts));
    S.buttons.scripts = scripts;

    // While compat mode is on: the warning and a one-click way out.
    const compat = h('button', 'btn sm cv-compat', HE.ui.icon('alert', 14) + '<span class="cv-btn-text">' + util.esc(t('相容模式')) + '</span>' + HE.ui.icon('x', 12));
    compat.type = 'button';
    compat.id = 'cv-compat-off';
    compat.title = t('相容模式：頁面腳本在編輯時也以編輯器的權限執行。按一下關閉。');
    compat.setAttribute('aria-label', t('關閉相容模式'));
    compat.hidden = true;
    compat.addEventListener('click', () => setCompat(false));
    S.buttons.compat = compat;

    // Its text and icon follow the run state (syncViewToolbar): isolated, tainted by compat mode, or stopped by the
    // self-navigation limit.
    S.runLabel = h('span', 'chip cv-run-label');
    S.runLabel.id = 'cv-run-label';
    S.runLabel.setAttribute('role', 'status');
    S.runLabel.hidden = true;

    const refresh = iconButton('cv-refresh', 'btn icon ghost', 'refresh', t('重新整理畫布'));
    refresh.addEventListener('click', refreshCanvas);

    bar.append(devices, foldToggle, modes, moves, scripts, compat, S.runLabel, refresh);
    syncViewToolbar();
  }

  /** The refresh button: both frames again from the model. The user asks to see the document, so a page that kept navigating away gets a fresh count. */
  function refreshCanvas() {
    render();
    S.runNavs = [];
    if (runWanted()) buildRun(); else removeRun();
  }

  function openScriptsMenu(btn) {
    const r = btn.getBoundingClientRect();
    const items = [
      { heading: t('頁面腳本') },
      { label: t('在預覽中執行腳本'), checked: scriptsAllowed(), onClick: () => setScripts(!scriptsAllowed()) },
    ];
    // In the Artifact the edit frame would hand window.claude (the viewer's Claude usage) to the page.
    if (!HE.env.inArtifact) {
      items.push({ label: t('編輯時也執行（相容模式）'), icon: 'alert', checked: compatOn(), onClick: () => setCompat(!compatOn()) });
    }
    if (S.tainted && !compatOn()) {
      items.push({ separator: true });
      if (changedAI().length) items.push({ label: t('還原 AI 設定（開啟相容模式前）'), icon: 'undo', onClick: restoreAI });
      items.push({ label: t('重新載入分頁（恢復隔離）'), icon: 'refresh', onClick: reloadTab });
    }
    const m = HE.ui.menu(items, { x: r.left, y: r.bottom + 4 });
    // Each item is on or off by itself, not one choice of several.
    if (m && m.el) m.el.querySelectorAll('[role="menuitemradio"]').forEach((b) => b.setAttribute('role', 'menuitemcheckbox'));
  }

  function syncViewToolbar() {
    for (const key of Object.keys(DEVICES)) {
      const b = S.buttons['device-' + key];
      if (b) b.setAttribute('aria-pressed', String(S.device === key));
    }
    const ft = S.buttons.foldToggle;
    if (ft) {
      ft.hidden = S.device !== 'fold';
      const label = S.folded ? t('展開', null, 'action') : t('摺起', null, 'action');
      ft.innerHTML = HE.ui.icon(S.folded ? 'fold' : 'fold-closed');
      ft.title = S.folded ? t('展開（{name}）', { name: FOLDABLES[S.fold].label }) : t('摺起（{name}）', { name: FOLDABLES[S.fold].label });
      ft.setAttribute('aria-label', label);
    }
    if (S.buttons.edit) S.buttons.edit.setAttribute('aria-pressed', String(HE.mode === 'edit'));
    if (S.buttons.preview) S.buttons.preview.setAttribute('aria-pressed', String(HE.mode === 'preview'));
    if (S.buttons.moveFlow) S.buttons.moveFlow.setAttribute('aria-pressed', String(S.moveMode === 'flow'));
    if (S.buttons.moveFree) S.buttons.moveFree.setAttribute('aria-pressed', String(S.moveMode === 'free'));
    const sb = S.buttons.scripts;
    if (sb) {
      const allowed = scriptsAllowed(), compat = compatOn();
      const state = compat ? t('相容模式，編輯時也以編輯器的權限執行') : allowed ? t('在預覽中於隔離的框架執行，編輯模式顯示原始內容') :
        !S.scripts ? t('已關閉') : t('這份文件尚未允許執行');
      const tainted = S.tainted && !compat;
      sb.classList.toggle('active', allowed && !compat);
      sb.classList.toggle('is-compat', compat);
      sb.title = tainted ? t('頁面腳本：{state}。{taint}', { state, taint: TAINT_STATE }) : t('頁面腳本：{state}', { state });
      sb.setAttribute('aria-label', tainted ? t('頁面腳本選單（{state}。{taint}）', { state, taint: TAINT_STATE }) : t('頁面腳本選單（{state}）', { state }));
    }
    if (S.buttons.compat) S.buttons.compat.hidden = !compatOn();
    const lb = S.runLabel;
    if (lb) {
      const blocked = HE.mode === 'preview' && !!HE.doc.model && !scriptsAllowed() && HE.doc.hasScripts();
      lb.hidden = !(S.run || S.runPending || S.runStopped || blocked);
      // After compat mode the run frame is still isolated, but the editor itself may not be: never claim 已隔離 then.
      const st = blocked ? (S.tainted ? 'blocked-tainted' : 'blocked') : S.runStopped ? 'stopped' : S.tainted ? 'tainted' : 'isolated';
      if (lb.dataset.state !== st) {
        lb.dataset.state = st;
        lb.classList.toggle('is-tainted', st === 'tainted');
        lb.classList.toggle('is-stopped', st === 'stopped' || blocked);
        lb.innerHTML = HE.ui.icon(st === 'isolated' ? 'lock' : st === 'stopped' ? 'stop' : 'alert', 12) + '<span class="cv-btn-text"></span>';
        lb.querySelector('.cv-btn-text').textContent = st === 'stopped' ? t('腳本已停止') : st === 'tainted' ? TAINT_LABEL : st === 'blocked-tainted' ? t('腳本停・請重載') : st === 'blocked' ? t('腳本未執行') : t('腳本執行中・已隔離');
        lb.title = st === 'stopped' ? RUN_NAV_STOP :
          (st === 'tainted' ? t('頁面腳本在隔離的框架中執行，但這個分頁開啟過相容模式，重新載入分頁之前，隔離並不完整。可以在「腳本」選單重新載入。') : blocked ? t('此文件的腳本未在預覽中執行。可在「腳本」選單中選擇是否允許執行。') + (S.tainted ? SEP + t('這個分頁開啟過相容模式，重新載入分頁之前，隔離並不完整。可以在「腳本」選單重新載入。') : '') :
            t('頁面腳本在隔離的框架中執行，讀不到編輯器的資料，也無法操作編輯器。')) + SEP + keysHint();
        if (blocked && window.matchMedia('(max-width: 520px)').matches) {
          requestAnimationFrame(() => {
            if (lb.hidden || lb.dataset.state !== st) return;
            const bar = lb.closest('.topbar'), drawer = document.getElementById('btn-drawer-right');
            if (!bar || !drawer) return;
            const overlap = lb.getBoundingClientRect().right - drawer.getBoundingClientRect().left;
            if (overlap > 0) bar.scrollLeft += overlap + 6;
          });
        }
      }
    }
  }

  /** Where the keyboard goes in a scripted preview, and how to get the editor's shortcuts back. */
  function keysHint() {
    return t('頁面腳本執行時，點進頁面後鍵盤會交給頁面；按 Tab 移出或點一下工具列，即可再用 {key} 等快捷鍵。', { key: HE.ui.kbd('alt+p') });
  }

  function buildStage() {
    const host = document.getElementById('canvas-host');
    if (!host) return false;
    S.host = host;
    host.classList.add('cv-host');
    host.textContent = '';

    S.viewport = h('div', 'cv-viewport');
    // The text toolbar is fixed outside the scroller: re-place it when the stage itself scrolls.
    S.viewport.addEventListener('scroll', () => scheduleDraw(), { passive: true });
    S.wrap = h('div', 'cv-wrap');
    S.deviceLabel = h('div', 'cv-device-label');
    S.deviceLabel.setAttribute('aria-hidden', 'true');
    S.box = h('div', 'cv-frame-box');
    S.overlay = h('div', 'cv-overlay');
    S.overlay.setAttribute('aria-hidden', 'true');

    S.hoverBox = h('div', 'cv-hover');
    S.hoverTag = h('span', 'cv-tag');
    S.hoverBox.append(S.hoverTag);
    S.hoverBox.hidden = true;

    S.pBox = h('div', 'cv-box cv-primary');
    S.pLabel = h('div', 'cv-chip');
    S.pName = h('span', 'cv-chip-name');
    S.pDims = h('span', 'cv-chip-dims');
    S.pLabel.append(h('span', 'cv-chip-grip', HE.ui.icon('grip', 11)), S.pName, S.pDims);
    // The label is a drag handle for the selection itself, so a container is movable even when
    // every point inside it belongs to a child.
    S.pLabel.title = t('拖曳以移動');
    S.pLabel.addEventListener('mousedown', startChipDrag);
    S.pBox.append(S.pLabel);
    for (const dir of HANDLE_DIRS) {
      const hd = h('div', 'cv-handle');
      hd.dataset.dir = dir;
      hd.addEventListener('mousedown', (e) => startResize(e, dir));
      S.pBox.append(hd);
    }
    S.pBox.hidden = true;

    S.drop = h('div', 'cv-drop');
    S.drop.hidden = true;
    S.overlay.append(S.hoverBox, S.pBox, S.drop);

    // Where an open foldable bends: content across it sits in the crease.
    S.crease = h('div', 'cv-crease');
    S.crease.setAttribute('aria-hidden', 'true');
    S.crease.hidden = true;
    S.runShield = h('div', 'cv-run-shield');
    S.runShield.hidden = true;
    S.box.append(S.crease, S.overlay, S.runShield);
    S.wrap.append(S.deviceLabel, S.box);
    S.viewport.append(S.wrap);

    S.ghost = h('div', 'cv-ghost');
    S.ghost.hidden = true;
    S.shield = h('div', 'cv-shield');
    S.shield.hidden = true;
    S.tbar = buildTextToolbar();
    host.append(S.viewport, S.tbar, S.ghost, S.shield);
    return true;
  }

  function buildTextToolbar() {
    const bar = h('div', 'cv-tbar');
    bar.id = 'cv-tbar';
    bar.hidden = true;
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', t('文字格式'));
    const k = (c) => ({ key: HE.ui.kbd(c) });
    const add = (key, iconName, title, fn) => {
      const b = h('button', 'btn icon sm ghost', HE.ui.icon(iconName, 15));
      b.type = 'button';
      b.id = 'cv-tf-' + key;
      b.title = title;
      b.setAttribute('aria-label', title);
      // Keep focus and the text selection inside the iframe.
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', fn);
      S.tf[key] = b;
      bar.append(b);
      return b;
    };
    const sep = () => bar.append(h('span', 'cv-tbar-sep'));
    const color = (key, iconName, title, cmd, initial) => {
      const wrap = h('label', 'btn icon sm ghost cv-tf-swatch', HE.ui.icon(iconName, 15) + '<span class="cv-tf-bar"></span>');
      wrap.title = title;
      const input = document.createElement('input');
      input.type = 'color';
      input.id = 'cv-tf-' + key;
      input.value = initial;
      input.setAttribute('aria-label', title);
      const swatch = wrap.querySelector('.cv-tf-bar');
      swatch.style.background = initial;
      input.addEventListener('input', () => { swatch.style.background = input.value; });
      input.addEventListener('change', () => { swatch.style.background = input.value; exec(cmd, input.value, true); });
      wrap.append(input);
      bar.append(wrap);
      return input;
    };
    add('bold', 'bold', t('粗體（{key}）', k('mod+b')), () => exec('bold'));
    add('italic', 'italic', t('斜體（{key}）', k('mod+i')), () => exec('italic'));
    add('underline', 'underline', t('底線（{key}）', k('mod+u')), () => exec('underline'));
    add('strike', 'strike', t('刪除線'), () => exec('strikeThrough'));
    sep();
    add('link', 'link', t('加入連結'), () => { addLink(); });
    add('unlink', 'unlink', t('移除連結'), () => removeLink());
    sep();
    S.tbarColor = color('color', 'text', t('文字顏色'), 'foreColor', '#000000');
    S.tbarHilite = color('hilite', 'palette', t('螢光標記'), 'hiliteColor', '#fff59d');
    sep();
    add('clear', 'x', t('清除格式'), () => exec('removeFormat'));
    return bar;
  }

  /* ------------------------------------------------------------------ */
  /* Device, scripts, mode                                               */
  /* ------------------------------------------------------------------ */

  /** The foldable screen in use: {w, h, crease} (crease null while folded). */
  function foldScreen() {
    const f = FOLDABLES[S.fold];
    const s = S.folded ? f.folded : f.open;
    return { w: s.w, h: s.h, crease: S.folded ? null : f.crease };
  }

  function applyDevice() {
    if (!S.viewport) return;
    const d = DEVICES[S.device];
    S.viewport.dataset.device = S.device;
    if (S.device === 'fold') {
      const f = FOLDABLES[S.fold];
      const s = foldScreen();
      S.wrap.style.width = s.w + 'px';
      S.wrap.style.height = s.h + 'px';
      const size = f.label + ' · ' + (S.folded ? t('摺起') : t('展開')) + ' · ' + s.w + ' × ' + s.h + ' px';
      S.deviceLabel.textContent = f.estimated ? t('{size}（估計）', { size }) : size;
      S.deviceLabel.hidden = false;
      S.crease.hidden = !s.crease;
      S.crease.dataset.dir = s.crease || '';
      return;
    }
    S.wrap.style.width = d.width ? d.width + 'px' : '';
    S.wrap.style.height = '';
    S.deviceLabel.textContent = d.width ? d.label + ' · ' + d.width + ' px' : '';
    S.deviceLabel.hidden = !d.width;
    S.crease.hidden = true;
  }

  function setMoveMode(mode) {
    const next = mode === 'free' ? 'free' : 'flow';
    if (next === S.moveMode) return;
    S.moveMode = next;
    HE.settings.set('canvas.moveMode', next);
    syncViewToolbar();
    refreshEditorCSS();
    // `translate` is a fixed offset: say so where the choice is made, not after a phone layout has drifted.
    HE.ui.status(next === 'free' ? t('自由移動：拖曳的位置是固定的位移，不會隨螢幕寬度調整；切換裝置時請再檢查版面') : t('排列：拖曳元素會換順序'));
  }

  function setDevice(name) {
    const wasDesktop = S.device === 'desktop';
    S.device = DEVICES[name] ? name : 'desktop';
    HE.settings.set('canvas.device', S.device);
    applyDevice();
    refreshEditorCSS();
    // The run frame follows the box's size by itself; only its scrollbar rule is baked into its document.
    if ((S.run || S.runPending) && wasDesktop !== (S.device === 'desktop')) buildRun();
    // A stopped page stays the same page under the new device's rule (a change still waiting on its rebuild keeps its run).
    else if (S.runStopped && !S.runTimer) S.runSrc = runSource();
    syncViewToolbar();
    scheduleDraw();
  }

  /** Preview a foldable model, open or folded. */
  function setFold(model, folded) {
    S.fold = FOLDABLES[model] ? model : FOLD_DEFAULT;
    S.folded = !!folded;
    HE.settings.set('canvas.fold', { model: S.fold, folded: S.folded });
    setDevice('fold');
  }

  function openFoldMenu(btn) {
    const r = btn.getBoundingClientRect();
    const on = S.device === 'fold';
    const items = [{ heading: t('摺疊機') }];
    for (const [key, f] of Object.entries(FOLDABLES)) {
      items.push({ label: f.label, checked: on && S.fold === key, onClick: () => setFold(key, on && S.fold === key ? S.folded : false) });
    }
    items.push({ separator: true });
    items.push({ label: t('展開'), icon: 'fold', checked: on && !S.folded, onClick: () => setFold(S.fold, false) });
    items.push({ label: t('摺起'), icon: 'fold-closed', checked: on && S.folded, onClick: () => setFold(S.fold, true) });
    HE.ui.menu(items, { x: r.left, y: r.bottom + 4 });
  }

  /** The preview viewport in words, for the AI. */
  function viewportNote() {
    if (S.device !== 'fold') return S.device;
    const s = foldScreen();
    return FOLDABLES[S.fold].label + ' foldable, ' + (S.folded ? 'folded' : 'unfolded') + ', ' + s.w + 'x' + s.h + ' CSS px' +
      (s.crease === 'vertical' ? ', crease runs vertically through the middle (x=' + Math.round(s.w / 2) + ')' :
        s.crease === 'horizontal' ? ', crease runs horizontally through the middle of the screen (y=' + Math.round(s.h / 2) + ')' : '');
  }

  /**
   * Ask before letting this document's scripts run. False when declined, when another document was opened
   * meanwhile, or when the document changed while the dialog was open: the user agreed to the scripts the
   * dialog was opened over, not to any written meanwhile. opts: {title, okLabel, retryLabel, retry}
   */
  async function confirmScripts(message, opts) {
    const seq = S.loadSeq;
    let changed = false;
    const off = HE.on('doc:changed', () => { changed = true; });
    let ok = false;
    try { ok = await HE.ui.confirm(message, { title: opts.title, okLabel: opts.okLabel, danger: true }); } finally { off(); }
    if (!ok || seq !== S.loadSeq) return false;
    if (changed || aiBusy()) {
      HE.ui.toast(t('確認期間文件有了變更，腳本仍未執行。請再確認一次。'), { action: { label: opts.retryLabel, fn: opts.retry }, timeout: 8000 });
      return false;
    }
    return true;
  }

  /**
   * The 腳本 preference: let the page's scripts run while previewing, in the isolated run frame. On for an
   * untrusted document asks first, then trusts it. Off also ends compat mode.
   */
  async function setScripts(on) {
    const v = !!on;
    if (v === scriptsAllowed()) return v;
    if (v && !HE.doc.trusted) {
      if (refuseBusy()) return scriptsAllowed();
      const ok = await confirmScripts(trustConfirm(), { title: t('允許這份文件的腳本？'), okLabel: t('允許執行'), retryLabel: t('允許執行…'), retry: () => setScripts(true) });
      if (!ok) return scriptsAllowed();
    }
    S.scripts = v;
    HE.settings.set('canvas.scripts', v);
    if (!v) endCompat();
    if (v) HE.doc.setTrusted(true);
    syncFrames();
    if (v && HE.mode === 'edit' && !compatOn()) {
      HE.ui.toast(RUN_IN_PREVIEW, { action: { label: t('切換到預覽'), fn: () => HE.setMode('preview') }, timeout: 8000 });
    } else {
      HE.ui.status(v ? t('已允許頁面腳本，在預覽中於隔離的框架執行') : t('已關閉頁面腳本，預覽也顯示原始內容'));
    }
    return v;
  }

  /**
   * Compat mode (編輯時也執行): the old behaviour, for pages whose content only exists once their scripts ran.
   * The edit frame then runs them with the editor's origin. Always behind a danger confirm; never stored, and
   * it ends on every document load or replace (an undo or redo across one too), when trust drops, when an undo
   * or redo brings back script it was not confirmed over, and when the preference goes off, so it never comes
   * back on by itself. Not offered in the Artifact.
   */
  async function setCompat(on) {
    const v = !!on;
    if (v === compatOn()) return v;
    if (!v) {
      endCompat();
      syncFrames();
      HE.ui.status(t('已關閉相容模式，編輯時不再執行頁面腳本'));
      return false;
    }
    if (HE.env.inArtifact || refuseBusy()) return false;
    const ok = await confirmScripts(COMPAT_CONFIRM, { title: t('編輯時也執行腳本？'), okLabel: t('開啟相容模式'), retryLabel: t('相容模式…'), retry: () => setCompat(true) });
    if (!ok) return compatOn();
    S.scripts = true;
    HE.settings.set('canvas.scripts', true);
    taint();
    // The consent covers these scripts only (confirmScripts made sure none came in while the dialog was open).
    S.compatBits = util.scriptBits(HE.doc.model);
    S.compat = true;
    HE.doc.setTrusted(true);
    syncFrames();
    HE.ui.status(t('相容模式已開啟：編輯時也會執行頁面腳本'));
    return true;
  }

  /*
   * Compat mode taints the tab. Its page ran in the editor's realm, and ending compat mode cannot undo what it
   * did there: functions it handed to the editor's timers and listeners keep running, editor objects it patched
   * stay patched, and what it stored stays stored. Only a reload ends that. Until then the toolbar no longer
   * says 已隔離, and the AI settings (where requests go, with which key) are compared with a copy taken when
   * compat mode first went on. All of this lives in this closure, out of the page's reach; the storage reads
   * use functions captured at load. It is best effort: code already running in this realm can change anything
   * the editor shows.
   */
  const SETTINGS_STORE = HE.settings.storageKey;
  const TAINT_KEY = 'tactile:compat-ai'; // sessionStorage: which AI settings changed, reported after the reload
  const stored = (() => {
    try {
      const ls = window.localStorage, get = Storage.prototype.getItem, parse = JSON.parse;
      return (key) => { try { return parse(get.call(ls, key)); } catch (e) { return null; } };
    } catch (e) { return () => null; }
  })();
  const stringify = JSON.stringify, parseJSON = JSON.parse;

  function aiOf(all) {
    const out = {};
    if (all && typeof all === 'object') for (const k of Object.keys(all)) if (k.startsWith('ai.')) out[k] = stringify(all[k]);
    return out;
  }
  /** The AI settings as the editor holds them and as stored (a page may have written either). */
  function aiNow() {
    const mem = {};
    for (const k of HE.settings.keys()) if (k.startsWith('ai.')) mem[k] = HE.settings.get(k);
    return { mem: aiOf(mem), stored: aiOf(stored(SETTINGS_STORE)) };
  }
  function changedAI() {
    const was = S.taintAI;
    if (!was) return [];
    const now = aiNow();
    const keys = new Set([...Object.keys(was.mem), ...Object.keys(now.mem), ...Object.keys(was.stored), ...Object.keys(now.stored)]);
    return [...keys].filter((k) => was.mem[k] !== now.mem[k] || was.stored[k] !== now.stored[k]).sort();
  }
  function aiNames(keys) {
    const name = (k) => (/\.key$/.test(k) ? t('金鑰') : /\.base$/.test(k) ? t('服務網址') : k === 'ai.provider' ? t('服務') : /model$/.test(k) ? t('模型', null, 'name') : t('其他設定'));
    return Array.from(new Set(keys.map(name))).join(t('、'));
  }
  /**
   * Back to the AI settings from before compat mode first went on (set() and remove() rewrite the stored copy too).
   * Says it worked only when a fresh comparison finds nothing left: a full storage keeps the changed copy on disk
   * for the next session, and a page script may still be at work.
   */
  function restoreAI() {
    const was = S.taintAI;
    const keys = changedAI();
    if (!was || !keys.length) { HE.ui.status(t('AI 設定和開啟相容模式前相同')); return; }
    let full = false;
    for (const k of keys) {
      const stored = k in was.mem ? HE.settings.set(k, parseJSON(was.mem[k])) : HE.settings.remove(k);
      if (stored === false) full = true;
    }
    const left = changedAI();
    if (!left.length) {
      HE.ui.toast(t('已還原 AI 設定。如果文件來源並非完全可信任，仍請更換 AI 金鑰。'), { timeout: 8000 });
      return;
    }
    // Storage full: a reload alone would load the changed copy back (and nothing here can store a fix), so the
    // space has to be freed first.
    const names = aiNames(left);
    const msg = full ? t('AI 的{names}沒有還原成功（瀏覽器的儲存空間已滿）。請先清除這個網站的儲存資料，再重新載入分頁、檢查 AI 設定並更換 AI 金鑰。', { names })
      : t('AI 的{names}沒有還原成功（頁面腳本可能仍在執行）。請重新載入分頁，並在 AI 設定中手動檢查，再更換 AI 金鑰。', { names });
    S.taintToasts.push(HE.ui.toast(msg, { type: 'error', action: { label: t('重新載入'), fn: reloadTab }, sticky: true }));
  }

  /** Compat mode is going on: from now until a reload this tab is not fully isolated. */
  function taint() {
    if (S.tainted) return;
    S.tainted = true;
    S.taintAI = aiNow();
  }

  /** End compat mode, whatever the reason; true when it was on. The caller syncs the frames. */
  function endCompat() {
    if (!S.compat) return false;
    S.compat = false;
    S.compatBits = null;
    for (const t of S.taintToasts.splice(0)) t.close();
    const changed = changedAI();
    if (changed.length) {
      S.taintToasts.push(HE.ui.toast(t('相容模式開啟期間，AI 的{names}有了變更。如果不是你改的，請還原，並更換 AI 金鑰。', { names: aiNames(changed) }),
        { type: 'error', action: { label: t('還原 AI 設定'), fn: restoreAI }, sticky: true }));
    }
    S.taintToasts.push(HE.ui.toast(TAINT_NOTICE, { action: { label: t('重新載入'), fn: reloadTab }, sticky: true }));
    syncViewToolbar();
    return true;
  }

  /** A status line about an undo/redo step, written after the step's own 「復原：…」 line (set once its events are out). */
  function stepStatus(msg) {
    Promise.resolve().then(() => HE.ui.status(msg));
  }

  /** The only way to stop what a compat-mode page left running. The autosave is flushed on pagehide. */
  function reloadTab() {
    try { if (S.editingId) endTextEdit(true); } catch (e) { /* reload anyway */ } finally { window.location.reload(); }
  }

  /** On leaving the tab (reload included): remember which AI settings changed, so the next load can say so. */
  function rememberTaint() {
    if (!S.tainted) return;
    const keys = changedAI();
    try {
      if (keys.length) sessionStorage.setItem(TAINT_KEY, stringify(keys));
      else sessionStorage.removeItem(TAINT_KEY);
    } catch (e) { /* storage unavailable */ }
  }
  /** After a reload of a tainted tab. Names only (a page may have written the record): no values, nothing to restore from it. */
  function reportTaint() {
    let keys = null;
    try { keys = parseJSON(sessionStorage.getItem(TAINT_KEY) || 'null'); sessionStorage.removeItem(TAINT_KEY); } catch (e) { keys = null; }
    if (!Array.isArray(keys)) return;
    keys = keys.filter((k) => typeof k === 'string' && k.startsWith('ai.'));
    if (!keys.length) return;
    HE.ui.toast(t('重新載入前，這個分頁開啟過相容模式，期間 AI 的{names}有了變更。如果不是你改的，請在 AI 設定中檢查，並更換 AI 金鑰。', { names: aiNames(keys) }),
      { type: 'error', sticky: true });
  }

  /** The consent text: what the isolation covers, and what it does not (exports, a tainted tab). */
  function trustConfirm() {
    let s = TRUST_CONFIRM + SEP + (location.protocol === 'file:' ? EXPORT_FILE_NOTE : EXPORT_NOTE);
    if (S.tainted) s += SEP + TAINT_STATE;
    return s;
  }

  /** After the scripts state changed: the edit frame's sandbox, the run frame and the toolbar. */
  function syncFrames() {
    const f = S.pending || S.frame;
    if (f && S.sandboxes.get(f) !== editSandbox()) render();
    syncRun();
    syncViewToolbar();
  }

  /** Once per load: why an untrusted document's scripts do not run, or where a trusted one's run. */
  function noticeScripts() {
    // Only when trust is what stops them: with the preference off they would not run anyway.
    if (!S.scripts || !HE.doc.hasScripts()) return;
    if (!HE.doc.trusted) HE.ui.toast(UNTRUSTED_NOTICE, { action: { label: t('允許執行…'), fn: () => setScripts(true) }, timeout: 10000 });
    else if (HE.mode === 'edit' && !compatOn()) HE.ui.status(EDIT_SHOWS_SOURCE);
  }

  function editorCSS() {
    let css = '[data-he-hidden]{visibility:hidden!important}' +
      '[data-he-editing]{outline:none!important;cursor:text!important;-webkit-user-select:text!important;user-select:text!important}' +
      '[data-he-editing] *{cursor:text!important;-webkit-user-select:text!important;user-select:text!important}';
    if (HE.mode === 'edit') {
      // Free move: the hand says a press will carry the element, and closes while it is held.
      if (S.moveMode === 'free') css += 'body *{cursor:' + (S.holding ? 'grabbing' : 'grab') + '!important}';
      else css += 'a,a *{cursor:default!important}';
    }
    if (S.device !== 'desktop') css += NO_PAGE_SCROLLBARS;
    return css;
  }
  function refreshEditorCSS() {
    const d = HE.live.doc;
    const st = d && d.getElementById(EDITOR_CSS_ID);
    if (st) st.textContent = editorCSS();
  }

  /**
   * HE.fx keeps its transitions, hover states and animations in <style data-he-style="fx-motion">.
   * In edit mode the frame's copy is switched off (media="not all"), so nothing moves under the
   * pointer and the overlay, inspector and nudge read the author's values; preview turns it on.
   * Only the live copy is touched: the model, undo snapshots and export never see the attribute. Copies
   * outside the head (pasted page source; HE.fx.sync removes them at the next edit) are switched too.
   */
  function fxMedia(d) {
    if (!d || !d.documentElement) return;
    const off = HE.mode === 'edit';
    d.querySelectorAll('style[data-he-style="fx-motion"]').forEach((st) => {
      if (off) { if (st.getAttribute('media') !== 'not all') st.setAttribute('media', 'not all'); }
      else if (st.hasAttribute('media')) st.removeAttribute('media');
    });
  }
  function stopFxDemo() { if (HE.fx && typeof HE.fx.stopDemo === 'function') HE.fx.stopDemo(); }

  function onModeChanged(data) {
    if (S.g) cancelGesture();
    if (S.editingId) endTextEdit(true);
    setHover(null);
    refreshEditorCSS();
    fxMedia(HE.live.doc);
    if (S.viewport) S.viewport.dataset.mode = (data && data.mode) || HE.mode;
    syncRun();
    syncViewToolbar();
    scheduleDraw();
  }

  /* ------------------------------------------------------------------ */
  /* Rendering (double-buffered iframe)                                  */
  /* ------------------------------------------------------------------ */

  function buildSrcdoc() {
    const css = '<style id="' + EDITOR_CSS_ID + '">' + editorCSS() + '</style>';
    if (!guarded()) return util.intoHead(HE.doc.snapshot(), css);
    // A refresh <meta> would navigate this frame (in the other browsers a frame without scripts ignores it). The
    // element stays, for the model's operations; the attribute that makes it act is left out of this copy only.
    const quiet = (root) => root.querySelectorAll('meta[http-equiv]').forEach((m) => { if (REFRESH.test(m.getAttribute('http-equiv'))) m.removeAttribute('http-equiv'); });
    return util.intoHead(HE.doc.serialize({ keepIds: true, prepare: quiet }), GUARD_CSP + css);
  }

  /** Re-render the iframe from the model. Calls in the same tick coalesce; a newer render discards an in-flight one. */
  function render() {
    if (S.editingId) endTextEdit(true);
    if (S.renderQueued) return;
    S.renderQueued = true;
    Promise.resolve().then(() => { S.renderQueued = false; build(); });
  }

  function build() {
    if (!S.box || !HE.doc.model) return;
    const token = ++S.renderToken;
    if (S.pending) S.pending.remove();
    S.pendingStale = false;
    const f = document.createElement('iframe');
    f.className = 'cv-frame is-pending';
    f.title = t('頁面畫布');
    // allow-same-origin stays (the editor works on the live DOM directly), so scripts run here only in compat mode.
    const sandbox = editSandbox();
    f.setAttribute('sandbox', sandbox);
    S.sandboxes.set(f, sandbox);
    f.addEventListener('load', () => onFrameLoad(f, token));
    f.srcdoc = buildSrcdoc();
    S.pending = f;
    S.box.insertBefore(f, S.overlay);
  }

  function onFrameLoad(f, token) {
    // Before anything else: whatever this frame loads next runs no script.
    if (S.sandboxes.get(f) === GUARD_SANDBOX) f.setAttribute('sandbox', EDIT_SANDBOX);
    if (f !== S.pending) {
      // The visible frame loaded again: the page navigated itself. Rebuild it from the model.
      if (f === S.frame) render();
      return;
    }
    if (token !== S.renderToken) { f.remove(); return; }
    let d = null;
    try { d = f.contentDocument; } catch (e) { d = null; }
    if (!d || !d.documentElement) { f.remove(); S.pending = null; return; }
    // The model changed while this frame was loading (ops went to the old live doc): build again.
    if (S.pendingStale && S.staleRetries < 3) { S.staleRetries++; build(); return; }
    if (S.editEl && S.editEl.ownerDocument !== d) {
      endTextEdit(true); // HE.live.doc is still the outgoing doc, so the typed text is committed
      if (S.pendingStale && S.staleRetries < 3) { S.staleRetries++; build(); return; }
    }
    S.staleRetries = 0;
    // The device or mode may have changed while this frame loaded: its editor CSS is from build time.
    // Set it before the scroll restore, since the page scrollbar changes the layout width.
    const ecss = d.getElementById(EDITOR_CSS_ID);
    if (ecss) ecss.textContent = editorCSS();
    fxMedia(d); // before the frame is shown, so effects never play in edit mode

    const old = S.frame;
    let scroll = null;
    if (old && !S.resetScroll) {
      try { scroll = { x: old.contentWindow.scrollX, y: old.contentWindow.scrollY }; } catch (e) { scroll = null; }
    }
    S.resetScroll = false;
    const win = f.contentWindow;
    if (scroll) try { win.scrollTo(scroll.x, scroll.y); } catch (e) { /* detached */ }
    attach(d);
    f.classList.remove('is-pending');
    S.pending = null;
    S.frame = f;
    HE.live.doc = d;
    if (old) old.remove();
    S.userScrolled = false;
    observeBody(d);
    setHover(null);
    HE.emit('canvas:ready', { doc: d });
    if (scroll) {
      // Page scripts may change the layout right after load; restore the position once more.
      setTimeout(() => {
        if (S.frame !== f || S.userScrolled) return;
        try { win.scrollTo(scroll.x, scroll.y); } catch (e) { /* detached */ }
        scheduleDraw();
      }, 120);
    }
  }

  function observeBody(d) {
    if (S.bodyRO) { S.bodyRO.disconnect(); S.bodyRO = null; }
    if (!window.ResizeObserver || !d.body) return;
    try {
      S.bodyRO = new ResizeObserver(() => scheduleDraw());
      S.bodyRO.observe(d.body);
    } catch (e) { S.bodyRO = null; }
  }

  /* ------------------------------------------------------------------ */
  /* Run frame: the page's scripts while previewing, isolated            */
  /* ------------------------------------------------------------------ */

  /*
   * Previewing a document whose scripts may run shows a second iframe in the same box, with HE.PAGE_SANDBOX: no
   * allow-same-origin, so the page has an opaque origin and cannot read the editor's storage (AI keys) or reach
   * window.parent.HE / window.claude. Its srcdoc is a fixed wrapper (runWrapper) that holds the page, the export
   * form (HE.doc.serialize()), in a frame of its own with the same flags. The editor never reads either document:
   * it only creates, sizes, focuses and removes the frame, and hears fixed messages from the wrapper
   * (RUN_NAV_ONLOAD) and from the page's guard (RUN_GUARD). Not allow-downloads (unlike 在新分頁預覽): the canvas
   * never let pages download, and the Artifact blocks downloads anyway. The edit frame stays loaded underneath
   * (visibility:hidden keeps its layout), so HE.live.doc, the AI tools and switching back to edit keep working.
   */
  function runWanted() {
    return HE.mode === 'preview' && !!S.box && !!HE.doc.model && scriptsAllowed() && !compatOn() && HE.doc.hasScripts();
  }

  /**
   * The run frame's page: the export form, with the layers hidden in the editor marked (they stay hidden here
   * too), and at the start of its head the guard, the no-scrollbar rule off desktop and the hiding rule. srcdoc
   * always parses in standards mode, like the canvas; the export keeps the page's own doctype.
   */
  function runSource() {
    const hidden = HE.layers && typeof HE.layers.hiddenIds === 'function' ? HE.layers.hiddenIds() : [];
    // No <base>: the wrapper's is the page's fallback, so a bare '#id' stays in the page. Relative URLs resolve
    // against about:srcdoc and fail, where the edit frame resolves them against the editor's own address (rarely
    // where the page's files are). A page with its own <base> keeps it.
    let tags = RUN_GUARD;
    if (S.device !== 'desktop') tags += '<style>' + NO_PAGE_SCROLLBARS + '</style>';
    if (hidden.length) tags += '<style>' + HE.layers.hiddenCSS + '</style>';
    return util.intoHead(HE.doc.serialize(hidden.length ? { mark: { ids: hidden, attr: 'data-he-hidden' } } : {}), tags);
  }

  /** The run frame's srcdoc: the wrapper document, its one frame showing the page (see RUN_WRAP_CSS). */
  function runWrapper(page) {
    const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return '<!DOCTYPE html><html><head><base href="about:srcdoc"><style>' + RUN_WRAP_CSS + '</style></head><body>' +
      '<iframe sandbox="' + attr(PAGE_SANDBOX) + '" referrerpolicy="no-referrer" title="' + attr(RUN_TITLE) +
      '" onload="' + attr(RUN_NAV_ONLOAD) + '" srcdoc="' + attr(page) + '"></iframe></body></html>';
  }

  /** Show or remove the run frame to match the mode, the scripts state and the document (no rebuild; none while stopped). */
  function syncRun() {
    if (!runWanted()) removeRun();
    else if (!S.run && !S.runPending && !S.runStopped) buildRun();
  }

  /** The model (or the layers hidden in the editor) changed while previewing: rebuild the run frame, debounced. */
  function refreshRun() {
    if (HE.mode !== 'preview') return;
    clearTimeout(S.runTimer);
    S.runTimer = setTimeout(() => {
      S.runTimer = 0;
      if (!runWanted()) { removeRun(); return; }
      // Each build reruns the page's load-time scripts (alerts, requests), so rebuild only when the page itself
      // changed: one change can arrive twice (an undo that restores trust builds the frame on doc:trusted, then
      // emits doc:changed), and some changes do not touch the export. A page the navigation limit stopped runs
      // again once it changed.
      const src = runSource();
      if (src !== S.runSrc || (!S.runStopped && !(S.run || S.runPending))) buildRun(src);
    }, RUN_REBUILD_MS);
  }

  /** Build (or rebuild) the run frame; src: its page when the caller already made it. */
  function buildRun(src) {
    clearTimeout(S.runTimer);
    S.runTimer = 0;
    if (!runWanted()) { removeRun(); return; }
    if (S.runPending) { S.runPending.remove(); S.runPending = null; }
    S.runStopped = false;
    const token = ++S.runToken;
    const f = document.createElement('iframe');
    f.className = 'cv-frame cv-run is-pending';
    f.title = RUN_TITLE;
    f.setAttribute('sandbox', PAGE_SANDBOX);
    // On both frames: an about:srcdoc document's referrer is the URL of the one that made it (the wrapper's: the
    // editor's full URL).
    f.setAttribute('referrerpolicy', 'no-referrer');
    f.addEventListener('load', () => onRunLoad(f, token));
    S.runSrc = typeof src === 'string' ? src : runSource();
    S.runPages.set(f, S.runSrc);
    f.srcdoc = runWrapper(S.runSrc);
    S.runPending = f;
    S.box.insertBefore(f, S.overlay);
    syncViewToolbar();
  }

  function onRunLoad(f, token) {
    if (f === S.runPending) {
      if (token !== S.runToken) return;
      const old = S.run;
      S.runPending = null;
      S.run = f;
      f.classList.remove('is-pending');
      S.box.classList.add('is-running'); // hides the edit frame (CSS), so pointer input reaches the page
      // Keyboard focus follows only when it was already in the page (a rebuild). Entering preview leaves it in
      // the editor, where Alt+P and the other shortcuts work; keys in the page never reach the editor, so the
      // page gets them once the user clicks into it (a deck's arrow keys), like any embedded page.
      const focus = !!old && document.activeElement === old;
      if (old) old.remove();
      if (focus) focusRunPage(f);
      syncViewToolbar();
      return;
    }
    // The page's own navigations never load the run frame again (the wrapper reports them, run-nav); a second
    // load here is the wrapper itself reloaded, which counts as one too.
    if (f === S.run) runNavigated(f);
  }

  /**
   * Run frame f's page navigated itself (a link out, a form, a reload), shown or before the pending frame's first
   * load. Rebuild the run frame from the model; past the limit, stop that page (no run frame: the canvas shows the
   * document).
   */
  function runNavigated(f) {
    const now = Date.now();
    S.runNavs = S.runNavs.filter((t) => now - t < 5000).concat(now);
    if (S.runNavs.length > 4) {
      // Both frames go (one left would keep reloading, shown or out of sight, or stay where the page went). The count
      // holds: only the refresh button starts a fresh one. A model already past f's page (an edit still waiting on
      // its rebuild, or a pending build of it) runs instead, and stops in turn if it keeps navigating too.
      const page = S.runPages.get(f) || S.runSrc, navs = S.runNavs;
      removeRun();
      S.runNavs = navs;
      if (!runWanted() || runSource() !== page) { buildRun(); return; }
      // Stopped until the page changes, the refresh button, a mode switch or the scripts state. No frame is left to
      // report again, so this is said once.
      S.runStopped = true;
      S.runSrc = page;
      syncViewToolbar();
      HE.ui.toast(RUN_NAV_STOP, { action: { label: t('重新整理畫布'), fn: refreshCanvas }, timeout: 10000 });
      return;
    }
    previewToast();
    buildRun();
  }

  /** The page's own window in a run frame (the wrapper's one frame; cross-origin, never read), or null. */
  function runPageWindow(f) {
    try { return (f && f.contentWindow && f.contentWindow.frames[0]) || null; } catch (e) { return null; }
  }

  /** Keyboard focus into the page's frame (the wrapper itself has nothing to type into), else into the run frame. */
  function focusRunPage(f) {
    const page = runPageWindow(f);
    if (page) {
      try { page.focus(); } catch (e) { /* not focusable */ }
      if (document.activeElement === f) return;
    }
    try { f.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
  }

  function removeRun() {
    clearTimeout(S.runTimer);
    S.runTimer = 0;
    S.runToken++;
    S.runSrc = '';
    if (S.runPending) { S.runPending.remove(); S.runPending = null; }
    if (S.run) { S.run.remove(); S.run = null; }
    S.runNavs = [];
    S.runStopped = false;
    if (S.box) S.box.classList.remove('is-running');
    hideRunShield();
    syncViewToolbar();
  }

  /*
   * File drags in a scripted preview: the page first, then the editor. The run frame is cross-origin, so the
   * editor hears nothing of a drag over it, and a drop the page does not take would load the file in place of
   * the page. Its guard (RUN_GUARD) cancels such a drag and reports it; the editor then covers the frame with
   * .cv-run-shield, so the rest of the drag and the drop reach the editor's own handlers (open the file, insert
   * images), as in edit mode. A page's own drop zone that takes the drag never reports it, nor does a drag that
   * started in the page (its own image or link: fileio cannot tell those from a file, as it does in the edit frame).
   */
  function raiseRunShield() {
    if (!S.runShield || !S.run) return;
    clearTimeout(S.runShieldTimer);
    S.runShield.hidden = false;
    S.runShieldTimer = setTimeout(hideRunShield, RUN_SHIELD_MS);
  }
  function hideRunShield() {
    if (!S.runShield) return;
    clearTimeout(S.runShieldTimer);
    S.runShield.hidden = true;
  }

  /**
   * The run frame's messages, only these exact shapes: the guard's two only from the page's own window (in the run
   * or the pending frame), run-nav only from the wrapper (of the run or the pending frame). A page can post the
   * guard's messages too, and the most a forged one does is the shield for a moment or a status line; it cannot
   * post as the wrapper. Never take files or markup over this channel: that would let page scripts write into the
   * document.
   */
  function onRunMessage(e) {
    const from = e.source;
    if (!from || !(S.run || S.runPending)) return;
    let kind = '';
    try {
      const d = e.data;
      if (d && typeof d === 'object' && Object.keys(d).length === 1 && typeof d.tactile === 'string') kind = d.tactile;
    } catch (err) { return; }
    if (kind === 'run-nav') {
      // From the pending frame too: a page that navigates in its load handler holds back the wrapper's load, so
      // its report arrives while the frame is still pending.
      const f = S.run && S.run.contentWindow === from ? S.run : S.runPending && S.runPending.contentWindow === from ? S.runPending : null;
      if (f) runNavigated(f);
      return;
    }
    if (from !== runPageWindow(S.run) && from !== runPageWindow(S.runPending)) return;
    if (kind === 'run-filedrag') raiseRunShield();
    else if (kind === 'run-drop') HE.ui.status(RUN_DROP_MSG);
  }

  /** Listeners on a freshly loaded iframe document (they die with it on the next render). */
  function attach(d) {
    const win = d.defaultView;
    const cap = { capture: true };
    win.addEventListener('mousedown', onDown, cap);
    win.addEventListener('mousemove', onFrameMove, cap);
    win.addEventListener('mouseup', onFrameUp, cap);
    win.addEventListener('mouseout', (e) => { if (!e.relatedTarget && !S.g) setHover(null); }, cap);
    win.addEventListener('click', onEditClick, cap);
    win.addEventListener('auxclick', onEditClick, cap);
    win.addEventListener('dblclick', onDblClick, cap);
    win.addEventListener('contextmenu', onContextMenu, cap);
    win.addEventListener('submit', onEditSubmit, cap);
    win.addEventListener('keydown', onFrameKey, cap);
    for (const t of ['keyup', 'keypress']) win.addEventListener(t, (e) => { if (S.editEl) e.stopPropagation(); }, cap);
    win.addEventListener('paste', onPaste, cap);
    // Only the user's own typing (a trusted event) counts as a change to commit; a page script's does not.
    win.addEventListener('input', (e) => { if (S.editEl && e.isTrusted && S.editEl.contains(e.target)) S.editDirty = true; }, cap);
    win.addEventListener('dragstart', onDragStart, cap);
    for (const t of ['pointerdown', 'pointerup']) win.addEventListener(t, (e) => { if (HE.mode === 'edit') e.stopPropagation(); }, cap);
    for (const t of ['dragenter', 'dragover', 'dragleave', 'drop']) {
      win.addEventListener(t, onEditDrag, cap);
      win.addEventListener(t, onPreviewDrag);
    }
    // Preview checks run last (bubble phase on window) so page handlers get the first say.
    win.addEventListener('click', onPreviewClick);
    win.addEventListener('auxclick', onPreviewClick);
    win.addEventListener('submit', onPreviewSubmit);
    win.addEventListener('scroll', () => scheduleDraw(), { capture: true, passive: true });
    win.addEventListener('wheel', () => { S.userScrolled = true; }, { capture: true, passive: true });
    win.addEventListener('resize', () => scheduleDraw());
    d.addEventListener('selectionchange', onSelectionChange);
  }

  /* ------------------------------------------------------------------ */
  /* Iframe events: clicks, links, forms, menus, keys, clipboard, drops  */
  /* ------------------------------------------------------------------ */

  function onEditClick(e) {
    if (HE.mode !== 'edit') return;
    e.preventDefault();
    e.stopPropagation();
  }

  function leavesPage(a) {
    const href = (a.getAttribute('href') || '').trim();
    if (/^javascript:/i.test(href)) return false;
    if (href.startsWith('#')) return a.getAttribute('target') === '_blank';
    return true;
  }

  function previewToast() {
    const now = Date.now();
    if (now - S.previewToastAt < 2000) return;
    S.previewToastAt = now;
    HE.ui.toast(t('預覽時不會離開這個頁面'));
  }

  function onPreviewClick(e) {
    if (HE.mode !== 'preview' || e.defaultPrevented) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = (a.getAttribute('href') || '').trim();
    if (href.startsWith('#') && a.getAttribute('target') !== '_blank') {
      // A bare fragment in about:srcdoc resolves against the editor's URL and would load the editor into the canvas.
      e.preventDefault();
      if (e.type !== 'click' || e.button !== 0) return;
      const win = a.ownerDocument.defaultView;
      try {
        if (href === '#' || href === '#top') win.scrollTo(0, 0);
        const before = win.location.href;
        win.location.hash = href.slice(1);
        if (href.length > 1 && win.location.href === before) {
          // Same fragment as the URL: the hash setter does nothing, but a link click scrolls there again.
          const d = a.ownerDocument;
          const find = (k) => d.getElementById(k) || Array.from(d.getElementsByName(k)).find((n) => n.localName === 'a');
          let t = find(href.slice(1));
          if (!t) try { t = find(decodeURIComponent(href.slice(1))); } catch (err) { /* malformed escape */ }
          if (t) t.scrollIntoView();
        }
      } catch (err) { /* detached */ }
      return;
    }
    if (!leavesPage(a)) return;
    e.preventDefault();
    previewToast();
  }

  function onEditSubmit(e) {
    if (HE.mode !== 'edit') return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onPreviewSubmit(e) {
    if (HE.mode !== 'preview' || e.defaultPrevented) return;
    e.preventDefault();
    previewToast();
  }

  function onContextMenu(e) {
    if (HE.mode !== 'edit') return;
    if (S.editEl && S.editEl.contains(e.target)) return; // native menu while typing (spelling, paste)
    e.preventDefault();
    e.stopPropagation();
    if (S.g) cancelGesture();
    const id = pickId(e.target);
    if (id && !HE.sel.has(id)) HE.sel.set([id]);
    else if (!id) HE.sel.clear();
    const p = toPage(e.clientX, e.clientY);
    if (HE.contextmenu && typeof HE.contextmenu.open === 'function') HE.contextmenu.open(p.x, p.y, id);
  }

  function onDblClick(e) {
    if (HE.mode !== 'edit') return;
    e.preventDefault();
    e.stopPropagation();
    if (S.editEl && S.editEl.contains(e.target)) return; // native word selection while typing
    if (S.pending) {
      // This frame is about to be replaced: edit the text once the new one is up.
      const r = identified(e.target);
      const pid = r && !isPageRoot(r) ? idOf(climb(r)) : null;
      if (pid && util.isTextEditable(HE.doc.byId(pid)) && !refuseBusy()) { HE.sel.set([pid]); editWhenReady(pid); }
      return;
    }
    const raw = identified(e.target);
    if (!raw || isPageRoot(raw)) return;
    const el = climb(raw);
    const id = idOf(el);
    if (!id) return;
    if (util.isTextEditable(HE.doc.byId(id))) {
      startTextEdit(id, { point: { x: e.clientX, y: e.clientY } });
      return;
    }
    if (util.tag(el) === 'img') {
      if (refuseBusy()) return;
      HE.sel.set([id]);
      if (HE.inspector && typeof HE.inspector.replaceImage === 'function') HE.inspector.replaceImage(id);
      return;
    }
    // Drill down into a container: the deepest identified element under the pointer.
    if (raw !== el) HE.sel.set([idOf(raw)]);
  }

  /** In preview only app-level shortcuts reach the editor, so the page keeps copy/paste and typing. */
  function forwardInPreview(e) {
    const c = util.combo(e);
    if (c === 'alt+p') return true;
    return c.startsWith('mod+') && !/^mod\+(shift\+)?(c|x|v|a|f)$/.test(c);
  }

  function onFrameKey(e) {
    if (S.g) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelGesture(); }
      return;
    }
    const composing = e.isComposing || e.keyCode === 229; // IME composition (Enter confirms the candidate)
    if (S.editEl) {
      e.stopPropagation(); // page key handlers (slide decks) must not see typing; the browser still inserts it
      if (composing) return;
      if (editKey(e)) { e.preventDefault(); return; }
      HE.keys.handle(e);
      return;
    }
    if (composing) return;
    if (HE.mode === 'edit' || forwardInPreview(e)) HE.keys.handle(e);
  }

  function onPaste(e) {
    if (!S.editEl || !S.editEl.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (text) insertPlainText(text);
  }

  function onDragStart(e) {
    if (HE.mode !== 'edit') return;
    if (S.editEl && S.editEl.contains(e.target)) return;
    e.preventDefault();
  }

  function hasFiles(e) {
    const types = e.dataTransfer && e.dataTransfer.types;
    return !!types && Array.from(types).includes('Files');
  }

  /** Re-dispatch a file drag on the canvas host so editor-level drop handlers (open file) still see it. */
  function forwardDrag(e) {
    if (!S.host || typeof DragEvent !== 'function') return;
    try {
      const p = toPage(e.clientX, e.clientY);
      S.host.dispatchEvent(new DragEvent(e.type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, dataTransfer: e.dataTransfer }));
    } catch (err) { /* DragEvent with a foreign dataTransfer is not constructible here */ }
  }

  function onEditDrag(e) {
    if (HE.mode !== 'edit') return;
    e.preventDefault();
    e.stopPropagation();
    if (hasFiles(e)) forwardDrag(e);
  }

  function onPreviewDrag(e) {
    // Dropping a file would navigate the iframe away from the page.
    if (HE.mode !== 'preview' || e.defaultPrevented || !hasFiles(e)) return;
    e.preventDefault();
    forwardDrag(e);
  }

  /* ------------------------------------------------------------------ */
  /* Pointer: hover, selection, gestures                                 */
  /* ------------------------------------------------------------------ */

  function setHover(id) {
    if (S.hoverId === id) return;
    S.hoverId = id;
    HE.emit('hover:changed', { id });
    scheduleDraw();
  }

  function blurEditorInput() {
    const a = document.activeElement;
    if (a && a !== document.body && a !== S.frame && util.isTypingTarget(a)) a.blur();
  }

  function onDown(e) {
    if (HE.ui.menuOpen()) HE.ui.closeMenus();
    if (HE.mode !== 'edit') return;
    e.stopPropagation();
    if (S.editEl && S.editEl.contains(e.target)) return; // caret placement and selection while typing
    if (S.editingId) endTextEdit(true);
    blurEditorInput();
    stopFxDemo(); // a gesture must measure the element where the author put it
    if (e.button !== 0) { if (e.button === 1) e.preventDefault(); return; }
    e.preventDefault(); // no native text selection, no focus change
    if (S.g) return;
    notePress({ x: e.clientX, y: e.clientY });
    const id = pickId(e.target);
    if (!id) { if (!e.shiftKey) HE.sel.clear(); return; }
    if (e.shiftKey) { HE.sel.toggle(id); return; }
    let reduceTo = null;
    if (HE.sel.has(id) && HE.sel.ids.length > 1) { HE.sel.add(id); reduceTo = id; } else HE.sel.set([id]);
    S.g = { kind: 'press', id, reduceTo, alt: e.altKey, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, model: HE.doc.model };
    setHolding(true);
  }

  /** While the button is down on an element in free move, the page's hand is closed. */
  function setHolding(on) {
    on = !!on && S.moveMode === 'free';
    if (on === !!S.holding) return;
    S.holding = on;
    refreshEditorCSS();
  }

  /**
   * Remember a left press (iframe coords); true when it completes a double-click. The chip lives in the
   * editor document, so a press on it never reaches the iframe's own dblclick.
   */
  function notePress(p) {
    const now = Date.now();
    const last = S.lastPress;
    const dbl = !!last && now - last.t < 500 && Math.hypot(p.x - last.x, p.y - last.y) < 6;
    S.lastPress = dbl ? null : { t: now, x: p.x, y: p.y };
    return dbl;
  }

  /** A press on the selection chip that never became a drag: a click on the page beneath it. */
  function chipClick(g) {
    let hit = null;
    try { hit = HE.live.doc ? HE.live.doc.elementFromPoint(g.x, g.y) : null; } catch (e) { hit = null; }
    const id = hit ? pickId(hit) : null;
    if (!id) { if (!g.shift) HE.sel.clear(); return; }
    if (g.shift) { HE.sel.toggle(id); return; }
    if (g.dbl && util.isTextEditable(HE.doc.byId(id))) { startTextEdit(id, { point: { x: g.x, y: g.y } }); return; }
    HE.sel.set([id]);
  }

  function onFrameMove(e) {
    if (S.g) { onMove(e, true); return; }
    if (HE.mode !== 'edit') return;
    const id = pickId(e.target);
    setHover(id && id !== S.editingId ? id : null);
  }

  function onFrameUp(e) {
    if (S.g) onUp(e, true);
    if (HE.mode === 'edit') e.stopPropagation();
  }

  function onMove(e, fromFrame) {
    const g = S.g;
    if (!g) return;
    const p = toFrame(e, fromFrame);
    if (e.buttons === 0) { endGesture(p, g.kind !== 'insert'); return; } // released outside every window
    g.x = p.x;
    g.y = p.y;
    g.shift = e.shiftKey;
    if (g.kind === 'press') {
      if (Math.hypot(p.x - g.startX, p.y - g.startY) < DRAG_THRESHOLD) return;
      if (e.altKey) g.alt = true;
      if (!beginMove(g)) { S.g = null; return; }
    }
    if (e.cancelable) e.preventDefault();
    updateGesture();
  }

  function onUp(e, fromFrame) {
    if (!S.g || e.button !== 0) return;
    if (e.cancelable) e.preventDefault();
    endGesture(toFrame(e, fromFrame), true);
  }

  function showShield(on, cursor) {
    if (!S.shield) return;
    S.shield.hidden = !on;
    S.shield.style.cursor = on ? cursor || '' : '';
    document.documentElement.classList.toggle('cv-dragging', !!on);
  }

  function showGhost(text) {
    if (!S.ghost) return;
    S.ghost.textContent = text;
    S.ghost.hidden = false;
    moveGhost();
  }

  function moveGhost() {
    const g = S.g;
    if (!g || !S.ghost || S.ghost.hidden) return;
    const p = toPage(g.x, g.y);
    S.ghost.style.transform = 'translate(' + Math.round(p.x + 14) + 'px,' + Math.round(p.y + 12) + 'px)';
  }

  function endGesture(p, commit) {
    const g = S.g;
    if (!g) return;
    S.g = null;
    if (p) { g.x = p.x; g.y = p.y; }
    // The document was replaced mid-gesture (load, AI): drop the gesture without writing.
    const ok = commit && g.model === HE.doc.model;
    try {
      if (g.kind === 'press') {
        if (ok && g.chip) chipClick(g);
        else if (ok && g.reduceTo) HE.sel.set([g.reduceTo]);
      }
      else if (g.kind === 'move') finishMove(g, ok);
      else if (g.kind === 'resize') finishResize(g, ok);
      else if (g.kind === 'insert') finishInsert(g, ok);
    } finally {
      stopAutoScroll();
      showShield(false);
      setHolding(false);
      if (S.ghost) S.ghost.hidden = true;
      drawDrop(null);
      scheduleDraw();
    }
  }

  function cancelGesture() { endGesture(null, false); }

  function updateGesture() {
    const g = S.g;
    if (!g) return;
    if (g.kind === 'move') {
      const { dx, dy } = gestureDelta(g);
      if (g.mode === 'free') {
        g.els.forEach((el, i) => {
          const f = g.free[i];
          if (!f) return;
          Object.assign(el.style, freeStyles(f, f.fixed ? g.x - g.startX : dx, f.fixed ? g.y - g.startY : dy));
        });
      } else if (g.mode === 'nudge') {
        g.els.forEach((el, i) => { el.style.translate = translateValue(g.start[i], dx, dy); });
      } else {
        updateDrop();
        moveGhost();
      }
      scheduleDraw();
    } else if (g.kind === 'resize') {
      applyResize(g);
    } else if (g.kind === 'insert') {
      updateDrop();
      moveGhost();
    }
  }

  /** Pointer travel since the gesture began, including page scroll in between. */
  function gestureDelta(g) {
    let sx = 0, sy = 0;
    try {
      const win = S.frame.contentWindow;
      sx = win.scrollX - g.scroll0.x;
      sy = win.scrollY - g.scroll0.y;
    } catch (e) { /* frame gone */ }
    return { dx: g.x - g.startX + sx, dy: g.y - g.startY + sy };
  }

  /* ---------------- move ---------------- */

  function beginMove(g) {
    if (S.editingId || !S.frame || S.pending || refuseBusy()) return false;
    const pid = HE.sel.primary || g.id;
    const pm = HE.doc.byId(pid);
    if (!pm || HE.doc.isRoot(pm)) return false;
    let ids = [pid];
    const all = HE.sel.ids.filter((id) => { const m = HE.doc.byId(id); return m && !HE.doc.isRoot(m); });
    if (all.length > 1 && all.every((id) => HE.doc.byId(id).parentNode === pm.parentNode)) ids = docOrder(all);
    ids = ids.filter((id) => HE.live.byId(id));
    if (!ids.length) return false;
    const els = ids.map((id) => HE.live.byId(id));
    const ps = styleOf(HE.live.byId(pid) || els[0]);
    if (!ps) return false;
    const win = S.frame.contentWindow;
    g.kind = 'move';
    g.ids = ids;
    g.els = els;
    g.pid = pid;
    g.saved = els.map((el) => el.getAttribute('style'));
    g.scroll0 = { x: win.scrollX, y: win.scrollY };
    const positioned = ps.position === 'absolute' || ps.position === 'fixed';
    const freeMode = S.moveMode === 'free';
    // In free mode Alt asks for the reorder instead; a positioned element keeps moving by its own offsets.
    let shift = freeMode ? !g.alt && !positioned : !!g.alt;
    // `translate` does nothing to an inline box (a link or a span in a sentence): reorder it, and say why.
    if (shift && freeMode && ps.display === 'inline') {
      shift = false;
      HE.ui.status(t('句子裡的文字不能自由移動，這次拖曳會換順序'));
    }
    if (shift) {
      g.mode = 'nudge';
      g.start = els.map((el) => parseTranslate((styleOf(el) || {}).translate));
      showShield(true, 'grabbing');
    } else if (positioned && !(freeMode && g.alt)) {
      g.mode = 'free';
      g.free = els.map((el) => {
        const s = styleOf(el);
        if (!s || (s.position !== 'absolute' && s.position !== 'fixed')) return null;
        return {
          left: startOffset(el, s, 'left'), top: startOffset(el, s, 'top'),
          right: parseFloat(s.right) || 0, bottom: parseFloat(s.bottom) || 0,
          pin: pinsOf(el), fixed: s.position === 'fixed',
        };
      });
      showShield(true, 'grabbing');
    } else {
      g.mode = 'flow';
      g.dragTag = util.tag(els[0]);
      // Editor-only, gesture-long: let hit testing see through the dragged elements.
      els.forEach((el) => { el.style.pointerEvents = 'none'; el.style.opacity = '0.45'; });
      showShield(true, 'grabbing');
      const name = modelLabel(pid);
      showGhost(ids.length > 1 ? t('{name} 等 {n} 個', { name, n: ids.length }) : name);
      startAutoScroll();
      if (!freeMode && !S.moveHinted) {
        S.moveHinted = true;
        HE.ui.status(t('拖曳會換順序。要放到任意位置，按住 Alt 拖曳，或在工具列切換到「自由移動」'));
      }
    }
    setHover(null);
    return true;
  }

  function finishMove(g, commit) {
    const target = commit && g.mode === 'flow' ? computeDrop(g.x, g.y, g.els, g.dragTag) : null;
    g.els.forEach((el, i) => restoreStyle(el, g.saved[i]));
    if (!commit) return;
    const { dx, dy } = gestureDelta(g);
    if (g.mode === 'free') {
      if (!dx && !dy) return;
      HE.history.transact(t('移動位置'), () => {
        g.els.forEach((el, i) => {
          const f = g.free[i];
          if (!f) return;
          const mx = f.fixed ? g.x - g.startX : dx;
          const my = f.fixed ? g.y - g.startY : dy;
          HE.ops.setStyle(g.ids[i], freeStyles(f, mx, my), { label: t('移動位置') });
        });
      });
    } else if (g.mode === 'nudge') {
      if (!dx && !dy) return;
      HE.history.transact(t('微調位置'), () => {
        g.ids.forEach((id, i) => HE.ops.setStyle(id, { translate: translateValue(g.start[i], dx, dy) }, { label: t('微調位置') }));
      });
    } else if (target) {
      moveGroup(g.ids, target.refId, target.position);
    }
  }

  function moveGroup(ids, refId, position) {
    if (!refId || ids.includes(refId)) return;
    const label = ids.length > 1 ? t('移動 {n} 個元素', { n: ids.length }) : t('移動');
    HE.history.transact(label, () => {
      let anchor = refId;
      for (const id of ids) {
        HE.ops.move(id, anchor, position, { label });
        if (position === 'after') anchor = id; // keep the group's order
      }
    });
  }

  /* ---------------- resize ---------------- */

  function canResize(el) {
    if (!el || isPageRoot(el)) return false;
    const s = styleOf(el);
    if (!s || s.display === 'none' || s.display === 'contents') return false;
    return s.display !== 'inline' || ATOMIC.has(util.tag(el));
  }

  function startChipDrag(e) {
    if (e.button !== 0 || HE.mode !== 'edit' || S.g) return;
    e.preventDefault();
    e.stopPropagation();
    if (HE.ui.menuOpen()) HE.ui.closeMenus();
    if (S.editingId) endTextEdit(true);
    blurEditorInput();
    stopFxDemo();
    const id = HE.sel.primary;
    if (!id || !HE.live.byId(id)) return;
    const p = toFrame(e, false);
    // Only a drag moves the selection; a plain click goes to the page under the chip (chipClick).
    S.g = { kind: 'press', chip: true, dbl: notePress(p), shift: e.shiftKey, id, reduceTo: null, alt: e.altKey, startX: p.x, startY: p.y, x: p.x, y: p.y, model: HE.doc.model };
  }

  function startResize(e, dir) {
    if (e.button !== 0 || HE.mode !== 'edit' || aiBusy() || S.editingId || S.g || S.pending) return;
    const id = HE.sel.primary;
    const el = HE.live.byId(id);
    if (!el || !canResize(el)) return;
    e.preventDefault();
    e.stopPropagation();
    stopFxDemo();
    const s = styleOf(el);
    const r = el.getBoundingClientRect();
    const p = toFrame(e, false);
    const positioned = s.position === 'absolute' || s.position === 'fixed';
    S.g = {
      kind: 'resize', dir, id, el, model: HE.doc.model, saved: el.getAttribute('style'),
      startX: p.x, startY: p.y, x: p.x, y: p.y, shift: e.shiftKey,
      w0: parseFloat(s.width) || r.width, h0: parseFloat(s.height) || r.height,
      positioned, left0: positioned ? startOffset(el, s, 'left') : 0, top0: positioned ? startOffset(el, s, 'top') : 0,
      right0: positioned ? parseFloat(s.right) || 0 : 0, bottom0: positioned ? parseFloat(s.bottom) || 0 : 0,
      pin: positioned ? pinsOf(el) : null,
      img: util.tag(el) === 'img', result: null, dims: null,
    };
    showShield(true, HANDLE_CURSORS[dir]);
    setHover(null);
    scheduleDraw();
  }

  function applyResize(g) {
    const dx = g.x - g.startX, dy = g.y - g.startY;
    const hasE = g.dir.includes('e'), hasW = g.dir.includes('w');
    const hasN = g.dir.includes('n'), hasS = g.dir.includes('s');
    let w = g.w0, hgt = g.h0;
    if (hasE) w = g.w0 + dx;
    if (hasW) w = g.w0 - dx;
    if (hasS) hgt = g.h0 + dy;
    if (hasN) hgt = g.h0 - dy;
    w = Math.max(4, w);
    hgt = Math.max(4, hgt);
    const corner = (hasE || hasW) && (hasN || hasS);
    if (g.img && corner && !g.shift && g.w0 > 0 && g.h0 > 0) {
      const ratio = g.w0 / g.h0;
      if (Math.abs(w - g.w0) / g.w0 >= Math.abs(hgt - g.h0) / g.h0) hgt = w / ratio; else w = hgt * ratio;
    }
    w = Math.round(w);
    hgt = Math.round(hgt);
    const styles = {};
    if (hasE || hasW) styles.width = w + 'px';
    if (hasN || hasS) styles.height = hgt + 'px';
    // A positioned element grows away from the dragged edge, like a shape on a slide; the inset it is
    // anchored by moves with the dragged edge (a right-anchored box keeps its right edge on a 'w' drag).
    if (g.positioned) {
      const pin = g.pin;
      if (hasW && (pin.l || !pin.r)) styles.left = px(g.left0 + g.w0 - w);
      if (hasN && (pin.t || !pin.b)) styles.top = px(g.top0 + g.h0 - hgt);
      if (hasE && pin.r) styles.right = px(g.right0 - (w - g.w0));
      if (hasS && pin.b) styles.bottom = px(g.bottom0 - (hgt - g.h0));
    }
    for (const [k, v] of Object.entries(styles)) g.el.style.setProperty(k, v);
    g.result = styles;
    g.dims = { w, h: hgt };
    scheduleDraw();
  }

  function finishResize(g, commit) {
    restoreStyle(g.el, g.saved);
    if (commit && g.result) HE.ops.setStyle(g.id, g.result, { label: t('調整大小') });
  }

  /* ---------------- insert from the insert panel ---------------- */

  function beginInsertDrag(html, ev) {
    if (!S.frame || !html || refuseBusy()) return false;
    if (HE.mode !== 'edit') HE.setMode('edit');
    if (S.g) cancelGesture();
    if (S.editingId) endTextEdit(true);
    const frag = util.fragment(String(html), document);
    const first = frag.firstElementChild;
    const p = ev && ev.clientX != null ? toFrame(ev, false) : { x: -1, y: -1 };
    S.g = { kind: 'insert', html: String(html), frag, dragTag: first ? util.tag(first) : 'div', x: p.x, y: p.y, startX: p.x, startY: p.y, model: HE.doc.model };
    showShield(true, 'copy');
    showGhost(t('插入 {name}', { name: first ? util.label(first) : t('區塊', null, 'noun') }));
    setHover(null);
    startAutoScroll();
    updateDrop();
    return true;
  }

  function finishInsert(g, commit) {
    if (!commit || !S.frame) return;
    if (!inShown(g.x, g.y)) return; // dropped outside the shown frame: cancel
    const drop = computeDrop(g.x, g.y, [], g.dragTag, g.frag);
    let ids = null;
    if (drop) ids = HE.ops.insertHTML(drop.refId, drop.position, g.html, { label: t('插入元素') });
    else if (HE.live.doc && HE.live.doc.body && util.canContain(HE.live.doc.body, g.frag)) ids = HE.ops.insertHTML(null, 'append', g.html, { label: t('插入元素') });
    if (ids && ids.length) {
      HE.sel.set(ids);
      flash(ids);
    }
  }

  /* ---------------- auto-scroll near the frame edges ---------------- */

  function startAutoScroll() { if (!S.asRaf) S.asRaf = requestAnimationFrame(autoScrollTick); }
  function stopAutoScroll() { if (S.asRaf) cancelAnimationFrame(S.asRaf); S.asRaf = 0; }
  function autoScrollTick() {
    S.asRaf = 0;
    const g = S.g;
    if (!g || !(g.kind === 'insert' || (g.kind === 'move' && g.mode === 'flow')) || !S.frame) return;
    const win = S.frame.contentWindow;
    // Edge zones of the part of the frame the stage shows (a foldable can be taller than the stage).
    const s = shownRect();
    const edge = Math.min(48, (s.bottom - s.top) / 5);
    const inX = g.x >= s.left && g.x <= s.right;
    let dy = 0;
    if (inX && g.y < s.top + edge && g.y > s.top - 40) dy = -(s.top + edge - g.y);
    else if (inX && g.y > s.bottom - edge && g.y < s.bottom + 40) dy = g.y - (s.bottom - edge);
    if (dy) {
      const step = Math.sign(dy) * util.clamp(Math.abs(dy) / 2.5, 2, 24);
      // Reveal the part of the frame the stage hides on that side first, then scroll the page.
      const vp = S.viewport, vpBefore = vp.scrollTop;
      if ((step < 0 && s.top > 0) || (step > 0 && s.bottom < win.innerHeight)) vp.scrollTop += step;
      const moved = vp.scrollTop - vpBefore;
      if (moved) {
        g.y += moved; // the frame moved under a still pointer
        updateDrop();
      } else {
        const before = win.scrollY;
        win.scrollBy(0, step);
        if (win.scrollY !== before) updateDrop();
      }
    }
    S.asRaf = requestAnimationFrame(autoScrollTick);
  }

  /* ------------------------------------------------------------------ */
  /* Drop targets for flow reorder and insert drags                      */
  /* ------------------------------------------------------------------ */

  function updateDrop() {
    const g = S.g;
    if (!g) return;
    g.target = computeDrop(g.x, g.y, g.kind === 'move' ? g.els : [], g.dragTag, g.frag);
    drawDrop(g.target);
  }

  /** Main axis along which `el` sits among its siblings: 'x' (row) or 'y' (column). */
  function axisFor(el) {
    const parent = el.parentElement;
    const ps = parent && styleOf(parent);
    const s = styleOf(el);
    if (!ps || !s) return 'y';
    if (/flex/.test(ps.display)) return /^row/.test(ps.flexDirection) ? 'x' : 'y';
    if (/grid/.test(ps.display)) {
      const cols = (ps.gridTemplateColumns || '').trim();
      return cols && cols !== 'none' && cols.split(/\s+/).length > 1 ? 'x' : 'y';
    }
    if (ps.display === 'table-row') return 'x';
    if (/^inline/.test(s.display) || (s.cssFloat || s.float || 'none') !== 'none') return 'x';
    return 'y';
  }

  /** Whether DOM order runs right-to-left / bottom-to-top along `axis` (reversed flex, RTL rows). */
  function reversedAxis(el, axis) {
    const ps = el.parentElement && styleOf(el.parentElement);
    if (!ps) return false;
    let rev = /flex/.test(ps.display) && /-reverse$/.test(ps.flexDirection);
    if (axis === 'x' && ps.direction === 'rtl') rev = !rev;
    return rev;
  }

  function isExcluded(node, excluded) { return excluded.some((ex) => ex === node || ex.contains(node)); }

  function dropChildren(el, excluded) {
    return Array.from(el.children).filter((c) => c.hasAttribute(ID) && !NON_VISUAL.has(util.tag(c)) &&
      !isExcluded(c, excluded) && (() => { const r = elRect(c); return !!r && (r.width > 0 || r.height > 0); })());
  }

  function isContainer(el) {
    const t = util.tag(el);
    if (ATOMIC.has(t) || util.isVoid(el) || util.isTextEditable(el)) return false;
    const s = styleOf(el);
    return !!s && s.display !== 'inline' && s.display !== 'contents' && s.display !== 'none';
  }

  function isEmptyContainer(el) {
    const t = util.tag(el);
    if (el.children.length || ATOMIC.has(t) || util.isVoid(el) || PHRASING_ONLY.has(t) || (TABLE_PARTS.has(t) && !CELLS.has(t))) return false;
    const s = styleOf(el);
    if (!s || /^inline/.test(s.display) || s.display === 'none' || s.display === 'contents') return false;
    return !(el.textContent || '').trim();
  }

  function nearest(kids, x, y) {
    let best = null, bestD = Infinity;
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  function neighbour(el, position, excluded) {
    let n = position === 'before' ? el.previousElementSibling : el.nextElementSibling;
    while (n && (!n.hasAttribute(ID) || NON_VISUAL.has(util.tag(n)) || isExcluded(n, excluded) || !elRect(n))) {
      n = position === 'before' ? n.previousElementSibling : n.nextElementSibling;
    }
    return n;
  }

  /** before/after `el`, with the indicator centred in the gap to its neighbour when they sit close. */
  function edgeDrop(el, position, axis, excluded) {
    const r = el.getBoundingClientRect();
    const vb = (position === 'before') !== reversedAxis(el, axis); // the line goes on the left / top edge
    const line = axis === 'x'
      ? { x: (vb ? r.left : r.right) - 1, y: r.top, w: 2, h: r.height }
      : { x: r.left, y: (vb ? r.top : r.bottom) - 1, w: r.width, h: 2 };
    const sib = neighbour(el, position, excluded || []);
    if (sib) {
      const s = sib.getBoundingClientRect();
      if (axis === 'y') {
        const gap = vb ? r.top - s.bottom : s.top - r.bottom;
        if (gap > 0 && gap < 48) line.y = (vb ? s.bottom : r.bottom) + gap / 2 - 1;
      } else {
        const gap = vb ? r.left - s.right : s.left - r.right;
        if (gap > 0 && gap < 48) line.x = (vb ? s.right : r.right) + gap / 2 - 1;
      }
    }
    return { refEl: el, refId: idOf(el), position, axis, line };
  }

  function sideOf(el, x, y) {
    const r = el.getBoundingClientRect();
    const axis = axisFor(el);
    let before = axis === 'x' ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
    if (reversedAxis(el, axis)) before = !before;
    return { axis, position: before ? 'before' : 'after' };
  }

  /** An element of the same kind as the dragged one (tag and class) at or above `el`: a card over a card reorders, never nests. */
  function peerOf(el, excluded) {
    const src = excluded && excluded[0];
    if (!src || !el) return null;
    const cls = src.getAttribute('class') || '';
    for (let a = el; a && a !== a.ownerDocument.body; a = a.parentElement) {
      if (a.tagName !== src.tagName || (a.getAttribute('class') || '') !== cls) continue;
      // Without a class, "same kind" is too loose (any wrapper div): only siblings count.
      if (!cls && a.parentElement !== src.parentElement) continue;
      if (a.hasAttribute(ID) && !isExcluded(a, excluded)) return a;
    }
    return null;
  }

  /**
   * Where a drop at (x, y) (iframe client coords) would land, or null.
   * `excluded`: live elements being dragged; `dragTag`: tag of the dragged/inserted element;
   * `payload`: the fragment being inserted (insert drags).
   */
  function computeDrop(x, y, excluded, dragTag, payload) {
    const t = dropAt(x, y, excluded, dragTag);
    return t && fitDrop(t, excluded.length ? excluded : [payload || dragTag], excluded);
  }

  /**
   * Keep a drop the HTML content model allows (no block in a <p>, no <p> between <li>s): otherwise the
   * same position relative to the nearest ancestor that takes every dragged item, or null.
   */
  function fitDrop(t, items, excluded) {
    // Reordering inside the item's own parent keeps whatever that parent already holds.
    const parentFor = (ref, pos) => (pos === 'before' || pos === 'after' ? ref.parentElement : ref);
    const fits = (ref, pos) => items.every((it) => (it.nodeType === 1 && it.parentElement === parentFor(ref, pos)) || util.canPlace(ref, pos, it));
    if (fits(t.refEl, t.position)) return t;
    const d = HE.live.doc;
    const sibling = t.position === 'before' || t.position === 'after';
    for (let a = identified(t.refEl.parentElement); a && a !== d.documentElement && !d.head.contains(a); a = identified(a.parentElement)) {
      if (sibling && a === d.body) break;
      if (!fits(a, t.position)) continue;
      if (sibling) return edgeDrop(a, t.position, axisFor(a), excluded);
      return { refEl: a, refId: idOf(a), position: t.position, box: a.getBoundingClientRect() };
    }
    return null;
  }

  function dropAt(x, y, excluded, dragTag) {
    const d = HE.live.doc;
    if (!d || !d.body) return null;
    if (!inShown(x, y)) return null; // outside the frame, or on a part of it the stage hides
    const hit = d.elementFromPoint(x, y);

    // Table parts only move among their own kind (a row among rows, a cell among cells).
    if (TABLE_PARTS.has(dragTag)) {
      const c = hit && hit.closest ? hit.closest(CELLS.has(dragTag) ? 'td, th' : dragTag) : null;
      if (!c || !c.hasAttribute(ID) || isExcluded(c, excluded)) return null;
      const side = sideOf(c, x, y);
      return edgeDrop(c, side.position, side.axis, excluded);
    }

    let el = identified(hit);
    while (el && isExcluded(el, excluded)) {
      const ex = excluded.find((n) => n === el || n.contains(el));
      el = identified(ex.parentElement);
    }
    if (!el || el === d.documentElement || d.head.contains(el)) el = d.body;
    if (el !== d.body) el = climb(el);
    if (el !== d.body && TABLE_PARTS.has(util.tag(el)) && !CELLS.has(util.tag(el))) {
      el = identified(el.closest('table')) || d.body;
    }

    const peer = peerOf(el, excluded);
    if (peer) {
      const side = sideOf(peer, x, y);
      return checkTable(edgeDrop(peer, side.position, side.axis, excluded), excluded);
    }

    if (el === d.body || isContainer(el)) {
      if (el !== d.body) {
        const r = el.getBoundingClientRect();
        const axis = axisFor(el);
        const offset = axis === 'x' ? x - r.left : y - r.top;
        const size = axis === 'x' ? r.width : r.height;
        const zone = Math.min(14, size * 0.2);
        if (!CELLS.has(util.tag(el))) {
          const rev = reversedAxis(el, axis);
          if (offset < zone) return edgeDrop(el, rev ? 'after' : 'before', axis, excluded);
          if (size - offset < zone) return edgeDrop(el, rev ? 'before' : 'after', axis, excluded);
        }
      }
      const kids = dropChildren(el, excluded);
      if (kids.length) {
        const k = nearest(kids, x, y);
        const side = sideOf(k, x, y);
        return checkTable(edgeDrop(k, side.position, side.axis, excluded), excluded);
      }
      if (el === d.body) return { refEl: el, refId: idOf(el), position: 'append', box: el.getBoundingClientRect() };
    }

    if (isEmptyContainer(el)) {
      const r = el.getBoundingClientRect();
      const axis = axisFor(el);
      const t = axis === 'x' ? (x - r.left) / (r.width || 1) : (y - r.top) / (r.height || 1);
      if (t > 0.25 && t < 0.75) return { refEl: el, refId: idOf(el), position: 'append', box: r };
    }
    const side = sideOf(el, x, y);
    return checkTable(edgeDrop(el, side.position, side.axis, excluded), excluded);
  }

  /** Never place ordinary content between table rows or cells: fall back to before/after the table. */
  function checkTable(drop, excluded) {
    if (!drop) return null;
    const t = util.tag(drop.refEl);
    if (!TABLE_PARTS.has(t)) return drop;
    const table = identified(drop.refEl.closest('table'));
    if (!table || isExcluded(table, excluded)) return null;
    return edgeDrop(table, drop.position, axisFor(table), excluded);
  }

  function drawDrop(t) {
    const n = S.drop;
    if (!n) return;
    if (!t) { n.hidden = true; return; }
    n.hidden = false;
    if (t.position === 'append') {
      const r = t.box;
      n.className = 'cv-drop is-box';
      setBox(n, r.left + 2, r.top + 2, Math.max(8, r.width - 4), Math.max(16, r.height - 4));
    } else {
      n.className = 'cv-drop ' + (t.axis === 'x' ? 'is-v' : 'is-h');
      setBox(n, t.line.x, t.line.y, t.line.w, t.line.h);
    }
  }

  /* ------------------------------------------------------------------ */
  /* In-place text editing                                               */
  /* ------------------------------------------------------------------ */

  function caretRangeAt(d, x, y) {
    if (d.caretRangeFromPoint) return d.caretRangeFromPoint(x, y);
    if (d.caretPositionFromPoint) {
      const p = d.caretPositionFromPoint(x, y);
      if (!p || !p.offsetNode) return null;
      const r = d.createRange();
      r.setStart(p.offsetNode, p.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }

  function placeCaret(el, opts) {
    const d = el.ownerDocument;
    const s = d.getSelection();
    if (!s) return;
    let r = null;
    if (opts.point) {
      try { r = caretRangeAt(d, opts.point.x, opts.point.y); } catch (e) { r = null; }
      if (r && !el.contains(r.startContainer)) r = null;
    }
    if (!r) {
      r = d.createRange();
      r.selectNodeContents(el);
      if (!opts.selectAll) r.collapse(!!opts.atStart);
    }
    s.removeAllRanges();
    s.addRange(r);
    S.savedRange = r.cloneRange();
  }

  /** Start editing `id` once the re-render that is loading shows, if it is still the only selection then. */
  function editWhenReady(id) {
    HE.ui.status(t('畫布更新中，稍候即可編輯…'));
    const off = HE.on('canvas:ready', () => {
      off();
      if (HE.mode === 'edit' && HE.sel.ids.length === 1 && HE.sel.primary === id && HE.doc.byId(id)) startTextEdit(id, { atEnd: true });
    });
  }

  /** opts: {point:{x,y} (iframe client coords), selectAll, atStart, atEnd (default)} */
  function startTextEdit(id, opts = {}) {
    // While a re-render loads, the visible frame is about to be replaced and typing in it would be lost.
    if (HE.mode !== 'edit' || S.pending || refuseBusy()) return false;
    if (S.editingId === id) return true;
    if (S.editingId) endTextEdit(true);
    if (S.g) cancelGesture();
    const m = HE.doc.byId(id);
    const el = HE.live.byId(id);
    if (!m || !el || HE.doc.isRoot(m) || !util.isTextEditable(m) || !util.isTextEditable(el)) return false;
    if (!(HE.sel.ids.length === 1 && HE.sel.primary === id)) HE.sel.set([id]);
    S.editSaved = { contenteditable: el.getAttribute('contenteditable'), spellcheck: el.getAttribute('spellcheck') };
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-he-editing', '');
    el.setAttribute('spellcheck', 'false');
    S.editingId = id;
    S.editEl = el;
    S.editModel = HE.doc.model;
    S.editDirty = false;
    S.savedRange = null;
    try { el.ownerDocument.defaultView.focus(); } catch (e) { /* not focusable */ }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    placeCaret(el, opts);
    const s = styleOf(el);
    if (s && S.tbarColor) {
      S.tbarColor.value = rgbToHex(s.color);
      const bar = S.tbarColor.parentElement.querySelector('.cv-tf-bar');
      if (bar) bar.style.background = S.tbarColor.value;
    }
    if (S.tbar) { S.tbar.hidden = false; placeTbar(); }
    setHover(null);
    HE.emit('textedit:start', { id });
    updateTbarState();
    scheduleDraw();
    return true;
  }

  function clearEditState() {
    const el = S.editEl;
    if (el) {
      const saved = S.editSaved || {};
      restoreAttr(el, 'contenteditable', saved.contenteditable);
      restoreAttr(el, 'spellcheck', saved.spellcheck);
      el.removeAttribute('data-he-editing');
      try { const s = el.ownerDocument.getSelection(); if (s) s.removeAllRanges(); } catch (e) { /* gone */ }
    }
    S.editingId = null;
    S.editEl = null;
    S.editSaved = null;
    S.savedRange = null;
    S.editDirty = false;
    if (S.tbar) S.tbar.hidden = true;
    return el;
  }

  /**
   * Finish in-place editing: commit the live content into the model, or revert the live element. Only
   * when the user changed the text: a page script changing the element on its own (compat mode) makes
   * no undo step, and the frame keeps what it did.
   */
  function endTextEdit(commit = true) {
    const id = S.editingId;
    if (!id) return false;
    const sameDoc = S.editModel === HE.doc.model;
    const dirty = S.editDirty;
    const caret = caretOffset();
    const el = clearEditState();
    S.editModel = null;
    let changed = false;
    // When the model was replaced (new file, whole-document op) the live edit no longer maps to it.
    if (sameDoc && el && el.isConnected) {
      if (!commit) HE.ops.syncLive(id);
      else if (dirty) changed = HE.ops.commitLiveContent(id, { label: t('編輯文字') });
    }
    HE.emit('textedit:end', { id, changed, caret: sameDoc && commit ? caret : null });
    scheduleDraw();
    return changed;
  }

  /**
   * Where the caret (the end of the selection) is in the text being edited: how many characters of the element's
   * text come before it, or null. Read as editing ends, so that what is inserted next can go where the user was.
   */
  function caretOffset() {
    const el = S.editEl, r = S.savedRange;
    if (!el || !r || !el.contains(r.endContainer)) return null;
    try {
      const before = el.ownerDocument.createRange();
      before.selectNodeContents(el);
      before.setEnd(r.endContainer, r.endOffset);
      return before.toString().length;
    } catch (e) { return null; }
  }

  /** Put the text typed so far into the model and keep editing (the page is being hidden or closed). */
  function saveTextEdit() {
    if (!S.editingId || !S.editDirty || S.editModel !== HE.doc.model) return false;
    S.editDirty = false;
    return HE.ops.commitLiveContent(S.editingId, { label: t('編輯文字') });
  }

  /** Drop the editing state without touching either DOM (the live element is gone or stale). */
  function abandonTextEdit() {
    const id = S.editingId;
    if (!id) return;
    clearEditState();
    S.editModel = null;
    HE.emit('textedit:end', { id, changed: false });
    scheduleDraw();
  }

  function isEditingText() { return !!S.editingId; }
  /** A press, move, resize or insert drag is under way (fileio holds a reload from disk until it ends). */
  function isGesturing() { return !!S.g; }

  function editKey(e) {
    const c = util.combo(e);
    if (c === 'escape' || c === 'mod+enter') { endTextEdit(true); return true; }
    if (c === 'shift+enter') { lineBreak(); return true; }
    if (c === 'enter') {
      if (SPLIT_TAGS.has(util.tag(S.editEl))) splitParagraph(); else endTextEdit(true);
      return true;
    }
    return false;
  }

  function lineBreak() {
    const d = S.editEl.ownerDocument;
    S.editDirty = true;
    let ok = false;
    try { ok = d.execCommand('insertLineBreak'); } catch (e) { ok = false; }
    if (!ok) try { d.execCommand('insertHTML', false, '<br>'); } catch (e) { /* unsupported */ }
  }

  function insertPlainText(text) {
    const d = S.editEl.ownerDocument;
    S.editDirty = true;
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    lines.forEach((line, i) => {
      if (i) lineBreak();
      if (line) try { d.execCommand('insertText', false, line); } catch (e) { /* unsupported */ }
    });
  }

  function hasContent(node) {
    return !!((node.textContent || '').replace(/​/g, '').trim() || node.querySelector('img, br, svg, video, iframe, input'));
  }

  /** Enter splits the element like Word: the text after the caret moves into a new sibling. One undo step. */
  function splitParagraph() {
    const el = S.editEl, id = S.editingId;
    const d = el.ownerDocument;
    const s = d.getSelection();
    if (!s || !s.rangeCount || !el.contains(s.getRangeAt(0).startContainer)) { endTextEdit(true); return; }
    S.editDirty = true;
    const r = s.getRangeAt(0);
    if (!r.collapsed) r.deleteContents();
    const tail = d.createRange();
    tail.setStart(r.startContainer, r.startOffset);
    tail.setEnd(el, el.childNodes.length);
    const box = d.createElement('div');
    box.append(tail.extractContents());
    box.querySelectorAll('[' + ID + ']').forEach((n) => n.removeAttribute(ID)); // split inline parts get fresh ids
    HE.live.clean(box); // the tail goes into the model too, like a commit
    const tailHTML = hasContent(box) ? box.innerHTML : '<br>';
    if (!hasContent(el)) el.innerHTML = '<br>'; // keep the emptied paragraph visible
    const m = HE.doc.byId(id);
    let tag = util.tag(m || el);
    if (/^h[1-6]$/.test(tag)) tag = 'p';
    const cls = m && m.getAttribute('class');
    const html = '<' + tag + (cls ? ' class="' + util.esc(cls) + '"' : '') + '>' + tailHTML + '</' + tag + '>';
    let newId = null;
    HE.history.transact(t('分段'), () => {
      endTextEdit(true);
      const ids = HE.ops.insertHTML(id, 'after', html, { label: t('分段') });
      newId = ids && ids[0];
    });
    if (newId) {
      HE.sel.set([newId]);
      startTextEdit(newId, { atStart: true });
    }
  }

  function onSelectionChange() {
    if (!S.editEl) return;
    const s = S.editEl.ownerDocument.getSelection();
    if (s && s.rangeCount) {
      const r = s.getRangeAt(0);
      if (S.editEl.contains(r.commonAncestorContainer)) S.savedRange = r.cloneRange();
    }
    updateTbarState();
  }

  function restoreRange() {
    const el = S.editEl;
    if (!el) return;
    try { el.ownerDocument.defaultView.focus(); } catch (e) { /* not focusable */ }
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    if (S.savedRange && el.contains(S.savedRange.commonAncestorContainer)) {
      const s = el.ownerDocument.getSelection();
      s.removeAllRanges();
      s.addRange(S.savedRange.cloneRange());
    }
  }

  function exec(cmd, value, css) {
    const el = S.editEl;
    if (!el) return;
    const d = el.ownerDocument;
    S.editDirty = true;
    if (document.activeElement !== S.frame || d.activeElement !== el) restoreRange();
    try { d.execCommand('styleWithCSS', false, !!css); } catch (e) { /* unsupported */ }
    try { d.execCommand(cmd, false, value == null ? null : value); } catch (e) { console.warn('[HE] execCommand failed:', cmd, e); }
    updateTbarState();
    scheduleDraw();
  }

  /** The link at the caret inside the edited element, else the link around the whole element. `any` also matches <a> without href. */
  function anchorAtSelection(any) {
    const el = S.editEl;
    if (!el) return null;
    const sel = any ? 'a' : 'a[href]';
    const r = S.savedRange;
    const node = r && (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer);
    const a = node && node.closest ? node.closest(sel) : null;
    if (a && el.contains(a)) return a;
    return el.parentElement ? el.parentElement.closest(sel) : null;
  }

  async function addLink() {
    const el = S.editEl;
    if (!el) return;
    const range = S.savedRange ? S.savedRange.cloneRange() : null;
    const existing = anchorAtSelection(true);
    const cur = existing && existing.getAttribute('href');
    S.modalOpen = true;
    let url = null;
    try {
      url = await HE.ui.prompt(t('連結網址'), { title: cur != null ? t('編輯連結') : t('加入連結'), value: cur != null ? cur : 'https://', okLabel: t('套用') });
    } finally {
      S.modalOpen = false;
    }
    if (url == null || S.editEl !== el) return;
    S.savedRange = range;
    const u = url.trim();
    const caret = !range || range.collapsed;
    // execCommand on a bare caret, in the link being typed in or in a link card would nest a new link in the old one.
    if (existing && (caret || existing === el || !el.contains(existing))) {
      restoreRange();
      if (u || cur != null) setLink(existing, u);
      return;
    }
    if (!u) { exec('unlink'); return; }
    if (caret) {
      restoreRange();
      exec('insertHTML', '<a href="' + util.esc(u) + '">' + util.esc(u) + '</a>');
    } else {
      exec('createLink', u);
    }
  }

  /** Retarget an existing link, or remove it when `href` is empty. */
  function setLink(a, href) {
    // Only the content of the element being typed in is committed later, so its own attributes and a link around it go through ops.
    if (a === S.editEl || !S.editEl.contains(a)) {
      const id = a === S.editEl ? S.editingId : a.getAttribute(ID);
      if (id) HE.ops.setAttr(id, { href: href || null }, { label: href ? t('編輯連結') : t('移除連結') });
    } else {
      S.editDirty = true;
      if (href) a.setAttribute('href', href);
      else a.replaceWith(...Array.from(a.childNodes));
    }
    updateTbarState();
    scheduleDraw();
  }

  function removeLink() {
    const a = anchorAtSelection();
    if (a && (a === S.editEl || !S.editEl.contains(a) || (S.savedRange && S.savedRange.collapsed))) setLink(a, '');
    else exec('unlink');
  }

  function updateTbarState() {
    if (!S.editEl || !S.tbar || S.tbar.hidden) return;
    const d = S.editEl.ownerDocument;
    for (const [key, cmd] of FORMAT_STATES) {
      let on = false;
      try { on = d.queryCommandState(cmd); } catch (e) { on = false; }
      if (S.tf[key]) S.tf[key].setAttribute('aria-pressed', String(!!on));
    }
    if (S.tf.unlink) S.tf.unlink.disabled = !anchorAtSelection();
  }

  function placeTbar() {
    if (!S.editEl || !S.tbar || S.tbar.hidden) return;
    const r = elRect(S.editEl);
    if (!r) return;
    const fr = frameRect();
    const stage = S.host.getBoundingClientRect();
    const tw = S.tbar.offsetWidth, th = S.tbar.offsetHeight;
    const minY = Math.max(stage.top, fr.top) + 4;
    const maxY = Math.max(minY, Math.min(stage.bottom, fr.bottom) - th - 4);
    let y = fr.top + r.top - th - 8;
    if (y < minY) y = fr.top + r.bottom + 8; // no room above: flip below
    y = util.clamp(y, minY, maxY);
    const x = util.clamp(fr.left + r.left, stage.left + 4, Math.max(stage.left + 4, stage.right - tw - 4));
    S.tbar.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  /* ------------------------------------------------------------------ */
  /* Overlay drawing                                                     */
  /* ------------------------------------------------------------------ */

  function scheduleDraw() {
    if (S.raf) return;
    S.raf = requestAnimationFrame(() => { S.raf = 0; draw(); });
  }

  function draw() {
    if (!S.overlay) return;
    if (S.editEl && !S.editEl.isConnected) abandonTextEdit(); // an op replaced the element being typed in
    const edit = HE.mode === 'edit' && !!HE.live.doc;
    S.overlay.hidden = !edit;
    if (!edit) return;
    drawHover();
    drawSelection();
    drawFlashes();
    placeTbar();
    if (HE.fx && HE.fx.demoing) scheduleDraw(); // an effect preview moves the element every frame
  }

  function drawHover() {
    const id = S.highlightId || (S.g ? null : S.hoverId);
    const r = id && !HE.sel.has(id) && id !== S.editingId ? elRect(HE.live.byId(id)) : null;
    if (!r) { S.hoverBox.hidden = true; return; }
    S.hoverBox.hidden = false;
    setBox(S.hoverBox, r.left, r.top, r.width, r.height);
    if (S.hoverBox.dataset.id !== id) {
      S.hoverBox.dataset.id = id;
      S.hoverTag.textContent = modelLabel(id);
    }
    S.hoverBox.classList.toggle('tag-inside', r.top < 18);
  }

  function drawSelection() {
    const ids = HE.sel.ids;
    const primary = HE.sel.primary;
    // Measure everything before moving any box: a box written between two measurements makes the next one lay
    // the editor out again, which made a selection of a few thousand elements take many seconds to draw.
    const rects = [];
    for (const id of ids) {
      if (id === primary) continue;
      const r = elRect(HE.live.byId(id));
      if (r) rects.push(r);
    }
    const pel = primary ? HE.live.byId(primary) : null;
    const r = elRect(pel);
    let n = 0;
    for (const br of rects) {
      let b = S.boxes[n];
      if (!b) { b = S.boxes[n] = h('div', 'cv-box'); S.overlay.insertBefore(b, S.pBox); }
      b.hidden = false;
      setBox(b, br.left, br.top, br.width, br.height);
      n++;
    }
    for (let i = n; i < S.boxes.length; i++) S.boxes[i].hidden = true;

    if (!r) { S.pBox.hidden = true; return; }
    const g = S.g;
    const editing = S.editingId === primary;
    const resizing = !!(g && g.kind === 'resize');
    S.pBox.hidden = false;
    setBox(S.pBox, r.left, r.top, r.width, r.height);
    S.pBox.classList.toggle('is-editing', editing);
    S.pBox.classList.toggle('no-handles', editing || aiBusy() || (g && g.kind === 'move') || !canResize(pel));
    S.pBox.classList.toggle('is-small', r.width < 28 || r.height < 28);
    S.pBox.classList.toggle('chip-inside', r.top < 22);
    S.pLabel.hidden = editing;
    const name = modelLabel(primary);
    const dims = resizing && g.dims ? g.dims.w + ' × ' + g.dims.h : Math.round(r.width) + '×' + Math.round(r.height);
    if (S.pName.textContent !== name) S.pName.textContent = name;
    if (S.pDims.textContent !== dims) S.pDims.textContent = dims;
  }

  function drawFlashes() {
    for (const f of S.flashes) {
      const r = elRect(HE.live.byId(f.id));
      f.node.hidden = !r;
      if (r) setBox(f.node, r.left - 2, r.top - 2, r.width + 4, r.height + 4);
    }
  }

  /** Brief pulsing outline (used after AI edits). */
  function flash(ids) {
    if (!S.overlay) return;
    const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean).slice(0, 60);
    if (!list.length) return;
    const batch = list.map((id) => {
      const node = h('div', 'cv-flash');
      S.overlay.append(node);
      return { id, node };
    });
    S.flashes.push(...batch);
    scheduleDraw();
    setTimeout(() => {
      for (const f of batch) f.node.remove();
      S.flashes = S.flashes.filter((f) => !batch.includes(f));
    }, 1400);
  }

  /** Hover outline driven from outside the canvas (layers panel). */
  function highlight(id) {
    S.highlightId = id || null;
    scheduleDraw();
  }

  /**
   * Scroll the element into view inside the iframe, only when it is out of sight. While the run frame shows,
   * the edit frame is hidden under it (and the run frame cannot be scrolled from here): switch to edit mode
   * first, so the element and its selection show; with opts.stay (keyboard stepping, a move from the
   * inspector), stay in preview and only say why nothing shows.
   */
  function scrollIntoView(id, opts = {}) {
    if (HE.mode === 'preview' && (S.run || S.runPending)) {
      if (opts.stay) { HE.ui.status(HE.t('預覽中無法標示元素，切換到編輯模式即可看到')); return false; } // HE.t: this function has its own `t` below
      HE.setMode('edit');
    }
    const el = HE.live.byId(id);
    if (!el || !S.frame) return false;
    const d = el.ownerDocument;
    const win = d.defaultView;
    // Nested scroll containers first (instantly, so the window step below measures final positions).
    for (let n = el.parentElement; n && n !== d.body && n !== d.documentElement; n = n.parentElement) {
      const s = styleOf(n);
      if (!s || !/(auto|scroll|overlay)/.test(s.overflowY + ' ' + s.overflowX)) continue;
      if (n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1) continue;
      const c = n.getBoundingClientRect(), r = el.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (r.bottom <= c.top || r.top >= c.bottom) dy = r.top - c.top - Math.max(0, (c.height - r.height) / 2);
      if (r.right <= c.left || r.left >= c.right) dx = r.left - c.left - Math.max(0, (c.width - r.width) / 2);
      if (dx || dy) n.scrollBy(dx, dy);
    }
    const r = el.getBoundingClientRect();
    const vw = win.innerWidth, vh = win.innerHeight;
    const need = Math.min(24, r.height || 1);
    const behavior = reducedMotion() ? 'auto' : 'smooth';
    let dx = 0, dy = 0;
    if (!(Math.min(r.bottom, vh) - Math.max(r.top, 0) >= need) || !(r.right > 0 && r.left < vw)) {
      const se = d.scrollingElement || d.documentElement;
      const visibleX = r.right > 0 && r.left < vw;
      const top = util.clamp(win.scrollY + r.top - Math.max(16, (vh - r.height) / 2), 0, Math.max(0, se.scrollHeight - vh));
      const left = visibleX ? win.scrollX : util.clamp(win.scrollX + r.left - 16, 0, Math.max(0, se.scrollWidth - vw));
      dy = top - win.scrollY; dx = left - win.scrollX;
      win.scrollTo({ top, left, behavior });
    }
    // A foldable keeps its real size and can be larger than the stage: bring the element into the stage's view too.
    const t = r.top - dy, b = r.bottom - dy, L = r.left - dx, R = r.right - dx; // where it ends up in the frame
    const vp = S.viewport, fr = frameRect(), v = vp.getBoundingClientRect();
    const st = v.top + vp.clientTop - fr.top, sl = v.left + vp.clientLeft - fr.left; // stage corner in frame coords
    const sh = vp.clientHeight, sw = vp.clientWidth;
    let sx = 0, sy = 0;
    if (Math.min(b, vh) - Math.max(t, 0) >= need && Math.min(b, st + sh) - Math.max(t, st) < need) {
      sy = t - st - Math.max(16, (sh - (b - t)) / 2);
    }
    if (R > 0 && L < vw && (R <= sl || L >= sl + sw)) sx = L - sl - 16;
    if (sx || sy) vp.scrollBy({ left: sx, top: sy, behavior });
    return !!(dx || dy || sx || sy);
  }

  /* ------------------------------------------------------------------ */
  /* Script-generated content warning (compat mode only)                 */
  /* ------------------------------------------------------------------ */

  // Otherwise the edit frame runs no script, so everything in it is the document's own markup.
  function checkScriptContent(d) {
    if (!compatOn() || S.warnedDoc || !d.body || HE.live.doc !== d) return;
    let total = 0, bare = 0;
    const walk = (node) => {
      for (const c of node.children) {
        const t = util.tag(c);
        if (NON_VISUAL.has(t)) continue;
        total++;
        if (!c.hasAttribute(ID)) bare++;
        if (t !== 'svg' && t !== 'math') walk(c);
      }
    };
    walk(d.body);
    if (bare > 20 && bare / total > 0.4) {
      S.warnedDoc = true;
      HE.ui.toast(SCRIPT_WARNING, { action: { label: t('關閉相容模式'), fn: () => setCompat(false) }, timeout: 10000 });
    }
  }

  function onReady(data) {
    scheduleDraw();
    if (S.trustNotice) { S.trustNotice = false; noticeScripts(); }
    const d = (data && data.doc) || HE.live.doc;
    if (!d || !compatOn()) return;
    checkScriptContent(d);
    setTimeout(() => checkScriptContent(d), 1500); // content fetched or built after load
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard                                                            */
  /* ------------------------------------------------------------------ */

  function canEdit() { return HE.mode === 'edit' && !!HE.doc.model; }

  function removeSelection() {
    const ids = HE.sel.ids.filter((id) => { const m = HE.doc.byId(id); return m && !HE.doc.isRoot(m); });
    if (!ids.length) return false;
    const gone = ids.map((id) => HE.doc.byId(id));
    const isGone = (el) => gone.some((g) => g.contains(el));
    const skip = (el) => isGone(el) || NON_VISUAL.has(util.tag(el)) || !el.hasAttribute(ID);
    const pm = HE.doc.byId(ids.includes(HE.sel.primary) ? HE.sel.primary : ids[ids.length - 1]);
    let next = pm.nextElementSibling;
    while (next && skip(next)) next = next.nextElementSibling;
    if (!next) {
      next = pm.previousElementSibling;
      while (next && skip(next)) next = next.previousElementSibling;
    }
    if (!next) {
      next = pm.parentElement;
      while (next && isGone(next)) next = next.parentElement;
      if (next && HE.doc.isRoot(next)) next = null;
    }
    const nextId = next ? HE.doc.idOf(next) : null;
    HE.ops.remove(ids, { label: ids.length > 1 ? t('刪除 {n} 個元素', { n: ids.length }) : t('刪除') });
    HE.sel.set(nextId && HE.doc.byId(nextId) ? [nextId] : []);
    return true;
  }

  function registerKeys() {
    const K = HE.keys;
    K.register(['delete', 'backspace'], () => {
      if (!canEdit() || !HE.sel.ids.length) return false;
      return refuseBusy() || removeSelection();
    });
    K.register('mod+d', () => {
      if (!canEdit()) return false;
      const ids = HE.sel.ids.filter((id) => { const m = HE.doc.byId(id); return m && !HE.doc.isRoot(m); });
      if (!ids.length) return false;
      if (refuseBusy()) return true;
      const copies = HE.ops.duplicate(ids);
      if (copies && copies.length) HE.sel.set(copies);
      return true;
    });
    K.register('escape', () => {
      if (HE.ui.menuOpen()) { HE.ui.closeMenus(); return true; }
      if (!canEdit()) return false;
      const p = HE.sel.primary;
      if (!p) return false;
      const m = HE.doc.byId(p);
      const parent = m && m.parentElement;
      if (!parent || HE.doc.isRoot(m) || HE.doc.isRoot(parent)) HE.sel.clear();
      else HE.sel.set([HE.doc.idOf(parent)]);
      return true;
    });
    K.register(['enter', 'f2'], (e) => {
      if (!canEdit()) return false;
      // Enter on a focused editor control (toolbar button, layer row) keeps its own meaning.
      const t = e && e.target;
      if (e && e.key === 'Enter' && t && t.ownerDocument === document && t.closest && t.closest('button, a[href], summary, [role="button"], [role="treeitem"], [role="option"]')) return false;
      const p = HE.sel.primary;
      if (!p || !util.isTextEditable(HE.doc.byId(p))) return false;
      if (refuseBusy()) return true;
      if (S.pending) { HE.sel.set([p]); editWhenReady(p); return true; }
      return startTextEdit(p, { atEnd: true }) ? true : false;
    });
    const nudge = (dir) => {
      if (!canEdit()) return false;
      const p = HE.sel.primary;
      if (!p) return false;
      if (refuseBusy()) return true;
      if (!HE.ops.nudge(p, dir)) return false;
      scrollIntoView(p);
      return true;
    };
    K.register('alt+up', () => nudge(-1));
    K.register('alt+down', () => nudge(1));
    K.register('alt+p', () => { HE.setMode(HE.mode === 'edit' ? 'preview' : 'edit'); });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    const dev = HE.settings.get('canvas.device', 'desktop');
    S.device = DEVICES[dev] ? dev : 'desktop';
    const fold = HE.settings.get('canvas.fold', null) || {};
    S.fold = FOLDABLES[fold.model] ? fold.model : FOLD_DEFAULT;
    S.folded = fold.folded === true;
    S.scripts = HE.settings.get('canvas.scripts', true) !== false;
    S.moveMode = HE.settings.get('canvas.moveMode', 'flow') === 'free' ? 'free' : 'flow';
    S.deaf = deafFrames();
    if (!buildStage()) { console.warn('[HE] canvas: #canvas-host missing'); return; }
    buildViewToolbar();
    applyDevice();
    S.viewport.dataset.mode = HE.mode;

    HE.on('doc:render', () => render());
    HE.on('doc:loaded', () => {
      abandonTextEdit();
      if (S.g) cancelGesture();
      endCompat(); // a document's compat mode never carries over, autosave restores included
      removeRun(); // the new document's run frame (if any) follows its doc:changed
      S.warnedDoc = false;
      S.trustNotice = true;
      S.loadSeq++;
      S.resetScroll = true;
      S.highlightId = null;
      setHover(null);
      syncViewToolbar();
    });
    HE.on('doc:replaced', (data) => {
      if (!endCompat()) return;
      syncFrames();
      // The step's own line (「復原：編輯整份 HTML」) is kept in front, since this one replaces it.
      if (data && data.history) stepStatus(t('{step}，已換成另一份文件，相容模式已關閉', { step: data.step || t('復原／重做') }));
      else HE.ui.status(t('整份文件已取代，相容模式已關閉'));
    });
    HE.on('doc:trusted', (data) => {
      // Trust coming back (undo, the consent dialog) never turns compat mode back on.
      if (!(data && data.trusted)) endCompat();
      syncFrames();
    });
    HE.on('doc:changed', (data) => {
      // Compat consent covers the scripts it was confirmed over: an undo or redo that brings back any other (one
      // deleted before compat went on, a state only allowed for preview) ends it. doc.restore's re-render is
      // still queued (a microtask), so the restored frame is built without allow-scripts, and live.safe() keeps
      // copies out of the scripted frame until it shows.
      if (data && data.history && S.compat && S.compatBits && [...util.scriptBits(HE.doc.model)].some((b) => !S.compatBits.has(b))) {
        endCompat();
        syncFrames();
        stepStatus(t('復原／重做帶回了開啟相容模式時沒有的腳本，相容模式已關閉'));
      }
      if (S.pending) S.pendingStale = true;
      if (S.hoverBox) S.hoverBox.dataset.id = ''; // labels may have changed (class / id edits)
      fxMedia(HE.live.doc);
      refreshRun();
      scheduleDraw();
    });
    HE.on('layers:hidden', () => refreshRun()); // hidden layers stay hidden in the run frame too
    HE.on('live:headstyle', (data) => { if (data && data.key === 'fx-motion') fxMedia(HE.live.doc); });
    HE.on('fx:demo', () => scheduleDraw()); // draw() keeps redrawing while a demo runs
    HE.on('selection:changed', () => {
      if (S.editingId && !(HE.sel.ids.length === 1 && HE.sel.primary === S.editingId)) endTextEdit(true);
      scheduleDraw();
    });
    HE.on('canvas:ready', onReady);
    HE.on('mode:changed', onModeChanged);
    HE.on('history:before', () => {
      if (S.g) cancelGesture();
      if (S.editingId) endTextEdit(true);
    });
    HE.on('ai:busy', (data) => {
      if (data && data.busy) {
        if (S.g) cancelGesture();
        if (S.editingId) endTextEdit(true);
      }
      scheduleDraw();
    });

    // Gestures keep working when the pointer leaves the iframe: the parent document takes over
    // (the shield covers the iframe while a gesture runs) and coordinates are mapped back.
    const cap = { capture: true };
    for (const t of ['mousemove', 'pointermove']) window.addEventListener(t, (e) => { if (S.g) onMove(e, false); }, cap);
    for (const t of ['mouseup', 'pointerup']) window.addEventListener(t, (e) => { if (S.g) onUp(e, false); }, cap);
    window.addEventListener('pointercancel', () => { if (S.g) cancelGesture(); }, cap);
    // The run frame's messages (onRunMessage): its wrapper reports the page's own navigations, and the shield goes
    // up only when the page's guard reports a file drag the page did not take; a drag that stays over the shield
    // keeps it up.
    window.addEventListener('message', onRunMessage);
    for (const t of ['dragenter', 'dragover']) {
      window.addEventListener(t, (e) => { if (S.runShield && !S.runShield.hidden && e.target === S.runShield && hasFiles(e)) raiseRunShield(); }, cap);
    }
    for (const t of ['drop', 'dragend']) window.addEventListener(t, () => hideRunShield(), cap);
    // Keys typed in the run frame never reach the editor: the first time focus goes in, say how to get them back.
    window.addEventListener('blur', () => setTimeout(() => {
      if (S.keysHinted || !S.run || document.activeElement !== S.run) return;
      S.keysHinted = true;
      HE.ui.status(keysHint());
    }, 0));
    window.addEventListener('pagehide', rememberTaint);
    reportTaint();
    window.addEventListener('keydown', (e) => {
      if (S.g && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelGesture(); }
    }, cap);
    // Clicking anywhere in the editor outside the text being typed commits it.
    document.addEventListener('mousedown', (e) => {
      if (!S.editingId || S.modalOpen) return;
      const t = e.target;
      if (S.tbar && S.tbar.contains(t)) return;
      const layer = document.getElementById('layer-root');
      if (layer && layer.contains(t)) return;
      endTextEdit(true);
    }, true);

    window.addEventListener('resize', () => scheduleDraw());
    if (window.ResizeObserver) {
      S.ro = new ResizeObserver(() => scheduleDraw());
      S.ro.observe(S.box);
    }
    // Late layout, CSS animations and media loading move things without any event we hear.
    setInterval(() => { if (HE.sel.ids.length || S.editingId || S.flashes.length) scheduleDraw(); }, 500);
    registerKeys();
    syncViewToolbar();
  }

  HE.canvas = {
    init,
    render,
    setDevice,
    setFold,
    setScripts,
    setCompat,
    setMoveMode,
    startTextEdit,
    endTextEdit,
    saveTextEdit,
    isEditingText,
    isGesturing,
    scrollIntoView,
    flash,
    highlight,
    toPage,
    beginInsertDrag,
    /** The edit frame (HE.live.doc's frame). */
    get frame() { return S.frame; },
    /** For another frame the editor must hear events in (the print frame): whether this browser needs the guarded kind, and the policy that goes first in its head. */
    get deaf() { return S.deaf; },
    guardCsp: GUARD_CSP,
    /** The isolated run frame while it shows (preview of a page whose scripts may run), else null. Cross-origin: never read it. */
    get runFrame() { return S.run; },
    get device() { return S.device; },
    /** 'flow' (a plain drag reorders) or 'free' (it shifts the element with `translate`). */
    get moveMode() { return S.moveMode; },
    /** 'desktop' | 'tablet' | 'phone', or a foldable described with its size and crease. */
    get viewport() { return viewportNote(); },
    get editingId() { return S.editingId; },
    /** The page's scripts may run (preference on and document trusted): in the run frame while previewing, and in compat mode. */
    get scriptsEnabled() { return scriptsAllowed(); },
    /** Compat mode: the scripts also run in the edit frame, with the editor's origin. */
    get compat() { return compatOn(); },
  };
})();
