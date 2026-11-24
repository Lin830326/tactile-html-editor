const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tool = path.join(__dirname, '..', 'tools', 'set-repo.mjs');
const run = (args) => {
  try { return { code: 0, out: execFileSync(process.execPath, [tool].concat(args), { encoding: 'utf8', stdio: 'pipe' }) }; }
  catch (err) { return { code: err.status, out: String(err.stdout) + String(err.stderr) }; }
};

test('every link to the repository is the address in package.json', () => {
  const r = run(['--check']);
  expect(r.out).toContain('The repository address is the same everywhere');
  expect(r.code).toBe(0);
});

test('a new address is written to every file, and an address left behind is reported', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tactile-repo-'));
  try {
    fs.mkdirSync(path.join(dir, 'docs'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ repository: { type: 'git', url: 'git+https://github.com/old-owner/old-name.git' } }, null, 2));
    fs.writeFileSync(path.join(dir, 'docs', 'A.md'), 'git clone https://github.com/old-owner/old-name.git\r\ncd old-name\r\nSee https://github.com/mozilla/pdf.js\r\n');
    expect(run(['--root', dir, '--check']).code).toBe(0);

    const r = run(['--root', dir, 'new-owner/new-name']);
    expect(r.code).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).repository.url).toBe('git+https://github.com/new-owner/new-name.git');
    expect(fs.readFileSync(path.join(dir, 'docs', 'A.md'), 'utf8')).toBe('git clone https://github.com/new-owner/new-name.git\r\ncd new-name\r\nSee https://github.com/mozilla/pdf.js\r\n');
    expect(run(['--root', dir, '--check']).code).toBe(0);

    fs.writeFileSync(path.join(dir, 'docs', 'B.md'), 'https://github.com/old-owner/new-name/issues\n');
    const bad = run(['--root', dir, '--check']);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('B.md:1');

    expect(run(['--root', dir, 'not a slug']).code).toBe(2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
