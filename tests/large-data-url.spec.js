const { test, expect } = require('@playwright/test');

const canvas = 'iframe.cv-frame:not(.cv-run):not(.is-pending)';

test('large embedded data survives HTML edits, undo and redo', async ({ page, browserName }) => {
  // The limits are the test tool's, measured without the editor: Playwright's WebKit takes 25 s to fill a textarea
  // with 16 MB, and its Firefox loses the tab at the click after such a fill (12 MB is fine). Given the document
  // directly, the editor shows, undoes and writes out 16 MB in under 2 s in both.
  test.setTimeout(browserName === 'webkit' ? 300_000 : 90_000);
  const MB = browserName === 'firefox' ? 12 : 16;
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.getByRole('button', { name: '貼上 HTML', exact: true }).click();
  await page.locator('#fio-paste-text').fill('<!doctype html><html><head><title>Large data test</title></head><body><h1>Before</h1></body></html>');
  await page.getByRole('dialog').getByRole('button', { name: '開啟', exact: true }).click();
  await expect(page.frameLocator(canvas).locator('h1')).toHaveText('Before');

  const data = 'data:image/png;base64,' + 'A'.repeat(MB * 1024 * 1024);
  await page.locator('#insp-doc-edit-html').click();
  const input = page.locator('#insp-doc-html-editor');
  const html = await input.inputValue();
  await input.fill(html.replace('Before', 'After').replace('</body>', `<img id="large" src="${data}"></body>`));
  await page.getByRole('dialog').getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.frameLocator(canvas).locator('h1')).toHaveText('After');
  await expect(page.frameLocator(canvas).locator('#large')).toHaveAttribute('src', data);

  await page.locator('#btn-undo').click();
  await expect(page.frameLocator(canvas).locator('h1')).toHaveText('Before');
  await expect(page.frameLocator(canvas).locator('#large')).toHaveCount(0);
  await page.locator('#btn-redo').click();
  await expect(page.frameLocator(canvas).locator('h1')).toHaveText('After');
  await expect(page.frameLocator(canvas).locator('#large')).toHaveAttribute('src', data);

  await page.locator('#insp-doc-edit-html').click();
  await input.fill((await input.inputValue()).replace('After', 'Edited again'));
  await page.getByRole('dialog').getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.frameLocator(canvas).locator('h1')).toHaveText('Edited again');
  await expect(page.frameLocator(canvas).locator('#large')).toHaveAttribute('src', data);
});
