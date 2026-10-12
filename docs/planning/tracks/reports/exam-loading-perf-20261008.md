# Private worksheet hydration performance — 2026-10-08

Task: `task_7da36397fc31`; dispatch: `ctx_1696435cef2a`.
Baseline: `a3c1704c8` (the worker's starting HEAD).

The `시험지 작업을 불러오는 중입니다…` guard waits for
`useWorkspaceDrafts` → `createPrivateDraftStore.hydrate()`. Previously hydration
listed all account-owned draft summaries, fetched every payload in batches of
four, then materialized each draft in sequence. Images appearing within a single
markdown string also downloaded sequentially. The editor waited for unrelated
papers and all their images before it could display the active worksheet.

## Change

- Keep remote summaries for the recent-draft list; download and materialize only
  the active worksheet. A remembered active ID wins if still present remotely or
  in unsent recovery; otherwise choose the most recent remote draft, then unsent
  recovery. Existing `openDraft(id)` reads other payloads on demand.
- Preserve **every unsent recovery payload** with its original optimistic
  revision. Inactive recovery assets remain portable private URLs and are not
  downloaded just to resave the same content. Acknowledged inactive caches can
  be omitted from browser recovery because the cloud owns those saved copies;
  clean remotely deleted copies stay deleted.
- Start independent images within one string together through the existing
  three-transfer client limit. Duplicate paths still share one download, and
  replacement/SVG-tail repair still runs in source order.
- Preserve current editor changes and the latest selection when an asynchronous
  open finishes late. A late response cannot replace recovery or the revision
  base. Confirmed deletion of an unopened draft also removes its summary.

No server API, document schema, owner/branch authorization, save protocol, reader
floor, source-content normalization, hook signature, or UI file was changed.
The scoped owner header, same-origin credentials, no-store reads, redirect
rejection, revision conflict handling and portable asset serialization remain.
No database or production writes were made during this work.

## Deterministic before/after measurement

The same committed `privateDraftLoading.test.ts` fixture ran against the original
two implementation files restored from baseline HEAD, then against the fix.
It uses the hermetic private API double, fake timers and 12 remote papers with
three unique images in one markdown string per paper. Delays are fixed at
100 ms for the list, 150 ms for each document and 80 ms for each image. There is
no browser recovery in this measured cold-load case.

| Measurement | Baseline | Fix |
| --- | ---: | ---: |
| Ready after hydration | 3,430 ms | 330 ms |
| List reads | 1 | 1 |
| Full document reads | 12 | 1 |
| Image reads | 36 | 3 |
| Total reads before ready | 49 | 5 |
| Peak concurrent image reads | 1 | 3 |

This is a measured 90.4% reduction in fixture hydration time and 89.8% fewer
reads, **not a production latency or integrated browser measurement**.

Baseline graph:

```text
0–100       GET owned draft summaries
100–250     GET d11,d10,d9,d8
250–400     GET d7,d6,d5,d4
400–550     GET d3,d2,d1,d0
550–3430    36 image GETs, each waiting 80 ms before the next
3430        validated hydrated snapshot
```

Fixed graph:

```text
0–100       GET owned draft summaries
100–250     GET active d11
250–330     GET d11's three images concurrently
330         validated hydrated snapshot; all 12 recent summaries available
on open d0  GET d0, then its three images (another 230 ms in this fixture)
```

A separate seven-image test measures three waves (240 ms), exactly seven reads
despite a duplicate eighth reference, peak concurrency three, and exact portable
content round-trip. Existing SVG repair tests also pass.

## Validation

51 tests pass across:

- `src/__tests__/unit/privateDraftLoading.test.ts` (7 tests)
- `src/__tests__/unit/privateCloudClient.test.ts` (10 tests)
- `src/__tests__/unit/privateCloudSvgRoundtrip.test.ts` (6 tests)
- `src/__tests__/unit/privateWorkspacePersistence.test.ts` (15 tests)
- `src/__tests__/components/useWorkspaceDrafts.test.tsx` (13 tests)

Coverage includes an active draft changed on another device, original revisions
for conflicting inactive recovery, unreadable inactive images, active image
failure blocking autosave, untouched payload fidelity, late-open races, confirmed
inactive deletion, scope isolation, lost-save responses, StrictMode, and early
prepare deduplication. An edit attempted before hydration is ignored and no PUT
occurs before validation. Failure remains an error; ready is not fabricated.

The dependency-free worktree used the already installed dependencies under
`C:/Creative/testautocreator/node_modules` through a temporary Vite resolution
plugin, with no install or junction. The usual global setup requires a generated
Prisma client missing from those installed dependencies; these client-only
tests therefore used a temporary focused setup with Testing Library cleanup and
a throwing default fetch, ensuring no real network or database access. The test
files themselves are ordinary repository tests and need no custom harness in a
fully provisioned checkout.

TypeScript checked the three implementation/hook files and changed tests plus
their transitive imports: **0 scoped diagnostics, 0 dependency diagnostics**.
The compiler used existing main dependencies as a fallback resolver. Scoped
ESLint passed (only its dependency-location React-detection warning), Prettier
formatted the changed files, and `git diff --check` passed.

Normal integrated-check command:

```text
npx vitest run src/__tests__/unit/privateDraftLoading.test.ts src/__tests__/unit/privateCloudClient.test.ts src/__tests__/unit/privateCloudSvgRoundtrip.test.ts src/__tests__/unit/privateWorkspacePersistence.test.ts src/__tests__/components/useWorkspaceDrafts.test.tsx
```

## Coordinator integration

No new hook props are required. Keep the hook mounted in the stable,
account-scoped shell, and call its existing `prepare()` as soon as worksheet
navigation is known, before waiting for the bank/studio module to mount. It may
also be called on explicit worksheet intent; it returns the exact same in-flight
promise used by later `active=true` hydration, including under StrictMode.
Continue to gate editing on the actual hydrated/error state. The hook's existing
enabled/account scope must remain authoritative; unrelated or disabled menus
must not trigger private reads. `prepare()` performs normal hydration and can
resume pending recovery autosaves **after** validation, so it is not a pure
read-only prefetch API.

The coordinator owns the `UnifiedWorkspace.tsx` mount/warmup change and the real
localhost:3179 integrated UI measurement. This worker did not modify or measure
that browser. Remaining costs are the paginated metadata list and the active
paper's necessary payload/assets; inactive payloads are intentionally deferred.
The existing explicit reconnect-after-error path still merges missing remote
documents eagerly and was not part of the normal cold-load optimization.
