const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const report = fs.readFileSync(path.join(__dirname, '..', 'ingest', 'examples', 'zh-hant', 'report.html'), 'utf8');
const vectors = require('../ingest/test/fixtures/display-vectors.json');
const D14 = '2026Q3.xlsx/損益表/D14';

async function open(page, html) {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await page.evaluate((doc) => window.HE.ops.replaceDocument(doc), html);
  await expect(page.frameLocator(canvasSelector).locator('body')).toBeVisible();
  await page.evaluate(() => window.HE.prov.refresh());
}

/** The numbers as the editor sees them: [{status, text, factId}], in document order. */
const numbers = (page) => page.evaluate(() => { window.HE.prov.refresh(); return window.HE.prov.state().numbers.map((n) => ({ status: n.status, text: n.text, factId: n.factId })); });
const idOf = (page, selector) => page.evaluate((s) => window.HE.doc.idOf(window.HE.doc.body.querySelector(s)), selector);
const attrsOf = (page, selector) => page.evaluate((s) => {
  const el = window.HE.doc.body.querySelector(s);
  return { fact: el.getAttribute('data-fact'), was: el.getAttribute('data-fact-was'), text: el.textContent };
}, selector);
const showPane = (page) => page.locator('[data-tabs="right"] [data-tab="prov"]').click();

test('the editor and fill agree on every shared vector', async ({ page }) => {
  await page.goto('/dist/tactile.html');
  const got = await page.evaluate((v) => ({
    shown: v.shown.map((x) => window.HE.prov.shownText(x.fact, x.attrs)),
    rules: v.rules.map((x) => window.HE.prov.runRule(x.item, x.facts)),
  }), vectors);
  vectors.shown.forEach((v, i) => {
    if (v.error) expect(got.shown[i].error, JSON.stringify(v)).toBeTruthy();
    else expect(got.shown[i].text, JSON.stringify(v)).toBe(v.want);
  });
  vectors.rules.forEach((v, i) => {
    for (const [k, want] of Object.entries(v.want)) expect(got.rules[i][k], v.item.id + ' ' + k).toBe(want);
  });
});

test('a filled report: every number matches, the rules pass, and the pane says what was not checked', async ({ page }) => {
  await open(page, report);
  const list = await numbers(page);
  expect(list).toHaveLength(9);
  expect(list.every((n) => n.status === 'ok')).toBe(true);

  await showPane(page);
  const pane = page.locator('#prov-pane');
  await expect(pane).toContainText('尚未與來源檔核對');
  await expect(pane).not.toContainText('已驗證');
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  await expect(pane.locator('.prov-rule .prov-pill.prov-ok')).toHaveCount(2);
  await expect(pane).toContainText('確認人：林雅婷，2026-11-10');
  await expect(pane).toContainText('2026Q3.xlsx');
  await expect(page.locator('[data-tab="prov"] .prov-badge')).toHaveCount(0);

  // Nothing of the editor's marks reaches the saved file.
  const saved = await page.evaluate(() => window.HE.doc.serialize());
  expect(saved).not.toContain('__he_prov_css');
  expect(saved.match(/data-fact="/g)).toHaveLength(9);
});

test('clicking a number shows the cell it comes from, with the labels and the source value', async ({ page }) => {
  await open(page, report);
  const frame = page.frameLocator(canvasSelector);
  await frame.locator('tfoot [data-fact]').click();
  const pop = page.locator('#prov-pop');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('相符');
  await expect(pop).toContainText('尚未與來源檔核對');
  await expect(pop).toContainText('2026Q3.xlsx › 損益表 › D14');
  await expect(pop).toContainText('482,000,000');
  await expect(pop).toContainText('=SUM(D10:D13)');
  await expect(pop).toContainText('營業收入合計');
  await expect(pop.locator('.prov-restore')).toHaveCount(0);

  await frame.locator('h1').click();
  await expect(pop).toBeHidden();

  await showPane(page);
  await page.locator('#prov-pane .prov-row[data-id]').first().click();
  await expect(pop).toBeVisible();
});

test('a number from a Word document or a PDF says how its value was read', async ({ page }) => {
  await open(page, fs.readFileSync(path.join(__dirname, '..', 'ingest', 'examples', 'zh-hant', 'word-report.html'), 'utf8'));
  expect((await numbers(page)).every((n) => n.status === 'ok')).toBe(true);
  const frame = page.frameLocator(canvasSelector);
  await frame.locator('p [data-fact="2026Q3.docx/t2/B3"]').click();
  const pop = page.locator('#prov-pop');
  await expect(pop).toContainText('2026Q3.docx › t2 › B3');
  await expect(pop).toContainText('營業成本');
  await expect(pop.locator('.prov-kind')).toHaveText('來源是 Word 文件。Word 只儲存文字，這個數值是程式從文字解析出來的。');

  // A number from a PDF says that its place was worked out as well.
  await open(page, fs.readFileSync(path.join(__dirname, '..', 'ingest', 'examples', 'zh-hant', 'pdf-report.html'), 'utf8'));
  expect((await numbers(page)).every((n) => n.status === 'ok')).toBe(true);
  await page.frameLocator(canvasSelector).locator('p [data-fact="2026Q3.pdf/p1/B14"]').click();
  await expect(pop).toContainText('2026Q3.pdf › p1 › B14');
  await expect(pop.locator('.prov-kind')).toHaveText('來源是 PDF。PDF 沒有儲存表格：這個數值的行與欄是程式從座標推算的，數值是從文字解析出來的。');

  // A number from a workbook carries no such note.
  await open(page, report);
  await page.frameLocator(canvasSelector).locator('tfoot [data-fact]').click();
  await expect(pop).toContainText('2026Q3.xlsx › 損益表 › D14');
  await expect(pop.locator('.prov-kind')).toHaveCount(0);
});

test('changing a cited number marks it as off its source in the same undo step; restoring brings it back', async ({ page }) => {
  await open(page, report);
  const sel = 'tfoot td:last-child';
  const id = await idOf(page, sel);
  const undoDepth = () => page.evaluate(() => window.HE.history.undoStack.length);
  const before = await undoDepth();

  await page.evaluate((i) => window.HE.ops.setText(i, '500.0'), id);
  expect(await attrsOf(page, sel)).toEqual({ fact: null, was: D14, text: '500.0' });
  expect(await undoDepth()).toBe(before + 1);
  expect((await numbers(page)).filter((n) => n.status === 'was')).toHaveLength(1);
  await expect(page.locator('[data-tab="prov"] .prov-badge')).toHaveText('1');
  const outline = await page.frameLocator(canvasSelector).locator(sel).evaluate((el) => getComputedStyle(el).outlineColor);
  expect(outline).toBe('rgb(201, 138, 0)');

  await page.evaluate(() => window.HE.history.undo());
  expect(await attrsOf(page, sel)).toEqual({ fact: D14, was: null, text: '482.0' });

  await page.evaluate((i) => window.HE.ops.setText(i, '500.0'), id);
  await page.frameLocator(canvasSelector).locator(sel).click();
  const pop = page.locator('#prov-pop');
  await expect(pop).toContainText('已偏離來源');
  await expect(pop).toContainText('482.0');
  const depth = await undoDepth();
  await pop.locator('.prov-restore').click();
  expect(await attrsOf(page, sel)).toEqual({ fact: D14, was: null, text: '482.0' });
  expect(await undoDepth()).toBe(depth + 1);
  expect((await numbers(page)).every((n) => n.status === 'ok')).toBe(true);

  // Writing the same value again is not a departure.
  await page.evaluate((i) => window.HE.ops.setText(i, ' 482.0 '), id);
  expect((await attrsOf(page, sel)).fact).toBe(D14);
});

test('typing over a number on the page marks it too', async ({ page }) => {
  await open(page, report);
  const sel = 'tfoot td:last-child';
  const id = await idOf(page, sel);
  expect(await page.evaluate((i) => window.HE.canvas.startTextEdit(i, { selectAll: true }), id)).toBe(true);
  await page.keyboard.type('777');
  await page.evaluate(() => window.HE.canvas.endTextEdit(true));
  expect(await attrsOf(page, sel)).toEqual({ fact: null, was: D14, text: '777' });
  await page.evaluate(() => window.HE.history.undo());
  expect(await attrsOf(page, sel)).toEqual({ fact: D14, was: null, text: '482.0' });
});

test('a report changed outside the editor: wrong text, unknown ID and a broken rule are all flagged', async ({ page }) => {
  const bad = report
    .replace('>482.0</td>', '>490.0</td>')
    .replace('data-fact="2026Q3.xlsx/損益表/D20"', 'data-fact="2026Q3.xlsx/損益表/Z99"')
    .replace(/("2026Q3\.xlsx\/損益表\/D10": \{\s*"type": "number",\s*"value": )\d+/, '$1 1');
  expect(bad).not.toBe(report);
  await open(page, bad);
  const list = await numbers(page);
  expect(list.filter((n) => n.status === 'mismatch').map((n) => n.text).sort()).toEqual(['142.0', '490.0']);
  expect(list.filter((n) => n.status === 'missing')).toHaveLength(1);

  const frame = page.frameLocator(canvasSelector);
  expect(await frame.locator('tfoot td:last-child').evaluate((el) => getComputedStyle(el).outlineColor)).toBe('rgb(192, 53, 46)');

  await showPane(page);
  const pane = page.locator('#prov-pane');
  const broken = pane.locator('.prov-rule', { hasText: '營收合計' });
  await expect(broken.locator('.prov-pill')).toHaveText('違反');
  await expect(broken).toContainText('482,000,000');
  await expect(broken).toContainText('差距');
  await expect(pane.locator('.prov-sec', { hasText: '需要看的數字' }).locator('.prov-row')).toHaveCount(3);
  await expect(page.locator('[data-tab="prov"] .prov-badge')).toHaveText('4');

  await frame.locator('tfoot td:last-child').click();
  const pop = page.locator('#prov-pop');
  await expect(pop).toContainText('不符');
  await pop.locator('.prov-restore').click();
  expect(await attrsOf(page, 'tfoot td:last-child')).toEqual({ fact: D14, was: null, text: '482.0' });
});

test('a block that cannot be read is reported, and text from the source never becomes markup in the editor', async ({ page }) => {
  await open(page, report.replace('"tactileProvenance": 1', '"tactileProvenance": 2'));
  await showPane(page);
  await expect(page.locator('#prov-pane .prov-error')).toContainText('版本');
  expect((await numbers(page)).every((n) => n.status === 'missing')).toBe(true);

  const evil = report.replace(/"row": "營業收入合計"/, '"row": "\\u003cimg src=x onerror=window.__pwned=1\\u003e"');
  expect(evil).not.toBe(report);
  await open(page, evil);
  await page.frameLocator(canvasSelector).locator('tfoot [data-fact]').click();
  await expect(page.locator('#prov-pop')).toContainText('<img src=x');
  expect(await page.locator('#prov-pop img').count()).toBe(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('a document without provenance gets no marks and no list of numbers', async ({ page }) => {
  await open(page, '<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body><p>2026 年賣出 1,200 件</p></body></html>');
  await showPane(page);
  await expect(page.locator('#prov-pane')).toContainText('這份文件沒有出處資料');
  await expect(page.locator('#prov-pane .prov-row')).toHaveCount(0);
  expect(await page.evaluate(() => !!window.HE.live.doc.getElementById('__he_prov_css'))).toBe(false);
});

test('a report with charts: the numbers on a chart are checked, a bar shows its cell, and the file still verifies after the editor', async ({ page }) => {
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const charts = fs.readFileSync(path.join(__dirname, '..', 'ingest', 'examples', 'zh-hant', 'charts.html'), 'utf8');
  await open(page, charts);
  const list = await numbers(page);
  expect(list.length).toBeGreaterThan(20);
  expect(list.every((n) => n.status === 'ok')).toBe(true);
  expect(await page.evaluate(() => window.HE.prov.state().uncited.length)).toBe(0);

  const frame = page.frameLocator(canvasSelector);
  await frame.locator('path[data-chart-fact="2026Q3.xlsx/損益表/D11"]').first().click();
  const pop = page.locator('#prov-pop');
  await expect(pop).toContainText('圖表的圖形');
  await expect(pop).toContainText('2026Q3.xlsx › 損益表 › D11');
  await expect(pop).toContainText('配送服務');
  await expect(pop).toContainText('編輯器不檢查圖形的大小與位置');
  await expect(pop.locator('.prov-restore')).toHaveCount(0);
  await showPane(page);
  await expect(page.locator('#prov-pane')).toContainText('圖表的圖形 23 個');

  // What the editor saves is still the drawing verify expects, and a number changed on a chart is caught by both.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-chart-'));
  const cli = path.join(__dirname, '..', 'ingest', 'bin', 'tactile-ingest.mjs');
  const verify = (name, html) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, html);
    return spawnSync(process.execPath, [cli, 'verify', file, '--source', path.join(__dirname, '..', 'ingest', 'test', 'fixtures', '2026Q3.xlsx')], { encoding: 'utf8' });
  };
  try {
    const saved = verify('saved.html', await page.evaluate(() => window.HE.doc.serialize()));
    expect(saved.stdout).toContain('圖表 4 張：相符 4，不符 0');
    expect(saved.status).toBe(0);

    // A number changed inside a chart: verify finds the chart, and the editor shows the number without offering
    // to restore it, because a drawing is one object to the editor.
    const bad = charts.replace('>236.0</text>', '>263.0</text>');
    expect(bad).not.toBe(charts);
    const edited = verify('edited.html', bad);
    expect(edited.status).toBe(1);
    expect(edited.stdout).toContain('圖表 4 張：相符 3，不符 1');
    await open(page, bad);
    const wrong = (await numbers(page)).filter((n) => n.status === 'mismatch');
    expect(wrong.map((n) => n.text)).toEqual(['263.0']);
    await expect(page.locator('[data-tab="prov"] .prov-badge')).toHaveText('1');
    await showPane(page);
    await page.locator('#prov-pane .prov-sec', { hasText: '需要看的數字' }).locator('.prov-row').click();
    await expect(pop).toContainText('不符');
    await expect(pop).toContainText('236.0');
    await expect(pop).toContainText('請重新執行 fill');
    await expect(pop.locator('.prov-restore')).toHaveCount(0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
