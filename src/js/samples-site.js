/* Tactile — samples-site.js: one starter document in three languages, a small site with several pages in one file.
 *
 * It shows two things together: pages that a navigation bar switches between (HE.pages) and a floating island with a
 * help panel and a report link (HE.island). Neither needs script. The magazine, its people, events and figures are
 * made up, and the address is example.com: the island's section in the Design panel reminds the user to change it.
 * Each is a test case of tests/templates.spec.js as well.
 *
 * The <style data-he-style="pages"> and "island" blocks were written by the editor itself (HE.pages.sync and
 * HE.island.sync), not by hand. When the editor's CSS changes, run `node build.mjs && node tools/resync-templates.mjs`:
 * it writes each template back as the editor now keeps it (tests/templates.spec.js fails until then).
 */
(function () {
  'use strict';

  /* 網站：多頁面網站 */
  const SITE = `<!DOCTYPE html>
<html lang="zh-Hant"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>山線通訊</title>
<style>
  :root { --paper: #faf6ef; --ink: #23302c; --deep: #1f3a34; --accent: #b4532a; --sand: #efe6d6; --line: #dccfb8; --muted: #55635e; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.75 "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
  a { color: inherit; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 40px); }

  .top { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; padding: 14px clamp(20px, 5vw, 40px); background: rgb(250 246 239 / .94); border-bottom: 1px solid var(--line); }
  .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: .02em; text-decoration: none; color: var(--deep); }
  .mark { width: 26px; height: 26px; border-radius: 8px 8px 8px 2px; background: linear-gradient(135deg, var(--accent), #d98a4e); }
  .top .tpg-nav { margin: 0; padding: 0; border: 0; gap: 4px 6px; font-size: 16px; }
  .top .tpg-nav a { padding: 6px 14px; border-radius: 999px; }
  .top .tpg-nav a:hover { background: var(--sand); }

  .hero { padding: clamp(48px, 9vw, 104px) 0 clamp(36px, 6vw, 64px); }
  .kicker { margin: 0 0 14px; font-size: 14px; font-weight: 700; letter-spacing: .14em; color: var(--accent); }
  h1 { margin: 0 0 18px; font-size: clamp(34px, 6.4vw, 64px); line-height: 1.16; letter-spacing: -.01em; color: var(--deep); }
  h2 { margin: 0 0 10px; font-size: clamp(22px, 3vw, 28px); line-height: 1.3; color: var(--deep); }
  h3 { margin: 0 0 6px; font-size: 19px; line-height: 1.4; color: var(--deep); }
  .lead { max-width: 40em; margin: 0 0 28px; font-size: clamp(18px, 2.2vw, 21px); color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .btn { display: inline-block; padding: 12px 22px; border-radius: 999px; background: var(--deep); color: #fff; font-weight: 700; text-decoration: none; }
  .btn.ghost { background: transparent; color: var(--deep); box-shadow: inset 0 0 0 2px var(--deep); }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin: 0 0 clamp(40px, 6vw, 72px); }
  .card { display: flex; flex-direction: column; padding: 22px 24px 24px; border: 1px solid var(--line); border-radius: 18px; background: #fff; }
  .card p { margin: 0 0 14px; color: var(--muted); font-size: 16px; }
  .card .more { margin-top: auto; font-weight: 700; color: var(--accent); text-decoration: none; }
  .art { height: 132px; margin: -22px -24px 18px; border-radius: 17px 17px 0 0; }
  .art.a { background: linear-gradient(135deg, #1f3a34, #3f7a68 60%, #d9c9a3); }
  .art.b { background: linear-gradient(135deg, #b4532a, #e0a15f 70%, #f3e2bf); }
  .art.c { background: linear-gradient(135deg, #2d4f6b, #6a9ab0 60%, #e9dcc3); }

  .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 clamp(40px, 6vw, 72px); padding: 22px; border-radius: 18px; background: var(--deep); color: #fff; text-align: center; }
  .facts b { display: block; font-size: clamp(26px, 4.4vw, 40px); line-height: 1.2; }
  .facts span { font-size: 15px; color: #d6e2dd; }

  .page-head { padding: clamp(36px, 6vw, 64px) 0 8px; }
  .page-head h1 { font-size: clamp(30px, 5vw, 48px); }
  .story { display: grid; grid-template-columns: 150px 1fr; gap: 6px 28px; padding: 26px 0; border-top: 1px solid var(--line); }
  .story .meta { margin: 0; font-size: 15px; color: var(--muted); }
  .story .tag { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; background: var(--sand); color: var(--deep); font-size: 14px; font-weight: 700; }
  .story p { margin: 0; color: var(--muted); }
  .stories { margin: 0 0 clamp(40px, 6vw, 72px); border-bottom: 1px solid var(--line); }

  .col { display: grid; grid-template-columns: 64px 1fr; gap: 0 20px; padding: 24px; margin: 0 0 20px; border-radius: 18px; background: #fff; border: 1px solid var(--line); }
  .avatar { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--deep); color: #fff; font-size: 24px; font-weight: 800; }
  .col .who { margin: 0 0 10px; font-size: 15px; color: var(--muted); }
  .col p { margin: 0 0 12px; }
  blockquote { margin: 0; padding: 4px 0 4px 16px; border-left: 4px solid var(--accent); color: var(--deep); font-size: 18px; font-weight: 600; }
  .cols { margin: 0 0 clamp(40px, 6vw, 72px); }

  table { width: 100%; border-collapse: collapse; margin: 0 0 28px; background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
  th, td { padding: 14px 18px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
  th { background: var(--sand); color: var(--deep); font-size: 15px; }
  tr:last-child td { border-bottom: 0; }
  td small { display: block; font-size: 15px; color: var(--muted); }
  .seats { white-space: nowrap; font-weight: 700; color: var(--accent); }
  .info { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin: 0 0 28px; }
  .info div { padding: 20px 22px; border-radius: 18px; background: var(--sand); }
  .info p { margin: 0; color: var(--ink); font-size: 16px; }
  .visit { margin: 0 0 clamp(40px, 6vw, 72px); }

  .foot { padding: 28px 0 104px; border-top: 1px solid var(--line); color: var(--muted); font-size: 15px; }
  .foot p { margin: 0; }
  /* A link to a page scrolls to it: leave room for the bar that stays at the top. */
  .tpg-page { scroll-margin-top: 140px; }
  .tfi { font-family: inherit; }

  @media (max-width: 640px) {
    body { font-size: 16px; }
    .story { grid-template-columns: 1fr; }
    .col { grid-template-columns: 1fr; gap: 14px; }
    .facts { grid-template-columns: 1fr; }
    th, td { padding: 12px; }
  }
</style>
<style data-he-style="pages">/* Tactile 多頁面：依文件中 data-tpg 裡的頁面自動產生，請在編輯器的「頁面」分頁修改。 */
:where(.tpg-nav) { display: flex; flex-wrap: wrap; gap: .25em 1.25em; margin: 0 0 1.5rem; padding: .75em clamp(16px, 4vw, 40px); border-bottom: 1px solid rgb(127 127 127 / .3); }
:where(.tpg-nav a) { color: inherit; text-decoration: none; }
.tpg > .tpg-page { display: none; }
.tpg > .tpg-page:target { display: block; }
.tpg:not(:has(> .tpg-page:target)) > .tpg-page:not(.tpg-page ~ .tpg-page) { display: block; }
@supports not selector(:has(*)) { .tpg > .tpg-page { display: block; } }
@media print { .tpg > .tpg-page { display: block; } .tpg > .tpg-page ~ .tpg-page { break-before: page; } [data-tpg-nav] { display: none !important; } }
:root:not(:has(.tpg > .tpg-page:target)) [data-tpg-nav] a[href="#home"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#home:target) [data-tpg-nav] a[href="#home"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#stories:target) [data-tpg-nav] a[href="#stories"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#columns:target) [data-tpg-nav] a[href="#columns"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#visit:target) [data-tpg-nav] a[href="#visit"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }</style><style data-he-style="island">/* Tactile 浮動島：依文件中 data-tfi 的元素自動產生，請在編輯器選取浮動島後，在「設計」分頁修改。 */
[data-tfi] { position: fixed; z-index: 1000; inset: auto calc(16px + env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; box-sizing: border-box; max-width: calc(100vw - 32px); margin: 0; }
[data-tfi] [data-tfi-panel] { position: fixed; inset: auto calc(16px + env(safe-area-inset-right, 0px)) calc(76px + env(safe-area-inset-bottom, 0px)) auto; box-sizing: border-box; width: min(360px, calc(100vw - 32px)); max-height: 70vh; margin: 0; overflow: auto; }
[data-tfi] .tfi-btn { background: var(--tfi-bg, #1f2328); color: var(--tfi-ink, #fff); text-decoration: none; }
[data-tfi] [data-tfi-panel] { background: #fff; color: #1f2328; }
[data-tfi] [data-tfi-panel] :where(h1, h2, h3, h4, h5, h6, p, li, strong, em, small, span) { color: inherit; }
[data-tfi][data-tfi-pos="bl"] { inset: auto auto calc(16px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
[data-tfi][data-tfi-pos="bl"] [data-tfi-panel] { inset: auto auto calc(76px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px)); }
[data-tfi][data-tfi-pos="tr"] { inset: calc(16px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) auto auto; justify-content: flex-end; }
[data-tfi][data-tfi-pos="tr"] [data-tfi-panel] { inset: calc(76px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) auto auto; }
[data-tfi][data-tfi-pos="tl"] { inset: calc(16px + env(safe-area-inset-top, 0px)) auto auto calc(16px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
[data-tfi][data-tfi-pos="tl"] [data-tfi-panel] { inset: calc(76px + env(safe-area-inset-top, 0px)) auto auto calc(16px + env(safe-area-inset-left, 0px)); }
:where(.tfi) { font: 500 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
:where(.tfi-btn) { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px; padding: 0 18px; border: 1px solid rgb(127 127 127 / .35); border-radius: 999px; box-shadow: 0 4px 16px rgb(0 0 0 / .2); font: inherit; white-space: nowrap; cursor: pointer; }
:where(.tfi-panel) { padding: 16px 20px; border: 1px solid rgb(127 127 127 / .35); border-radius: 16px; box-shadow: 0 12px 40px rgb(0 0 0 / .25); font-size: 15px; font-weight: 400; line-height: 1.6; }
:where(.tfi-panel) > :where(:first-child) { margin-top: 0; }
:where(.tfi-panel) > :where(:last-child) { margin-bottom: 0; }
@supports (anchor-name: --a) { [data-tfi] { anchor-name: --tfi; } [data-tfi] [data-tfi-panel] { position-anchor: --tfi; } [data-tfi] [data-tfi-panel] { inset: auto anchor(right) calc(anchor(top) + 12px) auto; } [data-tfi][data-tfi-pos="bl"] [data-tfi-panel] { inset: auto auto calc(anchor(top) + 12px) anchor(left); } [data-tfi][data-tfi-pos="tr"] [data-tfi-panel] { inset: calc(anchor(bottom) + 12px) anchor(right) auto auto; } [data-tfi][data-tfi-pos="tl"] [data-tfi-panel] { inset: calc(anchor(bottom) + 12px) auto auto anchor(left); } }
:root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after { content: ""; display: block; height: calc(88px + env(safe-area-inset-bottom, 0px)); }
@media print { [data-tfi] { display: none; } :root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after { display: none; } }
@supports not selector(:popover-open) { [data-tfi-panel] { display: none; } }</style></head>
<body>
<header class="top">
  <a class="brand" href="#home"><span class="mark"></span>山線通訊</a>
  <nav class="tpg-nav" data-tpg-nav="" aria-label="頁面"><a href="#home">首頁</a><a href="#stories">報導</a><a href="#columns">專欄</a><a href="#visit">體驗</a></nav>
</header>

<div class="tpg" data-tpg="">
  <section class="tpg-page" id="home" data-tpg-title="首頁">
    <div class="wrap">
      <div class="hero">
        <p class="kicker">2026 冬季號 · 第 24 期</p>
        <h1>沿著山線，把小鎮的日常寫下來</h1>
        <p class="lead">山線通訊是一份社區刊物，每季出刊 1 次。我們採訪鎮上的店家、農友與職人，也邀請讀者一起走進現場。</p>
        <div class="actions"><a class="btn" href="#stories">看最新報導</a><a class="btn ghost" href="#visit">報名體驗活動</a></div>
      </div>
      <div class="grid">
        <article class="card"><div class="art a"></div><h3>最新報導</h3><p>老車站旁的豆腐店傳到第三代，清晨 4 點開工，一天只做 120 板。</p><a class="more" href="#stories">看全部報導 →</a></article>
        <article class="card"><div class="art b"></div><h3>本月專欄</h3><p>3 位專欄作者，寫山路、寫市場，也寫一張餐桌上的四季。</p><a class="more" href="#columns">讀專欄 →</a></article>
        <article class="card"><div class="art c"></div><h3>體驗活動</h3><p>12 月有採茶、木工與市場導覽 3 場活動，每場名額 12 到 20 人。</p><a class="more" href="#visit">看場次與名額 →</a></article>
      </div>
      <div class="facts">
        <p><b>2019</b><span>創刊年份</span></p>
        <p><b>24</b><span>已出刊期數</span></p>
        <p><b>37</b><span>撰稿與攝影夥伴</span></p>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="stories" data-tpg-title="報導">
    <div class="wrap">
      <div class="page-head"><p class="kicker">報導</p><h1>這一季，我們去了這些地方</h1><p class="lead">每篇報導都由編輯部實地採訪。點選上方的導覽列，可以回到首頁或看其他頁面。</p></div>
      <div class="stories">
        <article class="story"><p class="meta"><span class="tag">人物</span><br>2026 年 11 月 28 日<br>文／林佳穎</p><div><h2>凌晨 4 點的豆腐店</h2><p>車站旁的老店不接網路訂單。第三代老闆說，豆腐要當天賣完，才對得起早起的客人。</p></div></article>
        <article class="story"><p class="meta"><span class="tag">產業</span><br>2026 年 11 月 14 日<br>文／陳柏翰</p><div><h2>茶園裡的新手</h2><p>5 位返鄉青年合租 2 公頃茶園。第 1 年收成只有預期的六成，他們決定把過程全部公開。</p></div></article>
        <article class="story"><p class="meta"><span class="tag">交通</span><br>2026 年 10 月 30 日<br>文／張雅婷</p><div><h2>末班車之後</h2><p>末班車晚上 9 點 12 分離站。我們記錄了 1 個週五夜晚，看居民怎麼回家。</p></div></article>
        <article class="story"><p class="meta"><span class="tag">教育</span><br>2026 年 10 月 16 日<br>文／吳承恩</p><div><h2>只有 31 個學生的小學</h2><p>全校 6 個班、31 位學生。老師把整座山當成教室，自然課在溪邊上。</p></div></article>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="columns" data-tpg-title="專欄">
    <div class="wrap">
      <div class="page-head"><p class="kicker">專欄</p><h1>3 位作者，3 種看小鎮的方式</h1><p class="lead">專欄每期更新，作者的意見不代表編輯部的立場。</p></div>
      <div class="cols">
        <article class="col"><div class="avatar" aria-hidden="true">周</div><div><h2>山路筆記</h2><p class="who">周明哲 · 登山嚮導</p><p>入冬後的第 1 場霧來得比往年早。稜線上的芒草白了一半，下山的路要多留 40 分鐘。</p><blockquote>走得慢，才看得見路邊的東西。</blockquote></div></article>
        <article class="col"><div class="avatar" aria-hidden="true">許</div><div><h2>市場裡的算術</h2><p class="who">許雅雯 · 菜攤第二代</p><p>高麗菜 1 顆 35 元，客人殺到 30 元。這 5 元的來回，其實是每天早上的問候。</p><blockquote>價錢談的是菜，聊的是日子。</blockquote></div></article>
        <article class="col"><div class="avatar" aria-hidden="true">蔡</div><div><h2>一張餐桌的四季</h2><p class="who">蔡宜君 · 料理人</p><p>冬天的餐桌少不了蘿蔔。這個月寫 3 種做法：清燉、醃漬，還有外婆的蘿蔔糕。</p><blockquote>當季的菜不需要太多調味。</blockquote></div></article>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="visit" data-tpg-title="體驗">
    <div class="wrap">
      <div class="page-head"><p class="kicker">體驗</p><h1>12 月的 3 場體驗活動</h1><p class="lead">活動由在地職人帶領，每場都有名額上限。請先來信報名，我們會回覆確認。</p></div>
      <div class="visit">
        <table>
          <thead><tr><th>日期</th><th>活動</th><th>名額</th></tr></thead>
          <tbody>
            <tr><td>12 月 6 日（日）</td><td>冬茶採收半日體驗<small>上午 8 點，山腰茶園集合</small></td><td class="seats">剩 5 位</td></tr>
            <tr><td>12 月 13 日（日）</td><td>木工入門：做 1 張小板凳<small>下午 1 點 30 分，舊穀倉工坊</small></td><td class="seats">剩 3 位</td></tr>
            <tr><td>12 月 20 日（日）</td><td>清晨市場導覽<small>上午 6 點，車站前廣場集合</small></td><td class="seats">剩 11 位</td></tr>
          </tbody>
        </table>
        <div class="info">
          <div><h3>怎麼報名</h3><p>來信寫上場次、人數與聯絡電話。我們在 2 個工作天內回覆。</p></div>
          <div><h3>費用</h3><p>每場每人 600 元，含材料與保險。12 歲以下半價。</p></div>
          <div><h3>交通</h3><p>搭火車到山線站，出站後步行 8 分鐘。現場沒有停車位。</p></div>
        </div>
        <div class="actions"><a class="btn" href="mailto:hello@example.com">來信報名</a><a class="btn ghost" href="#home">回首頁</a></div>
      </div>
    </div>
  </section>
</div>

<footer class="foot"><div class="wrap"><p>© 2026 山線通訊。這是示範用的範本，刊物、人物、活動與數字都是虛構的。</p></div></footer>

<div class="tfi" data-tfi="" data-tfi-pos="br" role="group" aria-label="快速功能" style="--tfi-bg: #1f3a34; --tfi-ink: #ffffff"><button class="tfi-btn" type="button" popovertarget="tfi-panel-1">小幫手</button><a class="tfi-btn" href="mailto:hello@example.com">問題回報</a><div class="tfi-panel" id="tfi-panel-1" popover="" data-tfi-panel=""><h3>常見問題</h3><p><strong>多久出刊 1 次？</strong><br>每季 1 次，3、6、9、12 月的第 1 週。</p><p><strong>可以投稿嗎？</strong><br>可以。請按「問題回報」來信，附上 300 字以內的構想。</p><p><strong>活動可以取消嗎？</strong><br>活動 3 天前來信取消，全額退費。</p></div></div>



</body></html>`;

  /* Website: Multi-page site */
  const SITE_EN = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ridgeline Post</title>
<style>
  :root { --paper: #faf6ef; --ink: #23302c; --deep: #1f3a34; --accent: #b4532a; --sand: #efe6d6; --line: #dccfb8; --muted: #55635e; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.75 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; -webkit-text-size-adjust: 100%; }
  a { color: inherit; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 40px); }

  .top { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; padding: 14px clamp(20px, 5vw, 40px); background: rgb(250 246 239 / .94); border-bottom: 1px solid var(--line); }
  .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: .02em; text-decoration: none; color: var(--deep); }
  .mark { width: 26px; height: 26px; border-radius: 8px 8px 8px 2px; background: linear-gradient(135deg, var(--accent), #d98a4e); }
  .top .tpg-nav { margin: 0; padding: 0; border: 0; gap: 4px 6px; font-size: 16px; }
  .top .tpg-nav a { padding: 6px 14px; border-radius: 999px; }
  .top .tpg-nav a:hover { background: var(--sand); }

  .hero { padding: clamp(48px, 9vw, 104px) 0 clamp(36px, 6vw, 64px); }
  .kicker { margin: 0 0 14px; font-size: 14px; font-weight: 700; letter-spacing: .14em; color: var(--accent); }
  h1 { margin: 0 0 18px; font-size: clamp(34px, 6.4vw, 64px); line-height: 1.16; letter-spacing: -.01em; color: var(--deep); }
  h2 { margin: 0 0 10px; font-size: clamp(22px, 3vw, 28px); line-height: 1.3; color: var(--deep); }
  h3 { margin: 0 0 6px; font-size: 19px; line-height: 1.4; color: var(--deep); }
  .lead { max-width: 40em; margin: 0 0 28px; font-size: clamp(18px, 2.2vw, 21px); color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .btn { display: inline-block; padding: 12px 22px; border-radius: 999px; background: var(--deep); color: #fff; font-weight: 700; text-decoration: none; }
  .btn.ghost { background: transparent; color: var(--deep); box-shadow: inset 0 0 0 2px var(--deep); }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin: 0 0 clamp(40px, 6vw, 72px); }
  .card { display: flex; flex-direction: column; padding: 22px 24px 24px; border: 1px solid var(--line); border-radius: 18px; background: #fff; }
  .card p { margin: 0 0 14px; color: var(--muted); font-size: 16px; }
  .card .more { margin-top: auto; font-weight: 700; color: var(--accent); text-decoration: none; }
  .art { height: 132px; margin: -22px -24px 18px; border-radius: 17px 17px 0 0; }
  .art.a { background: linear-gradient(135deg, #1f3a34, #3f7a68 60%, #d9c9a3); }
  .art.b { background: linear-gradient(135deg, #b4532a, #e0a15f 70%, #f3e2bf); }
  .art.c { background: linear-gradient(135deg, #2d4f6b, #6a9ab0 60%, #e9dcc3); }

  .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 clamp(40px, 6vw, 72px); padding: 22px; border-radius: 18px; background: var(--deep); color: #fff; text-align: center; }
  .facts b { display: block; font-size: clamp(26px, 4.4vw, 40px); line-height: 1.2; }
  .facts span { font-size: 15px; color: #d6e2dd; }

  .page-head { padding: clamp(36px, 6vw, 64px) 0 8px; }
  .page-head h1 { font-size: clamp(30px, 5vw, 48px); }
  .story { display: grid; grid-template-columns: 150px 1fr; gap: 6px 28px; padding: 26px 0; border-top: 1px solid var(--line); }
  .story .meta { margin: 0; font-size: 15px; color: var(--muted); }
  .story .tag { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; background: var(--sand); color: var(--deep); font-size: 14px; font-weight: 700; }
  .story p { margin: 0; color: var(--muted); }
  .stories { margin: 0 0 clamp(40px, 6vw, 72px); border-bottom: 1px solid var(--line); }

  .col { display: grid; grid-template-columns: 64px 1fr; gap: 0 20px; padding: 24px; margin: 0 0 20px; border-radius: 18px; background: #fff; border: 1px solid var(--line); }
  .avatar { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--deep); color: #fff; font-size: 24px; font-weight: 800; }
  .col .who { margin: 0 0 10px; font-size: 15px; color: var(--muted); }
  .col p { margin: 0 0 12px; }
  blockquote { margin: 0; padding: 4px 0 4px 16px; border-left: 4px solid var(--accent); color: var(--deep); font-size: 18px; font-weight: 600; }
  .cols { margin: 0 0 clamp(40px, 6vw, 72px); }

  table { width: 100%; border-collapse: collapse; margin: 0 0 28px; background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
  th, td { padding: 14px 18px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
  th { background: var(--sand); color: var(--deep); font-size: 15px; }
  tr:last-child td { border-bottom: 0; }
  td small { display: block; font-size: 15px; color: var(--muted); }
  .seats { white-space: nowrap; font-weight: 700; color: var(--accent); }
  .info { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin: 0 0 28px; }
  .info div { padding: 20px 22px; border-radius: 18px; background: var(--sand); }
  .info p { margin: 0; color: var(--ink); font-size: 16px; }
  .visit { margin: 0 0 clamp(40px, 6vw, 72px); }

  .foot { padding: 28px 0 104px; border-top: 1px solid var(--line); color: var(--muted); font-size: 15px; }
  .foot p { margin: 0; }
  /* A link to a page scrolls to it: leave room for the bar that stays at the top. */
  .tpg-page { scroll-margin-top: 140px; }
  .tfi { font-family: inherit; }

  @media (max-width: 640px) {
    body { font-size: 16px; }
    .story { grid-template-columns: 1fr; }
    .col { grid-template-columns: 1fr; gap: 14px; }
    .facts { grid-template-columns: 1fr; }
    th, td { padding: 12px; }
  }
</style>
<style data-he-style="pages">/* Tactile pages: generated from the pages inside data-tpg. Change them in the editor, under Pages. */
:where(.tpg-nav) { display: flex; flex-wrap: wrap; gap: .25em 1.25em; margin: 0 0 1.5rem; padding: .75em clamp(16px, 4vw, 40px); border-bottom: 1px solid rgb(127 127 127 / .3); }
:where(.tpg-nav a) { color: inherit; text-decoration: none; }
.tpg > .tpg-page { display: none; }
.tpg > .tpg-page:target { display: block; }
.tpg:not(:has(> .tpg-page:target)) > .tpg-page:not(.tpg-page ~ .tpg-page) { display: block; }
@supports not selector(:has(*)) { .tpg > .tpg-page { display: block; } }
@media print { .tpg > .tpg-page { display: block; } .tpg > .tpg-page ~ .tpg-page { break-before: page; } [data-tpg-nav] { display: none !important; } }
:root:not(:has(.tpg > .tpg-page:target)) [data-tpg-nav] a[href="#home"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#home:target) [data-tpg-nav] a[href="#home"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#stories:target) [data-tpg-nav] a[href="#stories"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#columns:target) [data-tpg-nav] a[href="#columns"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#visit:target) [data-tpg-nav] a[href="#visit"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }</style><style data-he-style="island">/* Tactile floating island: generated for the element with data-tfi. Select the island in the editor and change it under Design. */
[data-tfi] { position: fixed; z-index: 1000; inset: auto calc(16px + env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; box-sizing: border-box; max-width: calc(100vw - 32px); margin: 0; }
[data-tfi] [data-tfi-panel] { position: fixed; inset: auto calc(16px + env(safe-area-inset-right, 0px)) calc(76px + env(safe-area-inset-bottom, 0px)) auto; box-sizing: border-box; width: min(360px, calc(100vw - 32px)); max-height: 70vh; margin: 0; overflow: auto; }
[data-tfi] .tfi-btn { background: var(--tfi-bg, #1f2328); color: var(--tfi-ink, #fff); text-decoration: none; }
[data-tfi] [data-tfi-panel] { background: #fff; color: #1f2328; }
[data-tfi] [data-tfi-panel] :where(h1, h2, h3, h4, h5, h6, p, li, strong, em, small, span) { color: inherit; }
[data-tfi][data-tfi-pos="bl"] { inset: auto auto calc(16px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
[data-tfi][data-tfi-pos="bl"] [data-tfi-panel] { inset: auto auto calc(76px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px)); }
[data-tfi][data-tfi-pos="tr"] { inset: calc(16px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) auto auto; justify-content: flex-end; }
[data-tfi][data-tfi-pos="tr"] [data-tfi-panel] { inset: calc(76px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) auto auto; }
[data-tfi][data-tfi-pos="tl"] { inset: calc(16px + env(safe-area-inset-top, 0px)) auto auto calc(16px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
[data-tfi][data-tfi-pos="tl"] [data-tfi-panel] { inset: calc(76px + env(safe-area-inset-top, 0px)) auto auto calc(16px + env(safe-area-inset-left, 0px)); }
:where(.tfi) { font: 500 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
:where(.tfi-btn) { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px; padding: 0 18px; border: 1px solid rgb(127 127 127 / .35); border-radius: 999px; box-shadow: 0 4px 16px rgb(0 0 0 / .2); font: inherit; white-space: nowrap; cursor: pointer; }
:where(.tfi-panel) { padding: 16px 20px; border: 1px solid rgb(127 127 127 / .35); border-radius: 16px; box-shadow: 0 12px 40px rgb(0 0 0 / .25); font-size: 15px; font-weight: 400; line-height: 1.6; }
:where(.tfi-panel) > :where(:first-child) { margin-top: 0; }
:where(.tfi-panel) > :where(:last-child) { margin-bottom: 0; }
@supports (anchor-name: --a) { [data-tfi] { anchor-name: --tfi; } [data-tfi] [data-tfi-panel] { position-anchor: --tfi; } [data-tfi] [data-tfi-panel] { inset: auto anchor(right) calc(anchor(top) + 12px) auto; } [data-tfi][data-tfi-pos="bl"] [data-tfi-panel] { inset: auto auto calc(anchor(top) + 12px) anchor(left); } [data-tfi][data-tfi-pos="tr"] [data-tfi-panel] { inset: calc(anchor(bottom) + 12px) anchor(right) auto auto; } [data-tfi][data-tfi-pos="tl"] [data-tfi-panel] { inset: calc(anchor(bottom) + 12px) auto auto anchor(left); } }
:root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after { content: ""; display: block; height: calc(88px + env(safe-area-inset-bottom, 0px)); }
@media print { [data-tfi] { display: none; } :root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after { display: none; } }
@supports not selector(:popover-open) { [data-tfi-panel] { display: none; } }</style></head>
<body>
<header class="top">
  <a class="brand" href="#home"><span class="mark"></span>Ridgeline Post</a>
  <nav class="tpg-nav" data-tpg-nav="" aria-label="Pages"><a href="#home">Home</a><a href="#stories">Stories</a><a href="#columns">Columns</a><a href="#visit">Visit</a></nav>
</header>

<div class="tpg" data-tpg="">
  <section class="tpg-page" id="home" data-tpg-title="Home">
    <div class="wrap">
      <div class="hero">
        <p class="kicker">WINTER 2026 · ISSUE 24</p>
        <h1>Small-town stories, written from the ridge line</h1>
        <p class="lead">Ridgeline Post is a community magazine that comes out four times a year. We talk to the shopkeepers, growers and makers of one valley, and we invite readers to come and see for themselves.</p>
        <div class="actions"><a class="btn" href="#stories">Read the latest stories</a><a class="btn ghost" href="#visit">Book a workshop</a></div>
      </div>
      <div class="grid">
        <article class="card"><div class="art a"></div><h3>Latest stories</h3><p>The tofu shop by the old station is in its third generation. Work starts at 4 a.m. and stops at 120 trays.</p><a class="more" href="#stories">All stories →</a></article>
        <article class="card"><div class="art b"></div><h3>This month's columns</h3><p>Three columnists on mountain paths, on the market, and on one kitchen table through four seasons.</p><a class="more" href="#columns">Read the columns →</a></article>
        <article class="card"><div class="art c"></div><h3>Workshops</h3><p>Three events in December: a tea harvest, a woodwork class and a market walk, with 12 to 20 places each.</p><a class="more" href="#visit">Dates and places →</a></article>
      </div>
      <div class="facts">
        <p><b>2019</b><span>First issue</span></p>
        <p><b>24</b><span>Issues published</span></p>
        <p><b>37</b><span>Writers and photographers</span></p>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="stories" data-tpg-title="Stories">
    <div class="wrap">
      <div class="page-head"><p class="kicker">STORIES</p><h1>Where we went this season</h1><p class="lead">Every story is reported on the spot by our editors. Use the links at the top to go back home or to another page.</p></div>
      <div class="stories">
        <article class="story"><p class="meta"><span class="tag">People</span><br>28 November 2026<br>By Hannah Ellery</p><div><h2>The tofu shop at 4 a.m.</h2><p>The shop by the station takes no online orders. Its third owner says tofu has to sell out the same day, or the early customers are let down.</p></div></article>
        <article class="story"><p class="meta"><span class="tag">Farming</span><br>14 November 2026<br>By Marcus Odell</p><div><h2>New hands in the tea garden</h2><p>Five people in their twenties rent two hectares together. The first harvest reached 60% of the plan, and they chose to publish every number.</p></div></article>
        <article class="story"><p class="meta"><span class="tag">Transport</span><br>30 October 2026<br>By Priya Nandakumar</p><div><h2>After the last train</h2><p>The last train leaves at 9:12 p.m. We spent one Friday night watching how people get home after it.</p></div></article>
        <article class="story"><p class="meta"><span class="tag">Schools</span><br>16 October 2026<br>By Tomás Rivera</p><div><h2>A school with 31 pupils</h2><p>Six classes, 31 children. The teachers treat the whole hillside as a classroom, and science is taught by the stream.</p></div></article>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="columns" data-tpg-title="Columns">
    <div class="wrap">
      <div class="page-head"><p class="kicker">COLUMNS</p><h1>Three writers, three ways to look at a town</h1><p class="lead">Columns are updated with every issue. The views are the writers' own, not those of the editors.</p></div>
      <div class="cols">
        <article class="col"><div class="avatar" aria-hidden="true">J</div><div><h2>Notes from the path</h2><p class="who">Jonas Whitlock · mountain guide</p><p>The first fog of winter came early this year. Half the grass on the ridge has turned white, and the way down needs 40 minutes more.</p><blockquote>Walk slowly and you see what grows beside the path.</blockquote></div></article>
        <article class="col"><div class="avatar" aria-hidden="true">A</div><div><h2>Market arithmetic</h2><p class="who">Amara Okafor · greengrocer</p><p>A cabbage is $3.50 and the customer offers $3. The 50 cents going back and forth is really how we say good morning.</p><blockquote>We talk about the price, and mean the day.</blockquote></div></article>
        <article class="col"><div class="avatar" aria-hidden="true">L</div><div><h2>One table, four seasons</h2><p class="who">Lucia Brandt · cook</p><p>A winter table needs root vegetables. This month, three ways with parsnips: roasted, pickled, and in my grandmother's soup.</p><blockquote>Food in season needs very little done to it.</blockquote></div></article>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="visit" data-tpg-title="Visit">
    <div class="wrap">
      <div class="page-head"><p class="kicker">VISIT</p><h1>Three workshops in December</h1><p class="lead">Local makers lead every event and places are limited. Write to us first; we confirm each booking by email.</p></div>
      <div class="visit">
        <table>
          <thead><tr><th>Date</th><th>Event</th><th>Places</th></tr></thead>
          <tbody>
            <tr><td>Sun 6 Dec</td><td>Winter tea harvest, half a day<small>8:00 a.m., at the hillside tea garden</small></td><td class="seats">5 left</td></tr>
            <tr><td>Sun 13 Dec</td><td>Woodwork for beginners: make a stool<small>1:30 p.m., at the old granary workshop</small></td><td class="seats">3 left</td></tr>
            <tr><td>Sun 20 Dec</td><td>Early-morning market walk<small>6:00 a.m., in front of the station</small></td><td class="seats">11 left</td></tr>
          </tbody>
        </table>
        <div class="info">
          <div><h3>How to book</h3><p>Email us the event, the number of people and a phone number. We reply within two working days.</p></div>
          <div><h3>Price</h3><p>$25 per person per event, materials and insurance included. Half price under 12.</p></div>
          <div><h3>Getting here</h3><p>Take the train to Ridgeline station, then walk for 8 minutes. There is no parking on site.</p></div>
        </div>
        <div class="actions"><a class="btn" href="mailto:hello@example.com">Email to book</a><a class="btn ghost" href="#home">Back to home</a></div>
      </div>
    </div>
  </section>
</div>

<footer class="foot"><div class="wrap"><p>© 2026 Ridgeline Post. This is a sample template: the magazine, the people, the events and the figures are made up.</p></div></footer>

<div class="tfi" data-tfi="" data-tfi-pos="br" role="group" aria-label="Quick actions" style="--tfi-bg: #1f3a34; --tfi-ink: #ffffff"><button class="tfi-btn" type="button" popovertarget="tfi-panel-1">Help</button><a class="tfi-btn" href="mailto:hello@example.com">Report a problem</a><div class="tfi-panel" id="tfi-panel-1" popover="" data-tfi-panel=""><h3>Common questions</h3><p><strong>How often do you publish?</strong><br>Four times a year, in the first week of March, June, September and December.</p><p><strong>Can I send you a story?</strong><br>Yes. Press "Report a problem" to email us, with an outline of up to 200 words.</p><p><strong>Can I cancel a booking?</strong><br>Email us at least 3 days before the event for a full refund.</p></div></div>



</body></html>`;

  /* 网站：多页面网站 */
  const SITE_HANS = `<!DOCTYPE html>
<html lang="zh-Hans"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>山线通讯</title>
<style>
  :root { --paper: #faf6ef; --ink: #23302c; --deep: #1f3a34; --accent: #b4532a; --sand: #efe6d6; --line: #dccfb8; --muted: #55635e; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.75 "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
  a { color: inherit; }
  .wrap { max-width: 1040px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 40px); }

  .top { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; padding: 14px clamp(20px, 5vw, 40px); background: rgb(250 246 239 / .94); border-bottom: 1px solid var(--line); }
  .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 19px; letter-spacing: .02em; text-decoration: none; color: var(--deep); }
  .mark { width: 26px; height: 26px; border-radius: 8px 8px 8px 2px; background: linear-gradient(135deg, var(--accent), #d98a4e); }
  .top .tpg-nav { margin: 0; padding: 0; border: 0; gap: 4px 6px; font-size: 16px; }
  .top .tpg-nav a { padding: 6px 14px; border-radius: 999px; }
  .top .tpg-nav a:hover { background: var(--sand); }

  .hero { padding: clamp(48px, 9vw, 104px) 0 clamp(36px, 6vw, 64px); }
  .kicker { margin: 0 0 14px; font-size: 14px; font-weight: 700; letter-spacing: .14em; color: var(--accent); }
  h1 { margin: 0 0 18px; font-size: clamp(34px, 6.4vw, 64px); line-height: 1.16; letter-spacing: -.01em; color: var(--deep); }
  h2 { margin: 0 0 10px; font-size: clamp(22px, 3vw, 28px); line-height: 1.3; color: var(--deep); }
  h3 { margin: 0 0 6px; font-size: 19px; line-height: 1.4; color: var(--deep); }
  .lead { max-width: 40em; margin: 0 0 28px; font-size: clamp(18px, 2.2vw, 21px); color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .btn { display: inline-block; padding: 12px 22px; border-radius: 999px; background: var(--deep); color: #fff; font-weight: 700; text-decoration: none; }
  .btn.ghost { background: transparent; color: var(--deep); box-shadow: inset 0 0 0 2px var(--deep); }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin: 0 0 clamp(40px, 6vw, 72px); }
  .card { display: flex; flex-direction: column; padding: 22px 24px 24px; border: 1px solid var(--line); border-radius: 18px; background: #fff; }
  .card p { margin: 0 0 14px; color: var(--muted); font-size: 16px; }
  .card .more { margin-top: auto; font-weight: 700; color: var(--accent); text-decoration: none; }
  .art { height: 132px; margin: -22px -24px 18px; border-radius: 17px 17px 0 0; }
  .art.a { background: linear-gradient(135deg, #1f3a34, #3f7a68 60%, #d9c9a3); }
  .art.b { background: linear-gradient(135deg, #b4532a, #e0a15f 70%, #f3e2bf); }
  .art.c { background: linear-gradient(135deg, #2d4f6b, #6a9ab0 60%, #e9dcc3); }

  .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 clamp(40px, 6vw, 72px); padding: 22px; border-radius: 18px; background: var(--deep); color: #fff; text-align: center; }
  .facts b { display: block; font-size: clamp(26px, 4.4vw, 40px); line-height: 1.2; }
  .facts span { font-size: 15px; color: #d6e2dd; }

  .page-head { padding: clamp(36px, 6vw, 64px) 0 8px; }
  .page-head h1 { font-size: clamp(30px, 5vw, 48px); }
  .story { display: grid; grid-template-columns: 150px 1fr; gap: 6px 28px; padding: 26px 0; border-top: 1px solid var(--line); }
  .story .meta { margin: 0; font-size: 15px; color: var(--muted); }
  .story .tag { display: inline-block; margin-bottom: 6px; padding: 2px 10px; border-radius: 999px; background: var(--sand); color: var(--deep); font-size: 14px; font-weight: 700; }
  .story p { margin: 0; color: var(--muted); }
  .stories { margin: 0 0 clamp(40px, 6vw, 72px); border-bottom: 1px solid var(--line); }

  .col { display: grid; grid-template-columns: 64px 1fr; gap: 0 20px; padding: 24px; margin: 0 0 20px; border-radius: 18px; background: #fff; border: 1px solid var(--line); }
  .avatar { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: var(--deep); color: #fff; font-size: 24px; font-weight: 800; }
  .col .who { margin: 0 0 10px; font-size: 15px; color: var(--muted); }
  .col p { margin: 0 0 12px; }
  blockquote { margin: 0; padding: 4px 0 4px 16px; border-left: 4px solid var(--accent); color: var(--deep); font-size: 18px; font-weight: 600; }
  .cols { margin: 0 0 clamp(40px, 6vw, 72px); }

  table { width: 100%; border-collapse: collapse; margin: 0 0 28px; background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
  th, td { padding: 14px 18px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
  th { background: var(--sand); color: var(--deep); font-size: 15px; }
  tr:last-child td { border-bottom: 0; }
  td small { display: block; font-size: 15px; color: var(--muted); }
  .seats { white-space: nowrap; font-weight: 700; color: var(--accent); }
  .info { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin: 0 0 28px; }
  .info div { padding: 20px 22px; border-radius: 18px; background: var(--sand); }
  .info p { margin: 0; color: var(--ink); font-size: 16px; }
  .visit { margin: 0 0 clamp(40px, 6vw, 72px); }

  .foot { padding: 28px 0 104px; border-top: 1px solid var(--line); color: var(--muted); font-size: 15px; }
  .foot p { margin: 0; }
  /* A link to a page scrolls to it: leave room for the bar that stays at the top. */
  .tpg-page { scroll-margin-top: 140px; }
  .tfi { font-family: inherit; }

  @media (max-width: 640px) {
    body { font-size: 16px; }
    .story { grid-template-columns: 1fr; }
    .col { grid-template-columns: 1fr; gap: 14px; }
    .facts { grid-template-columns: 1fr; }
    th, td { padding: 12px; }
  }
</style>
<style data-he-style="pages">/* Tactile 多页面：根据文档中 data-tpg 里的页面自动生成，请在编辑器的“页面”标签页中修改。 */
:where(.tpg-nav) { display: flex; flex-wrap: wrap; gap: .25em 1.25em; margin: 0 0 1.5rem; padding: .75em clamp(16px, 4vw, 40px); border-bottom: 1px solid rgb(127 127 127 / .3); }
:where(.tpg-nav a) { color: inherit; text-decoration: none; }
.tpg > .tpg-page { display: none; }
.tpg > .tpg-page:target { display: block; }
.tpg:not(:has(> .tpg-page:target)) > .tpg-page:not(.tpg-page ~ .tpg-page) { display: block; }
@supports not selector(:has(*)) { .tpg > .tpg-page { display: block; } }
@media print { .tpg > .tpg-page { display: block; } .tpg > .tpg-page ~ .tpg-page { break-before: page; } [data-tpg-nav] { display: none !important; } }
:root:not(:has(.tpg > .tpg-page:target)) [data-tpg-nav] a[href="#home"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#home:target) [data-tpg-nav] a[href="#home"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#stories:target) [data-tpg-nav] a[href="#stories"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#columns:target) [data-tpg-nav] a[href="#columns"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }
:root:has(#visit:target) [data-tpg-nav] a[href="#visit"] { font-weight: 700; text-decoration: underline; text-underline-offset: .3em; }</style><style data-he-style="island">/* Tactile 浮动岛：根据文档中 data-tfi 的元素自动生成，请在编辑器选中浮动岛后，在“设计”标签页中修改。 */
[data-tfi] { position: fixed; z-index: 1000; inset: auto calc(16px + env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; box-sizing: border-box; max-width: calc(100vw - 32px); margin: 0; }
[data-tfi] [data-tfi-panel] { position: fixed; inset: auto calc(16px + env(safe-area-inset-right, 0px)) calc(76px + env(safe-area-inset-bottom, 0px)) auto; box-sizing: border-box; width: min(360px, calc(100vw - 32px)); max-height: 70vh; margin: 0; overflow: auto; }
[data-tfi] .tfi-btn { background: var(--tfi-bg, #1f2328); color: var(--tfi-ink, #fff); text-decoration: none; }
[data-tfi] [data-tfi-panel] { background: #fff; color: #1f2328; }
[data-tfi] [data-tfi-panel] :where(h1, h2, h3, h4, h5, h6, p, li, strong, em, small, span) { color: inherit; }
[data-tfi][data-tfi-pos="bl"] { inset: auto auto calc(16px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
[data-tfi][data-tfi-pos="bl"] [data-tfi-panel] { inset: auto auto calc(76px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px)); }
[data-tfi][data-tfi-pos="tr"] { inset: calc(16px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) auto auto; justify-content: flex-end; }
[data-tfi][data-tfi-pos="tr"] [data-tfi-panel] { inset: calc(76px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) auto auto; }
[data-tfi][data-tfi-pos="tl"] { inset: calc(16px + env(safe-area-inset-top, 0px)) auto auto calc(16px + env(safe-area-inset-left, 0px)); justify-content: flex-start; }
[data-tfi][data-tfi-pos="tl"] [data-tfi-panel] { inset: calc(76px + env(safe-area-inset-top, 0px)) auto auto calc(16px + env(safe-area-inset-left, 0px)); }
:where(.tfi) { font: 500 14px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
:where(.tfi-btn) { display: inline-flex; align-items: center; box-sizing: border-box; min-height: 44px; padding: 0 18px; border: 1px solid rgb(127 127 127 / .35); border-radius: 999px; box-shadow: 0 4px 16px rgb(0 0 0 / .2); font: inherit; white-space: nowrap; cursor: pointer; }
:where(.tfi-panel) { padding: 16px 20px; border: 1px solid rgb(127 127 127 / .35); border-radius: 16px; box-shadow: 0 12px 40px rgb(0 0 0 / .25); font-size: 15px; font-weight: 400; line-height: 1.6; }
:where(.tfi-panel) > :where(:first-child) { margin-top: 0; }
:where(.tfi-panel) > :where(:last-child) { margin-bottom: 0; }
@supports (anchor-name: --a) { [data-tfi] { anchor-name: --tfi; } [data-tfi] [data-tfi-panel] { position-anchor: --tfi; } [data-tfi] [data-tfi-panel] { inset: auto anchor(right) calc(anchor(top) + 12px) auto; } [data-tfi][data-tfi-pos="bl"] [data-tfi-panel] { inset: auto auto calc(anchor(top) + 12px) anchor(left); } [data-tfi][data-tfi-pos="tr"] [data-tfi-panel] { inset: calc(anchor(bottom) + 12px) anchor(right) auto auto; } [data-tfi][data-tfi-pos="tl"] [data-tfi-panel] { inset: calc(anchor(bottom) + 12px) auto auto anchor(left); } }
:root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after { content: ""; display: block; height: calc(88px + env(safe-area-inset-bottom, 0px)); }
@media print { [data-tfi] { display: none; } :root:has([data-tfi][data-tfi-space]:not([data-tfi-pos^="t"])) body::after { display: none; } }
@supports not selector(:popover-open) { [data-tfi-panel] { display: none; } }</style></head>
<body>
<header class="top">
  <a class="brand" href="#home"><span class="mark"></span>山线通讯</a>
  <nav class="tpg-nav" data-tpg-nav="" aria-label="页面"><a href="#home">首页</a><a href="#stories">报道</a><a href="#columns">专栏</a><a href="#visit">体验</a></nav>
</header>

<div class="tpg" data-tpg="">
  <section class="tpg-page" id="home" data-tpg-title="首页">
    <div class="wrap">
      <div class="hero">
        <p class="kicker">2026 冬季号 · 第 24 期</p>
        <h1>沿着山线，把小镇的日常写下来</h1>
        <p class="lead">山线通讯是一份社区刊物，每季度出刊 1 次。我们采访镇上的店主、农户和手艺人，也邀请读者一起走进现场。</p>
        <div class="actions"><a class="btn" href="#stories">看最新报道</a><a class="btn ghost" href="#visit">报名体验活动</a></div>
      </div>
      <div class="grid">
        <article class="card"><div class="art a"></div><h3>最新报道</h3><p>老车站旁的豆腐坊传到第三代，凌晨 4 点开工，一天只做 120 板。</p><a class="more" href="#stories">查看全部报道 →</a></article>
        <article class="card"><div class="art b"></div><h3>本月专栏</h3><p>3 位专栏作者，写山路、写菜市场，也写一张餐桌上的四季。</p><a class="more" href="#columns">读专栏 →</a></article>
        <article class="card"><div class="art c"></div><h3>体验活动</h3><p>12 月有采茶、木工和菜市场导览 3 场活动，每场名额 12 到 20 人。</p><a class="more" href="#visit">查看场次和名额 →</a></article>
      </div>
      <div class="facts">
        <p><b>2019</b><span>创刊年份</span></p>
        <p><b>24</b><span>已出刊期数</span></p>
        <p><b>37</b><span>撰稿和摄影伙伴</span></p>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="stories" data-tpg-title="报道">
    <div class="wrap">
      <div class="page-head"><p class="kicker">报道</p><h1>这一季，我们去了这些地方</h1><p class="lead">每篇报道都由编辑部实地采访。点击上方的导航栏，可以回到首页或查看其他页面。</p></div>
      <div class="stories">
        <article class="story"><p class="meta"><span class="tag">人物</span><br>2026年11月28日<br>文／林佳颖</p><div><h2>凌晨 4 点的豆腐坊</h2><p>车站旁的老店不接网上订单。第三代店主说，豆腐要当天卖完，才对得起早起的顾客。</p></div></article>
        <article class="story"><p class="meta"><span class="tag">产业</span><br>2026年11月14日<br>文／陈柏瀚</p><div><h2>茶园里的新手</h2><p>5 位返乡青年合租 30 亩茶园。第 1 年的收成只有预期的六成，他们决定把过程全部公开。</p></div></article>
        <article class="story"><p class="meta"><span class="tag">交通</span><br>2026年10月30日<br>文／张雅婷</p><div><h2>末班车之后</h2><p>末班车晚上 9 点 12 分离站。我们记录了 1 个周五的夜晚，看居民怎么回家。</p></div></article>
        <article class="story"><p class="meta"><span class="tag">教育</span><br>2026年10月16日<br>文／吴承恩</p><div><h2>只有 31 个学生的小学</h2><p>全校 6 个班、31 名学生。老师把整座山当成教室，科学课在溪边上。</p></div></article>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="columns" data-tpg-title="专栏">
    <div class="wrap">
      <div class="page-head"><p class="kicker">专栏</p><h1>3 位作者，3 种看小镇的方式</h1><p class="lead">专栏每期更新，作者的观点不代表编辑部的立场。</p></div>
      <div class="cols">
        <article class="col"><div class="avatar" aria-hidden="true">周</div><div><h2>山路笔记</h2><p class="who">周明哲 · 登山向导</p><p>入冬后的第 1 场雾来得比往年早。山脊上的芒草白了一半，下山的路要多留 40 分钟。</p><blockquote>走得慢，才看得见路边的东西。</blockquote></div></article>
        <article class="col"><div class="avatar" aria-hidden="true">许</div><div><h2>菜市场里的算术</h2><p class="who">许雅雯 · 菜摊第二代</p><p>圆白菜 1 棵 5 块钱，顾客还到 4 块 5。这 5 毛钱的来回，其实是每天早上的问候。</p><blockquote>谈的是菜价，聊的是日子。</blockquote></div></article>
        <article class="col"><div class="avatar" aria-hidden="true">蔡</div><div><h2>一张餐桌的四季</h2><p class="who">蔡宜君 · 厨师</p><p>冬天的餐桌少不了萝卜。这个月写 3 种做法：清炖、腌制，还有外婆的萝卜糕。</p><blockquote>当季的菜不需要太多调味。</blockquote></div></article>
      </div>
    </div>
  </section>

  <section class="tpg-page" id="visit" data-tpg-title="体验">
    <div class="wrap">
      <div class="page-head"><p class="kicker">体验</p><h1>12 月的 3 场体验活动</h1><p class="lead">活动由本地手艺人带领，每场都有名额上限。请先发邮件报名，我们会回复确认。</p></div>
      <div class="visit">
        <table>
          <thead><tr><th>日期</th><th>活动</th><th>名额</th></tr></thead>
          <tbody>
            <tr><td>12月6日（周日）</td><td>冬茶采收半日体验<small>上午 8 点，山腰茶园集合</small></td><td class="seats">剩 5 位</td></tr>
            <tr><td>12月13日（周日）</td><td>木工入门：做 1 张小板凳<small>下午 1 点 30 分，旧粮仓工坊</small></td><td class="seats">剩 3 位</td></tr>
            <tr><td>12月20日（周日）</td><td>清晨菜市场导览<small>上午 6 点，车站前广场集合</small></td><td class="seats">剩 11 位</td></tr>
          </tbody>
        </table>
        <div class="info">
          <div><h3>怎么报名</h3><p>发邮件写明场次、人数和联系电话。我们在 2 个工作日内回复。</p></div>
          <div><h3>费用</h3><p>每场每人 128 元，含材料和保险。12 岁以下半价。</p></div>
          <div><h3>交通</h3><p>乘火车到山线站，出站后步行 8 分钟。现场没有停车位。</p></div>
        </div>
        <div class="actions"><a class="btn" href="mailto:hello@example.com">发邮件报名</a><a class="btn ghost" href="#home">回首页</a></div>
      </div>
    </div>
  </section>
</div>

<footer class="foot"><div class="wrap"><p>© 2026 山线通讯。这是演示用的模板，刊物、人物、活动和数字均为虚构。</p></div></footer>

<div class="tfi" data-tfi="" data-tfi-pos="br" role="group" aria-label="快捷功能" style="--tfi-bg: #1f3a34; --tfi-ink: #ffffff"><button class="tfi-btn" type="button" popovertarget="tfi-panel-1">小助手</button><a class="tfi-btn" href="mailto:hello@example.com">问题反馈</a><div class="tfi-panel" id="tfi-panel-1" popover="" data-tfi-panel=""><h3>常见问题</h3><p><strong>多久出刊 1 次？</strong><br>每季度 1 次，3、6、9、12 月的第 1 周。</p><p><strong>可以投稿吗？</strong><br>可以。请点击“问题反馈”发邮件，附上 300 字以内的构想。</p><p><strong>活动可以取消吗？</strong><br>活动 3 天前发邮件取消，全额退款。</p></div></div>



</body></html>`;

  window.HE.samples.add([
    { key: 'site', lang: 'zh-Hant', name: '網站：多頁面網站', description: '1 個檔案裡有首頁、報導、專欄、體驗 4 個頁面，用導覽列切換；右下角有「小幫手」與「問題回報」的浮動島。不用腳本。', html: SITE },
    { key: 'en-site', lang: 'en', name: 'Website: Multi-page site', description: 'Four pages in one file (Home, Stories, Columns, Visit) that a navigation bar switches between, and a floating island with a help panel and a report link. No script.', html: SITE_EN },
    { key: 'hans-site', lang: 'zh-Hans', name: '网站：多页面网站', description: '1 个文件里有首页、报道、专栏、体验 4 个页面，用导航栏切换；右下角有“小助手”和“问题反馈”的浮动岛。不用脚本。', html: SITE_HANS },
  ]);
})();
