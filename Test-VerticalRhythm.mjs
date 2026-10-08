import { readFileSync } from 'node:fs';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const manifest = JSON.parse(readFileSync(new URL('./mirror-manifest.json', import.meta.url), 'utf8'));
const viewports = [
  { name: 'large', width: 1920, height: 1080 },
  { name: 'compact', width: 1440, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, hasTouch: viewport.name === 'phone' });
    for (const item of manifest) {
      const route = item.Route === '/' ? '/' : item.Route.endsWith('.html') ? item.Route : `${item.Route}/`;
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(route === '/' ? 700 : 80);
      const measurements = await page.evaluate(() => {
        const visible = (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const rect = (element) => element?.getBoundingClientRect();
        const entry = document.querySelector('.entry');
        const header = entry?.querySelector(':scope > .entry-header');
        const content = entry?.querySelector(':scope > .entry-content');
        const contentChildren = content ? [...content.children].filter(visible) : [];
        const childRects = contentChildren.map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: element.className || '',
          top: rect(element).top,
          bottom: rect(element).bottom,
        })).sort((a, b) => a.top - b.top);
        const contentGaps = childRects.slice(1).map((current, index) => ({
          from: childRects[index],
          to: current,
          gap: Math.max(0, current.top - childRects[index].bottom),
        })).sort((a, b) => b.gap - a.gap);
        const entryRect = rect(entry);
        const headerRect = rect(header);
        const firstRect = childRects[0];
        const lastRect = childRects.at(-1);
        const siteInner = document.querySelector('.site-inner');
        const siteInnerRect = rect(siteInner);
        return {
          pageHeight: document.documentElement.scrollHeight,
          viewportHeight: window.innerHeight,
          siteTopGap: entryRect && siteInnerRect ? Math.max(0, entryRect.top - siteInnerRect.top) : 0,
          headerToContentGap: headerRect && firstRect ? Math.max(0, firstRect.top - headerRect.bottom) : 0,
          entryBottomGap: entryRect && lastRect ? Math.max(0, entryRect.bottom - lastRect.bottom) : 0,
          largestContentGap: contentGaps[0]?.gap || 0,
          largestContentGapFrom: contentGaps[0]?.from?.className || contentGaps[0]?.from?.tag || '',
          largestContentGapTo: contentGaps[0]?.to?.className || contentGaps[0]?.to?.tag || '',
        };
      });
      results.push({ viewport: viewport.name, route, status: response?.status() || 0, ...measurements });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

const suspects = results.filter((result) => (
  result.status !== 200
  || result.headerToContentGap > (result.viewport === 'phone' ? 58 : 90)
  || result.largestContentGap > (result.viewport === 'phone' ? 96 : 150)
  || result.entryBottomGap > (result.viewport === 'phone' ? 90 : 150)
));

console.log(JSON.stringify({
  status: suspects.length ? 'REVIEW' : 'PASS',
  routes: manifest.length,
  renderedChecks: results.length,
  viewports,
  suspects,
}, null, 2));
