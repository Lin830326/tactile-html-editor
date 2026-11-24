/* Tactile — samples.js: starter documents for first launch and 開新檔案.
 *
 * Each entry is a complete, self-contained page written the way AI tools
 * usually write HTML: one <style> block driven by CSS variables, inline SVG
 * instead of images, and locally available fonts. They give every editor
 * feature (tables, lists, cards, slides, forms, code, email tables, dark themes) realistic
 * material, and every one is a test case: tests/templates.spec.js opens each on desktop, tablet and
 * phone and fails on any design-check warning or sideways scroll (see CONTRACT.md).
 * The strings are written flush-left so exported files are cleanly indented.
 */
(function () {
  'use strict';

  const HE = (window.HE = window.HE || {});

  /* ------------------------------------------------------------------ */
  /* 1. 季度營運報告 (default showcase)                                   */
  /* ------------------------------------------------------------------ */

  const QUARTERLY = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>雲朵物流 2026 第三季營運報告</title>
<style>
  :root {
    color-scheme: light;
    --ink: #10221f;
    --ink-2: #485955;
    --ink-3: #66726e;
    --line: #dde5e2;
    --bg: #f2f5f4;
    --card: #ffffff;
    --brand: #0e7468;
    --brand-deep: #0b2b27;
    --brand-soft: #e2f1ed;
    --amber: #c27610;
    --amber-soft: #fdf3e1;
    --up: #0f7050;
    --down: #c0432f;
    --radius: 14px;
    --shadow: 0 1px 2px rgba(16, 34, 31, .06), 0 12px 32px rgba(16, 34, 31, .08);
    --font: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 16px; line-height: 1.75; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, p { margin: 0; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

  .masthead {
    padding: 36px 0 120px;
    color: #e9f5f2;
    background-color: var(--brand-deep);
    background-image:
      radial-gradient(circle at 85% 15%, rgba(80, 196, 174, .28), transparent 42%),
      linear-gradient(rgba(255, 255, 255, .045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, .045) 1px, transparent 1px);
    background-size: auto, 44px 44px, 44px 44px;
  }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; letter-spacing: .08em; color: #a6dccf; }
  .brand svg { width: 30px; height: 30px; flex: none; }
  .masthead h1 { margin: 44px 0 14px; font-size: clamp(30px, 5.2vw, 50px); line-height: 1.2; letter-spacing: .01em; color: #fff; }
  .subtitle { max-width: 34em; font-size: clamp(16px, 2.2vw, 19px); color: #b5d8d0; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 28px; margin-top: 28px; font-size: 14px; color: #a6d0c6; }
  .meta strong { margin-left: 8px; font-weight: 500; color: #e9f5f2; }

  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: -76px; }
  .kpi { padding: 20px 22px; background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); }
  .kpi-label { font-size: 14px; font-weight: 500; color: var(--ink-2); }
  .kpi-value { margin: 6px 0 10px; font-size: 32px; font-weight: 700; line-height: 1.15; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
  .kpi-value small { margin-left: 4px; font-size: 15px; font-weight: 500; letter-spacing: 0; color: var(--ink-3); }
  .delta { display: inline-flex; align-items: center; gap: 6px; padding: 1px 10px 1px 8px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--up); background: #e3f3eb; }
  .delta::before { content: ""; border: 5px solid transparent; border-top: 0; border-bottom: 7px solid currentColor; }
  .delta.down { color: var(--down); background: #fbe8e4; }
  .delta.down::before { border-bottom: 0; border-top: 7px solid currentColor; }

  .section { margin-top: 64px; }
  .eyebrow { margin-bottom: 8px; font-size: 13px; font-weight: 700; letter-spacing: .12em; color: var(--brand); }
  .section h2 { font-size: clamp(22px, 3vw, 28px); line-height: 1.35; }
  .section-lead { margin-top: 6px; color: var(--ink-2); }
  .intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 16px 56px; }
  .prose { color: var(--ink-2); }
  .prose p + p { margin-top: 14px; }
  .prose p:first-child { font-size: 18px; color: var(--ink); }

  .table-wrap { margin-top: 20px; overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
  table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 15px; }
  th, td { padding: 14px 20px; text-align: left; border-bottom: 1px solid var(--line); }
  thead th { font-size: 13px; font-weight: 700; letter-spacing: .06em; color: var(--ink-3); background: #f7faf9; white-space: nowrap; }
  tfoot td { font-weight: 700; background: #f7faf9; border-bottom: 0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .note { color: var(--ink-2); }
  .pos { color: var(--up); font-weight: 500; }
  .neg { color: var(--down); font-weight: 500; }
  tr.is-highlight td { background: var(--amber-soft); }
  tr.is-highlight td:first-child { font-weight: 700; box-shadow: inset 4px 0 0 var(--amber); }

  .split { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 20px; margin-top: 20px; }
  .card { padding: 24px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
  .card h3 { font-size: 17px; }
  .legend { display: flex; gap: 18px; margin: 4px 0 12px; font-size: 13px; color: var(--ink-3); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend span::before { content: ""; width: 10px; height: 10px; border-radius: 3px; background: #a9d5cc; }
  .legend .q3::before { background: var(--brand); }
  .chart { display: block; width: 100%; max-width: 620px; height: auto; }
  .highlights { display: grid; gap: 16px; margin: 16px 0 0; padding: 0; list-style: none; }
  .highlights li { position: relative; padding-left: 26px; color: var(--ink-2); line-height: 1.7; }
  .highlights li::before { content: ""; position: absolute; left: 0; top: .45em; width: 12px; height: 12px; border: 3px solid var(--brand); border-radius: 50%; background: var(--brand-soft); }
  .highlights strong { color: var(--ink); }

  .callout { margin-top: 48px; padding: 26px 30px; color: #5c4a2c; background: var(--amber-soft); border: 1px solid #efd5a5; border-left: 6px solid var(--amber); border-radius: var(--radius); }
  .callout h3 { font-size: 19px; color: #7a4a07; }
  .callout p { margin-top: 8px; }
  .callout ul { margin: 12px 0 0; padding-left: 1.3em; }
  .callout li + li { margin-top: 6px; }
  .callout li::marker { color: var(--amber); }

  .cta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 40px; }
  .btn { display: inline-flex; align-items: center; padding: 13px 28px; border-radius: 999px; background: var(--brand); color: #fff; font-weight: 700; text-decoration: none; box-shadow: 0 6px 16px rgba(14, 116, 104, .25); transition: background-color .15s, transform .15s; }
  .btn:hover { background: #0a5f55; transform: translateY(-1px); }
  .cta-note { font-size: 14px; color: var(--ink-3); }

  footer { margin-top: 72px; padding: 28px 0 44px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-3); }
  footer .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 24px; }

  @media (max-width: 860px) {
    .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .intro, .split { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 480px) {
    .wrap { padding: 0 16px; }
    .masthead { padding-bottom: 104px; }
    .kpis { gap: 10px; }
    .kpi { padding: 16px; }
    .kpi-value { font-size: 26px; }
    .card, .callout { padding: 20px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .btn { transition: none; }
    .btn:hover { transform: none; }
  }
</style>
</head>
<body>
<header class="masthead" id="top">
  <div class="wrap">
    <p class="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#14a38f"/><path d="M10.5 22h11a4 4 0 0 0 .6-7.96A6 6 0 0 0 10.6 15.5a3.25 3.25 0 0 0-.1 6.5z" fill="#fff"/></svg>雲朵物流</p>
    <h1>2026 第三季營運報告</h1>
    <p class="subtitle">營收年增 10.7%，新竹轉運中心啟用後，桃竹苗成為成長最快的區域；準時率連續三季維持在 96% 以上。</p>
    <p class="meta"><span>發布日期<strong>2026 年 10 月 15 日</strong></span><span>撰寫<strong>營運分析部　林佳穎</strong></span><span>資料期間<strong>7 月 1 日至 9 月 30 日</strong></span></p>
  </div>
</header>

<main class="wrap">
  <section class="kpis" aria-label="關鍵指標">
    <article class="kpi">
      <p class="kpi-label">營收</p>
      <p class="kpi-value">4.82<small>億元</small></p>
      <p class="delta">+10.7% 年增</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">訂單數</p>
      <p class="kpi-value">186.4<small>萬筆</small></p>
      <p class="delta">+8.9% 年增</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">準時率</p>
      <p class="kpi-value">96.8<small>%</small></p>
      <p class="delta">+0.6 個百分點</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">客戶滿意度</p>
      <p class="kpi-value">4.6<small>/ 5</small></p>
      <p class="delta">+0.2 較上季</p>
    </article>
  </section>

  <section class="section intro">
    <div>
      <p class="eyebrow">01　本季摘要</p>
      <h2>成長來自新據點與冷鏈需求</h2>
    </div>
    <div class="prose">
      <p>第三季（7 月至 9 月）全公司營收達新台幣 4.82 億元，較去年同期成長 10.7%，也比上一季增加 7.6%。成長主要來自兩方面：8 月啟用的新竹轉運中心，讓桃竹苗地區的當日到貨能力大幅提升；以及生鮮電商帶動的冷鏈配送需求，本季冷鏈訂單年增 34%。</p>
      <p>服務品質方面，準時率為 96.8%，連續第三季高於 96% 的目標。9 月下旬颱風使東部線路停駛三天，影響約 1.2 萬筆訂單，但客服主動通知並協助改期，客戶滿意度仍較上季提升 0.2 分。以下依區域、月份與重點專案說明本季表現。</p>
    </div>
  </section>

  <section class="section" id="regions">
    <p class="eyebrow">02　區域表現</p>
    <h2>五大區域營收與訂單</h2>
    <p class="section-lead">桃竹苗年增 21.3%，是本季成長最快的區域。</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>區域</th><th class="num">營收（百萬元）</th><th class="num">年增率</th><th class="num">訂單（萬筆）</th><th>備註</th></tr>
        </thead>
        <tbody>
          <tr><td>北北基</td><td class="num">156.8</td><td class="num pos">+9.8%</td><td class="num">64.2</td><td class="note">雙北當日配覆蓋率達 92%</td></tr>
          <tr class="is-highlight"><td>桃竹苗</td><td class="num">92.4</td><td class="num pos">+21.3%</td><td class="num">33.5</td><td class="note">新竹轉運中心 8 月啟用</td></tr>
          <tr><td>中彰投</td><td class="num">101.5</td><td class="num pos">+11.2%</td><td class="num">39.8</td><td class="note">台中冷鏈倉使用率達 91%</td></tr>
          <tr><td>雲嘉南高屏</td><td class="num">98.7</td><td class="num pos">+7.5%</td><td class="num">37.6</td><td class="note">高雄港倉第二期施工中</td></tr>
          <tr><td>東部及離島</td><td class="num">32.6</td><td class="num neg">−2.1%</td><td class="num">11.3</td><td class="note">9 月颱風停駛三天</td></tr>
        </tbody>
        <tfoot>
          <tr><td>合計</td><td class="num">482.0</td><td class="num pos">+10.7%</td><td class="num">186.4</td><td class="note"></td></tr>
        </tfoot>
      </table>
    </div>
  </section>

  <section class="section">
    <p class="eyebrow">03　趨勢與亮點</p>
    <h2>月營收逐月成長，9 月創新高</h2>
    <div class="split">
      <div class="card">
        <h3>月營收（百萬元）</h3>
        <p class="legend"><span class="q2">第二季</span><span class="q3">第三季</span></p>
        <svg class="chart" viewBox="0 0 560 290" role="img" aria-label="2026 年 4 月至 9 月月營收：146、149、153、155、160、167 百萬元">
          <g stroke="#e4ebe8">
            <line x1="56" y1="20" x2="536" y2="20"/>
            <line x1="56" y1="77.5" x2="536" y2="77.5"/>
            <line x1="56" y1="135" x2="536" y2="135"/>
            <line x1="56" y1="192.5" x2="536" y2="192.5"/>
          </g>
          <g font-size="14" fill="#66726e" text-anchor="end">
            <text x="46" y="25">200</text>
            <text x="46" y="82.5">150</text>
            <text x="46" y="140">100</text>
            <text x="46" y="197.5">50</text>
            <text x="46" y="255">0</text>
          </g>
          <g fill="#a9d5cc">
            <rect x="74" y="82.1" width="44" height="167.9" rx="3"/>
            <rect x="154" y="78.65" width="44" height="171.35" rx="3"/>
            <rect x="234" y="74.05" width="44" height="175.95" rx="3"/>
          </g>
          <g fill="#0e7468">
            <rect x="314" y="71.75" width="44" height="178.25" rx="3"/>
            <rect x="394" y="66" width="44" height="184" rx="3"/>
            <rect x="474" y="57.95" width="44" height="192.05" rx="3"/>
          </g>
          <line x1="56" y1="250" x2="536" y2="250" stroke="#9aaba6"/>
          <g font-size="16" font-weight="700" fill="#10221f" text-anchor="middle">
            <text x="96" y="74.1">146</text>
            <text x="176" y="70.65">149</text>
            <text x="256" y="66.05">153</text>
            <text x="336" y="63.75">155</text>
            <text x="416" y="58">160</text>
            <text x="496" y="49.95">167</text>
          </g>
          <g font-size="15" fill="#485955" text-anchor="middle">
            <text x="96" y="276">4 月</text>
            <text x="176" y="276">5 月</text>
            <text x="256" y="276">6 月</text>
            <text x="336" y="276">7 月</text>
            <text x="416" y="276">8 月</text>
            <text x="496" y="276">9 月</text>
          </g>
        </svg>
      </div>
      <div class="card">
        <h3>本季亮點</h3>
        <ul class="highlights">
          <li><strong>當日到貨比例提升：</strong>新竹轉運中心啟用後，桃竹苗地區當日到貨比例由 61% 提升至 83%。</li>
          <li><strong>冷鏈訂單 12.6 萬筆：</strong>年增 34%，主要來自生鮮電商與連鎖餐飲客戶。</li>
          <li><strong>電動貨車 214 輛：</strong>占城市配送車隊 38%，每公里能源成本下降 22%。</li>
          <li><strong>客服回應更快：</strong>平均等待時間由 3 分 10 秒縮短為 1 分 48 秒。</li>
        </ul>
      </div>
    </div>
  </section>

  <aside class="callout">
    <h3>下一季重點</h3>
    <p>第四季進入雙 11 與年末購物旺季，預估單日訂單量最高將達平日的 2.3 倍。</p>
    <ul>
      <li>增聘 420 名短期理貨與配送人力，10 月底前完成訓練。</li>
      <li>高雄港倉第二期 11 月完工，南部倉儲容量增加 40%。</li>
      <li>東部線路建立颱風備援路線，停駛時改由南迴線經屏東轉運。</li>
    </ul>
  </aside>

  <div class="cta">
    <a class="btn" href="#regions">查看各區明細</a>
    <p class="cta-note">完整報表與原始數據，請洽營運分析部（分機 2071）。</p>
  </div>
</main>

<footer>
  <div class="wrap">
    <p>© <span id="year"></span> 雲朵物流股份有限公司</p>
    <p>本報告僅供內部使用，數據截至 2026 年 9 月 30 日。</p>
  </div>
</footer>
<script>
  document.getElementById('year').textContent = new Date().getFullYear();
</script>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 2. 空白頁                                                            */
  /* ------------------------------------------------------------------ */

  const BLANK = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>未命名文件</title>
<style>
  :root {
    color-scheme: light;
    --text: #1f2328;
    --muted: #59636e;
    --line: #e3e6ea;
    --bg: #ffffff;
    --accent: #0b6bcb;
    --font: system-ui, -apple-system, "Segoe UI", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 17px; line-height: 1.8; -webkit-font-smoothing: antialiased; }
  .container { max-width: 760px; margin: 0 auto; padding: 72px 24px 96px; }
  h1, h2, h3, h4 { margin: 1.8em 0 .6em; line-height: 1.35; }
  h1 { margin-top: 0; font-size: clamp(30px, 5vw, 40px); letter-spacing: -.01em; }
  h2 { font-size: 26px; }
  h3 { font-size: 21px; }
  p, ul, ol, blockquote, table, figure { margin: 0 0 1.1em; }
  ul, ol { padding-left: 1.5em; }
  li + li { margin-top: .3em; }
  a { color: var(--accent); text-underline-offset: 3px; }
  img, svg, video { max-width: 100%; height: auto; }
  hr { margin: 2.4em 0; border: 0; border-top: 1px solid var(--line); }
  blockquote { padding: .2em 0 .2em 1.1em; border-left: 3px solid var(--line); color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: .94em; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--line); }
  th { font-weight: 600; }
  code { padding: .1em .35em; border-radius: 4px; background: #f3f4f6; font-family: ui-monospace, Consolas, monospace; font-size: .9em; }
  @media (max-width: 480px) {
    body { font-size: 16px; }
    .container { padding: 40px 16px 64px; }
  }
</style>
</head>
<body>
<main class="container">
  <h1>未命名文件</h1>
  <p>雙擊這段文字開始編輯。</p>
</main>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 3. 會議紀錄                                                          */
  /* ------------------------------------------------------------------ */

  const MINUTES = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>會議紀錄｜官網改版專案第 3 次進度會議</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1e2430;
    --ink-2: #566070;
    --ink-3: #687080;
    --line: #e1e5eb;
    --bg: #f3f4f6;
    --paper: #ffffff;
    --accent: #3451b2;
    --accent-soft: #eef1fb;
    --font: system-ui, -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
    --mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 15.5px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  h1, h2, p { margin: 0; }
  .doc { max-width: 880px; margin: 40px auto; padding: 48px 56px 56px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 1px 2px rgba(30, 36, 48, .04); }
  .doc-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px 24px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
  .doc-type { display: inline-block; margin-bottom: 12px; padding: 2px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--accent); background: var(--accent-soft); }
  h1 { font-size: clamp(23px, 3.6vw, 30px); line-height: 1.35; }
  .doc-no { font-family: var(--mono); font-size: 13px; line-height: 1.8; color: var(--ink-3); text-align: right; }

  h2 { display: flex; align-items: center; gap: 10px; margin: 36px 0 14px; font-size: 18px; }
  h2::before { content: ""; width: 4px; height: 18px; border-radius: 2px; background: var(--accent); }

  .meta { width: 100%; margin-top: 20px; border-collapse: collapse; }
  .meta th { width: 84px; padding: 8px 16px 8px 0; font-weight: 500; text-align: left; vertical-align: top; color: var(--ink-3); white-space: nowrap; }
  .meta td { padding: 8px 0; }
  .meta tr + tr > * { border-top: 1px dashed var(--line); }

  .agenda { margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: 10px; }
  .agenda li { position: relative; display: flex; justify-content: space-between; gap: 16px; padding: 12px 16px 12px 48px; }
  .agenda li + li { border-top: 1px solid var(--line); }
  .agenda li::before { content: ""; position: absolute; left: 16px; top: 16px; width: 18px; height: 18px; border: 1.5px solid #b9c0cc; border-radius: 5px; background: #fff; }
  .agenda li.done { color: var(--ink-2); }
  .agenda li.done::before { border-color: var(--accent); background: var(--accent); }
  .agenda li.done::after { content: ""; position: absolute; left: 22px; top: 19px; width: 6px; height: 10px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .agenda .note { flex: none; font-size: 13.5px; color: var(--ink-3); }

  .notes { margin: 0; padding-left: 1.3em; color: var(--ink-2); }
  .notes li + li { margin-top: 8px; }
  .notes strong { color: var(--ink); }

  .decisions { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; counter-reset: decision; }
  .decisions li { position: relative; padding: 14px 18px 14px 56px; border-radius: 10px; background: var(--bg); counter-increment: decision; }
  .decisions li::before { content: counter(decision); position: absolute; left: 18px; top: 16px; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: var(--ink); color: #fff; font-size: 13px; font-weight: 700; line-height: 1; }

  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
  .actions { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 14.5px; }
  .actions th { padding: 10px 14px; font-size: 13px; font-weight: 600; text-align: left; color: var(--ink-2); background: var(--bg); white-space: nowrap; }
  .actions td { padding: 12px 14px; border-top: 1px solid var(--line); vertical-align: middle; }
  .actions .id { width: 1%; font-family: var(--mono); font-size: 13px; color: var(--ink-3); white-space: nowrap; }
  .actions .date { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 1px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill.doing { color: #1f4fb5; background: #e7eefc; }
  .pill.todo { color: #5b6473; background: #eceef2; }
  .pill.done { color: #17784c; background: #e1f4ea; }
  .pill.late { color: #b3321f; background: #fce9e6; }

  .doc-foot { margin-top: 40px; padding: 18px 20px; border-radius: 10px; background: var(--accent-soft); }
  .doc-foot strong { margin-right: 10px; color: var(--accent); }
  .sign { margin-top: 6px; font-size: 14px; color: var(--ink-2); }

  @media (max-width: 640px) {
    .doc { margin: 0; padding: 28px 16px 40px; border: 0; border-radius: 0; }
    .doc-no { text-align: left; }
    .meta th { width: 56px; padding-right: 10px; }
    .agenda li { flex-direction: column; gap: 0; }
  }
  @media print {
    body { background: #fff; }
    .doc { margin: 0; padding: 0; border: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<article class="doc">
  <header class="doc-head">
    <div>
      <p class="doc-type">森和文具・會議紀錄</p>
      <h1>官網改版專案　第 3 次進度會議</h1>
    </div>
    <p class="doc-no">MTG-2026-1028<br>更新於 10/28 17:20</p>
  </header>

  <table class="meta">
    <tbody>
      <tr><th>日期</th><td>2026 年 10 月 28 日（三）14:00–15:30</td></tr>
      <tr><th>地點</th><td>台北總部 7 樓松木會議室，同步線上會議</td></tr>
      <tr><th>主持</th><td>周明哲（專案經理）</td></tr>
      <tr><th>出席</th><td>蔡宜君（設計）、黃柏翔（前端工程）、劉子瑜（行銷）、陳冠宇（客服）</td></tr>
      <tr><th>缺席</th><td>吳心怡（法務，請假）</td></tr>
      <tr><th>紀錄</th><td>劉子瑜</td></tr>
    </tbody>
  </table>

  <h2>議程</h2>
  <ul class="agenda">
    <li class="done">上次待辦事項追蹤<span class="note">10 分鐘</span></li>
    <li class="done">首頁設計稿第二版審查<span class="note">30 分鐘</span></li>
    <li class="done">商品頁載入速度改善方案<span class="note">20 分鐘</span></li>
    <li class="done">會員資料遷移時程<span class="note">20 分鐘</span></li>
    <li>上線日期確認<span class="note">延至下次會議</span></li>
  </ul>

  <h2>討論摘要</h2>
  <ul class="notes">
    <li><strong>首頁：</strong>A 版的大圖輪播在手機上首屏只看得到一張圖；B 版改為三欄主題分類，使用者能更快找到商品，與會者一致支持 B 版。</li>
    <li><strong>速度：</strong>商品頁目前的最大內容繪製時間（LCP）為 4.2 秒，主因是商品圖平均 1.8 MB。改用 WebP 格式預估可減少約 65% 的圖片容量。</li>
    <li><strong>遷移：</strong>一次遷移全部 12.4 萬名會員風險較高，客服建議先遷移近兩年有消費的會員，降低上線當週的客訴量。</li>
  </ul>

  <h2>決議事項</h2>
  <ol class="decisions">
    <li><strong>首頁採用 B 版設計。</strong>蔡宜君於 11 月 4 日前交付最終設計稿，並附手機版標註。</li>
    <li><strong>商品圖全面改用 WebP 並延遲載入。</strong>目標將商品頁 LCP 降至 2.5 秒以內，上線前由黃柏翔提供量測報告。</li>
    <li><strong>會員資料分兩批遷移。</strong>11 月 18 日先遷移近兩年有消費紀錄的 3.8 萬名會員，其餘於上線後一週內完成。</li>
    <li><strong>上線日期暫定 12 月 9 日。</strong>待法務確認新版隱私權政策後，於下次會議正式定案。</li>
  </ol>

  <h2>待辦事項</h2>
  <div class="table-wrap">
    <table class="actions">
      <thead>
        <tr><th>編號</th><th>項目</th><th>負責人</th><th>期限</th><th>狀態</th></tr>
      </thead>
      <tbody>
        <tr><td class="id">A-01</td><td>交付首頁 B 版最終設計稿</td><td>蔡宜君</td><td class="date">11/04</td><td><span class="pill doing">進行中</span></td></tr>
        <tr><td class="id">A-02</td><td>撰寫商品圖 WebP 批次轉檔腳本</td><td>黃柏翔</td><td class="date">11/07</td><td><span class="pill doing">進行中</span></td></tr>
        <tr><td class="id">A-03</td><td>審閱新版隱私權政策</td><td>吳心怡</td><td class="date">11/05</td><td><span class="pill todo">未開始</span></td></tr>
        <tr><td class="id">A-04</td><td>整理首批遷移會員名單與測試帳號</td><td>陳冠宇</td><td class="date">11/11</td><td><span class="pill todo">未開始</span></td></tr>
        <tr><td class="id">A-05</td><td>舊網址轉址對照表（上次待辦）</td><td>黃柏翔</td><td class="date">10/24</td><td><span class="pill done">已完成</span></td></tr>
        <tr><td class="id">A-06</td><td>改寫客服常見問題（上次待辦，延至 10/31）</td><td>陳冠宇</td><td class="date">10/21</td><td><span class="pill late">已逾期</span></td></tr>
      </tbody>
    </table>
  </div>

  <footer class="doc-foot">
    <p><strong>下次會議</strong>11 月 11 日（三）14:00，松木會議室。預定議程：上線日期定案、首頁最終稿驗收。</p>
    <p class="sign">紀錄：劉子瑜　｜　審閱：周明哲</p>
  </footer>
</article>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 4. 產品發表簡報                                                      */
  /* ------------------------------------------------------------------ */

  const SLIDES = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kite 2 產品發表會</title>
<style>
  :root {
    color-scheme: light;
    --paper: #ffffff;
    --ink: #0f0f11;
    --ink-2: #5a5b62;
    --mist: #f0f1f3;
    --signal: #ff4f1f;
    --night: #121214;
    --desk: #26272b;
    --font: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 20px 72px; background: var(--desk); color: var(--ink); font-family: var(--font); -webkit-font-smoothing: antialiased; }

  /* Sizes use cqw (1% of the slide width) so each slide scales like a real deck; px floors keep phones readable. */
  .deck { display: grid; gap: 36px; max-width: 1120px; margin: 0 auto; container-type: inline-size; counter-reset: slide; }
  /* min-width: 0 keeps a slide inside the deck; when its content needs more room than 16:9 (phones), it grows taller instead of wider.
     The 16:9 is a min-height (56.25cqw: the slide is as wide as the deck), not aspect-ratio: WebKit does not let a box
     with overflow: clip grow past its aspect-ratio, and cut the content off. */
  .slide {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 56.25cqw;
    padding: max(24px, 6cqw) max(22px, 7cqw);
    overflow: hidden;
    overflow: clip;
    background: var(--paper);
    border-radius: 8px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, .4);
    counter-increment: slide;
  }
  .slide::after { content: counter(slide, decimal-leading-zero); position: absolute; right: max(18px, 3.2cqw); bottom: max(14px, 2.6cqw); font-size: max(11px, 1.1cqw); font-weight: 700; letter-spacing: .12em; opacity: .45; }
  .slide h1, .slide h2, .slide h3, .slide p, .slide ol, .slide ul, .slide dl, .slide blockquote { margin: 0; }
  .slide h2 { font-size: max(28px, 4.8cqw); line-height: 1.15; font-weight: 900; letter-spacing: -.01em; }
  .slide p { font-size: max(15px, 1.7cqw); line-height: 1.6; color: var(--ink-2); }
  .slide .eyebrow { margin-bottom: max(12px, 1.8cqw); font-size: max(12px, 1.25cqw); font-weight: 700; letter-spacing: .2em; color: var(--signal); }

  /* The product name gets 60%: the beam's drawing starts further right, and a wider fallback font (Linux) would otherwise break it onto two lines and stretch the slide past 16:9. */
  .slide-title h1 { margin-top: auto; max-width: 60%; font-size: max(64px, 15cqw); line-height: .9; font-weight: 900; letter-spacing: -.04em; }
  .slide-title .lede { margin-top: max(14px, 2.2cqw); font-size: max(20px, 3cqw); line-height: 1.35; font-weight: 700; color: var(--ink); }
  .slide-title .meta { margin-top: auto; padding-top: max(16px, 2cqw); font-size: max(13px, 1.35cqw); line-height: 1.7; }
  .slide-title > :not(.beam) { position: relative; z-index: 1; }
  .slide-title > :not(.beam, h1) { max-width: 52%; }
  .beam { position: absolute; top: 0; right: 0; width: 50%; height: 100%; }

  .slide-agenda { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: center; gap: max(20px, 5cqw); }
  .agenda { display: grid; padding: 0; list-style: none; counter-reset: item; }
  .agenda li { display: grid; grid-template-columns: max(40px, 6.5cqw) minmax(0, 1fr); column-gap: max(10px, 1.4cqw); align-items: baseline; padding: max(12px, 1.5cqw) 0; border-top: 2px solid var(--ink); counter-increment: item; }
  .agenda li:last-child { border-bottom: 2px solid var(--ink); }
  .agenda li::before { content: counter(item, decimal-leading-zero); grid-row: span 2; font-size: max(20px, 2.8cqw); font-weight: 900; line-height: 1; color: var(--signal); }
  .agenda h3 { font-size: max(18px, 2.3cqw); line-height: 1.3; font-weight: 700; }
  .slide .agenda p { font-size: max(13px, 1.4cqw); }

  .slide-dark { background: var(--night); color: #fff; }
  .slide-dark p { color: #a7a7ae; }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: max(16px, 3cqw); margin-top: auto; padding-top: max(16px, 2.4cqw); }
  .stat { padding-top: max(14px, 1.8cqw); border-top: 1px solid rgba(255, 255, 255, .22); }
  .slide .stat-num { margin-bottom: max(8px, 1cqw); font-size: max(48px, 7.2cqw); line-height: 1; font-weight: 900; letter-spacing: -.03em; color: #fff; white-space: nowrap; }
  .stat-num span { margin-left: .18em; font-size: .3em; font-weight: 700; letter-spacing: 0; color: var(--signal); }

  .compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: max(14px, 2.4cqw); margin-top: auto; padding-top: max(16px, 2.4cqw); }
  .spec { padding: max(16px, 2.2cqw) max(18px, 2.6cqw); border-radius: max(10px, 1.2cqw); background: var(--mist); }
  .spec.new { color: #fff; background: var(--ink); box-shadow: inset 0 max(4px, .5cqw) 0 var(--signal); }
  .spec h3 { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: max(6px, .8cqw); font-size: max(20px, 2.6cqw); font-weight: 900; }
  .spec h3 small { font-size: .5em; font-weight: 700; letter-spacing: .1em; opacity: .55; }
  .spec ul { padding: 0; list-style: none; }
  .spec li { display: flex; justify-content: space-between; gap: 12px; padding: max(8px, 1.05cqw) 0; border-top: 1px solid rgba(15, 15, 17, .12); font-size: max(14px, 1.6cqw); }
  .spec li span { color: var(--ink-2); }
  .spec li strong { font-weight: 700; }
  .spec.new li { border-top-color: rgba(255, 255, 255, .16); }
  .spec.new li span { color: #a7a7ae; }

  .slide-quote { justify-content: center; background: var(--signal); }
  .slide-quote blockquote { max-width: 86%; }
  .slide-quote blockquote::before { content: "“"; display: block; height: .42em; margin-bottom: max(8px, 1cqw); font: 900 max(80px, 13cqw)/1 Georgia, "Times New Roman", serif; color: var(--ink); }
  .slide-quote blockquote p { font-size: max(24px, 3.9cqw); line-height: 1.4; font-weight: 900; color: var(--ink); }
  .slide-quote .cite { margin-top: max(16px, 2.4cqw); font-size: max(14px, 1.6cqw); font-weight: 700; color: rgba(15, 15, 17, .7); }

  .slide-end { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: end; gap: max(20px, 5cqw); }
  .slide-end::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: max(6px, .8cqw); background: var(--signal); }
  .slide .thanks { font-size: max(56px, 11cqw); line-height: 1; letter-spacing: -.02em; }
  .slide-end .lede { margin-top: max(14px, 2cqw); font-size: max(16px, 1.9cqw); font-weight: 500; color: var(--ink); }
  .contact { display: grid; gap: max(12px, 1.6cqw); }
  .contact div { padding-left: max(12px, 1.4cqw); border-left: max(3px, .4cqw) solid var(--signal); }
  .contact dt { font-size: max(12px, 1.2cqw); font-weight: 700; letter-spacing: .12em; color: var(--ink-2); }
  .contact dd { margin: 2px 0 0; font-size: max(15px, 1.9cqw); font-weight: 700; overflow-wrap: anywhere; }
  .contact dd span { display: block; font-size: .7em; font-weight: 500; color: var(--ink-2); }

  @media (max-width: 640px) {
    body { padding: 16px 12px 40px; }
    .deck { gap: 18px; }
    .slide { padding-bottom: 40px; }
    .slide-agenda, .slide-end { grid-template-columns: minmax(0, 1fr); align-content: center; }
    .stats, .compare { grid-template-columns: minmax(0, 1fr); }
    .slide-title > :not(.beam) { max-width: none; }
    .beam { width: 80%; opacity: .16; }
    .slide-quote blockquote { max-width: none; }
  }
  @media print {
    body { padding: 0; background: none; }
    .deck { gap: 0; max-width: none; }
    .slide { border-radius: 0; box-shadow: none; break-after: page; }
  }
</style>
</head>
<body>
<main class="deck">

<section class="slide slide-title">
  <p class="eyebrow">遠颺科技・2026 秋季發表會</p>
  <h1>Kite 2</h1>
  <p class="lede">把一面牆，<br>變成一間戲院。</p>
  <p class="meta">2026.11.12　台北・松山文創園區<br>主講：產品長 許書豪</p>
  <svg class="beam" viewBox="0 0 480 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="beam-fill" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#ff4f1f" stop-opacity=".9"/>
        <stop offset="1" stop-color="#ff4f1f" stop-opacity=".08"/>
      </linearGradient>
    </defs>
    <polygon points="96,446 170,92 440,92 440,292" fill="url(#beam-fill)"/>
    <rect x="170" y="92" width="270" height="200" fill="#ffece4" stroke="#0f0f11" stroke-width="3"/>
    <polygon points="170,292 238,206 282,244 336,170 440,272 440,292" fill="#0f0f11"/>
    <circle cx="392" cy="140" r="16" fill="#ff4f1f"/>
    <rect x="34" y="414" width="128" height="66" rx="16" fill="#0f0f11"/>
    <circle cx="96" cy="446" r="22" fill="#ff4f1f"/>
    <circle cx="96" cy="446" r="9" fill="#ffffff"/>
  </svg>
</section>

<section class="slide slide-agenda">
  <div>
    <p class="eyebrow">今天的議程</p>
    <h2>想跟你聊的<br>四件事</h2>
  </div>
  <ol class="agenda">
    <li><h3>為什麼要重做 Kite</h3><p>從 3.2 萬則用戶回饋開始</p></li>
    <li><h3>三個關鍵數字</h3><p>亮度、續航與重量</p></li>
    <li><h3>和上一代放在一起比</h3><p>每一項規格升級了多少</p></li>
    <li><h3>價格與上市時間</h3><p>早鳥方案與購買通路</p></li>
  </ol>
</section>

<section class="slide slide-dark">
  <p class="eyebrow">三個關鍵數字</p>
  <h2>更亮、更久，也更輕。</h2>
  <div class="stats">
    <div class="stat"><p class="stat-num">1,200<span>流明</span></p><p>亮度是上一代的 2.4 倍，白天拉上窗簾就看得清楚。</p></div>
    <div class="stat"><p class="stat-num">4.5<span>小時</span></p><p>一次充飽，連看兩部電影還有剩。</p></div>
    <div class="stat"><p class="stat-num">590<span>公克</span></p><p>比一瓶 600 毫升的礦泉水還輕。</p></div>
  </div>
</section>

<section class="slide slide-compare">
  <p class="eyebrow">和上一代比較</p>
  <h2>同樣放進背包，能做的事完全不同。</h2>
  <div class="compare">
    <div class="spec">
      <h3>Kite<small>2024</small></h3>
      <ul>
        <li><span>亮度</span><strong>500 流明</strong></li>
        <li><span>續航</span><strong>2.5 小時</strong></li>
        <li><span>重量</span><strong>820 公克</strong></li>
        <li><span>對焦</span><strong>手動</strong></li>
        <li><span>影像輸入</span><strong>1080p</strong></li>
      </ul>
    </div>
    <div class="spec new">
      <h3>Kite 2<small>2026</small></h3>
      <ul>
        <li><span>亮度</span><strong>1,200 流明</strong></li>
        <li><span>續航</span><strong>4.5 小時</strong></li>
        <li><span>重量</span><strong>590 公克</strong></li>
        <li><span>對焦</span><strong>自動，0.3 秒</strong></li>
        <li><span>影像輸入</span><strong>4K HDR</strong></li>
      </ul>
    </div>
  </div>
</section>

<section class="slide slide-quote">
  <blockquote>
    <p>露營那晚，我們把 Kite 2 對著帳篷投影，十二個人看完一整部電影，電還剩一半。</p>
    <p class="cite">陳以安｜戶外攝影師，Kite 2 封測用戶</p>
  </blockquote>
</section>

<section class="slide slide-end">
  <div>
    <p class="eyebrow">上市資訊</p>
    <h2 class="thanks">謝謝。</h2>
    <p class="lede">Kite 2 將於 11 月 20 日開放預購，12 月 4 日起陸續出貨。</p>
  </div>
  <dl class="contact">
    <div><dt>早鳥價</dt><dd>NT$ 15,900<span>原價 NT$ 18,900，限量 3,000 台</span></dd></div>
    <div><dt>預購網址</dt><dd>kite2.example.com</dd></div>
    <div><dt>媒體聯絡</dt><dd>林語彤<span>press@kite2.example.com</span></dd></div>
  </dl>
</section>

</main>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 5. 一頁式產品頁                                                      */
  /* ------------------------------------------------------------------ */

  const LANDING = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rota 班表通｜餐飲與零售門市的排班系統</title>
<style>
  :root {
    color-scheme: light;
    --ink: #17191e;
    --ink-2: #565c67;
    --ink-3: #6b7280;
    --line: #e5e7eb;
    --soft: #f5f6f8;
    --sun: #ffc83d;
    --sun-deep: #875d00;
    --leaf: #2fb47c;
    --leaf-soft: #def5ea;
    --radius: 16px;
    --font: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: #fff; color: var(--ink); font-family: var(--font); line-height: 1.7; }
  h1, h2, h3, p, figure, blockquote { margin: 0; }
  h3 { font-size: 20px; }
  a { color: inherit; text-decoration: none; }
  .container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; height: 48px; padding: 0 24px; border: 2px solid var(--ink); border-radius: 12px; font-weight: 700; transition: transform .15s; }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary { background: var(--sun); border-color: var(--sun); }
  .btn-dark { background: var(--ink); color: #fff; }
  .btn-sm { height: 38px; padding: 0 16px; font-size: 14px; }

  .nav { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid var(--line); }
  .nav .container { display: flex; align-items: center; gap: 32px; height: 68px; }
  .logo { display: inline-flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 900; }
  .logo::before { content: ""; flex: none; width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(var(--ink) 0 0) 7px 9px / 11px 4px no-repeat, linear-gradient(var(--ink) 0 0) 12px 17px / 11px 4px no-repeat, var(--sun); }
  .nav-links { display: flex; gap: 28px; margin-right: auto; font-size: 15px; color: var(--ink-2); }

  .hero { padding: 72px 0 96px; background: radial-gradient(640px 420px at 78% 45%, rgba(255, 200, 61, .38), transparent 70%), var(--soft); }
  .hero .container { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; gap: 56px; }
  .pill { display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px 4px 4px; border: 1px solid var(--line); border-radius: 99px; background: #fff; font-size: 14px; color: var(--ink-2); }
  .pill b { padding: 0 10px; border-radius: 99px; background: var(--ink); color: #fff; font-size: 12px; }
  .hero h1 { margin: 22px 0 20px; font-size: clamp(36px, 5.4vw, 58px); line-height: 1.2; font-weight: 900; }
  .hero h1 em { font-style: normal; background: linear-gradient(transparent 62%, var(--sun) 0 92%, transparent 0); }
  .lead { max-width: 32em; font-size: clamp(16px, 2vw, 18px); color: var(--ink-2); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 32px 0 16px; }
  .note { font-size: 14px; color: var(--ink-2); }

  .mock { padding: 18px; background: #fff; border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 24px 60px rgba(23, 25, 30, .14); }
  .mock-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; font-size: 14px; font-weight: 700; }
  .mock-head span { font-size: 12px; font-weight: 400; color: var(--ink-3); }
  .week { display: grid; grid-template-columns: 48px repeat(7, minmax(0, 1fr)); gap: 5px; font-size: 12px; text-align: center; }
  .week b { align-self: center; font-weight: 500; color: var(--ink-2); }
  .week i { display: grid; place-items: center; height: 34px; border-radius: 8px; background: var(--sun); font-style: normal; font-weight: 700; }
  .week .md { background: var(--leaf-soft); color: #13744b; }
  .week .pm { background: var(--ink); color: #fff; }
  .week .off { background: none; border: 1.5px dashed #d6d9de; font-weight: 400; color: var(--ink-3); }

  .section { padding: 96px 0; }
  .head { max-width: 660px; margin-bottom: 48px; }
  .head.center { margin: 0 auto 48px; text-align: center; }
  .kicker { font-size: 14px; font-weight: 700; letter-spacing: .14em; color: var(--sun-deep); }
  .head h2 { margin: 10px 0 14px; font-size: clamp(26px, 3.6vw, 38px); line-height: 1.3; font-weight: 900; }

  .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .card { padding: 28px; border-radius: var(--radius); background: var(--soft); }
  .card svg { display: block; width: 48px; height: 48px; margin-bottom: 20px; padding: 12px; border-radius: 12px; background: var(--sun); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .card p { margin-top: 8px; color: var(--ink-2); }

  .stats { padding: 56px 0; background: var(--ink); color: #b9bdc6; font-size: 15px; }
  .stats .container { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
  .stats strong { display: block; margin-bottom: 6px; font-size: clamp(30px, 4vw, 44px); line-height: 1.15; font-weight: 900; color: var(--sun); }
  .stats small { margin-left: 4px; font-size: .45em; }

  .quote { max-width: 820px; margin: 0 auto; text-align: center; }
  .quote blockquote { font-size: clamp(20px, 2.8vw, 28px); line-height: 1.6; font-weight: 700; }
  .quote blockquote::before { content: ""; display: block; width: 48px; height: 6px; margin: 0 auto 28px; border-radius: 3px; background: var(--sun); }
  .quote figcaption { display: inline-flex; align-items: center; gap: 14px; margin-top: 28px; line-height: 1.5; text-align: left; color: var(--ink-2); }
  .avatar { display: grid; place-items: center; flex: none; width: 48px; height: 48px; border-radius: 50%; background: var(--leaf-soft); color: #13744b; font-size: 18px; font-weight: 900; }

  .pricing { background: var(--soft); }
  .plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .plan { position: relative; display: flex; flex-direction: column; padding: 32px 28px; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); }
  .plan.featured { border: 2px solid var(--ink); box-shadow: 0 20px 48px rgba(23, 25, 30, .12); }
  .badge { position: absolute; top: -14px; left: 28px; padding: 2px 12px; border-radius: 99px; background: var(--sun); font-size: 13px; font-weight: 700; }
  .plan h3 + p { font-size: 15px; color: var(--ink-2); }
  .price { margin: 22px 0; font-size: 38px; line-height: 1.1; font-weight: 900; }
  .price span { margin-left: 4px; font-size: 14px; font-weight: 500; color: var(--ink-3); }
  .plan ul { flex: 1; display: grid; align-content: start; gap: 10px; margin: 0 0 28px; padding: 22px 0 0; border-top: 1px solid var(--line); list-style: none; font-size: 15px; }
  .plan li { position: relative; padding-left: 28px; }
  .plan li::before { content: ""; position: absolute; left: 3px; top: .45em; width: 13px; height: 7px; border: solid var(--leaf); border-width: 0 0 2.5px 2.5px; transform: rotate(-45deg); }

  .faq { max-width: 820px; margin: 0 auto; border-top: 1px solid var(--line); }
  .faq details { border-bottom: 1px solid var(--line); }
  .faq summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 22px 4px; font-size: 17px; font-weight: 700; list-style: none; cursor: pointer; }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after { content: "+"; display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--soft); font-size: 18px; transition: transform .2s; }
  .faq [open] summary::after { background: var(--sun); transform: rotate(45deg); }
  .faq details p { padding: 0 4px 22px; color: var(--ink-2); }

  .footer { padding: 48px 0 32px; border-top: 1px solid var(--line); font-size: 14px; color: var(--ink-2); }
  .footer .container { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px; }
  .footer .brand p { margin-top: 10px; }
  .footer nav { display: flex; flex-wrap: wrap; gap: 12px 28px; }
  .legal { flex-basis: 100%; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-3); }

  @media (max-width: 900px) {
    .hero .container, .cards { grid-template-columns: minmax(0, 1fr); }
    .stats .container { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .plans { grid-template-columns: minmax(0, 1fr); max-width: 460px; margin: 0 auto; gap: 28px; }
  }
  @media (max-width: 720px) {
    .container { padding: 0 16px; }
    .nav-links { display: none; }
    .nav .btn { margin-left: auto; }
    .hero { padding: 48px 0 80px; }
    .section { padding: 72px 0; }
    .mock { padding: 14px; }
    .week { grid-template-columns: 40px repeat(7, minmax(0, 1fr)); gap: 4px; }
    .week i { height: 30px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .btn, .faq summary::after { transition: none; }
  }
</style>
<style data-he-style="fx">/* Tactile 動態效果：依頁面中的 tfx-* 類別自動產生，請在編輯器的「動態效果」修改。 */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }
:where(.tfx-h-sheen) { position: relative; }
.tfx-e-deal > * { --tfx-k: inherit; --tfx-t: inherit; }
:where(.tfx-s-shrink) { position: sticky; top: 0; z-index: 20; }</style>
<style data-he-style="fx-motion">/* Tactile 動態效果：依頁面中的 tfx-* 類別自動產生，請在編輯器的「動態效果」修改。 */
@media (prefers-reduced-motion: no-preference) {
  .tfx-h-lift { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1); }
  .tfx-h-sheen::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; --tfx-k: inherit; background: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / calc(.38 * var(--tfx-k, 1))) 50%, transparent 65%) 130% 0 / 250% 100% no-repeat; }
  @media (hover: hover) {
    .tfx-h-lift:hover { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
    .tfx-h-sheen:hover::after { background-position: -30% 0; transition: background-position .9s cubic-bezier(.65,0,.35,1); }
  }
  .tfx-h-lift:is(:focus-visible, :focus-within) { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
  .tfx-h-sheen:is(:focus-visible, :focus-within)::after { background-position: -30% 0; transition: background-position .9s cubic-bezier(.65,0,.35,1); }
  @media screen {
    @supports (animation-timeline: view()) {
      @keyframes tfx-deal { from { opacity: 0; transform: translateY(calc(1.5rem * var(--tfx-k, 1))) scale(calc(1 - .05 * var(--tfx-k, 1))); } }
      .tfx-e-deal > * { animation: tfx-deal linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15% + min(var(--tfx-i, 0), 7) * 6%, 3rem + var(--tfx-t, 0) * 3rem + min(var(--tfx-i, 0), 7) * 1rem) entry min(100%, 75% + var(--tfx-t, 0) * 25% + min(var(--tfx-i, 0), 7) * 6%, 16rem + var(--tfx-t, 0) * 4rem + min(var(--tfx-i, 0), 7) * 1rem); }
      @keyframes tfx-shrink { to { transform: translateY(calc(.4rem * var(--tfx-k, 1))) scale(calc(1 - .04 * var(--tfx-k, 1))); border-radius: calc(.9rem * var(--tfx-k, 1)); box-shadow: 0 .6rem 1.6rem -.8rem rgb(0 0 0 / .32); } }
      .tfx-s-shrink { transform-origin: 50% 0; animation: tfx-shrink linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: scroll(root); animation-range: 0px calc(200px + var(--tfx-t, 0) * 100px); }
      @keyframes tfx-fill { from { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(color-mix(in srgb, currentColor 35%, transparent), color-mix(in srgb, currentColor 35%, transparent)), none; background-size: 0% 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; -webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent; } to { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(color-mix(in srgb, currentColor 35%, transparent), color-mix(in srgb, currentColor 35%, transparent)), none; background-size: 100% 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; -webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent; } }
      .tfx-s-fill { animation: tfx-fill linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover calc(20% + var(--tfx-t, 0) * 10%) cover calc(50% + var(--tfx-t, 0) * 10%); }
    }
  }
}</style>
</head>
<body id="top">
<header class="nav tfx-s-shrink">
  <div class="container">
    <a class="logo" href="#top">Rota 班表通</a>
    <nav class="nav-links" aria-label="主要導覽">
      <a href="#features">功能</a>
      <a href="#pricing">方案</a>
      <a href="#faq">常見問題</a>
    </nav>
    <a class="btn btn-dark btn-sm" href="#pricing">免費試用</a>
  </div>
</header>

<section class="hero">
  <div class="container">
    <div>
      <p class="pill"><b>新功能</b>換班申請一鍵核准</p>
      <h1>排班<em>十分鐘</em>搞定，<br>不必再喬到半夜。</h1>
      <p class="lead">Rota 依照員工可上班的時段、工時上限與各時段的人力需求，自動排出整週班表。員工用手機換班、打卡，店長只要按下核准。</p>
      <div class="actions">
        <a class="btn btn-primary tfx-h-sheen" href="#pricing">免費試用 30 天</a>
        <a class="btn" href="#features">看功能介紹</a>
      </div>
      <p class="note">免綁信用卡・5 分鐘完成設定・隨時可以取消</p>
    </div>
    <div class="mock" role="img" aria-label="Rota 班表畫面示意：信義店 11 月第 2 週">
      <p class="mock-head">信義店・11 月第 2 週<span>22 班・人力充足</span></p>
      <div class="week">
        <b></b><b>一</b><b>二</b><b>三</b><b>四</b><b>五</b><b>六</b><b>日</b>
        <b>怡君</b><i>早</i><i>早</i><i class="md">中</i><i class="off">休</i><i class="pm">晚</i><i>早</i><i class="off">休</i>
        <b>柏宇</b><i class="pm">晚</i><i class="off">休</i><i class="pm">晚</i><i class="pm">晚</i><i>早</i><i class="pm">晚</i><i class="md">中</i>
        <b>家豪</b><i class="md">中</i><i class="pm">晚</i><i>早</i><i>早</i><i class="off">休</i><i class="md">中</i><i class="pm">晚</i>
        <b>雅婷</b><i class="off">休</i><i class="md">中</i><i class="pm">晚</i><i class="md">中</i><i class="md">中</i><i class="off">休</i><i>早</i>
      </div>
    </div>
  </div>
</section>

<section class="section" id="features">
  <div class="container">
    <div class="head">
      <p class="kicker">功能</p>
      <h2>店長最花時間的三件事，交給 Rota。</h2>
      <p class="lead">排班、換班到工時計算都在同一個地方完成，不必再用試算表和群組訊息來回確認。</p>
    </div>
    <div class="cards tfx-e-deal">
      <article class="card" style="--tfx-i: 0">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8.5 15.5l2 2 4-4"/></svg>
        <h3>自動排班</h3>
        <p>設定各時段需要的人數與每個人能上的班，30 秒排好整週班表，也會避開連續上班超過六天。</p>
      </article>
      <article class="card" style="--tfx-i: 1">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>
        <h3>手機換班</h3>
        <p>員工在 App 提出換班，同事接受後送到店長手機，一鍵核准，班表即時更新。</p>
      </article>
      <article class="card" style="--tfx-i: 2">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>
        <h3>工時提醒</h3>
        <p>依勞基法計算每日、每週工時與加班費，快超過上限時事先提醒；月底結算可直接匯出薪資表。</p>
      </article>
    </div>
  </div>
</section>

<section class="stats" aria-label="使用成果">
  <div class="container tfx-e-deal">
    <p style="--tfx-i: 0"><strong>3,200+</strong>間門市正在使用</p>
    <p style="--tfx-i: 1"><strong>4.5<small>小時</small></strong>店長每週平均省下的排班時間</p>
    <p style="--tfx-i: 2"><strong>−72%</strong>與排班有關的員工申訴</p>
    <p style="--tfx-i: 3"><strong>99.2%</strong>打卡紀錄完整率</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <figure class="quote">
      <blockquote class="tfx-s-fill">以前每週日晚上，我都在群組裡一個一個喬班，一喬就是兩小時。現在 12 間分店的班表週五就排好，員工換班也不用再打電話給我。</blockquote>
      <figcaption><span class="avatar">王</span><span><b>王柏翰</b><br>好食光早午餐・營運經理</span></figcaption>
    </figure>
  </div>
</section>

<section class="section pricing" id="pricing">
  <div class="container">
    <div class="head center">
      <p class="kicker">方案</p>
      <h2>依門市數量計費，隨時可以升級或取消。</h2>
    </div>
    <div class="plans">
      <article class="plan tfx-h-lift">
        <h3>入門</h3>
        <p>一間店、15 位員工以內</p>
        <p class="price">NT$ 0<span>／月</span></p>
        <ul>
          <li>自動排班</li>
          <li>手機打卡</li>
          <li>每月工時報表</li>
        </ul>
        <a class="btn" href="#top">免費開始</a>
      </article>
      <article class="plan featured tfx-h-lift">
        <p class="badge">最受歡迎</p>
        <h3>專業</h3>
        <p>2 到 20 間店，員工人數不限</p>
        <p class="price">NT$ 990<span>／每間店・月</span></p>
        <ul>
          <li>入門方案的所有功能</li>
          <li>換班申請與核准流程</li>
          <li>工時上限與加班提醒</li>
          <li>薪資表一鍵匯出</li>
          <li>跨店人力支援</li>
        </ul>
        <a class="btn btn-primary" href="#top">免費試用 30 天</a>
      </article>
      <article class="plan tfx-h-lift">
        <h3>企業</h3>
        <p>20 間店以上的連鎖品牌</p>
        <p class="price">專人報價</p>
        <ul>
          <li>專業方案的所有功能</li>
          <li>單一登入與分級權限</li>
          <li>串接 POS 與人資系統</li>
          <li>專屬客戶經理</li>
        </ul>
        <a class="btn" href="#faq">聯絡業務</a>
      </article>
    </div>
  </div>
</section>

<section class="section" id="faq">
  <div class="container">
    <div class="head center">
      <p class="kicker">常見問題</p>
      <h2>導入前，大家最常問的事</h2>
    </div>
    <div class="faq">
      <details open>
        <summary>免費試用結束後會自動扣款嗎？</summary>
        <p>不會。試用期間不必綁定信用卡；到期後若沒有升級，帳號會轉為入門方案，資料都會保留。</p>
      </details>
      <details>
        <summary>員工一定要下載 App 嗎？</summary>
        <p>不一定。員工也可以用手機瀏覽器登入查看班表與打卡；App 版另外提供推播通知與定位打卡。</p>
      </details>
      <details>
        <summary>可以匯入現在用的 Excel 班表嗎？</summary>
        <p>可以。上傳 Excel 或 CSV 檔後，系統會自動對應員工姓名與班別，通常 3 分鐘內就能完成。</p>
      </details>
      <details>
        <summary>工時與加班費的計算符合勞基法嗎？</summary>
        <p>內建一例一休、變形工時與加班費規則，法規修正時會同步更新並在後台公告。</p>
      </details>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <div class="brand">
      <a class="logo" href="#top">Rota 班表通</a>
      <p>讓每一間門市的排班，都能在十分鐘內完成。</p>
    </div>
    <nav aria-label="頁尾連結">
      <a href="#features">功能介紹</a>
      <a href="#pricing">價格方案</a>
      <a href="#faq">常見問題</a>
      <a href="#top">隱私權政策</a>
    </nav>
    <p class="legal">© 2026 輪轉科技股份有限公司　客服信箱 support@rota.example.com</p>
  </div>
</footer>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 6. 研究報告 (Word-like long-form document)                           */
  /* ------------------------------------------------------------------ */

  const ARTICLE = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>混合辦公時代的通勤行為變化｜研究報告</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1c1f24;
    --ink-2: #4a505a;
    --ink-3: #6a7079;
    --rule: #d6d9de;
    --desk: #e7e9ec;
    --paper: #ffffff;
    --accent: #1d4e89;
    --accent-soft: #f0f4f9;
    --serif: "Noto Serif TC", "Songti TC", "PMingLiU", serif;
    --sans: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--desk); color: var(--ink); font-family: var(--serif); font-size: 17px; line-height: 1.9; -webkit-font-smoothing: antialiased; }
  .paper { max-width: 840px; margin: 48px auto; padding: 72px 88px 80px; background: var(--paper); box-shadow: 0 1px 3px rgba(0, 0, 0, .08), 0 12px 40px rgba(0, 0, 0, .08); }
  h1, h2, h3 { font-family: var(--sans); line-height: 1.4; }
  p { margin: 0 0 1em; text-align: justify; }

  .title-block { margin-bottom: 36px; padding-bottom: 28px; border-bottom: 3px double var(--ink); }
  .title-block p { text-align: left; }
  .series { margin-bottom: 18px; font-family: var(--sans); font-size: 13px; font-weight: 500; letter-spacing: .08em; color: var(--accent); }
  .title-block h1 { margin: 0; font-size: clamp(26px, 4.4vw, 36px); letter-spacing: .01em; }
  .subtitle { margin: 10px 0 0; font-size: 19px; color: var(--ink-2); }
  .byline { display: flex; flex-wrap: wrap; gap: 2px 24px; margin: 22px 0 0; font-family: var(--sans); font-size: 14.5px; color: var(--ink-2); }

  .abstract { margin: 0 0 40px; padding: 22px 28px 10px; background: var(--accent-soft); border-left: 4px solid var(--accent); }
  .abstract h2 { margin: 0 0 6px; font-size: 15px; letter-spacing: .3em; color: var(--accent); }
  .abstract p { font-size: 15.5px; line-height: 1.85; }
  .abstract .keywords { font-family: var(--sans); font-size: 14px; color: var(--ink-2); text-align: left; }

  /* Section numbers come from counters, so inserting or moving a heading renumbers the document. */
  .body { counter-reset: sec; }
  .body h2 { margin: 2.2em 0 .7em; font-size: 22px; counter-increment: sec; counter-reset: sub; }
  .body h2::before { content: counter(sec) ". "; color: var(--accent); }
  .body h3 { margin: 1.6em 0 .5em; font-size: 18px; counter-increment: sub; }
  .body h3::before { content: counter(sec) "." counter(sub) " "; color: var(--accent); }
  ol { margin: 0 0 1em; padding-left: 1.8em; }
  li { margin: .3em 0; padding-left: .2em; }
  li::marker { font-family: var(--sans); font-weight: 700; color: var(--accent); }

  figure { margin: 2em 0; padding: 20px 0 14px; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  figure svg { display: block; width: 100%; height: auto; font-family: var(--sans); }
  figcaption, caption { font-family: var(--sans); font-size: 14px; line-height: 1.6; text-align: center; color: var(--ink-2); }
  figcaption { margin-top: 10px; }
  figcaption strong, caption strong { margin-right: .6em; color: var(--ink); }

  .tbl-wrap { margin: 1.8em 0; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 15px; line-height: 1.6; }
  caption { padding-bottom: 10px; }
  th, td { padding: 9px 14px; text-align: left; }
  thead th { font-weight: 700; border-top: 2px solid var(--ink); border-bottom: 1px solid var(--ink); }
  tbody tr:last-child td { border-bottom: 2px solid var(--ink); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .up { color: #1f6f43; }
  .down { color: #a33a2b; }

  blockquote { margin: 1.8em 0; padding: 2px 0 2px 24px; border-left: 3px solid var(--accent); font-family: var(--sans); font-size: 16px; line-height: 1.85; color: var(--ink-2); }
  blockquote p { margin: 0 0 .4em; text-align: left; }
  cite { font-size: 14px; font-style: normal; color: var(--ink-3); }

  sup.fn { line-height: 0; font-family: var(--sans); font-size: 11px; }
  sup.fn a { padding: 0 1px; color: var(--accent); text-decoration: none; }
  .footnotes { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--rule); font-family: var(--sans); font-size: 13.5px; line-height: 1.75; color: var(--ink-2); }
  .footnotes h2 { margin: 0 0 6px; font-size: 14px; letter-spacing: .2em; color: var(--ink-3); }
  .footnotes ol { padding-left: 1.6em; }
  .footnotes .back { margin-left: 6px; color: var(--accent); text-decoration: none; }
  :target { background: #fff3c4; }

  @media (max-width: 720px) {
    body { font-size: 16px; }
    .paper { margin: 0; padding: 36px 20px 48px; box-shadow: none; }
    .abstract { padding: 18px 18px 6px; }
    p { text-align: left; }
    figure { overflow-x: auto; }
    figure svg { min-width: 480px; }
  }
  @media print {
    body { background: #fff; }
    .paper { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<article class="paper">
  <header class="title-block">
    <p class="series">城市移動研究室　研究報告 UML-2026-07</p>
    <h1>混合辦公時代的通勤行為變化</h1>
    <p class="subtitle">大台北地區 1,248 位上班族問卷調查結果</p>
    <p class="byline"><span>張詠晴、李承恩</span><span>城市移動研究室</span><span>2026 年 10 月</span></p>
  </header>

  <section class="abstract">
    <h2>摘要</h2>
    <p>本研究於 2026 年 8 月至 9 月調查大台北地區 1,248 位全職上班族，並與 2023 年的同題項調查比較。結果顯示，受訪者平均每週進辦公室天數由 3.77 天降至 2.79 天，固定每週進辦公室五天者由 48% 降至 17%。主要通勤方式中，機車占比下降 4.4 個百分點，捷運與汽車則分別上升 3.3 與 1.5 個百分點。通勤天數減少後，部分上班族願意搬到離公司較遠、房租較低的地區，現行以「月」計算的定期票與通勤補助已不符合實際需求。</p>
    <p class="keywords"><strong>關鍵詞：</strong>混合辦公、通勤方式、居住選擇、通勤補助</p>
  </section>

  <div class="body">
    <h2>研究背景</h2>
    <p>2020 年以後，遠距與混合辦公從疫情期間的應變措施，逐漸成為許多企業的常態制度。本研究室 2023 年的調查顯示，當時已有 52% 的大台北上班族每週至少一天不進辦公室；到了 2026 年，這個比例上升到 83%。</p>
    <p>通勤頻率改變，連帶影響交通方式、居住地點與企業的補助設計。然而，過去的交通調查多以「每天通勤」為前提，較少討論每週只通勤兩、三天的族群。本研究延續 2023 年的問卷設計，聚焦三個問題：進辦公室的頻率如何變化？主要通勤方式是否改變？居住地點的選擇又受到什麼影響？</p>

    <h2>研究方法</h2>
    <h3>樣本與調查期間</h3>
    <p>調查期間為 2026 年 8 月 4 日至 9 月 12 日，透過線上固定樣本平台，招募居住或工作於台北市、新北市及基隆市的全職上班族，共回收有效問卷 1,248 份。樣本依性別、年齡與居住行政區加權<sup class="fn"><a href="#fn1" id="ref1">1</a></sup>，並與 2023 年的調查結果比較<sup class="fn"><a href="#fn2" id="ref2">2</a></sup>。</p>
    <h3>問卷設計</h3>
    <p>問卷共 32 題，分為四個部分：</p>
    <ol>
      <li>工作型態，以及過去四週實際進辦公室的天數</li>
      <li>主要通勤方式、單程時間與每月交通支出</li>
      <li>近三年是否搬家，以及搬家的主要原因</li>
      <li>對各種通勤補助方案的偏好</li>
    </ol>

    <h2>研究結果</h2>
    <h3>每週進辦公室天數</h3>
    <p>如圖 1 所示，每週固定進辦公室五天的受訪者由 2023 年的 48% 降至 17%；每週進辦公室二至三天者則由 23% 增加到 48%，成為最主要的工作型態<sup class="fn"><a href="#fn3" id="ref3">3</a></sup>。整體而言，平均每週進辦公室天數由 3.77 天降至 2.79 天。</p>
    <figure>
      <svg viewBox="0 0 640 300" role="img" aria-label="每週進辦公室天數分布。2023 年：0 天 6%、1 天 5%、2 天 9%、3 天 14%、4 天 18%、5 天 48%。2026 年：0 天 9%、1 天 11%、2 天 21%、3 天 27%、4 天 15%、5 天 17%。">
        <g stroke="#e3e6ea">
          <line x1="70" y1="30" x2="610" y2="30"/>
          <line x1="70" y1="74" x2="610" y2="74"/>
          <line x1="70" y1="118" x2="610" y2="118"/>
          <line x1="70" y1="162" x2="610" y2="162"/>
          <line x1="70" y1="206" x2="610" y2="206"/>
        </g>
        <g font-size="14" fill="#6a7079" text-anchor="end">
          <text x="60" y="35">50%</text>
          <text x="60" y="79">40%</text>
          <text x="60" y="123">30%</text>
          <text x="60" y="167">20%</text>
          <text x="60" y="211">10%</text>
          <text x="60" y="255">0</text>
        </g>
        <g fill="#b8c0ca">
          <rect x="85" y="223.6" width="28" height="26.4"/>
          <rect x="175" y="228" width="28" height="22"/>
          <rect x="265" y="210.4" width="28" height="39.6"/>
          <rect x="355" y="188.4" width="28" height="61.6"/>
          <rect x="445" y="170.8" width="28" height="79.2"/>
          <rect x="535" y="38.8" width="28" height="211.2"/>
        </g>
        <g fill="#1d4e89">
          <rect x="117" y="210.4" width="28" height="39.6"/>
          <rect x="207" y="201.6" width="28" height="48.4"/>
          <rect x="297" y="157.6" width="28" height="92.4"/>
          <rect x="387" y="131.2" width="28" height="118.8"/>
          <rect x="477" y="184" width="28" height="66"/>
          <rect x="567" y="175.2" width="28" height="74.8"/>
        </g>
        <line x1="70" y1="250" x2="610" y2="250" stroke="#1c1f24"/>
        <g font-size="13" fill="#4a505a" text-anchor="middle">
          <text x="99" y="217.6">6</text>
          <text x="189" y="222">5</text>
          <text x="279" y="204.4">9</text>
          <text x="369" y="182.4">14</text>
          <text x="459" y="164.8">18</text>
          <text x="549" y="32.8">48</text>
        </g>
        <g font-size="13" font-weight="700" fill="#1d4e89" text-anchor="middle">
          <text x="131" y="204.4">9</text>
          <text x="221" y="195.6">11</text>
          <text x="311" y="151.6">21</text>
          <text x="401" y="125.2">27</text>
          <text x="491" y="178">15</text>
          <text x="581" y="169.2">17</text>
        </g>
        <g font-size="15" fill="#1c1f24" text-anchor="middle">
          <text x="115" y="273">0 天</text>
          <text x="205" y="273">1 天</text>
          <text x="295" y="273">2 天</text>
          <text x="385" y="273">3 天</text>
          <text x="475" y="273">4 天</text>
          <text x="565" y="273">5 天</text>
          <text x="340" y="296" font-size="14" fill="#6a7079">每週進辦公室天數</text>
        </g>
        <g font-size="14" fill="#4a505a">
          <rect x="440" y="5" width="12" height="12" fill="#b8c0ca"/>
          <text x="458" y="16">2023 年</text>
          <rect x="524" y="5" width="12" height="12" fill="#1d4e89"/>
          <text x="542" y="16">2026 年</text>
        </g>
      </svg>
      <figcaption><strong>圖 1</strong>受訪者每週進辦公室天數分布（%）</figcaption>
    </figure>

    <h3>主要通勤方式</h3>
    <p>表 1 比較兩次調查中受訪者最常使用的通勤方式。機車的占比下降最多，捷運與汽車則略為增加。進一步分析發現，近三年曾搬家的受訪者（占 14.6%）中，有 61% 搬到離公司更遠的地方，單程通勤時間平均增加 11 分鐘，其中多數改搭捷運或開車。</p>
    <div class="tbl-wrap">
      <table>
        <caption><strong>表 1</strong>主要通勤方式占比（%）</caption>
        <thead>
          <tr><th>通勤方式</th><th class="num">2023 年</th><th class="num">2026 年</th><th class="num">變化</th></tr>
        </thead>
        <tbody>
          <tr><td>捷運（含轉乘）</td><td class="num">38.2</td><td class="num">41.5</td><td class="num up">+3.3</td></tr>
          <tr><td>機車</td><td class="num">27.5</td><td class="num">23.1</td><td class="num down">−4.4</td></tr>
          <tr><td>汽車</td><td class="num">14.1</td><td class="num">15.6</td><td class="num up">+1.5</td></tr>
          <tr><td>公車</td><td class="num">9.6</td><td class="num">8.2</td><td class="num down">−1.4</td></tr>
          <tr><td>自行車或步行</td><td class="num">10.6</td><td class="num">11.6</td><td class="num up">+1.0</td></tr>
        </tbody>
      </table>
    </div>
    <blockquote>
      <p>「公司改成一週進三天之後，我們就搬到林口，房租少了八千。通勤變成單程一小時，但一週只要跑三趟，算起來還是划算。」</p>
      <p><cite>受訪者 #0472，38 歲，資訊業</cite></p>
    </blockquote>

    <h2>討論與建議</h2>
    <p>結果顯示，通勤天數減少並沒有讓通勤變得比較輕鬆，而是讓部分上班族願意用更長的單程距離，換取較低的居住成本。現行以「月」為單位的定期票與通勤補助，對每週只通勤兩、三天的人並不划算。據此，我們提出三項建議：</p>
    <ol>
      <li>企業將通勤補助由固定月額改為依實際進辦公室次數計算，或改發可彈性使用的交通點數。</li>
      <li>交通主管機關研議「彈性定期票」，例如 30 天內任選 12 天不限次數搭乘，符合每週通勤二至三天的需求。</li>
      <li>在新北與桃園外圍的捷運站周邊增設按次計費的停車空間，支援「開車轉乘捷運」的長距離通勤。</li>
    </ol>
    <p>本研究的限制在於樣本來自線上平台，可能低估較少使用網路的年長上班族。我們將於 2027 年進行第三期調查，並加入交通電子票證的實際使用紀錄，以驗證問卷結果。</p>
  </div>

  <section class="footnotes">
    <h2>註釋</h2>
    <ol>
      <li id="fn1">加權依據為內政部 2025 年底戶籍人口統計之性別、年齡與行政區分布。<a class="back" href="#ref1" aria-label="回到內文">↑</a></li>
      <li id="fn2">2023 年資料來自本研究室同題項之前期調查（n = 1,102），兩期問卷的題目文字相同。<a class="back" href="#ref2" aria-label="回到內文">↑</a></li>
      <li id="fn3">進辦公室天數以受訪者自填之過去四週平均計算，四捨五入至整數天。<a class="back" href="#ref3" aria-label="回到內文">↑</a></li>
    </ol>
  </section>
</article>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 7. 營運看板（深色主題）                                             */
  /* ------------------------------------------------------------------ */

  const DASHBOARD = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>北辰物流｜每日營運看板</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0f141b;
    --panel: #171e29;
    --panel-2: #1e2734;
    --line: #283344;
    --ink: #e6ebf2;
    --ink-2: #a3b0c2;
    --blue: #38bdf8;
    --green: #4ade80;
    --red: #f87171;
    --amber: #fbbf24;
    --font: system-ui, -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 14.5px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  h1, h2, p { margin: 0; }
  .app { max-width: 1240px; margin: 0 auto; padding: 28px 24px 40px; }

  .top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
  h1 { font-size: 24px; line-height: 1.3; }
  .updated { margin-top: 2px; font-size: 13px; color: var(--ink-2); }
  .range { display: inline-flex; padding: 3px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); }
  .range button { padding: 6px 14px; border: 0; border-radius: 7px; font: inherit; font-size: 14px; color: var(--ink-2); background: transparent; cursor: pointer; }
  .range button[aria-pressed="true"] { color: var(--ink); background: var(--panel-2); box-shadow: 0 0 0 1px var(--line); }

  .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
  .card { padding: 20px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); }
  .kpi { grid-column: span 3; }
  .wide { grid-column: span 8; }
  .side { grid-column: span 4; }
  .half { grid-column: span 5; }
  .rest { grid-column: span 7; }
  h2 { font-size: 15px; font-weight: 600; color: var(--ink-2); }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 16px; }
  .card-head span { font-size: 13px; color: var(--ink-2); }

  .kpi .value { margin: 8px 0 6px; font-size: 32px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
  .kpi .value small { margin-left: 4px; font-size: 15px; font-weight: 500; color: var(--ink-2); }
  .delta { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; }
  .delta.good { color: var(--green); }
  .delta.bad { color: var(--red); }
  .delta + span { margin-left: 6px; font-size: 13px; color: var(--ink-2); }

  .chart { position: relative; height: 200px; margin-left: 36px; }
  .chart svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .y { position: absolute; left: -36px; width: 30px; transform: translateY(-50%); font-size: 12px; text-align: right; color: var(--ink-2); }
  .x { display: flex; justify-content: space-between; margin: 8px 0 0 36px; font-size: 12px; color: var(--ink-2); }

  .donut { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
  .donut svg { width: 140px; height: 140px; flex: none; }
  .donut-total { font-size: 22px; font-weight: 700; }
  .legend { margin: 0; padding: 0; list-style: none; font-size: 14px; }
  .legend li { display: flex; align-items: center; gap: 8px; }
  .legend li + li { margin-top: 6px; }
  .legend i { width: 10px; height: 10px; border-radius: 3px; }
  .legend b { margin-left: auto; padding-left: 16px; font-variant-numeric: tabular-nums; }

  .bars { margin: 0; padding: 0; list-style: none; }
  .bars li + li { margin-top: 14px; }
  .bars .row { display: flex; justify-content: space-between; font-size: 14px; }
  .bars .row b { font-variant-numeric: tabular-nums; }
  .track { height: 8px; margin-top: 6px; border-radius: 4px; background: var(--panel-2); }
  .track i { display: block; height: 100%; border-radius: 4px; background: var(--blue); }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; min-width: 520px; border-collapse: collapse; font-size: 14px; }
  th { padding: 0 12px 10px 0; font-size: 13px; font-weight: 500; text-align: left; color: var(--ink-2); white-space: nowrap; }
  td { padding: 10px 12px 10px 0; border-top: 1px solid var(--line); white-space: nowrap; }
  .plate { font-family: ui-monospace, Consolas, monospace; }
  .progress { display: flex; align-items: center; gap: 8px; min-width: 120px; }
  .progress .track { flex: 1; margin: 0; height: 6px; }
  .progress span { width: 38px; font-variant-numeric: tabular-nums; text-align: right; }
  .pill { display: inline-block; padding: 1px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .pill.go { color: #7dd3fc; background: rgba(56, 189, 248, .14); }
  .pill.done { color: #86efac; background: rgba(74, 222, 128, .14); }
  .pill.late { color: #fca5a5; background: rgba(248, 113, 113, .16); }

  .alerts { grid-column: 1 / -1; }
  .alerts ul { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0; padding: 0; list-style: none; }
  .alerts li { padding: 12px 14px 12px 16px; border-left: 3px solid var(--amber); border-radius: 8px; background: var(--panel-2); }
  .alerts li.ok { border-left-color: var(--green); }
  .alerts li.bad { border-left-color: var(--red); }
  .alerts strong { display: block; font-size: 14px; }
  .alerts p { font-size: 13px; color: var(--ink-2); }

  @media (max-width: 1000px) {
    .kpi { grid-column: span 6; }
    .wide, .side, .half, .rest { grid-column: 1 / -1; }
    .alerts ul { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .app { padding: 20px 16px 32px; }
    .kpi { grid-column: 1 / -1; }
  }
</style>
<style data-he-style="fx">/* Tactile 動態效果：依頁面中的 tfx-* 類別自動產生，請在編輯器的「動態效果」修改。 */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-in { syntax: "<integer>"; inherits: true; initial-value: 1; }</style>
<style data-he-style="fx-motion">/* Tactile 動態效果：依頁面中的 tfx-* 類別自動產生，請在編輯器的「動態效果」修改。 */
@media (prefers-reduced-motion: no-preference) {
  .tfx-h-lift { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1); }
  @media (hover: hover) {
    .tfx-h-lift:hover { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
  }
  .tfx-h-lift:is(:focus-visible, :focus-within) { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
  @media screen {
    @supports (animation-timeline: view()) {
      @keyframes tfx-grow { from { --tfx-in: 0; } to { --tfx-in: 1; } }
      .tfx-e-grow { animation: tfx-grow linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(30% + var(--tfx-t, 0) * 20%, 6rem + var(--tfx-t, 0) * 3rem) entry min(50% + var(--tfx-t, 0) * 20%, 10rem + var(--tfx-t, 0) * 3rem); }
      @container style(--tfx-in: 0) {
        .tfx-e-grow .tfx-bar { scale: 0 1; }
        .tfx-e-grow .tfx-bar-v { scale: 1 0; }
      }
      @container style(--tfx-in: 1) {
        @keyframes tfx-grow-x { from { scale: 0 1; transform-origin: 0 50%; } to { transform-origin: 0 50%; } }
        @keyframes tfx-grow-xe { from { scale: 0 1; transform-origin: 100% 50%; } to { transform-origin: 100% 50%; } }
        @keyframes tfx-grow-y { from { scale: 1 0; transform-origin: 50% 100%; } to { transform-origin: 50% 100%; } }
        @keyframes tfx-grow-ye { from { scale: 1 0; transform-origin: 50% 0; } to { transform-origin: 50% 0; } }
        .tfx-e-grow .tfx-bar { animation: tfx-grow-x .9s cubic-bezier(.22,1,.36,1) backwards; }
        .tfx-e-grow .tfx-bar.tfx-bar-end { animation-name: tfx-grow-xe; }
        .tfx-e-grow .tfx-bar-v { animation: tfx-grow-y .9s cubic-bezier(.22,1,.36,1) backwards; }
        .tfx-e-grow .tfx-bar-v.tfx-bar-end { animation-name: tfx-grow-ye; }
      }
    }
  }
}</style>
</head>
<body>
<main class="app">
  <header class="top">
    <div>
      <h1>北辰物流・每日營運看板</h1>
      <p class="updated">更新於 2026/12/07 14:30，資料每 15 分鐘同步一次</p>
    </div>
    <div class="range" role="group" aria-label="時間範圍">
      <button type="button" aria-pressed="true">今天</button>
      <button type="button" aria-pressed="false">本週</button>
      <button type="button" aria-pressed="false">本月</button>
    </div>
  </header>

  <div class="grid">
    <section class="card kpi tfx-h-lift">
      <h2>今日出貨</h2>
      <p class="value">12,480<small>件</small></p>
      <span class="delta good">▲ 8.4%</span><span>比上週同日</span>
    </section>
    <section class="card kpi tfx-h-lift">
      <h2>準時送達率</h2>
      <p class="value">97.3<small>%</small></p>
      <span class="delta good">▲ 0.6 個百分點</span><span>目標 97%</span>
    </section>
    <section class="card kpi tfx-h-lift">
      <h2>平均配送時間</h2>
      <p class="value">1.8<small>天</small></p>
      <span class="delta good">▼ 0.2 天</span><span>比上月</span>
    </section>
    <section class="card kpi tfx-h-lift">
      <h2>客訴件數</h2>
      <p class="value">23<small>件</small></p>
      <span class="delta bad">▲ 5 件</span><span>多為延誤</span>
    </section>

    <section class="card wide">
      <div class="card-head"><h2>近 14 天出貨量</h2><span>單位：千件</span></div>
      <div class="chart">
        <svg viewBox="0 0 560 200" preserveAspectRatio="none" role="img" aria-label="近 14 天出貨量折線圖，今天 12.5 千件為次高">
          <defs>
            <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#38bdf8" stop-opacity=".35"/>
              <stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <g stroke="#283344" stroke-width="1" vector-effect="non-scaling-stroke">
            <line x1="0" y1="12" x2="560" y2="12" vector-effect="non-scaling-stroke"/>
            <line x1="0" y1="56" x2="560" y2="56" vector-effect="non-scaling-stroke"/>
            <line x1="0" y1="100" x2="560" y2="100" vector-effect="non-scaling-stroke"/>
            <line x1="0" y1="144" x2="560" y2="144" vector-effect="non-scaling-stroke"/>
          </g>
          <path d="M0 95.6 L43.1 82.4 L86.2 67 L129.2 80.2 L172.3 113.2 L215.4 141.8 L258.5 58.2 L301.5 49.4 L344.6 62.6 L387.7 38.4 L430.8 53.8 L473.8 86.8 L516.9 122 L560 45.4 L560 200 L0 200 Z" fill="url(#dash-area)"/>
          <polyline points="0,95.6 43.1,82.4 86.2,67 129.2,80.2 172.3,113.2 215.4,141.8 258.5,58.2 301.5,49.4 344.6,62.6 387.7,38.4 430.8,53.8 473.8,86.8 516.9,122 560,45.4" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        </svg>
        <span class="y" style="top: 6%">14</span>
        <span class="y" style="top: 28%">12</span>
        <span class="y" style="top: 50%">10</span>
        <span class="y" style="top: 72%">8</span>
      </div>
      <div class="x"><span>11/24</span><span>11/28</span><span>12/02</span><span>今天</span></div>
    </section>

    <section class="card side">
      <div class="card-head"><h2>配送方式</h2><span>今日</span></div>
      <div class="donut">
        <svg viewBox="0 0 42 42" role="img" aria-label="宅配 58%、超商取貨 31%、門市自取 11%">
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#1e2734" stroke-width="6"/>
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#38bdf8" stroke-width="6" stroke-dasharray="58 42" stroke-dashoffset="25"/>
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#a78bfa" stroke-width="6" stroke-dasharray="31 69" stroke-dashoffset="67"/>
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#fbbf24" stroke-width="6" stroke-dasharray="11 89" stroke-dashoffset="36"/>
        </svg>
        <div>
          <p class="donut-total">12,480 件</p>
          <ul class="legend">
            <li><i style="background: #38bdf8"></i>宅配<b>58%</b></li>
            <li><i style="background: #a78bfa"></i>超商取貨<b>31%</b></li>
            <li><i style="background: #fbbf24"></i>門市自取<b>11%</b></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="card half">
      <div class="card-head"><h2>各區出貨</h2><span>件</span></div>
      <ul class="bars tfx-e-grow">
        <li><div class="row">北區<b>4,820</b></div><div class="track"><i style="width: 100%" class="tfx-bar"></i></div></li>
        <li><div class="row">南區<b>3,410</b></div><div class="track"><i style="width: 70.7%" class="tfx-bar"></i></div></li>
        <li><div class="row">中區<b>2,960</b></div><div class="track"><i style="width: 61.4%" class="tfx-bar"></i></div></li>
        <li><div class="row">東區<b>1,290</b></div><div class="track"><i style="width: 26.8%" class="tfx-bar"></i></div></li>
      </ul>
    </section>

    <section class="card rest">
      <div class="card-head"><h2>車隊狀態</h2><span>出勤中 5 台</span></div>
      <div class="table-wrap tfx-e-grow">
        <table>
          <thead><tr><th>車號</th><th>路線</th><th>進度</th><th>預計完成</th><th>狀態</th></tr></thead>
          <tbody>
            <tr><td class="plate">KLA-2081</td><td>台北 → 桃園</td><td><div class="progress"><div class="track"><i style="width: 80%" class="tfx-bar"></i></div><span>80%</span></div></td><td>15:10</td><td><span class="pill go">配送中</span></td></tr>
            <tr><td class="plate">KLB-3307</td><td>台中市區</td><td><div class="progress"><div class="track"><i style="width: 45%" class="tfx-bar"></i></div><span>45%</span></div></td><td>17:40</td><td><span class="pill go">配送中</span></td></tr>
            <tr><td class="plate">KLC-1150</td><td>高雄 → 屏東</td><td><div class="progress"><div class="track"><i style="width: 100%" class="tfx-bar"></i></div><span>100%</span></div></td><td>13:55</td><td><span class="pill done">已完成</span></td></tr>
            <tr><td class="plate">KLA-2214</td><td>新竹科學園區</td><td><div class="progress"><div class="track"><i style="width: 20%; background: #f87171" class="tfx-bar"></i></div><span>20%</span></div></td><td>18:30</td><td><span class="pill late">延誤</span></td></tr>
            <tr><td class="plate">KLD-0932</td><td>花蓮市區</td><td><div class="progress"><div class="track"><i style="width: 60%" class="tfx-bar"></i></div><span>60%</span></div></td><td>16:20</td><td><span class="pill go">配送中</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card alerts">
      <div class="card-head"><h2>今日提醒</h2><span>3 則</span></div>
      <ul>
        <li class="bad"><strong>新竹物流中心分揀機 B 線停機</strong><p>13:05 起停機約 30 分鐘，KLA-2214 出車延後。</p></li>
        <li><strong>國道一號北上車多</strong><p>楊梅到林口路段預估多 20 分鐘，已通知相關司機。</p></li>
        <li class="ok"><strong>冷鏈車溫度回報正常</strong><p>6 台冷鏈車整天維持在 2–6°C 之間。</p></li>
      </ul>
    </section>
  </div>
</main>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* 8. 報價單                                                           */
  /* ------------------------------------------------------------------ */

  const QUOTE = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>報價單 Q-2026-1207-03｜晴川咖啡信義店裝修工程</title>
<style>
  :root {
    color-scheme: light;
    --ink: #22252a;
    --ink-2: #555c66;
    --line: #dcdfe4;
    --bg: #e8eaed;
    --paper: #ffffff;
    --accent: #7a4b1f;
    --accent-soft: #f6efe7;
    --font: system-ui, -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 14.5px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  h1, h2, p { margin: 0; }
  .sheet { width: 100%; max-width: 210mm; min-height: 297mm; margin: 32px auto; padding: 18mm 16mm; background: var(--paper); box-shadow: 0 2px 10px rgba(34, 37, 42, .12); }

  .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px 32px; padding-bottom: 20px; border-bottom: 3px solid var(--accent); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand svg { flex: none; }
  .brand strong { display: block; font-size: 17px; }
  .brand span { font-size: 13px; color: var(--ink-2); }
  h1 { font-size: 30px; line-height: 1.2; letter-spacing: .3em; margin-right: -.3em; color: var(--accent); text-align: right; }
  .no { font-size: 13px; color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }

  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin: 24px 0; }
  .meta dl { display: grid; grid-template-columns: 72px 1fr; gap: 4px 12px; margin: 0; }
  .meta dt { color: var(--ink-2); }
  .meta dd { margin: 0; font-weight: 500; }

  h2 { margin: 28px 0 10px; font-size: 16px; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; min-width: 560px; border-collapse: collapse; }
  th { padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: left; color: var(--accent); background: var(--accent-soft); white-space: nowrap; }
  td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .n { width: 1%; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .item strong { display: block; font-weight: 600; }
  .item span { font-size: 13px; color: var(--ink-2); }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tfoot td { border-bottom: 0; padding: 6px 10px; }
  tfoot .label { text-align: right; color: var(--ink-2); }
  tfoot .total td { padding-top: 12px; border-top: 2px solid var(--ink); font-size: 18px; font-weight: 700; }
  tfoot .total .label { color: var(--ink); }
  .words { margin-top: 8px; text-align: right; font-size: 14px; color: var(--ink-2); }

  .terms { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 32px; }
  .pay { width: 100%; min-width: 0; font-size: 14px; }
  .pay td { padding: 6px 0; }
  .notes { margin: 0; padding-left: 1.3em; font-size: 14px; color: var(--ink-2); }
  .notes li + li { margin-top: 4px; }

  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; }
  .sign div { padding: 14px 16px; height: 120px; border: 1px dashed #b4b9c1; border-radius: 8px; font-size: 13px; color: var(--ink-2); }

  @media (max-width: 700px) {
    .sheet { min-height: 0; margin: 0; padding: 24px 16px 32px; box-shadow: none; }
    h1, .no { text-align: left; }
    .meta, .terms, .sign { grid-template-columns: 1fr; }
  }
  @media print {
    @page { size: A4; margin: 0; }
    body { background: #fff; }
    .sheet { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<article class="sheet">
  <header class="head">
    <div class="brand">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" rx="10" fill="#7a4b1f"/><path d="M12 32V16l10 8 10-8v16" fill="none" stroke="#f6efe7" stroke-width="3" stroke-linejoin="round"/></svg>
      <div><strong>木與光室內設計有限公司</strong><span>台北市大同區・info@muguang.example.com</span></div>
    </div>
    <div>
      <h1>報價單</h1>
      <p class="no">Q-2026-1207-03</p>
    </div>
  </header>

  <section class="meta">
    <dl>
      <dt>客戶</dt><dd>晴川咖啡股份有限公司</dd>
      <dt>聯絡人</dt><dd>張雅婷 經理</dd>
      <dt>工程地點</dt><dd>晴川咖啡 信義店（約 28 坪）</dd>
    </dl>
    <dl>
      <dt>報價日期</dt><dd>2026 年 12 月 7 日</dd>
      <dt>有效期限</dt><dd>2027 年 1 月 6 日</dd>
      <dt>承辦人</dt><dd>何柏均 設計師</dd>
    </dl>
  </section>

  <h2>報價明細</h2>
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th>#</th><th>項目與說明</th><th class="num">數量</th><th>單位</th><th class="num">單價</th><th class="num">小計</th></tr>
      </thead>
      <tbody>
        <tr><td class="n">1</td><td class="item"><strong>室內設計規劃</strong><span>平面配置、3D 模擬圖兩款、施工圖與材料表</span></td><td class="num">1</td><td>式</td><td class="num">68,000</td><td class="num">68,000</td></tr>
        <tr><td class="n">2</td><td class="item"><strong>拆除與清運</strong><span>原有隔間牆、天花板與地磚，含廢料清運</span></td><td class="num">1</td><td>式</td><td class="num">32,000</td><td class="num">32,000</td></tr>
        <tr><td class="n">3</td><td class="item"><strong>木作吧檯</strong><span>長 4.2 米，含人造石檯面、下櫃收納與層板</span></td><td class="num">1</td><td>式</td><td class="num">126,000</td><td class="num">126,000</td></tr>
        <tr><td class="n">4</td><td class="item"><strong>超耐磨木地板</strong><span>含防潮布、踢腳板與收邊條</span></td><td class="num">28</td><td>坪</td><td class="num">3,800</td><td class="num">106,400</td></tr>
        <tr><td class="n">5</td><td class="item"><strong>牆面與天花板塗裝</strong><span>批土整平，乳膠漆兩底兩度</span></td><td class="num">42</td><td>坪</td><td class="num">1,200</td><td class="num">50,400</td></tr>
        <tr><td class="n">6</td><td class="item"><strong>照明燈具與安裝</strong><span>軌道燈 24 盞、吧檯吊燈 6 盞，含配線</span></td><td class="num">1</td><td>式</td><td class="num">54,600</td><td class="num">54,600</td></tr>
      </tbody>
      <tfoot>
        <tr><td colspan="5" class="label">小計</td><td class="num">437,400</td></tr>
        <tr><td colspan="5" class="label">專案折讓</td><td class="num">−7,400</td></tr>
        <tr><td colspan="5" class="label">營業稅 5%</td><td class="num">21,500</td></tr>
        <tr class="total"><td colspan="5" class="label">總計（新台幣）</td><td class="num">451,500</td></tr>
      </tfoot>
    </table>
  </div>
  <p class="words">新台幣肆拾伍萬壹仟伍佰元整</p>

  <div class="terms">
    <section>
      <h2>付款方式</h2>
      <table class="pay">
        <tbody>
          <tr><td>簽約時</td><td class="num">30%</td><td class="num">135,450</td></tr>
          <tr><td>木作完成</td><td class="num">40%</td><td class="num">180,600</td></tr>
          <tr><td>驗收完成</td><td class="num">30%</td><td class="num">135,450</td></tr>
        </tbody>
      </table>
    </section>
    <section>
      <h2>備註</h2>
      <ol class="notes">
        <li>工期約 35 個工作天，自拆除開工日起算。</li>
        <li>大樓管理費、裝修保證金與夜間施工費用由業主負擔。</li>
        <li>報價未包含家具、咖啡設備與招牌。</li>
        <li>追加項目將另行報價，經雙方書面同意後施作。</li>
      </ol>
    </section>
  </div>

  <div class="sign">
    <div>報價單位簽章</div>
    <div>客戶確認簽章／日期</div>
  </div>
</article>
</body>
</html>
`;

  /* ------------------------------------------------------------------ */
  /* Registry                                                            */
  /* ------------------------------------------------------------------ */

  const list = [
    { key: 'sample', name: '範例：季度營運報告', description: '數據卡片、表格、長條圖與重點提示，適合先試試各種編輯操作。', html: QUARTERLY },
    { key: 'blank', name: '空白頁', description: '一個標題和一段文字，從零開始寫。', html: BLANK },
    { key: 'report', name: '文件：會議紀錄', description: '會議資訊、議程勾選、決議與附狀態標籤的待辦表。', html: MINUTES },
    { key: 'slides', name: '簡報：產品發表', description: '六張 16:9 投影片由上往下排列，大字標題與數字頁。', html: SLIDES },
    { key: 'landing', name: '網站：一頁式產品頁', description: '導覽列、主視覺、功能卡片、價格方案與常見問題。', html: LANDING },
    { key: 'article', name: '文件：研究報告', description: '像 Word 的長篇文件：摘要、編號標題、圖表與註釋。', html: ARTICLE },
    { key: 'dashboard', name: '數據：營運看板', description: '深色主題的 KPI 卡片、折線圖、圓環圖與車隊狀態表。', html: DASHBOARD },
    { key: 'quote', name: '文件：報價單', description: 'A4 報價單：品項明細、稅額與總計、付款條件和簽章欄。', html: QUOTE },
  ];

  // A blank page for readers of Simplified Chinese: the same page, its two sentences and its fonts in their writing.
  const BLANK_HANS = BLANK.replace('lang="zh-Hant"', 'lang="zh-Hans"').split('未命名文件').join('未命名文档')
    .replace('雙擊這段文字開始編輯。', '双击这段文字开始编辑。')
    .replace('"Noto Sans TC", "PingFang TC", "Microsoft JhengHei"', '"Noto Sans SC", "PingFang SC", "Microsoft YaHei"');
  // Every template says which language it is written in; the 新增 menu lists those of the interface language first.
  for (const item of list) item.lang = 'zh-Hant';
  list.push({ key: 'zh-hans-blank', lang: 'zh-Hans', name: '空白页', description: '一个标题和一段文字，从零开始写。', html: BLANK_HANS });

  HE.samples = {
    list,
    /** More templates, from another file: [{key, lang, name, description, html}]. */
    add(items) { for (const item of items) if (item && item.key && !list.some((s) => s.key === item.key)) list.push(item); },
    /** HTML of the sample with this key, or null. */
    get(key) {
      const item = list.find((s) => s.key === key);
      return item ? item.html : null;
    },
  };
})();
