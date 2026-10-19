import json,hashlib
from pathlib import Path
p=Path('.qa-artifacts/exam-resume-20261008/vector-replay-code-audit-20261020-r3');prev=p.parent/'vector-replay-code-audit-20261020-r2'
def read(f):return json.loads(f.read_text(encoding='utf-8-sig'))
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
r=read(p/'own-report.json');parity=[]
for i in [1,2]:
 a=read(prev/f'own-actual-replay-{i}.json');b=read(p/f'own-actual-replay-{i}.json')
 fields=['candidate','candidateDigest','studentDigest','assetDigest','assets','inputHashes','status']
 for k in fields:assert a[k]==b[k],(i,k)
 parity.append({'candidate':i,'r2EvidenceSha256':sha(prev/f'own-actual-replay-{i}.json'),'r3EvidenceSha256':sha(p/f'own-actual-replay-{i}.json'),'bindingAndAssetAndInputFieldsEqual':fields})
r['normalR2R3BindingParity']=parity
r['scopeLimitsAdditional']=['Same-buffer capture restores parsed JSON/file-hash identity for the tested candidate/generation windows; it does not provide a filesystem lock, a trustworthy mutable renderer, or guarantee against inputs changed and restored outside observed read checkpoints.','CLI CWD guard compares resolved lexical paths; no exhaustive Windows junction/module-link attack audit was performed. No positive CLI writing parent output.','Synthetic raster generation records are local fixtures only, not provenance claims for generated artwork; raster replay remains held without renderer.']
r['r3RepairDecision']={'boundedTechnicalControls':'passed','r1AndR2FindingsPreserved':True,'candidateGenerationCapturedBytesFix':'independently confirmed for scoped windows','wholeEngineOrReleaseApproved':False}
(p/'own-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for f,h in r['sourceAfter'].items():assert sha(Path(f))==h
for dirname,field in [('vector-replay-code-audit-20261020-r1','r1Preservation'),('vector-replay-code-audit-20261020-r2','r2Preservation')]:
 for f,h in r[field]['files'].items():assert sha(p.parent/dirname/f)==h
print(json.dumps({'ownCases':r['ownCases'],'sourceHashEntries':len(r['sourceAfter']),'r1FilesPreserved':len(r['r1Preservation']['files']),'r2FilesPreserved':len(r['r2Preservation']['files']),'reportSha256':sha(p/'own-report.json')}))
