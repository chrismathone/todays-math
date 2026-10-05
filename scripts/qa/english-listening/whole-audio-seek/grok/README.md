# Grok whole-audio seek beginnings

Seek candidates for the 72 audio-reconstructed national listening sources assigned to Grok. Playback starts at a recovered spoken-item cue and continues through the end of the original. This ledger does not clip files, write the database, or promote human review.

`sourceNumber` is the current generated ordinal. `cueNumber` and `scopeQuestionNumbers` are the spoken passage recovered from announcer text plus reconstruction grounding. A generated ordinal, a duration average, and the nearest number are not evidence.

## marks.json

`schemaVersion` 1, `evidenceContractVersion` 1, `provider` `grok`, `inventorySha256`, and one row per assigned current question. Every row carries `documentSha256`.

The earlier 1,100 rows that placed `startFrame` on an energy edge nearest an ASR estimate, and that copied full-ASR segment times into a 2-second float32 probe, are not admitted starts. Codex replay `replay-grok-001` held all 1,282 rows. `run.ts` now refuses to write that ledger. `auditMarks(..., { requireNative: true })` rejects it.

An admitted start has to be a Whisper recognition of a bounded native clip. The clip begins exactly 400 ms before a -50 dBFS island onset that already has at least 400 ms of measured quiet. Local word and segment times stay inside that clip. `seekEndMs` is the full original duration. Generated `sourceNumber` is not the spoken number. No full-source PCM is kept.

`mappingEvidence.alignment` is `{path, sha256}` of the question-alignment file. Anchor ids must match that file's `verified_generation_evidence_segments` list for the current question id.

Held rows have a null start and at least one `held_*` reason. `existing_verified` copies both frozen `audioRange` endpoints and is left unchanged. This assignment's ranges are null, so that status is unused here.

A printed `19번과 20번` instruction narrows to the individual `19번입니다` announcement when that announcement comes before the dialogue. A true `16번과 17번` passage that then shows an inner `16번` after dialogue keeps one shared scope and one start.

`ebs-middle-1-2006-2` is decoded from the authenticated normalized MP3, not the M4A. Its rows add `normalized_playback_clock`. Every other source is the playback slice `source[storage.start:storage.endExclusive]`, and that slice's SHA-256 must equal the inventory playback hash. A decoded duration more than 50 ms away from the playback duration holds the source's candidates.

## Run

```text
node --experimental-strip-types --test scripts/qa/english-listening/whole-audio-seek/grok/seekBeginnings.test.ts scripts/qa/english-listening/whole-audio-seek/grok/recognition.test.ts
```

`run.ts` exits before writing. Recognition uses `run_one_probe.py` on Claude's frozen medium snapshot, one source at a time, and unloads the model before releasing `gpu-probe.lock`. The inventory, snapshot, original audio, and existing assessment files are read only.
