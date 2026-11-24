#!/usr/bin/env node
// Keeps the styles the editor maintains inside the templates up to date.
//
//   node tools/resync-templates.mjs            rewrite the templates that are out of step, then build again
//   node tools/resync-templates.mjs --check    change nothing; exit with 1 when a template is out of step
//
// A template with pages ([data-tpg]) or a floating island ([data-tfi]) carries <style data-he-style="pages"> and
// "island", which HE.pages.sync() and HE.island.sync() wrote. When that CSS changes in src/js/pages.js or
// src/js/island.js, a template still holds the old text, and the first edit of a user would rewrite it inside their
// own undo step. This opens each such template in the built editor (dist/tactile.html, so build first), runs the two
// syncs and, when the document changed, writes it back into the file of src/js that holds it.
//
// A template is a JavaScript template literal there. The new text replaces the old one between the same backticks,
// with backslashes, backticks and ${ escaped; the rest of the file is not touched.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const JS = join(ROOT, 'src', 'js');
const FRAME = 'iframe.cv-frame:not(.is-pending)';
const checkOnly = process.argv.includes('--check');

/** A text as the source of a template literal that evaluates to it. */
export const escapeTemplate = (text) => text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/** The value of the template literal whose source (between the backticks) is `raw`, or null when it holds a ${…}. */
function cooked(raw) {
  if (/(^|[^\\])(\\\\)*\$\{/.test(raw)) return null;
  try { return (0, eval)('`' + raw + '`'); } catch { return null; }
}

/**
 * Where the template literal that evaluates to `html` sits in `source` (line ends as \n): {start, end} of the text
 * between its backticks, or null. The literal as this tool writes it is looked for first; else every literal that
 * follows a "= " is read to its closing backtick and compared by value.
 */
export function findLiteral(source, html) {
  const own = '`' + escapeTemplate(html) + '`';
  const at = source.indexOf(own);
  if (at >= 0) return { start: at + 1, end: at + own.length - 1 };
  for (let from = source.indexOf('= `'); from >= 0; from = source.indexOf('= `', from + 1)) {
    const start = from + 3;
    let end = start;
    while (end < source.length && source[end] !== '`') end += source[end] === '\\' ? 2 : 1;
    if (end < source.length && cooked(source.slice(start, end)) === html) return { start, end };
  }
  return null;
}

function build() {
  const done = spawnSync(process.execPath, [join(ROOT, 'build.mjs')], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  if (done.status !== 0) throw new Error('node build.mjs failed');
}

async function main() {
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
  const stale = []; // {key, html (the template as the editor holds it), synced (after the two syncs)}
  let seen = 0;
  try {
    /** A fresh editor in a context of its own: nothing a document before it left in the browser's storage reaches it. */
    const boot = async () => {
      const context = await browser.newContext({ viewport: { width: 1360, height: 820 }, locale: 'zh-TW' });
      // The editor works offline; a template must not depend on anything this run happens to reach.
      await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForSelector(FRAME);
      await page.waitForFunction(() => window.HE && window.HE.doc && window.HE.doc.model && window.HE.samples && window.HE.pages && window.HE.island);
      return page;
    };
    const first = await boot();
    const samples = await first.evaluate(() => window.HE.samples.list.map((s) => ({ key: s.key, html: s.html })));
    await first.context().close();
    for (const sample of samples) {
      if (!/data-tpg\b|data-tfi\b/.test(sample.html)) continue;
      const page = await boot();
      const got = await page.evaluate(async (key) => {
        const HE = window.HE;
        if (!(await HE.fileio.newDoc(key))) return null;
        if (!HE.doc.body.querySelector('[data-tpg], [data-tfi]')) return { skip: true };
        const before = HE.doc.serialize();
        HE.pages.sync();
        HE.island.sync();
        return { before, synced: HE.doc.serialize() };
      }, sample.key);
      await page.context().close();
      if (!got) throw new Error('The template "' + sample.key + '" did not open.');
      if (got.skip) continue;
      seen++;
      if (got.synced !== got.before) stale.push({ key: sample.key, html: sample.html, synced: got.synced });
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (!stale.length) {
    console.log(seen + ' templates with pages or an island: all in step with the editor.');
    return 0;
  }
  if (checkOnly) {
    console.error('Out of step with the editor: ' + stale.map((s) => s.key).join(', ') + '.\nRun: node build.mjs && node tools/resync-templates.mjs');
    return 1;
  }

  const files = (await readdir(JS)).filter((f) => /^samples.*\.js$/.test(f)).sort();
  const texts = new Map();
  for (const f of files) {
    const raw = await readFile(join(JS, f), 'utf8');
    texts.set(f, { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n'), changed: false });
  }
  for (const s of stale) {
    let found = null;
    for (const [f, entry] of texts) {
      const at = findLiteral(entry.text, s.html);
      if (at) { found = { f, entry, at }; break; }
    }
    if (!found) throw new Error('The template "' + s.key + '" was not found as a template literal in src/js/samples*.js.');
    const { f, entry, at } = found;
    const literal = escapeTemplate(s.synced);
    if (cooked(literal) !== s.synced) throw new Error('The template "' + s.key + '" does not survive escaping.');
    entry.text = entry.text.slice(0, at.start) + literal + entry.text.slice(at.end);
    entry.changed = true;
    console.log('Rewrote ' + s.key + ' in src/js/' + f);
  }
  for (const [f, entry] of texts) {
    if (entry.changed) await writeFile(join(JS, f), entry.crlf ? entry.text.replace(/\n/g, '\r\n') : entry.text);
  }
  build();
  console.log('Built dist again. Run the tool with --check, and the tests, before committing.');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.message || err); process.exitCode = 2; });
}
