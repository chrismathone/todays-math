# Conservative scalar answer notation — 2026-10-11

Task: `task_f9a6e1cf8a7c`; dispatch: `ctx_9e9487ce016e`.

## Delivered scope

- New pure helper: `src/lib/import/schoolTextbook/scalarAnswerNotation.ts`.
- New injected unit tests: `src/__tests__/unit/scalarAnswerNotation.test.ts`.
- This report.

The helper exports `compareScalarAnswerNotation(left, right, question): boolean | null`.
No existing comparator, review, qualification, contracts, QA scripts, UI, source
records or frozen blind answers were changed. No model, paid provider, database,
engine, network or environment access is present in the helper or tests. No new
dependencies were added, and the existing `node_modules` junction was preserved.

## Contract and proof boundary

`true` means the two supported expressions have the same conservative canonical
structure after exact rational arithmetic and scalar commutative ordering.
`false` means both expressions parse but their canonical forms differ; it is **not**
a proof that the mathematical values differ. `null` means unsupported, ambiguous,
malformed, known undefined numeric syntax, or beyond the parser budget. Neither
`false` nor `null` permits changing an answer to agree with another record.

The parser accepts a closed token vocabulary and constructs structural keys.
It never evaluates source code. Numeric calculations use reduced BigInt rational
pairs, never floating point samples, tolerances, substitutions or a computer
algebra package. Addition and multiplication are flattened and sorted. Signs and
numeric coefficients are exact, but symbolic terms are not collected or canceled.

Division retains its numerator and denominator in order whenever either is
symbolic. Powers and roots retain their base/radicand and exponent/degree. Even
`0*(1/x)`, `x-x`, and `a^0` retain their symbolic operands. Consequently denominator
holes, root domains and variable identities cannot disappear through cancellation,
zero multiplication, exponent evaluation, root/power conversion or substitution.

## Supported notation

- Integers, finite decimals, rational arithmetic with `+ - * /`, unary signs,
  parentheses and grouping braces.
- Single lowercase variables occurring independently in the question text.
  Their names are preserved; `x/y` and `y/x` differ.
- Unambiguous implicit products such as `4a`, `2(a+b)`, `a b`, and
  `a^{2}b^{5/2}`; explicit scalar products can reorder.
- `\frac`, `\dfrac`, `\tfrac`, `\sqrt`, and the explicit ASCII `sqrt(...)` /
  `sqrt{...}` spellings. Indexed root degrees must reduce to integers 2–64.
- Unicode `√`, `∛`, `∜`, leading root indices such as `³√8`, and signed integer
  superscripts such as `a²`, `a⁻²`, `a¹²`.
- Grouped fractional exponents, including `2^{\frac{17}{7}}` and `2^{17/7}`.
  Exponents are kept structurally; `2^3` is deliberately not evaluated to `8`.
- A single complete outer math wrapper (`$...$`, `$$...$$`, `\(...\)`,
  `\[...\]`), paired `\left`/`\right` grouping, supported LaTeX spacing, and
  `\times`, `\cdot`, `\div`, Unicode multiplication/division/minus glyphs.

All six supplied held-form pairs pass bidirectionally in a scalar a/b logarithm
question fixture: symbolic fractions, `2√3/3`, reordered signed addition,
fractional exponents and the mixed superscript/fractional-power product.
This is injected evidence only, not a measurement of the actual retry cohort.

## Deliberate exclusions

- Answer assignments, tuples, lists, subpart labels, ± answers, sets of roots,
  units, Korean prose, unsupported commands/functions, subscripts and inequalities.
- Multi-letter bare names, including `ab`, are not split into variables; write
  `a*b` or `a b`. Thus `cm`, `mm`, `kg`, `sin`, `log`, `pi`, and unknown words
  cannot silently become products. Uppercase unit `W` is unsupported as well.
- Variable arguments such as `f(a)`, `-f(a)`, `2f(a)`, and `f^2(a)` are uncertain
  functions and return null. Use explicit `*` for variable coefficients of groups.
- Ambiguous solidus products such as `a/2b` or `a/b(c+1)`, ambiguous Unicode
  radicands such as `√a²` / `√3a`, and `2³√8` fail closed. Add grouping or `*`.
- Chained ungrouped powers, symbolic root indices, numeric zero denominators,
  numeric negative even radicands, `0^0`, and negative numeric bases to fractional
  powers fail closed. No branch assumptions or missing roots are inferred.
- No distributivity, symbolic like-term combination, radical reduction or general
  algebraic identity proving. Some equal mathematical expressions remain false.

Question context must be nonempty. Matrix/vector/tensor, tuple/coordinate,
recognized subpart/order and measurement/unit contexts fail closed. A bare
`m/g/s/l/h/t` requires a nearby explicit scalar/real/integer/variable declaration
because these letters may be units. Question guards are intentionally conservative;
they can reject valid scalar answers in mixed-context questions. The helper is a
notation proof for supported scalar inputs, not a universal question classifier.

## Bounds

| Resource                              |                                                 Limit |
| ------------------------------------- | ----------------------------------------------------: |
| Each raw answer                       |                                      2,048 characters |
| Question                              |                                     16,000 characters |
| Answer tokens                         |                                512, plus end sentinel |
| Recursive parser budget               | 32 entries; nested grouping consumes multiple entries |
| Numeric literal / BigInt intermediate |                                     96 decimal digits |
| Root degree                           |                                          integer 2–64 |

Overflow, excessive nesting and malformed/truncated syntax return null. BigInt
intermediates are checked before normalization; a large expression may be rejected
even when its reduced result would be small. Powers are not computed, so a large
exponent cannot trigger exponentiation work.

## Verification

Final result: **210 tests passed**, including all supplied pairs, perturbations
of numerator/denominator/root degree/exponent, exact decimal/large integer checks,
domain-hole cases, variable swaps, unit/prose/function rejection, context guards,
malformed input, arithmetic overflow, token limits and recursive depth limits.

The test runner used Vitest's programmatic API with `config: false`, node
environment, `setupFiles: []`, and `watch: false`, selecting only the owned test
file. This bypassed repository environment loading and shared setup; reported
setup and environment time were both zero.

```js
import { startVitest } from "vitest/node";
const ctx = await startVitest(
  "test",
  ["src/__tests__/unit/scalarAnswerNotation.test.ts"],
  { config: false, environment: "node", setupFiles: [], watch: false },
);
if (!ctx) throw new Error("Vitest did not start");
process.exitCode = ctx.state.getCountOfFailedTests() ? 1 : 0;
await ctx.close();
```

Targeted strict types and lint both exited 0:

```text
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2017 --lib ESNext,DOM --module ESNext --moduleResolution Bundler --skipLibCheck src/lib/import/schoolTextbook/scalarAnswerNotation.ts src/__tests__/unit/scalarAnswerNotation.test.ts
node node_modules/eslint/bin/eslint.js src/lib/import/schoolTextbook/scalarAnswerNotation.ts src/__tests__/unit/scalarAnswerNotation.test.ts
```

Repository AGENTS instructions and the installed Next.js TypeScript/Vitest guides
were read before implementation. Broad repository checks, integration into the
current comparator, range/wording holds and the actual cohort re-review remain
with the coordinator. Only an explicit `=== true` result supplies new equality
evidence; preserve all existing review and binding gates.
