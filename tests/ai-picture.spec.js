const { test, expect } = require('@playwright/test');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };

/** A 200 x 400 picture: a blue band on top, a white band with a red block in the middle, a green band below. */
async function openWithPicture(page) {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  const src = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = '#1d4ed8'; g.fillRect(0, 0, 200, 100);
    g.fillStyle = '#ffffff'; g.fillRect(0, 100, 200, 200);
    g.fillStyle = '#dc2626'; g.fillRect(60, 160, 80, 80);
    g.fillStyle = '#15803d'; g.fillRect(0, 300, 200, 100);
    return c.toDataURL('image/png');
  });
  await page.evaluate((s) => window.HE.ops.replaceDocument(
    '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>t</title></head><body><h1>圖</h1><img id="pic" width="200" height="400" alt="" src="' + s + '"></body></html>'), src);
  const img = page.frameLocator(canvasSelector).locator('#pic');
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el) => el.naturalHeight)).toBe(400);
  await page.evaluate(() => { window.HE.settings.set('ai.provider', 'anthropic'); window.HE.settings.set('ai.anthropic.key', 'test-key-for-mocked-api'); });
  return img;
}
const idOf = (page, sel) => page.evaluate((s) => window.HE.doc.model.querySelector(s).getAttribute('data-he-id'), sel);

test('a selected image is sent with the request, and crop_image keeps the part the model names', async ({ page }) => {
  const img = await openWithPicture(page);
  const id = await idOf(page, '#pic');
  const requests = [];
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const first = requests.length === 1;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(first
      ? { id: 'msg_1', type: 'message', role: 'assistant', model: body.model, stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'crop_image', input: { id, left: 0, top: 25, right: 100, bottom: 75 } }] }
      : { id: 'msg_2', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '已裁切。' }] }) });
  });

  await page.evaluate((i) => window.HE.sel.set([i]), id);
  expect(await page.evaluate(() => window.HE.ai.run('裁切圖片，只留中間'))).toBe(true);

  // The first request carries the image itself and says what it is.
  const content = requests[0].messages.at(-1).content;
  expect(Array.isArray(content)).toBe(true);
  const picture = content.find((c) => c.type === 'image');
  expect(picture.source.media_type).toBe('image/jpeg');
  expect(picture.source.data.length).toBeGreaterThan(200);
  const text = content.find((c) => c.type === 'text').text;
  expect(text).toContain('Selected picture: the attached image is the selected <img> itself, whole (200 x 400 px');
  expect(requests[0].tools.map((t) => t.name)).toContain('crop_image');

  // The middle half is what is left: 200 x 200, white with the red block, and the height attribute follows.
  await expect.poll(() => img.evaluate((el) => el.naturalWidth + 'x' + el.naturalHeight)).toBe('200x200');
  const colours = await img.evaluate((el) => {
    const c = document.createElement('canvas');
    c.width = el.naturalWidth; c.height = el.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(el, 0, 0);
    const at = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data).slice(0, 3).join(',');
    return [at(5, 5), at(100, 100), at(5, 195)];
  });
  expect(colours).toEqual(['255,255,255', '220,38,38', '255,255,255']);
  expect(await img.getAttribute('height')).toBe('200');
  expect(await img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  // The result goes back to the model as an ordinary tool result.
  const result = requests[1].messages.at(-1).content[0];
  expect(result.type).toBe('tool_result');
  expect(JSON.parse(result.content)).toMatchObject({ ok: true, width: 200, height: 200, was: '200x400' });

  // One undo brings the whole picture back.
  await page.evaluate(() => window.HE.history.undo());
  await expect.poll(() => img.evaluate((el) => el.naturalHeight)).toBe(400);
  expect(await img.getAttribute('height')).toBe('400');
});

test('no picture is sent when the selection holds none, and a wrong crop is refused with a reason', async ({ page }) => {
  await openWithPicture(page);
  const h1 = await idOf(page, 'h1');
  const pic = await idOf(page, '#pic');
  const requests = [];
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const calls = [
      { name: 'crop_image', input: { id: h1, left: 0, top: 0, right: 50, bottom: 50 } },
      { name: 'crop_image', input: { id: pic, left: 60, top: 0, right: 40, bottom: 50 } },
    ];
    const use = calls[requests.length - 1];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(use
      ? { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_' + requests.length, name: use.name, input: use.input }] }
      : { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '好。' }] }) });
  });
  await page.evaluate((i) => window.HE.sel.set([i]), h1);
  expect(await page.evaluate(() => window.HE.ai.run('改標題'))).toBe(true);

  expect(typeof requests[0].messages.at(-1).content).toBe('string');
  expect(requests[0].messages.at(-1).content).not.toContain('Selected picture');
  const errors = [requests[1], requests[2]].map((r) => r.messages.at(-1).content[0]);
  expect(errors[0].is_error).toBe(true);
  expect(errors[0].content).toContain('An <img> element is needed');
  expect(errors[1].is_error).toBe(true);
  expect(errors[1].content).toContain('right must be greater than left');
  // Nothing was changed.
  expect(await page.frameLocator(canvasSelector).locator('#pic').evaluate((el) => el.naturalHeight)).toBe(400);
});
