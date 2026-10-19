import json, hashlib
from fractions import Fraction as F
from pathlib import Path
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group13-review-20261020-r1/blind')
probe='독립 풀이 UTF-8 검사: 제곱근과 대소 관계'
f=p/'own-q03-blind-utf8-probe.txt'
with f.open('x',encoding='utf-8',newline='\n') as out: out.write(probe+'\n')
assert f.read_text(encoding='utf-8')==probe+'\n'
s=p/'student-problems.json'; data=json.loads(s.read_text(encoding='utf-8-sig'))[0]
manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'))
assert hashlib.sha256(s.read_bytes()).hexdigest()==manifest['studentProblemsSha256']
bounds={2:(F(141,100),F(142,100)),3:(F(173,100),F(174,100)),7:(F(264,100),F(265,100))}
for n,(lo,hi) in bounds.items(): assert lo*lo<n<hi*hi
# Exact formal coefficients ordered (sqrt(7), sqrt(2), constant).
maximum=(1,0,-1); required_range=(2,-1,-1)
x=tuple(a-b for a,b in zip(maximum,required_range))
options=[(1,-1,0),(-1,1,0),(0,1,-1),(-1,1,1),(-1,0,2)]
def interval(v):
 lo=hi=F(v[2])
 for c,n in zip(v[:2],[7,2]):
  a,b=bounds[n]; lo+=c*(a if c>=0 else b); hi+=c*(b if c>=0 else a)
 return lo,hi
option_intervals=[interval(v) for v in options]
assert x==options[1] and sum(v==x for v in options)==1
# All five options distinct, certified by disjoint exact rational intervals.
for i in range(5):
 for j in range(i):
  a,b=option_intervals[i]; c,d=option_intervals[j]
  assert b<c or d<a
remaining=[(bounds[7][0]-1,bounds[7][1]-1),(bounds[3][0]-bounds[2][1],bounds[3][1]-bounds[2][0]),(F(1),F(1)),(2-bounds[7][1],2-bounds[7][0])]
assert remaining[0][0]>max(t[1] for t in remaining[1:])
assert remaining[3][1]<min(t[0] for t in remaining[:3])
assert option_intervals[1][1]<remaining[3][0]
assert interval(required_range)[0]>0
calc={'arithmetic':'exact Fraction bounds and formal radical coefficients; no floating point or pixels','rootBounds':{str(n):[str(a),str(b)] for n,(a,b) in bounds.items()},'allBoundsVerifiedBySquaring':True,'coefficientOrder':['sqrt7','sqrt2','constant'],'maximum':maximum,'requiredRange':required_range,'uniqueMissing':x,'choices':[{'mark':chr(9312+i),'coefficients':v,'strictBounds':[str(a),str(b)],'matches':v==x} for i,(v,(a,b)) in enumerate(zip(options,option_intervals))],'remainingStrictBounds':[[str(a),str(b)] for a,b in remaining],'maximumCertified':True,'missingStrictlyBelowEveryRemaining':True,'rangePositive':True,'choiceIntervalsPairwiseDisjoint':True,'utf8WriteReadPassed':True,'studentProblemsSha256':hashlib.sha256(s.read_bytes()).hexdigest(),'noAuthorAnswerExposure':True}
with (p/'own-q03-blind-calculations.json').open('x',encoding='utf-8',newline='\n') as f: json.dump(calc,f,ensure_ascii=False,indent=2); f.write('\n')
solution='지워진 수를 x라 하자. 지워진 수는 가장 작은 수이므로 가장 큰 수는 남은 네 수 중에 있다. 2<√7<3이므로 √7−1>1이고 2−√7<0이다. 또 0<√3−√2<1이다. 마지막 부등식은 √3<√2+1에서 알 수 있는데, 두 양수의 제곱을 비교하면 3<3+2√2이다. 따라서 가장 큰 수는 √7−1이다. 주어진 조건에서 (√7−1)−x=2√7−√2−1이므로 x=√2−√7이다. 이 수는 2−√7보다 작다(√2<2). 나머지 세 수는 모두 양수이고 2−√7은 음수이므로 x는 실제로 유일한 최솟값이다. 따라서 조건을 만족하는 다섯 실수가 존재하며, 최댓값과 범위가 정해져 있으므로 지워진 수도 유일하다. 보기 ①은 양수, ③은 양수, ④는 x+1, ⑤는 x+(2−√2)이므로 모두 x와 다르다. ②만 x와 같다. 모든 제곱근은 양수인 실수의 주값이며, 분모나 길이 단위 조건은 없다. 범위는 양수이다. 정답은 ②이다.'
raw={'studentDigest':data['studentDigest'],'solverId':'independent-q03-blind-helper-20261020-r1','answer':'②','solution':solution,'evidence':{'noAuthorAnswerExposureDeclaration':'이 q03의 정확한 문항과 정답을 사전에 본 적이 없으며, 지정된 학생용 세 파일만 읽고 저자 답·해설·원문·비공개 계산에 노출되기 전에 독립적으로 풀었다.','calculationsFile':'../own-q03-blind-calculations.json','missingValue':'sqrt(2)-sqrt(7)','method':'2015 중3: 양수의 제곱 비교, 제곱근 대소 관계, 동류항 정리와 일차방정식','domain':'모든 수는 실수; 제곱근의 피제곱수 2,3,7은 양수; 분모 없음','existenceAndUniqueness':'계산한 x가 남은 네 수보다 엄격히 작고 요구 범위를 만족함; 고정된 최댓값에서 고정된 범위를 빼므로 유일','allFiveChoicesChecked':True,'exactOwnCode':True,'noPixelsAsOracle':True},'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
with (p/'solve/q03.json').open('x',encoding='utf-8',newline='\n') as f: json.dump(raw,f,ensure_ascii=False,indent=2); f.write('\n')
assert isinstance(raw['answer'],str) and isinstance(raw['solution'],str) and raw['answer'] in '①②③④⑤'
print('UTF-8 probe passed; exact bounds, all five options, existence and uniqueness passed')
print('raw SHA256',hashlib.sha256((p/'solve/q03.json').read_bytes()).hexdigest())
