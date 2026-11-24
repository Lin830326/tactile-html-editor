/* Tactile — samples-en.js: starter documents written in English.
 *
 * The same kind of page as in samples.js (one <style>, inline SVG or CSS for pictures, system fonts, made-up companies
 * and people), written for readers anywhere: amounts in USD, dates that read one way only, example.com addresses.
 * They are not translations of the Chinese templates. Each is a test case of tests/templates.spec.js as well.
 *
 * Effects (the tfx-* classes and the two <style data-he-style> blocks) were written by the editor itself, not by hand.
 * The traceable report is the output of tactile-ingest fill: do not edit its numbers or its source block here.
 */
(function () {
  'use strict';

  const BLANK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Untitled document</title>
<style>
  :root {
    color-scheme: light;
    --text: #1f2328;
    --muted: #59636e;
    --line: #e3e6ea;
    --bg: #ffffff;
    --accent: #0b6bcb;
    --font: system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
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
  <h1>Untitled document</h1>
  <p>Double-click this text to start editing.</p>
</main>
</body>
</html>
`;

  /* Sample: Quarterly business review */
  const REPORT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fernhollow Q3 2026 Business Review</title>
<style>
  :root {
    color-scheme: light;
    --ink: #121a2e;
    --ink-2: #434d63;
    --ink-3: #5c6679;
    --line: #dde2ec;
    --bg: #f3f5f9;
    --card: #ffffff;
    --brand: #2747c7;
    --brand-deep: #101a3a;
    --brand-soft: #e4e9fb;
    --amber: #b86a0c;
    --amber-soft: #fdf3e1;
    --up: #0f7050;
    --down: #a83522;
    --radius: 14px;
    --shadow: 0 1px 2px rgba(18, 26, 46, .06), 0 12px 32px rgba(18, 26, 46, .08);
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 16px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, p { margin: 0; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

  .masthead {
    padding: 36px 0 120px;
    color: #e8ecfa;
    background-color: var(--brand-deep);
    background-image:
      radial-gradient(circle at 85% 15%, rgba(96, 130, 255, .32), transparent 42%),
      linear-gradient(rgba(255, 255, 255, .045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, .045) 1px, transparent 1px);
    background-size: auto, 44px 44px, 44px 44px;
  }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #b4c3f7; }
  .brand svg { width: 30px; height: 30px; flex: none; }
  .masthead h1 { margin: 44px 0 14px; font-size: clamp(30px, 5.2vw, 50px); line-height: 1.15; letter-spacing: -.015em; color: #fff; }
  .subtitle { max-width: 38em; font-size: clamp(16px, 2.2vw, 19px); color: #c3cdee; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 28px; margin-top: 28px; font-size: 14px; color: #aab7e2; }
  .meta strong { margin-left: 8px; font-weight: 500; color: #e8ecfa; }

  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: -76px; }
  .kpi { padding: 20px 22px; background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); }
  .kpi-label { font-size: 14px; font-weight: 500; color: var(--ink-2); }
  .kpi-value { margin: 6px 0 10px; font-size: 32px; font-weight: 700; line-height: 1.15; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .kpi-value small { margin-left: 4px; font-size: 15px; font-weight: 500; letter-spacing: 0; color: var(--ink-3); }
  .delta { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px 2px 8px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--up); background: #e3f3eb; }
  .delta::before { content: ""; border: 5px solid transparent; border-top: 0; border-bottom: 7px solid currentColor; }
  .delta.down { color: var(--down); background: #fbe8e4; }
  .delta.down::before { border-bottom: 0; border-top: 7px solid currentColor; }

  .section { margin-top: 64px; }
  .eyebrow { margin-bottom: 8px; font-size: 13px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--brand); }
  .section h2 { font-size: clamp(22px, 3vw, 28px); line-height: 1.3; letter-spacing: -.01em; }
  .section-lead { margin-top: 6px; color: var(--ink-2); }
  .intro { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 16px 56px; }
  .prose { color: var(--ink-2); }
  .prose p + p { margin-top: 14px; }
  .prose p:first-child { font-size: 18px; color: var(--ink); }

  .table-wrap { margin-top: 20px; overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
  table { width: 100%; min-width: 680px; border-collapse: collapse; font-size: 15px; }
  th, td { padding: 14px 20px; text-align: left; border-bottom: 1px solid var(--line); }
  thead th { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); background: #f7f8fc; white-space: nowrap; }
  tfoot td { font-weight: 700; background: #f7f8fc; border-bottom: 0; }
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
  .legend span::before { content: ""; width: 10px; height: 10px; border-radius: 3px; background: #b3c1f0; }
  .legend .q3::before { background: var(--brand); }
  .chart { display: block; width: 100%; max-width: 500px; height: auto; margin: 0 auto; }
  .highlights { display: grid; gap: 16px; margin: 16px 0 0; padding: 0; list-style: none; }
  .highlights li { position: relative; padding-left: 26px; color: var(--ink-2); line-height: 1.6; }
  .highlights li::before { content: ""; position: absolute; left: 0; top: .4em; width: 12px; height: 12px; border: 3px solid var(--brand); border-radius: 50%; background: var(--brand-soft); }
  .highlights strong { color: var(--ink); }

  .plan { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
  .plan .card { display: flex; flex-direction: column; }
  .step { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-bottom: 14px; border-radius: 50%; font-size: 14px; font-weight: 700; color: var(--brand); background: var(--brand-soft); }
  .plan .card p { margin-top: 8px; color: var(--ink-2); }
  .plan .card .owner { margin-top: auto; padding-top: 16px; font-size: 14px; color: var(--ink-3); }
  .owner strong { font-weight: 600; color: var(--ink); }

  .callout { margin-top: 48px; padding: 26px 30px; color: #5c4a2c; background: var(--amber-soft); border: 1px solid #efd5a5; border-left: 6px solid var(--amber); border-radius: var(--radius); }
  .callout h3 { font-size: 19px; color: #7a4a07; }
  .callout p { margin-top: 8px; }
  .callout ul { margin: 12px 0 0; padding-left: 1.3em; }
  .callout li + li { margin-top: 6px; }
  .callout li::marker { color: var(--amber); }

  .cta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-top: 40px; }
  .btn { display: inline-flex; align-items: center; padding: 13px 28px; border-radius: 999px; background: var(--brand); color: #fff; font-weight: 700; text-decoration: none; box-shadow: 0 6px 16px rgba(39, 71, 199, .25); transition: background-color .15s, transform .15s; }
  .btn:hover { background: #1d38a3; transform: translateY(-1px); }
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
    <p class="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#3d5fe6"/><path d="M16 6c5 3.2 7.5 7.2 7.5 11.2 0 3.6-2.6 6.4-6.3 6.8V26h-2.4v-2c-3.7-.4-6.3-3.2-6.3-6.8C8.5 13.2 11 9.2 16 6z" fill="#fff"/><path d="M16 12v10" stroke="#3d5fe6" stroke-width="1.8" stroke-linecap="round"/></svg>Fernhollow</p>
    <h1>Q3 2026 Business Review</h1>
    <p class="subtitle">Revenue grew 18.4% year over year to $4.82M. APAC was the fastest-growing region after the Singapore data region opened in August, and customer satisfaction reached 4.6 out of 5.</p>
    <p class="meta"><span>Published<strong>October 15, 2026</strong></span><span>Prepared by<strong>Amara Okafor, Finance &amp; Strategy</strong></span><span>Period<strong>July 1 – September 30, 2026</strong></span></p>
  </div>
</header>

<main class="wrap">
  <section class="kpis" aria-label="Key metrics">
    <article class="kpi">
      <p class="kpi-label">Revenue</p>
      <p class="kpi-value">$4.82M</p>
      <p class="delta">+18.4% YoY</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Active customers</p>
      <p class="kpi-value">1,284</p>
      <p class="delta">+12.6% YoY</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Gross margin</p>
      <p class="kpi-value">71.4<small>%</small></p>
      <p class="delta down">−0.8 pts vs Q2</p>
    </article>
    <article class="kpi">
      <p class="kpi-label">Customer satisfaction</p>
      <p class="kpi-value">4.6<small>/ 5</small></p>
      <p class="delta">+0.2 vs Q2</p>
    </article>
  </section>

  <section class="section intro">
    <div>
      <p class="eyebrow">01 · Summary</p>
      <h2>Growth came from APAC and larger clinic groups</h2>
    </div>
    <div class="prose">
      <p>Fernhollow closed the third quarter with $4.82M in revenue, up 18.4% from the same quarter last year and 8.6% from Q2. Two things drove the result: the Singapore data region, which opened on August 4 and unlocked customers with local data-residency rules, and the Teams plan, which 62 clinic groups adopted during the quarter.</p>
      <p>Gross profit was $3.44M on $1.38M cost of revenue, a 71.4% margin. That is 0.8 points below Q2, because the new region carried hosting costs before its customers were fully onboarded. Service quality held up: satisfaction rose to 4.6 out of 5 and median first-response time fell below two hours. The sections below cover results by region, the monthly trend and the plan for Q4.</p>
    </div>
  </section>

  <section class="section" id="regions">
    <p class="eyebrow">02 · Regional performance</p>
    <h2>Revenue and customers by region</h2>
    <p class="section-lead">APAC grew 31.3% year over year, the fastest of the four regions.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Region</th><th class="num">Revenue ($K)</th><th class="num">YoY</th><th class="num">Customers</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td>North America</td><td class="num">2,120</td><td class="num pos">+14.6%</td><td class="num">548</td><td class="note">Teams plan adopted by 38 clinic groups</td></tr>
          <tr><td>EMEA</td><td class="num">1,390</td><td class="num pos">+17.8%</td><td class="num">372</td><td class="note">German and French interfaces released</td></tr>
          <tr class="is-highlight"><td>APAC</td><td class="num">860</td><td class="num pos">+31.3%</td><td class="num">241</td><td class="note">Singapore data region opened August 4</td></tr>
          <tr><td>LATAM</td><td class="num">450</td><td class="num pos">+16.6%</td><td class="num">123</td><td class="note">Local-currency billing live in Brazil</td></tr>
        </tbody>
        <tfoot>
          <tr><td>Total</td><td class="num">4,820</td><td class="num pos">+18.4%</td><td class="num">1,284</td><td class="note"></td></tr>
        </tfoot>
      </table>
    </div>
  </section>

  <section class="section">
    <p class="eyebrow">03 · Trend and highlights</p>
    <h2>Six straight months of growth, with a record September</h2>
    <div class="split">
      <div class="card">
        <h3>Monthly revenue ($M)</h3>
        <p class="legend"><span class="q2">Q2</span><span class="q3">Q3</span></p>
        <svg class="chart" viewBox="0 0 360 232" role="img" aria-label="Monthly revenue, April to September 2026, in millions of dollars: 1.44, 1.48, 1.52, 1.55, 1.60, 1.67">
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
          <g fill="#b3c1f0">
            <rect x="54" y="67.52" width="32" height="132.48" rx="3"/>
            <rect x="104" y="63.84" width="32" height="136.16" rx="3"/>
            <rect x="154" y="60.16" width="32" height="139.84" rx="3"/>
          </g>
          <g fill="#2747c7">
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
            <text x="70" y="222">Apr</text>
            <text x="120" y="222">May</text>
            <text x="170" y="222">Jun</text>
            <text x="220" y="222">Jul</text>
            <text x="270" y="222">Aug</text>
            <text x="320" y="222">Sep</text>
          </g>
        </svg>
      </div>
      <div class="card">
        <h3>Highlights</h3>
        <ul class="highlights">
          <li><strong>Net revenue retention of 108%:</strong> existing customers added seats faster than others left.</li>
          <li><strong>62 clinic groups on Teams:</strong> the plan now accounts for 27% of new bookings.</li>
          <li><strong>Faster support:</strong> median first-response time fell from 3 h 10 min to 1 h 48 min.</li>
          <li><strong>99.97% uptime:</strong> one incident on September 9 lasted 14 minutes.</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section">
    <p class="eyebrow">04 · Next quarter</p>
    <h2>Three priorities for Q4</h2>
    <p class="section-lead">Q4 revenue target: $5.20M, up 7.9% from Q3.</p>
    <div class="plan">
      <article class="card">
        <span class="step">1</span>
        <h3>Recover gross margin</h3>
        <p>Move APAC workloads to reserved capacity and retire the duplicate staging cluster. Target: 72.5% by December.</p>
        <p class="owner"><strong>Kenji Watanabe</strong> · due November 20, 2026</p>
      </article>
      <article class="card">
        <span class="step">2</span>
        <h3>Launch annual billing</h3>
        <p>Offer a 10% discount for annual prepayment in all four regions, starting with North America and EMEA.</p>
        <p class="owner"><strong>Sofia Marín</strong> · due October 31, 2026</p>
      </article>
      <article class="card">
        <span class="step">3</span>
        <h3>Hire for APAC support</h3>
        <p>Add 4 support specialists in Singapore so that APAC customers get replies during local business hours.</p>
        <p class="owner"><strong>Priya Raman</strong> · due December 12, 2026</p>
      </article>
    </div>
  </section>

  <aside class="callout">
    <h3>Risks to watch</h3>
    <p>Three items could move the Q4 result by more than $100K and are reviewed weekly by the leadership team.</p>
    <ul>
      <li>Two enterprise renewals worth $310K a year are due in November; both customers have asked for single sign-on first.</li>
      <li>A stronger dollar would lower reported EMEA and LATAM revenue; a 5% move is about $92K per quarter.</li>
      <li>APAC onboarding takes 23 days on average, against 14 days elsewhere, until the Singapore team is hired.</li>
    </ul>
  </aside>

  <div class="cta">
    <a class="btn" href="#regions">See regional details</a>
    <p class="cta-note">For the full dataset, write to <a href="mailto:finance@example.com">finance@example.com</a> or call 555-0142.</p>
  </div>
</main>

<footer>
  <div class="wrap">
    <p>© 2026 Fernhollow, Inc. Fernhollow is a fictional company.</p>
    <p>Internal use only. Figures are unaudited, as of September 30, 2026.</p>
  </div>
</footer>
</body>
</html>
`;

  /* Slides: Investor pitch deck */
  const PITCH = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Okapi Grid Series A Investor Deck</title>
<style>
  :root {
    color-scheme: dark;
    --night: #0a0f33;
    --ink: #ffffff;
    --ink-2: #c4cdee;
    --cyan: #3ef0e4;
    --cyan-deep: #062a3a;
    --violet: #6a48f0;
    --lilac: #b9a6ff;
    --pink: #ff8fdc;
    --amber: #ffcf6b;
    --glass: rgba(255, 255, 255, .06);
    --edge: rgba(134, 232, 255, .26);
    --hair: rgba(255, 255, 255, .22);
    --desk: #05060f;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 20px 72px; background: var(--desk); color: var(--ink); font-family: var(--font); -webkit-font-smoothing: antialiased; }

  /* Every size uses cqw (1% of the slide width), so a slide scales as one picture and stays 16:9 at any width. The smallest text is 1.65cqw: 12px on a 730px slide. */
  .deck { display: grid; gap: 36px; max-width: 1120px; margin: 0 auto; container-type: inline-size; counter-reset: slide; }
  .slide {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    aspect-ratio: 16 / 9;
    padding: 4.6cqw 6cqw 5.4cqw;
    overflow: hidden;
    overflow: clip;
    color: var(--ink);
    background-color: var(--night);
    background-image: radial-gradient(60% 80% at 100% 100%, rgba(122, 60, 190, .55), rgba(122, 60, 190, 0) 70%), linear-gradient(120deg, #070b26 0%, #0b1240 42%, #1f1a6b 78%, #33207c 100%);
    border-radius: 8px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, .55);
    counter-increment: slide;
  }
  /* A faint corner of the title slide's grid on every slide. */
  .slide::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(62, 240, 228, .2) 1px, transparent 1px), linear-gradient(90deg, rgba(62, 240, 228, .2) 1px, transparent 1px);
    background-size: 5cqw 5cqw;
    -webkit-mask-image: radial-gradient(48% 62% at 100% 0%, #000, transparent 100%);
    mask-image: radial-gradient(48% 62% at 100% 0%, #000, transparent 100%);
    pointer-events: none;
  }
  .slide::after { content: "Okapi Grid · " counter(slide, decimal-leading-zero); position: absolute; right: 6cqw; bottom: 2.1cqw; font-size: 1.65cqw; line-height: 1.2; font-weight: 700; letter-spacing: .1em; color: var(--ink-2); }
  .slide > * { position: relative; }
  .slide h1, .slide h2, .slide h3, .slide p, .slide ol, .slide ul { margin: 0; }
  .slide h2 { font-size: 4.1cqw; line-height: 1.1; font-weight: 800; letter-spacing: -.02em; }
  .slide h3 { font-size: 2.3cqw; line-height: 1.2; font-weight: 700; }
  .slide p { font-size: 1.9cqw; line-height: 1.45; color: var(--ink-2); }
  .slide .eyebrow { margin-bottom: 1.3cqw; font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--cyan); }
  .slide .lede { margin-top: 1.5cqw; max-width: 66cqw; font-size: 2.05cqw; }
  .slide .small { font-size: 1.65cqw; line-height: 1.4; }
  .slide .big { font-weight: 800; letter-spacing: -.03em; line-height: 1; color: var(--ink); white-space: nowrap; }
  .slide .hl { color: var(--cyan); }
  .card { min-width: 0; padding: 2.2cqw 2.4cqw; border: 1px solid var(--edge); border-radius: 1.4cqw; background: var(--glass); }

  /* 1. Title */
  .slide-title { padding-top: 5cqw; }
  .slide-title::before { content: none; }
  .mesh { position: absolute; top: 0; right: 0; width: 66%; height: 100%; -webkit-mask-image: linear-gradient(to right, transparent 2%, #000 58%); mask-image: linear-gradient(to right, transparent 2%, #000 58%); }
  .brand { display: flex; align-items: center; gap: 1.6cqw; }
  .slide .brand-name { font-size: 2.7cqw; line-height: 1.2; font-weight: 800; letter-spacing: -.01em; color: var(--ink); }
  .slide .pill { padding: .45cqw 1.3cqw; border: 1px solid var(--hair); border-radius: 3cqw; background: rgba(255, 255, 255, .1); font-size: 1.65cqw; line-height: 1.3; color: var(--ink); }
  .slide-title h1 { margin-top: auto; font-size: 9.6cqw; line-height: 1; font-weight: 800; letter-spacing: -.035em; }
  .slide .tagline { margin-top: 1.8cqw; font-size: 2.15cqw; color: var(--ink); }
  .title-stats { display: flex; margin-top: auto; padding-top: 2.2cqw; border-top: 1px solid var(--hair); }
  .title-stats div { padding: 0 3.6cqw; border-left: 1px solid var(--hair); }
  .title-stats div:first-child { padding-left: 0; border-left: 0; }
  .slide .title-stats .big { font-size: 3.7cqw; }
  .slide .title-stats .small { margin-top: .6cqw; }

  /* 2. Problem */
  .trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.2cqw; margin-top: auto; }
  .slide .trio .card .big { font-size: 6.6cqw; color: var(--cyan); }
  .slide .trio h3 { margin-top: 1.4cqw; }
  .slide .trio .card p:last-child { margin-top: .7cqw; font-size: 1.75cqw; }
  .slide .source { margin-top: 1.5cqw; padding-right: 22cqw; font-size: 1.65cqw; line-height: 1.3; }

  /* 3. Solution */
  .cols { display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); gap: 4cqw; align-items: center; flex: 1; }
  .slide .ticks { display: grid; gap: 1.5cqw; margin-top: 2.6cqw; padding: 0; list-style: none; }
  .ticks li { display: grid; grid-template-columns: 2.6cqw minmax(0, 1fr); column-gap: 1.2cqw; align-items: start; }
  .ticks svg { width: 2.6cqw; height: 2.6cqw; margin-top: .1cqw; }
  .slide .ticks p { font-size: 1.9cqw; }
  .ticks strong { color: var(--ink); }
  .race { display: grid; gap: 1.5cqw; padding: 2.8cqw; }
  .race-row { display: flex; justify-content: space-between; align-items: baseline; gap: 1cqw; }
  .slide .race-row p { font-size: 1.75cqw; line-height: 1.3; }
  .slide .race-row .time { font-weight: 700; color: var(--ink); white-space: nowrap; }
  .track { height: 2.4cqw; border-radius: 1.2cqw; background: rgba(255, 255, 255, .1); }
  .track span { display: block; height: 100%; border-radius: 1.2cqw; background: var(--lilac); }
  .track .fast { background: linear-gradient(90deg, #2bd0f5, var(--cyan)); box-shadow: 0 0 2.4cqw rgba(62, 240, 228, .7); }
  .race-result { display: flex; align-items: center; gap: 2cqw; margin-top: .8cqw; padding-top: 1.8cqw; border-top: 1px solid var(--hair); }
  .slide .race-result .big { font-size: 6.4cqw; color: var(--cyan); }
  .slide .race-result p:last-child { font-size: 1.75cqw; }

  /* 4. How it works */
  .flow { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3cqw; margin: auto 0; padding: 0; list-style: none; }
  .flow li { position: relative; padding: 0 2.4cqw 2.4cqw; border: 1px solid var(--edge); border-radius: 1.4cqw; background: var(--glass); }
  .flow li::after { content: ""; position: absolute; top: 3.2cqw; left: 100%; width: 3cqw; height: 0; border-top: .3cqw dotted var(--cyan); }
  .flow li:last-child::after { content: none; }
  .flow svg { display: block; width: 9cqw; height: 9cqw; margin-top: -1.6cqw; }
  .slide .step { margin-top: 1.8cqw; font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--cyan); }
  .slide .flow h3 { margin-top: .5cqw; font-size: 2.9cqw; letter-spacing: -.01em; }
  .slide .flow p:last-child { margin-top: 1cqw; font-size: 1.8cqw; }
  .flow-wrap { display: flex; flex-direction: column; flex: 1; padding-top: 3.2cqw; }

  /* 5. Market */
  .market { display: grid; grid-template-columns: 36cqw minmax(0, 1fr); gap: 5cqw; align-items: center; flex: 1; }
  .rings { position: relative; width: 36cqw; height: 36cqw; }
  .rings svg { display: block; width: 100%; height: 100%; }
  .slide .rings p { position: absolute; left: 0; width: 100%; text-align: center; font-size: 1.9cqw; line-height: 1.2; font-weight: 800; letter-spacing: .12em; color: var(--ink); }
  .slide .rings .som { left: 50%; width: auto; padding: 0 .6cqw; transform: translateX(-50%); color: var(--cyan-deep); background: var(--cyan); }
  .sizes { display: grid; gap: 1.2cqw; margin-top: 2cqw; }
  .size { display: grid; grid-template-columns: 15cqw minmax(0, 1fr); column-gap: 2cqw; align-items: center; padding: .8cqw 0 .8cqw 1.8cqw; border-left: .5cqw solid var(--violet); }
  .size.sam { border-left-color: var(--lilac); }
  .size.som { border-left-color: var(--cyan); }
  .slide .size .big { font-size: 4.4cqw; }
  .slide .size p:last-child { font-size: 1.7cqw; line-height: 1.35; }
  .size strong { display: block; color: var(--ink); }

  /* 6. Traction */
  .traction { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); gap: 4cqw; align-items: end; margin-top: auto; }
  .plot { position: relative; aspect-ratio: 2 / 1; }
  .plot svg { display: block; width: 100%; height: 100%; }
  .slide .plot p { position: absolute; width: 20%; margin-left: -10%; text-align: center; font-size: 1.9cqw; line-height: 1.2; font-weight: 700; color: var(--ink); }
  .slide .plot p.now { font-size: 2.5cqw; font-weight: 800; color: var(--cyan); }
  .quarters { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); padding-top: .8cqw; text-align: center; }
  .slide .quarters p { font-size: 1.65cqw; line-height: 1.3; font-weight: 600; }
  .facts { display: grid; gap: 1.5cqw; padding-bottom: 2.6cqw; }
  .facts div { padding-left: 1.6cqw; border-left: .4cqw solid var(--cyan); }
  .slide .facts .big { font-size: 3.6cqw; }
  .slide .facts .small { margin-top: .4cqw; }

  /* 7. Business model */
  .model { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 2.4cqw; margin-top: auto; }
  .price { display: flex; flex-direction: column; justify-content: center; padding: 3cqw; border-color: var(--cyan); background: linear-gradient(150deg, rgba(62, 240, 228, .2), rgba(106, 72, 240, .22)); box-shadow: 0 0 5cqw rgba(62, 240, 228, .22); }
  .slide .price .big { font-size: 8.6cqw; }
  .slide .price h3 { margin-top: 1.2cqw; font-size: 2.4cqw; }
  .slide .price p:last-child { margin-top: 1cqw; font-size: 1.75cqw; }
  .quad { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.4cqw; }
  .quad .card { padding: 1.8cqw 2.2cqw; }
  .slide .quad .big { font-size: 4.4cqw; color: var(--cyan); }
  .slide .quad .small { margin-top: .7cqw; }
  .sum { display: flex; align-items: center; justify-content: center; gap: 2.2cqw; margin-top: 2.2cqw; padding: 1.3cqw 2cqw; border-radius: 1.4cqw; background: rgba(4, 8, 32, .55); }
  .slide .sum p { font-size: 1.9cqw; line-height: 1.3; }
  .slide .sum strong { font-size: 2.5cqw; font-weight: 800; color: var(--ink); }
  .slide .sum .op { font-size: 2.5cqw; font-weight: 700; color: var(--cyan); }

  /* 8. Competition */
  .matrix { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 1cqw 1.6cqw; margin-top: auto; }
  .slide .axis { font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-2); text-align: center; }
  .matrix .top { grid-area: 1 / 2; }
  .matrix .bottom { grid-area: 3 / 2; }
  .matrix .left { grid-area: 2 / 1; }
  .matrix .right { grid-area: 2 / 3; }
  .cells { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-area: 2 / 2; border: 1px solid var(--edge); border-radius: 1.4cqw; background: rgba(4, 8, 32, .4); }
  .cell { display: flex; flex-direction: column; justify-content: center; min-width: 0; height: 12.4cqw; padding: 1.4cqw 2.6cqw; border-right: 1px dashed var(--hair); border-bottom: 1px dashed var(--hair); }
  .cell:nth-child(even) { border-right: 0; }
  .cell:nth-child(n+3) { border-bottom: 0; }
  .slide .cell h3 { font-size: 2.3cqw; }
  .slide .cell p { margin-top: .6cqw; font-size: 1.75cqw; line-height: 1.35; }
  .cell.us { border-radius: 0 1.3cqw 0 0; background: linear-gradient(150deg, rgba(62, 240, 228, .26), rgba(106, 72, 240, .3)); box-shadow: inset 0 0 0 .25cqw var(--cyan), 0 0 4cqw rgba(62, 240, 228, .35); }
  .slide .cell.us h3 { font-size: 3.3cqw; font-weight: 800; color: var(--cyan); }
  .slide .cell.us p { color: var(--ink); }

  /* 9. Team */
  .team { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.2cqw; margin-top: auto; }
  .slide .person { padding: 2cqw 1.8cqw; }
  .slide .face { display: flex; align-items: center; justify-content: center; width: 7.8cqw; height: 7.8cqw; border-radius: 2cqw; font-size: 3.1cqw; line-height: 1; font-weight: 800; letter-spacing: -.02em; color: var(--cyan-deep); background: var(--cyan); }
  .slide .face.b { color: #ffffff; background: var(--violet); }
  .slide .face.c { color: #3a0b2e; background: var(--pink); }
  .slide .face.d { color: #3a2600; background: var(--amber); }
  .slide .person h3 { margin-top: 1.6cqw; font-size: 2.05cqw; white-space: nowrap; }
  .slide .role { margin-top: .4cqw; font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--cyan); }
  .slide .person p:last-child { margin-top: 1cqw; font-size: 1.65cqw; line-height: 1.4; }
  .slide .headcount { margin-top: 2cqw; padding-right: 22cqw; font-size: 1.75cqw; }
  .headcount strong { color: var(--ink); }

  /* 10. The ask */
  .ask { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 4cqw; align-items: center; flex: 1; }
  .slide .ask .big.raise { margin-top: .6cqw; font-size: 15cqw; letter-spacing: -.05em; text-shadow: 0 0 6cqw rgba(62, 240, 228, .55); }
  .slide .ask-note { margin-top: 1.6cqw; font-size: 2.15cqw; color: var(--ink); }
  .slide .ask-contact { margin-top: 2.6cqw; padding-top: 1.6cqw; border-top: 1px solid var(--hair); font-size: 1.75cqw; }
  .ask-contact strong { color: var(--ink); }
  .funds { padding: 2.6cqw; }
  .slide .funds .eyebrow { margin-bottom: 1.4cqw; }
  .stack { display: flex; height: 4.6cqw; border-radius: 1.2cqw; overflow: hidden; }
  .slide .stack p { display: flex; align-items: center; justify-content: center; font-size: 1.9cqw; line-height: 1; font-weight: 800; color: var(--cyan-deep); background: var(--cyan); }
  .slide .stack .b { color: #ffffff; background: var(--violet); }
  .slide .stack .c { color: #3a0b2e; background: var(--pink); }
  .uses { display: grid; margin-top: 1.4cqw; }
  .use { display: grid; grid-template-columns: 1.4cqw minmax(0, 1fr) auto; column-gap: 1.2cqw; align-items: center; padding: 1cqw 0; border-bottom: 1px solid var(--hair); }
  .use i { width: 1.4cqw; height: 1.4cqw; border-radius: .4cqw; background: var(--cyan); }
  .use i.b { background: var(--violet); }
  .use i.c { background: var(--pink); }
  .slide .use p { font-size: 1.75cqw; line-height: 1.3; color: var(--ink); }
  .slide .use .amt { font-weight: 800; }
  .slide .goal { margin-top: 1.5cqw; font-size: 1.75cqw; }
  .goal strong { color: var(--cyan); }

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

<section class="slide slide-title">
  <svg class="mesh" viewBox="0 0 800 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke-linejoin="round">
      <use href="#pitch-mesh" stroke="#3ef0e4" stroke-opacity=".22" stroke-width="5"/>
      <g stroke="#59f3ea" stroke-opacity=".9" stroke-width="1.3"><path id="pitch-mesh" d="M-248 -69L-189 -50L-127 -55L-64 -55L-17 -70L45 -108L118 -139L168 -170L223 -184L297 -199L354 -218L412 -211L465 -200L523 -197L584 -209L653 -206L716 -221L775 -246M-249 -35L-187 -21L-123 -25L-57 -32L5 -45L54 -71L120 -101L176 -122L240 -152L302 -163L357 -168L415 -174L480 -162L538 -163L598 -169L663 -179L713 -189L780 -219M-222 4L-169 16L-107 22L-53 6L13 -15L67 -27L135 -60L189 -83L247 -104L316 -114L372 -118L437 -104L490 -108L556 -105L606 -108L675 -125L723 -148L785 -169M-219 51L-154 64L-92 65L-39 43L25 27L89 5L152 -14L205 -32L263 -49L331 -54L382 -46L451 -37L500 -41L562 -44L619 -44L690 -69L746 -95L800 -121M-198 100L-134 94L-77 87L-15 77L37 63L94 43L158 13L222 3L281 5L339 8L393 11L462 14L522 30L581 17L646 13L699 -2L764 -40L826 -67M-191 140L-131 147L-60 133L-12 112L61 90L111 65L170 53L237 40L298 37L362 45L424 57L472 68L539 80L599 71L649 58L710 45L769 27L833 -13M-172 203L-108 197L-40 183L14 150L69 135L137 108L186 96L257 79L307 87L368 97L435 115L498 125L558 128L607 125L673 109L737 95L795 66L859 39M-143 280L-84 271L-23 245L31 203L94 176L152 153L218 138L276 148L323 146L384 158L443 165L506 173L575 177L637 160L695 145L750 116L811 101L864 81M-139 355L-74 335L-11 318L49 281L115 258L175 231L232 212L283 215L355 223L401 223L473 238L532 237L587 216L644 209L712 182L770 155L825 131L895 133M-119 434L-55 416L13 377L63 347L130 326L187 320L243 308L315 312L370 312L429 319L490 314L552 304L601 283L675 268L735 237L782 212L844 197L909 174M-86 498L-39 478L19 440L84 427L152 400L208 398L267 390L327 398L381 408L443 401L500 407L567 392L633 369L682 340L742 302L803 278L860 252L926 245M-66 546L-11 514L48 499L102 476L169 466L228 478L289 480L341 483L400 488L458 488L528 480L586 460L653 435L704 405L774 386L819 358L892 339L942 346M-46 584L11 563L72 546L129 530L191 525L245 545L314 545L361 558L428 571L485 570L553 558L613 539L666 505L733 482L784 454L843 448L913 438L969 442M-36 639L28 608L79 588L148 583L210 595L264 590L326 603L384 615L442 630L502 616L569 603L629 595L694 568L745 545L811 530L870 524L920 515L980 527M-15 707L45 683L115 659L171 651L226 667L292 670L351 679L407 680L466 689L521 669L593 644L655 633L712 606L762 593L828 578L888 579L945 599L1015 602M5 780L63 767L131 755L187 751L243 753L311 757L362 766L428 754L488 747L547 722L607 701L674 683L733 656L787 650L844 635L914 647L973 650L1026 674M-248 -69L-249 -35L-222 4L-219 51L-198 100L-191 140L-172 203L-143 280L-139 355L-119 434L-86 498L-66 546L-46 584L-36 639L-15 707L5 780M-189 -50L-187 -21L-169 16L-154 64L-134 94L-131 147L-108 197L-84 271L-74 335L-55 416L-39 478L-11 514L11 563L28 608L45 683L63 767M-127 -55L-123 -25L-107 22L-92 65L-77 87L-60 133L-40 183L-23 245L-11 318L13 377L19 440L48 499L72 546L79 588L115 659L131 755M-64 -55L-57 -32L-53 6L-39 43L-15 77L-12 112L14 150L31 203L49 281L63 347L84 427L102 476L129 530L148 583L171 651L187 751M-17 -70L5 -45L13 -15L25 27L37 63L61 90L69 135L94 176L115 258L130 326L152 400L169 466L191 525L210 595L226 667L243 753M45 -108L54 -71L67 -27L89 5L94 43L111 65L137 108L152 153L175 231L187 320L208 398L228 478L245 545L264 590L292 670L311 757M118 -139L120 -101L135 -60L152 -14L158 13L170 53L186 96L218 138L232 212L243 308L267 390L289 480L314 545L326 603L351 679L362 766M168 -170L176 -122L189 -83L205 -32L222 3L237 40L257 79L276 148L283 215L315 312L327 398L341 483L361 558L384 615L407 680L428 754M223 -184L240 -152L247 -104L263 -49L281 5L298 37L307 87L323 146L355 223L370 312L381 408L400 488L428 571L442 630L466 689L488 747M297 -199L302 -163L316 -114L331 -54L339 8L362 45L368 97L384 158L401 223L429 319L443 401L458 488L485 570L502 616L521 669L547 722M354 -218L357 -168L372 -118L382 -46L393 11L424 57L435 115L443 165L473 238L490 314L500 407L528 480L553 558L569 603L593 644L607 701M412 -211L415 -174L437 -104L451 -37L462 14L472 68L498 125L506 173L532 237L552 304L567 392L586 460L613 539L629 595L655 633L674 683M465 -200L480 -162L490 -108L500 -41L522 30L539 80L558 128L575 177L587 216L601 283L633 369L653 435L666 505L694 568L712 606L733 656M523 -197L538 -163L556 -105L562 -44L581 17L599 71L607 125L637 160L644 209L675 268L682 340L704 405L733 482L745 545L762 593L787 650M584 -209L598 -169L606 -108L619 -44L646 13L649 58L673 109L695 145L712 182L735 237L742 302L774 386L784 454L811 530L828 578L844 635M653 -206L663 -179L675 -125L690 -69L699 -2L710 45L737 95L750 116L770 155L782 212L803 278L819 358L843 448L870 524L888 579L914 647M716 -221L713 -189L723 -148L746 -95L764 -40L769 27L795 66L811 101L825 131L844 197L860 252L892 339L913 438L920 515L945 599L973 650M775 -246L780 -219L785 -169L800 -121L826 -67L833 -13L859 39L864 81L895 133L909 174L926 245L942 346L969 442L980 527L1015 602L1026 674M-248 -69L-187 -21M-64 -55L5 -45M118 -139L176 -122M297 -199L357 -168M465 -200L538 -163M653 -206L713 -189M-169 16L-92 65M13 -15L89 5M189 -83L263 -49M372 -118L451 -37M556 -105L619 -44M723 -148L800 -121M-198 100L-131 147M-15 77L61 90M158 13L237 40M339 8L424 57M522 30L599 71M699 -2L769 27M-108 197L-23 245M69 135L152 153M257 79L323 146M435 115L506 173M607 125L695 145M795 66L864 81M-139 355L-55 416M49 281L130 326M232 212L315 312M401 223L490 314M587 216L675 268M770 155L844 197M-39 478L48 499M152 400L228 478M327 398L400 488M500 407L586 460M682 340L774 386M860 252L942 346M-46 584L28 608M129 530L210 595M314 545L384 615M485 570L569 603M666 505L745 545M843 448L920 515M45 683L131 755M226 667L311 757M407 680L488 747M593 644L674 683M762 593L844 635M945 599L1026 674"/></g>
    </g>
  </svg>
  <div class="brand"><p class="brand-name">Okapi Grid</p><p class="pill">Series A · 2026</p></div>
  <h1>The grid that<br>plans itself</h1>
  <p class="tagline">Scheduling software for the people who keep the lights on.</p>
  <div class="title-stats">
    <div><p class="big">12 GW</p><p class="small">Scheduled every day</p></div>
    <div><p class="big">4.2x</p><p class="small">Faster planning</p></div>
    <div><p class="big">99.98%</p><p class="small">Platform uptime</p></div>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">The problem</p>
  <h2>Grid schedules are still built by hand.</h2>
  <p class="lede">Wind and solar change by the minute. The plan that decides which plants run tomorrow is still assembled in spreadsheets, overnight.</p>
  <div class="trio">
    <div class="card"><p class="big">6 hrs</p><h3>To build one schedule</h3><p>The median time a team spends on a day-ahead plan.</p></div>
    <div class="card"><p class="big">75%</p><h3>Plan in spreadsheets</h3><p>30 of the 40 operator teams we interviewed.</p></div>
    <div class="card"><p class="big">4x</p><h3>Rebuilt every day</h3><p>Each new weather forecast sends the team back to the start.</p></div>
  </div>
  <p class="source">Source: Okapi Grid interviews with 40 grid operator teams, 2025.</p>
</section>

<section class="slide">
  <div class="cols">
    <div>
      <p class="eyebrow">The solution</p>
      <h2>One live schedule, rebuilt every 5 minutes.</h2>
      <ul class="ticks">
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#3ef0e4"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#062a3a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><p><strong>Always current.</strong> Demand, weather and plant status feed one shared plan.</p></li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#3ef0e4"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#062a3a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><p><strong>Operators stay in charge.</strong> Every change is explained, then approved by a person.</p></li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#3ef0e4"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#062a3a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><p><strong>Runs beside existing systems.</strong> No control-room hardware is replaced.</p></li>
      </ul>
    </div>
    <div class="card race">
      <div class="race-row"><p>Manual day-ahead planning</p><p class="time">6 h 00 min</p></div>
      <div class="track"><span style="width: 100%"></span></div>
      <div class="race-row"><p>With Okapi Grid</p><p class="time">1 h 25 min</p></div>
      <div class="track"><span class="fast" style="width: 23.6%"></span></div>
      <div class="race-result"><p class="big">4.2x</p><p>faster planning, the median across our 9 customers in Q3 2026.</p></div>
    </div>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">How it works</p>
  <h2>From raw signals to an approved plan in three steps.</h2>
  <div class="flow-wrap">
    <ol class="flow">
      <li>
        <svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46" fill="#0b1240" stroke="#3ef0e4" stroke-width="2.5"/><g fill="none" stroke="#3ef0e4" stroke-width="3.5" stroke-linecap="round"><path d="M30 34L48 48L30 62M48 48H68"/></g><g fill="#ffffff"><circle cx="30" cy="34" r="5.5"/><circle cx="30" cy="62" r="5.5"/><circle cx="68" cy="48" r="5.5"/></g><circle cx="48" cy="48" r="7" fill="#3ef0e4"/></svg>
        <p class="step">Step 1</p><h3>Connect</h3><p>Read-only links to control-room, market and weather data. Live in 6 weeks.</p>
      </li>
      <li>
        <svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46" fill="#0b1240" stroke="#3ef0e4" stroke-width="2.5"/><path d="M24 58C32 58 34 36 44 36S54 60 62 54S68 40 73 38" fill="none" stroke="#3ef0e4" stroke-width="3.5" stroke-linecap="round"/><path d="M24 68H73" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/><circle cx="73" cy="38" r="5.5" fill="#ffffff"/></svg>
        <p class="step">Step 2</p><h3>Forecast</h3><p>Demand and renewable output are re-forecast for every plant every 5 minutes.</p>
      </li>
      <li>
        <svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46" fill="#0b1240" stroke="#3ef0e4" stroke-width="2.5"/><g fill="none" stroke-linecap="round" stroke-width="6"><path d="M28 36H52" stroke="#3ef0e4"/><path d="M40 48H68" stroke="#ffffff"/><path d="M28 60H46" stroke="#3ef0e4"/></g><path d="M56 61l5 5l9-10" fill="none" stroke="#3ef0e4" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <p class="step">Step 3</p><h3>Schedule</h3><p>A new dispatch plan, with the reasons for each change, ready for an operator to approve.</p>
      </li>
    </ol>
  </div>
</section>

<section class="slide">
  <div class="market">
    <div class="rings">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="198" fill="#6a48f0" fill-opacity=".3" stroke="#6a48f0" stroke-width="2"/>
        <circle cx="200" cy="262" r="136" fill="#6a48f0" fill-opacity=".6" stroke="#b9a6ff" stroke-width="2"/>
        <circle cx="200" cy="324" r="74" fill="#3ef0e4"/>
      </svg>
      <p style="top: 12%">TAM</p>
      <p style="top: 43%">SAM</p>
      <p class="som" style="top: 78%">SOM</p>
    </div>
    <div>
      <p class="eyebrow">Market size</p>
      <h2>A $2.4B market, priced per gigawatt.</h2>
      <div class="sizes">
        <div class="size"><p class="big">$2.4B</p><p><strong>Total market</strong>8,000 GW of grid capacity worldwide at $300K per GW a year.</p></div>
        <div class="size sam"><p class="big">$540M</p><p><strong>Serviceable market</strong>1,800 GW in the regions where we can sell today.</p></div>
        <div class="size som"><p class="big">$60M</p><p><strong>Our target by 2030</strong>200 GW across mid-size utilities.</p></div>
      </div>
      <p class="small" style="margin-top: 1.4cqw">Okapi Grid estimates, 2026. Capacity figures are rounded.</p>
    </div>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">Traction</p>
  <h2>ARR grew 4x in twelve months.</h2>
  <div class="traction">
    <div>
      <div class="plot">
        <svg viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pitch-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3ef0e4" stop-opacity=".5"/>
              <stop offset="1" stop-color="#3ef0e4" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <g stroke="#ffffff" stroke-opacity=".14" stroke-width="1">
            <line x1="0" y1="50" x2="600" y2="50"/>
            <line x1="0" y1="110" x2="600" y2="110"/>
            <line x1="0" y1="170" x2="600" y2="170"/>
            <line x1="0" y1="230" x2="600" y2="230"/>
          </g>
          <path d="M60 236L180 212L300 176L420 128L540 74V290H60Z" fill="url(#pitch-area)"/>
          <line x1="0" y1="290" x2="600" y2="290" stroke="#ffffff" stroke-opacity=".55" stroke-width="2"/>
          <path d="M60 236L180 212L300 176L420 128L540 74" fill="none" stroke="#3ef0e4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <g fill="#0b1240" stroke="#3ef0e4" stroke-width="3.5">
            <circle cx="60" cy="236" r="6.5"/>
            <circle cx="180" cy="212" r="6.5"/>
            <circle cx="300" cy="176" r="6.5"/>
            <circle cx="420" cy="128" r="6.5"/>
          </g>
          <circle cx="540" cy="74" r="16" fill="#3ef0e4" fill-opacity=".3"/>
          <circle cx="540" cy="74" r="8.5" fill="#ffffff"/>
        </svg>
        <p style="left: 10%; top: 65%">$0.9M</p>
        <p style="left: 30%; top: 57%">$1.3M</p>
        <p style="left: 50%; top: 45%">$1.9M</p>
        <p style="left: 70%; top: 29%">$2.7M</p>
        <p class="now" style="left: 90%; top: 7%">$3.6M</p>
      </div>
      <div class="quarters"><p>Q3 2025</p><p>Q4 2025</p><p>Q1 2026</p><p>Q2 2026</p><p>Q3 2026</p></div>
    </div>
    <div class="facts">
      <div><p class="big">9</p><p class="small">utilities live, up from 3 a year ago</p></div>
      <div><p class="big">128%</p><p class="small">net revenue retention</p></div>
      <div><p class="big">0</p><p class="small">customers lost since launch</p></div>
    </div>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">Business model</p>
  <h2>We charge for every gigawatt we schedule.</h2>
  <div class="model">
    <div class="card price"><p class="big">$300K</p><h3>per GW scheduled, per year</h3><p>An annual subscription, billed up front. Customers add capacity as they connect more plants.</p></div>
    <div class="quad">
      <div class="card"><p class="big">$400K</p><p class="small">average annual contract</p></div>
      <div class="card"><p class="big">3 years</p><p class="small">standard contract term</p></div>
      <div class="card"><p class="big">78%</p><p class="small">gross margin, Q3 2026</p></div>
      <div class="card"><p class="big">14 mo</p><p class="small">to recover the cost of winning a customer</p></div>
    </div>
  </div>
  <div class="sum"><p><strong>12 GW</strong> scheduled</p><p class="op">×</p><p><strong>$300K</strong> per GW</p><p class="op">=</p><p><strong>$3.6M</strong> ARR today</p></div>
</section>

<section class="slide">
  <p class="eyebrow">Competition</p>
  <h2>Automated and real-time. Nobody else is both.</h2>
  <div class="matrix">
      <p class="axis top">Updates in real time</p>
      <p class="axis left">Manual</p>
      <div class="cells">
        <div class="cell"><h3>Control-room add-ons</h3><p>Live data, but the plan is still edited by hand.</p></div>
        <div class="cell us"><h3>Okapi Grid</h3><p>A full schedule every 5 minutes, ready to approve.</p></div>
        <div class="cell"><h3>Spreadsheets</h3><p>Flexible and familiar. Six hours for each plan.</p></div>
        <div class="cell"><h3>In-house scripts</h3><p>Run overnight. Hard to maintain when staff move on.</p></div>
      </div>
      <p class="axis right">Automated</p>
      <p class="axis bottom">Day-ahead only</p>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">Team</p>
  <h2>A team that has run real grids.</h2>
  <div class="team">
    <div class="card person"><p class="face">AO</p><h3>Amara Okonkwo</h3><p class="role">CEO, co-founder</p><p>12 years in utility control rooms, the last 4 leading a scheduling team.</p></div>
    <div class="card person"><p class="face b">KW</p><h3>Kenji Watanabe</h3><p class="role">CTO, co-founder</p><p>Built optimization software for power markets for 10 years.</p></div>
    <div class="card person"><p class="face c">PR</p><h3>Priya Raman</h3><p class="role">Head of Product</p><p>Designed tools that control-room operators use on every shift.</p></div>
    <div class="card person"><p class="face d">MF</p><h3>Mateo Fernández</h3><p class="role">Head of Sales</p><p>Sold software to utilities across two continents for 9 years.</p></div>
  </div>
  <p class="headcount"><strong>22 people:</strong> 15 in engineering, 4 in customer deployment, 3 in sales.</p>
</section>

<section class="slide">
  <div class="ask">
    <div>
      <p class="eyebrow">The ask</p>
      <h2>We are raising</h2>
      <p class="big raise">$18M</p>
      <p class="ask-note">Series A · 24 months of runway</p>
      <p class="ask-contact"><strong>founders@example.com</strong> · example.com</p>
    </div>
    <div class="card funds">
      <p class="eyebrow">Use of funds</p>
      <div class="stack"><p style="width: 50%">50%</p><p class="b" style="width: 30%">30%</p><p class="c" style="width: 20%">20%</p></div>
      <div class="uses">
        <div class="use"><i></i><p>Engineering and forecasting research</p><p class="amt">$9.0M</p></div>
        <div class="use"><i class="b"></i><p>Sales and customer deployment</p><p class="amt">$5.4M</p></div>
        <div class="use"><i class="c"></i><p>Security, compliance and operations</p><p class="amt">$3.6M</p></div>
      </div>
      <p class="goal"><strong>Goal for the end of 2028:</strong> 40 GW scheduled, 30 utilities and $12M ARR.</p>
    </div>
  </div>
</section>

</main>
</body>
</html>
`;

  /* Slides: Business update */
  const SLIDES = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Okapi Grid Q3 2026 Business Update</title>
<style>
  :root {
    color-scheme: light;
    --paper: #ffffff;
    --ink: #0e1a2b;
    --ink-2: #4a5565;
    --mist: #eef2f6;
    --line: #d5dce5;
    --signal: #0b6e63;
    --signal-soft: #dff2ef;
    --glow: #63d6c6;
    --night: #0e1a2b;
    --night-2: #b9c3d0;
    --desk: #232830;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 20px 72px; background: var(--desk); color: var(--ink); font-family: var(--font); -webkit-font-smoothing: antialiased; }

  /* Every size uses cqw (1% of the slide width), so a slide scales as one picture and stays 16:9 at any width. The smallest text is 1.65cqw: 12px on a 730px slide. */
  .deck { display: grid; gap: 36px; max-width: 1120px; margin: 0 auto; container-type: inline-size; counter-reset: slide; }
  .slide {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    aspect-ratio: 16 / 9;
    padding: 5cqw 6cqw;
    overflow: hidden;
    overflow: clip;
    background: var(--paper);
    border-radius: 8px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, .4);
    counter-increment: slide;
  }
  .slide::after { content: counter(slide, decimal-leading-zero); position: absolute; right: 3cqw; bottom: 2.2cqw; font-size: 1.65cqw; font-weight: 700; letter-spacing: .1em; color: var(--ink-2); }
  .slide h1, .slide h2, .slide h3, .slide p, .slide ol, .slide ul, .slide dl, .slide dd { margin: 0; }
  .slide h2 { font-size: 3.7cqw; line-height: 1.15; font-weight: 800; letter-spacing: -.015em; }
  .slide h3 { font-size: 2.15cqw; line-height: 1.25; font-weight: 700; }
  .slide p { font-size: 1.8cqw; line-height: 1.5; color: var(--ink-2); }
  .slide .eyebrow { margin-bottom: 1.4cqw; font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--signal); }
  .slide .small { font-size: 1.65cqw; line-height: 1.45; }

  .slide-dark { background: var(--night); color: #fff; }
  .slide-dark::after { color: var(--night-2); }
  .slide-dark p { color: var(--night-2); }
  .slide-dark .eyebrow { color: var(--glow); }

  .slide-title { justify-content: center; }
  .slide-title > :not(.rise) { position: relative; z-index: 1; max-width: 56%; }
  .slide-title h1 { font-size: 6cqw; line-height: 1.02; font-weight: 800; letter-spacing: -.025em; }
  .slide-title .lede { margin-top: 2cqw; font-size: 2.3cqw; line-height: 1.4; color: #fff; }
  .slide-title .meta { margin-top: 4cqw; padding-top: 1.6cqw; border-top: 1px solid rgba(255, 255, 255, .25); font-size: 1.65cqw; line-height: 1.6; }
  .rise { position: absolute; top: 0; right: 0; width: 42%; height: 100%; }

  .slide-summary { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: center; gap: 5cqw; }
  .points { display: grid; padding: 0; list-style: none; counter-reset: item; }
  .points li { display: grid; grid-template-columns: 6cqw minmax(0, 1fr); column-gap: 1cqw; align-items: baseline; padding: 1.5cqw 0; border-top: 2px solid var(--ink); counter-increment: item; }
  .points li:last-child { border-bottom: 2px solid var(--ink); }
  .points li::before { content: counter(item, decimal-leading-zero); grid-row: span 2; font-size: 2.6cqw; font-weight: 800; line-height: 1; color: var(--signal); }
  .slide .points p { margin-top: .5cqw; font-size: 1.7cqw; }

  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4cqw; margin: auto 0 2cqw; }
  .stat { padding-top: 1.6cqw; border-top: 1px solid rgba(255, 255, 255, .28); }
  .slide .stat-label { font-size: 1.65cqw; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--glow); }
  .slide .stat-num { margin: 1.2cqw 0 1.4cqw; font-size: 5.2cqw; line-height: 1; font-weight: 800; letter-spacing: -.03em; color: #fff; white-space: nowrap; }
  .slide .stat p:last-child { font-size: 1.8cqw; line-height: 1.45; }

  .chart-row { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 4fr); align-items: end; gap: 5cqw; margin-top: auto; }
  .bars { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); align-items: end; gap: 2cqw; padding: 0 1cqw; border-bottom: 2px solid var(--ink); }
  .bar { display: flex; flex-direction: column; align-items: center; }
  .slide .bar-value { margin-bottom: .6cqw; font-size: 1.9cqw; line-height: 1.2; font-weight: 700; color: var(--ink); }
  .bar-fill { width: 100%; border-radius: .6cqw .6cqw 0 0; background: #b7c3d1; }
  .bar.now .bar-fill { background: var(--signal); }
  .bar-labels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 2cqw; padding: .9cqw 1cqw 0; text-align: center; }
  .slide .bar-labels p { font-size: 1.65cqw; line-height: 1.3; font-weight: 600; }
  .facts { display: grid; gap: 1.4cqw; }
  .facts div { padding-left: 1.4cqw; border-left: .4cqw solid var(--line); }
  .facts div.key { border-left-color: var(--signal); }
  .facts dt { font-size: 1.65cqw; line-height: 1.3; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); }
  .facts dd { margin-top: .2cqw; font-size: 2.5cqw; line-height: 1.2; font-weight: 800; letter-spacing: -.01em; }
  .slide .facts .small { margin-top: .6cqw; }

  .slide .phases { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2.4cqw; margin: auto 0; padding: 0; list-style: none; }
  .phase { position: relative; padding-top: 2.4cqw; border-top: .35cqw solid var(--ink); }
  .phase::before { content: ""; position: absolute; top: -.95cqw; left: 0; width: 1.5cqw; height: 1.5cqw; border-radius: 50%; background: var(--paper); border: .35cqw solid var(--ink); }
  .phase.late { border-top-color: #b45f06; }
  .phase.late::before { border-color: #b45f06; }
  .slide .when { margin-bottom: .7cqw; font-size: 1.65cqw; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--signal); }
  .slide .phase h3 { font-size: 2.4cqw; }
  .slide .phase p.small { margin-top: 1cqw; font-size: 1.8cqw; }
  .slide .due { margin-top: 1.6cqw; font-size: 1.75cqw; font-weight: 700; color: var(--ink); }
  .slide .chip { display: inline-block; margin-top: 1cqw; padding: .35cqw 1.1cqw; border-radius: 2cqw; font-size: 1.65cqw; line-height: 1.3; font-weight: 700; color: #07564d; background: var(--signal-soft); }
  .slide .chip.warn { color: #7a3f00; background: #fdebcc; }
  .slide .chip.plain { color: var(--ink-2); background: var(--mist); }

  .split { display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); align-items: stretch; gap: 3cqw; margin: auto 0 1cqw; }
  .risks { display: grid; align-content: space-between; gap: 1.8cqw; padding: 0; list-style: none; }
  .risks li { padding: 1.5cqw 0 .2cqw 1.8cqw; border-top: 1px solid var(--line); border-left: .4cqw solid #b45f06; }
  .slide .risks p { margin-top: .5cqw; font-size: 1.85cqw; line-height: 1.45; }
  .asks { display: flex; flex-direction: column; justify-content: center; padding: 3cqw 3cqw; border-radius: 1.2cqw; background: var(--night); color: #fff; }
  .asks ol { display: grid; gap: 2.2cqw; padding: 0; list-style: none; counter-reset: ask; }
  .asks li { display: grid; grid-template-columns: 3.4cqw minmax(0, 1fr); align-items: baseline; counter-increment: ask; }
  .asks li::before { content: counter(ask); font-size: 2.15cqw; font-weight: 800; color: var(--glow); }
  .slide .asks .eyebrow { color: var(--glow); }
  .slide .asks li p { margin-top: .5cqw; font-size: 1.85cqw; line-height: 1.45; color: var(--night-2); }

  .slide-next::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: .8cqw; background: var(--signal); }
  .slide .steps { display: grid; margin-top: auto; padding: 0; list-style: none; }
  .steps li { display: grid; grid-template-columns: minmax(0, 1fr) 22cqw 20cqw; column-gap: 2cqw; align-items: baseline; padding: 1.9cqw 0; border-top: 1px solid var(--line); }
  .steps li:first-child { border-top: 2px solid var(--ink); }
  .steps li:last-child { border-bottom: 2px solid var(--ink); }
  .slide .steps p { font-size: 1.95cqw; line-height: 1.35; }
  .slide .steps .date { font-weight: 700; color: var(--ink); text-align: right; }
  .slide .contact { margin-top: 2.4cqw; padding-right: 8cqw; font-size: 1.75cqw; }
  .contact strong { color: var(--ink); }

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

<section class="slide slide-dark slide-title">
  <p class="eyebrow">Okapi Grid, Inc. · Board of Directors</p>
  <h1>Q3 2026<br>Business Update</h1>
  <p class="lede">Revenue ahead of plan, strong retention, and one launch that needs a decision.</p>
  <p class="meta">October 15, 2026 · Board meeting<br>Amara Okonkwo, CEO · Mateo Fernández, CFO</p>
  <svg class="rise" viewBox="0 0 480 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="rise-fill" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#63d6c6" stop-opacity=".05"/>
        <stop offset="1" stop-color="#63d6c6" stop-opacity=".5"/>
      </linearGradient>
    </defs>
    <g stroke="#ffffff" stroke-opacity=".1" stroke-width="1">
      <line x1="60" y1="120" x2="440" y2="120"/>
      <line x1="60" y1="210" x2="440" y2="210"/>
      <line x1="60" y1="300" x2="440" y2="300"/>
      <line x1="60" y1="390" x2="440" y2="390"/>
    </g>
    <rect x="76" y="318" width="52" height="132" rx="4" fill="url(#rise-fill)"/>
    <rect x="148" y="286" width="52" height="164" rx="4" fill="url(#rise-fill)"/>
    <rect x="220" y="254" width="52" height="196" rx="4" fill="url(#rise-fill)"/>
    <rect x="292" y="206" width="52" height="244" rx="4" fill="url(#rise-fill)"/>
    <rect x="364" y="150" width="52" height="300" rx="4" fill="#63d6c6"/>
    <line x1="60" y1="450" x2="440" y2="450" stroke="#ffffff" stroke-opacity=".45" stroke-width="2"/>
    <polyline points="102,288 174,256 246,224 318,176 390,118" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="#0e1a2b" stroke="#ffffff" stroke-width="3">
      <circle cx="102" cy="288" r="6"/>
      <circle cx="174" cy="256" r="6"/>
      <circle cx="246" cy="224" r="6"/>
      <circle cx="318" cy="176" r="6"/>
    </g>
    <circle cx="390" cy="118" r="9" fill="#ffffff"/>
  </svg>
</section>

<section class="slide slide-summary">
  <div>
    <p class="eyebrow">Executive summary</p>
    <h2>Three things to take away</h2>
    <p style="margin-top: 1.6cqw">The quarter closed on September 30, 2026. Figures are unaudited.</p>
  </div>
  <ol class="points">
    <li><h3>Revenue beat the plan</h3><p>$18.4M for the quarter: 3% ahead of plan and up 24% year over year.</p></li>
    <li><h3>Customers are staying and growing</h3><p>Net revenue retention reached 112%. Expansion made up 41% of new ARR.</p></li>
    <li><h3>The EMEA launch slipped a quarter</h3><p>The Frankfurt data region moves from November to February. We need a budget decision today.</p></li>
  </ol>
</section>

<section class="slide slide-dark">
  <p class="eyebrow">Key numbers</p>
  <h2>A larger, steadier business than a year ago.</h2>
  <div class="stats">
    <div class="stat"><p class="stat-label">Revenue</p><p class="stat-num">$18.4M</p><p>Up 24% from $14.8M in Q3 2025.</p></div>
    <div class="stat"><p class="stat-label">ARR</p><p class="stat-num">$76.0M</p><p>412 customers, 38 more than last quarter.</p></div>
    <div class="stat"><p class="stat-label">Net retention</p><p class="stat-num">112%</p><p>Up from 108% a year ago.</p></div>
    <div class="stat"><p class="stat-label">Runway</p><p class="stat-num">26 mo</p><p>$41.2M in cash; net burn of $4.8M in the quarter.</p></div>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">Revenue trend</p>
  <h2>Five straight quarters of growth.</h2>
  <div class="chart-row">
    <div class="chart">
      <div class="bars">
        <div class="bar"><p class="bar-value">$14.8M</p><div class="bar-fill" style="height: 22.2cqw"></div></div>
        <div class="bar"><p class="bar-value">$15.6M</p><div class="bar-fill" style="height: 23.4cqw"></div></div>
        <div class="bar"><p class="bar-value">$16.3M</p><div class="bar-fill" style="height: 24.5cqw"></div></div>
        <div class="bar"><p class="bar-value">$17.2M</p><div class="bar-fill" style="height: 25.8cqw"></div></div>
        <div class="bar now"><p class="bar-value">$18.4M</p><div class="bar-fill" style="height: 27.6cqw"></div></div>
      </div>
      <div class="bar-labels">
        <p>Q3 2025</p><p>Q4 2025</p><p>Q1 2026</p><p>Q2 2026</p><p>Q3 2026</p>
      </div>
    </div>
    <dl class="facts">
      <div><dt>Q3 plan</dt><dd>$17.9M</dd></div>
      <div class="key"><dt>Q3 actual</dt><dd>$18.4M</dd></div>
      <div><dt>Q4 guidance</dt><dd>$19.3M – $19.7M</dd></div>
      <p class="small">Full-year 2026 outlook: $71.2M to $71.6M. Quarterly revenue in USD.</p>
    </dl>
  </div>
</section>

<section class="slide">
  <p class="eyebrow">Roadmap</p>
  <h2>The next four quarters.</h2>
  <ol class="phases">
    <li class="phase"><p class="when">Q4 2026</p><h3>Analytics 3.0</h3><p class="small">General availability for all customers.</p><p class="due">November 18, 2026</p><p class="chip">On track</p></li>
    <li class="phase late"><p class="when">Q1 2027</p><h3>Frankfurt data region</h3><p class="small">Opens EMEA sales. Moved from November.</p><p class="due">February 9, 2027</p><p class="chip warn">Delayed</p></li>
    <li class="phase"><p class="when">Q2 2027</p><h3>Utility billing links</h3><p class="small">Direct feeds from 12 utility providers.</p><p class="due">May 2027</p><p class="chip plain">Planned</p></li>
    <li class="phase"><p class="when">Q3 2027</p><h3>Second EMEA region</h3><p class="small">Depends on the budget decision today.</p><p class="due">August 2027</p><p class="chip plain">Needs approval</p></li>
  </ol>
</section>

<section class="slide">
  <p class="eyebrow">Risks and decisions</p>
  <h2>Three risks, two decisions for today.</h2>
  <div class="split">
    <ul class="risks">
      <li><h3>EMEA delay</h3><p>$2.1M of pipeline depends on the Frankfurt region opening by February 9, 2027.</p></li>
      <li><h3>Customer concentration</h3><p>Our five largest customers account for 23% of ARR. Two renew in Q1 2027.</p></li>
      <li><h3>Engineering hiring</h3><p>Nine roles are open. The average time to fill a role is 74 days.</p></li>
    </ul>
    <div class="asks">
      <p class="eyebrow">Decisions requested</p>
      <ol>
        <li><div><h3>Fund a second EMEA region</h3><p>Add $1.4M to the 2027 budget. Runway moves from 26 to 25 months.</p></div></li>
        <li><div><h3>Expand the option pool</h3><p>Add 1.5% to cover the 2027 hiring plan.</p></div></li>
      </ol>
    </div>
  </div>
</section>

<section class="slide slide-next">
  <p class="eyebrow">Next steps</p>
  <h2>What happens before we meet again.</h2>
  <ol class="steps">
    <li><p><strong>Send the revised EMEA launch plan</strong></p><p>Priya Raman, COO</p><p class="date">October 29, 2026</p></li>
    <li><p><strong>Close the Q4 forecast</strong></p><p>Mateo Fernández, CFO</p><p class="date">November 5, 2026</p></li>
    <li><p><strong>Review the Analytics 3.0 launch</strong></p><p>Kenji Watanabe, CPO</p><p class="date">November 18, 2026</p></li>
    <li><p><strong>Next board meeting</strong></p><p>Amara Okonkwo, CEO</p><p class="date">January 21, 2027</p></li>
  </ol>
  <p class="contact">Questions before then: <strong>board@okapigrid.example.com</strong> · Materials: <strong>okapigrid.example.com/board</strong></p>
</section>

</main>
</body>
</html>
`;

  /* Report: Annual report */
  const ANNUAL = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fernhollow Annual Report 2026</title>
<style>
  :root {
    color-scheme: light;
    --paper: #f4f0e4;
    --paper-2: #ebe5d5;
    --ink: #16170f;
    --ink-2: #454234;
    --ink-3: #5d5848;
    --rule: #16170f;
    --hair: #cfc7b3;
    --green: #1f4a33;
    --green-deep: #173826;
    --sage: #8fa98c;
    --stone: #b9b09d;
    --taupe: #8f8877;
    --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    --sans: "Helvetica Neue", "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, p, figure, blockquote { margin: 0; }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 0 32px; }

  .label { padding-bottom: 10px; border-bottom: 1px solid var(--rule); font-size: 13px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
  .label-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 24px; }

  .cover { padding: 56px 0 72px; }
  .cover h1 { margin: 36px 0 44px; font-family: var(--serif); font-weight: 500; font-size: clamp(44px, 9vw, 112px); line-height: 1.04; letter-spacing: -.02em; }
  .hero-number { margin-top: 12px; font-size: clamp(96px, 29vw, 420px); font-weight: 500; line-height: 1; letter-spacing: -.045em; color: var(--green); font-variant-numeric: lining-nums; }
  .hero-caption { margin-top: 8px; font-size: clamp(14px, 1.7vw, 19px); font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
  .cover-meta { display: flex; flex-wrap: wrap; gap: 6px 40px; margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--hair); font-size: 14px; color: var(--ink-3); }
  .cover-meta strong { font-weight: 500; color: var(--ink); }

  .section { padding: 72px 0; }
  .section h2 { font-family: var(--serif); font-weight: 500; font-size: clamp(30px, 4.4vw, 52px); line-height: 1.12; letter-spacing: -.015em; }
  .body-text { color: var(--ink-2); }
  .body-text + .body-text { margin-top: 16px; }

  .letter-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 24px 64px; margin-top: 40px; }
  .letter-lead { font-family: var(--serif); font-size: clamp(24px, 3vw, 34px); line-height: 1.3; letter-spacing: -.005em; color: var(--ink); }
  .signature { display: flex; align-items: center; gap: 16px; margin-top: 32px; }
  .signature svg { flex: none; width: 52px; height: 52px; }
  .signature-name { font-family: var(--serif); font-size: 21px; line-height: 1.3; }
  .signature-role { font-size: 14px; color: var(--ink-3); }

  .figures { background: var(--paper-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  .figures .wrap { padding-top: 56px; padding-bottom: 56px; }
  .figure-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 32px 0; margin-top: 36px; }
  .stat { padding: 0 24px; border-left: 1px solid var(--hair); }
  .stat:first-child { padding-left: 0; border-left: 0; }
  .stat-value { font-size: clamp(38px, 5vw, 64px); font-weight: 500; line-height: 1.05; letter-spacing: -.035em; color: var(--green); }
  .stat-name { margin-top: 10px; font-size: 13px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
  .stat-note { margin-top: 4px; font-size: 15px; line-height: 1.5; color: var(--ink-3); }

  .chapter-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px 64px; align-items: start; margin-top: 40px; }
  .chapter-number { font-size: clamp(72px, 12vw, 128px); font-weight: 500; line-height: 1; letter-spacing: -.045em; color: var(--green); }
  .chapter-caption { margin-top: 10px; font-size: 13px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
  .chapter-grid h2 { margin-bottom: 20px; }
  .chart { margin-top: 56px; }
  .chart-title { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 24px; margin-bottom: 24px; padding-bottom: 10px; border-bottom: 1px solid var(--hair); font-size: 13px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; }
  .chart-title span { color: var(--ink-3); }
  .chart-note { margin-top: 16px; font-size: 14px; color: var(--ink-3); }

  .hbars { display: grid; gap: 14px; }
  .hbar-row { display: flex; align-items: center; gap: 16px; }
  .hbar { flex: none; height: 44px; background: var(--green); }
  .hbar.is-sage { background: var(--sage); }
  .hbar.is-stone { background: var(--stone); }
  .hbar.is-taupe { background: var(--taupe); }
  .hbar.is-pale { background: #d3cbb8; }
  .hbar-label { font-size: 18px; line-height: 1.3; }
  .hbar-label strong { margin-left: 8px; font-weight: 600; color: var(--green); }

  .vchart { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0 28px; height: 320px; border-bottom: 1px solid var(--rule); }
  .vcol { display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
  .vcol-value { margin-bottom: 8px; font-size: clamp(15px, 2.2vw, 24px); font-weight: 500; line-height: 1.2; letter-spacing: -.02em; }
  .vbar { flex: none; background: var(--stone); }
  .vbar.is-sage { background: var(--sage); }
  .vbar.is-green { background: var(--green); }
  .vyears { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0 28px; margin-top: 10px; font-size: 14px; color: var(--ink-2); }

  .line-figure { padding: 28px 28px 20px; background: #faf7ee; border: 1px solid var(--hair); }
  .line-legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; margin-bottom: 12px; font-size: 15px; color: var(--ink-2); }
  .line-legend strong { font-size: 22px; font-weight: 500; letter-spacing: -.02em; color: var(--ink); }
  .line-legend .is-end strong { color: var(--green); }
  .line-plot { position: relative; }
  .line-plot svg { display: block; width: 100%; height: auto; }
  .axis { position: absolute; left: 0; font-size: 12px; line-height: 1; color: var(--ink-3); }
  .months { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); margin-top: 8px; font-size: 12px; text-align: center; color: var(--ink-2); }

  .quote { background: var(--green-deep); color: #f4f0e4; }
  .quote .wrap { padding-top: 96px; padding-bottom: 96px; }
  .quote .label { color: #dfe7d8; border-bottom-color: #6f8c78; }
  .quote blockquote { margin-top: 40px; font-family: var(--serif); font-style: italic; font-size: clamp(27px, 4.6vw, 56px); line-height: 1.24; letter-spacing: -.01em; }
  .quote-by { margin-top: 36px; padding-top: 16px; border-top: 1px solid #6f8c78; font-size: 15px; color: #dfe7d8; }
  .quote-by strong { font-weight: 600; color: #fff; }

  .regions { display: grid; gap: 22px; }
  .region-head { display: flex; justify-content: space-between; gap: 16px; font-size: 17px; }
  .region-head span { color: var(--ink-3); }
  .region-head strong { font-weight: 600; }
  .track { height: 12px; margin-top: 8px; background: #ddd5c2; }
  .track-fill { display: block; height: 100%; background: var(--green); }
  .track-fill.is-sage { background: var(--sage); }
  .track-fill.is-stone { background: var(--taupe); }

  .table-wrap { margin-top: 40px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 16px; font-variant-numeric: tabular-nums; }
  th, td { padding: 13px 0 13px 20px; text-align: right; border-bottom: 1px solid var(--hair); white-space: nowrap; }
  th:first-child, td:first-child { padding-left: 0; text-align: left; white-space: normal; }
  thead th { padding-top: 0; font-size: 13px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; border-bottom: 1px solid var(--rule); }
  tr.is-sub td:first-child { padding-left: 20px; color: var(--ink-2); }
  tr.is-total td { font-weight: 600; border-bottom: 1px solid var(--rule); }
  tr.is-ratio td { font-size: 15px; color: var(--ink-3); }
  .up { color: var(--green); font-weight: 600; }
  .table-note { margin-top: 16px; font-size: 14px; color: var(--ink-3); }

  .outlook-lead { max-width: 21em; margin-top: 40px; font-family: var(--serif); font-size: clamp(26px, 3.8vw, 44px); line-height: 1.22; letter-spacing: -.01em; }
  .priorities { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px 40px; margin-top: 56px; }
  .priority { padding-top: 16px; border-top: 1px solid var(--rule); }
  .priority-step { font-size: 13px; font-weight: 500; letter-spacing: .14em; color: var(--green); }
  .priority h3 { margin: 10px 0 8px; font-family: var(--serif); font-weight: 500; font-size: 25px; line-height: 1.2; }
  .priority p { font-size: 16px; color: var(--ink-2); }
  .priority .owner { margin-top: 14px; font-size: 14px; color: var(--ink-3); }
  .owner strong { font-weight: 600; color: var(--ink); }

  footer { border-top: 1px solid var(--rule); padding: 28px 0 48px; font-size: 14px; color: var(--ink-3); }
  footer .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 32px; }
  footer a { color: var(--green); }
  .rule-top { border-top: 1px solid var(--hair); }

  @media (max-width: 860px) {
    .letter-grid, .chapter-grid { grid-template-columns: minmax(0, 1fr); }
    .figure-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .stat:nth-child(odd) { padding-left: 0; border-left: 0; }
    .priorities { grid-template-columns: minmax(0, 1fr); gap: 28px; }
    .section { padding: 56px 0; }
    .quote .wrap { padding-top: 72px; padding-bottom: 72px; }
  }
  @media (max-width: 560px) {
    body { font-size: 16px; }
    .wrap { padding: 0 16px; }
    .cover { padding: 32px 0 48px; }
    .cover h1 { margin: 28px 0 32px; }
    .cover-meta { margin-top: 36px; }
    .stat { padding: 0 14px; }
    .hbar-row { flex-direction: column-reverse; align-items: flex-start; gap: 6px; }
    .hbar { height: 30px; }
    .hbar-label { font-size: 16px; }
    .vchart, .vyears { gap: 0 10px; }
    .vchart { height: 260px; }
    .line-figure { padding: 18px 14px 14px; }
    .region-head { font-size: 16px; }
    table { font-size: 14px; }
    th, td { padding: 11px 0 11px 12px; }
    thead th { font-size: 12px; letter-spacing: .06em; }
    tr.is-sub td:first-child { padding-left: 10px; }
    tr.is-ratio td { font-size: 14px; }
  }
</style>
<style data-he-style="fx">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-in { syntax: "<integer>"; inherits: true; initial-value: 1; }</style><style data-he-style="fx-motion">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@media (prefers-reduced-motion: no-preference) {
  @media screen {
    @supports (animation-timeline: view()) {
      @keyframes tfx-blur-rise { from { opacity: 0; transform: translateY(calc(1.25rem * var(--tfx-k, 1))); filter: blur(calc(6px * var(--tfx-k, 1))); } }
      .tfx-e-blur-rise { animation: tfx-blur-rise linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15%, 3rem + var(--tfx-t, 0) * 3rem) entry min(75% + var(--tfx-t, 0) * 25%, 16rem + var(--tfx-t, 0) * 4rem); }
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
      @keyframes tfx-tilt-up { from { opacity: calc(1 - .5 * var(--tfx-k, 1)); transform: perspective(60rem) rotateX(calc(22deg * var(--tfx-k, 1))); } }
      .tfx-s-tilt-up { transform-origin: 50% 100%; animation: tfx-tilt-up linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry calc(var(--tfx-t, 0) * min(15%, 3rem)) entry min(90% + var(--tfx-t, 0) * 10%, 18rem + var(--tfx-t, 0) * 4rem); }
      @keyframes tfx-fill { from { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(color-mix(in srgb, currentColor 35%, transparent), color-mix(in srgb, currentColor 35%, transparent)), none; background-size: 0% 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; -webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent; } to { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(color-mix(in srgb, currentColor 35%, transparent), color-mix(in srgb, currentColor 35%, transparent)), none; background-size: 100% 100%, 100% 100%, auto; background-repeat: no-repeat; background-position: 0 0; -webkit-background-clip: text, text, border-box; background-clip: text, text, border-box; -webkit-text-fill-color: transparent; } }
      .tfx-s-fill { animation: tfx-fill linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover calc(20% + var(--tfx-t, 0) * 10%) cover calc(50% + var(--tfx-t, 0) * 10%); }
    }
  }
}</style></head>
<body>
<header class="cover" id="top">
  <div class="wrap">
    <p class="label label-row"><span>Fernhollow — Annual Report</span><span>2026</span></p>
    <h1 class="tfx-e-blur-rise">A year of steadier care</h1>
    <p class="label">Overview</p>
    <p class="hero-number">41.2M</p>
    <p class="hero-caption">Appointments scheduled with Fernhollow</p>
    <p class="cover-meta"><span>Fiscal year ended <strong>December 31, 2026</strong></span><span>Published <strong>February 18, 2027</strong></span><span>Scheduling software for <strong>4,260 clinics</strong></span></p>
  </div>
</header>

<main>
<section class="section rule-top" id="letter">
  <div class="wrap">
    <p class="label">Letter from the chief executive</p>
    <div class="letter-grid">
      <p class="letter-lead tfx-s-fill">A clinic runs on its calendar. When the calendar holds, patients are seen on time, staff go home on time, and nobody spends Monday morning phoning people who did not come.</p>
      <div>
        <p class="body-text">In 2026 Fernhollow scheduled 41.2 million appointments for 4,260 clinics, 23.0% more appointments than the year before. Revenue grew 20.0% to $18.6 million, and operating income more than doubled to $2.2 million.</p>
        <p class="body-text">The number I watch most closely is a smaller one. The share of appointments that patients missed fell from 9.1% in January to 6.4% in December. Each point of that is a room that was used, a clinician who was not left waiting and a patient who got care sooner.</p>
        <p class="body-text">Thank you to the clinic teams who told us, plainly, what was not working. Most of what we shipped this year started as one of those conversations.</p>
        <div class="signature">
          <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25.5" fill="#1f4a33"></circle><path d="M26 11c7 4.4 10.4 9.8 10.4 15.3 0 4.9-3.6 8.8-8.7 9.4V40h-3.4v-4.3c-5.1-.6-8.7-4.5-8.7-9.4C15.6 20.8 19 15.4 26 11z" fill="#f4f0e4"></path><path d="M26 19v15" stroke="#1f4a33" stroke-width="2.2" stroke-linecap="round"></path></svg>
          <div>
            <p class="signature-name">Leilani Kahale</p>
            <p class="signature-role">Chief Executive Officer, Fernhollow</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="figures" id="figures" aria-label="The year in four figures">
  <div class="wrap">
    <p class="label">The year in four figures</p>
    <div class="figure-grid">
      <div class="stat">
        <p class="stat-value">$18.6M</p>
        <p class="stat-name">Revenue</p>
        <p class="stat-note">Up 20.0% from $15.5M in 2025</p>
      </div>
      <div class="stat">
        <p class="stat-value">4,260</p>
        <p class="stat-name">Clinics</p>
        <p class="stat-note">780 more than a year earlier</p>
      </div>
      <div class="stat">
        <p class="stat-value">112%</p>
        <p class="stat-name">Net revenue retention</p>
        <p class="stat-note">Existing clinics added locations</p>
      </div>
      <div class="stat">
        <p class="stat-value">99.98%</p>
        <p class="stat-name">Uptime</p>
        <p class="stat-note">Two incidents, 105 minutes in total</p>
      </div>
    </div>
  </div>
</section>

<section class="section" id="reach">
  <div class="wrap">
    <p class="label label-row"><span>01 — Reach</span><span>Appointments</span></p>
    <div class="chapter-grid">
      <div>
        <p class="chapter-number">+23%</p>
        <p class="chapter-caption">Appointments, year over year</p>
      </div>
      <div>
        <h2>More kinds of clinic now plan their week with us</h2>
        <p class="body-text">Primary care is still the largest group, at 15.6 million appointments. The fastest growth came from physiotherapy and mental health practices, where sessions repeat weekly and one missed visit disrupts a whole course of treatment. Recurring series, released in March, were built for them.</p>
      </div>
    </div>
    <figure class="chart">
      <p class="chart-title">Appointments by clinic type <span>Millions, 2026</span></p>
      <div class="hbars tfx-e-grow">
        <div class="hbar-row"><span class="hbar tfx-bar" style="width:62%"></span><span class="hbar-label">Primary care<strong>15.6M</strong></span></div>
        <div class="hbar-row"><span class="hbar is-sage tfx-bar" style="width:41%"></span><span class="hbar-label">Dental<strong>10.3M</strong></span></div>
        <div class="hbar-row"><span class="hbar is-stone tfx-bar" style="width:29%"></span><span class="hbar-label">Physiotherapy<strong>7.4M</strong></span></div>
        <div class="hbar-row"><span class="hbar is-taupe tfx-bar" style="width:19%"></span><span class="hbar-label">Mental health<strong>4.8M</strong></span></div>
        <div class="hbar-row"><span class="hbar is-pale tfx-bar" style="width:12%"></span><span class="hbar-label">Other specialties<strong>3.1M</strong></span></div>
      </div>
      <p class="chart-note">Total: 41.2 million appointments, against 33.5 million in 2025.</p>
    </figure>
  </div>
</section>

<section class="section rule-top" id="clinics">
  <div class="wrap">
    <p class="label label-row"><span>02 — Clinics</span><span>Customers</span></p>
    <div class="chapter-grid">
      <div>
        <p class="chapter-number">4,260</p>
        <p class="chapter-caption">Clinics at year end</p>
      </div>
      <div>
        <h2>Three times the clinics we served in 2022</h2>
        <p class="body-text">We added 780 clinics in 2026, a 22.4% increase and the largest in a single year. Almost half arrived as part of a group: the Teams plan lets a regional operator run every location from one calendar, and 214 groups now use it. Onboarding a new clinic took 9 days on average, down from 14.</p>
      </div>
    </div>
    <figure class="chart">
      <p class="chart-title">Clinics on Fernhollow <span>At December 31 of each year</span></p>
      <div class="vchart tfx-e-grow">
        <div class="vcol"><span class="vcol-value">1,420</span><div class="vbar tfx-bar-v" style="height:28%"></div></div>
        <div class="vcol"><span class="vcol-value">2,060</span><div class="vbar tfx-bar-v" style="height:41%"></div></div>
        <div class="vcol"><span class="vcol-value">2,790</span><div class="vbar tfx-bar-v" style="height:56%"></div></div>
        <div class="vcol"><span class="vcol-value">3,480</span><div class="vbar is-sage tfx-bar-v" style="height:69%"></div></div>
        <div class="vcol"><span class="vcol-value">4,260</span><div class="vbar is-green tfx-bar-v" style="height:85%"></div></div>
      </div>
      <div class="vyears"><span>2022</span><span>2023</span><span>2024</span><span>2025</span><span>2026</span></div>
    </figure>
  </div>
</section>

<section class="section rule-top" id="attendance">
  <div class="wrap">
    <p class="label label-row"><span>03 — Attendance</span><span>Missed appointments</span></p>
    <div class="chapter-grid">
      <div>
        <p class="chapter-number">6.4%</p>
        <p class="chapter-caption">Missed appointments, December</p>
      </div>
      <div>
        <h2>Fewer empty chairs, every month of the year</h2>
        <p class="body-text">Two changes did most of the work. Reminders now go out in the language the patient chose, with one tap to rebook. And when someone cancels, the slot is offered to the waiting list within a minute. The missed-appointment rate fell in all twelve months, by 2.7 points over the year.</p>
      </div>
    </div>
    <figure class="chart line-figure tfx-s-tilt-up">
      <p class="chart-title">Missed-appointment rate <span>Monthly, 2026</span></p>
      <p class="line-legend"><span>January <strong>9.1%</strong></span><span class="is-end">December <strong>6.4%</strong></span></p>
      <div class="line-plot">
        <svg viewBox="0 0 720 300" role="img" aria-label="Missed-appointment rate by month in 2026, in percent: 9.1, 8.9, 8.6, 8.4, 8.0, 7.8, 7.5, 7.3, 7.0, 6.8, 6.6, 6.4">
          <g stroke="#cfc7b3" stroke-width="1" vector-effect="non-scaling-stroke">
            <line x1="0" y1="40" x2="720" y2="40" vector-effect="non-scaling-stroke"></line>
            <line x1="0" y1="128" x2="720" y2="128" vector-effect="non-scaling-stroke"></line>
            <line x1="0" y1="216" x2="720" y2="216" vector-effect="non-scaling-stroke"></line>
          </g>
          <line x1="0" y1="299" x2="720" y2="299" stroke="#16170f" stroke-width="1" vector-effect="non-scaling-stroke"></line>
          <polygon points="30,79.6 90,88.4 150,101.6 210,110.4 270,128 330,136.8 390,150 450,158.8 510,172 570,180.8 630,189.6 690,198.4 690,299 30,299" fill="#8fa98c" fill-opacity=".28"></polygon>
          <polyline points="30,79.6 90,88.4 150,101.6 210,110.4 270,128 330,136.8 390,150 450,158.8 510,172 570,180.8 630,189.6 690,198.4" fill="none" stroke="#1f4a33" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline>
          <g fill="#faf7ee" stroke="#1f4a33" stroke-width="2">
            <circle cx="30" cy="79.6" r="5" vector-effect="non-scaling-stroke"></circle>
            <circle cx="210" cy="110.4" r="4" vector-effect="non-scaling-stroke"></circle>
            <circle cx="390" cy="150" r="4" vector-effect="non-scaling-stroke"></circle>
            <circle cx="570" cy="180.8" r="4" vector-effect="non-scaling-stroke"></circle>
          </g>
          <circle cx="690" cy="198.4" r="8" fill="#1f4a33"></circle>
        </svg>
        <span class="axis" style="top:6%">10%</span>
        <span class="axis" style="top:35.5%">8%</span>
        <span class="axis" style="top:65%">6%</span>
      </div>
      <div class="months"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div>
    </figure>
  </div>
</section>

<section class="quote" id="field-notes">
  <div class="wrap">
    <p class="label">Field notes</p>
    <blockquote class="tfx-e-blur-rise">“We used to start every Monday by calling the people who had not turned up. Now the waiting list fills the gap before we have noticed it.”</blockquote>
    <p class="quote-by"><strong>Nomvula Dlamini</strong> · Practice Manager, Riverbend Family Clinic</p>
  </div>
</section>

<section class="section" id="revenue">
  <div class="wrap">
    <p class="label label-row"><span>04 — Revenue</span><span>Regions</span></p>
    <div class="chapter-grid">
      <div>
        <p class="chapter-number">$18.6M</p>
        <p class="chapter-caption">Revenue, up 20.0%</p>
      </div>
      <div>
        <h2>Growth in every region, led by Asia Pacific</h2>
        <p class="body-text">North America remains our largest market at $8.18 million. Asia Pacific grew fastest after the Singapore data region opened in August, which let clinics with local data-residency rules sign up for the first time. Latin America passed $1.7 million once billing in local currency went live in Brazil.</p>
      </div>
    </div>
    <figure class="chart">
      <p class="chart-title">Revenue by region <span>USD millions and share of total</span></p>
      <div class="regions tfx-e-grow">
        <div class="region">
          <p class="region-head"><strong>North America</strong><span>$8.18M · 44.0%</span></p>
          <div class="track"><span class="track-fill tfx-bar" style="width:88%"></span></div>
        </div>
        <div class="region">
          <p class="region-head"><strong>Europe, Middle East and Africa</strong><span>$5.36M · 28.8%</span></p>
          <div class="track"><span class="track-fill tfx-bar" style="width:57.6%"></span></div>
        </div>
        <div class="region">
          <p class="region-head"><strong>Asia Pacific</strong><span>$3.32M · 17.8%</span></p>
          <div class="track"><span class="track-fill is-sage tfx-bar" style="width:35.6%"></span></div>
        </div>
        <div class="region">
          <p class="region-head"><strong>Latin America</strong><span>$1.74M · 9.4%</span></p>
          <div class="track"><span class="track-fill is-stone tfx-bar" style="width:18.8%"></span></div>
        </div>
      </div>
      <p class="chart-note">Total: $18.60 million. Bar length is twice the share of total revenue.</p>
    </figure>
  </div>
</section>

<section class="section rule-top" id="financials">
  <div class="wrap">
    <p class="label label-row"><span>Financial summary</span><span>USD thousands</span></p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Year ended December 31</th><th>2026</th><th>2025</th><th>Change</th></tr>
        </thead>
        <tbody>
          <tr><td>Revenue</td><td>18,600</td><td>15,500</td><td class="up">+20.0%</td></tr>
          <tr><td>Cost of revenue</td><td>5,210</td><td>4,495</td><td>+15.9%</td></tr>
          <tr class="is-total"><td>Gross profit</td><td>13,390</td><td>11,005</td><td class="up">+21.7%</td></tr>
          <tr class="is-sub"><td>Research and development</td><td>5,020</td><td>4,340</td><td>+15.7%</td></tr>
          <tr class="is-sub"><td>Sales and marketing</td><td>4,280</td><td>3,875</td><td>+10.5%</td></tr>
          <tr class="is-sub"><td>General and administrative</td><td>1,860</td><td>1,705</td><td>+9.1%</td></tr>
          <tr><td>Total operating expenses</td><td>11,160</td><td>9,920</td><td>+12.5%</td></tr>
          <tr class="is-total"><td>Operating income</td><td>2,230</td><td>1,085</td><td class="up">+105.5%</td></tr>
          <tr class="is-ratio"><td>Gross margin</td><td>72.0%</td><td>71.0%</td><td>+1.0 pts</td></tr>
          <tr class="is-ratio"><td>Operating margin</td><td>12.0%</td><td>7.0%</td><td>+5.0 pts</td></tr>
          <tr class="is-ratio"><td>Cash and equivalents at year end</td><td>9,840</td><td>7,310</td><td>+34.6%</td></tr>
        </tbody>
      </table>
    </div>
    <p class="table-note">Prepared by Tomasz Wieczorek, Chief Financial Officer. Figures are unaudited and rounded to the nearest $5 thousand.</p>
  </div>
</section>

<section class="section rule-top" id="outlook">
  <div class="wrap">
    <p class="label label-row"><span>Outlook</span><span>2027</span></p>
    <p class="outlook-lead tfx-s-fill">In 2027 we expect revenue of $22.0 to $22.8 million, and a missed-appointment rate below 6% by December.</p>
    <div class="priorities">
      <article class="priority">
        <p class="priority-step">01</p>
        <h3>Shared calendars for hospital outpatient units</h3>
        <p>Pilot with 6 outpatient departments, so that referrals from our clinics can be booked without a phone call.</p>
        <p class="owner"><strong>Arjun Mehta</strong> · pilot starts March 15, 2027</p>
      </article>
      <article class="priority">
        <p class="priority-step">02</p>
        <h3>A second data region in Europe</h3>
        <p>Open a Frankfurt region alongside Dublin, and move German and Austrian clinics to it at no cost to them.</p>
        <p class="owner"><strong>Camille Fournier</strong> · due June 30, 2027</p>
      </article>
      <article class="priority">
        <p class="priority-step">03</p>
        <h3>Support in local business hours</h3>
        <p>Hire 9 support specialists in Singapore and São Paulo, with a first reply inside one hour in every region.</p>
        <p class="owner"><strong>Hoang Thi Mai</strong> · due September 30, 2027</p>
      </article>
    </div>
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <p>© 2027 Fernhollow, Inc. Fernhollow is a fictional company; the people and clinics named here are invented.</p>
    <p>Investor contact: <a href="mailto:investors@example.com">investors@example.com</a> · 555-0142</p>
  </div>
</footer>


</body></html>
`;

  /* Report: Traceable financial report */
  const TRACEABLE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brightpine Holdings — Quarterly Financial Report</title>
<style>
  :root { --ink: #0f1f3d; --muted: #4a5873; --line: #dfe4ec; --line-strong: #0f1f3d; --accent: #0f7a4d; --accent-soft: #e6f4ec; --paper: #ffffff; --tactile-chart-surface: #ffffff; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.6 "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; color: var(--ink); background: var(--paper); -webkit-text-size-adjust: 100%; }
  main { max-width: 960px; margin: 0 auto; padding: 56px 32px 64px; }

  .masthead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 32px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
  .brand { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
  .brand svg { flex: none; width: 30px; height: 34px; color: var(--accent); }
  h1 { margin: 0; font-size: 22px; font-weight: 500; line-height: 1.3; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 28px; margin: 16px 0 32px; padding: 0; list-style: none; font-size: 14px; color: var(--muted); }
  .meta b { font-weight: 600; color: var(--ink); }

  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 0 0 36px; }
  .card { padding: 20px 22px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); }
  .card .label { margin: 0 0 6px; font-size: 15px; font-weight: 500; color: var(--muted); }
  .card .value { margin: 0; font-size: 34px; font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .card .change { margin: 8px 0 0; font-size: 14px; color: var(--muted); }
  .up { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }

  section { margin: 0 0 40px; }
  h2.section { margin: 0 0 12px; font-size: 18px; font-weight: 700; }
  p { margin: 0 0 14px; }
  .prose p { max-width: 760px; font-size: 17px; }
  .figure-inline { padding: 1px 6px; border-radius: 5px; background: var(--accent-soft); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

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
  table.wide { min-width: 520px; }

  .charts { display: grid; gap: 24px; }
  figure { margin: 0; min-width: 0; padding: 20px 22px 16px; border: 1px solid var(--line); border-radius: 10px; }
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
      <svg viewBox="0 0 30 34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M15 2 8 11h4l-6 8h5l-7 8h22l-7-8h5l-6-8h4zM15 27v5"/></svg>
      <span data-fact="2026Q3.xlsx/Income/A1">Brightpine Holdings</span>
    </div>
    <h1><span data-fact="2026Q3.xlsx/Income/D9">Q3 2026</span> Financial Report</h1>
  </header>

  <ul class="meta">
    <li><b>Statement</b> <span data-fact="2026Q3.xlsx/Income/B3">Consolidated statement of income</span></li>
    <li><b>Period ended</b> <span data-fact="2026Q3.xlsx/Income/B2">2026-09-30</span></li>
    <li><b>Currency</b> <span data-fact="2026Q3.xlsx/Income/B4">USD</span></li>
    <li><b>Prepared by</b> <span data-fact="2026Q3.xlsx/Income/B6">Finance Operations</span></li>
  </ul>

  <div class="cards">
    <div class="card">
      <p class="label">Consolidated revenue</p>
      <p class="value">$<span data-fact="2026Q3.xlsx/Summary/B2" data-fact-scale="1e-6" data-fact-digits="1">482.0</span>M</p>
      <p class="change"><span class="up"><span data-fact="2026Q3.xlsx/Summary/C2" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+14.2</span>%</span> year over year</p>
    </div>
    <div class="card">
      <p class="label">Gross profit</p>
      <p class="value">$<span data-fact="2026Q3.xlsx/Summary/B3" data-fact-scale="1e-6" data-fact-digits="1">197.6</span>M</p>
      <p class="change"><span class="up"><span data-fact="2026Q3.xlsx/Summary/C3" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+12.5</span>%</span> year over year</p>
    </div>
    <div class="card">
      <p class="label">Operating income</p>
      <p class="value">$<span data-fact="2026Q3.xlsx/Summary/B4" data-fact-scale="1e-6" data-fact-digits="1">128.4</span>M</p>
      <p class="change"><span class="up"><span data-fact="2026Q3.xlsx/Summary/C4" data-fact-scale="100" data-fact-digits="1" data-fact-sign="always">+8.6</span>%</span> year over year</p>
    </div>
  </div>

  <section class="prose">
    <h2 class="section">Quarter in brief</h2>
    <p>During the third quarter, Brightpine Holdings kept its momentum across all four operating segments. Total consolidated revenue reached <span class="figure-inline">$<span data-fact="2026Q3.xlsx/Income/D14">482,000,000</span></span>, up <span data-fact="2026Q3.xlsx/Income/E14" data-fact-scale="100" data-fact-digits="1">14.2</span>% from <span data-fact="2026Q3.xlsx/Income/B9">Q3 2025</span>, led by Enterprise Solutions at $<span data-fact="2026Q3.xlsx/Income/D10" data-fact-scale="1e-6" data-fact-digits="1">214.6</span>M.</p>
    <p>Gross profit rose to $<span data-fact="2026Q3.xlsx/Income/D16" data-fact-scale="1e-6" data-fact-digits="1">197.6</span>M, a gross margin of <span data-fact="2026Q3.xlsx/Income/D20">41.0%</span>. Operating income was $<span data-fact="2026Q3.xlsx/Income/D18" data-fact-scale="1e-6" data-fact-digits="1">128.4</span>M and the operating margin was <span data-fact="2026Q3.xlsx/Income/D21">26.6%</span>, compared with <span data-fact="2026Q3.xlsx/Income/B21">28.0%</span> a year earlier, as the company continued to invest in product development and regional sales teams.</p>
  </section>

  <section>
    <h2 class="section">Revenue by operating segment</h2>
    <div class="table-wrap">
      <table>
        <caption>USD millions</caption>
        <thead>
          <tr><th scope="col">Operating segment</th><th scope="col" data-fact="2026Q3.xlsx/Income/B9">Q3 2025</th><th scope="col" data-fact="2026Q3.xlsx/Income/D9">Q3 2026</th><th scope="col">YoY growth</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row" data-fact="2026Q3.xlsx/Income/A10">Enterprise Solutions</th><td data-fact="2026Q3.xlsx/Income/B10" data-fact-scale="1e-6" data-fact-digits="1">181.4</td><td data-fact="2026Q3.xlsx/Income/D10" data-fact-scale="1e-6" data-fact-digits="1">214.6</td><td class="up" data-fact="2026Q3.xlsx/Income/E10">18.3%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/Income/A11">Commercial Services</th><td data-fact="2026Q3.xlsx/Income/B11" data-fact-scale="1e-6" data-fact-digits="1">118.5</td><td data-fact="2026Q3.xlsx/Income/D11" data-fact-scale="1e-6" data-fact-digits="1">128.7</td><td class="up" data-fact="2026Q3.xlsx/Income/E11">8.6%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/Income/A12">Infrastructure</th><td data-fact="2026Q3.xlsx/Income/B12" data-fact-scale="1e-6" data-fact-digits="1">84.9</td><td data-fact="2026Q3.xlsx/Income/D12" data-fact-scale="1e-6" data-fact-digits="1">94.2</td><td class="up" data-fact="2026Q3.xlsx/Income/E12">11.0%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/Income/A13">Advisory</th><td data-fact="2026Q3.xlsx/Income/B13" data-fact-scale="1e-6" data-fact-digits="1">37.2</td><td data-fact="2026Q3.xlsx/Income/D13" data-fact-scale="1e-6" data-fact-digits="1">44.5</td><td class="up" data-fact="2026Q3.xlsx/Income/E13">19.6%</td></tr>
          <tr class="total"><th scope="row" data-fact="2026Q3.xlsx/Income/A14">Total revenue</th><td data-fact="2026Q3.xlsx/Income/B14" data-fact-scale="1e-6" data-fact-digits="1">422.0</td><td data-fact="2026Q3.xlsx/Income/D14" data-fact-scale="1e-6" data-fact-digits="1">482.0</td><td class="up" data-fact="2026Q3.xlsx/Income/E14">14.2%</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2 class="section">Summary of operations</h2>
    <div class="table-wrap">
      <table class="wide">
        <caption>USD millions, except margins</caption>
        <thead>
          <tr><th scope="col">Line item</th><th scope="col" data-fact="2026Q3.xlsx/Income/B9">Q3 2025</th><th scope="col" data-fact="2026Q3.xlsx/Income/C9">Q2 2026</th><th scope="col" data-fact="2026Q3.xlsx/Income/D9">Q3 2026</th><th scope="col">YoY growth</th></tr>
        </thead>
        <tbody>
          <tr class="sub"><th scope="row" data-fact="2026Q3.xlsx/Income/A14">Total revenue</th><td data-fact="2026Q3.xlsx/Income/B14" data-fact-scale="1e-6" data-fact-digits="1">422.0</td><td data-fact="2026Q3.xlsx/Income/C14" data-fact-scale="1e-6" data-fact-digits="1">464.4</td><td data-fact="2026Q3.xlsx/Income/D14" data-fact-scale="1e-6" data-fact-digits="1">482.0</td><td data-fact="2026Q3.xlsx/Income/E14">14.2%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/Income/A15">Cost of revenue</th><td data-fact="2026Q3.xlsx/Income/B15" data-fact-scale="1e-6" data-fact-digits="1">246.3</td><td data-fact="2026Q3.xlsx/Income/C15" data-fact-scale="1e-6" data-fact-digits="1">274.9</td><td data-fact="2026Q3.xlsx/Income/D15" data-fact-scale="1e-6" data-fact-digits="1">284.4</td><td data-fact="2026Q3.xlsx/Income/E15">15.5%</td></tr>
          <tr class="sub"><th scope="row" data-fact="2026Q3.xlsx/Income/A16">Gross profit</th><td data-fact="2026Q3.xlsx/Income/B16" data-fact-scale="1e-6" data-fact-digits="1">175.7</td><td data-fact="2026Q3.xlsx/Income/C16" data-fact-scale="1e-6" data-fact-digits="1">189.5</td><td data-fact="2026Q3.xlsx/Income/D16" data-fact-scale="1e-6" data-fact-digits="1">197.6</td><td data-fact="2026Q3.xlsx/Income/E16">12.5%</td></tr>
          <tr><th scope="row" data-fact="2026Q3.xlsx/Income/A17">Operating expenses</th><td data-fact="2026Q3.xlsx/Income/B17" data-fact-scale="1e-6" data-fact-digits="1">57.5</td><td data-fact="2026Q3.xlsx/Income/C17" data-fact-scale="1e-6" data-fact-digits="1">66.7</td><td data-fact="2026Q3.xlsx/Income/D17" data-fact-scale="1e-6" data-fact-digits="1">69.2</td><td data-fact="2026Q3.xlsx/Income/E17">20.3%</td></tr>
          <tr class="total"><th scope="row" data-fact="2026Q3.xlsx/Income/A18">Operating income</th><td data-fact="2026Q3.xlsx/Income/B18" data-fact-scale="1e-6" data-fact-digits="1">118.2</td><td data-fact="2026Q3.xlsx/Income/C18" data-fact-scale="1e-6" data-fact-digits="1">122.8</td><td data-fact="2026Q3.xlsx/Income/D18" data-fact-scale="1e-6" data-fact-digits="1">128.4</td><td data-fact="2026Q3.xlsx/Income/E18">8.6%</td></tr>
          <tr class="ratio"><th scope="row" data-fact="2026Q3.xlsx/Income/A20">Gross margin</th><td data-fact="2026Q3.xlsx/Income/B20">41.6%</td><td data-fact="2026Q3.xlsx/Income/C20">40.8%</td><td data-fact="2026Q3.xlsx/Income/D20">41.0%</td><td></td></tr>
          <tr class="ratio"><th scope="row" data-fact="2026Q3.xlsx/Income/A21">Operating margin</th><td data-fact="2026Q3.xlsx/Income/B21">28.0%</td><td data-fact="2026Q3.xlsx/Income/C21">26.4%</td><td data-fact="2026Q3.xlsx/Income/D21">26.6%</td><td></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="charts">
    <figure>
      <figcaption>Revenue by operating segment, <span data-fact="2026Q3.xlsx/Income/D9">Q3 2026</span> <small>USD millions</small></figcaption>
      <div class="chart-scroll">
        <div data-chart="bar"
             data-chart-facts="2026Q3.xlsx/Income/D10:D13"
             data-chart-labels="2026Q3.xlsx/Income/A10:A13"
             data-chart-scale="1e-6" data-chart-digits="1">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-label="Bar chart" data-chart-drawn="bar" style="max-width:100%;height:auto" font-family="inherit" font-size="12" fill="currentColor"><line x1="33" x2="628" y1="328" y2="328" stroke="currentColor" stroke-opacity="0.45"/><text x="25" y="332" text-anchor="end" fill-opacity="0.7">0</text><line x1="33" x2="628" y1="266.4" y2="266.4" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="270.4" text-anchor="end" fill-opacity="0.7">50</text><line x1="33" x2="628" y1="204.8" y2="204.8" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="208.8" text-anchor="end" fill-opacity="0.7">100</text><line x1="33" x2="628" y1="143.2" y2="143.2" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="147.2" text-anchor="end" fill-opacity="0.7">150</text><line x1="33" x2="628" y1="81.6" y2="81.6" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="85.6" text-anchor="end" fill-opacity="0.7">200</text><line x1="33" x2="628" y1="20" y2="20" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="24" text-anchor="end" fill-opacity="0.7">250</text><text x="107.38" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Income/A10">Enterprise Solutions</text><text x="256.13" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Income/A11">Commercial Services</text><text x="404.88" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Income/A12">Infrastructure</text><text x="553.63" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Income/A13">Advisory</text><path d="M95.38 328V67.61Q95.38 63.61 99.38 63.61H115.38Q119.38 63.61 119.38 67.61V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/Income/D10"><title>Enterprise Solutions: 214.6</title></path><text x="107.38" y="57.61" text-anchor="middle" data-fact="2026Q3.xlsx/Income/D10" data-fact-scale="1e-6" data-fact-digits="1">214.6</text><path d="M244.13 328V173.44Q244.13 169.44 248.13 169.44H264.13Q268.13 169.44 268.13 173.44V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/Income/D11"><title>Commercial Services: 128.7</title></path><text x="256.13" y="163.44" text-anchor="middle" data-fact="2026Q3.xlsx/Income/D11" data-fact-scale="1e-6" data-fact-digits="1">128.7</text><path d="M392.88 328V215.95Q392.88 211.95 396.88 211.95H412.88Q416.88 211.95 416.88 215.95V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/Income/D12"><title>Infrastructure: 94.2</title></path><text x="404.88" y="205.95" text-anchor="middle" data-fact="2026Q3.xlsx/Income/D12" data-fact-scale="1e-6" data-fact-digits="1">94.2</text><path d="M541.63 328V277.18Q541.63 273.18 545.63 273.18H561.63Q565.63 273.18 565.63 277.18V328Z" fill="#2a78d6" data-chart-fact="2026Q3.xlsx/Income/D13"><title>Advisory: 44.5</title></path><text x="553.63" y="267.18" text-anchor="middle" data-fact="2026Q3.xlsx/Income/D13" data-fact-scale="1e-6" data-fact-digits="1">44.5</text></svg>
</div>
      </div>
    </figure>
    <figure>
      <figcaption>Consolidated revenue, last five quarters <small>USD millions</small></figcaption>
      <div class="chart-scroll">
        <div data-chart="line"
             data-chart-facts="2026Q3.xlsx/Quarters/B2:B6"
             data-chart-labels="2026Q3.xlsx/Quarters/A2:A6"
             data-chart-scale="1e-6" data-chart-digits="1">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-label="Line chart" data-chart-drawn="line" style="max-width:100%;height:auto" font-family="inherit" font-size="12" fill="currentColor"><line x1="33" x2="628" y1="328" y2="328" stroke="currentColor" stroke-opacity="0.45"/><text x="25" y="332" text-anchor="end" fill-opacity="0.7">0</text><line x1="33" x2="628" y1="266.4" y2="266.4" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="270.4" text-anchor="end" fill-opacity="0.7">100</text><line x1="33" x2="628" y1="204.8" y2="204.8" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="208.8" text-anchor="end" fill-opacity="0.7">200</text><line x1="33" x2="628" y1="143.2" y2="143.2" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="147.2" text-anchor="end" fill-opacity="0.7">300</text><line x1="33" x2="628" y1="81.6" y2="81.6" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="85.6" text-anchor="end" fill-opacity="0.7">400</text><line x1="33" x2="628" y1="20" y2="20" stroke="currentColor" stroke-opacity="0.12"/><text x="25" y="24" text-anchor="end" fill-opacity="0.7">500</text><text x="92.5" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Quarters/A2">Q3 2025</text><text x="211.5" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Quarters/A3">Q4 2025</text><text x="330.5" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Quarters/A4">Q1 2026</text><text x="449.5" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Quarters/A5">Q2 2026</text><text x="568.5" y="350" text-anchor="middle" fill-opacity="0.7" data-fact="2026Q3.xlsx/Quarters/A6">Q3 2026</text><path d="M92.5 68.05L211.5 57.82L330.5 50.86L449.5 41.93L568.5 31.09" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="92.5" cy="68.05" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/Quarters/B2"><title>Q3 2025: 422.0</title></circle><text x="92.5" y="58.05" text-anchor="middle" data-fact="2026Q3.xlsx/Quarters/B2" data-fact-scale="1e-6" data-fact-digits="1">422.0</text><circle cx="211.5" cy="57.82" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/Quarters/B3"><title>Q4 2025: 438.6</title></circle><text x="211.5" y="47.82" text-anchor="middle" data-fact="2026Q3.xlsx/Quarters/B3" data-fact-scale="1e-6" data-fact-digits="1">438.6</text><circle cx="330.5" cy="50.86" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/Quarters/B4"><title>Q1 2026: 449.9</title></circle><text x="330.5" y="40.86" text-anchor="middle" data-fact="2026Q3.xlsx/Quarters/B4" data-fact-scale="1e-6" data-fact-digits="1">449.9</text><circle cx="449.5" cy="41.93" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/Quarters/B5"><title>Q2 2026: 464.4</title></circle><text x="449.5" y="31.93" text-anchor="middle" data-fact="2026Q3.xlsx/Quarters/B5" data-fact-scale="1e-6" data-fact-digits="1">464.4</text><circle cx="568.5" cy="31.09" r="4" fill="#2a78d6" style="stroke:var(--tactile-chart-surface,#fff)" stroke-width="2" data-chart-fact="2026Q3.xlsx/Quarters/B6"><title>Q3 2026: 482.0</title></circle><text x="568.5" y="21.09" text-anchor="middle" data-fact="2026Q3.xlsx/Quarters/B6" data-fact-scale="1e-6" data-fact-digits="1">482.0</text></svg>
</div>
      </div>
    </figure>
  </section>

  <section class="notes">
    <h2>Notes</h2>
    <ul>
      <li>Amounts are in US dollars. Tables and charts show millions, rounded to one decimal place.</li>
      <li>YoY growth compares the quarter with the same quarter of the prior year.</li>
      <li>Gross margin is gross profit divided by total revenue. Operating margin is operating income divided by total revenue.</li>
      <li>Segment revenue is shown after eliminating sales between segments.</li>
    </ul>
    <p>Questions about this report: investors@example.com</p>
  </section>

  <footer>
    <p>Every figure on this page is filled in by tactile-ingest from the source workbook. Click a number in the editor to see the cell it comes from.</p>
    <p data-fact-none="File name of the source workbook">Source workbook: 2026Q3.xlsx</p>
  </footer>
</main>
<script type="application/json" id="tactile-provenance">
{
 "tactileProvenance": 1,
 "tool": {
  "name": "tactile-ingest",
  "version": "0.1.0"
 },
 "filledAt": "2026-11-13T03:42:56Z",
 "sources": [
  {
   "file": "2026Q3.xlsx",
   "sha256": "544a69189a28ed5d2a8c76071976c49039bc9c63b0e3bff7ee1de9c87fbddd75",
   "bytes": 12764
  }
 ],
 "facts": {
  "2026Q3.xlsx/Income/A1": {
   "type": "text",
   "value": "Brightpine Holdings",
   "text": "Brightpine Holdings"
  },
  "2026Q3.xlsx/Income/B2": {
   "type": "date",
   "value": "2026-09-30",
   "text": "2026-09-30",
   "labels": {
    "row": "Period ended"
   }
  },
  "2026Q3.xlsx/Income/B3": {
   "type": "text",
   "value": "Consolidated statement of income",
   "text": "Consolidated statement of income"
  },
  "2026Q3.xlsx/Income/B4": {
   "type": "text",
   "value": "USD",
   "text": "USD"
  },
  "2026Q3.xlsx/Income/B6": {
   "type": "text",
   "value": "Finance Operations",
   "text": "Finance Operations"
  },
  "2026Q3.xlsx/Income/B9": {
   "type": "text",
   "value": "Q3 2025",
   "text": "Q3 2025"
  },
  "2026Q3.xlsx/Income/C9": {
   "type": "text",
   "value": "Q2 2026",
   "text": "Q2 2026"
  },
  "2026Q3.xlsx/Income/D9": {
   "type": "text",
   "value": "Q3 2026",
   "text": "Q3 2026"
  },
  "2026Q3.xlsx/Income/A10": {
   "type": "text",
   "value": "Enterprise Solutions",
   "text": "Enterprise Solutions"
  },
  "2026Q3.xlsx/Income/B10": {
   "type": "number",
   "value": 181400000,
   "text": "181,400,000",
   "labels": {
    "row": "Enterprise Solutions",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/D10": {
   "type": "number",
   "value": 214600000,
   "text": "214,600,000",
   "labels": {
    "row": "Enterprise Solutions",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E10": {
   "type": "number",
   "value": 0.18302094818081582,
   "text": "18.3%",
   "formula": "D10/B10-1",
   "labels": {
    "row": "Enterprise Solutions",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A11": {
   "type": "text",
   "value": "Commercial Services",
   "text": "Commercial Services"
  },
  "2026Q3.xlsx/Income/B11": {
   "type": "number",
   "value": 118500000,
   "text": "118,500,000",
   "labels": {
    "row": "Commercial Services",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/D11": {
   "type": "number",
   "value": 128700000,
   "text": "128,700,000",
   "labels": {
    "row": "Commercial Services",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E11": {
   "type": "number",
   "value": 0.08607594936708862,
   "text": "8.6%",
   "formula": "D11/B11-1",
   "labels": {
    "row": "Commercial Services",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A12": {
   "type": "text",
   "value": "Infrastructure",
   "text": "Infrastructure"
  },
  "2026Q3.xlsx/Income/B12": {
   "type": "number",
   "value": 84900000,
   "text": "84,900,000",
   "labels": {
    "row": "Infrastructure",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/D12": {
   "type": "number",
   "value": 94200000,
   "text": "94,200,000",
   "labels": {
    "row": "Infrastructure",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E12": {
   "type": "number",
   "value": 0.10954063604240272,
   "text": "11.0%",
   "formula": "D12/B12-1",
   "labels": {
    "row": "Infrastructure",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A13": {
   "type": "text",
   "value": "Advisory",
   "text": "Advisory"
  },
  "2026Q3.xlsx/Income/B13": {
   "type": "number",
   "value": 37200000,
   "text": "37,200,000",
   "labels": {
    "row": "Advisory",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/D13": {
   "type": "number",
   "value": 44500000,
   "text": "44,500,000",
   "labels": {
    "row": "Advisory",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E13": {
   "type": "number",
   "value": 0.196236559139785,
   "text": "19.6%",
   "formula": "D13/B13-1",
   "labels": {
    "row": "Advisory",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A14": {
   "type": "text",
   "value": "Total revenue",
   "text": "Total revenue"
  },
  "2026Q3.xlsx/Income/B14": {
   "type": "number",
   "value": 422000000,
   "text": "422,000,000",
   "formula": "SUM(B10:B13)",
   "labels": {
    "row": "Total revenue",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C14": {
   "type": "number",
   "value": 464400000,
   "text": "464,400,000",
   "formula": "SUM(C10:C13)",
   "labels": {
    "row": "Total revenue",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D14": {
   "type": "number",
   "value": 482000000,
   "text": "482,000,000",
   "formula": "SUM(D10:D13)",
   "labels": {
    "row": "Total revenue",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E14": {
   "type": "number",
   "value": 0.14218009478672977,
   "text": "14.2%",
   "formula": "D14/B14-1",
   "labels": {
    "row": "Total revenue",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A15": {
   "type": "text",
   "value": "Cost of revenue",
   "text": "Cost of revenue"
  },
  "2026Q3.xlsx/Income/B15": {
   "type": "number",
   "value": 246300000,
   "text": "246,300,000",
   "labels": {
    "row": "Cost of revenue",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C15": {
   "type": "number",
   "value": 274900000,
   "text": "274,900,000",
   "labels": {
    "row": "Cost of revenue",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D15": {
   "type": "number",
   "value": 284400000,
   "text": "284,400,000",
   "labels": {
    "row": "Cost of revenue",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E15": {
   "type": "number",
   "value": 0.15468940316686974,
   "text": "15.5%",
   "formula": "D15/B15-1",
   "labels": {
    "row": "Cost of revenue",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A16": {
   "type": "text",
   "value": "Gross profit",
   "text": "Gross profit"
  },
  "2026Q3.xlsx/Income/B16": {
   "type": "number",
   "value": 175700000,
   "text": "175,700,000",
   "formula": "B14-B15",
   "labels": {
    "row": "Gross profit",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C16": {
   "type": "number",
   "value": 189500000,
   "text": "189,500,000",
   "formula": "C14-C15",
   "labels": {
    "row": "Gross profit",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D16": {
   "type": "number",
   "value": 197600000,
   "text": "197,600,000",
   "formula": "D14-D15",
   "labels": {
    "row": "Gross profit",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E16": {
   "type": "number",
   "value": 0.12464428002276606,
   "text": "12.5%",
   "formula": "D16/B16-1",
   "labels": {
    "row": "Gross profit",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A17": {
   "type": "text",
   "value": "Operating expenses",
   "text": "Operating expenses"
  },
  "2026Q3.xlsx/Income/B17": {
   "type": "number",
   "value": 57500000,
   "text": "57,500,000",
   "labels": {
    "row": "Operating expenses",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C17": {
   "type": "number",
   "value": 66700000,
   "text": "66,700,000",
   "labels": {
    "row": "Operating expenses",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D17": {
   "type": "number",
   "value": 69200000,
   "text": "69,200,000",
   "labels": {
    "row": "Operating expenses",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E17": {
   "type": "number",
   "value": 0.2034782608695651,
   "text": "20.3%",
   "formula": "D17/B17-1",
   "labels": {
    "row": "Operating expenses",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A18": {
   "type": "text",
   "value": "Operating income",
   "text": "Operating income"
  },
  "2026Q3.xlsx/Income/B18": {
   "type": "number",
   "value": 118200000,
   "text": "118,200,000",
   "formula": "B16-B17",
   "labels": {
    "row": "Operating income",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C18": {
   "type": "number",
   "value": 122800000,
   "text": "122,800,000",
   "formula": "C16-C17",
   "labels": {
    "row": "Operating income",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D18": {
   "type": "number",
   "value": 128400000,
   "text": "128,400,000",
   "formula": "D16-D17",
   "labels": {
    "row": "Operating income",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/E18": {
   "type": "number",
   "value": 0.08629441624365475,
   "text": "8.6%",
   "formula": "D18/B18-1",
   "labels": {
    "row": "Operating income",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Income/A20": {
   "type": "text",
   "value": "Gross margin",
   "text": "Gross margin"
  },
  "2026Q3.xlsx/Income/B20": {
   "type": "number",
   "value": 0.41635071090047393,
   "text": "41.6%",
   "formula": "B16/B14",
   "labels": {
    "row": "Gross margin",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C20": {
   "type": "number",
   "value": 0.40805340223944875,
   "text": "40.8%",
   "formula": "C16/C14",
   "labels": {
    "row": "Gross margin",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D20": {
   "type": "number",
   "value": 0.4099585062240664,
   "text": "41.0%",
   "formula": "D16/D14",
   "labels": {
    "row": "Gross margin",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Income/A21": {
   "type": "text",
   "value": "Operating margin",
   "text": "Operating margin"
  },
  "2026Q3.xlsx/Income/B21": {
   "type": "number",
   "value": 0.2800947867298578,
   "text": "28.0%",
   "formula": "B18/B14",
   "labels": {
    "row": "Operating margin",
    "col": "Q3 2025"
   }
  },
  "2026Q3.xlsx/Income/C21": {
   "type": "number",
   "value": 0.26442721791559,
   "text": "26.4%",
   "formula": "C18/C14",
   "labels": {
    "row": "Operating margin",
    "col": "Q2 2026"
   }
  },
  "2026Q3.xlsx/Income/D21": {
   "type": "number",
   "value": 0.26639004149377593,
   "text": "26.6%",
   "formula": "D18/D14",
   "labels": {
    "row": "Operating margin",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Summary/B2": {
   "type": "number",
   "value": 482000000,
   "text": "482,000,000",
   "formula": "Income!D14",
   "labels": {
    "row": "Consolidated revenue",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Summary/C2": {
   "type": "number",
   "value": 0.14218009478672977,
   "text": "14.2%",
   "formula": "Income!E14",
   "labels": {
    "row": "Consolidated revenue",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Summary/B3": {
   "type": "number",
   "value": 197600000,
   "text": "197,600,000",
   "formula": "Income!D16",
   "labels": {
    "row": "Gross profit",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Summary/C3": {
   "type": "number",
   "value": 0.12464428002276606,
   "text": "12.5%",
   "formula": "Income!E16",
   "labels": {
    "row": "Gross profit",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Summary/B4": {
   "type": "number",
   "value": 128400000,
   "text": "128,400,000",
   "formula": "Income!D18",
   "labels": {
    "row": "Operating income",
    "col": "Q3 2026"
   }
  },
  "2026Q3.xlsx/Summary/C4": {
   "type": "number",
   "value": 0.08629441624365475,
   "text": "8.6%",
   "formula": "Income!E18",
   "labels": {
    "row": "Operating income",
    "col": "YoY growth"
   }
  },
  "2026Q3.xlsx/Quarters/A2": {
   "type": "text",
   "value": "Q3 2025",
   "text": "Q3 2025"
  },
  "2026Q3.xlsx/Quarters/B2": {
   "type": "number",
   "value": 422000000,
   "text": "422,000,000",
   "formula": "Income!B14",
   "labels": {
    "row": "Q3 2025",
    "col": "Revenue"
   }
  },
  "2026Q3.xlsx/Quarters/A3": {
   "type": "text",
   "value": "Q4 2025",
   "text": "Q4 2025"
  },
  "2026Q3.xlsx/Quarters/B3": {
   "type": "number",
   "value": 438600000,
   "text": "438,600,000",
   "labels": {
    "row": "Q4 2025",
    "col": "Revenue"
   }
  },
  "2026Q3.xlsx/Quarters/A4": {
   "type": "text",
   "value": "Q1 2026",
   "text": "Q1 2026"
  },
  "2026Q3.xlsx/Quarters/B4": {
   "type": "number",
   "value": 449900000,
   "text": "449,900,000",
   "labels": {
    "row": "Q1 2026",
    "col": "Revenue"
   }
  },
  "2026Q3.xlsx/Quarters/A5": {
   "type": "text",
   "value": "Q2 2026",
   "text": "Q2 2026"
  },
  "2026Q3.xlsx/Quarters/B5": {
   "type": "number",
   "value": 464400000,
   "text": "464,400,000",
   "formula": "Income!C14",
   "labels": {
    "row": "Q2 2026",
    "col": "Revenue"
   }
  },
  "2026Q3.xlsx/Quarters/A6": {
   "type": "text",
   "value": "Q3 2026",
   "text": "Q3 2026"
  },
  "2026Q3.xlsx/Quarters/B6": {
   "type": "number",
   "value": 482000000,
   "text": "482,000,000",
   "formula": "Income!D14",
   "labels": {
    "row": "Q3 2026",
    "col": "Revenue"
   }
  }
 },
 "rules": {
  "sha256": "1419e80fa50c3d1382dee8dd12439a3c26d6200af7bfcc9abc2e2af2497f57f4",
  "items": [
   {
    "id": "Segments add up to total revenue (Q3 2026)",
    "type": "sum",
    "total": "2026Q3.xlsx/Income/D14",
    "parts": [
     "2026Q3.xlsx/Income/D10",
     "2026Q3.xlsx/Income/D11",
     "2026Q3.xlsx/Income/D12",
     "2026Q3.xlsx/Income/D13"
    ],
    "tolerance": "0"
   },
   {
    "id": "Segments add up to total revenue (Q3 2025)",
    "type": "sum",
    "total": "2026Q3.xlsx/Income/B14",
    "parts": [
     "2026Q3.xlsx/Income/B10",
     "2026Q3.xlsx/Income/B11",
     "2026Q3.xlsx/Income/B12",
     "2026Q3.xlsx/Income/B13"
    ],
    "tolerance": "0"
   },
   {
    "id": "Summary revenue equals the income statement total",
    "type": "equal",
    "left": "2026Q3.xlsx/Summary/B2",
    "right": "2026Q3.xlsx/Income/D14",
    "tolerance": "0",
    "note": "The summary sheet takes its revenue from the income statement"
   },
   {
    "id": "Summary operating income equals the income statement",
    "type": "equal",
    "left": "2026Q3.xlsx/Summary/B4",
    "right": "2026Q3.xlsx/Income/D18",
    "tolerance": "0"
   },
   {
    "id": "Trend chart ends on the income statement total",
    "type": "equal",
    "left": "2026Q3.xlsx/Quarters/B6",
    "right": "2026Q3.xlsx/Income/D14",
    "tolerance": "0"
   }
  ]
 }
}
</script>
</body>
</html>
`;

  /* Data: Analytics dashboard */
  const DASHBOARD = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quillhaven Freight | Operations dashboard</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #07080d;
    --panel: #12141d;
    --panel-2: #1a1d2a;
    --line: #2a2e40;
    --ink: #f3f4fa;
    --ink-2: #a9aec3;
    --purple: #a855f7;
    --purple-2: #c9a4ff;
    --teal: #2dd4bf;
    --amber: #fbbf24;
    --slate: #8b93b5;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background-color: var(--bg);
    background-image: radial-gradient(900px 520px at 18% -8%, rgba(168, 85, 247, .22), transparent 70%), radial-gradient(760px 480px at 96% 12%, rgba(45, 212, 191, .12), transparent 70%), radial-gradient(900px 600px at 60% 108%, rgba(124, 58, 237, .16), transparent 70%);
    background-repeat: no-repeat;
    color: var(--ink);
    font-family: var(--font);
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, p { margin: 0; }
  a { color: inherit; }

  .shell { display: grid; grid-template-columns: 76px minmax(0, 1fr); min-height: 100vh; }
  .rail { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 0; border-right: 1px solid var(--line); background-color: #0b0c13; }
  .rail a { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; color: var(--ink-2); }
  .rail a.on { color: #e3ccff; background-color: #251a3d; box-shadow: inset 0 0 0 1px rgba(168, 85, 247, .45), 0 0 22px rgba(168, 85, 247, .28); }
  .rail svg { width: 21px; height: 21px; }
  .rail .mark { margin-bottom: 14px; color: #fff; background-image: linear-gradient(140deg, #c084fc, #6d28d9); box-shadow: 0 6px 22px rgba(168, 85, 247, .5); }

  .app { min-width: 0; width: 100%; max-width: 1280px; margin: 0 auto; padding: 26px 28px 36px; }
  .top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 20px; margin-bottom: 22px; }
  h1 { font-size: 27px; font-weight: 700; line-height: 1.25; letter-spacing: -.01em; }
  .lede { margin-top: 2px; font-size: 14px; color: var(--ink-2); }
  .meta { display: flex; flex-wrap: wrap; gap: 10px; }
  .chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border: 1px solid var(--line); border-radius: 999px; background-color: var(--panel); font-size: 13.5px; white-space: nowrap; }
  .chip.live { color: var(--ink-2); }
  .chip.live i { width: 8px; height: 8px; border-radius: 50%; background-color: var(--teal); box-shadow: 0 0 0 4px rgba(45, 212, 191, .18), 0 0 12px var(--teal); }

  .card { padding: 20px 22px; border: 1px solid rgba(255, 255, 255, .1); border-radius: 18px; background-color: var(--panel); background-image: linear-gradient(160deg, rgba(255, 255, 255, .055), rgba(255, 255, 255, 0) 46%); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .07), 0 18px 40px rgba(0, 0, 0, .35); }
  @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .card { background-color: rgba(18, 20, 29, .78); -webkit-backdrop-filter: blur(18px) saturate(140%); backdrop-filter: blur(18px) saturate(140%); }
  }
  h2 { font-size: 16px; font-weight: 600; line-height: 1.35; }
  .card-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 14px; margin-bottom: 18px; }
  .card-head span { font-size: 13px; color: var(--ink-2); }
  .card-head b { color: var(--purple-2); font-weight: 600; }

  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
  .kpi { padding: 18px 20px; }
  .kpi-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 10px; }
  .kpi h2 { font-size: 15px; font-weight: 600; color: var(--ink-2); }
  .delta { padding: 2px 9px; border-radius: 999px; font-size: 12.5px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; color: #5eead4; background-color: rgba(45, 212, 191, .13); box-shadow: inset 0 0 0 1px rgba(45, 212, 191, .3); }
  .value { margin: 8px 0 4px; font-size: 38px; font-weight: 700; line-height: 1.15; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .value small { margin-left: 5px; font-size: 16px; font-weight: 500; letter-spacing: 0; color: var(--ink-2); }
  .note { font-size: 13px; color: var(--ink-2); }

  .grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
  .wide { grid-column: span 8; }
  .side { grid-column: span 4; }
  .rest { grid-column: span 8; }

  .wide { display: flex; flex-direction: column; }
  .chart { position: relative; flex: 1 1 250px; min-height: 250px; margin-left: 40px; }
  .chart svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .y { position: absolute; left: -40px; width: 32px; transform: translateY(-50%); font-size: 12px; line-height: 1; text-align: right; color: var(--ink-2); font-variant-numeric: tabular-nums; }
  .x { display: flex; justify-content: space-between; margin: 10px 0 0 40px; font-size: 12px; color: var(--ink-2); }
  .peak { position: absolute; left: 91.667%; top: 6.5%; width: 12px; height: 12px; margin: -6px 0 0 -6px; border: 2px solid #fff; border-radius: 50%; background-color: var(--purple); box-shadow: 0 0 0 5px rgba(168, 85, 247, .25), 0 0 18px #c084fc; }

  .donut { position: relative; width: 184px; height: 184px; margin: 0 auto 18px; }
  .donut svg { display: block; width: 100%; height: 100%; filter: drop-shadow(0 0 14px rgba(168, 85, 247, .35)); }
  .donut-total { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .donut-total b { font-size: 30px; font-weight: 700; line-height: 1.1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .donut-total span { font-size: 12.5px; color: var(--ink-2); }
  .legend { margin: 0; padding: 0; list-style: none; font-size: 14px; }
  .legend li { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  .legend i { flex: none; width: 10px; height: 10px; border-radius: 3px; }
  .legend span { margin-left: auto; color: var(--ink-2); }
  .legend b { width: 40px; text-align: right; }

  .cols { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; height: 236px; padding: 0 2px; border-bottom: 1px solid var(--line); background-image: linear-gradient(var(--line) 1px, transparent 1px); background-size: 100% 25%; }
  .col { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; height: 100%; }
  .col b { font-size: 13px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
  .col i { display: block; width: 100%; max-width: 46px; border-radius: 8px 8px 0 0; background-color: #a855f7; background-image: linear-gradient(180deg, #d8b4fe, #7c3aed); box-shadow: 0 0 20px rgba(168, 85, 247, .4); }
  .col.second i { background-color: #2dd4bf; background-image: linear-gradient(180deg, #5eead4, #0d9488); box-shadow: 0 0 20px rgba(45, 212, 191, .3); }
  .col-names { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 8px 0 0; padding: 0 2px; list-style: none; font-size: 12px; line-height: 1.3; text-align: center; color: var(--ink-2); }
  .bars-note { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 13.5px; color: var(--ink-2); }
  .bars-note b { color: var(--ink); font-weight: 600; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: 14px; }
  th { padding: 0 14px 10px 0; font-size: 12.5px; font-weight: 500; letter-spacing: .04em; text-transform: uppercase; text-align: left; color: var(--ink-2); white-space: nowrap; }
  td { padding: 11px 14px 11px 0; border-top: 1px solid var(--line); white-space: nowrap; }
  th:last-child, td:last-child { padding-right: 0; text-align: right; }
  .id { font-family: ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace; font-size: 13px; color: var(--purple-2); }
  .eta { font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 2px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 600; }
  .pill.done { color: #5eead4; background-color: rgba(45, 212, 191, .13); box-shadow: inset 0 0 0 1px rgba(45, 212, 191, .4); }
  .pill.go { color: #d8b4fe; background-color: rgba(168, 85, 247, .16); box-shadow: inset 0 0 0 1px rgba(168, 85, 247, .45); }
  .pill.late { color: #fcd34d; background-color: rgba(251, 191, 36, .13); box-shadow: inset 0 0 0 1px rgba(251, 191, 36, .42); }
  .pill.wait { color: #c5cbe3; background-color: rgba(139, 147, 181, .16); box-shadow: inset 0 0 0 1px rgba(139, 147, 181, .42); }

  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 20px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-2); }
  .foot a { color: var(--purple-2); }

  @media (max-width: 1080px) {
    .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wide, .side, .rest { grid-column: 1 / -1; }
    .donut-wrap { display: grid; grid-template-columns: 184px minmax(0, 1fr); align-items: center; gap: 28px; }
    .donut { margin: 0; }
  }
  @media (max-width: 860px) {
    .shell { grid-template-columns: minmax(0, 1fr); }
    .rail { flex-direction: row; padding: 10px 16px; border-right: 0; border-bottom: 1px solid var(--line); }
    .rail .mark { margin: 0 10px 0 0; }
    .app { padding: 22px 20px 32px; }
  }
  @media (max-width: 560px) {
    .rail { gap: 4px; padding: 8px 12px; }
    .app { padding: 18px 14px 28px; }
    h1 { font-size: 23px; }
    .card { padding: 16px; border-radius: 16px; }
    .kpis, .grid { gap: 12px; }
    .kpis { margin-bottom: 12px; }
    .kpi { padding: 14px; }
    .value { font-size: 28px; }
    .value small { font-size: 14px; }
    .chart { flex-basis: 200px; min-height: 200px; }
    .donut-wrap { display: block; }
    .donut { margin: 0 auto 18px; }
    .cols, .col-names { gap: 8px; }
  }
</style>
<style data-he-style="fx">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-in { syntax: "<integer>"; inherits: true; initial-value: 1; }
:where(.tfx-h-sheen) { position: relative; }
.tfx-e-deal > * { --tfx-k: inherit; --tfx-t: inherit; }</style><style data-he-style="fx-motion">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
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
<div class="shell">
<nav class="rail" aria-label="Sections">
<a class="mark" href="#top" aria-label="Quillhaven Freight" title="Quillhaven Freight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"></path><path d="M4 7.5l8 4.5 8-4.5M12 12v9"></path></svg></a>
<a class="on" href="#overview" aria-label="Overview" title="Overview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"></path></svg></a>
<a href="#volume" aria-label="Daily shipments" title="Daily shipments"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16"></path><path d="M7 15l4-5 3 3 5-7"></path></svg></a>
<a href="#status" aria-label="Delivery status" title="Delivery status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 4v8l6 5"></path></svg></a>
<a href="#regions" aria-label="Shipments by region" title="Shipments by region"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20v-8M12 20V5M18 20v-11"></path></svg></a>
<a href="#recent" aria-label="Recent shipments" title="Recent shipments"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"></path><circle cx="7" cy="18" r="1.8"></circle><circle cx="17" cy="18" r="1.8"></circle></svg></a>
</nav>

<main class="app" id="top">
<header class="top">
<div>
<h1>Quillhaven Freight</h1>
<p class="lede">Operations dashboard for the regional network</p>
</div>
<div class="meta">
<span class="chip">November 2026</span>
<span class="chip live"><i></i>Updated Nov 13, 2:30 PM CT</span>
</div>
</header>

<section class="kpis tfx-e-deal" id="overview" aria-label="Key figures">
<article class="card kpi tfx-h-lift" style="--tfx-i: 0">
<div class="kpi-head"><h2>Active shipments</h2><span class="delta">▲ 8.2%</span></div>
<p class="value">1,482</p>
<p class="note">1,370 on October 13</p>
</article>
<article class="card kpi tfx-h-lift" style="--tfx-i: 1">
<div class="kpi-head"><h2>On-time rate</h2><span class="delta">▲ 1.3 pts</span></div>
<p class="value">96.4<small>%</small></p>
<p class="note">95.1% in October</p>
</article>
<article class="card kpi tfx-h-lift" style="--tfx-i: 2">
<div class="kpi-head"><h2>Fleet utilization</h2><span class="delta">▲ 2.5 pts</span></div>
<p class="value">87.0<small>%</small></p>
<p class="note">174 of 200 trucks on the road</p>
</article>
<article class="card kpi tfx-h-lift" style="--tfx-i: 3">
<div class="kpi-head"><h2>Avg transit time</h2><span class="delta">▼ 1.4 hrs</span></div>
<p class="value">18.6<small>hrs</small></p>
<p class="note">20.0 hrs in October</p>
</article>
</section>

<div class="grid">
<section class="card wide tfx-h-sheen" id="volume">
<div class="card-head"><h2>Daily shipments</h2><span>Nov 1 to 13 · peak <b>561</b> on Nov 12</span></div>
<div class="chart">
<svg viewBox="0 0 720 240" preserveAspectRatio="none" role="img" aria-label="Line chart of shipments booked per day from November 1 to 13. Weekdays run between 418 and 561, weekends between 232 and 322, and the peak is 561 on November 12.">
<defs>
<linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#a855f7" stop-opacity=".5"></stop>
<stop offset=".6" stop-color="#7c3aed" stop-opacity=".14"></stop>
<stop offset="1" stop-color="#7c3aed" stop-opacity="0"></stop>
</linearGradient>
<linearGradient id="dash-line" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#8b5cf6"></stop>
<stop offset="1" stop-color="#e0b8ff"></stop>
</linearGradient>
<filter id="dash-glow" x="-10%" y="-40%" width="120%" height="180%">
<feGaussianBlur stdDeviation="7"></feGaussianBlur>
</filter>
</defs>
<g stroke="#2a2e40" stroke-width="1" stroke-dasharray="4 5">
<line x1="0" y1="0" x2="720" y2="0" vector-effect="non-scaling-stroke"></line>
<line x1="0" y1="60" x2="720" y2="60" vector-effect="non-scaling-stroke"></line>
<line x1="0" y1="120" x2="720" y2="120" vector-effect="non-scaling-stroke"></line>
<line x1="0" y1="180" x2="720" y2="180" vector-effect="non-scaling-stroke"></line>
</g>
<line x1="0" y1="240" x2="720" y2="240" stroke="#3a3f55" stroke-width="1" vector-effect="non-scaling-stroke"></line>
<path d="M0 147.2 C10.8 133.8 38.4 88.2 60 72.8 C81.6 57.4 98.4 65.5 120 61.6 C141.6 57.7 158.4 54.3 180 51.2 C201.6 48.1 218.4 46.8 240 44.4 C261.6 42 278.4 25.6 300 37.6 C321.6 49.6 338.4 93.1 360 111.2 C381.6 129.3 398.4 148.1 420 138.4 C441.6 128.7 458.4 74.8 480 57.2 C501.6 39.6 518.4 46.3 540 40.8 C561.6 35.3 578.4 30.9 600 26.4 C621.6 21.9 638.4 13.9 660 15.6 C681.6 17.3 709.2 32 720 35.6 L720 240 L0 240 Z" fill="url(#dash-area)"></path>
<path d="M0 147.2 C10.8 133.8 38.4 88.2 60 72.8 C81.6 57.4 98.4 65.5 120 61.6 C141.6 57.7 158.4 54.3 180 51.2 C201.6 48.1 218.4 46.8 240 44.4 C261.6 42 278.4 25.6 300 37.6 C321.6 49.6 338.4 93.1 360 111.2 C381.6 129.3 398.4 148.1 420 138.4 C441.6 128.7 458.4 74.8 480 57.2 C501.6 39.6 518.4 46.3 540 40.8 C561.6 35.3 578.4 30.9 600 26.4 C621.6 21.9 638.4 13.9 660 15.6 C681.6 17.3 709.2 32 720 35.6" fill="none" stroke="#a855f7" stroke-width="9" stroke-opacity=".75" stroke-linecap="round" filter="url(#dash-glow)"></path>
<path d="M0 147.2 C10.8 133.8 38.4 88.2 60 72.8 C81.6 57.4 98.4 65.5 120 61.6 C141.6 57.7 158.4 54.3 180 51.2 C201.6 48.1 218.4 46.8 240 44.4 C261.6 42 278.4 25.6 300 37.6 C321.6 49.6 338.4 93.1 360 111.2 C381.6 129.3 398.4 148.1 420 138.4 C441.6 128.7 458.4 74.8 480 57.2 C501.6 39.6 518.4 46.3 540 40.8 C561.6 35.3 578.4 30.9 600 26.4 C621.6 21.9 638.4 13.9 660 15.6 C681.6 17.3 709.2 32 720 35.6" fill="none" stroke="url(#dash-line)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path>
</svg>
<span class="peak" aria-hidden="true"></span>
<span class="y" style="top: 0%">600</span>
<span class="y" style="top: 25%">450</span>
<span class="y" style="top: 50%">300</span>
<span class="y" style="top: 75%">150</span>
<span class="y" style="top: 100%">0</span>
</div>
<div class="x"><span>Nov 1</span><span>Nov 4</span><span>Nov 7</span><span>Nov 10</span><span>Nov 13</span></div>
</section>

<section class="card side tfx-h-sheen" id="status">
<div class="card-head"><h2>Delivery status</h2><span>Month to date</span></div>
<div class="donut-wrap">
<div class="donut">
<svg viewBox="0 0 42 42" role="img" aria-label="Donut chart: delivered 74%, in transit 19%, scheduled 5%, delayed 2%">
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#1f2231" stroke-width="5"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#2dd4bf" stroke-width="5" stroke-dasharray="74 26" stroke-dashoffset="25"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#a855f7" stroke-width="5" stroke-dasharray="19 81" stroke-dashoffset="51"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#8b93b5" stroke-width="5" stroke-dasharray="5 95" stroke-dashoffset="32"></circle>
<circle cx="21" cy="21" r="15.915" fill="none" stroke="#fbbf24" stroke-width="5" stroke-dasharray="2 98" stroke-dashoffset="27"></circle>
</svg>
<p class="donut-total"><b>5,700</b><span>shipments</span></p>
</div>
<ul class="legend">
<li><i style="background-color: #2dd4bf"></i>Delivered<span>4,218</span><b>74%</b></li>
<li><i style="background-color: #a855f7"></i>In transit<span>1,083</span><b>19%</b></li>
<li><i style="background-color: #8b93b5"></i>Scheduled<span>285</span><b>5%</b></li>
<li><i style="background-color: #fbbf24"></i>Delayed<span>114</span><b>2%</b></li>
</ul>
</div>
</section>

<section class="card side tfx-h-sheen" id="regions">
<div class="card-head"><h2>Shipments by region</h2><span>Month to date</span></div>
<div class="cols tfx-e-grow">
<div class="col"><b>1,710</b><i style="height: 85.5%" class="tfx-bar-v"></i></div>
<div class="col second"><b>1,368</b><i style="height: 68.4%" class="tfx-bar-v"></i></div>
<div class="col"><b>1,140</b><i style="height: 57%" class="tfx-bar-v"></i></div>
<div class="col second"><b>855</b><i style="height: 42.8%" class="tfx-bar-v"></i></div>
<div class="col"><b>627</b><i style="height: 31.4%" class="tfx-bar-v"></i></div>
</div>
<ul class="col-names">
<li>Midwest</li>
<li>North­east</li>
<li>South­east</li>
<li>South­west</li>
<li>West</li>
</ul>
<p class="bars-note"><b>Midwest carries 30%</b> of the month's volume, led by the Chicago and Columbus lanes.</p>
</section>

<section class="card rest tfx-h-sheen" id="recent">
<div class="card-head"><h2>Recent shipments</h2><span>Latest 7 of 1,482 active and just delivered</span></div>
<div class="table-wrap">
<table>
<thead>
<tr><th>Shipment</th><th>Route</th><th>Driver</th><th>Status</th><th>ETA</th></tr>
</thead>
<tbody>
<tr><td class="id">QF-1113-0482</td><td>Chicago → Columbus</td><td>Amara Okonkwo</td><td><span class="pill go">In transit</span></td><td class="eta">Today, 6:15 PM</td></tr>
<tr><td class="id">QF-1113-0479</td><td>Atlanta → Nashville</td><td>Mateo Fuentes</td><td><span class="pill done">Delivered</span></td><td class="eta">Today, 1:42 PM</td></tr>
<tr><td class="id">QF-1113-0471</td><td>Dallas → Oklahoma City</td><td>Linh Tran</td><td><span class="pill late">Delayed</span></td><td class="eta">Today, 9:30 PM</td></tr>
<tr><td class="id">QF-1113-0466</td><td>Pittsburgh → Buffalo</td><td>Jonas Lindqvist</td><td><span class="pill go">In transit</span></td><td class="eta">Today, 5:05 PM</td></tr>
<tr><td class="id">QF-1113-0458</td><td>Denver → Salt Lake City</td><td>Priya Raman</td><td><span class="pill wait">Scheduled</span></td><td class="eta">Nov 14, 8:00 AM</td></tr>
<tr><td class="id">QF-1112-0561</td><td>Indianapolis → St. Louis</td><td>Keoni Kahale</td><td><span class="pill done">Delivered</span></td><td class="eta">Today, 11:20 AM</td></tr>
<tr><td class="id">QF-1112-0544</td><td>Charlotte → Richmond</td><td>Fatima Al-Sayed</td><td><span class="pill go">In transit</span></td><td class="eta">Today, 4:40 PM</td></tr>
</tbody>
</table>
</div>
</section>
</div>

<footer class="foot">
<p>Quillhaven Freight · Network operations, Chicago · Data refreshes every 15 minutes</p>
<p>Questions about a figure? <a href="mailto:ops@example.com">ops@example.com</a></p>
</footer>
</main>
</div>


</body></html>
`;

  /* Website: Product launch page */
  const LAUNCH = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fernlight | Reports that write themselves</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #070817;
    --bg-2: #0c0e24;
    --panel: #12142f;
    --panel-2: #181b3d;
    --line: rgba(255, 255, 255, .12);
    --line-2: rgba(255, 255, 255, .2);
    --ink: #f5f6ff;
    --ink-2: #c5c9e6;
    --ink-3: #9da2c4;
    --indigo: #6366f1;
    --violet: #a78bfa;
    --magenta: #e879f9;
    --teal: #5eead4;
    --radius: 20px;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 16px; line-height: 1.6; }
  h1, h2, h3, p, figure, blockquote { margin: 0; }
  h3 { font-size: 20px; line-height: 1.3; letter-spacing: -.01em; }
  a { color: inherit; text-decoration: none; }
  svg { display: block; }
  .container { max-width: 1188px; margin: 0 auto; padding: 0 24px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 28px; border: 1px solid var(--line-2); border-radius: 99px; background: rgba(255, 255, 255, .08); color: var(--ink); font-weight: 700; text-align: center; }
  .btn:hover { background: rgba(255, 255, 255, .16); }
  .btn-primary { border-color: rgba(255, 255, 255, .28); background: linear-gradient(100deg, #5b3fe0, #a21caf 55%, #2563eb); color: #fff; box-shadow: 0 10px 36px rgba(162, 28, 175, .45), 0 0 0 1px rgba(255, 255, 255, .06) inset; }
  .btn-primary:hover { background: linear-gradient(100deg, #4f35cc, #86198f 55%, #1d4ed8); }
  .btn-sm { min-height: 40px; padding: 0 18px; font-size: 14px; }

  .nav { position: sticky; top: 12px; z-index: 10; display: flex; align-items: center; gap: 32px; width: min(1140px, 100% - 32px); height: 64px; margin: 12px auto 0; padding: 0 12px 0 22px; border: 1px solid var(--line); border-radius: 20px; background: rgba(18, 20, 47, .72); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
  .logo { display: inline-flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
  .logo svg { flex: none; width: 28px; height: 28px; }
  .nav-links { display: flex; gap: 30px; margin-left: auto; font-size: 14px; color: var(--ink-2); }
  .nav-links a:hover { color: #fff; }

  .hero { position: relative; margin-top: -76px; padding: 196px 0 120px; background: var(--bg); overflow: clip; }
  .aurora { position: absolute; inset: 0; overflow: clip; pointer-events: none; background: radial-gradient(52% 46% at 62% 8%, rgba(79, 70, 229, .7), transparent 72%), radial-gradient(40% 40% at 8% 96%, rgba(13, 148, 136, .3), transparent 70%); }
  .aurora i { position: absolute; display: block; border-radius: 50%; }
  .glow-a { left: 30%; top: 12%; width: 64%; height: 52%; background: radial-gradient(closest-side, rgba(217, 70, 239, .82), rgba(192, 38, 211, .32) 55%, transparent); transform: rotate(-16deg); }
  .glow-b { left: 24%; top: 54%; width: 86%; height: 50%; background: radial-gradient(closest-side, rgba(45, 212, 191, .72), rgba(13, 148, 136, .32) 55%, transparent); transform: rotate(-10deg); }
  .glow-c { right: -12%; top: -24%; width: 46%; aspect-ratio: 1; background: conic-gradient(from 200deg, #4f46e5, #d946ef, #2dd4bf, #4f46e5); filter: blur(80px); opacity: .5; }
  .aurora::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(7, 8, 23, .9), rgba(7, 8, 23, .5) 38%, transparent 68%), linear-gradient(180deg, transparent 72%, var(--bg)); }
  .hero .container { position: relative; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); align-items: center; gap: 40px; }
  .pill { display: inline-flex; align-items: center; gap: 10px; padding: 5px 16px 5px 5px; border: 1px solid var(--line-2); border-radius: 99px; background: rgba(7, 8, 23, .55); font-size: 14px; color: var(--ink-2); }
  .pill b { padding: 1px 10px; border-radius: 99px; background: var(--teal); color: #062a26; font-size: 12px; }
  .hero h1 { margin: 26px 0 24px; font-size: clamp(44px, 7.2vw, 88px); line-height: 1.02; font-weight: 800; letter-spacing: -.035em; }
  .hero h1 em { font-style: normal; color: var(--teal); }
  .lead { max-width: 32em; font-size: 18px; color: var(--ink-2); }
  .hero .lead { font-size: clamp(18px, 2vw, 22px); line-height: 1.5; }
  .actions { display: flex; flex-wrap: wrap; gap: 14px; margin: 36px 0 18px; }
  .note { font-size: 14px; color: var(--ink-2); }

  .stage { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); grid-template-areas: "a b" "a c" "d e"; gap: 14px; transform: perspective(1500px) rotateX(24deg) rotateZ(-13deg); transform-origin: 40% 50%; }
  .glass { padding: 16px; border: 1px solid rgba(255, 255, 255, .24); border-radius: 16px; background: rgba(255, 255, 255, .1); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); box-shadow: 0 30px 60px rgba(4, 5, 20, .45); font-size: 12px; line-height: 1.4; color: var(--ink-2); }
  .glass b { display: block; font-size: 24px; line-height: 1.2; letter-spacing: -.02em; color: #fff; }
  .glass svg { width: 100%; height: auto; margin-top: 10px; }
  .g-a { grid-area: a; }
  .g-b { grid-area: b; }
  .g-c { grid-area: c; }
  .g-d { grid-area: d; }
  .g-e { grid-area: e; display: grid; align-content: center; gap: 10px; }
  .glass-title { margin-bottom: 6px; font-size: 14px; font-weight: 700; color: #fff; }
  .up { color: var(--teal); font-weight: 700; }
  .bars { display: grid; gap: 8px; margin-top: 12px; }
  .bars i, .g-e i { display: block; height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .26); }
  .g-e i { height: 30px; border-radius: 9px; background: rgba(255, 255, 255, .14); }

  .logos { padding: 44px 0 20px; text-align: center; }
  .logos p { font-size: 14px; color: var(--ink-3); }
  .logos ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px 44px; margin: 22px 0 0; padding: 0; list-style: none; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: var(--ink-3); }

  .section { padding: 104px 0; }
  .head { max-width: 720px; margin-bottom: 52px; }
  .head.center { margin: 0 auto 52px; text-align: center; }
  .head.center .lead { margin: 0 auto; }
  .kicker { font-size: 14px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--teal); }
  .head h2, .cta h2 { margin: 12px 0 16px; font-size: clamp(30px, 4.4vw, 52px); line-height: 1.1; font-weight: 800; letter-spacing: -.03em; }

  .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .card { padding: 30px 28px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
  .card svg { width: 48px; height: 48px; margin-bottom: 22px; padding: 12px; border-radius: 14px; background: rgba(99, 102, 241, .22); color: var(--teal); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .card:nth-child(3n + 2) svg { background: rgba(217, 70, 239, .2); color: var(--magenta); }
  .card:nth-child(3n) svg { background: rgba(45, 212, 191, .16); color: var(--violet); }
  .card p { margin-top: 10px; color: var(--ink-2); }

  .product { background: radial-gradient(60% 46% at 50% 62%, rgba(99, 102, 241, .3), transparent 72%), radial-gradient(34% 30% at 82% 78%, rgba(217, 70, 239, .2), transparent 70%), var(--bg-2); border-block: 1px solid var(--line); overflow: clip; }
  .demo { border: 1px solid var(--line-2); border-radius: 22px; background: #0a0b1f; box-shadow: 0 50px 120px rgba(3, 4, 16, .7), 0 0 80px rgba(99, 102, 241, .22); overflow: hidden; }
  .demo-bar { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid var(--line); font-size: 14px; color: var(--ink-3); }
  .demo-bar i { width: 11px; height: 11px; border-radius: 50%; background: rgba(255, 255, 255, .22); }
  .demo-bar span { margin-left: 12px; }
  .demo-body { display: grid; grid-template-columns: 230px minmax(0, 1fr); }
  .demo-side { display: grid; align-content: start; gap: 4px; padding: 20px 14px; border-right: 1px solid var(--line); font-size: 14px; color: var(--ink-2); }
  .demo-side p { padding: 9px 12px; border-radius: 10px; }
  .demo-side .on { background: rgba(99, 102, 241, .28); color: #fff; font-weight: 700; }
  .demo-side .label { padding-bottom: 4px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
  .demo-main { padding: 26px 28px 28px; }
  .demo-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 6px 16px; margin-bottom: 20px; font-size: 14px; color: var(--ink-3); }
  .demo-head h3 { color: #fff; }
  .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .tile { padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); font-size: 14px; line-height: 1.4; color: var(--ink-2); }
  .tile b { display: block; font-size: 24px; line-height: 1.3; letter-spacing: -.02em; color: #fff; }
  .plot { margin-top: 14px; padding: 18px 18px 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); }
  .plot svg { width: 100%; height: auto; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-bottom: 10px; font-size: 14px; color: var(--ink-2); }
  .legend span::before { content: ""; display: inline-block; width: 10px; height: 10px; margin-right: 8px; border-radius: 50%; background: var(--teal); }
  .legend span + span::before { background: var(--violet); }
  .axis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); padding-top: 8px; font-size: 12px; text-align: center; color: var(--ink-3); }
  .insight { display: flex; gap: 14px; margin-top: 14px; padding: 16px 18px; border: 1px solid rgba(94, 234, 212, .34); border-radius: 14px; background: rgba(45, 212, 191, .09); font-size: 14px; color: var(--ink-2); }
  .insight b { flex: none; color: var(--teal); }

  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-top: 64px; color: var(--ink-2); }
  .stats p { padding-left: 22px; border-left: 2px solid var(--violet); }
  .stats p + p { border-color: var(--magenta); }
  .stats p + p + p { border-color: var(--teal); }
  .stats strong { display: block; margin-bottom: 6px; font-size: clamp(40px, 5vw, 60px); line-height: 1.05; font-weight: 800; letter-spacing: -.03em; color: #fff; }
  .stats small { margin-left: 6px; font-size: .4em; letter-spacing: 0; color: var(--ink-2); }

  .quote { max-width: 880px; margin: 0 auto; text-align: center; }
  .quote blockquote { font-size: clamp(22px, 3vw, 32px); line-height: 1.4; font-weight: 700; letter-spacing: -.02em; }
  .quote blockquote::before { content: ""; display: block; width: 56px; height: 6px; margin: 0 auto 30px; border-radius: 3px; background: linear-gradient(90deg, var(--indigo), var(--magenta), var(--teal)); }
  .quote figcaption { display: inline-flex; align-items: center; gap: 14px; margin-top: 30px; line-height: 1.5; text-align: left; color: var(--ink-2); }
  .quote figcaption b { color: #fff; }
  .avatar { display: grid; place-items: center; flex: none; width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #5b3fe0, #a21caf); color: #fff; font-weight: 800; }
  .sample { margin-top: 22px; font-size: 14px; color: var(--ink-3); }

  .pricing { background: var(--bg-2); border-block: 1px solid var(--line); }
  .plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; gap: 20px; }
  .plan { position: relative; display: flex; flex-direction: column; padding: 34px 30px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
  .plan.featured { padding: 48px 30px; border-color: rgba(167, 139, 250, .8); background: var(--panel-2); box-shadow: 0 30px 80px rgba(162, 28, 175, .3), 0 0 0 1px rgba(232, 121, 249, .25); }
  .badge { position: absolute; top: -15px; left: 30px; padding: 3px 14px; border-radius: 99px; background: linear-gradient(100deg, #5b3fe0, #a21caf); color: #fff; font-size: 14px; font-weight: 700; }
  .plan h3 + p { color: var(--ink-2); }
  .price { margin: 24px 0; font-size: 52px; line-height: 1.05; font-weight: 800; letter-spacing: -.03em; }
  .price span { margin-left: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0; color: var(--ink-3); }
  .plan ul { flex: 1; display: grid; align-content: start; gap: 11px; margin: 0 0 30px; padding: 24px 0 0; border-top: 1px solid var(--line); list-style: none; color: var(--ink-2); }
  .plan li { position: relative; padding-left: 28px; }
  .plan li::before { content: ""; position: absolute; left: 3px; top: .45em; width: 13px; height: 7px; border: solid var(--teal); border-width: 0 0 2.5px 2.5px; transform: rotate(-45deg); }

  .faq { max-width: 820px; margin: 0 auto; border-top: 1px solid var(--line); }
  .faq details { border-bottom: 1px solid var(--line); }
  .faq summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 22px 4px; font-size: 18px; font-weight: 700; list-style: none; cursor: pointer; }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after { content: "+"; display: grid; place-items: center; flex: none; width: 30px; height: 30px; border-radius: 50%; background: var(--panel-2); font-size: 18px; line-height: 1; }
  .faq [open] summary::after { background: var(--indigo); transform: rotate(45deg); }
  .faq details p { padding: 0 4px 24px; color: var(--ink-2); }

  .cta { padding: 0 0 104px; }
  .cta-box { position: relative; padding: 88px 32px; border: 1px solid var(--line-2); border-radius: 32px; background: #0d0e2a; text-align: center; overflow: hidden; }
  .cta-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(42% 70% at 6% 10%, rgba(99, 102, 241, .75), transparent 70%), radial-gradient(40% 70% at 96% 20%, rgba(192, 38, 211, .6), transparent 70%), radial-gradient(60% 60% at 50% 122%, rgba(45, 212, 191, .5), transparent 70%); }
  .cta-box > :not(.cta-glow) { position: relative; }
  .cta h2 { margin-top: 0; }
  .cta p { max-width: 34em; margin: 0 auto 32px; font-size: 18px; color: var(--ink-2); }
  .cta .actions { justify-content: center; margin: 0; }

  .footer { padding: 48px 0 36px; border-top: 1px solid var(--line); font-size: 14px; color: var(--ink-2); }
  .footer .container { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px; }
  .footer .brand p { margin-top: 10px; }
  .footer .logo { color: var(--ink); }
  .footer nav { display: flex; flex-wrap: wrap; gap: 12px 28px; }
  .footer nav a:hover { color: #fff; }
  .legal { flex-basis: 100%; padding-top: 22px; border-top: 1px solid var(--line); color: var(--ink-3); }

  @media (max-width: 960px) {
    .hero { padding: 168px 0 96px; }
    .hero .container { grid-template-columns: minmax(0, 1fr); gap: 72px; }
    .stage { width: min(520px, 84%); margin: 0 auto; }
    .glow-a { left: 14%; top: 46%; width: 92%; height: 34%; }
    .glow-b { left: 4%; top: 66%; width: 110%; height: 36%; }
    .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .demo-body { grid-template-columns: minmax(0, 1fr); }
    .demo-side { display: none; }
    .plans { grid-template-columns: minmax(0, 1fr); max-width: 480px; margin: 0 auto; gap: 30px; }
    .plan.featured { padding: 34px 30px; }
  }
  @media (max-width: 720px) {
    .container { padding: 0 16px; }
    .nav { gap: 12px; padding-left: 16px; }
    .nav-links { display: none; }
    .nav .btn { margin-left: auto; }
    .hero { padding: 140px 0 80px; }
    .hero .container { gap: 56px; }
    .stage { width: 86%; gap: 10px; transform: perspective(1200px) rotateX(18deg) rotateZ(-7deg); }
    .glass { padding: 12px; }
    .glass b { font-size: 20px; }
    .g-e i { height: 22px; }
    .actions .btn { flex: 1 1 100%; }
    .section { padding: 76px 0; }
    .head, .head.center { margin-bottom: 40px; }
    .cards { grid-template-columns: minmax(0, 1fr); }
    .demo-main { padding: 18px 14px; }
    .tiles { gap: 8px; }
    .tile { padding: 10px; font-size: 12px; }
    .tile b { font-size: 20px; }
    .tile .up { display: block; }
    .plot { padding: 12px 10px 8px; }
    .insight { flex-direction: column; gap: 4px; }
    .stats { grid-template-columns: minmax(0, 1fr); gap: 28px; margin-top: 48px; }
    .cta { padding-bottom: 76px; }
    .cta-box { padding: 60px 20px; border-radius: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }
</style>
<style data-he-style="fx">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }
:where(.tfx-h-sheen) { position: relative; }
:where(.tfx-h-trace) { position: relative; }
.tfx-e-deal > * { --tfx-k: inherit; --tfx-t: inherit; }
:where(.tfx-s-shrink) { position: sticky; top: 0; z-index: 20; }</style><style data-he-style="fx-motion">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@media (prefers-reduced-motion: no-preference) {
  .tfx-h-lift { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1); }
  .tfx-h-sheen::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; --tfx-k: inherit; background: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / calc(.38 * var(--tfx-k, 1))) 50%, transparent 65%) 130% 0 / 250% 100% no-repeat; }
  .tfx-h-trace::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: calc(1px + 1px * var(--tfx-k, 1)); pointer-events: none; --tfx-k: inherit; --tfx-angle: 0deg; background: conic-gradient(from var(--tfx-angle), transparent 0 60%, var(--tfx-color, currentColor) 88%, transparent); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); opacity: 0; transition: opacity .25s cubic-bezier(.22,1,.36,1), --tfx-angle 1.2s cubic-bezier(.65,0,.35,1); }
  @media (hover: hover) {
    .tfx-h-lift:hover { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
    .tfx-h-sheen:hover::after { background-position: -30% 0; transition: background-position .9s cubic-bezier(.65,0,.35,1); }
    .tfx-h-trace:hover::before { opacity: 1; --tfx-angle: 360deg; }
  }
  .tfx-h-lift:is(:focus-visible, :focus-within) { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
  .tfx-h-sheen:is(:focus-visible, :focus-within)::after { background-position: -30% 0; transition: background-position .9s cubic-bezier(.65,0,.35,1); }
  .tfx-h-trace:is(:focus-visible, :focus-within)::before { opacity: 1; --tfx-angle: 360deg; }
  @media screen {
    @supports (animation-timeline: view()) {
      @keyframes tfx-deal { from { opacity: 0; transform: translateY(calc(1.5rem * var(--tfx-k, 1))) scale(calc(1 - .05 * var(--tfx-k, 1))); } }
      .tfx-e-deal > * { animation: tfx-deal linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15% + min(var(--tfx-i, 0), 7) * 6%, 3rem + var(--tfx-t, 0) * 3rem + min(var(--tfx-i, 0), 7) * 1rem) entry min(100%, 75% + var(--tfx-t, 0) * 25% + min(var(--tfx-i, 0), 7) * 6%, 16rem + var(--tfx-t, 0) * 4rem + min(var(--tfx-i, 0), 7) * 1rem); }
      @keyframes tfx-parallax { from { transform: translateY(calc(12% * var(--tfx-k, 1))); } to { transform: translateY(calc(-12% * var(--tfx-k, 1))); } }
      .tfx-s-parallax { animation: tfx-parallax linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover 0% cover 100%; }
      @keyframes tfx-tilt-up { from { opacity: calc(1 - .5 * var(--tfx-k, 1)); transform: perspective(60rem) rotateX(calc(22deg * var(--tfx-k, 1))); } }
      .tfx-s-tilt-up { transform-origin: 50% 100%; animation: tfx-tilt-up linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry calc(var(--tfx-t, 0) * min(15%, 3rem)) entry min(90% + var(--tfx-t, 0) * 10%, 18rem + var(--tfx-t, 0) * 4rem); }
      @keyframes tfx-shrink { to { transform: translateY(calc(.4rem * var(--tfx-k, 1))) scale(calc(1 - .04 * var(--tfx-k, 1))); border-radius: calc(.9rem * var(--tfx-k, 1)); box-shadow: 0 .6rem 1.6rem -.8rem rgb(0 0 0 / .32); } }
      .tfx-s-shrink { transform-origin: 50% 0; animation: tfx-shrink linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: scroll(root); animation-range: 0px calc(200px + var(--tfx-t, 0) * 100px); }
    }
  }
}</style></head>
<body id="top">
<header class="nav tfx-s-shrink">
  <a class="logo" href="#top">
    <svg viewBox="0 0 28 28" aria-hidden="true"><defs><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5eead4"></stop><stop offset=".55" stop-color="#a78bfa"></stop><stop offset="1" stop-color="#e879f9"></stop></linearGradient></defs><path d="M14 2c6 4 9 8.500 9 13.500 0 5-4 9-9 10.500-5-1.500-9-5.500-9-10.500C5 10.500 8 6 14 2z" fill="none" stroke="url(#leaf)" stroke-width="2.200" stroke-linejoin="round"></path><path d="M14 7v18M14 13l4.500-3.500M14 13L9.500 9.500M14 18.500l5.500-4M14 18.500l-5.500-4" fill="none" stroke="url(#leaf)" stroke-width="1.800" stroke-linecap="round"></path></svg>
    Fernlight
  </a>
  <nav class="nav-links" aria-label="Main">
    <a href="#features">Features</a>
    <a href="#product">Product</a>
    <a href="#pricing">Pricing</a>
    <a href="#faq">FAQ</a>
  </nav>
  <a class="btn btn-sm" href="https://example.com/signin">Sign in</a>
</header>

<section class="hero">
  <div class="aurora" aria-hidden="true"><i class="glow-c"></i><i class="glow-a tfx-s-parallax"></i><i class="glow-b tfx-s-parallax"></i></div>
  <div class="container">
    <div>
      <p class="pill"><b>New</b>Scheduled reports for Slack and email</p>
      <h1>Reports that <em>write themselves.</em></h1>
      <p class="lead">Fernlight pulls the numbers from the tools your team already uses and turns them into one clear weekly report, ready before the Monday meeting.</p>
      <div class="actions">
        <a class="btn btn-primary tfx-h-sheen" href="#pricing">Start free trial</a>
        <a class="btn" href="#product">See the product</a>
      </div>
      <p class="note">No credit card required · Set up in about 10 minutes · Cancel anytime</p>
    </div>
    <div class="stage">
      <div class="glass g-a tfx-h-lift">
        <p class="glass-title">Tickets closed</p>
        <p>Support team · Week 46</p>
        <svg viewBox="0 0 280 120" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 96C34 96 40 50 68 56s30 34 56 18 28-46 54-34 34 14 50-4 26-22 44-24" stroke="#a78bfa" stroke-width="3"></path><path d="M4 108c26-4 38-34 62-30s30 22 54 6 30-18 54-22 36 6 54-18 30-30 48-36" stroke="#5eead4" stroke-width="3"></path></svg>
      </div>
      <div class="glass g-b tfx-h-lift"><b>+8%</b>Tickets closed</div>
      <div class="glass g-c tfx-h-lift"><b>94%</b>Satisfaction</div>
      <div class="glass g-d tfx-h-lift">
        <p class="glass-title">What changed this week</p>
        <p>First reply time fell by 19 minutes.</p>
        <div class="bars"><i style="width: 92%"></i><i style="width: 78%"></i><i style="width: 85%"></i><i style="width: 54%"></i></div>
      </div>
      <div class="glass g-e tfx-h-lift"><i></i><i></i><i></i></div>
    </div>
  </div>
</section>

<section class="logos" aria-label="Example customers">
  <div class="container">
    <p>Example customer names. Replace them with teams that use your product.</p>
    <ul>
      <li>Northwind Bakehouse</li>
      <li>Halcyon Freight</li>
      <li>Tallgrass Studio</li>
      <li>Brightwater Clinic</li>
      <li>Juniper Rail</li>
    </ul>
  </div>
</section>

<section class="section" id="features">
  <div class="container">
    <div class="head">
      <p class="kicker">Features</p>
      <h2>Everything between raw data and a report people read.</h2>
      <p class="lead">Connect your sources once. Fernlight keeps the numbers current, explains what changed and sends the report to the people who need it.</p>
    </div>
    <div class="cards tfx-e-deal">
      <article class="card tfx-h-lift" style="--tfx-i: 0">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8"></path></svg>
        <h3>Connect in minutes</h3>
        <p>Link spreadsheets, your help desk, CRM and SQL databases with read-only access. No engineering ticket needed.</p>
      </article>
      <article class="card tfx-h-lift" style="--tfx-i: 1">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"></rect><path d="M3 10h18M8 3v4M16 3v4M8.500 15.500l2 2 4-4"></path></svg>
        <h3>Reports on a schedule</h3>
        <p>Choose a day and time. The report arrives in Slack, email or as a PDF, with last week shown side by side.</p>
      </article>
      <article class="card tfx-h-lift" style="--tfx-i: 2">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"></path></svg>
        <h3>Changes explained</h3>
        <p>Each number comes with a short note on what moved and which segment caused it, so the meeting starts with answers.</p>
      </article>
      <article class="card tfx-h-lift" style="--tfx-i: 3">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a5 5 0 0 0-5 5v3l-2 4h14l-2-4V9a5 5 0 0 0-5-5zM10 19a2 2 0 0 0 4 0"></path></svg>
        <h3>Alerts when it matters</h3>
        <p>Set a threshold for any metric. Fernlight messages the owner the moment a number leaves its normal range.</p>
      </article>
      <article class="card tfx-h-lift" style="--tfx-i: 4">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.500"></circle><path d="M2.500 20a6.500 6.500 0 0 1 13 0M16 4.800a3.500 3.500 0 0 1 0 6.400M18 14.200a6.500 6.500 0 0 1 3.500 5.800"></path></svg>
        <h3>Built for the whole team</h3>
        <p>Comment on a chart, assign a follow-up and share a read-only link with people outside your workspace.</p>
      </article>
      <article class="card tfx-h-lift" style="--tfx-i: 5">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.500-3.200 7.800-8 9-4.800-1.200-8-4.500-8-9V6zM9 12l2 2 4-4"></path></svg>
        <h3>Access you control</h3>
        <p>Single sign-on, role-based permissions and an audit log of every view and export come with the Business plan.</p>
      </article>
    </div>
  </div>
</section>

<section class="section product" id="product">
  <div class="container">
    <div class="head center">
      <p class="kicker">Product</p>
      <h2>One page your whole team can read in two minutes.</h2>
      <p class="lead">Every report opens with the numbers, shows the trend and ends with a plain note on what changed.</p>
    </div>
    <div class="demo tfx-s-tilt-up">
      <p class="demo-bar"><i></i><i></i><i></i><span>Fernlight · Weekly reports</span></p>
      <div class="demo-body">
        <div class="demo-side">
          <p class="label">Reports</p>
          <p class="on">Support team</p>
          <p>Sales pipeline</p>
          <p>Product usage</p>
          <p>Hiring</p>
          <p class="label">Shared with</p>
          <p>Kenji Watanabe</p>
          <p>Sofia Marin</p>
          <p>Thandiwe Nkosi</p>
        </div>
        <div class="demo-main">
          <div class="demo-head">
            <h3>Support team · Week 46</h3>
            <p>Updated Monday 7:00 AM</p>
          </div>
          <div class="tiles">
            <p class="tile"><b>1,284</b>Tickets closed <span class="up">+8%</span></p>
            <p class="tile"><b>2h 14m</b>First reply <span class="up">19m faster</span></p>
            <p class="tile"><b>94%</b>Satisfaction <span class="up">+2 pts</span></p>
          </div>
          <div class="plot">
            <p class="legend"><span>Tickets closed</span><span>Tickets opened</span></p>
            <svg viewBox="0 0 720 240" aria-hidden="true" fill="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eead4" stop-opacity=".42"></stop><stop offset="1" stop-color="#5eead4" stop-opacity="0"></stop></linearGradient></defs><path d="M0 60h720M0 120h720M0 180h720" stroke="#ffffff" stroke-opacity=".1"></path><path d="M60 176C110 160 130 150 180 142s70 20 120 4 70-52 120-58 70 22 120 2 70-52 120-62V240H60z" fill="url(#area)"></path><path d="M60 150c50 6 70-30 120-26s70 40 120 30 70-44 120-40 70 34 120 26 70-20 120-30" stroke="#a78bfa" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"></path><path d="M60 176C110 160 130 150 180 142s70 20 120 4 70-52 120-58 70 22 120 2 70-52 120-62" stroke="#5eead4" stroke-width="4" stroke-linecap="round"></path><circle cx="660" cy="28" r="7" fill="#0a0b1f" stroke="#5eead4" stroke-width="4"></circle></svg>
            <p class="axis"><span>W41</span><span>W42</span><span>W43</span><span>W44</span><span>W45</span><span>W46</span></p>
          </div>
          <p class="insight"><b>What changed</b><span>Closed tickets rose 8% while new tickets stayed flat. Most of the gain came from the billing queue after the new reply templates went live on Tuesday.</span></p>
        </div>
      </div>
    </div>
    <div class="stats" aria-label="Product facts">
      <p><strong>40+</strong>data sources ready to connect</p>
      <p><strong>10<small>min</small></strong>typical time to a first report</p>
      <p><strong>3</strong>delivery channels: Slack, email and PDF</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <figure class="quote">
      <blockquote>I used to spend every Friday afternoon building the weekly deck. Now the report is in our channel before I open my laptop on Monday, and the team argues about decisions instead of numbers.</blockquote>
      <figcaption><span class="avatar">AO</span><span><b>Amara Okafor</b><br>Head of Operations, Northwind Bakehouse</span></figcaption>
      <p class="sample">Sample testimonial. Replace it with a quote from one of your own customers.</p>
    </figure>
  </div>
</section>

<section class="section pricing" id="pricing">
  <div class="container">
    <div class="head center">
      <p class="kicker">Pricing</p>
      <h2>Simple monthly pricing. Change or cancel anytime.</h2>
      <p class="lead">Prices are in US dollars and billed monthly. Viewers are always free.</p>
    </div>
    <div class="plans">
      <article class="plan tfx-h-lift">
        <h3>Starter</h3>
        <p>For one team trying its first report</p>
        <p class="price">$0<span>per month</span></p>
        <ul>
          <li>Up to 3 editors</li>
          <li>2 data sources</li>
          <li>1 scheduled report</li>
          <li>Email delivery</li>
        </ul>
        <a class="btn" href="https://example.com/signup">Start free</a>
      </article>
      <article class="plan featured tfx-h-trace">
        <p class="badge">Most popular</p>
        <h3>Team</h3>
        <p>For growing teams that report every week</p>
        <p class="price">$12<span>per editor / month</span></p>
        <ul>
          <li>Everything in Starter</li>
          <li>Unlimited data sources</li>
          <li>Unlimited scheduled reports</li>
          <li>Slack, email and PDF delivery</li>
          <li>Alerts and comments</li>
        </ul>
        <a class="btn btn-primary tfx-h-sheen" href="https://example.com/trial">Start a 14-day free trial</a>
      </article>
      <article class="plan tfx-h-lift">
        <h3>Business</h3>
        <p>For companies with security requirements</p>
        <p class="price">$29<span>per editor / month</span></p>
        <ul>
          <li>Everything in Team</li>
          <li>Single sign-on (SAML)</li>
          <li>Role-based permissions</li>
          <li>Audit log and data residency</li>
          <li>Priority support</li>
        </ul>
        <a class="btn" href="https://example.com/contact">Talk to sales</a>
      </article>
    </div>
  </div>
</section>

<section class="section" id="faq">
  <div class="container">
    <div class="head center">
      <p class="kicker">FAQ</p>
      <h2>Questions teams ask before they start</h2>
    </div>
    <div class="faq">
      <details open="">
        <summary>Will I be charged when the free trial ends?</summary>
        <p>No. The trial does not ask for a credit card. If you do not upgrade after 14 days, your workspace moves to the Starter plan and your reports stay where they are.</p>
      </details>
      <details>
        <summary>Does Fernlight store a copy of our data?</summary>
        <p>Fernlight reads your sources with read-only access and stores only the aggregated numbers that appear in your reports. You can delete them at any time from the workspace settings.</p>
      </details>
      <details>
        <summary>Who counts as an editor?</summary>
        <p>An editor is anyone who creates or changes a report. People who only read reports, comment on them or receive them by email are viewers, and viewers are free on every plan.</p>
      </details>
      <details>
        <summary>Can we keep the spreadsheets we use today?</summary>
        <p>Yes. Connect a spreadsheet as a data source and Fernlight reads the latest values every time a report runs. You do not need to move anything.</p>
      </details>
      <details>
        <summary>How do we get help?</summary>
        <p>Write to support@example.com. Team plans get a reply within one business day, and Business plans within four business hours.</p>
      </details>
    </div>
  </div>
</section>

<section class="cta">
  <div class="container">
    <div class="cta-box">
      <div class="cta-glow" aria-hidden="true"></div>
      <h2>Send your first report this week.</h2>
      <p>Connect a data source, pick a day and let Fernlight handle the rest. The Starter plan is free for as long as you need it.</p>
      <div class="actions">
        <a class="btn btn-primary tfx-h-sheen" href="https://example.com/signup">Start free</a>
        <a class="btn" href="https://example.com/contact">Talk to sales</a>
      </div>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <div class="brand">
      <a class="logo" href="#top">Fernlight</a>
      <p>Weekly team reports without the spreadsheet work.</p>
    </div>
    <nav aria-label="Footer">
      <a href="#features">Features</a>
      <a href="#product">Product</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
      <a href="https://example.com/privacy">Privacy</a>
      <a href="https://example.com/terms">Terms</a>
    </nav>
    <p class="legal">© 2026 Fernlight Labs, Inc. · hello@example.com · Fernlight is a fictional product used as a sample page.</p>
  </div>
</footer>


</body></html>
`;

  /* Website: Conference page */
  const CONFERENCE = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Signal &amp; Noise 2026 | Design and technology conference in Lisbon</title>
<style>
  :root {
    color-scheme: light;
    --ink: #0b0b0b;
    --ink-2: #33312c;
    --paper: #f6f3ea;
    --white: #ffffff;
    --yellow: #ffe600;
    --pink: #ff4fa3;
    --cobalt: #2742e0;
    --line: 4px solid var(--ink);
    --shadow: 8px 8px 0 var(--ink);
    --display: "Arial Black", "Helvetica Neue", "Segoe UI", system-ui, Arial, sans-serif;
    --font: "Helvetica Neue", "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font); font-size: 17px; line-height: 1.55; }
  h1, h2, h3, p, ul, figure { margin: 0; }
  ul { padding: 0; list-style: none; }
  a { color: inherit; }
  .container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; padding: 0 28px; border: var(--line); background: var(--white); box-shadow: 6px 6px 0 var(--ink); color: var(--ink); font-family: var(--display); font-size: 17px; font-weight: 900; letter-spacing: .02em; text-transform: uppercase; text-decoration: none; text-align: center; cursor: pointer; }
  .btn-pink { background: var(--pink); }
  .btn-yellow { background: var(--yellow); }
  .btn-ink { background: var(--ink); color: var(--white); box-shadow: 6px 6px 0 var(--pink); }

  .nav { padding: 20px 0 0; }
  .nav .container { display: flex; flex-wrap: wrap; gap: 12px; }
  .logo { display: flex; align-items: center; flex: 1 1 auto; min-height: 52px; padding: 0 18px; border: var(--line); background: var(--white); font-family: var(--display); font-size: 18px; font-weight: 900; letter-spacing: .01em; text-transform: uppercase; text-decoration: none; }
  .nav-links { display: grid; grid-template-columns: repeat(6, auto); flex: 3 1 auto; border: var(--line); background: var(--white); }
  .nav-links a { display: flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 14px; border-left: var(--line); font-family: var(--display); font-size: 15px; font-weight: 900; text-transform: uppercase; text-decoration: none; }
  .nav-links a:first-child { border-left: 0; }

  .hero { position: relative; overflow: hidden; padding: 56px 0 72px; }
  .hero::before { content: ""; position: absolute; left: 0; top: 64px; width: 12px; height: 220px; background: var(--yellow); }
  .hero::after { content: ""; position: absolute; right: 0; bottom: 72px; width: 12px; height: 120px; background: var(--cobalt); }
  .hero .container { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); align-items: center; gap: 32px; }
  .kicker { display: inline-block; padding: 4px 12px; border: 3px solid var(--ink); background: var(--white); font-size: 14px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .hero h1 { margin: 20px 0 22px; font-family: var(--display); font-size: clamp(48px, 8.4vw, 112px); line-height: .92; font-weight: 900; letter-spacing: -.03em; text-transform: uppercase; }
  .hero h1 span { display: block; }
  .lead { max-width: 34em; font-size: clamp(17px, 1.7vw, 20px); color: var(--ink-2); }
  .actions { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 30px; }

  .art { position: relative; display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); grid-template-rows: 170px 170px; gap: 14px; padding: 0 8px 8px 0; }
  .art .block { display: block; width: 100%; height: 100%; border: var(--line); }
  .art .b1 { background: var(--yellow); }
  .art .b2 { background: var(--cobalt); }
  .art .b3 { background: var(--ink); }
  .art .b4 { background: var(--pink); }
  .sticker { position: absolute; left: 6%; top: 50%; padding: 10px 18px; border: var(--line); background: var(--yellow); box-shadow: 6px 6px 0 var(--ink); font-family: var(--display); font-size: clamp(17px, 1.75vw, 22px); line-height: 1.2; font-weight: 900; text-transform: uppercase; white-space: nowrap; transform: translateY(-50%) rotate(-5deg); }

  .stats { padding: 0 0 80px; }
  .stats .container { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
  .stat { padding: 22px 24px 24px; border: var(--line); box-shadow: var(--shadow); font-size: 16px; font-weight: 700; }
  .stat strong { display: block; margin-bottom: 8px; font-family: var(--display); font-size: clamp(44px, 6vw, 76px); line-height: 1; font-weight: 900; letter-spacing: -.02em; }
  .stat.s1 { background: var(--yellow); }
  .stat.s2 { background: var(--pink); }
  .stat.s3 { background: var(--cobalt); color: var(--white); }

  .section { padding: 88px 0; border-top: var(--line); }
  .on-pink { background: var(--pink); }
  .on-yellow { background: var(--yellow); }
  .on-cobalt { background: var(--cobalt); }
  .head { display: grid; gap: 14px; max-width: 760px; margin-bottom: 44px; }
  .head .num { justify-self: start; padding: 2px 12px; background: var(--ink); color: var(--white); font-family: var(--display); font-size: 15px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
  .head h2 { font-family: var(--display); font-size: clamp(34px, 5.6vw, 68px); line-height: 1; font-weight: 900; letter-spacing: -.02em; text-transform: uppercase; }
  .head p { font-size: 18px; color: var(--ink-2); }
  .on-pink .head p, .on-yellow .head p { color: var(--ink); }
  .on-pink .head .num, .on-yellow .head .num { color: var(--white); }
  .on-cobalt .head h2, .on-cobalt .head p { color: var(--white); }
  .on-cobalt .head .num { background: var(--yellow); color: var(--ink); }

  .day { margin-top: 48px; }
  .day:first-of-type { margin-top: 0; }
  .day h3 { display: inline-block; padding: 8px 18px; border: var(--line); border-bottom: 0; font-family: var(--display); font-size: clamp(18px, 2.4vw, 24px); line-height: 1.2; font-weight: 900; text-transform: uppercase; }
  .day.d1 h3 { background: var(--yellow); }
  .day.d2 h3 { background: var(--pink); }
  .agenda { width: 100%; border: var(--line); border-collapse: collapse; background: var(--white); box-shadow: var(--shadow); text-align: left; }
  .agenda th { padding: 10px 18px; background: var(--ink); color: var(--white); font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .agenda td { padding: 16px 18px; border-top: 3px solid var(--ink); vertical-align: middle; }
  .agenda .time { width: 170px; font-family: var(--display); font-size: 20px; font-weight: 900; white-space: nowrap; }
  .agenda .time small { margin-left: 4px; font-family: var(--font); font-size: 12px; font-weight: 700; letter-spacing: .06em; }
  .agenda .title { font-size: 19px; font-weight: 800; line-height: 1.3; }
  .agenda .who { width: 24%; color: var(--ink-2); }
  .agenda .track { width: 130px; }
  .tag { display: inline-block; padding: 2px 10px; border: 2px solid var(--ink); background: var(--white); font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
  .tag.design { background: var(--yellow); }
  .tag.sound { background: var(--pink); }
  .tag.code { background: var(--cobalt); color: var(--white); }
  .tz { margin-top: 28px; font-size: 15px; font-weight: 700; }

  .speakers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .speaker { border: var(--line); background: var(--white); box-shadow: var(--shadow); }
  .face { display: flex; align-items: flex-end; justify-content: space-between; height: 170px; padding: 14px 18px; border-bottom: var(--line); font-family: var(--display); font-size: 72px; line-height: .9; font-weight: 900; letter-spacing: -.04em; }
  .face svg { flex: none; align-self: flex-start; width: 56px; height: 56px; }
  .face.yellow { background: var(--yellow); }
  .face.cobalt { background: var(--cobalt); color: var(--white); }
  .face.paper { background: var(--paper); }
  .face.ink { background: var(--ink); color: var(--yellow); }
  .speaker div { padding: 18px 20px 22px; }
  .speaker h3 { font-family: var(--display); font-size: 22px; line-height: 1.2; font-weight: 900; }
  .speaker .role { margin: 4px 0 10px; font-size: 14px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .speaker .bio { font-size: 16px; color: var(--ink-2); }

  .tickets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: stretch; gap: 28px; }
  .ticket { position: relative; display: flex; flex-direction: column; padding: 28px 26px; border: var(--line); background: var(--white); box-shadow: var(--shadow); }
  .ticket.featured { background: var(--yellow); }
  .ticket h3 { font-family: var(--display); font-size: 22px; line-height: 1.2; font-weight: 900; text-transform: uppercase; }
  .ticket .until { margin-top: 4px; font-size: 15px; font-weight: 700; color: var(--ink-2); }
  .ticket.featured .until { color: var(--ink); }
  .price { margin: 18px 0; padding: 10px 0; border-top: var(--line); border-bottom: var(--line); font-family: var(--display); font-size: clamp(48px, 5.4vw, 68px); line-height: 1; font-weight: 900; letter-spacing: -.03em; }
  .price small { margin-left: 8px; font-family: var(--font); font-size: 14px; font-weight: 700; letter-spacing: 0; }
  .ticket ul { flex: 1; display: grid; align-content: start; gap: 10px; margin-bottom: 26px; font-size: 16px; font-weight: 600; }
  .ticket li { position: relative; padding-left: 26px; }
  .ticket li::before { content: ""; position: absolute; left: 0; top: .42em; width: 12px; height: 12px; border: 3px solid var(--ink); background: var(--pink); }
  .ticket .btn { width: 100%; }
  .flag { position: absolute; top: -20px; right: 18px; padding: 4px 12px; border: 3px solid var(--ink); background: var(--pink); font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; transform: rotate(4deg); }

  .venue { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; gap: 48px; }
  .map { border: var(--line); background: var(--white); box-shadow: var(--shadow); }
  .map svg { display: block; width: 100%; height: auto; }
  .facts { display: grid; gap: 16px; }
  .facts li { padding: 16px 20px; border: var(--line); background: var(--white); }
  .facts b { display: block; font-family: var(--display); font-size: 15px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }

  .register { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); align-items: start; gap: 48px; }
  .register .head { margin-bottom: 0; }
  .form { display: grid; gap: 18px; padding: 30px 28px 32px; border: var(--line); background: var(--white); box-shadow: 8px 8px 0 var(--yellow); }
  .field { display: grid; gap: 6px; }
  .field label { font-family: var(--display); font-size: 14px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
  .field input, .field select, .field textarea { width: 100%; min-height: 52px; padding: 10px 14px; border: 3px solid var(--ink); border-radius: 0; background: var(--paper); color: var(--ink); font: inherit; }
  .field textarea { min-height: 92px; resize: vertical; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: 4px solid var(--pink); outline-offset: 2px; }
  .form .btn { width: 100%; margin-top: 6px; }
  .form .small { font-size: 14px; color: var(--ink-2); }

  .faq { display: grid; gap: 16px; max-width: 900px; }
  .faq details { border: var(--line); background: var(--white); }
  .faq summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 22px; font-size: 19px; font-weight: 800; list-style: none; cursor: pointer; }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after { content: "+"; display: grid; place-items: center; flex: none; width: 34px; height: 34px; border: 3px solid var(--ink); background: var(--yellow); font-family: var(--display); font-size: 20px; line-height: 1; }
  .faq [open] summary { border-bottom: 3px solid var(--ink); }
  .faq [open] summary::after { content: "−"; background: var(--pink); }
  .faq details p { padding: 16px 22px 20px; color: var(--ink-2); }

  .footer { padding: 56px 0 40px; border-top: var(--line); background: var(--ink); color: var(--paper); }
  .footer .container { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 28px; }
  .footer .big { font-family: var(--display); font-size: clamp(32px, 6vw, 72px); line-height: .95; font-weight: 900; letter-spacing: -.02em; text-transform: uppercase; color: var(--yellow); }
  .footer nav { display: flex; flex-wrap: wrap; gap: 10px 26px; font-weight: 700; }
  .legal { flex-basis: 100%; padding-top: 22px; border-top: 2px solid var(--paper); font-size: 14px; }

  @media (max-width: 1000px) {
    .hero .container { grid-template-columns: minmax(0, 1fr); gap: 44px; }
    .hero h1 { font-size: clamp(48px, 12.5vw, 112px); }
    .art { grid-template-rows: 120px 120px; }
    .sticker { font-size: clamp(17px, 3.4vw, 26px); }
    .speakers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tickets { grid-template-columns: minmax(0, 1fr); max-width: 520px; gap: 40px; }
    .venue, .register { grid-template-columns: minmax(0, 1fr); gap: 36px; }
    .agenda .who { width: 26%; }
  }
  @media (max-width: 680px) {
    body { font-size: 16px; }
    .container { padding: 0 16px; }
    .nav { padding-top: 16px; }
    .nav-links { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .nav-links a { padding: 0 6px; font-size: 13px; }
    .nav-links a:nth-child(4) { border-left: 0; }
    .nav-links a:nth-child(n + 4) { border-top: var(--line); }
    .hero { padding: 40px 0 56px; }
    .hero h1 { font-size: 13vw; }
    .hero::before { top: 40px; width: 8px; height: 140px; }
    .hero::after { width: 8px; }
    .actions .btn { flex: 1 1 100%; }
    .art { grid-template-rows: 96px 96px; gap: 10px; }
    .stats { padding-bottom: 64px; }
    .stats .container { grid-template-columns: minmax(0, 1fr); gap: 22px; }
    .stat { display: flex; align-items: center; gap: 16px; padding: 16px 20px; }
    .stat strong { flex: none; min-width: 2.6em; margin-bottom: 0; }
    .section { padding: 64px 0; }
    .head { margin-bottom: 36px; }
    .speakers { grid-template-columns: minmax(0, 1fr); }
    .face { height: 130px; font-size: 60px; }
    .agenda, .agenda tbody, .agenda td { display: block; }
    .agenda thead { display: none; }
    .agenda tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; padding: 14px 16px; border-top: 3px solid var(--ink); }
    .agenda tr:first-child { border-top: 0; }
    .agenda td { width: auto; padding: 0; border: 0; }
    .agenda .time { grid-column: 1; grid-row: 1; width: auto; font-size: 18px; }
    .agenda .track { grid-column: 2; grid-row: 1; width: auto; }
    .agenda .title { grid-column: 1 / -1; grid-row: 2; font-size: 18px; }
    .agenda .who { grid-column: 1 / -1; grid-row: 3; width: auto; }
    .form { padding: 22px 18px 24px; }
    .faq summary { padding: 16px; font-size: 17px; }
    .faq details p { padding: 14px 16px 18px; }
  }
</style>
<style data-he-style="fx">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-i { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --tfx-n { syntax: "<number>"; inherits: false; initial-value: 1; }
.tfx-h-underline { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)) !important; background-repeat: no-repeat !important; background-position: 0 100% !important; background-size: 0% calc(.1em * var(--tfx-k, 1)) !important; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
:where(.tfx-h-reticle) { position: relative; }
.tfx-e-deal > * { --tfx-k: inherit; --tfx-t: inherit; }</style><style data-he-style="fx-motion">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@media (prefers-reduced-motion: no-preference) {
  .tfx-h-lift { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1); }
  .tfx-h-underline { transition: background-size .4s cubic-bezier(.22,1,.36,1); }
  .tfx-h-reticle::before { content: ""; position: absolute; inset: calc(-6px * var(--tfx-k, 1)); pointer-events: none; --tfx-k: inherit; background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)), linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)); background-repeat: no-repeat; background-size: 14px 2px, 2px 14px, 14px 2px, 2px 14px, 14px 2px, 2px 14px, 14px 2px, 2px 14px; background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%; opacity: 0; transform: scale(.88); transition: opacity .2s cubic-bezier(.22,1,.36,1), transform .4s cubic-bezier(.3,1.45,.6,1); }
  @media (hover: hover) {
    .tfx-h-lift:hover { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
    .tfx-h-underline:hover { background-size: 100% calc(.1em * var(--tfx-k, 1)) !important; }
    .tfx-h-reticle:hover::before { opacity: 1; transform: none; }
  }
  .tfx-h-lift:is(:focus-visible, :focus-within) { transform: translateY(calc(-.35rem * var(--tfx-k, 1))); box-shadow: 0 calc(.15rem * var(--tfx-k, 1)) calc(.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .07), 0 calc(.8rem * var(--tfx-k, 1)) calc(1.6rem * var(--tfx-k, 1)) calc(-.35rem * var(--tfx-k, 1)) rgb(0 0 0 / .2); }
  .tfx-h-underline:focus-visible { background-size: 100% calc(.1em * var(--tfx-k, 1)) !important; }
  .tfx-h-reticle:is(:focus-visible, :focus-within)::before { opacity: 1; transform: none; }
  @media screen {
    @supports (animation-timeline: view()) {
      @keyframes tfx-deal { from { opacity: 0; transform: translateY(calc(1.5rem * var(--tfx-k, 1))) scale(calc(1 - .05 * var(--tfx-k, 1))); } }
      .tfx-e-deal > * { animation: tfx-deal linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15% + min(var(--tfx-i, 0), 7) * 6%, 3rem + var(--tfx-t, 0) * 3rem + min(var(--tfx-i, 0), 7) * 1rem) entry min(100%, 75% + var(--tfx-t, 0) * 25% + min(var(--tfx-i, 0), 7) * 6%, 16rem + var(--tfx-t, 0) * 4rem + min(var(--tfx-i, 0), 7) * 1rem); }
    }
  }
}</style></head>
<body id="top">
<header class="nav">
  <div class="container">
    <a class="logo" href="#top">Signal &amp; Noise ’26</a>
    <nav class="nav-links" aria-label="Main">
      <a href="#agenda" class="tfx-h-underline">Agenda</a>
      <a href="#speakers" class="tfx-h-underline">Speakers</a>
      <a href="#tickets" class="tfx-h-underline">Tickets</a>
      <a href="#venue" class="tfx-h-underline">Venue</a>
      <a href="#register" class="tfx-h-underline">Register</a>
      <a href="#faq" class="tfx-h-underline">FAQ</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="container">
    <div>
      <p class="kicker">Design × technology × sound</p>
      <h1><span>Signal &amp;</span><span>Noise 2026</span></h1>
      <p class="lead">Two loud days in Lisbon for people who design, build and break digital things. 28 speakers, 3 stages, one riverside warehouse and no slide templates allowed.</p>
      <div class="actions">
        <a class="btn btn-pink tfx-h-reticle" href="#tickets">Get tickets →</a>
        <a class="btn" href="#agenda">See the agenda</a>
      </div>
    </div>
    <div class="art">
      <svg class="block b1" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 75h40l14-45 22 90 22-104 22 118 20-84 16 50 14-25h130" fill="none" stroke="#0b0b0b" stroke-width="7" stroke-linejoin="miter" vector-effect="non-scaling-stroke"></path></svg>
      <svg class="block b2" viewBox="0 0 150 150" aria-hidden="true"><g fill="#ffffff"><circle cx="30" cy="30" r="9"></circle><circle cx="75" cy="30" r="5"></circle><circle cx="120" cy="30" r="11"></circle><circle cx="30" cy="75" r="5"></circle><circle cx="75" cy="75" r="13"></circle><circle cx="120" cy="75" r="6"></circle><circle cx="30" cy="120" r="12"></circle><circle cx="75" cy="120" r="6"></circle><circle cx="120" cy="120" r="8"></circle></g></svg>
      <svg class="block b4" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true"><g fill="#0b0b0b"><rect x="24" y="96" width="22" height="30"></rect><rect x="58" y="70" width="22" height="56"></rect><rect x="92" y="44" width="22" height="82"></rect><rect x="126" y="84" width="22" height="42"></rect><rect x="160" y="30" width="22" height="96"></rect><rect x="194" y="62" width="22" height="64"></rect><rect x="228" y="92" width="22" height="34"></rect><rect x="262" y="50" width="22" height="76"></rect></g></svg>
      <svg class="block b3" viewBox="0 0 150 150" aria-hidden="true"><path d="M75 18l12 40 40-12-28 30 28 30-40-12-12 40-12-40-40 12 28-30-28-30 40 12z" fill="#ffe600"></path></svg>
      <p class="sticker">Lisbon · May 14–15</p>
    </div>
  </div>
</section>

<section class="stats" aria-label="The conference in numbers">
  <div class="container">
    <p class="stat s1"><strong>28</strong>speakers from 14 countries</p>
    <p class="stat s2"><strong>36</strong>sessions on 3 stages</p>
    <p class="stat s3"><strong>1,200</strong>attendees under one roof</p>
  </div>
</section>

<section class="section" id="agenda">
  <div class="container">
    <div class="head">
      <p class="num">01 / Agenda</p>
      <h2>Two days, one main stage</h2>
      <p>The main stage runs a single track, so you never have to choose. Workshops and the sound lab run alongside it in the side halls.</p>
    </div>
    <div class="day d1">
      <h3>Day 1 · Thursday, May 14</h3>
      <table class="agenda">
        <thead>
          <tr><th scope="col">Time</th><th scope="col">Session</th><th scope="col">Speaker</th><th scope="col">Track</th></tr>
        </thead>
        <tbody>
          <tr><td class="time">09:00 <small>WEST</small></td><td class="title">Doors, coffee and badge pickup</td><td class="who">Everyone</td><td class="track"><span class="tag">Social</span></td></tr>
          <tr><td class="time">10:00 <small>WEST</small></td><td class="title">Keynote: Beyond the signal</td><td class="who">Inês Carvalho</td><td class="track"><span class="tag design">Design</span></td></tr>
          <tr><td class="time">11:30 <small>WEST</small></td><td class="title">Design systems that survive a reorg</td><td class="who">Kwame Mensah</td><td class="track"><span class="tag design">Design</span></td></tr>
          <tr><td class="time">14:00 <small>WEST</small></td><td class="title">Audio and algorithmic art, live on stage</td><td class="who">Yuki Tanaka</td><td class="track"><span class="tag sound">Sound</span></td></tr>
          <tr><td class="time">15:30 <small>WEST</small></td><td class="title">Shipping the browser as a creative tool</td><td class="who">Priya Raman</td><td class="track"><span class="tag code">Code</span></td></tr>
          <tr><td class="time">17:00 <small>WEST</small></td><td class="title">Panel: What we stopped measuring</td><td class="who">Leila Haddad and guests</td><td class="track"><span class="tag design">Design</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="day d2">
      <h3>Day 2 · Friday, May 15</h3>
      <table class="agenda">
        <thead>
          <tr><th scope="col">Time</th><th scope="col">Session</th><th scope="col">Speaker</th><th scope="col">Track</th></tr>
        </thead>
        <tbody>
          <tr><td class="time">09:30 <small>WEST</small></td><td class="title">Type at 900 weight: a love letter</td><td class="who">Mateo Rojas</td><td class="track"><span class="tag design">Design</span></td></tr>
          <tr><td class="time">11:00 <small>WEST</small></td><td class="title">Interfaces for people in a hurry</td><td class="who">Leila Haddad</td><td class="track"><span class="tag design">Design</span></td></tr>
          <tr><td class="time">13:30 <small>WEST</small></td><td class="title">Sensors, synths and 40 lines of code</td><td class="who">Yuki Tanaka and Priya Raman</td><td class="track"><span class="tag code">Code</span></td></tr>
          <tr><td class="time">15:00 <small>WEST</small></td><td class="title">Lightning talks: 8 ideas, 5 minutes each</td><td class="who">Community speakers</td><td class="track"><span class="tag sound">Sound</span></td></tr>
          <tr><td class="time">16:30 <small>WEST</small></td><td class="title">Closing panel: The noise worth keeping</td><td class="who">Inês Carvalho, Kwame Mensah</td><td class="track"><span class="tag design">Design</span></td></tr>
          <tr><td class="time">18:30 <small>WEST</small></td><td class="title">Closing party on the dock</td><td class="who">Everyone</td><td class="track"><span class="tag">Social</span></td></tr>
        </tbody>
      </table>
    </div>
    <p class="tz">All times are in Western European Summer Time (WEST, UTC+1).</p>
  </div>
</section>

<section class="section on-pink" id="speakers">
  <div class="container">
    <div class="head">
      <p class="num">02 / Speakers</p>
      <h2>People who make things loud</h2>
      <p>Six of the 28 voices on the main stage. The full list goes out to ticket holders on April 1.</p>
    </div>
    <div class="speakers tfx-e-deal">
      <article class="speaker tfx-h-lift" style="--tfx-i: 0">
        <p class="face yellow">IC<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24" fill="#0b0b0b"></circle></svg></p>
        <div>
          <h3>Inês Carvalho</h3>
          <p class="role">Design director, Atelier Maré</p>
          <p class="bio">Builds identity systems for museums and transit networks, and still sketches every one of them by hand first.</p>
        </div>
      </article>
      <article class="speaker tfx-h-lift" style="--tfx-i: 1">
        <p class="face cobalt">KM<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="6" y="6" width="44" height="44" fill="#ffe600"></rect></svg></p>
        <div>
          <h3>Kwame Mensah</h3>
          <p class="role">Head of design systems, Palmline</p>
          <p class="bio">Has kept one component library alive through three rebrands and tells the story without hiding the scars.</p>
        </div>
      </article>
      <article class="speaker tfx-h-lift" style="--tfx-i: 2">
        <p class="face ink">YT<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M28 4l24 48H4z" fill="#ff4fa3"></path></svg></p>
        <div>
          <h3>Yuki Tanaka</h3>
          <p class="role">Sound artist and creative coder</p>
          <p class="bio">Turns weather data, train timetables and broken radios into live sets. Bring earplugs, just in case.</p>
        </div>
      </article>
      <article class="speaker tfx-h-lift" style="--tfx-i: 3">
        <p class="face paper">PR<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M4 28a24 24 0 0 1 48 0z" fill="#2742e0"></path><path d="M4 32h48v8H4z" fill="#0b0b0b"></path></svg></p>
        <div>
          <h3>Priya Raman</h3>
          <p class="role">Staff engineer, Open Canvas Lab</p>
          <p class="bio">Works on graphics in the browser and believes the best design tool is the one you can view source on.</p>
        </div>
      </article>
      <article class="speaker tfx-h-lift" style="--tfx-i: 4">
        <p class="face yellow">LH<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M6 6h20v20H6zM30 30h20v20H30z" fill="#0b0b0b"></path><path d="M30 6h20v20H30z" fill="#ff4fa3"></path></svg></p>
        <div>
          <h3>Leila Haddad</h3>
          <p class="role">Product designer, public services</p>
          <p class="bio">Designs forms that millions of people fill in while standing in a queue, on a phone, with one hand.</p>
        </div>
      </article>
      <article class="speaker tfx-h-lift" style="--tfx-i: 5">
        <p class="face cobalt">MR<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M4 44h48v8H4zM4 24h48v8H4zM4 4h48v8H4z" fill="#ffffff"></path></svg></p>
        <div>
          <h3>Mateo Rojas</h3>
          <p class="role">Type designer, Fundición Norte</p>
          <p class="bio">Draws heavy grotesques for newspapers and football clubs. Will argue about the letter G for an hour.</p>
        </div>
      </article>
    </div>
  </div>
</section>

<section class="section" id="tickets">
  <div class="container">
    <div class="head">
      <p class="num">03 / Tickets</p>
      <h2>Pick your pass</h2>
      <p>Every pass covers both days, lunch and coffee. Prices are in US dollars and include tax.</p>
    </div>
    <div class="tickets">
      <article class="ticket tfx-h-lift">
        <h3>Early bird</h3>
        <p class="until">On sale until February 28</p>
        <p class="price">$199</p>
        <ul>
          <li>Both conference days</li>
          <li>Lunch and coffee each day</li>
          <li>Session recordings for 12 months</li>
        </ul>
        <a class="btn" href="#register">Get early bird</a>
      </article>
      <article class="ticket featured tfx-h-lift">
        <p class="flag">Most popular</p>
        <h3>Standard pass</h3>
        <p class="until">On sale from March 1</p>
        <p class="price">$349</p>
        <ul>
          <li>Both conference days</li>
          <li>Lunch and coffee each day</li>
          <li>Session recordings for 12 months</li>
          <li>Closing party on the dock</li>
        </ul>
        <a class="btn btn-pink" href="#register">Get standard</a>
      </article>
      <article class="ticket tfx-h-lift">
        <h3>VIP all access</h3>
        <p class="until">Limited to 80 passes</p>
        <p class="price">$599</p>
        <ul>
          <li>Everything in the Standard pass</li>
          <li>Front-row seating on the main stage</li>
          <li>Speaker dinner on May 13</li>
          <li>One half-day workshop of your choice</li>
        </ul>
        <a class="btn btn-ink" href="#register">Get VIP</a>
      </article>
    </div>
  </div>
</section>

<section class="section on-yellow" id="venue">
  <div class="container">
    <div class="head">
      <p class="num">04 / Venue</p>
      <h2>Armazém 16, on the river</h2>
      <p>A converted shipping warehouse on the Alcântara docks, 15 minutes from the city center. High ceilings, concrete floors and a terrace facing the Tagus.</p>
    </div>
    <div class="venue">
      <figure class="map" role="img" aria-label="Simplified map: the venue sits on the riverfront, next to the tram line">
        <svg viewBox="0 0 480 320">
          <rect width="480" height="320" fill="#f6f3ea"></rect>
          <path d="M0 236l480-40v124H0z" fill="#2742e0"></path>
          <path d="M0 258l480-40M0 284l480-40" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="26 18"></path>
          <path d="M0 96h480M0 170l480-34M120 0v228M300 0v212M410 0v204" fill="none" stroke="#0b0b0b" stroke-width="8"></path>
          <path d="M22 20h76v54H22zM142 20h136v54H142zM322 20h66v54h-66zM142 118h136v32l-136 10zM22 118h76v48l-76 6z" fill="#ff4fa3" stroke="#0b0b0b" stroke-width="4"></path>
          <path d="M322 118h66v22l-66 5zM432 20h48v54h-48z" fill="#ffe600" stroke="#0b0b0b" stroke-width="4"></path>
          <path d="M196 196l96-8v-42l-96 8z" fill="#0b0b0b"></path>
          <circle cx="244" cy="112" r="34" fill="#ffe600" stroke="#0b0b0b" stroke-width="8"></circle>
          <path d="M244 146v26" stroke="#0b0b0b" stroke-width="8"></path>
          <circle cx="244" cy="112" r="11" fill="#0b0b0b"></circle>
        </svg>
      </figure>
      <ul class="facts">
        <li><b>Address</b>Armazém 16, Doca de Alcântara, 1350-352 Lisbon, Portugal</li>
        <li><b>Getting there</b>Tram 15E to Alcântara-Mar, then a 4-minute walk. Bike parking is at the east gate.</li>
        <li><b>Doors</b>Open at 09:00 WEST on both days. Badge pickup closes at 12:00 WEST.</li>
        <li><b>Access</b>Step-free entrances, a quiet room, live captions on the main stage and gender-neutral restrooms.</li>
      </ul>
    </div>
  </div>
</section>

<section class="section on-cobalt" id="register">
  <div class="container register">
    <div class="head">
      <p class="num">05 / Register</p>
      <h2>Save your seat</h2>
      <p>Fill in the form and we will email a payment link within one business day. Your seat is held for 72 hours.</p>
      <p>Coming with a team of 5 or more? Write to hello@example.com for a group rate.</p>
    </div>
    <form class="form" action="https://example.com/register" method="post">
      <p class="field">
        <label for="reg-name">Full name</label>
        <input id="reg-name" name="name" type="text" autocomplete="name" required="">
      </p>
      <p class="field">
        <label for="reg-email">Email</label>
        <input id="reg-email" name="email" type="email" autocomplete="email" required="">
      </p>
      <p class="field">
        <label for="reg-ticket">Ticket type</label>
        <select id="reg-ticket" name="ticket" required="">
          <option value="early">Early bird, $199</option>
          <option value="standard" selected="">Standard pass, $349</option>
          <option value="vip">VIP all access, $599</option>
        </select>
      </p>
      <p class="field">
        <label for="reg-diet">Dietary needs</label>
        <textarea id="reg-diet" name="dietary" rows="3"></textarea>
      </p>
      <button class="btn btn-yellow tfx-h-reticle" type="submit">Reserve my ticket</button>
      <p class="small">We use your details only to organize this event. Read the privacy notice at https://example.com/privacy.</p>
    </form>
  </div>
</section>

<section class="section" id="faq">
  <div class="container">
    <div class="head">
      <p class="num">06 / FAQ</p>
      <h2>Good to know</h2>
    </div>
    <div class="faq">
      <details open="">
        <summary>Can I get a refund or transfer my ticket?</summary>
        <p>Refunds are available until April 14, 2026. After that date you can transfer your ticket to another person at no cost, up to the morning of the event.</p>
      </details>
      <details>
        <summary>Will the talks be recorded?</summary>
        <p>Yes. All main stage sessions are recorded with captions and sent to ticket holders within two weeks. Workshops are not recorded.</p>
      </details>
      <details>
        <summary>What language are the sessions in?</summary>
        <p>All sessions are in English. Live captions run on the main stage, and Portuguese interpretation is available for both keynotes.</p>
      </details>
      <details>
        <summary>Is there a code of conduct?</summary>
        <p>Yes. Everyone at the event, including speakers, staff and sponsors, agrees to it when they register. You can report a concern to any staff member or to conduct@example.com.</p>
      </details>
      <details>
        <summary>Can my company sponsor the event?</summary>
        <p>We have a small number of partner spots left. Write to partners@example.com and we will send the details.</p>
      </details>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <p class="big">See you<br>in Lisbon.</p>
    <nav aria-label="Footer">
      <a href="#agenda">Agenda</a>
      <a href="#speakers">Speakers</a>
      <a href="#tickets">Tickets</a>
      <a href="#venue">Venue</a>
      <a href="https://example.com/conduct">Code of conduct</a>
      <a href="https://example.com/privacy">Privacy</a>
    </nav>
    <p class="legal">© 2026 Signal &amp; Noise · hello@example.com · Signal &amp; Noise 2026 is a fictional event used as a sample page. The people, companies and venue are invented.</p>
  </div>
</footer>


</body></html>
`;

  /* Website: Case study */
  const CASESTUDY = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rebuilding checkout for Harborlight Bakery | Brightpine Studio</title>
<style>
  :root {
    color-scheme: light;
    --ink: #121212;
    --ink-2: #4d4a45;
    --paper: #ffffff;
    --page: #ede4d3;
    --cream: #ece4d4;
    --sand: #d9b886;
    --terra: #cf6a3d;
    --terra-deep: #9a4018;
    --navy: #14263f;
    --line: #e4ddd0;
    --wire: #d8d2c6;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    --serif: Georgia, "Times New Roman", serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--page); color: var(--ink); font-family: var(--font); font-size: 17px; line-height: 1.6; }
  h1, h2, h3, p, figure, blockquote, dl, dd, ol { margin: 0; }
  ol { padding: 0; list-style: none; }
  a { color: inherit; text-decoration: none; }
  .sheet { max-width: 1240px; margin: 40px auto; background: var(--paper); overflow: hidden; }
  .pad { padding-left: 72px; padding-right: 72px; }

  .terra { background: var(--terra); }
  .sand { background: var(--sand); }
  .cream { background: var(--cream); }
  .navy { background: var(--navy); }
  .hole { background: var(--paper); }

  .top { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-top: 28px; padding-bottom: 28px; font-size: 15px; }
  .studio { display: inline-flex; align-items: center; gap: 12px; font-weight: 700; letter-spacing: -.01em; }
  .mark { display: grid; grid-template-columns: 11px 11px; grid-template-rows: 11px 11px; flex: none; }
  .mark i { display: block; }
  .mark i:nth-child(1) { background: var(--terra); border-radius: 100% 0 0 0; }
  .mark i:nth-child(2) { background: var(--sand); border-radius: 0 100% 0 0; }
  .mark i:nth-child(3) { background: var(--navy); border-radius: 0 0 0 100%; }
  .mark i:nth-child(4) { background: var(--terra); border-radius: 50%; }
  .top nav { display: flex; gap: 32px; color: var(--ink-2); }
  .top nav a { padding: 6px 0; }
  .top nav a[aria-current] { color: var(--ink); font-weight: 600; }

  .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); align-items: center; gap: 56px; padding-top: 56px; padding-bottom: 72px; }
  .num { font-size: clamp(64px, 8vw, 104px); line-height: 1; font-weight: 800; letter-spacing: -.04em; }
  .hero h1 { margin: 36px 0 40px; font-size: clamp(34px, 4.4vw, 56px); line-height: 1.12; font-weight: 500; letter-spacing: -.025em; }
  .summary { max-width: 27em; color: var(--ink-2); }

  .art { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); aspect-ratio: 1; width: 100%; max-width: 540px; margin-left: auto; }
  .arch-l { grid-area: 1 / 2 / 3 / 3; border-radius: 100% 0 0 0 / 50% 0 0 0; }
  .arch-r { grid-area: 1 / 3 / 3 / 4; border-radius: 0 100% 0 0 / 0 50% 0 0; }
  .arch-hole { grid-area: 1 / 2 / 3 / 4; justify-self: center; align-self: end; width: 50%; height: 75%; border-radius: 999px 999px 0 0; }
  .dot { grid-area: 2 / 2 / 3 / 4; justify-self: center; align-self: center; width: 26%; aspect-ratio: 1; border-radius: 50%; }
  .half-l { grid-area: 1 / 4 / 2 / 5; justify-self: start; width: 50%; border-radius: 100% 0 0 100% / 50% 0 0 50%; }
  .half-r { grid-area: 1 / 4 / 2 / 5; justify-self: end; width: 50%; border-radius: 0 100% 100% 0 / 0 50% 50% 0; }
  .bowl-a { grid-area: 2 / 4 / 3 / 5; align-self: start; height: 50%; border-radius: 0 0 50% 50% / 0 0 100% 100%; }
  .bowl-b { grid-area: 2 / 4 / 3 / 5; align-self: end; height: 50%; border-radius: 0 0 50% 50% / 0 0 100% 100%; }
  .pill { grid-area: 2 / 1 / 3 / 2; justify-self: end; width: 62%; border-radius: 999px 999px 0 0; }
  .bowl-c { grid-area: 3 / 1 / 4 / 3; border-radius: 0 0 50% 50% / 0 0 100% 100%; }
  .bowl-d { grid-area: 4 / 1 / 5 / 3; border-radius: 0 0 50% 50% / 0 0 100% 100%; }
  .ball { grid-area: 3 / 3 / 4 / 4; border-radius: 50%; }
  .quarter { grid-area: 4 / 3 / 5 / 4; border-radius: 100% 0 0 0; }
  .gate { grid-area: 3 / 4 / 5 / 5; border-radius: 50% 50% 0 0 / 25% 25% 0 0; }
  .gate-hole { grid-area: 3 / 4 / 5 / 5; justify-self: center; align-self: end; width: 36%; height: 62%; border-radius: 999px 999px 0 0; }

  .facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; padding-top: 28px; padding-bottom: 28px; border-top: 1px solid var(--line); }
  .facts dt, .kicker, .cap b { font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); }
  .facts dd { margin-top: 6px; font-size: 16px; }

  .results { display: grid; grid-template-columns: repeat(3, minmax(0, auto)) minmax(0, 1fr); align-items: end; gap: 24px 64px; padding-top: 44px; padding-bottom: 80px; border-top: 1px solid var(--line); }
  .results strong { display: block; font-size: clamp(34px, 4.4vw, 52px); line-height: 1.1; font-weight: 800; letter-spacing: -.03em; }
  .results small { margin-left: 4px; font-size: .5em; letter-spacing: 0; }
  .results .label { margin-top: 6px; font-size: 16px; }
  .results .was { font-size: 14px; color: var(--ink-2); }
  .results .how { justify-self: end; max-width: 22em; font-size: 13px; line-height: 1.55; color: var(--ink-2); }

  .block { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 48px; padding-top: 96px; padding-bottom: 96px; }
  .kicker { padding-top: 14px; }
  .kicker span { color: var(--terra-deep); }
  .block h2, .approach h2, .screens h2 { font-size: clamp(28px, 3.4vw, 42px); line-height: 1.16; font-weight: 500; letter-spacing: -.02em; }
  .prose { display: grid; gap: 20px; max-width: 38em; margin-top: 28px; color: var(--ink-2); }
  .aside { margin-top: 36px; padding: 22px 26px; max-width: 30em; background: var(--cream); border-radius: 0 28px 28px 0; border-left: 6px solid var(--terra); font-size: 16px; }
  .aside b { font-size: 20px; }

  .approach { padding-top: 96px; padding-bottom: 96px; background: var(--cream); }
  .approach-head { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 48px; margin-bottom: 64px; }
  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; }
  .step h3 { margin: 28px 0 10px; font-size: 21px; line-height: 1.3; font-weight: 600; letter-spacing: -.01em; }
  .step h3 span { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--terra-deep); }
  .step p { font-size: 16px; color: var(--ink-2); }
  .mini { display: grid; grid-template-columns: 48px 48px 48px; grid-template-rows: 48px 48px; }
  .mini i { display: block; }
  .r-tl { border-radius: 100% 0 0 0; }
  .r-tr { border-radius: 0 100% 0 0; }
  .r-br { border-radius: 0 0 100% 0; }
  .r-bl { border-radius: 0 0 0 100%; }
  .r-all { border-radius: 50%; }
  .r-top { border-radius: 999px 999px 0 0; }
  .r-bot { border-radius: 0 0 999px 999px; }
  .paper { background: var(--paper); }

  .screens { padding-top: 96px; padding-bottom: 104px; }
  .screens-head { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 48px; margin-bottom: 64px; }
  .gallery { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 32px; align-items: start; }
  .shot-1 { grid-column: 1 / 6; }
  .shot-2 { grid-column: 6 / 13; margin-top: 120px; }
  .shot-3 { grid-column: 3 / 9; margin-top: 24px; }
  .frame { display: grid; place-items: center; padding: 48px 24px; border-radius: 4px; }
  .frame.tall { padding: 64px 24px; border-radius: 200px 200px 4px 4px; }
  .frame.wide { border-radius: 4px 120px 4px 4px; }
  .frame.low { border-radius: 4px 4px 4px 160px; }
  .cap { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; margin-top: 16px; font-size: 14px; line-height: 1.5; color: var(--ink-2); }
  .cap b { padding-top: 2px; color: var(--ink); }

  .phone { display: grid; gap: 12px; width: 216px; padding: 22px 16px 18px; background: var(--paper); border: 2px solid var(--ink); border-radius: 30px; font-size: 13px; line-height: 1.3; }
  .phone .title { font-size: 15px; font-weight: 700; }
  .row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
  .thumb { display: block; width: 34px; height: 34px; border-radius: 50% 50% 4px 4px; }
  .ln { display: block; height: 8px; border-radius: 4px; background: var(--wire); }
  .ln + .ln { margin-top: 6px; }
  .w40 { width: 40%; }
  .w60 { width: 60%; }
  .w80 { width: 80%; }
  .sum { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--line); font-weight: 700; }
  .pay { display: block; padding: 11px 0; border-radius: 99px; background: var(--navy); color: #fff; font-weight: 700; text-align: center; }
  .field { display: block; padding: 9px 12px; border: 1.5px solid var(--wire); border-radius: 8px; color: var(--ink-2); }
  .tick { display: grid; place-items: center; width: 64px; height: 64px; margin: 6px auto 2px; border-radius: 50%; background: var(--terra); }
  .tick i { display: block; width: 26px; height: 13px; margin-top: -6px; border: solid #fff; border-width: 0 0 4px 4px; transform: rotate(-45deg); }
  .center { text-align: center; }
  .slot { padding: 12px; border-radius: 12px; background: var(--cream); text-align: center; }
  .slot b { display: block; font-size: 17px; }

  .browser { width: 100%; max-width: 520px; background: var(--paper); border: 2px solid var(--ink); border-radius: 12px; font-size: 13px; line-height: 1.3; overflow: hidden; }
  .chrome { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 2px solid var(--ink); }
  .chrome i { display: block; width: 9px; height: 9px; border-radius: 50%; background: var(--ink); }
  .chrome .ln { flex: 1; margin-left: 10px; background: var(--cream); }
  .panes { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 20px; padding: 20px; }
  .pane { display: grid; gap: 10px; align-content: start; }
  .pane.card { padding: 14px; border-radius: 10px; background: var(--cream); }
  .pane .title { font-size: 15px; font-weight: 700; }
  .stepper { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .stepper i { display: block; height: 5px; border-radius: 3px; background: var(--wire); }
  .stepper i:first-child { background: var(--terra); }

  .voice { position: relative; padding-top: 104px; padding-bottom: 104px; background: var(--navy); color: #f4eee2; }
  .voice figure { position: relative; max-width: 780px; }
  .voice blockquote { font-family: var(--serif); font-size: clamp(22px, 2.9vw, 34px); line-height: 1.4; }
  .voice figcaption { margin-top: 32px; font-size: 16px; }
  .voice figcaption span { display: block; color: #cfc8ba; }
  .voice .sample { margin-top: 24px; font-size: 13px; color: #cfc8ba; }
  .voice-art { position: absolute; top: 0; right: 0; display: grid; grid-template-columns: 96px 96px; grid-template-rows: 96px 96px 96px; }
  .voice-art i { display: block; }

  .learned { display: grid; gap: 0; margin-top: 36px; max-width: 40em; }
  .learned li { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; padding: 22px 0; border-top: 1px solid var(--line); color: var(--ink-2); }
  .learned li b { color: var(--ink); }
  .learned .n { font-size: 13px; font-weight: 700; letter-spacing: .14em; color: var(--terra-deep); padding-top: 4px; }
  .credits { margin-top: 32px; font-size: 14px; color: var(--ink-2); }

  .next { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 48px; padding-top: 80px; padding-bottom: 0; background: var(--cream); }
  .next-text { padding-bottom: 80px; }
  .next .num { font-size: clamp(48px, 6vw, 72px); margin-top: 18px; }
  .next h2 { margin: 20px 0 28px; max-width: 16em; font-size: clamp(28px, 3.6vw, 44px); line-height: 1.15; font-weight: 500; letter-spacing: -.02em; }
  .go { display: inline-block; padding: 4px 0; font-size: 17px; font-weight: 700; color: var(--terra-deep); }
  .next-art { display: grid; grid-template-columns: repeat(3, 88px); grid-template-rows: repeat(3, 88px); }
  .next-art i { display: block; }

  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px 32px; padding-top: 36px; padding-bottom: 40px; font-size: 14px; color: var(--ink-2); }
  .foot nav { display: flex; flex-wrap: wrap; gap: 8px 28px; }
  .foot nav a { padding: 4px 0; }
  .legal { flex-basis: 100%; padding-top: 20px; border-top: 1px solid var(--line); font-size: 13px; }

  @media (max-width: 1280px) {
    .sheet { margin: 0 auto; }
  }
  @media (max-width: 900px) {
    .pad { padding-left: 40px; padding-right: 40px; }
    .hero { grid-template-columns: minmax(0, 1fr); gap: 48px; padding-top: 40px; }
    .art { max-width: 460px; margin-left: 0; }
    .results { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 32px; }
    .results .how { grid-column: 1 / -1; justify-self: start; max-width: 34em; }
    .block, .approach-head, .screens-head { grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .block, .approach, .screens { padding-top: 72px; padding-bottom: 72px; }
    .kicker { padding-top: 0; }
    .steps { gap: 28px; }
    .mini { grid-template-columns: 36px 36px 36px; grid-template-rows: 36px 36px; }
    .gallery { gap: 24px; }
    .shot-1 { grid-column: 1 / 7; }
    .shot-2 { grid-column: 1 / 13; grid-row: 2; margin-top: 16px; }
    .shot-3 { grid-column: 7 / 13; grid-row: 1; margin-top: 72px; }
    .voice-art { grid-template-columns: 56px 56px; grid-template-rows: 56px 56px 56px; }
    .voice { padding-top: 200px; padding-bottom: 80px; }
    .next-art { grid-template-columns: repeat(3, 60px); grid-template-rows: repeat(3, 60px); }
  }
  @media (max-width: 640px) {
    body { font-size: 16px; }
    .pad { padding-left: 20px; padding-right: 20px; }
    .top nav { gap: 20px; }
    .hero { padding-bottom: 56px; }
    .hero h1 { margin: 28px 0 28px; }
    .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .results { grid-template-columns: minmax(0, 1fr); padding-bottom: 56px; }
    .steps { grid-template-columns: minmax(0, 1fr); gap: 44px; }
    .mini { grid-template-columns: 48px 48px 48px; grid-template-rows: 48px 48px; }
    .gallery { grid-template-columns: minmax(0, 1fr); }
    .shot-1, .shot-2, .shot-3 { grid-column: 1; grid-row: auto; margin-top: 0; }
    .frame.tall { border-radius: 160px 160px 4px 4px; }
    .panes { grid-template-columns: minmax(0, 1fr); padding: 16px; }
    .learned li { grid-template-columns: 40px minmax(0, 1fr); }
    .next { grid-template-columns: minmax(0, 1fr); gap: 0; padding-top: 56px; }
    .next-text { padding-bottom: 48px; }
    .next-art { justify-self: end; }
  }
</style>
<style data-he-style="fx">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@property --tfx-k { syntax: "<number>"; inherits: false; initial-value: 1; }
@property --tfx-t { syntax: "<number>"; inherits: false; initial-value: 0; }
.tfx-h-underline { background-image: linear-gradient(var(--tfx-color, currentColor), var(--tfx-color, currentColor)) !important; background-repeat: no-repeat !important; background-position: 0 100% !important; background-size: 0% calc(.1em * var(--tfx-k, 1)) !important; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.tfx-h-zoom { overflow: hidden; overflow: clip; --tfx-zs: calc(1 + .07 * var(--tfx-k, 1)); }</style><style data-he-style="fx-motion">/* Tactile effects: generated from the tfx-* classes in the page. Change them in the editor, under Effects. */
@media (prefers-reduced-motion: no-preference) {
  .tfx-h-underline { transition: background-size .4s cubic-bezier(.22,1,.36,1); }
  .tfx-h-zoom img, .tfx-h-zoom video { transition: transform .7s cubic-bezier(.22,1,.36,1); }
  @media (hover: hover) {
    .tfx-h-underline:hover { background-size: 100% calc(.1em * var(--tfx-k, 1)) !important; }
    .tfx-h-zoom:hover img, .tfx-h-zoom:hover video { transform: scale(var(--tfx-zs, 1.07)); }
  }
  .tfx-h-underline:focus-visible { background-size: 100% calc(.1em * var(--tfx-k, 1)) !important; }
  .tfx-h-zoom:is(:focus-visible, :focus-within) img, .tfx-h-zoom:is(:focus-visible, :focus-within) video { transform: scale(var(--tfx-zs, 1.07)); }
  @media screen {
    @supports (animation-timeline: view()) {
      @keyframes tfx-blur-rise { from { opacity: 0; transform: translateY(calc(1.25rem * var(--tfx-k, 1))); filter: blur(calc(6px * var(--tfx-k, 1))); } }
      .tfx-e-blur-rise { animation: tfx-blur-rise linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: entry min(15% + var(--tfx-t, 0) * 15%, 3rem + var(--tfx-t, 0) * 3rem) entry min(75% + var(--tfx-t, 0) * 25%, 16rem + var(--tfx-t, 0) * 4rem); }
      @keyframes tfx-parallax { from { transform: translateY(calc(12% * var(--tfx-k, 1))); } to { transform: translateY(calc(-12% * var(--tfx-k, 1))); } }
      .tfx-s-parallax { animation: tfx-parallax linear both; animation-duration: 1ms; animation-duration: auto; animation-timeline: view(); animation-range: cover 0% cover 100%; }
    }
  }
}</style></head>
<body id="top">
<div class="sheet">
<header class="top pad">
  <a class="studio" href="#top"><span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Brightpine Studio</a>
  <nav aria-label="Main">
    <a href="https://example.com/work" aria-current="page">Work</a>
    <a href="https://example.com/about">About</a>
    <a href="mailto:hello@example.com">Contact</a>
  </nav>
</header>

<section class="hero pad">
  <div>
    <p class="num">03</p>
    <h1>Rebuilding checkout for Harborlight Bakery</h1>
    <p class="summary">A neighborhood bakery was losing most of its online orders on the last screen. We rebuilt the checkout around one question: how fast can a regular order tomorrow's bread?</p>
  </div>
  <div class="art" role="img" aria-label="Abstract illustration made of arches, circles and half circles">
    <div class="arch-l terra"></div>
    <div class="arch-r sand"></div>
    <div class="arch-hole hole"></div>
    <div class="dot cream tfx-s-parallax"></div>
    <div class="half-l sand"></div>
    <div class="half-r navy"></div>
    <div class="bowl-a cream"></div>
    <div class="bowl-b sand"></div>
    <div class="pill cream"></div>
    <div class="bowl-c sand"></div>
    <div class="bowl-d terra"></div>
    <div class="ball terra tfx-s-parallax"></div>
    <div class="quarter navy"></div>
    <div class="gate terra"></div>
    <div class="gate-hole hole"></div>
  </div>
</section>

<dl class="facts pad">
  <div><dt>Client</dt><dd>Harborlight Bakery</dd></div>
  <div><dt>Year</dt><dd>2026</dd></div>
  <div><dt>Role</dt><dd>Research, UX and UI design</dd></div>
  <div><dt>Duration</dt><dd>14 weeks</dd></div>
</dl>

<section class="results pad" aria-label="Results">
  <p><strong>+38%</strong><span class="label">Conversion</span><br><span class="was">from 2.1% to 2.9%</span></p>
  <p><strong>1.8<small>min</small></strong><span class="label">Average checkout time</span><br><span class="was">down from 4.6 min</span></p>
  <p><strong>−42%</strong><span class="label">Abandoned carts</span><br><span class="was">from 71% to 41%</span></p>
  <p class="how">Measured over the 8 weeks after launch and compared with the 8 weeks before. Sample figures for a fictional project.</p>
</section>

<section class="block pad">
  <p class="kicker"><span>01</span> · The problem</p>
  <div>
    <h2 class="tfx-e-blur-rise">Seven screens stood between a customer and a loaf of bread.</h2>
    <div class="prose">
      <p>Harborlight sells out most mornings, so regulars order the night before. The old checkout asked them to create an account, confirm an email address and type a full delivery address, even for an order they would pick up at the counter.</p>
      <p>On a phone, the pickup time sat below the fold on the fifth screen. People chose their bread, reached the payment form and left.</p>
    </div>
    <p class="aside"><b>71%</b> of carts were abandoned, and 8 in 10 of them were started on a phone.</p>
  </div>
</section>

<section class="approach pad">
  <div class="approach-head">
    <p class="kicker"><span>02</span> · The approach</p>
    <h2>Watch first, remove second, design last.</h2>
  </div>
  <ol class="steps">
    <li class="step">
      <div class="mini" aria-hidden="true"><i class="terra r-all"></i><i class="navy r-tr"></i><i></i><i class="sand r-bl"></i><i class="paper r-all"></i><i></i></div>
      <h3><span>STEP 1</span>Stand behind the counter</h3>
      <p>We spent 3 mornings in the shop and watched 12 regulars place an order on their own phones. Nine of them gave up at the account form.</p>
    </li>
    <li class="step">
      <div class="mini" aria-hidden="true"><i class="sand r-top"></i><i></i><i class="terra r-tl"></i><i class="sand"></i><i class="navy r-all"></i><i class="terra"></i></div>
      <h3><span>STEP 2</span>Cut the flow to 3 screens</h3>
      <p>Basket, pickup time, payment. Guest checkout became the default, and the address form appears only when someone asks for delivery.</p>
    </li>
    <li class="step">
      <div class="mini" aria-hidden="true"><i class="navy r-tl"></i><i class="terra r-tr"></i><i class="paper r-all"></i><i class="navy r-bl"></i><i class="terra r-br"></i><i class="sand r-bot"></i></div>
      <h3><span>STEP 3</span>Test with real orders</h3>
      <p>For 2 weeks, half of all visitors saw the new flow. We tuned labels and button sizes every few days, then launched it for everyone.</p>
    </li>
  </ol>
</section>

<section class="screens pad">
  <div class="screens-head">
    <p class="kicker"><span>03</span> · The screens</p>
    <h2>Three screens, one decision on each.</h2>
  </div>
  <div class="gallery">
    <figure class="shot shot-1">
      <div class="frame tall sand tfx-h-zoom">
        <div class="phone">
          <p class="title">Your basket</p>
          <div class="row"><i class="thumb terra"></i><span><i class="ln w80"></i><i class="ln w40"></i></span><b>$8</b></div>
          <div class="row"><i class="thumb sand"></i><span><i class="ln w60"></i><i class="ln w40"></i></span><b>$6</b></div>
          <div class="row"><i class="thumb navy"></i><span><i class="ln w80"></i><i class="ln w60"></i></span><b>$5</b></div>
          <p class="sum"><span>Total</span><span>$19</span></p>
          <span class="pay">Choose pickup time</span>
        </div>
      </div>
      <figcaption class="cap"><b>Fig. 1</b>The basket shows the total and one button. Nothing asks for an account.</figcaption>
    </figure>
    <figure class="shot shot-2">
      <div class="frame wide navy tfx-h-zoom">
        <div class="browser">
          <div class="chrome"><i></i><i></i><i></i><span class="ln"></span></div>
          <div class="panes">
            <div class="pane">
              <div class="stepper"><i></i><i></i><i></i></div>
              <p class="title">Payment</p>
              <span class="field">Name on card</span>
              <span class="field">Card number</span>
              <span class="pay">Pay $19</span>
            </div>
            <div class="pane card">
              <p class="title">Pickup</p>
              <p>Tomorrow, 8:30 AM</p>
              <i class="ln w80"></i>
              <i class="ln w60"></i>
              <p class="sum"><span>Total</span><span>$19</span></p>
            </div>
          </div>
        </div>
      </div>
      <figcaption class="cap"><b>Fig. 2</b>On a laptop, the order summary stays beside the payment form, so the total is always in view.</figcaption>
    </figure>
    <figure class="shot shot-3">
      <div class="frame low terra tfx-h-zoom">
        <div class="phone">
          <span class="tick"><i></i></span>
          <p class="title center">Order confirmed</p>
          <p class="slot">Pick up tomorrow<b>8:30 AM</b></p>
          <span><i class="ln w80"></i><i class="ln w60"></i></span>
          <span class="field center">Add to calendar</span>
        </div>
      </div>
      <figcaption class="cap"><b>Fig. 3</b>The confirmation repeats the one fact people need: when the bread is ready.</figcaption>
    </figure>
  </div>
</section>

<section class="voice pad">
  <div class="voice-art tfx-s-parallax" aria-hidden="true"><i class="terra r-bl"></i><i class="sand"></i><i></i><i class="cream r-all"></i><i></i><i class="terra r-tl"></i></div>
  <figure>
    <blockquote>Our regulars used to call the shop because the website was slower than the phone. Now the Friday sourdough sells out online before we open the doors.</blockquote>
    <figcaption>Tavita Leota<span>Co-owner, Harborlight Bakery</span></figcaption>
    <p class="sample">Sample testimonial. Replace it with a quote from your own client.</p>
  </figure>
</section>

<section class="block pad">
  <p class="kicker"><span>04</span> · What we learned</p>
  <div>
    <h2 class="tfx-e-blur-rise">The fastest form is the one that is not there.</h2>
    <ol class="learned">
      <li><span class="n">A</span><p><b>Ask late.</b> Every field we moved after the payment step raised completion. An account can wait until the order is safe.</p></li>
      <li><span class="n">B</span><p><b>Show the pickup time early.</b> It was the answer people looked for first, and the old flow kept it until screen 5.</p></li>
      <li><span class="n">C</span><p><b>Measure in the shop too.</b> Phone calls to place an order fell by about half, which no analytics tool would have told us.</p></li>
    </ol>
    <p class="credits">Team: Kwame Mensah (design lead), Yuki Tanabe (research), Elif Demir (front-end handoff).</p>
  </div>
</section>

<section class="next pad">
  <div class="next-text">
    <p class="kicker">Next case study</p>
    <p class="num">04</p>
    <h2>A calmer booking flow for Tidewater Ferries</h2>
    <a class="go tfx-h-underline" href="https://example.com/work/tidewater-ferries">Read the case study →</a>
  </div>
  <div class="next-art" aria-hidden="true"><i></i><i class="navy r-tl"></i><i class="terra r-all"></i><i class="sand r-tl"></i><i class="sand"></i><i class="navy r-br"></i><i class="terra r-top"></i><i class="paper r-top"></i><i class="terra r-top"></i></div>
</section>

<footer class="foot pad">
  <p>Brightpine Studio · Product design for small, busy businesses</p>
  <nav aria-label="Footer">
    <a href="https://example.com/work">Work</a>
    <a href="https://example.com/about">About</a>
    <a href="mailto:hello@example.com">hello@example.com</a>
  </nav>
  <p class="legal">© 2026 Brightpine Studio. Brightpine Studio and Harborlight Bakery are fictional, and every figure on this page is sample data.</p>
</footer>
</div>


</body></html>
`;

  /* Document: Meeting notes */
  const MINUTES = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meeting notes | Project Lantern weekly sync #7</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1e2430;
    --ink-2: #4f5968;
    --ink-3: #626b7a;
    --line: #e1e5eb;
    --bg: #f3f4f6;
    --paper: #ffffff;
    --accent: #3451b2;
    --accent-soft: #eef1fb;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    --mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 15.5px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
  h1, h2, p { margin: 0; }
  .doc { max-width: 880px; margin: 40px auto; padding: 48px 56px 56px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 1px 2px rgba(30, 36, 48, .04); }
  .doc-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px 24px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
  .doc-type { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 3px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--accent); background: var(--accent-soft); }
  .doc-type svg { flex: none; width: 14px; height: 14px; }
  h1 { font-size: clamp(23px, 3.6vw, 30px); line-height: 1.3; letter-spacing: -.01em; }
  .doc-sub { margin-top: 6px; color: var(--ink-2); }
  .doc-no { font-family: var(--mono); font-size: 13px; line-height: 1.8; color: var(--ink-3); text-align: right; }

  h2 { display: flex; align-items: center; gap: 10px; margin: 36px 0 14px; font-size: 18px; line-height: 1.4; }
  h2::before { content: ""; flex: none; width: 4px; height: 18px; border-radius: 2px; background: var(--accent); }

  .meta { width: 100%; margin-top: 20px; border-collapse: collapse; }
  .meta th { width: 120px; padding: 8px 16px 8px 0; font-weight: 500; text-align: left; vertical-align: top; color: var(--ink-3); white-space: nowrap; }
  .meta td { padding: 8px 0; overflow-wrap: anywhere; }
  .meta tr + tr > * { border-top: 1px dashed var(--line); }
  .meta .zones { display: block; font-size: 14px; color: var(--ink-2); }
  .meta a { color: var(--accent); }

  .agenda { margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: 10px; }
  .agenda li { position: relative; display: flex; justify-content: space-between; gap: 16px; padding: 12px 16px 12px 48px; }
  .agenda li + li { border-top: 1px solid var(--line); }
  .agenda li::before { content: ""; position: absolute; left: 16px; top: 15px; width: 18px; height: 18px; border: 1.5px solid #b9c0cc; border-radius: 5px; background: #fff; }
  .agenda li.done { color: var(--ink-2); }
  .agenda li.done::before { border-color: var(--accent); background: var(--accent); }
  .agenda li.done::after { content: ""; position: absolute; left: 22px; top: 18px; width: 6px; height: 10px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .agenda .note { flex: none; font-size: 13.5px; color: var(--ink-3); }

  .notes { margin: 0; padding-left: 1.3em; color: var(--ink-2); }
  .notes li + li { margin-top: 8px; }
  .notes strong { color: var(--ink); }

  .decisions { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; counter-reset: decision; }
  .decisions li { position: relative; padding: 14px 18px 14px 56px; border-radius: 10px; background: var(--bg); counter-increment: decision; }
  .decisions li::before { content: counter(decision); position: absolute; left: 18px; top: 15px; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; background: var(--ink); color: #fff; font-size: 13px; font-weight: 700; line-height: 1; }

  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
  .actions { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 14.5px; }
  .actions th { padding: 10px 14px; font-size: 13px; font-weight: 600; text-align: left; color: var(--ink-2); background: var(--bg); white-space: nowrap; }
  .actions td { padding: 12px 14px; border-top: 1px solid var(--line); vertical-align: middle; }
  .actions .id { width: 1%; font-family: var(--mono); font-size: 13px; color: var(--ink-3); white-space: nowrap; }
  .actions .who { white-space: nowrap; }
  .actions .date { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 1px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill.doing { color: #1f4fb5; background: #e7eefc; }
  .pill.todo { color: #535c6b; background: #eceef2; }
  .pill.done { color: #146c44; background: #e1f4ea; }
  .pill.late { color: #a82d1b; background: #fce9e6; }

  .doc-foot { margin-top: 40px; padding: 18px 20px; border-radius: 10px; background: var(--accent-soft); }
  .doc-foot strong { margin-right: 10px; color: var(--accent); }
  .sign { margin-top: 6px; font-size: 14px; color: var(--ink-2); }

  @media (max-width: 640px) {
    .doc { margin: 0; padding: 28px 16px 40px; border: 0; border-radius: 0; }
    .doc-no { text-align: left; }
    .meta th { width: 92px; padding-right: 10px; }
    .agenda li { flex-direction: column; gap: 0; }
  }
  @media print {
    body { background: #fff; font-size: 13.5px; }
    .doc { max-width: none; margin: 0; padding: 0; border: 0; box-shadow: none; }
    h2 { break-after: avoid; }
    .agenda li, .decisions li, .actions tr, .doc-foot { break-inside: avoid; }
    .table-wrap { overflow: visible; }
    .actions { min-width: 0; }
  }
</style>
</head>
<body>
<article class="doc">
  <header class="doc-head">
    <div>
      <p class="doc-type"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 13.5 5v6L8 14.5 2.5 11V5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/></svg>Quillhaven Freight · Meeting notes</p>
      <h1>Project Lantern: weekly sync #7</h1>
      <p class="doc-sub">Rollout of the new warehouse scanning app to four regional hubs</p>
    </div>
    <p class="doc-no">MTG-2026-1015<br>Updated Oct 15, 16:40 UTC</p>
  </header>

  <table class="meta">
    <tbody>
      <tr><th>Date</th><td>Thursday, October 15, 2026</td></tr>
      <tr><th>Time</th><td>14:00–15:00 UTC<span class="zones">10:00 Toronto · 15:00 Lagos · 16:00 Warsaw · 19:30 Bengaluru</span></td></tr>
      <tr><th>Location</th><td>Video call: <a href="https://example.com/meet/lantern-sync">example.com/meet/lantern-sync</a>. Toronto attendees in room 4B.</td></tr>
      <tr><th>Facilitator</th><td>Amara Okafor (Program Manager)</td></tr>
      <tr><th>Attendees</th><td>Rahul Mehta (Engineering), Sofia Lindqvist (Design), Tomasz Nowak (Hub Operations), Camila Duarte (Training), Kenji Watanabe (Quality Assurance)</td></tr>
      <tr><th>Absent</th><td>Leilani Kahale (Finance, on leave)</td></tr>
      <tr><th>Note taker</th><td>Camila Duarte</td></tr>
    </tbody>
  </table>

  <h2>Agenda</h2>
  <ul class="agenda">
    <li class="done">Review of open action items<span class="note">10 min</span></li>
    <li class="done">Warsaw pilot results<span class="note">20 min</span></li>
    <li class="done">Offline mode for the scanning app<span class="note">15 min</span></li>
    <li class="done">Training plan for hub staff<span class="note">10 min</span></li>
    <li>Budget for replacement handhelds<span class="note">Moved to next meeting</span></li>
  </ul>

  <h2>Discussion summary</h2>
  <ul class="notes">
    <li><strong>Pilot:</strong> Over two weeks, the Warsaw hub scanned 41,200 parcels with the new app. The mis-scan rate fell from 2.4% to 0.9%. Staff asked for larger buttons, because most of them wear gloves.</li>
    <li><strong>Offline mode:</strong> The Lagos hub loses its connection for 5 to 10 minutes several times a day. Today the app stops working during an outage. Engineering can store up to 500 scans on the device and upload them when the connection returns.</li>
    <li><strong>Training:</strong> A single live session cannot cover four time zones and three shifts. Camila proposed a 12-minute recorded walkthrough plus one live question session per hub.</li>
  </ul>

  <h2>Decisions</h2>
  <ol class="decisions">
    <li><strong>Roll out to Lagos next, then Bengaluru.</strong> Lagos goes live on November 9, 2026, after offline mode passes testing.</li>
    <li><strong>Offline mode is required for launch.</strong> The app must hold at least 500 scans without a connection and lose none of them.</li>
    <li><strong>Increase button height to 56 px.</strong> Sofia updates the designs and Warsaw staff test them with gloves on.</li>
    <li><strong>Use recorded training plus live question sessions.</strong> Each hub gets one 30-minute session in its local working hours.</li>
  </ol>

  <h2>Action items</h2>
  <div class="table-wrap">
    <table class="actions">
      <thead>
        <tr><th>ID</th><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td class="id">A-21</td><td>Build offline scan queue and upload on reconnect</td><td class="who">Rahul Mehta</td><td class="date">Oct 29</td><td><span class="pill doing">In progress</span></td></tr>
        <tr><td class="id">A-22</td><td>Update scan screen designs with 56 px buttons</td><td class="who">Sofia Lindqvist</td><td class="date">Oct 21</td><td><span class="pill doing">In progress</span></td></tr>
        <tr><td class="id">A-23</td><td>Write the offline mode test plan</td><td class="who">Kenji Watanabe</td><td class="date">Oct 23</td><td><span class="pill todo">Not started</span></td></tr>
        <tr><td class="id">A-24</td><td>Record the 12-minute training walkthrough</td><td class="who">Camila Duarte</td><td class="date">Oct 30</td><td><span class="pill todo">Not started</span></td></tr>
        <tr><td class="id">A-18</td><td>Publish the Warsaw pilot report (from sync #6)</td><td class="who">Tomasz Nowak</td><td class="date">Oct 13</td><td><span class="pill done">Done</span></td></tr>
        <tr><td class="id">A-19</td><td>Get quotes for 60 replacement handhelds (from sync #6)</td><td class="who">Leilani Kahale</td><td class="date">Oct 9</td><td><span class="pill late">Overdue</span></td></tr>
      </tbody>
    </table>
  </div>

  <footer class="doc-foot">
    <p><strong>Next meeting</strong>Thursday, October 22, 2026, 14:00–15:00 UTC, same video link. Planned agenda: handheld budget, offline mode demo.</p>
    <p class="sign">Notes: Camila Duarte · Reviewed by: Amara Okafor · Corrections to lantern@example.com</p>
  </footer>
</article>
</body>
</html>
`;

  /* Document: Invoice */
  const INVOICE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice INV-2026-0142 | Brightpine Studio LLC</title>
<style>
  :root {
    color-scheme: light;
    --ink: #1f2430;
    --ink-2: #545b69;
    --line: #dde1e7;
    --bg: #e9ebef;
    --paper: #ffffff;
    --accent: #1d4f7a;
    --accent-soft: #edf3f8;
    --font: "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  h1, h2, p { margin: 0; }
  .sheet { width: 100%; max-width: 210mm; min-height: 297mm; margin: 32px auto; padding: 16mm 16mm 14mm; background: var(--paper); box-shadow: 0 2px 10px rgba(31, 36, 48, .12); }

  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px 32px; padding-bottom: 18px; border-bottom: 3px solid var(--accent); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand svg { flex: none; }
  .brand strong { display: block; font-size: 17px; line-height: 1.3; }
  .brand span { font-size: 13px; color: var(--ink-2); }
  h1 { font-size: 30px; line-height: 1.15; letter-spacing: .12em; margin-right: -.12em; text-transform: uppercase; color: var(--accent); text-align: right; }
  .no { margin-top: 2px; font-size: 13px; color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin: 20px 0 16px; }
  .parties h2, .terms h2 { margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
  .parties address { font-style: normal; color: var(--ink-2); }
  .parties address strong { display: block; font-size: 15px; color: var(--ink); }

  .facts { display: grid; grid-template-columns: repeat(5, auto); justify-content: space-between; gap: 10px 20px; margin: 0 0 18px; padding: 10px 16px; background: var(--accent-soft); border-radius: 8px; }
  .facts dt { font-size: 12px; color: var(--ink-2); }
  .facts dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }

  table { width: 100%; border-collapse: collapse; }
  th { padding: 8px 10px; font-size: 13px; font-weight: 600; text-align: left; color: var(--accent); border-bottom: 2px solid var(--accent); white-space: nowrap; }
  td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .item strong { display: block; font-weight: 600; }
  .item span { display: block; font-size: 13px; color: var(--ink-2); }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tfoot td { border-bottom: 0; padding: 5px 10px; }
  tfoot tr:first-child td { padding-top: 12px; }
  tfoot .label { text-align: right; color: var(--ink-2); }
  tfoot .total td { padding-top: 10px; padding-bottom: 10px; font-size: 17px; font-weight: 700; color: var(--accent); background: var(--accent-soft); }
  tfoot .total .label { color: var(--accent); }
  tfoot .gap td { padding: 3px 0; }

  .terms { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; margin-top: 22px; }
  .pay { display: grid; grid-template-columns: auto 1fr; gap: 3px 14px; margin: 0; font-size: 13.5px; }
  .pay dt { color: var(--ink-2); }
  .pay dd { margin: 0; font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .notes { margin: 0; padding-left: 1.2em; font-size: 13.5px; color: var(--ink-2); }
  .notes li + li { margin-top: 4px; }

  .foot { margin-top: 22px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-2); text-align: center; }
  .foot strong { color: var(--ink); }

  @media (max-width: 700px) {
    .sheet { min-height: 0; margin: 0; padding: 24px 16px 32px; box-shadow: none; }
    h1, .no { text-align: left; }
    .parties, .terms { grid-template-columns: 1fr; }
    .facts { grid-template-columns: 1fr 1fr; justify-content: stretch; }
    th, td { padding-left: 6px; padding-right: 6px; }
    th:first-child, td:first-child { padding-left: 0; }
    tfoot .total td:first-child { padding-left: 6px; }
  }
  @media print {
    @page { margin: 0; }
    body { background: #fff; }
    .sheet { max-width: none; min-height: 0; margin: 0; padding: 11mm 15mm 9mm; box-shadow: none; }
    .head { padding-bottom: 14px; }
    .parties { margin: 16px 0 14px; }
    .facts { margin-bottom: 12px; }
    td { padding-top: 5px; padding-bottom: 5px; }
    .terms { margin-top: 16px; }
    .foot { margin-top: 16px; padding-top: 10px; }
    tr, .terms section { break-inside: avoid; }
  }
</style>
</head>
<body>
<article class="sheet">
  <header class="head">
    <div class="brand">
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" rx="10" fill="#1d4f7a"/><path d="M22 9l9 14h-5l7 10H11l7-10h-5z" fill="#edf3f8"/><rect x="20" y="33" width="4" height="4" fill="#edf3f8"/></svg>
      <div><strong>Brightpine Studio LLC</strong><span>Web design and development</span></div>
    </div>
    <div>
      <h1>Invoice</h1>
      <p class="no">No. INV-2026-0142</p>
    </div>
  </header>

  <section class="parties">
    <div>
      <h2>From</h2>
      <address>
        <strong>Brightpine Studio LLC</strong>
        100 Example Street, Suite 4<br>
        Sampletown, ST 00000, United States<br>
        billing@brightpine.example.com<br>
        +1 (555) 0100
      </address>
    </div>
    <div>
      <h2>Bill to</h2>
      <address>
        <strong>Harborlight Bakery Co.</strong>
        Attn: Dana Whitfield, Accounts Payable<br>
        250 Sample Avenue, Floor 2<br>
        Anytown, ST 00000, United States<br>
        accounts@harborlight.example.com
      </address>
    </div>
  </section>

  <dl class="facts">
    <div><dt>Invoice number</dt><dd>INV-2026-0142</dd></div>
    <div><dt>Issue date</dt><dd>October 15, 2026</dd></div>
    <div><dt>Due date</dt><dd>November 14, 2026</dd></div>
    <div><dt>Payment terms</dt><dd>Net 30</dd></div>
    <div><dt>PO number</dt><dd>PO-48213</dd></div>
  </dl>

  <table>
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>
      <tr><td class="item"><strong>Brand discovery workshop</strong><span>Half-day sessions with the owners and store managers</span></td><td class="num">2</td><td class="num">$1,200.00</td><td class="num">$2,400.00</td></tr>
      <tr><td class="item"><strong>Website design</strong><span>Home, menu, locations and online ordering pages</span></td><td class="num">1</td><td class="num">$6,800.00</td><td class="num">$6,800.00</td></tr>
      <tr><td class="item"><strong>Front-end development</strong><span>Responsive build, billed per hour</span></td><td class="num">48</td><td class="num">$95.00</td><td class="num">$4,560.00</td></tr>
      <tr><td class="item"><strong>Content migration</strong><span>Pages moved from the old site, billed per page</span></td><td class="num">24</td><td class="num">$45.00</td><td class="num">$1,080.00</td></tr>
      <tr><td class="item"><strong>Launch support</strong><span>Hosting setup, domain transfer and two weeks of fixes</span></td><td class="num">1</td><td class="num">$650.00</td><td class="num">$650.00</td></tr>
    </tbody>
    <tfoot>
      <tr><td colspan="3" class="label">Subtotal</td><td class="num">$15,490.00</td></tr>
      <tr><td colspan="3" class="label">Tax (10%)</td><td class="num">$1,549.00</td></tr>
      <tr class="gap"><td colspan="4"></td></tr>
      <tr class="total"><td colspan="3" class="label">Total due (USD)</td><td class="num">$17,039.00</td></tr>
    </tfoot>
  </table>

  <div class="terms">
    <section>
      <h2>Payment details</h2>
      <dl class="pay">
        <dt>Method</dt><dd>Bank transfer</dd>
        <dt>Account name</dt><dd>Brightpine Studio LLC</dd>
        <dt>Bank</dt><dd>Example Bank</dd>
        <dt>IBAN</dt><dd>XX00 0000 0000 0000 0000 00</dd>
        <dt>SWIFT/BIC</dt><dd>EXAMPLEXXX</dd>
        <dt>Reference</dt><dd>INV-2026-0142</dd>
      </dl>
    </section>
    <section>
      <h2>Notes</h2>
      <ul class="notes">
        <li>Please pay the total in US dollars by the due date.</li>
        <li>Quote the invoice number as the payment reference.</li>
        <li>Late balances accrue interest of 1.5% per month.</li>
        <li>Bank fees for the transfer are paid by the sender.</li>
      </ul>
    </section>
  </div>

  <p class="foot"><strong>Thank you for your business.</strong> Questions about this invoice? Write to billing@brightpine.example.com.</p>
</article>
</body>
</html>
`;

  /* Email: Newsletter */
  const NEWSLETTER = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The November Shelf | Marrow &amp; Vale Books</title>
<style>
  body { margin: 0; padding: 0; }
  table { border-collapse: separate; }
  h1, h2, h3, p { margin: 0; }
  @media (max-width: 620px) {
    .wrap { width: 100% !important; }
    .outer { padding: 12px 8px !important; }
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
    .col { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
    .col-gap { padding-top: 16px !important; }
    .art { width: 64px !important; }
    .art svg { width: 60px !important; height: 66px !important; }
    .brand { font-size: 24px !important; }
    .title { font-size: 32px !important; }
    .book { font-size: 21px !important; }
    .quote { font-size: 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ead9bd;">
<div style="display:none;max-height:0;overflow:hidden;color:#3a2f26;">Three books for long evenings, two events in the shop, and new winter hours.</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ead9bd;">
<tr>
<td class="outer" align="center" style="padding:32px 16px;">

<table role="presentation" class="wrap" cellpadding="0" cellspacing="0" border="0" width="600" align="center" style="width:600px;max-width:600px;margin:0 auto;background-color:#fbf6ea;border-radius:14px;">

<!-- Masthead -->
<tr>
<td class="pad" style="padding:28px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td class="art" width="110" valign="middle" align="left" style="width:110px;background-color:#fbf6ea;">
<svg width="104" height="114" viewBox="0 0 110 120" aria-hidden="true" style="display:block;">
<path d="M30 10 C47 15 51 36 35 52 C18 41 15 22 30 10 Z" fill="#c9673f" stroke="#8a3a20" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M30 12 L35 52 M31 22 L40 24 M32 31 L42 35 M31 24 L23 28 M33 36 L25 40" fill="none" stroke="#8a3a20" stroke-width="1.2" stroke-linecap="round"/>
<path d="M86 16 Q78 42 82 70" fill="none" stroke="#6f7242" stroke-width="1.5" stroke-linecap="round"/>
<ellipse cx="78" cy="26" rx="4" ry="8" transform="rotate(-35 78 26)" fill="#e0b25a" stroke="#6f7242" stroke-width="1.2"/>
<ellipse cx="92" cy="32" rx="4" ry="8" transform="rotate(40 92 32)" fill="#e0b25a" stroke="#6f7242" stroke-width="1.2"/>
<ellipse cx="75" cy="44" rx="4" ry="8" transform="rotate(-40 75 44)" fill="#e0b25a" stroke="#6f7242" stroke-width="1.2"/>
<ellipse cx="89" cy="50" rx="4" ry="8" transform="rotate(35 89 50)" fill="#e0b25a" stroke="#6f7242" stroke-width="1.2"/>
<path d="M8 82 Q30 72 52 82 L52 112 Q30 102 8 112 Z" fill="#fffdf6" stroke="#8a3a20" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M52 82 Q74 72 96 82 L96 112 Q74 102 52 112 Z" fill="#fffdf6" stroke="#8a3a20" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M14 88 Q30 81 46 88 M14 94 Q30 87 46 94 M14 100 Q30 93 46 100 M58 88 Q74 81 90 88 M58 94 Q74 87 90 94 M58 100 Q74 93 90 100" fill="none" stroke="#b98a6c" stroke-width="1" stroke-linecap="round"/>
</svg>
</td>
<td valign="middle" align="center" style="padding:0 6px;">
<p class="brand" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;color:#2b231c;">Marrow &amp; Vale Books</p>
<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;letter-spacing:1px;text-transform:uppercase;color:#6a6258;">Issue 47 &middot; November 2026</p>
</td>
<td class="art" width="110" valign="middle" align="right" style="width:110px;background-color:#fbf6ea;">
<svg width="104" height="114" viewBox="0 0 110 120" aria-hidden="true" style="display:block;margin-left:auto;">
<g transform="translate(110 0) scale(-1 1)">
<path d="M30 10 C47 15 51 36 35 52 C18 41 15 22 30 10 Z" fill="#e0b25a" stroke="#8a3a20" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M30 12 L35 52 M31 22 L40 24 M32 31 L42 35 M31 24 L23 28 M33 36 L25 40" fill="none" stroke="#8a3a20" stroke-width="1.2" stroke-linecap="round"/>
<path d="M86 16 Q78 42 82 70" fill="none" stroke="#6f7242" stroke-width="1.5" stroke-linecap="round"/>
<ellipse cx="78" cy="26" rx="4" ry="8" transform="rotate(-35 78 26)" fill="#c9673f" stroke="#6f7242" stroke-width="1.2"/>
<ellipse cx="92" cy="32" rx="4" ry="8" transform="rotate(40 92 32)" fill="#c9673f" stroke="#6f7242" stroke-width="1.2"/>
<ellipse cx="75" cy="44" rx="4" ry="8" transform="rotate(-40 75 44)" fill="#c9673f" stroke="#6f7242" stroke-width="1.2"/>
<ellipse cx="89" cy="50" rx="4" ry="8" transform="rotate(35 89 50)" fill="#c9673f" stroke="#6f7242" stroke-width="1.2"/>
<path d="M8 82 Q30 72 52 82 L52 112 Q30 102 8 112 Z" fill="#fffdf6" stroke="#8a3a20" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M52 82 Q74 72 96 82 L96 112 Q74 102 52 112 Z" fill="#fffdf6" stroke="#8a3a20" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M14 88 Q30 81 46 88 M14 94 Q30 87 46 94 M14 100 Q30 93 46 100 M58 88 Q74 81 90 88 M58 94 Q74 87 90 94 M58 100 Q74 93 90 100" fill="none" stroke="#b98a6c" stroke-width="1" stroke-linecap="round"/>
</g>
</svg>
</td>
</tr>
</table>
</td>
</tr>

<!-- Title -->
<tr>
<td class="pad" align="center" style="padding:16px 32px 8px 32px;">
<h1 class="title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:44px;line-height:1.1;font-weight:normal;color:#1f1915;">The November Shelf</h1>
</td>
</tr>

<!-- Letter -->
<tr>
<td class="pad" style="padding:20px 48px 8px 48px;">
<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#3a2f26;">Dear reader, the clocks have gone back and the lamp over the front table is on by four. November is when the shop is at its best: the door sticks a little, the kettle never rests, and people stay longer than they planned.</p>
<p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#3a2f26;">This month we chose three books that reward a slow evening. Each one is on the front table, and each comes with a handwritten note from the bookseller who picked it.</p>
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;font-style:italic;color:#3a2f26;">Amara Vale, co-owner</p>
</td>
</tr>

<!-- Divider -->
<tr>
<td class="pad" style="padding:24px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #e2d5bb;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
</table>
</td>
</tr>

<!-- Picks -->
<tr>
<td class="pad" style="padding:24px 48px 0 48px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#9c3f24;">This month's picks</p>
</td>
</tr>

<tr>
<td class="pad" style="padding:18px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="96" valign="top" style="width:96px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="96" style="width:96px;">
<tr>
<td height="136" align="center" valign="middle" style="height:136px;background-color:#b4552f;border-left:6px solid #8a3a20;border-radius:4px;">
<svg width="56" height="84" viewBox="0 0 56 84" role="img" aria-label="Rust red cover with a leaf drawing" style="display:block;margin:0 auto;">
<path d="M28 12 C40 20 40 38 28 48 C16 38 16 20 28 12 Z M28 16 L28 58 M28 26 L34 22 M28 34 L35 30 M28 30 L22 26 M28 38 L21 34" fill="none" stroke="#fbf6ea" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12 68 L44 68 M18 74 L38 74" fill="none" stroke="#fbf6ea" stroke-width="1.6" stroke-linecap="round"/>
</svg>
</td>
</tr>
</table>
</td>
<td valign="top" style="padding-left:24px;">
<h2 class="book" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;font-weight:normal;color:#1f1915;">Saltmarsh Ledger</h2>
<p style="margin:4px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6a6258;">by Ngozi Aderinto</p>
<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3a2f26;">A harbour clerk finds forty years of debts recorded in her late father's handwriting. A quiet, exact novel about what families owe each other.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:bold;color:#9c3f24;">$27.00 <span style="font-weight:normal;color:#6a6258;">&middot; hardcover</span></p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="pad" style="padding:24px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="96" valign="top" style="width:96px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="96" style="width:96px;">
<tr>
<td height="136" align="center" valign="middle" style="height:136px;background-color:#7d8050;border-left:6px solid #5c5f38;border-radius:4px;">
<svg width="56" height="84" viewBox="0 0 56 84" role="img" aria-label="Olive green cover with a drawing of a branch" style="display:block;margin:0 auto;">
<path d="M28 58 L28 18 M28 44 Q18 40 14 30 M28 36 Q38 32 42 22 M28 28 Q22 24 20 16" fill="none" stroke="#fbf6ea" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="14" cy="28" r="3" fill="none" stroke="#fbf6ea" stroke-width="1.6"/>
<circle cx="42" cy="20" r="3" fill="none" stroke="#fbf6ea" stroke-width="1.6"/>
<circle cx="20" cy="14" r="3" fill="none" stroke="#fbf6ea" stroke-width="1.6"/>
<circle cx="28" cy="14" r="3" fill="none" stroke="#fbf6ea" stroke-width="1.6"/>
<path d="M12 68 L44 68 M18 74 L38 74" fill="none" stroke="#fbf6ea" stroke-width="1.6" stroke-linecap="round"/>
</svg>
</td>
</tr>
</table>
</td>
<td valign="top" style="padding-left:24px;">
<h2 class="book" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;font-weight:normal;color:#1f1915;">A Field Guide to Quiet Weather</h2>
<p style="margin:4px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6a6258;">by Tomasz Wieczorek</p>
<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3a2f26;">Fifty-two short essays on fog, drizzle and the other kinds of weather nobody photographs. Illustrated with the author's own pencil drawings.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:bold;color:#9c3f24;">$32.00 <span style="font-weight:normal;color:#6a6258;">&middot; hardcover</span></p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="pad" style="padding:24px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="96" valign="top" style="width:96px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="96" style="width:96px;">
<tr>
<td height="136" align="center" valign="middle" style="height:136px;background-color:#d9a43a;border-left:6px solid #a87a1c;border-radius:4px;">
<svg width="56" height="84" viewBox="0 0 56 84" role="img" aria-label="Mustard yellow cover with a drawing of a lantern" style="display:block;margin:0 auto;">
<path d="M22 20 Q28 10 34 20 M20 20 L36 20 M21 20 L18 50 L38 50 L35 20 M16 50 L40 50 L38 56 L18 56 Z M28 30 Q33 38 28 44 Q23 38 28 30 Z" fill="none" stroke="#3a2a10" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12 68 L44 68 M18 74 L38 74" fill="none" stroke="#3a2a10" stroke-width="1.6" stroke-linecap="round"/>
</svg>
</td>
</tr>
</table>
</td>
<td valign="top" style="padding-left:24px;">
<h2 class="book" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;font-weight:normal;color:#1f1915;">Lanterns for the Pear Orchard</h2>
<p style="margin:4px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6a6258;">by Haruka Lindqvist</p>
<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3a2f26;">Two estranged sisters inherit an orchard and one last harvest to bring in together. Warm and funny, and good to read aloud.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;font-weight:bold;color:#9c3f24;">$18.50 <span style="font-weight:normal;color:#6a6258;">&middot; paperback</span></p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Main button -->
<tr>
<td class="pad" align="center" style="padding:32px 48px 8px 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
<tr>
<td align="center" bgcolor="#9c3f24" style="background-color:#9c3f24;border-radius:26px;">
<a href="https://example.com/november-picks" style="display:inline-block;padding:15px 56px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.3;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:26px;">See all picks</a>
</td>
</tr>
</table>
</td>
</tr>

<!-- Events -->
<tr>
<td class="pad" style="padding:28px 32px 0 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#f3e9d3;border-radius:10px;">
<tr>
<td style="padding:22px 20px 6px 20px;">
<h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;font-weight:normal;color:#1f1915;">In the shop this month</h2>
</td>
</tr>
<tr>
<td style="padding:12px 20px 0 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="64" valign="top" style="width:64px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="64" style="width:64px;">
<tr>
<td align="center" style="padding:8px 0;background-color:#9c3f24;border-radius:8px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;font-weight:bold;letter-spacing:1px;color:#ffffff;">NOV</p>
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.1;color:#ffffff;">19</p>
</td>
</tr>
</table>
</td>
<td valign="top" style="padding-left:16px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6a6258;">Thursday &middot; 7:00 PM</p>
<p style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;font-weight:bold;color:#2b231c;">An evening with Tomasz Wieczorek</p>
<p style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#3a2f26;">Reading and signing. Free, and seats are first come.</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:16px 20px 22px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="64" valign="top" style="width:64px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="64" style="width:64px;">
<tr>
<td align="center" style="padding:8px 0;background-color:#9c3f24;border-radius:8px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;font-weight:bold;letter-spacing:1px;color:#ffffff;">NOV</p>
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.1;color:#ffffff;">28</p>
</td>
</tr>
</table>
</td>
<td valign="top" style="padding-left:16px;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6a6258;">Saturday &middot; 10:30 AM</p>
<p style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;font-weight:bold;color:#2b231c;">Story hour with Priya Raman</p>
<p style="margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#3a2f26;">Picture books for ages 3 to 7. Cocoa for everyone.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- Quote -->
<tr>
<td class="pad" style="padding:32px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td style="padding:4px 0 4px 20px;border-left:3px solid #9c3f24;">
<p class="quote" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.45;font-style:italic;color:#2b231c;">&ldquo;I came in for a birthday card and left two hours later with a book about fog. Best mistake of my autumn.&rdquo;</p>
<p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6a6258;">Kofi Mensah, a regular since 2019</p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Two columns -->
<tr>
<td class="pad" style="padding:32px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td class="col" width="50%" valign="top" style="width:50%;padding-right:14px;">
<h3 style="margin:0 0 6px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.3;font-weight:normal;color:#1f1915;">Winter hours</h3>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3a2f26;">Tuesday to Saturday, 10 AM to 7 PM<br>Sunday, 11 AM to 5 PM<br>Closed on Mondays</p>
</td>
<td class="col col-gap" width="50%" valign="top" style="width:50%;padding-left:14px;">
<h3 style="margin:0 0 6px 0;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.3;font-weight:normal;color:#1f1915;">Gift cards</h3>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3a2f26;">Any amount from $10, wrapped at the counter or sent by email. <a href="https://example.com/gift-cards" style="color:#9c3f24;font-weight:bold;text-decoration:underline;">Buy a gift card</a></p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td class="pad" style="padding:32px 48px 0 48px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #e2d5bb;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
</table>
</td>
</tr>
<tr>
<td class="pad" align="center" style="padding:20px 48px 28px 48px;">
<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6a6258;">Marrow &amp; Vale Books &middot; 100 Example Street, Sampletown, EX 00000<br>Questions? Write to <a href="mailto:hello@example.com" style="color:#6a6258;text-decoration:underline;">hello@example.com</a></p>
<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6a6258;">You are receiving this email because you signed up in the shop or on our website.<br><a href="https://example.com/unsubscribe" style="color:#6a6258;text-decoration:underline;">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="https://example.com/preferences" style="color:#6a6258;text-decoration:underline;">Email preferences</a></p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6a6258;">Marrow &amp; Vale Books is a fictional shop. The books, people and events in this sample are invented.</p>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
`;

  window.HE.samples.add([
    { key: 'en-report', lang: 'en', name: 'Sample: Quarterly business review', description: 'A quarterly report with a dark masthead, four KPI cards, a regional table, a bar chart, highlights, a three-step plan and a risk callout.', html: REPORT },
    { key: 'en-blank', lang: 'en', name: 'Blank page', description: 'A heading and one paragraph, to start from nothing.', html: BLANK },
    { key: 'en-pitch', lang: 'en', name: 'Slides: Investor pitch deck', description: 'A ten-slide Series A deck with a neon grid cover, market rings, a growth chart, a 2x2 map and the funding ask.', html: PITCH },
    { key: 'en-slides', lang: 'en', name: 'Slides: Business update', description: 'A seven-slide quarterly update for a board or leadership team, with key numbers, a revenue chart, a roadmap, risks and next steps.', html: SLIDES },
    { key: 'en-annual', lang: 'en', name: 'Report: Annual report', description: 'A scrolling data story with one giant number, bar charts that grow into view, a line chart and a financial summary.', html: ANNUAL },
    { key: 'en-traceable', lang: 'en', name: 'Report: Traceable financial report', description: 'A quarterly financial report with KPI cards, tables and charts, where every figure links back to a cell in the source workbook.', html: TRACEABLE },
    { key: 'en-dashboard', lang: 'en', name: 'Data: Analytics dashboard', description: 'A dark, glassy operations dashboard for a freight company, with KPI cards, a glowing line chart, a donut, bars and a status table.', html: DASHBOARD },
    { key: 'en-launch', lang: 'en', name: 'Website: Product launch page', description: 'A dark aurora launch page with floating glass cards, hover and scroll effects, a product demo, pricing and FAQ.', html: LAUNCH },
    { key: 'en-conference', lang: 'en', name: 'Website: Conference page', description: 'A loud neo-brutalist event page with a two-day agenda table, speaker cards, three ticket tiers and a registration form.', html: CONFERENCE },
    { key: 'en-casestudy', lang: 'en', name: 'Website: Case study', description: 'A design portfolio case page with a geometric illustration you can drag apart, result numbers, process steps and wireframe screens.', html: CASESTUDY },
    { key: 'en-minutes', lang: 'en', name: 'Document: Meeting notes', description: 'Notes for a recurring project meeting across time zones: details, agenda, discussion summary, decisions, and an action item table with status labels.', html: MINUTES },
    { key: 'en-invoice', lang: 'en', name: 'Document: Invoice', description: 'A one-page business invoice in USD with line items, tax, a total due and bank transfer details, ready to print.', html: INVOICE },
    { key: 'en-newsletter', lang: 'en', name: 'Email: Newsletter', description: 'A 600px bookshop newsletter built the email way: nested tables, inline styles, a table button and one small media query for phones.', html: NEWSLETTER },
  ]);
})();
