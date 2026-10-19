from pathlib import Path
from fractions import Fraction as F
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group11-review-20261020-r1/blind')
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def put(n,v):
 q=p/n;q.parent.mkdir(exist_ok=True)
 with q.open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
names=['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json'];before={n:sha(p/n) for n in names};students=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'));manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert len(students)==1;s=students[0];assert s['questionNumber']==19 and s['studentDigest']=='a487017dbf90fdb24412937f4d8aef375bdf96874252a41b590e4e982769dfe4';assert before['student-problems.json']==manifest['studentProblemsSha256']
probeText='q19 \ud55c\uae00 UTF-8 \u2713\n';probe=p/'own-q19-blind-utf8-probe.txt'
with probe.open('x',encoding='utf-8',newline='\n') as f:f.write(probeText)
assert probe.read_text(encoding='utf-8')==probeText;assert probe.read_bytes()==probeText.encode('utf-8')
# Exact quadratic-field arithmetic, pair(p,q) means p+q*sqrt(2).
def pair(p,q=0):return (F(p),F(q))
def add(z,w):return(z[0]+w[0],z[1]+w[1])
def neg(z):return(-z[0],-z[1])
def mul(z,w):return(z[0]*w[0]+2*z[1]*w[1],z[0]*w[1]+z[1]*w[0])
def inv(z):
 norm=z[0]**2-2*z[1]**2;assert norm!=0
 return(z[0]/norm,-z[1]/norm)
def div(z,w):return mul(z,inv(w))
def show(z):return {'rationalPart':str(z[0]),'sqrt2Coefficient':str(z[1])}
assert 4**2<3**2*2<5**2
a=pair(4);number=pair(0,3);b=add(number,neg(a));assert b==pair(-4,3)
conjugate=pair(4,3);den=mul(b,conjugate);assert den==pair(2)
quotient=div(a,b);assert quotient==pair(8,6);assert mul(quotient,b)==a
square=mul(add(b,pair(3)),add(b,pair(3)));assert square==pair(19,-6)
givenQ=pair(-8,6);difference=add(quotient,neg(givenQ));assert difference==pair(16)
truth=[a==pair(4) and b==pair(-4,3),quotient==givenQ,square==pair(19,-6)];assert truth==[True,False,True]
total=add(quotient,square);assert total==pair(27)
calc={'representation':'[p,q] 또는 객체는 정확한 유리수 p+q√2를 뜻함. float/pixel/저자 params를 쓰지 않았다.','bounds':{'squaredLower':16,'squaredValue':18,'squaredUpper':25,'conclusion':'모두 양수이므로 4<3√2<5. 정수부분a=4,소수부분b=3√2-4는0<b<1.'},'a':show(a),'b':show(b),'rationalization':{'positiveConjugate':'3√2+4>0','denominatorProduct':show(den),'numerator':'4(3√2+4)','correctQuotient':show(quotient),'quotientTimesOriginalDenominator':show(mul(quotient,b))},'records':[{'record':'ㄱ','correct':truth[0],'reason':'4<3√2<5이므로 정수부분4와 소수부분3√2-4가 맞음.'},{'record':'ㄴ','correct':truth[1],'printedValue':show(givenQ),'correctedValue':show(quotient),'correctMinusPrinted':show(difference),'reason':'분모에 켤레를 곱하면 분모2,분자12√2+16이므로6√2+8. 기록과 차16≠0.'},{'record':'ㄷ','correct':truth[2],'independentlySquaredValue':show(square),'reason':'서로 따로 계산한 기록이므로 올바른b를 사용: b+3=3√2-1,제곱=18-6√2+1=19-6√2.'}],'total':show(total),'domainNonzeroSigns':{'originalNumberPositive':True,'fractionalPartStrictlyBetween0And1':True,'originalDenominatorBNonzero':True,'conjugatePositiveNonzero':True,'rationalizedDenominator':2,'bPlus3Positive':True,'radicand':2,'allExpressionsReal':True},'existenceUniqueness':'정수부분과0≤소수부분<1의 분해는4<3√2<5에 의해a4,b3√2-4로 유일하게 결정된다. b>0으로나눗셈이정의되고,정확계산결과ㄱ/ㄷ만참·ㄴ만거짓이므로잘못된기록도유일. 고친값및합27도유일.','units':'추상적인 수의 계산이므로 별도 물리 단위 없음.','choicesAndFigures':{'questionType':s['questionType'],'choices':s['choices'],'figures':s['figures'],'note':'서술형의 세 기록을 모두 검토했다. 객관식5보기는 없으며 임의로 만들지 않음. figure없음; optionalpreview는열람하지않았고인쇄JSON조건으로계산했다.'},'studentMethod':'양수의 제곱 대소 비교로 정수부분/소수부분 결정, 켤레를 곱하는 분모 유리화, 제곱공식, 동류 근호항 정리만 사용. 2015중3 학습 후의 학생 방법이며 고등 정리/함수·극값/미적분 불필요. 정식 학년 승인은 이 blind 풀이의 집계에 포함하지 않음.'}
put('own-q19-blind-calculations.json',calc)
solution='먼저 4²=16<18=(3√2)²<25=5²이고 각 수가 양수이므로 4<3√2<5이다. 따라서 정수부분은 a=4, 소수부분은 b=3√2-4이며 0<b<1이다. 그러므로 ㄱ은 맞고, 분모 b는 0이 아니다.\n\nㄴ을 계산할 때 분모와 분자에 3√2+4를 곱하면\na/b=4/(3√2-4)=4(3√2+4)/{(3√2-4)(3√2+4)}\n=4(3√2+4)/(18-16)=(12√2+16)/2=6√2+8이다. 곱한 3√2+4와 새 분모 2도 0이 아니다. 따라서 ㄴ의 6√2-8은 잘못되었으며 6√2+8로 고쳐야 한다. 두 식은 상수항이 16만큼 달라 같은 수가 아니다.\n\nㄷ은 올바른 b를 이용하여 따로 확인하면 (b+3)²=(3√2-1)²=18-6√2+1=19-6√2이므로 맞다. 따라서 세 기록 중 잘못된 것은 ㄴ 하나뿐이다.\n\n고친 값을 이용하면 a/b+(b+3)²=(6√2+8)+(19-6√2)=27이다. a,b는 정수부분·소수부분의 정의로 유일하고 b>0이므로 계산과 최종값도 유일하다.'
raw={'studentDigest':s['studentDigest'],'solverId':'codex-independent-helper-q19-blind-20261020-r1','answer':'ㄴ, \\dfrac{a}{b}=6\\sqrt{2}+8, \\dfrac{a}{b}+(b+3)^2=27','solution':solution,'evidence':{'priorExactNewQuestionOrAnswerExposure':False,'authorAnswerExposure':False,'declaration':'현재 맥락에서 정확한 새q19 문항/저자답을 보지 않았다고 학생파일 열람 전에 선언했다. 허용된학생3파일과자체새파일만읽었고,원문q19/저자private/package/이전source/다른문항/답검색/부모code는열지않았다.','ownExactCalculations':calc,'inputHashes':before,'ownProbeSha256':sha(probe),'gradeOrMathApprovalCountAdded':False},'status':'solved'}
assert isinstance(raw['answer'],str) and isinstance(raw['solution'],str);assert s['questionType']=='서술형' and s['choices']==[];put('solve/q19.json',raw)
assert before=={n:sha(p/n) for n in names}
put('own-q19-blind-seal-evidence.json',{'inputHashes':before,'inputBytesUnchanged':True,'rawSha256':sha(p/'solve/q19.json'),'calculationsSha256':sha(p/'own-q19-blind-calculations.json'),'utf8ProbeSha256':sha(probe),'utf8ReadWriteProbePassed':True,'authorAnswerExposure':False,'rawCreatedBeforeAuthorPacket':True,'newMathOrGradeApprovalCount':0,'dbWrites':0})
print('raw SHA256 '+sha(p/'solve/q19.json'));print('calculation SHA256 '+sha(p/'own-q19-blind-calculations.json'))
