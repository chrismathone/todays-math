# Teacher retained evidence panel — 2026-10-23

The existing `LearningInsightPanel` now explicitly opts in to v2, showing stored
course plan versus the computed course goal, bounded retained observations for
grades 3–6, and the existing four-section fraction pilot separately. No new
navigation, plan shortcut, educational calculation, diagnosis, or student writer
was added. The old v1 client exports and strict transport remain available.

## Exact source and ownership

Tested product commit: **`83901c9ab6b3698548574dd914a0af324f7e70d6`**.
Core fixture freeze: **`6c9e431563f68f1e344a28b9232eb849cc303fbd`**.
This report is the only change after the successful final browser pass.

UI commits, made with ordinary Git commit commands and no hook bypass:

- `b088ea900c0486e4a14eeacc0b0d965853065556`: lifecycle regression RED.
- `4b494b8b6bbe5e6bf13e64328577ea0009d90895`: panel/client/actual DTO fixture.
- `83901c9ab6b3698548574dd914a0af324f7e70d6`: resize correction, updated canonical
  facts, final fixture and QA checks.

Core's announced immutable contract and pure projection commits were merged
normally, including the coordinator-reviewed final pure freeze above. This
worker did not edit backend, contract, API route, student, storage, or scheduling
sources. Core's final authorization/route implementation and production
integration remain coordinator-owned; this UI QA never called those services.

The coordinator explicitly expanded this worker's ownership in message
`msg_73c93ae6c961` to `src/components/ui/AutoGrowTextarea.tsx` and its meaningful
regression test after a measured ResizeObserver failure. That narrow correction
is included below; other shared widgets, CSS tokens and dependencies were not
changed.

Owned changed files:

- `src/components/math-srs/LearningInsightPanel.tsx`
- `src/components/math-srs/LearningInsightPanel.module.css`
- `src/components/math-srs/courseApi.ts`
- `src/components/ui/AutoGrowTextarea.tsx`
- `src/__tests__/components/LearningInsightPanel.test.tsx`
- `src/__tests__/components/learningInsightApi.test.ts`
- `src/__tests__/components/CourseDashboard.test.tsx`
- `src/__tests__/components/AutoGrowTextarea.test.tsx`
- `scripts/qa/math-insight-ui/README.md`
- `scripts/qa/math-insight-ui/data-v2.ts`
- `scripts/qa/math-insight-ui/generate-v2.ts`
- `scripts/qa/math-insight-ui/generated-v2.json`
- `scripts/qa/math-insight-ui/fixture.tsx`
- `scripts/qa/math-insight-ui/tsconfig.json`
- `scripts/qa/math-insight-ui/types.d.ts`
- `scripts/qa/math-insight-ui/verify.mjs`
- `scripts/qa/math-insight-ui/vitest.config.mts`
- This report.

## Behavior and boundaries

The client sends `x-math-insight-version: 2` to the existing insight endpoint and
validates the exact core-owned v2 DTO. V1 methods send no opt-in header and still
use their original schemas. The panel renders canonical fact text; it does not
recompute counts, outcome thresholds, relationships, goals or dates. The source
period and retained-history limits are visible. No retained source is described
as absence of source, with the code-owned warning that this does not establish
no past learning or zero achievement.

Generic source counts remain separate from current-plan/window inclusion and
from the fraction pilot's latest observation and candidate policy. Source
citations open their containing details and focus the exact row; pilot numbering
is offset from generic source numbering. Canonical candidate facts, including
held reasons and caveats, appear in the pilot area. Core's candidate fact ID
namespace is used only to place those explanatory facts, including facts that
have no eligible candidate reference.

Scope, nested pilot context/revision/as-of/digest, unique IDs and references are
checked before rendering. Inquiry facts must match the returned snapshot's
canonical fact ID, kind, text and citation arrays exactly. Scope changes key the
panel immediately; abort signals and controller ownership reject late responses.

A POST 409 discards the old answer and snapshot, retains the question and makes
one fresh GET. There is no automatic POST/model rerun. A failed fresh GET leaves
records cleared and the question retained. Inquiry authorization failures clear
all read facts. Other model/unknown failures retain facts only within the same
already authorized scope and require manual retry. Enter submits once,
Shift+Enter/IME input remain input, and explicit cancellation keeps the question
while ignoring the late answer.

## RED → GREEN and scoped verification

All tools used the existing shared dependencies read-only. The dedicated Vitest
config does not load environment files, uses one worker, and retains the existing
in-memory/MSW protections.

- Initial panel baseline: **6 RED / 32 PASS**, recorded before implementation.
  Failures covered stale refresh, authorization clearing, Enter admission and
  cancellation.
- Shared textarea baseline: **2 RED / 1 PASS**, recorded before its correction.
  The failed checks demonstrated synchronous width-driven DOM writes and missing
  scheduled-fit cleanup. All three then passed.
- Final scoped tests: **223 PASS / 8 files**. This includes panel, client,
  dashboard, textarea and existing English editor/safety, English maker and
  exam-report workspace regressions.
- Scoped TypeScript: exit 0. Scoped ESLint: exit 0. `git diff --check`: clean.
- No full repository typecheck, build, push, deploy, shared DB access, real
  credentials, paid model calls or production browser/API requests were run.

The fixture generator checks actual source bytes against the exact core freeze,
uses production pure course transitions, and freezes public DTOs and code-owned
teacher prose. Self-check questions use the existing explicit self-assessment
transition. Thirteen cases cover ready fraction pilot, outside pilot, no source,
paused/future/current plan, stale/excluded source, grades 3/4/5/6, missing retained
session source, unfinished session, and multiple grades. The missing-source case
intentionally removes source only from an already synthetic transitioned record.
No problem answer or real student content is exported.

## Browser evidence and failures preserved

Evidence root:
`/Users/pss/Desktop/creative/display-survey/consensus/ontology-plan-20261023/ui`.

Final native-browser result: `browser-final/results.json` and
`browser-final.log` — **60 captures, 26 checks, errors 0, rejected requests 0,
no failure, resourcesClosed true, process exit 0**. One installed Chrome engine
was used at a time, through
`QA_CHROMIUM_EXECUTABLE=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
No browser download occurred. Every nonlocal/API network request was blocked;
API DTOs were served only by the fixture's in-memory fetch interceptor.

At 390px and 1440px the checks cover normal/loading/error/empty/plan/excluded/
multi-grade states, generic and pilot citation reveal/focus, visible keyboard
focus and 44px controls, explicit questions, unknown/model failures, unsupported
scope answer, POST 409 → GET 1 → automatic POST 0, denied authorization after a
stale response, Enter/duplicate admission, cancellation, student/class scope
switch, refresh and late responses. Component checks additionally cover branch
and refresh-key ownership and unmounting. Real Pretendard and KaTeX fonts loaded;
all 60 captures had document overflow 0, no broken images or KaTeX errors.

Actual multiline textarea checks resized 1440 → 390 → 1440, preserving value and
focus, growing from 110px to 333px content height and shrinking again without
internal content scrolling. No window, console or page errors occurred. The
final PNGs directly reviewed were `390-ready-detail.png`,
`1440-ready-detail.png`, `390-empty.png`, and `1440-multiple-grades.png`;
text hierarchy, wrapping, source/plan separation and preserved shell treatment
were accepted without further product edits.

Earlier results are preserved, not replaced:

- `baseline-red.log`, `first-green-attempt.log`, `component-green.log`,
  `regression-green.log`, `final-test.log`, `scoped-ts.log`, `scoped-eslint.log`.
- `browser-1/` and `browser-1.log`: an immediate assertion read POST count before
  the asynchronous client call reached the fixture; the saved log contained the
  eventual single POST. The harness now waits for the observed call.
- `browser-2/` and `browser-2.log`: full interaction checks completed, but an
  explicit window-error listener exposed actual ResizeObserver loop warnings
  that Vite had handled before Playwright's pageerror event.
- `resize-diagnostic.json`, `resize-diagnostic.log`, `browser-diagnostic/` and its
  log: measured textarea width 1116px → 40px during a full-page screenshot, with
  synchronous observer fitting changing height 88px → 380px in the same delivery
  cycle. The shared fix defers only width fitting to a cancellable animation
  frame and guards unmount cleanup; initial/value fitting stays immediate.
- `autogrow-red.log` and `autogrow-green.log`: the shared regression transition.

The final script awaited `browser.close()` and `server.close()` in `finally`;
exit 0 was observed. Lease return was reported to the coordinator in
`msg_f6008f85ff9a` before writing this report, and the coordinator accepted it in
`msg_45fbcb72719b`. No browser/server was restarted afterward.

## Final product bytes and limitations

The final run checked these SHA-256 hashes before and after QA:

| File                              | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `LearningInsightPanel.tsx`        | `72532188b56ae7887c483c156af6c7fa18b87cb3f9a05a72d7c5c76f8c25f227` |
| `LearningInsightPanel.module.css` | `34df8e5c12874bcf31bee09990325d923fbfe4b4ef516a95711d52aad803363d` |
| `courseApi.ts`                    | `fc54377f3d9a7974af1b2cb635b5c78a59d8d92228433f7b4c9b9f64ce772d26` |
| `AutoGrowTextarea.tsx`            | `5edb527bf86b8555ee8a54e9b50b7a1e4b66264f93ea09163cca5855037c37d4` |
| `generated-v2.json`               | `256e9581247cfb6270461a1f57439b0b3da8b409c1fc3096d7694991c2343969` |

The fixture uses the production dashboard entry and actual shell stylesheet,
with local Next adapters and memory transport. Its parent roster/detail data
remain the prior synthetic pilot baseline for navigation; the v2 insight
scenarios are independently projected cases. This does not certify consistency
between real endpoint reads or production authorization. Those concerns belong
to the coordinator/core integration checks. The browser matrices are 390/1440
and the explicit resize path, not every workspace breakpoint, print surface or
full accessibility audit. Pure grade examples are not all-catalogue educational
validation, achievement-standard alignment, or a measured learning effect.

## QA-only fixture correction — 2026-10-23 01:56 KST

The preceding final-run account is historical. Root's subsequent direct review
of `browser-final/1440-ready-question.png` found a real synthetic fixture
contradiction: both candidate rows said they were current candidates while their
canonical facts also said the prerequisite feature was off. The old fixture SHA
`256e9581247cfb6270461a1f57439b0b3da8b409c1fc3096d7694991c2343969` reproduces
this with two eligible candidates and two feature-off facts. The generator had
bypassed the production wrapper by passing `true` directly to the lower-level
policy, while the snapshot independently read an undeclared feature flag. The
product route already used the correct gated wrapper. This finding is a fixture
defect; it does not establish a production product defect or change a production
feature setting. Earlier evidence is preserved, including its contradiction.

Correction commit: **`b1d63d05b64d16b55e07784cd90e96cc955844f0`**. Exact pure
projection/composer freeze remains **`6c9e431563f68f1e344a28b9232eb849cc303fbd`**;
tested product remains **`83901c9ab6b3698548574dd914a0af324f7e70d6`**. No current
core WIP was merged. The complete `src` Git tree is unchanged from that tested
product: **`b0af714002f17d3f5d23e00c32b10b7f923b883a`**. Root authorized narrow
QA-only routing/assertion changes to `fixture.tsx` and `verify.mjs` in
`msg_03a05f307358`, alongside generator/data, README and this report.

The generator now uses exactly
`expeditionCourseCheckCandidates({ ...emptySrsState(), course }, now)`. Each
scenario declares a synthetic `MATH_PREREQ_CHECK` value. Both production wrapper
and snapshot read that same value inside a synchronous offline CLI projection;
`finally` restores the prior value (or deletes a previously absent flag).
Ready and the existing scenarios explicitly use `on`; the added `feature-off`
scenario uses `off` with the same course. Original pure course transitions,
self-assessment and the documented synthetic missing-source case are retained.
No learner payload, mission or student record is invented to force a result.

Positive assertions require ready to remain eligible through the actual
wrapper. Negative assertions require every off candidate to be ineligible and
its canonical candidate facts to explain feature-off. Across every declared
scenario an eligible candidate cannot coexist with feature-off text. Off keeps
identical retained factual observations and the canonical composer returns a
usable factual inquiry. All original thirteen scenarios retain byte-equivalent
`observations` and complete `pilot` DTOs; only candidate fact wording changed in
their snapshots. Original noncandidate fact prose is unchanged. The corrected
JSON is **657,702 bytes**, SHA-256
**`c7cebaeba1c1e103b4930e578328c565daf63f4e69ccfa989f44ac7ff0ab3e03`**.
Separate generator processes inheriting `on` and `off` produce identical JSON
and confirm restoration after every projection.

New evidence directory (earlier files were not overwritten):
`/Users/pss/Desktop/creative/display-survey/consensus/ontology-plan-20261023/ui/fixture-correction/`.

- `old-generated-v2.json` and `contradiction-reproduced.json`: exact frozen
  fixture bytes and the contradictory eligible/off facts.
- `old-artifact-hashes.json`: 271 existing evidence files hashed before work and
  verified unchanged after the correction.
- `evidence-manifest.json`: exact QA/product/projection refs, source hashes and
  byte counts, all scenario flags, fixture bytes, original-scenario comparison,
  generated artifact hashes, and the final browser result.
- `generator.log`, `generator-inherited-on.log`, `generator-inherited-off.log`:
  wrapper/flag assertions and deterministic regeneration without model calls.
- `final-component-tests.log`: **223 PASS / 8 files**, `maxWorkers=1`, including
  the existing AutoGrow animation-frame fix and its regressions.
- `scoped-ts.log`, `scoped-lint.log`: exit 0. `git diff --check`: clean.
- `browser-final/results.json`, `browser-final.log`: **64 captures, 34 checks,
  errors 0, rejected requests 0, failure null, resourcesClosed true, process
  exit 0**. All captures have overflow 0, no broken images or KaTeX errors;
  actual Pretendard and KaTeX font readiness passed.

The single installed Chromium engine and local Vite server ran the full prior
matrix plus explicit feature-off read/question cases at 390px and 1440px.
The checks retain generic/pilot source reveal and keyboard focus, one explicit
POST admission, cancel/late response rejection, student/class switching,
refresh, POST 409 → one GET → automatic POST 0 with the question preserved,
authorization clearing, and multiline 1440 → 390 → 1440 growth/shrink with value
and focus preserved. The final run records synthetic flags explicitly and
checks unchanged product bytes before and after; no warnings were suppressed.

Direct PNG review covered `1440-ready-question.png`,
`1440-feature-off-question.png`, and candidate-area crops of those plus
`390-ready-question.png` and `390-feature-off-question.png`. Ready shows two
current candidates with matching on prose and no off claim; off shows both
candidates withheld with the off explanation, while factual observations and
the inquiry remain readable. Original screenshots remain whole and immutable;
review crops are separate derived artifacts. Wrapping, text hierarchy, citation
focus and candidate-state wording agree at both widths.

The script awaited browser and server closure in `finally`; exit 0 was observed
before lease return message **`msg_21cd2406e3d1`**. The lease was returned before
README/report cleanup, and no browser/server was restarted afterward.

This pass remains synthetic UI verification through memory transport and local
Next adapters. It does not exercise production authorization, databases, real
student writes, real endpoint cross-read consistency, the later prompt-only
model evaluation, or educational effectiveness. No paid calls, key reads,
environment-file edits, dependency changes, full repository typecheck, build,
push or deploy were performed. Root owns integration, merge and release.
