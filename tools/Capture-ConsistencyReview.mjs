import { mkdir } from 'node:fs/promises';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const output = process.argv[3] || 'C:/Users/Admin/AppData/Local/Temp/alpha-consistency-review';
const routes = [
  ['company', '/company/'],
  ['services', '/services-listing/'],
  ['contact', '/contact-us-alpha-analytical-laboratories-inc/'],
  ['forms', '/forms/'],
  ['careers', '/careers/'],
  ['regulatory', '/regulatory/'],
];
const viewports = [
  ['large', { width: 1920, height: 1080 }],
  ['compact', { width: 1440, height: 800 }],
  ['tablet', { width: 768, height: 1024 }],
  ['phone', { width: 390, height: 844 }],
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const [viewportName, viewport] of viewports) {
    const page = await browser.newPage({ viewport, hasTouch: viewportName === 'phone' });
    for (const [routeName, route] of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({ path: `${output}/${routeName}-${viewportName}.png`, fullPage: false });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(output);
