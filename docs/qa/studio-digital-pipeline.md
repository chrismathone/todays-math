# Studio digital pipeline — 2026-09-14

## Source UI parity correction

The engine/export checks below did **not** establish UI parity. The previous
review screen still substituted a raw Markdown/LaTeX form and separate large
figure panels for the source's in-card visual editing. This pass restores the
actual source editor and its renderer/helper graph, rather than treating those
substitutes as a completed migration.

- `components/math/editor/SourceMathTextEditor.tsx` is the original TipTap/MathLive
  editor, with its source reader, keyboard, math tokens, tables, condition boxes,
  choice layout and figure geometry. The public wrapper loads it only in the
  browser. Raw LaTeX remains lossless on opening; visible math uses the source's
  fraction/geometry typography. Optional source-code editing remains secondary.
- Review displays figures at their body/choice/table anchors. Unanchored figures
  appear once through the shared source fallback. Figure clicks and keyboard
  activation open the original editor; compact controls replace duplicated large
  figure panels. Removing figures or shrinking crops remaps surviving anchors.
- Body, answer, solution, number, topic and figure changes are staged together.
  Save commits the draft; Cancel restores it, including diagram edits and recrops.
  OCR metadata and choice layout survive manual changes, reload and worksheet
  transfer. Native blocks are invalidated only when their body is actually edited.
- Figure editing uses the Studio navy/blue palette, a bounded 740px desktop modal
  and a fitted canvas. Original-region editing opens locally within review.
  Score visibility is display-only; confidence and missing-content warnings remain.
- Page/OCR/SVG progress occupies one stable 44px row with counts and a warning
  badge. Hover, click or keyboard opens anchored detail in a top-layer popover;
  long warnings cannot wrap the main row or move the workspace. Page details remain
  beside their trigger. Empty quote artifacts are removed while real boxes remain.

Validation after integration: **67 tests across 10 focused files passed**;
**17 Studio browser cases passed** (16 in the combined run plus the corrected
source-fraction selector rerun). The source editor's **10 real-browser groups**
also passed again after the typography guard, including actual MathLive entry,
fraction numerator/denominator navigation, undo/redo, tables, inline figures,
orphan figures, and lossless open/source-mode roundtrips. Worker browser checks
add six review transaction groups, ten drawing checks and seven crop checks.
Scoped ESLint has zero errors and five inherited source warnings; D-30 passes.
The production build passed TypeScript and page generation. An actual Next
production server passed login hydration, anonymous API rejection and closed CLI
checks. An authenticated production editor smoke was not run: automatic approval
review rejected launching the server with a synthetic test authentication secret.
No paid model inference or deployment was performed during this UI pass.

Current evidence is archived under `.qa-artifacts/studio-ui-parity/`. The source
comparison inventory is `scripts/qa/math-text-editor/port-report.json`; its initial
line counts describe the worker port, while coordinator verification records the
final integration. Prior engine/export evidence below remains historical.

## Current source-led integration (`D:/mathg-gen`)

The source for this completion pass is the actual running `D:/mathg-gen` tree.
The earlier records below describe the previous partial port and its evidence.

- Development offers subscription CLI and server model API explicitly; authenticated
  `/studio` is API-only, including its PDF assets and bank/teaching endpoints.
  Both transports execute the same multi-stage OCR/solution pipeline.
- Page recognition detects boxes first, then independently recognizes crops.
  Native blocks, table/choice layout, subquestions, printed scores and confidence
  are retained. Missing-body/choice repair and math/solution validation came from
  the live source. A warning-driven solution regeneration is bounded to one retry.
- Majority upside-down crop votes rotate a page once by 180 degrees and retry.
  Manual rotation, extracted PDF reference text and text-omission warnings survive
  session restoration. Failed or pending jobs are not silently reissued on reload.
- Original file Blobs, crops, figures, review position and completed page results
  persist in IndexedDB. Production storage is scoped by signed-in account; revision
  checks prevent stale tabs from overwriting/resetting newer work. Saved worksheets
  include detached crop/figure provenance and can reopen their source for editing.
- Figure review now receives an actual original/reconstruction image pair after
  MathJax typesetting. Deterministic SVG validation and bounded repair remain in
  the chain; human review and original crop fallback remain available.
- Native problem rendering connects structured tables/choices/subquestions to
  preview. Native HWPX exports editable text and equations using the original Python
  writer/templates. Server PDF uses the same measured A4 preview and headless Chromium.

Current integration checks: Studio Playwright **14 passed** (including actual PNG
Blob restoration, cross-tab conflicts, source reopen, automatic/manual rotation),
and **36 passed** across figure image comparison, real Python geometry, production
AI route and export route tests. The generated 1840×960 comparison PNG was visually
inspected at `.qa-artifacts/mathgen-integration/figure-comparison.png`.
Provider calls in this completion pass use deterministic substitutes: no paid API
inference, production deployment, shared DB mutation or original-repository write.
Native desktop HWP and physical printing remain pending in `/dev/print-check`.

The combined migration regression run covered **568 tests across 36 files**;
the two stale route/review expectations were updated and their 15-test suites
passed again. The production build passed TypeScript and generated **74 pages**.
Actual Next production smoke, using an isolated local test session and an unreachable
test DB URL, verified anonymous rejection, the closed CLI endpoint, authenticated API
status, all four PDF asset kinds, API-only UI, and sample cropping at 1440/390 pixels.
Actual Next development smoke verified CLI/API selection and the same sample UI.
Both runs made **zero AI POSTs**, reported **zero browser JavaScript errors** and
had no document-level horizontal overflow. Their screenshots/reports are under
`.qa-artifacts/mathgen-integration/`. Existing tier-bench tracing warnings and the
Prisma config deprecation warning are unchanged.

Final engine/export integration added a signed Vercel Python function while retaining
local subprocess execution. **17 HTTP integration tests and 4 Python process tests**
verified actual SVG/HWPX output, signature rejection/expiry, cancellation and bounded
requests/results. **11 worksheet browser tests passed** after integration, including
actual HWPX/PDF downloads, figure editor controls, pagination and mobile layout. Combined
with Studio's 14 browser tests, the two focused browser suites cover **25 passing cases**.
Deployment configuration is documented in [AI setup](../dev-subscription-ai.md).

Source scope: the live source currently enables digitization only. Its variant
dialog is a dormant/mock flow, and DOCX is disabled; this migration does not present
those as functioning generators. Existing today-math Auth.js, bank and worksheet
storage remain the host integration; dormant source Supabase auth is not duplicated.

## Earlier digital port record

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

At that earlier stage the source check compared one image to spec/SVG. The current
integration above replaces this with rendered-image comparison and persistent source
sessions. Human visual review remains necessary. Provider failure or unrenderable
figures retain their original crops. Running jobs do not automatically resume after
browser close/reload; completed results and originals do persist.
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
