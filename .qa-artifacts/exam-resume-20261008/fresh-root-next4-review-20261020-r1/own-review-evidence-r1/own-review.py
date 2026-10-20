from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,hashlib,subprocess
P=Path('.qa-artifacts/exam-resume-20261008/fresh-root-next4-review-20261020-r1');E=P/'own-review-evidence-r1';rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();inputs=[];rawReceipt=rd(P/'own-raw-evidence-r1/own-raw-seal-receipt.json')
for x in rawReceipt['studentInputs']+rawReceipt['raws']:
 assert h(x['path'])==x['sha256'];p=Path(x['path']);assert p.read_bytes()==subprocess.check_output(['git','show','96e8765a780ca382f8ea44ddcb658c566a63dd30:'+p.as_posix()]);inputs.append(x)
for exam in ['daegubuk','daeguil']:
 base=P/exam;files=[base/'package/manifest.json',*[f for f in(base/'package/private').rglob('*')if f.is_file()],*[base/'verification'/n for n in ['VERIFY-BRIEF.md','verification-inputs.json','verification-manifest.json']],base/'solution-preview/q01.solution.png',base/'solution-preview/q03.solution.png']
 inputs.extend({'path':f.as_posix(),'sha256':h(f)}for f in files)
refBase=Path('.qa-artifacts/exam-resume-20261008/fresh-three-source-component-review-20261020-r1');refs=[refBase/n for n in ['own-source-component-review.json','own-grade-method-proposals.json','own-primary-receipt.json']];overlay=Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/fresh-nine-local-normalization-observations-r3.json');refs.append(overlay);inputs.extend({'path':f.as_posix(),'sha256':h(f)}for f in refs)
assert h(refs[0])=='510b973fc8c78d878e995e22f85a9c31104b08a9be080976f818d8cf8d12afc5';assert h(refs[1])=='56c430c3e7ac656cab874e33603f8a13c94cefc985b3f82e8fc55cff080b7947';assert h(refs[2])=='d11ce0f9972d0081fcda9642c6e1b049158176d7147a96a51b6d22a494c16ce7';assert h(overlay)=='b4e4d51d1af29463e839008012f7a5908cfd81e0e51579a12e6de865d96b2ab0'
(E/'own-inputs-before.json').write_text(json.dumps(inputs,indent=2)+'\n',encoding='utf-8');probe='다음 네 문항 현재 전체 검토 √ 봉인 raw 불변\n';(E/'own-utf8-probe.txt').write_text(probe,encoding='utf-8');assert(E/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe
calcs={'daegubuk-q01':{'kChoices':[4,8,16,32,64],'distanceSquared':[4*x for x in [4,8,16,32,64]],'requiredDistanceSquared':64,'a':-4,'b':4,'k':16},'daegubuk-q03':{'A':str(F(3,10)),'C':str(-F(27,99)),'D':str(F(7,3)),'irrationalRadicandsNonSquare':{str(x):isqrt(x)**2!=x for x in [5,7]},'remainingRecords':['B','E'],'count':2},'daeguil-q01':{'area':str(F('0.81')),'twoRoots':[str(-F('0.9')),str(F('0.9'))],'positiveSideCm':str(F('0.9')),'rootSquared':str(F('0.9')**2),'wrong0.81Squared':str(F('0.81')**2)},'daeguil-q03':{'bounds':[],'selectedRecords':['A','D','E'],'count':3}}
for name,n,sign,shift in [('A',11,1,-3),('B',3,1,-2),('C',10,1,-2),('D',2,-1,2),('E',15,-1,4)]:
 lo=isqrt(n);assert lo*lo<n<(lo+1)**2;bounds=[lo+shift,lo+1+shift]if sign==1 else[shift-lo-1,shift-lo];calcs['daeguil-q03']['bounds'].append({'record':name,'integerSquareBounds':[lo*lo,n,(lo+1)**2],'strictExpressionBounds':bounds})
assert F('0.9')**2==F('0.81');assert sum(4*x==64 for x in[4,8,16,32,64])==1
primary={'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','priorActuallyInspectedPrimaryReceipt':{'path':refs[2].as_posix(),'sha256':h(refs[2])},'2015TabLines':'84-85','standardsLine':'466','teachingLimits':'477-485','MOE2015Placement':'MOE2015-74 Book8 physical33/printed29 root07..10; MOE2020-236 Book8 BodyText/Section0 records3776/3780/3784/3788','MOE2020DocumentSHA256':'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb','capturedActualM3Sem1Units':'Prior source-nine grade-method evidence rows order469(root definition),470(real numbers),471(root calculation), captured2026-10-19 18:07:30.165227+00; not a current DB/pacing/family promise.','yearScope':'2025source/2026practice M3=2015 after prerequisites.2027M3/2022 pending separate review.','newPrimaryFetch':False}
# Each face has its own actual content/procedure, not a copied blanket status.
surfaces={
'daegubuk-q01':[
'지문은 양수 k의 두 제곱근과 순서 a<b, 거리8만 사용한다. [9수01-07]의 양수의 두 근 정의에 이미 배운 수직선을 연결한다.',
'4,8,16,32,64의 다섯 선택값을 제곱근의 거리와 대조한다. 근호식의 고교 방정식이 아니라 [9수01-07] 정의와 정수 사칙계산이다.',
'A와 B가 O의 양쪽에 있는 수직선은 음수·양수 및 두 근의 대칭을 표시한다. 별도 함수·좌표거리공식이나 길이 측정이 필요 없다.',
'k>0 및 작은 근 a, 큰 근 b의 순서를 사용하는 기호는 중학교 문자와 수직선이다. ±를 별도 해집합 이론으로 확장하지 않는다.',
'③은 k=16에 해당한다. (-4)²=4²=16과4-(-4)=8로 검산하며 답의 대상은 k 하나다. 단위 cm를 새로 붙이지 않는다.',
'실제 해설은 두 근의 절댓값 같음→거리의 절반4→a=-4,b=4→제곱16→대입검산이다. 제곱근 정의·거리·나눗셈만으로 끝나며 상위 정리가 필요 없다.',
'배정 전 [9수01-07], 양수·음수와 정수 사칙 [9수01-03/05], 원점과 수직선 거리를 배워야 한다. 현재 정규화된 M3 Unit469는 보조 배치 근거이며 학교 진도 승인은 아니다.'],
'daegubuk-q03':[
'다섯 실수를 유리수/무리수로 분류해 유리수 칸을 지운다. [9수01-07/08]과 M2 순환소수 [9수01-06] 이후의 단순 분류다.',
'0~4개 보기는 분류된 칸의 정수 개수만 비교한다. 범위를 벗어나는 통계·경우의 수 정리 없이 B,E 두 칸을 센다.',
'A~E 표에 유한소수 근호, √7, 음의 순환소수, 분수 근호, √5-2가 실제로 한 개씩 표시돼 있다. 표를 읽는 데 추가 수학 모델은 없다.',
'-0.dot2dot7은 순환마디27로 본문에서 명시됐다. 근호 전체 49/9와 괄호 범위가 PNG에서도 보인다. [9수01-06/07] 표기이며 근호가 있다는 이유만으로 무리수로 분류하지 않는다.',
'③=2개는 유리수3/10,-3/11,7/3을 제외한 B,E의 수다. 분모10,11,3이0이 아니고 근호 안 수는 모두 양수다.',
'실제 해설은 A,C,D를 정확한 분수로 바꾸고 비제곱수7의 근과 √5-2를 분류한다. E에2를 더하면 √5가 된다는 짧은 설명은 유리수 사칙 성질과 [9수01-08]로 충분하며 고교 형식 논리·무한급수는 요구하지 않는다.',
'M2 유리수/순환소수와 분수변환 [9수01-06], 정수비 사칙 [9수01-05], M3 제곱근·무리수 [9수01-07/08] 뒤에 배정한다. 정의만 처음 배운 차시로 소급 승인하지 않는다.'],
'daeguil-q01':[
'지문은 넓이0.81cm²의 정사각형에서 같은 양수의 모든 제곱근과 실제 변 길이를 구별한다. [9수01-07]의 두 근 정의를 초등 넓이와 연결한다.',
'다섯 보기의 ±0.9,0.9,-0.9,±0.81을 정의와 길이 양수 조건으로 판별한다. 제곱0.81²=0.6561도 유한소수 사칙 범위다.',
'정사각형 그림의 라벨은0.81cm²이며 표 ㄱ은 모든 제곱근, ㄴ은 한 변이라는 다른 역할을 구분한다. 새 도형 정리나 픽셀 측정은 없다.',
'±는 두 수를 함께 쓰는 표기이고 cm²는 넓이, cm는 길이다. 실제 PNG에서 수학 명령이 정상 렌더되고0.81의 소수점과 제곱 지수가 구별된다.',
'③의 ㄱ=±0.9는 수 두 개, ㄴ=0.9cm는 양의 길이 한 개다. [9수01-07] 정의 및 초등 단위 규칙으로 유일하게 결정된다.',
'실제 해설은0.9²와(-0.9)²를 확인한 뒤 길이는 양수라0.9cm라고 한다. 근호 방정식의 허근 처리나 고교 이차방정식 공식은 전혀 필요 없다.',
'M3 제곱근 정의 [9수01-07], M1 부호·제곱과 사칙, 초등 정사각형 넓이 및 cm/cm²를 이미 배운 뒤 배정한다. M3 Unit469 배치와 일치하며 2022 전용은 별도다.'],
'daeguil-q03':[
'다섯 근호식에서0보다 크고1보다 작은 것을 고르는 조건은 [9수01-09] 실수 대소 비교다. 연속함수·극값이나 고교 무리부등식 풀이를 요구하지 않는다.',
'보기0~4개는 A,D,E의3개라는 유일한 집계와 비교한다. 정밀 소수 근삿값이나 일반 해집합 구조를 써야 할 보기는 없다.',
'A~E 표의 √11-3,√3-2,√10-2,2-√2,4-√15를 각각 읽는다. 좌표그래프/수치 측정 없이 양의 제곱근의 순서로 비교한다.',
'지문의 크다/작다는 엄격 부등호이며 두 끝값0,1을 제외한다. 학생 해설 부등호 방향은 양변에 같은 수를 더하거나 빼는 M2 성질과 [9수01-09]로 설명된다.',
'④=3개이다. A,D,E는(0,1),B는(-1,0),C는(1,2)에 있으므로 끝값 일치 없이 답이 고정된다. 괄호 구간 표기는 검수용이고 학생에게 추가로 요구하지 않는다.',
'실제 해설 모든 행에서 인접한 정수 제곱 비교→양의 근 범위→정수 이동만 사용한다. D/E는 빼는 근호의 양끝을 바르게 뒤집어0<값<1을 얻었다. B/C를 단 한 경계로 배제하는 것도 충분하다.',
'M3 양의 제곱근과 실수 비교 [9수01-07/09], 정수 제곱·사칙 및 M2 부등식 성질 [9수02-09] 후 배정한다. 원문 학교/중1~3 band코드만으로 진도를 승인한 것이 아니다.']}
comparisons={
'daegubuk-q01':('원문 일반 진술의 제곱근 뜻·두 근/부호를 판단하는 핵심 중 양수의 두 근이라는 부분을 보존한다. 원문에 있던 근호계산·비교의 모든 부수 기능을 보존한 것은 아니다.','여러 일반 진술의 정오 선택에서 수직선의 결과 거리8을 주고 원래 k를 찾는 역방향으로 바뀌었다. 새 거리→절반→두 근→제곱이라는 연결이 필요하여 숫자 치환만은 아니다.','기본','대칭에 따른 절반과 제곱의 두 단순 단계라 기본이 적절하며 응용 상단은 근거가 약하다.'),
'daegubuk-q03':('원문은 유리수·무리수가 섞인 수의 쌍에서 무리수만 있는 쌍을 고르는 분류였다. 새 항목도 유한소수/분수 근호·순환소수·무리수의 유리수 이동을 정의로 분류한다.','수 쌍의 선택에서 단일5칸 표를 지우고 남은 수를 묻는 전체 집계로 재구조화했다. 선택지별 쌍 비교와 현재의 개별 분류/제거/계수 대상이 다르다.','기본 상단','다섯 항목과 E의 짧은 설명이 필요하지만 개별 계산은 간단하다. 기본 상단 또는 응용 초입은 편집 판단이며 측정 난도는 미교정이다.'),
'daeguil-q01':('원문 일반 설명의 두 제곱근/양의 근호값 구별을 보존했다. 두 수를 모두 쓰는 일과 물리 길이를 정하는 일은 같은 양수의 제곱 정의에 근거한다.','일반 명제 정오에서 넓이가 주어진 정사각형의 ㄱ/ㄴ 두 기록을 나란히 완성하도록 바뀌었다. 수학적 두 근과 양수 길이라는 답 역할을 분리하는 실제 맥락 변화가 있다.','기본','0.9² 확인과 길이 양수 조건만 필요한 기본 개념 구별형이다. 원문 하 라벨과 같다는 경험적 승인은 아니다.'),
'daeguil-q03':('원문의 근호 실수 대소 비교와 공통 정수항의 더하기/빼기, 양의 근 크기 비교를 보존했다. 복잡한 근호합 제곱이나 상위 부등식으로 바꾸지 않았다.','진술 중 옳은 부등식 한 개 선택에서 다섯 수를 두 공통 경계0,1에 동시 비교해 개수를 고르는 표 구조로 바뀌었다. 양끝 조건과 음의 근호항 방향을 모두 확인한다.','기본 상단','다섯 번의 간단한 끼워 비교와 개수 집계라 기본 상단, 응용 초입까지의 편집 제안은 가능하다. 새 난도와 원문 난도 동등성은 실측하지 않았다.')}
sourceReviews=rd(refs[0]);gradePrior=rd(refs[1]);normal=rd(overlay);reports=[]
for exam in ['daegubuk','daeguil']:
 base=P/exam;manifest=rd(base/'package/manifest.json');vManifest=rd(base/'verification/verification-manifest.json');assert h(base/'verification/verification-inputs.json')==vManifest['verificationInputsSha256'];students={x['questionNumber']:x for x in rd(base/'blind/student-problems.json')}
 for x in rd(base/'verification/verification-inputs.json'):
  c=x['candidate'];n=c['questionNumber'];key=exam+f'-q{n:02}';raw=rd(base/'blind/solve'/f'q{n:02}.json');assert raw==x['independentSolve'];assert raw['answer']==c['answer'];assert all(students[n][k]==c[k]for k in ['content','choices','questionType','score','twinExternalId']);assert c==rd(base/'package/private'/f'q{n:02}'/'candidate.json');binding=next(y for y in manifest['bindings']if y['studentDigest']==x['studentDigest']);assert h(base/'package'/binding['privateCandidatePath'])==binding['candidateFileSha256'];assert all(binding[k]==x[k]for k in ['studentDigest','candidateDigest','assetDigest']);assignment=c['metadata']['assignment'];assert assignment['familyKey']is None
  component=c['sourceReference']['sourceComponentReview']['component'];prior=next(y for y in sourceReviews['components']if y['component']==component);priorGrade=next(y for y in gradePrior['components']if y['component']==component);assert prior['observed']['printedScore']==3;assert priorGrade['capturedPrimaryUnitProposal']['id']==assignment['unitId'];overlayRow=next(y for y in normal['rows']if y['component']==component);assert overlayRow['workerProposal']['sha256']==overlayRow['newLocalOnly']['sha256'];assert overlayRow['wholePairIdentityApproved']is False
  assetEvidence=[]
  for i,asset in enumerate(binding['assets'],1):
   private=base/'package/private'/f'q{n:02}';sp=private/f'figure-{i}.spec.json';svg=private/f'figure-{i}.svg';assert h(sp)==asset['specSha256']and h(svg)==asset['svgSha256'];assert svg.read_bytes()==(base/'blind'/asset['studentPath']).read_bytes();spec=rd(sp)
   if exam=='daegubuk':assert [p['at']for p in spec['points']]==[[-4,0],[0,0],[4,0]];assert [l['text']for l in spec['labels']]==['A','O','0','B']
   else:
    pts=[[F(str(v))for v in p]for p in spec['polygons'][0]['points']];deltas=[(pts[(i+1)%4][0]-pts[i][0],pts[(i+1)%4][1]-pts[i][1])for i in range(4)];assert all(dx*dx+dy*dy==F(81,100)for dx,dy in deltas);assert all(deltas[i][0]*deltas[(i+1)%4][0]+deltas[i][1]*deltas[(i+1)%4][1]==0 for i in range(4));assert '0.81' in spec['labels'][0]['text']
   assetEvidence.append({'specSHA256':h(sp),'svgSHA256':h(svg),'sameStudentSVG':True,'authorCoordinateConsistencyOnlyAfterSeal':True,'pixelsAsOracle':False})
  shared,changed,difficulty,basis=comparisons[key];actual=calcs[key];checks={name:True for name in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']};checks['unitFamilyFit']=False
  surf={name:{'status':'passed','basis':text,'primaryReference':primary}for name,text in zip(['stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'],surfaces[key])}
  evidence={'ownExactCurrentCalculations':actual,'answerCorrect':{'basis':'独立rawを先に封印した後で比較。' if False else '封印前の独立計算を保持。' if False else '봉인 전 독립 계산을 그대로 보존하여 현재 답과 비교했고 모든 보기를 직접 검산했다.','rawSHA256':h(base/'blind/solve'/f'q{n:02}.json'),'answer':raw['answer']},'solutionCorrect':{'basis':surfaces[key][5],'currentAuthorSolutionSHA256':hashlib.sha256(c['solution'].encode()).hexdigest(),'solutionPNGViewed':True},'existenceUniqueness':{'basis':surfaces[key][4],'details':actual},'choicesCorrect':{'basis':surfaces[key][1],'all5Checked':True,'rawDetailedChecksRetained':True},'figureConsistent':{'basis':surfaces[key][2],'assets':assetEvidence,'solutionAndStudentPNGActuallyViewed':True,'nativeReaderParity':False},'sameCoreConceptAndProcedure':{'basis':shared,'priorOwnComponent':component,'priorSourceEvidenceSHA256':h(refs[0]),'normalizationObservationSHA256':h(overlay),'boundedLocalNormalizationResolved':True,'wholeSourceIdentityApproved':False},'distinctPresentation':{'basis':changed,'moreThanNumericSubstitution':True},'naturalKorean':{'basis':'지문의 요청 대상과 표/그림 라벨, 5개 보기의 대응이 명확하다. '+('두 기록의 모든 수와 한 양의 길이를 분리하는 표현이 자연스럽다.'if key=='daeguil-q01'else'현재 solution PNG에서 기호·줄바꿈·근호 범위가 읽힌다.')},'curriculumAppropriate':{'basis':'2015M3 실제 현재 전체 방법은 아래7면별 근거 및 선수학습 조건 내에 있다. 원본 학교·저자 제안·코드 통과만으로 승인한 것이 아니다.','primary':primary},'allStudentSurfacesInScope':{'basis':'현재 stem/choices/figuresAndTables/notation/answer/full studentSolution/prerequisites 각각 실제 내용을 구분해 판단했다.','appliesAfterListedPrerequisites':True,'2022':'pending'},'unitFamilyFit':{'basis':'캡처된 Unit UUID와 현재 목표 개념은 위와 같이 대응하지만 정확한 live family 정의/전체 목표·도메인·형식 적합성은 증명하지 못했다. null family를 추정 키로 채우지 않는다.','unitId':assignment['unitId'],'course':'중3','unitSection':assignment['currentUnit']['section'],'liveFamilyKey':None,'status':'pending'},'scoreAppropriate':{'basis':'현재 네 문항은 각3점의 짧은 개념/분류/비교형으로 편집상 과도하지 않다. '+basis,'score':3,'sourcePrintedScoreObserved':3,'sourceDifficultyLabelObserved':'하','sourceLabelAuthority':'completed-preparation label, not measured original-school difficulty','targetDifficultyJudgement':difficulty,'authorBroadProposal':'기본~응용 저자 제안','empiricalCalibration':'pending','sameDifficultyApproved':False},'exposure':{'priorSourceNineAndRelatedPublicCode':True,'currentAuthorExposedOnlyAfterRawCommit':'96e8765a780ca382f8ea44ddcb658c566a63dd30','parentPreExposureSeal':'617a23934a60be011fb89c09e4cf36ff6bfc97f0','rawUnchanged':True,'notNewBlindClaimAfterExposure':True},'separateHolds':{'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'loadable':False,'2022Placement':'pending','schoolPacingCertified':False}}
  report={'status':'pending','studentDigest':x['studentDigest'],'candidateDigest':x['candidateDigest'],'assetDigest':x['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-current-next4-full-review-20261020-r1','solveDigest':x['solveDigest'],'checks':checks,'evidence':evidence,'curriculumSurfaces':surf};directory=base/'verification/reports';directory.mkdir(exist_ok=True)
  with(directory/f'q{n:02}.json').open('x',encoding='utf-8')as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
  reports.append({'exam':exam,'question':n,'path':(directory/f'q{n:02}.json').as_posix(),'sha256':h(directory/f'q{n:02}.json'),'checksPassed':sum(checks.values()),'gradeSurfacesPassed':7,'status':'pending'})
(E/'own-exact-review-calculations.json').write_text(json.dumps({'current':calcs,'reportBindings':reports,'authorSolutionsPNGsViewed':4,'rawUnchanged':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(reports,ensure_ascii=False))
