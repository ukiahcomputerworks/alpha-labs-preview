import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const screenshots = process.env.ALPHA_CARD_EVIDENCE;
if (screenshots) mkdirSync(screenshots, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let checks = 0;
try {
  for (const width of [1440, 390, 320]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width < 600, isMobile: width < 600, reducedMotion });
      await page.goto(`${base}/services-listing/`, { waitUntil: 'networkidle' });
      const cards = page.locator('.service-tab');
      const state = () => cards.evaluateAll(elements => elements.map(card => {
        const photo = card.querySelector('img');
        const imageStyle = getComputedStyle(photo);
        const rect = card.getBoundingClientRect();
        return { filter: imageStyle.filter, opacity: imageStyle.opacity, transform: imageStyle.transform,
          translate: getComputedStyle(card).translate, left: rect.left, right: rect.right,
          loaded: photo.complete && photo.naturalWidth > 0, outlineAnimation: getComputedStyle(card, '::before').animationName };
      }));
      const checkPhotos = async () => {
        for (const item of await state()) {
          assert.equal(item.filter, 'none'); assert.equal(item.opacity, '1');
          assert.equal(item.transform, 'none'); assert.equal(item.translate, 'none');
          assert.ok(item.loaded); assert.ok(item.left >= 0 && item.right <= width + 1);
          if (reducedMotion === 'reduce') assert.equal(item.outlineAnimation, 'none');
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        checks++;
      };
      await checkPhotos();
      if (screenshots && reducedMotion === 'no-preference') {
        await page.locator('.service-index__rail').screenshot({ path: `${screenshots}/cards-${width}.png` });
      }
      for (const program of ['wastewater', 'drinking']) {
        const tab = page.locator(`[data-service-target="${program}"]`);
        const before = await state();
        if (width >= 600) { await tab.hover(); await page.waitForTimeout(500); await checkPhotos(); }
        await tab.click(); await page.waitForTimeout(750);
        await checkPhotos();
        assert.equal(await tab.getAttribute('aria-selected'), 'true');
        assert.ok(await page.locator(`[data-service-panel="${program}"]`).isVisible());
        const after = await state();
        assert.deepEqual(after.map(x => x.left), before.map(x => x.left));
      }
      // Keyboard activation must retain the same undimmed presentation.
      await page.locator('#service-tab-wastewater').focus();
      await page.keyboard.press('Enter'); await page.waitForTimeout(750);
      await checkPhotos();
      assert.equal(await page.locator('#service-tab-wastewater').getAttribute('aria-selected'), 'true');
      await page.close();
    }
  }
  console.log(JSON.stringify({ status: 'PASS', checks, widths: [1440, 390, 320], states: ['default', 'hover', 'selected', 'keyboard', 'reduced-motion'] }));
} finally { await browser.close(); }
