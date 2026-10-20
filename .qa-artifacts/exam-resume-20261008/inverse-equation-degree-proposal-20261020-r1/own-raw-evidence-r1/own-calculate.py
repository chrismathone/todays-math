from pathlib import Path
from fractions import Fraction as F
import json,hashlib,collections
E=Path(__file__).resolve().parent;P=E.parent;INPUT=P/'student-only26.json';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();EXPECTED='accea8faf5de0f21cee0210fba4c16c1325e6ce22c40aabafd64538fc61ba298';before=sha(INPUT);assert before==EXPECTED;packet=json.loads(INPUT.read_text(encoding='utf-8-sig'));probe=E/'own-utf8-probe.txt';v='방정식 차수 역입력 26개 독립 계산 UTF8 확인';probe.write_text(v,encoding='utf-8');assert probe.read_text(encoding='utf-8')==v
checks=[]
def ck(id,ok):checks.append({'id':id,'passed':bool(ok)});assert ok,id
# Own exact polynomial reader. Exponent pair (a power, x power); no eval/sympy or producer data.
def add(p,q,scale=F(1)):
 out=dict(p)
 for k,v in q.items():out[k]=out.get(k,F(0))+scale*v
 return{k:v for k,v in out.items()if v!=0}
def mul(p,q):
 out={}
 for(i,j),v in p.items():
  for(k,l),w in q.items():out[(i+k,j+l)]=out.get((i+k,j+l),F(0))+v*w
 return{k:v for k,v in out.items()if v!=0}
class Reader:
 def __init__(self,text):
  self.tokens=[];i=0
  while i<len(text):
   c=text[i]
   if c.isspace():i+=1;continue
   if c.isascii()and c.isdigit():
    j=i+1
    while j<len(text)and text[j].isascii()and text[j].isdigit():j+=1
    self.tokens.append(text[i:j]);i=j;continue
   if c not in 'ax()+-*^':raise ValueError('Unexpected printed algebra token')
   self.tokens.append(c);i+=1
  self.i=0
 def peek(self):return self.tokens[self.i]if self.i<len(self.tokens)else None
 def take(self):t=self.peek();self.i+=1;return t
 def atom(self):
  t=self.take()
  if t=='-':return{k:-v for k,v in self.atom().items()}
  if t=='+':return self.atom()
  if t=='(':
   p=self.sum();assert self.take()==')';return p
  if t=='a':return{(1,0):F(1)}
  if t=='x':return{(0,1):F(1)}
  if t and t.isascii()and t.isdigit():return{(0,0):F(int(t))}
  raise ValueError('Missing algebra atom')
 def power(self):
  p=self.atom()
  if self.peek()=='^':
   self.take();n=int(self.take());assert 0<=n<=8;q={(0,0):F(1)}
   for _ in range(n):q=mul(q,p)
   p=q
  return p
 def product(self):
  p=self.power()
  while self.peek()not in [None,'+', '-',')']:
   if self.peek()=='*':self.take()
   p=mul(p,self.power())
  return p
 def sum(self):
  p=self.product()
  while self.peek()in ['+','-']:
   sign=self.take();p=add(p,self.product(),F(1)if sign=='+'else F(-1))
  return p
 def read(self):
  p=self.sum();assert self.peek()is None;return p
def evaluate(poly,a,x):return sum((c*a**i*x**j for(i,j),c in poly.items()),F(0))
def enc(poly):return{f'a^{i} x^{j}':str(c)for(i,j),c in sorted(poly.items())}
def linear(exprSlope,constant):
 if not exprSlope:return str(constant)
 out='a'if exprSlope==1 else str(exprSlope)+'a'
 return out+('+'+str(constant)if constant>0 else str(constant)if constant<0 else'')
def xterm(value):return('x'if value==1 else'-x'if value==-1 else str(value)+'x')
exposure={'solverId':'independent-helper-U62-printed26-raw-20261020-r1','priorHistory':'Gangbuk 차수 문항의 학생/raw/저자/원문검토와 관련 공개코드/메타데이터 이력이 있다. 기존 원문9, Gachang/Gangbuk페이지의 부수 다른문항·손글씨 노출도 있었다. 개념이나 전체source corpus가 미노출이라는 주장은 하지 않는다.','current26PrintedTasksFirstReadInThisScope':True,'currentProducerImplementationPrivateAnswersSolutionsExposed':False,'onlyCurrentInputRead':'student-only26.json exact provided SHA only; no root/new inverseEquationDegree.ts/generator/private/source/N/other implementation reads.','visualReviewPerformed':False,'context':'Internal finite prototype student-only raw audit, not26manualtwins/new manual approvals or whole-template grade approval.'}
questions=packet['questions'];ck('26 task count',len(questions)==26);ck('26 distinct n',sorted(q['n']for q in questions)==list(range(1,27)));ck('26 distinct statements',len({q['content']for q in questions})==26);ck('26 distinct supplied digests',len({q['studentDigest']for q in questions})==26);ck('packet no author answers supplied',packet['answersOrSolutionsIncluded']is False);solutions=[]
for q in questions:
 n=q['n'];digest=q['studentDigest'];ck(f'n{n}/digest shape',len(digest)==64 and all(c in '0123456789abcdef'for c in digest));content=q['content'];ck(f'n{n}/target parameter', '상수 $a$'in content and '일차방정식'in content);equation=content.rsplit('$',2)[1];left,right=equation.split('=');lhs=Reader(left).read();rhs=Reader(right).read();residual=add(lhs,rhs,F(-1));ck(f'n{n}/at most quadratic',max(j for i,j in residual)<=2);quad={i:c for(i,j),c in residual.items()if j==2};ck(f'n{n}/quadratic coefficient affine',set(quad)<=set([0,1])and quad.get(1,F(0))!=0);a=-quad.get(0,F(0))/quad[1];after={j:sum((c*a**i for(i,j2),c in residual.items()if j2==j),F(0))for j in range(3)};ck(f'n{n}/quadratic cancellation',after[2]==0);L=after[1];C=after[0];ck(f'n{n}/remaining linear coefficient nonzero',L!=0);x=-C/L;ck(f'n{n}/own parsed original root substitution',evaluate(lhs,a,x)==evaluate(rhs,a,x));ck(f'n{n}/linear equation exact root',L*x+C==0)
 # Independent second reading of the displayed factor/coefficient spelling; witness checked by direct factor arithmetic.
 b=F(left.split('(ax-',1)[1].split(')',1)[0]);h=F(left.split('(x+',1)[1].split(')',1)[0]);d=F(right.split('ax+',1)[1].split('x^2',1)[0]);tail=right.split('x^2',1)[1];sx,f=tail.rsplit('+',1);rawE=sx[:-1];e=F(1)if rawE=='+'else F(-1)if rawE=='-'else F(rawE);f=F(f);expected={(1,2):F(1),(0,2):-d,(1,1):h-1,(0,1):-b-e,(0,0):-b*h-f};expected={k:v for k,v in expected.items()if v};ck(f'n{n}/independent printed coefficient subtraction',residual==expected);ck(f'n{n}/direct factor root witness',(a*x-b)*(x+h)==a*x+d*x*x+e*x+f);ck(f'n{n}/second reading agrees target and nonzero coefficient',a==d and L==(h-1)*d-b-e and L!=0)
 for other in [a-1,a+1,F(0)]:
  if other!=a:ck(f'n{n}/alternative a {other} keeps quadratic',sum(c*other**i for i,c in quad.items())!=0)
 ck(f'n{n}/constant nonzero',C!=0);ck(f'n{n}/answer integer',a.denominator==1)
 linExpr=linear(h-1,-b-e);resText=f'(a-{d})x²'+('+'+xterm(F(linExpr))if 'a'not in linExpr and F(linExpr)>0 else xterm(F(linExpr))if 'a'not in linExpr else '+('+linExpr+')x')+(('+'if C>0 else'')+str(C));linearText=xterm(L)+(('+'if C>0 else'')+str(C));solution=f'왼쪽을 분배법칙으로 전개한 뒤 오른쪽의 항을 이항하여 동류항을 정리하면 {resText}=0이다. 일차방정식이 되려면 x²의 계수가 0이어야 하므로 a-{d}=0에서 a={a}이다. 이 값을 대입하면 {linearText}=0이고 남은 x의 계수는 {L}로 0이 아니므로 실제 일차방정식이다. 해는 x={x}이며 이 값을 원래 등식에 대입하면 양변이 모두 {evaluate(lhs,a,x)}로 같아 해의 존재도 확인된다. a가 {a}와 다르면 x²의 계수가 0이 아니어서 일차방정식이 될 수 없으므로 요청한 상수 a의 값은 {a}로 유일하다. 이때 x의 해도 일차항 계수가 0이 아니므로 유일하다.'
 evidence={'printedEquationSHA256':hashlib.sha256(equation.encode()).hexdigest(),'exactLeftPolynomial':enc(lhs),'exactRightPolynomial':enc(rhs),'exactLeftMinusRightPolynomial':enc(residual),'quadraticCoefficientInA':{str(i):str(c)for i,c in quad.items()},'uniqueTargetA':str(a),'remainingLinearCoefficient':str(L),'remainingConstant':str(C),'rootX':str(x),'originalLHSAtWitness':str(evaluate(lhs,a,x)),'originalRHSAtWitness':str(evaluate(rhs,a,x)),'independentPrintedFactorReading':{'leftSubtractConstant':str(b),'leftXAddend':str(h),'rightX2Coefficient':str(d),'rightExtraXCoefficient':str(e),'rightConstant':str(f)},'domain':'a는x에대한실수상수. 특정x에서수치가같다는조건이아니라 전개·이항 후식의차수조건이다. x²계수를0으로만드는a가유일하고 남은일차항이비영인지별도확인. x/a양수조건을추가하지않으며변수로임의나누지않음.','studentMethod':'2015M3까지의 다항식곱셈/분배법칙·동류항정리·차수정의와 앞학년일차방정식. 근의공식/판별식/근합곱/고등매개변수공식불필요. 코드다항식배열은자체검산도구이지학생필수방법아님.','metadataHold':'courseAsProposed와questionType의?표시를수정/인증하지않음. 현행26수학풀이가template/grade/family/rights/native/release승인을뜻하지않음.','visualReviewPerformed':False,'currentProducerAnswerExposure':False}
 solutions.append({'n':n,'studentDigest':digest,'solverId':exposure['solverId'],'answer':str(a),'solution':solution,'evidence':evidence,'status':'solved'})
result={'kind':'independent-pre-producer-exposure-raw-solutions','inputSHA256':before,'solverId':exposure['solverId'],'exposureDeclaration':'own-raw-evidence-r1/own-exposure.json','solutions':solutions,'counts':{'printedTasks':26,'solved':len(solutions),'pending':0,'newManualTwins':0,'wholeTemplateGradeApprovals':0},'curriculumApproved':False,'studentMethodTemplateApproved':False,'rightsApproved':False,'nativeApproved':False,'loadable':False};(P/'own-raw-solutions-r1.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(E/'own-exposure.json').write_text(json.dumps(exposure,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');limits={'rawMathScope':'All26printed equations solved independently; no producer implementation, parameters, answers or private solutions read. No visual/figure input.','metadataObserved':{'courseAsProposed':packet.get('courseAsProposed'),'courseCodepoints':[ord(c)for c in packet.get('courseAsProposed','')],'questionTypeCounts':dict(collections.Counter(q['questionType']for q in questions))},'metadataVerdict':'Literal ?3/??? markers retained as classification/format metadata hold; no guessed repair. Printed Korean target and all26equations are readable and mathematically determinate. SuppliedstudentDigest carried exactly; perquestion digest producer canonicalization not inferred.','gradeMethodScope':'Whole student route expands, collects terms, sets x²coefficient0 then checks remainingxcoefficientnonzero; elementarylinearequation/root substitution. No advanced formula. Actual7surface/templateprimary-grade audit deferred.','permissionsNotTested':'No actual release/registry/factory/coverage/catalog/HTTP/DBroute audited or approved; packetflagsfalse and ownapprovalflagsfalse do not substitute runtime tests.','memoryLimit':'Small standard-library integer/Fraction operations only; no heavy tests/browser/catalog/rendering.','newCounts':'Not26newmanualtwins, no whole-templategrade/source/rights/native/loadapproval.'};(E/'own-grade-and-metadata-limits.json').write_text(json.dumps(limits,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');after=sha(INPUT);assert after==before;receipt={'inputPath':'student-only26.json','inputSHA256Before':before,'inputSHA256After':after,'providedExpectedSHA256':EXPECTED,'rawSHA256':sha(P/'own-raw-solutions-r1.json'),'scriptSHA256':sha(Path(__file__)),'utf8ProbeSHA256':sha(probe),'passedAssertions':len(checks),'failedAssertions':0,'checks':checks,'answerCounts':dict(collections.Counter(s['answer']for s in solutions)),'remainingLinearCoefficientCounts':dict(collections.Counter(s['evidence']['remainingLinearCoefficient']for s in solutions)),'all26RootWitnesses':[{'n':s['n'],'studentDigest':s['studentDigest'],'answer':s['answer'],'linearCoefficient':s['evidence']['remainingLinearCoefficient'],'constant':s['evidence']['remainingConstant'],'rootX':s['evidence']['rootX'],'originalEqualValue':s['evidence']['originalLHSAtWitness']}for s in solutions],'algorithm':'Own bounded printed-expression lexer/parser with exact bivariate integer/Fraction convolution; separate direct printed factor/coefficient extraction and numerical rational witness. No producer algorithm oracle or float/pixel measurement.','producerPrivateExposure':False,'visualReview':False};(E/'own-calculation-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'solved':len(solutions),'pending':0,'assertionsPassed':len(checks),'rawSHA256':receipt['rawSHA256'],'answerCounts':receipt['answerCounts'],'linearCoefficientCounts':receipt['remainingLinearCoefficientCounts']},indent=2))
