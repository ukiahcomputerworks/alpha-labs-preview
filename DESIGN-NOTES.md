# Alpha Labs mirror design and source record

## Approved reference

The owner-approved Alpha After Dark homepage is the primary visual reference. Retained pages use the same black field, metallic-gold emphasis, ivory and white copy, clipped panels, fine gold rules, condensed display typography, and compact vertical rhythm. The original public site remains the factual and route baseline, not the current visual reference.

## Shared component roles

| Role | Reference treatment |
| --- | --- |
| Header | Compact Alpha wordmark, metallic Client Data Access control, black field and gold rule |
| Navigation | Rajdhani uppercase labels; one gold active state; shared hover and focus treatment |
| Primary page title | Rajdhani 700 uppercase, shared responsive scale, animated metallic-gold fill, static gold in reduced motion |
| Long page title | Named page-specific size only when required to preserve approved one-line or two-line wording |
| Section title | Rajdhani 700 with gold left rule; gold shimmer only for approved emphasis roles |
| Body and word links | Inter, solid white body copy, 1.68 base line height, gold links with visible focus |
| Cards and dossiers | Black or graphite field, paired gold border and glow, clipped or rounded geometry by component family |
| Graphics | Preserved aspect ratio, deliberate crop, project-local assets where generated for the preview |
| Footer and locations | Compact black footer; verified callable telephone and Street View destinations |
| Vertical rhythm | Shared compact shell, entry, title-rule and first-content spacing; specialty components may vary internally but not at the page boundary |

## Route-by-component matrix

Every retained route in `mirror-manifest.json` uses the shared header, navigation, page shell, metallic primary-title treatment, white body palette, focus states and footer. Services, Contact, Forms, Careers and Regulatory keep their approved specialized card systems, but their page-title scale, title rule, opening gap and outer padding use the shared system. Program-work pages retain named long-title variants. The homepage hero remains the reference rather than being forced into the standard entry-title shell.

## Responsive targets

- Large desktop acceptance: 1920 by 1080 pixels.
- Compact desktop acceptance: 1440 by 800 pixels.
- Tablet acceptance: 768 by 1024 pixels.
- Phone acceptance: 390 by 844 pixels.
- No unintended horizontal overflow, broken visual assets, oversized empty transition bands, console errors, heading skips or unnamed controls.
- `Test-VerticalRhythm.mjs` checks all 35 routes at all four viewport sizes for repeated empty-space regressions.

## Provenance

- Page and post inventory: the current `wp-sitemap-posts-page-1.xml` and `wp-sitemap-posts-post-1.xml` files.
- HTML, theme CSS/JavaScript, media and public facts: `https://www.alpha-labs.com/`, fetched 2026-09-02.
- No private Alpha Labs system, account or data source is used.

## Deliberate exceptions

- Every mirrored route adds `noindex, nofollow`.
- Form submission is disabled on the staged copy to prevent production data entry.
- Internal HTML page navigation remains inside the GitHub Pages mirror. Client Data Access, PDFs and other non-page resources continue to use their current public destinations.

## Dormant Lab Tech Careers replacement

The unlinked `meeting-staged/careers-lab-tech/index.html` file duplicates the current Careers shell and shared components while replacing only the page content. It retains the current `Careers` title class, Source Sans Pro body typography, Alpha blue link/button color, square controls, navigation, header, and footer. Its deliberate page-specific components are a light-gray job-summary panel, three job-fact blocks, a two-column duties/qualifications layout, and a two-column application form that collapses to one column below 700 pixels.

| Route state | Title | Body | Navigation | Page-specific component | Desktop | Phone |
| --- | --- | --- | --- | --- | --- | --- |
| `/careers/` active | Existing `entry-title` | Existing theme body | Careers only | Original no-openings copy | Unchanged | Unchanged |
| `/meeting-staged/careers-lab-tech/` dormant | Existing `entry-title` | Existing theme body | Careers only | Lab Tech opening and application preview | 1440 × 900 pass | 390 × 844 pass |

Rendered checks confirm no horizontal overflow, no broken images, one active navigation item, readable form controls, successful client-side confirmation, and zero non-GET requests during submission. The form disclosure states that entered information is neither transmitted nor stored. The dormant page can be copied over the active Careers route with `Apply-StagedCareers.ps1` when the owner gives the meeting cue.
