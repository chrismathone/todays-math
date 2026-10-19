from pathlib import Path
from fractions import Fraction as F
from collections import Counter
import json,hashlib,math,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group2-review-20261020-r2/blind');h=lambda b:hashlib.sha256(b).hexdigest();items=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))
exposure={'currentAuthoredAnswersOrSolutionsExposed':False,'priorExposure':'이전 노변 1학기 여러 문항·메타데이터와 관련 대수/기하/엔진 검토 이력이 있다. 다른 시험의 관련 원·접선·피타고라스 문제도 보았다. 이번 노변2학기 current group2-r2의 저자 답·해설·패키지·원본은 읽지 않았다. 과거 전체 원본 코퍼스의 완전 미노출을 주장하지 않는다.','basis':'이번 학생 발문·표·선택지와 학생SVG만 사용. 원문답/코드/비공개 자료 검색 없음.','pixelOrSvgCoordinateOracle':False}
# q09: exact integer squares; 30-60-90 relationship derived by bisecting equilateral triangle.
pr=F(12);rh=pr/2;ph2=pr*pr-rh*rh;pq2=9*21;qh2=pq2-ph2
assert (rh,ph2,pq2,qh2)==(6,108,189,81);qh=F(math.isqrt(qh2.numerator));assert qh*qh==qh2
qr=rh+qh;assert qr==15 and rh>0 and qh>0
choice09=[F(n) for n in (13,14,15,16,17)];flags09=[x==qr for x in choice09];assert flags09==[False,False,True,False,False]
# q10 in exact Q(sqrt3), tuple (a,b) for a+b*sqrt3. No floating oracle.
pr10=(F(0),F(9));qr10=(F(9),F(0));target10=(F(-9),F(9))
choices10=[(F(-3),F(3)),(F(9),F(0)),(F(-9),F(9)),(F(0),F(9)),(F(9),F(9))]
flags10=[x==target10 for x in choices10];assert flags10==[False,False,True,False,False]
assert 1**2<3<2**2 # sqrt3>1 implies P,Q,R order and PQ>0.
assert 3*(9**2)==243 # QR9, RT9sqrt3: RT²=3QR² (30-60-90).
# q11 full records and every proposed correction.
data=[1,5,5,7,7,11];n=len(data);mean=F(sum(data),n);deviations=[F(x)-mean for x in data];squares=[x*x for x in deviations];median=F(data[2]+data[3],2);count=Counter(data);modes=sorted(x for x,c in count.items() if c==max(count.values()));variance=sum(squares)/n;farthest=[x for x in sorted(count) if abs(F(x)-mean)==max(abs(d) for d in deviations)]
assert mean==6 and median==6 and modes==[5,7] and sum(deviations)==0 and variance==9 and farthest==[1,11]
flags11=[median==5,modes==[6],sum(deviations)==36,variance==9,farthest==[5,7]];assert flags11==[False,False,False,True,False]
solutions={9:'H가 QR의 내부에 있으므로 RH와 HQ는 양수이고 QR=RH+HQ이다. 직각삼각형 PRH에서 ∠PRH=60°, 빗변 PR=12 cm이다. 정삼각형을 반으로 나눈 30°·60°·90° 삼각형의 변의 관계로 RH=6 cm이고, 피타고라스 정리에 따라 PH²=12²−6²=108이다. 다시 직각삼각형 PQH에서 QH²=(3√21)²−108=189−108=81이다. 길이는 양수이므로 QH=9 cm이다. 따라서 QR=6+9=15 cm이고 정답은③이다. 보기13,14,16,17 cm는 이 값과 다르다.',10:'직각삼각형 PRT에서 ∠TPR=45°이므로 이등변직각삼각형이고 PR=RT=9√3 m이다. 직각삼각형 QRT에서 ∠TQR=60°이므로 정삼각형을 반으로 나눈 변의 관계로 RT=√3·QR이다. 따라서 QR=9 m이다. P,Q,R이 이 순서이므로 PQ=PR−QR=9√3−9=9(√3−1) m이다. √3>1이므로 길이가 양수이고 점의 순서도 맞는다. 다섯 보기 중 이 식과 같은 것은③뿐이다. 이 특별한 직각삼각형의 변 관계는 정삼각형의 높이와 피타고라스로 설명되며 임의의 삼각함수 항등식이나 코사인법칙은 필요 없다.',11:'자료는 이미 크기순으로 나열되어 있다. 자료가6개이므로 중앙값은 세 번째와 네 번째 값의 평균인(5+7)/2=6이다. 5와7이 각각 두 번씩 나타나므로 최빈값은5,7이다. 평균6에 대한 편차는−5,−1,−1,1,1,5이고 총합은0이다. 편차 제곱은25,1,1,1,1,25이며 그 합은54이므로 분산은54/6=9이다. 평균에서의 거리는5,1,1,1,1,5이므로 가장 먼 변량은1,11이다. 따라서 ㄱ,ㄴ,ㄷ,ㅁ은 옳고 ㄹ의 분산3만9로 고쳐야 한다. 정답은④이다. 나머지 수정 보기들은 이미 옳은 기록을 틀리게 바꾼다.'}
calcs={9:{'PR':12,'RH':6,'PHsquared':108,'PQsquared':189,'QHsquared':81,'QH':9,'QR':15,'unit':'cm','existence':'자체 존재 예 R=(0,0),H=(6,0),Q=(15,0),P=(6,6√3). PR²144,PQ²189, ∠PRH60°,0<6<15. 좌표는 존재 증명용으로 새로 구성했고 SVG 좌표에서 얻지 않았다.','uniqueness':'H 내부로 Q가H의R 반대쪽에 있어 QR은 차가 아닌합이다. RH6과 양의QH9가 강제된다. 반사된 삼각형도 목표15는 동일.','allChoiceChecks':dict(zip('①②③④⑤',flags09))},10:{'PRexact':'9√3','QR':9,'PQexact':'9√3−9','unit':'m','choiceRingRepresentation':'각 a+b√3를 정수/유리수 쌍으로 비교. √3의 무리성으로 서로 다른 쌍은 같은 값이 아니다.','allChoicePairs':[[str(a),str(b)] for a,b in choices10],'allChoiceChecks':dict(zip('①②③④⑤',flags10)),'existence':'자체 구성 R=(0,0),P=(−9√3,0),Q=(−9,0),T=(0,9√3)로 높이와 두 각이 충족된다.1<√3<2이므로P<Q<R. 관측점 눈높이 보정 같은 미제공 조건은 도입하지 않는다.','uniqueness':'주어진 높이에 대해45°와60° 직각삼각형의 밑변이 각각 유일하고 P,Q,R 순서로 차가 정해진다.'},11:{'data':data,'sum':sum(data),'count':n,'mean':str(mean),'median':str(median),'frequencies':dict(count),'modes':modes,'deviations':[str(x) for x in deviations],'deviationSum':str(sum(deviations)),'squaredDeviations':[str(x) for x in squares],'squareSum':str(sum(squares)),'variance':str(variance),'farthest':farthest,'recordTruth':{'ㄱ':True,'ㄴ':True,'ㄷ':True,'ㄹ':False,'ㅁ':True},'allChoiceChecks':dict(zip('①②③④⑤',flags11)),'domainExistenceUniqueness':'실제6개 유한 자료이고 분산 정의의 분모6은0이 아니다. 표의 잘못된 기록은 ㄹ 하나이며 보기④만 이를 실제 참인 값9로 고친다. 표준편차3과 분산9를 혼동하지 않는다. 변량 단위는 제시되지 않았으므로 임의 cm/m나 측정 단위를 붙이지 않는다.'}}
methods={9:'수선·직각삼각형30°60°90° 관계·피타고라스·양의 제곱근 및 선분합',10:'45° 이등변직각삼각형 및30°60°90° 관계·제곱근 계산·같은 직선 위 선분차',11:'평균·짝수개 중앙값·복수 최빈값·편차의 합·분산 정의·평균에서의 거리'}
rows=[]
for it in items:
 q=it['questionNumber'];assert len(it['choices'])==5
 digest=h(json.dumps({k:v for k,v in it.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode());assert digest==it['studentDigest']
 figs=[]
 for fig in it['figures']:
  actual=h((p/fig['svgPath']).read_bytes());assert actual==fig['sha256'];figs.append(actual)
 surfaces={
 'stem':{'status':'student-method-proposed-in-scope','basis':methods[q]+'으로 현재 모든 조건을 사용한다. 고등 코사인법칙/임의 삼각함수 항등식을 전제로 하지 않는다.' if q!=11 else '주어진6개 자료와 평균6에 대한 대표값·산포 기록을 직접 정의로 평가한다. 자료 밖의 추정·확률 모델은 요구되지 않는다.'},
 'choices':{'status':'all-five-independently-checked','basis':'각 보기를 정확히 검산했고 '+('③ 하나만 목표값과 일치한다.' if q in (9,10) else '④만 틀린 분산 기록을 참인9로 수정한다. 다른4개는 옳은 기록을 거짓으로 바꾼다.')},
 'figuresAndTables':{'status':'student-view-checked','basis':'학생SVG를 실제 로컬 렌더하여 확인했고 점 순서·수선·표시각이 발문과 대응한다. 치수나 각을 픽셀/SVG 좌표로 계산하지 않았다.' if q!=11 else '실제 학생 Markdown 표5개 행 ㄱ중앙값6,ㄴ최빈값5·7,ㄷ편차합0,ㄹ분산3,ㅁ가장먼1·11을 모두 확인했다. 별도 그림 없음.'},
 'notation':{'status':'proposed-in-scope','basis':'선분 길이·도·제곱근과 '+('cm' if q==9 else 'm')+' 표기는 중학교 기하/실수 범위이다.' if q!=11 else '중앙값·최빈값·편차·분산·변량의 용어와 음의 편차·제곱 연산을 실제 통계 정의대로 사용한다.'},
 'answer':{'status':'independently-solved','basis':'선택 표시만 저장하며 실제 수치·단위·모든 보기 검사는 자체 계산 evidence에 둔다.'},
 'studentSolution':{'status':'own-method-proposed-author-unseen','basis':methods[q]+'. 저자 전체 해설은 아직 미노출이므로 향후 별도 검토 필요.'},
 'prerequisites':{'status':'2015-M3-proposal-primary-certification-pending','basis':('정삼각형을 높이로 반분해30° 직각삼각형의 짧은 변이 빗변의 절반임을 증명하고 피타고라스로 나머지 변을 구할 수 있다. 이전 삼각형 합동/각합·피타고라스·양의 제곱근 이후 배정.' if q==9 else '45° 이등변직각삼각형과 정삼각형 반쪽의60° 직각삼각형 관계를 피타고라스로 정당화할 수 있다. 삼각비를 쓰더라도 특수각의 정의 범위이며 고등 항등식은 불필요.' if q==10 else '2015 중3 대표값·산포의 평균/중앙값/최빈값/편차/분산을 학습한 뒤라는 학생 방법 제안이다. 표본분산 n−1을 사용하지 않는다.')+' 이번 학생 전용 단계에서는 실제 통계/삼각비 학년 배치 primary를 새로 열지 않았으므로 정식7면 승인/2022 적용을 주장하지 않는다.'}}
 raw={'studentDigest':it['studentDigest'],'solverId':'independent-helper-nobyeon-sem2-group2-r2-20261020','answer':'③' if q in (9,10) else '④','solution':solutions[q],'evidence':{'exposure':exposure,'exactCalculations':calcs[q],'figureSha256s':figs,'studentDigestVerified':True,'gradeSurfaceProposals':surfaces,'limits':['정식 수학·학년·출처·권리·family·native 승인 개수 아님','현재 저자 전체 해설·채점기준 미노출; 정식grade는 후속 primary 및 실제 해설 검토 필요','2022 배치 미확인']},'status':'solved'}
 (p/'solve').mkdir(exist_ok=True)
 with (p/f'solve/q{q:02}.json').open('x',encoding='utf-8') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'studentDigest':digest,'rawSha256':h((p/f'solve/q{q:02}.json').read_bytes()),'answer':raw['answer'],'mathStatus':'solved','formalGradeStatus':'pending-review'})
with (p/'own-nobyeon2-blind-results.json').open('x',encoding='utf-8') as f:json.dump({'studentFileSha256':h((p/'student-problems.json').read_bytes()),'exposure':exposure,'exactCalculations':calcs,'results':rows,'UTF8Probe':'passed','viewedStudentSVGs':2},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))

