from pathlib import Path
import subprocess,hashlib,json,re,math
from fractions import Fraction as F
P=Path(__file__).resolve().parent;D=Path('D:/math-figure-editor');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');REV='4ccb0cb'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git','-C',str(D),*a])
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · editor08 정적 이관 감사\n',encoding='utf8');assert '감사' in (P/'own-probe.txt').read_text(encoding='utf8')
rev=git('rev-parse',REV).decode().strip();patch=git('show',f'{rev}:docs/export/todays-math/patches/08-editor-all.patch');readme=git('show',f'{rev}:docs/export/todays-math/README.md')
# Local ignored reference bytes only; never executed or production-applied.
(P/'own-local-patch08.txt').write_bytes(patch)
(P/'own-local-readme.txt').write_bytes(readme)
parts=re.split(r'(?m)^diff --git a/(\S+) b/\S+\n',patch.decode())
rows=[];rootBefore={}
for i in range(1,len(parts),2):
 path,body=parts[i:i+2];target=R/path
 if target.exists():rootBefore[str(target)]=sha(target.read_bytes())
 idx=re.search(r'(?m)^index ([0-9a-f]+)\.\.([0-9a-f]+)',body)
 rows.append({'path':path,'patchSectionSHA':sha(body.encode()),'baseGitBlob':idx[1]if idx else None,'incomingGitBlob':idx[2]if idx else None,'rootExists':target.exists(),'rootRawSHA':sha(target.read_bytes())if target.exists()else None,'rootGitBlob':subprocess.check_output(['git','-C',str(R),'hash-object','--no-filters',str(target)]).decode().strip()if target.exists()else None,'addedLines':sum(s.startswith('+')and not s.startswith('+++')for s in body.splitlines()),'removedLines':sum(s.startswith('-')and not s.startswith('---')for s in body.splitlines())})
extras=['src/components/unified/figure-editor/figureAssetGeometry.ts','src/components/unified/figure-editor/figureGridMetadata.ts','src/components/unified/figure-editor/figureBake.ts','src/components/unified/figure-editor/figureSizeLock.ts','src/lib/figure/asset-editor-geometry.json','src/lib/figure/asset-editor-geometry-legacy-20261021.json','src/lib/dev-ai/figure-engine.ts','src/lib/dev-ai/figure-comparison.ts','package.json']
for path in extras:
 f=R/path
 if f.exists():rootBefore[str(f)]=sha(f.read_bytes())
assert len(rows)==27
dump('own-before.json',{'sourcePinnedCommit':rev,'README_SHA':sha(readme),'patch08_SHA':sha(patch),'RootFiles':rootBefore,'sourceObservedHEAD':git('rev-parse','HEAD').decode().strip(),'sourceWorkingStatus':git('status','--short').decode()})
def dist(a,b):
 v=list(range(len(b)+1))
 for i,x in enumerate(a,1):
  old=v[0];v[0]=i
  for j,y in enumerate(b,1):old,v[j]=v[j],min(v[j]+1,v[j-1]+1,old+(x!=y))
 return v[-1]
fields=['vertex','points','p1','p2','radius','label','label_distance','arcs','right','perspective']
near={s:[f for f in fields if dist(s,f)<=2]for s in ['perpective','perspectiv']};assert all(v==['perspective']for v in near.values())
# Exact arithmetic witnesses for translated algorithms, NOT TS runtime tests.
k=F(500,1000000);oldB=F(1,1000);scaled=oldB*k
assert scaled<F(1,2000)
counter=[
 {'id':'scale-rounding-collapse','method':'Exact Fraction calculation of proposed n(v)=round(v*k*1000)/1000','input':{'points':{'A':[0,0],'B':[0.001,0],'C':[1000000,0]}},'k':str(k),'exactScaledB':str(scaled),'serializedRoundedB':0,'effect':'distinct A/B collapse; uniform mathematical similarity no longer exact after3-decimal rounding. Needs reject or source-backed retry, not approve.'},
 {'id':'typo-duplicate-target','method':'Python Levenshtein mirror of stated editDistance; source not executed','near':near,'input':{'right':True,'perpective':False,'perspectiv':True},'effect':'Both unknown keys map to perspective; existing-target guard sees no original perspective; Object.fromEntries duplicate target retains last and loses prior value.'},
 {'id':'edge-not-printed','method':'Source predicate witness, not TS execution','input':{'assets':[{'asset':'house','from':'D','to':'C'}],'segments':{},'angle':{'vertex':'D','points':['C','A']}},'effect':'from/to artistic alignment does not prove printed construction segment DC; assetEdgeSegment invents solid DC based only on metadata. Newly added line can satisfy ray-coverage check without source evidence.'},
 {'id':'marker-stripping-math','method':'Static regex/data-flow witness, not JS execution','input':'<g data-asset="house"><line x1="0" y1="0" x2="100" y2="0"/></g>','effect':'stripAssetBodies replaces whole marked subtree without registered-body identity; a real mathematical line can disappear from prompt evidence.'},
 {'id':'rotated-two-corners','method':'Exact transformed rect-corner calculation','input':{'rect':[0,0,10,10],'rotateDeg':45},'diagonalPairXRange':[0,0],'trueFourCornerXRange':[-10/math.sqrt(2),10/math.sqrt(2)],'effect':'incoming assetBox underbounds; raw path-number pairing also ignores command grammar. Keep Root registered4corner frames instead.'}
]
dump('own-static-counterexamples.json',counter)
dump('own-file-bindings.json',rows)
after={f:sha(Path(f).read_bytes())for f in rootBefore};assert after==rootBefore
dump('own-after.json',after)
print(json.dumps({'patchFiles':len(rows),'boundRootFiles':len(rootBefore),'staticWitnesses':len(counter),'Node':0}))
