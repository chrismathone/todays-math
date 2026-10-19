from pathlib import Path
from fractions import Fraction as F
import json, hashlib
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q11-clean-blind-20261019-r1')
raw=(b/'student-problems.json').read_bytes()
manifest=json.loads((b/'blind-manifest.json').read_text(encoding='utf-8'))
assert hashlib.sha256(raw).hexdigest()==manifest['studentProblemsSha256']
p=json.loads(raw)[0]
constant=F(9,16); required_sum=F(-21,4)
a=F(3,4)
assert a>0 and a*a==constant
linear_coefficient=required_sum-a
k=-linear_coefficient/(2*a)
assert k==4 and k>0
# Multiply the two factors coefficient by coefficient, rather than treating a stored answer as an oracle.
def expand(k,a):
    factor={1:k,0:-a}
    coefficients={0:F(0),1:F(0),2:F(0)}
    for d,c in factor.items():
        for e,v in factor.items(): coefficients[d+e]+=c*v
    return coefficients
choices=[]
for index,candidate in enumerate([2,3,4,5,6]):
    coeff=expand(F(candidate),a)
    total=a+coeff[1]
    choices.append(dict(mark=chr(0x2460+index),k=str(candidate),a=str(a),x2=str(coeff[2]),x=str(coeff[1]),constant=str(coeff[0]),aPlusB=str(total),positiveConstants=(candidate>0 and a>0),satisfies=total==required_sum and coeff[0]==constant))
assert sum(row['satisfies'] for row in choices)==1
coeff=expand(k,a)
substitutions=[]
for x in [F(-2),F(0),F(1,2),F(3)]:
    lhs=(k*x-a)**2
    rhs=sum(c*x**d for d,c in coeff.items())
    assert lhs==rhs
    substitutions.append(dict(x=str(x),factorSquare=str(lhs),expanded=str(rhs)))
negative_a=-a
negative_branch_k=-(required_sum-negative_a)/(2*negative_a)
assert negative_branch_k==-3
calculations=dict(expansionRule='(kx-a)^2=k^2*x^2-2ka*x+a^2',a=str(a),b=str(linear_coefficient),k=str(k),coefficients={str(d):str(c) for d,c in coeff.items()},choices=choices,substitutionChecks=substitutions,excludedNegativeSquareRoot=dict(a=str(negative_a),k=str(negative_branch_k),reason='a>0 조건 위반; k도 양수가 아님'),uniqueness='a^2=9/16 및 a>0에서 a=3/4 하나. -2a=-3/2는 0이 아니므로 b=-2ak에 대한 k의 일차방정식도 해가 하나.',domain='a,k는 양의 실수 상수, b는 실수인 계수. 다항식은 모든 실수 x에서 정의되며 x의 특정 값을 구하는 문제가 아니다. 근호·변수 분모 제한이나 단위는 없다.')
solution='(kx-a)²=k²x²-2kax+a²로 전개되므로 x의 계수는 b=-2ka이고 상수항은 a²이다. 상수항 조건에서 a²=9/16이고 a>0이므로 a=3/4이다. 음의 제곱근 -3/4는 양수 조건에 맞지 않는다. a+b=-21/4에 대입하면 b=-21/4-3/4=-6이다. 따라서 -2k×(3/4)=-6, 즉 -(3/2)k=-6에서 k=4이다. 실제로 (4x-3/4)²=16x²-6x+9/16이므로 상수항은 9/16이고 a+b=3/4-6=-21/4이며 a,k는 모두 양수이다. a는 양의 제곱근으로 하나만 정해지고, k를 정하는 일차방정식의 계수 -3/2가 0이 아니므로 해는 유일하다. 다섯 보기 k=2,3,4,5,6에서 x의 계수 b는 각각 -3,-9/2,-6,-15/2,-9이고 a+b는 각각 -9/4,-15/4,-21/4,-27/4,-33/4이다. 따라서 ③만 조건을 만족한다. x²의 계수 k²는 k의 양수 조건 때문에 양수이며, b는 음수이고 상수항은 양수이다. 이 다항식은 모든 실수 x에서 정의되며 단위는 없다.'
proof=dict(studentDigest=p['studentDigest'],solverId='fresh-independent-codex-q11-20261019-r1',answer='③',solution=solution,evidence=dict(calculations=calculations,method='중3 2015 곱셈 공식·제곱근의 뜻과 양수 조건·중1 일차방정식',exposureDeclaration='정확한 새 q11 문항/정답 사전 노출 없음. 본 세션에서는 지정된 네 파일만 읽고 독립 풀이함. 이전 family 답을 oracle로 사용하지 않음.',printedCheck='q11.png의 양수 a,k, 상수항 9/16, a+b=-21/4와 다섯 보기 2,3,4,5,6을 직접 확인. 픽셀 측정 없음.',questionDataSha256=hashlib.sha256(raw).hexdigest()),status='solved')
assert isinstance(proof['answer'],str) and len(proof['answer'])==1 and proof['answer'] in '①②③④⑤'
assert isinstance(proof['solution'],str)
(b/'solve').mkdir(exist_ok=True)
for target,obj in [(b/'solve/q11.json',proof),(b/'own-q11-calculations.json',calculations)]:
    with target.open('x',encoding='utf-8',newline='\n') as f: f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('q11 raw SHA256:',hashlib.sha256((b/'solve/q11.json').read_bytes()).hexdigest())
print('Exact rational arithmetic, all five choices, coefficient convolution, and four substitutions passed.')
