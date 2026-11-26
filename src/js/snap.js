/* Tactile — snap.js: a picture of the edit frame for the AI, without screen sharing or any permission.
 *
 * The live document is cloned and made self-contained: stylesheets, images and fonts become data: URLs,
 * and frames, video and canvas become pictures of themselves or labelled gray boxes. The clone is drawn
 * through an SVG <foreignObject> onto a canvas. Inside an SVG image, vw, vh and media queries resolve
 * against the outer <svg>, so every draw is exactly one viewport with the page shifted under it; taller
 * areas are stitched from viewport-high slices. Effects and animations show at rest, and fixed elements
 * where they sit with the page scrolled to the top, as in a full-page screenshot.
 *
 *   HE.snap = {probe(), capture({ids, maxEdge, quality}), page(doc, {pixelRatio}), area(doc, rect, {pixelRatio}), regionFor(ids)}
 *   capture -> {dataUrl, base64, mediaType, width, height, scale, rect: {x, y, w, h} (page CSS px),
 *               viewport: {w, h}, cut (the area continues below), missing: [what became gray boxes],
 *               blob()}
 *   page    -> the same, for the whole of any same-origin document that is laid out, as a PNG (the export).
 *   area    -> {width, height, scale, missing, skipped, blob(type, quality)} for one rect of such a document.
 */
(function () {
  'use strict';
  const HE = window.HE;
  const t = HE.t;

  const MAX_FETCH_BYTES = 16 * 1024 * 1024; // per capture; fonts and images past it are left out
  const FETCH_TIMEOUT = 8000;
  const CACHE_BYTES = 48 * 1024 * 1024;
  const PAD = 32;
  // A whole page as one canvas: Chromium refuses a side past 16384 px, and 48 million pixels are 192 MB of RGBA.
  const MAX_SIDE = 16384;
  const MAX_PIXELS = 48e6;
  const FREEZE_CSS = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // The page's style sheets are inside the drawing, so a rule of the page for svg (svg { position: absolute }) would
  // also reach the <svg> the page is drawn in, and move or resize the whole picture.
  const ROOT_STYLE = ['position:static', 'inset:auto', 'margin:0', 'padding:0', 'border:0', 'float:none', 'transform:none', 'translate:none',
    'rotate:none', 'scale:none', 'max-width:none', 'max-height:none', 'min-width:0', 'min-height:0', 'opacity:1', 'filter:none',
    'visibility:visible', 'box-sizing:content-box'].map((d) => d + '!important').join(';');
  const STAND_IN = 'data-he-snap';
  const EMBEDS = 'iframe, video, canvas, object, embed';
  // XML would reject attribute names like Vue's @click or :class, and with them the whole picture.
  const XML_NAME = /^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?$/;

  /* ------------------------------------------------------------------ */
  /* Resources as data: URLs, cached across captures                     */
  /* ------------------------------------------------------------------ */

  const cache = new Map(); // absolute URL -> Promise<{data, bytes} | null>
  let cacheBytes = 0;

  function readAsDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  function absolute(url, base) {
    try { return new URL(url, base).href; } catch (e) { return null; }
  }
  async function download(abs, asText) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
    try {
      const res = await fetch(abs, { mode: 'cors', credentials: 'omit', signal: ctl.signal });
      if (!res.ok) return null;
      if (asText) { const text = await res.text(); return { data: text, bytes: text.length }; }
      const blob = await res.blob();
      return { data: await readAsDataURL(blob), bytes: blob.size };
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  /** Fetch once per URL; a capture stops fetching new files once it has used its byte budget. */
  function fetched(abs, run, asText) {
    if (!abs) return Promise.resolve(null);
    if (/^data:/i.test(abs)) return Promise.resolve(asText ? null : abs);
    const key = (asText ? 't:' : 'b:') + abs;
    let p = cache.get(key);
    if (!p) {
      if (run.bytes > MAX_FETCH_BYTES) { run.skipped = true; return Promise.resolve(null); }
      p = download(abs, asText).then((hit) => {
        if (hit) {
          cacheBytes += hit.bytes;
          if (cacheBytes > CACHE_BYTES) { cache.clear(); cacheBytes = 0; }
        }
        return hit;
      });
      cache.set(key, p);
    }
    return p.then((hit) => {
      if (!hit) return null;
      run.bytes += hit.bytes;
      return hit.data;
    });
  }

  /* ------------------------------------------------------------------ */
  /* CSS: inline url() and @import, drop font subsets the page never uses */
  /* ------------------------------------------------------------------ */

  const URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const IMPORT_RE = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)[^;]*;/g;
  const FONT_FACE_RE = /@font-face\s*\{[^}]*\}/g;

  function parseRanges(text) {
    const out = [];
    for (const part of String(text).split(',')) {
      const m = /u\+([0-9a-f?]+)(?:-([0-9a-f]+))?/i.exec(part.trim());
      if (!m) continue;
      if (m[1].includes('?')) out.push([parseInt(m[1].replace(/\?/g, '0'), 16), parseInt(m[1].replace(/\?/g, 'f'), 16)]);
      else out.push([parseInt(m[1], 16), parseInt(m[2] || m[1], 16)]);
    }
    return out;
  }
  function usesRange(chars, ranges) {
    for (const [a, b] of ranges) {
      if (b - a < chars.size) { for (let c = a; c <= b; c++) if (chars.has(c)) return true; }
      else { for (const c of chars) if (c >= a && c <= b) return true; }
    }
    return false;
  }

  async function inlineCss(css, base, run, depth) {
    let text = String(css || '');
    if (depth < 3 && text.includes('@import')) {
      const parts = [];
      for (const m of text.matchAll(IMPORT_RE)) parts.push(m);
      const bodies = await Promise.all(parts.map(async (m) => {
        const abs = absolute(m[2] || m[4], base);
        const sub = await fetched(abs, run, true);
        return sub == null ? '' : inlineCss(sub, abs, run, depth + 1);
      }));
      let i = 0;
      text = text.replace(IMPORT_RE, () => bodies[i++] || '');
    }
    // A CJK web font ships as dozens of unicode-range subsets: keep only those the page's text needs.
    if (run.chars && text.includes('@font-face')) {
      text = text.replace(FONT_FACE_RE, (rule) => {
        const m = /unicode-range\s*:\s*([^;}]+)/i.exec(rule);
        return !m || usesRange(run.chars, parseRanges(m[1])) ? rule : '';
      });
    }
    const urls = new Set();
    for (const m of text.matchAll(URL_RE)) if (!/^(data:|#|about:)/i.test(m[2].trim())) urls.add(m[2].trim());
    if (!urls.size) return text;
    const map = new Map();
    await Promise.all([...urls].map(async (u) => {
      const data = await fetched(absolute(u, base), run, false);
      if (data) map.set(u, data);
    }));
    return text.replace(URL_RE, (all, q, u) => (map.has(u.trim()) ? 'url("' + map.get(u.trim()) + '")' : all));
  }

  function sheetText(link) {
    try {
      const rules = link.sheet && link.sheet.cssRules;
      if (rules) return Array.from(rules, (r) => r.cssText).join('\n');
    } catch (e) { /* cross-origin without CORS: fetch it instead */ }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Stand-ins for what an SVG image cannot paint                        */
  /* ------------------------------------------------------------------ */

  // A stand-in takes the box of the element it replaces, whatever the page's selectors say about its own tag.
  const LAYOUT = ['display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'z-index', 'box-sizing',
    'width', 'height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right',
    'padding-bottom', 'padding-left', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
    'vertical-align', 'transform', 'transform-origin', 'opacity', 'grid-area', 'flex', 'align-self', 'justify-self',
    'order', 'object-fit', 'object-position', 'aspect-ratio'];

  function pin(liveEl, node) {
    const cs = liveEl.ownerDocument.defaultView.getComputedStyle(liveEl);
    for (const prop of LAYOUT) node.style.setProperty(prop, cs.getPropertyValue(prop), 'important');
    return node;
  }
  function boxImage(w, h, label) {
    const text = String(label).replace(/[<&>"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' })[c]);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="' + SVG_NS + '" width="' + Math.max(1, Math.round(w)) + '" height="' + Math.max(1, Math.round(h)) + '">' +
      '<rect x=".5" y=".5" width="99%" height="99%" fill="#e5e7eb" stroke="#9ca3af" stroke-dasharray="4 3"/>' +
      '<text x="8" y="18" font-family="sans-serif" font-size="12" fill="#4b5563">' + text + '</text></svg>');
  }
  function hostOf(url, base) {
    try { return new URL(url, base).host; } catch (e) { return ''; }
  }
  /** A same-origin <img> that fetch() could not read (blob: under a strict CSP, a file:// page…) may still draw. */
  function drawnImage(img) {
    if (!img.complete || !img.naturalWidth) return null;
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  async function replaceEmbeds(doc, root, run) {
    const live = Array.from(doc.querySelectorAll(EMBEDS)).filter((el) => !el.parentElement || !el.parentElement.closest(EMBEDS));
    const copy = Array.from(root.querySelectorAll(EMBEDS)).filter((el) => !el.parentElement || !el.parentElement.closest(EMBEDS));
    for (let i = 0; i < live.length && i < copy.length; i++) {
      const L = live[i];
      const tag = L.tagName;
      let src = null;
      try {
        if (tag === 'CANVAS') src = L.toDataURL('image/png');
        else if (tag === 'VIDEO') {
          if (L.readyState >= 2 && L.videoWidth) {
            const c = document.createElement('canvas');
            c.width = L.videoWidth;
            c.height = L.videoHeight;
            c.getContext('2d').drawImage(L, 0, 0);
            src = c.toDataURL('image/jpeg', 0.85);
          } else if (L.poster) {
            src = await fetched(absolute(L.poster, doc.baseURI), run, false);
          }
        } else if (tag === 'IFRAME' && run.depth < 2 && L.contentDocument && L.contentDocument.body) {
          const inner = await render(L.contentDocument, null, { depth: run.depth + 1, bytes: run.bytes, chars: null, type: 'image/png' });
          src = inner.dataUrl;
          run.missing.push(...inner.missing);
        }
      } catch (e) {
        src = null; // tainted or cross-origin: a labelled box instead
      }
      const r = L.getBoundingClientRect();
      const img = doc.createElement('img');
      img.setAttribute(STAND_IN, '');
      if (src) {
        img.setAttribute('src', src);
      } else {
        const host = hostOf(L.getAttribute('src') || L.getAttribute('data') || '', doc.baseURI);
        const what = tag === 'VIDEO' ? t('影片') : tag === 'CANVAS' ? t('畫布') : t('嵌入內容');
        run.missing.push((tag === 'VIDEO' ? 'video' : tag === 'CANVAS' ? 'canvas' : 'embedded frame') + (host ? ' from ' + host : ''));
        img.setAttribute('src', boxImage(r.width, r.height, host ? t('{what}：{host}', { what, host }) : what));
      }
      pin(L, img);
      if (tag === 'VIDEO') {
        img.style.setProperty('background', '#000', 'important');
        if (img.style.getPropertyValue('object-fit') === 'fill') img.style.setProperty('object-fit', 'contain', 'important');
      }
      copy[i].replaceWith(img);
    }
  }

  async function inlineImages(doc, root, run) {
    root.querySelectorAll('picture > source').forEach((s) => s.remove());
    // The page's own images, in document order on both sides (the stand-ins made above are not among them).
    const live = Array.from(doc.querySelectorAll('img')).filter((i) => !i.closest(EMBEDS));
    const copy = Array.from(root.querySelectorAll('img')).filter((i) => !i.hasAttribute(STAND_IN));
    await Promise.all(copy.map(async (img, i) => {
      const L = live[i];
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.removeAttribute('loading');
      if (!L) return;
      const src = L.currentSrc || L.getAttribute('src') || '';
      if (!src) return;
      const data = (await fetched(absolute(src, doc.baseURI), run, false)) || drawnImage(L);
      if (data) { img.setAttribute('src', data); return; }
      if (!L.complete || !L.naturalWidth) return; // broken on the page too: leave it broken
      const r = L.getBoundingClientRect();
      const host = hostOf(src, doc.baseURI);
      run.missing.push('image' + (host ? ' from ' + host : ''));
      const from = L.alt || host;
      img.setAttribute('src', boxImage(r.width, r.height, from ? t('圖片無法擷取：{from}', { from }) : t('圖片無法擷取')));
      pin(L, img);
    }));
  }

  async function inlineStyles(doc, root, run) {
    const base = doc.baseURI;
    const live = Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href]'));
    const copy = Array.from(root.querySelectorAll('link[rel~="stylesheet"][href]'));
    await Promise.all(copy.map(async (link, i) => {
      const L = live[i];
      if (L && L.sheet && L.sheet.disabled) { link.remove(); return; }
      const href = absolute(link.getAttribute('href'), base);
      let text = L ? sheetText(L) : null;
      if (text == null) text = await fetched(href, run, true);
      if (text == null) { run.missing.push('stylesheet' + (href ? ' ' + hostOf(href) : '')); link.remove(); return; }
      const st = doc.createElement('style');
      if (link.getAttribute('media')) st.setAttribute('media', link.getAttribute('media'));
      st.textContent = await inlineCss(text, href || base, run, 0);
      link.replaceWith(st);
    }));
    root.querySelectorAll('link').forEach((l) => l.remove());
    await Promise.all(Array.from(root.querySelectorAll('style')).map(async (st) => {
      st.textContent = await inlineCss(st.textContent, base, run, 0);
    }));
    await Promise.all(Array.from(root.querySelectorAll('[style*="url("]')).map(async (el) => {
      el.setAttribute('style', await inlineCss(el.getAttribute('style'), base, run, 0));
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  function textChars(doc) {
    const chars = new Set();
    for (let c = 0x20; c < 0x7f; c++) chars.add(c);
    const text = (doc.body && doc.body.textContent) || '';
    for (const ch of text) chars.add(ch.codePointAt(0));
    return chars;
  }

  async function build(doc, run) {
    const root = doc.documentElement.cloneNode(true);
    await replaceEmbeds(doc, root, run);
    root.querySelectorAll('script, noscript, template').forEach((n) => n.remove());
    const freeze = doc.createElement('style');
    freeze.textContent = FREEZE_CSS;
    (root.querySelector('head') || root).append(freeze);
    await inlineStyles(doc, root, run);
    await inlineImages(doc, root, run);
    for (const el of root.querySelectorAll('*')) {
      for (const a of Array.from(el.attributes)) if (!XML_NAME.test(a.name)) el.removeAttribute(a.name);
    }
    return root;
  }

  function isClear(color) { return /^(transparent|rgba\(0, 0, 0, 0\))$/.test(String(color).trim()); }

  function loadImage(src) {
    const img = new Image();
    img.decoding = 'sync';
    img.src = src;
    if (img.decode) return img.decode().then(() => img);
    return new Promise((resolve, reject) => { img.onload = () => resolve(img); img.onerror = reject; });
  }

  /**
   * Render `rect` (page CSS px; null: what is on screen) of `doc` to a canvas.
   * run: {depth, bytes, chars, type, quality, maxEdge}
   */
  async function render(doc, rect, run) {
    run.missing = run.missing || [];
    run.bytes = run.bytes || 0;
    const win = doc.defaultView;
    const de = doc.documentElement;
    const vw = de.clientWidth;
    const vh = de.clientHeight;
    const fullH = Math.max(de.scrollHeight, vh);
    // vw and media queries count the page's scrollbar in (10px where it takes room), so the <svg> is as wide as the
    // window; the page is laid out in the width that is left, and the strip of the scrollbar falls off the canvas.
    const sw = Math.max(vw, win.innerWidth || 0);
    const r = rect || { x: win.scrollX, y: win.scrollY, w: vw, h: vh };
    const root = await build(doc, run);
    // The page paints its root (or body, when the root has none) background across the whole canvas.
    const hcs = win.getComputedStyle(de);
    const bcs = doc.body ? win.getComputedStyle(doc.body) : hcs;
    const bg = isClear(hcs.backgroundColor) && hcs.backgroundImage === 'none' ? bcs : hcs;
    root.style.setProperty('background-color', bg.backgroundColor);
    root.style.setProperty('background-image', bg.backgroundImage);
    root.style.setProperty('min-height', fullH + 'px');
    const body = root.querySelector('body');
    if (bg === bcs && body) body.style.setProperty('background', 'transparent');
    const xhtml = new XMLSerializer().serializeToString(root).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    const scale = run.scale || Math.min(1, run.maxEdge ? run.maxEdge / Math.max(r.w, r.h) : 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(r.w * scale));
    canvas.height = Math.max(1, Math.round(r.h * scale));
    const g = canvas.getContext('2d');
    g.fillStyle = isClear(bg.backgroundColor) ? '#ffffff' : bg.backgroundColor;
    g.fillRect(0, 0, canvas.width, canvas.height);
    for (let top = r.y; top < r.y + r.h; top += vh) {
      const svg = '<svg xmlns="' + SVG_NS + '" width="' + sw + '" height="' + vh + '" style="' + ROOT_STYLE + '"><foreignObject x="0" y="' + (-top) +
        '" width="' + vw + '" height="' + fullH + '">' + xhtml + '</foreignObject></svg>';
      const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      g.drawImage(img, Math.round(-r.x * scale), Math.round((top - r.y) * scale), Math.round(sw * scale), Math.round(vh * scale));
    }
    const type = run.type || 'image/jpeg';
    const dataUrl = canvas.toDataURL(type, run.quality || 0.9); // throws where the browser taints foreignObject drawings
    return { canvas, dataUrl, type, scale, rect: r, vw, vh, missing: run.missing, skipped: !!run.skipped };
  }

  /** The area to show for a change: the changed elements with some margin, one to two viewports high, full width. */
  function regionFor(ids) {
    const doc = HE.live && HE.live.doc;
    if (!doc || !doc.documentElement) return null;
    const win = doc.defaultView;
    const de = doc.documentElement;
    const vw = de.clientWidth;
    const vh = de.clientHeight;
    const fullH = Math.max(de.scrollHeight, vh);
    let top = Infinity;
    let bottom = -Infinity;
    for (const id of ids || []) {
      const el = HE.live.byId(id);
      if (!el || !el.getBoundingClientRect || el === doc.body || el === de) continue;
      const b = el.getBoundingClientRect();
      if (!b.width && !b.height) continue;
      top = Math.min(top, b.top + win.scrollY);
      bottom = Math.max(bottom, b.bottom + win.scrollY);
    }
    if (!isFinite(top)) return { x: 0, y: Math.round(win.scrollY), w: vw, h: vh, cut: false };
    let y0 = Math.max(0, top - PAD);
    let y1 = Math.min(fullH, bottom + PAD);
    if (y1 - y0 < vh) {
      const mid = (y0 + y1) / 2;
      y0 = Math.max(0, Math.min(fullH - vh, mid - vh / 2));
      y1 = Math.min(fullH, y0 + vh);
    }
    const cut = y1 - y0 > 2 * vh;
    if (cut) y1 = y0 + 2 * vh;
    return { x: 0, y: Math.round(y0), w: vw, h: Math.round(y1 - y0), cut };
  }

  /**
   * A JPEG of the edit frame around `ids` (or what is on screen). Rejects where the browser will not let a
   * page read back a drawing of HTML (some Safari versions), or when no document is showing.
   */
  async function capture(opts = {}) {
    const doc = HE.live && HE.live.doc;
    if (!doc || !doc.documentElement || !doc.body) throw new Error('No page is showing.');
    const region = regionFor(opts.ids || []);
    const rect = { x: region.x, y: region.y, w: region.w, h: region.h };
    const run = { depth: 0, bytes: 0, chars: textChars(doc), type: 'image/jpeg', quality: opts.quality || 0.9, maxEdge: opts.maxEdge || 1568 };
    return result(await render(doc, rect, run), rect, region.cut, run);
  }

  function result(out, rect, cut, run) {
    const comma = out.dataUrl.indexOf(',');
    return {
      dataUrl: out.dataUrl,
      base64: out.dataUrl.slice(comma + 1),
      mediaType: out.type,
      width: out.canvas.width,
      height: out.canvas.height,
      scale: out.scale,
      rect,
      viewport: { w: out.vw, h: out.vh },
      cut,
      missing: Array.from(new Set(out.missing)),
      skipped: out.skipped,
      blob: () => new Promise((resolve, reject) => out.canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image.'))), out.type, run.quality)),
    };
  }

  /** Device pixels per CSS pixel for a w x h page: `want` when the canvas can hold it, else 1, else what fits. */
  function pageScale(w, h, vh, want) {
    for (const s of [want, 1]) {
      if (s >= 1 && w * s <= MAX_SIDE && h * s <= MAX_SIDE && w * h * s * s <= MAX_PIXELS) return s;
    }
    const s = Math.min(MAX_SIDE / w, MAX_SIDE / h, Math.sqrt(MAX_PIXELS / (w * h)));
    // Slices are one viewport high: a whole number of pixels each, so they meet without a seam.
    return Math.max(1, Math.floor(vh * s)) / vh;
  }

  /**
   * A PNG of the whole page of `doc`: its full height at its viewport width, from the top. `doc` is any
   * same-origin document that is laid out (the export draws a clean copy of the model, not the edit frame).
   * `pixelRatio` (default 2) is lowered for pages the canvas could not hold; `scale` in the result says to what.
   */
  async function page(doc, opts = {}) {
    const de = doc && doc.documentElement;
    if (!de || !doc.body || !de.clientWidth || !de.clientHeight) throw new Error('No page is showing.');
    const vw = de.clientWidth;
    const vh = de.clientHeight;
    const rect = { x: 0, y: 0, w: vw, h: Math.max(de.scrollHeight, vh) };
    const run = { depth: 0, bytes: 0, chars: textChars(doc), type: 'image/png', scale: pageScale(rect.w, rect.h, vh, opts.pixelRatio || 2) };
    return result(await render(doc, rect, run), rect, false, run);
  }

  /**
   * A picture of one area of `doc` (`rect`: {x, y, w, h} in page CSS px), for an export that cuts a page into parts
   * (the slides of a deck). The result is not encoded yet: blob(type, quality) writes it as a PNG or a JPEG.
   */
  async function area(doc, rect, opts = {}) {
    const de = doc && doc.documentElement;
    if (!de || !doc.body || !de.clientWidth || !de.clientHeight) throw new Error('No page is showing.');
    const r = { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.max(1, Math.round(rect.w)), h: Math.max(1, Math.round(rect.h)) };
    const run = { depth: 0, bytes: 0, chars: textChars(doc), type: 'image/png', scale: pageScale(r.w, r.h, de.clientHeight, opts.pixelRatio || 2) };
    const out = await render(doc, r, run);
    return {
      width: out.canvas.width,
      height: out.canvas.height,
      scale: out.scale,
      missing: Array.from(new Set(out.missing)),
      skipped: out.skipped,
      blob: (type, quality) => new Promise((resolve, reject) => out.canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image.'))), type || 'image/png', quality)),
    };
  }

  let probed = null;
  /** Whether this browser lets the page read back an HTML drawing (false where it taints the canvas). */
  function probe() {
    if (!probed) {
      probed = (async () => {
        try {
          if (typeof XMLSerializer !== 'function' || !document.createElement('canvas').getContext) return false;
          const svg = '<svg xmlns="' + SVG_NS + '" width="4" height="4"><foreignObject width="4" height="4">' +
            '<div xmlns="http://www.w3.org/1999/xhtml" style="width:4px;height:4px;background:#000"></div></foreignObject></svg>';
          const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
          const c = document.createElement('canvas');
          c.width = 4;
          c.height = 4;
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0);
          c.toDataURL('image/png');
          return g.getImageData(1, 1, 1, 1).data[3] > 0;
        } catch (e) {
          return false;
        }
      })();
    }
    return probed;
  }

  HE.snap = { probe, capture, page, area, regionFor };
})();
