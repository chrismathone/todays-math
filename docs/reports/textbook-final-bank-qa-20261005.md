# Textbook final actual-bank replay — 2026-10-05

**Acceptance: FAILED.** All 14 frozen grade/semester combinations settled as 13 complete pairs plus the M3-2 student variant: **27 complete PDFs, 1,171 pages**. M3-2 answers failed with `EXAMPLE_GROUP_OVERFLOW`, so the requested 14 complete pairs / 28 PDFs were not achieved. All 27 existing PDFs pass the automated geometry and coverage checks, and all 253 printed answer references in the 13 complete answer PDFs match actual student placements. Visual and publisher-path failures remain failed.

This is the preserved baseline for exact renderer commit `441fa1f84bdfa0ddcb967e15930820fcfe178435`, not approval of later corrected exports. The coordinator explicitly instructed this worker to finish and preserve it without restarting. The only tracked deliverable owned by this worker is this report; production files, QA scripts, shared node_modules and Prisma were not edited. No production writes, new bank capture, main merge or push was performed.

The existing fraction worktree was reused. It first fast-forward merged `BIGSHOL/testbook` at `52a572f906a2597ebf1e9f3931d52a1a8772cf39`, then merged clean QA checkpoint `6fbee569f422157d9458c6b37ed23404bb2407d1` into renderer commit `441fa1f84bdfa0ddcb967e15930820fcfe178435`. An attempted unrelated `main` merge was aborted without discarding changes; root clarified that the required current root was `BIGSHOL/testbook`, not `main`. The execution source was clean at launch and all 326 recorded source files remained byte-identical through settlement.

The new private run is `C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14`. Renderer version is `injaewon.textbook.renderer.v5`; template is `injaewon.textbook.a4.v15.editorial.v2`.

The frozen fixture has SHA256 `f316e89c0f59f8a8dbaad8277407da2162e31734fbf291d37937f5e25649b684`, 2,523,278 bytes, captured at `2026-10-04T20:09:56.904Z`, with `transactionReadOnly: on`: **660 real bank rows in 22 selected units across 14 combinations**. Actual `createQuickTextbook` ran against isolated PGlite with all components enabled, standard difficulty and a maximum 30 questions per unit, selecting 281 distinct actual-bank snapshots and zero non-bank snapshots. Shortages and original questions/figures/families stayed intact; no synthetic questions or invented long essays filled gaps. This tests the selected frozen units, not every curriculum unit in each semester. The two real descriptive rows are both in M1-1; the fixture does not establish long-essay coverage.

The writer physically imported this worktree's integrated product modules. It used `codexRenderer.planChunks`, actual `renderTextbookChunk`, official export browser and `mergeTextbookPdfs`, then recaptured each final chunk DOM. **It rendered draft chunks and did not execute the publisher's final student-reference pass**: no `referencePages`/`reservedPages` or final index rerender was supplied. Matching student pages were reused for answers. This checkpoint limitation was escalated and cannot be represented as a full publisher-finalization pass. No fullbook DOM was created.

Publisher bounds stayed **4 sections / 300 manuscript blocks**, renderer bounds **8 sections / 600 projected blocks / 32 pages**. The 500 completed chunk renders observed at most 4 sections, 28 manuscript blocks, 131 measured blocks and 19 pages. The subsequent failing M3-2 answer chunk produced no PDF. No caps, anchor requirements or tolerances were relaxed.

| Check | Result | Exact scope / limitation |
| --- | --- | --- |
| Settled combinations and complete variants | FAIL | 14 attempts settled; 13 complete pairs; 27/28 complete PDFs. |
| Whole-PDF geometry and coverage | PASS on existing PDFs | All 1,171 pages in 27 PDFs; zero reported issues. |
| Printed answer-to-student references | PASS / one variant skipped | 253/253 printed labels match; M3-2's 28 items have no complete answer PDF and remain unverified. |
| Font embedding/readiness and common dialogue font | PASS on existing PDFs | 2,929 dialogue font spans checked; E5-1 has 112 per variant and no former common-font failure. |
| Actual PDF PNG evidence | PASS for 27 existing variants; FAIL overall population | 206 generated sample PNGs; at least three viewed pages per existing variant. Missing M3-2 answers has zero samples. |
| Representative all-page AI reading | Complete; visual FAIL | E3-1 all 29+29 and M2-1 all 66+69 pages; total 271 distinct target PDF pages read across the run. |
| E3-1 orphan subtitle | PASS | Both variants p8 ending keeps subtitle, student bubble and teacher explanation together; p9 continues 2/2. |
| M2-1 fraction choice spacing | PASS | Actual bank source `03ea7776-4435-4a64-81de-00f6ea11634f`, both PDFs p30, five separated choice rows, minimum neighboring PDF glyph gap 1.84295654296875 pt. |
| Printed raw-TeX title/row labels | FAIL | 17 existing PDF variants, 86 flagged pages, nine pairs; screenshot confirmation recorded for each affected pair. |
| E3 navigation and activity scaffolds | FAIL | Contents/index page destinations absent; 16 duplicate TOC labels; recall/explanation/map recovery gaps. |
| Full publisher final-reference behavior | SKIPPED / acceptance unmet | Draft harness omitted the final-reference path; corrected QA checkpoint required. |
| Long essays, unsupported fractions, human/physical approval | SKIPPED | No long essays in frozen fixture; selected fractions absent in E4-1/M1-2/M2-2. Human editorial and physical printing not performed. |

Whole-PDF checks covered **61,462 text spans, 3,468 figures, 15,654 clip nodes, 5,757 anchors, 4,881 semantic nodes, 1,253 writing boxes and 824 rows**. Geometry, typed student/answer visibility, clip/resource witnesses and anchor/row/writing populations were checked on every existing PDF page. AI page reading does not establish human editorial or actual-size physical-print approval. The writer and verifier return process exit 0 even when result records contain failures; this report uses the recorded statuses and missing artifacts rather than exit code alone.

Counts below use S/A for student/answers. A visual PASS means no issue found in the stated sampled pages, not full mathematical or physical approval. All-page counts include the accepted independent E3 reader; extra issue pages are included where reviewed.

| Pair | Frozen rows | Actual items | Complete PDF pages S/A | Sample PNGs S/A | Viewed pages S/A | Printed refs | Geometry | Visual result |
| --- | ---: | ---: | --- | --- | --- | ---: | --- | --- |
| E3-1 | 30 | 11 | 29/29 | 8/8 | 29/29 | 11 | PASS | FAIL navigation/scaffolds |
| E3-2 | 90 | 24 | 61/65 | 8/8 | 3/3 | 24 | PASS | Sample PASS |
| E4-1 | 30 | 9 | 27/27 | 7/7 | 3/3 | 9 | PASS | FAIL raw titles |
| E4-2 | 30 | 11 | 29/28 | 8/8 | 3/3 | 11 | PASS | Sample PASS |
| E5-1 | 90 | 18 | 57/57 | 8/8 | 3/3 | 18 | PASS | Sample PASS |
| E5-2 | 30 | 9 | 27/28 | 7/8 | 3/4 | 9 | PASS | FAIL raw titles |
| E6-1 | 60 | 12 | 44/46 | 8/8 | 4/4 | 12 | PASS | FAIL raw titles |
| E6-2 | 90 | 24 | 60/62 | 8/8 | 4/4 | 24 | PASS | FAIL raw titles |
| M1-1 | 30 | 28 | 34/36 | 8/8 | 4/4 | 28 | PASS | FAIL raw titles |
| M1-2 | 30 | 11 | 30/35 | 7/7 | 3/3 | 11 | PASS | Sample PASS |
| M2-1 | 60 | 41 | 66/69 | 7/7 | 66/69 | 41 | PASS | FAIL raw titles |
| M2-2 | 30 | 25 | 40/44 | 7/7 | 3/3 | 25 | PASS | FAIL raw titles |
| M3-1 | 30 | 30 | 51/49 | 8/8 | 4/4 | 30 | PASS | FAIL raw titles |
| M3-2 | 30 | 28 | 41/missing | 7/0 | 3/0 | 0 | S PASS / A missing | FAIL raw titles / A missing |

The strict answer-reference negative controls used E3-1 and M2-1: **52 actual baseline references and all ten deliberate mutations rejected** (wrong model page, wrong actual student placement, unavailable printed label in its real box, missing answer node and missing student item). Evidence: [reference-negative-controls.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/reference-negative-controls.json>).

M3-2 answers failed at chunk index 15, section index 18, first physical page 29, with the overflow reported on physical page 31. Exact block `d1e360eb-7efe-4d15-9c84-102110f30143` is example group `example-61475648-cbb4-4e1f-be43-564cabcb58c7`. It binds source example `J30501-A01-002` / `599405f6-3dab-4a35-8aba-b6e111c2507c` to source confirmation `J30501-A01-004` / `f5d67cbe-defa-4b0d-a60a-2ba9adf6a6db`. Its actual source pair and captured solution remain intact. [failure.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/중3-2/failure.json>) preserves the error path, active renderer phase and progress; [source identity](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/m3-overflow-source-identity.json>) resolves the newly allocated IDs. The student PDF and all earlier answer chunk PDFs remain retained. The failed chunk has no output PDF, so no issue screenshot of a nonexistent final answer page is claimed.

Raw-TeX examples include M2-1 p20 `$10$` and student p51 / answers p52 `$n$`; E4-1 p12 `$0$`; E5-2 p12 `\times`; E6-1 p12 `\div`; E6-2 p32 `$0$`; M1-1 p14 `$1$`; M2-2 p13 `\mathrm`; M3-1 p15 `$y=x^2$`; M3-2 student p13 `\sin`/`\cos`/`\tan`. Exact PDF-page span boxes for all 86 flagged pages are in [printed-raw-tex-audit.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/printed-raw-tex-audit.json>); variant verdicts and actual viewed page numbers are in [visual-review.private.json](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/visual-review.private.json>). Issue PNGs remain beside the corresponding PDFs or in their all-page visual folders. A clean sampled page was not used to override a failure on another page.

The M2-1 fraction regression was resolved from its actual source ID, not a stale allocated block. The new item is `69869a39-d68b-443e-a7c3-b69716fcab59`; block `3212a3aa-7fcf-437d-afaf-c8de3c89a8e6`. All 135 M2 pages were read using readable original-resolution four-page sheets, plus enlarged actual-PDF choice crops. Student crop SHA256 `2ce3514c7ab14fe0a95cd9e7d143fcd4c84b2d5f8fbc92faf204d724b15ffbbe`; answers crop SHA256 `762301a11577e8f56ddc52ce9689964b41f8e42e970227ba71a530cc88e51a73`. [M2 raster and gap evidence](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/중2-1/all-page-visuals/rasterization-and-fraction-evidence.json>) pins all pages, crops and measured glyph bounds. No clipping or choice overlap was observed in the reviewed M2 pages; raw titles still fail.

Independent E3 Codex review was accepted at report commit `f449f41bd5f25f8fcd0f7d1e617fbc71896f6f23`, task `task_65dfa505ba03`: all 58 target pages individually viewed at 180 DPI, 17 selected original reference pages compared and 25 hash-pinned crops retained. The orphan-subtitle verdict is PASS, and all 11 printed references were also matched visually. The overall E3 visual result remains FAIL: p2 contents, p28 concept index and p29 type index lack usable destinations; p18 free recall, p19 explanation and p20 concept-map scaffolds have recorded design gaps. [Accepted E3 report snapshot](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/peer-e3-full-page-review.md>) has exact Git-blob SHA256 `14505bedd7a8e843c1b5ee2797e0b07b614d2c9319a35f417150fafe8e488842`; its private evidence is `초3-1/visual-e3-full`. The snapshot includes a full page ledger and 118 named renderer function hashes. It is an accepted peer review, not a duplicate reading attributed to this worker.

All complete export manifests agree on canonical scripts tree `b90e7e1e05084513153e81cbd96de4e6d1a06278` and script schema version 1. Seven grade JSON files plus source ledger/static corrections/reference-v15 metadata have different raw working/Git hashes because of CRLF checkout, while all ten parsed JSON values and normalized newline contents match. The raw hashes are preserved, not weakened or replaced by a tolerance. [Source file identity verification](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/source-file-identity-verification.json>) and [Execution source manifest](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/execution-source-manifest.json>) preserve 326 physical byte hashes/Git blob IDs, including quick-create, renderer, planner, QA and migration sources. Execution source manifest SHA256 is `35bcb394bf22a09e7f89d766622215395efddfd11a10926ff7969d9c858de885`. M3-2's creation/exchange and failure metadata remain available despite its absent complete export manifest.

| Executed module | SHA256 of exact working bytes |
| --- | --- |
| `scripts/qa/textbook/recovery/geometry.py` | `7d3c0d2759c2ba19c2e1f20c9c59da37894b6e081d2776be142a2675e8c364df` |
| `scripts/qa/textbook/recovery/local-books.ts` | `801661ab316a071b2738cd693505e4c83cbbb086a4bce75dbb6f5b90297c11d4` |
| `scripts/qa/textbook/recovery/verify_exports.py` | `2d37ff64c4ca4baccf2c3e0112a6e55f0bc82cb16e9261e2e7de5eb0907ebc04` |
| `src/lib/textbook/publish/codexRenderer.ts` | `f037ade0bd8d351c0f49ad63e55e09c82a9ac5a8afb66cb8f6e2cb19cc8a675e` |
| `src/lib/textbook/render/html.ts` | `b28b491a45935ad096cb6a893de3142f056e4c1b547759c5c49777207b99e78b` |
| `src/lib/textbook/render/server.ts` | `1d40f66a59224cd6a047dae778ba156f9806c36730f64792e28ef306625e4841` |
| `src/lib/textbook/server/quickCreate.ts` | `358b4a58a58cd72d67abcf9cbe45ad8222eef5036209f3e5280a6b1fd5e59332` |

The isolated PGlite dump is 26,856,981 bytes, SHA256 `aabcec69304e9c44796a6e35fc398bda32998fee206f3bbe0110897c8933a148`; its manifest pins all 14 settled attempts and the immutable bank SHA. No production DB credentials were forwarded: the harness removes `DATABASE_URL` and `DIRECT_URL`, reads only figure-CDN configuration and uses local PGlite. No secret values appear in this report.

The exact [artifact manifest](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/artifact-manifest.json>) has SHA256 `c427924db2547a169aa09f3a606c6dabef03cd04f47123fca169ee7e286f5e25`. It inventories **2,947 files / 3,864,160,422 bytes**, excluding itself, with exact relative paths, byte sizes and SHA256 for all evidence. It includes 527 PDFs (**27 complete variants + 500 chunks**), 647 PNG files (including sampled/full/cropped pages, contact sheets and actual assets), 1,172 JSON files and 465 gzip files (464 archived HTML files plus the PGlite dump). Counts of all PNG files are not substituted for the 206 actual-PDF sample PNGs or 271 distinct target pages reviewed. [Final evidence audit](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/final-evidence-audit.json>) has SHA256 `bd233af8160addee439fe2f18e7150b9f469351458fa8b1608060314c413d4f5` and resolves per-pair references/features/statuses.

The supplied `archive-inactive-html.py` losslessly archived only the 13 completed inactive pairs: **464 HTML files**, 4,414,609,784 original bytes → 2,071,631,948 compressed bytes, saving **2,342,977,836 bytes**. Every original/decoded size and SHA matched before removal, and every compressed SHA was independently rechecked while building the artifact manifest. Archive manifest SHA256 `8e678d5ad869aff5b8d6b85f6a6a196567562cba6a22776f75c3f78b462b9b3c`; [Archive verification](<C:/Users/user/Downloads/교재_복구_실행검증_20261005/automatic/runs/441fa1f84bdfa0ddcb967e15930820fcfe178435-final14/archive-verification.json>) records 17,259,995,136 free disk bytes afterward (about 16.1 GiB). All 36 failed M3-2 chunk HTML files and its visual gallery remain unarchived; all PDFs, PNGs, witnesses and historical baselines remain retained.

| Pair | Student complete-PDF SHA256 | Answers complete-PDF SHA256 |
| --- | --- | --- |
| E3-1 | `5c4bbf5186638177ca73a9d888ff41303b9f8c7529d1179f754d8de5cd07e09c` | `70d39a69d2a7a8072fea4a559922caf682cec21327a735e2ac5544531ce60e93` |
| E3-2 | `8a9539e111b09c0889f6b075ac1a64f5deac8fddc7fc0a41e3bb33e2590519f2` | `d1b853e477678eef8365fcb1ec279d2ff7f46b3d66d95e22a9a11f4a40d4250d` |
| E4-1 | `cd049f6f25ded1994b361b81c21960dc38e4aae2556dc12f03b5317d11389fc7` | `c4c14657c0eb193d8a9cdd3a612972fcd46ffc9dca750b967f9c81f3eeedfb3a` |
| E4-2 | `f41f1a62d45ccf4329a92eb515fe678d3753529b5aeb44f70ac01331bf34e414` | `d586575af02deee8b523ee79f39921cff58aec852567a5e510ce61c3194e4dcb` |
| E5-1 | `5d99310ace17fd4c7278e3a9f23fc9eb5b41fe330a933964e6445a211b5d6120` | `bec3b8af159561e7221598e8c2520c501e98ae3cb81210f9c28ea5e0181a5764` |
| E5-2 | `647c481683e966593cdd8588f28378eccbc1040530d70c444ce28e903e57c055` | `4af34e3c9a481dbbce2a6f79643374ea3cd82e04fa8922a4087db4e8af7a3525` |
| E6-1 | `e33493e02a5aebbdc476afb1c0425c3ca2914247e476df2b1450774a57f1f5a5` | `04f7370de7c1cb6661727ca4dcdacdf6d33b2662d3fee06b18b97a69fbef81a6` |
| E6-2 | `d98184de476db766b16dac250978b52830ebad30b2efdfc9043c4de7e1feda91` | `eb3608b3e237a437276d5e057d731f1f1de7bf5c9e5fb6e0b6576bf5fd4b8128` |
| M1-1 | `b8ccce4f456a4013c1f49fb50847a0477addc2344424c2fa19da762e5ecd79de` | `3c1298e6d91c9d4bd2f414a475703fd85e792d0750f0dce9f97af05274d61b73` |
| M1-2 | `54b4c756cf3b0a4ab8d102d7979791f70d22843524f7ef4b58fd47a83016449a` | `7d8c8eeb37bb7b0f77158c7496a3dc5145bc517c2063be303a44b81250198928` |
| M2-1 | `2026406c60563488dedcdecefd3289b8db5fb53023d95660006b8fb0a802e55e` | `61331d436587b1fc195b6fc6a695201530bfdedc763b8d28693ffb1df485579c` |
| M2-2 | `fe8472a5b16776d88df380478ee53498b378f891d7c786f6e50ce93181935118` | `7bdae838e1a7c2cac6907817d2c4fe0b72e0434b2c82ab6b3ae4ecac6920c04e` |
| M3-1 | `05954e232707ebcee40caf902562d94ebdc6da4cebacbd1dccbf0789e1fd6cfe` | `28b3cbbc880aa762c6f9eeaabd5e5091a692789bbb5078ae04084e9149c1d7af` |
| M3-2 | `6d8a706645b8e0e6c3eea12428bee9bec30b15dcc382d57e183389169f7e9658` | **NOT PRODUCED** |

Root owns the M3-2 paired-example overflow, raw-title rendering, native activity/scaffold and navigation fixes, plus a QA checkpoint that executes the publisher final-reference path. These changes require a fresh exact-SHA run and fresh inspection; none are covered by this preserved baseline. The 28-PDF acceptance, full final-reference validation and human/physical approvals remain unmet. This report records the failure and preserved evidence without inventing a missing answer PDF, synthetic questions, relaxed constraints or a release pass.
