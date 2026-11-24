const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const PNG_SIGNATURE = '89504e470d0a1a0a';

const reportHtml = `<!doctype html><html><head><meta charset="utf-8"><title>匯出測試報告</title>
<style>body{margin:0;font:16px/1.5 sans-serif;background:#fff7ed}h1{margin:24px;color:#9a3412}
.band{height:700px;margin:24px;background:linear-gradient(#1d4ed8,#f59e0b)}</style></head><body>
<h1 id="title">匯出測試報告</h1><div class="band" id="one"></div><div class="band" id="two"></div>
<p id="end" onclick="window.parent.__clicked = 1">結尾段落</p>
<script>window.parent.__ran = (window.parent.__ran || 0) + 1;</script></body></html>`;

async function boot(page, init) {
  if (init) await page.addInitScript(init);
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc && HE.snap);
  await expect(page.locator(canvasSelector)).toBeVisible();
}

async function openReport(page) {
  expect(await page.evaluate(source => HE.fileio.openText(source, 'report.html'), reportHtml)).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator('#end')).toHaveText('結尾段落');
  await page.evaluate(() => { HE.canvas.setDevice('desktop'); HE.sel.clear(); });
}

/**
 * Stand in for the print dialog (headless Chromium has none): when the print frame is ready, note what it holds
 * and replace its print(). The frame runs no script, so the stub is the editor's function on that window.
 */
function stubPrint(page) {
  return page.evaluate(() => {
    window.__prints = [];
    HE.on('print:ready', ({ frame, deck }) => {
      const doc = frame.contentDocument;
      const entry = {
        deck, calls: 0, id: frame.id, sandbox: frame.getAttribute('sandbox'),
        html: '<!doctype html>' + doc.documentElement.outerHTML,
        title: doc.title, text: doc.body.textContent,
      };
      window.__prints.push(entry);
      frame.contentWindow.print = () => { entry.calls++; };
    });
  });
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Pages in a PDF Chromium wrote: its page objects are not compressed. */
function pdfPages(buf) {
  return (buf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) || []).length;
}

test('the export menu offers PDF and PNG', async ({ page }) => {
  await boot(page);
  await page.locator('#btn-export-menu').click();
  await expect(page.getByRole('menuitem', { name: '匯出 PDF…' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '匯出 PNG 圖片' })).toBeVisible();
});

test('PNG: the whole page downloads as a picture that matches the canvas', async ({ page }) => {
  await boot(page);
  await openReport(page);
  // A selection is editor state: its outline is not in the picture.
  const size = await page.evaluate(() => {
    HE.sel.set([HE.doc.model.getElementById('title').getAttribute('data-he-id')]);
    const de = HE.live.doc.documentElement;
    // The page's height is that of its root. In Firefox the canvas's window is 825.83px high here, and scrollHeight
    // (the scroll range plus that height, rounded) is 1583 for a page of 1584px; the picture has all 1584.
    return { w: de.clientWidth, h: de.clientHeight, full: Math.max(de.scrollHeight, Math.round(de.getBoundingClientRect().height)) };
  });
  expect(size.full).toBeGreaterThan(size.h * 1.5);

  await page.locator('#btn-export-menu').click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '匯出 PNG 圖片' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('report.png');
  const buf = await readFile(await download.path());
  expect(buf.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
  // Two device pixels per CSS pixel, the full height of the page at the canvas's width.
  expect(pngSize(buf)).toEqual({ width: size.w * 2, height: size.full * 2 });
  await expect(page.locator('#status-msg')).toContainText('已匯出 report.png');
  await expect(page.locator('.toast.success', { hasText: '已匯出 report.png' })).toBeVisible();
  await expect(page.locator('.fio-copy-frame')).toHaveCount(0);
  // The script-free copy the picture was drawn from ran nothing.
  expect(await page.evaluate(() => window.__ran || 0)).toBe(0);

  await page.evaluate(() => { HE.sel.clear(); document.querySelectorAll('.toast').forEach(t => t.remove()); });
  await page.mouse.move(5, 890);
  const real = 'data:image/png;base64,' + (await page.locator(canvasSelector).screenshot()).toString('base64');
  const out = await page.evaluate(async ([png, real, w, h, full]) => {
    const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const [a, b] = await Promise.all([load(png), load(real)]);
    const px = (img, sx, sy, sw, sh) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      return g.getImageData(0, 0, w, h).data;
    };
    // The top screen of the picture against the canvas as the browser paints it.
    const da = px(a, 0, 0, w * 2, h * 2);
    const db = px(b, 0, 0, b.naturalWidth, b.naturalHeight);
    let bad = 0;
    for (let k = 0; k < da.length; k += 4) {
      if (Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2])) > 48) bad++;
    }
    // Not blank, top to bottom: the last screen of the picture holds the second band's colours too.
    const tail = px(a, 0, (full - h) * 2, w * 2, h * 2);
    const colours = new Set();
    for (let k = 0; k < tail.length; k += 4 * 97) colours.add((tail[k] >> 4) + ',' + (tail[k + 1] >> 4) + ',' + (tail[k + 2] >> 4));
    return { diff: bad / (w * h), colours: colours.size };
  }, ['data:image/png;base64,' + buf.toString('base64'), real, size.w, size.h, size.full]);
  expect(out.diff).toBeLessThan(0.05);
  expect(out.colours).toBeGreaterThan(8);
});

test('PNG: the picture is as wide as the device the canvas shows', async ({ page }) => {
  await boot(page);
  await openReport(page);
  await page.evaluate(() => HE.canvas.setDevice('phone'));
  await page.waitForTimeout(300);
  const w = await page.evaluate(() => HE.live.doc.documentElement.clientWidth);
  expect(w).toBeLessThan(500);
  const downloaded = page.waitForEvent('download');
  expect(await page.evaluate(() => HE.fileio.exportPNG())).toBe(true);
  const buf = await readFile(await (await downloaded).path());
  expect(pngSize(buf).width).toBe(w * 2);
});

test('PDF: the print dialog gets the document itself, in a frame that runs no script', async ({ page }) => {
  await boot(page);
  await openReport(page);
  await stubPrint(page);
  await page.evaluate(() => HE.sel.set([HE.doc.model.getElementById('title').getAttribute('data-he-id')]));

  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '匯出 PDF…' }).click();
  await expect(page.getByRole('dialog')).toContainText('另存為 PDF');
  await page.getByRole('button', { name: '開啟列印對話方塊' }).click();
  await page.waitForFunction(() => window.__prints.length === 1 && window.__prints[0].calls === 1);

  const printed = await page.evaluate(() => window.__prints[0]);
  expect(printed.sandbox).toBe('allow-same-origin allow-modals');
  expect(printed.title).toBe('匯出測試報告');
  expect(printed.text).toContain('結尾段落');
  expect(printed.html).toContain('id="two"');
  // None of the editor: no element ids, no editor CSS, no editing state, none of its interface.
  expect(printed.html).not.toContain('data-he-');
  expect(printed.html).not.toContain('__he_editor_css');
  expect(printed.html).not.toContain('contenteditable');
  expect(printed.html).not.toContain('toolbar-file');
  expect(printed.html).toContain('print-color-adjust:exact');
  expect(printed.deck).toBe(false);
  expect(printed.html).not.toContain('@page');
  expect(await page.evaluate(() => window.__ran || 0)).toBe(0);

  // The frame goes once the dialog closes.
  await page.evaluate(() => document.getElementById('fio-print-frame').contentWindow.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#fio-print-frame')).toHaveCount(0);
  await expect(page.locator('.toast.success', { hasText: '列印對話方塊已關閉' })).toBeVisible();

  // Printed for real, the copy is the report on ordinary pages.
  const paper = await page.context().newPage();
  await paper.setContent(printed.html);
  const pdf = await paper.pdf({ preferCSSPageSize: true, printBackground: false });
  expect(pdfPages(pdf)).toBeGreaterThanOrEqual(2);
});

test('PDF: cancelling the hint prints nothing', async ({ page }) => {
  await boot(page);
  await openReport(page);
  await stubPrint(page);
  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '匯出 PDF…' }).click();
  await page.getByRole('button', { name: '取消' }).click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__prints.length)).toBe(0);
  await expect(page.locator('#fio-print-frame')).toHaveCount(0);
});

test('PDF: a deck prints one slide per 16:9 page', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => HE.fileio.newDoc('slides'));
  await expect(page.frameLocator(canvasSelector).locator('.slide').first()).toBeVisible();
  // The check reads the print copy, not the canvas: a phone-sized canvas changes nothing.
  await page.evaluate(() => HE.canvas.setDevice('phone'));
  await stubPrint(page);
  expect(await page.evaluate(() => HE.fileio.exportPDF({ skipHint: true }))).toBe(true);
  const printed = await page.evaluate(() => window.__prints[0]);
  expect(printed.calls).toBe(1);
  expect(printed.deck).toBe(true);
  expect(printed.html).toContain('@page{size:1280px 720px;margin:0}');
  const slides = await page.evaluate(() => HE.doc.model.querySelectorAll('.slide').length);
  expect(slides).toBe(6);

  const paper = await page.context().newPage();
  await paper.setContent(printed.html);
  const pdf = await paper.pdf({ preferCSSPageSize: true, printBackground: true });
  expect(pdfPages(pdf)).toBe(slides);
  // 1280 x 720 CSS px are 960 x 540 pt.
  expect(pdf.toString('latin1')).toMatch(/\/MediaBox\s*\[\s*0 0 960 540\s*\]/);
});

test('PDF: a deck without print rules of its own still gets one slide per page', async ({ page }) => {
  await boot(page);
  const deck = '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:30px;background:#222}' +
    '.wrap{max-width:1000px;margin:0 auto;display:grid;gap:30px}.s{aspect-ratio:16/9;background:#fff;padding:40px;font:40px sans-serif}' +
    '</style></head><body><div class="wrap"><div class="s">一</div><div class="s">二</div><div class="s">三</div></div></body></html>';
  expect(await page.evaluate(source => HE.fileio.openText(source, 'deck.html'), deck)).toBe(true);
  await stubPrint(page);
  expect(await page.evaluate(() => HE.fileio.exportPDF({ skipHint: true }))).toBe(true);
  const printed = await page.evaluate(() => window.__prints[0]);
  expect(printed.deck).toBe(true);
  // An untitled document proposes its file name for the PDF.
  expect(printed.title).toBe('deck');
  const paper = await page.context().newPage();
  await paper.setContent(printed.html);
  expect(pdfPages(await paper.pdf({ preferCSSPageSize: true, printBackground: true }))).toBe(3);
});

test('in a claude.ai Artifact the PNG goes to the downloads capability and PDF is not offered', async ({ page }) => {
  await boot(page, () => {
    window.__saves = [];
    const downloads = { save: async ({ filename, data }) => { window.__saves.push({ filename, type: data.type, size: data.size, blob: data instanceof Blob }); return { status: 'saved' }; } };
    window.claude = { use: async name => (name === 'downloads' ? downloads : null) };
  });
  await openReport(page);
  await page.locator('#btn-export-menu').click();
  await expect(page.getByRole('menuitem', { name: '匯出 PDF…' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: '匯出 PNG 圖片' }).click();
  await page.waitForFunction(() => window.__saves.length === 1);
  const save = await page.evaluate(() => window.__saves[0]);
  expect(save.filename).toBe('report.png');
  expect(save.blob).toBe(true);
  expect(save.type).toBe('image/png');
  expect(save.size).toBeGreaterThan(1000);
});
