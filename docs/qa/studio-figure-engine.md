# Subscription figure engine integration — 2026-09-14

`POST /api/dev/unified/ai` with `action: "figure-redraw"` now runs a structured
diagram pipeline: subscription CLI vision → FigureSpec → local Python SVG engine
→ original-image/spec review. It does not use a paid API or accept model-written
SVG as the rendering result. Existing OCR and solution execution is unchanged.

## Engine actually connected

`src/lib/dev-ai/figure-engine.ts` calls the existing
`src/lib/figure/renderFigureSpec.ts`, which starts
`scripts/figure/render_spec.py`. That script calls the repository's
`vendor/figure-engine/core/figure_scene.py` for v2, `elementary.py` for `elem-1`,
or the ported `graph_scene.py` for `graph-1`, then `core.figure_quality.sanitize_svg`.
The server also checks the resulting static SVG grammar. Raw source labels remain
editable; existing MathJax metrics inform placement and Studio owns final label
typesetting and browser sanitization.

The active Mathgen references were read directly: `src/services/ai/figurePipeline.ts`,
`api/_ai-figure.ts`, `api/_ai-figure-review.ts`, `api/figure-render.py`, and
`scripts/figure/service.py`. All six vendored core modules, `elementary.py`, and
`elem_advanced.py` were verified byte-identical between the projects. No vendor
engine replacement was needed. The missing annotated graph adapter was ported
because the elementary `curveGraph` cannot express finite chords, inscribed
polygons, or arbitrary graph labels. Its drawing algorithm still calls the same
core curve/line/text primitives; local validation now rejects unknown fields,
invalid booleans, invalid curve domains/types, and malformed fills rather than
silently ignoring them. Inverse curves break at their asymptote.

`engine-catalog.json` and `build_catalog.py` come from that active Mathgen flow.
Running `python scripts/figure/build_catalog.py` regenerates the catalog from
the actual local engine (60 elementary kinds, v2, and graph-1). The prompt retains
the active source rules: visible printed content only, screen versus mathematical
y direction, named v2 maps, no invented measurement bows, no example-coordinate
copying, preservation of faint geometric chords, and explicit uncertainty.

## Public contract and limits

The request remains `{ provider, action: "figure-redraw", imageDataUrl, content,
svg?, grade }`. `imageDataUrl` is the original isolated diagram raster, `content`
is the manual/automatic redraw instruction, and `svg` is optional current-editor
reference. The existing `result.svg` string contract remains intact. Additional
JSON-safe fields are:

```ts
result.spec?: { version: 2 | "elem-1" | "graph-1"; [key: string]: unknown }
result.engine?: "todays-math-python"
result.figureReview?: {
  mode: "source-image-and-spec";
  passed: boolean;
  issues: string[];
}
```

There are at most three spec/render/review attempts, two admitted figure requests,
and a 240-second total deadline including queue time. Each existing Python render
has a 15-second deadline and now follows request cancellation. Redraw uses strict
rendering: unplaceable printed dimensions cause failure/repair rather than being
dropped. Only deterministic spec errors or explicit review mismatches are repaired;
CLI/auth failures, missing Python, unsafe SVG, malformed output, and cancellation
terminate. No provider switching occurs. Specs are capped at 64 KiB, depth 32,
and bounded node count before recursive metrics work. The existing subscription
bridge retains its own input, auth, process, and output bounds.

The review compares the original image with the validated spec and actual SVG
text. This bridge currently takes one native image, so this is **not Mathgen's
two-raster pixel review** and does not establish final browser font/layout fidelity.
The mode explicitly records that limitation. A renderable final result with a
remaining review mismatch carries warnings for human review, matching Mathgen's
last-attempt behavior. Null/unrenderable specs fail and the caller retains its
original raster. The server does not mutate or return a replacement source image.

## Evidence

- Four focused test files, 206 tests passed: `devAiFigureEngine`, `devAiRoute`,
  `devAiResponseValidation`, and `devAiTasks`. Tests call real Python for v2/right
  angles, shaded arcs, annotated graphs with a finite chord, charts, solids,
  LaTeX labels, invalid references/fields, repair limits, and cancellation.
  Subscription output is stubbed in this deterministic suite.
- ESLint passed for changed TypeScript files. A focused TypeScript project
  covering all dev-ai modules, the renderer, route, smoke script and changed
  tests passed. Full repository `tsc --noEmit --incremental false` is blocked by
  existing missing/generated Prisma types and unrelated type errors; no Prisma
  generation, environment changes, full build, or server restart was performed.
- A **real Claude subscription** smoke completed in 15.8 seconds, with v2
  geometry, source/spec review passed, no warnings, and unchanged source SHA256.
  Committed synthetic evidence lives in `studio-figure-engine-smoke/`: independent
  source PNG, actual returned spec/SVG JSON, SVG, and its rasterized preview.
- The supplied private diagram crop also completed through the real Claude
  subscription and Python `graph-1` path in 109.7 seconds. Its original source hash
  was unchanged, review passed, and the result warned about an estimated point.
  A white-background raster preview was inspected for geometry and handwriting
  removal. Private source/output were not committed; output remains in ignored
  `.probe/dev-ai-figure-real/` for the coordinator's review.

The opt-in smoke script is `scripts/qa/smoke-dev-ai-figure.ts`. It uses the existing
Claude subscription profile and consumes subscription quota; it never changes
authentication or falls back to an API key:

```powershell
node --conditions=react-server --import tsx scripts/qa/smoke-dev-ai-figure.ts --run-cli docs/qa/studio-figure-engine-smoke/source.png .probe/figure-smoke
```

UI application, the automatic per-figure queue, metadata persistence, and visual
editor integration belong to the coordinating worker. No browser was mutated.
