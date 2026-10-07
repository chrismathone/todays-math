Tested pure manuscript/source preparation is ready for Root's final-plan replay. The complete current-question proposal produces 136 changed turns across 98 base-bank definitions, preserves all unrelated bytes, and keeps all 147 previous correction baseline values. No production file, database, student record, dependency, environment file, other worktree or model was changed or called.

Task `task_605f97309fc8`, dispatch `ctx_de9caad71bd4`, coordinator run `run_d1d94a0fbcb1`. The worker started at `be5483e09806e8ef6cb8cd1da00ab69b4bf33cf9`; authoritative read-only Root code was `c042550db9a8ad5cf44d84490882bb4c3f6b4fa9`. The artifact-only owncommit is returned in the completion message. Root's private Next 16.3.8 index and TypeScript guide were read before implementation. Root owns final compilation, all 9119 current-content independent reviews, activation, push and deployment.

The actual prepared output is `D:/tmp/source-sync-assist-ctx_de9caad71bd4-preliminary-3/`. Its `before/src/lib/textbook/scripts/` and `after/src/lib/textbook/scripts/` contain all seven manuscript JSON files and `static-corrections.json`. `application-plan.json` and `candidate-parts.json` contain the complete captured preliminary proposal and candidate, explicitly marked **NOT compiled or approved**; the rows have empty independent packet lists. These are technical fixtures, never a substitute for compiler evidence. The report's [output manifest](evidence/output-manifest.json), [input byte SHA manifest](evidence/input-byte-sha.json), [turn reread](evidence/changed-turns-reread.json), [untouched byte segments](evidence/unchanged-segments.json), and [test results](evidence/tests-final.json) are committed here.

| Evidence | Actual value |
| --- | --- |
| Immutable baseline content SHA256 | `c1fb425f0536e8f0f304ec5317511ad44219cc3be230b199571a769109e61f25` |
| Complete current-question candidate content SHA256 | `32a86b3b415131b6e5e8824141fa73f3b8162c2737b19773cb1b9c4172e1737f` |
| Current manuscripts | 360 sections; 7792 turns |
| Definition changes | 604 total; 98 base sources represented; 506 plus sources absent from base manuscripts |
| Changed manuscript turns | e3: 0; e4: 8; e5: 15; e6: 12; m1: 14; m2: 53; m3: 34 |
| Correction ledger | 147 previous records; 4 existing records extended; 132 appended; 279 resulting records |
| Preliminary tests | 21 passed; 0 failed |

`prepare-source-sync.mjs` is pure: it takes bytes, the plan, baseline, candidate and explicit hash pins, with authoritative Root functions injected. Final mode requires the compiler's exact status, current question revision, immutable baseline hash, candidate hash, matching reviewed definition fingerprints and fresh captured compiler-input byte hashes. It calls the existing `prepareBankSourceChanges` to reconstruct the candidate and compares any supplied `candidateParts` against that result. `replay.mjs` also requires a separately supplied plan byte SHA, a matching baseline source commit, unchanged committed Root production preimages and current `BANK_PARTS` still equal to the baseline. It verifies captured inputs again after preparation. It writes only to a new uniquely named `D:/tmp/source-sync-assist-*` directory or this artifact's `helper-output/` subtree, refusing existing destinations and junction/symlink ancestors.

Every ledger record is checked against its actual current turn before planning, including records unrelated to a definition change. Duplicate positions or IDs, missing positions, stale `new` text and moved source provenance are rejected. For changed sources, the baseline and candidate are independently materialized through `materializeGrade`; the exact current non-text turn identity must match its candidate position, and current bank text must equal baseline materialization. An independently altered bank-source sentence therefore stops preparation for investigation. The existing `planManuscriptCorrections` runs once over all seven grades so correction IDs remain globally unique.

Only approved/proposed bank-concept definition text is eligible. Bank-example and authored-example turns, v15 dialogue, openings, question framing, presentation/provenance fields, metadata and ledger review/authority fields retain their bytes. Definition recitation turns whose source is `bank-concept` can change with their definition; this does not rewrite the worked example's prompt or answer. JSON token edits replace only eligible `markdown` values and the corresponding ledger `new`/`reason` values, plus append new records. Unchanged source slices are reused verbatim, including CRLF and arbitrary existing indentation. Prior `old`, ID, source, kind and position values remain unchanged; reverting all corrections recovers the same first-manuscript semantic baseline.

The tests replay the actual captured seven-grade files, compare every prepared byte, prove unrelated whole-turn token bytes and metadata segments unchanged, and independently account for every changed base source. They also cover input non-mutation, independently edited authored text/metadata, stale candidate/baseline/plan/ledger/manuscript pins, stale ledger state, duplicate/missing corrections, changed provenance, revised definition fingerprints, duplicate JSON properties, old question revisions, compiler-input drift, empty independent packet coverage, CRLF, production-path refusal and rejection of preliminary output as adopted production. Root's unmodified `sourceLedger.ts` check returned `source-ledger.json: same` (exit 0); its unmodified `materialize.ts` check returned `same` for all seven grades (exit 0). These are preliminary baseline checks, not final compile/release evidence.

All 136 actual before/after turns and their 98 source definitions were directly reread in four bounded batches; see [direct reread notes](evidence/direct-reread-notes.json). No manuscript/source correspondence mismatch was found. This reader did not grant mathematical approval to every ID. Conditions and wording adopted by the final application plan remain Root/Claude's responsibility, and the helper refuses incomplete final compiler evidence.

The real missing-reason failure was preserved. `e5-2-5-4-xc1` originally had a changed `coreAfter`, no raw `coreReason` property and normalized `coreReason: null`; its B/C and editorial reasons were present and were not substituted. It was the only such gap across the three current scopes. Root supplied the explicit viewpoint/three-visible-faces reason and aligned its old goal, with `design-evidence/root-e5-core-reason-reread-20261007.json` and `root-e5-core-goal-reread-20261007.json` as the Root-owned reread proofs. The newest preliminary fixture contains all 604 reasoned changes and has no reason gaps. [Reason evidence](evidence/reason-gaps.json) retains the original exact fields and file SHA. The first test run's incorrect fixed expectation of 50 source IDs (actual: 98) is also preserved as a failed test artifact; it was corrected to compare the actual base-change ID set. Plain Node without Root's tsx launcher initially failed on TypeScript imports, so the commands below always use Root's private launcher and tsconfig.

Replay the committed technical tests from any working directory:

```powershell
$syncRoot = 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006'
$syncArtifacts = 'C:/Users/user/orca/workspaces/todays-math/student-clear-source-sync-20261007/docs/planning/tracks/reports/concept-student-clear-20261006/source-sync-assist-20261007'
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncArtifacts/verify-and-test.mjs" --fixture 'D:/tmp/source-sync-assist-ctx_de9caad71bd4-preliminary-3'
```

Re-synthesize a current proposal only into a **new** helper directory; it rereads current audit files and refuses drift during the run:

```powershell
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncArtifacts/replay.mjs" --preliminary --out 'D:/tmp/source-sync-assist-proposal-replay-20261007'
```

Once Root has freshly compiled the complete application plan to the exact path below, prepare the final before/after files **before activating or editing any bank/manuscript production file**. The plan file does not exist as a final approved deliverable from this worker; Root supplies it. The final compiler output must include its normal captured source manifest and per-ID packet correspondence. Optionally add `--candidate <candidateParts JSON file>` to compare the already prepared source-plan candidate; omission reconstructs it with `prepareBankSourceChanges`.

```powershell
$syncPlan = 'D:/tmp/concept-student-clear-20261006/application-plan-final.json'
$syncPlanSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $syncPlan).Hash.ToLowerInvariant()
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncArtifacts/replay.mjs" --plan $syncPlan --plan-sha256 $syncPlanSha --baseline 'D:/tmp/concept-student-clear-20261006/baseline.json' --baseline-hash 'c1fb425f0536e8f0f304ec5317511ad44219cc3be230b199571a769109e61f25' --out 'D:/tmp/source-sync-assist-final-20261007'
```

Root must compare each manifest `beforeSha256` with the current production bytes immediately before its own adoption. The worker provides no adoption/copy operation. After Root adopts the final bank source changes and the eight prepared files, the derived source ledger belongs at `src/lib/textbook/scripts/source-ledger.json`. Root may regenerate that one derived ledger with the explicit command below, then review and commit its actual adoption. Existing tests that freeze correction totals (including `textbookSourceLedger.test.ts`) need deliberate Root-owned expectation updates against the final ledger; this worker changes no production tests or approval counts.

```powershell
Set-Location -LiteralPath $syncRoot
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncRoot/src/lib/textbook/scripts/sourceLedger.ts" --write
```

The next read-only checks after Root commits adoption are exact. `verify-adoption.mjs` refuses preliminary manifests, checks all adopted output hashes and the candidate bank hash, then checks every approved bank-source turn against `materializeGrade` and every ledger `new`/source correspondence. The two original CLI checks then independently verify the derived source ledger and full materialized manuscripts. A failure means inspect the reported drift; do not use `materialize.ts --write --replace-dialogue` as a recovery step.

```powershell
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncArtifacts/verify-adoption.mjs" --prepared 'D:/tmp/source-sync-assist-final-20261007'
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncRoot/src/lib/textbook/scripts/sourceLedger.ts"
node "$syncRoot/node_modules/tsx/dist/cli.mjs" --tsconfig "$syncRoot/tsconfig.json" "$syncRoot/src/lib/textbook/scripts/materialize.ts"
```

Final compiler success, final-plan replay, the post-adoption success path, independent current-content review and release have not occurred in this worker. No unfinished helper implementation or source-sync mismatch remains; those Root-owned steps are the remaining adoption work.
