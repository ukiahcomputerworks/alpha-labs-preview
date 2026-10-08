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

const locationRoom = document.querySelector('.alpha-location-room');

if (locationRoom) {
  const locationButtons = [...locationRoom.querySelectorAll('[data-location]')];
  const locationPanels = [...locationRoom.querySelectorAll('[data-location-panel]')];
  const locationPlaceholder = locationRoom.querySelector('[data-location-placeholder]');

  locationButtons.forEach((button) => {
    button.addEventListener('click', () => {
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
    });
  });
}

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

    if (placeholder) {
      placeholder.hidden = true;
    }

    if (intelligenceCard) {
      intelligenceCard.classList.remove('is-receiving');
      void intelligenceCard.offsetWidth;
      intelligenceCard.classList.add('is-receiving');
      window.setTimeout(() => intelligenceCard.classList.remove('is-receiving'), 620);

      if (window.matchMedia('(max-width: 900px)').matches) {
        window.setTimeout(() => {
          intelligenceCard.scrollIntoView({
            behavior: reducedMotion.matches ? 'auto' : 'smooth',
            block: 'start'
          });
        }, reducedMotion.matches ? 0 : 80);
      }
    }
  };

  const transmitAgencyMark = (button, sequence) => {
    if (!intelligenceCard || reducedMotion.matches) {
      releasePanel(button.dataset.agencyTarget);
      return;
    }

    vault.querySelectorAll('.agency-signal, .agency-transfer-mark').forEach((element) => element.remove());

    const vaultRect = vault.getBoundingClientRect();
    const logoPlate = button.querySelector('.agency-tab__logo-plate');
    const logo = logoPlate && logoPlate.querySelector('img');
    const sourceRect = (logoPlate || button).getBoundingClientRect();
    const cardRect = intelligenceCard.getBoundingClientRect();
    const horizontalLayout = cardRect.left > sourceRect.right;
    const startX = horizontalLayout ? sourceRect.right - vaultRect.left : sourceRect.left + (sourceRect.width / 2) - vaultRect.left;
    const startY = horizontalLayout ? sourceRect.top + (sourceRect.height / 2) - vaultRect.top : sourceRect.bottom - vaultRect.top;
    const endX = horizontalLayout ? cardRect.left - vaultRect.left + 18 : cardRect.left + (cardRect.width / 2) - vaultRect.left;
    const endY = horizontalLayout ? cardRect.top + Math.min(cardRect.height * .32, 220) - vaultRect.top : cardRect.top - vaultRect.top + 22;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.hypot(deltaX, deltaY);
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    const signal = document.createElement('span');
    signal.className = 'agency-signal';
    signal.setAttribute('aria-hidden', 'true');
    signal.style.setProperty('--signal-x', `${startX}px`);
    signal.style.setProperty('--signal-y', `${startY}px`);
    signal.style.setProperty('--signal-length', `${length}px`);
    signal.style.setProperty('--signal-angle', `${angle}deg`);
    vault.append(signal);
    requestAnimationFrame(() => signal.classList.add('is-travelling'));

    if (logo) {
      const transfer = document.createElement('span');
      transfer.className = 'agency-transfer-mark';
      transfer.setAttribute('aria-hidden', 'true');
      transfer.style.setProperty('--transfer-x', `${sourceRect.left - vaultRect.left}px`);
      transfer.style.setProperty('--transfer-y', `${sourceRect.top - vaultRect.top}px`);
      transfer.style.setProperty('--transfer-width', `${sourceRect.width}px`);
      transfer.style.setProperty('--transfer-height', `${sourceRect.height}px`);
      transfer.append(logo.cloneNode(true));
      vault.append(transfer);

      transfer.animate([
        { opacity: 0, transform: 'translate(0, 0) scale(.82)' },
        { opacity: 1, offset: .18, transform: 'translate(0, 0) scale(1)' },
        { opacity: 1, offset: .7, transform: `translate(${deltaX}px, ${deltaY}px) scale(.72)` },
        { opacity: 0, transform: `translate(${deltaX}px, ${deltaY}px) scale(.46)` }
      ], { duration: 500, easing: 'cubic-bezier(.2, .76, .24, 1)', fill: 'forwards' });
    }

    window.setTimeout(() => {
      if (sequence === selectionSequence) {
        releasePanel(button.dataset.agencyTarget);
      }
    }, 350);

    window.setTimeout(() => {
      signal.remove();
      vault.querySelectorAll('.agency-transfer-mark').forEach((element) => element.remove());
    }, 560);
  };

  agencyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectionSequence += 1;

      agencyButtons.forEach((candidate) => {
        const isSelected = candidate === button;
        candidate.classList.toggle('is-active', isSelected);
        candidate.setAttribute('aria-expanded', String(isSelected));
      });

      agencyPanels.forEach((panel) => {
        panel.hidden = true;
      });

      if (placeholder) {
        placeholder.hidden = true;
      }

      const activeSequence = selectionSequence;
      centerDesktopDossier().then(() => {
        if (activeSequence === selectionSequence) {
          transmitAgencyMark(button, activeSequence);
        }
      });
    });
  });
});
