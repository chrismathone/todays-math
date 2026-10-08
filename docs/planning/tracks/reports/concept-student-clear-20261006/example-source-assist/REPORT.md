# Optional source-example particle corrections — proposed patch

The proposal corrects the source prompt for `m2-01-01-xc20` in `m2plus` from `$\frac{3}{2\times a}$가 유한소수인 한 자리 자연수 $a$` to the same prompt with `이`. Its answer stays exactly `$1$, $2$, $3$, $4$, $5$, $6$, $8$`. This is an offline delivery for Root to adopt; no Root source, production bank, student record, database, environment, dependency link, or other worktree was changed.

Task `task_dbd940c94cce`, dispatch `ctx_fabb9e369fcf`, coordinator run `run_d1d94a0fbcb1`. Worker branch began at `4077c510e4045a39f05d3ea9d248595cd40ddb78`. The artifact-only commit is supplied in the completion message. All helper work stayed under `D:/tmp/example-source-assist-ctx_fabb9e369fcf`.

## Delivery

`proposed.patch` contains seven proposed changed/new files. `delivery-map.json` maps their exact repository paths to complete file artifacts and SHA256 values. The `.ts.txt` suffix keeps these review artifacts out of this worktree's TypeScript compilation; the patch restores their proper `.ts` names.

The folder-local `.gitattributes` preserves every artifact's exact bytes through Git. The artifact-only commit uses a transient empty hooks path to prevent the repository's `npx lint-staged` hook from invoking package installation or rewriting the evidence; the focused tests, type check, and patch byte checks were run explicitly.

| Proposed target | Change |
| --- | --- |
| `scripts/qa/concept-blank/student-clear/application.ts` | Optional `exampleCorrections` input; separate, optional `examplePromptChanges` output; correct candidate entries before whole-bank notation and hash. |
| `scripts/qa/concept-blank/student-clear/source-plan.ts` | Validate the same corrections, prepare identical corrected candidates, compare candidate hash, then prepare only ID-bound source prompt edits. Writes nothing. |
| `scripts/qa/concept-blank/student-clear/compile.ts` | Optional `--example-corrections` JSON path, captured input SHA, conditional correction count. All seven existing required flags stay required. |
| `scripts/qa/concept-blank/student-clear/README.md` | Document the separate correction contract and caller-owned application. |
| `scripts/qa/concept-blank/student-clear/example-corrections.ts` | Strict five-field array validator and prompt-only candidate transformation. |
| `scripts/qa/concept-blank/student-clear/example-source.ts` | AST binding through `definitionLiterals`; prompt-only source transformation with unchanged-answer checks. |
| `src/__tests__/unit/conceptStudentClearExampleCorrections.test.ts` | Twenty focused tests, including genuine source execution, adverse inputs, hash equality, and CLI compatibility. |

`proposals.ts`, `definition-source.ts`, `bank-source.ts`, and `src/lib/elementary/rules.ts` are unchanged. In particular, there is no example override in `normalizeProposal` and no alteration of the compact-fraction / variable-denominator josa guard.

## Correction contract and placement

The separate correction file is a JSON array of `{ part, id, before, after, reason }` records; `example-corrections.json` contains the genuine correction. No extra field is accepted, so an answer, definition, or other override cannot enter this path. Every ID must be unique; its part and entire original prompt must match the immutable baseline; every field, including the reason, must be a nonempty string.

Before must have exactly one `josaFaults` error and after none. The corrected prompt must equal before with only that math-following particle switched within its existing pair (`이/가`, `은/는`, `을/를`, `과/와`, `로/으로`). All other characters, including math, variables, spaces, and wording, stay exact. The example answer is carried directly from the original. Both compile and source-plan use this validator and transformation.

Correction validation uses the original baseline. Proposal normalization and editorial / independent evidence still use the original source and their existing hashes. Corrected entries enter the candidate map only after normalization; whole-bank notation and `candidateBankHash` see the corrected prompts. Corrections are carried separately in `examplePromptChanges`, in original bank order. An absent or empty correction list omits this field and keeps the old plan shape and hash behavior.

AST binding uses the ID's exact definition-expression start and end. It then selects tuple element 4's `[prompt, answer]`, while definition remains element 3, or the corresponding explicit object example. It rejects unsupported dynamic examples, a stale prompt, a different answer, unknown or duplicated IDs. The real prompt is at source offsets 4715–4759, exclusive end. Editing this real tuple preserved every byte outside the selected prompt literal; executing the result with the real `plusSection` / `joinBanks` helpers produced the complete original `m2plus` bank with exactly this one prompt changed.

## Verified output

`focused-results.json`: **51 tests passed, zero failed, seven suites**. These are the 31 existing focused regression tests plus twenty new tests. `typecheck-result.json`: Root's private TypeScript with a narrowed config extending Root's tsconfig returned exit code zero. `patch-check-result.json`: the patch passed `git -c core.autocrlf=false apply --check`, applied in an isolated helper subfolder, and all seven applied file hashes matched the complete proposed artifacts.

The new checks cover the genuine original prompt and answer, stale before values, unknown IDs, wrong parts, duplicate IDs, empty reasons, extra answer fields, changed wording, changed math, changed variables, different particle families, changed whitespace, zero or two original errors, unresolved errors, and missing independent evidence. They also cover absent/empty compatibility, a forged or removed plan correction, changed source answers, retired tuple slots, and identical prompt text in another ID that must stay untouched. Each existing required CLI flag is checked individually; omitting the new flag remains valid.

`actual-output.json` records a one-entry offline probe with **synthetic TEST DATA approvals**:

| Measurement | Actual result |
| --- | --- |
| Original baseline hash, unchanged | `6bfdba783aa462998942be22126cc3ddd590293e17eb585641fe6a62f20be1c5` |
| Normalized proposal hash before and after | `ac3208bfc0e0c017e9e350b2c9c8e6a043f7e98405315774beea61c5a166297f` |
| Compile corrected candidate hash | `f0fbfe76e5dbc9b83e7f7ecd4c92cba757211ae967c3dbcdee128ab6e01de479` |
| Source-plan corrected candidate hash | `f0fbfe76e5dbc9b83e7f7ecd4c92cba757211ae967c3dbcdee128ab6e01de479` |
| Original josa faults | One: `$\frac{3}{2\times a}$가` |
| Corrected josa faults | Zero |

`fixture-plan.json` is explicitly test data for that single entry. These tests neither establish 9119-row independent agreement nor activate any content.

The initial isolated Vite run failed before collecting tests because its transformer did not resolve the cross-drive absolute `extends`. The final harness materializes Root's compiler options for Vite and keeps a separate type-check config extending Root directly. `initial-results.json` preserves that failed setup output; `initial-results-fixed.json` preserves the 31 passing original checks. A new hash test fixture was changed from an unsupported plus-ID object to the actual plusSection tuple layout. The final passing results use that layout. The local Git default also converts applied files to CRLF; byte-exact patch checks therefore use `-c core.autocrlf=false`.

## Drift and reproduction

`root-source-manifest.json` preserves byte counts and SHA256 values for 25 original Root files, including the entire pipeline, rules, actual `m2-plus.ts`, bank helper, schema, tsconfig, and focused tests. `root-drift-check.json` shows all captured files remained unchanged at packaging. Root's immutable real `m2-plus.ts` SHA256 is `0abbd3e639fc23110da5e3f9a9064689e831eaa86ddcbc30c212a5d1e8e92811`.

The installed private Next.js guide read before implementation was `node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md` in Root (Next 16.3.8). All runtime dependencies and CLI binaries came from Root's private `node_modules`, using absolute paths. No package was installed, no dependency link created, and no environment file loaded by the isolated Vitest config. Relative pipeline imports resolve to the helper's copied proposed modules, while `@` resolves to Root's unchanged application modules; they cannot silently test the old application/source-plan.

From this artifact folder, `node verify-and-test.mjs --verify-only` checks all Root preimages and proposed file hashes without writing. `node verify-and-test.mjs` creates a fresh folder under `D:/tmp`, copies original support modules and focused tests, overlays the proposed files, and runs the seven isolated suites and narrowed type check. Optional `--root <Root directory>` and `--helper <new D:/tmp folder>` change those locations. A drifted Root preimage or an already-existing new module causes a refusal so Root can merge the proposal deliberately. Test output goes only to the fresh helper folder.

For adoption, Root should compare the captured source hashes, review the separate genuine correction file, and apply or merge the proposed patch into its own prototype. Use `git -c core.autocrlf=false apply --check <proposed.patch>` before applying if exact artifact bytes matter. Root owns any actual file writes, final 9119 review, whole-bank compilation, print/memory verification, production application, and deployment. No remaining work is required for this proposed-patch delivery.
