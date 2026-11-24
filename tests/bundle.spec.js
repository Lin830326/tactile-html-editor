const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const folder = path.join(__dirname, 'fixtures', 'bundle');
const FILES = ['report.html', 'css/site.css', 'css/extra.css', 'img/photo.png', 'img/photo@2x.png', 'img/bg.png',
  'img/icon.svg', 'img/evil.svg', 'fonts/demo.woff2'];

/** noPicker: take showDirectoryPicker away, so the folder comes from the <input webkitdirectory> other browsers use. */
async function boot(page, { noPicker = true } = {}) {
  if (noPicker) await page.addInitScript(() => { delete window.showDirectoryPicker; });
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc);
  await expect(page.locator(canvasSelector)).toBeVisible();
}

async function openReport(page) {
  const html = await readFile(path.join(folder, 'report.html'), 'utf8');
  expect(await page.evaluate(source => HE.fileio.openText(source, 'report.html'), html)).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator('#title')).toHaveText('打包測試報告');
}

/** What a page shows of the fixture, read the same way in the canvas and in the exported file. */
function look(doc) {
  const win = doc.defaultView;
  const css = (sel, prop) => win.getComputedStyle(doc.querySelector(sel)).getPropertyValue(prop);
  const photo = doc.querySelector('#photo');
  return {
    photo: photo.naturalWidth + 'x' + photo.naturalHeight,
    photoSrc: photo.getAttribute('src').slice(0, 22),
    heading: css('#title', 'color'),
    imported: css('#attr', 'color'),
    band: css('#band', 'background-image').slice(0, 27),
    inline: css('#inline', 'background-image').slice(0, 27),
    attr: css('#attr', 'background-image').slice(0, 27),
    links: doc.querySelectorAll('link[rel="stylesheet"]').length,
  };
}

const EMBEDDED_LOOK = {
  photo: '48x32',
  photoSrc: 'data:image/png;base64,',
  heading: 'rgb(154, 52, 18)',
  imported: 'rgb(29, 78, 216)',
  band: 'url("data:image/png;base64,',
  inline: 'url("data:image/png;base64,',
  attr: 'url("data:image/png;base64,',
  links: 0,
};

async function canvasLook(page) {
  const frame = await (await page.locator(canvasSelector).elementHandle()).contentFrame();
  return frame.evaluate(look, await frame.evaluateHandle(() => document));
}

test('the notice after opening offers to embed, and the embedded page stands alone', async ({ page, browser }) => {
  await boot(page);
  await openReport(page);
  const before = await page.evaluate(() => HE.doc.serialize());
  expect(before).toContain('href="css/site.css"');

  // Before: the styles and the picture are not there.
  const start = await canvasLook(page);
  expect(start.photo).toBe('0x0');
  expect(start.heading).not.toBe(EMBEDDED_LOOK.heading);

  const toastAction = page.getByRole('button', { name: '選資料夾並嵌入', exact: true });
  await expect(toastAction).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await toastAction.click();
  await (await chooser).setFiles(folder);

  // Before anything changes: how many files and how big.
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('會把 7 個檔案嵌入這份文件，合計');
  await expect(confirm).toContainText('嵌入後 HTML 檔大約增加');
  await expect(confirm).toContainText('img/missing.png：在選取的資料夾裡找不到');
  await expect(confirm).toContainText('app.js：外部腳本不嵌入，維持原樣');
  await expect(confirm).toContainText('img/evil.svg：SVG 含有腳本，沒有嵌入');
  expect(await page.evaluate(() => HE.doc.serialize())).toBe(before);
  await confirm.getByRole('button', { name: '嵌入 7 個檔案', exact: true }).click();

  // The result names what was left out, each with its reason.
  const result = page.getByRole('dialog');
  await expect(result).toContainText('已嵌入 7 個檔案');
  await expect(result).toContainText('略過 4 個');
  await expect(result).toContainText('img/missing.png：在選取的資料夾裡找不到');
  await expect(result).toContainText('img/evil.svg：SVG 含有腳本，沒有嵌入');
  await expect(result).toContainText('../img/nope.png：在選取的資料夾裡找不到');
  await expect(result).toContainText('app.js：外部腳本不嵌入，維持原樣');
  await page.locator('.modal-foot').getByRole('button', { name: '關閉', exact: true }).click();

  await expect.poll(() => canvasLook(page)).toEqual(EMBEDDED_LOOK);

  const html = await page.evaluate(() => HE.doc.serialize());
  expect(html).not.toContain('css/site.css');
  expect(html).toContain('<style media="screen">');
  expect(html).not.toContain('@charset');
  expect(html).toContain('url(not/a/real.png)'); // a comment in the sheet is left alone
  expect(html).toContain('data:font/woff2;base64,');
  expect(html).toContain('<link rel="icon" href="data:image/svg+xml;base64,');
  expect(html).toMatch(/srcset="data:image\/png;base64,[^" ]+ 1x, data:image\/png;base64,[^" ]+ 2x"/);
  expect(html).toMatch(/poster="data:image\/png;base64,/);
  // What could not be embedded keeps its path; the outside script is untouched.
  expect(html).toContain('src="img/missing.png"');
  expect(html).toContain('src="img/evil.svg"');
  expect(html).toContain('url(../img/nope.png)');
  expect(html).toContain('<script src="app.js"></script>');

  // The exported file on its own, with every request refused: it shows the same.
  const alone = await browser.newContext({ javaScriptEnabled: false });
  const requests = [];
  await alone.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
  const solo = await alone.newPage();
  await solo.setContent(html);
  // With scripts off in that context, read the page through CDP-free means: computed styles via locators.
  await expect(solo.locator('#title')).toHaveCSS('color', EMBEDDED_LOOK.heading);
  await expect(solo.locator('#attr')).toHaveCSS('color', EMBEDDED_LOOK.imported);
  await expect(solo.locator('#band')).toHaveCSS('background-image', /^url\("data:image\/png;base64,/);
  // Not toHaveJSProperty: with scripts off, Playwright's Firefox reads no property that way.
  await expect.poll(() => solo.locator('#photo').evaluate((el) => el.naturalWidth)).toBe(48);
  expect(requests.filter(u => /photo|bg\.png|site\.css|extra\.css|woff2|icon\.svg/.test(u))).toEqual([]);
  await alone.close();

  // One undo step takes the whole embedding back; redo brings it again.
  expect(await page.evaluate(() => HE.history.undoStack.length)).toBe(1);
  await page.locator('#btn-undo').click();
  expect(await page.evaluate(() => HE.doc.serialize())).toBe(before);
  await expect.poll(async () => (await canvasLook(page)).photo).toBe('0x0');
  await page.locator('#btn-redo').click();
  expect(await page.evaluate(() => HE.doc.serialize())).toBe(html);
  await expect.poll(() => canvasLook(page)).toEqual(EMBEDDED_LOOK);
});

test('a directory handle works, also when the folder above the page is chosen', async ({ page }) => {
  await boot(page, { noPicker: false });
  await openReport(page);
  // A real FileSystemDirectoryHandle from the origin private file system stands in for the picker's.
  await page.evaluate(async (files) => {
    const root = await navigator.storage.getDirectory();
    const top = await root.getDirectoryHandle('bundle-test-' + Date.now(), { create: true });
    for (const rel of files) {
      let dir = await top.getDirectoryHandle('site', { create: true });
      const parts = rel.split('/');
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
      const w = await (await dir.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(await (await fetch('/tests/fixtures/bundle/' + rel)).arrayBuffer());
      await w.close();
    }
    // A file of the same name higher up must not win over the one beside the page.
    const decoy = await (await top.getFileHandle('extra.css', { create: true })).createWritable();
    await decoy.write('p { color: rgb(1, 2, 3); }');
    await decoy.close();
    window.__pickerCalls = [];
    window.showDirectoryPicker = async (opts) => { window.__pickerCalls.push(opts); return top; };
  }, FILES);

  await page.getByRole('button', { name: /更多(?:儲存|匯出)方式/ }).click();
  await page.getByRole('menuitem', { name: '把圖片與樣式嵌入文件…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '嵌入 7 個檔案', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('已嵌入 7 個檔案');
  await page.locator('.modal-foot').getByRole('button', { name: '關閉', exact: true }).click();
  expect(await page.evaluate(() => window.__pickerCalls)).toEqual([{ id: 'tactile-assets', mode: 'read' }]);
  await expect.poll(() => canvasLook(page)).toEqual(EMBEDDED_LOOK);
});

test('a style sheet cannot bring script in, and a missing folder changes nothing', async ({ page }) => {
  await boot(page);
  const source = '<!doctype html><html><head><meta charset="utf-8"><title>t</title>' +
    '<link rel="stylesheet" href="a.css"></head><body><h1 id="t">標題</h1><img id="p" src="pic.png" alt=""></body></html>';
  expect(await page.evaluate(html => HE.fileio.openText(html, 'page.html'), source)).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator('#t')).toHaveText('標題');

  // Nothing in the chosen files matches: a dialog says so, and there is no undo step.
  const none = page.evaluate(() => HE.fileio.bundleAssets({ files: [{ path: 'other.txt', file: new File(['x'], 'other.txt') }] }));
  await expect(page.getByRole('dialog')).toContainText('找不到這個頁面引用的檔案，文件沒有改變');
  await expect(page.getByRole('dialog')).toContainText('a.css：在選取的資料夾裡找不到');
  await page.locator('.modal-foot').getByRole('button', { name: '關閉', exact: true }).click();
  expect(await none).toBe(null);
  expect(await page.evaluate(() => HE.history.canUndo())).toBe(false);

  // A sheet that tries to close its <style> and open a <script>.
  const result = await page.evaluate(() => {
    const css = 'h1 { color: rgb(1, 100, 50); }\n</style><script>window.parent.__pwned = 1;</script><style>';
    return HE.fileio.bundleAssets({ files: [{ path: 'a.css', file: new File([css], 'a.css') }] }, { confirm: false });
  });
  expect(result.embedded).toEqual(['a.css']);
  expect(result.skipped).toEqual([{ ref: 'pic.png', why: '在選取的資料夾裡找不到' }]);
  await page.locator('.modal-foot').getByRole('button', { name: '關閉', exact: true }).click();
  await expect(page.frameLocator(canvasSelector).locator('#t')).toHaveCSS('color', 'rgb(1, 100, 50)');
  expect(await page.evaluate(() => ({
    scripts: HE.doc.model.querySelectorAll('script').length,
    liveScripts: HE.live.doc.querySelectorAll('script').length,
    styles: HE.doc.model.querySelectorAll('style').length,
    hasScript: HE.util.hasScript(HE.doc.model),
    pwned: window.__pwned || 0,
  }))).toEqual({ scripts: 0, liveScripts: 0, styles: 1, hasScript: false, pwned: 0 });
  // The same text read again from the export is still one <style> and no script.
  const again = await page.evaluate(() => {
    const d = new DOMParser().parseFromString(HE.doc.serialize(), 'text/html');
    return { scripts: d.querySelectorAll('script').length, styles: d.querySelectorAll('style').length };
  });
  expect(again).toEqual({ scripts: 0, styles: 1 });
});

test('a dropped folder is read through its entries', async ({ page }) => {
  await boot(page);
  await openReport(page);
  // No test can drop a real folder: entries with the shape of webkitGetAsEntry's stand in for one.
  await page.evaluate(async (files) => {
    const tree = { name: 'bundle', isDirectory: true, isFile: false, kids: [] };
    for (const rel of files) {
      const blob = await (await fetch('/tests/fixtures/bundle/' + rel)).blob();
      let dir = tree;
      const parts = rel.split('/');
      for (const p of parts.slice(0, -1)) {
        let next = dir.kids.find(k => k.name === p);
        if (!next) { next = { name: p, isDirectory: true, isFile: false, kids: [] }; dir.kids.push(next); }
        dir = next;
      }
      const name = parts[parts.length - 1];
      dir.kids.push({ name, isDirectory: false, isFile: true, file: (ok) => ok(new File([blob], name)) });
    }
    const reader = (dir) => {
      let sent = false;
      // Like the real one: the listing in one batch, then an empty batch.
      return { readEntries: (ok) => { const out = sent ? [] : dir.kids; sent = true; setTimeout(() => ok(out), 0); } };
    };
    const wire = (dir) => { dir.createReader = () => reader(dir); dir.kids.filter(k => k.isDirectory).forEach(wire); };
    wire(tree);
    const e = new Event('drop', { bubbles: true, cancelable: true });
    e.dataTransfer = {
      types: ['Files'],
      files: [new File([], 'bundle')],
      items: [{ kind: 'file', type: '', webkitGetAsEntry: () => tree }],
    };
    window.dispatchEvent(e);
  }, FILES);
  await page.getByRole('dialog').getByRole('button', { name: '嵌入 7 個檔案', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('已嵌入 7 個檔案');
  await page.locator('.modal-foot').getByRole('button', { name: '關閉', exact: true }).click();
  await expect.poll(() => canvasLook(page)).toEqual(EMBEDDED_LOOK);
});
