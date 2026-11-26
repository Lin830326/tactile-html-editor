/* Tactile — pptx.js: a deck as a PowerPoint file, written without a library.
 *
 * Each slide is a picture of the board with its text taken out, and on top of it one text box for each block of
 * text, at the place, size, colour and weight it has on the page. So the slide looks like the page, and the text
 * can be changed and moved in PowerPoint. Charts, shapes and backgrounds stay in the picture.
 *
 * Text is left in the picture where a text box could not show it: text inside an SVG, text that is turned, written
 * top to bottom or painted with a background (color: transparent), and a whole board whose layout moves when its
 * text nodes are wrapped.
 *
 * The file is a zip of XML parts. The zip is written by the CFB code of the SheetJS build the editor already has.
 *
 *   HE.pptx = {ready(), measure(board), hide(measured), build(slides, {w, h, lang})}
 *   measure -> {board, blocks: [{x, y, w, h, lh, lines, align, runs}], els}   (CSS px, from the board's corner)
 *   hide    -> true when the text is hidden and nothing moved; false: the board keeps its text, blocks is emptied
 *   build   -> Uint8Array. slides: [{bytes (Uint8Array), ext ('png' | 'jpeg'), blocks}]; w, h: the board in CSS px
 */
(function () {
  'use strict';
  const HE = window.HE;

  const EMU = 9525; // English Metric Units in one CSS pixel (914400 an inch, 96 px an inch)
  // The element a hidden text node is put in. Not a <span>: a page's rules for spans (.stat span { display: block }) must not reach it.
  const WRAP = 'he-pptx-text';
  const SKIP = /^(svg|script|style|img|canvas|video|iframe|object|embed|textarea|select|input|button)$/;
  const GENERIC = /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|sans-serif|serif|monospace|cursive|fantasy|emoji|math|inherit|initial)$/i;
  const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;
  const CJK_PARTS = /([\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]+)/;
  // What lays out in the line of its parent. Any other child (a block, a flex or grid item, a float, a positioned box)
  // has a place of its own on the board, and is a block of text of its own.
  const INLINE = /^(inline|inline-block|inline-flex|inline-grid|contents|ruby|ruby-base|ruby-text)$/;

  /* ------------------------------------------------------------------ */
  /* What the page says about its text                                   */
  /* ------------------------------------------------------------------ */

  function rgba(c) {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return { hex: '000000', a: 1 };
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return {
      hex: p.slice(0, 3).map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('').toUpperCase(),
      a: p.length > 3 && isFinite(p[3]) ? p[3] : 1,
    };
  }

  /**
   * Whether this machine draws `sample` with a family: it does when the text does not measure as in both fallbacks.
   * The measure is the width and the box of the ink: Chinese characters are one em wide in every font, and differ
   * in their ink. Measured in the copy's own document, so its @font-face fonts count.
   */
  function fontProbe(doc) {
    const g = doc.createElement('canvas').getContext('2d');
    const seen = new Map();
    const width = (font, sample, weight) => {
      g.font = (weight || '') + ' 72px ' + font;
      const m = g.measureText(sample);
      return [m.width, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent, m.actualBoundingBoxLeft, m.actualBoundingBoxRight].map((n) => Math.round((n || 0) * 100)).join(' ');
    };
    const quote = (name) => '"' + name.replace(/["\\]/g, '') + '"';
    function has(name, sample) {
      const key = name + '\n' + sample;
      if (!seen.has(key)) {
        const q = quote(name);
        seen.set(key, width(q + ', monospace', sample) !== width('monospace', sample) || width(q + ', serif', sample) !== width('serif', sample));
      }
      return seen.get(key);
    }
    /**
     * Whether `name` is a face of its own beside `family`, and not the family's regular or bold face under another
     * name: a browser takes "Microsoft JhengHei Black" as the heaviest face that family has, and PowerPoint knows no
     * font of that name.
     */
    function distinct(name, family, sample) {
      const key = name + '\n' + family + '\n' + sample;
      if (!seen.has(key)) {
        const a = width(quote(name) + ', monospace', sample);
        seen.set(key, has(name, sample) && a !== width(quote(family) + ', monospace', sample) && a !== width(quote(family) + ', monospace', sample, 'bold'));
      }
      return seen.get(key);
    }
    return { has, distinct };
  }

  const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

  function eastAsian(lang) {
    const l = String(lang || '').toLowerCase();
    const mac = isMac();
    if (/^ja/.test(l)) return mac ? 'Hiragino Sans' : 'Yu Gothic';
    if (/^ko/.test(l)) return mac ? 'Apple SD Gothic Neo' : 'Malgun Gothic';
    if (/^zh-(cn|sg|hans)/.test(l)) return mac ? 'PingFang SC' : 'Microsoft YaHei';
    return mac ? 'PingFang TC' : 'Microsoft JhengHei';
  }

  const LATIN_SAMPLE = 'Handgloves 0123';
  const EA_SAMPLE = '\u6e2c\u8a66\u56fd\u8a9e\u6c38';
  // PowerPoint has one switch for bold. A family that has a face for another weight under a name of its own
  // (Segoe UI Black, Noto Sans TC Medium) is told by that name, with the switch off.
  const WEIGHT_FACES = [[800, 1000, ['Black', 'ExtraBold', 'Heavy']], [600, 699, ['Semibold', 'SemiBold', 'DemiBold']], [500, 599, ['Medium']], [250, 349, ['Light']]];

  function weighted(face, w, probe, sample) {
    const row = WEIGHT_FACES.find((r) => w >= r[0] && w <= r[1]);
    const name = row && row[2].map((s) => face + ' ' + s).find((n) => probe.distinct(n, face, sample));
    return name ? { face: name, bold: false } : { face, bold: w >= 600 };
  }

  /** {face, ea, bold, eaBold}: the typefaces PowerPoint is told, for a computed font-family and weight. */
  function typeface(cs, probe, lang) {
    const has = probe.has;
    const names = String(cs.fontFamily).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    const mono = names.some((n) => /mono|courier|consolas/i.test(n));
    const serif = !mono && names.some((n) => /^serif$|georgia|times/i.test(n)) && !names.some((n) => /^sans-serif$/i.test(n));
    const named = names.filter((n) => !GENERIC.test(n));
    let face = named.find((n) => has(n, LATIN_SAMPLE));
    if (!face) face = mono ? 'Consolas' : serif ? 'Georgia' : isMac() ? 'Helvetica Neue' : 'Segoe UI';
    const ea = named.find((n) => has(n, EA_SAMPLE)) || eastAsian(lang);
    const w = Number(cs.fontWeight) || 400;
    // The two faces can differ in how they say the weight: runsOf gives East Asian text runs of its own then.
    const a = weighted(face, w, probe, LATIN_SAMPLE);
    const b = weighted(ea, w, probe, EA_SAMPLE);
    return { face: a.face, ea: b.face, bold: a.bold, eaBold: b.bold };
  }

  /** The opacity of `el` and the boxes around it, up to `stop`. */
  function opacityOf(el, stop, win) {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      o *= Number(win.getComputedStyle(n).opacity);
      if (n === stop) break;
    }
    return isFinite(o) ? o : 1;
  }

  /** Whether `el` or a box around it (up to `stop`) is turned, skewed or scaled: its text would not sit in a plain box. */
  function turned(el, stop, win) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const t = win.getComputedStyle(n).transform;
      const m = t && t !== 'none' ? t.match(/^matrix\(([^)]+)\)$/) : null;
      if (t && t !== 'none' && !m) return true; // a 3D matrix
      if (m) {
        const v = m[1].split(',').map(Number);
        if (Math.abs(v[1]) > 0.001 || Math.abs(v[2]) > 0.001 || Math.abs(v[0] - 1) > 0.02 || Math.abs(v[3] - 1) > 0.02) return true;
      }
      if (n === stop) break;
    }
    return false;
  }

  /**
   * The text of `el` as runs of one style each ({br: 1} for a line break), spaces collapsed as the page shows them.
   * It goes into the children that lay out in the line (ctx.owned gets them) and past the others: `mixed` says
   * that there were some.
   */
  function runsOf(el, ctx) {
    const win = ctx.win;
    const out = [];
    const nodes = [];
    let mixed = false;
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) {
          const cs = win.getComputedStyle(c.parentElement);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const pre = /^pre/.test(cs.whiteSpace);
          let text = c.nodeValue;
          if (!pre) text = text.replace(/\s+/g, ' ');
          if (!text) continue;
          if (cs.textTransform === 'uppercase') text = text.toUpperCase();
          else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
          const col = rgba(cs.color);
          const tf = typeface(cs, ctx.probe, ctx.lang);
          const style = {
            b: tf.bold, i: cs.fontStyle === 'italic' || cs.fontStyle === 'oblique', u: /underline/.test(cs.textDecorationLine),
            s: /line-through/.test(cs.textDecorationLine), color: col.hex, alpha: col.a * opacityOf(c.parentElement, ctx.board, win),
            px: parseFloat(cs.fontSize) || 16, face: tf.face, ea: tf.ea, ls: parseFloat(cs.letterSpacing) || 0, pre,
          };
          nodes.push(c);
          const lines = pre ? text.split('\n') : [text];
          lines.forEach((line, k) => {
            if (k) out.push({ br: 1 });
            if (!line) return;
            if (tf.eaBold === tf.bold || !CJK.test(line)) { out.push(Object.assign({ t: line }, style)); return; }
            for (const part of line.split(CJK_PARTS)) if (part) out.push(Object.assign({ t: part }, style, { b: CJK.test(part) ? tf.eaBold : tf.bold }));
          });
        } else if (c.nodeType === 1) {
          const tag = c.tagName.toLowerCase();
          if (tag === 'br') { out.push({ br: 1 }); continue; }
          if (SKIP.test(tag)) continue;
          const ccs = win.getComputedStyle(c);
          if (ccs.display === 'none') continue;
          if (!INLINE.test(ccs.display) || ccs.float !== 'none' || /^(absolute|fixed)$/.test(ccs.position)) { mixed = true; continue; }
          ctx.owned.add(c);
          walk(c);
        }
      }
    })(el);
    let space = true; // at the start of a line a space shows nothing
    for (const r of out) {
      if (r.br) { space = true; continue; }
      if (r.pre) { space = false; continue; }
      if (space) r.t = r.t.replace(/^ /, '');
      if (r.t) space = / $/.test(r.t);
    }
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].br) continue;
      if (!out[i].pre) out[i].t = out[i].t.replace(/ $/, '');
      if (out[i].t) break;
    }
    return { runs: out.filter((r) => r.br || r.t), nodes, mixed };
  }

  /** The boxes a text node is painted in, one for each line it is on. (A box around it can be a flex item, with a height of its own.) */
  function nodeRects(node) {
    const range = node.ownerDocument.createRange();
    range.selectNodeContents(node);
    return Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
  }

  function nodeRect(node) {
    return (node && nodeRects(node)[0]) || null;
  }

  /**
   * The blocks of text of one board of a laid-out copy. A block is an element that holds text of its own and is not
   * in the line of another block; the elements in its line become its runs. Call for every board before hide() is called for any.
   */
  function measure(board) {
    const doc = board.ownerDocument;
    const win = doc.defaultView;
    const ctx = { win, board, probe: fontProbe(doc), lang: doc.documentElement.getAttribute('lang') || '', owned: new Set() };
    const o = board.getBoundingClientRect();
    const blocks = [];
    const els = [];
    const tw = doc.createTreeWalker(board, NodeFilter.SHOW_ELEMENT);
    for (let el = board; el; el = tw.nextNode()) {
      if (SKIP.test(el.tagName.toLowerCase()) || el.closest('svg')) continue;
      if (ctx.owned.has(el)) continue;
      if (!Array.from(el.childNodes).some((c) => c.nodeType === 3 && c.nodeValue.trim())) continue;
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const { runs, nodes, mixed } = runsOf(el, ctx); // first: also a block left in the picture owns what is in its line
      if (/^vertical|^sideways/.test(cs.writingMode) || turned(el, board, win)) continue;
      const texts = runs.filter((r) => !r.br);
      if (!texts.length || texts.some((r) => r.alpha < 0.02)) continue;
      const rects = nodes.flatMap(nodeRects);
      if (!rects.length) continue;
      const tops = Array.from(new Set(rects.map((r) => Math.round(r.top)))).sort((a, b) => a - b);
      const lines = tops.filter((t, i) => i === 0 || t - tops[i - 1] > 3).length;
      const left = Math.min(...rects.map((r) => r.left));
      const tight = { left, width: Math.max(...rects.map((r) => r.right)) - left };
      const first = rects[0];
      const lh = cs.lineHeight === 'normal' ? first.height : parseFloat(cs.lineHeight) || first.height;
      const er = el.getBoundingClientRect();
      const padL = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
      const padR = (parseFloat(cs.paddingRight) || 0) + (parseFloat(cs.borderRightWidth) || 0);
      const multi = lines > 1;
      // One line: the box is the text itself and does not wrap. More: the box is as wide as the element's content,
      // or as the text where the element also holds boxes that are not in its line.
      const wide = multi && !mixed;
      const x = wide ? er.left + padL : tight.left;
      const w = wide ? Math.max(tight.width, er.width - padL - padR) : tight.width;
      const align = /center/.test(cs.textAlign) ? 'ctr' : /right|end/.test(cs.textAlign) ? 'r' : /justify/.test(cs.textAlign) ? 'just' : 'l';
      blocks.push({ x: x - o.left, y: first.top - (lh - first.height) / 2 - o.top, w, h: lh * lines, lh, lines, align, runs });
      const mark = nodeRect(nodes[0]);
      els.push({ el, nodes, at: mark ? { x: mark.left, y: mark.top } : null });
    }
    return { board, blocks, els, w: o.width, h: o.height };
  }

  /**
   * Take the measured text out of sight for the picture: each text node goes into an element that is not painted
   * and keeps its room. If that moved any block (a rule such as :first-child now counts that element), it is undone and
   * the board keeps its text: its picture then holds it, and it gets no text boxes.
   */
  function hide(measured) {
    const doc = measured.board.ownerDocument;
    const spans = [];
    for (const item of measured.els) {
      for (const n of item.nodes) {
        if (!n.parentNode) continue;
        const s = doc.createElement(WRAP);
        s.style.setProperty('visibility', 'hidden', 'important');
        n.replaceWith(s);
        s.append(n);
        spans.push(s);
      }
    }
    const moved = measured.els.some((item) => {
      if (!item.at) return false;
      const now = nodeRect(item.nodes[0]);
      return !now || Math.abs(now.left - item.at.x) > 1 || Math.abs(now.top - item.at.y) > 1;
    });
    if (!moved) return true;
    for (const s of spans) s.replaceWith(...s.childNodes);
    measured.blocks = [];
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* The parts of the file                                               */
  /* ------------------------------------------------------------------ */

  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="' + REL + '" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
  const TREE0 = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
  const fill3 = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'.repeat(3);
  const THEME = XML + '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Tactile"><a:themeElements>' +
    '<a:clrScheme name="Tactile"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1A1D24"/></a:dk2><a:lt2><a:srgbClr val="E7EAF0"/></a:lt2>' +
    '<a:accent1><a:srgbClr val="2149C8"/></a:accent1><a:accent2><a:srgbClr val="17703F"/></a:accent2><a:accent3><a:srgbClr val="8A5C12"/></a:accent3><a:accent4><a:srgbClr val="C0352E"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="4F5666"/></a:accent5><a:accent6><a:srgbClr val="868D9C"/></a:accent6><a:hlink><a:srgbClr val="2149C8"/></a:hlink><a:folHlink><a:srgbClr val="4F5666"/></a:folHlink></a:clrScheme>' +
    '<a:fontScheme name="Tactile"><a:majorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Segoe UI"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    '<a:fmtScheme name="Tactile"><a:fillStyleLst>' + fill3 + '</a:fillStyleLst><a:lnStyleLst>' +
    [6350, 12700, 19050].map((w) => '<a:ln w="' + w + '"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>').join('') +
    '</a:lnStyleLst><a:effectStyleLst>' + '<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3) + '</a:effectStyleLst><a:bgFillStyleLst>' + fill3 +
    '</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>';

  /** Text for XML: the five marks, and none of the control characters XML refuses. */
  function esc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const emu = (px) => Math.round(px * EMU);
  // Font sizes are hundredths of a point; a CSS pixel is 0.75 pt. PowerPoint takes 1 pt to 4000 pt.
  const size = (px) => Math.max(100, Math.min(400000, Math.round(px * 75)));

  function runXML(r, lang) {
    const color = '<a:solidFill><a:srgbClr val="' + r.color + '">' + (r.alpha < 0.995 ? '<a:alpha val="' + Math.round(r.alpha * 100000) + '"/>' : '') + '</a:srgbClr></a:solidFill>';
    return '<a:r><a:rPr lang="' + lang + '" sz="' + size(r.px) + '" b="' + (r.b ? 1 : 0) + '" i="' + (r.i ? 1 : 0) + '"' + (r.u ? ' u="sng"' : '') + (r.s ? ' strike="sngStrike"' : '') +
      (r.ls ? ' spc="' + Math.round(r.ls * 75) + '"' : '') + ' dirty="0">' + color + '<a:latin typeface="' + esc(r.face) + '"/><a:ea typeface="' + esc(r.ea) + '"/><a:cs typeface="' + esc(r.face) + '"/></a:rPr><a:t>' + esc(r.t) + '</a:t></a:r>';
  }

  function textBox(b, id, lang) {
    const paras = [[]];
    for (const r of b.runs) { if (r.br) paras.push([]); else paras[paras.length - 1].push(r); }
    const first = b.runs.find((r) => !r.br);
    const end = '<a:endParaRPr lang="' + lang + '" sz="' + size(first ? first.px : 16) + '" dirty="0"/>';
    const ps = paras.map((runs) => '<a:p><a:pPr algn="' + b.align + '"><a:lnSpc><a:spcPts val="' + Math.max(100, Math.round(b.lh * 75)) + '"/></a:lnSpc></a:pPr>' +
      runs.map((r) => runXML(r, lang)).join('') + end + '</a:p>').join('');
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Text ' + (id - 2) + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="' + emu(b.x) + '" y="' + emu(b.y) +
      '"/><a:ext cx="' + Math.max(1, emu(b.w + (b.lines > 1 ? 2 : 0))) + '" cy="' + Math.max(1, emu(b.h)) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="' + (b.lines > 1 ? 'square' : 'none') + '" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>' + ps + '</p:txBody></p:sp>';
  }

  function langTag(lang) {
    const m = String(lang || '').match(/^([A-Za-z]{2,3})(?:-([A-Za-z]{2}|[A-Za-z]{4}))?(?:-([A-Za-z]{2}))?$/);
    if (!m) return 'en-US';
    const base = m[1].toLowerCase();
    const region = (m[3] || (m[2] && m[2].length === 2 ? m[2] : '')).toUpperCase();
    if (region) return base + '-' + region;
    return { en: 'en-US', zh: /hans/i.test(m[2] || '') ? 'zh-CN' : 'zh-TW', ja: 'ja-JP', ko: 'ko-KR', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' }[base] || 'en-US';
  }

  function parts(slides, opts) {
    const cx = emu(opts.w);
    const cy = emu(opts.h);
    const lang = langTag(opts.lang);
    const out = [];
    const add = (name, data) => out.push({ name, data });
    const rels = (list) => XML + '<Relationships xmlns="' + PKG_REL + '">' + list.map((r, i) => '<Relationship Id="rId' + (i + 1) + '" Type="' + REL + '/' + r[0] + '" Target="' + r[1] + '"/>').join('') + '</Relationships>';
    const type = (part, kind) => '<Override PartName="/ppt/' + part + '" ContentType="application/vnd.openxmlformats-officedocument.' + kind + '+xml"/>';
    add('[Content_Types].xml', XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
      type('presentation.xml', 'presentationml.presentation.main') + type('slideMasters/slideMaster1.xml', 'presentationml.slideMaster') + type('slideLayouts/slideLayout1.xml', 'presentationml.slideLayout') +
      type('theme/theme1.xml', 'theme') + slides.map((s, i) => type('slides/slide' + (i + 1) + '.xml', 'presentationml.slide')).join('') + '</Types>');
    add('_rels/.rels', rels([['officeDocument', 'ppt/presentation.xml']]));
    add('ppt/presentation.xml', XML + '<p:presentation ' + NS + '><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>' +
      slides.map((s, i) => '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 3) + '"/>').join('') + '</p:sldIdLst><p:sldSz cx="' + cx + '" cy="' + cy + '"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>');
    add('ppt/_rels/presentation.xml.rels', rels([['slideMaster', 'slideMasters/slideMaster1.xml'], ['theme', 'theme/theme1.xml']].concat(slides.map((s, i) => ['slide', 'slides/slide' + (i + 1) + '.xml']))));
    add('ppt/theme/theme1.xml', THEME);
    add('ppt/slideMasters/slideMaster1.xml', XML + '<p:sldMaster ' + NS + '><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>' + TREE0 +
      '</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>');
    add('ppt/slideMasters/_rels/slideMaster1.xml.rels', rels([['slideLayout', '../slideLayouts/slideLayout1.xml'], ['theme', '../theme/theme1.xml']]));
    add('ppt/slideLayouts/slideLayout1.xml', XML + '<p:sldLayout ' + NS + ' type="blank"><p:cSld name="Blank"><p:spTree>' + TREE0 + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>');
    add('ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels([['slideMaster', '../slideMasters/slideMaster1.xml']]));
    slides.forEach((s, i) => {
      const n = i + 1;
      const ext = s.ext === 'jpeg' ? 'jpeg' : 'png';
      const pic = '<p:pic><p:nvPicPr><p:cNvPr id="2" name="Slide picture ' + n + '"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
        '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
      add('ppt/slides/slide' + n + '.xml', XML + '<p:sld ' + NS + '><p:cSld><p:spTree>' + TREE0 + pic + (s.blocks || []).map((b, k) => textBox(b, k + 3, lang)).join('') + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>');
      add('ppt/slides/_rels/slide' + n + '.xml.rels', rels([['slideLayout', '../slideLayouts/slideLayout1.xml'], ['image', '../media/image' + n + '.' + ext]]));
      add('ppt/media/image' + n + '.' + ext, s.bytes);
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* The zip                                                             */
  /* ------------------------------------------------------------------ */

  /** Whether the zip can be written here: the CFB code of the SheetJS build is loaded. */
  function ready() {
    const C = window.XLSX && window.XLSX.CFB;
    return !!(C && C.utils && C.utils.cfb_new && C.utils.cfb_add && C.write);
  }

  function zip(list) {
    const C = window.XLSX.CFB;
    const cfb = C.utils.cfb_new();
    const enc = new TextEncoder();
    for (const p of list) C.utils.cfb_add(cfb, '/' + p.name, typeof p.data === 'string' ? enc.encode(p.data) : p.data);
    C.utils.cfb_del(cfb, '/\u0001Sh33tJ5'); // the mark the library puts in a new container; a .pptx must not hold it
    const bytes = C.write(cfb, { fileType: 'zip', type: 'array', compression: true });
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  }

  function build(slides, opts) {
    return zip(parts(slides, opts));
  }

  HE.pptx = { ready, measure, hide, build, parts };
})();
