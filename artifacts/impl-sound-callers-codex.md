# Sound v3 caller and student gate implementation

2026-10-04 · Dispatched Codex worker · `BIGSHOL/atelier-practice`

Implementation commit: `a98f19a5339111f65fb5dcd4b146b390c687a33a`.
Base UI: `7ffdb0f381480f0f053d05b909d2dceeebca752b`.
Authorized prerequisite cherries: manifest `0007b64f3` → `6f79ec61c`, real engine/provider `8d34c0f9d` → `afb40c00b`.

## Implemented

- A DOM-free `LearningSoundsProvider` sits inside `LearningMotionScope`, outside `JourneyArtProvider`, and contains bank branches and the replay dialog.
- Existing confirmed transitions issue sound commands: explorer `studentId:requestId`; elementary `student:session:problem:retryIndex`; middle first answer `student:mission:problem`; middle retry adds the existing `retryTurn`; replay uses its existing feedback event counter with kind/day/step/problem identity. No server fields or UUIDs were added.
- The deterministic shared `learningSoundCue` receives the submitted action. Graded correct answers use `correct`; wrong answers, explicit give-up, empty middle answers, and both self-assessment grades use `soft`. An explicit `selfCorrect` remains self-assessment even with a typed answer. All `lab-*` actions return no cue.
- Explorer confirmation history is bounded to the latest 16 request keys. A duplicate current request does not replay. Load, solution reveal, failed/409 responses, mismatched student/session/problem, expired requests, unmount and closed practice do not issue answer sounds.
- Load paths call the real stable `resetStudent(id)` API. Same-student resets rely on the engine's documented no-op behavior. Caller epoch/student refs suppress late answers after a reload or exit. A student switch also closes any replay dialog.
- Bank confirmation reports the confirmed student through optional `onConfirmedAnswer(studentId)`. Qualification requires this same student to have seen an incomplete day before confirming an answer here. Silent workshop confirmations qualify too.
- `complete` is issued only in the existing `showTile` function, once per qualified transition. Initial completed loads, completion without a local confirmed answer, manual refresh and student replacement are silent. The bank return GET preserves the explicit allowed qualification; `onComplete` has no sound. Existing sheet waiting, tile timing and chest behavior remain in place.
- Only active students' GET/HEAD requests under `/audio/math-learning/**` are allowed. The matching public-static proxy prefix permits anonymous GET/HEAD. Writes, sibling prefixes and the must-change-password student state remain blocked.

## Evidence

Read the final contract and both unconditional agreements from `C:/Users/user/orca/artifacts/design-package-review-20261004/`. Read the bundled Next 16.3 proxy, public-folder, Vitest and use-client guides before implementation.

Meaningful RED before implementation:

| Check | Result |
| --- | --- |
| Student gate + real proxy wiring tests | 5 failed, 27 passed; expected audio reads were redirected and exact capability lists lacked the prefix |
| Existing explorer/middle/replay caller assertions | 5 failed, 31 passed; confirmed sound command spies received zero calls |
| Targeted elementary confirmation/retry assertions | 2 failed; successful saved answers did not issue sound commands |

Final validation covers **11 targeted files / 207 tests**. The last combined run had 194 unaffected tests green and two failures among 13 existing `AuthenticatedMathSrs` tests. Its four stale wording expectations were updated to the UI already present in `7ffdb0f` (wrong first answer, wrong retry and successful retry); its complete affected-file rerun passed **13/13**, giving **207/207** final covered tests. Timing, double-submit, request equality, ordered 409 recovery, focus and keyboard assertions were preserved.

Targeted files:

- `StudentMathExplorers.test.tsx`, `StudentCourseSrs.test.tsx`, `StudentMathSrsCombo.test.tsx`, `StudentReplayDialog.test.tsx`.
- New `StudentLearningSoundsIntegration.test.tsx` and `learningSoundCue.test.ts`.
- `studentRouteAccess.test.ts`, `proxyStudentGate.test.ts`.
- Existing `AuthenticatedMathSrs.test.tsx`, `ExplorerChestPress.test.tsx`, `ExplorerSupplement.test.tsx`.

The real caller/provider/engine test passes **5/5**: typed self-assessment plays the neutral file; a throwing `AudioBufferSource.start()` preserves the committed success UI; outside-provider calls create no context or audio request; changed-student and closed-practice responses stay silent. It uses the real engine and fake browser audio methods, rather than throwing public sound spies.

Caller spy tests partially import the real `LearningSounds` module. No API stub is included in this implementation. Explorer tests verify both lost-response retry with the same request and duplicate suppression, explicit unknown answers, silent workshop confirmation followed by eligible completion, initial-complete silence, and confirmed/unconfirmed/changed-student bank completion. Existing middle retry tests check the exact retry key.

ESLint with `--max-warnings 0`: **17 owned source/test files, zero errors and warnings**. `git diff --check` and the staged diff check passed. The implementation commit leaves the worktree clean.

## Remaining integration checks

The coordinator owns full typecheck, production build, native Next audio HTTP/hash checks and browser verification. Vite is not cited as proof of the student proxy gate. Actual production student sessions, human listening and physical iPhone/iPad checks remain pending under the approved contract. No install, Prisma, push, database/API operation or additional agent was used.
