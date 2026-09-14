# Unified problem-bank filter parity

BankView restores the real ProblemBank filter behavior while retaining the unified workspace's cards and basket. Search is capped at 400px and identifies its shared search fields: content, problem code/number, answer, solution and school.

## Shared behavior

- `UnitRangePicker` and `describeRange` provide the existing two-click range selection and whole-grade/chapter selection. The UI sends unit IDs; the server resolves curriculum order.
- `DIFFICULTY_LADDER`, `PROBLEM_FILTER_OPTIONS`, `splitProblemFilterValue`, `REVIEW_STATUS_LABEL`, `SOURCE_OPTIONS` and `SOURCE_LABEL` supply the existing labels and values. Short-answer/descriptive selections send `format`; calculation/concept/application send `problemType`.
- Requests use `q`, `grade`, `chapter`, `unitFrom`, `unitTo`, `difficulty`, `problemType` or `format`, `reviewStatus`, `source`, the three `has*` booleans, and `page`. Empty strings and false booleans are omitted; enabled booleans are serialized as `true`. Search is trimmed and limited to the shared contract's 100 characters.
- Choosing a range clears grade/chapter constraints; choosing a grade clears chapter and both range endpoints; choosing a chapter clears both endpoints. Every filter change, chip removal and reset returns to page 1. Pagination retains the current query.
- Default state is truthfully labeled “출제 가능”; explicit 대기/승인/반려 filters request inspection. Rows with `eligible=false` display the server's reason and disable adding. Bulk selection skips them, while a previously selected row can still be removed.
- Server rows, count and pagination remain authoritative. The component does not simulate filtering over its current page.

`BankData.units` and eligibility fields are optional for older fixtures. `BankProblem.source` carries the bank's source enum string separately from `StudioProblem`, because existing imported draft fixtures use a source provenance object. No wire fields are renamed.

## Verification

- `npx vitest run src/__tests__/components/BankView.filters.test.tsx src/__tests__/components/BankView.progress.test.tsx`: **15 passed**. Covers parameter contracts, type/format axes, combined filters, query/reset/page behavior, actual shared range picker, ineligible row and bulk selection, stale responses and retry feedback.
- Focused ESLint: passed for BankView, types, the component test and the browser harness.
- `npx tsc --noEmit --incremental false`: passed after generating this worktree's Prisma client locally.
- `node scripts/qa/check-unified-bank-filters.mjs`: real component/CSS in Chromium, with synthetic intercepted responses and no database or paid API access. Checks request semantics, range interaction, page/reset behavior, disabled selection, aligned controls and active chips.

| Viewport | Search width | Filter width | Minimum control height | Horizontal overflow |
| -------- | ------------ | ------------ | ---------------------- | ------------------- |
| 1440px   | 400px        | 148.39px     | 44px                   | None                |
| 1024px   | 400px        | 162.5px      | 44px                   | None                |
| 768px    | 400px        | 166.5px      | 44px                   | None                |
| 375px    | 317px        | 241px        | 44px                   | None                |
| 320px    | 262px        | 186px        | 44px                   | None                |

Generated harness files, measurements and screenshots stay under ignored `.qa-artifacts/unified-bank-filters/`. Screenshots use synthetic problems only.

## Integration boundary

The coordinator owns the matching database query implementation, shared-pool visibility rules, answer-sentinel semantics, issuance eligibility and the UnifiedWorkspace selection boundary. This UI commit does not modify those files. The coordinator performs the final actual Next UI integration and full build after merging; this worker never builds against or stops the root development server.
