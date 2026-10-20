from pathlib import Path
from fractions import Fraction as F
import json, hashlib, subprocess
p=Path('.qa-artifacts/exam-resume-20261008/inverse-dispersion-numbered-code-audit-20261020-r1')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scope=json.loads((p/'provided-scope.json').read_text(encoding='utf-8-sig'))
root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
rows=[]
for x in scope['files']:
 row={'path':x['path'],'expected':x['sha256'],'root':sha(root/x['path']),'snapshot':sha(p/x['snapshot']),'runtime':sha(p/x['runtime'])}
 assert all(row[k]==x['sha256'] for k in ['root','snapshot','runtime']),row
 rows.append(row)
g=Path(scope['actualCurrentQ20ReviewRoot'])
art=[]
for n in [18,19,20]:
 for kind,commit in [('blind/solve',scope['actualQ20RawParentCommit']),('verification/reports',scope['currentQ20ReportCommit'])]:
  f=g/kind/f'q{n}.json'; data=f.read_bytes()
  # Parent raw commit may not exist locally. Sealed expected hashes checked separately below.
  art.append({'path':f.as_posix(),'sha256':sha(f)})
(p/'own-source-before.json').write_text(json.dumps({'scopeSha256':sha(p/'provided-scope.json'),'files':rows,'artifacts':art},indent=2)+'\n',encoding='utf-8')
probe=p/'own-utf8-probe.txt';probe.write_text('독립 코드 감사 UTF-8 쓰기 읽기 확인 √2 − ④\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='독립 코드 감사 UTF-8 쓰기 읽기 확인 √2 − ④\n'
cases=[]
def frac(x):return {'numerator':str(x.numerator),'denominator':str(x.denominator)}
def dec(x):
 # Exact terminating rational -> decimal via long division, no floating point.
 sign='-' if x<0 else '';x=abs(x);a,r=divmod(x.numerator,x.denominator);s=str(a)
 if r:
  s+='.'
  while r:r*=10;d,r=divmod(r,x.denominator);s+=str(d)
 return sign+s
for known in [[F(-3,2),F(5,2)],[F(-6),F(10)]]:
 for ia in range(-8,9):
  for ib in range(-8,9):
   a,b=F(ia,2),F(ib,2);xs=known+[a,b];mean=sum(xs)/4;var=sum((v-mean)**2 for v in xs)/4
   for order in ['unconstrained','strictly-increasing','strictly-decreasing']:
    # Independent bounded enumeration of labeled half-integer pairs, moment equations only.
    solutions=[]
    for u2 in range(-8,9):
     u=F(u2,2);v=4*mean-sum(known)-u
     if v*2!=int(v*2) or not F(-4)<=v<=F(4):continue
     if order=='strictly-increasing' and u>=v:continue
     if order=='strictly-decreasing' and u<=v:continue
     vals=known+[u,v]
     if sum((z-mean)**2 for z in vals)==4*var:solutions.append({'first':frac(u),'second':frac(v)})
    cases.append({'input':{'knownValues':[dec(v) for v in known],'mean':dec(mean),'variance':dec(var),'order':order},'solutions':solutions,'status':'no-solution' if not solutions else 'unique' if len(solutions)==1 else 'multiple'})
(p/'own-exact-oracle.json').write_text(json.dumps({'method':'Python Fraction, exact decimal long division; enumerate first labeled half-integer, derive second from sum, recompute all centered squares; no discriminant/root helper','cases':cases},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceFiles':len(rows),'probeSha256':sha(probe),'oracleCases':len(cases),'artifacts':art},indent=2))
