# Account access, private materials and activity records

The administrator area is `/admin`. Each account links to `/admin/users/[id]`, where its worksheet drafts, extracted source material and activity records are visible. New accounts enter approval; pending/rejected accounts can check their status or sign out at `/approval-pending`. Existing accounts remain approved after the additive migration.

Administrator privilege is an independent database flag, not the existing director/reviewer role. Menu changes are explicit saves with an expected account revision. Protected administrator accounts cannot be disabled through this form. The JWT callback refreshes approval, administrator status and menu access from the database on every session read; submitted client claims cannot grant access. The workspace refreshes its visible menus every 30 seconds and on focus, while the server enforces changes on requests immediately. Existing reviewer role restrictions remain in force.

Private documents and original image/PDF assets use composite owner/document keys in the database. Normal routes derive ownership from the session. Client storage requests also carry an expected owner header, so an old account's pending request cannot save into a newly signed-in account. Administrator reads name the target owner through separate guarded routes, and private image references are rewritten to those routes. Responses are private and uncached; storage tables have RLS enabled with no public browser read policy.

Document writes, renames and deletes check the expected revision. Original files are uploaded in chunks of at most 1 MiB, verified by SHA-256, and served only after the entire upload is complete. Each file is limited to 64 MiB and document metadata to 3.5 MB. Images belong in the private asset store, not public image buckets.

Activity records distinguish observed UI requests from confirmed server changes. Authenticated pages record button/link selection, field changes, form submission, navigation and print requests. Input values, passwords, tokens and document bodies are not collected by this reporter. Login outcomes, signup, logout, denied requests, AI execution outcomes, administrator inspection and completed account/material changes are recorded by the server. Account/material mutations and their completion logs share a database transaction. UI delivery retries while the page is open and uses a deduplicated beacon on exit; this does not reconstruct activity from before this feature or guarantee browser telemetry after an offline browser is forcibly closed.

## Verification

- 33 initial mocked API/policy cases: owner isolation, account-switch fencing, administrator gates, approval, origins, optimistic conflicts, asset integrity and telemetry validation.
- 14 authentication/session/reporter cases: new signup approval, refreshed and revoked sessions, untrusted claims and exclusion of input values.
- 23 proxy/AI route cases and 26 workspace-entry/loading/resource cases passed after integration.
- 25 administrator component/page-gate cases passed in main. The isolated browser suite passed 9 cases across 320, 390 and 1440 pixel widths; see [administrator UI evidence](admin-accounts-ui.md).
- The requested administrator account was provisioned through `scripts/admin/bootstrap-admin.cjs` with credentials supplied on stdin. Its actual localhost login, administrator account list, private document list and audit list returned successfully. Desktop/mobile pages were inspected with no browser page errors. No test users or synthetic private materials were written to the shared database.

The script accepts a single JSON line containing `email`, `password` and optional `name`; credentials are never embedded in the script or committed. It records a bootstrap event and preserves an existing account's identity.

## Loading UI integration

Grok's independent inventory and rebuild is in [the skeleton audit](skeleton-audit.md). The integrated application also has matching administrator, user-detail and approval-status loaders. Unused auth loading styles were removed, and the developer gallery includes the new account states. Asynchronous operation progress remains measured progress UI rather than a page placeholder.
