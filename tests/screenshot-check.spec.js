const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function boot(page, init) {
  if (init) await page.addInitScript(init);
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc && HE.snap);
}

async function openFixture(page) {
  const html = await readFile(path.join(__dirname, 'fixtures', '04-design-check.html'), 'utf8');
  expect(await page.evaluate(source => HE.fileio.openText(source, '04-design-check.html'), html)).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator('#title')).toHaveText('設計檢查樣本');
  await page.waitForFunction(() => HE.live.doc && HE.live.doc.getElementById('uneven'));
  await page.evaluate(() => HE.sel.clear());
  return page.evaluate(() => ({
    title: HE.doc.model.getElementById('title').getAttribute('data-he-id'),
    low: HE.doc.model.getElementById('low').getAttribute('data-he-id'),
  }));
}

/** Share of pixels that differ clearly between two images drawn at w x h (JPEG noise stays under the threshold). */
function pixelDiff(page, a, b, w, h) {
  return page.evaluate(async ([a, b, w, h]) => {
    const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const px = (img) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, w, h);
      return g.getImageData(0, 0, w, h).data;
    };
    const [da, db] = (await Promise.all([load(a), load(b)])).map(px);
    let bad = 0;
    for (let k = 0; k < da.length; k += 4) {
      const d = Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2]));
      if (d > 48) bad++;
    }
    return bad / (w * h);
  }, [a, b, w, h]);
}

function anthropicMock(page, replies) {
  const requests = [];
  return page.route('https://api.anthropic.com/v1/messages', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const content = replies[requests.length - 1] || [{ type: 'text', text: 'OK' }];
    const reply = {
      id: 'msg_test_' + requests.length, type: 'message', role: 'assistant', model: body.model,
      stop_reason: content.some(block => block.type === 'tool_use') ? 'tool_use' : 'end_turn', content,
    };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(reply) });
  }).then(() => requests);
}

async function useAnthropic(page, look) {
  await page.evaluate(on => {
    HE.settings.set('ai.provider', 'anthropic');
    HE.settings.set('ai.anthropic.key', 'test-key-for-mocked-api');
    HE.settings.set('ai.look', on);
    HE.ai.focus();
  }, look);
}

test('a capture of what is on screen matches the canvas, for every template', async ({ page }) => {
  test.setTimeout(120000);
  await boot(page);
  expect(await page.evaluate(() => HE.snap.probe())).toBe(true);
  const keys = await page.evaluate(() => HE.samples.list.map(s => s.key));
  expect(keys.length).toBeGreaterThanOrEqual(14);
  for (const key of keys) {
    await page.evaluate(k => HE.fileio.newDoc(k), key);
    await page.evaluate(() => { HE.canvas.setDevice('desktop'); HE.sel.clear(); });
    await page.mouse.move(5, 890);
    await page.waitForTimeout(800);
    const shot = await page.evaluate(() => HE.snap.capture({}).then(s => ({
      dataUrl: s.dataUrl, mediaType: s.mediaType, width: s.width, height: s.height, rect: s.rect, viewport: s.viewport, missing: s.missing,
    })));
    expect(shot.mediaType).toBe('image/jpeg');
    expect(shot.missing, key).toEqual([]);
    expect(shot.rect.w).toBe(shot.viewport.w);
    expect(shot.rect.h).toBe(shot.viewport.h);
    // Toasts (a template with effects says how to see them) float over the canvas; the capture is of the page alone.
    await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    // The capture is of the page without its scrollbar. WebKit gives the desktop canvas a scrollbar that takes 10px,
    // so the picture of the whole frame is wider than the capture; only the page's part of it is compared.
    // Playwright's Firefox gives the frame's corner as 263.99997, 47.999996 and cuts the picture from 263, 47: one
    // pixel off both ways, which is 8% of a page with fine lines. The corner is on a whole pixel, so it is rounded.
    const box = await page.locator(canvasSelector).boundingBox();
    const clip = { x: Math.round(box.x), y: Math.round(box.y), width: shot.rect.w, height: shot.rect.h };
    const real = 'data:image/png;base64,' + (await page.screenshot({ clip })).toString('base64');
    expect(await pixelDiff(page, shot.dataUrl, real, shot.rect.w, shot.rect.h), key).toBeLessThan(0.05);
  }
});

test('the captured area follows the changed elements and stays within two screens', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => HE.fileio.newDoc('landing'));
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const de = HE.live.doc.documentElement;
    const els = Array.from(HE.live.doc.querySelectorAll('[data-he-id]')).filter(el => {
      const b = el.getBoundingClientRect();
      return b.top > de.clientHeight * 2 && b.height > 0 && b.height < de.clientHeight / 2;
    });
    const deep = els[0];
    const r = deep.getBoundingClientRect();
    const region = HE.snap.regionFor([deep.getAttribute('data-he-id')]);
    const whole = HE.snap.regionFor([HE.live.doc.body.getAttribute('data-he-id')]);
    return { top: r.top, bottom: r.bottom, region, whole, vh: de.clientHeight, vw: de.clientWidth };
  });
  expect(out.region.y).toBeLessThanOrEqual(out.top);
  expect(out.region.y + out.region.h).toBeGreaterThanOrEqual(out.bottom);
  expect(out.region.h).toBeGreaterThanOrEqual(out.vh);
  expect(out.region.h).toBeLessThanOrEqual(out.vh * 2);
  expect(out.region.w).toBe(out.vw);
  // A change to <body> alone says nothing about where to look: what is on screen.
  expect(out.whole.h).toBe(out.vh);
});

test('images the page cannot read back and outside frames become labelled boxes', async ({ page }) => {
  await boot(page);
  await page.route('https://img.example.test/**', route => {
    // The page shows the image, but a script may not read it back (no CORS).
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1PX });
    return route.abort();
  });
  await page.route('https://embed.example.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>embedded</p>' }));
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>.box img{display:block}</style></head><body>' +
    '<div class="box"><img id="pic" alt="產品照" src="https://img.example.test/a.png" style="width:200px;height:100px"></div>' +
    '<iframe id="map" src="https://embed.example.test/map" style="width:300px;height:120px;border:0"></iframe>' +
    '<p id="after" @click="go" :class="x">之後的段落</p></body></html>';
  expect(await page.evaluate(source => HE.fileio.openText(source, 'embeds.html'), html)).toBe(true);
  await page.waitForFunction(() => {
    const img = HE.live.doc && HE.live.doc.getElementById('pic');
    return img && img.complete && img.naturalWidth > 0;
  });
  const shot = await page.evaluate(() => HE.snap.capture({}).then(s => ({ missing: s.missing, width: s.width })));
  expect(shot.missing).toContain('image from img.example.test');
  expect(shot.missing).toContain('embedded frame from embed.example.test');
  expect(shot.width).toBeGreaterThan(0);
});

test('with 修改後看畫面 on, the agent sees one screenshot after its edits and its fix joins the same undo step', async ({ page }) => {
  await boot(page);
  const ids = await openFixture(page);
  const requests = await anthropicMock(page, [
    [{ type: 'tool_use', id: 'toolu_1', name: 'set_styles', input: { ids: [ids.low], styles: { color: '#cccccc' } } }],
    [{ type: 'text', text: '已把灰字改淡。' }],
    [{ type: 'tool_use', id: 'toolu_2', name: 'set_styles', input: { ids: [ids.low], styles: { color: '#4b5563' } } }],
    [{ type: 'text', text: '看了截圖，灰字太淡，已調深。' }],
  ]);
  await useAnthropic(page, true);
  await expect(page.locator('#ai-look')).toBeVisible();
  await expect(page.locator('#ai-look')).toBeChecked();

  expect(await page.evaluate(() => HE.ai.run('把灰字改淡一點'))).toBe(true);

  expect(requests).toHaveLength(4);
  expect(requests[0].system).toContain('Screenshot check');
  expect(requests[0].messages[0].content).toContain('Screenshot check after edits (「修改後看畫面」): on');
  const look = requests[2].messages.at(-1);
  expect(look.role).toBe('user');
  expect(look.content[0].type).toBe('image');
  expect(look.content[0].source.media_type).toBe('image/jpeg');
  expect(look.content[0].source.data.length).toBeGreaterThan(2000);
  expect(look.content[1].text).toContain('Screenshot check (sent by the editor');
  // The picture continues the same turn: the reply that came before it is still there.
  expect(requests[2].messages.at(-2).role).toBe('assistant');
  await expect(page.locator('#ai-pane .ai-look-out')).toContainText('灰字太淡');
  await expect(page.locator('#ai-pane')).toContainText('看修改後的畫面');

  const color = () => page.evaluate(() => HE.doc.model.getElementById('low').style.color);
  expect(await color()).toBe('rgb(75, 85, 99)');
  await page.evaluate(() => HE.history.undo());
  expect(await color()).toBe('rgb(170, 170, 170)');
});

test('the screenshot check answers OK quietly and stays off by default', async ({ page }) => {
  await boot(page);
  const ids = await openFixture(page);
  const requests = await anthropicMock(page, [
    [{ type: 'tool_use', id: 'toolu_1', name: 'set_text', input: { id: ids.title, text: '新的標題' } }],
    [{ type: 'text', text: '已改標題。' }],
    [{ type: 'text', text: 'OK' }],
    [{ type: 'tool_use', id: 'toolu_3', name: 'set_text', input: { id: ids.title, text: '再一次' } }],
    [{ type: 'text', text: '已改。' }],
  ]);
  await useAnthropic(page, true);
  expect(await page.evaluate(() => HE.ai.run('改標題'))).toBe(true);
  expect(requests).toHaveLength(3);
  await expect(page.locator('#ai-pane .ai-look-out').last()).toContainText('看過修改後的畫面，沒有發現問題。');

  await page.locator('#ai-look').uncheck();
  expect(await page.evaluate(() => HE.settings.get('ai.look'))).toBe(false);
  expect(await page.evaluate(() => HE.ai.run('再改一次'))).toBe(true);
  expect(requests).toHaveLength(5);
  expect(JSON.stringify(requests[4].messages.at(-1))).not.toContain('"image"');
  expect(requests[3].messages.at(-1).content).toContain('Screenshot check after edits (「修改後看畫面」): off');
});

test('a run that changes nothing sends no screenshot', async ({ page }) => {
  await boot(page);
  await openFixture(page);
  const requests = await anthropicMock(page, [[{ type: 'text', text: '這一頁的標題是「設計檢查樣本」。' }]]);
  await useAnthropic(page, true);
  expect(await page.evaluate(() => HE.ai.run('標題是什麼？'))).toBe(true);
  expect(requests).toHaveLength(1);
  await expect(page.locator('#ai-pane')).not.toContainText('看修改後的畫面');
});

test('OpenAI-compatible services get the screenshot as an image_url in a user message', async ({ page }) => {
  await boot(page);
  const ids = await openFixture(page);
  const requests = [];
  await page.route('http://llm.example.test/v1/chat/completions', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const n = requests.length;
    const message = n === 1
      ? { role: 'assistant', content: '', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'set_text', arguments: JSON.stringify({ id: ids.title, text: '新標題' }) } }] }
      : { role: 'assistant', content: n === 2 ? '已改好。' : 'OK' };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors,
      body: JSON.stringify({ choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] }) });
  });
  await page.evaluate(() => {
    HE.settings.set('ai.provider', 'openai');
    HE.settings.set('ai.openai.base', 'http://llm.example.test/v1');
    HE.settings.set('ai.openai.model', 'vision-model');
    HE.settings.set('ai.look', true);
  });
  expect(await page.evaluate(() => HE.ai.run('改標題'))).toBe(true);
  expect(requests).toHaveLength(3);
  const look = requests[2].messages.at(-1);
  expect(look.role).toBe('user');
  expect(look.content[0].type).toBe('text');
  expect(look.content[1].type).toBe('image_url');
  expect(look.content[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
  await expect(page.locator('#ai-pane .ai-look-out')).toContainText('沒有發現問題');
});

test('a model that cannot take images leaves the edit in place and says the check did not finish', async ({ page }) => {
  await boot(page);
  const ids = await openFixture(page);
  let calls = 0;
  await page.route('http://llm.example.test/v1/chat/completions', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    calls++;
    if (calls === 3) {
      await route.fulfill({ status: 400, contentType: 'application/json', headers: cors, body: JSON.stringify({ error: { message: 'model does not support image input' } }) });
      return;
    }
    const message = calls === 1
      ? { role: 'assistant', content: '', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'set_text', arguments: JSON.stringify({ id: ids.title, text: '新標題' }) } }] }
      : { role: 'assistant', content: '已改好。' };
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors,
      body: JSON.stringify({ choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] }) });
  });
  await page.evaluate(() => {
    HE.settings.set('ai.provider', 'openai');
    HE.settings.set('ai.openai.base', 'http://llm.example.test/v1');
    HE.settings.set('ai.openai.model', 'text-model');
    HE.settings.set('ai.look', true);
  });
  expect(await page.evaluate(() => HE.ai.run('改標題'))).toBe(true);
  expect(await page.evaluate(() => HE.doc.model.getElementById('title').textContent)).toBe('新標題');
  await expect(page.locator('#ai-pane')).toContainText('看畫面沒有完成');
  await expect(page.locator('#ai-pane .ai-error')).toHaveCount(0);
});

test('in a claude.ai Artifact the screenshot goes to sample() as an image, only where the view takes images', async ({ page }) => {
  await boot(page, () => {
    const calls = [];
    window.__sampleCalls = calls;
    window.__sampleImages = true;
    const sample = async (input, opts = {}) => {
      calls.push({ input, images: opts.images ? opts.images.map(b => ({ type: b.type, size: b.size })) : null });
      if (!opts.images) {
        const tool = opts.tools.find(t => t.name === 'set_text');
        const id = window.HE.doc.model.getElementById('title').getAttribute('data-he-id');
        await tool.execute({ id, text: '新的標題' }, {});
        return { text: '已改標題。', truncated: false };
      }
      return { text: 'OK', truncated: false };
    };
    sample.limits = async () => ({
      maxPromptBytes: 262144,
      tools: { maxCount: 32 },
      modelTiers: ['quick', 'default', 'complex'],
      ...(window.__sampleImages ? { images: { maxCount: 4, maxBytes: 20000000, mediaTypes: ['image/jpeg', 'image/png'] } } : {}),
    });
    sample.json = async () => ({ reply: '', ops: [] });
    window.claude = { use: async name => (name === 'sample' ? sample : null) };
  });
  await openFixture(page);
  await page.evaluate(() => { HE.settings.set('ai.look', true); HE.ai.focus(); });
  await expect(page.locator('#ai-look')).toBeVisible();
  expect(await page.evaluate(() => HE.ai.run('改標題'))).toBe(true);
  const calls = await page.evaluate(() => window.__sampleCalls);
  expect(calls).toHaveLength(2);
  expect(calls[0].images).toBeNull();
  expect(calls[1].images).toHaveLength(1);
  expect(calls[1].images[0].type).toBe('image/jpeg');
  expect(calls[1].images[0].size).toBeGreaterThan(1000);
  const last = calls[1].input.at(-1);
  expect(last.role).toBe('user');
  expect(last.content).toContain('Screenshot check (sent by the editor');
  expect(last.content).toMatch(/The user asked \[[0-9a-f]{12}\]: 改標題/);
  await expect(page.locator('#ai-pane .ai-look-out')).toContainText('沒有發現問題');
});

test('the toggle is hidden in an Artifact view that cannot send images', async ({ page }) => {
  await boot(page, () => {
    const sample = async () => ({ text: 'OK' });
    sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: 32 } });
    window.claude = { use: async name => (name === 'sample' ? sample : null) };
  });
  await page.evaluate(() => { HE.settings.set('ai.look', true); HE.ai.focus(); });
  await page.waitForFunction(() => window.HE.ai.provider().ready);
  await page.waitForTimeout(200);
  await expect(page.locator('label.ai-look')).toHaveAttribute('hidden', '');
});
