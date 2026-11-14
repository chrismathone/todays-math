# Arithmetic tooltip viewport containment

Base: `7e6dcc23cfe916ce7cd6dcdc226c34451c69509a`. Scope: `ArithmeticTypePreview.tsx`, its CSS, one regression suite, and this report. Engine, catalog, generated figures, other consumers, persistence and environment files are untouched.

## Reproduction and change

The coordinator's `integrated-narrow-sine.json` records a 390×844 viewport, tooltip top 432.75, height 438.6875 and bottom 871.4375 for `m3-trig-sine-from-area` index 1515. Before editing production code, the deterministic layout test reproduced exactly bottom **871.4375**, failing the 832px lower boundary (12px inset).

Placement now uses the actual tooltip border-box height. A layout effect measures before paint, a ResizeObserver watches both the tooltip and a single natural-content wrapper containing **header and body**, and captured image loads trigger another measurement. Side placement remains preferred when horizontal room permits; otherwise below/above are tried using the measured height, then clamped inside the viewport's 12px insets. At the reproduced dimensions the full 438.6875px content remains intact, with top 393.3125 and bottom 832 in the deterministic layout model. No mathematical font or figure sizing was changed.

Observer/listener cleanup and an inactive-effect guard prevent queued measurements from changing a cancelled tooltip or a subsequent card's placement. The hook retains its hover delay, direct-card transitions, pending Escape/scroll/resize cancellation, touch exclusion, keyboard focus and ARIA linkage. Pointer events remain transparent.

## Bounded fallback and limits

The tooltip's maximum border-box height is the viewport height minus 24px; overflow scrolls at its original mathematical text size. A focused source card supports ↑/↓, Page Up/Down, Home and End to reach the whole example while retaining focus and ARIA linkage. A conditional caption explains these keys. Only the tooltip's own scroll is exempted from dismissal; page/other-container scrolling still closes it, and existing handled/modifier/composition keys are respected.

Because the tooltip remains pointer-transparent, mouse-wheel interaction with the tooltip is unavailable: an oversized example requires keyboard focus on its card and the displayed scroll keys. On a narrow screen where neither above nor below can fit the full tooltip, containment can visually overlap part of its card; pointer selection still reaches that card. Extremely small viewports that cannot accommodate even padding and borders are not a useful reading surface. ResizeObserver support supplies non-image asynchronous/font-size updates; without it, initial and image-load measurements remain but arbitrary later size changes are not observed.

## Verification

- Focused Vitest: **3 files, 30 tests passed** — `ArithmeticTypePreviewViewport`, existing `ArithmeticTypePreview` hook/interaction tests, and `ArithmeticPreviewLoadFailure`.
- New tests use independent border-box measurements and rendered fixed-position CSS, not the placement helper. Resize notifications are dispatched only when an observed target's size actually changes; the capped-parent/body-growth case therefore detects a header-only observation bug.
- Coverage: small numeric and growing/shrinking content; top/middle/bottom anchors at 390×844 and 1280×844; left/right placement; 390×320 height cap and keyboard access to the end; content growing past an already capped box; real lazy sine renderer and a later image load; queued measurements after Escape and direct-card transition; observer cleanup.
- Focused ESLint, affordance checker and `git diff --check` passed. Normal configured commit hooks run for this commit; the missing ignored Husky wrappers were copied from the main checkout rather than bypassed.
- Tests used a temporary Vite configuration with `envDir: false` and the repository's existing setup, aliases, React plugin and jsdom. Logs/config: `/Users/pss/tmp/arithmetic-preview-viewport-20261114/` (`before.txt`, `after.txt`, `vitest.config.mts`). No install, Next build/dev server, database/environment access, or browser/page actions were performed. Actual browser validation remains with the coordinator.
