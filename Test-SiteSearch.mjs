import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const index = JSON.parse(await readFile(new URL('./search-index.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('./mirror-manifest.json', import.meta.url), 'utf8'));
assert.equal(index.pageCount, manifest.length, 'every retained page is indexed');
assert.equal(index.pages.length, manifest.length);
assert.ok(Object.keys(index.terms).length > 1500, 'full word vocabulary is indexed');
for (const term of ['watertrax', 'pretreatment', 'coliform', 'sediment', 'hazardous']) {
  assert.ok(index.terms[term]?.length, `key public term ${term} is indexed`);
}
for (const [id, page] of index.pages.entries()) {
  assert.ok(page.title && page.text, `page ${id} has searchable content`);
  assert.ok(!page.href.includes('..') && !page.href.startsWith('http'), `page ${id} stays on site`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
let checks = 0;
try {
  for (const width of [1440, 768, 600, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    const input = page.locator('#alpha-site-search-input');
    assert.equal(await input.count(), 1, `one search input at ${width}px`);
    assert.equal(await page.locator('#client-connect').count(), 1, `Client Data Access remains at ${width}px`);
    await input.fill('coliform');
    await page.locator('#alpha-site-search-results a').first().waitFor();
    const state = await page.evaluate(() => {
      const rect = (selector) => {
        const { left, right, top, bottom } = document.querySelector(selector).getBoundingClientRect();
        return { left, right, top, bottom };
      };
      return {
        input: rect('.alpha-site-search'),
        client: rect('#client-connect'),
        panel: rect('#alpha-site-search-results'),
        href: document.querySelector('#alpha-site-search-results a').getAttribute('href'),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    assert.ok(state.input.right <= state.client.left + 1, `search precedes Client Data Access at ${width}px`);
    if (width === 320) assert.ok(state.input.right - state.input.left >= 105, 'search remains usable on small phones');
    assert.ok(state.panel.left >= -1 && state.panel.right <= width + 1, `results fit viewport at ${width}px: ${JSON.stringify(state.panel)}`);
    assert.ok(state.documentWidth <= state.viewportWidth + 1, `no horizontal scroll at ${width}px`);
    assert.equal(new URL(state.href, `${baseUrl}/`).pathname, new URL('forms/', `${baseUrl}/`).pathname,
      'coliform result links to indexed Forms page');
    assert.deepEqual(errors, [], `no browser errors at ${width}px`);
    checks += 5;
    if (width === 390) {
      await input.fill('potw pretreatment');
      await page.locator('#alpha-site-search-results a').first().waitFor();
      assert.match(await page.locator('#alpha-site-search-results').innerText(), /POTW|Pretreatment/i);
      await input.press('ArrowDown');
      assert.equal(await input.getAttribute('aria-activedescendant'), 'alpha-site-search-option-0');
      await input.press('Escape');
      assert.equal(await input.getAttribute('aria-expanded'), 'false');
      await input.fill('zzzxqvnmnotfound');
      await page.locator('#alpha-site-search-results .alpha-site-search__summary').getByText(/No pages match/).waitFor();
      checks += 4;
    }
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/services-listing/`, { waitUntil: 'networkidle' });
  await page.locator('#alpha-site-search-input').fill('watertrax');
  await page.locator('#alpha-site-search-results a').first().waitFor();
  assert.equal(await page.locator('#alpha-site-search-results a').count(), 1);
  assert.match(await page.locator('#alpha-site-search-results a').first().innerText(), /WaterTrax/i);
  checks += 2;
  await page.close();

  const routePage = await browser.newPage();
  for (const item of manifest) {
    const route = item.Route === '/' ? '/' : item.Route.endsWith('.html') ? item.Route : `${item.Route}/`;
    await routePage.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    const hasClientAccess = await routePage.locator('.site-header #client-connect').count() > 0;
    assert.equal(await routePage.locator('#alpha-site-search-input').count(), hasClientAccess ? 1 : 0,
      `search appears beside Client Data Access on ${route}`);
    checks++;
  }
  await routePage.close();
} finally {
  await browser.close();
}
console.log(`PASS: ${checks} indexed-search, interaction, and responsive checks`);
