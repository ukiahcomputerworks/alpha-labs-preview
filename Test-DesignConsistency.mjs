import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const routes = [
  { name: 'Company', path: '/company/', titleVariant: 'primary', stage: '.entry', body: '.entry-content > p' },
  { name: 'Services', path: '/services-listing/', titleVariant: 'long', stage: '.service-vault', body: '.service-vault__poster > p:last-child' },
  { name: 'Contact', path: '/contact-us-alpha-analytical-laboratories-inc/', titleVariant: 'primary', stage: '.alpha-location-room', body: '.alpha-location-room__intro' },
  { name: 'Forms', path: '/forms/', titleVariant: 'primary', stage: '.entry', body: '.kit-intro > p:last-child' },
  { name: 'Careers', path: '/careers/', titleVariant: 'primary', stage: '.lab-tech-opening', body: '.job-summary' },
  { name: 'Regulatory', path: '/regulatory/', titleVariant: 'primary', stage: '.agency-vault', body: '.agency-index__intro' },
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const failures = [];
const matrix = [];

try {
  const referencePage = await browser.newPage({ viewport: viewports[0] });
  await referencePage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const reference = await referencePage.evaluate(() => {
    const heading = document.querySelector('.alpha-after-dark h1');
    const gold = document.querySelector('.alpha-after-dark h1 span');
    const summary = document.querySelector('.alpha-after-dark__summary');
    const headingStyle = heading && getComputedStyle(heading);
    const summaryStyle = summary && getComputedStyle(summary);
    return {
      headingFamily: headingStyle?.fontFamily,
      headingWeight: headingStyle?.fontWeight,
      bodyFamily: summaryStyle?.fontFamily,
      bodyColor: summaryStyle?.color,
      goldMaterial: getComputedStyle(gold).backgroundImage,
      goldDuration: getComputedStyle(gold).animationDuration,
      goldDelay: getComputedStyle(gold).animationDelay,
    };
  });
  await referencePage.close();

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, hasTouch: viewport.name === 'phone' });
    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
      const state = await page.evaluate(({ stageSelector, bodySelector }) => {
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            left: value.left,
            top: value.top,
            right: value.right,
            bottom: value.bottom,
            width: value.width,
            height: value.height,
          };
        };
        const wrap = document.querySelector('.content-sidebar-wrap');
        const content = document.querySelector('.content');
        const entry = document.querySelector('.entry');
        const header = document.querySelector('.entry-header');
        const title = document.querySelector('.entry-title');
        const entryContent = document.querySelector('.entry-content');
        const firstContent = entryContent && [...entryContent.children].find((element) => getComputedStyle(element).display !== 'none');
        const stage = document.querySelector(stageSelector);
        const bodySample = document.querySelector(bodySelector);
        const titleStyle = title && getComputedStyle(title);
        const bodyStyle = bodySample && getComputedStyle(bodySample);
        const entryStyle = entry && getComputedStyle(entry);
        const stageStyle = stage && getComputedStyle(stage);
        return {
          wrap: rect(wrap),
          content: rect(content),
          entry: rect(entry),
          header: rect(header),
          title: rect(title),
          firstContent: rect(firstContent),
          stage: rect(stage),
          titleFamily: titleStyle?.fontFamily,
          titleWeight: titleStyle?.fontWeight,
          titleSize: titleStyle?.fontSize,
          titleLineHeight: titleStyle?.lineHeight,
          titleAnimation: titleStyle?.animationName,
          titleBackground: titleStyle?.backgroundImage,
          titleDuration: titleStyle?.animationDuration,
          titleDelay: titleStyle?.animationDelay,
          titleBackgroundClip: titleStyle?.backgroundClip,
          bodyFamily: bodyStyle?.fontFamily,
          bodyColor: bodyStyle?.color,
          entryBorder: entryStyle?.borderTopWidth,
          entryAccentHeight: getComputedStyle(entry, '::before').height,
          headerLabelDisplay: getComputedStyle(header, '::after').display,
          stageBackground: stageStyle?.backgroundImage,
          stageBorder: stageStyle?.borderTopWidth,
          activeNavCount: document.querySelectorAll('.genesis-nav-menu .current-menu-item, .genesis-nav-menu .current_page_item').length,
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, { stageSelector: route.stage, bodySelector: route.body });

      const tolerance = 1.5;
      const fills = (outer, inner) => outer && inner && Math.abs(outer.left - inner.left) <= tolerance && Math.abs(outer.right - inner.right) <= tolerance;
      if (!fills(state.wrap, state.content) || !fills(state.content, state.entry)) failures.push(`${viewport.name} ${route.name}: primary content does not fill the shared page shell`);
      if (!state.titleFamily?.includes('Rajdhani') || state.titleWeight !== '700') failures.push(`${viewport.name} ${route.name}: page title typography diverges from the homepage display role`);
      if (!state.titleAnimation?.includes('alpha-gold-text-glint') || !state.titleBackgroundClip?.split(',').every((clip) => clip.trim() === 'text') || state.titleBackground !== reference.goldMaterial) failures.push(`${viewport.name} ${route.name}: page title is missing the homepage gold material and glint`);
      if (state.titleDuration === reference.goldDuration && state.titleDelay === reference.goldDelay) failures.push(`${viewport.name} ${route.name}: page title glint is synchronized with the homepage`);
      if (state.bodyFamily !== reference.bodyFamily || state.bodyColor !== 'rgb(255, 255, 255)') failures.push(`${viewport.name} ${route.name}: body typography diverges from the approved white inner-page body role`);
      if (state.entryBorder !== '1px' || state.entryAccentHeight !== '3px') failures.push(`${viewport.name} ${route.name}: shared page frame is incomplete`);
      if (viewport.name === 'desktop' && state.headerLabelDisplay === 'none') failures.push(`${viewport.name} ${route.name}: shared analytical-system header label is missing`);
      if (viewport.name === 'phone' && state.headerLabelDisplay !== 'none') failures.push(`${viewport.name} ${route.name}: desktop header label remains crowded on mobile`);
      if (!state.stageBackground || state.stageBackground === 'none') failures.push(`${viewport.name} ${route.name}: first content stage has no intentional surface treatment`);
      if (state.activeNavCount !== 1) failures.push(`${viewport.name} ${route.name}: expected one current navigation item`);
      if (state.horizontalOverflow > 1) failures.push(`${viewport.name} ${route.name}: horizontal overflow is ${state.horizontalOverflow}px`);
      matrix.push({
        viewport: viewport.name,
        route: route.name,
        titleVariant: route.titleVariant,
        entryLeft: Math.round(state.entry.left),
        entryWidth: Math.round(state.entry.width),
        titleLeft: Math.round(state.title.left),
        titleTop: Math.round(state.title.top),
        titleSize: state.titleSize,
        titleLineHeight: state.titleLineHeight,
        goldDuration: state.titleDuration,
        goldDelay: state.titleDelay,
        contentGap: Math.round((state.firstContent.top - state.header.bottom) * 10) / 10,
        overflow: state.horizontalOverflow,
      });
    }
    await page.close();
  }

  for (const viewport of viewports) {
    const rows = matrix.filter((row) => row.viewport === viewport.name);
    const primaryRows = rows.filter((row) => row.titleVariant === 'primary');
    const values = (key, source = rows) => source.map((row) => row[key]);
    const spread = (key, source = rows) => Math.max(...values(key, source)) - Math.min(...values(key, source));
    if (spread('entryLeft') > 1 || spread('entryWidth') > 1 || spread('titleLeft') > 1 || spread('titleTop') > 1) failures.push(`${viewport.name}: page-shell or title alignment is inconsistent across the six owner-review pages`);
    if (new Set(values('titleSize', primaryRows)).size !== 1 || new Set(values('titleLineHeight', primaryRows)).size !== 1) failures.push(`${viewport.name}: primary title scale is inconsistent`);
    if (spread('contentGap') > 1) failures.push(`${viewport.name}: title-to-content spacing is inconsistent`);
  }

  console.log(JSON.stringify({
    status: failures.length ? 'FAIL' : 'PASS',
    reference,
    routes: routes.length,
    checks: matrix.length,
    matrix,
    failures,
  }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
