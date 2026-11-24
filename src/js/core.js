/* Tactile HTML editor — core.js
 *
 * Namespace, event bus, document model, edit operations, undo history,
 * selection, keyboard registry and shared UI helpers.
 *
 * Two DOMs are kept in step:
 *   - the MODEL (HE.doc.model): a DOMParser document parsed from the source.
 *     Its scripts never run, so it stays clean. It is the source of truth and
 *     the thing that gets exported.
 *   - the LIVE DOM (HE.live.doc): the canvas iframe, rendered from the model,
 *     where the page's own scripts run and the user sees and touches things.
 * Every element in both carries the same data-he-id. Each op applies the same
 * change to both, addressed by id. When a live counterpart is missing the op
 * asks for a full re-render from the model instead.
 */
(function () {
  'use strict';

  const HE = (window.HE = window.HE || {});
  const ID = 'data-he-id';
  HE.ID_ATTR = ID;
  // Sandbox flags for a frame that runs the page's own scripts (the canvas's run frame, 在新分頁預覽). Never
  // allow-same-origin: the page gets an opaque origin, so it cannot read the editor's storage or reach window.HE.
  // Read-only, and the modules copy it when they load: a compat-mode page (which can reach window.HE) cannot
  // widen the frames built after it.
  Object.defineProperty(HE, 'PAGE_SANDBOX', {
    value: 'allow-scripts allow-forms allow-modals allow-popups', enumerable: true, writable: false, configurable: false,
  });
  HE.version = '0.1.0';
  HE.env = {
    isMac: /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ''),
    inArtifact: !!(window.claude && typeof window.claude.use === 'function'),
  };

  /* ------------------------------------------------------------------ */
  /* Event bus                                                           */
  /* ------------------------------------------------------------------ */

  const handlers = new Map();
  HE.on = function (evt, fn) {
    if (!handlers.has(evt)) handlers.set(evt, new Set());
    handlers.get(evt).add(fn);
    return () => HE.off(evt, fn);
  };
  HE.off = function (evt, fn) {
    const set = handlers.get(evt);
    if (set) set.delete(fn);
  };
  HE.emit = function (evt, data) {
    const set = handlers.get(evt);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(data); } catch (err) { console.error('[HE] handler for "' + evt + '" failed:', err); }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */

  const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'font',
    'i', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'time',
    'u', 'var', 'wbr', 'img', 'svg', 'math']);
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const NOT_TEXT = new Set(['html', 'head', 'body', 'script', 'style', 'link', 'meta', 'title', 'svg', 'canvas', 'video',
    'audio', 'iframe', 'img', 'input', 'textarea', 'select', 'option', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup',
    'col', 'ul', 'ol', 'dl', 'hr', 'br', 'picture', 'object', 'embed', 'noscript', 'template', 'math', 'source', 'track']);
  // Subtrees whose descendants never get their own id (selection climbs to the root).
  const OPAQUE = new Set(['svg', 'math']);
  // Take no space on the page: moving past one changes nothing on screen (but reorders scripts).
  const NON_VISUAL = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript', 'base', 'title']);
  // Never take a moved element inside (media, embeds, form controls).
  const NO_INSIDE = new Set(['img', 'picture', 'svg', 'math', 'iframe', 'video', 'audio', 'canvas', 'object', 'embed', 'select', 'textarea']);
  // Block containers that still take one when they are empty (an empty div counts as "text editable").
  const BOX_TAGS = new Set(['div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav', 'li', 'td', 'th',
    'blockquote', 'figure', 'form', 'fieldset', 'details', 'dd', 'dialog', 'search']);

  // Content model: what the HTML parser would move, split or drop when the page is parsed again
  // (undo snapshots, export, reload), plus the list/table rules readers expect.
  const P_CLOSERS = new Set(['address', 'article', 'aside', 'blockquote', 'center', 'details', 'dialog', 'dir', 'div', 'dl',
    'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li',
    'dd', 'dt', 'listing', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'summary', 'table', 'ul', 'xmp']);
  const P_CLOSER_SEL = Array.from(P_CLOSERS).join(',');
  const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const HEAD_OK = new Set(['meta', 'link', 'style', 'script', 'title', 'base', 'noscript', 'template']);
  const SCRIPT_SUPPORT = new Set(['script', 'template', 'style']);
  const NO_CHILDREN = new Set(['script', 'style', 'title', 'textarea', 'iframe', 'noscript', 'xmp', 'canvas', 'video', 'audio', 'object', 'picture']);
  // Parents that hold phrasing content only (a block child is invalid or split off by the parser).
  const PHRASING_ONLY = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'span', 'b', 'strong', 'i', 'em', 'u', 's',
    'small', 'mark', 'code', 'label', 'button', 'abbr', 'cite', 'q', 'sub', 'sup', 'time', 'kbd', 'samp', 'var', 'dfn',
    'bdi', 'bdo', 'data', 'font', 'strike', 'tt', 'big', 'legend', 'dt', 'summary']);
  const PHRASING = new Set([...INLINE, 'button', 'input', 'select', 'textarea', 'video', 'audio', 'canvas', 'iframe',
    'picture', 'object', 'embed', 'meter', 'progress', 'output', 'ruby', 'map', 'area', 'noscript', 'slot', 'br']);
  const JS_TYPE = /^(|module|(text|application)\/(x-)?(javascript|ecmascript)|text\/javascript1\.[0-5]|text\/jscript|text\/livescript)$/i;
  const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster', 'background', 'to', 'from', 'values', 'by']);
  // Where a data: URL is loaded (or navigated to) as a document of its own, which runs script in a scripted frame.
  const DOC_URL_ATTRS = new Map([['iframe', ['src']], ['frame', ['src']], ['a', ['href', 'xlink:href']], ['area', ['href']], ['use', ['href', 'xlink:href']]]);
  // MIME types a frame renders as a document that can run script: HTML, SVG, any XML (+xml, text/xsl), and the ones
  // a browser sniffs.
  const DOC_TYPES = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|text\/xsl|application\/xml|[^\/\s]+\/[^\/\s]+\+xml|unknown\/unknown|application\/unknown|\*\/\*)$/;
  // Their text is serialised as is, so a '</style' inside a <style> ends it when the page is parsed again.
  const RAW_TEXT = /^(style|script|xmp|iframe|noembed|noframes|plaintext)$/;
  const EMBED_ATTRS = ['data', 'src', 'type', 'codetype', 'classid', 'codebase', 'archive'];
  // Attribute names whose value can turn script on (besides URL_ATTRS and on*).
  const SCRIPT_ATTR = /^(srcdoc|type|nomodule|shadowrootmode|data|classid|codebase|archive|codetype)$/;
  // Attributes that point at other elements by id (space-separated lists allowed).
  const ID_REFS = ['for', 'form', 'list', 'headers', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns',
    'aria-activedescendant', 'aria-details', 'aria-errormessage', 'aria-flowto', 'popovertarget'];

  const util = (HE.util = {
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    debounce(fn, ms) {
      let t;
      const d = function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
      d.cancel = () => clearTimeout(t);
      return d;
    },
    clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); },
    tag(el) { return el && el.tagName ? el.tagName.toLowerCase() : ''; },
    /** "h2#intro.title.big" — short human label for an element. */
    label(el) {
      if (!el || el.nodeType !== 1) return '';
      let s = util.tag(el);
      const id = el.getAttribute('id');
      if (id) s += '#' + id;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      return s;
    },
    snippet(el, n = 40) {
      const t = ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
      return t.length > n ? t.slice(0, n - 1) + '…' : t;
    },
    isVoid(el) { return VOID.has(util.tag(el)); },
    isInline(el) { return INLINE.has(util.tag(el)); },
    /** True when the element holds only text and inline phrasing content, so it can be edited in place. */
    isTextEditable(el) {
      if (!el || el.nodeType !== 1) return false;
      if (NOT_TEXT.has(util.tag(el))) return false;
      const walk = (node) => {
        for (const c of node.children) {
          const t = util.tag(c);
          if (!INLINE.has(t)) return false;
          if (t === 'svg' || t === 'math' || t === 'img') continue;
          if (!walk(c)) return false;
        }
        return true;
      };
      return walk(el);
    },
    /** Parse an HTML string into a DocumentFragment owned by `ownerDoc` (scripts stay inert). */
    fragment(html, ownerDoc) {
      const t = (ownerDoc || document).createElement('template');
      t.innerHTML = html;
      return t.content;
    },
    camelToKebab(p) { return p.startsWith('--') ? p : p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()); },
    storage: {
      get(key, fallback) {
        try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
      },
      set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
      },
      remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ } },
    },
    /** Normalised shortcut string for a keydown event: "mod+shift+z", "delete", "alt+up". */
    combo(e) {
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('mod');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      let k = e.key || '';
      const named = { ' ': 'space', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Escape: 'escape', Esc: 'escape' };
      k = named[k] || k.toLowerCase();
      // Alt on macOS changes e.key (alt+d -> "∂"); fall back to the physical key.
      if (e.altKey && e.code && /^Key[A-Z]$/.test(e.code)) k = e.code.slice(3).toLowerCase();
      parts.push(k);
      return parts.join('+');
    },
    isTypingTarget(t) {
      if (!t || !t.closest) return false;
      return !!t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]');
    },
    /** Format bytes as "12.3 KB". */
    bytes(n) {
      if (n < 1024) return n + ' B';
      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1048576).toFixed(1) + ' MB';
    },

    /**
     * Whether `child` may sit directly inside `parent` without the HTML parser rewriting it on the
     * next parse, and without breaking list/table structure. `parent`: element or tag name;
     * `child`: element, tag name, or DocumentFragment (every top-level element must fit).
     */
    canContain(parent, child) {
      if (child && child.nodeType === 11) return Array.from(child.children).every((c) => util.canContain(parent, c));
      const p = typeof parent === 'string' ? parent.toLowerCase() : util.tag(parent);
      const c = typeof child === 'string' ? child.toLowerCase() : util.tag(child);
      if (!p || !c) return false;
      const el = typeof parent === 'string' ? null : parent;
      if (p === 'picture') return c === 'source' || c === 'img';
      if (p === 'video' || p === 'audio') return c === 'source' || c === 'track';
      if (VOID.has(p) || NO_CHILDREN.has(p) || OPAQUE.has(p)) return false;
      if (c === 'html' || c === 'head' || c === 'body') return false;
      if (p === 'html') return false;
      if (p === 'head') return HEAD_OK.has(c);
      const support = SCRIPT_SUPPORT.has(c);
      // A row straight inside <table> gets a new implied <tbody> on the next parse.
      if (p === 'table') return c === 'caption' || c === 'colgroup' || c === 'thead' || c === 'tbody' || c === 'tfoot' || support;
      if (p === 'thead' || p === 'tbody' || p === 'tfoot') return c === 'tr' || support;
      if (p === 'tr') return c === 'td' || c === 'th' || support;
      if (p === 'colgroup') return c === 'col' || c === 'template';
      if (p === 'ul' || p === 'ol' || p === 'menu') return c === 'li' || support;
      if (p === 'dl') return c === 'dt' || c === 'dd' || c === 'div' || support;
      if (p === 'select') return c === 'option' || c === 'optgroup' || c === 'hr' || support;
      if (p === 'optgroup') return c === 'option' || support;
      if (p === 'datalist') return c === 'option' || support;
      // Children that only live inside one kind of parent.
      if (c === 'caption' || c === 'colgroup' || c === 'thead' || c === 'tbody' || c === 'tfoot' || c === 'tr' ||
        c === 'td' || c === 'th' || c === 'col' || c === 'option' || c === 'optgroup') return false;
      if (c === 'li') return false;
      if (c === 'dt' || c === 'dd') return p === 'div' && !!el && util.tag(el.parentElement) === 'dl';
      if (PHRASING_ONLY.has(p) && (P_CLOSERS.has(c) || !PHRASING.has(c)) && !support) return false;
      if (HEADINGS.has(p) && HEADINGS.has(c)) return false;
      if (el && el.closest) {
        // The parser closes an open <p> at a block start tag, however deep inside inline elements it sits.
        if (P_CLOSERS.has(c) && el.closest('p')) return false;
        if (c === 'a' && el.closest('a')) return false;
        if (c === 'form' && el.closest('form')) return false;
        if ((c === 'button' || c === 'a') && el.closest('button')) return false;
      }
      if (typeof child !== 'string' && child && child.querySelector && el && el.closest) {
        // A link inside the moved subtree would nest inside a link around the target.
        if (el.closest('a') && child.querySelector('a')) return false;
        // Deeper in the subtree too: a block start tag closes an open <p>, a <form> inside a form is dropped,
        // a <button> closes the open one.
        if (el.closest('p') && child.querySelector(P_CLOSER_SEL)) return false;
        if (el.closest('form') && child.querySelector('form')) return false;
        if (el.closest('button') && child.querySelector('button, a')) return false;
      }
      return true;
    },
    /** canContain() for a placement relative to `ref`: 'before' | 'after' (sibling) or 'append' | 'prepend' | 'inside'. */
    canPlace(ref, position, child) {
      if (!ref) return false;
      const parent = position === 'before' || position === 'after' ? ref.parentElement : ref;
      return !!parent && util.canContain(parent, child);
    },
    /**
     * Whether the parser keeps element `m` as a child of `dest` on the next parse (undo, export). canContain()
     * checks only the direct parent: a block anywhere inside a <p> still closes it, and a <tr> straight in a
     * <table> gets an implied <tbody>. Reordering among the current siblings never changes the parsed structure.
     */
    keepsChild(dest, m) {
      if (!dest || !m) return false;
      if (m.parentElement === dest) return true;
      if (!util.canContain(dest, m) || (util.tag(dest) === 'table' && util.tag(m) === 'tr')) return false;
      const para = dest.closest('p');
      return !para || util.canContain(para, m);
    },
    /** Whether a user may move elements into `el`: not media or a form control, and a text block only while it is an empty box. */
    acceptsDrop(el) {
      if (!el || util.isVoid(el) || NO_INSIDE.has(util.tag(el))) return false;
      if (util.isTextEditable(el)) {
        return BOX_TAGS.has(util.tag(el)) && el.getAttribute('aria-hidden') !== 'true' && el.children.length === 0 && !el.textContent.trim();
      }
      return true;
    },
    /**
     * Whether attribute `attr` = `value` on a `tag` element (name or element) is a URL that runs script: javascript:
     * or vbscript: in any URL attribute, or a data: document (HTML, SVG, XML; not data:, or an image) that a frame
     * loads or a link or form navigates to, or that an SVG animation's to/from/values/by can put in any attribute
     * (SMIL animates an <a>'s href). External pages (https://…) are not script: they run in the frame's sandbox
     * like any embedded page.
     */
    isScriptUrl(tag, attr, value) {
      const n = String(attr || '').toLowerCase();
      if (!URL_ATTRS.has(n)) return false;
      const v = urlValue(value);
      if (isJsUrl(v)) return true;
      // An animation's ';' list, split only before a data: item, so ';base64' and ';charset' stay with their URL.
      if (/^(to|from|values|by)$/.test(n)) return v.split(/;(?=[\s\u0000-\u001f]*data:)/i).some((s) => isDataDoc(urlValue(s)));
      const t = typeof tag === 'string' ? tag.toLowerCase() : util.tag(tag);
      const loads = n === 'action' || n === 'formaction' || (DOC_URL_ATTRS.get(t) || []).includes(n);
      return loads && isDataDoc(v);
    },
    /** True when the subtree under `root` (element, document or fragment) carries anything that runs script. */
    hasScript(root) { return scanScript(root, () => true); },
    /** One fingerprint per piece of script under `root` (see hasScript); identical script gives identical strings. */
    scriptBits(root) {
      const out = new Set();
      scanScript(root, (b) => { out.add(b); });
      return out;
    },
    /**
     * Remove every piece of script inside `root` (an element's descendants; all of a document or fragment)
     * whose scriptBits() fingerprint is not in `keep`: the attribute (on*, script URLs, srcdoc) or the whole
     * element (<script>, <object>, <base>, a refresh <meta>…). Returns how many pieces were removed.
     */
    stripScript(root, keep) {
      const hits = [];
      scanScript(root, (b, el, attr) => { if (el !== root && !(keep && keep.has(b))) hits.push([el, attr]); });
      for (const [el, attr] of hits) {
        if (attr) el.removeAttribute(attr);
        else el.remove();
      }
      return hits.length;
    },
    /** `html` with `tags` (markup) put first in its head, which is made when the source has none. */
    intoHead(html, tags) {
      // Skip the doctype and any comments before <html>: a comment may mention "<head>".
      const lead = /^(?:\s+|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->)*/i.exec(html)[0].length;
      const root = /^<html\b[^>]*>/i.exec(html.slice(lead));
      const from = root ? lead + root[0].length : lead;
      const head = /^\s*<head\b[^>]*>/i.exec(html.slice(from));
      if (head) return html.slice(0, from + head[0].length) + tags + html.slice(from + head[0].length);
      if (root) return html.slice(0, from) + '<head>' + tags + '</head>' + html.slice(from);
      return tags + html;
    },
    isRawText(el) { return !!el && RAW_TEXT.test(util.tag(el)); },
    /** Text for a raw-text element (<style>, <script>…) escaped so it cannot end the element early. */
    rawSafe(el, s) {
      const text = s == null ? '' : String(s);
      return util.isRawText(el) ? text.replace(new RegExp('</(' + util.tag(el) + ')', 'gi'), '<\\/$1') : text;
    },

    /**
     * Give HTML ids under `roots` that the page already uses elsewhere, and that something inside `roots`
     * refers to (label for, aria-*, #anchors), a free name ("email" -> "email-2"), and point those
     * references at the new names. Other ids stay, so page CSS written for #id still styles the copy.
     * write(el, attrs) applies one element's changes. Returns how many ids were renamed.
     */
    renameClashingIds(roots, write) {
      const model = HE.doc.model;
      if (!model) return 0;
      const els = [];
      for (const r of roots) {
        if (r.nodeType === 1) els.push(r);
        els.push(...r.querySelectorAll('*'));
      }
      const mine = new Set(els);
      const taken = new Set();
      model.querySelectorAll('[id]').forEach((el) => { if (!mine.has(el)) taken.add(el.getAttribute('id')); });
      const inside = new Set(els.map((el) => el.getAttribute('id')).filter(Boolean));
      const referenced = new Set();
      for (const el of els) {
        for (const a of ID_REFS) (el.getAttribute(a) || '').trim().split(/\s+/).forEach((x) => { if (x) referenced.add(x); });
        const h = el.getAttribute('href');
        if (h && h[0] === '#') referenced.add(h.slice(1));
      }
      const map = new Map();
      const changes = new Map();
      for (const el of els) {
        const old = el.getAttribute('id');
        // Ids inside svg/math stay: their url(#…) references are not rewritten.
        if (!old || !taken.has(old) || !referenced.has(old) || (el.parentElement && el.parentElement.closest('svg, math'))) continue;
        let n = 2;
        let next;
        do { next = old + '-' + n++; } while (taken.has(next) || inside.has(next));
        taken.add(next);
        if (!map.has(old)) map.set(old, next);
        changes.set(el, { id: next });
      }
      if (!map.size) return 0;
      for (const el of els) {
        const attrs = changes.get(el) || {};
        for (const a of ID_REFS) {
          const parts = (el.getAttribute(a) || '').trim().split(/\s+/);
          if (parts.some((x) => map.has(x))) attrs[a] = parts.map((x) => map.get(x) || x).join(' ');
        }
        const href = el.getAttribute('href');
        if (href && href[0] === '#' && map.has(href.slice(1))) attrs.href = '#' + map.get(href.slice(1));
        if (Object.keys(attrs).length) write(el, attrs);
      }
      return changes.size;
    },
  });

  // The URL parser drops tabs/newlines anywhere and leading control characters and spaces.
  function urlValue(s) { return String(s == null ? '' : s).replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+/, ''); }
  // (^|;): an SVG animation's values="a;javascript:…" list. The URL parser drops leading control characters and
  // spaces from each item too.
  function isJsUrl(v) { return /(^|;)[\s\u0000-\u001f]*(javascript|vbscript):/i.test(v); }
  function isDataDoc(v) {
    const m = /^data:([^,]*),/i.exec(v);
    return !!m && DOC_TYPES.test(m[1].split(';')[0].trim().toLowerCase());
  }
  /** The URL of a <meta http-equiv="refresh"> content ("5; url='…'", the url= part optional), or ''. */
  function refreshUrl(content) {
    const m = /^\s*[\d.]*\s*[;,]?\s*(?:url\s*=\s*)?(['"]?)([\s\S]*)$/i.exec(String(content || ''));
    if (!m) return '';
    const s = m[1] && m[2].indexOf(m[1]) >= 0 ? m[2].slice(0, m[2].indexOf(m[1])) : m[2];
    return urlValue(s.trim());
  }

  /**
   * Call fn(fingerprint, el, attr) for each piece of script under root, <template> content included; `attr` names
   * the attribute that carries it (null: the element as a whole is script). Stops when fn returns true.
   */
  function scanScript(root, fn) {
    if (!root) return false;
    const base = root.nodeType === 9 ? root.documentElement : root;
    if (!base) return false;
    const all = base.nodeType === 1 ? [base, ...base.querySelectorAll('*')] : Array.from(base.querySelectorAll('*'));
    const noIds = (s) => s.replace(/ data-he-id="[^"]*"/g, '');
    for (const el of all) {
      const t = util.tag(el);
      const type = (el.getAttribute('type') || '').split(';')[0].trim();
      if (t === 'script' && JS_TYPE.test(type) && fn('script ' + type + ' ' + (el.getAttribute('src') || '') + '\n' + el.textContent, el, null)) return true;
      if (t === 'iframe' && el.hasAttribute('srcdoc') && fn('srcdoc ' + el.getAttribute('srcdoc'), el, 'srcdoc')) return true;
      if (t === 'object' || t === 'embed') {
        // Only what decides what loads: resizing an approved embed does not make it new.
        let bit = t + EMBED_ATTRS.map((n) => ' ' + n + '=' + (el.getAttribute(n) || '')).join('');
        if (t === 'object') for (const c of el.children) if (util.tag(c) === 'param') bit += ' param ' + c.getAttribute('name') + '=' + c.getAttribute('value');
        if (fn(bit, el, null)) return true;
      }
      // A <base> would make the page's relative script URLs load from another host.
      if (t === 'base' && el.hasAttribute('href') && fn('base ' + el.getAttribute('href'), el, null)) return true;
      // A refresh to a script URL navigates the (scripted) frame there: the whole <meta> goes.
      if (t === 'meta' && /^\s*refresh\s*$/i.test(el.getAttribute('http-equiv') || '')) {
        const u = refreshUrl(el.getAttribute('content'));
        if ((isJsUrl(u) || isDataDoc(u)) && fn('refresh ' + el.getAttribute('content'), el, null)) return true;
      }
      // The model parses noscript as markup, a scripted canvas as raw text: '</noscript>' inside it ends it early there.
      if (t === 'noscript' && /<\/noscript/i.test(el.innerHTML) && fn('noscript ' + noIds(el.innerHTML), el, null)) return true;
      if (RAW_TEXT.test(t) && new RegExp('</' + t, 'i').test(el.textContent) && fn('raw ' + t + ' ' + el.textContent, el, null)) return true;
      // Declarative shadow roots (<template shadowrootmode>) become live markup in the canvas.
      if (t === 'template' && el.content && scanScript(el.content, fn)) return true;
      for (const a of el.attributes) {
        const n = a.name.toLowerCase();
        if (n.startsWith('on')) { if (fn('on ' + n + '=' + a.value, el, a.name)) return true; continue; }
        if (util.isScriptUrl(t, n, a.value) && fn('url ' + n + '=' + urlValue(a.value), el, a.name)) return true;
      }
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* Document model                                                      */
  /* ------------------------------------------------------------------ */

  // DOMParser parses with scripting off, so a head <noscript> holding an <img> or <iframe> would end the
  // head there and push the rest of it into <body>. Such head noscripts are kept as inert templates instead
  // and turned back into <noscript> in the export form.
  const NOSCRIPT = 'data-he-noscript';
  // Content the parser leaves in a head noscript. meta is left out: a noscript refresh would navigate a scripts-off canvas.
  const NOSCRIPT_KEEPS = /^(?:\s|<!--[\s\S]*?-->|<link\b[^>]*>|<style\b[^>]*>[\s\S]*?<\/style\s*>)*$/i;
  const HEAD_SCAN = /<!--[\s\S]*?-->|<(script|style|title|textarea|template|noframes)\b[^>]*>[\s\S]*?<\/\1\s*>|<(body[\s>/]|\/head[\s>]|(?!(?:html|head|meta|link|base|basefont|bgsound|title|style|script|noscript|template|noframes)[\s/>])[a-z])|<noscript\b([^>]*)>([\s\S]*?)<\/noscript\s*>/gi;
  function protectNoscripts(src) {
    if (!/<noscript/i.test(src)) return src;
    let out = '';
    let last = 0;
    let m;
    HEAD_SCAN.lastIndex = 0;
    while ((m = HEAD_SCAN.exec(src))) {
      if (m[2]) break;
      if (m[3] === undefined || NOSCRIPT_KEEPS.test(m[4])) continue; // a comment, raw-text element or safe noscript
      out += src.slice(last, m.index) + '<template ' + NOSCRIPT + m[3] + '>' + m[4] + '</template>';
      last = HEAD_SCAN.lastIndex;
    }
    return last ? out + src.slice(last) : src;
  }
  /** Turn the noscript templates under a detached copy back into <noscript>. Returns root or its replacement. */
  function restoreNoscripts(root) {
    const q = 'template[' + NOSCRIPT + ']';
    const list = Array.from(root.querySelectorAll(q));
    if (root.matches && root.matches(q)) list.unshift(root);
    let out = root;
    for (const t of list) {
      if (!t.content) continue;
      const n = t.ownerDocument.createElement('noscript');
      for (const a of Array.from(t.attributes)) if (a.name !== NOSCRIPT && a.name !== ID) n.setAttribute(a.name, a.value);
      n.append(t.content);
      if (t === root) out = n; else t.replaceWith(n);
    }
    return out;
  }
  function parseDoc(html) {
    return new DOMParser().parseFromString(protectNoscripts(String(html || '')), 'text/html');
  }
  function doctypeOf(d) {
    const dt = d.doctype;
    if (!dt) return '';
    let s = '<!DOCTYPE ' + dt.name;
    if (dt.publicId) s += ' PUBLIC "' + dt.publicId + '"';
    if (dt.systemId) s += (dt.publicId ? '' : ' SYSTEM') + ' "' + dt.systemId + '"';
    return s + '>';
  }
  function eachElement(root, fn) {
    // Visits root (if an element) and descendants, skipping the insides of OPAQUE subtrees.
    const visit = (el) => {
      fn(el);
      if (OPAQUE.has(util.tag(el))) return;
      for (const c of Array.from(el.children)) visit(c);
    };
    if (root.nodeType === 1) visit(root);
    else for (const c of Array.from(root.children || [])) visit(c);
  }
  function stripIds(root) {
    if (root.nodeType === 1) root.removeAttribute(ID);
    root.querySelectorAll('[' + ID + ']').forEach((e) => e.removeAttribute(ID));
  }

  let currentModel = null;
  const doc = (HE.doc = {
    get model() { return currentModel; },
    set model(d) {
      if (d !== currentModel) modelIndex.forget(); // the old document's index would keep it in memory
      currentModel = d;
    },
    name: 'untitled.html',
    doctype: '<!DOCTYPE html>',
    seq: 0,
    /**
     * Whether this document's own scripts may run: in the canvas's isolated run frame while previewing and,
     * in compat mode, in the edit frame (which shares the editor's origin, so a script there could read
     * everything the editor stores). Built-in templates load trusted; opened, pasted and dropped files do not.
     */
    trusted: false,

    /** Load a new document. Resets history and selection. opts: {name, trusted} */
    load(html, opts = {}) {
      const src = String(html || '');
      const d = parseDoc(src);
      stripIds(d.documentElement);
      // A fragment has no doctype; the canvas shows it in standards mode, so the export must say so too.
      this.doctype = doctypeOf(d) || (/<(html|head|body)[\s>]/i.test(src) ? '' : '<!DOCTYPE html>');
      this.seq = 0;
      this.model = d;
      this.trusted = !!opts.trusted;
      this.ensureIds(d.documentElement);
      if (opts.name) this.setName(opts.name);
      history.reset();
      sel.ids = [];
      HE.emit('selection:changed', { ids: [] });
      HE.emit('doc:loaded', { name: this.name });
      HE.emit('doc:render', { reason: 'load' });
      HE.emit('doc:changed', { label: 'load' });
    },

    /** Allow or stop the document's own scripts. Emits doc:trusted (the canvas updates its frames). */
    setTrusted(v) {
      const t = !!v;
      if (t === this.trusted) return;
      this.trusted = t;
      HE.emit('doc:trusted', { trusted: t });
    },
    /** Whether the model contains anything that would run script (script tags, on* handlers, script URLs, srcdoc…). */
    hasScripts() { return util.hasScript(this.model); },

    setName(name) {
      let n = String(name || '').trim() || 'untitled.html';
      if (!/\.html?$/i.test(n)) n += '.html';
      this.name = n;
      HE.emit('doc:named', { name: n });
    },

    /**
     * Serialise the model. Clean (no editor ids, real <noscript>) unless {keepIds:true}. {mark: {ids, attr}} sets
     * `attr` on the copies of those elements (the canvas's run frame shows the layers hidden in the editor); an
     * export never passes it. A cleaned copy (tidy.js) passes {comment(data) -> false drops a comment outside
     * <html>, prepare(root) changes the clean copy of <html> before it is written}. With {keepIds:true}, prepare(root)
     * gets a copy that keeps the ids (the canvas, for a frame that must not navigate itself).
     */
    serialize(opts = {}) {
      if (!this.model) return '';
      let out = this.doctype ? this.doctype + '\n' : '';
      let after = false;
      const mark = opts.mark && opts.mark.attr && opts.mark.ids ? opts.mark : null;
      // Comments outside <html> (license headers) are children of the document itself.
      for (const n of Array.from(this.model.childNodes)) {
        // No newline after </html>: the parser would add it to <body>.
        if (n.nodeType === 8) { if (!opts.comment || opts.comment(n.data)) out += '<!--' + n.data + '-->' + (after ? '' : '\n'); }
        else if (n.nodeType === 1) {
          let root = n;
          if (mark) {
            root = n.cloneNode(true);
            for (const id of mark.ids) {
              const q = '[' + ID + '="' + cssEscape(id) + '"]';
              const el = root.matches(q) ? root : root.querySelector(q);
              if (el) el.setAttribute(mark.attr, '');
            }
          }
          // Restore first: stripIds does not reach into the noscript templates' content.
          if (!opts.keepIds) {
            root = restoreNoscripts(root === n ? n.cloneNode(true) : root);
            stripIds(root);
            if (opts.prepare) opts.prepare(root);
          } else if (opts.prepare) {
            if (root === n) root = n.cloneNode(true);
            opts.prepare(root);
          }
          out += root.outerHTML;
          after = true;
        }
      }
      return out;
    },
    snapshot() { return this.serialize({ keepIds: true }); },
    /** Replace the model with a snapshot (ids kept) and re-render. Used by undo/redo. */
    restore(snap) {
      const d = parseDoc(snap);
      this.doctype = doctypeOf(d);
      this.model = d;
      this.bumpSeq(d.documentElement);
      this.ensureIds(d.documentElement);
      HE.emit('doc:render', { reason: 'restore' });
    },

    newId() { return 'h' + (++this.seq).toString(36); },
    bumpSeq(root) {
      root.querySelectorAll('[' + ID + ']').forEach((e) => {
        const m = /^h([0-9a-z]{1,8})$/.exec(e.getAttribute(ID));
        if (m) this.seq = Math.max(this.seq, parseInt(m[1], 36));
      });
    },
    /** Give every element under root that lacks an id a fresh one. */
    ensureIds(root) {
      eachElement(root, (el) => { if (!el.hasAttribute(ID)) el.setAttribute(ID, this.newId()); });
    },
    /** Re-id anything under root that duplicates an id inside root or (unless in `allowed`) elsewhere in the model. */
    dedupeIds(root, allowed) {
      const seen = new Set();
      eachElement(root, (el) => {
        let id = el.getAttribute(ID);
        if (!id) return;
        if (seen.has(id) || (!(allowed && allowed.has(id)) && this.byId(id))) {
          id = this.newId();
          el.setAttribute(ID, id);
        } else {
          // A kept id from outside (the AI continuing the sequence) must never be handed out again.
          // Longer ids are out of newId()'s reach, and parsing them would push seq past exact integers.
          const mm = /^h([0-9a-z]{1,8})$/.exec(id);
          if (mm) this.seq = Math.max(this.seq, parseInt(mm[1], 36));
        }
        seen.add(id);
      });
    },
    /** Re-id duplicates inside root (after a clone-heavy mutation). */
    repairIds(root) {
      const seen = new Set();
      eachElement(root, (el) => {
        const id = el.getAttribute(ID);
        if (!id) { el.setAttribute(ID, this.newId()); return; }
        if (seen.has(id)) el.setAttribute(ID, this.newId());
        seen.add(el.getAttribute(ID));
      });
    },
    idsIn(el) {
      const out = new Set();
      if (!el) return out;
      if (el.hasAttribute && el.hasAttribute(ID)) out.add(el.getAttribute(ID));
      el.querySelectorAll('[' + ID + ']').forEach((e) => out.add(e.getAttribute(ID)));
      return out;
    },

    byId(id) {
      if (!id || !this.model) return null;
      return modelIndex(this.model, id);
    },
    idOf(el) { return el && el.getAttribute ? el.getAttribute(ID) : null; },
    get body() { return this.model ? this.model.body : null; },
    get head() { return this.model ? this.model.head : null; },
    isRoot(el) { return !el || !this.model || el === this.model.documentElement || el === this.model.body || el === this.model.head; },

    /** Clean outerHTML of one model element (ids removed unless keepIds). */
    html(id, opts = {}) {
      const m = this.byId(id);
      if (!m) return '';
      if (opts.keepIds) return m.outerHTML;
      const c = restoreNoscripts(m.cloneNode(true));
      stripIds(c);
      return c.outerHTML;
    },

    /**
     * Compact text outline of the model for the AI agent and diagnostics.
     *   [h7] h1.title "季度營運報告"
     * Depth shrinks automatically to fit maxLines; cut branches say how much they hide.
     */
    outline(opts = {}) {
      if (!this.model) return '';
      const maxLines = opts.maxLines || 400;
      const root = opts.rootId ? this.byId(opts.rootId) : this.model.body;
      if (!root) return '';
      const SKIP = new Set(['script', 'style', 'link', 'meta', 'noscript', 'template']);
      const render = (maxDepth) => {
        const lines = [];
        const visit = (el, depth) => {
          const tag = util.tag(el);
          if (SKIP.has(tag)) return;
          let line = '  '.repeat(depth) + '[' + el.getAttribute(ID) + '] ' + util.label(el);
          let own = '';
          for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent;
          own = own.replace(/\s+/g, ' ').trim();
          const text = util.isTextEditable(el) ? util.snippet(el, 70) : (own.length > 60 ? own.slice(0, 59) + '…' : own);
          if (text) line += ' "' + text + '"';
          if (tag === 'img') line += ' (img' + (el.getAttribute('alt') ? ' alt="' + el.getAttribute('alt') + '"' : '') + ')';
          if (tag === 'a' && el.getAttribute('href')) line += ' → ' + el.getAttribute('href').slice(0, 60);
          const kids = OPAQUE.has(tag) || util.isTextEditable(el) ? [] : Array.from(el.children).filter((c) => !SKIP.has(util.tag(c)));
          if (kids.length && depth >= maxDepth) {
            line += '  (+' + el.querySelectorAll('*').length + ' nested)';
            lines.push(line);
            return;
          }
          lines.push(line);
          for (const c of kids) visit(c, depth + 1);
        };
        visit(root, 0);
        return lines;
      };
      let depth = 40;
      let lines = render(depth);
      while (lines.length > maxLines && depth > 1) { depth = Math.max(1, Math.floor(depth * 0.7)); lines = render(depth); }
      if (lines.length > maxLines) lines = lines.slice(0, maxLines).concat(['… (' + (lines.length - maxLines) + ' more lines)']);
      return lines.join('\n');
    },
  });

  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  /**
   * id -> element lookup for one document at a time (the model, or the canvas frame), answering exactly as
   * querySelector('[data-he-id="…"]') does: the first match in document order. Scanning the document for every id
   * made work over a large selection quadratic (seconds at a few thousand elements), so when one synchronous run of
   * lookups (a redraw of the selection, an operation over it) has made at least INDEX_AFTER plain queries and they
   * have cost INDEX_RENT times what the last index build took, the matches are indexed in one pass. Lookups spread
   * over frames (hover, a single selection) never build, and in the worst case (a build that is dropped right away)
   * a run costs about a third more than its queries alone. The last build's cost carries over to the next document,
   * since a re-render or an undo replaces the document with one of about the same size. While an index exists, a
   * MutationObserver drops it as soon as elements are added, removed or moved or a data-he-id changes; it is not
   * watching otherwise, so a page script that churns the frame pays nothing extra.
   * One difference is left: Chrome's selector also matches an upper-case DATA-HE-ID on an SVG or MathML element,
   * which only a script calling setAttribute on it can create; the index and the observer ignore that attribute.
   */
  const INDEX_AFTER = 8;
  const INDEX_RENT = 3;
  function idIndex() {
    let owner = null, watch = null, index = null, misses = 0, spent = 0, buildMs = 0, unwatchable = false;
    let settling = false;
    const drop = () => {
      if (watch) { watch.disconnect(); watch = null; }
      index = null;
      misses = 0;
      spent = 0;
    };
    // The current run of lookups has ended: queries made later start counting from zero.
    const settle = () => {
      settling = false;
      if (!index) { misses = 0; spent = 0; }
    };
    const query = (d, id) => d.querySelector('[' + ID + '="' + cssEscape(id) + '"]');
    function find(d, id) {
      const key = String(id);
      // Engines turn NUL (and Firefox a lone surrogate) in a selector into U+FFFD, so the selector does not compare
      // such an id with attribute values as written. These ids never come from the editor: ask the selector.
      if (/[\0\uD800-\uDFFF]/.test(key)) return query(d, id);
      if (d !== owner) { drop(); owner = d; unwatchable = false; }
      // Changes made earlier in this task have not reached the observer's callback yet.
      if (watch && watch.takeRecords().length) drop();
      if (index) return index.get(key) || null;
      if (!settling) { settling = true; queueMicrotask(settle); }
      if (unwatchable || ++misses < INDEX_AFTER || spent < INDEX_RENT * buildMs) {
        const t = performance.now();
        const el = query(d, id);
        spent += performance.now() - t;
        return el;
      }
      const t = performance.now();
      const built = new Map();
      for (const el of d.querySelectorAll('[' + ID + ']')) {
        const v = el.getAttributeNS(null, ID); // the attribute the selector matches (no namespace)
        if (!built.has(v)) built.set(v, el);
      }
      try {
        watch = new MutationObserver(drop);
        watch.observe(d, { childList: true, subtree: true, attributes: true, attributeFilter: [ID] });
      } catch (e) {
        watch = null;
        unwatchable = true;
        return query(d, id);
      }
      index = built;
      buildMs = performance.now() - t;
      return index.get(key) || null;
    }
    /** Let go of the current document (it is being replaced). */
    find.forget = () => { drop(); owner = null; };
    return find;
  }
  const modelIndex = idIndex();
  const liveIndex = idIndex();

  /* ------------------------------------------------------------------ */
  /* Live DOM (canvas iframe) lookups — HE.canvas sets live.doc          */
  /* ------------------------------------------------------------------ */

  let cleanToastAt = 0;
  let currentLive = null;
  const live = (HE.live = {
    get doc() { return currentLive; },
    set doc(d) {
      if (d !== currentLive) liveIndex.forget(); // the old frame's index would keep it in memory
      currentLive = d;
    },
    /**
     * False while the edit frame still runs scripts although compat mode has ended (trust dropped, the user
     * turned it off, or an undo brought back script it was never confirmed over) and the scriptless re-render
     * is loading. Nothing is copied into such a frame: a <script> copied in would run there. The isolated
     * run frame is never live.doc, so it never counts here.
     */
    safe() {
      if (!this.doc) return true;
      try {
        const f = this.doc.defaultView && this.doc.defaultView.frameElement;
        if (!f || !/\ballow-scripts\b/.test(f.getAttribute('sandbox') || '')) return true;
      } catch (e) { return false; }
      return doc.trusted && !!(HE.canvas && HE.canvas.compat);
    },
    byId(id) { return this.safe() ? this.find(id) : null; },
    /** byId() without the safe() check: only for reading the frame (committing typed text). */
    find(id) {
      if (!this.doc || !id) return null;
      try { return liveIndex(this.doc, id); } catch (e) { return null; }
    },
    /** id of the nearest identified ancestor-or-self of a live node. */
    idOf(node) {
      let el = node && node.nodeType === 3 ? node.parentElement : node;
      const hit = el && el.closest ? el.closest('[' + ID + ']') : null;
      return hit ? hit.getAttribute(ID) : null;
    },
    import(node) { return this.doc.importNode(node, true); },
    /**
     * Before live nodes are written into the model: remove from the content of `root` (a detached copy, or the
     * live element itself when its frame runs no page script; its own attributes are not checked, callers take
     * its inner HTML) every piece of script the document
     * does not already have, the rule guardScript uses. A page script (compat mode) or a typed javascript:
     * link can add some. Says so once per burst. Returns how many pieces were removed.
     */
    clean(root) {
      const n = doc.model ? util.stripScript(root, util.scriptBits(doc.model)) : 0;
      if (n && Date.now() - cleanToastAt > 2000) {
        cleanToastAt = Date.now();
        HE.ui.toast(HE.t('編輯的內容含有這份文件原本沒有的腳本（例如事件屬性或 javascript: 連結），已在存入文件前移除。'), { timeout: 8000 });
      }
      return n;
    },
  });

  /* ------------------------------------------------------------------ */
  /* History                                                             */
  /* ------------------------------------------------------------------ */

  const COALESCE_MS = 1200;
  const HISTORY_BUDGET = 120e6; // characters of snapshots kept per stack

  // Undo snapshots hold each embedded file (data: URL) once; a snapshot refers to it by a short token
  // "\0<n>\1" and starts with "\0". A page that itself contains "\0" is stored unpacked.
  const BLOB_END_RE = /[\s"'<>()&\u0000\u0001]/g;
  const blobs = { keys: new Map(), list: [] };
  function pack(s) {
    if (s.indexOf('\u0000') >= 0) return s;
    const parts = [];
    let cursor = 0, scan = 0, start;
    // Scan for the end separately: a quantified character class can exhaust the regex stack on large data URLs.
    while ((start = s.indexOf('data:', scan)) !== -1) {
      BLOB_END_RE.lastIndex = start + 5;
      const endMatch = BLOB_END_RE.exec(s);
      const end = endMatch ? endMatch.index : s.length;
      scan = end;
      if (end - start - 5 < 2048) continue;
      const url = s.slice(start, end);
      let k = blobs.keys.get(url);
      if (k === undefined) {
        const own = (' ' + url).slice(1); // a copy, so the entry does not keep the whole snapshot string alive
        k = blobs.list.push(own) - 1;
        blobs.keys.set(own, k);
      }
      parts.push(s.slice(cursor, start), '\u0000' + k + '\u0001');
      cursor = end;
    }
    return parts.length ? '\u0000' + parts.join('') + s.slice(cursor) : s;
  }
  function unpack(s) {
    return s.charCodeAt(0) === 0 ? s.slice(1).replace(/\u0000(\d+)\u0001/g, (t, k) => blobs.list[k]) : s;
  }
  // The packed snapshot of the model as it is now, kept until the model is mutated or replaced, so a
  // step serialises the document once (at end) instead of at both begin and end.
  let current = null;
  let watched = null;
  const watcher = typeof MutationObserver === 'function' ? new MutationObserver(() => { current = null; }) : null;
  function packedSnapshot() {
    if (watcher && watcher.takeRecords().length) current = null;
    if (current && current.model === doc.model) return current.snap;
    const snap = pack(doc.snapshot());
    if (watcher && doc.model) {
      if (watched !== doc.model) {
        watcher.disconnect();
        watcher.observe(doc.model, { subtree: true, childList: true, attributes: true, characterData: true });
        watched = doc.model;
      }
      current = { model: doc.model, snap };
    }
    return snap;
  }

  const history = (HE.history = {
    undoStack: [],
    redoStack: [],
    limit: 100,
    _tx: null,
    _closers: [],

    /**
     * Run fn(tx) when the outermost transaction is about to close: what it writes through HE.ops joins
     * the same undo step (HE.fx regenerates its page CSS this way). Undo, redo and loading a document
     * never open a transaction, so closers do not run for them.
     */
    addCloser(fn) { this._closers.push(fn); },

    /** Open a transaction. Nested begins join the outer one. */
    begin(label, opts = {}) {
      if (this._tx) { this._tx.depth++; return this._tx; }
      const top = this.undoStack[this.undoStack.length - 1];
      const now = performance.now();
      const joining = !!(opts.coalesce && top && top.coalesce === opts.coalesce && now - top.time < COALESCE_MS && !this.redoStack.length);
      this._tx = { label: label || HE.t('編輯'), depth: 1, needsRender: false, coalesce: opts.coalesce || null, joining, before: joining ? null : packedSnapshot(), trusted: doc.trusted };
      return this._tx;
    },
    /** Close the transaction; records an undo step if the model changed. */
    end() {
      const tx = this._tx;
      if (!tx) return false;
      if (tx.depth === 1 && !tx.closing && this._closers.length) {
        tx.closing = true; // ops a closer calls run inside tx (depth stays 1), so no closer runs twice
        for (const fn of this._closers) {
          try { fn(tx); } catch (err) { console.error('[HE] history closer failed:', err); }
        }
        tx.closing = false;
      }
      if (--tx.depth > 0) return false;
      this._tx = null;
      let changed = true;
      if (tx.joining) {
        const top = this.undoStack[this.undoStack.length - 1];
        top.time = performance.now();
        if (tx.replaced) top.replaced = true;
      } else if (packedSnapshot() === tx.before) {
        changed = false;
      } else {
        // `trusted`: whether the state in `before` was trusted when it was saved. `replaced`: the step swaps the
        // whole document (replaceDocument), so stepping over it in either direction counts as another document.
        this.undoStack.push({ label: tx.label, before: tx.before, trusted: tx.trusted, replaced: !!tx.replaced, coalesce: tx.coalesce, time: performance.now() });
        this._trim(this.undoStack);
        this.redoStack = [];
      }
      if (tx.needsRender) HE.emit('doc:render', { reason: 'op' });
      if (changed) {
        sel.prune();
        HE.emit('doc:changed', { label: tx.label });
        this._emit();
      }
      return changed;
    },
    transact(label, fn, opts) {
      this.begin(label, opts);
      try { return fn(); } finally { this.end(); }
    },
    async transactAsync(label, fn, opts) {
      this.begin(label, opts);
      try { return await fn(); } finally { this.end(); }
    },
    get active() { return !!this._tx; },
    /** Newest undo entry (compare identity to know whether a step is still on top). */
    top() { return this.undoStack.length ? this.undoStack[this.undoStack.length - 1] : null; },
    /** Inside a long transaction: run a deferred full re-render now instead of at end(). Returns true if one was due. */
    flushRender() {
      if (!this._tx || !this._tx.needsRender) return false;
      this._tx.needsRender = false;
      HE.emit('doc:render', { reason: 'op' });
      return true;
    },
    canUndo() { return this.undoStack.length > 0; },
    canRedo() { return this.redoStack.length > 0; },
    undo() { return this._step(this.undoStack, this.redoStack, HE.t('復原')); },
    redo() { return this._step(this.redoStack, this.undoStack, HE.t('重做')); },
    _step(from, to, verb) {
      HE.emit('history:before');
      if (this._tx || !from.length) return false;
      // The entry object moves between the stacks so callers can track a step by identity (HE.history.top()).
      const entry = from.pop();
      const target = entry.before;
      const targetTrusted = entry.trusted;
      const wasTrusted = doc.trusted;
      const approved = wasTrusted ? util.scriptBits(doc.model) : null;
      entry.before = packedSnapshot();
      entry.trusted = wasTrusted;
      entry.time = 0;
      entry.coalesce = null;
      to.push(entry);
      this._trim(to);
      doc.restore(unpack(target));
      // Trust follows the snapshot: a state saved as trusted is trusted again, and one saved as untrusted
      // keeps the scripts running only when they are all scripts the user has already let run.
      if (targetTrusted === true && !wasTrusted) doc.setTrusted(true);
      else if (targetTrusted === false && wasTrusted && ![...util.scriptBits(doc.model)].every((b) => approved.has(b))) {
        doc.setTrusted(false);
        HE.ui.toast(HE.t('{verb}後的內容含有尚未允許的腳本。為了安全，這份文件的腳本已停止執行。', { verb }), { timeout: 8000 });
      }
      // Back or forth across 編輯整份 HTML: another document, as the forward replace was (the canvas ends compat mode).
      if (entry.replaced) HE.emit('doc:replaced', { history: true, step: HE.t('{verb}：{label}', { verb, label: entry.label }) });
      sel.prune();
      HE.emit('doc:changed', { label: HE.t('{verb}：{label}', { verb, label: entry.label }), history: true });
      this._emit();
      HE.ui.status(HE.t('{verb}：{label}', { verb, label: entry.label }));
      return true;
    },
    /** Drop the oldest entries beyond the count limit or the size budget (the newest one always stays). */
    _trim(stack) {
      let total = 0;
      for (const e of stack) total += e.before.length;
      while (stack.length > 1 && (stack.length > this.limit || total > HISTORY_BUDGET)) total -= stack.shift().before.length;
    },
    reset() {
      this.undoStack = []; this.redoStack = []; this._tx = null;
      blobs.keys.clear(); blobs.list = []; current = null;
      this._emit();
    },
    _emit() {
      HE.emit('history:changed', {
        canUndo: this.canUndo(), canRedo: this.canRedo(),
        undoLabel: this.undoStack.length ? this.undoStack[this.undoStack.length - 1].label : '',
        redoLabel: this.redoStack.length ? this.redoStack[this.redoStack.length - 1].label : '',
      });
    },
  });

  /* ------------------------------------------------------------------ */
  /* Operations — each changes model and live DOM together               */
  /* ------------------------------------------------------------------ */

  const POS = { before: 'beforebegin', after: 'afterend', prepend: 'afterbegin', append: 'beforeend' };
  function arr(ids) { return (Array.isArray(ids) ? ids : [ids]).filter(Boolean); }
  function run(label, fn, opts) { return history._tx ? fn() : history.transact(label, fn, opts); }
  function needRender() { if (history._tx) history._tx.needsRender = true; else HE.emit('doc:render', { reason: 'op' }); }
  /**
   * New script needs the user's say before it runs anywhere: in the isolated run frame, and above all in a
   * compat-mode edit frame (it shares the editor's origin). For a trusted document, stop its scripts (the
   * canvas drops the run frame / re-renders without them) and return true: the caller then skips the live
   * copy. Call it before the model changes: script the page already has (a pasted copy of a button with its
   * onclick) is not new.
   */
  function guardScript(frag) {
    if (!doc.trusted || !util.hasScript(frag)) return false;
    const have = util.scriptBits(doc.model);
    if ([...util.scriptBits(frag)].every((b) => have.has(b))) return false;
    return untrust();
  }
  function untrust() {
    doc.setTrusted(false);
    HE.ui.toast(HE.t('新加入的內容含有腳本。為了安全，這份文件的腳本已停止執行。'), { timeout: 8000 });
    return true;
  }
  /**
   * The model parses <noscript> as markup, a scripted canvas as raw text: content landing inside one
   * (a comment or <style> holding '</noscript>') can end it early there although the fragment itself
   * carries no script. Call with the element the change lands in, before the change; call the returned
   * function after it, before any live copy (true = the document was untrusted).
   */
  function guardNoscript(at) {
    const ns = doc.trusted && at && at.closest ? at.closest('noscript') : null;
    if (!ns) return () => false;
    const before = ns.innerHTML;
    return () => {
      const after = ns.innerHTML;
      return doc.trusted && after !== before && /<\/noscript/i.test(after) ? untrust() : false;
    };
  }
  function styleValue(raw) {
    let value = raw == null ? '' : String(raw).trim();
    let prio = '';
    if (/!important$/i.test(value)) { prio = 'important'; value = value.replace(/\s*!important$/i, ''); }
    return { value, prio };
  }
  function applyStyle(el, prop, raw) {
    const { value, prio } = styleValue(raw);
    if (!el.style) return;
    if (value === '') el.style.removeProperty(prop);
    else el.style.setProperty(prop, value, prio);
    if (el.getAttribute('style') === '') el.removeAttribute('style');
  }
  /** Split a style attribute on ';' outside quotes and parentheses (data: URLs contain ';'). */
  function splitDeclarations(css) {
    const out = [];
    let depth = 0;
    let quote = '';
    let cur = '';
    for (const ch of css) {
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ';' && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map((d) => d.trim()).filter(Boolean);
  }
  function sameDecls(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      // Longhands of a shorthand written with var() read as '': compare the declarations as written instead.
      if (a.getPropertyValue(p) === '') {
        const n = (s) => s.cssText.split(/;\s*/).filter(Boolean).sort().join(';');
        return n(a) === n(b);
      }
      if (a.getPropertyValue(p) !== b.getPropertyValue(p) || a.getPropertyPriority(p) !== b.getPropertyPriority(p)) return false;
    }
    return true;
  }
  /**
   * Model styles are edited as text: a CSSOM edit rewrites the whole attribute and drops fallbacks and
   * declarations this browser does not know. CSSOM is still the judge of what the edit means, and is
   * used directly when the text edit would mean something else (a longhand set only by a shorthand).
   * Returns true when the live copy must take the model's style text as is (see below).
   */
  function applyModelStyle(el, prop, raw) {
    if (!el.style) return false;
    const old = el.getAttribute('style') || '';
    const probe = (css) => { const p = el.ownerDocument.createElement('div'); p.setAttribute('style', css); return p.style; };
    const want = el.ownerDocument.createElement('div');
    want.setAttribute('style', old);
    applyStyle(want, prop, raw);
    const before = probe(old);
    if (want.style.cssText === before.cssText) return false; // invalid value, or already so (want starts as a parse of old)
    const key = (n) => (n.startsWith('--') ? n : n.toLowerCase());
    const kept = splitDeclarations(old).filter((d) => key(d.slice(0, Math.max(0, d.indexOf(':'))).trim()) !== key(prop));
    const { value, prio } = styleValue(raw);
    if (value !== '') kept.push(prop + ': ' + value + (prio ? ' !important' : ''));
    const text = kept.join('; ');
    // A shorthand written with var() leaves CSSOM unable to say what a longhand edit means, and its
    // rewrite would drop the shorthand: keep the text edit (removing a longhand only the shorthand sets
    // then changes nothing) and have the live copy show exactly that text.
    // Only a var() shorthand that covers `prop` counts; CSSOM keeps unrelated ones as written.
    const cover = new Set(Array.from(probe(prop + ': inherit')));
    let pending = false;
    for (let i = 0; i < before.length && !pending; i++) pending = cover.has(before[i]) && before.getPropertyValue(before[i]) === '';
    if (!pending && !sameDecls(want.style, probe(text))) { applyStyle(el, prop, raw); return false; }
    if (text) el.setAttribute('style', text); else el.removeAttribute('style');
    return pending;
  }
  function docOrder(ids) {
    const els = arr(ids).map((id) => doc.byId(id)).filter(Boolean);
    els.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    return els.map((e) => e.getAttribute(ID));
  }
  /** Insert `nodes` relative to `ref`. Root elements only accept inside positions. */
  function place(ref, position, nodes, ownerDoc) {
    let pos = position;
    if ((pos === 'before' || pos === 'after') && (ref === ownerDoc.body || ref === ownerDoc.documentElement || ref === ownerDoc.head)) {
      pos = pos === 'before' ? 'prepend' : 'append';
    }
    if (pos === 'before') ref.before(...nodes);
    else if (pos === 'after') ref.after(...nodes);
    else if (pos === 'prepend') ref.prepend(...nodes);
    else ref.append(...nodes);
  }
  function syncLive(id) {
    const l = live.byId(id);
    const m = doc.byId(id);
    if (!l || !m) { needRender(); return null; }
    const fresh = live.import(m);
    l.replaceWith(fresh);
    return fresh;
  }
  function liveStripEditorAttrs(root) {
    // contenteditable/spellcheck are the editor's only on the element being edited; the page may use them too.
    const clean = (el) => {
      if (el.hasAttribute('data-he-editing')) { el.removeAttribute('contenteditable'); el.removeAttribute('spellcheck'); el.removeAttribute('data-he-editing'); }
      el.removeAttribute('data-he-hidden');
      el.removeAttribute('data-he-fx-demo'); // HE.fx effect preview
      if (el.getAttribute('style') === '') el.removeAttribute('style');
    };
    clean(root);
    root.querySelectorAll('*').forEach(clean);
  }

  const ops = (HE.ops = {
    POSITIONS: Object.keys(POS),

    /** styles: {prop: value}; '' or null removes; "x !important" supported. camelCase or kebab-case. */
    setStyle(ids, styles, opts = {}) {
      return run(opts.label || HE.t('修改樣式'), () => {
        for (const id of arr(ids)) {
          const m = doc.byId(id);
          if (!m) continue;
          const l = live.byId(id);
          for (const [p, v] of Object.entries(styles || {})) {
            const prop = util.camelToKebab(p);
            const mirror = applyModelStyle(m, prop, v);
            if (!l) continue;
            if (!mirror) applyStyle(l, prop, v);
            else if (m.hasAttribute('style')) l.setAttribute('style', m.getAttribute('style'));
            else l.removeAttribute('style');
          }
        }
      }, opts);
    },

    /**
     * Keep one part of an <img>: box {left, top, right, bottom} in percent of the image, each measured from its left
     * or top edge. The pixels outside are gone from the image stored in the document. One undo step.
     * Returns {width, height, was: {w, h}, characters}. Throws an Error with .code 'not-image', 'not-loaded',
     * 'bad-box' or 'unreadable' (an image from another site, which a page may not read back).
     */
    cropImage(id, box, opts = {}) {
      const fail = (code, message) => Object.assign(new Error(message), { code });
      const m = doc.byId(id);
      if (!m) throw fail('not-image', 'No element with id "' + id + '".');
      if (util.tag(m) !== 'img') throw fail('not-image', 'An <img> element is needed; "' + id + '" is <' + util.tag(m) + '>.');
      const l = live.byId(id);
      if (!l || !l.naturalWidth || !l.naturalHeight) throw fail('not-loaded', 'The image has not loaded, so it cannot be cropped.');
      const pct = (name) => {
        const n = Number(box && box[name]);
        if (!Number.isFinite(n) || n < 0 || n > 100) throw fail('bad-box', name + ' must be a number from 0 to 100.');
        return n;
      };
      const left = pct('left'), top = pct('top'), right = pct('right'), bottom = pct('bottom');
      if (right - left < 1 || bottom - top < 1) throw fail('bad-box', 'right must be greater than left, and bottom greater than top, by 1 or more.');
      const nw = l.naturalWidth, nh = l.naturalHeight;
      const sx = Math.round(nw * left / 100), sy = Math.round(nh * top / 100);
      const sw = Math.max(1, Math.min(nw - sx, Math.round(nw * (right - left) / 100)));
      const sh = Math.max(1, Math.min(nh - sy, Math.round(nh * (bottom - top) / 100)));
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      c.getContext('2d').drawImage(l, sx, sy, sw, sh, 0, 0, sw, sh);
      const src = m.getAttribute('src') || '';
      // A photograph stays a JPEG; anything else becomes a PNG, which keeps sharp edges and transparency.
      const jpeg = /^data:image\/jpe?g/i.test(src) || /\.jpe?g($|[?#])/i.test(src);
      let url;
      try { url = jpeg ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png'); } catch (err) {
        throw fail('unreadable', 'The browser does not let the editor read this image (it is loaded from another site), so it cannot be cropped. Tell the user to embed the image in the document first.');
      }
      const attrs = { src: url };
      if (m.hasAttribute('srcset')) attrs.srcset = null; // the other sizes still show the whole picture
      const whole = (v) => (/^\d+$/.test(v || '') ? +v : 0);
      const w = whole(m.getAttribute('width')), h = whole(m.getAttribute('height'));
      if (w && h) attrs.height = String(Math.max(1, Math.round(w * sh / sw)));
      // A height or a ratio written for the whole picture would stretch the part that is left.
      const fixed = {};
      if (m.style.height && m.style.height !== 'auto') fixed.height = '';
      if (m.style.aspectRatio) fixed['aspect-ratio'] = '';
      const label = opts.label || HE.t('裁切圖片');
      run(label, () => {
        ops.setAttr(id, attrs, { label });
        if (Object.keys(fixed).length) ops.setStyle(id, fixed, { label });
      });
      return { width: sw, height: sh, was: { w: nw, h: nh }, characters: url.length };
    },

    /** attrs: {name: value}; null/false removes. 'class' is diffed so classes added by page scripts survive live. */
    setAttr(ids, attrs, opts = {}) {
      return run(opts.label || HE.t('修改屬性'), () => {
        for (const id of arr(ids)) {
          const m = doc.byId(id);
          if (!m) continue;
          let l = live.byId(id);
          for (const [name, value] of Object.entries(attrs || {})) {
            if (!name || name === ID) continue;
            if (name === 'class') { ops.setClasses(id, value == null || value === false ? '' : String(value)); continue; }
            try {
              const n = name.toLowerCase();
              const refresh = util.tag(m) === 'meta' && (n === 'content' || n === 'http-equiv');
              if (doc.trusted && (n.startsWith('on') || URL_ATTRS.has(n) || SCRIPT_ATTR.test(n) || refresh)) {
                // A new handler or script URL (a refresh <meta> included), or a <script type="text/plain">
                // losing its type, must not go live in a frame that runs scripts.
                const p = m.cloneNode(util.isRawText(m) || util.tag(m) === 'noscript');
                if (value == null || value === false) p.removeAttribute(name); else p.setAttribute(name, String(value));
                if (guardScript(p)) { l = null; needRender(); }
              }
              if (value == null || value === false) { m.removeAttribute(name); if (l) l.removeAttribute(name); }
              else { m.setAttribute(name, String(value)); if (l) l.setAttribute(name, String(value)); }
            } catch (e) { console.warn('[HE] bad attribute', name, e); }
          }
        }
      }, opts);
    },

    setClasses(id, classString, opts = {}) {
      return run(opts.label || HE.t('修改類別'), () => {
        const m = doc.byId(id);
        if (!m) return;
        const l = live.byId(id);
        const before = new Set((m.getAttribute('class') || '').split(/\s+/).filter(Boolean));
        const after = new Set(String(classString || '').split(/\s+/).filter(Boolean));
        if (after.size) m.setAttribute('class', Array.from(after).join(' ')); else m.removeAttribute('class');
        if (l) {
          for (const c of before) if (!after.has(c)) l.classList.remove(c);
          for (const c of after) if (!before.has(c)) l.classList.add(c);
          if (!l.classList.length) l.removeAttribute('class');
        }
      }, opts);
    },

    setText(id, text, opts = {}) {
      return run(opts.label || HE.t('修改文字'), () => {
        const m = doc.byId(id);
        if (!m) return;
        const t = util.rawSafe(m, text);
        let unsafe = false;
        if (util.tag(m) === 'script') { const p = m.cloneNode(false); p.textContent = t; unsafe = guardScript(p); }
        const check = guardNoscript(m);
        m.textContent = t;
        if (check()) unsafe = true;
        const l = unsafe ? null : live.byId(id);
        if (l) l.textContent = t; else needRender();
      }, opts);
    },

    setInnerHTML(id, html, opts = {}) {
      return run(opts.label || HE.t('修改內容'), () => {
        const m = doc.byId(id);
        if (!m) return;
        // Markup inside <style>/<script> is text.
        if (util.isRawText(m)) { ops.setText(id, html, opts); return; }
        const frag = util.fragment(html, doc.model);
        doc.dedupeIds(frag, doc.idsIn(m));
        doc.ensureIds(frag);
        const unsafe = guardScript(frag);
        const check = guardNoscript(m);
        m.replaceChildren(frag);
        if (check() || unsafe || m === doc.model.body || m === doc.model.head) { needRender(); return; }
        const l = live.byId(id);
        if (l) l.replaceChildren(...Array.from(m.childNodes).map((n) => live.import(n)));
        else needRender();
      }, opts);
    },

    /**
     * Replace an element with new HTML (one or more top-level nodes).
     * Ids already in the replaced subtree may be reused by the new HTML.
     * Returns the ids of the new top-level elements.
     */
    replaceHTML(id, html, opts = {}) {
      return run(opts.label || HE.t('取代元素'), () => {
        const m = doc.byId(id);
        if (!m) return [];
        const tag = util.tag(m);
        if (tag === 'html') { ops.replaceDocument(html, opts); return [doc.model.documentElement.getAttribute(ID)]; }
        if (tag === 'body' || tag === 'head') {
          const parsed = parseDoc(/<body[\s>]/i.test(html) || /<head[\s>]/i.test(html) ? html : (tag === 'body' ? '<body>' + html + '</body>' : '<head>' + html + '</head>'));
          const src = tag === 'body' ? parsed.body : parsed.head;
          // Checked as a whole before the model changes: <body onload> is new script too.
          guardScript(src);
          for (const a of Array.from(m.attributes)) if (a.name !== ID) m.removeAttribute(a.name);
          for (const a of Array.from(src.attributes)) if (a.name !== ID) m.setAttribute(a.name, a.value);
          const kids = Array.from(src.childNodes).map((n) => doc.model.importNode(n, true));
          const frag = doc.model.createDocumentFragment();
          frag.append(...kids);
          doc.dedupeIds(frag, doc.idsIn(m));
          doc.ensureIds(frag);
          m.replaceChildren(frag);
          needRender();
          return [m.getAttribute(ID)];
        }
        const frag = util.fragment(html, doc.model);
        doc.dedupeIds(frag, doc.idsIn(m));
        doc.ensureIds(frag);
        const tops = Array.from(frag.children).map((e) => e.getAttribute(ID));
        let l = guardScript(frag) ? null : live.byId(id);
        const liveNodes = l ? Array.from(frag.childNodes).map((n) => live.import(n)) : null;
        const check = guardNoscript(m.parentElement);
        m.replaceWith(frag);
        if (check()) l = null;
        if (l) l.replaceWith(...liveNodes); else needRender();
        return tops;
      }, opts);
    },

    /** Insert HTML relative to refId ('before'|'after'|'prepend'|'append'). refId null = body. Returns new top-level ids. */
    insertHTML(refId, position, html, opts = {}) {
      return run(opts.label || HE.t('插入元素'), () => {
        const ref = refId ? doc.byId(refId) : doc.model.body;
        if (!ref) return [];
        const pos = POS[position] ? position : 'after';
        const parent = pos === 'before' || pos === 'after' ? ref.parentElement : ref;
        if (util.isRawText(parent)) {
          // Markup going into a <style>/<script> is text.
          const s = String(html == null ? '' : html);
          ops.setText(doc.idOf(parent), pos === 'before' || pos === 'prepend' ? s + parent.textContent : parent.textContent + s, opts);
          return [];
        }
        const frag = util.fragment(html, doc.model);
        doc.dedupeIds(frag, null);
        doc.ensureIds(frag);
        const tops = Array.from(frag.children).map((e) => e.getAttribute(ID));
        let lRef = guardScript(frag) ? null : refId ? live.byId(refId) : (live.doc && live.safe() && live.doc.body);
        const liveNodes = lRef ? Array.from(frag.childNodes).map((n) => live.import(n)) : null;
        const check = guardNoscript(parent);
        place(ref, pos, Array.from(frag.childNodes), doc.model);
        if (check()) lRef = null;
        if (lRef) place(lRef, pos, liveNodes, live.doc); else needRender();
        return tops;
      }, opts);
    },

    remove(ids, opts = {}) {
      return run(opts.label || HE.t('刪除'), () => {
        let n = 0;
        for (const id of arr(ids)) {
          const m = doc.byId(id);
          if (!m || doc.isRoot(m)) continue;
          m.remove();
          const l = live.byId(id);
          if (l) l.remove();
          n++;
        }
        return n;
      }, opts);
    },

    /** Move element `id` relative to `refId`. Refuses to move an element into itself. */
    move(id, refId, position, opts = {}) {
      return run(opts.label || HE.t('移動'), () => {
        const m = doc.byId(id);
        const ref = doc.byId(refId);
        if (!m || !ref || m === ref || doc.isRoot(m) || m.contains(ref)) return false;
        const pos = POS[position] ? position : 'after';
        const check = guardNoscript(pos === 'before' || pos === 'after' ? ref.parentElement : ref);
        place(ref, pos, [m], doc.model);
        const moved = !check();
        const l = moved ? live.byId(id) : null;
        const lRef = moved ? live.byId(refId) : null;
        if (l && lRef && !l.contains(lRef)) place(lRef, pos, [l], live.doc); else needRender();
        return true;
      }, opts);
    },

    /** Nearest sibling of a model element (or id) toward dir (-1|+1) that shows on the page, or null. Skips scripts, styles etc. */
    visualSibling(el, dir) {
      const m = typeof el === 'string' ? doc.byId(el) : el;
      if (!m) return null;
      const step = (n) => (dir < 0 ? n.previousElementSibling : n.nextElementSibling);
      let s = step(m);
      while (s && (NON_VISUAL.has(util.tag(s)) || !s.hasAttribute(ID))) s = step(s);
      return s;
    },

    /** Move up (-1) or down (+1) past the nearest visible sibling. False (and no undo step) when there is none. */
    nudge(id, dir, opts = {}) {
      const sib = ops.visualSibling(id, dir);
      if (!sib) return false;
      return ops.move(id, sib.getAttribute(ID), dir < 0 ? 'before' : 'after', { label: opts.label || (dir < 0 ? HE.t('上移') : HE.t('下移')) });
    },

    /**
     * Where a level change would put element `el` (or id): {refId, position}, or null when it cannot go.
     * dir -1 (move out): right after its parent, as the parent's sibling. dir +1 (move in): last child of
     * the nearest visible sibling above it. `skip` (Set of ids): never move into one of these. `took` (Set of
     * ids): containers that already took an element in this level change, so no longer need to be empty boxes.
     */
    levelTarget(el, dir, skip, took) {
      const m = typeof el === 'string' ? doc.byId(el) : el;
      const body = doc.body;
      if (!m || doc.isRoot(m) || !body || !body.contains(m)) return null;
      if (dir < 0) {
        const p = m.parentElement;
        if (!p || doc.isRoot(p) || !p.hasAttribute(ID) || !util.keepsChild(p.parentElement, m)) return null;
        return { refId: p.getAttribute(ID), position: 'after' };
      }
      const s = ops.visualSibling(m, -1);
      const sid = s && s.getAttribute(ID);
      if (!s || (skip && skip.has(sid)) || (!(took && took.has(sid)) && !util.acceptsDrop(s)) || !util.keepsChild(s, m)) return null;
      return { refId: sid, position: 'append' };
    },

    /**
     * Move each element out of its parent (dir -1) or into the sibling above it (dir +1), as one undo step.
     * A selected element never takes another selected one inside it. Returns the moved ids ([]: no undo step).
     */
    changeLevel(ids, dir, opts = {}) {
      const order = docOrder(ids).filter((id) => !doc.isRoot(doc.byId(id))).filter((id, i, all) => {
        const m = doc.byId(id);
        return !all.some((o) => o !== id && doc.byId(o).contains(m));
      });
      const skip = new Set(order);
      if (!order.some((id) => ops.levelTarget(id, dir, skip))) return [];
      // Moving out goes last-first so siblings that leave the same parent keep their order after it.
      if (dir < 0) order.reverse();
      const moved = [];
      const took = new Set();
      run(opts.label || (dir < 0 ? HE.t('移出父層') : HE.t('移入上方元素')), () => {
        for (const id of order) {
          const t = ops.levelTarget(id, dir, skip, took);
          if (!t || !ops.move(id, t.refId, t.position)) continue;
          moved.push(id);
          if (dir > 0) took.add(t.refId);
        }
      }, opts);
      return docOrder(moved);
    },

    /** Duplicate each element right after itself. Returns the new ids. */
    duplicate(ids, opts = {}) {
      return run(opts.label || HE.t('建立副本'), () => {
        const out = [];
        for (const id of docOrder(ids).reverse()) {
          const m = doc.byId(id);
          if (!m || doc.isRoot(m)) continue;
          const c = m.cloneNode(true);
          const map = new Map();
          eachElement(c, (el) => {
            const nid = doc.newId();
            const old = el.getAttribute(ID);
            if (old) map.set(old, nid);
            el.setAttribute(ID, nid);
          });
          m.after(c);
          const l = live.byId(id);
          let lc = null;
          if (l) {
            lc = l.cloneNode(true);
            const fix = (el) => { const old = el.getAttribute(ID); if (old && map.has(old)) el.setAttribute(ID, map.get(old)); else if (old) el.removeAttribute(ID); };
            fix(lc);
            lc.querySelectorAll('[' + ID + ']').forEach(fix);
            liveStripEditorAttrs(lc);
            l.after(lc);
          } else needRender();
          // A copy must not repeat the page's HTML ids (label for, #anchors would keep pointing at the original).
          util.renameClashingIds([c], (el, attrs) => {
            const hid = el.getAttribute(ID);
            const le = lc && (lc.getAttribute(ID) === hid ? lc : lc.querySelector('[' + ID + '="' + hid + '"]'));
            for (const [k, v] of Object.entries(attrs)) { el.setAttribute(k, v); if (le) le.setAttribute(k, v); }
          });
          out.unshift(c.getAttribute(ID));
        }
        return out;
      }, opts);
    },

    /** Wrap elements (same parent) in a new element. Returns the wrapper id. */
    wrap(ids, tag = 'div', attrs = {}, opts = {}) {
      return run(opts.label || HE.t('包進容器'), () => {
        let order = docOrder(ids).filter((id) => !doc.isRoot(doc.byId(id)));
        if (!order.length) return null;
        const parent = doc.byId(order[0]).parentNode;
        order = order.filter((id) => doc.byId(id).parentNode === parent);
        const w = doc.model.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) if (v != null) w.setAttribute(k, v);
        const wid = doc.newId();
        w.setAttribute(ID, wid);
        const first = doc.byId(order[0]);
        first.before(w);
        for (const id of order) w.append(doc.byId(id));
        const lFirst = live.byId(order[0]);
        if (lFirst && order.every((id) => live.byId(id))) {
          const lw = live.doc.importNode(w.cloneNode(false), false);
          lFirst.before(lw);
          for (const id of order) lw.append(live.byId(id));
        } else needRender();
        return wid;
      }, opts);
    },

    /** Replace an element with its children. */
    unwrap(id, opts = {}) {
      return run(opts.label || HE.t('解除容器'), () => {
        const m = doc.byId(id);
        if (!m || doc.isRoot(m)) return false;
        m.replaceWith(...Array.from(m.childNodes));
        const l = live.byId(id);
        if (l) l.replaceWith(...Array.from(l.childNodes)); else needRender();
        return true;
      }, opts);
    },

    /**
     * Change a model subtree with custom code, then refresh its live copy from the model.
     * fn(modelEl, modelDoc) may add, clone or remove descendants freely; ids are repaired after.
     */
    mutate(id, fn, opts = {}) {
      return run(opts.label || HE.t('編輯'), () => {
        const m = doc.byId(id);
        if (!m) return undefined;
        const result = fn(m, doc.model);
        const still = doc.byId(id) || m;
        if (still.isConnected) doc.repairIds(still);
        if (doc.isRoot(still)) needRender(); else syncLive(id);
        return result;
      }, opts);
    },

    /** Re-copy one element from model to live (after direct model edits). */
    syncLive,

    /**
     * Copy the inner HTML of a live element (after in-place text editing) into the model, without any
     * script the document does not already have (HE.live.clean). Returns true when something changed.
     * The canvas calls it only when the user changed the text, so a page script that changes the element
     * on its own (compat mode) never makes an undo step.
     */
    commitLiveContent(id, opts = {}) {
      // Read even from a frame safe() refuses: the text typed there must not be lost when trust drops mid-edit.
      const l = live.find(id);
      const m = doc.byId(id);
      if (!l || !m) return false;
      doc.repairIds(l); // contenteditable may have cloned nodes with ids or created new ones
      l.querySelectorAll('[' + ID + ']').forEach((e) => {
        if (doc.byId(e.getAttribute(ID)) && !m.contains(doc.byId(e.getAttribute(ID)))) e.setAttribute(ID, doc.newId());
      });
      // A frame that runs no page script holds only what the editor and the user put there: script removed from
      // the copy goes from the frame too, so the canvas keeps matching the model (and the next commit does not
      // strip it, and toast, again). A scripted frame (compat mode) keeps what the page's own scripts did to it.
      let scripted = true;
      try {
        const f = l.ownerDocument.defaultView && l.ownerDocument.defaultView.frameElement;
        scripted = !f || /\ballow-scripts\b/.test(f.getAttribute('sandbox') || '');
      } catch (e) { scripted = true; }
      if (!scripted) live.clean(l); // attributes and script elements only: the caret stays where it is
      const c = l.cloneNode(true);
      liveStripEditorAttrs(c);
      if (scripted) live.clean(c);
      // Live styles are written by CSSOM, model styles as text: where they mean the same, keep the model's text.
      c.querySelectorAll('[style][' + ID + ']').forEach((e) => {
        const me = m.querySelector('[' + ID + '="' + cssEscape(e.getAttribute(ID)) + '"]');
        const ms = me && me.getAttribute('style');
        if (ms != null && ms !== e.getAttribute('style') && e.style && me.style && sameDecls(e.style, me.style)) e.setAttribute('style', ms);
      });
      const html = c.innerHTML;
      if (html === m.innerHTML) return false;
      run(opts.label || HE.t('編輯文字'), () => {
        const check = guardNoscript(m);
        m.innerHTML = html;
        doc.ensureIds(m);
        if (check()) needRender();
      }, opts);
      return true;
    },

    /**
     * Replace the whole document (keeps history; a single undo step). Emits doc:replaced (the canvas ends compat
     * mode), and so do an undo and a redo of that step.
     */
    replaceDocument(html, opts = {}) {
      return run(opts.label || HE.t('取代整份文件'), () => {
        history._tx.replaced = true;
        const d = parseDoc(html);
        stripIds(d.documentElement);
        guardScript(d);
        doc.doctype = doctypeOf(d) || doc.doctype;
        doc.model = d;
        doc.ensureIds(d.documentElement);
        needRender();
        HE.emit('doc:replaced');
      }, opts);
    },

    /** Maintain <style data-he-style="key"> in the head (empty css removes it). */
    setHeadStyle(key, css, opts = {}) {
      return run(opts.label || HE.t('修改頁面 CSS'), () => {
        const sel = 'style[data-he-style="' + cssEscape(key) + '"]';
        let m = doc.model.head.querySelector(sel);
        const text = String(css || '');
        if (!text.trim()) {
          if (m) { const id = m.getAttribute(ID); m.remove(); const l = live.byId(id); if (l) l.remove(); }
          return;
        }
        if (!m) {
          m = doc.model.createElement('style');
          m.setAttribute('data-he-style', key);
          m.setAttribute(ID, doc.newId());
          doc.model.head.append(m);
          if (live.doc && live.safe()) {
            const lm = live.import(m);
            live.doc.head.append(lm);
            HE.emit('live:headstyle', { key, el: lm }); // e.g. the canvas turns 'fx-motion' off in edit mode
          }
        }
        const safe = util.rawSafe(m, text);
        m.textContent = safe;
        const l = live.byId(m.getAttribute(ID));
        if (l) l.textContent = safe; else needRender();
      }, opts);
    },
    getHeadStyle(key) {
      const m = doc.model && doc.model.head.querySelector('style[data-he-style="' + cssEscape(key) + '"]');
      return m ? m.textContent : '';
    },

    setTitle(text, opts = {}) {
      return run(opts.label || HE.t('修改頁面標題'), () => {
        let t = doc.model.head.querySelector('title');
        if (!t) {
          t = doc.model.createElement('title');
          t.setAttribute(ID, doc.newId());
          doc.model.head.prepend(t);
          if (live.doc && live.safe()) live.doc.head.prepend(live.import(t));
        }
        t.textContent = text;
        const l = live.byId(t.getAttribute(ID));
        if (l) l.textContent = text;
      }, opts);
    },
  });

  /* ------------------------------------------------------------------ */
  /* Selection                                                           */
  /* ------------------------------------------------------------------ */

  const sel = (HE.sel = {
    ids: [],
    get primary() { return this.ids.length ? this.ids[this.ids.length - 1] : null; },
    set(ids, opts = {}) {
      const next = Array.from(new Set(arr(ids).filter((id) => doc.byId(id))));
      if (next.length === this.ids.length && next.every((id, i) => id === this.ids[i])) return;
      this.ids = next;
      if (!opts.silent) HE.emit('selection:changed', { ids: next.slice() });
    },
    add(id) { this.set(this.ids.filter((x) => x !== id).concat([id])); },
    toggle(id) { this.has(id) ? this.set(this.ids.filter((x) => x !== id)) : this.add(id); },
    clear() { this.set([]); },
    has(id) { return this.ids.includes(id); },
    models() { return this.ids.map((id) => doc.byId(id)).filter(Boolean); },
    lives() { return this.ids.map((id) => live.byId(id)).filter(Boolean); },
    prune() {
      const kept = this.ids.filter((id) => doc.byId(id));
      if (kept.length !== this.ids.length) { this.ids = kept; HE.emit('selection:changed', { ids: kept.slice() }); }
    },
  });

  /* ------------------------------------------------------------------ */
  /* Mode, settings                                                      */
  /* ------------------------------------------------------------------ */

  HE.mode = 'edit';
  HE.setMode = function (mode) {
    if (mode !== 'edit' && mode !== 'preview') return;
    if (HE.mode === mode) return;
    HE.mode = mode;
    document.documentElement.setAttribute('data-he-mode', mode);
    HE.emit('mode:changed', { mode });
  };

  const SETTINGS_KEY = 'tactile:settings';
  // Chromium gives every page opened from disk one localStorage: any HTML file the user opens could read a key
  // stored there. From file:// these settings stay in memory, and a copy an earlier version stored is removed.
  const SECRET_KEYS = ['ai.anthropic.key', 'ai.openai.key'];
  const MEMORY_ONLY = location.protocol === 'file:';
  HE.settings = {
    storageKey: SETTINGS_KEY, // the localStorage key holding them all, as JSON
    secretsInMemoryOnly: MEMORY_ONLY,
    /** True when this load found a stored key and removed it from storage (the key stays usable until the tab closes). */
    removedStoredSecrets: false,
    _cache: null,
    _all() {
      if (!this._cache) {
        this._cache = util.storage.get(SETTINGS_KEY, {}) || {};
        if (MEMORY_ONLY && SECRET_KEYS.some((k) => k in this._cache)) {
          this.removedStoredSecrets = SECRET_KEYS.some((k) => !!this._cache[k]);
          this._store();
        }
      }
      return this._cache;
    },
    /** Writes the stored copy: everything, or everything but the keys when they stay in memory. */
    _store() {
      let out = this._cache;
      if (MEMORY_ONLY) {
        out = {};
        for (const k of Object.keys(this._cache)) if (!SECRET_KEYS.includes(k)) out[k] = this._cache[k];
      }
      return util.storage.set(SETTINGS_KEY, out);
    },
    get(key, fallback) { const all = this._all(); return key in all ? all[key] : fallback; },
    /** Returns whether the stored copy was written (false: storage full or unavailable; memory has the value anyway). */
    set(key, value) {
      const all = this._all();
      all[key] = value;
      const stored = this._store();
      HE.emit('settings:changed', { key, value });
      return stored;
    },
    /** Forget a setting (get() falls back to its default again). Like set(), it stores all of them again and says whether that worked. */
    remove(key) {
      const all = this._all();
      const had = key in all;
      delete all[key];
      const stored = this._store();
      if (had) HE.emit('settings:changed', { key, value: undefined });
      return stored;
    },
    keys() { return Object.keys(this._all()); },
  };

  /* ------------------------------------------------------------------ */
  /* Interface language                                                  */
  /* ------------------------------------------------------------------ */

  // The interface text is written in the code in Traditional Chinese. HE.t(text) returns it as written, or its
  // translation when another language is chosen (src/js/lang-en.js, src/js/lang-zh-cn.js). A text with no translation is shown as
  // written, and named in HE.i18n.missing. The language is fixed at load: choosing another reloads the page,
  // because every module builds its part of the interface once.
  const LANGS = [['zh-TW', '繁體中文'], ['zh-CN', '简体中文'], ['en', 'English']]; // i18n-ok: each language is named in itself
  const HTML_LANG = { 'zh-TW': 'zh-Hant', 'zh-CN': 'zh-Hans', en: 'en' };
  const dicts = { en: Object.create(null) };
  function startLang() {
    const saved = HE.settings.get('ui.lang', '');
    if (LANGS.some((l) => l[0] === saved)) return saved;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (!/^zh\b/i.test(nav)) return 'en';
    // Taiwan, Hong Kong and Macau write Traditional Chinese; a plain "zh" and the rest write Simplified.
    return /^zh-(hant|tw|hk|mo)\b/i.test(nav) ? 'zh-TW' : 'zh-CN';
  }
  HE.lang = startLang();
  // Whether the interface is written in Chinese: sentences then follow each other without a space.
  HE.langIsChinese = /^zh/.test(HE.lang);
  // The code shared with tactile-ingest words its own messages in English or Traditional Chinese (say() in ingest/src/decimal.mjs).
  globalThis.TACTILE_LANG = HE.langIsChinese ? 'zh' : 'en';
  HE.i18n = {
    langs: LANGS,
    /** The languages a document may be written in to suit this interface, the best first (templates carry one). */
    docLangs: HE.lang === 'en' ? ['en'] : HE.lang === 'zh-CN' ? ['zh-Hans'] : ['zh-Hant'],
    missing: new Set(),
    /** Translations of interface texts, keyed by the text as written in the code. */
    add(lang, map) { Object.assign(dicts[lang] || (dicts[lang] = Object.create(null)), map); },
    has(lang, text) { return !!dicts[lang] && text in dicts[lang]; },
    /** Remember the choice and load the page again in it. The document comes back from the autosave. */
    set(lang) {
      if (lang === HE.lang || !LANGS.some((l) => l[0] === lang)) return;
      HE.settings.set('ui.lang', lang);
      window.location.reload();
    },
    /** The markup of index.html is written once, in Chinese: translate its texts and labels in place. The title
     *  and <html lang> are written in English there, for what reads the file before this runs. */
    applyStatic(root) {
      document.documentElement.lang = HTML_LANG[HE.lang] || HE.lang;
      document.title = HE.t('Tactile HTML 編輯器');
      if (HE.lang === 'zh-TW') return;
      for (const el of root.querySelectorAll('*')) {
        if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName)) continue;
        for (const a of ['aria-label', 'title', 'placeholder']) if (el.hasAttribute(a)) el.setAttribute(a, HE.t(el.getAttribute(a)));
        if (!el.children.length && el.textContent.trim()) el.textContent = HE.t(el.textContent.trim());
      }
    },
  };
  /**
   * t('已選取 {n} 個', {n: 3}): the text in the interface language, with {name} replaced from vars.
   * ctx tells two uses of one Chinese text apart where English needs two: t('位置', null, 'source') reads the
   * entry '位置|source', and the entry '位置' when there is none.
   */
  HE.t = function (text, vars, ctx) {
    let out = text;
    if (HE.lang !== 'zh-TW') {
      const d = dicts[HE.lang];
      const key = ctx ? text + '|' + ctx : text;
      if (d && key in d) out = d[key];
      else if (d && text in d) out = d[text];
      else if (/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/.test(text)) HE.i18n.missing.add(text);
    }
    return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
  };

  /* ------------------------------------------------------------------ */
  /* Keyboard shortcuts                                                  */
  /* ------------------------------------------------------------------ */

  const keys = (HE.keys = {
    map: new Map(),
    /** register('mod+z', fn, {inInputs:false, inModal:false, desc}) ; fn returns false to let the event through. */
    register(combo, fn, opts = {}) {
      for (const c of arr(combo)) {
        if (!this.map.has(c)) this.map.set(c, []);
        this.map.get(c).push({ fn, opts });
      }
    },
    handle(e) {
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return false;
      const combo = util.combo(e);
      const list = this.map.get(combo);
      if (!list) return false;
      // Plain Enter/Space on a focused control activates that control, not a shortcut.
      if ((combo === 'enter' || combo === 'space') && e.target && e.target.closest &&
        e.target.closest('button, summary, a[href], [role="button"], [role="treeitem"], [role="option"], [role="menuitem"], [role="tab"]')) return false;
      const typing = util.isTypingTarget(e.target);
      // While a dialog is open, shortcuts would act on the page behind it.
      const modal = !!root().querySelector('.modal-backdrop');
      let held = false;
      for (let i = list.length - 1; i >= 0; i--) {
        const { fn, opts } = list[i];
        if (typing && !opts.inInputs) continue;
        if (modal && !opts.inModal) { held = held || !!opts.inInputs; continue; }
        if (fn(e) !== false) { e.preventDefault(); e.stopPropagation(); return true; }
      }
      if (held) e.preventDefault(); // e.g. mod+S: no browser "save page" dialog over ours either
      return false;
    },
  });
  document.addEventListener('keydown', (e) => keys.handle(e));
  keys.register('mod+z', () => { history.undo(); });
  keys.register(['mod+shift+z', 'mod+y'], () => { history.redo(); });

  /* ------------------------------------------------------------------ */
  /* UI helpers                                                          */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    'file-plus': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 12v6M9 15h6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    save: '<path d="M4 6a2 2 0 0 1 2-2h10l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 4v4h7V4"/><path d="M7 20v-6h10v6"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    duplicate: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/><path d="M14.5 11.5v6M11.5 14.5h6"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
    paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 11h6M9 15h4"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    fold: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v2M12 9v2M12 14v2M12 19v1"/>',
    'fold-closed': '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M17 6.5l2.5 1.5v8l-2.5 1.5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    pointer: '<path d="M5 3l14 8-6 2-2 6z"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    motion: '<path d="M3 8h5M2 12h4M3 16h5"/><circle cx="15" cy="12" r="6"/><path d="M15 9v3l2 1.5"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    'plus-square': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7z"/><path d="M7 12h7a4 4 0 0 1 0 8H7z"/>',
    italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
    underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 20h16"/>',
    strike: '<path d="M16 6.5A4 4 0 0 0 12 4C9.5 4 8 5.5 8 7.5S10 10.5 12 11"/><path d="M4 12h16"/><path d="M8 17.5a4 4 0 0 0 4 2.5c2.5 0 4-1.5 4-3.5 0-1-.4-1.8-1-2.5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    unlink: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/><path d="M3 3l18 18"/>',
    'align-left': '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    'align-center': '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    'align-right': '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    'align-justify': '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    'list-ordered': '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4h1v4M4 8h2"/><path d="M4 14.5a1.5 1.5 0 0 1 3 0c0 1-3 2-3 3.5h3"/>',
    heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
    text: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
    button: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/>',
    minus: '<path d="M4 12h16"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    section: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h5"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5H3v8h4M14 21c3 0 7-1 7-8V5h-7v8h4"/>',
    code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-up': '<path d="m6 15 6-6 6 6"/>',
    'arrow-up': '<path d="M12 19V5M5 12l7-7 7 7"/>',
    'arrow-down': '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    outdent: '<path d="M21 5H11M21 12H11M21 19H11M7 8l-4 4 4 4"/>',
    indent: '<path d="M21 5H11M21 12H11M21 19H11M3 8l4 4-4 4"/>',
    parent: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v4M12 17.5v.5"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.5-4.5"/>',
    palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.4 3.4A1.3 1.3 0 0 1 12 21z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    wand: '<path d="m15 4 5 5L9 20l-5-5z"/><path d="m13 6 5 5"/><path d="M5 3v4M3 5h4M19 15v4M17 17h4"/>',
    wrap: '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    unwrap: '<rect x="8" y="8" width="8" height="8" rx="1"/><path d="M3 7V3h4M17 3h4v4M21 17v4h-4M7 21H3v-4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    'panel-left': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    'panel-right': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3z"/>',
    spacer: '<path d="M4 8v8M20 8v8M4 12h16"/>',
    'row-above': '<rect x="3" y="12" width="18" height="8" rx="1.5"/><path d="M12 3v6M9 6h6"/>',
    'row-below': '<rect x="3" y="4" width="18" height="8" rx="1.5"/><path d="M12 15v6M9 18h6"/>',
    'col-left': '<rect x="12" y="3" width="8" height="18" rx="1.5"/><path d="M3 12h6M6 9v6"/>',
    'col-right': '<rect x="4" y="3" width="8" height="18" rx="1.5"/><path d="M15 12h6M18 9v6"/>',
    'row-delete': '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M9.5 10.5l5 3M14.5 10.5l-5 3"/>',
    'col-delete': '<rect x="8" y="3" width="8" height="18" rx="1.5"/><path d="M10 9.5l4 5M14 9.5l-4 5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    move: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/>',
  };

  let layerRoot = null;
  function root() {
    if (!layerRoot) {
      layerRoot = document.getElementById('layer-root');
      if (!layerRoot) { layerRoot = document.createElement('div'); layerRoot.id = 'layer-root'; document.body.append(layerRoot); }
    }
    return layerRoot;
  }
  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function focusables(box) {
    return Array.from(box.querySelectorAll('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((n) => n.getClientRects().length > 0);
  }

  let openMenus = [];
  let statusTimer = null;
  let modalSeq = 0;

  const ui = (HE.ui = {
    h,
    icon(name, size = 16) {
      const p = ICONS[name] || ICONS.more;
      return '<svg class="ico" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
    },
    iconNames() { return Object.keys(ICONS); },

    /** Small transient message. opts: {type:'info'|'success'|'error', action:{label, fn}, timeout, sticky (stays until closed)} */
    toast(message, opts = {}) {
      let box = root().querySelector('.toasts');
      if (!box) { box = h('div', 'toasts'); box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); root().append(box); }
      const t = h('div', 'toast ' + (opts.type || 'info'));
      const msg = h('span', 'toast-msg');
      msg.textContent = message;
      t.append(msg);
      let timer;
      const close = () => { clearTimeout(timer); t.classList.add('out'); setTimeout(() => t.remove(), 180); };
      if (opts.action) {
        const b = h('button', 'btn sm ghost');
        b.type = 'button';
        b.textContent = opts.action.label;
        b.addEventListener('click', () => { close(); opts.action.fn(); });
        t.append(b);
      }
      const x = h('button', 'btn icon sm ghost', ui.icon('x', 14));
      x.type = 'button';
      x.setAttribute('aria-label', HE.t('關閉'));
      x.addEventListener('click', close);
      t.append(x);
      box.append(t);
      if (!opts.sticky) timer = setTimeout(close, opts.timeout || (opts.action ? 6000 : 3200));
      return { close };
    },

    /** Footer status line message (clears after a few seconds). */
    status(message) {
      const el = document.getElementById('status-msg');
      if (!el) return;
      el.textContent = message || '';
      clearTimeout(statusTimer);
      if (message) statusTimer = setTimeout(() => { el.textContent = ''; }, 4000);
    },

    /**
     * Modal dialog. body: Node or HTML string. actions: [{label, kind:'primary'|'danger'|'ghost', onClick(close) -> false keeps it open}]
     * Returns {el, body, close}.
     */
    modal(opts = {}) {
      const back = h('div', 'modal-backdrop');
      const m = h('div', 'modal');
      m.setAttribute('role', 'dialog');
      m.setAttribute('aria-modal', 'true');
      if (opts.width) m.style.width = 'min(' + opts.width + 'px, calc(100vw - 24px))';
      const head = h('div', 'modal-head');
      const title = h('h2', 'modal-title');
      title.textContent = opts.title || '';
      title.id = 'he-modal-title-' + (++modalSeq);
      m.setAttribute('aria-labelledby', title.id);
      const x = h('button', 'btn icon ghost', ui.icon('x'));
      x.type = 'button';
      x.setAttribute('aria-label', HE.t('關閉'));
      head.append(title, x);
      const body = h('div', 'modal-body');
      if (opts.body instanceof Node) body.append(opts.body); else if (opts.body != null) body.innerHTML = opts.body;
      m.append(head, body);
      let closed = false;
      const prevFocus = document.activeElement;
      const close = (result) => {
        if (closed) return;
        closed = true;
        back.remove();
        document.removeEventListener('keydown', onKey, true);
        if (opts.onClose) opts.onClose(result);
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* gone */ }
      };
      if (opts.actions && opts.actions.length) {
        const foot = h('div', 'modal-foot');
        for (const a of opts.actions) {
          const b = h('button', 'btn ' + (a.kind || ''));
          b.type = 'button';
          b.textContent = a.label;
          b.addEventListener('click', () => { if (!a.onClick || a.onClick(close) !== false) close(a.value); });
          foot.append(b);
        }
        m.append(foot);
      }
      const onKey = (e) => {
        if (e.isComposing || e.keyCode === 229) return; // Esc/Enter that ends an IME composition
        // Stacked modals: only the topmost one reacts.
        const all = root().querySelectorAll('.modal-backdrop');
        if (all[all.length - 1] !== back) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const p = m.querySelector('.modal-foot .btn.primary');
          if (p) { e.preventDefault(); p.click(); }
        } else if (e.key === 'Tab' && !m.contains(document.activeElement)) {
          const f = focusables(m);
          if (f.length) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); }
        }
      };
      // Keep Tab inside the dialog. Bubble phase, so a code textarea's own Tab (indent) goes first.
      m.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
        const f = focusables(m);
        if (!f.length) return;
        const a = document.activeElement;
        if (e.shiftKey ? a === f[0] : a === f[f.length - 1]) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); }
      });
      document.addEventListener('keydown', onKey, true);
      x.addEventListener('click', () => close());
      back.addEventListener('mousedown', (e) => { if (e.target === back && opts.dismissable !== false) close(); });
      back.append(m);
      root().append(back);
      setTimeout(() => {
        // Without a primary action (a danger confirm) focus starts on the safe choice (取消).
        const f = m.querySelector('[autofocus]') || body.querySelector('input, textarea, select') ||
          m.querySelector('.modal-foot .btn.primary') || m.querySelector('.modal-foot .btn.ghost');
        if (f) f.focus();
      }, 0);
      return { el: m, body, close };
    },

    confirm(message, opts = {}) {
      return new Promise((resolve) => {
        const body = h('p', 'modal-text');
        body.textContent = message;
        body.id = 'he-modal-text-' + (++modalSeq);
        const dlg = ui.modal({
          title: opts.title || HE.t('確認'),
          body,
          width: 420,
          onClose: (v) => resolve(v === true),
          actions: [
            { label: opts.cancelLabel || HE.t('取消'), kind: 'ghost', value: false },
            { label: opts.okLabel || HE.t('確定'), kind: opts.danger ? 'danger' : 'primary', value: true },
          ],
        });
        dlg.el.setAttribute('aria-describedby', body.id);
      });
    },

    prompt(message, opts = {}) {
      return new Promise((resolve) => {
        const wrap = h('div', 'field-stack');
        const lab = h('label', 'field-label');
        lab.textContent = message;
        const input = h(opts.multiline ? 'textarea' : 'input', opts.multiline ? 'textarea' : 'input');
        input.id = 'he-prompt-input';
        lab.htmlFor = input.id;
        if (!opts.multiline) input.type = 'text';
        input.value = opts.value || '';
        if (opts.placeholder) input.placeholder = opts.placeholder;
        if (opts.multiline) input.rows = opts.rows || 8;
        wrap.append(lab, input);
        let value = null;
        ui.modal({
          title: opts.title || HE.t('輸入'),
          body: wrap,
          width: opts.width || 460,
          onClose: () => resolve(value),
          actions: [
            { label: HE.t('取消'), kind: 'ghost' },
            { label: opts.okLabel || HE.t('確定'), kind: 'primary', onClick: () => { value = input.value; } },
          ],
        });
        if (!opts.multiline) {
          input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return; // Enter that picks an IME candidate
            value = input.value;
            e.preventDefault();
            input.closest('.modal').querySelector('.modal-foot .btn.primary').click();
          });
        }
      });
    },

    /**
     * Context/dropdown menu at page coords. items: [{label, icon, shortcut, disabled, danger, checked, onClick, children:[...]}, {separator:true}, {heading:'...'}]
     * Returns {close}.
     */
    menu(items, pos = {}) {
      ui.closeMenus();
      // Choosing an item or Esc removes the focused menu item: focus goes back to what had it when the menu
      // opened (the menu button), so a dialog the item opens also returns focus there.
      const opener = document.activeElement;
      const refocus = () => {
        const a = document.activeElement;
        if ((a && a !== document.body) || !opener || opener === document.body || !opener.isConnected || !opener.focus) return;
        try { opener.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
      };
      const build = (list, x, y, level) => {
        const m = h('div', 'menu');
        m.setAttribute('role', 'menu');
        m.dataset.level = level;
        for (const it of list) {
          if (!it) continue;
          if (it.separator) { m.append(h('div', 'menu-sep')); continue; }
          if (it.heading) { const hd = h('div', 'menu-heading'); hd.textContent = it.heading; m.append(hd); continue; }
          const b = h('button', 'menu-item' + (it.danger ? ' danger' : ''));
          b.type = 'button';
          b.setAttribute('role', 'menuitem');
          // A boolean `checked` is a choice: announce its state, not only the check mark.
          if (typeof it.checked === 'boolean') { b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(it.checked)); }
          b.disabled = !!it.disabled;
          b.innerHTML = '<span class="mi-icon">' + (it.checked ? ui.icon('check', 15) : it.icon ? ui.icon(it.icon, 15) : '') + '</span>' +
            '<span class="mi-label"></span>' +
            (it.shortcut ? '<span class="mi-kbd">' + util.esc(ui.kbd(it.shortcut)) + '</span>' : '') +
            (it.children ? '<span class="mi-sub">' + ui.icon('chevron-right', 14) + '</span>' : '');
          b.querySelector('.mi-label').textContent = it.label;
          if (it.children) {
            const openSub = () => {
              openMenus.filter((om) => +om.dataset.level > level).forEach((om) => om.remove());
              openMenus = openMenus.filter((om) => +om.dataset.level <= level);
              const r = b.getBoundingClientRect();
              build(it.children, r.right - 2, r.top - 4, level + 1);
            };
            b.addEventListener('mouseenter', openSub);
            b.addEventListener('click', openSub);
          } else {
            b.addEventListener('mouseenter', () => {
              openMenus.filter((om) => +om.dataset.level > level).forEach((om) => om.remove());
              openMenus = openMenus.filter((om) => +om.dataset.level <= level);
            });
            b.addEventListener('click', () => { ui.closeMenus(); refocus(); if (it.onClick) it.onClick(); });
          }
          m.append(b);
        }
        root().append(m);
        const r = m.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        let left = x, top = y;
        if (left + r.width > vw - 6) left = level > 0 ? Math.max(6, x - r.width - 180) : Math.max(6, vw - r.width - 6);
        if (top + r.height > vh - 6) top = Math.max(6, vh - r.height - 6);
        m.style.left = left + 'px';
        m.style.top = top + 'px';
        openMenus.push(m);
        return m;
      };
      const first = build(items, pos.x || 0, pos.y || 0, 0);
      const firstBtn = first.querySelector('.menu-item:not(:disabled)');
      if (firstBtn && pos.focus !== false) firstBtn.focus({ preventScroll: true });
      first.addEventListener('keydown', (e) => {
        if (e.isComposing || e.keyCode === 229) return;
        const btns = Array.from(first.querySelectorAll('.menu-item:not(:disabled)'));
        const i = btns.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (btns[i + 1] || btns[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (btns[i - 1] || btns[btns.length - 1]).focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ui.closeMenus(); refocus(); }
      });
      return { close: ui.closeMenus, el: first };
    },
    closeMenus() { openMenus.forEach((m) => m.remove()); openMenus = []; },
    menuOpen() { return openMenus.length > 0; },

    /** "mod+shift+z" -> "Ctrl+Shift+Z" (⌘⇧Z on macOS) */
    kbd(combo) {
      const mac = HE.env.isMac;
      return String(combo).split('+').map((p) => {
        if (p === 'mod') return mac ? '⌘' : 'Ctrl';
        if (p === 'shift') return mac ? '⇧' : 'Shift';
        if (p === 'alt') return mac ? '⌥' : 'Alt';
        if (p === 'delete') return 'Del';
        if (p === 'escape') return 'Esc';
        if (p === 'up') return '↑';
        if (p === 'down') return '↓';
        if (p === 'left') return '←';
        if (p === 'right') return '→';
        return p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1);
      }).join(mac ? '' : '+');
    },

    /** Show one pane of a [data-tabs] group. */
    showTab(group, name) {
      const g = document.querySelector('[data-tabs="' + group + '"]');
      if (!g) return;
      g.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
      g.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== name; });
      HE.emit('tab:changed', { group, name });
    },
    currentTab(group) {
      const b = document.querySelector('[data-tabs="' + group + '"] [data-tab][aria-selected="true"]');
      return b ? b.dataset.tab : null;
    },
  });

  window.addEventListener('blur', () => ui.closeMenus());
  document.addEventListener('mousedown', (e) => {
    if (openMenus.length && !e.target.closest('.menu')) ui.closeMenus();
  }, true);
})();
