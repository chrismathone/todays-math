# Private document save conflict investigation

Investigated `privateDraftStore`, `privateCloudClient`, `privateStudioSessionStore`, and `privateDocumentActions`. All reproduction used the hermetic private-cloud transport fixture or mocked Prisma; no live database was read or mutated. Dependencies were reused through a junction to `C:/Creative/testautocreator/node_modules`, without installation. Read the repository AGENTS instructions and local Next route-handler and Vitest guides.

## Verified bugs and changes

1. **Repeated autosaves after a confirmed conflict.** The pre-fix regression produced eight more worksheet PUTs from four subsequent edits, and three more extraction PUTs from three subsequent edits. Both stores now stop remote writes for a rejected document revision, including queued worksheet saves, while continuing to capture later local edits and extraction originals. The extraction conflict flag survives subsequent local-cache errors. A newly constructed store may make a fresh attempt; this is not an automatic retry loop in an existing store.
2. **Successful PUT with a lost acknowledgment.** A transport fixture committed a save and then dropped its response. Previously the client reported failure and retained the obsolete expected revision. The client now performs a fenced read after an ambiguous response or 409 and accepts success only if ID, kind, normalized title, complete JSON payload, and the single expected successor revision all match the submitted request. Object-key ordering is ignored, but values and array order are significant. This performs no additional write, does not adopt an arbitrary newer revision, and does not retry edited content over another device's changes. It confirms that the intended state exists, not which client wrote it.
3. **Extraction remount while an earlier instance is saving.** A regression reopened an extraction while its departing instance awaited a PUT acknowledgment, then edited the reopened session. The old implementation restored the pending cache's stale revision and received 409 against its own completed save. Extraction restoration now waits for this account's pending saves in the same JavaScript realm before reading recovery. Separate tabs/devices do not share this registry and remain subject to revision checks.

The worksheet remount regression also passes. A queued worksheet edit behind a dropped response saves at revision 2 using expected revisions `[null, 1]`, with its latest title retained.

## Concurrency protection and recovery

The server implementation remains unchanged. Its owner-scoped transaction checks the existing revision and kind and uses `updateMany` with the expected revision to reject a competing write between the read and update. Added API tests explicitly cover that race and an attempted document-kind change. Existing ownership, stale save/delete, asset, and recovery tests remain passing.

Genuine differing remote content remains a 409, as does identical content beyond the single expected successor revision. Conflicted worksheet recovery retains the newest local title; extraction recovery retains the newest page state and original PDF bytes. No force-save or blanket revision reset was added.

## Scope limits

- The screenshot and repeated production PUT 409s establish a visible conflict and retry behavior, but do not identify which of these causes triggered the first production conflict. No production request payload, database revision history, or authenticated reproduction was available.
- Worksheet problem counts, extraction crop progress, and source pagination are separate state. Their reported values (40 problems, 21/21, page 6/6) alone do not establish a revision conflict or data loss.
- Existing genuine-conflict resolution remains explicit. In particular, `openDraft` still requires the outgoing work to save successfully before switching; it does not silently discard conflicted edits. A UX for exporting and deliberately reopening or saving a separate copy is outside this worker's ownership. Do not claim that these changes automatically repair an already divergent production document.
- FigureEditor, workspace banner/UI files, progress API, deployment, merge, and worktree cleanup were left to their owners.

## Validation

Before implementation, four targeted regressions failed (lost acknowledgment, identical retry, worksheet retry storm, extraction retry storm); the extraction remount regression subsequently failed separately and passed after its fix.

Final focused run: **7 files, 110 tests passed**:

```text
node node_modules/vitest/vitest.mjs run src/__tests__/unit/privateCloudClient.test.ts src/__tests__/unit/privateWorkspacePersistence.test.ts src/__tests__/unit/privateCloudSvgRoundtrip.test.ts src/__tests__/unit/draftStoreRemoved.test.ts src/__tests__/unit/workspaceDraftStore.test.ts src/__tests__/components/useWorkspaceDrafts.test.tsx src/__tests__/api/privateAccounts.test.ts
```

Full TypeScript check (`tsc --noEmit --incremental false`), ESLint on all changed TypeScript files, and `git diff --check` were also run. This report does not claim a full application suite or production browser validation.
