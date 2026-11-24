const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const tab = (page, name) => page.locator('[data-tabs="left"] [data-tab="' + name + '"]');

test('every text of the finished files has an English translation', () => {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'i18n-check.mjs')], { encoding: 'utf8', stdio: 'pipe' }); }
  catch (err) { out = String(err.stdout) + String(err.stderr); }
  expect(out).toContain('No problems.');
});

test('the language button reloads the editor in the other language and keeps the document', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(tab(page, 'layers')).toHaveText('圖層');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
  await page.evaluate(() => window.HE.ops.replaceDocument('<!doctype html><html><head><title>t</title></head><body><h1>KEPT-ACROSS-RELOAD</h1></body></html>'));
  await expect(page.frameLocator(canvasSelector).locator('h1')).toHaveText('KEPT-ACROSS-RELOAD');
  await page.evaluate(() => window.HE.fileio.saveNow && window.HE.fileio.saveNow());

  const button = page.locator('#btn-lang');
  await expect(button).toHaveText('繁體中文');
  await button.click();
  await expect(page.getByRole('menuitemradio')).toHaveText(['繁體中文', '简体中文', 'English']);
  page.on('dialog', (d) => d.accept()); // the leave warning of an unsaved document
  await page.getByRole('menuitemradio', { name: 'English' }).click();

  await expect(tab(page, 'layers')).toHaveText('Layers');
  await expect(tab(page, 'pages')).toHaveText('Pages');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Tactile HTML editor');
  await expect(page.locator('#doc-name')).toHaveAttribute('aria-label', 'File name');
  await expect(page.locator('#layers-search')).toHaveAttribute('placeholder', 'Search tags, ids or text');
  await expect(page.frameLocator(canvasSelector).locator('h1')).toHaveText('KEPT-ACROSS-RELOAD');

  // A text with {names}: the undo button names the step and the key.
  await page.evaluate(() => { const id = window.HE.doc.model.querySelector('h1').getAttribute('data-he-id'); window.HE.ops.setText(id, 'changed'); });
  await expect(page.locator('#btn-undo')).toHaveAttribute('title', /^Undo: Change text \(.+\)$/);
  // Nothing of the finished files falls back to Chinese.
  await page.locator('[data-tabs="left"] [data-tab="insert"]').click();
  await page.locator('#btn-ai-settings').click();
  await expect(page.locator('#ai-set-sent')).toContainText('File name');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => [...window.HE.i18n.missing])).toEqual([]);

  // Simplified Chinese: its own words, not only its own characters.
  await expect(page.locator('#btn-lang')).toHaveText('English');
  await page.locator('#btn-lang').click();
  await page.getByRole('menuitemradio', { name: '简体中文' }).click();
  await expect(tab(page, 'layers')).toHaveText('图层');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await expect(page.locator('#btn-undo')).toHaveAttribute('aria-label', '撤销');
  expect(await page.evaluate(() => [...window.HE.i18n.missing])).toEqual([]);
  await page.locator('#btn-lang').click();
  await page.getByRole('menuitemradio', { name: '繁體中文' }).click();
  await expect(tab(page, 'layers')).toHaveText('圖層');
});

test('a browser that does not ask for Chinese starts in English', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(tab(page, 'layers')).toHaveText('Layers');
  await expect(page.locator('#btn-lang')).toHaveText('English');
  // The first document is written in English too.
  await expect(page.locator('#doc-name')).toHaveValue('tactile-sample.html');
  await expect(page.frameLocator(canvasSelector).locator('html')).toHaveAttribute('lang', 'en');
  await context.close();

  const cn = await browser.newContext({ locale: 'zh-CN' });
  const page2 = await cn.newPage();
  await page2.goto('/dist/tactile.html');
  await expect(page2.locator(canvasSelector)).toBeVisible();
  await expect(tab(page2, 'layers')).toHaveText('图层');
  await cn.close();
});
