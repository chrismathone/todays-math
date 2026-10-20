from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;Q=P.parent
paths=[Q/f'inverse-equation-degree-proposal-20261020-r{r}/student-only26.json' for r in [1,2]]
a,b=[json.loads(p.read_text(encoding='utf-8-sig')) for p in paths];delta=[]
def diff(a,b,path=''):
 if type(a)!=type(b):delta.append(path);return
 if isinstance(a,dict):
  for k in a.keys()|b.keys():
   if k not in a or k not in b:delta.append(path+'/'+k)
   else:diff(a[k],b[k],path+'/'+k)
 elif isinstance(a,list):
  if len(a)!=len(b):delta.append(path)
  else:
   for i,(x,y) in enumerate(zip(a,b)):diff(x,y,path+'/'+str(i))
 elif a!=b:delta.append(path)
diff(a,b);expected=['/courseAsProposed','/metadataRevision']+[f'/questions/{n}/questionType' for n in range(26)];assert sorted(delta)==sorted(expected)
(P/'own-metadata-delta.json').write_text(json.dumps({'observedOnlyDeltaPaths':sorted(delta),'allStudentBodiesAndDigestsUnchanged':True,'correctedCourse':b['courseAsProposed'],'correctedTypes':sorted(set(q['questionType'] for q in b['questions'])),'rawUnchanged':True,'newSolveCredit':0,'inputSHA256':[hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]},ensure_ascii=False,indent=2),encoding='utf-8')
