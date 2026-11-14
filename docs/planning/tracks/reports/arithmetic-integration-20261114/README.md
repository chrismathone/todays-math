# Independent main integration and viewport review

The coordinator independently reviewed the figure-engine merge and the separate viewport fix. **No remaining introduced P1/P2/P3 finding was identified within the source and runtime scope below.** The 390×844 overflow found during integration and the natural-content observation gap found during source review were corrected before this conclusion.

Product revision validated: `5ca5a60d8ad70b608cd925ce2e3562354d43cbd0` (engine `bf699425c`, configured-hook receipt `73a720b4`, viewport fix `2e2b64ab`). Documentation-only commits can follow without changing those product bytes. This is not a statement of production deployment success.

## Independent review and verification

The root coordinator read the complete final viewport TSX/CSS delta, all new regression tests, the actual catalog caller and selection hook. The new observer watches one natural wrapper containing **both header and body**; queued callbacks are fenced when their effect ends. Initial/lazy/image size changes use the actual border-box height. No arithmetic font-size or image-size rule changed. Scroll keys act only while the source card retains focus and content overflows, respecting already handled keys and modifiers. Page scroll still dismisses; the tooltip's own scroll does not.

A preliminary implementation observed only its header. The coordinator identified the capped-parent/body-growth gap; the author corrected the wrapper and added a test that dispatches ResizeObserver notifications only when an observed target changes size. This independent finding is resolved in `2e2b64ab`.

On integrated main before the viewport delta, **10 focused files / 77 tests passed** across engine/triangle/trig projection, legacy presentation, output conversion, shared renderer marks, saved-document consumers, tooltip interactions and lazy-import failures. After the viewport delta, **3 affected files / 30 tests passed** again. These counts overlap; they are not 107 distinct tests. Logs are retained here. Required full pre-push checks remain a separate release gate.

## Actual component browser checks

The coordinator built a standalone esbuild harness using the actual main React consumers and offline synthetic v1/v2 saved specifications. This starts no Next server and performs no authenticated API, database or save operation. The before-viewport consumer build was `7e6dcc23c`; the final viewport build was `5ca5a60d8`. Admin renderer, figure engine and saved-reader bytes do not change in the viewport-only delta.

- Six desktop figure tooltips rendered and linked to the intended cards: diagonal-midpoint trapezoid, rectangle diagonal, rhombus radical side, and three compact trigonometric examples (length197, side960, sine1515). All images decoded; explicit rectangle/rhombus and area/trigonometric prose conditions remained visible. Screenshots were opened by the coordinator.
- Actual numeric-to-trapezoid mouse transition and native keyboard transition to the rectangle worked after the final fix. ARIA linkage and viewport containment were checked; the final trapezoid and rectangle screenshots were opened.
- Before the viewport fix, sine1515 at390×844 ended at **871.4375px**, outside the screen. The final browser shows **top393.3125 / height438.6875 / bottom832px**, retaining the full height and a12px lower inset. Both before/after screenshots were opened.
- At390×320 the final box is **top12 / height296 / bottom308px**. Native Tab selected the sine card; End changed tooltip scrollTop0→178 while clientHeight294 / scrollHeight472, keeping the card focused and page scrollY250 unchanged. Home returned to0; a page scroll dismissed the tooltip. The answer line was visible in the opened end screenshot.
- Three first-opening cancellation cases (Escape, body scroll, resize) passed with real browser timers and synthetic DOM event dispatch; a positive opening control passed. These are distinguished from native key/mouse actions and do not claim to reproduce a React scheduling race in a browser.
- Actual saved v1 displayed two numeric questions and their answers; v2 displayed six figures, two question pages and one answer page. Altered stored-answer data was refused with the expected alert and no pages. All three screenshots were opened. Fixtures were unchanged and no captured runtime error occurred.
- The before-viewport standalone initial/numeric static JS closure was **1,203,691 raw bytes**. The heavy figure chunk (11,524,181 raw bytes) appeared only after a figure tooltip opened; the admin entry appeared only after opening a document. Final output sizes and inputs are retained in `build-evidence.json`. These are local esbuild boundaries, not deployed Next chunks, compressed transfer costs or a mobile network benchmark.

A first fixed-viewport CLI wait returned nonzero before a later snapshot showed the fully loaded figure; the next capture verified the result. A stale Orca element reference during the short-height setup was refreshed from a new snapshot. Neither is reported as a product failure or silently treated as a passing assertion.

## Limits and preserved evidence

On a narrow screen where neither side fits, the tooltip may visually overlap its source card; pointer events remain transparent. In a viewport shorter than the content, its complete content is reachable with focused-card scroll keys; mouse-wheel interaction with the tooltip itself remains unavailable. No full accessibility/screen-reader audit, full viewport matrix, physical-printer or authenticated production verification is claimed.

The separate [engine audit](../arithmetic-figure-quality-20261112/README.md) retains finite census, source/assets, actual A4/PDF, performance and independent review evidence. Its 626 explicit conditions across451 layout exceptions, primary visual coverage limits, frozen-source debt and small-label/bundle-cost limitations remain applicable; this UI review does not erase them.

All evidence files in this directory, including this README but excluding the manifest itself, have content digests in `evidence-sha256.json`. Broader root evidence and harness sources are retained under `/Users/pss/tmp/arithmetic-parent-review-20261113/`; the release receipt and final archive follow the actual push and deployment, so this report does not preclaim either.

Completed engine and independent-review evidence was archived to the path in `engine-final-archive.json`: 28,941 files, every extracted member independently rehashed. The viewport worker archive is recorded in `viewport-worker-archive.json`. Finished workers were released, their clean merged worktrees removed, and their Git branches preserved. The coordinator's browser page and both QA servers are closed. Orca's engine removal hit an ExFAT Unicode filename error; all 100 remaining non-metadata files were separately archived and rehashed before deleting the residue. `final-worker-cleanup.json` records that recovery and the preserved branch heads. Unmerged textbook worktrees remain intact. The final engine manifest has 176 matching entries (`final-manifest-check.json`).
