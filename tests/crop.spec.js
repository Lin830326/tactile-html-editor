const { test, expect } = require('@playwright/test');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';

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
  return img;
}
const colourAt = (img, x, y) => img.evaluate((el, p) => {
  const c = document.createElement('canvas');
  c.width = el.naturalWidth; c.height = el.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(el, 0, 0);
  return Array.from(g.getImageData(p[0], p[1], 1, 1).data).slice(0, 3).join(',');
}, [x, y]);

test('the crop dialog keeps what is inside the frame, typed as percentages, and undo brings the image back', async ({ page }) => {
  const img = await openWithPicture(page);
  await img.click();
  await page.locator('[data-tabs="right"] [data-tab="design"]').click();
  // The button sits in the attributes section, which may be folded: it is there, and pressing it opens the dialog.
  await expect(page.locator('#insp-img-crop')).toHaveCount(1);
  await page.locator('#insp-img-crop').dispatchEvent('click');

  const dialog = page.getByRole('dialog', { name: '裁切圖片' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#crop-size')).toHaveText('裁切後 200 × 400 px（原本 200 × 400）');
  await dialog.locator('#crop-top').fill('25');
  await dialog.locator('#crop-bottom').fill('75');
  await expect(dialog.locator('#crop-size')).toHaveText('裁切後 200 × 200 px（原本 200 × 400）');
  await dialog.getByRole('button', { name: '裁切', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(() => img.evaluate((el) => el.naturalWidth + 'x' + el.naturalHeight)).toBe('200x200');
  expect(await colourAt(img, 100, 100)).toBe('220,38,38');
  expect(await colourAt(img, 5, 5)).toBe('255,255,255');
  expect(await img.getAttribute('height')).toBe('200');
  await expect(page.locator('#status-msg')).toHaveText('已裁切圖片：200 × 200 px');
  await expect(page.locator('#btn-undo')).toHaveAttribute('title', /^復原：裁切圖片/);

  await page.evaluate(() => window.HE.history.undo());
  await expect.poll(() => img.evaluate((el) => el.naturalHeight)).toBe(400);
  expect(await img.getAttribute('height')).toBe('400');
});

test('the frame is dragged by its handles and as a whole, and stays inside the image', async ({ page }) => {
  const img = await openWithPicture(page);
  const id = await page.evaluate(() => window.HE.doc.model.querySelector('#pic').getAttribute('data-he-id'));
  await page.evaluate((i) => window.HE.inspector.cropImage(i), id);
  const dialog = page.getByRole('dialog', { name: '裁切圖片' });
  // The picture in the dialog loads on its own: measure it once it has its size.
  await expect.poll(() => dialog.locator('.crop-img').evaluate((el) => (el.complete ? el.getBoundingClientRect().height : 0))).toBeGreaterThan(100);
  // The dialog may still be settling into place: a press on where a handle was a moment ago grips nothing.
  let stage = null;
  await expect.poll(async () => {
    const was = stage;
    stage = await dialog.locator('.crop-img').boundingBox();
    return !!was && was.x === stage.x && was.y === stage.y && was.height === stage.height;
  }, { intervals: [120] }).toBe(true);

  // The bottom edge goes up by half the picture, the right edge left by half.
  const drag = async (from, to) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
  };
  const centre = async (sel) => { const b = await dialog.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  let p = await centre('.crop-handle[data-h="s"]');
  await drag(p, { x: p.x, y: p.y - stage.height / 2 });
  p = await centre('.crop-handle[data-h="e"]');
  await drag(p, { x: p.x - stage.width / 2, y: p.y });
  // A drag lands within a pixel of where it was aimed.
  const near = async (sel, want) => expect(Math.abs(parseFloat(await dialog.locator(sel).inputValue()) - want)).toBeLessThan(1.5);
  await near('#crop-bottom', 50);
  await near('#crop-right', 50);

  // Dragged as a whole far past the corner, the frame stops at the edges and keeps its size.
  p = await centre('#crop-frame');
  await drag(p, { x: p.x + stage.width * 0.9, y: p.y + stage.height * 0.9 }); // past the corner, still inside the window
  await near('#crop-left', 50);
  await near('#crop-top', 50);
  await expect(dialog.locator('#crop-right')).toHaveValue('100');
  await expect(dialog.locator('#crop-bottom')).toHaveValue('100');

  await dialog.getByRole('button', { name: '裁切', exact: true }).click();
  // The lower right quarter: half white, half green.
  await expect.poll(() => img.evaluate((el) => el.naturalHeight)).toBeLessThan(210);
  const size = await img.evaluate((el) => [el.naturalWidth, el.naturalHeight]);
  expect(Math.abs(size[0] - 100)).toBeLessThan(4);
  expect(Math.abs(size[1] - 200)).toBeLessThan(7);
  expect(await colourAt(img, 50, 50)).toBe('255,255,255');
  expect(await colourAt(img, 50, 150)).toBe('21,128,61');
});

test('cancelling, or leaving the whole image in the frame, changes nothing; the menu of an image offers the dialog', async ({ page }) => {
  const img = await openWithPicture(page);
  const before = await img.getAttribute('src');
  await img.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '裁切圖片…' }).click();
  const dialog = page.getByRole('dialog', { name: '裁切圖片' });
  await dialog.locator('#crop-top').fill('40');
  await dialog.getByRole('button', { name: '取消' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await img.getAttribute('src')).toBe(before);

  await page.evaluate(() => window.HE.inspector.cropImage(window.HE.doc.model.querySelector('#pic').getAttribute('data-he-id')));
  await dialog.locator('#crop-top').fill('40');
  await dialog.locator('#crop-reset').click();
  await expect(dialog.locator('#crop-top')).toHaveValue('0');
  await dialog.getByRole('button', { name: '裁切', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await img.getAttribute('src')).toBe(before);
  // No step named after a crop was recorded.
  await expect(page.locator('#btn-undo')).not.toHaveAttribute('title', /裁切圖片/);
});

/** The dialog, open on the 200 x 400 picture, once the picture in it has its size. */
async function openDialog(page) {
  const img = await openWithPicture(page);
  await page.evaluate(() => window.HE.inspector.cropImage(window.HE.doc.model.querySelector('#pic').getAttribute('data-he-id')));
  const dialog = page.getByRole('dialog', { name: '裁切圖片' });
  await expect.poll(() => dialog.locator('.crop-img').evaluate((el) => (el.complete ? el.getBoundingClientRect().height : 0))).toBeGreaterThan(100);
  return { img, dialog };
}
/** The four sides of the frame as the fields show them, in percent. */
const sidesOf = async (dialog) => {
  const out = {};
  for (const side of ['left', 'top', 'right', 'bottom']) out[side] = parseFloat(await dialog.locator('#crop-' + side).inputValue());
  return out;
};
/** The frame on screen, in pixels: the picture is drawn at its own ratio, so a 1:1 frame is a square there. */
const frameSize = (dialog) => dialog.locator('#crop-frame').evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; });
async function dragBy(page, loc, dx, dy) {
  const b = await loc.boundingBox();
  const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
  await page.mouse.up();
}

test('a fixed ratio holds while the frame is dragged, typed and moved with the arrow keys, and the cropped image has it', async ({ page }) => {
  const { img, dialog } = await openDialog(page);
  const ratio = dialog.locator('#crop-ratio');
  await expect(ratio.locator('option')).toHaveText(['自由', '原圖比例', '1:1', '4:3', '3:2', '16:9', '3:4', '2:3', '9:16']);
  const square = async () => { const s = await frameSize(dialog); expect(Math.abs(s.w - s.h)).toBeLessThanOrEqual(1); return s; };

  // 1:1 on a 200 x 400 picture: the largest square, in the middle.
  await ratio.selectOption('1:1');
  expect(await sidesOf(dialog)).toEqual({ left: 0, top: 25, right: 100, bottom: 75 });
  await expect(dialog.locator('#crop-size')).toHaveText('裁切後 200 × 200 px（原本 200 × 400）');
  const full = await square();

  // A corner dragged inwards: the opposite corner stays, and the frame is still a square.
  await dragBy(page, dialog.locator('.crop-handle[data-h="se"]'), -full.w * 0.3, -full.w * 0.3);
  let now = await square();
  expect(now.w).toBeLessThan(full.w * 0.8);
  expect(now.w).toBeGreaterThan(full.w * 0.6);
  let s = await sidesOf(dialog);
  expect([s.left, s.top]).toEqual([0, 25]);
  // Dragged far past the image, it stops at the edges and keeps the ratio.
  await dragBy(page, dialog.locator('.crop-handle[data-h="se"]'), full.w, full.w);
  expect((await square()).w).toBeGreaterThan(full.w - 2);
  // An edge: the frame grows and shrinks around its middle line.
  await dragBy(page, dialog.locator('.crop-handle[data-h="w"]'), full.w * 0.5, 0);
  now = await square();
  expect(Math.abs(now.w - full.w * 0.5)).toBeLessThan(3);
  s = await sidesOf(dialog);
  expect(s.right).toBe(100);
  expect(Math.abs((s.top + s.bottom) / 2 - 50)).toBeLessThan(0.2);
  // A typed side keeps it too.
  await dialog.locator('#crop-right').fill('80');
  await square();
  expect((await sidesOf(dialog)).right).toBe(80);
  await dialog.locator('#crop-right').blur();

  // The frame and its handles are in the tab order and say what they are.
  const frameEl = dialog.locator('#crop-frame');
  await expect(frameEl).toHaveAttribute('tabindex', '0');
  await expect(frameEl).toHaveAttribute('aria-label', '裁切範圍。按方向鍵移動');
  expect(await dialog.locator('.crop-handle').evaluateAll((els) => els.map((e) => e.tabIndex + ':' + e.getAttribute('aria-label')))).toEqual(
    ['左上角', '上邊', '右上角', '右邊', '右下角', '下邊', '左下角', '左邊'].map((n) => '0:' + n + '。按方向鍵調整'));
  await frameEl.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.getAttribute('data-h'))).toBe('nw');

  // The arrow keys move the frame: 1% a press, 10% with Shift, never past the image, and the size stays.
  await frameEl.focus();
  const before = await sidesOf(dialog);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  s = await sidesOf(dialog);
  expect(s.top - before.top).toBeCloseTo(1, 5);
  expect(before.left - s.left).toBeCloseTo(1, 5);
  expect(s.right - s.left).toBeCloseTo(before.right - before.left, 5);
  await page.keyboard.press('Shift+ArrowRight');
  expect((await sidesOf(dialog)).left - s.left).toBeCloseTo(10, 5);
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowDown');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowLeft');
  s = await sidesOf(dialog);
  expect([s.left, s.bottom]).toEqual([0, 100]);
  expect(s.right - s.left).toBeCloseTo(before.right - before.left, 5);
  const moved = await square();
  // On a handle they move that corner, with the ratio.
  await dialog.locator('.crop-handle[data-h="ne"]').focus();
  await page.keyboard.press('Shift+ArrowLeft');
  const smaller = await square();
  expect(smaller.w).toBeLessThan(moved.w - 5);
  s = await sidesOf(dialog);
  expect([s.left, s.bottom]).toEqual([0, 100]);

  // Cropped: the image is a square, cut from the lower left corner (white above green).
  const want = Math.round(200 * (s.right - s.left) / 100);
  await dialog.getByRole('button', { name: '裁切', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => img.evaluate((el) => el.naturalHeight)).toBeLessThan(400);
  const size = await img.evaluate((el) => [el.naturalWidth, el.naturalHeight]);
  expect(Math.abs(size[0] - size[1])).toBeLessThanOrEqual(1);
  expect(Math.abs(size[0] - want)).toBeLessThanOrEqual(1);
  expect(await colourAt(img, 5, size[1] - 5)).toBe('21,128,61');
});

test('the other ratios fit the frame into the image; a free frame takes the arrow keys one edge at a time; 重設 frees it again', async ({ page }) => {
  const { img, dialog } = await openDialog(page);
  const ratio = dialog.locator('#crop-ratio');
  // The frame as pixels of the picture: width / height.
  const pixelRatio = async () => { const s = await sidesOf(dialog); return (200 * (s.right - s.left)) / (400 * (s.bottom - s.top)); };

  // A free frame: an edge handle moves its own edge only, and ignores the arrows across it.
  await dialog.locator('.crop-handle[data-h="e"]').focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Shift+ArrowDown');
  expect(await sidesOf(dialog)).toEqual({ left: 0, top: 0, right: 89, bottom: 100 });
  await dialog.locator('.crop-handle[data-h="nw"]').focus();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('ArrowRight');
  expect(await sidesOf(dialog)).toEqual({ left: 1, top: 10, right: 89, bottom: 100 });

  // Each ratio: as large as the image holds, inside it, around the middle of the frame as it was.
  for (const [value, want] of [['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['3:4', 3 / 4], ['2:3', 2 / 3], ['9:16', 9 / 16], ['1:1', 1], ['orig', 0.5]]) {
    await ratio.selectOption(value);
    expect(await pixelRatio(), value).toBeCloseTo(want, 1);
    const s = await sidesOf(dialog);
    expect(Math.min(s.left, s.top), value).toBeGreaterThanOrEqual(0);
    expect(Math.max(s.right, s.bottom), value).toBeLessThanOrEqual(100);
    // It touches two opposite sides of the image: nothing larger fits.
    expect((s.left === 0 && s.right === 100) || (s.top === 0 && s.bottom === 100), value).toBe(true);
  }
  // 重設: the whole image, and no ratio.
  await ratio.selectOption('16:9');
  await dialog.locator('#crop-reset').click();
  await expect(ratio).toHaveValue('free');
  expect(await sidesOf(dialog)).toEqual({ left: 0, top: 0, right: 100, bottom: 100 });

  // 16:9 of a 200 x 400 picture is 200 x 112.5 px: the cropped image has that ratio to the pixel.
  await ratio.selectOption('16:9');
  await dialog.locator('#crop-frame').focus();
  await page.keyboard.press('Shift+ArrowUp');
  await dialog.getByRole('button', { name: '裁切', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => img.evaluate((el) => el.naturalHeight)).toBeLessThan(400);
  const size = await img.evaluate((el) => [el.naturalWidth, el.naturalHeight]);
  expect(size[0]).toBe(200);
  expect(Math.abs(size[1] - 200 * 9 / 16)).toBeLessThanOrEqual(1);
});
