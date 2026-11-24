const { test, expect } = require('@playwright/test');

// WebKit runs no listener in a frame sandboxed without allow-scripts, so there the canvas is a frame with
// allow-scripts and a policy that refuses every script (canvas.js, GUARD_SANDBOX). These tests make any browser
// take that path: the editor's question "does a frame without scripts hear this event?" gets no answer.
const frame = 'iframe.cv-frame:not(.is-pending)';
const HOSTILE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>' +
  '<script>parent.__ran.push("head script")</script></head><body><h1>Report</h1><p id="p">Text</p>' +
  '<script>parent.__ran.push("body script")</script>' +
  '<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onload="parent.__ran.push(\'onload\')">' +
  '<img alt="" src="x:none" onerror="parent.__ran.push(\'onerror\')">' +
  '<svg width="10" height="10"><script>parent.__ran.push("svg script")</script></svg>' +
  '<a id="j" href="javascript:parent.__ran.push(\'script url\')">link</a>' +
  '<iframe title="a" srcdoc="&lt;script&gt;top.__ran.push(&quot;srcdoc frame&quot;)&lt;/script&gt;"></iframe>' +
  '<iframe title="b" src="/elsewhere.html"></iframe><object data="/elsewhere.html"></object>' +
  '</body></html>';

async function start(page) {
  await page.addInitScript(() => {
    window.__ran = [];
    const dispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (e) { return e && e.type === 'he-probe' ? true : dispatch.call(this, e); };
  });
  await page.route('https://**/*', (route) => route.abort());
  // A page of the editor's own origin that would reach the editor if its script ran.
  await page.route('**/elsewhere.html', (route) => route.fulfill({ contentType: 'text/html', body: '<script>try{top.__ran.push("page it went to")}catch(e){}</script><p id="elsewhere">elsewhere</p>' }));
  await page.goto('/dist/tactile.html');
  await expect(page.locator(frame)).toBeVisible();
}
async function open(page, html) {
  await start(page);
  expect(await page.evaluate((src) => window.HE.fileio.openText(src, 'doc.html'), html)).toBe(true);
  await expect(page.frameLocator(frame).locator('h1')).toBeVisible();
}
const ran = (page) => page.evaluate(() => window.__ran);
/** What guards the frame on show: its flags now, and the first thing in its head. */
const guard = (page) => page.evaluate(() => {
  const f = window.HE.canvas.frame, first = f.contentDocument.head.firstElementChild;
  return { sandbox: f.getAttribute('sandbox'), first: first.getAttribute('http-equiv') + ': ' + first.getAttribute('content') };
});

test('the edit frame carries a policy that refuses scripts, and gives allow-scripts back once it has loaded', async ({ page }) => {
  await open(page, '<!doctype html><html><head><title>t</title></head><body><h1>Report</h1></body></html>');
  expect(await guard(page)).toEqual({ sandbox: 'allow-same-origin', first: "Content-Security-Policy: script-src 'none'; frame-src 'none'; object-src 'none'" });
  // The policy is the canvas's: the document and the file do not get it.
  expect(await page.evaluate(() => window.HE.doc.serialize() + window.HE.doc.snapshot())).not.toContain('Content-Security-Policy');
  // An edit builds the frame again: the next one is guarded too.
  await page.evaluate(() => window.HE.ops.replaceDocument('<!doctype html><html><head><title>t</title></head><body><h1>Second</h1></body></html>'));
  await expect(page.frameLocator(frame).locator('h1')).toHaveText('Second');
  expect((await guard(page)).sandbox).toBe('allow-same-origin');
  expect((await guard(page)).first).toContain("script-src 'none'");
});

test('no script of the page runs in it: elements, handlers, script URLs, nested pages, or markup written later', async ({ page }) => {
  await open(page, HOSTILE);
  expect((await guard(page)).first).toContain("script-src 'none'");
  await page.evaluate(() => {
    const d = window.HE.live.doc;
    d.body.insertAdjacentHTML('beforeend', '<img alt="" src="x:late" onerror="parent.__ran.push(\'late onerror\')">');
    const s = d.createElement('script');
    s.textContent = 'parent.__ran.push("late script")';
    d.body.appendChild(s);
    const f = d.createElement('iframe');
    f.src = '/elsewhere.html';
    d.body.appendChild(f);
    d.getElementById('j').click();
  });
  await page.waitForTimeout(800);
  expect(await ran(page)).toEqual([]);
});

test('a refresh <meta> does not take the canvas elsewhere; the file keeps it', async ({ page }) => {
  await open(page, '<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/elsewhere.html"><title>t</title></head><body><h1>Report</h1></body></html>');
  await page.waitForTimeout(800);
  await expect(page.frameLocator(frame).locator('h1')).toHaveText('Report');
  expect(await page.evaluate(() => window.HE.live.doc.querySelector('meta[content*="elsewhere"]').hasAttribute('http-equiv'))).toBe(false);
  expect(await page.evaluate(() => window.HE.doc.serialize())).toContain('<meta http-equiv="refresh" content="0; url=/elsewhere.html">');
  expect(await ran(page)).toEqual([]);
});

test('a refresh written into the canvas later loads a page that runs nothing, and the canvas comes back', async ({ page }) => {
  await open(page, '<!doctype html><html><head><title>t</title></head><body><h1>Report</h1></body></html>');
  const went = page.waitForRequest('**/elsewhere.html');
  await page.evaluate(() => {
    const d = window.HE.live.doc, m = d.createElement('meta');
    m.setAttribute('http-equiv', 'refresh');
    m.setAttribute('content', '0; url=/elsewhere.html');
    d.head.appendChild(m);
  });
  await went;
  await expect(page.frameLocator(frame).locator('h1')).toHaveText('Report');
  await page.waitForTimeout(300);
  expect(await ran(page)).toEqual([]);
  expect((await guard(page)).sandbox).toBe('allow-same-origin');
});

test('the canvas is edited as usual: a click selects, a double click edits the text', async ({ page }) => {
  await open(page, '<!doctype html><html><head><title>t</title></head><body><h1>Report</h1><p>Text</p></body></html>');
  const doc = page.frameLocator(frame);
  await doc.locator('p').click();
  expect(await page.evaluate(() => window.HE.doc.byId(window.HE.sel.primary).tagName)).toBe('P');
  await doc.locator('h1').dblclick();
  await page.keyboard.press('End');
  await page.keyboard.type(' 2026');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.HE.doc.body.querySelector('h1').textContent)).toBe('Report 2026');
  await page.evaluate(() => window.HE.history.undo());
  expect(await page.evaluate(() => window.HE.doc.body.querySelector('h1').textContent)).toBe('Report');
});

test('the print frame is guarded the same way: the document\'s scripts stay out, and the editor hears the dialog close', async ({ page }) => {
  await open(page, HOSTILE);
  await page.evaluate(() => {
    window.HE.on('print:ready', ({ frame }) => {
      const first = frame.contentDocument.head.firstElementChild;
      window.__print = { sandbox: frame.getAttribute('sandbox'), first: first.getAttribute('http-equiv') + ': ' + first.getAttribute('content'), scripts: frame.contentDocument.querySelectorAll('script').length };
      frame.contentWindow.print = () => {};
    });
  });
  expect(await page.evaluate(() => window.HE.fileio.exportPDF({ skipHint: true }))).toBe(true);
  const printed = await page.evaluate(() => window.__print);
  expect(printed.sandbox).toBe('allow-same-origin allow-modals');
  expect(printed.first).toContain("script-src 'none'");
  expect(printed.scripts).toBeGreaterThan(0); // the copy is the file as exported: its scripts are in it, and refused
  await page.waitForTimeout(500);
  expect(await ran(page)).toEqual([]);
  await page.evaluate(() => document.getElementById('fio-print-frame').contentWindow.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('#fio-print-frame')).toHaveCount(0);
  await expect(page.locator('.toast.success', { hasText: '列印對話方塊已關閉' })).toBeVisible();
});

test('where frames without scripts do hear, the edit frame stays without allow-scripts and without the policy', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit is the browser that needs the guarded frame');
  await page.goto('/dist/tactile.html');
  await expect(page.locator(frame)).toBeVisible();
  expect(await page.evaluate(() => window.HE.canvas.frame.getAttribute('sandbox'))).toBe('allow-same-origin');
  expect(await page.evaluate(() => window.HE.live.doc.querySelector('meta[http-equiv="Content-Security-Policy"]'))).toBeNull();
});
