# Source-specific calculus pairs — 2026-10-11

All **20 acquired recovered questions** now have **exactly two genuine, distinct drafts each (40 candidates)**. The full actual database census adds **7 matching originals (14 candidates)**, for **27 originals and 54 calculus candidates**. There is no source-specific blocker remaining among these 27 originals. The previous **828-original / 1,656-candidate deterministic tranche is byte-identical**.

This worker authored candidate drafts only. It made no database writes, schema changes, source extraction changes, review promotions, human-review logs, downloads of new source material, paid model calls, deployment, push, or nested-worker dispatches. Existing `variants.ts`, the geometry module, composition and bulk loader remain owned by their original workers/coordinator.

The generator accepts an actual `pending` original after exact mathematical source verification, without rewriting `review_status`, `direct_use_allowed` or any other source field. The durable [recovered fixtures](recovered-sources.json) preserve all 20 original pending/false acquisition states. An initial actual-UUID census used the pending snapshot SHA-256 `80771450186c252e21b46975efada74c42675c97177b0818004374e37ae517bd`. The coordinator subsequently qualified its own newly inserted source rows and directed this worker to regenerate against its fresh snapshot; no qualification was performed here.

The final input is `C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/after-source-qualification/source-snapshot.json`, containing **12,301 actual originals**, SHA-256 `2969bc3ae36959cd286116866342745cee098341d70ad5a83ae180dea6225658`. Final candidates bind the actual current UUIDs, approved/true source fields, update timestamps, complete source text and all extra fields. Any later source change invalidates those digests and requires regeneration. Candidate drafting itself grants no publication or direct-use status.

**Integration contract**

```ts
type TextbookCalculusCandidate = Omit<TextbookVariantCandidate, "recipe"> & {
  recipe: TextbookCalculusRecipe;
};
generateTextbookCalculusPair(source: TextbookVariantSource): TextbookCalculusResult;
validateTextbookCalculusPair(
  source: TextbookVariantSource,
  candidates: readonly TextbookCalculusCandidate[],
): { valid: boolean; issues: string[] };
```

`TextbookCalculusResult` has the base module's `matched`/`unresolved` discriminator and exact two-element candidate tuple. The coordinator can compose a union of the separate recipe DTOs. External IDs remain `tb-retry-v1:<actual-source-uuid>:1` and `:2`.

**Recovered 20: every row has two candidates**

| Acquired external ID | Actual original UUID | Exact calculus template |
|---|---|---|
| tb-f84c254aaee88ed5-0-1 | c7666788-c66f-47de-9866-b92b62bf82ef | tangent-at-point, all three subquestions |
| tb-f84c254aaee88ed5-0-2 | eb12f0b8-9eb2-40b3-957a-c0be6c61a6e9 | tangent-given-slope, all three real tangents |
| tb-f84c254aaee88ed5-0-3 | 6d30440a-0ba5-4e75-bf06-c976eaf562c8 | tangent-parallel, both subquestions and all contacts |
| tb-11bbd0ad2b6798f4-0-4 | 4cb82cdc-f93d-4e19-acde-089667c5f394 | cubic-no-extrema, both parameter ranges including boundaries |
| tb-beba382c1b0cc7fd-0-4 | b425144e-155b-4881-a2b2-57daea2bfdd6 | interval-root-parameter, strict image of the open domain |
| tb-a8b0ac48f251ea1b-0-4 | 50a15ad1-eb70-4392-84aa-2cdbbcdf50f1 | functional-identity, unique nondegenerate quadratic |
| tb-68cd4a93b5c6bfa1-0-4 | 0f7e1604-852b-4db8-8136-390d5fbe4e89 | tangent-through-point and x-intercept |
| tb-5e59c02795c04cf9-0-4 | efb7273a-7e38-4aa2-9ef2-9c2bddac9e4c | quadratic-MVT, k=1/2 with varied quadratic and fresh proof |
| tb-ccfc7256c368fb59-0-5 | b5de41a3-712f-4bb5-8c74-bfffab00cf53 | monic-cubic-given-limit/local maximum |
| tb-31300a3c654d244c-0-2 | bb995945-edb6-4971-a234-9b9552dd514a | closed-interval-max/min difference |
| tb-eecf688bd7d0c30c-0-2 | b1393079-1d4b-4ec6-a37e-9288b0eda0f0 | velocity parameter from differentiated position |
| tb-ccb968bff05e34f7-0-2 | abb89561-202d-4b19-bae9-2c2b190c673d | value from polynomial antiderivative |
| tb-1f59f8726f20495b-0-1 | 3bc20e88-c522-4102-9c6c-c5d90f9dd4a2 | FTC additive parameter and evaluation |
| tb-1f59f8726f20495b-0-2 | 8a122827-87da-4dcf-8f7d-eaccd190cb4b | integral identity, consistent lower-bound value |
| tb-855f74a7a4c95fd5-0-6 | c9bc3ae5-8631-401f-aa51-0362ed4c9739 | continuity and removable polynomial factor |
| tb-76694c0a07294a0b-0-8 | c9823bb2-d1f1-476c-a430-1b9652f3959c | symmetric-difference quotient, twice the derivative |
| tb-76694c0a07294a0b-0-10 | f3caffd0-e752-4a25-bf3b-7cf67864b68d | polynomial product identity and first derivative |
| tb-8f346039a6d28ad3-0-10 | 7f31a6c4-1898-4c1b-8641-dba95af3d863 | initial braking acceleration plus first-stop distance |
| tb-6ecb67c37ab48c18-0-4 | bf97a0d9-f7fa-46f0-8d16-12abb0ae7c66 | difference of reverse-bound integrals |
| tb-6ecb67c37ab48c18-0-6 | 9e18a685-dc8d-4ce6-82bf-9734306170e0 | quadratic primitive from slope, point and real-root sum |

**Additional actual DB originals: every row has two candidates**

| External ID | Actual original UUID | Exact calculus template |
|---|---|---|
| tb-8efe3eab86adf1ee-0-3 | 51cbae37-b73d-418a-ae8c-01198db74d47 | tangent slope at a stated curve point |
| tb-78b714135ee75557-0-4 | b8fdaba8-cfe2-4076-a4bc-c7a9ebaaa59d | tangent slope, both subquestions |
| tb-0d614b6b2ab97c0e-0-3 | 01de9da1-2305-42ed-93cb-7f6bf7aad44a | tangent slope, all four subquestions |
| tb-51f73cb8e605cd4b-0-1 | da988df9-afc7-4d08-a3fa-c3c24d76a5ab | tangent equations at curve points, both subquestions |
| tb-51f73cb8e605cd4b-0-2 | c88ba4b9-90fc-485b-afc1-e4a143178642 | given slopes, both subquestions and all cubic contacts |
| tb-d829a30f9a1296d3-0-1 | 05965996-b3fd-4ab5-a0d1-22f5f9f8f48b | tangent equation at a stated curve point |
| tb-ddd78a867901887b-0-1 | 4a9dc81f-7a26-482a-ae17-1488a45ef8dc | tangent equation with given slope |

**Proof and rejection behavior**

Full prompt frames and every ordered mathematical field select the recipe; source ID, unit and chapter do not select a fallback. An exact rational polynomial grammar recalculates answers without JavaScript evaluation of source text. Most variants use positive vertical scaling and horizontal translation; constrained monic cubics use translation plus vertical shift; parameter identities use coherent numerical changes or invertible parameter rescaling. All subquestions, labels, request type and source frame remain intact. `changedLiterals` records the number of changed mathematical fields.

Every stated curve point is checked. Contact and critical-point solvers prove the full set of real roots, including repeated roots, or reject unsupported irrational/unsolved cases. Open interval images exclude endpoints; global extrema include both endpoints and every in-domain critical point. Cubic limit conditions include both the finite value and derivative, and the local maximum requires a negative second derivative. Integral identities check their lower-bound value; reversed integrals check both integrands and oriented bounds. Braking requires positive initial speed, negative constant acceleration, the first positive zero of velocity, and nonnegative speed up to that stop. Primitive root-sum questions verify both Vieta's relation and real-root discriminants.

Each emitted full question is reparsed and solved as a new source. The validation boundary regenerates the pair against the current untouched source and compares every DTO field, including solution and proof metadata. Tests reject mutation of every candidate field, source flag/time/provenance changes, altered answers, missing/reordered slots, off-curve points, impossible slopes, incorrect limit denominators, nonmaximum cubic conditions, nonmonotone domains, inconsistent integral basepoints, zero cancellation factors, wrong reverse bounds and invalid braking signs.

**Verification evidence**

- [Independent SymPy proof](independent-math.json): all **27 source questions**, all **54 candidate questions**, **82 candidate answer expressions**, zero failures. This separate Python implementation reads actual question/answer text, differentiates/integrates/solves with SymPy, and ignores `validation.computedAnswers`. Its file SHA-256 binds the whole candidate packet; individual entries also bind question, answer and full solution text.
- [KaTeX render check](math-render-check.json): **820 math fragments** from all 54 questions, answers and full solutions, zero errors. Browser/page layout verification remains the coordinator's integration step.
- [Base regression](base-tranche-regression.json): all **828 pairs** generated by commit `6a43dd917` remain byte-identical, zero changes.
- Focused calculus/base/geometry suites: **104 tests passed**. Targeted TypeScript project and ESLint for all newly authored TypeScript files passed. No whole-application build was claimed.

The complete corpus census reconciles **12,301 = 828 existing base + 27 new calculus + 11,446 outside this calculus implementation**. These are calculus-only counts; the geometry worker's tranche is not included as newly covered here. Remaining reasons: 4,512 unsupported calculus question formats, 4,406 unmatched full templates, 2,524 figure-dependent questions, and four source-specific mismatches in different unsupported templates (one each parameter shape, integral-identity shape, continuity-limit shape, nonpolynomial scalar division). These four are not members of the recovered 20 or covered seven.

**Artifacts and reproduction**

[Census summary](census/summary.json), [all 27 covered UUIDs/digests](census/covered.json), and [complete actual source/candidate packet](census/candidates.json) are committed. The complete 11,446-ID unresolved file is retained locally at `census/unresolved.json` (SHA-256 `d37bae5e7d9f3a5c935001661f7ac95e5beb61c82bcae3818581fe29843fb85c`), omitted from Git due to size, and reproducible from the exact full snapshot and committed script.

```powershell
node node_modules/tsx/dist/cli.mjs scripts/import/textbook/variants-calculus-20261011/census.ts C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/after-source-qualification/source-snapshot.json docs/planning/tracks/reports/textbook-variants-calculus-20261011/recovered-sources.json docs/planning/tracks/reports/textbook-variants-calculus-20261011/census
python -X utf8 scripts/import/textbook/variants-calculus-20261011/verify_math.py docs/planning/tracks/reports/textbook-variants-calculus-20261011/census/candidates.json docs/planning/tracks/reports/textbook-variants-calculus-20261011/independent-math.json
node node_modules/tsx/dist/cli.mjs scripts/import/textbook/variants-calculus-20261011/render-check.ts docs/planning/tracks/reports/textbook-variants-calculus-20261011/census/candidates.json docs/planning/tracks/reports/textbook-variants-calculus-20261011/math-render-check.json
node node_modules/vitest/vitest.mjs run src/__tests__/unit/schoolTextbookVariantsCalculus.test.ts src/__tests__/unit/schoolTextbookVariants.test.ts src/__tests__/unit/schoolTextbookVariantsGeometry.test.ts
node node_modules/typescript/bin/tsc --project scripts/import/textbook/variants-calculus-20261011/tsconfig.json --noEmit
```
