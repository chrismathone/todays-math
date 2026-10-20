from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess,re
P=Path('.qa-artifacts/exam-resume-20261008/inverse-radical-ratio-code-audit-20261020-r1');ROOT=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();scope=read(P/'provided-scope.json')
rows=[]
for x in scope['files']:
 row={'path':x['path'],'expected':x['sha256'],'root':h(ROOT/x['path']),'snapshot':h(P/x['snapshot']),'runtime':h(P/x['runtime'])};assert all(row[k]==row['expected'] for k in ['root','snapshot','runtime']);rows.append(row)
actual=[]
for x in scope['actualPrintedExampleAndSealedRawAlreadySupplied']:assert h(Path(x['path']))==x['sha256'];actual.append({'path':x['path'],'sha256':h(Path(x['path']))})
report=Path('.qa-artifacts/exam-resume-20261008/fresh-root-next2-review-20261020-r1/daegudong/verification/reports/q03.json');assert report.read_bytes()==subprocess.check_output(['git','show','d3d60410118f23f029a34d1f2135a0fe59a51927:'+report.as_posix()]);actual.append({'path':report.as_posix(),'sha256':h(report),'commit':'d3d60410118f23f029a34d1f2135a0fe59a51927'})
probe=P/'own-utf8-probe.txt';probe.write_text('U57 독립 유리수 검산 √ 양의 가지 확인\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='U57 독립 유리수 검산 √ 양의 가지 확인\n'
(P/'own-before.json').write_text(json.dumps({'scopeSha256':h(P/'provided-scope.json'),'files':rows,'actualInputsAndOwnReview':actual,'probeSha256':h(probe)},indent=2)+'\n',encoding='utf-8')
def out(x):return {'numerator':str(x.numerator),'denominator':str(x.denominator)}
def decimal(x):
 sign='-' if x<0 else '';x=abs(x);whole,r=divmod(x.numerator,x.denominator);tail=''
 while r:
  r*=10;digit,r=divmod(r,x.denominator);tail+=str(digit);assert len(tail)<=6
 return sign+str(whole)+('.'+tail if tail else '')
# Strategy: fix known positive b; change its(c,s)factorization and m independently.
# This tests two model symmetries and uses witnesses outside the parent small numerator/denominator grid.
factorizations={36:[(1,36),(2,18),(3,12),(4,9),(6,6),(9,4),(12,3),(18,2),(36,1)],125:[(1,125),(5,25),(25,5),(125,1)],231:[(1,231),(3,77),(7,33),(11,21),(21,11),(33,7),(77,3),(231,1)],1000000000:[(1000,1000000)]}
aValues=[F(1,8),F(17,20),F(31,125),F(13,32),F(19,625),F(7,1000000)];cases=[]
def case(a,b,m,c,s,kind):
 k=a*a;R=a*b;text=decimal(R);assert len(text.split('.')[0])<=9;assert m*k==a*a*m and b*b==c*c*s*s and a*b==R and a>0 and b>0 and k>0
 cases.append({'kind':kind,'input':{'domain':'a,b,k-positive','rootCoefficient':m,'reciprocalRadicand':s,'reciprocalScale':c,'ratioProduct':text},'witness':{'a':out(a),'b':out(F(b)),'k':out(k)},'radicand':out(m*k),'positiveSquaredCertificates':{'firstLeftSquared':out(m*k),'firstRightSquared':out(a*a*m),'secondLeftSquared':out(F(s)),'secondRightSquared':out(F(b*b,c*c*s))},'product':out(R)})
for b,pairs in factorizations.items():
 for c,s in pairs:
  assert c*s==b
  for a in aValues:
   for m in [1,2,97,1000000]:case(a,b,m,c,s,'fixed-b-factorization-and-root-coefficient-metamorphism')
case(F(1,10**15),10**9,10**6,1000,10**6,'minimum-product-maximum-coefficients')
case(F(999999999999999,10**15),10**9,10**6,1000,10**6,'maximum-decimal-product-maximum-coefficients')
# Derive the real replay input from current printed equations, not author parameters/answer.
candidate=read(Path(scope['actualPrintedExampleAndSealedRawAlreadySupplied'][0]['path']));text=candidate['content'];m=re.search(r'\\sqrt\{(\d+)k\}=a\\sqrt(\d+)',text);s=re.search(r'\\sqrt(\d+)=\\dfrac\{b\}\{(\d+)\\sqrt(\d+)\}',text);R=re.search(r'\bab=(\d+(?:\.\d+)?)',text);assert m and s and R and m[1]==m[2] and s[1]==s[3] and '양수 $a$, $b$, $k$' in text
printed={'domain':'a,b,k-positive','rootCoefficient':int(m[1]),'reciprocalRadicand':int(s[1]),'reciprocalScale':int(s[2]),'ratioProduct':R[1]};assert printed=={'domain':'a,b,k-positive','rootCoefficient':3,'reciprocalRadicand':5,'reciprocalScale':2,'ratioProduct':'8'}
(P/'own-rational-oracle.json').write_text(json.dumps({'method':'Known positive a,b,k=a^2 witnesses, reverse-constructed R=a*b using Python Fraction/long division. Fixed-b factorization and positive-m invariance, not parent1296 enumeration or production formulas as answer oracle. No floating roots. Positive branches certify both squared relations.','cases':cases,'printedCurrentInput':printed,'printedInputSHA256':actual[0]['sha256']},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'witnessCases':len(cases),'sources':len(rows),'actualInputsAndReview':len(actual),'printedModel':printed},indent=2))
