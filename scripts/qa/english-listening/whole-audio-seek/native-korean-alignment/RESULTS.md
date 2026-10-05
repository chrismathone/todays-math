# Measured CPU Korean CTC feasibility — 2026-10-06

**Conclusion: useful diagnostic localization, insufficient admission evidence.**
Both models produced number/first-syllable timing hypotheses on these original
clips. On 25 clips where both found paths, first-syllable grid positions agreed
within 40 ms. Path success failed as a truncation discriminator: the larger model
forced complete supplied instructions into four severely short clips. Some intact
controls had weak number posteriors, and one nominal negative started before the
aligned number. Keep existing holds: no new start tier, question identity,
missing text, or seek is authorized by this experiment.

This is Codex's continuation of the quota-stopped Gemini attempt in its assigned
namespace. No Gemini/TypeSafe/paid API inference was used here. Claude production
and the independent Codex replay ownership were preserved.

## Actual cohort and provenance

30 frozen clips across `ebs-middle-1-2007-1`, `ebs-middle-1-2007-2`, and
`ebs-middle-1-2008-1`: 10 `native_heading_replayed` windows, 10 held solely for
`pilot_onset_cue_correspondence_missing` with complete reliable literal Korean
instructions, five existing short cuts, and five existing late-start clips.
Selection used sorted source round-robin and unique measured energy onset;
negative pairs used the first five positive windows with exact existing
adversarial-onset matches. The positive windows include two measured onsets for
the same source/number hypothesis: nine distinct hypotheses, not ten human-labeled
questions. No clip was selected by CTC score.

Producer `pilot-003` (216 ledger rows, 85 offered), its RESULTS boundary limitation,
and the current localized/Claude adapters were read. Inventory
`58a53b05cced7b7f9f2b99cc641d8e84e6cf4ee7771bea3f7efa745449fda913`
and clock `bb8b37ddcd038f2f4bd2bafd346873705275aa88b2d78d605815665589f16591`
were checked. The 2,727 baseline positions were not modified. Physical/replay
controls supplied sampling strata; neither those nor historical grouped controls
are untouched human gold.

Each source was independently decoded sequentially through the existing product
native decoder with bounded clip allocation. Full PCM and energy hashes matched
the independent physical controls. All 30 clips matched native bounds/PCM hash,
16 kHz mono float32 sample count/input hash, raw container, and frozen request.
Full-source PCM was never retained on disk. Originals, raw ASR, saved starts,
prepared records, and the old ASR environment were unchanged.

Separate Python 3.12.10, Torch `2.7.1+cpu`, Transformers `5.18.0`, NumPy `2.5.3`,
PyAV `18.1.0`; intra/inter-op threads two, explicit CPU parameters, offline local
model loading, no GPU. Sequential measured per-clip inference/alignment totals:
73.780 s base and 94.483 s kresnik, excluding load/download/hash/decode overhead.

## Actual measurements

| Existing clip stratum | Clips | Base jamo path found | Kresnik syllable path found | Observed diagnostic |
| --- | ---: | ---: | ---: | --- |
| Replayed heading | 10 | 10 | 10 | Number posterior 0.082–0.9995 / 0.232–1.0 |
| Held onset correspondence | 10 | 10 | 10 | Number posterior 0.111–0.9995 / 0.00316–1.0 |
| Short instruction cut | 5 | 0 | 4 | Base target exceeds frame capacity; kresnik fits absent instruction with posteriors around 1e-11 |
| Nominal late start | 5 | 5 | 5 | Four weak number fits; one preserved number fits strongly |

Posteriors are geometric means over aligned token frames, not calibrated
probabilities that speech or an original question identity is present. Spaces,
supplied-text mismatch, model vocabulary and phonological realization affect
scores. The larger model is not uniformly stronger on each number.

Examples, relative to the immutable native clip:

| Case | Raw first segment start | Energy onset | First-syllable grid: base / kresnik | Number posterior: base / kresnik |
| --- | ---: | ---: | ---: | ---: |
| `c13`, 2008-1 probe 3, supplied `2번…` | 2.04 s | 0.40 s | 1.56 / 1.54 s | 0.99945 / 0.99988 |
| `c11`, 2007-1 probe 28, supplied `14번…` | 1.18 s | 0.40 s | 0.48 / 0.44 s | 0.99712 / 0.99998 |
| `c15`, 2007-2 probe 10, supplied `7번…` | 0.96 s | 0.40 s | 0.50 / 0.46 s | 0.97206 / 0.00472 |

Three held cases have first-syllable estimates 0.94–1.16 s after energy onset
across the models; seven align closer, 0.02–0.12 s. This supports investigating
both precursor sounds and ASR timestamp error. It does not establish what was
spoken without separately validated content evidence.

Four actual late clips begin 220–280 ms after the intact paired CTC first-syllable
estimate; number posteriors fall to 0.00379–0.03954 in base and roughly
1.2e-8–0.00346 in kresnik. `c22` still has reliable raw ASR writing the complete
`1번입니다…` instruction, yet number posterior is 0.01613 / 0.00140. Recognized
words alone fail to show the original beginning was preserved; alignment gives
an independent warning on this case.

`c30` is a label counterexample: “begun 300 ms into number” actually starts
160 ms **before** both models' first-syllable estimate. Intact `c06` and late `c30`
agree on source frame **2,368,170** at 44.1 kHz; number posterior remains
0.97262 / 0.99999. The recorded cut targeted precursor energy. Calling every
nominal late clip phonetic truncation gold would misstate these controls.
This interpretation is a model-timing hypothesis, not human proof.

Kresnik's four short-cut paths put the first number at frame zero and force the
entire intact instruction through only 39 CTC frames: number posteriors
5.38e-13–2.54e-11. Path existence demonstrably fails. Base's five no-path outcomes
reflect target-length/frame impossibility, not superior speech absence detection.

## Exact text, model and environment

Targets copy exact reliable raw character spans through the first complete
instruction. Negative targets deliberately come from intact paired raw probes;
`comparison-001.json` records the origin/spans and counterfactual use, without
claiming the negative's ASR heard those words.

Arabic numerals before `번` use deterministic Sino-Korean 1–50 verbalization:
`14` → `십사`, `16` → `십육`, `18` → `십팔`. Punctuation/whitespace handling and
each token's raw span are recorded. Base decomposes Hangul into compatibility
jamo: `십육` → `ㅅㅣㅂㅇㅠㄱ`; kresnik uses composed syllables. No phonological
rewrite, missing-text insertion, wildcard, unknown token, saved-ASR edit,
interpolation, or fallback timing. Jamo include silent initial `ㅇ` and are
orthographic units, not independently validated phoneme boundaries. Timing uses
the actual 320-sample hop; the 400-sample receptive-field center is separately
reported. All source-frame positions remain diagnostic.

| Model | Exact revision | Weight SHA-256 | Config SHA-256 | Vocab SHA-256 |
| --- | --- | --- | --- | --- |
| Kkonjeong/wav2vec2-base-korean | `fa03d1a7138f1900131393cc7cb74f77926f177a` | `eda501ecfaf436a5d81648e461ad78d7ba2baf8d30fd32fcde9da8f0603b92f5` | `dc393456738e8dab5cc51ec21416055390a373b1271180fe3458c69c8b5da587` | `70340da7e5ddd6aaf42b71df8dbffe25664743649abf1115e8ec4814ca5862dc` |
| kresnik/wav2vec2-large-xlsr-korean | `629c9a3501c10ba128bf3fa1eebb12af3be03f61` | `29be111b9247cfc2c72f125c1b1f50021ecfded8f0d947bbfb7e31dc7f0ddd07` | `51dc5f213d247606740afc690711e9880349d2e2ff29c922c657e2116b660ffa` | `4db1411162e9603b3b555a7dbc08807256b885ea0beb60ab110b283c338cfc85` |

Primary references read: [base author model card](https://huggingface.co/Kkonjeong/wav2vec2-base-korean/blob/fa03d1a7138f1900131393cc7cb74f77926f177a/README.md),
[kresnik model card](https://huggingface.co/kresnik/wav2vec2-large-xlsr-korean),
[WhisperX's Korean alignment mapping](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py),
[PyTorch CTC tutorial](https://docs.pytorch.org/audio/stable/tutorials/ctc_forced_alignment_api_tutorial.html).
The project TypeSafe skill and live [confidence guidance](https://docs.typesafe.ai/confidence)
were read before design. Here code owns calculations; CTC posteriors are not
TypeSafe confidence or action authority.

## Immutable private evidence and verification

Paths are relative to
`C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261006/native-recovery/gemini/`.

| Evidence | SHA-256 |
| --- | --- |
| `controls-003/prepared.json` | `12f0ca69e2eeb9c07206e92d4a32b57ada87153a154fecf82672ee7c5aefd080` |
| `base-run-002/results.json` | `91948d1c9f93fdd84e2ea91d3e9aeb1563b631d2be2d16e57117dc033f21894d` |
| `kresnik-run-001/results.json` | `fc07c14f4863f519839ea4c5ebe8ca8140bf075fd2df09373305f0ec110daceb` |
| `comparison-001.json` | `0a9928085ea58450b3190048ff5fc4d4e347f751517566037832286edfeb3501` |
| `sealed-evidence-001/manifest.json` | `b101fa4a4b799b5c61555e42a33faddd01f9f0bc46840f07df22edd52f171255` |
| `sealed-evidence-001/tests.json` | `65743c9895d78019be6eb1adf61a1f874d70ffb574f086f293fc1f1e9f6cef9d` |
| Both successful `environment.json` files | `00373d4c2528542974d892429021e1cb0dc75860079604d87b4dddd19efba073` |

Each run retains exact argv, model config/vocab/preprocessor/tokenizer hashes,
processor input/emissions hashes, full paths and token-frame posteriors, word and
character intervals, plus private hashed code snapshots. Sealing additionally
archives preparation/decoder/config/test code, recording original and archived
paths separately for review after worktree removal. Model weights were not copied.
Environment manifest: 9,578 Python/config/native-runtime hashes; aggregate
`163fd94d881d5c7d327fdec230c61e915692acfadb3632961368c67e9fcf755a`;
package-list hash `221b5b8d1ed03a4bef8e164dad78df13c5e9662336324fb2f63c454fc9398df7`.

Eight focused tests passed, including brute-force Viterbi optimum, repeated-label
blank requirements, absent-text legal paths, unsupported characters, literal
spans, number mapping and immutable hash-bound output. Sealing independently
recomputed all 60 paths from emissions and rechecked literal provenance, original
bytes and input hashes. No decision threshold was fitted.

A large-model download filled C: and failed at 771,751,936 bytes; only that owned
failed partial was removed. Base downloaded 377,684,952 weight bytes plus small
configuration files; the coordinator then identified the complete pinned large
public cache, reused read only. Under its explicit direction, 19 unused build
`.lib` files (859,703,748 bytes) were removed only from the private Torch venv,
with hashes/sizes in `environment-build-library-exclusions-001.json`; DLLs and
CPU inference passed. Prior prototype and failed-run directories remain
separate from successful evidence.

The small, machine-selected sample includes related windows, no human phoneme
truth, validated negative-content labels, calibrated threshold, or generalization
to all 380 negatives/193 originals. Recommend CTC only to focus independent
offline review. A future onset-correspondence change requires separately scoped
physical/content/identity controls and coordinator review. No media, Storage,
database, product source or baseline write occurred; nothing was pushed.
