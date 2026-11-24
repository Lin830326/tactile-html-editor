const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const BOOK = 'ingest/test/fixtures/2026Q3.xlsx';
const TOTAL = '2026Q3.xlsx/損益表/D14'; // =SUM(D10:D13), 482,000,000
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };

async function open(page) {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await page.evaluate(() => window.HE.ops.replaceDocument('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>報告</title></head><body><h1>季報</h1><p id="lead">摘要</p></body></html>'));
  await expect(page.frameLocator(canvasSelector).locator('h1')).toBeVisible();
  await page.evaluate(async ([b64, name]) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    await window.HE.sources.add(new File([bytes], name));
    window.HE.settings.set('ai.provider', 'anthropic');
    window.HE.settings.set('ai.anthropic.key', 'test-key-for-mocked-api');
  }, [fs.readFileSync(path.join(root, BOOK)).toString('base64'), '2026Q3.xlsx']);
}
/** The model's turns, one tool call each, then a closing sentence. */
async function script(page, calls) {
  const requests = [];
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const use = calls[requests.length - 1];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(use
      ? { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_' + requests.length, name: use.name, input: typeof use.input === 'function' ? await use.input() : use.input }] }
      : { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '完成。' }] }) });
  });
  return requests;
}
const lastResult = (req) => { const c = req.messages.at(-1).content[0]; return { error: !!c.is_error, data: (() => { try { return JSON.parse(c.content); } catch (e) { return c.content; } })() }; };

test('the AI reads the workbook, cites a cell, and the report it leaves passes tactile-ingest verify at level 3', async ({ page }) => {
  await open(page);
  const lead = () => page.evaluate(() => window.HE.doc.model.querySelector('#lead').getAttribute('data-he-id'));
  const requests = await script(page, [
    { name: 'list_sources', input: {} },
    { name: 'find_cells', input: { query: '合計' } },
    { name: 'read_cells', input: { file: '2026Q3.xlsx', sheet: '損益表', range: 'A9:D14' } },
    { name: 'replace_html', input: async () => ({ id: await lead(), html: '<p id="lead">本季營業收入 <b data-fact="' + TOTAL + '" data-fact-scale="1e-8" data-fact-digits="2"></b> 億元，資料日期 <span data-fact="2026Q3.xlsx/損益表/B2"></span>。</p>' }) },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('用來源檔寫一句摘要'))).toBe(true);

  // The request says which files there are; the tools answer with ids to cite, not with a page of numbers to copy.
  const first = requests[0].messages.at(-1).content;
  expect(typeof first === 'string' ? first : first.map((c) => c.text || '').join('\n')).toContain('Sources: 2026Q3.xlsx (sheets: ');
  expect(requests[0].system).toContain('NEVER type a value that comes from a source file');
  expect(lastResult(requests[1]).data.sources[0]).toMatchObject({ file: '2026Q3.xlsx' });
  expect(lastResult(requests[2]).data.cells.some((c) => c.id === TOTAL)).toBe(true);
  const total = lastResult(requests[3]).data.cells.find((c) => c.id === TOTAL);
  expect(total).toMatchObject({ type: 'number', value: 482000000, formula: '=SUM(D10:D13)' });
  expect(lastResult(requests[4]).data.fill_problems).toBeUndefined();

  // The editor wrote the numbers: the model sent empty elements.
  const frame = page.frameLocator(canvasSelector);
  await expect(frame.locator('#lead b')).toHaveText('4.82');
  await expect(frame.locator('#lead span')).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
  const block = await page.evaluate(() => JSON.parse(window.HE.doc.model.querySelector('script#tactile-provenance').textContent));
  expect(Object.keys(block.facts).sort()).toEqual(['2026Q3.xlsx/損益表/B2', TOTAL].sort());
  expect(block.facts[TOTAL]).toMatchObject({ type: 'number', value: 482000000, formula: 'SUM(D10:D13)' });
  expect(block.sources).toHaveLength(1);
  expect(block.sources[0].sha256).toMatch(/^[0-9a-f]{64}$/);
  // The document's scripts were not stopped by the block: it is data.
  expect(await page.evaluate(() => window.HE.doc.trusted)).toBe(true);

  // The panel knows the numbers, and one undo takes the whole AI step back, numbers and block together.
  await page.locator('[data-tabs="right"] [data-tab="prov"]').click();
  await expect(page.locator('#prov-pane')).toContainText('2 相符');

  // The command-line tool reads the workbook again and agrees with every number.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-fill-'));
  try {
    const report = path.join(dir, 'report.html');
    fs.writeFileSync(report, await page.evaluate(() => window.HE.doc.serialize()));
    let out;
    try { out = execFileSync(process.execPath, [path.join(root, 'ingest/bin/tactile-ingest.mjs'), 'verify', report, '--source', path.join(root, BOOK)], { encoding: 'utf8', stdio: 'pipe' }); }
    catch (err) { out = 'FAILED\n' + err.stdout + err.stderr; }
    expect(out).toContain('第 3 級 重新擷取：通過');
    expect(out).toContain('相符 2，不符 0，找不到 0');
    expect(out).toContain('結果：通過。做到第 3 級');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  await page.evaluate(() => window.HE.history.undo());
  expect(await page.evaluate(() => !!window.HE.doc.model.querySelector('script#tactile-provenance'))).toBe(false);
  await expect(frame.locator('#lead')).toHaveText('摘要');
});

test('a citation the editor cannot fill is said to the model, and a wrong sheet or range is refused', async ({ page }) => {
  await open(page);
  const lead = () => page.evaluate(() => window.HE.doc.model.querySelector('#lead').getAttribute('data-he-id'));
  const requests = await script(page, [
    { name: 'read_cells', input: { file: '2026Q3.xlsx', sheet: '不存在' } },
    { name: 'read_cells', input: { file: '2026Q3.xlsx', sheet: '損益表', range: 'not a range' } },
    { name: 'replace_html', input: async () => ({ id: await lead(), html: '<p id="lead">甲 <b data-fact="2026Q3.xlsx/損益表/ZZ99"></b> 乙 <i data-fact="' + TOTAL + '" data-fact-digits="99"></i></p>' }) },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('寫摘要'))).toBe(true);
  expect(lastResult(requests[1])).toMatchObject({ error: true });
  expect(lastResult(requests[1]).data).toContain('has no sheet named');
  expect(lastResult(requests[2]).data).toContain('is not a range');
  const problems = lastResult(requests[3]).data.fill_problems;
  expect(problems).toHaveLength(2);
  expect(problems[0]).toContain('2026Q3.xlsx/損益表/ZZ99');
  expect(problems[1]).toContain('data-fact-digits');
  // Nothing was guessed: both elements stay empty, and no block is written for facts that were not found.
  const frame = page.frameLocator(canvasSelector);
  await expect(frame.locator('#lead b')).toHaveText('');
  await expect(frame.locator('#lead i')).toHaveText('');
  expect(await page.evaluate(() => !!window.HE.doc.model.querySelector('script#tactile-provenance'))).toBe(false);
});

test('a number the user typed over is left alone, and a refill brings a citation back to its source', async ({ page }) => {
  await open(page);
  await page.evaluate((id) => {
    const lead = window.HE.doc.model.querySelector('#lead').getAttribute('data-he-id');
    window.HE.ops.replaceHTML(lead, '<p id="lead">營收 <b data-fact="' + id + '">999</b></p>');
    window.HE.fill.run();
  }, TOTAL);
  const b = page.frameLocator(canvasSelector).locator('#lead b');
  // No conversion was asked for: the workbook's own text of the cell is shown.
  const shown = await b.textContent();
  expect(shown).not.toBe('999');
  expect(shown.replace(/,/g, '')).toContain('482');
  // Filling again changes nothing and records no step.
  const before = await page.evaluate(() => window.HE.doc.serialize());
  expect(await page.evaluate(() => window.HE.fill.run())).toMatchObject({ filled: 0, problems: [] });
  expect(await page.evaluate(() => window.HE.doc.serialize())).toBe(before);
});
