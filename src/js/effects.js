/* Tactile — effects.js
 *
 * 動態效果: hover, entrance and scroll effects made of platform CSS only. No page script is
 * involved, so they work with scripts off, in untrusted documents, in exported files, in the
 * Artifact build and in preview mode.
 *
 * What the document holds:
 *   - classes tfx-h-<name> (hover), tfx-e-<name> (entrance), tfx-s-<name> (scroll): at most one per kind;
 *   - inline custom properties written with HE.ops.setStyle: --tfx-k (intensity), --tfx-t (when
 *     entrance/scroll effects play), --tfx-color, and --tfx-i / --tfx-n on the children of fan and
 *     deal containers (kept in order by sync());
 *   - the marker classes tfx-bar / tfx-bar-v (plus tfx-bar-end for bars anchored at the right or top) on the
 *     bars inside a grow container: found when grow is applied (or found again from its hint), dropped by
 *     sync() once no grow container holds them;
 *   - two managed head styles that sync() regenerates from the classes in use: 'fx' (structure that
 *     also applies in edit mode, @property registrations) and 'fx-motion' (transitions, hover/focus
 *     states, keyframes, scroll timelines, all inside prefers-reduced-motion: no-preference). Only the
 *     presets in use get rules, and every selector is class-only. The canvas switches the frame's
 *     copy of 'fx-motion' off in edit mode.
 *
 * sync() also runs as a history closer, so CSS that a paste, duplicate, AI edit or source edit needs
 * (or no longer needs) joins the same undo step.
 *
 *   HE.fx = {init, KINDS, KIND_ZH, PRESETS, INTENSITY, TIMING, presets(kind), preset(kind, name),
 *            canHost(el), of(id), has(id), hasAny(fx), apply(ids, spec, opts), remove(ids, kinds, opts),
 *            removeAll(opts), count(), sync(), hints(id), wrapAndMove(id, kinds), describe(idOrEl, lang),
 *            summary(max), bars(id), findBars(id), demo(ids), stopDemo(), demoing}
 */
(function () {
  'use strict';

  const HE = window.HE;
  const util = HE.util;
  const t = HE.t;

  /* ------------------------------------------------------------------ */
  /* Vocabulary                                                          */
  /* ------------------------------------------------------------------ */

  const EASE = {
    out: 'cubic-bezier(.22,1,.36,1)',
    snappy: 'cubic-bezier(.16,1,.3,1)',
    smooth: 'cubic-bezier(.65,0,.35,1)',
    pop: 'cubic-bezier(.3,1.45,.6,1)', // overshoot: only the presets labelled 活潑 and the fan's fallback
  };
  // A spring (stiffness 180, damping 17: about 8% overshoot) sampled for linear(). It is written after
  // a cubic-bezier fallback and never inside var(), so a browser without linear() keeps the fallback.
  const SPRING = 'linear(0, .068, .225, .417, .605, .767, .894, .983, 1.039, 1.068, 1.076, 1.072, 1.06, 1.046, 1.031, 1.019, 1.009, 1.002, .997, .995, 1)';

  const KINDS = ['hover', 'entrance', 'scroll'];
  const PREFIX = { hover: 'tfx-h-', entrance: 'tfx-e-', scroll: 'tfx-s-' };
  const KIND_ZH = { hover: t('滑鼠懸停'), entrance: t('進場'), scroll: t('捲動') };
  const INTENSITY = [
    { value: 'light', label: t('輕'), k: 0.6 },
    { value: 'medium', label: t('中'), k: 1 },
    { value: 'strong', label: t('強'), k: 1.6 },
  ];
  const TIMING = [
    { value: 'early', label: t('早'), t: -1 },
    { value: 'medium', label: t('中'), t: 0 },
    { value: 'late', label: t('晚'), t: 1 },
  ];
  const STAGGER_CAP = 8; // children of a deal container after the 8th enter together
  const DEMO_ATTR = 'data-he-fx-demo';
  const NON_VISUAL = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript', 'base', 'title']);
  const NO_HOST = new Set(['html', 'head', 'body', 'br', 'wbr', 'source', 'track', 'option', 'optgroup', 'col', 'colgroup',
    'area', 'param', 'datalist']);
  const REPLACED = new Set(['img', 'video', 'canvas', 'iframe', 'svg', 'input', 'select', 'textarea', 'object', 'embed', 'audio']);
  const MEDIA = new Set(['img', 'video', 'canvas', 'iframe', 'svg', 'object', 'embed', 'picture']);
  const NO_WRAP = new Set(['summary', 'legend', 'figcaption', 'li', 'dt', 'dd', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption']);
  // Bars of a grow container: markers, and what is never taken for a bar (table cells, rules, controls, list items).
  const BAR_X = 'tfx-bar';
  const BAR_Y = 'tfx-bar-v';
  const BAR_END = 'tfx-bar-end'; // with one of the two: anchored at the right (top) edge, so it grows from there
  const NO_BAR = new Set(['td', 'th', 'tr', 'table', 'thead', 'tbody', 'tfoot', 'caption', 'hr', 'progress', 'meter', 'li', 'dt', 'dd',
    'summary', 'legend', 'label', 'button', 'a', 'option']);
  const BAR_SCAN = 4000; // elements looked at inside one container
  const BAR_MAX = 300; // bars marked in one container

  // Custom properties as the generated CSS reads them.
  const KV = 'var(--tfx-k, 1)';
  const TV = 'var(--tfx-t, 0)';
  const IV = 'var(--tfx-i, 0)';
  const IC = 'min(' + IV + ', ' + (STAGGER_CAP - 1) + ')'; // the deal stagger index (children keep their true index)
  const NV = 'var(--tfx-n, 1)';
  const CV = 'var(--tfx-color, currentColor)';
  const kx = (v) => 'calc(' + v + ' * ' + KV + ')';
  const R = (sel, decls) => sel + ' { ' + decls.join('; ') + '; }';
  const corners = Array(8).fill('linear-gradient(' + CV + ', ' + CV + ')').join(', ');

  /*
   * Preset fields:
   *   label/desc: zh-TW for the UI; ai: English for the AI tool. card: hover state also on :focus-within.
   *   color: uses --tfx-color. kids: works on the element's children (--tfx-i/--tfx-n). pseudo: the
   *   pseudo-element it draws with. tf: what it transforms ('self' | 'kids'). tr: sets transition on the
   *   element itself. struct(c): 'fx' rules. Hover: rest(c) and on(stateSelector) for 'fx-motion'.
   *   Entrance/scroll: frames (keyframes body, only the state that differs from the author's style),
   *   target ('self' | 'kids'), timeline, range, decl (extra declarations on the animated element),
   *   timing (whether 早/中/晚 applies), demo {ms, ease, frames?, stagger?} for the edit-mode preview.
   */
  const PRESETS = {
    hover: [
      {
        name: 'lift', label: t('浮起'), card: true, tf: 'self', tr: 'self',
        desc: t('滑過時微微上浮，陰影跟著加深。適合卡片和按鈕。'),
        ai: 'rises a little with a deeper shadow (cards, buttons)',
        rest: (c) => [R(c, ['transition: transform .35s ' + EASE.out + ', box-shadow .35s ' + EASE.out])],
        on: (s) => [R(s, [
          'transform: translateY(' + kx('-.35rem') + ')',
          'box-shadow: 0 ' + kx('.15rem') + ' ' + kx('.35rem') + ' rgb(0 0 0 / .07), 0 ' + kx('.8rem') + ' ' + kx('1.6rem') + ' ' + kx('-.35rem') + ' rgb(0 0 0 / .2)',
        ])],
      },
      {
        name: 'underline', label: t('底線描繪'), color: true, tr: 'self',
        desc: t('滑過時由左到右畫出底線。適合連結和行內文字；元素原本的背景圖片或漸層會被取代。'),
        ai: 'a line draws under the text from left to right (links, inline text; replaces the element\'s own background image)',
        // The line is a background layer. !important keeps it when the page's own rules set the `background`
        // shorthand (a button's :hover colour would otherwise reset the image, or a gradient's repeat stripe it);
        // background-color stays the author's. Transitions still animate important values.
        struct: (c) => [R(c, [
          'background-image: linear-gradient(' + CV + ', ' + CV + ') !important', 'background-repeat: no-repeat !important',
          'background-position: 0 100% !important', 'background-size: 0% ' + kx('.1em') + ' !important',
          '-webkit-box-decoration-break: clone', 'box-decoration-break: clone',
        ])],
        rest: (c) => [R(c, ['transition: background-size .4s ' + EASE.out])],
        on: (s) => [R(s, ['background-size: 100% ' + kx('.1em') + ' !important'])],
      },
      {
        name: 'zoom', label: t('圖片縮放'), card: true,
        desc: t('滑過外框時，裡面的圖片或影片慢慢放大，超出外框的部分會被裁掉。套在圖片的外框上（例如圖文框）。'),
        ai: 'the image or video inside this frame slowly scales up, clipped by the frame; put it on the frame (on an <img> it moves to the frame)',
        struct: (c) => [R(c, ['overflow: hidden', 'overflow: clip', '--tfx-zs: calc(1 + .07 * ' + KV + ')'])],
        rest: (c) => [R(c + ' img, ' + c + ' video', ['transition: transform .7s ' + EASE.out])],
        on: (s) => [R(s + ' img, ' + s + ' video', ['transform: scale(var(--tfx-zs, 1.07))'])],
      },
      {
        name: 'sheen', label: t('掃光'), card: true, pseudo: 'after',
        desc: t('滑過時一道斜光掃過表面。適合按鈕、卡片和深色區塊。'),
        ai: 'a diagonal light sweeps across (buttons, cards, dark blocks)',
        struct: (c) => [R(':where(' + c + ')', ['position: relative'])],
        rest: (c) => [R(c + '::after', [
          'content: ""', 'position: absolute', 'inset: 0', 'border-radius: inherit', 'pointer-events: none', '--tfx-k: inherit',
          'background: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / calc(.38 * ' + KV + ')) 50%, transparent 65%) 130% 0 / 250% 100% no-repeat',
        ])],
        on: (s) => [R(s + '::after', ['background-position: -30% 0', 'transition: background-position .9s ' + EASE.smooth])],
      },
      {
        name: 'trace', label: t('邊框流光'), card: true, pseudo: 'before', color: true,
        desc: t('滑過時一道光沿著邊框繞一圈。適合卡片和按鈕；一頁別用太多個。'),
        ai: 'a light runs once around the border (cards, buttons; use sparingly)',
        struct: (c) => [R(':where(' + c + ')', ['position: relative'])],
        rest: (c) => [R(c + '::before', [
          'content: ""', 'position: absolute', 'inset: 0', 'border-radius: inherit', 'padding: calc(1px + 1px * ' + KV + ')',
          'pointer-events: none', '--tfx-k: inherit', '--tfx-angle: 0deg',
          'background: conic-gradient(from var(--tfx-angle), transparent 0 60%, ' + CV + ' 88%, transparent)',
          '-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', '-webkit-mask-composite: xor',
          'mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
          'opacity: 0', 'transition: opacity .25s ' + EASE.out + ', --tfx-angle 1.2s ' + EASE.smooth,
        ])],
        on: (s) => [R(s + '::before', ['opacity: 1', '--tfx-angle: 360deg'])],
      },
      {
        name: 'fan', label: t('扇形展開'), card: true, kids: true, tf: 'kids',
        desc: t('套在容器上：滑過時，裡面的子項目像撲克牌一樣展開。適合包著幾張卡片或圖片的容器。'),
        ai: 'put it on a container: on hover its children fan out like playing cards',
        struct: (c) => [R(c + ' > *', ['--tfx-k: inherit'])],
        rest: (c) => [R(c + ' > *', ['transform-origin: 50% 140%', 'transition: transform .6s ' + EASE.pop, 'transition-timing-function: ' + SPRING])],
        on: (s) => {
          const d = '(' + IV + ' - (' + NV + ' - 1) / 2)';
          return [R(s + ' > *', ['transform: rotate(calc(' + d + ' * 4deg * ' + KV + ')) translateX(calc(' + d + ' * 6% * ' + KV + '))'])];
        },
      },
      {
        name: 'reticle', label: t('準星鎖定（活潑）'), card: true, pseudo: 'before', color: true,
        desc: t('滑過時四個角的框線向外彈開，像準星鎖定。效果比較活潑，適合遊戲感或互動按鈕。'),
        ai: 'playful: corner brackets pop out around the element with a small overshoot',
        struct: (c) => [R(':where(' + c + ')', ['position: relative'])],
        // The resting brackets are scaled into the element's own box: an invisible box still counts as
        // scrollable overflow, and a larger one would widen the page (on touch screens too, where hover never comes).
        rest: (c) => [R(c + '::before', [
          'content: ""', 'position: absolute', 'inset: ' + kx('-6px'), 'pointer-events: none', '--tfx-k: inherit',
          'background-image: ' + corners, 'background-repeat: no-repeat',
          'background-size: ' + Array(4).fill('14px 2px, 2px 14px').join(', '),
          'background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%',
          'opacity: 0', 'transform: scale(.88)', 'transition: opacity .2s ' + EASE.out + ', transform .4s ' + EASE.pop,
        ])],
        on: (s) => [R(s + '::before', ['opacity: 1', 'transform: none'])],
      },
    ],
    entrance: [
      {
        name: 'blur-rise', label: t('模糊上升'), target: 'self', tf: 'self', timing: true, timeline: 'view()',
        desc: t('捲動到這裡時，從模糊中淡入並往上浮到原位。適合標題和段落；模糊比較耗效能，一頁別用太多。'),
        ai: 'fades in from a blur while rising into place as it scrolls into view (headings, paragraphs)',
        frames: 'from { opacity: 0; transform: translateY(' + kx('1.25rem') + '); filter: blur(' + kx('6px') + '); }',
        // `entry` is as long as the element, or as the viewport when the element is taller: the rem caps keep a
        // tall section from staying blurred while it fills the screen.
        range: 'entry min(15% + ' + TV + ' * 15%, 3rem + ' + TV + ' * 3rem) entry min(75% + ' + TV + ' * 25%, 16rem + ' + TV + ' * 4rem)',
        demo: { ms: 900, ease: EASE.out },
      },
      {
        name: 'deal', label: t('依序發牌'), target: 'kids', tf: 'kids', kids: true, timing: true, timeline: 'view()',
        desc: t('套在容器上：捲動到這裡時，子項目一個接一個滑進來（前 8 個依序，之後的一起）。'),
        ai: 'put it on a container: its children slide in one after another as it scrolls into view (stagger up to 8)',
        struct: (c) => [R(c + ' > *', ['--tfx-k: inherit', '--tfx-t: inherit'])],
        frames: 'from { opacity: 0; transform: translateY(' + kx('1.5rem') + ') scale(calc(1 - .05 * ' + KV + ')); }',
        // The end moves with the index too (capped at entry 100%), so late children keep a usable range; the
        // rem caps work as in blur-rise. The index is capped here, so a fan on the same container sees the true one.
        range: 'entry min(15% + ' + TV + ' * 15% + ' + IC + ' * 6%, 3rem + ' + TV + ' * 3rem + ' + IC + ' * 1rem) ' +
          'entry min(100%, 75% + ' + TV + ' * 25% + ' + IC + ' * 6%, 16rem + ' + TV + ' * 4rem + ' + IC + ' * 1rem)',
        demo: { ms: 650, ease: EASE.out, stagger: 90 },
      },
      {
        // The container's own animation only turns --tfx-in (an integer: 0, then 1 halfway through the range) on;
        // its bars match it with style queries and grow in time, not with the scroll, so they never rest at a
        // wrong length. Browsers without style queries keep the bars as they are.
        name: 'grow', label: t('長條增長'), target: 'self', bars: true, timing: true, intensity: false, timeline: 'view()',
        desc: t('套在長條圖的外框上：捲動到這裡時，裡面的長條從 0 長到原本的長度；一開頁就看得到的圖表會直接播放。長條要有背景色，寬度或高度用百分比寫在自己的 style 裡，或放在細長的軌道裡。'),
        ai: 'put it on a bar chart\'s container after its bars exist: when it scrolls into view (or on load when already visible) its bars grow from zero. A bar is a filled box (empty or holding its value) whose width or height is a percentage in its own style attribute, or the fill of a thin track; the editor finds and marks them, and applying grow again finds bars added later',
        frames: 'from { --tfx-in: 0; } to { --tfx-in: 1; }',
        range: 'entry min(30% + ' + TV + ' * 20%, 6rem + ' + TV + ' * 3rem) entry min(50% + ' + TV + ' * 20%, 10rem + ' + TV + ' * 3rem)',
        demo: { ms: 1000, ease: EASE.out, css: (host) => barCss(host, 'tfxd-grow', '900ms') },
      },
    ],
    scroll: [
      {
        name: 'parallax', label: t('視差'), target: 'self', tf: 'self', timing: false, timeline: 'view()',
        desc: t('捲動時移動得比頁面慢一點，產生景深。只適合裝飾性的圖片或色塊，不要用在文字上。'),
        ai: 'decorative only: moves slower than the page while scrolling (images, shapes; never text)',
        frames: 'from { transform: translateY(' + kx('12%') + '); } to { transform: translateY(' + kx('-12%') + '); }',
        range: 'cover 0% cover 100%',
        demo: { ms: 1600, ease: EASE.smooth, frames: '30% { transform: translateY(' + kx('12%') + '); } 75% { transform: translateY(' + kx('-12%') + '); }' },
      },
      {
        name: 'tilt-up', label: t('傾斜立起'), target: 'self', tf: 'self', timing: true, timeline: 'view()',
        desc: t('捲動進入畫面時，從往後仰的角度立起來。適合圖片、卡片和區塊。'),
        ai: 'tilts up from leaning back as it scrolls into view (images, cards, sections)',
        decl: ['transform-origin: 50% 100%'],
        frames: 'from { opacity: calc(1 - .5 * ' + KV + '); transform: perspective(60rem) rotateX(' + kx('22deg') + '); }',
        range: 'entry calc(' + TV + ' * min(15%, 3rem)) entry min(90% + ' + TV + ' * 10%, 18rem + ' + TV + ' * 4rem)',
        demo: { ms: 1000, ease: EASE.out },
      },
      {
        name: 'shrink', label: t('頁首收合'), target: 'self', tf: 'self', timing: true, timeline: 'scroll(root)', sticky: true,
        desc: t('頁首固定在畫面頂端；往下捲時微微縮小、變成圓角並浮起陰影。套在頁首或導覽列上。'),
        ai: 'for a header or nav bar: it sticks to the top and shrinks into a floating bar as the page scrolls',
        struct: (c) => [R(':where(' + c + ')', ['position: sticky', 'top: 0', 'z-index: 20'])],
        decl: ['transform-origin: 50% 0'],
        frames: 'to { ' + shrunk() + ' }',
        range: '0px calc(200px + ' + TV + ' * 100px)',
        demo: { ms: 1700, ease: EASE.smooth, frames: '45%, 65% { ' + shrunk() + ' }' },
      },
      {
        name: 'fill', label: t('捲動填字'), target: 'self', timing: true, color: true, intensity: false, timeline: 'view()',
        desc: t('捲動經過時，淡色文字由左到右填滿顏色。適合一兩段重點文字；元素原本的背景圖片會暫時被取代，頁尾附近捲不到畫面中間的段落會停在半填滿。'),
        ai: 'faint text fills with colour from left to right while it scrolls past (one or two key paragraphs; replaces the element\'s own background image)',
        frames: 'from { ' + filled('0%') + ' } to { ' + filled('100%') + ' }',
        range: 'cover calc(20% + ' + TV + ' * 10%) cover calc(50% + ' + TV + ' * 10%)',
        demo: { ms: 1300, ease: EASE.smooth },
      },
    ],
  };
  /**
   * The fill is all or nothing: every declaration is in both keyframes, so it applies only while the animation
   * does (animated values also beat inline styles, which could otherwise reset the image and leave the text
   * transparent), and nothing applies when the timeline is missing or motion is reduced. The third, empty layer
   * keeps the author's background colour on the whole box: the colour is clipped like the bottom layer.
   */
  function filled(size) {
    const faint = 'color-mix(in srgb, currentColor 35%, transparent)';
    return 'background-image: linear-gradient(' + CV + ', ' + CV + '), linear-gradient(' + faint + ', ' + faint + '), none; ' +
      'background-size: ' + size + ' 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; ' +
      '-webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent;';
  }
  function shrunk() {
    return 'transform: translateY(' + kx('.4rem') + ') scale(calc(1 - .04 * ' + KV + ')); border-radius: ' + kx('.9rem') + '; box-shadow: 0 .6rem 1.6rem -.8rem rgb(0 0 0 / .32);';
  }
  /**
   * The bars of a grow container (host selector) growing from zero along their axis, from the edge they are
   * anchored at: keyframes <name>-x / -xe / -y / -ye grow from the left, right, bottom and top. `scale` leaves
   * the bar's own transform alone, and the origin is set only inside the keyframes with nothing filled
   * forwards, so once grown the bar's own scale, transform and origin apply as authored.
   */
  function barCss(host, name, ms) {
    const x = host + ' .' + BAR_X;
    const y = host + ' .' + BAR_Y;
    const frames = (suffix, scale, origin) => '@keyframes ' + name + suffix + ' { from { scale: ' + scale + '; transform-origin: ' + origin +
      '; } to { transform-origin: ' + origin + '; } }';
    const run = (suffix) => 'animation: ' + name + suffix + ' ' + ms + ' ' + EASE.out + ' backwards';
    return [
      frames('-x', '0 1', '0 50%'),
      frames('-xe', '0 1', '100% 50%'),
      frames('-y', '1 0', '50% 100%'),
      frames('-ye', '1 0', '50% 0'),
      R(x, [run('-x')]),
      R(x + '.' + BAR_END, ['animation-name: ' + name + '-xe']),
      R(y, [run('-y')]),
      R(y + '.' + BAR_END, ['animation-name: ' + name + '-ye']),
    ];
  }
  /** Inside the scroll-timeline block: bars wait at zero while their container's --tfx-in is 0, and grow once it is 1. */
  function growCss() {
    const host = selOf(BY.entrance.grow);
    return [
      '@container style(--tfx-in: 0) {',
      '  ' + R(host + ' .' + BAR_X, ['scale: 0 1']),
      '  ' + R(host + ' .' + BAR_Y, ['scale: 1 0']),
      '}',
      '@container style(--tfx-in: 1) {',
    ].concat(barCss(host, 'tfx-grow', '.9s').map((l) => '  ' + l), '}');
  }

  const BY = {};
  for (const kind of KINDS) {
    BY[kind] = Object.create(null);
    for (const p of PRESETS[kind]) { p.kind = kind; BY[kind][p.name] = p; }
  }

  /* ------------------------------------------------------------------ */
  /* Reading the model                                                   */
  /* ------------------------------------------------------------------ */

  function arr(ids) { return (Array.isArray(ids) ? ids : [ids]).filter(Boolean); }
  function idOf(el) { return el && el.getAttribute ? el.getAttribute(HE.ID_ATTR) : null; }
  function preset(kind, name) { return (BY[kind] && name && BY[kind][name]) || null; }
  function selOf(p) { return '.' + PREFIX[p.kind] + p.name; }
  function empty() { return { hover: null, entrance: null, scroll: null }; }
  function hasAny(fx) { return !!fx && !!(fx.hover || fx.entrance || fx.scroll); }

  /** The effects an element's classes name (unknown tfx-* names are ignored). */
  function parse(el) {
    const out = empty();
    const cls = el && el.getAttribute ? el.getAttribute('class') : '';
    if (!cls || cls.indexOf('tfx-') < 0) return out;
    for (const c of cls.split(/\s+/)) {
      for (const kind of KINDS) {
        if (out[kind] || !c.startsWith(PREFIX[kind])) continue;
        const name = c.slice(PREFIX[kind].length);
        if (BY[kind][name]) out[kind] = name;
      }
    }
    return out;
  }
  function inlineVar(el, prop) {
    return el && el.style ? String(el.style.getPropertyValue(prop) || '').trim() : '';
  }
  function canHost(el) {
    const t = util.tag(el);
    return !!t && !NO_HOST.has(t) && !NON_VISUAL.has(t) && !!HE.doc.body && HE.doc.body.contains(el) &&
      !(el.parentElement && el.parentElement.closest('svg, math')); // an <svg> may move, its shapes have no ids
  }
  function kidsOf(el) { return el ? Array.from(el.children).filter((c) => !NON_VISUAL.has(util.tag(c))) : []; }

  /** {hover, entrance, scroll, intensity, timing, color} of a model element. */
  function of(id) {
    const m = typeof id === 'string' ? HE.doc.byId(id) : id;
    const fx = parse(m);
    const k = parseFloat(inlineVar(m, '--tfx-k'));
    const t = parseFloat(inlineVar(m, '--tfx-t'));
    fx.intensity = !isFinite(k) ? 'medium' : INTENSITY.reduce((a, b) => (Math.abs(b.k - k) < Math.abs(a.k - k) ? b : a)).value;
    fx.timing = !isFinite(t) || t === 0 ? 'medium' : t < 0 ? 'early' : 'late';
    fx.color = inlineVar(m, '--tfx-color');
    return fx;
  }
  function has(id) { return hasAny(parse(typeof id === 'string' ? HE.doc.byId(id) : id)); }
  function hosts() {
    const m = HE.doc.model;
    return m ? Array.from(m.querySelectorAll('[class*="tfx-"]')).filter((el) => hasAny(parse(el))) : [];
  }
  function count() { return hosts().length; }

  function labelOf(kind, name) { const p = preset(kind, name); return p ? p.label : name; }
  /** "懸停：浮起 · 進場：模糊上升 · 強度：強" (lang 'en': "hover lift, entrance blur-rise, intensity strong"). */
  function describe(idOrEl, lang) {
    const m = typeof idOrEl === 'string' ? HE.doc.byId(idOrEl) : idOrEl;
    if (!m) return '';
    const fx = of(m);
    if (!hasAny(fx)) return '';
    const en = lang === 'en';
    const bits = [];
    for (const kind of KINDS) if (fx[kind]) bits.push(en ? kind + ' ' + fx[kind] : t('{kind}：{name}', { kind: KIND_ZH[kind], name: labelOf(kind, fx[kind]) }));
    if (fx.intensity !== 'medium') bits.push(en ? 'intensity ' + fx.intensity : t('強度：{level}', { level: INTENSITY.find((x) => x.value === fx.intensity).label }));
    if (fx.timing !== 'medium' && (fx.entrance || fx.scroll)) bits.push(en ? 'timing ' + fx.timing : t('時機：{when}', { when: TIMING.find((x) => x.value === fx.timing).label }));
    if (fx.color) bits.push(en ? 'color ' + fx.color : t('顏色：{color}', { color: fx.color }));
    return bits.join(en ? ', ' : ' · ');
  }
  /** One line for the AI context: "[h4] hover lift; [h9] entrance deal, timing late" (empty when none). */
  function summary(max = 24) {
    const list = hosts();
    if (!list.length) return '';
    const barCount = (el) => (parse(el).entrance === 'grow' ? ' (' + marked(el).filter((b) => barHost(b) === el).length + ' bars found)' : '');
    const parts = list.slice(0, max).map((el) => '[' + idOf(el) + '] ' + describe(el, 'en') + barCount(el));
    return list.length + ' element(s): ' + parts.join('; ') + (list.length > max ? '; …' : '');
  }

  /* ------------------------------------------------------------------ */
  /* CSS generation                                                      */
  /* ------------------------------------------------------------------ */

  const PROPS = {
    k: '@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }',
    t: '@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }',
    i: '@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }',
    n: '@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }',
    angle: '@property --tfx-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }',
    // Inherited, so the bars' parents (what an unnamed style query reads) see their container's value.
    in: '@property --tfx-in { syntax: "<integer>"; inherits: true; initial-value: 1; }',
  };
  const HEAD_NOTE = '/* Tactile 動態效果：依頁面中的 tfx-* 類別自動產生，請在編輯器的「動態效果」修改。 */'; // i18n-ok: written into the document's CSS
  const HEAD_NOTE_HANS = '/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */'; // i18n-ok: written into the document's CSS
  const HEAD_NOTE_EN = '/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */';
  /** The note follows the document's language, not the interface's: the same document gets the same CSS from every editor. */
  function headNote() {
    const lang = (HE.doc.model && HE.doc.model.documentElement.getAttribute('lang')) || '';
    if (/^zh-(hans|cn|sg)/i.test(lang)) return HEAD_NOTE_HANS;
    return !lang || /^zh/i.test(lang) ? HEAD_NOTE : HEAD_NOTE_EN;
  }

  function indent(lines, n) {
    const pad = ' '.repeat(n);
    return lines.map((l) => pad + l).join('\n');
  }
  function animSel(p) { return p.target === 'kids' ? selOf(p) + ' > *' : selOf(p); }
  /**
   * list: [{p (preset), name (keyframes name), comp?}]. The `animation` shorthand resets animation-timeline,
   * so the timeline and range come after it. Duration: 1ms is mapped onto the scroll range where `auto` is
   * not known; `auto` wins elsewhere.
   */
  function animRule(sel, list) {
    const decl = [];
    for (const p of new Set(list.map((a) => a.p))) decl.push(...(p.decl || []));
    decl.push(
      'animation: ' + list.map((a) => a.name + ' linear both').join(', '),
      'animation-duration: 1ms', 'animation-duration: auto',
      'animation-timeline: ' + list.map((a) => a.p.timeline).join(', '),
      'animation-range: ' + list.map((a) => a.p.range).join(', '));
    if (list.some((a) => a.comp)) decl.push('animation-composition: ' + list.map((a) => a.comp || 'replace').join(', '));
    return R(sel, decl);
  }
  /** A keyframes body split into its transform declarations and the rest: {tf, rest} (either may be ''). */
  function splitFrames(frames) {
    const tf = [];
    const rest = [];
    frames.replace(/([^{}]+)\{([^{}]*)\}/g, (all, sel, body) => {
      const decls = body.split(';').map((d) => d.trim()).filter(Boolean);
      const a = decls.filter((d) => /^transform\s*:/.test(d));
      const b = decls.filter((d) => !/^transform\s*:/.test(d));
      if (a.length) tf.push(sel.trim() + ' { ' + a.join('; ') + '; }');
      if (b.length) rest.push(sel.trim() + ' { ' + b.join('; ') + '; }');
      return all;
    });
    return { tf: tf.join(' '), rest: rest.join(' ') };
  }
  /**
   * Entrance + scroll on one element need one animation list (two class rules would each set `animation`).
   * When both move the element, the scroll transform is added to the entrance one (`add`); composition
   * applies to every property of an animation, so the scroll preset's other properties (tilt-up's opacity,
   * shrink's radius and shadow) run as a separate `replace` animation placed first, and the entrance's
   * implicit end keyframe blends into them. Returns {keyframes: [text], rule}.
   */
  function comboCss(e, s) {
    const sel = selOf(e) + selOf(s);
    if (!/transform:/.test(e.frames) || !/transform:/.test(s.frames)) {
      return { keyframes: [], rule: animRule(sel, [{ p: e, name: 'tfx-' + e.name }, { p: s, name: 'tfx-' + s.name }]) };
    }
    const parts = splitFrames(s.frames);
    const keyframes = ['@keyframes tfx-' + s.name + '-tf { ' + parts.tf + ' }'];
    const list = [];
    if (parts.rest) {
      keyframes.push('@keyframes tfx-' + s.name + '-rest { ' + parts.rest + ' }');
      list.push({ p: s, name: 'tfx-' + s.name + '-rest' });
    }
    list.push({ p: e, name: 'tfx-' + e.name }, { p: s, name: 'tfx-' + s.name + '-tf', comp: 'add' });
    return { keyframes, rule: animRule(sel, list) };
  }

  /** used: {presets: [preset], combos: [[entrancePreset, scrollPreset]]} -> {fx, motion} CSS text. */
  function buildCss(used) {
    if (!used.presets.length) return { fx: '', motion: '' };
    const props = new Set(['k', 't']);
    const struct = [];
    const rest = [];
    const on = [];
    const focus = [];
    const anim = [];
    for (const p of used.presets) {
      const c = selOf(p);
      if (p.kids) { props.add('i'); props.add('n'); }
      if (p.name === 'trace') props.add('angle');
      if (p.bars) props.add('in');
      if (p.struct) struct.push(...p.struct(c));
      if (p.kind === 'hover') {
        rest.push(...p.rest(c));
        on.push(...p.on(c + ':hover'));
        focus.push(...p.on(c + (p.card ? ':is(:focus-visible, :focus-within)' : ':focus-visible')));
      } else {
        anim.push('@keyframes tfx-' + p.name + ' { ' + p.frames + ' }', animRule(animSel(p), [{ p, name: 'tfx-' + p.name }]));
        if (p.bars) anim.push(...growCss());
      }
    }
    const comboFrames = new Set();
    for (const [e, s] of used.combos) {
      const c = comboCss(e, s);
      for (const k of c.keyframes) if (!comboFrames.has(k)) { comboFrames.add(k); anim.push(k); }
      anim.push(c.rule);
    }
    // A grow container dealt in with its siblings runs both (as one list: two rules would each set `animation`).
    if (used.dealtGrow) {
      const deal = BY.entrance.deal;
      const grow = BY.entrance.grow;
      anim.push(animRule(selOf(deal) + ' > ' + selOf(grow), [{ p: deal, name: 'tfx-deal' }, { p: grow, name: 'tfx-grow' }]));
    }
    const fx = [headNote()].concat(Array.from(props).map((k) => PROPS[k]), struct).join('\n');
    const motion = [headNote(), '@media (prefers-reduced-motion: no-preference) {'];
    if (rest.length) motion.push(indent(rest, 2));
    if (on.length) motion.push('  @media (hover: hover) {', indent(on, 4), '  }', indent(focus, 2));
    if (anim.length) motion.push('  @media screen {', '    @supports (animation-timeline: view()) {', indent(anim, 6), '    }', '  }');
    motion.push('}');
    return { fx, motion: motion.join('\n') };
  }

  function collect() {
    const seen = new Set();
    const presets = [];
    const combos = new Map();
    let dealtGrow = false;
    for (const el of hosts()) {
      const fx = parse(el);
      for (const kind of KINDS) {
        const p = preset(kind, fx[kind]);
        if (p && !seen.has(p)) { seen.add(p); presets.push(p); }
      }
      const e = preset('entrance', fx.entrance);
      const s = preset('scroll', fx.scroll);
      if (e && s && e.target === 'self') combos.set(e.name + '|' + s.name, [e, s]);
      if (fx.entrance === 'grow' && el.parentElement && parse(el.parentElement).entrance === 'deal') dealtGrow = true;
    }
    // A stable order: the CSS text only changes when the set of presets does.
    const order = (p) => KINDS.indexOf(p.kind) * 100 + PRESETS[p.kind].indexOf(p);
    presets.sort((a, b) => order(a) - order(b));
    return { presets, combos: Array.from(combos.keys()).sort().map((k) => combos.get(k)), dealtGrow };
  }

  /* ------------------------------------------------------------------ */
  /* Sync (runs inside the transaction that changed the classes)         */
  /* ------------------------------------------------------------------ */

  let observer = null;
  let watched = null;
  let dirty = false;
  let syncing = false;

  function watch() {
    const m = HE.doc.model;
    if (!observer || m === watched) return false;
    observer.disconnect();
    watched = m;
    if (m) observer.observe(m, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return true;
  }

  function setVars(id, want) {
    const m = HE.doc.byId(id);
    if (!m) return;
    const diff = {};
    for (const [p, v] of Object.entries(want)) if (inlineVar(m, p) !== v) diff[p] = v;
    if (Object.keys(diff).length) HE.ops.setStyle(id, diff, { label: t('更新動態效果') });
  }

  /**
   * Children of fan / deal containers carry their true index (and the fan its count). The deal's stagger
   * cap lives in its CSS (IC), so a fan and a deal on one container can share --tfx-i.
   */
  function syncKids(host) {
    const fx = parse(host);
    const fan = fx.hover === 'fan';
    const deal = fx.entrance === 'deal';
    if (!fan && !deal) return;
    const kids = kidsOf(host);
    kids.forEach((c, i) => {
      const id = idOf(c);
      if (!id) return;
      setVars(id, { '--tfx-i': String(i), '--tfx-n': fan ? String(kids.length) : '' });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Bars of a grow container                                            */
  /* ------------------------------------------------------------------ */

  /** The grow container a bar belongs to: its nearest ancestor with grow. */
  function barHost(el) { return el && el.parentElement ? el.parentElement.closest(selOf(BY.entrance.grow)) : null; }
  /** Marked bars inside a model element. */
  function marked(m) { return m ? Array.from(m.querySelectorAll('.' + BAR_X + ', .' + BAR_Y)) : []; }
  function bars(id) { return marked(typeof id === 'string' ? HE.doc.byId(id) : id).map(idOf).filter(Boolean); }

  /** Set ({axis: 'x' | 'y', end}) or clear (null) the bar markers of a model element, writing only a change. */
  function setBar(el, bar) {
    const id = idOf(el);
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    const want = { [BAR_X]: !!bar && bar.axis === 'x', [BAR_Y]: !!bar && bar.axis === 'y', [BAR_END]: !!bar && !!bar.end };
    if (!id || Object.keys(want).every((c) => cls.includes(c) === want[c])) return;
    const next = cls.filter((c) => !(c in want)).concat(Object.keys(want).filter((c) => want[c]));
    HE.ops.setClasses(id, next.join(' '), { label: t('標記長條') });
  }

  /** A filled box: a background colour or a gradient (a picture alone is an image, not a bar). */
  function painted(cs) {
    if (/gradient\(/i.test(String(cs.backgroundImage || ''))) return true;
    const c = String(cs.backgroundColor || '').replace(/\s+/g, '');
    return !!c && c !== 'transparent' && !/^rgba\(\d+,\d+,\d+,0(\.0+)?\)$/.test(c) && !/\/0(\.0+)?%?\)$/.test(c);
  }
  /**
   * The lengths the inline style gives as shares of the parent: {x, y}, each 'part' (a plain percentage under
   * 100%), 'full' (100%) or null, and pct {x, y} (the numbers). A flex basis counts only without flex-grow
   * (`flex: 1` reads back as a 0% basis); calc() and other expressions are not shares.
   */
  function declared(m) {
    const st = m.style;
    const read = (p) => (st ? String(st.getPropertyValue(p) || '').trim() : '');
    const pct = { x: null, y: null };
    const kind = (axis, props) => {
      let out = null;
      for (const p of props) {
        const v = read(p);
        if (!/^(\d+(\.\d*)?|\.\d+)%$/.test(v)) continue;
        const n = parseFloat(v);
        if (n < 100) { pct[axis] = n; return 'part'; }
        if (n === 100) { pct[axis] = 100; out = 'full'; }
      }
      return out;
    };
    const x = kind('x', parseFloat(read('flex-grow')) > 0 ? ['width', 'inline-size'] : ['width', 'inline-size', 'flex-basis']);
    const y = kind('y', ['height', 'block-size']);
    return { x, y, pct };
  }
  /** Text a bar may hold: none, or a short value ("62%", "1,200", "$12k", "3.5 萬"), not a word or a name. */
  function valueText(text) {
    const t = String(text || '').replace(/\s+/g, '');
    if (!t) return true;
    return t.length <= 12 && /\d/.test(t) && t.replace(/[\d.,:+\-−–~/%°$€£¥₩₹()]/g, '').length <= 3;
  }
  const LABEL_KID = new Set(['span', 'b', 'strong', 'em', 'i', 'small', 'sub', 'sup', 'abbr', 'data', 'output', 'time', 'bdi', 'bdo']);
  const near = (a, b) => Math.abs(a - b) <= 1.5;

  /**
   * A model element that could be a bar: a filled box whose only content is a short value, as text or in
   * unfilled inline labels. {m, l, d (declared()), w, h, r (client rect; null when not laid out), rtl}.
   */
  function candidate(m) {
    const t = util.tag(m);
    if (!t || NO_BAR.has(t) || NON_VISUAL.has(t) || REPLACED.has(t) || NO_HOST.has(t) || !idOf(m)) return null;
    const kids = Array.from(m.children);
    if (kids.some((k) => !LABEL_KID.has(util.tag(k)) || k.children.length) || !valueText(m.textContent)) return null;
    if (m.parentElement && m.parentElement.closest('svg, math')) return null;
    const dir = m.closest('[dir]');
    const c = { m, l: null, d: declared(m), w: 0, h: 0, r: null, rtl: !!dir && String(dir.getAttribute('dir')).toLowerCase() === 'rtl' };
    const l = HE.live.byId(idOf(m));
    const win = l && l.ownerDocument ? l.ownerDocument.defaultView : null;
    const cs = win ? computed(win, l) : null;
    if (!cs) return c;
    if (!/^(block|inline-block|flex|inline-flex|grid|inline-grid|flow-root)$/.test(cs.display) || !painted(cs)) return null;
    for (const k of kids) {
      const kl = HE.live.byId(idOf(k));
      const kc = kl ? computed(win, kl) : null;
      if (kc && painted(kc)) return null;
    }
    c.l = l;
    if (cs.direction) c.rtl = cs.direction === 'rtl';
    c.w = l.offsetWidth;
    c.h = l.offsetHeight;
    if (c.w || c.h) c.r = l.getBoundingClientRect();
    return c;
  }

  /** The content box of a live element and the rects of what else it shows (in-flow children and text runs). */
  function boxOf(p, win) {
    const pcs = computed(win, p);
    const r = p.getBoundingClientRect();
    const pad = (side) => (pcs ? parseFloat(pcs['padding' + side]) || 0 : 0);
    const left = r.left + p.clientLeft + pad('Left');
    const top = r.top + p.clientTop + pad('Top');
    const width = p.clientWidth - pad('Left') - pad('Right');
    const height = p.clientHeight - pad('Top') - pad('Bottom');
    const items = [];
    for (const n of Array.from(p.childNodes)) {
      let rect = null;
      if (n.nodeType === 1) {
        const ncs = computed(win, n);
        if (ncs && /^(absolute|fixed)$/.test(ncs.position)) continue;
        rect = n.getBoundingClientRect();
      } else if (n.nodeType === 3 && /\S/.test(n.data)) {
        const range = p.ownerDocument.createRange();
        range.selectNodeContents(n);
        rect = range.getBoundingClientRect();
      }
      if (rect && (rect.width || rect.height)) items.push({ n, r: rect });
    }
    return { left, top, width, height, right: left + width, bottom: top + height, items };
  }

  /**
   * The edge a laid-out bar grows from along its axis: 'start' (left / bottom), 'end' (right / top), or null
   * when it floats in the middle (a centred rule). The gaps run to the parent's content box or to the nearest
   * thing beside the bar on its line; a bar that fills its line grows from the inline start.
   */
  function anchor(c, axis, box) {
    const r = c.r;
    const x = axis === 'x';
    let lo = x ? box.left : box.top;
    let hi = x ? box.right : box.bottom;
    for (const it of box.items) {
      if (it.n === c.l) continue;
      const s = it.r;
      if (x ? s.bottom <= r.top + 0.5 || s.top >= r.bottom - 0.5 : s.right <= r.left + 0.5 || s.left >= r.right - 0.5) continue;
      if ((x ? s.right : s.bottom) <= (x ? r.left : r.top) + 0.5) lo = Math.max(lo, x ? s.right : s.bottom);
      else if ((x ? s.left : s.top) >= (x ? r.right : r.bottom) - 0.5) hi = Math.min(hi, x ? s.left : s.top);
    }
    const before = (x ? r.left : r.top) - lo;
    const after = hi - (x ? r.right : r.bottom);
    if (before <= 1.5 && after <= 1.5) return x && c.rtl ? 'end' : 'start';
    if (before <= 1.5) return x ? 'start' : 'end';
    if (after <= 1.5) return x ? 'end' : 'start';
    if (Math.abs(before - after) <= 2) return null;
    return x === (before < after) ? 'start' : 'end';
  }

  /** The axis a box with inline shares grows along. Both set: the one that differs between like siblings, else its long side. */
  function partAxis(c) {
    const { x, y } = c.d;
    if (x === 'part' && y !== 'part') return 'x';
    if (y === 'part' && x !== 'part') return 'y';
    if (x !== 'part') return null;
    const sibs = Array.from(c.m.parentElement ? c.m.parentElement.children : []).filter((s) => s !== c.m).map(declared).filter((d) => d.x || d.y);
    const same = (axis) => sibs.length > 0 && sibs.every((d) => d.pct[axis] === c.d.pct[axis]);
    if (same('x') && !same('y')) return 'y';
    if (same('y') && !same('x')) return 'x';
    return c.r ? (c.h > c.w ? 'y' : 'x') : null;
  }

  /**
   * Which empty boxes of a live track (an element holding only empty boxes) are bars: they tile it from one
   * edge with no gaps (one fill, or the segments of a stacked bar), each as thick as the thin track.
   * Returns {axis, side, kids} or null. A lone square box (a dot, a knob) counts only in a filled track.
   */
  function trackBars(p, win, cands) {
    if (!Array.from(p.childNodes).every((n) => (n.nodeType === 1 ? !n.children.length && !textOf(n) : n.nodeType !== 3 || !/\S/.test(n.data)))) return null;
    const box = boxOf(p, win);
    const kids = Array.from(p.children).map((l) => ({ l, r: l.getBoundingClientRect() }));
    if (!kids.length) return null;
    for (const axis of ['x', 'y']) {
      const x = axis === 'x';
      const thick = x ? box.height : box.width;
      const long = x ? box.width : box.height;
      if (thick < 4 || long < (x ? 4 : 3) * thick || !kids.every((k) => near(x ? k.r.height : k.r.width, thick))) continue;
      const run = kids.slice().sort((a, b) => (x ? a.r.left - b.r.left : b.r.bottom - a.r.bottom));
      if (!run.every((k, i) => !i || (x ? near(k.r.left, run[i - 1].r.right) : near(k.r.bottom, run[i - 1].r.top)))) continue;
      const first = run[0].r;
      const last = run[run.length - 1].r;
      const atLo = x ? near(first.left, box.left) : near(first.bottom, box.bottom);
      const atHi = x ? near(last.right, box.right) : near(last.top, box.top);
      if (!atLo && !atHi) continue;
      const fills = run.map((k) => cands.get(k.l)).filter(Boolean);
      if (!fills.length) continue;
      const lone = fills.length === 1 && near(fills[0].w, fills[0].h);
      if (lone && !painted(computed(win, p) || {})) continue;
      const rtl = fills[0].rtl;
      const side = atLo && atHi ? (x && rtl ? 'end' : 'start') : (atLo ? 'start' : 'end');
      return { axis, side, kids: fills };
    }
    return null;
  }

  /** Run fn with the frame's effect motion (and a running ▶ 預覽) switched off, so bars measure at rest. */
  function still(fn) {
    const d = HE.live.doc;
    const styles = d ? Array.from(d.querySelectorAll('style[data-he-style="fx-motion"], style[data-he-editor="fx-demo"]')) : [];
    const prev = styles.map((st) => st.getAttribute('media'));
    try {
      styles.forEach((st) => { if (st.getAttribute('media') !== 'not all') st.setAttribute('media', 'not all'); });
      return fn();
    } finally {
      styles.forEach((st, i) => { if (prev[i] == null) st.removeAttribute('media'); else if (st.getAttribute('media') !== prev[i]) st.setAttribute('media', prev[i]); });
    }
  }

  /**
   * [{el, axis, end}] of the bars inside a model element (bounded, in document order). A bar is a filled box
   * (empty or holding a short value) that is anchored at one edge and:
   *   - has a plain percentage width (height) in its own style: thin ones on their own, thicker ones when two
   *     or more on that axis have different values;
   *   - or fills a thin track from one edge (one fill or stacked segments);
   *   - or sits beside a bar like it (same thickness, same edge): the 100% bar, bars sized by classes;
   *   - or is one of a row of two or more equally thick boxes of different lengths on a common edge (columns).
   * Without a laid-out frame only the inline percentages count.
   */
  function findBarsIn(host) {
    if (!host) return [];
    return still(() => {
      const all = host.getElementsByTagName('*');
      const n = Math.min(all.length, BAR_SCAN);
      const cands = new Map(); // model element -> candidate
      const byLive = new Map();
      for (let i = 0; i < n; i++) {
        const c = candidate(all[i]);
        if (!c) continue;
        cands.set(all[i], c);
        if (c.l) byLive.set(c.l, c);
      }
      const found = new Map(); // model element -> {el, axis, end, c}
      const take = (c, axis, side) => { if (!found.has(c.m)) found.set(c.m, { el: c.m, axis, end: side === 'end', c }); };
      const boxes = new Map();
      const boxFor = (c) => {
        const p = c.l.parentElement;
        if (!boxes.has(p)) boxes.set(p, boxOf(p, c.l.ownerDocument.defaultView));
        return boxes.get(p);
      };
      const thickness = (c, axis) => (axis === 'x' ? c.h : c.w);
      const length = (c, axis) => (axis === 'x' ? c.w : c.h);
      // 1. inline shares
      const wide = [];
      for (const c of cands.values()) {
        const axis = partAxis(c);
        if (!axis) continue;
        if (!c.r) { take(c, axis, axis === 'x' && c.rtl ? 'end' : 'start'); continue; }
        const side = anchor(c, axis, boxFor(c));
        if (!side || thickness(c, axis) < 4) continue;
        if (axis === 'x' ? c.h <= 64 : c.w <= 120) take(c, axis, side);
        else wide.push({ c, axis, side });
      }
      for (const axis of ['x', 'y']) {
        const group = wide.filter((g) => g.axis === axis);
        const values = new Set(group.map((g) => g.c.d.pct[axis]));
        for (const f of found.values()) if (f.axis === axis && f.c.d.pct[axis] != null) values.add(f.c.d.pct[axis]);
        if (group.length + Array.from(found.values()).filter((f) => f.axis === axis).length >= 2 && values.size >= 2) {
          for (const g of group) take(g.c, g.axis, g.side);
        }
      }
      // 2. tracks
      const tracks = new Set();
      for (const c of cands.values()) {
        if (!c.r || found.has(c.m)) continue;
        const p = c.l.parentElement;
        if (!p || tracks.has(p)) continue;
        tracks.add(p);
        const t = trackBars(p, c.l.ownerDocument.defaultView, byLive);
        if (t) for (const k of t.kids) take(k, t.axis, t.side);
      }
      // 3. boxes like a bar beside it, and 100% bars like an inline-share bar elsewhere in the container
      for (const f of Array.from(found.values())) {
        if (!f.c.r) continue;
        for (const s of Array.from(f.el.parentElement.children)) {
          const c = cands.get(s);
          if (!c || !c.r || found.has(s) || thickness(c, f.axis) < 4 || !near(thickness(c, f.axis), thickness(f.c, f.axis))) continue;
          if (near(c.w, c.h) && !c.d[f.axis]) continue;
          const side = anchor(c, f.axis, boxFor(c));
          if (side && side === (f.end ? 'end' : 'start')) take(c, f.axis, side);
        }
      }
      for (const c of cands.values()) {
        if (found.has(c.m)) continue;
        const axis = c.d.x === 'full' && c.d.y !== 'part' ? 'x' : c.d.y === 'full' && c.d.x !== 'part' ? 'y' : null;
        if (!axis) continue;
        const like = Array.from(found.values()).find((f) => f.axis === axis && f.c.d[axis] === 'part' && (!c.r || !f.c.r || near(thickness(c, axis), thickness(f.c, axis))));
        if (!like) continue;
        if (!c.r) { take(c, axis, like.end ? 'end' : 'start'); continue; }
        const side = anchor(c, axis, boxFor(c));
        if (side && thickness(c, axis) >= 4) take(c, axis, side);
      }
      // 4. rows of columns (bars) sized by classes
      const rows = new Map();
      for (const c of cands.values()) {
        if (!c.r || found.has(c.m)) continue;
        const p = c.m.parentElement;
        if (!rows.has(p)) rows.set(p, []);
        rows.get(p).push(c);
      }
      for (const list of rows.values()) {
        if (list.length < 2) continue;
        for (const axis of ['y', 'x']) {
          const t0 = thickness(list[0], axis);
          if (t0 < 4 || !list.every((c) => near(thickness(c, axis), t0))) continue;
          const lens = list.map((c) => length(c, axis));
          if (Math.max(...lens) - Math.min(...lens) <= 2 || list.every((c) => near(c.w, c.h))) continue;
          // side by side for columns, one under another for bars
          const order = list.slice().sort((a, b) => (axis === 'y' ? a.r.left - b.r.left : a.r.top - b.r.top));
          if (!order.every((c, i) => !i || (axis === 'y' ? c.r.left >= order[i - 1].r.right - 0.5 : c.r.top >= order[i - 1].r.bottom - 0.5))) continue;
          const sides = list.map((c) => anchor(c, axis, boxFor(c)));
          if (!sides[0] || !sides.every((s) => s === sides[0])) continue;
          list.forEach((c) => take(c, axis, sides[0]));
          break;
        }
      }
      const out = [];
      for (const el of cands.keys()) {
        const f = found.get(el);
        if (f && out.length < BAR_MAX) out.push({ el, axis: f.axis, end: f.end });
      }
      return out;
    });
  }
  function findBars(id) { return findBarsIn(typeof id === 'string' ? HE.doc.byId(id) : id).map((b) => idOf(b.el)); }

  /**
   * Mark the bars inside a grow container and unmark its own ones no longer found (inside a transaction).
   * A marked box that cannot be measured (the frame is hidden) but still looks like a bar keeps its marker.
   * Returns how many bars the container has marked now.
   */
  function markBars(id) {
    const host = HE.doc.byId(id);
    if (!host) return 0;
    const list = findBarsIn(host);
    const found = new Set(list.map((b) => b.el));
    const stale = marked(host).filter((el) => !found.has(el) && barHost(el) === host);
    const drop = still(() => stale.filter((el) => { const c = candidate(el); return !c || c.r; }));
    for (const el of drop) setBar(el, null);
    for (const b of list) setBar(b.el, b);
    return marked(host).filter((b) => barHost(b) === host).length;
  }
  /** Find a grow container's bars again as one undo step (after bars were added or restyled). */
  function refreshBars(id) {
    let n = 0;
    HE.history.transact(t('重新尋找長條'), () => { n = markBars(id); sync(); });
    HE.ui.status(n ? t('找到 {n} 條長條，捲動到圖表時會從 0 長出來', { n }) : t('沒有找到長條：長條要有背景色，寬度或高度用百分比寫在自己的 style 裡，或放在細長的軌道裡'));
    return n;
  }
  /** Markers outside every grow container (the effect was removed, a bar was pasted elsewhere) go. */
  function cleanBars() {
    const m = HE.doc.model;
    for (const el of marked(m)) if (!barHost(el)) setBar(el, null);
    for (const el of Array.from(m.querySelectorAll('.' + BAR_END + ':not(.' + BAR_X + '):not(.' + BAR_Y + ')'))) setBar(el, null);
  }

  /** Drop custom properties nothing reads any more (an effect class was removed, a child moved out). */
  function cleanVars() {
    const m = HE.doc.model;
    for (const el of Array.from(m.querySelectorAll('[style*="--tfx-"]'))) {
      const id = idOf(el);
      if (!id) continue;
      const fx = parse(el);
      const parent = parse(el.parentElement);
      const kid = (parent.hover === 'fan' || parent.entrance === 'deal') && !NON_VISUAL.has(util.tag(el));
      const want = {};
      if (!hasAny(fx)) { want['--tfx-k'] = ''; want['--tfx-t'] = ''; }
      else if (!fx.entrance && !fx.scroll) want['--tfx-t'] = '';
      if (!kid) { want['--tfx-i'] = ''; want['--tfx-n'] = ''; }
      setVars(id, want);
    }
  }

  /**
   * Regenerate 'fx' / 'fx-motion' from the classes in the model and keep the stagger indexes right.
   * Writes only what differs, inside the open transaction (or its own).
   */
  function sync() {
    if (syncing || !HE.doc.model) return false;
    syncing = true;
    let changed = false;
    try {
      watch();
      HE.history.transact(t('更新動態效果'), () => {
        // The managed styles live in the head, once. A copy elsewhere (page source pasted as text, a source
        // edit) would keep playing in edit mode and never be updated; the classes regenerate it anyway.
        const strays = [];
        for (const key of ['fx', 'fx-motion']) {
          const sel = 'style[data-he-style="' + key + '"]';
          const keep = HE.doc.model.head ? HE.doc.model.head.querySelector(sel) : null;
          for (const st of Array.from(HE.doc.model.querySelectorAll(sel))) if (st !== keep && idOf(st)) strays.push(idOf(st));
        }
        if (strays.length && HE.ops.remove(strays, { label: t('更新動態效果') })) changed = true;
        const css = buildCss(collect());
        for (const [key, text] of [['fx', css.fx], ['fx-motion', css.motion]]) {
          if (HE.ops.getHeadStyle(key) === text) continue;
          HE.ops.setHeadStyle(key, text, { label: t('更新動態效果') });
          changed = true;
        }
        cleanVars();
        cleanBars();
        hosts().forEach(syncKids);
      });
    } finally {
      if (observer) observer.takeRecords(); // our own writes
      dirty = false;
      syncing = false;
    }
    return changed;
  }

  /** History closer: sync only when classes or the tree changed (typing stays cheap). */
  function closer() {
    if (syncing || !HE.doc.model) return;
    const fresh = watch(); // a new model: load, undo/redo restore, replaceDocument
    const changed = !observer || fresh || dirty || observer.takeRecords().length > 0;
    if (changed) sync();
  }

  /* ------------------------------------------------------------------ */
  /* Applying                                                            */
  /* ------------------------------------------------------------------ */

  function validColor(v) {
    try { return !(window.CSS && CSS.supports) || CSS.supports('color', v); } catch (e) { return true; }
  }

  /**
   * Normalise a spec: {hover, entrance, scroll: preset name | 'none' | undefined (keep),
   * intensity: 'light'|'medium'|'strong', timing: 'early'|'medium'|'late', color: CSS color | '' (remove)}.
   * Throws on an unknown value.
   */
  function normSpec(spec) {
    const s = {};
    for (const kind of KINDS) {
      const v = spec[kind];
      if (v == null || v === '') continue;
      if (v !== 'none' && !preset(kind, v)) throw new Error('Unknown ' + kind + ' effect "' + v + '".');
      s[kind] = v;
    }
    if (spec.intensity != null && spec.intensity !== '') {
      if (!INTENSITY.some((x) => x.value === spec.intensity)) throw new Error('Unknown intensity "' + spec.intensity + '".');
      s.intensity = spec.intensity;
    }
    if (spec.timing != null && spec.timing !== '') {
      if (!TIMING.some((x) => x.value === spec.timing)) throw new Error('Unknown timing "' + spec.timing + '".');
      s.timing = spec.timing;
    }
    if (spec.color != null) {
      const c = String(spec.color).trim();
      if (c && !validColor(c)) throw new Error('"' + c + '" is not a CSS color.');
      s.color = c;
    }
    return s;
  }

  /** Set the classes and variables of one element (inside a transaction). Returns true when it has effects after. */
  function applyOne(id, spec) {
    const m = HE.doc.byId(id);
    if (!m || !canHost(m)) return false;
    const cls = (m.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    let next = cls.slice();
    for (const kind of KINDS) {
      if (!spec[kind]) continue;
      next = next.filter((c) => !c.startsWith(PREFIX[kind]));
      if (spec[kind] !== 'none') next.push(PREFIX[kind] + spec[kind]);
    }
    if (next.join(' ') !== cls.join(' ')) HE.ops.setClasses(id, next.join(' '), { label: t('套用動態效果') });
    const fx = parse(m);
    const want = {};
    if (!hasAny(fx)) {
      // Nothing reads them any more (--tfx-color is only written for effects).
      want['--tfx-k'] = '';
      want['--tfx-t'] = '';
      want['--tfx-color'] = '';
    } else {
      if (spec.intensity) want['--tfx-k'] = spec.intensity === 'medium' ? '' : String(INTENSITY.find((x) => x.value === spec.intensity).k);
      if (spec.timing) want['--tfx-t'] = spec.timing === 'medium' ? '' : String(TIMING.find((x) => x.value === spec.timing).t);
      if (!fx.entrance && !fx.scroll) want['--tfx-t'] = '';
      if (spec.color != null) want['--tfx-color'] = spec.color;
    }
    setVars(id, want);
    syncKids(m);
    // Choosing grow (again) finds the bars; a container that loses it has its markers dropped by sync.
    if (spec.entrance === 'grow' && fx.entrance === 'grow') markBars(id);
    return hasAny(fx);
  }

  function isMedia(el) { const t = util.tag(el); return t === 'img' || t === 'video' || t === 'picture'; }

  /**
   * Where a zoom asked for on an image goes: the frame that holds only it, else a new wrapper. A frame
   * that already has another hover effect keeps it: the zoom goes on a wrapper inside, and only when
   * no wrapper fits does it replace the frame's effect (recorded in out.replaced and the notes).
   */
  function zoomHost(id, out) {
    let m = HE.doc.byId(id);
    if (!m || !isMedia(m)) return id;
    if (util.tag(m.parentElement) === 'picture') m = m.parentElement;
    const frame = m.parentElement;
    const fs = frame ? liveStyle(idOf(frame)) : null;
    // overflow does not clip on an inline box (an <a> around the image): such a frame gets a wrapper inside.
    if (frame && !HE.doc.isRoot(frame) && canHost(frame) && kidsOf(frame).length === 1 && !(fs && fs.display === 'inline')) {
      const had = parse(frame).hover;
      if (!had || had === 'zoom') {
        out.notes.push(t('圖片縮放改套在圖片的外框上'));
        return idOf(frame);
      }
      const wid = wrapOne(idOf(m));
      if (wid) {
        out.notes.push(t('外框已有「{name}」，圖片縮放改套在新包的容器上', { name: labelOf('hover', had) }));
        return wid;
      }
      out.notes.push(t('外框原本的「{name}」已改成圖片縮放', { name: labelOf('hover', had) }));
      out.replaced[idOf(frame)] = had;
      return idOf(frame);
    }
    const wid = wrapOne(idOf(m));
    if (wid) out.notes.push(t('圖片縮放需要外框：已幫圖片包一層容器'));
    return wid || id;
  }

  /**
   * Where grow asked for on a bar goes: the element around it (grow belongs on a container of bars). An
   * entrance that element had is replaced, and the notes say so.
   */
  function growHost(id, out) {
    const m = HE.doc.byId(id);
    const p = m ? m.parentElement : null;
    if (!p || HE.doc.isRoot(p) || !canHost(p) || !findBarsIn(p).some((b) => b.el === m)) return id;
    const had = parse(p).entrance;
    const lost = had && had !== 'grow';
    out.notes.push(lost ? t('長條增長要套在長條的外框上，已改套在外框（外框原本的「{name}」已改成長條增長）', { name: labelOf('entrance', had) })
      : t('長條增長要套在長條的外框上，已改套在外框'));
    out.en.push('grow was put on the element around the bar: it belongs on a container of bars (best the whole chart).' +
      (lost ? ' That element\'s entrance "' + had + '" was replaced by grow.' : ''));
    return idOf(p);
  }

  /**
   * Apply a spec to elements as one undo step. Returns {ids: elements that hold the effects now,
   * notes: zh-TW remarks (an effect moved to a frame…), en: the moves in English (for the AI),
   * replaced: {frameId: hover preset a zoom replaced}}.
   */
  function apply(ids, spec, opts = {}) {
    const out = { ids: [], notes: [], en: [], replaced: {} };
    if (!HE.doc.model) return out;
    const s = normSpec(spec || {});
    HE.history.transact(opts.label || t('套用動態效果'), () => {
      for (const id of arr(ids)) {
        let target = id;
        // An effect asked for on the wrong element of a pair moves to the right one, which takes only that effect;
        // the element keeps the rest of the spec (an entrance…) and is reported when it holds an effect.
        const moved = (host, kind, own) => {
          const rest = Object.assign({}, s);
          delete rest[kind];
          if (Object.keys(rest).length && applyOne(id, rest) && !out.ids.includes(id)) out.ids.push(id);
          applyOne(host, own);
          if (!out.ids.includes(host)) out.ids.push(host);
        };
        if (s.hover === 'zoom' && isMedia(HE.doc.byId(id))) {
          const host = zoomHost(id, out);
          if (host !== id) {
            out.en.push('zoom was put on the frame around the image (a new wrapper when there was none).');
            moved(host, 'hover', { hover: 'zoom', intensity: s.intensity, color: s.color });
            continue;
          }
          target = host;
        }
        if (s.entrance === 'grow' && !findBarsIn(HE.doc.byId(id)).length) {
          const host = growHost(id, out);
          if (host !== id) {
            moved(host, 'entrance', { entrance: 'grow', timing: s.timing });
            continue;
          }
        }
        applyOne(target, s);
        if (!out.ids.includes(target)) out.ids.push(target);
      }
      sync();
    });
    return out;
  }

  /** Remove effects of the given kinds (all when kinds is empty) from elements. */
  function remove(ids, kinds, opts = {}) {
    const spec = {};
    for (const kind of (kinds && kinds.length ? kinds : KINDS)) spec[kind] = 'none';
    return apply(ids, spec, { label: opts.label || t('移除動態效果') });
  }

  /** Remove every effect in the document (and the managed styles). Returns how many elements had one. */
  function removeAll(opts = {}) {
    if (!HE.doc.model) return 0;
    const list = hosts().map(idOf).filter(Boolean);
    HE.history.transact(opts.label || t('移除全部動態效果'), () => {
      for (const id of list) applyOne(id, { hover: 'none', entrance: 'none', scroll: 'none', color: '' });
      sync();
    });
    return list.length;
  }

  /* ------------------------------------------------------------------ */
  /* Wrapping (when the element's own CSS would fight the effect)        */
  /* ------------------------------------------------------------------ */

  function liveStyle(id) {
    const l = HE.live.byId(id);
    try { return l && l.ownerDocument.defaultView ? l.ownerDocument.defaultView.getComputedStyle(l) : null; } catch (e) { return null; }
  }

  /** {tag, inlineBlock} of a wrapper the parser keeps around m, or null. */
  function wrapPlan(m) {
    const parent = m && m.parentElement;
    if (!parent || HE.doc.isRoot(m) || NO_WRAP.has(util.tag(m)) || !canHost(m)) return null;
    const fits = (w) => {
      if (!util.canPlace(parent, 'append', w) || !util.canContain(w, m)) return false;
      const para = parent.closest('p');
      return !para || util.canContain(para, w);
    };
    const cs = liveStyle(idOf(m));
    const inline = cs ? /^inline/.test(cs.display) : util.isInline(m);
    const tag = inline ? (fits('span') ? 'span' : null) : fits('div') ? 'div' : fits('span') ? 'span' : null;
    return tag ? { tag, inlineBlock: tag === 'span' } : null;
  }
  function wrapOne(id) {
    const m = HE.doc.byId(id);
    const plan = wrapPlan(m);
    if (!plan) return null;
    // A span wrapper is an inline box, which transforms ignore. Around inline media it also gets line-height 0
    // (no gap under the image's baseline) and the media's corner radius, so frames, sheens and zooms fit the media.
    let style = plan.inlineBlock ? 'display: inline-block' : '';
    if (plan.inlineBlock && MEDIA.has(util.tag(m))) {
      style += '; line-height: 0';
      const cs = liveStyle(id);
      const r = cs ? String(cs.borderRadius || '').trim() : '';
      if (r && !/^(0(px)?\s*)+$/.test(r)) style += '; border-radius: ' + r;
    }
    return HE.ops.wrap([id], plan.tag, style ? { style } : {}, { label: t('包一層容器') });
  }

  /** Move the effects of `kinds` from one element to another (inside a transaction). */
  function moveKinds(id, to, cur, moving) {
    const strip = {};
    const give = { intensity: cur.intensity, timing: cur.timing };
    for (const k of moving) { strip[k] = 'none'; give[k] = cur[k]; }
    if (cur.color) give.color = cur.color;
    applyOne(id, strip);
    applyOne(to, give);
    sync();
  }

  /** Wrap the element and move the effects of `kinds` (all when empty) to the wrapper, as one undo step. */
  function wrapAndMove(id, kinds) {
    const cur = of(id);
    const moving = (kinds && kinds.length ? kinds : KINDS).filter((k) => cur[k]);
    if (!moving.length) return null;
    if (!wrapPlan(HE.doc.byId(id))) { HE.ui.toast(t('這個元素不能再包一層容器。')); return null; }
    let wid = null;
    HE.history.transact(t('包一層容器並移動效果'), () => {
      wid = wrapOne(id);
      if (wid) moveKinds(id, wid, cur, moving);
    });
    if (wid) {
      HE.sel.set([wid]);
      HE.ui.status(t('已包一層容器，{kinds}效果改套在容器上', { kinds: moving.map((k) => KIND_ZH[k]).join(t('、')) }));
    }
    return wid;
  }

  /** Move the effects of `kinds` to an existing element (the frame around an image), as one undo step. */
  function moveTo(id, to, kinds) {
    const cur = of(id);
    const moving = kinds.filter((k) => cur[k]);
    if (!moving.length || !HE.doc.byId(to)) return null;
    HE.history.transact(t('把效果移到外框'), () => moveKinds(id, to, cur, moving));
    HE.sel.set([to]);
    HE.ui.status(t('{kinds}效果已改套在外框上', { kinds: moving.map((k) => KIND_ZH[k]).join(t('、')) }));
    return to;
  }

  /** The frame that holds only this media element and fits it exactly (±2px), with no hover effect of its own. */
  function snugFrame(m) {
    let media = m;
    if (util.tag(media.parentElement) === 'picture') media = media.parentElement;
    const frame = media.parentElement;
    if (!frame || HE.doc.isRoot(frame) || !canHost(frame) || kidsOf(frame).length !== 1 || parse(frame).hover) return null;
    const lm = HE.live.byId(idOf(media));
    const lf = HE.live.byId(idOf(frame));
    const fs = liveStyle(idOf(frame));
    if (!lm || !lf || !fs || fs.display === 'inline' || fs.display === 'contents') return null;
    const a = lm.getBoundingClientRect();
    const b = lf.getBoundingClientRect();
    return Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= 2 ? frame : null;
  }

  /* ------------------------------------------------------------------ */
  /* Hints                                                               */
  /* ------------------------------------------------------------------ */

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function hasDuration(list) { return String(list || '').split(',').some((d) => parseFloat(d) > 0); }
  function textOf(m) { return /\S/.test((m && m.textContent) || ''); }
  function computed(win, el, pseudo) {
    try { return win.getComputedStyle(el, pseudo || null); } catch (e) { return null; }
  }
  const PAINTED = /gradient|url\(|image(-set)?\(|cross-fade\(/i;
  /** The element's background-image without the 'fx' structure (underline's line), read and restored synchronously. */
  function authoredBackground(l, win) {
    const styles = Array.from(l.ownerDocument.querySelectorAll('style[data-he-style="fx"]'));
    const prev = styles.map((st) => st.getAttribute('media'));
    try {
      styles.forEach((st) => st.setAttribute('media', 'not all'));
      const c = computed(win, l);
      return c ? c.backgroundImage : 'none';
    } finally {
      styles.forEach((st, i) => { if (prev[i] == null) st.removeAttribute('media'); else st.setAttribute('media', prev[i]); });
    }
  }

  /**
   * A scroll timeline (and sticky) follows the nearest scroll container: one the user cannot scroll vertically
   * freezes view() effects (and sticky never sticks). <body> is one of its own only when <html> has overflow set
   * (html's then goes to the viewport), as with `html, body { overflow-x: hidden }`.
   */
  function overflowHints(l, win, s, add) {
    const d = l.ownerDocument;
    const root = computed(win, d.documentElement);
    const bodyOwn = !!root && (root.overflowX !== 'visible' || root.overflowY !== 'visible');
    const scroller = (v) => v === 'auto' || v === 'scroll';
    for (let a = l.parentElement; a && a !== d.documentElement; a = a.parentElement) {
      if (a === d.body && !bodyOwn) break;
      const ac = computed(win, a);
      if (!ac) continue;
      const x = ac.overflowX;
      const y = ac.overflowY;
      if (!scroller(x) && !scroller(y) && x !== 'hidden' && y !== 'hidden') continue;
      if (scroller(y) && a.scrollHeight > a.clientHeight + 1) return; // it scrolls: the effects follow it
      const aid = HE.live.idOf(a);
      const name = '<' + util.label((aid && HE.doc.byId(aid)) || a) + '>';
      const sticky = !!(s && s.sticky);
      if (x === 'hidden' || y === 'hidden') {
        // hidden cannot be scrolled by the user; clip paints the same and is no scroll container. Only the
        // hidden axes change (`overflow-x: hidden` makes y compute to auto, which then turns back to visible).
        const fix = {};
        if (x === 'hidden') fix['overflow-x'] = 'clip';
        if (y === 'hidden') fix['overflow-y'] = 'clip';
        add('overflow', 'warn', sticky
          ? t('上層的 {name} 設了 overflow: hidden，捲動相關的效果會停住不播放，頁首也無法固定在頂端。改為 clip 會保留裁切的外觀（但不再包住內部的浮動元素）。', { name })
          : t('上層的 {name} 設了 overflow: hidden，捲動相關的效果會停住不播放。改為 clip 會保留裁切的外觀（但不再包住內部的浮動元素）。', { name }),
          'An ancestor (' + name + ') has overflow: hidden, which stops scroll-driven effects. overflow: clip looks the same and does not.',
          aid ? { label: t('改為 overflow: clip'), run: () => HE.ops.setStyle(aid, fix, { label: t('改為 overflow: clip') }) } : null);
      } else {
        // auto/scroll: perhaps a sideways scroller (a table wrapper, a carousel), which clip would break.
        add('overflow-scroller', 'info', sticky
          ? t('上層的 {name} 是可捲動的容器（overflow: {value}），捲動相關的效果會跟著它而不是整頁；它不上下捲動時效果會停住，頁首也無法固定在頂端。可以把效果改套在它外面的元素上。', { name, value: scroller(x) ? x : y })
          : t('上層的 {name} 是可捲動的容器（overflow: {value}），捲動相關的效果會跟著它而不是整頁；它不上下捲動時效果會停住。可以把效果改套在它外面的元素上。', { name, value: scroller(x) ? x : y }),
          'An ancestor (' + name + ') is a scroll container (overflow ' + (scroller(x) ? x : y) + ') that does not scroll vertically; scroll-driven effects inside follow it and stay frozen. Put the effect outside it.');
      }
      return;
    }
  }

  /** grow: how many bars it found (with a way to look again), a container taller than the screen, bars with their own animation. */
  function growHints(id, m, l, win, authored, add) {
    const own = marked(m).filter((b) => barHost(b) === m);
    const again = { label: t('重新尋找長條'), run: () => refreshBars(id) };
    if (!own.length) {
      add('grow-none', 'warn', t('這裡面沒有找到長條。長條是有背景色的方塊（裡面可以寫數值），寬度或高度用百分比寫在自己的 style 裡；或是放在只裝長條的細長軌道裡；或是並排、粗細相同、從同一邊長出的幾條直條。請套在長條圖的外框上，新增長條後再重新尋找。'),
        'No bars were found inside. A bar is a filled box (empty or holding its value) whose width or height is a percentage in its own style ' +
        'attribute, the fill of a thin track, or one of a row of equally thick columns on a common edge. Put grow on the chart container after ' +
        'the bars exist; after adding or restyling bars, apply entrance "grow" to it again to find them.', again);
      return;
    }
    add('grow-bars', 'info', t('裡面有 {n} 條長條，捲動到這裡時會從 0 長出來。新增或修改長條後，可以重新尋找。', { n: own.length }),
      own.length + ' bar(s) inside will grow from zero. After adding or restyling bars, apply entrance "grow" to the container again to find them.', again);
    if (l && win && l.getBoundingClientRect().height > win.innerHeight) {
      add('grow-tall', 'info', t('這個元素比畫面還高：裡面的長條會在它出現時一起長出來，下方的長條可能還沒捲到就長完了。套在個別的圖表上效果比較好。'),
        'The element is taller than the screen: all its bars grow at once as it enters, so lower bars may finish before they are seen. Put grow on each chart.');
    }
    // An inline animation beats the grow rule, so that bar never grows; one from a class is replaced once the bars grow.
    const set = (v) => !!v && v !== 'none';
    const inline = own.some((b) => set(inlineVar(b, 'animation-name')) || (set(inlineVar(b, 'animation')) && !/^none(\s|$)/.test(inlineVar(b, 'animation'))));
    const classed = !inline && authored && own.some((b) => {
      const lb = HE.live.byId(idOf(b));
      const bc = lb ? computed(win, lb) : null;
      return !!bc && set(bc.animationName);
    });
    // The growth moves the origin for under a second; a bar's own transform turns around it meanwhile.
    const turned = own.some((b) => {
      if (set(inlineVar(b, 'transform'))) return true;
      const lb = authored ? HE.live.byId(idOf(b)) : null;
      const bc = lb ? computed(win, lb) : null;
      return !!bc && set(bc.transform);
    });
    if (turned) {
      add('grow-own-transform', 'info', t('有長條原本就有 transform（例如翻轉或旋轉）：長出來的那不到一秒內位置可能不對，長完就會回到原位。'),
        'A bar has its own transform (a flip or a rotation): while it grows, for under a second, it may sit out of place; once grown it is back where it belongs.');
    }
    if (inline) {
      add('grow-inline-animation', 'warn', t('有長條在 style 裡寫了自己的動畫，它不會從 0 長出來：圖表捲到之前看不到，捲到時直接出現完整長度。移除那個動畫就會正常長出來。'),
        'A bar has its own animation in its style attribute, so it does not grow: it stays hidden until the chart is reached, then appears at full length. Remove that animation to let it grow.');
    } else if (classed) {
      add('grow-own-animation', 'warn', t('有長條原本就有 CSS 動畫：圖表捲到時會改播長條增長，原本的動畫之後不會再播放。'),
        'Some bars have their own CSS animation: once the chart is reached grow replaces it, and it does not come back.');
    }
  }

  /**
   * Situations where an effect may not show or may fight the page's own CSS, for the selected element.
   * [{code, level: 'warn'|'info', text (zh-TW), en, action?: {label, run()}}]
   */
  function hints(id) {
    const out = [];
    const m = HE.doc.byId(id);
    const fx = of(id);
    if (!m || !hasAny(fx)) return out;
    const l = HE.live.byId(id);
    const win = l && l.ownerDocument ? l.ownerDocument.defaultView : null;
    const cs = win ? computed(win, l) : null;
    // In edit mode 'fx-motion' is off, so computed values are the author's; in preview they include the effects.
    // A running ▶ 預覽 adds its own transition, animation and pseudo-element to the element: not the author's.
    const demoing = !!demoRun && demoRun.targets.some((tg) => tg.el === l);
    const authored = HE.mode === 'edit' && !!cs && !demoing;
    const add = (code, level, text, en, action) => out.push({ code, level, text, en, action: action || null });
    const wrap = (kinds) => (wrapPlan(m) ? { label: t('包一層容器'), run: () => wrapAndMove(id, kinds) } : null);
    const h = preset('hover', fx.hover);
    const e = preset('entrance', fx.entrance);
    const s = preset('scroll', fx.scroll);
    const selfMoving = [h, e, s].filter((p) => p && p.tf === 'self');
    const animatedSelf = (e && e.target === 'self') || !!s;
    const tag = util.tag(m);
    const replaced = REPLACED.has(tag);

    // An inline transform beats the hover rule (a normal declaration), so the hover never moves; animations
    // beat inline styles and a class transform loses to the hover rule, so those are replaced while they play.
    const inlineTf = inlineVar(m, 'transform');
    const hasInlineTf = !!inlineTf && inlineTf !== 'none';
    const ownTf = hasInlineTf || (authored && cs.transform && cs.transform !== 'none');
    const hoverBlocked = !!h && h.tf === 'self' && hasInlineTf;
    if (hoverBlocked) {
      add('hover-inline-transform', 'warn', t('這個元素有行內 transform，會蓋過懸停的位移，「{name}」不會出現。', { name: h.label }),
        'The element has an inline transform, which overrides the hover movement: ' + h.name + ' will not show. Wrap it and put the effect on the wrapper.', wrap(['hover']));
    }
    const movers = selfMoving.filter((p) => !(hoverBlocked && p === h));
    if (movers.length && ownTf) {
      add('own-transform', 'warn', t('這個元素原本就有 transform，效果播放時會暫時取代它。'), 'The element has its own transform; the effect replaces it while it plays. Wrap it and put the effect on the wrapper.',
        wrap(movers.map((p) => p.kind)));
    }
    if (h && h.name === 'lift' && /\S/.test(inlineVar(m, 'box-shadow')) && inlineVar(m, 'box-shadow') !== 'none') {
      add('lift-shadow', 'info', t('這個元素的行內陰影會蓋過懸停時加深的陰影：滑過時只會上浮。'), 'The element has an inline box-shadow, which overrides the deeper hover shadow; it only rises.');
    }
    if (h && h.tr === 'self' && (inlineVar(m, 'transition') || (authored && hasDuration(cs.transitionDuration)))) {
      add('own-transition', 'warn', t('這個元素原本有 transition，懸停效果會取代它。'), 'The element has its own transition, which the hover effect replaces.', wrap(['hover']));
    }
    if (animatedSelf && (inlineVar(m, 'animation') || (authored && cs.animationName && cs.animationName !== 'none'))) {
      add('own-animation', 'warn', t('這個元素原本有 CSS 動畫，進場或捲動效果會取代它。'), 'The element has its own CSS animation, which the entrance/scroll effect replaces.',
        wrap(['entrance', 'scroll']));
    }
    if (h && h.tf === 'self' && ((e && e.tf === 'self') || (s && s.tf === 'self'))) {
      add('stacked', 'warn', t('懸停和進場／捲動效果都會移動這個元素，動畫進行時看不到懸停的位移。'), 'Hover and entrance/scroll effects both transform this element; the hover movement is hidden while the animation runs.',
        wrap(['entrance', 'scroll']));
    }
    if (e && e.target === 'self' && s && /transform:/.test(s.frames)) {
      add('two-animations', 'info', t('同一個元素同時有進場和捲動效果，兩者的位移會疊加；想分開控制時，可把捲動效果移到外層容器。'), 'Entrance and scroll effects on one element add their transforms together; move the scroll effect to a wrapper to keep them apart.', wrap(['scroll']));
    }
    if (selfMoving.length && cs && cs.display === 'inline' && !replaced) {
      add('inline', 'warn', t('行內元素不能位移或縮放，這個效果不會出現。'), 'Inline elements cannot be transformed; the effect will not show.',
        { label: t('改為行內區塊'), run: () => HE.ops.setStyle(id, { display: 'inline-block' }, { label: t('改為行內區塊') }) });
    }
    // Images, videos, form fields and inline SVG draw no ::before/::after, and their content covers a background line.
    if (h && replaced && h.pseudo) {
      const frame = MEDIA.has(tag) ? snugFrame(m) : null;
      const plan = wrapPlan(m);
      const action = frame ? { label: t('改套在外框上'), run: () => moveTo(id, idOf(frame), ['hover']) }
        : plan && plan.inlineBlock ? { label: t('包一層容器'), run: () => wrapAndMove(id, ['hover']) } : null;
      add('replaced-pseudo', 'warn', t('<{tag}> 不能顯示 ::{pseudo}，「{name}」不會出現；請改套在包著它的外框或卡片上。', { tag, pseudo: h.pseudo, name: h.label }),
        '<' + tag + '> cannot draw ::' + h.pseudo + ', so ' + h.name + ' will not show. Put it on the frame or card around it.', action);
    } else if (h && h.pseudo && authored) {
      const pc = computed(win, l, '::' + h.pseudo);
      const content = pc ? pc.content : 'none';
      if (content && content !== 'none' && content !== 'normal') {
        add('pseudo', 'warn', t('這個元素原本就用了 ::{pseudo}，{name}會蓋過它。', { pseudo: h.pseudo, name: h.label }), 'The element already uses ::' + h.pseudo + ', which ' + h.name + ' replaces.', wrap(['hover']));
      }
    }
    if (h && replaced && h.name === 'underline') {
      add('replaced-underline', 'warn', t('底線描繪畫在元素的背景上，會被 <{tag}> 的內容蓋住，看不到效果；請改套在旁邊的文字或連結上。', { tag }),
        'underline paints the element\'s background, which the <' + tag + '> content covers: it will not show. Put it on text or a link.');
    }
    if (l && win && ((e && e.timeline === 'view()') || (s && (s.timeline === 'view()' || s.sticky)))) overflowHints(l, win, s, add);
    if (h && h.name === 'underline' && !replaced && cs && !/^inline/.test(cs.display)) {
      add('underline-block', 'info', t('區塊元素的底線會和整個區塊一樣寬；套在連結或行內文字上效果最好。'), 'On a block element the line spans the whole block; links and inline text work best.');
    }
    // Underline's line and the fill are background layers that replace the element's own image or gradient.
    if (h && h.name === 'underline' && s && s.name === 'fill') {
      add('two-backgrounds', 'warn', t('底線描繪和捲動填字都畫在背景上，放在同一個元素時捲動填字不會出現。'), 'underline and fill both paint the background; on one element the fill will not show. Wrap it and put fill on the wrapper.',
        wrap(['scroll']));
    }
    if ((h && h.name === 'underline' && !replaced) || (s && s.name === 'fill')) {
      // Edit mode: underline's 'fx' rules are on (read without them); the fill runs only in 'fx-motion', which is off.
      const own = authored ? (h && h.name === 'underline' ? authoredBackground(l, win) : cs.backgroundImage)
        : inlineVar(m, 'background-image') + ' ' + inlineVar(m, 'background');
      if (PAINTED.test(own || '')) {
        if (h && h.name === 'underline') {
          add('underline-bg', 'warn', t('這個元素原本有背景圖片或漸層，底線描繪會取代它（只剩背景色；漸層按鈕可能變透明）。想保留背景，請改用其他懸停效果。'),
            'The element has its own background image or gradient, which underline replaces (only the background colour stays). Use another hover effect to keep it.');
        }
        if (s && s.name === 'fill') {
          add('fill-bg', 'warn', t('這個元素原本有背景圖片或漸層，捲動填字播放時會取代它（背景色會保留）。'),
            'The element has its own background image or gradient, which fill replaces while it plays (the background colour stays).');
        }
      }
    }
    if (h && h.name === 'zoom' && !m.querySelector('img, video')) {
      add('zoom-empty', 'info', t('圖片縮放會放大框裡的圖片或影片，但這個元素裡面沒有。'), 'zoom scales images or videos inside the element, and it has none.');
    }
    const kidCount = kidsOf(m).length;
    if (((h && h.kids) || (e && e.kids)) && kidCount < 2) {
      add('kids', 'info', t('{name}要套在有兩個以上子項目的容器上。', { name: h && h.kids ? h.label : e.label }), 'This effect works on a container with two or more children.');
    }
    if (e && e.name === 'deal' && kidCount > STAGGER_CAP) {
      add('kids-many', 'info', t('超過 8 個子項目時，第 8 個之後會一起進場。'), 'Children after the 8th enter together.');
    }
    if (e && e.bars) growHints(id, m, l, win, authored, add);
    if (s && s.sticky && cs && cs.position !== 'sticky' && cs.position !== 'fixed') {
      add('shrink-position', 'warn', t('頁首收合需要固定在頂端，但這個元素的定位是 {position}，會跟著頁面捲走。', { position: cs.position }), 'shrink needs a sticky or fixed element; this one is ' + cs.position + '.',
        { label: t('設為黏附頂端'), run: () => HE.ops.setStyle(id, { position: 'sticky', top: '0' }, { label: t('設為黏附頂端') }) });
    }
    if (s && s.sticky && cs && /^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor) && cs.backgroundImage === 'none') {
      add('shrink-background', 'info', t('頁首沒有背景色，捲動時下方的內容會透出來。'), 'The header has no background, so content shows through while scrolling.');
    }
    if (s && s.name === 'parallax' && textOf(m)) {
      add('parallax-text', 'info', t('視差適合裝飾性的圖片或色塊；用在文字上會讓閱讀變吃力。'), 'parallax suits decorative images and shapes, not text.');
    }
    if (s && s.name === 'fill' && !textOf(m)) {
      add('fill-text', 'info', t('捲動填字要套在有文字的元素上。'), 'fill needs an element with text.');
    }
    if (reducedMotion()) {
      add('reduced-motion', 'info', t('你的系統開啟了「減少動態效果」：預覽模式不會播放效果，有同樣設定的訪客也只會看到靜態頁面。'), 'The system asks for reduced motion, so effects stay static here.');
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Demo in edit mode                                                   */
  /* ------------------------------------------------------------------ */

  // The frame's 'fx-motion' is off in edit mode, so the demo brings its own editor-only style and keys
  // it on a live-only attribute: [data-he-fx-demo="h"] shows the hover state, "e"/"s" replay the
  // entrance/scroll animation over time. Neither reaches the model (the attribute is in the live strip list).
  let demoRun = null;

  function demoCss(list) {
    const out = [];
    for (const p of list) {
      const c = selOf(p);
      if (p.kind === 'hover') {
        out.push(...p.rest('[' + DEMO_ATTR + ']' + c), ...p.on('[' + DEMO_ATTR + '="h"]' + c));
        continue;
      }
      const host = '[' + DEMO_ATTR + '="' + (p.kind === 'entrance' ? 'e' : 's') + '"]' + c;
      if (p.demo.css) { out.push(...p.demo.css(host)); continue; }
      const decl = (p.decl || []).concat('animation: tfxd-' + p.name + ' ' + p.demo.ms + 'ms ' + p.demo.ease + ' both');
      if (p.demo.stagger) decl.push('animation-delay: calc(' + IC + ' * ' + p.demo.stagger + 'ms)');
      out.push('@keyframes tfxd-' + p.name + ' { ' + (p.demo.frames || p.frames) + ' }', R(p.target === 'kids' ? host + ' > *' : host, decl));
    }
    return out.join('\n');
  }

  /** Replay the effects of the elements once (edit mode). Returns false when there is nothing to show. */
  function demo(ids) {
    stopDemo();
    if (HE.mode !== 'edit') { HE.ui.status(t('預覽模式中直接滑過或捲動頁面，就能看到效果')); return false; }
    const d = HE.live.doc;
    if (!d || !d.head || !HE.live.safe()) return false;
    const targets = [];
    const used = new Set();
    for (const id of arr(ids)) {
      const m = HE.doc.byId(id);
      const el = HE.live.byId(id);
      const fx = parse(m);
      if (!el || !hasAny(fx)) continue;
      targets.push({ el, fx, kids: kidsOf(m).length });
      for (const kind of KINDS) if (fx[kind]) used.add(preset(kind, fx[kind]));
    }
    if (!targets.length) { HE.ui.status(t('選取的元素沒有動態效果可以預覽')); return false; }
    const style = d.createElement('style');
    style.setAttribute('data-he-editor', 'fx-demo');
    style.textContent = demoCss(Array.from(used));
    d.head.append(style);
    for (const tg of targets) tg.el.setAttribute(DEMO_ATTR, '');
    const run = { style, targets, timers: [] };
    demoRun = run;
    const set = (v) => { for (const tg of targets) if (tg.el.isConnected) tg.el.setAttribute(DEMO_ATTR, v); };
    const later = (ms, fn) => run.timers.push(setTimeout(() => { if (demoRun === run) fn(); }, ms));
    const phase = (key, kind) => {
      let ms = 0;
      for (const tg of targets) {
        const p = preset(kind, tg.fx[kind]);
        if (!p) continue;
        ms = Math.max(ms, kind === 'hover' ? 1200 : p.demo.ms + (p.demo.stagger ? p.demo.stagger * (Math.min(tg.kids, STAGGER_CAP) - 1) : 0));
      }
      return ms ? { key, ms } : null;
    };
    const phases = [phase('e', 'entrance'), phase('s', 'scroll'), phase('h', 'hover')].filter(Boolean);
    let at = 60; // the declared transitions apply before the first state change
    for (const ph of phases) {
      later(at, () => set(ph.key));
      at += ph.ms;
      later(at, () => set(''));
      at += ph.key === 'h' ? 600 : 250;
    }
    later(at, stopDemo);
    HE.emit('fx:demo', { running: true });
    HE.ui.status(reducedMotion() ? t('正在預覽效果。系統開啟了「減少動態效果」，有同樣設定的訪客只會看到靜態頁面。') : t('正在預覽效果…'));
    return true;
  }

  function stopDemo() {
    const run = demoRun;
    if (!run) return;
    demoRun = null;
    run.timers.forEach(clearTimeout);
    for (const t of run.targets) { try { t.el.removeAttribute(DEMO_ATTR); } catch (e) { /* detached */ } }
    try { run.style.remove(); } catch (e) { /* detached */ }
    HE.emit('fx:demo', { running: false });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  let initialised = false;
  function init() {
    if (initialised) return;
    initialised = true;
    if (typeof MutationObserver === 'function') observer = new MutationObserver(() => { dirty = true; });
    HE.history.addCloser(closer);
    HE.on('doc:changed', (data) => {
      stopDemo();
      // An AI run keeps one transaction open across its tools: give classes it wrote their CSS now.
      if (data && data.partial && HE.history.active) closer();
    });
    // Any edit, selection change, mode change or new frame ends a running demo.
    for (const evt of ['selection:changed', 'mode:changed', 'history:before', 'canvas:ready', 'textedit:start', 'doc:loaded']) {
      HE.on(evt, stopDemo);
    }
    HE.on('ai:busy', (data) => { if (data && data.busy) stopDemo(); });
  }

  HE.fx = {
    init,
    KINDS,
    KIND_ZH,
    PRESETS,
    INTENSITY,
    TIMING,
    presets(kind) { return PRESETS[kind] ? PRESETS[kind].slice() : []; },
    preset,
    canHost,
    of,
    has,
    hasAny,
    apply,
    remove,
    removeAll,
    count,
    sync,
    hints,
    wrapAndMove,
    describe,
    summary,
    bars,
    findBars,
    demo,
    stopDemo,
    get demoing() { return !!demoRun; },
  };
})();
