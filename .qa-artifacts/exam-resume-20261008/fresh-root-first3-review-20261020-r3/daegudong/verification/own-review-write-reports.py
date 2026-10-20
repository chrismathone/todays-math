from pathlib import Path
import json,hashlib
BASE=Path('.qa-artifacts/exam-resume-20261008');SRC=BASE/'fresh-three-source-component-review-20261020-r1'
D=BASE/'fresh-root-first3-review-20261020-r3/daegudong';B=BASE/'fresh-root-first3-review-20261020-r2/daegubuk'
read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
snapshot=read(SRC/'source-only-input/provided-live-family-snapshot.json');unit=next(u for u in snapshot['units'] if u['id']=='1682f01b-5293-4672-91cd-07fc02e305ac');primaryReceipt=read(SRC/'own-primary-receipt.json');primaryHtml=(SRC/primaryReceipt['localOnlyHtml']).read_text(encoding='utf-8');assert sha(SRC/primaryReceipt['localOnlyHtml'])==primaryReceipt['sha256']
for code in ['9수01-07','9수01-03','9수01-04','9수01-05','6수03-03','6수03-04','6수03-05']:assert code in primaryHtml
CHECKS=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']
for folder in [D,B]:
 v=folder/'verification';replay=read(v/'own-review-replay-receipt.json');items=read(v/'verification-inputs.json');reports=[]
 for item in items:
  c=item['candidate'];n=c['questionNumber'];r=next(z for z in replay['items'] if z['n']==n);raw=read(folder/'blind/solve'/f'q{n:02}.json');assignment=c['metadata']['assignment'];assert assignment['currentUnit']==unit and assignment['unitId']==unit['id'] and assignment['familyKey'] is None
  assert c['metadata']['curriculum']['sourceExam']==c['metadata']['curriculum']['target']=='2015';assert c['curriculumReview']['targetAcademicYear']==c['metadata']['placementConditions']['practiceAcademicYear']==2026
  assert c['curriculumReview']['officialPrimary']['capturedPrimaryReceipt']['sha256']==sha(SRC/'own-primary-receipt.json');assert c['metadata']['assignment']['snapshot']['sha256']==sha(SRC/'source-only-input/provided-live-family-snapshot.json')
  if folder==D and n==1:
   answerBasis='자체 봉인 raw에서 안쪽 √625=25, 그 음의 제곱근 A=-5, 양의 제곱근 B=8을 정해 거리13과③을 얻었다. 현재 저자 답③과 일치한다.'
   solutionBasis='저자 해설은25의 두 제곱근±5에서 음수-5를 고르고,64의 양의 근8을 정한 다음8-(-5)=13으로 계산한다. 이미 적힌 근호의 수를 먼저 평가하는 단계가 실제 해설에 명시되어 있다. -√625=-25로 잘못 읽지 않으며 모든 단계가 정의와 signed arithmetic이다.'
   existenceBasis='양수625와64의 근호가 정의되고 안쪽25도 양수다. a²=25의 두 실근 중 음수-5, b²=64의 두 실근 중 양수8이 각각 유일하다. -5<0<8이므로 서로 다른 두 점의 길이13>0이다. 물리 단위는 주어지지 않았다.'
   choicesBasis='보기3,8,13,16,25를 각각 고정된 거리13과 정확 비교했다.13 한 개만 맞고 다른 네 수는 길이가 아니다. 원점에서 B까지의8 또는 안쪽 근호값25를 AB로 대체하면 틀린다.'
   figureBasis='현재 student PNG와 solution PNG의 수직선은 A,O,B 순서와 원점0을 표시한다. 봉인 후 spec의 A(-5,0),O(0,0),B(8,0),라벨을 자체 계산값과 대조하고 SVG 해시를 student 자산과 비교했다. 픽셀/좌표를 먼저 읽어 수치를 얻지 않았다.'
   coreBasis='원문은 이미 근호로 적힌 수의 음의 제곱근과 다른 제곱수의 양의 제곱근을 차례로 정한다. 새 문항도 같은 두 단계 정의와 부호 선택을 보존한다. 원문 정답이 아니라 원문 질문 구조와 현재 학생 절차를 비교했다.'
   distinctBasis='원문의 수 합 a+b라는 목표가 수직선의 두 좌표와 양수 거리 b-a로 바뀌었다. A<0<B에서 두 목표의 차는 -2a>0이므로 마지막 산술 대상도 달라진다. 새로운 벡터 그림/양수 거리 해석이 추가된 유한한 구조 변화이며, 일반 역방정식 문제라고 과장하지 않는다.'
   koreanBasis='좌표가 어떤 수의 지정된 제곱근인지와 요구 대상 AB의 길이가 문장에 명시되어 있다. 근호 뒤 음의 제곱근이라는 용어가 원문 핵심을 보존하고 해설도 두 단계로 설명한다. 양의 제곱근을 임의로 음수로 바꾸는 문구가 없다. 실제 PNG에서 문장/수식/보기 누락을 보지 않았다.'
   scoreBasis='원본 인쇄4점과 새4점은 일치한다. 안쪽 근호, 지정된 부호의 두 근, 거리 계산의 짧은 연결을 요구하므로4점 배치는 편집상 수용 가능하다. 기본~응용은 넓은 저자 제안으로만 유지하며 동일난도나 실측 난도는 승인하지 않는다.'
   stem='현재 지문은 구체적인 양수의 제곱근을 두 번 해석하고 수직선 좌표로 놓는다. 2015 [9수01-07]의 정의·성질과 이전 정수/수직선 개념 [9수01-03~05]로 전체 지문을 읽을 수 있다. 일반 중첩근호 해소법·분수지수는 없다.'
   choices='현재5개 보기는 모두 정수인 길이 후보다. 선행 signed arithmetic으로 거리13과 직접 비교할 수 있고, 선택지를 판별하는 데 다른 학년 정리가 필요하지 않다.'
   figures='수직선의 A,O,B와0만 있는 실제 그림이다. 이미 학습한 정수의 수직선 위치/두 점 간 길이를 보조하며 함수 그래프나 도형 방정식을 요구하지 않는다. actual spec/SVG/학생 및 해설 PNG 대응을 확인했다.'
   notation='√625의 음의 제곱근은 안쪽 값을 먼저 구한 뒤 근을 정하는 표준 용어로 읽는다. (-8)²의 괄호, 좌표의 음수와 길이의 양수를 구별한다. 학생에게4제곱근 기호나 고교용 논리 기호를 도입하지 않는다.'
   answerSurface='정답③은 길이13인 현재 세 번째 보기와 일치한다. 좌표가 아닌 거리라는 요청을 지키며 cm 등 주어지지 않은 물리 단위를 붙이지 않는다.'
   studentSol='실제 해설은25→±5→-5와64→8 다음8-(-5)=13의 순서다. [9수01-07]과 이전 signed arithmetic만으로 전 과정을 수행하며 단순히 마지막 답만 맞는 것으로 처리하지 않았다.'
   prerequisites='제곱근 정의/근호의 음이 아닌 값, 양수의 두 제곱근과 지정된 부호 선택, 정수 제곱/사칙계산/수직선 거리를 먼저 배워야 한다. 현재 metadata의 학습 선행 조건에 이 항목들이 있다. captured Unit은 중3·1학기 제곱근 UUID이며 학교 중간고사 진도를 인증하지 않는다.'
  elif folder==D:
   answerBasis='자체 raw의 최소 n5,넓이225 cm²,양의 변15 cm,둘레60 cm와 현재 저자 답④가 일치한다. 답은 최소 n 자체가 아니라 그때의 둘레다.'
   solutionBasis='실제 저자 해설은 n1~4의 넓이45,90,135,180을 각각36<45<49,81<90<100,121<135<144,169<180<196으로 배제한다. n5에서는225=15²로 달성한다.1 이상 정수 중5 미만은 이 네 경우 전부이므로 최소성 증명이 완결된다.4×15=60 cm도 맞다. raw의 소인수분해 증명은 추가 검산이고 학생 해설의 필수 방법이 아니다.'
   existenceBasis='n은1 이상의 자연수이므로 양의 넓이45n을 갖는다.1~4는 불가능하고5는 가능하므로 최소 n은 유일하게5다. 길이는 음수-15가 아니라 양수15 cm 하나이며 둘레는60 cm로 정해진다. 모든 미지수는 정해진 정수/양수 조건을 만족한다.'
   choicesBasis='15,30,45,60,225 cm 다섯 보기를 각각 둘레60 cm와 비교했다.60만 맞는다.15는 한 변이고225는 넓이의 수치이며 요청된 둘레가 아니다. 자체 Fraction 역검산에서도 나머지 네 보기의 변/넓이는 해당 최소 자연수 조건을 만족하지 않는다.'
   figureBasis='정사각형과 내부45n cm² 라벨을 두 PNG에서 확인했다. 봉인 후 spec의 네 변 길이제곱225,인접 내적0,같은 x/y 범위와 폭/높이를 정확 검사했다. 주어진 일반 넓이 라벨과 답을 얻은 n5의 정사각형이 일치하며 숨은 좌표15를 학생의 주어진 길이로 취급하지 않았다.'
   coreBasis='원문은 근호값이 자연수가 되는 매개 자연수의 최소를 묻는다. 새 문항도 넓이45n이 자연수의 제곱인지 확인하여 최소 자연수를 정하는 동일한 핵심 판정과 최소성 절차를 보존한다. 소인수분해로만 풀어야 한다는 원문 해설 조건은 제공되지 않았고 강제하지 않는다.'
   distinctBasis='근호식 속 변수의 최소를 바로 답하던 구조에서, 정사각형의 넓이→자연수 변→최소 n→둘레라는 두 단계 출력으로 바뀌었다. 실제 벡터 정사각형과 cm²/cm 구별이 추가되어 숫자 치환만으로 완성되지 않는다. 다만 핵심 제곱수 판정이 가까운 만큼 유사도 승인은 별도 보류한다.'
   koreanBasis='n을1 이상 자연수로 명시해0을 제외하고, 한 변을 cm로 나타낸 수가 자연수라는 뜻과 최소 n을 쓸 때의 둘레를 분리해 적었다. 비교적 긴 조건문이지만 대상과 단위가 명확하다. 실제 해설도 넓이/한 변/둘레를 혼동하지 않는다.'
   scoreBasis='원본 인쇄3점과 새3점이 맞는다. 실제 학생 경로는 작은 네 정수의 제곱수 사이 비교와 한 번의 둘레 계산으로 닫혀 있어3점 편집 제안은 수용 가능하다. raw의 소인수 지수법을 수행시간 기준으로 강요하지 않는다. 원본 완료본의 하 라벨과 정확한 동일난도는 미승인이다.'
   stem='양의 자연수 매개 넓이에서 한 변이 자연수가 되는 조건은 2015 [9수01-07]의 제곱근/제곱수 성질이다. 추가 사각형 측정은 초등 [6수03-03~05]의 둘레·넓이·단위이다. 실제 지문을 고교 정수론 문제로 읽을 필요가 없다.'
   choices='5개 보기 모두 cm로 된 정수 길이다. 실제 표적60 cm와 비교하면 한 개만 맞고, 넓이225 cm²나 변15 cm와 둘레를 구별하는 데 이미 배운 측정 단위만 필요하다.'
   figures='실제 도형은 변 라벨을 숨은 수치로 주지 않는 정사각형과45n cm² 넓이 표기뿐이다. [6수03-03~05]의 단순 평면도형 측정이며 복잡하게 변형한 도형/공간 측정이나 닮음 추가 가정이 없다.'
   notation='n≥1인 자연수, 제곱기호,cm와cm²를 구분한다. 실제 해설의 인접 제곱수 사이 비교는 엄격 부등식이고 완전제곱 달성은 등식이다. 소수 어림이나 고교용 기호가 없다.'
   answerSurface='정답④는 현재 보기의60 cm다. 양의 한 변15 cm와 둘레4×15 cm를 구별하며 면적225 cm²를 길이로 답하지 않는다.'
   studentSol='실제 학생 해설에서 모든 필수 경우 n1,2,3,4를 인접 자연수 제곱 사이로 제외하고 n5를 달성했다. [9수01-07]과 이전 자연수/사칙계산,초등 측정만 필요하다. 소인수분해/소인수 지수의 짝수성은 raw의 선택적 추가 검산이며 이 해설의 필수 선수조건으로 세지 않는다.'
   prerequisites='제곱근과 제곱수,자연수 순서,양의 길이,정사각형 넓이/둘레,cm/cm²를 배운 뒤 배정한다. metadata가 이 조건을 실제로 기록한다. 표준 [6수03-03~05]와 [9수01-07]로 전 경로를 설명할 수 있으며 M1 소인수분해 UUID 부재를 이 해설의 학년 밖 필수 방법으로 오판하지 않는다.'
  else:
   answerBasis='봉인 raw는 x=-5를 정한 뒤7+(-5)=2로④를 얻었다. 현재 저자 답④와 해당 보기2가 일치한다.'
   solutionBasis='실제 해설은 √(x²)=5에서 제곱근 정의로 x²25를 얻고 두 근5,-5 중 음수-5를 고른다. 이어(√7)²=7을 적용한다. 일반 무리방정식의 양변 제곱·허근 제거 공식을 쓰지 않으며 음수 조건이 실제로 쓰였다.'
   existenceBasis='모든 실수 x에서 x²≥0이므로 근호가 정의된다. x²25의 실근은±5이고 음수는-5 하나다. 대입해 √25=5를 확인했고 출력2가 유일하다. 음수 조건이 없으면 출력2/12 두 값이 되므로 존재·유일성의 조건이 실질적이다.'
   choicesBasis='출력 후보 -12,-2,0,2,12에 대해 계산식7+x로부터 입력 -19,-9,-7,-5,5를 역검산했다.앞 세 값은 근호 조건을 위반하고,마지막5는 근호 조건은 맞지만 음수 조건을 위반한다.출력2만 양쪽 입력 조건을 만족한다.'
   figureBasis='외부 SVG는 없고 실제 지문에 입력 조건/계산식/출력값의1행3열 표가 있다. PNG에서 √(x²)=5,(√7)²+x,빈칸이 모두 보이며 x가 음수라는 문장은 표 밖 지문에 명시되어 있다. 다른 숨은 표 행/조건이 필요하지 않다.'
   coreBasis='원문은 근호/제곱/바깥 음수의 순서를 비교해 목표 계산값의 빈칸에 맞지 않는 수를 구별했다. 현재 문항도 제곱근 정의,제곱과 근호의 순서,양/음 부호 구별을 보존한다. 원문 정답을 비교 기준으로 쓰지 않았다.'
   distinctBasis='원문의 여러 표현 중 빈칸에 들어갈 수를 평가하던 형식에서,근호값과 입력 부호를 조건으로 주고 x를 거꾸로 정한 후 새 출력값을 구하는1행 기록으로 바뀌었다. x<0가±5중 하나를 고르도록 실제 역할을 한다. 단순 수치/문구 교체가 아니라 입력 결정과 출력의 순서가 생겼다.'
   koreanBasis='입력 조건/계산식/출력값이라는 표의 역할이 분명하고 x가 음수라는 필수 조건도 짧게 지문에 제시된다. 함수를 정의하거나 컴퓨터 알고리즘을 알아야 하는 문장이 아니며 단순 산술 기록으로 자연스럽게 읽힌다.'
   scoreBasis='원본 인쇄3점과 새3점이 일치한다. 근호 정의로 두 부호를 고려하고 음수 하나를 선택한 뒤 정수 덧셈을 수행하는 짧은 경로이므로3점 배치는 편집상 수용 가능하다. 기본~응용이라는 넓은 저자 제안의 실측 난도/동일난도 승인은 별도로 보류한다.'
   stem='지문과 표는 제곱근의 정의/부호,제곱과 근호의 적용 순서를 묻는다. 2015 [9수01-07]와 이전 [9수01-03~05] 범위이며 임의의 무리방정식 풀이,고교 함수/역함수 개념을 요구하지 않는다.'
   choices='5개 정수 출력 후보는 이미 배운 정수 덧셈과 두 부호의 근 확인으로 전부 검토할 수 있다. 양수12는 입력5에서만 나오므로 x<0 조건까지 사용하는지를 구별한다. 별도 학년 밖 선택지 지식은 없다.'
   figures='표는 현재 조건/식/출력 빈칸을 같은 행에 대응시킨다. 표를 읽는 기본 표현 외에 함수 그래프,수열,프로그래밍 등은 필요하지 않다. 외부 도형이 없다는 사실도 확인했다.'
   notation='√(x²)와(√7)²는 제곱과 근호의 순서가 다르다. x<0에서 제곱근의 음이 아닌 값은 유지하고 x 자체는 음수임을 구별한다.현재 표와 해설에서 괄호,제곱,부호,빈칸이 명확하다.'
   answerSurface='정답④의2는 출력값이고 입력x=-5와 구별된다. 지문에 물리 단위가 없으며 답에 임의의 단위를 요구하지 않는다.'
   studentSol='실제 해설은 x²25의 두 근 중 음수를 선택하고7과 더한다.중3 제곱근 정의 [9수01-07]와 이전 정수 계산만으로 전체 단계가 완결된다.정의 확인을 고교의 일반 무리방정식 풀이 도구와 혼동하지 않는다.'
   prerequisites='양수의 두 제곱근/근호의 음이 아닌 값,음수 조건,괄호와 제곱,정수 덧셈을 먼저 배워야 한다.metadata에 이 조건들이 기록되어 있고 captured M3·1학기 제곱근 Unit과 대응한다.학교 출처나 저자 신뢰도로 이를 대체하지 않았다.'
  familyBasis='제곱근의 뜻과 성질 Unit1682f01b-5293-4672-91cd-07fc02e305ac는 실제 제공 snapshot의 중3·1학기 row와 같고 개념상 primary Unit 제안은 타당하다. 그러나 이 새 전체 목표/표현/조건/풀이/형식과 정확히 맞는 live family 정의는 제공·검증되지 않았다. familyKey=null을 유지하며 family count/이름으로 fit를 추론하지 않는다.'
  curriculumBasis='2015 공식 KOSAC의 [9수01-07]와 각 실제 선수 근거로 현재 전체 학생 방법을 확인했다. 원본/target metadata는2025출처·2026중3연습·2015이고 captured Unit은중3·1학기다. 이 판정은 제곱근을 배운 뒤의 범위에 한정되며 [9수] 학년군 코드만으로 정확한 학교 진도를 승인하지 않는다.2027중3/2022는 별도 pending이다.'
  surfaceBases={'stem':stem,'choices':choices,'figuresAndTables':figures,'notation':notation,'answer':answerSurface,'studentSolution':studentSol,'prerequisites':prerequisites}
  checkBases=dict(zip(CHECKS,[answerBasis,solutionBasis,existenceBasis,choicesBasis,figureBasis,coreBasis,distinctBasis,koreanBasis,curriculumBasis,'실제 지문·보기·그림/표·표기·답·학생 해설·선수학습 일곱 면을 서로 다른 아래 basis로 각각 검토했다. 현재 필요한 전체 경로는 초등 측정 및 이전 signed arithmetic,중3 제곱근 성질에서 닫힌다.',familyBasis,scoreBasis]))
  checks={k:k!='unitFamilyFit' for k in CHECKS}
  evidence={'checks':{k:{'basis':checkBases[k],'verdict':'passed' if checks[k] else 'pending'} for k in CHECKS},'ownCalculation':r['calculation'],'geometryAfterSealedMath':r['geometry'],'currentBinding':r,'replayReceipt':{'path':'own-review-replay-receipt.json','sha256':sha(v/'own-review-replay-receipt.json')},'exposure':{'helperRawCommit':replay['helperRawCommit'],'parentSealBeforeExposure':replay['parentPreExposureSeal'],'currentAuthorSolutionReadOnlyAfterSeal':True,'rawDeclarationRemainsUnchanged':raw['evidence']['exposureDeclaration'],'noNewBlindOrQuestionClaim':True,'originalKeyUsed':False},'sourceComparison':{'recordSha256':r['sourceRecordSha256'],'sourceComponentReportSha256':sha(SRC/'own-source-component-review.json'),'priorSourcePlanOnlySha256':sha(SRC/'own-grade-method-proposals.json'),'oldOriginalFirstPagesPreviouslyActuallyViewed':True,'unchangedOriginalImageHashes':[x for x in read(SRC/'own-input-before.json')['files'] if x['path'].endswith('.png')],'componentCorrespondenceOnly':True,'wholeSourceIdentityApproved':False},'curriculumPrimary':{'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','2015TabLines':'84-85','middleBandLine':'461','rootAndPriorArithmeticStandardsLine':'466','squarePerimeterAreaUnitStandardsLine':'404:6수03-03,04,05','rootStandard':'9수01-07','capturedPrimaryReceiptSha256':sha(SRC/'own-primary-receipt.json'),'actualPrimaryHtmlSha256':primaryReceipt['sha256'],'providedMOEEvidenceSha256':sha(SRC/'source-only-input/provided-curriculum-evidence.json'),'capturedUnit':unit,'snapshotSha256':sha(SRC/'source-only-input/provided-live-family-snapshot.json'),'capturedAt':snapshot['capturedAt'],'scope':'Normative method and previous prerequisites plus captured real Unit; conditional after learning. Not source-school pacing, live DB promise or2022 placement.'},'metadata':{'sourceYear':2025,'sourceSemester':1,'practiceYear':2026,'curriculum':'2015','printedAndCurrentScore':c['score'],'sourceDifficulty':'하 is correctly labeled completed-preparation metadata, not observed original-school measured difficulty','difficultyProposalReview':'기본~응용 has bounded editorial plausibility; measured calibration and same-difficulty certification pending','actualPrimaryUnitCompatible':True,'exactLiveFamilyCompatible':False,'authorOnlyAndApprovalFlagsPreserved':True},'holds':{'unitFamilyFit':True,'sourceIdentity':True,'rights':True,'similarity':True,'nativeProvenance':True,'loadable':True,'2022M3from2027':True,'difficultyCalibration':True},'collector':{'executed':False,'mocked':False,'reason':'Current task authorizes review artifacts, not production collector code. Parent runs collector; no actual collector pass count asserted.'},'dbApiWrites':0}
  report={'status':'pending','studentDigest':item['studentDigest'],'candidateDigest':item['candidateDigest'],'assetDigest':item['assetDigest'],'method':'independent-solve-then-review','verifierId':'codex-helper-independent-fresh-root-review-20261020','solveDigest':item['solveDigest'],'checks':checks,'evidence':evidence,'curriculumSurfaces':{k:{'status':'passed','basis':b} for k,b in surfaceBases.items()}}
  assert len(checks)==12 and sum(checks.values())==11 and len(report['curriculumSurfaces'])==7
  (v/'reports').mkdir(exist_ok=True);f=v/'reports'/f'q{n:02}.json'
  with f.open('x',encoding='utf-8') as out:json.dump(report,out,ensure_ascii=False,indent=2);out.write('\n')
  reports.append({'n':n,'reportSha256':sha(f),'checksPassed':11,'checksTotal':12,'gradeSurfacesPassed':7,'overallStatus':'pending'})
 own={'reports':reports,'capturedUnitVerifiedAgainstProvidedSnapshot':True,'exactPrimaryReferenceHashVerified':True,'primaryCodesCheckedInActualCapturedHtml':['9수01-07','9수01-03','9수01-04','9수01-05','6수03-03','6수03-04','6수03-05'],'actualCollectorNotRun':True,'noOriginalQuestionTextCommitted':True}
 with (v/'own-review-report-receipt.json').open('x',encoding='utf-8') as out:json.dump(own,out,ensure_ascii=False,indent=2);out.write('\n')
 print(json.dumps({'folder':str(folder),'reports':reports},indent=2))
