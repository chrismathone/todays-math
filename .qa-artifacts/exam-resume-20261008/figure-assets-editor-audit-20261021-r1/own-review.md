# Asset editor merge contract — static audit, no Node/browser pass

## Scope and evidence

Reviewed patch05 src7 hunks and the actual current figureBake, figureEditGeometry, figureGroupSelection, selection overlay, size lock, rotate/mirror and editor commit/drag/history branches. Root is actively integrating src05; before/after raw hashes identify which version these observations describe. No code was changed. React skill guidance was read; no React runtime or type checker was run. Twelve own synthetic SVGs and a pending test plan are supplied. Three small stdlib arithmetic checks passed; those are not TS/DOM test passes.

## Principal merge gap: group-only bake bounds

Registering `g[data-asset]` as one object does not automatically make the existing bake engine group-aware. At the read snapshot, figureBake.localPoints switches on line,polygon/polyline,rect,circle/ellipse,path and returns[] for g. extentPoints therefore returns[] for a selected g. runBake builds shapeExtents from selected nodes and returns the original SVG if extents is empty (lines691..697). Thus a lone group asset has no rotation/mirror bounds; a group plus an ordinary line can rotate about a centre computed from the line alone. The transform fallback itself could move a group once reached, but no extents means it is not reached for a group-only selection. Frame widening also calls inkPoints on the selected group, so descendants are absent there. These are SOURCE-PATH inferences, not observed runtime outputs.

Translation is a separate path: pointer drag and AI move update the selected element's transform and preserve its descendants; ancestor matrix functions exist. Those facts support a feasible group move, not proof of correct nested-space pointer behavior. Test translate under rotate/scale ancestors with world-coordinate point equality, not just that some transform string changed.

Fix direction for Root: a single bounded child-geometry walker shared by group extent/ink, model-description bbox and frame logic. Include ancestor transforms exactly once, exclude defs/nonrendering descendants, recurse only into validated asset groups, cap elements/path tokens, and return unknown/fail closed for unsupported geometry. Keep ordinary primitive bake behavior unchanged. Do not loosen shape correctness merely to make g rotate. A separate group transform operation is viable only with correct child extent and framing.

## Three boxes are different contracts

1. figureGroupSelection's real-browser getBBox/getScreenCTM maps all FOUR rectangle corners; its selection overlay can support g in principle. It is a rendered browser measurement and is unavailable in tiny jsdom without geometry support.
2. figureBake uses source geometry with an actual SVG path grammar and exact transformed ellipse extents, but currently lacks group recursion. Its parser is internal; reuse/refactor under bounded contract rather than duplicate a number regex.
3. patch05 assetBox uses raw numeric pairs for paths, two opposite corners for rect/ellipse, then transforms them. That is not a valid general bbox. A10x10 square rotated45degrees has x bounds±7.071, but those two diagonal corners both have x0. A unit circle remains x±1 after rotation but that method gives x~0. The path M100 100 h10 v10 (with the actual spaced form in fixtures) consists of relative H/V parameters, not pair(10,10). Curves, arc radii/rotation/flags, repeated/relative commands and nonuniform transforms need grammar-aware bounds. Do not report arbitrary control-point bounds as exact ink extents. Return undefined/unknown if exact or conservative-correct bounds are unavailable.

## Marker, ID and stripping boundaries

The raw src05 additions recognize any g[data-asset], and exclude descendants under any data-asset ancestor. Unlike the hardened grid layer, no shared catalogue/body/group validator is visible in those hunks. Unknown slug, malformed slug, a leaf line carrying the marker, nested markers and a known-slug group wrapping an ordinary AB line all need independent treatment. Metadata alone cannot prove the SVG body is decorative stock art. Invalid/untrusted markers should be removed without deleting geometry or hiding its editable ID. For valid assets define ONE ID for the outer group, clear stale child IDs, and verify stable IDs through prepare/serialize/remove/undo/redo. Leaf markers must not rename an algebraic line as a house. Duplicated/subnested IDs and groups inside defs must not become selection targets.

stripAssetBodies removes a matched group's entire body based only on marker syntax. A forged house group around AB therefore removes AB from the textual current-SVG view, even though the line may be mathematically necessary. This is a static counterexample; the actual TS function was not invoked. Only strip bodies validated against a registered exact body/version/transform provenance binding. Keep a separate full SVG/image for final review and stored output; never feed the stripped derivative back into persistence, rendering or student assets. Regex matching of tags is not an XML/semantic validator.

## Size lock, styling, undo

selectionBlockKind checks isSizeLocked for all selected object types, so existing rotate/mirror UI/command blocks should extend to g; selection overlay also omits resize controls when locked. The group's data-size-locked attribute must remain on the OUTER editable node. blocksSizeChange's shape-attribute table has no g entry and transform is not a shape attribute, so do not claim generic raw transform assignment is a size-lock security boundary. Preserve move-allowed policy and test all supported entry points. Asset child fill/stroke is often explicit; changing only inherited group style may produce no visible change, so style success cannot be assumed.

Editor commit records complete SVG strings, undo/redo restores them and clears selection. This supports exact asset restoration if metadata/child IDs survive serialization. It is still necessary to mount history and drag tests: show one commit per gesture, exact prior SVG restore, no child detachment or hidden stale IDs, and no extra mutation of ordinary geometry/labels. Merely retaining history code is not a passed asset undo test.

## Units: current Python comparison is historical evidence only

Current Python unit source hash is bound; previously sealed independent engine-runtime R2 parsed30m/5g upright,2m and g/h variables, and3mL with both letters upright. Reuse is labelled historical, not new execution. Both TS toTex functions already romanize multi-letter words, so mL/dL/kL may be handled by that earlier step: do not falsely diagnose them as absent simply because the added unit regex lists only m/g. Single L in explicit math mode and thinspace/NBSP are real parity questions: the new TS regex uses ASCII spaces and m/g; Python has m/g/L and additional spaces. Need actual two-TS/Python fixtures before parity claims.

`$30 m$` is still romanized after the ordinary wasMath decision, so dollar math mode does not guarantee a spaced lowercase variable stays italic. Units and multiplication are indistinguishable from whitespace alone. Keep exact imported presentation behavior as directed, but do not certify semantic units, dimensions or school grade from typography. No extra model call or source rewriting is proposed.

## Pending actual tests

See own-pending-runtime-plan.json. Required cohorts include group-only and group+line rotation, double mirror/four rotations, nested transforms, move, outer size lock, stale IDs, all marker cases, source/path bbox correctness or unknown, token-stripping scope, mounted undo/redo and visual bbox/handles. No Node/browser/runtime assertions have executed here. Root's future tests and any separate GO must be recorded independently.

## Read-scope incident

An early shell rg command containing a literal quote was misparsed by native argument handling and searched the helper working directory, printing public SVG lines outside the allowed source scope. The command completed; no such data was reused in analysis, fixtures or committed files, and no further original/reference reads were made. This is an audit read-scope error, not a production defect. Subsequent reads use Python with explicit source paths. Also, initial generic geometry.ts/selection.ts guesses were absent; the actual modules are figureEditGeometry.ts and figureGroupSelection.ts. This disclosure limits any claim of pristine source nonexposure; there is no new blind solve in this task.
