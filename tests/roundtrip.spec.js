const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const samples = [
  {
    file: '01-report.html',
    titleId: 'report-title',
    title: '合成營運報告',
    panelId: 'report-summary',
    originalColor: 'rgb(232, 240, 255)',
    marker: '檢查標記：報告結尾 A17',
    kind: 'report',
  },
  {
    file: '02-chart.html',
    titleId: 'chart-title',
    title: '合成季度圖表',
    panelId: 'chart-panel',
    originalColor: 'rgb(237, 243, 255)',
    marker: '檢查標記：圖表結尾 B29',
    kind: 'chart',
  },
  {
    file: '03-interactive.html',
    titleId: 'interactive-title',
    title: '合成互動頁',
    panelId: 'interaction-panel',
    originalColor: 'rgb(237, 243, 255)',
    marker: '檢查標記：互動結尾 C43',
    kind: 'interactive',
  },
];

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';

async function openHtml(page, html, titleId, expectedTitle) {
  const previousFrame = await page.locator(canvasSelector).elementHandle();
  await page.getByRole('button', { name: '貼上 HTML', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#fio-paste-text').fill(html);
  await dialog.getByRole('button', { name: '開啟', exact: true }).click();
  await expect(dialog).toBeHidden();
  if (previousFrame) {
    await page.waitForFunction(frame => !frame.isConnected, previousFrame);
    await previousFrame.dispose();
  }
  const canvas = page.frameLocator(canvasSelector);
  await expect(canvas.locator(`#${titleId}`)).toHaveText(expectedTitle);
  return canvas;
}

async function expectContents(root, sample, title, color) {
  await expect(root.locator(`#${sample.titleId}`)).toHaveText(title);
  await expect(root.locator(`#${sample.panelId}`)).toHaveCSS('background-color', color);
  await expect(root.getByText(sample.marker, { exact: true })).toBeVisible();

  if (sample.kind === 'report' || sample.kind === 'chart') {
    await expect(root.locator('tbody tr td:nth-child(2)')).toHaveText(['12', '8', '5']);
  }
  if (sample.kind === 'report') {
    await expect(root.locator('thead th')).toHaveText(['組別', '數量', '狀態']);
  }
  if (sample.kind === 'chart') {
    const bars = root.locator('svg rect');
    await expect(bars).toHaveCount(3);
    for (const [index, x, y, height, fill] of [
      [0, '110', '70', '120', '#315dcc'],
      [1, '260', '110', '80', '#1b8a78'],
      [2, '410', '140', '50', '#d77b2b'],
    ]) {
      await expect(bars.nth(index)).toHaveAttribute('x', x);
      await expect(bars.nth(index)).toHaveAttribute('y', y);
      await expect(bars.nth(index)).toHaveAttribute('width', '80');
      await expect(bars.nth(index)).toHaveAttribute('height', height);
      await expect(bars.nth(index)).toHaveAttribute('fill', fill);
    }
    await expect(root.locator('svg text')).toHaveText(['12', '8', '5', '甲組', '乙組', '丙組']);
  }
  if (sample.kind === 'interactive') {
    await expect(root.getByRole('button', { name: '增加 1' })).toBeVisible();
    await expect(root.getByRole('button', { name: '顯示說明' })).toBeVisible();
    await expect(root.locator('#counter-value')).toHaveText('0');
    await expect(root.locator('#detail')).toBeHidden();
  }
}

async function downloadHtml(page, outputPath) {
  await page.getByRole('button', { name: /更多(?:儲存|匯出)方式/ }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '下載 HTML' }).click();
  await (await downloadPromise).saveAs(outputPath);
}

async function expectInteraction(page) {
  const counter = page.locator('#counter-value');
  const detail = page.locator('#detail');
  const toggle = page.locator('#toggle-detail');

  await expect(counter).toHaveText('0');
  await expect(detail).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: '增加 1' }).click();
  await page.getByRole('button', { name: '增加 1' }).click();
  await expect(counter).toHaveText('2');
  await toggle.click();
  await expect(detail).toBeVisible();
  await expect(detail).toHaveText('互動說明 C43');
  await expect(toggle).toHaveText('隱藏說明');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(detail).toBeHidden();
  await expect(toggle).toHaveText('顯示說明');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(counter).toHaveText('0');
  await expect(detail).toBeHidden();
  await expect(toggle).toHaveText('顯示說明');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
}

for (const sample of samples) {
  test(`${sample.file}: edit, export, reopen and reimport`, async ({ page, context }, testInfo) => {
    // The fixtures and the editor need no external assets for this workflow.
    await context.route('https://**/*', route => route.abort());
    await page.goto('/dist/tactile.html');
    await expect(page.locator(canvasSelector)).toBeVisible();
    const original = await readFile(path.join(__dirname, 'fixtures', sample.file), 'utf8');
    let canvas = await openHtml(page, original, sample.titleId, sample.title);
    await expectContents(canvas, sample, sample.title, sample.originalColor);

    const revisedTitle = `${sample.title}（已修訂）`;
    const heading = canvas.locator(`#${sample.titleId}`);
    await heading.dblclick();
    await heading.fill(revisedTitle);
    await heading.press('Escape');
    await canvas.locator(`#${sample.panelId}`).click({ position: { x: 5, y: 5 } });
    const background = page.locator('#insp-background-color');
    await background.fill('#fff2cc');
    await background.press('Enter');
    await expectContents(canvas, sample, revisedTitle, 'rgb(255, 242, 204)');

    const exportedPath = testInfo.outputPath(sample.file);
    await downloadHtml(page, exportedPath);

    const reopened = await context.newPage();
    try {
      await reopened.goto(pathToFileURL(exportedPath).href);
      await expectContents(reopened, sample, revisedTitle, 'rgb(255, 242, 204)');
      if (sample.kind === 'interactive') await expectInteraction(reopened);
    } finally {
      await reopened.close();
    }

    const exported = await readFile(exportedPath, 'utf8');
    canvas = await openHtml(page, exported, sample.titleId, revisedTitle);
    await expectContents(canvas, sample, revisedTitle, 'rgb(255, 242, 204)');

    if (sample.kind === 'interactive') {
      const reexportedPath = testInfo.outputPath('reimported-interactive.html');
      await downloadHtml(page, reexportedPath);
      const reexported = await context.newPage();
      try {
        await reexported.goto(pathToFileURL(reexportedPath).href);
        await expectContents(reexported, sample, revisedTitle, 'rgb(255, 242, 204)');
        await expectInteraction(reexported);
      } finally {
        await reexported.close();
      }
    }
  });
}
