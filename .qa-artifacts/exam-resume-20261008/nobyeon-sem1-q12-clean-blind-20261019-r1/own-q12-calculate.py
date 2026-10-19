from fractions import Fraction as F
from pathlib import Path
import json,hashlib
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q12-clean-blind-20261019-r1')
data=(b/'student-problems.json').read_bytes();manifest=json.loads((b/'blind-manifest.json').read_text(encoding='utf-8'))
assert hashlib.sha256(data).hexdigest()==manifest['studentProblemsSha256']
p=json.loads(data)[0]
# A pair (r,s) denotes the exact number r+s*sqrt(5).
def add(a,b):return (a[0]+b[0],a[1]+b[1])
def neg(a):return (-a[0],-a[1])
def sub(a,b):return add(a,neg(b))
def mul(a,b):return (a[0]*b[0]+5*a[1]*b[1],a[0]*b[1]+a[1]*b[0])
def inv(a):
 norm=a[0]*a[0]-5*a[1]*a[1]
 assert norm!=0
 return (a[0]/norm,-a[1]/norm)
def scale(a,t):return (a[0]*t,a[1]*t)
def cube(a):return mul(mul(a,a),a)
def show(a):return dict(rational=str(a[0]),sqrt5Coefficient=str(a[1]))
one=(F(1),F(0));den_u=(F(-1),F(1));den_v=(F(1),F(1))
u=inv(den_u);v=inv(den_v)
assert mul(u,den_u)==one and mul(v,den_v)==one
assert u==(F(1,4),F(1,4)) and v==(F(-1,4),F(1,4))
uv=mul(u,v);difference=sub(u,v);total=add(u,v)
direct=sub(mul(cube(u),v),mul(u,cube(v)))
factored=mul(mul(uv,difference),total)
assert uv==(F(1,4),F(0)) and difference==(F(1,2),F(0)) and total==(F(0),F(1,2))
assert direct==factored==(F(0),F(1,16))
rhs=(F(0),F(13,16));t=mul(sub(rhs,direct),inv(total))
assert t==(F(3,2),F(0))
rows=[]
for i,c in enumerate([F(-1,2),F(0),F(1,2),F(1),F(3,2)]):
 lhs=add(direct,scale(total,c));rows.append(dict(mark=chr(0x2460+i),t=str(c),lhs=show(lhs),rhs=show(rhs),residual=show(sub(lhs,rhs)),satisfies=lhs==rhs))
assert sum(row['satisfies'] for row in rows)==1 and rows[-1]['satisfies']
calculation=dict(numberRepresentation='(r,s)=r+s√5; all arithmetic uses exact Fraction values',denominators=dict(u='√5-1',v='√5+1',nonzeroProof='5>1이므로 √5>1. 따라서 √5-1>0,√5+1>0.',rationalizationProduct='(√5-1)(√5+1)=5-1=4≠0',norms=dict(u='-4',v='-4')),u=show(u),v=show(v),uv=show(uv),uMinusV=show(difference),uPlusV=show(total),quarticDirect=show(direct),quarticFactored=show(factored),target=show(rhs),t=show(t),choices=rows,uniqueness='t의 계수u+v=√5/2>0이므로0이 아니다. t에 관한 일차방정식에 정확히 하나의 실수 해가 있고 t=3/2를 원식에 대입해 존재도 확인했다.',domainAndUnits='u,v는 양의 실수로 정의된다. t는 실수이며 양수 조건이 붙지 않았지만 구한 해는 양수이다. 제곱근의 피제곱수5는 양수,원래/유리화 분모는 모두0이 아니고 u+v로 나눌 때도0이 아니다. 단위·도형·픽셀 측정 조건은 없다.')
solution='√5>1이므로 두 분모 √5-1, √5+1은 모두 양수이고 0이 아니다. 분모를 유리화하면 u=(√5+1)/4, v=(√5-1)/4이다. 따라서 u+v=√5/2, u-v=1/2, uv=1/4이다. 공통인수 uv를 묶고 제곱의 차를 이용하면 u³v-uv³=uv(u²-v²)=uv(u-v)(u+v)=(1/4)×(1/2)×(√5/2)=√5/16이다. 주어진 식에 넣으면 √5/16+t(√5/2)=13√5/16이다. √5>0이므로 양변을 √5로 나누어 1/16+t/2=13/16, t/2=12/16=3/4에서 t=3/2이다. 실제로 좌변은 √5/16+(3/2)(√5/2)=√5/16+12√5/16=13√5/16이 되어 해가 존재한다. u+v=√5/2가 0이 아니므로 t의 일차방정식의 해는 유일하다. 다섯 보기 t=-1/2,0,1/2,1,3/2를 대입한 좌변은 각각 -3√5/16,√5/16,5√5/16,9√5/16,13√5/16이므로 ⑤만 맞다. u,v는 양수이며 t에는 실수라는 조건만 있다. 모든 계산에서 분모 4,16과 나누는 수 √5, u+v는 0이 아니며 단위는 없다.'
proof=dict(studentDigest=p['studentDigest'],solverId='fresh-independent-codex-q12-20261019-r1',answer='⑤',solution=solution,evidence=dict(calculations=calculation,method='2015 중3: 분모의 유리화·공통인수 묶기·제곱의 차 인수분해·근호 계산·중1 일차방정식',priorExposure='정확한 새 q12 문항과 정답을 읽기 전 본 적 없음. 지정된 네 파일만 사용했고 이전 family 답/저자/원문/기존 풀이를 oracle로 사용하지 않음.',printedCheck='q12.png에서 두 분모의 ±1,지수u³v-uv³,가변항t(u+v),우변13√5/16와 다섯 보기를 직접 확인. 픽셀 측정 없음.',studentProblemsSha256=hashlib.sha256(data).hexdigest()),status='solved')
assert isinstance(proof['answer'],str) and len(proof['answer'])==1 and proof['answer'] in '①②③④⑤'
assert isinstance(proof['solution'],str)
(b/'solve').mkdir(exist_ok=True)
for path,obj in [(b/'solve/q12.json',proof),(b/'own-q12-calculations.json',calculation)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('q12 raw SHA256:',hashlib.sha256((b/'solve/q12.json').read_bytes()).hexdigest())
print('Exact radical-pair calculations: direct quartic=factored quartic; all5 choices; unique real t; all denominator checks passed.')
