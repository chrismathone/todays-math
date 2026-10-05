# Frozen actual-bank two-phase textbook QA — 2026-10-05

**Acceptance: FAILED.** All 14 grade/semester pairs completed with 28 PDFs, but every student and answer variant fails the unchanged strict oracle. There are 642 student pages and 666 answer pages (1,308 total); the driver completed with exit 0 and no raw export failure. No failed result was retried or relabeled as passed.

This report owns the original frozen baseline only. The coordinator assigned corrected-index rerendering and its report to a separate worker after this attempt exposed failures. Later product fixes and separate source-final QA do not change this attempt’s verdict.

## Frozen authority, input and boundaries

- Exact renderer/source checkout: `07fee6f6039220443f0aab58058b9d949f835cce`; fast-forwarded only after coordinator freeze message `msg_a951d7c0d630` at 2026-10-05T04:59:10Z.
- Fresh run tag: `final-07fee6f60392-20261005-045910-attempt1`; started 2026-10-05T05:00:31.395992+00:00 and driver finished 2026-10-05T06:19:00.9443803Z.
- Immutable copied fixture: [real-bank-fixtures.private.json](<D:/교재_복구_실행검증_20261005/automatic/real-bank-fixtures.private.json>), SHA256 `f316e89c0f59f8a8dbaad8277407da2162e31734fbf291d37937f5e25649b684`, 2,523,278 bytes. Independently verified before exports and again after all 14.
- Inventory: 660 distinct actual-bank IDs across 22 selected units and 14 combinations; captured 2026-10-04T20:09:56.904Z with transactionReadOnly=on. All IDs, unit ranges and engine-family peers are recorded in [fixture-inventory.json](<D:/교재_복구_실행검증_20261005/automatic/preflight-20261005-ae5c476-20261005042712310/fixture-inventory.json>), SHA256 `13e86bc642ccf869f3fec40514b70982cb66ccb142c08bef125d7ee12df49f99`.
- Output root `D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1` is on D:, outside every registered Git worktree independently inventoried at preflight.
- Existing QA scripts were executed as read-only tools. No product code, fixture, count/selection rules, cast, activity toggles, oracle, fonts, shared node_modules, environment values or old artifacts were changed by this worker. The freeze legitimately brought coordinator changes into these tool files; final working hashes are pinned below.
- Only isolated PGlite reservation/rendering used the authorized origin `https://today.aywa.co.kr`. Figure-CDN configuration came from `C:/Creative/testautocreator` without exposing environment values. Generated QR URLs were not followed; no production DB/write, Prisma command, setup, deployment, push or additional agent was used.

The project TypeSafe skill and [live TypeSafe documentation](https://docs.typesafe.ai/llms.txt) were consulted for judgment boundaries. No TypeSafe/Jev API call or integration change was made; counts, hash identity, placement comparisons and reference checks remained deterministic.

## Execution and whole-page verification

The unchanged driver created each book from actual frozen bank rows in an isolated PGlite database, called reservePublish, reserved every bounded chunk of a variant, supplied the complete reserved global page map and each chunk’s reservedPages to final publish rendering, and supplied studentPages to the answer variant. It merged final chunk PDFs and recaptured the final HTML DOM. Reservation/final hashes and placement comparisons pass for all 506 chunk pairs (1,012 individual chunk renders); final layout matches reserved layout in all 28 variants.

Configured bounds stayed 4 raw sections / 300 raw manuscript blocks / 32 pages per chunk / 128 MiB merge bound. Observed maxima were 4 raw sections, 28 raw blocks and 20 pages per chunk. [bounded-render-and-review-counts.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/bounded-render-and-review-counts.json>) records the counts (SHA256 `db20cc702f1eee9bd46c0be23ca7da18555289bd0491a119890c70f2310af293`).

All 28 PDFs were checked once after their pair settled. Each scoped verifier run’s top-level output was immediately copied to a uniquely named immutable batch JSON (12 batch snapshots); old per-pair PDF/HTML/witness/geometry evidence was preserved. The verifier’s process exit 0 does not imply a pass; this report uses each verification-summary.json verdict.

| Check | Result | Exact baseline scope |
| --- | --- | --- |
| Complete student/answer pairs | PASS | 14/14 pairs, 28/28 PDFs, 1,308 pages |
| Reserve/final references and layout identity | PASS | 506 chunk pairs; no phase-verification issues |
| Strict whole-PDF acceptance | FAILED | All 28 variants; row coverage and index-label failures retained |
| Geometry/content checks outside reported strict failures | No additional issue reported | Every page; no geometry, clipping, required font, typed visibility, figure or answer-reference issue code reported |
| Printed TOC/concept/type numbers vs reserved map | PASS numerically | 922/922 numeric positions: TOC 626, concept 204, type 92 |
| Printed index labels | FAILED | 882/922; 40 DOM-label and 40 printed-label issues |
| Concept-index semantic definition destination | FAILED | Supplementary exact-concept-ID check: 0/204 point to actual definition-card pages |
| Answer-to-student references | PASS | 281/281 actual answer item references and printed labels |
| Frozen actual bank content/configuration | PASS identity | 281 selected source snapshots; 0 field/config identity issues |
| Worker AI visual review | Complete assigned scope | E3-1 all 60 pages; three individual actual-PDF PNGs per variant for remaining 12 pairs, 72 pages |
| Coordinator M2-1 full AI review | Receipt below | Separate root-owned 73 student + 75 answer page review |
| Human editorial / physical print / production operation | Not performed | No approval claim |

Whole-page checks counted 76,116 text spans, 4,138 figures, 15,241 clip nodes, 6,236 anchors, 5,251 semantic nodes, 1,822 writing boxes, 3,038 dialogue-font spans, 1,264 row nodes and 582 QR nodes. These are checked objects, not distinct source questions or pages visually read.

| Pair | Fixture rows / requested ceiling | Actual selected items | Pages S/A | Issues per variant | Index expected / numeric / labels per variant | Answer refs | Verdict |
| --- | ---: | ---: | --- | ---: | --- | ---: | --- |
| E3-1 | 30 | 11 | 30/30 | 5 | 28/28/28 | 11 | FAILED |
| E3-2 | 90 | 24 | 64/69 | 11 | 42/42/42 | 24 | FAILED |
| E4-1 | 30 | 9 | 27/27 | 6 | 12/12/11 | 9 | FAILED |
| E4-2 | 30 | 11 | 29/28 | 4 | 12/12/12 | 11 | FAILED |
| E5-1 | 90 | 18 | 58/60 | 10 | 26/26/26 | 18 | FAILED |
| E5-2 | 30 | 9 | 28/28 | 9 | 27/27/25 | 9 | FAILED |
| E6-1 | 60 | 12 | 45/47 | 11 | 35/35/34 | 12 | FAILED |
| E6-2 | 90 | 24 | 65/67 | 14 | 42/42/41 | 24 | FAILED |
| M1-1 | 30 | 28 | 38/40 | 12 | 38/38/37 | 28 | FAILED |
| M1-2 | 30 | 11 | 33/37 | 8 | 30/30/30 | 11 | FAILED |
| M2-1 | 60 | 41 | 73/75 | 17 | 55/55/53 | 41 | FAILED |
| M2-2 | 30 | 25 | 46/49 | 19 | 36/36/32 | 25 | FAILED |
| M3-1 | 30 | 30 | 61/57 | 32 | 43/43/36 | 30 | FAILED |
| M3-2 | 30 | 28 | 45/52 | 12 | 35/35/34 | 28 | FAILED |

## Preserved failures and actual content

Strict failures total 340 issue records: WITNESS_COVERAGE_REQUIRED 28, ROW_DUPLICATE 204, ROW_KEYS 28, INDEX_DOM_LABEL 40 and INDEX_PRINTED_LABEL 40. Every variant’s rows coverage flag is false; anchors, writing boxes, QR, nodes and clip coverage flags are true. No coverage requirement, duplicate-key rule, label oracle or tolerance was relaxed.

E3-1 makes the row mismatch concrete: definition rows occur in the concept cards (p12), explanation activity (p19–20) and concept map (p21) with repeated unphased definition keys, while the expected row inventory omits the latter activities. [초3-1/row-population-diagnostic.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/초3-1/row-population-diagnostic.json>) pins the exact keys/placements, SHA256 `6f8a104429fa2d4f2c76e6a65fb817ff46ec31c9b1b04f6ae0f53eead836e068`. This is a diagnostic, not permission to alter the witness/oracle or treat the row failures as passed.

The original concept index targets the early error-check section: E3-1’s three entries print page 11, while their definition cards are on page 12. [concept-index-target-diagnostic-all14.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/concept-index-target-diagnostic-all14.json>) checks every exact concept ID and actual definition-card page, SHA256 `06b0d73a3460719cafce56bd79d6ac7b24afd32348b61284196983d240a3cf07`. The saved entries use targetUnitKey + targetSectionKey and key=concept ID; they lack targetConceptId. Thus numeric agreement with that stale section map is insufficient semantic evidence. The coordinator was alerted and separately owns fixes/rerendering.

Some label failures involve math embedded in a concept label (for M2-1, $10$ and $n$). An extraction/classification explanation remains possible, but the strict FAILED outcome is preserved. All issue objects, exact row keys, labels and reference counts are retained in the all14 manifest and each per-pair verification-summary.json. The [all14-printed-index-reference-ledger.private.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/all14-printed-index-reference-ledger.private.json>), SHA256 `7d8d354489a48bd686d5416cbfa261da20df27227d36570379c3daaac7f32810`, records all 922 checked printed positions with exact TOC/concept/type keys, containing PDF pages and verified target labels.

The driver selected 281 immutable real-bank items out of the 660-row fixture under unchanged standard difficulty, maximum 30 items per unit, includeConcepts=true and all 28 component flags=true. Cast remained teacher-f2 / student-f5 / student-m4. Thirteen pairs have fewer selected items than their requested maximum; M3-1 alone reaches 30/30. Existing shortage warnings were recorded rather than padded with synthetic items. Selection shortages are independent of the strict renderer failures.

The fixture has 226 fraction-bearing rows, 208 figure-bearing rows, two descriptive rows (both M1-1) and no long-written rows. Selected snapshots contain 116 fraction-bearing, 114 figure-bearing and two descriptive items, with zero non-bank snapshots. A selected figure-free pair is not figure coverage; no long-essay verification is claimed.

| Pair | Fixture fraction / figure / descriptive / long | Selected fraction / figure / descriptive | Representative real selected problem ID |
| --- | --- | --- | --- |
| E3-1 | 5/26/0/0 | 5/9/0 | `d4d5997d-8c18-4cd5-a880-53364d99c4d5` |
| E3-2 | 13/30/0/0 | 2/6/0 | `8fc2d9b5-4249-4add-b24e-1232e8dd2f50` |
| E4-1 | 0/5/0/0 | 0/5/0 | `6c363e82-aa61-48fb-bc1e-6ffed9954099` |
| E4-2 | 30/5/0/0 | 11/5/0 | `021c4b56-ee7e-40c3-8a08-41f6dc9e6fe8` |
| E5-1 | 30/28/0/0 | 6/4/0 | `c2f330ef-20e7-437f-8b5e-af7ef9bbc7ca` |
| E5-2 | 30/5/0/0 | 9/5/0 | `8309cfab-c4b6-4141-bef6-d3095930ac9d` |
| E6-1 | 30/26/0/0 | 6/4/0 | `3bb389f8-4b37-4272-a888-9e5185d3b165` |
| E6-2 | 5/9/0/0 | 5/9/0 | `920a73f6-925c-4496-9fdc-42b2c358df53` |
| M1-1 | 5/0/2/0 | 5/0/2 | `b2dd5ff2-7cb0-444f-ab40-b49b5f7e99f0` |
| M1-2 | 5/16/0/0 | 0/11/0 | `a87569fa-c8a3-4b69-a73a-7002fc936b65` |
| M2-1 | 39/0/0/0 | 39/0/0 | `03ea7776-4435-4a64-81de-00f6ea11634f` |
| M2-2 | 5/25/0/0 | 0/25/0 | `7996a81b-f89d-4882-a97e-8b3b00696100` |
| M3-1 | 12/5/0/0 | 12/5/0 | `1de0afbc-8712-4544-8124-4f2c1b5264a7` |
| M3-2 | 17/28/0/0 | 16/26/0 | `3c7f18dc-1271-421e-aa36-dfb6b015d49e` |

Complete selected IDs, bank book/edition/request IDs and start/end unit IDs are in [final-all14-verification.private.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/final-all14-verification.private.json>) (SHA256 `4cbc7cdb6e83cb16c0f7763b88041838ee3726e36e6d8754bb3eef575574fedb`). [immutable-bank-contract-audit-all14.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/immutable-bank-contract-audit-all14.json>) (SHA256 `8455ba4c00ce3175f242e34452dc18c5c398cc6bd5b8a2fbbd8659d2acb51423`) compares content, answer, solution, questionType, unit/family/difficulty/type/code identity and configuration for all 281 snapshots. Figure URLs/dimensions/source dimensions/choice figure indices were also asserted by the unchanged driver. These identity checks preserve bank data; they do not certify all mathematics or editorial suitability.

## Actual PNG AI reading and verification roles

Exactly 280 actual-PDF page PNGs were generated: E3-1 60, root-assigned M2-1 148, and 72 required samples for the other 12 pairs. They use PyMuPDF at scale 1.5 (893×1,263 pixels); each PNG manifest binds its page number, printed label, SHA256 and exact parent PDF SHA256. Source figure assets and DOM screenshots are not counted as actual-PDF page PNGs.

E3-1 student p1–30 and answers p1–30 were each individually shown to this Codex worker. No visible clipping or problem/answer overflow was found; the concept-index p29 destination discrepancy is a semantic concern and keeps the review from providing acceptance. A small red line above the final boy portrait on p9 was recorded as cosmetic. All 11 answer references passed printed checks. Student PNG manifest SHA256 `90d54d3f86edcd9e5f182fb461d78f9a192136462e7f604f664bc1164a735bc0`; answer manifest `3cc57e8e4a3867467fa5ba1c0a56c6adda3097fbd26b8b2ef5c28dc0a99615e2`; individual-page AI notes `d9516141137df0b9216bc33e1681a9585c8c7da8a0f0c0d164845d62b38fabc4` / `00d252b33344aa8fea8747a074b273813e0689ea5582c54418bdea15fea85f08` under [E3-1 evidence directory](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/초3-1/ai-review-pages>).

The coordinator independently inspected every M2-1 student p1–73 and answer p1–75 PNG. Its sealed [root-individual-all-pages-review.final.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/중2-1/ai-review-pages/root-individual-all-pages-review.final.json>), SHA256 `08f8c444e87746940401a21f9eddcb53b207c1e6e9b470dd838c347fac7079db`, binds all 148 images, both exact PDF/witness hashes and the request SHA256 `4e310ecb71f9e2804c78bde71f4d7f5f0207732ef91048efaf6efe7e9c7edfaa`. This worker verified those bytes and exact nonduplicated page coverage in [root-m2-full-review-receipt-validation.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/root-m2-full-review-receipt-validation.json>), SHA256 `da2b76f555fab2f669a242841fe2fada831567cc1b42037ea9eaf83cb965a78d`; this is accepted root AI reading, not a second M2 visual review attributed to this worker. Student PNG manifest SHA256 `49c713acf037cd88650357847544b08243c3119c6a1ac3ea77f06742585d5d5f`; answer manifest `26fc4bcc8f22281fccbfe7c3ecace0059944828a914557fb52c97c00e1ade1a7`.

Root reported no observed text clipping/overlap. The concept index is visibly wrong on student p72 and answer p74: targets 18/53 instead of the cited definition pages 19–20/54–55. Decorative portrait hairlines were recorded on student p49 and answers p14/p47/p49/p50 as cosmetic. The root receipt retains FAILED and explicitly excludes physical print, phone scanning, human mathematics and complete editorial approval. Total individual AI coverage is therefore 280 actual-PDF pages: worker 132 + root 148; all-page visual coverage applies only to E3-1 and M2-1.

For each remaining pair, this worker individually viewed the cover, first curricular unit-intro page after front matter, and first page containing an actual bank question, in both variants. No visible layout defect was found in these 72 required sampled pages. The samples include source fraction notation, figures/tables/angle labels, superscripts, choice rows and printed answer/student destinations; the final M3-2 sample shows AB=8 cm, BC=6 cm and tan A=3/4 with answer reference 문제 28쪽. Sample results do not override strict failures or represent full-page AI review of these 12 pairs.

| Pair / variant | Actual PDF pages (cover, first body, bank problem) | PNG manifest SHA256 | AI review SHA256 |
| --- | --- | --- |
| E3-2 student | 1, 7, 22 | e0be612f0a05ead6e0bbdbb85770d3c8c903e1d7efa1b12ccf1bc2aa37528caf | 2db6b35b31425ea7405eaa4902d59fd5289ff6a576762b827ccd05cc12d235c6 |
| E3-2 answers | 1, 7, 22 | 4bff366d9b69d3ac04a78b3c4db44c16e4b359e71ec1b28c165519f2b77b8112 | c90d288f5cda1f417d283e798e0beb9417109e48c04acc9bfe93de69213a2525 |
| E4-1 student | 1, 6, 21 | bd332b91ae6788db4593544418cd9538c0fb6b4e3f9178e9203ee5106052f303 | 5246bdcebb1eb50dea2062522b14cd4fcb354a6463bcd256a28c298d6d129f5d |
| E4-1 answers | 1, 6, 21 | 0d1f9480986af2d97b8397af0e77cb2f66cfc0d32779e39603579b8e5a56db6b | 1222374d750f452fdfdc0b0cff5105058685b0d6dd8ea752d755e71f9f58bcd9 |
| E4-2 student | 1, 6, 21 | b91ceef2788c8e7812f1deb0e32e99251dce46882dbc785128e16f74a2092e02 | 1ca6f3662aabb335c72ae3ed76ffcab1787c8884df6ed70260395b48ef01c0c5 |
| E4-2 answers | 1, 6, 21 | 320e8aeeada019755b2405956bc7e2afab71e58e58ff0bb6f0ef6bd6cbf2bab1 | 49c29d353335ed22ee70b0411adf453bc8ed847dec6c5aab5d844590a67c6655 |
| E5-1 student | 1, 6, 22 | 4ad54d96cc3c669aae73129e7b60ead7f79710fb3ee70a332fa86f70840cf94d | 4ab511cadec5ea3d761d75677bd40ee8ec38ff63859663dbfa0f28c0427735e9 |
| E5-1 answers | 1, 6, 22 | ea072af359fa6154e2d699642baaaa229a052692257150f32e31bef0bbd4ed78 | e168ecbff3f0bea58c53f5b747c8fc0357044522220990f26d2f69d9692b31b6 |
| E5-2 student | 1, 6, 22 | dae3ead0f14a124252802f0c4767c787233429a82f975e1dfc1375f69f64ce3e | 994f9b4937420019028ee7c394487b4a2abfcd188d7b091bdcb77d50b5ac21b8 |
| E5-2 answers | 1, 6, 22 | 4669b838614026a0ad58034ea97c74b5b17eb34afff7c0f3dcf347a31e6c4b6e | a060fa532498a976b9240e81ea6bd421b798811e733d63927b331c369b7f5f73 |
| E6-1 student | 1, 7, 22 | bc390809d40477728e75ef798e6e36bdd3597ff261acd580e3d576a68d94d028 | 9b43e207269a04e7cec6e1f59b7b25d5c14e9191c0f62cd2671be00185b4510e |
| E6-1 answers | 1, 7, 22 | 26de8de703316abbd05b0787ecb51e20ec67128ec613497fca7348ad2a6553ae | 3eae405e24d8df0ecf553df989400e779147f9ba4fdac61f0080ccc54bb7b491 |
| E6-2 student | 1, 7, 22 | adabb26ccb04afd1221a304c8fd19fb20b81921b80fd4598cfca17207425df42 | 58f7385a5cca3d081d53d0d358c95b00a67fe65adc557c88683d5ad769cf64ce |
| E6-2 answers | 1, 7, 22 | 65b9d953aa4ba2011739aeaeef5b526c608d3950858b79daf6a959f9c01d29b4 | aa2d9c6eb091a92d600e7fff7f687341417a1a2d08a0a523ce37bc57268cb191 |
| M1-1 student | 1, 7, 29 | 65c6994fea03112f709637ca92f1cec012422a92610538caab72b777c33ba9b7 | 8eed45c51c5157c612d37e52acd8ec7218603cdef9e87faff48777e851c64d92 |
| M1-1 answers | 1, 7, 29 | 422ea3d58e2458f51f8ee8b554fa2f9c67da772001377ab5dab9b049b6ddcf57 | 5fc03b5023211451871987b2bd63441986524c59cc5afd1d854665724a91a3e7 |
| M1-2 student | 1, 6, 25 | b2f262db3e6a8246529b2c5cb352163817a5a651bc77bf768b9d009ef662a5d2 | 304473392cc617baa1bfcb576c3a43ad56f1682e007ed9b248d507aca152f83f |
| M1-2 answers | 1, 6, 25 | 964761cefc5a454d6f5a9e44f4bef79a9ef00854267a629d9abc6552c9a3934d | 2a97a726c27a14cd8f4755f9351bd24806e3af260a481e66c5f706dbb568956e |
| M2-2 student | 1, 7, 31 | 8c02b9238aed7278cfe20c1a69f95925383e7e60296b9a5a44c650c42df1df6a | 27d452f2a3b6337bbc22b8cb7ff8981275c9ed65060cc3d44315b8c66b05036a |
| M2-2 answers | 1, 7, 31 | 074c793b397f74b368e5b633c195de4bb4a49b3a47986937137f7a83476260f8 | abdf5298ef5243b42f17daf4efe37032f11c38ec019289d5e6443c37a6b0be66 |
| M3-1 student | 1, 7, 42 | c3e4bbedb6634ed3255783c96a3ab6bde7800b9a15b8063e1d61320917e6804e | 02a2e12908377798add178bfd1f97f06fd48e880b2df9223273ce3e8736620ea |
| M3-1 answers | 1, 7, 43 | e9ec8dbc57e070264634425c5b65f2aa1b3e7ab53e933a993d78bff8f6c54a51 | 4e43a60e516817d2b3247f322d42ffd81eba44306951dc27b9d4aace826a5bd0 |
| M3-2 student | 1, 7, 28 | 6272cabad1551bf1097598c65421cf61eb4a8b4111c0ea900766314bd81b9dd6 | 061e6e6bde4da5760288b97476618670cb111fc64d30c7fe4dac3156b26f7d43 |
| M3-2 answers | 1, 7, 28 | c5023322d9a9c5ecad03574d4c4f064f02884113339daa753bb97edd4984f244 | 6d8b477e38a04d1be3ef7b5c04f720b5d3aa055f906e0dd20ad38aefb6a9f1b7 |

AI review is machine image reading only. Human editorial approval, physical printing/readability at actual scale, production authentication/database behavior, production publication/contention and QR destination operation were not tested. Official isolated reservation/rendering was exercised; production publication/finalization was not.

## Immutable PDF hashes

All complete PDFs below retain their FAILED strict verdicts. S/A page counts and exact hashes identify this frozen attempt only.

| Pair | Student pages / SHA256 | Answers pages / SHA256 |
| --- | --- | --- |
| E3-1 | 30 / `dadaabf1f2cb7f46243e38146863338ca9fd267e5ddf55d38fea399261ad5ecb` | 30 / `9bee5986ff567c7279f5f072c5d7e6c2c9c540da4b7dee471b46040e26c07f8c` |
| E3-2 | 64 / `d51b4934b62ae5df0d8e13f72ea532a5d75d00ee243afefe9727b310abd96e49` | 69 / `f3150352ac85a01d638ca91a088c19fa6a797e86f708e30e4822dec1a23ddf27` |
| E4-1 | 27 / `61ea8598c70aa7f7b8e58d96ef863f8cbe04de6fc0e5cbffc06381e9df7646dc` | 27 / `06b4e365e37aa769d959b30fc9427704743904ee63278da0f73e7625b5a0f16d` |
| E4-2 | 29 / `b6b8b9ab336198c01d33b5380f87d23a2c252f48010f34fa32f42586c382c055` | 28 / `029d09d7e06d8274012de96fd8d3a1ad20cb8eed0a126ab9d6f7c4ba55bc2315` |
| E5-1 | 58 / `9a2335261ce1b85423831302fa03aa11fd317c40de7ee9178234df43c7333531` | 60 / `7ed027fc107787cbc1a8ffca565a05defc9e0156e9a145150adbba829d8bb66a` |
| E5-2 | 28 / `2ead82e33eda9ae22042f0d9da18233cc85328389731c04d18adcb3d77260c13` | 28 / `e684a6033551f42ab69f4360ae5e4bdf444b12a93ef6b7881281f3651414a991` |
| E6-1 | 45 / `4d485a43aafec93980c684a95e863d16abac8d54efe3ddac932e12d50b7f16dd` | 47 / `5ef7d46edc76590a235b556b213543f1c0c7bd0af2397baa42d8689e0f6792e1` |
| E6-2 | 65 / `728f9e2f523706187193a39606f4e5d1b2f4eb55db821078ce886dae06d7aa31` | 67 / `23f59d594be674afd2419abb11f4a0110b1ab0b20a2fc888a6ae9366f2083dfe` |
| M1-1 | 38 / `3fe99f06811cc3c0fe3b83fd683fca89ed21aa2f621891ba9ea8e7f2f9b0fed1` | 40 / `06fb40de1f4b9af83d08f7736e49a685eddbd82a027ee7b2dd7015bc9429eaf9` |
| M1-2 | 33 / `547ce0f77674aaf54f425fd78ee71698993e45a91fa7032703b83b52a7ad36f3` | 37 / `c48505d0b30298df5e0651347098853798174ea3a5ee9eb077daeadf943900d6` |
| M2-1 | 73 / `37425e6d2b2af27cf053c3429513ae62ba5b6af1c344e3961cf054c62b648160` | 75 / `3b3e8d74ff5f7c875af4d1a0f8014663114786946ae8ee44a5fd798023d6c42e` |
| M2-2 | 46 / `02419f4717fb0b95e3f38488630794defce6734b37d3be3a172783327fd52ab0` | 49 / `7b8c0b08b10ae473d24ebebfac3c57686328ac9395bc2b4026ea3a2c0a9f3905` |
| M3-1 | 61 / `1a0f11d2212efac26c0cde7e233036e358e97f0fa39e2253e877ea22921ee048` | 57 / `60b3ab065b164e75817fa2e2d7c4def14a498500d8d8b8021d1e725c60706eb1` |
| M3-2 | 45 / `c2423f06d68e424af58b67bc20a48f0626a24f2b0c0f5e1ce1462b2bbed8f61f` | 52 / `e372861346a1f4ca1ff2f0a447ea04ec08201d7baa36262b94939c7d2772efd3` |

## Evidence integrity and handoff

Each combo retains exchange.private.json, publish-reservation.json, export-manifest.json, reserve/final chunk HTML/PDF/placement records, full witness, reference-phases, geometry, strict summary and PNG review evidence. The unique batch snapshots preserve each scoped verifier result before its top-level summary changed scope. The all14 aggregate deliberately records M2 review as pending at the time of aggregation; the later exact root receipt above is the authority for that independent AI reading.

The isolated PGlite dump is 26,987,129 bytes, SHA256 `593c3a201f70e9d83c7759e0bd05b4e98c44ee31ead4069cefc05cb7bd241e9e`. It contains 14 locally created private books; no production persistence is claimed.

Execution source identity: [final-execution-source-identity.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/final-execution-source-identity.json>), SHA256 `243c4fc9b505fcd644d3b92fe7abce8287a60a30875d3da655a4fdec51740684`, hashes 207 relevant source/font/tool files and exact frozen Git blobs. Working vs Git raw-byte differences are solely CRLF checkout normalization; original raw hashes remain recorded. The fixture and frozen authority tool hashes were independently checked unchanged after the writer settled; the tree was clean before this report.

| Read-only QA tool | Frozen working-byte SHA256 |
| --- | --- |
| `scripts/qa/textbook/recovery/local-books.ts` | `09d0ed7c220022a7b94e68b5e294978658091a464ffa03ef9eb2c280c8a587bb` |
| `scripts/qa/textbook/recovery/verify_exports.py` | `229d6543d2d0d6ca2cd074cf29bd9ed3b4b9865cd5a57e05e4061e822403a0f1` |
| `scripts/qa/textbook/recovery/geometry.py` | `7d3c0d2759c2ba19c2e1f20c9c59da37894b6e081d2776be142a2675e8c364df` |
| `scripts/qa/textbook/recovery/dom-witness.ts` | `1769790aad25f4e603880cf2fbd9596fce816a51ca490d9349df8ed7a902e0eb` |
| `scripts/qa/textbook/recovery/page_references.py` | `f5d499206671f590e09a4dec732a84b8e22165737c0f5e7fbed14e3eaa3580ee` |

The retained [baseline-artifact-manifest.private.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/baseline-artifact-manifest.private.json>), SHA256 `7d8faa87030a418dc15c5fea35d70d77066731f9fec7e0810702426de1f13ec3`, inventories 4,492 files / 11,731,036,066 bytes with exact relative paths, sizes and SHA256. It contains 1,040 PDFs (28 complete + 1,012 bounded reserve/final chunks), 1,040 HTML files, 1,784 JSON files, 552 PNG files, 62 SVG files, 13 logs and one PGlite gzip dump. The 552 PNG file total includes assets and must not be substituted for the 280 individually reviewed actual-PDF pages. Files were enumerated at the start of the streaming audit; [baseline-completion-evidence-index.private.json](<D:/교재_복구_실행검증_20261005/automatic/runs/final-07fee6f60392-20261005-045910-attempt1/baseline-completion-evidence-index.private.json>), SHA256 `4cbf770ccbd588c1c6391748da4ca219474df85505d4e7f578b4694554e80419`, seals later supplemental evidence including the final root receipt, validates all complete PDF/witness/exchange/strict hashes against that inventory, and cross-checks all 1,012 reserve/final chunk PDF hashes against their phase records. Historical mutable root partial notes are not the authority for completed review.

Corrections require fresh artifacts and fresh strict verdicts; this baseline must remain FAILED. The coordinator received its all14 completion, exact artifact locations/hashes, semantic-index discovery, immutable input identity and final-only feasibility. This worker changes only this new report in Git and creates private D: evidence; no push or worktree removal is performed here.
