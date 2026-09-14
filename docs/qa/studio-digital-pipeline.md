# Studio digital pipeline — 2026-09-14

The crop stage now leads to `OCR · 디지털화`. Taking its next action recognizes
missing text and redraws missing diagrams, while page/crop OCR also schedules
newly recognized diagrams automatically. Completed OCR defaults to digital text
and figures for output. A user's explicit image-output choice wins over later
recognition or figure editing. Existing manually edited SVGs are not overwritten.

## Connected path

1. The existing bounded page/crop FIFO also owns per-figure redraw jobs (two slots).
   Changing pages, questions or workspace tabs does not cancel those jobs.
2. OCR results and previously saved rendered content use the guarded Mathgen
   postprocessor. This fixes the red problem-number/display prefix without
   another AI request. Valid formulas and the current rendering corpus stay intact.
3. Isolated diagrams go through subscription vision, structured Mathgen specs,
   the existing deterministic Python engine, source/spec review, and the ported
   editor's MathJax typesetter. Final SVGs are editable; their original rasters
   remain available for comparison. Automatic results retain engine/spec/review
   metadata; a manual geometry edit invalidates that metadata.
4. Review cards distinguish original crops, SVG generation, failures and completed
   SVGs. Per-figure cancellation/retry is independent. Export waits for active AI
   work, then stores digital text and SVG images instead of the full scan crop.

Per-figure jobs deduplicate outstanding requests, share existing concurrency,
reject late cancelled output, and preserve changes made after their snapshot.
Failed jobs retain the original and can be retried without rerunning completed
figures. Merely mounting or uploading does not call AI. Solutions remain explicit.

## Integrated evidence

- Eight integrated Vitest suites: **315 passed** (OCR ownership, per-figure queue,
  Studio UI, normalization, response parsing, route and real Python renderer).
- Studio Playwright: **9 passed**, including background ownership, failed-only
  retries, continuous cropping, actual editor use, and the automatic digital path.
- Actual Next dev, with deterministic HTTP response substitutes: page recognition
  automatically redrew one diagram, all three crops became digital output, SVG
  survived worksheet save/reload, and no extra OCR/AI request was issued by tab
  changes. Actual posted actions were `page-ocr`, `figure-redraw`.
- Screens inspected at 1680, 1440, 1366, 1024 and 390 pixels: no document-level
  horizontal overflow. The original and rendered formula/figure cards remain
  available. The reported raw display prefix renders with no KaTeX errors.
  Browser JavaScript errors: **0**.
- Separate real Claude subscription evidence includes both a synthetic diagram
  and the user's handwritten triangle crop through the Python engine. The latter
  retained triangle sides, coordinate arrows, O/A/B/C labels, and the O–C line,
  while removing handwriting. Its original hash was unchanged. The engine
  reported the estimated point rather than silently declaring exact recovery.

Private source images and actual private output are ignored QA artifacts, not
repository fixtures. Root's actual-browser evidence is under
`.qa-artifacts/workroom-hifi/studio-digital-*`; the private figure result is under
`.qa-artifacts/studio-real-figure/`.

## Limits recorded rather than hidden

The source check compares one native source image to spec/SVG, not Mathgen's
rendered-image pair. Human visual review remains necessary. Provider failure or
unrenderable figures retain their original crops. Running jobs do not resume
after browser close/reload; exported worksheets and their SVG images do persist.
The old historical renderer-golden mismatch is unchanged: direct before/after
comparison of all 20 current corpus hashes matched without changing goldens.

Further source and verification details:
[OCR postprocessing](../mathgen-ocr-postprocessing-20260914.md),
[actual figure engine](studio-figure-engine.md),
[worksheet controls and saved actions](studio-worksheet-controls.md),
[earlier queue/review work](studio-review-redesign.md).

## Final main integration

All four parallel sessions were merged into `main`. The final `npm run build`
completed successfully, including Prisma generation, TypeScript, and all 64
static pages. Existing build warnings remain; this is not a claim that the
historical renderer goldens pass. The development server was restarted after
the build; `/dev/unified` and `/api/dev/unified/ai` both returned HTTP 200.
The provider status endpoint reports subscription CLI readiness; actual model
execution was verified with Claude as described above.

The merged bank UI and shared-query integration passed another 31 focused tests.
Actual Next browser checks against the real database exercised type, source,
figure, solution, review-state and exact-code filters, including resets. All
requests returned HTTP 200, with no browser JavaScript errors or document-level
horizontal overflow at 1440, 1024 and 390 pixels. Search width is capped at 400px.
See [bank query parity](studio-bank-query-parity.md) and
[bank UI parity](unified-bank-filter-parity.md) for scope and earlier checks.

Completed worker resources and clean merged worktrees were removed, preserving
their branches. No production deployment or remote push was performed.
