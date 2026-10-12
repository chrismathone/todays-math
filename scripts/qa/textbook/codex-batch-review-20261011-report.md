# Grouped Codex textbook review — 2026-10-11

Implemented only the assigned new batch types, reviewer, unit tests, CLI and this report. No existing transport, answer/binding helper, legacy contract, generation checkpoint, qualification gate or UI was changed. No shared database, environment file, current root candidates or answer-bearing production snapshot was read. No subscription inference or paid API call was run; all test mathematical responses are synthetic and establish no mathematical quality result.

## Entry points and contract

`reviewCodexDbRetryBatch(inputs, { runCodexJson, outDir, timeoutMs?, signal?, cwd? })` accepts 1–16 ordered cases. Each case is `{ origin, candidates, sourceFigures, candidateFigures }`, using the existing DTOs. Candidates must be in slot 1/2 order; figures must follow the same order. There is no default inference runner in the library. Default timeout is 600,000 ms, maximum 1,800,000 ms.

The result has this shape (types in `codexRetryBatch.types.ts`):

```text
{
  version: "codex-db-retry-batch-blind-review-v1",
  kind: "machine-codex-batch-blind-review",
  inputBindings: [{
    caseId, questionIndex, inputDigest,
    sourceId, sourceDigest, candidatePayloadDigest,
    sourceFigureDigest, candidateFigureDigests, bindingDigest
  }],
  batchDigest, passed, issues,
  cases: [{
    ...inputBinding, passed, issues,
    blindSolutions, blindSolutionsDigest,
    solutionReviews, semanticReviews
  }],
  communications: [{
    phase, caseIds, status,
    prompt, schema, inputDigest, promptSha256, schemaSha256,
    images: [{ sha256, bytes }],
    auth, threadId, model, usage, elapsedMs,
    receipt, receiptDigest, outputSha256, outputDigest, rawOutput
  }]
}
```

`questionIndex` is one-based **within the original batch**, never the compacted index of a later phase. `caseId` is `case-0001`, etc. In a CLI run with multiple batches these synthetic IDs restart per batch; the pair `(batchDigest, caseId)` is the identity. `sourceId` and all original/candidate metadata remain outside blind prompts.

Each input binding contains the existing compatible per-pair fields from `dbRetryReviewBinding`, plus `inputDigest = reviewDigest(rawInput)` preserving input candidate/image order. `batchDigest = reviewDigest({ version, inputBindings })`. The whole ordered input is cloned and recursively frozen before calls; external inputs are rebound at completion. Duplicate sources or malformed outer inputs reject before inference. Per-case preflight problems are held and excluded; all remaining cases participate in the single blind call.

The blind prompt contains only synthetic case/slot IDs, question text, question type and ordered attachment/choice association. It contains no author answers, solutions, method labels, stored source IDs, source filenames, curriculum or validation fields. Actual ordered image bytes go through the runner's image argument. Frozen independent solutions are canonicalized into original/slot-1/slot-2 order and digested, never repaired from proposed solutions. The existing deterministic answer comparator is reused unchanged; unresolved answers, ambiguity, missing evidence or mismatches hold that case. False step-review booleans and semantic dimensions also hold only their own case. Malformed response structure/attribution or transport provenance fails the batch closed. If no eligible case remains, further calls stop.

There is one fresh call per phase, at most three total, with three different actual thread IDs. Later calls contain only eligible cases, reassigning image attachment positions for that subset while preserving case IDs. Step review demands evidence for every equality, domain, root, subpart, unit and conclusion. Semantic review independently returns all five boolean dimensions with original/candidate/reason evidence. **Either slot may change numbers OR conditions/method-facing structure.** Existing recipe values are preserved and hashed; only the legacy recipe-to-slot restriction is excluded from batch preflight. Exact duplicate questions are rejected deterministically, and semantic actualChange must also compare the sibling substantively.

## Durable provenance and qualification integration

Communications are genuine grouped calls, not synthesized per-pair receipts. Shared usage is recorded once per phase, never copied into case results. `rawOutput` retains the full actual grouped output object in the returned order; qualification can find a row by `caseId`, verify exact uniqueness, then map slots by `id`.

The receipt is the full strict current transport receipt, including receipt UUID, CLI version, ChatGPT auth, actual thread/model, usage, timestamp, exit 0, null signal, completed/schema-valid state and raw stream hashes. Successful receipt/output/schema paths must resolve inside the expected phase artifact directory. The library reads those actual local files and verifies:

- Exact receipt object canonical digest equals `receiptDigest`, including all metadata.
- Exact prompt UTF-8 SHA equals `promptSha256` and the receipt field.
- Exact serialized schema SHA equals `schemaSha256`, the receipt field and actual `schema.json` bytes.
- Actual image SHA and decoded byte lengths equal the ordered receipt image metadata; input preflight separately verifies supplied image SHA against actual raster data URL bytes.
- Actual `output.json` byte SHA equals `outputSha256` and the receipt field; parsed durable output, `rawOutput` and `outputDigest` have identical canonical digests.
- `inputDigest = reviewDigest({ prompt, images })`, where images are the ordered `{sha256, bytes}` records.

Raw file SHA and `reviewDigest` are intentionally distinct. Output whitespace and schema key order are not discarded for raw transport validation. `verifyCodexBatchCommunication(call, artifactRoot)` is exported for reuse when root checks saved artifact files. It validates the grouped communication against durable transport artifacts; it is **not** a replacement for root's current-input/qualification gate.

Root's new gate should require this distinct version/kind, recompute the current per-pair and ordered-batch bindings, preserve all original batch inputs (including held cases), verify each real grouped communication and its schema, verify exact case/slot membership for each phase subset, compare per-case canonical arrays/digests with attributed raw grouped rows and frozen inputs, and independently reapply answer/boolean/evidence requirements. A batch can contain both held and passed cases: top-level `passed` means every case passed, whereas a case can pass when another case is held. Transport/batch issues prohibit all passes. No per-pair A receipt, probability conversion, human signoff or database approval is produced here.

## CLI and immutable resume

```text
npx tsx scripts/qa/textbook/codex-batch-review-20261011.ts \
  --snapshot <local-snapshot.json> \
  --generation-dir <existing-generation-checkpoint-directory> \
  --source-ids <JSON-array-file-or-inline-JSON-array> \
  --out <separate-new-review-directory> \
  --batch-size 8 --concurrency 1
```

Default is plan; add `--review` to run saved ChatGPT Codex CLI transport, and `--resume` only for an exact existing review directory. Selected source IDs are explicitly required, unique UUIDs, bounded 1–256; batch size is 1–16 and concurrency 1–3. `--timeout-ms` is bounded 1–1,800,000. Root can use old or new generation drafts that retain the existing per-source checkpoint shape. Only complete slot-1/2 pairs in generated/inserting/inserted checkpoint states are accepted, with matching raw source, origin and candidate digests. No checkpoint conversions or writes occur. The CLI never imports the legacy checkpoint module because its runtime graph imports the paid generation provider.

Outputs are exclusive-create JSON files:

- `manifest.json`: exact snapshot byte digest, ordered selected source IDs, exact checkpoint byte digests and run bounds.
- `batches/1.json`, etc.: `{ reviewDigest, review }` with the full result above.
- `cases/<sourceId>.json`: per-case index pointing to its actual batch path/digest and case ID/index, binding, pass/hold and issues.
- `artifacts/<batchDigest>/<phase>/<transport-phase-uuid>/`: authentic existing transport receipt, schema, output and actual attached images.
- `summary.json`: reviewed/passed/held counts and ordered batch digests, zero database operations.

An exclusive run lock blocks concurrent writers. Existing files are reused only if identical; changed manifests/checkpoint bytes/output artifacts or input bindings fail closed. Completed held results remain held on resume and are not silently retried. Incomplete artifact directories without a completed batch are preserved and require a separate new output directory; they are not overwritten or silently completed with reused sessions. Input snapshot/checkpoint bytes are rechecked before saving results and final summary. Passed/current proof and generation checkpoints are never overwritten. No database insertion, production render or promotion is part of this CLI.

## Validation and limits

Targeted strict TypeScript and ESLint pass, as do 61 injected unit tests. The dedicated Vitest invocation uses an ignored local configuration with `envDir: false`, no repository setup/environment loader, and only `schoolTextbookCodexBatchReview.test.ts`; tests block paid provider/client/generation/reviewer and database imports, child-process launches and fetch. They cover batch sizes, reversed output, exact attribution, duplicate/missing/wrong cases/slots, mathematical holds, incomplete roots/subparts/units, malformed evidence/booleans, actual byte/hash binding, final input mutation, timeout/cancellation, receipt metadata and file tampering, thread reuse, later subsets, recipe symmetry, default plan and durable resume. Nonempty evidence validation preserves exact returned strings (including surrounding whitespace) so extracted per-case arrays match their raw grouped rows without hidden normalization. One test uses the real existing transport with an injected process runner to verify authentic receipt/schema/output formatting, without starting a process or performing inference.

Conservative comparator mismatches can hold otherwise equivalent notation; root owns any notation helper changes. Concrete evidence and correctness are model judgments: schemas ensure boolean/string structure and nonempty evidence, not mathematical truth. Identical erroneous reasoning cannot be ruled out by an attribution protocol. Image decoding/dimensions are enforced by the existing real transport, while this reviewer checks actual bytes, hashes, sizes and existing figure preflight. Durable files and injected runners remain trusted local evidence producers, not cryptographic attestations of an external service. No live grouped quality/cost measurement has been performed; root owns that bounded run, new qualification, production rendering and DB insertion.

Coordinator integration: the tests now also pass under the repository's default global setup. That harness imports Prisma's SQL/error metadata, which is permitted while every real PrismaClient constructor remains blocked. Production grouped review still imports no database client. Root independently exercised live saved-ChatGPT grouped generation and review, added the explicit grouped qualification policy with 19 synthetic boundary tests, and approved only actual passing pairs after four production render modes. The current counts and actual usage are recorded in `docs/planning/tracks/reports/textbook-codex-plan-20261011.md`; this worker's mocked-test report remains distinct from that live evidence.
