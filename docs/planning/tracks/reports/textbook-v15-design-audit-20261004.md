# Textbook v15 reference design audit - 2026-10-04

The saved student PDF reproduces the forest palette, portrait chat bubbles, and mirrored footer treatment, but does not yet reproduce the illustrated cover/unit spread, the reference's repeated section hierarchy, or its aligned recall and representative-example layouts. The authorized artwork and Noto font files are now available under `public/textbook/editorial/`, unchanged from the extracted originals.

## Scope and evidence

This task changes only this report and `public/textbook/editorial/**`. It does not change renderer code, selected portraits, book data, database state, production, or either input PDF. No fixture DTOs or manuscripts are copied into the repository. The worker commits its scoped changes without merging or pushing.

| Evidence | Location / identity |
| --- | --- |
| Designated reference PDF | `C:\Users\user\Downloads\인재원_수학_2-1-1_수와식_학생용.pdf`; 259 physical pages; SHA256 `6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0` |
| Extracted original app | `C:\Users\user\AppData\Local\Temp\textbook-v15-reference-20261004\인재원_KaTeX_교재조판기_v15` |
| Current generated PDF | `C:\Users\user\Downloads\교재_검증_20261004\saved-book\초3_1학기_학생용_검증본.pdf`; 172 physical pages; SHA256 `a730fe322bb6ed950822f05adfbcc1fc2db1a7471b7b2b27b1d330400d204161` |
| Current renderer inspected read-only | `src/lib/textbook/render/html.ts`, `src/lib/textbook/layout/paginate.ts`, and the story catalog's image mapping in `src/lib/textbook/restStories.ts` |
| Read-only raster evidence | Temporary directory `C:\Users\user\AppData\Local\Temp\textbook-v15-audit-20261004`; images are inspection aids, not committed output |

Page references below are one-based physical PDF pages, including the cover. Both PDFs report a MediaBox of 594.96 x 841.92 pt, consistent with the Chromium A4 output; source CSS explicitly specifies 210 x 297 mm. `pdftoppm`/`pdfinfo` were unavailable on PATH, so the installed PyMuPDF runtime rendered selected pages at a 1.6 scale (approximately 115 dpi). Layout conclusions come from the rendered complete pages, not text extraction alone. PDF text extraction was used to locate sections and check the story provenance.

### Visual review coverage

| Required archetype | Reference reviewed | Current reviewed | Observation |
| --- | --- | --- | --- |
| Cover | PDF p1 | PDF p1 | Reference has a full dark forest field, large title/code, geometric image, equation strip, and brand rules; current has a white field and text-only title/code. |
| Unit opener | PDF pp8-9 | PDF p5 | Reference is a coordinated even/odd illustrated title and learning-route spread; current is a dark rounded heading banner with a goal list. |
| Dialogue | PDF p10; p202 rendered to verify provenance | PDF p6 | Portrait roles, white/yellow bubbles, and mirrored student direction exist in current; the reference additionally encloses the entire conversation and aligns its continuing-page guide. |
| Concept | PDF p14 | PDF p9 | Reference uses numbered explanations, a classification figure, paired examples, caution, oral explanation, and checks; current shows repeated definition panels with a preceding continuation fragment. |
| Recall | PDF pp18-21 | PDF pp12,15,18 | Reference learn/cloze/sentence pages share concept codes and label/row positions, plus a distinct blank-page test; current uses separate outlined blocks and continuation pages without that header/row structure. |
| Representative example | PDF p24 | PDF p22 | Reference pairs a solved representative problem on the left with two check problems on the right, repeated twice; current starts ordinary two-column questions after sentence-recall blocks. |
| Practice | PDF pp34,36 | PDF pp22-23 | Reference aligns problem rows and distributes 7 mm writing rules through the available page; current sampled problems have no visible writing rules and mix consecutive practice stages on one page. |
| Story | Original app's `review_pdf/story-algebra-spread.png`, complete 1190 x 842 px spread | Story absent in this saved PDF; current `rest` CSS inspected | Archival screenshot has a cream story page, historical illustration, explanatory paragraphs, formula strip, reflection panel, and source note. This is separate evidence from the designated PDF. |

Additional original unit images u02-u06 and the learning sprout were visually opened; cover/u01 were reviewed in the PDF compositions. All eight copied PNGs also passed file-format and decode checks.

### Story provenance discrepancy

The archival `review_pdf/story-algebra-spread.png` labels the historical story **202** and the following chat **203**. The designated reference PDF's actual p202 is the chat headed `단원을 여는 수업`, with the subtitle `같은 문자라고 모두 합칠 수 있을까?`, not that story. Searching the designated PDF for the archival story title, `수학사의`, `스토리`, and `이야기` finds no match. The extracted app's active `app.js`/`full.js` route set and its four authored stylesheets contain no story renderer or story-specific CSS. The archive therefore demonstrates the intended story archetype but cannot establish exact CSS tokens for the designated app/PDF revision.

The current saved PDF also contains no `수학 한 장면`, `수학사의`, or `이야기` match. Current code already defines a `rest` template with a cream background and story image styling; lack of story evidence in this particular saved PDF does not prove the feature is unavailable. Reconstruct story geometry from an actual approved story export before treating the archive's printed page numbers as authoritative. The historical story illustration is outside this task's authorized asset-copy list and was not copied.

## Exact source tokens

Values below are declarations from the extracted app, accounting for its load order: `vendor/katex/katex.min.css` -> `styles.css` -> `editorial.css` -> `full.css` -> `chapters.css` (`index.html:4`). Later overrides matter: the earlier 126 mm cover hero becomes 116 mm, generic 9 mm question gutters become 7 mm, and a hard-coded earlier chat size becomes a CSS variable controlled by JavaScript. Inline measured dimensions take precedence where described below.

### Palette and typography

| Token / role | Exact original value | Source |
| --- | --- | --- |
| Forest accent / dark | `#086c61` / `#073f3b` | `editorial.css:2` |
| Forest soft / light rule | `#edf5f0` / `#d6e4df` | `editorial.css:2` |
| Forest signal / secondary ink | `#d6ed75` / `#526461` | `editorial.css:2` |
| Sheet body ink / baseline size | `#253836` / `10pt` | `editorial.css:2` |
| Tree accent / dark | `#6250a0` / `#342752` | `editorial.css:3` |
| Tree soft / light / signal / secondary | `#f3f0f8` / `#e1dced` / `#ffbea4` / `#635d70` | `editorial.css:3` |
| Unit-spread accent / light / background | `#0c6b5b` / `#cbded2` / `#f2f6ef` | `chapters.css:6` |
| Korean font | CSS alias `NotoKR`, local `NotoSansKR-400.ttf` and `NotoSansKR-700.ttf`; explicit 700 weight for bold | `styles.css:1` |
| Generic page title | `25.5pt`, line height `1.25`, tracking `-1.35px` | `editorial.css:13` |
| Concept title / lesson title | Concept `23pt`; generated original lesson pages `21pt!important` | `editorial.css:62`, `full.css:37` |
| Header brand / small running text | `8.2pt` / `6.6pt`; 3 mm leaf mark | `editorial.css:5`, `editorial.css:6`, `editorial.css:7` |
| General question prompt | Final `.sheet .q .prompt`: `9.1pt`, line height `1.8`; type/lesson specializations `8.8pt` | `full.css:7`, `full.css:40`, `full.css:44` |
| General problem number / pill | Final `.sheet .qid`: `12.5pt`, tracking `-.5px`; tag `6.2pt`, padding `.5mm 1.5mm`, radius `4mm` | `full.css:4`, `editorial.css:81` |
| Math | KaTeX `1.12em!important`; independent DOM and TeX source preserved | `styles.css:2`, `app.js:182` |

The original PDF embeds `NotoSansKRThin-Regular` and `NotoSansKRThin-Bold`, consistent with the copied font's internal family name. FontTools confirms the actual static OS/2 weights are 400 and 700, each with 11,596 glyphs. The internal family string `Noto Sans KR Thin` is a naming quirk, not evidence that both files have weight 100. Use an explicit application CSS alias and explicit weights when integrating them; this audit does not change font loading.

### Paper, hierarchy, footer, and rules

| Role | Exact original value | Source |
| --- | --- | --- |
| Paper / print page | `width:210mm; height:297mm`; `@page size:210mm 297mm; margin:0` | `styles.css:2`, `styles.css:5` |
| Even-page padding | Top `10mm`, right/inner `18mm`, bottom `14mm`, left/outer `13mm` | `styles.css:2` |
| Odd-page padding | Left/inner `18mm`, right/outer `13mm`; same top/bottom | `styles.css:2` |
| Running header | Height `6mm`; baseline editorial header has no bottom border, unit spread adds `.5pt solid #b9d0c1` | `editorial.css:4`, `chapters.css:12` |
| Edge tab | Top `28mm`, width `5.5mm`, padding `4mm 0`, text `6.8pt`, tracking `1.6px`, vertical upright; final inset `3mm` from the outside edge | `editorial.css:8`, `editorial.css:117` |
| Kicker signal bar | `6mm x 1.25mm`, radius `1mm`, signal color; kicker `7.2pt`, gap `2mm` | `editorial.css:11`, `editorial.css:12` |
| Progress navigation | Six ordinary stages; three learn/cloze/sentence stages for master; `7pt`; active underline `2pt`; base rule `.65pt` | `full.js:48`, `editorial.css:16`, `editorial.css:18` |
| Fixed page-end guide | Top `270mm`, height `8mm`, top padding `1.5mm`, top rule `.5pt`; mirrored 13/18 mm side insets | `full.css:76`, `full.js:57` |
| Footer | Bottom `7mm`; padding top `1.8mm`; text `6.8pt`; number `15pt`, line height `1.2`, tracking `-.6px` | `editorial.css:19`, `editorial.css:22` |
| Footer rules and mark | Accent rule `14mm` wide / `1.5pt`; remainder starts at `18mm` / `.45pt`; signal diamond `2.1mm`, rotation `45deg` | `editorial.css:20`, `editorial.css:21`, `editorial.css:23` |
| Printed numbering | Zero-padded 3 digits; number and accent rule on the outside, brand on opposite side | `full.js:44`, `full.js:56`, `full.css:71` |
| Question grid | Two `minmax(0,1fr)` columns; final gap `4mm 7mm`; center divider `.5pt solid #edf0eb` | `styles.css:17`, `full.css:6`, `editorial.css:83` |
| Writing pitch / rule | Fixed 7 mm height per line; final `.45pt solid #e0e6e0` | `styles.css:17`, `editorial.css:83` |

The reference's footer parity is a paper convention, not a function of viewport width. Its screen spread rule explicitly puts even sheets left and odd sheets right at 1800 px or wider (`chapters.css:61`). Avoid counting the first two pages as a left/right opener pair when the cover makes physical parity differ.

### Cover and unit-spread geometry

| Role | Exact original value | Source |
| --- | --- | --- |
| Cover field / inset | Background `#073f3b`, foreground `#f7f5e9`, padding `17mm 18mm!important` | `full.css:10` |
| Cover title / code | Title `68pt`, line height `1.1`, tracking `-4px`; code `45pt`, 700 weight, tracking `-2px`, margin top `8mm` | `full.css:15`, `full.css:16` |
| Cover hero | Paper-relative top `128mm`, left/right `9mm`, height `116mm`, image `object-fit:contain` | `chapters.css:2` |
| Cover equation strip | Left/right `18mm`, bottom `34mm`, gap `5mm`, `11pt`, `#dceac0` | `chapters.css:4` |
| Cover footer | Left/right `18mm`, bottom `19mm`, padding bottom `5mm`, `8.5pt`, bottom rule `.5pt solid #9fbaaa` | `full.css:24` |
| Unit content coordinate system | `.content` height `254mm`, positioned relative; coordinates below are content-relative | `chapters.css:11` |
| Chapter numeral | Top `7mm`; `76pt`, line height `1`, tracking `-6px`, `#2f7e62` | `chapters.css:13`, `chapters.css:15` |
| Chapter title | Top `48mm`, `31pt!important`, line height `1.25`, tracking `-1.7px`, `#123f35` | `chapters.css:16` |
| Question / image | Question top `83mm`, `11.1pt`, line height `1.7`; hero top `101mm`, height `119mm`, left/right `-4mm` | `chapters.css:18`, `chapters.css:19` |
| Single-line title adjustment | Question top `70mm`; hero top `90mm`, height `130mm` | `chapters.css:20`, `chapters.css:21` |
| Lead / key | Lead top `225mm`, `8.9pt`, line height `1.85`; key top `248mm`, `7.6pt`, diamond `2.2mm` | `chapters.css:23`, `chapters.css:24`, `chapters.css:25` |
| Facing route page | Header top `10mm`; goals `40mm`; roadmap `83mm` / height `81mm`; connections `173mm`; readiness `216mm`; dates `250mm` | `chapters.css:26`, `chapters.css:31`, `chapters.css:34`, `chapters.css:43`, `chapters.css:51`, `chapters.css:55` |
| Route page columns | Three equal columns, gap `2.7mm`, padding `2.8mm 2.6mm`, min height `28mm`; current column `#226d54` | `chapters.css:44`, `chapters.css:45`, `chapters.css:46` |

`chapters.js:2` maps U01-U06 and COVER to the original images. `chapterLeft()` and `chapterRight()` are separate archetypes, not a single generic unit-intro panel. Cover and unit art belong in contained image areas; copying their PNGs does not add labels or require changing the selected portraits.

### Dialogue, concepts, recall, and examples

| Role | Exact original value / behavior | Source |
| --- | --- | --- |
| Conversation container | `#f4f7f5`, radius `4mm`, padding `3mm 3.5mm`, starting gap `.85mm` | `editorial.css:194`, `editorial.css:216` |
| Turn geometry | `width:fit-content`; teacher max width `93%`; students `89%`, right-aligned and row-reversed; avatar/bubble gap `1.7mm` | `editorial.css:195`, `editorial.css:197`, `editorial.css:217` |
| Teacher bubble | White, border `.45pt solid #dfe8e1`; radius `.9mm 3mm 3mm 3mm`; horizontal padding `2.7mm`; text `#263d32`, line height `1.77` | `editorial.css:202`, `full.css:97` |
| Student bubble | `#fff0b8`, border `#eadfaf`, radius `3mm .9mm 3mm 3mm` | `editorial.css:204` |
| Tail | Width `2mm`, height `2.6mm`, top `2.4mm`, outside offset `-1.8mm`; clip-path triangle mirrors for student | `editorial.css:203`, `editorial.css:205` |
| Portrait/name | Base square `9.5mm`; image is `200% x 200%` with quadrant offsets `-100%`; name `5.5pt`; student-b portrait mirrored, name readable | `editorial.css:219`, `editorial.css:220`, `editorial.css:221`, `editorial.css:222`, `editorial.css:223`, `editorial.css:224`, `editorial.css:227` |
| Final chat variables | Size initially `10.5pt`, reduces by `.1pt` to minimum `9.2pt` per unit; portrait mm `9.5+(size-9.2)*.77`; vertical padding mm `1.5+(size-9.2)*.23` | `full.css:97`, `app.js:141` |
| Concept rule | Left border `2.3pt`, radius `0 4mm 0 0`, padding `3.5mm 4.5mm`, line height `1.85`; numbered label square `6.3mm` | `editorial.css:49`, `editorial.css:50` |
| Caution | `#fbf8ef`, radius `0 2mm 2mm 2mm`, padding `2.3mm 3mm`, text `8pt`, line height `1.85`; label underline `1.5pt #e4cd91` | `editorial.css:52`, `editorial.css:53` |
| Learn/cloze/sentence rows | Fullmaster `24mm 1fr` columns, gap `2mm`, text `8.3pt`, line height `1.9`, padding block `1.5mm`; code width `10mm` | `full.css:41` |
| Recall alignment | Same row source; cloze hides marked terms in their original geometry; sentence preserves invisible source text height with an absolutely positioned `.6pt #bfcdbd` baseline | `full.js:13`, `app.js:8`, `editorial.css:119` |
| Blank recall test | Height `156mm`, border `.7pt`, accent top `1.6pt`, radius `0 5mm 0 0`; watermark `38pt`, `#f3f6f0`; rule container inset `8mm 4mm 4mm` | `editorial.css:107`, `styles.css:9` |
| Representative + twins | Two columns, gap `6mm`; first solved panel left, two unsolved checks right; group min height `102mm`; qhead `6mm!important`; prompt min height `12mm` | `styles.css:2`, `full.css:88`, `full.css:89`, `full.css:90`, `app.js:21` |
| Type title / strategy | Type number `23pt`; title `12pt`; strategy `7.8pt` / line height `1.8`; thin accent title rule, strategy badge | `editorial.css:89`, `editorial.css:90`, `editorial.css:91`, `editorial.css:92` |
| Full type-page variation | Worked problem + explanation uses `1fr 1.15fr`, gap `5mm`, soft background, accent top `1.6pt`, padding `3mm 4mm` | `full.css:44`, `full.js:12` |

The font/image-ready measurement sequence is part of the reference layout: `render()` waits for `document.fonts.ready` and image decoding, then runs `alignQuestionRows()`, `alignSpreadRows()`, `expandWritingSpace()`, and `fitConversations()` (`app.js:162`). The exact safeguards are:

- Local two-column rows share the larger qhead height and prompt height; the representative/check pair shares its qhead height (`app.js:62`).
- Matching even/odd exercise pages in the same unit and section share their grid start and all four problem-head/prompt heights. Matching also requires equal even problem counts and consistent daily-banner presence (`app.js:81`).
- Writing space is added in 7 mm increments (`7*96/25.4` px), distributed to the least-expanded rows; ordinary rows cap at six lines and reason rows at eight. Available height stops 8 px before the page-end note or footer (`app.js:103`).
- Conversations in a unit share the largest body-start offset and font size. The fit threshold reserves 4 mm above the end note; remaining space increases inter-turn gap from .85 mm up to 5 mm (`app.js:141`).

These rules should remain deterministic when the renderer adopts the design. No AI judgment is required to calculate margins, parity, line pitch, row equality, or available height.

## Discrepancies and implementation handoff

| Priority | Difference and evidence | Concrete design acceptance for the renderer owner |
| --- | --- | --- |
| P1 | Current cover p1 is white/text-only; current CSS is `padding:55mm 25mm`, title `32pt`, code rule `2mm #174f55` (`html.ts:132`). | Use the authorized cover artwork in the source's contained hero and restore the dark field, title/code hierarchy, equation/brand rules; recheck long custom titles. |
| P1 | Current opener p5 is a generic `auto-unit-intro` banner, `28pt`, padding `12mm 7mm`, radius `12mm` (`html.ts:134`). Reference pp8-9 have full illustration and a separate learning route. | Introduce explicit left title/right learning-route compositions and honor even/odd physical parity. Match content-relative source positions without crossing the binding margin. |
| P1 | Current p9 begins with a fragment from the preceding block before concept panels. Recall continuations pp12,15,18 lack repeated section title, concept codes, left row labels, and active stage navigation. | Preserve the identity of the section across continuation pages and keep concept group headings with their rows. Compare learn/cloze/sentence positions using corresponding rows rather than unrelated page totals. |
| P1 | Current p22 mixes sentence-recall boxes with practice; p23 combines continuing practice with evaluation. Sample problems show no writing rules, despite renderer support for 7 mm lines (`html.ts:105`, `html.ts:123`). | Allocate deliberate example/practice page archetypes with visible writing space; review a solved representative + two unsolved twins, a short practice spread, and a reason/problem spread. This is an output observation, not a claim that line rendering code is absent. |
| P2 | Current running header sits at `top:15mm; height:18mm`, with content beginning at 40 mm; reference running band is 6 mm at the 10 mm sheet inset (`html.ts:119`, `paginate.ts:11`). | Restore the compact running band and allow each archetype to own the heading/progress band rather than hard-coding a single 40 mm body start for every page. |
| P2 | Current base uses `TextbookPretendard`, `9.6pt`, line height `1.9`, ink `#293936`, whereas the original uses local NotoKR with archetype-specific sizes (`html.ts:113`). | Load explicit 400/700 faces before measuring and before PDF export; remeasure with the actual fonts. Preserve Korean and KaTeX text as selectable text. |
| P2 | Current footer treatment matches its main tokens but numbers are not zero-padded; sample p6 has a very long section label close to the brand. | Keep the outside number and opposite brand on both parities; constrain/truncate footer labels and use the reference 3-digit number format if approved. |
| P2 | Current p6 has the source-like bubbles and chosen portrait atlas, but no unified conversation background; chat spans pages without the source's fixed continuation strip. | Retain current selectable portraits and expression cropping. Add conversation enclosure and consistent page/continuation guide; use shared fit metrics for a unit. |
| P2 | Original type/practice pp24,34,36 use purple/tree tokens; current sampled practice pp22-23 remains forest. | Apply the tree palette to corresponding practice/type archetypes when matching the reference; keep stage navigation and examples legible in both themes. |
| Evidence gap | Story screenshot and designated reference PDF/app are different revisions. Current code has `rest` CSS, including `#fffdf6`, image max height `85mm`, prose `10pt/1.9`, but the saved PDF supplies no story page (`html.ts:135`). | Verify an actual exported story separately; preserve narrative, reflection, source note, and cream field. Do not cite archival printed p202 as a current reference-PDF page or invent missing original CSS values. |

The saved PDF covers a different grade/topic from the reference, so 172 versus 259 pages is not a page-count defect. This audit evaluates visual archetypes and geometry, not curriculum completeness or the mathematical validity of the private saved book.

`learning-sprout.png` is a supplied editorial asset, but the extracted active JS/CSS/HTML contains no reference to it. Its presence does not establish a required placement. The copied unit images retain the original U01-U06 numbering; they should be chosen deliberately for the generated curriculum rather than assuming that six unrelated elementary units carry the same original semantics.

## Asset verification manifest

All files below passed both full-byte equality and SHA256 equality against the extracted originals. Names were mapped only; no compression, resizing, trimming, recoloring, image generation, or font conversion occurred. All PNGs are valid RGBA files; chapter/cover images are 1536 x 1024 px and the sprout is 1254 x 1254 px. Total copied payload is 19,774,022 bytes across 11 files.

Paths in the source column are relative to the original app's `assets/`; destination paths are relative to `public/textbook/editorial/`.

| Original source | Copied destination | Bytes | SHA256 |
| --- | --- | ---: | --- |
| `chapters/COVER.png` | `cover.png` | 1968299 | `727174fc8ea4f5b4e94b7ab2ead6a349fe8b51ac0ae7f0234658d8e12c0885d7` |
| `chapters/U01.png` | `u01.png` | 1955206 | `5aa2b2542e98a82ec291794d66ca3fe79642101ac85ac5159a3bd40da4330209` |
| `chapters/U02.png` | `u02.png` | 1844594 | `69791786463d8cc3d4b2981b8e8c7954558f166b9ee1baff7ee6f8f7948bf5d0` |
| `chapters/U03.png` | `u03.png` | 1932092 | `1fbcea6272c3fea15d50912b4335cad5e9af66a8903a76dd2954b4623855b82a` |
| `chapters/U04.png` | `u04.png` | 1926061 | `82f92ca9f361acf801a14987ff474ca56c041898d433588ce2dc7f13a083d6d7` |
| `chapters/U05.png` | `u05.png` | 1923638 | `da4f5083ccaf634f72eddcdc6babf151a2076144c10b76cd39e94864263568fd` |
| `chapters/U06.png` | `u06.png` | 1814400 | `a2c4c9374d5e53f9fca0a04a4ada1eb30e4d346feef6269a40d05bd563ca1271` |
| `learning-sprout.png` | `learning-sprout.png` | 1490446 | `a3e1a4e944c1e62ec2d64c2c7a7614549c2a5693e1ab738e160c87d9de70520a` |
| `fonts/NotoSansKR-400.ttf` | `fonts/NotoSansKR-400.ttf` | 2457568 | `2f840a5d2d8bf48581dd1a28407920673e765140676a8af6d5d6af1d72421453` |
| `fonts/NotoSansKR-700.ttf` | `fonts/NotoSansKR-700.ttf` | 2457336 | `030b934a58b2fd48b589d311549f6af2da6a56b6b20a9cd35bc74701c3aa07f2` |
| `fonts/OFL.txt` | `fonts/OFL.txt` | 4382 | `f01fa8c01e5b8d9373b3431104c1c693987814a916286e9b722b0fc12ba999e6` |

The unchanged license is SIL Open Font License 1.1, dated 26 February 2007. Its copyright header identifies Adobe (2014-2021) and the Reserved Font Name `Source`. The included license permits bundling/embedding with the copyright notice and license retained; those notices are preserved verbatim in `fonts/OFL.txt`. The font name table's license URL is `http://scripts.sil.org/OFL`; its name-ID 13 license description is absent, making the accompanying OFL file especially relevant. A directory-scoped `.gitattributes` entry (`fonts/OFL.txt -text`) prevents Windows Git line-ending conversion from changing the license bytes on checkout. No license claim is inferred for unrelated images: their copying is authorized by this task.

## Validation and remaining scope

- Full-page visual review completed for cover, opener, dialogue, concept, learn/cloze/sentence recall, blank test, representative example, ordinary practice, reasoning practice, and the archival story spread.
- Eight PNG signatures, dimensions, modes, and decode integrity verified with Pillow.
- Both static TTFs opened with FontTools; required weights and glyph tables verified; OFL 1.1 file header and byte identity verified.
- All 11 source/destination files and staged Git blobs compared byte for byte and by SHA256. Existing 20 selectable portrait files compared against their initial hashes and left unchanged.
- No application tests, server startup, Prisma generation, migrations, network deployment, merge, or push were needed for this asset/report-only task. The `node_modules` junction was not mutated.
- Renderer implementation and new PDF export belong to the coordinator's separate work. The story reference revision still needs reconciliation for an exact source-based story layout; this does not block delivering the authorized originals or the audited tokens.
