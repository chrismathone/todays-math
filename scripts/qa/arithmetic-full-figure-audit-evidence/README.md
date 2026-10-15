# Complete arithmetic figure census and remaining presentation audit

Base: `c6401393de1b620ec097b3361ce30cc4d80f04db`.
This worker audits **7,971 IDs / 142 families** and supplies **4,506 updated
displays / 104 families** through `presentArithmeticRemainingSvg(id, originalSvg)`.
Canonical SVGs, generators, frozen packs, IDs, prompts, parameters and answers are
unchanged. Shared facade and UI integration belong to the coordinator.

## Exact census and repeated diagrams

`census.json.gz` enumerates every registered ID, family, accepted route, source
and display SHA-256, public data, answer and definition verification.
`remaining-scope.json.gz` lists every owned ID and its updated/unchanged status.

| Accepted facade route, in precedence order | Families | IDs | Owner |
| --- | ---: | ---: | --- |
| Angle presentation | 8 | 912 | This audit |
| Elementary dimensions | 56 | 7,754 | Elementary worker |
| Middle segments | 50 | 1,827 | Coordinator |
| Raw canonical geometry, then shared typography | 134 | 7,059 | This audit |
| Total | 248 | 17,552 | Three coordinated scopes |

**17,552 counts registered problem-variant IDs, not distinct drawings.** There
are **15,183 distinct canonical SVG byte strings**, 1,447 reused-byte groups and
2,369 IDs beyond the unique-byte count. The owned domain has 6,704 unique source
byte strings, 656 reused groups and 1,267 repeated IDs. Visually equivalent but
byte-different SVGs are not combined in this count.

Every registered figure has exactly one definition candidate: zero orphan,
unregistered or duplicate IDs and zero failed definition verifiers. There are
649 definitions. The census explicitly counts 167 geometry candidates without
figures. Other nonfigure numerical domains were checked against figure-map
ownership and their first candidate; their full numerical domains were not
enumerated in this figure audit.

The owned domain includes the original 81 frozen angles (70 triangle, 11 right
triangle), separately from the 912 presentations. The 4,506 fixes leave 3,465
owned IDs unchanged: 912 presentations, 81 frozen angles and 2,472 other raw
figures. After the coordinator wires remaining after segments, remaining accepts
4,506 IDs / 104 families and raw has 2,553 IDs / 30 families. Earlier route counts
remain unchanged. Exact full source-string gating rejects altered sources,
unknown IDs and other owners' domains.

## Real editor behavior

The authority is actual `figureMarks.ts`, `figureSvgEditing.ts`,
`figureHandles.ts`, `figureLabelOps.ts`, `figureTypeset.ts`, and the shared
FigureSpec engine. `remaining/proof.json.gz` records commands, exact endpoints,
handles, text edits, gap results and intermediate/output hashes.

All 5,992 public segment annotations first call actual
`addFigureMark({op:'addDimension',from,to,text,side:'out'})`. Of the final
results, **2,785 use that output directly; 3,207 use actual curve creation,
style edit, bend-handle movement, addMidLabel and gap/typeset operations** after
a real conflict. Endpoints remain fixed. Label edits may use samples 35/50/65
from `sampleFigurePath(curveD,100)`. Modest bends precede larger bends; the
largest accepted bend is 82. There are no projected endpoints, witness lines,
invented lengths, copied dimension formulas or card-size minimization.

The default retains its exact two gapped quadratic pieces, horizontal label,
inherited font/dash behavior and short-segment font reduction. Thus not every
default label is 16.8 and not every default dash is 5/3. Manual fallback uses
16.8 label, 0.72 stroke and 5/3 dash. Actual short perpendicular dimensions can
have smaller labels; those images were inspected. Aggregate areas, perimeters,
ratios and counts are not converted into invented segment dimensions.

Marks and points use real addAngle/addTick/addParallelMark/addLabel/relocation
and object edits. The existing 912 presentations use real engine authored
settings: font 16, angle radius 20, outline 1.7, mark width 0.85. These are
explicit overrides, not equality with empty-editor defaults 16.8/22/0.72 for
label/radius/mark. Their engine proof and frozen-81 proofs are separate evidence.
All 400 source sector sweeps, including 180/240/270 degrees, are preserved.

Seventeen initial refusals are retained: six parallel notes mistaken for angle
values, ten triangle exterior values conflicting with earlier labels, and one
rhombus-40 duplicate-angle detection. Actual isolated single-angle construction
and actual editor object paste preserve all original notes/givens. Scratch-only
font/point context guides true editor placement and is not copied into outputs.
Text moves follow the true bisector or existing leader; actual text/leader
handles are edited. Open Q leaders receive actual fill=none edits to prevent
unintended black wedges. Every final operation replays without refusal.

The formerly refused `gm-m3-circle-chord-distance-13-9` uses radius O=(120,108)
to B=(168.46154,158.51217), bend -30/sample 35, and chord AB bend 30. Source
foot, right mark, circle and labels remain. Later visual review found 23 detached
chord-distance M labels and two chord-length M labels. Actual M placement now
precedes dimension selection: (-16,-8) from the foot for distance cases and
(-14,+20) for the two length cases. The candidate reserves its real glyph/halo.
Two initially excessive short-perpendicular bows were rejected visually despite
collision clearance; the final modest curves and local labels were inspected.

## Full gates and exact failures

Every final render uses actual arithmeticGeometryDisplaySize screen aspect and
figureSvgUrlPrintMm plus rounded-mm figureWidthStyle print aspect. No square
proxy is used. Browser networking is aborted and no app/API/DB writes occur.

| Gate | Coverage | Final unresolved |
| --- | ---: | ---: |
| Canonical IDs, bytes, public data, answers, definition verification | 17,552 | 0 |
| Strict remaining API source gate / exact final editor replay | 4,506 / 4,506 | 0 |
| Preserved base geometry / public labels | 18,081 / 13,730 | 0 |
| Public dimension endpoints / measured angle values | 5,992 / 1,935 | 0 |
| Point proximity and angle association | Every updated proof | 0 |
| Browser bounds/collisions/masks/halos/effective open-path fill | 7,971 x 2 = 15,942 | 0 |
| Independent 4x glyph/halo versus protected full stroke | Same 15,942 | 0 |
| Original frozen angle/leader/inside ownership | 81 x 2 = 162 | 0 |
| Independent geometry/count/length/sector semantics | 2,451 IDs / 4,009 checks | 0 |
| Focused regression/extreme browser renders | 125 x 2 = 250 | 0 |

Browser checks inspect actual mask polygons and full stroke half-width including
eight radial samples. Independent raster checks paint actual MathJax glyphs and
white halos at 4x, then sample protected strokes at 0.25 CSS-pixel centerline
spacing plus eight radial half-width directions, alpha threshold 8. Solid
outlines, right marks and ticks must remain visible. Actual masking of crossing
dashed auxiliary ink is allowed. Thin angle arcs/leaders meeting their own text
halos are recorded separately. Every open stroked path is checked for effective
computed fill=none. All public givens are checked independently for preservation.

`final-coverage.json.gz` accounts for all 7,971 current IDs and hashes. The full
run is retained under `run-before-local-repair/`; `local-repair/` retains the
40-ID rerun. The other 7,931 IDs reuse observations only after exact final
SVG-byte hash comparison. Original checker sources are retained; coverage
requires complete formatted source equality, allowing normal-hook formatting
but no behavioral checker change. All old raster failures must belong to rerun
IDs whose new failures are empty. `final-browser.json.gz` has all 15,942 final
rows. Complete final editor replay is rerun rather than inferred from layout.

Failure history remains explicit:

- Baseline exactly 22 structural collisions:
  `gm-m3-trig-special-length-30-{10..20}-{2,5}`. Independent raster confirms
  44 failed observations over the two media.
- First full candidate: 1,078 unique failed IDs; next full pass: nine. Both
  exact lists are retained in first-full-failures and second-full-failures.
- Fifteen narrow-triangle angle associations were repaired. The original
  27-row list also retains 12 parallel-line false candidates: those arm samples
  were directions, not actual vertices.
- After browser clearance, full independent raster still found 25 observations
  / 13 IDs: `gt1-m2-iso-bisector-angle-28`,
  `gm-m1-cone-volume-10-{2,4,6,8}`, and
  `gm-m1-cone-{surface,lateral}-10-{11,12,13,14}`. All repaired and rerun.
- Point review moved 25 M labels and two O labels locally. Together with the
  13 raster cases these are the exact final 40-ID rerun.

## Actual image inspection and limits

`remaining/visual-review.json.gz` records exact image/figure hashes. All **78
sheets** were opened and inspected: 48 first/last-family sheets (284 IDs), 22
focused sheets (125 IDs), and eight localized repair sheets (40 IDs), in both
media. There are **432 distinct current visually inspected IDs**. Superseded
images are identified and each has an inspected replacement at its final hash.
Every owned family is represented in both media.

Inspection covers true angle sectors/leaders, point association, public length
endpoints, typography, glyph/halo/mask clearance, outline/right/tick visibility,
reflex sweeps, units and counts. Detached M labels and excessive bows were
repaired even after collision-only clearance. Human inspection is representative,
not every individual raster; all IDs receive deterministic/browser/ink gates.

Main-app desktop/mobile/native-PDF integration is coordinator-owned. Reported
main work includes elementary d150f5bb7, segment cc66117d, and native-print chrome
fix 8b8b13591 (four paper pages per device mode). Those are separate evidence,
not this worker's offline app test. Coordinator wires the API and checks final UI.

## Reproduction and hashes

Use existing C:/Creative/testautocreator dependencies, without install/junction:

```powershell
node --import file:///C:/Creative/testautocreator/node_modules/tsx/dist/loader.mjs --import ./scripts/qa/arithmetic-angle-presentation-deps.mjs scripts/qa/arithmetic-full-figure-audit-verify.ts --replay-all
```

Use this launcher for build --resume, browser --candidate=<directory> --all-owned
--extremes --require-clear, ink, semantics, frozen, and coverage.mjs. Coverage
validates retained full/local runs; coverage --prepare-extremes recreates the
focused visual selection. Do not overwrite the baseline census when checking a
newly integrated facade. Focused typecheck runs with node and the -typecheck.mjs.

Large JSON is losslessly gzipped; every audit reader accepts either the plain
filename or its .gz sibling. artifact-hashes.json records stored artifact hashes.
Raw editor step hashes omit only session-local data-object-id; source/final SVG
hashes use complete bytes. JSDOM is recycled every 20 rows after yielding to the
event loop; checkpoints are retained, with no concurrent same-directory writers.
Focused TypeScript and ESLint pass. Commit uses normal hooks. No canonical,
shared facade, elementary/middle pack, UI, environment, DB, push or deployment
change belongs to this worker.
