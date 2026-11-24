// The rules of docs/spec/provenance.md 8 without the reading of YAML: check, expand ranges, compute.
// The editor runs this file too (build.mjs puts it in src/js/ingest-core.js), so it imports only decimal.mjs.
import { abs, add, cmp, dec, say, SpecError, sub, toText } from './decimal.mjs';

export const RULES_VERSION = 1;

const err = (code, vars, message) => new SpecError(message, code, vars);

const CELL = /^([A-Z]{1,3})([0-9]{1,7})$/;
const RANGE_TAIL = /^([A-Z]{1,3}[0-9]{1,7}):([A-Z]{1,3}[0-9]{1,7})$/;

function cellAt(addr) {
  const m = CELL.exec(addr);
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c, r: Number(m[2]) };
}
function cellName(c, r) {
  let s = '';
  for (let n = c; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s + r;
}

/** 'file/sheet/D10:D13' → {prefix: 'file/sheet/', from, to}, or null for a single ID. */
function asRange(ref) {
  const cut = ref.lastIndexOf('/');
  const m = cut < 0 ? null : RANGE_TAIL.exec(ref.slice(cut + 1));
  return m ? { prefix: ref.slice(0, cut + 1), from: cellAt(m[1]), to: cellAt(m[2]) } : null;
}

/**
 * Reads a rules file that is already parsed (the object rules.yaml holds) into {report, approvedBy, approvedOn,
 * items}. Each item is {id, type, tolerance (text), note, total + parts | left + right}; parts stay as written
 * (IDs and ranges). Throws SpecError with the rule's name.
 */
export function readRules(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw err('rules.top', {}, say('The top level of the rules file must be fields, such as tactileRules and rules', '規則檔的最外層必須是欄位，例如 tactileRules 與 rules'));
  if (doc.tactileRules === undefined) throw err('rules.no-version', {}, say('The rules file has no tactileRules (the format version)', '規則檔缺少 tactileRules（格式版本）'));
  if (doc.tactileRules !== RULES_VERSION) {
    throw err('rules.version', { found: String(doc.tactileRules), want: RULES_VERSION }, say('The rules file has format version ' + doc.tactileRules + '. This program reads only version ' + RULES_VERSION, '規則檔的格式版本是 ' + doc.tactileRules + '，這支程式只讀得懂版本 ' + RULES_VERSION));
  }
  if (!Array.isArray(doc.rules)) throw err('rules.not-list', {}, say('rules in the rules file must be a list', '規則檔的 rules 必須是清單'));
  // code and vars name the field for the editor; `what` names it in the message.
  const str = (v, what, code, vars) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string' && typeof v !== 'number') throw err(code, vars, say(what + ' must be text', what + ' 必須是文字'));
    return String(v);
  };
  const top = (field) => str(doc[field], field, 'rules.field-text', { field });
  const out = { report: top('report'), approvedBy: top('approvedBy'), approvedOn: top('approvedOn'), items: [] };
  const seen = new Set();
  doc.rules.forEach((r, i) => {
    const where = say('Rule ' + (i + 1), '第 ' + (i + 1) + ' 條規則');
    if (!r || typeof r !== 'object' || Array.isArray(r)) throw err('rules.item-shape', { n: i + 1 }, say(where + ' must be a set of fields', where + '必須是一組欄位'));
    const id = str(r.id, say(where + ': id', where + '的 id'), 'rules.id-text', { n: i + 1 });
    if (!id) throw err('rules.no-id', { n: i + 1 }, say(where + ' has no id', where + '缺少 id'));
    const name = say('Rule "' + id + '"', '規則「' + id + '」');
    if (seen.has(id)) throw err('rules.duplicate', { rule: id }, say(name + ' appears 2 times. A rule id must be unique', name + '出現 2 次。規則的 id 不可重複'));
    seen.add(id);
    const ref = (key) => {
      if (typeof r[key] !== 'string' || !r[key].trim()) throw err('rules.ref', { rule: id, key }, say(name + ' has no ' + key + ', or it is not an ID', name + '缺少 ' + key + '，或它不是 ID'));
      const v = r[key].trim();
      if (asRange(v)) throw err('rules.ref-range', { rule: id, key }, say(name + ': ' + key + ' must be 1 cell, not a range', name + '的 ' + key + ' 必須是 1 個儲存格，不可是範圍'));
      return v;
    };
    const item = { id, type: r.type };
    let tol = '0';
    if (r.tolerance !== undefined && r.tolerance !== null) {
      const d = dec(typeof r.tolerance === 'number' ? r.tolerance : String(r.tolerance));
      if (!d || d.n < 0n) throw err('rules.tolerance', { rule: id }, say(name + ': tolerance must be 0 or a positive number', name + '的 tolerance 必須是 0 或正數'));
      tol = toText(d);
    }
    if (r.type === 'sum') {
      item.total = ref('total');
      const parts = typeof r.parts === 'string' ? [r.parts] : r.parts;
      if (!Array.isArray(parts) || !parts.length || parts.some((p) => typeof p !== 'string' || !p.trim())) {
        throw err('rules.parts', { rule: id }, say(name + ': parts must be 1 range, or a list of IDs', name + '的 parts 必須是 1 個範圍，或 ID 的清單'));
      }
      item.parts = parts.map((p) => p.trim());
    } else if (r.type === 'equal') {
      item.left = ref('left');
      item.right = ref('right');
    } else {
      throw err('rules.type', { rule: id, type: String(r.type) }, say(name + ' has the type "' + r.type + '". Only sum and equal are supported', name + '的 type 是「' + r.type + '」。只支援 sum 與 equal'));
    }
    item.tolerance = tol;
    const note = str(r.note, say(name + ': note', name + '的 note'), 'rules.note-text', { rule: id });
    if (note) item.note = note;
    out.items.push(item);
  });
  return out;
}

/**
 * Ranges written out as single IDs, against the facts that exist (Map id → fact). A range keeps the cells that
 * hold something; an ID that is not a fact throws SpecError (spec 6.6). Returns items with `parts` as IDs.
 */
export function expandRules(rules, facts) {
  const need = (id, name) => {
    if (!facts.has(id)) throw err('rules.fact-missing', { rule: name, id }, say('Rule "' + name + '" refers to ' + id + ', which is not in facts.json', '規則「' + name + '」引用的 ' + id + ' 不在 facts.json 裡'));
    return id;
  };
  return rules.items.map((item) => {
    const out = { ...item };
    if (item.type === 'equal') { need(item.left, item.id); need(item.right, item.id); return out; }
    need(item.total, item.id);
    out.parts = [];
    for (const p of item.parts) {
      const range = asRange(p);
      if (!range) { out.parts.push(need(p, item.id)); continue; }
      let count = 0;
      for (let r = Math.min(range.from.r, range.to.r); r <= Math.max(range.from.r, range.to.r); r++) {
        for (let c = Math.min(range.from.c, range.to.c); c <= Math.max(range.from.c, range.to.c); c++) {
          const id = range.prefix + cellName(c, r);
          const f = facts.get(id);
          if (!f) continue;
          count++;
          // Text, dates and booleans in a range are passed over, as a sum in the sheet passes over them.
          if (f.type === 'number' || f.type === 'error') out.parts.push(id);
        }
      }
      if (!count) throw err('rules.range-empty', { rule: item.id, range: p }, say('Rule "' + item.id + '": the range ' + p + ' holds no values', '規則「' + item.id + '」的範圍 ' + p + ' 裡沒有任何值'));
    }
    if (!out.parts.length) throw err('rules.no-numbers', { rule: item.id }, say('Rule "' + item.id + '": parts holds no numbers', '規則「' + item.id + '」的 parts 裡沒有數字'));
    return out;
  });
}

/**
 * One expanded rule against facts (Map or plain object id → fact): {id, result: 'pass' | 'fail' | 'unknown',
 * left, right, diff (decimal text), why}. left is the total or the left side; right the sum or the right side.
 */
export function runRule(item, facts) {
  const get = (id) => (facts instanceof Map ? facts.get(id) : facts[id]);
  const num = (id) => {
    const f = get(id);
    if (!f) return { why: say(id + ' does not exist', id + ' 不存在') };
    if (f.type !== 'number') return { why: say(id + ' has the type ' + f.type + ', not number', id + ' 的類型是 ' + f.type + '，不是 number') };
    const d = dec(f.value);
    return d ? { d } : { why: say(id + ' is not a finite number', id + ' 不是有限的數字') };
  };
  const unknown = (why) => ({ id: item.id, result: 'unknown', why });
  const a = num(item.type === 'sum' ? item.total : item.left);
  if (a.why) return unknown(a.why);
  let b;
  if (item.type === 'sum') {
    let total = dec('0');
    for (const id of item.parts) {
      const p = num(id);
      if (p.why) return unknown(p.why);
      total = add(total, p.d);
    }
    b = total;
  } else {
    const r = num(item.right);
    if (r.why) return unknown(r.why);
    b = r.d;
  }
  const diff = sub(a.d, b);
  const tol = dec(item.tolerance === undefined ? '0' : String(item.tolerance));
  if (!tol || tol.n < 0n) return unknown(say('tolerance is not 0 or a positive number', 'tolerance 不是 0 或正數'));
  return { id: item.id, result: cmp(abs(diff), tol) <= 0 ? 'pass' : 'fail', left: toText(a.d), right: toText(b), diff: toText(diff) };
}

/**
 * A reference as the IDs it stands for: a single ID as itself, a range as the cells in it that hold something,
 * row by row. facts: Map or plain object id → fact.
 */
export function expandRef(ref, facts) {
  const range = asRange(ref);
  if (!range) return [ref];
  const has = (id) => (facts instanceof Map ? facts.has(id) : Object.prototype.hasOwnProperty.call(facts, id));
  const out = [];
  for (let r = Math.min(range.from.r, range.to.r); r <= Math.max(range.from.r, range.to.r); r++) {
    for (let c = Math.min(range.from.c, range.to.c); c <= Math.max(range.from.c, range.to.c); c++) {
      const id = range.prefix + cellName(c, r);
      if (has(id)) out.push(id);
    }
  }
  return out;
}
