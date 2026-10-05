# Independent final recovery QA — 2026-10-05

**Current checkpoint: complete source geometry remains failed, and the final integrated replay is pending.** The frozen `83e6b72c4` source pair contains 36 student pages and 47 answer pages; its historical corrected witness fails 445 coordinates and excludes two native free-writing containers. The latest `6580fc43c` focused replay passes R24, R26, R40 and R41 with the expanded native writing guard, while R29/R30/R34/R36/R42/R43 fail 94 coordinates. The completed `c761012f6` real-bank run exported all 14 student/answer pairs, checked 1,216 pages and produced 212 PDF samples; its two E5-1 common-font failures and observed fraction/subtitle visual failures remain historical failures. No G0–G6 acceptance, human approval, mathematical editorial approval or physical approval is asserted.

## Scope and immutable inputs

This dispatch began from accepted QA `eb3c06706`, read `docs/planning/tracks/reports/textbook-recovery-reference-implementation-20261005.md`, merged main through `b0901f34a8eb2facd895401f258cf84a9c61b0da`, and merged authorized coordinator changes through `6580fc43c3b062bf1d29adad5f74f2aa3a05d60b`. Owned edits are confined to `scripts/qa/textbook/recovery/**` and this report. There were no direct production app/contracts/manuscript/DB edits, production writes, pushes, deployments or new-agent actions. Actual bank capture used a verified read-only transaction; actual book construction wrote only isolated local PGlite.

The canonical UTF-8 LF Git bytes of `docs/planning/textbook-v15-recovery-plan-final-20261005.md` hash to `0ab8ac18fc033936e52a300752dd73894fbccfa52c740c0acc52c0d03cb04bb7`. Windows CRLF working bytes are a distinct representation. The original 259-page student PDF is SHA `6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0`; the original manuscript is SHA `520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb`. The original answer PDF has not been fixed as a visual reference, so no original-answer visual equality is claimed.

Private evidence is under `C:/Users/user/Downloads/교재_복구_실행검증_20261005`. No private manuscript, question bodies, credentials or large evidence assets were added to Git.

## Lossless source adapter and complete original oracle

The converter retains original hierarchy and class tokens: `h1` becomes safe `h2`, `b` becomes `strong`, `i` becomes `em`, and `small` becomes a safe `span` with its original classes and a display marker. Original `h1.chapter-title` had been flattened. Original inline PNGs and SVGs stay in their source parents as verified typed assets. Raw source trees, files, question records, answers, solutions and TeX remain separate immutable provenance.

The three original portrait PNG hashes are `3720474c52a466526c480729dce8e4970aa04f9c62ee4b1dde0550a7df59d867`, `86df0f7eb2e0c26d98012a6c335dd6a3b1407c3c84f1ae838f15120f41c8548d`, and `7f3c0ab445413b997d4bdfe15ad71254c5fcb009aefb3d2d8b777774a733543a`. Both original students stay on the right; their original mirror choices remain false/true. Teacher styling has a distinct source namespace while source identities stay unchanged. Native tone and explicit `section_name` are copied exactly; absent metadata remains absent.

The original `fullSheet` relocates only its final direct-child checkbar, study footer or dialogue continuation note. The adapter mirrors that operation on a copied tree, preserving 47 exact end notes: 40 checkbars, three master footers and four dialogue notes. Original question headers are captured by executing native `fullQuestion` with its actual caller options; 222 exact native header trees preserve original numbers and 80 explicit labels. Native parent grids determine question column spans rather than question kind. Direct before/questions/after flow stays ordered. A further proven QA adapter correction now keeps R40's nested oral questions interleaved with their own listener prompts and the final rubric; raw source trees remain unchanged. This adds two authored fragments, changing adapted block count from 354 to 356 without changing any question, answer or TeX.

The latest oral fixture at `reference/fixtures/native-oral-flow-v4` has canonical exchange hash `f2b74c1c0897868d3759b40a4b337e25b3c7e54138baec39373f3c563d7d534b`: 60 selected sections, 356 blocks, 222 original questions/snapshots, 50 speech nodes, four boards, 11 linked public examples, 36 common concept rows, 1,347 TeX bodies, 47 end notes and 222 native headers. Source conservation passes, including exact R40 order `authored, B0145, authored.flow1, B0146, authored.flow2`; changed answers and TeX are rejected.

`source-computed.ts` measures every original U01 sheet R8–R43 after original fonts/images load and exact original alignment, writing expansion and dialogue-fit functions run. `reference/source-complete-u01-oracle-v3/source-computed-geometry.json` has SHA `49572d668fcc863ae0493acb50ba688baf8e1ab5b47e97c3891668ed17ad8182`. Every compared rendered source page must have a nonempty actual original anchor population and this pinned oracle hash. Earlier 14-page oracles remain diagnostic and cannot establish full 36-page coverage. Container boxes, text-Range boxes and original PDF glyph ink are distinct measurements.

## Complete source exports and immediate failure evidence

The frozen full `83e6b72c4a011c059b0ba5825a3afb16be46b6ab` export is in `reference/runs/83e6b72c4-complete-source-v3`. Fixture-file SHA is `514e10f1eca7eb484fbcbe5c1c7ca177bf8a4eb0570e928eed9fb7c161bd2e6a`; canonical exchange hash is `e9d74e31cd001248882393a6a0532b5d771ab82e5745e3502d2468d6c0b761fb`. Each variant used nine bounded four-section jobs.

| Variant | Pages | PDF SHA | Current complete result |
| --- | ---: | --- | --- |
| Student | 36 | `b28b1f3ece8222689e88bbd9fade68824ecd9c382be15e568837623c11c3ad4c` | Failed: 445 coordinates |
| Answers | 47 | `eeea5e0a8ed7b7eb2ba6e71cce9fc66a6baf9039b5fb72e85f01a5d2d66b4a9c` | Geometry passed; 142 references verified |

The original full witness failed 449 checks: 445 coordinates, three checkbar populations and one coverage declaration. Actual stored-DOM inspection proved all three master guide bars exist as `.tb-recall-checkbar`, match their native boxes within 0.009 mm and had simply been omitted from the QA selector mapping. The independent `new-u01-semantic-student-all-guides-complete-witness.json` corrects that mapping and has all six computed population flags true; its corresponding geometry still fails 445 coordinates. The original 449-failure witness, all PDFs and placements remain unchanged. Population coverage is distinct from coordinate equality. A further audit found native safe-fragment `.work`/`.recall-rules` containers outside the typed writing candidate selectors: that historical writing flag certifies declared typed containers, not every native free-writing rule. Expanded native container/vector extraction is implemented and verified in the later focused checkpoint below; it does not retroactively make the historical witness complete.

The complete student extraction checks 36 PDF pages, 3,132 PDF spans, 151 PDF image placements, 1,013 DOM clips, 1,767 original/actual source anchors, 302 semantic nodes, 111 dialogue-font spans, 163 writing boxes and 36 common rows. These counts come from the independent complete geometry JSON.

`source-failure-cohorts.json`, SHA `f7993f772dc72d858e3f04515f6f46077836655f77c3351fb71ba574db408e2f`, binds the original full PDF/oracle hashes and maps each failure to actual source kind, page, section, block and problem identity. Coordinate cohorts were recall R21: 3; drill R22: 60; paired R24/25: 32; types R26/27/28: 48; exercise R29/31/32/33/38/39/42/43: 152; clinic R30: 21; practice R34/35/36/37: 112; oral R40: 13; mindmap R41: 4. The removed three master-population failures remain in the historical cohort report.

Exact original/stored CSS evidence includes `first-cohort-computed-css.json` SHA `16a6f04f598777ec5fdfaeaeb8be81082407b33de2624be44d4af4ac2446dea9`, its v2 SHA `dd11c7efca3ddecabb6214dfcd47cc88026c8b88e5b5f189ae960c5cdc2d17f2`, and `paired-worked-native-css-v3.json` SHA `ebf4d559685ec50e52efa8c27dbb96a3567fa8213e7ed7ea580b5e54bac7f924`. Exact block failures were reported immediately through Orca rather than deferred to this report.

`same-region-comparison/same-region-comparison.html` maps all 36 original source regions to the actual student PDF, pins both PDF hashes, and displays actual whole-page PNGs and anchor deltas. AI inspected current source student R21/R29/R41 and answers PDF pages 8/22/40. R41's C01–C04 diagram remains painted in its verified SVG image; missing DOM textContent was not proof of diagram loss. Its note, badge, writing rules and stage-caption styling were visibly different. These observations are neither human review nor original-answer visual approval.

The later focused `05fd660f021221465c76078247022a19992309ef` replay on oral v4 is in `reference/runs/05fd660f0-focused-cohorts-v4`. Each source page is one separately saved PDF; these noncontiguous pages are not merged into a purported complete export.

| Source page | Result | PDF SHA |
| --- | --- | --- |
| R21 recall | Passed, 0 issues | `54e95b3c2aace004a2b11bed4c93f43430edb2b1f91e10ef1bea8a065cb54f21` |
| R22 drill | Passed, 0 issues | `094e7b24829d5f507e66cbda26f415d2120276ee898225c1cb90ce83b84a4cae` |
| R24 paired | Failed, 14 coordinates | `91d53b5845865e984f1b5b16e4b16ea673550a76ed057e4ca1256d2ecad6d769` |
| R26 types | Failed, 14 coordinates | `ac1866a193108a3ccf3e8d1b5962f327c5568398b5bf14f51d4b0ab0fa6982ed` |

All four focused pages have all six actual population flags true. Worked-example boxes now match. The remaining second twin question has native top padding 2.5 mm and margin 1 mm, while the producer uses 3 mm and zero margin. Its first neighbor's height, prompt font/height and writing lines match; the propagated content shift is about 0.59 mm. Exact JSON `focused-cohort-native-css.json`, SHA `f8f9df243f3cdec830adb36fba1caf6e180c8a2c84a5a9a2eec3c6e174bb7343`, records all coordinates/CSS. The 0.5 mm tolerance remains unchanged.

`reference/source-native-writing-allocation-v4/source-writing-allocation.json`, SHA `e55363ff1ca288a25b3e11b7d7ca12798ba0b7eab611c54e156f1089881dd7dc`, captures all 12 eligible native sheets before/after the exact original runtime allocator. It records actual direct-grid order, matching spreads, daily banners, base/final counts, caps, offsets, margins, padding, borders, question/body heights and footer limits. Original `fullQuestion` uses `q.lines ?? 2`, matching the adapter. Original layout expansion changes R29 B0089 from 3 to 5 lines, R34 B0113 from 1 to 5 and R42 B0147 from 1 to 5; R42 pairs with R43 and grows its writing margin from 1.2 to 8.090588 mm. Those are native runtime allocations, not a reason to alter immutable question lines.

## Expanded native writing and 6580 focused checkpoint

The new original oracle `reference/source-native-writing-oracle-v5/source-computed-geometry.json`, SHA `052176003f8b8cfd88146cf8236c3eef1fc619bf23e6c4fe5c250f43cf97fdf3`, preserves every prior source anchor and adds actual free-writing DOM/PDF witnesses. Its companion native DOM JSON SHA is `ee89523011b35680813e0d186907993e3fd9a756c64f4be1b250141abf240fe9`: 134 actual native containers and 437 direct ruled spans across all 36 source sheets. Of these, 132 belong to native questions already represented by typed writing areas; the additional source free-writing containers are R21's 18 recall rules and R41's three mindmap rules. All 21 added rules match actual vectors in the pinned original PDF within the unchanged 0.5 mm coordinate and 0.005 mm thickness tolerances. The generic bank pitch remains 7±0.5 mm; immutable native free-writing pitch is checked against its exact original DOM/PDF rather than that unrelated bank rule. Answer native areas require original line population and their own actual DOM/PDF consistency; original-answer position equality remains unasserted.

Independent re-extraction of the unchanged `05fd660f0` R21 PDF passes zero issues with all 18 native rules actually inspected. Its new `chunk-0-native-writing-v5-witness.json` and geometry preserve the earlier files. Direct native original/current PDF vector comparison SHA is `fbc93f3a1f5a09f272707755da3eeb6cd31d1f41c5d773eb5236a7bc9a835bde`; maximum coordinate difference is 0.264583 mm, with all 18 vectors present.

The later `reference/runs/6580fc43c-focused-native-v5` run freezes renderer `6580fc43c3b062bf1d29adad5f74f2aa3a05d60b`, oral v4 source and the expanded oracle. It renders nine bounded jobs/ten actual pages, including R42/R43 in one call to preserve original spread allocation. Noncontiguous jobs remain separate PDFs.

| Source pages | Geometry | Actual PDF SHA |
| --- | --- | --- |
| R24 | Passed, 0 issues | `ad2f68c6c3a24a2b09404a4634b5fac6a67597a3472f6eec665009de6db9fd8a` |
| R26 | Passed, 0 issues | `8e547a645e05b308aefab45993f9589025425a2c63fa78a37373a82704ed0cf6` |
| R29 | Failed, 9 coordinates | `190b43cb23b582a1f47af026167ddf85e8863701d4c3868a2e04b0c46667bbe7` |
| R30 | Failed, 21 coordinates | `a06372dd01e550ddae69399c35d98ce35609ef131bf2a4c24d7f89f5a2a9090f` |
| R34 | Failed, 37 coordinates | `32b30e34efd609bef84adbb63875e0024a65263ee156b0ed4e2ed5884a8c27eb` |
| R36 | Failed, 17 coordinates | `157424525392fa40f94518377218ca7c6afa78f508920fa2f96f055c66160b64` |
| R40 | Passed, 0 issues | `8e3e814d58f52bd3f5746d613fc3b36332aa6a2e0552a47fa1f3a3861af18bea` |
| R41 | Passed, 0 issues including three native rules | `44d243e522aed9701ac3065f2dbd3133060867e475ca0687807966cf808dc38c` |
| R42/R43 | Failed, 10 coordinates | `553cb4bb0cc8632d79f0d2d53ed10c9a86bac0705df47e4560932246abc6dce1` |

All nine witnesses have actual computed population flags true; their coordinate failures remain failed. Immediate coordinator report `msg_5a1897ff4e82` includes exact failures: R29 body +1.637 mm, R30 question start −5.064 mm, R34 body −2.960 mm, R36 body −13.705 mm and R42 body +1.034 mm. R42's third prompt is 5.779 mm high versus original 11.559 mm, and its writing start is 6.983 mm earlier despite matching bottom. Exact CSS/runtime diagnosis and the subsequent complete replay remain pending.

## Failed baselines remain failed

The original failed 55-page student PDF remains SHA `b51a95ba1ae82838efc688aa745a43a224e2407c121f490706f38a45e9df5f58`; the original failed 60-page answers PDF remains SHA `b13a05db3408b0f327471a4393a7bf6aa4810736ae19911ee609ab8b4a652dcb`. Independent complete stored-DOM rechecks fail with 550 student and 70 answer issues. Missing original production placement coordinates remain null/failed. The failed baseline's same-region HTML maps all 36 source regions and exposes its extra pagination rather than concealing it.

Other superseded source runs remain separate and failed, including the 46-page `22df94e95` student (209 checks), `94e402ee3` spread-alignment failure, and 38/50-page `4dc9fd992` pair whose expanded question witness failed 642 student checks. The latter answers passed functional geometry and 142 references; that does not repair its failed student counterpart. The `83e6b72c4` focused R14/R17/R23 regression passed all three pages after the native R17 outer gap was corrected; it does not establish whole-U01 equality.

## Actual bank capture and completed 14-combination run

The private bank fixture SHA is `f316e89c0f59f8a8dbaad8277407da2162e31734fbf291d37937f5e25649b684`: 14 grade/semester combinations, 22 curriculum units and 660 actual eligible shared-bank questions. Capture loads main's environment without printing secrets, verifies `transaction_read_only=on`, and exposes no write adapter. Meaningful `elem:`/`mid:` pairs use actual family, difficulty and problem type, with pair counts 6,15,5,6,15,5,10,15,6,6,10,6,6,5 across the 14 combinations.

The actual E3-1 fixture has five fraction and 26 figure questions among 30 candidates; actual M2-1 has 39 fraction questions among 60 candidates and no figures/descriptive questions. The broad eligible catalog has no descriptive questions in either E3 or M2 semester. The only captured descriptive candidates are M1-1, with body lengths 86 and 49 characters. The demanding long-written representative source requirement remains unmet; no synthetic essay or artificial bank problem substitutes for that shortage.

`local-books.ts` runs actual `createQuickTextbook`, official visual freezing and exchange assembly with the full local migration chain. All 28 options are on, standard difficulty and 30 requested problems per unit are selected, and a nondefault three-person cast is frozen. Every selected real snapshot is compared with its actual bank ID/code/body/answer/solution/type/family/figure arrays; nonbank count is zero. Publisher steps remain bounded to four sections/300 manuscript blocks; production calls retain eight sections/600 projected blocks/32 pages. No whole-book render call is used.

The settled `automatic/runs/c761012f6-final14` run freezes renderer `c761012f65d7981cc4e972c91b4e3051b5d1168a`. It created 14 local books, exported 28 actual PDFs, checked all 1,216 pages, verified all 281 actual printed answer references against student placements, and saved 212 PDF samples. Its verification JSON SHA is `95425e668a8ca8822f1bbfea46948a17fbb6a31b2a3439e1574a5cc4209784a4`; the durable PGlite manifest SHA is `37e94a75ff390747270c3eca40e1925e1ed493adc298c89f13513ea646b62a36`, 26,858,172 bytes.

| Combination | Student pages / issues / samples | Answers pages / issues / samples |
| --- | --- | --- |
| E3-1 | 29 / 0 / 8 | 29 / 0 / 8 |
| E3-2 | 61 / 0 / 8 | 65 / 0 / 8 |
| E4-1 | 27 / 0 / 7 | 27 / 0 / 7 |
| E4-2 | 29 / 0 / 8 | 28 / 0 / 8 |
| E5-1 | 57 / 1 / 8 | 57 / 1 / 8 |
| E5-2 | 27 / 0 / 7 | 27 / 0 / 7 |
| E6-1 | 44 / 0 / 8 | 46 / 0 / 8 |
| E6-2 | 60 / 0 / 8 | 62 / 0 / 8 |
| M1-1 | 34 / 0 / 8 | 36 / 0 / 8 |
| M1-2 | 30 / 0 / 7 | 35 / 0 / 7 |
| M2-1 | 65 / 0 / 7 | 68 / 0 / 7 |
| M2-2 | 40 / 0 / 7 | 44 / 0 / 7 |
| M3-1 | 50 / 0 / 8 | 48 / 0 / 8 |
| M3-2 | 41 / 0 / 7 | 50 / 0 / 7 |

Exact PDF hashes and sample names for all 28 outputs are recorded in the settled verification/manifests. Representative E3-1 student/answers hashes are `702ff1de2efc4088277d464078392d995ec1de5d247beb706724258935cd4da7` / `83fafe37c2169a613d3e02f25dc3b8178b371ddf3d4f419e7bd6f82ccc8a6032`; M2-1 hashes are `1c619736e0ec27ad5be59f718df9d0701467c12496477b352184288c5ad944ff` / `b0f387d04a577baa95e37334ddaaeab12b3bb76f4bde64401b38dbe34b3cb12d`. Those books have 11 and 41 distinct real snapshots respectively, with five and 39 fraction snapshots, and no synthetic question substitutions.

The E5-1 unit `u-013f0b8a-1e66-4afc-b56d-5be6e7df30b2` has one dialogue section at 9.195 pt and its later section at 9.9 pt, causing one `DIALOGUE_FONT_COMMON` issue per variant. A third observed dialogue belongs to a different unit and is not evidence of a three-section same-unit failure. The later coordinator unit-font fix is awaiting the requested final integrated automatic replay.

AI inspected at least three actual PNGs per E3-1/M2-1 variant. Despite zero geometric issues for those pairs, M2-1's actual fraction choices overlap: item `adc85440-6aed-41c7-876b-ba60738f0019`, block `d146236c-24aa-4a61-a039-78952a732ceb`, page 30, adjacent numerator/denominator boxes overlap by 6.41 pt with 22.5 pt choice baselines. E3-1 page 8 leaves the subtitle “똑같이 나누기” orphaned. Neither visual failure is erased by subsequent commits without replay. Samples for the other combinations are saved for review; their existence is not human approval.

Every automatic export manifest preserves canonical source version: script-tree Git OID `b90e7e1e05084513153e81cbd96de4e6d1a06278`, schema version 1, source script versions/provenance, frozen concept composition hashes, actual working-byte SHA and canonical Git-byte SHA for all seven script banks and metadata. Canonical ledger Git SHA is `949f0acaab4a12689ea81abe7abef9ecd097c7a02de69e6d8d51a1792a5e1fd5`; corrected-static metadata Git SHA is `b10eb1c956b050751ddedcda2e012adc6c297091dc4fd00ae19b6da890f9a29f`. These fields remain part of the final replay manifest rather than being replaced by an unpinned generic source label.

Earlier automatic runs remain failed. The settled `d693559f3-resource-dedup` run created 14 books but produced only 18 PDFs; ten final outputs were missing. Its DB SHA is `5b3e5fb315bf6bdb873054b9fba96b8fac31a7f4628d9d399d02059f394b8bf5`; verification SHA is `947b76d1d555c969d334db2ff38987b4dec941aed741036dd2c52aef06a34f59`. Earlier SVG validation, spread alignment, continuation, overflow and owned-browser failures remain attributed to their frozen versions.

## Evidence integrity, guard checks and remaining gates

Final DOM extraction retains original HTML and substitutes only repeated embedded resource URLs during inspection. Every decoded resource's bytes/MIME/length/SHA are checked and served once on the already permitted origin. Source text, CSS, hierarchy and other attributes remain unchanged; fonts and every image must actually load. Blocks, rows, QR nodes, writing boxes, clipped descendants, semantic activity/number/answer roles and official placements are reconciled from actual rendered populations. Missing PDFs, blocks, placements, source pages, source hashes, resources or required anchors fail rather than pass vacuously.

Completed inactive HTML archives preserve exact decoded bytes and durable manifests before any individual uncompressed copy is removed. No PDF/PNG/JSON, failed baseline or active file is removed. The complete source archive records 18 chunk HTMLs, saves 92,781,727 bytes and has manifest SHA `d621233276680ec9deacf7b27b228db6c7426706cebcdbec37ce9cea5803417d`. The settled d693 completed-pair archive records 236 HTMLs, saves 1,466,131,718 bytes and has SHA `5fddd1c856aeebbce5d75395ffbae3888f97defb46638d2d853cc5e3512e75f2`. The c761 completed run's 506 archived HTMLs remain hash-readable with manifest SHA `e419b51a0c256182c5cc2887b9591df1191f5c32485947355a94215706d325ba`.

The independent geometry suite passes 57 tests, including intentionally broken geometry, semantic fields, writing/QR/clip populations, forged coverage, missing fonts, mismatched PDF hashes and incomplete original-source oracles. Added tests reject malformed/missing native DOM/PDF rules, shifted original bounds/vectors, wrong pinned PDF and changed thickness; the same suite rejects bank pitch 8 mm while accepting a verified native 8 mm reference. Actual representative reference checks pass 52 printed labels and reject ten in-memory mutations: wrong model reference, changed actual student page, unavailable printed-label box, missing answer label and missing student item. Source conservation rejects changed answers/TeX and verifies exact safe-tag hierarchy, native labels/footers, portrait bytes, question identities and oral reading order. Scoped TypeScript, ESLint, changed-TS Prettier, Python compilation and diff checks pass on the current QA checkpoint. Pending integration changes require their relevant replay and final checks.

Outstanding work is the coordinator's remaining source layout fixes, bounded per-kind proof followed by a new complete source pair, and a final actual 14-combination replay after source allocator/fraction/common-font/preview integration. G0 source visual/geometry equality remains failed. Demanding real long-written source coverage remains absent. Human all-page reading of the representative pairs, mathematical editorial approval, physical printing, editor/draft/published round trips, designated-account and real QR flows, deployment and other G1–G6 acceptance remain separate pending gates. AI reading and automated checks are not substitutes for those approvals.
