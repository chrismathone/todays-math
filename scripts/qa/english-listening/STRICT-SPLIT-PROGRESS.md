# Verified listening derivatives, 2026-10-05

The bounded seven-source scan stages **18 separate question WAVs** with strict source-speech evidence and measured native PCM boundaries. The 137-question ledger keeps **119 questions on their unchanged original whole-audio fallback**. These derivatives are offline artifacts; no original assessment document, group, question, audio asset, database row, or Storage object was changed.

All 137 questions in these seven sources still use their original audio in production. The 18 new clips are staged eligibility evidence for the coordinator's separate adoption review.

Final artifacts: `C:/Creative/testautocreator/output/listening-assessments/strict-split-progress-20261005/final-002/manifest.json`. The earlier `scan-002` and `scan-003` directories are retained as historical diagnostics and do not bind the final committed verifier. Failed initialization directories have no completed manifest.

| Original source | Questions | Physically quiet candidates | Verified staged questions |
| --- | ---: | ---: | --- |
| ebs-middle-1-2026-2 | 20 | 19 | 4, 5, 7, 10, 12, 13, 14, 15, 19 |
| ebs-middle-2-2026-2 | 20 | 20 | 1, 4, 5, 7, 8, 14, 15, 18 |
| ebs-middle-3-2026-2 | 20 | 17 | none |
| ebsi-high-1-2026-2 | 20 | 20 | none |
| ebsi-high-2-2026-2 | 20 | 19 | 4 |
| ebsi-high-3-2026-2 | 20 | 19 | none |
| ebsi-high-1-2026-09-mock | 17 | 15 | none |
| Total | 137 | 129 | 18 |

129 is an acoustic candidate count, not an admission count. It includes questions whose number, dialogue, source span, or adjacent speech evidence fails. Only `staged_verified_derivative` means a WAV exists and both speech and physical checks passed.

## Why most whole recordings remain unsplit

The previous strict stage recorded 106 candidate checks and 31 uncertain questions, but its admission command required every original question in a round to pass. Its caches had not been measured for actual PCM quiet. Five of the seven Korean caches also contain segments extending past their actual 12-second recognition probes; clamping those timestamps would invent evidence.

Independent staging now validates every original question identity and the complete official script, then applies the existing strict speech gates to the selected complete passage. Unselected uncertain entries keep their actual identities and unresolved evidence, including null cues or empty copies. No placeholder cue is manufactured.

Korean verification retains every raw segment of each referenced probe. Unrelated probes remain in the unchanged SHA-bound cache and in the rejection diagnostics. English recognition windows that intersect the passage, or have a raw segment intersecting it, must still pass exact original sample-offset checks. A malformed selected window or probe remains rejected. Choosing an unchanged raw English cache instead of an aggregate is recorded by its own artifact SHA and exact original segment IDs.

Remaining failures include unclassified speech within a passage, incomplete positional first/last anchors, selected ASR timestamps crossing real speech, omitted source speech, incomplete repeat/scope evidence, and physical refinement holds. Each source review preserves exact per-question reasons and the complete PCM scan evidence.

Two concrete source-proof gaps deserve the next bounded scan:

- `ebs-middle-3-2026-2`: official source characters 11418–11474 contain `Heather,` before an answer blank. Existing section bounds omit that real prefix. A new proof version must retain the exact source span and obtain its complete audible closing anchor.
- `ebsi-high-1-2026-2`: question 20's section includes `Julian: Kate,`, while its final utterance span retains `Kate,`. The unchanged strict middle-dialogue gate rejects this inconsistent treatment of the named speaker label. A new evidence extraction must preserve the original source text and provide consistent source spans.

Repair those proof references and inspect only the specifically rejected raw recognition windows/probes next. Any re-recognition must use actual bounded source samples and preserve old caches. This phase does not expand recognition work or change the official text.

## Evidence and preservation

The final manifest binds the strict verifier, boundary implementation, and staging script SHA-256 values. Each source review records the original audio hash, prepared/source-script hashes, native PCM hash and frame identity, selected raw ASR references, exact ordinal utterance, original source utterances, and complete dialogue segment references.

Each eligible question has a separately staged alignment ledger and WAV with native source start/end frames, source timestamps, duration, sample rate, channel count, byte length, and SHA-256. The written WAV SHA must equal the SHA of the exact stream measured by the physical boundary gate. The raw 20-ms maximum-channel power windows, boundary moves, and rejection reasons are retained.

The fixed policy remains **400 ms quiet at −60 dBFS**, measured on every native channel, with a maximum **1.5-second** boundary refinement. Exact VAD event ownership, spoken ordinals, repetitions, shared-passage completeness, source coverage, positional anchors, and unclassified-speech checks remain required. The 16-kHz proof clock represents native boundaries conservatively; it never rounds outward to claim speech ownership.

`immutable-inputs.json` records 136 archived input files verified before and after the final scan. This includes all prior strict-stage files, raw ASR inputs used by this scan, the seven prepared original documents and their source files, and the frozen `ebsi-high-1-2022-2` original/prepared/proof artifacts. Its previously adopted 20 clips receive no new plan or mutation. This is a scoped preservation inventory, not a claim to have rehashed the entire archive or read current DB objects.

No ASR text or timestamp was rewritten. No prompt, instruction, choice, answer, image, metadata, or original group was rewritten. `humanReviewed:false` remains accurate, and this run makes no new TypeSafe/LLM/provider call. The project skill and live TypeSafe documentation were read; deterministic evidence checks remain in code.

## Historical operator adoption instructions — superseded

**2026-10-05 policy change:** the user cancelled question-level audio for national assessments and requested original whole-round playback for every national listening/mock assessment. Do not adopt these staged clips. The only previously split production source, `ebsi-high-1-2022-2`, has been restored to its archived original whole-round group; its derivative files remain archival records. The trusted importer rejects national sources before Storage writes. The instructions below describe the earlier staging contract and are no longer an active adoption plan. See `docs/operations/english-listening-original-preservation-20261005.md` for the actual production verification.

The later user request permits seeking inside that full original and continuing to the end. After a fresh independent replay, root registered only the verified native start timestamps for these 18 passages and the previous 20-question 2022 source. No clip was uploaded, no whole-source audio binding was replaced, and no original question content was changed. These 38 positions are timestamp-only metadata; they do not grant partial derivative-media adoption.

The production `loadListeningQuestionAudioPlan` still requires whole-round admission through `verifyQuestionAudioEvidence`. The new `verifyQuestionAudioPassageEvidence` is an offline staging contract. These artifacts cannot be passed off as a production complete-round alignment or used to bypass the existing importer.

Before adoption, root needs a separately reviewed derivative-association contract that retains the original full group/audio and all original document bytes. It must associate verified derivative media with the existing immutable source/question identities and provide whole-audio fallback for every unresolved question. Changing group structure or copying questions into replacement documents is outside this phase.

The implementation review and operator preflight must:

1. Bind the final manifest, code hashes, immutable input inventory, prepared question IDs/order, official transcript/PDF hashes, and original audio SHA. Independently replay the selected raw speech proof and decode the complete original source again.
2. Compare each staged WAV byte-for-byte with its exact native PCM source range, remeasure the fixed quiet policy, verify its SHA and complete ordinal/dialogue/anchor evidence, and retain all shared passage and common-number scope requirements. Any mismatch keeps whole-source fallback.
3. Preserve the original group, asset, ordered questions, transcript, prompts, options, answers, images, and metadata. The derivative association and access contract must enforce ownership, rights, quota, authenticated media access, and an atomic current-snapshot/CAS binding.
4. Test partial derivative lookup plus whole-audio fallback, stale snapshot refusal, corrupted input/clip refusal, selected probe/window overflow, common/shared scope completeness, and the unchanged previous 2022 source. Database-writing integration checks belong to that separate authorized adoption task.
5. Have root review the exact resulting association plan before any upload or DB write. Record real application receipts separately; an offline staging status does not mean students are already using the new clips.

## Reproduce and verify

Run from the worker checkout with a fresh run name; an existing run directory is rejected rather than overwritten:

```powershell
node --conditions react-server node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/strict-split-progress.ts --base C:/Creative/testautocreator/output/listening-assessments --run fresh-run-name
```

The optional `--source-id` flags limit the known prior seven-source list. A future M4A input requires `--ffmpeg-path` pointing to an existing absolute binary and uses the existing trusted conversion; absent/failed conversion is an explicit rejected source, not a new clip. This completed seven-source run decoded MP3 inputs.

Validation: 62 offline passage/proof/PCM/fence tests passed; changed-file ESLint and scoped TypeScript passed; full repository TypeScript passed after Prisma client generation with an 8-GiB Node heap. The separate six-case PostgreSQL adoption suite was skipped because this task forbids DB writes; it is not included in the 62 passing offline tests. Full tests and check logs live under `strict-split-progress-20261005/checks`.

The coordinator independently replayed `final-002` on 2026-10-04 at 18:57 UTC: all 136 immutable inputs matched, all three original sources were decoded again, and every one of the 18 clips passed exact raw speech/cue proof, native source range, byte-length/SHA, and quiet remeasurement. The receipt is `C:/Creative/testautocreator/.qa-artifacts/listening-original-preservation/replay-2026-10-04T18-57-35-025Z.json`; a copy is retained in the output checks directory. The coordinator also reported unchanged live documents/revisions/publication counts for all 193 imported sets between its two read-only DB snapshots.

This task leaves merge, production adoption, and Orca worktree cleanup to root. The independent replay validates offline derivatives; it does not authorize or perform a partial production adoption.
