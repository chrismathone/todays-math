# Native source writing-space allocation — 2026-10-05

Implemented only the new [allocator](../../src/lib/textbook/layout/sourceWritingSpace.ts), [isolated fixture helper](../../src/__tests__/helpers/textbookSourceWritingProof.ts), [focused tests](../../src/__tests__/unit/textbookSourceWritingSpace.test.ts), and this report. `BIGSHOL/testbook` was cleanly merged first at `bbbd2c771`; root's source CSS/geometry commit `05fd660f0` was then fast-forwarded before final checks. Integration in model, pagination, HTML, server, browser and question markup remains root-owned.

**Result: 38/38 tests passed, zero skips, exit 0**, with the external frozen oracle enabled. Scoped ESLint exited 0; TypeScript syntactic/semantic diagnostics for the three new TypeScript files: **0, exit 0**. The initial attempt to build diagnostics for the entire repository exhausted Node's default 4 GiB heap; the successful check instead uses only these three root files and their dependencies and checks their diagnostics, without emitting files. This is not a whole-repository type-check claim.

The deterministic `allocateSourceWritingSpace(sections, pages, measurements, pageMeasurements)` returns `work` and `placements` arrays and mutates no input. `SourceWritingSpaceMeasurement` requires actual native-base question height, work offset, bottom padding/border, original work margin and observed DOM line count. `SourceWritingPageMeasurement` explicitly identifies the first native direct grid, its ordered question IDs, total raw child count, daily-banner presence, authored content bottom and actual stop top. The stop defaults to 270 mm only when omitted; a measured `.foot` fallback must be supplied when no page-end note exists. Returned work assignments contain lines, slack, total work margin, row y and row height; placement assignments include changed trailing authored body. They do not change page membership, x coordinates, widths, IDs, TeX, stored line defaults or the exchange.

Native behavior was read from the frozen `app.js` `writingGrid`, `matchingSpread`, `alignSpreadRows` and `expandWritingSpace` functions, and `full.js` body routing. Eligibility is source `exercise`, `typepage`, `reasoning` or `practice` with an explicitly supplied first `.content > :is(.question-grid,.reason-grid)`; `types` is a paired-group page and is excluded. A null grid means measured absence, not permission to infer every item. Answers, public worked examples, `exampleGroup` members, ordinary bank problems and semantic-absent layouts receive no work assignments. A grid that contains any explicit zero-base work receives no assignments, conservatively preserving its existing slots; this deliberate mixed-zero compatibility boundary differs from native allocation into an empty work container.

Only actual adjacent even/odd exercise pages can match. Matching uses native source unit and `source.sectionName` (absent means the native empty string), equal even **raw grid child count**, and equal presence of a daily banner. Converted section keys and editorial stage do not substitute for these rules. Question/reason grids use two/one columns respectively. Headings and prompts must already be aligned before collecting work metrics. Existing placement row floors are preserved, common first-row top and row-height equalization consume available space, and trailing authored gaps remain unchanged.

The allocator subtracts **8 CSS px at 96 dpi = 2.1166666667 mm** from the actual stop, uses the minimum remaining budget across a matched spread, and distributes integer **7 mm** row increments in stable round-robin order. Native cap and line-floor tolerance is **0.1 CSS px = 0.0264583333 mm**, not 0.1 mm. The cap follows immutable `questionType === "reason"` (native `.q.reason`) at eight lines, otherwise six, retaining any larger authored base. The native cap is the **maximum row height** derived from members' fixed offsets and line caps; a shorter peer can therefore receive seven lines beside a six-line peer. The helper preserves that behavior rather than incorrectly clamping each member. Residual slack goes into the original work margin. Equalization that exceeds the stop fails visibly; negative available budget adds no increment. No shrinking, filler, removed content, repagination, native HTML copying or application script injection is involved.

The independent native oracle is external and read-only:

- `C:/Users/user/Downloads/교재_복구_실행검증_20261005/reference/source-native-writing-allocation-v4/source-writing-allocation.json`, SHA-256 `e55363ff1ca288a25b3e11b7d7ca12798ba0b7eab611c54e156f1089881dd7dc`.
- Frozen converted `exchange-semantic.json`, SHA-256 `6e141a111dd38f5bfd691e0456873012e8d4d522b6d21f930ebbcee88d1e0881`.
- Original manuscript SHA-256 `520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb`; original `app.js` SHA-256 `a86db8d5c501940bbac09c71c2ea744551ba37c935fb41f82464d23075fa8530`.

The reference QA peer independently captured original geometry before expansion after native heading/prompt/spread alignment, and after the original allocator, with exact source assets/fonts in headless Chromium. That external oracle covers 12 eligible pages within the native 36-page U01 reference render. These allocator tests read its frozen numeric data and strict converted RenderSections in **six isolated two-section/two-page cohorts**, never constructing that full DOM or rerunning native code. All 60 questions match native integer line counts; row height/work margin agree within 0.02 mm and row y/content bottom within 0.025 mm, allowing Chromium's subpixel CSS quantization.

| Source pages | Matching spread | Questions | Base total lines | Final total lines | First question base → final |
| --- | --- | ---: | ---: | ---: | --- |
| 29, 31 | Neither odd-start page pairs | 12 | 36 | 60 | 3 → 5 on each |
| 32–33 | Yes | 8 | 12 | 40 | 1 → 5 / 2 → 5 |
| 34–35 | No; practice pages | 16 | 28 | 58 | 1 → 5 / 1 → 3 |
| 36–37 | No; practice pages | 8 | 24 | 64 | 3 → 8 on each |
| 38–39 | Yes | 8 | 12 | 40 | 1 → 5 / 2 → 5 |
| 42–43 | Yes; daily banners on both | 8 | 12 | 40 | 1 → 5 / 2 → 5 |

Native R29 ends at 262.040853 mm; R34 at 264.265007 mm, under their 269.999023 mm note tops minus the 8 px reserve. Native R42's first work margin becomes about 8.090588 mm, preserving the residual slack. Native R36/R37 lack page-end notes and use the actual foot top **281.851530 mm**, not 270 mm; this distinction was sent to root for integration.

Also inspected the independent frozen original/converted geometry in `reference/runs/83e6b72c4-complete-source-v3/first-cohort-computed-css-v2.json` (SHA-256 `dd11c7efca3ddecabb6214dfcd47cc88026c8b88e5b5f189ae960c5cdc2d17f2`). Its first native/stored-production question heights are R29 **58.634147 / 44.838607 mm**, R34 **62.367253 / 33.775716 mm**, and R42 **60.994727 / 39.997559 mm**. That historical converted baseline has no allocator and exposes the missing row/work expansion; it is not a final check of root's new integration, and its measured base offsets must not be substituted with original final offsets.

The 32 synthetic controls cover round-robin distribution, minimum spread budget and row equalization, physical parity/adjacency, differing units/sections, banner mismatch, odd/unequal raw grid counts, native empty section names, direct-grid eligibility and first-grid-only allocation, source/semantic absence, answers/public/group exclusions, zero-base preservation, six/eight caps and bases above caps, shorter-peer native row cap behavior, slack margins, insufficient/negative budget, exact pixel-to-mm tolerance, top alignment, missing/duplicate/negative/non-finite measurements, unknown grid members, overflow rejection, and accepted exact 8-section/600-block/32-page bounds versus rejected excess. Input JSON equality is asserted for synthetic allocation and every original cohort.

Reproduce the focused tests in PowerShell:

```powershell
$env:TEXTBOOK_SOURCE_WRITING_FIXTURE='C:/Users/user/Downloads/교재_복구_실행검증_20261005/reference'
node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts src/__tests__/unit/textbookSourceWritingSpace.test.ts
node node_modules/eslint/bin/eslint.js src/lib/textbook/layout/sourceWritingSpace.ts src/__tests__/helpers/textbookSourceWritingProof.ts src/__tests__/unit/textbookSourceWritingSpace.test.ts
```

Without `TEXTBOOK_SOURCE_WRITING_FIXTURE`, the six original cohorts skip explicitly. Synthetic `typepage` and one-column `reason-grid` eligibility are covered; the supplied U01 oracle has no actual eligible typepage or reasoning-page cohort. This task proves the allocator against measured original geometry and immutable converted render data, **not** delivered server/browser geometry or original-PDF visual equality after integration. Root must apply the exact measured contract to final server and browser render copies and verify delivered R29/R34/R42; the reference worker owns the broad 14-book QA. No converter, existing production files, shared node_modules, Prisma generation or production database was changed.
