from pathlib import Path
import json,hashlib,subprocess
BASE=Path('.qa-artifacts/exam-resume-20261008');R=BASE/'fresh-root-next2-review-20261020-r1';S=BASE/'fresh-three-source-component-review-20261020-r1';read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();dg=lambda x:hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
for name,n in [('daegudong',3),('daeguil',2)]:
 v=R/name/'verification';replay=read(v/'own-review-replay-receipt.json');f=v/'reports'/f'q{n:02}.json';report=read(f)
 # Correct an unsealed editorial typo only; source/raw/previous sealed reports are never rewritten.
 report['evidence']['metadata']['difficultyReview']=report['evidence']['metadata']['difficultyReview'].replace('基本~응용','기본~응용')
 f.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 after=[{'path':x['path'],'sha256':h(Path(x['path']))} for x in replay['inputsBefore']];assert after==replay['inputsBefore'];rawFile=R/name/'blind/solve'/f'q{n:02}.json';raw=read(rawFile)
 assert rawFile.read_bytes()==subprocess.check_output(['git','show',replay['helperRawCommit']+':'+rawFile.as_posix()]);assert h(rawFile)==replay['rawSha256'];assert dg(raw)==report['solveDigest']==replay['solveDigest']
 for k in ['studentDigest','candidateDigest','assetDigest']:assert report[k]==replay[k]
 assert report['status']=='pending' and len(report['checks'])==12 and sum(report['checks'].values())==11 and report['checks']['unitFamilyFit'] is False
 assert set(report['curriculumSurfaces'])=={'stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'}
 assert len({z['basis'] for z in report['curriculumSurfaces'].values()})==7
 for z in report['curriculumSurfaces'].values():assert z['status']=='passed' and len(z['basis'])>50
 for k in report['checks']:assert report['evidence']['checks'][k]['basis']
 primary=read(S/'own-primary-receipt.json');assert h(S/primary['localOnlyHtml'])==primary['sha256']
 receipt={'allSourceCurrentPackageRawPreviewInputsBeforeAfterEqual':True,'filesAfter':after,'rawGitBlobAndParentSealEquality':True,'rawSha256':h(rawFile),'reportSha256':h(f),'checksPassed':11,'checksTotal':12,'all7SurfacesHaveDistinctPassedBasis':True,'ownReplayChecksPassed':replay['checksPassed'],'collectorExecuted':False,'mockCollectorUsed':False,'inverseRadicalRatioEngineRead':False,'inputOrRawEdits':0,'oldReportsModified':False,'dbApiWrites':0,'newBlindClaim':False,'modelUnchanged':True}
 with (v/'own-review-after-receipt.json').open('x',encoding='utf-8') as out:json.dump(receipt,out,ensure_ascii=False,indent=2);out.write('\n')
 print(json.dumps({'exam':name,'reportSha256':h(f),'rawUnchanged':True,'checksPassed':11,'gradeSurfacesPassed':7},indent=2))
# Match the same unsealed typo correction in the reproduction script.
script=R/'daegudong/verification/own-review-write.py';script.write_text(script.read_text(encoding='utf-8-sig').replace('基本~응용','기본~응용'),encoding='utf-8')
for name,n in [('daegudong',3),('daeguil',2)]:
 v=R/name/'verification';files=[f for f in sorted(v.glob('own-review-*')) if f.is_file() and f.name!='own-review-file-hashes.json']+[v/'reports'/f'q{n:02}.json'];(v/'own-review-file-hashes.json').write_text(json.dumps({f.relative_to(v).as_posix():h(f) for f in files},indent=2)+'\n',encoding='utf-8')
