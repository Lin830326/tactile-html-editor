#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { FillError, fillReport } from '../src/fill.mjs';
import { buildFacts, IngestError, prepareSources, TOOL } from '../src/ingest.mjs';
import { say, setLang } from '../src/lang.mjs';
import { factsToMarkdown } from '../src/markdown.mjs';
import { factsLoader, serveStdio } from '../src/mcp.mjs';
import { QueryError } from '../src/query.mjs';
import { verifyReport } from '../src/verify.mjs';

const USAGE_EN = `Usage:
  tactile-ingest ingest <source file .xlsx, .docx or .pdf>... [--out <folder>]
  tactile-ingest fill <draft.html> --facts <facts.json> [--rules <rules.yaml>] --out <report.html>
  tactile-ingest verify <report.html> [--source <source file>]... [--rules <rules.yaml>] [--strict] [--json]
  tactile-ingest mcp --facts <facts.json>

ingest: reads source files (Excel .xlsx, Word .docx, PDF) and writes into <folder> (the current folder by default)
    facts.json  for programs: the value, address and formula of every cell
    facts.md    for an AI: one table for each sheet
  Word document: each table is t1, t2…, and the paragraphs outside tables are body.
  Word stores only text. The program parses numbers from that text; a cell with a unit stays text.
  PDF: each page is p1, p2…, a row is a line of text on the page, a column is a piece of that line.
  A PDF stores no tables. The program works out lines and columns from coordinates. Reading a PDF needs Node 22.13 or later.
  An existing facts.json or facts.md is replaced.

fill: writes the source value into every data-fact element of the draft, computes the reconciliation rules,
  and embeds the provenance data in the report. When the draft has errors, no file is written.
  An existing --out file is replaced. --out may be the same file as the draft.

verify: checks a report and changes no file. It has 3 levels and says which level it reached.
    Level 1  every number in the report equals the text computed from the provenance block; the rules pass when computed again
    Level 2  each --source file is the same file as at ingest time (same SHA-256)
    Level 3  each --source file is read again, and every value in the provenance block equals it
  Without --source only level 1 is done. Give one --source for each source file the report cites.
  --rules   checks that the rules file is the same file as at fill time
  --strict  "changed by hand", "no source" and "a level was skipped" also count as fail
  --json    prints the result as JSON

mcp: starts an MCP server (stdio), so that an AI can ask for a part of facts.json at a time.
  An AI client starts it; it is not for use by hand in a terminal. It only reads facts.json and changes no file.
  Tools: list_sources, read_range, search_facts, get_facts, trace_formula.
  After facts.json is ingested again, the next query reads the new content.

Other:
  --version   prints the version
  --help      prints this help
  --lang      the language of messages: --lang en is English (the default), --lang zh is Traditional Chinese.
              Without --lang, the environment variables TACTILE_LANG, LC_ALL, LC_MESSAGES and LANG decide,
              in that order, then the system language.

Exit codes: 0 done (there may be warnings); 1 the input has errors, or verify fails; 2 the command is written wrongly.`;

const USAGE_ZH = `用法：
  tactile-ingest ingest <來源檔.xlsx、.docx 或 .pdf>... [--out <資料夾>]
  tactile-ingest fill <報告草稿.html> --facts <facts.json> [--rules <rules.yaml>] --out <報告.html>
  tactile-ingest verify <報告.html> [--source <來源檔>]... [--rules <rules.yaml>] [--strict] [--json]
  tactile-ingest mcp --facts <facts.json>

ingest：讀取來源檔（Excel 的 .xlsx、Word 的 .docx、PDF），在 <資料夾>（預設是目前的資料夾）寫出
    facts.json  給程式讀：每個儲存格的值、位址、公式
    facts.md    給 AI 讀：每個工作表一個表格
  Word 文件：每個表格是 t1、t2…，表格以外的段落是 body。
  Word 只儲存文字，數值由程式從文字解析；有單位的儲存格仍然是文字。
  PDF：每一頁是 p1、p2…，列是頁面上的第幾行文字，欄是那一行的第幾段。
  PDF 沒有儲存表格，行與欄由程式從座標推算。讀取 PDF 需要 Node 22.13 以上。
  已經存在的 facts.json 與 facts.md 會被取代。

fill：把報告草稿裡每個 data-fact 元素填上來源值，計算勾稽規則，
  並把出處資料內嵌進報告。草稿有錯誤時不寫出檔案。
  --out 的檔案如果已經存在，會被取代。--out 可以與草稿是同一個檔案。

verify：檢查報告，不修改任何檔案。分 3 級，並寫出做到哪一級。
    第 1 級  報告上每個數字等於出處區塊算出的文字；規則重算後通過
    第 2 級  --source 的檔案與擷取時是同一個檔案（SHA-256 相同）
    第 3 級  重新讀 --source 的檔案，出處區塊的每個值都與它相同
  沒有 --source 時只做第 1 級。報告引用幾個來源檔，就必須給幾個 --source。
  --rules   核對規則檔與填入時是同一個檔案
  --strict  「已偏離來源」「無出處」「有層級沒做」也算不通過
  --json    用 JSON 輸出結果

mcp：啟動 MCP 伺服器（stdio），讓 AI 一次查詢 facts.json 的一部分。
  由 AI 用戶端啟動，不是給人在終端機操作。只讀取 facts.json，不修改任何檔案。
  工具：list_sources、read_range、search_facts、get_facts、trace_formula。
  facts.json 被重新擷取後，下一次查詢會讀到新的內容。

其他：
  --version   顯示版本
  --help      顯示這份說明
  --lang      訊息的語言：--lang en 是英文（預設），--lang zh 是繁體中文。
              沒有 --lang 時依序看環境變數 TACTILE_LANG、LC_ALL、LC_MESSAGES、LANG，再看系統語言。

結束代碼：0 完成（可能有警告）；1 輸入有錯誤，或 verify 不通過；2 指令寫錯。`;

const usage = () => say(USAGE_EN, USAGE_ZH);

class UsageError extends Error {}

/** known: options that take a value; flags: options that do not; many: options that may repeat (kept as lists). */
function options(args, known, flags = [], many = []) {
  const out = { _: [] };
  for (const m of many) out[m.slice(2)] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    if (flags.includes(a)) { out[a.slice(2)] = true; continue; }
    if (!known.includes(a)) throw new UsageError(say('Unknown option "' + a + '"', '不認得的選項「' + a + '」'));
    const v = args[++i];
    if (v === undefined || v.startsWith('--')) throw new UsageError(say(a + ' must be followed by a value', a + ' 後面必須接一個值'));
    if (many.includes(a)) out[a.slice(2)].push(v);
    else out[a.slice(2)] = v;
  }
  return out;
}

function read(name, encoding) {
  try { return fs.readFileSync(name, encoding); } catch (err) { throw new IngestError(say('Cannot open "' + name + '": ' + err.message, '無法開啟「' + name + '」：' + err.message)); }
}

async function ingest(args) {
  const o = options(args, ['--out']);
  const out = o.out || '.';
  const facts = buildFacts(await prepareSources(o._.map((name) => ({ name, bytes: read(name) }))));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'facts.json'), JSON.stringify(facts, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'facts.md'), factsToMarkdown(facts));
  const sheets = facts.sources.reduce((n, s) => n + s.sheets.length, 0);
  console.log(say('Ingested. Files: ' + facts.sources.length + '. Sheets, tables or pages: ' + sheets + '. Cells: ' + facts.facts.length, '已擷取 ' + facts.sources.length + ' 個檔案、' + sheets + ' 個工作表、表格或頁、' + facts.facts.length + ' 個儲存格'));
  console.log(say('Wrote ' + path.join(out, 'facts.json') + ' and ' + path.join(out, 'facts.md'), '寫出 ' + path.join(out, 'facts.json') + ' 與 ' + path.join(out, 'facts.md')));
}

function fill(args) {
  const o = options(args, ['--facts', '--rules', '--out']);
  if (o._.length !== 1) throw new UsageError(say('fill needs 1 report draft', 'fill 需要 1 個報告草稿'));
  if (!o.facts) throw new UsageError(say('fill needs --facts <facts.json>', 'fill 需要 --facts <facts.json>'));
  if (!o.out) throw new UsageError(say('fill needs --out <report.html>', 'fill 需要 --out <報告.html>'));
  let facts;
  try { facts = JSON.parse(read(o.facts, 'utf8')); } catch (err) {
    if (err instanceof IngestError) throw err;
    throw new IngestError(say('"' + o.facts + '" is not valid JSON: ' + err.message, '「' + o.facts + '」不是有效的 JSON：' + err.message));
  }
  const result = fillReport(read(o._[0], 'utf8'), facts, { rulesText: o.rules ? read(o.rules, 'utf8') : undefined });
  fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
  fs.writeFileSync(o.out, result.html);
  console.log(say('Numbers filled: ' + result.filled + (result.charts ? '. Charts drawn: ' + result.charts : '') + '. Wrote ' + o.out, '已填入 ' + result.filled + ' 個數字' + (result.charts ? '、畫出 ' + result.charts + ' 張圖表' : '') + '，寫出 ' + o.out));
  if (result.rules.length) {
    const n = (k) => result.rules.filter((r) => r.result === k).length;
    console.log(say('Reconciliation rules (' + result.rules.length + '): ' + n('pass') + ' pass, ' + n('fail') + ' fail, ' + n('unknown') + ' unknown', '勾稽規則 ' + result.rules.length + ' 條：通過 ' + n('pass') + '，違反 ' + n('fail') + '，無法計算 ' + n('unknown')));
  }
  if (result.warnings.length) {
    console.log(say('\nWarnings (' + result.warnings.length + '):', '\n警告 ' + result.warnings.length + ' 個：'));
    for (const w of result.warnings) console.log('- ' + w);
  }
}

const levelName = (k) => ({
  1: say('Level 1: internally consistent', '第 1 級 內部一致'),
  2: say('Level 2: same source file', '第 2 級 來源檔相同'),
  3: say('Level 3: re-ingested', '第 3 級 重新擷取'),
}[k]);
const levelSay = (result) => ({ pass: say('pass', '通過'), fail: say('fail', '不通過'), skipped: say('skipped', '沒做') }[result]);

async function verify(args) {
  const o = options(args, ['--source', '--rules'], ['--strict', '--json'], ['--source']);
  if (o._.length !== 1) throw new UsageError(say('verify needs 1 report', 'verify 需要 1 份報告'));
  const r = verifyReport(read(o._[0], 'utf8'), {
    sources: await prepareSources(o.source.map((name) => ({ name, bytes: read(name) }))),
    rulesText: o.rules ? read(o.rules, 'utf8') : undefined,
  });
  const pass = r.ok && !(o.strict && r.warnings.length);
  const reached = r.levels[1] !== 'pass' ? 0 : r.levels[2] !== 'pass' ? 1 : r.levels[3] !== 'pass' ? 2 : 3;
  if (o.json) {
    console.log(JSON.stringify({ pass, reached, levels: r.levels, counts: r.counts, rules: r.rules, problems: r.problems, warnings: r.warnings, notes: r.notes }, null, 2));
    return pass ? 0 : 1;
  }
  for (const k of [1, 2, 3]) console.log(levelName(k) + say(': ', '：') + levelSay(r.levels[k]));
  const c = r.counts;
  console.log(say('Numbers: ' + c.ok + ' match, ' + c.mismatch + ' do not match, ' + c.missing + ' not found, ' + c.was + ' changed by hand, ' + c.uncited + ' with no source', '數字：相符 ' + c.ok + '，不符 ' + c.mismatch + '，找不到 ' + c.missing + '，已偏離來源 ' + c.was + '，無出處 ' + c.uncited));
  if (c.charts) console.log(say('Charts (' + c.charts + '): ' + (c.charts - c.chartsBad) + ' match, ' + c.chartsBad + ' do not match', '圖表 ' + c.charts + ' 張：相符 ' + (c.charts - c.chartsBad) + '，不符 ' + c.chartsBad));
  if (r.rules.length) {
    const n = (k) => r.rules.filter((x) => x.result === k).length;
    console.log(say('Reconciliation rules (' + r.rules.length + '): ' + n('pass') + ' pass, ' + n('fail') + ' fail, ' + n('unknown') + ' unknown', '勾稽規則 ' + r.rules.length + ' 條：通過 ' + n('pass') + '，違反 ' + n('fail') + '，無法計算 ' + n('unknown')));
  }
  if (r.problems.length) {
    console.log(say('\nProblems (' + r.problems.length + '):', '\n問題 ' + r.problems.length + ' 個：'));
    for (const p of r.problems) console.log('- ' + p);
  }
  if (r.warnings.length) {
    console.log(say('\n' + (o.strict ? 'Warnings (--strict: counted as fail)' : 'Warnings') + ' (' + r.warnings.length + '):', '\n' + (o.strict ? '警告（--strict：算不通過）' : '警告') + ' ' + r.warnings.length + ' 個：'));
    for (const w of r.warnings) console.log('- ' + w);
  }
  if (r.notes.length) {
    console.log(say('\nNotes (' + r.notes.length + '):', '\n說明 ' + r.notes.length + ' 個：'));
    for (const n of r.notes) console.log('- ' + n);
  }
  console.log(say('\nResult: ' + (pass ? 'pass' : 'fail') + '. ' + (reached ? 'Reached level ' + reached : 'Level 1 did not pass') + (reached === 1 ? ', not checked against the source file' : ''), '\n結果：' + (pass ? '通過' : '不通過') + '。' + (reached ? '做到第 ' + reached + ' 級' : '第 1 級沒有通過') + (reached === 1 ? '，尚未與來源檔核對' : '')));
  return pass ? 0 : 1;
}

/** Starts the server and returns at once; the process lives until the client closes stdin. */
function mcp(args) {
  const o = options(args, ['--facts']);
  if (o._.length) throw new UsageError(say('mcp takes no other arguments: ' + o._.join(' '), 'mcp 不接受其他參數：' + o._.join(' ')));
  if (!o.facts) throw new UsageError(say('mcp needs --facts <facts.json>', 'mcp 需要 --facts <facts.json>'));
  const load = factsLoader(o.facts);
  load(); // a wrong file stops here, with the reason on stderr, before any client waits for an answer
  serveStdio({ load });
}

/**
 * Takes --lang <en|zh> out of the arguments, wherever it stands, and sets the language of every message.
 * Returns the arguments that are left; throws UsageError for a value that is not en or zh.
 */
function takeLang(argv) {
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--lang') { rest.push(argv[i]); continue; }
    const v = argv[++i];
    if (v !== 'en' && v !== 'zh') throw new UsageError(say('--lang must be followed by en or zh', '--lang 後面必須接 en 或 zh'));
    setLang(v);
  }
  return rest;
}

async function main(args) {
  let argv;
  try { argv = takeLang(args); } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(err.message + '\n\n' + usage());
    return 2;
  }
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(usage()); return 0; }
  if (argv.includes('--version')) { console.log(TOOL.version); return 0; }
  const [command, ...rest] = argv;
  try {
    if (command === 'ingest') await ingest(rest);
    else if (command === 'fill') fill(rest);
    else if (command === 'verify') return await verify(rest);
    else if (command === 'mcp') mcp(rest);
    else throw new UsageError(say('Unknown command "' + command + '"', '不認得的指令「' + command + '」'));
    return 0;
  } catch (err) {
    if (err instanceof UsageError) { console.error(err.message + '\n\n' + usage()); return 2; }
    if (err instanceof FillError) {
      console.error(say('Errors (' + err.problems.length + '), no report was written:', '錯誤 ' + err.problems.length + ' 個，沒有寫出報告：'));
      for (const p of err.problems) console.error('- ' + p);
      return 1;
    }
    if (err instanceof IngestError || err instanceof QueryError) { console.error(say('Error: ' + err.message, '錯誤：' + err.message)); return 1; }
    throw err;
  }
}

process.exitCode = await main(process.argv.slice(2));
