const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const canvasSelector = 'iframe.cv-frame:not(.is-pending)';

/**
 * A claude.ai Artifact's sample(): with tools it streams the text of every round as one growing string, a blank line
 * between rounds. Each scenario lists what happens in order: text Claude writes, or a call of the set_text tool.
 */
function fakeSample() {
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  const sample = async (input, opts = {}) => {
    const steps = window.__scenario || [];
    window.__inputs.push(input);
    let text = '';
    const write = (more) => {
      text += more;
      opts.onText({ text, delta: more });
    };
    for (const step of steps) {
      await tick();
      if (step === 'tool') {
        const tool = opts.tools.find(t => t.name === 'set_text');
        const id = window.HE.doc.model.getElementById('title').getAttribute('data-he-id');
        await tool.execute({ id, text: '新的標題 ' + window.__inputs.length }, {});
      } else {
        write(step);
      }
    }
    return { text, truncated: false };
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: 32 }, modelTiers: ['quick', 'default', 'complex'] });
  sample.json = async () => ({ reply: '', ops: [] });
  window.__inputs = [];
  window.claude = { use: async name => (name === 'sample' ? sample : null) };
}

async function boot(page) {
  await page.addInitScript(fakeSample);
  await page.route('https://**/*', route => route.abort());
  await page.goto('/dist/tactile.html');
  await page.waitForFunction(() => window.HE && HE.doc && HE.doc.model && HE.live && HE.live.doc);
  const html = await readFile(path.join(__dirname, 'fixtures', '04-design-check.html'), 'utf8');
  expect(await page.evaluate(source => HE.fileio.openText(source, '04-design-check.html'), html)).toBe(true);
  await expect(page.frameLocator(canvasSelector).locator('#title')).toHaveText('設計檢查樣本');
  await page.evaluate(() => { HE.sel.clear(); HE.ai.focus(); });
  await page.waitForFunction(() => window.HE.ai.provider().ready);
}

async function run(page, scenario) {
  await page.evaluate(steps => { window.__scenario = steps; }, scenario);
  expect(await page.evaluate(() => HE.ai.run('改標題'))).toBe(true);
  return page.locator('#ai-pane .ai-msg-bot').last().locator(':scope > .ai-md').innerText();
}

test('in a claude.ai Artifact only the text after the last tool call is shown and remembered', async ({ page }) => {
  await boot(page);

  // A note Claude wrote to itself before using a tool stays out of the reply.
  let shown = await run(page, ['Contrast: white text on orange needs a darker orange.', 'tool', '\n\n已把標題改好。']);
  expect(shown.trim()).toBe('已把標題改好。');

  // The note's last words reached the page only after the tool started.
  shown = await run(page, ['Checking the ', 'tool', 'title first.\n\n標題換好了。\n\n第二段說明。']);
  expect(shown).toContain('標題換好了。');
  expect(shown).toContain('第二段說明。');
  expect(shown).not.toContain('title first');

  // Nothing written before the tool: every paragraph of the answer stays.
  shown = await run(page, ['tool', '第一段。\n\n第二段。']);
  expect(shown).toContain('第一段。');
  expect(shown).toContain('第二段。');

  // No text after the last tool: the latest text written is kept, as with the API providers.
  shown = await run(page, ['我先把標題改掉。', 'tool']);
  expect(shown.trim()).toBe('我先把標題改掉。');

  // The next request carries only the replies, not the notes.
  await run(page, ['好。']);
  const turns = await page.evaluate(() => window.__inputs.at(-1).map(m => m.content).join('\n'));
  expect(turns).toContain('已把標題改好。');
  expect(turns).not.toContain('Contrast: white text');
  expect(turns).not.toContain('title first');
});
