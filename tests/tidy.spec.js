const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');

const frame = 'iframe.cv-frame:not(.is-pending)';

async function boot(page) {
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc && HE.tidy);
  await expect(page.locator(frame)).toBeVisible();
}

/** A PNG data URL of noise, which PNG stores badly; `clear` leaves a transparent corner. */
const noisePng = (page, w, h, clear) => page.evaluate(([w, h, clear]) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  let seed = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    for (let k = 0; k < 3; k++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; img.data[i + k] = seed >> 16 & 255; }
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (clear) ctx.clearRect(0, 0, w / 4, h / 4);
  return c.toDataURL('image/png');
}, [w, h, clear]);

const srcOf = (page, id) => page.evaluate((id) => window.HE.doc.body.querySelector('#' + id).getAttribute('src'), id);
const liveImg = (page, id) => page.frameLocator(frame).locator('#' + id).evaluate((el) => ({ natural: el.naturalWidth, width: Math.round(el.getBoundingClientRect().width) }));

test('compressing embedded pictures keeps the layout and is one undo step', async ({ page }) => {
  await boot(page);
  const png = await noisePng(page, 800, 600, false);
  const clear = await noisePng(page, 400, 300, true);
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body>' +
    '<img id="sized" style="width:200px" src="' + png + '">' +
    '<img id="natural" src="' + png + '">' +
    '<img id="clear" style="width:100px" src="' + clear + '">' +
    '<img id="tiny" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==">' +
    '<img id="linked" src="photo.png"></body></html>';
  await page.evaluate((doc) => window.HE.fileio.openText(doc, 'pictures.html'), html);
  await expect(page.frameLocator(frame).locator('#clear')).toBeVisible();
  await expect.poll(async () => (await liveImg(page, 'natural')).width).toBe(800);

  const found = await page.evaluate(() => window.HE.tidy.images().map((i) => i.type));
  expect(found).toEqual(['png', 'png', 'png']);

  const res = await page.evaluate(() => window.HE.tidy.compressImages({ maxSide: 400, quality: 0.8 }));
  expect(res.total).toBe(3);
  expect(res.changed).toBe(3);
  expect(res.after).toBeLessThan(res.before * 0.6);

  // A picture with a set size is made smaller; one that takes the file's own size keeps its pixels.
  expect(await srcOf(page, 'sized')).toMatch(/^data:image\/jpeg;base64,/);
  expect(await liveImg(page, 'sized')).toEqual({ natural: 400, width: 200 });
  expect(await srcOf(page, 'natural')).toMatch(/^data:image\/jpeg;base64,/);
  expect(await liveImg(page, 'natural')).toEqual({ natural: 800, width: 800 });
  // Transparent parts stay transparent.
  expect(await srcOf(page, 'clear')).toMatch(/^data:image\/webp;base64,/);
  expect(await srcOf(page, 'tiny')).toMatch(/^data:image\/png;base64,/);
  expect(await srcOf(page, 'linked')).toBe('photo.png');

  await page.evaluate(() => window.HE.history.undo());
  expect(await srcOf(page, 'sized')).toBe(png);
  expect(await srcOf(page, 'natural')).toBe(png);
  expect(await srcOf(page, 'clear')).toBe(clear);

  // Again: what is already compressed is not worth another pass.
  await page.evaluate(() => window.HE.history.redo());
  const again = await page.evaluate(() => window.HE.tidy.compressImages({ maxSide: 400, quality: 0.8 }));
  expect(again.changed).toBe(0);
});

test('the export menu compresses pictures through a dialog', async ({ page }) => {
  await boot(page);
  const png = await noisePng(page, 600, 400, false);
  await page.evaluate((doc) => window.HE.fileio.openText(doc, 'p.html'),
    '<!doctype html><html><head><title>t</title></head><body><img id="a" style="width:300px" src="' + png + '"></body></html>');
  await expect(page.frameLocator(frame).locator('#a')).toBeVisible();
  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '壓縮內嵌圖片…' }).click();
  const dialog = page.getByRole('dialog', { name: '壓縮內嵌圖片' });
  await expect(dialog).toContainText('這份文件有 1 張內嵌圖片');
  await dialog.getByRole('button', { name: '壓縮', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.toast').filter({ hasText: '已壓縮 1 張圖片' })).toBeVisible();
  expect(await srcOf(page, 'a')).toMatch(/^data:image\/jpeg;base64,/);

  // Without a picture to compress there is no dialog. (Opening over unsaved changes would ask first.)
  await page.evaluate(() => { window.HE.fileio.dirty = false; });
  await page.evaluate(() => window.HE.fileio.openText('<!doctype html><html><head><title>t</title></head><body><p>字</p></body></html>', 'q.html'));
  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '壓縮內嵌圖片…' }).click();
  await expect(page.locator('.toast').filter({ hasText: '沒有可以壓縮的內嵌圖片' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

const messy = `<!-- Copyright 2026 Example Co. MIT License -->
<!-- prompt: make it look expensive -->
<!doctype html><html><head><meta charset="utf-8"><title>季報</title>
<meta name="generator" content="SomeTool 3"><meta name="author" content="某人"><meta name="viewport" content="width=device-width">
<!-- head note --></head><body>
<h1 onclick="go()">季報</h1><!-- TODO: check the total -->
<p>營收 <span data-fact="q3.xlsx/損益表/D14" data-fact-digits="0">1,200</span> 元</p>
<svg data-chart="bar" data-chart-facts="q3.xlsx/損益表/D14"><rect data-chart-fact="q3.xlsx/損益表/D14" width="10" height="10"/></svg>
<script type="application/json" id="tactile-provenance">{"version":1,"facts":{"q3.xlsx/損益表/D14":{"value":"1200"}}}</script>
<script>window.x = 1;</script>
</body></html>`;

test('a cleaned copy leaves out what was chosen, and the document stays as it is', async ({ page }) => {
  await boot(page);
  await page.evaluate((doc) => window.HE.fileio.openText(doc, '季報.html'), messy);
  await expect(page.frameLocator(frame).locator('h1')).toHaveText('季報');
  const before = await page.evaluate(() => window.HE.doc.serialize());

  const none = await page.evaluate(() => window.HE.tidy.cleanHtml({}));
  expect(none.html).toBe(before);
  // Comments: prompt, head note, TODO; the licence comment is not counted. Script: the element and the onclick.
  expect(none.counts).toEqual({ comments: 3, marks: 2, scripts: 2, provenance: 4 });

  const all = (await page.evaluate(() => window.HE.tidy.cleanHtml({ comments: true, marks: true, scripts: true, provenance: true }))).html;
  expect(all).toContain('Copyright 2026 Example Co.');
  expect(all).not.toMatch(/prompt:|head note|TODO/);
  expect(all).not.toMatch(/generator|name="author"/);
  expect(all).toContain('name="viewport"');
  expect(all).not.toMatch(/onclick|window\.x|<script/);
  expect(all).not.toMatch(/data-fact|data-chart|tactile-provenance/);
  expect(all).toContain('<span>1,200</span>');
  expect(all).toContain('<svg><rect width="10" height="10"></rect></svg>');

  // Removing script keeps the data block, which is not script.
  const noScript = (await page.evaluate(() => window.HE.tidy.cleanHtml({ scripts: true }))).html;
  expect(noScript).toContain('id="tactile-provenance"');
  expect(noScript).not.toMatch(/window\.x|onclick/);

  expect(await page.evaluate(() => window.HE.doc.serialize())).toBe(before);
});

test('the export menu downloads a cleaned copy under another name', async ({ page }) => {
  await boot(page);
  await page.evaluate((doc) => window.HE.fileio.openText(doc, '季報.html'), messy);
  await expect(page.frameLocator(frame).locator('h1')).toHaveText('季報');
  // An edit, so that the document has something unsaved.
  await page.evaluate(() => window.HE.ops.setText(window.HE.doc.idOf(window.HE.doc.body.querySelector('h1')), '第三季季報'));
  expect(await page.evaluate(() => window.HE.fileio.dirty)).toBe(true);

  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '清理後匯出…' }).click();
  const dialog = page.getByRole('dialog', { name: '清理後匯出' });
  await expect(dialog.getByLabel(/移除註解（3 個）/)).toBeChecked();
  await expect(dialog.getByLabel(/移除作者與產生工具的標記（2 個）/)).toBeChecked();
  await expect(dialog.getByLabel(/移除腳本（2 段）/)).not.toBeChecked();
  await expect(dialog.getByLabel(/移除出處資料（4 處）/)).not.toBeChecked();
  const sizeBefore = await dialog.locator('.tidy-size').textContent();
  await dialog.getByLabel(/移除腳本/).check();
  await expect(dialog.locator('.tidy-size')).not.toHaveText(sizeBefore);

  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下載清理後的檔案' }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('季報-clean.html');
  const text = await readFile(await file.path(), 'utf8');
  expect(text).toContain('第三季季報');
  expect(text).toContain('Copyright 2026 Example Co.');
  expect(text).not.toMatch(/prompt:|TODO|generator|window\.x|onclick/);
  expect(text).toContain('data-fact="q3.xlsx/損益表/D14"');
  expect(text).toContain('id="tactile-provenance"');

  // The copy is not the document: it is still unsaved, and still has its comments.
  expect(await page.evaluate(() => window.HE.fileio.dirty)).toBe(true);
  expect(await page.evaluate(() => window.HE.doc.serialize())).toContain('TODO: check the total');
});

test('a document with nothing to clean offers nothing to remove', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.HE.fileio.openText('<!doctype html><html><head><title>t</title></head><body><p>字</p></body></html>', 'plain.html'));
  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '清理後匯出…' }).click();
  const dialog = page.getByRole('dialog', { name: '清理後匯出' });
  for (const box of await dialog.getByRole('checkbox').all()) {
    await expect(box).toBeDisabled();
    await expect(box).not.toBeChecked();
  }
});
