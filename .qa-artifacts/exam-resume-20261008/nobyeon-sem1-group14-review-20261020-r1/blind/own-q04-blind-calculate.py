from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,re,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group14-review-20261020-r1/blind')
h=lambda b:hashlib.sha256(b).hexdigest()
probe='q04 독립 풀이 UTF-8 검사: 양의 제곱근과 유리수 조건'
with (p/'own-q04-blind-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as f:f.write(probe+'\n')
assert (p/'own-q04-blind-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
rawInput=(p/'student-problems.json').read_bytes();data=json.loads(rawInput.decode('utf-8-sig'))[0];manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert h(rawInput)==manifest['studentProblemsSha256']
student={k:v for k,v in data.items() if k!='studentDigest'};assert h(json.dumps(student,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==data['studentDigest']
# Exact elementary square-factor extraction using integer arithmetic only.
def root(n):
 assert isinstance(n,int) and n>=0
 for outside in range(isqrt(n),0,-1):
  if n%(outside*outside)==0:return outside,n//(outside*outside)
 return 0,1

def radical_difference(text):
 roots=re.findall(r'\\sqrt(?:\{(\d+)\}|(\d))',text);assert len(roots)==2
 ns=[int(a or b) for a,b in roots];normalized={};factors=[]
 for sign,n in zip([1,-1],ns):
  outside,inside=root(n);assert outside*outside*inside==n
  normalized[inside]=normalized.get(inside,0)+sign*outside;factors.append({'radicand':n,'outside':outside,'inside':inside})
 return {k:v for k,v in normalized.items() if v},factors
lhs,factor48=radical_difference(r'\sqrt{48}-\sqrt3');assert lhs=={3:3}
a=F(lhs[3]);b=F(16)-a*a;assert a==3 and b==7 and b>0
assert a*a+b==16 and root(48)==(4,3)
choices=[]
for i,text in enumerate(data['choices']):
 normalized,factors=radical_difference(text);assert len(normalized)==1
 n,coefficient=next(iter(normalized.items()));assert coefficient>0
 squared=coefficient*coefficient*n;matches=squared==b
 choices.append({'mark':'①②③④⑤'[i],'printed':text,'factorizations':factors,'normalizedRadicalCoefficients':{str(k):v for k,v in normalized.items()},'positive':True,'exactSquare':squared,'equalsPositiveSqrtB':matches})
assert [x['mark'] for x in choices if x['equalsPositiveSqrtB']]==['①']
assert len({x['exactSquare'] for x in choices})==5
radicands=sorted({int(a or b) for text in [data['content'],*data['choices']] for a,b in re.findall(r'\\sqrt(?:\{(\d+)\}|(\d))',text)})
assert all(n>0 for n in radicands)
calc={'method':'Own integer square-factor extraction and Fraction arithmetic; no float, pixels, author answers or advanced student theorem','inputHashes':{name:h((p/name).read_bytes()) for name in ['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json']},'studentDigestIndependentlyRecomputed':data['studentDigest'],'firstCondition':{'factorizations':factor48,'lhs':{'sqrt3Coefficient':3},'sqrt3PositiveNonzero':True,'a':str(a),'whyUnique':'3sqrt3=a sqrt3; divide by positive nonzero sqrt3, so a=3, no coefficient-comparison theorem required'},'secondCondition':{'aSquared':str(a*a),'b':str(b),'bPositive':True,'rationalAandB':True,'positiveRootRequested':'sqrt7','whyUnique':'first condition fixes a; b=16-a^2 fixes b, not a new arbitrary choice of sign'},'allChoices':choices,'rootDomains':{'allPrintedNumericRadicands':radicands,'allPositive':True,'variableRadicandB':str(b),'principalRoots':True},'existence':{'substitutionFirst':'sqrt48-sqrt3=4sqrt3-sqrt3=3sqrt3','substitutionSecond':'3^2+7=16','bGreaterThanZero':True},'units':'abstract scalar; no length or physical units','figures':[],'utf8WriteReadPassed':True,'authorAnswerExposure':False,'newApprovalCounts':0}
with (p/'own-q04-blind-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(calc,f,ensure_ascii=False,indent=2);f.write('\n')
solution='√48=√(16×3)=4√3이므로 첫 조건은 3√3=a√3이다. √3>0이어서 양변을 0이 아닌 √3으로 나누면 a=3으로 유일하게 정해진다. 둘째 조건에 대입하면 3²+b=16이므로 b=7이다. a=3과 b=7은 모두 유리수이고 b>0을 만족한다. 또한 두 원래 조건에 대입하면 각각 3√3=3√3, 9+7=16이 되어 해가 실제로 존재한다. 첫 조건이 a를, 둘째 조건이 b를 각각 하나로 정하므로 해 (a,b)=(3,7)은 유일하며, 구하는 양의 제곱근은 √b=√7이다.\n\n보기 ①: √28−√7=2√7−√7=√7.\n보기 ②: √48−√12=4√3−2√3=2√3.\n보기 ③: √52−√13=2√13−√13=√13.\n보기 ④: √100−√25=10−5=5.\n보기 ⑤: √12−√3=2√3−√3=√3.\n다섯 보기의 값은 모두 양수이며 제곱하면 차례로 7,12,13,25,3이다. 따라서 √7과 같은 것은 ① 하나뿐이다. 모든 인쇄된 수치 피제곱수는 양수이고, 변수 피제곱수도 b=7>0이므로 모든 제곱근이 실수로 정의된다. 주제곱근의 양수 부호를 사용했으며 물리 단위나 도형 조건은 없다.'
proof={'studentDigest':data['studentDigest'],'solverId':'independent-helper-q04-blind-20261020-r1','answer':'①','solution':solution,'evidence':{'noAuthorAnswerExposureDeclaration':'새 q04의 정확한 문항이나 정답을 사전에 본 적이 없다고 학생 파일을 읽기 전에 선언했다. 허용된 학생용 세 파일만 읽었으며 부모·저자·private·원문q04·다른 문항·저자 계산이나 정답 검색에 노출되지 않고 독립적으로 풀었다.','ownCalculationsFile':'../own-q04-blind-calculations.json','a':'3','b':'7','requestedValue':'sqrt7','allFiveChoicesChecked':True,'existenceAndUniquenessChecked':True,'allRootDomainsChecked':True,'studentMethod':'2015 중3 제곱근의 성질·근호항 계산과 이전의 일차방정식 대입. 고등 계수비교법이나 함수정리 불필요. blind 단계는 정식 학년/수학 승인 집계가 아니다.','utf8WriteReadPassed':True,'noPixelsOrAuthorOracle':True,'newApprovalCounts':0},'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
with (p/'solve/q04.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(proof,f,ensure_ascii=False,indent=2);f.write('\n')
assert isinstance(proof['answer'],str) and proof['answer']=='①' and isinstance(proof['solution'],str)
assert (p/'student-problems.json').read_bytes()==rawInput
print('UTF-8, exact a/b, all5choices, root domains and existence/uniqueness verified')
print('raw SHA256 '+h((p/'solve/q04.json').read_bytes()))
