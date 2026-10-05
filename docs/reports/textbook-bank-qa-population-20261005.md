# Actual-bank QA row and visible-label correction, 2026-10-05

The scoped QA correction accounts for every authored DOM row slot and compares reference labels with their independently expected visible ink. The frozen renderer still fails concept-index destination checks. This report does **not** accept the product or replace any previous FAILED verdict.

Frozen input: `D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1`, renderer `07fee6f6039220443f0aab58058b9d949f835cce`. The private fixture SHA-256 remains `f316e89c0f59f8a8dbaad8277407da2162e31734fbf291d37937f5e25649b684`.

Fresh private evidence: `D:/교재_복구_실행검증_20261005/automatic/qa-population-20261005-0615`. It contains `derivation.json`, four derived E3/M2 witnesses, `geometry-controls.json`, `reference-controls.json`, `five-bank-label-and-target-diagnostic.json`, the reproduction driver/configuration, and `preservation-and-hashes.json`. Derived witnesses reuse frozen observed DOM coordinates, nodes, labels, and final placements; only row activity/empty concept-ID normalization, authored expectations, and computed coverage change. They are **not** new DOM measurements or rendered PDFs.

## Exact authored population

E3-1 student has four canonical concept-card rows on physical page 12:

| Exact model owner | Activity | Authored row keys |
| --- | --- | --- |
| `a827c352-45bd-445c-9047-b4866c309056.part-0` | concepts | `e3-1-6-1-c1.definition`, `e3-1-6-1-c1.example` |
| `a827c352-45bd-445c-9047-b4866c309056.part-1` | concepts | `e3-1-6-1-c2.definition` |
| `a827c352-45bd-445c-9047-b4866c309056.part-2` | concepts | `e3-1-6-1-c3.definition` |
| `701015c0-011c-4d69-ba79-9d6e27c48dd3` | explainActivity, page 19 | c1/c2 definition keys |
| `c77d2887-e805-43e6-9386-867b02d17b2e` | explainActivity, page 20 | c3 definition key |
| `705ecdd7-3ac4-448b-94db-3f80c2cbf784` | conceptMap, page 21 | c1/c2/c3 definition keys |

All six explanation/map slots exist in the frozen semantic `rows` nodes with `bank-activity.v1` group keys. They reuse definition keys intentionally and omit `data-concept-id`. The old expectation excluded these text-block rows, counted four unphased slots instead of ten, and falsely grouped the six observed activity occurrences as duplicates. Each unphased identity now includes concept ID (empty when absent), row key, unit, semantic activity, and exact model block owner. Duplicate detection still rejects two occurrences of that same slot; exact ordered coverage rejects a missing slot or substituted owner. The free canvas for conceptBlankTest has no authored DOM row slots; it retains existing block/writing/content checks.

| Frozen book and variants | Unphased slots | Each memory phase | Total rows |
| --- | ---: | ---: | ---: |
| E3-1 student/answers | 10 | 3 | 19 |
| M2-1 student/answers | 44 | 11 | 77 |

M2's unphased slots comprise 22 concept-card rows, 11 explanation rows and 11 map rows. Memory row keys, ordering, phase-relative page splits and coordinate comparisons remain unchanged. Existing clip, writing, semantic content, answer absence, font and QR checks remain active.

## Visible-label and geometry evidence

Expected labels come from frozen exchange entries, independently decoding only understood inline math: integers, simple variable expressions, and explicit multiplication/division/dot commands. Unsupported notation fails closed with `INDEX_LABEL_NOT_SUPPORTED`; meaningful digits, variables, operators, punctuation and word order remain in the comparison. Printed labels use every painted glyph within the original DOM label box, ordered by measured baseline then x coordinate, instead of the PDF text-object stream order. Whitespace compaction remains the existing comparison rule.

| Frozen student sample | PDF page | Preserved inline identity | Original label box, mm |
| --- | ---: | --- | --- |
| `m2-01-01-c6` | 72 | `$10$` becomes `10` | `[12.9977, 99.3717, 170.9994, 104.7667]` |
| `m2-01-02-c5` | 72 | `$n$` becomes `n` | `[12.9977, 145.6945, 170.9994, 151.0895]` |
| `e4-1-1-2-c2` | 26 | `$0$` becomes `0` | `[12.9977, 62.3135, 170.9994, 67.7085]` |
| `e5-2-2-1-c1` / c2 | 27 | `\times` becomes `×` | y `[53.0490, 58.4440]` / `[62.3135, 67.7085]`, x `[17.9999, 176.0017]` |
| `e6-1-1-3-c2` | 44 | `\div` becomes `÷` | `[12.9977, 62.3135, 170.9994, 67.7085]` |

For M2 c6, the prose before the math ends at x 64.2037 pt, the `10` glyph run occupies x 64.2070-74.2870 pt, and subsequent prose starts at x 74.2969 pt. All three runs share baseline y 293.25 pt. Textbox stream extraction appended `10` after the complete prose; geometric reading restores exactly its visible position. This is a reading-order correction, with no expanded label boxes or removed glyphs. The private reference evidence records exact expected, DOM and printed strings.

All 314 reference labels in the five diagnosed books (E3-1, M2-1, E4-1, E5-2, E6-1, student and answers) pass the corrected label comparison. These are read-only diagnostics of frozen files, not a full14 run.

## Independent destination oracle and remaining product failure

An explicit targetConceptId resolves within the target unit. For conceptIndex entries with legacy section pointers, an exact entry-key match to a placed semantic conceptId in that unit independently identifies the concept. The preferred destination is its actually placed semantic `concepts` activity. If that activity is absent, the earliest placed semantic concept remains supported and records `legacy-first-placed-concept`, its block, activity and page. An unmatched legacy key retains section resolution with explicit `legacy-section-pointer-no-matching-concept` evidence. Ordinary table-of-contents section references keep section resolution.

Frozen E3 concept entries print `11`; their actual definition cards are on `12`. M2's first concept group prints `18`; definition cards are on `19` or `20`. The corrected oracle rejects DOM page numbers, PDF number ink, and filled model numbers independently. E3/M2 student+answers retain **84** such target issues (14 concept entries per variant, three checks each). Across the five diagnosed books, **156** destination issues remain. The coordinator owns the product correction and integration/build; no product code changed in this task.

## Validation

- Scoped TypeScript compilation of dom-witness.ts and its imports: PASS, incremental cache disabled.
- Scoped ESLint of dom-witness.ts: PASS.
- Python compilation of the four changed Python files: PASS.
- Existing geometry guard suite: **57 tests PASS**, including memory split/coordinate, content/answer role, clipping and source writing safeguards.
- Frozen E3/M2 student geometry baselines: PASS on **103 pages**, **96 rows**, **6,125 text spans**, and **1,536 clip nodes**. Six real controls reject missing explanation slots, duplicates of the same authored slot, and changed owners.
- Four derived student/answers witnesses pass computed population coverage; the private TypeScript driver independently rejects missing explanation and duplicate map slots.
- **16** focused E3/M2 student/answers reference controls: PASS, with known frozen target failures required. Controls change meaningful DOM math, remove actual math ink in an in-memory PDF, retain the real wrong section destination, prefer a canonical definition over an earlier observed errorCheck concept, and verify no-concepts-activity fallback evidence.
- Frozen PDFs, exchange/model content, prior witnesses and verdict files remain unchanged; hashes and structural preservation assertions are in the private manifest. No product rendering, installation, Prisma generation, DB access, deployment or push occurred.

Human all-page reading, physical printing, coordinator integration/build, and a product-corrected final run remain separate completion gates.
