# Figure redraw follow-up review — 2026-10-02

Baseline: `4d398602a`. Reviewed `figure-engine.ts`, `figure-spec.ts`,
`figure-repair.ts`, `figure-prompt.ts`, `renderFigureSpec.ts`, and the actual
Python compiler/rendering contracts. The reported production empty-axis dash
failure was owned by the coordinator and another test worker; this review did
not duplicate their production changes or dash regression tests.

Three independently reproduced correctness defects were reported to the
coordinator and fixed in `7f5030de0`. A fourth generation-guidance gap found by
the coordinator was independently verified and fixed in `121945b62`.
Independent patch review also caught the missing arc type member (fixed in
`29c171aa8`) and a null-valued label case (fixed in `e51c07091`).
No production code, provider, dependency, or database was changed by this
worker. Tests invoke the local Python renderer; AI inference and the comparison
image service are stubbed, so no paid calls or database writes occur.

## Findings

### 1. P2 — Default label text is erased as though it were empty

Baseline location: `src/lib/dev-ai/figure-repair.ts:452–467`, with deletion at
`:469–481`. Authoritative contract:
`vendor/figure-engine/core/figure_scene.py:1359–1378` and `:3389–3403`.

Minimal fixture:

```json
{
  "version": 2,
  "points": { "A": [50, 50], "B": [150, 50] },
  "segments": { "AB": ["A", "B"] },
  "labels": { "A": "30°", "labelA": { "point": "A" } }
}
```

1. `renderFigureSpec(spec, {strict:true, typeset:false})` returns
   `도형을 그리지 못했습니다: labels.labelA.point conflicts with its key`.
2. `repairFigureSpec(spec, error, false)` removes `labelA`, returns no warning,
   and leaves only `labels:{A:"30°"}`.
3. The repaired spec renders successfully, but its only `data-mj` label is
   `30°`. The same happens with `labelA:{point:"A",text:null}`.
4. As an independent contract check, rendering `labels:{A:{}}` or
   `labels:{A:{text:null}}` prints `A`, proving that missing/null text means
   the point name rather than an empty string.

The repair therefore loses a distinct printed point name. The redraw test
also reproduces this through `redrawDevAiFigure`, with the real renderer and a
stubbed passing review: it returns an SVG containing only `30°` and
`warnings:[]`. This test isolates deterministic repair behavior; it does not
claim that a live model necessarily misses the loss.

**Exact fix:** Resolve effective label text using the Python defaults before
comparing duplicates. Deduplicate only equal nonempty effective strings.
When a distinct default label gets its own anchor, write its resolved text
explicitly so the new anchor key does not become the displayed name. Refuse
empty/invalid text rather than treating it as a redundant label. Do not mutate
the input spec.

**Status:** Fixed by `7f5030de0`; absent/null text now yields both `30°` and `A`.
The added tests also cover explicit empty text, numeric zero, boolean false,
and input immutability.

### 2. P2 — Repairing one dimension changes unrelated nullable aliases and chooses between conflicting distances

Baseline location: `src/lib/dev-ai/figure-repair.ts:283–301`.
Authoritative contract: `vendor/figure-engine/core/figure_scene.py:1327–1356`
and `:3306–3322`.

Minimal fixture:

```json
{
  "version": 2,
  "points": {
    "A": [50, 50],
    "B": [150, 50],
    "C": [50, 200],
    "D": [150, 200]
  },
  "segments": { "AB": ["A", "B"], "CD": ["C", "D"] },
  "dimensions": {
    "first": {
      "points": ["A", "B"],
      "label": "5",
      "offset": 10,
      "curvature": 10
    },
    "second": {
      "points": ["C", "D"],
      "label": "7",
      "offset": null,
      "curvature": 40
    }
  }
}
```

The real renderer rejects `first` with
`dimension provides both offset and curvature; use only one`.
Python treats `second` as valid: its effective offset is `curvature:40`.
The repair's property-presence check nevertheless deletes `curvature` from
**both** dimensions. After repair, `second` has only `offset:null`, switching
it to automatic placement without a warning.

Rendering the repaired result moves label `7` to SVG `y="211.14"`.
Rendering a reference spec that only removes `first.curvature` keeps label
`7` at `y="237.14"`: a 26-pixel change caused by repairing another dimension.
Both renderings succeed, and both retain the same label text inventory, so a
text-only assertion would miss the defect.

A one-dimension variant with `offset:10,curvature:40` also reproduces a second
problem in this branch: it silently chooses 10. The Python method explicitly
rejects two effective aliases to avoid choosing an ambiguous model value.

**Exact fix:** Identify conflicts only when both aliases are non-null. Before
making a batch repair, require every effective conflict to have finite equal
numeric values; otherwise return `undefined` and let the source-guided retry
decide. Remove `curvature` only from those equal conflicts, preserving valid
null aliases in other records. Preserve numeric zero as a number; any separate
nonpositive-offset rejection belongs to its existing repair rule.

**Status:** Fixed by `7f5030de0`. The new tests compare the complete repaired
render against the reference and check that conflicting distances remain
unrepaired with both values of `allowDrop`.

### 3. P2 — The graph prompt's aspect-ratio rule distorts geometric shapes

Baseline location: `src/lib/dev-ai/figure-prompt.ts:17`.
Renderer contract: `scripts/figure/graph_scene.py:123–127`.

The prompt says to use the coordinate-span ratio for the **outer** canvas
ratio so squares remain square. The renderer instead scales coordinates into
an inner plotting rectangle after subtracting 48 pixels of padding on every
side.

Minimal fixture following the old prompt exactly:

```json
{
  "version": "graph-1",
  "xRange": [0, 2],
  "yRange": [0, 1],
  "width": 600,
  "height": 300,
  "axes": false,
  "polygons": [
    {
      "points": [
        [0.5, 0.25],
        [1, 0.25],
        [1, 0.75],
        [0.5, 0.75]
      ]
    }
  ]
}
```

The real renderer succeeds and emits:

```xml
<polygon points="174.000 201.000 300.000 201.000 300.000 99.000 174.000 99.000" ... />
```

A 0.5-by-0.5 coordinate square therefore becomes **126 by 102 pixels**,
23.5% wider than square. This changes the appearance of the shape boxes the
same prompt explicitly requests for mathematical concept diagrams.

**Exact fix:** Teach
`(width - 96)/(height - 96) = (xMax - xMin)/(yMax - yMin)`, with width constrained
to 240–640 and height to 200–640 before computing the ratio, matching the
renderer clamps. Equal spans and equal canvas dimensions are a simple valid
choice for concept diagrams. In the fixture, changing width to 504 yields a
102-by-102-pixel square with height still 300.

**Status:** Fixed by `7f5030de0`. The added test checks the corrected prompt
invariant and measures the actual polygon coordinates from the Python SVG.

### 4. P2 — The coordinate guidance omits the on-circle angle convention

Baseline location: `src/lib/dev-ai/figure-prompt.ts:16`.
Engine contract: `vendor/figure-engine/core/figure_scene.py:7–9` and
`:1054–1069`; the embedded catalog's `v2` prose does not explain the angle
sign convention.

The prompt states that v2 uses screen coordinates with y increasing downward,
but omits the exception for constructed circle points: their angles are
mathematical, counter-clockwise, with
`x = cx + r*cos(angle)` and `y = cy - r*sin(angle)`.
Applying the raw-coordinate direction to these angles mirrors a constructed
point across its circle center's horizontal line.

Minimal engine fixture, parameterized with angle 30 and -30:

```json
{
  "version": 2,
  "points": {
    "O": [150, 150],
    "P": { "type": "on_circle", "circle": "c", "angle": 30 }
  },
  "circles": { "c": { "center": "O", "radius": 50 } },
  "segments": { "OP": ["O", "P"] }
}
```

The real SVG line endpoint is 25 pixels **above** its center for +30 and 25
pixels **below** for -30. The production fixture supplied by the coordinator
contains `A` with `angle:-29`, center `O:[60,300]`, radius 220: the engine
therefore places it near y=406.658, beyond its canvas height 360. That is an
actual consequence of the supplied spec, not evidence that canvas validation
should be weakened. Determining the intended point/arc from the source image
remains the generation model's responsibility.

**Exact fix:** State the mathematical angle exception, the sign in the y
formula, the 0/+90/-90 cardinal directions, and the on-screen arc direction
convention. Require generation to check constructed positions against the
crop. Do not silently flip the supplied angles or relax the canvas guard.

**Status:** Fixed by `121945b62`. Two added tests assert the prompt guidance
and independently measure positive/negative acute-angle endpoints in real
Python SVG output.

## Independent review of the coordinator's patch

- **P1 build blocker, fixed in `29c171aa8`:** `1509ebbb8` introduces an `"arcs"`
  argument to `editRecord` in `figure-repair.ts:705–706` without extending its
  key union at `:249`. The exact fix is adding `"arcs"` to that union. Runtime
  Vitest transpilation does not check this TypeScript contract. A focused
  TypeScript compiler run against the historical `7f5030de0` source confirms
  `TS2345` at `figure-repair.ts:706:35`; the final source has no diagnostics in
  either the repair module or the new test file.
- **P2 null label duplication:** At `7f5030de0`, `textOf` resolves an object's
  missing/null `text`, but misses a whole null-valued label table entry, which
  Python also defines as its point name. Replacing the first finding's labels
  with `{"A":null,"labelA":{"point":"A","text":"A"}}` creates an extra
  `labelA` anchor and renders two `data-mj="A"` labels. The exact fix is
  `item === null ? point : ...` before the object/string cases, while retaining
  rejection of invalid non-null types. A tenth regression test reproduces this
  against the real renderer; `e51c07091` applies the fix.

## Verification and limits

Durable regressions:
`src/__tests__/unit/devAiFigureFollowup.test.ts`.

```powershell
node_modules/.bin/vitest.cmd run src/__tests__/unit/devAiFigureFollowup.test.ts
node_modules/.bin/vitest.cmd run src/__tests__/unit/devAiFigureEngine.test.ts src/__tests__/unit/devAiFigureRepair.test.ts src/__tests__/unit/devAiFigureConditionPreservation.test.ts
```

- On `4d398602a`, all six initial regression cases fail, while all **156**
  existing engine, repair, and condition-preservation tests pass.
- At `7f5030de0`, all nine expanded follow-up cases pass; the additional
  null-table-label regression fails as described above.
- At final reviewed commit `121945b62`, the four suites above pass **170/170**
  tests, including all **12** new follow-up cases. This includes the
  null-table-label fix in `e51c07091`, both angle signs, and the pre-existing
  condition-preservation safeguards.
- Focused TypeScript semantic checks report zero diagnostics for the repair
  module and new test file. This is narrower than the full repository
  typecheck, which the coordinator owns.

Final failed-review acceptance and timeout fallback are intentional existing
behavior, documented and covered in `devAiFigureEngine.test.ts:164–206` and
`:351–442`. They retain `figureReview.passed:false`; this review does not
reclassify that product policy as a new bug. The existing tests also cover
malformed review rejection, cancellation, inference failure propagation,
bounded spec nesting, and rejection of a final invalid right angle or missing
ray after earlier failed reviews. No additional unsafe-math or SVG bypass was
proven during this focused review; that is not a complete security audit.

The project TypeSafe skill and its live documentation index and
[verification cookbook](https://docs.typesafe.ai/cookbooks/citation_check)
were read. Its separation of deterministic checks from semantic judgments
informed the review; the existing Gemini/Python architecture remains intact.

## 통합 확인

- main에 두 검증 작업을 병합한 뒤 도형 관련 6개 테스트 파일, **282개 테스트가 모두 통과**했다.
- 점선 검증 작업은 실제 Python 엔진으로 86개 사례를 확인했다. 빈 값·0 패턴·숫자 배열·호·별칭 우선순위·원본 사양 보존과 보정 뒤 원본 대조를 포함한다.
- 운영 실패 사양 `src/__tests__/fixtures/figure-redraw-axis-empty-dash.json`에서 두 축의 빈 점선은 보정되며 보조선의 `4 3` 패턴은 유지된다. 이후에는 원 위의 점에 들어간 음수 각도로 캔버스 밖 좌표가 만들어져 거절된다. 좌표를 임의로 반전하거나 캔버스 검증을 완화하지 않았다.
- 실제 AI 재생성이나 사진 대조 성공을 주장하는 검증은 아니다. 추론은 모킹했고, 각도·도형 비율 안내 수정은 이후 생성 요청에 적용된다.
- 검증용 두 워크트리는 병합 후 제거하고 가지는 보존했다. 기존 다른 워크트리와 공유 `node_modules`는 유지했다.
