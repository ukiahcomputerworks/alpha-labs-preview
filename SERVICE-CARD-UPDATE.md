# Services card revision, October 9, 2026

Owner feedback relayed by Matt: Joy found wastewater too dark on a phone and
requested a wider skyline with one tank off to the side. Both cards must share
interaction behavior.

Both photographs now remain undimmed at rest, hover, focus, and selection.
Selection and hover affect the gold frame, not the image brightness, zoom, or
card position. Independent gold shimmer intervals and reduced-motion fallbacks
remain intact. The shared text scrim is concentrated at the bottom.

Asset: `assets/services/wastewater-skyline-card.webp`, 1536 by 1024, about 265 KB.
Generated with the built-in image-generation tool from the previous generated
`wastewater-card.png`, then converted to WebP with FFmpeg for mobile delivery.
The original asset is retained for rollback. This is illustrative imagery, not
an identified Alpha facility. No private data, new factual copy, routes, forms,
third-party tracking, production domains, or account permissions changed.

Final generation prompt: Recompose the wastewater card so the original upper
shoreline, city skyline, hills and warm golden sunset dominate the full panorama.
Show only one circular wastewater clarifier off to the right; remove the huge
foreground tank and all other circular tanks. Use a lower elevated viewpoint,
visible skyline and golden reflections, bright mobile-readable midtones, and an
uncluttered lower-left label area. Preserve the realistic amber/gold style. No
lettering, interface, borders, logos or watermark; do not identify an actual
Alpha facility.

Verification: `Test-ServiceCards.mjs` checks default, hover, selected, keyboard
and reduced-motion states at 1440, 390 and 320 pixels. Local screenshot review
confirms the brighter skyline and one right-side tank at all three widths.
The six-route design matrix, 35-route static inventory and 140 rendered route
checks are also required. CSS cache key is v79; JavaScript and search are unchanged.
Owner acceptance of the new composition remains pending after preview publication.

Gate disposition: G0-G1 mapped existing preview and generated public artwork;
G2 retained inventory; G3 shared card rules; G4 focused interaction/viewport and
route tests; G5 no form changes, preview forms remain disabled; G6 no new code
dependency, secrets or collection; G7 compressed artwork and unchanged noindex;
G8 verify exact Pages commit, HTTPS and routes; G9 await Joy/Rob review;
G10 no reusable knowledge promotion in this patch.
