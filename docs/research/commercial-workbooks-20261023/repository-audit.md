# Commercial textbook answer keys, grading, wrong-answer notes, assignments and print — repository audit

Date: 2026-10-23 (Asia/Seoul). Repository: `/Users/pss/orca/workspaces/today_/wrong-answer-repo-audit`. Audited HEAD: `34742b2f02456930d911e60a69ee020ccee56d64`. Worktree was clean at the start and remained clean after the report and inventory were written.

**Scope and evidence:** read-only static code/schema/contract/test audit. No application code edits, commits, pushes, dev servers, migrations, database reads, browser access, network/source-provider calls, or secret files. The only written artifact is this report. Test cases were inspected, not executed; no runtime, deployment, live inventory, or vendor-feature parity is claimed. File references below are repository-relative `path:line` at the stated HEAD; ranges identify the inspected implementation. The appendix inventories related source families, not a claim that every line of every inventoried file was reviewed. Historical comments and reports are not current production counts.

Read the repository AGENTS.md, DESIGN.md and `docs/design/workspace-ui-rules-20261008.md`; loaded the local Orca orchestration skill and CLI guide. This is one worker in the coordinator's parallel investigation; no further worktrees or workers were created. Coordinator follow-up received during the audit: implementation is now authorized elsewhere on `/Volumes/TodayWork`, but this worker must finish its read-only audit normally. This report does not expand this worker's scope.

## 1. Executive recommendation

The application already supports **teacher grading of bank-backed tests → saved wrong-answer selection → vetted practice variants → printable worksheets**. Reuse that infrastructure. A broad commercial-workbook workflow still needs a **book edition and exercise-address catalog, versioned verified answer keys, homework assignments/results independent of Test, and persistent wrong-note/retry records**. These are real missing domain objects, not a new skin over TextbookStudio.

Start with a **teacher-first, marks-first MVP** for a small verified catalog: pick an exact edition; select pages/questions; assign to a class or student; record reviewed correct/wrong/unattempted states; save results; collect wrong exercises; print a reference-based correction sheet or already authorized full-content problems. Display supplied verified keys to the teacher, but do not claim automatic grading for arbitrary math expressions. Add deterministic supported answer types and student submission only after the new records, permissions, and revision rules are tested.

Do not overload `Textbook*`: those tables mean teacher-authored books with frozen bank snapshots and QR publication. Do not fabricate full `Problem` rows for answer-key-only exercises: Problem requires content, unit and classification, is globally shared, and TestResult is linked to bank problem IDs. Keep the existing bank tests, their marks/answers semantics, authored textbook assignments, and StudentMathExplorers/SRS records unchanged.

## 2. Observed product and data boundaries

| Domain | Existing implementation and evidence | What it does not establish |
|---|---|---|
| Imported source books | `prisma/schema.prisma:1009` SourceBook; `:1036` SourceMaterial; `src/contracts/sourceMaterial.contract.ts:54-98`; `src/lib/import/schoolTextbook/sourceMeta.ts:53-81` | No ISBN, publishing year/printing, edition revision, source-page index, separate answer-key version or answer-only exercise ID. External key is curriculum/publisher/grade/author, not a universal commercial-series edition key. |
| Full bank problems | `prisma/schema.prisma:815-959`: required unit/content/answer/difficulty/problemType; optional questionType, source material, external ID, original question number, originProblemId, familyKey, figures | A book page/question key alone cannot satisfy these semantics. `questionNumber` is one integer, not a structured page/section/subpart address. |
| Authored textbooks | `prisma/schema.prisma:1951-2467`, `src/lib/textbook/server/*`, `src/components/textbook/TextbookStudioView.tsx:100,218,3129-3257` | These are our manuscripts/editions/placements/snapshots, not a commercial answer-key catalog. |
| Tests and grading | `prisma/schema.prisma:1164-1184,1315-1344,1398-1451`; `src/contracts/testresult.contract.ts:42-80,124-145,197-246` | Results require a Test, student and full bank Problem IDs. No raw typed short-answer or multipart response column; no standalone workbook assessment. |
| Wrong-answer practice | `src/lib/tests/planTestRetry.ts:19-149`, `src/lib/generator/planRetry.ts:24-28,127-219`; `SavedRetryPanel.tsx:199-266` | The endpoint computes a plan and does not persist a notebook, assignment, print artifact, retry attempt or completion state. |
| Textbook assignments | `prisma/schema.prisma:2321-2344`, `src/lib/textbook/server/assignments.ts:94-171` | These grant time-bounded access to published edition/section/item scopes; not page-range homework completion or exercise answer submission. |
| Student textbook activity | `prisma/schema.prisma:2418-2448`; `src/contracts/textbookStudent.contract.ts:11-91`; `src/lib/textbook/studentRead.ts:263-305` | Stored attempts are concept blank activities, not ordinary workbook problem attempts. QR problem view can expose answers under an assigned solution policy, but does not grade a submitted exercise. |
| Homework report | `src/lib/achievement/load.ts:390-391`, `src/contracts/achievement.contract.ts:183-194` | Loader explicitly returns `homework: null`; the existing type/sentence helpers are not a homework database or UI. |
| Saved documents | `src/contracts/privateWorkspace.contract.ts:14-40,64-72` | Current kinds are draft, extraction, conceptBlank, arithmeticSheet, examCondition, printPreset. A saved worksheet is not a student attempt or homework assignment. |

Important source vocabulary: `ProblemSource` currently has manual, past_exam, transformed, ai_generated, school_textbook (`prisma/schema.prisma:28-39`). `SourceBook.kind` permits school_textbook/workbook, but the source-material FK constraint permits only school_textbook/transformed problems (`prisma/migrations/20261007130100_source_book_material/migration.sql:138`). Therefore the presence of the word workbook in one catalog schema does **not** prove end-to-end commercial-workbook support. Decide source semantics explicitly before linking new content; never silently label an ordinary commercial workbook as a school textbook.

## 3. Traced current flows

### 3.1 Source selection and importing

The teacher source picker is wired through `src/app/api/studio/problems/sources/route.ts:13-24` with the existing studio gate. `src/lib/bankSourceRoute.ts:19-76` supports counts, current availability, picker groups/books, material pages and POST-as-read for long filters. Relevant consumers include `BankSourcePicker.tsx`, `bankSourcePick.ts`, `BankView.tsx`, the MathExamBuilder and the shared ExamBuilder. This offers good progressive catalog browsing and counts for **existing bank problems**, not answer-key ingestion.

The established school-textbook import pipeline is offline tooling: `scripts/import/textbook/README.md:11-35` traces HWP triage → HWPX conversion → segmentation and companion-answer matching → preparation/notation normalization → independent review → final rendered-content review → guarded loader. In particular:

- `extract.py`, `hwpx_flow.py`, `segment.py` handle ordered extraction and matching; `segment.py:550` merges companion answer files. The README at `:48-56` records number resets and matching hazards; matching by number overlap alone previously shifted equally sized groups.
- `answer_pictures.py` and `READ-ANSWERS.md:1-23` transcribe answer-table images as printed, preserving subpart labels and unknown `?`; the instructions explicitly distinguish transcription from solving.
- `load-school-textbook.ts:15-22,24-64` binds reviews to the exact prepared text; rejects mismatched or unreviewed inputs; records dry-run plans and ledgers; preserves IDs on refresh; avoids overwriting a human edit; locks designated retry slots when original content/answers/figures change.
- `src/lib/import/schoolTextbook/checkKey.ts`, `qualification.ts`, `refreshPlan.ts`, `designatedSlotLocks.ts`, `dbRetry*`, `codexRetry*`, `retryPairPlan.ts` provide useful qualification/provenance patterns. They are not an online licensed key service.
- The historical README cites Windows G:/E: source archives and dated coverage (`README.md:6,58-85`). Those archives were not inspected and are not evidence that the current checkout contains every requested commercial book or key.
- Legacy RPM code exists (`scripts/import/extract-rpm.ts:24-51`, `src/lib/import/convertRpm.ts`) and there is an explicit previous removal instruction for RPM textbook-conquest sections (`scripts/rpm/delete-textbook-problems.ts:2-35`). Do not restore old deleted/quarantined sources as a shortcut. No such scripts were executed.

There are two other import concepts to keep separate. UnifiedWorkspace's source upload accepts PDF/images (`src/components/unified/UnifiedWorkspace.tsx:1427`) and uses the crop/OCR/mathgen stack and private extraction documents. This is an editable content extraction route, not a verified commercial answer-key importer. `src/lib/textbook/server/imports.ts:1-12,82-123` imports the application's verified textbook archive format as archival bytes or a new draft with fresh IDs; bank links are re-captured and hash-checked. It does not import arbitrary publisher answer PDFs.

### 3.2 Grading and saved results

`GET/POST /api/tests/{id}/grade` is a teacher marks grid (`src/app/api/tests/[id]/grade/route.ts:28-55`, `src/components/test/GradeSheet.tsx`). Read/write access goes through `requireOwnedTest`; drafts are refused (`gradeSheet.ts:88-93,176-185`). The roster is loaded from current class context; full-roster submissions are required (`:191-224`); foreign wrong IDs are refused (`:227-238`). It writes all rows atomically and rechecks class/student authorization inside the transaction (`:264-317`). Wrong-ID marks produce full per-problem correctness rows, while both selectedChoice and essayScore stay null. An absent result has null score and no ProblemAnswer/AnalysisReport rows. Regrading appends a new result rather than editing history.

The UI explicitly distinguishes ungraded, finished, wrong and absent, refuses incomplete saves, and reloads saved result IDs after a successful save (`GradeSheet.tsx:99-125,189-268`). Tests intentionally prohibit misleading all-correct/all-present bulk buttons (`src/__tests__/components/GradeSheet.test.tsx:281`). Preserve this semantics when borrowing the table interaction; do not reuse its full-roster-only request unchanged for incremental homework checking.

`POST /api/tests/{id}/submit` is a different path: one student plus a complete answer list, with duplicate/foreign/missing IDs rejected, followed by grading and atomic result/report insertion (`src/lib/testResults/submitTestResult.ts:27-119`). Its contract allows a single selectedChoice 1–5 or an already teacher-graded essayScore percentage (`testresult.contract.ts:55-72`). `gradeAnswers.ts:91-124` only compares a single circled/plain choice number or uses the supplied essay score; its essay correctness threshold is 60 (`:25-26`). It does not parse arbitrary typed numeric answers, expressions, multiple selections, ordered tuples, geometric constructions or proofs. Test-level adjusted scores override source scores (`:78-88`).

Useful deterministic math primitives do exist separately: `src/lib/math-srs/sharedAnswers.ts`, `src/lib/math-srs/elementary/answers.ts:153,196-219,247-325`, `answerForms.ts`. They handle exact rational quantities/units and a narrow recognized list-answer grammar, with unsupported cases returning self-check/null. **Reuse only reviewed pure parsing/value-comparison primitives behind a new explicit grader specification**; do not call the course session engine or reuse its question-text heuristics as a universal publisher grader. Existing course stored modes and long-term learning records must retain their current meaning.

### 3.3 Wrong-answer review and printing

`POST /api/tests/{id}/retry` accepts studentId and optional saved testResultId, count, seed, excluded IDs (`src/contracts/retry.contract.ts:7-15`). `planTestRetry.ts:25-75` verifies test access, target student/current class, non-draft status, matching result, nonabsence and wrong IDs within the test. The UI pins the exact saved result and validates returned test/student/result/wrong IDs (`src/components/test/retryClient.ts:23-62`).

The planner distinguishes two modes:

- **School-textbook original:** two designated direct transformed children, slots 1 and 2 with `tb-retry-v1:<originalId>:<slot>`, matching parent and unit, approved/shared/direct-use and answer eligibility; no arbitrary substitute or original fallback (`planRetry.ts:24-28,195-219`, `textbookSlots.ts`, `retryCandidates.ts:56-76`). Count cannot shrink that obligation (`planTestRetry.ts:92-101`).
- **Other bank original:** same-family sibling, one slot per family, explicit foldedWrong count, eligible original fallback if no sibling. Seed is deterministic. It intentionally differs from ordinary recent-test exclusion (`planRetry.ts:16-22,223-240` and remainder).

Candidates are re-read for eligibility before returning the plan (`planTestRetry.ts:112-132`). The UI shows original-linked slot shortages and prevents incomplete output (`SavedRetryPanel.tsx:150-174`). It defaults to workbook print style; hides editing/reordering/saving to preserve the fixed plan (`:213-265`). Before each output it repeats the saved-result query and compares the entire plan (`:199-207`). `retryWorksheetProblems` preserves answers, figures, choice-figure links and original/slot labels (`retryClient.ts:116-150`).

This is strong **practice-sheet generation**, but not a persistent wrong-answer notebook. There is no current notebook entry/correction/reflection attachment model, cross-test unresolved list, attempt-to-retry relationship, repeated-practice history, per-entry status or due date in the inspected schemas/contracts/routes. The `retry` endpoint's own comment explicitly says it only reads (`planTestRetry.ts:19`). Search hits for wrong answers elsewhere mainly belong to independent SRS or exam-report summaries.

The monthly exam report has a paginated wrong-question summary (`src/lib/examReport/wrongTable.ts:8-72`) and current design intentionally excludes solutions (`docs/design/workspace-ui-rules-20261008.md:117` onward). It should not be repurposed into a solution notebook or silently changed to include keys.

### 3.4 Authored textbook assignment and student access

`createAssignment` requires both a readable published edition and current class/student progress-write scope, validates every scope ID, and uses a request-id/body-hash transaction pattern (`src/lib/textbook/server/assignments.ts:101-171`). Revocation timestamps the existing row (`:174-215`); it does not delete history. `TextbookAssignment` has opensAt/expiresAt/revokedAt, but no dueAt, submittedAt, per-target completion, item grades, or frozen homework roster.

The student gate requires active authenticated student plus enabled textbook menu, checks expected-student header against the session, rechecks current account and enrollment, and rejects cross-origin writes (`src/lib/textbook/studentRoutes.ts:57-87`). QR authorization is central (`studentAccess.ts:2-15`): active published QR; live in-window assignment to self/current class covering that item/concept; valid owner and class scope. Every asset/read/submission uses the gate. Teacher textbook-menu toggles do not substitute for the separate student's optional-menu policy.

Concept attempts are append-only student text or teacher-observed records with frozen concept hash, idempotent request ID and later teacher review. They are **not normal problem answers** (`schema.prisma:2418-2448`, `textbookStudent.contract.ts:74-91`). A problem QR reads the bound immutable snapshot (`studentRead.ts:87-107`) and includes answer/solution only when `studentSolutionPolicy === 'assigned'` (`:263-288`). That release policy is appropriate to existing QR study; an answer-submission assignment needs a separate explicit release contract and must not expose the full key payload before submission by borrowing this DTO unchanged.

### 3.5 Print, snapshots and export

Reuse `WorksheetEditor`, `PrintOptionsPanel`, `WorksheetPrint`, six template components, measured problem/answer pagination, `MathText`, figure dimensions/source-mm/choice mappings, print presets and PDF/HWPX clients. `WorksheetEditor.tsx:50-54,196-206,266-286` supports fixedComposition and an asynchronous beforeOutput guard for print/PDF/HWPX. `print/types.ts:98-169` defines showAnswers/quickAnswerOnly, solution space, column/layout modes and smartSpacing; defaults hide answers. Keep original student/teacher output separation.

Bank test printing uses `contentOf` after snapshot hydration (`src/app/(main)/tests/[id]/print/page.tsx:25-59`). `contentOf` gives publication content first, otherwise a valid textbook snapshot, otherwise current bank content, and a dangling/tampered snapshot never falls back silently (`src/lib/tests/testProblemContent.ts:48-88,117-170`). Test snapshot identity has a DB trigger (`prisma/migrations/20261003120100_textbook_test_problem_snapshot/migration.sql:37`). The authored-book reissue route creates a **new draft Test**, preserves snapshot IDs and refuses missing/ineligible/unlinked or duplicate underlying bank questions (`src/lib/textbook/server/reissue.ts:2-9,101-180`).

Do not confuse three operations: browser/PDF/HWPX worksheet output; Test's explicit confirmed→printed record (`src/app/api/tests/[id]/print/route.ts:25-78`); authored textbook publication (preflight/reserve/render/finalize plus immutable artifacts and QR bindings). The existing wrong-answer panel does not create a Test print record or persistent retry assignment merely because its worksheet was exported.

Export endpoints authorize session/menu/origin and validate content/size (`src/lib/export/request.ts:8-74`, `src/app/api/exports/pdf/route.ts:12-43`, `/hwpx/route.ts:12-25`). They are general document exporters, not a server-side provenance check for a specific commercial assignment. A new protected key/full-content export must first resolve authorized material and the pinned result/revision on the server, then feed the existing renderer; client beforeOutput alone is not a durable audit trail.

## 4. Authorization and compatibility requirements

1. **Keep operational and personal access separate.** Bank questions are shared and not user-owned (`problemPool.ts:4-18`, `schema.prisma:818-827`); private means removed from the pool, not privately readable content. Tests use current class capabilities, managed enrollment and special private prediction-run ownership (`ownership.ts:113-158,183-197`, `classAccess.ts`). Authored books are owner-private or explicitly branch-shared published editions; even branch admin is not blanket personal-book owner (`textbook/access.ts:2-9,43-62`). New workbook keys need an explicit catalog-read/editor-role policy and results need class/student scope; do not infer either from one another.
2. **Recheck permission during writes and replays.** Follow assignment/request semantics: current scope before replay and inside the write transaction. Include revoked/expired assignment, transferred student, changed teacher relationship, suspended owner/account, multi-class membership and wrong-branch tests. A guessed catalog ID must never grant student key access.
3. **Student menus remain optional and off unless granted.** Current paths `/q`, `/learn/textbook`, `/api/learn/textbook` map to textbook in `src/lib/learn/studentLearningMenuPolicy.ts:15-16`; proxy and route must both enforce the per-student setting. A new student path needs `studentRouteAccess.ts` and its route-list tests. Do not grant browser access to app_setting. A new menu value also requires server/menu contracts and applicable SQL checks; initial teacher-only integration under teaching can avoid an unnecessary enum/menu expansion.
4. **Database and strict readers precede writers.** `school_textbook` is a database enum requiring compatible Prisma clients before rows are emitted (`schema.prisma:33-37`; loader `:34-35`). Source catalog SQL has RLS and browser-role revocations (`20261007130100...:111-119`) and FK/check constraints. New tables need the same server-owned boundary. Prefer additive new tables/contracts over altering existing TestResult/ProblemAnswer semantics.
5. **Preserve all existing state meanings.** Missing gradingMode reads answers; missing absent reads false (`testresult.contract.ts:137-142`). Absent has null score and no answers, ungraded has no result. Unknown/unreviewed key must not become a wrong student response or a score of zero. Existing marks results cannot be treated as typed-response evidence. Homework checks are not FSRS reviews or mastery updates.
6. **Keep frozen content and stable identities.** Published snapshots, PDF bytes, source IDs/order, Problem.problemCode, old TestResult IDs and saved print layouts stay stable. An erratum creates a new key revision; old grades retain their original key and grader version. Regrading is an explicit new assessment linked to its predecessor, never a mutation of the student's original response.
7. **Print reader floor is already active.** AGENTS.md names smartSpacing reader commit `6b29db4ed`; saved missing field means false while new defaults are true. Do not turn this into a new layoutMode/spacing enum or silently reformat historical documents. Preset and arithmetic contracts have strict key validation.
8. **Do not touch SRS storage for this MVP.** AGENTS.md carries multiple production reader floors for follow-ups, list answers, guides and review variants. Commercial grading may later offer a separately authorized practice suggestion, but must not rewrite first-attempt correctness, credits or FSRS, redirect /learn, or replace StudentMathExplorers.
9. **New code must read installed Next docs first.** This audit writes no app code; implementation workers must follow the repository's Next-version warning. If later adding model-based verification/judgment, use the project TypeSafe skill and current docs then; no provider integration or live documentation lookup was designed/performed in this restricted audit. Deterministic comparison and calculations stay in code.

## 5. Gaps and integration risks, ordered for delivery

| Priority | Observed limitation / risk | Implementable action (proposal) |
|---|---|---|
| P0 | No commercial edition/exercise/key identity; existing SourceBook key can collapse product editions/series | Add explicit commercial editions and structured exercise addresses with immutable verified key revisions. Link to SourceBook only where genuinely the same source. |
| P0 | Answer-only exercise cannot be a valid shared Problem/TestProblem | Use separate exercise and assessment tables with optional verified bank linkage; do not invent stems, units, difficulty or family IDs. |
| P0 | No supplied coverage/rights inventory; historical school materials do not prove commercial keys | Pilot a named exact edition list and obtain official/authorized keys plus identifying front matter and errata; record capability-level usage grants. |
| P1 | No homework result/check persistence; authored assignments only grant access | Add assignment items/targets and student attempt/check records, distinguishing assignment due date from access expiry. |
| P1 | Existing grader is single-choice/teacher-score, not general math grading | MVP manual correctness with verified key reference; later explicit numeric/unit, choice-set and multipart grader specs with unsupported/manual states. |
| P1 | Retry plan has no saved notebook or completion linkage | Add immutable wrong-event reference plus mutable note/review state and persisted retry-session linkage. |
| P1 | Current retry planner reads live original bank metadata, whereas grading can read frozen snapshots (`planTestRetry.ts:59-91` vs `testProblemContent.ts:117-170`) | For commercial keys, pin original exercise/key/hash and verify bank equivalence before offering variants. Investigate old-bank-edit/frozen-grade behavior before claiming same-original retries. This is a static integration risk, not a reproduced production bug. |
| P1 | Two designated slots exist only for school_textbook source and matching child external IDs | Do not promise two variants for arbitrary commercial books. Show verified linked variants when present, or reference-based retry on the purchased book. Keep shortages visible. |
| P1 | Student QR assigned-solution policy can reveal full answer/solution on read | New submission DTO must omit keys, answers in alt text/hints and private review notes until the explicit release rule permits them. |
| P2 | Marks save appends full-roster results; no requestId/CAS in this request. Latest grade query orders only by takenAt, retry uses takenAt+id (`gradeSheet.ts:114-123`, `planTestRetry.ts:42-49`) | New incremental homework saves need per-target revision/idempotency and stable tie order. Consider a focused existing grading follow-up; do not expand this MVP into a silent old-results migration. |
| P2 | Retry endpoint checks wrong-ID membership, but completeness is checked in UI (`SavedRetryPanel.tsx:152-155`), not equivalent whole-result validation in the planner | New assignment service should enforce complete submission vs draft server-side; never rely on browser checks. Add a test for partial/duplicate historical records. |
| P2 | Generic export works from supplied document content and is not assignment provenance | Add server resolve/preflight keyed to notebook/assignment revision and artifact identity before rendering; preserve existing exporters. |
| P2 | No substantive wrong-note writing/reason/proof history; report wrong table has another purpose | Build a small separate correction view with teacher/student note ownership; do not change the summary-only report layout. |

## 6. Proposed MVP data and API design

Names below are proposals, not existing tables or routes. Choose final names once with the coordinator; keep `Textbook*` reserved for existing authored-book semantics.

### 6.1 Records and identity

- **WorkbookEdition**: stable edition UUID, series/title, publisher, author, grade/course, curriculum, semester when specified, publication year, edition/printing label, ISBN or publisher product ID (nullable, never fabricated), verified identity status and source evidence IDs. Same title is not identity. Record aliases separately for search.
- **WorkbookExercise**: editionId, stable exercise UUID, ordered location `(part/volume, chapter/section, printedPageLabel, exerciseLabel, subpartPath)`, display order and optional unit mapping. Preserve labels like 01, 1-1, 유제 3, ⑴ and repeated numbering. Optional `bankProblemId` requires an explicit verified mapping with content/key hash; it is not inferred solely from number or chapter.
- **WorkbookKeyRevision** and **WorkbookKeyItem**: source asset hash, source page/region, raw transcribed key, normalized answer spec, expected exercise/part identity, review status, reviewer/time, correction reason, immutable revision hash, supported grader version. Suggested states draft/needs-review/verified/withdrawn; only verified items can drive automatic judgment. Keep publisher key, independently derived candidate and teacher override as distinct evidence.
- **WorkbookAssignment**, **AssignmentTarget**, **AssignmentItem**: assigner/current scope, exact edition/key revision, selected ordered exercise IDs, class or explicit student targets, opensAt/dueAt/optional expiresAt, revocation, release policy, assignment revision. Freeze the initial recipient roster; reassignment adds/removes explicitly, while every access still validates current authorized enrollment. Record the original class context for historical access policy. An assignment is never implicitly a complete book or the current mutable page range.
- **WorkbookAttempt**, **WorkbookResponse**: target, ordinal, idempotency key/body hash, draft/submitted/reviewed state, raw response if actually entered, marks/manual/typed evidence mode, per-exercise explicit status, awarded/max points if scoring is configured, grader/key revision and submitted/reviewed times. Preserve unattempted, unavailable-key, pending-manual-review, correct, wrong, partial separately. Do not use TestResult.predictedScore for homework. Marks-first MVP can omit raw answer text while recording the teacher judgment accurately.
- **WrongNoteEntry**: student plus original assessment/response identity, exercise address/key revision and optional authorized content snapshot; first wrong event is immutable. Separate correction text, optional reason selected by the teacher/student, review status, reviewer and revision from the initial result. New failure on a later attempt is another event linked to the same exercise, not a duplicate of the first event nor an overwrite of it. For existing tests, optional source union references TestResult+ProblemAnswer; never remap a commercial UUID into problemId.
- **RetrySession/RetryItem** (next increment): original wrong entry, selected exact exercise/variant IDs and hashes, assigned/attempted/reviewed state, teacher/student result. Printable snapshot/artifact references record what was actually issued and its print options. Reusing a variant still creates a new attempt, not a second original grade.

Minimum uniqueness/checks: canonical exercise locator within edition; ordered subpart uniqueness; key item per revision/exercise; `(targetId, requestId)`; response per attempt/exercise/part; wrong event source identity; positive/finite score bounds and awarded <= max; only one current reviewed key revision pointer per edition while revisions remain immutable. For new private key/source assets use server-authenticated streaming, scoped owner/tenant policy and digest binding; don't put publisher PDFs in public figure paths by default.

### 6.2 API surface

Proposed teacher routes: `GET /api/workbooks?query=&grade=&cursor=`, `GET /api/workbooks/{editionId}/exercises`, restricted create/import/review/publish-key endpoints, `POST /api/workbook-assignments`, `GET /api/workbook-assignments/{id}`, `POST /api/workbook-assignments/{id}/results`, `POST .../revoke`, `GET /api/students/{id}/wrong-notes`, `PATCH /api/wrong-notes/{id}`, `POST /api/wrong-notes/print-plan`. Return explicit scope/count/revision and unavailable reasons, not silently filtered success.

Use strict request contracts and explicit actor gates. Query params/body cannot override ownership, reviewer identity or publication status. Results requests carry requestId, expectedAssignmentRevision and expectedTargetRevision; compute scores and wrong-entry links server-side in one transaction. Replays recheck current permissions then return the same saved result. Draft save and final submission must be separate actions; partial draft does not create scored wrong answers. Unknown keys mean manual review, not zero.

For imported key rows, a dry-run response should show total expected exercises, matched rows, ambiguous locations, missing keys, duplicate labels and conflicts with a previous revision. Finalize only exact reviewed row identities. Do not auto-fill missing keys with a solver output labeled publisher key. Mark an erratum revision and offer explicit impacted-attempt review; leave historic attempts intact.

Student endpoints are a later increment under an authenticated optional module. They derive student identity only from session, project a key-free exercise/assignment DTO and enforce release rules for every read/asset. A student submission is idempotent and race-tested; self-check is stored as self-check, never as verified automatic correctness.

### 6.3 Screen and print composition

Entry proposal: a teacher `teaching` subview for textbook homework/wrong notes, linked from a student or assignment, plus a separate authorized key-catalog management screen. Keep existing `/tests/{id}/grade` working and optionally offer “save to wrong notes” from its saved result. Do not replace the textbook-production menu with commercial catalog management or add a global menu without updating menu contracts and grants.

Teacher flow: **edition → pages/questions → recipients and due date → grading/check → wrong-note selection → print**. Show cover/edition/ISBN identity and actual verified-key coverage. Make reference-only, printable-original, and verified-variant capabilities visible per item. A reference-only correction sheet can show book/page/question, writing space and teacher-selected instructions without reproducing an unavailable stem; it must not look like a complete question sheet. Full-content output can use the common StudioProblem/WorksheetEditor adapter once content/rights and hashes resolve. Teacher answer-key output is a separately chosen mode, never part of the default student sheet.

Follow DESIGN.md: current Math workroom tokens, WorkspacePageHeader and Workroom.module.css; one owner of outer padding; 44px controls; visible noncolor states; list/detail with responsive stacking; retain input after errors/conflicts and before leaving; explicit student selection. Existing grade route's AppChrome and print/student exceptions stay intact (`menu map:140-147`, `DESIGN.md:22-30,144-193,251-255,422-426`). Use existing six print templates and measured pagination. If adding persisted correction-sheet content, define a dedicated rendering adapter instead of stuffing a fake bank question into an unknown saved-document kind.

## 7. Answer-key sourcing requirements

The coordinator's Mathflat/Matholic browser observations may refine UX; this worker did not inspect those services and makes no claim about their book coverage, API availability or rights. A competitor having a key is not a source asset for our application.

For each pilot edition, the content owner needs to provide or authorize access to: (1) cover/title/colophon or publisher product metadata proving exact edition; (2) full problem numbering/page map including volumes and repeated sections; (3) official answer/solution material or a clearly identified teacher-authored key; (4) current errata; (5) which uses are permitted—internal key display, student answer release, problem-image display, printing original questions, redistribution, solution display, and variant creation; (6) who can review conflicts. This is a sourcing/product requirement, not a legal determination made by this audit.

Recommended pilot: one or two exact high-use editions and a deliberately mixed sample including numeric, choice, multipart, diagram, proof and repeated numbering. Prefer publisher-structured CSV/XLSX/JSON if available; otherwise import the authorized original PDF/HWP/HWPX/images through staging. Do not assume one extractor fits all publishers. Store raw bytes/hash and page/region provenance separately from normalized answers. A two-person deterministic audit can verify every pilot answer/address pair against the supplied material; ambiguous/missing cells remain unavailable. Independent solving can flag a conflict but cannot silently replace publisher evidence.

A key-only catalog can support teacher grading and reference sheets before full question content is available. It cannot by itself support verbatim question reprint, faithful variant generation, diagram reproduction or reliable skill mapping. Each capability needs separate evidence and review. Do not promise “all commercial textbooks,” universal auto-marking, two variants per exercise, or measured learning gains from this code base.

## 8. Realistic implementation sequence and completion gates

Effort below is a planning estimate for experienced developers and a separate content reviewer, not measured velocity or a delivery promise. Data sourcing/review can dominate elapsed time. Parallel work belongs in the coordinator's authorized external workspace; this audit creates no new sessions.

| Phase | Work / likely effort | Acceptance gate |
|---|---|---|
| 0 — Scope and pilot assets | 1–3 developer days plus sourcing lead time: finalize exact editions, teacher marks-first flow, grading/release policy, reference-vs-original output; write contracts and fixtures | Exact edition and exercise locator examples, mixed key fixtures, permission matrix and missing-capability behavior agreed; no claim based only on catalog title. |
| 1 — Additive reader/domain layer | 3–5 days: new models, SQL checks/RLS and indexes, read adapters and key-free DTOs; old routes untouched | Old fixtures parse unchanged; new table readers work with missing/new fields; cross-branch and stale/current enrollment tests; migration reviewed/applied only by authorized DB track, then reader delivery verified before enabling writers. |
| 2 — Catalog/key import and review | 4–7 days plus human verification: manual/structured import, dry-run report, provenance, collision review, immutable publish/errata | Reimport idempotent; repeated numbers and subparts resolve unambiguously; unresolved keys cannot auto-grade; verified coverage and provenance inspectable. Can run in parallel with UI fixtures after Phase 1 contracts. |
| 3 — Teacher assignments and marks | 4–6 days: range picker, frozen targets/items, due dates, partial drafts, explicit submission/review, atomic results and wrong-entry creation | One pilot class completes assignment → teacher check → saved wrong list; no fake answers/absence zeros; duplicate request/retry creates no extra result; student transfer and revocation enforced. |
| 4 — Wrong-note and print MVP | 3–5 days: student history/filter, correction notes, existing-TestResult adapter, reference-sheet adapter and authorized full-content WorksheetEditor output | Saved entry round-trip, permissions, fixed source/result/key identity, correct student/teacher answer separation and page breaks; PDF/HWPX exact counts/labels. This completes the initial MVP. |
| 5 — Supported auto-grading and student input | 5–10 days: explicit per-part specs, numeric/unit/choice-set graders, manual-review fallback, student optional-menu integration and release rules | Golden/mutation fixtures reject near misses and ambiguous equivalence; no key before release; stale-session and double-submit safety; old SRS behavior unchanged. |
| 6 — Persistent retry and operations | 3–6 days: verified variant mapping/shortfalls, retry sessions and history, saved output artifacts, error queues and selected metrics | Original wrong event preserved; a retry outcome links exactly once; missing licensed content or variant remains visible; rollback disables writers without older incompatible readers. |

A practical first useful delivery is Phases 0–4, roughly **3–5 engineering weeks** with limited catalog and available verified assets; student auto-grading and broad content expansion are additional work. Avoid claiming a one-day integration just because the print and marks table already exist. For an immediate engineering start, establish reader/contract fixtures and teacher-only reference sheet behavior without any unauthorized content acquisition or shared DB writer activation.

Suggested independent tracks after contracts settle: domain/API/auth, catalog/import/review tools, teacher UI/print, verification/content QA. Keep schema ownership single and merge reader work before writers. Shared mutable source files should have one owner. The coordinator already owns competitor research and external worktree placement.

## 9. Existing tests to retain and new tests required

**Inspected existing test evidence (not run in this audit):**

- `src/__tests__/api/gradingInput.test.ts:110-154,167-317,320-380,383-439,442-518`: roster/results, full marks rows, absence null/no analyses, atomic rejection, corrections and ownership.
- `src/__tests__/components/GradeSheet.test.tsx:186-324,356-425`: explicit states, no bulk fake completion, incomplete save blocking, saved state/errors.
- `src/__tests__/unit/gradingContract.test.ts:53-94,107-165`; `src/__tests__/unit/gradeAnswers.test.ts:30-97`: legacy defaults, strict inputs, single circled choice and refusal to treat one member of a multiple answer as correct.
- `src/__tests__/api/testRetry.test.ts:143-453`: direct parent/slot/unit requirements, shortage, eligibility changed during read, correct result/student/test authorization, absence/draft protection and no writes.
- `src/__tests__/unit/planRetry.test.ts:61-473`, `textbookSlots.test.ts`: school original pairs, general family folding/fallback, exclusions and deterministic seeds.
- `src/__tests__/components/SavedRetryPanel.test.tsx:58-113,179-237,300-371`: saved ID, missing slots block output, dirty marks, stale responses, save-then-reread failures and exact figure/content transfer.
- `src/__tests__/unit/textbookTestProblemContent.test.ts`, `textbookTestFrozenFlow.test.ts`, `textbookTestSnapshotAssets.test.ts`: frozen-source integration regression surface.
- `src/__tests__/api/textbookRoutes.test.ts:174-322,492-669,794-843`, `textbookRouteWalk.test.ts`, `src/__tests__/unit/textbookDdlLifecycle.test.ts`, `textbookDdlReferences.test.ts`, `textbookDdlPublish.test.ts`, `textbookSqlStatements.test.ts`, `textbookManagedRefresh.test.ts`: strict bodies, foreign owner/share state, revisions, import identities, lifecycle and SQL invariants. Some DDL suites use PGlite test helpers; these are not proof of a live migration.
- `src/__tests__/unit/textbookStudentRoutes.test.ts:218-345,366-493,515-631`, `textbookStudentRead.test.ts`, `textbookStudentProjection.test.ts`, `textbookStudentAttemptsSql.test.ts`, `studentLearningMenus.test.ts`, `src/__tests__/api/studentLearningMenusManagement.test.ts`: session identity, changed accounts, cross-origin/strict JSON, revoked access, key-free DTOs and asset isolation.
- `src/__tests__/integration/sourceMaterialMigration.test.ts`, `src/__tests__/unit/schoolTextbookSourceMeta.test.ts`, `schoolTextbookCheckKey.test.ts`, `schoolTextbookRefreshPlan.test.ts`; Python `scripts/import/textbook/test_*.py`, `review/test_collect.py`, `final-check/test_check_collect.py`: source metadata/migration and extraction/review correspondence.
- `src/__tests__/components/TestPrint.test.tsx`, `WorksheetPrint.preview.test.tsx`, `PrintOptionsPanel.test.tsx`, `AnswerKeys.test.tsx`, `smartPrintSpacing.test.tsx`; unit `printSpacingReader.test.ts`, `printPresetContract.test.ts`, `answerKeyLayout.test.ts`, `answerKeyOverflow.test.ts`, `toPrintProblem.test.ts`, `exportPerMenu.test.ts`, `worksheetProvenance.test.ts`; export tests inventoried below: print formatting, saved-option compatibility, answer pages, source resolution and authorization surfaces.

**New focused acceptance suite:**

1. Identity: same title/different year or semester; ISBN absent; two page-1s in different volumes; repeated question numbers; exercise 1 and subparts ⑴/⑵; leading zeros; one-to-many subparts; missing rows; duplicate import; changed PDF hash; verified bank link changes.
2. Grading: manual marks don't fabricate raw answers; correct/wrong/unattempted/pending are distinct; exact fractions/mixed numbers/decimal units; dimension mismatch; ordered vs unordered answers; duplicate members; single vs multiple choices; algebra/proof/diagram unsupported -> review; wrong key revised -> original attempt preserved and explicit new judgment.
3. Concurrency: duplicate request same body same result; different body same request -> conflict; stale assignment/target/key revision; student switched account mid-request; parallel teacher edits; partial save vs final submission; stable latest ordering and failed transaction leaves no wrong-note orphan.
4. Access: cross-branch staff, read-only staff, textbook owner without target-class rights, revoked/expired assignment, student transfer/multiple enrollments, disabled account/menu, unauthorized key/asset/print and crafted resultId; fresh checks on replay. Browser roles cannot read new keys/results directly.
5. Notes/retries: automatic wrong-entry upsert exact event identity; correction doesn't erase first failure; repeated wrong exercise links history; completed note can be reopened by a later failed attempt; allowed/unavailable variant shown honestly; reference-only mode not promoted to full original print.
6. Output/UI: reference/edition/page/part labels exact; no duplicate/drop/reorder of required pair; long multipart answer wraps; tall figures and blank writing area; student key hidden by default; teacher answer pages explicit; print/PDF/HWPX consistency; changed revision blocks export; responsive 320/390/760/1050/1280/1920 and keyboard/IME/error/unsaved states per DESIGN.md.
7. Compatibility: all existing grading/retry/textbook snapshot tests; original menus; old smartSpacing missing field; archived PDF bytes; homework unavailable vs zero checked days; no mutation of StudentSrsState/Progress by workbook submission.

Use targeted project test commands when implementing, for example `npm run test:raw -- src/__tests__/api/gradingInput.test.ts src/__tests__/api/testRetry.test.ts src/__tests__/components/SavedRetryPanel.test.tsx` plus new suites. Inspect test setup first and ensure local/mock-only configuration; do not run DB scripts, provider calls or browser fixtures against shared services implicitly. This worker deliberately ran no tests because the task only authorized report writes and forbade DB/browser activity.

## 10. Remaining decisions and handoff

Coordinator needs to settle initial edition list and sourcing owner, catalog editing/sharing scope, mark granularity (exercise or separately scored subpart), student answer-release rule, and whether MVP outputs reference-only or licensed full questions. Defaults recommended here are teacher-only, marks-first, explicit subpart address, reference-only unless content is verified, and no SRS linkage. These are proposals, not claims of prior user approval.

Before implementation, refresh the target branch and compare against this HEAD; this report cannot certify later merges. Before every eventual push follow AGENTS.md's fetch-and-integrate rule. The dispatched audit has no changes to merge and should not remove its active worktree; the coordinator owns completion/release. All material findings are in this report, with the complete relevant-file inventory below for concrete ownership and follow-up.

## Appendix A — Related-file inventory at audited HEAD

Inventory contains **1174 source, style, schema, migration, test and tool files**. All paths below exist in this checkout; `:1` is an entrypoint anchor, not a claim that the first line proves a behavior. The evidence sections above give precise implementation/test locations. Whole domain folders include supporting render/export/test infrastructure to prevent missed handoffs; some shared print regression files cover English as well. Generated content JSON, binary figures, historical captures and thousands of report artifacts are intentionally not enumerated as application code. Read relevant linked docs for those provenance datasets. Operator tools listed here were not executed.

### Contracts and persisted schema (26)

- `src/contracts/accountAccess.contract.ts:1`
- `src/contracts/achievement.contract.ts:1`
- `src/contracts/bankSource.contract.ts:1`
- `src/contracts/basket.contract.ts:1`
- `src/contracts/common.contract.ts:1`
- `src/contracts/examReport.contract.ts:1`
- `src/contracts/printPreset.contract.ts:1`
- `src/contracts/privateWorkspace.contract.ts:1`
- `src/contracts/problem.contract.ts:1`
- `src/contracts/retry.contract.ts:1`
- `src/contracts/sourceMaterial.contract.ts:1`
- `src/contracts/studentLearningMenus.contract.ts:1`
- `src/contracts/test.contract.ts:1`
- `src/contracts/testConsole.contract.ts:1`
- `src/contracts/testresult.contract.ts:1`
- `src/contracts/textbook.contract.ts:1`
- `src/contracts/textbookBlank.contract.ts:1`
- `src/contracts/textbookConcept.contract.ts:1`
- `src/contracts/textbookConceptCatalog.contract.ts:1`
- `src/contracts/textbookExchange.contract.ts:1`
- `src/contracts/textbookPrimitives.contract.ts:1`
- `src/contracts/textbookQuickCreate.contract.ts:1`
- `src/contracts/textbookSemantic.contract.ts:1`
- `src/contracts/textbookServer.contract.ts:1`
- `src/contracts/textbookStudent.contract.ts:1`
- `src/contracts/workspaceWorkflow.contract.ts:1`

### Teacher/student routes and pages (97)

- `src/app/(main)/exam-reports/[testId]/page.tsx:1`
- `src/app/(main)/tests/[id]/grade/page.tsx:1`
- `src/app/(main)/tests/[id]/page.tsx:1`
- `src/app/(main)/tests/[id]/print/loading.tsx:1`
- `src/app/(main)/tests/[id]/print/page.tsx:1`
- `src/app/(main)/tests/new/loading.tsx:1`
- `src/app/(main)/tests/new/page.tsx:1`
- `src/app/(main)/textbook/editions/[editionId]/concepts/[conceptKey]/blank/page.tsx:1`
- `src/app/(main)/textbook/editions/[editionId]/concepts/[conceptKey]/blank/print.module.css:1`
- `src/app/api/exam-reports/[testId]/print/route.ts:1`
- `src/app/api/exam-reports/[testId]/route.ts:1`
- `src/app/api/exam-reports/[testId]/settings/route.ts:1`
- `src/app/api/exam-reports/[testId]/students/[studentId]/confirm/route.ts:1`
- `src/app/api/exam-reports/[testId]/students/[studentId]/pdf/route.ts:1`
- `src/app/api/exam-reports/[testId]/students/[studentId]/route.ts:1`
- `src/app/api/exports/hwpx/route.ts:1`
- `src/app/api/exports/pdf/route.ts:1`
- `src/app/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/attempts/route.ts:1`
- `src/app/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/review/route.ts:1`
- `src/app/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/route.ts:1`
- `src/app/api/learn/textbook/q/[slug]/assets/[assetId]/route.ts:1`
- `src/app/api/learn/textbook/q/[slug]/route.ts:1`
- `src/app/api/studio/ai/route.ts:1`
- `src/app/api/studio/exam-conditions/[conditionId]/route.ts:1`
- `src/app/api/studio/exam-conditions/route.ts:1`
- `src/app/api/studio/overview/route.ts:1`
- `src/app/api/studio/pdf-assets/[kind]/[filename]/route.ts:1`
- `src/app/api/studio/pdf-worker/route.ts:1`
- `src/app/api/studio/print-presets/[presetId]/route.ts:1`
- `src/app/api/studio/print-presets/route.ts:1`
- `src/app/api/studio/problems/[id]/route.ts:1`
- `src/app/api/studio/problems/check/route.ts:1`
- `src/app/api/studio/problems/labels/route.ts:1`
- `src/app/api/studio/problems/random/route.ts:1`
- `src/app/api/studio/problems/route.ts:1`
- `src/app/api/studio/problems/sources/route.ts:1`
- `src/app/api/studio/problems/textbook-slots/route.ts:1`
- `src/app/api/studio/teaching/route.ts:1`
- `src/app/api/tests/[id]/confirm/route.ts:1`
- `src/app/api/tests/[id]/grade/route.ts:1`
- `src/app/api/tests/[id]/print/route.ts:1`
- `src/app/api/tests/[id]/problems/[seq]/route.ts:1`
- `src/app/api/tests/[id]/results/[studentId]/route.ts:1`
- `src/app/api/tests/[id]/results/route.ts:1`
- `src/app/api/tests/[id]/retry/route.ts:1`
- `src/app/api/tests/[id]/route.ts:1`
- `src/app/api/tests/[id]/scores/route.ts:1`
- `src/app/api/tests/[id]/submit/route.ts:1`
- `src/app/api/tests/auto-draft/cron/route.ts:1`
- `src/app/api/tests/daily-review/route.ts:1`
- `src/app/api/tests/default-range/route.ts:1`
- `src/app/api/tests/generate/route.ts:1`
- `src/app/api/tests/predicted/route.ts:1`
- `src/app/api/tests/route.ts:1`
- `src/app/api/textbook/bindings/[bindingId]/route.ts:1`
- `src/app/api/textbook/books/[bookId]/editions/route.ts:1`
- `src/app/api/textbook/books/[bookId]/route.ts:1`
- `src/app/api/textbook/books/route.ts:1`
- `src/app/api/textbook/concept-attempts/[attemptId]/review/route.ts:1`
- `src/app/api/textbook/concept-lectures/route.ts:1`
- `src/app/api/textbook/concepts/catalog/route.ts:1`
- `src/app/api/textbook/concepts/lookup/route.ts:1`
- `src/app/api/textbook/concepts/targets/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/artifacts/[artifactId]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/assets/[assetId]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/assignments/[assignmentId]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/assignments/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/attempts/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/blank/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/concepts/[conceptKey]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/concepts/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/export/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/items/[itemId]/diff/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/items/[itemId]/link/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/items/[itemId]/recapture/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/items/[itemId]/register/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/items/[itemId]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/items/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/pdf/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/publish/[requestId]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/publish/finalize/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/publish/preflight/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/publish/reserve/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/publish/steps/next/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/reissue/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/sections/[sectionId]/preview/route.ts:1`
- `src/app/api/textbook/editions/[editionId]/sections/[sectionId]/route.ts:1`
- `src/app/api/textbook/imports/route.ts:1`
- `src/app/api/textbook/quick-create/route.ts:1`
- `src/app/api/textbook/snapshots/[snapshotId]/bindings/route.ts:1`
- `src/app/api/textbook/students/[studentId]/concept-evidence/route.ts:1`
- `src/app/api/textbook/uploads/[sha256]/complete/route.ts:1`
- `src/app/api/textbook/uploads/[sha256]/route.ts:1`
- `src/app/api/textbook/videos/route.ts:1`
- `src/app/learn/textbook/[editionId]/concepts/[conceptKey]/page.tsx:1`
- `src/app/q/[slug]/page.tsx:1`

### Domain, authorization, data-access and import libraries (308)

- `src/lib/accountAccess.ts:1`
- `src/lib/achievement/collect.ts:1`
- `src/lib/achievement/load.ts:1`
- `src/lib/achievement/maxScore.ts:1`
- `src/lib/achievement/period.ts:1`
- `src/lib/achievement/reportAreas.ts:1`
- `src/lib/achievement/resultSelect.ts:1`
- `src/lib/achievement/sentences.ts:1`
- `src/lib/achievement/types.ts:1`
- `src/lib/bankReadCache.ts:1`
- `src/lib/bankReadFingerprint.ts:1`
- `src/lib/bankReadiness.ts:1`
- `src/lib/bankSourceAvailability.ts:1`
- `src/lib/bankSourceCounts.ts:1`
- `src/lib/bankSourceQuestions.ts:1`
- `src/lib/bankSourceRoute.ts:1`
- `src/lib/classAccess.ts:1`
- `src/lib/examPublication/freeze.ts:1`
- `src/lib/examPublication/server.ts:1`
- `src/lib/examReport/blocks.ts:1`
- `src/lib/examReport/build.ts:1`
- `src/lib/examReport/confirmedSource.ts:1`
- `src/lib/examReport/http.ts:1`
- `src/lib/examReport/paperHtml.ts:1`
- `src/lib/examReport/problems.ts:1`
- `src/lib/examReport/read.ts:1`
- `src/lib/examReport/score100.ts:1`
- `src/lib/examReport/server.ts:1`
- `src/lib/examReport/settings.ts:1`
- `src/lib/examReport/storage.ts:1`
- `src/lib/examReport/styledReportDom.ts:1`
- `src/lib/examReport/trend.ts:1`
- `src/lib/examReport/wrongTable.ts:1`
- `src/lib/examReport/wrongTableDom.ts:1`
- `src/lib/export/hwpxClient.ts:1`
- `src/lib/export/hwpxLayout.ts:1`
- `src/lib/export/hwpxServer.ts:1`
- `src/lib/export/hwpxZip.ts:1`
- `src/lib/export/pdfClient.ts:1`
- `src/lib/export/pdfLimits.ts:1`
- `src/lib/export/pdfServer.ts:1`
- `src/lib/export/request.ts:1`
- `src/lib/figurePrintSize.ts:1`
- `src/lib/generator/familyKey.ts:1`
- `src/lib/generator/planRetry.ts:1`
- `src/lib/generator/seededRandom.ts:1`
- `src/lib/generator/textbookSlots.ts:1`
- `src/lib/import/convertRpm.ts:1`
- `src/lib/import/schoolTextbook/angleAnswerNotation.ts:1`
- `src/lib/import/schoolTextbook/checkKey.ts:1`
- `src/lib/import/schoolTextbook/codexRetry.types.ts:1`
- `src/lib/import/schoolTextbook/codexRetryBatch.types.ts:1`
- `src/lib/import/schoolTextbook/codexRetryBatchQualification.ts:1`
- `src/lib/import/schoolTextbook/codexRetryBatchReview.ts:1`
- `src/lib/import/schoolTextbook/codexRetryCaseQualification.ts:1`
- `src/lib/import/schoolTextbook/codexRetryQualification.ts:1`
- `src/lib/import/schoolTextbook/codexRetryReview.ts:1`
- `src/lib/import/schoolTextbook/dbRetry.types.ts:1`
- `src/lib/import/schoolTextbook/dbRetryFigures.ts:1`
- `src/lib/import/schoolTextbook/dbRetryGeneration.ts:1`
- `src/lib/import/schoolTextbook/dbRetryQualification.ts:1`
- `src/lib/import/schoolTextbook/dbRetryQualificationRows.ts:1`
- `src/lib/import/schoolTextbook/dbRetryReview.ts:1`
- `src/lib/import/schoolTextbook/dbRetryReviewBinding.ts:1`
- `src/lib/import/schoolTextbook/designatedSlotLocks.ts:1`
- `src/lib/import/schoolTextbook/domainRangeAnswerNotation.ts:1`
- `src/lib/import/schoolTextbook/figurePlacement.ts:1`
- `src/lib/import/schoolTextbook/hwpNotation.ts:1`
- `src/lib/import/schoolTextbook/intervalAnswerNotation.ts:1`
- `src/lib/import/schoolTextbook/neutralNames.ts:1`
- `src/lib/import/schoolTextbook/positiveRadicalAnswerNotation.ts:1`
- `src/lib/import/schoolTextbook/qualification.ts:1`
- `src/lib/import/schoolTextbook/recovery.ts:1`
- `src/lib/import/schoolTextbook/refreshPlan.ts:1`
- `src/lib/import/schoolTextbook/retryPairPlan.ts:1`
- `src/lib/import/schoolTextbook/scalarAnswerNotation.ts:1`
- `src/lib/import/schoolTextbook/slotCensus.ts:1`
- `src/lib/import/schoolTextbook/sourceMeta.ts:1`
- `src/lib/import/schoolTextbook/unsplitWords.ts:1`
- `src/lib/import/schoolTextbook/variantPairGenerators.ts:1`
- `src/lib/import/schoolTextbook/variants.ts:1`
- `src/lib/import/schoolTextbook/variantsCalculus.ts:1`
- `src/lib/import/schoolTextbook/variantsGeometry.ts:1`
- `src/lib/learn/studentLearningMenuPolicy.ts:1`
- `src/lib/learn/studentLearningMenusStore.ts:1`
- `src/lib/math-srs/elementary/answerForms.ts:1`
- `src/lib/math-srs/elementary/answers.ts:1`
- `src/lib/math-srs/elementary/types.ts:1`
- `src/lib/math-srs/sharedAnswers.ts:1`
- `src/lib/mathgen/answers.ts:1`
- `src/lib/mathgen/blocksToMarkdown.ts:1`
- `src/lib/mathgen/contentParser.ts:1`
- `src/lib/mathgen/contracts.ts:1`
- `src/lib/mathgen/mathDefense.ts:1`
- `src/lib/mathgen/ocr.ts:1`
- `src/lib/mathgen/ocrCropQuality.ts:1`
- `src/lib/mathgen/ocrJsonRecovery.ts:1`
- `src/lib/mathgen/ocrRecovery.ts:1`
- `src/lib/mathgen/prompts.ts:1`
- `src/lib/mathgen/solutionValidator.ts:1`
- `src/lib/mathgen/sourcePrompts.ts:1`
- `src/lib/mathgen/textLayerValidator.ts:1`
- `src/lib/missingAnswer.ts:1`
- `src/lib/ownerScope.ts:1`
- `src/lib/ownership.ts:1`
- `src/lib/print/descriptive.ts:1`
- `src/lib/print/examRuler.ts:1`
- `src/lib/print/packColumns.ts:1`
- `src/lib/print/packExamPaper.ts:1`
- `src/lib/print/pastPaperLayout.ts:1`
- `src/lib/print/toPrintProblem.ts:1`
- `src/lib/printGeometry.ts:1`
- `src/lib/printImageDimensions.ts:1`
- `src/lib/printLayout.ts:1`
- `src/lib/printOverflow.ts:1`
- `src/lib/printPack.ts:1`
- `src/lib/printPresets.ts:1`
- `src/lib/privateAssets.ts:1`
- `src/lib/privateDocumentActions.ts:1`
- `src/lib/privateDocumentList.ts:1`
- `src/lib/privateDocumentTags.ts:1`
- `src/lib/privateDocumentWorkflow.ts:1`
- `src/lib/privateWorkspace.ts:1`
- `src/lib/problemEligibility.ts:1`
- `src/lib/problemPool.ts:1`
- `src/lib/serializers.ts:1`
- `src/lib/session.ts:1`
- `src/lib/studentRouteAccess.ts:1`
- `src/lib/studio-ai/api.ts:1`
- `src/lib/studio-ai/endpoints.ts:1`
- `src/lib/studio-ai/errors.ts:1`
- `src/lib/studio-ai/execute.ts:1`
- `src/lib/studio-ai/guard.ts:1`
- `src/lib/studio-ai/handler.ts:1`
- `src/lib/studio-ai/http.ts:1`
- `src/lib/studio-ai/limits.ts:1`
- `src/lib/studio-ai/retry.ts:1`
- `src/lib/studio-ai/routing.ts:1`
- `src/lib/studio-ai/teaching.ts:1`
- `src/lib/testResults/buildAnalysisReport.ts:1`
- `src/lib/testResults/gradeAnswers.ts:1`
- `src/lib/testResults/gradeMarks.ts:1`
- `src/lib/testResults/gradeSheet.ts:1`
- `src/lib/testResults/scoreRollup.ts:1`
- `src/lib/testResults/submitTestResult.ts:1`
- `src/lib/tests/autoDraftOwner.ts:1`
- `src/lib/tests/autoDraftScope.ts:1`
- `src/lib/tests/constants.ts:1`
- `src/lib/tests/draftCapacity.ts:1`
- `src/lib/tests/essayLabels.ts:1`
- `src/lib/tests/generalTests.ts:1`
- `src/lib/tests/generateDraftTest.ts:1`
- `src/lib/tests/loadSnapshotAssets.ts:1`
- `src/lib/tests/loadTestProblems.ts:1`
- `src/lib/tests/planTestRetry.ts:1`
- `src/lib/tests/recentProblemIds.ts:1`
- `src/lib/tests/replaceTestProblem.ts:1`
- `src/lib/tests/retryCandidates.ts:1`
- `src/lib/tests/runAutoDraft.ts:1`
- `src/lib/tests/selectionCurrent.ts:1`
- `src/lib/tests/testProblemContent.ts:1`
- `src/lib/textbook/access.ts:1`
- `src/lib/textbook/activities.ts:1`
- `src/lib/textbook/archive/mappingCsv.ts:1`
- `src/lib/textbook/archive/package.server.ts:1`
- `src/lib/textbook/archive/zip.ts:1`
- `src/lib/textbook/assets.ts:1`
- `src/lib/textbook/canonical.ts:1`
- `src/lib/textbook/characters.ts:1`
- `src/lib/textbook/client.ts:1`
- `src/lib/textbook/conceptQuestions.ts:1`
- `src/lib/textbook/conceptRows.ts:1`
- `src/lib/textbook/conceptScripts.ts:1`
- `src/lib/textbook/conceptTargetCatalog.ts:1`
- `src/lib/textbook/concepts.ts:1`
- `src/lib/textbook/coreConceptBank.ts:1`
- `src/lib/textbook/frozenBlank.ts:1`
- `src/lib/textbook/hash.browser.ts:1`
- `src/lib/textbook/hash.server.ts:1`
- `src/lib/textbook/integrity.server.ts:1`
- `src/lib/textbook/layout/paginate.ts:1`
- `src/lib/textbook/layout/sourceWritingSpace.ts:1`
- `src/lib/textbook/navigation.ts:1`
- `src/lib/textbook/publish/codexRenderer.ts:1`
- `src/lib/textbook/publish/deps.server.ts:1`
- `src/lib/textbook/publish/finalize.ts:1`
- `src/lib/textbook/publish/job.ts:1`
- `src/lib/textbook/publish/preflight.ts:1`
- `src/lib/textbook/publish/rendererAdapter.ts:1`
- `src/lib/textbook/publish/reserve.ts:1`
- `src/lib/textbook/publish/step.ts:1`
- `src/lib/textbook/quickCreateClient.ts:1`
- `src/lib/textbook/references.ts:1`
- `src/lib/textbook/render/answerLayout.ts:1`
- `src/lib/textbook/render/blocks/automaticIntro.ts:1`
- `src/lib/textbook/render/blocks/bankActivities.ts:1`
- `src/lib/textbook/render/blocks/concept.ts:1`
- `src/lib/textbook/render/blocks/contentCss.ts:1`
- `src/lib/textbook/render/blocks/dialogue.ts:1`
- `src/lib/textbook/render/blocks/dialogueCss.ts:1`
- `src/lib/textbook/render/blocks/fractionChoiceRows.ts:1`
- `src/lib/textbook/render/blocks/front.ts:1`
- `src/lib/textbook/render/blocks/problem.ts:1`
- `src/lib/textbook/render/blocks/recall.ts:1`
- `src/lib/textbook/render/blocks/semantic.ts:1`
- `src/lib/textbook/render/blocks/shared.ts:1`
- `src/lib/textbook/render/browser.ts:1`
- `src/lib/textbook/render/bundle.server.ts:1`
- `src/lib/textbook/render/conceptParts.ts:1`
- `src/lib/textbook/render/dialoguePageProgress.ts:1`
- `src/lib/textbook/render/editorial.ts:1`
- `src/lib/textbook/render/editorialAssets.ts:1`
- `src/lib/textbook/render/editorialCss.ts:1`
- `src/lib/textbook/render/editorialProjection.ts:1`
- `src/lib/textbook/render/html.ts:1`
- `src/lib/textbook/render/markdown.ts:1`
- `src/lib/textbook/render/model.ts:1`
- `src/lib/textbook/render/pageReferences.ts:1`
- `src/lib/textbook/render/printCheck.ts:1`
- `src/lib/textbook/render/qr.server.ts:1`
- `src/lib/textbook/render/qrVerify.server.ts:1`
- `src/lib/textbook/render/recoveryFrameCss.ts:1`
- `src/lib/textbook/render/recoveryMeasurement.ts:1`
- `src/lib/textbook/render/server.ts:1`
- `src/lib/textbook/render/slotCut.ts:1`
- `src/lib/textbook/render/sourceActivityCss.ts:1`
- `src/lib/textbook/render/sourceChapterCss.ts:1`
- `src/lib/textbook/render/sourceProblemCss.ts:1`
- `src/lib/textbook/render/sourceQuestionRows.ts:1`
- `src/lib/textbook/render/sourceWriting.ts:1`
- `src/lib/textbook/render/versions.ts:1`
- `src/lib/textbook/restStories.ts:1`
- `src/lib/textbook/scripts/README.md:1`
- `src/lib/textbook/scripts/aiReadings.ts:1`
- `src/lib/textbook/scripts/authoredExampleReview.ts:1`
- `src/lib/textbook/scripts/authoredExamples.ts:1`
- `src/lib/textbook/scripts/corrections.ts:1`
- `src/lib/textbook/scripts/materialize.ts:1`
- `src/lib/textbook/scripts/mathCheck.ts:1`
- `src/lib/textbook/scripts/normalizeV15.ts:1`
- `src/lib/textbook/scripts/roleMentions.ts:1`
- `src/lib/textbook/scripts/sourceLedger.ts:1`
- `src/lib/textbook/scripts/templateReview.ts:1`
- `src/lib/textbook/scripts/types.ts:1`
- `src/lib/textbook/semanticAssets.ts:1`
- `src/lib/textbook/semanticRefs.ts:1`
- `src/lib/textbook/server/assignments.ts:1`
- `src/lib/textbook/server/authorize.ts:1`
- `src/lib/textbook/server/blobs.ts:1`
- `src/lib/textbook/server/books.ts:1`
- `src/lib/textbook/server/bytes.ts:1`
- `src/lib/textbook/server/conceptRows.ts:1`
- `src/lib/textbook/server/editions.ts:1`
- `src/lib/textbook/server/errors.ts:1`
- `src/lib/textbook/server/exchange.ts:1`
- `src/lib/textbook/server/exportEdition.ts:1`
- `src/lib/textbook/server/figureBytes.ts:1`
- `src/lib/textbook/server/http.ts:1`
- `src/lib/textbook/server/imports.ts:1`
- `src/lib/textbook/server/itemLink.ts:1`
- `src/lib/textbook/server/itemRegister.ts:1`
- `src/lib/textbook/server/items.ts:1`
- `src/lib/textbook/server/lectureRefs.ts:1`
- `src/lib/textbook/server/operationalScope.ts:1`
- `src/lib/textbook/server/prismaSql.ts:1`
- `src/lib/textbook/server/quickCreate.ts:1`
- `src/lib/textbook/server/quickCreate/availability.ts:1`
- `src/lib/textbook/server/quickCreate/conceptRecall.ts:1`
- `src/lib/textbook/server/quickCreate/contents.ts:1`
- `src/lib/textbook/server/quickCreate/context.ts:1`
- `src/lib/textbook/server/quickCreate/dialogue.ts:1`
- `src/lib/textbook/server/quickCreate/errorCheck.ts:1`
- `src/lib/textbook/server/quickCreate/frontMatter.ts:1`
- `src/lib/textbook/server/quickCreate/indexes.ts:1`
- `src/lib/textbook/server/quickCreate/lessonSections.ts:1`
- `src/lib/textbook/server/quickCreate/preparation.ts:1`
- `src/lib/textbook/server/quickCreate/problemStages.ts:1`
- `src/lib/textbook/server/quickCreate/rest.ts:1`
- `src/lib/textbook/server/quickCreate/unitIntro.ts:1`
- `src/lib/textbook/server/quickCreate/visuals.ts:1`
- `src/lib/textbook/server/quickCreateRecovery.ts:1`
- `src/lib/textbook/server/reissue.ts:1`
- `src/lib/textbook/server/requests.ts:1`
- `src/lib/textbook/server/sectionPreview.ts:1`
- `src/lib/textbook/server/sections.ts:1`
- `src/lib/textbook/server/sql.ts:1`
- `src/lib/textbook/server/sqlAdapter.ts:1`
- `src/lib/textbook/server/videos.ts:1`
- `src/lib/textbook/server/visualLibrary.ts:1`
- `src/lib/textbook/simplePublish.ts:1`
- `src/lib/textbook/snapshotFromProblem.ts:1`
- `src/lib/textbook/snapshotSlots.ts:1`
- `src/lib/textbook/snapshotToPrintable.ts:1`
- `src/lib/textbook/strictJson.ts:1`
- `src/lib/textbook/studentAccess.ts:1`
- `src/lib/textbook/studentAttempts.ts:1`
- `src/lib/textbook/studentConceptVideo.ts:1`
- `src/lib/textbook/studentProjection.ts:1`
- `src/lib/textbook/studentRead.ts:1`
- `src/lib/textbook/studentReview.ts:1`
- `src/lib/textbook/studentRoutes.ts:1`
- `src/lib/textbook/unitOpenings.ts:1`
- `src/lib/unifiedBankQueryBody.ts:1`
- `src/lib/unifiedBankSelection.ts:1`
- `src/lib/unifiedPreview.ts:1`
- `src/lib/workspaceMenuPolicy.server.ts:1`
- `src/lib/workspaceMenuPolicy.ts:1`
- `src/proxy.ts:1`

### Components, styles and development fixtures (194)

- `src/app/dev/exam-print/ExamPrint.module.css:1`
- `src/app/dev/exam-print/page.tsx:1`
- `src/app/dev/grading-hifi/GradingHifiClient.tsx:1`
- `src/app/dev/grading-hifi/page.tsx:1`
- `src/app/dev/print-check/PrintCheckList.tsx:1`
- `src/app/dev/print-check/items.ts:1`
- `src/app/dev/print-check/page.tsx:1`
- `src/app/dev/print-color-hifi/ColorPaper.tsx:1`
- `src/app/dev/print-color-hifi/PrintColorHifi.module.css:1`
- `src/app/dev/print-color-hifi/PrintColorHifi.tsx:1`
- `src/app/dev/print-color-hifi/fixtures.ts:1`
- `src/app/dev/print-color-hifi/page.tsx:1`
- `src/app/dev/print-color-hifi/previous/JaseupTemplate.tsx:1`
- `src/app/dev/print-color-hifi/previous/JeongtongTemplate.tsx:1`
- `src/app/dev/print-color-hifi/previous/ModernTemplate.tsx:1`
- `src/app/dev/print-color-hifi/previous/ProblemMeta.tsx:1`
- `src/app/dev/print-color-hifi/previous/PyeonggaTemplate.tsx:1`
- `src/app/dev/print-color-hifi/previous/WorkbookTemplate.tsx:1`
- `src/app/dev/print-color-hifi/previous/YuhyungTemplate.tsx:1`
- `src/app/dev/print-paper/SlotReport.tsx:1`
- `src/app/dev/print-paper/page.tsx:1`
- `src/app/dev/print-paper/pickPaperProblems.ts:1`
- `src/app/dev/print-spacing/SpacingFixture.tsx:1`
- `src/app/dev/print-spacing/page.tsx:1`
- `src/app/dev/print-specimen/PrintButton.tsx:1`
- `src/app/dev/print-specimen/Specimen.module.css:1`
- `src/app/dev/print-specimen/page.tsx:1`
- `src/app/dev/print-specimen/pickSpecimens.ts:1`
- `src/app/dev/retry-wire/RetryWireClient.tsx:1`
- `src/app/dev/retry-wire/page.tsx:1`
- `src/components/exam-builder/BuilderDialog.tsx:1`
- `src/components/exam-builder/ComposeConditions.module.css:1`
- `src/components/exam-builder/ComposeConditions.tsx:1`
- `src/components/exam-builder/DemandMaterialPicker.tsx:1`
- `src/components/exam-builder/ExamAnswerPanel.tsx:1`
- `src/components/exam-builder/ExamBuilder.demand.test.tsx:1`
- `src/components/exam-builder/ExamBuilder.h2.test.tsx:1`
- `src/components/exam-builder/ExamBuilder.module.css:1`
- `src/components/exam-builder/ExamBuilder.test.tsx:1`
- `src/components/exam-builder/ExamBuilder.tsx:1`
- `src/components/exam-builder/FormatQuotaFields.module.css:1`
- `src/components/exam-builder/FormatQuotaFields.tsx:1`
- `src/components/exam-builder/MaterialPicker.tsx:1`
- `src/components/exam-builder/MathExamBuilder.module.css:1`
- `src/components/exam-builder/MathExamBuilder.tsx:1`
- `src/components/exam-builder/PickerDemand.test.tsx:1`
- `src/components/exam-builder/QuestionFormatPicker.module.css:1`
- `src/components/exam-builder/QuestionFormatPicker.tsx:1`
- `src/components/exam-builder/QuestionPicker.tsx:1`
- `src/components/exam-builder/QuickConditions.tsx:1`
- `src/components/exam-builder/ReplaceDialog.module.css:1`
- `src/components/exam-builder/ReplaceDialog.tsx:1`
- `src/components/exam-builder/SavedConditions.module.css:1`
- `src/components/exam-builder/SavedConditions.test.tsx:1`
- `src/components/exam-builder/SavedConditions.tsx:1`
- `src/components/exam-builder/ScopePicker.tsx:1`
- `src/components/exam-builder/ScopeSequencePicker.tsx:1`
- `src/components/exam-builder/SourcePicker.tsx:1`
- `src/components/exam-builder/conditionsPlan.ts:1`
- `src/components/exam-builder/examConditionsClient.ts:1`
- `src/components/exam-builder/mathSource.ts:1`
- `src/components/exam-builder/scopeAvailability.ts:1`
- `src/components/exam-builder/types.ts:1`
- `src/components/exam-builder/useBuilderScrollFrame.ts:1`
- `src/components/exam-builder/useQuestionReorder.ts:1`
- `src/components/exam-builder/vitest.config.mts:1`
- `src/components/learn/textbook/TextbookConceptActivity.tsx:1`
- `src/components/learn/textbook/TextbookQrScreen.tsx:1`
- `src/components/learn/textbook/TextbookReturnLink.tsx:1`
- `src/components/learn/textbook/TextbookVideo.tsx:1`
- `src/components/learn/textbook/studentTextbookApi.ts:1`
- `src/components/learn/textbook/textbookLearn.module.css:1`
- `src/components/print/A4Page.tsx:1`
- `src/components/print/DescriptiveAnswerArea.tsx:1`
- `src/components/print/DescriptiveAnswerSheet.tsx:1`
- `src/components/print/DescriptivePaper.module.css:1`
- `src/components/print/DescriptiveRubricPage.tsx:1`
- `src/components/print/DescriptiveScore.tsx:1`
- `src/components/print/PaperProblemView.tsx:1`
- `src/components/print/PastPaper.module.css:1`
- `src/components/print/PastPaperPrint.tsx:1`
- `src/components/print/PrintAnswerKeyPage.tsx:1`
- `src/components/print/TestPrint.module.css:1`
- `src/components/print/TestPrint.tsx:1`
- `src/components/print/WritingArea.module.css:1`
- `src/components/print/WritingArea.tsx:1`
- `src/components/print/templates/BodyContainer.tsx:1`
- `src/components/print/templates/JaseupTemplate.tsx:1`
- `src/components/print/templates/PastPaperTemplate.tsx:1`
- `src/components/print/templates/ProblemBody.tsx:1`
- `src/components/print/tokens.ts:1`
- `src/components/print/types.ts:1`
- `src/components/test/AiDraftReview.tsx:1`
- `src/components/test/AiGenerateProgress.tsx:1`
- `src/components/test/GenerateSetup.tsx:1`
- `src/components/test/GradeSheet.tsx:1`
- `src/components/test/ReviewProblemCard.tsx:1`
- `src/components/test/ReviewProblemCardLazy.tsx:1`
- `src/components/test/SavedRetryPanel.module.css:1`
- `src/components/test/SavedRetryPanel.tsx:1`
- `src/components/test/TestReview.tsx:1`
- `src/components/test/labels.ts:1`
- `src/components/test/rangeSummary.ts:1`
- `src/components/test/retryClient.ts:1`
- `src/components/test/useGenerateSetup.ts:1`
- `src/components/test/useTestReview.ts:1`
- `src/components/textbook/AutoCreatePanel.module.css:1`
- `src/components/textbook/AutoCreatePanel.tsx:1`
- `src/components/textbook/TextbookConceptLinkEditor.module.css:1`
- `src/components/textbook/TextbookConceptLinkEditor.tsx:1`
- `src/components/textbook/TextbookStudioView.tsx:1`
- `src/components/textbook/bookPreview.tsx:1`
- `src/components/textbook/browserQr.ts:1`
- `src/components/textbook/contentPicker.tsx:1`
- `src/components/textbook/index.ts:1`
- `src/components/textbook/integration/TextbookConceptLinks.tsx:1`
- `src/components/textbook/integration/TextbookStudentEvidence.tsx:1`
- `src/components/textbook/integration/integration.module.css:1`
- `src/components/textbook/integration/request.ts:1`
- `src/components/textbook/measuredPreview.tsx:1`
- `src/components/textbook/model.ts:1`
- `src/components/textbook/paper/TextbookPaper.tsx:1`
- `src/components/textbook/parts.tsx:1`
- `src/components/textbook/previewModel.ts:1`
- `src/components/textbook/simpleNavigation.ts:1`
- `src/components/textbook/structureFields.ts:1`
- `src/components/textbook/textbook.module.css:1`
- `src/components/unified/BankBasket.tsx:1`
- `src/components/unified/BankSourcePicker.module.css:1`
- `src/components/unified/BankSourcePicker.tsx:1`
- `src/components/unified/BankView.tsx:1`
- `src/components/unified/PrivateLibrary.tsx:1`
- `src/components/unified/SavedWorksheetActions.tsx:1`
- `src/components/unified/StudioCropOverlay.tsx:1`
- `src/components/unified/UnifiedProblem.tsx:1`
- `src/components/unified/UnifiedWorkspace.tsx:1`
- `src/components/unified/Workroom.module.css:1`
- `src/components/unified/WorksheetEditor.module.css:1`
- `src/components/unified/WorksheetEditor.tsx:1`
- `src/components/unified/WorkspacePageHeader.module.css:1`
- `src/components/unified/WorkspacePageHeader.tsx:1`
- `src/components/unified/bankSourcePick.ts:1`
- `src/components/unified/fractionDisplay.ts:1`
- `src/components/unified/print/AnswerPage.module.css:1`
- `src/components/unified/print/AnswerPage.tsx:1`
- `src/components/unified/print/EnglishAnswerPage.tsx:1`
- `src/components/unified/print/EnglishPrintRenderer.tsx:1`
- `src/components/unified/print/ExamDetails.tsx:1`
- `src/components/unified/print/LegacyPrintHeader.tsx:1`
- `src/components/unified/print/OutputExtras.module.css:1`
- `src/components/unified/print/PrintHeader.module.css:1`
- `src/components/unified/print/PrintHeader.tsx:1`
- `src/components/unified/print/PrintOptionsPanel.module.css:1`
- `src/components/unified/print/PrintOptionsPanel.tsx:1`
- `src/components/unified/print/SavedLayouts.tsx:1`
- `src/components/unified/print/SheetTagPicker.tsx:1`
- `src/components/unified/print/T2PrintHeader.module.css:1`
- `src/components/unified/print/T2PrintHeader.tsx:1`
- `src/components/unified/print/TitleSuggestions.tsx:1`
- `src/components/unified/print/WorksheetPrint.module.css:1`
- `src/components/unified/print/WorksheetPrint.tsx:1`
- `src/components/unified/print/answerKeyLayout.ts:1`
- `src/components/unified/print/fontPacks.ts:1`
- `src/components/unified/print/geometry.ts:1`
- `src/components/unified/print/loadFonts.ts:1`
- `src/components/unified/print/pack.ts:1`
- `src/components/unified/print/printPresetText.ts:1`
- `src/components/unified/print/printPresetsClient.ts:1`
- `src/components/unified/print/readableColor.ts:1`
- `src/components/unified/print/settings.ts:1`
- `src/components/unified/print/suggestTitles.ts:1`
- `src/components/unified/print/templateComponents.ts:1`
- `src/components/unified/print/templateFields.ts:1`
- `src/components/unified/print/templates/BodyContainer.tsx:1`
- `src/components/unified/print/templates/JaseupTemplate.tsx:1`
- `src/components/unified/print/templates/JeongtongTemplate.tsx:1`
- `src/components/unified/print/templates/ModernTemplate.tsx:1`
- `src/components/unified/print/templates/ProblemBody.tsx:1`
- `src/components/unified/print/templates/ProblemMeta.tsx:1`
- `src/components/unified/print/templates/PyeonggaTemplate.tsx:1`
- `src/components/unified/print/templates/SolvingArea.tsx:1`
- `src/components/unified/print/templates/WorkbookTemplate.tsx:1`
- `src/components/unified/print/templates/YuhyungTemplate.tsx:1`
- `src/components/unified/print/tokens.ts:1`
- `src/components/unified/print/types.ts:1`
- `src/components/unified/print/useDescriptivePageReadiness.ts:1`
- `src/components/unified/print/useMeasuredAnswerPages.tsx:1`
- `src/components/unified/print/useMeasuredPages.tsx:1`
- `src/components/unified/studioCropEdit.ts:1`
- `src/components/unified/types.ts:1`
- `src/components/unified/worksheetOrder.ts:1`
- `src/mocks/data/testResults.ts:1`
- `src/mocks/handlers/test.ts:1`
- `src/mocks/textbookRetryFixture.ts:1`

### Tests and test helpers (223)

- `src/__tests__/api/conceptBlankPrintPage.test.ts:1`
- `src/__tests__/api/englishPrintPage.test.ts:1`
- `src/__tests__/api/gradingInput.test.ts:1`
- `src/__tests__/api/printPresets.test.ts:1`
- `src/__tests__/api/studentLearningMenusManagement.test.ts:1`
- `src/__tests__/api/testPrintPageScope.test.ts:1`
- `src/__tests__/api/testRetry.test.ts:1`
- `src/__tests__/api/textbookConceptTargets.test.ts:1`
- `src/__tests__/api/textbookQuickCreateIntegration.test.ts:1`
- `src/__tests__/api/textbookQuickCreateRoute.test.ts:1`
- `src/__tests__/api/textbookRouteWalk.test.ts:1`
- `src/__tests__/api/textbookRoutes.test.ts:1`
- `src/__tests__/api/worksheetExports.test.ts:1`
- `src/__tests__/components/AnswerKeys.test.tsx:1`
- `src/__tests__/components/ConceptBlankPrintNow.test.tsx:1`
- `src/__tests__/components/EnglishBankPrint.test.tsx:1`
- `src/__tests__/components/EnglishPrintClient.test.tsx:1`
- `src/__tests__/components/EnglishPrintPaper.test.tsx:1`
- `src/__tests__/components/EnglishWorksheetAdapter.test.tsx:1`
- `src/__tests__/components/EnglishWorksheetReadiness.test.tsx:1`
- `src/__tests__/components/GradeSheet.test.tsx:1`
- `src/__tests__/components/PrintCheck.test.tsx:1`
- `src/__tests__/components/PrintColorHifi.test.tsx:1`
- `src/__tests__/components/PrintColorImplementation.test.tsx:1`
- `src/__tests__/components/PrintOptionsPanel.test.tsx:1`
- `src/__tests__/components/SavedRetryPanel.test.tsx:1`
- `src/__tests__/components/SavedWorksheetActions.test.tsx:1`
- `src/__tests__/components/TestPrint.test.tsx:1`
- `src/__tests__/components/TextbookAutoCreatePanel.test.tsx:1`
- `src/__tests__/components/TextbookConceptLinkEditor.test.tsx:1`
- `src/__tests__/components/TextbookIntegration.test.tsx:1`
- `src/__tests__/components/TextbookPreviewNavigation.test.tsx:1`
- `src/__tests__/components/TextbookStructureEditor.test.tsx:1`
- `src/__tests__/components/TextbookStudentActivity.test.tsx:1`
- `src/__tests__/components/TextbookStudio.test.tsx:1`
- `src/__tests__/components/TextbookStudioGuards.test.tsx:1`
- `src/__tests__/components/TextbookStudioUsability.test.tsx:1`
- `src/__tests__/components/WorksheetEditor.orderPanel.test.tsx:1`
- `src/__tests__/components/WorksheetEditor.progress.test.tsx:1`
- `src/__tests__/components/WorksheetPrint.preview.test.tsx:1`
- `src/__tests__/components/descriptiveBatch1Print.test.tsx:1`
- `src/__tests__/components/descriptiveUnifiedPrint.test.tsx:1`
- `src/__tests__/components/nativeDescriptiveAuthorPrint.test.tsx:1`
- `src/__tests__/components/printReadableColors.test.tsx:1`
- `src/__tests__/components/printScoreVisibility.test.tsx:1`
- `src/__tests__/components/smartPrintSpacing.test.tsx:1`
- `src/__tests__/fixtures/englishPrintSet.ts:1`
- `src/__tests__/fixtures/textbookTestProblem.ts:1`
- `src/__tests__/helpers/textbookContentPicker.ts:1`
- `src/__tests__/helpers/textbookDialogueUnitProof.ts:1`
- `src/__tests__/helpers/textbookFixture.ts:1`
- `src/__tests__/helpers/textbookManagedWorld.ts:1`
- `src/__tests__/helpers/textbookPglite.ts:1`
- `src/__tests__/helpers/textbookServerWorld.ts:1`
- `src/__tests__/helpers/textbookSourceRows.ts:1`
- `src/__tests__/helpers/textbookSourceWritingProof.ts:1`
- `src/__tests__/integration/sourceMaterialMigration.test.ts:1`
- `src/__tests__/lib/textbookAdminUsability.test.ts:1`
- `src/__tests__/lib/textbookCapture.test.ts:1`
- `src/__tests__/lib/textbookConceptForms.test.ts:1`
- `src/__tests__/lib/textbookDraft.test.ts:1`
- `src/__tests__/lib/textbookFrozenSources.test.ts:1`
- `src/__tests__/lib/textbookManagedOperations.test.ts:1`
- `src/__tests__/lib/textbookOperationalScope.test.ts:1`
- `src/__tests__/lib/textbookPublish.test.ts:1`
- `src/__tests__/lib/textbookPublishArtifacts.test.ts:1`
- `src/__tests__/lib/textbookPublishReal.integration.test.ts:1`
- `src/__tests__/lib/textbookRealValidator.test.ts:1`
- `src/__tests__/lib/textbookRegisterAndRefs.test.ts:1`
- `src/__tests__/lib/textbookReplayScope.test.ts:1`
- `src/__tests__/lib/textbookSectionPreview.test.ts:1`
- `src/__tests__/lib/textbookTeacherFlows.test.ts:1`
- `src/__tests__/lib/textbookVisualLibrary.test.ts:1`
- `src/__tests__/unit/answerKeyLayout.test.ts:1`
- `src/__tests__/unit/answerKeyOverflow.test.ts:1`
- `src/__tests__/unit/bankReadFingerprint.test.ts:1`
- `src/__tests__/unit/bankSource.contract.test.ts:1`
- `src/__tests__/unit/bankSourcePick.test.ts:1`
- `src/__tests__/unit/classOwnerPrintFree.test.ts:1`
- `src/__tests__/unit/conditionExport.test.tsx:1`
- `src/__tests__/unit/englishListeningPrint.test.tsx:1`
- `src/__tests__/unit/englishPrintLayout.test.ts:1`
- `src/__tests__/unit/exportPerMenu.test.ts:1`
- `src/__tests__/unit/figurePrintSize.test.ts:1`
- `src/__tests__/unit/figurePrintSizeSamples.test.ts:1`
- `src/__tests__/unit/gradeAnswers.test.ts:1`
- `src/__tests__/unit/gradingContract.test.ts:1`
- `src/__tests__/unit/hwpxExport.test.ts:1`
- `src/__tests__/unit/managedTestResults.test.ts:1`
- `src/__tests__/unit/mathgenPrint.test.ts:1`
- `src/__tests__/unit/pdfBatchExport.test.ts:1`
- `src/__tests__/unit/pdfExport.test.ts:1`
- `src/__tests__/unit/planRetry.test.ts:1`
- `src/__tests__/unit/printFigureHeight.test.ts:1`
- `src/__tests__/unit/printGeometryPin.test.ts:1`
- `src/__tests__/unit/printOverflow.test.ts:1`
- `src/__tests__/unit/printOverflowFigureSvg.test.ts:1`
- `src/__tests__/unit/printPack.test.ts:1`
- `src/__tests__/unit/printPresetContract.test.ts:1`
- `src/__tests__/unit/printSpacingReader.test.ts:1`
- `src/__tests__/unit/privateWorkspacePersistence.test.ts:1`
- `src/__tests__/unit/problemEligibility.test.ts:1`
- `src/__tests__/unit/problemPool.test.ts:1`
- `src/__tests__/unit/proxyTextbookEditorial.test.ts:1`
- `src/__tests__/unit/schoolTextbookCheckKey.test.ts:1`
- `src/__tests__/unit/schoolTextbookCodexBatchQualification.test.ts:1`
- `src/__tests__/unit/schoolTextbookCodexBatchReview.test.ts:1`
- `src/__tests__/unit/schoolTextbookCodexRetryQualification.test.ts:1`
- `src/__tests__/unit/schoolTextbookCodexRetryReview.test.ts:1`
- `src/__tests__/unit/schoolTextbookDbRetryBatch.test.ts:1`
- `src/__tests__/unit/schoolTextbookDbRetryGeneration.test.ts:1`
- `src/__tests__/unit/schoolTextbookDbRetryQualification.test.ts:1`
- `src/__tests__/unit/schoolTextbookDbRetryReview.test.ts:1`
- `src/__tests__/unit/schoolTextbookFigurePlacement.test.ts:1`
- `src/__tests__/unit/schoolTextbookNeutralNames.test.ts:1`
- `src/__tests__/unit/schoolTextbookRecovery.test.ts:1`
- `src/__tests__/unit/schoolTextbookRefreshPlan.test.ts:1`
- `src/__tests__/unit/schoolTextbookRetryPairPlan.test.ts:1`
- `src/__tests__/unit/schoolTextbookRootAnswerNotation.test.ts:1`
- `src/__tests__/unit/schoolTextbookSourceMeta.test.ts:1`
- `src/__tests__/unit/schoolTextbookVariants.test.ts:1`
- `src/__tests__/unit/schoolTextbookVariantsCalculus.test.ts:1`
- `src/__tests__/unit/schoolTextbookVariantsGeometry.test.ts:1`
- `src/__tests__/unit/smartPrintSpacing.test.ts:1`
- `src/__tests__/unit/studentLearningMenus.test.ts:1`
- `src/__tests__/unit/studentRouteAccess.test.ts:1`
- `src/__tests__/unit/textbookAnswerLayout.integration.test.ts:1`
- `src/__tests__/unit/textbookAnswerLayout.test.ts:1`
- `src/__tests__/unit/textbookArchive.test.ts:1`
- `src/__tests__/unit/textbookAutomaticPagination.test.ts:1`
- `src/__tests__/unit/textbookBankActivityScaffolds.integration.test.ts:1`
- `src/__tests__/unit/textbookBankActivityScaffolds.test.ts:1`
- `src/__tests__/unit/textbookCanonical.test.ts:1`
- `src/__tests__/unit/textbookConceptScripts.test.ts:1`
- `src/__tests__/unit/textbookConceptTargetCatalog.test.ts:1`
- `src/__tests__/unit/textbookConcepts.test.ts:1`
- `src/__tests__/unit/textbookContents.test.ts:1`
- `src/__tests__/unit/textbookContracts.test.ts:1`
- `src/__tests__/unit/textbookDdlLifecycle.test.ts:1`
- `src/__tests__/unit/textbookDdlPublish.test.ts:1`
- `src/__tests__/unit/textbookDdlReferences.test.ts:1`
- `src/__tests__/unit/textbookDialogueUnitCeiling.test.ts:1`
- `src/__tests__/unit/textbookDialogueUnitFit.integration.test.ts:1`
- `src/__tests__/unit/textbookDialogueUnitFit.test.ts:1`
- `src/__tests__/unit/textbookDialogueUnitPasses.test.ts:1`
- `src/__tests__/unit/textbookEditorState.test.ts:1`
- `src/__tests__/unit/textbookEditorialProjection.test.ts:1`
- `src/__tests__/unit/textbookFigureMapping.test.ts:1`
- `src/__tests__/unit/textbookFigureSlots.test.ts:1`
- `src/__tests__/unit/textbookFigureText.test.ts:1`
- `src/__tests__/unit/textbookFigureTextBundle.test.tsx:1`
- `src/__tests__/unit/textbookFractionChoices.integration.test.ts:1`
- `src/__tests__/unit/textbookFractionChoices.test.ts:1`
- `src/__tests__/unit/textbookFrozenBlank.test.ts:1`
- `src/__tests__/unit/textbookIndependentAnswers.integration.test.ts:1`
- `src/__tests__/unit/textbookIntegrity.test.ts:1`
- `src/__tests__/unit/textbookLayout.test.ts:1`
- `src/__tests__/unit/textbookManagedRefresh.test.ts:1`
- `src/__tests__/unit/textbookOfflineReferences.integration.test.ts:1`
- `src/__tests__/unit/textbookPageReferences.test.ts:1`
- `src/__tests__/unit/textbookPdfDownload.test.ts:1`
- `src/__tests__/unit/textbookPrintMapping.test.tsx:1`
- `src/__tests__/unit/textbookQuickCreate.test.ts:1`
- `src/__tests__/unit/textbookQuickCreateAvailability.test.ts:1`
- `src/__tests__/unit/textbookQuickCreateClient.test.ts:1`
- `src/__tests__/unit/textbookRecoveryAdjacentMath.test.ts:1`
- `src/__tests__/unit/textbookRecoveryAnswerCheckHeading.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoveryAnswerCheckHeading.test.ts:1`
- `src/__tests__/unit/textbookRecoveryConceptIdentity.test.ts:1`
- `src/__tests__/unit/textbookRecoveryContentRender.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoveryContentRender.test.ts:1`
- `src/__tests__/unit/textbookRecoveryContinuedBlocks.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoveryContinuedBlocks.test.ts:1`
- `src/__tests__/unit/textbookRecoveryDialoguePagination.test.ts:1`
- `src/__tests__/unit/textbookRecoveryDialogueRender.test.ts:1`
- `src/__tests__/unit/textbookRecoveryExerciseRows.test.ts:1`
- `src/__tests__/unit/textbookRecoveryIntro.test.ts:1`
- `src/__tests__/unit/textbookRecoveryMeasurement.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoveryPairedLayout.test.ts:1`
- `src/__tests__/unit/textbookRecoveryPairedOverflow.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoveryPairedOverflow.test.ts:1`
- `src/__tests__/unit/textbookRecoverySourceFooter.test.ts:1`
- `src/__tests__/unit/textbookRecoverySourceMemory.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoverySourceMemory.test.ts:1`
- `src/__tests__/unit/textbookRecoverySourceQuestionRows.integration.test.ts:1`
- `src/__tests__/unit/textbookRecoverySourceQuestionRows.test.ts:1`
- `src/__tests__/unit/textbookRecoveryWriter.test.ts:1`
- `src/__tests__/unit/textbookRender.integration.test.ts:1`
- `src/__tests__/unit/textbookRestStories.test.ts:1`
- `src/__tests__/unit/textbookSemanticCompatibility.test.ts:1`
- `src/__tests__/unit/textbookSemanticRefs.test.ts:1`
- `src/__tests__/unit/textbookSimplePublish.test.ts:1`
- `src/__tests__/unit/textbookSlots.test.ts:1`
- `src/__tests__/unit/textbookSourceDrillLayout.test.ts:1`
- `src/__tests__/unit/textbookSourceLedger.test.ts:1`
- `src/__tests__/unit/textbookSourcePageNavigation.test.ts:1`
- `src/__tests__/unit/textbookSourceWritingSpace.test.ts:1`
- `src/__tests__/unit/textbookSqlStatements.test.ts:1`
- `src/__tests__/unit/textbookStructureFields.test.ts:1`
- `src/__tests__/unit/textbookStructureText.test.ts:1`
- `src/__tests__/unit/textbookStudentAttemptsSql.test.ts:1`
- `src/__tests__/unit/textbookStudentConceptVideo.test.ts:1`
- `src/__tests__/unit/textbookStudentProjection.test.ts:1`
- `src/__tests__/unit/textbookStudentQuestions.integration.test.ts:1`
- `src/__tests__/unit/textbookStudentQuestions.test.ts:1`
- `src/__tests__/unit/textbookStudentRead.test.ts:1`
- `src/__tests__/unit/textbookStudentReturn.test.ts:1`
- `src/__tests__/unit/textbookStudentReview.test.ts:1`
- `src/__tests__/unit/textbookStudentRoutes.test.ts:1`
- `src/__tests__/unit/textbookTeacherBlank.test.ts:1`
- `src/__tests__/unit/textbookTestFrozenFlow.test.ts:1`
- `src/__tests__/unit/textbookTestProblemContent.test.ts:1`
- `src/__tests__/unit/textbookTestSnapshotAssets.test.ts:1`
- `src/__tests__/unit/textbookTwinHelpers.test.ts:1`
- `src/__tests__/unit/textbookUnitOpenings.test.ts:1`
- `src/__tests__/unit/textbookUsabilityClient.test.ts:1`
- `src/__tests__/unit/textbookV15Editorial.test.ts:1`
- `src/__tests__/unit/textbookVisualRender.integration.test.ts:1`
- `src/__tests__/unit/textbookVisualRender.test.ts:1`
- `src/__tests__/unit/toPrintProblem.test.ts:1`
- `src/__tests__/unit/worksheetOrder.test.ts:1`
- `src/__tests__/unit/worksheetProvenance.test.ts:1`
- `src/__tests__/unit/workspaceDocumentKindConstraint.test.ts:1`

### Import, verification and historical operator tools (308)

- `scripts/import/extract-rpm.ts:1`
- `scripts/import/textbook/READ-ANSWERS.md:1`
- `scripts/import/textbook/README.md:1`
- `scripts/import/textbook/answer_pictures.py:1`
- `scripts/import/textbook/bulk-retry.ts:1`
- `scripts/import/textbook/census.ts:1`
- `scripts/import/textbook/codex-retry-20261011/BATCH-REPORT.md:1`
- `scripts/import/textbook/codex-retry-20261011/README.md:1`
- `scripts/import/textbook/codex-retry-20261011/REPORT.md:1`
- `scripts/import/textbook/codex-retry-20261011/batch-cli.ts:1`
- `scripts/import/textbook/codex-retry-20261011/batch-generation.test.ts:1`
- `scripts/import/textbook/codex-retry-20261011/batch-generation.ts:1`
- `scripts/import/textbook/codex-retry-20261011/batch-runner.test.ts:1`
- `scripts/import/textbook/codex-retry-20261011/batch-runner.ts:1`
- `scripts/import/textbook/codex-retry-20261011/cli.ts:1`
- `scripts/import/textbook/codex-retry-20261011/figure-prompt.ts:1`
- `scripts/import/textbook/codex-retry-20261011/generation.ts:1`
- `scripts/import/textbook/codex-retry-20261011/runner.test.ts:1`
- `scripts/import/textbook/codex-retry-20261011/runner.ts:1`
- `scripts/import/textbook/codex-retry-20261011/smoke.ts:1`
- `scripts/import/textbook/codex-retry-20261011/test-safety.ts:1`
- `scripts/import/textbook/codex-retry-20261011/transport.test.ts:1`
- `scripts/import/textbook/codex-retry-20261011/transport.ts:1`
- `scripts/import/textbook/codex-retry-20261011/vitest.config.mts:1`
- `scripts/import/textbook/convert_batch.py:1`
- `scripts/import/textbook/db-retry-20261011/README.md:1`
- `scripts/import/textbook/db-retry-20261011/checkpoint.ts:1`
- `scripts/import/textbook/db-retry-20261011/cli.ts:1`
- `scripts/import/textbook/db-retry-20261011/insert.ts:1`
- `scripts/import/textbook/db-retry-20261011/runner.ts:1`
- `scripts/import/textbook/extract.py:1`
- `scripts/import/textbook/figures.py:1`
- `scripts/import/textbook/final-check/BRIEF-FIG.md:1`
- `scripts/import/textbook/final-check/BRIEF.md:1`
- `scripts/import/textbook/final-check/check_batches.py:1`
- `scripts/import/textbook/final-check/check_collect.py:1`
- `scripts/import/textbook/final-check/test_check_collect.py:1`
- `scripts/import/textbook/finalize.py:1`
- `scripts/import/textbook/hold-school-textbook.ts:1`
- `scripts/import/textbook/hwpx_flow.py:1`
- `scripts/import/textbook/load-school-textbook.ts:1`
- `scripts/import/textbook/load-supplement.ts:1`
- `scripts/import/textbook/lock-orphan-slots.ts:1`
- `scripts/import/textbook/normalize.py:1`
- `scripts/import/textbook/peek.py:1`
- `scripts/import/textbook/prepare.py:1`
- `scripts/import/textbook/qualify-reviewed.ts:1`
- `scripts/import/textbook/recover-held.ts:1`
- `scripts/import/textbook/recovery-review.ts:1`
- `scripts/import/textbook/render_objects.py:1`
- `scripts/import/textbook/repair-owned-retry-display.ts:1`
- `scripts/import/textbook/report.py:1`
- `scripts/import/textbook/report_load.py:1`
- `scripts/import/textbook/review/BRIEF-FIG.md:1`
- `scripts/import/textbook/review/BRIEF.md:1`
- `scripts/import/textbook/review/JUDGE-FIG.md:1`
- `scripts/import/textbook/review/JUDGE.md:1`
- `scripts/import/textbook/review/build_batches.py:1`
- `scripts/import/textbook/review/build_judge.py:1`
- `scripts/import/textbook/review/collect.py:1`
- `scripts/import/textbook/review/collect_judge.py:1`
- `scripts/import/textbook/review/test_collect.py:1`
- `scripts/import/textbook/segment.py:1`
- `scripts/import/textbook/source_input.py:1`
- `scripts/import/textbook/stats.py:1`
- `scripts/import/textbook/supplement-20261011/browser_qa.cjs:1`
- `scripts/import/textbook/supplement-20261011/build_candidates.py:1`
- `scripts/import/textbook/supplement-20261011/calculate_packet.py:1`
- `scripts/import/textbook/supplement-20261011/calculations.py:1`
- `scripts/import/textbook/supplement-20261011/inventory.py:1`
- `scripts/import/textbook/supplement-20261011/render_packet.ts:1`
- `scripts/import/textbook/supplement-20261011/stage_archive.py:1`
- `scripts/import/textbook/supplement-20261011/test_recovery_tools.py:1`
- `scripts/import/textbook/test_figures.py:1`
- `scripts/import/textbook/test_finalize.py:1`
- `scripts/import/textbook/test_flow_fixes.py:1`
- `scripts/import/textbook/test_normalize.py:1`
- `scripts/import/textbook/test_prepare.py:1`
- `scripts/import/textbook/test_segment.py:1`
- `scripts/import/textbook/test_supplement_extraction.py:1`
- `scripts/import/textbook/tidy-pieces.ts:1`
- `scripts/import/textbook/triage.py:1`
- `scripts/import/textbook/variants-20261011/coverage.ts:1`
- `scripts/import/textbook/variants-20261011/regression.ts:1`
- `scripts/import/textbook/variants-20261011/verify_math.py:1`
- `scripts/import/textbook/variants-calculus-20261011/census.ts:1`
- `scripts/import/textbook/variants-calculus-20261011/fixtures.ts:1`
- `scripts/import/textbook/variants-calculus-20261011/render-check.ts:1`
- `scripts/import/textbook/variants-calculus-20261011/verify_math.py:1`
- `scripts/import/textbook/variants-geometry-20261011/coverage.ts:1`
- `scripts/import/textbook/variants-geometry-20261011/independent_math.py:1`
- `scripts/import/textbook/variants-geometry-20261011/render_math.ts:1`
- `scripts/qa/ai-question-type-fingerprint.ts:1`
- `scripts/qa/ai-wordy-fingerprint.ts:1`
- `scripts/qa/apply-grading-mode-migration.ts:1`
- `scripts/qa/apply-print-preset-kind-migration.ts:1`
- `scripts/qa/apply-source-material-migration.ts:1`
- `scripts/qa/apply-textbook-studio-migration.ts:1`
- `scripts/qa/audit-printable-id.ts:1`
- `scripts/qa/backfill-figure-source-mm.ts:1`
- `scripts/qa/backfill-source-meta.mjs:1`
- `scripts/qa/bank-source-h1/capture.mjs:1`
- `scripts/qa/bank/type-audit-textbook.mjs:1`
- `scripts/qa/bank/type-audit-textbook.py:1`
- `scripts/qa/bank/type-audit-textbook.ts:1`
- `scripts/qa/concept-blank/student-clear/bank-source.ts:1`
- `scripts/qa/concept-blank/student-clear/definition-source.ts:1`
- `scripts/qa/concept-blank/student-clear/example-source.ts:1`
- `scripts/qa/concept-blank/student-clear/opening-source.ts:1`
- `scripts/qa/concept-blank/student-clear/source-plan.ts:1`
- `scripts/qa/concept-terms/check-no-source-text-elem34.py:1`
- `scripts/qa/dump-textbook-slot-rows-live.ts:1`
- `scripts/qa/enrich-source-meta.py:1`
- `scripts/qa/eval-answerkey-rules.ts:1`
- `scripts/qa/eywa-source-target-integration.ts:1`
- `scripts/qa/fingerprint-corpus.py:1`
- `scripts/qa/fingerprintElemG4Deep.ts:1`
- `scripts/qa/fingerprintElemG4W2.ts:1`
- `scripts/qa/fingerprintElemG4W3.ts:1`
- `scripts/qa/fingerprintElemG4W4.ts:1`
- `scripts/qa/format-filter-fingerprint.ts:1`
- `scripts/qa/grading-input-layout.mjs:1`
- `scripts/qa/inspect-blueprint-samples.ts:1`
- `scripts/qa/legacy/printPack-20260821.ts:1`
- `scripts/qa/measure-answerkey-overflow.tsx:1`
- `scripts/qa/measure-answerkey-units.tsx:1`
- `scripts/qa/measure-print-overflow.tsx:1`
- `scripts/qa/measure-source-picker.mjs:1`
- `scripts/qa/mutate-figure-print-size.mjs:1`
- `scripts/qa/mutate-grading.ts:1`
- `scripts/qa/pair-final-sources.py:1`
- `scripts/qa/pick-figure-print-samples.py:1`
- `scripts/qa/print-color-impl.mjs:1`
- `scripts/qa/print-info-color-hifi.mjs:1`
- `scripts/qa/print-spacing/benchmark.ts:1`
- `scripts/qa/print-spacing/compare.mjs:1`
- `scripts/qa/print-spacing/main.tsx:1`
- `scripts/qa/print-spacing/measure.mjs:1`
- `scripts/qa/print-spacing/summarize.mjs:1`
- `scripts/qa/print-spacing/vite.config.mts:1`
- `scripts/qa/print-templates/README.md:1`
- `scripts/qa/print-templates/audit-h2-color.mjs:1`
- `scripts/qa/print-templates/build-quick-key.mjs:1`
- `scripts/qa/print-templates/build-template-hifi.mjs:1`
- `scripts/qa/print-templates/build-template-wire.mjs:1`
- `scripts/qa/print-templates/compare.py:1`
- `scripts/qa/print-templates/count-color-pixels.py:1`
- `scripts/qa/print-templates/directions.mjs:1`
- `scripts/qa/print-templates/fixture.tsx:1`
- `scripts/qa/print-templates/h2-production.tsx:1`
- `scripts/qa/print-templates/measure-h2-production.mjs:1`
- `scripts/qa/print-templates/measure-template-t2.mjs:1`
- `scripts/qa/print-templates/measure-wide-answer.mjs:1`
- `scripts/qa/print-templates/measure.mjs:1`
- `scripts/qa/print-templates/quick-key.tsx:1`
- `scripts/qa/print-templates/refresh-hifi-long-answer.mjs:1`
- `scripts/qa/print-templates/review-quick-key-hifi.mjs:1`
- `scripts/qa/print-templates/run-h2-regressions.mjs:1`
- `scripts/qa/print-templates/t2-production.tsx:1`
- `scripts/qa/print-templates/t2-specimen.ts:1`
- `scripts/qa/print-templates/verify-template-hifi.mjs:1`
- `scripts/qa/print-templates/verify-wires.mjs:1`
- `scripts/qa/print-templates/wide-answer.tsx:1`
- `scripts/qa/print-templates/wire.css:1`
- `scripts/qa/probe-elem-josa-source.ts:1`
- `scripts/qa/probe-print-metadata.tsx:1`
- `scripts/qa/probe-rpm-figure-sources.ts:1`
- `scripts/qa/probe-textbook-kind-totals-live.ts:1`
- `scripts/qa/probe-textbook-question-groups-live.ts:1`
- `scripts/qa/prove-textbook-retry.ts:1`
- `scripts/qa/provenance-fingerprint.ts:1`
- `scripts/qa/rpm_font_fingerprint.py:1`
- `scripts/qa/select-final-sources.py:1`
- `scripts/qa/shot-figure-print-size.mjs:1`
- `scripts/qa/shot-print-overflow.tsx:1`
- `scripts/qa/source-figures/fixture.tsx:1`
- `scripts/qa/source-figures/verify.mjs:1`
- `scripts/qa/source-figures/vite.config.mts:1`
- `scripts/qa/stitch-figure-print-size.py:1`
- `scripts/qa/textbook-answer-review/README.md:1`
- `scripts/qa/textbook-answer-review/audit.py:1`
- `scripts/qa/textbook-answer-review/mutate_guards.py:1`
- `scripts/qa/textbook-answer-review/prepare.py:1`
- `scripts/qa/textbook-answer-review/probe_isolation.py:1`
- `scripts/qa/textbook-answer-review/review_core.py:1`
- `scripts/qa/textbook-answer-review/test_review.py:1`
- `scripts/qa/textbook-concurrency-check.ts:1`
- `scripts/qa/textbook-ddl-mutations.ts:1`
- `scripts/qa/textbook-figure-text.ts:1`
- `scripts/qa/textbook-retry-fixture.tsx:1`
- `scripts/qa/textbook-server-mutations.ts:1`
- `scripts/qa/textbook-slot-render-vitest.config.mts:1`
- `scripts/qa/textbook-sql-statements.ts:1`
- `scripts/qa/textbook-twin/README.md:1`
- `scripts/qa/textbook-twin/answers.py:1`
- `scripts/qa/textbook-twin/audit.py:1`
- `scripts/qa/textbook-twin/audit_author_provenance.py:1`
- `scripts/qa/textbook-twin/author.py:1`
- `scripts/qa/textbook-twin/build_sources.py:1`
- `scripts/qa/textbook-twin/collect.py:1`
- `scripts/qa/textbook-twin/complete_missing.py:1`
- `scripts/qa/textbook-twin/engine.ts:1`
- `scripts/qa/textbook-twin/execution_evidence.py:1`
- `scripts/qa/textbook-twin/export_guard.py:1`
- `scripts/qa/textbook-twin/fix_figures.py:1`
- `scripts/qa/textbook-twin/integrity.py:1`
- `scripts/qa/textbook-twin/materialize.py:1`
- `scripts/qa/textbook-twin/pdf.ts:1`
- `scripts/qa/textbook-twin/preview.ts:1`
- `scripts/qa/textbook-twin/recheck_answers.py:1`
- `scripts/qa/textbook-twin/review.py:1`
- `scripts/qa/textbook-twin/review_inputs.py:1`
- `scripts/qa/textbook-twin/review_ready.py:1`
- `scripts/qa/textbook-twin/revise.py:1`
- `scripts/qa/textbook-twin/select_preview.py:1`
- `scripts/qa/textbook-twin/similarity.py:1`
- `scripts/qa/textbook-twin/solve.py:1`
- `scripts/qa/textbook-twin/subscription_cli.py:1`
- `scripts/qa/textbook-twin/test_author_evidence.py:1`
- `scripts/qa/textbook-twin/test_event_parser.py:1`
- `scripts/qa/textbook-twin/test_evidence.py:1`
- `scripts/qa/textbook-twin/test_review_execution.py:1`
- `scripts/qa/textbook-twin/test_twin.py:1`
- `scripts/qa/textbook-twin/twinHelpers.ts:1`
- `scripts/qa/textbook-verify/README.md:1`
- `scripts/qa/textbook-verify/calibrate.py:1`
- `scripts/qa/textbook-verify/compare.py:1`
- `scripts/qa/textbook-verify/dump-db.ts:1`
- `scripts/qa/textbook-verify/extract_originals.py:1`
- `scripts/qa/textbook-verify/hwp5_flow.py:1`
- `scripts/qa/textbook-verify/report.py:1`
- `scripts/qa/textbook-verify/skeleton.py:1`
- `scripts/qa/textbook-verify/test_verify.py:1`
- `scripts/qa/textbook-verify/verify.py:1`
- `scripts/qa/textbook/census-stale-structure-refs.ts:1`
- `scripts/qa/textbook/codex-batch-adopt-20261011-report.md:1`
- `scripts/qa/textbook/codex-batch-adopt-20261011.test.ts:1`
- `scripts/qa/textbook/codex-batch-adopt-20261011.ts:1`
- `scripts/qa/textbook/codex-batch-adopt-20261011.vitest.config.mts:1`
- `scripts/qa/textbook/codex-batch-qualify-20261011.ts:1`
- `scripts/qa/textbook/codex-batch-review-20261011-report.md:1`
- `scripts/qa/textbook/codex-batch-review-20261011.ts:1`
- `scripts/qa/textbook/codex-batch-review-20261011.vitest.config.mts:1`
- `scripts/qa/textbook/codex-retry-qualify-20261011.ts:1`
- `scripts/qa/textbook/codex-retry-review-20261011.ts:1`
- `scripts/qa/textbook/db-retry-census-20261011.ts:1`
- `scripts/qa/textbook/db-retry-qualify-20261011.ts:1`
- `scripts/qa/textbook/db-retry-review-20261011.ts:1`
- `scripts/qa/textbook/extraction-proof/harness.ts:1`
- `scripts/qa/textbook/extraction-proof/quickCreate.proof.test.ts:1`
- `scripts/qa/textbook/extraction-proof/render.proof.test.ts:1`
- `scripts/qa/textbook/extraction-proof/renderModel.ts:1`
- `scripts/qa/textbook/extraction-proof/vitest.config.mts:1`
- `scripts/qa/textbook/preview-browser.ts:1`
- `scripts/qa/textbook/production-source-proof.ts:1`
- `scripts/qa/textbook/publish.vitest.config.mts:1`
- `scripts/qa/textbook/raster-proof.ts:1`
- `scripts/qa/textbook/recovery/README.md:1`
- `scripts/qa/textbook/recovery/archive-inactive-html.py:1`
- `scripts/qa/textbook/recovery/bank-fixtures.ts:1`
- `scripts/qa/textbook/recovery/capture-page.ts:1`
- `scripts/qa/textbook/recovery/compare_regions.py:1`
- `scripts/qa/textbook/recovery/convert-reference.ts:1`
- `scripts/qa/textbook/recovery/dom-witness.ts:1`
- `scripts/qa/textbook/recovery/extract-existing.ts:1`
- `scripts/qa/textbook/recovery/geometry.py:1`
- `scripts/qa/textbook/recovery/inspect-actual-failure.ts:1`
- `scripts/qa/textbook/recovery/inspect-r14.ts:1`
- `scripts/qa/textbook/recovery/inspect-source-questions.ts:1`
- `scripts/qa/textbook/recovery/inspect_reference.py:1`
- `scripts/qa/textbook/recovery/intro-proof.ts:1`
- `scripts/qa/textbook/recovery/load-final-dom.ts:1`
- `scripts/qa/textbook/recovery/local-books.ts:1`
- `scripts/qa/textbook/recovery/native_population.py:1`
- `scripts/qa/textbook/recovery/native_writing_oracle.py:1`
- `scripts/qa/textbook/recovery/page_references.py:1`
- `scripts/qa/textbook/recovery/recapture-focused.ts:1`
- `scripts/qa/textbook/recovery/recapture-reference.ts:1`
- `scripts/qa/textbook/recovery/recapture-source-guides.ts:1`
- `scripts/qa/textbook/recovery/refinalize-bank.ts:1`
- `scripts/qa/textbook/recovery/render-reference.ts:1`
- `scripts/qa/textbook/recovery/source-computed.ts:1`
- `scripts/qa/textbook/recovery/source-failure-cohorts.py:1`
- `scripts/qa/textbook/recovery/source_css.py:1`
- `scripts/qa/textbook/recovery/source_guides.py:1`
- `scripts/qa/textbook/recovery/summarize_evidence.py:1`
- `scripts/qa/textbook/recovery/test-reference.ts:1`
- `scripts/qa/textbook/recovery/test_export_references.py:1`
- `scripts/qa/textbook/recovery/test_geometry.py:1`
- `scripts/qa/textbook/recovery/test_native_population.py:1`
- `scripts/qa/textbook/recovery/test_source_guides.py:1`
- `scripts/qa/textbook/recovery/verify_exports.py:1`
- `scripts/qa/textbook/render-smoke.ts:1`
- `scripts/qa/textbook/retry-render-20261011/README.md:1`
- `scripts/qa/textbook/retry-render-20261011/browser_qa.cjs:1`
- `scripts/qa/textbook/retry-render-20261011/render_packet.ts:1`
- `scripts/qa/textbook/retry-render-20261011/run.cjs:1`
- `scripts/qa/textbook/retry-render-20261011/selftest.cjs:1`
- `scripts/qa/textbook/saved-draft-proof.ts:1`
- `scripts/qa/textbook/supplement-20261011/independent-math.py:1`
- `scripts/qa/textbook/verify-retry-census-20261011.ts:1`
- `scripts/qa/textbook/vitest.config.mts:1`
- `scripts/qa/textbookFigureTextCore.ts:1`
- `scripts/qa/textbookSlotRender.sweep.test.tsx:1`
- `scripts/qa/trace-source.py:1`
- `scripts/qa/verify-textbook-compose-live.ts:1`
- `scripts/rpm/delete-textbook-problems.ts:1`
- `scripts/rpm/extract-textbook-sections.py:1`

### Database migrations (18)

- `prisma/migrations/20260814120000_add_problem_source_metadata/migration.sql:1`
- `prisma/migrations/20260815150000_add_test_result_analysis/migration.sql:1`
- `prisma/migrations/20260917001000_test_result_grading_mode/migration.sql:1`
- `prisma/migrations/20260930020000_app_setting/migration.sql:1`
- `prisma/migrations/20261001210000_workspace_document_concept_blank/migration.sql:1`
- `prisma/migrations/20261003120000_textbook_studio/migration.sql:1`
- `prisma/migrations/20261003120100_textbook_test_problem_snapshot/migration.sql:1`
- `prisma/migrations/20261003120200_user_menus_check_textbook/migration.sql:1`
- `prisma/migrations/20261003230000_branch_menu_textbook/migration.sql:1`
- `prisma/migrations/20261007022000_app_setting_server_only/migration.sql:1`
- `prisma/migrations/20261007130000_problem_source_school_textbook/migration.sql:1`
- `prisma/migrations/20261007130100_source_book_material/migration.sql:1`
- `prisma/migrations/20261014190000_workspace_document_arithmetic_sheet/migration.sql:1`
- `prisma/migrations/20261016180000_workspace_document_exam_condition/migration.sql:1`
- `prisma/migrations/20261016210000_workspace_document_print_preset/migration.sql:1`
- `prisma/migrations/20261019100000_branch_owner_menus/migration.sql:1`
- `prisma/migrations/20261019160000_bank_read_revision/migration.sql:1`
- `prisma/migrations/20261021090000_bank_read_revision_format_version/migration.sql:1`

## Appendix B — Related design/planning and verification evidence

- `AGENTS.md:1`
- `DESIGN.md:1`
- `docs/design/workspace-ui-rules-20261008.md:1`
- `docs/planning/19-competitor-feature-gap.md:1`
- `docs/planning/schoolbook-import-20261007.md:1`
- `docs/planning/textbook-studio-p1-contracts-20261003.md:1`
- `docs/planning/tracks/reports/grading-input.md:1`
- `docs/planning/tracks/briefs/grading-input.md:1`
- `docs/planning/tracks/reports/textbook-retry-ui-20261011/report.md:1`
- `scripts/import/textbook/README.md:1`
- `scripts/import/textbook/READ-ANSWERS.md:1`
- `scripts/qa/textbook-answer-review/README.md:1`
- `scripts/qa/textbook-twin/README.md:1`

Historical report screenshots, PDF/HWPX specimens and content-review packets are evidence to inspect in a later authorized verification session; they were not reopened in a browser, rendered or treated as current production proof in this audit.
