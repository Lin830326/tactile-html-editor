/* Tactile — samples-zh-hans.js: starter documents written in Simplified Chinese, for readers in mainland China.
 *
 * The kinds of document that are common there: a year-end work report, a sales-event dashboard, a long article for
 * phones, a quotation with VAT and the amount in words, an invitation page. Amounts are in RMB, dates read 2026年10月15日.
 * They are not conversions of the Traditional Chinese templates. Companies, people, places and figures are made up;
 * no real brand or platform is named, no map is drawn, and IDs, account numbers and filing numbers are all zeros.
 * Each is a test case of tests/templates.spec.js as well.
 *
 * Effects were written by the editor itself, not by hand. The traceable report is the output of tactile-ingest fill
 * on ingest/examples/traceable-zh-hans/: do not edit its numbers or its source block here.
 */
(function () {
  'use strict';

  /* 示例：季度经营报告 */
  const REPORT = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云杉供应链 2026 年第三季度经营报告</title>
<style>
  :root {
    color-scheme: light;
    --ink: #121a2e;
    --ink-2: #434d63;
    --ink-3: #5c6679;
    --line: #dde2ec;
    --bg: #f3f5f9;
    --card: #ffffff;
    --brand: #1f5fbf;
    --brand-deep: #0d2038;
    --brand-soft: #e2edfb;
    --amber: #b86a0c;
    --amber-soft: #fdf3e1;
    --up: #0f7050;
    --down: #a83522;
    --radius: 14px;
    --shadow: 0 1px 2px rgba(18, 26, 46, .06), 0 12px 32px rgba(18, 26, 46, .08);
    --font: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 16px; line-height: 1.75; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, p { margin: 0; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

  .masthead {
    padding: 36px 0 120px;
    color: #e6eefa;
    background-color: var(--brand-deep);
    background-image:
      radial-gradient(circle at 85% 15%, rgba(72, 160, 255, .30), transparent 42%),
      linear-gradient(rgba(255, 255, 255, .045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, .045) 1px, transparent 1px);
    background-size: auto, 44px 44px, 44px 44px;
  }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; letter-spacing: .12em; color: #b5d0f5; }
  .brand svg { width: 30px; height: 30px; flex: none; }
  .masthead h1 { margin: 44px 0 14px; font-size: clamp(28px, 5vw, 46px); line-height: 1.25; color: #fff; }
  .subtitle { max-width: 36em; font-size: clamp(16px, 2.2vw, 18px); color: #c5d5ec; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 28px; margin-top: 28px; font-size: 14px; color: #a9bddb; }
  .meta strong { margin-left: 8px; font-weight: 500; color: #e6eefa; }

  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: -76px; }
  .kpi { padding: 20px 22px; background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); }
  .kpi-label { font-size: 14px; font-weight: 500; color: var(--ink-2); }
  .kpi-value { margin: 4px 0 10px; font-size: 32px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; }
  .kpi-value small { margin-left: 4px; font-size: 15px; font-weight: 500; color: var(--ink-3); }
  .delta { display: inline-flex; align-items: center; gap: 6px; padding: 1px 10px 1px 8px; border-radius: 999px; font-size: 13px; font-weight: 500; white-space: nowrap; color: var(--up); background: #e3f3eb; }
  .delta::before { content: ""; border: 5px solid transparent; border-top: 0; border-bottom: 7px solid currentColor; }
  .delta.down { color: var(--down); background: #fbe8e4; }
  .delta.down::before { border-bottom: 0; border-top: 7px solid currentColor; }

  .section { margin-top: 64px; }
  .eyebrow { margin-bottom: 8px; font-size: 13px; font-weight: 700; letter-spacing: .12em; color: var(--brand); }
  .section h2 { font-size: clamp(21px, 3vw, 27px); line-height: 1.4; }
  .section-lead { margin-top: 6px; color: var(--ink-2); }
  .intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 16px 56px; }
  .prose { color: var(--ink-2); }
  .prose p + p { margin-top: 14px; }
  .prose p:first-child { font-size: 17px; color: var(--ink); }

  .table-wrap { margin-top: 20px; overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
  table { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 15px; }
  th, td { padding: 14px 20px; text-align: left; border-bottom: 1px solid var(--line); }
  thead th { font-size: 13px; font-weight: 700; letter-spacing: .04em; color: var(--ink-3); background: #f7f8fc; white-space: nowrap; }
  tfoot td { font-weight: 700; background: #f7f8fc; border-bottom: 0; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td:first-child { white-space: nowrap; }
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
  .legend span::before { content: ""; width: 10px; height: 10px; border-radius: 3px; background: #b0cbf0; }
  .legend .q3::before { background: var(--brand); }
  .chart { display: block; width: 100%; max-width: 500px; height: auto; margin: 0 auto; }
  .highlights { display: grid; gap: 16px; margin: 16px 0 0; padding: 0; list-style: none; }
  .highlights li { position: relative; padding-left: 26px; color: var(--ink-2); line-height: 1.7; }
  .highlights li::before { content: ""; position: absolute; left: 0; top: .45em; width: 12px; height: 12px; border: 3px solid var(--brand); border-radius: 50%; background: var(--brand-soft); }
  .highlights strong { color: var(--ink); }

  .plan { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
  .plan .card { display: flex; flex-direction: column; }
  .step { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-bottom: 14px; border-radius: 50%; font-size: 14px; font-weight: 700; color: var(--brand); background: var(--brand-soft); }
  .plan .card p { margin-top: 8px; color: var(--ink-2); }
  .plan .card .owner { margin-top: auto; padding-top: 16px; font-size: 14px; color: var(--ink-3); }
  .owner span { display: block; }
  .owner strong { font-weight: 600; color: var(--ink); }

  .callout { margin-top: 48px; padding: 26px 30px; color: #5c4a2c; background: var(--amber-soft); border: 1px solid #efd5a5; border-left: 6px solid var(--amber); border-radius: var(--radius); }
  .callout h3 { font-size: 19px; color: #7a4a07; }
  .callout p { margin-top: 8px; }
  .callout ul { margin: 12px 0 0; padding-left: 1.3em; }
  .callout li + li { margin-top: 6px; }
  .callout li::marker { color: var(--amber); }

  .cta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 40px; }
  .btn { display: inline-flex; align-items: center; padding: 12px 28px; border-radius: 999px; background: var(--brand); color: #fff; font-weight: 700; text-decoration: none; box-shadow: 0 6px 16px rgba(31, 95, 191, .25); transition: background-color .15s, transform .15s; }
  .btn:hover { background: #184c9b; transform: translateY(-1px); }
  .cta-note { font-size: 14px; color: var(--ink-3); }
  .cta-note a { color: var(--brand); }

  footer { margin-top: 72px; padding: 28px 0 44px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-3); }
  footer .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 24px; }

  @media (max-width: 860px) {
    .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .intro, .split, .plan { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 480px) {
    .wrap { padding: 0 16px; }
    .masthead { padding-bottom: 104px; }
    .kpis { gap: 10px; }
    .kpi { padding: 16px 14px; }
    .kpi-value { font-size: 26px; }
    .kpi-value small { font-size: 14px; }
    .delta { padding: 1px 8px 1px 6px; gap: 5px; font-size: 12px; }
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
    <p class="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2f7be0"/><path d="M16 5l5 7h-2.6l4.6 6.5h-3l4 5.5H8l4-5.5H9l4.6-6.5H11z" fill="#fff"/><rect x="14.8" y="23" width="2.4" height="4" fill="#fff"/></svg>云杉供应链</p>
    <h1>2026 年第三季度经营报告</h1>
    <p class="subtitle">营业收入 4.82 亿元，同比增长 18.4%。华北区域分拨中心 8 月投入运营后，华北的增速高于其他三个区域；客户满意度升至 4.6 分（满分 5 分）。</p>
    <p class="meta"><span>发布日期<strong>2026年10月15日</strong></span><span>撰写<strong>财务与战略部 陆思敏</strong></span><span>数据期间<strong>2026年7月1日至9月30日</strong></span></p>
  </div>
</header>

<main class="wrap">
  <section class="kpis" aria-label="关键指标">
    <article class="kpi">
      <p class="kpi-label">营业收入</p>
      <p class="kpi-value">¥4.82<small>亿</small></p>
      <p class="delta">同比 +18.4%</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">订单量</p>
      <p class="kpi-value">1,284<small>万单</small></p>
      <p class="delta">同比 +12.6%</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">毛利率</p>
      <p class="kpi-value">21.4<small>%</small></p>
      <p class="delta down">环比 −0.8 百分点</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">客户满意度</p>
      <p class="kpi-value">4.6<small>/ 5</small></p>
      <p class="delta">环比 +0.2</p>
    </article>
  </section>

  <section class="section intro">
    <div>
      <p class="eyebrow">01 · 本季摘要</p>
      <h2>增长来自华北新仓与“定时达”服务</h2>
    </div>
    <div class="prose">
      <p>云杉供应链第三季度实现营业收入 4.82 亿元，同比增长 18.4%，环比增长 8.6%。增长主要来自两方面：华北区域分拨中心于 8 月 4 日投入运营，覆盖了此前无法当日送达的城区；面向连锁餐饮与生鲜门店的“定时达”服务，本季度新增签约客户 62 家。</p>
      <p>本季度毛利为 1.03 亿元，营业成本 3.79 亿元，毛利率 21.4%，环比下降 0.8 个百分点，原因是华北分拨中心在订单量爬坡阶段已开始承担租金与能耗。服务质量保持稳定：客户满意度升至 4.6 分，准时送达率为 98.2%。下文依次说明各区域业绩、月度走势与第四季度计划。</p>
    </div>
  </section>

  <section class="section" id="regions">
    <p class="eyebrow">02 · 分区域业绩</p>
    <h2>各区域营业收入与订单量</h2>
    <p class="section-lead">华北同比增长 31.3%，增速高于其他三个区域。</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>区域</th><th class="num">营业收入（万元）</th><th class="num">同比</th><th class="num">订单量（万单）</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr><td>华东</td><td class="num">21,200</td><td class="num pos">+14.6%</td><td class="num">548</td><td class="note">“定时达”新增签约客户 38 家</td></tr>
          <tr><td>华南</td><td class="num">13,900</td><td class="num pos">+17.8%</td><td class="num">372</td><td class="note">新开通 2 条夜间配送线路</td></tr>
          <tr class="is-highlight"><td>华北</td><td class="num">8,600</td><td class="num pos">+31.3%</td><td class="num">241</td><td class="note">区域分拨中心 8 月 4 日投入运营</td></tr>
          <tr><td>西南</td><td class="num">4,500</td><td class="num pos">+16.6%</td><td class="num">123</td><td class="note">冷藏车增至 86 辆</td></tr>
        </tbody>
        <tfoot>
          <tr><td>合计</td><td class="num">48,200</td><td class="num pos">+18.4%</td><td class="num">1,284</td><td class="note"></td></tr>
        </tfoot>
      </table>
    </div>
  </section>

  <section class="section">
    <p class="eyebrow">03 · 走势与亮点</p>
    <h2>连续六个月增长，9 月营业收入为年内单月新高</h2>
    <div class="split">
      <div class="card">
        <h3>月度营业收入（亿元）</h3>
        <p class="legend"><span class="q2">第二季度</span><span class="q3">第三季度</span></p>
        <svg class="chart" viewBox="0 0 360 232" role="img" aria-label="2026 年 4 月至 9 月的月度营业收入，单位亿元：1.44、1.48、1.52、1.55、1.60、1.67">
          <g stroke="#e3e7f0">
            <line x1="40" y1="16" x2="350" y2="16"/>
            <line x1="40" y1="62" x2="350" y2="62"/>
            <line x1="40" y1="108" x2="350" y2="108"/>
            <line x1="40" y1="154" x2="350" y2="154"/>
          </g>
          <g font-size="14" fill="#5c6679" text-anchor="end">
            <text x="32" y="21">2.0</text>
            <text x="32" y="67">1.5</text>
            <text x="32" y="113">1.0</text>
            <text x="32" y="159">0.5</text>
            <text x="32" y="205">0</text>
          </g>
          <g fill="#b0cbf0">
            <rect x="54" y="67.52" width="32" height="132.48" rx="3"/>
            <rect x="104" y="63.84" width="32" height="136.16" rx="3"/>
            <rect x="154" y="60.16" width="32" height="139.84" rx="3"/>
          </g>
          <g fill="#1f5fbf">
            <rect x="204" y="57.4" width="32" height="142.6" rx="3"/>
            <rect x="254" y="52.8" width="32" height="147.2" rx="3"/>
            <rect x="304" y="46.36" width="32" height="153.64" rx="3"/>
          </g>
          <line x1="40" y1="200" x2="350" y2="200" stroke="#98a2b8"/>
          <g font-size="14" font-weight="700" fill="#121a2e" text-anchor="middle">
            <text x="70" y="60.52">1.44</text>
            <text x="120" y="56.84">1.48</text>
            <text x="170" y="53.16">1.52</text>
            <text x="220" y="50.4">1.55</text>
            <text x="270" y="45.8">1.60</text>
            <text x="320" y="39.36">1.67</text>
          </g>
          <g font-size="14" fill="#434d63" text-anchor="middle">
            <text x="70" y="222">4月</text>
            <text x="120" y="222">5月</text>
            <text x="170" y="222">6月</text>
            <text x="220" y="222">7月</text>
            <text x="270" y="222">8月</text>
            <text x="320" y="222">9月</text>
          </g>
        </svg>
      </div>
      <div class="card">
        <h3>本季亮点</h3>
        <ul class="highlights">
          <li><strong>准时送达率 98.2%：</strong>环比提高 0.9 个百分点，夜间线路分担了早高峰的压力。</li>
          <li><strong>62 家客户签约“定时达”：</strong>该服务占本季度新签合约金额的 27%。</li>
          <li><strong>温控达标率 99.6%：</strong>冷藏车全程记录温度，异常时自动提醒调度员。</li>
          <li><strong>客服响应更快：</strong>首次响应时间的中位数由 3 小时 10 分钟降至 1 小时 48 分钟。</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section">
    <p class="eyebrow">04 · 下季度计划</p>
    <h2>第四季度的三项重点工作</h2>
    <p class="section-lead">第四季度营业收入目标：5.20 亿元，环比增长 7.9%。</p>
    <div class="plan">
      <article class="card">
        <span class="step">1</span>
        <h3>恢复毛利率</h3>
        <p>提高华北分拨中心的车辆装载率，合并 6 条重叠线路。目标：12 月毛利率回到 22.0%。</p>
        <p class="owner"><span>负责人：<strong>周立恒</strong></span><span>截止日期：2026年11月20日</span></p>
      </article>
      <article class="card">
        <span class="step">2</span>
        <h3>推出年度合约</h3>
        <p>客户预付全年配送费用可享 9.5 折，先在华东与华南试行，再推广到华北与西南。</p>
        <p class="owner"><span>负责人：<strong>沈雨桐</strong></span><span>截止日期：2026年10月31日</span></p>
      </article>
      <article class="card">
        <span class="step">3</span>
        <h3>扩充华北配送团队</h3>
        <p>新增 40 名配送员与 12 辆冷藏车，让华北客户的订单在下单当日送达。</p>
        <p class="owner"><span>负责人：<strong>贺明远</strong></span><span>截止日期：2026年12月12日</span></p>
      </article>
    </div>
  </section>

  <aside class="callout">
    <h3>风险提示</h3>
    <p>以下三项都可能使第四季度的结果变动 150 万元以上，管理团队每周跟进一次。</p>
    <ul>
      <li>两家连锁客户的年度合约将在 11 月到期，合计金额每年 3,100 万元；两家客户都要求先接入订单对账接口。</li>
      <li>燃油与电力价格如果上涨 5%，每季度的营业成本约增加 190 万元。</li>
      <li>在配送团队扩充完成前，华北新客户从签约到上线平均需要 23 天，其他区域为 14 天。</li>
    </ul>
  </aside>

  <div class="cta">
    <a class="btn" href="#regions">查看分区域明细</a>
    <p class="cta-note">如需完整数据，请发邮件至 <a href="mailto:finance@example.com">finance@example.com</a>，或致电 010-0000 0000（客服热线 400-000-0000）。</p>
  </div>
</main>

<footer>
  <div class="wrap">
    <p>© 2026 云杉供应链。本公司与全部数据均为虚构，仅作示例。</p>
    <p>内部资料，数据未经审计，截至2026年9月30日。</p>
  </div>
</footer>
</body>
</html>
`;

  /* 幻灯片：年终工作汇报 */
  const DECK = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2026 年度工作汇报 · 华东运营中心</title>
<style>
  :root {
    --navy: #0b1b4d;
    --ink: #0f1e46;
    --ink-2: #47536f;
    --paper: #f4f6fb;
    --card: #ffffff;
    --line: #d3daea;
    --gold: #ffc163;
    --orange: #f5851f;
    --orange-ink: #a94700;
    --blue: #2f55d4;
    --on-dark: #ffffff;
    --on-dark-2: #cbd5f5;
    --glass: rgba(255, 255, 255, .07);
    --hair: rgba(255, 255, 255, .24);
    --desk: #dfe4ef;
    --font: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 20px 72px; background: var(--desk); color: var(--ink); font-family: var(--font); -webkit-font-smoothing: antialiased; }

  /* 所有尺寸都用 cqw（幻灯片宽度的 1%），整张幻灯片按比例缩放，任何宽度下都保持 16:9。最小字号 1.65cqw：幻灯片宽 730px 时是 12px。 */
  .deck { display: grid; gap: 36px; max-width: 1120px; margin: 0 auto; container-type: inline-size; counter-reset: slide; }
  .slide {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    aspect-ratio: 16 / 9;
    padding: 4.2cqw 6cqw 5.2cqw;
    overflow: hidden;
    overflow: clip;
    color: var(--ink);
    background-color: var(--paper);
    border-radius: 8px;
    box-shadow: 0 18px 44px rgba(11, 27, 77, .22);
    counter-increment: slide;
  }
  .slide::before { content: ""; position: absolute; top: 0; left: 0; width: 1.1cqw; height: 100%; background: linear-gradient(180deg, var(--orange), var(--gold)); }
  .slide::after { content: "云杉供应链 · 华东运营中心 · " counter(slide, decimal-leading-zero); position: absolute; right: 6cqw; bottom: 1.9cqw; font-size: 1.65cqw; line-height: 1.2; font-weight: 700; letter-spacing: .08em; color: var(--ink-2); }
  .slide > * { position: relative; }
  .slide h1, .slide h2, .slide h3, .slide p, .slide ol, .slide ul { margin: 0; }
  .slide h2 { font-size: 3.5cqw; line-height: 1.2; font-weight: 800; letter-spacing: -.01em; }
  .slide h3 { font-size: 2.2cqw; line-height: 1.3; font-weight: 700; }
  .slide p { font-size: 1.8cqw; line-height: 1.5; color: var(--ink-2); }
  .slide .small { font-size: 1.65cqw; line-height: 1.45; }
  .slide .big { font-weight: 800; letter-spacing: -.02em; line-height: 1; color: var(--ink); white-space: nowrap; }
  .slide .unit { margin-left: .5cqw; font-size: max(.42em, 1.75cqw); letter-spacing: 0; }
  .slide .eyebrow { font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .18em; color: var(--orange-ink); }
  .slide strong { color: var(--ink); }
  .card { min-width: 0; padding: 2cqw 2.2cqw; border: 1px solid var(--line); border-radius: 1.2cqw; background: var(--card); }

  .slide.dark { color: var(--on-dark); background-color: var(--navy); background-image: radial-gradient(70% 90% at 100% 100%, rgba(70, 60, 200, .45), rgba(70, 60, 200, 0) 70%), linear-gradient(125deg, #071236 0%, #0d2266 46%, #262690 100%); box-shadow: 0 22px 54px rgba(11, 27, 77, .42); }
  .slide.dark::before { content: none; }
  .slide.dark::after { color: var(--on-dark-2); }
  .slide.dark p { color: var(--on-dark-2); }
  .slide.dark .big, .slide.dark strong { color: var(--on-dark); }
  .slide.dark .eyebrow { color: var(--gold); }
  .slide.dark .card { border-color: var(--hair); background: var(--glass); }

  /* 页眉：编号 + 标题 */
  .head { display: flex; align-items: flex-end; gap: 2.2cqw; padding-bottom: 1.5cqw; border-bottom: 1px solid var(--line); }
  .slide .head .no { font-size: 6.2cqw; line-height: .9; font-weight: 800; letter-spacing: -.03em; color: var(--orange-ink); }
  .slide .head h2 { margin-top: .5cqw; }
  .dark .head { border-bottom-color: var(--hair); }
  .slide.dark .head .no { color: var(--gold); }

  /* 1. 封面 */
  .slide-cover { padding: 4.6cqw 6cqw 4.6cqw; }
  .slide-cover::after, .slide-thanks::after { content: none; }
  .art { position: absolute; top: 0; right: 0; width: 56%; height: 100%; }
  .brand { display: flex; align-items: center; gap: 1.4cqw; }
  .brand svg { width: 3.6cqw; height: 3.6cqw; }
  .slide .brand-name { font-size: 2.1cqw; line-height: 1.2; font-weight: 700; letter-spacing: .06em; color: var(--on-dark); }
  .slide-cover .eyebrow { margin-top: auto; }
  .slide-cover h1 { margin-top: 1.4cqw; font-size: 9.6cqw; line-height: 1.08; font-weight: 800; letter-spacing: -.02em; }
  .slide-cover h1 span { color: var(--gold); }
  .slide .tagline { margin-top: 2cqw; font-size: 2.3cqw; line-height: 1.3; letter-spacing: .2em; color: var(--on-dark); }
  .cover-meta { display: flex; margin-top: auto; padding-top: 2cqw; border-top: 1px solid var(--hair); }
  .cover-meta div { padding: 0 3.4cqw; border-left: 1px solid var(--hair); }
  .cover-meta div:first-child { padding-left: 0; border-left: 0; }
  .slide .cover-meta .small { letter-spacing: .14em; }
  .slide .cover-meta .val { margin-top: .4cqw; font-size: 2.2cqw; line-height: 1.3; font-weight: 700; color: var(--on-dark); }

  /* 2. 目录 */
  .slide-toc { display: grid; grid-template-columns: 34cqw minmax(0, 1fr); padding: 0; }
  .slide-toc::before { content: none; }
  .toc-side { display: flex; flex-direction: column; justify-content: center; padding: 0 5cqw; color: var(--on-dark); background-color: var(--navy); background-image: linear-gradient(160deg, #071236 0%, #0d2266 50%, #2b2aa0 100%); }
  .slide .toc-side .eyebrow { color: var(--gold); }
  .slide .toc-side h2 { margin-top: 1cqw; font-size: 9cqw; line-height: 1.1; letter-spacing: .08em; }
  .toc-side i { display: block; width: 9cqw; height: .7cqw; margin-top: 2.4cqw; border-radius: .4cqw; background: linear-gradient(90deg, var(--orange), var(--gold)); }
  .slide .toc-side p:last-child { margin-top: 2.4cqw; color: var(--on-dark-2); }
  .slide .toc { display: grid; align-content: center; padding: 3cqw 6cqw 5cqw 5cqw; list-style: none; }
  .toc li { display: grid; grid-template-columns: 8cqw minmax(0, 1fr); align-items: center; padding: 1.5cqw 0; border-bottom: 1px solid var(--line); }
  .toc li:last-child { border-bottom: 0; }
  .slide .toc .no { font-size: 4.4cqw; line-height: 1; font-weight: 800; letter-spacing: -.03em; color: var(--orange-ink); }
  .slide .toc h3 { font-size: 2.6cqw; }
  .slide .toc .small { margin-top: .2cqw; }

  /* 3. 年度关键数据 */
  .kpi { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 7fr); gap: 4.4cqw; align-items: center; flex: 1; padding-top: 1.4cqw; }
  .slide .kpi-lead .big { margin-top: 1.2cqw; font-size: 7cqw; color: var(--gold); }
  .slide .kpi-lead h3 { font-size: 2.4cqw; }
  .slide .kpi-lead .note { margin-top: 1.4cqw; }
  .meter { position: relative; height: 1.6cqw; margin-top: 2.2cqw; border-radius: .8cqw; background: rgba(255, 255, 255, .16); }
  .meter span { display: block; width: 100%; height: 100%; border-radius: .8cqw; background: linear-gradient(90deg, var(--orange), var(--gold)); }
  .meter i { position: absolute; top: -.7cqw; left: 95.4%; width: .35cqw; height: 3cqw; background: var(--on-dark); }
  .slide .meter-note { margin-top: 1.2cqw; }
  .kpi-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.6cqw; }
  .slide .kpi-grid .card { padding: 1.7cqw 2.4cqw 1.6cqw; border-top: .5cqw solid var(--gold); }
  .slide .kpi-grid .big { font-size: 5.6cqw; }
  .slide .kpi-grid h3 { margin-top: 1cqw; font-size: 2.1cqw; }
  .slide .kpi-grid .small { margin-top: .3cqw; }
  .slide .up { font-weight: 700; color: var(--gold); }

  /* 4. 重点工作一 */
  .work { display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); gap: 3.6cqw; align-items: center; flex: 1; padding-top: 2cqw; }
  .slide .steps { display: grid; gap: 1.6cqw; padding: 0; list-style: none; }
  .steps li { display: grid; grid-template-columns: 3.6cqw minmax(0, 1fr); column-gap: 1.4cqw; align-items: start; }
  .slide .steps .dot { display: flex; align-items: center; justify-content: center; width: 3.6cqw; height: 3.6cqw; border-radius: 50%; font-size: 1.8cqw; line-height: 1; font-weight: 800; color: var(--on-dark); background: var(--navy); }
  .slide .steps p:last-child { margin-top: .3cqw; font-size: 1.75cqw; }
  .slide .meta { margin-top: 2cqw; padding-top: 1.3cqw; border-top: 1px solid var(--line); font-size: 1.65cqw; }
  .result { padding: 2.2cqw 2.6cqw; border-radius: 1.4cqw; color: var(--on-dark); background-color: var(--navy); background-image: linear-gradient(150deg, #0b1b4d, #2b2aa0); box-shadow: 0 1.6cqw 3.6cqw rgba(11, 27, 77, .3); }
  .slide .result .eyebrow { color: var(--gold); }
  .row { padding: 1.3cqw 0; border-bottom: 1px solid var(--hair); }
  .row:last-child { padding-bottom: 0; border-bottom: 0; }
  .slide .row p { color: var(--on-dark-2); }
  .change { display: flex; align-items: baseline; gap: 1.2cqw; margin-top: .5cqw; }
  .slide .change .from { font-size: 2.2cqw; line-height: 1; font-weight: 700; color: var(--on-dark-2); white-space: nowrap; }
  .slide .change .arrow { font-size: 2.2cqw; line-height: 1; font-weight: 700; color: var(--gold); }
  .slide .change .big { font-size: 4cqw; color: var(--gold); }

  /* 5. 重点工作二 */
  .trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2cqw; margin-top: 2.2cqw; }
  .slide .trio .card { padding: 1.8cqw 2.2cqw; border-top: .5cqw solid var(--orange); }
  .slide .trio p { margin-top: .5cqw; font-size: 1.7cqw; }
  .trio .change { margin-top: 1.2cqw; }
  .slide .trio .change .from { color: var(--ink-2); }
  .slide .trio .change .arrow { color: var(--orange-ink); }
  .slide .trio .change .big { font-size: 3.8cqw; color: var(--ink); }
  .saving { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3.4cqw; align-items: center; margin-top: auto; padding: 2cqw 2.6cqw; border-radius: 1.4cqw; color: var(--on-dark); background-color: var(--navy); background-image: linear-gradient(120deg, #0b1b4d, #2b2aa0); }
  .slide .saving p { color: var(--on-dark-2); }
  .slide .saving .big { margin-top: .5cqw; font-size: 5.6cqw; color: var(--gold); }
  .stack { display: flex; height: 3.6cqw; border-radius: .8cqw; overflow: hidden; }
  .slide .stack p { display: flex; align-items: center; justify-content: center; font-size: 1.8cqw; line-height: 1; font-weight: 800; color: #3a1c00; background: var(--gold); }
  .slide .stack .b { color: #ffffff; background: #4a62e0; }
  .slide .stack .c { color: #0b1b4d; background: #dfe6ff; }
  .legend { display: flex; flex-wrap: wrap; gap: .4cqw 2.4cqw; margin-top: 1.1cqw; }
  .slide .legend p { display: flex; align-items: center; gap: .7cqw; font-size: 1.65cqw; line-height: 1.3; }
  .legend i { width: 1.3cqw; height: 1.3cqw; border-radius: .3cqw; background: var(--gold); }
  .legend i.b { background: #4a62e0; }
  .legend i.c { background: #dfe6ff; }
  .legend i.l { height: .35cqw; border-radius: 0; background: #ffffff; }

  /* 6. 业绩趋势 */
  .trend { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); gap: 3.6cqw; align-items: center; flex: 1; padding-top: 1.4cqw; }
  .plot { position: relative; aspect-ratio: 5 / 2; }
  .plot svg { display: block; width: 100%; height: 100%; }
  .slide .plot p { position: absolute; width: 8.33%; margin-left: -4.165%; padding-bottom: .3cqw; text-align: center; font-size: 1.65cqw; line-height: 1.2; font-weight: 700; color: var(--on-dark); }
  .slide .plot p.peak { font-size: 2.1cqw; font-weight: 800; color: var(--gold); }
  .months { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); padding-top: .6cqw; text-align: center; }
  .slide .months p { font-size: 1.65cqw; line-height: 1.3; }
  .trend .legend { margin-top: 1.2cqw; }
  .quarters { display: grid; gap: .7cqw; }
  .quarters div { padding-left: 1.6cqw; border-left: .4cqw solid var(--hair); }
  .quarters div:last-child { border-left-color: var(--gold); }
  .slide .quarters .big { margin-top: .2cqw; font-size: 2.8cqw; }
  .slide .quarters .small { margin-top: .1cqw; line-height: 1.3; }

  /* 7. 问题与不足 */
  .issues { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2cqw; flex: 1; margin-top: 2.2cqw; }
  .slide .issue { display: flex; flex-direction: column; padding: 2.2cqw 2.4cqw 1.8cqw; border-top: .5cqw solid var(--orange); }
  .slide .issue .big { font-size: 6cqw; color: var(--orange-ink); }
  .slide .issue h3 { margin-top: 1.4cqw; font-size: 2.4cqw; }
  .slide .issue p { margin-top: .8cqw; font-size: 1.85cqw; }
  .slide .issue .fix { margin-top: auto; padding-top: 1cqw; border-top: 1px dashed var(--line); font-size: 1.65cqw; line-height: 1.45; }

  /* 8. 经验与反思 */
  .lessons { display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); gap: 3.6cqw; align-items: center; flex: 1; padding-top: 2cqw; }
  .slide .lesson-list { display: grid; gap: 1.5cqw; padding: 0; list-style: none; }
  .lesson-list li { padding: 0 0 1.5cqw 2cqw; border-left: .5cqw solid var(--orange); border-bottom: 1px solid var(--line); }
  .lesson-list li:last-child { padding-bottom: 0; border-bottom: 0; }
  .slide .lesson-list p { margin-top: .4cqw; font-size: 1.75cqw; }
  .quote { padding: 2.6cqw 3cqw 3cqw; border-radius: 1.4cqw; color: var(--on-dark); background-color: var(--navy); background-image: linear-gradient(150deg, #0b1b4d, #2b2aa0); box-shadow: 0 1.6cqw 3.6cqw rgba(11, 27, 77, .3); }
  .quote svg { display: block; width: 6cqw; height: 4.5cqw; }
  .slide .quote .say { margin-top: 1.6cqw; font-size: 3.1cqw; line-height: 1.4; font-weight: 800; color: var(--on-dark); }
  .slide .quote .say span { color: var(--gold); }
  .slide .quote .by { margin-top: 2cqw; padding-top: 1.4cqw; border-top: 1px solid var(--hair); font-size: 1.65cqw; color: var(--on-dark-2); }

  /* 9. 2027 年工作计划 */
  .goals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2cqw; margin-top: 2.2cqw; }
  .slide .goal { padding: 1.7cqw 2.2cqw; border-top: .5cqw solid var(--navy); }
  .slide .goal .big { margin-top: .8cqw; font-size: 5cqw; }
  .slide .goal p:last-child { margin-top: .9cqw; font-size: 1.65cqw; line-height: 1.45; }
  .slide .timeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: auto; padding: 0; list-style: none; }
  .timeline li { position: relative; padding: 2.6cqw 2cqw 0 0; }
  .timeline li::before { content: ""; position: absolute; top: .65cqw; left: 0; width: 100%; height: .3cqw; background: var(--line); }
  .timeline li::after { content: ""; position: absolute; top: 0; left: 0; width: 1.6cqw; height: 1.6cqw; border: .4cqw solid var(--orange); border-radius: 50%; background: var(--paper); }
  .slide .timeline h3 { font-size: 2cqw; color: var(--orange-ink); }
  .slide .timeline p { margin-top: .2cqw; font-size: 1.65cqw; line-height: 1.45; }

  /* 10. 致谢 */
  .slide-thanks { justify-content: center; }
  .slide-thanks h2 { margin-top: 1.4cqw; font-size: 15cqw; line-height: 1.05; letter-spacing: .06em; }
  .slide-thanks h2 span { color: var(--gold); }
  .slide .thanks-note { margin-top: 1.6cqw; font-size: 2.6cqw; line-height: 1.4; color: var(--on-dark); }
  .slide .thanks-contact { margin-top: 3.4cqw; padding-top: 1.8cqw; max-width: 52cqw; border-top: 1px solid var(--hair); font-size: 1.8cqw; }

  @media (max-width: 800px) {
    body { padding: 16px 12px 40px; }
    .deck { gap: 18px; }
    .slide { border-radius: 6px; }
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

<section class="slide dark slide-cover">
  <svg class="art" viewBox="0 0 800 720" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="deck-bar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffc163"/>
        <stop offset="1" stop-color="#f5851f" stop-opacity=".15"/>
      </linearGradient>
      <linearGradient id="deck-bar-2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ea2ff" stop-opacity=".75"/>
        <stop offset="1" stop-color="#8ea2ff" stop-opacity=".05"/>
      </linearGradient>
    </defs>
    <g fill="none" stroke="#ffffff">
      <circle cx="560" cy="330" r="130" stroke-opacity=".3" stroke-width="1.5"/>
      <circle cx="560" cy="330" r="230" stroke-opacity=".22" stroke-width="1.5"/>
      <circle cx="560" cy="330" r="340" stroke-opacity=".16" stroke-width="1.5"/>
      <circle cx="560" cy="330" r="460" stroke-opacity=".1" stroke-width="1.5"/>
    </g>
    <path d="M330 330A230 230 0 0 1 560 100" fill="none" stroke="#ffc163" stroke-width="7" stroke-linecap="round"/>
    <circle cx="560" cy="100" r="13" fill="#ffc163"/>
    <circle cx="740" cy="110" r="8" fill="#ffffff" fill-opacity=".8"/>
    <circle cx="300" cy="560" r="6" fill="#ffffff" fill-opacity=".6"/>
    <rect x="300" y="560" width="62" height="160" rx="6" fill="url(#deck-bar-2)"/>
    <rect x="386" y="500" width="62" height="220" rx="6" fill="url(#deck-bar-2)"/>
    <rect x="472" y="430" width="62" height="290" rx="6" fill="url(#deck-bar-2)"/>
    <rect x="558" y="350" width="62" height="370" rx="6" fill="url(#deck-bar-2)"/>
    <rect x="644" y="250" width="62" height="470" rx="6" fill="url(#deck-bar)"/>
    <path d="M331 520L417 462L503 392L589 312L675 206" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="#0d2266" stroke="#ffffff" stroke-width="4">
      <circle cx="331" cy="520" r="8"/>
      <circle cx="417" cy="462" r="8"/>
      <circle cx="503" cy="392" r="8"/>
      <circle cx="589" cy="312" r="8"/>
    </g>
    <circle cx="675" cy="206" r="24" fill="#ffc163" fill-opacity=".3"/>
    <circle cx="675" cy="206" r="12" fill="#ffc163"/>
  </svg>
  <div class="brand">
    <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 2L27 13H22L30 23H24L32 32H4L12 23H6L14 13H9Z" fill="#ffc163"/></svg>
    <p class="brand-name">云杉供应链 · 华东运营中心</p>
  </div>
  <p class="eyebrow">ANNUAL WORK REPORT</p>
  <h1>2026 年度<br><span>工作汇报</span></h1>
  <p class="tagline">稳履约 · 降成本 · 提周转</p>
  <div class="cover-meta">
    <div><p class="small">汇报人</p><p class="val">林知远</p></div>
    <div><p class="small">部门</p><p class="val">华东运营中心</p></div>
    <div><p class="small">日期</p><p class="val">2026年12月28日</p></div>
  </div>
</section>

<section class="slide slide-toc">
  <div class="toc-side">
    <p class="eyebrow">CONTENTS</p>
    <h2>目录</h2>
    <i></i>
    <p class="small">五个部分，约 15 分钟</p>
  </div>
  <ol class="toc">
    <li><p class="no">01</p><div><h3>年度关键数据</h3><p class="small">四个数字概览全年结果</p></div></li>
    <li><p class="no">02</p><div><h3>重点工作</h3><p class="small">智能仓网升级 · 干线运输降本</p></div></li>
    <li><p class="no">03</p><div><h3>业绩趋势</h3><p class="small">12 个月营业收入与季度同比</p></div></li>
    <li><p class="no">04</p><div><h3>问题与反思</h3><p class="small">三点不足与三条经验</p></div></li>
    <li><p class="no">05</p><div><h3>2027 年工作计划</h3><p class="small">三个目标与季度节奏</p></div></li>
  </ol>
</section>

<section class="slide dark">
  <div class="head"><p class="no">01</p><div><p class="eyebrow">年度关键数据</p><h2>四个数字，看清 2026 年</h2></div></div>
  <div class="kpi">
    <div class="kpi-lead">
      <h3>年度营业收入完成率</h3>
      <p class="big">104.8%</p>
      <div class="meter"><span></span><i></i></div>
      <p class="small meter-note">白线为年度目标 <strong>¥4.60 亿</strong>，实际完成 <strong>¥4.82 亿</strong>；上年为 ¥4.07 亿。</p>
      <p class="small note">数据截至 2026年12月25日，12 月为预估值。</p>
    </div>
    <div class="kpi-grid">
      <div class="card"><p class="big">¥4.82<span class="unit">亿</span></p><h3>营业收入</h3><p class="small">同比 <span class="up">+18.4%</span></p></div>
      <div class="card"><p class="big">96.3<span class="unit">%</span></p><h3>订单履约准时率</h3><p class="small">同比 <span class="up">+2.1 个百分点</span></p></div>
      <div class="card"><p class="big">2,120<span class="unit">万元</span></p><h3>全年降本金额</h3><p class="small">单票成本同比 <span class="up">-9.5%</span></p></div>
      <div class="card"><p class="big">31<span class="unit">天</span></p><h3>库存周转天数</h3><p class="small">同比 <span class="up">减少 6 天</span></p></div>
    </div>
  </div>
</section>

<section class="slide">
  <div class="head"><p class="no">02</p><div><p class="eyebrow">重点工作一</p><h2>华东智能仓网升级</h2></div></div>
  <div class="work">
    <div>
      <ol class="steps">
        <li><p class="dot">1</p><div><h3>自动分拣线改造</h3><p>苏州、杭州、合肥 3 个区域仓新增 6 条自动分拣线，替换人工分拣。</p></div></li>
        <li><p class="dot">2</p><div><h3>仓储管理系统统一</h3><p>三仓共用一套库位与波次规则，跨仓调拨由 2 天缩短到当天完成。</p></div></li>
        <li><p class="dot">3</p><div><h3>库存前置</h3><p>依据销量预测，把 420 个高频品类前置到近端仓。</p></div></li>
      </ol>
      <p class="meta"><strong>项目负责人</strong> 周明岚　<strong>周期</strong> 2026年3月至9月　<strong>投入</strong> 1,480 万元</p>
    </div>
    <div class="result">
      <p class="eyebrow">项目成果</p>
      <div class="row"><p class="small">日均处理量（+32%）</p><div class="change"><p class="from">14.1 万单</p><p class="arrow">→</p><p class="big">18.6<span class="unit">万单</span></p></div></div>
      <div class="row"><p class="small">错发率</p><div class="change"><p class="from">0.12%</p><p class="arrow">→</p><p class="big">0.05<span class="unit">%</span></p></div></div>
      <div class="row"><p class="small">库存周转天数</p><div class="change"><p class="from">37 天</p><p class="arrow">→</p><p class="big">31<span class="unit">天</span></p></div></div>
    </div>
  </div>
</section>

<section class="slide">
  <div class="head"><p class="no">02</p><div><p class="eyebrow">重点工作二</p><h2>干线运输降本</h2></div></div>
  <div class="trio">
    <div class="card"><h3>干线线路整合</h3><p>合并重叠线路，低货量线路改为拼车发运。</p><div class="change"><p class="from">46 条</p><p class="arrow">→</p><p class="big">38<span class="unit">条</span></p></div></div>
    <div class="card"><h3>车辆装载率</h3><p>上线配载测算工具，发车前按体积与重量排车。</p><div class="change"><p class="from">78%</p><p class="arrow">→</p><p class="big">87<span class="unit">%</span></p></div></div>
    <div class="card"><h3>循环包材占比</h3><p>周转箱替换一次性纸箱，先覆盖三仓之间的调拨。</p><div class="change"><p class="from">22%</p><p class="arrow">→</p><p class="big">41<span class="unit">%</span></p></div></div>
  </div>
  <div class="saving">
    <div><p class="small">全年降本金额</p><p class="big">2,120<span class="unit">万元</span></p></div>
    <div>
      <div class="stack"><p style="width: 63.7%">1,350</p><p class="b" style="width: 24.5%">520</p><p class="c" style="width: 11.8%">250</p></div>
      <div class="legend"><p><i></i>运输 1,350 万元</p><p><i class="b"></i>仓储 520 万元</p><p><i class="c"></i>包材 250 万元</p></div>
      <p class="small" style="margin-top: .9cqw">单票物流成本由 ¥9.5 降到 ¥8.6，同比 -9.5%。项目负责人：陈嘉禾。</p>
    </div>
  </div>
</section>

<section class="slide dark">
  <div class="head"><p class="no">03</p><div><p class="eyebrow">业绩趋势</p><h2>营业收入逐季走高，11 月出现全年峰值</h2></div></div>
  <div class="trend">
    <div>
      <div class="plot">
        <svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="deck-col" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#8ea2ff"/>
              <stop offset="1" stop-color="#4a62e0" stop-opacity=".55"/>
            </linearGradient>
            <linearGradient id="deck-col-peak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffc163"/>
              <stop offset="1" stop-color="#f5851f"/>
            </linearGradient>
          </defs>
          <g stroke="#ffffff" stroke-opacity=".14" stroke-width="1">
            <line x1="0" y1="66.7" x2="1200" y2="66.7"/>
            <line x1="0" y1="133.3" x2="1200" y2="133.3"/>
            <line x1="0" y1="200" x2="1200" y2="200"/>
            <line x1="0" y1="266.7" x2="1200" y2="266.7"/>
            <line x1="0" y1="333.3" x2="1200" y2="333.3"/>
          </g>
          <g fill="url(#deck-col)">
            <rect x="22" y="180" width="56" height="220" rx="5"/>
            <rect x="122" y="193.3" width="56" height="206.7" rx="5"/>
            <rect x="222" y="146.7" width="56" height="253.3" rx="5"/>
            <rect x="322" y="160" width="56" height="240" rx="5"/>
            <rect x="422" y="153.3" width="56" height="246.7" rx="5"/>
            <rect x="522" y="126.7" width="56" height="273.3" rx="5"/>
            <rect x="622" y="140" width="56" height="260" rx="5"/>
            <rect x="722" y="133.3" width="56" height="266.7" rx="5"/>
            <rect x="822" y="120" width="56" height="280" rx="5"/>
            <rect x="922" y="106.7" width="56" height="293.3" rx="5"/>
            <rect x="1122" y="100" width="56" height="300" rx="5"/>
          </g>
          <rect x="1022" y="26.7" width="56" height="373.3" rx="5" fill="url(#deck-col-peak)"/>
          <path d="M50 200L150 220L250 173.3L350 193.3L450 186.7L550 166.7L650 180L750 173.3L850 160L950 160L1050 113.3L1150 160" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="8 6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
          <line x1="0" y1="399" x2="1200" y2="399" stroke="#ffffff" stroke-opacity=".6" stroke-width="2"/>
        </svg>
        <p style="left: 4.17%; bottom: 55%">0.33</p>
        <p style="left: 12.5%; bottom: 51.7%">0.31</p>
        <p style="left: 20.83%; bottom: 63.3%">0.38</p>
        <p style="left: 29.17%; bottom: 60%">0.36</p>
        <p style="left: 37.5%; bottom: 61.7%">0.37</p>
        <p style="left: 45.83%; bottom: 68.3%">0.41</p>
        <p style="left: 54.17%; bottom: 65%">0.39</p>
        <p style="left: 62.5%; bottom: 66.7%">0.40</p>
        <p style="left: 70.83%; bottom: 70%">0.42</p>
        <p style="left: 79.17%; bottom: 73.3%">0.44</p>
        <p class="peak" style="left: 87.5%; bottom: 93.3%">0.56</p>
        <p style="left: 95.83%; bottom: 75%">0.45</p>
      </div>
      <div class="months"><p>1月</p><p>2月</p><p>3月</p><p>4月</p><p>5月</p><p>6月</p><p>7月</p><p>8月</p><p>9月</p><p>10月</p><p>11月</p><p>12月</p></div>
      <div class="legend"><p><i class="b"></i>2026 年月度营业收入（亿元）</p><p><i class="l"></i>2025 年同期</p><p><i></i>11 月峰值，环比 +27.3%</p></div>
    </div>
    <div class="quarters">
      <div><p class="small">一季度</p><p class="big">¥1.02<span class="unit">亿</span></p><p class="small">同比 <span class="up">+12.1%</span></p></div>
      <div><p class="small">二季度</p><p class="big">¥1.14<span class="unit">亿</span></p><p class="small">同比 <span class="up">+16.3%</span></p></div>
      <div><p class="small">三季度</p><p class="big">¥1.21<span class="unit">亿</span></p><p class="small">同比 <span class="up">+17.5%</span></p></div>
      <div><p class="small">四季度</p><p class="big">¥1.45<span class="unit">亿</span></p><p class="small">同比 <span class="up">+26.1%</span>，环比 <span class="up">+19.8%</span></p></div>
    </div>
  </div>
</section>

<section class="slide">
  <div class="head"><p class="no">04</p><div><p class="eyebrow">问题与不足</p><h2>三个没有做好的地方</h2></div></div>
  <div class="issues">
    <div class="card issue"><p class="big">89.4<span class="unit">%</span></p><h3>高峰期履约承压</h3><p>11 月履约准时率降到 89.4%，比全年均值低 6.9 个百分点；有 3 天单日延迟发货超过 2 万单。</p><p class="fix"><strong>原因：</strong>临时运力比计划晚两周锁定。</p></div>
    <div class="card issue"><p class="big">0.21<span class="unit">%</span></p><h3>新系统培训不到位</h3><p>苏州仓分拣系统上线首月，错发率由 0.12% 升到 0.21%，6 周后才回落。</p><p class="fix"><strong>原因：</strong>培训只覆盖班组长，没有覆盖夜班一线员工。</p></div>
    <div class="card issue"><p class="big">58<span class="unit">%</span></p><h3>客户集中度偏高</h3><p>前 5 大客户贡献收入 58%，约 ¥2.80 亿；新客户签约 14 家，只完成计划 20 家的 70%。</p><p class="fix"><strong>原因：</strong>销售与运营没有共用同一份客户开发清单。</p></div>
  </div>
</section>

<section class="slide">
  <div class="head"><p class="no">04</p><div><p class="eyebrow">经验与反思</p><h2>这一年学到的三件事</h2></div></div>
  <div class="lessons">
    <ol class="lesson-list">
      <li><h3>数据先行</h3><p>每周运营例会只看同一张数据看板，问题的平均发现时间由 5 天缩短到 2 天。</p></li>
      <li><h3>先试点，再推广</h3><p>智能分拣先在苏州仓试点 3 个月，杭州、合肥两个仓的上线周期因此缩短 40%。</p></li>
      <li><h3>复盘要落到岗位和流程</h3><p>11 月高峰的复盘只做到部门层面，没有落到具体岗位，这是明年要补的一课。</p></li>
    </ol>
    <div class="quote">
      <svg viewBox="0 0 60 45" aria-hidden="true"><path d="M0 45V26C0 11 8 2 24 0V9C16 11 12 16 12 23H24V45ZM34 45V26C34 11 42 2 58 0V9C50 11 46 16 46 23H58V45Z" fill="#ffc163"/></svg>
      <p class="say">把每一次延误，都当作一份<span>可以复盘的数据</span>。</p>
      <p class="by">华东运营中心 · 2026 年度复盘会共识</p>
    </div>
  </div>
</section>

<section class="slide">
  <div class="head"><p class="no">05</p><div><p class="eyebrow">2027 年工作计划</p><h2>三个目标，按季度推进</h2></div></div>
  <div class="goals">
    <div class="card goal"><p class="eyebrow">目标一 · 增长</p><p class="big">¥5.60<span class="unit">亿</span></p><p><strong>营业收入</strong>同比 +16.2%。衡量指标：每个季度的完成率不低于 95%。</p></div>
    <div class="card goal"><p class="eyebrow">目标二 · 履约</p><p class="big">97.5<span class="unit">%</span></p><p><strong>履约准时率</strong>全年达到 97.5%。衡量指标：高峰期不低于 94%。</p></div>
    <div class="card goal"><p class="eyebrow">目标三 · 客户结构</p><p class="big">≤50<span class="unit">%</span></p><p><strong>前 5 大客户收入占比</strong>降到 50% 以内。衡量指标：新签客户 24 家。</p></div>
  </div>
  <ol class="timeline">
    <li><h3>一季度</h3><p>高峰运力预案定稿；完成全员系统培训。</p></li>
    <li><h3>二季度</h3><p>合肥仓二期投产；新签客户 8 家。</p></li>
    <li><h3>三季度</h3><p>干线线路二次整合；装载率达到 89%。</p></li>
    <li><h3>四季度</h3><p>高峰保障；年度复盘落到岗位与流程。</p></li>
  </ol>
</section>

<section class="slide dark slide-thanks">
  <svg class="art" viewBox="0 0 800 720" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <g fill="none" stroke="#ffffff">
      <circle cx="600" cy="360" r="120" stroke-opacity=".3" stroke-width="1.5"/>
      <circle cx="600" cy="360" r="220" stroke-opacity=".22" stroke-width="1.5"/>
      <circle cx="600" cy="360" r="330" stroke-opacity=".16" stroke-width="1.5"/>
      <circle cx="600" cy="360" r="450" stroke-opacity=".1" stroke-width="1.5"/>
    </g>
    <path d="M380 360A220 220 0 0 1 600 140" fill="none" stroke="#ffc163" stroke-width="7" stroke-linecap="round"/>
    <path d="M820 360A220 220 0 0 1 600 580" fill="none" stroke="#8ea2ff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="600" cy="140" r="13" fill="#ffc163"/>
    <circle cx="600" cy="580" r="10" fill="#8ea2ff"/>
    <circle cx="600" cy="360" r="46" fill="#ffc163" fill-opacity=".2"/>
    <path d="M600 326L618 348H608L624 368H612L628 388H572L588 368H576L592 348H582Z" fill="#ffc163"/>
  </svg>
  <p class="eyebrow">THANK YOU</p>
  <h2>谢谢<span>。</span></h2>
  <p class="thanks-note">敬请各位领导、同事批评指正</p>
  <p class="thanks-contact"><strong>林知远</strong> · 华东运营中心负责人<br>zhiyuan.lin@example.com · 2026年12月28日</p>
</section>

</main>
</body>
</html>
`;

  /* 报告：可追溯的经营报告 */
  const TRACEABLE = `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云杉供应链 — 季度经营报告</title>
<style>
  :root { --ink: #16203a; --muted: #4d5a75; --line: #dde2ec; --line-strong: #16203a; --accent: #2447a8; --accent-soft: #e9eefb; --paper: #ffffff; --tactile-chart-surface: #ffffff; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.7 "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif; color: var(--ink); background: var(--paper); -webkit-text-size-adjust: 100%; }
  main { max-width: 960px; margin: 0 auto; padding: 56px 32px 64px; }

  .masthead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 32px; padding-bottom: 24px; border-bottom: 2px solid var(--accent); }
  .brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; line-height: 1.3; }
  .brand svg { flex: none; width: 32px; height: 32px; color: var(--accent); }
  h1 { margin: 0; font-size: 22px; font-weight: 500; line-height: 1.4; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 28px; margin: 16px 0 32px; padding: 0; list-style: none; font-size: 14px; color: var(--muted); }
  .meta b { margin-right: 6px; font-weight: 600; color: var(--ink); }

  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 0 0 36px; }
  .card { padding: 20px 22px; border: 1px solid var(--line); border-top: 3px solid var(--accent); border-radius: 8px; background: var(--paper); }
  .card .label { margin: 0 0 6px; font-size: 15px; font-weight: 500; color: var(--muted); }
  .card .value { margin: 0; font-size: 34px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .card .value small { margin-left: 6px; font-size: 16px; font-weight: 500; color: var(--muted); }
  .card .change { display: flex; flex-wrap: wrap; gap: 2px 18px; margin: 10px 0 0; font-size: 14px; color: var(--muted); }
  .card .change span { white-space: nowrap; }
  .up { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }

  section { margin: 0 0 40px; }
  h2.section { margin: 0 0 12px; padding-left: 10px; border-left: 4px solid var(--accent); font-size: 18px; font-weight: 700; line-height: 1.3; }
  p { margin: 0 0 14px; }
  .prose p { max-width: 800px; font-size: 17px; }
  .figure-inline { padding: 1px 6px; border-radius: 4px; background: var(--accent-soft); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  caption { caption-side: top; text-align: left; padding: 0 0 8px; font-size: 14px; color: var(--muted); }
  th, td { padding: 11px 12px; text-align: right; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; padding-left: 0; }
  th:last-child, td:last-child { padding-right: 0; }
  thead th { font-size: 14px; font-weight: 700; border-bottom: 1.5px solid var(--line-strong); }
  tbody th { font-weight: 400; }
  .total th, .total td { font-weight: 700; border-top: 1.5px solid var(--line-strong); }
  .sub th, .sub td { font-weight: 700; }
  .ratio th, .ratio td { color: var(--muted); }
  td.up { font-weight: 600; }
  table.wide { min-width: 620px; }
  table.mid { min-width: 520px; }

  .charts { display: grid; gap: 24px; }
  figure { margin: 0; min-width: 0; padding: 20px 22px 16px; border: 1px solid var(--line); border-radius: 8px; }
  figcaption { margin: 0 0 8px; font-weight: 700; }
  figcaption small { display: block; font-size: 14px; font-weight: 400; color: var(--muted); }
  .chart-scroll { overflow-x: auto; }
  .chart-scroll > div { min-width: 640px; max-width: 720px; margin: 0 auto; }
  .chart-scroll svg { display: block; width: 100%; }

  .notes { padding-top: 20px; border-top: 1px solid var(--line); font-size: 14px; color: var(--muted); }
  .notes h2 { margin: 0 0 8px; font-size: 14px; font-weight: 700; color: var(--ink); }
  .notes ul { margin: 0 0 14px; padding-left: 18px; }
  .notes li { margin: 0 0 4px; }
  footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
  footer p { margin: 0 0 4px; }

  @media (max-width: 820px) {
    main { padding: 40px 24px 48px; }
    .cards { gap: 14px; }
    .card { padding: 16px; }
    .card .value { font-size: 28px; }
    .card .value small { font-size: 14px; }
  }
  @media (max-width: 600px) {
    main { padding: 28px 16px 40px; }
    .brand { font-size: 22px; }
    h1 { font-size: 19px; }
    .cards { grid-template-columns: 1fr; }
    .card .value { font-size: 32px; }
    .prose p { font-size: 16px; }
    figure { padding: 16px 14px 12px; }
    th, td { padding: 10px 6px; font-size: 14px; }
    thead th { font-size: 13px; }
  }
</style>
</head>
<body>
<main>
  <header class="masthead">
    <div class="brand">
      <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M16 3 28 9.5v13L16 29 4 22.5v-13zM4 9.5 16 16l12-6.5M16 16v13"/></svg>
      <span data-fact="2026Q3.xlsx/利润表/A1">云杉供应链</span>
    </div>
    <h1><span data-fact="2026Q3.xlsx/利润表/D9">2026年三季度</span>经营报告</h1>
  </header>

  <ul class="meta">
    <li><b>报表</b><span data-fact="2026Q3.xlsx/利润表/B3">合并利润表（简表）</span></li>
    <li><b>报告期截止日</b><span data-fact="2026Q3.xlsx/利润表/B2">2026-09-30</span></li>
    <li><b>币种</b><span data-fact="2026Q3.xlsx/利润表/B4">人民币</span></li>
    <li><b>编制部门</b><span data-fact="2026Q3.xlsx/利润表/B6">财务管理部</span></li>
  </ul>

  <div class="cards">
    <div class="card">
      <p class="label">营业收入</p>
      <p class="value"><span data-fact="2026Q3.xlsx/摘要/B2" data-fact-scale="1e-8" data-fact-digits="2">7.64</span><small>亿元</small></p>
      <p class="change"><span>同比 <span class="up"><span data-fact="2026Q3.xlsx/摘要/C2" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+19.6</span>%</span></span><span>环比 <span class="up"><span data-fact="2026Q3.xlsx/摘要/D2" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+4.8</span>%</span></span></p>
    </div>
    <div class="card">
      <p class="label">毛利</p>
      <p class="value"><span data-fact="2026Q3.xlsx/摘要/B3" data-fact-scale="1e-8" data-fact-digits="2">1.80</span><small>亿元</small></p>
      <p class="change"><span>同比 <span class="up"><span data-fact="2026Q3.xlsx/摘要/C3" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+28.2</span>%</span></span><span>环比 <span class="up"><span data-fact="2026Q3.xlsx/摘要/D3" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+6.9</span>%</span></span></p>
    </div>
    <div class="card">
      <p class="label">营业利润</p>
      <p class="value"><span data-fact="2026Q3.xlsx/摘要/B4" data-fact-scale="1e-4" data-fact-digits="0">8,640</span><small>万元</small></p>
      <p class="change"><span>同比 <span class="up"><span data-fact="2026Q3.xlsx/摘要/C4" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+39.6</span>%</span></span><span>环比 <span class="up"><span data-fact="2026Q3.xlsx/摘要/D4" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+10.8</span>%</span></span></p>
    </div>
  </div>

  <section class="prose">
    <h2 class="section">本季概览</h2>
    <p>本季度，云杉供应链四个业务板块的收入均保持增长。营业收入合计 <span class="figure-inline"><span data-fact="2026Q3.xlsx/利润表/D14">764,400,000</span> 元</span>，较<span data-fact="2026Q3.xlsx/利润表/B9">2025年三季度</span>同比增长 <span data-fact="2026Q3.xlsx/利润表/E14" data-fact-scale="100" data-fact-digits="1">19.6</span>%，较上一季度环比增长 <span data-fact="2026Q3.xlsx/利润表/F14" data-fact-scale="100" data-fact-digits="1">4.8</span>%。其中冷链配送收入 <span data-fact="2026Q3.xlsx/利润表/D10" data-fact-scale="1e-8" data-fact-digits="2">3.77</span> 亿元，是规模最大的板块；增值服务收入同比增长 <span data-fact="2026Q3.xlsx/利润表/E12" data-fact-scale="100" data-fact-digits="1">29.4</span>%，增速居各板块之首。</p>
    <p>毛利为 <span data-fact="2026Q3.xlsx/利润表/D16" data-fact-scale="1e-8" data-fact-digits="2">1.80</span> 亿元，毛利率 <span data-fact="2026Q3.xlsx/利润表/D20">23.6%</span>，上年同期为 <span data-fact="2026Q3.xlsx/利润表/B20">22.0%</span>。期间费用 <span data-fact="2026Q3.xlsx/利润表/D17" data-fact-scale="1e-4" data-fact-digits="0">9,370</span> 万元，增速低于毛利的增速。营业利润 <span data-fact="2026Q3.xlsx/利润表/D18" data-fact-scale="1e-4" data-fact-digits="0">8,640</span> 万元，营业利润率由上年同期的 <span data-fact="2026Q3.xlsx/利润表/B21">9.7%</span> 提高到 <span data-fact="2026Q3.xlsx/利润表/D21">11.3%</span>，主要得益于干线线路的装载率提升与仓储自动化投入的逐步见效。</p>
  </section>

  <section>
    <h2 class="section">各业务板块营业收入</h2>
    <div class="table-wrap">
      <table class="mid">
        <caption>单位：万元</caption>
        <thead>
          <tr><th scope="col" data-fact="2026Q3.xlsx/利润表/A9">业务板块</th><th scope="col" data-fact="2026Q3.xlsx/利润表/B9">2025年三季度</th><th scope="col" data-fact="2026Q3.xlsx/利润表/D9">2026年三季度</th><th scope="col" data-fact="2026Q3.xlsx/利润表/E9">同比增长</th><th scope="col" data-fact="2026Q3.xlsx/利润表/F9">环比增长</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row" data-fact="2026Q3.xlsx/利润表/A10">冷链配送</th><td data-fact="2026Q3.xlsx/利润表/B10" data-fact-scale="1e-4" data-fact-digits="0">31,260</td><td data-fact="2026Q3.xlsx/利润表/D10" data-fact-scale="1e-4" data-fact-digits="0">37,690</td><td class="up" data-fact="2026Q3.xlsx/利润表/E10">20.6%</td><td data-fact="2026Q3.xlsx/利润表/F10">5.2%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/利润表/A11">仓储服务</th><td data-fact="2026Q3.xlsx/利润表/B11" data-fact-scale="1e-4" data-fact-digits="0">19,830</td><td data-fact="2026Q3.xlsx/利润表/D11" data-fact-scale="1e-4" data-fact-digits="0">22,950</td><td class="up" data-fact="2026Q3.xlsx/利润表/E11">15.7%</td><td data-fact="2026Q3.xlsx/利润表/F11">3.5%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/利润表/A12">增值服务</th><td data-fact="2026Q3.xlsx/利润表/B12" data-fact-scale="1e-4" data-fact-digits="0">8,640</td><td data-fact="2026Q3.xlsx/利润表/D12" data-fact-scale="1e-4" data-fact-digits="0">11,180</td><td class="up" data-fact="2026Q3.xlsx/利润表/E12">29.4%</td><td data-fact="2026Q3.xlsx/利润表/F12">7.3%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/利润表/A13">其他业务</th><td data-fact="2026Q3.xlsx/利润表/B13" data-fact-scale="1e-4" data-fact-digits="0">4,190</td><td data-fact="2026Q3.xlsx/利润表/D13" data-fact-scale="1e-4" data-fact-digits="0">4,620</td><td class="up" data-fact="2026Q3.xlsx/利润表/E13">10.3%</td><td data-fact="2026Q3.xlsx/利润表/F13">2.0%</td></tr>
          <tr class="total"><th scope="row" data-fact="2026Q3.xlsx/利润表/A14">营业收入合计</th><td data-fact="2026Q3.xlsx/利润表/B14" data-fact-scale="1e-4" data-fact-digits="0">63,920</td><td data-fact="2026Q3.xlsx/利润表/D14" data-fact-scale="1e-4" data-fact-digits="0">76,440</td><td class="up" data-fact="2026Q3.xlsx/利润表/E14">19.6%</td><td data-fact="2026Q3.xlsx/利润表/F14">4.8%</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2 class="section">利润表摘要</h2>
    <div class="table-wrap">
      <table class="wide">
        <caption>单位：万元（比率除外）</caption>
        <thead>
          <tr><th scope="col">项目</th><th scope="col" data-fact="2026Q3.xlsx/利润表/B9">2025年三季度</th><th scope="col" data-fact="2026Q3.xlsx/利润表/C9">2026年二季度</th><th scope="col" data-fact="2026Q3.xlsx/利润表/D9">2026年三季度</th><th scope="col" data-fact="2026Q3.xlsx/利润表/E9">同比增长</th><th scope="col" data-fact="2026Q3.xlsx/利润表/F9">环比增长</th></tr>
        </thead>
        <tbody>
          <tr class="sub"><th scope="row" data-fact="2026Q3.xlsx/利润表/A14">营业收入合计</th><td data-fact="2026Q3.xlsx/利润表/B14" data-fact-scale="1e-4" data-fact-digits="0">63,920</td><td data-fact="2026Q3.xlsx/利润表/C14" data-fact-scale="1e-4" data-fact-digits="0">72,960</td><td data-fact="2026Q3.xlsx/利润表/D14" data-fact-scale="1e-4" data-fact-digits="0">76,440</td><td data-fact="2026Q3.xlsx/利润表/E14">19.6%</td><td data-fact="2026Q3.xlsx/利润表/F14">4.8%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/利润表/A15">营业成本</th><td data-fact="2026Q3.xlsx/利润表/B15" data-fact-scale="1e-4" data-fact-digits="0">49,870</td><td data-fact="2026Q3.xlsx/利润表/C15" data-fact-scale="1e-4" data-fact-digits="0">56,120</td><td data-fact="2026Q3.xlsx/利润表/D15" data-fact-scale="1e-4" data-fact-digits="0">58,430</td><td data-fact="2026Q3.xlsx/利润表/E15">17.2%</td><td data-fact="2026Q3.xlsx/利润表/F15">4.1%</td></tr>
          <tr class="sub"><th scope="row" data-fact="2026Q3.xlsx/利润表/A16">毛利</th><td data-fact="2026Q3.xlsx/利润表/B16" data-fact-scale="1e-4" data-fact-digits="0">14,050</td><td data-fact="2026Q3.xlsx/利润表/C16" data-fact-scale="1e-4" data-fact-digits="0">16,840</td><td data-fact="2026Q3.xlsx/利润表/D16" data-fact-scale="1e-4" data-fact-digits="0">18,010</td><td data-fact="2026Q3.xlsx/利润表/E16">28.2%</td><td data-fact="2026Q3.xlsx/利润表/F16">6.9%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/利润表/A17">期间费用</th><td data-fact="2026Q3.xlsx/利润表/B17" data-fact-scale="1e-4" data-fact-digits="0">7,860</td><td data-fact="2026Q3.xlsx/利润表/C17" data-fact-scale="1e-4" data-fact-digits="0">9,040</td><td data-fact="2026Q3.xlsx/利润表/D17" data-fact-scale="1e-4" data-fact-digits="0">9,370</td><td data-fact="2026Q3.xlsx/利润表/E17">19.2%</td><td data-fact="2026Q3.xlsx/利润表/F17">3.7%</td></tr>
          <tr class="total"><th scope="row" data-fact="2026Q3.xlsx/利润表/A18">营业利润</th><td data-fact="2026Q3.xlsx/利润表/B18" data-fact-scale="1e-4" data-fact-digits="0">6,190</td><td data-fact="2026Q3.xlsx/利润表/C18" data-fact-scale="1e-4" data-fact-digits="0">7,800</td><td data-fact="2026Q3.xlsx/利润表/D18" data-fact-scale="1e-4" data-fact-digits="0">8,640</td><td data-fact="2026Q3.xlsx/利润表/E18">39.6%</td><td data-fact="2026Q3.xlsx/利润表/F18">10.8%</td></tr>
          <tr class="ratio"><th scope="row" data-fact="2026Q3.xlsx/利润表/A20">毛利率</th><td data-fact="2026Q3.xlsx/利润表/B20">22.0%</td><td data-fact="2026Q3.xlsx/利润表/C20">23.1%</td><td data-fact="2026Q3.xlsx/利润表/D20">23.6%</td><td></td><td></td></tr>
          <tr class="ratio"><th scope="row" data-fact="2026Q3.xlsx/利润表/A21">营业利润率</th><td data-fact="2026Q3.xlsx/利润表/B21">9.7%</td><td data-fact="2026Q3.xlsx/利润表/C21">10.7%</td><td data-fact="2026Q3.xlsx/利润表/D21">11.3%</td><td></td><td></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="charts">
    <figure>
      <figcaption><span data-fact="2026Q3.xlsx/利润表/D9">2026年三季度</span>各业务板块营业收入 <small>单位：亿元</small></figcaption>
      <div class="chart-scroll">
        <div data-chart="bar"
             data-chart-facts="2026Q3.xlsx/利润表/D10:D13"
             data-chart-labels="2026Q3.xlsx/利润表/A10:A13"
             data-chart-scale="1e-8" data-chart-digits="2">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-label="柱状图" data-chart-drawn="bar" style="max-width:100%;height:auto" font-family="inherit" font-size="12" fill="currentColor"><line x1="19" x2="628" y1="328" y2="328" stroke="currentColor" stroke-opacity="0.45"/><text x="11" y="332" text-anchor="end" fill-opacity="0.7">0</text><line x1="19" x2="628" y1="251" y2="251" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="255" text-anchor="end" fill-opacity="0.7">1</text><line x1="19" x2="628" y1="174" y2="174" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="178" text-anchor="end" fill-opacity="0.7">2</text><line x1="19" x2="628" y1="97" y2="97" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="101" text-anchor="end" fill-opacity="0.7">3</text><line x1="19" x2="628" y1="20" y2="20" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="24" text-anchor="end" fill-opacity="0.7">4</text><text x="95.13" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/利润表/A10">冷链配送</text><text x="247.38" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/利润表/A11">仓储服务</text><text x="399.63" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/利润表/A12">增值服务</text><text x="551.88" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/利润表/A13">其他业务</text><path d="M83.13 328V41.79Q83.13 37.79 87.13 37.79H103.13Q107.13 37.79 107.13 41.79V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/利润表/D10"><title>冷链配送：3.77</title></path><text x="95.13" y="31.79" text-anchor="middle" data-fact="2026Q3.xlsx/利润表/D10" data-fact-scale="1e-8" data-fact-digits="2">3.77</text><path d="M235.38 328V155.29Q235.38 151.29 239.38 151.29H255.38Q259.38 151.29 259.38 155.29V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/利润表/D11"><title>仓储服务：2.30</title></path><text x="247.38" y="145.29" text-anchor="middle" data-fact="2026Q3.xlsx/利润表/D11" data-fact-scale="1e-8" data-fact-digits="2">2.30</text><path d="M387.63 328V245.91Q387.63 241.91 391.63 241.91H407.63Q411.63 241.91 411.63 245.91V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/利润表/D12"><title>增值服务：1.12</title></path><text x="399.63" y="235.91" text-anchor="middle" data-fact="2026Q3.xlsx/利润表/D12" data-fact-scale="1e-8" data-fact-digits="2">1.12</text><path d="M539.88 328V296.43Q539.88 292.43 543.88 292.43H559.88Q563.88 292.43 563.88 296.43V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/利润表/D13"><title>其他业务：0.46</title></path><text x="551.88" y="286.43" text-anchor="middle" data-fact="2026Q3.xlsx/利润表/D13" data-fact-scale="1e-8" data-fact-digits="2">0.46</text></svg>
</div>
      </div>
    </figure>
    <figure>
      <figcaption>近五个季度营业收入 <small>单位：亿元</small></figcaption>
      <div class="chart-scroll">
        <div data-chart="line"
             data-chart-facts="2026Q3.xlsx/季度/B2:B6"
             data-chart-labels="2026Q3.xlsx/季度/A2:A6"
             data-chart-scale="1e-8" data-chart-digits="2">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-label="折线图" data-chart-drawn="line" style="max-width:100%;height:auto" font-family="inherit" font-size="12" fill="currentColor"><line x1="19" x2="628" y1="328" y2="328" stroke="currentColor" stroke-opacity="0.45"/><text x="11" y="332" text-anchor="end" fill-opacity="0.7">0</text><line x1="19" x2="628" y1="251" y2="251" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="255" text-anchor="end" fill-opacity="0.7">2</text><line x1="19" x2="628" y1="174" y2="174" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="178" text-anchor="end" fill-opacity="0.7">4</text><line x1="19" x2="628" y1="97" y2="97" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="101" text-anchor="end" fill-opacity="0.7">6</text><line x1="19" x2="628" y1="20" y2="20" stroke="currentColor" stroke-opacity="0.12"/><text x="11" y="24" text-anchor="end" fill-opacity="0.7">8</text><text x="79.9" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/季度/A2">2025年三季度</text><text x="201.7" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/季度/A3">2025年四季度</text><text x="323.5" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/季度/A4">2026年一季度</text><text x="445.3" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/季度/A5">2026年二季度</text><text x="567.1" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/季度/A6">2026年三季度</text><path d="M79.9 81.91L201.7 70.47L323.5 62.54L445.3 47.1L567.1 33.71" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="79.9" cy="81.91" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/季度/B2"><title>2025年三季度：6.39</title></circle><text x="79.9" y="71.91" text-anchor="middle" data-fact="2026Q3.xlsx/季度/B2" data-fact-scale="1e-8" data-fact-digits="2">6.39</text><circle cx="201.7" cy="70.47" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/季度/B3"><title>2025年四季度：6.69</title></circle><text x="201.7" y="60.47" text-anchor="middle" data-fact="2026Q3.xlsx/季度/B3" data-fact-scale="1e-8" data-fact-digits="2">6.69</text><circle cx="323.5" cy="62.54" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/季度/B4"><title>2026年一季度：6.90</title></circle><text x="323.5" y="52.54" text-anchor="middle" data-fact="2026Q3.xlsx/季度/B4" data-fact-scale="1e-8" data-fact-digits="2">6.90</text><circle cx="445.3" cy="47.1" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/季度/B5"><title>2026年二季度：7.30</title></circle><text x="445.3" y="37.1" text-anchor="middle" data-fact="2026Q3.xlsx/季度/B5" data-fact-scale="1e-8" data-fact-digits="2">7.30</text><circle cx="567.1" cy="33.71" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/季度/B6"><title>2026年三季度：7.64</title></circle><text x="567.1" y="23.71" text-anchor="middle" data-fact="2026Q3.xlsx/季度/B6" data-fact-scale="1e-8" data-fact-digits="2">7.64</text></svg>
</div>
      </div>
    </figure>
  </section>

  <section class="notes">
    <h2>附注</h2>
    <ul>
      <li>金额以人民币元计。卡片与图表按亿元或万元显示，亿元保留两位小数，万元取整。</li>
      <li>同比是与上年同一季度相比；环比是与上一季度相比。</li>
      <li>毛利等于营业收入减营业成本；营业利润等于毛利减期间费用。</li>
      <li>毛利率等于毛利除以营业收入；营业利润率等于营业利润除以营业收入。</li>
      <li>各业务板块的营业收入已抵销板块之间的内部交易。</li>
    </ul>
    <p>对本报告有疑问，请联系：ir@example.com</p>
  </section>

  <footer>
    <p>本页的每个数字都由 tactile-ingest 从源工作簿填入。在编辑器里点击数字，可以看到它来自哪个单元格。</p>
    <p data-fact-none="源工作簿的文件名">源工作簿：2026Q3.xlsx。云杉供应链是虚构的公司，本页数据均为示例。</p>
  </footer>
</main>
<script type="application/json" id="tactile-provenance">
{
 "tactileProvenance": 1,
 "tool": {
  "name": "tactile-ingest",
  "version": "0.1.0"
 },
 "filledAt": "2026-11-13T12:56:38Z",
 "sources": [
  {
   "file": "2026Q3.xlsx",
   "sha256": "2fc0340d9889ff7630d0bb5d42dd65ec60b3b9f837d34b63893124a068abbceb",
   "bytes": 13378
  }
 ],
 "facts": {
  "2026Q3.xlsx/利润表/A1": {
   "type": "text",
   "value": "云杉供应链",
   "text": "云杉供应链"
  },
  "2026Q3.xlsx/利润表/B2": {
   "type": "date",
   "value": "2026-09-30",
   "text": "2026-09-30",
   "labels": {
    "row": "报告期截止日"
   }
  },
  "2026Q3.xlsx/利润表/B3": {
   "type": "text",
   "value": "合并利润表（简表）",
   "text": "合并利润表（简表）"
  },
  "2026Q3.xlsx/利润表/B4": {
   "type": "text",
   "value": "人民币",
   "text": "人民币"
  },
  "2026Q3.xlsx/利润表/B6": {
   "type": "text",
   "value": "财务管理部",
   "text": "财务管理部"
  },
  "2026Q3.xlsx/利润表/A9": {
   "type": "text",
   "value": "业务板块",
   "text": "业务板块"
  },
  "2026Q3.xlsx/利润表/B9": {
   "type": "text",
   "value": "2025年三季度",
   "text": "2025年三季度"
  },
  "2026Q3.xlsx/利润表/C9": {
   "type": "text",
   "value": "2026年二季度",
   "text": "2026年二季度"
  },
  "2026Q3.xlsx/利润表/D9": {
   "type": "text",
   "value": "2026年三季度",
   "text": "2026年三季度"
  },
  "2026Q3.xlsx/利润表/E9": {
   "type": "text",
   "value": "同比增长",
   "text": "同比增长"
  },
  "2026Q3.xlsx/利润表/F9": {
   "type": "text",
   "value": "环比增长",
   "text": "环比增长"
  },
  "2026Q3.xlsx/利润表/A10": {
   "type": "text",
   "value": "冷链配送",
   "text": "冷链配送"
  },
  "2026Q3.xlsx/利润表/B10": {
   "type": "number",
   "value": 312600000,
   "text": "312,600,000",
   "labels": {
    "row": "冷链配送",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C10": {
   "type": "number",
   "value": 358400000,
   "text": "358,400,000",
   "labels": {
    "row": "冷链配送",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D10": {
   "type": "number",
   "value": 376900000,
   "text": "376,900,000",
   "labels": {
    "row": "冷链配送",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E10": {
   "type": "number",
   "value": 0.20569417786308386,
   "text": "20.6%",
   "formula": "D10/B10-1",
   "labels": {
    "row": "冷链配送",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F10": {
   "type": "number",
   "value": 0.0516183035714286,
   "text": "5.2%",
   "formula": "D10/C10-1",
   "labels": {
    "row": "冷链配送",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A11": {
   "type": "text",
   "value": "仓储服务",
   "text": "仓储服务"
  },
  "2026Q3.xlsx/利润表/B11": {
   "type": "number",
   "value": 198300000,
   "text": "198,300,000",
   "labels": {
    "row": "仓储服务",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C11": {
   "type": "number",
   "value": 221700000,
   "text": "221,700,000",
   "labels": {
    "row": "仓储服务",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D11": {
   "type": "number",
   "value": 229500000,
   "text": "229,500,000",
   "labels": {
    "row": "仓储服务",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E11": {
   "type": "number",
   "value": 0.15733736762481088,
   "text": "15.7%",
   "formula": "D11/B11-1",
   "labels": {
    "row": "仓储服务",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F11": {
   "type": "number",
   "value": 0.03518267929634633,
   "text": "3.5%",
   "formula": "D11/C11-1",
   "labels": {
    "row": "仓储服务",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A12": {
   "type": "text",
   "value": "增值服务",
   "text": "增值服务"
  },
  "2026Q3.xlsx/利润表/B12": {
   "type": "number",
   "value": 86400000,
   "text": "86,400,000",
   "labels": {
    "row": "增值服务",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C12": {
   "type": "number",
   "value": 104200000,
   "text": "104,200,000",
   "labels": {
    "row": "增值服务",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D12": {
   "type": "number",
   "value": 111800000,
   "text": "111,800,000",
   "labels": {
    "row": "增值服务",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E12": {
   "type": "number",
   "value": 0.2939814814814814,
   "text": "29.4%",
   "formula": "D12/B12-1",
   "labels": {
    "row": "增值服务",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F12": {
   "type": "number",
   "value": 0.07293666026871404,
   "text": "7.3%",
   "formula": "D12/C12-1",
   "labels": {
    "row": "增值服务",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A13": {
   "type": "text",
   "value": "其他业务",
   "text": "其他业务"
  },
  "2026Q3.xlsx/利润表/B13": {
   "type": "number",
   "value": 41900000,
   "text": "41,900,000",
   "labels": {
    "row": "其他业务",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C13": {
   "type": "number",
   "value": 45300000,
   "text": "45,300,000",
   "labels": {
    "row": "其他业务",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D13": {
   "type": "number",
   "value": 46200000,
   "text": "46,200,000",
   "labels": {
    "row": "其他业务",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E13": {
   "type": "number",
   "value": 0.10262529832935563,
   "text": "10.3%",
   "formula": "D13/B13-1",
   "labels": {
    "row": "其他业务",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F13": {
   "type": "number",
   "value": 0.019867549668874274,
   "text": "2.0%",
   "formula": "D13/C13-1",
   "labels": {
    "row": "其他业务",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A14": {
   "type": "text",
   "value": "营业收入合计",
   "text": "营业收入合计"
  },
  "2026Q3.xlsx/利润表/B14": {
   "type": "number",
   "value": 639200000,
   "text": "639,200,000",
   "formula": "SUM(B10:B13)",
   "labels": {
    "row": "营业收入合计",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C14": {
   "type": "number",
   "value": 729600000,
   "text": "729,600,000",
   "formula": "SUM(C10:C13)",
   "labels": {
    "row": "营业收入合计",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D14": {
   "type": "number",
   "value": 764400000,
   "text": "764,400,000",
   "formula": "SUM(D10:D13)",
   "labels": {
    "row": "营业收入合计",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E14": {
   "type": "number",
   "value": 0.19586983729662077,
   "text": "19.6%",
   "formula": "D14/B14-1",
   "labels": {
    "row": "营业收入合计",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F14": {
   "type": "number",
   "value": 0.047697368421052655,
   "text": "4.8%",
   "formula": "D14/C14-1",
   "labels": {
    "row": "营业收入合计",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A15": {
   "type": "text",
   "value": "营业成本",
   "text": "营业成本"
  },
  "2026Q3.xlsx/利润表/B15": {
   "type": "number",
   "value": 498700000,
   "text": "498,700,000",
   "labels": {
    "row": "营业成本",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C15": {
   "type": "number",
   "value": 561200000,
   "text": "561,200,000",
   "labels": {
    "row": "营业成本",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D15": {
   "type": "number",
   "value": 584300000,
   "text": "584,300,000",
   "labels": {
    "row": "营业成本",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E15": {
   "type": "number",
   "value": 0.17164628032885498,
   "text": "17.2%",
   "formula": "D15/B15-1",
   "labels": {
    "row": "营业成本",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F15": {
   "type": "number",
   "value": 0.041161796151104824,
   "text": "4.1%",
   "formula": "D15/C15-1",
   "labels": {
    "row": "营业成本",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A16": {
   "type": "text",
   "value": "毛利",
   "text": "毛利"
  },
  "2026Q3.xlsx/利润表/B16": {
   "type": "number",
   "value": 140500000,
   "text": "140,500,000",
   "formula": "B14-B15",
   "labels": {
    "row": "毛利",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C16": {
   "type": "number",
   "value": 168400000,
   "text": "168,400,000",
   "formula": "C14-C15",
   "labels": {
    "row": "毛利",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D16": {
   "type": "number",
   "value": 180100000,
   "text": "180,100,000",
   "formula": "D14-D15",
   "labels": {
    "row": "毛利",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E16": {
   "type": "number",
   "value": 0.2818505338078292,
   "text": "28.2%",
   "formula": "D16/B16-1",
   "labels": {
    "row": "毛利",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F16": {
   "type": "number",
   "value": 0.06947743467933498,
   "text": "6.9%",
   "formula": "D16/C16-1",
   "labels": {
    "row": "毛利",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A17": {
   "type": "text",
   "value": "期间费用",
   "text": "期间费用"
  },
  "2026Q3.xlsx/利润表/B17": {
   "type": "number",
   "value": 78600000,
   "text": "78,600,000",
   "labels": {
    "row": "期间费用",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C17": {
   "type": "number",
   "value": 90400000,
   "text": "90,400,000",
   "labels": {
    "row": "期间费用",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D17": {
   "type": "number",
   "value": 93700000,
   "text": "93,700,000",
   "labels": {
    "row": "期间费用",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E17": {
   "type": "number",
   "value": 0.19211195928753177,
   "text": "19.2%",
   "formula": "D17/B17-1",
   "labels": {
    "row": "期间费用",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F17": {
   "type": "number",
   "value": 0.036504424778761146,
   "text": "3.7%",
   "formula": "D17/C17-1",
   "labels": {
    "row": "期间费用",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A18": {
   "type": "text",
   "value": "营业利润",
   "text": "营业利润"
  },
  "2026Q3.xlsx/利润表/B18": {
   "type": "number",
   "value": 61900000,
   "text": "61,900,000",
   "formula": "B16-B17",
   "labels": {
    "row": "营业利润",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C18": {
   "type": "number",
   "value": 78000000,
   "text": "78,000,000",
   "formula": "C16-C17",
   "labels": {
    "row": "营业利润",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D18": {
   "type": "number",
   "value": 86400000,
   "text": "86,400,000",
   "formula": "D16-D17",
   "labels": {
    "row": "营业利润",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/E18": {
   "type": "number",
   "value": 0.39579967689822304,
   "text": "39.6%",
   "formula": "D18/B18-1",
   "labels": {
    "row": "营业利润",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/利润表/F18": {
   "type": "number",
   "value": 0.10769230769230775,
   "text": "10.8%",
   "formula": "D18/C18-1",
   "labels": {
    "row": "营业利润",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/利润表/A20": {
   "type": "text",
   "value": "毛利率",
   "text": "毛利率"
  },
  "2026Q3.xlsx/利润表/B20": {
   "type": "number",
   "value": 0.21980600750938672,
   "text": "22.0%",
   "formula": "B16/B14",
   "labels": {
    "row": "毛利率",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C20": {
   "type": "number",
   "value": 0.23081140350877194,
   "text": "23.1%",
   "formula": "C16/C14",
   "labels": {
    "row": "毛利率",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D20": {
   "type": "number",
   "value": 0.23560962846677133,
   "text": "23.6%",
   "formula": "D16/D14",
   "labels": {
    "row": "毛利率",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/利润表/A21": {
   "type": "text",
   "value": "营业利润率",
   "text": "营业利润率"
  },
  "2026Q3.xlsx/利润表/B21": {
   "type": "number",
   "value": 0.09683979974968711,
   "text": "9.7%",
   "formula": "B18/B14",
   "labels": {
    "row": "营业利润率",
    "col": "2025年三季度"
   }
  },
  "2026Q3.xlsx/利润表/C21": {
   "type": "number",
   "value": 0.1069078947368421,
   "text": "10.7%",
   "formula": "C18/C14",
   "labels": {
    "row": "营业利润率",
    "col": "2026年二季度"
   }
  },
  "2026Q3.xlsx/利润表/D21": {
   "type": "number",
   "value": 0.1130298273155416,
   "text": "11.3%",
   "formula": "D18/D14",
   "labels": {
    "row": "营业利润率",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/摘要/B2": {
   "type": "number",
   "value": 764400000,
   "text": "764,400,000",
   "formula": "利润表!D14",
   "labels": {
    "row": "营业收入",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/摘要/C2": {
   "type": "number",
   "value": 0.19586983729662077,
   "text": "19.6%",
   "formula": "利润表!E14",
   "labels": {
    "row": "营业收入",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/摘要/D2": {
   "type": "number",
   "value": 0.047697368421052655,
   "text": "4.8%",
   "formula": "利润表!F14",
   "labels": {
    "row": "营业收入",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/摘要/B3": {
   "type": "number",
   "value": 180100000,
   "text": "180,100,000",
   "formula": "利润表!D16",
   "labels": {
    "row": "毛利",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/摘要/C3": {
   "type": "number",
   "value": 0.2818505338078292,
   "text": "28.2%",
   "formula": "利润表!E16",
   "labels": {
    "row": "毛利",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/摘要/D3": {
   "type": "number",
   "value": 0.06947743467933498,
   "text": "6.9%",
   "formula": "利润表!F16",
   "labels": {
    "row": "毛利",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/摘要/B4": {
   "type": "number",
   "value": 86400000,
   "text": "86,400,000",
   "formula": "利润表!D18",
   "labels": {
    "row": "营业利润",
    "col": "2026年三季度"
   }
  },
  "2026Q3.xlsx/摘要/C4": {
   "type": "number",
   "value": 0.39579967689822304,
   "text": "39.6%",
   "formula": "利润表!E18",
   "labels": {
    "row": "营业利润",
    "col": "同比增长"
   }
  },
  "2026Q3.xlsx/摘要/D4": {
   "type": "number",
   "value": 0.10769230769230775,
   "text": "10.8%",
   "formula": "利润表!F18",
   "labels": {
    "row": "营业利润",
    "col": "环比增长"
   }
  },
  "2026Q3.xlsx/季度/A2": {
   "type": "text",
   "value": "2025年三季度",
   "text": "2025年三季度"
  },
  "2026Q3.xlsx/季度/B2": {
   "type": "number",
   "value": 639200000,
   "text": "639,200,000",
   "formula": "利润表!B14",
   "labels": {
    "row": "2025年三季度",
    "col": "营业收入"
   }
  },
  "2026Q3.xlsx/季度/A3": {
   "type": "text",
   "value": "2025年四季度",
   "text": "2025年四季度"
  },
  "2026Q3.xlsx/季度/B3": {
   "type": "number",
   "value": 668900000,
   "text": "668,900,000",
   "labels": {
    "row": "2025年四季度",
    "col": "营业收入"
   }
  },
  "2026Q3.xlsx/季度/A4": {
   "type": "text",
   "value": "2026年一季度",
   "text": "2026年一季度"
  },
  "2026Q3.xlsx/季度/B4": {
   "type": "number",
   "value": 689500000,
   "text": "689,500,000",
   "labels": {
    "row": "2026年一季度",
    "col": "营业收入"
   }
  },
  "2026Q3.xlsx/季度/A5": {
   "type": "text",
   "value": "2026年二季度",
   "text": "2026年二季度"
  },
  "2026Q3.xlsx/季度/B5": {
   "type": "number",
   "value": 729600000,
   "text": "729,600,000",
   "formula": "利润表!C14",
   "labels": {
    "row": "2026年二季度",
    "col": "营业收入"
   }
  },
  "2026Q3.xlsx/季度/A6": {
   "type": "text",
   "value": "2026年三季度",
   "text": "2026年三季度"
  },
  "2026Q3.xlsx/季度/B6": {
   "type": "number",
   "value": 764400000,
   "text": "764,400,000",
   "formula": "利润表!D14",
   "labels": {
    "row": "2026年三季度",
    "col": "营业收入"
   }
  }
 },
 "rules": {
  "sha256": "1f9a9f36800c7f3b8bc6a61b2625a5ddccdf29cb996b75b1e850ea67cc2efc8e",
  "items": [
   {
    "id": "各板块相加等于营业收入合计（2026年三季度）",
    "type": "sum",
    "total": "2026Q3.xlsx/利润表/D14",
    "parts": [
     "2026Q3.xlsx/利润表/D10",
     "2026Q3.xlsx/利润表/D11",
     "2026Q3.xlsx/利润表/D12",
     "2026Q3.xlsx/利润表/D13"
    ],
    "tolerance": "0"
   },
   {
    "id": "各板块相加等于营业收入合计（2025年三季度）",
    "type": "sum",
    "total": "2026Q3.xlsx/利润表/B14",
    "parts": [
     "2026Q3.xlsx/利润表/B10",
     "2026Q3.xlsx/利润表/B11",
     "2026Q3.xlsx/利润表/B12",
     "2026Q3.xlsx/利润表/B13"
    ],
    "tolerance": "0"
   },
   {
    "id": "各板块相加等于营业收入合计（2026年二季度）",
    "type": "sum",
    "total": "2026Q3.xlsx/利润表/C14",
    "parts": [
     "2026Q3.xlsx/利润表/C10",
     "2026Q3.xlsx/利润表/C11",
     "2026Q3.xlsx/利润表/C12",
     "2026Q3.xlsx/利润表/C13"
    ],
    "tolerance": "0"
   },
   {
    "id": "摘要的营业收入等于利润表的合计",
    "type": "equal",
    "left": "2026Q3.xlsx/摘要/B2",
    "right": "2026Q3.xlsx/利润表/D14",
    "tolerance": "0",
    "note": "摘要工作表的营业收入取自利润表"
   },
   {
    "id": "摘要的营业利润等于利润表的营业利润",
    "type": "equal",
    "left": "2026Q3.xlsx/摘要/B4",
    "right": "2026Q3.xlsx/利润表/D18",
    "tolerance": "0"
   },
   {
    "id": "折线图最后一个季度等于利润表的合计",
    "type": "equal",
    "left": "2026Q3.xlsx/季度/B6",
    "right": "2026Q3.xlsx/利润表/D14",
    "tolerance": "0"
   }
  ]
 }
}
</script>
</body>
</html>
`;

  /* 数据：大促战报 */
  const BOARD = `<!DOCTYPE html>
<html lang="zh-Hans"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云杉优选 | 周年庆大促战报</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0d0205;
    --panel: #23070e;
    --line: rgba(255, 211, 107, .2);
    --edge: rgba(255, 211, 107, .34);
    --ink: #fff5e8;
    --ink-2: #ecc4b4;
    --gold: #ffd36b;
    --gold-2: #ffe9ad;
    --orange: #ff8a3d;
    --red: #ff3d4f;
    --font: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background-color: var(--bg);
    background-image: radial-gradient(1000px 560px at 14% -6%, rgba(255, 61, 79, .34), transparent 70%), radial-gradient(820px 520px at 100% 6%, rgba(255, 138, 61, .2), transparent 70%), radial-gradient(900px 620px at 50% 104%, rgba(190, 18, 44, .26), transparent 70%), linear-gradient(180deg, #2a060e 0%, #14030a 38%, #0a0204 100%);
    background-repeat: no-repeat;
    color: var(--ink);
    font-family: var(--font);
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, p, ul, ol { margin: 0; }
  .num { font-variant-numeric: tabular-nums; }

  .app { width: 100%; max-width: 1280px; margin: 0 auto; padding: 24px 28px 36px; }

  .top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 20px; margin-bottom: 20px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .mark { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 13px; color: #4a1300; background-color: #ffb03b; background-image: linear-gradient(140deg, #ffe9ad, #ff9a2e); box-shadow: 0 6px 24px rgba(255, 138, 61, .5); }
  .mark svg { width: 24px; height: 24px; }
  .brand b { display: block; font-size: 19px; font-weight: 700; line-height: 1.25; letter-spacing: .04em; }
  .brand div span { display: block; font-size: 13px; color: var(--ink-2); }
  .meta { display: flex; flex-wrap: wrap; gap: 10px; }
  .chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border: 1px solid var(--edge); border-radius: 999px; background-color: #2a0810; font-size: 13.5px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .chip.hot { border-color: transparent; color: #4a1300; font-weight: 700; background-color: #ffb03b; background-image: linear-gradient(120deg, #ffe9ad, #ff9a2e); }
  .chip i { width: 8px; height: 8px; border-radius: 50%; background-color: var(--gold); box-shadow: 0 0 0 4px rgba(255, 211, 107, .2), 0 0 12px var(--gold); }

  .hero { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); align-items: end; gap: 28px 40px; margin-bottom: 16px; padding: 38px 44px 40px; border: 1px solid rgba(255, 211, 107, .55); border-radius: 26px; background-color: #6d0717; background-image: radial-gradient(620px 380px at 22% 46%, rgba(255, 170, 60, .34), transparent 70%), radial-gradient(520px 320px at 92% 0%, rgba(255, 211, 107, .3), transparent 70%), linear-gradient(118deg, #c40c26 0%, #8a0819 36%, #4a0510 68%, #1d0307 100%); box-shadow: inset 0 1px 0 rgba(255, 233, 173, .35), 0 0 0 1px rgba(0, 0, 0, .3), 0 30px 80px rgba(196, 12, 38, .38); }
  .ray { position: absolute; top: -60%; width: 110px; height: 220%; transform: rotate(24deg); background-image: linear-gradient(90deg, rgba(255, 233, 173, 0), rgba(255, 233, 173, .16), rgba(255, 233, 173, 0)); pointer-events: none; }
  .ray.a { left: 46%; }
  .ray.b { left: 62%; width: 36px; background-image: linear-gradient(90deg, rgba(255, 233, 173, 0), rgba(255, 233, 173, .26), rgba(255, 233, 173, 0)); }
  .ray.c { left: 80%; width: 190px; background-image: linear-gradient(90deg, rgba(255, 138, 61, 0), rgba(255, 138, 61, .2), rgba(255, 138, 61, 0)); }
  .burst { position: absolute; right: -70px; top: -90px; width: 360px; height: 360px; color: var(--gold); opacity: .3; pointer-events: none; }
  .hero-main, .hero-side { position: relative; min-width: 0; }
  .eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 5px 16px 5px 6px; border-radius: 999px; background-color: #3d040d; box-shadow: inset 0 0 0 1px rgba(255, 211, 107, .5); font-size: 14px; font-weight: 600; color: var(--gold-2); }
  .eyebrow b { flex: none; white-space: nowrap; padding: 1px 10px; border-radius: 999px; color: #4a1300; background-color: #ffc24d; font-weight: 700; }
  h1 { margin-top: 20px; font-size: 22px; font-weight: 600; line-height: 1.3; letter-spacing: .12em; color: #ffe6d6; }
  .total { display: flex; flex-wrap: wrap; align-items: baseline; margin: 2px 0 10px; font-size: clamp(76px, 14vw, 176px); font-weight: 800; line-height: 1.08; letter-spacing: -.03em; white-space: nowrap; font-variant-numeric: tabular-nums; color: #ffd76a; background-image: linear-gradient(180deg, #fff6d2 8%, #ffd76a 46%, #ffa23a 92%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 6px 26px rgba(255, 170, 60, .5)); }
  .total small { margin-right: .06em; font-size: .5em; font-weight: 700; letter-spacing: 0; }
  .total em { margin-left: .12em; font-size: .46em; font-style: normal; font-weight: 700; letter-spacing: 0; }
  .versus { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; font-size: 15px; color: #ffe6d6; }
  .up { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 999px; color: #4a1300; background-color: #ffc24d; background-image: linear-gradient(120deg, #ffe9ad, #ff9a2e); font-size: 16px; font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; box-shadow: 0 6px 22px rgba(255, 154, 46, .45); }
  .hero-side { display: grid; gap: 12px; }
  .fact { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 2px 16px; padding: 14px 18px; border: 1px solid rgba(255, 211, 107, .32); border-radius: 16px; background-color: #2c050c; }
  .fact span { font-size: 13.5px; color: var(--ink-2); }
  .fact b { grid-row: span 2; font-size: 26px; font-weight: 700; line-height: 1.2; white-space: nowrap; color: var(--gold-2); font-variant-numeric: tabular-nums; }
  .fact b small { margin-left: 3px; font-size: 14px; font-weight: 600; }
  .fact em { font-size: 13px; font-style: normal; color: var(--ink-2); font-variant-numeric: tabular-nums; }

  .card { padding: 20px 22px; border: 1px solid var(--edge); border-radius: 18px; background-color: var(--panel); background-image: linear-gradient(160deg, rgba(255, 211, 107, .09), rgba(255, 211, 107, 0) 44%); box-shadow: inset 0 1px 0 rgba(255, 233, 173, .12), 0 18px 44px rgba(0, 0, 0, .4); }
  h2 { font-size: 17px; font-weight: 700; line-height: 1.35; }
  .card-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 14px; margin-bottom: 18px; }
  .card-head h2 { display: flex; align-items: center; gap: 10px; }
  .card-head h2::before { content: ""; flex: none; width: 5px; height: 17px; border-radius: 3px; background-color: var(--orange); background-image: linear-gradient(180deg, #ffe08a, #ff3d4f); box-shadow: 0 0 12px rgba(255, 138, 61, .7); }
  .card-head span { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .card-head span b { color: var(--gold); font-weight: 600; }

  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
  .kpi { padding: 18px 20px; }
  .kpi-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 10px; }
  .kpi h2 { font-size: 15px; font-weight: 600; color: var(--ink-2); }
  .delta { padding: 2px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; color: #ffe08a; background-color: #3d1a0c; box-shadow: inset 0 0 0 1px rgba(255, 211, 107, .4); }
  .value { margin: 8px 0 4px; font-size: 40px; font-weight: 800; line-height: 1.15; letter-spacing: -.02em; white-space: nowrap; font-variant-numeric: tabular-nums; color: #ffe08a; background-image: linear-gradient(180deg, #fff3cf, #ffb74a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .value small { margin: 0 3px; font-size: 17px; font-weight: 600; letter-spacing: 0; }
  .note { font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

  .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
  .s8 { grid-column: span 8; }
  .s7 { grid-column: span 7; }
  .s5 { grid-column: span 5; }
  .s4 { grid-column: span 4; }

  .trend { display: flex; flex-direction: column; }
  .chart { position: relative; flex: 1 1 250px; min-height: 250px; margin-left: 46px; }
  .chart svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .y { position: absolute; left: -46px; width: 38px; transform: translateY(-50%); font-size: 12px; line-height: 1; text-align: right; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .x { display: flex; justify-content: space-between; margin: 10px 0 0 46px; font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .dot { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border: 2px solid #fff; border-radius: 50%; background-color: var(--orange); box-shadow: 0 0 0 5px rgba(255, 138, 61, .28), 0 0 18px #ffb74a; }
  .peaks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 16px; padding: 14px 0 0; border-top: 1px solid var(--line); list-style: none; font-size: 13px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .peaks b { display: block; font-size: 18px; font-weight: 700; line-height: 1.3; color: var(--gold-2); }

  .donut { position: relative; width: 184px; height: 184px; margin: 0 auto 18px; }
  .donut svg { display: block; width: 100%; height: 100%; filter: drop-shadow(0 0 14px rgba(255, 138, 61, .45)); }
  .donut-total { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .donut-total b { font-size: 34px; font-weight: 800; line-height: 1.1; color: var(--gold-2); font-variant-numeric: tabular-nums; }
  .donut-total span { font-size: 12.5px; color: var(--ink-2); }
  .legend { padding: 0; list-style: none; font-size: 14px; }
  .legend li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  .legend i { flex: none; width: 10px; height: 10px; border-radius: 3px; }
  .legend span { margin-left: auto; color: var(--ink-2); white-space: nowrap; }
  .legend b { width: 40px; text-align: right; color: var(--gold-2); }

  .ranks { display: grid; gap: 15px; padding: 0; list-style: none; }
  .rank { display: grid; grid-template-columns: 26px 5.2em minmax(0, 1fr) 10.5em; align-items: center; gap: 4px 12px; font-size: 14px; }
  .rank .no { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; color: var(--gold-2); background-color: #3d1a0c; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .rank:first-child .no { color: #4a1300; background-color: #ffc24d; }
  .rank .name { font-weight: 600; white-space: nowrap; }
  .track { display: block; height: 16px; border-radius: 999px; background-color: #3a0c14; }
  .track i { display: block; height: 16px; border-radius: 999px; background-color: #ff6a3d; background-image: linear-gradient(90deg, #ff3d4f, #ff8a3d 55%, #ffd36b); box-shadow: 0 0 16px rgba(255, 106, 61, .5); }
  .rank .amt { text-align: right; white-space: nowrap; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .rank .amt b { margin-right: 6px; color: var(--ink); font-weight: 700; }
  .sum { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .sum b { color: var(--gold-2); font-weight: 600; }

  .cols { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; height: 232px; padding: 0 2px; border-bottom: 1px solid var(--edge); background-image: linear-gradient(var(--line) 1px, transparent 1px); background-size: 100% 25%; }
  .col { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; height: 100%; }
  .col b { font-size: 15px; font-weight: 700; line-height: 1; color: var(--gold-2); font-variant-numeric: tabular-nums; }
  .col i { display: block; width: 100%; max-width: 52px; border-radius: 9px 9px 0 0; background-color: #ff6a3d; background-image: linear-gradient(180deg, #ffd36b, #ff8a3d 45%, #e11d3f); box-shadow: 0 0 20px rgba(255, 106, 61, .45); }
  .col-names { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 8px; padding: 0 2px; list-style: none; font-size: 13px; line-height: 1.4; text-align: center; }
  .col-names span { display: block; font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 14px; }
  th { padding: 0 14px 10px 0; font-size: 12.5px; font-weight: 500; letter-spacing: .06em; text-align: left; color: var(--ink-2); white-space: nowrap; }
  td { padding: 12px 14px 12px 0; border-top: 1px solid var(--line); white-space: nowrap; font-variant-numeric: tabular-nums; }
  th.r, td.r { text-align: right; }
  th:last-child, td:last-child { padding-right: 0; }
  td.money { font-weight: 700; color: var(--gold-2); }
  td.kind { color: var(--ink-2); }
  .badge { display: inline-block; min-width: 54px; padding: 2px 10px; border-radius: 999px; text-align: center; font-size: 12.5px; font-weight: 700; color: var(--gold-2); background-color: #3d1a0c; box-shadow: inset 0 0 0 1px rgba(255, 211, 107, .4); }
  .badge.g1 { color: #4a1300; background-color: #ffc24d; background-image: linear-gradient(120deg, #ffe9ad, #ff9a2e); box-shadow: 0 0 16px rgba(255, 154, 46, .5); }
  .badge.g2 { color: #33161a; background-color: #f1d9cf; box-shadow: none; }
  .badge.g3 { color: #3a1200; background-color: #f0a068; box-shadow: none; }

  .steps { padding: 0; list-style: none; }
  .steps li { position: relative; display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 0 14px; padding: 0 0 15px 24px; font-size: 14px; }
  .steps li::before { content: ""; position: absolute; left: 0; top: 6px; width: 11px; height: 11px; border-radius: 50%; background-color: var(--gold); box-shadow: 0 0 0 4px rgba(255, 211, 107, .18), 0 0 12px rgba(255, 211, 107, .8); }
  .steps li::after { content: ""; position: absolute; left: 5px; top: 22px; bottom: 0; width: 1px; background-color: var(--edge); }
  .steps li:last-child { padding-bottom: 0; }
  .steps li:last-child::after { display: none; }
  .steps time { font-weight: 700; color: var(--gold); font-variant-numeric: tabular-nums; }
  .steps b { font-weight: 700; color: var(--gold-2); }
  .steps li.end { margin-top: 2px; padding: 12px 14px 12px 38px; border: 1px solid rgba(255, 211, 107, .5); border-radius: 14px; background-color: #4a0811; }
  .steps li.end::before { left: 14px; top: 18px; background-color: var(--orange); }

  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 20px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-2); }

  @media (max-width: 1080px) {
    .hero { grid-template-columns: minmax(0, 1fr); padding: 32px 32px 34px; }
    .hero-side { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .fact { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    .fact b { grid-row: auto; }
    .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .s8, .s7, .s5, .s4 { grid-column: 1 / -1; }
    .donut-wrap { display: grid; grid-template-columns: 184px minmax(0, 1fr); align-items: center; gap: 28px; }
    .donut { margin: 0; }
  }
  @media (max-width: 640px) {
    .app { padding: 16px 14px 28px; }
    .hero { padding: 24px 18px 22px; border-radius: 20px; gap: 22px; }
    .hero-side { grid-template-columns: minmax(0, 1fr); gap: 10px; }
    .fact { grid-template-columns: minmax(0, 1fr) auto; gap: 2px 14px; padding: 12px 14px; }
    .fact b { grid-row: span 2; font-size: 22px; }
    .burst { width: 240px; height: 240px; right: -70px; top: -70px; }
    h1 { margin-top: 16px; font-size: 18px; }
    .versus { font-size: 14px; }
    .card { padding: 16px; border-radius: 16px; }
    .kpis, .grid { gap: 12px; }
    .kpis { margin-bottom: 12px; }
    .kpi { padding: 14px; }
    .value { font-size: 28px; }
    .value small { font-size: 14px; }
    .chart { flex-basis: 200px; min-height: 200px; }
    .peaks { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .peaks li { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0 12px; }
    .donut-wrap { display: block; }
    .donut { margin: 0 auto 18px; }
    .rank { grid-template-columns: 26px minmax(0, 1fr) auto; }
    .rank .track { grid-column: 1 / -1; grid-row: 2; }
    .cols, .col-names { gap: 8px; }
    .col b { font-size: 13px; }
  }
</style>
<style data-he-style="fx">/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-in { syntax: "<integer>"; inherits: true; initial-value: 1; }
:where(.tfx-h-sheen) { position: relative; }
.tfx-e-deal > * { --tfx-k: inherit; --tfx-t: inherit; }</style><style data-he-style="fx-motion">/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */
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
}</style></head>
<body>
<main class="app">
<header class="top">
<div class="brand">
<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l5 6.2h-2.6l4.1 5.3h-3l4 5H13.4V22h-2.8v-3.5H4.5l4-5h-3l4.1-5.3H7z"></path></svg></span>
<div><b>云杉优选</b><span>数据中心 · 大促实时看板</span></div>
</div>
<div class="meta">
<span class="chip hot">周年庆大促 · 全天战报</span>
<span class="chip"><i></i>数据截至 2026-09-19 24:00</span>
</div>
</header>

<section class="hero tfx-h-sheen" aria-label="累计成交额">
<span class="ray a" aria-hidden="true"></span>
<span class="ray b" aria-hidden="true"></span>
<span class="ray c" aria-hidden="true"></span>
<svg class="burst" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="100" cy="100" r="34"></circle><circle cx="100" cy="100" r="58" stroke-dasharray="2 9"></circle><circle cx="100" cy="100" r="82" stroke-dasharray="1 13"></circle><path d="M100 4v26M100 170v26M4 100h26M170 100h26M32 32l18 18M150 150l18 18M168 32l-18 18M50 150l-18 18"></path></svg>
<div class="hero-main">
<p class="eyebrow"><b>收官</b>云杉优选 6 周年庆 · 9 月 19 日 00:00 至 24:00</p>
<h1>累计成交额</h1>
<p class="total"><small>¥</small>3.26<em>亿</em></p>
<p class="versus"><span class="up">▲ 同比 +25.0%</span><span class="num">上年周年庆 ¥2.608 亿 · 较年中大促环比 +12.4%</span></p>
</div>
<div class="hero-side">
<p class="fact"><span>目标完成率</span><b>108.7<small>%</small></b><em>目标 ¥3.00 亿</em></p>
<p class="fact"><span>访客数</span><b>1,630<small>万</small></b><em>同比 +9.2%</em></p>
<p class="fact"><span>峰值小时成交额</span><b>4,200<small>万元</small></b><em>00:00 至 01:00</em></p>
</div>
</section>

<section class="kpis tfx-e-deal" aria-label="核心指标">
<article class="card kpi tfx-h-lift" style="--tfx-i: 0">
<div class="kpi-head"><h2>支付订单数</h2><span class="delta">▲ 同比 21.3%</span></div>
<p class="value">130.4<small>万单</small></p>
<p class="note">上年同期 107.5 万单</p>
</article>
<article class="card kpi tfx-h-lift" style="--tfx-i: 1">
<div class="kpi-head"><h2>支付买家数</h2><span class="delta">▲ 同比 18.6%</span></div>
<p class="value">104.32<small>万人</small></p>
<p class="note">人均下单 1.25 单</p>
</article>
<article class="card kpi tfx-h-lift" style="--tfx-i: 2">
<div class="kpi-head"><h2>客单价</h2><span class="delta">▲ 同比 3.1%</span></div>
<p class="value"><small>¥</small>250</p>
<p class="note">成交额 ÷ 订单数，上年 ¥242.6</p>
</article>
<article class="card kpi tfx-h-lift" style="--tfx-i: 3">
<div class="kpi-head"><h2>转化率</h2><span class="delta">▲ 0.5 个百分点</span></div>
<p class="value">6.4<small>%</small></p>
<p class="note">买家数 ÷ 访客数，上年 5.9%</p>
</article>
</section>

<div class="grid">
<section class="card panel trend s8 tfx-h-lift">
<div class="card-head"><h2>分时成交趋势</h2><span>单位：万元 / 小时 · 全天合计 <b>32,600</b></span></div>
<div class="chart">
<svg viewBox="0 0 720 240" preserveAspectRatio="none" role="img" aria-label="面积图：9 月 19 日 0 点到 24 点每小时成交额。0 点开场达到 4,200 万元，5 点降到 240 万元，白天保持在 1,240 到 1,560 万元，20 点回升到 2,600 万元。">
<defs>
<linearGradient id="board-area" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#ff5a3d" stop-opacity=".62"></stop>
<stop offset=".6" stop-color="#e11d3f" stop-opacity=".2"></stop>
<stop offset="1" stop-color="#e11d3f" stop-opacity="0"></stop>
</linearGradient>
<linearGradient id="board-line" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#ffe9ad"></stop>
<stop offset=".5" stop-color="#ff8a3d"></stop>
<stop offset="1" stop-color="#ffd36b"></stop>
</linearGradient>
<filter id="board-glow" x="-10%" y="-40%" width="120%" height="180%">
<feGaussianBlur stdDeviation="7"></feGaussianBlur>
</filter>
</defs>
<g stroke="#5a2a24" stroke-width="1" stroke-dasharray="4 5">
<line x1="0" y1="0" x2="720" y2="0" vector-effect="non-scaling-stroke"></line>
<line x1="0" y1="80" x2="720" y2="80" vector-effect="non-scaling-stroke"></line>
<line x1="0" y1="160" x2="720" y2="160" vector-effect="non-scaling-stroke"></line>
</g>
<line x1="0" y1="240" x2="720" y2="240" stroke="#8a5a3a" stroke-width="1" vector-effect="non-scaling-stroke"></line>
<path d="M15 16 C25 64 35 128.9 45 160 C55 191.1 65 192.7 75 202.7 C85 212.6 95 215.8 105 219.7 C115 223.6 125 225.1 135 226.1 C145 227.2 155 227.2 165 227.2 C175 227.2 185 224.2 195 220.8 C205 217.4 215 212.4 225 206.9 C235 201.4 245 193.8 255 187.7 C265 181.7 275 175.8 285 170.7 C295 165.5 305 156.8 315 156.8 C325 156.8 335 159.8 345 161.1 C355 162.3 365 162.7 375 164.3 C385 165.9 395 169.1 405 170.7 C415 172.3 425 173.9 435 173.9 C445 173.9 455 172.8 465 171.7 C475 170.7 485 168.9 495 167.5 C505 166 515 165.5 525 163.2 C535 160.9 545 158.2 555 153.6 C565 149 575 144.2 585 135.5 C595 126.8 605 101.3 615 101.3 C625 101.3 635 102.2 645 112 C655 121.8 665 146.7 675 160 C685 173.3 695 181.3 705 192 L705 240 L15 240 Z" fill="url(#board-area)"></path>
<path d="M15 16 C25 64 35 128.9 45 160 C55 191.1 65 192.7 75 202.7 C85 212.6 95 215.8 105 219.7 C115 223.6 125 225.1 135 226.1 C145 227.2 155 227.2 165 227.2 C175 227.2 185 224.2 195 220.8 C205 217.4 215 212.4 225 206.9 C235 201.4 245 193.8 255 187.7 C265 181.7 275 175.8 285 170.7 C295 165.5 305 156.8 315 156.8 C325 156.8 335 159.8 345 161.1 C355 162.3 365 162.7 375 164.3 C385 165.9 395 169.1 405 170.7 C415 172.3 425 173.9 435 173.9 C445 173.9 455 172.8 465 171.7 C475 170.7 485 168.9 495 167.5 C505 166 515 165.5 525 163.2 C535 160.9 545 158.2 555 153.6 C565 149 575 144.2 585 135.5 C595 126.8 605 101.3 615 101.3 C625 101.3 635 102.2 645 112 C655 121.8 665 146.7 675 160 C685 173.3 695 181.3 705 192" fill="none" stroke="#ff6a3d" stroke-width="9" stroke-opacity=".8" stroke-linecap="round" filter="url(#board-glow)"></path>
<path d="M15 16 C25 64 35 128.9 45 160 C55 191.1 65 192.7 75 202.7 C85 212.6 95 215.8 105 219.7 C115 223.6 125 225.1 135 226.1 C145 227.2 155 227.2 165 227.2 C175 227.2 185 224.2 195 220.8 C205 217.4 215 212.4 225 206.9 C235 201.4 245 193.8 255 187.7 C265 181.7 275 175.8 285 170.7 C295 165.5 305 156.8 315 156.8 C325 156.8 335 159.8 345 161.1 C355 162.3 365 162.7 375 164.3 C385 165.9 395 169.1 405 170.7 C415 172.3 425 173.9 435 173.9 C445 173.9 455 172.8 465 171.7 C475 170.7 485 168.9 495 167.5 C505 166 515 165.5 525 163.2 C535 160.9 545 158.2 555 153.6 C565 149 575 144.2 585 135.5 C595 126.8 605 101.3 615 101.3 C625 101.3 635 102.2 645 112 C655 121.8 665 146.7 675 160 C685 173.3 695 181.3 705 192" fill="none" stroke="url(#board-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
</svg>
<span class="dot" style="left: 2.083%; top: 6.667%" aria-hidden="true"></span>
<span class="dot" style="left: 85.417%; top: 42.222%" aria-hidden="true"></span>
<span class="y" style="top: 0%">4,500</span>
<span class="y" style="top: 33.333%">3,000</span>
<span class="y" style="top: 66.667%">1,500</span>
<span class="y" style="top: 100%">0</span>
</div>
<div class="x"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
<ul class="peaks">
<li><b>4,200 万元</b>开场峰值 · 00:00 至 01:00</li>
<li><b>2,600 万元</b>晚间峰值 · 20:00 至 21:00</li>
<li><b>240 万元</b>凌晨低谷 · 05:00 至 06:00</li>
</ul>
</section>

<section class="card panel s4 tfx-h-lift">
<div class="card-head"><h2>渠道占比</h2><span>按成交额</span></div>
<div class="donut-wrap">
<div class="donut">
<svg viewBox="0 0 42 42" role="img" aria-label="环形图：App 62%，小程序 29%，网页 9%">
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#3a0c14" stroke-width="5"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#ff4d4f" stroke-width="5" stroke-dasharray="62 38" stroke-dashoffset="25"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#ff9a3d" stroke-width="5" stroke-dasharray="29 71" stroke-dashoffset="63"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#ffd36b" stroke-width="5" stroke-dasharray="9 91" stroke-dashoffset="34"></circle>
</svg>
<p class="donut-total"><b>62%</b><span>来自 App</span></p>
</div>
<ul class="legend">
<li><i style="background-color: #ff4d4f"></i>App<span>20,212 万元</span><b>62%</b></li>
<li><i style="background-color: #ff9a3d"></i>小程序<span>9,454 万元</span><b>29%</b></li>
<li><i style="background-color: #ffd36b"></i>网页<span>2,934 万元</span><b>9%</b></li>
</ul>
</div>
</section>

<section class="card panel s7 tfx-h-lift">
<div class="card-head"><h2>品类成交排行</h2><span>6 个品类合计 <b>32,600 万元</b></span></div>
<ol class="ranks tfx-e-grow">
<li class="rank"><span class="no">1</span><span class="name">家用电器</span><span class="track"><i style="width: 93.3%" class="tfx-bar"></i></span><span class="amt"><b>9,128 万元</b>28%</span></li>
<li class="rank"><span class="no">2</span><span class="name">手机数码</span><span class="track"><i style="width: 73.3%" class="tfx-bar"></i></span><span class="amt"><b>7,172 万元</b>22%</span></li>
<li class="rank"><span class="no">3</span><span class="name">服饰鞋包</span><span class="track"><i style="width: 60%" class="tfx-bar"></i></span><span class="amt"><b>5,868 万元</b>18%</span></li>
<li class="rank"><span class="no">4</span><span class="name">美妆个护</span><span class="track"><i style="width: 46.7%" class="tfx-bar"></i></span><span class="amt"><b>4,564 万元</b>14%</span></li>
<li class="rank"><span class="no">5</span><span class="name">食品生鲜</span><span class="track"><i style="width: 33.3%" class="tfx-bar"></i></span><span class="amt"><b>3,260 万元</b>10%</span></li>
<li class="rank"><span class="no">6</span><span class="name">家居家装</span><span class="track"><i style="width: 26.7%" class="tfx-bar"></i></span><span class="amt"><b>2,608 万元</b>8%</span></li>
</ol>
<p class="sum"><b>家用电器与手机数码</b>合计 16,300 万元，正好占全场成交额的一半。</p>
</section>

<section class="card panel s5 tfx-h-lift">
<div class="card-head"><h2>区域成交占比</h2><span>按收货地址</span></div>
<div class="cols tfx-e-grow">
<div class="col"><b>36%</b><i style="height: 90%" class="tfx-bar-v"></i></div>
<div class="col"><b>22%</b><i style="height: 55%" class="tfx-bar-v"></i></div>
<div class="col"><b>18%</b><i style="height: 45%" class="tfx-bar-v"></i></div>
<div class="col"><b>12%</b><i style="height: 30%" class="tfx-bar-v"></i></div>
<div class="col"><b>12%</b><i style="height: 30%" class="tfx-bar-v"></i></div>
</div>
<ul class="col-names">
<li>华东<span>11,736 万</span></li>
<li>华南<span>7,172 万</span></li>
<li>华北<span>5,868 万</span></li>
<li>西南<span>3,912 万</span></li>
<li>其他<span>3,912 万</span></li>
</ul>
<p class="sum"><b>华东成交 1.17 亿元</b>，超过全场的三分之一；华南与华北合计占 40%。</p>
</section>

<section class="card panel s7 tfx-h-lift">
<div class="card-head"><h2>热销商品 TOP 5</h2><span>按成交额排序</span></div>
<div class="table-wrap">
<table>
<thead>
<tr><th>排名</th><th>商品</th><th>品类</th><th class="r">销量</th><th class="r">成交额</th></tr>
</thead>
<tbody>
<tr><td><span class="badge g1">TOP 1</span></td><td>岚序系列 变频空调 1.5 匹</td><td class="kind">家用电器</td><td class="r">6,000 台</td><td class="r money">1,680 万元</td></tr>
<tr><td><span class="badge g2">TOP 2</span></td><td>星渡系列 5G 手机 256GB</td><td class="kind">手机数码</td><td class="r">4,200 台</td><td class="r money">1,470 万元</td></tr>
<tr><td><span class="badge g3">TOP 3</span></td><td>澄野系列 对开门冰箱 520 升</td><td class="kind">家用电器</td><td class="r">3,000 台</td><td class="r money">1,260 万元</td></tr>
<tr><td><span class="badge">TOP 4</span></td><td>拾光系列 修护精华套装</td><td class="kind">美妆个护</td><td class="r">21,000 套</td><td class="r money">1,008 万元</td></tr>
<tr><td><span class="badge">TOP 5</span></td><td>云迹系列 缓震跑鞋</td><td class="kind">服饰鞋包</td><td class="r">24,000 双</td><td class="r money">864 万元</td></tr>
</tbody>
</table>
</div>
<p class="sum"><b>5 款商品合计 6,282 万元</b>，占全场成交额的 19.3%。</p>
</section>

<section class="card panel s5 tfx-h-lift">
<div class="card-head"><h2>里程碑</h2><span>9 月 19 日</span></div>
<ol class="steps">
<li><time>00:08</time><span>成交额破 <b>1,000 万元</b></span></li>
<li><time>01:32</time><span>成交额破 <b>5,000 万元</b></span></li>
<li><time>09:35</time><span>成交额破 <b>1 亿元</b></span></li>
<li><time>16:52</time><span>成交额破 <b>2 亿元</b></span></li>
<li><time>20:20</time><span>超过上年周年庆全天的 <b>2.608 亿元</b></span></li>
<li><time>21:55</time><span>成交额破 <b>3 亿元</b></span></li>
<li class="end"><time>24:00</time><span>收官，累计成交额 <b>3.26 亿元</b></span></li>
</ol>
</section>
</div>

<footer class="foot">
<p>云杉优选 · 数据中心 · 口径：支付成功的订单，未扣除退款</p>
<p>本页的品牌、商品与数据均为虚构，仅作示例。</p>
</footer>
</main>


</body></html>
`;

  /* 网站：新品发布页 */
  const LAUNCH = `<!DOCTYPE html>
<html lang="zh-Hans"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>云杉 Watch 3 | 充一次电，用两周</title>
<style>
  :root {
    --night: #08080a;
    --night-2: #111114;
    --night-3: #1a1a1f;
    --day: #f5f5f7;
    --paper: #ffffff;
    --ink: #111114;
    --ink-2: #4a4a52;
    --snow: #f7f7f9;
    --snow-2: #b9b9c2;
    --line-d: rgba(255, 255, 255, .14);
    --line-l: rgba(17, 17, 20, .12);
    --amber: #ffb23f;
    --flame: #ff6a2a;
    --rose: #ff3d77;
    --warm-d: #ff9a52;
    --warm-l: #b93a08;
    --grad: linear-gradient(110deg, #ffc04d, #ff6a2a 52%, #ff3d77);
    --grad-l: linear-gradient(110deg, #f97316, #e11d48);
    --font: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--night); color: var(--snow); font-family: var(--font); font-size: 16px; line-height: 1.7; }
  h1, h2, h3, p, figure, fieldset, legend { margin: 0; padding: 0; }
  fieldset { border: 0; min-width: 0; }
  a { color: inherit; text-decoration: none; }
  svg { display: block; }
  .container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 54px; padding: 0 34px; border: 1px solid rgba(255, 255, 255, .34); border-radius: 99px; background: rgba(255, 255, 255, .06); color: #fff; font-family: inherit; font-size: 16px; font-weight: 700; text-align: center; cursor: pointer; }
  .btn:hover { background: rgba(255, 255, 255, .16); }
  .btn-primary { border-color: transparent; background: linear-gradient(110deg, #ffc04d, #ff7a2f); color: #1c0b00; box-shadow: 0 12px 40px rgba(255, 106, 42, .38); }
  .btn-primary:hover { background: linear-gradient(110deg, #ffd27a, #ff8d4a); }
  .btn-sm { min-height: 38px; padding: 0 20px; font-size: 14px; box-shadow: none; }

  .nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 28px; height: 60px; padding: 0 max(24px, 50% - 556px); border-bottom: 1px solid var(--line-d); background: rgba(8, 8, 10, .82); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); color: #fff; }
  .logo { display: inline-flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; letter-spacing: .04em; }
  .logo svg { flex: none; width: 26px; height: 26px; }
  .nav-links { display: flex; gap: 30px; margin-left: auto; font-size: 14px; color: var(--snow-2); }
  .nav-links a:hover { color: #fff; }

  .hero { position: relative; padding: 96px 0 0; background: var(--night); text-align: center; overflow: clip; }
  .orbs { position: absolute; inset: 0; overflow: clip; pointer-events: none; }
  .orb { position: absolute; display: block; border-radius: 50%; }
  .orb-a { left: 50%; top: 34%; width: 900px; height: 900px; margin-left: -450px; background: radial-gradient(closest-side, rgba(255, 106, 42, .5), rgba(255, 61, 119, .18) 55%, transparent); }
  .orb-b { left: -8%; top: 4%; width: 460px; height: 460px; background: radial-gradient(closest-side, rgba(255, 178, 63, .26), transparent); }
  .orb-c { right: -10%; top: 46%; width: 560px; height: 560px; background: radial-gradient(closest-side, rgba(255, 61, 119, .3), transparent); }
  .hero .container { position: relative; }
  .tag { display: inline-flex; align-items: center; gap: 10px; padding: 5px 18px 5px 6px; border: 1px solid var(--line-d); border-radius: 99px; background: rgba(255, 255, 255, .06); font-size: 14px; color: var(--snow-2); }
  .tag b { padding: 0 12px; border-radius: 99px; background: linear-gradient(110deg, #ffc04d, #ff7a2f); color: #1c0b00; font-size: 12px; line-height: 24px; }
  .hero h1 { margin: 26px 0 10px; font-size: clamp(50px, 10.4vw, 132px); line-height: 1.05; font-weight: 800; letter-spacing: -.02em; }
  .slogan { font-size: clamp(22px, 3.4vw, 40px); line-height: 1.3; font-weight: 700; color: var(--warm-d); background: var(--grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; margin: 36px 0 20px; }
  .sale { font-size: 16px; color: var(--snow-2); }
  .sale b { color: #fff; }
  .watch { width: min(560px, 80%); margin: 24px auto 0; }
  .watch svg { width: 100%; height: auto; filter: drop-shadow(0 50px 70px rgba(0, 0, 0, .6)); }
  .facts { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: -84px 0 0; padding: 0; border: 1px solid var(--line-d); border-radius: 26px 26px 0 0; border-bottom: 0; background: rgba(17, 17, 20, .78); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); list-style: none; }
  .facts li { padding: 26px 12px 30px; font-size: 14px; line-height: 1.5; color: var(--snow-2); }
  .facts li + li { border-left: 1px solid var(--line-d); }
  .facts b { display: block; font-size: clamp(24px, 3.2vw, 38px); line-height: 1.25; letter-spacing: -.01em; color: #fff; }

  .statement { padding: 150px 0; background: var(--day); color: var(--ink); }
  .statement p { max-width: 20em; margin: 0 auto; text-align: center; text-wrap: balance; font-size: clamp(28px, 4.8vw, 58px); line-height: 1.35; font-weight: 800; letter-spacing: -.01em; }

  .feature { position: relative; padding: 150px 0 160px; text-align: center; overflow: clip; }
  .feature.dark { background: var(--night); color: var(--snow); }
  .feature.light { background: var(--day); color: var(--ink); }
  .kicker { font-size: 16px; font-weight: 700; letter-spacing: .3em; text-indent: .3em; color: var(--warm-d); }
  .light .kicker { color: var(--warm-l); }
  .num { margin: 8px 0 4px; font-size: clamp(104px, 19vw, 248px); line-height: 1; font-weight: 800; letter-spacing: -.04em; color: var(--warm-d); background: var(--grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .light .num { color: var(--warm-l); background-image: var(--grad-l); }
  .num small { margin-left: .12em; font-size: .26em; letter-spacing: 0; }
  .feature h2 { font-size: clamp(30px, 4.6vw, 56px); line-height: 1.2; font-weight: 800; letter-spacing: -.01em; }
  .desc { max-width: 34em; margin: 20px auto 0; font-size: 18px; color: var(--snow-2); }
  .light .desc { color: var(--ink-2); }
  .fine { max-width: 46em; margin: 40px auto 0; font-size: 14px; line-height: 1.6; color: var(--snow-2); }
  .light .fine { color: var(--ink-2); }
  .art { margin: 72px auto 0; }

  .days { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 10px; max-width: 940px; padding: 0; list-style: none; }
  .days li { display: grid; align-items: end; justify-items: center; height: 150px; padding-bottom: 12px; border-radius: 16px; background: linear-gradient(180deg, #ffc04d, #ff6a2a 60%, #ff3d77); color: #1c0b00; font-size: 16px; font-weight: 800; }
  .days li:nth-child(n + 8) { background: linear-gradient(180deg, #ffb23f, #ff6a2a 60%, #ff4d6d); }
  .days-note { display: flex; justify-content: space-between; max-width: 940px; margin: 14px auto 0; font-size: 14px; color: var(--snow-2); }

  .dial { width: min(430px, 82%); }
  .dial svg { width: 100%; height: auto; filter: drop-shadow(0 40px 60px rgba(17, 17, 20, .28)); }

  .pulse { max-width: 940px; padding: 34px 34px 30px; border: 1px solid var(--line-d); border-radius: 28px; background: linear-gradient(180deg, var(--night-3), var(--night-2)); text-align: left; }
  .pulse svg { width: 100%; height: auto; }
  .pulse-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 16px; margin-bottom: 12px; font-size: 14px; color: var(--snow-2); }
  .pulse-head b { font-size: 16px; color: #fff; }
  .vitals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 22px 0 0; padding: 0; list-style: none; }
  .vitals li { padding: 16px 18px; border: 1px solid var(--line-d); border-radius: 18px; background: rgba(255, 255, 255, .04); font-size: 14px; line-height: 1.5; color: var(--snow-2); }
  .vitals b { display: block; font-size: 28px; line-height: 1.3; letter-spacing: -.01em; color: #fff; }
  .vitals b small { margin-left: 4px; font-size: 14px; font-weight: 500; letter-spacing: 0; color: var(--snow-2); }

  .ripple { width: min(620px, 92%); }
  .ripple svg { width: 100%; height: auto; }

  .section { padding: 130px 0; }
  .section.dark { background: var(--night-2); color: var(--snow); }
  .section.light { background: var(--day); color: var(--ink); }
  .section.paper { background: var(--paper); color: var(--ink); }
  .head { max-width: 720px; margin: 0 auto 56px; text-align: center; }
  .head h2 { margin-top: 10px; font-size: clamp(32px, 5vw, 60px); line-height: 1.2; font-weight: 800; letter-spacing: -.01em; }
  .head p:not(.kicker) { margin-top: 16px; font-size: 18px; color: var(--snow-2); }
  .light .head p:not(.kicker), .paper .head p:not(.kicker) { color: var(--ink-2); }
  .paper .kicker { color: var(--warm-l); }

  .specs { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 16px; line-height: 1.5; }
  .specs th, .specs td { padding: 18px 16px; border-bottom: 1px solid var(--line-d); text-align: left; vertical-align: top; font-weight: 400; color: var(--snow-2); }
  .specs thead th { padding-bottom: 26px; font-size: 14px; }
  .specs thead b { display: block; font-size: clamp(18px, 2.4vw, 28px); line-height: 1.3; color: #fff; }
  .specs thead th:first-child { width: 17%; }
  .specs tbody th { color: var(--snow-2); }
  .specs td { color: #fff; }
  .specs .cost td { border-bottom: 0; padding-top: 26px; font-size: clamp(22px, 3vw, 36px); line-height: 1.2; font-weight: 800; letter-spacing: -.01em; color: var(--warm-d); }
  .specs .cost th { border-bottom: 0; padding-top: 32px; }
  .specs-note { margin-top: 28px; font-size: 14px; color: var(--snow-2); }

  .colors { --strap: #1d1d22; --strap-2: #0c0c0f; --case: #3b3b44; --case-2: #9a9aa6; }
  .colors:has(.s-pine:checked) { --strap: #47685a; --strap-2: #2c4439; --case: #7f948a; --case-2: #dfe7e2; }
  .colors:has(.s-mist:checked) { --strap: #d6d8de; --strap-2: #a9adb8; --case: #a2a6b0; --case-2: #f4f5f8; }
  .colors:has(.s-dusk:checked) { --strap: #f0672c; --strap-2: #c2410c; --case: #6b4a3c; --case-2: #e9c9b6; }
  .picker { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 56px; max-width: 940px; margin: 0 auto; }
  .mini { width: min(300px, 70%); margin: 0 auto; }
  .mini svg { width: 100%; height: auto; filter: drop-shadow(0 30px 40px rgba(17, 17, 20, .22)); }
  .m-strap { fill: var(--strap); }
  .m-strap-2 { fill: var(--strap-2); }
  .m-case { fill: var(--case); }
  .m-case-2 { fill: var(--case-2); }
  .swatches legend { margin-bottom: 18px; font-size: 14px; color: var(--ink-2); }
  .swatch-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .swatch { position: relative; display: flex; align-items: center; gap: 14px; padding: 16px 18px; border: 2px solid var(--line-l); border-radius: 20px; background: var(--paper); font-weight: 700; line-height: 1.4; cursor: pointer; }
  .swatch input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .swatch:has(input:checked) { border-color: #d9480f; box-shadow: 0 10px 30px rgba(217, 72, 15, .16); }
  .swatch:has(input:focus-visible) { outline: 3px solid #d9480f; outline-offset: 3px; }
  .swatch i { flex: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(17, 17, 20, .18); }
  .swatch span small { display: block; font-size: 14px; font-weight: 400; color: var(--ink-2); }
  .c-obsidian { background: linear-gradient(135deg, #3b3b44, #0c0c0f); }
  .c-pine { background: linear-gradient(135deg, #6f9080, #2c4439); }
  .c-mist { background: linear-gradient(135deg, #f4f5f8, #a9adb8); }
  .c-dusk { background: linear-gradient(135deg, #ff9a52, #c2410c); }

  .perks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .perk { padding: 36px 32px 34px; border: 1px solid var(--line-l); border-radius: 28px; background: var(--day); }
  .perk svg { width: 56px; height: 56px; margin-bottom: 26px; padding: 14px; border-radius: 18px; background: linear-gradient(135deg, #ffc04d, #ff6a2a); color: #1c0b00; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .perk h3 { font-size: 24px; line-height: 1.3; }
  .perk strong { display: block; margin: 8px 0 10px; font-size: 18px; color: var(--warm-l); }
  .perk p { color: var(--ink-2); }

  .reserve { position: relative; padding: 130px 0; background: var(--night); overflow: clip; }
  .reserve-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(46% 60% at 10% 0%, rgba(255, 106, 42, .34), transparent 70%), radial-gradient(40% 56% at 96% 100%, rgba(255, 61, 119, .28), transparent 70%); }
  .reserve .container { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 64px; }
  .reserve h2 { margin: 10px 0 18px; font-size: clamp(32px, 5vw, 60px); line-height: 1.2; font-weight: 800; letter-spacing: -.01em; }
  .reserve .lead { font-size: 18px; color: var(--snow-2); }
  .reserve .lead b { color: #fff; }
  .steps { display: grid; gap: 10px; margin: 28px 0 0; padding: 0; list-style: none; color: var(--snow-2); }
  .steps li { display: flex; gap: 14px; }
  .steps b { flex: none; width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 255, 255, .12); color: #fff; font-size: 14px; line-height: 28px; text-align: center; }
  .form { display: grid; gap: 18px; padding: 36px 34px; border: 1px solid var(--line-d); border-radius: 28px; background: rgba(26, 26, 31, .86); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
  .field { display: grid; gap: 8px; }
  .field label { font-size: 14px; font-weight: 700; color: #fff; }
  .field input, .field select { width: 100%; min-height: 52px; padding: 0 16px; border: 1px solid rgba(255, 255, 255, .28); border-radius: 14px; background: #0c0c0f; color: #fff; font-family: inherit; font-size: 16px; }
  .field input::placeholder { color: #9a9aa6; }
  .field input:focus-visible, .field select:focus-visible { outline: 3px solid var(--warm-d); outline-offset: 2px; }
  .form .btn { width: 100%; margin-top: 6px; }
  .form-note { font-size: 14px; line-height: 1.6; color: var(--snow-2); }

  .faq { max-width: 840px; margin: 0 auto; border-top: 1px solid var(--line-l); }
  .faq details { border-bottom: 1px solid var(--line-l); }
  .faq summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 24px 4px; font-size: 18px; font-weight: 700; line-height: 1.5; list-style: none; cursor: pointer; }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after { content: "+"; display: grid; place-items: center; flex: none; width: 32px; height: 32px; border-radius: 50%; background: #e6e6ea; font-size: 20px; line-height: 1; }
  .faq [open] summary::after { background: var(--ink); color: #fff; transform: rotate(45deg); }
  .faq details p { padding: 0 4px 26px; color: var(--ink-2); }

  .footer { padding: 56px 0 40px; background: var(--night); border-top: 1px solid var(--line-d); font-size: 14px; color: var(--snow-2); }
  .footer .container { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px; }
  .footer .logo { color: #fff; }
  .footer .brand p { margin-top: 10px; }
  .footer nav { display: flex; flex-wrap: wrap; align-content: start; gap: 12px 28px; }
  .footer nav a:hover { color: #fff; }
  .legal { flex-basis: 100%; display: grid; gap: 6px; padding-top: 24px; border-top: 1px solid var(--line-d); line-height: 1.6; }

  @media (max-width: 900px) {
    .nav-links { gap: 20px; }
    .statement { padding: 110px 0; }
    .feature { padding: 110px 0 120px; }
    .section, .reserve { padding: 100px 0; }
    .days { grid-template-columns: repeat(7, minmax(0, 1fr)); max-width: 560px; }
    .days li { height: 110px; }
    .days-note { max-width: 560px; }
    .vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .picker { grid-template-columns: minmax(0, 1fr); gap: 44px; max-width: 520px; }
    .perks { grid-template-columns: minmax(0, 1fr); max-width: 520px; margin: 0 auto; }
    .reserve .container { grid-template-columns: minmax(0, 1fr); gap: 48px; max-width: 600px; }
  }
  @media (max-width: 640px) {
    .container { padding: 0 16px; }
    .nav { gap: 12px; padding: 0 16px; }
    .nav-links { display: none; }
    .nav .btn { margin-left: auto; }
    .hero { padding-top: 64px; }
    .actions .btn { flex: 1 1 100%; }
    .watch { width: 84%; }
    .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: -40px; border-radius: 22px 22px 0 0; }
    .facts li { padding: 18px 8px; }
    .facts li + li { border-left: 0; }
    .facts li:nth-child(even) { border-left: 1px solid var(--line-d); }
    .facts li:nth-child(n + 3) { border-top: 1px solid var(--line-d); }
    .statement { padding: 84px 0; }
    .feature { padding: 84px 0 92px; }
    .section, .reserve { padding: 80px 0; }
    .head { margin-bottom: 40px; }
    .art { margin-top: 52px; }
    .days { gap: 8px; }
    .days li { height: 84px; border-radius: 12px; font-size: 14px; }
    .pulse { padding: 20px 16px; border-radius: 22px; }
    .vitals { gap: 8px; }
    .vitals li { padding: 12px; }
    .vitals b { font-size: 24px; }
    .specs { font-size: 14px; }
    .specs th, .specs td { padding: 14px 6px; }
    .specs thead th:first-child { width: 19%; }
    .swatch { padding: 12px; gap: 10px; }
    .swatch i { width: 32px; height: 32px; }
    .perk { padding: 28px 24px; }
    .form { padding: 26px 20px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }
</style>
<style data-he-style="fx">/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
:where(.tfx-h-sheen) { position: relative; }
:where(.tfx-s-shrink) { position: sticky; top: 0; z-index: 20; }</style><style data-he-style="fx-motion">/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */
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
      @keyframes tfx-blur-rise { from { opacity: 0; transform: translateY(calc(1.25rem * var(--tfx-k, 1))); filter: blur(calc(6px * var(--tfx-k, 1))); } }
      .tfx-e-blur-rise { animation: tfx-blur-rise linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15%, 3rem + var(--tfx-t, 0) * 3rem) entry min(75% + var(--tfx-t, 0) * 25%, 16rem + var(--tfx-t, 0) * 4rem); }
      @keyframes tfx-parallax { from { transform: translateY(calc(12% * var(--tfx-k, 1))); } to { transform: translateY(calc(-12% * var(--tfx-k, 1))); } }
      .tfx-s-parallax { animation: tfx-parallax linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover 0% cover 100%; }
      @keyframes tfx-tilt-up { from { opacity: calc(1 - .5 * var(--tfx-k, 1)); transform: perspective(60rem) rotateX(calc(22deg * var(--tfx-k, 1))); } }
      .tfx-s-tilt-up { transform-origin: 50% 100%; animation: tfx-tilt-up linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry calc(var(--tfx-t, 0) * min(15%, 3rem)) entry min(90% + var(--tfx-t, 0) * 10%, 18rem + var(--tfx-t, 0) * 4rem); }
      @keyframes tfx-shrink { to { transform: translateY(calc(.4rem * var(--tfx-k, 1))) scale(calc(1 - .04 * var(--tfx-k, 1))); border-radius: calc(.9rem * var(--tfx-k, 1)); box-shadow: 0 .6rem 1.6rem -.8rem rgb(0 0 0 / .32); } }
      .tfx-s-shrink { transform-origin: 50% 0; animation: tfx-shrink linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: scroll(root); animation-range: 0px calc(200px + var(--tfx-t, 0) * 100px); }
      @keyframes tfx-fill { from { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(color-mix(in srgb, currentColor 35%, transparent), color-mix(in srgb, currentColor 35%, transparent)), none; background-size: 0% 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; -webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent; } to { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(color-mix(in srgb, currentColor 35%, transparent), color-mix(in srgb, currentColor 35%, transparent)), none; background-size: 100% 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; -webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent; } }
      .tfx-s-fill { animation: tfx-fill linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover calc(20% + var(--tfx-t, 0) * 10%) cover calc(50% + var(--tfx-t, 0) * 10%); }
    }
  }
}</style></head>
<body id="top">
<header class="nav tfx-s-shrink">
  <a class="logo" href="#top">
    <svg viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc04d"></stop><stop offset=".55" stop-color="#ff6a2a"></stop><stop offset="1" stop-color="#ff3d77"></stop></linearGradient></defs><path d="M14 2l6 8h-3l5 7h-4l5 7H5l5-7H6l5-7H8z" fill="url(#lg-logo)"></path><path d="M14 23v4" stroke="#ff6a2a" stroke-width="2.4" stroke-linecap="round"></path></svg>
    云杉
  </a>
  <nav class="nav-links" aria-label="主导航">
    <a href="#battery">续航</a>
    <a href="#screen">屏幕</a>
    <a href="#health">健康</a>
    <a href="#water">防水</a>
    <a href="#specs">参数</a>
    <a href="#faq">常见问题</a>
  </nav>
  <a class="btn btn-primary btn-sm tfx-h-sheen" href="#reserve">立即预约</a>
</header>

<main>
<section class="hero">
  <div class="orbs" aria-hidden="true"><i class="orb orb-a tfx-s-parallax"></i><i class="orb orb-b tfx-s-parallax"></i><i class="orb orb-c tfx-s-parallax"></i></div>
  <div class="container">
    <p class="tag"><b>新品</b>2026年11月20日 10:00 开售</p>
    <h1>云杉 Watch 3</h1>
    <p class="slogan">充一次电，用两周。</p>
    <div class="actions">
      <a class="btn btn-primary tfx-h-sheen" href="#reserve">立即预约</a>
      <a class="btn" href="#battery">了解更多</a>
    </div>
    <p class="sale">售价 <b>¥1,299 起</b>，预约不收取费用</p>
    <figure class="watch">
      <svg viewBox="0 0 440 600" role="img" aria-label="云杉 Watch 3 正面：圆形表盘，显示时间 10:08">
        <defs>
          <linearGradient id="hw-strap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d0d10"></stop><stop offset=".3" stop-color="#2b2b32"></stop><stop offset=".7" stop-color="#1c1c21"></stop><stop offset="1" stop-color="#09090b"></stop></linearGradient>
          <linearGradient id="hw-case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f7"></stop><stop offset=".3" stop-color="#8f8f9a"></stop><stop offset=".55" stop-color="#3c3c45"></stop><stop offset=".8" stop-color="#a9a9b4"></stop><stop offset="1" stop-color="#55555f"></stop></linearGradient>
          <radialGradient id="hw-glass" cx=".36" cy=".28" r=".9"><stop offset="0" stop-color="#24242c"></stop><stop offset=".55" stop-color="#0b0b0e"></stop><stop offset="1" stop-color="#030304"></stop></radialGradient>
          <linearGradient id="hw-arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc04d"></stop><stop offset=".5" stop-color="#ff6a2a"></stop><stop offset="1" stop-color="#ff3d77"></stop></linearGradient>
        </defs>
        <path d="M146 196L162 38q2-22 24-22h68q22 0 24 22l16 158z" fill="url(#hw-strap)"></path>
        <path d="M146 404l16 158q2 22 24 22h68q22 0 24-22l16-158z" fill="url(#hw-strap)"></path>
        <ellipse cx="220" cy="478" rx="9" ry="6" fill="#050506"></ellipse>
        <ellipse cx="220" cy="510" rx="9" ry="6" fill="#050506"></ellipse>
        <ellipse cx="220" cy="542" rx="9" ry="6" fill="#050506"></ellipse>
        <rect x="374" y="280" width="22" height="40" rx="9" fill="#8f8f9a" transform="rotate(-30 220 300)"></rect>
        <rect x="374" y="280" width="22" height="40" rx="9" fill="#6d6d78" transform="rotate(30 220 300)"></rect>
        <circle cx="220" cy="300" r="164" fill="url(#hw-case)"></circle>
        <circle cx="220" cy="300" r="153" fill="#050506"></circle>
        <circle cx="220" cy="300" r="146" fill="url(#hw-glass)"></circle>
        <circle cx="220" cy="300" r="136" fill="none" stroke="#ffffff" stroke-opacity=".34" stroke-width="6" stroke-dasharray="2 69.21"></circle>
        <circle cx="220" cy="300" r="120" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="11"></circle>
        <circle cx="220" cy="300" r="120" fill="none" stroke="url(#hw-arc)" stroke-width="11" stroke-linecap="round" stroke-dasharray="560 194" transform="rotate(-90 220 300)"></circle>
        <text x="220" y="244" text-anchor="middle" font-size="22" fill="#c9c9d2">11月20日 周五</text>
        <text x="220" y="330" text-anchor="middle" font-size="86" font-weight="700" fill="#ffffff">10:08</text>
        <text x="220" y="376" text-anchor="middle" font-size="22" font-weight="700" fill="#ff9a52">8,426 步</text>
        <path d="M96 262A132 132 0 0 1 292 176A210 210 0 0 0 96 262z" fill="#ffffff" opacity=".07"></path>
      </svg>
    </figure>
    <ul class="facts" aria-label="主要参数">
      <li><b>约 14 天</b>典型使用场景续航</li>
      <li><b>1.43 英寸</b>AMOLED 圆形屏幕</li>
      <li><b>5ATM</b>50 米防水等级</li>
      <li><b>约 32 克</b>标准版表体重量</li>
    </ul>
  </div>
</section>

<section class="statement" aria-label="产品理念">
  <div class="container">
    <p class="tfx-s-fill">续航、屏幕、健康、防水。云杉 Watch 3 把每天都用得上的四件事，认真做了一遍。</p>
  </div>
</section>

<section class="feature dark f-battery" id="battery">
  <div class="container">
    <p class="kicker">续航</p>
    <p class="num">14<small>天</small></p>
    <h2 class="tfx-e-blur-rise">出差两周，不用带充电器。</h2>
    <p class="desc">510 毫安时电池加上低功耗芯片，典型使用场景下续航约 14 天。磁吸充电约 75 分钟充满。</p>
    <ol class="days art" aria-label="两周，每格代表一天">
      <li>1</li><li>2</li><li>3</li><li>4</li><li>5</li><li>6</li><li>7</li><li>8</li><li>9</li><li>10</li><li>11</li><li>12</li><li>13</li><li>14</li>
    </ol>
    <p class="days-note"><span>第 1 天：充满电</span><span>第 14 天：仍在使用</span></p>
    <p class="fine">典型使用场景：全天佩戴，开启心率与睡眠监测，每天收到约 150 条消息提醒、抬腕亮屏约 200 次，每周 GPS 运动 90 分钟。开启屏幕常亮后续航约 7 天。实际续航因设置与使用习惯而不同。</p>
  </div>
</section>

<section class="feature light f-screen" id="screen">
  <div class="container">
    <p class="kicker">屏幕</p>
    <p class="num">2000<small>尼特</small></p>
    <h2>正午的阳光下，也看得清。</h2>
    <p class="desc">1.43 英寸 AMOLED 屏幕，分辨率 466 × 466。户外高亮模式下，峰值亮度可达 2000 尼特。</p>
    <figure class="dial art tfx-s-tilt-up">
      <svg viewBox="0 0 400 400" role="img" aria-label="表盘示意：高亮模式下的日出表盘">
        <defs>
          <linearGradient id="sc-case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"></stop><stop offset=".35" stop-color="#a9a9b4"></stop><stop offset=".6" stop-color="#55555f"></stop><stop offset="1" stop-color="#c9c9d2"></stop></linearGradient>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0f2e"></stop><stop offset=".5" stop-color="#7a1f4a"></stop><stop offset=".78" stop-color="#ff6a2a"></stop><stop offset="1" stop-color="#ffc04d"></stop></linearGradient>
          <radialGradient id="sc-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbea"></stop><stop offset=".45" stop-color="#ffd27a"></stop><stop offset="1" stop-color="#ff8d4a"></stop></radialGradient>
          <clipPath id="sc-clip"><circle cx="200" cy="200" r="160"></circle></clipPath>
        </defs>
        <circle cx="200" cy="200" r="184" fill="url(#sc-case)"></circle>
        <circle cx="200" cy="200" r="171" fill="#050506"></circle>
        <g clip-path="url(#sc-clip)">
          <rect x="40" y="40" width="320" height="320" fill="url(#sc-sky)"></rect>
          <circle cx="200" cy="262" r="118" fill="#ffd27a" opacity=".2"></circle>
          <circle cx="200" cy="262" r="86" fill="#ffd27a" opacity=".28"></circle>
          <circle cx="200" cy="262" r="56" fill="url(#sc-sun)"></circle>
          <path d="M40 262h320v98H40z" fill="#12080f"></path>
          <path d="M40 262q40-34 82-12t78-26 76 30 84-18v26z" fill="#12080f"></path>
          <path d="M150 284h100M166 304h68M180 322h40" stroke="#ffb23f" stroke-width="5" stroke-linecap="round" opacity=".7"></path>
        </g>
        <text x="200" y="150" text-anchor="middle" font-size="70" font-weight="700" fill="#ffffff">06:42</text>
        <path d="M86 168A122 122 0 0 1 262 82A196 196 0 0 0 86 168z" fill="#ffffff" opacity=".1"></path>
      </svg>
    </figure>
    <p class="fine">2000 尼特为户外高亮模式下的峰值亮度，手动调节时的亮度上限为 600 尼特。屏幕由强化玻璃覆盖，钛金属版使用蓝宝石玻璃。</p>
  </div>
</section>

<section class="feature dark f-health" id="health">
  <div class="container">
    <p class="kicker">健康</p>
    <p class="num">24<small>小时</small></p>
    <h2 class="tfx-e-blur-rise">白天到深夜，一直在记录。</h2>
    <p class="desc">心率、血氧、睡眠、压力，四项数据全天自动记录。每天早晨，手表给你一份看得懂的小结。</p>
    <div class="pulse art">
      <p class="pulse-head"><b>今日心率</b><span>示意数据</span></p>
      <svg viewBox="0 0 860 180" role="img" aria-label="心率曲线示意图">
        <defs>
          <linearGradient id="hl-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffc04d"></stop><stop offset=".5" stop-color="#ff6a2a"></stop><stop offset="1" stop-color="#ff3d77"></stop></linearGradient>
          <linearGradient id="hl-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a2a" stop-opacity=".34"></stop><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"></stop></linearGradient>
        </defs>
        <path d="M0 45h860M0 90h860M0 135h860" stroke="#ffffff" stroke-opacity=".08"></path>
        <path d="M0 128C40 126 70 132 110 124S180 104 215 108 270 86 300 70 340 44 372 52 420 98 455 100 520 84 552 90 610 36 640 28 690 78 725 92 800 112 860 118V180H0z" fill="url(#hl-area)"></path>
        <path d="M0 128C40 126 70 132 110 124S180 104 215 108 270 86 300 70 340 44 372 52 420 98 455 100 520 84 552 90 610 36 640 28 690 78 725 92 800 112 860 118" fill="none" stroke="url(#hl-line)" stroke-width="5" stroke-linecap="round"></path>
        <circle cx="640" cy="28" r="9" fill="#111114" stroke="#ff6a2a" stroke-width="5"></circle>
      </svg>
      <ul class="vitals">
        <li><b>72<small>次/分</small></b>静息心率</li>
        <li><b>98<small>%</small></b>血氧饱和度</li>
        <li><b>7.5<small>小时</small></b>昨晚睡眠</li>
        <li><b>偏低</b>压力水平</li>
      </ul>
    </div>
    <p class="fine">云杉 Watch 3 不是医疗器械。监测数据仅供日常参考，不能用于诊断或治疗。身体不适时，请咨询医生。</p>
  </div>
</section>

<section class="feature light f-water" id="water">
  <div class="container">
    <p class="kicker">防水</p>
    <p class="num">50<small>米</small></p>
    <h2>戴着它，下水游几圈。</h2>
    <p class="desc">5ATM 防水等级，泳池和浅水区游泳时可以佩戴。游完后，手表自动把扬声器里的水排出去。</p>
    <figure class="ripple art tfx-s-tilt-up">
      <svg viewBox="0 0 620 300" role="img" aria-label="水滴与水波示意图">
        <defs>
          <linearGradient id="wt-drop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc04d"></stop><stop offset=".5" stop-color="#ff6a2a"></stop><stop offset="1" stop-color="#e11d48"></stop></linearGradient>
        </defs>
        <ellipse cx="310" cy="222" rx="300" ry="68" fill="none" stroke="#111114" stroke-opacity=".08" stroke-width="2"></ellipse>
        <ellipse cx="310" cy="222" rx="236" ry="53" fill="none" stroke="#111114" stroke-opacity=".14" stroke-width="2"></ellipse>
        <ellipse cx="310" cy="222" rx="172" ry="38" fill="none" stroke="#111114" stroke-opacity=".22" stroke-width="2.5"></ellipse>
        <ellipse cx="310" cy="222" rx="108" ry="24" fill="none" stroke="#e2500f" stroke-opacity=".6" stroke-width="3"></ellipse>
        <ellipse cx="310" cy="222" rx="46" ry="10" fill="#e2500f" fill-opacity=".22"></ellipse>
        <path d="M310 14c38 50 62 86 62 118a62 62 0 0 1-124 0c0-32 24-68 62-118z" fill="url(#wt-drop)"></path>
        <path d="M278 128c0-18 10-38 24-58" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="7" stroke-linecap="round"></path>
      </svg>
    </figure>
    <p class="fine">5ATM 表示手表能承受相当于 50 米水深的静态水压，不代表可以下潜到 50 米。不适用于热水淋浴、桑拿、潜水、跳水和高速水上运动。防水性能会随日常磨损下降。</p>
  </div>
</section>

<section class="section dark" id="specs">
  <div class="container">
    <div class="head">
      <p class="kicker">参数</p>
      <h2>三个版本，选适合你的。</h2>
      <p>三个版本的屏幕、续航和防水相同，区别在表壳、玻璃和通话方式。</p>
    </div>
    <table class="specs">
      <thead>
        <tr><th scope="col"><span>版本</span></th><th scope="col"><b>标准版</b>日常佩戴</th><th scope="col"><b>eSIM 版</b>独立通话</th><th scope="col"><b>钛金属版</b>更轻更耐磨</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row">表壳</th><td>铝合金</td><td>铝合金</td><td>钛合金</td></tr>
        <tr><th scope="row">屏幕玻璃</th><td>强化玻璃</td><td>强化玻璃</td><td>蓝宝石玻璃</td></tr>
        <tr><th scope="row">屏幕</th><td>1.43 英寸 AMOLED</td><td>1.43 英寸 AMOLED</td><td>1.43 英寸 AMOLED</td></tr>
        <tr><th scope="row">续航</th><td>约 14 天</td><td>约 14 天，开启 eSIM 后约 9 天</td><td>约 14 天，开启 eSIM 后约 9 天</td></tr>
        <tr><th scope="row">防水</th><td>5ATM</td><td>5ATM</td><td>5ATM</td></tr>
        <tr><th scope="row">通话</th><td>蓝牙通话</td><td>蓝牙通话，eSIM 独立通话</td><td>蓝牙通话，eSIM 独立通话</td></tr>
        <tr><th scope="row">存储</th><td>8 GB</td><td>32 GB</td><td>32 GB</td></tr>
        <tr><th scope="row">表体重量</th><td>约 32 克</td><td>约 33 克</td><td>约 29 克</td></tr>
        <tr class="cost"><th scope="row">售价</th><td>¥1,299</td><td>¥1,599</td><td>¥1,999</td></tr>
      </tbody>
    </table>
    <p class="specs-note">续航为典型使用场景下的数据。表体重量不含表带。eSIM 功能需要运营商支持，可能产生套餐费用。</p>
  </div>
</section>

<section class="section light colors" id="colors">
  <div class="container">
    <div class="head">
      <p class="kicker">配色</p>
      <h2>四种颜色，都耐看。</h2>
      <p>每种配色附带一条同色氟橡胶表带。表带是 22 毫米通用快拆接口。</p>
    </div>
    <div class="picker">
      <figure class="mini">
        <svg viewBox="0 0 300 420" role="img" aria-label="所选配色的手表示意图">
          <path class="m-strap" d="M98 140L110 30q2-18 20-18h40q18 0 20 18l12 110z"></path>
          <path class="m-strap-2" d="M98 280l12 110q2 18 20 18h40q18 0 20-18l12-110z"></path>
          <rect class="m-case" x="258" y="194" width="16" height="32" rx="7" transform="rotate(-30 150 210)"></rect>
          <rect class="m-case" x="258" y="194" width="16" height="32" rx="7" transform="rotate(30 150 210)"></rect>
          <circle class="m-case-2" cx="150" cy="210" r="118"></circle>
          <circle class="m-case" cx="150" cy="210" r="112"></circle>
          <circle cx="150" cy="210" r="104" fill="#07070a"></circle>
          <circle cx="150" cy="210" r="86" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="8"></circle>
          <circle cx="150" cy="210" r="86" fill="none" stroke="#ff6a2a" stroke-width="8" stroke-linecap="round" stroke-dasharray="380 160" transform="rotate(-90 150 210)"></circle>
          <path d="M150 210V150M150 210l40 24" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"></path>
          <circle cx="150" cy="210" r="8" fill="#ff6a2a"></circle>
          <path d="M62 184A94 94 0 0 1 198 124A150 150 0 0 0 62 184z" fill="#ffffff" opacity=".08"></path>
        </svg>
      </figure>
      <fieldset class="swatches">
        <legend>选择一种配色，左边的手表会换成这种颜色。</legend>
        <div class="swatch-list">
          <label class="swatch"><input class="s-obsidian" type="radio" name="color" value="obsidian" checked=""><i class="c-obsidian"></i><span>曜石黑<small>三个版本可选</small></span></label>
          <label class="swatch"><input class="s-pine" type="radio" name="color" value="pine"><i class="c-pine"></i><span>松针绿<small>三个版本可选</small></span></label>
          <label class="swatch"><input class="s-mist" type="radio" name="color" value="mist"><i class="c-mist"></i><span>晨雾银<small>三个版本可选</small></span></label>
          <label class="swatch"><input class="s-dusk" type="radio" name="color" value="dusk"><i class="c-dusk"></i><span>落日橙<small>仅标准版</small></span></label>
        </div>
      </fieldset>
    </div>
  </div>
</section>

<section class="section paper" id="perks">
  <div class="container">
    <div class="head">
      <p class="kicker">购买权益</p>
      <h2>现在预约，多三项权益。</h2>
      <p>2026年11月19日 24:00 前完成预约，并在开售后 7 天内下单，即可享受。</p>
    </div>
    <div class="perks">
      <article class="perk tfx-h-lift">
        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 11a9 9 0 0 1 16-3.500M23 4v4.500h-4.500M23 17a9 9 0 0 1-16 3.500M5 24v-4.500h4.500"></path></svg>
        <h3>以旧换新</h3>
        <strong>旧手表可抵 ¥300 以内</strong>
        <p>任意品牌的智能手表或手环都可以参加。抵扣金额以回收评估结果为准。</p>
      </article>
      <article class="perk tfx-h-lift">
        <svg viewBox="0 0 28 28" aria-hidden="true"><rect x="3" y="6" width="22" height="16" rx="3"></rect><path d="M3 11.500h22M7.500 17h5"></path></svg>
        <h3>分期免息</h3>
        <strong>6 期免息，每期 ¥216.50 起</strong>
        <p>以标准版 ¥1,299 计算。分期不收手续费，能否办理以支付机构的审核结果为准。</p>
      </article>
      <article class="perk tfx-h-lift">
        <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3l9 3.500v6.500c0 5.500-3.800 9.500-9 11.500-5.200-2-9-6-9-11.500V6.500z"></path><path d="M9.500 14l3.200 3.200 5.800-6.200"></path></svg>
        <h3>延长保修</h3>
        <strong>保修期从 12 个月延长到 24 个月</strong>
        <p>整机保修延长 12 个月。表带等配件与人为损坏不在保修范围内。</p>
      </article>
    </div>
  </div>
</section>

<section class="reserve" id="reserve">
  <div class="reserve-glow" aria-hidden="true"></div>
  <div class="container">
    <div>
      <p class="kicker">预约</p>
      <h2>留个手机号，开售时提醒你。</h2>
      <p class="lead"><b>2026年11月20日 10:00</b> 开售，售价 <b>¥1,299 起</b>。预约不收取费用，也可以随时取消。</p>
      <ol class="steps">
        <li><b>1</b>填写右边的表单，提交预约。</li>
        <li><b>2</b>开售前 1 小时，收到一条短信提醒。</li>
        <li><b>3</b>开售后 7 天内下单，享受三项购买权益。</li>
      </ol>
    </div>
    <form class="form" action="https://example.com/reserve" method="post">
      <div class="field">
        <label for="r-name">姓名</label>
        <input id="r-name" name="name" type="text" autocomplete="name" placeholder="请填写收货人姓名" required="">
      </div>
      <div class="field">
        <label for="r-phone">手机号</label>
        <input id="r-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="请填写 11 位手机号" required="">
      </div>
      <div class="field">
        <label for="r-edition">版本</label>
        <select id="r-edition" name="edition">
          <option value="standard">标准版 ¥1,299</option>
          <option value="esim">eSIM 版 ¥1,599</option>
          <option value="titanium">钛金属版 ¥1,999</option>
        </select>
      </div>
      <button class="btn btn-primary tfx-h-sheen" type="submit">提交预约</button>
      <p class="form-note">提交即表示你同意我们用这个手机号发送 1 条开售提醒短信。我们不会把你的信息用于其他用途。</p>
    </form>
  </div>
</section>

<section class="section light" id="faq">
  <div class="container">
    <div class="head">
      <p class="kicker">常见问题</p>
      <h2>下单之前，先看这几条。</h2>
    </div>
    <div class="faq">
      <details open="">
        <summary>云杉 Watch 3 支持哪些手机？</summary>
        <p>支持 Android 9 及以上、iOS 15 及以上的手机。首次使用时，需要在手机上安装“云杉健康”应用，并用蓝牙完成配对。</p>
      </details>
      <details>
        <summary>14 天续航是怎么测出来的？</summary>
        <p>这是典型使用场景下的实验室数据：全天佩戴，开启心率与睡眠监测，每天约 150 条消息提醒、抬腕亮屏约 200 次，每周 GPS 运动 90 分钟。开启屏幕常亮后约 7 天，开启 eSIM 后约 9 天。</p>
      </details>
      <details>
        <summary>可以戴着洗澡或游泳吗？</summary>
        <p>可以戴着在泳池和浅水区游泳。不建议戴着洗热水澡或进桑拿房，因为高温和水蒸气会让防水性能下降。</p>
      </details>
      <details>
        <summary>预约后必须购买吗？</summary>
        <p>不必。预约不收取费用，也不会自动下单。开售后 7 天内没有下单，预约会自动失效。</p>
      </details>
      <details>
        <summary>表带可以换吗？</summary>
        <p>可以。手表使用 22 毫米通用快拆接口，不需要工具就能更换表带。</p>
      </details>
    </div>
  </div>
</section>
</main>

<footer class="footer">
  <div class="container">
    <div class="brand">
      <a class="logo" href="#top">云杉</a>
      <p>把常用的功能做好。</p>
    </div>
    <nav aria-label="页脚导航">
      <a href="#specs">参数</a>
      <a href="#perks">购买权益</a>
      <a href="#reserve">预约</a>
      <a href="https://example.com/service">售后服务</a>
      <a href="https://example.com/privacy">隐私政策</a>
    </nav>
    <div class="legal">
      <p>云杉与云杉 Watch 3 是虚构的品牌和产品。本页面是模板示例，页面中的参数、价格和活动都不是真实信息。</p>
      <p>© 2026 云杉科技（示例） · 京ICP备00000000号</p>
    </div>
  </div>
</footer>


</body></html>
`;

  /* 网站：活动邀请函 */
  const INVITE = `<!DOCTYPE html>
<html lang="zh-Hans"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>诚邀莅临 | 云杉供应链 2027 新春客户答谢会</title>
<style>
  :root {
    color-scheme: light;
    --red: #a82c25;
    --red-deep: #7c1f1b;
    --ink: #1d1a17;
    --ink-2: #4a433a;
    --paper: #f5eede;
    --paper-2: #fbf7ec;
    --gold: #b8934a;
    --gold-light: #e6cf9a;
    --blue: #2f4858;
    --rule: #d8c8a2;
    --serif: "Songti SC", "Noto Serif SC", "Source Han Serif SC", STSong, SimSun, serif;
    --sans: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
    --key: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='16' viewBox='0 0 20 16'%3E%3Cpath d='M0 1h20M0 15h20M3 12V4h12v8H7V8h4' fill='none' stroke='%23b8934a' stroke-width='1.3'/%3E%3C/svg%3E");
    --wave: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='14' viewBox='0 0 40 14'%3E%3Cpath d='M0 5c7-6 13-6 20 0s13 6 20 0M0 11c7-6 13-6 20 0s13 6 20 0' fill='none' stroke='%23b8934a' stroke-width='1.2'/%3E%3C/svg%3E");
    --scale: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='24' viewBox='0 0 48 24'%3E%3Cg fill='none' stroke='%23b8934a' stroke-opacity='.22' stroke-width='1'%3E%3Cpath d='M0 24a24 24 0 0 1 48 0M8 24a16 16 0 0 1 32 0M16 24a8 8 0 0 1 16 0'/%3E%3Cpath d='M-24 12a24 24 0 0 1 48 0M-16 12a16 16 0 0 1 32 0M-8 12a8 8 0 0 1 16 0M24 12a24 24 0 0 1 48 0M32 12a16 16 0 0 1 32 0M40 12a8 8 0 0 1 16 0'/%3E%3C/g%3E%3C/svg%3E");
  }
  * { box-sizing: border-box; }
  body { margin: 0; background-color: #1b1815; background-image: var(--scale); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.8; }
  h1, h2, h3, p, ol, ul, dl, dd, figure, fieldset { margin: 0; }
  ol, ul { padding: 0; list-style: none; }
  a { color: inherit; }

  .sheet { max-width: 480px; margin: 0 auto; overflow: hidden; background: var(--paper); }

  .seal { display: inline-grid; place-items: center; border-radius: 4px; background: var(--red); color: var(--paper-2); font-family: var(--serif); font-weight: 700; line-height: 1.1; }

  .cover { position: relative; overflow: hidden; background-color: var(--red); background-image: linear-gradient(180deg, #b3312a 0%, #a82c25 55%, #8f2520 100%); color: var(--paper-2); }
  .cover .key { height: 16px; margin: 20px 28px 0; background-image: var(--key); background-repeat: repeat-x; background-position: center; opacity: .9; }
  .brand { position: relative; display: flex; justify-content: space-between; gap: 12px; padding: 14px 28px 0; font-size: 13px; letter-spacing: .28em; }
  .moon { position: absolute; left: 18px; top: 196px; width: 146px; height: 146px; border-radius: 50%; background: radial-gradient(circle at 38% 34%, #fbf1d6 0%, #efdcae 58%, #e0c588 100%); box-shadow: 0 0 0 10px rgba(230, 207, 154, .14), 0 0 0 11px rgba(230, 207, 154, .55); }
  .cloud { position: absolute; display: block; height: auto; }
  .cloud.c1 { left: -24px; top: 304px; width: 170px; }
  .cloud.c2 { right: -34px; bottom: 200px; width: 150px; opacity: .8; }
  .title-row { position: relative; display: flex; justify-content: flex-end; align-items: flex-start; gap: 18px; padding: 44px 28px 0; }
  .side { writing-mode: vertical-rl; padding: 12px 0; border-top: 1px solid var(--gold-light); border-bottom: 1px solid var(--gold-light); font-size: 14px; line-height: 1.4; letter-spacing: .42em; }
  .cover h1 { writing-mode: vertical-rl; font-family: var(--serif); font-size: clamp(52px, 14.6vw, 66px); line-height: 1.26; font-weight: 900; letter-spacing: .08em; }
  .cover h1 span { display: block; }
  .cover h1 .gold { color: var(--gold-light); }
  .cover-info { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 18px; padding: 40px 28px 0; }
  .cover-info .seal { writing-mode: vertical-rl; width: 58px; height: 58px; background: var(--paper-2); color: var(--red); font-size: 22px; letter-spacing: .06em; box-shadow: inset 0 0 0 3px var(--paper-2), inset 0 0 0 4px var(--red); }
  .cover-info .call { font-family: var(--serif); font-size: 28px; line-height: 1.3; font-weight: 700; letter-spacing: .2em; }
  .cover-info .when { margin-top: 6px; font-size: 15px; line-height: 1.7; letter-spacing: .06em; }
  .hills { position: relative; display: block; width: 100%; height: 190px; margin-top: 18px; }
  .band { height: 30px; background-color: var(--ink); background-image: var(--wave); background-repeat: repeat-x; background-position: center; }

  .section { position: relative; padding: 60px 28px; }
  .head { display: grid; justify-items: center; gap: 12px; margin-bottom: 32px; text-align: center; }
  .head .seal { width: 30px; height: 30px; font-size: 17px; }
  .head h2 { font-family: var(--serif); font-size: 30px; line-height: 1.3; font-weight: 900; letter-spacing: .24em; text-indent: .24em; }
  .head svg { display: block; width: 96px; height: auto; }

  .window { display: block; width: 132px; height: 132px; margin: 0 auto 30px; }
  .letter { display: grid; gap: 14px; font-size: 16px; line-height: 2; color: var(--ink); }
  .letter .to { font-family: var(--serif); font-size: 19px; font-weight: 700; }
  .letter .para { text-indent: 2em; }
  .letter .sign { margin-top: 14px; text-align: right; font-family: var(--serif); font-size: 17px; line-height: 1.8; font-weight: 700; }
  .letter .sign small { display: block; font-family: var(--sans); font-size: 14px; font-weight: 400; color: var(--ink-2); }

  .info-wrap { padding: 0 20px; }
  .info { padding: 18px 24px 20px; border-radius: 6px; background: var(--ink); color: var(--paper-2); }
  .info .key { height: 16px; background-image: var(--key); background-repeat: repeat-x; background-position: center; }
  .info h2 { margin: 18px 0 6px; font-family: var(--serif); font-size: 24px; line-height: 1.3; font-weight: 700; letter-spacing: .3em; color: var(--gold-light); text-align: center; }
  .info dl { margin-bottom: 18px; }
  .info .row { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 14px; padding: 16px 0; border-bottom: 1px solid rgba(230, 207, 154, .32); }
  .info .row:last-child { border-bottom: 0; }
  .info dt { align-self: start; padding: 2px 0; border: 1px solid var(--gold-light); border-radius: 3px; font-family: var(--serif); font-size: 15px; line-height: 1.5; color: var(--gold-light); text-align: center; }
  .info dd { font-size: 16px; line-height: 1.7; }
  .info dd b { display: block; font-family: var(--serif); font-size: 18px; font-weight: 700; }
  .info dd span { display: block; font-size: 14px; color: #e9e1cf; }

  .flow { display: grid; }
  .flow li { display: grid; grid-template-columns: 62px minmax(0, 1fr); }
  .flow time { padding-top: 1px; font-family: var(--serif); font-size: 19px; line-height: 1.6; font-weight: 900; color: var(--red); }
  .flow .what { position: relative; padding: 0 0 26px 24px; border-left: 1px solid var(--gold); }
  .flow li:last-child .what { padding-bottom: 0; }
  .flow .what::before { content: ""; position: absolute; left: -6px; top: 10px; width: 11px; height: 11px; border: 2px solid var(--red); border-radius: 50%; background: var(--paper); }
  .flow h3 { font-family: var(--serif); font-size: 19px; line-height: 1.6; font-weight: 700; letter-spacing: .08em; }
  .flow p { font-size: 15px; line-height: 1.7; color: var(--ink-2); }
  .flow-end { margin-top: 26px; padding-top: 16px; border-top: 1px solid var(--rule); font-size: 14px; color: var(--ink-2); text-align: center; }

  .tint { background: #efe5cf; }
  .guests { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .guest { display: grid; justify-items: center; gap: 4px; padding: 24px 12px 22px; border: 1px solid var(--rule); border-radius: 6px; background: var(--paper-2); text-align: center; }
  .guest .face { display: grid; place-items: center; width: 76px; height: 76px; margin-bottom: 10px; color: var(--paper-2); font-family: var(--serif); font-size: 34px; line-height: 1; font-weight: 900; clip-path: polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%); }
  .face.red { background: var(--red); }
  .face.ink { background: var(--ink); }
  .face.blue { background: var(--blue); }
  .face.brown { background: #7a5a24; }
  .face.round { clip-path: circle(50%); }
  .guest h3 { font-family: var(--serif); font-size: 20px; line-height: 1.4; font-weight: 700; letter-spacing: .12em; }
  .guest p { font-size: 14px; line-height: 1.6; color: var(--ink-2); }

  .ways { display: grid; gap: 22px; }
  .way { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 16px; align-items: start; }
  .way .mark { display: grid; place-items: center; width: 56px; height: 56px; border: 1px solid var(--gold); border-radius: 50%; box-shadow: inset 0 0 0 4px var(--paper), inset 0 0 0 5px var(--rule); font-family: var(--serif); font-size: 16px; line-height: 1; font-weight: 700; color: var(--red); }
  .way h3 { font-family: var(--serif); font-size: 18px; line-height: 1.5; font-weight: 700; }
  .way p { font-size: 15px; line-height: 1.8; color: var(--ink-2); }

  .rsvp { background-color: var(--red); background-image: linear-gradient(180deg, #a82c25, #96271f); }
  .rsvp .head h2 { color: var(--paper-2); }
  .rsvp .head .seal { background: var(--paper-2); color: var(--red); }
  .rsvp .lead { margin: -14px 0 26px; font-size: 15px; color: var(--paper-2); text-align: center; }
  .form { display: grid; gap: 18px; padding: 26px 22px 28px; border-radius: 6px; background: var(--paper); box-shadow: 0 0 0 1px var(--gold-light), 0 14px 30px rgba(40, 8, 6, .28); }
  .field { display: grid; gap: 6px; }
  .field label, .choice legend { font-family: var(--serif); font-size: 16px; line-height: 1.5; font-weight: 700; letter-spacing: .08em; }
  .field input, .field select { width: 100%; min-height: 50px; padding: 8px 14px; border: 1px solid #8a7850; border-radius: 4px; background: #fffdf7; color: var(--ink); font: inherit; }
  .field input:focus, .field select:focus { outline: 3px solid var(--gold); outline-offset: 2px; }
  .choice { min-width: 0; padding: 0; border: 0; }
  .choice legend { padding: 0; margin-bottom: 6px; }
  .choice .opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .choice .opts label { display: flex; align-items: center; gap: 10px; min-height: 50px; padding: 6px 14px; border: 1px solid #8a7850; border-radius: 4px; background: #fffdf7; font-size: 15px; line-height: 1.4; }
  .choice input { flex: none; width: 20px; height: 20px; margin: 0; accent-color: var(--red); }
  .submit { width: 100%; min-height: 54px; margin-top: 4px; padding: 0 20px; border: 0; border-radius: 4px; background: var(--red); color: var(--paper-2); font-family: var(--serif); font-size: 19px; font-weight: 700; letter-spacing: .4em; text-indent: .4em; cursor: pointer; }
  .form .note { font-size: 13px; line-height: 1.7; color: var(--ink-2); }

  .contact { display: grid; gap: 4px; padding: 44px 28px 48px; text-align: center; }
  .contact h2 { margin-bottom: 8px; font-family: var(--serif); font-size: 20px; line-height: 1.4; font-weight: 700; letter-spacing: .3em; text-indent: .3em; }
  .contact .who { font-family: var(--serif); font-size: 18px; font-weight: 700; }
  .contact p { font-size: 15px; color: var(--ink-2); }
  .contact .tel { font-family: var(--serif); font-size: 26px; line-height: 1.5; font-weight: 900; letter-spacing: .06em; color: var(--red); text-decoration: none; }

  .foot { padding: 0 28px 34px; background: var(--ink); color: #e9e1cf; text-align: center; }
  .foot .band { margin: 0 -28px 26px; }
  .foot .name { font-family: var(--serif); font-size: 18px; letter-spacing: .3em; text-indent: .3em; color: var(--gold-light); }
  .foot p { font-size: 13px; line-height: 1.8; }
  .foot .legal { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(230, 207, 154, .3); }

  @media (min-width: 560px) {
    body { padding: 40px 0; }
    .sheet { border-radius: 10px; box-shadow: 0 0 0 1px rgba(230, 207, 154, .35), 0 30px 80px rgba(0, 0, 0, .5); }
    .cover h1 { font-size: 66px; }
    .moon { left: 34px; top: 190px; width: 196px; height: 196px; }
    .cloud.c1 { top: 340px; width: 200px; }
  }
  @media (max-width: 359px) {
    .section { padding: 52px 20px; }
    .info-wrap { padding: 0 12px; }
    .guests { grid-template-columns: minmax(0, 1fr); }
    .choice .opts { grid-template-columns: minmax(0, 1fr); }
    .moon { width: 140px; height: 140px; }
  }
</style>
<style data-he-style="fx">/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }
:where(.tfx-h-sheen) { position: relative; }
.tfx-e-deal > * { --tfx-k: inherit; --tfx-t: inherit; }</style><style data-he-style="fx-motion">/* Tactile 动效：根据页面中的 tfx-* 类自动生成，请在编辑器的“动效”中修改。 */
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
      @keyframes tfx-blur-rise { from { opacity: 0; transform: translateY(calc(1.25rem * var(--tfx-k, 1))); filter: blur(calc(6px * var(--tfx-k, 1))); } }
      .tfx-e-blur-rise { animation: tfx-blur-rise linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15%, 3rem + var(--tfx-t, 0) * 3rem) entry min(75% + var(--tfx-t, 0) * 25%, 16rem + var(--tfx-t, 0) * 4rem); }
      @keyframes tfx-deal { from { opacity: 0; transform: translateY(calc(1.5rem * var(--tfx-k, 1))) scale(calc(1 - .05 * var(--tfx-k, 1))); } }
      .tfx-e-deal > * { animation: tfx-deal linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15% + min(var(--tfx-i, 0), 7) * 6%, 3rem + var(--tfx-t, 0) * 3rem + min(var(--tfx-i, 0), 7) * 1rem) entry min(100%, 75% + var(--tfx-t, 0) * 25% + min(var(--tfx-i, 0), 7) * 6%, 16rem + var(--tfx-t, 0) * 4rem + min(var(--tfx-i, 0), 7) * 1rem); }
      @keyframes tfx-parallax { from { transform: translateY(calc(12% * var(--tfx-k, 1))); } to { transform: translateY(calc(-12% * var(--tfx-k, 1))); } }
      .tfx-s-parallax { animation: tfx-parallax linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover 0% cover 100%; }
    }
  }
}</style></head>
<body>
<main class="sheet">

<header class="cover">
  <div class="moon tfx-s-parallax" aria-hidden="true"></div>
  <svg class="cloud c1" viewBox="0 0 190 70" aria-hidden="true"><g fill="none" stroke="#e6cf9a" stroke-width="1.6" stroke-linecap="round"><path d="M2 58h112c16 0 26-10 26-21 0-10-8-18-18-18-9 0-16 6-16 14 0 6 5 11 11 11 5 0 8-4 8-8"></path><path d="M40 58c-3-15 8-29 24-29 11 0 19 7 19 16 0 7-5 12-12 12-5 0-9-3-9-8"></path><path d="M96 66h90M20 66h52"></path><path d="M126 58c12 0 22-3 30-10"></path></g></svg>
  <svg class="cloud c2" viewBox="0 0 190 70" aria-hidden="true"><g fill="none" stroke="#e6cf9a" stroke-width="1.6" stroke-linecap="round"><path d="M188 58H76c-16 0-26-10-26-21 0-10 8-18 18-18 9 0 16 6 16 14 0 6-5 11-11 11-5 0-8-4-8-8"></path><path d="M150 58c3-15-8-29-24-29-11 0-19 7-19 16 0 7 5 12 12 12 5 0 9-3 9-8"></path><path d="M94 66H4M170 66h-52"></path></g></svg>
  <div class="key" aria-hidden="true"></div>
  <p class="brand"><span>云杉供应链</span><span>二〇二七</span></p>
  <div class="title-row">
    <p class="side">岁末迎新 · 感恩同行</p>
    <h1><span>新春客户</span><span class="gold">答谢会</span></h1>
  </div>
  <div class="cover-info">
    <p class="seal" aria-hidden="true">诚邀</p>
    <div>
      <p class="call">诚邀您莅临</p>
      <p class="when">2027年1月16日 · 周六<br>澄州 · 松涧山房</p>
    </div>
  </div>
  <svg class="hills" viewBox="0 0 480 190" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 96l44-30 30 16 52-50 40 34 34-20 50 40 46-44 44 36 52-48 44 40 44-22v142H0z" fill="#8a231f"></path>
    <path d="M0 132l56-40 42 26 60-54 50 44 40-18 62 46 54-38 52 30 64-44v106H0z" fill="#5f1917"></path>
    <path d="M0 162l70-36 48 22 66-42 58 36 52-20 70 34 60-30 56 22v42H0z" fill="#1d1a17"></path>
    <path d="M0 150c40-10 70 6 110 0s70-12 120-4 80 10 130 2 80-6 120 2" fill="none" stroke="#e6cf9a" stroke-width="1" stroke-opacity=".5"></path>
  </svg>
</header>
<div class="band" aria-hidden="true"></div>

<section class="section" id="letter">
  <svg class="window" viewBox="0 0 132 132" aria-hidden="true">
    <defs><clipPath id="win"><path d="M40 8h52l32 32v52l-32 32H40L8 92V40z"></path></clipPath></defs>
    <path d="M38 2h56l36 36v56l-36 36H38L2 94V38z" fill="none" stroke="#1d1a17" stroke-width="2.5"></path>
    <g clip-path="url(#win)">
      <rect width="132" height="132" fill="#fbf7ec"></rect>
      <circle cx="84" cy="46" r="19" fill="#e0c588" stroke="#b8934a" stroke-width="1"></circle>
      <path d="M0 96l26-26 18 14 24-30 26 30 16-10 22 20v40H0z" fill="#a82c25"></path>
      <path d="M0 110l30-18 22 12 28-20 24 18 28-10v40H0z" fill="#1d1a17"></path>
      <path d="M10 36h30c5 0 8-3 8-7s-3-6-6-6-5 2-5 5" fill="none" stroke="#b8934a" stroke-width="1.4" stroke-linecap="round"></path>
    </g>
    <path d="M40 8h52l32 32v52l-32 32H40L8 92V40z" fill="none" stroke="#b8934a" stroke-width="1.5"></path>
  </svg>
  <div class="head">
    <span class="seal" aria-hidden="true">壹</span>
    <h2>邀请函</h2>
  </div>
  <div class="letter tfx-e-blur-rise">
    <p class="to">尊敬的客户伙伴：</p>
    <p class="para">过去一年，承蒙您的信任与支持，云杉供应链的每一条线路、每一座仓库才得以平稳运转。一路同行，我们心怀感激。</p>
    <p class="para">新春将至，我们谨定于 2027 年 1 月 16 日在澄州举办新春客户答谢会，与您一同回顾这一年的合作，也想当面听听您对来年的期待。</p>
    <p class="para">现已备好清茶与晚宴，诚邀您拨冗莅临。</p>
    <p class="sign">云杉供应链有限公司<small>2026 年 12 月 18 日</small></p>
  </div>
</section>

<section class="info-wrap" id="info" aria-labelledby="info-title">
  <div class="info tfx-h-sheen">
    <div class="key" aria-hidden="true"></div>
    <h2 id="info-title">活动信息</h2>
    <dl>
      <div class="row">
        <dt>时间</dt>
        <dd><b>2027年1月16日（周六）</b>14:00–20:30，14:00 起签到入场</dd>
      </div>
      <div class="row">
        <dt>地点</dt>
        <dd><b>松涧山房 · 听雪厅</b>澄州市澄湖区松涧路 18 号<span>场馆与地址为虚构示例</span></dd>
      </div>
      <div class="row">
        <dt>着装</dt>
        <dd><b>商务休闲</b>晚宴无须更换正装，冬季场馆内有暖气。</dd>
      </div>
    </dl>
    <div class="key" aria-hidden="true"></div>
  </div>
</section>

<section class="section" id="flow">
  <div class="head">
    <span class="seal" aria-hidden="true">贰</span>
    <h2>流程安排</h2>
    <svg viewBox="0 0 96 14" aria-hidden="true"><path d="M0 7h30M66 7h30M38 7c0-4 3-6 6-6s5 2 5 4-2 3-3 3M58 7c0 4-3 6-6 6s-5-2-5-4 2-3 3-3" fill="none" stroke="#b8934a" stroke-width="1.4" stroke-linecap="round"></path></svg>
  </div>
  <ol class="flow tfx-e-deal">
    <li style="--tfx-i: 0"><time datetime="14:00">14:00</time><div class="what"><h3>签到入场</h3><p>凭邀请函在一层序厅签到，领取席位卡。</p></div></li>
    <li style="--tfx-i: 1"><time datetime="14:30">14:30</time><div class="what"><h3>开场致辞</h3><p>总经理沈知远致欢迎辞。</p></div></li>
    <li style="--tfx-i: 2"><time datetime="14:50">14:50</time><div class="what"><h3>年度回顾</h3><p>2026 年的服务数据、网络布局与来年计划。</p></div></li>
    <li style="--tfx-i: 3"><time datetime="15:40">15:40</time><div class="what"><h3>客户分享</h3><p>两位客户代表讲述协同备货与旺季保供的经验。</p></div></li>
    <li style="--tfx-i: 4"><time datetime="16:40">16:40</time><div class="what"><h3>茶歇交流</h3><p>茶点设在临水回廊，各业务负责人在场答疑。</p></div></li>
    <li style="--tfx-i: 5"><time datetime="18:00">18:00</time><div class="what"><h3>答谢晚宴</h3><p>入席听雪厅，席间有民乐演出。</p></div></li>
    <li style="--tfx-i: 6"><time datetime="19:30">19:30</time><div class="what"><h3>抽奖环节</h3><p>现场设有抽奖环节，凭席位卡参与。</p></div></li>
  </ol>
  <p class="flow-end">活动于 20:30 结束，流程以现场安排为准。</p>
</section>

<section class="section tint" id="guests">
  <div class="head">
    <span class="seal" aria-hidden="true">叁</span>
    <h2>分享嘉宾</h2>
    <svg viewBox="0 0 96 14" aria-hidden="true"><path d="M0 7h30M66 7h30M38 7c0-4 3-6 6-6s5 2 5 4-2 3-3 3M58 7c0 4-3 6-6 6s-5-2-5-4 2-3 3-3" fill="none" stroke="#b8934a" stroke-width="1.4" stroke-linecap="round"></path></svg>
  </div>
  <div class="guests">
    <article class="guest">
      <p class="face red" aria-hidden="true">沈</p>
      <h3>沈知远</h3>
      <p>云杉供应链<br>总经理</p>
    </article>
    <article class="guest">
      <p class="face ink round" aria-hidden="true">顾</p>
      <h3>顾明澜</h3>
      <p>云杉供应链<br>运营总监</p>
    </article>
    <article class="guest">
      <p class="face blue round" aria-hidden="true">贺</p>
      <h3>贺书宁</h3>
      <p>禾屿食品<br>采购负责人</p>
    </article>
    <article class="guest">
      <p class="face brown" aria-hidden="true">陆</p>
      <h3>陆一帆</h3>
      <p>澄川家居<br>物流经理</p>
    </article>
  </div>
</section>

<section class="section" id="route">
  <div class="head">
    <span class="seal" aria-hidden="true">肆</span>
    <h2>交通指引</h2>
    <svg viewBox="0 0 96 14" aria-hidden="true"><path d="M0 7h30M66 7h30M38 7c0-4 3-6 6-6s5 2 5 4-2 3-3 3M58 7c0 4-3 6-6 6s-5-2-5-4 2-3 3-3" fill="none" stroke="#b8934a" stroke-width="1.4" stroke-linecap="round"></path></svg>
  </div>
  <div class="ways">
    <div class="way">
      <p class="mark" aria-hidden="true">地铁</p>
      <div>
        <h3>乘地铁</h3>
        <p>乘地铁至“松涧路站”，从 C 口出站，沿松涧路向东步行约 8 分钟。</p>
      </div>
    </div>
    <div class="way">
      <p class="mark" aria-hidden="true">自驾</p>
      <div>
        <h3>自驾前往</h3>
        <p>导航至“松涧山房”，从松涧路南门进入，入口处有工作人员引导。</p>
      </div>
    </div>
    <div class="way">
      <p class="mark" aria-hidden="true">停车</p>
      <div>
        <h3>停车</h3>
        <p>车辆停放在场馆地下停车场 B2 层，活动当日凭邀请函免费停放。</p>
      </div>
    </div>
  </div>
</section>

<section class="section rsvp" id="rsvp">
  <div class="head">
    <span class="seal" aria-hidden="true">伍</span>
    <h2>参会回执</h2>
  </div>
  <p class="lead">请于 2027 年 1 月 8 日前提交回执，便于我们为您安排席位。</p>
  <form class="form" action="https://example.com/rsvp" method="post">
    <p class="field">
      <label for="rsvp-name">姓名</label>
      <input id="rsvp-name" name="name" type="text" autocomplete="name" required="">
    </p>
    <p class="field">
      <label for="rsvp-org">单位</label>
      <input id="rsvp-org" name="org" type="text" autocomplete="organization" required="">
    </p>
    <p class="field">
      <label for="rsvp-tel">手机号</label>
      <input id="rsvp-tel" name="tel" type="tel" autocomplete="tel" inputmode="numeric" required="">
    </p>
    <p class="field">
      <label for="rsvp-count">参加人数</label>
      <select id="rsvp-count" name="count" required="">
        <option value="1" selected="">1 人</option>
        <option value="2">2 人</option>
        <option value="3">3 人</option>
        <option value="4">4 人</option>
      </select>
    </p>
    <fieldset class="choice">
      <legend>是否用餐</legend>
      <div class="opts">
        <label for="rsvp-dinner-yes"><input id="rsvp-dinner-yes" name="dinner" type="radio" value="yes" checked="">参加晚宴</label>
        <label for="rsvp-dinner-no"><input id="rsvp-dinner-no" name="dinner" type="radio" value="no">不参加晚宴</label>
      </div>
    </fieldset>
    <button class="submit tfx-h-lift" type="submit">提交回执</button>
    <p class="note">您填写的信息仅用于本次活动的席位与用餐安排。</p>
  </form>
</section>

<section class="contact" id="contact">
  <h2>联系人</h2>
  <p class="who">周晓岚 · 客户关系部</p>
  <a class="tel" href="tel:01000000000">010-0000 0000</a>
  <p>工作日 9:00–18:00 · rsvp@example.com</p>
</section>

<footer class="foot">
  <div class="band" aria-hidden="true"></div>
  <p class="name">云杉供应链</p>
  <p>2027 新春客户答谢会 · 恭候光临</p>
  <p class="legal">本页面是示例模板。云杉供应链、答谢会以及文中的人物、单位、场馆和联系方式均为虚构。</p>
</footer>

</main>


</body></html>
`;

  /* 文档：图文长文 */
  const ARTICLE = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>周末两小时，给一周的饭菜开个好头 | 云杉生活</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1f2a26;
    --ink-2: #46524d;
    --ink-3: #5c6863;
    --line: #dfe6e1;
    --bg: #edf1ec;
    --paper: #ffffff;
    --green: #1f5c4a;
    --green-deep: #174536;
    --green-soft: #eaf3ee;
    --warm: #b4591a;
    --warm-soft: #fdf1e2;
    --warm-mark: #ffdfae;
    --font: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
    --serif: "Songti SC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 16.5px; line-height: 1.9; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, p, ul, ol, figure, blockquote { margin: 0; }
  ul, ol { padding: 0; list-style: none; }
  svg { display: block; }
  .article { max-width: 680px; margin: 32px auto; background: var(--paper); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(31, 42, 38, .06); }

  .cover { position: relative; padding: 168px 36px 36px; background-color: var(--green); background-image: linear-gradient(155deg, #2a7460 0%, #1f5c4a 46%, #153f32 100%); color: #ffffff; overflow: hidden; }
  .cover-art { position: absolute; top: 0; right: 0; width: 340px; max-width: 88%; height: auto; }
  .cover-tag { position: relative; display: inline-block; padding: 2px 12px; border: 1px solid rgba(255, 255, 255, .55); border-radius: 999px; font-size: 13px; line-height: 1.7; letter-spacing: .08em; color: #ffffff; }
  .cover h1 { position: relative; margin-top: 16px; font-family: var(--serif); font-size: clamp(28px, 6.4vw, 38px); font-weight: 700; line-height: 1.4; letter-spacing: .02em; color: #ffffff; text-wrap: balance; }
  .cover-sub { position: relative; margin-top: 12px; font-size: 15px; line-height: 1.8; color: #e3efe9; }

  .content { padding: 28px 36px 44px; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding-bottom: 20px; border-bottom: 1px solid var(--line); font-size: 14px; line-height: 1.6; color: var(--ink-3); }
  .meta-author { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; color: var(--ink); }
  .avatar { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--green); color: #ffffff; font-family: var(--serif); font-size: 15px; font-weight: 700; line-height: 1; }
  .meta-pair { display: inline-flex; align-items: center; gap: 10px; }
  .meta-dot { flex: none; width: 3px; height: 3px; border-radius: 50%; background: #9aa7a1; }

  .lead { position: relative; margin-top: 26px; padding: 20px 22px 20px 24px; border-radius: 12px; background: var(--green-soft); color: var(--ink-2); font-size: 15.5px; line-height: 1.9; }
  .lead::before { content: ""; position: absolute; left: 0; top: 18px; bottom: 18px; width: 4px; border-radius: 0 4px 4px 0; background: var(--green); }
  .lead-label { display: block; margin-bottom: 4px; font-size: 13px; font-weight: 700; letter-spacing: .2em; color: var(--green); }

  .sec-head { display: flex; align-items: center; gap: 14px; margin: 48px 0 18px; }
  .sec-no { flex: none; font-family: var(--serif); font-size: 40px; font-weight: 700; line-height: 1; color: var(--green); }
  .sec-head h2 { flex: 1; min-width: 0; padding-bottom: 8px; border-bottom: 1px solid var(--line); font-size: 20px; font-weight: 700; line-height: 1.5; background-image: linear-gradient(var(--warm), var(--warm)); background-repeat: no-repeat; background-position: left bottom; background-size: 44px 3px; }

  .content p { margin-top: 16px; text-align: justify; }
  .content p:first-child { margin-top: 0; }
  strong { font-weight: 700; color: var(--green-deep); }
  mark { padding: 0 2px; color: inherit; background-color: transparent; background-image: linear-gradient(transparent 58%, var(--warm-mark) 58%); }

  .quote { margin: 30px 0 6px; padding: 14px 26px 30px; border-radius: 14px; border: 1px solid #f3dcbd; background: var(--warm-soft); text-align: center; }
  .quote-mark { display: block; height: 44px; font-family: var(--serif); font-size: 64px; font-weight: 700; line-height: 1.1; color: var(--warm); }
  .quote p { margin-top: 6px; font-family: var(--serif); font-size: 19px; font-weight: 700; line-height: 1.8; text-align: center; color: #43301c; }
  .quote-by { display: block; margin-top: 12px; font-size: 13px; letter-spacing: .1em; color: #7a5326; }

  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 22px; }
  .stat { padding: 16px 8px 14px; border-radius: 12px; background: var(--green-soft); text-align: center; }
  .stat-num { display: block; font-family: var(--serif); font-size: 34px; font-weight: 700; line-height: 1.2; color: var(--green); }
  .stat-num small { margin-left: 3px; font-family: var(--font); font-size: 14px; font-weight: 600; }
  .stat-label { display: block; margin-top: 4px; font-size: 13px; line-height: 1.5; color: var(--ink-2); }
  .content p.note { margin-top: 10px; font-size: 13px; line-height: 1.7; text-align: center; color: var(--ink-3); }

  .points { margin-top: 16px; display: grid; gap: 10px; }
  .points li { position: relative; padding-left: 26px; }
  .points li::before { content: ""; position: absolute; left: 4px; top: 11px; width: 10px; height: 10px; border-radius: 50% 0 50% 50%; background: var(--green); transform: rotate(45deg); }

  .steps { margin-top: 18px; counter-reset: step; }
  .steps li { position: relative; padding: 0 0 20px 44px; counter-increment: step; }
  .steps li::before { content: counter(step); position: absolute; left: 0; top: 2px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--green); color: #ffffff; font-size: 14px; font-weight: 700; line-height: 1; }
  .steps li::after { content: ""; position: absolute; left: 13px; top: 36px; bottom: 4px; width: 2px; border-radius: 1px; background: #cfe0d7; }
  .steps li:last-child { padding-bottom: 0; }
  .steps li:last-child::after { display: none; }
  .step-time { display: inline-block; margin-right: 8px; padding: 0 9px; border-radius: 6px; background: var(--warm-soft); color: #8a4310; font-size: 13px; font-weight: 700; line-height: 1.8; font-variant-numeric: tabular-nums; }
  .step-title { font-weight: 700; }
  .step-text { display: block; margin-top: 2px; color: var(--ink-2); font-size: 15.5px; line-height: 1.8; }

  .tip { display: flex; gap: 14px; margin-top: 22px; padding: 16px 18px; border: 1px dashed #e3b98a; border-radius: 12px; background: #fffaf3; }
  .tip svg { flex: none; width: 28px; height: 28px; margin-top: 3px; }
  .tip-title { display: block; font-size: 14px; font-weight: 700; letter-spacing: .1em; color: var(--warm); }
  .tip-text { display: block; font-size: 15px; line-height: 1.8; color: #4a3a28; }

  .figure { margin-top: 24px; }
  .figure svg { width: 100%; height: auto; border-radius: 12px; }
  .figure figcaption { margin-top: 8px; font-size: 13px; line-height: 1.7; text-align: center; color: var(--ink-3); }

  .menu { margin-top: 18px; border: 1px solid var(--line); border-radius: 12px; }
  .menu li { display: flex; align-items: baseline; gap: 14px; padding: 11px 16px; }
  .menu li + li { border-top: 1px dashed var(--line); }
  .menu-day { flex: none; font-family: var(--serif); font-weight: 700; color: var(--green); }
  .menu-dish { flex: 1; min-width: 0; font-size: 15.5px; line-height: 1.7; }
  .menu-dish span { display: block; font-size: 13.5px; color: var(--ink-3); }

  .divider { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 44px 0 30px; }
  .divider::before, .divider::after { content: ""; width: 64px; height: 1px; background: #c9d5ce; }
  .divider svg { width: 22px; height: 22px; }

  .author { display: flex; gap: 16px; padding: 20px; border-radius: 14px; background: #f6f8f6; }
  .author-face { flex: none; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background-color: var(--green); background-image: linear-gradient(140deg, #2f7a65, #174536); color: #ffffff; font-family: var(--serif); font-size: 24px; font-weight: 700; line-height: 1; }
  .author-name { display: block; font-size: 16px; font-weight: 700; line-height: 1.6; }
  .author-role { display: block; font-size: 13px; line-height: 1.6; color: var(--green); }
  .author-bio { display: block; margin-top: 6px; font-size: 14px; line-height: 1.8; color: var(--ink-2); }

  .follow { display: flex; align-items: center; gap: 20px; margin-top: 16px; padding: 22px 24px; border-radius: 14px; background-color: var(--green); background-image: linear-gradient(150deg, #256a56, #174536); color: #ffffff; }
  .follow-text { flex: 1; min-width: 0; }
  .follow-title { display: block; font-family: var(--serif); font-size: 21px; font-weight: 700; line-height: 1.5; color: #ffffff; }
  .follow-desc { display: block; margin-top: 4px; font-size: 14px; line-height: 1.8; color: #e3efe9; }
  .qr { flex: none; width: 108px; text-align: center; }
  .qr svg { width: 108px; height: 108px; border-radius: 10px; }
  .qr-note { display: block; margin-top: 6px; font-size: 12px; line-height: 1.5; color: #e3efe9; }

  .content p.rights { margin-top: 24px; font-size: 12px; line-height: 1.8; text-align: center; color: var(--ink-3); }

  @media (max-width: 720px) {
    .article { margin: 0; border-radius: 0; box-shadow: none; }
    .cover { padding: 150px 20px 28px; }
    .content { padding: 22px 20px 36px; }
  }
  @media (max-width: 440px) {
    .stats { gap: 8px; }
    .stat-num { font-size: 28px; }
    .sec-no { font-size: 34px; }
    .sec-head h2 { font-size: 18.5px; }
    .follow { gap: 14px; padding: 20px 18px; }
    .qr, .qr svg { width: 92px; }
    .qr svg { height: 92px; }
  }
</style>
</head>
<body>
<article class="article">
  <header class="cover">
    <svg class="cover-art" viewBox="0 0 340 200" aria-hidden="true">
      <circle cx="262" cy="52" r="120" fill="#ffffff" opacity=".06"/>
      <circle cx="262" cy="52" r="78" fill="#ffffff" opacity=".06"/>
      <path d="M184 98h132a66 62 0 0 1-132 0z" fill="#f4b266"/>
      <path d="M184 98h132a66 62 0 0 1-8 30H192a66 62 0 0 1-8-30z" fill="#f8c98e"/>
      <rect x="226" y="158" width="48" height="8" rx="4" fill="#e39a48"/>
      <ellipse cx="250" cy="98" rx="66" ry="9" fill="#fff6e8"/>
      <circle cx="228" cy="96" r="7" fill="#7fbf9c"/>
      <circle cx="246" cy="94" r="8" fill="#e8743b"/>
      <circle cx="266" cy="96" r="7" fill="#a6d6b8"/>
      <circle cx="282" cy="95" r="5" fill="#f4b266"/>
      <path d="M222 74c-8-10 8-16 0-28M250 70c-8-10 8-16 0-28M278 74c-8-10 8-16 0-28" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <path d="M130 150c4-30 22-48 46-52-2 28-18 46-46 52z" fill="#7fbf9c" opacity=".7"/>
      <path d="M130 150c-10-22-6-42 8-58 10 20 8 40-8 58z" fill="#a6d6b8" opacity=".6"/>
      <circle cx="150" cy="40" r="4" fill="#f4b266"/>
      <circle cx="318" cy="182" r="5" fill="#f4b266" opacity=".8"/>
      <circle cx="196" cy="24" r="3" fill="#ffffff" opacity=".5"/>
    </svg>
    <span class="cover-tag">厨房与餐桌</span>
    <h1>周末两小时，给一周的饭菜开个好头</h1>
    <p class="cover-sub">一份照着就能做的备餐计划：买什么、先做什么、怎么放、怎么吃</p>
  </header>

  <div class="content">
    <div class="meta">
      <span class="meta-author"><span class="avatar">云</span>云杉生活</span>
      <span>文 / 林知夏</span>
      <span class="meta-pair"><span>2026年11月13日</span><span class="meta-dot"></span><span>阅读约 5 分钟</span></span>
    </div>

    <div class="lead">
      <span class="lead-label">导读</span>
      工作日的晚上，时间和力气都不多。与其每天从洗菜开始，不如在周末拿出两小时，把一周的饭菜提前备成“半成品”。这篇文章把采购、时间安排、存放和工作日的搭配方法一次讲清楚，照着做一遍，你就能找到适合自己家的节奏。
    </div>

    <div class="sec-head"><span class="sec-no">01</span><h2>备的是“半成品”，不是“成品”</h2></div>
    <p>很多人试过在周末一口气做好五天的菜，结果到了周三，饭盒里的菜已经没了口感，人也吃腻了。问题不在备餐，而在备得太“满”。</p>
    <p>更省心的做法是只做到七八成：<mark>主食煮好、肉蛋做熟、蔬菜洗净切好、酱汁调好</mark>，各自分开存放。工作日回到家，只需要加热、快炒、拌一拌。这样既省了时间，又保留了现做的口感，每天还能换着花样搭配。</p>
    <blockquote class="quote">
      <span class="quote-mark" aria-hidden="true">“</span>
      <p>备餐不是把周末搭进厨房，<br>而是让工作日的晚上多一点从容。</p>
      <span class="quote-by">云杉生活 · 厨房笔记</span>
    </blockquote>

    <div class="sec-head"><span class="sec-no">02</span><h2>采购：一张清单，三类食材</h2></div>
    <p>出门前先打开冰箱看一眼，再写清单。清单按三类来写，不容易漏，也不容易买多。</p>
    <ul class="points">
      <li><strong>主食两种：</strong>例如糙米和杂粮面，交替着吃不单调。</li>
      <li><strong>肉蛋豆三种：</strong>例如鸡腿肉、鸡蛋、北豆腐，分别适合烤、煮、煎。</li>
      <li><strong>蔬菜五种：</strong>两种耐放的（胡萝卜、西兰花），两种叶菜（上海青、生菜），一种提味的（番茄或菌菇）。</li>
    </ul>
    <p>叶菜不耐放，买够前三天的量就好，后两天吃耐放的根茎类。两口之家照这张清单采购，一周晚饭的食材基本就齐了。</p>
    <div class="tip">
      <svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="#fbe3c4"/><path d="M14 6.5a5.6 5.6 0 0 0-3.2 10.2v1.8h6.4v-1.8A5.6 5.6 0 0 0 14 6.5z" fill="#b4591a"/><rect x="11.2" y="19.8" width="5.6" height="2" rx="1" fill="#b4591a"/></svg>
      <div>
        <span class="tip-title">小贴士</span>
        <span class="tip-text">清单按超市里的行走路线来排：先蔬果，再干货，冷藏的肉和豆制品放到后面买，带回家时状态更好。</span>
      </div>
    </div>

    <div class="sec-head"><span class="sec-no">03</span><h2>两小时怎么排：跟着“火”走</h2></div>
    <p>两小时够不够用，关键看顺序。<strong>耗时长、不用人盯着的事先开始</strong>，等待的空当再去做需要动手的事。下面是我们编辑部反复试过的一份安排。</p>
    <div class="stats">
      <div class="stat"><span class="stat-num">2<small>小时</small></span><span class="stat-label">周末集中备餐</span></div>
      <div class="stat"><span class="stat-num">15<small>分钟</small></span><span class="stat-label">工作日晚饭上桌</span></div>
      <div class="stat"><span class="stat-num">5<small>顿</small></span><span class="stat-label">周一到周五晚饭</span></div>
    </div>
    <p class="note">按两口之家估算，实际用时因厨房和熟练程度而不同</p>
    <ol class="steps">
      <li><span class="step-time">0:00–0:15</span><span class="step-title">让锅先工作</span><span class="step-text">淘米煮饭，同时烧上一锅水。电饭煲和汤锅不用人看着。</span></li>
      <li><span class="step-time">0:15–0:45</span><span class="step-title">做熟肉和蛋</span><span class="step-text">鸡腿肉用盐、黑胡椒和少许油腌一下，送进烤箱；用烧开的水煮鸡蛋、焯西兰花。</span></li>
      <li><span class="step-time">0:45–1:15</span><span class="step-title">洗切蔬菜</span><span class="step-text">叶菜洗净后沥干水分，根茎类切成块或丝，分别装盒。</span></li>
      <li><span class="step-time">1:15–1:40</span><span class="step-title">调酱汁、煎豆腐</span><span class="step-text">调一份芝麻酱汁、一份油醋汁。豆腐切块，煎到两面金黄。</span></li>
      <li><span class="step-time">1:40–2:00</span><span class="step-title">放凉、分装、收台面</span><span class="step-text">全部放凉后分装，贴好标签，顺手把灶台和水槽收拾干净。</span></li>
    </ol>

    <div class="sec-head"><span class="sec-no">04</span><h2>存放：分装、贴标签、排顺序</h2></div>
    <p>食材放凉后再盖上盖子进冰箱，热气闷在盒子里容易出水。分装时记住三件事。</p>
    <ul class="points">
      <li><strong>一餐一盒：</strong>主食和肉按一顿的量分开装，吃多少拿多少，不反复加热。</li>
      <li><strong>写上日期：</strong>贴一张标签，写明内容和制作日期，一眼就知道先吃哪盒。</li>
      <li><strong>叶菜垫纸：</strong>盒底铺一张厨房纸吸走水分，叶菜能多脆两三天。</li>
    </ul>
    <figure class="figure">
      <svg viewBox="0 0 640 300" role="img" aria-label="冰箱隔板上摆着三排分装好的保鲜盒">
        <rect width="640" height="300" fill="#eaf3ee"/>
        <circle cx="560" cy="60" r="90" fill="#dcebe2"/>
        <rect x="40" y="150" width="560" height="10" rx="5" fill="#b9d1c4"/>
        <rect x="40" y="262" width="560" height="10" rx="5" fill="#b9d1c4"/>
        <g>
          <rect x="70" y="76" width="130" height="74" rx="10" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="62" y="64" width="146" height="16" rx="8" fill="#1f5c4a"/>
          <rect x="82" y="104" width="106" height="36" rx="6" fill="#f4e6c8"/>
          <rect x="112" y="88" width="46" height="12" rx="3" fill="#f4b266"/>
        </g>
        <g>
          <rect x="255" y="76" width="130" height="74" rx="10" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="247" y="64" width="146" height="16" rx="8" fill="#1f5c4a"/>
          <rect x="267" y="104" width="106" height="36" rx="6" fill="#e9a36b"/>
          <rect x="297" y="88" width="46" height="12" rx="3" fill="#f4b266"/>
        </g>
        <g>
          <rect x="440" y="76" width="130" height="74" rx="10" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="432" y="64" width="146" height="16" rx="8" fill="#1f5c4a"/>
          <circle cx="470" cy="122" r="14" fill="#7fbf9c"/>
          <circle cx="498" cy="126" r="12" fill="#5fa884"/>
          <circle cx="524" cy="122" r="14" fill="#7fbf9c"/>
          <circle cx="548" cy="128" r="9" fill="#5fa884"/>
          <rect x="482" y="88" width="46" height="12" rx="3" fill="#f4b266"/>
        </g>
        <g>
          <rect x="70" y="196" width="100" height="66" rx="10" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="63" y="186" width="114" height="14" rx="7" fill="#1f5c4a"/>
          <rect x="82" y="222" width="76" height="30" rx="6" fill="#f08a4b"/>
          <rect x="210" y="196" width="100" height="66" rx="10" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="203" y="186" width="114" height="14" rx="7" fill="#1f5c4a"/>
          <rect x="222" y="222" width="76" height="30" rx="6" fill="#fbf3df"/>
          <path d="M368 262v-58a10 10 0 0 1 10-10h4v-12h20v12h4a10 10 0 0 1 10 10v58z" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="370" y="222" width="44" height="38" fill="#d9a15a"/>
          <rect x="378" y="174" width="28" height="10" rx="3" fill="#1f5c4a"/>
          <path d="M448 262v-58a10 10 0 0 1 10-10h4v-12h20v12h4a10 10 0 0 1 10 10v58z" fill="#ffffff" stroke="#1f5c4a" stroke-width="3"/>
          <rect x="450" y="230" width="44" height="30" fill="#e7d27a"/>
          <rect x="458" y="174" width="28" height="10" rx="3" fill="#1f5c4a"/>
          <ellipse cx="552" cy="246" rx="26" ry="16" fill="#e8743b"/>
          <path d="M552 230c-2-8 4-12 10-12" fill="none" stroke="#1f5c4a" stroke-width="3" stroke-linecap="round"/>
        </g>
      </svg>
      <figcaption>分装好的一周食材：上层放先吃的，下层放后吃的和酱汁</figcaption>
    </figure>
    <p>冷藏的熟食建议在三到四天内吃完。周四、周五要吃的那部分肉，分装后直接冷冻，前一晚移到冷藏室解冻即可。</p>

    <div class="sec-head"><span class="sec-no">05</span><h2>工作日晚上：十五分钟上桌</h2></div>
    <p>到了工作日，做饭变成了“搭配”。记住一个简单的公式：<mark>一份主食 + 一份肉蛋豆 + 两种蔬菜 + 一种酱汁</mark>。同样的食材，换一种酱汁、换一种做法，就是另一顿饭。</p>
    <ul class="menu">
      <li><span class="menu-day">周一</span><span class="menu-dish">烤鸡腿糙米饭<span>配焯西兰花、胡萝卜丝，淋芝麻酱汁</span></span></li>
      <li><span class="menu-day">周二</span><span class="menu-dish">煎豆腐杂粮面<span>配清炒上海青，拌油醋汁</span></span></li>
      <li><span class="menu-day">周三</span><span class="menu-dish">鸡蛋蔬菜拌饭<span>生菜、番茄切块，叶菜在这一天吃完</span></span></li>
      <li><span class="menu-day">周四</span><span class="menu-dish">番茄菌菇炖豆腐<span>配糙米饭，一锅煮好，少洗一个锅</span></span></li>
      <li><span class="menu-day">周五</span><span class="menu-dish">鸡肉胡萝卜炒饭<span>把剩下的食材都用上，顺便清空冰箱</span></span></li>
    </ul>
    <p>不必一开始就追求完美。这个周末先试着只备三天的量，看看哪些菜家里人爱吃、哪些剩下了，下一次再调整清单。坚持两三周，你会有一套属于自己家的备餐节奏。</p>

    <div class="divider" aria-hidden="true">
      <svg viewBox="0 0 22 22"><path d="M11 2l4 6h-2.4l3.4 5h-3l3 5H6l3-5H6l3.4-5H7z" fill="#1f5c4a"/><rect x="10" y="18" width="2" height="3" fill="#b4591a"/></svg>
    </div>

    <div class="author">
      <span class="author-face">夏</span>
      <div>
        <span class="author-name">林知夏</span>
        <span class="author-role">云杉生活编辑 · “厨房与餐桌”栏目</span>
        <span class="author-bio">平时给两口人做饭，喜欢把麻烦的事拆成简单的步骤。来信请寄 hello@example.com。</span>
      </div>
    </div>

    <div class="follow">
      <div class="follow-text">
        <span class="follow-title">关注我们</span>
        <span class="follow-desc">每周五更新一篇生活小文章：做饭、收纳、日常整理。在手机上阅读，随时翻出来照着做。</span>
      </div>
      <div class="qr">
        <svg viewBox="0 0 108 108" role="img" aria-label="二维码占位图">
          <rect width="108" height="108" fill="#ffffff"/>
          <g fill="#cfe0d7">
            <rect x="14" y="14" width="16" height="16" rx="3"/><rect x="46" y="14" width="16" height="16" rx="3"/><rect x="78" y="14" width="16" height="16" rx="3"/>
            <rect x="30" y="30" width="16" height="16" rx="3"/><rect x="62" y="30" width="16" height="16" rx="3"/>
            <rect x="14" y="46" width="16" height="16" rx="3"/><rect x="78" y="46" width="16" height="16" rx="3"/>
            <rect x="30" y="62" width="16" height="16" rx="3"/><rect x="62" y="62" width="16" height="16" rx="3"/>
            <rect x="14" y="78" width="16" height="16" rx="3"/><rect x="46" y="78" width="16" height="16" rx="3"/><rect x="78" y="78" width="16" height="16" rx="3"/>
          </g>
          <rect x="42" y="42" width="24" height="24" rx="6" fill="#1f5c4a"/>
          <path d="M54 46l5 7h-3l4 6H48l4-6h-3z" fill="#ffffff"/>
        </svg>
        <span class="qr-note">此处放置二维码</span>
      </div>
    </div>

    <p class="rights">© 2026 云杉生活。本文为原创内容，转载请联系 hello@example.com 并注明出处。<br>文中的分量与时间来自编辑部的日常经验，仅供参考，请结合自家情况调整。</p>
  </div>
</article>
</body>
</html>
`;

  /* 文档：报价单 */
  const QUOTE = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>报价单 BJ-2026-1113-008 | 云杉信息技术有限公司</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1c2530;
    --ink-2: #505a68;
    --line: #d9dee5;
    --bg: #e8ebef;
    --paper: #ffffff;
    --accent: #17477a;
    --accent-soft: #eef3f9;
    --font: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 14px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  h1, h2, p { margin: 0; }
  .sheet { width: 100%; max-width: 210mm; min-height: 297mm; margin: 32px auto; padding: 15mm 15mm 12mm; background: var(--paper); box-shadow: 0 2px 10px rgba(28, 37, 48, .12); }

  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px 32px; padding-bottom: 16px; border-bottom: 3px solid var(--accent); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand svg { flex: none; }
  .brand strong { display: block; font-size: 17px; line-height: 1.35; }
  .brand span { font-size: 13px; color: var(--ink-2); }
  h1 { font-size: 32px; line-height: 1.2; font-weight: 700; letter-spacing: .3em; margin-right: -.3em; color: var(--accent); }

  .facts { display: grid; grid-template-columns: repeat(3, auto); justify-content: space-between; gap: 8px 24px; margin: 16px 0; padding: 10px 16px; background: var(--accent-soft); border-radius: 6px; }
  .facts dt { font-size: 12px; color: var(--ink-2); }
  .facts dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 28px; margin-bottom: 16px; }
  h2 { margin: 0 0 6px; font-size: 13px; font-weight: 700; letter-spacing: .08em; color: var(--accent); }
  .party strong { display: block; margin-bottom: 2px; font-size: 15px; }
  .kv { display: grid; grid-template-columns: auto 1fr; gap: 1px 12px; margin: 0; font-size: 13px; }
  .kv dt { color: var(--ink-2); white-space: nowrap; }
  .kv dd { margin: 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { padding: 7px 8px; font-weight: 600; text-align: left; color: var(--accent); background: var(--accent-soft); border-top: 2px solid var(--accent); border-bottom: 1px solid var(--accent); white-space: nowrap; }
  td { padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .c { text-align: center; white-space: nowrap; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .item strong { display: block; font-weight: 600; }
  .item span { display: block; font-size: 12px; color: var(--ink-2); }
  .memo { font-size: 12px; color: var(--ink-2); }

  .sum { display: grid; grid-template-columns: 1fr auto; gap: 4px 24px; margin: 10px 0 0; padding: 0 8px; }
  .sum dt { text-align: right; color: var(--ink-2); }
  .sum dd { margin: 0; min-width: 9em; text-align: right; font-variant-numeric: tabular-nums; }
  .total { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 24px; margin-top: 8px; padding: 10px 14px; background: var(--accent-soft); border-left: 4px solid var(--accent); color: var(--accent); }
  .total p { font-size: 14px; }
  .total b { font-size: 16px; font-weight: 700; }
  .total .small b { font-size: 19px; font-variant-numeric: tabular-nums; }

  .terms { display: grid; grid-template-columns: 1.25fr 1fr; gap: 16px 28px; margin-top: 18px; }
  .terms .kv dd { color: var(--ink); }

  .sign { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 16px 28px; margin-top: 18px; }
  .sign-lines { display: grid; gap: 12px; max-width: 320px; font-size: 13px; }
  .sign-lines p { display: flex; align-items: flex-end; gap: 8px; }
  .sign-lines span { color: var(--ink-2); white-space: nowrap; }
  .sign-lines i { flex: 1; min-height: 22px; border-bottom: 1px solid var(--ink-2); font-style: normal; font-variant-numeric: tabular-nums; }
  .seal { display: grid; place-items: center; width: 104px; height: 104px; border: 2px dashed #7c8794; border-radius: 50%; font-size: 13px; letter-spacing: .2em; color: var(--ink-2); }

  .foot { margin-top: 18px; padding-top: 10px; border-top: 1px solid var(--line); font-size: 12px; color: var(--ink-2); text-align: center; }

  @media (max-width: 700px) {
    .sheet { min-height: 0; margin: 0; padding: 24px 16px 32px; box-shadow: none; }
    h1 { font-size: 28px; }
    .facts { grid-template-columns: 1fr; }
    .parties, .terms { grid-template-columns: 1fr; }
    thead { display: none; }
    table, tbody { display: block; }
    tbody tr { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; padding: 10px 0; border-bottom: 1px solid var(--line); }
    tbody tr:first-child { border-top: 2px solid var(--accent); }
    td { display: flex; justify-content: space-between; gap: 8px; padding: 0; border: 0; text-align: left; white-space: normal; }
    td::before { content: attr(data-label); flex: none; font-size: 12px; color: var(--ink-2); }
    td.idx { display: none; }
    td.item, td.memo { grid-column: 1 / -1; display: block; }
    td.item::before { content: none; }
    td.memo::before { content: attr(data-label) "："; }
    td.item strong { font-size: 14px; }
    .sum { padding: 0; }
    .sum dd { min-width: 7.5em; }
    .sign { grid-template-columns: 1fr; justify-items: start; }
    .sign-lines { width: 100%; }
  }
  @media print {
    @page { margin: 0; }
    body { background: #fff; }
    body { line-height: 1.5; }
    .sheet { max-width: none; min-height: 0; margin: 0; padding: 10mm 15mm 8mm; box-shadow: none; }
    .seal { width: 92px; height: 92px; }
    .sign-lines { gap: 8px; }
    .head { padding-bottom: 12px; }
    .facts { margin: 12px 0; }
    .parties { margin-bottom: 12px; }
    td { padding-top: 5px; padding-bottom: 5px; }
    .terms, .sign { margin-top: 12px; }
    .foot { margin-top: 14px; padding-top: 8px; }
    tr, .terms section, .sign, .total { break-inside: avoid; }
  }
</style>
</head>
<body>
<article class="sheet">
  <header class="head">
    <div class="brand">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" rx="10" fill="#17477a"/><path d="M22 8l8 11h-4l7 9h-5l6 8H10l6-8h-5l7-9h-4z" fill="#eef3f9"/></svg>
      <div><strong>云杉信息技术有限公司</strong><span>门店管理软件与实施服务</span></div>
    </div>
    <h1>报价单</h1>
  </header>

  <dl class="facts">
    <div><dt>报价单号</dt><dd>BJ-2026-1113-008</dd></div>
    <div><dt>报价日期</dt><dd>2026年11月13日</dd></div>
    <div><dt>有效期</dt><dd>自报价之日起 15 日内有效</dd></div>
  </dl>

  <section class="parties">
    <div class="party">
      <h2>报价方（供方）</h2>
      <strong>云杉信息技术有限公司</strong>
      <dl class="kv">
        <dt>联系人</dt><dd>周明远（销售经理）</dd>
        <dt>电话</dt><dd>010-0000 0000</dd>
        <dt>地址</dt><dd>示例市示例区示例路 100 号 8 层</dd>
        <dt>邮箱</dt><dd>sales@example.com</dd>
      </dl>
    </div>
    <div class="party">
      <h2>客户（需方）</h2>
      <strong>望川餐饮管理有限公司</strong>
      <dl class="kv">
        <dt>联系人</dt><dd>陈思齐（采购主管）</dd>
        <dt>电话</dt><dd>021-0000 0000</dd>
        <dt>地址</dt><dd>示例市样本区示例大道 250 号 3 层</dd>
        <dt>邮箱</dt><dd>purchase@example.com</dd>
      </dl>
    </div>
  </section>

  <table>
    <thead>
      <tr><th class="c">序号</th><th>品名及规格</th><th class="c">单位</th><th class="num">数量</th><th class="num">含税单价（元）</th><th class="num">金额（元）</th><th>备注</th></tr>
    </thead>
    <tbody>
      <tr><td class="c idx">1</td><td class="item"><strong>门店管理软件授权</strong><span>标准版，每家门店 1 套，永久授权</span></td><td class="c" data-label="单位">套</td><td class="num" data-label="数量">12</td><td class="num" data-label="含税单价（元）">3,800.00</td><td class="num" data-label="金额（元）">45,600.00</td><td class="memo" data-label="备注">含首年升级</td></tr>
      <tr><td class="c idx">2</td><td class="item"><strong>系统实施服务</strong><span>需求调研、部署配置、数据迁移、上线支持</span></td><td class="c" data-label="单位">项</td><td class="num" data-label="数量">1</td><td class="num" data-label="含税单价（元）">28,000.00</td><td class="num" data-label="金额（元）">28,000.00</td><td class="memo" data-label="备注">覆盖 12 家门店</td></tr>
      <tr><td class="c idx">3</td><td class="item"><strong>操作培训</strong><span>现场授课，每天不超过 20 人</span></td><td class="c" data-label="单位">天</td><td class="num" data-label="数量">3</td><td class="num" data-label="含税单价（元）">2,400.00</td><td class="num" data-label="金额（元）">7,200.00</td><td class="memo" data-label="备注">含培训手册</td></tr>
      <tr><td class="c idx">4</td><td class="item"><strong>年度维护服务</strong><span>工作日 9:00–18:00 远程支持与补丁更新</span></td><td class="c" data-label="单位">年</td><td class="num" data-label="数量">1</td><td class="num" data-label="含税单价（元）">9,600.00</td><td class="num" data-label="金额（元）">9,600.00</td><td class="memo" data-label="备注">验收后起算</td></tr>
      <tr><td class="c idx">5</td><td class="item"><strong>收银终端</strong><span>15.6 英寸触摸屏，8GB 内存，256GB 存储</span></td><td class="c" data-label="单位">台</td><td class="num" data-label="数量">12</td><td class="num" data-label="含税单价（元）">2,650.00</td><td class="num" data-label="金额（元）">31,800.00</td><td class="memo" data-label="备注">含安装调试</td></tr>
      <tr><td class="c idx">6</td><td class="item"><strong>热敏小票打印机</strong><span>80mm 纸宽，USB 与网口</span></td><td class="c" data-label="单位">台</td><td class="num" data-label="数量">12</td><td class="num" data-label="含税单价（元）">480.00</td><td class="num" data-label="金额（元）">5,760.00</td><td class="memo" data-label="备注">每台配 2 卷纸</td></tr>
    </tbody>
  </table>

  <dl class="sum">
    <dt>不含税金额</dt><dd>¥113,238.94</dd>
    <dt>增值税（13%）</dt><dd>¥14,721.06</dd>
  </dl>
  <div class="total">
    <p class="big">价税合计（大写）：<b>人民币壹拾贰万柒仟玖佰陆拾元整</b></p>
    <p class="small">价税合计（小写）：<b>¥127,960.00</b></p>
  </div>

  <div class="terms">
    <section>
      <h2>商务条款</h2>
      <dl class="kv">
        <dt>交付周期</dt><dd>合同签订后 30 个工作日内完成交付与上线</dd>
        <dt>付款方式</dt><dd>合同签订后预付 50%，验收合格后支付 50%</dd>
        <dt>发票类型</dt><dd>增值税专用发票（税率 13%）</dd>
        <dt>质保期</dt><dd>硬件自验收之日起 12 个月；软件免费维护 12 个月</dd>
        <dt>不含项目</dt><dd>网络布线、第三方系统接口开发、外地差旅费</dd>
      </dl>
    </section>
    <section>
      <h2>收款信息</h2>
      <dl class="kv">
        <dt>开户名称</dt><dd>云杉信息技术有限公司</dd>
        <dt>开户银行</dt><dd>示例银行示例支行</dd>
        <dt>账号</dt><dd>0000 0000 0000 0000 000</dd>
        <dt>统一社会信用代码</dt><dd>000000000000000000</dd>
      </dl>
    </section>
  </div>

  <div class="sign">
    <div class="sign-lines">
      <p><span>报价方</span><i>云杉信息技术有限公司</i></p>
      <p><span>联系人签字</span><i></i></p>
      <p><span>日期</span><i>2026年11月13日</i></p>
    </div>
    <div class="seal">盖章处</div>
  </div>

  <p class="foot">本报价单为示例文档，其中的公司、联系人、金额与账户信息均为虚构，仅用于演示版式。</p>
</article>
</body>
</html>
`;

  window.HE.samples.add([
    { key: 'hans-report', lang: 'zh-Hans', name: '示例：季度经营报告', description: '深色刊头、4 张指标卡、分区域表格、月度柱状图、计划卡片与风险提示。', html: REPORT },
    { key: 'hans-deck', lang: 'zh-Hans', name: '幻灯片：年终工作汇报', description: '10 张 16:9 幻灯片：封面、目录、关键数据、重点工作、趋势图、复盘与明年计划。', html: DECK },
    { key: 'hans-traceable', lang: 'zh-Hans', name: '报告：可追溯的经营报告', description: '季度经营报告，每个数字都由 tactile-ingest 从电子表格填入，点击可查看来源单元格。', html: TRACEABLE },
    { key: 'hans-board', lang: 'zh-Hans', name: '数据：大促战报', description: '深红金色的大促成交战报，含核心指标、分时趋势、品类与区域排行。', html: BOARD },
    { key: 'hans-launch', lang: 'zh-Hans', name: '网站：新品发布页', description: '智能手表新品页：大字卖点、参数对比、配色选择与预约表单，带悬停和滚动效果。', html: LAUNCH },
    { key: 'hans-invite', lang: 'zh-Hans', name: '网站：活动邀请函', description: '国潮风格的手机邀请函长页，含流程、嘉宾、交通指引与回执表单。', html: INVITE },
    { key: 'hans-article', lang: 'zh-Hans', name: '文档：图文长文', description: '适合在手机上阅读的长篇图文，带导读、序号小标题、金句卡片和数据卡片。', html: ARTICLE },
    { key: 'hans-quote', lang: 'zh-Hans', name: '文档：报价单', description: '含税报价单，带明细、价税合计大写、商务条款与盖章处，A4 一页可直接打印。', html: QUOTE },
  ]);
})();
