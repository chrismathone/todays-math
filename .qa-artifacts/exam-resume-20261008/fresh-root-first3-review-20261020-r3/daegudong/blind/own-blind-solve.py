from pathlib import Path
from fractions import Fraction as F
from math import isqrt,prod
import hashlib,json
D=Path('.qa-artifacts/exam-resume-20261008/fresh-root-first3-review-20261020-r3/daegudong/blind')
B=Path('.qa-artifacts/exam-resume-20261008/fresh-root-first3-review-20261020-r2/daegubuk/blind')
read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
marks='①②③④⑤';solver='codex-helper-independent-fresh-roots-20261020'
exposure={'priorOriginalSourceExposure':True,'priorScope':'Previously reviewed these schools original first3 question components, whole first-page reference images with incidental handwritten markings, and related root-property problems in earlier independent scopes. This is not an unseen-original-corpus claim.','currentTransformedAuthorAnswerExposed':False,'currentTransformedAuthorSolutionExposed':False,'currentPrivateSpecMetadataRead':False,'allowedCurrentInputsOnly':True,'authorAnswerSearch':False,'calculationsFrom':'Current printed student conditions, not original handwritten marks, prior source answers, pixels, SVG coordinates or hidden model.'}
inputs={};students={}
for folder,nums in [(D,[1,2]),(B,[2])]:
 probe=folder/'own-blind-utf8-probe.txt';probe.write_text('학생 전용 독립 풀이 UTF-8 확인 √ ± ③ ④\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='학생 전용 독립 풀이 UTF-8 확인 √ ± ③ ④\n'
 manifest=read(folder/'blind-manifest.json');assert sha(folder/'student-problems.json')==manifest['studentProblemsSha256'];items=read(folder/'student-problems.json');assert [x['questionNumber'] for x in items]==nums
 files=[folder/'SOLVE-BRIEF.md',folder/'student-problems.json',folder/'blind-manifest.json']
 for fig in manifest['figures']:
  f=folder/fig['path'];assert sha(f)==fig['sha256'];files.append(f)
 for n in nums:files.append(folder.parent/'student-preview'/f'q{n:02}.png')
 inputs[str(folder)]={'filesBefore':[{'path':f.as_posix(),'sha256':sha(f)} for f in files],'manifestSha256':sha(folder/'blind-manifest.json'),'packageDigestAsProvided':manifest['packageDigest'],'utf8ProbeSha256':sha(probe),'pngsActuallyViewed':True,'svgReadForHashOnly':True}
 students[str(folder)]={x['questionNumber']:x for x in items}

def roots(n):
 r=isqrt(n);assert r*r==n
 return [0] if r==0 else [-r,r]
def frac(x):x=F(x);return {'numerator':str(x.numerator),'denominator':str(x.denominator)}
def factor(n):
 out={};p=2
 while p*p<=n:
  while n%p==0:out[p]=out.get(p,0)+1;n//=p
  p+=1
 if n>1:out[n]=out.get(n,0)+1
 return out
# DaeguDong q01: two successive root operations for A, not a negated inner root.
inner=isqrt(625);assert inner*inner==625
A=[x for x in roots(inner) if x<0];Bcoord=[x for x in roots((-8)**2) if x>0];assert A==[-5] and Bcoord==[8]
a,b=A[0],Bcoord[0];distance=b-a;assert a<0<b and distance>0 and distance==13
q1choices=[3,8,13,16,25];q1checks=[{'index':i+1,'mark':marks[i],'value':v,'equalsRequiredDistance':v==distance} for i,v in enumerate(q1choices)];assert sum(x['equalsRequiredDistance'] for x in q1checks)==1
q1={'innerPrincipalRoot':inner,'aCandidatesBeforeSign':roots(inner),'aNegativeUnique':a,'bSquaredRadicand':(-8)**2,'bCandidatesBeforeSign':roots(64),'bPositiveUnique':b,'leftToRight':['A','O','B'],'AO':-a,'OB':b,'AB':distance,'allChoices':q1checks,'nestedReadingCounterexample':{'wrongNegatedInnerRoot':-inner,'reason':'Negative square root OF the inner root is a different operation; -25 squared is625, not the inner root25.'},'domain':'625 and64 positive, both inner and outer real roots exist; sign selects one coordinate per point. Distance positive, dimensionless coordinate units; no cm claimed.','method2015M3':'Square-root definition/properties, prior signed arithmetic, number-line distance as AO+OB. No general radical-equation or high-school theorem.'}
# DaeguDong q02: integer factorization supplies global minimum, enumeration is a cross-check only.
factors=factor(45);needed=prod(p for p,e in factors.items() if e%2);assert factors=={3:2,5:1} and needed==5
n=needed;area=45*n;side=isqrt(area);assert side*side==area and side>0;perimeter=4*side;assert (n,area,side,perimeter)==(5,225,15,60)
checks=[]
for v in range(1,n+1):checks.append({'n':v,'areaCm2':45*v,'integerSide':isqrt(45*v)**2==45*v})
assert [x['n'] for x in checks if x['integerSide']]==[5]
q2choices=[15,30,45,60,225];q2check=[]
for i,pval in enumerate(q2choices):
 s=F(pval,4);nv=s*s/45;q2check.append({'index':i+1,'mark':marks[i],'perimeterCm':pval,'impliedSideCm':frac(s),'impliedN':frac(nv),'naturalPositiveSide':s.denominator==1 and s>0,'naturalPositiveN':nv.denominator==1 and nv>=1,'isRequiredMinimumCase':nv==n and s==side})
assert [x['index'] for x in q2check if x['isRequiredMinimumCase']]==[4]
q2={'factorizationOf45':{str(p):e for p,e in factors.items()},'necessaryMissingPrimeMultiplier':needed,'minimumProof':'45=3^2*5. For45n to be an integer square, the exponent of5 must be even, so5 divides n. Any positive natural such n is at least5. n5 attains square225. Thus global minimum5, not merely the smallest listed choice.','smallNaturalCrossCheck':checks,'minimumN':n,'areaCm2':area,'positiveSideCm':side,'negativeRootRejectedAsLength':-side,'perimeterCm':perimeter,'allChoices':q2check,'domain':'n is a natural integer at least1; positive area45n and unique positive side sqrt(45n). At the unique minimum n5, side15 and perimeter60 are unique. cm^2 area and cm perimeter are kept separate.','figure':'Printed square and its45n cm^2 area label only; no dimension obtained by measuring image or reading SVG geometry.','method2015M3':'M1 prime factorization and even prime exponents of an integer square, M3 square-root properties, elementary square area/perimeter. No high-school number theory.'}
# DaeguBuk q02: both square roots must first be retained, then the negative condition selects one.
xs=roots(5**2);negative=[x for x in xs if x<0];assert xs==[-5,5] and negative==[-5]
x=negative[0];assert isqrt(x*x)==5
root7Squared=7;output=root7Squared+x;assert output==2
bukChoices=[-12,-2,0,2,12];bukChecks=[]
for i,value in enumerate(bukChoices):
 xx=value-7;bukChecks.append({'index':i+1,'mark':marks[i],'output':value,'impliedX':xx,'xNegative':xx<0,'rootConditionHolds':xx*xx==25,'bothInputConditionsHold':xx<0 and xx*xx==25})
assert [z['index'] for z in bukChecks if z['bothInputConditionsHold']]==[4]
buk={'xCandidatesFromRootDefinition':xs,'negativeUniqueX':x,'sqrtXSquared':5,'sqrt7Squared':root7Squared,'output':output,'allChoices':bukChecks,'withoutNegativeConditionOutputs':[7+z for z in xs],'domain':'For every real x, x^2 is nonnegative so sqrt(x^2) is defined. The equation gives x^2=25; both signed roots are legitimate before x<0 selects-5. sqrt7 is real and positive. No denominators and no physical units.','existenceUniqueness':'x=-5 satisfies negativity and principal sqrt25=5; the only other square root+5 violates negativity. Consequently output2 exists and is unique.','method2015M3':'Definition and sign of square roots, (sqrt7)^2=7, prior signed arithmetic; no general high-school radical-equation squaring/extra-root method.'}
solutions={
 (str(D),1):('③','먼저 √625=25이다. A의 좌표는 이 25의 음의 제곱근이므로 -5이다. 한편 (-8)²=64이고, 64의 양의 제곱근은 8이므로 B의 좌표는 8이다. 따라서 A는 원점의 왼쪽, B는 오른쪽에 있어 AB=AO+OB=5+8=13이다. 두 좌표는 각각 지정된 부호의 제곱근으로 하나씩 정해지고, 두 점이 서로 달라 길이도 양수로 유일하다. 보기의 3, 8, 13, 16, 25 중 13만 이 길이와 같으므로 ③이다. 여기서 A의 좌표를 -√625=-25로 읽으면 안 된다.',q1),
 (str(D),2):('④','정사각형의 한 변이 자연수 cm이려면 넓이의 수 45n이 자연수의 제곱이어야 한다. 45=3²×5이므로 소인수 5의 개수를 짝수로 만들려면 n에는 적어도 5가 곱해져야 한다. 따라서 가능한 양의 자연수 n은 5 이상이고, n=5이면 45n=225=15²이 되어 실제로 조건을 만족한다. 그러므로 n의 최솟값은 5이다. 이때 한 변의 길이는 양수인 15 cm이고, 둘레는 4×15=60 cm이다. 넓이 225 cm²와 둘레의 단위를 구별해야 한다. 보기 15, 30, 45, 60, 225 cm 중 요구된 둘레는 60 cm 하나이므로 ④이다.',q2),
 (str(B),2):('④','√(x²)=5이므로 x²=25이다. 제곱해서 25가 되는 수는 -5와 5이며, x는 음수이므로 x=-5로 하나만 정해진다. 또한 (√7)²=7이므로 계산식의 출력값은 7+(-5)=2이다. x=-5를 입력하면 √((-5)²)=5가 되어 원래 조건도 만족한다. 보기 -12, -2, 0, 2, 12 중 2만 두 입력 조건과 계산식에 맞으므로 ④이다. 음수 조건을 빼면 x=5도 가능하여 출력값이 12가 되므로, 음수라는 조건을 반드시 사용해야 한다.',buk)}
for folder in [D,B]:
 own=[];(folder/'solve').mkdir(exist_ok=True)
 for number,student in students[str(folder)].items():
  ans,sol,calculation=solutions[str(folder),number]
  evidence={'twinExternalId':student['twinExternalId'],'exposureDeclaration':exposure,'ownExactCalculation':calculation,'inputs':inputs[str(folder)],'pngInspection':'Actual current PNG viewed. Stem, all5 choices and printed diagram/table labels match the student JSON. No pixels/coordinates used for numerical lengths or answers.','denominators':'No variable denominator; all own Fraction denominators used for checking choices are explicit positive integers.','gradeMethodStatus':'Student route uses2015 M3 root properties after its prior arithmetic/prime-factorization/elementary-measurement prerequisites. This raw math solve grants no formal grade/content/family/rights/native/release approval.'}
  raw={'studentDigest':student['studentDigest'],'solverId':solver,'answer':ans,'solution':sol,'evidence':evidence,'status':'solved'}
  assert isinstance(raw['answer'],str) and raw['answer'] in marks and len(raw['answer'])==1 and isinstance(raw['solution'],str) and raw['solution']
  f=folder/'solve'/f'q{number:02}.json'
  with f.open('x',encoding='utf-8') as out:json.dump(raw,out,ensure_ascii=False,indent=2);out.write('\n')
  own.append({'questionNumber':number,'twinExternalId':student['twinExternalId'],'studentDigest':student['studentDigest'],'rawPath':f.as_posix(),'rawSha256':sha(f),'calculation':calculation})
 after=[{'path':row['path'],'sha256':sha(Path(row['path']))} for row in inputs[str(folder)]['filesBefore']];assert after==inputs[str(folder)]['filesBefore']
 result={'kind':'independent-current-student-only-raw-check/v1','solverId':solver,'exposureDeclaration':exposure,'inputs':inputs[str(folder)],'inputsAfter':after,'inputBytesUnchanged':True,'raws':own,'noAuthorExposureBeforeRaw':True,'noApprovalCounts':True,'dbApiWrites':0,'newWorkers':0}
 with (folder/'own-blind-check-receipt.json').open('x',encoding='utf-8') as out:json.dump(result,out,ensure_ascii=False,indent=2);out.write('\n')
 print(json.dumps({'folder':str(folder),'raws':[{k:v for k,v in x.items() if k!='calculation'} for x in own]},ensure_ascii=False,indent=2))
