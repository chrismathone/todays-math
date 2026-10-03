# Codex independent course-handler integration verification

Date: 2026-10-03. Dispatch: `task_0952ede00701` / `ctx_23cd0d9a2ba7`.

Integration under test: **`5a178c10856cfbb5ae8afc980e0d25da6fb6090e`**, fast-forward merged into the Codex worktree. Approved plan v03 was read and reverified at SHA-256 `09cd2ab152621e563945dcaf0eb7270095c2e31411051a547d94953bb6948bd1`.

**Result: the 19 new actual-handler cases and 14 existing course-route regressions pass; full project typecheck and scoped lint also pass. No production blocker was found in this bounded integration coverage.** This report does not claim product browser completion, production DB verification, educational efficacy, or whole-unit mastery.

## Owned change and isolation

Added only `src/__tests__/api/mathPrerequisiteRoutes.test.ts` and this report for integration work. The separately requested actual visual vote is `hifi-codex-vote.md`, committed as `40f2b8779`.

The new tests import the real Next route exports for course read/start, attempts, hint, roster, and teacher detail. Authorization, ownership, policy, supply validation, public DTO construction, first-pass/retry transitions, strict state parsing, daily journey updates, and expedition write guards remain real. The harness mocks auth sessions and DB/storage, plus the server-only/error-log wrappers. An in-memory per-student revision store performs the CAS, and one test causes an actual losing comparison followed by a retry against a newer revision.

Historical fixtures use real safe generated content and course transitions, with deterministic valid fixture UUIDs; fixture data passes the unchanged strict stored-course and SRS parsers. Most tests use the real local problem engines. Two supply-failure cases fault only the generator dependency to produce within-session duplicate content; all twenty-seed validation and route/guard decisions remain real. No DB, AI, HTTP server, package installation, product source edit, or delegation was used.

## Verified behaviors

| Coverage | Observable result |
|---|---|
| Flag absent/off/`true` | Existing due-target review remains; student/teacher optional prerequisite DTOs are absent; summary reads call no generator and write nothing. Only `on` enables the pilot. |
| Daily course goals 5/10/15/20 | Two fresh completed target learn/review failures offer P1 `5-1-5-4`; real POST issues five questions with the same content and problem seeds as preflight. No bank queries or answer/seed/solution leakage in the public session. |
| Completion and retry | One completed failure does not trigger; an unfinished second first pass resumes. Completing that first pass still resumes its wrong-answer retry before P. Correct retry answers leave first-pass independent failure counts unchanged. |
| Give-up/absence | Unfinished work does not supply a completed failure. Empty-answer give-ups do not count as direct wrong answers; the mixed one-direct-wrong session remains inconclusive. |
| Hint/replay/regrading | Numeric hint before answer is rejected; solution reveal after answer preserves the original direct grade. First-pass and retry duplicates keep revision/payload unchanged; changed answers receive 409. Retry success does not promote the first pass to passed. |
| Stable CAS issuance | A simulated other-tab revision winner causes two real payload attempts. Session UUID, five problem UUIDs, content, seeds, timestamps and all session fields are identical across retries. Repeated start resumes the same session without another revision. |
| Target return and cap | After a failed P first pass and completed retry, target learn precedes due review. This works even after a target learn already failed today, within the remaining five-slot budget. P1 ordinary due reassignment stays held; eligible P2 may be checked on a later day, without treating P1 cooldown as mastery. |
| Course 5 versus mission 10 | Actual course handlers and `changeSrsState` pass the frozen elementary expedition guard: five P answers use the first half, target learn uses the second half, pending retry resumes, and completion occurs only after ten first-pass answers and resolved retry. |
| Course budget deferral | With a five-question course goal, a completed check defers return and `canStart:false` without writing. Next day offers target learn. |
| P exhaustion with safe T | Each exhausted P uses twenty distinct deterministic candidate seeds per decision. A safe target fallback starts only five distinct unexposed target questions, uses no bank, and remains startable. Its display kind is unavailable with `canStart:true`; UI must follow the latter. |
| P and T exhaustion | Read and repeated start preserve the old legitimate historical session, issue no empty/new session, write no revision, show null recommendation and explicit `canStart:false`, and keep summary ready rather than falsely done/complete. No progress or reward is manufactured. |
| Student isolation and teacher ownership | Authorized A's failed target/check does not affect authorized B's ordinary new target or unknown evidence. B cannot submit A's problem/session IDs. Teacher reads show each student's own evidence, roster excludes foreign ownership, and foreign detail returns 403. |
| Existing request gates | Teacher-only session, forced password change, disabled/withdrawn student, foreign origin and forged student/section/mastery/context start fields fail before supply or writes. Successful responses retain no-store. |
| Stored-state compatibility | Real route-issued pilot states pass the existing strict parser and persist no prerequisite context or phase. |

## Source evidence

- `src/lib/math-srs/courseRoutes.ts:98`: request-scoped allocator is created before the CAS callback, then restarted over captured IDs for each retry; the callback recomputes the same authoritative recommendation and supplied session.
- `src/lib/math-srs/courseRoutes.ts:91`: a prerequisite decision bypasses bank loading; the actual course-start request remains an empty strict object.
- `src/lib/math-srs/courseAutomation.ts:407`: supplied problems are accepted only for the recommended section/mode and keep their actual generated seeds while assigning request-owned UUIDs.
- `src/lib/math-srs/serverStore.ts:87`: normal strict parsing, daily journey, expedition guard and revision comparison run on every tested write; no replacement persistence handler is used.
- `src/lib/math-srs/courseServer.ts:75`: student context is derived for the current state and teacher evidence uses the current student's stored course. Ownership checks remain in the existing teacher handler.
- `src/__tests__/api/mathPrerequisiteRoutes.test.ts:144`: real exported route imports; `:630` covers losing CAS, `:653` same-day return/cooldown, `:760` course/mission budget guard, `:854` full exhaustion, and `:882` two-student/owner isolation.

## Commands and results

Run from the Codex worktree with the already authorized junction to root `node_modules` and the repository's actual `vitest.config.mts`.

```text
node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/__tests__/api/mathPrerequisiteRoutes.test.ts src/__tests__/api/mathSrsCourseRoutes.test.ts
PASS: 2 files, 33 tests (19 new / 14 existing), 36.93 seconds

node node_modules/eslint/bin/eslint.js src/__tests__/api/mathPrerequisiteRoutes.test.ts
PASS: exit 0, no errors or warnings

node node_modules/typescript/bin/tsc --noEmit --incremental false
PASS: exit 0, no diagnostics; includes the final 19-case file
```

The first exploratory new-suite run failed on my fixture's wrong account approval field and an overly restrictive P2 expectation. The account fixture now uses the actual `approvalStatus` field, and the test allows a later eligible P2 while proving that due P1 stays held. Both were test defects and required no production change. The corrected 17-case run passed, then the final 19-case suite added retry replay/regrading and the real course-5/mission-10 path.

## Independent visual decision and remaining ownership

Actual vote: **approve H1** at exact HTML SHA-256 `fd9b495022a954025143062675e96b71249322fd162eaa307b9dd82ae1c39869`, artifact commit `564d540dd42ec07470be505983cd759bf2eb66ef`. Git blob and disk bytes match. I viewed all four variants' teacher/reason/supply PC images and H1 teacher/reason/supply at both 320 and 390 pixels (18 images); the vote report records concrete comparisons and objections.

The coordinator owns production UI binding and actual browser proof. Keep historical outcomes, partial scope, unknown source, deferred return, exhausted supply and safe fallback distinct; do not infer disabled state from display kind alone. Live filters, relation navigation, keyboard behavior, disabled auto-start and per-student fixture browser flows need the final implementation's own verification. This task's route mocks are deliberate stand-ins, not evidence of a live production DB or real student use.
