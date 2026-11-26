const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const zlib = require('node:zlib');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';
const PNG_SIGNATURE = '89504e470d0a1a0a';

// Three boards of one size (16:9), as a deck is found by its layout. The second has a chart in SVG and a line
// break; the third has text of several styles in one block.
const deckHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Deck</title>
<style>body{margin:0;background:#dfe3ea;font-family:Arial,sans-serif}
.s{width:960px;height:540px;margin:24px auto;background:#10203a;color:#fff;position:relative;overflow:hidden}
.s.light{background:#fff;color:#10203a}
h1{position:absolute;left:60px;top:80px;margin:0;font-size:48px;line-height:56px;font-weight:700}
p{position:absolute;left:60px;top:240px;width:400px;margin:0;font-size:20px;line-height:30px}
.tag{position:absolute;left:60px;top:40px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#5eead4}
svg{position:absolute;right:60px;top:120px}</style></head><body>
<section class="s" id="s1"><div class="tag">Board meeting</div><h1 id="t1">Quarterly update</h1><p id="p1">Revenue grew 18% and the plan for next quarter is on the following slides.</p></section>
<section class="s light" id="s2"><h1 id="t2">Numbers</h1><p id="p2">First line<br>Second line</p>
<svg width="300" height="200" id="chart"><rect x="20" y="60" width="60" height="140" fill="#2149c8"/><text x="20" y="40" id="svgtext">Chart label</text></svg></section>
<section class="s" id="s3"><h1 id="t3">Thanks &amp; <em>questions</em></h1><p id="p3">Write to <b id="bold">team@example.com</b> &lt;any time&gt;.</p></section>
<script>window.parent.__ran = (window.parent.__ran || 0) + 1;</script></body></html>`;

const pageHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Report</title></head><body>
<h1>One long page</h1><p id="end">It has no slides.</p></body></html>`;

// A rule that counts children: an element put before <b> would take the margin from it, and the text would move.
const fragileHtml = deckHtml.replace('</style>', '#p3 > :first-child{display:inline-block;margin-left:80px}</style>');

async function boot(page, init) {
  if (init) await page.addInitScript(init);
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc && HE.snap && HE.pptx);
  await expect(page.locator(canvasSelector)).toBeVisible();
}

async function open(page, html, name, last) {
  expect(await page.evaluate(([source, file]) => HE.fileio.openText(source, file), [html, name])).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator(last)).toBeVisible();
  await page.evaluate(() => { HE.canvas.setDevice('desktop'); HE.sel.clear(); });
}

/** The files of a zip: name -> Buffer. Reads the central directory; entries are stored or deflated. */
function unzip(buf) {
  const out = new Map();
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(end).toBeGreaterThan(0);
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(at)).toBe(0x02014b50);
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.subarray(at + 46, at + 46 + nameLen).toString('utf8');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    out.set(name, method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data));
    at += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function exportDeck(page) {
  await page.locator('#btn-export-menu').click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: '匯出 PPTX 簡報' }).click();
  const download = await downloaded;
  return { name: download.suggestedFilename(), files: unzip(await readFile(await download.path())) };
}

/** The text boxes of a slide: [{text, x, y, cx, cy, sz, wrap}], lengths in CSS px. */
function textBoxes(xml) {
  return [...xml.matchAll(/<p:sp>.*?<\/p:sp>/g)].map(([sp]) => {
    const num = (re) => Number((sp.match(re) || [])[1]);
    return {
      text: [...sp.matchAll(/<a:t>(.*?)<\/a:t>|<\/a:p><a:p>/g)].map((m) => (m[1] === undefined ? '\n' : m[1])).join(''),
      x: num(/<a:off x="(\d+)"/) / 9525, y: num(/<a:off x="\d+" y="(\d+)"/) / 9525,
      cx: num(/<a:ext cx="(\d+)"/) / 9525, cy: num(/<a:ext cx="\d+" cy="(\d+)"/) / 9525,
      sz: num(/ sz="(\d+)"/), wrap: (sp.match(/wrap="(\w+)"/) || [])[1], xml: sp,
    };
  });
}

test('PPTX: a deck downloads as a file with one slide for each board and its text in text boxes', async ({ page }) => {
  await boot(page);
  await open(page, deckHtml, 'deck.html', '#p3');
  const before = await page.evaluate(() => HE.doc.serialize());

  const { name, files } = await exportDeck(page);
  expect(name).toBe('deck.pptx');
  await expect(page.locator('#status-msg')).toContainText('已匯出 deck.pptx（3 張投影片）');
  await expect(page.locator('.toast.success', { hasText: '已匯出 deck.pptx' })).toBeVisible();
  await expect(page.locator('.toast', { hasText: '數字的出處沒有帶進 PPTX' })).toBeVisible();
  await expect(page.locator('.fio-copy-frame')).toHaveCount(0);
  // The copy the slides were drawn from ran no script, and the document was not changed.
  expect(await page.evaluate(() => window.__ran || 0)).toBe(0);
  expect(await page.evaluate(() => HE.doc.serialize())).toBe(before);
  expect(before).not.toContain('he-pptx-text');

  // The parts PowerPoint needs, and no part of the library that wrote the zip.
  const names = [...files.keys()];
  expect(names).toContain('[Content_Types].xml');
  for (const part of ['_rels/.rels', 'ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels', 'ppt/theme/theme1.xml',
    'ppt/slideMasters/slideMaster1.xml', 'ppt/slideLayouts/slideLayout1.xml', 'ppt/slides/slide1.xml', 'ppt/slides/slide2.xml',
    'ppt/slides/slide3.xml', 'ppt/slides/_rels/slide3.xml.rels', 'ppt/media/image1.png', 'ppt/media/image3.png']) {
    expect(names, part).toContain(part);
  }
  expect(names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(3);
  expect(names.some((n) => /Sh33tJ5/.test(n))).toBe(false);
  for (const [n, data] of files) if (/\.(xml|rels)$/.test(n)) expect(data.toString('utf8').startsWith('<?xml version="1.0" encoding="UTF-8"'), n).toBe(true);

  // The slide is as large as the board: 960 x 540 CSS px, 9525 EMU each.
  const pres = files.get('ppt/presentation.xml').toString('utf8');
  expect(pres).toContain('<p:sldSz cx="9144000" cy="5143500"/>');
  expect((pres.match(/<p:sldId /g) || []).length).toBe(3);

  // The picture of a board: two device pixels for each CSS pixel.
  const png = files.get('ppt/media/image1.png');
  expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
  expect({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) }).toEqual({ w: 1920, h: 1080 });

  // Slide 1: three blocks of text, where they are on the board.
  const one = textBoxes(files.get('ppt/slides/slide1.xml').toString('utf8'));
  expect(one.map((b) => b.text)).toEqual(['BOARD MEETING', 'Quarterly update', 'Revenue grew 18% and the plan for next quarter is on the following slides.']);
  const title = one[1];
  expect(title.sz).toBe(3600); // 48 px = 36 pt
  expect(title.wrap).toBe('none');
  expect(Math.abs(title.x - 60)).toBeLessThan(2);
  expect(Math.abs(title.y - 80)).toBeLessThan(2);
  expect(Math.abs(title.cy - 56)).toBeLessThan(1);
  expect(title.xml).toContain('<a:srgbClr val="FFFFFF">');
  expect(title.xml).toContain(' b="1"');
  expect(title.xml).toContain('<a:spcPts val="4200"/>'); // line-height 56 px = 42 pt
  expect(one[0].xml).toContain('<a:srgbClr val="5EEAD4">');
  expect(one[0].xml).toContain(' spc="150"'); // letter-spacing 2 px
  const para = one[2];
  expect(para.wrap).toBe('square');
  expect(Math.abs(para.cx - 402)).toBeLessThan(1);
  expect(para.cy).toBeGreaterThan(59); // two lines or more of 30 px

  // Slide 2: a <br> is a new paragraph, and the text of the SVG stays in the picture.
  const twoXml = files.get('ppt/slides/slide2.xml').toString('utf8');
  const two = textBoxes(twoXml);
  expect(two.map((b) => b.text)).toEqual(['Numbers', 'First line\nSecond line']);
  expect(twoXml).not.toContain('Chart label');
  expect(two[0].xml).toContain('<a:srgbClr val="10203A">');

  // Slide 3: one block, runs of their own styles, and the marks of XML written as text.
  const threeXml = files.get('ppt/slides/slide3.xml').toString('utf8');
  const three = textBoxes(threeXml);
  expect(three.map((b) => b.text)).toEqual(['Thanks &amp; questions', 'Write to team@example.com &lt;any time&gt;.']);
  expect(three[0].xml).toMatch(/ i="1"[^>]*>(?:(?!<a:t>).)*<a:t>questions<\/a:t>/);
  expect(three[1].xml).toMatch(/ b="1"[^>]*>(?:(?!<a:t>).)*<a:t>team@example\.com<\/a:t>/);
  expect(three[1].xml).toMatch(/ b="0"[^>]*>(?:(?!<a:t>).)*<a:t>Write to <\/a:t>/);
});

test('PPTX: the picture of a slide holds its shapes and none of the text that became text boxes', async ({ page }) => {
  await boot(page);
  await open(page, deckHtml, 'deck.html', '#p3');
  const { files } = await exportDeck(page);
  const png = 'data:image/png;base64,' + files.get('ppt/media/image2.png').toString('base64');
  const seen = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    // Pixels that are not the board's white, in an area given in CSS px (the picture has two pixels for each).
    const ink = (x, y, w, h) => {
      const d = g.getImageData(x * 2, y * 2, w * 2, h * 2).data;
      let n = 0;
      for (let k = 0; k < d.length; k += 4) if (d[k] < 200 || d[k + 1] < 200 || d[k + 2] < 200) n++;
      return n;
    };
    return { title: ink(60, 80, 400, 56), para: ink(60, 240, 400, 60), bar: ink(620, 180, 60, 140), label: ink(620, 140, 120, 24) };
  }, png);
  expect(seen.title).toBe(0);
  expect(seen.para).toBe(0);
  expect(seen.bar).toBeGreaterThan(20000); // the bar of the chart
  expect(seen.label).toBeGreaterThan(50); // the SVG's own text
});

test('PPTX: a board whose layout moves when its text is wrapped stays a picture with its text', async ({ page }) => {
  await boot(page);
  await open(page, fragileHtml, 'fragile.html', '#p3');
  const { files } = await exportDeck(page);
  await expect(page.locator('.toast', { hasText: '有 1 張投影片的文字無法分開，整張保留為圖片。' })).toBeVisible();
  expect(textBoxes(files.get('ppt/slides/slide1.xml').toString('utf8'))).toHaveLength(3);
  expect(textBoxes(files.get('ppt/slides/slide3.xml').toString('utf8'))).toHaveLength(0);
  expect(files.get('ppt/slides/slide3.xml').toString('utf8')).toContain('<p:pic>');
});

// A row that puts its own text at one end and a child at the other, and a heading in Chinese with a heavy weight.
const rowsHtml = `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><title>Rows</title>
<style>body{margin:0;font-family:"Segoe UI",Arial,sans-serif}
.s{width:960px;height:540px;margin:24px auto;background:#fff;color:#111;position:relative}
.row{position:absolute;left:60px;top:60px;width:600px;display:flex;justify-content:space-between;font-size:24px;line-height:32px}
h1{position:absolute;left:60px;top:200px;margin:0;font-size:40px;line-height:48px;font-weight:900}</style></head><body>
<section class="s"><div class="row" id="row">Kite<span id="year">2024</span></div><h1 id="h">Kite 2 更亮</h1></section>
<section class="s"><h1 id="last">結尾</h1></section></body></html>`;

test('PPTX: a child with a place of its own is a text box of its own, and heavy Chinese text is bold', async ({ page }) => {
  await boot(page);
  await open(page, rowsHtml, 'rows.html', '#last');
  const { files } = await exportDeck(page);
  const boxes = textBoxes(files.get('ppt/slides/slide1.xml').toString('utf8'));
  expect(boxes.map((b) => b.text)).toEqual(['Kite', '2024', 'Kite 2 更亮']); // one run, or one for each script
  // The row is 600 px wide from x = 60: its text is at the start, the year at the end.
  expect(Math.abs(boxes[0].x - 60)).toBeLessThan(2);
  expect(boxes[1].x).toBeGreaterThan(560);
  expect(Math.abs(boxes[1].x + boxes[1].cx - 660)).toBeLessThan(2);
  // Whatever face the Latin text gets on this machine, the Chinese text has the bold switch on.
  expect(boxes[2].xml).toMatch(/ b="1"[^>]*>(?:(?!<a:t>).)*<a:t>[^<]*更亮<\/a:t>/);
  expect(boxes[2].xml).toContain('lang="zh-TW"');
});

test('PPTX: a document that is not a deck is not exported, and says why', async ({ page }) => {
  await boot(page);
  await open(page, pageHtml, 'report.html', '#end');
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '匯出 PPTX 簡報' }).click();
  await expect(page.locator('.toast', { hasText: '這份文件不是簡報：找不到大小相同的投影片' })).toBeVisible();
  await expect(page.locator('.fio-copy-frame')).toHaveCount(0);
  expect(await page.evaluate(() => HE.fileio.exportPPTX())).toBe(false); // and the export is free to run again
  expect(downloads).toBe(0);
});

test('PPTX: in a claude.ai Artifact the file goes to the downloads capability', async ({ page }) => {
  await boot(page, () => {
    window.__saves = [];
    const downloads = { save: async ({ filename, data }) => { window.__saves.push({ filename, type: data.type, size: data.size, blob: data instanceof Blob }); return { status: 'saved' }; } };
    window.claude = { use: async name => (name === 'downloads' ? downloads : null) };
  });
  await open(page, deckHtml, 'deck.html', '#p3');
  await page.locator('#btn-export-menu').click();
  await page.getByRole('menuitem', { name: '匯出 PPTX 簡報' }).click();
  await page.waitForFunction(() => window.__saves.length === 1);
  const save = await page.evaluate(() => window.__saves[0]);
  expect(save.filename).toBe('deck.pptx');
  expect(save.blob).toBe(true);
  expect(save.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
  expect(save.size).toBeGreaterThan(5000);
});

// A template is a deck where its boards keep one shape. With the fonts of another machine a line can wrap once more
// and a board can grow past 16:9 (the boards of en-pitch have aspect-ratio, which gives way to taller content): the
// editor then does not take the document for a deck, here as in the PDF export. So a template that is not a deck on
// this machine must be so for that reason, and most templates must be decks.
test('PPTX: the deck templates export, with text boxes on their slides', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  const decks = await page.evaluate(() => HE.samples.list.filter((s) => /pitch|slides/.test(s.key)).map((s) => s.key));
  expect(decks.length).toBeGreaterThanOrEqual(2);
  let found = 0;
  for (const key of decks) {
    const out = await page.evaluate(async (k) => {
      const s = HE.samples.list.find((x) => x.key === k);
      await HE.fileio.openText(s.html, k + '.html');
      // The same steps as the export, without the download: what is measured and what the file holds.
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-same-origin');
      f.style.cssText = 'position:fixed;left:-99999px;top:0;width:1280px;height:720px;border:0';
      await new Promise((resolve) => { f.addEventListener('load', resolve); f.srcdoc = HE.doc.serialize(); document.body.append(f); });
      const deck = HE.pages.findDeck(f.contentDocument);
      const shapes = deck ? [] : Array.from(f.contentDocument.querySelectorAll('.slide, body > * > section, body > section')).map((b) => [b.offsetWidth, Math.round(b.offsetWidth / b.offsetHeight * 100) / 100]);
      const measured = deck ? deck.boards.map((b) => HE.pptx.measure(b)) : [];
      const plain = measured.filter((m) => !HE.pptx.hide(m)).length;
      const left = f.contentDocument.body.innerText.replace(/\s+/g, '');
      f.remove();
      return { boards: measured.length, boxes: measured.reduce((n, m) => n + m.blocks.length, 0), plain, left: left.length, shapes };
    }, key);
    if (!out.boards) {
      // Not a deck here: boards of one width, and at least one of another shape than the first.
      expect(out.shapes.length, key + ' ' + JSON.stringify(out.shapes)).toBeGreaterThanOrEqual(3);
      expect(new Set(out.shapes.map((s) => s[0])).size, key + ' ' + JSON.stringify(out.shapes)).toBe(1);
      expect(out.shapes.some((s) => Math.abs(s[1] / out.shapes[0][1] - 1) >= 0.03), key + ' ' + JSON.stringify(out.shapes)).toBe(true);
      test.info().annotations.push({ type: 'not a deck on this machine', description: key + ' ' + JSON.stringify(out.shapes) });
      continue;
    }
    found++;
    expect(out.boards, key).toBeGreaterThanOrEqual(3);
    expect(out.boxes, key).toBeGreaterThan(out.boards * 2);
    expect(out.plain, key).toBe(0);
  }
  expect(found).toBeGreaterThanOrEqual(2);
});
