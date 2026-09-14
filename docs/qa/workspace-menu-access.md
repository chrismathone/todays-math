# Workroom menu access — 2026-09-14

The unified workroom accepts `allowedMenus: WorkspaceMenu[]` and an optional
`currentUser.isAdmin`. Omitting menus keeps the development preview unrestricted.
The first supplied allowed menu is the fallback destination. Empty access shows
an explicit notice with account/logout and, for administrators, `/admin`.

Navigation, home shortcuts, search actions, worksheet creation/import/export,
the teaching shortcut, source-editor return actions, and saved-worksheet edit
buttons respect access. Direct hashes and history entries are normalized to an
allowed destination; local storage cannot grant access. An asynchronous worksheet
file read is checked again before import if access changes while reading.

Disabled feature panels never mount. Revoking access removes previously mounted
panels, including a bank AI transformation panel. Studio access also gates the AI
status controls and the provider's `enabled` prop. Visited panels with retained
access stay mounted, and the user-scoped draft owner keeps its state and save
lifecycle through permission changes.

Authenticated sessions fetch `/api/account/access` on mount, focus, visibility
restoration, and every 30 seconds. Overlapping checks are deduplicated, requests
time out after 10 seconds, and listeners/requests are cleaned up on unmount.
Transient network failures retain the last verified snapshot. A 401 or changed
account identity removes menus and routes to `/login`; 403, pending, and rejected
accounts route to `/approval-pending`. API enforcement remains server-owned.

Validation:

- 50 tests passed across `UnifiedWorkspace.access`, `UnifiedWorkspace.actions`,
  `WorkspaceAccount`, `BankView.filters`, and `WorksheetEditor.progress`.
- The new `StudioView.ai` test, `keeps source review available while hiding
  disabled export actions`, passed separately.
- Focused ESLint and `git diff --check` passed.
- Test networking, account actions, database access, and AI requests were mocked;
  no real accounts, database rows, or AI jobs were created by this worker.
- The broader studio run had three existing editing-test failures at
  `SourceMathTextEditor.tsx:20`: `MathfieldElement` is undefined in jsdom while
  assigning `fontsDirectory`. Those editor-initialization failures are outside
  the permission change; the new studio permission test passes.
- Local Prisma client generation was required for type checking and did not
  access the database. The remaining worktree type-check dependency is the
  coordinator-owned `DevAiProvider.enabled` signature, already implemented in
  main and intended to integrate with this change.

Integration boundaries: the coordinator owns `WorkspacePage`, route redirects,
the access endpoint/authorization, provider internals, and database/cloud draft
adapters. This change does not modify those files or the existing draft stores.
The package lock was already modified when the worker started and is excluded
from the commit. Mobile navigation uses only the enabled entries; the account
header stays compact and the new notice uses a neutral border with no left-edge
accent.
