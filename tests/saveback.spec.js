const { test, expect, chromium } = require('@playwright/test');
const { mkdir, readFile, writeFile, copyFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const origin = 'http://127.0.0.1:4173';
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const samples = [
  { file: '01-report.html', titleId: 'report-title', title: '合成營運報告', panelId: 'report-summary', marker: '檢查標記：報告結尾 A17', kind: 'report' },
  { file: '02-chart.html', titleId: 'chart-title', title: '合成季度圖表', panelId: 'chart-panel', marker: '檢查標記：圖表結尾 B29', kind: 'chart' },
  { file: '03-interactive.html', titleId: 'interactive-title', title: '合成互動頁', panelId: 'interaction-panel', marker: '檢查標記：互動結尾 C43', kind: 'interactive' },
];

async function dropDiskFile(context, page, filePath) {
  // Chromium's CDP simulates an operating-system file drag. The dropped item yields a native
  // FileSystemFileHandle for the actual file, rather than an OPFS file or a stubbed handle.
  const cdp = await context.newCDPSession(page);
  try {
    const data = { items: [], files: [filePath], dragOperationsMask: 1 };
    for (const type of ['dragEnter', 'dragOver', 'drop']) {
      await cdp.send('Input.dispatchDragEvent', { type, x: 700, y: 20, data });
    }
  } finally {
    await cdp.detach();
  }
}

async function expectSample(root, sample, title) {
  await expect(root.locator(`#${sample.titleId}`)).toHaveText(title);
  await expect(root.locator(`#${sample.panelId}`)).toHaveCSS('background-color', 'rgb(255, 242, 204)');
  await expect(root.getByText(sample.marker, { exact: true })).toBeVisible();
  if (sample.kind === 'report' || sample.kind === 'chart') {
    await expect(root.locator('tbody tr td:nth-child(2)')).toHaveText(['12', '8', '5']);
  }
  if (sample.kind === 'chart') {
    const bars = root.locator('svg rect');
    await expect(bars).toHaveCount(3);
    await expect(bars.nth(0)).toHaveAttribute('height', '120');
    await expect(bars.nth(1)).toHaveAttribute('height', '80');
    await expect(bars.nth(2)).toHaveAttribute('height', '50');
    await expect(root.locator('svg text')).toHaveText(['12', '8', '5', '甲組', '乙組', '丙組']);
  }
  if (sample.kind === 'interactive') {
    await expect(root.locator('#counter-value')).toHaveText('0');
    await expect(root.locator('#detail')).toBeHidden();
  }
}

for (const sample of samples) {
  test(`${sample.file}: edit and save back to the original disk file`, async ({}, testInfo) => {
    const filePath = testInfo.outputPath(sample.file);
    await copyFile(path.join(__dirname, 'fixtures', sample.file), filePath);

    // Dropped files normally ask the user for write permission. A fresh, private test profile
    // grants it only to the local test server, so Chromium can use the real file system in CI.
    // This does not test the native permission prompt or the operating-system file picker.
    const profile = testInfo.outputPath('chromium-profile');
    await mkdir(path.join(profile, 'Default'), { recursive: true });
    await writeFile(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
      profile: { content_settings: { exceptions: { file_system_write_guard: { [`${origin},*`]: { setting: 1 } } } } },
    }));
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', // Headless shell denies local-file write grants; use bundled full Chromium.
      headless: true,
      viewport: { width: 1400, height: 900 },
    });
    try {
      await context.route('https://**/*', route => route.abort());
      const page = await context.newPage();
      await page.goto(`${origin}/dist/tactile.html`);
      await expect(page.locator(canvasSelector)).toBeVisible();
      await dropDiskFile(context, page, filePath);
      const canvas = page.frameLocator(canvasSelector);
      const heading = canvas.locator(`#${sample.titleId}`);
      await expect(heading).toHaveText(sample.title);
      await expect(page.locator('#status-save')).toContainText('已連結原檔');

      const revisedTitle = `${sample.title}（已修訂）`;
      await heading.dblclick();
      await heading.fill(revisedTitle);
      await heading.press('Escape');
      await canvas.locator(`#${sample.panelId}`).click({ position: { x: 5, y: 5 } });
      const background = page.locator('#insp-background-color');
      await background.fill('#fff2cc');
      await background.press('Enter');
      await expect(page.locator('#status-save')).toContainText('有未儲存的修改');
      await page.keyboard.press('ControlOrMeta+s');

      // This is read from the operating-system file copied above, not the editor model or a download.
      await expect.poll(async () => await readFile(filePath, 'utf8'), { timeout: 10_000 }).toContain(revisedTitle);
      await expect(page.locator('#status-save')).toContainText('已存回');
      const reopened = await context.newPage();
      try {
        await reopened.goto(pathToFileURL(filePath).href);
        await expectSample(reopened, sample, revisedTitle);
        if (sample.kind === 'interactive') {
          await reopened.getByRole('button', { name: '增加 1' }).click();
          await reopened.getByRole('button', { name: '增加 1' }).click();
          await expect(reopened.locator('#counter-value')).toHaveText('2');
          const toggle = reopened.locator('#toggle-detail');
          await toggle.click();
          await expect(reopened.locator('#detail')).toHaveText('互動說明 C43');
          await expect(reopened.locator('#detail')).toBeVisible();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
          await toggle.click();
          await expect(reopened.locator('#detail')).toBeHidden();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await reopened.reload();
          await expect(reopened.locator('#counter-value')).toHaveText('0');
          await expect(reopened.locator('#detail')).toBeHidden();
        }
      } finally {
        await reopened.close();
      }

      const again = await context.newPage();
      try {
        await again.goto(`${origin}/dist/tactile.html`);
        await expect(again.locator(canvasSelector)).toBeVisible();
        await dropDiskFile(context, again, filePath);
        await expect(again.locator('#status-save')).toContainText('已連結原檔');
        await expectSample(again.frameLocator(canvasSelector), sample, revisedTitle);
      } finally {
        await again.close();
      }
    } finally {
      await context.close();
    }
  });
}
