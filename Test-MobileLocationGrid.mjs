import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const failures = [];
const results = [];

try {
  for (const width of [320, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true });
    const response = await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 });
    const state = await page.evaluate(() => {
      const table = document.querySelector('table.locations');
      const cells = [...table.querySelectorAll('td')].map((cell) => cell.getBoundingClientRect());
      const tableRect = table.getBoundingClientRect();
      return {
        columns: new Set(cells.map((rect) => Math.round(rect.left))).size,
        rows: new Set(cells.map((rect) => Math.round(rect.top))).size,
        equalWidths: Math.max(...cells.map((rect) => rect.width)) - Math.min(...cells.map((rect) => rect.width)) <= 1,
        cellsInsideTable: cells.every((rect) => rect.left >= tableRect.left - 1 && rect.right <= tableRect.right + 1),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tableScrollable: table.scrollWidth > table.clientWidth + 1,
      };
    });

    if (!response || response.status() !== 200) failures.push(`${width}px: HTTP ${response?.status() ?? 'none'}`);
    if (state.columns !== 2 || state.rows !== 3) failures.push(`${width}px: expected 2 columns and 3 rows, found ${state.columns} columns and ${state.rows} rows`);
    if (!state.equalWidths || !state.cellsInsideTable) failures.push(`${width}px: location cards are uneven or outside their frame`);
    if (state.pageOverflow > 0 || state.tableScrollable) failures.push(`${width}px: unexpected horizontal overflow`);
    results.push({ width, ...state });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures, results }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: 'PASS', checks: results.length, results }, null, 2));
}
