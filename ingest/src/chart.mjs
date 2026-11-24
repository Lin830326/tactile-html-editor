// Charts of docs/spec/provenance.md 9: a bar, line or pie chart as inline SVG, every coordinate computed here from
// the source values. The same input always gives the same text, so `verify` can draw the chart again and compare.
import { dec, format, readShow, say, shownText, SpecError } from './decimal.mjs';
import { expandRef } from './rules-core.mjs';

const err = (code, vars, message) => new SpecError(message, code, vars);

export const CHART_TYPES = ['bar', 'line', 'pie'];
// The words a chart carries (its name for screen readers, the joints of a tooltip) follow the report's language.
// A report that names no language, or names Chinese, gets the Chinese ones, as every report did before;
// one in Simplified Chinese (zh-Hans, zh-CN, zh-SG) gets the mainland terms.
const WORDS = {
  zh: { bar: '長條圖', line: '折線圖', pie: '圓餅圖', of: '，', is: '：' },
  hans: { bar: '柱状图', line: '折线图', pie: '饼图', of: '，', is: '：' },
  en: { bar: 'Bar chart', line: 'Line chart', pie: 'Pie chart', of: ', ', is: ': ' },
};
const wordsOf = (lang) => (/^zh-(hans|cn|sg)/i.test(lang || '') ? WORDS.hans : !lang || /^zh/i.test(lang) ? WORDS.zh : WORDS.en);
/** The language of a report, as its <html lang> says ('' when it says nothing). fill and verify both ask this. */
export function reportLang(html) {
  const m = /<html\b[^>]*?\slang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(String(html));
  return m ? (m[1] || m[2] || m[3] || '').trim() : '';
}
// Categorical colours in a fixed order; neighbours stay apart for colour-blind readers. Never cycled: 8 is the cap.
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const MAX_SERIES = COLORS.length;
const MAX_POINTS = 24;
const LABEL_ALL_UP_TO = 12;
const FONT = 12;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** A coordinate as text: 2 decimals at most, no trailing zeros, never '-0'. */
const n2 = (x) => { const r = Math.round(x * 100) / 100; return String(Object.is(r, -0) ? 0 : r); };
/** A rough width in px at the chart's font size: wide characters count 1 em, the rest 0.58 em. */
const widthOf = (s) => { let w = 0; for (const ch of String(s)) w += ch.codePointAt(0) > 0x2e7f ? FONT : FONT * 0.58; return w; };
function fit(s, room) {
  s = String(s);
  if (widthOf(s) <= room) return s;
  let out = '';
  for (const ch of s) { if (widthOf(out + ch + '…') > room) break; out += ch; }
  return out + '…';
}
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ' ' + k + '="' + esc(v) + '"').join('');
const tag = (name, o, inner) => '<' + name + attrs(o) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>');

/** 'a; b:c | d' → [[refs], [refs]]: series are split at '|', the references in one at ';'. */
function refList(text) {
  return String(text).split(';').map((s) => s.trim()).filter(Boolean);
}

/**
 * Reads the chart attributes of one element. get(name) returns the attribute or undefined; facts: Map or object
 * id → fact. Returns {type, series: [[id]], labels: [id], names: [id], show, raw: {scale, digits, group}};
 * throws SpecError.
 */
export function readChart(get, facts) {
  const lookup = (id) => (facts instanceof Map ? facts.get(id) : Object.prototype.hasOwnProperty.call(facts, id) ? facts[id] : undefined);
  const type = get('data-chart');
  if (!CHART_TYPES.includes(type)) throw err('chart.type', { type: String(type) }, say('data-chart has the value "' + type + '". Only bar, line and pie are supported', 'data-chart 的值是「' + type + '」。只支援 bar、line、pie'));
  const ids = (name, text) => {
    const out = [];
    for (const ref of refList(text)) {
      const got = expandRef(ref, facts);
      if (!got.length) throw err('chart.range-empty', { name, range: ref }, say(name + ': the range ' + ref + ' holds no values', name + ' 的範圍 ' + ref + ' 裡沒有任何值'));
      for (const id of got) {
        if (!lookup(id)) throw err('chart.fact-missing', { name, id }, say(name + ' refers to ' + id + ', which is not in the source data', name + ' 引用的 ' + id + ' 不在來源資料裡'));
        out.push(id);
      }
    }
    return out;
  };
  const factsText = get('data-chart-facts');
  if (!factsText || !factsText.trim()) throw err('chart.no-facts', {}, say('The chart has no data-chart-facts', '圖表缺少 data-chart-facts'));
  const series = factsText.split('|').map((part) => ids('data-chart-facts', part));
  if (series.some((s) => !s.length)) throw err('chart.series-empty', {}, say('data-chart-facts has 1 empty series', 'data-chart-facts 有 1 組數列是空的'));
  const labelsText = get('data-chart-labels');
  if (!labelsText || !labelsText.trim()) throw err('chart.no-labels', {}, say('The chart has no data-chart-labels', '圖表缺少 data-chart-labels'));
  const labels = ids('data-chart-labels', labelsText);
  const namesText = get('data-chart-series');
  const names = namesText && namesText.trim() ? ids('data-chart-series', namesText) : [];

  const count = series[0].length;
  if (series.some((s) => s.length !== count)) throw err('chart.series-uneven', { counts: series.map((s) => s.length).join(', ') }, say('Every series in data-chart-facts must have the same number of values. They have ' + series.map((s) => s.length).join(', '), 'data-chart-facts 的每組數列必須有相同數量的值。現在是 ' + series.map((s) => s.length).join('、')));
  if (labels.length !== count) throw err('chart.labels-count', { labels: labels.length, count }, say('data-chart-labels has ' + labels.length + ' labels, but each series has ' + count + ' values. The two must be equal', 'data-chart-labels 有 ' + labels.length + ' 個標籤，但每組數列有 ' + count + ' 個值。兩者必須相同'));
  if (count > MAX_POINTS) throw err('chart.too-many-points', { count, max: MAX_POINTS }, say('Each series has ' + count + ' values. The limit is ' + MAX_POINTS, '每組數列有 ' + count + ' 個值。上限是 ' + MAX_POINTS));
  if (series.length > MAX_SERIES) throw err('chart.too-many-series', { count: series.length, max: MAX_SERIES }, say('There are ' + series.length + ' series. The limit is ' + MAX_SERIES, '有 ' + series.length + ' 組數列。上限是 ' + MAX_SERIES));
  if (type === 'pie') {
    if (series.length !== 1) throw err('chart.pie-series', {}, say('A pie chart takes only 1 series', '圓餅圖只能有 1 組數列'));
    if (count > MAX_SERIES) throw err('chart.pie-points', { count, max: MAX_SERIES }, say('The pie chart has ' + count + ' values. The limit is ' + MAX_SERIES, '圓餅圖有 ' + count + ' 個值。上限是 ' + MAX_SERIES));
  }
  if (series.length > 1 && names.length !== series.length) {
    throw err('chart.names-count', { series: series.length, names: names.length }, say('There are ' + series.length + ' series, so data-chart-series must give ' + series.length + ' names. It gives ' + names.length, '有 ' + series.length + ' 組數列，data-chart-series 必須給 ' + series.length + ' 個名稱。現在是 ' + names.length));
  }
  if (series.length === 1 && names.length > 1) throw err('chart.names-single', {}, say('There is only 1 series, so data-chart-series gives 1 name at most', '只有 1 組數列，data-chart-series 最多給 1 個名稱'));

  const raw = { scale: get('data-chart-scale'), digits: get('data-chart-digits'), group: get('data-chart-group') };
  let show;
  try { show = readShow(raw); } catch (e) {
    if (!(e instanceof SpecError)) throw e;
    // The same problem under the chart's own attribute name; the code stays (show.scale, show.digits, show.group).
    const named = (s) => String(s).replace(/data-fact-/g, 'data-chart-');
    throw new SpecError(named(e.message), e.code, e.code ? { ...e.vars, name: named(e.vars.name) } : undefined);
  }
  const scale = raw.scale === undefined ? 1 : Number(raw.scale.trim());
  const points = series.map((s) => s.map((id) => {
    const f = lookup(id);
    if (f.type !== 'number' || !Number.isFinite(Number(f.value))) throw err('chart.not-number', { id, type: f.type }, say('data-chart-facts refers to ' + id + ', which has the type ' + f.type + ', not number', 'data-chart-facts 引用的 ' + id + ' 的類型是 ' + f.type + '，不是 number'));
    return { id, v: Number(f.value) * scale, text: shownText(f, show) };
  }));
  if (type === 'pie') {
    if (points[0].some((p) => p.v < 0)) throw err('chart.pie-negative', {}, say('A pie chart value must not be negative', '圓餅圖的值不可是負數'));
    if (!points[0].some((p) => p.v > 0)) throw err('chart.pie-zero', {}, say('Every value of the pie chart is 0, so it cannot be drawn', '圓餅圖的值全部是 0，畫不出來'));
  }
  const text = (id) => String(lookup(id).text);
  return { type, points, labels: labels.map((id) => ({ id, text: text(id) })), names: names.map((id) => ({ id, text: text(id) })), raw };
}

/** A label cites its cell only when it shows the cell's whole text: a shortened label is not what the source says. */
const citeText = (label, shown) => (shown === label.text && shown === shown.trim() ? label.id : undefined);

/** The attributes a value label carries, so that it is an ordinary cited number to every reader. */
function cite(id, raw) {
  return { 'data-fact': id, 'data-fact-scale': raw.scale, 'data-fact-digits': raw.digits, 'data-fact-group': raw.group };
}

/** Round axis values that cover lo..hi in about 5 steps: {lo, hi, step, digits}. */
function axis(min, max) {
  let lo = Math.min(0, min);
  let hi = Math.max(0, max);
  if (lo === hi) hi = 1;
  const rough = (hi - lo) / 5;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const m = rough / pow;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
  lo = Math.floor(lo / step + 1e-9) * step;
  hi = Math.ceil(hi / step - 1e-9) * step;
  return { lo, hi, step, count: Math.round((hi - lo) / step), digits: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) };
}

function legend(names, top, width) {
  let x = 0, y = top, out = '';
  for (let i = 0; i < names.length; i++) {
    const w = 16 + widthOf(names[i].text) + 16;
    if (x && x + w > width) { x = 0; y += 20; }
    out += tag('rect', { x: n2(x), y: n2(y), width: 10, height: 10, rx: 2, fill: COLORS[i] });
    out += tag('text', { x: n2(x + 16), y: n2(y + 9), 'data-fact': citeText(names[i], names[i].text) }, esc(names[i].text));
    x += w;
  }
  return { markup: out, bottom: y + 10 };
}

function cartesian(chart, words) {
  const W = 640, H = 360;
  const { type, points, labels, names, raw } = chart;
  const group = raw.group !== 'off';
  const all = points.flat().map((p) => p.v);
  const ax = axis(Math.min(...all), Math.max(...all));
  const ticks = [];
  for (let i = 0; i <= ax.count; i++) {
    const v = ax.lo + i * ax.step;
    ticks.push({ v, text: format(dec(v.toFixed(ax.digits)), { digits: ax.digits, group }) });
  }
  let body = '';
  let top = 20;
  if (points.length > 1) {
    const lg = legend(names, 4, W);
    body += lg.markup;
    top = lg.bottom + 26;
  }
  const left = Math.ceil(Math.max(...ticks.map((t) => widthOf(t.text)))) + 12;
  const right = 12, bottom = 32;
  const plotW = W - left - right, plotH = H - top - bottom;
  const y = (v) => top + plotH * (ax.hi - v) / (ax.hi - ax.lo);
  const band = plotW / labels.length;
  const mid = (i) => left + band * (i + 0.5);

  for (const t of ticks) {
    const ty = y(t.v);
    body += tag('line', { x1: left, x2: W - right, y1: n2(ty), y2: n2(ty), stroke: 'currentColor', 'stroke-opacity': t.v === 0 ? 0.45 : 0.12 });
    body += tag('text', { x: left - 8, y: n2(ty + 4), 'text-anchor': 'end', 'fill-opacity': 0.7 }, esc(t.text));
  }
  labels.forEach((l, i) => {
    const shown = fit(l.text, band - 6);
    body += tag('text', { x: n2(mid(i)), y: H - 10, 'text-anchor': 'middle', 'fill-opacity': 0.7, 'data-fact': citeText(l, shown) }, esc(shown));
  });

  const single = points.length === 1;
  const direct = single && labels.length <= LABEL_ALL_UP_TO;
  const tip = (si, i) => tag('title', {}, esc((single ? '' : names[si].text + words.of) + labels[i].text + words.is + points[si][i].text));
  const zero = y(0);
  if (type === 'bar') {
    const k = points.length;
    const bw = Math.min(24, (band * 0.72 - 2 * (k - 1)) / k);
    const gw = bw * k + 2 * (k - 1);
    points.forEach((s, si) => s.forEach((p, i) => {
      const x0 = mid(i) - gw / 2 + si * (bw + 2), x1 = x0 + bw;
      const yv = y(p.v);
      const r = Math.min(4, bw / 2, Math.abs(zero - yv));
      const up = yv <= zero ? 1 : -1; // the data end is rounded, the baseline end is square
      const d = 'M' + n2(x0) + ' ' + n2(zero) + 'V' + n2(yv + up * r) + 'Q' + n2(x0) + ' ' + n2(yv) + ' ' + n2(x0 + r) + ' ' + n2(yv) +
        'H' + n2(x1 - r) + 'Q' + n2(x1) + ' ' + n2(yv) + ' ' + n2(x1) + ' ' + n2(yv + up * r) + 'V' + n2(zero) + 'Z';
      body += tag('path', { d, fill: COLORS[si], 'data-chart-fact': p.id }, tip(si, i));
      if (direct) body += tag('text', { x: n2(mid(i)), y: n2(up > 0 ? yv - 6 : yv + 16), 'text-anchor': 'middle', ...cite(p.id, raw) }, esc(p.text));
    }));
  } else {
    points.forEach((s, si) => {
      const d = s.map((p, i) => (i ? 'L' : 'M') + n2(mid(i)) + ' ' + n2(y(p.v))).join('');
      body += tag('path', { d, fill: 'none', stroke: COLORS[si], 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    });
    points.forEach((s, si) => s.forEach((p, i) => {
      body += tag('circle', { cx: n2(mid(i)), cy: n2(y(p.v)), r: 4, fill: COLORS[si], style: 'stroke:var(--tactile-chart-surface,#fff)', 'stroke-width': 2, 'data-chart-fact': p.id }, tip(si, i));
      if (direct) body += tag('text', { x: n2(mid(i)), y: n2(y(p.v) - 10), 'text-anchor': 'middle', ...cite(p.id, raw) }, esc(p.text));
    }));
  }
  return { W, H, body };
}

function pie(chart, words) {
  const W = 640, rowH = 24;
  const { points, labels, raw } = chart;
  const s = points[0];
  const H = Math.max(240, 24 + s.length * rowH + 8);
  const cx = 120, cy = H / 2, r = 104;
  const total = s.reduce((a, p) => a + p.v, 0);
  let body = '';
  let from = 0;
  const at = (turn) => [cx + r * Math.sin(turn * 2 * Math.PI), cy - r * Math.cos(turn * 2 * Math.PI)];
  s.forEach((p, i) => {
    const share = p.v / total;
    const to = from + share;
    const title = tag('title', {}, esc(labels[i].text + words.is + p.text));
    const common = { fill: COLORS[i], style: 'stroke:var(--tactile-chart-surface,#fff)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'data-chart-fact': p.id };
    if (share >= 1 - 1e-12) body += tag('circle', { cx, cy: n2(cy), r, ...common }, title);
    else if (share > 0) {
      const [x0, y0] = at(from), [x1, y1] = at(to);
      const d = 'M' + cx + ' ' + n2(cy) + 'L' + n2(x0) + ' ' + n2(y0) + 'A' + r + ' ' + r + ' 0 ' + (share > 0.5 ? 1 : 0) + ' 1 ' + n2(x1) + ' ' + n2(y1) + 'Z';
      body += tag('path', { d, ...common }, title);
    }
    from = to;
  });
  const lx = 264, top = (H - s.length * rowH) / 2;
  const valueW = Math.max(...s.map((p) => widthOf(p.text)));
  // The values sit in a column just right of the longest label, so the eye does not cross the whole chart.
  const labelW = Math.min(W - 8 - valueW - 24 - (lx + 18), Math.max(...labels.map((l) => widthOf(l.text))));
  s.forEach((p, i) => {
    const y = top + i * rowH + rowH / 2;
    body += tag('rect', { x: lx, y: n2(y - 5), width: 10, height: 10, rx: 2, fill: COLORS[i] });
    const shown = fit(labels[i].text, labelW);
    body += tag('text', { x: lx + 18, y: n2(y + 4), 'data-fact': citeText(labels[i], shown) }, esc(shown));
    body += tag('text', { x: n2(lx + 18 + labelW + 24 + valueW), y: n2(y + 4), 'text-anchor': 'end', ...cite(p.id, raw) }, esc(p.text));
  });
  return { W, H, body };
}

/** The chart as one <svg> element, as text. chart: what readChart returned. lang: the report's language (reportLang). */
export function drawChart(chart, lang) {
  const words = wordsOf(lang);
  const { W, H, body } = chart.type === 'pie' ? pie(chart, words) : cartesian(chart, words);
  return tag('svg', {
    xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': words[chart.type],
    'data-chart-drawn': chart.type, style: 'max-width:100%;height:auto', 'font-family': 'inherit', 'font-size': FONT, fill: 'currentColor',
  }, body);
}

/** Every ID a chart reads: values, labels and series names. */
export function chartIds(chart) {
  return [...chart.points.flat().map((p) => p.id), ...chart.labels.map((l) => l.id), ...chart.names.map((n) => n.id)];
}
