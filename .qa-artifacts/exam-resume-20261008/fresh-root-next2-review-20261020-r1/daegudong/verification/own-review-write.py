from pathlib import Path
import json,hashlib
BASE=Path('.qa-artifacts/exam-resume-20261008');R=BASE/'fresh-root-next2-review-20261020-r1';S=BASE/'fresh-three-source-component-review-20261020-r1';read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
keys=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']
for name,n in [('daegudong',3),('daeguil',2)]:
 p=R/name;v=p/'verification';x=read(v/'verification-inputs.json')[0];c=x['candidate'];rep=read(v/'own-review-replay-receipt.json');raw=read(p/'blind/solve'/f'q{n:02}.json');unit=rep['capturedUnit']
 if name=='daegudong':
  bases=[
   '봉인된 자체 raw에서 b10,a4/5,k16/25를 도출하여③을 얻었으며 현재 저자 답③과 일치한다. k의 정확한 소수값은0.64이다.',
   '실제 저자 해설의 모든 단계를 대조했다. 양수인2√5를 곱해 b10,10a8에서 a4/5를 얻는다. 그 다음 √(3k)=(4/5)√3의 오른쪽은 이미 정해진 양수이므로 제곱근의 정의로3k=48/25를 얻고 k16/25를 정한다. 해설 마지막에 오른쪽이 양수이며 그 제곱이3k임을 확인하여 원식을 검산한다. 단순한 양의 제곱근 정의를 이용한 이 단계는 임의의 무리방정식 풀이를 허용하는 근거가 아니다.',
   '분모2√5>0이고 나누는 b10,정수3도0이 아니다. 둘째 조건이 b,셋째 조건이 a,첫째 조건이 양수 k를 차례로 유일하게 정한다. (a,b,k)=(4/5,10,16/25)는 모두 양수이며 ab8 및 두 근호 조건을 실제로 만족한다. 첫째 식의 양변이 양수라 제곱값의 일치에서 부호가 다른 추가 가지가 생기지 않는다.',
   '보기0.08,0.16,0.64,0.8,6.4를 정확한 Fraction으로 각각 검사했다. 유일하게 정해진 a,b에 대해 첫째 식 양변은 양수이며 제곱값3k와48/25가 같은 경우는0.64뿐이다. 각 보기의 제곱값 비교와 유일 선택 위치를 자체 receipt에 기록했다.',
   '외부 그림은 없고 실제 학생/해설 PNG에3행의 조건표가 있다. 첫째의 근호는3k 전체를 덮고,둘째 분모는2√5 전체이며,셋째ab8도 보인다. 본문의 a,b,k 양수 조건과 세 행을 함께 읽어야 한다. 해설 PNG와 private 후보 텍스트의 식/보기/답이 대응한다.',
   '원문 q03은 두 근호 표현 사이의 배율을 각각 정하고 그 곱을 계산한다. 현재 문항도 양의 근호값과 배율 관계,근호의 곱셈/나눗셈을 핵심으로 보존한다. 원문 정답이나 필기 표시는 사용하지 않았으며 원문의 질문 관계와 현재 전체 절차를 비교했다.',
   '원문의 배율의 곱이라는 출력이 현재는 조건ab8로 주어지고,배율을 역으로 정하여 처음 근호 안의 k를 구한다.3행 표의 조건을 둘째→셋째→첫째 순으로 연결해야 하므로 숫자 치환이나 동일 출력 계산이 아니다. 실제 inverse target 변화가 있지만 모든 임의의 근호 역문제로 일반화하지 않는다.',
   '양수인 세 문자를 먼저 선언하고 표의 첫째/둘째/셋째 조건과 구할 k를 분명히 했다. 실제 PNG에서 분모와 근호 범위가 읽히고,배율의 방향이나 요청 변수가 모호하지 않다. 해설은 정해진 양수를 대입한 다음 정의를 확인하는 자연스러운 순서다.',
   '현재 전체 학생 경로는 2015 [9수01-07] 제곱근 뜻/성질,[9수01-10] 근호 사칙계산과 이전 유리수 계산/간단한 등식 관계에서 닫힌다. 실제 positive branch와 원식 확인을 보아 고교의 일반 무리방정식,복잡한 방정식 체계,함수 역함수나 형식적 계수법을 필수로 요구하지 않는다.2025출처/2026중3연습의2015 범위에 한정한다.',
   '현재 지문·보기·표·표기·답·완전한 저자 학생 해설·선수학습 일곱 면을 아래 별도 basis로 실제 검토했다. 전체 절차의 양수/분모/근호 정의를 함께 확인했으며 단순히 마지막 답 일치로 판정하지 않았다.',
   '제공 snapshot의 근호를 포함한 식의 계산 Unit99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1 row와 현재 assignment가 일치한다. 이 새 역방향 입력 목표와 조건/답형식까지 정확히 맞는 live family 정의는 제공·검증되지 않아 familyKey=null과 unitFamilyFit=false를 유지한다. 이름/개수로 의미를 추론하지 않는다.',
   '원본 인쇄4점과 현재4점이 일치한다. 세 간단한 관계를 순서 바꾸어 연결하고 마지막 양의 근호 입력을 구하는 과정을 요구하므로4점은 편집상 수용 가능한 제안이다. 원문보다 역순 계획이 추가되므로 동일난도는 인증하지 않는다. 기본~응용 라벨은 저자 제안이며 실측 난도/보정은 보류다.'
  ]
  surfaces={
   'stem':'실제 지문은 a,b,k의 양수 조건과 세 개의 구체적인 근호/곱 관계다.2015 [9수01-07,10]과 이전 등식/유리수 계산으로 읽고 풀 수 있다. 일반 무리방정식을 자유롭게 허용한다는 해석은 하지 않는다.',
   'choices':'현재5개 보기는 모두 양의 유한소수이며 정확한 유리수다. b10,a4/5를 고정한 뒤3k와48/25를 비교하여 전부 판별할 수 있다. 어림값이나 고교 판별식/수치해법이 필요하지 않다.',
   'figuresAndTables':'실제3행 표는 본문의 양수 조건을 보완하는 세 관계만 표시한다. 근호3k,분모2√5,곱ab가 모두 실제 PNG와 텍스트에 대응한다. 표를 읽는 기본 표현 외의 함수/프로그래밍 선행은 필요하지 않다.',
   'notation':'a√3의 곱,√(3k)의 근호 범위,b/(2√5)의 전체 분모를 유지한다. k>0과2√5>0을 확인해 사용하며 최종0.64는 정확한 값이다. 분수지수나 고교용 근호 해소 기호는 없다.',
   'answer':'정답③은 현재 세 번째 보기0.64=k16/25다. 중간 배율 a4/5 또는 b10을 답으로 혼동하지 않는다. 순수 수 관계이므로 주어지지 않은 길이/단위를 붙이지 않는다.',
   'studentSolution':'실제 해설은 b10→a4/5 다음 이미 정해진 양수 T=(4/5)√3에 대해 √(3k)=T의 정의를 써3k=T²로 계산하고 원래 양의 근호 식을 확인한다. [9수01-07,10]에 필요한 구체적인 단순 항등 성질이다. 양변 제곱이라는 문구만으로 모든 무리방정식 방법을 승인하지 않는다.',
   'prerequisites':'배정 전 제곱근 정의/음이 아닌 값,근호 곱셈·나눗셈 [9수01-07,10],유리수 사칙계산 [9수01-05],0이 아닌 수를 곱하고 나누는 등식 성질을 배워야 한다. 현재 metadata.requiresLearnedBeforeAssignment가 근호 계산과 등식/곱셈 나눗셈 등 필요한 조건을 기록한다. Unit99ca...는 실제 captured 중3·1학기 row이며 학교 진도나 live DB의 현황을 인증하지 않는다.'}
  standards=['9수01-07','9수01-10'];prereq=['9수01-05','9수02-04','9수02-05']
 else:
  bases=[
   '봉인 raw에서 실제 분류를 유리수/유리수/무리수로 정하여 잘못 분류한 집합ㄱ,ㄴ과③을 얻었다.현재 저자 답③ 및 보기의 대상과 일치한다.',
   '실제 해설의 세 행을 모두 확인했다. √0.16=0.4=2/5,0.272727…=27/99=3/11은 정확하다. 제곱수가 아닌 자연수5의 근호는 중3에서 배우는 무리수 성질로 분류한다. 마지막에 잘못된 항목만 ㄱ,ㄴ으로 모았으며 올바른 ㄷ을 포함하지 않았다. 일반 무한급수나 무리성의 고급 모순 증명은 사용하지 않는다.',
   '세 수는 모두 잘 정의된 양의 실수다. 근호의 피제곱수0.16,5는 양수이고 분수의 분모5,99,11은0이 아니다. 본문의 첫/끝 점 설명이 순환마디27을 유일하게 지정한다. 각 분류의 참/거짓이 정해져 잘못된 항목집합은ㄱ,ㄴ 하나이며 보기에도 한 번만 나타난다.',
   '5개 보기의 항목집합을 정확 비교했다.①ㄱ은ㄴ 누락,②ㄴ은ㄱ 누락,③ㄱ,ㄴ만 모두 포함한다.④ㄱ,ㄷ과⑤ㄴ,ㄷ은 올바르게 분류된ㄷ을 잘못 포함하고 각각 다른 오분류를 빠뜨린다. 단순히 무리수인 항목을 고르는 문제로 읽지 않았다.',
   '외부 그림 없이 실제3행 분류표를 두 PNG에서 확인했다. ㄱ의 소수 근호,ㄴ의2/7 위 두 점,ㄷ의√5와 세 무리수 라벨이 모두 텍스트와 대응한다. 본문에서 순환마디 양끝 점을 명시해 반복이7 하나인지27인지 생길 수 있는 모호성을 해소한다.',
   '원문 q02의 핵심은 유리수/무리수의 정의,무한소수/순환소수 구별,근호 표기가 무조건 무리수를 뜻하지 않는다는 판단이다. 현재도 같은 정의와 구체적인 근호/순환소수 분류 절차를 적용한다. 원문의 수직선 등 모든 부수 진술을 재현했다고 주장하지 않으며 원문 정답은 사용하지 않았다.',
   '일반 진술5개 중 하나의 옳은 설명을 고르는 구조가 구체적인3개 수의 분류 기록에서 두 오류를 모두 찾는 구조로 바뀌었다. 실제 수를 평가하고 표의 라벨과 대조한 후 조합 보기를 고르는 단계가 생겨 단순 수치 교체가 아니다. 새 데이터/오류 판별 구조는 확인했지만 유사도 승인과 개념은행 운영 변경은 별개다.',
   '잘못 분류한 항목을 모두라는 지시와 점 표기의 설명이 자연스럽고 분류표의 항목/수/분류 역할이 명확하다. 실제 PNG의 반복 점과 ㄱ/ㄴ/ㄷ이 읽힌다. 해설은 수의 참분류와 표 라벨이 틀린 이유를 구별해 설명한다.',
   '현재 전체 경로는2015 [9수01-07] 제곱근,[9수01-08] 무리수와 이전 [9수01-03,05,06] 유리수·사칙계산·순환소수 관계로 완결된다. 특히 M2 반복 표기와 분수표현 선행을 명시해야 한다. 무리성의 상위 정리나 일반 무한급수 공식을 요구하지 않는다.2025출처/2026중3연습의2015에 한정한다.',
   '실제 지문·다섯 조합 보기·3행 표·소수의 점/근호 표기·답·완전한 저자 학생 해설·선수학습을 서로 다른 아래 근거로 검토했다. 이전 source9의 제안 상태를 그대로 승인으로 복사하지 않고 현재 세 수와 해설을 새로 확인했다.',
   '실제 captured 무리수와 실수 Unit28032bdd-3db3-4788-9e7a-2f1909233fdb row와 assignment가 일치한다. 이 구체적 분류 오류/다중 항목 선택 목표 전체와 정확히 호환되는 live family 정의는 입증되지 않았다. familyKey=null과 unitFamilyFit=false를 유지한다.',
   '원본 인쇄3점과 현재3점은 일치한다. 단순 근호 하나,이미 배운2자리 순환소수 하나,기본 무리수 하나의 분류와 두 오류 집합 선택이므로3점은 편집상 수용 가능한 제안이다. 완료본의 하는 원래 학교의 실측 난도가 아니며 동일난도/학습 효과나 난도 보정은 미승인이다.'
  ]
  surfaces={
   'stem':'현재 지문은 주어진 세 수가 표의 무리수 라벨과 맞는지 판단하는 문제다.2015 [9수01-07,08]과 이전 유리수/순환소수 개념 [9수01-03,06]으로 읽는다. 무한소수 일반에 대한 상위 수준의 증명을 요구하지 않는다.',
   'choices':'실제5개 보기는 ㄱ/ㄴ/ㄷ의 단순 항목 조합이다. 현재 세 수의 정의로 정해진 오분류 집합ㄱ,ㄴ과 대조하면 유일하게③이다. 고교 집합/논리 용어나 별도 경우의 수 공식은 필요하지 않다.',
   'figuresAndTables':'실제 표의 수와 라벨을 각 행에서 대응시킨다. ㄴ의2와7 위 점은 본문에서 정의한 반복 구간27을 표시한다. 임의의 표본 통계나 실험/상관관계 개념이 아니라 수의 분류 표현만 쓴다.',
   'notation':'0.점2점7은0.272727…이며 유한소수0.27이나0.2777…로 바꾸지 않는다. √0.16의 양의 값0.4와√5의 무리성을 구분한다. M2 점 표기와 M3 근호 표기이며 분수의 분모도 명확하다.',
   'answer':'정답③은 잘못된 분류 두 항목ㄱ,ㄴ을 모두 가리킨다. 무리수 자체인ㄷ을 고르는 것과 다르다. 보기가 원래 숫자나 정정 문장 대신 항목집합을 요구하는 현재 답 역할에 맞는다.',
   'studentSolution':'실제 해설은0.16의 정확한 제곱근,순환소수의 유리성 및27/99=3/11,제곱수가 아닌 자연수의 근호라는 기본 성질을 차례로 적용한다. [9수01-06,07,08] 경로이며 반복소수 분수표현은 유리성 이해 정도의 짧은 예다. 무한급수 수렴/고교 무리성 증명을 요구하지 않는다.',
   'prerequisites':'M2 유리수와 유한/순환소수,순환마디 첫/끝 점 표기와 간단한 분수표현 [9수01-06]을 반드시 먼저 배워야 한다. 그 뒤 M3 제곱근 [9수01-07],무리수 [9수01-08]를 학습한 학생에 한정한다. 실제 metadata가 유리수·순환소수·분수표현·무리수·제곱근을 선행 조건으로 명시한다. primary standardCodes 배열에06이 없어도 이 독립 보고서에서는 필수 M2 선행 코드로 명시하고,그 exact prerequisite Unit UUID/배정은 확인하지 않았다.'}
  standards=['9수01-07','9수01-08'];prereq=['9수01-03','9수01-05','9수01-06']
 assert len(bases)==12 and len(surfaces)==7
 checks={k:k!='unitFamilyFit' for k in keys}
 evidence={'checks':{k:{'basis':basis,'verdict':'passed' if checks[k] else 'pending'} for k,basis in zip(keys,bases)},'ownCalculation':rep['calculation'],'binding':{'rawSha256':rep['rawSha256'],'candidateFileSha256':rep['candidateFileSha256'],'solutionPngSha256':rep['solutionPngSha256'],'sourceRecordSha256':rep['sourceRecordSha256'],'replayReceiptSha256':h(v/'own-review-replay-receipt.json')},'exposure':{'helperPreExposureRawCommit':rep['helperRawCommit'],'parentPreExposureRawCommit':rep['parentPreExposureSeal'],'currentAuthorSolutionReadAfterSeal':True,'originalSourceExposureStillDeclared':raw['evidence']['exposureDeclaration'],'newBlindClaim':False,'rawModified':False,'originalKeyOrHandwritingUsedAsOracle':False},'sourceComparison':{'sourceComponentReportSha256':h(S/'own-source-component-review.json'),'sourceGradeMethodProposalSha256':h(S/'own-grade-method-proposals.json'),'priorProposalsAreNotThisApproval':True,'actualOriginalFirstPageViewedPreviously':True,'sourceComponentCorrespondenceOnly':True,'wholeHwpPdfSourceIdentityApproved':False},'curriculumPrimary':{'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','2015HeadingLines':'84-85','middle13BandLine':'461','standardsLine':'466','repeatingFractionTeachingLimitLine':'477','actualRequiredPrimaryCodes':standards,'priorRequiredCodes':prereq,'providedMOE2015OriginalLocator':'physical33/printed29 for9수01-07..10;physical32/printed28 for9수01-03..06;amended2020-236 Section0 records3768,3776,3780,3788 as applicable','primaryReceiptSha256':h(S/'own-primary-receipt.json'),'actualCapturedPrimaryHtmlSha256':read(S/'own-primary-receipt.json')['sha256'],'providedMOEEvidenceSha256':h(S/'source-only-input/provided-curriculum-evidence.json'),'capturedLiveSnapshotSha256':h(S/'source-only-input/provided-live-family-snapshot.json'),'capturedUnit':unit,'limit':'Codes are middle1-3 band, combined here with actual current student method and captured M3 semester1 Unit after required learning. Not school pacing/current DB promise or2022 mapping.'},'metadata':{'sourceYear':2025,'sourceSemester':1,'practiceYear':2026,'curriculum':'2015','score':c['score'],'currentCapturedUnitMatches':True,'exactLiveFamily':None,'sourceDifficulty':'Correctly held as completed-preparation label, not observed original-school measured difficulty','difficultyReview':'Bounded editorial score/기본~응용 plausibility only; measured calibration/same difficulty pending','authorOnlyFlagsAndInputFieldsPreserved':True},'separateHolds':{'exactLiveFamily':True,'rights':True,'sourceIdentity':True,'similarity':True,'nativeProvenance':True,'loadability':True,'2022M3from2027':True,'difficultyCalibration':True},'collector':{'executed':False,'mocked':False,'reason':'Only current student/author review is in scope; no production closure or inverseRadicalRatio engine code read/import/run. Parent performs collector.'},'dbApiWrites':0}
 report={'status':'pending','studentDigest':x['studentDigest'],'candidateDigest':x['candidateDigest'],'assetDigest':x['assetDigest'],'method':'independent-solve-then-review','verifierId':'codex-helper-independent-next2-full-review-20261020','solveDigest':x['solveDigest'],'checks':checks,'evidence':evidence,'curriculumSurfaces':{k:{'status':'passed','basis':z} for k,z in surfaces.items()}}
 (v/'reports').mkdir(exist_ok=True);f=v/'reports'/f'q{n:02}.json'
 with f.open('x',encoding='utf-8') as out:json.dump(report,out,ensure_ascii=False,indent=2);out.write('\n')
 print(json.dumps({'exam':name,'reportSha256':h(f),'checksPassed':11,'all7SurfaceBasis':True,'status':'pending'},indent=2))
