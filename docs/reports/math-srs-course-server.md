# Durable elementary course backend

Implemented on the worker branch for task `task_8b66c3cfc0bc`. The backend commit is reported in the terminal's `worker_done` message. Root-owned contract/access commits were cherry-picked as dependencies; integrate only the final backend commit onto root, which already contains those changes.

## API and exports

- `GET/POST /api/learn/math-srs/course`: read state / resume or start the automatic next session. POST body is `{}`.
- `POST /api/learn/math-srs/course/plan`: `CoursePlanInput`, including required `expectedRevision`.
- `POST /api/learn/math-srs/course/attempts`: `CourseAttemptInput`; repeated identical requests are idempotent, different/stale answers return 409.
- `POST /api/learn/math-srs/course/hint`: `CourseHintInput`; persists the reveal before returning the solution.
- `GET /api/learn/math-srs/course/figure?sessionId=UUID&problemId=UUID`: authenticated own stored figure, rendered by `renderFigureSpec`, no seed or figure specification accepted.
- `GET /api/math-srs/course`: owned roster and classes; administrator ownership follows `ownedStudentsWhere` / `ownedRowsWhere`.
- `GET/POST /api/students/[id]/math-srs/course`: owned detailed report / plan update.

All exported route handlers use `withErrorLog`; all normal and handled failure responses use `noStore`. Student APIs require active student credentials and an enabled, nonwithdrawn student account. Teacher APIs require approved accounts, the SRS menu and existing role/ownership gates (administrators retain the existing ownership exception). Mutations require same origin. Missing tables/columns and malformed saved state return 503 without replacing data.

`courseAutomation.ts` exports `storedCourseSchema`, `StoredCourse`, `emptyCourseState`, `setCoursePlan`, `courseSummary`, `startAutomaticCourse`, `findStoredCourseSession`, `revealCourseHint`, `submitCourseAttempt`, `estimatedCourseRecall`, `publicCourseSession`, `CourseConflict`, and `CourseInvalidInput`.

`courseServer.ts` exports `loadCourseStudent`, `courseStudentDto`, `courseRosterDto`, `courseDetailDto`, `loadCourseDashboard`, and `loadCourseStudentDetail`. `courseRoutes.ts` exports `handleCourseStudentRequest`, `handleCourseFigure`, and `courseFailureResponse`; `courseTeacherRoutes.ts` exports `handleCourseDashboard` and `handleCourseTeacherStudent`.

## Storage and scheduling

`StudentSrsState.payload` remains version 1 with an optional validated `course` field. Old algebra reads/writes preserve it, and old payloads without it remain valid. No schema or migration changes belong to this worker. No live student records or database migrations were written by this worker.

The shared `changeSrsState` function accepts an optional fourth argument `expectedRevision`; it checks that revision on every CAS attempt. Plan edits cannot replay over a concurrent answer, including first-row creation races. Changing the starting section is rejected while work is unfinished; other settings preserve records.

Scheduling resumes unfinished work first, then selects the oldest due section, then the next unfinished section from the chosen start/cursor. A reached KST daily goal prevents new sessions but never blocks finishing an active session. Daily answer counts include partial sessions and span session boundaries. Poor new lessons rest until the next day; reviews never change the new-lesson cursor, and completing the final section ends the new curriculum instead of looping.

At least 80% of available auto-graded items must be independently correct to advance a learning session. Self-check items must have persisted solution reveals and successful explicit comparisons. This lets mixed/all-self-check sections advance curriculum without classifying self-assessment as unaided mastery. Wrong, assisted or self-assessed sessions receive review after one day. All-numeric sessions require four of five unaided correct answers.

Reports keep 90 most recent active-day aggregates, 30 completed session snapshots plus the active/latest session, 100 recent attempts, and lifetime section totals. Teacher session summaries return at most 30 entries. Recent attempt reports include expected answer and solution only in the authorized teacher detail response; student payloads expose answer/solution only after a persisted hint or answer. Problem/session IDs are opaque UUIDs. Retries and figures older than retained snapshots are stale, while lifetime totals remain intact.

## Adaptive estimates

The bounded heuristic follows the existing `memory.ts` interpretation: stability is days to 90% retention; estimated recall is mastery multiplied by exponential retention. It is not FSRS, has no invented prerequisite graph, and is not evidence of unobserved mastery. Only observed sections receive memory records.

Mastery updates from observed answers with a 0.28 exponential moving average (independent correct target 92, assisted correct target 52, wrong target 0; first auto-graded observation uses prior 50). Self-check answers do not increase mastery. Partial answers update activity and counts but do not grow stability. The first perfect unaided session schedules three days; subsequent genuinely spaced perfect sessions grow stability once per completed session using elapsed time and the recall estimate, bounded to 0.25–60 days. Wrong sessions shrink stability; assisted/self-assessed sessions do not extend their review interval. There is no growth from treating five immediate items as five spaced recalls.

## Validation

Final bounded suite: **75 tests passed in 6 files**:

```text
npx vitest run src/__tests__/unit/mathSrsCourseServer.test.ts src/__tests__/api/mathSrsCourseRoutes.test.ts src/__tests__/unit/mathSrsServer.test.ts src/__tests__/api/mathSrsRoutes.test.ts src/__tests__/unit/errorLogRouteCoverage.test.ts src/__tests__/unit/courseSrsAccess.test.ts --maxWorkers=1
```

Coverage includes real access/menu rules, ownership/admin exceptions, withdrawn and disabled accounts, same-origin checks, UUID figure isolation, answer privacy, 503 failures, malformed records, rollover, partial-session counts, pause/resume, final-section completion, weak-result scheduling, self-check-heavy sections, interval growth per session, concurrent starts/submissions/plans, and compatibility with the existing algebra endpoints. A 92-day simulation verifies bounded report retention and exact lifetime counts.

`npx tsc --noEmit --incremental false` and targeted ESLint checks passed. Dependencies were reused through an ignored local `node_modules` junction to the main checkout. Root owns UI integration, live storage readiness verification, merge, and eventual worktree cleanup.
