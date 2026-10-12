# Textbook angle notation audit — 2026-10-11

Base main: e1716da7a. Read repository AGENTS.md and installed Next 16.3.8 route-handler documentation before coding; no route or UI change.

## Evidence and result

Read-only root: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001. Read snapshot/source-snapshot.json (capturedAt 2026-10-11T10:30:44.719Z; SHA-256 4eed1029df75fda73935c7d1464f1e487696101fa9f4b64641c2775b1326227f), every completed review/cases JSON, each case's immutable batchPath review.cases.blindSolutions, and actual generation/sources/{sourceId}.json pair.candidates. Grouped metadata files contain candidate digests, not candidate content, and were not substituted for the actual CP.

All 112 completed cases had matching case/batch binding and review digests, candidate payload digests (including recalculation), and recalculated snapshot-source digests. 25 were held and 87 already passed. Dry comparison now recognizes all three answers in 14 of those held cases, recovering 46 of 70 flagged answer comparisons; 24 flagged comparisons across 11 cases remain held. All 87 previously passed cases still compare true (regressions: 0). This is notation evidence, not mathematical approval. No source, answer, checkpoint, receipt, review, DB, provider, or running job was modified; no model call was made.

## Implementation limits

New angleAnswerNotation.ts accepts only bounded numeric expressions, a rational coefficient times exactly one π, exact degree-glyph spelling, exact trig tokens, the explicitly requested ordered trig triplet, ordered conversion subparts, and period/maximum/minimum fields. Numeric-only expressions reuse the existing exact scalar parser after a whitelist rejects variables, units, prose, and unknown commands; synthetic variable substitution is not used. This safely bypasses scalar context guards only when the answer has no variables or units. There is no eval, numerical tolerance, trig identity, modulo-period reduction, radical sign relaxation, symbolic-domain cancellation or AI equivalence. Limits: 2048 answer characters, 16000 question characters, 20 subparts, depth 2, 40-digit π coefficients plus existing scalar parser budgets.

Implicit rad is accepted only under a matching explicit output instruction. Degree-to-radian conversion infers the output unit per input subpart, and a global radian instruction in the sector schema applies only to the subpart asking for θ, never radius, arc length or area. The existing recursive fallback is prevented from reapplying the new structured comparator with flattened question context. Functions, arguments, coefficients, signs, field labels, answer order and all numeric roots remain present. Unsupported comparisons remain false; false is not a proof of mathematical inequality.

## Validation

- Focused new suite: 55 tests including positive and adversarial triplets, signs, labels, variables, all roots, degree/radian and other units, incomplete/reordered subparts, scalar domains, symbolic division, malformed and over-budget inputs.
- Six notation suites: 521 tests passed.
- Scoped ESLint passed.
- Full TypeScript check passed: `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Independent future blind review is required before promoting any held pair. Existing immutable cases are not reclassified or rewritten by this audit.

## All completed held cases

Order of result columns: original / slot 1 / slot 2. “same” means only the deterministic answer-notation comparison recognizes equivalence.

| Source ID | Results | Classification and remaining boundary |
|---|---|---|
| 1a3430d6-db94-409d-8d58-c46d0f9644a0 | same / same / same | Exact named trig triplet versus numbered values; labels bind to the question order. |
| 1a5d0328-6dc9-409d-9bb0-8fd8483bbab0 | held / same / same | Genuine original answer disagreement: stored ③ versus independent ④. No notation rule can fix this; original remains held. This audit does not adjudicate which mathematical claim is correct. |
| 1f57ed66-3ac5-41fe-9dc8-bd6825466d12 | same / same / same | Exact ordered angle conversions; rad inferred only for degree-input subparts, degree marks retained for radian-input subparts. |
| 2d623ba1-957f-482c-af2b-e55868e682c9 | same / same / same | Exact named trig triplet versus numbered values. |
| 4c6647fc-038f-4828-91a9-555d78a43801 | same / same / same | Exact period / maximum / minimum labels and numeric values within every ordered subpart. |
| 55da42da-ab27-427e-b6da-c16dbce36599 | same / same / same | Exact rational multiples of π. |
| 56be2614-77d7-4621-84dd-8aee9ce4bbbe | held / held / held | Held: mixed named θ / S versus numbered rad / square-unit answers needs a separate quantity-role schema; do not strip rad or square units. |
| 7a1885f6-8c75-49e6-bf35-8e120f15ec03 | same / same / same | Exact trig token formatting; every function, argument, coefficient and sign retained. |
| 7f647847-7d31-4d14-bf55-3fde18d7bd4a | held / same / same | Original held: blind adds rad and an equivalent-degree annotation (=30°), with no explicit output unit directive. Candidates have an explicit radian directive and the angle subpart is identified from the question; radius, arc length and area parts never inherit rad. |
| 82ab5fee-ddeb-4752-b710-303a0a5a14c4 | same / held / held | Held candidates: a single combination choice has a text suffix (④ ㄱ, ㄷ / ② ㄴ), while the existing multi-select branch expects only choice indexes. Choice-combination parsing is outside the new helper; do not suppress mismatches. |
| 96e273ce-f4d8-48bb-96f4-eec896ba6621 | same / same / same | Exact rational multiples of π; no general-angle reduction is performed. |
| 9ab66911-e5ca-4a54-9790-50bab809bdbb | same / same / same | Exact degree-glyph formatting; degrees are never erased or converted to radians. |
| acf41aa5-747d-4450-9c32-ab3466b29130 | held / held / held | Held: period plus symbolic asymptote-family schema, integer quantifier and parameter identity need their own parser. Expressions appear equivalent but are not accepted by this bounded helper. |
| ad8c27d4-0727-4728-bc7b-081a89c18398 | same / same / same | Exact trig token formatting; no identity evaluation. |
| baef5fe9-4ec0-4532-8ce5-53ff12b40e51 | held / same / same | Original held: naked scalar versus explicit rad has no explicit output-unit directive. Both candidates explicitly request radians and compare exactly. |
| bb0ffc1c-1a5f-4791-a725-0545131d08be | same / same / same | Exact two-clause conversion request, with the requested output order preserved. |
| bb78ccc7-5a65-407a-adf6-e30bb8fc909a | same / same / same | Exact rational multiples of π. |
| c1f2e298-345e-41da-8ff1-5a1ed1feeb77 | same / same / same | Exact numeric radicals in ordered subparts; context no longer blocks numeric-only notation comparison. |
| c2117dea-268d-4644-aca4-977adcb937a4 | held / held / held | Held: tan² versus reciprocal cos² requires trigonometric identities and domain reasoning, not notation. No identity or domain cancellation is introduced. |
| c5e87d69-fd16-4231-af69-f90f4f390f95 | same / same / same | Exact numeric radical expressions; measurement words in the question do not turn a variable-free answer expression into a unit expression. |
| d2ece9c4-8814-4b3f-92d8-f88f83ebcb61 | held / held / held | Held: labeled mixed radius and θ quantities require a separate quantity-role schema, particularly for omitted rad. Variable labels are not stripped. |
| e1462e71-c3ee-4f16-9b40-c89c52de348e | held / held / held | Held: general-angle families, degree multipliers, quadrants and a shared integer quantifier need a separate schema. No modulo-period or symbolic family equivalence is inferred. |
| f5837285-ce87-43a1-8d05-fffa790c428d | held / same / same | Original held: explicit rad plus a degree annotation (144°) needs unit context and annotation validation. Candidates explicitly request radians and compare exactly. |
| fb4a919c-ac6c-4bff-9ad4-31b951c2aaef | held / held / held | Held: quadrant alternatives versus comma-elliptical quadrant lists need a separate set grammar. No words are dropped to extract numbers. |
| ff051e14-089e-4629-8ddf-0f79e88b7c5d | same / same / same | Exact numeric radical notation despite coordinate and length context; no coordinates or units are removed from the answers. |

## Exact answer evidence

### 1a3430d6-db94-409d-8d58-c46d0f9644a0

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/2.json

Binding: bde4947941995d1952a8cd11c1f68345ce10381701d5ec9829f9d72559e90963

Exact named trig triplet versus numbered values; labels bind to the question order.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\sin \,\theta =-\frac{3\sqrt{13}}{13},~\cos \,\theta =-\frac{2\sqrt{13}}{13},~\tan \,\theta =\frac{3}{2}$` | `(1) -3√13/13; (2) -2√13/13; (3) 3/2` | same |
| slot-1 | `$\sin\theta=-\frac{4}{5}$, $\cos\theta=-\frac{3}{5}$, $\tan\theta=\frac{4}{3}$` | `(1) -4/5; (2) -3/5; (3) 4/3` | same |
| slot-2 | `$\sin\theta=-\frac{5\sqrt{41}}{41}$, $\cos\theta=-\frac{4\sqrt{41}}{41}$, $\tan\theta=\frac{5}{4}$` | `(1) -5√41/41; (2) -4√41/41; (3) 5/4` | same |

### 1a5d0328-6dc9-409d-9bb0-8fd8483bbab0

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/2.json

Binding: b3f69698cb49253cabb543cef02e4e6733144ffffd06d849d42becf8b1d38f64

Genuine original answer disagreement: stored ③ versus independent ④. No notation rule can fix this; original remains held. This audit does not adjudicate which mathematical claim is correct.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `③` | `④` | held |
| slot-1 | `⑤ $2\cos x-2\sin x$` | `⑤` | same |
| slot-2 | `③ $\sin x+\cos x$` | `③` | same |

### 1f57ed66-3ac5-41fe-9dc8-bd6825466d12

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/2.json

Binding: 0bee01f1e5742bf413cf7d784ce85b8edb0f9cc041ffda3a903d3d84d3859edd

Exact ordered angle conversions; rad inferred only for degree-input subparts, degree marks retained for radian-input subparts.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `⑴ $\frac{2}{3}\pi$ ⑵ $\frac{10}{9}\pi$ ⑶ $\frac{5}{3}\pi$ ⑷ $60^\circ$ ⑸ $225^\circ$ ⑹ $330^\circ$` | `(1) 2π/3 rad; (2) 10π/9 rad; (3) 5π/3 rad; (4) 60°; (5) 225°; (6) 330°` | same |
| slot-1 | `(1) $\frac{5\pi}{6}$ (2) $\frac{11\pi}{9}$ (3) $\frac{7\pi}{4}$ (4) $45^\circ$ (5) $210^\circ$ (6) $260^\circ$` | `(1) 5π/6 rad; (2) 11π/9 rad; (3) 7π/4 rad; (4) 45°; (5) 210°; (6) 260°` | same |
| slot-2 | `(1) $\frac{3\pi}{4}$ (2) $\frac{25\pi}{18}$ (3) $\frac{11\pi}{6}$ (4) $72^\circ$ (5) $160^\circ$ (6) $255^\circ$` | `(1) 3π/4 rad; (2) 25π/18 rad; (3) 11π/6 rad; (4) 72°; (5) 160°; (6) 255°` | same |

### 2d623ba1-957f-482c-af2b-e55868e682c9

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/3.json

Binding: 221038af128e6fa9eec40d0a4731b40edac2bf4a29e7f235d827707f2c46daab

Exact named trig triplet versus numbered values.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\sin\theta=-\frac{3}{5}$, $\cos\theta=\frac{4}{5}$, $\tan\theta=-\frac{3}{4}$` | `(1) -3/5 ⏎ (2) 4/5 ⏎ (3) -3/4` | same |
| slot-1 | `$\sin\theta=-\frac{8}{17}$, $\cos\theta=\frac{15}{17}$, $\tan\theta=-\frac{8}{15}$` | `(1) -8/17 ⏎ (2) 15/17 ⏎ (3) -8/15` | same |
| slot-2 | `$\sin\theta=-\frac{21}{29}$, $\cos\theta=-\frac{20}{29}$, $\tan\theta=\frac{21}{20}$` | `(1) -21/29 ⏎ (2) -20/29 ⏎ (3) 21/20` | same |

### 4c6647fc-038f-4828-91a9-555d78a43801

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/4.json

Binding: c7c87a0b796c77bda0fb46762c8a163903ddfe86ca4ea2680127788cd0b35228

Exact period / maximum / minimum labels and numeric values within every ordered subpart.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `(1) 주기 $\pi$, 최댓값 $6$, 최솟값 $2$ (2) 주기 $\frac{2}{3}\pi$, 최댓값 $4$, 최솟값 $2$ (3) 주기 $2$, 최댓값 $\sqrt{2}-1$, 최솟값 $-\sqrt{2}-1$ (4) 주기 $2\pi$, 최댓값 $1$, 최솟값 $-1$` | `(1) 주기 π, 최댓값 6, 최솟값 2 ⏎ (2) 주기 2π/3, 최댓값 4, 최솟값 2 ⏎ (3) 주기 2, 최댓값 √2−1, 최솟값 −√2−1 ⏎ (4) 주기 2π, 최댓값 1, 최솟값 −1` | same |
| slot-1 | `(1) 주기 $\frac{\pi}{2}$, 최댓값 $5$, 최솟값 $-1$ ⏎ (2) 주기 $\frac{2\pi}{5}$, 최댓값 $8$, 최솟값 $4$ ⏎ (3) 주기 $1$, 최댓값 $\sqrt{3}-2$, 최솟값 $-\sqrt{3}-2$ ⏎ (4) 주기 $2\pi$, 최댓값 $3$, 최솟값 $-3$` | `(1) 주기 π/2, 최댓값 5, 최솟값 −1 ⏎ (2) 주기 2π/5, 최댓값 8, 최솟값 4 ⏎ (3) 주기 1, 최댓값 √3−2, 최솟값 −√3−2 ⏎ (4) 주기 2π, 최댓값 3, 최솟값 −3` | same |
| slot-2 | `(1) 주기 $\frac{2\pi}{3}$, 최댓값 $4$, 최솟값 $-6$ ⏎ (2) 주기 $\frac{\pi}{2}$, 최댓값 $5$, 최솟값 $-1$ ⏎ (3) 주기 $4$, 최댓값 $1+\sqrt{5}$, 최솟값 $1-\sqrt{5}$ ⏎ (4) 주기 $\pi$, 최댓값 $3$, 최솟값 $-3$` | `(1) 주기 2π/3, 최댓값 4, 최솟값 −6 ⏎ (2) 주기 π/2, 최댓값 5, 최솟값 −1 ⏎ (3) 주기 4, 최댓값 1+√5, 최솟값 1−√5 ⏎ (4) 주기 π, 최댓값 3, 최솟값 −3` | same |

### 55da42da-ab27-427e-b6da-c16dbce36599

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/5.json

Binding: 3b75d754ed585392283922fc612b5cf9c7c381403c6f11e98538662645f1513e

Exact rational multiples of π.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{3}{2}\pi$` | `3π/2` | same |
| slot-1 | `$\frac{9\pi}{4}$` | `9π/4` | same |
| slot-2 | `$\frac{4\pi}{3}$` | `4π/3` | same |

### 56be2614-77d7-4621-84dd-8aee9ce4bbbe

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/5.json

Binding: 8ca8cf4312a19fcf181aa4ce18cfbc05984cf4654dbb67769656ecfc4c08f592

Held: mixed named θ / S versus numbered rad / square-unit answers needs a separate quantity-role schema; do not strip rad or square units.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\theta=\frac{\pi}{9}$, $S=8\pi$` | `(1) π/9 rad, (2) 8π 제곱단위` | held |
| slot-1 | `$\theta=\frac{2\pi}{9}$, $S=25\pi$` | `(1) 2π/9 rad, (2) 25π 제곱단위` | held |
| slot-2 | `$\theta=\frac{\pi}{10}$, $S=\frac{64}{5}\pi$` | `(1) π/10 rad, (2) 64π/5 제곱단위` | held |

### 7a1885f6-8c75-49e6-bf35-8e120f15ec03

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/7.json

Binding: 98f1f092eff1cf50716a934d4efc37b046b84d1b1208e8d3924eb2f61cd30f77

Exact trig token formatting; every function, argument, coefficient and sign retained.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$0$` | `0` | same |
| slot-1 | `$\cos\theta+2\sin\theta$` | `cos θ+2 sin θ` | same |
| slot-2 | `$-2\cos\theta-2\sin\theta$` | `−2cos θ−2sin θ` | same |

### 7f647847-7d31-4d14-bf55-3fde18d7bd4a

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/7.json

Binding: cfeeff9baa0b70e8965b64b282b98da05ab4e782b5cbe682f3e58ceed2945c57

Original held: blind adds rad and an equivalent-degree annotation (=30°), with no explicit output unit directive. Candidates have an explicit radian directive and the angle subpart is identified from the question; radius, arc length and area parts never inherit rad.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `⑴ $12$ ⑵ $\frac{\pi}{6}$ ⑶ $2\pi$ ⑷ $\frac{20}{3}\pi$` | `(1) 12 ⏎ (2) π/6 rad (=30°) ⏎ (3) 2π ⏎ (4) 20π/3` | held |
| slot-1 | `(1) $9$ (2) $\frac{\pi}{4}$ (3) $3\pi$ (4) $12\pi$` | `(1) 9 ⏎ (2) π/4 rad ⏎ (3) 3π ⏎ (4) 12π` | same |
| slot-2 | `(1) $8$ (2) $\frac{2\pi}{5}$ (3) $\pi$ (4) $21\pi$` | `(1) 8 ⏎ (2) 2π/5 rad ⏎ (3) π ⏎ (4) 21π` | same |

### 82ab5fee-ddeb-4752-b710-303a0a5a14c4

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/8.json

Binding: 8c56b3081b45da528391dc0d11c17008e492ec0f4cc4a95f577fa91ebf304723

Held candidates: a single combination choice has a text suffix (④ ㄱ, ㄷ / ② ㄴ), while the existing multi-select branch expects only choice indexes. Choice-combination parsing is outside the new helper; do not suppress mismatches.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `⑤` | `⑤` | same |
| slot-1 | `④ ㄱ, ㄷ` | `④` | held |
| slot-2 | `② ㄴ` | `②` | held |

### 96e273ce-f4d8-48bb-96f4-eec896ba6621

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/8.json

Binding: 94c3fc8e9919f56738b05d588e9354656e1d00cff3b0ee22dcf5406933182ad2

Exact rational multiples of π; no general-angle reduction is performed.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{2}{3}\pi$` | `2π/3` | same |
| slot-1 | `$\frac{5}{4}\pi$` | `5π/4` | same |
| slot-2 | `$\frac{\pi}{6}$` | `π/6` | same |

### 9ab66911-e5ca-4a54-9790-50bab809bdbb

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/8.json

Binding: d4d000f18a2a2f52f6708a7fc06320891126aa252f53b9a98351787069d6489c

Exact degree-glyph formatting; degrees are never erased or converted to radians.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$135^\circ$` | `135°` | same |
| slot-1 | `$108^\circ$` | `108°` | same |
| slot-2 | `$60^\circ$` | `60°` | same |

### acf41aa5-747d-4450-9c32-ab3466b29130

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/9.json

Binding: b1cfca88d26a8d67a28f5a80f419bc86aa4aa5ae5b71f6b61e252d6ce66980ce

Held: period plus symbolic asymptote-family schema, integer quantifier and parameter identity need their own parser. Expressions appear equivalent but are not accepted by this bounded helper.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `주기 $\frac{\pi}{2}$, 점근선 $x=\frac{n}{2}\pi+\frac{5}{12}\pi$ ($n$은 정수)` | `(1) 주기: π/2 (2) 점근선: x = 5π/12 + nπ/2 (n은 정수)` | held |
| slot-1 | `주기 $\frac{\pi}{3}$, 점근선 $x=\frac{n\pi}{3}+\frac{\pi}{4}$ ($n$은 정수)` | `(1) 주기: π/3 (2) 점근선: x = π/4 + nπ/3 (n은 정수)` | held |
| slot-2 | `주기 $\frac{\pi}{4}$, 점근선 $x=\frac{n\pi}{4}+\frac{\pi}{12}$ ($n$은 정수)` | `(1) 주기: π/4 (2) 점근선: x = π/12 + nπ/4 (n은 정수)` | held |

### ad8c27d4-0727-4728-bc7b-081a89c18398

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/9.json

Binding: dd80940a095739dbcf20274ac6f6c128cf3fee9e210ca21f3583f33f883f0b95

Exact trig token formatting; no identity evaluation.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\cos \,\theta$` | `cos θ` | same |
| slot-1 | `$-\cos\theta$` | `-cos θ` | same |
| slot-2 | `$3\cos\theta$` | `3cos θ` | same |

### baef5fe9-4ec0-4532-8ce5-53ff12b40e51

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/10.json

Binding: b2d48bf3430f2c5f571f8dde683a9ecf1b38e959ea0ee4a1d1d6fa86d8122e0a

Original held: naked scalar versus explicit rad has no explicit output-unit directive. Both candidates explicitly request radians and compare exactly.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{1}{2}$` | `1/2 rad` | held |
| slot-1 | `$\frac{2}{3}$` | `2/3 rad` | same |
| slot-2 | `$\frac{1}{3}$` | `1/3 rad` | same |

### bb0ffc1c-1a5f-4791-a725-0545131d08be

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/10.json

Binding: 214ee90ed1c72faf83f3de1a0554a6d2b71d38155657905b4f03ca50e973449e

Exact two-clause conversion request, with the requested output order preserved.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{4}{5}\pi$, $4^\circ$` | `(1) 4π/5 rad ⏎ (2) 4°` | same |
| slot-1 | `$\frac{7}{10}\pi$, $5^\circ$` | `(1) 7π/10 rad ⏎ (2) 5°` | same |
| slot-2 | `$\frac{11}{12}\pi$, $12^\circ$` | `(1) 11π/12 rad ⏎ (2) 12°` | same |

### bb78ccc7-5a65-407a-adf6-e30bb8fc909a

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/10.json

Binding: 99ebe1571ca06d73a10b8b82056485fc930fd9bb001f84faa43f7fd5919002bf

Exact rational multiples of π.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{3}{2}\pi$` | `3π/2` | same |
| slot-1 | `$\frac{3\pi}{4}$` | `3π/4` | same |
| slot-2 | `$\pi$` | `π` | same |

### c1f2e298-345e-41da-8ff1-5a1ed1feeb77

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/11.json

Binding: ea5987d11fbf15e0cfc46dfd2f4f131a9ee719249ea0435b8652cc67ec0f04dd

Exact numeric radicals in ordered subparts; context no longer blocks numeric-only notation comparison.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `(1) $\frac{2\sqrt{2}}{3}$ (2) $-\frac{\sqrt{3}}{2}$ (3) $-\frac{4}{3}$ (4) $-\frac{3\sqrt{10}}{10}$` | `(1) 2√2/3 ⏎ (2) -√3/2 ⏎ (3) -4/3 ⏎ (4) -3√10/10` | same |
| slot-1 | `(1) $\frac{\sqrt{21}}{5}$ (2) $-\frac{2\sqrt{2}}{3}$ (3) $-\frac{12}{5}$ (4) $-\frac{2\sqrt{5}}{5}$` | `(1) √21/5 ⏎ (2) -2√2/3 ⏎ (3) -12/5 ⏎ (4) -2√5/5` | same |
| slot-2 | `(1) $\frac{2\sqrt{10}}{7}$ (2) $-\frac{\sqrt{21}}{5}$ (3) $-\frac{15}{8}$ (4) $-\frac{4\sqrt{17}}{17}$` | `(1) 2√10/7 ⏎ (2) -√21/5 ⏎ (3) -15/8 ⏎ (4) -4√17/17` | same |

### c2117dea-268d-4644-aca4-977adcb937a4

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/11.json

Binding: 1f1c891f1547684861be74fb241585db5d82a9903c700229ba085afbd325d6a1

Held: tan² versus reciprocal cos² requires trigonometric identities and domain reasoning, not notation. No identity or domain cancellation is introduced.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `⑴ $\frac{2}{\cos\theta}$ ⑵ $2+\tan^{2}\theta$` | `(1) 2/cosθ ⏎ (2) 1+1/cos²θ` | held |
| slot-1 | `⑴ $\frac{6}{\cos\theta}$ ⑵ $3+2\tan^2\theta$` | `(1) 6/cosθ ⏎ (2) 1+2/cos²θ` | held |
| slot-2 | `⑴ $\frac{7+3\sin\theta}{\cos\theta}$ ⑵ $5+3\tan^2\theta$` | `(1) (7+3sinθ)/cosθ ⏎ (2) 2+3/cos²θ` | held |

### c5e87d69-fd16-4231-af69-f90f4f390f95

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/11.json

Binding: 1cd76cf94da41062fb6f1e76fa8ebdbff125a646f657fcd111f75cd2390535db

Exact numeric radical expressions; measurement words in the question do not turn a variable-free answer expression into a unit expression.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{5}{2}$` | `5/2` | same |
| slot-1 | `$\frac{5\sqrt{2}-3}{2}$` | `(5√2-3)/2` | same |
| slot-2 | `$\frac{10\sqrt{3}-12}{3}$` | `(10√3-12)/3` | same |

### d2ece9c4-8814-4b3f-92d8-f88f83ebcb61

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/12.json

Binding: 9984ed5325442fd3da88ff27d4b6249ef88e1224f5f063c89e74b6ffdd549cea

Held: labeled mixed radius and θ quantities require a separate quantity-role schema, particularly for omitted rad. Variable labels are not stripped.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$r=15,~\theta =2$` | `r=15, θ=2 rad` | held |
| slot-1 | `$r=18$, $\theta=2$` | `r=18, θ=2 rad` | held |
| slot-2 | `$r=24$, $\theta=2$` | `r=24, θ=2 rad` | held |

### e1462e71-c3ee-4f16-9b40-c89c52de348e

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/12.json

Binding: dee8cd9355115ba23075070c46d38684eebf531f0468a3b7ca36fbae646ce67d

Held: general-angle families, degree multipliers, quadrants and a shared integer quantifier need a separate schema. No modulo-period or symbolic family equivalence is inferred.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `(1) $360^\circ\times n+80^\circ$, 제1사분면 (2) $360^\circ\times n+170^\circ$, 제2사분면 (3) $2n\pi+\frac{4}{3}\pi$, 제3사분면 (4) $2n\pi+\frac{8}{5}\pi$, 제4사분면 (5) $2n\pi+\frac{5}{6}\pi$, 제2사분면 (6) $2n\pi+\frac{3}{8}\pi$, 제1사분면 (단, $n$은 정수)` | `(1) 360°n+80°, 제1사분면 ⏎ (2) 360°n+170°, 제2사분면 ⏎ (3) 2nπ+4π/3, 제3사분면 ⏎ (4) 2nπ+8π/5, 제4사분면 ⏎ (5) 2nπ+5π/6, 제2사분면 ⏎ (6) 2nπ+3π/8, 제1사분면 ⏎ (n은 정수)` | held |
| slot-1 | `(1) $360^\circ\times n+125^\circ$, 제2사분면 ⏎ (2) $360^\circ\times n+235^\circ$, 제3사분면 ⏎ (3) $2n\pi+\frac{5}{3}\pi$, 제4사분면 ⏎ (4) $2n\pi+\frac{2}{5}\pi$, 제1사분면 ⏎ (5) $2n\pi+\frac{7}{6}\pi$, 제3사분면 ⏎ (6) $2n\pi+\frac{5}{8}\pi$, 제2사분면 ⏎ (단, $n$은 정수)` | `(1) 360°n+125°, 제2사분면 ⏎ (2) 360°n+235°, 제3사분면 ⏎ (3) 2nπ+5π/3, 제4사분면 ⏎ (4) 2nπ+2π/5, 제1사분면 ⏎ (5) 2nπ+7π/6, 제3사분면 ⏎ (6) 2nπ+5π/8, 제2사분면 ⏎ (n은 정수)` | held |
| slot-2 | `(1) $360^\circ\times n+275^\circ$, 제4사분면 ⏎ (2) $360^\circ\times n+50^\circ$, 제1사분면 ⏎ (3) $2n\pi+\frac{2}{3}\pi$, 제2사분면 ⏎ (4) $2n\pi+\frac{6}{5}\pi$, 제3사분면 ⏎ (5) $2n\pi+\frac{11}{6}\pi$, 제4사분면 ⏎ (6) $2n\pi+\frac{11}{8}\pi$, 제3사분면 ⏎ (단, $n$은 정수)` | `(1) 360°n+275°, 제4사분면 ⏎ (2) 360°n+50°, 제1사분면 ⏎ (3) 2nπ+2π/3, 제2사분면 ⏎ (4) 2nπ+6π/5, 제3사분면 ⏎ (5) 2nπ+11π/6, 제4사분면 ⏎ (6) 2nπ+11π/8, 제3사분면 ⏎ (n은 정수)` | held |

### f5837285-ce87-43a1-8d05-fffa790c428d

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/14.json

Binding: bd6ee5fec0bde0f9360bf87ea5af2e6aebd7639a859803b37b5ef7955b6941cf

Original held: explicit rad plus a degree annotation (144°) needs unit context and annotation validation. Candidates explicitly request radians and compare exactly.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\dfrac{4}{5}\pi$` | `4π/5 rad (144°)` | held |
| slot-1 | `$\frac{6\pi}{7}$` | `6π/7 rad` | same |
| slot-2 | `$\frac{3\pi}{2}$` | `3π/2 rad` | same |

### fb4a919c-ac6c-4bff-9ad4-31b951c2aaef

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/14.json

Binding: 59b532c93ec0405ba04c180938bbfb78be3bb49d4a6cd99cdc767b6f6d5713ae

Held: quadrant alternatives versus comma-elliptical quadrant lists need a separate set grammar. No words are dropped to extract numbers.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `(1) 제2사분면 (2) 제4사분면 (3) 제1사분면 또는 제3사분면 (4) 제3사분면 또는 제4사분면` | `(1) 제2사분면 ⏎ (2) 제4사분면 ⏎ (3) 제1, 제3사분면 ⏎ (4) 제3, 제4사분면` | held |
| slot-1 | `(1) 제3사분면 ⏎ (2) 제1사분면 ⏎ (3) 제2사분면 또는 제4사분면 ⏎ (4) 제1사분면 또는 제2사분면` | `(1) 제3사분면 ⏎ (2) 제1사분면 ⏎ (3) 제2, 제4사분면 ⏎ (4) 제1, 제2사분면` | held |
| slot-2 | `(1) 제1사분면 ⏎ (2) 제2사분면 ⏎ (3) 제1사분면 또는 제2사분면 ⏎ (4) 제2사분면 또는 제3사분면` | `(1) 제1사분면 ⏎ (2) 제2사분면 ⏎ (3) 제1, 제2사분면 ⏎ (4) 제2, 제3사분면` | held |

### ff051e14-089e-4629-8ddf-0f79e88b7c5d

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/continuous-plain/cohort-0001/review/batches/14.json

Binding: 23914cfe9326d00e027c30e82135ae296a1c778edde5ee5290e80482c96c9f46

Exact numeric radical notation despite coordinate and length context; no coordinates or units are removed from the answers.

| Role | Stored snapshot / generated CP | Immutable blind answer | New notation result |
|---|---|---|---|
| original | `$\frac{\sqrt{15}}{2}$` | `√15/2` | same |
| slot-1 | `$2\sqrt{3}$` | `2√3` | same |
| slot-2 | `$\frac{2\sqrt{7}}{3}$` | `2√7/3` | same |

## Additional coordinator-requested case

`1e9938d4-afbe-466a-8f27-2d4e74051916` from `cohort-128-table-box-review/cases` and `cohort-128-table-box-generation/sources`: actual slot 1 CP answer `$100\sqrt{10}+25$`; immutable blind answer `25+100√10`. Existing scalar comparison returns null because the question contains condition labels `(가)` / `(나)` that trigger its ordered-subpart context guard. The numeric-only gate now compares them exactly without relaxing variable/domain guards or interpreting the logarithm conditions. The new test covers this reordered radical sum; the actual CP comparison returns true. Original 14 and slot 2 116 were not held.

Batch: C:/Creative/testautocreator/.qa-artifacts/textbook-codex-plan-20261011/cohort-128-table-box-review/batches/1.json

Binding: b1730e6dee3583b1c68340f9e59e75c2fdb4c68ddbab944a3468166ee6d8531e

Additional validation: five review and qualification pipeline suites passed (248 tests), for 769 tests across the 11 targeted suites. After tightening function-name boundaries, whitespace token boundaries and the two-clause conversion grammar, the focused 55-test suite and scoped ESLint passed again. Main node_modules was reused through a worktree junction; no package or lockfile changed. The junction is intentionally left for coordinator cleanup.
