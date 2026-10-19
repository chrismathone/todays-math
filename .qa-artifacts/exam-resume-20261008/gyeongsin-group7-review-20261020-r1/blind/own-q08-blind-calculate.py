import json,hashlib
from fractions import Fraction
from pathlib import Path
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group7-review-20261020-r1/blind')
with (p/'own-q08-blind-utf8-probe.txt').open('x',encoding='utf-8') as f:f.write('독립 풀이 UTF-8 확인: 접선의 길이와 피타고라스.\n')
assert (p/'own-q08-blind-utf8-probe.txt').read_text(encoding='utf-8')=='독립 풀이 UTF-8 확인: 접선의 길이와 피타고라스.\n'
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
a=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0];m=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'))
assert sha(p/'student-problems.json')==m['studentProblemsSha256']
digest=hashlib.sha256(json.dumps({k:v for k,v in a.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();assert digest==a['studentDigest']
assert sha(p/'figures/q08-1.svg')==m['figures'][0]['sha256']==a['figures'][0]['sha256']
r=Fraction(12,2);PI=SG=r;EI=9-PI;EF=EI
# x=PQ=RS. RF=RG=x-6, ER=3+(x-6)=x-3; EQ=x-9.
# (x-3)^2-(x-9)^2=12^2 -> 12x-72=144.
x=Fraction(144+72,12);EQ=x-9;RG=x-SG;ER=EF+RG
assert r==6 and EI==EF==3 and x==18 and RG==12 and EQ==9 and ER==15
assert ER**2==EQ**2+12**2
assert all(z>0 for z in [r,PI,EI,EF,x,EQ,RG,ER])
checks=[]
for i,L in enumerate([12,13,14,15,16]):
 h=L+3;eq=h-9;res=L**2-eq**2-12**2
 checks.append({'choice':'①②③④⑤'[i],'ER_cm':L,'impliedHeight_cm':h,'implied_EQ_cm':eq,'pythagorasResidual_cm2':res,'matches':res==0})
assert [z['choice'] for z in checks if z['matches']]==['④']
# Own Euclidean existence certificate for 12x18 rectangle, radius6 at top/left/right offsets6.
EO2=6**2+3**2;OR2=6**2+12**2
assert EO2==45 and OR2==180 and EO2+OR2==15**2
assert EO2*OR2==90**2
alt=Fraction(90,15);assert alt==6
assert Fraction(EO2,15)==3 and Fraction(OR2,15)==12
solution='原' # removed before sealing; independent student geometry follows.
solution='円' # removed before sealing.
solution='원은 직사각형의 서로 마주 보는 변 PQ, RS에 접하므로 그 두 변 사이의 거리 QR=12 cm는 원의 지름이다. 따라서 반지름은 6 cm이다. 접점에 그은 반지름은 변에 수직이므로 PI=SG=6 cm이다. PE=9 cm이므로 E는 I보다 Q 쪽에 있고 EI=9−6=3 cm이다. 한 점에서 원에 그은 두 접선의 길이는 같으므로 EF=EI=3 cm이고 RF=RG이다. 직사각형의 높이 PQ=RS를 x cm라 하면 RG=x−6 cm이므로 ER=EF+FR=3+(x−6)=x−3 cm이다. 또 EQ=x−9 cm이고 ∠EQR=90°이다. 피타고라스 정리에 따라 (x−3)²=(x−9)²+12²이다. 전개하여 같은 항을 정리하면 12x−72=144, 따라서 x=18이다. 그러므로 ER=x−3=15 cm이며 정답은 ④이다. 실제로 EQ=9, QR=12, ER=15는 9²+12²=15²를 만족하고, EF=3, FR=12로 F가 ER 내부에 있다. 보기의 ER를 12,13,14,15,16 cm로 각각 놓으면 ER²−EQ²−QR²는 −36,−24,−12,0,12 cm²이므로 ④만 가능하다. x>9인 길이 조건에서 위 일차식의 해는 하나이고 모든 접선 길이와 반지름은 양수이다.'
existence='가로12, 세로18인 직사각형에서 위쪽 변과 왼쪽·오른쪽 변으로부터 각각6 떨어진 점을 O로 삼아 반지름6의 원을 그리면 세 변에 접하고 아래쪽 변까지 거리는12라 원이 직사각형 내부에 놓인다. 왼쪽 변 위에서 PE=9인 E를 잡는다. EI=3, OI=6이므로 EO²=45이고, OG=6, GR=12이므로 OR²=180이다. ER²=9²+12²=225=EO²+OR²이므로 △EOR는 O가 직각인 삼각형이다. 이 삼각형의 넓이를 두 방식으로 구하면 O에서 빗변 ER에 내린 높이는 EO·OR/ER=90/15=6이다. 따라서 ER는 반지름6인 원에 접하며 발 F는 빗변 내부에 있다. AA닮음으로 EF=EO²/ER=3, FR=OR²/ER=12도 확인된다. 이 비는 실제 직각삼각형의 닮음으로 정당화하는 구성 검산이며 원의 할선곱·접선곱 정리를 쓰는 학생 방법이 아니다. 조건을 만족하는 도형이 존재하며, 유일한 양의 높이18에서 요구 길이15가 강제된다.'
exposure={'currentAuthoredAnswerSolutionMetadataExposedBeforeRaw':False,'priorOriginalQ08PageExposure':True,'declaration':'현재 authored GYEONGSIN q08 r1의 답·해설·비공개 자료는 읽지 않았다. 이전 허가된 원본 H 전체 페이지 검토에서 원래 q08의 조건·그림에 우연히 노출되었다. 완전한 원문 비노출을 주장하지 않으며, 현재 학생 조건만으로 독립 계산했다. 원본·root저자·비공개 패키지를 이번 풀이 중 열지 않았다.'}
evidence={'exposureDeclaration':exposure,'exactCalculations':{'radius_cm':str(r),'PI_SG_cm':str(PI),'EI_EF_cm':str(EI),'height_cm':str(x),'RG_RF_cm':str(RG),'EQ_cm':str(EQ),'ER_cm':str(ER),'linearEquation':'12x-72=144','EO_squared_cm2':EO2,'OR_squared_cm2':OR2,'existenceDistanceToER_cm':str(alt)},'allChoices':checks,'existenceUniqueness':existence,'domainsAndSigns':'PQ=x>PE=9 so E is on side PQ and EQ>0; x=18 satisfies this. Radius6, EI3, EF3, RF12, RG12, ER15 are positive. Negative or zero lengths rejected. Divisors2,12,ER15 nonzero. Lengths cm, squares cm². The linear equation has exactly one solution, not two quadratic branches.','tangentJustification':'同' ,'figureInspection':'学生' ,'bindings':{'studentDigest':digest,'studentProblemsSha256':sha(p/'student-problems.json'),'svgSha256':sha(p/'figures/q08-1.svg')},'studentMethod':'원의 반지름과 접선의 수직 관계, 같은 점에서 그은 접선 길이의 같음, 직사각형, 피타고라스, 곱셈식 전개와 일차방정식. 고등 원과 비례·사인법칙·외접반지름 공식·좌표나 픽셀 계산은 사용하지 않았다.','limits':'현재 학생 raw만 봉인. 별도 학년·출처·권리·가족·native·배포 승인 및 승인개수 증가가 아니다.'}
evidence['tangentJustification']='EO를 공통 빗변, OI=OF를 반지름으로 하는 직각삼각형 EIO,EFO가 합동이어서 EI=EF이다. OR를 공통 빗변, OG=OF로 하는 RGO,RFO도 합동이어서 RG=RF이다. 실제 접선-반지름 직각과 합동에 근거하며 접선곱 정리를 전제로 하지 않는다.'
evidence['figureInspection']='학생 SVG를 PyMuPDF로 PNG 변환하여 P-Q-R-S의 직사각형 순서, 세 변의 접점 H,I,G, PQ 위 E의 위치, ER 위 접점F와 OF의 수직 표시, PE9 및 QR12를 육안 확인했다. SVG 좌표나 픽셀 길이를 답의 수치 근거로 사용하지 않았다.'
raw={'studentDigest':digest,'solverId':'independent-retained-helper-gyeongsin-q08-r1','answer':'④','solution':solution,'evidence':evidence,'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
for file,obj in [(p/'own-q08-blind-calculations.json',evidence),(p/'solve/q08.json',raw)]:
 with file.open('x',encoding='utf-8') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
assert json.loads((p/'solve/q08.json').read_text(encoding='utf-8'))['answer']=='④'
print(json.dumps({'rawSha256':sha(p/'solve/q08.json'),'studentDigest':digest,'ER_cm':str(ER),'status':'solved'}))
