# Independent arithmetic UI consumer review — 2026-11-14

**Final result: no introduced P1, P2 or P3 findings remain in the reviewed code.**
This is a source and focused runtime review, not production or figure-engine approval.

Reviewed the complete diffs of:

- `2144f4bef51d67b427095548858c518cb8ace06a` — lazy arithmetic consumers.
- `14672a5b8a9b085501556a94da01d43043284e27` — adjacent-card transition.
- `18f9a0e6add4195e17bf502e8312a9c44fe0ef87` — coordinator follow-up, reviewed after the coordinator explicitly requested it. The review branch was fast-forwarded to this commit before final checks.

Introduced findings: **P1 none; P2 none; P3 none.** An inherited cancellation gap and a remaining transition timing gap were reproduced independently, reported to the coordinator, and fixed by the third commit above. They are documented below rather than attributed to the lazy-loading change.

## Review boundaries and source findings

Read `AGENTS.md`, `DESIGN.md`, `docs/design/workspace-ui-rules-20261008.md`, and installed Next 16.3.8's `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`. Inspected both consumers, their callers, the numeric/figure renderers, saved-document reader dispatch and v1/v2 validation, paper rendering, event hooks, added/changed tests, and dependency-evidence script/JSON. The engine lead's separate worktree and unmerged assets were not used.

- `src/components/admin/AdminDocumentPreview.tsx:23` declares the lazy child at module scope; only the arithmetic-kind branch at line 198 mounts it. Other document kinds retain their existing rendering paths. Loading and module failure have distinct status/alert text, and cached failure correctly asks for a page refresh.
- `src/components/admin/AdminArithmeticPreview.tsx:18` through its closing brace is byte-identical to the old inline renderer in `2144f4bef^`. Validation still precedes projection/page creation at line 20; line 42 refuses invalid snapshots. The extraction preserves title, revision/date, v1/v2 dispatch, saved questions/answers, read-only `PaperStrip`, page modes and density. No save/generate callback was added.
- `src/components/arithmetic/ArithmeticTypePreview.tsx:23` defers the figure-expression module. Its numeric predicate exactly matches the original `GradeArithmeticPrompt` dispatch and reuses the same numeric renderer. The portal, tooltip ID, `aria-describedby`, pointer-transparent CSS and placement ownership remain in the light wrapper. Loading/failure content introduces no interactive tooltip controls; the existing component suites exercise real successful lazy imports and an isolated rejected-module path.
- The dependency script was rerun with its write sink replaced by a byte comparison against committed evidence. The graph matched exactly: admin static project modules **199 → 58**, static arithmetic-v2 modules **98 → 0**; tooltip **106 → 51**, arithmetic-v2 **52 → 2**. Geometry and figure-first presentation are absent from both initial static closures and remain reachable through the intended dynamic import. These are project import-graph results, not Next chunk/network measurements.

## Independently discovered gaps, now resolved

### First-opening cancellation

At `14672a5b8:src/components/arithmetic/ArithmeticTypePreview.tsx:125`, the dismissal effect returned while `state` was null. Hovering a card, pressing Escape or scrolling/resizing during the 250 ms opening delay, then advancing past the delay still opened its preview. This could show a preview after explicit dismissal or at a stale viewport location. The same behavior was reproduced at `2144f4bef^`, so it was inherited.

Minimal reproduction with the existing test fixture and fake timers:

```tsx
render(<Catalog />);
const card = screen.getByRole("button", { name: numeric.title });
fireEvent.pointerEnter(card, { pointerType: "mouse" });
// Test separately: Escape, scroll(window/body), resize(window).
fireEvent.keyDown(document, { key: "Escape" });
act(() => vi.advanceTimersByTime(300));
expect(screen.queryByRole("tooltip")).toBeNull();
```

The final implementation at `src/components/arithmetic/ArithmeticTypePreview.tsx:109` installs Escape/scroll/resize dismissal for the hook lifetime, before any tooltip exists, and removes the corresponding listeners on unmount. The independent cross-revision probe changed from state `A` to `null` for all three events. Regression tests are at `src/__tests__/components/ArithmeticTypePreview.test.tsx:194`.

### Timer fires before the transition commits

At `14672a5b8:src/components/arithmetic/ArithmeticTypePreview.tsx:95`, the timeout cleared the pending anchor before React committed its new state. If a pointermove over B arrived in that interval, A's still-installed closure could close B's just-requested preview. The pre-lazy baseline also ends at null for this adversarial event sequence, but already loses the ordinary transition; that older result does not separately isolate a timer-only cause.

Minimal reproduction: open A, dispatch pointerOut(A→B), pointerOver(B←A) and pointerMove(B); then, inside one `act`, advance the opening timer and dispatch pointerMove(B) again before the outer `act` flushes. Expect B's tooltip to remain. The pre-fix hook ended at `null`; final code ends at `B`.

Final `src/components/arithmetic/ArithmeticTypePreview.tsx:92` retains the latest requested anchor through the timer/commit interval; line 140 reads it from the still-installed off-card listener. The independent reproduction uses separate transition and timer/pointermove batches, additionally covering that ordering beyond the coordinator's combined-batch regression at `src/__tests__/components/ArithmeticTypePreview.test.tsx:209`.

**This is forced React/JSDOM event-order evidence, not a timing sequence observed in a browser.** Both issues were reported in Orca message `msg_75f749a5ed49`, with exact reproduction instructions in `msg_3901e6e4b107`; the coordinator supplied the fix, not this reviewer.

## Checks actually run

Toolchain reused through the explicitly permitted ignored symlink to `/Users/pss/Desktop/creative/today_/node_modules`; no install or package copy. Node was 24.22.0. All Vitest runs used one thread and a 2 GiB old-space cap; inline probes used 1.5 GiB.

### Focused component tests

```sh
NODE_OPTIONS=--max-old-space-size=2048 node node_modules/vitest/vitest.mjs run \
  src/__tests__/components/AdminUserDetail.test.tsx \
  src/__tests__/components/AdminArithmeticPreview.test.tsx \
  src/__tests__/components/ArithmeticTypePreview.test.tsx \
  src/__tests__/components/ArithmeticPreviewLoadFailure.test.tsx \
  --pool=threads --maxWorkers=1 --reporter=dot
```

- At `14672a5b8`: **30/30 passed, four files, 7.77 s**.
- At final `18f9a0e6a`: **34/34 passed, four files, 14.00 s**.
- Final read-only ESLint of the delta's two TSX files passed:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node node_modules/eslint/bin/eslint.js \
  src/components/arithmetic/ArithmeticTypePreview.tsx \
  src/__tests__/components/ArithmeticTypePreview.test.tsx
git diff --check
```

The suites cover actual legacy/v2 paper DOM, exact saved answers and figure projection, altered-answer refusal, loading/failure feedback, metadata, non-arithmetic document behavior, portal/ARIA linkage, numeric/figure examples, pointer/touch/focus/Escape/leave/blur/unmount, adjacent-card transitions and the new pending cancellation cases. Their passing result alone was not treated as proof of the boundaries or event contract; the independent checks below tested those separately.

### Independent hook probes

Ran `NODE_OPTIONS=--max-old-space-size=1536 node -` with an inline harness that extracted the exact hook declaration and its two delay constants from each revision using the installed TypeScript AST/transpiler, then mounted it with real React 19.2.8 and Testing Library in JSDOM. No hook, handler or scheduling rule was reimplemented; only the clock was controlled, and the harness observed the returned preview state.

| Event sequence                                         | `2144f4bef^`     | `14672a5b8`      | Final `18f9a0e6a` |
| ------------------------------------------------------ | ---------------- | ---------------- | ----------------- |
| First hover → Escape → delay                           | A (incorrect)    | A (incorrect)    | null              |
| First hover → body scroll → delay                      | A (incorrect)    | A (incorrect)    | null              |
| First hover → resize → delay                           | A (incorrect)    | A (incorrect)    | null              |
| A → B transition events, then timer/move before commit | null (incorrect) | null (incorrect) | B                 |

A separate ordinary direct transition ended at null before the fixes and B at `14672a5b8`. Final **25/25 independent hook checks passed**: mouse/pen/touch hover; first pending Escape/scroll/resize/card pointerdown; pending leave and keyboard blur; keyboard versus pointer focus; visible and pending-transition Escape/scroll/resize/card pointerdown/off-card movement; pending/visible unmount; ordinary and timer-before-commit transitions. Registration tracking verified no hook dismissal listeners or controlled timers remained after each unmount. JSDOM's own persistent keyboard listener was prewarmed before that tracking; an initial harness attempt incorrectly counted that environment listener, and was corrected rather than reported as a product leak.

### Independent saved-document and async-props probes

Ran `NODE_OPTIONS=--max-old-space-size=1536 node --import tsx -` using real `reopenAnyArithmeticSheet` and the two real sheet builders. **16/16 acceptance/refusal expectations passed**: valid v1/v2 accepted; unsupported/missing payload versions, null/array, and each version's altered answer, prompt, engine version, catalog version and unknown top-level key refused. Also reopened the frozen `src/__tests__/fixtures/arithmetic-v2-original-53.json` exactly, with its input unchanged. This tests retained snapshots, rather than assuming newly generated examples alone establish backwards compatibility.

Another inline invocation with the same command mounted the actual lazy `AdminDocumentPreview` in JSDOM (CSS modules stubbed for Node loading; no component/reader/lazy mocks). All five checks passed:

1. Switch document title/revision while its lazy module is pending: only the latest document appears after resolution. A fixed `3 × 4` legacy fixture renders the independently known answer **12**.
2. Unmount while import is pending: settling it creates no pages or loading status.
3. Unsupported payload version: refusal alert and no page nodes.
4. Missing payload version: refusal alert and no page nodes.
5. Null payload: refusal alert and no page nodes.

These admin probes preceded the final hook-only fix; neither admin source nor validator/projection code changes in that delta. The final four-file component run rechecked both admin paths and failure behavior.

### Read-only graph reproduction

The following exact invocation reran the existing graph script without rewriting its JSON artifact:

```sh
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.filemode GIT_CONFIG_VALUE_0=false \
NODE_OPTIONS=--max-old-space-size=1536 node --input-type=module - <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
fs.writeFileSync = (file, data) => {
  assert.equal(String(data), fs.readFileSync(file, 'utf8'));
  console.log('Graph output matches committed evidence; no file written.');
};
syncBuiltinESMExports();
await import('./docs/planning/tracks/reports/arithmetic-lazy-consumers-20261114/compare-dependencies.mjs');
JS
```

Result: exact match, exit 0. This ran at `14672a5b8`; the reviewed follow-up changes no imports or dependency edges. The original extracted admin body was also compared byte-for-byte with `git show 2144f4bef^:src/components/admin/AdminDocumentPreview.tsx`: equal.

## Supplied browser evidence inspected

Read the two repository reports, their graph evidence, `/Users/pss/tmp/arithmetic-parent-review-20261113/lazy-consumer-parent-review.json`, and all supplied `lazy-browser/` JSON files: `tooltip-regression`, `fixed-direct-transition`, `fixed-keyboard-transition`, `fixed-narrow-keyboard`, `fixed-legacy-document`, `fixed-figure-document`, `fixed-corrupt-document`, and `static-boundary-check`. Viewed the existing `fixed-hover-desktop.png` and `fixed-keyboard-narrow.png` as local images. Also inspected the coordinator's `pending-preview-before.log` and `pending-preview-after.log`; these show the four new regressions failing before remediation and all 12 tooltip cases passing afterward, and are distinguished from this reviewer's own runs.

The supplied records support tooltip linkage and visible containment in the captured 1697×875 and 390×844 cases, loaded document question/answer regions, corrupt-answer refusal, unchanged fixtures and no captured runtime errors. The earlier lazy-failure recovery concern in the in-flight parent JSON is addressed by the final refresh wording and failure tests; it is not an outstanding finding.

**No browser was opened or driven by this reviewer.** The captured browser behavior is standalone esbuild actual-component evidence at `14672a5b8`, with pre-engine figures and synthetic saved payloads. It is not browser evidence for the later cancellation fix, deployed Next chunks, authenticated accounts or production data. Resource arrays include prior requests and should not be interpreted as separate cold-load measurements for each screenshot.

## Unverified scope and delivery

- No local Next build, deployed Next/Turbopack/webpack chunk inspection, production request timing, prefetch/coalescing measurement, or complete enclosing-route dependency measurement.
- No authenticated account/DB/API operations, save/export/print production verification, new engine-pack integration or mathematical/visual figure-quality approval.
- No final-fix browser rerun, full viewport matrix, short-height/zoom layout certification, actual screen-reader announcement testing or complete accessibility audit. JSDOM event tests do not certify browser scheduling or layout.
- No full test suite or package installation. No source fixes, other-worktree edits, push, remote operation, helper agent, or worktree removal.

Only this report is authored in the review worktree. The permitted `node_modules` symlink is ignored; worktree-local Git settings suppress ExFAT executable-bit noise and use the already installed main Husky launcher so the normal commit hook runs. The coordinator owns report integration, release, and eventual removal of this clean merged worktree; the review branch is preserved.
