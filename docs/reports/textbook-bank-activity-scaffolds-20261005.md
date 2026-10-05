# New bank native activity scaffolds — 2026-10-05

Task `task_8be45a9954bc`, dispatch `ctx_6e856784f997`, Codex worker. **Scoped implementation and synthetic PDF acceptance complete.** The new bank free-recall, oral-explanation and concept-map activities now recover the supplied original p21/p40/p41 activity structures and address E3 findings F04–F06 in [the prior full-page review](textbook-e3-full-page-visual-20261005.md). This result covers the precise synthetic exports below; it does not supersede the earlier settled actual-bank PDFs or certify the coordinator's complete release.

## Ownership and integration

The clean worker branch first merged required root checkpoint `52f4ef4b6`. Worker implementation checkpoint `6190858708ea64e8e51ab6c8e51d5c43451c2e4c` changed only `quickCreateRecovery.ts`, the new `bankActivities.ts` and the new scaffold unit test. Root then merged that checkpoint and implemented the requested shared integration in `30760a7fde81cabb315cee5fb184002749d4ffea`; this worker fast-forwarded to that exact hook before real PDF verification. Other changes brought in by that root merge belong to root, not this worker.

Exact integration request, now fulfilled by root:

1. Import `renderBankActivityHtml` from `./bankActivities` in `render/blocks/semantic.ts`; at the start of `renderSemanticTextHtml`, return its result when non-null and retain the existing fall-through paths.
2. Import `BANK_ACTIVITY_CSS` from `./blocks/bankActivities` in `render/html.ts` and append it to `TEXTBOOK_CSS`.

The final worker supplement contains the opt-in real-renderer test, this report, a lint-only test helper correction and a map-title CSS correction. The initial PDF review found flex layout compressing whitespace next to inline `$n$`; the final title uses normal block text flow, and all four PDFs were exported fresh and reviewed again. Root retains ownership of shared integration, full-repository checks, merge, full-bank export and release work. No operational database write, Prisma/shared-module edit, main merge, push or deployment was performed by this worker.

## Resulting behavior

| New bank activity  | Native scaffold recovered                                                                                                                                                                               | Bounded grouping                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `conceptBlankTest` | Rounded 18-rule free-recall canvas; `정의 → 예 → 판단 이유 → 풀이 방법` cue; INJAEWON watermark; two self checks, two teacher checks; deficient-concept-number field; completion/review/question checks | At most four canonical rows per activity page, with continuation groups                                                                  |
| `explainActivity`  | Three-step oral workflow; canonical-term tasks and response space; listener-question panel per task; three-criterion self/listener matrix; repair prompt and response space                             | At most two canonical terms per page                                                                                                     |
| `conceptMap`       | Exactly four native cards with curved organizer connections and central node; definition/example cues; concept-check response and completion/review/question area                                       | Four slots per page; all terms conserved in order; unused final slots are writable `추가 기록` fields without fabricated IDs or concepts |

Only versioned `bank-activity.v1.<activity>.<group>` rows with `bank-blank` text format opt into these scaffolds. Original source metadata/fragments, unmarked saved rows and legacy writing nodes fall through unchanged. Canonical term labels use the existing safe math helper. Canonical raw definitions and IDs remain exact semantic-row payloads; the activity scaffolds supply writing spaces, not new mathematical statements, worked examples or answers. Central connections have no authored mathematical relationship labels.

Bank writing rules measure **7 mm pitch** with **0.265 mm configured thickness**; measured browser borders remain within **0.2–0.35 mm**. All selectors are bank-specific. Original source writing rules retain their native dimensions. Structural recovery is the claim here: mathematical content, original 8 mm recall pitch and every original page coordinate are not claimed identical.

## Canonical conservation and unchanged contracts

All **1,657 core concepts / 360 canonical sections** retain their identities and content. The unit test compares every selected activity's concatenated rows against `conceptMemoryRows` for every section and verifies the canonical input hash before/after generation. Each activity conserves all 1,657 rows once; existing immutable study/cloze/sentence rows and partitions remain unchanged. All eight combinations of the three selected toggles are tested, and each of the other 25 independently selectable toggles cannot couple these activities.

Core canonical JSON SHA256, ordered by the existing seven `BANK_PARTS` core entries:

`91f45b0554b070644f982345ef67a2fdeb01df63d4c3d6591489c83cd5a9ae8c`

The seven core bank Git blobs are identical at `52f4ef4b6` and the root-hook checkpoint used for export. Exact current checkout bytes and counts are recorded below; Windows checkout line endings are included in these raw file hashes.

| Bank file | Concepts | Sections | Raw file SHA256                                                    |
| --------- | -------: | -------: | ------------------------------------------------------------------ |
| `e3.ts`   |      194 |       56 | `da60119f0a6d1bf72d7b64125048a7d7b452cff1458548a7e1f14b76eb69a2ee` |
| `e4.ts`   |      145 |       62 | `7b8fec8f603f408450daf15e9a1f1c085428c312ceb0a85ab8a536764fa08604` |
| `e5.ts`   |      197 |       56 | `728dc8515bece565f4e2146cadd9b5ef9935b2593c650ccaa964ee30722d2c6a` |
| `e6.ts`   |      196 |       56 | `6038836b8f525a18b6986241319e10aed6fbac3bb18b611fc5192056084372e6` |
| `m1.ts`   |      362 |       52 | `2ee2eb24df77f6f902c0a5ffa0a403818a3cf52a49668eee7235c025d8404b50` |
| `m2.ts`   |      386 |       56 | `e890ae47cfa6bda7354ea4f040fe36b8d0074985f60ea2a875f93cd9a8afc47f` |
| `m3.ts`   |      177 |       22 | `3135bbd6dc86b8608d04f28a7515dd924ebe203f9b2fb454236f4fa2354b34cc` |

`canonical-conservation.json` in the private evidence directory includes both baseline/current Git blob IDs. `git diff 52f4ef4b6 -- src/lib/concept-blank/bank src/lib/textbook/conceptRows.ts src/contracts src/lib/textbook/scripts` is empty at the reviewed checkpoint. The worker introduces no schema version, DB kind or writer change: exchange.v1, renderer.v5, editorial.v2, six DB kinds and default writer false remain intact. Existing standard chunk bounds (four sections / 300 raw blocks), raw renderer bounds (eight sections / 600 projected blocks) and 32-page ceiling are retained.

## Tests and actual export evidence

Final targeted run: **17/17 passed** — 15 conservation/scaffold tests and two opt-in real-renderer tests. Scoped ESLint: **zero errors / zero warnings**. The tests cover complete canonical-row conservation, all target toggle masks and all other toggles, memory immutability, original/source/legacy exclusion, safe math and escaping, and ordered map grouping at term counts 1, 2, 3, 4, 5, 8, 9 and 17. The latter produces multiple bounded four-slot groups without dropping or duplicating terms.

Real export command (PowerShell, from this worktree):

```powershell
$env:TEXTBOOK_BANK_ACTIVITY_PDF_QA = '1'
$env:TEXTBOOK_BANK_ACTIVITY_EVIDENCE_DIR = 'C:\Users\user\Downloads\교재_복구_실행검증_20261005\bank-activity-scaffolds-final-30760a7fd'
npx vitest run src/__tests__/unit/textbookBankActivityScaffolds.integration.test.ts src/__tests__/unit/textbookBankActivityScaffolds.test.ts
```

The integration test uses `renderTextbookChunk` and `launchExportBrowser`, the existing synthetic fixture helper, actual canonical bank terms and local production fonts. It does not use operational DB rows. Three activities are selected independently; the other 25 toggles are false. Each synthetic book has one section, **seven manuscript blocks** (two recall, three oral, two map), **ten projected blocks**, **one bounded chunk**, and **seven PDF pages per variant**. Every page contains an activity. Each variant contains 84 bank writing rules, two four-slot map groups, all five canonical terms in each activity, and zero measured map-card child clips. PDF page count agrees with the renderer; the exchange is byte-equivalent under canonical serialization before/after export. Answer variants retain blank open activities and introduce no answer text.

| Synthetic canonical section                       | Terms | Canonical row SHA256                                               |
| ------------------------------------------------- | ----: | ------------------------------------------------------------------ |
| E3 `초3::1-6 분수와 소수::1-6-2 분수 알아보기(1)` |     5 | `d97c2ce851e3a112bb59a4c639e40a0ea222789da38873296864f18c11a49bd5` |
| M2 `중2::1. 수와 식::순환소수`                    |     5 | `8e0d1064b31340ebb81614d4c8787e3e2713e106346dcb7aea01b199e6e3d74d` |

Authoritative final evidence directory:

`C:/Users/user/Downloads/교재_복구_실행검증_20261005/bank-activity-scaffolds-final-30760a7fd`

| Exact final PDF  | Pages | PDF SHA256                                                         |
| ---------------- | ----: | ------------------------------------------------------------------ |
| `E3-student.pdf` |     7 | `311a8c513bd5b607b6f7755b4048a5dfcb1f94a82ef581f9bb040373ebe98547` |
| `E3-answers.pdf` |     7 | `f50436d8e53493de9eba68d15eff99667470aeee68a84ae3ae566b39ed987386` |
| `M2-student.pdf` |     7 | `1eb95f15e52932eb90b0c6e76187a7e1c84389655ccb6bcea46d9eb26eb6c88b` |
| `M2-answers.pdf` |     7 | `46cd29ce7024ce29f90e1a30702ad3d0d63ff98e5e35e6fec511905b8a75f7f9` |

The directory retains fixtures, rendered HTML, geometry JSON, per-grade manifests, source hashes, conservation script/JSON and the PDF raster script. `visual-manifest.json` records each exact PDF/PNG hash, page size and raster engine; its SHA256 is `00f1c65c19eb1bce4f5c306af8653002b8dd6cb8304fe868948ddc678d5859c4`. Initial pre-correction evidence is retained separately in `bank-activity-scaffolds-619085870`; none of its PDF hashes is used as the final acceptance result.

Full local TypeScript verification is **not claimed passed**: the default-heap run exhausted memory; the larger-heap run reported one synthetic fixture `sectionStart="continue"` assignment incompatible with the existing contract, which was removed before final export. Root explicitly owns the final whole-repository TypeScript run and asked this worker to avoid duplicating it. The completed targeted checks and real export are the local acceptance evidence.

## Original reference and visual review

Supplied original `C:/Users/user/Downloads/인재원_수학_2-1-1_수와식_학생용.pdf`: 259 physical pages; SHA256 `6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0`. Original full pages **21, 40 and 41** were individually viewed, and the supplied original DOM/CSS was read for those activity structures. Source ZIP SHA256: `8d286fb7250588a705dcf16e4b2dd157d394f1119914a314ce5adfa2f9246b1a`; pinned source manuscript SHA256: `520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb`.

Because Poppler was unavailable in the inspected environment, the installed PyMuPDF/MuPDF 1.28.2 rasterizer was used transparently. Each final PDF page was rendered as a separate **180 DPI RGB whole-page PNG, 1488 × 2105**, without enhancement or text replacement. Every one of the **28 final pages** was individually opened with `view_image(detail="original")`, including margins/footer; contact sheets, text extraction and geometry were not substituted for full-page visual inspection. Selected original full-page images were the existing exact-reference PNGs from the E3 review evidence. No full 259-page original re-review is claimed.

The ledger below is **AI visual review, 28/28 final pages**. **Human review: zero pages in this worker task.** `PASS` means the assigned scaffold is complete and no visible clipping, overlap or missing field was found; it is not mathematical editorial sign-off, a pixel-coordinate fidelity certificate or physical-print approval.

| Final full-page PNG individually viewed | Activity / canonical group                       | Visual result                                                      |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| `E3-student-p001.png`                   | Free recall, rows 1–4                            | PASS: canvas, cue, watermark and all checks/field                  |
| `E3-student-p002.png`                   | Free recall, row 5 continuation                  | PASS: same scaffold; continuation retained                         |
| `E3-student-p003.png`                   | Oral explanation, terms 1–2                      | PASS: three steps, both listener panels, matrix and repair         |
| `E3-student-p004.png`                   | Oral explanation, terms 3–4                      | PASS: both canonical labels and complete scaffold                  |
| `E3-student-p005.png`                   | Oral explanation, term 5                         | PASS: complete single-term scaffold; intentional whitespace        |
| `E3-student-p006.png`                   | Map, terms 1–4                                   | PASS: four connected cards, center, response/check area            |
| `E3-student-p007.png`                   | Map, term 5 / three writable empty slots         | PASS: fifth term conserved; no fabricated terms                    |
| `E3-answers-p001.png`                   | Free recall, rows 1–4                            | PASS: all fields retained, no invented answer                      |
| `E3-answers-p002.png`                   | Free recall, row 5 continuation                  | PASS: complete canvas/check scaffold                               |
| `E3-answers-p003.png`                   | Oral explanation, terms 1–2                      | PASS: complete workflow/listener/matrix/repair                     |
| `E3-answers-p004.png`                   | Oral explanation, terms 3–4                      | PASS: complete scaffold, labels fit                                |
| `E3-answers-p005.png`                   | Oral explanation, term 5                         | PASS: complete scaffold, no answer substitution                    |
| `E3-answers-p006.png`                   | Map, terms 1–4                                   | PASS: four connected cards and response/checks                     |
| `E3-answers-p007.png`                   | Map, term 5 / three empty slots                  | PASS: fifth term and blank slots retained                          |
| `M2-student-p001.png`                   | Free recall, rows 1–4                            | PASS: rounded canvas and all footer fields                         |
| `M2-student-p002.png`                   | Free recall, row 5 continuation                  | PASS: complete continuation scaffold                               |
| `M2-student-p003.png`                   | Oral explanation, terms 1–2                      | PASS: complete workflow/listener/matrix/repair                     |
| `M2-student-p004.png`                   | Oral explanation, terms 3–4                      | PASS: longer labels fit; no missing panels                         |
| `M2-student-p005.png`                   | Oral explanation, term 5 with inline math        | PASS: safe math label and full scaffold                            |
| `M2-student-p006.png`                   | Map, terms 1–4                                   | PASS: long fourth label fits; four cards connected                 |
| `M2-student-p007.png`                   | Map, term 5 with inline math / three empty slots | PASS: corrected inline-math text spacing; full response/check area |
| `M2-answers-p001.png`                   | Free recall, rows 1–4                            | PASS: complete blank canvas and checks                             |
| `M2-answers-p002.png`                   | Free recall, row 5 continuation                  | PASS: full continuation and footer fields                          |
| `M2-answers-p003.png`                   | Oral explanation, terms 1–2                      | PASS: complete workflow and self/listener check matrix             |
| `M2-answers-p004.png`                   | Oral explanation, terms 3–4                      | PASS: both labels and listener panels fit                          |
| `M2-answers-p005.png`                   | Oral explanation, term 5 with inline math        | PASS: label, matrix and repair retained                            |
| `M2-answers-p006.png`                   | Map, terms 1–4                                   | PASS: four connected cards and full check area                     |
| `M2-answers-p007.png`                   | Map, term 5 with inline math / three empty slots | PASS: corrected math spacing, fifth term retained                  |

The free-recall page now addresses F04's missing framed canvas/check fields; the oral pages address F05's absent workflow/listener/matrix/repair; the map pages address F06's missing connected-card/central-node/check scaffold. Root's complete bank regression, human mathematical review and an actual-size print remain separate release work. No runtime AI generation or TypeSafe judgment was introduced; all grouping, labels and definition payloads are deterministic existing code/content.
