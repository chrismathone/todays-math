# Native exponential/logarithm graph support — 2026-10-11

Implemented in `scripts/figure/graph_scene.py` and its narrowly scoped analytic helper `graph_native.py`, with Python regression tests and an actually regenerated `engine-catalog.json`. Before implementation, merged local `main` by fast-forward to `f6344372f`; audit commit `372a4449a` remains in ancestry. Read repository `AGENTS.md` and local Next documentation, including the public-folder guide. No Next/UI code changed.

This is engine implementation and local rendering evidence, **not model generation provenance, independent candidate review, or adoption approval**. Root owns grouped prompt/schema, authentic regeneration, review and adoption. No source, receipt, answer, model generation, DB, provider, authentication or environment files were changed; no paid provider or DB calls were made. Verification explicitly selected the vendored engine, disabled remote engine transport in the verification process and installed a network-rejecting fetch.

## Accepted contract

The proposed contract was sent early through Orca (`msg_3fda52ff7532`) and accepted by root (`msg_165b1678099c`). Root additionally assigned generated catalog ownership (`msg_5212f70a2858`). The authoritative prompt reference is the generated catalog's `graph-1` entry, sourced from `graph_scene.CONTRACT`; do not maintain a duplicate prompt schema.

Each native entry in `curves` has:

| Field | Rule |
| --- | --- |
| `type` | Exactly `exponential` or `logarithm` |
| `base` | Required finite numeric value, positive, not 1 |
| `domain` | Required finite `[xmin,xmax]`, strictly increasing, fully inside graph `xRange` |
| `amplitude` | Optional numeric value, default 1, nonzero |
| `xScale` | Optional numeric value, default 1, nonzero |
| `xShift`, `yShift` | Optional numeric values, each default 0 |
| `dashed` | Optional boolean, default false |

All numeric inputs have absolute value at most 10000. Booleans, strings, null, NaN and infinities are not numbers. Unknown keys and mixed polynomial/inverse/native fields fail. There is no expression string, eval, caller-authored sample array or alias such as `exp`/`log`.

Equations:

```text
exponential: y = amplitude * base^(xScale * (x - xShift)) + yShift
logarithm:   y = amplitude * log_base(xScale * (x - xShift)) + yShift
```

Reflections and horizontal/vertical transforms use these fields directly. Every logarithm argument must be strictly positive over the entire chosen domain, including both endpoints. The full native curve must fit `yRange`; no clipping, point-skipping, partial success or asymptote bridging is permitted. These families are monotone on their valid domain, so endpoint validation covers the entire interval. Overflow, nonfinite intermediate values, exponential underflow to zero, and multiplication underflow fail explicitly.

For example, `base:0.25, domain:[-2,2]` needs a viewport covering heights from `1/16` through `16`. For `log_2(8x+16)`, use `base:2,xScale:8,xShift:-2`, with a positive distance from the asymptote; `domain:[-1.99,4]` fits `xRange:[-3,5],yRange:[-4,7]`, while a domain including `-2` fails. A reflected logarithm with negative `xScale` has its valid domain to the left of `xShift`. Three complete executable examples are in `CONTRACT.nativeExamples` and the regenerated catalog.

## Curve-boundary shading

```json
{"horizontalBands":[{"leftCurve":0,"rightCurve":1,"yRange":[1,8],"fill":"#eeeeee"}]}
```

`leftCurve` and `rightCurve` are distinct zero-based integer indexes into `curves`, and both must reference native **exponential** curves. This deliberately bounded feature covers the two audited horizontal bands; general arbitrary/logarithmic shading is not claimed. The heights must increase, fit graph `yRange`, and lie within each boundary curve's declared domain. The fill defaults to `#eeeeee` and accepts only `#RRGGBB`. Unknown fields, booleans/fractional/out-of-bounds indexes, reversed/crossing/touching boundaries, unsupported boundary families, invalid colors and truncated domains fail.

The engine analytically inverts each exponential at a given height:

```text
x(y) = xShift + log((y-yShift)/amplitude) / log(base) / xScale
```

Each inverse has the form `A*log(abs(y-v))+B`. The derivative of the difference between the two boundaries has at most one zero on the shared valid interval. Validation checks both endpoints and that interior critical point, if present, to establish strict left/right ordering across the **whole band**. It does not infer ordering from sample points alone. A regression case whose endpoints have positive width but whose interior crosses is rejected.

The two original band geometries are locked by semantic tests:

| Curves / heights | Checked width at all test heights | Area from constant width |
| --- | --- | --- |
| `2^(x+3)` left and `2^x` right, heights 1–8 | 3 | 21 |
| `(1/4)^x/16` left and `(1/4)^x` right, heights 1–4 | 2 | 6 |

The input supplies analytic equations, curve references and horizontal levels, not a rectangle or a manually sampled polygon. Rendering fills one closed path between the two inverse curves and strokes its horizontal ends. The referenced curves supply its sides. The fill is drawn before axes, curves, segments, points and labels.

## Bounded rendering and compatibility

Native sampling deterministically subdivides in screen space, probing quarter/mid/three-quarter chord deviations at a 0.15-pixel tolerance. A curve permits at most 400 line segments; a band permits at most 48 segments on each boundary. Unresolved geometry at the budget or floating-point resolution limit fails rather than degrading silently. These samples approximate analytic geometry for display; they are not numerical integration or answer verification. The tolerance is a subdivision probe criterion, not a certified global error bound.

Native stroke paths are split into short, continuous chunks without dropping chosen samples, keeping attributes below the conservative 2048-character bound; dashed chunks maintain accumulated dash phase. Bands use one bounded fill path: an initial tiled approach produced faint antialias seams in visual inspection and was replaced before completion. There are no clip paths or hidden invalid sections. Ordinary polynomial/inverse rendering and existing points/axis breaks remain on their established paths. Existing valid polynomial/inverse specs remain compatible; native-only keys on those families now fail instead of being ignored.

## Validation

Commands run locally:

```text
python -m unittest discover -s scripts/figure -p test_graph_native.py -v
python scripts/figure/build_catalog.py
npx vitest run src/__tests__/unit/graphScenePoints.test.ts src/__tests__/unit/graphSceneAxisBreaks.test.ts src/__tests__/unit/figureEngineCatalog.test.ts src/__tests__/unit/figureCurveGraph.test.ts
npx tsx .qa-artifacts/native-curves/render.ts
npx tsx .qa-artifacts/native-curves/negative.ts
git diff --check
```

- **13 Python tests pass**, covering known native values, bases above/below 1, all transforms, reflected logs, finite typed inputs, domain/asymptote failures, overflow/underflow, unsupported keys, sample budget/resolution, both bands, invalid/crossing boundaries, deterministic/no-mutation rendering, SVG sanitization, actual `render_spec.py` subprocesses and polynomial/inverse compatibility.
- **65 existing Vitest tests pass** across graph points, axis breaks, engine catalog and legacy curve graph behavior.
- **7 actual TypeScript `renderFigureSpec(...,{strict:true})` renders pass**, through the local Python engine, SVG sanitization, MathJax label substitution and Sharp PNG rasterization. All report zero dropped dimensions: three catalog examples plus exponential, logarithm-with-points, increasing-band and decreasing-band fixtures.
- **5 actual strict negative renders reject** unsupported dimensions, an asymptote-crossing log domain, exponential overflow, a curve outside `yRange`, and an expression key. Unsupported dimensions fail as supplied; they are not discarded to obtain an image.
- Representative exponential, logarithm and both band PNGs were opened and visually inspected. The increasing/decreasing regions follow curved sides and horizontal end edges continuously; no tile seams remain. Fixture label positions were adjusted after inspection to avoid axes/curve overlap.

Ignored local evidence is under this worktree's `.qa-artifacts/native-curves/`: `fixtures.py`, `render.ts`, `negative.ts`, seven `.spec.json`/SVG/PNG triples, `validation.json` with SHA-256 hashes, and `validation-negative.json` with actual rejection results. These are newly authored **engine verification fixtures**, not generated textbook candidates or reused source figures. The files are accessible to root at `C:/Users/user/orca/workspaces/testautocreator/textbook-figure-audit-20261011/.qa-artifacts/native-curves/`.

Remaining work belongs to root: review/merge the scoped engine commit, consume the regenerated contract in grouped generation, and run authentic generation, independent review and adoption. Label placement and correspondence between a future candidate's prose, equations and image still require that review; a successful native render does not establish them.
