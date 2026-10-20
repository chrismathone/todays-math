from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent.parent;E=Path(__file__).resolve().parent;rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();items=rd(P/'verification/verification-inputs.json');primary=rd(E/'own-primary-and-unit-receipt.json');(P/'verification/reports').mkdir(exist_ok=True)
shared={'currentRawSeal':{'helperCommit':'e06f9e1bd6be8625655ac72b2103137ebd77ea5d','parentCommit':'3193b0a43828b8d32b11cc1c87e974f35640b002','rawNeverModifiedAfterExposure':True},'exposure':'기존 원문9개 구성요소·공개 엔진·Gachang 메타데이터/코드 감사 이력이 있으며 pristine corpus blindness를 주장하지 않는다. 현재 저자 답/해설/스펙 및 이번 원문 두 구성요소·첫페이지는 raw Git봉인 뒤 처음 읽었다. 원문 페이지의 손글씨와 다른 문항이 부수적으로 보였으나 답 일치나 정답표를 승인 근거로 쓰지 않았다.','primaryEvidence':{'receipt':'../../own-review-evidence-r1/own-primary-and-unit-receipt.json','receiptSHA256':sha(E/'own-primary-and-unit-receipt.json'),'edition':'2015 source2025/practice2026 M3;2027M3/2022 pending separately','limitations':'기존 검증된 실제 공식문서 텍스트/record/page 포인터와 현재 제공 원문·Unit 캡처를 범위 한정 사용. 새 다운로드나 완전 개정연혁/학교 진도 승인 주장 없음.'},'unresolved':{'liveExactFamily':None,'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeReaderParity':False,'nativeProvenanceApproved':False,'loadable':False,'whole19HwpPdfPairApproved':False,'pdfParser5Versus19':'partial-held; no fidelity/count credit','2022M3From2027':'pending'},'ownCalculations':{'path':'../../own-review-evidence-r1/own-exact-review-calculations.json','sha256':sha(E/'own-exact-review-calculations.json'),'passed':59,'failed':0,'method':'Own Fraction coefficient/radical pair arithmetic; original raw oracle separate from author. Private coordinates checked only post-seal for model consistency, never answer oracle.'},'imagesActuallyViewed':['solution-preview/q01.solution.png','solution-preview/q02.solution.png','local-only original-first-page.local.png'],'metadataConcern':'두 후보 curriculumReview.officialBasis.primaryStandardCodes의9수01-07은 실제 핵심 기준과 일치하지 않는 잔존 필드다. q01의 실제 주기준9수02-12, q02의9수01-10을 독립 확인했다. 기존후보를 수정하지 않으며 이 메타데이터 불일치와 가족 미확정을 content hold에 보존한다.'}
per={1:{'checkBasis':{
'answerCorrect':'봉인 raw②와 저자② 일치. (3-a)^2=a²-6a+9, a≠0에서 유일한 k=-6. 원문 답 비교를 사용하지 않았다.',
'solutionCorrect':'저자 전체 해설의 남은 변a-3>0, (3-a)=-(a-3), 제곱값 동일, 전개9-6a+a²를 각각 확인했다. 마지막 계수 비교는 (k+6)a=0과 a>3으로 초등적 정당화 가능하며 고등학교 다항식 항등식 판정법을 요구하지 않는다.',
'existenceUniqueness':'임의의 a>3에서 변a-3>0, 넓이(a-3)²>0이다. k=-6은 모든 a>3에서 존재하고 다른 k는 비영인 a에 대해 불가. a 자체의 유일성은 묻지 않는다.',
'choicesCorrect':'보기 -9,-6,-3,3,6의 a계수 잔차 -6-k는3,0,-3,-9,-12로②만0. 선택지는 중복되지 않는다.',
'figureConsistent':'student SVG와private SVG SHA동일, spec SHA바인딩확인. 실제 학생/solution PNG의 위·오른쪽 회색 띠와 아래왼쪽 남은 부분, a/3cm표기가 발문과 맞는다. post-seal spec의 두 정사각형은 직교·같은변, 차3인 한 양수 예이나 a를10으로 정하지 않는다. 라벨에는 치수선이 없으나 폭3은 본문에 명시되어 계산조건이 충분하다. 출력 비율/픽셀은 계산에 쓰지 않았고 full reader/native 인증은 별도다.',
'sameCoreConceptAndProcedure':'직접 본 원문 구성요소는 차의 제곱과 괄호 내부 부호 반전·외부 음수의 전개 구별을 평가한다. 현재 문항도 차의 제곱과 전체 부호 반전의 제곱값 불변을 실제 사용한다. 원문의 모든 분류 부수절차를 보존한 것은 아니며 핵심 전개·부호 절차를 보존한다.',
'distinctPresentation':'원문의 여러 표현에 대한 동치 분류·개수에서 새 절단 정사각형 넓이 모델과 미지 계수 역결정으로 데이터역할/표현/목표가 바뀐다. 단순 숫자교체가 아니다.',
'naturalKorean':'위·오른쪽 폭, 남은 정사각형, a>3, 상수k라는 지시가 연결되고 선택 역할이 명확하다. 음수3-a를 물리 길이라고 하지 않고 그 제곱을 넓이로 제시하며 해설은 양수a-3을 먼저 설명한다. cm와cm²구분이 명확하다.',
'curriculumAppropriate':'공식2015 9수02-12 HWP Section0 record3956/offset201534;PDF physical34/printed30. 캡처 Unit e63d61c6-2b41-4c83-a74b-a605fd343c42는 중3semester1 다항식의 곱셈이다. 실제 요구는 차의제곱 전개와 기학습 넓이·일차등식뿐, 학년군코드나 원문학교만으로 승인하지 않는다. 학습완료 조건부2025/2026M3에 한정한다.',
'allStudentSurfacesInScope':'아래7면 각각의 실제 요구/근거를 별도로 기록했다. figure는 초등 정사각형 넓이 보조이고 고급기하/좌표풀이 불필요하다.',
'unitFamilyFit':'캡처 Unit의 주제는 맞지만 정확한 live family의 조건·목적·출력과 호환성을 이 검토에서 증명하지 않았다. familyKey=null 유지하며 key/count만으로 true를 주지 않는다.',
'scoreAppropriate':'원문 첫 페이지의3점과 현재3점을 확인. 한 번의 차의제곱 전개와 부호해석/짧은 역추론이라 기본3점 제안은 타당하다. 추가 도형독해 부담은 있지만 초등 넓이 수준이고 새 변형의 실측난도/원문 동난도 인증은 보류한다.'},
'surfaces':{
'stem':'a>3인 정사각형 절단의 넓이를 차의제곱으로 표현해 k를 묻는다. 2015 9수02-12(record3956;PDF34/30)+현재 중3semester1 다항식 곱셈 Unit 및 초등 넓이 후에 해당. 고급기하 조건 없음.',
'choices':'다섯 정수는 a항의 계수 후보다. 음의수 사칙과 식 전개(9수02-12)를 사용하며 고등 계수정리나 무리방정식 도구 없음.',
'figuresAndTables':'정사각형 두 개와 폭3 띠를 보여 주는 보조 그림. 초등 넓이/양의 길이와 9수02-12의 넓이표현에 한정되며 픽셀·좌표의 측정은 학생 절차가 아니다. 앞 학년 정사각형 넓이 선행 필요.',
'notation':'(3-a)^2와(a-3)^2의 전체 부호를 구분하고 a²+ka+9를 읽는다. 2015 다항식 곱셈 및 앞 학년 거듭제곱/계수/단위 cm·cm² 표기 수준.',
'answer':'단일 MC기호② 또는 k=-6을 고르는 정수 계수 결과. elementary 비교·일차등식 범위이고 새 고급 개념이 필요하지 않다.',
'studentSolution':'현재 저자 풀이의 모든 단계는 남은 변a-3→넓이제곱→전체부호반전 제곱값동일→전개와 계수확인. 9수02-12와 기학습 일차등식(9수02-04/05;HWP3912/3916,PDF34/30)으로 끝난다. a>3으로 양수/비영 근거도 있음.',
'prerequisites':'정사각형 넓이와 길이/넓이 단위, 음수의 제곱, 분배법칙, 상수항·계수, 일차등식이 이미 학습되어야 한다. 핵심 M3semester1 곱셈 Unit을 배운 뒤에만 배정하며 학교별 기말 진도나2027M3의2022배치를 인증하지 않는다.'}},
2:{'checkBasis':{
'answerCorrect':'독립 raw④, 저자④. 두 값을 유리화한 평균2k-3=7의 유일해5를 Fraction/근호쌍 코드로 재검산했다.',
'solutionCorrect':'저자 해설 전체의 분모곱1, P=(2k-3)+(2-k)√3, Q=(2k-3)+(k-2)√3, 합4k-6, 평균2k-3 및 원식대입을 독립 확인했다. 무리수/유리수 계수 유일성 정리나 고등 무리방정식 제곱풀이를 쓰지 않는다.',
'existenceUniqueness':'1<√3<2에서 두 분모>0, 곱1이라 항상 비영. k∈Q에서 평균식은 계수2≠0의 일차방정식이므로5가 유일. 원래 P,Q가7∓3√3이어서 평균7로 존재 확인. P,Q의 부호 조건을 임의로 추가하지 않는다.',
'choicesCorrect':'보기 k=-2,2,3,5,7의 평균은 순서대로-7,1,3,7,11.④만 조건을 만족하며 다른 네 보기와 중복/경계 문제 없음.',
'figureConsistent':'외부 도형 자산은 없고 실제 두 PNG의 표는 P,Q 분자 k±√3, 분모2±√3로 JSON과 일치한다. 표는 정보정리이며 그래프해석/좌표추론을 요구하지 않는다.',
'sameCoreConceptAndProcedure':'원문 질문-only 두 분수의 근호 분모를 유리화하고 동류 근호항을 정리하는 절차를 실제 관찰했다. 현재도 분모의 합차곱과 유리화·덧셈이 핵심이다. 원문의 최종 유리수/근호 계수차 목표는 새로 그대로 요구하지 않는다.',
'distinctPresentation':'고정된 근호식에서 결과 계수를 직접 계산하던 역할이, 두 분자의 공통 유리수 입력k와 표/평균 조건으로 바뀌고 k를 역추론한다. 근호항 상쇄와 평균 일차조건이 실제 새 구조를 이룬다.',
'naturalKorean':'유리수k, P/Q 정의표, 평균7과 k를 묻는 역할이 명확하다. 이름표P/Q를 변수곱이나 좌표로 오인할 문맥이 없고 해설은 각 값을 구분해 설명한다. 평균은 두 값 합을2로 나누는 통상 뜻이다.',
'curriculumAppropriate':'2015 9수01-10 HWP Section0record3788/offset193301;PDF physical33/printed29 근호식 사칙. 캡처 Unit99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1=중3semester1 근호를 포함한 식의 계산. 기학습 분배/합차곱 및 평균·일차방정식으로 전체풀이가 닫힌다. 역입력 형식이 모든 무리방정식 학년허용을 뜻하지 않는다.',
'allStudentSurfacesInScope':'표/기호/보기/답/현재저자전체해설/선수조건을 아래7면으로 분리해 검토했다. 자기 계산용 근호쌍 코드는 학생 필수 방법이 아니고 학생은 유리화·상쇄만 사용한다.',
'unitFamilyFit':'근호 계산 Unit UUID는 캡처와 일치. 그러나 평균 역입력 목표까지 맞는 실제 family 정의를 확인하지 않았으므로 familyKey=null/false. 카운트나 이름만으로 exact fit을 추론하지 않는다.',
'scoreAppropriate':'원문 첫 페이지4점과 현재4점 확인. 유리화 두 번, 상쇄, 평균 역추론, 대입확인으로 기본~표준4점 제안은 수용 가능. 원문보다 계수차 계산은 줄고 입력역추론이 추가되므로 원문하와 동난도/실측난도를 보장하지 않는다.'},
'surfaces':{
'stem':'근호 분모를 가진 두 수를 유리수k로 정의하고 평균에서k를 역으로 정한다. 2015 9수01-10(record3788,PDF33/29) 및 현재 M3semester1 근호계산 Unit 학습 후. 평균·일차관계가 전부이며 일반 무리방정식 허용을 주장하지 않는다.',
'choices':'다섯 정수 입력에 대한 평균을 근호계산으로 구분한다. 9수01-10과 이전 일차대입 수준. 양/음의 정수 입력은 유리수 조건 내이고 각 분모는 입력에 의존하지 않는다.',
'figuresAndTables':'P,Q행의 분수식 표는 같은 성취기준의 두 식을 정리한 것이다. 단순2행표 읽기 외 산점도/고급 통계가 필요하지 않으며 평균은 기학습 산술평균.',
'notation':'√3는 양의 제곱근, 분수선과±항, P/Q 이름표를 구분한다. 2015 9수01-10의 근호표기와 기학습 유리수·분배법칙 범위. 반복소수나 복소수/주가지정 없음.',
'answer':'정수5인 입력을 단일④로 선택. 2015 근호 계산의 결과를 평균/일차방정식(9수02-05;record3916,PDF34/30)으로 정하는 수준이며 수학적 유일성의 고급 정리 불필요.',
'studentSolution':'저자 전체풀이: 분모곱1→각유리화→근호항 상쇄→평균2k-3→일차방정식→원식검산. 9수01-10+기학습 분배/합차곱(9수02-12 관련 elementary전개)·평균·9수02-04/05로 충분. 무리수 계수 비교 정리나 양변 제곱을 필수로 쓰지 않음.',
'prerequisites':'제곱근의 의미/대소비교, 근호식 곱·나눗셈과 분모유리화, 분배법칙/합차곱, 동류항 덧셈, 두 수 평균, 일차방정식을 학습한 뒤 배정. 캡처 주Unit만으로 선수 완료를 대체하지 않는다.2027M3/2022는 별도 pending.'}}}
for item in items:
 n=item['candidate']['questionNumber'];r=per[n];surfaces={k:{'status':'passed','basis':v}for k,v in r['surfaces'].items()};report={'status':'pending','studentDigest':item['studentDigest'],'candidateDigest':item['candidateDigest'],'assetDigest':item['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gachang-first2-full-review-20261020-r1','solveDigest':item['solveDigest'],'checks':{k:k!='unitFamilyFit'for k in r['checkBasis']},'evidence':{**shared,'questionNumber':n,'checkBasis':r['checkBasis'],'rawFileSHA256':sha(P/f'blind/solve/q{n:02}.json'),'unit':item['candidate']['metadata']['assignment']['currentUnit'],'scoreAndDifficulty':'출처 첫페이지3/4점은 관찰. completed preparation의하 라벨은 학교 실측 난도 증거가 아니다. 현재 목표는 위 scoreAppropriate 근거의 편집 제안으로만 수용하며 실측/동난도/출시 보류.','currentBinding':'현재candidate/asset/student/solveDigest는 verification manifest/package 실제 바이트와 자체59개 검산으로 바인딩. collector는 별도 실제 실행 결과에 기록하며 형식통과를 수학 승인으로 대신하지 않음.'},'curriculumSurfaces':surfaces};assert len(report['checks'])==12 and len(surfaces)==7 and all(x.get('basis')for x in surfaces.values());(P/f'verification/reports/q{n:02}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reports':2,'mathProposedPassed':2,'gradeSurfacesPassed':14,'contentFinalHeld':2,'reportHashes':{f'q{n:02}':sha(P/f'verification/reports/q{n:02}.json')for n in [1,2]}},indent=2))
