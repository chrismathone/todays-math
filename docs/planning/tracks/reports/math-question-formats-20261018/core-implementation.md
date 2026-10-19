# Question identity/data core implementation — 2026-10-18

Implemented the approved plan `math-question-formats-20261018.md`, SHA-256
`50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61`,
with the six binding conditions in `claude-plan-review-r1.md` retained.
**No shared database writes, push, or deployment were performed.** This is the
implementation/evidence bundle for separate Claude Gate 2 review; it does not
authorize DDL or backfill execution.

The coordinator reported that the connected Supabase MCP SQL capability denied
even a read-only probe. This worker's evidence used the permitted Prisma read-only
connection and local PGlite. Actual schema execution and migration-history handling
must use the separately verified CLI path after Gate 2; no connector permissions
were changed here.

Foundations were delivered first in `e86973c7e` and `3f7220e2c`; runtime readers,
contracts and the full-pool planner were delivered in `d1f078f7b`. Root's family
alias/format-intent and backend commits were integrated for compatibility checks.
The final follow-up commit contains the protected operator, ACL guard, snapshot
correspondence fixes, request memoization, tests and this report.

## Implemented boundaries

- `Problem.questionGroupKey` is nullable text, with direct-key and
  `(unitId, questionGroupKey)` indexes. Existing UUIDs, codes, external IDs,
  family keys, foreign keys, stored tests and student records are unchanged.
  `questionIdOf(row)` returns the stored key or `row:<actual UUID>`.
- `proveQuestionPair` accepts exactly two actual rows under the three complete
  known external-key grammars. It requires stored format correspondence, the
  seven shared metadata fields, exact stem/five-choice/answer correspondence,
  equal solution and all six figure fields. Missing evidence, other seeds,
  native singletons, ambiguous pairs and conflicting existing keys are refused.
  No algebraic or SVG normalization supplies proof.
- The `BEFORE UPDATE` trigger invalidates that row's key on any actual change
  to the 18 identity fields, including an UPDATE that also supplies a key.
  Key-only, no-op identity, eligibility and timestamp updates retain it.
- `questionFormats.contract.ts` fixes actual representation metadata and
  selection types. `BankProblem`/`StudioProblem` retain actual `id`, with optional
  `questionId` and `{problemId,format,revision,state,reasonCode}[]` for compatibility.
  Unknown format is null/unverified and is never relabeled descriptive.
- `identity=question` enables shared grouping before pagination on studio/dev
  list and `/api/problems`. Source, facet, material and bootstrap counts use
  question unions under their existing scopes and same-row filters. Exact-ID
  recovery preserves all requested actual rows, marks `queryMode=exact_ids`, and
  reports a question total; its row array is not an inventory count.
- `loadUnifiedBankBootstrap("question")` omits full problem payload reads.
  Identical source-facet scopes share a request-local metadata promise; overlapping
  scopes intern candidates and share exact classification results in one
  Repeatable Read transaction. No account data is cached across requests.
- Strict persisted pair proof certifies five generated choices for its MC row.
  `questionFormatWithoutContent` reuses `classifyFormatWithChoices` for that
  certificate; NULL/unrecognized keys use the existing exact classifier and
  ambiguous rows read only content. Pool scans never select SVG or solutions.
- Production/dev detail readers share one Repeatable Read helper. A complete
  native row always carries its own revision in `withQuestionMetadata`, so a
  subsequent sibling lookup cannot stamp newer metadata onto older content.
  An inconsistent partial payload is rejected without rewriting its body.
  Readiness accepts `{ids,selections?}`, requires matching actual IDs, and
  returns 409 when identity, format, eligibility or revision changed.
- `solveQuestionSelection` searches the full actual candidate pool jointly for
  unit allocations or global count, optional Korean format counts, difficulty
  intent, unique question and optional unique family constraints. Missing intent
  and zero remain distinct. It returns `complete`, `insufficient`, or
  `search_limit` with a witness; a bounded search is never labeled a proved
  shortage. A representation is never replaced by another same-family seed.
  Both compose and direct-count random requests accept the shared `formats`.
- Root's `familyIdOf`/canonical aliases are used in selection and family reads.
  `expandQuestionProblemIds`, `excludeQuestionsWhere`, `withQuestionMetadata`,
  and transaction-aware `validateQuestionSelections` are shared with Root's
  basket/daily/recent/usage implementation. Root-owned backend/UI files were not
  independently edited by this worker.

## DDL and protected operator

Migration created with Supabase CLI `migration new`:
`supabase/migrations/20261018063016_question_group_identity.sql`.
SHA-256: `b36dae98a6e343a5207fc61e77e52fa050bde6dd8a8b75bfce57507baaa0b64c`.

The actual pre-DDL catalog has RLS disabled on `public.problem`, no policies,
and owner-issued non-grantable table INSERT/UPDATE grants for `anon` and
`authenticated`. Merely revoking a column grant would leave those table grants
effective. The DDL atomically converts only those two direct write grants to the
exact pre-existing columns. It preserves SELECT/DELETE/other privileges,
`service_role`, owner rights, RLS and policies. It verifies all old-column writes
and denial of new-key INSERT/UPDATE with effective `has_column_privilege`.
Unexpected grantors/grant options or remaining PUBLIC/inherited write access
abort the complete DDL for a fresh catalog review. The trigger is SECURITY
INVOKER with fixed search_path and its PUBLIC/anonymous/authenticated EXECUTE
privileges revoked.

`scripts/import/question-group-backfill.ts` supports read-only `--prepare`,
and separately gated `--apply`/`--revert` with approval and receipt files. It
requires the exact protected manifest file SHA, exact DDL SHA, matching approved
Gate 2 scope/reviewer, and `MATH_QUESTION_BACKFILL_WRITE` equal to the manifest
SHA. Manifests are not overwritten; protected files use mode 0600, directory
0700, fsync and atomic rename. Preparing explicitly sets a Repeatable Read
transaction READ ONLY.

Before every short write transaction, rows are locked in sorted order, the
quarantine overlap is rechecked, and current actual pairs are re-proved. Full
row payload digests and JSON CAS protect every field other than the key.
The only SET column is `question_group_key`; readback checks every other field,
including updatedAt/content/eligibility/code, and both expected keys. Conflicts
or partial pre-existing pairs are refused. Completed receipts permit idempotent
reruns; revert is limited to that receipt's applied pairs and refuses changed
payloads or foreign/replaced keys. An unsettled crash journal is retained for
explicit reconciliation rather than silently claiming ownership of a write.

The loader calls `assignProvenEngineQuestionGroups` only after creation and
provenance readback. It locks and reads persisted content/figures, proves the
actual pair, writes keys only, and checks payload invariants. Unproved or native
singleton groups remain separate. Proofless direct SQL by a privileged operator
still passes key-only updates by design; it is prohibited operationally. Browser
roles are separately denied direct key writes by the DDL.

Current Supabase changelog, trigger/index docs, column-privilege docs and installed
Next route-handler documentation were read. Relevant privilege behavior is in
[Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security)
and [PostgreSQL GRANT](https://www.postgresql.org/docs/current/sql-grant.html).
Own APFS-cloned node_modules was used for Prisma generation with placeholder
local URLs; the shared main client was not generated.

## Current read-only proof and performance evidence

The immutable 118,020-row audit snapshot reproduced 51,475 known candidate
groups, 47,748 exact-two-row candidates and **47,746 proved pairs**. The only two
pair rejections were SVG and solution disagreement, matching the approval.

The current database was then read again without writes. Protected preview:
`/Users/pss/orca/workspaces/today_/math-question-core-20261018/.qa-artifacts/math-question-formats-20261018/question-backfill-preview-acl-r1.json`.
Actual file SHA-256:
`c26c6dd3ed8519a16341aaaf6e861f4ba8bdc1ee060e835fa219931361e1cfe5`.

| Current preflight | Result |
| --- | ---: |
| Engine-prefixed physical rows read | 100,974 |
| Parsed candidate groups | 51,475 |
| Proved pairs / target rows | 47,746 / 95,492 |
| Target overlap with `problem_outer_wall_quarantine` | **0** |
| Unpaired/cardinality groups retained separately | 3,727 |
| Unproved two-row groups retained separately | 2 |

This is a **pre-repair preview**, not an approved executable manifest. The chosen
execution sequence is 17-row repair approval/application, DDL, fresh current
manifest and separate Gate 2 approval, then backfill. The preview cannot replace
that fresh post-repair proof.

`core-current-read-performance.json` records actual current READ ONLY
EXPLAIN ANALYZE/BUFFERS and measurements, with scope and limitations attached:

| Measured workload | Result |
| --- | --- |
| Pre-DDL eligible metadata scan, 1 request, 5 samples | p50 1,231.85 ms; p95 1,238.74 ms |
| Same scan, 5 independent parallel read transactions | p50 3,112.42 ms; p95 5,180.85 ms |
| That process's peak RSS after the series | 1,810,235,392 bytes |
| Fresh projection-only process, simulated proved keys, one scan reused for four equal scopes | 1,795.91 ms; peak RSS 936,869,888 bytes |
| Fresh projection metadata / ambiguous content JSON bytes | 42,393,853 / 2,063,004 |
| Fresh projection ambiguous body rows / SVG bytes in scan | 6,355 / **0** |

The fresh projection reads actual current rows and classifies actual content,
while using protected preview keys in memory because the shared DDL/backfill
has not run. It is a single observed projection measurement, not endpoint p95.
First observed execution is not a controlled cold-cache result. The original
metadata-only parallel series is distinct from the fresh projection process.
New-index plans, actual post-DDL role ACLs, and three-request complete endpoint
p95 remain the coordinator's staging/Gate 2 checks. These measured costs do not
establish production performance readiness.

Raw-eligible logical projection is **67,842**. The new classified-available
projection is **67,799**, because 43 eligible legacy rows have unverified format;
they remain in held inventory. These are distinct definitions, not a data loss
or a change to legacy eligibility. Held question projection remains **70,274**.

## Verification and remaining gates

17 targeted files / **286 tests passed**; full repository TypeScript check
(`node --max-old-space-size=8192 .../tsc --noEmit`) passed; changed-scope ESLint
passed with zero warnings/errors. Tests cover exact proof adversarial fields,
known feasible format counterexamples, family crossing difficulty tiers,
question uniqueness with family restriction off, list/count/facet/GET/POST/dev
parity, legacy row behavior, exact-ID recovery, recent sibling expansion,
snapshot/revision correspondence, stale readiness409, and Root's basket/daily/
usage compatibility. Local PGlite tests cover all 18 invalidation fields,
old-code/key-only writes, code-freeze coexistence, ACL conversion and
PUBLIC/inheritance rollback, quarantine preflight, approval hashes, payload CAS,
short-transaction rollback, idempotency, receipt-scoped revert, and persisted
loader proof. They do not prove the deployed Supabase role configuration.

Remaining outside this worker's authorized execution: separate Claude Gate 2
approval of the actual DDL and fresh post-repair manifest; deployed catalog/ACL
and index/lock/performance checks; and shared write/deployment authorization.
The content worker owns the 17-row mathematical corrections, reinforcement's
174-row upper bound and pending print-check items; no physical print completion
or measured student-learning effect is claimed here.

## Backfill scale protection follow-up — 2026-10-18

This follow-up changes only the operator, local tests and scale evidence. It
performs no shared database reads/writes/DDL, content repair, generation, push or deployment;
the preview below remains stale pre-repair input and must never be applied.
The coordinator reports the separately approved DDL is already applied with its
role catalog verified; fresh post-repair manifest approval and execution remain
the coordinator's work.

The changed `scripts/import/question-group-backfill.ts` SHA-256 is
`66194f3dcf0ca0b7d4d0069250e2648745efbe3ab3838e9a95e3f3b2f902421a`.
The approved plan and DDL bytes retain their SHA-256 values above. Claude's
execution review must bind this changed operator source as well as the new
post-repair manifest; the scale input supplies no execution authority.

The default is now **100 pairs / at most 200 locked rows per chunk**, with
programmatic chunk sizes restricted to integers 1–100. Each chunk locks IDs in
sorted order, checks current quarantine overlap is zero, and finishes every
payload digest, actual pair proof and existing-key conflict check before its
single parameterized `UPDATE … FROM (VALUES …)`. Every target has a unique row
ID, an exact JSON preimage excluding only `question_group_key`, and a key CAS.
Only that key appears in `SET`; the exact affected row count and full readback
remain mandatory. The 3-second lock, 15-second statement and 20-second
transaction bounds are unchanged. Unique target joins also follow the
[PostgreSQL UPDATE contract](https://www.postgresql.org/docs/current/sql-update.html).
The loader's two-row path is unchanged.

Manifest/receipt pair membership, applied/reverted membership and readback
lookup use maps/sets. Full pair canonical equality still rejects changed row
IDs, digests, before-keys and foreign pairs. Duplicate applied pairs and foreign or
duplicate reverted keys are refused before any checkpoint or transaction.
The v1 receipt schema is unchanged: the CLI writes compact JSON whitespace,
retaining the complete ownership arrays, pre-transaction `pendingChunk`, atomic
rename, 0600 file / 0700 directory and both file and directory fsync. Manifests
retain their exact pretty serialization and SHA gate. An unsettled journal
still requires explicit reconciliation, including after SQL committed but its
completion checkpoint failed.

The reproducible aggregate is [question-backfill-scale.json](question-backfill-scale.json),
created by `scripts/qa/bank/question-backfill-scale.ts --manifest
.qa-artifacts/math-question-formats-20261018/question-backfill-preview-acl-r1.json
--report <aggregate.json> --full-checkpoints` through the existing local `tsx`.
It imports no connection configuration, creates no database client and refuses
all row queries/transactions; only its two catalog answers are synthetic. The
47,746-pair input bytes were independently checked against the protected SHA
`c26c6dd3ed8519a16341aaaf6e861f4ba8bdc1ee060e835fa219931361e1cfe5`.

| Full 47,746-pair local scale measurement | Result |
| --- | ---: |
| Protected manifest bytes / parse time | 24,262,301 / 27.19 ms |
| Approval validation, five samples, median | 35.70 ms |
| Worst-order complete receipt membership, five samples, median | 147.39 ms |
| Full pretty / compact receipt bytes | 24,255,333 / 17,523,107 |
| Full pretty / compact serialization median | 20.05 / 14.13 ms |
| All compact apply checkpoints, with actual file + directory fsync | 957 in 18.12 s |
| Cumulative serialized bytes actually written | 8,406,614,980 |
| Slowest measured checkpoint | 77.91 ms |
| Temporary receipt directories retained | 0 |
| Derived key UPDATE calls, versus previous per-row calls | 478 / 95,492 |
| Derived raw SQL calls including catalog checks, excluding BEGIN/COMMIT | 2,870 |
| Derived receipt checkpoints, versus previous 20-pair default | 957 / 4,777 |

Each checkpoint still rewrites the full growing receipt. The measured 8.41 GB
is cumulative file data, not concurrent disk usage or hardware write-amplification
measurement. There are 957 file fsyncs and 957 directory fsyncs, and an existing
receipt can coexist with its new temporary file before rename. Apply reruns
still prove/read back every chunk and retain both checkpoints per chunk; they
issue zero key UPDATEs when keys already match. Such a full-receipt apply rerun
would serialize about 16.8 GB cumulatively (derived, not a measured second disk
run); it does not get the smaller growing-receipt profile of the first apply.
Revert keeps this receipt's
ownership only. No journal compaction, skipped ownership checkpoints or new
recovery protocol was introduced.

**Validation:** 2 relevant files / **92 tests passed**, including all prior
32 DDL tests and 21 additional operator protections. A 201-pair real local
PGlite apply produces exactly three UPDATEs (800, 800, 8 bound parameters),
then rerun produces zero, and its own revert preserves every non-key field.
Late proof/key conflicts and quarantine overlap attempt no UPDATE; one bound
JSON preimage CAS miss updates only three of four candidates and causes the
entire transaction to roll back. Tests also cover missing/disabled DDL and role-access
refusal, foreign receipts, invalid chunk limits, durable compact JSON and
post-commit checkpoint failure. Getter-count regressions at 256/1,024 pairs
bound manifest membership visits to at most four per pair, without timing
thresholds. Scoped ESLint, the committed
`scripts/qa/bank/question-backfill-scale.tsconfig.json` TypeScript check and
`git diff --check` pass. Existing cloned dependencies were used unchanged.

These are local CPU/I/O and PGlite semantics, not shared-database latency,
concurrent-lock behavior, production throughput or Supabase role evidence.
Up to 200 full payload JSON preimages can still be large, and the unchanged
timeouts can refuse a slow chunk. Final manifest regeneration, independent
Claude Gate 2 review and real apply/readback/rerun remain with the coordinator.
