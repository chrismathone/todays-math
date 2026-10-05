# E3-1 settled actual PDF: independent full-page AI visual review

Reviewed 2026-10-05 (Asia/Seoul), task `task_65dfa505ba03`, dispatch `ctx_9d4a0309662b`.

**Inspection complete: all 29 student pages and all 29 answer pages were rendered fresh and individually viewed as complete, legible pages. Visual release result for these exact settled bytes: FAIL.** The contents and both indexes lack usable page destinations; the contents also repeat one lesson label sixteen times. The free-recall, explanation and concept-map activities have material design gaps against the corresponding supplied original activities. The dialogue, mathematical glyph/choice presentation, memory-row alignment, written response spaces and all eleven printed answer references have the positive observations recorded below. No accidental blank page, clipped body text, lost fraction bar, or overlapping figure/text was found in these 58 pages.

This is an **AI visual inspection**, not human mathematical editorial sign-off and not physical-print approval. The review does not validate every answer, curriculum progression, problem-bank uniqueness, paper contrast, binding allowance or handwriting usability on a printed sheet. A human mathematical editor and an actual-size physical print are separate remaining reviews. Root owns product fixes and subsequent exports; corrected bytes require a new review. The task of independently reviewing the assigned settled files is complete even though those files fail visual release acceptance.

## Scope, exact inputs and evidence

Before inspection, the clean content worktree fast-forward merged root checkpoint `e2cb27e05eee5df7625426847fcb9cdd9c69d2c4` from `8b07f1ba2`; existing allocator work was preserved. The only tracked change produced by this task is this new report. No product, QA, shared module, Prisma or database writes were made, and no main merge, push or deployment was performed.

Exact export directory:

`C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1`

New private evidence directory (all filenames in the page and crop ledgers resolve here):

`C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1/visual-e3-full`

| Input | Physical pages | Freshly computed SHA256 |
| --- | --- | --- |
| `student.pdf` | 29 | `5c4bbf5186638177ca73a9d888ff41303b9f8c7529d1179f754d8de5cd07e09c` |
| `answers.pdf` | 29 | `70d39a69d2a7a8072fea4a559922caf682cec21327a735e2ac5544531ce60e93` |
| Supplied `C:/Users/user/Downloads/인재원_수학_2-1-1_수와식_학생용.pdf` | 259; selected comparison pages below | `6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0` |

Export metadata identifies renderer commit `441fa1f84bdfa0ddcb967e15930820fcfe178435`, renderer `injaewon.textbook.renderer.v5`, and template `injaewon.textbook.a4.v15.editorial.v2`. These source identifiers are separate from the later checkpoint merged into the review worktree. The PDF hashes agree with the settled export metadata.

## Method and limits

The PDF skill was read first. Poppler's `pdftoppm`/`pdfinfo` were unavailable in PATH and the inspected installed-tool locations, so the installed PyMuPDF 1.28.2 / MuPDF 1.28.2 renderer was used transparently. `[render_review.py](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1/visual-e3-full/render_review.py>)` opens the **exact merged PDFs**, renders each whole physical page at **180 DPI, RGB, alpha=false**, and saves 58 separate **1488 × 2105** PNGs. Every target image was opened individually with `view_image(detail="original")`; some tool calls returned multiple separate images, but no target page was replaced by a contact sheet or crop. All margins and footers were included. Text extraction and geometry counts were not used as substitutes for visual judgment. Crops only supplement the complete-page inspection and contain no resampling, enhancement or text replacement.

The same method produced and individually displayed 17 selected full pages from the supplied original: **10, 17, 18, 19, 20, 21, 22, 23, 24, 25, 29, 36, 37, 40, 41, 258, 259**. This is a selected activity-design comparison, not a full 259-page review. Original and E3-1 mathematical contents and educational levels differ; matching them is not claimed.

[render-manifest.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1/visual-e3-full/render-manifest.json>) records each exact PDF hash, physical page index, full-page PNG hash, raster size, page points, renderer version and 37 renderer source-file hashes. [function-source-hashes.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1/visual-e3-full/function-source-hashes.json>) records 118 named function declarations from the export commit, their source offsets/lines and exact function hashes. [crop-manifest.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1/visual-e3-full/crop-manifest.json>) records all crop hashes, source PNG hashes and pixel/mm coordinates.

Private render script SHA256: `35fe93d2707f94abb2b2b3a4c83c556b573d8b351cedd7b23e841d25d36dfc37`. Function extractor `[hash_functions.mjs](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/초3-1/visual-e3-full/hash_functions.mjs>)` SHA256: `333821026906fd76fe6eec4f0796492c96a3fe82e72fd9412480c8664472d8ee`; TypeScript parser version `5.9.3`. Function hashes use UTF-8 bytes of the exact TypeScript function declaration from `getStart()` to `getEnd()`, including its body and excluding leading comments/whitespace, without normalization. Source-file hashes below use exact Git blob bytes at the export commit. All 37 source files have the same content as the merged review worktree after only CRLF-to-LF normalization; exact working-file byte hashes differ for 36 because of checkout line endings, and both forms are recorded in the private manifest.

## Findings and immediate coordinator notifications

| ID | Physical page / element | Result and consequence | Precise evidence |
| --- | --- | --- | --- |
| F01 | Student 02 and answers 02, contents rows | **FAIL.** Sixteen rows repeat `1-6-1 똑같이 나누기`; activity identity and destination page numbers are absent. Readers cannot use the printed contents to locate an activity. | `issue-toc-student-p002.png`, `issue-toc-answers-p002.png`; box `(85,590,1370,1710)`. |
| F02 | Student 28 and answers 28, concept index | **FAIL.** Three concepts display the unit label but no page destination. The supplied original p258 includes numeric destinations for concept entries. | `issue-concept-index-student-p028.png`, `issue-concept-index-answers-p028.png`; box `(80,360,1380,580)`; `comparison-index-original-p258.png`. |
| F03 | Student 29 and answers 29, type index | **FAIL.** Two activity/type entries have no page destination. Original p259 has destinations. | `issue-type-index-student-p029.png`, `issue-type-index-answers-p029.png`; box `(110,360,1410,520)`; `comparison-index-original-p259.png`. |
| F04 | Student 18 and answers 18, free concept recall | **Design GAP.** Bare 16-line sheet replaces the original p21 rounded recall canvas, definition→example→judgment→method cue, watermark, self-check/teacher-check fields and deficient-concept-number field. The page contains content and is not an accidental blank. | `issue-free-recall-student-p018.png`; box `(75,415,1380,1850)`; `issue-free-recall-original-p021.png` and `comparison-free-recall-original-p021-footer.png`. |
| F05 | Student 19 and answers 19, explanation activity | **Design GAP.** Four prompts and response lines remain, but the original p40 three-step workflow, listener-question panels, self/listener check matrix and repair prompt are absent. | `comparison-explanation-student-p019.png`; box `(75,415,1380,1850)`; `comparison-explanation-original-p040.png`, box `(75,400,1420,1830)`. |
| F06 | Student 20 and answers 20, concept map | **Design GAP.** Concept terms followed by a 15-line ruled sheet replace original p41 connected concept cards, central node and concept-check response area. The E3 instruction asks students to connect relations with lines/sentences, but the supplied map scaffold has not been recovered. | `issue-concept-map-student-p020.png`; box `(75,415,1380,1850)`; `issue-concept-map-original-p041.png`, box `(75,400,1420,1830)`. |

The first contents failure was immediately sent as `msg_2fe789421f4f`; confirmation in answers/indexes as `msg_5f6effea9c22`. Root accepted the contents failure in `msg_3c5a433e74dd` and instructed this worker to finish all 58 without product edits. Design gaps were sent in `msg_7c3a7988de88`, and the explanation comparison/corrected original-footer detail in `msg_7338f3356819`. The latter corrects a preliminary reference to a completion-date box: original p21 has self/teacher checks and the deficient-concept field, **not a completion-date box**. Inspection continued through all remaining pages after each finding.

## Focused positive observations

**Dialogue:** Student/answers p8–9 use one continuous pale gray backdrop per physical page, with white teacher and yellow student bubbles, attached portrait names and consistent body typography. The formerly problematic p8 ending now keeps `조각 수와 같은 크기` with a following student bubble and teacher explanation before the backdrop's rounded bottom. Its 1/2 badge and next-page instruction stay separate from the body; p9 continues as 2/2. No orphan subtitle or body/font-size jump was observed. The subtitle begins flush with the backdrop's left edge; it remains readable. Selected cast names are 지은 선생님, 다은 and 도현; teacher/student sides, names and expressions remain associated across both pages. No broken portrait atlas fragment was observed. Supplementary crops: `pass-dialogue-student-p008-ending.png`, `pass-dialogue-student-p009.png`.

**Concepts, tables and memory:** p12 concept panels and table-like rows remain legible. p14–16 retain aligned common row labels, body text, repeated-study checks, cloze blanks and sentence spans. No literal dollar-delimited title/row-label failure seen by another peer in M2 was observed in these E3 pages. Mathematical choices correctly use the visibly different mathematical glyph face alongside the common Korean body face; this is not treated as a broken font. Source-style sentence writing starts at x276 and ends at x1360 in the E3 raster, approximately **153 mm**, similar to original p20 x275–1361. E3 row baselines are approximately y608, 683, 758: **10.6 mm pitch**, against roughly 10–11 mm in the original rows. These are raster dimensions at 180 DPI, not a physical handwriting test.

**Math, figures and the confirmation:** student p23–25 have readable stacked fractions and fraction bars with separated choice rows. Triangles, strips and circles retain their entire boundaries and coloring; no cropped labels or floating/disconnected choice marker was found. In student p24 the shaded solved example concerns six pieces; the separate right confirmation concerns seven pieces and has a different diagram and choices. The confirmation contains neither answer nor worked solution. In answers p23 its solution appears in the corresponding answer column. This verifies distinct visual student/answer behavior and does not replace mathematical editorial review.

**Writing space and blanks:** student p18 has 16 lines x92–1360, approximately **179 mm width** and **7 mm pitch**; the original p21 framed canvas has 18 lines x157–1364, approximately **170 mm width** and **8 mm pitch**. Those dimensions reinforce F04's changed activity scaffold. Student p25 has two lines per column, approximately **86 mm width**, **7 mm pitch**; their left/right starting heights differ because the diagrams differ, without overlap. Short activities (plan, error check, dialogue continuation and term/memory pages) leave large unused lower areas but contain their expected activity content. **Zero accidental fully blank exported pages** were observed.

## Printed answer-to-student references

Every printed `문제 …쪽` reference was read from the answer full page and matched visually to the corresponding physical student page; the differing answer pagination was not assumed to match student pagination.

| Answer physical page | Problem(s) | Printed student physical page(s) | Visual match |
| --- | --- | --- | --- |
| 21 | Basic Q1, Q2, Q3, Q4 | 21, 21, 22, 22 | 4/4 |
| 22 | Basic Q5 | 23 | 1/1 |
| 23 | Worked example and confirmation | 24, 24 | 2/2 |
| 24 | Type practice Q1, Q2 | 25, 25 | 2/2 |
| 25 | Reasoning Q1 | 26 | 1/1 |
| 26 | Reasoning Q2 | 26 | 1/1 |

Total: **11/11 printed references visually matched**. The navigation failures in F01–F03 remain separate and are not excused by the correct answer-panel references.

## Same-activity design comparison with the supplied original

| Original physical pages individually viewed | E3 student areas compared | Observation |
| --- | --- | --- |
| 10 | 8–9, dialogue | Continuous backdrop, speaker sides, names/portraits and bubble palette are recognizable; source dialogue also contains inset board treatment; different cast and mathematical conversation are expected. |
| 17 | 17, dialogue-reading confirmation | Both provide printed prompts and response lines within the common frame; original is a denser two-column confirmation exercise. Different questions/counts are not a math-content mismatch claim. |
| 18, 19, 20 | 14, 15, 16, study/cloze/sentence recall | Aligned study/recall rows and long sentence spans are retained. Original has four concept groups and pale cloze boxes; E3 has one concept group and underline blanks. This report does not require E3 to invent the original's four mathematical groups. |
| 21 | 18, free concept recall | Material activity-design gap F04: framed canvas and check fields absent; ruled width/pitch/count differ. |
| 22, 23 | 21–23, basic checks | Common two-column problem style and writing lines recognizable; E3 has fewer actual-bank problems and larger figures/choices. Fractions fit. |
| 24, 25 | 24, worked example plus confirmation | Shaded worked area versus plain unsolved confirmation separation retained. E3 confirmation has a distinct stem/figure and does not disclose its answer. |
| 29 | 25, type practice | Clear two-column practice and response spaces; E3 writing fields are shorter because its selected short problems differ. |
| 36, 37 | 26, reasoning/written response | Questions, large figures and writing lines fit. Original has a lower error-review panel; E3 p26 does not reproduce it. This is an additional observed scaffold difference, not a clipped panel. |
| 40 | 19, explanation activity | Material activity-design gap F05: workflow/listener/check/repair fields absent. |
| 41 | 20, concept map | Material activity-design gap F06: connected concept-card scaffold absent. |
| 258, 259 | 28, 29, indexes | Original contains visible numeric page destinations; E3 indexes do not (F02/F03). |

## Complete full-page inspection ledger

`PASS` means no visual defect found in that specific page under this method, not a claim of mathematical or physical-print approval. `GAP` is an observed original-design recovery gap. Every row below represents an independently opened full-page PNG from the exact settled PDF, not a thumbnail/text-only check.

### Student: all 29 physical pages

| Physical page | Full-page PNG individually viewed | Activity | Visual result | Observation |
| --- | --- | --- | --- | --- |
| 01 | `student-p001.png` | Cover | PASS | Title, cover art and spacing are clear; no clipping. |
| 02 | `student-p002.png` | Contents | FAIL F01 | Sixteen identical lesson labels; activity names and destination page numbers absent. |
| 03 | `student-p003.png` | Learning guide | PASS | 23 ordered steps, small labels and punctuation remain readable. |
| 04 | `student-p004.png` | Learning plan | PASS | Single lesson row, date slots and checks align; intentional lower whitespace. |
| 05 | `student-p005.png` | Question log | PASS | Three prompts with four full-width ruled lines each; consistent pitch. |
| 06 | `student-p006.png` | Unit introduction | PASS | Unit title, illustration and labels fit without collision. |
| 07 | `student-p007.png` | Learning roadmap | PASS | Two response areas, two writing lines each, clear header/body separation. |
| 08 | `student-p008.png` | Dialogue 1/2 | PASS | One continuous gray backdrop; all subtitles have following bubbles; 지은 선생님/다은/도현 portraits and names attached; common body size; ending fits. |
| 09 | `student-p009.png` | Dialogue 2/2 | PASS | Continuation subtitle and four bubbles share the same typography/backdrop; 2/2 badge; short-content whitespace, not an empty page. |
| 10 | `student-p010.png` | Preparation | PASS | Bullet prompts are readable and have generous response whitespace; no overflow. |
| 11 | `student-p011.png` | Error check | PASS | O/X statement and two writing lines clear; no answer leaked into student activity. |
| 12 | `student-p012.png` | Concept understanding | PASS | Three concept panels, labels, definitions/examples and internal tables legible; no literal dollar delimiters in labels. |
| 13 | `student-p013.png` | Term recall | PASS | Three aligned term/definition rows; approximately 34 mm term blanks; long term fits the printed span. |
| 14 | `student-p014.png` | Memory study | PASS | Three common rows with repeat 1–4 checks; labels, sentences and check markers do not collide. |
| 15 | `student-p015.png` | Cloze recall | PASS | Same three rows; missing keywords have visible underlines; shortest blank about 7.6 mm; handwriting adequacy remains a print check. |
| 16 | `student-p016.png` | Sentence recall | PASS | Three labels beside approximately 153 mm lines; row pitch about 10.6 mm; no title or name/date collision. |
| 17 | `student-p017.png` | Dialogue reading confirmation | PASS | Two response blocks with four ruled lines each; prompts and writing areas are distinct. |
| 18 | `student-p018.png` | Free concept recall | GAP F04 | Sixteen bare full-width lines; original framed canvas, self/teacher checks and deficient-concept field absent. |
| 19 | `student-p019.png` | Explanation activity | GAP F05 | Four clear prompts with three lines each; original workflow, listener questions and check matrix absent. |
| 20 | `student-p020.png` | Concept map | GAP F06 | Three concept terms and fifteen ruled lines; original connected cards/central node/check area absent. |
| 21 | `student-p021.png` | Basic check Q1–Q2 | PASS | Short answer and MC stems legible; choices 18/9/7/8/11 separated; writing lines fit. Similar 3-person/3-piece stem in two formats noted for human editorial review. |
| 22 | `student-p022.png` | Basic check Q3–Q4 | PASS | Five-cell strip with three colored cells fully visible; choices 6/3/1/2/5 clear; labels and lines fit. |
| 23 | `student-p023.png` | Basic check Q5 | PASS | Three triangles with one colored; stacked fractions and integer choice have clear baselines and bars; no choice overlap. |
| 24 | `student-p024.png` | Worked example and confirmation | PASS | Left shaded solved six-piece example and right distinct seven-piece confirmation; student confirmation is unsolved; fraction choices and diagram edges clear. |
| 25 | `student-p025.png` | Type practice Q1–Q2 | PASS | Seven-triangle and five-cell-strip problems; fractions and five choices clear; two approximately 86 mm writing lines per column. |
| 26 | `student-p026.png` | Reasoning Q1–Q2 | PASS | Two quartered circles and word stems fit; choices 1/2/3/0/4 legible; four response lines per column; no figure clipping. |
| 27 | `student-p027.png` | Rest story | PASS | Illustration, caption, paragraphs and two discussion bullets fit; no image/text overlap. |
| 28 | `student-p028.png` | Concept index | FAIL F02 | Three concept labels with unit labels; no destination page numbers. |
| 29 | `student-p029.png` | Type index | FAIL F03 | Two activity entries with unit label; no destination page numbers. |

### Answers: all 29 physical pages

| Physical page | Full-page PNG individually viewed | Activity | Visual result | Observation |
| --- | --- | --- | --- | --- |
| 01 | `answers-p001.png` | Answer cover | PASS | 정답과 해설 title and cover art fit. |
| 02 | `answers-p002.png` | Contents | FAIL F01 | Same sixteen repeated lesson labels and absent activity/page destinations as student contents. |
| 03 | `answers-p003.png` | Learning guide | PASS | All 23 steps readable; answer-book footer does not collide. |
| 04 | `answers-p004.png` | Learning plan | PASS | Dates, checks and single lesson row clear. |
| 05 | `answers-p005.png` | Question log | PASS | All three response areas retained and readable. |
| 06 | `answers-p006.png` | Unit introduction | PASS | Title and illustration clear; no cropping. |
| 07 | `answers-p007.png` | Learning roadmap | PASS | Two response areas and prompts remain clear. |
| 08 | `answers-p008.png` | Dialogue 1/2 | PASS | Continuous gray backdrop, paired subtitles, attached names/portraits, uniform body typography; A008 footer clear. |
| 09 | `answers-p009.png` | Dialogue 2/2 | PASS | Continuation subtitle and four bubbles fit; A009 footer clear. |
| 10 | `answers-p010.png` | Preparation | PASS | Open prompts remain readable; this is not an assertion that every open activity has a model answer. |
| 11 | `answers-p011.png` | Error-check answer | PASS | Inline false-statement explanation fits the activity without collision. |
| 12 | `answers-p012.png` | Concept understanding | PASS | Three panels and table text readable; no literal math delimiter leakage. |
| 13 | `answers-p013.png` | Term recall answers | PASS | Printed term/definition answers align; left blanks removed; no crowded cells. |
| 14 | `answers-p014.png` | Memory study | PASS | Three rows and repetition checks align. |
| 15 | `answers-p015.png` | Cloze answers | PASS | Filled underlined keywords readable in context; no broken line boxes. |
| 16 | `answers-p016.png` | Sentence answers | PASS | Three complete sentences fit beside their labels. |
| 17 | `answers-p017.png` | Dialogue reading confirmation | PASS | Open writing areas remain clear; no unexpected answer leakage. |
| 18 | `answers-p018.png` | Free concept recall | GAP F04 | Same bare ruled activity and original-design omissions as student p18. |
| 19 | `answers-p019.png` | Explanation activity | GAP F05 | Same four prompts and original-design omissions as student p19. |
| 20 | `answers-p020.png` | Concept map | GAP F06 | Same ruled sheet and missing connected-map design as student p20. |
| 21 | `answers-p021.png` | Basic Q1–Q4 answers | PASS | Four problems stack left, answer panels right; student refs 21,21,22,22 all match; bottom strip stays above footer. |
| 22 | `answers-p022.png` | Basic Q5 answer | PASS | Triangle problem and answer ③/1⁄3 fit; student reference 23 matches. |
| 23 | `answers-p023.png` | Example and confirmation answers | PASS | Two columns remain distinct; worked answer ②/1⁄6 and confirmation ⑤/1⁄7 readable; both student refs 24 match. |
| 24 | `answers-p024.png` | Practice Q1–Q2 answers | PASS | Stacked problems and fraction answer panels fit; both student refs 25 match. |
| 25 | `answers-p025.png` | Reasoning Q1 answer | PASS | Circle and answer 2 clear; student ref 26 matches. |
| 26 | `answers-p026.png` | Reasoning Q2 answer | PASS | Circle and answer ② clear; student ref 26 matches. |
| 27 | `answers-p027.png` | Rest story | PASS | Same illustration/caption/paragraph layout fits. |
| 28 | `answers-p028.png` | Concept index | FAIL F02 | Three concept entries have unit labels but no page destinations. |
| 29 | `answers-p029.png` | Type index | FAIL F03 | Two activity entries have no page destinations. |

## Renderer and function source hashes

| Renderer source at export commit | SHA256 of exact Git blob bytes |
| --- | --- |
| `src/lib/textbook/layout/paginate.ts` | `215dcf4f556c1f9747c025ac2f5367b7d745767a81d6fedff7492189425c191c` |
| `src/lib/textbook/render/blocks/concept.ts` | `c2e75dc18f72ebe390ecb5196d0d91b89b49bc8bc9727734672af35273c56c1d` |
| `src/lib/textbook/render/blocks/dialogue.ts` | `10be3fe4191c4f637906266775994734401e05fcce97090c4b25d85eb2d6a0d5` |
| `src/lib/textbook/render/blocks/dialogueCss.ts` | `a3de23a019bcbafa67656352493c6101f4abf169a404e79fafd76364bc49b2c4` |
| `src/lib/textbook/render/blocks/fractionChoiceRows.ts` | `ed08c669c26905701e80095d7956d1567b5f764fc173e7425086b1068c746c98` |
| `src/lib/textbook/render/blocks/problem.ts` | `0db252a440be37118b64581c53719cbcdb29756f1241550f2af63e24e6997a87` |
| `src/lib/textbook/render/blocks/recall.ts` | `84023a4350d201b522d4a18be48c801a5ca30a2e82cbcecae67e74f63a93ce6c` |
| `src/lib/textbook/render/blocks/semantic.ts` | `cf197b86c410966abc712c2ae4064aac13ef674bb4ea5ad07deeff4cb3d73d1e` |
| `src/lib/textbook/render/html.ts` | `4c061a5abd34050088899704af46024253134f780a2e33a564488871f23e1445` |
| `src/lib/textbook/render/pageReferences.ts` | `7502e2e43ecc13376b85cd1d0a36b58b08730597e5e94b744d0990e2493b2879` |
| `src/lib/textbook/render/server.ts` | `dfa0592d8177b4c93ce7b23c523fcd5f1f1450eeff4b8c8f391ed0391a6528b4` |
| `src/lib/textbook/render/sourceWriting.ts` | `582610cbadf14d99f61f824ca199e9e69f53b0319847f989d6097875745e2915` |

Selected relevant function declarations are pinned below; all 118 are in the private function manifest.

| Function at export commit | Source file / start line | SHA256 of exact function node |
| --- | --- | --- |
| `renderConceptHtml` | `src/lib/textbook/render/blocks/concept.ts:42` | `1f94be997a89cc36fa385ccb403c661ea899192b2ffe9f2e38c696865b746367` |
| `dialogueSizeSteps` | `src/lib/textbook/render/blocks/dialogue.ts:44` | `ae383e52e46177c52e278b73cdf4e937b7c8ea01bb8192dfc867d293e237d3b6` |
| `solveDialogueSize` | `src/lib/textbook/render/blocks/dialogue.ts:76` | `85ecc122b2a4d68e75e3ff6fb28a23983f0922ef6dfc0d572e8e77d8ec24572a` |
| `dialogueGapMm` | `src/lib/textbook/render/blocks/dialogue.ts:86` | `9760a55d05dcfe15f47e031a0cadc4fd8331ec5e279754e587549b3f7b8087e4` |
| `renderDialogueHtml` | `src/lib/textbook/render/blocks/dialogue.ts:202` | `73720ef79f5be1eeed4cd28b0f08e36521b63873d1c84fd0ef92bede2e7e9ed1` |
| `dialogueLessonRuns` | `src/lib/textbook/render/blocks/dialogue.ts:323` | `1fce2b2fee90ea224c5432165508004045a46a3934e965265ea5738aa4001dc1` |
| `formulaExtentEm` | `src/lib/textbook/render/blocks/fractionChoiceRows.ts:36` | `8c75ffddbfdefaaafe23a420e0bd8cd9ac5edb01c1acc015000bcaf642c0103e` |
| `fractionChoiceRows` | `src/lib/textbook/render/blocks/fractionChoiceRows.ts:105` | `7ea5ba439d07b19be3d4bfca4a4fa2fdd7e01467841e6f0c794b0cae75eaaffb` |
| `renderProblemHtml` | `src/lib/textbook/render/blocks/problem.ts:15` | `e2f4d148954d89eb7730c0fcc76d13a9ffe4475c0e94661b666568492ccbbdca` |
| `renderRecallHtml` | `src/lib/textbook/render/blocks/recall.ts:463` | `9e856bdb1fe14477978a355ea6db090a598fca1588648348b5df0dca4db24142` |
| `renderSemanticTextHtml` | `src/lib/textbook/render/blocks/semantic.ts:46` | `5dad0ac1e120ef166115f35b81142ee1f324672c4aa02c1d9fbb1d93722dd4b6` |
| `renderBlockHtml` | `src/lib/textbook/render/html.ts:50` | `ff7fead60c9f0ca8478e395b4b0377b3d524e549dd6d25371d71af65dc19c32c` |
| `renderPageHtml` | `src/lib/textbook/render/html.ts:131` | `af767de4753a5fe4c3bb3edc4b1b795d83fde50844a571a7c27508c838bae8f1` |
| `renderTextbookChunk` | `src/lib/textbook/render/server.ts:336` | `00e10d0fe041bfd8049a56be37e0dac9bf899029fae68f7de48375cb03829a4b` |
| `mergeTextbookPdfs` | `src/lib/textbook/render/server.ts:615` | `e5ce89f5caaea2dfaf12854d4b0e0ac77f8ed23f092fc284255e133b2a8b4737` |
| `measureSourceWritingDom` | `src/lib/textbook/render/sourceWriting.ts:41` | `926fc79d1645fa7be4cafa235c9ce609d93185e4e1918499cea3049977b7d45c` |
| `applySourceWriting` | `src/lib/textbook/render/sourceWriting.ts:143` | `ef7ba7c44c3980cb45f13796ad7c222091187f83c6f3e8fac6df27e54f5161af` |

## Exact supplementary crop ledger

Pixel origin is the top-left of the full 1488 × 2105 PNG. Boxes are half-open LTRB coordinates, and millimeters equal pixels × 25.4 / 180. The crop manifest includes per-crop and parent-PNG hashes.

| Exact crop file in private evidence directory | Source full page | Pixel box (left, top, right, bottom) at 180 DPI |
| --- | --- | --- |
| `issue-toc-student-p002.png` | `student-p002.png` | `(85, 590, 1370, 1710)` |
| `issue-toc-answers-p002.png` | `answers-p002.png` | `(85, 590, 1370, 1710)` |
| `issue-concept-index-student-p028.png` | `student-p028.png` | `(80, 360, 1380, 580)` |
| `issue-type-index-student-p029.png` | `student-p029.png` | `(110, 360, 1410, 520)` |
| `issue-free-recall-student-p018.png` | `student-p018.png` | `(75, 415, 1380, 1850)` |
| `issue-free-recall-original-p021.png` | `original-p021.png` | `(75, 400, 1420, 1830)` |
| `issue-concept-map-student-p020.png` | `student-p020.png` | `(75, 415, 1380, 1850)` |
| `issue-concept-map-original-p041.png` | `original-p041.png` | `(75, 400, 1420, 1830)` |
| `comparison-explanation-student-p019.png` | `student-p019.png` | `(75, 415, 1380, 1850)` |
| `comparison-explanation-original-p040.png` | `original-p040.png` | `(75, 400, 1420, 1830)` |
| `pass-dialogue-student-p008-ending.png` | `student-p008.png` | `(70, 1400, 1400, 1960)` |
| `pass-dialogue-student-p009.png` | `student-p009.png` | `(70, 420, 1400, 1280)` |
| `pass-memory-student-p014.png` | `student-p014.png` | `(75, 410, 1390, 890)` |
| `pass-memory-student-p015.png` | `student-p015.png` | `(75, 410, 1390, 800)` |
| `pass-memory-student-p016.png` | `student-p016.png` | `(75, 410, 1390, 800)` |
| `pass-fractions-student-p023.png` | `student-p023.png` | `(75, 415, 1390, 1810)` |
| `pass-distinct-confirm-student-p024.png` | `student-p024.png` | `(75, 490, 1390, 1950)` |
| `pass-answer-refs-answers-p021.png` | `answers-p021.png` | `(730, 415, 1390, 1850)` |
| `pass-answer-confirm-answers-p023.png` | `answers-p023.png` | `(75, 490, 1390, 1960)` |
| `pass-writing-student-p025.png` | `student-p025.png` | `(75, 900, 1420, 1310)` |
| `comparison-free-recall-original-p021-footer.png` | `original-p021.png` | `(75, 1620, 1420, 1950)` |
| `comparison-index-original-p258.png` | `original-p258.png` | `(75, 345, 1410, 650)` |
| `comparison-index-original-p259.png` | `original-p259.png` | `(75, 345, 1410, 650)` |
| `issue-concept-index-answers-p028.png` | `answers-p028.png` | `(80, 360, 1380, 580)` |
| `issue-type-index-answers-p029.png` | `answers-p029.png` | `(110, 360, 1410, 520)` |

## Review handoff and remaining work

Root should resolve or explicitly disposition F01–F06, export replacement PDFs and review the changed pages against fresh hashes. Human mathematical editorial review should include same-stem variants, distractors, diagram/quantity interpretation and the actual-bank shortage warnings; no mathematical sign-off is supplied here. Physical printing should separately check faint ruled lines, 7 mm pitches, narrow cloze/term spans, portrait-name size and binding margins at actual size. This report does not alter product or QA state to mark these checks approved.

The durable report is the task's sole tracked deliverable; private raster/crop/hash evidence remains in the exact directory above. No shared evidence folder was overwritten and no QA result was fabricated from populated-page counts.
