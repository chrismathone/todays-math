# Mathgen formatting restoration

## Source audit and the original gap

Read the actual, read-only `F:/Mathgen` files: `src/components/print/PrintOptionsPanel.tsx`, `types.ts`, `tokens.ts`, all six `templates/*Template.tsx`, `BodyContainer.tsx`, `ProblemMeta.tsx`, `ProblemBody.tsx`, `PrintAnswerKeyPage.tsx`, `src/components/wizard/Step5Export.tsx`, `src/stores/wizardStore.ts`, `src/hooks/usePrintLayout.tsx`, `src/lib/printGeometry.ts`, `printPack.ts`, `printLayout.ts`, `printFontPacks.ts`, and the font links in `index.html`.

Before this change, unified `WorksheetEditor` offered a title, 1/2 columns, combined answers, ordering, browser print and JSON saving. It used one generic flowing paper layout, had no measured A4 pagination and capped its order list at 240px. The rest of Mathgen's formatting UI and six print templates had not been connected to this editor.

## Preserved and restored parity

| Original capability | Restored behavior |
| --- | --- |
| Six templates | Actual template source ports in `src/components/unified/print/templates`: 평가원 `pyeongga`, 정통 `jeongtong`, 모던 `modern`, 워크북 `workbook`, 자습 `jaseup`, 유형 `yuhyung`; retains their header/table designs, numbering, scratch space, self-study grid/concept box, and type-sheet design. |
| Defaults | Exact original: `jeongtong`, `#1B2A4E`, 1 column, spacing mode, spacing **18px**, count 3/column, date/chapter/difficulty true, answers/quick answers/divider false, system font, normal margins. Old drafts retain their previous columns/answers. |
| Fonts | Original five serif/sans pairs: system, Nanum, Noto, Gowun, Pretendard + Nanum. Selected Google fonts load through real stylesheets and `FontFaceSet.load` before measuring; Pretendard uses the existing app-local font variable. Failure is shown, with measured fallback output. |
| Accents | All eight original chips plus a selectable original navy default. Color reaches template accents, question numbers, metadata and answer headers. |
| Page margins | Exact original mm presets: narrow top/bottom 10, left/right 12; normal top/bottom 12, left/right 15; wide top18/bottom15/left22/right22. Applies to all six templates and answer pages in measurement, preview and print. |
| Columns/divider | 1/2 columns and a functioning optional divider, with the same column geometry in measurement and output. |
| Vertical layout | Original 4/16/32/56/88px presets; retains legacy intermediate values and the actual 18px default, also editable from 0–150px. Count mode offers 2/3/4 per column and aligned equal-height slots; measured content can reduce the count to avoid overflow. |
| Metadata | Title, school/institution, grade, subject, semester, exam date/duration, examiner and total score. Workbook academy/instructor; self-study goal/Markdown concept note; type name/strategy. All exposed fields have printed destinations, including a shared metadata line for fields individual original headers omitted. |
| Visibility | Date, chapter and difficulty independently affect rendered output. |
| Answers | Include answers/solutions or quick answers only; both paginate from measured rendered content, preserve question numbering and use the same original math/figure display pipeline. |
| Reset | Restores original formatting defaults without deleting questions or metadata. |
| Preview/print | Fixed physical A4 sheets, responsive width-fit default plus 50/65/85/100/125% preview zoom, measured page counts, identical template DOM for preview and browser print/PDF. Fonts and images finish loading before print is enabled. Inspector/preview stack at 1050px and below with a direct preview button; manual zoom remains available. |
| Ordering | Full-height independent settings/order panels. Order list grows with the available inspector flex area, with no max-height clamp. Removal restores keyboard focus; tabs support arrows, Home/End and roving tabindex. |
| Draft durability | Additive v1 `printOptions`/`printMeta`, validated on import and persistence; legacy JSON and browser envelopes remain readable; existing columns/answers are mirrored; formatting-only conflicts are detected. JSON download includes complete formatting. |
| Raw problem data | Adapter keeps text, answer, solution, source crop, SVG, image URLs and geometry unchanged. Rendering still uses `UnifiedProblem`/`MathText`/`displayFractions`: elementary mixed fractions are display-only; middle/high text remains raw. |

## Deliberate adaptations and remaining integration boundaries

- This ports the actual six designs, not the entire Mathgen app or its stores. The common body adapter uses the already imported unified math/figure renderer, rather than introducing a second parser or changing stored source text.
- Original source had controls some templates ignored: margins in 평가원, chapter/difficulty/date/divider in several templates, and font packs in hardcoded number fonts. These are wired here. Header totals use the full worksheet count.
- Mathgen's measured packing policy is adapted to unified problems. Workbook/self-study spacing mode now measures height instead of blindly placing four items. A single item taller than a page scales to fit with visible feedback; freezing its pre-zoom width prevents a tall crop from enlarging inside count slots. No `overflow:hidden` crop is used. Extremely long header/concept text that leaves no usable body reports the problem and prevents printing until shortened.
- Answer pages use measured per-page answer items. Quick-only mode omits solutions. The original first-page duplicate, all-question quick-answer summary grid and estimate-based answer splitting are not copied, because an unbounded summary can truncate on long answer sets; there is no answer-content loss.
- Original/variant/both output selection is not exposed: unified `StudioProblem` has one selected content version, with no paired original/variant snapshots. Automatic OCR/variant generation and Mathgen engine data contracts remain separate coordinator/backend work; the editor does not invent those capabilities.
- HWP/HWPX, DOCX, server PDF/export-job progress, engine connectors and the original Mathgen library/cloud synchronization are not imported by this web-formatting change. Browser print/PDF and local draft JSON are functional. No server, DB/auth mutation, original-repo write, push or deployment was performed.
- Non-system Google font pairs require network access, matching Mathgen's original font hosting. They are genuinely loaded, with explicit fallback feedback if unavailable; local Pretendard remains supplied by the existing app.

## Validation

- Read bundled Next 16.3 client-component, CSS and font guides and the React performance skill. Kept the print code behind the editor's existing dynamic import.
- TypeScript: `npx tsc --noEmit --incremental false`.
- ESLint on changed editor/store/hook/workspace and new print files.
- Targeted Vitest: **70 tests in five files passed**, covering complete formatting save/restore, old v1 import, mirrored old setters, invalid formatting rejection, formatting-only cross-tab conflicts, exact original defaults, all six adapters/crops/metadata, measured layout counts/reading order/oversize handling, existing hook lifecycle, and elementary/raw secondary fractions.
- Standalone Vite fixture bundled outside the repo, opened as a local file in headless Edge; **no preview server or full Next build**. Eighteen problems included a 400×1600 original crop. All **24 combinations** (six templates × 1/2 columns × spacing/count) rendered all 18 problems, with **zero measured body overflows and no page errors**.
- Font fixture verified loaded Nanum Gothic/Myeongjo, Noto Sans/Serif KR and Gowun Batang/Dodum faces; all five selections worked without font errors. The static fixture does not import the root local Pretendard variable; actual Next integration verifies that existing root font.
- Sidebar at a 1500×1000 fixture viewport: inspector840px, order panel576px, order list540px, list `max-height:none`; scroll height1801px. ArrowRight selected/focused the order tab. At 390px viewport, document scroll width remained390px.
- Headless browser PDF: seven A4 pages (six question pages plus quick answers), no blank pages; rendered page2 shows the tall original crop's **BOTTOM MUST REMAIN** label above the footer. Screen/page boundaries and the exported crop page were visually inspected.
- Fixture evidence remains local at `C:/Users/Public/Documents/ESTsoft/CreatorTemp/mathgen-format-worker-qa/`: `results.json`, `fonts.json`, `preview.png`, `order.png`, `mobile.png`, `worksheet.pdf`, `pdf-tall-crop.png`. This isolated fixture lacks the full app's Tailwind utilities, so final integrated visual QA against real bank content belongs to the coordinator after merge.

## Integration selectors

`[data-mathgen-document][data-template="jeongtong"]`; `[data-unified-paper][data-page-kind="questions"|"answers"]`; rendered item `[data-measure-idx]` scoped to the document (offscreen measurement hosts also use it). Inspector tab names are `서식 설정` and `문제 순서 · N`; panels are `#worksheet-settings-panel` and `#worksheet-order-panel`. The paper region is named `시험지 미리보기`; zoom select `미리보기 확대`; print button `인쇄 / PDF 저장` is enabled after layout readiness. Existing native workspace dialogs were not changed; `UnifiedWorkspace` changes only pass/save formatting fields.
