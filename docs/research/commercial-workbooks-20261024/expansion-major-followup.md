# Major publisher follow-up — 2026-10-24

The accepted seven packs are unchanged. This worker completed Visang Concept Root, Visang Type Manrep, and Mega CPR: **3,470 addresses, 3,435 reviewed short keys, and 35 individually documented null keys**. The coordinator accepted all three packs. RPM Pro ownership transferred at 18:09Z to the elementary worker and that worker completed it in commit `956a09f9e`; RPM is outside this worker's final pack totals.

| Source | Current outcome | Pack | Addresses | Reviewed keys | Missing keys |
| --- | --- | --- | ---: | ---: | ---: |
| `root/samples/visang-27061.pdf` | Ready | `visang-conceptroot-common1-2022-v1` | 839 | 839 | 0 |
| `root/samples/visang-26737.pdf` | Ready | `visang-typemanrep-m2-1-2022-v1` | 1,386 | 1,369 | 17 |
| `root/samples/mega-1493.pdf` | Ready | `mega-cpr-m2-1-1493-v1` | 1,245 | 1,227 | 18 |
| `root/samples/imath-rpm-pro-common1.pdf` | Transferred; completed by new owner in `956a09f9e` | See new owner's delivery | — | — | — |

Completed pack commits are `2f63d30c7` (Concept Root), `57597673f` (Type Manrep), and `013f1625e` (CPR). Each includes JSON, exact-round-trip TSV, coverage and individual exclusion records, scoped tests, and its report update. The final settlement update changes only this report; registry integration and registration belong to the coordinator.

## Visang Concept Root

Official title: **개념루트 공통수학 1 (22개정)**. The [official product page](https://book.visang.com/books/info/5396) confirms the title, 2022 curriculum revision, and ISBN **979-11-6940-929-2**. Printing number and publication date remain unconfirmed; the timestamp in the public PDF URL is not a printing or publication claim.

The reviewed [official PDF](https://cdn.visang.com/book/202407/20240716171708456.pdf) has 156 pages and SHA-256 `891d9b528d67ed309fc4ca5cc77f1d2b783ebe73434057b0d9884f7b60b63649`. Its distributed solutions on PDF pages 2–153 contain printed main numbers **001–839**, 75 body-page labels/ranges, and 18 chapter headings. All 839 addresses and short answer references are present. PDF page 1 is the cover; pages 154–156 are MEMO. No numbered exercise region in this source scope is omitted.

Each answer region was rendered and visually read. The text layer supplied coordinates and candidates; it did not establish reviewed status. Visual corrections preserve fractions, radicals, ±, inequalities, decimals, and units. Matrices use nested arrays with one inner array per printed row, and simultaneous solutions retain each x/y pair inside braces. Enlarged rechecks resolved tall cases, top matrix rows, and a clipped right edge. There are no unresolved keys in this source, so its individual missing-key ledger is empty.

This is full address coverage of the specified solution PDF, **not an independent audit of every activity or example in the separate problem book**. Reviewed means correspondence to the fixed source; it does not claim a proof of the publisher's mathematical correctness or application of later errata. Data is a short reference for teacher manual grading.

External evidence root: `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/major/`.

- `visang-27061/followup/`: all text spans and coordinates, 839 answer crops, 35 full answer review sheets, 75 header crops/three review sheets, chapter crops, seven enlarged rechecks, manually corrected answers, independent header/chapter census, and visual review receipt.
- `extract_visang_root.py`, `root_answers.py`, `root_final_evidence.py`, `build_visang_root.py`: reproducible extraction, rendering, transcription normalization and pack assembly. These files and source images remain outside the repository.
- `registration.json`: aggregate registration entries retaining all accepted packs; coordinator owns registry changes.
- `status.json`: aggregate per-source state, including the prior audit and follow-up progress. Its historical RPM progress entry does not reflect the new owner's completion; the transfer section below records the final ownership and completion rather than rewriting the preserved evidence.

Validation uses the strict create-edition contract, exact TSV round-trip, an independently transcribed 75-group/18-chapter address census, source-page/region coverage, empty missing-key ledger checks, 139 choice-key count, and explicit numeric/symbol/unit/matrix regressions across the book.

Concept Root validation completed: five related pack test files, **33 tests passed** (including the new five tests and all seven accepted packs); scoped ESLint passed. No dependency, registry, UI, database or production changes were made.

## Visang Type Manrep

Official title: **유형만렙 중학 수학 2-1 (22개정)**. The [official product page](https://book.visang.com/books/info/5738) confirms the 2022 curriculum and ISBN **979-11-7316-400-2**; printing number and publication date are unconfirmed. The [official PDF](https://cdn.visang.com/book/202505/20250512175755316.pdf) has 116 pages and SHA-256 `fd8960c4f3bb09c060d3575c85275078e0581bf0ac0aaf985018b24cec4b79b6`.

The complete declared solution-source scope is PDF 2–114: main-book **0001–1136** and **기출 BOOK**, ten chapters restarting **1–25**. Independent transcription of 40 main activity/page headers and ten supplement headers produces **1,386 unique addresses**. Main volume is left empty because that portion has no separate printed volume title; the supplement retains its printed 기출 BOOK name. Body-page ranges remain ranges; no single-page placement is invented. Cover page 1 and MEMO pages 115–116 have no exercise addresses.

All 1,386 answer regions were visually inspected, including every non-null key. There are **1,369 reviewed short references** and **17 null keys**, individually enumerated with source page, crop coordinates and reason: main 0406–0409, 0836–0837, 0844–0845, 1031, 1036–1039, 1049–1050, 1053–1054. These require a number-line or coordinate graph, sometimes alongside a short numeric part; the numeric part alone is not substituted for the full answer. No in-scope address is omitted.

The font-aware extractor supplies candidates and coordinates. Manual visual corrections recover missing inequality glyphs, fractions, exponents, recurring-decimal dots, signs, and degree-Celsius units. Six longer tables were rendered again in full and transcribed with their row/column labels and complete numbered subparts. As above, review means fixed-source correspondence, not independent mathematical correctness or later errata coverage.

External evidence is in `visang-26737/followup/`: 1,386 individual answer crops, 47 answer sheets, 50 header crops/three sheets, main chapter sheet, six supplemental table renders, boundary pages, independent census, reviewed answer overrides, per-address exclusion ledger in the pack coverage, and `visual-review.json`/`resolution.json`. Reproduction scripts are external `extract_manrep.py`, `manrep_answers.py`, `manrep_rechecks.py`, `manrep_final_evidence.py`, and `build_manrep.py`. Aggregate registration and status retain the accepted entries and now include this ninth ready pack.

Validation: **five scoped tests passed** for strict parsing, exact TSV round-trip, all independent addresses, every exclusion/source-page record, 557 single-choice keys, and numerical/symbol/unit regressions across all 20 chapter contexts; scoped ESLint passed. The earlier packs are unchanged.

## Mega CPR

Official title: **메가스터디 문제 기본서 CPR 중학수학 2-1**, confirmed by the captured [official answer listing](https://www.megastudybooks.com/book/file/explanation?page=31) and PDF cover. Curriculum revision, ISBN, printing number, and publication date remain unconfirmed and are not guessed. The [official download 1493](https://www.megastudybooks.com/download/1493) is a 96-page scanned PDF, SHA-256 `4aab4b7f6e2958b823d963d23e267769eb6139e972baeb734bdbb9ede62348e9`.

The declared source scope is **all printed 0001–1245 on PDF 2–96**, across four major headings, ten chapters and 30 C/P/R activity headers. The independent address census retains printed three-digit body-page labels, comma-separated pages, and ranges exactly; it does not assign guessed individual pages. The only source page outside this scope is the unnumbered cover on PDF 1. This is complete address coverage of the fixed solution PDF, not an independent census of every activity in the separate problem book.

All 96 pages were rendered externally and OCRed using the native Apple Vision engine. OCR candidates were filtered by printed number color and position; 35 missed numbers were read from enlarged source regions, and the OCR misreading of 0242 as 0262 was corrected visually. Each of the **1,245 individual answer regions** was then visually read, with 40 expanded regions checked for complete tables, tall equations, graphs and explanations. OCR output alone never established reviewed status. The result contains **1,227 reviewed keys**, including **356 single-choice keys**, and **18 null keys**: 0116 requires a long explanation; 0416–0420, 0468, 0888, 0897–0900, 0908–0909, 1116, 1130, 1146–1147 require graphs. Each exclusion retains its address, source page, expanded image coordinates and reason. No in-scope address is omitted.

Structured tables and short multipart answers are combined per printed main number. Recurring-decimal dots, powers, fractions, choice circles, inequality signs and units are preserved. Cropped first lines of simultaneous equations were recovered from expanded images before review completion. The 1242 coefficient was also checked against the full explanation; the printed final answer is preserved. Review denotes correspondence to the fixed public source, not a claim of independent mathematical correctness or application of later errata.

External evidence: `mega-1493/followup/` contains all 96 rendered pages and OCR coordinates, number-candidate audits, 1,245 answer crops/42 review sheets, 30 header crops/three sheets, four missing-number sheets, 40 expanded regions/seven sheets, major headings, independent census, final answers, and `visual-review.json`. Reproduction scripts are `ocr.swift`, `prepare_cpr.py`, `extract_cpr.py`, `cpr_color.py`, `cpr_find_missing.py`, `cpr_regions.py`, `cpr_answers.py`, `cpr_rechecks.py`, `cpr_boundaries.py`, and `build_cpr.py`, all under the external evidence root. Aggregate registration/status retain all earlier entries and contain ten ready major packs, including the three completed here. They are preserved unchanged during this report-only settlement.

Validation: **five scoped tests passed** for the strict schema, exact TSV round-trip, all 30 independent address groups, all key/source-region records and exclusions, immutable source provenance, choice counts, and numeric/symbol/table/unit regressions in every chapter; scoped ESLint passed. Existing immutable packs, dependencies, registry, UI and production are unchanged.

## RPM Pro ownership transfer and final disposition

At 18:09Z the coordinator transferred `root/samples/imath-rpm-pro-common1.pdf` to task `task_09dd2dbb97e8`, dispatch `ctx_f7c4725ab109`. The final ownership instruction `msg_272d9623f6a8` explicitly ended this worker's RPM implementation scope. The coordinator subsequently confirmed that the elementary worker completed RPM in commit **`956a09f9e`**. This is a reported completion by its sole owner, not an additional review or pack claimed by this worker.

The new owner's evidence is separate, under `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/rpm/`. Preliminary major-worker material remains intact under `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/major/imath-rpm-pro-common1/`, with the external helpers `prepare_rpm.py`, `extract_rpm.py`, and `rpm_missing.py`. These historical renders, OCR coordinates, candidate audits and missing-number regions are preliminary evidence, not a reviewed major pack. No competing RPM pack was created and no RPM evidence or aggregate manifest was changed during final settlement.

The three completed major packs cover their declared fixed solution-PDF address scopes; they do not assert an independent whole-problem-book census, mathematical correctness, or later errata reconciliation. The 35 null keys remain explicit manual-review limitations with individual reasons and source regions. No source implementation remains assigned to this worker. The final report-only change requires no pack test rerun; the completed validations above remain applicable, and `git diff --check` passed before commit.
