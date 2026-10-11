# Codex subscription textbook retry

This offline path uses the existing Codex CLI ChatGPT login. It does not load `.env`, inspect/copy authentication files, call a model API, instantiate a DB client, insert rows, or approve mathematical answers. Application provider defaults stay unchanged. Run from the repository root with its existing dependencies.

```powershell
# Default: inspect a bounded plan, zero model calls / DB writes.
npx tsx scripts/import/textbook/codex-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/source-snapshot.json --limit 10

# Explicit generation: at most 10 originals, one original running at a time.
npx tsx scripts/import/textbook/codex-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/source-snapshot.json --generate --limit 10 --concurrency 1 --out .qa-artifacts/textbook-codex-retry-20261011

# Continue the same snapshot; completed pairs are preserved.
npx tsx scripts/import/textbook/codex-retry-20261011/cli.ts --snapshot .qa-artifacts/textbook-db-variants-20261011/source-snapshot.json --generate --limit 10 --resume --retry-failed --out .qa-artifacts/textbook-codex-retry-20261011
```

The snapshot is the existing `{rows:[{problem,unit,book?}],children:[...]}` export. Actual snapshot filenames may differ; supply the coordinator's real export. `--source-ids` accepts a JSON array of UUIDs. `--generate` requires an explicit limit from 1 to 100; concurrency is 1 to 4, default 1. There is no `--apply`, provider, model, or API-key option. Held, already paired, and conflicting originals are excluded. The coordinator must re-read current DB provenance and figures before insertion, since this generator deliberately works from the snapshot.

Both slots are committed to one local source checkpoint only after generation and deterministic structure/provenance checks succeed. Generated rows remain pending drafts with `mathematicalApproval:false`. Generator self-reproduction is never independent review. New FigureSpecs go through the existing strict renderer; actual source SVG/raster bytes go through `loadDbRetryFigures` and are attached as validated PNGs.

Checkpoint files use `DbRetryCheckpointStore` and `DbRetryGeneratedPair` unchanged, including pair IDs, source/unit/format metadata, origin/source/figure fingerprints and candidate payload digests. Existing pending drafts in that format can be reused with their original `--out`, exact original snapshot and `--resume`; they are skipped without inference. The CLI does not automatically import other draft formats or replace existing drafts. `sources/<id>.codex.json` links the new candidate digest to successful CLI receipts; failed CLI receipts remain in `receipts/<id>/` even if generation cannot finish.

SIGINT/SIGTERM abort active child process trees, stop scheduling and release the local run lock after active jobs settle. Failed sources require `--retry-failed`; a interrupted `generating` source can resume. A hard process kill can leave `.run.lock`: inspect its PID and prove the old process has exited before removing that **single file**. Never remove a live lock or recursively delete a worktree or its `node_modules` junction. Snapshot or source fingerprint drift fails closed.

Each source currently uses fresh CLI sessions for its two slots. This preserves isolation and existing generation semantics, but repeats CLI context overhead. The real smoke observed 16,663 input tokens for a tiny task; throughput and quota use need measurement before a large run. The interface can support future bounded grouping, but this implementation does not claim grouped throughput.

## Shared transport for review owner B

```typescript
import { runCodexJson } from "./transport";

const result = await runCodexJson<MyOutput>({
  phase: "blind-solve", // safe letters/digits/hyphens, max 80 chars
  prompt,
  schema, // a JSON Schema object, validated locally as well as by Codex
  images: pngPathsOrDataUrls, // optional, in prompt order
  outDir: receiptsDirectory,
  // cwd, timeoutMs (default 600000, max 1800000), signal are optional
});
// { value, auth:"chatgpt", threadId, model:string|null,
//   usage:{inputTokens,cachedInputTokens,outputTokens}|null, elapsedMs, receipt }
```

`CodexReceipt` in `transport.ts` is the exact exported receipt type. It records CLI version, auth check, exit code/signal, successful turn/schema flags, observed model flag, thread ID, observed usage, timestamps, prompt/schema/image/output/stream hashes and output/receipt paths. It stores no raw stdout/stderr, credentials or environment dump. Model absence is `null`, not a guessed model name. Existing generator call metadata uses `requestedModel:"codex-account-default"` and `model:"codex-model-unobserved"` when the CLI exposes no model; the receipt remains authoritative.

The child gets argument arrays and stdin with `shell:false`; Windows npm launchers are invoked through Node rather than interpolated shell commands. API-key/token/secret/password/DB variables and API routing overrides are stripped. Saved auth location remains intact. Each call checks `codex login status`, enforces `forced_login_method="chatgpt"` and the OpenAI provider, and leaves the account's default model unchanged. No `--model` is added. The CLI runs read-only, without shell execution, hooks, apps, multi-agent delegation or web search enabled; unexpected tool activity causes rejection. Callers must request a self-contained answer using only their supplied evidence.

Each call gets a unique artifact directory, strict PNG decoding (size/pixel limits), and a unique final message path. Success requires exit 0, no signal, valid JSONL events, a thread, an unfailed completed turn, valid final JSON and local schema validation. Timeout, cancellation, malformed JSON, wrong schema, missing final file, other auth and unexpected tools all fail closed with a sanitized receipt. PNG paths are copied into that call's directory; data URLs must be canonical base64 PNGs. SVGs and remote URLs must first go through the existing figure loader/renderer.

Local validation uses the installed Zod `fromJSONSchema` with a fail-closed keyword subset: object properties/required/additionalProperties, arrays/items/length bounds, primitive types, enum/const, anyOf/allOf, string length/pattern, numeric bounds/multipleOf, local `$defs`/`$ref`, plus title/description/`$schema`. Unsupported keywords are rejected before inference. `T` is a compile-time assertion: supply a matching schema and validate any additional domain rules in the caller. Arbitrary FigureSpec objects are transported as a JSON string within the strict generation schema and parsed before rendering.

## Verification

```powershell
# Unit tests forcibly block process launches and use injected runners.
node node_modules/vitest/vitest.mjs run --config scripts/import/textbook/codex-retry-20261011/vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit -p scripts/import/textbook/codex-retry-20261011/tsconfig.json

# Opt-in only: exactly one real subscription inference with a tiny local PNG.
npx tsx scripts/import/textbook/codex-retry-20261011/smoke.ts --live .qa-artifacts/codex-transport-smoke-new
```

Official references read on 2026-10-11: [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [authentication](https://learn.chatgpt.com/docs/auth), and [Zod JSON Schema](https://zod.dev/json-schema). Relevant local Next guide read before implementation: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`. See `REPORT.md` and `evidence/` for the one completed live smoke; it proves transport/schema/image handling, not textbook quality or independent mathematical review.
