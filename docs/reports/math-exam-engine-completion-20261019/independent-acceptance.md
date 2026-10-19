# Independent acceptance of the examStudy completion

**Accepted within the five selected school/course profiles; no unresolved blocking finding.** Final reviewed source: `2fac1748c034be7f461e727cad449b4c47c10bd2`. The broad printed-output proof ran at `337b1d980586830baa6c67933fe965281b0bf9b9`; the advanced proof began at `e2726528a7f352f3bee72286afe79c72a978dbe9`. Mathematical generators, adapter generation, core planning, identity and catalog metadata are unchanged in the final descendant. I fast-forwarded a clean review branch twice and changed only this report and its [JSON](independent-acceptance.json).

## Findings and closure

| Finding | Initial result at `337b1d980` | Final recheck at `2fac1748c` |
|---|---|---|
| **IA-01: contradictory native rubric** | Replacing the roots alternative with “모든 근에서 시간 조건을 무시하고 t=0을 나중 회복으로 인정” and consistently reserializing the rubric returned `valid:true`, including `native-rubric`. Keyword matching also admitted contradictory guidance in every criterion. | The authored alternatives/errors now have a closed contract. **480/480** contradictory controls reject; the original stored reproduction rejects. All **60 valid printed tasks, solutions and rubrics are unchanged**. Numerical expected proofs still use the independently reconstructed situation. |
| **IA-02: five-menu authorization scope** | `textbook` alone passed all three practice API policy paths although the implementation plan authorizes five other menus. Export-only and empty accounts already denied. | Every current menu, alone and paired with `export`, was checked over page/catalog/generate/resolve: **128 observations** match exactly `bank`, `arithmetic`, `studio`, `library`, `conceptBlank`. Textbook/export alone deny; common textbook output and the broader `/exam` policy remain available. |

The coordinator separately found the old UI `export` check disabling generation for bank-only users in its browser run. I reviewed the fix: one import and the permission expression now use the shared predicate. No JSX, CSS, layout, or print-template change is present; D-07 layout approval is consequently not invoked. I did not perform that browser run.

## Independent mathematics from actual printed outputs

The oracle was my own standard-library Python `Fraction`, polynomial arithmetic, Euclidean division and coordinate/interval reasoning. It reads the emitted questions and then compares computed values with answers and proof steps. It does not import production solvers or derive answers from parameters, generator facts, or stored answers.

| Target | Exhausted finite tuples | Concrete independently checked connection |
|---|---:|---|
| Doubling/time units | 12 | Repeated doubling to five common targets per task proves the signed time difference; hours become `60t` minutes. Printed A=3, B=6, period=7, known A gives **`60t−7` minutes**. Both arrival times remain positive under the stated target condition. |
| Revolution percentage | 10 | A common positive distance gives turns inversely proportional to circumference. Exact rational half-up rounding includes below/at/above a half-tenth boundary: **1.2%, 1.25%→1.3%, 1.3%**. D=81 and new radius=40 gives ratio 81/80, increase 5/4 percent. |
| Coprime symbolic sum | 14 | Every numerator has one Euclidean-division representation; all residues are partitioned by gcd, paired as `r↔D−r`, and summed symbolically for **every positive integer n**. Ten direct numerator intervals per tuple cross-check that proof. D=6, lower=1 gives residues {1,5}, **S=n²+2n**. |
| Integer lattice/areas | 12 | Strict negativity bounds the complete finite integer search. For **2x+3y=−5**, the sole point is P=(−1,−1), A=(−5/2,0), B=(0,−5/3); determinant areas are **5/4 and 5/6**. Integrality deletion has a different rational point; zero/multiple feasible sets and degenerate boundaries reject. |
| Middle linear reconstruction/reuse | 16 | Undo both translations, reconstruct the first line, compute both intercepts, then place β and α into `y=βx+α`. Shift (1,−5), P=(−2,−8), Q=(3,−23) gives **f=−3x−12, α=−4, β=−12**, then y=−12x−4, excluding quadrant I. All four excluded quadrants occur. |
| M3 coefficient positions | 25 | Reconstruct a,b,c from V and P, place **c,a,b** into their three different positions, and complete the new square. V=(−2,−3), P=(−1,−5) gives f=−2x²−8x−11 and **g vertex (−1/11,−87/11)**. All coefficients are distinct, a,c≠0, and the target differs from the original vertex. Removing P or V leaves another valid first polynomial with a different target. |
| Radical/inverse/slanted line/circle | 7 | Preserve the two graph incidences separately. With t,u≥0, the line gives `(t−u)((t+u)/a+1)=0`, proving t=u rather than assuming swapped coordinates. Distinct swapped points and the y-axis center force center (0,0); C fixes radius. The resulting quadratic in z=t² gives **all** real candidates. |

Across the seven radical tasks, the independent proof found **14 z roots**, two negative; the remaining roots produce **23 real t candidates**: 11 negative-sign failures, five outside the original domains, and seven accepted, exactly one per task. The zero endpoint is included. Coordinates, both original graph equations, both domains, line, point distinction, determinant and actual circumcenter were checked.

For printed f(x)=√(x+3), domain [−3,0], C=(−1,−2), the z roots are 1 and 4. Only t=1 is valid: A=(−2,1), B=(1,−2), **b=−1**, determinant −6 and radius²=5. The invalid negative branch t=−2 happens to give the same b; checking the answer alone would miss its invalid incidence. The wrong branch proof rejects. Enlarging the correctly paired domains makes t=2 valid as well, with b=3; the verifier rejects the resulting nonunique problem.

I independently constructed **21 rational deletion witnesses** for the radical incidence, inverse incidence and center-axis condition, plus **seven rigorous interval witnesses** when slope −1 is removed. Each preserves the remaining graph/domain/nondegeneracy conditions and changes b. Additional controls reject all 16 spurious sign/domain proof branches, seven C=A degeneracies and five widened-domain problems with two valid real answers.

## Six retained IDs and MC

All six existing registrations remain: candidate `…풀이|11`, equality `…풀이|06`, classification `…풀이|09`, model `…활용|01`, simplify `…식의 계산|13`, and native `m3-quadratic-domain-r1`. Their individual versions and domains are in the JSON. They add **zero registrations**.

- **Candidate 120 finite:** five different equation/candidate pairs, both evaluated sides, each truth, the exact selected row set and count. Signed and zero candidates occur.
- **Equality 32 finite:** signed nonunit premises, symbolic identities, actual false witnesses and preserved undefined division at b=0. Cancellation cannot turn an undefined quotient into an everywhere-true identity.
- **Classification 512 sampled records:** exact polynomial subtraction distinguishes linear, quadratic, identity and impossible equations. A separate fixture forces quadratic cancellation and every zero/constant branch.
- **Model 512 sampled records, 445 unique canonical tasks:** reconstruct the model from the words, solve, and verify both original calculations and comparison. Three separate fixtures force all feasible coefficient-sign/relation branches. The 67 duplicate records do not add capacity.
- **Simplify 144 finite:** full expansion and collection, then the actual requested coefficient A, constant B and A+B. For `(−4x−3)−3(−3x−2)`, the result is 5x+3 and **A+B=8**.
- **Rectangle 60 finite:** expand `(L₀+pt)(W₀−qt)=L₀W₀`, retain every root and exclude the initial time, with strict `0<t<W₀/q`. The domain has **34 positive returns, 17 negative second roots and nine repeated-zero cases**. L₀=4,W₀=6,p=q=1 gives t=2 and lengths 6,4; L₀=W₀=4,p=q=1 has only t=0 twice and no later return. All four 2-point criteria cover domain/model/roots/original substitution, with the corresponding printed and structured rubric.

There are **1,476 base output records / 1,409 unique canonical tasks** in the deep probe: 96 new finite tuples, 356 reinforced finite tuples and 1,024 sampled records. These are task tuples/records, not distinct thinking structures. Finite domains are exhausted; sampled classification/model total capacity remains unknown. Four independent fixtures and subsequent core outputs are additional checks, not capacity.

**1,320 MC repackagings** retain the base parameters, logical key and mathematical content digest. I separately read all five alternatives as rational numbers: distinct, exactly one correct; the count tasks stay within **0..N**. **324 synthetic cases** cover N=4..12 and every correct count including 0 and N. Domains with fewer than five possible counts, impossible answers and injected out-of-range/equivalent/fractional alternatives reject. The exact previously reported core request seeds **71 and 20261019** now produce **12/12** independently solved bounded count-MC outputs. This establishes mathematical/domain plausibility, not measured distractor discrimination.

Rejection evidence: **252** initial advanced, **23** additional spurious/degenerate, **320** middle, **79** forced-boundary and **7,560** reinforced controls, the last including the **480** controls rechecked after the fix. Repetitions over tuples and response packaging are explicitly not new families or capacity.

## Public core, catalog, transport and source scope

| Selected profile | Selected demands | Supplied | Result |
|---|---:|---:|---|
| daeryun-m1 | 11 | 12 | every demand full |
| daeryun-m2 | 10 | 12 | every demand full |
| kyungmyung-m1 | 7 | 12 | every demand full |
| kyungmyung-m3 | 4 | 12 | every demand full |
| kyungshin-common2 | 8 | 12 | every demand full |

All requests use mixed format, count 12 and maxPerFamily 3. All **60 supplied questions** carry a nonempty full-requirement list; keys/digests are distinct within each set and no family exceeds three. Every one of the former **13 course-qualified cases / 12 unique requirement IDs** also completes in isolation. Unsupported short-answer rectangle requests remain empty.

These are **pure core/planner probes with an explicitly labeled opaque SVG sentinel**, not real figure rendering or authenticated production checks. An empty SVG preparation result rejects a figure-required task. The existing route still requests strict rendering and rejects dropped dimensions; renderer sources are unchanged. No new figures were authored or used as evidence for these text families.

Catalog: **4,220 registrations = 4,190 legacy + 30 authored**, versus seven new registrations beyond the previous catalog. Legacy counts are elementary 2,499, middle 1,517, high 168, native six. Seed, response format and option order do not multiply registrations. Manifest: `exam-study-manifest-e256f76631b5268f56e09bd5`. Baseline Git object comparisons preserve original middle/high/native engines, SRS/fading, student/API app sources, Prisma data/schema, renderer and the shared output contract. The reviewer did not modify local main. Original school DB absence is intentional; no originals were imported/copied.

## Execution and retained evidence

Installed Next testing/Vitest guides were read. Node **24.22.0**, existing shared dependency symlink, `env -i`, fixed PATH, NODE_ENV=test, custom Vitest **envDir:false**, and guards were used. Python is the explicit **3.12.15** executable supplied in the dispatch. No environment file, DB, provider, paid AI, install, Prisma, build, push or deploy was used by this reviewer.

Reproduction prefix (append one of the config files listed in JSON):

```sh
env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin NODE_ENV=test /Users/pss/.nvm/versions/node/v24.22.0/bin/node --require ./.qa-artifacts/math-exam-engine-completion-20261019/independent/guard.cjs node_modules/vitest/vitest.mjs run --config ./.qa-artifacts/math-exam-engine-completion-20261019/independent/vitest.closure.config.mts --reporter=verbose
/Users/pss/.local/share/uv/python/cpython-3.12.15-macos-aarch64-none/bin/python3.12 .qa-artifacts/math-exam-engine-completion-20261019/independent/check_advanced.py
/Users/pss/.local/share/uv/python/cpython-3.12.15-macos-aarch64-none/bin/python3.12 .qa-artifacts/math-exam-engine-completion-20261019/independent/check_combined.py
/Users/pss/.local/share/uv/python/cpython-3.12.15-macos-aarch64-none/bin/python3.12 .qa-artifacts/math-exam-engine-completion-20261019/independent/check_count_repros.py
```

The advanced extraction/proof, six-test combined extraction, targeted branches/boundaries/request-seed probes and final **two-test narrow closure** pass. The pre-fix reproduction intentionally observes the defect; it is not evidence of acceptance. Raw logs also retain an initial harness control mistake; the percentage parser was corrected to read the percentage step rather than an earlier diameter multiplication. Neither correction changed product sources. The old combined proof intentionally preserves its 480 accepted-corruption observations; closure evidence supersedes that finding.

Raw questions, complete solutions/rubrics, exact roots/witnesses, polynomial proofs, probes, configs, guards and logs are in `.qa-artifacts/math-exam-engine-completion-20261019/independent/`. Copy **`raw-evidence.tar.gz` before child cleanup**: **539,695 bytes**, SHA-256 **`207c29e6e76cd6758f7ce06a78b643e0c210843ce1307b713056ab1dc48d15c0`**. `artifact-manifest.json` hashes every included raw file; critical/source hashes are in the compact report JSON.

The coordinator owns local API integration with synthetic authentication, strictPython integration, browser flows, full regression, lint/type/build, remote integration/push and Vercel status. I did not claim those runs. Acceptance is limited to these five selected profiles and the reviewed engine improvements. It is not completion of all 50 catalog requirements, school-wide coverage, official curriculum exhaustiveness, calibrated difficulty, original-answer restoration, arbitrary student-response grading, physical print QA, or measured learning effects.
