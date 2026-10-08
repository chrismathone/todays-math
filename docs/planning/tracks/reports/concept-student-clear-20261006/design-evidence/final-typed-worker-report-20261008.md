# Final typed-answer bank compatibility

Task `task_1899c46d1059`, dispatch `ctx_75ab3e1d90e1`, completed 2026-10-08 KST.

Only repository files changed by this worker:

- `src/lib/fading/typed.ts`
- `src/__tests__/unit/fadingTyped.test.ts`

Read `AGENTS.md`, the current SRS explorer integration document, the typed-answer agreement in SRS overhaul §17.11, and the installed Next.js Vitest guide. No bank/source data, dependencies, session/FSRS rules, or database records were changed; no Git staging, commits, fetches, merges, or pushes were performed.

## Change and independent evidence

The baseline typed suite had three failures: an equivalent-spelling collision, two equivalent-spelling responses incorrectly expected to be wrong, and six valid compact TeX targets left unnormalized. The parser now accepts braced arguments or individual TeX tokens, recursively reads supported nested commands, and reads complete symbol-command names before joining their output. Unknown commands, incomplete arguments, unsupported root indices, and exponent/grouping distinctions remain guarded by regressions. `fadingTypedOutcome` itself is unchanged.

The current runtime contains 9,119 entries, 2,040 groups, 12,387 targets, and 43 trap entries. The coordinator's durable runtime proof records applied bank hash `7297754857be8beba247331fd46e27b70f3696c604d9792693d130122b6f8c72`; its three OX wording amendments leave the definitions/B/C from candidate hash `5dd01e931e5a4f8a8f42aa398fa639e992be29989bc937c4b7c4adcb76031e10` unchanged.

A read-only comparison against the pre-worker `typedKey` implementation found exactly six changed target/trap spellings, with every other bank key unchanged:

| Target | New key |
| --- | --- |
| `$\frac1a$` | `1/a` |
| `$\frac xa$` | `x/a` |
| `$\frac13$` | `1/3` |
| `$\frac d2$` | `d/2` |
| `$\frac{\sqrt2}{2}$` | `(루트2)/2` |
| `$\frac h{\tan x}$` | `h/(tanx)` |

Installed KaTeX 0.18.2 independently accepted all six compact forms and produced the same MathML as their fully braced counterparts, excluding source-text annotations.

Exactly two distinct-spelling collisions exist, both explicitly locked in the full-bank regression:

- `m3-03-01-c8`: `$(b/2)^2$` and `$\left(\frac{b}{2}\right)^2$` both square the quotient of b by 2; the key is `(b/2)제곱`.
- `m3-05-02-c1`: `$\frac{\sqrt{2}}{2}$` and `$\frac{\sqrt2}{2}$` both divide the square root of 2 by 2; the key is `(루트2)/2`.

The bank outcome regression asserts correctness for all four directed equivalent-spelling comparisons and wrong outcomes for all 72,278 distinct-key comparisons. Extra regressions distinguish changed denominators, reciprocals, signs, cube/square powers, and exponent scope. Algebraic rewriting such as `b^2/4` is still unknown unless independently present as an answer/trap: no symbolic simplification was added. New unreviewed collisions still fail the exact bank collision inventory.

## Verification

Final scoped command:

```text
node node_modules/vitest/vitest.mjs run src/__tests__/unit/fadingTyped.test.ts src/__tests__/unit/fadingCards.test.ts src/__tests__/unit/fadingSession.test.ts src/__tests__/unit/fadingCompat.test.ts src/__tests__/unit/fadingContentGuard.test.ts src/__tests__/unit/fadingFsrs.test.ts src/__tests__/unit/fadingSchedule.test.ts src/__tests__/unit/fadingState.test.ts src/__tests__/unit/fadingSource.test.ts src/__tests__/unit/fadingRelearn.test.ts src/__tests__/unit/fadingRelearnCompat.test.ts --maxWorkers=1
```

Result: **11/11 files, 258/258 tests passed** (65.24 seconds). The typed file includes request-contract validation; cards/compatibility tests cover typed actions, session behavior, and stored/API contracts. Scoped ESLint and `git diff --check` passed. Repository-wide type/build/browser checks were outside this worker's requested scope.

No worker work remains. Changes are ready for coordinator review and integration; this report is the only additional file written outside the repository.
