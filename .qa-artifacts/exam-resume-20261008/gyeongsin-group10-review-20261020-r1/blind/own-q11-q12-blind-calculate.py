from pathlib import Path
from fractions import Fraction as F
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group10-review-20261020-r1/blind')
h=lambda b:hashlib.sha256(b).hexdigest()
items=json.loads((p/'student-problems.json').read_text(encoding='utf-8-sig'))
exposure={'currentAuthoredAnswerOrSolutionExposed':False,'priorOriginalExposure':True,'details':'이전 허용된 원본 H 3쪽 열람에서 서술형 1·2의 조건과 그림이 함께 보였다. 관련 원·접선 문제와 다른 시험 문제도 검토한 이력이 있다. 이번 authored q11/q12의 저자 답·해설·비공개 패키지는 읽지 않았다. 완전히 미노출된 원본 문제라는 주장은 하지 않는다.','calculationSource':'이번 학생 발문과 학생 SVG만 사용; 원본 재열람·답 검색·좌표 측정 없음'}
a=F(108,2); angle=a/2
assert a==54 and angle==27 and 0<angle<90
# Exact witness angular locations, used for existence, not SVG coordinates.
angles={'K':F(0),'L':F(54),'M':F(108),'T':F(234)}
assert len(set(angles.values()))==4 and 108<angles['T']<360
u=F(4); pq=F(11); qr=F(16); v=pq-u; w=qr-v; pr=u+w
assert (u,v,w,pr)==(4,7,9,13)
assert all(x>0 for x in (u,v,w,pr))
assert pq+pr>qr and pq+qr>pr and qr+pr>pq
s=(pq+qr+pr)/2
assert (s-qr,s-pr,s-pq)==(u,v,w)
calculations={'q11':{'centralKM':'108','centralKL':str(a),'inscribedKTL':str(angle),'exactExistenceWitnessAngularDegrees':{k:str(v) for k,v in angles.items()},'uniqueness':'T가 L을 포함하지 않는 호 KM의 어느 점이든 T를 포함하지 않는 작은 호 KL은 고정되어 원주각은 27도이다. 반대 호의 원주각이나 반사각을 선택하지 않는다.'},'q12':{'PU_PW':str(u),'QU_QV':str(v),'RV_RW':str(w),'PR':str(pr),'semiperimeter':str(s),'triangleInequalityMargins':[str(pq+pr-qr),str(pq+qr-pr),str(qr+pr-pq)],'uniqueness':'각 꼭짓점의 접선 길이가 차례로 4,7,9로 강제되므로 PR=13만 가능. 엄격한 삼각부등식으로 이 세 변의 삼각형이 존재하고 내접원의 접선 분할도 주어진 값과 일치한다.'}}
solutions={11:'같은 원에서 길이가 같은 두 작은 호 KL, LM에 대한 중심각은 같다. L은 작은 호 KM 위에 있으므로 ∠KOL=108°÷2=54°이다. T는 L을 포함하지 않는 호 KM 위에 있으므로 ∠KTL은 작은 호 KL에 대한 원주각이다. 따라서 ∠KTL=54°÷2=27°이다. 반지름이 양수인 원에서 K, L, M을 차례로 잡고 반대쪽 호에 T를 잡으면 조건을 만족한다. 허용된 T의 위치가 달라져도 같은 작은 호 KL에 대한 원주각이므로 답은 유일하다.',12:'한 점에서 원에 그은 두 접선의 길이는 같으므로 PW=PU=4 cm이다. QU=PQ−PU=11−4=7 cm이므로 QV=7 cm이다. 따라서 RV=QR−QV=16−7=9 cm이고 RW=9 cm이다. 그러므로 PR=PW+WR=4+9=13 cm이다. 접선 조각 4, 7, 9는 모두 양수이고, 세 변 11, 16, 13은 삼각부등식을 만족하므로 조건에 맞는 삼각형이 존재한다. 위의 접선 길이들은 순서대로 정해지므로 PR의 값도 유일하다.'}
for item in items:
 q=item['questionNumber']; assert item['choices']==[]
 fig=item['figures'][0]; actual=h((p/fig['svgPath']).read_bytes()); assert actual==fig['sha256']
 projection={k:v for k,v in item.items() if k!='studentDigest'}
 digest=h(json.dumps(projection,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())
 # Provided digest binding is retained; record the independently computed projection too.
 basis={
 'stem':{'status':'proposed-in-scope','basis':'q11: 같은 호의 중심각과 원주각. q12: 한 점에서 그은 접선 길이. 해당 학생 발문에 직접 필요한 성질만 사용.'},
 'choices':{'status':'not-applicable','basis':'실제 두 문항 choices=[]인 서술형이며 보기나 선택 기호를 만들지 않았다.'},
 'figure':{'status':'student-view-checked','basis':'학생 SVG를 로컬 렌더하여 실제 확인. q11 K,L,M의 작은 호 순서와 반대 호 T, 중심 O 및 각 표기; q12 삼각형 내접원과 U,V,W의 변상 위치가 발문과 대응한다. 길이·각의 픽셀 측정 없음.'},
 'notation':{'status':'proposed-in-scope','basis':'중심·원주각, 작은 호, 접점, 선분 및 도·cm 표기는 중학교 기하 표기이다.'},
 'answer':{'status':'independently-solved','basis': '정확한 유리수 연산으로 '+('27도이며 각의 크기 단위 사용.' if q==11 else '13 cm이며 길이 단위 사용.')},
 'solution':{'status':'own-method-proposed-author-unseen','basis':'자체 학생 풀이는 '+('같은 호에 대한 중심각을 반으로 나누는 원주각 성질만 사용한다.' if q==11 else '두 접선 길이의 동일성과 자연수 뺄셈·덧셈만 사용한다. 접선 길이 성질은 공통 빗변과 같은 반지름을 가진 두 직각삼각형의 합동으로 설명 가능하다.')+' 저자 전체 해설과 채점기준은 아직 미노출이므로 판정하지 않았다.'},
 'prerequisites':{'status':'2015-M3-after-prerequisites-proposal','basis':('2015 9수04-20 원주각 및 같은 호의 중심각 성질 이후.' if q==11 else '2015 9수04-19 원의 접선 성질, 이전 삼각형 합동·삼각부등식·내접원 이해 이후.')+' 이미 확인한 공식 2015 교육과정과 중3 2학기 배치에 근거한 학생 방법 제안이며 이 새 문항의 정식 7면 승인·2022 배치 인증은 아니다.'}}
 raw={'studentDigest':item['studentDigest'],'solverId':'independent-helper-gyeongsin-group10-20261020','answer':'27°' if q==11 else '13 cm','solution':solutions[q],'evidence':{'exposure':exposure,'ownCalculation':calculations[f'q{q}'],'figureSha256':actual,'studentProjectionSha256':digest,'studentDigestProjectionMatches':digest==item['studentDigest'],'choicesCheck':'서술형: 실제 보기 0개, 검토할 객관식 보기 없음','gradeSurfaceProposals':basis,'limits':['원문·저자 답과 비교하지 않음','정식 수학/학년/출처/권리/실시간 family/native/loadable 승인 아님','2022 교육과정 배치 및 저자 채점기준 미검토']},'status':'solved'}
 (p/'solve').mkdir(exist_ok=True)
 with (p/f'solve/q{q}.json').open('x',encoding='utf-8') as f: json.dump(raw,f,ensure_ascii=False,indent=2);f.write('\n')
results={'inputSha256':h((p/'student-problems.json').read_bytes()),'exposure':exposure,'calculations':calculations,'probe':'UTF8 write/read passed; initial console cp949 print failure retained by script execution history; rerun PYTHONIOENCODING=utf-8 succeeded','checks':'Fractions exact arithmetic, strict triangle inequalities, positive lengths, angular ordering, SVG byte hashes; no pixel oracle','rawHashes':{f'q{q}':h((p/f'solve/q{q}.json').read_bytes()) for q in (11,12)}}
with (p/'own-q11-q12-blind-results.json').open('x',encoding='utf-8') as f:json.dump(results,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(results['rawHashes']))
