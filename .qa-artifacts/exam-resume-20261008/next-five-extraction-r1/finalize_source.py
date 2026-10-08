"""Compile manually reviewed source evidence, never answers or new twins.

Run extract_source.py first. This file's method/data observations are a human
review ledger, not a solver, model judgment, grade approval or DB operation.
All writes are restricted to this evidence folder and the one owned report.
"""
from pathlib import Path
import copy
import hashlib
import html
import json
import re
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
REPORT = ROOT/'docs/planning/tracks/reports/exam-twin-next-five-extraction-r1-20261008.md'
SLUGS = ['gyeonggu','gyeongsan','gyeongsang','gyeongsin','gyeongam']
COUNTS = [23,25,22,17,19]
MC = [19,25,18,10,15]
PARENT = Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')

def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def digest(x): return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def write(p,x):
    p=Path(p).resolve()
    assert p.is_relative_to(HERE) or p==REPORT
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n' if not isinstance(x,str) else x,encoding='utf-8',newline='\n' if p.is_relative_to(HERE) else None)

# One observation for EVERY parent question; these record intended school-band
# concepts and a possible legal core method. They do not contain solved values.
METHODS = {
'gyeonggu': [
'직각삼각형의 변 대응으로 sin/cos/tan 정의를 읽는다.',
'sin의 정의에서 양수 직각삼각형의 해당 변을 구한다.',
'두 예각의 각 변 대응을 각각 읽어 주어진 두 삼각비를 곱한다.',
'수선으로 생긴 두 직각삼각형의 각 대응과 빗변을 찾는다.',
'특수각의 삼각비와 사분원의 길이 비교로 대소를 판정한다.',
'표의 값으로 예각을 식별한 뒤 사분원의 수선/접선 길이를 읽는다.',
'30/45/60도 직각삼각형의 값을 각각 대입하여 주장들을 비교한다.',
'BC를 수선의 발에서 나누고 두 직각삼각형의 높이 관계를 세운다.',
'각의 이등분과 직각삼각형의 길이/각 대응으로 필요한 비를 구성한다.',
'직사각형 속 30/45도 삼각형의 길이를 구해 15도 직각삼각형을 읽는다.',
'밑면 중심까지의 거리와 삼각비로 높이를 세워 각뿔 부피를 구성한다.',
'두 관측점과 탑 발에서 생긴 직각삼각형의 높이 관계를 연결한다.',
'정삼각형의 각과 보조 수선으로 밑변/높이 및 부분 넓이를 구성한다.',
'현의 수직이등분과 반지름 직각삼각형에 피타고라스를 적용한다.',
'중심과 현 사이의 같은 거리에서 같은 현 및 이등변삼각형 각을 읽는다.',
'접점의 직각과 반지름/외부점의 직각삼각형으로 넓이를 구성한다.',
'현을 이등분한 직각삼각형에서 두 반지름 제곱의 차를 읽는다.',
'한 외부점의 같은 접선 길이와 직각삼각형으로 지름을 구성한다.',
'정사각형의 변과 같은 접선 길이를 이용하여 양수 길이식을 구성한다.',
'사분원의 직각삼각형에서 삼각비를 나타내는 선분과 비의 곱을 읽는다.',
'교차한 두 직각삼각형의 각, 선분, 넓이를 순서대로 구성한다.',
'반지름-접선의 직각 및 같은 접선 길이로 각, 선분, 둘레를 구성한다.',
'두 접점의 직각과 중심각 관계에서 선분과 삼각형-부채꼴 넓이를 구성한다.'],
'gyeongsan':[
'y=ax²의 계수 부호/크기와 개형 및 대칭축을 비교한다.',
'y=ax²+q의 축과 꼭짓점, 이동 방향을 읽는다.',
'평행이동으로 유지되는 이차항 계수를 비교한다.',
'꼭짓점형에서 축의 x좌표를 읽어 비교한다.',
'x축 접촉과 축 및 y절편 조건을 꼭짓점형에 대입한다.',
'매개변수로 나타낸 꼭짓점을 주어진 직선식에 대입한다.',
'일차함수의 기울기/절편 부호에서 이차함수 꼭짓점의 사분면을 읽는다.',
'아래로 열린 포물선의 증가 구간과 대칭축을 연결한다.',
'꼭짓점 좌표에서 원점까지의 두 이동량의 부호를 읽는다.',
'그래프의 개형/꼭짓점/절편에서 계수 조합의 부호를 판정한다.',
'꼭짓점형의 개형과 축/절편으로 각 사분면 존재 조건을 점검한다.',
'포물선의 축/절편과 같은 높이 삼각형의 넓이 이등분점을 이용한다.',
'직각삼각형에서 cos의 인접변/빗변 대응을 읽는다.',
'직각삼각형의 두 예각에서 sin/cos/tan의 해당 변을 읽는다.',
'이차방정식의 근을 길이비로 해석하고 직각삼각형을 구성한다.',
'특수각 및 90도의 삼각비를 대입하여 주어진 산식을 계산한다.',
'빗변에 내린 수선과 두 예각의 대응을 직각삼각형으로 읽는다.',
'세 내각의 비와 내각 합으로 특수각의 삼각비를 읽는다.',
'같은 길이와 직사각형 조건을 이용하여 30도 삼각형의 부분 길이를 구성한다.',
'접점의 수직 반지름과 60도 직각삼각형을 이용하여 접선식을 구성한다.',
'사분원에 표시된 수선/접선 길이를 이용하여 두 비의 값을 읽는다.',
'사분원 안의 점/수선/접선에서 각과 해당 선분의 대응을 비교한다.',
'두 건물 사이 수평 거리와 올려봄/내려봄 각으로 두 높이의 합을 구성한다.',
'두 직각삼각형의 특수각과 교점을 이용하여 겹친 삼각형의 넓이를 구성한다.',
'접기 전후 같은 길이와 직각삼각형을 이용하여 부분 넓이를 구성한다.'],
'gyeongsang':[
'직각삼각형에서 sin의 대변/빗변을 읽는다.',
'직각삼각형에서 cos의 인접변/빗변을 읽는다.',
'직각삼각형에서 tan의 대변/인접변을 읽는다.',
'단위 사분원의 좌표/수선 길이로 cos 값을 읽는다.',
'공통 삼각비 표의 서로 다른 두 행과 열을 읽어 더한다.',
'공통 표의 tan 열에서 주어진 값을 만족하는 각을 역으로 읽는다.',
'특수각 직각삼각형의 빗변과 두 변을 대응시킨다.',
'45도/60도 직각삼각형의 삼각비를 대입한다.',
'삼각형의 내각 비에서 특수각을 식별하고 세 비를 각각 대입한다.',
'일곱 관측값의 합과 자료 수로 평균을 구성한다.',
'일곱 원자료를 정렬하여 중앙 위치를 읽는다.',
'15개 신발 치수의 같은 값 빈도를 비교한다.',
'편차 합이 0임과 주어진 평균에서 빈 칸의 원점수를 구성한다.',
'10개 원자료의 평균, 편차 제곱 평균 및 양수 제곱근을 구성한다.',
'다섯 종목의 표준편차를 읽어 산포를 비교한다.',
'주어진 각에 수선을 내려 삼각비로 높이를 구하고 넓이를 구성한다.',
'수평 거리와 경사각의 tan으로 높이를 구성한다.',
'두 직각삼각형의 겹침과 높이/밑변으로 부분 넓이를 구성한다.',
'cos의 정의와 피타고라스로 직각삼각형의 밑변/높이를 구성한다.',
'정삼각형을 수선으로 나눈 30/60도 직각삼각형에서 정의를 읽는다.',
'수선을 내려 60도 직각삼각형과 피타고라스로 관측 거리 조건을 구성한다.',
'줄기/잎의 20개 값을 복원하고 대푯값 및 이상치의 영향을 비교한다.'],
'gyeongsin':[
'중심에서 같은 거리에 있는 현과 이등변삼각형의 내각 관계를 읽는다.',
'접점의 직각과 30도 직각삼각형에서 양수 반지름 조건을 구성한다.',
'접선/할선 길이 문제: 원과 비례 정리를 필수로 쓰지 않는 적법한 대체 풀이가 필요하다.',
'같은 접선 길이와 직각삼각형의 길이식을 구성한다.',
'지름에 대한 원주각과 두 직각삼각형의 수선/길이 조건을 연결한다.',
'원주각과 중심각 및 다각형의 각 관계를 연결한다.',
'현의 수직이등분 및 반지름과 이등변삼각형의 수선 관계를 연결한다.',
'반지름과 접선의 직각, 직사각형 및 같은 접선 길이를 연결한다.',
'직각삼각형의 빗변 위 중심과 접점 조건으로 같은 높이/닮음 관계를 구성한다.',
'같은 호의 원주각과 삼각형 외각의 관계를 연결한다.',
'같은 호와 중심각/원주각의 관계를 연결한다.',
'세 꼭짓점의 같은 접선 길이와 변의 합으로 접선 길이를 구성한다.',
'정삼각형 속 세 원의 접점/중심을 잇는 직각삼각형과 원 둘레를 구성한다.',
'두 접점의 직각과 원주각/중심각 관계를 연결한다.',
'반지름에 수선을 세워 접선-현 각을 원주각으로 해석할 수 있는지 검토한다.',
'같은 접선 길이와 직각삼각형으로 반지름 및 반원 넓이를 구성한다.',
'내접원의 접점과 같은 접선 길이, PO/OH의 직각 관계로 둘레를 구성한다.'],
'gyeongam':[
'범주형 음료 도수 표에서 가장 잦은 범주를 읽는다.',
'두 자료 수의 홀짝에 따른 중앙 위치 조건과 자연수 범위를 연결한다.',
'두 중앙값 조건을 정렬 구간 및 a<b 자연수 조건과 연결한다.',
'기존 합과 추가 세 관측값 및 새 자료 수로 평균을 구성한다.',
'모든 값의 같은 평행이동과 편차의 정의를 연결한다.',
'편차를 직접 배수로 바꾸어 분산/표준편차의 정의를 적용한다.',
'중앙 위치 앞뒤의 정수 개수 조건으로 가능한 중앙값의 경계를 검토한다.',
'편차 제곱 합을 전개하여 원자료 제곱 합과 평균/자료 수를 연결한다.',
'15점 산점도의 두 축과 40점 이하 경계를 포함하여 점을 센다.',
'두 예각에 대응하는 대변/인접변/빗변의 비를 각각 읽는다.',
'정육면체의 면 대각선 및 직각삼각형에서 해당 삼각비를 구성한다.',
'tan의 정의로 다른 변을 구한 뒤 피타고라스를 적용한다.',
'사분원의 수선/접선과 각의 변화에 따른 길이 비교를 읽는다.',
'특수각의 세 삼각비를 각각 대입하여 산식을 계산한다.',
'0<A<45에서 두 비의 대소 및 제곱근의 부호를 직각삼각형으로 검토한다.',
'10개 원자료의 중앙값/평균과 이상치 영향으로 대표성을 비교한다.',
'기준 학생에서 뺀 차이 표의 평균과 평행이동 불변 편차를 읽는다.',
'이등변 조건/수선/피타고라스로 22.5도 직각삼각형의 변을 구성한다.',
'사분원의 60도 반지름과 수선/접선으로 부분 넓이를 구성한다.']}

FIGURES={
'gyeonggu':{1:'C 직각; AB=5, BC=3.',3:'C 직각; AC=√3, BC=1.',4:'A 직각; AB=6, AC=4; AD⊥BC; x,y는 A의 두 분할각.',6:'반지름 1; OC=0.5446; 사분원/접선; 삼각비 표 별도 구조화.',8:'BC=8; ∠B=45°, ∠C=40°; AH⊥BC.',9:'C 직각; AB=20, AC=12; AD는 A의 이등분선; x=∠ADC.',10:'직사각형; AB=√3; ∠BAE=45°, ∠EAF=30°; E∈BC, F∈CD; EF⊥AE.',11:'밑면 정사각형 변 2cm; H는 O의 수선 발; ∠OAH=60°.',12:'BC=10m; 탑 A를 올려본 B,C 각은 60°,45°.',13:'정삼각형 ABC; D∈AB; BD=10√2, ∠BDC=105°; 음영 ADC.',14:'OA=6cm, OM=4cm; OM⊥AB.',15:'∠BAC=52°; 중심에서 AB/AC까지 같은 거리.',16:'OA=5cm, BP=6cm; O,B,P 공선; PA 접선.',17:'동심원; 큰 원 현 AB=12; H는 작은 원 접점; 두 원 사이 음영.',18:'BC는 지름; AB=4, CD=7; AB/AD/CD 접선.',19:'정사각형 ABCD; AE=6; BC는 지름; AB/AE/CE 접선.',20:'반지름 1 사분원; D,B 직각; x,y,z 각 표기.',21:'∠A=45°, ∠D=60°; CD=4; B,C 직각; P는 교점.',22:'OA=4; ∠A=60°; AP/AQ는 방향 화살표를 가진 반직선, 벡터 연산 아님; BC 접선.',23:'OA=3; ∠APB:∠AOB=1:2; 음영은 접선 삼각형에서 부채꼴을 뺀 영역.'},
'gyeongsan':{7:'일차함수 그래프: 양의 기울기, 양의 y절편.',10:'아래로 열린 포물선; 꼭짓점 (-1,3), y절편 1; A,B는 x절편.',12:'y=-x²+x+2; BC=3; A는 y절편; l은 A를 지나 넓이 이등분.',13:'C 직각; AB=3, AC=2, BC=√5; [3점] 지면 확인.',14:'A 직각; AB=2, AC=4.',17:'C 직각; AC=8cm, BC=6cm; CD⊥AB; x,y 각.',19:'∠B=90°, ∠CAB=30°, BC=6; AE=BE; DEBF 직사각형.',20:'반지름 1; x축 접점 A; 원점의 60° 직선 접점 B, B는 제1사분면.',21:'단위 사분원, 35°; 길이 0.7002,0.5736,0.8192; 접선 포함.',22:'반지름 1 사분원; A,F,E,D,B,C 점과 x,y,z 각 대응.',23:'수평 거리 100m; A 옥상에서 B를 올려봄 60°, 내려봄 45°; 목표는 두 건물 높이의 합.',24:'ABC/DBC 직각삼각형; CD=20; ∠ACB=45°, ∠D=60°; 음영 EBC.',25:'직사각형 종이 폭 5cm; AB 접는 선 10cm; 목표 △ABC 넓이.'},
'gyeongsang':{1:'C 직각; AB=17, BC=8, AC=15.',2:'C 직각; AB=29, BC=20, AC=21.',3:'C 직각; AC=5, BC=√11, AB=6.',4:'단위 사분원, 35°; 0.7002/0.5736/0.8192 길이.',7:'윗 꼭짓점 직각; 왼쪽 직각변 5cm, 오른쪽 직각변 x cm; 아래 빗변 y cm; 왼쪽 아래 예각 45°.',16:'AB=4, BC=5; ∠B=40°; 삼각비 표 값은 본문에 직접 제시.',17:'AC=50m 수평 거리; 경사각 15°; 제시된 삼각비로 높이를 묻는다.',18:'∠B=∠C=90°, ∠BAC=60°, ∠EFC=45°; CD=6, BF=3; 음영 ABFE.',19:'C 직각; AB=18cm; cos B=1/3.',20:'정삼각형 ABC; 각 60°; 수선 구성은 풀이에서 새로 해야 한다.',21:'AB=30m, AC=40m; ∠A=60°; 연못 양끝 B,C.'},
'gyeongsin':{1:'∠BAC=48°; AB/AC 현의 중심 거리 같음.',2:'∠APO=30°, PC=6; PA/PB 접선.',3:'PA=4, AB=5; PC는 C의 접선.',4:'AD=5, AF=3; DF⊥AB; 접점 B,C,E.',5:'AD 지름; AB=8, AC=12, BH=2; AH⊥BC.',6:'내접 오각형 ABCDE; ∠BOC=42°, ∠D=102°.',7:'OB=AB=4; I=BO∩AC, H는 BC 수선 발, J=OH∩AC; BO⊥AC; original H p2에 [5점].',8:'ABCD 직사각형; 세 변 접점 G,H,I; CE=10, OF=4; F 접점.',9:'C 직각; BC=8, CA=4; 중심 O∈AB; BC/CA 접촉; 원본도 반지름 b/a, 서로소 자연수.',10:'호 AB=BD=DC; 두 할선 외부 교점 P; ∠APC=28°.',11:'∠ADB=21°; 호 AB=호 BC=2.',12:'AB=9, BC=14, CA=11; D,E,F 내접원 접점.',13:'정삼각형 둘레 15+15√3; 반지름 x인 세 원 서로 외접.',14:'두 접선의 외각 ∠APB=44°; C는 작은 호 AB 위.',15:'AT 접선과 현 BC 평행; ∠BAT=60°; AC=9.',16:'AB 반원 지름; AD=3, BC=5; AD/CD/BC 접선.',17:'AB/CD 연장선 교점 P; OH⊥AD; PO=17, OH=8; 사각형 네 변에 내접원; 목표 △PAD 둘레.'},
'gyeongam':{9:'15개 점; x축 과학(점), y축 수학(점); 10점 격자; 이하 경계 포함.',10:'C 직각; AB=5, BC=3, AC=4.',11:'정육면체 한 모서리 2; x=∠BFD.',12:'C 직각; BC=6cm, tan B=1/3.',13:'반지름 1 사분원; x=∠CAE; 0/90도 및 삼각비 변화 주장이 보기.',18:'∠B=90°; AD=CD; ∠CDB=45°; BC=1; 목표 tan22.5°.',19:'O 중심 반지름 1 사분원; ∠AOB=60°; AC⊥OB, DB⊥OB; 음영 ACBD.'}}

TABLES={
('gyeonggu',6):{'columns':['angleDegrees','sin','cos','tan'],'rows':[[32,'0.5229','0.8480','0.6249'],[33,'0.5446','0.8387','0.6494'],[56,'0.8290','0.5592','1.4826'],[57,'0.8387','0.5446','1.5399']],'literalSourceCaution':'32도 sin 값 0.5229는 실제 원본/완료본 표기; 수학적으로 의심되며 자동 교정하지 않음.'},
('gyeongsang',5):{'columns':['angleDegrees','sin','cos','tan'],'rows':[[68,'0.9272','0.3746','2.4751'],[69,'0.9336','0.3584','2.6051'],[70,'0.9397','0.3420','2.7475'],[71,'0.9455','0.3256','2.9042'],[72,'0.9511','0.3090','3.0777']],'sharedBy':[5,6]},
('gyeongsang',12):{'unit':'mm','values':[230,230,235,235,235,240,240,240,245,245,245,245,245,250,255],'count':15,'literalCaptionTypo':'운동차의 치수'},
('gyeongsang',13):{'columns':['1회','2회','3회','4회'],'deviationPoints':[7,-6,None,8],'givenMeanPoints':92,'blankIsUnknownNotZero':True},
('gyeongsang',14):{'values':[4,4,9,6,6,9,3,8,6,5],'count':10,'choiceColumnRoles':['variance','standardDeviation']},
('gyeongsang',15):{'columns':['종목','평균','표준편차'],'unit':'점','rows':[['마루운동','12.550','0.83'],['도마','12.283','0.93'],['안마','14.050','0.84'],['링','13.050','0.97'],['평행봉','15.050','0.79']]},
('gyeongsang',22):{'unit':'개','stemLeafRows':[{'stem':0,'leaves':[0,0,1,1,2,2,2,4,4,4,7,8]},{'stem':1,'leaves':[0,1,2,5,7]},{'stem':2,'leaves':[0,5]},{'stem':4,'leaves':[5]}],'count':20},
('gyeongam',1):{'unit':'명','columns':['음료','도수'],'rows':[['우유',5],['탄산음료',11],['커피',8],['스포츠 음료',2],['물',5]]},
('gyeongam',9):{'axes':{'x':'과학(점)','y':'수학(점)'},'points':[[10,20],[20,40],[30,20],[30,30],[30,50],[40,20],[40,40],[40,50],[50,30],[50,40],[50,50],[50,60],[60,40],[60,50],[60,60]],'count':15,'boundary':'x<=40 and y<=40; requested count not calculated'},
('gyeongam',16):{'unit':'회','values':[5,7,9,6,8,7,6,52,10,8],'count':10},
('gyeongam',17):{'unit':'회','columns':['수명','소희','현수','지호','상훈'],'differencesFromHyeonsu':[7,-2,0,6,-1],'literalCaptionUnbalancedBracePreservedInRaw':True}}
TABLES[('gyeongsang',6)]=TABLES[('gyeongsang',5)]

RISKS={
'gyeonggu':{5:'일반각 삼각비의 대소를 수업 범위의 사분원/길이 비교로 설명할 근거 필요.',9:'이등분선/닮음 사용 범위와 각 대응 검토; 반각 공식 채택 금지.',10:'15도 값을 덧셈정리로 구하는 방법 제외; 도형 분해 적법성 검토.',11:'공간도형/각뿔 부피의 선수학습과 복잡성 제한 검토.',13:'105도 삼각함수/사인법칙 제외; 수선 및 특수각 대체 풀이 검토.',20:'비의 곱에서 삼각비 사이 관계를 정리로 가르치지 않는지 검토.',21:'겹친 도형의 과도한 복잡성과 상위 삼각법 사용 여부 검토.',22:'화살표는 반직선; 학생 풀이에 벡터 연산 금지.'},
'gyeongsan':{10:'계수의 부호 주장/보기 전부와 근과 계수 관계 사용 금지 점검.',11:'모든 사분면의 존재 및 k=0 제외, 복잡한 함수 활용 제한 검토.',12:'중선/이등분과 함수 교점 연결의 선수학습 및 복잡성 검토.',15:'삼각비 사이 관계 금지와 길이비 직각삼각형 풀이의 적법성 별도 검토.',20:'원-좌표-직선 결합과 접선식 선수학습/복잡성 검토.',24:'겹친 도형과 각/수선 관계의 복잡성 검토.',25:'접기 도형 해석으로 새로운 작도/증명 선수 요구가 없는지 검토.'},
'gyeongsang':{13:'편차 합을 공식으로만 제시하지 않고 정의로 설명할 범위 검토.',18:'겹친 도형의 복잡성 및 각 대응 검토.',21:'코사인법칙 금지; 60도 수선/피타고라스 대체 풀이 검토.',22:'줄기/잎 읽기 선수학습 및 대푯값의 맥락 해석 근거 검토.'},
'gyeongsin':{3:'원과 비례 성질(접선-할선/방멱) 필수이면 제외; 적법한 대체 풀이 불명으로 hold.',5:'원과 비례/상위 공식 없이 지름 원주각과 닮음으로 가능한지 검토.',9:'닮음 및 중심/접점 연결의 복잡성 검토; 원본 분수 b/a 재확인 완료.',13:'세 원 외접 도형은 복잡하게 변형된 도형 제한/선수학습 검토.',15:'접선-현 정리의 범위 불명; 반지름과 원주각에서 적법하게 도출 가능한지 검토.',16:'원과 비례/방멱 또는 상위 공식 의존이면 제외.',17:'외접 사각형/삼각형 둘레 구성의 복잡성과 원과 비례 의존 검토.'},
'gyeongam':{5:'산포 변환을 상위 통계 공식이 아닌 편차 정의로 설명할 범위 검토.',6:'아핀 변환 표준편차를 정의로 전개하는 선수학습 검토.',7:'정수 중앙값 경계/존재 및 유일한 목표값 검토.',8:'제곱 합 항등식의 전개 난도/통계 풀이 범위 검토.',11:'공간도형/대각선의 선수학습 및 복잡성 검토.',15:'제곱근 부호/두 비의 대소를 검토; 삼각비 사이 관계 공식 사용 금지.',18:'반각/덧셈정리 제외; 22.5도 도형 구성의 범위/복잡성 검토.'}}

def scan_location(s,n):
    # Actual physical PDF page and printed parent number, not a guessed filename.
    if s=='gyeonggu':
        p=1 if n<=6 else 2 if n<=12 else 3 if n<=18 else 4
        col='left' if n in [1,2,3,7,8,9,13,14,15,19,20] else 'right'
        if n==21: col='left then right (subquestions 3/4)'
    elif s=='gyeongsan':
        p=1 if n<=5 else 2 if n<=12 else 3 if n<=19 else 4
        col='left' if n in [1,2,6,7,8,9,13,14,15,16,20,21,22] else 'right'
    elif s=='gyeongsang':
        p=1 if n<=6 else 2 if n<=13 else 4 if n<=18 else 3
        col='left' if n in [1,2,3,7,8,9,10,14,15,16,19,20] else 'right'
    elif s=='gyeongsin':
        p=1 if n<=4 else 2 if n<=8 else 3 if n<=12 else 4 if n<=16 else 5
        col='left' if n in [1,2,5,6,9,10,13,14,17] else 'right'
    else:
        p=1 if n<=6 else 2 if n<=12 else 3 if n<=16 else 4
        col='left' if n in [1,2,3,7,8,9,13,14,17,18] else 'right'
    return p,col

def concept(s,n):
    if s=='gyeongsan' and n<=12: return 'quadratic','이차함수','4. 이차함수',['9수03-09','9수03-10']
    if s=='gyeongsin' or (s=='gyeonggu' and (14<=n<=19 or n>=22)):
        arc=(s=='gyeongsin' and n in [1,5,6,10,11,14,15])
        return 'circle','원의 현·접선·원주각','6. 원의 성질',['9수04-20'] if arc else ['9수04-19']
    if (s=='gyeongsang' and n in [10,11,12,13,14,15,22]) or (s=='gyeongam' and (n<=9 or n in [16,17])):
        code='9수05-08' if s=='gyeongam' and n==9 else '9수05-07' if (s=='gyeongam' and n in [5,6,8,17]) or (s=='gyeongsang' and n in [13,14,15]) else '9수05-06'
        return 'statistics','대푯값·산포도·산점도','7. 통계',[code]
    application=(s=='gyeonggu' and n in [2,6,8,11,12,13,21]) or (s=='gyeongsan' and n>=19) or (s=='gyeongsang' and n in [16,17,18,19,21]) or (s=='gyeongam' and n in [13,15,18,19])
    return 'trig','삼각비의 정의·값·활용','5. 삼각비',['9수04-18'] if application else ['9수04-17']

def binding(m,q):
    return {'sources':m['sourceFiles'],'number':q['number'],'stem':q['stem'],'choices':q['choices'],
            'rawStem':q['hwpScriptStem'],'rawChoices':q['hwpScriptChoices'],
            'shared':q['sharedSourceContext'],'structuredData':q['structuredGivenData'],
            'scores':q['scoreEvidence'],'figures':q['figureCorrespondence'],
            'crops':q['questionPageCrops'],'records':q['positionedSourceItems'],
            'originalScan':q['contentReview']['originalScanReference'],
            'review':q['reviewObservation'],'subQuestions':q['subQuestions'],
            'positionalFigurePairs':q['positionalFigurePairs']}

def subquestions(q):
    matches=list(re.finditer(r'⑴|⑵|⑶|⑷|\$\([1-4]\)\$',q['stem']))
    return [{'number':i+1,'stem':q['stem'][r.start():matches[i+1].start() if i+1<len(matches) else len(q['stem'])].strip(),
             'score':q['scoreEvidence']['childScores'][i],'parentSharedFigure':True}
            for i,r in enumerate(matches)]

def compile_all():
    audit=load(HERE.parent/'next-five-audit.json')
    scans=load(HERE/'scan-render-index.json')
    extra=load(HERE/'additional-scan-index.json')
    for r in scans:
        for p in r['pages']: p['viewed']=True; p['renderSha256']=sha(HERE/p['render'])
    for p in extra['pages']: p['viewed']=True
    write(HERE/'scan-render-index.json',scans); write(HERE/'additional-scan-index.json',extra)
    observations=[]; summaries=[]
    standards={r['code']:r for r in audit['curriculumGate']['officialStandardsVerifiedFromPdf']}
    for i,s in enumerate(SLUGS):
        m=load(HERE/s/'source-manifest.json');e=audit['exams'][i]
        assert len(m['questions'])==COUNTS[i] and len(METHODS[s])==COUNTS[i]
        scan=extra if s=='gyeongsin' else next(r for r in scans if r['slug']==s)
        m['identity']['scanComparisonStatus']='actual_original_question_pages_rendered_and_viewed'
        m['identity']['yearConfirmed']=s!='gyeongsin'
        m['identity']['originalScanYearObserved']=2025
        m['identity']['originalScanIdentityEvidence']={'path':scan['sourcePath'],'sha256':scan['sourceSha256'],'page':1,'observedGrade':'중3','observedYear':2025,'observedSemester':2,'observedRound':'중간','schoolFooterOrNoticeObserved':m['school']}
        m['identity']['decision']='hold_completed_header_2024_2025_conflict' if s=='gyeongsin' else '2025_original_header_school_footer_and_completed_question_identity_supported'
        m['identity']['preparationFooterYearIsNotExamYear']=True
        m['identity']['gyeongsinNote']='Original H p1 dated 2025-09-19. Completed PDF p1 2025, p2-6 2024. Samdong scan has cover+only four question pages; H p5 supplies q17. No silent year correction.' if s=='gyeongsin' else None
        for p in m['questionOnlyRenderedPages']: p['viewedByReviewer']=True
        for q in m['questions']:
            n=q['number']; p,col=scan_location(s,n)
            printed=f'객관식 {n}' if n<=MC[i] else f'서술형 {n-MC[i]}'
            sr={'path':scan['sourcePath'],'sha256':scan['sourceSha256'],'physicalPdfPage':p,'printedPage':{3:4,4:3}.get(p,p) if s=='gyeongsang' else p,'column':col,'printedQuestion':printed,'render':next(x['render'] for x in scan['pages'] if x['page']==p)}
            sr['renderSha256']=sha(HERE/sr['render'])
            # Source-only literal extraction cleanup: the stray degree belonged
            # to a removed reviewer credit and is absent from the actual question.
            if s=='gyeonggu' and n==5:
                for key in ['stem','hwpScriptStem']: q[key]=re.sub(r'\n+°\s*$','',q[key]).rstrip()
                q['referenceRepairs']=[r for r in q['referenceRepairs'] if r.get('kind')!='remove_review_credit_residue']
                q['referenceRepairs'].append({'kind':'remove_review_credit_residue','removed':'isolated trailing degree sign','basis':'completed PDF p2 and original p1 show no degree after the table; raw record evidence retained'})
            scores=q['printedScoreOccurrences']; parent=scores[0]['value'] if scores else None
            child_scores=[r['value'] for r in scores[1:]]
            children=len(child_scores)
            q['scoreEvidence']={'selectedHwpPdfPrintedParentScore':parent,'selectedPairScoreStatus':'literal_match' if parent is not None else 'both_selected_files_omit_score',
                'originalPrintedParentScore':5.0 if s=='gyeongsin' and n==7 else parent,
                'referenceParentScore':5.0 if s=='gyeongsin' and n==7 else parent,
                'referenceScoreBasis':'Original H physical p2 right q7 [5점], also Samdong p3 right; not inferred from total' if s=='gyeongsin' and n==7 else 'literal printed question bracket matched in completed PDF and original scan',
                'parentCountedOnce':True,'childScores':child_scores,'subquestionCount':children,
                'parentAndChildrenMustNotBeAddedTogether':children>0}
            q['structuredGivenData']=copy.deepcopy(TABLES.get((s,n),{}))
            q['subQuestions']=subquestions(q)
            assert len(q['subQuestions'])==children
            q['positionalFigurePairs']=[]
            for f in q['hwpFigureRecords']:
                candidates=[(pdf,h) for pdf in q['figureCorrespondence'] for h in pdf['sameSizeHwpCandidates'] if h['binId']==f['binId']]
                if candidates:
                    pdf,h=min(candidates,key=lambda x:x[1]['meanChannelAbsoluteDifference'])
                    q['positionalFigurePairs'].append({'hwpFigureRecord':f,'pdfPage':pdf['pdfPage'],'pdfXref':pdf['xref'],
                        'pdfRectangles':pdf['rectangles'],'pdfImageBytesSha256':pdf['pdfImageBytesSha256'],
                        'hwpPixelRgbSha256':h['hwpPixelRgbSha256'],'meanChannelAbsoluteDifference':h['meanChannelAbsoluteDifference'],
                        'labelsAndGivensReviewedOnActualPage':True,'bindingBasis':'HWP question-position record plus same-question PDF image rectangle plus manual label/condition comparison; no whole-exam inference'})
                else:
                    q['positionalFigurePairs'].append({'hwpFigureRecord':f,'status':'manual_page_match_pixel_binding_unavailable','labelsAndGivensReviewedOnActualPage':True})
            q['figureGivenObservation']=FIGURES[s].get(n,'No bitmap figure; positioned HWP math/text and any table remain the source givens.')
            exact='question_components_matched_score_exception' if s=='gyeongsin' and n==7 else 'question_components_matched'
            q['contentReview']={'status':exact,'verifiedQuestionContent':True,
                'meaning':'question-only literal transcription and visual counterpart check, not mathematical/grade/rights approval',
                'hwpPdfComponents':{'givenText':'reviewed','positionalMath':'reviewed_against_page','choices':'all_five_reviewed' if q['choices'] else 'written_question_no_choice','figures':'labels_and_conditions_reviewed' if q['hwpFigureRecords'] else 'not_applicable_bitmap_or_text_table','score':q['scoreEvidence']['selectedPairScoreStatus']},
                'originalScanReference':sr,'wholeExamPairCertified':False,
                'wordFormulaMembershipAloneUsedAsCertification':False}
            fam,label,chapter,codes=concept(s,n)
            risk=RISKS[s].get(n)
            holds=['item_level_unit_live_family_generator_rule_and_prerequisite_review_pending','source_custody_rights_permission_pending','canonical_text_product_render_review_pending']
            if s=='gyeongsin': holds.insert(0,'source_exam_year_identity_hold')
            if s=='gyeongsin' and n==7: holds.append('selected_pair_missing_score_original_5_points_recorded')
            if s=='gyeonggu' and n==6: holds.append('literal_trig_table_32_degree_sin_0_5229_accuracy_hold')
            if s=='gyeongsan' and n==23: holds.append('historical_key_independent_solver_disagreement_pending_new_independent_solve')
            if s=='gyeongsan' and n in [12,23]: holds.append('unlabelled_bitmap_marks_not_extra_mathematical_givens_rebuild_from_explicit_conditions')
            if risk: holds.append('specific_grade_method_risk')
            q['curriculum']={'sourceGrade':'중3','expectedAppliedCurriculum':'2015','status':'hold_full_item_review','fullApproval':False,
                'conceptCandidate':label,'coreMethodCandidate':METHODS[s][n-1],
                'officialStandardsCandidates':[standards[x] for x in codes],
                'localUnitCandidate':{'grade':'중3','chapter':chapter,'seedFile':'prisma/seed-data/units.ts','seedFileSha256':sha(ROOT/'prisma/seed-data/units.ts'),'liveUnitId':None},
                'liveFamilyId':None,'generatorRuleId':None,'generatorRuleReview':'pending_parent_live_mapping_no_DB_read_by_worker',
                'specificRisk':risk,'decisionIfNoLegalGradeMethod':'reject','decisionIfUnclear':'hold',
                'appliedBasis':'Official phased rollout: 2025 middle3 precedes 2022 middle3 rollout in 2027. Both conflicting 2024/2025 headers precede that rollout; school/year identity still held separately.',
                'requiredReview':['stem','all choices','figure meaning','notation','answer format','new answer','student solution','required steps','prerequisites'],
                'signDomainUnitsGate':['signs and radicals','angle range 0-90 degrees','nonzero denominators','positive lengths/areas','units','existence','uniqueness'],
                'sourceSchoolOrAIConfidenceCannotApprove':True}
            q['reviewObservation']={'reviewedActualCompletedPages':sorted(set(r['page'] for r in q['questionPageCrops'])),
                'originalQuestionLocator':sr,'givenFigureConditions':q['figureGivenObservation'],
                'structuredTableOrPlot':q['structuredGivenData'],'coreMethodCandidate':METHODS[s][n-1],
                'sourceAmbiguityHolds':holds,'priority':'P0' if s=='gyeongsin' or (s=='gyeongsan' and n==23) or (s=='gyeonggu' and n==6) else 'P1' if risk else 'P2',
                'studentSolutionOrCorrectChoiceAuthored':False}
            q['sourceContentDigest']=digest(binding(m,q))
            observations.append({'examId':m['examId'],'number':n,'digest':q['sourceContentDigest'],**q['reviewObservation']})
        m['entireExamPairCertification']='not_certified_question_only_review_excludes_answers_and_whole_document_verification'
        m['counts']={'parentQuestions':COUNTS[i],'multipleChoiceParents':MC[i],'writtenParents':COUNTS[i]-MC[i],
            'subquestionsInsideParents':sum(q['scoreEvidence']['subquestionCount'] for q in m['questions']),
            'leafQuestions':sum(max(1,q['scoreEvidence']['subquestionCount']) for q in m['questions']),
            'questionContentVerified':COUNTS[i],'hwpPdfAllQuestionComponentsMatched':COUNTS[i]-(1 if s=='gyeongsin' else 0),
            'selectedPairParentScoreSum':sum(q['scoreEvidence']['selectedHwpPdfPrintedParentScore'] or 0 for q in m['questions']),
            'originalReferenceParentScoreSum':sum(q['scoreEvidence']['referenceParentScore'] for q in m['questions']),
            'legacyHwpAnswerExtractionScoreSum':e['legacyExtraction']['hwpReferenceScoreSum'],
            'legacyPdfBodyExtractionScoreSum':e['legacyExtraction']['pdfReferenceScoreSum'],
            'entireExamPairCertified':0,'fullGradeApproved':0,'rightsApproved':0,'verifiedTwins':0,'newTwinsAuthored':0}
        write(HERE/s/'source-manifest.json',m)
        packet={'version':'question-only-source-r1','examId':m['examId'],'inventoryExamId':m['inventoryExamId'],
            'school':m['school'],'identityDecision':m['identity']['decision'],'counts':m['counts'],
            'sourceFiles':m['sourceFiles'],'sourceOnly':True,
            'distributionBoundary':'Only this packet directory. Never distribute evidence scans, endnotes, old answers/solutions, old drafts or whole PDFs to authoring workers.',
            'authoringRequirements':'Structural/context/expression/inverse target changes with same concept/core method; numeric-only insufficient. New figures/answers/solutions/metadata/independent verification must be created separately after holds. Highest gate: legal middle3/2015 method and prerequisites; unclear hold, no legal method reject.',
            'originalCorrectChoiceAndSolutionWithheld':True,'questions':[]}
        blocks=[]
        for q in m['questions']:
            imgs=[]
            for r in q['questionPageCrops']:
                rr=copy.deepcopy(r);rr['file']=str(Path(r['file']).relative_to(Path(s)/'packet')).replace('\\','/');imgs.append(rr)
            # q6 needs the source passage too, not just q6's local crop.
            if s=='gyeongsang' and q['number']==6:
                imgs.insert(0,{**packet['questions'][4]['images'][0],'role':'shared_context_page_contains_question5_not_an_answer'})
            fields={k:q[k] for k in ['number','stem','choices','hwpScriptStem','hwpScriptChoices','scoreEvidence','subQuestions','structuredGivenData','figureGivenObservation','curriculum','sourceContentDigest']}
            fields.update({'sourceQuestionId':f"{m['examId']}-{q['number']}",'status':'source_reference_reviewed_all_final_approval_gates_held',
                'sourceAmbiguityHolds':q['reviewObservation']['sourceAmbiguityHolds'],'sharedContext':q['sharedSourceContext'],
                'images':imgs,'subquestionNumbers':list(range(1,q['scoreEvidence']['subquestionCount']+1)),
                'normalizationAuthority':'Question images + positional HWP scripts; canonical LaTeX requires later product render check. No inferred missing cells.',
                'selectedHwpAnchor':q['hwpAnchor'],'selectedPdfRegions':q['pdfReference']['regions']})
            packet['questions'].append(fields)
            blocks.append(f'<article id="q{q["number"]}"><h2>{html.escape(m["school"])} {q["number"]}</h2><p>{html.escape(METHODS[s][q["number"]-1])}</p><p>HOLD: {html.escape("; ".join(fields["sourceAmbiguityHolds"]))}</p>'+''.join(f'<img src="{x["file"]}" alt="문항 {q["number"]} 원문 지면">' for x in imgs)+'</article>')
        write(HERE/s/'packet/questions.json',packet)
        write(HERE/s/'packet/index.html','<!doctype html><html lang="ko"><meta charset="utf-8"><title>Source only</title><style>body{max-width:900px;margin:24px auto;font:16px sans-serif}img{max-width:100%;display:block}article{border-top:1px solid #aaa;padding:20px 0}</style><h1>문항 소스 전용 — 답·해설 미포함</h1><p>학년·방법·권리 보류를 승인으로 읽지 마세요. 새 쌍둥이는 이 패킷에서 제작하지 않았습니다.</p>'+''.join(blocks)+'</html>')
        referenced={x['file'] for q in packet['questions'] for x in q['images']}
        for old in (HERE/s/'packet/images').glob('*.png'):
            if str(old.relative_to(HERE/s/'packet')).replace('\\','/') not in referenced:
                assert old.resolve().is_relative_to(HERE);old.unlink()
        summaries.append({'slug':s,'school':m['school'],'examId':m['examId'],'inventoryExamId':m['inventoryExamId'],'manifest':f'{s}/source-manifest.json','manifestSha256':sha(HERE/s/'source-manifest.json'),'packet':f'{s}/packet/questions.json','packetSha256':sha(HERE/s/'packet/questions.json'),'identity':m['identity'],'counts':m['counts'],'sourceFiles':m['sourceFiles'],'originalScanReference':{'path':scan['sourcePath'],'sha256':scan['sourceSha256']}})
    write(HERE/'review-observations.json',{'version':'manual-local-page-review-r1','questions':observations,'unreviewedQuestionCount':0,'mathSolvedCount':0})
    return audit,summaries

def preservation(a):
    targets=[]
    for e in a['exams']:
        targets.extend(('original_source',r) for r in e['sourceFiles'])
        targets.extend(('legacy_reference',r) for r in e['legacyExtraction']['artifacts'])
    targets.extend(('protected_ledger',r['current']) for r in a['ledgerPreservation']['files'])
    targets.extend(('preserved_ledger_copy',r['preservedCopy']) for r in a['ledgerPreservation']['files'])
    targets.append(('permanent_exclusion',a['ledgerPreservation']['gyeongsanyeo19Config']))
    for p,h in [('next-five-audit.json','954d506390c2a4470a632b6e5e85ca0c604b231cd1eeb485cb9bf7946a569c9c'),
                ('exam-twin-next-five-20261008.md','e5d4855350a2b473d0f358d1453a0ecdcccbc45c9f886b91fc3fc2b000bee242')]:
        f=HERE.parent/p if p.endswith('.json') else ROOT/'docs/planning/tracks/reports'/p
        targets.append(('prior_owned_evidence',{'path':str(f),'sha256':h,'exists':True}))
    records=[]
    for category,r in targets:
        if not r.get('exists',True):continue
        f=Path(r['path']);actual=sha(f)
        records.append({'category':category,'path':str(f),'beforeSha256':r['sha256'],'afterSha256':actual,'unchanged':actual==r['sha256']})
    assert all(r['unchanged'] for r in records),'A protected reference changed; do not overwrite it.'
    config=load(ROOT/'scripts/import/exam-paper/exams/2025-gyeongsanyeo-3-2-mid/exam.json')
    assert '19' in config['excludeFromLoad']
    write(HERE/'custody-preservation.json',{'readOnlyHashChecks':records,'gyeongsanyeo19Excluded':True,'oldReferenceHashMismatchCount':0,'workerDbReads':0,'workerDbWrites':0,'originalSourceWrites':0,'legacyWrites':0,'parentWrites':0})
    paths=[Path('D:/todays-math/AGENTS.md'),ROOT/'AGENTS.md',PARENT/'docs/planning/tracks/brief-exam-extraction-resume-20261008.md',
           PARENT/'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-1.md',PARENT/'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-2.md',
           PARENT/'.qa-artifacts/exam-resume-20261008/continuation-index.json',
           ROOT/'scripts/qa/convert-hwp-spans.py',Path('D:/시험지 한글화/db/textlayer.py'),
           ROOT/'scripts/import/exam-paper/fix-exam-solutions.ts',ROOT/'scripts/import/exam-paper/solver_rules.json',
           ROOT/'prisma/seed-data/units.ts',ROOT/'src/lib/generator/familyKey.ts']
    write(HERE/'input-provenance.json',{'pinnedAt':datetime.now(timezone.utc).isoformat(),'readFirst':'D:/todays-math/AGENTS.md',
        'files':[{'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'readOnly':True} for p in paths],
        'paidApiCalls':0,'guiHwpConversions':0,'installationCommands':0,'standardsWebPostsOpenedAt':'2026-10-08',
        'officialCurriculumEvidence':a['officialMathematicsCurriculumDocument'],
        'officialReferences':a['curriculumGate']['officialReferences'],
        'officialStandards':a['curriculumGate']['officialStandardsVerifiedFromPdf'],
        'standardsReuseStatus':'Prior owned official PDF evidence retained unchanged; official posting links opened again. No invented standard codes.',
        'localGeneratorGuardMeaning':'solver_rules and family identity contract inspected read-only; not a live DB family/Unit mapping or full grade gate.'})
    return records

def validate_question(m,q):
    assert digest(binding(m,q))==q['sourceContentDigest'],'Source digest mismatch'
    assert any(n['anchorNumber']==q['number'] and n['root']==q['hwpAnchor'] for n in m['excludedNotes'])
    assert not q['unmappedItems']
    assert len(q['choices']) in [0,5]
    for c in q['pdfReference']['positionedCharacters']:
        assert any(r['page']==c['page']+1 and c['x0']>=r['bbox'][0]-.6 and c['x1']<=r['bbox'][2]+.6
                   and c['y0']>=r['bbox'][1]-.6 and c['y1']<=r['bbox'][3]+.6
                   for r in q['pdfReference']['regions']),'Question character clipped out of image'
    for fig in q['figureCorrespondence']:
        for b in fig['rectangles']:
            assert any(r['page']==fig['pdfPage'] and b[0]>=r['bbox'][0]-.6 and b[1]>=r['bbox'][1]-.6
                       and b[2]<=r['bbox'][2]+.6 and b[3]<=r['bbox'][3]+.6
                       for r in q['pdfReference']['regions']),'Question figure clipped out of image'
    for item in q['positionedSourceItems']:
        loc=item.get('source')
        if not loc:continue
        for note in m['excludedNotes']:
            root=note['root']
            assert not (loc['stream']==root['stream'] and root['recordIndex']<=loc['recordIndex']<root['recordIndex']+note['excludedRecordCount']),'Answer/endnote leaked into question body'
    for r in q['questionPageCrops']:
        assert sha(HERE/r['file'])==r['sha256'],'Question image hash mismatch'
        assert r['page']<m['answerPageFirstOneBased'],'Answer page selected'
    assert q['scoreEvidence']['parentCountedOnce']
    if q['subQuestions']:
        assert sum(r['score'] for r in q['subQuestions'])==q['scoreEvidence']['referenceParentScore']
    assert not q['curriculum']['fullApproval']
    assert q['curriculum']['liveFamilyId'] is None and q['curriculum']['generatorRuleId'] is None

def checks(summaries):
    results=[]; mutations=[]
    for i,s in enumerate(SLUGS):
        m=load(HERE/s/'source-manifest.json'); p=load(HERE/s/'packet/questions.json')
        assert [q['number'] for q in m['questions']]==list(range(1,COUNTS[i]+1))
        assert m['questionCountFreshPdf']==COUNTS[i] and len(m['excludedNotes'])==COUNTS[i]
        assert all(not n['noteContentExported'] for n in m['excludedNotes'])
        for q in m['questions']: validate_question(m,q)
        assert len(p['questions'])==COUNTS[i]
        for q,pq in zip(m['questions'],p['questions']):
            assert q['sourceContentDigest']==pq['sourceContentDigest']
            assert not any(k.lower() in ['answer','solution','correctchoice','correct_choice','sol_ai','answerkey'] for k in pq)
            assert '정답' not in pq['stem']
            for r in pq['images']:
                f=(HERE/s/'packet'/r['file']).resolve()
                assert f.is_relative_to(HERE/s/'packet') and sha(f)==r['sha256']
        results.append({'examId':m['examId'],'coverageAndHashes':'pass','allQuestionCharacterAndFigureCropBounds':'pass','noteIsolation':'pass','packetAnswersWithheld':'pass','scoreAccounting':'pass','questionCount':COUNTS[i]})
    sang=load(HERE/'gyeongsang/source-manifest.json'); sin=load(HERE/'gyeongsin/source-manifest.json')
    assert sang['questions'][3]['sharedSourceContext'] is None
    assert sang['questions'][4]['sharedSourceContext']['pdfContextRegions']
    assert sang['questions'][5]['sharedSourceContext']['pdfContextRegions']
    assert sang['questions'][12]['structuredGivenData']['deviationPoints'][2] is None
    assert sum(len(r['leaves']) for r in sang['questions'][21]['structuredGivenData']['stemLeafRows'])==20
    assert sin['questions'][6]['scoreEvidence']['selectedHwpPdfPrintedParentScore'] is None
    assert sin['questions'][6]['scoreEvidence']['referenceParentScore']==5
    assert sin['identity']['decision'].startswith('hold') and sin['counts']['selectedPairParentScoreSum']==95
    assert len(load(HERE/'gyeongam/source-manifest.json')['questions'][8]['structuredGivenData']['points'])==15
    # Real fault cases: the validator must catch changes to source identity,
    # shared table, and a body item placed inside an excluded note record range.
    for name in ['source_hash_changed','shared_table_removed','note_record_leak']:
        bad=copy.deepcopy(sang);q=bad['questions'][4]
        if name=='source_hash_changed':bad['sourceFiles'][0]['sha256']='0'*64
        elif name=='shared_table_removed':q['sharedSourceContext']=None
        else:
            q['positionedSourceItems'].append({'kind':'text','text':'sentinel','source':copy.deepcopy(bad['excludedNotes'][4]['root'])})
            q['sourceContentDigest']=digest(binding(bad,q))  # Must fail isolation even after recomputing digest.
        try:validate_question(bad,q)
        except AssertionError:mutations.append({'case':name,'rejected':True})
        else:raise AssertionError('Fault accepted: '+name)
    write(HERE/'validation-results.json',{'status':'pass','paperChecks':results,'parentQuestions':106,'leafQuestions':116,
        'selectedPairAllQuestionComponentMatches':105,'noteSubtreesWithheld':106,'adversarialChecks':mutations,
        'notValidated':['new twin answers/solutions/figures','full grade approval','rights permission','current DB dedup','entire HWP/PDF exam equivalence'],
        'preservation':'custody-preservation.json','testsUsed':'Offline Python/PyMuPDF/OLE/PIL checks; no node/install/paid calls.'})

def emit_report(a,summaries,records):
    rows=[];details=[];question_rows=[]
    for r in summaries:
        c=r['counts'];s=r['slug'];m=load(HERE/s/'source-manifest.json')
        rows.append(f"| {r['school']} | {c['parentQuestions']} | {c['multipleChoiceParents']}+{c['writtenParents']} | {c['subquestionsInsideParents']} / {c['leafQuestions']} | {c['hwpPdfAllQuestionComponentsMatched']} | {c['selectedPairParentScoreSum']:g} / {c['originalReferenceParentScoreSum']:g} |")
        files='\n'.join(f"- `{x['path']}`\n  - SHA-256 `{x['sha256']}` ({x['bytes']} bytes)" for x in r['sourceFiles'])
        orig=r['originalScanReference']
        details.append(f"### {r['school']}\n\n- source exam ID: `{r['examId']}`; inventory ID: `{r['inventoryExamId']}`\n- Fresh manifest: `{r['manifest']}` · SHA-256 `{r['manifestSha256']}`\n- Source-only packet: `{r['packet']}` · SHA-256 `{r['packetSha256']}`\n{files}\n- 대조 원본 `{orig['path']}`\n  - SHA-256 `{orig['sha256']}`\n- 연도/정체 판정: `{r['identity']['decision']}`. 실제 원본 첫 페이지의 2025·중3·2학기 중간과 학교 인쇄 footer/저작권 표시를 읽었다. 완료본의 2026 대비 footer는 시험 연도로 사용하지 않았다.\n")
        for q in m['questions']:
            o=q['reviewObservation'];loc=o['originalQuestionLocator'];pages=','.join(str(x) for x in o['reviewedActualCompletedPages'])
            codes=', '.join(x['code'] for x in q['curriculum']['officialStandardsCandidates'])
            special=q['curriculum']['specificRisk'] or '특정 위반 미확정; 전체 학년/선수/매핑 검토 hold'
            if s=='gyeonggu' and q['number']==6:special+='; 표 0.5229 정확성 hold'
            if s=='gyeongsan' and q['number']==23:special+='; 정답 충돌 독립 풀이 hold'
            if s=='gyeongsin':special='연도/정체 P0 hold; '+special
            if s=='gyeongsin' and q['number']==7:special+='; 완료 쌍 배점 누락/원본 5점'
            question_rows.append(f"| {r['school']} {q['number']} | {pages} / {loc['physicalPdfPage']} {loc['column']} | {q['scoreEvidence']['referenceParentScore']:g} | {codes} | {q['curriculum']['coreMethodCandidate']} | {special} |")
    report=f"""# 다음 5편 실제 문항 소스 추출 r1 — 2026-10-08

다섯 시험의 실제 HWP/PDF/원본 스캔에서 **부모 문항 106개**를 새로 질문 전용으로 추출하고 지면을 대조했다. 소문항 15개를 부모 안에서 따로 기록했으며, 부모를 소문항으로 펼쳐 센 평가 단위는 **116개**다. HWP/PDF의 문항 본문·주어진 식·보기·도형 조건·배점까지 대응한 부모 문항은 **105개**다. 경신 7번은 본문·식·보기·도형이 대응하지만 완료 HWP/PDF 양쪽에 배점이 없고 원본에는 5점이 있어 별도 예외다. 문항 소스 검토는 수학적 정답, 전체 시험 파일 동치, 학년 승인 또는 권리 허가를 뜻하지 않는다.

**전체 시험 pair-certified 0, 전체 학년 승인 0, 권리 승인 0, 새 쌍둥이 0, verified twins 0.** 이 작업은 부모 세션의 범일 첫20 최종 집계/쌍둥이 제작을 맡지 않는다. 현재 DB는 읽지 않았다. 부모가 붙일 최신 scoped DB join은 이 소스 증거와 별개이며, Oct03 스냅샷을 현재 DB 중복 완료 근거로 쓰지 않는다.

## 새 산출물과 배포 경계

공통 루트는 `.qa-artifacts/exam-resume-20261008/next-five-extraction-r1/`이다. `extraction-index-r1.json`은 시험별 ID/해시/카운트, `review-observations.json`은 106문항의 실제 지면 위치·주어진 자료·핵심 방법 후보·보류, `input-provenance.json`은 AGENTS/최신 brief/addenda 및 읽은 변환기·공식 기준의 해시를 담는다. `custody-preservation.json`과 `validation-results.json`은 보존/검사 증거다.

부모가 새 저자에게 넘길 파일은 **각 학교의 `packet/` 디렉터리만**이다. 그 안의 `questions.json` 및 오프라인 `index.html`/`images/`는 질문 영역만 담고 정답·해설·HWP endnote·원본 정답표를 숨긴다. **`evidence/` 원본 스캔에는 학생 필기/답 흔적이 있어 저자에게 배포하면 안 된다.** 원본 답안표 페이지는 출력에서 제외했다. 새 질문 영역 이미지 106개는 원문 소스 증거이며 새 쌍둥이 도형이 아니다. HWP 수식 원문과 위치를 보존했으며 canonical LaTeX는 후속 제품 렌더 검토가 필요하다.

## 카운트와 배점

| 시험 | 부모 | 객관식+서술형 부모 | 부모 내부 소문항 / 펼친 평가 단위 | 문항 전체 요소 대응 | 완료 쌍 배점합 / 원본 참고합 |
|---|---:|---:|---:|---:|---:|
{chr(10).join(rows)}

부모 배점은 한 번만 합산했다. 경구20·21·22·23의 소문항은 각각 3·4·3·3개(배점 2+2+3 / 2+2+2+4 / 2+2+4 / 3+3+4), 경암17은 2개(5+5)다. 부모 총점에 소문항 점수를 다시 더하지 않는다. 옛 부모106 집계와 펼친116 집계는 서로 다른 기준이므로 누락/신규10문항으로 보고하지 않는다.

경산13은 실제 완료 PDF4쪽/원본3쪽의 **[3점]**을 확인하여 새 소스 배점100을 복원했다. 옛 PDF body97은 파서 누락 증거로 보존했다. 경신7은 완료 쌍 합95를 유지하며 원본 H 2쪽 오른쪽/삼동3쪽 오른쪽의 5점에서 원본 참고합100을 별도로 기록했다. 총점100이라는 기대만으로 채운 값이 아니다. 옛 HWP 답 추출 점수합 경구74·경산100·경상70·경신45·경암65와 옛 PDF body100·97·100·95·100도 새 추출과 구분한다.

## 실제 대조 방식

HWP5 OLE/압축 Section0을 읽어 UTF-16 제어 위치에 PARA_TEXT/수식(tag88)/그림(tag85)/표를 재결합했다. 각 문항에는 stream·recordIndex·inflatedByteOffset·payload SHA-256과 원본 equation script가 있다. 답/해설 endnote 106개는 하위 기록을 통째로 건너뛰었고, header/footer는 정체 증거에만 저장했다. PDF의 문항 시작·읽기 순서·페이지/열/bbox·문자 위치와 같은 문항의 그림 xref/rect/바이트 해시를 연결했다. 같은 크기 이미지의 RGB 차이는 보조 증거이며, 최종 도형 대응은 문항에 속한 HWP 그림 기록과 실제 지면의 라벨/조건 검토를 함께 기록했다. 전체 수식/단어 bag 일치는 전체 문항/시험 동치 근거로 쓰지 않았다.

완료 PDF 질문 영역 32페이지(경신6쪽은 빈 질문 페이지 포함), 선택 원본21페이지, 경신 추가 H 원본의 질문5페이지를 실제 렌더링해 열람했다. 총58페이지를 질문/정체 대조에 사용했다. 원본 H 6쪽은 답안표로 식별하여 패킷/보존 이미지에서 제외했다. 렌더는 원본에 쓰지 않았고, 감사용 원본 렌더의 lossless WebP 저장은 실제 열람 PNG와 RGB 픽셀 동일성을 검사했다. 읽기/렌더/추출 도구만 사용했으며 HWP GUI 변환·데스크톱 제어·설치·유료 API·DB 작업은 없었다.

## 중요 발견과 재개 우선순위

- **P0 경신 전17문항 연도/정체:** 원본 H 첫 페이지와 삼동 cover는 2025-09-19·중3·2학기 중간이며 학교 표시도 확인했다. 완료 PDF 첫 쪽2025와 이후2–6쪽2024, HWP의 혼합 헤더를 무단 교정하거나 filename으로2025를 확정하지 않았다. 원본 삼동은 cover+질문4쪽으로 마지막 서술형7(q17)이 빠져 있었다. 별도 H 원본5쪽에서 PO=17, OH=8,8점, △PAD 둘레 및 그림을 직접 대조하여 내용 누락은 해소했으나 완료 쌍 연도 정체 hold는 유지한다. 경신7의 문자 I 및 BO⊥AC는 실제 원본 H2쪽에 확인되었다. 경신9의 반지름 분수는 확대 재대조 결과 양쪽 **b/a**로 읽혀 차이를 기록하지 않는다.
- **P0 경산23 정답 충돌:** 수평 간격100m, 올려봄60°/내려봄45°, 묻는 대상이 **두 높이의 합**임을 본문/그림/원본에서 대조했다. 옛 key/독립 풀이의 불일치는 해결했다고 보고하지 않는다. 정답 선택 번호/옛 해설은 저자 패킷에 넣지 않았다. 부모의 독립 풀이/의미 검토가 재개 조건이다.
- **P0 경구6 원문 표 정확성:** sin32° 표 셀은 실제 원본/완료본 모두 **0.5229**다. 이를 수학적으로 정상인 값으로 조용히 바꾸지 않았다. 표의 출처 오류/오타인지 부모가 독립 검토해야 한다.
- **경상5·6 공통 자료:** `[5~6]` 삼각비 표가 HWP q5 앵커 전에 있어 q4의 마지막 보기로 흘러가는 경계를 수정했다. q5·q6 양쪽에 공유 자료/레코드/PDF 영역을 연결했고 q6 HTML에도 표를 제공한다. 경상 원본 PDF 물리 순서는 인쇄1·2·4·3쪽이므로 q14–18은 물리4쪽, q19–22는 물리3쪽으로 명시했다.
- **표/자료 복원:** 경상12(15치수),13(편차 **빈칸 None**,0으로 채우지 않음),14(10원자료와 분산/표준편차 보기),15(5종목),22(20줄기·잎) 및 경암1(5범주 도수),9(15점 산점도),16(10원자료),17(기준 학생과의5개 차이)를 실제 지면과 연결해 구조화했다. 경상12의 원문 `운동차의 치수` 오타, 경암17의 brace 흔적은 raw에 보존했다. 새 정답값을 채운 자료가 아니다.

## 적용 교육과정과 후속 제작 게이트

교육부 [2022-33 고시](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0)의 학년별 시행 일정(중1 2025, 중2 2026, 중3 2027)과 [2015-74 고시/별책8](https://www.moe.go.kr/boardCnts/view.do?boardID=141&boardSeq=60747&lev=0&m=0404)를 연결하면 2025 중3의 적용 교육과정은2015다. 이는 시행 일정에서 도출한 판단이며 경신의 시험 정체 보류를 해제하지 않는다. 기준 PDF SHA-256은 `4bd2b84e978865a71d90577d8eb6240f0ecf24a9884642d627cde460d71ab88e`다. 기존 실제 PDF 증거를 보존하고 공식 게시 링크를 다시 열어 확인했다.

문항별 후보는 9수03-09·10(PDF36/인쇄32),9수04-17·18·19·20(PDF38/인쇄34),9수05-06·07·08(PDF40/인쇄36) 중 실제 주제에 대응시켰다. middle-school band 성취기준 코드만으로 특정 학년·학기·선수 개념/전체 문항을 승인하지 않는다. `prisma/seed-data/units.ts` 중3 이차함수/삼각비/원의 성질/통계 후보와 읽기 전용 solver_rules/familyKey를 연결했지만 **live Unit ID/live family/generator rule ID는 null, 부모 후속 매핑 pending**이다. 옛 exam.json의 Unit/family 지정도 새 학년 승인으로 승격하지 않는다.

공식 제한(PDF39/인쇄35: 삼각비 사이 관계를 다루지 않음, 삼각비0–90°, 원과 비례 미취급, 과도하게 복잡한 도형 계산/형식 논증 회피; PDF37: 지나치게 복잡한 함수 활용 제한)을 개별 방법 후보에 적용했다. 특히 경신3의 접선-할선/방멱 필수 풀이, 경구10/경암18의 덧셈·반각 공식, 경상21의 코사인법칙을 허용 방법으로 쓰지 않는다. 대체 수선/직각삼각형/정의 풀이의 적법성이 불명확하면 hold, 대상 학년의 적법한 풀이가 없으면 reject다. 모든106문항의 발문·보기·도형·표기·정답 형식·학생 풀이·필수 절차·선수를 검토해야 하며 이 패킷은 전체 grade pass를 부여하지 않는다.

후속 저자는 addendum1/2에 따라 같은 개념/핵심 방법을 유지하면서 구조·소재·대수↔기하 표현 또는 결과→입력/조건의 역질문을 변경해야 한다. 숫자/학교명 교체만으로 변형을 승인하지 않는다. 부호·정의역·분모0·근호 부호·양수 길이/넓이·단위·해의 존재/유일성을 새 조건으로 검산한다. 새 twin ID/본문/그림·표/답/학생 해설/메타데이터/제품 렌더/독립 검산/학년·권리 심사를 새로 작성하며, 원문 key/옛43풀이/48draft/71crop은 검증 재사용 대상이 아니다. 엔진·이미지 템플릿도 같은 최우선 학년 게이트를 따른다.

## 시험별 경로·ID·해시

아래 상대 경로는 공통 루트에 대한 경로다. 문항별 파일/page/record/math/choice/figure/score 및 원본의 물리·인쇄 페이지는 각 manifest에 있고, sourceContentDigest는 파일 해시·원문/정규화 문장/보기·공유 표·배점·그림·레코드·원본 위치·검토를 함께 묶는다.

{chr(10).join(details)}
## 문항별 개념/방법 후보와 보류

모든 행은 학년·선수·live 매핑·canonical 제품 렌더·권리 hold를 공통으로 가진다. 아래 코드는 허용 범위의 검토 후보이며 승인 코드가 아니다. `완료/원본` 페이지는 물리 PDF 기준이며 정확한 인쇄 번호/열/bbox/레코드는 JSON에 있다.

| 문항 | 완료/원본 페이지·열 | 참고 부모 점수 | 기준 후보 | 핵심 방법 후보 (답 미포함) | 추가 보류/검토 |
|---|---|---:|---|---|---|
{chr(10).join(question_rows)}

## 보존과 검사

원본29파일, 기존175파일, 세 현행 원장과 보존 복사본, 경산여19 excludeFromLoad, 이전 next-five-audit/report의 해시를 재확인했다. 총{len(records)}건 모두 기존 해시와 같다. 기존 역사적106질문/48draft/43oldsolutions/71crops는 읽기 전용 참고이고 newly verified twins로 집계하지 않았다. source custody는 로컬 읽기/해시/지면 대응까지이며 이용 허가/공개 권리는 전106문항 pending이다.

각 시험의 문항 번호/개수, HWP 답노트106개 격리, 질문 record가 note subtree에 들어가지 않는지, PDF 답쪽 이전 crop,5보기/서술형 구분,106새이미지 해시,공유 표 연결,빈칸 None,자료 수20/15,부모/소문항 배점,다이제스트 및 패킷 경로를 검사했다. 출처 해시 변조·공유 표 제거·노트 record 삽입의 세 결함 주입을 모두 차단했다. 새 twin 정답/학년/권리/DB dedup/전체 시험 동치는 검사 통과라고 주장하지 않는다.

변경은 이 새 evidence 폴더와 이 보고서뿐이다. 부모/main/다른 세션/원본/옛 출력/원장/프로덕션 코드는 수정하지 않았다. 설치·DB·apply·unlock·delete/reload·배포·push를 수행하지 않았다. 이 feature branch의 로컬 커밋만 부모가 통합한다.
"""
    write(REPORT,report)
    write(HERE/'README.md',"# Question-only source extraction r1\n\nGive authoring workers ONLY each school's packet/ directory. Those folders contain 106 parent questions, 116 leaf assessment items, question-only crops and held curriculum candidates. Original answer/solution notes and key pages are withheld.\n\nAudit evidence/ scans may contain student answer annotations: do not distribute them to authoring. Full-exam equivalence, grade approvals, rights approvals and verified twins are all 0. DB join belongs to parent separately.\n\nOrder: extract_source.py → render_scans.py / explicit additional scan rendering → compact_evidence.py → finalize_source.py. Rerendering original scan PNGs requires recompact/review, never editing originals.\n\n"+'\n'.join(f"- [{r['school']} packet]({r['slug']}/packet/index.html) — {r['counts']['parentQuestions']} parents" for r in summaries)+'\n')
    obs=load(HERE/'review-observations.json')['questions']
    summary={'parentQuestions':106,'multipleChoiceParents':87,'writtenParents':19,'nestedSubquestions':15,'leafAssessmentItems':116,
        'verifiedQuestionContent':106,'selectedHwpPdfQuestionAllComponentsMatched':105,'selectedPairScoreExceptionQuestions':1,
        'entireExamPairCertified':0,'fullGradeApprovals':0,'rightsApprovals':0,'newTwinsAuthored':0,'verifiedTwins':0,
        'questionsWithUniversalGradeMappingRenderRightsHolds':106,'sourceIdentityHoldQuestions':17,
        'specificGradeMethodRiskQuestions':sum('specific_grade_method_risk' in q['sourceAmbiguityHolds'] for q in obs),
        'independentSolvingConflictHoldQuestions':1,'sourceLiteralNumericalAccuracyHoldQuestions':1,
        'currentDbDedupCompleted':False,'workerDbReads':0,'legacyDraftsReferenceOnly':48,'legacySolutionsReferenceOnly':43,'legacyCropsReferenceOnly':71,
        'selectedPairParentScoreSum':495,'originalReferenceParentScoreSum':500}
    write(HERE/'extraction-index-r1.json',{'version':'source-only-next-five-extraction-r1','createdAt':datetime.now(timezone.utc).isoformat(),
        'scope':SLUGS,'workspace':str(ROOT),'branch':'chrismathone/exam-twin-next-five-20261008','summary':summary,
        'papers':summaries,'ownedOutputs':[str(HERE),str(REPORT)],'reportSha256':sha(REPORT),
        'validationSha256':sha(HERE/'validation-results.json'),'preservationSha256':sha(HERE/'custody-preservation.json'),
        'distribution':'Only school packet/ directories. evidence/ scans are audit-only and may include annotations.',
        'currentDbStatus':'No worker DB read. Parent owns fresh scoped bank join; scoped absence is not global dedup completion.',
        'priorityHolds':['P0 Gyeongsin year/identity all17; selected pair q7 omitted score','P0 Gyeongsan23 independent-solving conflict','P0 Gyeonggu6 literal trig table accuracy','P1 specific legal grade methods/prerequisites; P2 all live Unit/family/generator mappings, rights and canonical render'],
        'newTwinProduction':{'status':'not_in_worker_scope','answersSolutionsFiguresMetadataVerification':'must regenerate in separate parent-distributed authoring; never reuse legacy approval'}})
    files=[{'file':str(p.relative_to(HERE)),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(HERE.rglob('*')) if p.is_file() and p.name!='artifact-index.json']
    write(HERE/'artifact-index.json',{'files':files,'report':{'path':str(REPORT),'sha256':sha(REPORT)}})
    return summary

if __name__=='__main__':
    a,s=compile_all()
    records=preservation(a)
    checks(s)
    summary=emit_report(a,s,records)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
