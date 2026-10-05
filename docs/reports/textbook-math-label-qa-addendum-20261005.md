# Frozen math-label QA addendum, 2026-10-05

This QA-only correction decodes the frozen `\mathrm{R/H/A/S/RHA/RHS}`, `\sin`/`\cos`/`\tan`, and six quadratic expressions. Every letter, digit, sign and parenthesis remains in the expected visible sequence. Unknown commands, unsupported braces and exponents fail closed. Expectations come from frozen exchange entries, independently of the renderer.

PDF reading retains every bounded glyph and orders it by x within its actual line. Smaller raised KaTeX glyphs join only an adjacent math base with overlapping vertical bounds and bounded baseline/font-size differences. Wrapped lines remain separate. Expected and observed exponent positions are compared separately, so replacing a raised `2` with a baseline `2` fails even when DOM/PDF glyph text is identical.

Evidence reads the unchanged outputs under `D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-36ba3bc4-other12-20261005-attempt1`. Product authority remains `578b3d584`; the directory identifies original render QA `36ba3bc4`. The harness handoff SHA-256 is `bed7766878fef528e5b73ff1bc04c855246032315932682c149835a6d04ae5ea`.

| Pair | Student/answer math labels | Student/answer index labels and numbers | Rejected real controls |
| --- | ---: | ---: | ---: |
| M2-2 | 4 / 4 | 36 / 36 | 32 |
| M3-1 | 6 / 6 | 43 / 43 | 108 |
| M3-2 | 1 / 1 | 35 / 35 | 8 |

All 22 cases (11 distinct frozen labels) and 228 index rows pass reference comparison. The 148 in-memory DOM/PDF controls reject missing/changed exponents, changed signs, missing variables or upright letters, wrong trigonometric tokens, wrong destinations, duplicate rows, and exponents moved to the baseline. They do not alter the saved PDFs, witnesses, source fixtures, HTML or PNGs. Exact source labels, actual DOM/PDF strings, boxes, PDF pages and input hashes are retained in [math-label evidence](<D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-36ba3bc4-other12-20261005-attempt1/qa-math-label-controls-20261005.private.json>), SHA-256 `1a1eb494e859928a49e850541ce1fd8d01d07402f09d71e338f09bf0637f6bb6`.

Validation:

- Eight focused unit tests pass: notation, unknown syntax, preserved meaningful glyphs, exponent structure, x ordering, wrapping, baseline substitution and duplicate ink.
- All 16 existing frozen E3/M2 controls pass and continue requiring 84 historical destination issues; [fresh evidence](<D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-36ba3bc4-other12-20261005-attempt1/qa-frozen-e3m2-reference-controls-20261005.private.json>), SHA-256 `8247271f89c2ea02324fb4d512542be741db43ec1bf579a1565b4c21a6787801`.
- Existing three-pair export checks pass 83 answer references and 228 index references, rejecting 201 original mutations; [fresh evidence](<D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-36ba3bc4-other12-20261005-attempt1/qa-export-reference-controls-20261005.private.json>), SHA-256 `0852513cf87bb319d401ee109ae65c138ceba50ad3a8f249826e458e38957a43`.
- All 57 unchanged geometry tests pass; [evidence](<D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-36ba3bc4-other12-20261005-attempt1/qa-addendum-geometry-controls.json>), SHA-256 `e71a4cd218ab776052bb73ab26375f90a6e5ef64285a2fbd05b3bd2bc7c638aa`. The six unchanged product page-reference tests, Python compilation and diff checks also pass.

Reproduce the new focused proof with `python -B scripts/qa/textbook/recovery/test_export_references.py <frozen-directory> --only 중2-2,중3-1,중3-2 --math-label-controls --output <fresh-output.json>`.

Scope is label/reference evidence only. Product, renderer, layout, bank/source fixtures, native/source-guide helpers, chunk/refinalization harnesses and archived verdicts remain unchanged. Root integration and the harness worker's final strict rerun under the integrated helper hash are still required; this addendum does not replace historical failures or claim whole-product acceptance.
