# Exact domain/range answer notation — 2026-10-11

Task: `task_54a374897dc4`; dispatch: `ctx_b177c3c32c04`.

## Delivered scope

- `src/lib/import/schoolTextbook/domainRangeAnswerNotation.ts`
- `src/__tests__/unit/domainRangeAnswerNotation.test.ts`
- This report.

The new helper exports
`compareDomainRangeAnswerNotation(left: string, right: string, question: string): boolean | null`.
It imports only the existing pure `intervalAnswerKey`, which was not changed.
There are no external dependencies, evaluation of source code, providers, AI,
database, network, environment or authentication calls. No production integration,
source questions, stored answers, blind answers or other existing files changed.
The existing `node_modules` junction remains directed at
`C:\Creative\testautocreator\node_modules`.

## Meaning and integration boundary

- `true`: every supported labelled domain/range pair denotes the same exact real
  range, with every numbered subpart present in its original position.
- `false`: both answers parse, but at least one exact domain/range key differs.
- `null`: the question or either complete answer is unsupported, incomplete,
  ambiguous, malformed or over budget. Even identical unsupported answers yield
  `null`.

Only `=== true` is new notation-equality evidence. This helper does not solve the
functions, prove that either answer is mathematically correct for the question,
or authorize changing either answer. Integration and actual retry review remain
with the coordinator, preserving all existing qualification and binding gates.

## Supported context

The entire source question must start with the explicit Korean instruction
`다음 함수의 정의역과 치역을 구하시오`, optionally saying `실수 함수` and using
a period or colon before the expressions. No extra prose, assumptions, units,
restricted-variable declarations or additional question clauses are ignored.

Every expression must use dependent variable `y` and independent variable `x`:

- A nonconstant affine expression in `x`, with rational coefficients and shift.
  Fractional coefficients written with a solidus require explicit `*`.
- A positive numeric base other than one raised to `x`, with an optional
  rational vertical shift. Fractional bases require parentheses. Exponent `x`
  may have LaTeX grouping braces.
- `log_b(ax+c)` with numeric positive base other than one, nonzero `x`
  coefficient and optional rational shift. Fractional log bases require braces.

This small allowlist covers the supplied exponential/logarithmic question and
its changes. It deliberately excludes unspecified `f(x)`, powers such as `x^2`,
reciprocals, roots, trigonometric functions, composed/general expressions,
parameter-dependent functions and undeclared `t`/`u` variables. It is a context
gate, not general algebra, calculus or function equivalence.

## Complete answer structure

Part markers `(1)`, `⑴` and `①` are alternate spellings. Numbered parts must
start at one, be consecutive and ordered, and have the same count as the source
question. Duplicate, missing, reordered, extra and unnumbered multipart answers
return `null`; swapping contents under otherwise valid numbers returns `false`
when the resulting ranges differ.

A single part may omit its number, including when the source labels its sole
part `(1)`. Every part must contain both explicit labels, in order:
`정의역: ... , 치역: ...` (whitespace/newline can replace the separator comma).
The domain is always `x`; the range is always `y`. Wrong set binders or condition
variables fail closed; no variable renaming repairs them. Labels cannot be
dropped, duplicated or swapped.

## Exact range notation

Supported field values are all-real notation, intervals, set-builder conditions
and explicit one-variable inequalities with numeric rational bounds. They allow:

- `ℝ`, `\mathbb{R}`, `\mathbb R` and `실수 전체의 집합`.
- Ordinary or escaped set braces; a plain `|` or `:` separator, or `\mid`.
- Matched LaTeX `\left`/`\right` sizing and one complete outer math wrapper.
- Integers, finite decimals and integer fractions, including `\frac`, `\dfrac`
  and `\tfrac`; calculations use exact BigInt rational pairs.
- Open/closed finite endpoints, negative infinity only at an open lower end,
  positive infinity only at an open upper end, and explicit exclusions `!=`,
  `≠`, `\ne`, `\neq`.
- Comma conjunctions and monotone chains in set conditions; logical disjunction
  uses `또는`, `\lor` or `∨`. Interval unions use `∪` or `\cup`. These separator
  kinds are not silently interchanged.

Intervals acquire `x` or `y` solely from the validated explicit field label.
They are converted to exact inequalities and passed to the unchanged interval
helper. All-real and exclusion-only fields split at zero into two bounded
branches so the helper can canonicalize them without losing exclusions.
Canonicalization compares the actual real ranges, including endpoint closure,
holes and disconnected components, rather than literal inequality ordering.

Units and unsupported prose are rejected even when identical on both sides;
none are stripped to create equality evidence. Finite sets, singletons, empty or
reversed intervals, empty/singleton condition branches, ambiguous bracket
conventions, mixed variables, unknown commands/functions, symbolic bounds,
zero denominators, nonfinite numeric spellings and incomplete wrappers fail
closed. A fraction cannot absorb adjacent digits: `1\frac{2}{3}` and
`\frac{1}{2}3` do not become `12/3` and `1/23`.

## Captured example and perturbations

The test includes the supplied source:

```text
다음 함수의 정의역과 치역을 구하시오
(1) y=(1/2)^x-1
(2) y=log_2(1-3x)+1
```

Both directions of the following complete comparison return `true`:

```text
⑴ 정의역: 실수 전체의 집합, 치역: $\{y\mid y>-1\}$ ⑵ 정의역: $\left\{x\mid x<\frac{1}{3}\right\}$, 치역: 실수 전체의 집합
(1) 정의역: ℝ, 치역: (-1, ∞) (2) 정의역: (-∞, 1/3), 치역: ℝ
```

Matching variants with `-2` / `2/5` and `3` / `2` also pass. One-sided changes to
these bounds, endpoint closure, infinity direction, domain/range roles, subpart
contents or exclusions do not pass. Decimal approximations of `1/3` do not equal
the exact fraction; neighboring integers beyond JavaScript's safe integer limit
remain distinct. These are supplied/injected fixtures, not a measurement of the
actual retry cohort.

## Bounds

| Resource                                                       |             Limit |
| -------------------------------------------------------------- | ----------------: |
| Each raw answer                                                |  8,000 characters |
| Raw source question                                            | 16,000 characters |
| Each raw field / function expression                           |  1,024 characters |
| Complete ordered subparts                                      |                16 |
| Digits per numeric literal, numerator and denominator combined |                64 |
| Bracket / sizing nesting                                       |                 8 |
| Input disjuncts / interval components per field                |                 8 |
| Conditions per branch                                          |                16 |

The reused interval helper additionally caps its generated input at 2,000
characters and 16 branches / conditions. Exclusion-only splitting may encounter
that tighter generated-input budget; it returns `null`. No recursive expression
evaluation is performed. Numeric multiplication is limited to bounded rational
cross-products; source powers are never evaluated.

## Verification

Final result: **183 tests passed**. Both comparison directions are checked for
the principal supported and unsupported pairs. Coverage includes the exact
captured example, its requested variants, all field/part/variable/bound/unit
perturbations, exclusions, malformed input, infinity direction, exact rational
and large-integer behavior, unknown context/functions, fraction token boundaries,
depth/length/literal/branch/term limits, and the complete 16-part boundary.

The pure test run bypassed repository configuration, shared setup and environment
loading, with setup and environment time both reported as zero:

```js
import { startVitest } from "vitest/node";
const ctx = await startVitest(
  "test",
  ["src/__tests__/unit/domainRangeAnswerNotation.test.ts"],
  { config: false, environment: "node", setupFiles: [], watch: false },
);
if (!ctx) throw new Error("Vitest did not start");
process.exitCode =
  ctx.state.getCountOfFailedTests() || ctx.state.getUnhandledErrors().length
    ? 1
    : 0;
await ctx.close();
```

Targeted strict types and lint both exited zero:

```text
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2017 --lib ESNext,DOM --module ESNext --moduleResolution Bundler --skipLibCheck src/lib/import/schoolTextbook/domainRangeAnswerNotation.ts src/__tests__/unit/domainRangeAnswerNotation.test.ts
node node_modules/eslint/bin/eslint.js src/lib/import/schoolTextbook/domainRangeAnswerNotation.ts src/__tests__/unit/domainRangeAnswerNotation.test.ts
```

Repository `AGENTS.md`, the installed Next.js Vitest and TypeScript guides, and
the version-matched Orca orchestration skill were read. No nested agents were
launched. The coordinator owns integration, merge, broader checks and retry review.
