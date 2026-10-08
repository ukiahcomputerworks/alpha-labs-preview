import { readFileSync } from 'node:fs';
import { chromium } from 'file:///C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:4174').replace(/\/$/, '');
const manifest = JSON.parse(readFileSync(new URL('./mirror-manifest.json', import.meta.url), 'utf8'));
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'compact-desktop', width: 1440, height: 800 },
  { name: 'scaled-desktop', width: 1200, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const failures = [];
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, hasTouch: viewport.name === 'phone' });

    for (const item of manifest) {
      const route = item.Route === '/' ? '/' : item.Route.endsWith('.html') ? item.Route : `${item.Route}/`;
      const url = `${baseUrl}${route}`;

      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(route === '/' ? 900 : 100);
        const state = await page.evaluate(() => {
          const title = document.querySelector('.entry-title, .entry-content h1');
          const titleStyle = title ? getComputedStyle(title) : null;
          const headerLogo = document.querySelector('.site-title a');
          const logoRect = headerLogo?.getBoundingClientRect();
          const heroLogo = document.querySelector('.alpha-after-dark__logo');
          const heroLogoRect = heroLogo?.getBoundingClientRect();
          const localBrokenImages = [...document.images].filter((image) => {
            if (!image.complete || image.naturalWidth > 0) return false;
            const source = image.currentSrc || image.src;
            return source.startsWith(location.origin) || source.includes('/assets/');
          }).length;

          return {
            statusTitle: document.title,
            viewportWidth: document.documentElement.clientWidth,
            documentWidth: document.documentElement.scrollWidth,
            localBrokenImages,
            headerLogoVisible: Boolean(logoRect && logoRect.width > 0 && logoRect.height > 0),
            heroLogoVisible: Boolean(heroLogoRect && heroLogoRect.width > 0 && heroLogoRect.height > 0),
            headerPresent: Boolean(document.querySelector('.site-header')),
            titleFont: titleStyle?.fontFamily || null,
            titleWeight: titleStyle?.fontWeight || null,
            titleLineHeight: titleStyle?.lineHeight || null,
            entryTitleMetallic: !document.querySelector('.entry-title') || Boolean(
              titleStyle?.backgroundImage.includes('gradient')
              && titleStyle?.webkitTextFillColor === 'rgba(0, 0, 0, 0)'
            ),
            visibleStreetViewLabels: [...document.querySelectorAll('.street-view-link')]
              .filter((link) => link.textContent.trim().toLowerCase() === 'street view').length,
          };
        });

        if (!response || response.status() !== 200) failures.push(`${viewport.name} ${route}: HTTP ${response?.status() ?? 'none'}`);
        if (state.documentWidth > state.viewportWidth) failures.push(`${viewport.name} ${route}: horizontal overflow ${state.documentWidth}/${state.viewportWidth}`);
        if (state.localBrokenImages) failures.push(`${viewport.name} ${route}: ${state.localBrokenImages} broken local image(s)`);
        if (!state.entryTitleMetallic) failures.push(`${viewport.name} ${route}: primary page title does not use the shared metallic-gold treatment`);
        const headerlessLandingTemplate = route === '/landing-page/' && !state.headerPresent;
        if (!state.headerLogoVisible && !headerlessLandingTemplate && route !== '/') failures.push(`${viewport.name} ${route}: header logo is not visible`);
        if (route === '/' && state.headerLogoVisible) failures.push(`${viewport.name} ${route}: redundant home header logo is visible`);
        if (route === '/' && !state.heroLogoVisible) failures.push(`${viewport.name} ${route}: home hero logo is not visible`);
        if (state.visibleStreetViewLabels) failures.push(`${viewport.name} ${route}: standalone Street View label remains`);

        const footerPhoneState = await page.evaluate(() => {
          const links = [...document.querySelectorAll('table.locations .phone-link')];
          const table = document.querySelector('table.locations');
          const cardRow = table?.querySelector('tbody');
          const tableRect = table?.getBoundingClientRect();
          const cardRowRect = cardRow?.getBoundingClientRect();
          return {
            count: links.length,
            allCallable: links.every((link) => link.getAttribute('href')?.startsWith('tel:+1')),
            noBottomDash: links.every((link) => getComputedStyle(link).borderBottomWidth === '0px'),
            centerDelta: tableRect && cardRowRect
              ? Math.abs((tableRect.left + tableRect.width / 2) - (cardRowRect.left + cardRowRect.width / 2))
              : null,
          };
        });
        if (footerPhoneState.count && (footerPhoneState.count !== 6 || !footerPhoneState.allCallable || !footerPhoneState.noBottomDash)) {
          failures.push(`${viewport.name} ${route}: Company Locations phone links lost their call targets or still show the uneven bottom dash`);
        }
        if (viewport.name !== 'phone' && footerPhoneState.centerDelta !== null && footerPhoneState.centerDelta > 2) {
          failures.push(`${viewport.name} ${route}: Company Locations cards are not centered in their footer frame (${footerPhoneState.centerDelta}px)`);
        }

        if (route === '/') {
          const homeStoryState = await page.evaluate(() => {
            const hero = document.querySelector('.alpha-after-dark');
            const cta = document.querySelector('[data-home-business-cta]');
            const ctaStyle = cta && getComputedStyle(cta);
            const homeHeading = document.querySelector('.entry-content > h1');
            const specsHeading = document.querySelector('.entry-content > h2');
            const bodyCopy = [...document.querySelectorAll('.entry-content > p, .entry-content li')];
            const actionCards = [...document.querySelectorAll('.alpha-action-rail > a')];
            const companyLocations = document.querySelector('#company-locations');
            const heroContent = document.querySelector('.alpha-after-dark__content');
            const heroActions = document.querySelector('.alpha-after-dark__actions');
            const heroContentRect = heroContent?.getBoundingClientRect();
            const heroActionsRect = heroActions?.getBoundingClientRect();
            const referenceH1 = document.createElement('h1');
            const referenceH2 = document.createElement('h2');
            referenceH1.style.cssText = referenceH2.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none';
            document.body.append(referenceH1, referenceH2);
            const homeHeadingStyle = homeHeading && getComputedStyle(homeHeading);
            const specsHeadingStyle = specsHeading && getComputedStyle(specsHeading);
            const referenceH1Size = getComputedStyle(referenceH1).fontSize;
            const referenceH2Size = getComputedStyle(referenceH2).fontSize;
            const bodyFontSize = parseFloat(getComputedStyle(document.body).fontSize);
            const bodyCopyReadable = bodyCopy.every((node) => {
              const style = getComputedStyle(node);
              return style.color === 'rgb(255, 255, 255)' && parseFloat(style.fontSize) > bodyFontSize;
            });
            const actionRailTreatment = actionCards.length === 4 && actionCards.every((card) => {
              const numberStyle = getComputedStyle(card.querySelector('.alpha-action-rail__number'));
              const promptStyle = getComputedStyle(card.querySelector('strong'));
              const supportingStyle = getComputedStyle(card.querySelector('small'));
              return numberStyle.backgroundImage.includes('gradient')
                && promptStyle.backgroundImage.includes('gradient')
                && numberStyle.webkitTextFillColor === 'rgba(0, 0, 0, 0)'
                && promptStyle.webkitTextFillColor === 'rgba(0, 0, 0, 0)'
                && supportingStyle.color === 'rgb(255, 255, 255)'
                && parseFloat(supportingStyle.fontSize) >= 13;
            });
            const actionRailStaggered = new Set(actionCards.map((card) => getComputedStyle(card.querySelector('strong')).animationDelay)).size === 4;
            referenceH1.remove();
            referenceH2.remove();
            return {
              heroTitleMarkup: hero?.querySelector('h1')?.innerHTML || '',
              storyText: document.querySelector('.entry-content')?.textContent.replace(/\s+/g, ' ').trim() || '',
              ctaHref: cta?.href || '',
              ctaIsGold: Boolean(ctaStyle && ctaStyle.backgroundImage.includes('gradient')),
              ctaIsAngled: Boolean(ctaStyle && ctaStyle.clipPath !== 'none'),
              headingsAreGold: Boolean(homeHeadingStyle && specsHeadingStyle && homeHeadingStyle.backgroundImage.includes('gradient') && specsHeadingStyle.backgroundImage.includes('gradient') && homeHeadingStyle.webkitTextFillColor === 'rgba(0, 0, 0, 0)' && specsHeadingStyle.webkitTextFillColor === 'rgba(0, 0, 0, 0)'),
              headingSizesPreserved: Boolean(homeHeadingStyle && specsHeadingStyle && homeHeadingStyle.fontSize === referenceH1Size && specsHeadingStyle.fontSize === referenceH2Size),
              bodyCopyReadable,
              actionRailTreatment,
              actionRailStaggered,
              actionOneHref: actionCards[0]?.getAttribute('href') || '',
              actionThreeHref: actionCards[2]?.getAttribute('href') || '',
              actionThreeCopy: actionCards[2]?.querySelector('small')?.textContent.trim() || '',
              companyLocationsIsFocusable: companyLocations?.getAttribute('tabindex') === '-1',
              compactHeroFits: !heroContentRect || !heroActionsRect || (
                heroContentRect.top >= -1
                && heroActionsRect.bottom <= window.innerHeight + 1
              ),
            };
          });
          if (homeStoryState.heroTitleMarkup !== "The science is serious.<br><span>The experience doesn't have to be.</span>") failures.push(`${viewport.name} ${route}: approved Alpha After Dark hero changed`);
          if (!homeStoryState.storyText.includes("Since 1975, Alpha Labs has been California’s quiet powerhouse") || !homeStoryState.storyText.includes("We don’t just run tests; we craft certainty.")) failures.push(`${viewport.name} ${route}: approved homepage story is incomplete`);
          if (!homeStoryState.ctaHref.endsWith('/contact-us-alpha-analytical-laboratories-inc/') || !homeStoryState.ctaIsGold || !homeStoryState.ctaIsAngled) failures.push(`${viewport.name} ${route}: homepage business CTA is not the shared gold angled control`);
          if (!homeStoryState.headingsAreGold || !homeStoryState.headingSizesPreserved) failures.push(`${viewport.name} ${route}: homepage headings are not gold or their established sizes changed`);
          if (!homeStoryState.bodyCopyReadable) failures.push(`${viewport.name} ${route}: homepage body copy is not solid white and larger than the base text`);
          if (!homeStoryState.actionRailTreatment || !homeStoryState.actionRailStaggered) failures.push(`${viewport.name} ${route}: homepage action rail is missing the gold-and-white treatment or independent shimmer timing`);
          if (homeStoryState.actionOneHref !== '#company-locations' || !homeStoryState.companyLocationsIsFocusable) failures.push(`${viewport.name} ${route}: action 01 does not target the accessible Company Locations phone directory`);
          if (!homeStoryState.actionThreeHref.endsWith('contact-us-alpha-analytical-laboratories-inc/') || homeStoryState.actionThreeCopy !== 'Choose your laboratory location') failures.push(`${viewport.name} ${route}: action 03 does not route to the location-neutral Contact selector`);
          if (viewport.name === 'compact-desktop' && !homeStoryState.compactHeroFits) failures.push(`${viewport.name} ${route}: homepage hero actions are clipped below the viewport`);

          await page.locator('.alpha-action-rail > a').first().click();
          await page.waitForTimeout(100);
          const phoneDirectoryState = await page.evaluate(() => {
            const target = document.querySelector('#company-locations');
            const rect = target?.getBoundingClientRect();
            const phoneRects = [...document.querySelectorAll('table.locations .phone-link')]
              .map((link) => link.getBoundingClientRect());
            return {
              hash: location.hash,
              scrolled: window.scrollY > 0,
              targetVisible: Boolean(rect && rect.top >= 0 && rect.top < window.innerHeight),
              phoneVisible: phoneRects.some((phoneRect) => phoneRect.top >= 0 && phoneRect.top < window.innerHeight),
              targetFocused: document.activeElement === target,
            };
          });
          if (phoneDirectoryState.hash !== '#company-locations' || !phoneDirectoryState.scrolled || !phoneDirectoryState.targetVisible || !phoneDirectoryState.phoneVisible || !phoneDirectoryState.targetFocused) failures.push(`${viewport.name} ${route}: action 01 did not scroll and focus the phone directory (${JSON.stringify(phoneDirectoryState)})`);
        }

        if (route === '/contact-us-alpha-analytical-laboratories-inc/') {
          const mapState = await page.locator('.california-map').evaluate((map) => {
            const mapRect = map.getBoundingClientRect();
            const labels = [...map.querySelectorAll('.alpha-map-pin > span:last-child')]
              .map((label) => label.getBoundingClientRect());
            return {
              width: mapRect.width,
              mapInViewport: mapRect.left >= 0 && mapRect.right <= window.innerWidth,
              labelsInViewport: labels.every((rect) => rect.left >= 0 && rect.right <= window.innerWidth),
            };
          });
          const desktopMapWidthCorrect = Math.abs(mapState.width - 358.4) <= 1;
          const phoneMapWidthReadable = mapState.width >= 240;
          if ((viewport.name === 'phone' ? !phoneMapWidthReadable : !desktopMapWidthCorrect) || !mapState.mapInViewport || !mapState.labelsInViewport) {
            failures.push(`${viewport.name} ${route}: California locator or a city label is clipped or undersized (${JSON.stringify(mapState)})`);
          }

          const locations = [
            ['Ukiah', 'ukiah', 'ELAP #1551', 'tel:+17074680401', 'pano=hrSOhWrCACuB3DL7BAOeWw'],
            ['Petaluma', 'petaluma', 'ELAP #2303', 'tel:+17077693128', 'pano=6tT44-bsUzYURf0uz4lkwg'],
            ['Elk Grove', 'elk-grove', 'ELAP #2922', 'tel:+19166865190', 'pano=Kzeu8duDrdPRLF1ls2HtdQ'],
            ['Livermore', 'livermore', 'ELAP #2728', 'tel:+19258286226', 'pano=eiwmjrYIy4pXrqJ8vMRZyg'],
            ['Signal Hill', 'signal-hill', 'ELAP #3091', 'tel:+14242675032', 'pano=ADsf5U4F_86DB1IFNYfwpA'],
            ['Vista', 'vista', 'ELAP #3055', 'tel:+17605363352', 'pano=PBBjY1xAnGrsFhH8jSf_cA'],
          ];

          for (const [buttonName, panelName, elap, phoneHref, streetNeedle] of locations) {
            await page.getByRole('button', { name: buttonName, exact: true }).click();
            await page.waitForTimeout(40);
            const locatorState = await page.evaluate((expectedPanel) => {
              const heading = document.querySelector(`[data-location-panel="${expectedPanel}"] h3`);
              const panel = document.querySelector(`[data-location-panel="${expectedPanel}"]`);
              return ({
                activePins: document.querySelectorAll('.alpha-map-pin.is-active').length,
                visiblePanels: [...document.querySelectorAll('[data-location-panel]')]
                  .filter((candidate) => !candidate.hidden)
                  .map((candidate) => candidate.dataset.locationPanel),
                placeholderHidden: document.querySelector('[data-location-placeholder]')?.hidden,
                headingFitsOneLine: Boolean(heading && heading.scrollWidth <= heading.clientWidth + 1 && getComputedStyle(heading).whiteSpace === 'nowrap'),
                fullyReadable: Boolean(panel && getComputedStyle(panel.querySelector('.street-view-link')).visibility === 'visible' && getComputedStyle(panel.querySelector('.phone-link')).visibility === 'visible'),
                elap: panel?.querySelector('.location-intelligence__status')?.textContent.match(/ELAP #\d+/)?.[0],
                phoneHref: panel?.querySelector('.phone-link')?.getAttribute('href'),
                streetHref: panel?.querySelector('.street-view-link')?.getAttribute('href'),
              });
            }, panelName);

            if (locatorState.activePins !== 1 || locatorState.visiblePanels.length !== 1 || locatorState.visiblePanels[0] !== panelName || !locatorState.placeholderHidden) {
              failures.push(`${viewport.name} ${route}: ${buttonName} did not release only its matching location panel`);
            }
            if (!locatorState.headingFitsOneLine) failures.push(`${viewport.name} ${route}: ${buttonName} location heading does not fit on one line`);
            if (!locatorState.fullyReadable) failures.push(`${viewport.name} ${route}: ${buttonName} contact details are not fully readable after selection`);
            if (locatorState.elap !== elap || locatorState.phoneHref !== phoneHref || !locatorState.streetHref?.includes(streetNeedle)) failures.push(`${viewport.name} ${route}: ${buttonName} verified contact data or destination changed`);
          }
        }

        if (route === '/services-listing/') {
          const servicesState = await page.evaluate(() => {
            const titleElement = document.querySelector('.entry-title');
            const titleStyle = titleElement && getComputedStyle(titleElement);
            const tabs = [...document.querySelectorAll('[data-service-target]')];
            const panels = [...document.querySelectorAll('[data-service-panel]')];
            const activeTab = document.querySelector('[data-service-target].is-active');
            const visiblePanels = panels.filter((panel) => !panel.hidden);
            const rail = document.querySelector('.service-index__rail');
            const dossier = document.querySelector('.service-intelligence');
            const watertrax = document.querySelector('.service-support a[href^="https://aquaticinformatics.com/"]');
            const email = document.querySelector('.entry-content a[href="mailto:robbie@alpha-labs.com"]');
            const potw = document.querySelector('.service-support a[href$="/potw-pretreatment-program-work/"]');
            const soil = document.querySelector('.service-support a[href$="/soil-sludge-sediment-haz-waste-characterization/"]');
            const tabRects = tabs.map((tab) => tab.getBoundingClientRect());
            const railRect = rail?.getBoundingClientRect();
            const dossierRect = dossier?.getBoundingClientRect();
            return {
              title: titleElement?.textContent.trim(),
              titleFitsOneLine: Boolean(titleElement && titleStyle && titleElement.scrollWidth <= titleElement.clientWidth + 1 && titleElement.clientHeight <= parseFloat(titleStyle.lineHeight) + 2 && titleStyle.whiteSpace === 'nowrap'),
              titleShimmersGold: Boolean(titleStyle && titleStyle.backgroundClip === 'text' && titleStyle.animationName.includes('alpha-contact-link-shimmer')),
              tabCount: tabs.length,
              panelCount: panels.length,
              activeTarget: activeTab?.dataset.serviceTarget,
              visiblePanel: visiblePanels[0]?.dataset.servicePanel,
              visiblePanelCount: visiblePanels.length,
              testsInVisiblePanel: visiblePanels[0]?.querySelectorAll('.service-test-list li').length,
              tabsStacked: tabRects.length === 2 && Math.abs(tabRects[0].width - tabRects[1].width) < 2 && tabRects[1].top > tabRects[0].bottom,
              desktopColumns: Boolean(railRect && dossierRect && dossierRect.left > railRect.right),
              mobileStack: Boolean(railRect && dossierRect && dossierRect.top > railRect.bottom),
              drinkingHref: document.querySelector('#service-panel-drinking .service-primary-action')?.href,
              wastewaterHref: document.querySelector('#service-panel-wastewater .service-primary-action')?.href,
              watertraxHref: watertrax?.href,
              potwHref: potw?.href,
              soilHref: soil?.href,
              emailHref: email?.getAttribute('href'),
              oldReadMore: document.querySelector('.entry-content')?.textContent.includes('Read More'),
            };
          });
          if (servicesState.title !== 'Our Testing & Analytical Services' || servicesState.tabCount !== 2 || servicesState.panelCount !== 2 || servicesState.activeTarget !== 'drinking' || servicesState.visiblePanel !== 'drinking' || servicesState.visiblePanelCount !== 1 || servicesState.testsInVisiblePanel < 6 || servicesState.watertraxHref !== 'https://aquaticinformatics.com/products/wastewater-compliance-software/' || servicesState.emailHref !== 'mailto:robbie@alpha-labs.com' || !servicesState.potwHref?.endsWith('/potw-pretreatment-program-work/') || !servicesState.soilHref?.endsWith('/soil-sludge-sediment-haz-waste-characterization/') || servicesState.oldReadMore) {
            failures.push(`${viewport.name} ${route}: approved service copy or direct actions are incomplete`);
          }
          if (!servicesState.drinkingHref?.endsWith('/drinking-bottled-water-program/') || !servicesState.wastewaterHref?.endsWith('/wastewater-recycled-water-storm-water-ground-water-program-work/')) failures.push(`${viewport.name} ${route}: primary water-program destinations changed`);
          if (!servicesState.titleFitsOneLine) failures.push(`${viewport.name} ${route}: service title does not fit on one line`);
          if (!servicesState.titleShimmersGold) failures.push(`${viewport.name} ${route}: service title is missing its gold shimmer`);
          if (!servicesState.tabsStacked) failures.push(`${viewport.name} ${route}: the two water program cards are not stacked`);
          if (viewport.name === 'phone' ? !servicesState.mobileStack : !servicesState.desktopColumns) failures.push(`${viewport.name} ${route}: service selector and dossier are not in the approved responsive arrangement`);

          await page.locator('[data-service-target="wastewater"]').click();
          const wastewaterState = await page.evaluate(() => ({
            activeTarget: document.querySelector('[data-service-target].is-active')?.dataset.serviceTarget,
            visiblePanels: [...document.querySelectorAll('[data-service-panel]')].filter((panel) => !panel.hidden).map((panel) => panel.dataset.servicePanel),
            tests: document.querySelector('[data-service-panel="wastewater"]')?.querySelectorAll('.service-test-list li').length,
          }));
          if (wastewaterState.activeTarget !== 'wastewater' || wastewaterState.visiblePanels.length !== 1 || wastewaterState.visiblePanels[0] !== 'wastewater' || wastewaterState.tests < 6) failures.push(`${viewport.name} ${route}: wastewater selection did not release only its detailed test dossier`);

          await page.locator('[data-service-target="drinking"]').focus();
          await page.keyboard.press('ArrowDown');
          const keyboardState = await page.evaluate(() => ({
            focusTarget: document.activeElement?.dataset?.servicePanel || document.activeElement?.dataset?.serviceTarget,
            activeTarget: document.querySelector('[data-service-target].is-active')?.dataset.serviceTarget,
          }));
          if (keyboardState.focusTarget !== 'wastewater' || keyboardState.activeTarget !== 'wastewater') failures.push(`${viewport.name} ${route}: keyboard navigation did not select and focus the wastewater dossier`);
        }

        if (route === '/regulatory/') {
          const agencies = ['epa', 'drinking-water', 'calrecycle', 'water-board', 'dtsc', 'carb'];
          const initialPlaceholderVisible = await page.locator('[data-agency-placeholder]').isVisible();
          if (!initialPlaceholderVisible) failures.push(`${viewport.name} ${route}: sealed agency placeholder is not visible initially`);

          const regulatoryFrameState = await page.evaluate(() => {
            const entry = document.querySelector('.entry');
            const vault = document.querySelector('.agency-vault');
            const masthead = document.querySelector('.agency-vault__masthead');
            const entryStyle = entry && getComputedStyle(entry);
            const vaultRect = vault && vault.getBoundingClientRect();
            const mastheadRect = masthead && masthead.getBoundingClientRect();
            return {
              outerBorderRemoved: Boolean(entryStyle && parseFloat(entryStyle.borderTopWidth) === 0 && parseFloat(entryStyle.borderRightWidth) === 0 && parseFloat(entryStyle.borderBottomWidth) === 0 && parseFloat(entryStyle.borderLeftWidth) === 0),
              mastheadCutsTopRule: Boolean(vaultRect && mastheadRect && mastheadRect.top >= vaultRect.top - 1 && mastheadRect.top <= vaultRect.top + 2),
            };
          });
          if (!regulatoryFrameState.outerBorderRemoved) failures.push(`${viewport.name} ${route}: obsolete outer page frame is still visible`);
          if (!regulatoryFrameState.mastheadCutsTopRule) failures.push(`${viewport.name} ${route}: masthead labels do not interrupt the vault top rule`);

          const initialAlignment = await page.evaluate(() => {
            const firstAgency = document.querySelector('[data-agency-target]')?.getBoundingClientRect();
            const card = document.querySelector('.agency-intelligence')?.getBoundingClientRect();
            return firstAgency && card ? Math.abs(firstAgency.top - card.top) : Number.POSITIVE_INFINITY;
          });
          if (viewport.name !== 'phone' && initialAlignment > 2) failures.push(`${viewport.name} ${route}: first agency and dossier card are misaligned by ${initialAlignment}px`);

          for (const agency of agencies) {
            await page.locator(`[data-agency-target="${agency}"]`).click();
            await page.waitForTimeout(viewport.name !== 'phone' ? 1350 : 720);
            const agencyState = await page.evaluate((expectedPanel) => {
              const preview = document.querySelector(`[data-agency-panel="${expectedPanel}"] .agency-browser-preview`);
              return {
                activeTabs: document.querySelectorAll('.agency-tab.is-active').length,
                visiblePanels: [...document.querySelectorAll('[data-agency-panel]')]
                  .filter((panel) => !panel.hidden)
                  .map((panel) => panel.dataset.agencyPanel),
                placeholderHidden: document.querySelector('[data-agency-placeholder]')?.hidden,
                placeholderDisplayed: getComputedStyle(document.querySelector('[data-agency-placeholder]')).display !== 'none',
                previewTarget: preview?.getAttribute('target'),
                previewRel: preview?.getAttribute('rel') || '',
                logoLoaded: Boolean(document.querySelector(`[data-agency-target="${expectedPanel}"] img`)?.naturalWidth),
                transientArtifacts: document.querySelectorAll('.agency-signal, .agency-transfer-mark').length,
              };
            }, agency);

            if (agencyState.activeTabs !== 1 || agencyState.visiblePanels.length !== 1 || agencyState.visiblePanels[0] !== agency || !agencyState.placeholderHidden || agencyState.placeholderDisplayed) {
              failures.push(`${viewport.name} ${route}: ${agency} did not release only its matching agency dossier`);
            }
            if (agencyState.previewTarget !== '_blank' || !agencyState.previewRel.includes('noopener') || !agencyState.previewRel.includes('noreferrer')) {
              failures.push(`${viewport.name} ${route}: ${agency} official-site preview is not safely opened in a new tab`);
            }
            if (!agencyState.logoLoaded) failures.push(`${viewport.name} ${route}: ${agency} agency logo did not load`);
            if (agencyState.transientArtifacts) failures.push(`${viewport.name} ${route}: ${agency} transfer animation did not clean up`);

            if (viewport.name !== 'phone') {
              const desktopCardVisibility = await page.locator('.agency-intelligence').evaluate((card) => {
                const rect = card.getBoundingClientRect();
                return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight };
              });
              if (desktopCardVisibility.top < -1 || desktopCardVisibility.bottom > desktopCardVisibility.viewport + 1) {
                failures.push(`${viewport.name} ${route}: ${agency} dossier is clipped outside the viewport (${JSON.stringify(desktopCardVisibility)})`);
              }
            }

            if (viewport.name === 'phone') {
              const mobileCardState = await page.evaluate(() => {
                const card = document.querySelector('.agency-intelligence')?.getBoundingClientRect();
                return card ? { top: card.top, viewport: innerHeight } : null;
              });
              if (!mobileCardState || mobileCardState.top < -2 || mobileCardState.top >= mobileCardState.viewport) {
                failures.push(`${viewport.name} ${route}: ${agency} did not bring the released dossier into view`);
              }
            }
          }

          if (viewport.name !== 'phone') {
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(120);
            const scrollBeforeCarbClick = await page.evaluate(() => window.scrollY);
            await page.locator('[data-agency-target="carb"]').click();
            await page.waitForTimeout(1350);
            const centeredCardState = await page.locator('.agency-intelligence').evaluate((card) => {
              const rect = card.getBoundingClientRect();
              return {
                entirelyVisible: rect.top >= -1 && rect.bottom <= window.innerHeight + 1,
                centerDelta: Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2),
                scrollY: window.scrollY,
              };
            });
            if (!centeredCardState.entirelyVisible || centeredCardState.centerDelta > 20) failures.push(`${viewport.name} ${route}: Air Resources Board dossier was not centered entirely in the viewport (${JSON.stringify(centeredCardState)})`);
            if (centeredCardState.scrollY >= scrollBeforeCarbClick - 2) failures.push(`${viewport.name} ${route}: bottom agency click did not scroll back to the centered dossier (before ${scrollBeforeCarbClick}px, after ${centeredCardState.scrollY}px)`);
          }
        }

        results.push({ viewport: viewport.name, route, ...state });
      } catch (error) {
        failures.push(`${viewport.name} ${route}: ${error.message}`);
      }
    }

    await page.close();
  }

  if (failures.length) {
    console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
    process.exitCode = 1;
  } else {
    const titleStyles = [...new Set(results.filter((result) => result.titleFont).map((result) => `${result.titleFont}|${result.titleWeight}|${result.titleLineHeight}`))];
    console.log(JSON.stringify({
      status: 'PASS',
      routes: manifest.length,
      renderedChecks: results.length,
      viewports,
      titleStyleVariants: titleStyles,
      horizontalOverflow: 0,
      brokenLocalImages: 0,
      standaloneStreetViewLabels: 0,
    }, null, 2));
  }
} finally {
  await browser.close();
}
