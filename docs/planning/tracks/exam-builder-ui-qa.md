# Exam builder and saved worksheet board QA

Verified 2026-09-22 against the coordinator's local development server, `http://localhost:3107/dev/unified#bank`, based on `1308b83d`. Browser contexts were isolated and seeded with three disposable local drafts. No application runtime files, lab files, shared types, production services, or port 3100 were changed.

## Result

The requested bank and local worksheet-board interactions pass in Chromium at **1440×1000, 390×844, and 320×800**. Every measured bank, basket, preview, random panel, and board state had `document.documentElement.scrollWidth <= innerWidth`; preview dialogs also remained within the viewport. No uncaught browser page errors occurred. Screenshots were inspected, including the narrow preview and board.

| Check                               | Evidence / result                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Compact header and renamed bank     | “시험지 만들기” appears in the page and accessible navigation; first-load screenshots fit all three widths.                                                                                                                          |
| Manual add and compact basket       | Added two live GET-sourced problems. Basket starts collapsed; opening shows numbered buttons, and clicking a number opens a small preview.                                                                                           |
| Preview and keyboard focus          | Escape closes the preview and restores focus to its number. Removing the previewed problem restores focus to the basket launcher; Escape collapses the basket.                                                                       |
| Reorder / replace / cancel / remove | Moving the first problem backward changes the saved order; replacement changes only that position. Cancelling replacement retains both IDs and their order. Removal retains the other problem.                                       |
| Filters retain selection            | Changing the grade to 초4 leaves the selected problem intact even when it is outside the new results.                                                                                                                                |
| Random scope and shortages          | Intercepted request includes grade, six difficulty counts, and selected IDs; it omits page. Requesting 기본 2 + 응용 2 and returning 기본 1 adds only one problem and shows exact missing-tier counts. No cross-tier filling occurs. |
| Failed random request               | Mock 503 shows the error and retains both existing selections.                                                                                                                                                                       |
| Draft-switch safety                 | While a random request is pending, opening the board and switching to the second draft aborts/discards the old selection result. The new draft retains only `saved-b`, including after returning to the bank.                        |
| Saved board                         | Three seeded rows load. Title search narrows to one row and clearing restores three. Title opens editing; rename updates the row; Escape cancels deletion and restores focus; confirmed deletion removes only that row.              |
| Local file download                 | The second draft downloads through “작업 파일 내보내기”; parsed JSON contains its problem and no delayed random addition. This flow uses only browser-local disposable documents.                                                    |

The live browser allowed API GETs and intercepted random POSTs locally; all other API mutations were blocked, with zero unexpected mutation attempts. The server-side selection checks use the repository's in-memory Prisma double, not a live database. Their existing tests also verify selection beyond a displayed page, existing-ID exclusion, eligibility, exact-tier shortages, and unit/source/format filters. Real random-query database performance and authenticated cloud-library writes were outside this QA run.

## Corrections and follow-up

- Corrected two stale `문제은행` navigation selectors in `UnifiedWorkspace.cart.test.tsx` to the shipped `시험지 만들기` label. The underlying cart assertions remain unchanged.
- Added a repeatable browser harness at `scripts/qa/exam-builder-ui-qa.mjs`; it bypasses the ordinary e2e global setup and accepts only localhost ports 3107 and 3109.
- **Coordinator correction verified:** shortened the visible mobile bank label to “만들기” while retaining the accessible name “시험지 만들기”. Rechecked the actual 320px browser view on 2026-09-22; labels fit and no horizontal overflow occurs.
- Existing focused-test stderr includes a duplicate-key warning from the deliberately duplicated `candidate` fixture and invalid `<p><div>` nesting in `ProblemTransformPanel` / `MathText`. The latter belongs to the existing AI transformation path, which this browser run does not invoke. These warnings do not fail the focused tests and were not suppressed.

## Validation and reproduction

**119 distinct focused tests pass across nine files**, after rerunning the corrected cart test. TypeScript `tsc --noEmit --pretty false` passes. ESLint passes for the browser harness and modified test.

```powershell
node scripts/qa/exam-builder-ui-qa.mjs
node node_modules/vitest/vitest.mjs run src/__tests__/components/BankView.builder.test.tsx src/__tests__/components/BankView.filters.test.tsx src/__tests__/components/PrivateLibrary.test.tsx src/__tests__/components/UnifiedWorkspace.cart.test.tsx src/__tests__/components/UnifiedWorkspace.orderReset.test.tsx src/__tests__/components/UnifiedWorkspace.actions.test.tsx src/__tests__/unit/draftStore.actions.test.ts src/__tests__/components/SavedWorksheetActions.test.tsx src/__tests__/api/unifiedBankFilters.test.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
```

The browser harness writes 15 screenshots, three downloaded drafts, and its result JSON to `.next/exam-builder-ui-qa/` by default. `QA_BASE_URL` can target a separately started worker server at `http://localhost:3109`; `QA_OUTPUT` changes the artifact directory. No separate worker server was needed because only QA files changed.

Selected durable evidence: [desktop bank](exam-builder-ui-qa/1440-bank.png), [desktop board](exam-builder-ui-qa/1440-library.png), [390px random panel](exam-builder-ui-qa/390-random.png), [320px bank](exam-builder-ui-qa/320-bank.png), [320px preview](exam-builder-ui-qa/320-preview.png), [320px board](exam-builder-ui-qa/320-library.png), [machine-readable results](exam-builder-ui-qa/results.json).

## Official-product benchmark

These are workflow comparisons from official public pages, accessed 2026-09-22, not claims of complete product parity. No competitor branding or page design was copied.

| Concrete feature                     | Official reference                                                                                                                                                                                                                           | Coverage in this UI                                                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Select a teaching scope              | Mathflat describes selecting unit scope and difficulty; Mathholic Lite describes unit/difficulty/type-based worksheet creation. [Mathflat FAQ](https://www.mathflat.com/news/faq/), [Mathholic Lite](https://lite.matholic.com/main)         | Compact grade, unit/range, search, and detail filters; changing scope retains the current basket.                                                                                                            |
| Control difficulty composition       | Mathflat offers overall difficulty or per-difficulty proportions; Mathholic describes directly setting difficulty. [Mathflat problem bank](https://www.mathflat.com/service/bank/), [Mathholic Lite](https://lite.matholic.com/main)         | Six explicit counts, total allocation, and random additions from the filtered eligible pool with transparent shortages. This does not implement predicted answer-rate targeting.                             |
| Manually refine a worksheet          | Mathflat describes full or partial worksheet editing; Mathholic explicitly describes adding and replacing chosen problems. [Mathflat problem bank](https://www.mathflat.com/service/bank/), [Mathholic Lite](https://lite.matholic.com/main) | Numbered previews, add, position-preserving replacement, cancel, removal, and reorder; the rest of the selection is preserved.                                                                               |
| Continue editing a reusable artifact | Mathholic advertises editable HWP files for saved school-exam questions. [Mathholic Lite](https://lite.matholic.com/main)                                                                                                                    | The saved board reopens local worksheets and supports rename/delete; the editor downloads editable workspace JSON. HWP export, AI reconstruction, and competitor textbook coverage are not claimed or added. |
