# Gemini Native-Evidence Assembler

This directory contains the code to assemble the exact `nativeEvidence` and `probeEvidence` for the Grok-assigned English listening questions.

## History & Provenance
- `ledger1282.json`: The original ledger was inadvertently overwritten around 08:15. The old artifact (SHA `3f526...`) was overwritten/rejected and is marked as a historical fact. It will not be reconstructed or faked.
- `ledger1282-002.json`: A snapshot of the overwritten bytes to preserve its state.
- `ledger1282-003.json`: The newly assembled ledger using `wx` exclusive create mode. It includes the exact `sourceAudioSha256`, `playbackSha256`, `asrPath`, and `asrSha256` copied from the frozen inventory. Held reasons now preserve audit details (e.g. `original_raw_cue_uncertain`) rather than a generic `audit_held`.

## Ongoing Work
- Grok's recovery queue `round-009` (39 remaining pending sources, 513 pending probes) has been resumed using Claude's `run_probes.py`.
- Logs for this recovery are streaming to `resume-round009-001.log`.
- `assemble_ledger.py` correctly utilizes the independent Codex verifier paths and strictly conforms to actual native proof replay requirements.
