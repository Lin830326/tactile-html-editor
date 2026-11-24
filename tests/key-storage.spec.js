const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const editorFile = pathToFileURL(path.join(__dirname, '..', 'dist', 'tactile.html')).href;
const SECRET = 'sk-ant-test-0000-not-a-real-key';
const stored = (page) => page.evaluate(() => localStorage.getItem('tactile:settings') || '');

async function ready(page) {
  await expect(page.locator(canvasSelector)).toBeVisible();
  await page.waitForFunction(() => window.HE && window.HE.settings && window.HE.doc && window.HE.doc.model);
}

test('from a web address the key is stored as before', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await ready(page);
  expect(await page.evaluate(() => window.HE.settings.secretsInMemoryOnly)).toBe(false);
  await page.evaluate((k) => window.HE.settings.set('ai.anthropic.key', k), SECRET);
  expect(await stored(page)).toContain(SECRET);
  await page.reload();
  await ready(page);
  expect(await page.evaluate(() => window.HE.settings.get('ai.anthropic.key', ''))).toBe(SECRET);
});

test('from disk the key stays in memory: storage never holds it, and another file from disk cannot read it', async ({ page, context }) => {
  await page.goto(editorFile);
  await ready(page);
  expect(await page.evaluate(() => window.HE.settings.secretsInMemoryOnly)).toBe(true);

  const kept = await page.evaluate((k) => {
    window.HE.settings.set('ai.anthropic.model', 'claude-haiku-5-5');
    window.HE.settings.set('ai.anthropic.key', k);
    window.HE.settings.set('ai.openai.key', k + '-2');
    return window.HE.settings.get('ai.anthropic.key', '');
  }, SECRET);
  expect(kept).toBe(SECRET);
  const text = await stored(page);
  expect(text).not.toContain(SECRET);
  expect(text).toContain('claude-haiku-5-5');

  // Any other page opened from disk shares this storage in Chromium. It finds the settings, without the keys.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-key-'));
  try {
    const other = path.join(dir, 'other.html');
    fs.writeFileSync(other, '<!doctype html><title>other</title><body>another page from disk</body>');
    const spy = await context.newPage();
    await spy.goto(pathToFileURL(other).href);
    const everything = () => spy.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k)).join(' '));
    // The storage really is shared: the other page finds the model name (a write reaches other pages after a moment).
    await expect.poll(everything).toContain('claude-haiku-5-5');
    expect(await everything()).not.toContain(SECRET);
    await spy.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  await page.reload();
  await ready(page);
  expect(await page.evaluate(() => window.HE.settings.get('ai.anthropic.key', ''))).toBe('');
  expect(await page.evaluate(() => window.HE.settings.get('ai.anthropic.model', ''))).toBe('claude-haiku-5-5');
  expect(await page.evaluate(() => window.HE.settings.removedStoredSecrets)).toBe(false);
});

test('a key stored by an earlier version is removed from storage on the first load from disk, and the user is told', async ({ page }) => {
  await page.goto(editorFile);
  await ready(page);
  await page.evaluate((k) => localStorage.setItem('tactile:settings', JSON.stringify({ 'ai.anthropic.key': k, 'ai.anthropic.effort': 'low' })), SECRET);
  await page.reload();
  await ready(page);
  expect(await stored(page)).not.toContain(SECRET);
  expect(await stored(page)).toContain('"ai.anthropic.effort":"low"');
  expect(await page.evaluate(() => window.HE.settings.removedStoredSecrets)).toBe(true);
  // The key still works in this tab, so nothing breaks mid-session.
  expect(await page.evaluate(() => window.HE.settings.get('ai.anthropic.key', ''))).toBe(SECRET);
  await expect(page.locator('body')).toContainText('已經把 AI 金鑰從瀏覽器的儲存空間移除');
});

test('from disk, a service address changed by another page is shown and must be agreed to before anything is sent', async ({ page, context }) => {
  const sentTo = [];
  await context.route(/evil\.invalid|127\.0\.0\.1:59321\b/, async (route) => { sentTo.push(route.request().url()); await route.fulfill({ status: 500, body: 'no' }); });
  await page.goto(editorFile);
  await ready(page);

  // Another page opened from disk rewrites the shared settings.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-key-'));
  try {
    const other = path.join(dir, 'other.html');
    fs.writeFileSync(other, '<!doctype html><title>other</title><body>another page from disk</body>');
    const attacker = await context.newPage();
    await attacker.goto(pathToFileURL(other).href);
    await attacker.evaluate(() => localStorage.setItem('tactile:settings', JSON.stringify({
      'ai.provider': 'openai', 'ai.openai.base': 'https://evil.invalid/v1', 'ai.openai.model': 'm',
    })));
    await attacker.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  await expect.poll(async () => { await page.reload(); await ready(page); return page.evaluate(() => window.HE.settings.get('ai.openai.base', '')); }).toBe('https://evil.invalid/v1');

  // The connection test in the settings does not send a key to an address the user did not type: it asks first.
  await page.locator('#btn-ai-settings').click();
  await page.locator('#ai-set-openai-key').fill('sk-typed-after-reload');
  await page.locator('#ai-set-test').click();
  await expect(page.locator('#ai-set-test-result')).toContainText('不是你這次填的：https://evil.invalid/v1');
  expect(sentTo).toEqual([]);
  await page.locator('.modal').getByRole('button', { name: '取消' }).click();
  await page.reload();
  await ready(page);

  const modal = page.locator('.modal', { hasText: '確認 AI 服務的網址' });
  let run = page.evaluate(() => window.HE.ai.run('把標題改成藍色'));
  await expect(modal).toContainText('https://evil.invalid/v1');
  expect(sentTo).toEqual([]);
  await modal.getByRole('button', { name: '取消' }).click();
  expect(await run).toBe(false);
  expect(sentTo).toEqual([]);

  // Agreeing sends it, and the same address is not asked about again in this tab.
  run = page.evaluate(() => window.HE.ai.run('把標題改成藍色'));
  await modal.getByRole('button', { name: '是我填的，送出' }).click();
  await run;
  expect(sentTo.length).toBeGreaterThan(0);
  expect(sentTo.every((u) => u.startsWith('https://evil.invalid/v1/'))).toBe(true);
  const before = sentTo.length;
  await page.evaluate(() => window.HE.ai.run('再改成綠色'));
  await expect(modal).toHaveCount(0);
  expect(sentTo.length).toBeGreaterThan(before);

  // An address on this computer is not asked about.
  await page.evaluate(() => window.HE.settings.set('ai.openai.base', 'http://127.0.0.1:59321/v1'));
  const local = sentTo.length;
  await page.evaluate(() => window.HE.ai.run('第三次'));
  await expect(modal).toHaveCount(0);
  expect(sentTo.slice(local).every((u) => u.startsWith('http://127.0.0.1:59321/v1/'))).toBe(true);
  expect(sentTo.length).toBeGreaterThan(local);
});

const MARK = 'CONFIDENTIAL-FIGURE-0000';
const docOf = (extra = '') => '<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body><h1>' + MARK + '</h1>' + extra + '</body></html>';
const all = (page, area) => page.evaluate((a) => { const s = window[a]; return Object.keys(s).map((k) => k + '=' + s.getItem(k)).join('\n'); }, area);
const title = (page) => page.evaluate(() => { const h = window.HE.live.doc && window.HE.live.doc.querySelector('h1'); return h ? h.textContent : ''; });

test('from a web address the autosaved document is in localStorage, where a new tab finds it', async ({ page, context }) => {
  await page.goto('/dist/tactile.html');
  await ready(page);
  expect(await page.evaluate((html) => window.HE.fileio.openText(html, 'secret.html'), docOf())).toBe(true);
  await expect.poll(() => all(page, 'localStorage')).toContain(MARK);
  expect(await all(page, 'sessionStorage')).not.toContain(MARK);
  // The tab gives up its mark (tactile:open:<id>) on pagehide, and a record whose mark is left is held for 3 minutes
  // as another tab's. Playwright's Firefox, when busy, closes a tab without that write arriving (3 runs in 40), so
  // the event is sent here and the mark is seen gone before the tab closes.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(() => all(page, 'localStorage')).not.toContain('tactile:open:');
  await page.close();
  const next = await context.newPage();
  await next.goto('/dist/tactile.html');
  await ready(next);
  await expect.poll(() => title(next)).toBe(MARK);
});

test('from disk the autosaved document stays in its tab: no other page from disk can read it, and a reload restores it', async ({ page, context }) => {
  await page.goto(editorFile);
  await ready(page);
  expect(await page.evaluate((html) => window.HE.fileio.openText(html, 'secret.html'), docOf())).toBe(true);
  await expect.poll(() => all(page, 'sessionStorage')).toContain(MARK);
  expect(await all(page, 'localStorage')).not.toContain(MARK);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-doc-'));
  try {
    const other = path.join(dir, 'other.html');
    fs.writeFileSync(other, '<!doctype html><title>other</title><body>another page from disk</body>');
    const spy = await context.newPage();
    await spy.goto(pathToFileURL(other).href);
    // The shared storage is reachable (the mark of the open tab is there); the document is not in it.
    await expect.poll(() => all(spy, 'localStorage')).toContain('tactile:open:');
    expect(await all(spy, 'localStorage')).not.toContain(MARK);
    expect(await all(spy, 'sessionStorage')).not.toContain(MARK);
    await spy.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  await page.reload();
  await ready(page);
  await expect.poll(() => title(page)).toBe(MARK);
  expect(await page.evaluate(() => window.HE.doc.name)).toBe('secret.html');

  // A new tab starts with the sample: the document of another tab is not offered to it.
  const fresh = await context.newPage();
  await fresh.goto(editorFile);
  await ready(fresh);
  expect(await title(fresh)).not.toBe(MARK);
  expect(await all(fresh, 'sessionStorage')).not.toContain(MARK);
});

test('from disk, a record left in the shared storage is restored once, without its permission to run scripts, and moved into the tab', async ({ page, context }) => {
  await page.goto(editorFile);
  await ready(page);
  // What an earlier version stored, or what another page from disk planted: a record that claims to be trusted.
  await page.evaluate((html) => {
    localStorage.setItem('tactile:autosave:planted1', JSON.stringify({ v: 1, name: 'old.html', time: Date.now(), dirty: true, trusted: true, html }));
  }, docOf('<script>window.ran = 1</script>'));
  await page.close();

  const next = await context.newPage();
  await next.goto(editorFile);
  await ready(next);
  await expect.poll(() => title(next)).toBe(MARK);
  expect(await next.evaluate(() => window.HE.doc.trusted)).toBe(false);
  await expect.poll(() => all(next, 'sessionStorage')).toContain(MARK);
  expect(await all(next, 'localStorage')).not.toContain(MARK);
});
