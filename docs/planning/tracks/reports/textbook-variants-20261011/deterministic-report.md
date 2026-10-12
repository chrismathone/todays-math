# Textbook retry variant primitives — 2026-10-11

The deterministic tranche covers **828 of 12,281 originals**, producing **1,656 candidates**, exactly two per matched source. **11,453 originals remain unresolved**. This is a verified partial authoring tranche, not a claim that every textbook original has retry coverage.

## Input and accounting

- Read-only snapshot: `C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/source-snapshot.json`.
- Snapshot SHA-256: `0328ed69db13e4a5c0d3fb258ebf520e82e0a5c18983b287654fd83660cbd0f4`.
- All originals: 12,281; usable: 11,806; held: 475; existing children: 79.
- All 475 held sources remain in the denominator. A held source must be recovered and approved, then passed through the same content/answer checks; its held state is never bypassed.
- Existing children are not counted as verified pairs merely because they share an origin or unit.
- Source originals, family metadata and existing children were not modified by this worker. No shared database writes, API calls, deployments, push, or nested agents occurred.

| Grade | Originals | Matched | Unresolved |
|---|---:|---:|---:|
| 중1 | 4,943 | 699 | 4,244 |
| 중2 | 3,559 | 58 | 3,501 |
| 공통수학1 | 960 | 44 | 916 |
| 공통수학2 | 705 | 0 | 705 |
| 대수 | 749 | 2 | 747 |
| 미적분1 | 585 | 20 | 565 |
| 확률과 통계 | 555 | 5 | 550 |
| 기하 | 225 | 0 | 225 |
| **Total** | **12,281** | **828** | **11,453** |

## Supported source structures

Each matcher recognizes a complete prompt and the ordered mathematical fields. Merely sharing a unit never selects a recipe. Multi-part questions are all-or-nothing, retaining the entire original question frame and labels.

| Recipe | Matched originals | Numerical relationship |
|---|---:|---|
| `exact-calculation` | 668 | Parse operators, signed constants, decimal precision, fractions, variables and fixed integer powers; recalculate over exact rationals/polynomials, including `i²=-1`. Numeric data leaves vary consistently; symbolic identities use invertible single-variable rescaling. |
| `exact-substitution` | 90 | Parse explicit numeric assignments and every requested expression; vary assignments and substitute into the same expressions. |
| `exact-factorization` | 18 | First expand the source answer to verify it equals the original. Rescale a variable in the question and verified factors, preserving grouped or expanded source presentation, then check exact product equality. |
| `exact-derivative` | 12 | Recognize explicit polynomial function assignments, retain the prompt, rescale the variable, differentiate each term. |
| `exact-gcd` | 11 | Recognize precisely grouped operands, apply common scaling, recompute GCD, retain integer or prime-factor input presentation. |
| `exact-prime-factorization` | 9 | Preserve the prime multiplicity pattern while substituting a different prime and recalculating the input/product. |
| `exact-polynomial-coefficient` | 5 | Preserve the requested monomial; rescale the original expression, expand and extract that exact coefficient. |
| `exact-lcm` | 5 | Same operand relationship as GCD, with exact LCM recomputation. |
| `exact-polynomial-limit` | 4 | Finite rational-polynomial limits at numeric points; translate the variable/point and multiply the output, preserving vanishing/cancellation order. Infinite and unproved limits are rejected. |
| `exact-polynomial-integral` | 4 | Definite polynomial integral with explicit rational bounds; rescale the polynomial, verify the primitive by differentiation, evaluate the oriented endpoint difference. |
| `exact-linear-equation` | 2 | Parse both sides, retain the linear solving question, recompute the unique root and substitute into both sides. |

For supported numeric multiple-choice questions, the original correct position and option offsets are retained and exactly one option must equal the newly calculated answer. Factored GCD/LCM options retain factored presentation. Short answer and multiple choice remain their original types; this tranche does not manufacture descriptive questions from short answers.

## Contract and guarded application

`src/lib/import/schoolTextbook/variants.ts` exports:

- `TextbookVariantSource`: snapshot snake_case problem DTO.
- `generateTextbookVariantPair(source)`: either `matched` with ordered slots `[1,2]`, or `unresolved` with source ID, digest, reason and detail.
- `textbookVariantSourceDigest(source)`: SHA-256 over all stably serialized source problem fields, binding eligibility, original links, content, answer, solution, all figure metadata, unit, family and update time.
- `validateTextbookVariantPair(source, candidates)`: regenerates from the current source and compares every candidate field; a boolean proof or altered packet cannot bypass it.

Candidates contain source/origin/material/unit/external/file links, inherited `familyKey`, `source: transformed`, `externalId: tb-retry-v1:<original UUID>:<1|2>`, question type, content, answer, solution, explicit figure fields, recipe/method, source digest and validation evidence. Originals retain their existing `solo:` family metadata. Both slots are returned together, must differ from the original and each other, and are never replaced by random unit problems.

The coordinator owns the guarded bulk loader and eligibility/review policy. This module does not approve or insert candidates. Generated diagrams are not implemented; copying a diagram with old numbers would not be safe.

## Verification

- 39 meaningful unit tests pass. They cover exact fractions/decimal precision, unary signs and exponent precedence, conjugate complex division, complete multi-part answer checking, polynomial identities and factor certificates, substitution, derivative/product differentiation, removable and divergent limits, oriented definite integrals, coefficient extraction, GCD/LCM, prime multiplicities, MCQ uniqueness, inherited links, unchanged sources, stale digests, tampered content/answer/solution/evidence, held/diagram/type gates, malformed syntax and arithmetic limits.
- Strict scoped TypeScript and ESLint checks pass; touched TypeScript files pass Prettier.
- Independent **SymPy 1.14.0** recomputation checks **all 1,656 candidates / 3,184 subquestions**, with **zero failed candidates**. This uses a separate arithmetic engine and independently checks derivatives, limits, integrals, factor products, substitutions and option uniqueness.
- Candidate packet SHA-256: `08a30b25666bed31be2975b387b0203d6be8eb5dd9136548d38df8476cfe55d9`.
- Regression against initial delivered commit `96d1e956af679b49fcb90528a969d8f774340ad9`: **all 679 earlier pairs remain byte-identical**, zero changed pairs. Existing staged siblings therefore do not require replacement.
- The coordinator reported its initial 679-source tranche had no additional production-render/metadata rejection. This worker's verification does not claim human review, complete achievement-standard alignment or measured student learning effects.

## Exact unresolved coverage

| Reason | Originals |
|---|---:|
| `no-exact-template` | 7,130 |
| `figure-dependent` | 3,573 |
| `source-held` | 475 |
| `unsupported-math-syntax` | 196 |
| `variable-denominator` | 43 |
| `mcq-nonnumeric` | 15 |
| `insufficient-distinct-pair` | 8 |
| `source-answer-mismatch` | 6 |
| `exponent-limit` | 3 |
| `number-list-shape` | 2 |
| `source-answer-shape` | 2 |
| **Total** | **11,453** |

The six answer mismatches are unresolved correspondence checks, not an assertion that their official answers are wrong: ambiguous extracted notation can also produce such a mismatch. Remaining work requires additional exact source templates or individually authored, mathematically checked pairs, diagram reconstruction/validation where needed, and recovery of held originals. Unknown structures remain explicit and fail closed.

## Reproducible commands and artifacts

From this worktree with main's installed `node_modules` available:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/schoolTextbookVariants.test.ts --environment node
node node_modules/tsx/dist/cli.mjs scripts/import/textbook/variants-20261011/coverage.ts C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/source-snapshot.json C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/deterministic-variants
python scripts/import/textbook/variants-20261011/verify_math.py C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/deterministic-variants/candidates.json C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/deterministic-variants/independent-math.json
node node_modules/tsx/dist/cli.mjs scripts/import/textbook/variants-20261011/regression.ts 96d1e956af679b49fcb90528a969d8f774340ad9 C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/source-snapshot.json C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/deterministic-variants/initial-tranche-regression.json
```

Live artifact directory: `C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/deterministic-variants/`.

- `candidates.json`: every generated source-linked DTO.
- `unresolved.json`: every unresolved original ID/digest, grade, source question type, reason and detail.
- `summary.json`: exact denominator, grade, recipe and rejection counts.
- `independent-math.json`: independent arithmetic result, bound to candidate bytes.
- `initial-tranche-regression.json`: byte-level regression evidence for the first delivered tranche.

Small evidence reports are copied beside this report. Candidate and unresolved packets remain in the artifact directory to avoid committing large snapshots.
