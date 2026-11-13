Read-only adversarial review of the current, uncommitted source in
`/Volumes/새 볼륨/today-worktrees/today_/arithmetic-figure-quality-20261112`.
No implementation edits, browser launches, installs, DB/env operations, or pushes.
The engine batch was in flight; this review does not treat its partial asset pack
or its earlier failure log as final results.

1. **P1 — New target highlighting is rejected by the actual sanitizer.**
   `scripts/qa/arithmetic-figure-quality/engine.py:63` adds
   `data-target-segment` to the target line, then line 66 calls `sanitize_svg`.
   The vendored allowlist permits no such line attribute
   (`vendor/figure-engine/core/figure_quality.py:207`, validation at 511).
   Read-only calls to the current `compile_row` for
   `gt1-m2-circum-equal-radii-2` and
   `gt1-m2-pythagoras-hypotenuse-integer-3-4` both reproduced:
   `SvgSecurityError: attribute 'data-target-segment' is not allowed on <line>`.
   There are 1,629 segment-target plans among the 1,718 planned rows, so this is
   a source-level blocker independent of the unfinished batch.
   Keep target identity in the external proof, omit the forbidden SVG attribute,
   and verify the final styled SVG without weakening the sanitizer.

2. **P1 — An essential ratio is already missing from all 64 section problems,
   and the new plan preserves the omission.**
   `src/lib/arithmetic-v2/presentation/figureFirstTriangles.ts:215` exports only
   integer lengths/angles through `givensOf`; lines 231–238 retain only special
   `proseGivens` or refused dimensions.
   `families/geometryTriangles/proportions.ts:108` also gives `AE:EB=p:q`, which
   neither path retains, while the group instruction at
   `figureFirstTriangles.ts:94` mentions only parallel lines.
   Example `gt1-m2-trapezoid-parallel-section-3-2-1-2` has AD=3, BC=5,
   AE:EB=1:2 and answer 11/3, but its actual census display has `lines: []`;
   its new plan contains only AD, BC and target EF.
   A proportional drawing cannot replace the stated ratio.
   Add a public ratio line shared by the old display and engine plan/consumer,
   then check preservation for all 64 rows without changing frozen canonical packs.

3. **P2 — The compiler publishes a partial migration with a successful exit.**
   `engine.py:73–83` catches every row exception, writes the successful subset to
   the application asset JSON, and only prints failures.
   `figureFirstTriangles.ts:240–243` silently falls back to the old renderer for
   absent rows, so a normal display census can still look successful when the
   intended engine migration failed (including issue 1).
   Require exact expected planned-ID coverage and no unresolved failures before
   replacing the application pack; exit nonzero otherwise and preserve the prior pack.
   Record the actual engine route per final row instead of inferring migration
   from `figure-first`, which also names the old renderer.

4. **P2 — The new print probe uses a substitute size.**
   `scripts/qa/arithmetic-figure-quality/check-browser.js:10` assigns a 240px
   longest extent whenever `media === 'print'`, but never activates print media
   or uses the output sizing functions.
   Real arithmetic output sets its size through `arithmeticAngleWidthMm`
   (`src/lib/arithmeticOutput.ts:125`),
   `figureSvgAngleDrillWidthMm` (`src/lib/figure/figureSvgFrame.ts:107–119`), and
   the `figureSvgUrlPrintMm` / rounded `figureWidthStyle` path
   (`src/lib/figurePrintSize.ts:311`, `416`).
   These include aspect, clamping and rounding rather than a universal 240px frame.
   The helper can provide a second-size probe, but cannot establish actual
   physical-print acceptance; derive its print dimensions from those functions
   and separately verify the real output consumer.

Existing coverage/quality limitations that must remain visible:

- The four inline trig families contribute **24,474** displays, all included in
  the current census, but exporting `trig-models.ts` does not migrate them:
  `engine.py:72` reads only `models.json`, `engineFigures.ts:13` recognizes only
  gt1 IDs, and `figureFirstTrig.ts` still calls the custom `render`.
  The existing right-triangle renderer clamps opposite/adjacent to 0.42–1.9
  (`figureFirstTrig.ts:20–25`): inline index 308 says tan A=12 but draws 1.9.
  The area/side renderer clamps angles and side ratios (29–36), and every
  side-from-area question draws AC/AB=1.3 regardless of its public area (144).
  These are existing distortions, not newly introduced failures or a completed
  engine migration.
- The exact inline plans include 72:1 bounding-box extremes, e.g.
  `inline:m3-trig-side-from-area-sine:960` and
  `inline:m3-trig-sine-from-area:1515`; the current scene scaling would give
  only about 2.78 units of triangle height across 200 units of width.
  Exact geometry alone does not establish readable labels, marks or dimensions;
  these need final-output inspection when wired, not a presumed pass.
- `census.ts:29–31` cannot observe every typesetting exception because
  `figureFirstSvg` catches it internally (`figureFirst.ts:134`): a successful
  raw drawing followed by failed typesetting can leave `drawErrors` at zero.
  Retain explicit expected-route/fallback accounting alongside that counter.
- The three recorded zero-length canonical lines are only zero-length BD
  leaders in hidden `m2-same-height-area-ratio` rows 2-3-2, 4-3-2 and 5-3-2;
  they are not evidence of three broken visible triangles.

Verified counts and compatibility:

- The retained census arithmetic is consistent: 17,552 registered IDs + 24,474
  inline displays + 167 no-asset geometry rows = **42,193 candidates**;
  **32,152 displayed + 10,041 hidden/nonfigure** rows account for all candidates.
  There are **12,555 distinct final SVG byte strings**, not 32,152 distinct drawings;
  the union of canonical/display strings contains 27,738 assets.
  Deduplicating SVG bytes is valid for SVG probes, but does not establish that
  each candidate's surrounding public conditions were preserved (issue 2).
- I independently checked the 1,718 triangle plans' numeric public angles,
  given/target segment ratios, target angles and circle-through-vertex distances
  against their coordinates: no mismatches in those checked invariants.
  The plans label targets as x and obtain numeric labels from public statements;
  geometric derivation from public data is not an answer-label leak.
- No canonical generator, frozen source pack or stored contract is changed by
  the reviewed implementation diff.
  `arithmeticOutput.ts:68` validates saved packs before projection;
  `engineFigures.ts:37` requires exact original-string equality, and only
  trusted bundled compressed data is inflated.
  I found no new saved-snapshot/security bypass in that path.

Limits: source review and read-only in-memory checks only; no browser, native
PDF, app integration, finished-batch coverage, or final visual acceptance claim.
Reviewed engine.py SHA-256:
`4848eec890edcfbbda3bd663a11ff11db11fd08c4f064572c0c9aae60b10f024`.
