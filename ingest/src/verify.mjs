// `verify` of docs/spec/provenance.md 7: checks a filled report at up to 3 levels and says which levels it reached.
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readShow, shownText, SpecError } from './decimal.mjs';
import { drawChart, readChart, reportLang } from './chart.mjs';
import { attrReader, holdsDrawing, PROVENANCE_VERSION, scanReport } from './fill.mjs';
import { IngestError, kindNote, readSource } from './ingest.mjs';
import { say } from './lang.mjs';
import { expandRules, parseRules, runRule } from './rules.mjs';

const attr = (el, name) => { const a = el.attrs && el.attrs.find((x) => x.name === name); return a ? a.value : undefined; };
const textOf = (el) => (el.childNodes || []).map((n) => (n.nodeName === '#text' ? n.value : n.childNodes ? textOf(n) : '')).join('');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The fields of a fact that the block carries, in the block's order, for a field-by-field comparison. */
const BLOCK_FIELDS = ['type', 'value', 'text', 'formula', 'labels'];

function readBlock(scan) {
  if (!scan.block) return { error: say('The report has no provenance block (<script id="tactile-provenance">)', '報告裡沒有出處區塊（<script id="tactile-provenance">）') };
  let block;
  try { block = JSON.parse(textOf(scan.block)); } catch (err) { return { error: say('The provenance block is not valid JSON: ' + err.message, '出處區塊不是有效的 JSON：' + err.message) }; }
  if (!block || typeof block !== 'object' || Array.isArray(block)) return { error: say('The top level of the provenance block must be fields', '出處區塊的最外層必須是欄位') };
  if (block.tactileProvenance !== PROVENANCE_VERSION) {
    return { error: say('The provenance block has format version ' + block.tactileProvenance + '. This program reads only version ' + PROVENANCE_VERSION, '出處區塊的格式版本是 ' + block.tactileProvenance + '，這支程式只讀得懂版本 ' + PROVENANCE_VERSION) };
  }
  if (!block.facts || typeof block.facts !== 'object' || Array.isArray(block.facts)) return { error: say('The provenance block has no facts', '出處區塊缺少 facts') };
  if (block.sources !== undefined && !Array.isArray(block.sources)) return { error: say('sources in the provenance block must be a list', '出處區塊的 sources 必須是清單') };
  return { block };
}

/**
 * Verifies a report. html: the report as text. opts.sources: [{name, bytes}] source files the user supplies;
 * opts.rulesText: rules.yaml as text. Returns
 *   {levels: {1, 2, 3}: 'pass' | 'fail' | 'skipped', problems: [text], warnings: [text], notes: [text], counts,
 *    rules: [result], ok}.
 * A note says what kind of source a value comes from when that limits what the levels prove; it is never a failure.
 * A problem is something a check found wrong. A warning is something a reader must know that no check can settle:
 * a number changed by hand, a number without a source, a level that was not done.
 */
export function verifyReport(html, opts = {}) {
  const problems = [];
  const warnings = [];
  const levels = { 1: 'skipped', 2: 'skipped', 3: 'skipped' };
  const counts = { ok: 0, mismatch: 0, missing: 0, was: 0, uncited: 0, charts: 0, chartsBad: 0 };
  const out = { levels, problems, warnings, notes: [], counts, rules: [], ok: false };
  const scan = scanReport(html);
  const { block, error } = readBlock(scan);
  if (error) {
    problems.push(error);
    levels[1] = 'fail';
    return out;
  }

  // Level 1: the page against its own block.
  let bad = 0;
  for (const { el, id, line } of scan.cited) {
    const at = say('Line ' + line + ', <' + el.tagName + ' data-fact="' + id + '">', '第 ' + line + ' 行的 <' + el.tagName + ' data-fact="' + id + '">');
    const fact = Object.prototype.hasOwnProperty.call(block.facts, id) ? block.facts[id] : undefined;
    if (!fact) { counts.missing++; bad++; problems.push(say(at + ': not found. This ID is not in the provenance block', at + '：找不到。這個 ID 不在出處區塊裡')); continue; }
    let want;
    try {
      want = shownText(fact, readShow({
        scale: attr(el, 'data-fact-scale'), digits: attr(el, 'data-fact-digits'),
        group: attr(el, 'data-fact-group'), sign: attr(el, 'data-fact-sign'),
      }));
    } catch (err) {
      if (!(err instanceof SpecError)) throw err;
      counts.mismatch++; bad++; problems.push(say(at + ': ' + err.message, at + '：' + err.message));
      continue;
    }
    const got = textOf(el).trim();
    if (got === want) counts.ok++;
    else { counts.mismatch++; bad++; problems.push(say(at + ': does not match. The report says "' + got + '". By the source value it must say "' + want + '"', at + '：不符。報告寫「' + got + '」，依來源值必須寫「' + want + '」')); }
  }
  // A chart is drawn again from the block and compared whole: bars, labels and the numbers written on it.
  for (const { el, line } of scan.charts) {
    const at = say('Line ' + line + ', <' + el.tagName + ' data-chart="' + attr(el, 'data-chart') + '">', '第 ' + line + ' 行的 <' + el.tagName + ' data-chart="' + attr(el, 'data-chart') + '">');
    counts.charts++;
    let want;
    try { want = drawChart(readChart(attrReader(el), block.facts), reportLang(html)); } catch (err) {
      if (!(err instanceof SpecError)) throw err;
      counts.chartsBad++; bad++; problems.push(say(at + ': ' + err.message, at + '：' + err.message));
      continue;
    }
    if (!holdsDrawing(el, want)) { counts.chartsBad++; bad++; problems.push(say(at + ': The chart differs from the chart drawn from the source values. Someone changed the chart or its attributes', at + '：圖表與來源值畫出的圖不同。有人改過圖，或改過它的屬性')); }
  }
  for (const { id, line } of scan.was) {
    counts.was++;
    warnings.push(say('The number on line ' + line + ' was changed by hand. It cited ' + id, '第 ' + line + ' 行的數字已偏離來源：有人改過它，原本引用 ' + id));
  }
  for (const u of scan.uncited) {
    counts.uncited++;
    warnings.push(say('Line ' + u.line + ' has a number with no source: "' + u.text + '"', '第 ' + u.line + ' 行有無出處的數字：「' + u.text + '」'));
  }
  const items = block.rules && Array.isArray(block.rules.items) ? block.rules.items : [];
  for (const item of items) {
    const r = runRule(item, block.facts);
    out.rules.push(r);
    if (r.result === 'fail') { bad++; problems.push(say('Rule "' + r.id + '" fails: ' + r.left + ' and ' + r.right + ' differ by ' + r.diff, '規則「' + r.id + '」違反：' + r.left + ' 與 ' + r.right + ' 相差 ' + r.diff)); }
    if (r.result === 'unknown') { bad++; problems.push(say('Rule "' + r.id + '" cannot be computed: ' + r.why, '規則「' + r.id + '」無法計算：' + r.why)); }
  }
  levels[1] = bad ? 'fail' : 'pass';

  // Levels 2 and 3: the block against the source files the user supplies.
  const supplied = new Map();
  for (const s of opts.sources || []) {
    const file = path.basename(s.name);
    if (supplied.has(file)) { problems.push(say('2 source files are both named "' + file + '"', '有 2 個來源檔都叫「' + file + '」')); continue; }
    supplied.set(file, s);
  }
  const listed = block.sources || [];
  // What kind of file a value comes from is in its ID, so the note cannot be taken out of the block.
  const files = new Set(listed.map((s) => s.file));
  for (const id of Object.keys(block.facts)) files.add(id.slice(0, id.indexOf('/')));
  for (const file of files) if (kindNote(file)) out.notes.push(say('"' + file + '": ' + kindNote(file) + ' Level 3 shows only that parsing the file again gives the same result.', '「' + file + '」：' + kindNote(file) + '第 3 級只表示重新解析的結果相同。'));
  const fresh = new Map(); // id → fact, re-read from the supplied files
  let hashBad = 0, valueBad = 0, absent = 0;
  for (const src of listed) {
    if (!supplied.has(src.file)) { absent++; continue; }
    const given = supplied.get(src.file);
    const bytes = given.bytes;
    if (sha256(bytes) !== src.sha256) {
      hashBad++;
      problems.push(say('The SHA-256 of the source file "' + src.file + '" differs from the one the report records. The file was changed after it was ingested, or it is not that file', '來源檔「' + src.file + '」的 SHA-256 與報告記錄的不同。這個檔案在擷取後改過，或者不是當時的檔案'));
    }
    let read;
    try { read = readSource(bytes, src.file, given.read); } catch (err) {
      if (!(err instanceof IngestError)) throw err;
      valueBad++; problems.push(err.message);
      continue;
    }
    for (const f of read.facts) fresh.set(f.id, f);
    for (const [id, row] of Object.entries(block.facts)) {
      if (!id.startsWith(src.file + '/')) continue;
      const now = fresh.get(id);
      if (!now) { valueBad++; problems.push(say(id + ': the provenance block has this value, but this cell of the source file is empty', id + '：出處區塊有這個值，來源檔的這個儲存格是空的')); continue; }
      for (const k of BLOCK_FIELDS) {
        if (same(row[k], now[k])) continue;
        valueBad++;
        problems.push(say(id + ', ' + k + ': the provenance block says ' + JSON.stringify(row[k]) + ', the source file has ' + JSON.stringify(now[k]), id + ' 的 ' + k + '：出處區塊寫 ' + JSON.stringify(row[k]) + '，來源檔是 ' + JSON.stringify(now[k])));
      }
    }
  }
  for (const file of supplied.keys()) {
    if (!listed.some((s) => s.file === file)) warnings.push(say('The report does not cite the source file "' + file + '", so nothing was checked against it', '報告沒有引用來源檔「' + file + '」，沒有用它核對'));
  }
  // A fact whose file the block does not list cannot be checked against anything.
  for (const id of Object.keys(block.facts)) {
    if (!listed.some((s) => id.startsWith(s.file + '/'))) { valueBad++; problems.push(say(id + ': sources in the provenance block does not list its source file', id + '：出處區塊的 sources 沒有列出它的來源檔')); }
  }
  if (supplied.size && listed.length) {
    levels[2] = hashBad ? 'fail' : absent ? 'skipped' : 'pass';
    levels[3] = valueBad ? 'fail' : absent ? 'skipped' : 'pass';
    if (absent) {
      const names = say(listed.filter((s) => !supplied.has(s.file)).map((s) => '"' + s.file + '"').join(', '), listed.filter((s) => !supplied.has(s.file)).map((s) => '「' + s.file + '」').join('、'));
      warnings.push(say('No source file was supplied for ' + names + '. Levels 2 and 3 checked only the supplied files and are not complete', '沒有提供來源檔 ' + names + '。第 2、3 級只核對了提供的檔案，不算完成'));
    }
  } else if (valueBad) levels[3] = 'fail';

  // The rules file, when supplied: the same file as at fill time, and the same rules once expanded.
  if (opts.rulesText !== undefined) {
    if (!block.rules) problems.push(say('The provenance block of the report has no rules, but the command gave a rules file', '報告的出處區塊沒有規則，但指令給了規則檔'));
    else {
      if (sha256(opts.rulesText) !== block.rules.sha256) problems.push(say('The SHA-256 of the rules file differs from the one the report records. The rules file was changed after the fill, or it is not that file', '規則檔的 SHA-256 與報告記錄的不同。規則檔在填入後改過，或者不是當時的檔案'));
      if (!absent && supplied.size) {
        try {
          const again = expandRules(parseRules(opts.rulesText), fresh);
          if (!same(again, block.rules.items)) problems.push(say('The rules in the provenance block differ from what the rules file expands to', '出處區塊裡的規則與規則檔展開的結果不同'));
        } catch (err) {
          if (!(err instanceof SpecError)) throw err;
          problems.push(err.message);
        }
      }
    }
  } else if (block.rules) warnings.push(say('No rules file was supplied. The rules were computed again from the provenance block only; the rules themselves were not checked', '沒有提供規則檔。規則只用出處區塊裡的內容重算，沒有核對規則本身'));

  if (levels[2] === 'skipped') warnings.push(say('Not checked against the source file. Only the report and its own provenance block were found to agree', '尚未與來源檔核對。只確認了報告與它自己的出處區塊一致'));
  out.ok = problems.length === 0;
  return out;
}
