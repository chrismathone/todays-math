# Saved grading → reviewed textbook retry → worksheet

2026-10-11. Branch `BIGSHOL/textbook-retry-20261011`; implementation base merged first: `5bd4ba1b2`. UI ownership only: grading/retry components, their client adapter, synthetic fixtures, tests, and documentation. No import, variant authoring, qualification, API, contract, or database changes.

The existing confirmed/printed test → **채점** entry now leads to a working flow on `/tests/{id}/grade`: save grading, explicitly select a student, read that student's saved result, review its designated variants, configure the existing worksheet, and print or export PDF/HWPX.

## Behavior

- The grade GET response's saved `testResultId` is retained. Successful grade POST is followed by a fresh grade GET; the client never invents a result ID from submitted marks or score lines. A failed refresh preserves the successful score response, explains the read failure separately, and blocks retry until the records can be read.
- No student is selected automatically. Never reviewed, absent, completed with no wrong answers, incomplete recorded grades, and edited but unsaved grades have separate messages. An incomplete saved row does not claim the remaining cells are correct: it stays unfinished until the teacher explicitly completes and saves it. Absence has no score or retry. Editing a grade invalidates its displayed retry plan; changing students aborts the prior read.
- Retry sends exactly `{studentId, testResultId}` to the existing read-only `POST /api/tests/{id}/retry`. It does not reduce count, exclude candidates, generate replacements, create a new test, or save an output draft. Response identity and wrong IDs are checked against the selected saved record.
- Each textbook original keeps two named slots, using only its exact `tb-retry-v1:<original-id>:1/2` mapping. Returned parent/source/review eligibility is checked; content, answer, solution, and SVG/raster fields go through the existing renderer. Response order cannot change original/slot order. Missing slot 1 stays empty even when slot 2 exists; zero-pair and one-pair shortfalls remain visible per original and in the total. Any incomplete plan blocks output. Ordinary wrong-answer folding remains the server's decision and is explained separately.
- The actual `WorksheetEditor`, `WorksheetPrint`, six templates, and export clients are reused. The default retry worksheet is the workbook with solving space, no fabricated grade or score, and answers initially hidden. The reviewed composition is fixed: no adding, deleting, reordering, or draft-storage actions. Title and formatting survive a return to review. Every print/PDF/HWPX path first re-reads the same saved-result retry plan; authorization failures and changed content prevent output.
- Only one active h1 is exposed at each stage. Grading and its save bar leave keyboard navigation during output; focus moves into output and returns to the review action. Shared design tokens and native labelled select/details controls are used. The output owns its page padding once, and scoped print rules remove the AppChrome ancestor navigation, grading sheet, and controls from the worksheet.

## Validation

All commands below passed on the final code:

```text
npm run type-check
npm test -- src/__tests__/components/GradeSheet.test.tsx src/__tests__/components/SavedRetryPanel.test.tsx src/__tests__/components/WorksheetEditor.orderPanel.test.tsx src/__tests__/components/WorksheetEditor.progress.test.tsx
npx eslint src/components/test/GradeSheet.tsx src/components/test/SavedRetryPanel.tsx src/components/test/retryClient.ts src/components/unified/WorksheetEditor.tsx src/mocks/textbookRetryFixture.ts src/__tests__/components/SavedRetryPanel.test.tsx scripts/qa/prove-textbook-retry.ts scripts/qa/textbook-retry-fixture.tsx
npx tsx scripts/qa/prove-textbook-retry.ts
git diff --check
```

The focused test gate ran **53 tests in four files**: existing grading 19, new saved retry 17, worksheet order 9, worksheet progress/output 8. The new tests cover pinned saved-result identity, slot 1 absence with slot 2 retained, a completely missing pair, API 403/404/422/503 and recovery, never-reviewed/absent/no-wrong/incomplete states, unsaved edits, student switching, actual refreshed result IDs after save, save-success/read-failure distinction, incorrect response identity, and verbatim worksheet mapping.

The isolated Playwright browser uses the actual client components and AppChrome CSS/ancestor structure in a Vite development fixture. It intercepts every API request and blocks external requests. No app server, authenticated account, shared DB, paid API, or physical printer is used. The PDF/HWPX requests invoke the existing local output builders with the real worksheet-client payloads, with engine/network configuration disabled. The fixture lives only in `scripts/qa`, not in an application route.

| Viewport | Successful pairs | 1/2 and 0/2 shortage | 403 + recovery | Edited grade + saved new ID | Changed-content print preflight | Document overflow |
| --- | --- | --- | --- | --- | --- | --- |
| 1440 × 900 | Passed | Passed | Passed | Passed | Passed | 0px |
| 390 × 900 | Passed | Passed | Passed | Passed | Passed | 0px |
| 320 × 900 | Passed | Passed | Passed | Passed | Passed | 0px |

The browser also checks explicit selection, absence, never-reviewed and incomplete grades, no-wrong results, fixed output order, one active h1, hidden grade/storage actions, and a successful intercepted print call at each width. At 1440px it generates [student PDF](retry.pdf) and [HWPX](retry.hwpx), then verifies print media with student answers hidden and teacher answers included. No browser page errors were recorded. [Structured evidence](browser-results.json) retains endpoint/request identity and width-level results; bulky synthetic export payloads remain in `.qa-artifacts/textbook-retry`.

## Captured screenshots

Visual inspection sampled the wide pair/output/student-print/teacher-print captures, the 390px pair/shortfall captures, and the 320px output capture. The browser assertions cover every state in the table.

| State | Wide | Narrow | Smallest |
| --- | --- | --- | --- |
| Grading | [1440](1440-grading.png) | [390](390-grading.png) | [320](320-grading.png) |
| Two reviewed variants per original | [1440](1440-pair.png) | [390](390-pair.png) | [320](320-pair.png) |
| Existing worksheet output | [1440](1440-output.png) | [390](390-output.png) | [320](320-output.png) |
| Missing slot and missing entire pair | [1440](1440-missing.png) | [390](390-missing.png) | [320](320-missing.png) |
| API permission failure | [1440](1440-failure.png) | [390](390-failure.png) | [320](320-failure.png) |

[Student print media](1440-print-student.png) and [teacher print media](1440-print-teacher.png) show only the existing worksheet composition. Full-page screen captures include the existing sticky grading-save bar at the initial viewport boundary; content and the last action remain reachable when scrolling.

## Boundaries

Read-only source inspection confirmed the existing student/class/test ownership checks, branch scope, absent/draft rejection, and export menu gates. Live account permissions, shared-data rendering, physical printing, and opening the HWPX in Hancom were not exercised. The fixture shell uses real AppChrome CSS/ancestor structure but omits live account/server-action islands. Other viewport sizes, short heights, browser zoom, and all six individual print templates were not re-audited. These limits do not alter the existing authorization or print contracts.

The coordinator interrupted dependency-based QA while restoring the shared `node_modules` junction target; source files stayed intact. Final tests, type checking, lint, and browser evidence above were rerun after restoration. The user flow is complete within this dispatch; coordinator merge/release remains outside this worker's scope.
