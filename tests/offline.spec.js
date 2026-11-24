const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const canvas = 'iframe.cv-frame:not(.is-pending)';

async function openHtml(page, html) {
  const previous = await page.locator(canvas).elementHandle();
  await page.getByRole('button', { name: '貼上 HTML', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#fio-paste-text').fill(html);
  await dialog.getByRole('button', { name: '開啟', exact: true }).click();
  await expect(dialog).toBeHidden();
  if (previous) {
    await page.waitForFunction(frame => !frame.isConnected, previous);
    await previous.dispose();
  }
}

test('editor opens, edits, exports and reimports without public network access', async ({ page, context }, testInfo) => {
  const blocked = [];
  let phase = 'editor';
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
    blocked.push({ phase, url: url.href });
    await route.abort();
  });

  await page.goto(pathToFileURL(path.join(__dirname, '../dist/tactile.html')).href);
  await expect(page.locator(canvas)).toBeVisible();
  // Wait for the editor's styles and fonts to settle before attributing requests to the document.
  await page.evaluate(() => document.fonts.ready);
  phase = 'document';
  const original = await readFile(path.join(__dirname, 'fixtures/01-report.html'), 'utf8');
  await openHtml(page, original);
  const heading = page.frameLocator(canvas).locator('#report-title');
  await expect(heading).toHaveText('合成營運報告');
  await heading.dblclick();
  await heading.fill('離線修改後的報告');
  await heading.press('Escape');
  await expect(heading).toHaveText('離線修改後的報告');

  await page.getByRole('button', { name: /更多(?:儲存|匯出)方式/ }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '下載 HTML' }).click();
  const output = testInfo.outputPath('offline-report.html');
  await (await downloaded).saveAs(output);
  const exported = await readFile(output, 'utf8');
  expect(exported).toContain('離線修改後的報告');
  await openHtml(page, exported);
  await expect(page.frameLocator(canvas).locator('#report-title')).toHaveText('離線修改後的報告');
  expect(blocked, 'The editor and this self-contained document should not request public resources').toEqual([]);
});

test('external assets in an imported document remain distinct from editor requests', async ({ page, context }) => {
  const blocked = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === 'http://127.0.0.1:4173') return route.continue();
    blocked.push(url.href);
    await route.abort();
  });
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvas)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  blocked.length = 0;
  await openHtml(page, '<!doctype html><html><body><h1>外部資源測試</h1><img src="https://document-assets.invalid/image.png"></body></html>');
  await expect(page.frameLocator(canvas).getByRole('heading', { name: '外部資源測試' })).toBeVisible();
  await expect.poll(() => blocked).toContain('https://document-assets.invalid/image.png');
});

test('model connection tests use only the configured simulated endpoint', async ({ page, context }) => {
  const modelRequests = [];
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === '/mock/v1/chat/completions' &&
        (url.origin === 'http://127.0.0.1:4173' || url.origin === 'https://model.invalid')) {
      if (req.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': '*' } });
      }
      modelRequests.push({ url: url.href, body: req.postDataJSON() });
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, json: { choices: [{ message: { role: 'assistant', content: '測試成功' } }] } });
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === 'http://127.0.0.1:4173') return route.continue();
    await route.abort();
  });
  await page.goto('/dist/tactile.html');
  await page.locator('#btn-ai-settings').click();
  await page.locator('#ai-set-provider-openai').check();
  await page.locator('#ai-set-openai-model').fill('offline-test-model');
  const base = page.locator('#ai-set-openai-base');
  await base.fill('http://127.0.0.1:4173/mock/v1');
  await page.locator('#ai-set-test').click();
  await expect(page.locator('#ai-set-test-result')).toHaveText('連線成功');
  await base.fill('https://model.invalid/mock/v1');
  await page.locator('#ai-set-test').click();
  await expect(page.locator('#ai-set-test-result')).toHaveText('連線成功');
  expect(modelRequests.map(({ url, body }) => ({ url, model: body.model }))).toEqual([
    { url: 'http://127.0.0.1:4173/mock/v1/chat/completions', model: 'offline-test-model' },
    { url: 'https://model.invalid/mock/v1/chat/completions', model: 'offline-test-model' },
  ]);
});
