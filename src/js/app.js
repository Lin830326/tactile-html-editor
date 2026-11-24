/* Tactile — app.js: boots the shell once every module file has loaded. */
(function () {
  'use strict';
  const HE = window.HE;
  const t = HE.t;
  // fx first: its history closer must be registered before any document loads or edits.
  const MODULES = ['fx', 'canvas', 'layers', 'insert', 'inspector', 'contextmenu', 'ai', 'fileio', 'prov', 'pages', 'island'];

  function wireTabs() {
    document.querySelectorAll('[data-tabs]').forEach((group) => {
      group.querySelectorAll('[data-tab]').forEach((btn) => {
        btn.addEventListener('click', () => HE.ui.showTab(group.dataset.tabs, btn.dataset.tab));
      });
    });
    const saved = HE.settings.get('tabs', {});
    for (const [g, name] of Object.entries(saved)) {
      if (document.querySelector('[data-tabs="' + g + '"] [data-tab="' + name + '"]')) HE.ui.showTab(g, name);
    }
    HE.on('tab:changed', ({ group, name }) => {
      const all = HE.settings.get('tabs', {});
      all[group] = name;
      HE.settings.set('tabs', all);
    });
  }

  function wireHistoryButtons() {
    const undo = document.getElementById('btn-undo');
    const redo = document.getElementById('btn-redo');
    undo.innerHTML = HE.ui.icon('undo');
    redo.innerHTML = HE.ui.icon('redo');
    undo.addEventListener('click', () => HE.history.undo());
    redo.addEventListener('click', () => HE.history.redo());
    const sync = (s) => {
      undo.disabled = !s.canUndo;
      redo.disabled = !s.canRedo;
      undo.title = s.canUndo ? t('復原：{label}（{key}）', { label: s.undoLabel, key: HE.ui.kbd('mod+z') }) : t('復原');
      redo.title = s.canRedo ? t('重做：{label}（{key}）', { label: s.redoLabel, key: HE.ui.kbd('mod+shift+z') }) : t('重做');
    };
    HE.on('history:changed', sync);
    sync({ canUndo: false, canRedo: false });
  }

  function wireDocName() {
    const input = document.getElementById('doc-name');
    HE.on('doc:named', ({ name }) => { if (document.activeElement !== input) input.value = name; });
    const commit = () => { HE.doc.setName(input.value); input.value = HE.doc.name; };
    input.addEventListener('change', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { commit(); input.blur(); } });
    input.value = HE.doc.name;
  }

  function wireDrawers() {
    const app = document.getElementById('app');
    const left = document.getElementById('btn-drawer-left');
    const right = document.getElementById('btn-drawer-right');
    left.innerHTML = HE.ui.icon('panel-left');
    right.innerHTML = HE.ui.icon('panel-right');
    const toggle = (side) => { app.dataset.drawer = app.dataset.drawer === side ? '' : side; };
    left.addEventListener('click', () => toggle('left'));
    right.addEventListener('click', () => toggle('right'));
    const close = () => { if (app.dataset.drawer) app.dataset.drawer = ''; };
    document.getElementById('stage').addEventListener('pointerdown', close);
    // Taps on the page go to the canvas iframe's own window and never reach #stage.
    HE.on('canvas:ready', (p) => {
      const d = (p && p.doc) || HE.live.doc;
      const win = d && d.defaultView;
      if (win) win.addEventListener('pointerdown', close, true);
    });
    // Opening a tab programmatically (e.g. "Ask AI" from a menu) reveals its drawer on narrow screens.
    // Registered after wireTabs() restored the saved tabs, so start-up does not pop a drawer open.
    HE.on('tab:changed', ({ group }) => {
      if (window.matchMedia('(max-width: 900px)').matches) app.dataset.drawer = group;
    });
  }

  /** A button that names the interface language and opens the list of languages, each named in itself. */
  function wireLanguage() {
    const bar = document.getElementById('toolbar-right');
    const now = HE.i18n.langs.find((l) => l[0] === HE.lang);
    if (!bar || !now) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'btn-lang';
    b.className = 'btn ghost';
    b.innerHTML = '<span></span>' + HE.ui.icon('chevron-down', 12);
    b.firstChild.textContent = now[1];
    b.title = t('切換介面語言（頁面會重新載入）');
    b.setAttribute('aria-label', b.title);
    b.setAttribute('aria-haspopup', 'menu');
    b.addEventListener('click', () => {
      const r = b.getBoundingClientRect();
      HE.ui.menu(HE.i18n.langs.map((l) => ({ label: l[1], checked: l[0] === HE.lang, onClick: () => HE.i18n.set(l[0]) })), { x: r.left, y: r.bottom + 4 });
    });
    bar.append(b);
  }

  function init() {
    HE.i18n.applyStatic(document.getElementById('app'));
    wireTabs();
    wireHistoryButtons();
    wireDocName();
    wireDrawers();
    wireLanguage();
    for (const name of MODULES) {
      const mod = HE[name];
      if (mod && typeof mod.init === 'function') {
        try { mod.init(); } catch (err) { console.error('[HE] init of ' + name + ' failed:', err); }
      } else {
        console.warn('[HE] module missing:', name);
      }
    }
    HE.settings.keys(); // reads the stored settings, which is when a stored key is found
    if (HE.settings.removedStoredSecrets) {
      HE.ui.toast(t('已經把 AI 金鑰從瀏覽器的儲存空間移除。從磁碟開啟編輯器時，其他從磁碟開啟的網頁也讀得到那裡的資料。金鑰在這個分頁仍然可以用；關閉或重新載入後必須重新輸入。'), { sticky: true });
    }
    if (HE.fileio && HE.fileio.boot) HE.fileio.boot();
    else HE.doc.load('<!doctype html><html><head><meta charset="utf-8"><title>Untitled</title></head><body><h1>Hello</h1></body></html>', { name: 'untitled.html', trusted: true });
    document.documentElement.setAttribute('data-he-mode', HE.mode);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
