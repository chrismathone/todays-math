# Major publisher follow-up — 2026-10-24

The accepted seven packs are unchanged. This follow-up processes the four remaining source PDFs in order: Visang Concept Root, Visang Type Manrep, Mega CPR, and RPM Pro. Distributed solutions and scanned pages are extraction/review work; their layout alone is not a registration blocker.

| Source | Current outcome | Pack | Addresses | Reviewed keys | Missing keys |
| --- | --- | --- | ---: | ---: | ---: |
| `root/samples/visang-27061.pdf` | Ready | `visang-conceptroot-common1-2022-v1` | 839 | 839 | 0 |
| `root/samples/visang-26737.pdf` | Ready | `visang-typemanrep-m2-1-2022-v1` | 1,386 | 1,369 | 17 |
| `root/samples/mega-1493.pdf` | OCR/review pending | — | — | — | — |
| `root/samples/imath-rpm-pro-common1.pdf` | OCR/review pending | — | — | — | — |

## Visang Concept Root

Official title: **개념루트 공통수학 1 (22개정)**. The [official product page](https://book.visang.com/books/info/5396) confirms the title, 2022 curriculum revision, and ISBN **979-11-6940-929-2**. Printing number and publication date remain unconfirmed; the timestamp in the public PDF URL is not a printing or publication claim.

The reviewed [official PDF](https://cdn.visang.com/book/202407/20240716171708456.pdf) has 156 pages and SHA-256 `891d9b528d67ed309fc4ca5cc77f1d2b783ebe73434057b0d9884f7b60b63649`. Its distributed solutions on PDF pages 2–153 contain printed main numbers **001–839**, 75 body-page labels/ranges, and 18 chapter headings. All 839 addresses and short answer references are present. PDF page 1 is the cover; pages 154–156 are MEMO. No numbered exercise region in this source scope is omitted.

Each answer region was rendered and visually read. The text layer supplied coordinates and candidates; it did not establish reviewed status. Visual corrections preserve fractions, radicals, ±, inequalities, decimals, and units. Matrices use nested arrays with one inner array per printed row, and simultaneous solutions retain each x/y pair inside braces. Enlarged rechecks resolved tall cases, top matrix rows, and a clipped right edge. There are no unresolved keys in this source, so its individual missing-key ledger is empty.

This is full address coverage of the specified solution PDF, **not an independent audit of every activity or example in the separate problem book**. Reviewed means correspondence to the fixed source; it does not claim a proof of the publisher's mathematical correctness or application of later errata. Data is a short reference for teacher manual grading.

External evidence root: `/Volumes/TodayWork/commercial-workbook-sources/expansion-20261024/major/`.

- `visang-27061/followup/`: all text spans and coordinates, 839 answer crops, 35 full answer review sheets, 75 header crops/three review sheets, chapter crops, seven enlarged rechecks, manually corrected answers, independent header/chapter census, and visual review receipt.
- `extract_visang_root.py`, `root_answers.py`, `root_final_evidence.py`, `build_visang_root.py`: reproducible extraction, rendering, transcription normalization and pack assembly. These files and source images remain outside the repository.
- `registration.json`: aggregate registration entries retaining all accepted packs; coordinator owns registry changes.
- `status.json`: aggregate per-source state, including the prior audit and follow-up progress.

Validation uses the strict create-edition contract, exact TSV round-trip, an independently transcribed 75-group/18-chapter address census, source-page/region coverage, empty missing-key ledger checks, 139 choice-key count, and explicit numeric/symbol/unit/matrix regressions across the book. Validation results and subsequent source outcomes are updated as each source completes.

Concept Root validation completed: five related pack test files, **33 tests passed** (including the new five tests and all seven accepted packs); scoped ESLint passed. No dependency, registry, UI, database or production changes were made.

## Visang Type Manrep

Official title: **유형만렙 중학 수학 2-1 (22개정)**. The [official product page](https://book.visang.com/books/info/5738) confirms the 2022 curriculum and ISBN **979-11-7316-400-2**; printing number and publication date are unconfirmed. The [official PDF](https://cdn.visang.com/book/202505/20250512175755316.pdf) has 116 pages and SHA-256 `fd8960c4f3bb09c060d3575c85275078e0581bf0ac0aaf985018b24cec4b79b6`.

The complete declared solution-source scope is PDF 2–114: main-book **0001–1136** and **기출 BOOK**, ten chapters restarting **1–25**. Independent transcription of 40 main activity/page headers and ten supplement headers produces **1,386 unique addresses**. Main volume is left empty because that portion has no separate printed volume title; the supplement retains its printed 기출 BOOK name. Body-page ranges remain ranges; no single-page placement is invented. Cover page 1 and MEMO pages 115–116 have no exercise addresses.

All 1,386 answer regions were visually inspected, including every non-null key. There are **1,369 reviewed short references** and **17 null keys**, individually enumerated with source page, crop coordinates and reason: main 0406–0409, 0836–0837, 0844–0845, 1031, 1036–1039, 1049–1050, 1053–1054. These require a number-line or coordinate graph, sometimes alongside a short numeric part; the numeric part alone is not substituted for the full answer. No in-scope address is omitted.

The font-aware extractor supplies candidates and coordinates. Manual visual corrections recover missing inequality glyphs, fractions, exponents, recurring-decimal dots, signs, and degree-Celsius units. Six longer tables were rendered again in full and transcribed with their row/column labels and complete numbered subparts. As above, review means fixed-source correspondence, not independent mathematical correctness or later errata coverage.

External evidence is in `visang-26737/followup/`: 1,386 individual answer crops, 47 answer sheets, 50 header crops/three sheets, main chapter sheet, six supplemental table renders, boundary pages, independent census, reviewed answer overrides, per-address exclusion ledger in the pack coverage, and `visual-review.json`/`resolution.json`. Reproduction scripts are external `extract_manrep.py`, `manrep_answers.py`, `manrep_rechecks.py`, `manrep_final_evidence.py`, and `build_manrep.py`. Aggregate registration and status retain the accepted entries and now include this ninth ready pack.

Validation: **five scoped tests passed** for strict parsing, exact TSV round-trip, all independent addresses, every exclusion/source-page record, 557 single-choice keys, and numerical/symbol/unit regressions across all 20 chapter contexts; scoped ESLint passed. The earlier packs are unchanged. CPR and RPM Pro remain active OCR/review work.
