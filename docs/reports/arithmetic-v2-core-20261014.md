# Arithmetic v2 core, API and storage compatibility

2026-10-14 · Codex worker `task_5a00274433e1` · base `cc3db6805`

Implemented the versioned arithmetic core, strict snapshot/request contracts, private API routes, v1/v2 storage readers and v2 usage-label backend. The root owns UI/print integration; the elementary and middle workers own all family definitions. No v1 engine/schema, shared `types.ts`, UI, DB schema, live flag or deployment was changed by this worker.

## Integration contract

`src/contracts/arithmeticV2.contract.ts` exports `ArithmeticV2GenerateRequest`, `ArithmeticV2SheetPayload`, `ArithmeticV2SheetItem` and the schemas. Versions are payload `2`, engine `arithmetic-engine-v2`, catalog `arithmetic-catalog-v2`; document kind stays `arithmeticSheet`.

```ts
// POST /api/arithmetic/v2/generate
{
  engineVersion: "arithmetic-engine-v2",
  catalogVersion: "arithmetic-catalog-v2",
  seed: "printable ASCII, 1–128 characters",
  rounds: [{ allocations: [{ typeId: "m1-integer-add", count: 20 }] }]
}

// Response: { data: snapshot }
{
  payloadVersion: 2,
  kind: "arithmeticSheet",
  engineVersion: "arithmetic-engine-v2",
  catalogVersion: "arithmetic-catalog-v2",
  seed: "...",
  rounds: [{ round: 1, items: [{
    order: 1, typeId: "...", domainIndex: 0,
    parameters: [/* safe integers */],
    prompt: {/* shared ArithmeticV2Prompt */},
    answer: {/* shared ArithmeticV2Answer */}
  }] }]
}
```

`GET /api/arithmetic/v2/catalog` returns `{data:{engineVersion,catalogVersion,types,limits,writerEnabled}}`. `types` contains shared `ArithmeticV2CatalogEntry` values; `limits` is `{itemsPerRound:100,itemsTotal:100,rounds:20}`, matching v1. Existing `/api/arithmetic/catalog` and `/generate` remain v1.

The `@/lib/arithmetic-v2` barrel exports:

- `listArithmeticV2Types()` and `getArithmeticV2Definition(typeId)`.
- `validateArithmeticV2Request(input)`, `generateArithmeticV2Items(input)` and `buildArithmeticV2Sheet(input)`.
- `reopenArithmeticV2Sheet(payload)`, `arithmeticV2SheetProblemCount(payload)` and `listArithmeticV2PrintItems(payload)`. Print items add `round` and a global 1-based `number` to the saved item.
- Version constants, schemas, shared types and `ArithmeticV2EngineError`.

`@/lib/arithmeticDocument` exports `AnyArithmeticSheetPayload`, `reopenAnyArithmeticSheet(payload)` and `anyArithmeticSheetProblemCount(payload)`. Dispatch uses the declared payload version and never tries another version after validation failure.

## Generation and reopening

- Sparse Fisher–Yates sampling uses the seed/version/round/type stream and safe integer indices. Memory and work do not scale with a trillion-entry domain; no domain arrays or random retry limits are used.
- Repeated allocations of one type share their round sampler. Different rounds may reuse a task. Allocation order and 1-based round/item numbering remain explicit.
- Capacity preflight rejects a type request beyond the domain or remaining same-type count before returning any sheet. Cross-type overlap uses a shared visible-prompt identity; duplicate tasks are skipped by advancing the finite sampler. Exhaustion returns exact `available` and `reason:"overlap"`, without partial output or duplicate fill.
- Prompt identity uses layout, ordered operands/operator for vertical tasks, or whitespace-normalized LaTeX for math tasks, plus the instruction. It does not collapse commuted operands or general mathematical equivalence.
- Every generated candidate passes its family's independent verifier. Reopen checks strict schemas, known versions/types, ordering, per-round index and prompt uniqueness, index bounds, independent verification, and exact current indexed parameter/prompt/answer correspondence. It returns the stored snapshot and never resamples the seed.
- Polynomial/surd zero normal forms may contain an empty `exact` array. Other kinds require integer strings; family verifiers own kind-specific exact-value semantics.
- Errors use `{error:{code,message,violations?,limit?}}`; capacity violations carry `{round,allocation,typeId,requested,available,reason}`. Malformed diagnostic paths are guarded and remain HTTP 400.

## Private storage and usage readers

All private document entry points now call the version-dispatch reader: save/count, own/shared/admin read validation, rename validation, and copy/count. Copy retains the solved snapshot and recomputes its count rather than trusting summary metadata. Existing owner/menu checks, revision behavior, audit records, private-copy scope, and the exact `ARITHMETIC_SHEET_WRITE=on` gate remain in effect. Preview generation is permitted while the writer is disabled and makes no storage access.

Usage requests add `arithmeticV2TypeIds: string[]` (maximum 100, no duplicates). Responses add `arithmeticV2Types: UsageArithmeticV2Label[]`; labels carry `typeId`, `typeKey`, catalog version, `rankGroup`, state/reason and the existing count/rank/label fields. `arithmeticV2UsageTypeKey(typeId)` is exported from the usage-label helpers. Legacy response parsing defaults the new list to `[]`; `metrics.arithmeticV2` is optional for old fixtures and always emitted by the new backend.

V2 ranks compare all observed type IDs in the same current family `rankGroup`, including peers not requested by the UI. V1 retains its operator population. Both use only the current account's retained original documents and their `createdAt` period; multiple occurrences within one document count once, audited/marked copies are excluded, future documents are excluded, and no new usage writes are introduced. Unknown IDs have null counts; query/cap failures are unavailable, rather than invented zeros. Visible wording says “같은 연산 묶음”; internal rank-group IDs stay structured.

## Validation

- Core test-local family doubles exercise deterministic sampling, a `2^40` domain with bounded calls, exact capacity, repeated allocations, cross-type overlap exhaustion, order, strict versioning, independent bad-producer detection, tampered snapshots, and seed-independent reopen.
- Real integration covers all 53 types from the worker registries, each over three seeds, including generation, independent verification, exact indexed correspondence and JSON round trips. It also checks the actual `m1-like-terms` / `m1-linear-add` overlap and mixed-family sampling.
- API tests cover approved bank access, absent/cross origins, malformed/duplicate/oversized JSON, no-store headers, writer-flag reporting, exact capacity errors, limits, precise proxy route access, and absence of DB calls in catalog/generation.
- In-memory persistence tests cover v1/v2 save/read/copy, recomputed counts, revisions, authorization, disabled writes, unchanged snapshots and corrupt stored payload rejection. Usage tests cover owner scope, retained dates, unrequested peers, copy exclusion, request deduplication, old-response parsing and unavailable counts.
- Combined integrated and legacy regression run: **530 tests passed in 11 files** (`arithmeticV2Core`, `arithmeticV2Usage`, `arithmeticV2Integration`, `workspaceArithmeticV2`, `branchLibrary`, `usageLabelRoutes`, `arithmeticEngine`, `arithmeticPresets`, `usageLabels`, `workspaceArithmetic`, `privateAccounts`). An earlier integration test incorrectly chose a coefficient outside the narrower linear domain; it was corrected to the actual shared `(3x)+(2x)` task before this passing run.
- After final middle hardening `77b610173`, the middle-family and real integration suites passed **128 tests in 2 files**.
- Milestone `4a56af6fa` and follow-up `6f00e999f` passed repository ESLint/Prettier commit hooks.
- Initial whole-project TypeScript invocation hit the default 4 GB heap limit. The coordinator owns the integrated whole-project check with the repository's 8 GB setting; this worker avoided running a competing full check after that instruction.

The worker integrated elementary `625288eed` and middle `f509e3923`, followed by final middle verifier hardening `77b610173`, unchanged for tests. Middle's amended milestone conflicted only with its earlier test file; the newer worker file was retained exactly after comparison. The setup-hook lockfile drift was restored and is excluded from the changes. No paid APIs, push, deployment or live DB writes were performed.
