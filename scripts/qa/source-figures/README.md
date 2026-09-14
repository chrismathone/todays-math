# Source figure presentation QA

This isolated Vite page uses the real `SourceEditorDisplay` and `MathTextEditor` components and imports the real `StudioReviewPane.module.css` after the editor stylesheet. It does not start Next.js, call application APIs, or attach to an existing browser.

Run from the repository root in separate terminals:

```sh
node node_modules/vite/bin/vite.js --config scripts/qa/source-figures/vite.config.mts
node scripts/qa/source-figures/verify.mjs
```

Screenshots and measured results go to `.qa-artifacts/source-figures/`. `--baseline` records the original presentation without applying the acceptance assertions. The verifier owns and closes its headless Chromium instance.

The fixtures cover indexed and standalone SVGs, raw inline SVG, image fallback, positioned figure rows, choices, tables, disabled editing, and explicit alignment. The checks cover frame bounds, default centering, left/right positioning, path labels, viewport/path preservation, click/Enter/Space callbacks, redraws, source-mode roundtrips, and a 390 px viewport.

## Verified result — 2026-09-14

Captured evidence: [before measurements](evidence/before.json), [after measurements](evidence/after.json), [interaction and narrow-viewport results](evidence/interactions.json), [read/edit screenshot](evidence/indexed-read-edit.png), and [narrow figure row screenshot](evidence/narrow-row.png).

The initial reproduction measured a 1,154 px standalone read action and a 1,186 px indexed read action around a 240 × 360 px SVG. Figure-row action cells measured 503.64 and 670.34 px around 240 and 60 px SVGs. The read and edit previews displayed literal `$-2$`, `$-4$`, and `$-7$` text.

The corrected action frame measures 254 × 374 px for the 240 × 360 px SVG and 74 × 74 px for a 60 × 60 px SVG: 5 px padding and 2 px border on each side. Default block frames center in both wrappers; explicit left and right alignments remain within 1 px of their layout edge. Figure rows preserve their horizontal order and position-based shares, then stack at 390 px. No tested SVG frame overflows the narrow viewport.

The shared `typesetFigureSvg` label placer produces paths for the negative labels in both wrappers. Redrawing replaces them with −3, −5, and −8 while retaining the original viewport and non-label path data. Thirty click, Enter, and Space activations deliver the correct figure index. Activations, redraws, and source-mode roundtrips leave the stored body unchanged. Tables retain two rows and their figure cell; choices retain five items; disabled figures expose no editing action. Chromium reported no page errors.

Reference comparison was read-only: `D:/mathg-gen/src/components/math/MarkdownRenderer.tsx` and `D:/mathg-gen/src/styles/globals.css`, especially the SVG auto margins and figure-row shares. The fix keeps placement on an outer layout cell and interaction on the inner SVG frame; it does not crop or fit the source viewport. The editor preserves alignment and layout metadata separately from the original SVG/Markdown.

Validation:

- Browser harness described above: passed.
- `vitest run src/__tests__/unit/sourceFigurePresentation.test.ts src/__tests__/components/StudioReviewFigure.test.tsx`: 20 tests passed.
- `tsc --noEmit --incremental false`: passed.
- ESLint on changed TypeScript/TSX: no errors; the renderer's four existing native-image warnings remain.
- Affordance guard on the changed UI/CSS files: passed. New files were formatted; the commit's bulk-format hook was skipped to avoid reformatting the existing ported renderer. Its ESLint and affordance checks were run directly.

Only local dependencies were reused through the authorized junction. No install, build, Prisma generation, database mutation, AI request, source-repository mutation, or live-user-browser action was performed.
