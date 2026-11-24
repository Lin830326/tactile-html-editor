const { test, expect, chromium } = require('@playwright/test');
const { copyFile, mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const origin = 'http://127.0.0.1:4173';
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';

test('external changes do not overwrite unsaved edits without a choice', async ({}, testInfo) => {
  const file = testInfo.outputPath('conflict.html');
  await copyFile(path.join(__dirname, 'fixtures', '01-report.html'), file);
  const original = await readFile(file, 'utf8');
  const diskVersion = original.replace('合成營運報告</h1>', '外部版本：合成營運報告</h1>');
  expect(diskVersion).not.toBe(original);

  const profile = testInfo.outputPath('profile');
  await mkdir(path.join(profile, 'Default'), { recursive: true });
  await writeFile(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
    profile: { content_settings: { exceptions: { file_system_write_guard: { [`${origin},*`]: { setting: 1 } } } } },
  }));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1400, height: 900 },
  });
  try {
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    await page.goto(`${origin}/dist/tactile.html`);
    await expect(page.locator(canvasSelector)).toBeVisible();
    const cdp = await context.newCDPSession(page);
    try {
      const data = { items: [], files: [file], dragOperationsMask: 1 };
      for (const type of ['dragEnter', 'dragOver', 'drop']) {
        await cdp.send('Input.dispatchDragEvent', { type, x: 700, y: 20, data });
      }
    } finally {
      await cdp.detach();
    }
    const title = () => page.frameLocator(canvasSelector).locator('#report-title');
    await expect(title()).toHaveText('合成營運報告');
    await expect(page.locator('#status-save')).toContainText('已連結原檔');
    await title().dblclick();
    await title().fill('編輯器中的修改');
    await title().press('Escape');
    await expect(page.locator('#status-save')).toContainText('有未儲存的修改');

    await writeFile(file, diskVersion, 'utf8');
    await page.keyboard.press('ControlOrMeta+s');
    const dialog = page.getByRole('dialog', { name: '磁碟上的檔案已經改變' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '取消' }).click();
    await expect(dialog).toBeHidden();
    expect(await readFile(file, 'utf8')).toBe(diskVersion);
    await expect(title()).toHaveText('編輯器中的修改');
    await expect(page.locator('#status-save')).toContainText('有未儲存的修改');

    await page.keyboard.press('ControlOrMeta+s');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '載入磁碟版本' }).click();
    await expect(title()).toHaveText('外部版本：合成營運報告');
    expect(await readFile(file, 'utf8')).toBe(diskVersion);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(title()).toHaveText('編輯器中的修改');
    expect(await readFile(file, 'utf8')).toBe(diskVersion);
  } finally {
    await context.close();
  }
});
