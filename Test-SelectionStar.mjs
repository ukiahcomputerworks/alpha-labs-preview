import assert from 'node:assert/strict';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const routes = [
  { path: '/regulatory/', control: '[data-agency-target="calrecycle"]', alternate: '[data-agency-target="epa"]', selected: '[data-agency-panel="calrecycle"]', alternatePanel: '[data-agency-panel="epa"]', card: '.agency-intelligence' },
  { path: '/contact-us-alpha-analytical-laboratories-inc/', control: '[data-location="elk-grove"]', alternate: '[data-location="ukiah"]', selected: '[data-location-panel="elk-grove"]', alternatePanel: '[data-location-panel="ukiah"]', card: '.location-intelligence' },
];
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport, hasTouch: viewport.width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
      assert.equal(response?.status(), 200, `${route.path} loads`);
      await page.locator(route.control).click();
      const star = page.locator('.alpha-transfer-star');
      await star.waitFor({ state: 'visible', timeout: 2200 });
      assert.equal(await star.getAttribute('aria-hidden'), 'true', 'star is decorative');
      assert.equal(await page.locator(route.selected).isVisible(), true, 'selected details are revealed');
      await star.waitFor({ state: 'detached', timeout: 2800 });
      if (viewport.width < 500) {
        await page.waitForTimeout(700);
        const cardTop = await page.locator(route.card).evaluate(element => element.getBoundingClientRect().top);
        assert.ok(cardTop >= -10 && cardTop < viewport.height, `selected ${route.path} dossier scrolls into phone view: ${cardTop}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${route.path} ${viewport.width}px has no horizontal overflow: ${overflow}`);
      assert.deepEqual(errors, [], `${route.path} has no script errors`);
      results.push(`${route.path} ${viewport.width}px motion`);
      await page.close();
    }
  }

  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    await page.locator(route.control).click();
    assert.equal(await page.locator(route.selected).isVisible(), true, 'reduced-motion details are revealed');
    assert.equal(await page.locator('.alpha-transfer-star').count(), 0, 'reduced motion has no travelling star');
    await page.locator(route.alternate).click();
    assert.equal(await page.locator(route.alternatePanel).isVisible(), true, 'changing selections updates details');
    assert.equal(await page.locator(route.selected).isVisible(), false, 'previous details are hidden');
    results.push(`${route.path} reduced motion`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ status: 'PASS', checks: results.length, results }, null, 2));
