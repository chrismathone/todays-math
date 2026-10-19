import json,hashlib
from pathlib import Path
from fractions import Fraction
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group6-review-20261020-r2/blind')
with (p/'own-q07-blind-utf8-probe.txt').open('x',encoding='utf-8') as f:f.write('독립 학생 풀이 UTF-8 확인: 정삼각형, 닮음, 지름.\n')
assert (p/'own-q07-blind-utf8-probe.txt').read_text(encoding='utf-8')=='독립 학생 풀이 UTF-8 확인: 정삼각형, 닮음, 지름.\n'
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
a=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))[0];m=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'))
assert sha(p/'student-problems.json')==m['studentProblemsSha256']
digest=hashlib.sha256(json.dumps({k:v for k,v in a.items() if k!='studentDigest'},ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();assert digest==a['studentDigest']
assert sha(p/'figures/q07-1.svg')==a['figures'][0]['sha256']==m['figures'][0]['sha256']
# r>0, OM=r/2, OT^2=3r^2/4. AA implies OU/OT=(OM*r)/OT^2=2/3.
ou_ot=Fraction(1,2)/Fraction(3,4);tu_ot=1-ou_ot
assert ou_ot==Fraction(2,3) and tu_ot==Fraction(1,3)
tu_squared=Fraction(3);ot_squared=tu_squared/tu_ot**2;r_squared=ot_squared/Fraction(3,4)
assert ot_squared==27 and r_squared==36 and 6**2==r_squared
options=[8,10,12,14,16]
checks=[{'choice':'①②③④⑤'[i],'diameter_cm':d,'radius_cm':str(Fraction(d,2)),'implied_TU_squared_cm2':str(Fraction(d*d,48)),'equals_given_3':Fraction(d*d,48)==3} for i,d in enumerate(options)]
assert [x['choice'] for x in checks if x['equals_given_3']]==['③']
solution='원의 반지름을 r cm라 하자(r>0). OP=OQ=PQ이므로 △OPQ는 정삼각형이다. PM⊥OQ이므로 정삼각형의 높이는 밑변을 이등분하여 OM=MQ=r/2이다. 또 원의 중심 O를 지나는 직선 OQ가 현 PR에 수직이므로 PM=MR이다. 따라서 Q는 PR의 수직이등분선 위에 있어 QP=QR이고, QR=r이다. OQ=OR=QR이므로 △OQR도 정삼각형이다. OT⊥QR이므로 QT=TR=r/2이다. 직각삼각형 OTQ에서 OT²=r²−(r/2)²=3r²/4이다. △OMU와 △OTQ는 ∠OMU=∠OTQ=90°이고, OM과 OQ, OU와 OT가 각각 같은 방향에 있어 O에서의 각도 같으므로 닮음이다. 대응은 O↔O, M↔T, U↔Q이다. 따라서 OM/OT=OU/OQ이고, OU/OT=(OM·OQ)/OT²=(r²/2)/(3r²/4)=2/3이다. U는 선분 OT 위에 있으므로 TU=OT−OU=OT/3이다. TU=√3 cm이므로 OT=3√3 cm이고, 27=3r²/4에서 r²=36이다. 반지름은 양수이므로 r=6 cm, 지름은 12 cm이다. 따라서 정답은 ③이다. 지름을 8,10,12,14,16 cm로 각각 놓으면 TU²는 4/3,25/12,3,49/12,16/3 cm²이므로 주어진 TU²=3과 일치하는 보기는 ③뿐이다.'
existence='반지름6의 원에서 OQ=OR=QR=6인 정삼각형 OQR를 만들고 R을 직선 OQ에 대칭시킨 점을 P로 잡는다. 반사로 OP=6, PQ=QR=6이므로 P도 원 위에 있다. PR⊥OQ이고 M은 OQ의 중점이다. T는 QR의 중점으로 OT=3√3>0이다. OMU~OTQ의 닮음에서 OU=2OT/3=2√3이므로 U는 OT 내부, TU=√3>0이다. 양의 한 반지름에서 모든 조건이 동시에 성립하므로 존재한다. 닮음은 모든 허용 배치에서 r²=36을 강제하고 양의 r만 취하여 지름이 유일하다. 반사·회전된 도형까지 배치가 하나라는 주장은 하지 않는다.'
exposure={'currentAuthoredQ07R2AnswerSolutionMetadataExposedBeforeRaw':False,'priorOriginalQ07PageExposure':True,'declaration':'현재 authored GYEONGSIN q07 r2의 답·해설·메타데이터를 읽지 않았다. 이전 허가된 원본 H 전체 페이지 검토에서 원래 q07의 조건·그림에 우연히 노출된 이력이 있다. 완전한 원문 비노출을 주장하지 않으며 이번 학생 조건으로 독립 계산했다. 현재 저자/비공개 패키지/원본을 재열람하지 않았다.'}
evidence={'exposureDeclaration':exposure,'exactArithmetic':{'OU_over_OT':str(ou_ot),'TU_over_OT':str(tu_ot),'TU_squared_cm2':str(tu_squared),'OT_squared_cm2':str(ot_squared),'radius_squared_cm2':str(r_squared),'radius_cm':6,'diameter_cm':12,'OM_QM_cm':3,'QT_TR_cm':3,'PM_MR_cm':'3√3','OT_cm':'3√3','OU_cm':'2√3','TU_cm':'√3'},'allChoices':checks,'AAcorrespondence':{'triangles':'OMU ~ OTQ','mapping':{'O':'O','M':'T','U':'Q'},'rightAngles':'OM⊥MU because OQ⊥PR; OT⊥TQ by definition of foot T.','commonAngle':'OM and OQ are along same ray, OU and OT same ray; U lies on segment OT.','sidePairs':'OM↔OT,OU↔OQ,MU↔TQ'},'domains':'r>0; OM=r/2>0, OT=r√3/2>0, OU=2OT/3>0, TU=OT/3>0. Ratio denominators OT,OQ,OT² are nonzero. Positive lengths select r=+6; r=−6 is rejected. cm for lengths, cm² for squares.','existenceUniqueness':existence,'studentMethod':'정삼각형의 높이와 밑변 이등분, 중심에서 현에 내린 수선, 수직이등분선, AA삼각형닮음, 피타고라스, 제곱근 계산. 사인법칙·외접반지름·현곱/할선곱/원과비례 일반공식·좌표를 학생 방법으로 쓰지 않았다.','figureCheck':'학생 SVG를 PyMuPDF로 자체 PNG로 변환해 P,Q,R의 원 위 위치, Q-M-O 및 O-U-T 순서, PR과 OQ 및 QR과 OT의 직각 관계와 표기를 육안 확인했다. 픽셀·SVG좌표로 길이나 각을 계산하지 않았다.','renderDiagnostic':'CairoSVG import failed because libcairo DLL is unavailable; no install or input change. PyMuPDF succeeded. This is a local viewing-tool failure, not a math pass claim.','bindings':{'studentDigest':digest,'studentProblemsSha256':sha(p/'student-problems.json'),'svgSha256':sha(p/'figures/q07-1.svg')},'scopeLimits':'학생 raw 풀이만 봉인; 별도 학년 심사·출처·권리·가족·native·배포 승인 및 승인개수 증가는 없다.'}
raw={'studentDigest':digest,'solverId':'independent-retained-helper-gyeongsin-q07-r2','answer':'③','solution':solution,'evidence':evidence,'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
for file,obj in [(p/'own-q07-blind-calculations.json',evidence),(p/'solve/q07.json',raw)]:
 with file.open('x',encoding='utf-8') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
assert json.loads((p/'solve/q07.json').read_text(encoding='utf-8'))['answer']=='③'
print(json.dumps({'rawSha256':sha(p/'solve/q07.json'),'answer':'③','diameter_cm':12,'studentDigest':digest},ensure_ascii=False))

