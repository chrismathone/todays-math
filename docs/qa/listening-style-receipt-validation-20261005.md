# Offline listening style receipt validation

The trusted loader reconstructs each proposed edit from bounded archive files and saved model receipts. A serialized stage, digest, eligibility flag, or candidate sidecar cannot independently authorize adoption. `loadVerifiedListeningStyleStage(file, archiveRoot)` recursively freezes each validated result and registers it in a module-private `WeakSet`. `assertVerifiedListeningStyleStage` additionally requires the current v4 semantic guard: legacy v1/v2/v3 results remain readable but have `adoptionEligible: false` and cannot authorize a database edit.

## Verified boundary

- Baseline file SHA-256 and canonical editable content hash; complete, ordered existing question coverage; stable question, choice and answer identities. The complete original grounding array preserves both `included: true` and `included: false` attempts and every ancillary field. All grounding ordinals must be unique and ordered, while only included entries may bind existing questions/verdicts. Gaps left by excluded attempts remain generated ordinals; exclusions cannot become new candidates or edits. The staged inherited grounding must exactly equal baseline provenance.
- Exact cached ASR bytes and source audio bytes, including their SHA-256 and file lengths. Only ASR `id`, `text` and `uncertain` enter normalized semantic state; timing and ancillary fields remain covered by the raw file hash.
- Generation request hash uses `sha256(JSON.stringify(request))`; response receipt hash uses exact file bytes. The raw response supplies candidates, rather than `all-candidates.json`. Every generated ordinal, answer position and source segment list matches baseline grounding, and every evidence quote occurs in the selected source speech.
- Current v4 recovery recomputes the explicitly declared `structural-metadata-v1` or `structural-metadata-v2` from the raw generation using the generator-owned normalizer, then compares the complete ordered transformation proof before candidate validation. Both versions permit `reason` → `detail` and removal of question-level `sourceRecordId`/`level` exactly equal to the immutable source/grade. The coordinator separately authorized v2 to permit `action` → `detail`; v1 still rejects `action`, and an absent declaration always uses v1. Unknown versions/aliases, mismatched metadata, missing/erased/invented/reordered steps and extra fields fail closed. Raw v4 stages still pass with an absent declaration or explicit empty steps; legacy receipts retain their existing read-only rules. All substantive fields remain raw generation values and proceed through the same source, answer, style, semantic and editable-payload gates.
- Each actual template matches its original prepared file, native file and PDF hashes, grade, original/native question identities, choice order and identities, answer identity, source number, native text, task classification and page. Duplicate, missing and reordered coverage fail closed.
- Separate answer and style requests are rebuilt with core builders and compared in full. State or question changes, extra answer-key fields, wrong request/actual model, missing answers, invalid probabilities, or declared judgments that differ from raw answers fail closed.
- Audit-specific judgment semantics preserve legacy v1 and v2 receipts and Choice receipts. The shared generation-version catalog explicitly permits the corresponding v3/v4 reuse of earlier generations. Earlier generation/answer receipt pairs may reside elsewhere inside the same archive, with their source directory, exact filenames and content bindings checked. Generation models are limited to the project's Pro and Flash operators and must equal the actual receipt model.
- Every current v4 candidate's semantic warnings are recomputed with the core wrapper from baseline, raw candidate and exact selected ASR transcript, including already-held candidates. Literal deadline, qualifier, date, time, unit and quantity changes and unsupported speaker gender/role declarations cannot be hidden by declared flags or strong Jev probabilities. Empty warnings remain a bounded deterministic check, rather than proof of semantic equivalence.
- The final editable payload must equal the generator's exact eligible-only patch. Audio, transcript, rights, IDs, answer references, evidence and existing keywords remain baseline values. A prior `needs_review` remains `needs_review`; audit fields cannot invent human review, alignment or official question recovery.

All reads require absolute, archive-bounded regular files, reject symlinks/junctions in path components, enforce size limits, and compare opened-file identity and stability before and after bounded reads. No database, Storage, network or paid-model client is imported.

## Validation evidence

Current unit suite: **172 passing tests**, covering reconstructed fixtures, conservative eligibility, Choice confidence/probability gates, request and response tampering, changed staging and candidates, original/native/PDF/audio/ASR tampering, template identity and grade, probability and coverage errors, answer leakage, incompatible generation versions, archive escapes, symlinks/junctions, size bounds, immutable proof authenticity, deadline preservation/drift, warning erasure/invention/bypass and legacy adoption rejection. The follow-up adds 73 cases for structural recovery proof integrity, exact bound identity removals, version-specific aliases, action-containing v2 downgrades to v1, unknown versions/aliases/fields, text/answer/quote/segment/order/coverage changes even on held candidates, unauthorized staging metadata, unchanged raw receipts, semantic holds after normalization, excluded provenance preservation/revival/flag/duplicate/order/coverage errors and actual v1/v2 recovery and excluded-stage validation.

The reusable fixture is `src/__tests__/fixtures/english-listening/styleStage.ts`; `makeListeningStyleStageFixture()` builds current v4 Choice artifacts with two eligible questions, one prior review that is preserved, an uncertain-ASR hold, a style hold and a wrong-answer hold. Explicit `"2"` selects a legacy Noul audit; `"4", {legacy: true}` selects legacy Choice. Optional deadline variants exercise semantic holds. `{generationRecovery: true}` adds exact redundant identity fields and `reason` labels to the first and third raw candidates, with six independently specified ordered audit steps and unchanged normalized candidates. Adding `generationRecoveryVersion: "structural-metadata-v2"` changes the third candidate's alias to `action` and records the explicit v2 proof. `{excludedGrounding: true}` retains an excluded ordinal 3 with its speech, choice order and exclusion metadata, while existing questions use ordinals 1, 2, 4, 5, 6. The caller removes the returned temporary `root` after use.

| Immutable real pilot | Judgment semantics | Eligible / held | Exact stage SHA-256 |
| --- | --- | --- | --- |
| `style-revision-20261005/ebs-middle-3-2017-2.json` | v1 / `1` | 1 / 19 | `58ac74545b9a7c50dc935a19600805e4f1ddf87842b61eaf7dabfc36ba2548ec` |
| `style-revision-20261005-v2/ebs-middle-3-2017-2.json` | v2 / `2` | 0 / 20 | `55f1066c12ed91b00a050f70179b2ec9b9a5a8cac7ececc8e589398504d6b923` |
| `style-revision-20261005-v3/ebs-middle-3-2017-2.json` | v3 / `4` | 5 / 15 | `5153ad7c864a90ba8ee98877f4d0290aa13ef9303ecde2a1e85de30f9a928662` |
| `style-revision-20261005-flash-v4/ebs-middle-3-2017-2.json` | current v4 / `4` | 6 / 14 | `8042bb231aaf1deebc2ed46b7628e42bafbdea5b156031de46850ebeb352c6c7` |
| `style-revision-20261005-recovery-v4/ebs-middle-1-2006-2.json` | current v4 / `4`, structural recovery | 2 / 18 | `c0045524468136e179d71fd0b24830bb1a9a1749d9a666ce07695723309f76d6` |
| `style-revision-20261005-recovery-metadata-v2/ebs-middle-1-2017-2.json` | current v4 / `4`, explicit structural v2 | 6 / 12 | `59add5aa3845e73a1425b41885c24922484d01883c849a5aeeb3a36913fb91bc` |

The real stages were read from `C:/Creative/testautocreator/output/listening-assessments`, with every referenced source and receipt revalidated. Their tests skip explicitly on machines without these ignored local QA artifacts. Legacy proofs reject adoption; current guarded stages pass the adoption assertion. The Flash pilot's ordinal 5 has the independently reproduced `added_deadline` warning and remains held. The actual primary `ebs-middle-1-2007-2` stage preserves all 13 grounding attempts, excludes ordinal 7, and validates exactly 12 existing questions (4 eligible / 8 held).

The recovery binds all 20 questions to the original failed Flash generation at `style-revision-20261005-flash-v4/audit/ebs-middle-1-2006-2/generation.receipt.json`, whose exact SHA-256 is `aaca79ec683f44cb4565da12e12276b5b2bfbefad42b1263d6b3d63ff1cb8f12`; its request hash is `b500e9fec80c95d242f7081943823068555b5e9cb9b31208b67856eee23ad775`. The sole transformation is `{sourceNumber:20, field:"questionType", from:"reason", to:"detail"}`. The generation worker saved the new recovery stage with five answer and five blind style receipts; the loader validates all 11 receipts, source/template bindings, semantic warnings and final eligible-only patch. No generation retry or original receipt rewrite occurred. The unit test compares raw generation receipt bytes before and after loading.

Checks: `npx vitest run src/__tests__/unit/verifiedListeningStyleStage.test.ts`; ESLint on the loader, fixture and tests; a focused TypeScript configuration including those files and imported dependencies. The first repository-wide `tsc --noEmit` exhausted the default 4 GB heap before diagnostics; focused TypeScript checks pass with an 8 GB heap. No Prisma client was generated.

## Adoption responsibility

This proof establishes consistency against the retained source artifacts and independent saved judgments. ASR and semantic model judgments remain machine evidence; the result creates no human review, distribution rights or audio alignment approval. The root-owned adoption guard and CLI must check a fresh database snapshot before applying an authorized draft edit.

The coordinator owns the root semantic helper, database snapshot guard, independent evidence-language adoption holds and mutation CLI; the generation worker owns the core schemas/builders, normalizer and generator. This loader follow-up uses the shared versioned normalizer (reason-only v1 introduced in generator commit `621064d88`, explicit v2 in `97d6d5af0`) and changes only the owned loader, fixture, unit tests and this report. Temporary copies of `reconstructionStyle.ts` and `reconstructionStyleSemantics.ts` were used for verification, remained outside this worker's commit, and were removed after checks with coordinator notification. This worker made no database or Storage changes, paid calls, pushes or shared Prisma generation.

## Full finalized manifest replay

All 72 finalized stages passed independent offline loading and adoption-proof assertions: 1,282 existing questions, 337 audit-eligible and 945 held. The complete provenance retains 18 excluded attempts across 17 sources; they add no existing or eligible question IDs. Every stage matched its manifest source identity, exact path, SHA-256 and question/eligibility counts; all saved generation, answer and style receipts and source/template/semantic gates were replayed. The replay collected a result for every source rather than stopping at the first error, and recorded zero sanitized failures.

| Stage group | Sets | Questions | Audit-eligible | Held |
| --- | ---: | ---: | ---: | ---: |
| Primary Flash v4 | 63 | 1123 | 300 | 823 |
| Structural v1 recovery | 8 | 141 | 31 | 110 |
| Explicit structural v2 recovery | 1 | 18 | 6 | 12 |

Manifest byte hashes:

- C:\Creative\testautocreator\output\listening-assessments\style-revision-20261005-flash-v4\manifest.json: 860ba4c15555bb4caa5450c576cc406bbc8a157b0aa67f6b2d214e4d47d50a31
- C:\Creative\testautocreator\output\listening-assessments\style-revision-20261005-recovery-v4\manifest.json: 326657f9685a6887192eb7f4457f5c56af635b923a54fe594c8b3ea2a7912d76
- C:\Creative\testautocreator\output\listening-assessments\style-revision-20261005-recovery-metadata-v2\manifest.json: fa1cdc09ded1d2df1da6617e874005bb68c1dff13ffdfe9ba846bf9dba683e73

Per-source results below retain the exact stage hashes. Group names P, R1 and R2 refer respectively to style-revision-20261005-flash-v4, style-revision-20261005-recovery-v4 and style-revision-20261005-recovery-metadata-v2 beneath the archive root; each filename is its source identity plus .json. Eligible counts precede the root-owned evidence-language adoption holds and database snapshot checks.

| Source identity | Group | Questions | Eligible / held | Excluded | Result | Stage SHA-256 |
| --- | --- | ---: | --- | ---: | --- | --- |
| ebs-middle-3-2017-2 | P | 20 | 6 / 14 | 0 | passed | 8042bb231aaf1deebc2ed46b7628e42bafbdea5b156031de46850ebeb352c6c7 |
| ebs-middle-1-2006-1 | P | 15 | 6 / 9 | 0 | passed | f8ae124c6d94b1d5df715539efc5402effb21c06cc085773ba3ca2956b66b933 |
| ebs-middle-1-2007-2 | P | 12 | 4 / 8 | 1 | passed | e08159f975cb77ea5ecfa5d66535932d7001ad0cdc63c466d36bea393536590d |
| ebs-middle-1-2008-1 | P | 20 | 11 / 9 | 0 | passed | 312cebf722a3a68fafb26ddd148ce41a0667715605b1d083e39129b1781c44f5 |
| ebs-middle-1-2008-2 | P | 17 | 4 / 13 | 1 | passed | b3d1246a3e3dcf02b0fa3eefc7e83065b4ba174ccaf5b1a8a4b7d50132b0ceb7 |
| ebs-middle-1-2009-1 | P | 15 | 3 / 12 | 0 | passed | e0f50934e2517eb21c3fa1547586185fde4b75f57dc6d50478730e8c7a0d3deb |
| ebs-middle-1-2010-1 | P | 13 | 1 / 12 | 0 | passed | 447cc7d2153b13589362538b762a729ce2b85418b307be0ba416afb5de65db23 |
| ebs-middle-1-2011-1 | P | 19 | 7 / 12 | 1 | passed | b97e096df6200ee8458bfbfc97b2018b2823028f6774d3eb6450db8c08920d4b |
| ebs-middle-1-2011-2 | P | 17 | 4 / 13 | 0 | passed | f84f0d5c5d399e6c51f3d1b818fa8823920b4de4e525ade13fde96a4a7e44030 |
| ebs-middle-1-2012-1 | P | 17 | 5 / 12 | 0 | passed | 48c885fc14322b228c434819552dfc516209ae26e29d3ceb9aa538aab6458872 |
| ebs-middle-1-2013-1 | P | 16 | 7 / 9 | 0 | passed | 3b1383db06d5ebffbeef47d08e2f5d3d51ac6801bb6c2377265a7be3b5552dbb |
| ebs-middle-1-2013-2 | P | 14 | 2 / 12 | 0 | passed | 7f4801a5e06dca7c7e06a67dcb8a286fa66805da8593fcc8e949450130d3a705 |
| ebs-middle-1-2014-1 | P | 19 | 4 / 15 | 1 | passed | 6f4eb4da1afbc3ff636928092a4344a2296b1dc3cd7836671a0dd24c183dbb3d |
| ebs-middle-1-2014-2 | P | 20 | 6 / 14 | 0 | passed | 18fddffc7d84adf294b49288b4eac3a0aeac5c36145bdd159a8530fd7bcc8a80 |
| ebs-middle-1-2015-1 | P | 18 | 10 / 8 | 0 | passed | 71809e460cc911b1e593425e1b1c4fa278e603f150f30613328ff8a2494cd54f |
| ebs-middle-1-2015-2 | P | 20 | 2 / 18 | 0 | passed | c46e2fc86e12d597a61b9541d99e7c057b4aceac3c134c9c7adcc891ca2047d4 |
| ebs-middle-1-2016-1 | P | 19 | 7 / 12 | 1 | passed | e152a70bb3e9bc60a0765f1690b3f912689982f559310b52f5cc64683ab6fad3 |
| ebs-middle-1-2016-2 | P | 20 | 6 / 14 | 0 | passed | 97bb0d0b4098269497a97d5f16ac43893e51b38fbf70e0b6416bd14ddc2ea45c |
| ebs-middle-1-2017-1 | P | 19 | 4 / 15 | 0 | passed | 8c95556b7d9c1f2f2bb5537a91db9afc779947dd102086fd03882a3e284e8fc7 |
| ebs-middle-2-2006-1 | P | 19 | 2 / 17 | 0 | passed | 653c1aa31d1286aaa187b4cc57d8cef199c4b12316a28702cfbf01df88771ea8 |
| ebs-middle-2-2006-2 | P | 12 | 2 / 10 | 1 | passed | db9c660450052130031ca5e5fe543eff6b599c7ef4d534b229a74e423e9b6f62 |
| ebs-middle-2-2007-1 | P | 10 | 2 / 8 | 0 | passed | efa3f59475c747021cf5fc9c13653235987fece240db8ce8539f20ddf31ef8e9 |
| ebs-middle-2-2007-2 | P | 20 | 8 / 12 | 0 | passed | f2b9b5e6106d105c1a77a178d603e8fe9ee86f269b14e1018307a60fd4a180c8 |
| ebs-middle-2-2008-1 | P | 20 | 5 / 15 | 0 | passed | c24990863f09ed841815250501b42b5fcf047f40e118bbd59c8b01aec5002996 |
| ebs-middle-2-2008-2 | P | 18 | 4 / 14 | 0 | passed | e44f1a06e7d0b024e740e784dafdc66598564b20acc8dd59ab6acd8bcf0de171 |
| ebs-middle-2-2009-1 | P | 14 | 6 / 8 | 0 | passed | ea050776f7f9a385ca43e638910f323a6e36737bac1bd6b5752c4277526e514d |
| ebs-middle-2-2009-2 | P | 19 | 5 / 14 | 0 | passed | 250f33a0a17e347a8c7eec3da870e737faeec4659ed0891cb3407d847443d125 |
| ebs-middle-2-2010-1 | P | 19 | 8 / 11 | 1 | passed | 76c06ae7e7bc5660b1dc4721b417c61c43ff81b64dcd46cdfd106d4a9d009749 |
| ebs-middle-2-2010-2 | P | 15 | 4 / 11 | 1 | passed | be47780c5a0633dcea812c0b11d6fcac95f25651584c2d8e364b8968ae1e3da5 |
| ebs-middle-2-2011-1 | P | 18 | 6 / 12 | 0 | passed | d406440968ea6023d14a8812be80cb9b41e217f1e4d00da1b5cbd5ec999e4410 |
| ebs-middle-2-2011-2 | P | 14 | 2 / 12 | 0 | passed | c58d83a2bbf0f3d00a5afa6efdb34af86fda8d757a821b8e394c224c7bee0cfb |
| ebs-middle-2-2012-1 | P | 20 | 3 / 17 | 0 | passed | 529f5e810c19cb86eae21f6163b05bb4ef7e19547e1967a3a9f575fb1a61fc1c |
| ebs-middle-2-2012-2 | P | 20 | 7 / 13 | 0 | passed | d647d362be686d671b9ad22b313c085a81924ce11e22f3c90112cd872b1e4253 |
| ebs-middle-2-2013-1 | P | 20 | 5 / 15 | 0 | passed | 0499773425cb42eac0eb91b782eea8cfb0c22c83db54bf857fef4d6399648cc8 |
| ebs-middle-2-2013-2 | P | 19 | 3 / 16 | 0 | passed | d942fa55a8bb387156da779cc7a7b7f28da55e105ce56fd64269c7097df1a568 |
| ebs-middle-2-2014-1 | P | 20 | 6 / 14 | 0 | passed | e46b4f0b0d24a8481b4b25ef9a0268de4a5211823b265818fd6667b03d7f71ca |
| ebs-middle-2-2014-2 | P | 18 | 5 / 13 | 1 | passed | 267d10c11270e70250c4a1ba874f41064496fb23732d4c991bee5acba19221d9 |
| ebs-middle-2-2015-2 | P | 20 | 4 / 16 | 0 | passed | 014a05eaaf56722bed05c2ac119391cb0c9833a4f74c6e5f0c92cb20ed53bba7 |
| ebs-middle-2-2016-1 | P | 17 | 4 / 13 | 1 | passed | 4291e76b1e412123484226d6d5cf0b0a400fa1a961245d1d732adca89a0d0f28 |
| ebs-middle-2-2016-2 | P | 20 | 5 / 15 | 0 | passed | 70065921f66c6a15896f7122d287d4b6a401cd7d4c8c9d36fb5f52a4cde58609 |
| ebs-middle-2-2017-1 | P | 17 | 7 / 10 | 0 | passed | 2ee4178a9e7c72f1889062363b3928477f5a27a9b07d562d0c8c5dba02c96c5e |
| ebs-middle-2-2017-2 | P | 20 | 7 / 13 | 0 | passed | 65ee651fb03435aaa439de390326bdd0c5d67868f01919c35c2e43d8d6224421 |
| ebs-middle-3-2006-1 | P | 18 | 2 / 16 | 0 | passed | 4a6ff68735e29a2744abbadac1dba15914383aebfd4cd11cf353ec266e5c98f4 |
| ebs-middle-3-2006-2 | P | 18 | 4 / 14 | 0 | passed | 84935b6b9c76a50e6280b493021eb7379f29a688ee95932cee28a3da9c3c8007 |
| ebs-middle-3-2007-2 | P | 20 | 6 / 14 | 0 | passed | 25d13139ad9a341eb1a7e1683f5bd34c626262100e1b3cf455441f47beacf6a9 |
| ebs-middle-3-2008-1 | P | 20 | 3 / 17 | 0 | passed | 0f2b2c6106c3f073488d1b987bd722f6718ceef84fdf52ff57797e70c18eeb13 |
| ebs-middle-3-2008-2 | P | 13 | 3 / 10 | 0 | passed | 5459b621a81164192c7c1bf8685fd9aae66c5eaa756fe65817069c9fd24c3036 |
| ebs-middle-3-2009-1 | P | 20 | 4 / 16 | 0 | passed | 103628c1f4a17cd3a9d0141307d76cc771c88f42902e2ac5eccc58d4020c0989 |
| ebs-middle-3-2009-2 | P | 15 | 4 / 11 | 1 | passed | 8d8d810fa7834ed2af683c838286769e0698e9b8a48c089e0934e661160d5ec5 |
| ebs-middle-3-2010-1 | P | 17 | 4 / 13 | 1 | passed | 661cc9edd46fcb1b7074c95c60c08e92cba3fb5174280c4ef9c6af582ff22387 |
| ebs-middle-3-2010-2 | P | 20 | 0 / 20 | 0 | passed | 4975b5ae9b8a5c40fee959694982786bb5c98d66001af5bdfaba1e6f58bd989c |
| ebs-middle-3-2011-1 | P | 19 | 8 / 11 | 0 | passed | 015842df22821cdb53a77cb6250178b7cbf83f20d6ae2ad3051b4a41d6093ef8 |
| ebs-middle-3-2011-2 | P | 20 | 5 / 15 | 0 | passed | 83553fd1de6b26533d88bcd259cd20603d9eaf1a6e0dfc2dea8f1a6d185d38df |
| ebs-middle-3-2012-1 | P | 20 | 4 / 16 | 0 | passed | e2a9da76cefa585300b4505fe22d8024ec61498518910d6738eff594dc488dab |
| ebs-middle-3-2012-2 | P | 20 | 3 / 17 | 0 | passed | 6d5acfebbf254eb39174e665ee4094258e423b2933d7dc48a21a8253868fc879 |
| ebs-middle-3-2013-1 | P | 20 | 4 / 16 | 0 | passed | 81b3c5d5de971324c9749e0d37cf7143a65d6a0ba75868d5b433ab4e602f43f2 |
| ebs-middle-3-2013-2 | P | 17 | 3 / 14 | 1 | passed | f3c47495db463a24733c2052860b05badf1b46da3d6f2dcb37afb52f86631add |
| ebs-middle-3-2014-1 | P | 16 | 4 / 12 | 0 | passed | 58158e4fea3355e55de699b8bfc4b2fa2ca26d35ca7941c1947cfcd1d3d39128 |
| ebs-middle-3-2014-2 | P | 15 | 3 / 12 | 0 | passed | 6831caeb43a231f09501b11381668a130e754a1b9475800ae53e4da619f6a5ef |
| ebs-middle-3-2015-1 | P | 19 | 5 / 14 | 1 | passed | 4d9d37d61e369703dd68075f8deb3bb0655d51641a01a04cf02b2a2a7ca3f7e5 |
| ebs-middle-3-2015-2 | P | 20 | 6 / 14 | 0 | passed | a0217a10cc98658247c1016bdb97a71b5eb467c93dcb98b4bca0a2dad37d9f61 |
| ebs-middle-3-2016-2 | P | 18 | 4 / 14 | 2 | passed | c9c39e02318167465c4756d08111bdd7fd66fbe1303cf5cbe5dbe1d9a9bf1b5b |
| ebs-middle-3-2017-1 | P | 19 | 12 / 7 | 1 | passed | 9a40ceeab7c3830b11e61cb0ebd64b4cd7d8e71409a3f44258ba3a9d0854df73 |
| ebs-middle-1-2006-2 | R1 | 20 | 2 / 18 | 0 | passed | c0045524468136e179d71fd0b24830bb1a9a1749d9a666ce07695723309f76d6 |
| ebs-middle-1-2007-1 | R1 | 7 | 1 / 6 | 0 | passed | c0c6e63c6e6037c0ca4340b55d0da5b04308449be2fae3f7db4f03ecb2e48bd7 |
| ebs-middle-1-2009-2 | R1 | 20 | 7 / 13 | 0 | passed | 594493d280abce363c44b1a704328e928fa1689aae6b79cd30ac69449086e894 |
| ebs-middle-1-2010-2 | R1 | 15 | 3 / 12 | 0 | passed | 17af9b7bc6dc93b8e91d61875d81b017e59dee760bb944f6bb3d4f1a9d32e0d6 |
| ebs-middle-1-2012-2 | R1 | 19 | 3 / 16 | 1 | passed | 2dcd8500076b274caf6bec20f8829e6d0551c2a0bf2d61a92f56ee974971ffce |
| ebs-middle-2-2015-1 | R1 | 20 | 4 / 16 | 0 | passed | 8e4a19256aa56643f8b55d36d8f4dfe89d668514ae0b0c386048c48deac985c4 |
| ebs-middle-3-2007-1 | R1 | 20 | 7 / 13 | 0 | passed | 9a5b433d07cad3c7ed8f119094c8255423df81f98a4768e86ef0ca3b34fd8b77 |
| ebs-middle-3-2016-1 | R1 | 20 | 4 / 16 | 0 | passed | 30ab468fc180b390e22f29907d6cbcec9e6020c93b347fc76a9d9c38e5082e56 |
| ebs-middle-1-2017-2 | R2 | 18 | 6 / 12 | 0 | passed | 59add5aa3845e73a1425b41885c24922484d01883c849a5aeeb3a36913fb91bc |
