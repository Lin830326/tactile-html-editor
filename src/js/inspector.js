/* Tactile — inspector.js
 *
 * The 設計 pane (#inspector-pane) and the selection breadcrumb (#status-breadcrumb).
 *
 * The pane is rebuilt only when the selection changes or a document loads. Any other
 * change (an op, undo/redo, a canvas re-render) only refreshes values, and the control
 * that has focus is never overwritten, so typing is not interrupted. Inputs show the
 * element's own inline value; the live computed value is the muted placeholder.
 * Every write goes through HE.ops, so it is undoable and reaches both DOMs.
 */
(function () {
  'use strict';

  const HE = window.HE;

  /* ------------------------------------------------------------------ */
  /* Vocabulary                                                          */
  /* ------------------------------------------------------------------ */

  const LONG = 2000;
  const CUSTOM = '__custom__';
  const UNITLESS = new Set(['line-height', 'opacity', 'z-index', 'font-weight', 'flex-grow', 'flex-shrink', 'order']);
  const NON_NEGATIVE = new Set(['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'font-size', 'line-height',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-width', 'border-radius', 'gap', 'flex-grow']);
  const NON_VISUAL = new Set(['html', 'head', 'meta', 'link', 'script', 'style', 'title', 'base', 'noscript', 'template']);
  const NO_TEXT = new Set(['img', 'video', 'audio', 'iframe', 'canvas', 'hr', 'br', 'picture', 'object', 'embed', 'source', 'track']);
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const SIDE_ZH = { top: HE.t('上'), right: HE.t('右'), bottom: HE.t('下'), left: HE.t('左') };
  const SIDE_MARGIN = { top: HE.t('外距（上）'), right: HE.t('外距（右）'), bottom: HE.t('外距（下）'), left: HE.t('外距（左）') };
  const SIDE_PADDING = { top: HE.t('內距（上）'), right: HE.t('內距（右）'), bottom: HE.t('內距（下）'), left: HE.t('內距（左）') };
  const PURE_TRANSLATE = /^\s*(translate(?:3d|x|y|z)?\([^)]*\)\s*)+$/i;

  const TAG_NAMES = {
    html: HE.t('文件'), head: HE.t('文件標頭'), body: HE.t('頁面主體'), main: HE.t('主要內容'), header: HE.t('頁首'), footer: HE.t('頁尾'), nav: HE.t('導覽'),
    section: HE.t('區段'), article: HE.t('文章'), aside: HE.t('側欄'), div: HE.t('區塊'), span: HE.t('行內文字'), p: HE.t('段落'),
    h1: HE.t('標題 1'), h2: HE.t('標題 2'), h3: HE.t('標題 3'), h4: HE.t('標題 4'), h5: HE.t('標題 5'), h6: HE.t('標題 6'),
    a: HE.t('連結'), img: HE.t('圖片'), picture: HE.t('圖片'), video: HE.t('影片'), audio: HE.t('音訊'), figure: HE.t('圖文框'), figcaption: HE.t('圖說'),
    blockquote: HE.t('引言'), ul: HE.t('項目清單'), ol: HE.t('編號清單'), li: HE.t('清單項目'), dl: HE.t('定義清單'), table: HE.t('表格'), thead: HE.t('表頭'),
    tbody: HE.t('表身'), tfoot: HE.t('表尾'), tr: HE.t('表格列'), td: HE.t('儲存格'), th: HE.t('標題儲存格'), button: HE.t('按鈕'), form: HE.t('表單'),
    input: HE.t('輸入欄'), textarea: HE.t('多行輸入欄'), select: HE.t('下拉選單'), label: HE.t('標籤'), strong: HE.t('粗體'), b: HE.t('粗體'), em: HE.t('強調'),
    i: HE.t('斜體'), code: HE.t('程式碼'), pre: HE.t('預排文字'), hr: HE.t('分隔線'), svg: HE.t('向量圖'), canvas: HE.t('畫布'), iframe: HE.t('內嵌頁面'),
    style: HE.t('樣式表'), script: HE.t('指令碼'), meta: HE.t('中繼資料'), link: HE.t('外部資源'), title: HE.t('頁面標題'),
  };

  const FONTS = [
    ['system-ui, sans-serif', HE.t('系統字體')],
    ['"Noto Sans TC", sans-serif', HE.t('Noto Sans TC 黑體')],
    ['"Noto Serif TC", serif', HE.t('Noto Serif TC 明體')],
    ['"IBM Plex Sans", sans-serif', 'IBM Plex Sans'],
    ['Georgia, serif', 'Georgia'],
    ['ui-monospace, monospace', HE.t('等寬 ui-monospace')],
  ];
  const WEIGHTS = [['100', HE.t('100 極細')], ['200', HE.t('200 特細')], ['300', HE.t('300 細')], ['400', HE.t('400 標準')], ['500', HE.t('500 中等')],
    ['600', HE.t('600 半粗')], ['700', HE.t('700 粗')], ['800', HE.t('800 特粗')], ['900', HE.t('900 極粗')]];
  const TRANSFORMS = [['none', HE.t('不轉換')], ['uppercase', HE.t('全部大寫')], ['lowercase', HE.t('全部小寫')], ['capitalize', HE.t('字首大寫')]];
  const DISPLAYS = [['block', HE.t('區塊 block')], ['inline', HE.t('行內 inline')], ['inline-block', HE.t('行內區塊 inline-block')],
    ['flex', HE.t('彈性 flex')], ['inline-flex', HE.t('行內彈性 inline-flex')], ['grid', HE.t('格線 grid')], ['none', HE.t('隱藏 none')]];
  const JUSTIFY = [['flex-start', HE.t('靠起點')], ['center', HE.t('置中')], ['flex-end', HE.t('靠終點')], ['space-between', HE.t('兩端對齊')],
    ['space-around', HE.t('平均分布')], ['space-evenly', HE.t('等距分布')]];
  const ALIGN = [['stretch', HE.t('延展填滿')], ['flex-start', HE.t('靠起點')], ['center', HE.t('置中')], ['flex-end', HE.t('靠終點')], ['baseline', HE.t('文字基線')]];
  const GRID_PRESETS = ['1fr 1fr', 'repeat(3, 1fr)', '2fr 1fr'];
  const OBJECT_FIT = [['fill', HE.t('拉伸填滿')], ['contain', HE.t('完整顯示')], ['cover', HE.t('裁切填滿')], ['none', HE.t('原始尺寸')], ['scale-down', HE.t('縮小以容納')]];
  const BORDER_STYLES = [['none', HE.t('無')], ['solid', HE.t('實線')], ['dashed', HE.t('虛線')], ['dotted', HE.t('點線')], ['double', HE.t('雙線')]];
  const SHADOWS = [
    ['none', HE.t('無')],
    ['0 1px 3px rgba(0, 0, 0, 0.12)', HE.t('細微')],
    ['0 4px 14px rgba(0, 0, 0, 0.14)', HE.t('中等')],
    ['0 14px 36px rgba(0, 0, 0, 0.2)', HE.t('浮起', null, 'shadow')],
  ];
  const POSITIONS = [['static', HE.t('靜態 static')], ['relative', HE.t('相對 relative')], ['absolute', HE.t('絕對 absolute')],
    ['fixed', HE.t('固定 fixed')], ['sticky', HE.t('黏附 sticky')]];
  const LANGS = [['zh-Hant', '繁體中文'], ['zh-TW', '繁體中文（台灣）'], ['zh-Hans', '简体中文'], ['en', 'English'], ['ja', '日本語'], ['ko', '한국어']]; // i18n-ok: each language's own name for itself
  const SHORTCUTS = [
    [HE.t('編輯文字'), ['enter']],
    [HE.t('選取父層'), ['escape']],
    [HE.t('刪除'), ['delete']],
    [HE.t('建立副本'), ['mod+d']],
    [HE.t('複製／貼上'), ['mod+c', 'mod+v']],
    [HE.t('上移／下移'), ['alt+up', 'alt+down']],
    [HE.t('移出父層／移入上方元素'), ['alt+shift+left', 'alt+shift+right']],
    [HE.t('復原'), ['mod+z']],
    [HE.t('AI 助理'), ['mod+k']],
    [HE.t('多選'), ['shift'], HE.t('點選')],
    [HE.t('自由移動'), ['alt'], HE.t('拖曳')],
  ];
  // Tags a light pretty-print may put on their own line without changing how the page renders.
  const BLOCK = new Set(['html', 'head', 'body', 'div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'p',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
    'caption', 'colgroup', 'figure', 'figcaption', 'blockquote', 'form', 'fieldset', 'hr', 'meta', 'link', 'title', 'details', 'summary']);
  const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  let pane = null;
  let crumbs = null;
  let ids = [];                 // edit targets of the current build (the body in the document view)
  let builtFor = null;          // selection key the pane was built for (null: never built)
  let builtShape = '';          // what the build depends on beyond the selection (see shape())
  let builtDoc = null;          // model document that pending edits belong to
  let viewKind = '';            // 'doc' | 'element'
  let dirty = false;            // a rebuild waits for the pane to become visible
  let syncs = [];               // value refreshers registered by the current build
  let pass = null;              // lookup cache for one refresh pass
  let commits = new WeakMap();  // text control -> its pending commit, flushed before a rebuild
  let scheduleRefresh = function () {};
  let crumbKey = null;
  let pendingCss = null;
  let cssTimer = 0;
  let imageTarget = null;
  let fileInput = null;
  let syncDemoBtn = null;       // updates the 動態效果 ▶ 預覽 button of the current build (null: none)
  let scratch = null;
  let probe = null;

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function mk(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else e.setAttribute(k, v === true ? '' : String(v));
      }
    }
    return e;
  }
  function group(cls, ...kids) { const g = mk('div', cls); g.append(...kids); return g; }
  function field(text, control, forId) {
    const f = mk('div', 'field');
    f.append(mk('label', null, { for: forId || control.id || null, text }), control);
    return f;
  }
  function mini(text, control, forId) {
    const f = mk('div', 'insp-mini');
    f.append(mk('label', null, { for: forId || control.id || null, text }), control);
    return f;
  }
  /** Small icon button; ghost unless `cls` says otherwise ('' gives a plain bordered button). */
  function iconButton(id, icon, title, cls) {
    const b = mk('button', 'btn icon sm ' + (cls == null ? 'ghost' : cls), { type: 'button', id, title, 'aria-label': title });
    b.innerHTML = HE.ui.icon(icon, 15);
    return b;
  }
  function textButton(id, icon, text, cls) {
    const b = mk('button', 'btn sm ' + (cls || ''), { type: 'button', id });
    b.innerHTML = (icon ? HE.ui.icon(icon, 14) : '') + '<span></span>';
    b.querySelector('span').textContent = text;
    return b;
  }

  function tagOf(el) { return HE.util.tag(el); }
  function primary() { return ids.length ? ids[ids.length - 1] : null; }
  function selKey() { return HE.sel.ids.join(','); }
  function visible() { return !!pane && !pane.hidden; }
  function focused(el) { return document.activeElement === el; }
  function onSync(fn) { syncs.push(fn); }
  function coalesceKey(prop) { return 'insp:' + prop + ':' + ids.join(','); }
  function highlight(id) { if (HE.canvas && typeof HE.canvas.highlight === 'function') HE.canvas.highlight(id); }

  function model(id) {
    if (!id) return null;
    if (pass && pass.m.has(id)) return pass.m.get(id);
    const m = HE.doc.byId(id);
    if (pass) pass.m.set(id, m);
    return m;
  }
  function computed(id) {
    if (!id) return null;
    if (pass && pass.c.has(id)) return pass.c.get(id);
    let cs = null;
    const l = HE.live.byId(id);
    try {
      const view = l && l.ownerDocument && l.ownerDocument.defaultView;
      cs = view ? view.getComputedStyle(l) : null;
    } catch (e) { cs = null; }
    if (pass) pass.c.set(id, cs);
    return cs;
  }
  function inlineOf(id, prop) {
    const m = model(id);
    if (!m || !m.style) return '';
    const v = m.style.getPropertyValue(prop);
    if (!v) return '';
    return m.style.getPropertyPriority(prop) === 'important' ? v + ' !important' : v;
  }
  function computedOf(id, prop) {
    const cs = computed(id);
    return cs ? cs.getPropertyValue(prop).trim() : '';
  }
  function attrOf(id, name) {
    const m = model(id);
    return (m && m.getAttribute(name)) || '';
  }
  /** Computed shorthand of four sides, collapsed like CSS ("8px", "8px 16px", …). */
  function sidesOf(id, propOf) {
    const cs = computed(id);
    if (!cs) return '';
    const v = SIDES.map((s) => tidy(cs.getPropertyValue(propOf(s)).trim()));
    if (v.every((x) => x === v[0])) return v[0];
    if (v[0] === v[2] && v[1] === v[3]) return v[0] + ' ' + v[1];
    return v.join(' ');
  }
  /** Round long decimals in computed values and keep placeholders short. */
  function tidy(v) {
    const s = String(v || '').replace(/-?\d+\.\d{3,}/g, (n) => String(Math.round(parseFloat(n) * 100) / 100));
    return s.length > 120 ? s.slice(0, 119) + '…' : s;
  }
  function stripPx(v) { return /^-?\d*\.?\d+px$/.test(v) ? v.slice(0, -2) : v; }
  function stripPxAll(v) { const s = String(v || ''); return /[(]/.test(s) ? s : s.split(/\s+/).map(stripPx).join(' '); }

  /** A bare number means px, except for unitless properties. Multi-value shorthands are handled per token. */
  function normLength(prop, raw) {
    let v = String(raw == null ? '' : raw).trim();
    if (!v) return '';
    let imp = '';
    if (/!important$/i.test(v)) { imp = ' !important'; v = v.replace(/\s*!important$/i, ''); }
    if (!UNITLESS.has(prop) && !/[(),]/.test(v)) {
      v = v.split(/\s+/).map((t) => (/^-?\d*\.?\d+$/.test(t) && parseFloat(t) !== 0 ? t + 'px' : t)).join(' ');
    }
    return v + imp;
  }
  /** ArrowUp/ArrowDown step: 1, Shift 10, Alt 0.1, keeping the unit. Returns null when the value is not a single number. */
  function stepValue(text, prop, dir, e) {
    let s = String(text || '').trim();
    const imp = /!important$/i.test(s) ? ' !important' : '';
    s = s.replace(/\s*!important$/i, '');
    const m = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(s);
    if (!m) return null;
    let unit = m[2];
    let step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    if (prop === 'font-weight') step = 100;
    else if (prop === 'line-height' && !unit) step = e.shiftKey ? 1 : e.altKey ? 0.01 : 0.1;
    let n = Math.round((parseFloat(m[1]) + dir * step) * 1000) / 1000;
    if (NON_NEGATIVE.has(prop) && n < 0) n = 0;
    if (prop === 'font-weight') n = HE.util.clamp(n, 100, 900);
    if (!unit && !UNITLESS.has(prop) && n !== 0) unit = 'px';
    return n + unit + imp;
  }
  /** Browser serialisation of a declared value, so presets can be compared with what the model holds. */
  function normCss(prop, value) {
    const v = String(value || '').replace(/\s*!important$/i, '').trim();
    if (!scratch) scratch = document.createElement('div');
    try {
      scratch.style.setProperty(prop, v);
      const out = scratch.style.getPropertyValue(prop);
      scratch.removeAttribute('style');
      return out || v;
    } catch (e) { return v; }
  }
  function firstFamily(v, keepCase) {
    const f = String(v || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
    return keepCase ? f : f.toLowerCase();
  }
  function validColor(v) {
    const c = String(v).replace(/\s*!important$/i, '').trim();
    try { return !(window.CSS && CSS.supports) || CSS.supports('color', c); } catch (e) { return true; }
  }
  /** Any CSS color -> {hex:'#rrggbb', alpha}. null when it cannot be resolved here (var(), currentColor…). */
  function toHex(color) {
    const c = String(color || '').replace(/\s*!important$/i, '').trim();
    if (!c || /^(inherit|initial|unset|revert|currentcolor)$/i.test(c) || /var\(/i.test(c)) return null;
    let m = /^#([0-9a-f]{3,8})$/i.exec(c);
    if (m && [3, 4, 6, 8].includes(m[1].length)) {
      let h = m[1];
      if (h.length <= 4) h = h.split('').map((x) => x + x).join('');
      return { hex: '#' + h.slice(0, 6).toLowerCase(), alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(c);
    if (m) {
      const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      const hex = [m[1], m[2], m[3]].map((n) => Math.round(HE.util.clamp(parseFloat(n), 0, 255)).toString(16).padStart(2, '0')).join('');
      return { hex: '#' + hex, alpha: a };
    }
    if (/^transparent$/i.test(c)) return { hex: '#000000', alpha: 0 };
    // Named colors, hsl(), oklch()…: let a 1px canvas resolve them.
    try {
      if (!probe) {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        probe = cv.getContext('2d', { willReadFrequently: true });
      }
      if (!probe) return null;
      probe.fillStyle = '#000000';
      probe.fillStyle = c;
      const a = probe.fillStyle;
      probe.fillStyle = '#ffffff';
      probe.fillStyle = c;
      if (probe.fillStyle !== a) return null; // the canvas rejected the value
      probe.clearRect(0, 0, 1, 1);
      probe.fillRect(0, 0, 1, 1);
      const d = probe.getImageData(0, 0, 1, 1).data;
      return { hex: '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join(''), alpha: d[3] / 255 };
    } catch (e) { return null; }
  }
  function pctOf(v) {
    const s = String(v || '').replace(/\s*!important$/i, '').trim();
    if (!s) return '';
    const n = parseFloat(s);
    if (!isFinite(n)) return '';
    return String(Math.round(s.endsWith('%') ? n : n * 100));
  }
  function docOrder(list) {
    return list.map((id) => HE.doc.byId(id)).filter(Boolean)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }
  function byteSize(s) {
    try { return new Blob([s]).size; } catch (e) { return s.length; }
  }
  /** Shows long values and data URLs as a read-only summary instead of pushing megabytes into an input. */
  function showValue(input, v) {
    const s = String(v == null ? '' : v);
    if (/^data:/i.test(s) && s.length > 200) {
      input.readOnly = true;
      input.value = HE.t('（內嵌資料，{size}）', { size: HE.util.bytes(Math.round((s.length - s.indexOf(',') - 1) * 0.75)) });
      input.title = HE.t('內嵌資料無法在這裡編輯');
    } else if (s.length > LONG || (s.length > 200 && /url\(\s*["']?data:/i.test(s))) {
      input.readOnly = true;
      input.value = s.slice(0, 80) + '…';
      input.title = HE.t('內容太長，請用「編輯 HTML…」修改');
    } else {
      input.readOnly = false;
      input.value = s;
      input.removeAttribute('title');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Writes                                                              */
  /* ------------------------------------------------------------------ */

  function applyStyle(prop, value, label, coalesce) {
    if (!ids.length) return;
    const opts = { label: label || HE.t('修改樣式') };
    if (coalesce) opts.coalesce = coalesce;
    HE.ops.setStyle(ids.slice(), { [prop]: value }, opts);
  }
  /**
   * Turn a style off cleanly: drop the inline value first, and only write `off`
   * when the element is still on (because of a stylesheet or the tag's defaults).
   */
  function clearToggle(prop, off, isOn, label) {
    const targets = ids.slice();
    HE.history.transact(label, () => {
      for (const id of targets) {
        HE.ops.setStyle(id, { [prop]: '' });
        const cs = computed(id);
        if (!cs || isOn(cs)) HE.ops.setStyle(id, { [prop]: off });
      }
    });
  }
  function decoTokens(cs) {
    return (cs ? cs.getPropertyValue('text-decoration-line') : '').split(/\s+/).filter((t) => t && t !== 'none');
  }
  function toggleDeco(token, on, label) {
    const targets = ids.slice();
    HE.history.transact(label, () => {
      for (const id of targets) {
        const cs = computed(id);
        const cur = cs ? decoTokens(cs) : inlineOf(id, 'text-decoration-line').split(/\s+/).filter((t) => t && t !== 'none');
        const next = on ? cur.filter((t) => t !== token) : Array.from(new Set(cur.concat(token)));
        if (next.length) { HE.ops.setStyle(id, { 'text-decoration-line': next.join(' ') }); continue; }
        HE.ops.setStyle(id, { 'text-decoration': '' });
        if (!computed(id) || decoTokens(computed(id)).length) HE.ops.setStyle(id, { 'text-decoration-line': 'none' });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Controls                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Commit a text control on change / Enter (not while an IME is composing); Escape reverts.
   * The commit is also registered so a rebuild can flush it before removing the control.
   */
  function wireText(input, commit, revert) {
    let last = null;
    const run = () => {
      if (input.readOnly || input.disabled) return;
      if (input.value === last) return;
      commit(input.value);
      last = input.value;
    };
    input.addEventListener('focus', () => { last = input.value; });
    input.addEventListener('change', run);
    input.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); }
      else if (e.key === 'Escape') {
        e.preventDefault();
        if (revert) revert();
        last = input.value;
        input.blur();
      }
    });
    commits.set(input, run);
    return { reset(v) { last = v; } };
  }

  /**
   * Text input bound to one CSS property of the targets.
   * o: {id, prop, undo, kind:'length'|'text', stripPx, placeholder(id), aria, cls}
   */
  function styleInput(o) {
    const prop = o.prop;
    const isLen = o.kind !== 'text';
    const input = mk('input', 'input mono' + (o.cls ? ' ' + o.cls : ''), {
      id: o.id, type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': o.aria || null,
    });
    const show = (v) => (o.stripPx ? stripPxAll(v) : v);
    const norm = (raw) => (isLen ? normLength(prop, raw) : String(raw || '').trim());
    const w = wireText(input, (raw) => {
      const v = norm(raw);
      applyStyle(prop, v, o.undo);
      input.value = show(v);
    }, () => showValue(input, show(inlineOf(primary(), prop))));
    if (isLen) {
      input.addEventListener('keydown', (e) => {
        if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || e.ctrlKey || e.metaKey || input.readOnly) return;
        const next = stepValue(input.value.trim() || input.placeholder, prop, e.key === 'ArrowUp' ? 1 : -1, e);
        if (next == null) return;
        e.preventDefault();
        input.value = show(next);
        w.reset(input.value);
        applyStyle(prop, next, o.undo, coalesceKey(prop));
      });
    }
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      if (!focused(input)) showValue(input, show(inlineOf(id, prop)));
      input.placeholder = show(tidy(o.placeholder ? o.placeholder(id) : computedOf(id, prop)));
    });
    return input;
  }

  /**
   * Select bound to one CSS property. The empty option removes the inline value and shows the computed one.
   * o: {id, prop, options:[[value, label]], undo, aria, inherit, same(optionValue, inline), comp(id), showComputed(v)}
   */
  function styleSelect(o) {
    const sel = mk('select', 'select', { id: o.id, 'aria-label': o.aria || null });
    const def = mk('option', null, { value: '' });
    sel.append(def);
    for (const [v, t] of o.options) sel.append(mk('option', null, { value: v, text: t }));
    let custom = null;
    const same = o.same || ((v, cur) => v === cur.replace(/\s*!important$/i, '').trim().toLowerCase());
    sel.addEventListener('change', () => applyStyle(o.prop, sel.value, o.undo));
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      const comp = tidy(o.comp ? o.comp(id) : computedOf(id, o.prop));
      const value = comp ? (o.showComputed ? o.showComputed(comp) : comp) : '';
      if (o.inherit) def.textContent = comp ? HE.t('繼承（{value}）', { value }) : HE.t('繼承');
      else def.textContent = comp ? HE.t('預設（{value}）', { value }) : HE.t('預設');
      if (focused(sel)) return;
      const cur = inlineOf(id, o.prop);
      const match = cur ? o.options.find(([v]) => same(v, cur)) : null;
      if (cur && !match) {
        if (!custom) { custom = mk('option'); sel.append(custom); }
        custom.value = cur;
        custom.textContent = HE.t('自訂：{value}', { value: cur.length > 40 ? cur.slice(0, 39) + '…' : cur });
        sel.value = cur;
      } else {
        if (custom) { custom.remove(); custom = null; }
        sel.value = match ? match[0] : '';
      }
    });
    return sel;
  }

  /** Segmented buttons that set one property. o: {id, prop, items:[{value, icon|text, title}], undo, aria, current(id, cs)} */
  function seg(o) {
    const wrap = mk('div', 'seg insp-fit', { role: 'group', 'aria-label': o.aria });
    const btns = o.items.map((it) => {
      const b = mk('button', 'btn sm' + (it.icon ? ' icon' : ''), {
        type: 'button', id: o.id + '-' + it.value, title: it.title, 'aria-label': it.title, 'aria-pressed': 'false',
      });
      if (it.icon) b.innerHTML = HE.ui.icon(it.icon, 15); else b.textContent = it.text;
      b.addEventListener('click', () => applyStyle(o.prop, it.value, o.undo));
      wrap.append(b);
      return b;
    });
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      const cur = o.current(id, computed(id));
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(o.items[i].value === cur)));
    });
    return wrap;
  }

  /** Color picker + free text (any CSS color) + clear. o: {id, prop, label, undo, comp(id)} */
  function colorControl(o) {
    const row = mk('div', 'row insp-color');
    const picker = mk('input', 'color', { type: 'color', id: o.id + '-picker', title: HE.t('挑選顏色'), 'aria-label': HE.t('{label}（色盤）', { label: o.label }) });
    const text = mk('input', 'input mono grow', { type: 'text', id: o.id, spellcheck: 'false', autocomplete: 'off', 'aria-label': o.label });
    const clear = iconButton(o.id + '-clear', 'x', HE.t('清除{label}', { label: o.label }));
    const comp = (id) => (o.comp ? o.comp(id) : computedOf(id, o.prop));
    picker.addEventListener('input', () => {
      text.value = picker.value;
      applyStyle(o.prop, picker.value, o.undo, coalesceKey(o.prop));
    });
    wireText(text, (raw) => {
      const v = raw.trim();
      if (v && !validColor(v)) {
        HE.ui.toast(HE.t('無法辨識這個顏色：{value}', { value: v }), { type: 'error' });
        text.value = inlineOf(primary(), o.prop);
        return;
      }
      applyStyle(o.prop, v, o.undo);
    }, () => { text.value = inlineOf(primary(), o.prop); });
    clear.addEventListener('click', () => applyStyle(o.prop, '', o.undo));
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      const cur = inlineOf(id, o.prop);
      const c = comp(id);
      if (!focused(text)) text.value = cur;
      text.placeholder = tidy(c);
      if (!focused(picker)) {
        const rgb = toHex(cur) || toHex(c);
        const empty = !rgb || rgb.alpha === 0;
        picker.value = empty ? '#ffffff' : rgb.hex;
        picker.classList.toggle('is-empty', empty);
      }
      clear.disabled = !ids.some((x) => inlineOf(x, o.prop));
    });
    row.append(picker, text, clear);
    return row;
  }

  /** Font family: preset select plus a free text input for any stack. */
  function fontFamilyControl(prefix) {
    const wrap = mk('div', 'insp-stack');
    wrap.append(
      styleSelect({
        id: prefix, prop: 'font-family', options: FONTS, undo: HE.t('修改字體'), aria: HE.t('字體'), inherit: true,
        same: (v, cur) => firstFamily(v) === firstFamily(cur.replace(/\s*!important$/i, '')),
        showComputed: (c) => firstFamily(c, true),
      }),
      styleInput({ id: prefix + '-text', prop: 'font-family', kind: 'text', undo: HE.t('修改字體'), aria: HE.t('自訂字體') }));
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /* Element view                                                        */
  /* ------------------------------------------------------------------ */

  function hasText(m) {
    return !!m && !NO_TEXT.has(tagOf(m)) && /\S/.test(m.textContent || '');
  }
  function snippetOf(m) {
    if (tagOf(m) === 'img') {
      const alt = m.getAttribute('alt');
      if (alt) return HE.t('替代文字：{alt}', { alt });
      const src = m.getAttribute('src') || '';
      if (/^data:/i.test(src)) return HE.t('內嵌圖片');
      return src.split(/[?#]/)[0].split('/').pop() || '';
    }
    return HE.util.snippet(m, 60);
  }

  function buildElementView() {
    const m = model(primary());
    const tag = tagOf(m);
    pane.append(buildHeader());
    // The island's own settings come first: they are what its buttons are changed with.
    if (HE.island && HE.island.holds(m)) pane.append(section('island', HE.t('浮動島'), true, buildIsland));
    if (NON_VISUAL.has(tag)) {
      pane.append(section('meta-attrs', HE.t('屬性'), true, buildAttrs));
      return;
    }
    const text = section('text', HE.t('文字'), true, buildText);
    onSync(() => { text.hidden = !hasText(model(primary())); });
    pane.append(
      text,
      section('layout', HE.t('版面'), true, buildLayout),
      section('size', HE.t('尺寸'), true, buildSize),
      section('spacing', HE.t('間距'), true, buildSpacing),
      section('look', HE.t('外觀'), true, buildLook));
    if (HE.fx && HE.fx.canHost(m)) pane.append(section('motion', HE.t('動態效果'), true, buildMotion));
    pane.append(
      section('position', HE.t('位置'), false, buildPosition),
      section('attrs', HE.t('屬性'), false, buildAttrs));
  }

  function buildHeader() {
    const multi = ids.length > 1;
    const head = mk('div', 'insp-head');
    const title = mk('div', 'insp-title');
    const pill = mk('span', 'tag-pill');
    const name = mk('span', 'insp-name');
    const label = mk('span', 'insp-label');
    title.append(pill, name, label);
    const snip = mk('div', 'insp-snippet');
    const acts = mk('div', 'insp-actions', { role: 'toolbar', 'aria-label': HE.t('元素操作') });
    const defs = [
      ['insp-act-parent', 'parent', HE.t('選取父層'), 'escape', selectParent],
      ['insp-act-up', 'arrow-up', HE.t('上移'), 'alt+up', () => nudgeAll(-1)],
      ['insp-act-down', 'arrow-down', HE.t('下移'), 'alt+down', () => nudgeAll(1)],
      ['insp-act-dup', 'duplicate', HE.t('建立副本'), 'mod+d', duplicateAll],
      ['insp-act-del', 'trash', HE.t('刪除'), 'delete', removeAll],
      ['insp-act-ai', 'sparkles', HE.t('交給 AI'), 'mod+k', askAI],
    ];
    const btn = {};
    for (const [id, icon, text, key, fn] of defs) {
      const b = iconButton(id, icon, text, id === 'insp-act-ai' ? 'ghost insp-act-ai' : 'ghost');
      b.title = HE.t('{label}（{key}）', { label: text, key: HE.ui.kbd(key) });
      b.addEventListener('click', fn);
      acts.append(b);
      btn[id] = b;
    }
    head.append(title, snip, acts);

    onSync(() => {
      const els = ids.map(model).filter(Boolean);
      const p = model(primary());
      if (!p) return;
      const t = tagOf(p);
      pill.hidden = multi;
      pill.textContent = t;
      if (multi) {
        name.textContent = HE.t('已選取 {n} 個元素', { n: els.length });
        label.textContent = '';
        snip.textContent = HE.t('數值以「{label}」為準，修改會套用到全部', { label: HE.util.label(p) });
      } else {
        const full = HE.util.label(p);
        name.textContent = TAG_NAMES[t] || '';
        name.hidden = !name.textContent;
        label.textContent = full.slice(t.length);
        label.title = full;
        snip.textContent = snippetOf(p) || HE.t('（沒有文字）');
      }
      const root = HE.doc.model.documentElement;
      const chosen = new Set(ids);
      const movable = (e, sib) => !HE.doc.isRoot(e) && sib && !chosen.has(HE.doc.idOf(sib));
      btn['insp-act-parent'].disabled = !els.some((e) => e.parentElement && e.parentElement !== root);
      btn['insp-act-up'].disabled = !els.some((e) => movable(e, HE.ops.visualSibling(e, -1)));
      btn['insp-act-down'].disabled = !els.some((e) => movable(e, HE.ops.visualSibling(e, 1)));
      btn['insp-act-dup'].disabled = btn['insp-act-del'].disabled = els.every((e) => HE.doc.isRoot(e));
      btn['insp-act-ai'].hidden = !(HE.ai && typeof HE.ai.focus === 'function');
    });
    return head;
  }

  function selectParent() {
    const root = HE.doc.model && HE.doc.model.documentElement;
    const out = [];
    for (const e of ids.map((id) => HE.doc.byId(id))) {
      const p = e && e.parentElement;
      if (p && p !== root) out.push(HE.doc.idOf(p));
    }
    if (out.length) HE.sel.set(Array.from(new Set(out)));
  }
  /** Move every selected element one sibling up/down, never past another selected one, as one undo step. */
  function nudgeAll(dir) {
    const chosen = new Set(ids);
    const els = docOrder(ids);
    if (dir > 0) els.reverse();
    HE.history.transact(dir < 0 ? HE.t('上移') : HE.t('下移'), () => {
      for (const e of els) {
        const sib = HE.ops.visualSibling(e, dir);
        if (!sib || HE.doc.isRoot(e) || chosen.has(HE.doc.idOf(sib))) continue;
        HE.ops.nudge(HE.doc.idOf(e), dir);
      }
    });
    if (HE.canvas && typeof HE.canvas.scrollIntoView === 'function') HE.canvas.scrollIntoView(primary(), { stay: true });
  }
  function duplicateAll() {
    const out = HE.ops.duplicate(ids.slice(), { label: HE.t('建立副本') });
    if (out && out.length) HE.sel.set(out);
  }
  function removeAll() {
    HE.ops.remove(ids.slice(), { label: HE.t('刪除') });
  }
  function askAI() {
    if (HE.ai && typeof HE.ai.focus === 'function') HE.ai.focus({ ids: ids.slice() });
  }

  /* ---- 浮動島 ---- */

  /** One colour of the island's buttons (HE.island.setColors): picker + free text + clear. key: 'bg' | 'ink'. */
  function islandColor(id, key, label, fallback) {
    const row = mk('div', 'row insp-color');
    const picker = mk('input', 'color', { type: 'color', id: id + '-picker', title: HE.t('挑選顏色'), 'aria-label': HE.t('{label}（色盤）', { label }) });
    const text = mk('input', 'input mono grow', { type: 'text', id, spellcheck: 'false', autocomplete: 'off', 'aria-label': label, placeholder: fallback });
    const clear = iconButton(id + '-clear', 'x', HE.t('清除{label}', { label }));
    const cur = () => { const s = HE.island.get(); return s ? s[key] : ''; };
    picker.addEventListener('input', () => {
      text.value = picker.value;
      HE.island.setColors({ [key]: picker.value }, { coalesce: 'insp:tfi:' + key });
    });
    wireText(text, (raw) => {
      const v = raw.trim();
      if (v && !validColor(v)) {
        HE.ui.toast(HE.t('無法辨識這個顏色：{value}', { value: v }), { type: 'error' });
        text.value = cur();
        return;
      }
      HE.island.setColors({ [key]: v });
    }, () => { text.value = cur(); });
    clear.addEventListener('click', () => HE.island.setColors({ [key]: '' }));
    onSync(() => {
      const v = cur();
      if (!focused(text)) text.value = v;
      if (!focused(picker)) {
        const rgb = toHex(v) || toHex(fallback);
        picker.value = rgb ? rgb.hex : fallback;
        picker.classList.toggle('is-empty', !v);
      }
      clear.disabled = !v;
    });
    row.append(picker, text, clear);
    return row;
  }

  /** One row of the island's button list: {el, sync(button, count)}. `pages`: the pages a link may open (a multi-page document). */
  function islandRow(first, i, pages) {
    const id = first.id;
    const kinds = { link: HE.t('連結'), panel: HE.t('小面板'), top: HE.t('回到頂端') };
    let cur = first;
    // The button as the document has it now: an undo may have changed it since the last refresh.
    const now = () => { const s = HE.island.get(); return (s && s.buttons.find((x) => x.id === id)) || cur; };
    const el = mk('div', 'insp-tfi-row');
    const head = mk('div', 'row');
    const label = mk('input', 'input grow', { type: 'text', id: 'insp-tfi-label-' + i, autocomplete: 'off', 'aria-label': HE.t('第 {n} 個按鈕的文字', { n: i + 1 }) });
    wireText(label, (raw) => { if (!HE.island.updateButton(id, { label: raw })) label.value = now().label; }, () => { label.value = now().label; });
    const up = iconButton('insp-tfi-up-' + i, 'arrow-up', HE.t('上移'));
    const down = iconButton('insp-tfi-down-' + i, 'arrow-down', HE.t('下移'));
    const del = iconButton('insp-tfi-del-' + i, 'trash', HE.t('刪除'));
    up.addEventListener('click', () => HE.island.moveButton(id, -1));
    down.addEventListener('click', () => HE.island.moveButton(id, 1));
    del.addEventListener('click', () => HE.island.removeButton(id));
    head.append(mk('span', 'tag-pill insp-tfi-kind', { text: kinds[first.kind] }), label, up, down, del);
    el.append(head);
    let href = null;
    let page = null;
    if (first.kind === 'link') {
      href = mk('input', 'input mono', { type: 'text', id: 'insp-tfi-href-' + i, spellcheck: 'false', autocomplete: 'off', placeholder: 'https://', 'aria-label': HE.t('第 {n} 個按鈕的網址', { n: i + 1 }) });
      const shown = () => (now().page ? '' : now().href);
      wireText(href, (raw) => { if (!HE.island.updateButton(id, { href: raw })) href.value = shown(); }, () => { href.value = shown(); });
      if (pages.length) {
        page = mk('select', 'select', { id: 'insp-tfi-page-' + i, 'aria-label': HE.t('第 {n} 個按鈕連到哪裡', { n: i + 1 }) });
        page.append(mk('option', null, { value: '', text: HE.t('網址…') }));
        for (const p of pages) page.append(mk('option', null, { value: p.anchor, text: HE.t('頁面：{title}', { title: p.title }) }));
        page.addEventListener('change', () => {
          if (page.value) { HE.island.updateButton(id, { page: page.value }); return; }
          // 網址…: the link keeps its page until an address is typed.
          href.hidden = false;
          href.value = '';
          href.focus();
        });
        el.append(page);
      }
      el.append(href);
    } else if (first.kind === 'panel') {
      const edit = textButton('insp-tfi-edit-' + i, 'pencil', HE.t('編輯面板內容'));
      edit.addEventListener('click', () => { if (now().panelId) HE.sel.set([now().panelId]); });
      el.append(group('row', edit));
    } else {
      el.append(mk('div', 'field-help', { text: HE.t('連到「#」：瀏覽器捲回頁面最上方。') }));
    }
    return {
      el,
      sync(x, count) {
        cur = x;
        if (!focused(label)) label.value = x.label;
        up.disabled = i === 0;
        down.disabled = i === count - 1;
        if (href && !focused(href)) href.value = x.page ? '' : x.href;
        if (page && !focused(page) && !focused(href)) { page.value = x.page; href.hidden = !!x.page; }
      },
    };
  }

  function buildIsland(b) {
    const api = HE.island;
    b.append(mk('div', 'field-help', {
      id: 'insp-tfi-about',
      text: HE.t('浮動島是固定在視窗角落的 1 組按鈕，不需要腳本。這個檔案沒有伺服器：「小幫手」只顯示你寫好的內容，不是會回答問題的 AI；「問題回報」不能自己收件，只能連到你自己的信箱、表單或客服網址。'),
    }));

    const corners = [['tl', HE.t('左上')], ['tr', HE.t('右上')], ['bl', HE.t('左下')], ['br', HE.t('右下')]];
    const pos = mk('div', 'seg insp-fit insp-tfi-pos', { role: 'group', 'aria-label': HE.t('浮動島的位置') });
    const posBtns = corners.map(([value, text]) => {
      const btn = mk('button', 'btn sm', { type: 'button', id: 'insp-tfi-pos-' + value, 'aria-pressed': 'false', text });
      btn.addEventListener('click', () => api.setPosition(value));
      pos.append(btn);
      return btn;
    });
    b.append(field(HE.t('位置'), pos));
    const space = mk('input', null, { type: 'checkbox', id: 'insp-tfi-space' });
    const spaceLab = mk('label', 'insp-check insp-tfi-check', { for: 'insp-tfi-space' });
    spaceLab.append(space, document.createTextNode(HE.t('在頁面最後留白，避免按鈕蓋住內容')));
    space.addEventListener('change', () => { if (!api.setSpace(space.checked)) { const s = api.get(); space.checked = !!(s && s.space); } });
    const spaceNote = mk('div', 'field-help', { id: 'insp-tfi-space-note', text: HE.t('浮動島在上方時不需要留白，這個設定沒有作用。') });
    b.append(group('field', mk('span'), spaceLab), spaceNote);
    b.append(field(HE.t('按鈕底色'), islandColor('insp-tfi-bg', 'bg', HE.t('按鈕底色'), '#1f2328'), 'insp-tfi-bg'));
    b.append(field(HE.t('按鈕文字色'), islandColor('insp-tfi-ink', 'ink', HE.t('按鈕文字色'), '#ffffff'), 'insp-tfi-ink'));

    const list = mk('div', 'insp-tfi-list', { id: 'insp-tfi-list', role: 'group', 'aria-label': HE.t('浮動島的按鈕') });
    const addLink = textButton('insp-tfi-add-link', 'plus', HE.t('連結'));
    const addPanel = textButton('insp-tfi-add-panel', 'plus', HE.t('小面板'));
    const addTop = textButton('insp-tfi-add-top', 'plus', HE.t('回到頂端'));
    addLink.addEventListener('click', () => api.addButton('link'));
    // The new button is selected, so that the canvas opens its panel.
    addPanel.addEventListener('click', () => { const id = api.addButton('panel'); if (id) HE.sel.set([id]); });
    addTop.addEventListener('click', () => api.addButton('top'));
    const noTop = mk('div', 'field-help', { id: 'insp-tfi-no-top', text: HE.t('多頁面文件不提供「回到頂端」：連到「#」會跳回第 1 頁。') });
    const sample = mk('div', 'insp-tfi-warn', { id: 'insp-tfi-sample', role: 'note', text: HE.t('有按鈕還連到範例網址（example.com）。請換成你自己的信箱、表單或客服網址，否則訪客按下後聯絡不到你。') });
    const topInPages = mk('div', 'insp-tfi-warn', { id: 'insp-tfi-top-pages', role: 'note', text: HE.t('這份文件現在是多頁面，「回到頂端」按鈕會跳回第 1 頁。建議刪除這個按鈕，因為訪客會離開正在看的頁面。') });
    b.append(list, field(HE.t('新增按鈕'), group('row insp-tfi-add', addLink, addPanel, addTop)), noTop, sample, topInPages);

    let shapeOf = null;
    let rows = [];
    onSync(() => {
      const s = api.get();
      if (!s) { list.replaceChildren(); rows = []; shapeOf = null; return; }
      posBtns.forEach((btn, i) => btn.setAttribute('aria-pressed', String(corners[i][0] === s.pos)));
      space.checked = s.space;
      spaceNote.hidden = !(s.space && s.pos[0] === 't');
      const pages = s.multipage ? HE.pages.list() : [];
      // The rows are built again only when the buttons or the pages are other ones: a field being typed in stays.
      const shape = JSON.stringify([s.buttons.map((x) => [x.id, x.kind]), pages.map((p) => [p.anchor, p.title])]);
      if (shape !== shapeOf) {
        shapeOf = shape;
        rows = s.buttons.map((x, i) => islandRow(x, i, pages));
        list.replaceChildren(...rows.map((r) => r.el));
      }
      rows.forEach((r, i) => r.sync(s.buttons[i], rows.length));
      addTop.disabled = s.multipage;
      noTop.hidden = !s.multipage;
      sample.hidden = !s.buttons.some((x) => x.kind === 'link' && /(^|[@./])example\.com\b/i.test(x.href));
      topInPages.hidden = !(s.multipage && s.buttons.some((x) => x.kind === 'top'));
    });
  }

  /* ---- 文字 ---- */

  function buildText(b) {
    b.append(field(HE.t('字體'), fontFamilyControl('insp-font-family'), 'insp-font-family'));
    b.append(group('grid2',
      mini(HE.t('字級'), styleInput({ id: 'insp-font-size', prop: 'font-size', undo: HE.t('修改字級') })),
      mini(HE.t('字重'), styleSelect({
        id: 'insp-font-weight', prop: 'font-weight', options: WEIGHTS, undo: HE.t('修改字重'),
        same: (v, cur) => v === ({ normal: '400', bold: '700' }[cur.trim()] || cur.trim()),
      }))));
    b.append(group('grid2',
      mini(HE.t('行高'), styleInput({ id: 'insp-line-height', prop: 'line-height', undo: HE.t('修改行高') })),
      mini(HE.t('字距'), styleInput({ id: 'insp-letter-spacing', prop: 'letter-spacing', undo: HE.t('修改字距') }))));
    b.append(field(HE.t('顏色'), colorControl({ id: 'insp-color', prop: 'color', label: HE.t('文字顏色'), undo: HE.t('修改文字顏色') }), 'insp-color'));
    const row = mk('div', 'row insp-textrow');
    row.append(alignSeg(), styleToggles());
    b.append(row);
    b.append(field(HE.t('大小寫'), styleSelect({ id: 'insp-text-transform', prop: 'text-transform', options: TRANSFORMS, undo: HE.t('修改大小寫') })));
  }

  function alignSeg() {
    return seg({
      id: 'insp-text-align', prop: 'text-align', aria: HE.t('對齊'), undo: HE.t('修改對齊'),
      items: [
        { value: 'left', icon: 'align-left', title: HE.t('靠左') },
        { value: 'center', icon: 'align-center', title: HE.t('置中') },
        { value: 'right', icon: 'align-right', title: HE.t('靠右') },
        { value: 'justify', icon: 'align-justify', title: HE.t('左右對齊') },
      ],
      current: (id, cs) => {
        let v = (cs ? cs.getPropertyValue('text-align') : inlineOf(id, 'text-align')).replace(/\s*!important$/i, '').trim();
        const rtl = !!cs && cs.getPropertyValue('direction') === 'rtl';
        if (v === 'start') v = rtl ? 'right' : 'left';
        else if (v === 'end') v = rtl ? 'left' : 'right';
        else if (/center/.test(v)) v = 'center';
        return v;
      },
    });
  }

  function styleToggles() {
    const g = mk('div', 'seg', { role: 'group', 'aria-label': HE.t('文字樣式') });
    const isBold = (cs) => parseInt(cs.getPropertyValue('font-weight'), 10) >= 600;
    const isItalic = (cs) => /italic|oblique/.test(cs.getPropertyValue('font-style'));
    const defs = [
      { id: 'insp-bold', icon: 'bold', title: HE.t('粗體'), isOn: isBold,
        toggle: (on) => (on ? clearToggle('font-weight', 'normal', isBold, HE.t('取消粗體')) : applyStyle('font-weight', '700', HE.t('設為粗體'))) },
      { id: 'insp-italic', icon: 'italic', title: HE.t('斜體'), isOn: isItalic,
        toggle: (on) => (on ? clearToggle('font-style', 'normal', isItalic, HE.t('取消斜體')) : applyStyle('font-style', 'italic', HE.t('設為斜體'))) },
      { id: 'insp-underline', icon: 'underline', title: HE.t('底線'), isOn: (cs) => decoTokens(cs).includes('underline'),
        toggle: (on) => toggleDeco('underline', on, on ? HE.t('取消底線') : HE.t('加上底線')) },
      { id: 'insp-strike', icon: 'strike', title: HE.t('刪除線'), isOn: (cs) => decoTokens(cs).includes('line-through'),
        toggle: (on) => toggleDeco('line-through', on, on ? HE.t('取消刪除線') : HE.t('加上刪除線')) },
    ];
    for (const d of defs) {
      const b = iconButton(d.id, d.icon, d.title, '');
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        const cs = computed(primary());
        d.toggle(cs ? d.isOn(cs) : b.getAttribute('aria-pressed') === 'true');
      });
      g.append(b);
      onSync(() => {
        const cs = computed(primary());
        b.setAttribute('aria-pressed', String(!!cs && d.isOn(cs)));
      });
    }
    return g;
  }

  /* ---- 版面 ---- */

  function buildLayout(b) {
    b.append(field(HE.t('顯示'), styleSelect({ id: 'insp-display', prop: 'display', options: DISPLAYS, undo: HE.t('修改顯示方式') })));

    const flex = mk('div', 'insp-group', { id: 'insp-flex-group', role: 'group', 'aria-label': HE.t('Flex 排版') });
    flex.append(
      field(HE.t('方向'), seg({
        id: 'insp-flex-direction', prop: 'flex-direction', aria: HE.t('排列方向'), undo: HE.t('修改排列方向'),
        items: [{ value: 'row', text: HE.t('橫向'), title: HE.t('橫向排列') }, { value: 'column', text: HE.t('直向'), title: HE.t('直向排列') }],
        current: (id, cs) => (/column/.test(cs ? cs.getPropertyValue('flex-direction') : inlineOf(id, 'flex-direction')) ? 'column' : 'row'),
      }), 'insp-flex-direction-row'),
      field(HE.t('換行'), wrapToggle()),
      field(HE.t('主軸'), styleSelect({ id: 'insp-justify-content', prop: 'justify-content', options: JUSTIFY, undo: HE.t('修改主軸對齊') })),
      field(HE.t('交叉軸'), styleSelect({ id: 'insp-align-items', prop: 'align-items', options: ALIGN, undo: HE.t('修改交叉軸對齊') })),
      field(HE.t('間隔'), styleInput({ id: 'insp-gap-flex', prop: 'gap', undo: HE.t('修改間隔') })));

    const grid = mk('div', 'insp-group', { id: 'insp-grid-group', role: 'group', 'aria-label': HE.t('Grid 排版') });
    const cols = styleInput({ id: 'insp-grid-columns', prop: 'grid-template-columns', kind: 'text', undo: HE.t('修改格線欄位') });
    const chips = mk('div', 'insp-chips');
    GRID_PRESETS.forEach((v, i) => {
      const c = mk('button', 'chip', { type: 'button', id: 'insp-grid-preset-' + i, text: v, title: HE.t('套用 {value}', { value: v }) });
      c.addEventListener('click', () => applyStyle('grid-template-columns', v, HE.t('修改格線欄位')));
      chips.append(c);
    });
    grid.append(
      field(HE.t('欄'), group('insp-stack', cols, chips), 'insp-grid-columns'),
      field(HE.t('間隔'), styleInput({ id: 'insp-gap-grid', prop: 'gap', undo: HE.t('修改間隔') })));

    const child = mk('div', 'insp-group', { id: 'insp-flex-child', role: 'group', 'aria-label': HE.t('Flex 子項目') });
    child.append(
      mk('div', 'insp-cap', { text: HE.t('在 Flex 容器中') }),
      field(HE.t('伸展比例'), styleInput({ id: 'insp-flex-grow', prop: 'flex-grow', undo: HE.t('修改伸展比例') })));

    b.append(flex, grid, child);
    onSync(() => {
      const id = primary();
      const m = model(id);
      if (!m) return;
      const cs = computed(id);
      const d = cs ? cs.getPropertyValue('display') : inlineOf(id, 'display');
      flex.hidden = !/flex/.test(d);
      grid.hidden = !/grid/.test(d);
      const p = m.parentElement;
      const pcs = p ? computed(HE.doc.idOf(p)) : null;
      child.hidden = !(pcs && /flex/.test(pcs.getPropertyValue('display')));
    });
  }

  function wrapToggle() {
    const b = mk('button', 'btn sm insp-fit', { type: 'button', id: 'insp-flex-wrap', 'aria-pressed': 'false', text: HE.t('自動換行') });
    const isWrap = (cs) => !/nowrap/.test(cs.getPropertyValue('flex-wrap'));
    b.addEventListener('click', () => {
      const cs = computed(primary());
      const on = cs ? isWrap(cs) : b.getAttribute('aria-pressed') === 'true';
      if (on) clearToggle('flex-wrap', 'nowrap', isWrap, HE.t('取消自動換行'));
      else applyStyle('flex-wrap', 'wrap', HE.t('設為自動換行'));
    });
    onSync(() => {
      const cs = computed(primary());
      b.setAttribute('aria-pressed', String(!!cs && isWrap(cs)));
    });
    return b;
  }

  /* ---- 尺寸 ---- */

  function buildSize(b) {
    const len = (id, prop, undo) => styleInput({ id, prop, undo });
    b.append(group('grid2',
      mini(HE.t('寬度'), len('insp-width', 'width', HE.t('修改寬度'))),
      mini(HE.t('高度'), len('insp-height', 'height', HE.t('修改高度')))));
    b.append(group('grid2',
      mini(HE.t('最小寬度'), len('insp-min-width', 'min-width', HE.t('修改最小寬度'))),
      mini(HE.t('最大寬度'), len('insp-max-width', 'max-width', HE.t('修改最大寬度')))));
    b.append(group('grid2',
      mini(HE.t('最小高度'), len('insp-min-height', 'min-height', HE.t('修改最小高度'))),
      mini(HE.t('最大高度'), len('insp-max-height', 'max-height', HE.t('修改最大高度')))));
    const tag = tagOf(model(primary()));
    if (tag === 'img' || tag === 'video') {
      b.append(field(HE.t('填滿方式'), styleSelect({ id: 'insp-object-fit', prop: 'object-fit', options: OBJECT_FIT, undo: HE.t('修改填滿方式') })));
    }
  }

  /* ---- 間距 ---- */

  function buildSpacing(b) {
    b.append(boxWidget());
    b.append(group('grid2',
      mini(HE.t('外距（全部）'), styleInput({
        id: 'insp-margin-all', prop: 'margin', undo: HE.t('修改外距'), stripPx: true, placeholder: (id) => sidesOf(id, (s) => 'margin-' + s),
      })),
      mini(HE.t('內距（全部）'), styleInput({
        id: 'insp-padding-all', prop: 'padding', undo: HE.t('修改內距'), stripPx: true, placeholder: (id) => sidesOf(id, (s) => 'padding-' + s),
      }))));
    b.append(mk('div', 'field-help', { text: HE.t('數字代表 px；外距可填 auto。上下鍵每次調 1，Shift 調 10。') }));
  }

  /** Devtools-style box: margin inputs on the outer edges, padding inside, element size in the middle. */
  function boxWidget() {
    const mBox = mk('div', 'insp-box-m', { role: 'group', 'aria-label': HE.t('外距與內距') });
    const pBox = mk('div', 'insp-box-p');
    const center = mk('div', 'insp-box-c', { title: HE.t('元素尺寸（含邊框）') });
    mBox.append(mk('span', 'insp-box-cap', { text: HE.t('外距'), 'aria-hidden': 'true' }));
    pBox.append(mk('span', 'insp-box-cap', { text: HE.t('內距'), 'aria-hidden': 'true' }));
    for (const s of SIDES) {
      mBox.append(styleInput({
        id: 'insp-margin-' + s, prop: 'margin-' + s, undo: HE.t('修改外距'), stripPx: true,
        aria: SIDE_MARGIN[s], cls: 'insp-box-in insp-box-' + s,
      }));
      pBox.append(styleInput({
        id: 'insp-padding-' + s, prop: 'padding-' + s, undo: HE.t('修改內距'), stripPx: true,
        aria: SIDE_PADDING[s], cls: 'insp-box-in insp-box-' + s,
      }));
    }
    pBox.append(center);
    mBox.append(pBox);
    onSync(() => {
      const l = HE.live.byId(primary());
      if (!l) { center.textContent = '—'; return; }
      let w = l.offsetWidth;
      let h = l.offsetHeight;
      if (w == null) { const r = l.getBoundingClientRect(); w = r.width; h = r.height; }
      center.textContent = Math.round(w) + ' × ' + Math.round(h);
    });
    return group('insp-box', mBox);
  }

  /* ---- 外觀 ---- */

  function buildLook(b) {
    b.append(field(HE.t('背景色'), colorControl({ id: 'insp-background-color', prop: 'background-color', label: HE.t('背景色'), undo: HE.t('修改背景色') }), 'insp-background-color'));
    b.append(field(HE.t('背景圖'), styleInput({ id: 'insp-background-image', prop: 'background-image', kind: 'text', undo: HE.t('修改背景圖') })));
    b.append(group('grid2',
      mini(HE.t('邊框寬度'), styleInput({
        id: 'insp-border-width', prop: 'border-width', undo: HE.t('修改邊框寬度'), placeholder: (id) => sidesOf(id, (s) => 'border-' + s + '-width'),
      })),
      mini(HE.t('邊框樣式'), styleSelect({
        id: 'insp-border-style', prop: 'border-style', options: BORDER_STYLES, undo: HE.t('修改邊框樣式'), comp: (id) => computedOf(id, 'border-top-style'),
      }))));
    b.append(field(HE.t('邊框色'), colorControl({
      id: 'insp-border-color', prop: 'border-color', label: HE.t('邊框顏色'), undo: HE.t('修改邊框顏色'), comp: (id) => computedOf(id, 'border-top-color'),
    }), 'insp-border-color'));
    b.append(field(HE.t('圓角'), styleInput({
      id: 'insp-border-radius', prop: 'border-radius', undo: HE.t('修改圓角'),
      placeholder: (id) => computedOf(id, 'border-radius') || computedOf(id, 'border-top-left-radius'),
    })));
    b.append(field(HE.t('陰影'), shadowControl(), 'insp-box-shadow'));
    b.append(field(HE.t('不透明度'), opacityControl(), 'insp-opacity'));
  }

  function shadowControl() {
    const sel = mk('select', 'select', { id: 'insp-box-shadow', 'aria-label': HE.t('陰影') });
    const def = mk('option', null, { value: '' });
    sel.append(def);
    for (const [v, t] of SHADOWS) sel.append(mk('option', null, { value: v, text: t }));
    sel.append(mk('option', null, { value: CUSTOM, text: HE.t('自訂…') }));
    const text = styleInput({
      id: 'insp-box-shadow-custom', prop: 'box-shadow', kind: 'text', undo: HE.t('修改陰影'), aria: HE.t('自訂陰影'),
      placeholder: () => HE.t('例如 0 2px 8px rgba(0, 0, 0, 0.2)'),
    });
    let wantCustom = false;
    sel.addEventListener('change', () => {
      if (sel.value === CUSTOM) { wantCustom = true; text.hidden = false; text.focus(); return; }
      wantCustom = false;
      applyStyle('box-shadow', sel.value, HE.t('修改陰影'));
    });
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      const cur = inlineOf(id, 'box-shadow');
      const comp = computedOf(id, 'box-shadow');
      def.textContent = comp && comp !== 'none' ? HE.t('預設（有陰影）') : HE.t('預設（無）');
      const match = cur ? SHADOWS.find(([v]) => normCss('box-shadow', v) === normCss('box-shadow', cur)) : null;
      const custom = !!cur && !match;
      if (!focused(sel)) sel.value = match ? match[0] : (custom || wantCustom ? CUSTOM : '');
      text.hidden = !(custom || wantCustom || focused(text));
    });
    return group('insp-stack', sel, text);
  }

  function opacityControl() {
    const range = mk('input', 'insp-range', { type: 'range', id: 'insp-opacity', min: '0', max: '100', step: '1', 'aria-label': HE.t('不透明度') });
    const num = mk('input', 'input mono insp-num', {
      type: 'text', id: 'insp-opacity-num', inputmode: 'numeric', autocomplete: 'off', 'aria-label': HE.t('不透明度（百分比）'),
    });
    const commitPct = (pct, coalesce) => applyStyle('opacity', pct === '' ? '' : String(pct / 100), HE.t('修改不透明度'), coalesce);
    range.addEventListener('input', () => {
      num.value = range.value;
      commitPct(Number(range.value), coalesceKey('opacity'));
    });
    const w = wireText(num, (raw) => {
      const t = raw.replace('%', '').trim();
      if (!t) { commitPct(''); return; }
      const n = parseFloat(t);
      if (!isFinite(n)) { num.value = pctOf(inlineOf(primary(), 'opacity')); return; }
      const pct = HE.util.clamp(Math.round(n), 0, 100);
      num.value = String(pct);
      commitPct(pct);
    }, () => { num.value = pctOf(inlineOf(primary(), 'opacity')); });
    num.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const base = parseFloat(num.value || num.placeholder || '100');
      const pct = HE.util.clamp(Math.round((isFinite(base) ? base : 100) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)), 0, 100);
      num.value = String(pct);
      w.reset(num.value);
      commitPct(pct, coalesceKey('opacity'));
    });
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      const inl = inlineOf(id, 'opacity');
      const comp = computedOf(id, 'opacity') || '1';
      if (!focused(range)) range.value = pctOf(inl || comp) || '100';
      if (!focused(num)) num.value = inl ? pctOf(inl) : '';
      num.placeholder = pctOf(comp) || '100';
    });
    const row = mk('div', 'row');
    row.append(range, num, mk('span', 'insp-unit', { text: '%', 'aria-hidden': 'true' }));
    return row;
  }

  /* ---- 動態效果 ---- */

  /** Apply an HE.fx spec to every selected element (one undo step) and report what moved where. */
  function applyFx(spec, label) {
    if (!ids.length) return;
    let res = null;
    try { res = HE.fx.apply(ids.slice(), spec, { label }); } catch (err) { HE.ui.toast(String(err.message || err), { type: 'error' }); return; }
    if (res && res.notes.length) HE.ui.status(Array.from(new Set(res.notes)).join(HE.t('；')));
  }
  /** The shared value of key over the selection, or null when the elements differ. */
  function common(list, key) {
    const vals = new Set(list.map((f) => f[key] || ''));
    return vals.size === 1 ? Array.from(vals)[0] : null;
  }

  function fxSeg(id, aria, items, key, label) {
    const wrap = mk('div', 'seg insp-fit', { role: 'group', 'aria-label': aria });
    const btns = items.map((it) => {
      const b = mk('button', 'btn sm', { type: 'button', id: id + '-' + it.value, 'aria-pressed': 'false', title: HE.t('{name}：{value}', { name: aria, value: it.label }), text: it.label });
      b.addEventListener('click', () => applyFx({ [key]: it.value }, label));
      wrap.append(b);
      return b;
    });
    return {
      el: wrap,
      set(value, disabled) {
        btns.forEach((b, i) => { b.setAttribute('aria-pressed', String(items[i].value === value)); b.disabled = disabled; });
      },
    };
  }

  function buildMotion(b) {
    const fx = HE.fx;
    const rows = {};
    for (const kind of fx.KINDS) {
      const name = fx.KIND_ZH[kind];
      const sel = mk('select', 'select grow', { id: 'insp-fx-' + kind, 'aria-describedby': 'insp-fx-' + kind + '-desc' });
      sel.append(mk('option', null, { value: 'none', text: HE.t('無') }));
      for (const p of fx.presets(kind)) sel.append(mk('option', null, { value: p.name, text: p.label }));
      const mixed = mk('option', null, { value: '', text: HE.t('（不同效果）'), disabled: true });
      sel.append(mixed);
      const clear = iconButton('insp-fx-' + kind + '-clear', 'x', HE.t('移除{name}效果', { name }));
      const desc = mk('div', 'field-help insp-fx-desc', { id: 'insp-fx-' + kind + '-desc' });
      sel.addEventListener('change', () => {
        if (!sel.value) return;
        const p = fx.preset(kind, sel.value);
        applyFx({ [kind]: sel.value }, p ? HE.t('套用「{label}」', { label: p.label }) : HE.t('移除{name}效果', { name }));
      });
      clear.addEventListener('click', () => applyFx({ [kind]: 'none' }, HE.t('移除{name}效果', { name })));
      b.append(field(name, group('row', sel, clear), sel.id), desc);
      rows[kind] = { sel, clear, desc, mixed };
    }

    const k = fxSeg('insp-fx-k', HE.t('強度'), fx.INTENSITY, 'intensity', HE.t('修改效果強度'));
    const t = fxSeg('insp-fx-t', HE.t('時機'), fx.TIMING, 'timing', HE.t('修改效果時機'));
    const kField = field(HE.t('強度'), k.el);
    const tField = field(HE.t('時機'), t.el);
    const tHelp = mk('div', 'field-help', { text: HE.t('進場與捲動效果在捲到哪裡時播放：早＝元素剛出現就播完，晚＝捲到較高處才播完。') });
    const color = colorControl({ id: 'insp-fx-color', prop: '--tfx-color', label: HE.t('效果顏色'), undo: HE.t('修改效果顏色'), comp: () => HE.t('預設：文字顏色') });
    const cField = field(HE.t('顏色'), color, 'insp-fx-color');

    const demo = textButton('insp-fx-demo', 'play', HE.t('預覽'));
    demo.title = HE.t('在編輯模式中播放一次選取元素的效果');
    demo.addEventListener('click', () => { if (fx.demoing) fx.stopDemo(); else fx.demo(ids.slice()); });
    const showDemo = () => {
      const running = fx.demoing;
      demo.setAttribute('aria-pressed', String(running));
      demo.querySelector('span').textContent = running ? HE.t('停止預覽') : HE.t('預覽');
    };
    syncDemoBtn = () => { if (demo.isConnected) showDemo(); };
    const removeBtn = textButton('insp-fx-remove', 'trash', HE.t('移除效果'));
    removeBtn.title = HE.t('移除選取元素的全部動態效果');
    removeBtn.addEventListener('click', () => applyFx({ hover: 'none', entrance: 'none', scroll: 'none' }, HE.t('移除動態效果')));
    const hintBox = mk('div', 'insp-fx-hints', { role: 'list', 'aria-label': HE.t('動態效果提醒') });
    const note = mk('div', 'field-help', { text: HE.t('效果只在預覽模式和匯出的頁面播放；編輯模式中保持靜止，可以按「預覽」看一次。') });
    b.append(kField, tField, tHelp, cField, group('row insp-fx-actions', demo, removeBtn), hintBox, note);

    let hintKey = null;
    onSync(() => {
      const p = primary();
      if (!model(p)) return;
      const list = ids.map((id) => fx.of(id));
      const any = list.some((f) => fx.hasAny(f));
      let timed = false;
      let colored = false;
      let scaled = false;
      for (const kind of fx.KINDS) {
        const r = rows[kind];
        const v = common(list, kind);
        if (!focused(r.sel)) {
          r.mixed.hidden = v !== null;
          r.sel.value = v === null ? '' : v || 'none';
        }
        const pr = v ? fx.preset(kind, v) : null;
        r.desc.textContent = pr ? pr.desc : v === null ? HE.t('選取的元素用了不同的{name}效果。', { name: fx.KIND_ZH[kind] }) : '';
        r.desc.hidden = !r.desc.textContent;
        r.clear.disabled = list.every((f) => !f[kind]);
        for (const f of list) {
          const q = fx.preset(kind, f[kind]);
          if (!q) continue;
          if (q.timing) timed = true;
          if (q.color) colored = true;
          if (q.intensity !== false) scaled = true;
        }
      }
      // The shared value over the elements the control applies to (applying it clears it on the others).
      const uses = (f, test) => fx.KINDS.some((kd) => { const q = fx.preset(kd, f[kd]); return !!q && test(q); });
      k.set(common(list.filter((f) => uses(f, (q) => q.intensity !== false)), 'intensity'), !scaled);
      kField.hidden = !any;
      t.set(common(list.filter((f) => uses(f, (q) => q.timing)), 'timing'), !timed);
      tField.hidden = tHelp.hidden = !timed;
      cField.hidden = !colored;
      demo.disabled = !any;
      showDemo();
      removeBtn.disabled = !any;
      note.hidden = !any;
      // Hints read computed styles: only while the section is open, and not while ▶ 預覽 changes them.
      if (!b.parentElement || !b.parentElement.open || fx.demoing) return;
      const hints = any ? fx.hints(p) : [];
      // Keyed on what is shown: the texts name ancestors and presets (re-rendering on every sync would
      // move keyboard focus off a hint button).
      const key = hints.map((h) => h.code + '|' + h.text + '|' + (h.action ? h.action.label : '')).join('\n');
      if (key === hintKey) return;
      hintKey = key;
      hintBox.replaceChildren(...hints.map((h, i) => {
        const row = mk('div', 'insp-fx-hint is-' + h.level, { role: 'listitem' });
        row.innerHTML = HE.ui.icon(h.level === 'warn' ? 'alert' : 'sparkles', 14);
        row.append(mk('span', 'insp-fx-hint-text', { text: h.level === 'warn' ? HE.t('注意：{text}', { text: h.text }) : h.text }));
        if (h.action) {
          const act = textButton('insp-fx-hint-' + i, null, h.action.label, 'insp-fx-hint-act');
          // Resolved when clicked: the element may have moved or changed effects since the box was drawn.
          act.addEventListener('click', () => {
            hintKey = null;
            const cur = fx.hints(primary()).find((x) => x.code === h.code);
            if (cur && cur.action) cur.action.run();
          });
          row.append(act);
        }
        return row;
      }));
      hintBox.hidden = !hints.length;
    });
  }

  /* ---- 位置 ---- */

  function buildPosition(b) {
    b.append(field(HE.t('定位'), styleSelect({ id: 'insp-position', prop: 'position', options: POSITIONS, undo: HE.t('修改定位方式') })));
    const sides = mk('div', 'grid4');
    for (const s of SIDES) sides.append(mini(SIDE_ZH[s], styleInput({ id: 'insp-pos-' + s, prop: s, undo: HE.t('修改位置') })));
    const hint = mk('div', 'field-help', { text: HE.t('「靜態」定位時，上下左右與疊放順序不會生效。') });
    b.append(sides, hint);
    b.append(field(HE.t('疊放順序'), styleInput({ id: 'insp-z-index', prop: 'z-index', undo: HE.t('修改疊放順序') })));
    b.append(field(HE.t('位移'), translateControl(), 'insp-translate'));
    const extra = mk('div', 'field-help mono insp-transform');
    b.append(extra);
    onSync(() => {
      const id = primary();
      if (!model(id)) return;
      const pos = computedOf(id, 'position') || inlineOf(id, 'position');
      hint.hidden = !(pos === '' || pos === 'static');
      const tf = inlineOf(id, 'transform');
      extra.hidden = !tf;
      extra.textContent = tf ? HE.t('transform：{value}', { value: tidy(tf) }) : '';
    });
  }

  function translateControl() {
    const input = styleInput({ id: 'insp-translate', prop: 'translate', undo: HE.t('修改位移'), cls: 'grow', aria: HE.t('位移（X Y）') });
    const reset = textButton('insp-translate-reset', 'refresh', HE.t('重設'));
    reset.title = HE.t('移除位移（例如 Alt+拖曳 產生的位移）');
    reset.addEventListener('click', () => {
      const targets = ids.slice();
      HE.history.transact(HE.t('重設位移'), () => {
        for (const id of targets) {
          const st = { translate: '' };
          if (PURE_TRANSLATE.test(inlineOf(id, 'transform'))) st.transform = '';
          HE.ops.setStyle(id, st);
        }
      });
    });
    onSync(() => {
      reset.disabled = !ids.some((id) => inlineOf(id, 'translate') || PURE_TRANSLATE.test(inlineOf(id, 'transform')));
    });
    return group('row', input, reset);
  }

  /* ---- 屬性 ---- */

  function attrInput(cid, name, targets, undo, emptyRemoves) {
    const input = mk('input', 'input mono', { id: cid, type: 'text', spellcheck: 'false', autocomplete: 'off' });
    wireText(input, (raw) => {
      const v = emptyRemoves && !raw.trim() ? null : raw;
      HE.ops.setAttr(targets.slice(), { [name]: v }, { label: undo });
    }, () => showValue(input, attrOf(primary(), name)));
    onSync(() => { if (!focused(input)) showValue(input, attrOf(primary(), name)); });
    return input;
  }

  function buildAttrs(b) {
    const p = primary();
    const m = model(p);
    if (!m) return;
    const tag = tagOf(m);
    const multi = ids.length > 1;
    const sameTag = ids.filter((id) => tagOf(model(id)) === tag);

    const idIn = mk('input', 'input mono', { id: 'insp-attr-id', type: 'text', spellcheck: 'false', autocomplete: 'off' });
    if (multi) { idIn.disabled = true; idIn.placeholder = HE.t('多選時無法修改'); }
    wireText(idIn, (raw) => {
      const v = raw.trim();
      if (/\s/.test(v)) {
        HE.ui.toast(HE.t('ID 不能包含空白'), { type: 'error' });
        idIn.value = attrOf(p, 'id');
        return;
      }
      const clash = !!v && Array.from(HE.doc.model.querySelectorAll('[id]')).some((e) => e.getAttribute('id') === v && HE.doc.idOf(e) !== p);
      HE.ops.setAttr(p, { id: v || null }, { label: HE.t('修改 ID') });
      if (clash) HE.ui.toast(HE.t('已有其他元素使用「{id}」這個 ID', { id: v }));
    }, () => { idIn.value = attrOf(p, 'id'); });
    onSync(() => { if (!multi && !focused(idIn)) idIn.value = attrOf(p, 'id'); });
    b.append(field('ID', idIn));

    const cls = mk('textarea', 'textarea mono insp-classes', { id: 'insp-attr-class', rows: '2', spellcheck: 'false', autocomplete: 'off' });
    wireText(cls, (raw) => setClassesAll(raw), () => { cls.value = attrOf(primary(), 'class'); });
    onSync(() => { if (!focused(cls)) cls.value = attrOf(primary(), 'class'); });
    b.append(field(HE.t('類別'), cls));
    if (multi) b.append(mk('div', 'field-help', { text: HE.t('新增或移除的類別會套用到每個選取的元素。') }));

    const shown = new Set([HE.ID_ATTR, 'id', 'class']);
    if (tag === 'a') {
      shown.add('href');
      shown.add('target');
      b.append(field(HE.t('連結'), attrInput('insp-attr-href', 'href', sameTag, HE.t('修改連結'), true)));
      const cb = mk('input', null, { type: 'checkbox', id: 'insp-attr-blank' });
      const lab = mk('label', 'insp-check', { for: 'insp-attr-blank' });
      lab.append(cb, document.createTextNode(HE.t('新分頁開啟')));
      cb.addEventListener('change', () => setNewTab(sameTag, cb.checked));
      onSync(() => { cb.checked = attrOf(primary(), 'target') === '_blank'; });
      b.append(group('field', mk('span'), lab));
    }
    if (tag === 'img') {
      shown.add('src');
      shown.add('alt');
      const src = attrInput('insp-attr-src', 'src', sameTag, HE.t('修改圖片網址'), false);
      const up = textButton('insp-img-upload', 'upload', HE.t('上傳圖片'));
      up.addEventListener('click', () => replaceImage(p, { via: 'file' }));
      const url = textButton('insp-img-url', 'link', HE.t('使用網址'), 'ghost');
      url.addEventListener('click', () => replaceImage(p, { via: 'url' }));
      const natural = mk('div', 'field-help');
      onSync(() => {
        const l = HE.live.byId(primary());
        natural.textContent = l && l.naturalWidth ? HE.t('原始尺寸 {w} × {h}', { w: l.naturalWidth, h: l.naturalHeight }) : '';
        natural.hidden = !natural.textContent;
      });
      const crop = textButton('insp-img-crop', 'crop', HE.t('裁切…'), 'ghost');
      crop.addEventListener('click', () => cropDialog(p));
      b.append(field(HE.t('圖片'), group('insp-stack', src, group('row', up, url), group('row', crop), natural), 'insp-attr-src'));
      b.append(field(HE.t('替代文字'), attrInput('insp-attr-alt', 'alt', sameTag, HE.t('修改替代文字'), false)));
    }

    b.append(mk('div', 'insp-subhead', { text: HE.t('其他屬性') }));
    b.append(attrList(shown));
    b.append(attrAddRow());

    const edit = textButton('insp-edit-html', 'code', HE.t('編輯 HTML…'));
    edit.addEventListener('click', () => editHTML(primary()));
    b.append(group('row insp-edit-row', edit));
  }

  /** Every remaining attribute: edit its value or remove it. Rows are rebuilt only when the set of names changes. */
  function attrList(shown) {
    const list = mk('div', 'insp-attrs', { id: 'insp-attr-list' });
    const inputs = new Map();
    let names = null;
    const row = (name) => {
      const safe = name.replace(/[^a-z0-9_-]/gi, '_');
      const input = mk('input', 'input mono', { id: 'insp-attr-v-' + safe, type: 'text', spellcheck: 'false', autocomplete: 'off' });
      wireText(input, (raw) => HE.ops.setAttr(ids.slice(), { [name]: raw }, { label: HE.t('修改屬性') }),
        () => showValue(input, attrOf(primary(), name)));
      const x = iconButton('insp-attr-x-' + safe, 'x', HE.t('移除屬性 {name}', { name }));
      x.addEventListener('click', () => HE.ops.setAttr(ids.slice(), { [name]: null }, { label: HE.t('移除屬性') }));
      inputs.set(name, input);
      const r = mk('div', 'insp-attr-row');
      r.append(mk('label', 'insp-attr-name', { for: input.id, text: name, title: name }), input, x);
      return r;
    };
    onSync(() => {
      const m = model(primary());
      if (!m) return;
      const attrs = Array.from(m.attributes).filter((a) => !shown.has(a.name));
      const next = attrs.map((a) => a.name).join('\n');
      if (next !== names) {
        const a = document.activeElement;
        if (a && list.contains(a) && a.tagName === 'INPUT') return; // keep the row being typed in
        names = next;
        inputs.clear();
        list.replaceChildren();
        if (!attrs.length) list.append(mk('div', 'insp-none', { text: HE.t('沒有其他屬性') }));
        for (const at of attrs) list.append(row(at.name));
      }
      for (const at of attrs) {
        const input = inputs.get(at.name);
        if (input && !focused(input)) showValue(input, at.value);
      }
    });
    return list;
  }

  function attrAddRow() {
    const nameIn = mk('input', 'input mono', { id: 'insp-attr-new-name', type: 'text', placeholder: HE.t('名稱'), spellcheck: 'false', autocomplete: 'off', 'aria-label': HE.t('新屬性名稱') });
    const valueIn = mk('input', 'input mono', { id: 'insp-attr-new-value', type: 'text', placeholder: HE.t('值'), spellcheck: 'false', autocomplete: 'off', 'aria-label': HE.t('新屬性的值') });
    const add = iconButton('insp-attr-add', 'plus', HE.t('新增屬性'), '');
    const doAdd = () => {
      const name = nameIn.value.trim();
      if (!name) { nameIn.focus(); return; }
      if (!/^[^\s"'<>/=\u0000-\u001f]+$/.test(name) || name.toLowerCase() === HE.ID_ATTR) {
        HE.ui.toast(HE.t('屬性名稱無效：{name}', { name }), { type: 'error' });
        nameIn.focus();
        return;
      }
      HE.ops.setAttr(ids.slice(), { [name]: valueIn.value }, { label: HE.t('新增屬性') });
      nameIn.value = '';
      valueIn.value = '';
      nameIn.focus();
    };
    add.addEventListener('click', doAdd);
    nameIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); if (nameIn.value.trim()) valueIn.focus(); }
    });
    valueIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); doAdd(); }
    });
    return group('insp-attr-add', nameIn, valueIn, add);
  }

  /** Apply the class edit made on the primary as a diff, so other selected elements keep their own classes. */
  function setClassesAll(raw) {
    const split = (s) => String(s || '').split(/\s+/).filter(Boolean);
    const p = primary();
    const before = new Set(split(attrOf(p, 'class')));
    const after = new Set(split(raw));
    const targets = ids.slice();
    HE.history.transact(HE.t('修改類別'), () => {
      for (const id of targets) {
        if (id === p) { HE.ops.setClasses(id, Array.from(after).join(' ')); continue; }
        const own = split(attrOf(id, 'class')).filter((c) => after.has(c) || !before.has(c));
        for (const c of after) if (!before.has(c) && !own.includes(c)) own.push(c);
        HE.ops.setClasses(id, own.join(' '));
      }
    });
  }

  function setNewTab(targets, on) {
    HE.history.transact(on ? HE.t('設為新分頁開啟') : HE.t('取消新分頁開啟'), () => {
      for (const id of targets) {
        const rel = attrOf(id, 'rel').split(/\s+/).filter((t) => t && (on || (t !== 'noopener' && t !== 'noreferrer')));
        if (on && !rel.includes('noopener')) rel.push('noopener');
        HE.ops.setAttr(id, { target: on ? '_blank' : null, rel: rel.length ? rel.join(' ') : null });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Document view (nothing selected)                                    */
  /* ------------------------------------------------------------------ */

  function docTitle() {
    const t = HE.doc.head && HE.doc.head.querySelector('title');
    return t ? t.textContent : '';
  }
  function descMeta() {
    if (!HE.doc.head) return null;
    return Array.from(HE.doc.head.querySelectorAll('meta[name]')).find((e) => e.getAttribute('name').toLowerCase() === 'description') || null;
  }
  function setDescription(raw) {
    const v = raw.trim();
    const meta = descMeta();
    const label = HE.t('修改頁面描述');
    if (meta) {
      if (v) HE.ops.setAttr(HE.doc.idOf(meta), { content: v }, { label });
      else HE.ops.remove(HE.doc.idOf(meta), { label });
    } else if (v && HE.doc.head) {
      HE.ops.insertHTML(HE.doc.idOf(HE.doc.head), 'append', '<meta name="description" content="' + HE.util.esc(v) + '">', { label });
    }
  }

  function buildDocumentView() {
    const body = HE.doc.body;
    ids = body ? [HE.doc.idOf(body)] : [];
    const head = mk('div', 'insp-head');
    const title = mk('div', 'insp-title');
    const name = mk('span', 'insp-label');
    title.append(mk('span', 'tag-pill', { text: HE.t('文件') }), name);
    head.append(title, mk('div', 'insp-snippet', { text: HE.t('沒有選取元素：這裡設定整份頁面') }));
    onSync(() => { name.textContent = HE.doc.name; name.title = HE.doc.name; });
    pane.append(head,
      section('doc-page', HE.t('頁面', null, 'section'), true, buildDocPage),
      section('doc-style', HE.t('頁面樣式'), true, buildDocStyle),
      section('doc-motion', HE.t('動態效果'), false, buildDocMotion),
      section('doc-css', HE.t('頁面 CSS'), false, buildDocCss),
      section('doc-html', 'HTML', true, buildDocHtml),
      section('doc-keys', HE.t('快速鍵'), true, buildDocKeys));
  }

  function buildDocPage(b) {
    const t = mk('input', 'input', { id: 'insp-doc-title', type: 'text', autocomplete: 'off', placeholder: HE.t('（沒有標題）') });
    wireText(t, (raw) => HE.ops.setTitle(raw.trim(), { label: HE.t('修改頁面標題') }), () => { t.value = docTitle(); });
    onSync(() => { if (!focused(t)) t.value = docTitle(); });
    b.append(field(HE.t('標題'), t));

    const lang = mk('input', 'input mono', { id: 'insp-doc-lang', type: 'text', list: 'insp-doc-lang-list', spellcheck: 'false', autocomplete: 'off', placeholder: 'zh-Hant' });
    const dl = mk('datalist', null, { id: 'insp-doc-lang-list' });
    for (const [v, t2] of LANGS) dl.append(mk('option', null, { value: v, label: t2 }));
    const root = () => HE.doc.model && HE.doc.model.documentElement;
    wireText(lang, (raw) => {
      const r = root();
      if (r) HE.ops.setAttr(HE.doc.idOf(r), { lang: raw.trim() || null }, { label: HE.t('修改頁面語言') });
    }, () => { lang.value = (root() && root().getAttribute('lang')) || ''; });
    onSync(() => { if (!focused(lang)) lang.value = (root() && root().getAttribute('lang')) || ''; });
    b.append(field(HE.t('語言'), group('insp-stack', lang, dl), 'insp-doc-lang'));

    const desc = mk('textarea', 'textarea', { id: 'insp-doc-desc', rows: '3', placeholder: HE.t('搜尋引擎與分享預覽會顯示這段文字') });
    wireText(desc, setDescription, () => { const m = descMeta(); desc.value = m ? m.getAttribute('content') || '' : ''; });
    onSync(() => {
      if (focused(desc)) return;
      const m = descMeta();
      desc.value = m ? m.getAttribute('content') || '' : '';
    });
    const wrap = mk('div', 'field-stack');
    wrap.append(mk('label', null, { for: 'insp-doc-desc', text: HE.t('描述') }), desc);
    b.append(wrap);
  }

  function buildDocStyle(b) {
    b.append(field(HE.t('背景色'), colorControl({ id: 'insp-doc-bg', prop: 'background-color', label: HE.t('頁面背景色'), undo: HE.t('修改頁面背景色') }), 'insp-doc-bg'));
    b.append(field(HE.t('字體'), fontFamilyControl('insp-doc-font-family'), 'insp-doc-font-family'));
    b.append(field(HE.t('字級'), styleInput({ id: 'insp-doc-font-size', prop: 'font-size', undo: HE.t('修改頁面字級') })));
    b.append(field(HE.t('文字色'), colorControl({ id: 'insp-doc-color', prop: 'color', label: HE.t('頁面文字顏色'), undo: HE.t('修改頁面文字顏色') }), 'insp-doc-color'));
    b.append(mk('div', 'field-help', { text: HE.t('這些設定寫在 <body> 上，頁面中沒有另外設定的元素會跟著改變。') }));
  }

  function buildDocMotion(b) {
    const info = mk('div', 'field-help');
    const removeAll = textButton('insp-doc-fx-remove', 'trash', HE.t('移除全部動態效果'));
    removeAll.addEventListener('click', () => {
      const n = HE.fx ? HE.fx.removeAll() : 0;
      HE.ui.status(n ? HE.t('已移除 {n} 個元素的動態效果（可以復原）', { n }) : HE.t('頁面沒有動態效果'));
    });
    onSync(() => {
      const n = HE.fx ? HE.fx.count() : 0;
      info.textContent = n
        ? HE.t('頁面中有 {n} 個元素使用動態效果。效果只用 CSS，只在預覽模式和匯出的頁面播放，並會配合訪客的「減少動態效果」設定。', { n })
        : HE.t('還沒有元素使用動態效果。選取元素後，在「動態效果」挑選滑鼠懸停、進場或捲動效果。');
      removeAll.disabled = !n;
    });
    b.append(info, group('row', removeAll));
  }

  function buildDocCss(b) {
    const ta = mk('textarea', 'textarea mono insp-css', {
      id: 'insp-doc-css', rows: '10', spellcheck: 'false', autocomplete: 'off', wrap: 'off', 'aria-label': HE.t('頁面 CSS'),
      placeholder: 'h1 { color: #2149c8; }\n.card { border-radius: 12px; }',
    });
    ta.addEventListener('input', () => {
      pendingCss = ta.value;
      clearTimeout(cssTimer);
      cssTimer = setTimeout(flushCss, 400);
    });
    ta.addEventListener('blur', flushCss);
    onSync(() => { if (!focused(ta) && pendingCss == null) ta.value = HE.ops.getHeadStyle('custom'); });
    b.append(ta, mk('div', 'field-help', { text: HE.t('輸入後自動套用，存放在 <head> 的 <style data-he-style="custom"> 裡。') }));
  }
  function flushCss() {
    clearTimeout(cssTimer);
    if (pendingCss == null) return;
    const css = pendingCss;
    pendingCss = null;
    if (HE.doc.model !== builtDoc) return; // typed into a document that has since been replaced
    HE.ops.setHeadStyle('custom', css, { label: HE.t('修改頁面 CSS'), coalesce: 'insp:headcss' });
  }

  function buildDocHtml(b) {
    const edit = textButton('insp-doc-edit-html', 'code', HE.t('編輯整份 HTML…'));
    edit.addEventListener('click', editDocument);
    const stats = mk('div', 'insp-stats');
    const tile = (k) => {
      const t = mk('div', 'insp-stat');
      const v = mk('span', 'insp-stat-v', { text: '—' });
      t.append(v, mk('span', 'insp-stat-k', { text: k }));
      stats.append(t);
      return v;
    };
    const elements = tile(HE.t('元素'));
    const size = tile(HE.t('檔案大小'));
    const images = tile(HE.t('圖片', null, 'count'));
    const links = tile(HE.t('連結', null, 'count'));
    onSync(() => {
      if (!b.parentElement || !b.parentElement.open || !HE.doc.model) return;
      const body = HE.doc.body;
      elements.textContent = String(body ? body.querySelectorAll('*').length : 0);
      size.textContent = HE.util.bytes(byteSize(HE.doc.serialize()));
      images.textContent = String(HE.doc.model.querySelectorAll('img').length);
      links.textContent = String(HE.doc.model.querySelectorAll('a[href]').length);
    });
    b.append(group('row', edit), stats);
  }

  function buildDocKeys(b) {
    const list = mk('ul', 'insp-keys');
    for (const [label, combos, action] of SHORTCUTS) {
      const li = mk('li', 'insp-key');
      const keys = mk('span', 'insp-key-combo');
      combos.forEach((c, i) => {
        if (i) keys.append(mk('span', 'insp-key-or', { text: '/' }));
        keys.append(mk('span', 'kbd', { text: HE.ui.kbd(c) }));
      });
      if (action) keys.append(mk('span', null, { text: '+ ' + action }));
      li.append(mk('span', null, { text: label }), keys);
      list.append(li);
    }
    b.append(list);
  }

  /* ------------------------------------------------------------------ */
  /* Sections, build and refresh                                         */
  /* ------------------------------------------------------------------ */

  function sectionState() { return HE.settings.get('inspector.sections', {}) || {}; }
  function section(key, title, defOpen, build) {
    const d = mk('details', 'section insp-sec', { id: 'insp-sec-' + key });
    const saved = sectionState();
    d.open = key in saved ? !!saved[key] : defOpen;
    const body = mk('div', 'section-body');
    d.append(mk('summary', null, { text: title }), body);
    build(body);
    d.addEventListener('toggle', () => {
      const all = Object.assign({}, sectionState());
      if ((key in all ? !!all[key] : defOpen) === d.open) return;
      all[key] = d.open;
      HE.settings.set('inspector.sections', all);
      if (d.open) scheduleRefresh();
    });
    return d;
  }

  function syncAll() {
    pass = { m: new Map(), c: new Map() };
    try {
      for (const fn of syncs) {
        try { fn(); } catch (err) { console.error('[HE] inspector refresh failed:', err); }
      }
    } finally { pass = null; }
  }

  /** Commit what the user typed in the focused control before the rebuild removes it. */
  function flushFocused() {
    const a = document.activeElement;
    if (!a || !pane || !pane.contains(a) || HE.doc.model !== builtDoc) return;
    const run = commits.get(a);
    if (run) {
      try { run(); } catch (err) { console.error('[HE] inspector commit failed:', err); }
    }
  }

  /** Everything typed but not in the model yet: the focused control, and page CSS still waiting on its debounce. */
  function flush() {
    flushFocused();
    flushCss();
  }

  /**
   * The build also depends on the body id (document view) and the primary's tag (element view).
   * replaceDocument re-ids everything without a selection change, and an op may swap a tag
   * while keeping the id, so refresh() rebuilds when this differs.
   */
  function shape() {
    if (!HE.doc.model) return 'none';
    const sel = HE.sel.ids;
    if (!sel.length) return 'doc:' + (HE.doc.body ? HE.doc.idOf(HE.doc.body) : '');
    return 'el:' + tagOf(HE.doc.byId(sel[sel.length - 1]));
  }

  function rebuild() {
    if (!pane) return;
    flushFocused();
    flushCss();
    const scroll = pane.scrollTop;
    const prevKind = viewKind;
    syncs = [];
    syncDemoBtn = null;
    commits = new WeakMap();
    pane.replaceChildren();
    dirty = false;
    builtFor = selKey();
    builtShape = shape();
    builtDoc = HE.doc.model;
    if (!HE.doc.model) {
      ids = [];
      viewKind = '';
      pane.append(mk('div', 'empty', { text: HE.t('尚未開啟文件') }));
      return;
    }
    const sel = HE.sel.ids.filter((id) => HE.doc.byId(id));
    if (sel.length) {
      ids = sel;
      viewKind = 'element';
      buildElementView();
    } else {
      viewKind = 'doc';
      buildDocumentView();
    }
    syncAll();
    if (viewKind === prevKind) pane.scrollTop = scroll;
  }

  function rebuildOrDefer() {
    if (visible()) rebuild(); else dirty = true;
  }

  /** Refresh values in place (rebuilds instead when what the pane was built for has changed). */
  function refresh() {
    renderCrumbs();
    if (!pane || !visible()) return;
    if (dirty || builtFor !== selKey() || builtShape !== shape()) { rebuild(); return; }
    // ▶ 預覽 changes the element's computed styles (opacity, transform, pseudo-elements) for a moment: keep the
    // values from before it; the refresh when it stops reads the author's again.
    if (HE.fx && HE.fx.demoing) return;
    syncAll();
  }

  function onSelection() {
    renderCrumbs();
    if (!dirty && builtFor === selKey()) { scheduleRefresh(); return; }
    rebuildOrDefer();
  }

  /** Enter/Space on a pane button must activate it, not reach the global shortcuts (Enter = edit text). */
  function guardActivationKeys(e) {
    if ((e.key !== 'Enter' && e.key !== ' ') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('button, summary, a[href], [role="button"]')) e.stopPropagation();
  }

  /* ------------------------------------------------------------------ */
  /* Breadcrumb                                                          */
  /* ------------------------------------------------------------------ */

  function renderCrumbs() {
    if (!crumbs) return;
    const id = HE.sel.primary;
    const m = id ? HE.doc.byId(id) : null;
    const chain = [];
    for (let e = m; e && e.nodeType === 1; e = e.parentElement) {
      chain.unshift(e);
      if (e === HE.doc.body) break;
    }
    const key = chain.map((e) => HE.doc.idOf(e) + ':' + HE.util.label(e)).join('>');
    if (key === crumbKey) return;
    crumbKey = key;
    crumbs.replaceChildren();
    if (!chain.length) return;
    let shown = chain;
    let hidden = [];
    if (chain.length > 6) {
      hidden = chain.slice(1, chain.length - 4);
      shown = [chain[0], null].concat(chain.slice(-4));
    }
    const pick = (cid) => { highlight(null); HE.sel.set([cid]); };
    shown.forEach((e, i) => {
      if (i) crumbs.append(mk('span', 'crumb-sep', { html: HE.ui.icon('chevron-right', 12), 'aria-hidden': 'true' }));
      if (!e) {
        const more = mk('button', 'insp-crumb', { type: 'button', id: 'insp-crumb-more', text: '…', title: HE.t('顯示其他 {n} 層', { n: hidden.length }), 'aria-label': HE.t('顯示其他上層') });
        more.addEventListener('click', () => {
          const r = more.getBoundingClientRect();
          HE.ui.menu(hidden.map((h) => ({ label: HE.util.label(h), onClick: () => pick(HE.doc.idOf(h)) })),
            { x: r.left, y: Math.max(6, r.top - hidden.length * 28 - 12) });
        });
        crumbs.append(more);
        return;
      }
      const cid = HE.doc.idOf(e);
      const text = HE.util.label(e);
      const b = mk('button', 'insp-crumb', { type: 'button', id: 'insp-crumb-' + i, text, title: text });
      if (e === m) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => pick(cid));
      b.addEventListener('mouseenter', () => highlight(cid));
      b.addEventListener('mouseleave', () => highlight(null));
      b.addEventListener('focus', () => highlight(cid));
      b.addEventListener('blur', () => highlight(null));
      crumbs.append(b);
    });
  }

  /* ------------------------------------------------------------------ */
  /* HTML editors                                                        */
  /* ------------------------------------------------------------------ */

  /** Tab indents in code textareas (Shift+Tab still leaves; Esc closes the dialog). */
  function codeKeys(ta) {
    ta.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end');
    });
  }

  /** Put block-level tags on their own indented lines. Leaves anything with raw-text elements untouched. */
  function prettyHTML(src) {
    if (/<(pre|textarea|script|style)[\s>]/i.test(src)) return src;
    const tokens = src.split(/(<[^>]+>)/).filter((t) => t !== '');
    let depth = 0;
    let out = '';
    let afterBlock = false; // a closing tag gets its own line only when block children came before it
    const newline = () => { out = out.replace(/[ \t]+$/, ''); if (out) out += '\n' + '  '.repeat(depth); };
    for (const t of tokens) {
      const m = /^<(\/?)([a-zA-Z][\w-]*)/.exec(t);
      const tag = m ? m[2].toLowerCase() : '';
      if (!m || !BLOCK.has(tag)) {
        out += t;
        if (/\S/.test(t)) afterBlock = false;
        continue;
      }
      if (m[1]) {
        depth = Math.max(0, depth - 1);
        if (afterBlock) newline();
      } else {
        newline();
        if (!VOID_TAGS.has(tag) && !/\/>$/.test(t)) depth++;
      }
      out += t;
      afterBlock = true;
    }
    return out;
  }

  function codeDialog(o) {
    const wrap = mk('div', 'field-stack');
    const ta = mk('textarea', 'textarea mono insp-editor', { id: o.id, spellcheck: 'false', autocomplete: 'off', wrap: 'off', rows: '18' });
    ta.value = o.value;
    codeKeys(ta);
    wrap.append(mk('label', null, { for: o.id, text: o.label }), ta,
      mk('div', 'field-help', { text: o.help }));
    const dlg = HE.ui.modal({
      title: o.title, body: wrap, width: o.width,
      actions: [
        { label: HE.t('取消'), kind: 'ghost' },
        { label: HE.t('套用'), kind: 'primary', onClick: () => o.apply(ta.value) },
      ],
    });
    try { ta.setSelectionRange(0, 0); ta.scrollTop = 0; } catch (e) { /* not rendered yet */ }
    return dlg;
  }

  /** Edit one element's outer HTML (ids stripped). Applying replaces it and selects the first new element. */
  function editHTML(id) {
    const m = HE.doc.byId(id);
    if (!m) return;
    const original = HE.doc.html(id);
    const text = !original.includes('\n') && original.length > 400 ? prettyHTML(original) : original;
    codeDialog({
      id: 'insp-html-editor', title: HE.t('編輯 HTML'), label: HE.util.label(m), value: text, width: 760,
      help: HE.t('按 {key} 套用，Esc 取消。內容會取代這個元素。', { key: HE.ui.kbd('mod+enter') }),
      apply: (value) => {
        if (value === text) return true;
        if (!value.trim()) {
          HE.ui.toast(HE.t('HTML 不能是空的；要刪除元素請用「刪除」'), { type: 'error' });
          return false;
        }
        if (!HE.doc.byId(id)) { HE.ui.toast(HE.t('這個元素已經不存在'), { type: 'error' }); return true; }
        const out = HE.ops.replaceHTML(id, value, { label: HE.t('編輯 HTML') }) || [];
        if (out.length) HE.sel.set([out[0]]); else HE.sel.clear();
        return true;
      },
    });
  }

  function editDocument() {
    if (!HE.doc.model) return;
    const text = HE.doc.serialize();
    codeDialog({
      id: 'insp-doc-html-editor', title: HE.t('編輯整份 HTML'), label: HE.doc.name, value: text, width: 860,
      help: HE.t('按 {key} 套用，Esc 取消。套用後可以用復原還原。', { key: HE.ui.kbd('mod+enter') }),
      apply: (value) => {
        if (value === text) return true;
        if (!value.trim()) { HE.ui.toast(HE.t('HTML 不能是空的'), { type: 'error' }); return false; }
        HE.ops.replaceDocument(value, { label: HE.t('編輯整份 HTML') });
        HE.ui.toast(HE.t('已套用新的 HTML'), { type: 'success' });
        return true;
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Image replacement                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Replace an image. opts.via: 'file' opens the file picker, 'url' asks for an address,
   * otherwise a small dialog offers both (plus drag & drop).
   * <img> gets src (srcset dropped, sibling <source>s of a <picture> removed), <video> gets
   * a poster, anything else gets a background-image.
   */
  function replaceImage(id, opts = {}) {
    if (!HE.doc.byId(id)) return;
    if (opts.via === 'file') { pickImageFile(id); return; }
    if (opts.via === 'url') { promptImageUrl(id); return; }
    const body = mk('div', 'insp-img-choose');
    const drop = mk('div', 'insp-drop', { id: 'insp-img-drop' });
    drop.innerHTML = HE.ui.icon('image', 28);
    drop.append(mk('div', null, { text: HE.t('把圖片檔拖曳到這裡') }));
    const pick = textButton('insp-img-pick', 'upload', HE.t('選擇檔案…'), 'primary');
    pick.setAttribute('autofocus', '');
    const url = textButton('insp-img-url-choose', 'link', HE.t('使用網址…'));
    body.append(drop, group('row insp-img-btns', pick, url),
      mk('div', 'field-help', { text: HE.t('上傳的圖片會內嵌在 HTML 裡；超過 1.5 MB 會讓檔案明顯變大。') }));
    const dlg = HE.ui.modal({ title: HE.t('替換圖片'), body, width: 440, actions: [{ label: HE.t('取消'), kind: 'ghost' }] });
    pick.addEventListener('click', () => { dlg.close(); pickImageFile(id); });
    url.addEventListener('click', () => { dlg.close(); promptImageUrl(id); });
    body.addEventListener('dragover', (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
      e.preventDefault();
      drop.classList.add('is-over');
    });
    body.addEventListener('dragleave', (e) => { if (!body.contains(e.relatedTarget)) drop.classList.remove('is-over'); });
    body.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      e.preventDefault();
      dlg.close();
      readImageFile(id, f);
    });
  }

  function pickImageFile(id) {
    if (!fileInput) {
      fileInput = mk('input', null, { type: 'file', accept: 'image/*', id: 'insp-image-file', tabindex: '-1', 'aria-hidden': 'true' });
      fileInput.hidden = true;
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        const target = imageTarget;
        imageTarget = null;
        fileInput.value = '';
        if (f && target) readImageFile(target, f);
      });
      document.body.append(fileInput);
    }
    imageTarget = id;
    fileInput.click();
  }

  function readImageFile(id, file) {
    if (!/^image\//.test(file.type || '')) { HE.ui.toast(HE.t('請選擇圖片檔'), { type: 'error' }); return; }
    if (file.size > 1.5 * 1024 * 1024) {
      HE.ui.toast(HE.t('這張圖片有 {size}，內嵌後 HTML 檔案會變大', { size: HE.util.bytes(file.size) }), { timeout: 6000 });
    }
    const reader = new FileReader();
    reader.onload = () => applyImage(id, String(reader.result));
    reader.onerror = () => HE.ui.toast(HE.t('讀取圖片失敗'), { type: 'error' });
    reader.readAsDataURL(file);
  }

  function promptImageUrl(id) {
    const m = HE.doc.byId(id);
    if (!m) return;
    const cur = tagOf(m) === 'img' ? m.getAttribute('src') || '' : '';
    HE.ui.prompt(HE.t('圖片網址'), {
      title: HE.t('使用網址'), okLabel: HE.t('套用'), placeholder: 'https://example.com/photo.jpg',
      value: /^data:/i.test(cur) ? '' : cur,
    }).then((v) => {
      const url = v == null ? '' : v.trim();
      if (!url) return;
      if (HE.env.inArtifact && /^https?:/i.test(url)) HE.ui.toast(HE.t('在 Artifact 中，外部網址的圖片可能無法顯示'), { timeout: 5000 });
      applyImage(id, url);
    });
  }

  function applyImage(id, src) {
    const m = HE.doc.byId(id);
    if (!m) { HE.ui.toast(HE.t('找不到要替換的元素'), { type: 'error' }); return; }
    const tag = tagOf(m);
    if (tag === 'img') {
      HE.history.transact(HE.t('替換圖片'), () => {
        HE.ops.setAttr(id, { src, srcset: null }, { label: HE.t('替換圖片') });
        const pic = m.parentElement;
        if (pic && tagOf(pic) === 'picture') {
          const sources = Array.from(pic.children).filter((c) => tagOf(c) === 'source').map((c) => HE.doc.idOf(c)).filter(Boolean);
          if (sources.length) HE.ops.remove(sources);
        }
      });
    } else if (tag === 'video') {
      HE.ops.setAttr(id, { poster: src }, { label: HE.t('替換圖片') });
    } else {
      HE.ops.setStyle(id, { 'background-image': 'url("' + src.replace(/["\\\n]/g, encodeURIComponent) + '")' }, { label: HE.t('替換圖片') });
    }
    HE.ui.status(HE.t('已替換圖片'));
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    pane = document.getElementById('inspector-pane');
    crumbs = document.getElementById('status-breadcrumb');
    scheduleRefresh = HE.util.debounce(refresh, 60);
    if (pane) {
      pane.classList.add('insp');
      pane.addEventListener('keydown', guardActivationKeys);
    }
    if (crumbs) crumbs.addEventListener('keydown', guardActivationKeys);

    HE.on('selection:changed', onSelection);
    HE.on('doc:loaded', () => {
      clearTimeout(cssTimer);
      pendingCss = null;
      crumbKey = null;
      renderCrumbs();
      rebuildOrDefer();
    });
    // Undo/redo and whole-document edits swap the model object but keep its lineage (ids stay meaningful).
    HE.on('doc:render', (e) => { if (e && e.reason !== 'load' && !HE.history.active) builtDoc = HE.doc.model; });
    HE.on('doc:changed', () => scheduleRefresh());
    HE.on('canvas:ready', () => scheduleRefresh());
    HE.on('doc:named', () => scheduleRefresh());
    // 預覽 / 停止預覽: only the button changes while it runs; the values are read again once it stops.
    HE.on('fx:demo', (e) => {
      if (syncDemoBtn) syncDemoBtn();
      if (!(e && e.running)) scheduleRefresh();
    });
    HE.on('tab:changed', (e) => { if (e && e.group === 'right' && e.name === 'design') refresh(); });
    HE.on('ai:busy', (e) => {
      if (!pane) return;
      const busy = !!(e && e.busy);
      pane.inert = busy;
      pane.classList.toggle('insp-busy', busy);
    });
    rebuildOrDefer();
    renderCrumbs();
  }

  /* ------------------------------------------------------------------ */
  /* Crop an image by hand                                               */
  /* ------------------------------------------------------------------ */

  const CROP_MIN = 2; // percent: the smallest side the frame can be dragged to
  // Fixed ratios the frame can keep, width:height in pixels of the image: the landscape ones, then the same upright.
  const CROP_RATIOS = [[1, 1], [4, 3], [3, 2], [16, 9], [3, 4], [2, 3], [9, 16]];

  /** What went wrong, for the user. The operation's own messages are written for the AI. */
  function cropError(err) {
    const code = err && err.code;
    if (code === 'unreadable') return HE.t('瀏覽器不讓編輯器讀取這張圖片（它從其他網站載入），所以不能裁切。請先把圖片嵌入文件。');
    if (code === 'not-loaded') return HE.t('圖片還沒有載入，無法裁切');
    return HE.t('無法裁切這張圖片');
  }

  /**
   * A dialog with the image and a frame to drag: what is inside the frame stays. The frame can keep a ratio
   * (#crop-ratio), and the arrow keys move it or, on a handle, that edge or corner (1% a press, 10% with Shift).
   */
  function cropDialog(id) {
    const m = model(id);
    const l = HE.live.byId(id);
    if (!m || tagOf(m) !== 'img') return;
    if (HE.ai && HE.ai.busy) { HE.ui.status(HE.t('AI 正在修改頁面，請等它完成再編輯。')); return; }
    if (!l || !l.naturalWidth) { HE.ui.toast(HE.t('圖片還沒有載入，無法裁切'), { type: 'error' }); return; }
    const nw = l.naturalWidth, nh = l.naturalHeight;
    const box = { left: 0, top: 0, right: 100, bottom: 100 };

    const wrap = mk('div', 'crop');
    const stage = mk('div', 'crop-stage');
    const pic = mk('img', 'crop-img', { alt: '', draggable: 'false' });
    pic.src = l.currentSrc || l.src;
    const frame = mk('div', 'crop-frame', { id: 'crop-frame', tabindex: '0', role: 'group', 'aria-label': HE.t('裁切範圍。按方向鍵移動') });
    const handleNames = {
      nw: HE.t('左上角'), n: HE.t('上邊'), ne: HE.t('右上角'), e: HE.t('右邊'), se: HE.t('右下角'), s: HE.t('下邊'), sw: HE.t('左下角'), w: HE.t('左邊'),
    };
    for (const h of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      frame.append(mk('span', 'crop-handle', { 'data-h': h, tabindex: '0', role: 'button', 'aria-label': HE.t('{part}。按方向鍵調整', { part: handleNames[h] }) }));
    }
    stage.append(pic, frame);

    // ratio: width / height of the kept part in pixels, or 0 for a free frame.
    let ratio = 0;
    const ratioSel = mk('select', 'select', { id: 'crop-ratio' });
    for (const [value, text] of [['free', HE.t('自由')], ['orig', HE.t('原圖比例')]].concat(CROP_RATIOS.map(([a, b]) => [a + ':' + b, a + ':' + b]))) {
      ratioSel.append(mk('option', null, { value, text }));
    }

    const sides = [['left', HE.t('左')], ['top', HE.t('上')], ['right', HE.t('右')], ['bottom', HE.t('下')]];
    const inputs = {};
    const fields = mk('div', 'crop-fields');
    for (const [side, name] of sides) {
      const input = mk('input', 'input', { id: 'crop-' + side, type: 'number', min: '0', max: '100', step: '0.1', inputmode: 'decimal' });
      inputs[side] = input;
      fields.append(mini(HE.t('{side}（%）', { side: name }), input));
    }
    const size = mk('div', 'field-help', { id: 'crop-size', 'aria-live': 'polite' });
    const reset = textButton('crop-reset', 'undo', HE.t('重設'), 'ghost');
    const help = mk('div', 'field-help', { text: HE.t('拖曳框線或角落，選擇要留下的範圍；也可以輸入百分比。範圍外的部分會從文件裡的圖片移除，按復原可以還原。') });
    const keys = mk('div', 'field-help', { id: 'crop-keys', text: HE.t('鍵盤：按 Tab 移到裁切框或控制點，再按方向鍵移動或調整，每次 1%；加 Shift 每次 10%。') });
    wrap.append(help, stage, field(HE.t('比例'), ratioSel, 'crop-ratio'), fields, keys, group('row crop-foot', size, reset));

    const round = (n) => Math.round(n * 10) / 10;
    /** typing: the input the user is typing in, whose text is left alone. */
    const draw = (typing) => {
      frame.style.left = box.left + '%';
      frame.style.top = box.top + '%';
      frame.style.width = (box.right - box.left) + '%';
      frame.style.height = (box.bottom - box.top) + '%';
      for (const [side] of sides) if (inputs[side] !== typing) inputs[side].value = String(round(box[side]));
      size.textContent = HE.t('裁切後 {w} × {h} px（原本 {ow} × {oh}）', {
        w: Math.max(1, Math.round(nw * (box.right - box.left) / 100)), h: Math.max(1, Math.round(nh * (box.bottom - box.top) / 100)), ow: nw, oh: nh,
      });
    };
    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    // The box is in percent of each side, so a pixel ratio is another number there: its width% / height%.
    const k = () => ratio * nh / nw;

    /** The frame as it was (`from`) moved as a whole by dx, dy percent: it keeps its size and stays inside the image. */
    const moveBox = (from, dx, dy) => {
      const w = from.right - from.left, hh = from.bottom - from.top;
      box.left = clamp(from.left + dx, 0, 100 - w);
      box.top = clamp(from.top + dy, 0, 100 - hh);
      box.right = box.left + w;
      box.bottom = box.top + hh;
    };
    /**
     * Handle `h` of the frame as it was (`from`) moved by dx, dy percent. A free frame moves that edge or corner.
     * With a ratio a corner keeps the opposite corner in place and follows the larger of the two moves (dx or dy); an edge
     * keeps the opposite edge, and the frame stays centred across. Either way it ends inside the image.
     */
    const resizeBox = (h, from, dx, dy) => {
      if (!ratio) {
        if (h.includes('w')) box.left = clamp(from.left + dx, 0, from.right - CROP_MIN);
        if (h.includes('e')) box.right = clamp(from.right + dx, from.left + CROP_MIN, 100);
        if (h.includes('n')) box.top = clamp(from.top + dy, 0, from.bottom - CROP_MIN);
        if (h.includes('s')) box.bottom = clamp(from.bottom + dy, from.top + CROP_MIN, 100);
        return;
      }
      const kk = k();
      const minW = Math.max(CROP_MIN, CROP_MIN * kk);
      const sx = h.includes('e') ? 1 : h.includes('w') ? -1 : 0;
      const sy = h.includes('s') ? 1 : h.includes('n') ? -1 : 0;
      const fw = from.right - from.left, fh = from.bottom - from.top;
      // The fixed point: the opposite corner or edge; across an edge's own axis, the middle of the frame.
      const ax = sx > 0 ? from.left : sx < 0 ? from.right : (from.left + from.right) / 2;
      const ay = sy > 0 ? from.top : sy < 0 ? from.bottom : (from.top + from.bottom) / 2;
      const roomW = sx > 0 ? 100 - ax : sx < 0 ? ax : 2 * Math.min(ax, 100 - ax);
      const roomH = sy > 0 ? 100 - ay : sy < 0 ? ay : 2 * Math.min(ay, 100 - ay);
      let w = sx && (!sy || Math.abs(dx) >= Math.abs(dy * kk)) ? fw + sx * dx : (fh + sy * dy) * kk;
      w = clamp(w, minW, Math.min(roomW, roomH * kk));
      const hh = w / kk;
      box.left = sx > 0 ? ax : sx < 0 ? ax - w : ax - w / 2;
      box.top = sy > 0 ? ay : sy < 0 ? ay - hh : ay - hh / 2;
      box.right = box.left + w;
      box.bottom = box.top + hh;
    };
    /** The largest frame of the chosen ratio the image holds, centred on the frame as it is (moved inside when it must). */
    const fitRatio = () => {
      if (!ratio) return;
      const kk = k();
      const w = Math.min(100, 100 * kk), hh = w / kk;
      const cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
      box.left = clamp(cx - w / 2, 0, 100 - w);
      box.top = clamp(cy - hh / 2, 0, 100 - hh);
      box.right = box.left + w;
      box.bottom = box.top + hh;
    };
    ratioSel.addEventListener('change', () => {
      const v = ratioSel.value;
      const pair = v.split(':').map(Number);
      ratio = v === 'orig' ? nw / nh : pair.length === 2 && pair[0] > 0 && pair[1] > 0 ? pair[0] / pair[1] : 0;
      fitRatio();
      draw();
    });

    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !frame.contains(e.target)) return;
      e.preventDefault();
      const h = e.target.getAttribute('data-h') || '';
      // preventDefault keeps the focus where it was: the arrow keys go on from the part just dragged.
      try { (h ? e.target : frame).focus({ preventScroll: true }); } catch (err) { /* not focusable */ }
      const r = pic.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const from = { x: e.clientX, y: e.clientY, left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      const move = (ev) => {
        const dx = (ev.clientX - from.x) / r.width * 100;
        const dy = (ev.clientY - from.y) / r.height * 100;
        if (!h) moveBox(from, dx, dy); else resizeBox(h, from, dx, dy);
        draw();
      };
      const end = () => {
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerup', end);
        stage.removeEventListener('pointercancel', end);
      };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerup', end);
      stage.addEventListener('pointercancel', end);
    });
    // The arrow keys: the frame moves, a handle moves its edge or corner. An edge ignores the arrows across it.
    stage.addEventListener('keydown', (e) => {
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!dir || e.altKey || e.ctrlKey || e.metaKey || !frame.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 10 : 1;
      const h = e.target.getAttribute('data-h') || '';
      const from = Object.assign({}, box);
      if (!h) moveBox(from, dir[0] * step, dir[1] * step);
      else if ((dir[0] && /[ew]/.test(h)) || (dir[1] && /[ns]/.test(h))) resizeBox(h, from, dir[0] * step, dir[1] * step);
      draw();
    });
    const edgeOf = { left: 'w', right: 'e', top: 'n', bottom: 's' };
    for (const [side] of sides) {
      inputs[side].addEventListener('input', () => {
        const n = parseFloat(inputs[side].value);
        if (!Number.isFinite(n)) return;
        // A typed side is that edge moved to the number; with a ratio the frame follows as it does for a drag.
        const d = n - box[side];
        resizeBox(edgeOf[side], Object.assign({}, box), side === 'left' || side === 'right' ? d : 0, side === 'top' || side === 'bottom' ? d : 0);
        draw(inputs[side]);
      });
      inputs[side].addEventListener('blur', () => draw());
    }
    reset.addEventListener('click', () => {
      Object.assign(box, { left: 0, top: 0, right: 100, bottom: 100 });
      ratio = 0;
      ratioSel.value = 'free';
      draw();
    });
    draw();

    HE.ui.modal({
      title: HE.t('裁切圖片'),
      body: wrap,
      width: 640,
      actions: [
        { label: HE.t('取消'), kind: 'ghost' },
        {
          label: HE.t('裁切'), kind: 'primary',
          onClick: () => {
            if (box.left <= 0 && box.top <= 0 && box.right >= 100 && box.bottom >= 100) return true; // the whole image: nothing to do
            try {
              const r = HE.ops.cropImage(id, box, { label: HE.t('裁切圖片') });
              HE.ui.status(HE.t('已裁切圖片：{w} × {h} px', { w: r.width, h: r.height }));
              return true;
            } catch (err) {
              HE.ui.toast(cropError(err), { type: 'error', timeout: 8000 });
              return false;
            }
          },
        },
      ],
    });
  }

  HE.inspector = { init, refresh, editHTML, replaceImage, cropImage: cropDialog, flush };
})();
