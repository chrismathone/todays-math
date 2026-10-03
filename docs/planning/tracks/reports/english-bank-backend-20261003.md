# English bank backend implementation and verification

2026-10-03. Implements the final English bank consensus including Claude C1–C4. Shared contracts were delivered first at `6ccd02e2d`; the reference year/round filter follow-up was delivered at `6f529ac20`. Root route grant checkpoint `a3f00d726` is merged into this branch.

## Delivered behavior

- Passage create (JSON and exact UTF-8 TXT), paged server search, detail and usage history, CAS edit, soft archive, explicit original material/set import, separate rights confirmation, and maker prepare routes. Shapes are in [the API contract](english-bank-api-contract.md).
- Independent User-owned passage root with stored branch scope. Four new tables: passage, immutable text revision, immutable use snapshot, and import/create retry receipt. Receipts permit multiple import keys to resolve to one original without losing concurrent idempotency.
- Original text is never normalized or truncated for storage. NFC plus folded whitespace is used only for duplicate candidates and source association. SHA-256 identifies exact UTF-8 snapshots. Invalid Unicode and NUL are rejected.
- Bank max 30,000, cloze max 24,000, ChatGPT/API max 18,000. New uses must reference the current text revision. A source/text edit resets rights; reconfirming new text cannot authorize a stale revision.
- Generation and set creation recheck scope, current rights, source association and path limits. Variation checks the actual sourcePassage. Bank source/path combinations are checked to prevent an external source claiming cloze rights. Use creation is in the same transaction as set creation.
- Existing V1 and clientKey behavior is preserved, including the exact old conflict message. Successful retry after later rights/source changes or archival returns the original set with no extra use. Changing bank identity under the same key returns CONFLICT with a reason.
- Imports verify the original resource's own read menu and its parent exam scope. TXT bytes are decoded strictly and checked against original size and stored content; truncated legacy content, unavailable PDF/DOCX text, and missing sourcePassage are rejected without guessing.
- Listening bank search keeps the original `/sets` array response untouched. Bank and official reference reads retain current account, menu and pilot checks. Official EBS projection returns only approved page links and known page parameters; no asset URLs, hosting or imported EBS originals.

## Database receipt and local probe

`20261003160000_english_passage_bank/migration.sql` was applied successfully by `prisma db execute` inside newly generated `bank_probe_<uuid>` schemas on **127.0.0.1:55440/english_bank**. Each run first pushed the pre-bank schema to its new schema, then applied the actual migration, then exercised the real Prisma client and actual route handlers. The migration wraps its new tables/indexes/triggers/RLS/revokes in BEGIN/COMMIT. No existing table or row is rewritten. Root owns the separate menu CHECK migration.

The probe asserts all four new tables have RLS enabled and zero table grants to PUBLIC/anon/authenticated, and verifies the immutable revision trigger. App ownership remains enforced through `ownedRowsWhere`/`withinOwnerScope`; no permissive public RLS policies are added. The isolation URL is hard-checked to the named loopback host, port and database. Each generated schema is dropped after the run; public fixtures were not reset or written.

Reproduce using the local DSN in `ENGLISH_BANK_TEST_DATABASE_URL`, then:

```powershell
npx vitest run src/__tests__/integration/englishBank.postgres.test.ts --maxWorkers 2
```

The 11 PostgreSQL scenarios cover migration permissions, exact text and owner-only duplicates, stable pages without full text, concurrent CAS, immutable revisions, rights invalidation, stale revision refusal, original menu grants, concurrent import receipts and duplicate origins, truncated source rejection, explicit generated/original selection, path bounds, atomic concurrent set saves and snapshots, successful pending-save replay, changed-ref conflicts, parent-exam history scope, soft archive and set deletion, malformed/foreign/missing refs with no writes, variation source association, generation blocked before provider calls, forged cloze path, TXT and route gates, and listening search/pilot/menu compatibility.

## Test evidence

- RED: bank policy import failed before implementation. GREEN: 8 policy tests.
- The first real PostgreSQL run exposed Prisma's unsupported void return from `$queryRaw` advisory locking; fixed by using `$executeRaw`. The next run exposed strict response parsing receiving extra database fields; fixed with an explicit summary projection. The probe then passed all 10 initial scenarios.
- Additional RED: an externally generated source could claim the cloze path (201 instead of 409). Added source/path validation; all 11 PostgreSQL scenarios passed.
- Full English/listening regression run: **868 passed, 21 skipped, 2 failed** across 59 files. One failure is the pre-existing English fence allowlist omissions for the eywa migration and its SQL QA file. Root explicitly owns that repair. The bank migration itself is precisely allowlisted in this change.
- The other broad-run failure was a portable MP3 decoder timeout while many test and type-check workers ran together. Limited-worker rerun: **78 passed across 6 files**, including all MP3 decoder tests, bank policies/references, V1 set/generation routes and route error-log coverage.
- `npx tsc --noEmit --pretty false`: passed. ESLint of every changed TypeScript file: passed with zero warnings after cleanup.
- Final combined targeted run (including PostgreSQL): **89 passed across 7 files**, 36.59 seconds, with `--maxWorkers 2`. All 11 PostgreSQL scenarios passed and the generated schema was cleaned up.

No paid API was called; generation is mocked in integration tests. No Docker, deployment, shared DB migration or additional agent was used. Prisma client generation ran once and is stable. Combined production build, browser round trip, mobile and keyboard verification remain with the coordinator/UI owners after merge; this report does not claim those checks.

Reference for new-table restrictions: [Supabase row-level security and grants](https://supabase.com/docs/guides/database/postgres/row-level-security). The project continues to use its existing Prisma/Auth.js ownership architecture.
