const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const BOOKS = ['ingest/test/fixtures/2026Q3.xlsx', 'ingest/test/fixtures/shared.xlsx', 'ingest/examples/traceable/2026Q3.xlsx', 'ingest/examples/traceable-zh-hans/2026Q3.xlsx'];

/** What the command-line tool reads from the same bytes. */
async function byIngest(file) {
  const { readWorkbook } = await import(pathToFileURL(path.join(root, 'ingest', 'src', 'ingest.mjs')).href);
  return readWorkbook(fs.readFileSync(path.join(root, file)), path.basename(file));
}
/** What the editor reads: the file goes in as a File, as a drop would hand it over. */
const byEditor = (page, file, method = 'read') => page.evaluate(async ([b64, name, m]) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return window.HE.sources[m](new File([bytes], name));
}, [fs.readFileSync(path.join(root, file)).toString('base64'), path.basename(file), method]);

test('the editor reads a workbook into the same facts as tactile-ingest, field for field', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  expect(await page.evaluate(() => window.HE.sources.available)).toBe(true);
  for (const file of BOOKS) {
    const want = await byIngest(file);
    const got = await byEditor(page, file);
    expect(got.source, file).toEqual(want.source);
    expect(got.facts.length, file).toBe(want.facts.length);
    expect(got.facts, file).toEqual(JSON.parse(JSON.stringify(want.facts)));
  }
});

test('the reader the editor runs is the one ingest runs, and the built files are up to date with it', () => {
  const from = fs.readFileSync(path.join(root, 'ingest/src/workbook.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const made = fs.readFileSync(path.join(root, 'src/js/workbook-core.js'), 'utf8').replace(/\r\n/g, '\n');
  expect(made).toContain(from.replace('export function workbookReader(', 'function workbookReader('));
  // The library is the file of the package ingest installs, byte for byte.
  const mine = fs.readFileSync(path.join(root, 'src/js/vendor/xlsx.mini.min.js'));
  const theirs = path.join(root, 'ingest/node_modules/xlsx/dist/xlsx.mini.min.js');
  if (fs.existsSync(theirs)) expect(mine.equals(fs.readFileSync(theirs))).toBe(true);
  expect(mine.toString('utf8')).toContain('0.20.3');
});

test('a dropped workbook becomes a source of the tab and leaves the document alone', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  const before = await page.evaluate(() => window.HE.doc.serialize());
  await page.evaluate(([b64, name]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const e = new Event('drop', { bubbles: true, cancelable: true });
    e.dataTransfer = { types: ['Files'], files: [new File([bytes], name)], items: [] };
    window.dispatchEvent(e);
  }, [fs.readFileSync(path.join(root, BOOKS[0])).toString('base64'), '2026Q3.xlsx']);
  await expect(page.locator('.toast').last()).toContainText('已讀取「2026Q3.xlsx」');
  await expect(page.locator('.toast').last()).toContainText('現在可以請 AI 用這些數字寫報告');
  const all = await page.evaluate(() => window.HE.sources.all().map((s) => ({ file: s.source.file, sheets: s.source.sheets.length, cells: s.facts.length })));
  const want = await byIngest(BOOKS[0]);
  expect(all).toEqual([{ file: '2026Q3.xlsx', sheets: want.source.sheets.length, cells: want.facts.length }]);
  await expect(page.locator('.toast').last()).toContainText(want.source.sheets.length + ' 張工作表、' + want.facts.length + ' 個儲存格');
  const id = want.facts.find((f) => f.formula).id;
  expect(await page.evaluate((i) => window.HE.sources.fact(i), id)).toEqual(JSON.parse(JSON.stringify(want.facts.find((f) => f.id === id))));
  expect(await page.evaluate(() => window.HE.doc.serialize())).toBe(before);
});

test('a workbook that cannot be read says why, as the command-line tool does', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  const fail = (file, name) => page.evaluate(async ([b64, n]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    try { await window.HE.sources.add(new File([bytes], n)); return 'no error'; }
    catch (err) { return (err instanceof window.HE.sources.SourceError ? 'SourceError: ' : 'other: ') + err.message; }
  }, [fs.readFileSync(path.join(root, file)).toString('base64'), name || path.basename(file)]);
  // A formula whose result the file does not hold: a guess would be a number nobody computed.
  expect(await fail('ingest/test/fixtures/no-cached-values.xlsx')).toMatch(/^SourceError: .*有公式.*沒有計算結果/);
  expect(await fail('tests/sources.spec.js', 'not-a-workbook.xlsx')).toMatch(/^SourceError: .*不是 \.xlsx 格式/);
  expect(await fail('tests/sources.spec.js', 'table.csv')).toBe('SourceError: 「table.csv」不是 .xlsx 檔案');
  expect(await page.evaluate(() => window.HE.sources.all().length)).toBe(0);
});
