from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group16-review-20261020-r1/blind');h=lambda b:hashlib.sha256(b).hexdigest()
probe='q07 독립 풀이 UTF-8 검사: 무리수·음수·정수가 아닌 유리수'
with (p/'own-q07-blind-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as f:f.write(probe+'\n')
assert (p/'own-q07-blind-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
inputBytes=(p/'student-problems.json').read_bytes();data=json.loads(inputBytes.decode('utf-8-sig'))[0];manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert h(inputBytes)==manifest['studentProblemsSha256']
student={k:v for k,v in data.items() if k!='studentDigest'};assert h(json.dumps(student,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==data['studentDigest']
# Representation c*sqrt(n)+q with exact rational c,q; n=0 is rational only.
def root(n):
 assert n>=0
 r=isqrt(n)
 if r*r==n:return (0,F(0),F(r))
 for k in range(r,0,-1):
  if n%(k*k)==0:return(n//(k*k),F(k),F(0))
def shift(v,q):return(v[0],v[1],v[2]+q)
def scale(v,c):return(v[0],v[1]*c,v[2]*c)
def rational(q):return(0,F(0),F(q))
def classify(v):
 n,c,q=v
 irr=n!=0 and c!=0
 if not irr:lo=hi=q
 else:
  k=isqrt(n);assert k*k<n<(k+1)*(k+1)
  lo=c*(k if c>0 else k+1)+q;hi=c*(k+1 if c>0 else k)+q
 if not irr:sign='positive' if q>0 else 'negative' if q<0 else 'zero'
 elif lo>=0:sign='positive' # strict lower root bound, equality at lower endpoint still positive
 elif hi<=0:sign='negative'
 else:raise AssertionError(('Need stronger exact bound',v,lo,hi))
 return {'normalForm':{'radicand':n,'coefficient':str(c),'rationalPart':str(q)},'irrational':irr,'rational':not irr,'integer':not irr and q.denominator==1,'nonintegerRational':not irr and q.denominator!=1,'sign':sign,'negative':sign=='negative','exactBound':{'lower':str(lo),'upper':str(hi),'strictWhenIrrational':irr}}
# Values read directly from actual printed nine terms. No author facts or pixel values.
basePrinted=[r'\sqrt2',r'-\sqrt3',r'\sqrt8-2','-3','0',r'\sqrt{16}',r'0.\dot6','-1.25',r'\sqrt{\frac9{16}}']
assert all(s in data['content'] for s in basePrinted)
recurring=F(6,9);assert 9*recurring==6 and recurring==F(2,3)
assert isqrt(9)**2==9 and isqrt(16)**2==16
values=[root(2),scale(root(3),-1),shift(root(8),-2),rational(-3),rational(0),root(16),rational(recurring),rational(F('-1.25')),rational(F(isqrt(9),isqrt(16)))]
rows=[{'ordinal':j+1,'printed':text,**classify(v)} for j,(text,v) in enumerate(zip(basePrinted,values))]
counts=lambda rr:{'irrational':sum(x['irrational'] for x in rr),'negative':sum(x['negative'] for x in rr),'nonintegerRational':sum(x['nonintegerRational'] for x in rr),'integer':sum(x['integer'] for x in rr),'rational':sum(x['rational'] for x in rr),'positive':sum(x['sign']=='positive' for x in rr),'zero':sum(x['sign']=='zero' for x in rr)}
baseCounts=counts(rows);assert baseCounts=={'irrational':3,'negative':3,'nonintegerRational':3,'integer':3,'rational':6,'positive':5,'zero':1}
# Exact decimal square root:0.81=81/100 and principal root9/10.
assert F('0.81')==F(81,100) and F(9,10)**2==F('0.81')
optionValues=[shift(root(25),-5),rational(F(9,10)),scale(root(49),-1),shift(root(5),-1),shift(scale(root(7),-1),2)]
expectedChoices=[r'$\sqrt{25}-5$',r'$\sqrt{0.81}$',r'$-\sqrt{49}$',r'$\sqrt5-1$',r'$2-\sqrt7$'];assert data['choices']==expectedChoices
options=[]
for mark,text,v in zip('①②③④⑤',data['choices'],optionValues):
 r=classify(v);after=counts(rows+[r]);matches=[after['irrational'],after['negative'],after['nonintegerRational']]==[4,4,3]
 options.append({'mark':mark,'printed':text,'classification':r,'tenEntryCounts':after,'meetsAllThreeConditions':matches})
assert [x['mark'] for x in options if x['meetsAllThreeConditions']]==['⑤']
assert [[x['tenEntryCounts'][k] for k in ['irrational','negative','nonintegerRational']] for x in options]==[[3,3,3],[3,3,4],[3,4,3],[4,3,3],[4,4,3]]
final=rows+[options[4]['classification']]
overlap={'baseIrrationalAndNegative':sum(x['irrational'] and x['negative'] for x in rows),'baseNonintegerRationalAndNegative':sum(x['nonintegerRational'] and x['negative'] for x in rows),'finalIrrationalAndNegative':sum(x['irrational'] and x['negative'] for x in final),'finalNonintegerRationalAndNegative':sum(x['nonintegerRational'] and x['negative'] for x in final)}
assert overlap=={'baseIrrationalAndNegative':1,'baseNonintegerRationalAndNegative':1,'finalIrrationalAndNegative':2,'finalNonintegerRationalAndNegative':1}
calc={'method':'Own exact Fraction arithmetic, integer square-factor extraction and strict integer root bounds; no floating/pixel/author oracle','inputHashes':{name:h((p/name).read_bytes()) for name in ['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json']},'studentDigestRecomputed':data['studentDigest'],'baseNine':rows,'baseCounts':baseCounts,'requiredAddedClassification':{'irrational':True,'negative':True,'nonintegerRational':False},'allFiveChoices':options,'overlapCounts':overlap,'irrationalityBasis':'For nonsquare positive integers2,3,5,7 the square roots are irrational (learned M3 property). A nonzero rational multiple plus rational constant remains irrational: otherwise rearrangement would make that square root rational. No theorem on general algebraic numbers is needed.','signBasis':'1<sqrt2<2 makes sqrt8-2=2sqrt2-2>0. 2<sqrt5<3 makes sqrt5-1>0. 2<sqrt7<3 makes2-sqrt7<0. Negative of positive sqrt3 is negative. Bounds justified by integer squaring.','domains':{'positiveRadicands':[2,3,8,16,25,49,5,7],'positiveDecimalRadicand':'81/100','positiveFractionRadicand':'9/16','fractionDenominator16Nonzero':True,'principalRootOf9over16':'3/4','recurringDecimal':'2/3','negativeFiniteDecimal':'-5/4','noPhysicalUnitsOrGeometry':True},'existenceUniqueness':'Choice5 is a negative irrational and yields desired counts4/4/3. It is unique among5options; arbitrary negative irrational x values would also work, so x is not unique globally without restricting to choices. Counts refer to ten listed entries, and the three categories overlap rather than forming a disjoint partition.','utf8WriteReadPassed':True,'authorAnswerExposure':False,'newApprovalCounts':0}
with (p/'own-q07-blind-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(calc,f,ensure_ascii=False,indent=2);f.write('\n')
solution='먼저 아홉 수를 각각 분류한다. √2는 양의 무리수, −√3은 음의 무리수이다. √8−2=2√2−2는 무리수이고 √2>1이므로 양수이다. −3은 음의 정수, 0은 정수이며 양수도 음수도 아니다. √16=4는 양의 정수이다. 순환소수0.666…은 2/3, −1.25는 −5/4, √(9/16)은 양수3/4이므로 이 셋은 정수가 아닌 유리수이고 그중 −5/4만 음수이다.\n\n따라서 원래 무리수는3개, 음수는3개, 정수가 아닌 유리수는3개이다. 추가할 x는 무리수의 수와 음수의 수를 각각1개 늘려야 하므로 음의 무리수여야 한다. 무리수는 유리수가 아니므로 정수가 아닌 유리수의 수는3개 그대로 남는다. −√3은 무리수이면서 음수이고 −5/4는 정수가 아닌 유리수이면서 음수이므로 세 분류의 수를 서로 겹치지 않는 것처럼 더하면 안 된다.\n\n① √25−5=0: 추가 후 무리수3개, 음수3개, 정수가 아닌 유리수3개이므로 틀리다.\n② √0.81=9/10: 추가 후 각각3개,3개,4개이므로 틀리다.\n③ −√49=−7: 추가 후 각각3개,4개,3개이므로 틀리다.\n④ √5−1은 무리수이고 √5>2이므로 양수이다. 추가 후 각각4개,3개,3개이므로 틀리다.\n⑤ 2−√7은 무리수이고 √7>2이므로 음수이다. 추가 후 각각4개,4개,3개가 되어 모든 조건을 만족한다.\n\n√2,√3,√5,√7은 완전제곱수가 아닌 양의 정수의 제곱근이므로 무리수이다. 여기에0아닌 유리수를 곱하거나 유리수를 더해 얻은 위 근호식이 유리수라면 거꾸로 정리하여 원래 제곱근도 유리수가 되므로 무리수임을 확인할 수 있다. 모든 피제곱수는 양수이며 분수9/16의 분모16도0이 아니다. 따라서 모든 식이 실수로 정의되고, ⑤가 실제 조건을 만족하므로 해가 존재하며 다섯 보기 중 정답은⑤ 하나뿐이다. 보기 제한 없이 음의 무리수 전체를 생각하면 다른 x도 가능하므로 임의의 실수 x 자체가 하나로 정해진다는 뜻은 아니다. 단위나 도형 조건은 없다.'
raw={'studentDigest':data['studentDigest'],'solverId':'independent-helper-q07-blind-20261020-r1','answer':'⑤','solution':solution,'evidence':{'noAuthorAnswerExposureDeclaration':'새 authored q07의 정확한 문항이나 정답을 본 적이 없다고 학생 파일 열람 전에 선언했다. 허용된 학생용 brief/manifest/student-problems만 읽고 부모·private·원문q07·저자답/계산·verification·다른문항·답검색에 노출되지 않고 독립적으로 풀었다.','ownCalculationsFile':'../own-q07-blind-calculations.json','allNineBaseValuesAndFiveChoicesChecked':True,'baseCounts':{'irrational':3,'negative':3,'nonintegerRational':3},'choiceTotalCounts':[[3,3,3],[3,3,4],[3,4,3],[4,3,3],[4,4,3]],'overlappingCountsChecked':True,'existenceAndUniqueCorrectOption':True,'globalXUniquenessClaimed':False,'allRootDomainsAndSignsChecked':True,'studentMethod':'2015중3 무리수/유리수·정수 분류와 제곱근 성질,이전 순환소수·유리수 계산·부호만 사용. 일반 대수적 수나 함수 도구 불필요. blind raw는 정식 math/grade 승인 집계가 아니다.','utf8WriteReadPassed':True,'noFloatingPixelsOrAuthorOracle':True,'newApprovalCounts':0},'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
with (p/'solve/q07.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
assert raw['answer']=='⑤' and isinstance(raw['solution'],str);assert (p/'student-problems.json').read_bytes()==inputBytes
print('Exact all9base/all5options, overlaps, signs/domains and unique correct option verified')
print('raw SHA256 '+h((p/'solve/q07.json').read_bytes()))
