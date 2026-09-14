# Administration UI verification — 2026-09-14

Implemented `/admin`, `/approval-pending`, and the coordinator-added `/admin/users/[id]` UI. The admin list supports explicit search, approval-state filtering, pagination, account review, menu saves, pending approval/rejection, and immutable administrator accounts. Every mutation sends the selected account's `expectedUpdatedAt`; a 409 blocks further saves until the administrator explicitly reloads the current record and reviews the reset menu selection.

The waiting page distinguishes pending and rejected accounts, reads fresh access on refresh, returns approved accounts to the workroom, and submits the existing `signOutAction`. Server pages use `getAccountAccess()` and redirect anonymous or unauthorized visitors before rendering. Activity reporting is owned by the coordinator's root layout, so these pages do not mount duplicate reporters.

Per-user detail reads the protected account, document, asset and audit APIs. Documents display worksheet questions, math, answers, solutions, extraction crops and original-source links rather than a JSON dump. Document and activity lists paginate independently, and large previews reveal 20 questions at a time. Private SVG payloads render as images instead of injected HTML.

## Evidence

| Check                                  | Result                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| Isolated component and page-gate suite | **25 / 25 passed**                                                 |
| Isolated UI TypeScript check           | **Passed**                                                         |
| Scoped ESLint / affordance rules       | **Passed**                                                         |
| Browser matrix                         | **9 / 9 passed**, 52.2 seconds including harness build             |
| Widths                                 | **320, 390, 1440 pixels**                                          |
| Browser API isolation                  | All APIs intercepted; unexpected API/origin requests fail the test |
| Horizontal overflow                    | None in admin review, pending, rejected, document or audit states  |
| Keyboard                               | Review button activated with Enter; detail heading receives focus  |
| Colored left-edge accents              | None in the dedicated styles                                       |

Browser coverage includes menu edits without automatic writes, 409 recovery with the new version token, approval, approval refresh routing, logout action wiring, document math rendering, and audit navigation. Component coverage additionally verifies rejection confirmation, read-only admin rows, error/empty/loading states, search/filter/page queries, late aborted search responses, image failures, safe SVG presentation, protected image paths, and server redirects.

Saved screenshots, visually reviewed:

| Screen            | 320 px                                       | 390 px                                       | 1440 px                                       |
| ----------------- | -------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Account review    | [Image](admin-accounts-ui/admin-320.png)     | [Image](admin-accounts-ui/admin-390.png)     | [Image](admin-accounts-ui/admin-1440.png)     |
| Waiting           | [Image](admin-accounts-ui/pending-320.png)   | [Image](admin-accounts-ui/pending-390.png)   | [Image](admin-accounts-ui/pending-1440.png)   |
| Private documents | [Image](admin-accounts-ui/documents-320.png) | [Image](admin-accounts-ui/documents-390.png) | [Image](admin-accounts-ui/documents-1440.png) |

## Reproduction and integration boundary

Commands and harness isolation are documented in [the harness README](../../e2e/admin-accounts/README.md). The browser harness builds first because Vite dev dependency discovery caused a first-load timeout and a preview reload during initial runs; the final compiled-harness matrix passes all nine cases.

The worker branch starts at shared-contract commit `7841b08a`. Its full-repository type-check cannot validate the integration: the worker's generated Prisma client lacks repository models, and the coordinator-owned `getAccountAccess` implementation is on main. The isolated UI check passes with typed server-boundary adapters; main must run its normal type-check and authenticated route checks after merging the UI. No database accounts, private records, authentication sessions or AI services were created or modified during verification.

Only assigned UI paths, UI tests, the isolated harness and this evidence were changed. The pre-existing `package-lock.json` modification was left untouched and excluded from the commit. No package, backend, auth, contract, schema, proxy, unified-workspace or loading files were edited.
