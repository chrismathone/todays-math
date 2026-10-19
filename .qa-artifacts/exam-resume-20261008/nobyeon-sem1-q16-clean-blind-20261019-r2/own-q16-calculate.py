from pathlib import Path
from math import isqrt
import xml.etree.ElementTree as ET
import json,hashlib
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q16-clean-blind-20261019-r2')
def sha(data):return hashlib.sha256(data).hexdigest()
data=(b/'student-problems.json').read_bytes();manifest=json.loads((b/'blind-manifest.json').read_text(encoding='utf-8'));assert sha(data)==manifest['studentProblemsSha256']
p=json.loads(data)[0];svg=(b/'figures/q16-1.svg').read_bytes();assert sha(svg)==manifest['figures'][0]['sha256']==p['figures'][0]['sha256']
# Diagram checks only: no graphical size enters any algebraic length calculation below.
tree=ET.fromstring(svg);ns={'s':'http://www.w3.org/2000/svg'};lines=tree.findall('.//s:line',ns);assert len(lines)==8
squareChecks=[]
for start in [0,4]:
 edges=[((float(l.attrib['x1']),float(l.attrib['y1'])),(float(l.attrib['x2']),float(l.attrib['y2']))) for l in lines[start:start+4]]
 assert all(edges[i][1]==edges[(i+1)%4][0] for i in range(4))
 assert all((a[0]==c[0])!=(a[1]==c[1]) for a,c in edges)
 lengths2=[(a[0]-c[0])**2+(a[1]-c[1])**2 for a,c in edges]
 assert len(set(lengths2))==1 and lengths2[0]>0
 squareChecks.append(dict(closedFourSides=True,rightAngles=True,equalGraphicSides=True,usedForNumericalLengths=False))
labels=[e.attrib['data-label'] for e in tree.iter() if 'data-label' in e.attrib];assert labels==['A','B']
# Entire solution now uses ONLY the printed perimeter92, shift6, natural-number and prime conditions.
def isprime(n):return n>=2 and all(n%d for d in range(2,isqrt(n)+1))
def primefactor(n):
 result=[];d=2
 while d*d<=n:
  while n%d==0:result.append(d);n//=d
  d+=1
 if n>1:result.append(n)
 return result
sideSum=92//4;assert sideSum==23 and 92%4==0 and isprime(sideSum)
xySum=sideSum-6;assert xySum==17
rows=[]
for y in range(1,17):
 x=xySum-y
 if x>0 and x>y+6:
  areaB=y*y+12*y+36;assert areaB==(y+6)**2
  areaDifference=x*x-areaB;factored=(x-y-6)*sideSum;assert areaDifference==factored
  rows.append(dict(x=x,y=y,sideAcm=x,sideBcm=y+6,perimeterSumCm=4*x+4*(y+6),areaAcm2=x*x,areaBcm2=areaB,areaDifferenceCm2=areaDifference,positiveIntegerFactor=x-y-6,primeFactors=primefactor(areaDifference),prime=isprime(areaDifference),xy=x*y))
assert [(r['x'],r['y']) for r in rows]==[(16,1),(15,2),(14,3),(13,4),(12,5)]
solutions=[r for r in rows if r['prime']];assert len(solutions)==1 and solutions[0]['xy']==60
choices=[]
for i,value in enumerate([40,48,54,60,66]):
 pairs=[]
 for x in range(1,17):
  y=17-x
  if x*y==value:pairs.append(dict(x=x,y=y,positiveSides=True,perimeterSumCm=92,areaAGreater=x>y+6,areaDifferenceCm2=x*x-(y+6)**2,primePositiveDifference=isprime(x*x-(y+6)**2),allConditions=x>y+6 and isprime(x*x-(y+6)**2)))
 choices.append(dict(mark=chr(0x2460+i),xy=value,pairsWithNaturalNumbersAndPerimeter=pairs,satisfies=any(q['allConditions'] for q in pairs)))
assert sum(c['satisfies'] for c in choices)==1 and choices[3]['satisfies']
# If a convention included0 among natural numbers, the only extra y=0 case fails primality.
zeroCase=dict(x=17,y=0,areaDifferenceCm2=17**2-6**2,prime=False,primeFactors=primefactor(17**2-6**2));assert zeroCase['areaDifferenceCm2']==253 and not isprime(253)
calc=dict(perimeterEquation='4x+4(y+6)=92',sideSum=23,xySum=17,areaDifferenceFactorization='x²-(y+6)²=(x-y-6)(x+y+6)=23(x-y-6)',primeReason='A>B 및 양수인 두변으로x>y+6이다. 따라서x-y-6은양의정수이며넓이차의수23(x-y-6)가소수이려면x-y-6=1이어야한다.',linearSolution='x+y=17,x-y=7에서x=12,y=5. 또는x=17-y를대입하여11-2y=1,y=5,x=12.',feasibleNaturalPairs=rows,uniqueSolution=solutions[0],choices=choices,zeroNaturalConventionCheck=zeroCase,units='A변x cm,B변(y+6) cm;넓이cm²;둘레합92cm. 소수조건은넓이차를cm²단위로나타낸정수23에적용한다. xy는자연수변수의곱으로단위를붙이지않는다.',domain='x,y는자연수이고모든변은양수이다. y+6>0이므로√((y+6)²)=y+6이다. 원식의분모/근호제외조건은없고둘레식에서나누는4,정리중2는비영이다.',diagramCheck=dict(squareChecks=squareChecks,labels=labels,svgSha256=sha(svg),numericalLengthSource='printed algebra only; no pixels or SVG coordinate dimensions used'))
solution='B의 넓이는 y²+12y+36=(y+6)² cm²이다. y가 자연수이므로 y+6>0이고, B의 한 변은 y+6 cm이다. 둘레의 합에서 4x+4(y+6)=92이므로 x+y+6=23, 즉 x+y=17이다. A의 넓이가 더 크고 두 변이 양수이므로 x>y+6이다. 따라서 넓이 차를 cm² 단위로 나타낸 수는 x²-(y+6)²=(x-y-6)(x+y+6)=23(x-y-6)이다. x-y-6은 양의 정수이다. 23은 소수이고, 이 곱 자체도 소수이려면 x-y-6=1이어야 한다. 따라서 x-y=7이다. x=17-y를 대입하면 17-y-y=7에서 y=5, x=12가 된다. 그러므로 xy=60이고 ④이다. 실제 두 변은12 cm와11 cm로 양수이고, 둘레 합은48+44=92 cm, 넓이 차는144-121=23 cm²여서 모든 조건을 만족한다. 소수 조건으로 차의 다른 양의 정수 인수가1로 정해지고 x+y=17, x-y=7에서 한 쌍만 나오므로 해는 유일하다. 모든 가능한 자연수 쌍은 (x,y)=(16,1),(15,2),(14,3),(13,4),(12,5)이고, 넓이 차의 수는 각각207=23×9,161=23×7,115=23×5,69=23×3,23이다. 마지막 경우만 소수이다. 보기①40,②48,③54는 둘레 조건 x+y=17을 만족하는 양의 정수 곱이 아니고, ⑤66은 (11,6) 또는(6,11)인데 둘 다 A의 넓이가 더 크다는 조건에 맞지 않는다. 그림은 A,B의 정사각형과 라벨만 확인했으며 길이는 그림에서 재지 않았다. 혹시 자연수에0을 포함하는 관례를 쓰더라도 추가 y=0의 경우 넓이 차253=23×11은 소수가 아니어서 답은 변하지 않는다. 길이·둘레의 단위는cm, 넓이는cm²이고 묻는 xy에는 단위를 붙이지 않는다.'
proof=dict(studentDigest=p['studentDigest'],solverId='fresh-independent-codex-q16-r2-20261019-r1',answer='④',solution=solution,evidence=dict(calculations=calc,method='2015중3 완전제곱식 인수분해·양의제곱근·제곱의차,중1소수와일차방정식',priorExposure='정확한새q16r2 문항/정답은읽기전본적없음. 지정된다섯파일만읽고독립계산함. 이전family답·원문·저자·기존proof를oracle로사용하지않음.',printedCheck='q16.png의자연수조건,x cm,(y²+12y+36)cm²,A넓이>B,둘레합92cm,넓이차의수소수,다섯보기40/48/54/60/66을직접확인. 그림과SVG는정사각형/라벨검증만사용함.',studentProblemsSha256=sha(data)),status='solved')
assert isinstance(proof['answer'],str) and len(proof['answer'])==1 and proof['answer'] in '①②③④⑤'
assert isinstance(proof['solution'],str)
(b/'solve').mkdir(exist_ok=True)
for path,obj in [(b/'solve/q16.json',proof),(b/'own-q16-calculations.json',calc)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('q16 raw SHA256:',sha((b/'solve/q16.json').read_bytes()))
print('Exact printed-algebra,5feasiblepairs,5choices,prime/positiveinteger/units/uniqueness checks passed;SVG only verified shapes/labels.')
