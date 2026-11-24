const { defineConfig } = require('@playwright/test');

// The tests read Chinese throughout: the interface (locale below) and what tactile-ingest and the code shared
// with it say, whatever the language of the machine that runs them.
process.env.TACTILE_LANG = 'zh';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    locale: 'zh-TW', // the interface follows the browser's language; the tests read the Chinese one
    viewport: { width: 1400, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/server.mjs',
    url: 'http://127.0.0.1:4173/dist/tactile.html',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
