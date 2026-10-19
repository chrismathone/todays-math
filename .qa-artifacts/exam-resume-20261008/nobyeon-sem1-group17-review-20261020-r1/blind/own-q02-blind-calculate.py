from pathlib import Path
from fractions import Fraction as F
import hashlib,json
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group17-review-20261020-r1/blind');h=lambda b:hashlib.sha256(b).hexdigest()
probe='q02 독립 풀이 UTF-8 검사: 양수 제곱근·두 등식 검산'
with (p/'own-q02-blind-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as f:f.write(probe+'\n')
assert (p/'own-q02-blind-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
inputBytes=(p/'student-problems.json').read_bytes();data=json.loads(inputBytes.decode('utf-8-sig'))[0];manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert h(inputBytes)==manifest['studentProblemsSha256']
student={k:v for k,v in data.items() if k!='studentDigest'};assert h(json.dumps(student,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==data['studentDigest']
assert r'\sqrt{2a}=6\sqrt3' in data['content'];assert r'\frac{\sqrt a}{2}=\sqrt{\frac b8}' in data['content']
secondRightSquare=F(6)**2*3;a=secondRightSquare/2
# Principal-root identities: each positive displayed side squared gives a rational expression.
firstLeftSquare=a/F(2)**2;b=firstLeftSquare*8
assert a==54 and b==108 and a>0 and b>0
assert 2*a==secondRightSquare==108
assert firstLeftSquare==b/8==F(27,2)
assert F(3,2)**2*6==firstLeftSquare # first common positive value3sqrt6/2
choices=[]
for mark,text in zip('①②③④⑤',data['choices']):
 candidate=F(text.strip('$'));assert candidate>0
 lhsSquared=a/4;rhsSquared=candidate/8
 inferredAFromFirst=candidate/2
 choices.append({'mark':mark,'candidateB':str(candidate),'domainPositive':True,'leftSquareAtFixedA54':str(lhsSquared),'rightSquare':str(rhsSquared),'firstEquationWithA54':lhsSquared==rhsSquared,'aImpliedByFirst':str(inferredAFromFirst),'secondSquareIfFirstIsMet':str(2*inferredAFromFirst),'secondRequiredSquare':str(secondRightSquare),'bothEquations':lhsSquared==rhsSquared and 2*a==secondRightSquare})
assert [x['mark'] for x in choices if x['bothEquations']]==['④'];assert len(set(x['candidateB'] for x in choices))==5
calc={'inputHashes':{name:h((p/name).read_bytes()) for name in ['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json']},'studentDigestRecomputed':data['studentDigest'],'oracle':'Own Fraction exact squares and principal-positive-root identities; no floating/pixel/author facts','derivedA':str(a),'derivedB':str(b),'secondEquation':{'rightSquare':str(secondRightSquare),'leftRadicand2a':str(2*a),'bothSidesPositive':True,'actualPositiveValue':'6sqrt3'},'firstEquation':{'leftSquareAover4':str(firstLeftSquare),'rightRadicandBover8':str(b/8),'bothSidesPositive':True,'actualCommonPositiveValue':'3sqrt6/2'},'allFiveOptions':choices,'domain':{'aPositive':True,'bPositive':True,'radicands':{'a':str(a),'b/8':str(b/8),'2a':str(2*a),'3':'3'},'allRadicandsPositive':True,'denominators':[2,8],'denominatorsNonzero':True,'rootSigns':'principal positive roots; no arbitrary +/- branch','units':'abstract scalar; no physical units or geometry'},'existenceUniqueness':'Second equality fixes2a=(6sqrt3)^2=108, so a54 uniquely. First equality fixesa/4=b/8 and b108 uniquely. Original sides are positive, so equality of their exact squares verifies both original equalities and introduces no extraneous sign branch. The pair(54,108) actually satisfies both, and only option4 gives b108.','studentMethod':'Square-root definition (sqrt t)^2=t for positive t, rational division and simple linear numerical relations. Not a general high-school radical-equation algorithm or quadratic formula.','utf8WriteReadPassed':True,'authorAnswerExposure':False,'newApprovalCounts':0}
with (p/'own-q02-blind-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(calc,f,ensure_ascii=False,indent=2);f.write('\n')
solution='a,b가 양수이므로 √a,√(b/8),√(2a)는 모두 양수이며, 분모2와8도0이 아니다. 둘째 등식 √(2a)=6√3에서 제곱근의 성질을 쓰면 2a=(6√3)²=36×3=108이다. 따라서 a=54이다.\n\n첫째 등식에서 (√a/2)²=a/4이고 (√(b/8))²=b/8이므로 a/4=b/8이다. 양변에8을 곱하면 b=2a=108이다. 이는 제곱근의 제곱을 원래 수로 바꾸고 수치 관계를 정리한 것이며, 새로운 부호의 해를 임의로 추가한 것이 아니다.\n\n원래 식도 검산한다. a=54,b=108이면 첫째 식의 왼쪽은 √54/2=3√6/2이다. 오른쪽은 √(108/8)=√(27/2)이고 (3√6/2)²=27/2,3√6/2>0이므로 역시3√6/2이다. 둘째 식은 √108=6√3이므로 성립한다. a=54,b=108은 양수이고 모든 피제곱수도 양수여서 해가 실제로 존재한다. 둘째 식이a를 하나로 정하고 첫째 식이b를 하나로 정하므로 이 해는 유일하다.\n\n다섯 보기를 a=54에서 각각 확인하면 첫째 식 왼쪽의 제곱은 항상27/2이고, 오른쪽의 제곱 b/8은 ①27/8,②27/4,③9,④27/2,⑤27이다. 양쪽이 모두 양수이므로 제곱값이 같은④만 원래 첫째 식을 만족한다. 둘째 식도 위에서 확인했으므로 정답은④ 하나뿐이다. 길이 등 물리 단위나 도형 조건은 없다.'
raw={'studentDigest':data['studentDigest'],'solverId':'independent-helper-q02-blind-20261020-r1','answer':'④','solution':solution,'evidence':{'noAuthorAnswerExposureDeclaration':'새 current q02의 정확한 문항이나 저자 답·해설을 본 적이 없다고 학생 파일을 읽기 전에 선언했다. 지정된 학생용 brief/manifest/student-problems만 읽었고 부모·private·원문q02·저자계산/해설·verification·다른문항·답검색에 노출되지 않고 독립적으로 풀었다.','ownCalculationsFile':'../own-q02-blind-calculations.json','a':'54','b':'108','allFiveChoicesChecked':True,'bothOriginalEquationsVerified':True,'domainAndPositiveSignsChecked':True,'existenceAndUniquenessChecked':True,'studentMethod':'제곱근 성질과 유리수 계산으로 두 수치관계를 순서대로 정리하고 원래 양변의 양수성을 유지해 검산. 고등 무리방정식/이차방정식 공식 불필요. blind raw는 정식 math/grade 승인 집계가 아니다.','utf8WriteReadPassed':True,'noFloatingPixelsOrAuthorOracle':True,'newApprovalCounts':0},'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
with (p/'solve/q02.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
assert raw['answer']=='④' and isinstance(raw['solution'],str);assert (p/'student-problems.json').read_bytes()==inputBytes
print('Exact values, both original equations, positive domains, all5options and uniqueness verified')
print('raw SHA256 '+h((p/'solve/q02.json').read_bytes()))
