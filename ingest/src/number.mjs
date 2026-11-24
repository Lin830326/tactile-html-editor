// Numbers written as text. A spreadsheet stores a number; a Word table or a PDF page stores the characters a
// reader sees. Only text that is a number and nothing else, in one of the forms below, becomes a number: anything
// else stays text, because a guess here would be a number nobody wrote.

const CURRENCY = '(?:NT\\$|US\\$|HK\\$|[$€£¥])';
// 1,234,567 (separators every 3 digits) or 1234567, with an optional fraction.
const DIGITS = '(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)(?:\\.[0-9]+)?';
const WHOLE = new RegExp('^(\\()?([-+\\u2212])?' + CURRENCY + '?\\s?([-+\\u2212])?(' + DIGITS + ')(%)?(\\))?$');
// Inside a sentence: not part of a word, a code or a longer number (Q3, A4, 1.2.3, 2026-09-30).
const TOKEN = new RegExp('(?<![A-Za-z0-9_.,/:\\-\\u2212])[-\\u2212]?' + DIGITS + '%?(?![A-Za-z0-9_/:\\-]|[.,][0-9])', 'g');

/** "12.5" with the point moved 2 places left, as text: "0.125". No floating-point division. */
function percentOf(digits) {
  const [whole, frac = ''] = digits.split('.');
  const padded = whole.padStart(3, '0');
  return padded.slice(0, -2) + '.' + padded.slice(-2) + frac;
}

/**
 * The number a text spells, or null when the text is not just a number. Understood: separators every 3 digits,
 * a fraction, a leading sign (- or U+2212), parentheses for a negative amount, a currency sign in front, and
 * a % at the end (the value is then the hundredth, as a spreadsheet stores it). Not understood, on purpose:
 * units after the number (4.82億, 12 km), dates, ranges, and separators not in groups of 3.
 */
export function parseNumberText(text) {
  const s = String(text).trim();
  const m = WHOLE.exec(s);
  if (!m) return null;
  const [, open, sign1, sign2, digits, percent, close] = m;
  if (!!open !== !!close) return null;
  if ((sign1 && sign2) || (open && (sign1 || sign2))) return null;
  const plain = digits.replace(/,/g, '');
  const value = Number(percent ? percentOf(plain) : plain);
  if (!Number.isFinite(value)) return null;
  const sign = sign1 || sign2;
  return open || sign === '-' || sign === '−' ? -value : value;
}

/** The numbers that stand in a sentence, in order: [{text, value}]. */
export function numbersIn(text) {
  const out = [];
  for (const m of String(text).matchAll(TOKEN)) {
    const value = parseNumberText(m[0]);
    if (value !== null) out.push({ text: m[0], value });
  }
  return out;
}
