from pathlib import Path
import json,hashlib,subprocess
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');D=Path('D:/math-figure-editor')
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda n:json.loads((P/n).read_text(encoding='utf8'))
j=read('own-final-results.json');b=read('own-final-before.json')
assert all(sha(Path(p).read_bytes())==h for p,h in {**b['root'],**b['sourceWorkingTree']}.items())
assert read('own-before.json')['root']==b['root']
assert sum(r['ok']for r in j['actualRootLoaderSanitize'])==41
assert sum(r['ok']for r in j['actualRootElementaryRender'])==41
assert sum(r['accepted']for r in j['actualRootNativePictureRenderAndSolidRejections'])==25
def blob(rev,p):
 v=subprocess.run(['git','-C',str(D),'show',rev+':'+p],capture_output=True)
 return v.stdout if v.returncode==0 else None
contracts={}
for p in j['diffPaths51']:
 old,new=blob('f6804668',p),blob(j['sourceCommit'],p)
 contracts[p]={'oldSHA256':sha(old)if old is not None else None,'pinned5990SHA256':sha(new)if new is not None else None}
export=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/engine-all-sync-20261021-r1/source-export'
docs={}
for rel in ['README.md','patches/06-engine-all.patch','engine-check/check_engine.py']:
 old=(export/rel).read_bytes();p='docs/export/todays-math/'+rel;pin=blob(j['sourceCommit'],p);live=(D/p).read_bytes()
 docs[rel]={'savedSHA':sha(old),'pinned5990SHA':sha(pin),'savedEqualsPinned':old==pin,'liveSHA':sha(live),'liveEqualsPinned':live==pin}
report={
 'status':'intake compatibility HOLD; bounded existing Root renderer can consume pinned41 data; no synchronization applied',
 'sourceVersions':{'auditedEngineCommit':j['sourceCommit'],'observedResumeLiveHEAD':j['observedLiveHEAD'],'initialSourceStatus':read('own-before.json')['status'],'finalSourceStatus':j['sourceStatus'],'warning':'SourceD live working export checker and untracked07/08 are separate versions, not the pinned5990 engine. No execution of SourceD code. Initial clean-HEAD claim contradicted by observed dirty status; preserved.'},
 'executedDistinctFinalInputs':{'RootLoaderSanitize':41,'RootElementaryAssetScene':41,'RootNativePicture':25,'RootNativeSolidRejected':3,'totalFinalCallsNotIncludingRetries':110,'anchorsMetadataEntries':41,'Node':0,'browser':0,'modelOrAPI':0,'DB':0},
 'runtimeMethod':'Read exact5990 Git blobs into ignored owned data-only snapshot. Import current ROOT figure_assets/scene_assets/render_spec and current ROOT sanitizer. Point in-process asset data directory/caches at QA snapshot only. JSON-string input; require actual svg field, error envelope counts rejection. This is NOT execution of candidate scene_assets or build_catalog code.',
 'findings':[
 {'id':'AI41-LEGACY','status':'technical integration hold','evidence':'39/39 old editor geometry signatures mismatch new stock bodies;39/39 old viewBoxes mismatch. Unchanged slug is not identity. New-only registry would demote old assets from atomic/size-locked recognized groups. Current build_asset_editor_registry also asserts len39, so it cannot simply be run unchanged for41.',
 'proposal':'Version registry by slug AND exact canonical body fingerprint. Retain old39 signatures and their original viewBoxes/sourceLF hashes alongside new41 entries; look up actual matched body to select its own frame. Do not map old body to new viewBox. Retain old marker recognition only for exact known signatures, never arbitrary marked groups. Preserve IDs/transform/raw SVG/undo state; unknown or modified groups retain conservative normal editing. Explicit asset/artwork revision for new producer output, no silent existing-row rewrite. Add direct DOM old39+new41 transformed-frame tests after separate GO.'},
 {'id':'AI41-EXPECTED','status':'version hold','evidence':'Old6 expected metadata hashes:5 identical, assets.json4929->21670 bytes. Old expected remains authoritative for old revision. Checker/patch06/README saved-vs5990 bindings supplied separately; working checker is newer dirty version.',
 'proposal':'New versioned fixture suite/manifest and explicit migration evidence. Do not overwrite old assets expected to label prior output matched. No live checker executable run here.'},
 {'id':'AI41-ANCHORS','status':'bounded metadata observed','evidence':'41 current pinned anchor maps finite pairs within each manifest viewBox; no out-of-bounds cases. from/to changes from base/top to optional edgeBase/edgeTop; building-3d and house-3d added to picture whitelist (23->25). New scene logic only shrinks free-at objects when fixed geometry/from-to layout fits.',
 'limits':'Anchor metadata geometric membership does not establish semantic ground/top/front edge or image measurement accuracy. README numeric prose must not override actual JSON. New candidate edge-anchor and shrink runtime NOT executed; current Root native25 uses old scene logic with new data. Need candidate-specific edge endpoint alignment/shrink/no-label-clipping tests before adoption.'},
 {'id':'AI41-SEMANTICS','status':'hold','evidence':'can/dice/bowl rejected as v2 picture assets; all41 still available in elementary assetScene. building-3d/house-3d are context artwork, not solid mathematical verification. No right-angle/radius/length theorem evidence comes from rendered artwork.'}
 ],
 'contracts':{'changed51CommitFileHashes':contracts,'exportBindings':docs,'sixOriginalExpectedMetadata':j['sixExpectedMetadataNotRuntime'],'allowedPictureSlugs':j['pictureAllowed'],'newSlugs':j['newSlugs']},
 'harnessHistory':'Initial dict-vs-string invocation failed; second invocation returned envelopes but counted completion, not svg success. Both evidence files preserved. Final necessary envelope-aware replay validates same inputs, no source changes or expectation relaxation. Resume HEAD guard stopped before runtime when SourceD advanced; final pinned5990 blobs audited separately from liveHEAD. Counts110 represent final distinct inputs, not sum of attempts.',
 'hashes':{'rootBeforeAfterUnchanged':True,'rootAlsoMatchesInitialPreRestart':True,'sourceWorkingDuringFinalUnchanged':True,'exactCommitted51Bound':True,'RootImportClosure':j['actualRootImportClosure']},
 'preparedNotExecuted':['Dual legacy/current registry and all80-body DOM recognition/frame tests','Candidate edge_anchor and from-to/shrink branches','Live/new checker07/08 versioned integration','Units regression: existing Root implementation unchanged, not replayed in this asset-only task','No semantic image/pixel fidelity/licence validation'],
 'approvals':{'sourceIdentity':False,'licenceRights':False,'grade':False,'math':False,'nativeUI':False,'operationalRelease':False},
 'staging':'Own scripts/reports/hash receipts only. QA snapshot contains inert committed source SVG data and remains local ignored, not staged. No originalPNG manipulation; Root/SourceD production writes0.',
 'artifactSHA256':{f.name:sha(f.read_bytes()) for f in P.iterdir() if f.is_file() and f.name!='own-report.json'}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'status':'intake-HOLD','finalDistinctCalls':110}))
