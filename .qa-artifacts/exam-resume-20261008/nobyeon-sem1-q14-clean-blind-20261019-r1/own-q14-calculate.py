from pathlib import Path
from fractions import Fraction as F
import json,hashlib
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q14-clean-blind-20261019-r1')
data=(b/'student-problems.json').read_bytes();m=json.loads((b/'blind-manifest.json').read_text(encoding='utf-8'))
assert hashlib.sha256(data).hexdigest()==m['studentProblemsSha256']
p=json.loads(data)[0]
def multiply(a,c):
 out={}
 for i,x in a.items():
  for j,y in c.items():out[i+j]=out.get(i+j,0)+x*y
 return out
product=multiply({1:1,0:4},{1:1,0:-3});square=multiply({1:1,0:-1},{1:1,0:-1})
poly={d:product.get(d,0)-square.get(d,0) for d in set(product)|set(square)}
assert product=={2:1,1:1,0:-12} and square=={2:1,1:-2,0:1}
assert poly=={0:-13,1:3,2:0}
root=F(77-poly[0],poly[1]);assert root==30 and root.denominator==1 and root>3
rows=[]
for i,n in enumerate([28,29,30,31,32]):
 left=(n+4)*(n-3)-(n-1)**2; reduced=3*n-13
 assert left==reduced
 rows.append(dict(mark=chr(0x2460+i),n=n,firstFactor=n+4,secondFactor=n-3,squaredFactor=n-1,product=(n+4)*(n-3),square=(n-1)**2,lhs=left,rhs=77,residual=left-77,integer=True,greaterThan3=n>3,satisfies=left==77))
assert sum(r['satisfies'] for r in rows)==1 and rows[2]['satisfies']
calc=dict(productCoefficients={str(k):v for k,v in product.items()},squareCoefficients={str(k):v for k,v in square.items()},differenceCoefficients={str(k):v for k,v in poly.items()},equation='3n-13=77',root=str(root),choices=rows,existence='n=30은3보다큰정수이며34×27-29²=918-841=77로원식을만족한다.',uniqueness='두이차항이상쇄되어3n=90이된다. 계수3이0이아니므로실수해도하나뿐이며그유일해가정수조건을충족한다.',domain='원래식은다항식이므로모든실수에서정의되며문제는n∈Z,n>3으로제한한다. 분모·근호는없고방정식을풀때나누는3은비영이다. n>3에서n+4,n-3,n-1도모두양수이다. 길이·단위·도형조건은없다.')
solution='곱셈 공식으로 (n+4)(n-3)=n²+(4-3)n+4×(-3)=n²+n-12이고, (n-1)²=n²-2n+1이다. 따라서 왼쪽은 (n²+n-12)-(n²-2n+1)=n²+n-12-n²+2n-1=3n-13이다. 주어진 등식은 3n-13=77, 즉 3n=90이므로 n=30이다. 30은 3보다 큰 정수이고, 원래 식에 대입하면 (30+4)(30-3)-(30-1)²=34×27-29²=918-841=77이므로 실제 해이다. 식을 정리할 때 동치 변형만 했고 일차항 계수 3이 0이 아니므로 실수해도 30 하나뿐이다. 따라서 정수 조건을 만족하는 해 역시 유일하다. 다섯 보기 n=28,29,30,31,32를 대입한 왼쪽 값은 각각 71,74,77,80,83이므로 ③만 맞다. 원래 식은 다항식이라 분모나 근호의 정의역 제한이 없고, n은 3보다 큰 정수라는 조건만 확인하면 된다. 계산에서 나누는 수 3은 0이 아니며 길이 단위는 없다.'
proof=dict(studentDigest=p['studentDigest'],solverId='fresh-independent-codex-q14-20261019-r1',answer='③',solution=solution,evidence=dict(calculations=calc,method='2015 중3 곱셈 공식·동류항 정리와 중1 일차방정식',priorExposure='정확한 새q14 문항/정답 사전노출 없음. 지정된 네파일만 읽어 독립계산했으며 이전family답·저자·원문·기존proof를oracle로사용하지않음.',printedCheck='q14.png의 n>3 정수조건, 두인수(n+4)(n-3), 빼는제곱(n-1)², 우변77과보기28~32를직접대조함. 픽셀측정없음.',studentProblemsSha256=hashlib.sha256(data).hexdigest()),status='solved')
assert isinstance(proof['answer'],str) and len(proof['answer'])==1 and proof['answer'] in '①②③④⑤'
assert isinstance(proof['solution'],str)
(b/'solve').mkdir(exist_ok=True)
for path,obj in [(b/'solve/q14.json',proof),(b/'own-q14-calculations.json',calc)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('q14 raw SHA256:',hashlib.sha256((b/'solve/q14.json').read_bytes()).hexdigest())
print('Exact polynomial products, subtraction, unique integer root, original substitution and all5choices passed.')
