# Advanced authored figures: actual print label size

2026-10-18 · Base `d1a1ae2b0ca3b1c1a98d6bda9b1bcea5fe86f906` · Independent review P2.

Fixed the four authored advanced figure families at the existing shared print widths. All **117 finite figure tuples / 729 actual SVG labels** now pass the 12.5px font floor, glyph/halo bounds, label collisions, point collisions and stroke/circle collisions. Mathematical inputs, points, curves, segments, regions, answers and solutions are unchanged. The four figure families are version **1.0.1**; the seven text families remain **1.0.0**.

The worker initially started at `2c18d65a5`, without the advanced implementation. The coordinator explicitly approved a clean `git merge --ff-only d1a1ae2b0ca3b1c1a98d6bda9b1bcea5fe86f906`; that pinned integrated commit is the sole source base for this fix.

## Representation and measured result

The current frame policy is in `src/lib/figure/figureSvgFrame.ts` (the task's older `src/lib/problem/` path does not exist). The regression reads **actual strict, typeset SVGs**, uses `figureSvgSize` / `FIGURE_SVG_PRINT_MM`, and calculates `fontSize × printWidthMm × 96 / 25.4 / viewBoxWidth`.

| Family suffix              | Tuples | Before minimum |   Final minimum | Final representation                                                                  |
| -------------------------- | -----: | -------------: | --------------: | ------------------------------------------------------------------------------------- |
| `parabola-line-chain`      |     72 |    10.175651px | **13.228346px** | graph-1, 400×400 canvas, 20-unit labels, 70mm frame                                   |
| `split-triangle-incenters` |     15 |     9.448819px | **13.228346px** | graph-1, 400×400, equal physical x/y scale, 70mm                                      |
| `two-centers-angle`        |      6 |     9.448819px | **13.228346px** | graph-1, 400×400, equal physical x/y scale, 70mm                                      |
| `incircle-shaded-area`     |     24 |    11.205997px | **13.083253px** | v2 auto-fit, 260-unit maximum leg, 20-unit labels; 15 wide/70mm and 9 mid/64mm frames |

The baseline fails the new invariant on **105 tuples for font size**, with **eight additional stroke contacts**. Final counts are zero for font failures, clipping, label/point/stroke/circle contacts and dropped dimensions. All 117 renders succeed; none are skipped or removed.

The graph canvas follows the established middle 400-unit representation. Enlarging authored labels on the old 520-unit canvas would leave graph-1's automatic axis labels at 10.176px. A first 400-unit candidate also exposed the old character-count placement estimate's inability to find valid space. The final placement reuses the renderer's MathJax glyph metrics, checks continuous strokes and point radii, and preserves each single-letter label's nearest named point. The split-triangle givens use separated header positions; the body already defines α and β. Geometry range spans remain equal on the square plotting area, preserving angles, center order and C-J-E / A-E-I order.

For the incircle, a separately rendered 220-unit drawing with the original 16.8-unit labels still fails the floor. The final spec retains the 260-unit geometry and its skinny tangent gaps, explicitly sets v2's label font to 20, and lets the existing engine fit the measured labels. Its actual white excluded disk, gray surrounding region and three radius perpendiculars remain intact. No common frame, renderer, Python engine, contract, API, UI or middle-family file changed; no SVG was handwritten and no figure kind was added.

## Verification

- **27/27 advanced tests pass**, including all 1,121 canonical tuples, mathematical negative controls, both center-order branches, incenter/tangency checks and all 117 strict figure renders.
- The print regression checks complete label multisets and real MathJax bounds, including axis labels and glyph descent/halo. It checks actual line/polygon/path strokes, exact circle/rectangle intersections, filled point radii and pairwise label boxes. The stroke clearance includes the largest stroke's half-width. Unsupported new path commands fail the test rather than silently escaping measurement.
- Single-letter labels are checked against the actual printed point positions after SVG rounding, including close E/I and O/I pairs. Actual frame scales are checked for the angle geometry; every v2 SVG must contain the white disk region.
- Baseline/final JSON comparisons confirm identical mathematical draft fields and figure geometry across all 117 tuples; only canvas/ranges, label layout and label style change.
- **Focused strict TypeScript and ESLint pass**; `git diff --check` passes.
- Chromium print-media raster evidence uses the shared frame widths imported from production. Twelve visual samples cover both parabola openings and line signs, narrow/wide split triangles, both center orders and both skinny incircle orientations. There are **26 PNGs at 96/192dpi**, including a separate 70mm comparison for the skinny tall figure whose actual shared frame is 64mm. Browser bounds agree with the requested physical width within 0.02 CSS pixels; no network request was attempted.
- Visual inspection at actual policy width confirms readable, unclipped labels and clear point roles. Four incircle pixel probes independently find white disk pixels `[255,255,255]` and gray triangle pixels `[238,238,238]` away from the printed radii/labels.

All runtime verification used `env -i`, installed Node **24.22.0**, Python **3.12**, and an offline Vitest configuration with `envDir:false`. Existing dependencies were symlinked from `/Users/pss/Desktop/creative/today_/node_modules`. No `.env`, credentials, database, provider, original school material, network service, package installation, build, Prisma generation, push or deployment was used. These checks validate digital output at the shared print dimensions; physical printer/paper approval is outside this worker's evidence.

## Durable evidence and reproduction

Preserved under the coordinator's worktree:

`/Users/pss/orca/workspaces/today_/problem_make/.qa-artifacts/math-exam-engine-upgrade-20261018/advanced-print-fix-evidence/`

The folder contains the owned source snapshot and diff; offline Vitest/TypeScript configs; baseline, candidate and final logs; all 117 baseline/final strict SVGs and draft JSONs; the final 1,121-tuple inventory; print-bound measurements and before/after comparison; unchanged-mathematics comparison; the rejected incircle alternative; print-media raster code, dimensions and PNGs; actual-width contact sheet; excluded-disk pixel evidence; exact reproduction commands; and commit/clean-status evidence. Earlier failing candidate logs are retained and are superseded by the passing final logs.

Copy the preserved reproduction files into `.qa-artifacts/advanced-print-fix/` in a checkout of this change with existing dependencies, then run the commands in `commands.txt`. The principal regression command is:

```sh
env -i PATH=/Users/pss/.nvm/versions/node/v24.22.0/bin:/Users/pss/.local/bin:/opt/homebrew/bin:/usr/bin:/bin PYTHON_BIN=/Users/pss/.local/bin/python3.12 ADVANCED_EVIDENCE_DIR=.qa-artifacts/advanced-print-fix/final /Users/pss/.nvm/versions/node/v24.22.0/bin/node node_modules/vitest/vitest.mjs run --config .qa-artifacts/advanced-print-fix/vitest.config.mts
```

Root owns integration, main and Orca cleanup; the independent reviewer owns final acceptance of this label fix.
