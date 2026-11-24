// `fill` of docs/spec/provenance.md: writes each cited number into the report and embeds the provenance block.
import { createHash } from 'node:crypto';
import { parse as parseHtml, parseFragment } from 'parse5';
import { chartIds, drawChart, readChart, reportLang } from './chart.mjs';
import { readShow, shownText, SpecError } from './decimal.mjs';
import { TOOL } from './ingest.mjs';
import { say } from './lang.mjs';
import { expandRules, parseRules, runRule } from './rules.mjs';

export const PROVENANCE_VERSION = 1;
export const BLOCK_ID = 'tactile-provenance';

/** What stops a fill: every problem found, one per line. */
export class FillError extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.problems = problems;
  }
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const NOT_PROSE = new Set(['script', 'style', 'template']);
const attr = (el, name) => { const a = el.attrs && el.attrs.find((x) => x.name === name); return a ? a.value : undefined; };
const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOf = (el) => (el.childNodes || []).map((n) => (n.nodeName === '#text' ? n.value : n.childNodes ? textOf(n) : '')).join('');
const clip = (s) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > 40 ? t.slice(0, 39) + '…' : t; };

/**
 * Where a report cites, has cited, and does not cite. Returns {cited: [{el, id, line}], was: [{id, line}],
 * uncited: [{line, text}], charts: [{el, line}], body, block} with body and block the <body> and the existing
 * provenance block. What is inside a chart is the chart's own: it is not listed under cited or uncited.
 */
export function scanReport(html) {
  const doc = parseHtml(html, { sourceCodeLocationInfo: true });
  const out = { cited: [], was: [], uncited: [], charts: [], body: null, block: null };
  const walk = (node, inBody, covered) => {
    for (const n of node.childNodes || []) {
      const line = n.sourceCodeLocation ? n.sourceCodeLocation.startLine : 0;
      if (n.nodeName === '#text') {
        if (inBody && !covered && /[0-9]/.test(n.value)) out.uncited.push({ line, text: clip(n.value) });
        continue;
      }
      if (!n.tagName) continue;
      if (n.tagName === 'body' && !out.body) out.body = n;
      if (n.tagName === 'script' && attr(n, 'id') === BLOCK_ID) { if (!out.block) out.block = n; continue; }
      if (attr(n, 'data-chart') !== undefined) { out.charts.push({ el: n, line }); continue; }
      const fact = attr(n, 'data-fact');
      const was = attr(n, 'data-fact-was');
      if (fact !== undefined) out.cited.push({ el: n, id: fact, line });
      if (was !== undefined) out.was.push({ id: was, line });
      if (NOT_PROSE.has(n.tagName)) continue;
      // Text inside a drawing is labels and coordinates, not prose; its marks may still cite.
      const quiet = n.tagName === 'svg' || fact !== undefined || was !== undefined || attr(n, 'data-fact-none') !== undefined;
      walk(n, inBody || n.tagName === 'body', covered || quiet);
    }
  };
  walk(doc, false, false);
  return out;
}

/** A tree as nested lists, without the white space between elements and with attributes in name order. */
function shape(nodes) {
  const out = [];
  for (const n of nodes || []) {
    if (n.nodeName === '#text') { if (n.value.trim()) out.push(n.value); continue; }
    if (!n.tagName) continue;
    out.push([n.tagName, (n.attrs || []).map((a) => [a.name, a.value]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)), shape(n.childNodes)]);
  }
  return out;
}

/** True when the element holds exactly the drawing `svg` (text), whatever the white space and attribute order. */
export function holdsDrawing(el, svg) {
  return JSON.stringify(shape(el.childNodes)) === JSON.stringify(shape(parseFragment(svg).childNodes));
}

/** The attribute reader readChart wants, for a parse5 element. */
export const attrReader = (el) => (name) => attr(el, name);

/** The block's JSON as it sits in the page: no '<', so no markup can start inside it. */
export function blockMarkup(block) {
  return '<script type="application/json" id="' + BLOCK_ID + '">\n' + JSON.stringify(block, null, 1).replace(/</g, '\\u003c') + '\n</script>';
}

/**
 * Fills a draft. html: the report; facts: facts.json parsed; opts.rulesText: rules.yaml as text (optional);
 * opts.now: Date for filledAt. Returns {html, warnings: [text], filled, rules: [result]}; throws FillError.
 */
export function fillReport(html, facts, opts = {}) {
  if (!facts || facts.tactileFacts !== 1) {
    throw new FillError([say('facts.json has format version ' + (facts && facts.tactileFacts) + '. This program reads only version 1', 'facts.json 的格式版本是 ' + (facts && facts.tactileFacts) + '，這支程式只讀得懂版本 1')]);
  }
  const byId = new Map(facts.facts.map((f) => [f.id, f]));
  const problems = [];
  const warnings = [];
  const edits = [];
  const used = new Set();
  const scan = scanReport(html);
  let charts = 0;

  for (const { el, id, line } of scan.cited) {
    const at = say('Line ' + line + ', <' + el.tagName + ' data-fact="' + id + '">', '第 ' + line + ' 行的 <' + el.tagName + ' data-fact="' + id + '">');
    const fact = byId.get(id);
    if (!fact) { problems.push(say(at + ': this ID is not in facts.json', at + '：這個 ID 不在 facts.json 裡')); continue; }
    if (VOID.has(el.tagName)) { problems.push(say(at + ': this kind of element cannot hold text', at + '：這種元素不能有文字內容')); continue; }
    if ((el.childNodes || []).some((n) => n.tagName)) { problems.push(say(at + ': an element with data-fact may hold only text, not child elements', at + '：帶 data-fact 的元素只能含文字，不可含子元素')); continue; }
    let text;
    try {
      text = shownText(fact, readShow({
        scale: attr(el, 'data-fact-scale'), digits: attr(el, 'data-fact-digits'),
        group: attr(el, 'data-fact-group'), sign: attr(el, 'data-fact-sign'),
      }));
    } catch (err) {
      if (!(err instanceof SpecError)) throw err;
      problems.push(say(at + ': ' + err.message, at + '：' + err.message));
      continue;
    }
    const loc = el.sourceCodeLocation;
    const from = loc.startTag.endOffset;
    const to = loc.endTag ? loc.endTag.startOffset : loc.endOffset;
    const before = textOf(el).trim();
    if (before && before !== text) warnings.push(say(at + ' said "' + clip(before) + '". It now holds the source value "' + text + '"', at + ' 原本寫「' + clip(before) + '」，已改成來源值「' + text + '」'));
    edits.push([from, to, escapeText(text)]);
    used.add(id);
  }
  for (const { el, line } of scan.charts) {
    const at = say('Line ' + line + ', <' + el.tagName + ' data-chart="' + attr(el, 'data-chart') + '">', '第 ' + line + ' 行的 <' + el.tagName + ' data-chart="' + attr(el, 'data-chart') + '">');
    if (VOID.has(el.tagName)) { problems.push(say(at + ': this kind of element cannot hold content', at + '：這種元素不能有內容')); continue; }
    if (attr(el, 'data-fact') !== undefined) { problems.push(say(at + ': one element must not have both data-chart and data-fact', at + '：同一個元素不可同時有 data-chart 與 data-fact')); continue; }
    // A chart drawn by an earlier fill is replaced; anything else inside is not ours to remove.
    const kids = (el.childNodes || []).filter((n) => !(n.nodeName === '#text' && !n.value.trim()));
    if (kids.some((n) => !(n.tagName === 'svg' && attr(n, 'data-chart-drawn') !== undefined))) {
      problems.push(say(at + ': an element with data-chart must be empty. Write the title and caption outside the element', at + '：帶 data-chart 的元素必須是空的。標題與說明寫在元素外面'));
      continue;
    }
    let chart;
    try { chart = readChart(attrReader(el), byId); } catch (err) {
      if (!(err instanceof SpecError)) throw err;
      problems.push(say(at + ': ' + err.message, at + '：' + err.message));
      continue;
    }
    const loc = el.sourceCodeLocation;
    edits.push([loc.startTag.endOffset, loc.endTag ? loc.endTag.startOffset : loc.endOffset, '\n' + drawChart(chart, reportLang(html)) +'\n']);
    for (const id of chartIds(chart)) used.add(id);
    charts++;
  }
  for (const { id, line } of scan.was) {
    if (byId.has(id)) used.add(id);
    else warnings.push(say('Line ' + line + ', data-fact-was="' + id + '": this ID is not in facts.json', '第 ' + line + ' 行的 data-fact-was="' + id + '"：這個 ID 不在 facts.json 裡'));
  }

  let rules = null;
  let items = [];
  if (opts.rulesText !== undefined) {
    try {
      rules = parseRules(opts.rulesText);
      items = expandRules(rules, byId);
    } catch (err) {
      if (!(err instanceof SpecError)) throw err;
      problems.push(err.message);
    }
  }
  if (problems.length) throw new FillError(problems);

  const results = items.map((item) => runRule(item, byId));
  for (const r of results) {
    if (r.result === 'fail') warnings.push(say('Rule "' + r.id + '" fails: ' + r.left + ' and ' + r.right + ' differ by ' + r.diff, '規則「' + r.id + '」違反：' + r.left + ' 與 ' + r.right + ' 相差 ' + r.diff));
    if (r.result === 'unknown') warnings.push(say('Rule "' + r.id + '" cannot be computed: ' + r.why, '規則「' + r.id + '」無法計算：' + r.why));
  }
  for (const item of items) for (const id of [item.total, item.left, item.right, ...(item.parts || [])]) if (id) used.add(id);
  for (const u of scan.uncited) warnings.push(say('Line ' + u.line + ' has a number with no source: "' + u.text + '"', '第 ' + u.line + ' 行有無出處的數字：「' + u.text + '」'));

  const block = {
    tactileProvenance: PROVENANCE_VERSION,
    tool: { ...TOOL },
    filledAt: (opts.now || new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    sources: [],
    facts: {},
  };
  for (const f of facts.facts) {
    if (!used.has(f.id)) continue;
    const row = { type: f.type, value: f.value, text: f.text };
    if (f.formula !== undefined) row.formula = f.formula;
    if (f.labels !== undefined) row.labels = f.labels;
    block.facts[f.id] = row;
  }
  for (const s of facts.sources) {
    if (Object.keys(block.facts).some((id) => id.startsWith(s.file + '/'))) block.sources.push({ file: s.file, sha256: s.sha256, bytes: s.bytes });
  }
  if (rules) {
    block.rules = { sha256: createHash('sha256').update(opts.rulesText).digest('hex') };
    if (rules.approvedBy !== undefined) block.rules.approvedBy = rules.approvedBy;
    if (rules.approvedOn !== undefined) block.rules.approvedOn = rules.approvedOn;
    block.rules.items = items;
  }

  // The block replaces an earlier one and sits last in <body>.
  if (scan.block) {
    const loc = scan.block.sourceCodeLocation;
    let end = loc.endOffset;
    if (html[end] === '\r') end++;
    if (html[end] === '\n') end++;
    edits.push([loc.startOffset, end, '']);
  }
  const bodyEnd = scan.body && scan.body.sourceCodeLocation && scan.body.sourceCodeLocation.endTag;
  const at = bodyEnd ? bodyEnd.startOffset : html.length;
  edits.push([at, at, (at > 0 && html[at - 1] !== '\n' ? '\n' : '') + blockMarkup(block) + '\n']);

  // Applied from the end of the text, so earlier offsets stay true. An insertion sorts after a removal that ends there.
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = html;
  for (const [from, to, text] of edits) out = out.slice(0, from) + text + out.slice(to);
  return { html: out, warnings, filled: scan.cited.length, charts, rules: results, block };
}
