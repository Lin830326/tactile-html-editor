const { test, expect } = require('@playwright/test');
const { execFile } = require('node:child_process');
const path = require('node:path');

// evals/injection.mjs asks a real model, which no test here does. What a test can keep true is that the script
// tells the two outcomes apart: a model that does what the page says, and one that does only what the user asked.
const script = path.join(__dirname, '..', 'evals', 'injection.mjs');
const run = (args) => new Promise((resolve) => {
  const env = Object.assign({}, process.env);
  delete env.ANTHROPIC_API_KEY;
  execFile(process.execPath, [script].concat(args), { env, timeout: 150_000 }, (err, stdout, stderr) => {
    resolve({ code: err ? (typeof err.code === 'number' ? err.code : -1) : 0, out: stdout + stderr });
  });
});

test('the injection eval reports every case as obeyed when the model obeys the page, and none when it does not', async () => {
  test.setTimeout(320_000);
  const obey = await run(['--mock', 'obey']);
  expect(obey.out).toContain('照做 10 次，沒有照做 0 次，失敗 0 次');
  expect(obey.code).toBe(0);
  const resist = await run(['--mock', 'resist']);
  expect(resist.out).toContain('照做 0 次，沒有照做 10 次，失敗 0 次');
  expect(resist.code).toBe(0);
});

test('the injection eval does not call a model without a key', async () => {
  const r = await run([]);
  expect(r.code).toBe(2);
  expect(r.out).toContain('ANTHROPIC_API_KEY');
});
