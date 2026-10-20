from pathlib import Path
import json,hashlib,subprocess
BASE=Path('.qa-artifacts/exam-resume-20261008');folders=[BASE/'fresh-root-first3-review-20261020-r3/daegudong',BASE/'fresh-root-first3-review-20261020-r2/daegubuk']
read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();digest=lambda x:hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
for folder in folders:
 v=folder/'verification';replay=read(v/'own-review-replay-receipt.json');after=[{'path':x['path'],'sha256':sha(Path(x['path']))} for x in replay['inputsBefore']];assert after==replay['inputsBefore'];out=[]
 for item in replay['items']:
  n=item['n'];rawFile=folder/'blind/solve'/f'q{n:02}.json';raw=read(rawFile);f=v/'reports'/f'q{n:02}.json';report=read(f)
  assert rawFile.read_bytes()==subprocess.check_output(['git','show',replay['helperRawCommit']+':'+rawFile.as_posix()]);assert sha(rawFile)==item['rawSha256'];assert report['solveDigest']==item['solveDigest']==digest(raw)
  for key in ['studentDigest','candidateDigest','assetDigest']:assert report[key]==item[key]
  assert report['status']=='pending' and report['method']=='independent-solve-then-review' and len(report['checks'])==12 and sum(report['checks'].values())==11 and report['checks']['unitFamilyFit'] is False
  assert set(report['curriculumSurfaces'])=={'stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'}
  for k,x in report['curriculumSurfaces'].items():assert x['status']=='passed' and isinstance(x['basis'],str) and len(x['basis'])>50
  for k in report['checks']:assert report['evidence']['checks'][k]['basis']
  out.append({'n':n,'rawSha256':sha(rawFile),'reportSha256':sha(f),'checksPassed':11,'curriculumSurfacesPassed':7,'status':'pending'})
 receipt={'allInputSourceRawPackageAndPreviewHashesBeforeAfterEqual':True,'filesAfter':after,'reports':out,'rawGitBlobEquality':True,'collectorExecuted':False,'mockCollectorUsed':False,'dbApiWrites':0,'sourceInputEdits':0,'rawEdits':0,'oldReportEdits':0}
 with (v/'own-review-after-receipt.json').open('x',encoding='utf-8') as f:json.dump(receipt,f,ensure_ascii=False,indent=2);f.write('\n')
 own=[f for f in sorted(v.glob('own-review-*')) if f.is_file() and f.name!='own-review-file-hashes.json']+[v/'reports'/f"q{x['n']:02}.json" for x in out]
 (v/'own-review-file-hashes.json').write_text(json.dumps({f.relative_to(v).as_posix():sha(f) for f in own},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'folder':str(folder),'boundInputsPreserved':len(after),'reports':out},indent=2))
