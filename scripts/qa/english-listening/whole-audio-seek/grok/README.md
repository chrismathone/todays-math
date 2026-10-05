# Grok whole-audio seek beginnings

Seek candidates for the 72 audio-reconstructed national listening sources assigned to Grok. Playback starts at a recovered spoken-item cue and continues through the end of the original. This ledger does not clip files, write the database, or promote human review.

`sourceNumber` is the current generated ordinal. `cueNumber` and `scopeQuestionNumbers` are the spoken passage recovered from announcer text plus reconstruction grounding. A generated ordinal, a duration average, and the nearest number are not evidence.

## marks.json

`schemaVersion` 1, `evidenceContractVersion` 1, `provider` `grok`, `inventorySha256`, and one row per assigned current question. Every row carries `documentSha256`.

A candidate has integer `seekStartMs` from the production playback decode: `floor(startFrame * 1000 / sampleRate)`. The measured frame is the rising-edge onset closest to the cue's ASR estimate, and it must fall within 1.2 seconds of that estimate. `startFrame` equals `cueOnsetFrame`, so the start precedes the onset by 0 ms (inside the 0–500 ms rule). `seekEndMs` is null. The range end stays the full original duration.

`nativeEvidence` binds `sourceAudioSha256`, `sampleRate`, `startFrame`, `probe` (a JSON file hash), `probeOffsetFrame`, `probeFrameCount`, `cueProbeSegmentIds`, `cueOnsetFrame`, and `pcmSha256`. `decodedAudioSha256` is the playback byte hash. `pcmLayout` is `float32le-interleaved`. The probe JSON keeps the source path and hash, the playback byte offset and count, the PCM path and hash, and raw ASR segments with their uncertainty and metrics. Local segment times are the raw estimates minus the probe offset. Nothing in the raw ASR file is rewritten.

The PCM window is 2 seconds from the onset, or the remainder of the file. No full-source PCM is kept.

`mappingEvidence.alignment` is `{path, sha256}` of the question-alignment file. Anchor ids must match that file's `verified_generation_evidence_segments` list for the current question id.

Held rows have a null start and at least one `held_*` reason. `existing_verified` copies both frozen `audioRange` endpoints and is left unchanged. This assignment's ranges are null, so that status is unused here.

A printed `19번과 20번` instruction narrows to the individual `19번입니다` announcement when that announcement comes before the dialogue. A true `16번과 17번` passage that then shows an inner `16번` after dialogue keeps one shared scope and one start.

`ebs-middle-1-2006-2` is decoded from the authenticated normalized MP3, not the M4A. Its rows add `normalized_playback_clock`. Every other source is the playback slice `source[storage.start:storage.endExclusive]`, and that slice's SHA-256 must equal the inventory playback hash. A decoded duration more than 50 ms away from the playback duration holds the source's candidates.

## Run

```text
node --experimental-strip-types --test scripts/qa/english-listening/whole-audio-seek/grok/seekBeginnings.test.ts
node --experimental-strip-types scripts/qa/english-listening/whole-audio-seek/grok/run.ts --inventory <inventory.json> --out <grok-artifact-dir>
```

The interpreter is Node with `--experimental-strip-types`. The runner writes `marks.json`, `summary.json`, and `probes/*.probe.json` plus `probes/*.f32`. The inventory, snapshot, original audio, and existing assessment files are read only.
