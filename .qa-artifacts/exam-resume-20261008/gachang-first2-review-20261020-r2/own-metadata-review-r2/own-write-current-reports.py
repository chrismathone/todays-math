from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent.parent;E=Path(__file__).resolve().parent;rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();items=rd(P/'verification/verification-inputs.json');checks=rd(E/'own-current-metadata-checks.json');(P/'verification/reports').mkdir(exist_ok=True)
common={'reviewKind':'current-r2-metadata-and-grade-reassessment-not-new-blind','rawCommit':'3193b0a43828b8d32b11cc1c87e974f35640b002','helperRawCommit':'e06f9e1bd6be8625655ac72b2103137ebd77ea5d','rawAndR1ReportsPreserved':True,'exposure':'기존 원문9개/공개엔진/Gachang메타데이터 이력과 R1 full review 뒤의 현재 R2검토다. 원문 맥락은 raw봉인 후 R1에서만 보았고 이번에는 원문을 새로 열지 않았다. 새 blind/독립풀이/질문 수를 늘리지 않는다.','currentReplayEvidence':{'path':'../../own-metadata-review-r2/own-current-metadata-checks.json','sha256':sha(E/'own-current-metadata-checks.json'),'checksPassed':46,'failed':0},'primaryAndPlacement':{'evidenceSHA256':checks['primaryEvidenceSHA256'],'snapshotSHA256':checks['snapshotSHA256'],'documentSHA256':'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb','gradeEvidence':'실제2015공식 텍스트/locator의 기존 검증 및 현재 캡처 M3semester1 Unit과 전체 학생 방법의 선수조건을 결합. 목록일치/학교 원문/학년군코드만으로 승인하지 않음.','source2025AndPractice2026':'2015 M3 after learned prerequisites','2027M3And2022':'pending-separate-placement-and-whole-method-review'},'remainingHolds':{'unitFamilyFit':False,'liveFamily':None,'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'loadable':False,'whole19HwpPdfPair':False,'partialPDF5vs19':'held'},'codeAuditSeparation':'새 비교기의 빈대괄호 합치기/정규화 경계 technical hold는 별도 코드감사 증거에 보존한다. 실제 R2코드는9수02-12/9수01-10이며 이 fault fixture를 포함하지 않는다. 코드의 consistent-as-declared는 학년/의미 승인 근거가 아니다.'}
by={1:{'basis':{
'answerCorrect':'현재 답②는 기존 봉인 raw와 동일하며46개 현재 검사의 (3-a)²=a²-6a+9 재검산으로 k=-6. 원문 답은 근거가 아니다.',
'solutionCorrect':'현재 해설 문자열은 R1과 정확히 같음을 확인한 뒤 남은 변a-3, a>3의 양수성, 3-a=-(a-3), 전개와 계수판단을 다시 검사했다. (k+6)a=0에서 a≠0이므로 같은 결론이며 고등 계수정리를 요구하지 않는다.',
'existenceUniqueness':'a>3이면 남은 길이/넓이 양수. k=-6은 임의 a>3에서 성립하고 다른 k는 불가. a 자체의 유일성을 요구하지 않는 질문이다.',
'choicesCorrect':'현재 다섯 보기 -9,-6,-3,3,6는 raw시점과 같고 -6-k=0이 되는 값은-6 하나. 다른 네 선택지에는 비영잔차가 남는다.',
'figureConsistent':'현재 SVG/spec은 R1private/student와 바이트 동일. 기존 실제PNG검토와 post-seal두 정사각형 모델 검증에 현재 SHA를 재결합했다. 폭3은 본문에 명시, 라벨 위치/색상도 같으며 좌표/픽셀을 학생 수치로 사용하지 않았다.',
'sameCoreConceptAndProcedure':'R1에서 실제본 원문의 차의제곱·전체 부호반전 구별이 현재 전개/부호관계에서도 필수다. 원문 답/전체19대응을 추정하지 않고 해당 핵심만 비교한다.',
'distinctPresentation':'원문의 식 분류·개수 역할을 현재 남은정사각형 넓이 모델/미지계수 역결정으로 바꾼 구조가 그대로다. R2메타데이터변경을 새 수학변형으로 세지 않는다.',
'naturalKorean':'폭·남은 정사각형·a>3·상수k를 연결한 현재 발문/해설이 R1과 동일하고 모순없다. 음수3-a는 길이라고 하지 않고 제곱 넓이식에만 사용하며 cm/cm²가 구분된다.',
'curriculumAppropriate':'의도한2015 9수02-12 실제 다항식곱셈/인수분해 기준(HWP Section0record3956 offset201534;PDFphysical34/printed30)을 현재두 선언이 정확히 참조한다. 실제Unit e63d61c6-2b41-4c83-a74b-a605fd343c42=중3semester1다항식곱셈과 전체학생방법을 대조하여 선수학습후 허용한다.',
'allStudentSurfacesInScope':'현재7면의 개별요구를 아래basis로 새로 기록했다. 완전제곱식/기학습 넓이/일차등식으로 모든 필요한 절차가 닫힌다.',
'unitFamilyFit':'Unit UUID/내용은 맞지만 정확한 family 정의·역계수 목표 호환성을 증명하지 않았다. current familyKeynull과 false유지; 메타데이터 교정만으로 family패스 아님.',
'scoreAppropriate':'현재3점은 unchanged이고 R1에서 인쇄3점 관찰. 단순 전개·부호·넓이독해의 기본3점 편집 제안은 타당하나 실측난도/원문과동난도 인증을 주지 않는다.'},
'surfaces':{
'stem':'a>3 정사각형 절단/계수역추론은2015 9수02-12(record3956,PDF34/30)와 초등 넓이로 처리한다. 실제M3semester1 곱셈Unit 학습후만 배정하며 단순 선언 목록 일치가 근거는 아니다.',
'choices':'현재5개정수는 a항계수후보다. 거듭제곱 전개/음수 연산으로 구별해9수02-12 범위이고 고등 항등식법칙·고급계수정리를 요구하지 않는다.',
'figuresAndTables':'변동없는 SVG/spec은 정사각형과폭3의 초등 넓이모델을 보조한다. R1actualPNG확인과 현재byte equality에 근거하며 고급좌표/측정 조건 없음. 길이a-3>0 확인.',
'notation':'차전체 제곱과 바깥음수의 구별, a²/ka/상수항,cm/cm²는 기학습 정수·식과9수02-12 전개 표기다. 새 advanced표기는 없다.',
'answer':'현재②는 k=-6을 단일기호로 고르는 응답. 앞학년 일차등식과 해당 곱셈전개의 결과이며 답표현에 추가 고급개념 없음.',
'studentSolution':'현재 전체해설의 양수변→제곱넓이→부호반전→전개→계수 결정은9수02-12 및 기학습 등식9수02-04/05(HWP3912/3916,PDF34/30)만으로 충분. a≠0 정당화도 a>3에서 가능하다.',
'prerequisites':'정사각형넓이/길이와넓이단위, 음수제곱, 분배법칙/다항식곱셈/계수·상수항, 일차등식을 학습한 뒤 배정. 실제Unit중3semester1을 확인했으나 학교진도나2027M3/2022를 인증하지 않는다.'}},
2:{'basis':{
'answerCorrect':'현재④/입력k5가 봉인 raw와 동일. 현재Printed두 분수의 평균이2k-3임을 Fraction exact replay하고 평균7의 유일해5를 확인했다.',
'solutionCorrect':'현재저자전체문자열이 R1과 동일하며 분모곱1→P/Q각유리화→근호항상쇄→평균→일차방정식→원식대입을 다시 검산. P=(2k-3)+(2-k)√3,Q=(2k-3)+(k-2)√3가 정확하다.',
'existenceUniqueness':'1<√3<2에서 두 분모 양수/비영, 유리수입력전체에 정의. 평균2k-3=7은 비영계수2로 해5가 유일하며7∓3√3의 평균7로 존재. P/Q양수조건을 임의로 추가하지 않는다.',
'choicesCorrect':'현재5보기 -2,2,3,5,7의 평균은-7,1,3,7,11로④만7. 선택지/역할은R1과같고 중복/분모0/경계문제 없음.',
'figureConsistent':'외부도형은 없고 unchanged두행P/Q표가 실제 정의분수를 표시한다. 현재studentJSON/solutionstring equality와R1실제PNG검토에 바인딩. 원문crop을 학생자산으로 쓰지 않음.',
'sameCoreConceptAndProcedure':'R1에서 본 해당원문의 근호분모 유리화·동류근호항 정리가 현재도 실제필수. 원문답과 일치여부나 원문A/B결과를 계산해 승인하지 않는다.',
'distinctPresentation':'고정식의 계수결과 직접계산에서 표의 공통입력k를 평균조건으로 역결정하는 구조로 바뀐 현행질문이다. R2는 그 동일구조의 선언교정일뿐 새변형 아님.',
'naturalKorean':'유리수k,P/Q표와 평균7의 대상이 분명하며 현재해설은 각수와 합/평균을 구별한다. 단위없는수를 길이/넓이로 오표기하지 않고 새문구변경 없음.',
'curriculumAppropriate':'현재양쪽코드9수01-10은 실제2015근호식사칙 기준(HWP Section0record3788 offset193301;PDFphysical33/printed29)과 맞는다. 현재Unit99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1=중3semester1근호계산이며 유리화·평균·일차방정식 전체방법을 독립대조했다.',
'allStudentSurfacesInScope':'새로 작성한7면basis는 근호연산과 기학습 평균/일차등식으로 모든필수절차가 가능한지 검토한다. matchingcode나 계산도우미가 의미학년을 승인하는 것은 아니다.',
'unitFamilyFit':'현행Unit메타데이터는 적합하지만 평균역입력의 실제livefamily목표/형식까지 확인하지 않았다. null/false유지하며목록교정으로 자동승인하지 않음.',
'scoreAppropriate':'unchanged4점과R1실제인쇄4점을 근거로 두번유리화+상쇄+평균역추론의 기본~표준4점편집제안은 수용. source하와실측동난도는 미인증.'},
'surfaces':{
'stem':'두근호식과 유리수입력/평균조건은2015 9수01-10(record3788,PDF33/29)의 연산과 앞학년평균/일차등식. 실제M3semester1근호계산Unit/선수학습후로 한정, 일반무리방정식허용 아님.',
'choices':'다섯정수 입력의 실제평균을 유리화·정리로검사한다. 9수01-10/기학습정수·대입 범위이며 음수보기역시유리수조건 안이고 분모입력독립.',
'figuresAndTables':'P/Q2행표는동일한분수를 구분하는 단순정보정리. R1PNG실제확인+현재exactstudentpayload equality로재결합. 고급통계/그래프/픽셀절차 불필요.',
'notation':'√3양의제곱근, 분수선/±근호항과 P/Q명칭은2015근호계산기호. 입력k∈Q조건과 2±√3비영을 확인, 복소수·고급분지/계수독립정리 없음.',
'answer':'정수5선택④라는현재응답은앞학년일차방정식9수02-05(record3916,PDF34/30)의 결과와9수01-10연산을 결합한 수준. 새로운답법을요구하지 않는다.',
'studentSolution':'현재전문을다시검산한 유리화·분배·근호항상쇄→평균2k-3→일차식→대입확인은9수01-10과 기학습합차곱/평균/9수02-04/05로완결. 무리방정식양변제곱·유리무리계수유일성정리 없음.',
'prerequisites':'제곱근대소/근호곱나눗셈/분모유리화,분배·합차곱,동류항정리,산술평균,일차방정식을 이미학습한뒤 배정. 현재Unit라벨만으로 선수완료를 가정하지않고2027M3/2022별도pending유지.'}}}
for item in items:
 n=item['candidate']['questionNumber'];q=by[n];report={'status':'pending','studentDigest':item['studentDigest'],'candidateDigest':item['candidateDigest'],'assetDigest':item['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-gachang-current-r2-metadata-grade-20261020','solveDigest':item['solveDigest'],'checks':{k:k!='unitFamilyFit'for k in q['basis']},'evidence':{**common,'questionNumber':n,'checksBasis':q['basis'],'currentFieldLevelDelta':checks['fieldLevelDeltas'][n-1],'metadataMismatchResolved':'이전9수01-07잔존필드를 현재의도기준으로교정하고새metadataRevision이기존raw/variant를연결함. 해당불일치는해소하되그것만으로의미/학년을자동승인하지않음.','metadata':item['candidate']['metadata']['assignment']},'curriculumSurfaces':{k:{'status':'passed','basis':v}for k,v in q['surfaces'].items()}};assert len(report['checks'])==12 and len(report['curriculumSurfaces'])==7;(P/f'verification/reports/q{n:02}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({f'q{n:02}':sha(P/f'verification/reports/q{n:02}.json')for n in [1,2]},indent=2))
