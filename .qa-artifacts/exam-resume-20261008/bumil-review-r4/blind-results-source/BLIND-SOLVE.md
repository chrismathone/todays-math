# Blind student-only solve — q11 / q14

Solver: `orca-codex-exam-twin-source-identity-20261008`. Target: middle3 / 2015. Both questions are **solved independently before exposure to their new author answers**.

| Question | Answer | Status | Actual method |
| --- | --- | --- | --- |
| q11 | ②, (6 + 3√3) cm | solved | 30° right-triangle ratios, supplementary angles, triangle angle sum and equal sides opposite equal angles. |
| q14 | ③, 5 cm | solved | Fold length/angle preservation, parallel edges, an isosceles triangle, one perpendicular, tangent and Pythagoras. |

The detailed student solutions, five-choice checks, exact calculations, construction checks, figure observations and limits are in [q11.json](solve/q11.json) and [q14.json](solve/q14.json).

## Independent calculations and conditions

For q11, the right triangle ADC has AC = 3 and angle ADC = 30°, hence AD = 6 and DC = 3√3. The collinear order B-D-C gives angle ADB = 150°. Triangle ABD then has two 15° base angles, so BD = AD = 6 and BC = 6 + 3√3. This proof needs no formula for tan 15°. Constructing that right triangle and extending CD past D by length 6 gives all conditions simultaneously and puts D strictly inside BC. All lengths are positive and all triangle angles sum correctly. For choices ①–⑤, the exact residual BD − AD is respectively −3, 0, 3√3, 3, 6; only ② works.

For q14, the fold fixes P,Q and carries A to C, giving AP = PC and angle APQ = angle CPQ = x. Parallel AD and BC give angle PQC = x, so PC = QC and therefore AP = PC = QC = s. Let K be the perpendicular foot from P to BC. The acute angle APQ puts Q to the left of K; interior P puts K to the left of C. Thus Q-K-C is the correct order. PK = 3, and tan x = PK/QK = 3 gives QK = 1. Pythagoras in PKC gives s² = 9 + (s − 1)², or 2s = 10. Only s = 5 satisfies it. For choices ①–⑤, the exact residual s² − (s − 1)² − 9 is −4, −2, 0, 2, 8; only ③ works.

Existence for q14 was checked independently using a 9 × 3 rectangle, AP = 5 and BQ = 4. Both P and Q are equidistant from A,C, so PQ actually is their perpendicular bisector and folds A onto C. All interior and positive-length requirements hold: PD = BQ = KC = 4, QK = 1, PC = QC = 5, and PQ² = 10. The acute x is about 71.565°; the remaining angle PCQ is about 36.870°. No numerical inverse-trigonometric value is needed in the student proof. The overall width is recovered as 9, so its omission from the prompt does not leave multiple AP values.

The reflected B′ was checked with exact rational auxiliary coordinates. It preserves AB = CB′ = 3 and BQ = B′Q = 4, and the corner at C remains right. The area of the folded left panel equals its original area, 27/2 cm². The first and second SVG figures retain P,Q,C,D under one common translation; the shown B′ equals the independently computed reflection. These coordinate and area calculations are auxiliary existence/figure checks after solving, rather than a student method requiring vectors or a reflection formula.

q14 requires several connected geometry steps before the final equation. It is not a direct substitution into tan x. One auxiliary segment and one main unknown suffice, with no trigonometric addition/double-angle identities, sine/cosine laws or higher-grade student technique. Formal seven-surface curriculum, classification, difficulty, score, rights and publication approval are outside this blind-only task; this note does not force those approvals. No additional curriculum/registry/private files were opened.

## Inspected inputs and blindness

Only the parent r4 blind SOLVE-BRIEF.md, student-problems.json and the three raw student SVGs were read. The exact question-only previews `review-preview/q11.png` and `review-preview/q14.png` were viewed with `view_image`; both visibly keep the answer/solution accordion closed. PNG filenames were enumerated to locate those question images, but no solution image or preview HTML was opened. No new author candidate, notes, solution, private package, old answer or original question was read for this task.

The q11 figure places B-D-C in order, A above C, the right angle at C and the 15°/30° leaders at the intended angles. Its rounded coordinates agree with the independently derived lengths and angles within 0.001 SVG unit / 0.001°. The q14 before/after figures show the recorded fold, x between PC and PQ, and the correct reflected B′. The printed scale was checked only after independently deriving the answer.

Earlier source-identity work on other selected questions exposed some scan annotations; that historical limit was already disclosed. No original-answer evidence or remembered original numeric answer is used here. The new q11/q14 author answers remain unseen. The previously committed q02/q03/q15/q21 blind solves and all four reviews remain byte-for-byte unchanged.

## Parent hash binding receipt

| Question | Given studentDigest, preserved exactly | Raw solve file SHA-256 |
| --- | --- | --- |
| q11 | `570ab4369989cd77285dad0e26313d0e9282f0cec12e2b9568525bf8c728c2e4` | `d70a383855817b7fa33abda9a335bb68b05e9fb6bf73d38aa90fd9e84f4633b9` |
| q14 | `122a3917ecccd86d1f12da18984bbedec0fe1f22e1eeca58e55212f4d90fdb83` | `d7fab8d42af9c393b2b3fdba9ea2e5e5a5f11478c3c0219bc3910b0392587df4` |

Parent student-problems.json SHA-256: `72a8c16f5522a17ebe92f73bca4ae232bcd4c7a20143581ec34b73e97e58ec72`. The supplied figure hashes all match their actual bytes. Full paths and hashes for brief, JSON, raw figures and question PNGs are retained in the two solve files. Python standard-library exact Fraction assertions passed for the choices, positive lengths, interior points, fold distances, panel areas and diagram relations. The saved executed code and its actual results are included as evidence. Report fields, given digests and unchanged prior evidence were also checked.

Only these two new solve files and this note are committed in this worktree. No DB, paid/model API, installation, parent/main/source mutation, apply, deployment or push occurred. Parent should copy and bind these raw solve hashes before providing the new author answers.
