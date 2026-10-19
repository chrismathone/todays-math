from pathlib import Path
from fractions import Fraction as F
import json,hashlib,re,xml.etree.ElementTree as ET
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group4-review-20261020-r1/blind');h=lambda b:hashlib.sha256(b).hexdigest()
probe='GYEONGSIN q06 독립 풀이 UTF-8: 원주각·중심각·꼭짓점 순서'
with (p/'own-q06-blind-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as f:f.write(probe+'\n')
assert (p/'own-q06-blind-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
inputBytes=(p/'student-problems.json').read_bytes();data=json.loads(inputBytes.decode('utf-8-sig'))[0];manifest=json.loads((p/'blind-manifest.json').read_text(encoding='utf-8-sig'));assert h(inputBytes)==manifest['studentProblemsSha256']
student={k:v for k,v in data.items() if k!='studentDigest'};assert h(json.dumps(student,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==data['studentDigest']
figure=p/'figures/q06-1.svg';assert h(figure.read_bytes())==manifest['figures'][0]['sha256']==data['figures'][0]['sha256']
xml=ET.fromstring(figure.read_bytes());labels=[x.attrib['data-label'] for x in xml.iter() if 'data-label' in x.attrib]
assert all(s in labels for s in ['P','Q','R','S','T','O','95°','108°','x'])
# Coordinates are never parsed or used. Order P-Q-R-S-T and marks were visually
# confirmed in the supplied student PNG; values come only from stated95/108.
angles=re.findall(r'=(\d+)\^\\circ',data['content']);assert angles==['95','108']
P,S=map(F,angles);assert 0<P<180 and 0<S<180
RPT=F(180)-S;QPR=P-RPT;target=2*QPR
assert RPT==72 and QPR==23 and target==46 and 0<target<180
reflex=360-target;assert reflex==314 and target<reflex
# Independent arc bookkeeping and exact constructive existence witness.
arcQRST=2*P;arcQPT=360-arcQRST;arcRQPT=2*S;arcQR=arcRQPT-arcQPT
assert arcQRST==190 and arcQPT==170 and arcRQPT==216 and arcQR==target
arcs={'PQ':F(85),'QR':target,'RS':F(72),'ST':F(72),'TP':F(85)}
assert all(v>0 for v in arcs.values()) and sum(arcs.values())==360
assert (arcs['QR']+arcs['RS']+arcs['ST'])/2==P
assert (arcs['QR']+arcs['PQ']+arcs['TP'])/2==S
assert all(v<180 for v in arcs.values())
options=[]
for mark,text in zip('①②③④⑤',data['choices']):
 match=re.fullmatch(r'\$(\d+)\^\\circ\$',text);assert match
 candidate=F(match[1]);candidateQPR=candidate/2;impliedP=RPT+candidateQPR
 options.append({'mark':mark,'candidateCentralDegrees':str(candidate),'impliedQPRDegrees':str(candidateQPR),'RPTFromRST':str(RPT),'impliedQPTDegrees':str(impliedP),'matchesStated95':impliedP==P,'validSmallAngleDomain':0<candidate<180})
assert [x['mark'] for x in options if x['matchesStated95']]==['③'];assert len(set(x['candidateCentralDegrees'] for x in options))==5
calc={'inputHashes':{name:h((p/name).read_bytes()) for name in ['SOLVE-BRIEF.md','student-problems.json','blind-manifest.json']},'studentDigestRecomputed':data['studentDigest'],'figure':{'svgSha256':h(figure.read_bytes()),'pngSha256':h((p.parent/'student-preview/q06.png').read_bytes()),'labels':labels,'visuallyChecked':'P,Q,R,S,T occur consecutively around circle; center O and radii OQ/OR;95 atP betweenPQ/PT,108 atS betweenSR/ST; targetx atO betweenOQ/OR.','coordinatesOrPixelsUsedAsNumericOracle':False},'primaryStudentMethod':{'auxiliary':'draw chord PR','cyclicQuadrilateral':'PRST has opposite angles RPT and RST supplementary','RPT':str(RPT),'angleSubtraction':'ray PR lies inside angleQPT due to confirmed cyclic order P-Q-R-S-T;QPR=QPT-RPT','QPR':str(QPR),'centralAngle':'same arcQR center angle is twice inscribed angleQPR;46<180 so this is the small angle','targetDegrees':str(target),'otherReflexDegrees':str(reflex)},'arcCheck':{'arcQRST':str(arcQRST),'complementArcQPT':str(arcQPT),'arcRQPT':str(arcRQPT),'arcQR':str(arcQR)},'existenceWitness':{'consecutiveArcsDegrees':{k:str(v) for k,v in arcs.items()},'sum360':True,'allStrictlyPositive':True,'allLessThan180':True,'angleQPT':str(P),'angleRST':str(S),'reason':'Place5distinctpoints in this arc order on any positive-radius circle. The intercepted arcs give exactly95and108, andQRgives46. This construction uses angle measures only, not SVG positions.'},'allFiveOptions':options,'uniqueness':'Target angle is forced by180-108=72,95-72=23,and2*23=46. Shape/radius/individual other arcs are not unique; the requested angle and correct option are unique under the given cyclic ordering.','domainUnits':'angles in degrees; positive radius, distinct ordered circle points, positive arcs and chords in existence witness; no denominator or radical domains in task','studentGradeMethod':'M3 circle geometry: cyclic quadrilateral opposite angles and inscribed/central angle relation, basic angle subtraction; no trigonometry, coordinate geometry or advanced cyclic-polygon formula. Blind raw is not a formal grade approval.','utf8WriteReadPassed':True,'currentAuthorAnswerExposure':False,'priorExposureHistory':'Earlier work included other authorized item/source summaries; no claim of never seeing any original exam. Current GYEONGSIN authoredq06/answer unseen before student packet.','newApprovalCounts':0}
with (p/'own-q06-blind-calculations.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(calc,f,ensure_ascii=False,indent=2);f.write('\n')
solution='그림에서 원 위의 점은 P,Q,R,S,T의 순서이며, 표시된95°는∠QPT,108°는∠RST이다. 보조선 PR을 그으면 사각형 PRST도 원에 내접하므로 마주 보는 두 각의 합은180°이다. 따라서 ∠RPT=180°−108°=72°이다. 꼭짓점 순서에 의해 반직선 PR은∠QPT의 내부에 있으므로 ∠QPR=95°−72°=23°이다.\n\n∠QPR은 P를 포함하지 않는 호QR에 대한 원주각이다. 같은 호에 대한 중심각은 그 두 배이므로 ∠QOR=2×23°=46°이다.46°<180°이므로 이것이 문제에서 묻는 작은 중심각이고, 다른 쪽 중심각은314°이다.\n\n존재도 확인할 수 있다. 한 원에서 이웃한 호PQ,QR,RS,ST,TP의 크기를 각각85°,46°,72°,72°,85°로 잡으면 모두 양수이고 합은360°이다. 이때 ∠QPT가 보는 호QRST는190°라서 원주각이95°이고,∠RST가 보는 호RQPT는216°라서 원주각이108°이다. 따라서 주어진 조건을 만족하는 서로 다른 다섯 점의 도형이 실제로 존재한다. 도형의 모양이나 반지름 자체는 여러 가지지만 위 각 계산에 따라 목표 각은 항상46°로 유일하다.\n\n다섯 보기의 중심각42°,44°,46°,48°,50°를 각각 쓰면 대응하는∠QPR은21°,22°,23°,24°,25°이고,∠RPT=72°를 더한∠QPT는93°,94°,95°,96°,97°가 된다. 주어진95°와 맞는 것은③46° 하나뿐이다. 단위는도(°)이며, 그림의 좌표나 픽셀을 재서 각도를 구하지 않았다.'
raw={'studentDigest':data['studentDigest'],'solverId':'independent-helper-gyeongsin-q06-blind-20261020-r1','answer':'③','solution':solution,'evidence':{'noCurrentAuthorAnswerExposureDeclaration':'현재 GYEONGSIN authoredq06의 정확한 문항·저자답·해설을 본 적이 없다고 학생 파일 열람 전에 선언했다. 이전에 다른 허용문항/원문요약을 본 이력은 있으므로 모든 원본 시험에 미노출이었다고 주장하지 않는다. 이번에는 지정된 학생brief/manifest/problem,학생PNG와학생SVG만 읽었고 parent/author/private/source/spec/답검색에 노출되지 않고 독립적으로 풀었다.','ownCalculationsFile':'../own-q06-blind-calculations.json','targetDegrees':'46','allFiveChoicesChecked':True,'cyclicOrderAndLabelsVisuallyChecked':True,'existenceWitnessArcsDegrees':['85','46','72','72','85'],'targetUniqueShapeNotClaimedUnique':True,'noCoordinatePixelNumericOracle':True,'studentMethod':'보조선PR,원에내접하는사각형의대각의합180°,원주각과중심각관계. 삼각함수·좌표·일반다각형공식 불필요;blind단계정식grade승인아님.','utf8WriteReadPassed':True,'newApprovalCounts':0},'status':'solved'}
(p/'solve').mkdir(exist_ok=True)
with (p/'solve/q06.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
assert raw['answer']=='③' and isinstance(raw['solution'],str);assert (p/'student-problems.json').read_bytes()==inputBytes
print('Exact angle/arc arithmetic, all5choices, diagram labels/order, existence and target uniqueness verified')
print('raw SHA256 '+h((p/'solve/q06.json').read_bytes()))
