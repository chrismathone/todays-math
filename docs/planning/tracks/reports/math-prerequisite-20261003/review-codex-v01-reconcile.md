# Codex reconciliation review — v0.1
Date: 2026-10-03. Reconciliation verdict: request_changes, with agreement on the revised same-explorer, unchanged-payload direction.
This is not final approval. Actual Codex/Grok/Claude approval of the identical final v0.2 hash remains required.

## Read versions and limits
Read the authoritative root plan and graph, both root Codex reports, Claude and Grok v0.1 reports, Claude's reconciliation report, and existing course/expedition/generation/DTO/parser sources in this worktree.
SHA-256:
- Root plan-v01.md: AE003EE943F4C350258CAF35493B9F1858B21E034E51C64D89605DDD2C664139
- Root math-graph.cjs: 276BFC75C5A3B1C65138D3CFF69008E56DEC9199AF25F7AF28359EC7180CB471
- Root review-codex-v01.md: 136462E66D2D237CFE45156E47AB0BB025B399A9A3E63CE5510EE4A94F8BFB3C
- Root review-codex-v01-addendum.md: B45C50485FB064223E76E0CB6F8B474F29E9FF0F6F178B0B3523D6128CCFE153
- Claude review-claude-v01.md: 161941056A5FD90737451B6EE813959BFD59E7C89C1E2C91A0CA34760D23474C
- Grok review-grok-v01.md: EB29D801549EB155BCC959DB6AE96A0ED044854FE26815318CBD9EF72E30E71E, unchanged on second read
- Claude review-claude-v01-reconcile.md: 6F5512ECC55BA231C9AE4E8E88C871EF876574D4055DF2B10920E00C904696EC
No generators, product tests, servers, installs, DB access or paid AI calls were run. This planning report is the only repository write. Source registration is not an executed supply certification.

## 1. Architectural reconciliation
I withdraw the standalone GCD loop and optional persisted prerequisite field as requirements for this pilot. They were implementation preferences that supported broader independent sessions, exact episode receipts and retained form evidence, not necessities for the narrowed same-explorer flow. Grok's separate table offers isolation but is likewise unnecessary here and introduces a migration before a student can use it. Strict payload shape is a real compatibility constraint, not proof that every prerequisite feature needs a new table.

Reuse completed course sessions/current session, progress, memories and request receipts; recompute observations/assessment/recommendations on reads. Existing StudentSrsState already isolates students and provides CAS. Do not ingest exams, middle weighted memories or conceptual-card evidence in this v1. Do not add persisted keys, new modes, session sizes, or aggregate mastery. Exam regrading and historical evidence migration are out of v1; no placeholder regrading API or unused correction ledger is needed.

Unchanged payload cannot guarantee: original episode identity after an explicit target change; outcomes for evicted sessions; per-family diversity; immutable version-stamped history; finite repeated retries enforced automatically. These are not prerequisites for the bounded revised pilot when the plan explicitly uses current curriculum intent, unknown outcomes after eviction, content-level freshness, read-time policy, and existing learner-controlled retry/give-up. Do not claim those stronger behaviors.
If future scope requires automatic retry termination, change the retry transition AND replay validator together: progress.ts:205-246 reconstructs pending by requeueing every wrong request unless giveUp=true. Merely dropping pending questions after a cap would break parseSrsState. This is a specific necessary behavioral change for that stronger requirement, not a DB-table requirement.

## 2. First actual source-supported scope
Keep every one of the 100 graph units for browsing and all requested 11 course exclusions, plus the draft's two additional exclusions. Audit remains incomplete; no implicit topic edges, inherited weakness/mastery, orderIndex edges or courseRelation prerequisite edges.
Pilot allowlist: E56-N03 -> E56-N04; target sections 5-2-2-1 and 5-2-2-2 only; ordered check sections 5-1-5-4 then 5-1-5-3. All are g5-fractions. The selection is an authored assessment scope under a unit edge, not a topic prerequisite edge.
Evidence: root math-graph.cjs:152; curriculumBridge.ts:23; g5.ts:8348-8364 and :8421-8436 target applications use subtraction; :6947-7004 and :7120-7175 implement subtraction scopes; :16770-16784 and :16827-16839 register arithmetic/basic/application tiers.
The first target may be 5-2-2-1 with check 5-1-5-4. Keep the return on that identical section. Other target/check orders require no extra user permission after consensus.

Reject the earlier 5-1-4-2 diagnostic. answers.ts:168-185 routes simplification/required notation to self-check; g5.ts:5711-5776 contains those stems. A five-question session there cannot establish four server-graded unaided successes. Do not alter its grading to make the pilot appear feasible. M3-R02, high-school and E12 closed loops remain explicitly unavailable.

## 3. Exact evidence and cooldown proposal
Constants: evidenceWindowDays=14; triggerFailedSessions=2; sessionSize=5; passedUnaided=4; failedUnaidedWrong=2; maxDepth=1; maxNewCheckSessionsPerKstDay=1; orderedCheckScopes=2; cooldownDaysPerCheckScope=14; candidateSessionSeeds=20.

Deduplicate sessions by session.id and first-pass facts by studentId/sessionId/problemId. Ignore session.retry when classifying first-pass results. Existing request replay keeps revision/facts unchanged; expired historical session submissions must fail rather than become new attempts. The same content must not count twice as independent evidence, including duplicate content within one session.

For a completed session:
- independent = server-gradable first-pass answer, no hint/self-assessment/revealed-before-answer, no giveUp, and content absent from earlier retained exposure;
- passed = at least four independent correct answers;
- failed = at least two independent incorrect answers;
- otherwise inconclusive. Non-completed sessions have no session outcome.
Blank give-up, assistance, self-assessment, absence and retries are neither independent success nor independent failure. Retained request.giveUp distinguishes omission from incorrect submitted answers; store shape need not change. No time penalty.
Do not reuse completedSectionIds or the current mixed self-check course-completion predicate as diagnostic pass. A progress completion can be intentional while direct assessment remains inconclusive.

latestOutcome(P) uses the latest retained completed P session. If course progress/memory proves newer P work exists but its source session was evicted, outcome=unknown, not an older retained pass. freshUnaided(P) requires that latest completed outcome be passed within 14 days; cumulative unaidedCorrect, mastery, lastReviewedAt and a historical completion flag cannot prove this.
cooldown(P) uses memories[P].lastReviewedAt only to suppress issuance for 14 days. An unknown/failed/inconclusive scope can still be in cooldown. No unit demonstrated in this partial pilot. UI/teacher evidence can show direct scope outcomes/counts and unknown retention boundaries.

## 4. Required scheduling edits: one shared authority, several callers
A pure prerequisiteStep/decision helper must serve courseSummary and expeditionCourseRecommendation, with effective five-question capacity supplied by the caller. startRecommendedCourse, the initial expedition start path and the expedition write guard must obtain the same selected section/mode through this chain. Do not independently compute check choice in a route.

Effective budget:
- outside an open expedition, use course plan/daily snapshot/activity;
- within an open elementary expedition, preserve its frozen goal=10 and answered/retry progress, even when course dailyQuestionCount=5;
- issue a complete session only with at least five first-pass slots remaining; resume/retry always precedes new issuance.
Do not raise the goal or add another assignment. courseServer.ts:72-81 and dailyJourney.ts:322-335 already project frozen mission totals to the student. When a check fills the day's assignment, return means the first eligible target session next day, not five extra questions today.

Priority after active resume and disabled/effective-budget gates:
1. target return;
2. eligible check;
3. ordinary pilot target relearning needed to keep the cursor progressing;
4. ordinary due/next behavior.
A return never chooses another check first. Existing learnedToday suppression must have an explicit ONE return exception: a completed check can be followed by target learn even if target learn failed earlier that day, provided effective budget remains. No retry success modifies target assessment.

Return proof: T is the current unresolved nextLearning cursor and the last current session is a completed allowlisted P review with retries resolved. Review does not change that cursor. Return {T, learn}, including the mission fallback branch; a fallback {T, review} does not advance curriculum on success. Keep same-explorer checks and existing guard equality; do not weaken cross-engine restrictions.
For robustness after the check session is no longer retained, if progress[P].lastReviewedAt is later than memories[T].lastReviewedAt and plan.configuredAt precedes the target observation, prefer ordinary T practice with a neutral reason, without claiming P passed. After a target attempt updates its memory, that obligation is consumed; active resume handles partial return. A plan reconfiguration cancels old intent; no freeze claim survives a deliberate new target.

Critical source issue: a learn-only trigger may be unreachable after the first failed learn. courseAutomation.ts:275-317 prioritizes the newly due target review, so later reviews do not create a second learn failure. Choose exactly ONE correction in v02. Recommended: retain the learn-only trigger but, for these two pilot cursor sections while enabled, choose ordinary T learn on a new eligible day before due reviews when prior target work exists and T is incomplete. This is ordinary progress, not a weakness inference, and preserves the learnedToday rest outside the single return exception. The alternative is explicitly counting direct completed target learn AND review sessions, which is also feasible but changes the trigger contract.
Suppress automatic due reassignment of the two check scopes during their 14-day cooldown while the same T is unresolved; otherwise an unsuccessful P can be issued daily through the ordinary due branch despite the advertised check cap. Existing wrong-answer retry/solution handling is the pilot's remediation; do not add an unbounded series of new P sessions or quietly claim a new remediation budget.

Check eligibility: latest two retained completed target learn sessions after current plan configuration must both be failed and within 14 days; one failure or missing history cannot trigger. Before issuance, no allowlisted P has been observed today (KST), choose first scope not in cooldown and not freshly passed. Current unfinished P already prevents concurrent second issuance even before memory exists. Unknown/failure history after eviction suppresses new diagnostic diversion, never ordinary target progress. Two scopes in cooldown means target practice plus teacher-help wording, not inferred mastery.

These are required recommendation/generation behavior edits, but no new state or weakened CAS/auth guards are necessary. Current student components already resume sessions and start the next recommendation; StudentCourseSrs.tsx:90-108 and :248-270 must be tested through the real handlers.

## 5. Fresh questions and supplier exhaustion
Keep five slots [arithmetic,basic,basic,application,application]. Gate the four revised sections after consensus with at least 200 seeds per section/tier for number mode, nonempty solution, grading correctness and valid choices. A gate failure leaves the pilot off; do not broaden to a different section.
Use engine-only questions for diagnostic checks AND target returns. Passing bank=[] in both course and explorer start paths avoids untraceable bank provenance. Outside this narrow pilot preserve bank behavior. Source courseBank.ts loses UUID/family; no family/type diversity claim is supportable.

Check full generated sessions against all stored problem content in current plus retained 30 histories and recentAttempts, plus duplicate content among five candidates. Normalize line endings and surrounding whitespace only; do not pretend this detects semantic duplicates. New seed alone is insufficient because finite source domains collide.
Try at most 20 deterministic candidate session seeds; persist the actual candidate seed in the existing problem.seed. Use a stable state/section-derived base (target section, target completed-session count and last target observation, requested section and policy version), not wall-clock milliseconds or new random draws inside CAS; base+j*104729 modulo 2^32 gives the candidate list. Capture UUID allocation once outside retry callbacks or use a request-local deterministic allocator.
To keep supply decisions and guard decisions consistent, supply preflight/selection must use that same deterministic state-derived list in the shared decision/generation layer.

Do NOT accept Claude reconciliation §4.6's exhaustion fallback that issues repeated content and later excludes it from evidence. The user requires an actual fresh next target problem and no silent policy relaxation. Exhausted check supply returns an explicit unavailable notice and ordinary fresh target practice through the shared authoritative decision; exhausted target-return supply issues nothing and returns an explicit supply-shortage response with existing error/reload recovery. No changed scope/tier, false progress, or fabricated completed loop. This is a declared supply limitation, not a history-eviction feature lock.
No persisted reservation of a particular return item is necessary for this pilot. Do not promise stronger guaranteed supply across unlimited later changes.

## 6. UI, authorization and acceptance closure
Current 2026-10-03 user authorization supersedes document27's no-auto allocation decision after actual three-model consensus. Record that supersession; do not insert another permission request.
Retain the real existing student player. API-only tests are not completion. Teacher graph browsing for all 100 units remains in task: existing CourseDashboard expandable CurriculumGraphPanel, authorized selected-student direct partial evidence, graph search/filter/details/incoming/outgoing/support/audit labels. Four wire/four high-fidelity planning candidates plus actual three-model visual selection may be a named gate before new UI code, using existing design system; this is already authorized selection work.
Graph/data API must separate static graph IDs from section IDs/DB UUIDs. Reuse teacherGate and owned class/student branch scope; include selected student only through authorized server reads. Document four semantic version axes: schema, content hash/version, mapping and policy; no persisted derived assessment needs migration.
Browser acceptance: two isolated student fixtures, existing player and actual route/store handlers backed by an isolated test persistence port; A's failures/check/target return never affect B. No production DB writes. Report that the fixture proves handler/CAS/UI behavior rather than production stock.
Add targeted regressions:
- goals 5/10/15/20 with frozen mission10; completed check at day cap returns target first next eligible day;
- learnedToday exception and return-before-second-check/due;
- first failure followed by due target review cannot starve second target learn forever;
- direct pass/fail/inconclusive, giveUp/hint/self-check/retry/repeated content exclusion;
- correction of latest outcome by newer work, unknown after eviction, cooldown survives eviction without waiting forever;
- two tabs, exact replay, altered replay409, cross-student leakage and wrong engine mission denial;
- generated seed/content collision, within-session duplicate, 20-candidate exhaustion with explicit unavailability;
- unchanged strict old payload parsing, no new persisted keys, off flag baseline equivalence;
- actual target success in learn advances normal cursor; narrow pass never whole-unit mastery;
- all100 graph units, excluded11, zero topic prerequisites, incomplete curriculum audit, unavailable M3/high.

## Wording needed for approval of final v02
I can approve the narrowed shared direction once v02 makes these exact decisions:
1. No DB/payload schema change; completed course-only direct evidence; unchanged existing grading/receipt mechanics.
2. Correct revised auto-gradable scopes; distinct outcome/cooldown/completion definitions and exclusion of giveUp/assistance.
3. Shared effective-budget helper at course and expedition continuation/initial start; return precedes check/due, with the explicit learnedToday exception and learn mode.
4. Resolve learn-only trigger starvation and due-check bypass; bounded history loss never waits for missing facts.
5. Twenty-seed content exclusion with explicit supply failure, no repeated-item exhaustion fallback or family claim.
6. Real student browser loop and full teacher graph panel after the authorized concrete visual review gate.
7. All three actual reviewers approve one final plan/hash, separately from this reconciliation task.
Until that identical final document arrives, verdict remains request_changes. The storage disagreement itself is resolved: no new table or optional persisted prerequisite field is required for this first pilot.

