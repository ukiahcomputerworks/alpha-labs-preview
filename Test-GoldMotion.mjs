import assert from 'node:assert/strict';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import sharp from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const routes = [
  ['/', '.alpha-after-dark h1 span'],
  ['/services-listing/', '.entry-title'],
  ['/company/', '.entry-title'],
  ['/contact-us-alpha-analytical-laboratories-inc/', '.entry-title'],
  ['/forms/', '.entry-title'],
  ['/careers/', '.entry-title'],
  ['/regulatory/', '.entry-title'],
];
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const durations = new Set();
const results = [];

try {
  for (const [path, selector] of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    const state = await page.locator(selector).evaluate(element => {
      const style = getComputedStyle(element);
      const animation = element.getAnimations().find(item => item.animationName === 'alpha-gold-text-glint');
      return { name: style.animationName, count: style.animationIterationCount, duration: style.animationDuration, delay: style.animationDelay, layers: style.backgroundImage.split('linear-gradient').length - 1, keyframes: animation?.effect.getKeyframes().map(frame => frame.backgroundPositionX) };
    });
    assert.equal(state.name, 'alpha-gold-text-glint', `${path} uses shared gold glint`);
    assert.equal(state.count, 'infinite', `${path} glint loops`);
    assert.ok(state.layers >= 2, `${path} retains gold base beneath the glint`);
    assert.notEqual(state.keyframes?.[0], state.keyframes?.at(-1), `${path} glint moves across text`);
    durations.add(state.duration);
    results.push(`${path} ${state.duration} ${state.delay}`);
    await page.close();
  }
  assert.ok(durations.size >= 5, 'headline glints use varied timing intervals');

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const heading = page.locator('.alpha-after-dark h1');
  const gold = page.locator('.alpha-after-dark h1 span');
  const visualFrames = [];
  for (const position of ['115% center, center', '54% center, center']) {
    await gold.evaluate((element, value) => {
      element.getAnimations().forEach(animation => animation.cancel());
      element.style.backgroundPosition = value;
    }, position);
    visualFrames.push(await heading.screenshot());
  }
  const first = await sharp(visualFrames[0]).removeAlpha().raw().toBuffer();
  const second = await sharp(visualFrames[1]).removeAlpha().raw().toBuffer();
  assert.equal(first.length, second.length);
  let changedPixels = 0;
  for (let index = 0; index < first.length; index += 3) {
    if (Math.abs(first[index] - second[index]) + Math.abs(first[index + 1] - second[index + 1]) + Math.abs(first[index + 2] - second[index + 2]) > 45) changedPixels++;
  }
  assert.ok(changedPixels > 100, `gold glint is visibly different across the sweep (${changedPixels} changed pixels)`);
  results.push(`visible gold sweep: ${changedPixels} changed pixels`);
  await page.close();

  for (const width of [1440, 390, 320]) {
    const searchPage = await browser.newPage({ viewport: { width, height: 844 } });
    await searchPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const searchState = await searchPage.evaluate(() => {
      const frame = document.querySelector('.alpha-site-search');
      const input = document.querySelector('#alpha-site-search-input');
      const outline = getComputedStyle(frame, '::before');
      return { inputBorder: getComputedStyle(input).borderTopWidth, outlineClip: outline.clipPath, outlineAnimation: outline.animationName, outlineCount: outline.animationIterationCount, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    assert.equal(searchState.inputBorder, '0px', `${width}px search icon has no divider`);
    assert.ok(searchState.outlineClip.includes('10px'), `${width}px search frame is slanted`);
    assert.equal(searchState.outlineAnimation, 'alpha-search-outline-glint', `${width}px search outline shimmers`);
    assert.equal(searchState.outlineCount, 'infinite', `${width}px outline shimmer loops`);
    assert.ok(searchState.overflow <= 1, `${width}px header has no horizontal overflow`);
    results.push(`${width}px search outline`);
    await searchPage.close();
  }

  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reduced.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  assert.equal(await reduced.locator('.alpha-after-dark h1 span').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.equal(await reduced.locator('.alpha-site-search').evaluate(element => getComputedStyle(element, '::before').animationName), 'none');
  results.push('reduced-motion fallback');
  await reduced.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ status: 'PASS', checks: results.length, results }, null, 2));
