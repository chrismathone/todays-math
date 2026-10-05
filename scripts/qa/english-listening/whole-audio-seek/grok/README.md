# Grok whole-audio seek beginnings

Seek candidates for the 72 audio-reconstructed national listening sources assigned to Grok. Playback starts at a recovered spoken-item cue and continues through the end of the original. This ledger does not clip files, write the database, or promote human review.

`sourceNumber` is the current generated ordinal. `cueNumber` and `scopeQuestionNumbers` are the spoken passage recovered from announcer text plus reconstruction grounding. A generated ordinal, a duration average, and the nearest number are not evidence.

## marks.json

`schemaVersion` 1, `evidenceContractVersion` 1, `provider` `grok`, `inventorySha256`, and one row per assigned current question. Every row carries `documentSha256`.

The earlier 1,100 rows that placed `startFrame` on an energy edge nearest an ASR estimate, and that copied full-ASR segment times into a 2-second float32 probe, are not admitted starts. Codex replay `replay-grok-001` held all 1,282 rows. `run.ts` now refuses to write that ledger. `auditMarks(..., { requireNative: true })` rejects it.

An admitted start has to be a Whisper recognition of a bounded native clip whose first reliable speech is the original numbered cue. Local word and segment times stay inside that clip. `seekEndMs` is the full original duration. Generated `sourceNumber` is not the spoken number. No full-source PCM is kept. Energy contrast alone is not admission. Codex still replays the native frames, hashes, frozen anchors, and original order.

Three onset selectors are supported, and none replaces another:

| Method | Rule |
| --- | --- |
| `absolute_energy_v2` | Absolute −50 dBFS. Quiet is at least 100 ms. The lead is that quiet, capped at 400 ms. |
| `noise_floor_contrast_v1` | The 100 bins (2 s) before the onset. Stationary nearest-rank floor, threshold = median + 10 dB, at least 3 of the next 5 bins above it. Quiet is counted against that threshold. Lead is min(400 ms, that quiet). |
| `noise_floor_contrast_1second_v1` | The same rule on 50 bins (1 s). It is only for a numbered cue whose introduction occupies the second before it. A two-second proof is not reused as a one-second proof. |

The rejected 1,100-row energy ledger, rounds 001–013, and Codex's one-second proof stay in place. New hearings get a new round file. `marks.json` is not rewritten with those hearings.

`ledgers/round011-recovered-1282.json` paired a generated ordinal with an original cue and is withdrawn. `ledgers/anchor-mapped-1282.json` records the frozen-anchor passage for every question. `ledgers/anchor-matched-1282.json` keeps that mapping and adds a candidate only where one current question owns the passage and a completed probe hears that cue with a remeasured onset. Shared passages stay held. Neither file is an admitted start. `productionApplicationAuthorized` stays false.

`mappingEvidence.alignment` is `{path, sha256}` of the question-alignment file. Anchor ids must match that file's `verified_generation_evidence_segments` list for the current question id.

Held rows have a null start and at least one `held_*` reason. `existing_verified` copies both frozen `audioRange` endpoints and is left unchanged. This assignment's ranges are null, so that status is unused here.

A printed `19번과 20번` instruction narrows to the individual `19번입니다` announcement when that announcement comes before the dialogue. A true `16번과 17번` passage that then shows an inner `16번` after dialogue keeps one shared scope and one start.

`ebs-middle-1-2006-2` is decoded from the authenticated normalized MP3, not the M4A. Its rows add `normalized_playback_clock`. Every other source is the playback slice `source[storage.start:storage.endExclusive]`, and that slice's SHA-256 must equal the inventory playback hash. A decoded duration more than 50 ms away from the playback duration holds the source's candidates.

## Run

```text
node --experimental-strip-types --test scripts/qa/english-listening/whole-audio-seek/grok/seekBeginnings.test.ts scripts/qa/english-listening/whole-audio-seek/grok/recognition.test.ts
```

`run.ts` exits before writing. MPEG recognition goes through Claude's `run_probes.py` on the frozen medium snapshot. The converted 2006-2 playback goes through `runConvertedProbes.py`, which checks the original m4a hash and Codex's zero-offset proof, then decodes the normalized MP3 at 48000 Hz. Both wait on `gpu-probe.lock` and unload the model before release. The inventory, snapshot, original audio, and existing assessment files are read only. `run_one_probe.py` is not the current runner.

## Recovery ownership

Grok reached its weekly usage limit before finishing the 71-source round-009
recognition request. Gemini 3.1 Pro through Antigravity resumed the existing
request, preserving its 32 completed source files and processing the remaining
39 sources and 513 probes. The frozen lane stays `grok`; Gemini is the actual
recovery coordinator and ledger compiler. Its versioned ledger and Codex's
independent final certificate supersede the earlier diagnostic proposals.

The original Grok tools remain offline evidence planners. They cannot register
starts, and their Korean-only cue heuristics do not resolve translated or missing
original headings. Such questions require the final independent scope checks.
Helpers resolve merged code in the main workspace rather than finished worker
directories. Native measurement refuses to overwrite stored evidence.
