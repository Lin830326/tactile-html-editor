const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';

test('the icons the notice counts are the icons the editor has', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  const names = await page.evaluate(() => window.HE.ui.iconNames());
  const notice = read('THIRD_PARTY_NOTICES.md');
  // An icon added without a word in the notice changes the first number and not the others.
  const total = +/\(`ICONS`\), (\d+) icons\./.exec(notice)[1];
  expect(names.length).toBe(total);
  const identical = +/- (\d+) are identical to a Lucide icon/.exec(notice)[1];
  const partly = +/- (\d+) share one or two strokes/.exec(notice)[1];
  const none = +/- The other (\d+) share no stroke/.exec(notice)[1];
  const later = [...notice.matchAll(/- (\d+) icons? (?:was|were) added on \d{4}-\d{2}-\d{2}/g)].reduce((n, m) => n + +m[1], 0);
  expect(identical + partly + none + later).toBe(total);
  // Every icon the notice names exists.
  const named = [...notice.matchAll(/([a-z][a-z-]*) \(Lucide: [a-z-]+\)/g)].map((m) => m[1]);
  expect(named.length).toBe(identical + partly + later);
  for (const n of named) expect(names, n).toContain(n);
});

test('both built files carry the whole MIT licence and the whole Lucide notice at the top', () => {
  const licence = read('LICENSE').trim();
  const lucide = read('licenses/LUCIDE.txt').trim();
  expect(lucide).toContain('ISC License');
  expect(lucide).toContain('Lucide Icons and Contributors');
  for (const f of ['dist/tactile.html', 'dist/artifact.html']) {
    const built = read(f);
    const head = built.slice(0, built.indexOf('-->'));
    expect(head.length, f).toBeGreaterThan(1000);
    expect(head, f).toContain(licence);
    expect(head, f).toContain(lucide);
    expect(head, f).toContain(read('licenses/SHEETJS.txt').trim());
  }
  // The notice file points at the text that is shipped.
  expect(read('THIRD_PARTY_NOTICES.md')).toContain('licenses/LUCIDE.txt');
});

test('dropping a spreadsheet says what reads it; any other file names what can be dropped', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  const drop = (name, type) => page.evaluate(([n, t]) => {
    const e = new Event('drop', { bubbles: true, cancelable: true });
    e.dataTransfer = { types: ['Files'], files: [new File(['x'], n, { type: t })], items: [] };
    window.dispatchEvent(e);
  }, [name, type]);
  await drop('2026Q3.pdf', 'application/pdf');
  await expect(page.locator('.toast').last()).toContainText('編輯器還不能直接讀取「2026Q3.pdf」');
  await expect(page.locator('.toast').last()).toContainText('tactile-ingest');
  await drop('2026Q3.csv', 'text/csv');
  await expect(page.locator('.toast').last()).toContainText('請先用 Excel 把「2026Q3.csv」另存成 .xlsx');
  await drop('notes.zip', 'application/zip');
  await expect(page.locator('.toast').last()).toHaveText(/無法開啟「notes\.zip」：只能拖放 HTML 檔或圖片/);
});
