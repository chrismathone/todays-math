# Independent whole-original start verifier

This directory owns the start-only contract, CPU replay and offline adversarial
tests. It writes isolated immutable JSON evidence and certificates. It never
applies DB/Storage changes, creates persistent media, edits original questions or
ASR, changes old strict cut verifiers, or promotes human review.

Run commands from the Codex worktree; root-installed Node dependencies and the
producer's existing isolated PyAV/faster-whisper interpreter are used read-only.
PowerShell examples below use concrete artifacts for this task. A replay output
directory must be new: evidence is never overwritten.

```powershell
python -m unittest discover -s scripts/qa/english-listening/whole-audio-seek/codex -p 'test_*.py' -v

node C:/Creative/testautocreator/node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/whole-audio-seek/codex/native-clock.mts C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/native-clock-replay-002.json

& C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/claude/asr-venv/Scripts/python.exe scripts/qa/english-listening/whole-audio-seek/codex/verifier.py --inventory C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json --marks C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/claude/marks.json --marks C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/grok/marks.json --clock C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/complete-native-clock.json --frozen C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/frozen-inputs-v3.json --output C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/replay-final-002
```

Use the producers' final immutable marks paths if they publish under a run
directory. `completeReplay:false` is a failed completeness gate. A complete
certificate can include held questions: only `admitted` records supply new
ranges; `preserved` records are exact copies of the existing 38. Each admitted
range ends at the full original playback duration. The coordinator independently
reviews and applies metadata with revision/hash checks.

Before the final replay, copy every `.py`, `.mts` and `.md` file in this directory
byte for byte into a new immutable `codex/final-implementation-N` output directory
and record their SHA-256 values. Execute `verifier.py` from that archive with the
existing interpreter and final immutable provider paths. Its implementation
references then survive cleanup of this worktree, and `native-windows.mts` uses
the frozen inventory's production root to locate the existing parser/dependencies.
The verifier rechecks input and implementation hashes at completion. Never edit
an implementation archive or a completed certificate; a revised replay gets a
new archive and output directory.

`native-clock.mts` replays the production strict parser/full mpg123 decoder.
`native-windows.mts` independently replays full PCM16 and energy plus the requested
bounded PCM windows through in-memory IPC. `claude_adapter.py` verifies immutable
raw probes, physical onset, actual sample clocks, resampling hashes, spoken
scope and official identity. `verifier.py` owns queue completeness, frozen input
identity, reconstructed grounding, ordering, existing preservation and final
certificates. `converted-clock.py` measures the actual converted exception;
`converted-playback-native.mts` checks its production playback decoder;
`combine-clocks.py` combines the independent 193-source clock proofs.
`noise_floor.py` replays the explicit stationary-hiss contrast proof from actual
native energy. `replay-question.py` produces an actual source-bound single-row
diagnostic without claiming complete admission. `audit-probe-onsets.py` preserves
CPU speech-onset estimates as diagnostics, including comparison with known
preserved starts.

The TypeSafe design and evidence boundaries are documented in [CONTRACT.md](CONTRACT.md).
The additive `native-localized-generation-v2` route, complete raw probe catalog,
all original grounding quotes, shared/range/closing boundaries and ancestry
requirements are documented in [LOCALIZED-CONTRACT.md](LOCALIZED-CONTRACT.md).
`archive-implementation.py` creates a new byte-for-byte implementation archive.
`evaluate-native.py` replays all original PCM and frozen family-separated controls
plus the pilot search windows; its findings remain diagnostic.
No new recognition runs are launched by this verifier. Producers use the shared
serialized GPU queue; replay itself is CPU-only.

`parallel_verifier.py` accepts the same complete replay arguments and prefetches
at most two actual CPU source decodes. It calls the same `verifier.run` and
`claude_adapter.SourceReplay`; no identity, physical hash, uncertainty, order or
admission check changes. PCM stays in bounded memory and is never cached on disk.
The executor closes and clears pending results on completion or failure. Include
this runner in the immutable implementation archive when executing it.

Run the independent complete reconstructed mapping audit with `mapping_audit.py
--inventory INVENTORY --clock CLOCK --frozen FROZEN --probes-root GROK_PROBES
--proposal IMMUTABLE_LEDGER --output NEW_REPORT.json`. Its complete rows preserve
frozen anchors, original scope/cue IDs, peer IDs, raw uncertainty holds, producer
cross-checks and available bounded recognition references. Native support in
this report is structural evidence requiring the full actual replay. Replacement
assembler provenance is exposed separately from frozen queue lane ownership.

`audit-english-routing.py` routes complete official candidates through the
existing alignment requirements and literal source-section/opening checks. It
stops before native dialogue decoding and lists missing openings for bounded
producer enrichment; its diagnostic results never admit starts.

`recover_queue_identity.py` performs an explicitly attributed mechanical join of
four blank source identity fields from the frozen inventory into a separate
immutable reconstructed proposal. It rejects conflicting or stale identities,
duplicate/missing questions and existing verification, and preserves every
status, cue, scope, seek timestamp and raw evidence reference. Its changes report
is diagnostic only; full actual-source replay remains mandatory.

The completed 2026-10-05 replay is stored under
`C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex/replay-final-002/`.
Its `certificate.json` SHA-256 is
`99c5bc17db4c18e5b3b683776947df21b4b1b4c3ac83f9fe1159a3e5eb972368`.
It checked all 193 sources and 3,699 current questions with zero completeness
errors and 193 passed source checks: 2,165 admitted starts, 38 exactly preserved
starts and 1,496 held questions. Every admitted start continues to its full
original recording end. New starts cover 180 sources; 181 sources have an
admitted or preserved start. The remaining 12 sources have explicit holds.

`held-diagnostics.json` contains every held question and its reason;
`source-coverage.json` contains all 193 sources and independent final population,
identity, existing-range, full-endpoint and frozen-reference checks. Its SHA-256
is `85c70f5a9cc79b1e2e29b86616f12f1d16176837fe07d6381d2c43f54969cd8d`.
The exact executed implementation is the immutable 23-file
`codex/final-implementation-006/` archive from code commit
`eb87244144d87e004dc4d924e4c9824d508f710d`, with 165 passing offline tests.
The coordinator independently passed those tests and the full TypeScript check.
Final provider inputs are Claude `runs/final-002/marks.json` and Gemini's
immutable Grok-lane `ledger1282-004.json`; actual compiler provenance remains
separate from lane ownership. Archive 005 is superseded and has no completed
admission certificate. Source spans labeled `short_asr_cue_span` remain estimates
and cannot substitute for a measured native-onset method.
