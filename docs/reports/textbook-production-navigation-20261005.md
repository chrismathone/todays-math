# Textbook simple preview navigation — 2026-10-05

Implemented a display-only navigation fix in `TextbookStudioView.tsx` and the deterministic `simpleNavigation.ts` helper. The first section's normally loaded manuscript already supplies automatic table-of-contents semantic references, so the UI retains that metadata across section moves and adds no API requests. Stored titles, manuscript content, render models, PDF generation and publishing are unchanged.

## Schema and capture evidence

- Immutable source: `C:/Users/user/Downloads/교재_복구_실행검증_20261005/production-ui-062104046-20261005/post-create-readonly.json`, captured at `2026-10-05T08:17:54.697Z`.
- SHA-256: `564b21cf8c0b3499ac71a84e7d44ba8af5b4aad11368f27dc9b0444ac9ab91c2`.
- `details.data.outline` has section IDs, keys and titles; `exchange.data.units[].sections[]` has templates and semantic manuscript blocks. The first section uses `auto-table-of-contents`, `semantic.activity: tableOfContents` and `node.kind: references`, with activity-qualified labels and destinations.
- `action-024.json` confirms the original 18 indistinguishable `유리수와 소수` buttons and a `목차` button selected while the preview displays the cover.
- The committed fixture is a navigation-only projection: three units, 26 sections, and the original TOC reference block. A read-only deep comparison verified it against the capture; account data, other body blocks, assets and snapshots are omitted.

## Behavior

All 26 captured navigation labels are distinct. Examples include `유리수와 소수 · 개념 대화`, `유리수와 소수 · 개념 학습`, `유리수와 소수 · 자유 개념 백지`, and `유리수와 소수 · 유형 연습`. The first button reads `표지 · 목차` only when that first TOC section includes the configured cover. Repeated activities receive `(1/2)`, `(2/2)` numbering within their unit and title/activity group, using current outline order.

Missing/foreign-edition metadata, manual templates, unknown activities and renamed titles preserve the existing title. Ordinary TOC entries retain their titles. Editions without qualifying automatic TOC references retain their existing navigation labels.

## Verification

```powershell
node --input-type=module -e 'import { startVitest } from "./node_modules/vitest/dist/node.js"; const ctx = await startVitest("test", ["src/__tests__/components/TextbookPreviewNavigation.test.tsx"], { run: true, configLoader: "runner", cache: false }, { cacheDir: "./tmp/navigation-vitest-cache" }); await ctx.close();'
node C:/Creative/testautocreator/node_modules/eslint/bin/eslint.js src/components/textbook/TextbookStudioView.tsx src/components/textbook/simpleNavigation.ts src/__tests__/components/TextbookPreviewNavigation.test.tsx
git diff --check
```

Results: **10/10 tests passed**, scoped ESLint passed, and the diff check passed. New coverage verifies every captured button label, selection destination, label persistence after leaving the TOC, absence of extra section requests, continuation numbering, input immutability, legacy/manual fallbacks and cover inclusion/separation. Existing page-turn and unsaved-edit guards also pass.

The worktree's dependency junction points to the restored `C:/Creative/testautocreator/node_modules`; test configuration loading and cache paths avoid writes there. No package installation, Prisma generation, production requests, database writes, browser operations or pushes were performed. Root retains production QA, deployment and merge ownership.
