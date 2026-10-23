# Major publisher follow-up — 2026-10-24

The accepted seven packs are unchanged. This follow-up processes the four remaining source PDFs in order: Visang Concept Root, Visang Type Manrep, Mega CPR, and RPM Pro. Distributed solutions and scanned pages are extraction/review work; their layout alone is not a registration blocker.

| Source | Current outcome | Pack | Addresses | Reviewed keys | Missing keys |
| --- | --- | --- | ---: | ---: | ---: |
| `root/samples/visang-27061.pdf` | Ready | `visang-conceptroot-common1-2022-v1` | 839 | 839 | 0 |
| `root/samples/visang-26737.pdf` | Review pending | — | — | — | — |
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
