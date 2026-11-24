const { test, expect } = require('@playwright/test');

const frame = 'iframe.cv-frame:not(.is-pending)';

/** The deck's slides in document order: the second class of each (slide-title, slide-agenda…), or '' for a new one. */
const order = (page) => page.evaluate(() => [...window.HE.doc.body.querySelectorAll('.slide')].map((s) => s.classList[1] || ''));
const rows = (page) => page.locator('#pages-pane .pg-row');
const titles = (page) => page.locator('#pages-pane .pg-title').allTextContents();
const START = ['slide-title', 'slide-agenda', 'slide-dark', 'slide-compare', 'slide-quote', 'slide-end'];

async function openDeck(page) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/dist/tactile.html');
  await page.locator('#btn-new').click();
  await page.getByRole('menuitem', { name: '簡報：產品發表' }).click();
  await expect(page.frameLocator(frame).locator('.slide-title h1')).toHaveText('Kite 2');
  await page.locator('[data-tabs="left"] [data-tab="pages"]').click();
  await expect(rows(page)).toHaveCount(6);
}

test('the pane lists the slides of a deck and says so when a document is not one', async ({ page }) => {
  await openDeck(page);
  expect(await order(page)).toEqual(START);
  const shown = await titles(page);
  expect(shown[0]).toBe('Kite 2');
  expect(new Set(shown).size).toBe(6);
  await expect(page.locator('#pages-pane .pg-count')).toHaveText('6 張投影片');

  // Clicking a row selects that slide on the page.
  await rows(page).nth(2).click();
  await expect(rows(page).nth(2)).toHaveAttribute('aria-selected', 'true');
  expect(await page.evaluate(() => window.HE.doc.byId(window.HE.sel.primary).classList[1])).toBe('slide-dark');

  // Selecting something inside another slide marks that slide's row.
  await page.evaluate(() => window.HE.sel.set([window.HE.doc.idOf(window.HE.doc.body.querySelector('.slide-quote blockquote'))]));
  await expect(rows(page).nth(4)).toHaveAttribute('aria-selected', 'true');
  await expect(rows(page).nth(2)).toHaveAttribute('aria-selected', 'false');

  await page.evaluate(() => window.HE.fileio.openText('<!doctype html><html><head><title>t</title></head><body><h1>報告</h1><p>一段文字</p></body></html>', 'report.html'));
  await expect(page.locator('#pages-pane .pg-empty')).toContainText('這份文件不是簡報');
  await expect(rows(page)).toHaveCount(0);
});

test('adding, copying, moving and removing a slide are one undo step each', async ({ page }) => {
  await openDeck(page);

  // A new slide goes after the current one and takes the class every slide shares.
  await rows(page).nth(1).click();
  await page.locator('#pages-pane .pg-add').click();
  await expect(rows(page)).toHaveCount(7);
  expect(await order(page)).toEqual(['slide-title', 'slide-agenda', '', 'slide-dark', 'slide-compare', 'slide-quote', 'slide-end']);
  expect(await page.evaluate(() => window.HE.doc.body.querySelectorAll('.slide')[2].outerHTML.replace(/ data-he-id="[^"]*"/g, '')))
    .toBe('<section class="slide"><h2>新投影片</h2><p>在這裡輸入內容</p></section>');
  await expect(rows(page).nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(page.frameLocator(frame).locator('.slide').nth(2).locator('h2')).toHaveText('新投影片');
  await page.evaluate(() => window.HE.history.undo());
  await expect(rows(page)).toHaveCount(6);
  expect(await order(page)).toEqual(START);

  await rows(page).nth(4).hover();
  await rows(page).nth(4).getByRole('button', { name: '複製' }).click();
  await expect(rows(page)).toHaveCount(7);
  expect(await order(page)).toEqual(['slide-title', 'slide-agenda', 'slide-dark', 'slide-compare', 'slide-quote', 'slide-quote', 'slide-end']);
  await page.evaluate(() => window.HE.history.undo());
  await expect(rows(page)).toHaveCount(6);

  await rows(page).nth(5).hover();
  await rows(page).nth(5).getByRole('button', { name: '上移' }).click();
  await expect.poll(() => order(page)).toEqual(['slide-title', 'slide-agenda', 'slide-dark', 'slide-compare', 'slide-end', 'slide-quote']);
  // The page in the frame follows.
  expect(await page.frameLocator(frame).locator('.slide').evaluateAll((els) => els.map((e) => e.classList[1]))).toEqual(
    ['slide-title', 'slide-agenda', 'slide-dark', 'slide-compare', 'slide-end', 'slide-quote']);
  // The row keeps the focus, so the keyboard can go on: Alt+Down puts it back.
  await expect(rows(page).nth(4)).toBeFocused();
  await page.keyboard.press('Alt+ArrowDown');
  await expect.poll(() => order(page)).toEqual(START);

  await rows(page).nth(0).hover();
  await expect(rows(page).nth(0).getByRole('button', { name: '上移' })).toBeDisabled();
  await rows(page).nth(0).getByRole('button', { name: '刪除' }).click();
  await expect(rows(page)).toHaveCount(5);
  expect(await order(page)).toEqual(START.slice(1));
  await page.evaluate(() => window.HE.history.undo());
  await expect(rows(page)).toHaveCount(6);
  expect(await order(page)).toEqual(START);
});

test('dragging a row puts the slide where it is dropped', async ({ page }) => {
  await openDeck(page);
  const box = await rows(page).nth(3).boundingBox();
  await rows(page).nth(0).dragTo(rows(page).nth(3), { targetPosition: { x: box.width / 2, y: box.height - 3 } });
  await expect.poll(() => order(page)).toEqual(['slide-agenda', 'slide-dark', 'slide-compare', 'slide-title', 'slide-quote', 'slide-end']);
  await expect(rows(page)).toHaveCount(6);
  // Nothing was opened or pasted by the drop.
  await expect(page.frameLocator(frame).locator('.slide')).toHaveCount(6);
  await page.evaluate(() => window.HE.history.undo());
  expect(await order(page)).toEqual(START);
});

test('the list stays when the layout stops looking like a deck', async ({ page }) => {
  await openDeck(page);
  // On a phone the slides grow taller than 16:9.
  await page.locator('#cv-device-phone').click();
  await expect.poll(() => page.frameLocator(frame).locator('html').evaluate(() => innerWidth)).toBe(390);
  await expect(rows(page)).toHaveCount(6);
  await page.locator('#cv-device-desktop').click();

  // Down to one slide: it is still listed, a new one can be added, and the last one cannot be removed.
  for (let i = 0; i < 5; i++) {
    await rows(page).nth(0).hover();
    await rows(page).nth(0).getByRole('button', { name: '刪除' }).click();
    await expect(rows(page)).toHaveCount(5 - i);
  }
  expect(await order(page)).toEqual(['slide-end']);
  await rows(page).nth(0).hover();
  await expect(rows(page).nth(0).getByRole('button', { name: '刪除' })).toBeDisabled();
  expect(await page.evaluate(() => window.HE.pages.remove(window.HE.pages.state().slides[0].id))).toBe(false);
  await page.locator('#pages-pane .pg-add').click();
  await expect(rows(page)).toHaveCount(2);
});
