// Exact decimal arithmetic for docs/spec/provenance.md 6.3 and 8: a value is n × 10^e with n a BigInt.
// Sums, differences and the shown text never pass through binary floating point.

const DEC = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/** A decimal from a number or a decimal string ('1e-8', '0.5', '-12'). Returns null when it is not one. */
export function dec(x) {
  // String(number) is the shortest text that reads back as the same double.
  const s = typeof x === 'number' ? (Number.isFinite(x) ? String(x) : '') : typeof x === 'string' ? x.trim() : '';
  const m = DEC.exec(s);
  if (!m || !(m[2] || m[3])) return null;
  const frac = m[3] || '';
  const exp = m[4] ? Number(m[4]) : 0;
  if (Math.abs(exp) > 400) return null;
  let n = BigInt((m[2] || '0') + frac);
  if (m[1] === '-') n = -n;
  return { n, e: exp - frac.length };
}

const pow10 = (k) => 10n ** BigInt(k);
const align = (a, b) => {
  const e = Math.min(a.e, b.e);
  return [a.n * pow10(a.e - e), b.n * pow10(b.e - e), e];
};

export const mul = (a, b) => ({ n: a.n * b.n, e: a.e + b.e });
export const add = (a, b) => { const [x, y, e] = align(a, b); return { n: x + y, e }; };
export const sub = (a, b) => { const [x, y, e] = align(a, b); return { n: x - y, e }; };
export const abs = (a) => ({ n: a.n < 0n ? -a.n : a.n, e: a.e });
export const sign = (a) => (a.n < 0n ? -1 : a.n > 0n ? 1 : 0);
export const cmp = (a, b) => { const [x, y] = align(a, b); return x < y ? -1 : x > y ? 1 : 0; };

/** Plain decimal text without an exponent or needless zeros: for messages. */
export function toText(a) {
  let { n, e } = a;
  const neg = n < 0n;
  if (neg) n = -n;
  let s = n.toString();
  if (e >= 0) s += '0'.repeat(e);
  else {
    s = s.padStart(-e + 1, '0');
    s = (s.slice(0, e) + '.' + s.slice(e)).replace(/\.?0+$/, '');
  }
  return (neg && s !== '0' ? '-' : '') + s;
}

/**
 * The text for a value at `digits` decimals: half rounds away from zero, thousands are grouped unless group is
 * false, zero carries no sign, and plus puts '+' before a positive number.
 */
export function format(a, { digits = 0, group = true, plus = false } = {}) {
  let n = a.n;
  const shift = a.e + digits;
  if (shift >= 0) n *= pow10(shift);
  else {
    const p = pow10(-shift);
    const neg = n < 0n;
    let q = neg ? -n : n;
    const r = q % p;
    q /= p;
    if (r * 2n >= p) q += 1n;
    n = neg ? -q : q;
  }
  const neg = n < 0n;
  const s = (neg ? -n : n).toString().padStart(digits + 1, '0');
  let int = digits ? s.slice(0, -digits) : s;
  if (group) int = int.replace(/\B(?=(\d{3})+$)/g, ',');
  const lead = n === 0n ? '' : neg ? '-' : plus ? '+' : '';
  return lead + int + (digits ? '.' + s.slice(-digits) : '');
}

/**
 * The language of messages, 'en' or 'zh' (Traditional Chinese), decided the first time a message is made and kept
 * in globalThis.TACTILE_LANG. A value already there wins (the editor and --lang set it). Otherwise the first of
 * the environment variables TACTILE_LANG, LC_ALL, LC_MESSAGES and LANG that is set decides, then the system's
 * locale: a value that starts with 'zh' means Chinese, anything else English.
 */
function messageLang() {
  const g = globalThis;
  if (g.TACTILE_LANG === 'en' || g.TACTILE_LANG === 'zh') return g.TACTILE_LANG;
  const env = (g.process && g.process.env) || {};
  let v = env.TACTILE_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG;
  if (!v) { try { v = Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) { v = ''; } }
  g.TACTILE_LANG = /^zh/i.test(String(v || '')) ? 'zh' : 'en';
  return g.TACTILE_LANG;
}

/** One text in the language of messages: `zh` when that is Chinese, `en` otherwise. */
export function say(en, zh) {
  return messageLang() === 'zh' ? zh : en;
}

/**
 * A problem with how a report or a rule is written. `message` is the text tactile-ingest prints, in the language
 * of messages (English, or Traditional Chinese when the user chose it; see say). `code` (a short English name) and
 * `vars` (what varies in the message) let the editor say the same in its interface language
 * (src/js/ingest-text.js); an error made without a code is shown as its message.
 */
export class SpecError extends Error {
  constructor(message, code, vars) {
    super(message);
    if (code) { this.code = code; this.vars = vars || {}; }
  }
}
const err = (code, vars, message) => new SpecError(message, code, vars);

const SCALE = /^\d+(\.\d+)?([eE][+-]?\d+)?$|^\.\d+([eE][+-]?\d+)?$/;

/**
 * Checks the display attributes of one element (spec 6.2). attrs: {scale, digits, group, sign}, each a string
 * or undefined. Returns {converts, scale, digits, group, plus}; throws SpecError naming the attribute.
 */
export function readShow(attrs) {
  const bad = (code, name, value, want) => err(code, { name, value }, say('Attribute ' + name + ' has the value "' + value + '", which is not allowed: ' + want, '屬性 ' + name + ' 的值「' + value + '」不合規定：' + want));
  const out = { converts: attrs.scale !== undefined || attrs.digits !== undefined, scale: null, digits: 0, group: true, plus: false };
  if (attrs.scale !== undefined) {
    const s = attrs.scale.trim();
    out.scale = SCALE.test(s) ? dec(s) : null;
    if (!out.scale || sign(out.scale) <= 0) throw bad('show.scale', 'data-fact-scale', attrs.scale, say('it must be a positive number, such as 1e-8, 100 or 0.001', '必須是正數，例如 1e-8、100、0.001'));
  }
  if (attrs.digits !== undefined) {
    if (!/^(\d|10)$/.test(attrs.digits.trim())) throw bad('show.digits', 'data-fact-digits', attrs.digits, say('it must be a whole number from 0 to 10', '必須是 0～10 的整數'));
    out.digits = Number(attrs.digits.trim());
  }
  if (attrs.group !== undefined) {
    if (attrs.group !== 'on' && attrs.group !== 'off') throw bad('show.group', 'data-fact-group', attrs.group, say('it must be on or off', '必須是 on 或 off'));
    out.group = attrs.group === 'on';
  }
  if (attrs.sign !== undefined) {
    if (attrs.sign !== 'auto' && attrs.sign !== 'always') throw bad('show.sign', 'data-fact-sign', attrs.sign, say('it must be auto or always', '必須是 auto 或 always'));
    out.plus = attrs.sign === 'always';
  }
  return out;
}

/** The text an element shows for `fact` (spec 6.3). show: what readShow returned. */
export function shownText(fact, show) {
  if (!show.converts) return String(fact.text);
  if (fact.type !== 'number') throw err('show.not-number', { type: fact.type }, say('The element has conversion attributes, but the value has the type ' + fact.type + ', not number', '有換算屬性，但值的類型是 ' + fact.type + '，不是 number'));
  let v = dec(fact.value);
  if (!v) throw err('show.not-finite', { value: fact.value }, say('The value ' + fact.value + ' is not a finite number', '值 ' + fact.value + ' 不是有限的數字'));
  if (show.scale) v = mul(v, show.scale);
  return format(v, { digits: show.digits, group: show.group, plus: show.plus });
}
