# Asset angle investigation r1 — 2026-10-19

**Finding: intentional, valid external placement of the ∠BAC label; no semantic/geometry/print defect established for this artifact.** This is external *text placement*, not a claim that 58° measures an exterior angle. Existing preview/release holds remain unchanged.

Parent root: `C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008`.

- Inspected `.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/native-images-r2/candidate-1.diagram.svg`, the existing `preview-70mm.png`, and `.qa-artifacts/exam-resume-20261008/bumil-authoring-r2/image-context/q10.engine-spec.json`. The spec explicitly identifies vertex A, rays AB/AC and label `58°`; its geometry gives approximately 57.99944° from those coordinates. That coordinate check identifies the drawn angle only; it is not independent mathematical approval of the question.
- The SVG's A is `(35.950,251.690)`. Its radius-23 acute arc runs from approximately `(59.0,251.7)` to `(48.1,232.2)`. The curved leader starts at `(56.066,240.540)`, the midpoint of that acute arc, and follows `Q 58.345 254.674 69.109 264.112` toward the label at `(74.575,279.750)`. The leader crosses dashed AB once, ends before the text, and does not originate at A as an extra geometric ray. There is no other labeled arc nearby with which to confuse it. Text below AB therefore does not relocate the measured angle.
- This matches explicit engine behavior: `vendor/figure-engine/core/figure_scene.py:1903–1930` moves a label outside when internal candidates fail and anchors the leader on the arc midpoint; lines `1961–2001` select a drawable external candidate. Lines `2880–2904` emit a deliberately curved leader, stopping before the text rather than letting the halo erase its end. A missing arrowhead is not a contract violation: the engine intentionally emits the quadratic leader without one.
- Why it moves out despite the visually large triangle: lines `1812–1827` cap interior candidates at half the distance to the nearest other named point. G is only 32 units below A, so reach is 16, below the base distance 17.5. The fallback is the single base candidate, which cannot fit the label between the rays. Read-only execution of `FigureScene.from_spec(spec)._angle_label_layout(elevation)` returned an external label `(63.624733,267.060)` with arc anchor `(45.116307,227.849476)`; adding the SVG's translation `(10.950,12.690)` reproduces its placement. Raw-spec text metrics differ from final MathJax ink metrics; that does not change the external-placement decision.
- Visually inspected the parent's saved 70 mm Edge preview. The 58° label and curved leader are legible and associated with the acute arc; no text clipping or visible ground-line erasure was observed. The leader's 0.72 SVG-unit stroke corresponds to about 0.244 mm at a 70 mm viewBox width. This is QA of the saved preview, not a new physical print test or a new approval. An interior placement might be a future aesthetic choice, but the current contract does not require changing this valid external label.

## Previous invalid-zlib counterexample

Reran the exact prior CRC-valid 60-byte PNG (base64 below) against the current parent `renderSavedAuthoredImage`, using in-memory TypeScript transpilation, the existing synthetic unit fixture's valid binding, a recomputed request digest and `purpose: preview`:

```text
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAA0lEQVQBAgNTNxetAAAAAElFTkSuQmCC
```

Actual result: `{"ok":false,"error":"incorrect header check"}`. **The previous invalid-zlib proof is now rejected.** This confirms that counterexample is fixed; it does not claim an exhaustive PNG audit or independently rerun all five new regressions.

## Snapshot and scope

SHA256 of the read snapshots:

- Diagram SVG: `010b2097764d3a0ab98f4f17c9f13637f50b55e73dbc48c398891b2f6dc9164e`
- q10 engine spec: `977b2bf1c01715ab6f37b513e91af8d3acd3f06f8ad8ac0f67dfb2558ab975fd`
- Vendor figure_scene.py: `5291fc1f92dc8a08bc3c850826e906eb1623aa4af20ced3813ad440827a0773e`
- Saved preview: `fb6b871d3eaae21ff772e8722fd3951d4f80ec1d13811c4767fae50ebe9ec65a`
- Current authoredImage.ts: `1e8d5334a6424bf7bd5d2677fac0af4969db7f1380964a3b1c6c0fe96c96b888`

Only this new report was saved. Parent/vendor files and old evidence were read-only; Python used `-B` to avoid bytecode writes. No new assets, workers, approvals, mathematical solves, AI/network/DB calls, installs/generation, controller changes or pushes. Investigation complete; stopping after this report.
