# Original-source question audio evidence

These tools stage read-only evidence. They do not connect to a database, upload audio, approve rights, or certify human review. They reject the already applied `ebsi-high-1-2022-2` source; its original proof must remain frozen. New files live in `output/listening-assessments/strict-stage-20261004`.

The current run covers six 2026 round-two national recordings and the 2026 September high-school-one mock recording. Its 137 original questions remain grounded in the unchanged prepared PDFs/transcript text. Other years are not automatically promoted. The input script snapshots currently come from the eight previously inspected `question-alignment/*.strict-script.json` artifacts; unsupported historical source numbering needs a separate extractor and explicit failure ledger.

Use the existing isolated venv with pinned `asr-requirements.txt` and CUDA DLL dependencies recorded in `output/listening-assessments/official-asr-stage/RESUME.md`. The cached snapshot is `08e178d48790749d25932bbc082711ddcfdfbc4f`, medium/int8, beam 5, one CPU thread, one CT2 worker. Run at most these two disjoint GPU queues. No new model download or paid provider is used.

```powershell
& '<venv Python>' -X faulthandler -u scripts/qa/english-listening/strict-stage-queue.py --base C:/Creative/testautocreator/output/listening-assessments --worker 0
& '<venv Python>' -X faulthandler -u scripts/qa/english-listening/strict-stage-queue.py --base C:/Creative/testautocreator/output/listening-assessments --worker 1
```

Each queue preserves completed caches. Korean probes use the first 12 actual seconds of source VAD events after the opening. Actual recognized numbering creates bounded English recognition windows, with `condition_on_previous_text=False`. Those windows are inputs to recognition, never final cuts. Combined numbering instructions do not establish a shared passage; only the original actual spoken paragraph can establish one. Missing, uncertain, ambiguous, or too widely spaced cues stay unresolved. Exact source sample offsets and decoded float32 hashes are retained.

For each source, after the queue completes:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/strict-stage-cue-map.ts --base C:/Creative/testautocreator/output/listening-assessments --source-id <source>
python scripts/qa/english-listening/strict-stage-derive.py --base C:/Creative/testautocreator/output/listening-assessments --source-id <source>
python scripts/qa/english-listening/strict-stage-review.py --base C:/Creative/testautocreator/output/listening-assessments --source-id <source>
node node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/strict-stage-proof.ts --base C:/Creative/testautocreator/output/listening-assessments --source-id <source>
python scripts/qa/english-listening/strict-stage-manifest.py --base C:/Creative/testautocreator/output/listening-assessments
```

The Korean decimal-form fallback comes exclusively from the production core's `questionAudioKoreanInstructionCueNumbers`; Python reads only its raw-file/segment-ID and script-SHA-bound map. If that core helper is unavailable, keep the source unresolved. A temporary read-only bridge used the root review worktree's core before that helper was committed; each result records the exact core SHA. Recompute final strict checks with the reviewed production core before application.

Derived observations retain actual multilingual, baseline-English, and localized-English cache origins, unchanged text, uncertainty, and estimated timestamps. Candidate selection never rewrites speech or inflates coverage with overlapping observations. Actual raw 12-second model timestamp overshoot and empty recognition windows are retained and reported; they are not silently trimmed to fit a validator. Existing strict checks may reject those caches.

VAD threshold 0.5, minimum silence 2000 ms, and speech padding 400 ms are retained with original audio SHA, whole decoded float32 SHA, and padded/unpadded events. **VAD padding is not measured quiet audio.** Native PCM quiet, end tones, complete intervening event ownership, exact repetition scope, sentence-level first/last anchors, and audible prefixes before answer blanks need the subsequent reviewed acoustic/source guards. Existing input source transcripts remain unchanged; missing proof utterance prefixes require a separate version of the staging proof.

`candidate_checks_passed` is not a final approval. Even a whole-round strict staging pass remains ineligible for operation until the current trusted loader and acoustic checks succeed. No ASR timestamp becomes an exact `audioRange`, no equal-duration division is used, and no human-review stamp is written. The independent operator creates snapshot/CAS bindings and performs any actual Storage/DB application.
