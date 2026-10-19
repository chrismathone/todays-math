import json, hashlib
from pathlib import Path
from fractions import Fraction
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group5-review-20261020-r2/blind')
probe=p/'own-q05-blind-utf8-probe.txt'
with probe.open('x',encoding='utf-8') as f:f.write('독립 풀이 UTF-8 읽기·쓰기 확인: 원주각, 닮음, 양의 길이.\n')
assert probe.read_text(encoding='utf-8')=='독립 풀이 UTF-8 읽기·쓰기 확인: 원주각, 닮음, 양의 길이.\n'
a=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0]
b={k:v for k,v in a.items() if k!='studentDigest'}
digest=hashlib.sha256(json.dumps(b,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert digest==a['studentDigest'],(digest,a['studentDigest'])
fig=p/a['figures'][0]['svgPath']
assert hashlib.sha256(fig.read_bytes()).hexdigest()==a['figures'][0]['sha256']
assert 30**2-24**2==18**2
ratio=Fraction(10,30)
assert ratio*18==6 and ratio*24==8
options=[4,5,6,8,10]
checks=[{'mark':'①②③④⑤'[i],'length_cm':v,'PQ_squared_from_right_triangle':v*v+8*8,'equals_100':v*v+64==100,'similarity_ratio_matches':Fraction(v,18)==ratio} for i,v in enumerate(options)]
assert [x['mark'] for x in checks if x['equals_100'] and x['similarity_ratio_matches']]==['③']
assert 24**2-8**2==512 and 512==16**2*2
exposure={'current_authored_q05_r2_answer_or_solution_exposed':False,'current_authored_student_question_unseen_before_this_student_packet':True,'prior_original_q05_page_incidental_exposure':True,'history':'직전 허가된 q06 원본 H 전체 페이지에 원래 q05 그림·조건이 함께 보여 노출된 이력이 있다. 현재 authored q05 r2의 저자 답·해설·비공개 자료는 읽지 않았다. 완전한 원문 비노출을 주장하지 않는다. 이번 답은 현재 학생 조건에서 독립 계산했다.'}
existence='18,24,30인 직각삼각형 PRD를 만들고 PD를 지름으로 하는 원을 그리면 반지름은 15이다. R을 지나지 않는 반원 PD에서 P로부터 현의 길이가 10인 Q를 잡을 수 있다(0<10<30). Q는 P와 D 사이에 있고 순서는 P,Q,D,R이다. Q에서의 각은 직각삼각형 PDR의 예각과 같고, R에서의 각도 작은 호 PQ에 대한 예각이므로 P의 수선의 발은 QR 내부에 있다. 따라서 조건을 만족하는 구성이 존재한다. 반사된 배치까지 도형 자체가 유일하다는 주장은 하지 않으며, 모든 허용 배치에서 아래 닮음으로 요구 길이가 유일하다.'
solution='반지름이 15 cm이므로 지름 PD=30 cm이다. 지름에 대한 원주각 ∠PRD는 직각이다. 따라서 직각삼각형 PDR에서 DR²=30²−24²=324이고, 길이는 양수이므로 DR=18 cm이다. H가 QR의 내부에 있고 PH⊥QR이므로 ∠PQH는 예각이다. 따라서 Q와 D는 현 PR의 같은 쪽 호에 있으며, 같은 현 PR에 대한 원주각으로 ∠PQH=∠PQR=∠PDR이다. 또 ∠PHQ=∠PRD=90°이므로 △PQH와 △PDR는 Q↔D, H↔R, P↔P의 대응으로 닮음이다. 그러므로 QH/DR=PQ/PD=10/30=1/3에서 QH=6 cm이다. 또한 PH=24/3=8 cm이고, PQ²=6²+8²=100으로 주어진 길이와 일치한다. 보기 4,5,6,8,10 cm를 각각 QH에 넣으면 QH²+8²는 80,89,100,128,164이므로 ③만 가능하다. 모든 길이는 양수이며 HR²=24²−8²=512>0이어서 H가 내부인 조건과 모순이 없다. 조건을 만족하는 도형은 지름 30인 원에 PR=24, PQ=10인 현을 그림의 순서대로 잡아 구성할 수 있으며, 위 닮음비는 모든 허용 배치에 공통이므로 요구 길이는 유일하다.'
evidence={'exposureDeclaration':exposure,'method':'지름의 원주각, 같은 현에 대한 원주각, 두 각이 같은 삼각형의 닮음, 피타고라스 정리','exactCalculations':{'PD_cm':30,'DR_squared_cm2':324,'DR_cm':18,'similarity_ratio':str(ratio),'PH_cm':8,'QH_cm':6,'HR_squared_cm2':512,'HR_cm':'16√2','QR_cm':'6+16√2'},'allChoices':checks,'existenceAndUniqueness':existence,'domains':'반지름, 현, 지름과 QH,PH,HR는 모두 양수. 분모 PD=30,DR=18,PR=24는 0이 아니다. 제곱근은 양의 길이만 채택한다. 길이 cm, 제곱 cm².','figureInspection':'학생 PNG를 육안으로 확인하고 SVG의 라벨만 확인했다. H의 내부 위치, 수선 표시, PD 지름 및 점 순서를 확인했으며 픽셀이나 SVG 좌표를 수치 계산에 쓰지 않았다.','studentDigestRecomputed':digest,'figureSha256Verified':a['figures'][0]['sha256'],'limitations':'현재 학생 문제의 독립 수학 풀이이며 학년·권리·출처·가족·배포 승인이나 승인 개수 증가를 뜻하지 않는다.'}
raw={'studentDigest':digest,'solverId':'independent-retained-helper-gyeongsin-q05-r2','answer':'③','solution':solution,'evidence':evidence,'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
for target,obj in [(p/'own-q05-blind-calculations.json',evidence),(p/'solve/q05.json',raw)]:
 with target.open('x',encoding='utf-8',newline='\n') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
assert json.loads((p/'solve/q05.json').read_text(encoding='utf-8'))['answer']=='③'
print(json.dumps({'studentDigest':digest,'rawSha256':hashlib.sha256((p/'solve/q05.json').read_bytes()).hexdigest(),'choiceChecks':checks},ensure_ascii=False))
