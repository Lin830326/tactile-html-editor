const { test, expect } = require('@playwright/test');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>拖曳方式測試</title>
<style>body{margin:0;font:16px/1.5 sans-serif}section{height:120px;margin:20px;background:#dbeafe}</style></head><body>
<section id="first">第一區</section><section id="second">第二區</section><section id="third">第三區</section>
<p id="line">一段文字，裡面有<a id="link" href="#x">一個連結</a>。</p>
</body></html>`;

async function open(page) {
  await page.goto('/dist/tactile.html');
  await expect(page.locator(canvasSelector)).toBeVisible();
  await page.evaluate((doc) => window.HE.ops.replaceDocument(doc), html);
  await expect(page.frameLocator(canvasSelector).locator('#third')).toBeVisible();
}

/**
 * Press on the element, travel by (dx, dy) in steps, release.
 *
 * The events are made in the page. Playwright's own mouse cannot drag here: with a button down, each move first
 * runs a script in every frame to watch for a native drag, and the edit frame is sandboxed without scripts, so that
 * move never returns. The press goes to the edit frame and the travel to the editor window, which is where the
 * browser sends them once the gesture's shield covers the frame.
 */
async function drag(page, selector, dx, dy, alt) {
  await page.evaluate(({ frameSel, selector, dx, dy, alt }) => {
    const frame = document.querySelector(frameSel);
    const el = frame.contentDocument.querySelector(selector);
    const r = el.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    const x = r.left + Math.min(r.width / 2, 40), y = r.top + r.height / 2;
    const ev = (type, cx, cy, more) => new MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: cx, clientY: cy, altKey: !!alt, button: 0 }, more));
    el.dispatchEvent(ev('mousedown', x, y, { buttons: 1 }));
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      window.dispatchEvent(ev('mousemove', fr.left + x + (dx * i) / steps, fr.top + y + (dy * i) / steps, { buttons: 1 }));
    }
    window.dispatchEvent(ev('mouseup', fr.left + x + dx, fr.top + y + dy, { buttons: 0 }));
  }, { frameSel: canvasSelector, selector, dx, dy, alt });
}

const order = (page) => page.evaluate(() => Array.from(window.HE.doc.body.querySelectorAll('section')).map((s) => s.id));
const translateOf = (page, id) => page.evaluate((i) => window.HE.doc.body.querySelector('#' + i).style.translate, id);

test('a plain drag reorders by default and says how to move freely; Alt shifts the element instead', async ({ page }) => {
  await open(page);
  await expect(page.locator('#cv-move-flow')).toHaveAttribute('aria-pressed', 'true');

  await drag(page, '#first', 0, 230);
  expect(await order(page)).not.toEqual(['first', 'second', 'third']);
  expect(await translateOf(page, 'first')).toBe('');
  await expect(page.locator('#status-msg')).toContainText('自由移動');

  await drag(page, '#second', 60, 30, true);
  expect(await translateOf(page, 'second')).toBe('60px 30px');
});

test('in free mode a plain drag shifts the element, undoes in one step, and Alt reorders', async ({ page }) => {
  await open(page);
  await page.locator('#cv-move-free').click();
  await expect(page.locator('#cv-move-free')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#status-msg')).toContainText('不會隨螢幕寬度調整');

  await drag(page, '#first', 80, 40);
  expect(await translateOf(page, 'first')).toBe('80px 40px');
  expect(await order(page)).toEqual(['first', 'second', 'third']);

  await page.keyboard.press('Control+z');
  expect(await translateOf(page, 'first')).toBe('');

  await drag(page, '#first', 0, 230, true);
  expect(await order(page)).not.toEqual(['first', 'second', 'third']);
  expect(await translateOf(page, 'first')).toBe('');
});

test('free mode survives a reload, and text inside a sentence still reorders', async ({ page }) => {
  await open(page);
  await page.locator('#cv-move-free').click();
  await page.reload();
  await expect(page.locator(canvasSelector)).toBeVisible();
  await expect(page.locator('#cv-move-free')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.HE.canvas.moveMode)).toBe('free');

  await page.evaluate((doc) => window.HE.ops.replaceDocument(doc), html);
  await expect(page.frameLocator(canvasSelector).locator('#link')).toBeVisible();
  // A press in the page selects the paragraph around a link, so the link is selected here and dragged by its chip.
  await page.evaluate(() => window.HE.sel.set([window.HE.doc.idOf(window.HE.doc.body.querySelector('#link'))]));
  await expect(page.locator('.cv-chip')).toBeVisible();
  await page.evaluate(() => {
    const chip = document.querySelector('.cv-chip');
    const r = chip.getBoundingClientRect();
    const x = r.left + 4, y = r.top + 4;
    const ev = (type, cx, cy, buttons) => new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons });
    chip.dispatchEvent(ev('mousedown', x, y, 1));
    for (let i = 1; i <= 6; i++) window.dispatchEvent(ev('mousemove', x + i * 6, y, 1));
    window.dispatchEvent(ev('mouseup', x + 36, y, 0));
  });
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('#link').style.translate)).toBe('');
  await expect(page.locator('#status-msg')).toContainText('不能自由移動');
});

test('free mode shows an open hand over the page and a closed one while an element is held', async ({ page }) => {
  await open(page);
  const cursor = () => page.evaluate((sel) => {
    const d = document.querySelector(sel).contentDocument;
    return d.defaultView.getComputedStyle(d.querySelector('#first')).cursor;
  }, canvasSelector);
  expect(await cursor()).not.toBe('grab');

  await page.locator('#cv-move-free').click();
  expect(await cursor()).toBe('grab');

  const press = (type, buttons) => page.evaluate(({ sel, type, buttons }) => {
    const frame = document.querySelector(sel);
    const el = frame.contentDocument.querySelector('#first');
    const r = el.getBoundingClientRect();
    const fr = frame.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, button: 0, buttons };
    if (type === 'mousedown') el.dispatchEvent(new MouseEvent(type, Object.assign(init, { clientX: r.left + 20, clientY: r.top + 20 })));
    else window.dispatchEvent(new MouseEvent(type, Object.assign(init, { clientX: fr.left + r.left + 20, clientY: fr.top + r.top + 20 })));
  }, { sel: canvasSelector, type, buttons });
  await press('mousedown', 1);
  expect(await cursor()).toBe('grabbing');
  await press('mouseup', 0);
  expect(await cursor()).toBe('grab');

  await page.locator('#cv-move-flow').click();
  expect(await cursor()).not.toBe('grab');
});
