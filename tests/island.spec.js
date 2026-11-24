const { test, expect } = require('@playwright/test');

const frame = 'iframe.cv-frame:not(.is-pending)';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
// Taller than any window, so that a fixed box and a box at the end of the page are in different places.
const TALL = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>t</title></head><body><h1>報告</h1>' +
  Array.from({ length: 60 }, (_, i) => '<p>第 ' + (i + 1) + ' 段文字</p>').join('') + '</body></html>';

async function open(page, html = TALL) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/dist/tactile.html');
  await expect(page.locator(frame)).toBeVisible();
  expect(await page.evaluate((src) => window.HE.fileio.openText(src, 'site.html'), html)).toBe(true);
  await expect(page.frameLocator(frame).locator('h1')).toBeVisible();
}

/** A document with the 浮動島 block in it: 小幫手 (a panel), 問題回報 (a link) and 回到頂端. The island is selected. */
async function openWithIsland(page, html) {
  await open(page, html);
  await page.locator('[data-tabs="left"] [data-tab="insert"]').click();
  await page.locator('#ins-tile-island').click();
  await expect(page.frameLocator(frame).locator('[data-tfi] .tfi-btn').first()).toBeVisible();
}

const serialize = (page) => page.evaluate(() => window.HE.doc.serialize());
const undo = (page) => page.evaluate(() => window.HE.history.undo());
const redo = (page) => page.evaluate(() => window.HE.history.redo());
const depth = (page) => page.evaluate(() => window.HE.history.undoStack.length);
const heId = (page, sel) => page.evaluate((s) => window.HE.doc.body.querySelector(s).getAttribute('data-he-id'), sel);
const select = (page, sel) => page.evaluate((s) => window.HE.sel.set([window.HE.doc.body.querySelector(s).getAttribute('data-he-id')]), sel);
/** The buttons of the island as kind:text:target, from the document. */
const buttons = (page) => page.evaluate(() => window.HE.island.get().buttons.map((b) => b.kind + ':' + b.label + ':' + (b.kind === 'panel' ? b.panel : b.href)));
/** Where a fixed box sits in its window: its distance from each edge, rounded. */
const edges = (loc) => loc.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const w = el.ownerDocument.documentElement.clientWidth, h = el.ownerDocument.documentElement.clientHeight;
  return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(w - r.right), bottom: Math.round(h - r.bottom), position: getComputedStyle(el).position };
});

test('the 浮動島 block puts the island and its CSS into the document, at the end of <body>; one undo takes both away', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => window.HE.island.get())).toBeNull();
  await page.evaluate(() => window.HE.doc.setTrusted(true));
  const before = await serialize(page);
  // Whatever is selected, the island goes to the end of <body>.
  await select(page, 'h1');
  await page.locator('[data-tabs="left"] [data-tab="insert"]').click();
  await page.locator('#ins-tile-island').click();
  const canvas = page.frameLocator(frame);
  await expect(canvas.locator('[data-tfi] .tfi-btn')).toHaveCount(3);

  expect(await page.evaluate(() => window.HE.doc.body.lastElementChild.hasAttribute('data-tfi'))).toBe(true);
  expect(await buttons(page)).toEqual(['panel:小幫手:tfi-panel-1', 'link:問題回報:mailto:you@example.com', 'top:回到頂端:#']);
  const html = await serialize(page);
  expect(html).toContain('<div class="tfi" data-tfi="" data-tfi-pos="br" data-tfi-space="" role="group" aria-label="快速功能"><button class="tfi-btn" type="button" popovertarget="tfi-panel-1">小幫手</button>' +
    '<a class="tfi-btn" href="mailto:you@example.com">問題回報</a><a class="tfi-btn" href="#" data-tfi-top="">回到頂端</a><div class="tfi-panel" id="tfi-panel-1" popover="" data-tfi-panel=""><h3>常見問題</h3>');
  expect(html.split('data-he-style="island"').length - 1).toBe(1);
  const css = await page.evaluate(() => window.HE.ops.getHeadStyle('island'));
  expect(css.startsWith('/* Tactile 浮動島')).toBe(true);
  expect(css).toContain('[data-tfi] { position: fixed;');
  expect(css).toContain(':where(.tfi-btn)');
  expect(css).toContain('@media print { [data-tfi] { display: none; }');
  expect(css).toContain('@supports not selector(:popover-open)');
  // Nothing of it is script: the document's trust stands, and the export holds no script.
  expect(await page.evaluate(() => [window.HE.doc.trusted, window.HE.doc.hasScripts(), window.HE.util.hasScript(window.HE.doc.body)])).toEqual([true, false, false]);
  expect(html).not.toMatch(/<script|\son[a-z]+=|javascript:/i);
  // The island is selected, and the right panel shows its settings.
  expect(await page.evaluate(() => window.HE.sel.primary === window.HE.island.get().id)).toBe(true);
  await expect(page.locator('#insp-sec-island')).toBeVisible();
  await expect(page.locator('#insp-tfi-about')).toContainText('不是會回答問題的 AI');
  await expect(page.locator('#insp-tfi-about')).toContainText('不能自己收件');

  // The edit frame is as high as the canvas, not as the document: the island is in sight, in its corner.
  const sizes = await canvas.locator('html').evaluate((el) => ({ view: el.clientHeight, page: el.scrollHeight }));
  expect(sizes.page).toBeGreaterThan(sizes.view * 1.5);
  expect(await edges(canvas.locator('[data-tfi]'))).toMatchObject({ position: 'fixed', right: 16, bottom: 16 });
  await canvas.locator('html').evaluate((el) => el.ownerDocument.defaultView.scrollTo(0, 400));
  expect(await edges(canvas.locator('[data-tfi]'))).toMatchObject({ right: 16, bottom: 16 });

  // sync adds nothing to a document that is in step.
  expect(await page.evaluate(() => { const a = window.HE.doc.serialize(); const changed = window.HE.island.sync(); return [changed, window.HE.doc.serialize() === a]; })).toEqual([false, true]);
  // One undo step for the block and its CSS.
  expect(await depth(page)).toBe(1);
  await undo(page);
  expect(await serialize(page)).toBe(before);
  await expect(canvas.locator('[data-tfi]')).toHaveCount(0);
  await redo(page);
  expect(await serialize(page)).toBe(html);

  // A document holds one island: the block now selects it and says so.
  await select(page, 'h1');
  await page.locator('#ins-tile-island').click();
  await expect(page.locator('#layer-root .toast').last()).toContainText('這份文件已經有浮動島');
  expect(await page.evaluate(() => [window.HE.doc.body.querySelectorAll('[data-tfi]').length, window.HE.sel.primary === window.HE.island.get().id])).toEqual([1, true]);
  expect(await depth(page)).toBe(1);

  // Removing the island removes its CSS in the same step.
  await page.evaluate(() => window.HE.ops.remove([window.HE.island.get().id]));
  expect(await serialize(page)).toBe(before);
});

test('an exported file works on its own with scripts off: fixed in its corner, and the panel opens and closes', async ({ page, browser }) => {
  await openWithIsland(page);
  const first = await serialize(page);
  expect(first).not.toContain('data-he-id');
  expect(first.replace(/ data-he-style="island"/g, '')).not.toContain('data-he-');
  expect(first).not.toContain('__he_island_css');
  expect(first).not.toContain('<script');
  await page.evaluate(() => window.HE.island.setPosition('tl'));
  const second = await serialize(page);

  // Opening the export again changes nothing, and the island is found again.
  await page.evaluate((src) => { window.opened = window.HE.fileio.openText(src, 'site.html'); }, first);
  await page.locator('#layer-root .modal').getByRole('button', { name: '開啟新的文件' }).click();
  expect(await page.evaluate(() => window.opened)).toBe(true);
  expect(await serialize(page)).toBe(first);
  expect(await page.evaluate(() => { const a = window.HE.doc.serialize(); window.HE.island.sync(); return [window.HE.doc.serialize() === a, window.HE.island.get().buttons.length]; })).toEqual([true, 3]);

  // On its own, with no editor around it and JavaScript switched off.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 900, height: 600 } });
  const alone = await context.newPage();
  await alone.route('http://island.test/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: route.request().url().endsWith('/tl') ? second : first }));
  await alone.goto('http://island.test/br');
  const island = alone.locator('[data-tfi]');
  const panel = alone.locator('#tfi-panel-1');
  const isOpen = () => panel.evaluate((el) => el.matches(':popover-open'));
  expect(await edges(island)).toMatchObject({ position: 'fixed', right: 16, bottom: 16 });
  await alone.mouse.wheel(0, 700);
  await expect.poll(() => alone.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  expect(await edges(island)).toMatchObject({ right: 16, bottom: 16 });
  // The buttons take the default colours, as pills.
  expect(await alone.locator('.tfi-btn').first().evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, parseFloat(s.borderTopLeftRadius) > 20]; })).toEqual(['rgb(31, 35, 40)', 'rgb(255, 255, 255)', true]);

  await expect(panel).toBeHidden();
  await alone.getByRole('button', { name: '小幫手' }).click();
  await expect(panel).toBeVisible();
  expect(await isOpen()).toBe(true);
  // The panel sits beside the island, inside the window: 12px above its one row of buttons (16 + 44 + 12).
  const box = await edges(panel);
  expect(box).toMatchObject({ position: 'fixed', right: 16, bottom: 72 });
  expect(box.top).toBeGreaterThanOrEqual(0);
  await expect(panel.locator('h3')).toHaveText('常見問題');
  // The same button closes it; Esc closes it too.
  await alone.getByRole('button', { name: '小幫手' }).click();
  await expect(panel).toBeHidden();
  expect(await isOpen()).toBe(false);
  await alone.getByRole('button', { name: '小幫手' }).click();
  await expect(panel).toBeVisible();
  await alone.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  // Back to top is a plain link.
  await alone.getByRole('link', { name: '回到頂端' }).click();
  await expect.poll(() => alone.evaluate(() => window.scrollY)).toBe(0);
  // Print leaves the island out.
  await alone.emulateMedia({ media: 'print' });
  await expect(island).toBeHidden();
  await alone.emulateMedia({ media: 'screen' });

  // Another corner.
  await alone.goto('http://island.test/tl');
  expect(await edges(island)).toMatchObject({ position: 'fixed', left: 16, top: 16 });
  await alone.getByRole('button', { name: '小幫手' }).click();
  expect(await edges(panel)).toMatchObject({ left: 16, top: 72 });
  await context.close();
});

/** A page of its own for an exported file, with JavaScript switched off. */
async function standalone(browser, html, viewport) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport });
  const alone = await context.newPage();
  await alone.route('http://island.test/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await alone.goto('http://island.test/');
  return { context, alone };
}
const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;

test('an open panel never covers the buttons, also when they take two rows', async ({ page, browser }) => {
  await openWithIsland(page);
  expect(await page.evaluate(() => CSS.supports('anchor-name: --a'))).toBe(true);
  expect(await page.evaluate(() => !!window.HE.island.addButton('link', { label: '預約參觀與導覽', href: 'https://tactile.test/visit' }))).toBe(true);
  expect(await page.evaluate(() => !!window.HE.island.addButton('link', { label: '訂閱電子報', href: 'https://tactile.test/news' }))).toBe(true);
  for (const pos of ['br', 'bl', 'tr', 'tl']) {
    await page.evaluate((p) => window.HE.island.setPosition(p), pos);
    const { context, alone } = await standalone(browser, await serialize(page), { width: 360, height: 640 });
    const island = await rect(alone.locator('[data-tfi]'));
    // Five buttons do not fit one row of a phone: the island is higher than one button.
    expect(island.bottom - island.top, pos).toBeGreaterThan(90);
    await alone.getByRole('button', { name: '小幫手' }).click();
    const panel = alone.locator('#tfi-panel-1');
    await expect(panel).toBeVisible();
    const box = await rect(panel);
    for (const btn of await alone.locator('[data-tfi] > .tfi-btn').all()) expect(apart(box, await rect(btn)), pos + ': the panel covers a button').toBe(true);
    // 12px from the island, on the side of the window's middle, and inside the window.
    if (pos[0] === 'b') expect(Math.round(island.top - box.bottom)).toBe(12); else expect(Math.round(box.top - island.bottom)).toBe(12);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(360);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(640);
    await context.close();
  }
  // The edit frame shows the panel being edited in the same place.
  await page.evaluate(() => { window.HE.island.setPosition('br'); window.HE.canvas.setDevice('phone'); });
  await select(page, '#tfi-panel-1');
  const canvas = page.frameLocator(frame);
  await expect(canvas.locator('#tfi-panel-1')).toBeVisible();
  await expect.poll(async () => {
    const box = await rect(canvas.locator('#tfi-panel-1'));
    const all = await Promise.all((await canvas.locator('[data-tfi] > .tfi-btn').all()).map(rect));
    return all.length === 5 && all.every((b) => apart(box, b));
  }).toBe(true);
});

test('data-tfi-space leaves room at the end of the page for an island at the bottom; the checkbox is one undo step', async ({ page, browser }) => {
  await openWithIsland(page);
  const check = page.locator('#insp-tfi-space');
  await expect(check).toBeChecked();
  expect(await page.evaluate(() => window.HE.island.get().space)).toBe(true);
  /** At the very end of the exported page: how far the last paragraph's bottom edge is above the island's top edge. */
  const clearance = async (html, media) => {
    const { context, alone } = await standalone(browser, html, { width: 900, height: 600 });
    if (media) await alone.emulateMedia({ media });
    // Not the wheel: Firefox moves a few hundred px for one turn of it, however far it is asked to go.
    await alone.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => alone.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1)).toBe(true);
    const out = await alone.evaluate(() => {
      const last = [...document.querySelectorAll('body > p')].pop().getBoundingClientRect();
      const isl = document.querySelector('[data-tfi]').getBoundingClientRect();
      return { gap: Math.round(isl.top - last.bottom), after: getComputedStyle(document.body, '::after').height, shown: getComputedStyle(document.body, '::after').display };
    });
    await context.close();
    return out;
  };
  let got = await clearance(await serialize(page));
  expect(got.after).toBe('88px');
  expect(got.gap).toBeGreaterThanOrEqual(0);
  // Paper has no island, so it needs no room for one.
  expect((await clearance(await serialize(page), 'print')).shown).toBe('none');

  // Unchecked: one undo step, the attribute goes, and the island covers the end of the page again.
  const steps = await depth(page);
  await check.uncheck();
  expect(await depth(page)).toBe(steps + 1);
  expect(await page.evaluate(() => [window.HE.island.get().space, window.HE.doc.body.querySelector('[data-tfi]').hasAttribute('data-tfi-space')])).toEqual([false, false]);
  await expect(page.locator('#btn-undo')).toHaveAttribute('title', /^復原：修改浮動島的留白/);
  got = await clearance(await serialize(page));
  expect(got.after).toBe('auto');
  expect(got.gap).toBeLessThan(0);
  await undo(page);
  expect(await page.evaluate(() => window.HE.island.get().space)).toBe(true);
  await expect(check).toBeChecked();
  expect(await depth(page)).toBe(steps);

  // At the top the island covers nothing at the end of the page: no room is left, and the section says so.
  await expect(page.locator('#insp-tfi-space-note')).toBeHidden();
  await page.evaluate(() => window.HE.island.setPosition('tr'));
  await expect(page.locator('#insp-tfi-space-note')).toBeVisible();
  expect((await clearance(await serialize(page))).after).toBe('auto');
});

test('edit mode keeps a panel open while its button or something inside it is selected, with a style the document does not hold', async ({ page }) => {
  await openWithIsland(page);
  const canvas = page.frameLocator(frame);
  const panel = canvas.locator('#tfi-panel-1');
  // The island itself is selected: the panel is closed.
  await expect(panel).toBeHidden();
  await expect(canvas.locator('#__he_island_css')).toHaveCount(0);

  await select(page, '[data-tfi] button.tfi-btn');
  await expect(panel).toBeVisible();
  await expect(canvas.locator('#__he_island_css')).toHaveCount(1);
  expect(await edges(panel)).toMatchObject({ position: 'fixed', right: 16, bottom: 72 });
  await select(page, '#tfi-panel-1 h3');
  await expect(panel).toBeVisible();
  await select(page, '#tfi-panel-1');
  await expect(panel).toBeVisible();
  // A click on the canvas selects what is inside the open panel.
  await canvas.locator('#tfi-panel-1 p').first().click();
  expect(await page.evaluate(() => !!window.HE.doc.byId(window.HE.sel.primary).closest('[data-tfi-panel]'))).toBe(true);
  await expect(panel).toBeVisible();
  // Neither the model nor an export holds the editor's style.
  expect(await serialize(page)).not.toContain('__he_island_css');
  expect(await page.evaluate(() => window.HE.doc.model.documentElement.outerHTML)).not.toMatch(/__he_island_css|data-he-editor/);

  // Another button of the island, an element of the page, or nothing: closed.
  await select(page, '[data-tfi] a.tfi-btn');
  await expect(panel).toBeHidden();
  await select(page, '#tfi-panel-1 h3');
  await expect(panel).toBeVisible();
  await select(page, 'h1');
  await expect(panel).toBeHidden();
  await expect(canvas.locator('#__he_island_css')).toHaveCount(0);

  // showPanel opens one without a selection; the next selection decides again.
  await page.evaluate(() => window.HE.sel.clear());
  expect(await page.evaluate(() => window.HE.island.showPanel(window.HE.island.get().buttons[0].id))).toBe(true);
  await expect(panel).toBeVisible();
  await page.evaluate(() => window.HE.island.showPanel(null));
  await expect(panel).toBeHidden();
  await page.evaluate(() => window.HE.island.showPanel(window.HE.island.get().buttons[0].panelId));
  await expect(panel).toBeVisible();
  await select(page, 'h1');
  await expect(panel).toBeHidden();

  // Preview: no editor style; the button opens and closes the panel by itself.
  await select(page, '#tfi-panel-1 h3');
  await expect(panel).toBeVisible();
  await page.evaluate(() => window.HE.setMode('preview'));
  await expect(canvas.locator('#__he_island_css')).toHaveCount(0);
  await expect(panel).toBeHidden();
  await canvas.getByRole('button', { name: '小幫手' }).click();
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  // Back in edit mode with other things selected, the panel the preview opened is closed again.
  await page.evaluate(() => window.HE.sel.clear());
  await page.evaluate(() => window.HE.setMode('edit'));
  await expect(panel).toBeHidden();
  expect(await panel.evaluate((el) => el.matches(':popover-open'))).toBe(false);
  expect(await depth(page)).toBe(1);
});

test('the 浮動島 section changes the corner, the colours and the buttons, one undo step each, and refuses script addresses', async ({ page }) => {
  await openWithIsland(page);
  const canvas = page.frameLocator(frame);
  const island = canvas.locator('[data-tfi]');
  const attr = (sel, name) => page.evaluate(([s, n]) => window.HE.doc.body.querySelector(s).getAttribute(n), [sel, name]);
  /** Runs one change, checks it, and checks that one undo takes all of it back. Leaves the change in place. */
  const step = async (change, check) => {
    const before = await serialize(page);
    const was = await depth(page);
    await change();
    await check();
    expect(await depth(page)).toBe(was + 1);
    await undo(page);
    expect(await serialize(page)).toBe(before);
    await redo(page);
    await check();
  };

  // The sample address is still there: the section says so.
  await expect(page.locator('#insp-tfi-sample')).toBeVisible();
  await expect(page.locator('#insp-tfi-list .insp-tfi-row')).toHaveCount(3);
  await expect(page.locator('#insp-tfi-label-0')).toHaveValue('小幫手');
  await expect(page.locator('#insp-tfi-href-1')).toHaveValue('mailto:you@example.com');
  await expect(page.locator('#insp-tfi-pos-br')).toHaveAttribute('aria-pressed', 'true');

  // Corner.
  await step(() => page.locator('#insp-tfi-pos-tl').click(), async () => {
    expect(await attr('[data-tfi]', 'data-tfi-pos')).toBe('tl');
    expect(await edges(island)).toMatchObject({ left: 16, top: 16 });
    await expect(page.locator('#insp-tfi-pos-tl')).toHaveAttribute('aria-pressed', 'true');
  });
  await step(() => page.locator('#insp-tfi-pos-bl').click(), async () => {
    expect(await edges(island)).toMatchObject({ left: 16, bottom: 16 });
  });

  // Colours: two custom properties on the island.
  const colours = () => canvas.locator('.tfi-btn').first().evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
  await step(async () => {
    await page.locator('#insp-tfi-bg').fill('#0055aa');
    await page.locator('#insp-tfi-bg').press('Enter');
  }, async () => {
    expect(await attr('[data-tfi]', 'style')).toBe('--tfi-bg: #0055aa');
    expect(await colours()).toEqual(['rgb(0, 85, 170)', 'rgb(255, 255, 255)']);
  });
  await step(async () => {
    await page.locator('#insp-tfi-ink').fill('rgb(255, 238, 0)');
    await page.locator('#insp-tfi-ink').press('Enter');
  }, async () => {
    expect(await colours()).toEqual(['rgb(0, 85, 170)', 'rgb(255, 238, 0)']);
    expect((await page.evaluate(() => window.HE.island.get())).ink).toBe('rgb(255, 238, 0)');
  });
  // Not a colour: refused, with a message.
  let was = await depth(page);
  await page.locator('#insp-tfi-bg').fill('notacolour');
  await page.locator('#insp-tfi-bg').press('Enter');
  await expect(page.locator('#layer-root .toast.error').last()).toContainText('無法辨識這個顏色');
  await expect(page.locator('#insp-tfi-bg')).toHaveValue('#0055aa');
  expect(await depth(page)).toBe(was);
  await step(() => page.locator('#insp-tfi-bg-clear').click(), async () => {
    expect((await colours())[0]).toBe('rgb(31, 35, 40)');
  });

  // Add a link: it goes after the last button and opens another site in a new tab.
  await step(() => page.locator('#insp-tfi-add-link').click(), async () => {
    expect(await buttons(page)).toEqual(['panel:小幫手:tfi-panel-1', 'link:問題回報:mailto:you@example.com', 'top:回到頂端:#', 'link:新連結:https://example.com/']);
    expect(await page.evaluate(() => window.HE.doc.body.querySelector('[data-tfi] a:last-of-type').outerHTML.replace(/ data-he-id="[^"]*"/g, '')))
      .toBe('<a class="tfi-btn" href="https://example.com/" target="_blank" rel="noopener">新連結</a>');
    await expect(page.locator('#insp-tfi-list .insp-tfi-row')).toHaveCount(4);
  });
  // Text and target.
  await step(async () => {
    await page.locator('#insp-tfi-label-3').fill('  使用  說明 ');
    await page.locator('#insp-tfi-label-3').press('Enter');
  }, async () => {
    expect((await buttons(page))[3]).toBe('link:使用 說明:https://example.com/');
    await expect(canvas.locator('[data-tfi] .tfi-btn').nth(3)).toHaveText('使用 說明');
  });
  await step(async () => {
    await page.locator('#insp-tfi-href-3').fill('tel:+886212345678');
    await page.locator('#insp-tfi-href-3').press('Enter');
  }, async () => {
    // Not another site: no new tab.
    expect(await page.evaluate(() => window.HE.doc.body.querySelector('[data-tfi] a:last-of-type').outerHTML.replace(/ data-he-id="[^"]*"/g, '')))
      .toBe('<a class="tfi-btn" href="tel:+886212345678">使用 說明</a>');
  });
  // Addresses a button may not open: refused with a message, nothing written.
  was = await depth(page);
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'file:///etc/passwd', '//evil.example/x', 'example.com/help', '#nowhere', 'https://']) {
    await page.locator('#insp-tfi-href-3').fill(bad);
    await page.locator('#insp-tfi-href-3').press('Enter');
    await expect(page.locator('#layer-root .toast.error').last()).toContainText('這個網址無法使用');
    await expect(page.locator('#insp-tfi-href-3')).toHaveValue('tel:+886212345678');
    expect(await attr('[data-tfi] a:last-of-type', 'href')).toBe('tel:+886212345678');
  }
  expect(await page.evaluate(() => [
    window.HE.island.updateButton(window.HE.island.get().buttons[3].id, { href: 'javascript:alert(1)' }),
    window.HE.island.addButton('link', { label: 'x', href: 'javascript:alert(1)' }),
    window.HE.island.updateButton(window.HE.island.get().buttons[2].id, { href: 'https://example.org/' }), // back-to-top has no address
    window.HE.island.updateButton(window.HE.island.get().buttons[3].id, { label: '   ' }),
  ])).toEqual([false, null, false, false]);
  expect(await depth(page)).toBe(was);
  expect(await serialize(page)).not.toMatch(/javascript:/i);
  // A bare e-mail address becomes a mailto link; the sample warning goes when no button names example.com.
  await page.locator('#insp-tfi-href-1').fill('service@tactile.test');
  await page.locator('#insp-tfi-href-1').press('Enter');
  expect((await buttons(page))[1]).toBe('link:問題回報:mailto:service@tactile.test');
  await expect(page.locator('#insp-tfi-sample')).toBeHidden();

  // Add a panel: a button and a panel with an id of its own; the canvas opens it.
  await step(() => page.locator('#insp-tfi-add-panel').click(), async () => {
    expect((await buttons(page))[4]).toBe('panel:小面板:tfi-panel-2');
    expect(await page.evaluate(() => window.HE.doc.body.querySelector('#tfi-panel-2').outerHTML.replace(/ data-he-id="[^"]*"/g, '')))
      .toBe('<div class="tfi-panel" id="tfi-panel-2" popover="" data-tfi-panel=""><h3>小面板</h3><p>在這裡輸入內容</p></div>');
  });
  await select(page, '[popovertarget="tfi-panel-2"]');
  await expect(canvas.locator('#tfi-panel-2')).toBeVisible();
  await expect(canvas.locator('#tfi-panel-1')).toBeHidden();
  // 編輯面板內容 selects the panel.
  await page.locator('#insp-tfi-edit-4').click();
  expect(await page.evaluate(() => window.HE.doc.byId(window.HE.sel.primary).id)).toBe('tfi-panel-2');
  await expect(page.locator('#insp-sec-island')).toBeVisible();

  // Add back-to-top.
  await step(() => page.locator('#insp-tfi-add-top').click(), async () => {
    expect((await buttons(page))[5]).toBe('top:回到頂端:#');
  });

  // Move: up, then down again.
  const order = async () => (await buttons(page)).map((b) => b.split(':')[1]);
  await step(() => page.locator('#insp-tfi-up-1').click(), async () => {
    expect(await order()).toEqual(['問題回報', '小幫手', '回到頂端', '使用 說明', '小面板', '回到頂端']);
    await expect(page.locator('#insp-tfi-label-0')).toHaveValue('問題回報');
  });
  await expect(page.locator('#insp-tfi-up-0')).toBeDisabled();
  await expect(page.locator('#insp-tfi-down-5')).toBeDisabled();
  await step(() => page.locator('#insp-tfi-down-0').click(), async () => {
    expect(await order()).toEqual(['小幫手', '問題回報', '回到頂端', '使用 說明', '小面板', '回到頂端']);
  });

  // Delete: a link alone; a panel button takes its panel along.
  await step(() => page.locator('#insp-tfi-del-3').click(), async () => {
    expect(await order()).toEqual(['小幫手', '問題回報', '回到頂端', '小面板', '回到頂端']);
  });
  await select(page, '#tfi-panel-1 h3');
  await step(() => page.locator('#insp-tfi-del-0').click(), async () => {
    expect(await order()).toEqual(['問題回報', '回到頂端', '小面板', '回到頂端']);
    expect(await page.evaluate(() => [...window.HE.doc.body.querySelectorAll('[data-tfi-panel]')].map((p) => p.id))).toEqual(['tfi-panel-2']);
  });
  // The selection was inside the panel that went: the island has it now, and its settings stay.
  expect(await page.evaluate(() => window.HE.sel.primary === window.HE.island.get().id)).toBe(true);
  await expect(page.locator('#insp-sec-island')).toBeVisible();
  // The island CSS is the same as at the start: it does not depend on the buttons.
  expect(await page.evaluate(() => window.HE.ops.getHeadStyle('island').split('\n').length)).toBeGreaterThan(10);
});

test('the ids of panels written by other means are put right, and each button keeps its own panel', async ({ page }) => {
  await open(page);
  const before = await serialize(page);
  // As a paste or the AI would write it: one panel without an id, two with the same id, one no button opens, and an
  // id another element of the page already has. The island sits inside another box.
  await page.evaluate(() => window.HE.ops.insertHTML(window.HE.doc.idOf(window.HE.doc.body.querySelector('h1')), 'after',
    '<section id="faq"><div class="tfi" data-tfi>' +
    '<button class="tfi-btn" type="button" popovertarget="missing">A</button>' +
    '<button class="tfi-btn" type="button" popovertarget="dup">B</button>' +
    '<button class="tfi-btn" type="button" popovertarget="dup">C</button>' +
    '<button class="tfi-btn" type="button" popovertarget="faq">D</button>' +
    '<div popover data-tfi-panel>a</div><div id="dup" popover data-tfi-panel>b</div><div id="dup" popover data-tfi-panel>c</div>' +
    '<div id="faq" popover data-tfi-panel>d</div><div id="lonely" popover data-tfi-panel>e</div></div></section>'));
  const pairs = await page.evaluate(() => {
    const isl = window.HE.doc.body.querySelector('[data-tfi]');
    const out = {};
    for (const b of isl.querySelectorAll('button')) {
      const p = isl.querySelector('[data-tfi-panel][id="' + b.getAttribute('popovertarget') + '"]');
      out[b.textContent] = p ? p.textContent : null;
    }
    return { out, ids: [...isl.querySelectorAll('[data-tfi-panel]')].map((p) => p.id), parent: isl.parentElement.localName, last: isl === window.HE.doc.body.lastElementChild };
  });
  expect(pairs.out).toEqual({ A: 'a', B: 'b', C: 'c', D: 'd' });
  expect(pairs.ids).toEqual(['tfi-panel-1', 'dup', 'tfi-panel-2', 'tfi-panel-3', 'lonely']);
  expect(new Set(pairs.ids).size).toBe(5);
  // The island was moved out to <body>, and its CSS came in the same undo step.
  expect([pairs.parent, pairs.last]).toEqual(['body', true]);
  expect(await page.evaluate(() => !!window.HE.ops.getHeadStyle('island'))).toBe(true);
  expect(await depth(page)).toBe(1);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // An English document gets the English note, whatever the interface language.
  await page.evaluate(() => {
    window.HE.ops.setAttr(window.HE.doc.idOf(window.HE.doc.model.documentElement), { lang: 'en' });
    window.HE.island.create();
  });
  expect(await page.evaluate(() => window.HE.ops.getHeadStyle('island').startsWith('/* Tactile floating island:'))).toBe(true);
});

test('a multi-page document: a link can open a page, and back-to-top is not offered', async ({ page }) => {
  await open(page);
  await page.locator('[data-tabs="left"] [data-tab="insert"]').click();
  await page.locator('#ins-tile-pages').click();
  const canvas = page.frameLocator(frame);
  await expect(canvas.locator('.tpg > .tpg-page')).toHaveCount(3);
  await page.locator('#ins-tile-island').click();
  await expect(canvas.locator('[data-tfi] .tfi-btn')).toHaveCount(2);

  // No back-to-top, and the island is beside the pages, not inside the one on show.
  expect(await buttons(page)).toEqual(['panel:小幫手:tfi-panel-1', 'link:問題回報:mailto:you@example.com']);
  expect(await page.evaluate(() => [window.HE.doc.body.lastElementChild.hasAttribute('data-tfi'), !!window.HE.doc.body.querySelector('[data-tpg] [data-tfi]')])).toEqual([true, false]);
  await expect(page.locator('#insp-tfi-add-top')).toBeDisabled();
  await expect(page.locator('#insp-tfi-no-top')).toBeVisible();
  await expect(page.locator('#insp-tfi-no-top')).toContainText('會跳回第 1 頁');
  expect(await page.evaluate(() => window.HE.island.addButton('top'))).toBeNull();
  expect(await buttons(page)).toHaveLength(2);

  // A link's target: an address, or one of the pages.
  const pick = page.locator('#insp-tfi-page-1');
  expect(await pick.locator('option').allTextContents()).toEqual(['網址…', '頁面：首頁', '頁面：關於', '頁面：聯絡']);
  await expect(pick).toHaveValue('');
  await expect(page.locator('#insp-tfi-href-1')).toBeVisible();
  const was = await depth(page);
  await pick.selectOption('about');
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('[data-tfi] a').outerHTML.replace(/ data-he-id="[^"]*"/g, ''))).toBe('<a class="tfi-btn" href="#about">問題回報</a>');
  expect((await page.evaluate(() => window.HE.island.get())).buttons[1].page).toBe('about');
  expect(await depth(page)).toBe(was + 1);
  await expect(page.locator('#insp-tfi-href-1')).toBeHidden();
  await expect(pick).toHaveValue('about');
  // In preview the button switches to that page, as a link of the navigation bar does.
  await page.evaluate(() => window.HE.setMode('preview'));
  await canvas.locator('[data-tfi] a.tfi-btn').click();
  await expect.poll(() => canvas.locator('.tpg > .tpg-page').evaluateAll((els) => els.filter((e) => e.offsetHeight > 0).map((e) => e.id))).toEqual(['about']);
  await page.evaluate(() => window.HE.setMode('edit'));
  // Back to an address.
  await select(page, '[data-tfi]');
  await page.locator('#insp-tfi-page-1').selectOption('');
  await expect(page.locator('#insp-tfi-href-1')).toBeFocused();
  await page.locator('#insp-tfi-href-1').fill('https://tactile.test/form');
  await page.locator('#insp-tfi-href-1').press('Enter');
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('[data-tfi] a').outerHTML.replace(/ data-he-id="[^"]*"/g, '')))
    .toBe('<a class="tfi-btn" href="https://tactile.test/form" target="_blank" rel="noopener">問題回報</a>');
  // A page that is not there is refused.
  expect(await page.evaluate(() => window.HE.island.updateButton(window.HE.island.get().buttons[1].id, { page: 'nowhere' }))).toBe(false);
  expect(await page.evaluate(() => window.HE.island.addButton('link', { label: '聯絡', page: '#contact' }))).not.toBeNull();
  expect((await buttons(page))[2]).toBe('link:聯絡:#contact');
});

test('a document turned into pages afterwards keeps its island beside the pages, and the section warns about back-to-top', async ({ page }) => {
  await openWithIsland(page);
  await expect(page.locator('#insp-tfi-top-pages')).toBeHidden();
  const before = await serialize(page);
  expect(await page.evaluate(() => window.HE.pages.convert())).not.toBeNull();
  expect(await page.evaluate(() => [window.HE.pages.mode(), window.HE.doc.body.lastElementChild.hasAttribute('data-tfi'), !!window.HE.doc.body.querySelector('[data-tpg] [data-tfi]')])).toEqual(['pages', true, false]);
  // The button it had stays; the section says what it does now.
  expect(await buttons(page)).toEqual(['panel:小幫手:tfi-panel-1', 'link:問題回報:mailto:you@example.com', 'top:回到頂端:#']);
  await select(page, '[data-tfi]');
  await expect(page.locator('#insp-tfi-top-pages')).toBeVisible();
  await expect(page.locator('#insp-tfi-add-top')).toBeDisabled();
  await undo(page);
  expect(await serialize(page)).toBe(before);
});

test('the AI is told about the island, and an island it writes gets the CSS and the panel ids in the same undo step', async ({ page }) => {
  await open(page);
  const before = await serialize(page);
  const requests = [];
  const calls = [{ name: 'insert_html', input: { ref_id: 'body', position: 'prepend', html:
    '<div class="tfi" data-tfi data-tfi-pos="bl" role="group" aria-label="Help"><button class="tfi-btn" type="button" popovertarget="faq">FAQ</button>' +
    '<a class="tfi-btn" href="mailto:hello@tactile.test">Mail</a><div class="tfi-panel" popover data-tfi-panel><p>Hi</p></div></div>' } }];
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = JSON.parse(route.request().postData());
    requests.push(body);
    const use = calls[requests.length - 1];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(use
      ? { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'toolu_' + requests.length, name: use.name, input: use.input }] }
      : { id: 'm', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '好。' }] }) });
  });
  await page.evaluate(() => { window.HE.settings.set('ai.provider', 'anthropic'); window.HE.settings.set('ai.anthropic.key', 'test-key-for-mocked-api'); });
  expect(await page.evaluate(() => window.HE.ai.run('加一個浮動島'))).toBe(true);

  const textOf = (req) => { const last = req.messages.at(-1).content; return typeof last === 'string' ? last : last.map((c) => c.text || '').join('\n'); };
  // No island yet: no line about it. The rules are in the system prompt, and no tool was added for it.
  expect(textOf(requests[0])).not.toContain('Island:');
  expect(requests[0].system).toContain('data-he-style="island"');
  expect(requests[0].system).toContain('popovertarget');
  expect(requests[0].tools).toHaveLength(24);

  // What the AI wrote: the CSS is there, the panel has an id and its button names it.
  expect(await page.evaluate(() => window.HE.ops.getHeadStyle('island'))).toContain('[data-tfi] { position: fixed;');
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('[data-tfi]').outerHTML.replace(/ data-he-id="[^"]*"/g, ''))).toBe(
    '<div class="tfi" data-tfi="" data-tfi-pos="bl" role="group" aria-label="Help"><button class="tfi-btn" type="button" popovertarget="tfi-panel-1">FAQ</button>' +
    '<a class="tfi-btn" href="mailto:hello@tactile.test">Mail</a><div class="tfi-panel" popover="" data-tfi-panel="" id="tfi-panel-1"><p>Hi</p></div></div>');
  expect(await edges(page.frameLocator(frame).locator('[data-tfi]'))).toMatchObject({ position: 'fixed', left: 16, bottom: 16 });
  expect(await page.evaluate(() => window.HE.doc.hasScripts())).toBe(false);
  // The whole run is one undo step.
  expect(await depth(page)).toBe(1);
  await undo(page);
  expect(await serialize(page)).toBe(before);
  await redo(page);

  // The next request names the island: its corner, and each button's kind, text and target.
  expect(await page.evaluate(() => window.HE.ai.run('謝謝'))).toBe(true);
  const ids = await page.evaluate(() => { const s = window.HE.island.get(); return [s.id, s.buttons[0].panelId]; });
  expect(textOf(requests[2])).toContain('Island: [' + ids[0] + '] at the bottom left; buttons: panel "FAQ" (opens #tfi-panel-1 [' + ids[1] + ']), link "Mail" ("mailto:hello@tactile.test"). ' +
    'It is [data-tfi] directly inside <body>; the editor maintains its CSS.');
  // The island CSS is not shown to the AI as page CSS it could edit.
  expect(textOf(requests[2])).not.toContain('position: fixed; z-index: 1000');

  // The settings name what the request carried.
  await page.locator('#btn-ai-settings').click();
  await expect(page.locator('#ai-set-sent')).toContainText('浮動島：位置');
});
