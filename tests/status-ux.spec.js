const { test, expect, chromium } = require('@playwright/test');
const { copyFile, mkdir, readFile, unlink, writeFile } = require('node:fs/promises');
const path = require('node:path');

const frame = 'iframe.cv-frame:not(.is-pending)';

test('preview identifies blocked scripts and keeps the trust choice explicit', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.getByRole('button', { name: '貼上 HTML', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#fio-paste-text').fill(await readFile(path.join(__dirname, 'fixtures/03-interactive.html'), 'utf8'));
  await dialog.getByRole('button', { name: '開啟', exact: true }).click();
  await expect(page.frameLocator(frame).locator('#interactive-title')).toHaveText('合成互動頁');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('#cv-mode-preview').click();
  await expect(page.locator('#cv-run-label')).toHaveText('腳本未執行');
  await expect(page.locator('#cv-run-label')).toBeVisible();
  await page.frameLocator(frame).getByRole('button', { name: '增加 1' }).click();
  await expect(page.frameLocator(frame).locator('#counter-value')).toHaveText('0');
  const bounds = await page.locator('#cv-run-label').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
  await expect(page.locator('#cv-mode-preview')).not.toHaveAttribute('title', /頁面照常運作/);
  await page.locator('#cv-scripts').click();
  await page.getByRole('menuitemcheckbox', { name: '在預覽中執行腳本' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '允許執行', exact: true }).click();
  await expect(page.locator('#cv-run-label')).toHaveText('腳本執行中・已隔離');
  const running = page.frameLocator('iframe.cv-run:not(.is-pending)').frameLocator('iframe');
  await running.getByRole('button', { name: '增加 1' }).click();
  await expect(running.locator('#counter-value')).toHaveText('1');
  await page.locator('#cv-scripts').click();
  await page.getByRole('menuitemcheckbox', { name: '編輯時也執行（相容模式）' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '開啟相容模式', exact: true }).click();
  await expect(page.locator('#cv-compat-off')).toBeVisible();
  await page.locator('#cv-scripts').click();
  await page.getByRole('menuitemcheckbox', { name: '在預覽中執行腳本' }).click();
  await expect(page.locator('#cv-run-label')).toHaveText('腳本停・請重載');
  await expect(page.locator('#cv-run-label')).toHaveAttribute('title', /隔離並不完整/);
  await expect(page.locator('#cv-run-label')).not.toHaveAttribute('title', /在隔離的框架中執行/);
  await expect.poll(async () => {
    const label = await page.locator('#cv-run-label').boundingBox();
    const drawer = await page.locator('#btn-drawer-right').boundingBox();
    return label.x + label.width - drawer.x;
  }).toBeLessThanOrEqual(0);
});

test('a missing original file is visible on a narrow screen', async ({}, testInfo) => {
  const origin = new URL(testInfo.project.use.baseURL).origin;
  const filePath = testInfo.outputPath('report.html');
  await copyFile(path.join(__dirname, 'fixtures/01-report.html'), filePath);
  const profile = testInfo.outputPath('chromium-profile');
  await mkdir(path.join(profile, 'Default'), { recursive: true });
  await writeFile(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
    profile: { content_settings: { exceptions: { file_system_write_guard: { [`${origin},*`]: { setting: 1 } } } } },
  }));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 360, height: 800 },
  });
  try {
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    await page.goto(`${origin}/dist/tactile.html`);
    const cdp = await context.newCDPSession(page);
    const data = { items: [], files: [filePath], dragOperationsMask: 1 };
    for (const type of ['dragEnter', 'dragOver', 'drop']) {
      await cdp.send('Input.dispatchDragEvent', { type, x: 180, y: 20, data });
    }
    await cdp.detach();
    const status = page.locator('#status-save');
    await expect(status).toContainText('已連結原檔');
    await unlink(filePath);
    await expect(status.getByText('找不到原檔')).toBeVisible({ timeout: 12_000 });
    await expect(status.locator('.fio-dot.ok')).toHaveCount(0);
    const bounds = await status.getByText('找不到原檔').boundingBox();
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(360);
    const heading = page.frameLocator(frame).locator('#report-title');
    await heading.dblclick();
    await heading.fill('修改後的合成報告');
    await heading.press('Escape');
    await expect(status.getByText('有未儲存的修改')).toBeVisible();
    await expect(status.getByText('找不到原檔')).toBeVisible();
    const dirtyBounds = await status.getByText('找不到原檔').boundingBox();
    expect(dirtyBounds.x + dirtyBounds.width).toBeLessThanOrEqual(360);
    const original = await readFile(path.join(__dirname, 'fixtures/01-report.html'), 'utf8');
    await writeFile(filePath, original.replace('合成營運報告', '磁碟中的另一個版本'));
    await expect(status.getByText('磁碟上有新版本')).toBeVisible({ timeout: 12_000 });
    const conflictBounds = await status.getByText('磁碟上有新版本').boundingBox();
    expect(conflictBounds.x + conflictBounds.width).toBeLessThanOrEqual(360);
  } finally {
    await context.close();
  }
});
