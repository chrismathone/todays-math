# Teacher fraction insight backend — 2026-10-22/23

Delivered in isolated Orca worktree `BIGSHOL/math-insight-backend-20261022`, based on `1939eb621d7545f764a1c37d80464b4928d065b5`. Local commits only; integration, production verification and deployment belong to lead. No production DB/API writes, migrations, resets, environment changes, build, push, browser or live model calls were performed by this worker.

## Commit chain

- `ad059bb24`: shared contract baseline.
- `6adec65bb`: authorized student/class/branch response context and mapping provenance.
- `358ef5474`: deterministic snapshot, pure prompt/parser/composer, bounded teacher GET/POST.
- `e56525036`: opt-in log privacy, transport/admission/cancellation regression coverage and narrow type fixes.
- `110b430aa`: evidence purposes distinguish current section evidence from candidate trigger proof.
- `6f78cfaa7`: authoritative prerequisite candidate pool and frozen-mission read adapter; teacher prose cleanup.
- This report is committed separately after the above implementation freeze.

## Endpoint and authorization

`GET /api/students/{id}/math-srs/insight` returns `{data: MathInsightSnapshot}`. `POST` on the same endpoint takes exactly `{query: string}` (trimmed, 1–500 characters) and returns `{data: MathInsightInquiryResult}`. Optional `classId` and `branchId` URL scope only narrows existing authority; unknown or duplicate query parameters and unknown body fields are rejected. No client-supplied record, evidence, provider or student identity is accepted.

Both methods reuse `teacherGate`, `requireOwnedStudent`/`requireOwnedStudentInClass`, `requireTeacherBranch`, `loadCourseStudent`, and the latest `readSrsState`. Authorization precedes record/model reads. POST uses read capability, same-origin authorization, not a progress-write operation. Account whitelist adds only exact GET/POST to this teacher SRS endpoint; existing superadmin management behavior is retained. Student sessions, missing menus, foreign branch/class/student and withdrawn students are tested. Responses, including denials, are no-store.

The shared contract lives only in `src/contracts/mathInsight.contract.ts`. Route handlers live under `src/lib/math-insight/` and the new Next route. No UI files were changed.

## Evidence and mapping semantics

Scope is exactly target `5-2-2-1` / `5-2-2-2` and check `5-1-5-4` / `5-1-5-3`. Four static partial section connections and two structural candidates remain visible even without a plan or outside the pilot; they do not become personalized recommendations merely because they exist. No saved plan means insufficient; this feature does not manufacture a teacher-approved plan from the default-course read.

The snapshot includes as-of time, revision, state digest, context, graph hash and prerequisite versions, actual authored mapping source path/hash, goal mapping status, bounded retained session references/timestamps/exclusions and reused independent counts. `mathPrerequisiteEvidence` owns count, independent-answer, recency and exclusion semantics; newer unfinished/future retained sources additionally block old positive evidence in this display. The source integrity test hashes actual `mapping.ts` bytes; no production runtime filesystem read is added.

Three meanings stay separate: editorial unit-level prerequisite edge; verified partial section mapping (`covers-part`); pedagogical next-check `candidate`. No persisted textbook relationship is declared confirmed, and no reviewer identity is manufactured. Graph/mapping/evidence sources are unchanged.

The coordinator explicitly authorized a behavior-preserving extraction in `math-prerequisite/policy.ts` and one read adapter in `math-explorers/expedition.ts`. `prerequisiteCheckCandidates` shares initial guards, completed-check return precedence, existing two-failure trigger, daily check/cooldown and remaining budget with `prerequisiteStep`; it generates nothing. `expeditionCourseCheckCandidates` uses the actual open elementary mission's frozen goal/answered/unit and rejects other mission kinds. Feature-off also disables personalized candidates. Existing actual supply/fallback/return behavior remains in the original writer path. A candidate never claims fresh question availability.

An evidence record is included when it supports at least one explicit purpose: `section-current` and/or `candidate-trigger`. The latest selected section source alone appears in `sections.evidenceIds` and owns its section counts. Both actual qualifying failures appear in the candidate's evidence links, with the earlier one included only as `candidate-trigger`. Counts from those sessions are not combined into section status. No other record domain, FSRS, schedule, quota, grading, plan or progress is mutated.

## Bounded AI selection

Exports for synthetic replay: `buildInsightSnapshot(course, revision, now, context = null, candidates = null)`, `buildInsightPrompt(snapshot, maskedQuery)`, `insightSnapshotId(snapshot)`, `parseInsightSelection(raw, snapshot)` and `composeInsightResult(snapshot, selection, provenance)`. The pure snapshot's default null candidate pool permits only static structural links; the real route supplies the authoritative read adapter.

Model JSON is exactly `{snapshotId, intent, evidenceIds, candidateIds}`. Intents: overview, evidence, next-checks, insufficient. Evidence IDs are ephemeral `e0` aliases and candidate IDs `c0` aliases. The snapshot ID hashes the full exact server snapshot. Prompt input omits real student/class/teacher identities, real session IDs, full questions/answers, raw state and state digest. Known identities in inquiry text are masked; remaining email/phone/UUID patterns fail closed. No cross-branch content is retrieved.

The strict parser rejects malformed JSON, unknown fields/IDs, excluded source IDs, duplicates, snapshot mismatch, contradictory intent, empty unsupported choices, ineligible candidates and missing candidate evidence links. No free model text is rendered. Code composes every statistic, reason, caveat and citation, and output echoes the same snapshot/as-of plus provider/model/selection-only provenance. No real-time-at-delivery claim or automatic assignment is made. `insufficient` is an explicit result, never a fabricated diagnosis or success.

Transport remains existing `runModelApi`; no SDK/dependency or global allowlist/default migration. Approved additive opt-ins `singleAttempt` and `suppressUpstreamDetails` leave existing caller defaults unchanged. This endpoint uses both, max 700 output tokens, 20-second cancellation signal and finally-release admission. Raw network/provider details are suppressed and rejected provider response bodies are canceled.

Configuration is read-only server `process.env`: `MATH_INSIGHT_VENDOR` defaults to Gemini, optionally `anthropic`; `MATH_INSIGHT_MODEL` overrides a supported existing model, otherwise existing provider's `STUDIO_AI_{VENDOR}_MODEL` or its established first supported model is used. Corresponding existing `GEMINI_API_KEY`/`ANTHROPIC_API_KEY` is required. Invalid configuration/missing key is safe 503, with no fallback provider. GET remains useful without a key. No credential file was read, and no real key value was printed or inspected.

POST bodies are bounded to 4096 streamed bytes even without content-length, with a five-second body read limit. Process-local admission allows one active request per account, eight total, six per account/minute and at most 2048 account entries. These are best-effort per-process limits, not a distributed/global spend ledger. Missing-key requests never invoke a model.

## Logging privacy

Coordinator-approved `withErrorLog`/`logRejectedResponse` metadata-only opt-in drops concrete URL values, query, route params, referer, user agent, user ID, request ID, arbitrary notes/images, raw response details and thrown error text from failure entries. Template route, method, status, duration, action/kind and generic failure message remain. Only this endpoint opts in; defaults are regression tested. Proxy denials use the same opt-in, and the proxy request audit masks this endpoint's concrete student path to the route template. Standard authenticated audit actor provenance remains. Inquiry bodies are never logged.

## Verification

Meaningful RED/GREEN: initial new unit/API tests failed on missing feature modules/routes. A later two-trigger citation test failed when only one source was linked, then passed after purpose-aware inclusion.

Final scoped run, one worker, 14 files / **194 tests passed**:

```sh
node_modules/.bin/vitest run \
  src/__tests__/unit/mathInsight.test.ts \
  src/__tests__/unit/mathInsightRuntime.test.ts \
  src/__tests__/unit/mathInsightEligibility.test.ts \
  src/__tests__/api/mathInsightRoutes.test.ts \
  src/__tests__/unit/mathPrerequisitePolicy.test.ts \
  src/__tests__/unit/mathPrerequisiteIntegration.test.ts \
  src/__tests__/unit/mathPrerequisiteRegressions.test.ts \
  src/__tests__/unit/mathPrerequisiteEvidence.test.ts \
  src/__tests__/unit/accountRouteAccess.test.ts \
  src/__tests__/unit/withErrorLog.test.ts \
  src/__tests__/unit/proxyErrorLog.test.ts \
  src/__tests__/unit/studioApiTransport.test.ts \
  src/__tests__/unit/studioApiRetry.test.ts \
  src/__tests__/unit/errorLogRouteCoverage.test.ts --maxWorkers=1
```

Additional temporary exact old-vs-new parity experiment: byte-identical pre-edit baseline policy source from base main was loaded beside the extracted version. **60 complete result comparisons passed**, including generated problem content, across base/pass/active/return/cooldown courses × enabled/disabled × open/short budget × ordinary supply/no supply/check-unavailable-target-fallback generators. Temporary copied source/test were removed after verification; no duplicate production policy is shipped.

Source-scoped TypeScript passes using a temporary tsconfig extending this checkout's configuration and including new contract/insight route/library source. A full-repository no-incremental TypeScript attempt exhausted the 6 GB heap; it is not claimed passed. No build/full test suite was run. ESLint for changed feature/shared sources reports zero errors; three pre-existing unused destructuring warnings remain in `expedition.ts` (lines 468–470), outside the added accessor. `git diff --check` passes.

Tests cover read authorization before record/model access, strict body/query handling, missing-key GET/POST, byte limit, identity masking, malformed/unsupported selections, exact snapshot binding, source-hash correspondence, future/stale/no-plan/outside-pilot data, immutable snapshots, current-vs-trigger citations, pass/one-fail/two-fail/feature-off/budget/active/return/cooldown/checked-today/frozen mission scope, concurrency cancellation/release, bounded admission, preserved default transport retry/log behavior, single-attempt suppression, metadata-only failure privacy and proxy privacy. All model tests use synthetic credentials and mocked transport.

## Remaining boundaries

Lead owns integration, full build/release validation and any production activation. Independent audit/live synthetic provider validation is owned by the other dispatched worker; its findings are not inferred from these unit tests. No measured instructional effect, official whole-curriculum alignment, diagnosis, mastery or all-content certification is claimed. Existing textbook rights/verification holds remain untouched. TypeSafe live guidance was read for narrow code-controlled selection design; the existing chosen transport was preserved: https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md and https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md. Installed Next route-handler documentation was read via the existing dependency installation.

## Addendum — evidence summary capability repair (2026-10-23)

Dispatch `ctx_ea4bdee6dbd6` started from clean `7df647485`. The independent auditor reported that all final 18 runtime responses parsed on `6f78cfaa7`, but the fresh-pass and disabled-plan-retained cases incorrectly abstained from observed-record summaries. The prompt exposed `snapshot.eligibility`, which describes personalized next-check availability, as an unqualified model-context field. This was a prompt/context ambiguity; the existing parser already permits summaries of included current evidence independently of candidate availability.

Implementation/test commit: **`3891f1780`** (`fix(insight): separate evidence summaries from next-check eligibility`). Only `src/lib/math-insight/inference.ts` and new `src/__tests__/unit/mathInsightCapabilities.test.ts` changed in that commit. This report addendum is committed separately. The frozen helper's SHA-256 is **`3e5480baf6579b42432555d52116e7d76714b321796bbbd6f57c9038b0c8b111`**; the source hash and then the exact implementation commit were sent to both coordinator and audit dispatch `ctx_0a261e1b89fd` before completion.

`buildInsightPrompt` replaces the ambiguous context field with two code-computed capabilities:

- `capabilities.evidenceSummary`: freshness is `current` and at least one source record is already `included` by the existing snapshot builder.
- `capabilities.nextCheckProposal`: freshness is `current` and at least one authoritative candidate already has `eligible: true`.

Instructions explicitly allow observed first-attempt summaries after a passed target or paused plan, and allow evidence-only overview. A next-check request without proposal capability must still return `insufficient`; candidate selection still requires the candidate's own eligibility and every trigger citation. Scope, diagnosis, mastery, automatic-assignment, untrusted-query and JSON/ID-only restrictions remain explicit. The parser, composer, snapshot builder, source inclusion rules, candidate guards, thresholds, shared DTO, policy and UI are unchanged. No free model prose is accepted or rendered.

Meaningful RED/GREEN used product course transitions and real snapshot/candidate builders. The new regression file initially had **9 failures / 1 pass** against the old prompt context. After the repair and one additional absent-authoritative-pool regression, the final scoped run passed **5 files / 44 tests**, including **11 capability tests**:

```sh
node_modules/.bin/vitest run \
  src/__tests__/unit/mathInsightCapabilities.test.ts \
  src/__tests__/unit/mathInsight.test.ts \
  src/__tests__/unit/mathInsightEligibility.test.ts \
  src/__tests__/unit/mathInsightRuntime.test.ts \
  src/__tests__/api/mathInsightRoutes.test.ts --maxWorkers=1
```

The capability tests cover supported summaries with exact source citations for fresh-pass/paused-plan records; refusal of candidate selections in both cases; a valid authoritative two-failure pool with complete citations; rejection of missing trigger citations; no inferred proposal permission when the pool is absent; and empty, stale, future-session, no-plan, future-plan and outside-pilot fixtures. The last group exposes neither capability, hides excluded evidence from model context, rejects evidence selection and preserves an explicit insufficient result. Prompt restrictions for out-of-scope/diagnosis/mastery requests and strict rejection of an extra diagnosis field are checked. These checks establish context and parser behavior; they do not claim a live model's semantic accuracy on arbitrary questions.

Scoped TypeScript passed for the changed inference source and regression test, plus their transitive imports, using a removed temporary configuration extending the project tsconfig with `incremental: false` and the checkout's absolute `node_modules/@types` root. The first temporary config omitted that type root and failed to discover Node types from `/tmp`; correcting the test configuration resolved it without a product source change. Scoped ESLint and Prettier checks passed, as did `git diff --check`. No full-repository type check, build, full test suite, browser, server, push, environment/DB mutation, credential read or model API call was performed; the existing dependencies symlink was unchanged.

Live validation remains exclusively owned by audit dispatch `ctx_0a261e1b89fd`, preserving its prior 22 attempts. It acknowledged the helper freeze and requested the exact commit for its predeclared 18 same-case comparisons plus 4 heldouts; that commit has been supplied, and no new live result is claimed here. Separate identity-mask phone/date/section-ID false positives and a feature-off hold-caveat mismatch were reported by that auditor to root; root subsequently expanded this dispatch to repair them as recorded below. Root owns final integration, validation and release; no production wait is required for this worker. The project's TypeSafe skill and live [state guidance](https://docs.typesafe.ai/concepts/state) informed explicit context naming while preserving the existing transport; installed Next data-security guidance was also read.

### Coordinator-authorized final extension and superseding freeze

Before settlement the coordinator explicitly authorized two additional narrow corrections in messages `msg_e54489389e16` and `msg_d8357c6692cb`. Implementation/test commit **`5ea527ba4`** (`fix(insight): accept curricular query references and respect hold feature gate`) follows `3891f1780`; intermediate `b50468152` contains only the first report addendum. These are the final code changes for this dispatch:

- `maskInsightQuery` keeps the actual masked query unchanged. Phone detection alone uses a copy that replaces whole, calendar-valid `YYYY-MM-DD` dates and catalog-recognized section IDs with nondigit markers. It does not strip matching substrings inside longer hyphenated/word tokens. Email and UUID detection still inspect the original masked text. Known identity replacement and the original phone pattern remain; ordinary national/international phones, contacts accompanying a date/section, invalid dates, unknown section sequences and embedded numeric fragments are covered by refusal regressions.
- `buildInsightSnapshot` passes the actual `mathPrerequisiteEnabled()` flag to the existing `heldCheckSections` read, replacing hardcoded `true`. A real product-generated, schema-valid recent check session demonstrates the hold caveat when enabled and its absence when disabled. Candidate eligibility, policy calculations, thresholds, DTO and model configuration are unchanged.

Independent extension RED: five normal date/section/identity-masked query cases threw `identity-bearing-query`; the feature-off snapshot incorrectly retained the hold sentence. After the corrections, the same five-file command above passed **60 tests**, including **27 focused regressions** in `mathInsightCapabilities.test.ts`. Scoped TypeScript for both changed sources and the focused test plus transitive imports, scoped ESLint, Prettier, and `git diff --check` passed again. Runtime tests use mocked transport; no live call, credential access or prohibited operation was added.

The **superseding final freeze** was sent to coordinator and audit dispatch, first as exact file hashes and then as exact commit `5ea527ba4` (apply after `3891f1780`):

| File | SHA-256 |
| --- | --- |
| `src/lib/math-insight/inference.ts` | `9d9d18ed9b4d1b0b7e89233c6dc5f26fe7d3037a69509591336eac102568cd1e` |
| `src/lib/math-insight/snapshot.ts` | `3c7503dbc6197d1893536711eb4f89b274335221544529fc66d4707aca9e0aeb` |

The earlier `3e5480ba…` helper hash describes only the initial capability repair and is superseded by this freeze. No further source changes are planned, no jobs remain, and the worker does not wait for live audit or production before settlement. Root retains final validation and release ownership.
