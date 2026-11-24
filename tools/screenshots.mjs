#!/usr/bin/env node
// Takes the pictures the READMEs show, from the built editor in headless Chromium.
//
//   node tools/screenshots.mjs                  English interface, into docs/img (README.md)
//   node tools/screenshots.mjs --lang zh-TW     Traditional Chinese interface, into docs/img/zh-TW (README.zh-TW.md)
//   node tools/screenshots.mjs [--lang ...] [folder]
//
// Run it after a change to the interface, look at the pictures, and commit them with the change. The text in a
// picture is drawn with the fonts of the machine that runs this, so pictures from two machines differ slightly.
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const at = args.indexOf('--lang');
const lang = at < 0 ? 'en' : args.splice(at, 2)[1];
if (lang !== 'en' && lang !== 'zh-TW') { console.error('--lang takes en or zh-TW'); process.exit(1); }
const EN = lang === 'en';
const out = resolve(args[0] || (EN ? join(ROOT, 'docs', 'img') : join(ROOT, 'docs', 'img', 'zh-TW')));
const FRAME = 'iframe.cv-frame:not(.is-pending)';

const server = createServer(async (req, res) => {
  try {
    const file = resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Content-Type': extname(file) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream' }).end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = 'http://127.0.0.1:' + server.address().port + '/dist/tactile.html';
const browser = await chromium.launch();

/**
 * A fresh editor in the interface language. `from` is a built-in template ({ template: key }) or a file of
 * ingest/examples ({ example: name }); without it the editor shows the sample it starts with.
 */
async function editor(from = {}) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 820 }, locale: EN ? 'en-US' : 'zh-TW' });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForSelector(FRAME);
  if (from.template) {
    await page.evaluate((key) => window.HE.fileio.newDoc(key), from.template);
  } else if (from.example) {
    const html = await readFile(join(ROOT, 'ingest', 'examples', from.example), 'utf8');
    await page.evaluate((h) => window.HE.ops.replaceDocument(h), html);
  }
  await page.frameLocator(FRAME).locator('body *').first().waitFor();
  await page.evaluate(() => { window.HE.sel.clear(); document.querySelectorAll('.toast').forEach((el) => el.remove()); });
  return page;
}
async function shoot(page, name) {
  await page.waitForTimeout(400); // the selection box and the popover have settled
  await page.screenshot({ path: join(out, name) });
  console.log('wrote ' + join(out, name));
  await page.context().close();
}

try {
  await mkdir(out, { recursive: true });

  let page = await editor();
  await page.frameLocator(FRAME).locator('h1').first().click();
  await shoot(page, 'editor.png');

  page = await editor(EN ? { template: 'en-traceable' } : { example: 'zh-hant/report.html' });
  await page.locator('[data-tabs="right"] [data-tab="prov"]').click();
  await (EN ? page.frameLocator(FRAME).locator('[data-fact="2026Q3.xlsx/Summary/B2"]').first() : page.frameLocator(FRAME).locator('[data-fact]').nth(1)).click();
  await page.locator('.prov-pop').waitFor();
  await shoot(page, 'provenance.png');

  page = await editor(EN ? { template: 'en-traceable' } : { example: 'zh-hant/charts.html' });
  await page.frameLocator(FRAME).locator(EN ? '[data-chart-fact="2026Q3.xlsx/Income/D11"]' : '[data-chart-fact="2026Q3.xlsx/損益表/D11"]').first().click();
  await page.locator('.prov-pop').waitFor();
  await shoot(page, 'charts.png');

  if (EN) {
    // The assistant's panel, with one card selected for it to work on.
    page = await editor();
    await page.frameLocator(FRAME).locator('article').first().click({ position: { x: 200, y: 20 } });
    await page.locator('[data-tabs="right"] [data-tab="ai"]').click();
    await shoot(page, 'assistant.png');

    // Four of the built-in templates, as the editor opens them.
    for (const key of ['pitch', 'annual', 'dashboard', 'launch']) {
      page = await editor({ template: 'en-' + key });
      await shoot(page, 'template-' + key + '.png');
    }
  }
} finally {
  await browser.close();
  server.close();
}
