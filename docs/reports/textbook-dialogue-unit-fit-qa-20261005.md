# Dialogue unit fit QA — 2026-10-05

Verified root `cd549611f` plus preview/missing-probe/progress follow-up `c335eca9d`. Changes owned by this task: only new [helper](../../src/__tests__/helpers/textbookDialogueUnitProof.ts), [Node tests](../../src/__tests__/unit/textbookDialogueUnitFit.test.ts), [Chromium tests](../../src/__tests__/unit/textbookDialogueUnitFit.integration.test.ts), and this report.

**Result: 14/14 passed, two test files, zero skips, exit 0** with both gates enabled. The seven Node tests and seven real Chromium tests cover shared grouping, sibling selection, legacy/source-fragment preservation, publisher limits, combined private caps, preview context, independent geometry/font checks, and missing-probe rejection. Chromium runs the actual `renderTextbookChunk` and a Vite IIFE containing the production `measureTextbookPreview`; it uses production NotoSansKR fonts and KaTeX assets. Scoped ESLint: exit 0; TypeScript diagnostics for these three new files: 0, exit 0 (not a whole-repository type claim).

Frozen actual input: `C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/c761012f6-final14/초5-1/exchange.private.json`, SHA-256 `2c647f9fc8bc77e88f6ba87a4faae9bd449c6f5fe3eafbcaab5ed45408710cd4`. No database is opened. Target `u-013f0b8a-1e66-4afc-b56d-5be6e7df30b2` has **two**, not three, actual dialogue curriculum sections; the third E5-1 dialogue belongs to `u-8fbbf9b0-a087-48f9-a8e7-dd75935aa968` and is excluded from this unit's probes. Three sections are covered separately by explicit synthetic content.

| Actual section / projected index | Selected blocks | Private dialogue siblings | Canonical recall probes | Combined server and preview maximum | Speech placements |
| --- | ---: | ---: | ---: | ---: | ---: |
| `s-0a825aa2-67c8-4261-85da-cf242d7a7279` / 5 | 54 | 15 | 1 | 70 | 14 |
| `s-bf762279-23e2-4011-b1de-e229c6046c2e` / 6 | 50 | 17 | 1 | 68 | 12 |

Both isolated chunks and both actual previews choose **9.2pt**. Independent delivered-page capture observes **9.200025pt**, `TextbookPretendard, sans-serif`, both font weights ready, all 26 speech IDs exactly once, and no dialogue text/math leaving its placement or speech frame. Intentional visible bubble tails and cropped portrait atlases are excluded from clipping failures. Chunk outputs total 29 section pages. Each preview measures two sections privately, leaves zero measurement hosts, and renders only its selected section. Canonical exchange JSON—including IDs, math, and manuscript content—remains unchanged.

The real client parser reads frozen export/section responses through synthetic read-only transport and book ownership metadata, then the real `buildSectionPreview` supplies `dialogueMeasurementModel` and canonical recall probes. The smallest bounded context is the selected draft plus same-unit semantic dialogue/board sibling AST and its existing authorized assets, passed through the new preview option; the final layout remains selected-only. Without sibling context, a shorter synthetic section chooses 10.5pt while its whole unit chooses a smaller size, so section-only input cannot establish whole-unit equality.

Negative controls: one real speech receives 20pt; an A4 page becomes 220mm high; a planned dialogue probe is removed; nine private sections or 601 combined blocks are requested. The independent font/paper checks reject the first two; production measurement rejects the missing probe and both cap violations. Publisher constants remain 4 sections / 300 blocks; renderer/preview limits remain 8 sections / 600 combined blocks including private probes. No full-edition DOM is constructed.

Reproduce in PowerShell:

```powershell
$env:TEXTBOOK_PDF_TEST='1'
$env:TEXTBOOK_DIALOGUE_UNIT_FIXTURE='C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/c761012f6-final14/초5-1'
node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts src/__tests__/unit/textbookDialogueUnitFit.test.ts src/__tests__/unit/textbookDialogueUnitFit.integration.test.ts
```

Limitations: this fresh bounded proof renders unmodified frozen content in draft mode as chunks `[5]` and `[6]`, each starting at physical page 8; it does not replay the complete publisher job, establish equality to original PDFs, or prove all 14 books. Actual content is external and gated: without `TEXTBOOK_PDF_TEST=1`, all seven Chromium tests skip; with Chromium enabled but no fixture directory, only the actual-input test skips. No production code, existing tests, QA worker scripts, Prisma output, or production data was changed by this task.
