from pathlib import Path
import json,hashlib
from fractions import Fraction as F
P=Path(__file__).resolve().parent.parent;E=Path(__file__).resolve().parent;rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
probe=E/'own-utf8-probe.txt';v='독립 풀이 UTF8 확인: 제곱근과 평균';probe.write_text(v,encoding='utf-8');assert probe.read_text(encoding='utf-8')==v
inputs=[P/'blind'/x for x in ['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json','figures/q01-1.svg']]+[P/'student-preview'/x for x in ['q01.png','q02.png']];before=[{'path':str(p.relative_to(P)),'sha256':sha(p)}for p in inputs];students=rd(P/'blind/student-problems.json');manifest=rd(P/'blind/blind-manifest.json');assert sha(P/'blind/student-problems.json')==manifest['studentProblemsSha256'];assert sha(P/'blind/figures/q01-1.svg')==manifest['figures'][0]['sha256']
# Exact quadratic-field arithmetic: (r,s) denotes r+s sqrt(3). No floating point.
def add(x,y):return(x[0]+y[0],x[1]+y[1])
def mul(x,y):return(x[0]*y[0]+3*x[1]*y[1],x[0]*y[1]+x[1]*y[0])
def div(x,y):
 n=y[0]*y[0]-3*y[1]*y[1];assert n!=0;z=mul(x,(y[0],-y[1]));return(z[0]/n,z[1]/n)
def enc(x):return[str(v)for v in x]
checks=[]
def ck(id,ok):checks.append({'id':id,'passed':bool(ok)});assert ok,id
# (3-a)^2 = a^2 -6a +9. Equality with offered k is (-6-k)a=0.
opts1=[-9,-6,-3,3,6];q1=[{'choice':'①②③④⑤'[i],'k':k,'coefficientDifference':-6-k,'canEqualForAOver3':k==-6}for i,k in enumerate(opts1)];ck('q01 unique option',sum(x['canEqualForAOver3']for x in q1)==1)
for a in [F(7,2),F(4),F(10),F(301,100)]:
 ck('q01 positive side '+str(a),a-3>0);ck('q01 area equality '+str(a),(3-a)**2==(a-3)**2==a*a-6*a+9);ck('q01 removed union area '+str(a),a*a-(a-3)**2==3*a+3*a-9)
# Coefficients are convolved in own code, not read from any author material.
p=[F(3),F(-1)];square=[sum((p[i]*p[j]for i in range(2)for j in range(2)if i+j==k),F(0))for k in range(3)];ck('q01 polynomial expansion',square==[9,-6,1])
# 1<sqrt(3)<2 follows exact squared bounds. Both denominators positive, product=1.
ck('q02 radical bound',1**2<3<2**2);denP=(F(2),F(1));denQ=(F(2),F(-1));ck('q02 denominator product',mul(denP,denQ)==(1,0))
opts2=[-2,2,3,5,7];q2=[]
for i,k in enumerate(opts2):
 pv=div((F(k),F(1)),denP);qv=div((F(k),F(-1)),denQ);total=add(pv,qv);avg=(total[0]/2,total[1]/2);ck('q02 exact average '+str(k),avg==(2*k-3,0));q2.append({'choice':'①②③④⑤'[i],'k':k,'P':enc(pv),'Q':enc(qv),'sum':enc(total),'average':enc(avg),'matches7':avg==(7,0)})
ck('q02 unique option',sum(x['matches7']for x in q2)==1);ck('q02 unique rational solution',F(7+3,2)==5);ck('q02 direct P Q for k5',q2[3]['P']==['7','-3']and q2[3]['Q']==['7','3'])
exposure={'solverId':'independent-helper-gachang-first2-20261020-r1','priorExposure':'이전 원문 9개 구성요소 검토, 공개 엔진, 관련 수학 변형 검토 및 Gachang 메타데이터/코드 감사 이력이 있다. 전체 원문 집합을 처음 본다는 주장은 하지 않는다. 이번 현재 변형 q01/q02의 저자 답·풀이·private 스펙·원문 HWP/PDF·raw parser 자료는 읽지 않았다.','currentAuthorAnswerExposedBeforeRawSeal':False,'readScope':'현재 허용 학생3JSON/brief files, 학생SVG1개, 학생PNG2개만 읽음. 두 PNG를 실제 view_image로 확인. SVG좌표나 픽셀을 수치 계산에 사용하지 않음.','newApprovalCounts':0}
sols=[
 '위쪽과 오른쪽에서 폭 3 cm를 잘라 내면 남은 정사각형의 한 변은 (a-3) cm이다. a>3이므로 이 길이와 넓이는 양수이다. (3-a)^2=(a-3)^2=a^2-6a+9이므로 주어진 a^2+ka+9와 같으려면 (k+6)a=0이다. a>3이어서 a≠0이므로 k=-6이다. 따라서 ②이다. 나머지 보기 -9, -3, 3, 6은 각각 k+6이 -3, 3, 9, 12여서 조건을 만족시키지 않는다. 길이 단위는 cm, 넓이 단위는 cm²이고 k는 수의 계수이다.',
 '1<√3<2이므로 2+√3과 2-√3은 모두 양수이고 0이 아니다. 두 분모의 곱은 (2+√3)(2-√3)=1이다. 분모를 유리화하면 P=(k+√3)(2-√3)=2k-3+(2-k)√3, Q=(k-√3)(2+√3)=2k-3+(k-2)√3이다. 따라서 P+Q=4k-6이고 평균은 2k-3이다. 2k-3=7에서 k=5이다. 이는 유리수이며, 이때 P=7-3√3, Q=7+3√3이어서 평균이 실제로 7이다. k의 계수가 2≠0이므로 해는 유일하다. 보기 -2, 2, 3, 5, 7을 차례로 넣은 평균은 -7, 1, 3, 7, 11이므로 정답은 ④이다. P, Q의 부호 조건은 주어지지 않았으며 불필요한 양수 조건을 추가하지 않는다.'
]
(P/'blind/solve').mkdir(exist_ok=True)
for i,st in enumerate(students):
 n=st['questionNumber'];e={'exposure':exposure,'ownExactCalculation':q1 if n==1 else q2,'domainAndUniqueness':'a>3: a-3>0, a≠0이므로 k=-6만 가능. 모든 a>3에 대해 성립하며 a 자체는 정하지 않아도 됨.'if n==1 else'k∈Q, 1<√3<2, 두 분모>0, 곱1. 평균식2k-3=7의 유일한 유리수 해5.','studentMethod':'2015 중3 다항식 곱셈의 완전제곱식, 이전 학년 일차방정식·정사각형 넓이.'if n==1 else'2015 중3 제곱근의 대소 비교·근호를 포함한 식의 계산·분모 유리화, 이전 학년 평균·일차방정식.','limitations':'학생 방법에 고등학교 도구 불필요. 이 raw는 학년/가족/권리/native/출시 승인 보고서가 아님. q01 그림의 3 cm 표기는 띠 안에 위치하나 폭3은 문장에 명시되어 있어 그림 비율을 측정하지 않음.','calculationFile':'../../own-raw-evidence-r1/own-calculate.py'}
 out={'studentDigest':st['studentDigest'],'solverId':exposure['solverId'],'answer':'②'if n==1 else'④','solution':sols[i],'evidence':e,'status':'solved'};assert out['answer']in'①②③④⑤'and len(out['answer'])==1;(P/f'blind/solve/q{n:02}.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(E/'own-exposure-and-grade-concerns.json').write_text(json.dumps(exposure,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');after=[{'path':str(p.relative_to(P)),'sha256':sha(p)}for p in inputs];assert before==after
receipt={'inputHashesBefore':before,'inputHashesAfter':after,'exactArithmetic':'fractions.Fraction + own coefficient convolution and Q(sqrt3) pair arithmetic; no floats/pixel oracle','checks':checks,'passed':sum(x['passed']for x in checks),'failed':0,'q01Options':q1,'q02Options':q2,'utf8ProbeSHA256':sha(probe),'raws':[{'path':f'blind/solve/q{n:02}.json','sha256':sha(P/f'blind/solve/q{n:02}.json')}for n in [1,2]],'scriptSHA256':sha(Path(__file__))};(E/'own-calculation-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'passed':receipt['passed'],'failed':0,'raws':receipt['raws']},indent=2))
