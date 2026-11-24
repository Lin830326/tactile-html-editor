const { test, expect, chromium } = require('@playwright/test');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const origin = process.env.LAYER_TEST_ORIGIN || 'http://127.0.0.1:4173';
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const before = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<main id="root"><section id="expanded-target"><h2>展開區塊</h2><div id="expanded-child"><p>子項內容</p></div></section>
<section id="hidden-target"><h2>隱藏區塊</h2><p>隱藏內容</p></section>
<section id="reused"><p>原有區塊</p></section>
<article><h2>獨特區塊</h2><p>清楚識別</p></article>
<section class="duplicate"><p>相同內容</p></section><section class="duplicate"><p>相同內容</p></section>
<p id="version">舊版本</p></main></body></html>`;
const after = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<main id="root"><p>新增段落</p><section id="hidden-target"><h2>隱藏區塊</h2><p>隱藏內容</p></section>
<section id="reused"><p>全新而不同的內容</p></section>
<article><h2>獨特區塊</h2><p>清楚識別</p></article>
<section id="expanded-target"><h2>展開區塊</h2><div id="expanded-child"><p>子項內容</p></div></section>
<section class="duplicate"><p>相同內容</p></section><p id="version">新版本</p></main></body></html>`;

async function dropFile(context, page, file) {
  const cdp = await context.newCDPSession(page);
  try {
    const data = { items: [], files: [file], dragOperationsMask: 1 };
    for (const type of ['dragEnter', 'dragOver', 'drop']) await cdp.send('Input.dispatchDragEvent', { type, x: 700, y: 20, data });
  } finally { await cdp.detach(); }
}

async function rowFor(page, selector, nth = 0) {
  const id = await page.frameLocator(canvasSelector).locator(selector).nth(nth).getAttribute('data-he-id');
  expect(id).toBeTruthy();
  return page.locator(`#layers-tree .lyr-row[data-id="${id}"]`);
}

test('external reload preserves uniquely identified layer state without hiding ambiguous elements', async ({}, testInfo) => {
  const file = testInfo.outputPath('external.html');
  const profile = testInfo.outputPath('profile');
  await writeFile(file, before);
  await mkdir(path.join(profile, 'Default'), { recursive: true });
  await writeFile(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
    profile: { content_settings: { exceptions: { file_system_write_guard: { [`${origin},*`]: { setting: 1 } } } } },
  }));
  const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1400, height: 900 } });
  try {
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    await page.goto(`${origin}/dist/tactile.html`);
    await expect(page.locator(canvasSelector)).toBeVisible();
    await dropFile(context, page, file);
    await expect(page.frameLocator(canvasSelector).locator('#version')).toHaveText('舊版本');
    await expect(page.locator('#status-save')).toContainText('已連結原檔');

    const expanded = await rowFor(page, '#expanded-child');
    await expect(expanded).toHaveAttribute('aria-expanded', 'false');
    await expanded.locator('[data-act="toggle"]').click();
    await expect(expanded).toHaveAttribute('aria-expanded', 'true');
    const hidden = await rowFor(page, '#hidden-target');
    await hidden.locator('[data-act="eye"]').click();
    await expect(hidden.locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    const firstDuplicate = await rowFor(page, '.duplicate');
    await firstDuplicate.locator('[data-act="eye"]').click();
    await expect(firstDuplicate.locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await (await rowFor(page, 'article')).locator('[data-act="eye"]').click();
    await (await rowFor(page, '#reused')).locator('[data-act="eye"]').click();

    await writeFile(file, after);
    await expect(page.frameLocator(canvasSelector).locator('#version')).toHaveText('新版本', { timeout: 20_000 });
    const hiddenAfter = await rowFor(page, '#hidden-target');
    await expect(hiddenAfter.locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(await rowFor(page, '#expanded-child')).toHaveAttribute('aria-expanded', 'true');
    await expect((await rowFor(page, '.duplicate')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'false');
    await expect((await rowFor(page, 'article')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await expect((await rowFor(page, '#reused')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('部分隱藏圖層無法確認對應，重新載入後已恢復顯示；請檢查圖層。')).toBeVisible();

    await page.locator('#btn-undo').click();
    await expect(page.frameLocator(canvasSelector).locator('#version')).toHaveText('舊版本');
    await expect((await rowFor(page, '#hidden-target')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(await rowFor(page, '#expanded-child')).toHaveAttribute('aria-expanded', 'true');
    await expect((await rowFor(page, '.duplicate')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await expect((await rowFor(page, '#reused')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#btn-redo').click();
    await expect(page.frameLocator(canvasSelector).locator('#version')).toHaveText('新版本');
    await expect((await rowFor(page, '#hidden-target')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(await rowFor(page, '#expanded-child')).toHaveAttribute('aria-expanded', 'true');
    await expect((await rowFor(page, '.duplicate')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'false');
    await expect((await rowFor(page, '#reused')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'false');

    // A deleted hidden element can still be brought back by an older undo step after document replacement.
    await page.evaluate(() => window.HE.ops.remove(window.HE.doc.model.querySelector('#hidden-target').getAttribute(window.HE.ID_ATTR)));
    await expect(page.frameLocator(canvasSelector).locator('#hidden-target')).toHaveCount(0);
    await page.evaluate(html => window.HE.ops.replaceDocument(html), '<!doctype html><html><body><p>其他文件</p></body></html>');
    await expect(page.frameLocator(canvasSelector).locator('p')).toHaveText('其他文件');
    await page.locator('#btn-undo').click();
    await expect.poll(() => page.evaluate(() => window.HE.doc.model.body.textContent.includes('新增段落'))).toBe(true);
    await expect(page.frameLocator(canvasSelector).locator('#hidden-target')).toHaveCount(0);
    await page.locator('#btn-undo').click();
    await expect.poll(() => page.evaluate(() => !!window.HE.doc.model.querySelector('#hidden-target'))).toBe(true);
    await expect((await rowFor(page, '#hidden-target')).locator('[data-act="eye"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.frameLocator(canvasSelector).locator('#hidden-target')).toHaveAttribute('data-he-hidden', '');
  } finally { await context.close(); }
});
