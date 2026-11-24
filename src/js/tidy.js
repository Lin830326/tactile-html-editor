/* Tactile — tidy.js: make a document smaller or cleaner before it is passed on.
 *
 * *   壓縮內嵌圖片   re-encodes the pictures an <img> keeps in the document as a data: URL. One undo step.
 * *   清理後匯出     downloads a copy without comments, script, generator marks or provenance. The document in the
 * *                  editor does not change.
 *
 *   HE.tidy = {images(), compressImages(opts), compressDialog(), cleanHtml(opts), cleanDialog()}
 */
(function () {
  'use strict';
  const HE = window.HE;
  const ID = HE.ID_ATTR;
  const h = HE.ui.h;
  const t = HE.t;

  /* ------------------------------------------------------------------ */
  /* Embedded pictures                                                   */
  /* ------------------------------------------------------------------ */

  // GIF may be an animation and SVG is not pixels: neither is touched.
  const DATA_IMG = /^data:image\/(png|jpe?g|webp|bmp)(;[^,]*)?;base64,/i;
  const MIN_BYTES = 20 * 1024;
  const MAX_PIXELS = 32 * 1024 * 1024;
  // A picture is replaced only when the new one is at least this much smaller.
  const WORTH = 0.9;
  const SIDES = [[0, t('不縮小')], ...[2560, 1920, 1280].map((n) => [n, t('最長邊 {n} px', { n })])];
  const QUALITIES = [[0.9, t('高')], [0.8, t('中')], [0.65, t('低')]];

  function dataBytes(url) {
    const n = url.length - url.indexOf(',') - 1;
    return Math.floor(n * 3 / 4);
  }

  /** The pictures that can be compressed: [{id, type, bytes}]. An <img> with srcset or in a <picture> may show another file, so it is left out. */
  function images() {
    const out = [];
    const body = HE.doc.body;
    if (!body) return out;
    for (const el of body.querySelectorAll('img[src]')) {
      const id = el.getAttribute(ID);
      const src = el.getAttribute('src') || '';
      const m = DATA_IMG.exec(src);
      if (!id || !m || el.hasAttribute('srcset') || HE.util.tag(el.parentElement) === 'picture') continue;
      const bytes = dataBytes(src);
      if (bytes < MIN_BYTES) continue;
      out.push({ id, type: m[1].toLowerCase().replace('jpg', 'jpeg'), bytes });
    }
    return out;
  }

  function toDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  /**
   * `src` drawn again, its longest side at most `maxSide` px (0: same size): {url, bytes, scaled}, or null when
   * the browser cannot do it. A picture with transparent parts becomes WebP, any other JPEG.
   */
  async function encode(src, maxSide, quality) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const w = img.naturalWidth, hh = img.naturalHeight;
    if (!w || !hh) return null;
    const k = maxSide ? Math.min(1, maxSide / Math.max(w, hh)) : 1;
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(hh * k));
    if (cw * ch > MAX_PIXELS) return null;
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, cw, ch);
    let alpha = false;
    if (!/^data:image\/jpe?g/i.test(src)) {
      const data = ctx.getImageData(0, 0, cw, ch).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 250) { alpha = true; break; }
    }
    if (!alpha) {
      // JPEG has no transparency: what is left of it would turn black.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
    }
    const type = alpha ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise((resolve) => c.toBlob(resolve, type, quality));
    // A browser that cannot write the type answers with a PNG.
    if (!blob || blob.type !== type) return null;
    return { url: await toDataUrl(blob), bytes: blob.size, scaled: k < 1 };
  }

  /**
   * Whether the picture keeps its place and size on the page with the smaller file. An <img> without a set size
   * takes the file's own size, so a smaller file would change the layout: tried in the edit frame, then put back.
   */
  async function sameLayout(id, oldSrc, newSrc) {
    const l = HE.live.byId(id);
    if (!l || HE.util.tag(l) !== 'img') return false;
    const a = l.getBoundingClientRect();
    if (!a.width || !a.height) return false;
    // decode() alone is not enough: Firefox resolves it before the element has taken the new file's size, and the
    // old box would be measured. The load event comes once the element shows the new file.
    const show = async (src) => {
      const loaded = new Promise((resolve) => {
        const done = () => { l.removeEventListener('load', done); l.removeEventListener('error', done); clearTimeout(timer); resolve(); };
        const timer = setTimeout(done, 5000);
        l.addEventListener('load', done);
        l.addEventListener('error', done);
      });
      l.setAttribute('src', src);
      await loaded;
      await l.decode();
    };
    let same = false;
    try {
      await show(newSrc);
      const b = l.getBoundingClientRect();
      same = Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1;
    } catch (err) {
      same = false;
    }
    try { await show(oldSrc); } catch (err) { /* the original always decoded before */ }
    return same;
  }

  /**
   * Compress every picture of images(). opts: {maxSide (px, 0 = keep the size; default 1920), quality (0–1; default
   * 0.8), onProgress(done, total)}. Resolves {total, changed, kept, before, after} (bytes of the pictures).
   */
  async function compressImages(opts = {}) {
    const maxSide = opts.maxSide === undefined ? 1920 : Math.max(0, Number(opts.maxSide) || 0);
    const quality = Math.min(1, Math.max(0.1, Number(opts.quality) || 0.8));
    const list = images();
    const res = { total: list.length, changed: 0, kept: 0, before: 0, after: 0 };
    const done = [];
    let n = 0;
    for (const it of list) {
      const m = HE.doc.byId(it.id);
      const src = m ? m.getAttribute('src') : '';
      let out = null;
      try {
        if (src) out = await encode(src, maxSide, quality);
        if (out && out.scaled && !(await sameLayout(it.id, src, out.url))) out = await encode(src, 0, quality);
      } catch (err) {
        console.warn('[HE] tidy: a picture could not be compressed', err);
        out = null;
      }
      res.before += it.bytes;
      if (out && out.bytes < it.bytes * WORTH) { done.push({ id: it.id, src, url: out.url }); res.after += out.bytes; res.changed++; }
      else { res.after += it.bytes; res.kept++; }
      if (opts.onProgress) opts.onProgress(++n, list.length);
    }
    const still = done.filter((d) => { const m = HE.doc.byId(d.id); return m && m.getAttribute('src') === d.src; });
    if (still.length) HE.history.transact(t('壓縮內嵌圖片'),() => { for (const d of still) HE.ops.setAttr(d.id, { src: d.url }); });
    return res;
  }

  function busy() {
    if (!HE.doc.model) { HE.ui.toast(t('目前沒有文件')); return true; }
    if (HE.ai && HE.ai.busy) { HE.ui.toast(t('AI 助理正在修改文件，請等它完成後再試'), { type: 'error' }); return true; }
    const c = HE.canvas;
    if (c && c.isEditingText && c.isEditingText()) c.endTextEdit(true);
    return false;
  }

  function select(id, label, options, value) {
    const wrap = h('div', 'field');
    const lab = h('label');
    lab.textContent = label;
    lab.htmlFor = id;
    const s = h('select');
    s.id = id;
    for (const [v, text] of options) {
      const o = h('option');
      o.value = String(v);
      o.textContent = text;
      if (v === value) o.selected = true;
      s.append(o);
    }
    wrap.append(lab, s);
    return { wrap, input: s };
  }

  function compressDialog() {
    if (busy()) return;
    const list = images();
    if (!list.length) {
      HE.ui.toast(t('這份文件沒有可以壓縮的內嵌圖片。只壓縮 img 元素裡 20 KB 以上的 PNG、JPEG、WebP、BMP。'));
      return;
    }
    const total = list.reduce((sum, it) => sum + it.bytes, 0);
    const body = h('div', 'field-stack tidy-dialog');
    const say = h('p', 'tidy-say');
    say.textContent = t('這份文件有 {n} 張內嵌圖片，共 {size}。', { n: list.length, size: HE.util.bytes(total) });
    const side = select('tidy-side', t('尺寸'), SIDES, 1920);
    const quality = select('tidy-quality', t('畫質'), QUALITIES, 0.8);
    const progress = h('p', 'tidy-progress');
    progress.setAttribute('role', 'status');
    body.append(
      say, side.wrap, quality.wrap,
      h('p', 'field-help', t('壓縮會損失畫質，文字截圖的邊緣可能變模糊。有透明區域的圖轉成 WebP，其他轉成 JPEG。')),
      h('p', 'field-help', t('如果縮小尺寸會改變版面，那張圖維持原本的尺寸。壓縮後沒有變小的圖維持原樣。')),
      h('p', 'field-help', t('不壓縮：GIF、SVG、CSS 背景圖、連到外部檔案的圖。整個動作算 1 個復原步驟。')),
      progress,
    );
    let running = false;
    const modal = HE.ui.modal({
      title: t('壓縮內嵌圖片'),
      body,
      width: 460,
      actions: [
        { label: t('取消'), kind: 'ghost', onClick: () => !running },
        {
          label: t('壓縮'), kind: 'primary', onClick: (close) => {
            if (running) return false;
            running = true;
            side.input.disabled = quality.input.disabled = true;
            for (const b of modal.el.querySelectorAll('.modal-foot .btn')) b.disabled = true;
            progress.textContent = t('正在壓縮…');
            compressImages({
              maxSide: Number(side.input.value), quality: Number(quality.input.value),
              onProgress: (i, n) => { progress.textContent = t('正在壓縮第 {i} 張，共 {n} 張', { i, n }); },
            }).then((res) => {
              running = false;
              close();
              if (!res.changed) { HE.ui.toast(t('沒有圖片變小，文件沒有改變。')); return; }
              const saved = Math.round((1 - res.after / res.before) * 100);
              const told = { n: res.changed, before: HE.util.bytes(res.before), after: HE.util.bytes(res.after), saved, kept: res.kept };
              HE.ui.toast(res.kept ? t('已壓縮 {n} 張圖片：{before} 變成 {after}，少了 {saved}%。{kept} 張維持原樣。', told)
                : t('已壓縮 {n} 張圖片：{before} 變成 {after}，少了 {saved}%。', told), { type: 'success', timeout: 8000, action: { label: t('復原'), fn: () => HE.history.undo() } });
            }, (err) => {
              running = false;
              close();
              console.error('[HE] tidy: compressing failed', err);
              HE.ui.toast(t('無法壓縮圖片，文件沒有改變'), { type: 'error' });
            });
            return false;
          },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ */
  /* A cleaned copy                                                      */
  /* ------------------------------------------------------------------ */

  // A comment that states a licence stays: removing it can break the terms the file was passed on under.
  const KEEP_COMMENT = /licen[sc]e|copyright|©|\(c\)|授權|版權/i; // i18n-ok: matched against the comments of the document
  const PROV_ATTR = /^data-(fact|chart)(-|$)/;
  const PROV_BLOCK = 'script#tactile-provenance';
  const MARK_META = /^(generator|author)$/i;
  const OPTIONS = [
    { key: 'comments', on: true, some: (n) => t('移除註解（{n} 個）', { n }), none: t('移除註解（沒有）'), help: t('註解可能留有給 AI 的指示或內部備註。含授權聲明的註解會保留。') },
    { key: 'marks', on: true, some: (n) => t('移除作者與產生工具的標記（{n} 個）', { n }), none: t('移除作者與產生工具的標記（沒有）'), help: t('{a} 與 {b}。', { a: '<meta name="author">', b: '<meta name="generator">' }) },
    { key: 'scripts', on: false, some: (n) => t('移除腳本（{n} 段）', { n }), none: t('移除腳本（沒有）'), help: t('頁面裡靠腳本運作的功能會停止，例如頁籤切換與動態圖表。') },
    { key: 'provenance', on: false, some: (n) => t('移除出處資料（{n} 處）', { n }), none: t('移除出處資料（沒有）'), help: t('移除後，數字不能再追溯到來源檔，也不能用 verify 檢查。') },
  ];

  /**
   * The document as it would be exported, without what `opts` names: {comments, marks, scripts, provenance}.
   * Returns {html, counts}; counts says how many of each kind the document has, removed or not.
   */
  function cleanHtml(opts = {}) {
    const counts = { comments: 0, marks: 0, scripts: 0, provenance: 0 };
    const html = HE.doc.serialize({
      // Comments before and after <html>.
      comment: (data) => {
        if (KEEP_COMMENT.test(data)) return true;
        counts.comments++;
        return !opts.comments;
      },
      prepare: (root) => {
        const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
        const comments = [];
        while (walker.nextNode()) if (!KEEP_COMMENT.test(walker.currentNode.data)) comments.push(walker.currentNode);
        counts.comments += comments.length;
        if (opts.comments) for (const c of comments) c.remove();

        const marks = Array.from(root.querySelectorAll('meta[name]')).filter((m) => MARK_META.test(m.getAttribute('name').trim()));
        counts.marks = marks.length;
        if (opts.marks) for (const m of marks) m.remove();

        const cited = Array.from(root.querySelectorAll('*')).filter((el) => Array.from(el.attributes).some((a) => PROV_ATTR.test(a.name)));
        const block = root.querySelector(PROV_BLOCK);
        counts.provenance = cited.length + (block ? 1 : 0);
        if (opts.provenance) {
          if (block) block.remove();
          for (const el of cited) for (const a of Array.from(el.attributes)) if (PROV_ATTR.test(a.name)) el.removeAttribute(a.name);
        }

        counts.scripts = HE.util.scriptBits(root).size;
        if (opts.scripts) HE.util.stripScript(root);
      },
    });
    return { html, counts };
  }

  const byteLength = (s) => new Blob([s]).size;

  function cleanDialog() {
    if (busy()) return;
    const first = cleanHtml({});
    const before = byteLength(first.html);
    const body = h('div', 'field-stack tidy-dialog');
    body.append(h('p', 'tidy-say', t('下載 1 份清理過的副本。編輯器裡的文件不會改變。')));
    const boxes = {};
    for (const o of OPTIONS) {
      const n = first.counts[o.key];
      const lab = h('label', 'tidy-opt');
      const box = h('input');
      box.type = 'checkbox';
      box.id = 'tidy-opt-' + o.key;
      box.checked = o.on && n > 0;
      box.disabled = n === 0;
      const text = h('span', 'tidy-opt-text');
      const name = h('span', 'tidy-opt-name');
      name.textContent = n ? o.some(n) : o.none;
      const help = h('span', 'field-help');
      help.textContent = o.help;
      text.append(name, help);
      lab.append(box, text);
      body.append(lab);
      boxes[o.key] = box;
    }
    const size = h('p', 'tidy-size');
    size.setAttribute('role', 'status');
    body.append(size);
    const chosen = () => Object.fromEntries(OPTIONS.map((o) => [o.key, boxes[o.key].checked]));
    const sync = () => {
      const after = byteLength(cleanHtml(chosen()).html);
      size.textContent = t('檔案大小：{before} 變成 {after}', { before: HE.util.bytes(before), after: HE.util.bytes(after) });
    };
    body.addEventListener('change', sync);
    sync();
    const name = String(HE.doc.name || 'untitled.html').replace(/\.html?$/i, '') + '-clean.html';
    HE.ui.modal({
      title: t('清理後匯出'),
      body,
      width: 480,
      actions: [
        { label: t('取消'), kind: 'ghost' },
        { label: t('下載清理後的檔案'), kind: 'primary', onClick: () => { HE.fileio.exportHTML({ raw: cleanHtml(chosen()).html, filename: name }); } },
      ],
    });
  }

  HE.tidy = { images, compressImages, compressDialog, cleanHtml, cleanDialog };
})();
