# Ownership A delivery — 2026-10-11

Implemented subscription-only `runCodexJson<T>` in `transport.ts`, a bounded snapshot-only generation CLI, an adapter for the existing pair generator, resumable checkpoints, injected-process tests, and usage documentation. The only shared-library edit is optional `DbRetryGenerationOptions.requestedModel`; existing app defaults are unchanged. No auth/token file or `.env` was read or copied, no direct model API was called, and no shared DB read/write or textbook generation batch ran in this dispatch.

## Actual live evidence

Exactly one tiny actual CLI inference was run, via `smoke.ts --live`, on 2026-10-11 at 07:09:43 UTC. The task asked for `2+3` and the color of a 16×16 red PNG; returned JSON was `{"sum":5,"color":"red"}`. It used saved ChatGPT auth, `codex-cli 0.162.1`, stdin and argument arrays, a real PNG `--image` path, `--json`, `--output-schema`, and `--output-last-message`. Exit code was 0, there was no signal or unexpected tool call, the turn completed, and local strict schema validation passed.

| Observation | Value |
| --- | --- |
| Thread | `01a129cb-cc78-7950-ad67-6c3fd78eb222` |
| Elapsed | 16,995 ms |
| Input / cached input / output tokens | 16,663 / 0 / 39 |
| Requested model | Account default; no model override |
| Observed model | `null`; JSON events did not expose it |
| PNG SHA-256 | `388efda5e67648402ce08dcdaad8d9fc394d7414033940fdb5cca1577e30b347` |
| Output SHA-256 | `960a0afc15244eac4eb5549e493472ce83bce3a73cbb78be3b3800368b385450` |

The exact receipt, final output, schema and PNG are committed in `evidence/smoke-*`. The receipt retains the original artifact paths as observed; portable copies are beside this report. Prompt/schema/image/output/stream hashes and thread/usage evidence are preserved, without full stdout/stderr or credentials. `smoke.ts` contains the exact prompt. This is transport evidence only, not a claim that a textbook pair passed independent review.

## Automated validation

- New suite: **29 passing tests**, including saved ChatGPT auth versus API auth, argv/stdin separation, API/DB environment stripping, valid PNGs and image hashes, normal exit/turn/schema requirements, timeout/interruption/process failure, malformed JSON, schema mismatch, missing final file, unexpected tool use, unknown model/usage, default dry-run, bounded CLI options, two-slot checkpoints, resume, retry, source drift and cancellation. Process-launch functions are mocked to throw, so tests cannot invoke real Codex inference.
- Existing generation/checkpoint regression suites: **37 passing tests** (`schoolTextbookDbRetryGeneration.test.ts`, `schoolTextbookDbRetryBatch.test.ts`).
- Targeted TypeScript check: `tsc --noEmit -p scripts/import/textbook/codex-retry-20261011/tsconfig.json` passed.

## Integration and remaining work

The coordinator received the exact transport interface and receipt type through Orca. Owner B can inject `runCodexJson` for the three review stages and attach ordered PNG paths or verified PNG data URLs. Original IDs, source/unit/format metadata, source/figure digests, candidate payload digests and the existing pending-pair checkpoint format are retained. `--resume` reuses intact existing drafts in that format without regenerating them; no synthetic TypeSafe/Noul confidence is created.

Root owns live DB freshness checks, independent review, layout qualification, insertion and promotion. This dispatch performed none of those production operations. Existing draft formats outside the shared checkpoint contract need an explicit root conversion. Current generation creates fresh sessions per slot and therefore repeats context overhead; grouping 8–16 text origins was considered and remains a throughput follow-up requiring a paired batch schema and honest receipt/usage attribution. The high input-token count in the tiny real call makes that limitation concrete.

Orca provenance: task `task_6015977ee2f9`, dispatch `ctx_7a48a460c0c8`, worker `term_c04f9d52-baa7-46ee-a97b-ddab23d940fc`. Runtime temporarily returned `runtime_unavailable` during implementation, then recovered; lifecycle and interface reports used the same Orca CLI throughout.

References actually read: [OpenAI non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [OpenAI authentication](https://learn.chatgpt.com/docs/auth), [Zod JSON Schema](https://zod.dev/json-schema), installed Codex `exec --help`, and local Next `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`.
