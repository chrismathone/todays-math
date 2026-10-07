# Bumil r1 - independent blind solves

Solver: `orca-codex-exam-twin-source-identity-20261008`. All four new student problems were solved before any new author answer was read. Only the parent's `blind/SOLVE-BRIEF.md`, `blind/student-problems.json`, three supplied figures, and permitted `student-preview/qNN.png` / `student-preview-r2/qNN.png` files were read for this task. All four corrected r2 previews were inspected with `view_image`. Supplied SVG hashes matched. The parent `studentDigest` values are copied unchanged into the four result files.

The parent reported a rendering-only correction: legacy normalization had joined a following question paragraph into the final table row in the old preview. The r2 previews show the authored tables and following paragraphs separately. The student JSON's file hash and all four student digests remained unchanged, so the independent calculations and answers remain unchanged. Result files bind the r2 preview hashes and preserve the earlier preview hash for inspection history; no `render-review.json` was read.

| Question | Status | Independent answer | Student method | Result file |
|---|---|---|---|---|
| q02 | solved | ②: y축의 음의 방향으로 3만큼 | y=2x²+c; 5=8+c, c=-3 | [q02.json](solve/q02.json) |
| q03 | solved | ④: t=5 | Vertex (-2,0); y=a(x+2)², 4a=20 | [q03.json](solve/q03.json) |
| q15 | solved | ②: MP=3 cm | r=15/2, AM=6, OM²=r²-6²=81/4, MP=r-OM | [q15.json](solve/q15.json) |
| q21 | solved | AD=8 cm | Equal tangent lengths and Pythagoras: (x+25/8)²=10²+(x-25/8)² | [q21.json](solve/q21.json) |

The calculations ran in Python using exact `fractions.Fraction` arithmetic; each JSON preserves reproducible code and its actual calculated values. Code in these records is also executable evidence, not a comparison to an author answer. The three multiple-choice items have all five choices checked individually. For q02 the proposed shifts give y(-2)=11,5,13,3,0, so only ② passes. For q03 the proposed t values imply y(0)=-20,-4,4,20,80, so only ④ passes.

For q15, the residual `(r-h)²+6²-r²` for the five heights is `63/4,0,-45/4,-18,-81/4` cm². The fifth choice also violates h<r. The positive distance OM=9/2 fixes the short height as 3. The alternative algebraic height 12 is a long height and violates the explicit short-height bound. The chord exists because 0<12<15. The diagram has P and O on opposite sides of AB, M at the midpoint, and O-M-P collinear. Its SVG distances r=90, AB=144, OM=54, MP=36 correspond to the independent answer at a common scale of 12; these pixel lengths were not used to obtain the answer.

For q21, let b=25/8 and x=AD. Equal tangents give DE=x and CE=b. E lies between D,C, so CD=x+b. A horizontal line through C meets AD at F; the supplied x>b>0 condition gives CF=10 and DF=x-b. The Pythagorean equation reduces to 4xb=100, hence x=8. Back-substitution gives CD=89/8, DF=39/8, and both sides of the squared equation equal 7921/64 cm². The answer has 8>25/8>0.

Existence was checked independently, rather than inferred only from that necessary equation. For the constructed D,C, OD²=89 and OC²=2225/64. Dropping the perpendicular from O to CD and subtracting the two Pythagorean equations gives the foot distance DE=8 and OE²=25. Thus 0<DE<CD, OE is the radius 5, and the tangent point lies on the upper semicircle between D,C. The equation for x is linear with nonzero coefficient 25/2, establishing uniqueness. The SVG shows the same tangent layout: AB=180, AD=144, BC≈56.25 at scale 18. Its rounded E position has a radius error of -0.0008764 SVG units and a converse-Pythagoras residual of 0.099504 SVG units²; it lies inside CD. Exact student arithmetic takes priority over this rounding check.

Student explanations use methods within the supplied 중3 / 2015 target: quadratic translations and vertex form, circumference, the center/chord perpendicular relation, equal tangents, and Pythagoras. No differentiation, vector inner products, coordinate-circle equation, point-to-line distance formula, or higher-grade trigonometry is required. Official curriculum documents were not opened within this restricted blind task, so no achievement-standard ID or separate curriculum approval is asserted.

Input bindings:

- `student-problems.json` SHA-256: `be2aeecd199db093822fbbac30248945f9e021253f85138d43590238222ee515`.
- `SOLVE-BRIEF.md` SHA-256: `36d5dd4896ab48fc3eca250864c93dad2380247dbd29fcc570d1a12eedb850e5`.
- q02 studentDigest: `1c8ac8bd281d8f547e8db86ec1e3f8671e37a21d79ca707d9c4b57b81b63ffa4`.
- q03 studentDigest: `d6095c275426e8f3728660cc3bb6d4f33a9cddb3014a708455585c5e159e82a9`.
- q15 studentDigest: `bc3bd97b90cec786cce08661bc8312b7b160ca9997115ba07c151ba8745dd71d`.
- q21 studentDigest: `a6c2a3165a9cb2fd394a937d2d9182cbf86b1fe44c75f84c450bbd534f8ee15a`.

Solve file SHA-256 values for the parent's copy/hash binding:

| File | SHA-256 |
|---|---|
| solve/q02.json | `835b3815b29b0d0c12d9221a2259e308005caa93e768f36ec7cb7af0f6a40d90` |
| solve/q03.json | `72915e6696b6c11b97de55a5eb0ac3b756193b7f30a81ae9c1061cd12baebe8a` |
| solve/q15.json | `afafb9d815902e6f2863ef60b2626876751a4b0385e5789f8f1d0240e6e0f04c` |
| solve/q21.json | `3b7c4c29f4929193267bcc6122cdabb41136670a5dc35903cf3fd619384df3be` |

The results make no claim of agreement with the author, original-answer approval, final rendering approval, provenance/rights clearance, DB eligibility or deployment readiness. No `render-review.json`, private package, author candidate, author note, or stored old answer/solution was opened in this task. The earlier source identity task incidentally exposed original student annotations, as already disclosed; these new solves were derived from the new blind student input and do not claim full blindness to all historical source markings. New candidate-answer blindness remains intact. The parent should copy and hash-bind these results before any new author answers are disclosed to this solver.
