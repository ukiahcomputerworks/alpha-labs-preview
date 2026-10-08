// Resource anchors reveal the right folder when arriving from a service page.
if (document.querySelector('.client-kit')) {
  const revealResource = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !target.closest('.client-kit')) return;
    const folder = target.matches('details') ? target : target.closest('details');
    if (folder) folder.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'auto' }));
  };
  window.addEventListener('hashchange', revealResource);
  document.querySelector('.client-kit').addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && link.hash === location.hash) {
      event.preventDefault();
      revealResource();
    }
  });
  revealResource();
}

document.addEventListener('submit', (event) => {
  event.preventDefault();
});

document.querySelectorAll('form').forEach((form) => {
  form.setAttribute('aria-description', 'Form submission is disabled on this staged copy.');
});

const homeSlider = document.querySelector('body.home #slider');

if (homeSlider && !homeSlider.querySelector('.alpha-after-dark')) {
  const hero = document.createElement('section');
  hero.className = 'alpha-after-dark';
  hero.setAttribute('aria-labelledby', 'alpha-after-dark-title');
  hero.innerHTML = `
    <div class="alpha-after-dark__ambient" aria-hidden="true"></div>
    <div class="alpha-after-dark__content">
      <span class="alpha-after-dark__logo-wrap">
        <img class="alpha-after-dark__logo" src="assets/alpha-logo-overlay-hd-v1.png" alt="Alpha Analytical Laboratories, Inc.">
        <span class="alpha-after-dark__flask-shimmer" aria-hidden="true"></span>
      </span>
      <p class="alpha-after-dark__eyebrow">Environmental analytical laboratory</p>
      <h1 id="alpha-after-dark-title">The science is serious.<br><span>The experience doesn't have to be.</span></h1>
      <p class="alpha-after-dark__summary">Total Water Matrix, Sediment and Hazardous Waste Testing and Analyses</p>
      <div class="alpha-after-dark__actions">
        <a class="alpha-after-dark__primary" href="services-listing/">Explore testing services</a>
        <a class="alpha-after-dark__secondary" href="contact-us-alpha-analytical-laboratories-inc/">Contact the laboratory</a>
      </div>
    </div>
    <div class="alpha-after-dark__readout" aria-hidden="true">
      <span>ALPHA // ANALYTICAL</span>
      <span>CALIFORNIA</span>
      <span>LAB SYSTEM ONLINE</span>
    </div>
  `;
  homeSlider.prepend(hero);
  homeSlider.classList.add('alpha-after-dark-enabled');

  const actionRail = document.createElement('nav');
  actionRail.className = 'alpha-action-rail';
  actionRail.setAttribute('aria-label', 'Start here');
  actionRail.innerHTML = `
    <a href="#company-locations">
      <span class="alpha-action-rail__number">01</span>
      <span><strong>Not sure what to test?</strong><small>Call the laboratory</small></span>
    </a>
    <a href="services-listing/">
      <span class="alpha-action-rail__number">02</span>
      <span><strong>Know what you brought?</strong><small>Choose a testing service</small></span>
    </a>
    <a href="contact-us-alpha-analytical-laboratories-inc/">
      <span class="alpha-action-rail__number">03</span>
      <span><strong>See where science happens</strong><small>Choose your laboratory location</small></span>
    </a>
    <a href="https://alpha-labs.promium.com/" target="_blank" rel="noopener noreferrer">
      <span class="alpha-action-rail__number">04</span>
      <span><strong>Your data is waiting</strong><small>Open Client Data Access</small></span>
    </a>
  `;
  homeSlider.insertAdjacentElement('afterend', actionRail);
}

// The selected mark travels above both clipped page frames before the dossier lights up.
const transferMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const transferPulseTimers = new WeakMap();
const pulseTransferDestination = (destination) => {
  if (!destination || transferMotion.matches) return;
  window.clearTimeout(transferPulseTimers.get(destination));
  destination.classList.remove('is-receiving');
  void destination.offsetWidth;
  destination.classList.add('is-receiving');
  transferPulseTimers.set(destination, window.setTimeout(() => destination.classList.remove('is-receiving'), 700));
};
const sendGoldStar = (source, destination) => {
  if (!source || !destination || transferMotion.matches) return Promise.resolve();
  document.querySelectorAll('.alpha-transfer-star').forEach((star) => {
    star.getAnimations().forEach((animation) => animation.cancel());
    star.remove();
  });

  const origin = source.getBoundingClientRect();
  const target = destination.getBoundingClientRect();
  const startX = origin.left + origin.width / 2;
  const startY = origin.top + origin.height / 2;
  const stacked = target.top >= origin.bottom && target.left < origin.right;
  const endX = stacked ? target.left + target.width / 2 : target.left + Math.min(48, target.width * .12);
  const actualEndY = stacked ? target.top + 28 : target.top + Math.min(target.height * .32, 165);
  const endY = Math.max(30, Math.min(window.innerHeight - 30, actualEndY));
  const distance = Math.hypot(endX - startX, endY - startY);
  if (distance < 24) return Promise.resolve();
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  const position = (x, y, scale) => `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale})`;
  const star = document.createElement('span');
  star.className = 'alpha-transfer-star';
  star.setAttribute('aria-hidden', 'true');
  star.style.setProperty('--alpha-star-tail', `${Math.min(145, Math.max(60, distance * .35))}px`);
  document.body.append(star);
  const flight = star.animate([
    { opacity: 0, transform: position(startX, startY, .55), offset: 0 },
    { opacity: 1, transform: position(startX + (endX - startX) * .1, startY + (endY - startY) * .1, 1), offset: .12 },
    { opacity: 1, transform: position(endX, endY, 1), offset: .78 },
    { opacity: 0, transform: position(endX, endY, 1.7), offset: 1 }
  ], { duration: 520, easing: 'cubic-bezier(.19, .74, .24, 1)', fill: 'forwards' });
  return flight.finished.catch(() => {}).finally(() => star.remove());
};

const locationRoom = document.querySelector('.alpha-location-room');

if (locationRoom) {
  const locationButtons = [...locationRoom.querySelectorAll('[data-location]')];
  const locationPanels = [...locationRoom.querySelectorAll('[data-location-panel]')];
  const locationPlaceholder = locationRoom.querySelector('[data-location-placeholder]');
  const locationIntelligence = locationRoom.querySelector('.location-intelligence');
  let selectionSequence = 0;

  locationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const sequence = ++selectionSequence;
      const selectedLocation = button.dataset.location;

      locationButtons.forEach((candidate) => {
        const isSelected = candidate === button;
        candidate.classList.toggle('is-active', isSelected);
        candidate.setAttribute('aria-expanded', String(isSelected));
      });

      locationPanels.forEach((panel) => {
        panel.hidden = panel.dataset.locationPanel !== selectedLocation;
      });

      if (locationPlaceholder) {
        locationPlaceholder.hidden = true;
      }

      sendGoldStar(button.querySelector('.alpha-map-pin__dot') || button, locationIntelligence).then(() => {
        if (sequence !== selectionSequence) return;
        pulseTransferDestination(locationIntelligence);
        if (window.matchMedia('(max-width: 782px)').matches) {
          locationIntelligence.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      });
    });
  });
}

document.querySelectorAll('[data-service-vault]').forEach((vault) => {
  const tabs = [...vault.querySelectorAll('[data-service-target]')];
  const panels = [...vault.querySelectorAll('[data-service-panel]')];
  const dossier = vault.querySelector('.service-intelligence');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const selectService = (tab, moveFocus = false) => {
    const target = tab.dataset.serviceTarget;

    tabs.forEach((candidate) => {
      const selected = candidate === tab;
      candidate.classList.toggle('is-active', selected);
      candidate.setAttribute('aria-selected', String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });

    let activePanel = null;
    panels.forEach((panel) => {
      const selected = panel.dataset.servicePanel === target;
      panel.hidden = !selected;
      panel.classList.toggle('is-active', selected);
      if (selected) activePanel = panel;
    });

    if (dossier && !reducedMotion.matches) {
      dossier.classList.remove('is-receiving');
      requestAnimationFrame(() => dossier.classList.add('is-receiving'));
    }

    if (window.matchMedia('(max-width: 900px)').matches && dossier) {
      dossier.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }

    if (moveFocus && activePanel) {
      activePanel.focus({ preventScroll: true });
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectService(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      tabs[nextIndex].focus();
      selectService(tabs[nextIndex], true);
    });
  });
});

document.querySelectorAll('[data-agency-vault]').forEach((vault) => {
  const agencyButtons = [...vault.querySelectorAll('[data-agency-target]')];
  const agencyPanels = [...vault.querySelectorAll('[data-agency-panel]')];
  const placeholder = vault.querySelector('[data-agency-placeholder]');
  const intelligenceCard = vault.querySelector('.agency-intelligence');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selectionSequence = 0;

  const centerDesktopDossier = () => new Promise((resolve) => {
    if (!intelligenceCard || window.matchMedia('(max-width: 900px)').matches) {
      resolve();
      return;
    }

    const cardHeight = intelligenceCard.offsetHeight;
    const inlinePosition = intelligenceCard.style.position;
    intelligenceCard.style.position = 'relative';
    const naturalCardTop = intelligenceCard.getBoundingClientRect().top + window.scrollY;
    intelligenceCard.style.position = inlinePosition;
    const viewportTop = Math.max(16, (window.innerHeight - cardHeight) / 2);
    const maximumScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetScroll = Math.min(maximumScroll, Math.max(0, naturalCardTop - viewportTop));

    if (Math.abs(window.scrollY - targetScroll) < 2 || reducedMotion.matches) {
      window.scrollTo({ top: targetScroll, behavior: 'auto' });
      resolve();
      return;
    }

    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    const startedAt = performance.now();

    const waitForScroll = () => {
      if (Math.abs(window.scrollY - targetScroll) < 3 || performance.now() - startedAt > 700) {
        resolve();
        return;
      }
      requestAnimationFrame(waitForScroll);
    };

    requestAnimationFrame(waitForScroll);
  });

  const releasePanel = (selectedAgency) => {
    agencyPanels.forEach((panel) => {
      panel.hidden = panel.dataset.agencyPanel !== selectedAgency;
    });
    if (placeholder) placeholder.hidden = true;
  };

  const transmitAgencyMark = (button, sequence) => {
    sendGoldStar(button.querySelector('.agency-tab__logo-plate') || button, intelligenceCard).then(() => {
      if (sequence !== selectionSequence) return;
      pulseTransferDestination(intelligenceCard);
      if (window.matchMedia('(max-width: 900px)').matches) {
        intelligenceCard.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
  };

  agencyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectionSequence += 1;

      agencyButtons.forEach((candidate) => {
        const isSelected = candidate === button;
        candidate.classList.toggle('is-active', isSelected);
        candidate.setAttribute('aria-expanded', String(isSelected));
      });

      releasePanel(button.dataset.agencyTarget);

      const activeSequence = selectionSequence;
      centerDesktopDossier().then(() => {
        if (activeSequence === selectionSequence) {
          transmitAgencyMark(button, activeSequence);
        }
      });
    });
  });
});

// Stable per-route phases keep the original gold highlights from moving in lockstep.
const goldGlintTargets = [
  '.entry-title', '#alpha-location-room-title', '.client-kit h2',
  '.entry-content > h2', '.entry-content > h3',
  '.service-vault__poster h2 span:last-child',
  '.alpha-after-dark h1 span', '.alpha-action-rail__number',
  '.alpha-action-rail strong', '.phone-link', '.street-view-link',
  '.service-tab', '#client-connect', '.alpha-after-dark__primary',
  'button', '.button'
].join(', ');
const routeGlintSeed = [...location.pathname].reduce((seed, character) => seed + character.charCodeAt(0), 0);
document.querySelectorAll(goldGlintTargets).forEach((element, index) => {
  const phase = routeGlintSeed + index * 17;
  element.style.setProperty('--alpha-glint-duration', `${(5.3 + (phase % 43) / 10).toFixed(1)}s`);
  element.style.setProperty('--alpha-glint-delay', `${(-.8 - (phase % 57) / 10).toFixed(1)}s`);
});

// Search every retained page from a source-built, word-by-word index.
const alphaHeaderTools = document.querySelector('.site-header .header-widget-area .custom-html-widget');
if (alphaHeaderTools) {
  const alphaSiteRoot = new URL('.', document.currentScript.src);
  const search = document.createElement('form');
  search.className = 'alpha-site-search';
  search.setAttribute('role', 'search');
  search.innerHTML = `
    <label class="screen-reader-text" for="alpha-site-search-input">Search all Alpha Labs pages</label>
    <span class="alpha-site-search__icon" aria-hidden="true">⌕</span>
    <input id="alpha-site-search-input" type="search" placeholder="Search site" autocomplete="off"
      role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
      aria-controls="alpha-site-search-results" aria-expanded="false">
    <div class="alpha-site-search__results" id="alpha-site-search-results" role="listbox" hidden></div>
    <span class="screen-reader-text" role="status" aria-live="polite" data-alpha-search-status></span>`;
  alphaHeaderTools.prepend(search);

  const input = search.querySelector('input');
  const results = search.querySelector('.alpha-site-search__results');
  const status = search.querySelector('[data-alpha-search-status]');
  const words = (value) => value.normalize('NFKD').toLowerCase()
    .replace(/\p{M}/gu, '').match(/[\p{L}\p{N}]+/gu) || [];
  let indexPromise;
  let active = -1;

  const sizePlaceholder = () => {
    input.placeholder = window.innerWidth <= 375 ? 'Search' : 'Search site';
  };
  const alignResults = () => {
    search.style.setProperty('--alpha-search-left', `${search.getBoundingClientRect().left}px`);
  };
  sizePlaceholder();

  const loadIndex = () => {
    indexPromise ||= fetch(new URL('search-index.json', alphaSiteRoot))
      .then((response) => {
        if (!response.ok) throw new Error(`Search index HTTP ${response.status}`);
        return response.json();
      });
    return indexPromise;
  };

  const close = () => {
    results.hidden = true;
    results.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const setActive = (next) => {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    active = (next + options.length) % options.length;
    options.forEach((option, position) => option.classList.toggle('is-active', position === active));
    input.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({ block: 'nearest' });
  };

  const matchingPages = (query, index) => {
    const tokens = [...new Set(words(query))];
    if (!tokens.length) return [];
    const vocabulary = Object.keys(index.terms);
    const postings = tokens.map((token) => {
      const exact = index.terms[token];
      if (exact) return new Map(exact);
      const expanded = vocabulary.filter((word) => word.startsWith(token)).slice(0, 80);
      const matches = new Map();
      expanded.forEach((word) => index.terms[word].forEach(([id, count]) =>
        matches.set(id, (matches.get(id) || 0) + count)));
      return matches;
    });
    if (postings.some((entry) => !entry.size)) return [];
    const exactQuery = query.toLowerCase();
    return [...postings[0].keys()]
      .filter((id) => postings.every((entry) => entry.has(id)))
      .map((id) => {
        const page = index.pages[id];
        const title = page.title.toLowerCase();
        const score = (title === exactQuery ? 100 : title.startsWith(exactQuery) ? 65 : title.includes(exactQuery) ? 40 : 0)
          + tokens.filter((token) => title.includes(token)).length * 12
          + postings.reduce((sum, entry) => sum + Math.min(entry.get(id), 8), 0);
        return { page, score };
      })
      .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));
  };

  const snippetFor = (page, query) => {
    const text = page.text;
    const lower = text.toLowerCase();
    const first = words(query).map((word) => lower.indexOf(word)).find((position) => position >= 0) ?? 0;
    const start = Math.max(0, first - 48);
    const end = Math.min(text.length, first + 132);
    return `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
  };

  const render = async () => {
    const query = input.value.trim();
    if (query.length < 2) return close();
    alignResults();
    status.textContent = 'Searching Alpha Labs pages';
    let index;
    try {
      index = await loadIndex();
    } catch {
      indexPromise = undefined;
      if (input.value.trim() !== query) return;
      results.replaceChildren();
      const message = document.createElement('p');
      message.className = 'alpha-site-search__empty';
      message.textContent = 'Search is temporarily unavailable. Please try again.';
      results.append(message);
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      status.textContent = message.textContent;
      return;
    }
    if (input.value.trim() !== query) return;
    const matches = matchingPages(query, index);
    results.replaceChildren();
    const summary = document.createElement('p');
    summary.className = 'alpha-site-search__summary';
    summary.textContent = matches.length
      ? `${matches.length} matching ${matches.length === 1 ? 'page' : 'pages'} · Arrow keys to choose, Enter to open`
      : `No pages match “${query}”. Try a shorter word or another test name.`;
    results.append(summary);
    matches.forEach(({ page }, position) => {
      const link = document.createElement('a');
      link.id = `alpha-site-search-option-${position}`;
      link.href = new URL(page.href, alphaSiteRoot).href;
      link.setAttribute('role', 'option');
      const title = document.createElement('strong');
      const detail = document.createElement('small');
      title.textContent = page.title;
      detail.textContent = snippetFor(page, query);
      link.append(title, detail);
      results.append(link);
    });
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
    status.textContent = summary.textContent;
    active = -1;
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (event) => {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (event.key === 'ArrowDown' && options.length) { event.preventDefault(); setActive(active + 1); }
    if (event.key === 'ArrowUp' && options.length) { event.preventDefault(); setActive(active - 1); }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Enter' && options.length) {
      event.preventDefault();
      options[active < 0 ? 0 : active].click();
    }
  });
  search.addEventListener('submit', (event) => event.preventDefault());
  window.addEventListener('resize', () => { sizePlaceholder(); alignResults(); });
  document.addEventListener('click', (event) => { if (!search.contains(event.target)) close(); });
}
