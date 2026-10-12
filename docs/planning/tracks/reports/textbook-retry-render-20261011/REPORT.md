# Textbook variant rendering QA — 2026-10-11

The corrected 1,656-candidate core packet passes all rendering gates. The
78-candidate geometry and 54-candidate calculus packets also pass. The initial
core run exposed one real coefficient overflow; its evidence is preserved.

The reusable harness renders production PaperProblemView with eager figures,
the real print-column tokens, locally scoped production CSS, compiled Tailwind,
KaTeX and embedded production fonts. Inputs and every candidate payload are
hashed; all candidates are checked in documented chunks at 1440/390 in screen
and print media. No database, source, generator, loader or UI was changed.
The pre-existing package-lock.json modification was left untouched.

## Initial deterministic packet: one printing blocker

`deterministic-1656/` records the initial 828 pairs / 1,656 candidates, with
17 chunks and 6,624 candidate viewport/media checks. Every content, answer and
solution was SSR rendered without KaTeX errors or raw marker leaks. The browser
found one failed candidate: `e267c1aa-1e2e-4345-ad87-027b2a54fbe3`, slot 2,
externalId `tb-retry-v1:e267c1aa-1e2e-4345-ad87-027b2a54fbe3:2` (flat index 103).

Its answer and final solution expand the derivative coefficient to
`51537752073201133103646112976562127270210752200100x^{99}`. Both reach 398px
inside the 363.5px column in all four checks, and the document overflows at
390px. `deterministic-1656/overflow-390.png` shows the cut-off text. The concrete
candidate fix is an equivalent exact factored coefficient, for example
`100·3^{100}x^{99}`, supplied by the generator owner; otherwise withhold this
source pair. The harness did not rewrite this candidate or loosen its checks.
This initial packet is **not qualified** and its older receipt predates the
shared candidatePayloadSha256 binding added to the harness.

## Corrected core packet: pass

`final-core-1656/` contains the final 828 pairs / 1,656 candidates, with all
17 chunks inspected in all four viewport/media combinations (6,624 candidate
checks; 4,968 SSR paper sections). All checks have mathErrors=0,
documentOverflow=false, brokenImages=0 and contentOverflow=[].

The coordinator changed only the affected pair's answer/solution notation,
keeping exact factored powers when the coefficient is too long. The harness
rendered the new input without edits. The previously failing slot now has
content/answer/solution scroll widths of 364px, matching their 364px client
widths; `corrected-coefficient-390.png` was visually reviewed. Source selection
and mathematical verification remain coordinator-owned.

Final input SHA256:
`337b65fb23dcd67493c6563198c7fa64e07d3526860bb0c99163a198bf3705ba`.
Shared qualification candidatePayloadSha256:
`658726410f18a0efe49ab8938dd8808c125e090aa4d6810f4be950a09eb28759`.

## Final geometry packet: pass

All 78 candidates in `final-geometry-78/` pass SSR and all 312 candidate
viewport/media checks. The coordinator regenerated this exact packet after
separating adjacent inline math delimiters in one pair. The final input hash is
`82aa3413c2d969ed7dd4f574230ae53d8ed60a84cda61c2f97be3e143c751963`;
its shared qualification payload digest is
`5170643c7374a6011aa1821683d748b67a178b5cbe30afa10e8de10f0a2c401f`.
Use this receipt for the final geometry cohort.

## Initial geometry packet: pass

All 78 candidates in `geometry-78/` pass SSR and all 312 candidate
viewport/media checks. Each aggregate check reports rows=78, mathErrors=0,
documentOverflow=false, brokenImages=0 and contentOverflow=[]. This packet has
no inline SVGs or image URLs. Its shared qualification payload digest is
`2ec07fa25ccd2ac9c3518abebadc2f3e26589ddbf320602a407a75f3c5d3ea3c`.

## Expanded calculus packet: pass

All 54 candidates in `calculus-54/` pass SSR and all 216 candidate
viewport/media checks, with zero math errors, body/content overflow or broken
assets. Its shared qualification payload digest is
`3e0fdec15e871f3e906378c9d5c5e8c89d0f6ce53aaad47eddb28c88689fb041`.
Source parent selection and overlap removal remain the coordinator's work.

`final-render-summary.json` indexes the three final bound receipts. All final
checks have zero math errors, body/content overflow and broken assets. The
packets contain no diagram assets; diagram behavior is covered by the separate
fixtures below. The harness source passes scoped ESLint and Prettier checks.

## Harness validation: pass

`selftest/selftest.json` records three positive diagram fixtures and seven
seeded defects. Actual inline SVG labels, complete picture-choice grids and
text choices with attached diagrams pass; source mm widths reach the actual
HTML. Negative cases detect missing figures, KaTeX command errors, invalid
choice associations, hidden SVG labels, unresolved SVG IDs, broken images and
overflow in the last candidate of the last chunk. Modified HTML is rejected
before inspection. The positive 390px screenshot was visually reviewed.

Run instructions and exact gate scope are in
`scripts/qa/textbook/retry-render-20261011/README.md`. Rendering evidence does
not establish mathematical correctness or source provenance; the coordinator
owns those gates.
