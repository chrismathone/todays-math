from pathlib import Path
from fractions import Fraction as F
import json,hashlib,re,math
P=Path(__file__).resolve().parent.parent;E=P/'own-raw-evidence-r1';B=P/'blind';read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();student=read(B/'student-problems.json');manifest=read(B/'blind-manifest.json');files=[B/'SOLVE-BRIEF.md',B/'student-problems.json',B/'blind-manifest.json'];before={str(p.relative_to(P)):sha(p) for p in files};checks=[]
def ck(name,passed,detail=None):checks.append({'name':name,'passed':bool(passed),'detail':detail})
ck('student-input-file-sha',before['blind/student-problems.json']==manifest['studentProblemsSha256']);ck('exact-current-question-numbers',[q['questionNumber'] for q in student]==[7,8]);ck('no-figure-assets',manifest['figures']==[] and all(q['figures']==[] for q in student))
# Fresh small exact one-variable polynomial reader. Arithmetic only, not an engine import.
def add(a,b):
 o=dict(a)
 for k,v in b.items():o[k]=o.get(k,F(0))+v
 return {k:v for k,v in o.items() if v}
def scale(a,c):return {k:v*c for k,v in a.items() if v*c}
def mul(a,b):
 o={}
 for i,x in a.items():
  for j,y in b.items():o[i+j]=o.get(i+j,F(0))+x*y
 return {k:v for k,v in o.items() if v}
class Poly:
 def __init__(self,text):
  self.s=''.join(text.split()).replace('$','');self.t=re.findall(r'[0-9]+|x|[()+*^-]',self.s);assert ''.join(self.t)==self.s;self.i=0
 def peek(self):return self.t[self.i] if self.i<len(self.t) else None
 def take(self):v=self.peek();self.i+=1;return v
 def expression(self):
  a=self.term()
  while self.peek() in ['+','-']:
   op=self.take();a=add(a,scale(self.term(),F(1 if op=='+' else -1)))
  return a
 def term(self):
  a=self.factor()
  while self.peek()=='*' or (self.peek() is not None and (self.peek()=='x' or self.peek()=='(' or self.peek().isdigit())):
   if self.peek()=='*':self.take()
   a=mul(a,self.factor())
  return a
 def factor(self):
  if self.peek() in ['+','-']:
   sign=self.take();return scale(self.factor(),F(1 if sign=='+' else -1))
  t=self.take()
  if t=='(':
   a=self.expression();assert self.take()==')'
  elif t=='x':a={1:F(1)}
  else:assert t is not None and t.isdigit();a={0:F(t)}
  if self.peek()=='^':
   self.take();power=int(self.take());assert 0<=power<=2;v={0:F(1)}
   for _ in range(power):v=mul(v,a)
   a=v
  return a
 def parse(self):a=self.expression();assert self.i==len(self.t);return a
q7,q8=student
records=[]
for line in q7['content'].splitlines():
 cells=[c.strip() for c in line.split('|')[1:-1]]
 if len(cells)!=3 or cells[0] not in ['A','B','C','D']:continue
 name,text,old=cells;hasEq='=' in text
 if hasEq:
  left,right=text.split('=');p=add(Poly(left).parse(),scale(Poly(right).parse(),F(-1)));degree=max(p) if p else 0;proper='이차방정식' if degree==2 else '일차방정식' if degree==1 else '상수식'
 else:p=Poly(text).parse();degree=max(p);proper='방정식이 아님'
 records.append({'record':name,'printedExpression':text,'equation':hasEq,'ascendingCoefficients':{str(k):str(p.get(k,0)) for k in range(degree+1)},'polynomialDegree':degree,'recordedClassification':old,'correctClassification':proper,'needsCorrection':old!=proper})
ck('q07-all-four-records-read',[r['record'] for r in records]==['A','B','C','D']);ck('q07-onlyB-wrong',[r['record'] for r in records if r['needsCorrection']]==['B']);expected=[{0:'-5',1:'-3',2:'1'},{0:'6',1:'2'},{0:'11',1:'-12',2:'1'},{0:'7',1:'-2',2:'5'}]
for r,exp in zip(records,expected):ck('q07-polynomial/'+r['record'],r['ascendingCoefficients']=={str(k):v for k,v in exp.items()})
options7=[]
for n,choice in enumerate(q7['choices'],1):
 name,proposed=[v.strip() for v in choice.split('→')];r=next(r for r in records if r['record']==name);ok=r['needsCorrection'] and proposed==r['correctClassification'];options7.append({'choice':n,'printed':choice,'recordActuallyWrong':r['needsCorrection'],'proposedClassificationCorrect':proposed==r['correctClassification'],'validRepair':ok})
ck('q07-unique-choice2',[r['choice'] for r in options7 if r['validRepair']]==[2]);ck('q07-B-root',2*F(-3)+6==0 and 2!=0);ck('q07-C-factorization',mul({0:F(-1),1:F(1)},{0:F(-11),1:F(1)})=={0:F(11),1:F(-12),2:F(1)})
# Optional real-root existence certificate for A; student classification never requires solving it.
rootACert=[]
for beta in [F(1,2),F(-1,2)]:
 alpha=F(3,2);constant=alpha*alpha+29*beta*beta-3*alpha-5;radical=2*alpha*beta-3*beta;ck('q07-A-real-root-certificate/'+str(beta),constant==radical==0 and 29>0);rootACert.append({'root':'(3+'+('1' if beta>0 else '-1')+'*sqrt(29))/2','constantResidual':str(constant),'sqrt29Residual':str(radical)})
ck('q07-D-not-an-equation','=' not in records[-1]['printedExpression'] and records[-1]['correctClassification']=='방정식이 아님')
# Complete square gives (x-3)^2=b+9. m=abs(x-3) is a nonnegative integer.
ck('q08-complete-square',mul({0:F(-3),1:F(1)},{0:F(-3),1:F(1)})=={0:F(9),1:F(-6),2:F(1)})
ck('q08-exact-integer-square-bounds',4*4<19<=5*5 and 10*10<=108<11*11)
candidates=[]
for m in range(5,11):
 b=m*m-9;roots=(3-m,3+m);ck('q08-candidate/'+str(m),10<=b<=99 and all(x*x-6*x-b==0 for x in roots) and roots[0]!=roots[1]);candidates.append({'m':m,'b':b,'rank':m-4,'integerRoots':list(roots),'rootSigns':['negative','positive']})
ck('q08-six-sorted-candidates',[r['b'] for r in candidates]==[16,27,40,55,72,91]);ck('q08-strict-ranking-monotonic',all(candidates[i]['b']<candidates[i+1]['b'] for i in range(5)));ck('q08-fourth55',candidates[3]['b']==55);ck('q08-outside-neighbor-m',4*4-9==7<10 and 11*11-9==112>99)
# Independent bounded integer enumeration validates all90 b; integer-root bounds follow from19<=m²<=108.
full=[]
for b in range(10,100):
 roots=[x for x in range(-8,15) if x*x-6*x-b==0];m=math.isqrt(b+9);square=m*m==b+9;ck('q08-every-two-digit-b/'+str(b),(len(roots)==2)==square and (not square or roots==[3-m,3+m]));
 if roots:full.append(b)
ck('q08-full-enumeration-same',[r['b'] for r in candidates]==full)
options8=[]
for n,s in enumerate(q8['choices'],1):
 b=int(s.strip('$'));m=math.isqrt(b+9);square=m*m==b+9;rank=next((r['rank'] for r in candidates if r['b']==b),None);options8.append({'choice':n,'b':b,'bPlus9':b+9,'perfectSquare':square,'integerSquareBounds':[m*m,(m+1)*(m+1)],'rankAmongAllowed':rank,'isFourth':rank==4})
ck('q08-unique-choice3',[r['choice'] for r in options8 if r['isFourth']]==[3])
exposure={'sameRetainedSession':True,'currentAuthorAnswersSolutionsExposed':False,'currentAuthoringCodeMetadataPrivateSourceContextRead':False,'history':'이전다른학교원문9성분/변형문항들과Gachang·Gangbuk·공개엔진/정책코드검토이력이있다. Gachang원문첫페이지1~6은이전raw봉인후보았고다른문항·손글씨의부수노출을명시했다. 이번Gachang원문q07/q08이나현재새q07/q08저자답·해설·writer·private는열지않았다. 전체코퍼스/개념을처음보는pristineblind주장없음.','inputsRead':[str(p.relative_to(P)) for p in files],'visual':'NoPNG/figure supplied. Actualstudenttext andnativeMarkdownrecordtable only; noimageinspection/fullnative/print/layoutclaim.','operations':'OnlyownPython exactinteger/Fraction arithmetic, no Node/browser/catalog/heavytests/CIM/N/API/model/DB/install/newsession/worktree/workers, no rootproductioncode read/edit.'}
(E/'own-exposure.json').write_text(json.dumps(exposure,ensure_ascii=False,indent=2),encoding='utf-8')
sol7='A는 전개하여 이항하면 x²-3x-5=0이므로 이차방정식이다. B는 x²+4x=x²+2x-6에서 양변의 x²항이 없어져 2x+6=0이 되므로 일차방정식이다. 일차항의 계수 2는 0이 아니며 해는 x=-3으로 유일하다. C는 3x²-12x+12=2x²+1을 정리하면 x²-12x+11=0이므로 이차방정식이다. D는 이차식이지만 등호로 나타낸 등식이 아니므로 방정식이 아니다. 따라서 고쳐야 하는 기록은 B 하나이고 바른 판정은 일차방정식이므로 ②이다. ①은 올바른 A를 잘못 고치고, ③도 이차항이 남는 C를 잘못 고친다. ④와 ⑤는 등호가 없는 D를 방정식으로 바꾸어 판정하므로 모두 옳지 않다.'
sol8='x²-6x-b=0을 정리하면 (x-3)²=b+9이다. 두 근이 정수가 되려면 b+9가 정수의 제곱이어야 한다. 반대로 b+9=m²인 양의 정수 m이 있으면 두 근은 3-m, 3+m으로 모두 정수이다. b는 두 자리 자연수이므로 10≤b≤99, 따라서 19≤m²≤108이다. 4²=16<19이고 10²=100≤108<11²=121이므로 가능한 양의 정수 m은 5, 6, 7, 8, 9, 10이다. 이 순서대로 b=m²-9를 구하면 16, 27, 40, 55, 72, 91이고 네 번째는 55이므로 ③이다. 이때 근은 -5와 11이며 원래 방정식에 각각 대입하면 0이 된다. m이 커질수록 제곱이 커져 b의 순서도 엄격히 증가하므로 네 번째 값은 유일하다. 보기 40은 세 번째, 72는 다섯 번째이고, 48과 64는 각각 b+9=57, 73이 완전제곱수가 아니므로 조건에 맞지 않는다. m의 음수값은 같은 b와 같은 두 근을 주므로 중복하여 세지 않으며, 근이 자연수여야 한다는 조건은 없으므로 음의 정수 근도 허용한다.'
for q,ans,sol,extra in [(q7,'②',sol7,{'records':records,'allFiveOptions':options7,'ARealRootOptionalCertificate':rootACert,'CIntegerRoots':[1,11],'DNoEquation':'Do not silently append=0; equation roots/existence doesnotapply toD.'}),(q8,'③',sol8,{'fullAllowedOrderedBValues':candidates,'allFiveOptions':options8,'everyTwoDigitBChecked':90,'completenessProof':'19<=m²<=108, mnonnegativeinteger;5<=m<=10. Bothintegerroots3±m, allm>=5distinct, nofloating/discriminant/Vieta/factor-theorem.'})]:
 n=q['questionNumber'];raw={'studentDigest':q['studentDigest'],'solverId':'independent-helper-gachang-group4-q07-q08-studentonly-20261020-r1','answer':ans,'solution':sol,'evidence':{**extra,'exposure':exposure,'calculationReceipt':'../../own-raw-evidence-r1/own-calculation-receipt.json','studentMethod':'2015M3 다항식전개·동류항소거·방정식차수정의/완전제곱식으로이차방정식풀이·정수제곱경계와앞학년정수순서. 판별식/근과계수관계/고등인수정리/함수미분/연속성정리불필요. 코드다항식배열/isqrt열거는검산도구이지학생필수방법아님.','domainUnits':'x와b는길이/면적이아닌무단위수. q07등호없는D를방정식으로간주하지않음. q08 b는10..99자연수이며두근은모든정수(음수포함),두근서로다름. 변수분모/0나눗셈없음.','gradeApproval':False,'nativeVisualApproval':False},'status':'solved'};(B/f'solve/q{n:02}.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
after={str(p.relative_to(P)):sha(p) for p in files};ck('inputs-unchanged',before==after);assert all(c['passed'] for c in checks)
receipt={'counts':{'assertions':len(checks),'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks)},'checks':checks,'q07Records':records,'q07Options':options7,'q08OrderedCandidates':candidates,'q08Options':options8,'before':before,'after':after,'rawSHA256':{f'q{q["questionNumber"]:02}':sha(B/f'solve/q{q["questionNumber"]:02}.json') for q in student},'newGradeContentReleaseApproval':False}
(E/'own-calculation-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'counts':receipt['counts'],'rawSHA256':receipt['rawSHA256']}))
