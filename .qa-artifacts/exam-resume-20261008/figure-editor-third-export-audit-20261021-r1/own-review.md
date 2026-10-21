# Third export: static decision memo (not an engine validation)

## Decision

Do not apply patches04/05 wholesale. Patch04 currently fails a read-only git apply check at the already-strengthened figure_quality data-grid branch. Patch05 applies textually, but that is not correctness, provenance or compatibility evidence. It would modify27 existing asset SVGs and introduce12 more. Preserve current Root figure_scene/quality/grid fixes; port only separately reviewed minimal hunks, never replace Root scene modules with the external full files.

## Perspective right angle — HOLD as a general flag; exclude validation bypass

The added `perspective` boolean is permitted in ordinary v2 angle records. The proposed check is `if cos_value > tolerance and not angle.perspective`. An unrelated planar45degree pair can therefore suppress the actual90degree check simply by setting true. No3D coordinates, projection certificate, authenticated diagram mode, or source-mark evidence is required by that flag. `right:true` gating and a prompt saying only use it for3D do not establish the geometry. This is a deterministic source-level bypass, not a demonstrated current Root vulnerability (Root does not yet expose the flag).

A projected right-angle symbol can be a legitimate rendering need: paper angle need not equal the spatial angle. If pursued, separate a visibly projected symbol from a verified right-angle relation. Bind it to validated3D orthogonality/projection or an explicitly unverified source annotation; do not let it satisfy planar mathematical checks. Degenerate/coincident/collinear/short rays, wrong types, right/arcs conflicts and all old normal-plane controls must still fail. Rendering capability never grants a3D prerequisite or grade permission. Do not advertise perspective:true as a corrective hint for every failed planar angle.

## Asset geometry and existing output — HOLD until versioned/adapted

Existing elem-1 assetScene consumes the same files. The27 replacements are not merely ink-colour changes: viewBoxes, contours, waterlines, grounds and relative proportions change, and assets now acquire deeply nested transforms. Existing fixed scene coordinates/dimensions may consequently change meaning, extent and overlap. Keep existing asset bytes by default; prefer a separately named/versioned monochrome set for new reviewed uses. Do not refresh existing bank/issued rows or DB assets. The12 new files are separable in principle, but catalogues/anchors/picture whitelist/licence still need coherent binding.

`plan_assets` snaps rotations within12degrees upright. For base(0,10)/top(0,0), from(0,0), to(1,-10), the proposed formula draws the top at(0,-10), not(1,-10). This contradicts a literal endpoint binding when that pictured edge is treated as the mathematical segment. Do not silently straighten geometry-bearing assets. Decoration-only alignment may be explicit, while the actual mathematical edge remains separately verified and visible. Add exact post-transform anchor checks, including flip and base/top offsets.

`asset_anchor` accepts numeric lists without bool/nonfinite rejection, and falls back to a bounding-box base even when an asset deliberately has no base anchor. These are local trusted-data assumptions, not a complete input boundary. Scene code also removes explicit canvas width/height, reserves assetFrameLo/Hi, estimates bounds, shrinks one-point assets and overrides scene.resolve with a cached result. Review these against current Root derived points, label margins, repeated render/cache behavior, max640 limits and output canonical binding. Reject reserved-name collisions/oversize rather than quietly change mathematical geometry. Graph-1 x/y scales and y-direction must be kept distinct; expanding canvas after drawing can change subsequent metadata coordinate assumptions.

## data-asset / edit IDs / stripping — conditional idea, HOLD implementation

One validated decorative asset as one editor object is useful. A kebab-case slug is only syntax: it proves neither catalogue membership nor that the group's body matches that asset. A group labelled house can contain an actual AB segment; the proposed numbering excludes that child and stripAssetBodies removes it from text shown to AI. SVG groups inside symbols, nested/duplicate asset markers, unknown slugs, stale child data-object-id, coincident ordinary geometry and malicious label markers require tests analogous to the strengthened grid boundary. Invalid metadata should lose only its marker, preserving ordinary shapes and editability. Keep all current data-grid checks.

Bind asset identifier, exact permitted body/version/hash, allowed transforms and known anchoring before treating a group as opaque. Never strip a body from actual final raster/source comparison or stored SVG. A token-saving derivative must remain explicitly separate and must not hide mathematical geometry. The regex-based stripAssetBodies is not an XML/provenance verifier; require parsed/validated groups and retain full visual review.

`assetBox` does not parse SVG path geometry: its regex pairs raw numbers, so M100 100 h10 v10 is treated like pairs(100,100),(10,10), though actual bounds are100..110. Transforming only two opposite rectangle/ellipse corners also misses extrema after rotation: a unit circle rotated45degrees still spans x=-1..1, but the two-diagonal-corner method yields x~0. Incorrect edit/model boxes can misdirect selection/cropping/rotation despite valid SVG rendering. Use a proper bounded geometry/transform-aware bbox or retain unknown; do not claim the exporter’s error-free editing result independently reproduced.

## One-letter units — conditional presentation support, semantic ambiguity HOLD

Do not turn whitespace into proof of a unit. `30 m` may mean a variable product; g/h and superscripted m can be algebra, not mass/length. Explicit unit markup or known unit-role context can justify upright style. Preserve2m variable ambiguity, explicit math variables, lower-case vectors and all existing safe TeX preprocessing. Python accepts m/g/L and some litre prefixes/thin spaces; the two TS hunks cover only m/g with ASCII spaces, so parity is not established. Check plain versus math labels, negative/decimal/fraction numbers, exponent/subscript/prime contexts, NBSP/thin space, mL/dL/kL, cm/km and explicit roman commands. Source formatting is presentation evidence, not measurement or curriculum evidence.

## Provenance / licence / prompts / final review

README calls the assets self-authored. That is a claim, not a reviewed per-asset chain of creation, rights grant or attribution. The inspected manifests provide slug/label/file/viewBox/tags, not per-asset source author/licence/digest rights attestations. Store/bind a provenance manifest and licence/attribution/permission evidence before any public release. Canonical SVG/body hashes prove bytes, not ownership or correspondence to the photographed source. Stock replacement is an approximation and must not be described as exact source art.

Adopt in principle: distinguish geometry from decoration; preserve full final source-and-rendered review; missing picture assets reported as unknown. Hold the mandate to stand every object on two points unless exact anchor geometry is met. Exclude README◆8 as an automatic success route: a final rejected spec must not silently inherit an earlier picture/review under a newer candidate binding. A last-known-good display fallback would need explicit failure/version provenance and cannot become passed. Continue excluding automaticpassed promotion, uncertainty filters and last-review omission from earlier batches.

## Required execution before any integration claim (all PENDING here)

- Perspective: strict ordinary90±tolerance boundaries, planar45 true/false, degenerate rays, true3D orthogonality/projection binding, wrong boolean/arcs types and renderer marks.
- Assets: every existing old scene/render byte or approved versioned delta; new body sanitization, manifest uniqueness, file/root fences, nonfinite anchors, no-base anchors, flip/rotation/from-to exact mapping, near12degree cases, derived points, bounds/max640 and reserved names.
- Editor: parsed safe-group IDs, unknown/nested/duplicate markers, child-ID cleanup, ordinary-shape editability, selection/drag/undo/remove/rotate/flip, path H/V/relative/arc/cubic bounds and transformed ellipse extrema. Token stripping must preserve all nonasset geometry and the full review image.
- Units: cross-runtime Python/MathJax parity and variable-preservation matrix; no arbitrary literal text rewriting or grade approval.
- Provenance: perasset licence/source/body/version hash and unchanged old resource evidence; full real raster/native readability reviewed separately.

Only text/stdlib inspection and arithmetic witnesses were performed. No external source code imported/executed, no Root production code executed, no Node/browser/model/DB, no actual candidate or mathematical engine validation. Read-only git apply checks are compatibility diagnostics, not applications. Exact inputs/source hashes are in the accompanying receipts; earlier audits/dirty files remain intact.
