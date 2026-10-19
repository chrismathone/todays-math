from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q18-clean-blind-20261019-r1')
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def put(n,v):
 q=p/n;q.parent.mkdir(exist_ok=True)
 with q.open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
names=['student-problems.json','blind-manifest.json','SOLVE-BRIEF.md','q18.png'];before={n:sha(p/n) for n in names}
s=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0];m=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert before['student-problems.json']==m['studentProblemsSha256']
# Exact principal roots of rational squares, with nonnegative result.
def root_square(q):return abs(q)
root_neg3_square=root_square(F(-3));sqrt2_square=F(2);negative_sqrt18_square=F(18);den=root_square(F(3,4));assert den!=0 and den>0
term1=-root_neg3_square*sqrt2_square;term2=negative_sqrt18_square/den;A=term1+term2;assert A==18 and A>0
# sqrt(18)=c sqrt(d), extracting integer square factors without floats.
def radical(n):
 assert n>=0
 for c in range(isqrt(n),0,-1):
  if n%(c*c)==0:return c,n//(c*c)
c,d=radical(A.numerator);assert A.denominator==1 and (c,d)==(3,2)
roots=[(-c,d),(c,d)];distance=(2*c,d)
assert all(F(k*k*r)==A for k,r in roots);assert roots[0]!=roots[1];assert distance==(6,2);assert distance[0]>0 and distance[1]>0
# A positive root r: t²=r² implies (t-r)(t+r)=0, so only +/-r.
calc={'exactRationalCalculations':{'sqrtOfNegative3Squared':str(root_neg3_square),'sqrt2Squared':str(sqrt2_square),'negativeSqrt18Squared':str(negative_sqrt18_square),'denominator':str(den),'firstTerm':str(term1),'secondTerm':str(term2),'A':str(A)},'exactRadicalRepresentation':{'meaning':'[coefficient, squarefree radicand]','roots':[list(v) for v in roots],'distance':list(distance),'rootSquares':[str(F(k*k*r)) for k,r in roots],'distanceSquared':str(F(distance[0]**2*distance[1]))},'domainAndSign':{'radicands':[9,2,18,'9/16'],'allRadicandsNonnegative':True,'denominatorNonzero':True,'APositive':True,'twoDistinctRealRoots':True,'distancePositive':True},'existenceUniqueness':'A=18>0이므로 제곱근 r=3√2>0와 -r가 존재. t²=18이면 (t-r)(t+r)=0이므로 이 둘뿐. 왼쪽 점 -r와 오른쪽 점 r의 거리는 r-(-r)=2r로 유일.','signChecks':['-√((-3)²)=-3; √((-3)²) 자체는 +3','(-√18)²=+18; -18이 아님','√((3/4)²)=|3/4|=3/4; 18÷(3/4)=18×4/3=24'],'choicesReview':{'applicable':False,'reason':'서술형이며 choices=[]; 존재하지 않는 5개 선택지를 만들지 않음'},'units':'수직선의 수 사이 거리이며 별도 물리 단위가 주어지지 않음. 답은 6√2.','printedImageCheck':'q18.png를 직접 확인하여 부호, 제곱 위치, 분수와 나눗셈, 두 제곱근 거리 요구가 student JSON과 일치함. 이미지 측정은 계산에 사용하지 않음.','studentMethod':'제곱근의 뜻/성질, 양수 제곱근, 유리수 분수 나눗셈, 근호 간단히 하기, 수직선 거리. 2015 중3 학생 방법으로 풀이; 학년별 공식 배치의 별도 심사 승인 주장은 없음.'}
put('own-q18-calculations.json',calc)
solution='제곱근 기호는 음이 아닌 값을 나타내므로 √((-3)²)=3이고, (√2)²=2이다. 또 (-√18)²=18이며, √((3/4)²)=|3/4|=3/4이다. 나누는 수 3/4은 0이 아니므로\nA=-(3×2)+18÷(3/4)=-6+18×(4/3)=-6+24=18이다.\nA=18>0이므로 A의 서로 다른 두 제곱근은 √18=3√2와 -√18=-3√2이다. 실제로 두 수의 제곱은 모두 18이고, 하나는 양수이고 하나는 음수이므로 서로 다르다. 제곱이 18인 실수는 이 두 수뿐이다.\n수직선에서 오른쪽 점의 수에서 왼쪽 점의 수를 빼면 두 점 사이의 거리는 3√2-(-3√2)=6√2이다. 따라서 구하는 유일한 양의 거리는 6√2이다.'
raw={'studentDigest':s['studentDigest'],'solverId':'codex-independent-q18-clean-blind-r1-20261019','answer':'6\\sqrt{2}','solution':solution,'evidence':{'status':'independently-solved-before-author-exposure','exactQuestionOrAnswerPriorExposure':False,'exposureDeclaration':'허용된 q18 학생 파일을 읽기 전에 정확한 새 q18 문항과 정답을 본 적 없다고 선언함. 원문·저자·이전 풀이·코드·다른 QA를 읽지 않음.','calculations':calc,'inputHashes':before},'status':'solved'}
assert isinstance(raw['answer'],str) and isinstance(raw['solution'],str);put('solve/q18.json',raw)
assert before=={n:sha(p/n) for n in names}
put('own-q18-seal-evidence.json',{'inputHashes':before,'inputsUnchanged':True,'rawSha256':sha(p/'solve/q18.json'),'calculationSha256':sha(p/'own-q18-calculations.json'),'answerType':'scalar math string, written response; not MC','authorExposure':False,'dbWrites':0})
print('raw '+sha(p/'solve/q18.json'));print('calculations '+sha(p/'own-q18-calculations.json'));print('seal-evidence '+sha(p/'own-q18-seal-evidence.json'))
