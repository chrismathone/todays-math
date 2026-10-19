from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,hashlib
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q13-clean-blind-20261019-r1')
data=(b/'student-problems.json').read_bytes();m=json.loads((b/'blind-manifest.json').read_text(encoding='utf-8'))
assert hashlib.sha256(data).hexdigest()==m['studentProblemsSha256']
p=json.loads(data)[0]
# Exact canonical sum: dictionary radicand -> Fraction coefficient, with sqrt(1)=1.
def normalize(n):
 assert isinstance(n,int) and n>0
 for d in range(isqrt(n),0,-1):
  if n%(d*d)==0:return d,n//(d*d)
def tidy(a):return {n:F(c) for n,c in a.items() if c!=0}
def add(a,c):
 out=dict(a)
 for n,v in c.items():out[n]=out.get(n,F(0))+v
 return tidy(out)
def mul(a,c):
 out={}
 for n,x in a.items():
  for r,y in c.items():
   factor,inner=normalize(n*r)
   out[inner]=out.get(inner,F(0))+x*y*factor
 return tidy(out)
def sub(a,c):return add(a,{n:-v for n,v in c.items()})
def show(a):return {str(n):str(c) for n,c in sorted(a.items())}
records=[
 ('가',{2:F(3),1:F(-1)},{2:F(3),1:F(-1)},{1:F(19),2:F(-6)}),
 ('나',{6:F(1),10:F(1)},{6:F(1),10:F(1)},{1:F(16),15:F(2)}),
 ('다',{11:F(1),1:F(3)},{11:F(1),1:F(-3)},{1:F(2)}),
 ('라',{7:F(1),1:F(2)},{7:F(1),1:F(-4)},{1:F(-1),7:F(2)}),
 ('마',{3:F(4),5:F(1)},{3:F(1),5:F(-2)},{1:F(2),15:F(-7)})
]
rows=[];wrong=[]
for label,left,right,stated in records:
 actual=mul(left,right);residual=sub(actual,stated);valid=not residual
 if not valid:wrong.append(label)
 rows.append(dict(label=label,leftFactor=show(left),rightFactor=show(right),computed=show(actual),stated=show(stated),residual=show(residual),recordCorrect=valid))
assert wrong==['나','라']
assert mul(records[1][1],records[1][2])=={1:F(16),15:F(4)}
assert mul(records[3][1],records[3][2])=={1:F(-1),7:F(-2)}
options=[['가','나'],['가','다'],['나','라'],['다','마'],['라','마']]
assert p['choices']==['가, 나','가, 다','나, 라','다, 마','라, 마']
choices=[dict(mark=chr(0x2460+i),records=option,exactWrongPair=set(option)==set(wrong),wrongRecordsIncluded=[x for x in option if x in wrong],correctRecordsIncorrectlyIncluded=[x for x in option if x not in wrong]) for i,option in enumerate(options)]
assert sum(c['exactWrongPair'] for c in choices)==1 and choices[2]['exactWrongPair']
calc=dict(representation='sum(coefficient[n]*sqrt(n)); positive squarefree n, rational coefficients; key1 is rational part',records=rows,wrongRecords=wrong,choices=choices,exactErrors=dict(나='actual-stated=2√15>0',라='actual-stated=-4√7<0'),domain='피제곱수2,6,10,11,7,3,5는모두양수라모든근호가정의된다. 분모나변수가없어추가제외조건은없다. 단위와도형조건도없다.',signChecks=['(√7+2)>0,(√7-4)<0:7<16이므로(라)의실제곱은음수이다.','(4√3+√5)>0,(√3-2√5)<0:3<20이므로(마)의실제곱은음수이다.','제곱인(가),(나)는0이상이면서실제로양수이고,(다)=11-9=2>0이다.'],uniqueness='다섯기록을모두계산한결과잘못된기록은나와라정확히두개이다. 다섯보기중이집합과일치하는것은③하나뿐이므로선택답이존재하고유일하다.')
solution='곱셈 공식과 분배법칙으로 왼쪽을 각각 계산한다. (가)는 (3√2-1)²=(3√2)²-2×3√2×1+1²=18-6√2+1=19-6√2이므로 맞다. (나)는 (√6+√10)²=6+2√60+10=16+4√15이다. √60=2√15이므로 교차항은 4√15이며, 기록의 2√15는 틀렸다. (다)는 합과 차의 곱이므로 (√11+3)(√11-3)=11-9=2로 맞다. (라)는 (√7+2)(√7-4)=7-4√7+2√7-8=-1-2√7이다. 따라서 기록의 +2√7는 부호가 틀렸다. (마)는 (4√3+√5)(√3-2√5)=12-8√15+√15-10=2-7√15이므로 맞다. 잘못된 기록은 (나), (라) 정확히 두 개이므로 ③이다. 보기 ① 가·나는 맞는 기록 가를 포함하고 라를 빠뜨리며, ② 가·다는 모두 맞는 기록이다. ④ 다·마도 모두 맞는 기록이고, ⑤ 라·마는 맞는 기록 마를 포함하고 나를 빠뜨리므로 모두 답이 아니다. 각 피제곱수는 양수이므로 모든 식이 실수에서 정의되고 분모나 미지수의 제한은 없다. 특히 √7<4이므로 (라)의 실제 곱은 음수이며 -1-2√7와 부호가 일치한다. 다섯 기록과 다섯 보기를 모두 확인했으므로 답은 유일하고 단위는 없다.'
proof=dict(studentDigest=p['studentDigest'],solverId='fresh-independent-codex-q13-20261019-r1',answer='③',solution=solution,evidence=dict(calculations=calc,method='2015 중3 곱셈 공식 (A±B)²,A²-B² 및 분배법칙·근호 곱셈·제곱인수 꺼내기',priorExposure='정확한 새q13 문항/정답을 읽기 전 본 적 없음. 지정된 네 파일만 읽고 독립 계산함. 이전 family 답·원문·저자·기존 proof를 oracle로 사용하지 않음.',printedCheck='q13.png에서 다섯 기록의 인수·제곱·우변 계수와 부호 및 다섯 조합 보기를 직접 대조했다. 픽셀 측정은 하지 않음.',studentProblemsSha256=hashlib.sha256(data).hexdigest()),status='solved')
assert isinstance(proof['answer'],str) and len(proof['answer'])==1 and proof['answer'] in '①②③④⑤'
assert isinstance(proof['solution'],str)
(b/'solve').mkdir(exist_ok=True)
for path,obj in [(b/'solve/q13.json',proof),(b/'own-q13-calculations.json',calc)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print('q13 raw SHA256:',hashlib.sha256((b/'solve/q13.json').read_bytes()).hexdigest())
print('All5records and all5choices exactly checked; nonzero error residues and unique choice confirmed.')
