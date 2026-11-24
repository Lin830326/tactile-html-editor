const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const htmlIds = [
  'clean', 'low', 'mid', 'large-ok', 'grad-text', 'line-link', 'on-image', 'tiny', 'h2-small', 'h3-big', 'h4-flat',
  'wide', 'clip-text', 'clip-box', 'ellipsis', 'sr', 'over-a', 'over-b', 'odd-space', 'uneven',
  'tight-title', 'tight-text', 'faq-answer', 'faq-question',
];

async function openFixture(page) {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc);
  const html = await readFile(path.join(__dirname, 'fixtures', '04-design-check.html'), 'utf8');
  expect(await page.evaluate(source => HE.fileio.openText(source, '04-design-check.html'), html)).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator('#title')).toHaveText('設計檢查樣本');
  await page.waitForFunction(() => HE.live.doc && HE.live.doc.getElementById('uneven'));
  return page.evaluate(list => Object.fromEntries(list.map(id => [id, HE.doc.model.getElementById(id).getAttribute('data-he-id')])), htmlIds);
}

function issuesFor(result, check, id) {
  return result.issues.filter(issue => issue.check === check && issue.ids.includes(id));
}

test('design check measures contrast, type, overflow, overlap and spacing on the canvas', async ({ page }) => {
  const ids = await openFixture(page);
  const result = await page.evaluate(() => HE.design.check({ maxIssues: 100 }));

  expect(result.scope).toBe('whole page');
  expect(result.summary.body_text).toMatch(/^16px \/ 400/);

  const low = issuesFor(result, 'contrast', ids.low);
  expect(low).toHaveLength(1);
  expect(low[0].level).toBe('error');
  expect(low[0].message).toContain('#aaaaaa on #ffffff');
  expect(issuesFor(result, 'contrast', ids.mid)[0].level).toBe('warn');
  expect(issuesFor(result, 'contrast', ids['large-ok'])).toHaveLength(0);
  expect(issuesFor(result, 'contrast', ids['grad-text'])[0].message).toContain('on a gradient (worst stop #ffffff)');
  // A thin unrepeated line under the text (the underline effect) is not the text's background.
  expect(issuesFor(result, 'contrast', ids['line-link'])).toHaveLength(0);
  expect(result.issues.some(issue => issue.ids.includes(ids['on-image']))).toBe(false);
  expect(result.not_checked.join('\n')).toContain(ids['on-image']);

  expect(issuesFor(result, 'small_text', ids.tiny)).toHaveLength(1);
  const inverted = issuesFor(result, 'hierarchy', ids['h3-big']);
  expect(inverted).toHaveLength(1);
  expect(inverted[0].message).toBe('h3 headings (26px) are larger than h2 headings (18px).');
  expect(inverted[0].ids).toContain(ids['h2-small']);
  expect(issuesFor(result, 'hierarchy', ids['h4-flat'])[0].message).toContain('reads as body text');

  const wide = issuesFor(result, 'overflow', ids.wide);
  expect(wide).toHaveLength(1);
  expect(wide[0].level).toBe('error');
  const clipped = issuesFor(result, 'overflow', ids['clip-text']);
  expect(clipped).toHaveLength(1);
  expect(clipped[0].message).toContain('[' + ids['clip-box'] + ']');
  expect(result.issues.some(issue => issue.ids.includes(ids.ellipsis))).toBe(false);
  expect(result.issues.some(issue => issue.ids.includes(ids.sr))).toBe(false);

  const overlap = issuesFor(result, 'overlap', ids['over-a']);
  expect(overlap).toHaveLength(1);
  expect(overlap[0].ids).toEqual([ids['over-a'], ids['over-b']]);
  // Only the two positioned paragraphs: not a tight line-height, not the answers inside closed <details>.
  expect(result.issues.filter(issue => issue.check === 'overlap')).toHaveLength(1);
  for (const id of ['tight-title', 'tight-text', 'faq-answer']) {
    expect(result.issues.some(issue => issue.ids.includes(ids[id]))).toBe(false);
  }

  expect(issuesFor(result, 'spacing', ids['odd-space'])[0].message).toContain('Spacing of 15px');
  expect(issuesFor(result, 'spacing', ids.uneven)[0].message).toContain('gaps: 8, 32px');

  const rank = { error: 0, warn: 1, info: 2 };
  const levels = result.issues.map(issue => rank[issue.level]);
  expect(levels).toEqual([...levels].sort((a, b) => a - b));

  const before = await page.evaluate(() => HE.doc.serialize());
  expect(await page.evaluate(() => HE.history.canUndo())).toBe(false);
  expect(before).not.toContain('data-he-editor');
});

test('design check limited to a clean section reports nothing', async ({ page }) => {
  const ids = await openFixture(page);
  const result = await page.evaluate(id => HE.design.check({ ids: [id] }), ids.clean);
  expect(result.scope).toContain(ids.clean);
  expect(result.issues).toEqual([]);
  const only = await page.evaluate(id => HE.design.check({ ids: [id], checks: ['contrast'] }), ids.low);
  expect(only.issues.map(issue => issue.check)).toEqual(['contrast']);
});

test('text that scrolls inside a rounded box and a heading with a long small label are not flagged', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc);
  // Both came up in the templates: a code block whose rounded frame hides overflow while the <pre> scrolls,
  // and a menu heading whose English label has more letters than the heading has characters.
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>誤報樣本</title>
<style>
  body { margin: 0; padding: 24px; font: 16px/1.6 system-ui, sans-serif; color: #1f2937; background: #ffffff; }
  pre { margin: 0; font: inherit; }
</style>
</head>
<body>
  <h1 id="title">誤報樣本</h1>
  <h2 id="labelled" style="font-size: 24px;">前菜 <small style="font-size: 13px; font-weight: 500;">APPETIZERS</small></h2>
  <p>一般內文，用來決定內文的字級。這一段寫得比較長，讓內文的字數比標題和程式碼都多。</p>
  <p>一般內文，用來決定內文的字級。這一段寫得比較長，讓內文的字數比標題和程式碼都多。</p>
  <div id="code-box" style="width: 240px; border-radius: 8px; overflow: hidden; background: #f3f4f6;">
    <pre id="code" style="padding: 12px; overflow-x: auto;">curl https://api.example.com/v2/messages -H "Authorization: Bearer test"</pre>
  </div>
  <div id="cut-box" style="width: 160px; margin-top: 16px; overflow: hidden;">
    <pre id="cut" style="width: 320px; overflow-x: auto;">這個會捲動的框比外框寬，右半邊捲到底也看不到。</pre>
  </div>
</body>
</html>`;
  expect(await page.evaluate(source => HE.fileio.openText(source, 'false-alarms.html'), html)).toBe(true);
  await page.waitForFunction(() => HE.live.doc && HE.live.doc.getElementById('cut'));
  const ids = await page.evaluate(list => Object.fromEntries(list.map(id => [id, HE.doc.model.getElementById(id).getAttribute('data-he-id')])),
    ['labelled', 'code', 'cut', 'cut-box']);
  const result = await page.evaluate(() => HE.design.check({ maxIssues: 100 }));

  expect(issuesFor(result, 'hierarchy', ids.labelled)).toEqual([]);
  expect(issuesFor(result, 'overflow', ids.code)).toEqual([]);
  // A scroller wider than the box that clips it still loses its right half, scrolled or not.
  const cut = issuesFor(result, 'overflow', ids.cut);
  expect(cut).toHaveLength(1);
  expect(cut[0].message).toContain('[' + ids['cut-box'] + ']');
});

test('the AI agent can call check_design and gets the measured issues back', async ({ page }) => {
  const ids = await openFixture(page);
  const requests = [];
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
  await page.route('https://api.anthropic.com/v1/messages', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const reply = requests.length === 1
      ? { id: 'msg_test_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'toolu_test_1', name: 'check_design', input: {} }] }
      : { id: 'msg_test_2', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn',
        content: [{ type: 'text', text: '找到幾個設計問題。' }] };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(reply) });
  });
  await page.evaluate(() => {
    HE.settings.set('ai.provider', 'anthropic');
    HE.settings.set('ai.anthropic.key', 'test-key-for-mocked-api');
  });

  expect(await page.evaluate(() => HE.ai.run('檢查設計問題'))).toBe(true);

  expect(requests).toHaveLength(2);
  expect(requests[0].tools.map(tool => tool.name)).toContain('check_design');
  expect(requests[0].system).toContain('check_design');
  const result = requests[1].messages.at(-1).content[0];
  expect(result.type).toBe('tool_result');
  expect(result.tool_use_id).toBe('toolu_test_1');
  expect(result.is_error).toBeFalsy();
  const report = JSON.parse(result.content);
  expect(report.issues.some(issue => issue.check === 'contrast' && issue.ids.includes(ids.low))).toBe(true);
  expect(await page.evaluate(() => HE.history.canUndo())).toBe(false);
  await expect(page.locator('#ai-pane')).toContainText('檢查設計');
});
