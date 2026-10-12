# Grouped Codex subscription generation — 2026-10-11

Implemented on base `490c6df8f1e1d4dafe9aad5117cf5f037a6cad7b` in the five assigned new TypeScript files. The exact resulting commit is reported through the dispatched Orca `worker_done` message. No existing transport, generation, review, qualification, QA, application, database, environment, or dependency files were changed; no nested workers were launched.

## Behavior

- `batch-cli.ts` defaults to a dry-run. Generation requires `--generate --limit`; the limit counts selected originals and is bounded to 1–1000. `--batch-size` is 1–16 (default 8), and `--concurrency` is 1–3 (default 1). `--snapshot` consumes the coordinator's current JSON snapshot, while `--source-ids` consumes a JSON UUID array; the programmatic API also accepts `sourceIds: string[]`. There is no apply, provider, model, or database option.
- One strict-schema `runCodexJson` subscription turn generates both slots for every member of a group. The owner update relayed in `msg_4ba35321a771` allows meaningful numeric changes in both slots, or condition/method changes in either. Existing recipe keys remain `ai-db-numbers-v1` / `ai-db-conditions-v1` for compatibility; `method` and a generator-transformation check retain what was actually requested. Numeric claims with unchanged numeric literals and identical/whitespace-only duplicates fail structural validation. Deeper semantic judgments remain the independent reviewer's responsibility.
- Every source keeps its ID, canonical hash of **all** raw snapshot problem fields, full origin/curriculum digest, actual source-figure digest, and metadata. Ordered attachments retain global image number, per-source image index, choice association, source-byte hash, original evidence hash, and the hash/dimensions of the actual PNG sent to Codex. JPEG/WebP/GIF input is decoded and converted to PNG. Hash, order, source SVG bytes, image origin, and the returned transport receipt must agree.
- Output order is arbitrary; attribution uses source ID and numeric slot. Wrong, duplicate, missing, stale, extra, truncated, or malformed output fails closed. An invalid member rejects the entire group before any generated checkpoint is written. Figure-bearing candidates require a new FigureSpec rendered through the existing strict engine adapter; returned SVGs are independently decoded and checked for evidence correspondence, reused source imagery, and unsafe/embedded rasters. Missing figure markers/evidence are rejected explicitly.
- Every pair uses the existing `DbRetryGeneratedPair` and candidate shapes and the existing pending-row structural validator. `mathematicalApproval` is always false. Supplied source questions, answers, and solutions are generation context, not independent review evidence.

## Checkpoints and accounting

`checkpoint.json` and `sources/<sourceId>.json` use the existing checkpoint wire format. Existing pairs, calls, attempts, insertion ownership, and snapshot manifest are preserved on resume. The exact original snapshot byte hash must match; source mutation during generation or figure loading is rejected. Failed entries are selected again only with `--resume --retry-failed`. A fresh interrupted `generating` entry is resumable. The run lock is released after active bounded workers settle.

The original checkpoint module imports `dbRetryGeneration.ts` at runtime, which imports the paid-provider default. Under the assigned ownership restrictions, `batch-runner.ts` therefore contains a local compatible checkpoint adapter instead of importing that module. Production runtime imports of both legacy generation modules are absent; their types are erased. A recursive TypeScript AST test follows static and dynamic runtime imports from `batch-cli.ts` and rejects paid SDKs, provider defaults, and database clients. A separate compatibility test reads grouped checkpoints through the original `DbRetryCheckpointStore`, with only its provider-owning dependency mocked out. A future authorized shared-module extraction can remove this adapter duplication.

Shared accounting is deliberate:

- `grouped-calls/<groupId>.json` contains one shared receipt, usage, member/source bindings, attachment bindings, raw-item hashes, and actual normalized candidate hashes. Failed call records are retained too.
- `sources/<sourceId>.codex-grouped.json` contains the shared call path/receipt ID and that source's candidate hashes; it has **no copied usage totals**. `pair.calls` is empty for grouped generation, and existing checkpoint calls are preserved.
- Sum usage from unique grouped call receipts only. Do not multiply it by member/slot count or add the transport's own copy of the same receipt. Tools that sum only legacy per-source `calls` will not include grouped usage until they read these shared call records.

## Verification

Passed 89 tests across all four files in the targeted Codex suite, including 60 grouped tests. The existing test safety setup blocks every child-process launch; model/transport behavior is supplied entirely by injected runners. Tests cover shuffled output; exact source/slot attribution; partial output; failed transport; cancellation; 16-member groups; concurrency and count limits; source/figure/receipt mutation; new SVG validation failures; atomic pair rejection; preserved old checkpoints and snapshot hashes; explicit failed retries; existing-reader compatibility; and the provider import graph.

Commands completed successfully:

```text
node node_modules/vitest/vitest.mjs run --config scripts/import/textbook/codex-retry-20261011/vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit -p scripts/import/textbook/codex-retry-20261011/tsconfig.json
node node_modules/eslint/bin/eslint.js scripts/import/textbook/codex-retry-20261011/batch-generation.ts scripts/import/textbook/codex-retry-20261011/batch-runner.ts scripts/import/textbook/codex-retry-20261011/batch-cli.ts scripts/import/textbook/codex-retry-20261011/batch-generation.test.ts scripts/import/textbook/codex-retry-20261011/batch-runner.test.ts
```

No real model inference, paid-provider calls, database reads/writes, `.env` reads/writes, or real model/figure-engine process launches occurred during implementation and testing. Tests use temporary synthetic snapshots and checkpoints, and in-process PNG/SVG decoding. The existing `node_modules` junction was left intact.

## Remaining limits

The coordinator still owns the first live subscription measurement, independent mathematical/semantic reviews, production page rendering, and all database writes. No claim is made about live 8/16-source model accuracy, actual token savings, or quotas. Generation can produce a structurally valid but mathematically incorrect or semantically inadequate draft; neither the self-reproduction check nor the change description grants approval.

The existing transport caps a call at 72 PNG attachments and 8 MiB output; oversized image groups fail before inference and can be retried with a smaller batch size. Default source figure loading retains the existing local/manifest-backed asset behavior. A bad source/figure can reject its group; there is no automatic paid fallback or silent partial salvage. Figure-engine integration is wired to the existing strict adapter but was tested with injected render results, not live engine processes. Checkpoint commits are atomic per source, not one transaction across a whole group: an OS/disk interruption can leave some fully validated source pairs saved, which resume preserves while generating the rest.
