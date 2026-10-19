from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group11-review-20261020-r1/blind')
h=lambda b:hashlib.sha256(b).hexdigest()
items=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))
exposure={'currentAuthorAnswerOrSolutionExposedBeforeRaw':False,'priorExposure':'이전 원본 H 2·3쪽을 허용된 범위에서 보았고 관련 원주각·접선·삼각형 문제 및 엔진을 검토했다. 현재 q13–17의 저자 답·해설·패키지는 열지 않았다. 이 다섯 원문 각각을 과거 보았는지에 대한 완전한 부정은 하지 않으며, 원본 전체 미노출 주장도 하지 않는다. 이번에는 학생 발문과 새 SVG만 사용했다.','pixelOrCoordinateOracle':False}
# Pairs (a,b) represent a+b*sqrt(3); exact rational ring operations.
add=lambda x,y:(x[0]+y[0],x[1]+y[1])
mul=lambda x,y:(x[0]*y[0]+3*x[1]*y[1],x[0]*y[1]+x[1]*y[0])
scale=lambda x,k:(x[0]*k,x[1]*k)
r=F(6,2);side=(2*r,2*r);perimeter=scale(side,3)
assert r==3 and perimeter==(18,18)
# q13: separation of adjacent centers along base is side-2sqrt(3)r =2r.
assert add(side,(0,-2*r))==(2*r,0)
# Equilateral height minus upper-center displacement gives third-side clearance.
height=mul(side,(0,F(1,2)));assert add(height,(-3*r,0))==(0,r)
major=F(115)*2;minor=360-major;tangent=180-minor
assert (major,minor,tangent)==(230,130,50) and 0<minor<180 and 0<tangent<180
side15=(0,F(4));squared=mul(side15,side15);assert squared==(48,0)
area15=scale(mul(squared,(0,F(1))),F(1,4));assert area15==(0,12)
# q16 actual SEMICIRCLE: r²/2=12; tangencies give DC=3+x.
r2=F(12)*2;x=4*r2/(4*3)
assert r2==24 and x==8 and (3+x)**2==4*r2+(x-3)**2
# q17 outside triangle, equal tangents yield perimeter=2 PU.
t=F(40,2);po2=t*t+15*15;assert po2==625
# Own rational existence witness, NOT student SVG coordinates: P=(0,0), O=(0,25), r=15.
# U,V=(+-12,16), X,Y=(+-15/2,10), H=(0,10).
assert 12**2+16**2==20**2 and 12**2+(16-25)**2==15**2
assert 12*12+16*(16-25)==0
assert F(15,2)**2+10**2==F(25,2)**2
assert 2*F(25,2)+15==40 and 0<F(25,2)<20
solutions={
13:'See explicit Korean solution assignment below.',
14:'W가 작은 호UV 위에 있으므로 ∠UWV가 보는 호는 큰 호UV이다. 그 호에 대한 중심각은115°×2=230°이므로 작은 호UV의 중심각∠UOV=360°−230°=130°이다. 접점에서 반지름과 접선은 수직이므로 ∠OUS=∠OVS=90°이다. 사각형OUSV의 내각의 합에서 ∠USV=360°−90°−90°−130°=50°이다. 0°<130°<180°이므로 두 접선은 원 밖에서 만나며 답은 유일하다.',
15:'O에서 현BC에 내린 수선의 발을D라 하자. OA는 접선AT에 수직이고 BC∥AT이므로 OA도 BC에 수직이다. 따라서 O와A와D는 한 직선 위에 있고, 현의 수직이등분 성질로 BD=CD이다. 그러므로 AB=AC이다. 또 AT∥BC이므로 ∠ABC=∠BAT=60°이다. 이등변삼각형ABC에서 ∠ACB도60°이므로 ABC는 정삼각형이다. 한 변을a cm라 하면 수선을 내려 피타고라스 정리로 높이는 √3a/2 cm이다. 넓이 √3a²/4=12√3에서 a²=48이다. 길이는 양수이므로 AC=a=4√3 cm이다.',
16:'반지름을r cm라 하면 반원의 넓이 πr²/2=12π이므로 r²=24이다. DC와 반원의 접점을F라 하자. 같은 점에서 그은 두 접선의 길이가 같으므로 DF=DA=3 cm이고 CF=CB이다. BC=x cm라 하면 DC=x+3 cm이다. AD와BC는 모두AB에 수직이고 반원이 있는 같은 쪽에 있다. D에서BC에 수선을 내려 얻는 직각삼각형의 두 직각변은 AB=2r와 |x−3|이고 빗변은DC이다. 피타고라스 정리에 따라 (x+3)²=4r²+(x−3)²이다. 이를 정리하면12x=4r²=96, 따라서 BC=x=8 cm이다. 이 값은 양수이며 위 일차식에서 유일하다.',
17:'PU=PV=t cm, PX=a cm, PY=b cm라 하자. X와Y는 각각 선분PU,PV의 내부에 있으므로 XU=t−a, YV=t−b이다. 같은 점에서 원에 그은 접선 길이는 같으므로 XH=XU=t−a, YH=YV=t−b이다. H는XY의 내부에 있으므로 XY=XH+HY=2t−a−b이다. 따라서 삼각형PXY의 둘레는 a+b+(2t−a−b)=2t=40이므로 PU=t=20 cm이다. OU는접선PU에 수직이고 OU=15 cm이므로 직각삼각형PUO에서 PO²=20²+15²=625이다. 길이는양수이므로 PO=25 cm이다. 이 원은 삼각형PXY의 바깥쪽에 있으므로 내접원 넓이 공식을 사용하지 않는다.'}
# Korean student solution q13; no trigonometry or circle packing formula assumed.
solutions[13]='한 원의 반지름을 r cm라 하면 2πr=6π이므로 r=3이다. QR에 접하는 두 원의 중심을 J,K, 접점을 H,I라 하자. 각 원의 중심은 접하는 두 변이 이루는 각의 이등분선 위에 있으므로 ∠HQJ=30°이고 JH=3이다. 30°·60°·90° 직각삼각형의 변의 관계로 QH=3√3 cm이다. 이 관계는 정삼각형을 반으로 나누고 피타고라스 정리로 구할 수 있다. 마찬가지로 IR=3√3 cm이다. JH와 KI는 QR에 수직이고 길이가 같으므로 JKIH는 직사각형이다. 두 원이 외접하므로 HI=JK=3+3=6 cm이다. 따라서 QR=6+6√3 cm이고 정삼각형의 둘레는18+18√3 cm이다.'
answers={13:'18+18√3 cm',14:'50°',15:'4√3 cm',16:'8 cm',17:'25 cm'}
calcs={13:{'radius':3,'sideExact':[6,6],'perimeterExact':[18,18],'representation':'[a,b] means a+b√3','existence':'한 변6+6√3의 정삼각형의 세 내각 이등분선에 반지름3의 원 중심을 꼭짓점에서6만큼 잡는다. 아래 두 중심의 차는6이고 대칭에 의해 세 중심거리 모두6이다. 각 원은 해당 두 변에 접하고 세 번째 변까지의 여유 높이3√3>0이므로 내부에 있다.','uniqueness':'반지름3과 외접 중심거리6, 두 끝 접선 조각3√3이 한 변을 유일하게 정한다.'},14:{'majorArcCentral':230,'minorArcCentral':130,'tangentAngle':50,'existence':'임의 양의 반지름 원에서 작은 중심각130°의 두 점을 잡으면 접선 교점은 외부에 존재한다. 작은 호 안의 W는 두 끝점과 다르게 잡을 수 있고 보는 큰 호는230°이다.','uniqueness':'W의 위치와 반지름이 바뀌어도 보는 큰 호 및 작은 중심각은 고정이다.'},15:{'sideSquared':48,'sideExact':'4√3','areaExact':'12√3','existence':'한 변4√3의 정삼각형의 외접원을 잡고 A에서의 접선을 그으면 그 접선은 반대 현BC와 평행하며 그림과 같은 방향의 반직선AT가 AB와60°를 이룬다.','uniqueness':'평행조건과 현의 수직이등분으로 AB=AC, 밑각60°로 정삼각형이 강제된다. a²=48의 음의 해는 길이가 아니므로 하나.'},16:{'radiusSquared':24,'diameterSquared':96,'AD':3,'BC':8,'DC':11,'heightDifference':5,'pythagoras':'121=96+25','existence':'자체 존재 예: A=(0,0), B=(0,2r), D=(3,0), C=(8,2r), r²=24. 원 중심(0,r)에서 DC까지 거리=11r/11=r, 수선발의 DC 내분비는3:8이므로 선분 내부에서 접한다. 이 좌표는 존재 증명 전용이며 SVG 좌표를 쓰지 않는다.','uniqueness':'접선 분할과 피타고라스를 전개하면12x=96만 남으며 x=8>0. 반원의 넓이를 원 전체로 잘못 계산하면 안 된다.'},17:{'perimeter':40,'PU_PV':20,'radius':15,'POsquared':625,'PO':25,'existenceWitness':'독립 유리수 예 P=(0,0),O=(0,25),U=(-12,16),V=(12,16),X=(-15/2,10),Y=(15/2,10),H=(0,10). 접선 수직 및 반지름15, PU20, PX=PY=25/2<20, XY15, 둘레40을 정확히 검증했다. H는XY 내부이고 원은 삼각형 아래에 있다.','uniqueness':'다양한 가능한 X,Y에도 둘레=2PU가 강제되고 직각삼각형에서 양의 PO25만 가능하다.'}}
methods={13:'접선에 수직인 반지름·내각 이등분선·정삼각형 반쪽의 피타고라스·외접 두 원의 중심거리 합',14:'원주각이 보는 큰 호의 중심각·전체360°·접선과 반지름 수직·사각형 내각합',15:'접선 수직·평행선 각·현의 수직이등분·이등변/정삼각형·피타고라스로 높이와 넓이',16:'반원 넓이·같은 점의 두 접선 길이·평행/수직·피타고라스·곱셈공식 전개 후 일차식',17:'같은 점의 두 접선 길이·선분 내부에 따른 차와 합·둘레 상쇄·피타고라스·양의 제곱근'}
rows=[]
for it in items:
 q=it['questionNumber'];assert it['choices']==[]
 digest=h(json.dumps({k:v for k,v in it.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode());assert digest==it['studentDigest']
 figs=[]
 for fig in it['figures']:
  sha=h((p/fig['svgPath']).read_bytes());assert sha==fig['sha256'];figs.append(sha)
 surfaces={
 'stem':{'status':'proposed-in-scope','basis':methods[q]+'으로 실제 발문 조건만으로 풀이한다. 2015 중3 원의 성질 이후 제안이며 정식 승인 아님.'},
 'choices':{'status':'not-applicable','basis':'실제 choices=[]인 서술형이다. 존재하지 않는 5개 보기를 만들지 않는다.'},
 'figuresAndTables':{'status':'student-view-checked','basis':f'q{q} 학생 SVG를 로컬 렌더하여 실제 보았다. 점·접점·원/반원·선분 배치가 발문과 대응한다. 수치·길이·각은 픽셀이나 SVG 좌표에서 얻지 않았다.'+(' 특히 반원임을 확인했다.' if q==16 else ' 특히 원은 삼각형PXY의 내접원이 아니다.' if q==17 else '')},
 'notation':{'status':'proposed-in-scope','basis':'원 중심·접점·선분 길이·각도·π와 제곱근 표기는 중학교 기하/실수 범위. '+('둘레 cm와 넓이 cm²를 구별한다.' if q in (13,15,16) else '각도 단위를 도로 쓴다.' if q==14 else '둘레와 PO는 모두 cm 길이이다.')},
 'answer':{'status':'independently-solved','basis':'정확한 정수·유리수·√3 표현으로 '+answers[q]+'를 도출했고 부호와 단위를 확인했다.'},
 'studentSolution':{'status':'own-method-proposed-author-unseen','basis':methods[q]+'. 일반적인 원의 비례/접선곱·사인법칙·삼각함수 공식은 사용하지 않았다. 저자 해설 미노출이므로 그 해설의 범위는 아직 미판정.'},
 'prerequisites':{'status':'2015-M3-after-prerequisites-proposal','basis':'이미 실제 확인한 2015 9수04-19 현·접선 성질'+(' 및9수04-20 원주각' if q==14 else '')+'과 이전 평면도형·삼각형 합동/닮음 기초·피타고라스(9수04-16)·실수 계산 중 실제 풀이에 필요한 사항을 학습한 뒤 배정해야 한다. 2022 배치와 특정 학교 시험 진도는 미확인.'}}
 raw={'studentDigest':it['studentDigest'],'solverId':'independent-helper-gyeongsin-group11-blind-20261020','answer':answers[q],'solution':solutions[q],'evidence':{'exposure':exposure,'exactCalculation':calcs[q],'figureSha256s':figs,'studentDigestVerified':True,'gradeSurfaceProposals':surfaces,'choiceCheck':'서술형이며 보기0개','limits':['정식 학년/출처/권리/family/native 승인 아님','저자 전체 해설·채점기준은 미노출','원문 답안 비교 없음; 새 수동 승인 개수 증가 아님']},'status':'solved'}
 (p/'solve').mkdir(exist_ok=True)
 with (p/f'solve/q{q}.json').open('x',encoding='utf-8') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
 rows.append({'q':q,'studentDigest':digest,'rawSha256':h((p/f'solve/q{q}.json').read_bytes()),'answer':answers[q]})
with (p/'own-q13-q17-blind-results.json').open('x',encoding='utf-8') as f:json.dump({'inputSha256':h((p/'student-problems.json').read_bytes()),'exposure':exposure,'checks':'Exact rational/radical algebra; five SVG views; nondegenerate positive existence witnesses; no floating/pixel answer oracle','results':rows},f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(rows))
