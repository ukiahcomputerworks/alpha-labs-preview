import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const stagedUrl = `${baseUrl}/meeting-staged/careers-lab-tech/`;
const activeUrl = `${baseUrl}/careers/`;
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const results = [];

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(stagedUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-staged-template="lab-tech-careers"]');

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      title: document.querySelector('h1')?.textContent?.trim(),
      activeNav: [...document.querySelectorAll('.current-menu-item a')].map((link) => link.textContent.trim()),
      formWidth: document.querySelector('#lab-tech-application')?.getBoundingClientRect().width,
    }));

    if (layout.documentWidth > layout.viewportWidth) throw new Error(`${viewport.name}: horizontal overflow ${layout.documentWidth}/${layout.viewportWidth}`);
    if (layout.brokenImages) throw new Error(`${viewport.name}: ${layout.brokenImages} broken image(s)`);
    if (layout.title !== 'Careers') throw new Error(`${viewport.name}: Careers heading missing`);
    if (layout.activeNav.length !== 1 || layout.activeNav[0] !== 'Careers') throw new Error(`${viewport.name}: active navigation is incorrect`);
    if (!layout.formWidth || layout.formWidth > layout.viewportWidth) throw new Error(`${viewport.name}: application form width is invalid`);

    await page.fill('#app-name', 'Demo Applicant');
    await page.fill('#app-email', 'demo@example.com');
    await page.fill('#app-phone', '707-555-0100');
    await page.fill('#app-start', '2026-09-14');
    await page.check('input[name="schedule"][value="yes"]');
    await page.selectOption('#app-education', { label: 'Associate degree' });
    await page.fill('#app-experience', 'Processed environmental samples and maintained quality-control records.');
    await page.fill('#app-data', 'Entered sample and result data with a two-step accuracy check.');
    await page.fill('#app-interest', 'Interested in accurate environmental laboratory work.');
    await page.check('input[name="accuracy"]');

    const nonGetRequests = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') nonGetRequests.push(`${request.method()} ${request.url()}`);
    });
    const beforeSubmit = page.url();
    await page.click('button[type="submit"]');
    await page.waitForSelector('#application-status.is-visible');
    await page.waitForTimeout(300);
    if (page.url() !== beforeSubmit) throw new Error(`${viewport.name}: form submission changed the page URL`);
    if (nonGetRequests.length) throw new Error(`${viewport.name}: form triggered network request(s): ${nonGetRequests.join(', ')}`);

    results.push({ viewport: viewport.name, ...layout, formInteraction: 'PASS', transmission: 'NONE' });
    await page.close();
  }

  const activePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await activePage.goto(activeUrl, { waitUntil: 'domcontentloaded' });
  const activeState = await activePage.evaluate(() => ({
    hasNoOpenings: document.body.innerText.includes('No openings are currently posted'),
    hasStagedMarker: Boolean(document.querySelector('[data-staged-template="lab-tech-careers"]')),
    hasLabTechOpening: document.body.innerText.includes('Laboratory Technician'),
  }));
  if (activeState.hasNoOpenings || !activeState.hasStagedMarker || !activeState.hasLabTechOpening) throw new Error('Active Careers route is missing the published Laboratory Technician opening.');
  results.push({ activeCareers: 'LAB_TECH_OPENING_PUBLISHED' });
  await activePage.close();

  console.log(JSON.stringify({ status: 'PASS', stagedUrl, results }, null, 2));
} finally {
  await browser.close();
}
