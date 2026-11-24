const { test, expect } = require('@playwright/test');

const frame = 'iframe.cv-frame:not(.is-pending)';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
const PLAIN = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>t</title></head><body><h1>報告</h1><p>一段文字</p></body></html>';

async function open(page, html = PLAIN) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/dist/tactile.html');
  await expect(page.locator(frame)).toBeVisible();
  expect(await page.evaluate((src) => window.HE.fileio.openText(src, 'site.html'), html)).toBe(true);
  await expect(page.frameLocator(frame).locator('h1')).toBeVisible();
}

/** A plain document with the 多頁面 block in it: a navigation bar and the pages home, about and contact. */
async function openWithPages(page) {
  await open(page);
  await page.locator('[data-tabs="left"] [data-tab="insert"]').click();
  await page.locator('#ins-tile-pages').click();
  await expect(page.frameLocator(frame).locator('.tpg > .tpg-page')).toHaveCount(3);
}

/** What the document holds: the pages as id:name, the links of each navigation bar as href:text, and the page CSS. */
const read = (page) => page.evaluate(() => {
  const b = window.HE.doc.body;
  return {
    pages: [...b.querySelectorAll('[data-tpg] > .tpg-page')].map((p) => p.id + ':' + p.getAttribute('data-tpg-title')),
    navs: [...b.querySelectorAll('[data-tpg-nav]')].map((n) => [...n.querySelectorAll('a')].map((a) => a.getAttribute('href') + ':' + a.textContent)),
    css: window.HE.ops.getHeadStyle('pages'),
  };
});
/** The ids of the pages that take up room in a document (the canvas, or a page of its own). */
const shownIn = (root) => root.locator('.tpg > .tpg-page').evaluateAll((els) => els.filter((e) => e.offsetHeight > 0).map((e) => e.id));
const shown = (page) => shownIn(page.frameLocator(frame));
const serialize = (page) => page.evaluate(() => window.HE.doc.serialize());
const undo = (page) => page.evaluate(() => window.HE.history.undo());
const redo = (page) => page.evaluate(() => window.HE.history.redo());
const rows = (page) => page.locator('#pages-pane .pg-row');
const names = (page) => page.locator('#pages-pane .pg-title').allTextContents();
const heId = (page, sel) => page.evaluate((s) => window.HE.doc.body.querySelector(s).getAttribute('data-he-id'), sel);
/** The rules of the page CSS that mark the link of the page on show, as the fragments they name. */
const marked = (css) => [...css.matchAll(/:root:has\(#([^:)]+):target\)/g)].map((m) => m[1]);

test('the 多頁面 block puts a navigation bar, three pages and their CSS into the document, and the canvas shows one page', async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => window.HE.pages.mode())).toBe('');
  const before = await serialize(page);
  await page.locator('[data-tabs="left"] [data-tab="insert"]').click();
  await page.locator('#ins-tile-pages').click();
  await expect(page.frameLocator(frame).locator('.tpg > .tpg-page')).toHaveCount(3);

  const doc = await read(page);
  expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'contact:聯絡']);
  expect(doc.navs).toEqual([['#home:首頁', '#about:關於', '#contact:聯絡']]);
  expect(doc.css).toContain('.tpg > .tpg-page:target { display: block; }');
  expect(doc.css).toContain('@supports not selector(:has(*))');
  expect(doc.css.startsWith('/* Tactile 多頁面')).toBe(true);
  expect(marked(doc.css)).toEqual(['home', 'about', 'contact']);
  expect(await page.evaluate(() => window.HE.pages.mode())).toBe('pages');
  expect(await page.evaluate(() => window.HE.pages.list().map((p) => p.anchor + (p.current ? '*' : '')))).toEqual(['home*', 'about', 'contact']);

  // The edit frame shows the first page only, with a style of its own that the document does not hold.
  expect(await shown(page)).toEqual(['home']);
  await expect(page.frameLocator(frame).locator('#__he_pages_css')).toHaveCount(1);
  expect(await serialize(page)).not.toContain('__he_pages_css');
  // The style sits in <head>, once, and the markup is what a person would write.
  const html = await serialize(page);
  expect(html.split('data-he-style="pages"').length - 1).toBe(1);
  expect(html).toContain('<nav class="tpg-nav" data-tpg-nav=""><a href="#home">首頁</a><a href="#about">關於</a><a href="#contact">聯絡</a></nav>');
  expect(html).toContain('<section class="tpg-page" id="home" data-tpg-title="首頁"><h2>首頁</h2>');

  // One undo takes the block and its CSS away again.
  await undo(page);
  expect(await serialize(page)).toBe(before);
  await redo(page);
  expect((await read(page)).pages).toHaveLength(3);

  // A document holds one set of pages: the block now adds a page.
  await page.locator('#ins-tile-pages').click();
  await expect(page.frameLocator(frame).locator('.tpg > .tpg-page')).toHaveCount(4);
  expect(await page.evaluate(() => window.HE.doc.body.querySelectorAll('[data-tpg]').length)).toBe(1);
  expect((await read(page)).navs[0]).toHaveLength(4);
});

test('the pane shows, adds, renames, copies, removes and reorders pages; links and CSS follow, one undo step each', async ({ page }) => {
  await openWithPages(page);
  // A second navigation bar with links of the user's own.
  await page.evaluate(() => window.HE.ops.insertHTML(null, 'append',
    '<footer data-tpg-nav><a class="ext" href="https://example.com/">外部</a> <a class="ext" href="#top">回頂端</a></footer>'));
  const OWN = ['https://example.com/:外部', '#top:回頂端'];
  expect((await read(page)).navs[1]).toEqual([...OWN, '#home:首頁', '#about:關於', '#contact:聯絡']);
  // A new link takes the class of the last link of its bar.
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('footer a[href="#about"]').className)).toBe('ext');

  await page.locator('[data-tabs="left"] [data-tab="pages"]').click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator('#pages-pane .pg-count')).toHaveText('3 個頁面');
  expect(await names(page)).toEqual(['首頁', '關於', '聯絡']);
  await expect(rows(page).nth(0)).toHaveAttribute('aria-selected', 'true');

  // Clicking a row shows that page.
  await rows(page).nth(1).click();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => shown(page)).toEqual(['about']);
  // The link of the page on show is the marked one, in the edit frame too.
  const weight = (href) => page.frameLocator(frame).locator('nav a[href="' + href + '"]').evaluate((a) => getComputedStyle(a).fontWeight);
  expect(await weight('#about')).toBe('700');
  expect(await weight('#home')).toBe('400');

  /** Runs one change, checks it, and checks that one undo takes all of it back. Leaves the change in place. */
  const step = async (change, check) => {
    const before = await serialize(page);
    const depth = await page.evaluate(() => window.HE.history.undoStack.length);
    await change();
    await check();
    expect(await page.evaluate(() => window.HE.history.undoStack.length)).toBe(depth + 1);
    await undo(page);
    expect(await serialize(page)).toBe(before);
    await redo(page);
    await check();
  };

  // Add: after the page on show, with a link in both bars and a rule in the CSS.
  await step(async () => {
    await page.locator('#pg-add').click();
    await expect.poll(() => shown(page)).toEqual(['page-4']);
  }, async () => {
    await expect(rows(page)).toHaveCount(4);
    const doc = await read(page);
    expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'page-4:新頁面', 'contact:聯絡']);
    expect(doc.navs[0]).toEqual(['#home:首頁', '#about:關於', '#page-4:新頁面', '#contact:聯絡']);
    expect(doc.navs[1]).toEqual([...OWN, '#home:首頁', '#about:關於', '#page-4:新頁面', '#contact:聯絡']);
    expect(marked(doc.css)).toEqual(['home', 'about', 'page-4', 'contact']);
  });
  // The undo took the new page away, and the canvas went back to the page it showed before.
  expect(await shown(page)).toEqual(['about']);
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('#page-4').outerHTML.replace(/ data-he-id="[^"]*"/g, '')))
    .toBe('<section class="tpg-page" id="page-4" data-tpg-title="新頁面"><h2>新頁面</h2><p>在這裡輸入內容</p></section>');

  // Rename: the name and the links change, the address does not.
  await step(async () => {
    await rows(page).nth(2).hover();
    await rows(page).nth(2).getByRole('button', { name: '改名' }).click();
    await page.locator('#he-prompt-input').fill('最新報導');
    await page.locator('#he-prompt-input').press('Enter');
  }, async () => {
    await expect(page.locator('#pages-pane .pg-title').nth(2)).toHaveText('最新報導');
    const doc = await read(page);
    expect(doc.pages[2]).toBe('page-4:最新報導');
    expect(doc.navs[0][2]).toBe('#page-4:最新報導');
    expect(doc.navs[1][4]).toBe('#page-4:最新報導');
  });

  // Copy: the copy gets an address and a link of its own.
  await step(async () => {
    await rows(page).nth(1).hover();
    await rows(page).nth(1).getByRole('button', { name: '複製' }).click();
  }, async () => {
    await expect(rows(page)).toHaveCount(5);
    const doc = await read(page);
    expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'about-2:關於 的副本', 'page-4:最新報導', 'contact:聯絡']);
    expect(doc.navs[0]).toEqual(['#home:首頁', '#about:關於', '#about-2:關於 的副本', '#page-4:最新報導', '#contact:聯絡']);
    expect(doc.navs[1].slice(2)).toEqual(doc.navs[0]);
    expect(marked(doc.css)).toEqual(['home', 'about', 'about-2', 'page-4', 'contact']);
  });

  // Remove: the page's links go, the user's own links stay.
  await step(async () => {
    await rows(page).nth(2).hover();
    await rows(page).nth(2).getByRole('button', { name: '刪除' }).click();
  }, async () => {
    await expect(rows(page)).toHaveCount(4);
    const doc = await read(page);
    expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'page-4:最新報導', 'contact:聯絡']);
    expect(doc.navs[0]).toEqual(['#home:首頁', '#about:關於', '#page-4:最新報導', '#contact:聯絡']);
    expect(doc.navs[1]).toEqual([...OWN, '#home:首頁', '#about:關於', '#page-4:最新報導', '#contact:聯絡']);
    expect(marked(doc.css)).toEqual(['home', 'about', 'page-4', 'contact']);
  });

  // Move up with the button: the links change places among themselves, the user's links keep theirs.
  await step(async () => {
    await rows(page).nth(3).hover();
    await rows(page).nth(3).getByRole('button', { name: '上移' }).click();
  }, async () => {
    const doc = await read(page);
    expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'contact:聯絡', 'page-4:最新報導']);
    expect(doc.navs[0]).toEqual(['#home:首頁', '#about:關於', '#contact:聯絡', '#page-4:最新報導']);
    expect(doc.navs[1]).toEqual([...OWN, '#home:首頁', '#about:關於', '#contact:聯絡', '#page-4:最新報導']);
    expect(marked(doc.css)).toEqual(['home', 'about', 'contact', 'page-4']);
  });

  // Drag the first row below the third.
  await step(async () => {
    // The pane redraws after the step before: measure the row once it is there again.
    await expect(rows(page).nth(2)).toBeVisible();
    // The redraw is debounced (80 ms): a drag that starts before it loses its row. Wait until the same row has stayed.
    await expect.poll(async () => {
      const same = () => rows(page).nth(0).evaluate((r) => { const was = r.dataset.seen === '1'; r.dataset.seen = '1'; return was; });
      await same();
      await page.waitForTimeout(160);
      return same();
    }).toBe(true);
    let box = null;
    await expect.poll(async () => { box = await rows(page).nth(2).boundingBox(); return !!box && box.height > 0; }).toBe(true);
    await rows(page).nth(0).dragTo(rows(page).nth(2), { targetPosition: { x: box.width / 2, y: box.height - 3 } });
  }, async () => {
    await expect.poll(async () => (await read(page)).pages).toEqual(['about:關於', 'contact:聯絡', 'home:首頁', 'page-4:最新報導']);
    const doc = await read(page);
    expect(doc.navs[0]).toEqual(['#about:關於', '#contact:聯絡', '#home:首頁', '#page-4:最新報導']);
    expect(doc.navs[1]).toEqual([...OWN, '#about:關於', '#contact:聯絡', '#home:首頁', '#page-4:最新報導']);
    // The first page is the one a visitor lands on.
    expect(doc.css).toContain(':root:not(:has(.tpg > .tpg-page:target)) [data-tpg-nav] a[href="#about"]');
  });

  // The last page cannot be removed.
  for (let n = 4; n > 1; n--) {
    await rows(page).nth(0).hover();
    await rows(page).nth(0).getByRole('button', { name: '刪除' }).click();
    await expect(rows(page)).toHaveCount(n - 1);
  }
  await rows(page).nth(0).hover();
  await expect(rows(page).nth(0).getByRole('button', { name: '刪除' })).toBeDisabled();
  const last = await read(page);
  expect(last.pages).toEqual(['page-4:最新報導']);
  expect(last.navs).toEqual([['#page-4:最新報導'], [...OWN, '#page-4:最新報導']]);
  expect(await page.evaluate(() => window.HE.pages.remove(window.HE.pages.list()[0].id))).toBe(false);
});

test('pages changed by other means get their links and CSS in the same undo step, and the canvas follows the selection', async ({ page }) => {
  await openWithPages(page);
  const before = await serialize(page);

  // A page written as HTML (as the AI or a paste would): the link and the rule come with it.
  await page.evaluate(() => window.HE.ops.insertHTML(window.HE.doc.idOf(window.HE.doc.body.querySelector('#contact')), 'after',
    '<section class="tpg-page" data-tpg-title="Pricing plans"><h2>Pricing</h2></section><section class="tpg-page" id="about"><h2>重複的位址</h2></section>'));
  let doc = await read(page);
  // No id: one is made from the name. An id another page has: a free one. No name: the heading.
  expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'contact:聯絡', 'pricing-plans:Pricing plans', 'page-5:重複的位址']);
  expect(doc.navs[0]).toEqual(['#home:首頁', '#about:關於', '#contact:聯絡', '#pricing-plans:Pricing plans', '#page-5:重複的位址']);
  expect(marked(doc.css)).toEqual(['home', 'about', 'contact', 'pricing-plans', 'page-5']);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // A page removed with the ordinary delete loses its link too.
  await page.evaluate(() => window.HE.ops.remove([window.HE.doc.idOf(window.HE.doc.body.querySelector('#about'))]));
  doc = await read(page);
  expect(doc.navs[0]).toEqual(['#home:首頁', '#contact:聯絡']);
  expect(marked(doc.css)).toEqual(['home', 'contact']);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // Selecting something inside another page (the layers panel, the AI) brings that page up.
  expect(await shown(page)).toEqual(['home']);
  await page.evaluate((id) => window.HE.sel.set([id]), await heId(page, '#contact p'));
  await expect.poll(() => shown(page)).toEqual(['contact']);
  expect(await page.evaluate(() => window.HE.pages.list().find((p) => p.current).anchor)).toBe('contact');

  // A block inserted with a page selected goes into that page, not beside it.
  await page.evaluate(() => window.HE.pages.go(window.HE.pages.list()[1].id));
  await page.locator('#ins-tile-h2').click();
  expect(await page.evaluate(() => [...window.HE.doc.body.querySelector('[data-tpg]').children].map((c) => c.id + ':' + c.children.length))).toEqual(['home:2', 'about:3', 'contact:2']);
  await page.keyboard.press('Escape');

  // Without pages the CSS goes: sync is what every edit runs, and it adds nothing to a document that is in step.
  expect(await page.evaluate(() => { const a = window.HE.doc.serialize(); const changed = window.HE.pages.sync(); return [changed, window.HE.doc.serialize() === a]; })).toEqual([false, true]);
  await page.evaluate(() => window.HE.ops.remove([window.HE.doc.idOf(window.HE.doc.body.querySelector('[data-tpg]'))]));
  expect(await serialize(page)).not.toContain('data-he-style="pages"');
  expect(await page.evaluate(() => window.HE.pages.mode())).toBe('');
  await expect(page.frameLocator(frame).locator('#__he_pages_css')).toHaveCount(0);
});

test('preview: the links of the navigation bar switch the page, with the document\'s own CSS', async ({ page }) => {
  await openWithPages(page);
  const canvas = page.frameLocator(frame);
  // Preview opens on the page that was being edited.
  await page.evaluate(() => window.HE.pages.go(window.HE.pages.list()[1].id));
  await page.evaluate(() => window.HE.setMode('preview'));
  await expect(canvas.locator('#__he_pages_css')).toHaveCount(0);
  expect(await canvas.locator('style[data-he-style="pages"]').getAttribute('media')).toBeNull();
  await expect.poll(() => shown(page)).toEqual(['about']);

  const weight = (href) => canvas.locator('nav a[href="' + href + '"]').evaluate((a) => getComputedStyle(a).fontWeight);
  await canvas.locator('nav a[href="#contact"]').click();
  await expect.poll(() => shown(page)).toEqual(['contact']);
  expect(await canvas.locator('html').evaluate(() => location.hash)).toBe('#contact');
  expect(await canvas.locator('#contact').evaluate((el) => el.matches(':target'))).toBe(true);
  expect(await weight('#contact')).toBe('700');
  expect(await weight('#home')).toBe('400');
  await canvas.locator('nav a[href="#home"]').click();
  await expect.poll(() => shown(page)).toEqual(['home']);
  await canvas.locator('nav a[href="#contact"]').click();
  await expect.poll(() => shown(page)).toEqual(['contact']);

  // Back in edit mode the canvas stays on the page the preview was left on.
  await page.evaluate(() => window.HE.setMode('edit'));
  await expect(canvas.locator('#__he_pages_css')).toHaveCount(1);
  expect(await shown(page)).toEqual(['contact']);
  expect(await page.evaluate(() => window.HE.pages.list().find((p) => p.current).anchor)).toBe('contact');
  // Nothing of this reached the document.
  expect(await serialize(page)).not.toMatch(/media="not all"|__he_pages_css/);
});

test('an exported file reopens the same and switches pages on its own', async ({ page, context }) => {
  await openWithPages(page);
  await page.evaluate(() => window.HE.pages.add(null, { title: 'News' }));
  const first = await serialize(page);
  expect(first).not.toContain('data-he-id');
  expect(first.replace(/ data-he-style="pages"/g, '')).not.toContain('data-he-');
  expect(first).toContain('<style data-he-style="pages">');
  // The document has changes that were not exported: opening another one asks first.
  await page.evaluate((src) => { window.opened = window.HE.fileio.openText(src, 'site.html'); }, first);
  await page.locator('#layer-root .modal').getByRole('button', { name: '開啟新的文件' }).click();
  expect(await page.evaluate(() => window.opened)).toBe(true);
  expect(await serialize(page)).toBe(first);
  // Opening it changed nothing, and the pages are found again.
  expect(await page.evaluate(() => window.HE.pages.list().map((p) => p.anchor))).toEqual(['home', 'news', 'about', 'contact']);
  expect(await page.evaluate(() => { const a = window.HE.doc.serialize(); window.HE.pages.sync(); return window.HE.doc.serialize() === a; })).toBe(true);

  // On its own, with no editor around it.
  const alone = await context.newPage();
  await alone.setContent(first);
  expect(await shownIn(alone)).toEqual(['home']);
  const weight = (href) => alone.locator('nav a[href="' + href + '"]').evaluate((a) => getComputedStyle(a).fontWeight);
  expect(await weight('#home')).toBe('700');
  await alone.evaluate(() => { location.hash = '#news'; });
  expect(await shownIn(alone)).toEqual(['news']);
  expect(await weight('#news')).toBe('700');
  expect(await weight('#home')).toBe('400');
  await alone.locator('nav a[href="#contact"]').click();
  expect(await shownIn(alone)).toEqual(['contact']);
  // A fragment that names no page: the first page.
  await alone.evaluate(() => { location.hash = '#nowhere'; });
  expect(await shownIn(alone)).toEqual(['home']);
  await alone.close();
});

test('把這份文件改成多頁面 wraps what the document holds into the first page, as one undo step', async ({ page }) => {
  await open(page, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><h1>Report</h1><p>Text</p>' +
    '<script type="application/json" id="data">{"a":1}</script></body></html>');
  const before = await serialize(page);
  await page.locator('[data-tabs="left"] [data-tab="pages"]').click();
  await expect(page.locator('#pages-pane .pg-empty')).toContainText('這份文件不是簡報');
  await page.locator('#pg-convert').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.frameLocator(frame).locator('.tpg > .tpg-page#home h1')).toHaveText('Report');

  const doc = await read(page);
  expect(doc.pages).toEqual(['home:首頁']);
  expect(doc.navs).toEqual([['#home:首頁']]);
  // An English document gets the English note, whatever the interface language.
  expect(doc.css.startsWith('/* Tactile pages:')).toBe(true);
  expect(await page.evaluate(() => window.HE.doc.body.innerHTML.replace(/ data-he-id="[^"]*"/g, ''))).toBe(
    '<nav class="tpg-nav" data-tpg-nav=""><a href="#home">首頁</a></nav><div class="tpg" data-tpg=""><section class="tpg-page" id="home" data-tpg-title="首頁"><h1>Report</h1><p>Text</p></section></div>' +
    '<script type="application/json" id="data">{"a":1}</script>');
  expect(await shown(page)).toEqual(['home']);
  expect(await page.evaluate(() => window.HE.history.undoStack.length)).toBe(1);

  await undo(page);
  expect(await serialize(page)).toBe(before);
  await expect(page.locator('#pg-convert')).toBeVisible();
  expect(await page.evaluate(() => window.HE.pages.mode())).toBe('');
});

test('the AI is told about the pages and changes them with edit_pages and show_page', async ({ page }) => {
  await openWithPages(page);
  const before = await serialize(page);
  const requests = [];
  const calls = [
    { name: 'edit_pages', input: { action: 'add', title: '價格' } },
    { name: 'edit_pages', input: { action: 'rename', page: '#about', title: '關於我們' } },
    { name: 'edit_pages', input: { action: 'move', page: 'contact', before: '#home' } },
    { name: 'edit_pages', input: { action: 'remove', page: '#nowhere' } },
    { name: 'show_page', input: { page: '#about' } },
  ];
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
  expect(await page.evaluate(() => window.HE.ai.run('加一頁價格，把關於改名'))).toBe(true);

  // The request names the pages and which one is shown, and offers the two tools.
  const last = requests[0].messages.at(-1).content;
  const text = typeof last === 'string' ? last : last.map((c) => c.text || '').join('\n');
  expect(text).toContain('Pages: 首頁 (#home, shown), 關於 (#about), 聯絡 (#contact). Each page is a .tpg-page inside [data-tpg]; the editor shows one page at a time.');
  const tools = requests[0].tools.map((t) => t.name);
  expect(tools).toContain('show_page');
  expect(tools).toContain('edit_pages');
  expect(requests[0].system).toContain('edit_pages');

  // What each call answered.
  const result = (i) => requests[i].messages.at(-1).content[0];
  const added = JSON.parse(result(1).content);
  expect(added).toMatchObject({ ok: true });
  expect(added.pages.map((p) => p.fragment)).toEqual(['#home', '#about', '#contact', '#page-4']);
  expect(added.new_id).toBe(added.pages[3].id);
  expect(JSON.parse(result(2).content).pages[1]).toMatchObject({ fragment: '#about', title: '關於我們' });
  expect(JSON.parse(result(3).content).pages.map((p) => p.fragment)).toEqual(['#contact', '#home', '#about', '#page-4']);
  expect(result(4).is_error).toBe(true);
  expect(result(4).content).toContain('No page "#nowhere"');
  expect(JSON.parse(result(5).content)).toMatchObject({ shown: '#about', title: '關於我們' });

  // The navigation bar and the CSS followed, and the canvas shows the page the AI asked for.
  const doc = await read(page);
  expect(doc.pages).toEqual(['contact:聯絡', 'home:首頁', 'about:關於我們', 'page-4:價格']);
  expect(doc.navs).toEqual([['#contact:聯絡', '#home:首頁', '#about:關於我們', '#page-4:價格']]);
  expect(marked(doc.css)).toEqual(['contact', 'home', 'about', 'page-4']);
  await expect.poll(() => shown(page)).toEqual(['about']);

  // The whole run is one undo step.
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // The settings name what the request carried.
  await page.locator('#btn-ai-settings').click();
  await expect(page.locator('#ai-set-sent')).toContainText('多頁面文件的頁面');
});

/** Answer each request of an AI run with the next tool call of `calls`, then with a closing text. Returns the requests seen. */
async function mockAi(page, calls) {
  const requests = [];
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
  return requests;
}

test('a link the AI writes for a page that already has one is removed during its run, and the tool result says so', async ({ page }) => {
  await openWithPages(page);
  // The user's own second link to a page, there before the run: it is theirs and stays.
  const nav = await heId(page, '[data-tpg-nav]');
  await page.evaluate((id) => window.HE.ops.insertHTML(id, 'append', '<a href="#home">回首頁</a>'), nav);
  const before = await serialize(page);
  // What a model did: a page written as HTML, then a link to it, though the editor had added one already.
  const requests = await mockAi(page, [
    { name: 'insert_html', input: { ref_id: await heId(page, '#contact'), position: 'after', html: '<section class="tpg-page" id="events" data-tpg-title="活動"><h2>活動</h2><p>本月活動</p></section>' } },
    { name: 'insert_html', input: { ref_id: nav, position: 'append', html: '<a href="#events">活動</a>' } },
    { name: 'insert_html', input: { ref_id: nav, position: 'prepend', html: '<a href="#about">關於</a><a href="#events">活動</a><a href="https://tactile.test/shop">商店</a>' } },
  ]);
  expect(await page.evaluate(() => window.HE.ai.run('加一頁活動'))).toBe(true);

  expect(requests[0].system).toContain('never add that link yourself');
  expect(requests[0].tools).toHaveLength(24);
  const result = (i) => JSON.parse(requests[i].messages.at(-1).content[0].content);
  // The page came with its link: nothing to say.
  expect(result(1).page_links).toBeUndefined();
  expect(result(1).new_ids).toHaveLength(1);
  expect(result(2).page_links).toContain('1 duplicate link was removed');
  expect(result(2).page_links).toContain('Do not write links to pages');
  expect(result(3).page_links).toContain('2 duplicate links were removed');

  // One link per page, the user's own second link to #home, and the link that names no page.
  const doc = await read(page);
  expect(doc.pages).toEqual(['home:首頁', 'about:關於', 'contact:聯絡', 'events:活動']);
  expect(doc.navs).toEqual([['https://tactile.test/shop:商店', '#home:首頁', '#about:關於', '#contact:聯絡', '#events:活動', '#home:回首頁']]);
  expect(await serialize(page)).toContain('<a href="#contact">聯絡</a><a href="#events">活動</a><a href="#home">回首頁</a></nav>');

  // The run is one undo step. Outside a run nobody's duplicate is touched.
  await undo(page);
  expect(await serialize(page)).toBe(before);
  await page.evaluate((id) => window.HE.ops.insertHTML(id, 'append', '<a href="#about">再看一次</a>'), nav);
  expect((await read(page)).navs[0]).toEqual(['#home:首頁', '#about:關於', '#contact:聯絡', '#home:回首頁', '#about:再看一次']);
});

test('a page removed with the Delete key, the layers panel, a source edit or as the last one loses its links, in the same undo step', async ({ page }) => {
  await openWithPages(page);
  const nav = await heId(page, '[data-tpg-nav]');
  await page.evaluate((id) => window.HE.ops.insertHTML(id, 'append', '<a href="#notes">附註</a><a href="https://tactile.test/">官網</a>'), nav);
  const OWN = ['#notes:附註', 'https://tactile.test/:官網'];
  const before = await serialize(page);
  const steps = () => page.evaluate(() => window.HE.history.undoStack.length);
  const base = await steps();

  // The Delete key on the canvas, with the page selected.
  await page.frameLocator(frame).locator('#home h2').click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.HE.doc.byId(window.HE.sel.primary).id)).toBe('home');
  await page.keyboard.press('Delete');
  let doc = await read(page);
  expect(doc.pages).toEqual(['about:關於', 'contact:聯絡']);
  expect(doc.navs[0]).toEqual(['#about:關於', '#contact:聯絡', ...OWN]);
  expect(marked(doc.css)).toEqual(['about', 'contact']);
  expect(await steps()).toBe(base + 1);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // The layers panel: its row, then the Delete key there.
  await page.locator('[data-tabs="left"] [data-tab="layers"]').click();
  const row = page.locator('.lyr-row[data-id="' + await heId(page, '#about') + '"]');
  await row.click();
  await page.keyboard.press('Delete');
  doc = await read(page);
  expect(doc.pages).toEqual(['home:首頁', 'contact:聯絡']);
  expect(doc.navs[0]).toEqual(['#home:首頁', '#contact:聯絡', ...OWN]);
  expect(await steps()).toBe(base + 1);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // 編輯整份 HTML with a page left out: the whole document is swapped, and the page's link still goes.
  await page.evaluate(() => window.HE.ops.replaceDocument(window.HE.doc.serialize().replace(/<section class="tpg-page" id="about"[\s\S]*?<\/section>/, ''), { label: '編輯整份 HTML' }));
  doc = await read(page);
  expect(doc.pages).toEqual(['home:首頁', 'contact:聯絡']);
  expect(doc.navs[0]).toEqual(['#home:首頁', '#contact:聯絡', ...OWN]);
  expect(await steps()).toBe(base + 1);
  await undo(page);
  expect(await serialize(page)).toBe(before);
  // A source edit that turns a page into an ordinary section keeps the link: it still leads somewhere.
  await page.evaluate(() => window.HE.ops.replaceDocument(window.HE.doc.serialize().replace('<section class="tpg-page" id="about"', '<section class="plain" id="about"'), { label: '編輯整份 HTML' }));
  expect((await read(page)).navs[0]).toEqual(['#home:首頁', '#about:關於', '#contact:聯絡', ...OWN]);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // Every page at once (the pane refuses the last one; the Delete key does not): the links go, the user's own stay.
  await page.evaluate(() => window.HE.sel.set(window.HE.pages.list().map((p) => p.id)));
  await page.keyboard.press('Delete');
  doc = await read(page);
  expect(doc.pages).toEqual([]);
  expect(doc.navs[0]).toEqual(OWN);
  expect(doc.css).toBe('');
  expect(await steps()).toBe(base + 1);
  await undo(page);
  expect(await serialize(page)).toBe(before);

  // The container itself, through the operation every other way of deleting uses.
  await page.evaluate(() => window.HE.ops.remove([window.HE.doc.idOf(window.HE.doc.body.querySelector('[data-tpg]'))]));
  expect((await read(page)).navs[0]).toEqual(OWN);
  await undo(page);
  expect(await serialize(page)).toBe(before);
  // A redo removes the page and its link again.
  await redo(page);
  expect((await read(page)).navs[0]).toEqual(OWN);
});

/** Pages in a PDF Chromium wrote: its page objects are not compressed. */
const pdfPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) || []).length;

test('print and 匯出 PDF put every page on paper, each on a new sheet, without the navigation bar; 匯出 PNG draws the page on show', async ({ page, context }) => {
  await openWithPages(page);
  const html = await serialize(page);
  expect(html).toContain('@media print { .tpg > .tpg-page { display: block; } .tpg > .tpg-page ~ .tpg-page { break-before: page; } [data-tpg-nav] { display: none !important; } }');

  const alone = await context.newPage();
  await alone.setContent(html);
  expect(await shownIn(alone)).toEqual(['home']);
  await expect(alone.locator('[data-tpg-nav]')).toBeVisible();
  await alone.emulateMedia({ media: 'print' });
  expect(await shownIn(alone)).toEqual(['home', 'about', 'contact']);
  await expect(alone.locator('[data-tpg-nav]')).toBeHidden();
  expect(await alone.locator('.tpg > .tpg-page').evaluateAll((els) => els.map((e) => getComputedStyle(e).breakBefore))).toEqual(['auto', 'page', 'page']);
  // A page the address names changes nothing on paper.
  await alone.evaluate(() => { location.hash = '#about'; });
  expect(await shownIn(alone)).toEqual(['home', 'about', 'contact']);
  // The screen is as before.
  await alone.emulateMedia({ media: 'screen' });
  expect(await shownIn(alone)).toEqual(['about']);
  await expect(alone.locator('[data-tpg-nav]')).toBeVisible();
  await alone.evaluate(() => { location.hash = ''; });
  await alone.emulateMedia({ media: null });
  expect(pdfPages(await alone.pdf())).toBe(3);
  await alone.close();

  // 匯出 PDF prints a clean copy: it carries the same rules and nothing of the edit frame, whichever page the canvas shows.
  await page.evaluate(() => window.HE.pages.go(window.HE.pages.list()[2].id));
  await page.evaluate(() => {
    window.__prints = [];
    window.HE.on('print:ready', ({ frame }) => {
      window.__prints.push('<!doctype html>' + frame.contentDocument.documentElement.outerHTML);
      frame.contentWindow.print = () => {};
    });
  });
  expect(await page.evaluate(() => window.HE.fileio.exportPDF({ skipHint: true }))).toBe(true);
  const printed = await page.evaluate(() => window.__prints[0]);
  expect(printed).not.toContain('__he_pages_css');
  const paper = await context.newPage();
  await paper.setContent(printed);
  expect(pdfPages(await paper.pdf({ preferCSSPageSize: true }))).toBe(3);
  await paper.close();

  // 匯出 PNG is a picture of one page: the one the canvas shows (聯絡 here), with its link marked. Nothing is downloaded.
  const drawn = await page.evaluate(async () => {
    let seen = null;
    const real = window.HE.snap.page;
    window.HE.snap.page = async (doc) => {
      seen = {
        shown: [...doc.querySelectorAll('.tpg > .tpg-page')].filter((e) => e.offsetHeight > 0).map((e) => e.id),
        bold: [...doc.querySelectorAll('[data-tpg-nav] a')].filter((a) => getComputedStyle(a).fontWeight === '700').map((a) => a.getAttribute('href')),
      };
      throw new Error('stop before the download');
    };
    try { await window.HE.fileio.exportPNG(); } finally { window.HE.snap.page = real; }
    return seen;
  });
  expect(drawn).toEqual({ shown: ['contact'], bold: ['#contact'] });
  expect(await serialize(page)).toBe(html);
});

test('a deck is still a deck, and a document with neither has no page CSS', async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/dist/tactile.html');
  await page.locator('#btn-new').click();
  await page.getByRole('menuitem', { name: '簡報：產品發表' }).click();
  await expect(page.frameLocator(frame).locator('.slide-title h1')).toHaveText('Kite 2');
  await page.locator('[data-tabs="left"] [data-tab="pages"]').click();
  await expect(rows(page)).toHaveCount(6);
  expect(await page.evaluate(() => window.HE.pages.mode())).toBe('deck');
  expect(await page.evaluate(() => window.HE.pages.list())).toEqual([]);
  await expect(page.locator('#pages-pane .pg-count')).toHaveText('6 張投影片');
  await expect(page.locator('#pages-pane .pg-row').first().getByRole('button', { name: '改名' })).toHaveCount(0);

  // An edit of a deck writes no page CSS and puts no editor style into the canvas.
  await page.locator('#pages-pane .pg-add').click();
  await expect(rows(page)).toHaveCount(7);
  expect(await serialize(page)).not.toContain('data-he-style="pages"');
  await expect(page.frameLocator(frame).locator('#__he_pages_css')).toHaveCount(0);
  expect(await page.evaluate(() => window.HE.history.undoStack.length)).toBe(1);
});
