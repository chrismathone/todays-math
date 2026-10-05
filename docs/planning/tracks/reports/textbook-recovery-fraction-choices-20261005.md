# Fraction choices — new semantic bank problems

2026-10-05. Codex takeover of the fraction worker; inherited implementation and evidence retained. Previous reports: [continued blocks](textbook-recovery-continued-blocks-20261005.md), [dialogue rendering](textbook-recovery-dialogue-render-20261005.md), [answer layout](textbook-recovery-answer-layout-20261005.md).

The frozen middle-school book's student p30 has fraction choices whose PDF glyph boxes overlap by **6.407 pt**, despite choice baselines being 22.5 pt apart. The scoped fix keeps display fractions intact and adds clearance around their formula boxes. Fresh Chromium measurements show **+2.520 pt** between neighboring choice glyph boxes and **zero clipping**; fresh PDF extraction shows a minimum **+1.842941 pt** gap in both student and answer variants.

## Implementation and ownership

- `src/lib/textbook/render/blocks/problem.ts`: invoke the helper only for problems with semantic metadata and without `semantic.source`.
- New `src/lib/textbook/render/blocks/fractionChoiceRows.ts`: use the shared parser's choice count and `BODY_CHOICE_MARKS`; recognize balanced top-level paragraph lines in consecutive circled-number order. Insert inline wrappers only when at least one choice has a tall KaTeX formula.
- Exported `FRACTION_CHOICE_CSS`: `.tb-problem .tb-choice-row .katex .base{margin-block:0.36em}`. This expands line boxes around formulas, including formulas that wrap within a choice. Stem math stays outside the wrappers.
- New `textbookFractionChoices.test.ts`, new `textbookFractionChoices.integration.test.ts`, and this report complete the five-file delivery. Existing reports remain unchanged.

Only wrapper tags and CSS layout change. Removing the wrappers recovers the previous Markdown-rendered prompt byte for byte. Raw content, answers, solutions, TeX commands, choice order, item IDs and exchange metadata are unchanged. Nonfraction choices, saved problems without semantic metadata, and original-source projection keep their previous rendering. No `\dfrac` is replaced with `\frac`.

Inherited commits: `a6b703078` (implementation and tests), `56cc4ef34` (balanced paragraph handling). Codex preserved the uncommitted regression test in `e2aa6d823`, verified both product files matched committed HEAD before running tests, found no live prior fraction/mutation Node process, and merged coordinator commit `c335eca9d` cleanly. No other product files were edited by this worker.

**Coordinator handoff:** import `FRACTION_CHOICE_CSS` into production `TEXTBOOK_CSS` in `html.ts`. This worker deliberately tested production CSS plus the exported addition; it did not edit `html.ts`, pagination, UI, shared classifiers or contracts. Whole representative PDFs belong to the final-QA worker.

## Fresh Codex measurements

Private frozen input: `automatic/runs/c761012f6-final14/중2-1/exchange.private.json` under `C:/Users/user/Downloads/교재_복구_실행검증_20261005/`. Target block `d146236c-24aa-4a61-a039-78952a732ceb`, item `adc85440-6aed-41c7-876b-ba60738f0019`. Original denominator bbox `[50.98,247.89,56.58,261.05]` and following numerator bbox `[53.78,254.64,59.38,267.80]` establish the reported overlap.

Real Chromium-based Edge `154.0.4258.53`, product NotoSansKR 400/700 and KaTeX fonts, production styles, actual model/editorial projection. Direct `renderProblemHtml` output is checked against the inner problem emitted by `renderBlockHtml`; the production editorial wrapper is retained in the printed specimen. The fixture asset resolver reads and verifies frozen image bytes when present; it supplies no placeholder images. The target has zero figures and no QR. Font loads are asserted. Fresh student and answers PDF detail images were visually inspected: choice glyphs are distinct and legible, and the answer text remains in its beside column.

| Variant                | Block width | Question prose width | Natural block height | Neighbor DOM glyph gap | Printed PDF glyph gap | DOM clip |
| ---------------------- | ----------: | -------------------: | -------------------: | ---------------------: | --------------------: | -------: |
| Student                |       86 mm |            85.998 mm |            91.674 mm |               2.520 pt |          ≥1.842941 pt |     0 pt |
| Answers, beside layout |      179 mm |            85.998 mm |            77.676 mm |               2.520 pt |          ≥1.842941 pt |     0 pt |

Measurements and isolated printed blocks agree. Each retains five display fractions with no text-style conversion. Zero clipping is checked against the actual block rectangle, with no horizontal allowance. PDF extraction checks all four adjacent choice pairs per specimen; printed baseline pitches are 30 or 30.75 pt because of print coordinate quantization.

Six synthetic cases also pass at this same question width: nested fractions, long prose with fractions at both ends, mixed plain/text/display choices, equation cases, two fraction lines inside one emphasized choice, and a single 16-fraction formula that wraps. The last two explicitly have measured internal math-line neighbors with **+2.520 pt** clearance. Nested and long cases have zero clip; the mixed case's minimum row gap is +1.770 pt. These are bounded examples, not an arbitrary-TeX guarantee.

## Checks and negative controls

- Fraction unit tests: **23/23 passed**, exit 0. Pin row recognition, malformed/unsupported shapes, balanced emphasis, unchanged source/legacy bytes, unmodified frozen objects, exact Markdown/TeX recovery, answers/solutions and linked examples.
- Limited compatibility run: **59/59 passed**, exit 0, across fraction choices, figure mapping and answer layout.
- Focused real-Chromium tests: **3 passed, 1 intentionally unselected** (the inherited broad sibling-book survey), exit 0. Cover actual student/answers measurement and print frames, negative controls, and six synthetic cases.
- CSS neutralized to zero margin: neighbor DOM gap **−5.543 pt**; remove choice-row classes with CSS restored: **−5.543 pt**. Both controls retain the five rows and shrink the student block from 91.674 to 77.453 mm. The zero override remains effective if the coordinator later imports the rule into production CSS.
- Remove the helper's top-level paragraph guard: the preserved regression fails with assertion exit **1**, as expected. Mutation harness exits 0 and verifies byte-for-byte restoration; no mutation remains.
- Scoped TypeScript check of the two product files and two test files: exit **0**. ESLint for the same four files: exit **0**, no findings.
- Full repository `tsc --noEmit` attempt: exit **1**, Node 4 GB heap exhaustion (`Ineffective mark-compacts near heap limit`), **not a successful full type check**. No Prisma generation was run.
- One Chromium rerun passed all three assertions but exited **1** on a 60-second browser-close hook timeout. The harness now saves evidence first and bounds cleanup to its own launched browser; the final run exits **0**, with its dedicated process terminated after the 15-second cleanup bound. Formatting initially reported three files; the owned files were formatted before the final check.

The added internal-line checker initially failed twice because it parsed computed CSS `baseline` as a number and split glyphs on the same line; corrected to zero displacement, then rerun successfully. A later added identity assertion failed once because it compared an inner problem to the entire editorial wrapper; corrected to test exact containment and retain the wrapper for printing. Two throwaway evidence utilities initially failed (URL-encoded Windows path `ENOENT`, and PDF paint-order grouping); both were corrected before their recorded successful checks. These failures do not remain in product code.

Raw file SHA-256 before/after: `f7755e0b8933d968a3e8c0b7cdcaf16185a0b1894873b99dcbc0c11cf8c78063`. Canonical parsed exchange SHA-256 before/after: `9fb98040b4000c5fb6ecfd50c6b62ccb8127e74699734b3d5e72ef8ffb512eb8`. Measured and printed prose hashes agree across both variants: `b20cd8690512190632722e42b43b74a8d1ec8f104ea4a6d9490885d975e7f084`. Evidence JSON records hashes and geometry, not the actual question text.

## Inherited evidence and limits

Retained unchanged: `automatic/fraction-choice-evidence/`. Its prior 14-book survey produced **28 isolated problem-block PDFs**, not 28 whole books. Saved DOM records contain 106 changed block/variant instances with minimum +0.996 pt and zero reported clip, plus 176 unmarked choice instances whose heights were unchanged. `pdf-gaps-books.json` reports **284 extracted choice groups / 1,130 adjacent pairs**, zero negative gaps, minimum **+0.084 pt**; these are extractor groups, not a count of distinct items. Codex inspected and recomputed those totals from the saved JSON and did not rerun that broad survey. Its old asset resolver used placeholder figures/QR, so that survey alone does not certify actual figure geometry.

Fresh private artifacts: `automatic/fraction-choice-evidence-codex/` contains `fraction-choices.json`, isolated `p30-student.pdf` / `p30-answers.pdf`, `target-pdf-gaps.json`, `synthetic-choices.png`, `paragraph-mutation.json` / log / pre-mutation helper, and the scoped type configuration. The interrupted inherited mutation subdirectory is retained as historical evidence, not counted as a completed mutation pass.

Unsupported shapes return unchanged: Arabic-number Markdown lists, marks inside quotes/lists, inline several-choice lists, skipped/reordered marks, leading emphasis around the marker, a single choice, and shapes that disagree with the parser. Their overlap is not claimed fixed. Choices in multiple paragraphs can be recognized, but the current Chromium neighbor checker exercises choices sharing one paragraph. QR decoding and arbitrary long unbreakable formulas are outside this check. Plain text inside wrapped choices has row-to-row bounds checked; internal-line checks specifically compare math glyph groups.

The extra clearance increases natural problem heights and can change pagination; final whole-book pagination/page counts, representative source QA and physical printing remain outside this worker's result. No main merge, push, deploy, database write, production write, large regression suite, or Prisma generation was performed.
