const { test, expect } = require('@playwright/test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const BOOK = path.join(root, 'ingest/test/fixtures/2026Q3.xlsx');
const RULES = path.join(root, 'ingest/examples/zh-hant/rules.yaml');
const P = '2026Q3.xlsx/損益表/';
const TOTAL = P + 'D14'; // =SUM(D10:D13), 482,000,000
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
const idOf = (page, selector) => page.evaluate((s) => window.HE.doc.model.querySelector(s).getAttribute('data-he-id'), selector);
const serialize = (page) => page.evaluate(() => window.HE.doc.serialize());
const block = (page) => page.evaluate(() => { const el = window.HE.doc.model.querySelector('script#tactile-provenance'); return el ? JSON.parse(el.textContent) : null; });
const steps = (page) => page.evaluate(() => window.HE.history.undoStack.length);
const showPane = (page) => page.locator('[data-tabs="right"] [data-tab="prov"]').click();
const status = (page) => page.locator('#status-msg');
const at = (file) => import(pathToFileURL(path.join(root, 'ingest/src', file)).href);

/** `tactile-ingest verify --json` on a report, with the rules file at `rulesPath` when one is given. */
function verify(html, sources, rulesPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-pt-'));
  try {
    const report = path.join(dir, 'report.html');
    fs.writeFileSync(report, html);
    const args = [path.join(root, 'ingest/bin/tactile-ingest.mjs'), 'verify', report, '--json'];
    for (const s of sources) {
      if (typeof s === 'string') { args.push('--source', s); continue; }
      fs.writeFileSync(path.join(dir, s.name), s.bytes);
      args.push('--source', path.join(dir, s.name));
    }
    if (rulesPath) args.push('--rules', rulesPath);
    const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
    let out;
    try { out = JSON.parse(run.stdout); } catch (err) { throw new Error('verify did not answer in JSON:\n' + run.stdout + run.stderr); }
    return Object.assign({ status: run.status }, out);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
/** A file of this test's own, removed when the test ends. */
function tempFile(name, data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-pt-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, data);
  return { file, remove: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
/** Press 下載 rules.yaml and read the file as bytes. */
async function downloadRules(page) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#prov-pane .prov-rules-file').click()]);
  expect(download.suggestedFilename()).toBe('rules.yaml');
  return fs.readFileSync(await download.path());
}
const loadRules = (page, file) => page.locator('#prov-rules-input').setInputFiles(file);
const errorToast = (page) => page.locator('.toast.error').last();

/* ---------------------------------------------------------------------- */
/* 1. A rules.yaml the user wrote                                           */
/* ---------------------------------------------------------------------- */

test('the reader of rules files the editor carries is the one in ingest/src, and it is in the built files', () => {
  const made = fs.readFileSync(path.join(root, 'src/js/ingest-core.js'), 'utf8').replace(/\r\n/g, '\n');
  const from = fs.readFileSync(path.join(root, 'ingest/src/yaml-lite.mjs'), 'utf8').replace(/\r\n/g, '\n');
  expect(made).toContain(from.replace(/^import\s.*\n/gm, '').replace(/^export\s+/gm, ''));
  // It imports the error class and nothing else: no package, nothing of Node.
  expect([...from.matchAll(/^import\s.*?from\s+'([^']+)'/gm)].map((m) => m[1])).toEqual(['./decimal.mjs']);
  expect(fs.readFileSync(path.join(root, 'dist/tactile.html'), 'utf8')).toContain('function parseYamlLite(text)');
  // tactile-ingest itself still reads rules with the yaml package.
  expect(fs.readFileSync(path.join(root, 'ingest/src/rules.mjs'), 'utf8')).toContain("import { parse as parseYaml } from 'yaml';");
});

test('a rules.yaml loaded in the pane gives the block tactile-ingest fill --rules writes, and verify --rules passes with that file', async ({ page }) => {
  await open(page);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  await expect(pane.locator('.prov-rules-load')).toBeVisible();
  const start = await steps(page);
  const text = fs.readFileSync(RULES, 'utf8');
  // The file has a range, a comment-free note in Chinese without quotes, and a date that must stay text.
  expect(text).toContain('parts: 2026Q3.xlsx/損益表/D10:D13');
  expect(text).toContain('approvedOn: 2026-11-10');

  await loadRules(page, RULES);
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  await expect(status(page)).toHaveText('已載入「rules.yaml」：2 條勾稽規則');
  await expect(pane).toContainText('確認人：林雅婷，2026-11-10');
  await expect(pane.locator('.prov-rule .prov-pill.prov-ok')).toHaveCount(2);
  expect(await steps(page)).toBe(start + 1); // one undo step

  // The same rules object as the command-line tool writes from the same file and the same workbook.
  const { buildFacts } = await at('ingest.mjs');
  const { fillReport } = await at('fill.mjs');
  const theirs = fillReport(BLANK, buildFacts([{ name: BOOK, bytes: fs.readFileSync(BOOK) }]), { rulesText: text }).block;
  const b = await block(page);
  expect(b.rules).toEqual(theirs.rules);
  expect(b.rules.items[0].parts).toEqual(['D10', 'D11', 'D12', 'D13'].map((c) => P + c));
  expect(b.rules).toMatchObject({ approvedBy: '林雅婷', approvedOn: '2026-11-10' });
  expect(b.facts).toEqual(theirs.facts);

  let v = verify(await serialize(page), [BOOK], RULES);
  expect(v.problems).toEqual([]);
  expect(v.warnings).toEqual([]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3 });
  expect(v.rules.map((r) => r.result)).toEqual(['pass', 'pass']);

  // While the rules are the file's, the download is the file, byte for byte.
  expect((await downloadRules(page)).equals(fs.readFileSync(RULES))).toBe(true);
  // A change makes them rules of the editor: the canonical text, no approval; undo brings the file back.
  await pane.locator('.prov-rule', { hasText: '兩表營收一致' }).locator('.prov-rule-del').click();
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  const changed = (await downloadRules(page)).toString('utf8');
  expect(changed).toContain('  - id: "營收合計"\n');
  expect(changed).not.toContain('approvedBy');
  expect(verify(await serialize(page), [BOOK], RULES).problems.join('\n')).toContain('規則檔的 SHA-256');
  await page.evaluate(() => window.HE.history.undo());
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  expect((await downloadRules(page)).equals(fs.readFileSync(RULES))).toBe(true);

  // One more undo takes the loaded rules away whole.
  await page.evaluate(() => window.HE.history.undo());
  expect(await block(page)).toBe(null);
  expect(await steps(page)).toBe(start);
});

test('loading over rules the document has asks first; a file with a byte order mark, CRLF and a flow list is recorded by its bytes', async ({ page }) => {
  await open(page);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  await loadRules(page, RULES);
  await expect(pane.locator('.prov-rule')).toHaveCount(2);
  const before = await serialize(page);
  const count = await steps(page);

  const mine = '# 我的規則\r\n---\r\ntactileRules: 1\r\nreport: "季報: 第三季"   # 值裡有冒號，所以加引號\r\napprovedBy: \'王小明\'\r\nrules:\r\n- id: 前兩項 # 清單與鍵同一層縮排\r\n  type: sum\r\n' +
    '  total: ' + P + 'D14\r\n  parts: [' + P + 'D10, "' + P + 'D11", ' + P + 'D12:D13]\r\n  tolerance: 0.50\r\n  note: it\'s 100% 對的\r\n';
  const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(mine, 'utf8')]);
  const tmp = tempFile('第三季.yml', bytes);
  try {
    await loadRules(page, tmp.file);
    const modal = page.locator('.modal');
    await expect(modal).toContainText('這份文件已經有 2 條勾稽規則。載入「第三季.yml」會取代全部規則');
    await modal.getByRole('button', { name: '取消' }).click();
    await expect(modal).toHaveCount(0);
    expect(await serialize(page)).toBe(before);
    expect(await steps(page)).toBe(count);

    await loadRules(page, tmp.file);
    await page.locator('.modal').getByRole('button', { name: '取代' }).click();
    await expect(pane.locator('.prov-rule')).toHaveCount(1);
    await expect(pane).toContainText('規則尚未確認'); // a name without a date is not an approval
    expect(await steps(page)).toBe(count + 1);
    const b = await block(page);
    expect(b.rules.items).toEqual([{ id: '前兩項', type: 'sum', total: P + 'D14', parts: ['D10', 'D11', 'D12', 'D13'].map((c) => P + c), tolerance: '0.5', note: "it's 100% 對的" }]);
    expect(b.rules.approvedBy).toBe('王小明');
    expect(b.rules.approvedOn).toBeUndefined();
    expect(b.rules.sha256).toBe(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
    const v = verify(await serialize(page), [BOOK], tmp.file);
    expect(v.problems).toEqual([]);
    expect(v).toMatchObject({ status: 0, pass: true, reached: 3 });
    expect((await downloadRules(page)).equals(bytes)).toBe(true);
  } finally {
    tmp.remove();
  }
});

test('a rules file outside the subset, too large, not UTF-8 or about cells that do not exist is refused and the document stays as it is', async ({ page }) => {
  await open(page);
  await showPane(page);
  await expect(page.locator('#prov-pane .prov-rules-load')).toBeVisible();
  const before = await serialize(page);
  const count = await steps(page);
  const head = 'tactileRules: 1\nrules:\n';
  const rule = '  - id: 營收合計\n    type: sum\n    total: ' + P + 'D14\n    parts: ' + P + 'D10:D13\n';
  const refused = async (name, data, ...why) => {
    const tmp = tempFile(name, data);
    try {
      await loadRules(page, tmp.file);
      for (const part of why) await expect(errorToast(page)).toContainText(part);
      await expect(errorToast(page)).not.toContainText('facts.json');
    } finally { tmp.remove(); }
    expect(await serialize(page), name).toBe(before);
    expect(await steps(page), name).toBe(count);
    expect(await block(page), name).toBe(null);
  };
  await refused('anchor.yaml', head + rule.replace('營收合計', '&a 營收合計'), '無法載入「anchor.yaml」', '規則檔第 3 行', '不支援錨點（&）');
  await refused('block.yaml', head + rule + '    note: |\n      兩行\n      文字\n', '規則檔第 7 行', '不支援區塊純量');
  await refused('flow.yaml', head + '  - {id: a, type: sum}\n', '規則檔第 3 行', '不支援流式對應');
  await refused('two.yaml', head + rule + '---\n' + head + rule, '規則檔第 7 行', '不支援多份文件');
  await refused('tab.yaml', head + rule.replace('    type', '\ttype'), '規則檔第 4 行', 'Tab');
  await refused('twice.yaml', head + rule + '    total: ' + P + 'D14\n', '規則檔第 7 行', '鍵「total」重複');
  await refused('missing.yaml', head + rule.replace('D14', 'ZZ99'), '規則「營收合計」引用的 ' + P + 'ZZ99 不在來源檔或出處資料裡');
  await refused('version.yaml', 'tactileRules: 2\nrules: []\n', '規則檔的格式版本是 2');
  await refused('latin1.yaml', Buffer.from([0x74, 0x3a, 0x20, 0xe9, 0x0a]), '不是 UTF-8 編碼的文字檔');
  // One byte over the limit: refused by its size, before anything is read.
  await refused('big.yaml', Buffer.concat([Buffer.from(head + rule), Buffer.alloc(1024 * 1024 + 1 - Buffer.byteLength(head + rule), 0x0a)]), '「big.yaml」有', '超過規則檔 1 MB 的上限');
  // At the limit the same rules load.
  const tmp = tempFile('edge.yaml', Buffer.concat([Buffer.from(head + rule), Buffer.alloc(1024 * 1024 - Buffer.byteLength(head + rule), 0x0a)]));
  try {
    await loadRules(page, tmp.file);
    await expect(page.locator('#prov-pane .prov-rule')).toHaveCount(1);
  } finally { tmp.remove(); }
});

test('a .yaml or .yml file dropped on the window loads the rules the same way, and what it says stays text', async ({ page }) => {
  await open(page);
  await showPane(page);
  const drop = (name, text) => page.evaluate(([n, t]) => {
    const e = new Event('drop', { bubbles: true, cancelable: true });
    e.dataTransfer = { types: ['Files'], files: [new File([t], n)], items: [] };
    window.dispatchEvent(e);
  }, [name, text]);
  const before = await steps(page);
  const markup = 'tactileRules: 1\nrules:\n  - id: \'<img src=x onerror="window.pwned=1">\'\n    type: equal\n    left: ' + P + 'D14\n    right: 2026Q3.xlsx/摘要/B3\n    note: <b onclick="window.pwned=2">見</b> 摘要表\n';
  await drop('dropped.yml', markup);
  const pane = page.locator('#prov-pane');
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  await expect(pane.locator('.prov-rule .prov-rule-name')).toHaveText('<img src=x onerror="window.pwned=1">');
  await expect(pane.locator('.prov-rule .prov-note')).toHaveText('<b onclick="window.pwned=2">見</b> 摘要表');
  expect(await pane.locator('.prov-rule img, .prov-rule b').count()).toBe(0);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  expect(await steps(page)).toBe(before + 1);
  expect(await page.evaluate(() => window.HE.doc.trusted)).toBe(true);
  expect(/<script type="application\/json" id="tactile-provenance"[^>]*>([\s\S]*?)<\/script>/.exec(await serialize(page))[1]).not.toContain('<');

  // A file that is refused says why, with the name as text, and the rules stay.
  await drop('<i>bad</i>.yaml', 'tactileRules: 1\nrules: *all\n');
  await page.locator('.modal').getByRole('button', { name: '取代' }).click();
  await expect(errorToast(page)).toContainText('無法載入「<i>bad</i>.yaml」：規則檔第 2 行：不支援別名（*）');
  expect(await errorToast(page).locator('i').count()).toBe(0);
  await expect(pane.locator('.prov-rule')).toHaveCount(1);
  expect(await steps(page)).toBe(before + 1);
});

test('the AI has no tool that loads a rules file, and a tool that rewrites HTML cannot change rules loaded from one', async ({ page }) => {
  await open(page);
  await showPane(page);
  await loadRules(page, RULES);
  await expect(page.locator('#prov-pane .prov-rule')).toHaveCount(2);
  const was = (await block(page)).rules;
  const requests = await script(page, [
    { name: 'replace_html', input: async () => {
      const b = await block(page);
      b.rules.approvedBy = 'AI';
      b.rules.items.pop();
      return { id: await idOf(page, 'script#tactile-provenance'), html: '<script type="application/json" id="tactile-provenance">' + JSON.stringify(b).replace(/</g, '\\u003c') + '</script>' };
    } },
    { name: 'load_rules', input: { text: 'tactileRules: 1\nrules: []\n' } },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('改規則'))).toBe(true);
  expect(requests[0].tools.some((x) => /load|yaml/i.test(x.name))).toBe(false);
  expect(requests[0].tools).toHaveLength(24);
  expect(lastResult(requests[2])).toMatchObject({ error: true });
  expect((await block(page)).rules).toEqual(was);
  expect(verify(await serialize(page), [BOOK], RULES)).toMatchObject({ status: 0, pass: true, reached: 3 });
});

/* ---------------------------------------------------------------------- */
/* 2. 重新填入                                                               */
/* ---------------------------------------------------------------------- */

test('重新填入 fills citations and charts written by hand in one undo step, and a second press records nothing', async ({ page }) => {
  // A document nothing was filled in: the citations and the chart are as a person typed them.
  const draft = BLANK.replace('<p id="lead">摘要</p>', '<p id="lead">營收 <b data-fact="' + TOTAL + '" data-fact-scale="1e-8" data-fact-digits="2"></b> 億元</p>' +
    '<div id="c" data-chart="bar" data-chart-facts="' + P + 'D10:D13" data-chart-labels="' + P + 'A10:A13"></div>');
  await open(page, draft);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  const button = pane.locator('.prov-refill-do');
  await expect(button).toBeVisible();
  const frame = page.frameLocator(canvasSelector);
  await expect(frame.locator('#lead b')).toHaveText('');
  const start = await steps(page);

  await button.click();
  await expect(status(page)).toHaveText('已重新填入：1 個數字、1 張圖表，0 個問題');
  await expect(frame.locator('#lead b')).toHaveText('4.82');
  await expect(frame.locator('#c > svg[data-chart-drawn="bar"]')).toHaveCount(1);
  expect(await steps(page)).toBe(start + 1);
  await expect(pane.locator('.prov-problems')).toHaveCount(0);
  expect(verify(await serialize(page), [BOOK])).toMatchObject({ status: 0, pass: true, reached: 3, counts: { charts: 1, chartsBad: 0, mismatch: 0, missing: 0 } });

  const saved = await serialize(page);
  await button.click();
  await expect(status(page)).toHaveText('沒有需要更新的內容');
  expect(await steps(page)).toBe(start + 1);
  expect(await serialize(page)).toBe(saved);

  // What cannot be filled is listed in the pane; what can be is still filled.
  await page.evaluate(([lead, p]) => {
    window.HE.ops.insertHTML(lead, 'after', '<p id="more">成本 <i data-fact="' + p + 'ZZ99"></i>，倉儲 <i id="ok" data-fact="' + p + 'D10"></i></p>');
  }, [await idOf(page, '#lead'), P]);
  const mid = await steps(page);
  await button.click();
  await expect(status(page)).toHaveText('已重新填入：1 個數字、0 張圖表，1 個問題');
  await expect(pane.locator('.prov-problems li')).toHaveText(['「' + P + 'ZZ99」不在來源檔或出處資料裡']);
  await expect(frame.locator('#ok')).toHaveText('142,000,000');
  expect(await steps(page)).toBe(mid + 1);
  await button.click();
  await expect(status(page)).toHaveText('沒有需要更新的內容。有 1 個問題');
  expect(await steps(page)).toBe(mid + 1);

  // One undo takes one refill back whole.
  await page.evaluate(() => { window.HE.history.undo(); window.HE.history.undo(); window.HE.history.undo(); });
  await expect(frame.locator('#lead b')).toHaveText('');
  expect(await page.evaluate(() => window.HE.doc.model.querySelectorAll('svg, script#tactile-provenance').length)).toBe(0);
});

test('重新填入 shows only where there is something to fill, and takes the values of a source file dropped in again', async ({ page }) => {
  await open(page, BLANK, false);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  await expect(pane).toContainText('這份文件沒有出處資料');
  await expect(pane.locator('.prov-refill-do')).toHaveCount(0);

  // A workbook made with the library the editor carries, then a newer copy under the same name.
  const add = (value) => page.evaluate(async (v) => {
    const X = window.XLSX;
    const book = X.utils.book_new();
    X.utils.book_append_sheet(book, X.utils.aoa_to_sheet([['營收', v]]), 'S');
    await window.HE.sources.add(new File([new Uint8Array(X.write(book, { type: 'array', bookType: 'xlsx' }))], 'live.xlsx'));
  }, value);
  await add(5);
  await page.evaluate((lead) => window.HE.ops.replaceHTML(lead, '<p id="lead">營收 <b data-fact="live.xlsx/S/B1"></b></p>'), await idOf(page, '#lead'));
  await expect(pane.locator('.prov-refill-do')).toBeVisible();
  await pane.locator('.prov-refill-do').click();
  const b = page.frameLocator(canvasSelector).locator('#lead b');
  await expect(b).toHaveText('5');
  const old = (await block(page)).sources[0].sha256;

  await add(7);
  await expect(b).toHaveText('5'); // nothing changes until the user says so
  const count = await steps(page);
  await pane.locator('.prov-refill-do').click();
  await expect(b).toHaveText('7');
  expect(await steps(page)).toBe(count + 1);
  const now = await block(page);
  expect(now.facts['live.xlsx/S/B1']).toMatchObject({ type: 'number', value: 7 });
  expect(now.sources[0].sha256).not.toBe(old);
});

/* ---------------------------------------------------------------------- */
/* 3. The messages of the shared code, in the interface language            */
/* ---------------------------------------------------------------------- */

test('every code the code shared with tactile-ingest throws has a text in the editor, in English and in Simplified Chinese', async ({ page }) => {
  const { sharedCodes, dictionary } = await import(pathToFileURL(path.join(root, 'tools/i18n-check.mjs')).href);
  const { thrown, texts } = sharedCodes();
  // All five files are read, and each throws codes of its own family.
  for (const [file, family] of [['decimal.mjs', 'show.'], ['rules-core.mjs', 'rules.'], ['chart.mjs', 'chart.'], ['workbook.mjs', 'book.'], ['yaml-lite.mjs', 'yaml.']]) {
    expect([...thrown].filter(([code, f]) => f === file && code.startsWith(family)).length, file).toBeGreaterThan(3);
  }
  expect([...thrown.keys()].sort()).toEqual([...texts.keys()].sort());
  const en = dictionary('en');
  const hans = dictionary('zh-CN');
  for (const [code, text] of texts) {
    expect(en[text], code).toBeTruthy();
    expect(hans[text], code).toBeTruthy();
    expect(en[text], code).not.toContain('facts.json');
    expect(text, code).not.toContain('facts.json');
  }
  // No error of those files is left without a code.
  for (const file of ['decimal.mjs', 'rules-core.mjs', 'chart.mjs', 'workbook.mjs', 'yaml-lite.mjs']) {
    const src = fs.readFileSync(path.join(root, 'ingest/src', file), 'utf8');
    expect(src.match(/throw (new SpecError|fail)\(\s*'/g), file).toBe(null);
  }
  // In the page, each code gives its own text and not the message of the command-line tool.
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  const said = await page.evaluate((codes) => codes.map((code) => window.HE.ingestText({ message: 'MESSAGE', code, vars: {} })), [...thrown.keys()]);
  said.forEach((text, i) => expect(text, [...thrown.keys()][i]).not.toBe('MESSAGE'));
  // An error without a code, or with one the editor does not know, is shown as its message.
  expect(await page.evaluate(() => [window.HE.ingestText(new Error('原文')), window.HE.ingestText({ message: '原文', code: 'no.such-code' })])).toEqual(['原文', '原文']);
  // The command-line tool still says facts.json, which it has; the editor does not.
  const { expandRules, readRules } = await at('rules-core.mjs');
  let err;
  try { expandRules(readRules({ tactileRules: 1, rules: [{ id: 'r', type: 'equal', left: 'a/b/A1', right: 'a/b/A2' }] }), new Map()); } catch (e) { err = e; }
  expect(err.message).toBe('規則「r」引用的 a/b/A1 不在 facts.json 裡');
  expect(err).toMatchObject({ code: 'rules.fact-missing', vars: { rule: 'r', id: 'a/b/A1' } });
  expect(await page.evaluate((e) => window.HE.ingestText(e), { message: err.message, code: err.code, vars: err.vars })).toBe('規則「r」引用的 a/b/A1 不在來源檔或出處資料裡');
});

test.describe('in the English interface', () => {
  test.use({ locale: 'en-US' });

  test('a rule error, a chart error, a rules file error and a workbook error are shown in English and never name facts.json', async ({ page }) => {
    await open(page, BLANK.replace('<p id="lead">摘要</p>', '<p id="lead">x</p><div id="c" data-chart="line" data-chart-facts="' + P + 'D10:D13" data-chart-labels="' + P + 'A10:A12"></div>'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await showPane(page);
    const pane = page.locator('#prov-pane');
    const english = async (locator, ...parts) => {
      for (const part of parts) await expect(locator).toContainText(part);
      const text = await locator.textContent();
      expect(text).not.toContain('facts.json');
      // The sheet's name is Chinese; the words around it are not.
      expect(text.split('損益表').join('')).not.toMatch(/[㐀-鿿]/);
    };

    // A rule about a cell that does not exist.
    const form = pane.locator('.prov-form');
    await form.locator('[name="id"]').fill('total');
    await form.locator('[name="total"]').fill(P + 'ZZ99');
    await form.locator('[name="parts"]').fill(P + 'D10:D13');
    await form.locator('.prov-rule-add').click();
    await english(form.locator('.prov-form-error'), '"total" refers to', P + 'ZZ99', 'is not in a source file or in the source data');
    await form.locator('[name="total"]').fill(P + 'D14');
    await form.locator('[name="tolerance"]').fill('-1');
    await form.locator('.prov-rule-add').click();
    await english(form.locator('.prov-form-error'), 'tolerance of rule "total" must be 0 or a positive number');

    // A chart with 3 labels for 4 values, through 重新填入.
    await pane.locator('.prov-refill-do').click();
    await expect(pane.locator('.prov-problems li')).toHaveCount(1);
    await english(pane.locator('.prov-problems li'), 'data-chart="line"', 'data-chart-labels has 3 labels, but each series has 4 values');
    await expect(status(page)).toHaveText('Nothing needed updating. There are 1 problems');

    // A rules file with a tag, and a file that is not a workbook.
    const tmp = tempFile('r.yaml', 'tactileRules: 1\nrules:\n  - !!map\n    id: a\n');
    try {
      await loadRules(page, tmp.file);
      await english(errorToast(page), 'Cannot load "r.yaml": Rules file, line 3: tags (!) are not supported');
    } finally { tmp.remove(); }
    const why = await page.evaluate(() => window.HE.sources.add(new File(['not a workbook'], 'plain.xlsx')).then(() => '', (err) => err.message));
    expect(why).toBe('Cannot read "plain.xlsx": its content is not in the .xlsx format. If it is an .xls or .csv file, save it as .xlsx in Excel first');

    // What the AI is told about a chart follows the interface too, and names no facts.json either.
    const requests = await script(page, [{ name: 'set_attributes', input: async () => ({ ids: [await idOf(page, '#c')], attributes: { 'data-chart': 'donut' } }) }]);
    expect(await page.evaluate(() => window.HE.ai.run('redraw'))).toBe(true);
    const problems = lastResult(requests[1]).data.fill_problems;
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('data-chart is "donut". Only bar, line and pie are supported');
    expect(JSON.stringify(lastResult(requests[1]).data)).not.toContain('facts.json');
    expect(await page.evaluate(() => [...window.HE.i18n.missing])).toEqual([]);
  });
});

/* ---------------------------------------------------------------------- */
/* 4. The numbers the AI wrote without a source                             */
/* ---------------------------------------------------------------------- */

test('after the AI writes text, the numbers that cite nothing come back as uncited_numbers; data-fact-none silences them', async ({ page }) => {
  await open(page);
  const lead = () => idOf(page, '#lead');
  const requests = await script(page, [
    { name: 'replace_html', input: async () => ({ id: await lead(), html: '<p id="lead">2026 年第 3 季營收 <b data-fact="' + TOTAL + '"></b> 元，年增 <em>12.5%</em>。<small data-fact-none="頁碼">第 5 頁</small>' +
      '<span data-fact-was="' + P + 'D10">999</span><svg width="10" height="10"><text>42</text></svg></p>' }) },
    { name: 'set_styles', input: async () => ({ ids: [await lead()], styles: { color: 'red' } }) },
    { name: 'replace_html', input: async () => ({ id: await lead(), html: '<p id="lead" data-fact-none="年份與季別"><span>2026 年第 3 季</span>營收 <b data-fact="' + TOTAL + '"></b> 元</p>' }) },
    { name: 'insert_html', input: async () => ({ ref_id: await lead(), position: 'after', html: '<ol id="list">' + Array.from({ length: 15 }, (x, i) => '<li>第 ' + (i + 1) + ' 項</li>').join('') + '</ol><p>沒有數字</p>' }) },
    { name: 'set_text', input: async () => ({ id: await idOf(page, 'h1'), text: '2026 季報' }) },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('寫摘要'))).toBe(true);
  expect(requests[0].system).toContain('"uncited_numbers"');
  expect(requests[0].system).toContain('data-fact-none');

  // The text before the citation and the text in <em>: each with the element that holds it. The cited number, the
  // number that left its source, the page number marked data-fact-none and the drawing are not listed.
  const first = lastResult(requests[1]);
  expect(first.error).toBe(false);
  expect(first.data.uncited_numbers).toHaveLength(2);
  expect(first.data.uncited_numbers[0].text).toBe('2026 年第 3 季營收');
  expect(first.data.uncited_numbers[1].text).toBe('12.5%');
  expect(first.data.uncited_numbers[0].id).toMatch(/^h[0-9a-z]+$/);
  expect(first.data.uncited_numbers[1].id).not.toBe(first.data.uncited_numbers[0].id);
  expect(first.data.fill_problems).toBeUndefined();
  // A tool that writes no text reports nothing, and neither does text inside data-fact-none.
  expect(lastResult(requests[2]).data.uncited_numbers).toBeUndefined();
  expect(lastResult(requests[3]).data.uncited_numbers).toBeUndefined();
  // At most 12, each cut short; only what this call wrote.
  const many = lastResult(requests[4]).data.uncited_numbers;
  expect(many).toHaveLength(12);
  expect(many.map((u) => u.text)).toEqual(Array.from({ length: 12 }, (x, i) => '第 ' + (i + 1) + ' 項'));
  expect(lastResult(requests[5]).data.uncited_numbers).toEqual([{ id: await idOf(page, 'h1'), text: '2026 季報' }]);
  // The same rule as the command-line tool applies to the report as it is now.
  const { scanReport } = await at('fill.mjs');
  const theirs = scanReport(await serialize(page)).uncited.map((u) => u.text);
  expect(await page.evaluate(() => window.HE.prov.uncitedIn(null, 100).map((u) => u.text))).toEqual(theirs);
  expect(theirs).toContain('2026 季報');
  expect(theirs).not.toContain('2026 年第 3 季');
});

test('uncited_numbers is there for a document that carries a block and no loaded file, and absent without source and block', async ({ page }) => {
  // Neither a source file nor a block: numbers are the user's own business.
  await open(page, BLANK, false);
  let requests = await script(page, [{ name: 'replace_html', input: async () => ({ id: await idOf(page, '#lead'), html: '<p id="lead">2026 年成長 12%</p>' }) }]);
  expect(await page.evaluate(() => window.HE.ai.run('寫'))).toBe(true);
  expect(lastResult(requests[1])).toMatchObject({ error: false });
  expect(Object.keys(lastResult(requests[1]).data)).not.toContain('uncited_numbers');
  expect(requests).toHaveLength(2);
  expect(JSON.stringify(requests[1].messages)).not.toContain('uncited_numbers');
  await page.unroute('https://api.anthropic.com/v1/messages');

  // A report that was filled elsewhere: the block is enough.
  const report = fs.readFileSync(path.join(root, 'ingest/examples/zh-hant/report.html'), 'utf8');
  await page.evaluate((doc) => window.HE.ops.replaceDocument(doc), report);
  await expect(page.frameLocator(canvasSelector).locator('body')).toBeVisible();
  expect(await block(page)).not.toBe(null);
  requests = await script(page, [{ name: 'insert_html', input: { ref_id: 'body', position: 'append', html: '<p id="extra">另外有 7 個據點</p>' } }]);
  expect(await page.evaluate(() => window.HE.ai.run('加一句'))).toBe(true);
  expect(lastResult(requests[1]).data.uncited_numbers).toEqual([{ id: await idOf(page, '#extra'), text: '另外有 7 個據點' }]);
});

/* ---------------------------------------------------------------------- */
/* 5. 插入引用, without the AI                                               */
/* ---------------------------------------------------------------------- */

test('插入引用: search a cell, insert it into the selected text, change how it shows, undo; the export passes verify at level 3', async ({ page }) => {
  await open(page);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  const frame = page.frameLocator(canvasSelector);
  const q = pane.locator('#prov-cite-q');
  await expect(q).toBeVisible();
  await expect(pane.locator('.prov-cite-show')).toBeHidden();
  const start = await steps(page);

  // The search finds cells by heading, text or address, and says where each one is.
  await q.fill('營業收入合計');
  await expect(pane.locator('.prov-cite-hit').first()).toBeVisible();
  await q.fill('損益表 d14');
  const hit = pane.locator('.prov-cite-hit[data-cell="' + TOTAL + '"]');
  await expect(hit).toHaveCount(1);
  await expect(hit).toContainText('482,000,000');
  await expect(hit).toContainText('2026Q3.xlsx › 損益表 › D14');
  await expect(hit).toContainText('營業收入合計');
  await q.fill('沒有這種儲存格 zzz');
  await expect(pane.locator('.prov-cite-hits')).toHaveText('找不到符合的儲存格。');
  await q.fill('損益表 d14');

  // With nothing selected the user is told to select first, and nothing is written.
  await page.evaluate(() => window.HE.sel.clear());
  await hit.click();
  await expect(errorToast(page)).toContainText('請先在頁面上選取 1 個文字元素');
  expect(await steps(page)).toBe(start);
  // An element that is not text is refused too.
  await page.evaluate(() => window.HE.sel.set([window.HE.doc.model.body.getAttribute('data-he-id')]));
  await hit.click();
  await expect(errorToast(page)).toContainText('選取的元素不能放引用');
  expect(await steps(page)).toBe(start);

  // Selected text: the citation goes after it, filled at once, as one step, and becomes the selection.
  await page.evaluate((id) => window.HE.sel.set([id]), await idOf(page, '#lead'));
  await hit.click();
  await expect(status(page)).toHaveText('已把引用加在文字最後');
  const cited = frame.locator('#lead > span[data-fact="' + TOTAL + '"]');
  await expect(cited).toHaveText('482,000,000');
  expect(await page.evaluate(() => window.HE.doc.model.querySelector('#lead').innerHTML.replace(/ data-he-id="[^"]*"/g, ''))).toBe('摘要<span data-fact="' + TOTAL + '">482,000,000</span>');
  expect(await steps(page)).toBe(start + 1);
  const spanId = await idOf(page, '#lead > span');
  expect(await page.evaluate(() => window.HE.sel.ids)).toEqual([spanId]);
  expect(Object.keys((await block(page)).facts)).toEqual([TOTAL]);

  // How it shows: the factor, the decimals, the separators. Each change is filled at once and is one step.
  const show = pane.locator('.prov-cite-show');
  await expect(show).toBeVisible();
  await expect(show).toContainText('2026Q3.xlsx › 損益表 › D14');
  await expect(show.locator('#prov-show-scale')).toHaveValue('');
  await expect(show.locator('#prov-show-scale option')).toHaveText(['原值', '千（÷ 1,000）', '萬（÷ 10,000）', '百萬（÷ 1,000,000）', '億（÷ 100,000,000）', '百分比（× 100）', '自訂']);
  await show.locator('#prov-show-scale').selectOption('1e-8');
  await expect(cited).toHaveText('5');
  await show.locator('#prov-show-digits').selectOption('2');
  await expect(cited).toHaveText('4.82');
  expect(await steps(page)).toBe(start + 3);
  await expect(show.locator('#prov-show-scale')).toHaveValue('1e-8');
  await show.locator('#prov-show-scale').selectOption('custom');
  expect(await steps(page)).toBe(start + 3); // nothing until a factor is typed
  await show.locator('#prov-show-scale-custom').fill('0.001');
  await show.locator('#prov-show-scale-custom').press('Enter');
  await expect(cited).toHaveText('482,000.00');
  await expect(show.locator('#prov-show-scale')).toHaveValue('custom');
  await expect(show.locator('#prov-show-scale-custom')).toHaveValue('0.001');
  await show.locator('#prov-show-group').uncheck();
  await expect(cited).toHaveText('482000.00');
  expect(await page.evaluate(() => { const el = window.HE.doc.model.querySelector('#lead > span'); return ['scale', 'digits', 'group'].map((k) => el.getAttribute('data-fact-' + k)); })).toEqual(['0.001', '2', 'off']);
  expect(await steps(page)).toBe(start + 5);
  // A factor that is not a positive number is refused where it was typed, and nothing changes.
  await show.locator('#prov-show-scale-custom').fill('-3');
  await show.locator('#prov-show-scale-custom').press('Enter');
  await expect(show.locator('.prov-form-error')).toContainText('data-fact-scale');
  await expect(cited).toHaveText('482000.00');
  expect(await steps(page)).toBe(start + 5);
  // The number is one the panel knows, and it agrees with its source.
  await expect(pane).toContainText('1 相符');
  await expect(pane.locator('.prov-counts')).toContainText('0 不符');

  // A second citation, after the first one, which is what is selected.
  await q.fill('損益表 d10');
  await pane.locator('.prov-cite-hit[data-cell="' + P + 'D10"]').click();
  await expect(status(page)).toHaveText('已在選取的引用後面插入引用');
  await expect(frame.locator('#lead > span')).toHaveText(['482000.00', '142,000,000']);
  expect(await steps(page)).toBe(start + 6);

  // The file the user saves passes the command-line tool against the workbook.
  const v = verify(await serialize(page), [BOOK]);
  expect(v.problems).toEqual([]);
  expect(v).toMatchObject({ status: 0, pass: true, reached: 3, levels: { 1: 'pass', 2: 'pass', 3: 'pass' }, counts: { mismatch: 0, missing: 0 } });

  // Undo, step by step, back to the page as it was.
  await page.evaluate(() => window.HE.history.undo());
  await expect(frame.locator('#lead > span')).toHaveCount(1);
  await page.evaluate(() => { window.HE.history.undo(); window.HE.history.undo(); });
  await expect(cited).toHaveText('4.82');
  await page.evaluate(() => { window.HE.history.undo(); window.HE.history.undo(); });
  await expect(cited).toHaveText('482,000,000');
  await page.evaluate(() => window.HE.history.undo());
  await expect(frame.locator('#lead')).toHaveText('摘要');
  expect(await block(page)).toBe(null);
  expect(await steps(page)).toBe(start);
});

test('插入引用 while typing puts the citation where the caret is, in one undo step with what was typed', async ({ page }) => {
  await open(page, BLANK.replace('<p id="lead">摘要</p>', '<p id="lead">本季營收元，<b>較上季</b>成長。</p>'));
  await showPane(page);
  const pane = page.locator('#prov-pane');
  const frame = page.frameLocator(canvasSelector);
  const lead = await idOf(page, '#lead');
  await pane.locator('#prov-cite-q').fill('損益表 d14');
  const hit = pane.locator('.prov-cite-hit[data-cell="' + TOTAL + '"]');
  await expect(hit).toBeVisible();
  const start = await steps(page);

  // The caret after 本季營收 (4 characters in), by the keyboard, as a user would put it.
  await page.evaluate((id) => { window.HE.sel.set([id]); window.HE.canvas.startTextEdit(id, { atStart: true }); }, lead);
  await expect(frame.locator('#lead')).toHaveAttribute('contenteditable', 'true');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');
  // Clicking the result ends the typing, as any click in the panel does; the citation still goes to the caret.
  await hit.click();
  await expect(status(page)).toHaveText('已在游標處插入引用');
  expect(await page.evaluate(() => window.HE.doc.model.querySelector('#lead').innerHTML.replace(/ data-he-id="[^"]*"/g, ''))).toBe('本季營收 <span data-fact="' + TOTAL + '">482,000,000</span>元，<b>較上季</b>成長。');
  await expect(frame.locator('#lead')).toHaveText('本季營收 482,000,000元，較上季成長。');
  expect(await steps(page)).toBe(start + 2); // the typed space, then the citation

  // Inside an inline element: the caret after 較上 splits the <b>, and its other content stays.
  await page.evaluate((id) => { window.HE.sel.set([id]); window.HE.canvas.startTextEdit(id, { atEnd: true }); }, lead);
  await expect(frame.locator('#lead')).toHaveAttribute('contenteditable', 'true');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await pane.locator('#prov-cite-q').fill('損益表 d10');
  await pane.locator('.prov-cite-hit[data-cell="' + P + 'D10"]').click();
  await expect(status(page)).toHaveText('已在游標處插入引用');
  await expect(frame.locator('#lead b')).toHaveText('較上142,000,000季');
  await expect(frame.locator('#lead b > span[data-fact="' + P + 'D10"]')).toHaveText('142,000,000');
  expect(await steps(page)).toBe(start + 3);
  expect(verify(await serialize(page), [BOOK])).toMatchObject({ status: 0, pass: true, reached: 3 });

  // Undo takes the citation out and leaves the text as it was typed.
  await page.evaluate(() => { window.HE.history.undo(); window.HE.history.undo(); });
  await expect(frame.locator('#lead')).toHaveText('本季營收 元，較上季成長。');
  expect(await page.evaluate(() => window.HE.doc.model.querySelectorAll('[data-fact]').length)).toBe(0);
});

test('插入引用 without a source file says to drop an .xlsx in, and a cited text cell cannot be given a factor', async ({ page }) => {
  await open(page, BLANK, false);
  await showPane(page);
  const pane = page.locator('#prov-pane');
  const hint = pane.locator('.prov-cite .prov-cite-hint');
  await expect(hint).toBeVisible();
  await expect(hint).toHaveText('還沒有來源檔。把 Excel 檔（.xlsx）拖進視窗，就能搜尋儲存格並插入引用。');
  await expect(pane.locator('#prov-cite-q')).toBeHidden();
  await expect(pane.locator('.prov-rules-load')).toHaveCount(0);

  await page.evaluate(async (b64) => { await window.HE.sources.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], '2026Q3.xlsx')); }, fs.readFileSync(BOOK).toString('base64'));
  await expect(pane.locator('#prov-cite-q')).toBeVisible();
  await expect(hint).toBeHidden();
  // A heading cell is cited as its text; a factor on text is refused, and the element stays as it was.
  await page.evaluate((id) => window.HE.sel.set([id]), await idOf(page, '#lead'));
  await pane.locator('#prov-cite-q').fill('損益表 a14');
  await pane.locator('.prov-cite-hit[data-cell="' + P + 'A14"]').click();
  const cited = page.frameLocator(canvasSelector).locator('#lead > span');
  await expect(cited).toHaveText('營業收入合計');
  const count = await steps(page);
  await pane.locator('#prov-show-scale').selectOption('100');
  await expect(pane.locator('.prov-cite-show .prov-form-error')).toContainText('不是 number');
  await expect(cited).toHaveText('營業收入合計');
  expect(await steps(page)).toBe(count);
  expect(await page.evaluate(() => window.HE.doc.model.querySelector('#lead > span').hasAttribute('data-fact-scale'))).toBe(false);
});
