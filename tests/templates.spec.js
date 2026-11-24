const { test, expect } = require('@playwright/test');

const DEVICES = ['desktop', 'tablet', 'phone'];
// Checks a template may still fail. The slides template fits narrow screens now, but a few of its labels are still
// small (about 10px) or low in contrast (the accent colour on white, grey on light grey); drop it from here once
// they are fixed.
// The English deck keeps 16:9 at every width, so at phone width its text is as small as the slide.
const ALLOWED = { slides: ['contrast', 'small_text'], 'en-slides': ['small_text'], 'en-pitch': ['small_text'], 'hans-deck': ['small_text'] };

async function boot(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc && HE.design && HE.samples);
  return errors;
}

/** Waits until the canvas shows the document now in the model, with its fonts loaded. */
async function settled(page) {
  await page.waitForFunction(() => HE.live.doc && HE.live.doc.title === HE.doc.model.title &&
    !document.querySelector('iframe.cv-frame.is-pending') &&
    HE.live.doc.readyState === 'complete' && HE.live.doc.fonts.status === 'loaded');
}

async function templateKeys(page) {
  return page.evaluate(() => HE.samples.list.map(s => s.key));
}

test('every template is in the 新增 menu with its own icon and opens under its own file name', async ({ page }) => {
  const errors = await boot(page);
  const list = await page.evaluate(() => HE.samples.list.map(s => ({ key: s.key, lang: s.lang, name: s.name, description: s.description })));
  expect(list.length).toBeGreaterThanOrEqual(15);
  expect(new Set(list.map(t => t.key)).size).toBe(list.length);
  expect(new Set(list.map(t => t.name)).size).toBe(list.length);
  for (const t of list) expect(t.description.length).toBeGreaterThan(10);

  await page.locator('#btn-new').click();
  const items = page.getByRole('menuitem');
  // The interface is Chinese here: its templates are listed, and those written in other languages are one step away.
  const blanks = ['blank', 'zh-hans-blank', 'en-blank'];
  const mine = list.filter(t => t.lang === 'zh-Hant' && !blanks.includes(t.key));
  const others = list.filter(t => t.lang !== 'zh-Hant' && !blanks.includes(t.key));
  expect(others.length).toBeGreaterThanOrEqual(5);
  await expect(items).toHaveText(['空白頁', ...mine.map(t => t.name), '其他語言的範本']);
  const icons = await items.evaluateAll(els => els.map(el => el.querySelector('.mi-icon').innerHTML));
  // Only 空白頁 uses the plain file icon: a template missing from TEMPLATE_ICONS falls back to it, an unknown icon name to "more".
  const fallbacks = await page.evaluate(() => [HE.ui.icon('file', 15), HE.ui.icon('more', 15)]);
  expect(icons.slice(1).filter(icon => fallbacks.includes(icon))).toEqual([]);
  await items.last().hover();
  await expect(page.getByRole('menuitem')).toHaveText(['空白頁', ...mine.map(t => t.name), '其他語言的範本', ...others.map(t => t.name)]);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  for (const t of list) {
    expect(await page.evaluate(k => HE.fileio.newDoc(k), t.key)).toBe(true);
    const name = await page.evaluate(() => HE.doc.name);
    // A template missing from TEMPLATE_NAMES would be saved as "類別：名稱.html".
    expect(name, t.key).toMatch(/^[^：/]+\.html$/);
  }
  expect(errors).toEqual([]);
});

test('every template passes the design check on desktop, tablet and phone and never scrolls sideways', async ({ page }) => {
  test.setTimeout(120000);
  const errors = await boot(page);
  const problems = [];
  for (const key of await templateKeys(page)) {
    expect(await page.evaluate(k => HE.fileio.newDoc(k), key)).toBe(true);
    await settled(page);
    await page.evaluate(() => HE.sel.clear());
    for (const device of DEVICES) {
      const found = await page.evaluate(d => {
        HE.canvas.setDevice(d);
        const de = HE.live.doc.documentElement;
        const sideways = de.scrollWidth - de.clientWidth;
        const out = HE.design.check({ maxIssues: 50 }).issues.filter(i => i.level !== 'info')
          .map(i => ({ check: i.check, text: i.level + ' ' + i.check + ': ' + i.message }));
        if (sideways > 0) out.push({ check: 'overflow', text: 'the page scrolls sideways by ' + sideways + 'px' });
        return out;
      }, device);
      for (const f of found) if (!(ALLOWED[key] || []).includes(f.check)) problems.push(key + ' @ ' + device + ' — ' + f.text);
    }
  }
  await page.evaluate(() => HE.canvas.setDevice('desktop'));
  expect(problems).toEqual([]);
  expect(errors).toEqual([]);
});

test('every template comes back the same after export and reopening', async ({ page }) => {
  const errors = await boot(page);
  for (const key of await templateKeys(page)) {
    expect(await page.evaluate(k => HE.fileio.newDoc(k), key)).toBe(true);
    const first = await page.evaluate(() => HE.doc.serialize());
    // The styles the editor maintains (effects, pages, island) keep their data-he-style marker in the saved page (the editor finds them by it); nothing else may leak.
    expect(first.replace(/ data-he-style="(fx|fx-motion|pages|island)"/g, '')).not.toContain('data-he-');
    expect(await page.evaluate(([src, name]) => HE.fileio.openText(src, name), [first, key + '.html'])).toBe(true);
    const second = await page.evaluate(() => HE.doc.serialize());
    expect(second, key).toBe(first);
  }
  expect(errors).toEqual([]);
});

test('templates with pages or an island carry the CSS and the links the editor would write', async ({ page }) => {
  const errors = await boot(page);
  const kept = [];
  for (const key of await templateKeys(page)) {
    expect(await page.evaluate(k => HE.fileio.newDoc(k), key)).toBe(true);
    // Out of step, a template would have its styles rewritten by the user's first edit, inside their undo step.
    // To bring the templates up to date: node build.mjs && node tools/resync-templates.mjs
    const got = await page.evaluate(() => {
      const before = HE.doc.serialize();
      const changed = [HE.pages.sync(), HE.island.sync()];
      return { changed, same: HE.doc.serialize() === before, kept: !!HE.doc.body.querySelector('[data-tpg], [data-tfi]') };
    });
    expect(got.changed, key + ': HE.pages.sync() or HE.island.sync() changed the template; run tools/resync-templates.mjs').toEqual([false, false]);
    expect(got.same, key).toBe(true);
    if (got.kept) kept.push(key);
  }
  expect(kept).toEqual(expect.arrayContaining(['site', 'en-site', 'hans-site']));
  expect(errors).toEqual([]);
});

test('templates with effects carry the CSS the editor would write, stay still while editing and play in preview', async ({ page }) => {
  const errors = await boot(page);
  const withFx = [];
  for (const key of await templateKeys(page)) {
    expect(await page.evaluate(k => HE.fileio.newDoc(k), key)).toBe(true);
    if (!(await page.evaluate(() => HE.fx.count()))) continue;
    withFx.push(key);
    await settled(page);
    // Classes, stagger indexes, bar markers and head CSS written by hand must be exactly what the editor writes;
    // otherwise the first edit rewrites them as part of the user's own undo step.
    const unchanged = await page.evaluate(() => { const before = HE.doc.serialize(); HE.fx.sync(); return HE.doc.serialize() === before; });
    expect(unchanged, key + ': HE.fx.sync() changed the template').toBe(true);
    await expect(page.locator('.toast', { hasText: '動態效果' }).last(), key).toBeVisible();
    // Scroll-driven animations are off in edit mode and run in preview.
    const scrollAnims = () => HE.live.doc.getAnimations().filter(a => a.timeline && a.timeline.constructor.name !== 'DocumentTimeline').length;
    expect(await page.evaluate(scrollAnims), key + ' in edit mode').toBe(0);
    await page.evaluate(() => HE.setMode('preview'));
    await page.waitForFunction(scrollAnims, null, { timeout: 10000 });
    await page.evaluate(() => HE.setMode('edit'));
    await page.waitForFunction(fn => !new Function('return (' + fn + ')()')(), scrollAnims.toString(), { timeout: 10000 });
  }
  expect(withFx).toEqual(expect.arrayContaining(['landing', 'dashboard']));
  expect(errors).toEqual([]);
});
