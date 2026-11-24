/* Tactile — design.js: measured design checks of the rendered canvas (HE.design).
 *
 * Reads the edit frame's layout and computed styles and reports what can be measured: text contrast,
 * text that is too small, heading sizes, content cut off by its box or past the page edge, overlapping
 * text, and spacing that is uneven or just off the values the page already uses. It never changes the
 * document and cannot judge taste. The AI calls it through the check_design tool.
 */
(function () {
  'use strict';
  const HE = window.HE;

  const CHECKS = ['contrast', 'small_text', 'hierarchy', 'overflow', 'overlap', 'spacing'];
  const LEVEL_ORDER = { error: 0, warn: 1, info: 2 };
  const MAX_ELEMENTS = 6000; // elements walked per call
  const MAX_TEXT = 3000; // text-bearing elements measured
  const MAX_RECTS = 8000; // text line boxes compared for overlap
  const MIN_TEXT_PX = 12;
  // Never entered: no rendered text of their own, or text that is not laid out as page text.
  const NO_ENTRY = new Set(['script', 'style', 'noscript', 'template', 'head', 'title', 'meta', 'link', 'base']);
  // Measured as boxes, not entered: their content is drawn by the element itself.
  const OPAQUE = new Set(['svg', 'math', 'select', 'textarea', 'iframe', 'object', 'embed', 'video', 'audio', 'canvas', 'img', 'picture', 'input']);
  const MEDIA_SEL = 'img, svg, video, canvas, iframe, object, embed, picture, table, input, button, select, textarea';
  const HEADING_SEL = 'h1, h2, h3, h4, h5, h6';
  const IMAGE_BG = /url\(|image-set\(|element\(|cross-fade\(|paint\(/i;
  const COLOR_TOKEN = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#[0-9a-f]{3,8}\b|\btransparent\b/gi;
  const RGB = /^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?))?\s*\)$/i;
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  const DARK_CANVAS = { r: 18, g: 18, b: 18, a: 1 };

  /* ------------------------------------------------------------------ */
  /* Colour                                                              */
  /* ------------------------------------------------------------------ */

  let probe = null;
  const colorCache = new Map();

  /** Any CSS colour string → {r, g, b, a} in sRGB, or null. Computed values are mostly rgb()/rgba(). */
  function parseColor(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (colorCache.has(s)) return colorCache.get(s);
    let c = null;
    const m = RGB.exec(s);
    if (m) {
      const a = m[4] == null ? 1 : (m[5] ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
      c = { r: +m[1], g: +m[2], b: +m[3], a: Math.max(0, Math.min(1, a)) };
    } else if (/^transparent$/i.test(s)) {
      c = { r: 0, g: 0, b: 0, a: 0 };
    } else {
      c = viaCanvas(s); // oklch(), color(), lab()…: let the browser convert it
    }
    if (colorCache.size > 1000) colorCache.clear();
    colorCache.set(s, c);
    return c;
  }
  function viaCanvas(s) {
    try {
      if (!probe) {
        const cv = document.createElement('canvas');
        cv.width = 1; cv.height = 1;
        probe = cv.getContext('2d', { willReadFrequently: true });
      }
      if (!probe) return null;
      probe.fillStyle = '#010203';
      probe.fillStyle = s;
      if (probe.fillStyle === '#010203') return null; // not a colour the canvas accepts
      probe.clearRect(0, 0, 1, 1);
      probe.fillRect(0, 0, 1, 1);
      const d = probe.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    } catch (e) {
      return null;
    }
  }
  function over(top, below) {
    const a = top.a;
    return { r: top.r * a + below.r * (1 - a), g: top.g * a + below.g * (1 - a), b: top.b * a + below.b * (1 - a), a: 1 };
  }
  function luminance(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrast(a, b) {
    const x = luminance(a);
    const y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function hex(c) {
    const h = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }

  /* ------------------------------------------------------------------ */
  /* Measuring the live frame                                            */
  /* ------------------------------------------------------------------ */

  function measurer(doc, win) {
    const styles = new Map();
    const opacities = new Map();
    const clips = new Map();
    const M = {
      doc,
      win,
      range: doc.createRange(),
      style(el) {
        let s = styles.get(el);
        if (!s) { s = win.getComputedStyle(el); styles.set(el, s); }
        return s;
      },
      /** Product of the opacity of the element and its ancestors. */
      opacity(el) {
        if (!el || el.nodeType !== 1) return 1;
        let v = opacities.get(el);
        if (v === undefined) {
          const own = parseFloat(M.style(el).opacity);
          v = (Number.isFinite(own) ? own : 1) * M.opacity(el.parentElement);
          opacities.set(el, v);
        }
        return v;
      },
      /**
       * The part of the viewport where the element's content can show: the intersection of the padding boxes
       * of its ancestors that clip or scroll (not <html>/<body>: their overflow belongs to the viewport).
       * {box, by: [{el, x, y}]} where x/y say whether that ancestor hides (rather than scrolls) on that axis.
       */
      clip(el) {
        if (!el || el.nodeType !== 1 || el === doc.body || el === doc.documentElement) return { box: null, by: [] };
        let v = clips.get(el);
        if (v) return v;
        const up = M.clip(el.parentElement);
        const cs = M.style(el);
        const ox = cs.overflowX;
        const oy = cs.overflowY;
        // overflow does nothing on an inline box, whatever it computes to.
        if ((ox === 'visible' && oy === 'visible') || cs.display === 'inline' || cs.display === 'contents') {
          v = up;
        } else {
          const r = el.getBoundingClientRect();
          const left = r.left + el.clientLeft;
          const top = r.top + el.clientTop;
          const own = { left, top, right: left + el.clientWidth, bottom: top + el.clientHeight };
          const box = up.box ? {
            left: Math.max(up.box.left, own.left), top: Math.max(up.box.top, own.top),
            right: Math.min(up.box.right, own.right), bottom: Math.min(up.box.bottom, own.bottom),
          } : own;
          const hides = (o) => o === 'hidden' || o === 'clip';
          v = { box, by: [{ el, own, x: hides(ox), y: hides(oy) }].concat(up.by) };
        }
        clips.set(el, v);
        return v;
      },
    };
    return M;
  }

  function idOf(el) { return HE.live.idOf(el); }
  function tagOf(el) { return (el.localName || '').toLowerCase(); }
  function snippet(el, n) {
    const t = ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
  }
  function name(el) {
    const s = snippet(el, 28);
    return '<' + tagOf(el) + '> [' + idOf(el) + ']' + (s ? ' "' + s + '"' : '');
  }
  function px(v) { return Math.round(v * 10) / 10 + 'px'; }
  function firstFamily(ff) {
    return String(ff || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  }

  /** Hidden from sight on purpose: a screen-reader-only box, clipped to nothing. */
  function visuallyHidden(el, M) {
    for (let n = el, k = 0; n && n.nodeType === 1 && k < 3; n = n.parentElement, k++) {
      const cs = M.style(n);
      const pos = cs.position;
      if ((pos === 'absolute' || pos === 'fixed') && cs.clip && cs.clip !== 'auto') return true;
      if (/inset\(\s*50%/.test(cs.clipPath || '')) return true;
      if (pos === 'absolute' || pos === 'fixed') {
        const r = n.getBoundingClientRect();
        if (r.width <= 1.5 && r.height <= 1.5) return true;
      }
    }
    return false;
  }

  /**
   * Walk the body once in document order. Collects every rendered element box and every element that
   * has text of its own, with its line boxes.
   */
  function collect(M) {
    const boxes = [];
    const texts = [];
    const skipped = { svgText: 0, fields: 0, hiddenEditor: 0 };
    let truncated = false;
    let count = 0;
    const stack = [M.doc.body];
    while (stack.length) {
      const el = stack.pop();
      if (++count > MAX_ELEMENTS) { truncated = true; break; }
      const tag = tagOf(el);
      if (NO_ENTRY.has(tag) || el.hasAttribute('data-he-editor')) continue;
      const cs = M.style(el);
      if (cs.display === 'none') {
        if (el.hasAttribute('data-he-hidden')) skipped.hiddenEditor++;
        continue;
      }
      const rects = el.getClientRects();
      if (rects.length) boxes.push(el);
      if (OPAQUE.has(tag)) {
        if (tag === 'svg' && el.querySelector('text')) skipped.svgText++;
        if (tag === 'select' || tag === 'textarea' || (tag === 'input' && !/^(hidden|checkbox|radio|range|color|file|image)$/i.test(el.type))) skipped.fields++;
        continue;
      }
      if (texts.length < MAX_TEXT && cs.visibility === 'visible') {
        const lines = [];
        let chars = 0;
        // A text range spans the font's whole glyph area; with a tight line-height that reaches into the next
        // line or block although no glyph does. Measure the line box instead: trim the (negative) half-leading.
        const lh = parseFloat(cs.lineHeight);
        for (let t = el.firstChild; t; t = t.nextSibling) {
          if (t.nodeType !== 3 || !/\S/.test(t.data)) continue;
          chars += t.data.replace(/\s+/g, '').length;
          M.range.selectNodeContents(t);
          for (const r of M.range.getClientRects()) {
            if (r.width <= 0.5 || r.height <= 0.5) continue;
            const trim = lh > 0 && lh < r.height ? (r.height - lh) / 2 : 0;
            lines.push({ left: r.left, right: r.right, top: r.top + trim, bottom: r.bottom - trim, height: r.height - 2 * trim });
          }
        }
        if (lines.length && M.opacity(el) > 0.05 && !visuallyHidden(el, M) && !el.closest('[aria-hidden="true"]')) {
          texts.push({
            el,
            id: idOf(el),
            cs,
            lines,
            chars,
            size: parseFloat(cs.fontSize) || 0,
            weight: parseInt(cs.fontWeight, 10) || 400,
            heading: el.closest(HEADING_SEL),
          });
        }
      }
      // Content that is laid out but not painted: a closed <details> (all but its summary), hidden="until-found".
      if (cs.contentVisibility === 'hidden') continue;
      if (tag === 'details' && !el.open) {
        const summary = Array.from(el.children).find((c) => tagOf(c) === 'summary');
        if (summary) stack.push(summary);
        continue;
      }
      for (let c = el.lastElementChild; c; c = c.previousElementSibling) stack.push(c);
    }
    if (texts.length >= MAX_TEXT) truncated = true;
    return { boxes, texts, skipped, truncated };
  }

  /* ------------------------------------------------------------------ */
  /* Checks                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * The colours that can sit behind an element's text: its own and its ancestors' backgrounds composited
   * from the first opaque one up. A gradient gives one candidate per colour stop. {image: el} when a
   * picture is behind the text, which cannot be measured.
   */
  function backdrop(el, M) {
    const layers = []; // front to back
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = M.style(n);
      const img = cs.backgroundImage;
      if (img && img !== 'none' && !thinStrip(cs)) {
        if (IMAGE_BG.test(img)) return { image: n };
        const stops = (img.match(COLOR_TOKEN) || []).map(parseColor).filter(Boolean).slice(0, 8);
        if (stops.length) {
          layers.push({ colors: stops, gradient: true, el: n });
          if (stops.every((c) => c.a >= 0.999)) return flatten(layers, null);
        }
      }
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0.001) {
        layers.push({ colors: [bg], gradient: false, el: n });
        if (bg.a >= 0.999) return flatten(layers, null);
      }
    }
    const scheme = String(M.style(M.doc.documentElement).colorScheme || '');
    const base = /\bdark\b/.test(scheme) && !/\blight\b/.test(scheme) ? DARK_CANVAS : WHITE;
    return flatten(layers, base);
  }
  /**
   * One unrepeated background layer drawn as a line no taller than a third of the text (the underline
   * effect's line, at rest 0 wide) sits under the glyphs, not behind them.
   */
  function thinStrip(cs) {
    // Computed lists hold one entry per layer, so a single 'no-repeat' also means a single layer.
    if (!/^no-repeat$/.test(String(cs.backgroundRepeat).trim())) return false;
    const size = String(cs.backgroundSize).trim().split(/\s+/);
    if (size.length !== 2) return false;
    if (/^0(px|%)?$/.test(size[0])) return true;
    const m = /^([\d.]+)px$/.exec(size[1]);
    return !!m && parseFloat(m[1]) <= parseFloat(cs.fontSize) / 3;
  }
  function flatten(layers, base) {
    let out = base ? [base] : [];
    for (let i = layers.length - 1; i >= 0; i--) {
      const next = [];
      const seen = new Set();
      for (const s of layers[i].colors) {
        const list = out.length ? out.map((c) => over(s, c)) : [Object.assign({}, s, { a: 1 })];
        for (const c of list) {
          const k = hex(c);
          if (!seen.has(k)) { seen.add(k); next.push(c); }
        }
      }
      out = next.slice(0, 24);
    }
    const top = layers[0];
    return { colors: out, gradient: layers.some((l) => l.gradient), from: top ? top.el : null };
  }

  function checkContrast(ctx) {
    const groups = new Map();
    const overImages = [];
    for (const t of ctx.texts) {
      if (!t.inScope) continue;
      if (t.el.closest(':disabled, [aria-disabled="true"]')) continue;
      const cs = t.cs;
      const fill = parseColor(cs.webkitTextFillColor || cs.color) || parseColor(cs.color);
      if (!fill) continue;
      if (fill.a < 0.05 || /\btext\b/.test(cs.backgroundClip || cs.webkitBackgroundClip || '')) { ctx.notChecked.gradientText.push(t.id); continue; }
      const back = backdrop(t.el, ctx.M);
      if (back.image) { overImages.push(t.id); continue; }
      const op = ctx.M.opacity(t.el);
      let worst = null;
      for (const bg of back.colors) {
        let fg = fill.a < 1 ? over(fill, bg) : fill;
        if (op < 0.999) fg = over(Object.assign({}, fg, { a: op }), bg);
        const r = contrast(fg, bg);
        if (!worst || r < worst.r) worst = { r, fg, bg };
      }
      if (!worst) continue;
      const large = t.size >= 24 || (t.size >= 18.5 && t.weight >= 700);
      const need = large ? 3 : 4.5;
      if (worst.r >= need) continue;
      const key = hex(worst.fg) + '|' + hex(worst.bg) + '|' + need + '|' + (back.gradient ? 'g' : '');
      let g = groups.get(key);
      if (!g) {
        g = { worst, need, large, gradient: back.gradient, from: back.from, items: [] };
        groups.set(key, g);
      }
      g.items.push(t);
    }
    for (const g of groups.values()) {
      const r = Math.floor(g.worst.r * 100) / 100;
      const where = g.gradient ? 'on a gradient (worst stop ' + hex(g.worst.bg) + ')' : 'on ' + hex(g.worst.bg);
      ctx.issue({
        check: 'contrast',
        level: g.worst.r < g.need * 2 / 3 ? 'error' : 'warn',
        items: g.items.map((t) => t.el),
        message: 'Text ' + hex(g.worst.fg) + ' ' + where + ' has contrast ' + r + ':1; ' + (g.large ? 'large ' : '') +
          'text needs ' + g.need + ':1 (WCAG AA).' + (g.from ? ' Background comes from [' + idOf(g.from) + '].' : ' Background is the page default.'),
      });
    }
    if (overImages.length) ctx.notChecked.list.push('contrast of text over a background image: ' + listIds(overImages));
    if (ctx.notChecked.gradientText.length) ctx.notChecked.list.push('contrast of gradient-filled or transparent text: ' + listIds(ctx.notChecked.gradientText));
  }

  function checkSmallText(ctx) {
    const groups = new Map();
    for (const t of ctx.texts) {
      if (!t.inScope || t.size >= MIN_TEXT_PX - 0.05) continue;
      if (t.el.closest('sup, sub')) continue;
      const k = Math.round(t.size * 10) / 10;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t.el);
    }
    for (const [size, els] of groups) {
      ctx.issue({
        check: 'small_text',
        level: 'warn',
        items: els,
        message: 'Text is ' + px(size) + '; text under ' + MIN_TEXT_PX + 'px is hard to read' + (ctx.phone ? ' on a phone.' : '.'),
      });
    }
  }

  /**
   * Font size and weight per heading: of its own text, else of the text inside it with the most characters.
   * A small label or badge inside a heading (前菜 <small>APPETIZERS</small>) can have more characters than the heading.
   */
  function headingInfo(ctx) {
    const map = new Map();
    for (const t of ctx.texts) {
      if (!t.heading) continue;
      const cur = map.get(t.heading);
      if (!cur || t.el === t.heading || (cur.el !== t.heading && t.chars > cur.chars)) map.set(t.heading, t);
    }
    return Array.from(map, ([el, t]) => ({ el, level: +tagOf(el).slice(1), size: t.size, weight: t.weight, inScope: t.inScope }));
  }

  function bodyText(ctx) {
    const sizes = new Map();
    for (const t of ctx.texts) {
      if (t.heading) continue;
      const k = Math.round(t.size * 2) / 2;
      sizes.set(k, (sizes.get(k) || 0) + t.chars);
    }
    let size = 0;
    let best = -1;
    for (const [k, n] of sizes) if (n > best) { best = n; size = k; }
    if (!size) return null;
    const weights = new Map();
    let family = '';
    let famBest = -1;
    const fams = new Map();
    for (const t of ctx.texts) {
      if (t.heading || Math.round(t.size * 2) / 2 !== size) continue;
      weights.set(t.weight, (weights.get(t.weight) || 0) + t.chars);
      const f = firstFamily(t.cs.fontFamily);
      fams.set(f, (fams.get(f) || 0) + t.chars);
    }
    let weight = 400;
    best = -1;
    for (const [k, n] of weights) if (n > best) { best = n; weight = k; }
    for (const [k, n] of fams) if (n > famBest) { famBest = n; family = k; }
    return { size, weight, family };
  }

  function median(list) {
    const s = list.slice().sort((a, b) => a - b);
    return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
  }

  function checkHierarchy(ctx) {
    const body = ctx.body;
    const heads = ctx.headings;
    if (body) {
      const groups = new Map();
      for (const h of heads) {
        if (!h.inScope || h.level > 4) continue;
        let why = '';
        const bolder = h.weight >= body.weight + 200;
        if (h.size < body.size - 0.5) {
          // A small bold heading is a common label style; small and not bolder gets lost.
          why = 'smaller than the body text (' + px(body.size) + ')' + (bolder ? '; fine for a label-style heading, otherwise make it larger' : ' and not clearly bolder');
        } else if (h.size < body.size * 1.08 && !bolder) {
          why = 'the same size as the body text (' + px(body.size) + ') and not clearly bolder, so it reads as body text';
        }
        if (!why) continue;
        const k = h.level + '|' + h.size + '|' + h.weight + '|' + why;
        if (!groups.has(k)) groups.set(k, { h, why, els: [], level: bolder ? 'info' : 'warn' });
        groups.get(k).els.push(h.el);
      }
      for (const g of groups.values()) {
        ctx.issue({
          check: 'hierarchy',
          level: g.level,
          items: g.els,
          message: 'h' + g.h.level + ' at ' + px(g.h.size) + '/' + g.h.weight + ' is ' + g.why + '.',
        });
      }
    }
    // A lower level should not be larger than a higher one.
    const byLevel = new Map();
    for (const h of heads) {
      if (!byLevel.has(h.level)) byLevel.set(h.level, []);
      byLevel.get(h.level).push(h);
    }
    const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        const a = byLevel.get(levels[i]);
        const b = byLevel.get(levels[j]);
        const ma = median(a.map((h) => h.size));
        const mb = median(b.map((h) => h.size));
        if (ma >= mb - 0.5) continue;
        // The headings that take part: lower-level ones above the higher level's size, and the reverse.
        const bigger = b.filter((h) => h.size > ma + 0.5);
        const smaller = a.filter((h) => h.size < mb - 0.5);
        const items = bigger.concat(smaller);
        if (!items.some((h) => h.inScope)) continue;
        ctx.issue({
          check: 'hierarchy',
          level: 'warn',
          items: items.map((h) => h.el),
          message: 'h' + levels[j] + ' headings (' + px(mb) + ') are larger than h' + levels[i] + ' headings (' + px(ma) + ').',
        });
      }
    }
    if (!ctx.scoped) {
      // Skipped levels, in document order: an outline jump the eye and screen readers both notice.
      const ordered = heads.slice().sort((x, y) => (x.el.compareDocumentPosition(y.el) & 4 ? -1 : 1));
      let prev = 0;
      for (const h of ordered) {
        if (prev && h.level > prev + 1) {
          ctx.issue({ check: 'hierarchy', level: 'info', items: [h.el], message: 'h' + prev + ' is followed by h' + h.level + ' (no h' + (prev + 1) + ' in between).' });
          break;
        }
        prev = h.level;
      }
    }
    const sizes = ctx.sizes;
    if (sizes.length > 8) {
      ctx.issue({
        check: 'hierarchy',
        level: 'info',
        items: [],
        message: 'Text uses ' + sizes.length + ' different font sizes (' + sizes.map((s) => s.size + 'px').join(', ') + '); a scale of 4 to 6 sizes usually reads cleaner.',
      });
    }
    // A size 1px off a much more common one is likely a slip; two sizes both in wide use are a choice.
    let near = 0;
    for (let i = 0; i + 1 < sizes.length && near < 3; i++) {
      const a = sizes[i];
      const b = sizes[i + 1];
      // A heading next to body text is the heading check's business.
      if (a.size - b.size > 1 || a.heads.size || b.heads.size) continue;
      const rare = a.n < b.n ? a : b;
      const common = rare === a ? b : a;
      if (common.n < 4 || rare.n * 4 > common.n) continue;
      near++;
      ctx.issue({
        check: 'hierarchy',
        level: 'info',
        items: rare.els,
        message: 'Text at ' + rare.size + 'px (' + rare.n + ' elements) is 1px off the much more common ' + common.size + 'px (' + common.n + '); if they play the same role, use one size.',
      });
    }
    if (ctx.families.length > 3) {
      ctx.issue({
        check: 'hierarchy',
        level: 'info',
        items: [],
        message: 'Text uses ' + ctx.families.length + ' font families (' + ctx.families.join(', ') + '); two or three usually look more consistent.',
      });
    }
  }

  function hasContent(el) {
    return !!((el.textContent || '').trim() || el.matches(MEDIA_SEL) || el.querySelector(MEDIA_SEL));
  }

  function checkOverflow(ctx) {
    const M = ctx.M;
    const vw = M.doc.documentElement.clientWidth;
    // Past the edge of the page: the page scrolls sideways, or <body> cuts it off.
    const out = new Set();
    for (const el of ctx.boxes) {
      if (el === M.doc.body) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || (r.right <= vw + 1 && r.left >= -1)) continue;
      const cs = M.style(el);
      if (cs.visibility !== 'visible') continue;
      // A fixed panel parked wholly off screen (an off-canvas menu) neither scrolls the page nor shows.
      if (cs.position === 'fixed' && (r.left >= vw || r.right <= 0)) continue;
      if (M.clip(el.parentElement).by.length) continue; // inside a box that clips or scrolls: its own business
      out.add(el);
    }
    // Siblings past the same edge by the same amount share one cause (a repeated slide or card): one issue.
    const wide = new Map();
    for (const el of out) {
      if (out.has(el.parentElement) || !ctx.inScope(el) || !hasContent(el)) continue;
      const r = el.getBoundingClientRect();
      const side = r.left < -1 ? 'left' : 'right';
      const past = Math.round(side === 'left' ? -r.left : r.right - vw);
      const key = side + '|' + past;
      const g = wide.get(el.parentElement) || new Map();
      wide.set(el.parentElement, g);
      if (!g.has(key)) g.set(key, { side, past, els: [] });
      g.get(key).els.push(el);
    }
    let reported = 0;
    for (const g of wide.values()) {
      for (const { side, past, els } of g.values()) {
        ctx.issue({
          check: 'overflow',
          level: 'error',
          items: els,
          message: (els.length > 1 ? els.length + ' similar elements, starting with ' + name(els[0]) + ', extend ' : name(els[0]) + ' extends ') + past +
            'px past the ' + side + ' edge of the ' + vw + 'px-wide page, so the page scrolls sideways or cuts ' + (els.length > 1 ? 'them' : 'it') + ' off.',
        });
        reported++;
      }
    }
    if (!reported && !ctx.scoped && M.doc.documentElement.scrollWidth > vw + 1) {
      ctx.issue({ check: 'overflow', level: 'warn', items: [], message: 'The page is ' + (M.doc.documentElement.scrollWidth - vw) + 'px wider than the ' + vw + 'px viewport and scrolls sideways.' });
    }
    // Text cut off by a box that hides its overflow.
    const groups = new Map();
    for (const t of ctx.texts) {
      if (!t.inScope) continue;
      const clip = M.clip(t.el);
      if (!clip.by.some((c) => c.x || c.y)) continue;
      const ellipsis = (n) => M.style(n).textOverflow === 'ellipsis';
      const clamped = (n) => { const v = M.style(n).webkitLineClamp; return !!v && v !== 'none'; };
      let lines = t.lines;
      for (const c of clip.by) {
        const cs = M.style(c.el);
        const sx = /auto|scroll/.test(cs.overflowX);
        const sy = /auto|scroll/.test(cs.overflowY);
        if (sx || sy) {
          // Text in a box that scrolls can be scrolled into view: a box farther out hides only what it cuts of the scroller.
          lines = lines.map((r) => ({
            left: sx ? Math.max(r.left, c.own.left) : r.left, right: sx ? Math.min(r.right, c.own.right) : r.right,
            top: sy ? Math.max(r.top, c.own.top) : r.top, bottom: sy ? Math.min(r.bottom, c.own.bottom) : r.bottom, height: r.height,
          }));
        }
        if (!c.x && !c.y) continue;
        const hideX = c.x && !ellipsis(c.el) && !ellipsis(t.el);
        const hideY = c.y && !clamped(c.el) && !clamped(t.el);
        let hidden = 0;
        for (const r of lines) {
          if (hideX) {
            const dx = Math.max(0, r.right - c.own.right, c.own.left - r.left);
            if (dx > Math.max(2, 0.3 * t.size)) hidden = Math.max(hidden, dx);
          }
          if (hideY) {
            const dy = Math.max(0, r.bottom - c.own.bottom, c.own.top - r.top);
            if (dy > 0.4 * r.height) hidden = Math.max(hidden, dy);
          }
        }
        if (!hidden) continue;
        let g = groups.get(c.el);
        if (!g) { g = { els: [], hidden: 0 }; groups.set(c.el, g); }
        g.els.push(t.el);
        g.hidden = Math.max(g.hidden, hidden);
        break;
      }
    }
    for (const [box, g] of groups) {
      const cs = M.style(box);
      ctx.issue({
        check: 'overflow',
        level: 'warn',
        items: g.els,
        message: 'Text is cut off by ' + name(box) + ' (overflow ' + (cs.overflowX === cs.overflowY ? cs.overflowX : cs.overflowX + ' ' + cs.overflowY) +
          '): up to ' + Math.round(g.hidden) + 'px hidden. Give it room (height, width, wrapping) unless the cut is intended.',
      });
    }
  }

  /** Inside a box fixed to the window (a floating island, a sticky bar): it lies over whatever scrolls under it, by design. */
  function floats(el, seen) {
    if (seen.has(el)) return seen.get(el);
    const win = el.ownerDocument.defaultView;
    let out = false;
    for (let cur = el; cur && cur.nodeType === 1 && !out; cur = cur.parentElement) {
      const pos = win.getComputedStyle(cur).position;
      out = pos === 'fixed' || pos === 'sticky';
    }
    seen.set(el, out);
    return out;
  }

  function checkOverlap(ctx) {
    const M = ctx.M;
    const rects = [];
    const floating = new Map();
    for (const t of ctx.texts) {
      if (M.opacity(t.el) < 0.5) continue; // a faint watermark behind text is decoration
      const fill = parseColor(t.cs.color);
      if (fill && fill.a < 0.5) continue;
      const box = M.clip(t.el).box;
      for (const r of t.lines) {
        let left = r.left; let top = r.top; let right = r.right; let bottom = r.bottom;
        if (box) {
          left = Math.max(left, box.left); top = Math.max(top, box.top);
          right = Math.min(right, box.right); bottom = Math.min(bottom, box.bottom);
          if (right - left < 1 || bottom - top < 1) continue;
        }
        rects.push({ t, left, top, right, bottom, h: r.height });
        if (rects.length >= MAX_RECTS) break;
      }
      if (rects.length >= MAX_RECTS) { ctx.truncated = true; break; }
    }
    rects.sort((a, b) => a.top - b.top);
    const pairs = new Map();
    for (let i = 0; i < rects.length; i++) {
      const a = rects[i];
      for (let j = i + 1; j < rects.length && rects[j].top < a.bottom; j++) {
        const b = rects[j];
        if (a.t === b.t) continue;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w <= 4 || h <= 0.4 * Math.min(a.h, b.h)) continue;
        if (a.t.el.contains(b.t.el) || b.t.el.contains(a.t.el)) continue;
        if (!a.t.inScope && !b.t.inScope) continue;
        // Where the two meet depends on how far the page is scrolled: not a fault of the layout.
        if (floats(a.t.el, floating) !== floats(b.t.el, floating)) continue;
        const first = a.t.el.compareDocumentPosition(b.t.el) & 4 ? a.t : b.t;
        const second = first === a.t ? b.t : a.t;
        const key = first.id + '|' + second.id;
        if (!pairs.has(key)) pairs.set(key, [first, second]);
      }
    }
    for (const [x, y] of pairs.values()) {
      ctx.issue({
        check: 'overlap',
        level: 'warn',
        items: [x.el, y.el],
        message: 'Text of ' + name(x.el) + ' overlaps text of ' + name(y.el) + '.',
      });
    }
  }

  function signature(el) {
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter((c) => c && !/^tfx-/.test(c)).sort().join('.');
    return tagOf(el) + '.' + cls;
  }

  function checkSpacing(ctx) {
    const M = ctx.M;
    const values = new Map(); // px → {n, els}
    const add = (v, el) => {
      if (!(v > 0.5)) return;
      const k = Math.round(v * 2) / 2;
      let e = values.get(k);
      if (!e) { e = { n: 0, els: [] }; values.set(k, e); }
      e.n++;
      if (e.els.length < 6 && !e.els.includes(el)) e.els.push(el);
    };
    for (const el of ctx.boxes) {
      if (!ctx.inScope(el)) continue;
      const cs = M.style(el);
      // Horizontal margins are left out: auto margins that centre a box compute to arbitrary lengths.
      for (const p of ['marginTop', 'marginBottom', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) add(parseFloat(cs[p]), el);
      if (/flex|grid/.test(cs.display)) { add(parseFloat(cs.rowGap), el); add(parseFloat(cs.columnGap), el); }
    }
    ctx.spacing = Array.from(values, ([v, e]) => ({ v, n: e.n, els: e.els })).sort((a, b) => b.n - a.n);
    let near = 0;
    for (const rare of ctx.spacing.slice().reverse()) {
      if (near >= 3) break;
      if (rare.v < 8) continue; // 1px apart is a big step at this size, and likely deliberate

      // Half a pixel apart is rounding from em or % lengths, not a different value.
      const common = ctx.spacing.find((c) => c !== rare && c.n >= 6 && rare.n * 6 <= c.n &&
        Math.abs(c.v - rare.v) >= 1 && Math.abs(c.v - rare.v) <= Math.max(1, 0.08 * c.v));
      if (!common) continue;
      near++;
      ctx.issue({
        check: 'spacing',
        level: 'info',
        items: rare.els,
        message: 'Spacing of ' + rare.v + 'px (used ' + rare.n + '×) is just off the much more common ' + common.v + 'px (used ' + common.n + '×); if it serves the same purpose, use ' + common.v + 'px.',
      });
    }
    // Uneven gaps between a run of similar items stacked in one column or one row.
    let uneven = 0;
    for (const parent of ctx.boxes) {
      if (uneven >= 4) break;
      if (!ctx.inScope(parent) || parent.childElementCount < 3) continue;
      const kids = [];
      for (let c = parent.firstElementChild; c; c = c.nextElementSibling) {
        const cs = M.style(c);
        if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed' || cs.float !== 'none') continue;
        if (NO_ENTRY.has(tagOf(c)) || c.hasAttribute('data-he-editor')) continue;
        const r = c.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        kids.push({ el: c, r });
      }
      if (kids.length < 3) continue;
      const sig = signature(kids[0].el);
      if (kids.some((k) => signature(k.el) !== sig)) continue;
      const column = kids.every((k, i) => !i || (k.r.top >= kids[i - 1].r.bottom - 1 && k.r.left < kids[i - 1].r.right && k.r.right > kids[i - 1].r.left));
      const row = !column && kids.every((k, i) => !i || (k.r.left >= kids[i - 1].r.right - 1 && k.r.top < kids[i - 1].r.bottom && k.r.bottom > kids[i - 1].r.top));
      if (!column && !row) continue;
      const gaps = kids.slice(1).map((k, i) => Math.round(column ? k.r.top - kids[i].r.bottom : k.r.left - kids[i].r.right));
      const lo = Math.min(...gaps);
      const hi = Math.max(...gaps);
      if (hi - lo <= 4 || hi - lo <= 0.25 * hi) continue;
      uneven++;
      ctx.issue({
        check: 'spacing',
        level: 'info',
        items: [parent],
        message: 'The ' + kids.length + ' similar <' + tagOf(kids[0].el) + '> items in ' + name(parent) + ' have uneven ' +
          (column ? 'vertical' : 'horizontal') + ' gaps: ' + gaps.slice(0, 8).join(', ') + 'px.',
      });
    }
  }

  function listIds(ids, max = 6) {
    const u = Array.from(new Set(ids));
    return u.slice(0, max).join(', ') + (u.length > max ? ' and ' + (u.length - max) + ' more' : '');
  }

  /* ------------------------------------------------------------------ */
  /* Entry point                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Measure the canvas. opts: {ids (only inside these elements; none = the whole page), checks (subset of
   * CHECKS), maxIssues (default 30)}. Returns a plain object for the AI: scope, summary, issues (worst
   * first: {check, level: error|warn|info, ids, count, message}), not_checked and a note.
   */
  function check(opts = {}) {
    const live = HE.live;
    const doc = live && live.doc;
    const win = doc && doc.defaultView;
    if (!doc || !win || !doc.body || !live.safe()) throw new Error('The canvas is not rendered right now, so nothing can be measured. Try again in a moment.');
    const want = new Set(opts.checks && opts.checks.length ? opts.checks.filter((c) => CHECKS.includes(c)) : CHECKS);
    let roots = (opts.ids || []).map((id) => live.byId(id)).filter(Boolean);
    if ((opts.ids || []).length && !roots.length) throw new Error('None of those elements is rendered in the canvas right now.');
    if (roots.some((r) => r === doc.body || r === doc.documentElement || r === doc.head)) roots = [];
    const M = measurer(doc, win);
    const inScope = (el) => !roots.length || roots.some((r) => r === el || r.contains(el));
    const { boxes, texts, skipped, truncated } = collect(M);
    for (const t of texts) t.inScope = inScope(t.el);

    const issues = [];
    const ctx = {
      M, boxes, texts, inScope, scoped: roots.length > 0, truncated,
      phone: /phone|fold/i.test(String((HE.canvas && HE.canvas.viewport) || '')),
      notChecked: { list: [], gradientText: [] },
      issue(spec) {
        const ids = [];
        for (const el of spec.items) { const id = idOf(el); if (id && !ids.includes(id)) ids.push(id); }
        issues.push({ check: spec.check, level: spec.level, ids: ids.slice(0, 8), count: ids.length, message: spec.message, _el: spec.items[0] || null });
      },
    };

    // Type facts the hierarchy check and the summary share.
    ctx.body = bodyText(ctx);
    ctx.headings = headingInfo(ctx);
    const sizes = new Map();
    const families = new Map();
    for (const t of texts) {
      if (!t.inScope) continue;
      const k = Math.round(t.size);
      let e = sizes.get(k);
      if (!e) { e = { size: k, chars: 0, n: 0, els: [], heads: new Set() }; sizes.set(k, e); }
      e.chars += t.chars;
      e.n++;
      if (e.els.length < 6) e.els.push(t.el);
      if (t.heading) e.heads.add(tagOf(t.heading));
      if (!t.el.closest('pre, code, kbd, samp')) {
        const f = firstFamily(t.cs.fontFamily);
        if (f) families.set(f, (families.get(f) || 0) + t.chars);
      }
    }
    ctx.sizes = Array.from(sizes.values()).sort((a, b) => b.size - a.size);
    ctx.families = Array.from(families).sort((a, b) => b[1] - a[1]).map((f) => f[0]);

    const run = [
      ['contrast', checkContrast], ['overflow', checkOverflow], ['overlap', checkOverlap],
      ['small_text', checkSmallText], ['hierarchy', checkHierarchy], ['spacing', checkSpacing],
    ];
    for (const [key, fn] of run) if (want.has(key)) fn(ctx);
    if (!want.has('spacing')) ctx.spacing = null;

    issues.sort((a, b) => {
      const d = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
      if (d) return d;
      if (a._el && b._el && a._el !== b._el) return a._el.compareDocumentPosition(b._el) & 4 ? -1 : 1;
      return 0;
    });
    const max = Math.max(1, opts.maxIssues || 30);
    const shown = issues.slice(0, max).map((i) => { const o = Object.assign({}, i); delete o._el; return o; });

    const vw = doc.documentElement.clientWidth;
    const vh = doc.documentElement.clientHeight;
    const summary = {
      viewport: String((HE.canvas && HE.canvas.viewport) || 'desktop') + ', ' + vw + 'x' + vh + ' CSS px',
      text_elements: texts.filter((t) => t.inScope).length,
    };
    if (ctx.body) summary.body_text = px(ctx.body.size) + ' / ' + ctx.body.weight + (ctx.body.family ? ' / ' + ctx.body.family : '');
    const heads = new Map();
    for (const h of ctx.headings) {
      if (!h.inScope) continue;
      const k = 'h' + h.level;
      if (!heads.has(k)) heads.set(k, []);
      heads.get(k).push(h);
    }
    if (heads.size) {
      summary.headings = Array.from(heads).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, list]) => k + ' ' + px(median(list.map((h) => h.size))) + '/' + median(list.map((h) => h.weight)) + ' ×' + list.length).join(', ');
    }
    if (ctx.sizes.length) {
      summary.font_sizes = ctx.sizes.slice(0, 12).map((s) => s.size + 'px' + (s.heads.size ? ' (' + Array.from(s.heads).sort().join('/') + ')' : '') +
        (ctx.body && Math.round(ctx.body.size) === s.size ? ' (body)' : '')).join(', ');
    }
    if (ctx.families.length) summary.font_families = ctx.families.slice(0, 6).join(', ');
    if (ctx.spacing && ctx.spacing.length) summary.spacing_values = ctx.spacing.slice(0, 10).map((s) => s.v + 'px ×' + s.n).join(', ');

    const notChecked = ctx.notChecked.list.slice();
    if (skipped.svgText) notChecked.push('text inside SVG graphics (' + skipped.svgText + ' SVG' + (skipped.svgText > 1 ? 's' : '') + ')');
    if (skipped.fields) notChecked.push('text inside form fields (' + skipped.fields + ')');
    if (skipped.hiddenEditor) notChecked.push(skipped.hiddenEditor + ' layer(s) hidden in the editor; they still show in the exported page');
    if (ctx.truncated) notChecked.push('the rest of the page: it is large, so only the first ' + MAX_TEXT + ' text elements were measured; check sections with ids');
    notChecked.push('taste: balance, imagery, whether colours and fonts suit the content');

    const out = { scope: roots.length ? roots.length + ' element(s): ' + roots.map((r) => idOf(r)).join(', ') : 'whole page', summary, issues: shown };
    if (issues.length > shown.length) out.more_issues = issues.length - shown.length;
    out.not_checked = notChecked;
    out.note = 'Measured on the rendered canvas at this device size; switching device can change the results. Issues that were there before your edit are not yours to fix unless asked.';
    return out;
  }

  HE.design = { CHECKS, check };
})();
