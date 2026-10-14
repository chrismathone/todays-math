# Elementary arithmetic v2 implementation — 2026-10-14

Implemented **27 genuine direct-arithmetic definitions**: 초3 6, 초4 9, 초5 8,
초6 4. Export: `ELEMENTARY_ARITHMETIC_DEFINITIONS` from
`src/lib/arithmetic-v2/families/elementary.ts`. Base commit: `cc3db6805`.

The sum of per-family domain sizes is **149,625,580**. This is not a
cross-family deduplicated total or a claim of curriculum completeness. Grade
placements follow the Korean audit in
`docs/planning/arithmetic-grade-coverage-20261014.md`, within the authorized
direct-arithmetic scope in `docs/planning/arithmetic-expansion-20261014.md`.
The dispatch's Japanese/Korean wording was corrected by the coordinator to
Korean only. No new official curriculum alignment or learning-effect claim is made.

## Integration contract and scope

- Shared `types.ts` is unchanged. No catalog, core, contract, API, UI, v1,
  package, or lockfile changes are part of this commit.
- Imports do no I/O and call no external model. No DB writes, deployment, or
  push was performed. Root owns integration, persistence, UI, print verification,
  and the compatibility/writer gate.
- All IDs start `elem-gN-`. Rank groups start `elementary-`; suffixes are
  `natural-add/sub/mul/div/mixed`, `fraction-same-add/sub`,
  `fraction-unlike-add/sub`, `fraction-mul/div`, and `decimal-add/sub/mul/div`.
  Ranking is only within those explicit families.
- Prompts contain expressions, never answers. Natural ±/× use the frozen
  vertical layout; other expressions supply both text and LaTeX. Fraction
  instructions request reduction and mixed-number display; division with
  remainder explicitly asks for both quotient and remainder.
- Integer answers are canonical unsigned integer strings. Rational answers are
  reduced `[numerator, denominator]`, including `0/1` and denominator `1` for
  whole results, with positive denominator. Improper results display as mixed
  numbers. Decimal answers are `[coefficient, scale]`, with trailing coefficient
  zeroes removed while scale is positive; zero is `["0", "0"]`. Remainder
  answers are `[quotient, remainder]` and include a displayed zero remainder.
- Input operand order is significant. Same-denominator practice deliberately
  keeps unreduced input representations (e.g. denominator 4 is preserved in
  `2/4 + 1/4`). Unlike-denominator and multiplicative fractions use reduced
  inputs; equivalent spellings cannot inflate those domains.
- Every decimal operand has a nonzero fractional part; whole numbers are not
  disguised as decimals. Decimal division by a natural number is a separate,
  explicit family.
- The frozen family contract has no seed/batch API. Root must enforce batch
  deduplication/capacity and snapshot compatibility; a per-family count must not
  be interpreted as a sum-safe mixed-selection count without overlap checking.

## Exact domain inventory

The `elem-` prefix below is part of every ID.

| ID                             | Grade | Exact domain size | Inputs                                                       |
| ------------------------------ | ----- | ----------------: | ------------------------------------------------------------ |
| `elem-g3-add-3digit`           | 초3   |           810,000 | 100–999 + 100–999                                            |
| `elem-g3-sub-3digit`           | 초3   |           405,450 | 100–999 − 100–999, left ≥ right                              |
| `elem-g3-mul-3x1`              | 초3   |             8,100 | 100–999 × 1–9                                                |
| `elem-g3-mul-2x2`              | 초3   |             8,100 | 10–99 × 10–99                                                |
| `elem-g3-div-2x1-remainder`    | 초3   |               810 | 10–99 ÷ 1–9                                                  |
| `elem-g3-div-3x1-remainder`    | 초3   |             8,100 | 100–999 ÷ 1–9                                                |
| `elem-g4-mul-3x2`              | 초4   |            81,000 | 100–999 × 10–99                                              |
| `elem-g4-div-2x2-remainder`    | 초4   |             4,095 | 10–99 ÷ 10–99, dividend ≥ divisor                            |
| `elem-g4-div-3x2-remainder`    | 초4   |            81,000 | 100–999 ÷ 10–99                                              |
| `elem-g4-fraction-same-add`    | 초4   |               506 | Two positive proper fractions, same denominator 2–12         |
| `elem-g4-fraction-same-sub`    | 초4   |               286 | Same, left ≥ right                                           |
| `elem-g4-mixed-same-add`       | 초4   |             4,554 | Same denominator 2–12, each whole part 1–3                   |
| `elem-g4-mixed-same-sub`       | 초4   |             2,376 | Same, left ≥ right; borrowing included                       |
| `elem-g4-decimal-add`          | 초4   |        98,010,000 | Nonwhole hundredths 0.01–99.99                               |
| `elem-g4-decimal-sub`          | 초4   |        49,009,950 | Same, left ≥ right                                           |
| `elem-g5-natural-mixed`        | 초5   |            80,550 | Four two-operation shapes described below                    |
| `elem-g5-fraction-unlike-add`  | 초5   |             1,776 | Reduced proper fractions, different denominators 2–12        |
| `elem-g5-fraction-unlike-sub`  | 초5   |               888 | Same, left > right                                           |
| `elem-g5-mixed-unlike-add`     | 초5   |            15,984 | Different denominators 2–12, each whole part 1–3             |
| `elem-g5-mixed-unlike-sub`     | 초5   |             7,992 | Same, left > right; borrowing included                       |
| `elem-g5-fraction-mul`         | 초5   |            32,400 | Reduced nonwhole fractions, whole part 0–3, denominator 2–12 |
| `elem-g5-fraction-mul-natural` | 초5   |             1,620 | Those fractions × natural number 1–9                         |
| `elem-g5-decimal-mul`          | 초5   |           980,100 | Nonwhole hundredths 0.01–9.99; exact product scale ≤4        |
| `elem-g6-fraction-div`         | 초6   |            32,400 | Same fraction pool; both operands positive                   |
| `elem-g6-fraction-div-natural` | 초6   |             1,620 | Those fractions ÷ natural number 1–9                         |
| `elem-g6-decimal-div`          | 초6   |            31,312 | Nonwhole hundredths 0.01–9.99; exact quotient scale ≤3       |
| `elem-g6-decimal-div-natural`  | 초6   |             4,611 | Those decimals ÷ 1–9; exact quotient scale ≤3                |

Mixed-natural parameters are `[mode, a, b, c]`:

| Mode | Expression    | Domain                      |   Size |
| ---: | ------------- | --------------------------- | -----: |
|    0 | `a + b × c`   | a=1–100; b,c=1–12           | 14,400 |
|    1 | `(a + b) × c` | a=1–100; b,c=1–12           | 14,400 |
|    2 | `a ÷ b + c`   | b=2–9; a=bq, q=1–9; c=1–100 |  7,200 |
|    3 | `(a − b) × c` | 1≤b<a≤100; c=1–9            | 44,550 |

Other natural/decimal parameters are `[left, right]`, with decimal operands
represented in hundredths, except the second operand in decimal÷natural.
Fraction parameters are `[leftNumerator, leftDenominator, rightNumerator,
rightDenominator]`; whole parts are encoded in improper numerators. The natural
operand in fraction×/÷natural has denominator 1.

## Count and uniqueness reasoning

Cartesian natural domains use mixed-radix selection. A nonnegative subtraction
domain with N operands has N(N+1)/2 entries; integer binary search locates its
triangular row, avoiding square-root rounding. Mixed expressions use disjoint
mode blocks. No sampled capacity or random retry determines a count.

Same-denominator proper fractions use `sum((d−1)^2)=506` addition pairs and
`sum((d−1)d/2)=286` subtraction pairs for d=2…12. Mixed-number pools contain
3(d−1) values per denominator, producing 4,554 and 2,376 pairs. There are 45
reduced positive proper fractions with denominators 2…12. Removing equal-
denominator pairs leaves 1,776 ordered unlike pairs; exactly half are positive
subtractions, since distinct reduced denominators cannot represent equal values.
Three possible whole parts multiply the unlike addition/subtraction counts by 9. The multiplicative pool contains 4×45=180 fractions; pairs give 32,400,
and pairing with 1…9 gives 1,620.

Fraction indexing stores operand pools and per-left row counts, not a full
problem table. Binary search finds a row; a bounded scan of at most 198 operands
selects its member. Membership checks the explicit pool and operator condition,
without calling the index decoder.

There are 9,900 nonwhole hundredth coefficients 1…9,999, and 990 coefficients
1…999. Index k maps to `k+1+floor(k/99)`, skipping multiples of 100. Decimal
add/subtract/multiply domains follow the product/triangle formulas directly.

For decimal division A/B, an exact quotient of at most three places exists iff
B divides 1000A. For `(A/100) ÷ B`, B must divide 10A. For each divisor, valid
numerators are multiples of `step=B/gcd(B,1000)` or `B/gcd(B,10)`. Excluding whole
dividends removes each `period=100/gcd(step,100)`th multiplier. Counts are
`floor(999/step) − floor(floor(999/step)/period)`. Only divisor row counts are
stored (at most 990 rows); unranking skips excluded multiples arithmetically.
The test oracle independently reduces every possible input fraction and factors
the denominator into 2s and 5s, rather than using this divisibility formula.

## Independent verification and tests

Generation uses exact small integer arithmetic; verification uses BigInt
cross-products/inverse relations. `verify` never calls `problemAt`, `domain.at`,
or the answer calculator. It checks safe integer parameters and domain
membership, all prompt fields including the instruction, answer kind and
canonical integer strings, numeric relations, and canonical text/LaTeX display.
Remainders obey `dividend = divisor × quotient + remainder`, with
`0 ≤ remainder < divisor`. Negative results, zero divisors, unreduced answers,
extra precision, changed prompts, and mismatched answers are rejected.

`src/__tests__/unit/arithmeticV2Elementary.test.ts` contains 65 tests. A separate
test-only expression parser evaluates printed text with rational BigInt
arithmetic and does not import production arithmetic or domain helpers. It also
reconstructs the prompt operands from parameters independently. Trial division
checks reduced rational answers; independent 2/5 factorization checks decimal
division membership and counts.

- All **167,530 candidates in 19 domains of size ≤40,000** are exhausted for
  membership, parameter and prompt uniqueness, exact prompt/parameter
  correspondence, and independent numeric/display checks.
- **20,466 representative candidates in 8 large domains** use boundaries,
  evenly distributed positions, and a deterministic pseudorandom sequence.
  Combined primary candidate checks: **187,996**.
- Additional checks cover every triangular row boundary: 19,800 generated
  decimal-subtraction entries and 1,800 natural-subtraction entries.
- All definitions reject noninteger, nonfinite, negative, and out-of-range
  indices; repeated indices reproduce exactly. Each definition has prompt,
  instruction, numeric/display answer, malformed shape, and valid-but-mismatched
  parameter tamper tests.
- Hand checks include `407−168=239`, `808÷8` with quotient 101,
  `745÷23` with quotient 32/remainder 9, mixed-number borrowing,
  `3/4+2/3=1 5/12`, `3/4÷2/5=1 7/8`, `2.05−0.78=1.27`,
  `1.2×0.35=0.42`, `1.26÷0.3=4.2`, and `0.01÷2=0.005`.

Validation commands:

```text
node node_modules/vitest/vitest.mjs run src/__tests__/unit/arithmeticV2Elementary.test.ts
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2017 --lib ESNext,DOM --module esnext --moduleResolution bundler --esModuleInterop --skipLibCheck src/__tests__/unit/arithmeticV2Elementary.test.ts
node node_modules/eslint/bin/eslint.js src/lib/arithmetic-v2/families/elementary.ts src/lib/arithmetic-v2/families/elementary src/__tests__/unit/arithmeticV2Elementary.test.ts
```

The first test run had 64 passes and one timeout in exhaustive fraction division;
no arithmetic assertion failed. Moving repeated trial-factor assertions to a
single result assertion retained every candidate/factor check and resolved it
(65/65 passed). The final run including parameter-correspondence assertions
also passed **65/65**, in **43.02 seconds** (40.44 seconds of test execution).
Targeted strict TypeScript and ESLint also passed on those final files.
No full app build or UI/print test is claimed by this worker.

## Print stress examples for root integration

Indices below are zero-based. These are long expression/answer cases, not a
validated difficulty ordering or measured pixel-width maximum. Fraction and
division candidates were scanned exhaustively for combined text length; the
three large decimal domains used the representative sample. Fraction÷natural
and decimal÷natural choose nontrivial division with long inputs instead of a
trivial divide-by-1 tie. The UI must render the candidate's actual LaTeX fields.

| ID (prefix `elem-`)       |      Index | Prompt            | Answer     |
| ------------------------- | ---------: | ----------------- | ---------- |
| `g4-fraction-same-add`    |        384 | 10/11 + 10/11     | 1 9/11     |
| `g4-fraction-same-sub`    |        284 | 11/12 − 10/12     | 1/12       |
| `g4-mixed-same-add`       |      2,844 | 1 10/11 + 1 10/11 | 3 9/11     |
| `g4-mixed-same-sub`       |      2,321 | 3 10/12 − 1 11/12 | 1 11/12    |
| `g5-fraction-unlike-add`  |      1,611 | 10/11 + 11/12     | 1 109/132  |
| `g5-fraction-unlike-sub`  |        803 | 10/11 − 1/12      | 109/132    |
| `g5-mixed-unlike-add`     |     12,399 | 1 10/11 + 1 11/12 | 3 109/132  |
| `g5-mixed-unlike-sub`     |      7,246 | 3 10/11 − 1 11/12 | 1 131/132  |
| `g5-fraction-mul`         |     28,425 | 2 10/11 × 3 8/11  | 10 102/121 |
| `g5-fraction-mul-natural` |      1,276 | 1 4/11 × 8        | 10 10/11   |
| `g6-fraction-div`         |     28,431 | 2 10/11 ÷ 1 11/12 | 1 131/253  |
| `g6-fraction-div-natural` |      1,619 | 3 11/12 ÷ 9       | 47/108     |
| `g4-decimal-add`          | 98,009,998 | 99.99 + 99.98     | 199.97     |
| `g4-decimal-sub`          |  2,442,117 | 22.32 − 11.84     | 10.48      |
| `g5-decimal-mul`          |    980,098 | 9.99 × 9.98       | 99.7002    |
| `g6-decimal-div`          |      5,553 | 8.01 ÷ 0.08       | 100.125    |
| `g6-decimal-div-natural`  |      1,979 | 9.99 ÷ 2          | 4.995      |

## Exclusions and remaining owner work

No word problems, geometry, equation solving, factoring, ratios, standalone
conversions, GCD/LCM drills, rounding, or quota fillers were added. There are no
negative elementary results, recurring decimals, or rounded division answers.
This is a bounded selection of genuine arithmetic, not all possible variants
(for example, mixed natural expressions have two operations, and mixed fraction
addition/subtraction pairs both have nonzero whole parts).

Root still needs to integrate the export, run combined version/seed/batch/storage
regressions, and verify actual UI and print layouts. Orca's startup dependency
setup modified lockfile metadata/optional entries; after the coordinator
identified that setup-only drift and instructed restoration, it was restored
and excluded from this work.
