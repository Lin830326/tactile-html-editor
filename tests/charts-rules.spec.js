const { test, expect } = require('@playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const BOOK = path.join(root, 'ingest/test/fixtures/2026Q3.xlsx');
const P = '2026Q3.xlsx/損益表/';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
const BLANK = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>報告</title></head><body><h1>季報</h1><p id="lead">摘要</p></body></html>';

async function open(page, html = BLANK, book = true) {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await page.evaluate((doc) => window.HE.ops.replaceDocument(doc), html);
  await expect(page.frameLocator(canvasSelector).locator('body')).toBeVisible();
  await page.evaluate(async ([b64, name]) => {
    if (b64) await window.HE.sources.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], name));
    window.HE.settings.set('ai.provider', 'anthropic');
    window.HE.settings.set('ai.anthropic.key', 'test-key-for-mocked-api');
  }, [book ? fs.readFileSync(BOOK).toString('base64') : '', '2026Q3.xlsx']);
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
const leadId = (page) => page.evaluate(() => window.HE.doc.model.querySelector('#lead').getAttribute('data-he-id'));
const serialize = (page) => page.evaluate(() => window.HE.doc.serialize());
const block = (page) => page.evaluate(() => { const el = window.HE.doc.model.querySelector('script#tactile-provenance'); return el ? JSON.parse(el.textContent) : null; });
const steps = (page) => page.evaluate(() => window.HE.history.undoStack.length);
const showPane = (page) => page.locator('[data-tabs="right"] [data-tab="prov"]').click();

/** `tactile-ingest verify --json` on a report: {status, pass, reached, levels, counts, rules, problems, warnings}. */
function verify(html, sources, rulesText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-cr-'));
  try {
    const report = path.join(dir, 'report.html');
    fs.writeFileSync(report, html);
    const args = [path.join(root, 'ingest/bin/tactile-ingest.mjs'), 'verify', report, '--json'];
    for (const s of sources) {
      if (typeof s === 'string') { args.push('--source', s); continue; }
      fs.writeFileSync(path.join(dir, s.name), s.bytes);
      args.push('--source', path.join(dir, s.name));
    }
    if (rulesText !== undefined) { fs.writeFileSync(path.join(dir, 'rules.yaml'), rulesText); args.push('--rules', path.join(dir, 'rules.yaml')); }
    const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
    let out;
    try { out = JSON.parse(run.stdout); } catch (err) { throw new Error('verify did not answer in JSON:\n' + run.stdout + run.stderr); }
    return Object.assign({ status: run.status }, out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
/** Press 下載 rules.yaml and read the file. */
async function downloadRules(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#prov-pane .prov-rules-file').click()]);
  expect(download.suggestedFilename()).toBe('rules.yaml');
  return fs.readFileSync(await download.path(), 'utf8');
}
/** Fill the form that adds a rule and press its button. */
async function addRule(page, r) {
  const form = page.locator('#prov-pane .prov-form');
  await form.locator('[name="type"]').selectOption(r.type);
  for (const k of ['id', 'total', 'parts', 'left', 'right', 'tolerance', 'note']) if (r[k] !== undefined) await form.locator('[name="' + k + '"]').fill(r[k]);
  await form.locator('.prov-rule-add').click();
  await expect(form.locator('.prov-rule-add')).toBeEnabled();
}
const chart = (id, type, facts, labels, more = '') => '<figure><figcaption>圖</figcaption><div id="' + id + '" data-chart="' + type + '" data-chart-facts="' + facts + '" data-chart-labels="' + labels + '"' + more + '></div></figure>';
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

test('the code the editor runs for decimals, rules and charts is the code ingest runs', () => {
  const made = fs.readFileSync(path.join(root, 'src/js/ingest-core.js'), 'utf8').replace(/\r\n/g, '\n');
  expect(made).toContain('GENERATED by build.mjs');
  for (const name of ['decimal', 'rules-core', 'chart', 'yaml-lite']) {
    const from = fs.readFileSync(path.join(root, 'ingest/src', name + '.mjs'), 'utf8').replace(/\r\n/g, '\n');
    const body = from.replace(/^import\s.*\n/gm, '').replace(/^export\s+/gm, '');
    expect(made, name).toContain(body);
    // Only one another: nothing from npm, nothing of Node.
    for (const m of from.matchAll(/^import\s.*?from\s+'([^']+)'/gm)) expect(['./decimal.mjs', './rules-core.mjs']).toContain(m[1]);
  }
  expect(fs.readFileSync(path.join(root, 'dist/tactile.html'), 'utf8').replace(/\r\n/g, '\n')).toContain(made.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--').trim());
});

test('the AI writes empty chart elements, the editor draws them, and the report passes tactile-ingest verify at level 3', async ({ page }) => {
  await open(page);
  const requests = await script(page, [
    { name: 'replace_html', input: async () => ({ id: await leadId(page), html: '<div id="lead">' +
      chart('c-bar', 'bar', P + 'D10:D13', P + 'A10:A13', ' data-chart-scale="1e-6" data-chart-digits="1"') +
      chart('c-line', 'line', P + 'B14:D14', P + 'B9:D9', ' data-chart-scale="1e-8" data-chart-digits="2"') +
      chart('c-pie', 'pie', P + 'D10:D13', P + 'A10:A13', ' data-chart-scale="1e-6" data-chart-digits="1"') + '</div>' }) },
  ]);
  const before = await steps(page);
  expect(await page.evaluate(() => window.HE.ai.run('畫三張圖'))).toBe(true);
  expect(requests[0].system).toContain('NEVER draw the SVG yourself');
  expect(lastResult(requests[1])).toMatchObject({ error: false });
  expect(lastResult(requests[1]).data.fill_problems).toBeUndefined();

  const frame = page.frameLocator(canvasSelector);
  for (const [id, type] of [['c-bar', 'bar'], ['c-line', 'line'], ['c-pie', 'pie']]) await expect(frame.locator('#' + id + ' > svg[data-chart-drawn="' + type + '"]')).toHaveCount(1);
  await expect(frame.locator('#c-bar path[data-chart-fact]')).toHaveCount(4);
  await expect(frame.locator('#c-bar text[data-fact="' + P + 'D10"]')).toHaveText('142.0');
  // The cells a chart reads are in the block: values and labels.
  const b = await block(page);
  for (const cell of ['D10', 'D13', 'A10', 'A13', 'B14', 'D14', 'B9', 'D9']) expect(Object.keys(b.facts)).toContain(P + cell);
  expect(b.rules).toBeUndefined();

  // Filling again changes nothing and records no step.
  const saved = await serialize(page);
  const afterRun = await steps(page);
  expect(afterRun).toBe(before + 1);
  expect(await page.evaluate(() => window.HE.fill.run())).toMatchObject({ filled: 0, charts: 0, problems: [] });
  expect(await serialize(page)).toBe(saved);
  expect(await steps(page)).toBe(afterRun);

  const v = verify(saved, [BOOK]);
  expect(v.problems).toEqual([]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3, levels: { 1: 'pass', 2: 'pass', 3: 'pass' }, counts: { charts: 3, chartsBad: 0, mismatch: 0, missing: 0 } });

  // One undo takes the AI's step back whole: the elements, the drawings and the block.
  await page.evaluate(() => window.HE.history.undo());
  expect(await page.evaluate(() => window.HE.doc.model.querySelectorAll('[data-chart], svg, script#tactile-provenance').length)).toBe(0);
  await expect(frame.locator('#lead')).toHaveText('摘要');
});

test('the editor and tactile-ingest fill draw the same charts from the same draft', async ({ page }) => {
  const draft = fs.readFileSync(path.join(root, 'ingest/examples/zh-hant/charts-draft.html'), 'utf8');
  const at = (file) => import(pathToFileURL(path.join(root, 'ingest/src', file)).href);
  const { buildFacts } = await at('ingest.mjs');
  const { fillReport, scanReport, holdsDrawing, attrReader } = await at('fill.mjs');
  const { drawChart, readChart, reportLang } = await at('chart.mjs');
  const facts = buildFacts([{ name: BOOK, bytes: fs.readFileSync(BOOK) }]);
  const byId = new Map(facts.facts.map((f) => [f.id, f]));
  const theirs = scanReport(fillReport(draft, facts).html).charts;

  await open(page, draft);
  expect(await page.evaluate(() => window.HE.fill.run())).toMatchObject({ charts: 4, problems: [] });
  const saved = await serialize(page);
  const mine = scanReport(saved).charts;
  expect(mine).toHaveLength(4);
  expect(theirs).toHaveLength(4);
  mine.forEach((c, i) => {
    const drawn = drawChart(readChart(attrReader(theirs[i].el), byId), reportLang(draft));
    expect(holdsDrawing(theirs[i].el, drawn), 'ingest, chart ' + (i + 1)).toBe(true);
    expect(holdsDrawing(c.el, drawn), 'editor, chart ' + (i + 1)).toBe(true);
  });
  // A drawing that differs is told apart, so the comparison above means something.
  expect(holdsDrawing(mine[0].el, drawChart(readChart(attrReader(theirs[1].el), byId), reportLang(draft)))).toBe(false);
  expect(verify(saved, [BOOK])).toMatchObject({ status: 0, reached: 3, counts: { charts: 4, chartsBad: 0 } });

  // A chart whose attributes change is drawn again in place of the old drawing.
  await page.evaluate(() => {
    const el = window.HE.doc.model.querySelector('[data-chart="pie"]');
    window.HE.history.transact('t', () => { window.HE.ops.setAttr(el.getAttribute('data-he-id'), { 'data-chart-digits': '0' }); window.HE.fill.run(); });
  });
  expect(await page.evaluate(() => window.HE.doc.model.querySelectorAll('[data-chart="pie"] > svg').length)).toBe(1);
  expect(verify(await serialize(page), [BOOK])).toMatchObject({ status: 0, reached: 3, counts: { charts: 4, chartsBad: 0 } });
});

test('a chart the editor cannot draw is said to the model and its element stays as it is', async ({ page }) => {
  await open(page);
  const requests = await script(page, [
    { name: 'replace_html', input: async () => ({ id: await leadId(page), html: '<div id="lead">' +
      chart('c-id', 'bar', P + 'ZZ98;' + P + 'ZZ99', P + 'A10:A11') +
      chart('c-count', 'line', P + 'D10:D13', P + 'A10:A12') +
      '<div id="c-full" data-chart="pie" data-chart-facts="' + P + 'D10:D13" data-chart-labels="' + P + 'A10:A13"><p>各服務的比重</p></div>' +
      chart('c-kind', 'donut', P + 'D10:D13', P + 'A10:A13') + '</div>' }) },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('畫圖'))).toBe(true);
  const problems = lastResult(requests[1]).data.fill_problems;
  expect(problems).toHaveLength(4);
  const ids = await page.evaluate(() => ['c-id', 'c-count', 'c-full', 'c-kind'].map((id) => window.HE.doc.model.querySelector('#' + id).getAttribute('data-he-id')));
  ids.forEach((id, i) => expect(problems[i]).toContain('[' + id + ']'));
  expect(problems[0]).toContain(P + 'ZZ98');
  expect(problems[1]).toContain('3 個標籤');
  expect(problems[2]).toContain('必須是空的');
  expect(problems[3]).toContain('donut');
  const inner = await page.evaluate(() => ['c-id', 'c-count', 'c-full', 'c-kind'].map((id) => window.HE.doc.model.querySelector('#' + id).innerHTML.replace(/ data-he-id="[^"]*"/g, '')));
  expect(inner).toEqual(['', '', '<p>各服務的比重</p>', '']);
  expect(await page.evaluate(() => window.HE.doc.model.querySelectorAll('svg').length)).toBe(0);
  expect(await block(page)).toBe(null);
});

test('rules added in the pane are computed, downloaded as rules.yaml, and pass tactile-ingest verify with and without the file', async ({ page }) => {
  await open(page);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  await expect(pane.locator('.prov-form')).toBeVisible();
  const start = await steps(page);

  await addRule(page, { type: 'sum', id: '營收合計', total: P + 'D14', parts: P + 'D10:D13' });
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  await expect(pane.locator('.prov-rule .prov-pill.prov-ok')).toHaveText('通過');
  await addRule(page, { type: 'equal', id: '合計等於倉儲', left: P + 'D14', right: P + 'D10', note: '這條是錯的' });
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  const bad = pane.locator('.prov-rule', { hasText: '合計等於倉儲' });
  await expect(bad.locator('.prov-pill.prov-bad')).toHaveText('違反');
  await expect(bad).toContainText('482,000,000');
  await expect(bad).toContainText('142,000,000');
  await expect(bad).toContainText('340,000,000');
  await expect(pane).toContainText('規則尚未確認');
  expect(await steps(page)).toBe(start + 2); // one step for each rule

  let b = await block(page);
  expect(b.rules.items).toEqual([
    { id: '營收合計', type: 'sum', total: P + 'D14', parts: [P + 'D10', P + 'D11', P + 'D12', P + 'D13'], tolerance: '0' },
    { id: '合計等於倉儲', type: 'equal', left: P + 'D14', right: P + 'D10', tolerance: '0', note: '這條是錯的' },
  ]);
  expect(b.rules.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(b.rules.approvedBy).toBeUndefined();
  // What the rules read is in the block, with the file it comes from.
  expect(Object.keys(b.facts).sort()).toEqual(['D10', 'D11', 'D12', 'D13', 'D14'].map((c) => P + c).sort());
  expect(b.sources.map((s) => s.file)).toEqual(['2026Q3.xlsx']);
  // The rule that fails is a problem to verify too, and the file it is given is the one the block records.
  let v = verify(await serialize(page), [BOOK], await downloadRules(page));
  expect(v.problems).toHaveLength(1);
  expect(v.problems[0]).toContain('規則「合計等於倉儲」違反');

  await bad.locator('.prov-rule-del').click();
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  expect(await steps(page)).toBe(start + 3);
  const draftSha = (await block(page)).rules.sha256;
  expect(draftSha).not.toBe(b.rules.sha256);
  let file = await downloadRules(page);
  expect(file).toContain('tactileRules: 1\n');
  expect(file).not.toContain('approvedBy');
  v = verify(await serialize(page), [BOOK], file);
  expect(v.problems).toEqual([]);
  expect(v.warnings).toEqual([]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3 });
  expect(v.rules.map((r) => r.result)).toEqual(['pass']);
  // Without the file: the one warning that the rules themselves were not checked.
  v = verify(await serialize(page), [BOOK]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3 });
  expect(v.warnings).toHaveLength(1);
  expect(v.warnings[0]).toContain('沒有提供規則檔');
  // Another file is not the one the block records.
  expect(verify(await serialize(page), [BOOK], file.replace('"0"', '"5"')).problems.join('\n')).toContain('規則檔的 SHA-256');

  // Approving writes who and when, and the file that goes with the block changes with it.
  await pane.locator('.prov-approve-do').click();
  await expect(page.locator('.toast').last()).toContainText('請填確認人的名字');
  expect((await block(page)).rules.approvedBy).toBeUndefined();
  await pane.locator('[name="approver"]').fill('林雅婷');
  await pane.locator('.prov-approve-do').click();
  await expect(pane).toContainText('確認人：林雅婷，' + today());
  await expect(pane.locator('.prov-approve-do')).toHaveCount(0);
  b = await block(page);
  expect(b.rules).toMatchObject({ approvedBy: '林雅婷', approvedOn: today() });
  expect(b.rules.sha256).not.toBe(draftSha);
  expect(await steps(page)).toBe(start + 4);
  file = await downloadRules(page);
  expect(file).toContain('approvedBy: "林雅婷"\napprovedOn: "' + today() + '"\n');
  v = verify(await serialize(page), [BOOK], file);
  expect(v.problems).toEqual([]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3 });

  // A rule added after the approval is not one that was approved: the approval goes, and comes back with undo.
  await addRule(page, { type: 'equal', id: '兩表營收一致', left: P + 'D14', right: '2026Q3.xlsx/摘要/B3', tolerance: '0.50' });
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  await expect(pane).toContainText('規則尚未確認');
  b = await block(page);
  expect(b.rules.approvedBy).toBeUndefined();
  expect(b.rules.approvedOn).toBeUndefined();
  expect(b.rules.items[1]).toEqual({ id: '兩表營收一致', type: 'equal', left: P + 'D14', right: '2026Q3.xlsx/摘要/B3', tolerance: '0.5' });
  v = verify(await serialize(page), [BOOK], await downloadRules(page));
  expect(v.problems).toEqual([]);
  expect(v.rules.map((r) => r.result)).toEqual(['pass', 'pass']);
  await page.evaluate(() => window.HE.history.undo());
  await expect(pane).toContainText('確認人：林雅婷，' + today());
  expect((await block(page)).rules.items).toHaveLength(1);
  // Removing a rule takes the approval off as well.
  await page.evaluate(() => window.HE.history.redo());
  await pane.locator('[name="approver"]').fill('王小明');
  await pane.locator('.prov-approve-do').click();
  await expect(pane).toContainText('確認人：王小明');
  await pane.locator('.prov-rule', { hasText: '兩表營收一致' }).locator('.prov-rule-del').click();
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  expect((await block(page)).rules.approvedBy).toBeUndefined();
});

test('a rule that cannot be right is refused with the reason and nothing is written', async ({ page }) => {
  await open(page);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  const error = pane.locator('.prov-form .prov-form-error');
  await addRule(page, { type: 'sum', id: '營收合計', total: P + 'D14', parts: P + 'D10:D13' });
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  await expect(error).toBeHidden();
  const saved = await serialize(page);
  const before = await steps(page);
  const refused = async (rule, why) => {
    await addRule(page, rule);
    await expect(error).toBeVisible();
    await expect(error).toContainText(why);
    expect(await serialize(page)).toBe(saved);
    expect(await steps(page)).toBe(before);
  };
  await refused({ type: 'sum', id: '不存在', total: P + 'ZZ99', parts: P + 'D10:D13' }, P + 'ZZ99');
  await refused({ type: 'sum', id: '空的範圍', total: P + 'D14', parts: P + 'X50:Z60' }, '裡沒有任何值');
  await refused({ type: 'sum', id: '營收合計', total: P + 'D14', parts: P + 'D10;' + P + 'D11' }, '不可重複');
  await refused({ type: 'sum', id: '負的差距', total: P + 'D14', parts: P + 'D10:D13', tolerance: '-1' }, 'tolerance 必須是 0 或正數');
  await refused({ type: 'sum', id: '', total: P + 'D14', parts: P + 'D10:D13', tolerance: '0' }, '缺少 id');
  await refused({ type: 'equal', id: '範圍不是儲存格', left: P + 'D10:D13', right: P + 'D14' }, '不可是範圍');
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  // What was typed is still there to correct, and a rule that is right clears the message.
  await expect(pane.locator('.prov-form [name="id"]')).toHaveValue('範圍不是儲存格');
  await addRule(page, { type: 'equal', id: '兩表營收一致', left: P + 'D14', right: '2026Q3.xlsx/摘要/B3' });
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  await expect(error).toBeHidden();
  await expect(pane.locator('.prov-form [name="id"]')).toHaveValue('');
});

test('the AI adds and removes rules as drafts: it gets the results, the approval goes, and it has no way to approve', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(async (p) => {
    await window.HE.fill.addRule({ type: 'sum', id: '營收合計', total: p + 'D14', parts: [p + 'D10:D13'] });
    return window.HE.fill.approveRules('林雅婷');
  }, P)).toMatchObject({ rules: [{ id: '營收合計', result: 'pass' }] });
  expect((await block(page)).rules.approvedBy).toBe('林雅婷');
  const before = await serialize(page);

  const requests = await script(page, [
    { name: 'edit_rules', input: { action: 'add', id: '合計等於倉儲', type: 'equal', left: P + 'D14', right: P + 'D10' } },
    { name: 'edit_rules', input: { action: 'add', id: '加值服務', type: 'sum', total: P + 'D12', parts: [P + 'B12', P + 'ZZ1'] } },
    { name: 'edit_rules', input: { action: 'approve', id: '營收合計', approvedBy: 'AI' } },
    { name: 'edit_rules', input: { action: 'remove', id: '合計等於倉儲' } },
    { name: 'edit_rules', input: { action: 'remove', id: '沒有這條' } },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('幫我加勾稽規則'))).toBe(true);

  // The request says how many rules there are and that the user approved them; the tool cannot approve.
  const first = requests[0].messages.at(-1).content;
  expect(typeof first === 'string' ? first : first.map((c) => c.text || '').join('\n')).toContain('Rules: 1 reconciliation rules (1 pass, 0 fail, 0 cannot be computed); approved by the user.');
  expect(requests[0].tools).toHaveLength(24);
  const tool = requests[0].tools.find((x) => x.name === 'edit_rules');
  expect(tool.input_schema.properties.action.enum).toEqual(['add', 'remove']);
  expect(Object.keys(tool.input_schema.properties).some((k) => /approv/i.test(k))).toBe(false);
  expect(tool.description).toContain('SOURCE VALUES');
  expect(tool.description).toContain('You cannot approve rules');
  expect(requests[0].system).toContain('You cannot approve rules');

  const added = lastResult(requests[1]);
  expect(added.error).toBe(false);
  expect(added.data.approved).toBe(false);
  expect(added.data.rules).toEqual([
    { type: 'sum', id: '營收合計', result: 'pass', left: '482000000', right: '482000000', diff: '0' },
    { type: 'equal', id: '合計等於倉儲', result: 'fail', left: '482000000', right: '142000000', diff: '340000000' },
  ]);
  expect(lastResult(requests[2])).toMatchObject({ error: true });
  expect(lastResult(requests[2]).data).toContain(P + 'ZZ1');
  expect(lastResult(requests[3])).toMatchObject({ error: true });
  expect(lastResult(requests[3]).data).toContain('"action" must be "add" or "remove"');
  const removed = lastResult(requests[4]);
  expect(removed.data.rules.map((r) => r.id)).toEqual(['營收合計']);
  expect(removed.data.approved).toBe(false);
  expect(lastResult(requests[5])).toMatchObject({ error: true });

  // The rules are as they were, but they are no longer the ones the user approved.
  const b = await block(page);
  expect(b.rules.items.map((r) => r.id)).toEqual(['營收合計']);
  expect(b.rules.approvedBy).toBeUndefined();
  expect(b.rules.approvedOn).toBeUndefined();
  await showPane(page);
  await expect(page.locator('#prov-pane')).toContainText('規則尚未確認');
  // One undo takes back everything the AI did, and the approval is the user's again.
  await page.evaluate(() => window.HE.history.undo());
  expect(await serialize(page)).toBe(before);
});

test('text from a source file stays text in a chart, in the pane, in the block and in rules.yaml', async ({ page }) => {
  await open(page, BLANK, false);
  // A workbook whose labels are markup, made with the library the editor carries.
  const b64 = await page.evaluate(async () => {
    const X = window.XLSX;
    const book = X.utils.book_new();
    X.utils.book_append_sheet(book, X.utils.aoa_to_sheet([['<img src=x onerror="window.pwned=1">', 5], ['a"b</text><b>bold</b> & c', 7], ['合計', 12]]), 'S');
    const bytes = new Uint8Array(X.write(book, { type: 'array', bookType: 'xlsx' }));
    await window.HE.sources.add(new File([bytes], 'odd.xlsx'));
    let s = '';
    for (const x of bytes) s += String.fromCharCode(x);
    return btoa(s);
  });
  const book = { name: 'odd.xlsx', bytes: Buffer.from(b64, 'base64') };
  await page.evaluate(() => {
    const lead = window.HE.doc.model.querySelector('#lead').getAttribute('data-he-id');
    window.HE.history.transact('t', () => {
      window.HE.ops.replaceHTML(lead, '<div id="lead"><div id="c" data-chart="pie" data-chart-facts="odd.xlsx/S/B1:B2" data-chart-labels="odd.xlsx/S/A1:A2"></div></div>');
      window.HE.fill.run();
    });
  });
  const frame = page.frameLocator(canvasSelector);
  await expect(frame.locator('#c > svg[data-chart-drawn="pie"]')).toHaveCount(1);
  const drawn = await page.evaluate(() => {
    const c = window.HE.doc.model.querySelector('#c');
    return { tags: [...new Set(Array.from(c.querySelectorAll('*'), (e) => e.localName))].sort(), text: c.textContent, pwned: window.pwned, handlers: c.querySelectorAll('[onerror]').length };
  });
  expect(drawn.tags).toEqual(['path', 'rect', 'svg', 'text', 'title']);
  expect(drawn.text).toContain('<img src=x onerror="window.pwned=1">');
  expect(drawn.text).toContain('a"b</text><b>bold</b> & c');
  expect(drawn).toMatchObject({ pwned: undefined, handlers: 0 });
  expect(await frame.locator('#c img, #c b').count()).toBe(0);
  expect(await page.evaluate(() => window.HE.doc.trusted)).toBe(true);

  // A rule whose name and note are markup, about those cells; the pane and the card of a slice show them as text.
  await showPane(page);
  const pane = page.locator('#prov-pane');
  await addRule(page, { type: 'sum', id: '<i>合計</i> "x": y\n', total: 'odd.xlsx/S/B3', parts: 'odd.xlsx/S/B1:B2', note: '<b onclick="window.pwned=2">見</b> #1' });
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  await expect(pane.locator('.prov-rule .prov-rule-name')).toHaveText('<i>合計</i> "x": y');
  await expect(pane.locator('.prov-rule .prov-note')).toHaveText('<b onclick="window.pwned=2">見</b> #1');
  expect(await pane.locator('.prov-rule i, .prov-rule b, .prov-rule img').count()).toBe(0);
  await frame.locator('#c [data-chart-fact="odd.xlsx/S/B1"]').click();
  const pop = page.locator('#prov-pop');
  await expect(pop).toContainText('<img src=x onerror="window.pwned=1">');
  expect(await pop.locator('img, b').count()).toBe(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();

  // The block holds no '<', and the file with the odd name reads back as the same rules.
  const saved = await serialize(page);
  const blockText = /<script type="application\/json" id="tactile-provenance"[^>]*>([\s\S]*?)<\/script>/.exec(saved)[1];
  expect(blockText).not.toContain('<');
  const file = await downloadRules(page);
  const v = verify(saved, [book], file);
  expect(v.problems).toEqual([]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3, counts: { charts: 1, chartsBad: 0 } });
  expect(v.rules).toMatchObject([{ id: '<i>合計</i> "x": y', result: 'pass' }]);
});

test('a tool that rewrites HTML cannot change the rules or sign them: the block keeps the rules it had', async ({ page }) => {
  await open(page);
  await page.evaluate(async (p) => {
    await window.HE.fill.addRule({ type: 'sum', id: '營收合計', total: p + 'D14', parts: [p + 'D10:D13'] });
    await window.HE.fill.approveRules('林雅婷');
  }, P);
  const was = (await block(page)).rules;
  expect(was.approvedBy).toBe('林雅婷');
  const blockId = () => page.evaluate(() => window.HE.doc.model.querySelector('script#tactile-provenance').getAttribute('data-he-id'));
  // The model writes the block itself: another signer, the rule gone, then no rules at all.
  const forged = async (change) => {
    const b = await block(page);
    change(b);
    return { id: await blockId(), html: '<script type="application/json" id="tactile-provenance">' + JSON.stringify(b).replace(/</g, '\u003c') + '</script>' };
  };
  const requests = await script(page, [
    { name: 'replace_html', input: () => forged((b) => { b.rules.approvedBy = 'AI'; b.rules.approvedOn = '2020-01-01'; }) },
    { name: 'replace_html', input: () => forged((b) => { b.rules.items = []; }) },
    { name: 'replace_html', input: () => forged((b) => { delete b.rules; }) },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('改一下出處資料'))).toBe(true);
  expect(requests).toHaveLength(4);
  // The tool did write the block each time: it is the editor that put the rules back.
  for (const i of [1, 2, 3]) expect(lastResult(requests[i]), JSON.stringify(lastResult(requests[i]).data)).toMatchObject({ error: false });
  expect((await block(page)).rules).toEqual(was);

  // Without an approval there is none to keep, and none can be written in.
  await page.evaluate((p) => window.HE.fill.addRule({ type: 'equal', id: '自己等於自己', left: p + 'D14', right: p + 'D14' }), P);
  expect((await block(page)).rules.approvedBy).toBeUndefined();
  const again = await script(page, [
    { name: 'replace_html', input: () => forged((b) => { b.rules.approvedBy = 'AI'; b.rules.approvedOn = '2020-01-01'; }) },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('幫我確認規則'))).toBe(true);
  expect(again.length).toBeGreaterThan(0);
  const now = (await block(page)).rules;
  expect(now.approvedBy).toBeUndefined();
  expect(now.items.map((r) => r.id)).toEqual(['營收合計', '自己等於自己']);
});
