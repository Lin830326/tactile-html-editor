const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

/**
 * A claude.ai Artifact offers a limited number of tools in one call (16 when this was written), fewer than the editor
 * has. Every tool must still be within reach: the ones that do not fit are run by name through one tool, use_tool.
 * The fake sample() keeps the tools of each call and runs what window.__calls lists.
 */
function fakeSample() {
  const sample = async (input, opts = {}) => {
    window.__rules = input[0].content;
    window.__offered.push(opts.tools.map(t => ({ name: t.name, description: t.description, schema: t.inputSchema || null })));
    const results = [];
    for (const [name, args] of window.__calls || []) {
      const tool = opts.tools.find(t => t.name === name);
      try { results.push({ ok: await tool.execute(args, {}) }); } catch (err) { results.push({ error: String((err && err.message) || err) }); }
    }
    window.__results = results;
    opts.onText({ text: 'OK', delta: 'OK' });
    return { text: 'OK', truncated: false };
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: window.__max || 16 } });
  sample.json = async () => ({ reply: '', ops: [] });
  window.__offered = [];
  window.claude = { use: async name => (name === 'sample' ? sample : null) };
}

async function boot(page) {
  await page.addInitScript(fakeSample);
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc);
  const html = await readFile(path.join(__dirname, 'fixtures', '04-design-check.html'), 'utf8');
  expect(await page.evaluate(source => HE.fileio.openText(source, '04-design-check.html'), html)).toBe(true);
  await page.evaluate(() => { HE.sel.clear(); HE.ai.focus(); });
  await page.waitForFunction(() => window.HE.ai.provider().ready);
}

async function offered(page, max, calls) {
  await page.evaluate(([m, c]) => { window.__max = m; window.__calls = c; }, [max, calls || []]);
  expect(await page.evaluate(() => HE.ai.run('改標題'))).toBe(true);
  return page.evaluate(() => window.__offered[window.__offered.length - 1]);
}

const reach = (tools) => {
  const other = tools.find(t => t.name === 'use_tool');
  return tools.filter(t => t !== other).map(t => t.name).concat(other ? other.schema.properties.tool.enum : []).sort();
};

test('a view that takes 16 tools still reaches every tool', async ({ page }) => {
  await boot(page);
  const all = await offered(page, 64);
  expect(all.some(t => t.name === 'use_tool')).toBe(false);
  expect(all.length).toBeGreaterThan(16);

  const few = await offered(page, 16);
  expect(few.length).toBe(16);
  expect(reach(few)).toEqual(all.map(t => t.name).sort());
  const other = few.find(t => t.name === 'use_tool');
  // What the model needs to call a tool it cannot see, its description and its input, is in the instructions.
  const rules = await page.evaluate(() => window.__rules);
  for (const name of other.schema.properties.tool.enum) {
    const tool = all.find(t => t.name === name);
    expect(rules).toContain(name + ': ' + tool.description + '\nInput schema: ' + JSON.stringify(tool.schema || { type: 'object', properties: {} }));
  }
  // The view refuses a call with a longer description or schema (sample.d.ts: 1 KB and 4 KB).
  for (const t of few) {
    expect(Buffer.byteLength(t.description), t.name).toBeLessThanOrEqual(1024);
    expect(Buffer.byteLength(JSON.stringify(t.schema || {})), t.name).toBeLessThanOrEqual(4096);
  }
  // No source file is loaded: the tools that read one are the first to move away, the ones that edit stay.
  const direct = few.map(t => t.name);
  expect(direct).toEqual(expect.arrayContaining(['get_outline', 'get_html', 'insert_html', 'replace_html', 'set_text', 'set_styles']));
  expect(direct).not.toContain('list_sources');
});

test('with a source file loaded the tools that read it are offered by name', async ({ page }) => {
  await boot(page);
  const book = await readFile(path.join(__dirname, '..', 'ingest', 'examples', 'traceable', '2026Q3.xlsx'));
  await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    await HE.sources.add(new File([bytes], '2026Q3.xlsx'));
  }, book.toString('base64'));
  const few = await offered(page, 16);
  expect(few.length).toBe(16);
  expect(few.map(t => t.name)).toEqual(expect.arrayContaining(['list_sources', 'read_cells', 'find_cells', 'edit_rules', 'insert_html', 'use_tool']));
  for (const t of few) {
    expect(Buffer.byteLength(t.description), t.name).toBeLessThanOrEqual(1024);
    expect(Buffer.byteLength(JSON.stringify(t.schema || {})), t.name).toBeLessThanOrEqual(4096);
  }
});

test('use_tool runs the named tool and refuses a name it does not hold', async ({ page }) => {
  await boot(page);
  const id = await page.evaluate(() => HE.doc.model.getElementById('title').getAttribute('data-he-id'));
  const before = await page.evaluate(() => HE.doc.model.querySelectorAll('h1').length);
  const few = await offered(page, 16, [
    ['use_tool', { tool: 'duplicate_elements', input: { ids: [id] } }],
    ['use_tool', { tool: 'set_text', input: { id, text: 'x' } }],
    ['use_tool', { tool: 'no_such_tool' }],
  ]);
  expect(few.find(t => t.name === 'use_tool').schema.properties.tool.enum).toContain('duplicate_elements');
  const results = await page.evaluate(() => window.__results);
  expect(results[0].error).toBeUndefined();
  expect(await page.evaluate(() => HE.doc.model.querySelectorAll('h1').length)).toBe(before + 1);
  // set_text is offered by name: use_tool does not take it.
  expect(results[1].error).toContain('must be one of');
  expect(results[2].error).toContain('must be one of');
  expect(await page.evaluate(() => HE.doc.model.getElementById('title').textContent)).not.toBe('x');
});
