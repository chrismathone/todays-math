# Fresh semester-1 extraction r2 — 2026-10-19

Executed the unchanged `extract-fresh-sources-20261019.py` with the four requested explicit IDs, `--max-success 3 --out fresh-source-extraction-20261019-r2`. The first three succeeded; Gyeongsin semester1 fallback was not attempted. **68 new quarantined parent observations; prior314 → combined382. Components approved0, twins0, whole-pair/source certification0, grade/rights approvals0, DB writes0.** Counts establish parser observations only.

| School / job | HWP / PDF parents | MC / written | Question pages / answer starts | Withheld notes |
| --- | --- | --- | --- | --- |
| 강북중 / `personal-ae2bb575dbaef34005e65cdeedba6860` | 21 / 21 | 16 / 5 | 4 / 5 | 21 |
| 경구중 semester1 / `personal-a31eb17660269c309fe99cbfce1665c3` | 25 / 25 | 20 / 5 | 4 / 5 | 25 |
| 경명여중 / `personal-ff66f8d1a4f03871955f857a26829560` | 22 / 22 | 17 / 5 | 4 / 5 | 22 |

All four explicit jobs were actual2025 middle3 semester1 midterm, ready completed pairs with both N files accessible, historical existingExamIds empty and existingQuestionCount0. Prior parsed IDs, Bumil and successful fresh-r1 jobs were excluded by the existing tool. Protected 동도/강동/경산여/정화 schools remain excluded. The parent's read-only closure snapshot additionally identifies closed original-school prefixes `dongdo`, `gangdong`, `gyeongsanyeo`, `hyeopseonggyeongbok`, `jeonghwa`; none overlaps these selected schools. This used existing metadata only and is not a fresh DB/current global duplicate audit. No protected82 source or permanent Gyeongsanyeo19 was processed.

## Actual content findings

- **경구중 q10/q13 PDF region contamination confirmed visually.** q10 part1 contains its actual figure, five choices and4-point mark; its part2 incorrectly includes the shared11–12 passage/tangram. q13 part1 incorrectly includes earlier8–10 material, including the square-root table and paper figure; part2 contains actualq13 and its five choices/3-point mark. The HWP/decoded PDFq13 text identifies the right target, but the assembled crop/image correspondence is not trustworthy. Hold these regions and dependent correspondence claims. Do not hand the raw packets to authors. Shared-passage and column/metadata grouping require separate repair and fresh comparison; the immutable reader was not edited.
- 경구중 q11's shared tangram is present in its actual crop, explaining why per-item HWP figure0 versus PDF1 cannot be treated as a simple missing-image test. Check sharedSourceContext as well as per-item records. Mismatched figure counts occur atq10(1/2),q11(0/1),q13(0/1).
- 경명여중 q22 crop visibly contains a written dialogue/table and boxed-code placeholders, with10 printed points. HWP figure3 versus PDF bitmap0 requires raster/vector/placeholder correspondence review; it does not independently prove missing or equal content.
- 강북중 q1 was inspected as a clean sample: five choices and3 printed points, no figure required. No all-item equivalence claim follows from this sample.

All68 HWP/PDF choice counts match; every parent has at least one detected score occurrence; no unknown controls were reported. Totals are566 positional HWP formula records,13 HWP figure records,13 PDF bitmap-correspondence records and79 score occurrences. Equal figure totals hide the confirmed routing problems. Score occurrences include possible parent/subpart marks and are not certified exam score totals. Question-only text/canonical formula conversion, exact tables, shared contexts, score allocation and all remaining figures still need actual component review.

## Header observations and holds

Completed HWP/PDF headers for all three say2025, grade3, semester1 midterm with matching school names. Their2026 preparation footers are recorded separately, never substituted for exam year. Reviewer-only original crops show:

- 강북중: printed2025, grade3, semester1 midterm,2025-04-30 and school footer.
- 경구중: first scan is sideways; a newly rendered90°-oriented header shows2025-04-29, grade3, semester1 and first written evaluation. School identification in this crop is **handwriting in the margin**, not printed-school proof; hold that distinction. Raw PDF bytes were not saved or changed.
- 경명여중: first page is a cover; the initial top strip misses its metadata. A new cover-centre crop shows2025-04-30,2025 semester1 midterm, grade3 mathematics and17MC+5written; school name is printed in the cover footer. Header fields alone do not certify the whole source pair or custody.

The crops may contain original handwriting. No original answer/solution key was parsed or used; no pending authored-answer artifacts were opened, no problems solved/authored, and no curriculum/family assignment was made.

## Reproducibility, preservation and delivery

`aggregate-receipt.json` records exact N source hashes, original identity references, per-question count/uncertainty metadata and unchanged tool/dependency hashes. `inspection-and-preservation-receipt-r1.json` records observed headers, confirmed issues, closure exclusions and the complete local raw/image hash index. All30 preserved references—inventory, prior manifests/receipt, tool dependencies and selected source/original bytes—were rehashed unchanged after inspection. Python AST,12 eligibility/exclusion assertions and repeat-job rejection before directory creation passed. Existing tool/code and all old evidence remain unchanged.

**18 copyrighted local files remain ignored:** three question-only manifests and15 reviewer crops, indexed in the inspection receipt. Parent should copy these exact bytes using that index and preserve their quarantined status. They are not committed. Only this findings file and the two aggregate/hash receipts are committed. No original HWP/PDF copy, source question text or image is staged. No DB/AI/network/install/generate/new worker/controller/shared-engine changes, main merge or push.
