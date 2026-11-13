# Arithmetic consumer loading boundaries — 2026-11-14

Implemented in `BIGSHOL/arithmetic-lazy-consumers-20261114`, based on
`a5ccd4e9f90644fcaa2389ab8839af8dab79e879`. This worker changes only the two
requested consumers, one extracted component, focused component tests, and this
report directory. No main merge, push, deployment, or worktree removal was done.

## Changes and compatibility

- `src/components/admin/AdminDocumentPreview.tsx` now declares a module-level
  `React.lazy` import of `AdminArithmeticPreview.tsx`, rendered only for
  `arithmeticSheet`, inside a local `Suspense` with `role="status"`.
- `AdminArithmeticPreview.tsx` contains the old `ArithmeticPreview` implementation.
  Its body from `let pages` through its closing brace is byte-identical to the
  baseline. The real v1/v2 readers, snapshot/answer validation, title, revision,
  modified date, question and answer pages, density, and `PaperStrip` remain.
  The malformed-document alert remains distinct from a module-loading failure.
- `src/components/arithmetic/ArithmeticTypePreview.tsx` retains its hook, timers,
  dismissal listeners, portal, tooltip ID, `aria-describedby`, placement and CSS.
  Numeric examples call the existing `GradeArithmeticPaper` numeric expression
  directly. The numeric-vs-geometry predicate exactly follows the existing
  `GradeArithmeticPrompt` branch; only examples requiring that branch mount its
  lazy import and local `Suspense` status. No numeric JSX or figure rules were
  copied into a new renderer.
- Both lazy module failures produce readable `role="alert"` text. Because the
  failed module result is cached by `React.lazy`, the recovery instruction is
  explicitly **page refresh**, not closing/reopening the document or tooltip.
  The tooltip remains noninteractive and keyboard focus remains on its card.
  The isolated failure suite confirms this guidance after reopening the admin
  preview and confirms tooltip ARIA linkage, no embedded controls, and Escape.

`ArithmeticWorkflow`/`GeneratedWorkflow`, shared print/editor/state/storage,
contracts, data, AI, `src/lib/arithmetic-v2/**`, and `vendor/**` were not changed.
The separate figure-engine lead's worktree, browser and processes were not used.

## Resolved dependency comparison

Run from this worker's repository root:

```sh
node docs/planning/tracks/reports/arithmetic-lazy-consumers-20261114/compare-dependencies.mjs
```

The [script](compare-dependencies.mjs) uses the installed TypeScript compiler to
remove type-only imports, parses runtime import/export/require AST edges, resolves
actual project modules with the project's TypeScript configuration, and traverses
static edges separately from literal dynamic imports. It compares the **same two
entrypoints** with their committed baseline sources overlaid, checks that other
production source files have not changed, asserts geometry is no longer initially
static, and asserts geometry remains reachable through the deferred import.
The [JSON evidence](dependency-comparison.json) includes the initial module lists,
all initial arithmetic-v2 modules, paths to renderer targets, and dynamic edges.

| Entrypoint            | Baseline static project modules | Candidate | Baseline static arithmetic-v2 modules | Candidate |
| --------------------- | ------------------------------: | --------: | ------------------------------------: | --------: |
| AdminDocumentPreview  |                             199 |        58 |                                    98 |         0 |
| ArithmeticTypePreview |                             106 |        51 |                                    52 |         2 |

The tooltip's two retained arithmetic-v2 modules are only `presentation/text.ts`
and `presentation/notation.ts`. Neither entry initially reaches `geometry.ts`,
`presentation/figureFirst.ts`, or `render.ts` after the change.

Baseline admin path:
`AdminDocumentPreview → arithmeticOutput → arithmetic-v2/geometry`.
Candidate path:
`AdminDocumentPreview → [dynamic] AdminArithmeticPreview → arithmeticOutput → arithmetic-v2/geometry`.
Baseline tooltip path:
`ArithmeticTypePreview → GradeArithmeticPrompt → arithmetic-v2/geometry`.
Candidate path:
`ArithmeticTypePreview → [dynamic] GradeArithmeticPrompt → arithmetic-v2/geometry`.

This is a **resolved project dependency graph, not production Next chunk or
network measurement**. Counts include local CSS/JSON leaves, exclude third-party
package internals, and do not model tree shaking, chunk coalescing, prefetching,
or other consumers in the enclosing page. The new provisional offline engine is
not present in this baseline; its bytes and integrated production behavior must
be measured by the coordinator after integration. The script intentionally rejects
unrelated production changes rather than silently treating a later integrated
engine as this fixed baseline.

## Validation

Toolchain reused from `/Users/pss/Desktop/creative/today_/node_modules` through an
ignored local symlink: Node 24.22.0, Next 16.3.8, React/React DOM 19.2.8,
TypeScript 5.9.3, Vitest 4.1.11. No dependencies or Prisma client were installed or
regenerated, and no environment files were copied or printed.

Read `AGENTS.md`, `DESIGN.md`, the workspace menu map, and installed Next guides
`01-app/02-guides/lazy-loading.md` and
`01-app/01-getting-started/05-server-and-client-components.md` before editing.
Applied the Vercel React skill's conditional/dynamic loading review: module-level
lazy declarations, no import-time preloading, conditional mount, existing numeric
path, stable hooks and keys, preserved event cleanup/passive scroll listener,
explicit branch, and status/error semantics. No style-system changes were needed.

Baseline: the existing `AdminUserDetail` and `ArithmeticTypePreview` component
suites passed **22/22** before edits.

Candidate command (all passed, **28 tests / 4 files**):

```sh
node node_modules/vitest/vitest.mjs run \
  src/__tests__/components/AdminUserDetail.test.tsx \
  src/__tests__/components/AdminArithmeticPreview.test.tsx \
  src/__tests__/components/ArithmeticTypePreview.test.tsx \
  src/__tests__/components/ArithmeticPreviewLoadFailure.test.tsx \
  --pool=threads --maxWorkers=1 --reporter=dot
```

After strengthening the saved-figure assertion and ensuring both figure hover
and keyboard/hydration tests await real content, reran the three affected suites:
**12/12 tests passed**. The success tests use real lazy imports, readers, papers,
numeric expressions, and figure expressions. Only the separate failure suite
rejects the two requested leaf modules to simulate failed chunk loads; it does
not mock `React.lazy`, `Suspense`, or either consumer.

Coverage includes existing admin draft reading, extraction assets/image errors,
concept-blank reading, document focus/close behavior, actual v1/v2 question and
answer DOM, saved figure projection, corrupted stored answers, hover/focus,
touch suppression, pointer-down/Escape/blur/leave/unmount dismissal, portal
placement ownership, ARIA linkage during loading and after success/failure,
and hydration-safe markup after the real figure is loaded.

Focused TypeScript passed with `--noEmit --project
.tmp-lazy-consumers/tsconfig.json` and `incremental:false`. That ignored config
extends the root tsconfig, includes the three changed production TSX files and
three focused test files, and references `next`, `next/image-types/global`, and
`@testing-library/jest-dom/vitest`; it requires no generated Next route files.
ESLint passed for all six TSX files and the graph script; affordance checks passed
for all three production TSX files; `git diff --check` passed.

## Adversarial review and remaining work

Re-read the entire production diff and all added tests. Confirmed the copied admin
body is byte-identical, the numeric routing predicate and renderer are unchanged,
no hook/listener/timer code changed, no eager dynamic import invocation exists,
and the only new runtime boundaries are the two requested consumers. Corrected
the initial module-failure recovery wording after the coordinator pointed out
`React.lazy` caching; failure tests now lock accurate refresh guidance.

No Chromium, Playwright, dev server, production build, full test run, DB access,
or production verification was performed. Browser geometry/overflow, actual Next
chunks, cold-load timings, integration with the lead's new assets, final code
review, main integration, fetch-before-push, deployment verification, and cleanup
of this merged/clean/idle Orca session remain with the coordinator.

Worktree-scoped `core.fileMode=false` handles exFAT noise. The existing installed
Husky launcher is selected by worktree-scoped `core.hooksPath` so the normal
pre-commit lint-staged checks run; no hooks are disabled or bypassed. Only exact
listed files are staged, excluding symlinks, AppleDouble files and local test
configuration. The delivery commit and final clean status are supplied in the
worker's completion message.
