/* Tactile HTML editor — insert.js
 *
 * The block library (left panel, 插入 tab). Blocks are small, semantic HTML
 * snippets with minimal inline styles in em/rem, currentColor and translucent
 * borders, so they pick up the host page's fonts and colours.
 * Click a tile: insert after the selection (Alt: inside it). Drag a tile onto
 * the canvas: HE.canvas.beginInsertDrag places it.
 */
(function () {
  'use strict';

  const HE = window.HE;
  const t = HE.t;
  const util = HE.util;
  const ui = HE.ui;

  const GROUPS = [
    { key: 'text', label: t('文字') },
    { key: 'layout', label: t('版面') },
    { key: 'media', label: t('媒體與互動') },
  ];
  const HINT = t('點一下插入在選取的元素後面，按住 Alt 插入到裡面，或拖到畫面上的位置。');
  const AI_PROMPT = t('在選取的元素後面新增：');
  const DRAG_THRESHOLD = 4;
  const BIG_IMAGE = 2 * 1024 * 1024;

  // Climb out of these before inserting a block before/after them (a <p> cannot follow an <li> or a <td>).
  const CLIMB = new Set(['li', 'dt', 'dd', 'td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'col',
    'option', 'optgroup', 'figcaption', 'summary', 'legend', 'source', 'track', 'area']);
  // Parents that only hold phrasing content: a new block must go after them, not inside.
  const PHRASING_ONLY = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'label', 'button', 'summary', 'legend',
    'caption', 'dt', 'figcaption']);
  // Elements whose content model rejects arbitrary blocks.
  const NO_BLOCKS_INSIDE = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup', 'ul', 'ol', 'dl', 'menu', 'select',
    'optgroup', 'datalist', 'picture', 'video', 'audio', 'iframe', 'canvas', 'svg', 'math', 'object', 'textarea', 'p',
    'pre', 'hgroup', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const BOX_TAGS = new Set(['div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav', 'li', 'td', 'th',
    'blockquote', 'figure', 'form', 'fieldset', 'details', 'dd', 'dialog', 'search']);

  /* ------------------------------------------------------------------ */
  /* Block HTML                                                          */
  /* ------------------------------------------------------------------ */

  const LINE = 'rgba(127,127,127,.3)';
  const CELL = 'padding:.5em .75em;border:1px solid rgba(127,127,127,.35)';
  const TABLE_HEAD = [t('項目'), t('說明'), t('預估天數'), t('負責人'), t('狀態'), t('備註')];
  const TABLE_ROWS = [
    [t('網站改版'), t('首頁與產品頁重新設計'), '15', t('王小明'), t('進行中'), t('下週提案')],
    [t('客服流程'), t('整合線上與電話客服'), '10', t('林怡君'), t('規劃中'), t('待確認預算')],
    [t('年度報告'), t('彙整各部門年度成果'), '8', t('陳志豪'), t('已完成'), '—'],
    [t('教育訓練'), t('新進同仁產品課程'), '5', t('張雅婷'), t('進行中'), t('每月一次')],
    [t('社群經營'), t('每週兩篇主題貼文'), '20', t('黃家瑋'), t('進行中'), '—'],
    [t('供應商評估'), t('比較三家物流報價'), '6', t('李佳穎'), t('規劃中'), t('月底前完成')],
    [t('資安檢查'), t('年度弱點掃描與修補'), '12', t('吳建宏'), t('已完成'), '—'],
  ];
  const COLUMN_TEXT = [
    [t('快速上手'), t('不需要安裝任何軟體，打開瀏覽器就能開始使用。')],
    [t('安全可靠'), t('資料全程加密傳輸，並且每天自動備份。')],
    [t('彈性計價'), t('依團隊規模選擇方案，隨時可以升級或調整。')],
  ];
  const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">' +
    '<rect width="1200" height="675" fill="#e6e9ef"/>' +
    '<g fill="none" stroke="#9aa1ae" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="520" y="257" width="160" height="128" rx="14"/><circle cx="566" cy="300" r="14"/><path d="m680 352-46-46-114 79"/></g>' +
    '<text x="600" y="440" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" fill="#7c8391">' + util.esc(t('圖片預留位置')) + '</text></svg>');

  function columnsHTML(n) {
    let s = '<div style="display:grid;grid-template-columns:repeat(' + n + ',minmax(0,1fr));gap:1.5rem;margin:1.5rem 0">';
    for (let i = 0; i < n; i++) {
      const [title, text] = COLUMN_TEXT[i % COLUMN_TEXT.length];
      s += '<div><h3 style="margin:0 0 .5rem">' + util.esc(title) + '</h3><p style="margin:0">' + util.esc(text) + '</p></div>';
    }
    return s + '</div>';
  }

  function tableHTML(opts = {}) {
    const rows = util.clamp(Math.round(Number(opts.rows) || 3), 2, 8);
    const cols = util.clamp(Math.round(Number(opts.cols) || 3), 2, 6);
    let s = '<table style="border-collapse:collapse;width:100%;margin:1.5rem 0"><thead><tr>';
    for (let c = 0; c < cols; c++) s += '<th style="' + CELL + ';text-align:left">' + util.esc(TABLE_HEAD[c]) + '</th>';
    s += '</tr></thead><tbody>';
    for (let r = 0; r < rows - 1; r++) {
      s += '<tr>';
      for (let c = 0; c < cols; c++) s += '<td style="' + CELL + '">' + util.esc(TABLE_ROWS[r % TABLE_ROWS.length][c]) + '</td>';
      s += '</tr>';
    }
    return s + '</tbody></table>';
  }

  function imageHTML(opts = {}) {
    const src = opts.src ? String(opts.src) : PLACEHOLDER_IMG;
    return '<img src="' + util.esc(src) + '" alt="' + util.esc(opts.alt || '') + '" style="max-width:100%;height:auto">';
  }

  function linkHTML(opts = {}) {
    return '<p><a href="' + util.esc(opts.href || '#') + '">' + util.esc(t('查看完整說明')) + '</a></p>';
  }

  /**
   * key, label, icon, group, html (string | fn(opts)).
   * edit: start text editing after insert (true = the new element, string = first descendant matching it).
   * pick: asks for input on tile click (table size, image source, link URL), then calls ctx.insert(opts).
   * badge: small mark on the tile icon.
   */
  const blocks = [
    { key: 'h1', label: t('標題 1'), icon: 'heading', badge: '1', group: 'text', edit: true, html: '<h1>' + util.esc(t('第三季營運重點')) + '</h1>' },
    { key: 'h2', label: t('標題 2'), icon: 'heading', badge: '2', group: 'text', edit: true, html: '<h2>' + util.esc(t('市場概況')) + '</h2>' },
    { key: 'h3', label: t('標題 3'), icon: 'heading', badge: '3', group: 'text', edit: true, html: '<h3>' + util.esc(t('本月關鍵發現')) + '</h3>' },
    {
      key: 'p', label: t('段落'), icon: 'text', group: 'text', edit: true,
      html: '<p>' + util.esc(t('本季營收較去年同期成長 12%，主要來自企業客戶的續約與新方案。下一季會把資源集中在客戶服務與產品體驗。')) + '</p>',
    },
    {
      key: 'quote', label: t('引言'), icon: 'quote', group: 'text', edit: true,
      html: '<blockquote style="margin:1.5rem 0;padding:.25rem 0 .25rem 1.25rem;border-left:.25rem solid rgba(127,127,127,.45);font-size:1.125em;line-height:1.7">' +
        util.esc(t('好的設計不只是好看，而是讓人一眼就知道下一步該做什麼。')) + '</blockquote>',
    },
    {
      key: 'ul', label: t('項目清單'), icon: 'list', group: 'text', edit: 'li',
      html: '<ul><li>' + util.esc(t('整理客戶回饋，找出最常見的三個問題')) + '</li><li>' + util.esc(t('與設計團隊確認新版介面的時程')) +
        '</li><li>' + util.esc(t('月底前完成預算檢討')) + '</li></ul>',
    },
    {
      key: 'ol', label: t('編號清單'), icon: 'list-ordered', group: 'text', edit: 'li',
      html: '<ol><li>' + util.esc(t('申請帳號並完成基本設定')) + '</li><li>' + util.esc(t('匯入現有的客戶資料')) +
        '</li><li>' + util.esc(t('邀請團隊成員一起使用')) + '</li></ol>',
    },
    {
      key: 'code', label: t('程式碼'), icon: 'code', group: 'text', edit: 'code',
      html: '<pre style="margin:1.5rem 0;padding:1rem 1.25rem;border-radius:.5rem;background:rgba(127,127,127,.12);overflow:auto;font-size:.9em;line-height:1.6"><code>const total = items.reduce((sum, item) =&gt; sum + item.price, 0);</code></pre>',
    },
    {
      key: 'section', label: t('區段'), icon: 'section', group: 'layout',
      html: '<section style="padding:2.5rem 0"><h2 style="margin:0 0 .75rem">' + util.esc(t('服務特色')) + '</h2><p style="margin:0">' +
        util.esc(t('用一段話說明這個區段的重點，例如產品的主要優勢、適合的對象，或是接下來可以採取的行動。')) + '</p></section>',
    },
    { key: 'columns2', label: t('兩欄'), icon: 'columns', badge: '2', group: 'layout', html: columnsHTML(2) },
    { key: 'columns3', label: t('三欄'), icon: 'columns', badge: '3', group: 'layout', html: columnsHTML(3) },
    {
      key: 'card', label: t('卡片'), icon: 'card', group: 'layout',
      html: '<div style="margin:1.5rem 0;padding:1.25rem;border:1px solid rgba(127,127,127,.25);border-radius:.75rem"><h3 style="margin:0 0 .5rem">' +
        util.esc(t('專業方案')) + '</h3><p style="margin:0">' + util.esc(t('適合十人以上的團隊，包含進階報表與專屬客服窗口。')) + '</p></div>',
    },
    { key: 'hr', label: t('分隔線'), icon: 'minus', group: 'layout', html: '<hr style="margin:2rem 0;border:0;border-top:1px solid ' + LINE + '">' },
    // A navigation bar and three pages in this one file (HE.pages). A document that has pages gets one more page instead.
    { key: 'pages', label: t('多頁面'), icon: 'layers', group: 'layout', html: () => HE.pages.blockHTML() },
    // A group of buttons fixed to a corner of the window (HE.island). It goes to the end of <body>, whatever is selected.
    { key: 'island', label: t('浮動島'), icon: 'more', group: 'layout', html: () => HE.island.blockHTML() },
    { key: 'spacer', label: t('間距', null, 'block'), icon: 'spacer', group: 'layout', html: '<div style="height:2rem" aria-hidden="true"></div>' },
    { key: 'image', label: t('圖片'), icon: 'image', group: 'media', html: imageHTML, pick: pickImage, popup: 'menu' },
    {
      key: 'button', label: t('按鈕'), icon: 'button', group: 'media', edit: true,
      html: '<a href="#" style="display:inline-block;padding:.6em 1.2em;border-radius:.5em;background:#2149c8;color:#fff;text-decoration:none;font-weight:600">' +
        util.esc(t('立即開始')) + '</a>',
    },
    { key: 'link', label: t('連結'), icon: 'link', group: 'media', edit: 'a', html: linkHTML, pick: pickLink, popup: 'dialog' },
    { key: 'table', label: t('表格'), icon: 'table', group: 'media', html: tableHTML, pick: pickTable, popup: 'dialog' },
  ];

  function byKey(key) { return blocks.find((b) => b.key === key) || null; }
  /** The 多頁面 block in a document that already has pages: one document holds one set of pages. */
  function hasPages(block) { return block.key === 'pages' && !!HE.pages && HE.pages.mode() === 'pages'; }
  /** The 浮動島 block: HE.island places it (one per document, a child of <body>), so it is never dragged or aimed. */
  function isIsland(block) { return block.key === 'island' && !!HE.island; }
  function insertIsland(block) {
    const had = HE.island.get();
    const id = HE.island.create();
    if (!id) return [];
    HE.sel.set([id]);
    closeDrawerIfNarrow();
    if (had) {
      ui.toast(t('這份文件已經有浮動島，已選取它。按鈕、位置和顏色在右邊的「設計」分頁修改。'));
    } else {
      ui.status(t('已插入{label}', { label: block.label }));
      whenLive(id, () => { if (HE.canvas && typeof HE.canvas.flash === 'function') HE.canvas.flash([id]); });
    }
    if (HE.ui.currentTab('right') !== 'design') HE.ui.showTab('right', 'design');
    return [id];
  }
  function htmlOf(block, opts) { return typeof block.html === 'function' ? block.html(opts || {}) : String(block.html); }

  /* ------------------------------------------------------------------ */
  /* Where to insert                                                     */
  /* ------------------------------------------------------------------ */

  function isEmptyContainer(el) {
    return !!el && BOX_TAGS.has(util.tag(el)) && el.getAttribute('aria-hidden') !== 'true' &&
      el.children.length === 0 && !el.textContent.trim();
  }

  function canContain(el) {
    if (!el) return false;
    if (el === HE.doc.body) return true;
    const tag = util.tag(el);
    if (util.isVoid(el) || util.isInline(el) || NO_BLOCKS_INSIDE.has(tag)) return false;
    if (util.isTextEditable(el)) return isEmptyContainer(el);
    return true;
  }

  /** Nearest ancestor-or-self that a block can sit next to without breaking the content model. */
  function blockAnchor(el) {
    let cur = el;
    while (cur && cur.parentElement && !HE.doc.isRoot(cur.parentElement)) {
      const parent = cur.parentElement;
      const climb = CLIMB.has(util.tag(cur)) || PHRASING_ONLY.has(util.tag(parent)) ||
        util.isInline(parent) || util.isTextEditable(parent);
      if (!climb) break;
      cur = parent;
    }
    return cur;
  }

  function mainContainer() {
    const b = HE.doc.body;
    return (b && b.querySelector('main')) || b;
  }

  /** In a multi-page document: the id of the page on show, when a block aimed at `ref` (nothing, the pages' container or a page) belongs inside it. */
  function pageFor(ref) {
    const pages = HE.pages && typeof HE.pages.list === 'function' ? HE.pages.list() : [];
    const cur = pages.find((p) => p.current);
    if (!cur) return null;
    if (!ref) return cur.id;
    const id = HE.doc.idOf(ref);
    if (pages.some((p) => p.id === id)) return id;
    return ref.hasAttribute('data-tpg') ? cur.id : null;
  }

  /** Default target from the selection: {refId, position}. */
  function resolveTarget(opts = {}) {
    const d = HE.doc;
    const b = d.body;
    const primary = HE.sel.primary;
    let ref = primary ? d.byId(primary) : null;
    if (ref && !(b && b.contains(ref))) ref = null;
    // A block placed beside a page would show on every page: it goes into the page.
    const page = pageFor(ref);
    if (page) return { refId: page, position: 'append' };
    if (!ref) return { refId: d.idOf(mainContainer()), position: 'append' };
    if (ref === b) return { refId: d.idOf(b), position: 'append' };
    if ((opts.inside || isEmptyContainer(ref)) && canContain(ref)) return { refId: d.idOf(ref), position: 'append' };
    if (opts.inside) ui.status(t('這個元素不能放入其他內容，已改為插入在它後面'));
    return { refId: d.idOf(blockAnchor(ref)), position: 'after' };
  }

  /** Validate an explicit {refId, position}; falls back to the selection when the ref is gone. */
  function normalizeTarget(opts) {
    const d = HE.doc;
    const b = d.body;
    let ref = opts.refId ? d.byId(opts.refId) : null;
    if (!ref || !b || !b.contains(ref)) return resolveTarget({ inside: !!opts.inside });
    let pos = opts.position === 'inside' ? 'append' : opts.position;
    if (!HE.ops.POSITIONS.includes(pos)) pos = opts.inside ? 'append' : 'after';
    if (ref === b) return { refId: d.idOf(b), position: pos === 'prepend' || pos === 'before' ? 'prepend' : 'append' };
    if ((pos === 'append' || pos === 'prepend') && !canContain(ref)) pos = 'after';
    if (pos === 'before' || pos === 'after') ref = blockAnchor(ref);
    return { refId: d.idOf(ref), position: pos };
  }

  /* ------------------------------------------------------------------ */
  /* Insert                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Insert a block. opts: {refId, position: 'before'|'after'|'prepend'|'append'|'inside', inside, ...block options
   * (rows/cols for table, src/alt for image, href for link)}. Without refId: after the primary selection
   * (inside an empty container, or inside when opts.inside), or appended to <main>/<body> with no selection.
   * Returns the new top-level ids.
   */
  function insertBlock(key, opts = {}) {
    const block = byKey(key);
    if (!block) { console.warn('[HE] unknown block:', key); return []; }
    if (!HE.doc.model) return [];
    const c = HE.canvas;
    if (c && typeof c.isEditingText === 'function' && c.isEditingText() && typeof c.endTextEdit === 'function') c.endTextEdit(true);
    if (HE.mode === 'preview') HE.setMode('edit');
    if (hasPages(block)) {
      const id = HE.pages.add();
      if (id) { closeDrawerIfNarrow(); ui.toast(t('這份文件已經有多個頁面，所以新增了 1 個頁面。在「頁面」分頁可以改名和排序。')); }
      return id ? [id] : [];
    }
    if (isIsland(block)) return insertIsland(block);
    const target = normalizeTarget(opts);
    let ids = [];
    try {
      ids = HE.ops.insertHTML(target.refId, target.position, htmlOf(block, opts), { label: t('插入{label}', { label: block.label }) }) || [];
    } catch (err) {
      console.error('[HE] insert failed:', err);
      ui.toast(t('無法插入「{label}」', { label: block.label }), { type: 'error' });
      return [];
    }
    if (ids.length) afterInsert(block, ids);
    return ids;
  }

  function editTargetId(block, id) {
    const el = HE.doc.byId(id);
    if (!el) return null;
    const target = typeof block.edit === 'string' && !el.matches(block.edit) ? el.querySelector(block.edit) : el;
    return target && util.isTextEditable(target) ? HE.doc.idOf(target) : null;
  }

  /** Run fn once the live copy of `id` exists (inserting can require a full canvas re-render). */
  function whenLive(id, fn) {
    const run = () => { try { fn(); } catch (err) { console.error('[HE] after insert failed:', err); } };
    if (HE.live.byId(id)) { requestAnimationFrame(run); return; }
    let timer = 0;
    const off = HE.on('canvas:ready', () => { off(); clearTimeout(timer); requestAnimationFrame(run); });
    timer = setTimeout(off, 4000);
  }

  function closeDrawerIfNarrow() {
    const app = document.getElementById('app');
    if (app && app.dataset.drawer && window.matchMedia && window.matchMedia('(max-width: 900px)').matches) app.dataset.drawer = '';
  }

  function afterInsert(block, ids) {
    HE.sel.set(ids);
    closeDrawerIfNarrow();
    ui.status(t('已插入{label}', { label: block.label }));
    const first = ids[0];
    whenLive(first, () => {
      const c = HE.canvas;
      if (!c) return;
      if (typeof c.scrollIntoView === 'function') c.scrollIntoView(first);
      if (typeof c.flash === 'function') c.flash(ids);
      const editId = block.edit ? editTargetId(block, first) : null;
      if (editId && typeof c.startTextEdit === 'function') c.startTextEdit(editId, { selectAll: true });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pickers: image, link, table                                         */
  /* ------------------------------------------------------------------ */

  let fileInput = null;
  let pendingImage = null;
  let picker = null;

  function isSafeUrl(u) { return !/^\s*(javascript|vbscript):/i.test(u); }

  function pickImage(ctx) {
    const r = ctx.tile.getBoundingClientRect();
    ui.menu([
      { heading: t('插入圖片') },
      { label: t('從電腦選擇圖片…'), icon: 'upload', onClick: () => chooseImageFile(ctx) },
      { label: t('使用網址…'), icon: 'link', onClick: () => askImageUrl(ctx) },
    ], { x: r.left, y: r.bottom + 4 });
  }

  function chooseImageFile(ctx) {
    if (!fileInput) return;
    pendingImage = ctx;
    fileInput.value = '';
    fileInput.click();
  }

  function onFileChosen() {
    const file = fileInput.files && fileInput.files[0];
    const ctx = pendingImage;
    pendingImage = null;
    if (!file || !ctx) return;
    if (!/^image\//.test(file.type)) {
      ui.toast(t('請選擇圖片檔（PNG、JPG、GIF、SVG 或 WebP）'), { type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (file.size > BIG_IMAGE) ui.toast(t('這張圖片有 {size}，內嵌後檔案會變大', { size: util.bytes(file.size) }));
      ctx.insert({ src: String(reader.result), alt: '' });
    };
    reader.onerror = () => ui.toast(t('無法讀取這個檔案'), { type: 'error' });
    reader.readAsDataURL(file);
  }

  async function askImageUrl(ctx) {
    const value = await ui.prompt(t('圖片網址'), { title: t('使用網址'), placeholder: 'https://example.com/photo.jpg', okLabel: t('插入') });
    if (value == null) return;
    const url = value.trim();
    if (!url) return;
    if (!isSafeUrl(url)) { ui.toast(t('這個網址無法使用'), { type: 'error' }); return; }
    if (HE.env.inArtifact && /^https?:/i.test(url)) ui.toast(t('這裡可能無法顯示外部圖片，匯出後在瀏覽器開啟即可正常顯示'));
    ctx.insert({ src: url, alt: '' });
  }

  async function pickLink(ctx) {
    const value = await ui.prompt(t('連結網址'), { title: t('插入連結'), value: 'https://', okLabel: t('插入') });
    if (value == null) return;
    let href = value.trim();
    if (!href || /^https?:\/\/$/i.test(href)) href = '#';
    if (!isSafeUrl(href)) { ui.toast(t('這個網址無法使用'), { type: 'error' }); return; }
    ctx.insert({ href });
  }

  const TP_ROWS = 8;
  const TP_COLS = 6;

  function pickTable(ctx) {
    if (picker && picker.tile === ctx.tile) { closeTablePicker(); return; }
    closeTablePicker();
    const pop = ui.h('div', 'ins-tp');
    pop.id = 'ins-table-picker';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', t('插入表格'));
    const title = ui.h('div', 'ins-tp-title');
    title.textContent = t('插入表格');
    const grid = ui.h('div', 'ins-tp-grid');
    grid.id = 'ins-tp-grid';
    grid.tabIndex = 0;
    grid.setAttribute('aria-label', t('用方向鍵選擇表格大小，按 Enter 插入'));
    grid.setAttribute('aria-describedby', 'ins-tp-label');
    for (let r = 1; r <= TP_ROWS; r++) {
      for (let c = 1; c <= TP_COLS; c++) {
        const cell = ui.h('span', 'ins-tp-cell');
        cell.dataset.r = r;
        cell.dataset.c = c;
        grid.append(cell);
      }
    }
    const label = ui.h('div', 'ins-tp-label');
    label.id = 'ins-tp-label';
    label.setAttribute('aria-live', 'polite');
    pop.append(title, grid, label);

    const state = { r: 3, c: 3 };
    const paint = () => {
      for (const cell of grid.children) cell.classList.toggle('is-on', +cell.dataset.r <= state.r && +cell.dataset.c <= state.c);
      label.textContent = t('{r} 列 × {c} 欄（第一列是標題）', { r: state.r, c: state.c });
    };
    const set = (r, c) => { state.r = util.clamp(r, 2, TP_ROWS); state.c = util.clamp(c, 2, TP_COLS); paint(); };
    const choose = () => {
      const opts = { rows: state.r, cols: state.c };
      closeTablePicker();
      ctx.insert(opts);
    };
    const cellOf = (e) => (e.target.closest ? e.target.closest('.ins-tp-cell') : null);
    grid.addEventListener('pointerover', (e) => { const cell = cellOf(e); if (cell) set(+cell.dataset.r, +cell.dataset.c); });
    grid.addEventListener('click', (e) => { const cell = cellOf(e); if (cell) { set(+cell.dataset.r, +cell.dataset.c); choose(); } });
    grid.addEventListener('keydown', (e) => {
      let handled = true;
      if (e.key === 'ArrowRight') set(state.r, state.c + 1);
      else if (e.key === 'ArrowLeft') set(state.r, state.c - 1);
      else if (e.key === 'ArrowDown') set(state.r + 1, state.c);
      else if (e.key === 'ArrowUp') set(state.r - 1, state.c);
      else if (e.key === 'Enter' || e.key === ' ') choose();
      else if (e.key === 'Tab') { closeTablePicker(); handled = false; }
      else handled = false;
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    });
    paint();

    (document.getElementById('layer-root') || document.body).append(pop);
    const tr = ctx.tile.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let left = tr.left;
    let top = tr.bottom + 6;
    if (left + pr.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pr.width - 8);
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, tr.top - pr.height - 6);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    const onDown = (e) => { if (!pop.contains(e.target) && !ctx.tile.contains(e.target)) closeTablePicker(); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      closeTablePicker();
      ctx.tile.focus();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', closeTablePicker);
    window.addEventListener('blur', closeTablePicker);
    picker = {
      tile: ctx.tile,
      close() {
        pop.remove();
        document.removeEventListener('pointerdown', onDown, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', closeTablePicker);
        window.removeEventListener('blur', closeTablePicker);
      },
    };
    ctx.tile.setAttribute('aria-expanded', 'true');
    grid.focus({ preventScroll: true });
  }

  function closeTablePicker() {
    if (!picker) return;
    const p = picker;
    picker = null;
    p.close();
    p.tile.setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------------------------------------------ */
  /* Tiles: click and drag to canvas                                     */
  /* ------------------------------------------------------------------ */

  let pane = null;
  let tileDrag = null;
  let suppressTileClick = false;

  function askAI() {
    if (!HE.ai || typeof HE.ai.focus !== 'function') { ui.toast(t('AI 助理目前無法使用'), { type: 'error' }); return; }
    // Prefill only an empty prompt: an unsent draft would be lost (setting the value also clears its undo).
    const input = document.getElementById('ai-input');
    const draft = !!(input && input.value.trim());
    HE.ai.focus(draft ? {} : { prompt: AI_PROMPT });
    if (draft) ui.status(t('已保留 AI 輸入框裡還沒送出的內容'));
  }

  function onTileClick(e) {
    const tile = e.target.closest('.ins-tile');
    if (!tile || tile.disabled) return;
    // Mouse clicks that end a drag-to-canvas are ignored (keyboard clicks have detail 0).
    if (suppressTileClick && e.detail > 0) { suppressTileClick = false; return; }
    if (tile.dataset.act === 'ai') { askAI(); return; }
    const block = byKey(tile.dataset.key);
    if (!block) return;
    const target = resolveTarget({ inside: e.altKey });
    if (block.pick) {
      block.pick({ tile, target, insert: (opts) => insertBlock(block.key, Object.assign({}, opts, target)) });
      return;
    }
    insertBlock(block.key, target);
  }

  function onTilePointerDown(e) {
    suppressTileClick = false;
    const tile = e.target.closest('.ins-tile[data-key]');
    if (!tile || tile.disabled || e.button !== 0 || e.pointerType === 'touch') return;
    if (!HE.canvas || typeof HE.canvas.beginInsertDrag !== 'function') return;
    tileDrag = { tile, key: tile.dataset.key, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    window.addEventListener('pointermove', onTilePointerMove, true);
    window.addEventListener('pointerup', endTileDrag, true);
    window.addEventListener('pointercancel', endTileDrag, true);
  }

  function onTilePointerMove(e) {
    const d = tileDrag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) <= DRAG_THRESHOLD) return;
    endTileDrag();
    const block = byKey(d.key);
    if (!block || !HE.canvas || typeof HE.canvas.beginInsertDrag !== 'function') return;
    if (hasPages(block) || isIsland(block)) return; // the click that follows adds a page, or the island
    suppressTileClick = true;
    closeTablePicker();
    ui.closeMenus();
    closeDrawerIfNarrow();
    try {
      HE.canvas.beginInsertDrag(htmlOf(block, {}), e);
    } catch (err) {
      console.error('[HE] insert drag failed:', err);
    }
  }

  function endTileDrag() {
    tileDrag = null;
    window.removeEventListener('pointermove', onTilePointerMove, true);
    window.removeEventListener('pointerup', endTileDrag, true);
    window.removeEventListener('pointercancel', endTileDrag, true);
  }

  function tileFor(block) {
    const tile = ui.h('button', 'ins-tile');
    tile.type = 'button';
    tile.id = 'ins-tile-' + block.key;
    tile.dataset.key = block.key;
    tile.title = block.pick ? t('插入{label}…', { label: block.label }) : t('插入{label}', { label: block.label });
    if (block.popup) tile.setAttribute('aria-haspopup', block.popup);
    tile.innerHTML = '<span class="ins-tile-icon" aria-hidden="true">' + ui.icon(block.icon, 20) +
      (block.badge ? '<span class="ins-tile-badge">' + util.esc(block.badge) + '</span>' : '') + '</span>' +
      '<span class="ins-tile-label"></span>';
    tile.querySelector('.ins-tile-label').textContent = block.label;
    return tile;
  }

  function buildDOM() {
    const wrap = ui.h('div', 'ins pane-pad');
    for (const g of GROUPS) {
      const section = ui.h('section', 'ins-group');
      const headingId = 'ins-group-' + g.key;
      section.setAttribute('aria-labelledby', headingId);
      const heading = ui.h('h3', 'ins-heading');
      heading.id = headingId;
      heading.textContent = g.label;
      const grid = ui.h('div', 'ins-grid');
      for (const b of blocks) if (b.group === g.key) grid.append(tileFor(b));
      section.append(heading, grid);
      wrap.append(section);
    }
    const ai = ui.h('button', 'ins-tile ins-ai');
    ai.type = 'button';
    ai.id = 'ins-tile-ai';
    ai.dataset.act = 'ai';
    ai.title = t('描述你想要的內容，交給 AI 助理產生');
    ai.innerHTML = '<span class="ins-tile-icon" aria-hidden="true">' + ui.icon('sparkles', 18) + '</span><span class="ins-tile-label">' +
      util.esc(t('AI 產生…')) + '</span>';
    wrap.append(ai);
    const hint = ui.h('p', 'ins-hint');
    hint.textContent = HINT;
    wrap.append(hint);
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'ins-image-file';
    fileInput.hidden = true;
    fileInput.tabIndex = -1;
    fileInput.setAttribute('aria-hidden', 'true');
    wrap.append(fileInput);
    pane.replaceChildren(wrap);
  }

  function init() {
    pane = document.getElementById('insert-pane');
    if (!pane) return;
    buildDOM();
    pane.addEventListener('click', onTileClick);
    pane.addEventListener('pointerdown', onTilePointerDown);
    fileInput.addEventListener('change', onFileChosen);
    HE.on('tab:changed', ({ group, name }) => { if (group === 'left' && name !== 'insert') closeTablePicker(); });
    HE.on('doc:loaded', () => { closeTablePicker(); pendingImage = null; });
    HE.on('ai:busy', (data) => {
      const busy = !!(data && data.busy);
      pane.querySelectorAll('.ins-tile[data-key]').forEach((tile) => { tile.disabled = busy; });
      if (busy) closeTablePicker();
    });
  }

  HE.insert = { init, blocks, insertBlock };
})();
