# Grouped textbook generation bindings — 2026-10-11

The grouped response schema now binds each source ID and its three digests in one
strict per-source object. Previously, the source ID was an enum while each digest
accepted any 64-character lowercase hexadecimal string, allowing another source's
digest through the schema before the mandatory binding comparison rejected the
group. The change constrains generation itself and retains those comparisons.

## Scope and implementation

- `scripts/import/textbook/codex-retry-20261011/batch-generation.ts`: pass the
  existing source-data records to the schema builder and build a `z.union` of
  strict item objects extended with four `z.literal` fields.
- `scripts/import/textbook/codex-retry-20261011/batch-generation.test.ts`: add
  regression fixtures for emitted schema shape, cross-source metadata, group
  bounds, slot coverage, and preservation of raw output and hashes.
- This report records validation and its limits. No other production file changes.

The literals come from the existing source ID, `textbookVariantSourceDigest` of
the original problem, `reviewDigest` of its complete origin, and the validated
source figure digest. They constrain the response; they are never stamped into
an erroneous response. Bad tuples now fail the local schema parse with
`grouped-output-schema`; the explicit `grouped-output-source-binding`
comparisons remain in place after parsing.

## Actual emitted schema shape

Observed with installed Zod 4.4.3 by capturing the schema passed to the injected
runner and parsing it with `z.fromJSONSchema`:

| Location                 | Emitted shape                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Root                     | Draft 2020-12 `$schema`, `type: "object"`, `required: ["items"]`, `additionalProperties: false`; no root `anyOf`                  |
| `properties.items`       | `type: "array"`, `minItems: 2*N`, `maxItems: 2*N`                                                                                 |
| `properties.items.items` | `anyOf` with exactly `N` per-source object branches, including a one-branch `anyOf` for `N=1`                                     |
| Each branch              | `type: "object"`, `additionalProperties: false`, all 12 item fields required                                                      |
| Branch binding fields    | `sourceId`, `sourceDigest`, `originDigest`, `sourceFigureDigest` each have `type: "string"` and one exact source-specific `const` |
| Branch `slot`            | `anyOf: [{ type: "number", const: 1 }, { type: "number", const: 2 }]`                                                             |
| Other item fields        | Existing transformation enum, required nonempty text fields, and required nullable string `figureSpecJson`                        |

The existing input guard permits only 1..16 distinct sources before invoking a
runner, giving 1..16 branches and exactly 2..32 items. Item ordering remains free.
The nested alternatives bind the four metadata fields together, including when
multiple sources legitimately share the same figure digest.

Per-item alternatives plus total array length cannot enforce one occurrence of
each source/slot combination. The unchanged local duplicate and missing-slot
checks provide that guarantee. Fixtures explicitly show a repeated valid source
pair or slot passing the emitted schema but failing the local uniqueness gate.

## Preserved barriers and evidence

The production diff only changes schema construction and its input. It retains
source eligibility, all provenance and in-flight mutation comparisons, exact
slots, malformed-output rejection, receipt binding, real source PNG decoding and
hash checks, generated vector rendering and evidence checks, and downstream pair
validation. Drafts still carry `mathematicalApproval: false`; existing review and
qualification requirements are unchanged.

The cross-source fixtures replace each individual binding field and all three
digests together using two distinct source bindings, with real local SVG/PNG
evidence to distinguish their figure digests. Both the emitted JSON schema and
the generator's local `safeParse` reject these values, even when the injected
runner claims `receipt.schemaValid: true`. Frozen fixture output remains
unchanged and no candidate rendering runs for these rejected bindings.

Raw-item digests continue to hash the original returned items. A frozen fixture
with padded text confirms candidate normalization does not replace the raw item
used for hashing. A pretty-printed output-byte hash is retained unchanged rather
than replaced by a compact reserialization hash. The schema receipt hash matches
the actual serialized schema passed to the runner. Production transport still
hashes the original output-file bytes before parsing; that code was not edited.

## Validation

All checks passed on 2026-10-11:

```text
node node_modules/vitest/vitest.mjs run --config scripts/import/textbook/codex-retry-20261011/vitest.config.mts scripts/import/textbook/codex-retry-20261011/batch-generation.test.ts
Test Files: 1 passed; Tests: 59 passed

node node_modules/typescript/bin/tsc --project scripts/import/textbook/codex-retry-20261011/tsconfig.json --noEmit --strict
Exit 0; no diagnostics

node node_modules/eslint/bin/eslint.js scripts/import/textbook/codex-retry-20261011/batch-generation.ts scripts/import/textbook/codex-retry-20261011/batch-generation.test.ts --max-warnings 0
Exit 0; no warnings or errors
```

The generator test configuration forbids child-process execution, and model
results use injected fixtures. No actual model/provider/database calls or
environment/authentication inspection were performed. Existing tests for source
image bytes, receipt PNG mismatches, malformed FigureSpec, rendering failure,
reused SVG, embedded raster, and rendered-evidence mismatch passed. The
`node_modules` junction remains intact.

## Support limitations

The installed transport keyword allowlist includes `anyOf` and `const`; the
emitted schemas for 1, 2, and 16 sources pass local Zod conversion and validation.
No actual Codex/backend turn was attempted, so live acceptance of this exact
schema and its constrained-decoding behavior remains unverified. A rejected or
unsupported schema still fails through the existing transport error path, with
no relaxed-schema retry or fallback added.

Literal tuples constrain metadata correspondence, not the mathematical content
or whether an answer was truly derived from its named source. They cannot replace
source/slot coverage checks, actual image/render gates, independent review, or
qualification. No production generation, adoption, approval, or publication is
claimed by these fixture results.
