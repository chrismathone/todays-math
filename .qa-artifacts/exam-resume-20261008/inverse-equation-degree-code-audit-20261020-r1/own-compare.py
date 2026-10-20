from pathlib import Path
import json, hashlib, itertools
from fractions import Fraction
P=Path(__file__).resolve().parent; Q=P.parent; S=json.loads((P/'provided-scope.json').read_text(encoding='utf-8-sig')); R=Path(S['root'])
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
paths=[Path(c['rootReadOnly']) for c in S['code']]+[Path(c['immutableCopy']) for c in S['code']]
paths += [Q/'inverse-equation-degree-proposal-20261020-r1/student-only26.json',Q/'inverse-equation-degree-proposal-20261020-r1/own-raw-solutions-r1.json',Q/'inverse-equation-degree-proposal-20261020-r2/student-only26.json',P/'private/generated26.json',P/'git-raw-before-private.json',R/'.qa-artifacts/exam-resume-20261008/curriculum-evidence.json',R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/live-family-snapshot-r2.json',Q/'gangbuk-first2-review-20261020-r2/own-review-evidence-r1/own-primary-receipt.json']
(P/'own-before.json').write_text(json.dumps({str(p):sha(p) for p in paths},indent=2),encoding='utf-8')
checks=[]
def ck(name,ok,detail=None): checks.append(dict(name=name,pass_=bool(ok),detail=detail))
for c in S['code']:
 ck('root/copy/'+c['path'],sha(Path(c['rootReadOnly']))==sha(Path(c['immutableCopy']))==c['sha256'])
r1=read(paths[14]); raw=read(paths[15]); r2=read(paths[16]); drafts=read(P/'private/generated26.json')['questions']
ck('raw-sealed-sha',sha(paths[15])=='15fe947d743c048b8ee07786cb78aa954a0f64ea676b49c312e9a775bd8d55a8')
ck('r2-course',r2['courseAsProposed']=='중3')
rows=[]
for a,b,o,d in zip(r1['questions'],r2['questions'],raw['solutions'],drafts):
 n=a['n']; e=o['evidence']; v=e['independentPrintedFactorReading']; p,q,r,s,t=map(int,[v['leftSubtractConstant'],v['leftXAddend'],v['rightX2Coefficient'],v['rightExtraXCoefficient'],v['rightConstant']]); L=(q-1)*r-p-s; C=-p*q-t
 ck(f'{n}/payload-digest',a['content']==b['content']==d['content'] and a['studentDigest']==b['studentDigest']==o['studentDigest'])
 ck(f'{n}/metadata-only',set(k for k in a if a[k]!=b[k])=={'questionType'} and b['questionType']=='단답형')
 ck(f'{n}/answer-vs-independent-seal',d['answer']==o['answer']==str(r))
 ck(f'{n}/params-from-own-printed-read',d['parameters']==dict(p=p,q=q,r=r,s=s,t=t))
 x=Fraction(-C,L); ck(f'{n}/root-exact',(r*x-p)*(x+q)==r*x+r*x*x+s*x+t and str(x)==e['rootX'])
 # Independently form each mathematical sentence expected from own printed coefficient expansion.
 qastr='a' if q==1 else str(q)+'a'; lx='x' if L==1 else '-x' if L==-1 else str(L)+'x'
 expected=[f'ax^2+({qastr}-{p})x-{p*q}',f'(a-{r})x^2+({qastr}-{p}-a-({s}))x-{p*q+t}=0',f'{lx}-{p*q+t}=0']
 ck(f'{n}/all-three-solution-formulas',all('$'+z+'$' in d['solution'] for z in expected),expected)
 ck(f'{n}/nonzero-and-unique-statement',L!=0 and '0이 아니다' in d['solution'].replace('$','') and '하나뿐' in d['solution'])
 ck(f'{n}/no-advanced-required-method',not any(z in d['solution'] for z in ['판별식','근의 공식','근과 계수','미분','행렬']))
 rows.append({'n':n,'studentDigest':b['studentDigest'],'a':str(r),'L':L,'C':C,'x':str(x),'studentSolutionSHA256':hashlib.sha256(d['solution'].encode()).hexdigest(),'formulas':expected})
all32=[dict(zip(['p','q','r','s','t'],v)) for v in itertools.product([2,3],[1,2],[2,4],[-2,1],[1,5])]
excluded=[v for v in all32 if v['r']*(v['q']-1)-v['p']-v['s']==0]
ck('full-domain-32-minus6',len(excluded)==6 and len(drafts)==26 and {tuple(v.values()) for v in all32 if v not in excluded}=={tuple(d['parameters'].values()) for d in drafts})
(P/'own-independent-comparison.json').write_text(json.dumps({'checks':checks,'counts':{'uniqueAssertions':len(checks),'passed':sum(c['pass_'] for c in checks),'failed':sum(not c['pass_'] for c in checks)},'rows':rows,'excluded':excluded,'raw421NotRerunOrSummed':True},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'counts':len(checks),'failed':[c for c in checks if not c['pass_']]}))

