const { test, expect } = require('@playwright/test');

const frame = 'iframe.cv-frame:not(.is-pending)';

/** Lays out the slides in the edit frame and reports what a reader would see. */
function measureSlides() {
  const root = document.documentElement;
  const slides = [...document.querySelectorAll('.slide')].map((slide) => {
    const box = slide.getBoundingClientRect();
    const clipped = [...slide.querySelectorAll('*')].filter((el) => {
      if (el.closest('.beam')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1);
    }).length;
    const smallestText = Math.min(...[...slide.querySelectorAll('p, h1, h2, h3')].map((el) => parseFloat(getComputedStyle(el).fontSize)));
    return { right: box.right, ratio: box.width / box.height, clipped, smallestText };
  });
  return { width: innerWidth, scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, slides };
}

test('the slides template fits desktop, tablet and phone previews', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto('/dist/tactile.html');
  await page.locator('#btn-new').click();
  await page.getByRole('menuitem', { name: '簡報：產品發表' }).click();
  await expect(page.frameLocator(frame).locator('.slide-title h1')).toHaveText('Kite 2');

  for (const [device, width] of [['desktop', null], ['tablet', 768], ['phone', 390]]) {
    await page.locator('#cv-device-' + device).click();
    const canvas = page.frameLocator(frame).locator('html');
    if (width) await expect.poll(() => canvas.evaluate(() => innerWidth)).toBe(width);
    const m = await canvas.evaluate(measureSlides);
    expect(m.slides, device).toHaveLength(6);
    expect(m.scrollWidth, `${device}: page scrolls sideways`).toBeLessThanOrEqual(m.clientWidth);
    for (const [i, s] of m.slides.entries()) {
      const name = `${device} slide ${i + 1}`;
      expect(s.right, `${name} runs past the page edge`).toBeLessThanOrEqual(m.width);
      expect(s.clipped, `${name} cuts off its content`).toBe(0);
      expect(s.smallestText, `${name} text is too small to read`).toBeGreaterThanOrEqual(12);
      if (device === 'desktop') expect(Math.abs(s.ratio - 16 / 9), `${name} is not 16:9`).toBeLessThan(0.02);
    }
  }
});
