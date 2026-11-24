#!/usr/bin/env node
// The repository's address is written in several files: links in the docs, the security-report link, the notice at
// the top of dist/*.html. package.json holds the one that counts.
//
//   node tools/set-repo.mjs --check            every address in the files is the one in package.json
//   node tools/set-repo.mjs <owner>/<name>     write a new address everywhere, then rebuild dist/
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'vendor', 'test-results', 'playwright-report', '.claude', '.codegraph', 'licenses']);
const SKIP_FILES = new Set(['package-lock.json']);
const TEXT = /\.(md|mjs|js|json|ya?ml|html|css|txt)$/i;
const SLUG = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;

function files(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) files(join(dir, e.name), out); }
    else if (TEXT.test(e.name) && !SKIP_FILES.has(e.name)) out.push(join(dir, e.name));
  }
  return out;
}

/** "owner/name" from package.json's repository.url. */
export function slugOf(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const url = (pkg.repository && pkg.repository.url) || '';
  const m = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(url);
  if (!m) throw new Error('repository.url in package.json is not a GitHub address: ' + url);
  return m[1] + '/' + m[2];
}

/** Addresses of a repository with this project's name under another owner: [{file, line, found}]. */
function strays(root, slug) {
  const name = slug.split('/')[1];
  const re = new RegExp('github\.com/([A-Za-z0-9-]+)/' + name.replace(/[.]/g, '\.') + '(?![A-Za-z0-9_-])', 'g');
  const out = [];
  for (const f of files(root)) {
    readFileSync(f, 'utf8').split('\n').forEach((text, i) => {
      for (const m of text.matchAll(re)) if (m[1] + '/' + name !== slug) out.push({ file: relative(root, f), line: i + 1, found: m[1] + '/' + name });
    });
  }
  return out;
}

export function main(argv) {
  let root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const args = argv.slice();
  const at = args.indexOf('--root');
  if (at >= 0) { root = resolve(args[at + 1] || ''); args.splice(at, 2); }
  if (args.length !== 1) {
    console.error('Usage: node tools/set-repo.mjs --check\n       node tools/set-repo.mjs <owner>/<name>');
    return 2;
  }
  const old = slugOf(root);
  if (args[0] === '--check') {
    const bad = strays(root, old).map((s) => s.file + ':' + s.line + ' says ' + s.found);
    for (const d of ['dist/tactile.html', 'dist/artifact.html']) {
      const p = join(root, d);
      if (existsSync(p) && !readFileSync(p, 'utf8').slice(0, 400).includes('https://github.com/' + old + '\n')) bad.push(d + ' does not start with the address of ' + old + '; run node build.mjs');
    }
    if (bad.length) { console.error('The repository address differs (package.json says ' + old + '):\n  ' + bad.join('\n  ')); return 1; }
    console.log('The repository address is the same everywhere: ' + old);
    return 0;
  }
  const next = args[0];
  if (!SLUG.test(next)) { console.error('"' + next + '" is not written as <owner>/<name>'); return 2; }
  const [oldName, newName] = [old.split('/')[1], next.split('/')[1]];
  let changed = 0;
  for (const f of files(root)) {
    const raw = readFileSync(f, 'utf8');
    let s = raw.split('github.com/' + old).join('github.com/' + next);
    // The folder that `git clone` creates, in the setup steps.
    if (oldName !== newName) s = s.replace(new RegExp('^cd ' + oldName.replace(/[.]/g, '\.') + '(\r?)$', 'gm'), 'cd ' + newName + '$1');
    if (s !== raw) { writeFileSync(f, s); changed++; console.log('  updated ' + relative(root, f)); }
  }
  if (existsSync(join(root, 'build.mjs'))) execFileSync(process.execPath, [join(root, 'build.mjs')], { cwd: root, stdio: 'inherit' });
  console.log(old + ' → ' + next + ': ' + changed + ' files.' + (changed ? ' Check git diff, then commit.' : ''));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
