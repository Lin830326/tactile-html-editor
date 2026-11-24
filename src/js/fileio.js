/* Tactile — fileio.js: new, open, paste, export, autosave and drag-and-drop.
 *
 * Owns the #toolbar-file buttons and the #status-save indicator. Documents
 * enter through HE.doc.load (open / paste / templates / autosave restore) and
 * leave through HE.doc.serialize (download / clipboard / preview tab).
 * "Dirty" means the model changed since the last open or export.
 *
 * Where the File System Access API works (Chromium, top-level page), a file opened from disk stays linked:
 * mod+S writes it back, and a change made on disk by someone else (a coding agent) is picked up. The link
 * survives a reload through IndexedDB, keyed like the autosave record.
 */
(function () {
  'use strict';

  const HE = window.HE;
  // Copied at load, before any page script could run in this realm (compat mode).
  const PAGE_SANDBOX = HE.PAGE_SANDBOX;
  // The frame the print dialog reads: the editor reaches its document (allow-same-origin) and a sandboxed frame
  // may print only with allow-modals. Never allow-scripts: with allow-same-origin that is the editor's origin.
  const PRINT_SANDBOX = 'allow-same-origin allow-modals';
  const PRINT_FRAME_ID = 'fio-print-frame';
  // The print copy is laid out at a 16:9 screen first, where a deck's boards show their shape.
  const PRINT_W = 1280;
  const PRINT_H = 720;
  const PRINT_KEEP_MS = 10 * 60 * 1000;
  const PRINT_CSS = '@media print{*,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}';
  const COPY_LOAD_MS = 15000;
  // The picture is as wide as the canvas's page: no scrollbar takes room in the copy.
  const NO_PAGE_SCROLLBARS = 'html,body{scrollbar-width:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none!important}';

  // One autosave record per tab, so two tabs do not overwrite each other's backup.
  const AUTOSAVE_PREFIX = 'tactile:autosave:';
  const LEGACY_AUTOSAVE_KEY = 'tactile:autosave';
  const TAB_KEY = 'tactile:tab'; // sessionStorage: survives reload and session restore of the same tab
  // Chromium gives every page opened from disk one localStorage (see HE.settings): a document autosaved there is
  // any local page's to read and to replace. From disk the records live in sessionStorage, which belongs to this
  // tab: they survive a reload, a reopened tab and a restored session, and no page in another tab sees them.
  // The marks that say which tab is open (OPEN_PREFIX) hold no content and stay in localStorage.
  const PER_TAB = location.protocol === 'file:';
  const docStore = {
    perTab: PER_TAB,
    area() { return PER_TAB ? sessionStorage : localStorage; },
    getRaw(key) { try { return this.area().getItem(key); } catch (err) { return null; } },
    get(key) { try { const v = this.area().getItem(key); return v == null ? null : JSON.parse(v); } catch (err) { return null; } },
    putRaw(key, raw) { try { this.area().setItem(key, raw); return true; } catch (err) { return false; } },
    remove(key) { try { this.area().removeItem(key); } catch (err) { /* storage unavailable */ } },
    keys() {
      const keys = [];
      try {
        const a = this.area();
        for (let i = 0; i < a.length; i++) { const k = a.key(i); if (k != null) keys.push(k); }
      } catch (err) { /* storage unavailable */ }
      return keys;
    },
  };
  const OPEN_PREFIX = 'tactile:open:';
  const OPEN_BEAT_MS = 30000;
  // Background tabs may run timers only once a minute, so an open tab's mark can be this old.
  const OPEN_STALE_MS = 3 * 60000;
  const AUTOSAVE_MAX_AGE = 30 * 864e5;
  // An unheld record this recent may still belong to an open tab the browser has not loaded yet
  // (restored on demand after a restart, or discarded to save memory).
  const AUTOSAVE_RECENT = 7 * 864e5;
  const AUTOSAVE_SPARE = 5; // older backups of closed tabs kept for new tabs to continue
  const INSTANCE = Math.random().toString(36).slice(2, 10);
  const AUTOSAVE_MS = 800;
  const SAMPLE_NAME = 'tactile-範例.html'; // i18n-ok: default file name
  const TEMPLATE_NAMES = {
    blank: '新文件.html', // i18n-ok: default file name
    sample: SAMPLE_NAME,
    report: '報告.html', // i18n-ok: default file name
    slides: '簡報.html', // i18n-ok: default file name
    landing: '產品介紹頁.html', // i18n-ok: default file name
    article: '文章.html', // i18n-ok: default file name
    dashboard: '營運看板.html', // i18n-ok: default file name
    quote: '報價單.html', // i18n-ok: default file name
    site: '多頁面網站.html', // i18n-ok: default file name
    'zh-hans-blank': '新文档.html', // i18n-ok: default file name
    'hans-report': 'tactile-示例.html', // i18n-ok: default file name
    'hans-deck': '年终工作汇报.html', // i18n-ok: default file name
    'hans-traceable': '经营报告.html', // i18n-ok: default file name
    'hans-board': '大促战报.html', // i18n-ok: default file name
    'hans-launch': '新品发布页.html', // i18n-ok: default file name
    'hans-invite': '活动邀请函.html', // i18n-ok: default file name
    'hans-article': '图文长文.html', // i18n-ok: default file name
    'hans-quote': '报价单.html', // i18n-ok: default file name
    'hans-site': '多页面网站.html', // i18n-ok: default file name
    'en-blank': 'untitled.html',
    'en-report': 'tactile-sample.html',
    'en-slides': 'business-update.html',
    'en-minutes': 'meeting-notes.html',
    'en-launch': 'product-launch.html',
    'en-pitch': 'pitch-deck.html',
    'en-annual': 'annual-report.html',
    'en-traceable': 'financial-report.html',
    'en-dashboard': 'dashboard.html',
    'en-conference': 'conference.html',
    'en-casestudy': 'case-study.html',
    'en-newsletter': 'newsletter.html',
    'en-site': 'multi-page-site.html',
    'en-invoice': 'invoice.html',
  };
  const TEMPLATE_ICONS = {
    blank: 'file', sample: 'sparkles', report: 'table', slides: 'desktop', landing: 'section', article: 'text',
    dashboard: 'sliders', quote: 'clipboard',
    'en-report': 'sparkles', 'en-slides': 'desktop', 'en-minutes': 'table', 'en-launch': 'section', 'en-invoice': 'clipboard',
    'en-pitch': 'desktop', 'en-annual': 'text', 'en-traceable': 'table', 'en-dashboard': 'sliders', 'en-conference': 'list-ordered',
    'en-casestudy': 'image', 'en-newsletter': 'send',
    'hans-report': 'sparkles', 'hans-deck': 'desktop', 'hans-traceable': 'table', 'hans-board': 'sliders', 'hans-launch': 'section',
    'hans-invite': 'send', 'hans-article': 'text', 'hans-quote': 'clipboard',
    site: 'layers', 'en-site': 'layers', 'hans-site': 'layers',
  };
  const ENCODING_NAMES = {
    big5: 'Big5', gbk: 'GBK', gb18030: 'GB18030', shift_jis: 'Shift_JIS', 'euc-kr': 'EUC-KR',
    'windows-1252': 'Windows-1252', 'utf-16le': 'UTF-16', 'utf-16be': 'UTF-16',
  };
  // Labels seen in the wild that are not (or not reliably) TextDecoder labels.
  const ENCODING_ALIASES = {
    utf8: 'utf-8', gb2312: 'gbk', cp936: 'gbk', ms936: 'gbk', 'x-gbk': 'gbk',
    'big5-hkscs': 'big5', cp950: 'big5', ms950: 'big5', 'x-big5': 'big5',
    sjis: 'shift_jis', 'x-sjis': 'shift_jis', cp932: 'shift_jis', ms932: 'shift_jis', 'windows-31j': 'shift_jis',
    cp949: 'euc-kr', 'ks_c_5601-1987': 'euc-kr',
    'iso-8859-1': 'windows-1252', latin1: 'windows-1252', 'us-ascii': 'windows-1252', ascii: 'windows-1252',
  };
  // Covers <meta charset="x"> and <meta http-equiv="Content-Type" content="text/html; charset=x">.
  const CHARSET_DECL = /(<meta\b[^>]*?\bcharset\s*=\s*["']?\s*)([a-z0-9_:.()+-]+)/gi;
  const CHARSET_SNIFF = /<meta\b[^>]*?\bcharset\s*=\s*["']?\s*([a-z0-9_:.()+-]+)/i;
  const HAS_CHARSET = /<meta\b[^>]*\bcharset\s*=/i;
  // Scheme-qualified (data:, http:, blob: …), protocol-relative or fragment-only: not a sibling file.
  const NOT_RELATIVE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;
  const LOADED_LINK = /\b(?:stylesheet|icon|preload|modulepreload|manifest)\b/i;
  // Resolving a page's relative URLs against a made-up address shows which ones stay inside the chosen folder.
  const BUNDLE_HOST = 'https://tactile.invalid';
  const BUNDLE_ROOT = BUNDLE_HOST + '/r/';
  const BUNDLE_LABEL = HE.t('嵌入圖片與樣式');
  const BUNDLE_MAX_FILE = 25 * 1048576;
  const BUNDLE_MAX_ENTRIES = 20000;
  const BUNDLE_MAX_DEPTH = 8;
  // Past this an embedded document no longer fits the autosave (localStorage holds about 5 MB).
  const BUNDLE_BIG = 4 * 1048576;
  // What may become a data: URL: pictures and fonts. Anything else (pages, scripts, media) stays a path.
  const BUNDLE_MIME = {
    png: 'image/png', apng: 'image/apng', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon', cur: 'image/x-icon', svg: 'image/svg+xml',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  };
  const HTML_TYPES = [{ description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }];
  const DISK_POLL_MS = 2000;
  const LINK_DB = 'tactile';
  const LINK_STORE = 'handles';

  const BUILTIN = {
    blank: `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>新文件</title>${''/* i18n-ok: document text */}
<style>
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif; color: #1f2328; background: #fff; line-height: 1.7; }
  main { max-width: 720px; margin: 0 auto; padding: 56px 24px; }
  h1 { font-size: 32px; line-height: 1.25; margin: 0 0 16px; }
</style>
</head>
<body>
<main>
  <h1>未命名文件</h1>${''/* i18n-ok: document text */}
  <p>按兩下這段文字開始輸入。</p>${''/* i18n-ok: document text */}
</main>
</body>
</html>
`,
    sample: `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tactile 範例</title>${''/* i18n-ok: document text */}
<style>
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif; color: #1f2328; background: #fff; line-height: 1.7; }
  main { max-width: 760px; margin: 0 auto; padding: 56px 24px 72px; }
  h1 { font-size: 34px; line-height: 1.25; margin: 0 0 12px; }
  .lead { font-size: 18px; color: #57606a; margin: 0 0 32px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 0 0 32px; }
  .card { border: 1px solid #d0d7de; border-radius: 10px; padding: 16px 18px; }
  .card h2 { font-size: 17px; margin: 0 0 6px; }
  .card p { margin: 0; color: #57606a; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 32px; }
  th, td { border-bottom: 1px solid #d0d7de; padding: 8px 10px; text-align: left; }
  .cta { display: inline-block; background: #2149c8; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>歡迎使用 Tactile</h1>${''/* i18n-ok: document text */}
  <p class="lead">點一下選取元素，按兩下直接修改文字，拖曳可以調整順序。</p>${''/* i18n-ok: document text */}
  <div class="cards">
    <div class="card"><h2>選取</h2><p>點擊頁面上的任何元素，右側會顯示它的樣式。</p></div>${''/* i18n-ok: document text */}
    <div class="card"><h2>編輯</h2><p>按兩下文字即可輸入，按 Esc 結束。</p></div>${''/* i18n-ok: document text */}
    <div class="card"><h2>儲存</h2><p>完成後按 Ctrl+S 存成 HTML 檔。</p></div>${''/* i18n-ok: document text */}
  </div>
  <table>
    <thead><tr><th>功能</th><th>說明</th></tr></thead>${''/* i18n-ok: document text */}
    <tbody>
      <tr><td>開啟</td><td>開啟電腦裡的 HTML 檔，或直接把檔案拖進視窗。</td></tr>${''/* i18n-ok: document text */}
      <tr><td>AI 助理</td><td>用一句話描述想要的修改。</td></tr>${''/* i18n-ok: document text */}
    </tbody>
  </table>
  <a class="cta" href="#">開始編輯</a>${''/* i18n-ok: document text */}
</main>
</body>
</html>
`,
  };

  const state = {
    dirty: false,
    edited: false, // any change since load; a pristine template is autosaved by key only
    template: null,
    baseline: null, // serialized model at the last open/export; null when unknown
    exportedAt: 0,
    savedAt: 0,
    saveFailed: false,
    quotaWarned: false,
    storageOK: true,
    savePending: false,
    docSeq: 0,
    savedSeq: -1,
    exporting: false,
    confirming: false,
    internalDrag: false,
    pointerDown: false,
    pasteDraft: '',
    changes: 0, // edits since load; a save that ran while the user kept typing leaves the document dirty
    // The file on disk this document saves back to: {handle, name, stamp, sig, bom, eol, encoding, syncAt,
    // syncKind, readable, seen, missing, persistedAs}. Set only by a load that passed one in (nextFile).
    file: null,
    nextFile: null,
    checking: false,
    bundling: false,
  };
  const tab = { id: null, prev: null };
  const els = {};
  let saveDebounced = null;
  let downloadsPromise = null;
  let overlayTimer = null;
  let openMenu = null;
  let diskToast = null;
  let accessToast = null; // relink's 允許存取, kept up while a restored document with unsaved edits cannot read its file
  let linkDB = null;

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function toast(msg, opts) { return HE.ui.toast(msg, opts); }
  function aiBusy() { return !!(HE.ai && HE.ai.busy); }
  function modalOpen() { return !!document.querySelector('#layer-root .modal-backdrop'); }
  /** msg: the whole sentence, already through HE.t (it ends in what the user has to wait with). */
  function warnAiBusy(msg) { toast(msg, { type: 'error' }); }

  /** File System Access API (Chromium, top-level page; the pickers throw in a cross-origin frame such as the Artifact). */
  function fsaAvailable() {
    if (HE.env.inArtifact) return false;
    try { if (window.top !== window) return false; } catch (err) { return false; }
    return typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function';
  }

  function shortName(name) { return name.length > 32 ? name.slice(0, 31) + '…' : name; }

  /** Commit what the user is typing (an in-place text edit, inspector input not applied yet) so the model holds what they see. */
  function commitEdits() {
    const c = HE.canvas;
    if (c && typeof c.isEditingText === 'function' && typeof c.endTextEdit === 'function') {
      try { if (c.isEditingText()) c.endTextEdit(true); } catch (err) { console.error('[HE] fileio: committing text edit failed', err); }
    }
    // Fields commit on change or Enter and page CSS after 400 ms, and mod+S works while one has focus.
    const i = HE.inspector;
    if (i && typeof i.flush === 'function') {
      try { i.flush(); } catch (err) { console.error('[HE] fileio: committing an inspector field failed', err); }
    }
  }

  /** Before the page is hidden or closed: put what is typed into the model but stay in typing mode (the user may come back). */
  function saveTextEdit() {
    const c = HE.canvas;
    // The canvas knows whether the user changed the text (a page script's own changes are not committed).
    if (c && typeof c.saveTextEdit === 'function') {
      try { c.saveTextEdit(); } catch (err) { console.error('[HE] fileio: saving text edit failed', err); }
    }
    // Page CSS waits 400 ms before it applies; a focused field commits only on change or Enter.
    const i = HE.inspector;
    if (i && typeof i.flush === 'function') {
      try { i.flush(); } catch (err) { console.error('[HE] fileio: committing an inspector field failed', err); }
    }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtTime(t) {
    const d = new Date(t);
    const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    return d.toDateString() === new Date().toDateString() ? hm : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
  }

  /** Strip directories and characters file systems reject. '' when nothing usable is left. */
  function cleanName(name) {
    const base = String(name || '').split(/[\\/]/).pop();
    return base.replace(/[\u0000-\u001f<>:"|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120).trim();
  }

  function nameFromTitle(src) {
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(src);
    if (!m) return '';
    return cleanName(HE.util.fragment(m[1]).textContent).slice(0, 60).trim();
  }

  function byteLength(text) {
    try { return new Blob([text]).size; } catch (err) { return text.length; }
  }

  /* ------------------------------------------------------------------ */
  /* Templates                                                           */
  /* ------------------------------------------------------------------ */

  function samplesList() {
    const s = HE.samples;
    return s && Array.isArray(s.list) ? s.list.filter((t) => t && t.key) : [];
  }

  const BLANK_KEYS = ['blank', 'zh-hans-blank', 'en-blank'];
  /** Whether a template suits the interface language, and how well (0 is best, -1 is not at all). */
  function langRank(t) { return HE.i18n.docLangs.indexOf(t.lang || 'zh-Hant'); }
  /** Of these templates, the one written in the language closest to the interface's; else the first that exists. */
  function pickKey(keys) {
    const found = keys.map((k) => samplesList().find((t) => t.key === k)).filter(Boolean);
    const suited = found.filter((t) => langRank(t) >= 0).sort((a, b) => langRank(a) - langRank(b));
    return (suited[0] || found[0] || { key: keys[0] }).key;
  }
  const blankKey = () => pickKey(BLANK_KEYS);
  /** The document a first visit starts with. */
  const sampleKey = () => pickKey(['sample', 'en-report', 'hans-report']);

  function templateHTML(key) {
    const s = HE.samples;
    let html = null;
    if (s && typeof s.get === 'function') {
      try { html = s.get(key); } catch (err) { html = null; }
    }
    if (!html) {
      const t = samplesList().find((x) => x.key === key);
      html = t && t.html;
    }
    if (!html) html = BUILTIN[key] || null;
    return typeof html === 'string' && html.trim() ? html : null;
  }

  function templateName(key) {
    if (TEMPLATE_NAMES[key]) return TEMPLATE_NAMES[key];
    const t = samplesList().find((x) => x.key === key);
    return (cleanName(t && t.name) || cleanName(key) || 'untitled') + '.html';
  }

  /* ------------------------------------------------------------------ */
  /* Loading                                                             */
  /* ------------------------------------------------------------------ */

  function loadDoc(html, name, trusted) {
    try {
      HE.doc.load(html, { name, trusted: !!trusted });
      return true;
    } catch (err) {
      console.error('[HE] fileio: load failed', err);
      toast(HE.t('無法開啟這份文件'), { type: 'error' });
      return false;
    }
  }

  function loadTemplate(key, name) {
    const html = templateHTML(key);
    if (!html || !loadDoc(html, cleanName(name) || templateName(key), true)) return false;
    state.template = key;
    return true;
  }

  /** Re-check dirty against the last opened/exported content (an undo can return to it). */
  function refreshDirty() {
    if (state.dirty && state.baseline != null && HE.doc.model && HE.doc.serialize() === state.baseline) {
      state.dirty = false;
      renderStatus();
    }
  }

  /** Resolves true when the current document may be replaced. */
  async function confirmReplace() {
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再開啟其他文件')); return false; }
    if (state.confirming) return false;
    commitEdits();
    refreshDirty();
    if (!state.dirty) return true;
    state.confirming = true;
    try {
      const ask = fsaAvailable() ? HE.t('目前的修改還沒儲存，確定要開啟新的文件嗎？') : HE.t('目前的修改還沒匯出，確定要開啟新的文件嗎？');
      return await HE.ui.confirm(ask, { okLabel: HE.t('開啟新的文件') });
    } finally {
      state.confirming = false;
    }
  }

  /**
   * The text is already decoded, so any non-UTF-8 charset declaration in it is now false —
   * left alone it would garble the exported UTF-8 file when that file is opened again.
   */
  function utf8Declaration(html) {
    let changed = false;
    const out = html.replace(CHARSET_DECL, (m, pre, label) => {
      if (/^utf-?8$/i.test(label)) return m;
      changed = true;
      return pre + 'utf-8';
    });
    return { html: out, changed };
  }

  /** Replace the document with `html` (asks first when there are unexported changes). opts: {encoding, file (a link)} */
  async function openText(html, name, opts = {}) {
    const src = String(html == null ? '' : html);
    if (!src.trim()) { toast(HE.t('沒有內容可以開啟'), { type: 'error' }); return false; }
    if (!(await confirmReplace())) return false;
    const fileName = cleanName(name) || nameFromTitle(src) || '未命名.html'; // i18n-ok: default file name
    // Opened, pasted and dropped pages may come from anywhere: their scripts wait for the user's consent.
    state.nextFile = opts.file || null;
    const ok = loadDoc(utf8Declaration(src).html, fileName, false);
    state.nextFile = null;
    if (!ok) return false;
    // The note on the encoding is a remark in brackets of its own; the sentence around it is one text.
    let note = '';
    const enc = opts.encoding;
    if (enc && enc !== 'utf-8') {
      const encName = ENCODING_NAMES[enc] || enc.toUpperCase();
      note = opts.guessed ? HE.t('（沒有標示編碼，猜測是 {enc}，已轉成 UTF-8）', { enc: encName }) : HE.t('（已從 {enc} 轉成 UTF-8）', { enc: encName });
    }
    const opened = { name: HE.doc.name, note };
    const msg = !state.file ? HE.t('已開啟 {name}{note}', opened)
      : state.file.guessed ? HE.t('已開啟 {name}{note}，第一次存回原檔前會先問你', opened)
        : HE.t('已開啟 {name}{note}，儲存時會直接寫回原檔', opened);
    toast(msg, { type: 'success' });
    warnRelativeRefs();
    return true;
  }

  async function newDoc(key) {
    const k = key || blankKey();
    if (!templateHTML(k)) { toast(HE.t('找不到這個範本'), { type: 'error' }); return false; }
    if (!(await confirmReplace())) return false;
    if (!loadTemplate(k)) return false;
    HE.ui.status(HE.t('已開啟新文件「{name}」', { name: HE.doc.name }));
    // Effects only play in preview and in the exported page, so a template's motion is invisible until asked for.
    const fx = HE.fx ? HE.fx.count() : 0;
    if (fx && HE.mode === 'edit') {
      toast(HE.t('這個範本有 {n} 個元素用了動態效果，切換到預覽就能看到。', { n: fx }), {
        action: { label: HE.t('切換到預覽'), fn: () => HE.setMode('preview') }, timeout: 8000,
      });
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Embedding the page's sibling files (pictures, style sheets, fonts)  */
  /* ------------------------------------------------------------------ */

  /** A path next to the page: not scheme-qualified, protocol-relative or a fragment. '' otherwise. */
  function relRef(v) {
    const s = String(v == null ? '' : v).trim();
    return s && !NOT_RELATIVE.test(s) ? s : '';
  }

  /** After `url(` at `i`: {ref, end} with `end` past the closing parenthesis, or null. indexOf only: a data: URL can be megabytes. */
  function cssUrlAt(css, i) {
    while (i < css.length && /\s/.test(css[i])) i++;
    const q = css[i];
    if (q === '"' || q === "'") {
      const e = css.indexOf(q, i + 1);
      if (e < 0) return null;
      const close = css.indexOf(')', e + 1);
      if (close < 0 || css.slice(e + 1, close).trim()) return null;
      return { ref: css.slice(i + 1, e), end: close + 1 };
    }
    const close = css.indexOf(')', i);
    return close < 0 ? null : { ref: css.slice(i, close).trim(), end: close + 1 };
  }

  /** After `@import` at `i`: {ref, media, end} with `end` past the `;`, or null. */
  function cssImportAt(css, i) {
    while (i < css.length && /\s/.test(css[i])) i++;
    let ref;
    let at;
    if (/^url\(/i.test(css.substr(i, 4))) {
      const u = cssUrlAt(css, i + 4);
      if (!u) return null;
      ref = u.ref;
      at = u.end;
    } else if (css[i] === '"' || css[i] === "'") {
      const e = css.indexOf(css[i], i + 1);
      if (e < 0) return null;
      ref = css.slice(i + 1, e);
      at = e + 1;
    } else {
      return null;
    }
    const semi = css.indexOf(';', at);
    const end = semi < 0 ? css.length : semi + 1;
    return { ref, media: css.slice(at, semi < 0 ? css.length : semi).trim(), end };
  }

  /**
   * `css` with each url(…) and @import handed to fn({kind: 'url' | 'import', ref, media}): what fn returns takes
   * the place of the whole token (null leaves it). Comments and strings are passed over.
   */
  function walkCss(css, fn) {
    const re = /\/\*|["']|@import\b|\burl\(/gi;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(css))) {
      const at = m.index;
      const hit = m[0];
      if (hit === '/*') {
        const e = css.indexOf('*/', at + 2);
        re.lastIndex = e < 0 ? css.length : e + 2;
        continue;
      }
      if (hit === '"' || hit === "'") {
        const e = css.indexOf(hit, at + 1);
        re.lastIndex = e < 0 ? css.length : e + 1;
        continue;
      }
      const imp = hit[0] === '@';
      const tok = imp ? cssImportAt(css, re.lastIndex) : cssUrlAt(css, re.lastIndex);
      if (!tok) continue;
      re.lastIndex = tok.end;
      const rep = fn({ kind: imp ? 'import' : 'url', ref: tok.ref, media: tok.media || '' });
      if (rep == null) continue;
      out += css.slice(last, at) + rep;
      last = tok.end;
    }
    return last ? out + css.slice(last) : css;
  }

  /** A srcset with each URL handed to fn(url); null when fn replaced none. */
  function walkSrcset(value, fn) {
    const s = String(value || '');
    const ws = /\s/g;
    let out = '';
    let i = 0;
    let changed = false;
    while (i < s.length) {
      const lead = /^[\s,]*/.exec(s.substr(i, 64))[0];
      if (lead) { out += lead; i += lead.length; continue; }
      ws.lastIndex = i;
      const m = ws.exec(s);
      const j = m ? m.index : s.length;
      let url = s.slice(i, j);
      const commas = /,+$/.exec(url);
      if (commas) url = url.slice(0, -commas[0].length);
      const rep = fn(url);
      if (rep != null) changed = true;
      out += (rep != null ? rep : url) + (commas ? commas[0] : '');
      i = j;
      if (!commas) {
        // The descriptor ("2x", "640w") runs to the next comma.
        const k = s.indexOf(',', i);
        const end = k < 0 ? s.length : k;
        out += s.slice(i, end);
        i = end;
      }
    }
    return changed ? out : null;
  }

  /**
   * What the document refers to by a relative path. items: [{id, kind, attr}] the places this can embed
   * (kind 'attr' | 'srcset' | 'link' | 'style' | 'styleAttr'); other: [{ref, why}] what stays a path whatever is
   * found. base: the page's own relative <base href>, or ''. An absolute <base> means none of it is a sibling file.
   */
  function bundleScan(m) {
    const scan = { items: [], other: [], base: '' };
    if (!m) return scan;
    const baseEl = m.querySelector('base[href]');
    if (baseEl) {
      const b = (baseEl.getAttribute('href') || '').trim();
      if (NOT_RELATIVE.test(b)) return scan;
      scan.base = b;
    }
    const idOf = (el) => el.getAttribute(HE.ID_ATTR);
    const add = (el, kind, attr) => { if (idOf(el)) scan.items.push({ id: idOf(el), kind, attr: attr || null }); };
    const skip = (v, why) => { const ref = relRef(v); if (ref) scan.other.push({ ref, why }); };
    m.querySelectorAll('img[src], video[poster], img[srcset], source[srcset], link[href], style, [style]').forEach((el) => {
      const tag = HE.util.tag(el);
      if (tag === 'img' && relRef(el.getAttribute('src'))) add(el, 'attr', 'src');
      if (tag === 'video' && relRef(el.getAttribute('poster'))) add(el, 'attr', 'poster');
      if ((tag === 'img' || tag === 'source') && el.hasAttribute('srcset')) add(el, 'srcset', 'srcset');
      if (tag === 'link' && relRef(el.getAttribute('href'))) {
        const rel = el.getAttribute('rel') || '';
        if (/\bstylesheet\b/i.test(rel)) {
          if (/\balternate\b/i.test(rel)) skip(el.getAttribute('href'), HE.t('替代樣式表，這次不嵌入'));
          else add(el, 'link', 'href');
        } else if (/\bicon\b/i.test(rel)) add(el, 'attr', 'href');
        else if (LOADED_LINK.test(rel)) skip(el.getAttribute('href'), HE.t('預先載入或資訊清單的連結，這次不嵌入'));
      }
      if (tag === 'style') add(el, 'style');
      if (el.hasAttribute('style') && /url\(/i.test(el.getAttribute('style'))) add(el, 'styleAttr', 'style');
    });
    m.querySelectorAll('script[src]').forEach((el) => skip(el.getAttribute('src'), HE.t('外部腳本不嵌入，維持原樣')));
    m.querySelectorAll('iframe[src], embed[src], object[data]').forEach((el) => {
      skip(el.getAttribute(el.hasAttribute('data') ? 'data' : 'src'), HE.t('內嵌的頁面或物件，這次不嵌入'));
    });
    m.querySelectorAll('video[src], audio[src], source[src], track[src]').forEach((el) => skip(el.getAttribute('src'), HE.t('影音檔，這次不嵌入')));
    return scan;
  }

  /**
   * One place in the document, with every relative reference in it handed to fn(ref, type) (type 'data': becomes
   * a data: URL; 'css': becomes style text). Returns the new value, or null when fn replaced nothing. For a
   * 'link' the new value is the style sheet's text.
   */
  function bundleVisit(item, fn) {
    const el = HE.doc.byId(item.id);
    if (!el) return null;
    const inCss = (css) => {
      const out = walkCss(css, (tok) => (relRef(tok.ref) ? fn(tok.ref, tok.kind === 'import' ? 'css' : 'data', tok) : null));
      return out === css ? null : out;
    };
    if (item.kind === 'style') return inCss(el.textContent || '');
    const v = el.getAttribute(item.attr);
    if (v == null) return null;
    if (item.kind === 'styleAttr') return inCss(v);
    if (item.kind === 'srcset') return walkSrcset(v, (u) => (relRef(u) ? fn(u, 'data', null) : null));
    return relRef(v) ? fn(relRef(v), item.kind === 'link' ? 'css' : 'data', null) : null;
  }

  /** The distinct relative references of the open document: {count, embeddable, example}. */
  function bundleRefs() {
    const scan = bundleScan(HE.doc.model);
    const seen = new Set();
    for (const it of scan.items) bundleVisit(it, (ref) => { seen.add(ref); return null; });
    const embeddable = seen.size;
    for (const o of scan.other) seen.add(o.ref);
    return { count: embeddable, total: seen.size, example: seen.size ? [...seen][0] : '' };
  }

  /** Pages opened from disk lose their sibling files; say why pictures and styles are missing and offer to embed them. */
  function warnRelativeRefs() {
    const refs = bundleRefs();
    if (!refs.total) return;
    const ex = refs.example.length > 40 ? refs.example.slice(0, 39) + '…' : refs.example;
    const vars = { n: refs.total, ex };
    if (!refs.count) { toast(HE.t('這個頁面引用了 {n} 個相對路徑的檔案（例如 {ex}），因為只開啟了 HTML 檔，它們不會載入。', vars), { timeout: 9000 }); return; }
    toast(HE.t('這個頁面引用了 {n} 個相對路徑的檔案（例如 {ex}），因為只開啟了 HTML 檔，它們不會載入。選取它所在的資料夾，就能把圖片與樣式嵌入這份文件。', vars), {
      timeout: 20000,
      action: { label: HE.t('選資料夾並嵌入'), fn: () => bundleAssets() },
    });
  }

  /* ---- where the files come from: {name, entries: [{path, size?, get() → Promise<File>}], truncated} ---- */

  function bundleSkipsDir(name) { return name === 'node_modules' || name === '.git'; }

  /** A directory handle (showDirectoryPicker): its files, listed without reading any. */
  async function folderFromHandle(root) {
    const folder = { name: root.name || '', entries: [], truncated: false };
    const walk = async (dir, prefix, depth) => {
      for await (const [name, h] of dir.entries()) {
        if (folder.entries.length >= BUNDLE_MAX_ENTRIES) { folder.truncated = true; return; }
        if (h.kind === 'file') folder.entries.push({ path: prefix + name, get: () => h.getFile() });
        else if (bundleSkipsDir(name)) continue;
        else if (depth >= BUNDLE_MAX_DEPTH) folder.truncated = true;
        else await walk(h, prefix + name + '/', depth + 1);
      }
    };
    await walk(root, '', 0);
    return folder;
  }

  /** Files of an <input webkitdirectory> (paths start with the folder's own name), or plain files, or {path, file} pairs. */
  function folderFromFiles(list) {
    const folder = { name: '', entries: [], truncated: false };
    for (const f of Array.from(list || [])) {
      const file = f && f.file ? f.file : f;
      if (!file) continue;
      let path = f.path || file.webkitRelativePath || '';
      if (!f.path && path.indexOf('/') > 0) {
        if (!folder.name) folder.name = path.slice(0, path.indexOf('/'));
        path = path.slice(path.indexOf('/') + 1);
      }
      folder.entries.push({ path: path || file.name, size: file.size, get: () => Promise.resolve(file) });
    }
    return folder;
  }

  /** The entries of a drop (webkitGetAsEntry), taken while the drop event runs; null unless it holds a folder. */
  function dropEntries(dt) {
    const items = dt && dt.items;
    if (!items) return null;
    const out = [];
    let dir = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== 'file' || typeof it.webkitGetAsEntry !== 'function') continue;
      let entry = null;
      try { entry = it.webkitGetAsEntry(); } catch (err) { entry = null; }
      if (!entry) continue;
      if (entry.isDirectory) dir = true;
      out.push(entry);
    }
    return dir ? out : null;
  }

  async function folderFromEntries(tops) {
    const folder = { name: '', entries: [], truncated: false };
    // One dropped folder is the page's folder; several things dropped together keep their own names.
    const single = tops.length === 1 && tops[0].isDirectory;
    if (single) folder.name = tops[0].name;
    const children = (dir) => new Promise((resolve, reject) => {
      const reader = dir.createReader();
      const all = [];
      // readEntries hands out the listing in batches and ends with an empty one.
      const next = () => reader.readEntries((batch) => {
        if (!batch.length) { resolve(all); return; }
        all.push(...batch);
        next();
      }, reject);
      next();
    });
    const walk = async (entry, prefix, depth) => {
      if (folder.entries.length >= BUNDLE_MAX_ENTRIES) { folder.truncated = true; return; }
      if (entry.isFile) {
        folder.entries.push({ path: prefix + entry.name, get: () => new Promise((resolve, reject) => entry.file(resolve, reject)) });
      } else if (entry.isDirectory && !bundleSkipsDir(entry.name)) {
        if (depth >= BUNDLE_MAX_DEPTH) { folder.truncated = true; return; }
        const inner = single && depth === 0 ? '' : prefix + entry.name + '/';
        for (const c of await children(entry)) await walk(c, inner, depth + 1);
      }
    };
    for (const t of tops) await walk(t, '', 0);
    return folder;
  }

  /** A folder input (Firefox, Safari, the Artifact); where the browser has none, a plain multi-file input. */
  function pickWithInput() {
    return new Promise((resolve) => {
      const old = document.getElementById('fio-dir-input');
      if (old) old.remove();
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'fio-dir-input';
      input.multiple = true;
      input.hidden = true;
      input.tabIndex = -1;
      input.setAttribute('aria-hidden', 'true');
      if ('webkitdirectory' in input) input.webkitdirectory = true;
      const done = (folder) => { input.remove(); resolve(folder); };
      input.addEventListener('change', () => done(input.files && input.files.length ? folderFromFiles(input.files) : null));
      input.addEventListener('cancel', () => done(null));
      document.body.append(input);
      input.click();
    });
  }

  /** Ask for the folder the page's files are in. Call from a user gesture. null: the user backed out. */
  async function pickFolder() {
    if (fsaAvailable() && typeof window.showDirectoryPicker === 'function') {
      const opts = { id: 'tactile-assets', mode: 'read' };
      // The picker opens where the linked file is: its folder is one click away.
      if (state.file && state.file.handle) opts.startIn = state.file.handle;
      try {
        return await folderFromHandle(await window.showDirectoryPicker(opts));
      } catch (err) {
        if (err && err.name === 'AbortError') return null;
        console.warn('[HE] fileio: folder picker failed, using the file input', err);
      }
    }
    return pickWithInput();
  }

  /* ---- matching references to files ---- */

  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  function dirOf(p) { return p.indexOf('/') < 0 ? '' : p.slice(0, p.lastIndexOf('/') + 1); }
  function extOf(p) { const m = /\.([a-z0-9]+)$/i.exec(p); return m ? m[1].toLowerCase() : ''; }

  function newBundleJob(folder, scan) {
    const job = {
      folder, items: scan.items, other: scan.other,
      files: new Map(), // lower-case path → entry
      flat: !folder.entries.some((e) => e.path.indexOf('/') >= 0), // loose files: only names can match
      assets: new Map(), // type + '|' + lower-case path → asset
      skipped: new Map(), // reference as written → why it stays a path
      baseUrl: BUNDLE_ROOT,
    };
    for (const e of folder.entries) if (!job.files.has(e.path.toLowerCase())) job.files.set(e.path.toLowerCase(), e);
    // The page itself, found in the folder, says which sub-folder its paths start from (a parent folder was chosen).
    const name = String(HE.doc.name || '').toLowerCase();
    let dir = '';
    if (name && !job.files.has(name)) {
      const hits = folder.entries.filter((e) => e.path.toLowerCase().endsWith('/' + name));
      if (hits.length === 1) dir = dirOf(hits[0].path);
    }
    try { job.baseUrl = new URL(scan.base || '.', BUNDLE_ROOT + encPath(dir)).href; } catch (err) { job.baseUrl = BUNDLE_ROOT + encPath(dir); }
    return job;
  }

  /** The entry `ref` (as written, relative to baseUrl) names: {entry} or {why}. */
  function bundleLocate(job, ref, baseUrl) {
    let path;
    try {
      const u = new URL(ref.replace(/[?#].*$/, ''), baseUrl);
      if (u.origin !== BUNDLE_HOST) return { why: HE.t('不是相對路徑') };
      path = decodeURIComponent(u.pathname);
    } catch (err) {
      return { why: HE.t('路徑無法解析') };
    }
    const inside = path.startsWith('/r/');
    let low = (inside ? path.slice(3) : path.slice(1)).toLowerCase();
    if (!low || low.endsWith('/')) return { why: HE.t('不是檔案') };
    if (job.flat) low = low.slice(low.lastIndexOf('/') + 1);
    if (inside || job.flat) {
      const hit = job.files.get(low);
      if (hit) return { entry: hit };
    }
    // Another level of the tree was chosen, or the path leaves the folder: a single file ending in it is the one.
    const hits = [];
    for (const [p, e] of job.files) if (p === low || p.endsWith('/' + low)) hits.push(e);
    if (hits.length === 1) return { entry: hits[0] };
    if (hits.length > 1) return { why: HE.t('資料夾裡有多個符合的檔案，無法判斷是哪一個') };
    return { why: inside || job.flat ? HE.t('在選取的資料夾裡找不到') : HE.t('在選取的資料夾之外，找不到') };
  }

  /** The asset `ref` stands for, made on first use; null (and a line in job.skipped) when it stays a path. */
  function bundleAsset(job, ref, type, baseUrl) {
    const found = bundleLocate(job, ref, baseUrl);
    if (!found.entry) { job.skipped.set(ref, found.why); return null; }
    const path = found.entry.path;
    const key = type + '|' + path.toLowerCase();
    let a = job.assets.get(key);
    if (!a) {
      a = { type, path, entry: found.entry, mime: BUNDLE_MIME[extOf(path)] || '', size: 0, file: null, text: null, out: null, dataUrl: '', why: '', used: false, planned: false };
      a.baseUrl = BUNDLE_ROOT + encPath(dirOf(path));
      if (type === 'data' && !a.mime) a.why = HE.t('不是圖片或字型，這次不嵌入');
      job.assets.set(key, a);
    }
    if (a.why) { job.skipped.set(ref, a.why); return null; }
    return a;
  }

  function cssDecode(bytes) {
    const head = new TextDecoder('windows-1252').decode(bytes.subarray(0, 128));
    const m = /^(?:ï»¿)?@charset\s+"([^"]+)"/i.exec(head);
    const label = (m && decoderLabel(m[1])) || 'utf-8';
    return new TextDecoder(label).decode(bytes);
  }

  /** Find every file the document needs, sizes included. Style sheets are read (they name more files), and SVGs (checked for script). */
  async function bundlePlan(job) {
    const queue = [];
    for (const it of job.items) bundleVisit(it, (ref, type) => { queue.push({ ref, type, baseUrl: job.baseUrl }); return null; });
    while (queue.length) {
      const q = queue.shift();
      const a = bundleAsset(job, q.ref, q.type, q.baseUrl);
      if (!a) continue;
      if (a.planned) continue;
      a.planned = true;
      try {
        a.file = await a.entry.get();
        a.size = a.file.size;
        if (a.size > BUNDLE_MAX_FILE) a.why = HE.t('超過 {size}，沒有嵌入', { size: HE.util.bytes(BUNDLE_MAX_FILE) });
        else if (a.type === 'css') a.text = cssDecode(new Uint8Array(await readBuffer(a.file)));
        else if (a.mime === 'image/svg+xml') {
          // An SVG that carries script is left out: a data: URL of it is one click from running.
          const svg = new DOMParser().parseFromString(cssDecode(new Uint8Array(await readBuffer(a.file))), 'image/svg+xml');
          if (HE.util.hasScript(svg)) a.why = HE.t('SVG 含有腳本，沒有嵌入');
        }
      } catch (err) {
        a.why = HE.t('無法讀取檔案');
      }
      if (a.why) { job.skipped.set(q.ref, a.why); continue; }
      if (a.type !== 'css') continue;
      walkCss(a.text, (tok) => {
        if (relRef(tok.ref)) queue.push({ ref: tok.ref, type: tok.kind === 'import' ? 'css' : 'data', baseUrl: a.baseUrl });
        return null;
      });
    }
  }

  function bundleReady(job) { return [...job.assets.values()].filter((a) => a.planned && !a.why); }

  /** Bytes the document grows by: base64 is 4 characters for every 3 bytes; style text goes in as it is. */
  function bundleGrowth(assets) {
    return assets.reduce((n, a) => n + (a.type === 'css' ? a.size : Math.ceil(a.size / 3) * 4 + 32), 0);
  }

  /** Read the pictures and fonts. */
  async function bundleRead(job) {
    for (const a of bundleReady(job)) {
      if (a.type !== 'data') continue;
      try {
        const url = await readDataURL(a.file);
        const comma = url.indexOf(',');
        if (comma < 0) throw new Error('not a data URL');
        a.dataUrl = 'data:' + a.mime + ';base64,' + url.slice(comma + 1);
      } catch (err) {
        a.why = HE.t('無法讀取檔案');
      }
    }
  }

  /** What takes the place of one reference (see bundleVisit), or null to leave it. */
  function bundleReplace(job, ref, type, tok, baseUrl, stack) {
    const a = bundleAsset(job, ref, type, baseUrl);
    if (!a) return null;
    if (type === 'data') {
      a.used = true;
      // sprite.svg#icon: the fragment picks the view inside the picture.
      const hash = a.mime === 'image/svg+xml' && ref.indexOf('#') >= 0 ? ref.slice(ref.indexOf('#')) : '';
      return tok ? 'url("' + a.dataUrl + hash + '")' : a.dataUrl + hash;
    }
    if (stack.includes(a)) { job.skipped.set(ref, HE.t('樣式表互相 @import，沒有嵌入')); return null; }
    const media = tok ? tok.media : '';
    if (/\b(?:layer|supports)\b/i.test(media)) { job.skipped.set(ref, HE.t('@import 帶有 layer 或 supports 條件，這次不嵌入')); return null; }
    a.used = true;
    const css = bundleCss(job, a, stack.concat(a));
    return media ? '@media ' + media + ' {\n' + css + '\n}' : css;
  }

  /** A style sheet's text with its own files embedded (paths in it are relative to the sheet, not the page). */
  function bundleCss(job, a, stack) {
    const out = walkCss(a.text, (tok) => (relRef(tok.ref)
      ? bundleReplace(job, tok.ref, tok.kind === 'import' ? 'css' : 'data', tok, a.baseUrl, stack)
      : null));
    // Neither means anything inside a <style>.
    return out.replace(/^﻿/, '').replace(/^\s*@charset\s+"[^"]*"\s*;/i, '');
  }

  /** Write the embedded files into the document: one undo step, through the ops (new script is checked there). */
  function bundleApply(job) {
    let changed = 0;
    HE.history.transact(BUNDLE_LABEL, () => {
      for (const it of job.items) {
        const el = HE.doc.byId(it.id);
        if (!el) continue;
        const next = bundleVisit(it, (ref, type, tok) => bundleReplace(job, ref, type, tok, job.baseUrl, []));
        if (next == null) continue;
        changed++;
        if (it.kind === 'style') HE.ops.setText(it.id, next);
        else if (it.kind !== 'link') HE.ops.setAttr(it.id, { [it.attr]: next });
        else {
          // In the link's place, so the cascade order holds. setText keeps a '</style' in the sheet from ending it.
          const media = el.getAttribute('media');
          const ids = HE.ops.replaceHTML(it.id, '<style' + (media ? ' media="' + HE.util.esc(media) + '"' : '') + '></style>') || [];
          if (ids[0]) HE.ops.setText(ids[0], next);
        }
      }
    });
    return changed;
  }

  function bundleList(rows, max) {
    const ul = HE.ui.h('ul', 'fio-bundle-list');
    const limit = max || 12;
    for (const r of rows.slice(0, limit)) {
      const li = HE.ui.h('li');
      const code = HE.ui.h('span', 'mono');
      code.textContent = r.ref.length > 60 ? r.ref.slice(0, 59) + '…' : r.ref;
      li.append(code, HE.t('：{why}', { why: r.why }));
      ul.append(li);
    }
    if (rows.length > limit) ul.append(HE.ui.h('li', 'muted', HE.util.esc(HE.t('還有 {n} 個', { n: rows.length - limit }))));
    return ul;
  }

  function bundleSkippedRows(job) {
    const rows = [];
    const seen = new Set();
    for (const [ref, why] of job.skipped) { rows.push({ ref, why }); seen.add(ref); }
    for (const o of job.other) if (!seen.has(o.ref)) { rows.push(o); seen.add(o.ref); }
    return rows;
  }

  function bundleP(text, cls) {
    const p = HE.ui.h('p', cls || null);
    p.textContent = text;
    return p;
  }

  /** Before anything changes: how many files, how big, and what will stay a path. Resolves true to go on. */
  function bundleConfirm(job) {
    const ready = bundleReady(job);
    const rows = bundleSkippedRows(job);
    const size = ready.reduce((n, a) => n + a.size, 0);
    const growth = bundleGrowth(ready);
    return new Promise((resolve) => {
      const body = HE.ui.h('div', 'field-stack fio-dialog fio-bundle');
      if (ready.length) {
        body.append(bundleP(HE.t('會把 {n} 個檔案嵌入這份文件，合計 {size}。嵌入後 HTML 檔大約增加 {growth}。',
          { n: ready.length, size: HE.util.bytes(size), growth: HE.util.bytes(growth) })));
        if (growth > BUNDLE_BIG) body.append(bundleP(HE.t('檔案這麼大時，瀏覽器可能無法自動保存這份文件，嵌入後請記得儲存。'), 'field-help'));
      } else {
        body.append(bundleP(HE.t('在「{name}」裡找不到這個頁面引用的檔案，文件沒有改變。請確認選的是 HTML 檔所在的資料夾。',
          { name: job.folder.name || HE.t('選取的檔案') })));
      }
      if (rows.length) {
        body.append(bundleP(ready.length
          ? HE.t('以下 {n} 個不會嵌入，原本的路徑會保留：', { n: rows.length })
          : HE.t('{n} 個不會嵌入，原本的路徑會保留：', { n: rows.length })), bundleList(rows));
      }
      if (job.folder.truncated) body.append(bundleP(HE.t('資料夾裡的檔案太多或太深，只讀了一部分。選小一點的資料夾可以找到更多。'), 'field-help'));
      if (ready.length) body.append(bundleP(HE.t('嵌入是 1 個步驟，按 {key} 可以還原。', { key: HE.ui.kbd('mod+z') }), 'field-help'));
      HE.ui.modal({
        title: ready.length ? HE.t('嵌入圖片與樣式') : HE.t('沒有可以嵌入的檔案'),
        body,
        width: 520,
        onClose: (v) => resolve(v === true),
        actions: ready.length
          ? [{ label: HE.t('取消'), kind: 'ghost', value: false }, { label: HE.t('嵌入 {n} 個檔案', { n: ready.length }), kind: 'primary', value: true }]
          : [{ label: HE.t('關閉'), kind: 'primary', value: false }],
      });
    });
  }

  /** Afterwards: how many went in, and each one that did not, with its reason. */
  function bundleReport(result) {
    const vars = { n: result.embedded.length, size: HE.util.bytes(result.bytes), k: result.skipped.length };
    HE.ui.status(result.skipped.length ? HE.t('已嵌入 {n} 個檔案（{size}），略過 {k} 個', vars) : HE.t('已嵌入 {n} 個檔案（{size}）', vars));
    if (!result.skipped.length) {
      toast(HE.t('已嵌入 {n} 個檔案（{size}）。存出的 HTML 不再需要那些檔案。', vars), { type: 'success', timeout: 8000 });
      return;
    }
    const body = HE.ui.h('div', 'field-stack fio-dialog fio-bundle');
    body.append(
      bundleP(HE.t('已嵌入 {n} 個檔案（{size}），略過 {k} 個。', vars)),
      bundleP(HE.t('略過的檔案保留原本的路徑；存出的 HTML 單獨開啟時，它們不會載入：')),
      bundleList(result.skipped, 40),
      bundleP(HE.t('按 {key} 可以還原這次嵌入。', { key: HE.ui.kbd('mod+z') }), 'field-help'),
    );
    HE.ui.modal({ title: HE.t('嵌入結果'), body, width: 520, actions: [{ label: HE.t('關閉'), kind: 'primary' }] });
  }

  /**
   * Embed the open document's relative pictures, style sheets and fonts from a folder the user picks, so the saved
   * HTML needs no other file. source (optional, else the picker): {handle} a directory handle, {files} a FileList
   * or [{path, file}], {entries} a drop's entries. opts.confirm === false skips the dialog. Resolves with
   * {embedded: [paths], skipped: [{ref, why}], bytes} or null when nothing was done. Nothing is fetched.
   */
  async function bundleAssets(source, opts = {}) {
    if (!HE.doc.model) { toast(HE.t('目前沒有可以嵌入的文件')); return null; }
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再嵌入檔案')); return null; }
    if (state.bundling) return null;
    commitEdits();
    const refs = bundleRefs();
    if (!refs.count) {
      toast(refs.total ? HE.t('這份文件引用的相對路徑檔案（腳本、影音或內嵌頁面）這次不支援嵌入') : HE.t('這份文件沒有需要嵌入的檔案：圖片與樣式都已經在文件裡，或是用網址載入'));
      return null;
    }
    const seq = state.docSeq;
    let folder = null;
    try {
      if (!source) folder = await pickFolder();
      else if (source.handle) folder = await folderFromHandle(source.handle);
      else if (source.entries) folder = await folderFromEntries(source.entries);
      else folder = folderFromFiles(source.files);
    } catch (err) {
      console.error('[HE] fileio: reading the folder failed', err);
      toast(HE.t('無法讀取這個資料夾'), { type: 'error' });
      return null;
    }
    if (!folder || state.docSeq !== seq || state.bundling) return null;
    state.bundling = true;
    try {
      HE.ui.status(HE.t('正在讀取資料夾裡的檔案…'));
      const job = newBundleJob(folder, bundleScan(HE.doc.model));
      await bundlePlan(job);
      HE.ui.status('');
      if (state.docSeq !== seq) return null;
      const ok = opts.confirm === false ? bundleReady(job).length > 0 : await bundleConfirm(job);
      if (!ok || state.docSeq !== seq) return null;
      HE.ui.status(HE.t('正在嵌入檔案…'));
      await bundleRead(job);
      if (state.docSeq !== seq) return null;
      if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再嵌入檔案')); return null; }
      if (HE.history.active) { toast(HE.t('請先完成目前的操作，再嵌入檔案'), { type: 'error' }); return null; }
      commitEdits();
      // Each reference is resolved again while writing: a file dropped while reading shows up in the result.
      job.skipped.clear();
      bundleApply(job);
      const done = [...job.assets.values()].filter((a) => a.used && !a.why);
      const result = {
        embedded: done.map((a) => a.path),
        skipped: bundleSkippedRows(job),
        bytes: done.reduce((n, a) => n + a.size, 0),
      };
      bundleReport(result);
      return result;
    } catch (err) {
      console.error('[HE] fileio: embedding files failed', err);
      HE.ui.status('');
      toast(HE.t('無法嵌入檔案'), { type: 'error' });
      return null;
    } finally {
      state.bundling = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Reading files: charset sniffing and decoding                        */
  /* ------------------------------------------------------------------ */

  function readBuffer(file) {
    if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsArrayBuffer(file);
    });
  }

  function readDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error || new Error('read failed'));
      r.readAsDataURL(file);
    });
  }

  function decoderLabel(raw) {
    let label = String(raw || '').trim().toLowerCase();
    if (!label) return null;
    label = ENCODING_ALIASES[label] || label;
    // HTML rule: a <meta> readable as ASCII cannot really be UTF-16, so it means UTF-8.
    if (/^utf-?16/.test(label)) label = 'utf-8';
    try { new TextDecoder(label); return label; } catch (err) { return null; }
  }

  function sniffCharset(bytes) {
    const head = new TextDecoder('windows-1252').decode(bytes.subarray(0, 4096));
    const meta = CHARSET_SNIFF.exec(head);
    const xml = /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([^"']+)/i.exec(head);
    return decoderLabel((meta && meta[1]) || (xml && xml[1]));
  }

  function decodes(bytes, label) {
    try { new TextDecoder(label, { fatal: true }).decode(bytes); return true; } catch (err) { return false; }
  }

  function localeEncoding(lang) {
    const l = String(lang || '').toLowerCase();
    if (/^zh-(?:tw|hk|mo|hant)/.test(l)) return 'big5';
    if (/^zh/.test(l)) return 'gb18030';
    if (/^ja/.test(l)) return 'shift_jis';
    if (/^ko/.test(l)) return 'euc-kr';
    return null;
  }

  /** Undeclared and not valid UTF-8: try the viewer's locale first, then the common legacy encodings. */
  function guessLegacy(bytes) {
    const order = [];
    for (const l of [].concat(navigator.languages || [], navigator.language || [])) {
      const e = localeEncoding(l);
      if (e) order.push(e);
    }
    order.push('big5', 'gb18030', 'shift_jis', 'euc-kr');
    for (const enc of new Set(order)) if (decodes(bytes, enc)) return enc;
    return 'windows-1252';
  }

  function decodeHTML(bytes) {
    let enc = null;
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) enc = 'utf-8';
    else if (bytes[0] === 0xff && bytes[1] === 0xfe) enc = 'utf-16le';
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) enc = 'utf-16be';
    if (!enc) enc = sniffCharset(bytes);
    // guessed: no BOM, no declaration and not UTF-8, so the encoding is only the likeliest one that decodes.
    let guessed = false;
    if (!enc) {
      if (decodes(bytes, 'utf-8')) enc = 'utf-8';
      else { enc = guessLegacy(bytes); guessed = true; }
    }
    try {
      const d = new TextDecoder(enc);
      return { text: d.decode(bytes), encoding: d.encoding, guessed };
    } catch (err) {
      return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'utf-8', guessed: false };
    }
  }

  function isHtmlFile(file) {
    if (/\.(?:html?|xhtml)$/i.test(String(file.name || ''))) return true;
    return /^(?:text\/html|application\/xhtml\+xml)$/i.test(file.type || '');
  }

  function hasBOM(bytes) { return bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf; }

  /** opts: {handle} or {handlePromise} (a drop) — the file on disk to link, when the browser gives one. */
  async function openFile(file, opts = {}) {
    if (!file) return false;
    if (!isHtmlFile(file)) { toast(HE.t('只能開啟 .html 或 .htm 檔'), { type: 'error' }); return false; }
    let bytes;
    let decoded;
    try {
      bytes = new Uint8Array(await readBuffer(file));
      decoded = decodeHTML(bytes);
    } catch (err) {
      console.error('[HE] fileio: reading file failed', err);
      toast(HE.t('無法讀取「{name}」', { name: file.name }), { type: 'error' });
      return false;
    }
    let handle = opts.handle || null;
    if (!handle && opts.handlePromise) handle = await opts.handlePromise;
    let link = null;
    // Saving writes HTML serialization: an .xhtml file (XML) opens unlinked, as before.
    if (handle && handle.kind === 'file' && /\.html?$/i.test(handle.name || '') &&
      typeof handle.getFile === 'function' && typeof handle.createWritable === 'function') {
      link = newLink(handle, {
        stamp: stampOf(file), sig: sigOf(decoded.text), bom: hasBOM(bytes), eol: eolOf(decoded.text),
        encoding: decoded.encoding, guessed: decoded.guessed,
      });
      link.syncKind = 'opened';
    }
    return openText(decoded.text, file.name, { encoding: decoded.encoding, guessed: decoded.guessed, file: link });
  }

  async function open() {
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再開啟其他文件')); return; }
    if (fsaAvailable()) {
      let handle = null;
      try {
        [handle] = await window.showOpenFilePicker({ id: 'tactile', types: HTML_TYPES });
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.warn('[HE] fileio: open picker failed, using the file input', err);
      }
      if (handle) {
        let file;
        try { file = await handle.getFile(); } catch (err) {
          toast(HE.t('無法讀取「{name}」', { name: handle.name }), { type: 'error' });
          return;
        }
        await openFile(file, { handle });
        return;
      }
    }
    if (!els.input) return;
    els.input.value = '';
    els.input.click();
  }

  /* ------------------------------------------------------------------ */
  /* Paste dialog                                                        */
  /* ------------------------------------------------------------------ */

  function pasteDialog() {
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再開啟其他文件')); return; }
    const wrap = HE.ui.h('div', 'field-stack fio-dialog');
    const lab = HE.ui.h('label', 'field-label');
    lab.htmlFor = 'fio-paste-text';
    lab.textContent = HE.t('把 HTML 原始碼貼在這裡');
    const ta = HE.ui.h('textarea', 'textarea mono fio-code');
    ta.id = 'fio-paste-text';
    ta.rows = 14;
    ta.spellcheck = false;
    ta.setAttribute('wrap', 'off');
    ta.placeholder = '<!doctype html>\n<html>\n  …\n</html>';
    ta.value = state.pasteDraft;
    const help = HE.ui.h('div', 'field-help');
    help.textContent = HE.t('可以是完整的網頁，也可以只是一段 HTML。按 {key} 開啟。', { key: HE.ui.kbd('mod+enter') });
    const err = HE.ui.h('div', 'fio-error');
    err.setAttribute('role', 'alert');
    err.hidden = true;
    ta.addEventListener('input', () => { err.hidden = true; });
    wrap.append(lab, ta, help, err);

    let text = null;
    HE.ui.modal({
      title: HE.t('貼上 HTML'),
      body: wrap,
      width: 680,
      actions: [
        { label: HE.t('取消'), kind: 'ghost' },
        {
          label: HE.t('開啟'),
          kind: 'primary',
          onClick: () => {
            if (!ta.value.trim()) {
              err.textContent = HE.t('請先貼上 HTML 原始碼。');
              err.hidden = false;
              ta.focus();
              return false;
            }
            text = ta.value;
            return true;
          },
        },
      ],
      onClose: () => {
        if (text == null) { state.pasteDraft = ''; return; }
        // Keep the text if the user backs out of the replace confirmation, so it is not lost.
        state.pasteDraft = text;
        openText(text, null).then((ok) => { if (ok) state.pasteDraft = ''; });
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                              */
  /* ------------------------------------------------------------------ */

  /** Bytes on disk are UTF-8: make the file say so (rewrite the declaration, or add a BOM when there is none). */
  function exportText(raw) {
    const html = utf8Declaration(raw).html;
    return HAS_CHARSET.test(html) ? html : '﻿' + html;
  }

  function artifactFileName(name) {
    // The downloads allowlist knows "html" but not "htm".
    const n = String(name || 'untitled.html').replace(/\.htm$/i, '.html');
    return /\.html$/i.test(n) ? n : n + '.html';
  }

  function getDownloads() {
    if (!downloadsPromise) {
      downloadsPromise = Promise.resolve()
        .then(() => (window.claude && typeof window.claude.use === 'function' ? window.claude.use('downloads') : null))
        .catch(() => null);
    }
    return downloadsPromise;
  }

  function markExported(raw) {
    // A download or copy of a linked document leaves the file on disk behind: it stays dirty until saved back.
    if (!state.file) {
      state.dirty = false;
      state.baseline = raw;
    }
    state.exportedAt = Date.now();
    scheduleSave();
    renderStatus();
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function downloadBlob(data, filename, raw) {
    try {
      triggerDownload(new Blob([data], { type: 'text/html;charset=utf-8' }), filename);
    } catch (err) {
      console.error('[HE] fileio: download failed', err);
      toast(HE.t('無法下載 HTML 檔'), { type: 'error', action: { label: HE.t('複製 HTML'), fn: () => copyHTML() } });
      return false;
    }
    if (raw != null) markExported(raw);
    HE.ui.status(HE.t('已下載 {name}', { name: filename }));
    return true;
  }

  /**
   * Download the document. opts {raw, filename}: download that text instead, a copy that differs from the
   * document (tidy.js); the document's saved state then stays as it is.
   */
  async function exportHTML(opts) {
    if (!HE.doc.model) { toast(HE.t('目前沒有可匯出的文件')); return false; }
    if (state.exporting) return false;
    commitEdits();
    const copy = !!opts && typeof opts.raw === 'string';
    const filename = copy && opts.filename ? opts.filename : HE.doc.name;
    const raw = copy ? opts.raw : HE.doc.serialize();
    const data = exportText(raw);
    if (!HE.env.inArtifact) return downloadBlob(data, filename, copy ? null : raw);

    state.exporting = true;
    try {
      const dl = await getDownloads();
      if (!dl || typeof dl.save !== 'function') {
        toast(HE.t('這裡無法直接下載檔案，改為複製 HTML 原始碼'));
        return await copyHTML();
      }
      try {
        await dl.save({ filename: artifactFileName(filename), data });
      } catch (err) {
        const code = err && err.code;
        if (code === 'declined') return false;
        if (code === 'rate_limited') { toast(HE.t('請稍後再試')); return false; }
        console.warn('[HE] fileio: downloads.save rejected', err);
        toast(HE.t('無法下載 HTML 檔'), { type: 'error', action: { label: HE.t('複製 HTML'), fn: () => copyHTML() } });
        return false;
      }
      if (!copy) markExported(raw);
      HE.ui.status(HE.t('已匯出 {name}', { name: filename }));
      return true;
    } finally {
      state.exporting = false;
    }
  }

  /**
   * Download a text that is not the document (the rules file of the 出處 pane). In the Artifact, where a download
   * needs the host's leave and may be refused for this kind of file, the text goes to the clipboard instead.
   */
  async function downloadText(text, filename, type) {
    if (!HE.env.inArtifact) {
      try { triggerDownload(new Blob([text], { type: type || 'text/plain;charset=utf-8' }), filename); }
      catch (err) { console.error('[HE] fileio: download failed', err); toast(HE.t('無法下載 {name}', { name: filename }), { type: 'error' }); return false; }
      HE.ui.status(HE.t('已下載 {name}', { name: filename }));
      return true;
    }
    const dl = await getDownloads();
    try {
      if (!dl || typeof dl.save !== 'function') throw new Error('no downloads');
      await dl.save({ filename, data: text });
      HE.ui.status(HE.t('已下載 {name}', { name: filename }));
      return true;
    } catch (err) {
      if (err && err.code === 'declined') return false;
      try { await navigator.clipboard.writeText(text); } catch (e) { toast(HE.t('無法下載 {name}', { name: filename }), { type: 'error' }); return false; }
      toast(HE.t('這裡無法下載 {name}，內容已複製到剪貼簿', { name: filename }));
      return true;
    }
  }

  /** Copy the clean source. Call from a user gesture; falls back to a dialog with the text selected. */
  function copyHTML() {
    if (!HE.doc.model) { toast(HE.t('目前沒有可複製的文件')); return Promise.resolve(false); }
    commitEdits();
    const raw = HE.doc.serialize();
    const text = utf8Declaration(raw).html;
    const clip = navigator.clipboard;
    if (!clip || typeof clip.writeText !== 'function') {
      showCopyDialog(text, raw);
      return Promise.resolve(false);
    }
    let p;
    try { p = clip.writeText(text); } catch (err) { p = Promise.reject(err); }
    return p.then(() => {
      markExported(raw);
      toast(HE.t('已複製 HTML 原始碼（{size}）', { size: HE.util.bytes(byteLength(text)) }), { type: 'success' });
      return true;
    }, () => {
      showCopyDialog(text, raw);
      return false;
    });
  }

  function showCopyDialog(text, raw) {
    const wrap = HE.ui.h('div', 'field-stack fio-dialog');
    const lab = HE.ui.h('label', 'field-label');
    lab.htmlFor = 'fio-copy-text';
    lab.textContent = HE.t('瀏覽器不允許自動複製。內容已全選，按 {key} 即可複製。', { key: HE.ui.kbd('mod+c') });
    const ta = HE.ui.h('textarea', 'textarea mono fio-code');
    ta.id = 'fio-copy-text';
    ta.readOnly = true;
    ta.rows = 14;
    ta.spellcheck = false;
    ta.setAttribute('wrap', 'off');
    ta.value = text;
    wrap.append(lab, ta);

    let copied = false;
    const onCopied = () => {
      if (copied) return;
      copied = true;
      markExported(raw);
      toast(HE.t('已複製 HTML 原始碼'), { type: 'success' });
    };
    ta.addEventListener('copy', onCopied);
    const selectAll = () => { ta.focus(); ta.select(); ta.scrollTop = 0; };

    HE.ui.modal({
      title: HE.t('複製 HTML 原始碼'),
      body: wrap,
      width: 680,
      actions: [
        { label: HE.t('關閉'), kind: 'ghost' },
        {
          label: HE.t('複製'),
          kind: 'primary',
          onClick: () => {
            selectAll();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            if (ok) { onCopied(); return true; }
            HE.ui.status(HE.t('請按 {key} 複製已選取的內容', { key: HE.ui.kbd('mod+c') }));
            return false;
          },
        },
      ],
    });
    // After the modal's own autofocus pass.
    setTimeout(selectAll, 30);
  }

  /* ------------------------------------------------------------------ */
  /* Export as a picture (PNG) and through the print dialog (PDF)        */
  /* ------------------------------------------------------------------ */

  /**
   * A clean copy of the document, laid out off screen at w x h: what an export holds (HE.doc.serialize(), so no
   * data-he-id, no editor CSS, no selection), in a frame that runs no script. Resolves with the frame once it has
   * loaded; the caller removes it.
   */
  function copyFrame(html, opts) {
    return new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.className = 'fio-copy-frame';
      if (opts.id) f.id = opts.id;
      // {hear: true}: the editor listens for an event in this frame (afterprint). Where a frame without scripts hears
      // nothing (WebKit), it is made as the canvas's guarded frame is: scripts allowed under a policy that refuses
      // them all, and the permission taken back once it has loaded (canvas.js, GUARD_SANDBOX).
      const guard = !!opts.hear && !!HE.canvas && HE.canvas.deaf;
      f.setAttribute('sandbox', guard ? opts.sandbox + ' allow-scripts' : opts.sandbox);
      if (guard) {
        html = HE.util.intoHead(html, HE.canvas.guardCsp);
        f.addEventListener('load', () => f.setAttribute('sandbox', opts.sandbox));
      }
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.width = opts.w + 'px';
      f.style.height = opts.h + 'px';
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        let d = null;
        try { d = f.contentDocument; } catch (err) { d = null; }
        if (!d || !d.documentElement || !d.body) { f.remove(); reject(new Error('The copy did not load.')); return; }
        const fonts = d.fonts && d.fonts.ready ? d.fonts.ready.catch(() => null) : Promise.resolve();
        Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).then(() => resolve(f));
      };
      // An outside image that never answers must not hold the export: go on with what has loaded.
      const timer = setTimeout(done, COPY_LOAD_MS);
      f.addEventListener('load', done);
      f.srcdoc = html;
      document.body.append(f);
    });
  }

  function exportName(ext) {
    return String(HE.doc.name || 'untitled.html').replace(/\.html?$/i, '') + '.' + ext;
  }

  /**
   * The whole page as a PNG, at the width of the device the canvas shows. HE.snap draws a clean copy of the
   * model, so the picture is of the exported page: no outlines, and layers hidden in the editor are in it.
   */
  async function exportPNG() {
    if (!HE.doc.model) { toast(HE.t('目前沒有可匯出的文件')); return false; }
    if (state.exporting) return false;
    commitEdits();
    const live = HE.live.doc && HE.live.doc.documentElement;
    if (!HE.snap || !live || !live.clientWidth || !(await HE.snap.probe())) {
      toast(HE.t('這個瀏覽器無法把頁面畫成圖片，請改用「匯出 PDF」或系統的截圖工具'), { type: 'error' });
      return false;
    }
    if (state.exporting) return false;
    state.exporting = true;
    HE.ui.status(HE.t('正在產生 PNG…'));
    const working = toast(HE.t('正在產生 PNG 圖片…'), { sticky: true });
    let frame = null;
    try {
      const html = HE.util.intoHead(HE.doc.serialize(), '<style>' + NO_PAGE_SCROLLBARS + '</style>');
      frame = await copyFrame(html, { w: live.clientWidth, h: live.clientHeight, sandbox: 'allow-same-origin' });
      // A multi-page document: the picture is of the page the canvas shows (a PDF holds them all).
      if (HE.pages && HE.pages.freeze) HE.pages.freeze(frame.contentDocument);
      const shot = await HE.snap.page(frame.contentDocument);
      const blob = await shot.blob();
      const filename = exportName('png');
      if (HE.env.inArtifact) {
        const dl = await getDownloads();
        if (!dl || typeof dl.save !== 'function') { toast(HE.t('這裡無法下載檔案'), { type: 'error' }); return false; }
        try {
          await dl.save({ filename, data: blob });
        } catch (err) {
          const code = err && err.code;
          if (code === 'declined') { HE.ui.status(''); return false; }
          if (code === 'rate_limited') { toast(HE.t('請稍後再試')); return false; }
          console.warn('[HE] fileio: downloads.save rejected', err);
          toast(HE.t('無法下載 PNG 圖片'), { type: 'error' });
          return false;
        }
      } else {
        triggerDownload(blob, filename);
      }
      HE.ui.status(HE.t('已匯出 {name}（{w} × {h} 像素）', { name: filename, w: shot.width, h: shot.height }));
      toast(HE.t('已匯出 {name}，檔案在瀏覽器的下載資料夾', { name: filename }), { type: 'success', timeout: 5000 });
      if (shot.scale < 1) toast(HE.t('頁面很長，圖片已縮小到 {pct}% 才放得進一張 PNG。', { pct: Math.round(shot.scale * 100) }));
      if (shot.missing.length || shot.skipped) toast(HE.t('有外部圖片或嵌入內容無法畫進圖片，已用灰色框代替。'), { timeout: 8000 });
      return true;
    } catch (err) {
      console.error('[HE] fileio: PNG export failed', err);
      HE.ui.status('');
      toast(HE.t('無法產生 PNG 圖片'), { type: 'error' });
      return false;
    } finally {
      working.close();
      if (frame) frame.remove();
      state.exporting = false;
    }
  }

  /** A deck in the print copy: a selector for its boards and their width / height, or null. The 頁面 pane uses the same rule. */
  function findDeck(doc) {
    return HE.pages ? HE.pages.findDeck(doc) : null;
  }

  function removePrintFrame() {
    const old = document.getElementById(PRINT_FRAME_ID);
    if (old) old.remove();
  }

  /** What the print dialog shows: the exported page, with backgrounds kept, and a deck's boards one per page. */
  async function printFrame() {
    removePrintFrame();
    const html = HE.util.intoHead(HE.doc.serialize(), '<style>' + PRINT_CSS + '</style>');
    const frame = await copyFrame(html, { id: PRINT_FRAME_ID, w: PRINT_W, h: PRINT_H, sandbox: PRINT_SANDBOX, hear: true });
    const doc = frame.contentDocument;
    // The dialog proposes the title as the PDF's file name.
    if (!String(doc.title || '').trim()) doc.title = exportName('pdf').replace(/\.pdf$/, '');
    const deck = findDeck(doc);
    if (deck) {
      const st = doc.createElement('style');
      st.textContent = '@page{size:' + PRINT_W + 'px ' + Math.round(PRINT_W / deck.ratio) + 'px;margin:0}' +
        '@media print{' + deck.selector + '{break-after:page!important;break-inside:avoid!important}' +
        deck.selector + ':last-child{break-after:auto!important}}';
      doc.head.append(st);
    }
    return { frame, deck: !!deck };
  }

  /**
   * PDF through the browser's own print dialog (the user picks 另存為 PDF): the editor writes no PDF bytes. What
   * prints is a clean copy in a frame without allow-scripts; allow-modals is what lets a sandboxed frame print.
   */
  async function exportPDF(opts = {}) {
    if (!HE.doc.model) { toast(HE.t('目前沒有可匯出的文件')); return false; }
    if (HE.env.inArtifact) { toast(HE.t('這裡無法開啟列印對話方塊，請先下載 HTML，再用瀏覽器開啟後列印成 PDF')); return false; }
    if (state.exporting) return false;
    commitEdits();
    if (!opts.skipHint && !(await pdfHint())) return false;
    if (state.exporting || !HE.doc.model) return false;
    state.exporting = true;
    HE.ui.status(HE.t('正在準備列印…'));
    try {
      const { frame, deck } = await printFrame();
      const win = frame.contentWindow;
      let closed = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        // Some browsers return from print() before the dialog is done with the document.
        setTimeout(() => frame.remove(), 1000);
      };
      win.addEventListener('afterprint', () => {
        cleanup();
        // The dialog is the browser's: whether the user saved or cancelled is not told to the page.
        toast(HE.t('列印對話方塊已關閉。如果你按了「儲存」，PDF 已存到你選的位置'), { type: 'success', timeout: 6000 });
      }, { once: true });
      setTimeout(cleanup, PRINT_KEEP_MS);
      HE.emit('print:ready', { frame, deck });
      HE.ui.status(deck ? HE.t('已開啟列印對話方塊（每張投影片一頁）') : HE.t('已開啟列印對話方塊'));
      win.focus();
      win.print();
      return true;
    } catch (err) {
      console.error('[HE] fileio: print failed', err);
      removePrintFrame();
      HE.ui.status('');
      toast(HE.t('無法開啟列印對話方塊'), { type: 'error', action: { label: HE.t('下載 HTML'), fn: () => exportHTML() } });
      return false;
    } finally {
      state.exporting = false;
    }
  }

  /** The dialog is the browser's, so say beforehand what to pick in it. Resolves true to go on. */
  function pdfHint() {
    return new Promise((resolve) => {
      const body = HE.ui.h('div', 'field-stack fio-dialog');
      body.append(
        HE.ui.h('p', null, HE.util.esc(HE.t('接下來會開啟瀏覽器的列印對話方塊。'))),
        // {pdf} stays in the escaped sentence and takes the option's name, in bold, afterwards.
        HE.ui.h('p', null, HE.util.esc(HE.t('請在「目的地」（或「印表機」）選「{pdf}」，再按「儲存」。'))
          .replace('{pdf}', () => '<strong>' + HE.util.esc(HE.t('另存為 PDF')) + '</strong>')),
        HE.ui.h('p', 'field-help', HE.util.esc(HE.t('背景顏色會保留。簡報會每張投影片一頁。頁面腳本不執行，內容和編輯畫面相同。'))),
      );
      HE.ui.modal({
        title: HE.t('匯出 PDF'),
        body,
        width: 440,
        onClose: (v) => resolve(v === true),
        actions: [
          { label: HE.t('取消'), kind: 'ghost', value: false },
          { label: HE.t('開啟列印對話方塊'), kind: 'primary', value: true },
        ],
      });
    });
  }

  function previewInTab() {
    if (HE.env.inArtifact || !HE.doc.model) return;
    commitEdits();
    // A blob page shares our origin and its storage (the AI keys), so the wrapper runs no script and the
    // document runs in a frame without allow-same-origin (HE.PAGE_SANDBOX), which gives it an opaque origin.
    // It always runs the page's scripts, trusted or not: the isolation, not the consent, is what protects here.
    // A page tried out in its own tab may save files; the canvas's run frame may not.
    let html = HE.doc.serialize();
    // In about:srcdoc a bare '#id' resolves against the wrapper's blob: URL and would load the wrapper into the frame.
    // intoHead skips a leading comment that mentions <head> (a license or template header).
    if (!HE.doc.model.querySelector('base[href]')) html = HE.util.intoHead(html, '<base href="about:srcdoc">');
    const src = html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const title = String(HE.doc.model.title || '').trim() || HE.doc.name;
    // autofocus moves keyboard focus into the frame, so a deck's arrow keys work without a click first.
    const page = '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + HE.util.esc(title) + '</title>' +
      '<style>html,body{margin:0;height:100%}iframe{display:block;border:0;width:100%;height:100%}</style></head>' +
      '<body><iframe sandbox="' + PAGE_SANDBOX + ' allow-downloads" allowfullscreen autofocus' +
      ' srcdoc="' + src + '"></iframe></body></html>';
    const url = URL.createObjectURL(new Blob([page], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank');
    if (w) {
      try { w.opener = null; } catch (err) { /* already detached */ }
    } else {
      toast(HE.t('瀏覽器擋住了新分頁，請允許這個頁面開啟彈出式視窗'), { type: 'error' });
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ------------------------------------------------------------------ */
  /* Saving back to the file on disk                                     */
  /* ------------------------------------------------------------------ */

  function newLink(handle, info) {
    return Object.assign({
      handle,
      name: handle.name,
      stamp: null, // {t: lastModified, n: size} of the version this document was last in step with; null: read it to know
      sig: '', // sigOf that version's text
      bom: false,
      eol: '\n',
      encoding: 'utf-8',
      guessed: false, // the encoding was only guessed (decodeHTML): ask before the first write turns the file into UTF-8
      syncAt: Date.now(),
      syncKind: 'saved', // 'opened' | 'saved' | 'loaded'
      readable: true, // false after a reload, until the browser grants access again
      seen: null, // stamp of a disk version already offered while the document had its own changes
      pending: null, // stamp of a disk version waiting to load into a clean document until nothing is under way
      missing: false,
      persistedAs: null,
    }, info);
  }

  function stampOf(file) { return { t: +file.lastModified || 0, n: file.size }; }
  function sameStamp(file, s) { return !!s && +file.lastModified === s.t && file.size === s.n; }

  /** Cheap content signature: tells a real change from a rewrite with the same text (a touch, a checkout). */
  function sigOf(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return text.length + ':' + (h >>> 0).toString(36);
  }

  function eolOf(text) {
    const lf = (text.match(/\n/g) || []).length;
    const crlf = (text.match(/\r\n/g) || []).length;
    return crlf && crlf * 2 >= lf ? '\r\n' : '\n';
  }

  /** What goes on disk: UTF-8 with the file's own line endings; a BOM when the file had one, or when nothing else says UTF-8. */
  function diskText(raw, f) {
    let t = utf8Declaration(raw).html;
    if (f.eol === '\r\n') t = t.replace(/\r?\n/g, '\r\n');
    return f.bom || (f.encoding !== 'utf-8' && !HAS_CHARSET.test(t)) ? '﻿' + t : t;
  }

  /** {text, encoding, bom, eol} of a file read from disk, or null when it changed again or vanished while reading. */
  async function readDisk(file) {
    try {
      const bytes = new Uint8Array(await readBuffer(file));
      const d = decodeHTML(bytes);
      return { text: d.text, encoding: d.encoding, guessed: d.guessed, bom: hasBOM(bytes), eol: eolOf(d.text) };
    } catch (err) {
      return null;
    }
  }

  /**
   * 'granted' | 'prompt' | 'denied'. ask: may show the browser's prompt (needs a user gesture). The query shows no
   * UI, so it gets a time limit: on a handle whose frame is gone it never settles, and the save would hang with it.
   */
  async function permission(handle, mode, ask) {
    try {
      const o = { mode };
      let p = 'granted';
      if (typeof handle.queryPermission === 'function') {
        let timer;
        const late = new Promise((resolve) => { timer = setTimeout(() => resolve('denied'), 3000); });
        p = await Promise.race([handle.queryPermission(o), late]);
        clearTimeout(timer);
      }
      if (p === 'prompt' && ask && typeof handle.requestPermission === 'function') p = await handle.requestPermission(o);
      return p;
    } catch (err) {
      return 'denied';
    }
  }

  async function writeFile(f, text) {
    // The browser writes a temporary copy and swaps it in on close: a reader never sees half a file.
    const w = await f.handle.createWritable();
    try {
      await w.write(text);
      await w.close();
    } catch (err) {
      try { await w.abort(); } catch (e) { /* already closed */ }
      throw err;
    }
  }

  /** After writing `text` (serialized as `raw`, with `changes` edits so far): the document matches the file. */
  function markSaved(f, raw, text, changes) {
    const bom = text.charCodeAt(0) === 0xfeff;
    // Read back on the next check, so a write by someone else right after this one is not taken for it.
    f.stamp = null;
    f.sig = sigOf(bom ? text.slice(1) : text);
    f.bom = bom;
    f.encoding = 'utf-8';
    f.guessed = false;
    f.syncAt = Date.now();
    f.syncKind = 'saved';
    f.seen = null;
    f.pending = null;
    f.missing = false;
    closeDiskToast();
    state.dirty = state.changes !== changes;
    state.baseline = raw;
    markExported(raw);
    persistLink();
  }

  /** mod+S: save back to the linked file, else ask where to save (or download, where pages cannot write files). */
  function save() {
    if (!fsaAvailable()) return exportHTML();
    return state.file ? saveBack() : saveAs();
  }

  function saveAsAction() { return { label: HE.t('另存新檔'), fn: () => saveAs() }; }

  async function saveBack() {
    const f = state.file;
    if (!HE.doc.model || !f || state.exporting) return false;
    // Mid-run the model holds half the AI's change and none of it counts as an edit yet.
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再儲存')); return false; }
    commitEdits();
    let then = null;
    state.exporting = true;
    try {
      refreshDirty();
      // Only a write can do harm, and a clean document is never written.
      if (f.guessed && state.dirty) {
        const choice = await guessedDialog(f);
        if (state.file !== f) return false;
        if (choice === 'saveas') { then = saveAs; return false; }
        if (choice !== 'write') return false;
      }
      if ((await permission(f.handle, 'readwrite', true)) !== 'granted') {
        toast(HE.t('瀏覽器沒有允許寫入「{name}」', { name: f.name }), { type: 'error', action: saveAsAction() });
        return false;
      }
      if (!f.readable) accessGranted(f);
      let disk;
      try {
        disk = await f.handle.getFile();
      } catch (err) {
        diskGone(f);
        toast(HE.t('找不到「{name}」，它可能已被移動、改名或刪除', { name: f.name }), { type: 'error', action: saveAsAction() });
        return false;
      }
      if (state.file !== f) return false;
      refreshDirty();
      if (!sameStamp(disk, f.stamp)) {
        const now = await readDisk(disk);
        if (state.file !== f) return false;
        if (!now) { toast(HE.t('暫時無法讀取「{name}」，請再試一次', { name: f.name }), { type: 'error' }); return false; }
        if (sigOf(now.text) !== f.sig) {
          // Someone else wrote the file since this document was last in step with it.
          if (!state.dirty) {
            applyDisk(f, disk, now, HE.t('「{name}」在磁碟上有較新的版本，已重新載入', { name: f.name }));
            return false;
          }
          const choice = await conflictDialog(f.name);
          if (state.file !== f) return false;
          if (choice === 'load') { applyDisk(f, disk, now, HE.t('已載入磁碟上的版本，按「復原」可以找回你的修改')); return false; }
          if (choice === 'saveas') { then = saveAs; return false; }
          if (choice !== 'overwrite') return false;
        } else {
          adoptDisk(f, disk, now);
        }
      }
      // Unchanged here and on disk: writing would only reformat the file.
      if (!state.dirty && sameStamp(disk, f.stamp)) { HE.ui.status(HE.t('沒有新的修改，「{name}」維持原樣', { name: f.name })); return true; }
      const raw = HE.doc.serialize();
      const text = diskText(raw, f);
      const changes = state.changes;
      try {
        await writeFile(f, text);
      } catch (err) {
        console.error('[HE] fileio: saving to disk failed', err);
        toast(HE.t('無法存回「{name}」', { name: f.name }), { type: 'error', action: saveAsAction() });
        return false;
      }
      if (state.file !== f) return true;
      markSaved(f, raw, text, changes);
      HE.ui.status(HE.t('已存回 {name}', { name: f.name }));
      return true;
    } finally {
      state.exporting = false;
      if (then) then();
    }
  }

  async function saveAs() {
    if (!fsaAvailable()) return exportHTML();
    if (!HE.doc.model) { toast(HE.t('目前沒有可儲存的文件')); return false; }
    if (state.exporting) return false;
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再儲存')); return false; }
    commitEdits();
    let fallback = false;
    state.exporting = true;
    try {
      let handle;
      try {
        handle = await window.showSaveFilePicker({ id: 'tactile', suggestedName: HE.doc.name, types: HTML_TYPES });
      } catch (err) {
        if (err && err.name === 'AbortError') return false;
        console.warn('[HE] fileio: save picker failed', err);
        toast(HE.t('無法開啟存檔視窗，改為下載 HTML 檔'));
        fallback = true;
        return false;
      }
      const prev = state.file;
      const seq = state.docSeq;
      const raw = HE.doc.serialize();
      // A converted legacy file without a charset declaration still needs its BOM (diskText adds it).
      const f = newLink(handle, prev
        ? { bom: prev.bom, eol: prev.eol, encoding: prev.encoding }
        : { bom: !HAS_CHARSET.test(utf8Declaration(raw).html) });
      const text = diskText(raw, f);
      const changes = state.changes;
      try {
        await writeFile(f, text);
      } catch (err) {
        console.error('[HE] fileio: saving to disk failed', err);
        toast(HE.t('無法儲存「{name}」', { name: f.name }), { type: 'error', action: { label: HE.t('下載 HTML'), fn: () => exportHTML() } });
        return false;
      }
      if (state.docSeq !== seq) return true; // another document was opened meanwhile: it keeps its own link
      state.file = f;
      linkChanged(prev);
      if (HE.doc.name !== f.name) HE.doc.setName(f.name);
      markSaved(f, raw, text, changes);
      HE.ui.status(HE.t('已儲存 {name}', { name: f.name }));
      return true;
    } finally {
      state.exporting = false;
      if (fallback) exportHTML();
    }
  }

  /** Resolves 'overwrite' | 'load' | 'saveas' | null. */
  /** The file declares no encoding and was read by guessing: rewriting it as UTF-8 fixes the guess in place for good. */
  function guessedDialog(f) {
    const encName = ENCODING_NAMES[f.encoding] || String(f.encoding).toUpperCase();
    return new Promise((resolve) => {
      const body = HE.ui.h('p', 'modal-text');
      body.textContent = HE.t('「{name}」沒有標示文字編碼，開啟時是猜測用 {enc} 讀取的。存回會把整個檔案改寫成 UTF-8；如果猜錯了，檔案裡的文字（包括畫面上看不到的註解和腳本）會變成別的字，原本的內容也找不回來。不確定的話，請先另存新檔，確認無誤再取代原檔。',
        { name: f.name, enc: encName });
      HE.ui.modal({
        title: HE.t('存回前確認文字編碼'),
        body,
        width: 500,
        onClose: (v) => resolve(v || null),
        actions: [
          { label: HE.t('取消'), kind: 'ghost', value: null },
          { label: HE.t('另存新檔…'), kind: 'ghost', value: 'saveas' },
          { label: HE.t('仍要存回'), kind: 'danger', value: 'write' },
        ],
      });
    });
  }

  function conflictDialog(name) {
    return new Promise((resolve) => {
      const body = HE.ui.h('p', 'modal-text');
      body.textContent = HE.t('「{name}」在磁碟上被其他程式修改過（例如 AI 代理），這裡也有還沒儲存的修改。覆寫會蓋掉磁碟上的那些變更；載入磁碟版本之後，可以按「復原」找回你的修改。', { name });
      HE.ui.modal({
        title: HE.t('磁碟上的檔案已經改變'),
        body,
        width: 500,
        onClose: (v) => resolve(v || null),
        actions: [
          { label: HE.t('取消'), kind: 'ghost', value: null },
          { label: HE.t('另存新檔…'), kind: 'ghost', value: 'saveas' },
          { label: HE.t('載入磁碟版本'), kind: 'ghost', value: 'load' },
          { label: HE.t('覆寫'), kind: 'danger', value: 'overwrite' },
        ],
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Watching the file on disk                                           */
  /* ------------------------------------------------------------------ */

  function closeDiskToast() {
    if (diskToast) diskToast.close();
    diskToast = null;
  }

  function closeAccessToast() {
    if (accessToast) accessToast.close();
    accessToast = null;
  }

  /** The browser lets this page read the linked file again (after a reload, the user's OK). */
  function accessGranted(f) {
    f.readable = true;
    closeAccessToast();
    renderStatus();
  }

  /** The disk holds the version this document is in step with again (a revert): nothing waits or is on offer. */
  function backInStep(f) {
    if (!f.pending && !f.seen) return;
    f.pending = null;
    f.seen = null;
    closeDiskToast();
    renderStatus();
  }

  /** The disk text is the one this document is in step with: take its stamp, and the bytes' own traits too
   *  (a BOM added or dropped elsewhere leaves the text alone, and the next save keeps what the file has now). */
  function adoptDisk(f, disk, now) {
    const moved = f.bom !== now.bom || f.encoding !== now.encoding || f.guessed !== !!now.guessed;
    f.stamp = stampOf(disk);
    f.bom = now.bom;
    f.encoding = now.encoding;
    f.guessed = !!now.guessed;
    if (moved) persistLink();
    backInStep(f);
  }

  /** The file is gone: whatever was offered from it is gone too. */
  function diskGone(f) {
    f.missing = true;
    f.seen = null;
    f.pending = null;
    closeDiskToast();
    renderStatus();
  }

  function topUndo() {
    const s = HE.history.undoStack;
    return s && s.length ? s[s.length - 1] : null;
  }

  /** Replace the document with the version on disk: one undo step, so the user's own version is a mod+Z away. */
  function applyDisk(f, disk, now, msg) {
    // Inside an open transaction (an AI run) the replace would merge into that step and cut the run off.
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再載入磁碟上的版本')); return false; }
    if (HE.history.active) { toast(HE.t('請先完成目前的操作，再載入磁碟上的版本'), { type: 'error' }); return false; }
    commitEdits();
    try {
      HE.ops.replaceDocument(utf8Declaration(now.text).html, { label: HE.t('載入磁碟上的版本') });
    } catch (err) {
      console.error('[HE] fileio: loading the disk version failed', err);
      toast(HE.t('無法載入磁碟上的版本'), { type: 'error' });
      return false;
    }
    const entry = topUndo();
    state.dirty = false;
    state.baseline = HE.doc.serialize();
    Object.assign(f, {
      stamp: stampOf(disk), sig: sigOf(now.text), bom: now.bom, eol: now.eol, encoding: now.encoding, guessed: !!now.guessed,
      syncAt: Date.now(), syncKind: 'loaded', seen: null, pending: null, missing: false,
    });
    closeDiskToast();
    persistLink();
    scheduleSave();
    renderStatus();
    toast(msg, {
      type: 'success',
      action: {
        label: HE.t('復原'),
        fn: () => {
          commitEdits(); // typing since the reload becomes its own step, so the check below sees it
          const H = HE.history;
          // The entry moves between the stacks, so where it is tells what already happened to the reload.
          if (H.active) toast(HE.t('請先完成目前的操作，再復原這次載入'), { type: 'error' });
          else if (entry && topUndo() === entry) H.undo();
          else if (entry && H.redoStack.includes(entry)) toast(HE.t('已經回到載入前的版本'));
          else if (entry && H.undoStack.includes(entry)) toast(HE.t('之後還有其他修改，請按 {key} 逐步復原', { key: HE.ui.kbd('mod+z') }));
          else toast(HE.t('這次載入已經無法復原'));
        },
      },
    });
    return true;
  }

  /** The disk changed while this document has its own changes: let the user choose (mod+S asks again). */
  function offerDisk(f, disk) {
    f.seen = stampOf(disk);
    f.pending = null;
    closeDiskToast();
    diskToast = toast(HE.t('「{name}」在磁碟上被其他程式修改了，這裡也有還沒儲存的修改。', { name: f.name }), {
      sticky: true,
      action: { label: HE.t('載入磁碟版本'), fn: () => loadDiskVersion(f) },
    });
    renderStatus();
  }

  async function loadDiskVersion(f) {
    diskToast = null;
    if (state.file !== f) return;
    // Whatever stops it here, forget the offer: the next check makes it again (after the AI run, if one is going).
    const reoffer = () => { f.seen = null; renderStatus(); };
    if (aiBusy()) { reoffer(); warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再載入磁碟上的版本')); return; }
    let disk;
    try {
      disk = await f.handle.getFile();
    } catch (err) {
      if (err && err.name === 'NotFoundError') { diskGone(f); toast(HE.t('找不到「{name}」', { name: f.name }), { type: 'error' }); return; }
      reoffer();
      toast(HE.t('暫時無法讀取「{name}」，請再試一次', { name: f.name }), { type: 'error' });
      return;
    }
    const now = await readDisk(disk);
    if (state.file !== f) return;
    if (!now) { reoffer(); toast(HE.t('暫時無法讀取「{name}」，請再試一次', { name: f.name }), { type: 'error' }); return; }
    if (!applyDisk(f, disk, now, HE.t('已載入磁碟上的版本，按「復原」可以找回你的修改'))) reoffer();
  }

  /** Nothing under way that replacing the whole document would cut off. */
  function quiet() {
    if (aiBusy() || HE.history.active || modalOpen() || state.confirming || state.pointerDown) return false;
    const c = HE.canvas;
    try {
      if (c && typeof c.isEditingText === 'function' && c.isEditingText()) return false;
      // Presses in the edit frame and on the canvas's own handles never reach this module's listeners.
      if (c && typeof c.isGesturing === 'function' && c.isGesturing()) return false;
    } catch (err) {
      return false;
    }
    // A focused field only matters while the user is in this window (not while an agent runs in the terminal).
    const a = document.activeElement;
    return !(document.hasFocus() && a && a !== document.body && HE.util.isTypingTarget(a));
  }

  /**
   * Every few seconds while the tab is visible, and on focus: pick up what someone else (a coding agent) wrote.
   * A clean document reloads by itself (one undo step); one with its own changes gets an offer instead.
   */
  async function checkDisk() {
    const f = state.file;
    if (!f || state.checking || state.exporting || document.visibilityState === 'hidden') return;
    state.checking = true;
    try {
      if (!f.readable) {
        if ((await permission(f.handle, 'read', false)) !== 'granted') return;
        accessGranted(f);
      }
      let disk;
      try {
        disk = await f.handle.getFile();
      } catch (err) {
        const name = err && err.name;
        if (name === 'NotAllowedError') { f.readable = false; renderStatus(); }
        else if (name === 'NotFoundError') diskGone(f);
        // Anything else (busy, a handle gone bad): saving says so if it lasts.
        return;
      }
      if (f.missing) { f.missing = false; renderStatus(); }
      if (state.file !== f) return;
      // A rename or copy back can restore the old stamp itself: in step again without a read.
      if (sameStamp(disk, f.stamp)) { backInStep(f); return; }
      // During an AI run the document's own changes are not counted yet: decide once it is done.
      if (aiBusy() || HE.history.active) return;
      refreshDirty();
      if (state.dirty && sameStamp(disk, f.seen)) return; // already offered
      if (!state.dirty && sameStamp(disk, f.pending) && !quiet()) return; // still waiting: no need to read it again
      const now = await readDisk(disk);
      if (!now || state.file !== f) return;
      if (sigOf(now.text) === f.sig) { adoptDisk(f, disk, now); return; }
      // Empty: most likely a writer that truncates first and has not written yet. The next check sees the rest.
      if (!now.text.trim()) return;
      if (aiBusy() || HE.history.active) return;
      if (state.dirty) { offerDisk(f, disk); return; }
      if (!quiet()) {
        // The next check tries again; meanwhile the status says a newer version is waiting.
        if (!sameStamp(disk, f.pending)) { f.pending = stampOf(disk); renderStatus(); }
        return;
      }
      applyDisk(f, disk, now, HE.t('「{name}」在磁碟上更新了，已重新載入', { name: f.name }));
    } finally {
      state.checking = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Keeping the link across reloads (IndexedDB, keyed by tab id)        */
  /* ------------------------------------------------------------------ */

  function linkStore() {
    if (!linkDB) {
      linkDB = new Promise((resolve) => {
        try {
          const req = indexedDB.open(LINK_DB, 1);
          req.onupgradeneeded = () => req.result.createObjectStore(LINK_STORE);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (err) {
          resolve(null);
        }
      });
    }
    return linkDB;
  }

  /** One request in its own transaction: its result, or null when IndexedDB is unavailable or fails. */
  async function linkDo(mode, fn) {
    const db = await linkStore();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(LINK_STORE, mode);
        const req = fn(tx.objectStore(LINK_STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
  }

  /**
   * Every page opened from disk shares the file:// origin's storage in Chromium: a stored handle would be any local
   * page's to read (and, while this tab holds the grant, to write). There the link lasts only as long as the tab.
   */
  function linkPersistable() { return fsaAvailable() && location.protocol !== 'file:'; }

  function persistLink(prev) {
    if (!linkPersistable() || !state.storageOK || !tab.id) return;
    const f = state.file;
    if (!f) {
      if (prev && prev.persistedAs) linkDo('readwrite', (s) => s.delete(prev.persistedAs));
      return;
    }
    f.persistedAs = tab.id;
    const rec = {
      handle: f.handle, name: f.name, stamp: f.stamp, sig: f.sig, bom: f.bom, eol: f.eol,
      encoding: f.encoding, guessed: f.guessed, syncAt: f.syncAt, syncKind: f.syncKind,
    };
    linkDo('readwrite', (s) => s.put(rec, tab.id));
  }

  /** The document now saves to a different file, or to none. */
  function linkChanged(prev) {
    closeDiskToast();
    closeAccessToast();
    persistLink(prev);
    renderToolbar();
  }

  /**
   * After restoring an autosave record that was linked: link its file again. Reading needs the user's OK again.
   * fileSig is the disk version the record was in step with. When the link has moved on since (a save the record
   * missed: quota full, or the tab closed first), the restored text is older than the file: the disk version
   * then counts as someone else's, so it loads (clean) or is offered (dirty) instead of being overwritten.
   */
  async function relink(id, seq, fileSig) {
    const rec = await linkDo('readonly', (s) => s.get(id));
    if (!rec || !rec.handle || typeof rec.handle.getFile !== 'function' || state.docSeq !== seq || state.file) return;
    const inStep = !!rec.sig && rec.sig === fileSig;
    const f = newLink(rec.handle, {
      name: rec.name || rec.handle.name, stamp: inStep ? rec.stamp || null : null, sig: inStep ? rec.sig : '',
      bom: !!rec.bom, eol: rec.eol === '\r\n' ? '\r\n' : '\n', encoding: rec.encoding || 'utf-8', guessed: !!rec.guessed,
      syncAt: +rec.syncAt || 0, syncKind: rec.syncKind || 'opened', readable: false,
    });
    state.file = f;
    linkChanged(null);
    scheduleSave();
    renderStatus();
    if ((await permission(f.handle, 'read', false)) === 'granted') {
      accessGranted(f);
      checkDisk();
      return;
    }
    const msg = HE.t('「{name}」仍連結著磁碟上的檔案。要讀取或存回它，瀏覽器需要你再允許一次。', { name: f.name });
    // With unsaved edits, changes made on disk go unnoticed until then: keep asking (the status says so too).
    if (state.dirty) {
      closeAccessToast();
      accessToast = toast(msg, { sticky: true, action: { label: HE.t('允許存取'), fn: () => { accessToast = null; grantAccess(f); } } });
    } else {
      toast(msg, { timeout: 10000, action: { label: HE.t('允許存取'), fn: () => grantAccess(f) } });
    }
  }

  async function grantAccess(f) {
    if (state.file !== f) return;
    if ((await permission(f.handle, 'readwrite', true)) === 'granted') {
      accessGranted(f);
      checkDisk();
    } else {
      toast(HE.t('沒有取得「{name}」的存取權限，按 {key} 存回時會再問一次', { name: f.name, key: HE.ui.kbd('mod+s') }));
    }
  }

  /** Links whose autosave record is gone (or no longer linked) and that no open tab uses. */
  async function pruneLinks() {
    if (!linkPersistable() || !state.storageOK) return;
    const ids = await linkDo('readonly', (s) => s.getAllKeys());
    for (const id of ids || []) {
      if (id === tab.id || heldElsewhere(id)) continue;
      const rec = docStore.get(AUTOSAVE_PREFIX + id);
      if (!rec || !rec.file) linkDo('readwrite', (s) => s.delete(id));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Autosave and status                                                 */
  /* ------------------------------------------------------------------ */

  function storageAvailable() {
    if (!docStore.putRaw('tactile:probe', '1')) return false;
    docStore.remove('tactile:probe');
    return true;
  }

  function newTabId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function setTab(id) {
    tab.id = id;
    try { sessionStorage.setItem(TAB_KEY, id); } catch (err) { /* no session storage: every load is a new tab */ }
  }

  function autosaveKey() { return AUTOSAVE_PREFIX + tab.id; }

  /** The keys of localStorage: the marks of open tabs, and from disk the records earlier versions stored there. */
  function storageKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k != null) keys.push(k);
      }
    } catch (err) { /* storage unavailable */ }
    return keys;
  }

  /** Another open tab (or the tab this one was duplicated from) is using record `id`. */
  function heldElsewhere(id) {
    const lease = HE.util.storage.get(OPEN_PREFIX + id, null);
    return !!lease && lease.inst !== INSTANCE && +lease.t > Date.now() - OPEN_STALE_MS;
  }

  /**
   * Renew this tab's claim on its record. A tab frozen in the background can lose it to a new tab
   * that continued the record; it then moves to a new key. Returns false when the claim had lapsed.
   */
  function claimTab() {
    if (!tab.id) setTab(newTabId());
    const lease = HE.util.storage.get(OPEN_PREFIX + tab.id, null);
    const mine = !!lease && lease.inst === INSTANCE;
    if (!mine && heldElsewhere(tab.id)) setTab(newTabId());
    HE.util.storage.set(OPEN_PREFIX + tab.id, { inst: INSTANCE, t: Date.now() });
    return mine;
  }

  function releaseTab() {
    if (!state.storageOK || !tab.id) return;
    const lease = HE.util.storage.get(OPEN_PREFIX + tab.id, null);
    if (lease && lease.inst === INSTANCE) HE.util.storage.remove(OPEN_PREFIX + tab.id);
  }

  function heartbeat() {
    // While the claim had lapsed, another tab may have taken over or pruned the record: write it again.
    if (state.storageOK && tab.id && !claimTab() && HE.doc.model) saveNow();
  }

  /** Backups no open tab uses: keep recent ones and the newest few older ones, so they do not use up the storage quota. */
  function pruneAutosaves() {
    if (!state.storageOK) return;
    const now = Date.now();
    const spare = [];
    if (PER_TAB) {
      // What else this tab's storage holds is the copy a duplicated tab inherited: it was stored again under this tab's key.
      for (const key of docStore.keys()) if (key.startsWith(AUTOSAVE_PREFIX) && key !== autosaveKey()) docStore.remove(key);
    }
    // From disk the loop below finds only what earlier versions left in the shared storage, and ages it out.
    for (const key of storageKeys()) {
      if (key.startsWith(OPEN_PREFIX)) {
        const lease = HE.util.storage.get(key, null);
        if (!lease || !(+lease.t > now - OPEN_STALE_MS)) HE.util.storage.remove(key);
        continue;
      }
      const legacy = key === LEGACY_AUTOSAVE_KEY;
      if (!legacy && !key.startsWith(AUTOSAVE_PREFIX)) continue;
      const id = legacy ? null : key.slice(AUTOSAVE_PREFIX.length);
      if (id && ((id === tab.id && !PER_TAB) || heldElsewhere(id))) continue;
      const rec = HE.util.storage.get(key, null);
      const time = rec && typeof rec === 'object' ? +rec.time || 0 : 0;
      if (time <= now - AUTOSAVE_MAX_AGE) HE.util.storage.remove(key);
      else if (time < now - AUTOSAVE_RECENT) spare.push({ key, time });
    }
    spare.sort((a, b) => b.time - a.time).slice(AUTOSAVE_SPARE).forEach((s) => HE.util.storage.remove(s.key));
  }

  /**
   * Store the autosave record. When the quota is full, drop backups no open tab uses: untouched
   * templates first, then exported work, then older work. Recent unexported work is never dropped (it
   * may belong to a tab the browser discarded in the background). If the record still does not fit,
   * put them back, since dropping them gained nothing.
   */
  function storeRecord(key, rec) {
    const put = (k, v) => docStore.putRaw(k, v);
    const raw = JSON.stringify(rec);
    if (put(key, raw)) return true;
    const spare = [];
    const recent = Date.now() - AUTOSAVE_RECENT;
    for (const k of docStore.keys()) {
      const legacy = k === LEGACY_AUTOSAVE_KEY;
      if (k === key || (!legacy && !k.startsWith(AUTOSAVE_PREFIX))) continue;
      if (!legacy && heldElsewhere(k.slice(AUTOSAVE_PREFIX.length))) continue;
      let v = null;
      let time = 0;
      let rank = 0; // 0 unreadable, 1 untouched template, 2 exported, 3 unexported
      try {
        v = docStore.getRaw(k);
        const r = JSON.parse(v);
        if (r && typeof r === 'object') {
          time = +r.time || 0;
          rank = r.html ? (r.dirty ? 3 : 2) : 1;
        }
      } catch (err) { /* unreadable: dropped first */ }
      if (v == null || (rank === 3 && time > recent)) continue;
      spare.push({ key: k, v, time, rank });
    }
    spare.sort((a, b) => a.rank - b.rank || a.time - b.time);
    for (const s of spare) {
      docStore.remove(s.key);
      if (put(key, raw)) return true;
    }
    spare.forEach((s) => put(s.key, s.v));
    return false;
  }

  function scheduleSave() {
    if (!saveDebounced) return;
    state.savePending = true;
    saveDebounced();
  }

  function flushSave() {
    if (!state.savePending || !saveDebounced) return;
    saveDebounced.cancel();
    saveNow();
  }

  function saveNow() {
    state.savePending = false;
    if (!HE.doc.model) return;
    const html = HE.doc.serialize();
    if (state.dirty && state.baseline != null && html === state.baseline) state.dirty = false;
    if (state.storageOK) {
      claimTab();
      const key = autosaveKey();
      const rec = { v: 1, name: HE.doc.name, time: Date.now(), dirty: state.dirty, exportedAt: state.exportedAt || 0, trusted: !!HE.doc.trusted };
      // A template saved to a file is stored as text: the link is restored only with an html record.
      if (state.template && !state.edited && !state.file) rec.template = state.template;
      else rec.html = html;
      if (state.file && linkPersistable()) {
        rec.file = true; // the link itself is in IndexedDB under the same tab id
        rec.fileSig = state.file.sig; // the disk version this text is in step with (see relink)
      }
      if (storeRecord(key, rec)) {
        state.savedAt = rec.time;
        state.savedSeq = state.docSeq;
        state.saveFailed = false;
        state.quotaWarned = false;
        // This tab moved to a new key (duplicated, or its claim lapsed): the link moves with the record.
        if (state.file && state.file.persistedAs !== tab.id) persistLink();
      } else {
        state.saveFailed = true;
        // The stored record belongs to a document the user already replaced; restoring it later would mislead.
        if (state.savedSeq !== state.docSeq) docStore.remove(key);
        if (!state.quotaWarned) {
          state.quotaWarned = true;
          toast(fsaAvailable() ? HE.t('文件太大，瀏覽器無法自動保存，請記得儲存') : HE.t('文件太大，瀏覽器無法自動保存，請記得匯出'), { timeout: 9000 });
        }
      }
    }
    renderStatus();
  }

  function validRecord(rec) {
    if (!rec || typeof rec !== 'object') return null;
    if (typeof rec.html === 'string' && rec.html.trim()) return rec;
    if (typeof rec.template === 'string' && templateHTML(rec.template)) return rec;
    return null;
  }

  /**
   * {key, rec} to restore: this tab's own record (reload, restored or duplicated tab), or for a new
   * tab the newest record no open tab is using. Also settles which key this tab writes.
   * From disk a new tab has no record of its own. What it can still find is a record an earlier version left in
   * the shared storage: `shared` marks it, because any local page could have written it.
   */
  function readAutosave() {
    if (!state.storageOK) return null;
    let found = null;
    if (tab.prev) {
      const rec = validRecord(docStore.get(AUTOSAVE_PREFIX + tab.prev));
      if (rec) found = { key: AUTOSAVE_PREFIX + tab.prev, rec };
      else if (PER_TAB) {
        const old = validRecord(HE.util.storage.get(AUTOSAVE_PREFIX + tab.prev, null));
        if (old) found = { key: AUTOSAVE_PREFIX + tab.prev, rec: old, shared: true };
      }
      // A duplicated tab inherits the id while the original is still open: it keeps its copy under a new key.
      setTab(heldElsewhere(tab.prev) ? newTabId() : tab.prev);
    } else {
      let id = null;
      // Edited work comes before a newer untouched template (a tab that was opened and closed again).
      const better = (a, b) => (a.html ? 1 : 0) - (b.html ? 1 : 0) || (+a.time || 0) - (+b.time || 0);
      for (const key of storageKeys()) {
        const legacy = key === LEGACY_AUTOSAVE_KEY;
        if (!legacy && !key.startsWith(AUTOSAVE_PREFIX)) continue;
        const kid = legacy ? null : key.slice(AUTOSAVE_PREFIX.length);
        if (kid && heldElsewhere(kid)) continue;
        const rec = validRecord(HE.util.storage.get(key, null));
        if (rec && (!found || better(rec, found.rec) > 0)) { found = { key, rec, shared: PER_TAB }; id = kid; }
      }
      setTab(id || newTabId());
    }
    claimTab();
    return found;
  }

  function onDocChanged(e) {
    if (e && e.label === 'load') {
      state.docSeq++;
      state.dirty = false;
      state.edited = false;
      state.template = null;
      state.exportedAt = 0;
      state.savedAt = 0;
      state.saveFailed = false;
      state.baseline = HE.doc.serialize();
      // Only a load that passed a file in (openText) stays linked; templates, pastes and restores do not.
      const prev = state.file;
      state.file = state.nextFile;
      state.nextFile = null;
      if (state.file !== prev) linkChanged(prev);
    } else {
      state.dirty = true;
      state.edited = true;
      state.changes++;
    }
    scheduleSave();
    renderStatus();
  }

  function renderStatus() {
    const el = els.status;
    if (!el) return;
    el.replaceChildren();
    const add = (cls, text) => {
      const s = HE.ui.h('span', cls);
      s.textContent = text;
      el.append(s);
    };
    const kbd = HE.ui.kbd;
    const f = state.file;
    const fsa = fsaAvailable();
    let title = '';
    if (state.dirty) {
      el.append(HE.ui.h('span', 'fio-dot'));
      add('fio-status-main', fsa ? HE.t('有未儲存的修改') : HE.t('有未匯出的修改'));
      if (f && f.missing) add('fio-status-sub fio-status-bad', HE.t('找不到原檔'));
      else if (f && f.seen) add('fio-status-sub fio-status-bad', HE.t('磁碟上有新版本'));
      else if (f && !f.readable) add('fio-status-sub fio-status-bad', HE.t('需要再次允許存取'));
      else if (state.saveFailed) add('fio-status-sub fio-status-bad', HE.t('無法自動保存'));
      else if (state.savedAt) add('fio-status-sub hide-narrow', HE.t('已自動保存 {time}', { time: fmtTime(state.savedAt) }));
      title = f ? HE.t('按 {key} 存回「{name}」', { key: kbd('mod+s'), name: f.name })
        : fsa ? HE.t('按 {key} 儲存成 HTML 檔', { key: kbd('mod+s') }) : HE.t('按 {key} 匯出 HTML', { key: kbd('mod+s') });
      // Each of these is a sentence of its own that follows the one before: it starts with the full stop between them.
      if (f && !f.readable) title += HE.t('。允許存取之前，這裡看不到磁碟上的變更');
      if (!state.storageOK) title += fsa ? HE.t('。這個環境無法自動保存，請記得儲存。') : HE.t('。這個環境無法自動保存，請記得匯出。');
    } else if (f) {
      el.append(HE.ui.h('span', f.missing || !f.readable ? 'fio-dot' : 'fio-dot ok'));
      const when = f.syncAt ? { time: fmtTime(f.syncAt) } : null;
      const main = f.missing ? HE.t('找不到原檔') : !f.readable ? HE.t('需要再次允許存取')
        : f.syncKind === 'saved' ? (when ? HE.t('已存回 {time}', when) : HE.t('已存回'))
          : f.syncKind === 'loaded' ? (when ? HE.t('已載入磁碟版本 {time}', when) : HE.t('已載入磁碟版本')) : HE.t('已連結原檔');
      add(f.missing || !f.readable ? 'fio-status-main fio-status-bad' : 'fio-status-main', main);
      if (!f.missing && f.readable && f.pending) add('fio-status-sub hide-narrow', HE.t('磁碟上有新版本，等你操作完就載入'));
      const link = { name: f.name, key: kbd('mod+s') };
      title = f.missing ? HE.t('找不到磁碟上的「{name}」，請確認檔案是否仍存在。', link)
        : f.readable ? HE.t('連結到磁碟上的「{name}」：按 {key} 存回；檔案在別處被修改時，這裡會跟著更新', link)
          : HE.t('連結到磁碟上的「{name}」：按 {key} 存回。允許存取之前，這裡看不到磁碟上的變更', link);
    } else if (state.exportedAt) {
      el.append(HE.ui.h('span', 'fio-dot ok'));
      add('fio-status-main', HE.t('已匯出 {time}', { time: fmtTime(state.exportedAt) }));
    } else if (state.savedAt) {
      add('fio-status-main', HE.t('已自動保存 {time}', { time: fmtTime(state.savedAt) }));
    }
    el.title = title;
  }

  function boot() {
    const found = readAutosave();
    if (!(found && restoreAutosave(found))) {
      if (!loadTemplate(sampleKey())) loadDoc(BUILTIN.sample, SAMPLE_NAME, true);
    }
    pruneAutosaves();
    pruneLinks();
    if (state.storageOK) setInterval(heartbeat, OPEN_BEAT_MS);
  }

  function restoreAutosave(found) {
    const rec = found.rec;
    const name = typeof rec.name === 'string' ? rec.name : '';
    if (rec.html) {
      // A record without the flag (older versions, files never allowed) restores with scripts off. The flag
      // only lets the scripts run again in the isolated run frame: compat mode is never stored (a page script
      // in compat mode can write this record) and every load ends it.
      // From the shared storage of file:// the flag proves nothing: another local page could have set it.
      if (!loadDoc(rec.html, name || 'untitled.html', rec.trusted === true && !found.shared)) return false;
      restoreState(rec);
      toast(HE.t('已還原上次的文件「{name}」', { name: HE.doc.name }), { action: { label: HE.t('改看範例'), fn: () => newDoc(sampleKey()) } });
      if (rec.file === true && linkPersistable() && found.key.startsWith(AUTOSAVE_PREFIX)) {
        relink(found.key.slice(AUTOSAVE_PREFIX.length), state.docSeq, rec.fileSig);
      }
    } else {
      if (!loadTemplate(rec.template, name)) return false;
      restoreState(rec);
    }
    if (found.shared || found.key !== autosaveKey()) {
      // The shared record of earlier versions, or a duplicated tab's copy: store it under this tab's key.
      if (found.shared || found.key === LEGACY_AUTOSAVE_KEY) HE.util.storage.remove(found.key);
      saveNow();
    }
    return true;
  }

  /** After loading an autosave record: it is already stored, and it carries the dirty/export state. */
  function restoreState(rec) {
    if (saveDebounced) saveDebounced.cancel();
    state.savePending = false;
    state.dirty = !!rec.dirty;
    if (state.dirty) state.baseline = null; // what was exported is unknown
    state.exportedAt = +rec.exportedAt || 0;
    state.savedAt = +rec.time || Date.now();
    state.savedSeq = state.docSeq;
    renderStatus();
  }

  /* ------------------------------------------------------------------ */
  /* Drag and drop                                                       */
  /* ------------------------------------------------------------------ */

  function hasFiles(e) {
    const types = e.dataTransfer && e.dataTransfer.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) if (types[i] === 'Files') return true;
    return false;
  }

  function dragKind(dt) {
    const items = dt && dt.items;
    if (!items || !items.length) return 'html';
    let images = 0;
    let others = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind !== 'file') continue;
      if (/^image\//i.test(items[i].type || '')) images++;
      else others++;
    }
    return images && !others ? 'image' : 'html';
  }

  function showOverlay(kind) {
    let o = els.overlay;
    if (!o) {
      o = els.overlay = HE.ui.h('div', 'fio-drop');
      o.id = 'fio-drop';
      o.setAttribute('aria-hidden', 'true');
      o.append(HE.ui.h('div', 'fio-drop-msg'));
      document.body.append(o);
    }
    if (o.dataset.kind !== kind) {
      o.dataset.kind = kind;
      o.firstChild.innerHTML = HE.ui.icon(kind === 'image' ? 'image' : 'upload', 22) +
        '<span>' + HE.util.esc(kind === 'image' ? HE.t('放開以插入圖片') : HE.t('放開以開啟 HTML 檔')) + '</span>';
    }
    o.hidden = false;
    // dragover repeats while a drag hovers; when it stops arriving the drag has left or ended.
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(hideOverlay, 900);
  }

  function hideOverlay() {
    clearTimeout(overlayTimer);
    if (els.overlay) els.overlay.hidden = true;
  }

  function onDragStart() { state.internalDrag = true; }
  function onDragEnd() { state.internalDrag = false; hideOverlay(); }
  // dragend can be lost when its source node is removed mid-drag; any later pointer move means no drag is running.
  function onPointerMove(e) {
    if (state.internalDrag) state.internalDrag = false;
    if (state.pointerDown && !e.buttons) state.pointerDown = false; // released outside the window
  }
  // A drag or resize under way: a reload from disk waits until it ends.
  function onPointerDown() { state.pointerDown = true; }
  function onPointerUp() { state.pointerDown = false; }

  function onDragOver(e) {
    if (state.internalDrag || !hasFiles(e)) return;
    if (e.defaultPrevented) { hideOverlay(); return; } // another drop zone takes it
    // Always claim file drags: an unhandled drop makes the browser navigate away to the file.
    e.preventDefault();
    if (modalOpen()) {
      try { e.dataTransfer.dropEffect = 'none'; } catch (err) { /* read-only in some browsers */ }
      hideOverlay();
      return;
    }
    try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { /* read-only in some browsers */ }
    showOverlay(dragKind(e.dataTransfer));
  }

  function onWindowDragLeave(e) {
    if (!hasFiles(e) || e.relatedTarget) return;
    // relatedTarget is also null when moving into the canvas iframe; only hide when leaving the window.
    const x = e.clientX;
    const y = e.clientY;
    if (x <= 0 || y <= 0 || x >= window.innerWidth || y >= window.innerHeight) hideOverlay();
  }

  function onDrop(e) {
    hideOverlay();
    const internal = state.internalDrag;
    state.internalDrag = false;
    if (internal || !hasFiles(e) || e.defaultPrevented) return;
    e.preventDefault();
    if (modalOpen()) return;
    const files = Array.from(e.dataTransfer.files || []);
    // A dropped folder holds the files the open page refers to (a page dropped along with it opens instead).
    const dirs = files.some(isHtmlFile) ? null : dropEntries(e.dataTransfer);
    if (dirs) { bundleAssets({ entries: dirs }); return; }
    handleDroppedFiles(files, dropHandles(e.dataTransfer, files.length));
  }

  /**
   * getAsFileSystemHandle works only while the drop event runs: ask for every file now, in file order. A drop on
   * the canvas carries the edit frame's DataTransfer, so its handle belongs to that frame and stops working when
   * the frame is replaced (the very next render): clone it into this window first.
   */
  function dropHandles(dt, count) {
    if (!fsaAvailable() || !dt || !dt.items) return [];
    const out = [];
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (it.kind !== 'file') continue;
      let p = null;
      try { p = typeof it.getAsFileSystemHandle === 'function' ? it.getAsFileSystemHandle() : null; } catch (err) { p = null; }
      out.push(Promise.resolve(p).then((h) => (h ? structuredClone(h) : null)).catch(() => null));
    }
    return out.length === count ? out : [];
  }

  function wireDropTarget(target) {
    // addEventListener ignores exact duplicates, so re-wiring the same live document is harmless.
    target.addEventListener('dragstart', onDragStart, true);
    target.addEventListener('dragend', onDragEnd, true);
    target.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
    target.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    target.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    target.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });
    target.addEventListener('dragenter', onDragOver);
    target.addEventListener('dragover', onDragOver);
    target.addEventListener('drop', onDrop);
  }

  /** Each workbook becomes a source of this tab. What went wrong with one is said for that one. */
  async function readBooks(files) {
    for (const f of files) {
      try {
        const got = await HE.sources.add(f);
        toast(HE.t('已讀取「{name}」：{sheets} 張工作表、{cells} 個儲存格。現在可以請 AI 用這些數字寫報告；數字由編輯器從儲存格填入，點選就能看到來源。', { name: got.source.file, sheets: got.source.sheets.length, cells: got.facts.length }), { timeout: 10000 });
      } catch (err) {
        const known = err instanceof HE.sources.SourceError;
        if (!known) console.error(err);
        toast(known ? err.message : HE.t('無法讀取「{name}」', { name: f.name || '' }), { type: 'error', timeout: 12000 });
      }
    }
  }

  function handleDroppedFiles(files, handles = []) {
    if (!files.length) return;
    const pages = files.filter(isHtmlFile);
    if (pages.length) {
      if (files.length > 1) HE.ui.status(HE.t('一次只能開啟一個檔案，其他的已略過'));
      openFile(pages[0], { handlePromise: handles[files.indexOf(pages[0])] });
      return;
    }
    const images = files.filter((f) => /^image\//i.test(f.type || ''));
    if (images.length) { insertImages(images); return; }
    // A workbook is read here, as a source of numbers (HE.sources): it does not replace the document.
    const books = files.filter((f) => /\.xlsx$/i.test(f.name || ''));
    if (books.length && HE.sources) { readBooks(books); return; }
    // A rules file the user wrote takes the place of the document's reconciliation rules (HE.prov asks first).
    const rules = files.filter((f) => /\.ya?ml$/i.test(f.name || ''));
    if (rules.length && HE.prov && HE.prov.loadRulesFile) {
      if (files.length > 1) HE.ui.status(HE.t('一次只能載入一個規則檔，其他的已略過'));
      HE.prov.loadRulesFile(rules[0]);
      return;
    }
    // Other sources of numbers are files people expect to hand over: say what does read them, instead of only refusing.
    const name = files[0].name || '';
    if (/\.(xlsm|xls|csv|tsv|ods)$/i.test(name)) {
      toast(HE.t('編輯器只讀取 .xlsx。請先用 Excel 把「{name}」另存成 .xlsx，再拖進來。', { name }), { type: 'error', timeout: 12000 });
      return;
    }
    if (/\.(docx|doc|pdf)$/i.test(name)) {
      toast(HE.t('編輯器還不能直接讀取「{name}」。要把 Word 或 PDF 裡的數字放進報告，目前的做法是用 tactile-ingest（命令列工具，需要 Node.js）產生報告，再用編輯器開啟。', { name }), { type: 'error', timeout: 15000 });
      return;
    }
    toast(HE.t('無法開啟「{name}」：只能拖放 HTML 檔或圖片', { name }), { type: 'error' });
  }

  const CELL_LIKE = new Set(['td', 'th', 'li', 'dt', 'dd']);
  const TABLE_PARTS = new Set(['tr', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'col']);

  /** Where dropped images go: after the primary selection, kept valid for tables, lists and selects. */
  function imageTarget() {
    const id = HE.sel.primary;
    const el = id ? HE.doc.byId(id) : null;
    if (!el || HE.doc.isRoot(el) || el.closest('head')) return { refId: null, position: 'append' };
    const tag = HE.util.tag(el);
    if (CELL_LIKE.has(tag)) return { refId: id, position: 'append' };
    let ref = el;
    if (TABLE_PARTS.has(tag)) ref = el.closest('table') || el;
    else if (tag === 'option' || tag === 'optgroup') ref = el.closest('select') || el;
    const refId = HE.doc.idOf(ref);
    if (!refId || HE.doc.isRoot(ref)) return { refId: null, position: 'append' };
    return { refId, position: 'after' };
  }

  async function insertImages(files) {
    const list = Array.from(files || []).filter((f) => f && /^image\//i.test(f.type || ''));
    if (!list.length || !HE.doc.model) return [];
    let urls;
    try {
      urls = await Promise.all(list.map(readDataURL));
    } catch (err) {
      console.error('[HE] fileio: reading image failed', err);
      toast(HE.t('無法讀取圖片'), { type: 'error' });
      return [];
    }
    if (aiBusy()) { warnAiBusy(HE.t('AI 助理正在修改文件，請等它完成後再插入圖片')); return []; }
    commitEdits();
    const target = imageTarget();
    const html = urls.map((u) => '<img src="' + HE.util.esc(u) + '" alt="" style="max-width:100%;height:auto">').join('');
    const n = list.length;
    const ids = HE.ops.insertHTML(target.refId, target.position, html, { label: n > 1 ? HE.t('插入 {n} 張圖片', { n }) : HE.t('插入圖片') }) || [];
    if (ids.length) {
      HE.sel.set(ids);
      const c = HE.canvas;
      if (c && typeof c.scrollIntoView === 'function') c.scrollIntoView(ids[0]);
      if (c && typeof c.flash === 'function') c.flash(ids);
    }
    const size = urls.reduce((n, u) => n + u.length, 0);
    // The note on the size is a remark in brackets of its own, after the sentence.
    const note = size > 1.5e6 ? HE.t('（圖片內嵌在 HTML 裡，檔案增加約 {size}）', { size: HE.util.bytes(size) }) : '';
    toast(n > 1 ? HE.t('已插入 {n} 張圖片{note}', { n, note }) : HE.t('已插入圖片{note}', { note }), { type: 'success' });
    return ids;
  }

  /* ------------------------------------------------------------------ */
  /* Toolbar                                                             */
  /* ------------------------------------------------------------------ */

  function makeButton(id, cls, icon, label, title) {
    const b = HE.ui.h('button', cls);
    b.type = 'button';
    b.id = id;
    setButton(b, icon, label, title);
    return b;
  }

  function setButton(b, icon, label, title) {
    b.innerHTML = HE.ui.icon(icon) + '<span class="hide-narrow">' + HE.util.esc(label) + '</span>';
    b.title = title || label;
    b.setAttribute('aria-label', label);
  }

  /** Where the File System Access API works, the main button saves (back to the linked file, or to a new one). */
  function renderToolbar() {
    if (!els.exportBtn || !fsaAvailable()) return;
    const f = state.file;
    const key = HE.ui.kbd('mod+s');
    setButton(els.exportBtn, 'save', HE.t('儲存'),
      f ? HE.t('存回「{name}」（{key}）', { name: f.name, key }) : HE.t('儲存成 HTML 檔（{key}）', { key }));
  }

  /** A button that opens a dropdown menu below `anchor`; a second click closes it. */
  function wireMenuButton(btn, anchor, itemsFn) {
    btn.setAttribute('aria-haspopup', 'menu');
    let wasOpen = false;
    // pointerdown runs before core's mousedown handler closes open menus.
    btn.addEventListener('pointerdown', () => {
      wasOpen = !!(openMenu && openMenu.owner === btn && openMenu.el && openMenu.el.isConnected);
    });
    btn.addEventListener('click', () => {
      if (wasOpen) { wasOpen = false; openMenu = null; return; }
      const r = anchor.getBoundingClientRect();
      const m = HE.ui.menu(itemsFn(), { x: r.left, y: r.bottom + 4 });
      openMenu = { owner: btn, el: m && m.el };
    });
  }

  function newMenuItems() {
    const list = samplesList();
    const blank = list.find((t) => t.key === blankKey());
    const items = [{ label: (blank && blank.name) || HE.t('空白頁'), icon: 'file', onClick: () => newDoc(blankKey()) }];
    const rest = list.filter((t) => !BLANK_KEYS.includes(t.key));
    const entry = (t) => ({ label: t.name || t.key, icon: TEMPLATE_ICONS[t.key] || 'file', onClick: () => newDoc(t.key) });
    // The templates written in the interface's language come first; the others are one step away.
    const mine = rest.filter((t) => langRank(t) >= 0).sort((a, b) => langRank(a) - langRank(b));
    const others = rest.filter((t) => langRank(t) < 0);
    if (rest.length) {
      items.push({ separator: true }, { heading: HE.t('範本') });
      for (const t of mine) items.push(entry(t));
      if (others.length) items.push({ label: HE.t('其他語言的範本'), icon: 'folder', children: others.map(entry) });
    } else {
      items.push({ label: HE.t('範例文件'), icon: 'sparkles', onClick: () => newDoc('sample') });
    }
    return items;
  }

  function exportMenuItems() {
    const items = [];
    if (fsaAvailable()) {
      const f = state.file;
      items.push(
        { label: f ? HE.t('存回「{name}」', { name: shortName(f.name) }) : HE.t('儲存…'), icon: 'save', shortcut: 'mod+s', onClick: () => save() },
        { label: HE.t('另存新檔…'), icon: 'file-plus', shortcut: 'mod+shift+s', onClick: () => saveAs() },
        { separator: true },
        { label: HE.t('下載 HTML'), icon: 'download', onClick: () => exportHTML() },
      );
    } else {
      items.push({ label: HE.t('下載 HTML'), icon: 'download', shortcut: 'mod+s', onClick: () => exportHTML() });
    }
    items.push({ label: HE.t('複製 HTML 原始碼'), icon: 'copy', onClick: () => copyHTML() });
    items.push({ separator: true });
    items.push({ label: HE.t('把圖片與樣式嵌入文件…'), icon: 'folder', onClick: () => bundleAssets() });
    if (HE.tidy) {
      items.push({ label: HE.t('壓縮內嵌圖片…'), icon: 'image', onClick: () => HE.tidy.compressDialog() });
      items.push({ label: HE.t('清理後匯出…'), icon: 'wand', onClick: () => HE.tidy.cleanDialog() });
      items.push({ separator: true });
    }
    // The Artifact's frame may not open the print dialog; its downloads capability takes a PNG.
    if (!HE.env.inArtifact) items.push({ label: HE.t('匯出 PDF…'), icon: 'file', onClick: () => exportPDF() });
    items.push({ label: HE.t('匯出 PNG 圖片'), icon: 'image', onClick: () => exportPNG() });
    if (!HE.env.inArtifact) items.push({ separator: true }, { label: HE.t('在新分頁預覽'), icon: 'eye', onClick: previewInTab });
    return items;
  }

  function buildToolbar() {
    const bar = document.getElementById('toolbar-file');
    if (!bar) return;
    bar.classList.add('fio-bar');
    const kbd = HE.ui.kbd;
    els.newBtn = makeButton('btn-new', 'btn ghost fio-btn', 'file-plus', HE.t('新增'), HE.t('新增文件'));
    els.openBtn = makeButton('btn-open', 'btn ghost fio-btn', 'folder', HE.t('開啟'), HE.t('開啟 HTML 檔（{key}）', { key: kbd('mod+o') }));
    els.pasteBtn = makeButton('btn-paste-html', 'btn ghost fio-btn', 'paste', HE.t('貼上 HTML'), HE.t('貼上 HTML 原始碼'));

    const fsa = fsaAvailable();
    const split = HE.ui.h('div', 'fio-split');
    split.setAttribute('role', 'group');
    split.setAttribute('aria-label', fsa ? HE.t('儲存') : HE.t('匯出'));
    els.exportBtn = makeButton('btn-export', 'btn primary sm fio-export', 'download', HE.t('匯出'), HE.t('匯出 HTML（{key}）', { key: kbd('mod+s') }));
    const more = HE.ui.h('button', 'btn primary sm icon fio-export-more', HE.ui.icon('chevron-down', 14));
    more.type = 'button';
    more.id = 'btn-export-menu';
    more.title = fsa ? HE.t('更多儲存方式') : HE.t('更多匯出方式');
    more.setAttribute('aria-label', more.title);
    els.exportMore = more;
    split.append(els.exportBtn, more);
    renderToolbar();

    bar.append(els.newBtn, els.openBtn, els.pasteBtn, split);

    wireMenuButton(els.newBtn, els.newBtn, newMenuItems);
    els.openBtn.addEventListener('click', () => open());
    els.pasteBtn.addEventListener('click', () => pasteDialog());
    els.exportBtn.addEventListener('click', () => save());
    wireMenuButton(more, split, exportMenuItems);
  }

  function buildFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'fio-file-input';
    input.accept = '.html,.htm,text/html';
    input.hidden = true;
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (file) openFile(file);
    });
    document.body.append(input);
    els.input = input;
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    state.storageOK = storageAvailable();
    try { tab.prev = sessionStorage.getItem(TAB_KEY); } catch (err) { tab.prev = null; }
    saveDebounced = HE.util.debounce(saveNow, AUTOSAVE_MS);
    els.status = document.getElementById('status-save');
    if (els.status) els.status.classList.add('fio-status');
    buildToolbar();
    buildFileInput();

    HE.on('doc:changed', onDocChanged);
    HE.on('doc:named', () => scheduleSave());
    HE.on('doc:trusted', () => scheduleSave());
    HE.on('canvas:ready', (e) => {
      const d = (e && e.doc) || HE.live.doc;
      if (d) wireDropTarget(d);
    });
    if (HE.live.doc) wireDropTarget(HE.live.doc);
    HE.on('ai:busy', (e) => {
      const busy = !!(e && e.busy);
      for (const b of [els.newBtn, els.openBtn, els.pasteBtn]) if (b) b.disabled = busy;
    });

    wireDropTarget(window);
    window.addEventListener('dragleave', onWindowDragLeave);

    // Text typed in place reaches the model only on commit; without it the save and the leave warning miss it.
    window.addEventListener('beforeunload', (e) => {
      saveTextEdit();
      flushSave();
      if (HE.env.inArtifact) return;
      refreshDirty();
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });
    window.addEventListener('pagehide', () => {
      saveTextEdit();
      flushSave();
      releaseTab();
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) heartbeat(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') { checkDisk(); return; }
      saveTextEdit();
      flushSave();
    });

    HE.keys.register('mod+s', () => { save(); }, { inInputs: true });
    HE.keys.register('mod+o', () => { open(); }, { inInputs: true });
    if (fsaAvailable()) {
      HE.keys.register('mod+shift+s', () => { saveAs(); }, { inInputs: true });
      // Coming back from the terminal where an agent just changed the file: look right away, then keep looking.
      window.addEventListener('focus', () => checkDisk());
      setInterval(checkDisk, DISK_POLL_MS);
    }

    // use() is memoized and never prompts; resolving it early keeps export inside the user gesture.
    if (HE.env.inArtifact) getDownloads();
    renderStatus();
  }

  HE.fileio = {
    init,
    boot,
    open,
    openText,
    openFile,
    newDoc,
    save,
    saveAs,
    exportHTML,
    exportPDF,
    exportPNG,
    copyHTML,
    downloadText,
    insertImages,
    bundleAssets,
    checkDisk,
    /** Name of the file on disk this document saves back to, or null. */
    get linkedFile() { return state.file ? state.file.name : null; },
    get dirty() { return state.dirty; },
    set dirty(v) { state.dirty = !!v; renderStatus(); },
  };
})();
