import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const index = JSON.parse(await readFile(new URL('./search-index.json', import.meta.url), 'utf8'));
const documentIndex = JSON.parse(await readFile(new URL('./document-search-index.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('./mirror-manifest.json', import.meta.url), 'utf8'));
assert.equal(index.pageCount, manifest.length, 'every retained page is indexed');
assert.equal(index.pages.length, manifest.length);
assert.equal(documentIndex.documentCount, documentIndex.documents.length);
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
        hrefs: [...document.querySelectorAll('#alpha-site-search-results a')].map((link) => link.getAttribute('href')),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    assert.ok(state.input.right <= state.client.left + 1, `search precedes Client Data Access at ${width}px`);
    if (width === 320) assert.ok(state.input.right - state.input.left >= 105, 'search remains usable on small phones');
    assert.ok(state.panel.left >= -1 && state.panel.right <= width + 1, `results fit viewport at ${width}px: ${JSON.stringify(state.panel)}`);
    assert.ok(state.documentWidth <= state.viewportWidth + 1, `no horizontal scroll at ${width}px`);
    assert.ok(state.hrefs.some((href) => new URL(href, `${baseUrl}/`).pathname === new URL('forms/', `${baseUrl}/`).pathname),
      'coliform results include the indexed Forms page');
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
      await page.locator('#alpha-site-search-results .alpha-site-search__summary').getByText(/No pages or documents match/).waitFor();
      checks += 4;
    }
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${baseUrl}/services-listing/`, { waitUntil: 'networkidle' });
  await page.locator('#alpha-site-search-input').fill('watertrax');
  await page.locator('#alpha-site-search-results a').first().waitFor();
  assert.ok(await page.locator('#alpha-site-search-results a').count() >= 1);
  assert.match(await page.locator('#alpha-site-search-results').innerText(), /WaterTrax/i);
  checks += 2;
  await page.close();

  const documentPage = await browser.newPage({ viewport: { width: 320, height: 760 } });
  await documentPage.route('**/document-search-index.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      version: 1, documentCount: 1, targetCount: 1, failedCount: 0,
      documents: [{ title: 'Synthetic OCR verification', href: 'https://www.alpha-labs.com/example.pdf',
        kind: 'document', method: 'ocr', text: 'The xylobromate test is listed in this document.' }],
      terms: { xylobromate: [[0, 1]] },
    }),
  }));
  await documentPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await documentPage.locator('#alpha-site-search-input').fill('xylobromate');
  const documentResult = documentPage.locator('#alpha-site-search-results a').first();
  await documentResult.waitFor();
  assert.match(await documentPage.locator('.alpha-site-search__summary').innerText(), /0 pages · 1 document/);
  assert.equal(await documentResult.getAttribute('target'), '_blank');
  assert.equal(await documentResult.getAttribute('rel'), 'noopener noreferrer');
  assert.match(await documentResult.innerText(), /Synthetic OCR verification/);
  checks += 4;
  await documentPage.close();

  const ocrOnlyTerm = Object.entries(documentIndex.terms).find(([word, postings]) =>
    word.length >= 8 && /^[a-z]+$/.test(word) && !index.terms[word] &&
    postings.some(([id]) => documentIndex.documents[id].method === 'ocr'));
  if (ocrOnlyTerm) {
    const [word, postings] = ocrOnlyTerm;
    const expectedTitle = documentIndex.documents[postings.find(([id]) => documentIndex.documents[id].method === 'ocr')[0]].title;
    const actualDocumentPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await actualDocumentPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await actualDocumentPage.locator('#alpha-site-search-input').fill(word);
    await actualDocumentPage.locator('#alpha-site-search-results a').first().waitFor();
    assert.match(await actualDocumentPage.locator('.alpha-site-search__summary').innerText(), /0 pages · [1-9]\d* documents/);
    assert.ok((await actualDocumentPage.locator('#alpha-site-search-results a strong').allTextContents()).includes(expectedTitle),
      'a real OCR document appears in the search results');
    checks += 2;
    await actualDocumentPage.close();
  }

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
