# Private workspace persistence QA

Date: 2026-09-14. Worker task: `task_d0f643a2295e`, dispatch: `ctx_4e03dcf9beb7`.

## Delivered behavior

- Authenticated worksheets hydrate from private document APIs and save with optimistic revisions. The synchronous editor remains responsive; local recovery is separate from the server acknowledgment that drives the save status.
- Account-specific existing worksheets and extraction sessions migrate without reading unscoped development data or removing the original recovery keys. Network errors and revision conflicts retain unsent work and remain visible.
- `내 시험지` lists worksheets and extraction sessions from the API, including title, problem count and date. Opening, renaming and deleting use persisted server results and the current menu permissions. Deleting a current document clears its selection and prevents delayed saves from recreating it.
- Every extraction has a random document ID and the payload `{data: StudioSessionData, assets: Record<sourceId, assetHash>}`. Starting over saves the outgoing extraction first and retains prior sessions. `?extraction=<documentId>#studio` reopens the selected extraction after login.
- PDF/image originals and embedded crop/figure images upload as immutable private assets in chunks up to 1 MiB. Uploads resume from server offsets, conversions are cached, and asset transfers are limited to three concurrent operations per client. Data URLs, encoded SVG data URLs and blob URLs are supported; arbitrary external image URLs are never fetched for upload.
- API calls use relative same-origin paths and the immutable `x-workspace-owner` header. Private image display also uses fenced asset GETs before creating object URLs. Account workspace leases keep images used by worksheets alive and release URLs after the last consumer and queued work finish.
- Developer previews keep local behavior. Accounts with no library/studio/export permission make no document API requests and leave their private recovery cache untouched.

## Validation

All QA uses mocked APIs, in-memory stores and the existing Vitest database double. No test accounts, live database writes, AI requests or project Playwright global setup were used. `prisma generate` only regenerated local client types from the checked-in schema.

The focused run passes **103 tests across eight files**:

```text
npx vitest run \
  src/__tests__/unit/privateCloudClient.test.ts \
  src/__tests__/unit/privateWorkspacePersistence.test.ts \
  src/__tests__/unit/draftStore.actions.test.ts \
  src/__tests__/unit/workspaceDraftStore.test.ts \
  src/__tests__/components/useWorkspaceDrafts.test.tsx \
  src/__tests__/components/UnifiedWorkspace.actions.test.tsx \
  src/__tests__/components/UnifiedWorkspace.access.test.tsx \
  src/__tests__/components/PrivateLibrary.test.tsx
```

The new client/store/library suites cover fresh-client restore, scoped migration, owner switching, private asset conversion and transfer limits, partial-upload retry, shared image lifetime, server acknowledgment failures, cross-device conflicts, extraction retention/reopening, portable pending recovery, active deletion, library rename/open behavior, and loading/empty/error states. Existing hook/menu tests additionally cover disabled private access and extraction query restoration.

`npx tsc --noEmit` passes after generating Prisma types. ESLint passes on every modified TypeScript/TSX file. JSON results are in the local ignored `.qa-artifacts/private-cloud/focused-results.json`.

## Existing Studio AI test issue

The requested `StudioView.ai.test.tsx` run passes six tests and fails three. The same three failures reproduce after temporarily replacing **only StudioView.tsx with its original committed version**, then restoring the exact working bytes in a `finally` block:

- imports without a paid request, reviews recognized text and sends edits to the solution request
- keeps editable raw fractions and applies mixed fractions only in elementary previews
- preserves a pending request on restart dialog cancel, then aborts and resets on acceptance without clearing added problems

The baseline also reports `MathfieldElement` undefined in `SourceMathTextEditor.tsx` under jsdom. These existing editor/test-environment failures were not changed by this persistence task. Baseline evidence is in the local ignored `.qa-artifacts/private-cloud/studio-baseline.json` and `.log`.

## Integration handoff

The coordinator owns actual-app browser evidence with intercepted private APIs and the final production build. No backend/schema/auth/admin files were edited. The pre-existing `package-lock.json` working-tree change was left untouched and is excluded from the client commit.

As with any browser upload, leaving the page before a server acknowledgment can interrupt delivery; pending/error status and local recovery do not claim a cloud save. Conflicting versions require retaining the current work and reopening/reconciling the server document; no automatic last-write-wins behavior is used.
