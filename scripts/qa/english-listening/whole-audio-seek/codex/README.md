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
No new recognition runs are launched by this verifier. Producers use the shared
serialized GPU queue; replay itself is CPU-only.
