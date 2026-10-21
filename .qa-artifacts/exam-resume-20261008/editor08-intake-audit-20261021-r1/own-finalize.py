from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
b=json.loads((P/'own-before.json').read_text(encoding='utf8'));rows=json.loads((P/'own-file-bindings.json').read_text(encoding='utf8'))
assert all(sha(Path(p).read_bytes())==h for p,h in b['RootFiles'].items())
plans={
'FigureAssetMenu.tsx':('preserve-merge','Menu concept portable; Next asset loading adaptation first, disabled/lock/focus/async completion cancellation and undo require runtime. Solid tab is artwork classification, no mathematical permission.'),
'FigureChipText.tsx':('preserve-merge','Retain Root existing lazy-import failure fallback and null layout guard; do not regress by wholesale patch.'),
'FigureEditor.tsx':('preserve-merge','Integrate insertion through current commit/undo state once; retain current keyboard undo/redo/delete surface focus and lock contract. Async load can complete after intervening edit/close; review latest state/cancellation, not captured old svg. Current implementation not executed.'),
'FigureGridPanel.tsx':('preserve-merge','Keep Root finite integer1..60 guard and cover disabled/limit message, no snap or point changes.'),
'FigureGroupRow.tsx':('preserve-merge','Nested group operation UI concept acceptable; stack bounds, selected subset, name collision/ID/history tests required.'),
'FigureLabelInput.tsx':('preserve-merge','Keep Root warning{value,text} binding, unchanged Enter/blur warnings, root2 click conversion; no unconditional source replacement.'),
'FigureObjectList.tsx':('preserve-merge','Keep strict recognized atomic asset treatment and math-label fallback; test numeric/role preservation.'),
'FigurePanelFold.tsx':('direct-transfer-candidate','Small UI optional-fold behavior isolated from geometry; static candidate only, requires Root token/API compatibility and keyboard test.'),
'FigureSelectionOverlay.tsx':('preserve-merge','Cursor affordances only; retain SizeLocked prevention and four-corner frames; no point movement to satisfy cursor.'),
'figureAngleMark.ts':('hold','Perspective allows display mark on non90deg rays; not permission to assert right angle. Require explicit true+right, finite/nondegenerate rays, preserve planar rejection and source evidence. No typo-induced automatic activation.'),
'figureAssetLibrary.ts':('hold','Vite import.meta.glob is not current Next loading contract; replace with controlled generated bounded body/thumbnail resources, exact allowlist/hash/schema, no arbitrary file lookup. Do not execute source Vite code.'),
'figureEditApply.ts':('preserve-merge','Add typed perspective only alongside guarded angle helper/schema; commands cannot waive semantic truth. Retain lock and current protected evidence.'),
'figureEditElements.ts':('hold','Incoming assetBox uses rect two corners and pairs arbitrary path numbers; wrong under45deg/grammar. Retain Root verified legacy/current identity-specific four-corner container; marker alone cannot become atomic.'),
'figureGrid.ts':('preserve-merge','Retain Root strict metadata, raw-before-round and after-round validation, valid first-root-group/path boundary; imported historical source is not stronger.'),
'figureObjectGroups.ts':('preserve-merge','Reserved hidden group names sensible; ensure full name uniqueness/partial regroup/ungroup sequencing and history serialized stack restored. Runtime pending.'),
'figureObjectNames.ts':('preserve-merge','Use asset name only after strict recognition; unknown marker cannot hide ordinary math role/number.'),
'figureSvgEditing.ts':('hold','Do not replace strict marker validation with closest(data-asset/data-grid) trust. Add body insertion through trusted registry identity, preserve legacy39 own viewBox/current41. Enforce finite viewBox/center/scale/body/id, reject modified/nested/foreign bodies and duplicate IDs; preserve raw geometry/labels/numbering/history. Validate body and sanitized output before commit.'),
'mathjaxLabel.ts':('preserve-merge','Editor mathjax units keep current escaped/unescaped context safeguards; m/g variables vs units and repetition need dedicated runtime, not this static intake.'),
'types.ts':('direct-transfer-candidate','Optional notice/stage props additive in isolation; do not widen request/storage/grade contract; inspect callers before integration.'),
'figure-edit-contract.ts':('preserve-merge','Strict optional boolean perspective on addAngle only; false/nonboolean/missing-right cases and denied-role inputs require tests. No routing/model change.'),
'figure-edit-prompt.ts':('preserve-merge','Separate projected display from actual Euclidean proof and retain printed-condition/source restrictions; no semantic authority from artwork.'),
'figure-prompt.ts':('preserve-merge','Assets catalogue and dedicated review-issues-data can be integrated as bounded escaped model feedback, not trusted source facts. Keep Root current uncertainty wording, heuristic grid warning, final review and no unsupported line invention.'),
'figure-repair.ts':('hold','Do not auto adopt edge-line insertion, duplicate-target typo renaming or rounded uniform scaling as meaning preserving. Require source-backed explicit repair evidence and final review, regenerate digests, preserve original. Existing repair notes are useful audit trail but not proof.'),
'review-issues.ts':('direct-transfer-candidate','Small REVIEW_PREFIX constant is portable; no filter/pass transformation. Prefix is provenance hint only, not authentication or trusted instruction.'),
'assetCatalog.ts':('hold','Preserve Root current41+legacy39 registry architecture and source/version provenance. Do not restore stripAssetBodies; known marker is insufficient to erase evidence. Catalogue listing does not approve maths/licence.'),
'vectorLabel.ts':('preserve-merge','Keep current uppercase upright vec/overparen and lowercase variables; no broad replacement of current validated converter.')
}
table=[]
for row in rows:
 name=Path(row['path']).name
 # Two mathjax modules deliberately share a rationale; still separate bound paths.
 decision,reason=plans[name]
 table.append({**row,'disposition':decision,'reason':reason,'comparison':'static conflict review, not git apply/3way result','rootEqualsIncomingRawGitBlob':row['rootGitBlob']==row['incomingGitBlob']})
assert len(table)==27
(P/'own-transfer-and-conflict-table.json').write_text(json.dumps(table,ensure_ascii=False,indent=2),encoding='utf8')
report={
 'scope':'Pinned4ccb0cb README fourth export +27-file patch08 static intake; NOT complete editor/code/security/runtime review',
 'sourceCommit':b['sourcePinnedCommit'],'README_SHA256':b['README_SHA'],'patch08_SHA256':b['patch08_SHA'],
 'status':'partial portable concepts, preserve-merge required, high-risk automatic repair/body-stripping deferred; no production application',
 'fileCount':27,'RootBoundFiles':len(b['RootFiles']),'RootBeforeAfterUnchanged':True,
 'dispositionCounts':{k:sum(r['disposition']==k for r in table)for k in ['direct-transfer-candidate','preserve-merge','hold']},
 'executed':{'PythonStaticHashAndArithmetic':True,'staticWitnesses':5,'TS':0,'DOM':0,'Node':0,'browser':0,'model':0,'DB':0,'sourceDExecution':0,'productionWrites':0},
 'majorBoundaries':[
 'Current Root figureAssetGeometry matches exact body signatures across current and legacy registries with identity-specific viewBoxes and finite transform validation. Patch loose marker/old assetBox must not displace these controls.',
 'addFigureAsset parses body into DOM and emits marker/transform; patch itself does not establish strict registered-body acceptance. Unknown slug, arbitrary body, nonfinite center/viewBox, empty/error parse, ID collision, scale rounding to zero and shape hiding need explicit guards/tests.',
 'Nested group stack is grouping metadata, not geometric evidence. Keep shape/labels/numeric attributes unchanged; bound stack depth/length/name and preserve atomic size locks, one commit per operation, undo/redo and selected-subset recovery. No runtime verification yet.',
 'Uniform scale mathematically preserves similarity only before numeric rounding, and only if every relevant spatial field shares scale. Proposed3-decimal rounding can collapse distinct points; coordinate-scale convention cannot be inferred from viewBox failure. Repair changes body/digest and must be revalidated, never bless by rehash alone.',
 'Asset from/to does not certify a printed geometric segment; adding solid edge from artist placement can manufacture ray coverage or lose dashed semantics. Preserve source-directed retry when unsupported.',
 'perpective->perspective may bypass flat90deg check; duplicate unknown fields can rename to same target and overwrite. Evidence-aware correction/unique mapping/strict values required; do not silently reinterpret permission.',
 'review-issues-data can separate error categories, but feedback is untrusted bounded escaped data, not source truth. Keep Root parseReview passed&&issues.length===0, final source-and-rendered-images review, timeout false/original preservation. Do not adopt README historical issue filtering or skip last review.',
 'stripAssetBodies can delete mathematical subtree based only on marker; excluded from adoption. Raw original/current SVG remains preserved; no evidence reduction without separate proven identity and full review context.'
 ],
 'requiredFollowupControls':['Actual Next build/import path with controlled registry body loading','Old39+new41 exact identity/frame/unknown-addedmath/leaf/nested/wrongd marker negative DOM tests','Insert after late async resolution/closed editor/undo-redo/delete/size lock/id/number preservation','Nested grouping partial ungroup/name collision/stack serialization depth','Perspective false/nonboolean/right absent/planar90 rejection/source-supported projected display only','Scaling coincident points/circle incidence/dashes/radii/labels/derived point modes and unchanged-source rejection','Review-issue injection/negative or ambiguous feedback/final review/timeout/cancel original preservation'],
 'TypeSafe':{'skillRead':True,'liveConfidenceRead':'https://docs.typesafe.ai/confidence','liveBuildingGuideAttempt':'https://docs.typesafe.ai/concepts/how-to-build-with-system-one inaccessible; no API assumptions invented','application':'Known values/calculations stay deterministic; feedback is evidence, not permission; uncertainty must not become approval. No model/routing integration implemented.'},
 'skills':'React best practices read for menu/editor/lazy-loading static review; no UI authored.',
 'limitations':'Static5 source/data-flow/arithmetic witnesses are not production runtime exploit claims or TS test passes. Parent exporter1519 and8 exact results not independently rerun. No original questions/math/grade/rights/native/operational approval.',
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in P.iterdir()if f.is_file()and f.name!='own-report.json' and not f.name.startswith('own-local-')}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'dispositions':report['dispositionCounts']}))
