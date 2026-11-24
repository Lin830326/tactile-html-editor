const { test, expect } = require('@playwright/test');

const firstPage = `<!doctype html><html><head><title>腳本安全測試</title></head><body>
  <h1>腳本安全測試</h1><p id="state">尚未執行</p>
  <button id="increment">增加 1</button><output id="count">0</output>
  <script>
    const state = document.getElementById('state');
    let editorAccess = '已阻擋';
    let storageAccess = '已阻擋';
    try { editorAccess = window.top.HE ? '可讀取編輯器' : '無編輯器'; } catch (e) {}
    try { storageAccess = window.top.localStorage.getItem('tactile-test-secret') || '無資料'; } catch (e) {}
    state.textContent = '已執行 / ' + editorAccess + ' / ' + storageAccess;
    document.getElementById('increment').addEventListener('click', () => {
      const count = document.getElementById('count');
      count.textContent = String(Number(count.textContent) + 1);
    });
  </script>
</body></html>`;

const secondPage = `<!doctype html><html><head><title>另一份文件</title></head><body>
  <h1>另一份文件</h1><p id="state">第二份尚未執行</p>
  <script>document.getElementById('state').textContent = '第二份已執行';</script>
</body></html>`;

const editFrame = 'iframe.cv-frame:not(.cv-run):not(.is-pending)';
const runFrame = 'iframe.cv-run:not(.is-pending)';

async function openHtml(page, html, title, discardChanges = false) {
  const previous = await page.locator(editFrame).elementHandle();
  await page.getByRole('button', { name: '貼上 HTML', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#fio-paste-text').fill(html);
  await dialog.getByRole('button', { name: '開啟', exact: true }).click();
  if (discardChanges) await page.getByRole('dialog').getByRole('button', { name: '開啟新的文件' }).click();
  await expect(dialog).toBeHidden();
  if (previous) {
    await page.waitForFunction(frame => !frame.isConnected, previous);
    await previous.dispose();
  }
  const frame = page.frameLocator(editFrame);
  await expect(frame.getByRole('heading', { name: title, exact: true })).toBeAttached();
  return frame;
}

async function allowScripts(page) {
  await page.locator('#cv-scripts').click();
  await page.getByRole('menuitemcheckbox', { name: '在預覽中執行腳本' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('允許這份文件的腳本');
  await dialog.getByRole('button', { name: '允許執行', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('untrusted scripts require consent and run only in an isolated preview', async ({ page, context }) => {
  await context.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.evaluate(() => localStorage.setItem('tactile-test-secret', 'editor-secret'));
  let frame = await openHtml(page, firstPage, '腳本安全測試');
  await expect(frame.locator('#state')).toHaveText('尚未執行');
  await expect(page.locator('iframe.cv-run')).toHaveCount(0);

  await page.locator('#cv-mode-preview').click();
  await expect(frame.locator('#state')).toHaveText('尚未執行');
  await expect(page.locator('iframe.cv-run')).toHaveCount(0);
  await allowScripts(page);
  const isolated = page.frameLocator(runFrame).frameLocator('iframe');
  await expect(isolated.locator('#state')).toHaveText('已執行 / 已阻擋 / 已阻擋');
  await isolated.getByRole('button', { name: '增加 1' }).click();
  await expect(isolated.locator('#count')).toHaveText('1');
  expect(await page.evaluate(() => localStorage.getItem('tactile-test-secret'))).toBe('editor-secret');

  await page.locator('#cv-mode-edit').click();
  await expect(page.locator('iframe.cv-run')).toHaveCount(0);
  await expect(frame.locator('#state')).toHaveText('尚未執行');

  // Editing the trusted document to add a different script requires fresh consent.
  await page.locator('#insp-doc-edit-html').click();
  const htmlEditor = page.locator('#insp-doc-html-editor');
  const original = await htmlEditor.inputValue();
  await htmlEditor.fill(original.replace('</body>', '<script>document.getElementById("state").textContent = "新腳本已執行";</script></body>'));
  await page.getByRole('dialog').getByRole('button', { name: '套用', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.locator('#cv-mode-preview').click();
  await expect(page.locator('iframe.cv-run')).toHaveCount(0);
  await expect(page.frameLocator(editFrame).locator('#state')).toHaveText('尚未執行');
  await allowScripts(page);
  await expect(page.frameLocator(runFrame).frameLocator('iframe').locator('#state')).toHaveText('新腳本已執行');
  await page.locator('#cv-mode-edit').click();

  frame = await openHtml(page, secondPage, '另一份文件', true);
  await page.locator('#cv-mode-preview').click();
  await expect(frame.locator('#state')).toHaveText('第二份尚未執行');
  await expect(page.locator('iframe.cv-run')).toHaveCount(0);
  await allowScripts(page);
  await expect(page.frameLocator(runFrame).frameLocator('iframe').locator('#state')).toHaveText('第二份已執行');
});
