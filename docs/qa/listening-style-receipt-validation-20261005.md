# Offline listening style receipt validation

The trusted loader reconstructs each proposed edit from bounded archive files and saved model receipts. A serialized stage, digest, eligibility flag, or candidate sidecar cannot independently authorize adoption. `loadVerifiedListeningStyleStage(file, archiveRoot)` recursively freezes each validated result and registers it in a module-private `WeakSet`. `assertVerifiedListeningStyleStage` additionally requires the current v4 semantic guard: legacy v1/v2/v3 results remain readable but have `adoptionEligible: false` and cannot authorize a database edit.

## Verified boundary

- Baseline file SHA-256 and canonical editable content hash; complete, ordered question and grounding coverage; stable question, choice and answer identities.
- Exact cached ASR bytes and source audio bytes, including their SHA-256 and file lengths. Only ASR `id`, `text` and `uncertain` enter normalized semantic state; timing and ancillary fields remain covered by the raw file hash.
- Generation request hash uses `sha256(JSON.stringify(request))`; response receipt hash uses exact file bytes. The raw response supplies candidates, rather than `all-candidates.json`. Every generated ordinal, answer position and source segment list matches baseline grounding, and every evidence quote occurs in the selected source speech.
- Each actual template matches its original prepared file, native file and PDF hashes, grade, original/native question identities, choice order and identities, answer identity, source number, native text, task classification and page. Duplicate, missing and reordered coverage fail closed.
- Separate answer and style requests are rebuilt with core builders and compared in full. State or question changes, extra answer-key fields, wrong request/actual model, missing answers, invalid probabilities, or declared judgments that differ from raw answers fail closed.
- Audit-specific judgment semantics preserve legacy v1 and v2 receipts and Choice receipts. The shared generation-version catalog explicitly permits the corresponding v3/v4 reuse of earlier generations. Earlier generation/answer receipt pairs may reside elsewhere inside the same archive, with their source directory, exact filenames and content bindings checked. Generation models are limited to the project's Pro and Flash operators and must equal the actual receipt model.
- Every current v4 candidate's semantic warnings are recomputed with the core wrapper from baseline, raw candidate and exact selected ASR transcript, including already-held candidates. Literal deadline, qualifier, date, time, unit and quantity changes and unsupported speaker gender/role declarations cannot be hidden by declared flags or strong Jev probabilities. Empty warnings remain a bounded deterministic check, rather than proof of semantic equivalence.
- The final editable payload must equal the generator's exact eligible-only patch. Audio, transcript, rights, IDs, answer references, evidence and existing keywords remain baseline values. A prior `needs_review` remains `needs_review`; audit fields cannot invent human review, alignment or official question recovery.

All reads require absolute, archive-bounded regular files, reject symlinks/junctions in path components, enforce size limits, and compare opened-file identity and stability before and after bounded reads. No database, Storage, network or paid-model client is imported.

## Validation evidence

Current unit suite: **99 passing tests**, covering reconstructed fixtures, conservative eligibility, Choice confidence/probability gates, request and response tampering, changed staging and candidates, original/native/PDF/audio/ASR tampering, template identity and grade, probability and coverage errors, answer leakage, incompatible generation versions, archive escapes, symlinks/junctions, size bounds, immutable proof authenticity, deadline preservation/drift, warning erasure/invention/bypass and legacy adoption rejection.

The reusable fixture is `src/__tests__/fixtures/english-listening/styleStage.ts`; `makeListeningStyleStageFixture()` builds current v4 Choice artifacts with two eligible questions, one prior review that is preserved, an uncertain-ASR hold, a style hold and a wrong-answer hold. Explicit `"2"` selects a legacy Noul audit; `"4", {legacy: true}` selects legacy Choice. Optional deadline variants exercise semantic holds. The caller removes the returned temporary `root` after use.

| Immutable real pilot | Judgment semantics | Eligible / held | Exact stage SHA-256 |
| --- | --- | --- | --- |
| `style-revision-20261005/ebs-middle-3-2017-2.json` | v1 / `1` | 1 / 19 | `58ac74545b9a7c50dc935a19600805e4f1ddf87842b61eaf7dabfc36ba2548ec` |
| `style-revision-20261005-v2/ebs-middle-3-2017-2.json` | v2 / `2` | 0 / 20 | `55f1066c12ed91b00a050f70179b2ec9b9a5a8cac7ececc8e589398504d6b923` |
| `style-revision-20261005-v3/ebs-middle-3-2017-2.json` | v3 / `4` | 5 / 15 | `5153ad7c864a90ba8ee98877f4d0290aa13ef9303ecde2a1e85de30f9a928662` |
| `style-revision-20261005-flash-v4/ebs-middle-3-2017-2.json` | current v4 / `4` | 6 / 14 | `8042bb231aaf1deebc2ed46b7628e42bafbdea5b156031de46850ebeb352c6c7` |

All four real pilots were read from `C:/Creative/testautocreator/output/listening-assessments`, with every referenced source and receipt revalidated. Their tests skip explicitly on machines without these ignored local QA artifacts. Legacy proofs reject adoption; the current guarded Flash pilot passes the adoption assertion. Its ordinal 5 has the independently reproduced `added_deadline` warning and remains held.

Checks: `npx vitest run src/__tests__/unit/verifiedListeningStyleStage.test.ts`; ESLint on the loader, fixture and tests; a focused TypeScript configuration including those files and imported dependencies. The first repository-wide `tsc --noEmit` exhausted the default 4 GB heap before diagnostics; focused TypeScript checks pass with an 8 GB heap. No Prisma client was generated.

## Adoption responsibility

This proof establishes consistency against the retained source artifacts and independent saved judgments. ASR and semantic model judgments remain machine evidence; the result creates no human review, distribution rights or audio alignment approval. The root-owned adoption guard and CLI must check a fresh database snapshot before applying an authorized draft edit.

The coordinator owns the root semantic helper, database snapshot guard and mutation CLI; the generation worker owns the core schemas/builders and generator. Temporary copies of `reconstructionStyle.ts` and `reconstructionStyleSemantics.ts` were used for verification, remained outside this worker's commit, and were removed after checks with coordinator notification. This worker made no database or Storage changes, paid calls, pushes or shared Prisma generation.
