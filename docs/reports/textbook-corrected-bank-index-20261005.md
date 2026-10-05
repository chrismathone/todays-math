# Corrected bank concept-index evidence — 2026-10-05

Final strict verification **passed all 14 combinations and all 28 PDFs: 1,308 pages, zero issues**, using coordinator-approved QA commit `dc46949944359006ac1438c05eb90693f3862e02`. All 1,420 frozen PDF, witness, image, equality and AI-review records retained their exact hashes before and after verification. The original baseline remains FAILED.

The narrow harness is `scripts/qa/textbook/recovery/refinalize-bank.ts`. It reads saved, completed automatic-writer exports and produces fresh private evidence on D:. It never creates books, opens a database, reserves new pages, mutates exchanges, or changes the original FAILED verdict.

The immutable baseline is `D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1`, rendered at `07fee6f6039220443f0aab58058b9d949f835cce`. The feasibility manifest SHA256 is `5fd7c112714a311d4a84f07d888f706b320caeb8945383c6c14cf9ab7921a7b7`. The original full14 writer has now settled; its completion manifest is separate from this correction.

The initial E3/M2 correction froze product integration `7ec616ea17af4ac934b5dba97d6d567ed85ece8d`, containing fix `578b3d584`. Its fresh output is `D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-7ec616ea-E3M2-20261005-attempt1`. Corrected QA acceptance must use coordinator-approved `4a60bd30049c1066a07e9a2f7decbfb6aca7676f`, integrated at `36ba3bc4391fe9ed41058f3cafefef2f02cff1f5`; initial witnesses are not strict acceptance.

The harness discovers chunks containing actual projected `conceptIndex` reference nodes. It calls production `renderTextbookChunk` only for those final chunks, using the exact old publisher plan, all reserved pages for that variant, the affected chunk's reserved pages, and the old student final placements for answers. Both the production guard and the harness compare page identity, block/item identity, columns, and all four dimensions within 0.01 mm against reserve and original final layouts. All other final PDF, HTML and placement files, original exchange/assets/reservation, and reserve evidence are copied with recorded hashes; losslessly archived HTML is decoded and checked by the existing helper. Fresh merged PDFs have explicit mixed-origin provenance.

Fresh witnesses cover every page, using the existing DOM extractor and coverage helpers. A second verification invocation requires the coordinator's exact QA commit, checks the current helper hashes and frozen production hashes, recaptures all pages, and runs the strict geometry, reserve/final and printed-reference oracle. Old verdicts and witnesses remain intact.

Every old and corrected merged PDF page is regenerated at PNG scale 1.5. Untouched pages must match both PNG bytes and pixel samples exactly. Prior AI findings are copied into bindings only when their stored PNG hashes equal both old and corrected regeneration; unmatched notes remain unbound. Every changed index image requires fresh individual AI reading. These records do not establish human or physical-print approval.

Initial target proof:

| Combination | Affected chunk | Corrected concept destinations                                           | Image change                    |
| ----------- | -------------: | ------------------------------------------------------------------------ | ------------------------------- |
| 초3-1       |             18 | All three entries: 11 → 12                                               | Student and answer page 29 only |
| 중2-1       |             35 | Unit 01 c1–c5: 18 → 19, c6: 18 → 20; unit 02 c1–c4: 53 → 54, c5: 53 → 55 | Student page 72; answer page 74 |

E3 student and answer page 29 were individually AI-read: all three printed destination 12 labels, headings, and row texts are readable and aligned without visible clipping or overlap. M2 student page 72 and answer page 74 were individually AI-read: all eleven rows and destination 19/20/54/55 labels are readable and aligned without observed clipping or overlap. Fresh notes bind their PNG and corrected PDF hashes in each `*-changed-index-ai-review.json`.

All 58 unchanged E3 pages have prior individual AI findings bound by exact PNG equality. The supplemental M2 `root-prior-review-bindings.json` binds 146 unchanged individual findings from root's sealed 148-page receipt, SHA256 `08f8c444e87746940401a21f9eddcb53b207c1e6e9b470dd838c347fac7079db`. It checks each old stored PNG SHA against both old and corrected regeneration and retains root's findings, including cosmetic portrait hairlines. The two changed M2 indexes receive fresh findings instead.

E3/M2 strict verification passed across all 208 pages with zero issues, using integrated QA tree `36ba3bc4391fe9ed41058f3cafefef2f02cff1f5`. `strict-QA-authority.json` and `automatic-verification.json` in the E3/M2 output record the exact accepted scope. All 204 unchanged pages retain their verified prior individual AI findings; four index pages have fresh AI notes.

Checks so far: scoped TypeScript program and all imported dependencies reported zero diagnostics; ESLint passed. An initial pre-render freeze assertion exposed CRLF/LF differences between executed Windows files and normalized Git blobs; the consistency comparison now normalizes line endings while the authority still records raw executed-byte SHA256. The failure was reported promptly and occurred before any render or old evidence mutation.

The first strict preflight pinned the peer leaf `4a60bd3` and correctly refused the merged DOM-helper hash: root's integrated tree also contains earlier source-QA additions. The rerun pinned coordinator-provided `36ba3bc4`, which contains the accepted peer QA, and passed. No helper was changed to satisfy that guard.

All 14 saved combinations have now completed correction: 28 fresh merged PDFs, 1,308 pages, 28 rerendered index-containing chunks, exactly 28 changed index PNGs, and 1,280 identical untouched-page PNGs. The second output root is `D:/교재_복구_실행검증_20261005/automatic/runs/corrected-index-36ba3bc4-other12-20261005-attempt1`, frozen at integrated product/QA tree `36ba3bc4`. The executed harness SHA256 is `3e8588dc735e544b267cbdd00938aa23c97df05067c53ef3dbe43427c500f351`.

The supplemental copied-byte audit passed all 3,144 recorded files, totaling 10,447,017,822 bytes. It independently reread the original bytes (or decoded archived HTML), corrected copies, expected sizes, and every recorded SHA256. `other12/copy-preservation-audit.private.json` has SHA256 `eb92b85e42ae1dcc735c13f46ca937a7f5224488c01b712442c7e8e68a450e3b`.

All 28 changed full-page images were individually AI-read. The records preserve 276 original AI findings through exact PNG equality: E3's 58 unchanged pages, root's 146 unchanged M2 pages, and three original samples for each of the other 24 variants. Together with the 28 fresh index readings this covers 304 individually reviewed pages; the other 1,004 pages have deterministic image equality without a claim of individual AI reading. M3-2 student page 44 has tight spacing between its long seventh label and destination 13; the label and number remain readable. This was recorded as a cosmetic observation.

Root separately inspected the two fresh M2 index images. The supplemental receipt `E3M2run/중2-1/root-corrected-two-index-page-review-20261005.json`, SHA256 `24cde6ee22e82b933314224a5f3d6b8dde76406c28c3740978aa2c18f86b0772`, confirms the eleven readable destination labels. These are repeat independent readings of two already counted pages, not additional unique pages.

Initial strict QA passed 22 variants and failed six variants in three pairs. The failures were unsupported label notation: M2-2 had four `\\mathrm` labels, M3-1 had six quadratic-expression labels with superscripts, and M3-2 had one `\\sin`/`\\cos`/`\\tan` label, in both variants. The earlier oracle compared literal source math with rendered math and ordered raised exponent glyphs before prose. There were no destination, reserve-layout, answer-reference, or geometry failures. A separately owned QA correction added supported notation and checked raised-glyph placement without changing product content. Root independently accepted it at `dc4694994`; all 28 variants now pass the same updated strict oracle. The initial failures remain preserved.

The complete initial strict results are preserved in `other12/qa-attempts/36ba3bc4-initial-label-limit`. `other12/corrected-all14-artifacts-initial-strict.private.json`, SHA256 `d38c85a24da4f86bbbc86329bbdb33ae1fe2d544804e844ed3478adf427e8747`, records all 28 exact PDF hashes, witness/image/review hashes, destinations, and statuses. `other12/label-oracle-failure-handoff.private.json`, SHA256 `bed7766878fef528e5b73ff1bc04c855246032315932682c149835a6d04ae5ea`, contains the 11 unsupported labels and 22 variant cases. No product rerender is required for that QA correction.

The final pass invoked `verify_exports.py` directly over both saved output roots with the same accepted Python helper hashes. It preserved DOM capture provenance at `36ba3bc4` and performed no renderer execution, DOM recapture, or regeneration of the full 1,308-page review image collection. The existing verifier re-emitted its routine sampled PNGs while writing fresh verdict JSON. The original E3/M2 successes are also archived under `E3M2run/qa-attempts/36ba3bc4-initial-passed`.

Final durable receipts in the other12 output root:

- `corrected-all14-verification.private.json`: SHA256 `6d7f644e1b6ac0c83d73af8dcad69005985bbfb48f6101e2e1000e80898c02a4`.
- `strict-QA-authority-dc4694994.private.json`: SHA256 `2709d5e7e485775ef50cd4b3db00d7b562aa33de00ab02aed6ee38b21a0e6859`.
- `final-strict-run-freeze.private.json`: SHA256 `349d0ac687a7ff4cfa8e619ba28de14a923da5b72b1cdec45ac8feb691a4676f`.

There are no remaining correction-worker dependencies. Scoped TypeScript, ESLint and formatting checks passed; the code hash remained unchanged throughout correction and final verification.

Root owns main integration, build and deployment. Human review, complete mathematical editorial approval, phone scanning and physical printing remain outside this evidence's claims. The immutable baseline remains FAILED.

All corrected PDF hashes (student and answer files are in their corresponding output root):

| Combination | Pages S/A | Chunk | Changed pages S/A | Initial strict | Final strict | Student PDF SHA256                                                 | Answers PDF SHA256                                                 |
| ----------- | --------- | ----: | ----------------- | -------------- | ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 초3-1        | 30/30     |    18 | 29/29             | passed         | passed       | `f08e64fc98f644f55bf9eb454f9482edffb3ae7889d9f521e5c2c187a37b2cad` | `5e9ed1740bae58215ae6e48db655832933afe9a0ef5dd9614c48e5bffe942d99` |
| 초3-2        | 64/69     |    21 | 63/68             | passed         | passed       | `415180f617421599802ca0657fdfc48a4dbc3432d1b48abed279c9c66873597f` | `38b80330d60d36dc4ca84747ced48f8d85360028ef0f0d6ce99ed882f1d6b842` |
| 초4-1        | 27/27     |     3 | 26/26             | passed         | passed       | `ef809d890887378736b296171909b05053dca6536c80a75e36f86050e39c9c16` | `bd5081d5e02132bb5351ec53a6df8e3f4959631558ab88dbb826c0adc37a3997` |
| 초4-2        | 29/28     |     3 | 28/27             | passed         | passed       | `d6cd304a022919bd1034a2317641d85449d9da444b2364c08eef8402a54ccefb` | `4e06b727fd7f5364adc0877bb69dc6c214186a64f8c5074da23486f956d7b73a` |
| 초5-1        | 58/60     |     6 | 57/59             | passed         | passed       | `5a989af56aff563d37eb1b2bef616888fb61504e42546a8ace57fc4cc65f9d1c` | `ea9830205debd0271407f89ba0bd313f7cd7383bc0b1e8722e40ae60b9b763e5` |
| 초5-2        | 28/28     |    17 | 27/27             | passed         | passed       | `b73f3706745e89c8687a053cfc3a64389ad863e79171896645b9890d8799a9a0` | `91f3276fbcb0070f75ae6553f5bbae5ba1e03215ed6cc92a1e157db67534a801` |
| 초6-1        | 45/47     |    18 | 44/46             | passed         | passed       | `5d97da807436dbeafa60b73e3f84812c818f7ab1b84e19c665f7d516347b3cb6` | `7a6c7399b9acc867289ff773110605a4176a8ea159be285b249f88f6d23d6505` |
| 초6-2        | 65/67     |    20 | 64/66             | passed         | passed       | `67f70ed64b3a9fb59f91c72aedc1170b11ad79045b2a9ef9c36a54b973c2908f` | `0978af44cdbcfed3b690161b5f422ee976395c90179573402288fbc415732708` |
| 중1-1        | 38/40     |    21 | 37/39             | passed         | passed       | `ec769d4f7b5143e5ad2c150fcdc4343fe1dab1fd1498b9bde172acb3987f659c` | `5e8cb35b6394780cc274242de47cf3e465b2fcdef9b8dd8b31e481f24fe40c8b` |
| 중1-2        | 33/37     |    17 | 32/36             | passed         | passed       | `d1cfea630efe0d1e6d96fc330f3deba9fe3aba502b201eac21f57e2ba0ad7442` | `68020d31aa1f01ff9af9e1bcd2ed72898f38d3a2f8082c49939dd52f884299bd` |
| 중2-1        | 73/75     |    35 | 72/74             | passed         | passed       | `60c5cd08705e30a4cd68e82f6214e918cd7073e24c5da4ad01d14938be89ca1f` | `f6638591063feb7594932628e44847fef8ed6d0625a12971451d4aa3fdfae5e5` |
| 중2-2        | 46/49     |    20 | 45/48             | failed         | passed       | `19a82c6941b6e9192572670e6c8d2dc6e5fc7d28e844f9816b421a75f24af7d6` | `e666dd3eb0506793993b3397acc91af510fe44ef467dfa1ac7b91a273be759f2` |
| 중3-1        | 61/57     |    20 | 60/56             | failed         | passed       | `ef36dc06c18f781b89c131b2bc136197623786f51ba966af5f0d2fce3ecb289d` | `8f576a775dd84b547169949c50b1b488efee61c74d49a41c2103debdfcb0720a` |
| 중3-2        | 45/52     |    20 | 44/51             | failed         | passed       | `a05212fc3bb1e402cdf68a7a0f946dc48ce2c6d12814d562287707144811235c` | `ab1627b2b7fee031d42304661e41a9031b86db45c9b804be95cd646fe8cb031b` |
