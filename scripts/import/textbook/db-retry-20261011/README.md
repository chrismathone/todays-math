# DB-original two-variant runner

Run from the repository root. The default is an offline snapshot plan: no model
calls, DB connection or output mutation. The snapshot format is the existing
`{rows:[{problem,unit,book,material}],children:[...]}` database census; problems
and children use the raw snake_case database columns. Unit grade/chapter/section
are the prompt context. IDs and full source JSON, including update time and
figure metadata, are hashed without normalizing or rewriting originals.

```powershell
npx tsx scripts/import/textbook/db-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/pilot-qualified-snapshot/source-snapshot.json --limit 8
```

Generation is explicitly enabled by `--generate`; it writes local draft
checkpoints and reads the live DB before spending on each source. It does not
insert or approve problems. Integrate ownership C's `dbRetryFigures.ts` first;
this runner never substitutes text-only generation when asset loading fails.

```powershell
npx tsx --env-file=.env scripts/import/textbook/db-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/pilot-qualified-snapshot/source-snapshot.json --out .qa-artifacts/textbook-db-variants-20261011/db-retry-run --generate --limit 8 --concurrency 2
```

Slots 1/2 are numerical/condition variants respectively, each generated from the
same DB original. Both preserve the question format, unit and solution level.
Since 2026-11-11 (원장님 «deepseek 사용처를 전부 sonnet 으로») every call — text or figure — uses
Claude Sonnet 5.5 (`claude-sonnet-5-5`, effort medium), or Claude Opus 5.5 (`claude-opus-5-5`, effort high)
when the DB original is «심화상»; figure calls carry the actual C-loaded image bytes and original choice
indices. The key is `ANTHROPIC_API_KEY`. (Runs before that date used `deepseek-v4-pro` / `deepseek-flash`.)
The existing transform prompts, JSON repair, math normalization and wordy
operator normalization are reused. The new system prompt uses the actual grade.
Solutions are required. Each source makes two sequential calls, with at most
one retry for a parse failure per slot; truncation/transport failures are not
retried. Transport retries are disabled. The default max token budget is
64,000 (thinking shares it), with the `TEXTBOOK_RETRY_MAX_TOKENS` override (4,096–128,000).

Every call retains requested/returned model, start time, latency, token usage
(including reasoning/cache hits when returned) and finish reason. Failed
attempts retain usage when a response was received; transport failures have
unknown usage. Checkpoints do not contain API keys, DB URLs, image base64,
raw reasoning or raw provider error bodies. Output errors use fixed reason codes.

Resume uses the exact same snapshot bytes and output directory. A different
snapshot is a new run/output directory; an old source digest is never silently
replaced. Resume skips generated/inserted/existing pairs and continues an
interrupted `generating` job. Failed generation is retried only when requested.
Limit counts selected jobs after these skips, and every paid/apply invocation
requires an explicit limit of 1–1,000; concurrency defaults to 2 and is bounded
at 8.

```powershell
npx tsx --env-file=.env scripts/import/textbook/db-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/pilot-qualified-snapshot/source-snapshot.json --out .qa-artifacts/textbook-db-variants-20261011/db-retry-run --generate --resume --retry-failed --limit 8 --concurrency 2
```

Insertion is a separate explicit `--apply` invocation, using generated
checkpoints. It also requires the existing `ALLOW_SHARED_IMPORT=1` environment
gate. Root owns executing this command against the shared database.

```powershell
$env:ALLOW_SHARED_IMPORT = '1'
npx tsx --env-file=.env scripts/import/textbook/db-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/pilot-qualified-snapshot/source-snapshot.json --out .qa-artifacts/textbook-db-variants-20261011/db-retry-run --apply --resume --limit 8 --concurrency 2
```

The two UUIDs and insertion payload digest are saved before the transaction.
Transactions serialize this importer by source with an advisory lock, hold
`FOR SHARE` on the live problem and unit, compare captured source/context
digests, and insert exactly two rows in one transaction. New rows are always
`reviewStatus=pending`, `directUseAllowed=false`. Parent, material, unit,
family and source-file links are preserved; slots remain
`tb-retry-v1:<source UUID>:1|2`. A complete linked existing pair is preserved
verbatim even after manual edits or approval. Partial/mislinked pairs are
conflicts and never filled. There is no update, upsert, promotion or deletion.
After insertion, payloads and pending flags are read back inside the transaction.
Any failure rolls back both rows. Live source assets are loaded again before
insertion and their byte/choice/origin digest must still match generation.

Each `sources/<UUID>.json` has an atomic per-original checkpoint. An inserted
entry carries `receipt.ownedIds`, both external IDs, source/candidate/storage
digests and commit observation time. `last-run.json` is a summary, not the
ownership ledger. A crash after DB commit is recovered with the preallocated
UUIDs and exact payload equality; another run's preexisting rows are never
claimed. The receipt's time on recovery is when the existing commit was observed.
A checkpoint write failure stops scheduling new work and drains already-started
jobs before releasing the lock. A `.run.lock` prevents simultaneous writers to
the same output. After a hard process crash, inspect its stored PID and remove
only that lock file after verifying the owning process has exited.

`generateDbRetryPair(origin, sourceFigures, {complete?, renderFigure?, now?})`
is injectable for tests; pass C's async `renderDbRetryFigure` for diagrams.
Generation reproduction matches/mismatches and render safety are candidate
evidence. They do not authorize mathematical correctness or production use.
Independent blind solving, solution review, semantic judgments, production
rendering and qualification belong to B/C/root's separate evidence gate.

```powershell
npx vitest run src/__tests__/unit/schoolTextbookDbRetryGeneration.test.ts src/__tests__/unit/schoolTextbookDbRetryBatch.test.ts
npx tsc --noEmit -p scripts/import/textbook/db-retry-20261011/tsconfig.json
```
