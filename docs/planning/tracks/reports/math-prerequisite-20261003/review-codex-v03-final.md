# Codex actual final plan vote — v03

**Verdict: approve**

**Approved plan SHA-256: `09cd2ab152621e563945dcaf0eb7270095c2e31411051a547d94953bb6948bd1`**

Reviewed on 2026-10-03 by this actual Codex session. This vote applies only to `D:/todays-math/docs/planning/tracks/reports/math-prerequisite-20261003/plan-v03.md`, read in full with UTF-8 decoding and its hash verified twice before this report. Inspection checkout HEAD is `763caff5985d115e6d104f39d69a1cd328168994`, matching the plan baseline. Task `task_30e64ebf4c54`, dispatch `ctx_6d79b6fef7c0`.

This is a plan approval with the document's mandatory implementation and activation gates intact. It is neither an implementation-completion claim nor a vote on behalf of Grok or Claude. No product code, generator, test, server, package installation, database operation, or paid AI call was performed in this review; only this planning report was written.

## Why the earlier blocking findings are resolved

| Earlier finding | Exact v03 resolution | Existing source supporting the decision |
|---|---|---|
| Learn-only failures can starve behind due reviews | Section 7 counts the latest two completed target **learn or review first passes**, both directly failed after current `configuredAt` and within 14 days; intervening success or inconclusive evidence blocks the trigger | `src/lib/math-srs/courseAutomation.ts:258` and `:268` select the unresolved cursor and prioritize due reviews; `:588` preserves original attempt evidence separately from retries |
| The course goal 5 versus frozen mission goal 10 can bypass return and repeat the check | Shared policy is applied in course, expedition continuation, and initial recommendation paths with the applicable budget; both normal and fallback return issue **T learn** before due review, with one `learnedToday` exception and five remaining slots required | `src/lib/math-srs/courseAutomation.ts:268`; `src/lib/math-explorers/expedition.ts:561`; `src/lib/math-explorers/expeditionStart.ts:10` |
| Ordinary due review can bypass the check cooldown | Section 7 suppresses P's ordinary due reassignment during its 14-day cooldown while the pilot T remains unresolved; existing retry/solution work supplies remediation, followed by T | `src/lib/math-srs/courseAutomation.ts:502` keeps wrong-answer retry distinct; `:741` retains per-section observation time for cooldown |
| Recent memory can be mistaken for fresh successful evidence | Section 6 uses memory only as an issuance restriction; latest source-backed first-pass outcome determines recent pass, and newer work with absent/incomplete source is unknown | `src/lib/math-srs/courseAutomation.ts:172`, `:676`, and `:741` show that memory aggregates and observation timestamps cannot prove a fresh pass |
| Content collisions can produce a fake fresh next problem | Section 8 excludes actual retained content and duplicates within the new set, tries at most 20 deterministic full-session seeds, stores the actual seed, and forbids repeated-content fallback | `src/lib/math-srs/courseAutomation.ts:368` supplies existing five-problem sessions and archives prior sessions; `:818` retains recent attempts |
| Exhausted target supply can cause automatic start/reload loops | Section 8 issues no new session, supplies a concrete reason/teacher-help state, stops autostart, and disables Start; active unfinished work remains resumable | `src/components/math-srs/StudentCourseSrs.tsx:90`, `:154`, and `:253` are the actual autostart/continuation paths requiring these changes |

These are explicit policy changes rather than an implicit revival of my old standalone GCD proposal. The revised target-review alternative is valid and avoids adding the separate target-relearning precedence exception previously suggested as another option.

## Approved minimal architecture and actual closed loop

No new DB table or persisted SRS field is necessary for this scoped, same-explorer pilot. Existing current/history sessions hold direct attempts and the immediate completed P; section memories retain cooldown observations. The plan explicitly accepts bounded history, unknown outcomes after source loss, and current-plan recomputation instead of promising an immutable episode ledger or permanent diagnosis. The strict storage requirement is meaningful: `src/lib/math-srs/serverState.ts:57` uses a version-1 strict payload, and `src/lib/math-srs/serverStore.ts:66` preserves revision CAS and central expedition validation. Display-only optional DTO context can be added without changing stored phase or accepting student-chosen targets.

The first approved path is unresolved **E56-N04 / 5-2-2-1 or 5-2-2-2** with two qualifying direct failed first passes → one five-question **E56-N03 / 5-1-5-4** check, or `5-1-5-3` when the first scope is restricted → finish existing wrong-answer retry/solution work → a fresh five-question **T learn** return. Return comes before another check or due review when budget allows, otherwise waits for the next eligible learning time. The ordered scopes are authored references to a unit edge, not topic prerequisites. All four sections remain in `g5-fractions`; supply availability is established by the post-approval gate, not presumed from registration.

P exhaustion may fall back only to a safely supplied fresh T under the same content/20-seed constraints. T exhaustion explicitly yields unavailable, not a completed loop. No arbitrary replacement unit, widened tier, reused item, or claim of unverified problem-family diversity is approved.

The 100-unit teacher graph, requested 11 exclusions, incomplete curriculum audit, explicit unsupported M3/high-school automatic supply, UUID-versus-section-ID distinction, and partial-unit evidence rules remain mandatory. A passed pilot scope never demonstrates all of E56-N03 or E56-N04 and never transfers mastery or weakness to ancestors. Exam regrading and indirect concept evidence are outside this evidence source; existing first-pass request replay and retry separation supply deduplication without a new grading ledger.

## Mandatory gates carried by this approval

There are **no unresolved P0/P1 plan blockers**. The following are binding implementation/activation gates, not tests reported as already passed:

1. Test all four sections across the three registered tiers for seeds 0–199 and actual five-problem sessions: automatic input/grade, no figure dependence, unique correct choices, correct-answer acceptance and wrong-answer rejection. Any failed scope stays off and material supply/policy changes require a newly hashed three-model plan vote.
2. Prove latest-two learn/review failure triggering, intervening success/inconclusive blocking, current-plan and 14-day boundaries, hints/self-assessment/give-up/retry exclusion, event/content deduplication, newer missing-source unknown, partial coverage, and student isolation. Test that cooldown survives retained session eviction without becoming pass evidence or locking ordinary target progress.
3. Prove return-first behavior with the one `learnedToday` exception for course goals 5/10/15/20 and frozen elementary mission goal 10, five-slot budget enforcement, one new check per KST day, P due suppression, active/retry resume, and unchanged disabled-feature behavior.
4. Prove state-derived preflight/start/guard consistency, stable request-local UUID allocation through CAS retries, stored actual seed, within/retained content collision rejection, both exhaustion branches, no empty/repeated autostart, same-explorer restriction, auth/ownership, no answer disclosure, and original strict-parser acceptance with zero new persisted keys. `src/lib/math-explorers/expedition.ts:658` and `src/lib/math-srs/serverStore.ts:87` remain enforcement points; they must not be bypassed.
5. Before product UI coding, complete and retain the actual four-wireframe/four-high-fidelity three-model visual selection for the teacher graph panel and limited player context/unavailable changes. Then prove the existing player with actual handler paths and isolated persistence fixtures for two students in the browser; API-only or invented production-use evidence is insufficient. The existing persistence port at `src/lib/math-srs/serverStore.ts:21` supports isolated state-transition verification.

The current user authorization and decision MPR-20261003-01 supersede the prior automatic-assignment hold only for this agreed pilot; I require no additional user approval for the already authorized work. Implementation may begin only after the coordinator records actual Codex, Grok, and Claude approvals of the exact hash above. Approval does not authorize skipping any gate, treating this report as the other reviewers' votes, or silently changing a material contract.
