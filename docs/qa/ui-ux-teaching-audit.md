# Teaching UI and UX audit

Date: 2026-09-23. Scope: active teacher screens and their local components in the assigned class, lesson, exam, test, grading, and SRS routes. This branch does not edit shared chrome, global styles, the authoring problem bank, student learning, or print paper output.

## Screen and state inventory

| Screen or route | States and actions inspected | Result |
| --- | --- | --- |
| Workroom teaching tabs (`TeachingView`, `TeachingOverview`) | session loading, anonymous login entry, error retry, ready overview, zero classes, class and lesson tabs, keyboard tab navigation, logout | Existing navigation, retry, and empty actions were functional. The scoped Workroom CSS already uses the navy and blue layout. No state logic changed. |
| `/classes` and class management | class list loading/error/empty/selected, add class and optional plan, student list loading/error/empty/selected, account issue/disabled/withdrawn/locked, progress loading/error/empty/save, weekly plan load/preview/save | Added local Workroom style for class cards, tables, controls, and mobile forms. Fixed the empty class table column span when an owner column is present. Student rows now stay hidden during detail load/error, and the account panel has an explicit close action that returns focus to the student. Existing plan preview and save behavior was retained. |
| `/classes/[id]/math-srs` | loading, unavailable record/error retry, zero students, search/status filters and reset, roster | Added a direct link to student registration in the zero-student state. Existing error retry and filter reset were verified in code. |
| Course SRS dashboard and plan (`CourseDashboard`, `CoursePlanForm`) | list loading/error/empty, combined name/class/status filtering and reset, account link, expanded student overview, section/activity/attempt reports, wrong-only filter, detail refresh, plan conflict/retry/save, Escape close and focus return | Added an action to leave a wrong-only filter that hides every recent attempt. After a successful plan save and detail reload, the feedback now says the save completed instead of continuing to say a reload is in progress. The course plan fields and revision conflict logic were not changed. |
| `/exam` | loading, error, empty, round list | Added in-place retry on load failure and a navy Workroom error panel. The existing empty explanation remains honest about the unavailable prediction entry point. |
| `/exam/[id]` | loading, error, prediction/observed blueprint, unavailable prediction, score table, score edit/save/failure | Added in-place retry and a list link for errors. The score table is a keyboard-reachable horizontal scroll region on narrow screens. Actual-score entry now has visible Save and Cancel buttons in addition to Enter/Escape, reports blank values, announces successful saves, and restores focus to the edit button. |
| `/tests/new` | initial loading/error, no classes, class/student/type/date/count/range fields, insufficient problems and inline AI review | Added retry for initial class/unit load failure and a link to create a class when the list is empty. Form labels and heading use the Workroom text scale. Existing test draft and review-range scope were preserved. |
| `/tests/[id]` | loading/not found/error, draft replacement and confirm, confirmed print/grade links | Existing retry and state-dependent links work. Increased heading/meta/footer readability and mobile padding. |
| `/tests/[id]/grade` | loading/error, fresh/partial/complete markings, absence, pending students, save failure/success, score summary | Added error retry, stale-error clearing after an edit, visible saving feedback, navy table treatment, accessible scroll region, and mobile padding. Kept the three-state marking model and the print/grade eligibility rule. |
| `/tests/[id]/print` | question/answer preview, print preparation, overflow warning and errors | Inspected read-only. The paper template and print output were left unchanged. |
| `/problems` | route wrapper only | The route renders `ProblemBank`, which is owned by the authoring worker. No edits or behavior claims about its internal states. |
| Achievement reports | active route inventory and teacher-facing report surfaces | There is no production report route under `src/app/(main)`. The live report-like teacher states are the course SRS detail tabs and grade result summary above. `/dev/report-wire` and `/dev/report-hifi` are development previews requiring database data, outside this branch's edit scope. |

The assigned components use inline expansion panels for student accounts and SRS details; a search of these components found no application modal or dialog state. The native browser print dialog was not opened during this audit.

## Validation

- Read this checkout's `AGENTS.md`, local Next 16 App Router layout/page, CSS, and client directive guides, and the React performance skill before implementation.
- Component regression tests cover clickable score saving and blank validation; exam list/detail retry; grade-sheet retry; test setup retry and no-class action; account-panel close/focus; and empty wrong-answer-filter recovery. Existing tests cover the draft, SRS plan conflict, marking, account, and class workflows.
- `npm run type-check` and ESLint on changed components passed. The focused Vitest suite passed 122/122 tests across eight files; after the final focus/privacy guard adjustments, the two directly affected suites passed 32/32 tests. `git diff --check` passed.
- Playwright opened `/dev/grading-hifi?set=partial` at 1440 and 390 px using its mocked API: both returned 200, the grading table stayed within its own scroll region (356 px viewport width and 547 px scroll content at 390 px), and the sticky status header remained visible. `/dev/class-owner-hifi?admin=0` returned 200 at both widths without page overflow. No real data was written.
- `/dev/plan-screen-hifi` returned 200 and compiled the new `ClassManage.module.css` on the local Next dev server.

## Limits and integration note

The real `/exam`, `/classes`, and `/tests/new` pages redirected to login in the local browser. Authenticated flows could not be visually checked because this checkout has no auth secret or `DATABASE_URL`; `/dev/exam-hifi` returned 500 for the missing database URL. The 390 px grading fixture still had page-level horizontal overflow from the parent-owned `AppChrome` nav (`scrollWidth` 559 px); the coordinator confirmed a shared chrome fix is in progress and will verify it after merging. This branch's grading table is independently scrollable. No browser save or other real-data mutation was attempted.
