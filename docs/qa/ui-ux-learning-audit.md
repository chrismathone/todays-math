# Student learning and lab UX audit

2026-09-23 · Branch `BIGSHOL/ui-ux-learning-audit`

## Scope and method

Reviewed the active student routes in `src/app/learn` and `src/app/lab`, their `math-srs` and lab components, and the existing component tests. Read the repository rules, the installed Next.js 16 App Router guides for server/client components and CSS, and the React performance guidance before editing. Used isolated browser contexts at 1365 × 850 and 390 × 850; these contexts had no student login and did not change a real student's record.

| Screen or flow                                                   | States reviewed                                                                                                                             | Result                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/lab`                                                           | course map, progress cards, local links                                                                                                     | Desktop/mobile rendered without page overflow or browser errors.                                                                                                                                                                 |
| `/lab/play/[courseId]`                                           | all 12 course landing activities; wrong choice, reset, correct choice, automatic advance, manual previous navigation, help, completion code | All 12 initial activities rendered at both widths without page overflow or browser errors. Fixed delayed advance, missing reset, focus and heading semantics.                                                                    |
| `/lab/cube-3-1`                                                  | all 13 lesson entry screens, answer area, record modal, Escape/return focus, loading and storage messages, practice/game code paths         | All 13 lesson entries rendered at both widths without page overflow or browser errors. Fixed compressed mobile activity content; verified record modal Escape. Existing keyboard tests cover Enter and focus in activity stages. |
| `/lab/math-srs`                                                  | learner/profile chooser, curriculum filters, loading/error, five-question entry and practice panels, feedback/completion code paths         | Home and practice rendered at both widths without page overflow or browser errors. Existing tests cover figure retry, answer entry, hints, feedback, continuation and local storage warnings.                                    |
| `/lab/math-srs/algebra`                                          | learner/profile chooser, mission entry, question input, feedback/completion code paths                                                      | Home and question rendered at both widths without page overflow or browser errors. Existing tests cover answer validation, hint, feedback and mission flow.                                                                      |
| `/learn/math-srs`                                                | setup, paused/done/recommendation, loading/error/retry, settings, practice and completion with mocked student API                           | Added settings focus, Escape close and opener focus restore; completion action now receives focus for Enter. Existing tests cover conflict and offline recovery, figure retry and answer persistence.                            |
| `/learn/math-srs/algebra`                                        | mission entry, question, feedback, result, auth and error recovery with mocked student API                                                  | Feedback/result action now receives focus for Enter. Existing tests cover numeric validation, hint, retry and session redirects.                                                                                                 |
| `/learn/login`, `/learn/password`, `/learn`, `/learn/watch/[id]` | route access and existing learn-screen component tests                                                                                      | Anonymous browser visits to `/learn` and `/learn/password` redirected to `/learn/login`. Learn screens and password tests passed; no authenticated browser session was available for the watch screen.                           |

Teacher `CourseDashboard`, `CoursePlanForm`, admin surfaces, global CSS and shared UI were kept outside this change. The local legacy SRS apps still expose their existing teacher views; this audit did not redesign those teacher views.

## Fixes

- Lab course activity success used a delayed timer that could overwrite a student's manual navigation. The timer is now cancelled on manual navigation and unmount. New activity headings receive focus, and the current activity has a proper `h1`.
- Wrong lab selections could remain selected with no way to submit the same choice again. A visible **다시 해보기** action resets the activity input and feedback without changing the recorded attempt.
- Authenticated SRS feedback and completion placed focus on a heading while the visible continue action required another Tab. The continue or home button now receives focus with the result heading as its accessible description, so Enter proceeds immediately.
- Authenticated course settings now focus the settings heading on opening and support Escape with focus restored to the opener.
- The 3-1 cube activity viewport previously shrank a full lesson to fit a phone screen. At widths up to 760px it now preserves readable activity size and scrolls inside the activity area. Existing block and instructional colors remain in the manipulative.
- Lab page, buttons, focus outlines, tracks and cube shell use the shared learn tokens for background, ink, accent, surface and focus. Semantic learning colors remain in manipulatives and success feedback.

## Validation

- `npm run type-check` passed after `npx prisma generate` restored the local generated client.
- ESLint passed on the changed TSX and tests.
- Fourteen focused Vitest suites passed (116 tests) for course recovery, authenticated SRS, cube keyboard and lessons, learn screens, local SRS and practice. The new regression tests check wrong-answer reset and focus, cancellation of delayed advance, settings Escape/focus return, and Enter from SRS feedback and completion.
- Headless Chromium desktop/mobile checks covered `/lab`, all 12 `/lab/play/*` entry screens, all 13 cube lesson entries, both local SRS routes and representative internal practice states. No page-level horizontal overflow or uncaught browser error was reported. The lab wrong/reset/correct transition and cube record modal Escape/focus return were exercised in the browser.

## Limits

- This environment had no authenticated student session, so account-backed learn screens were checked with mocked API component tests and anonymous route redirects, not a live student account. No real student record was changed.
- Browser checks sampled internal tasks and feedback states; they did not solve every generated question or every manipulative variation in all 12 lab courses.
- The local dev server reported missing `AUTH_SECRET` in server logs. Its development overlay appeared in screenshots; this configuration issue is outside the student UI files.
