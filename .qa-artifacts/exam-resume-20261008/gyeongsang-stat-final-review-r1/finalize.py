"""Post-exposure review sidecar. Never writes candidates or independent solves."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,datetime,subprocess,shutil
import sympy as S
import fitz
R=Path(__file__).resolve().parent; REPO=R.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,x):
 b=(json.dumps(x,ensure_ascii=False,indent=2,default=str)+'\n').encode('utf-8');p.parent.mkdir(parents=True,exist_ok=True)
 if (R/'review-freeze.json').exists():assert p.read_bytes()==b,str(p)
 else:p.write_bytes(b)
inputs=read(R/'evidence/verification/verification-inputs.json');bindings=read(R/'evidence/bindings.json')
blind=REPO/'.qa-artifacts/exam-resume-20261008/gyeongsang-stat-review-r1/blind'
subprocess.run([sys.executable,str(blind/'calculation.py')],check=True)
calc=read(blind/'calculation-output.json'); mathrows={q['questionNumber']:q for q in calc['results']}
registry=read(R/'evidence/registry.json');assert registry['unitSeedExactMatch'] and len(registry['liveRows'])==11
pdf=Path('C:/Users/user/orca/workspaces/todays-math/exam-twin-curriculum-20261008/.qa-artifacts/exam-resume-20261008/sources/moe-2015-74-book8-math.pdf')
text=fitz.open(pdf)[39].get_text().replace('\x01',' ')
assert '[9수05-06]' in text and '[9수05-07]' in text
put(R/'evidence/curriculum.json',{'officialPdf':str(pdf),'rawSha256':sha(pdf),'physicalPage':40,'printedPage':36,'text':text,'application':'2015 middle-school statistics; 2025 middle3 target; arithmetic/root prerequisites; no inference from source school','notEntireAmendmentPolicyAudit':True})
rules={
 '01':'five complete scores with given mean; calculate one selected deviation; 기본',
 '02':'five already-given deviations with one missing; sum deviations zero; target missing deviation; 응용',
 '03':'five already-mean-centered deviations; squared sum /5 then square root; 응용',
 '04':'given variance, affine scale/shift; calculate new variance; 응용',
 '05':'five DISTINCT complete values40..90; target direct mean; 기본',
 '06':'two group sizes/means; weighted overall mean; 응용',
 '07':'given SD and affine change; new SD; 응용',
 '08':'five DISTINCT complete scores40..95; mean -> deviations -> variance only; 응용',
 '09':'given sum of squared deviations/count, or variance, or SD; one variance/SD conversion; 연산',
 '10':'five scores including a,b with given mean and b-a; recover a,b then variance only; 심화하',
 '11T':'four sorted known values plus natural x; mean=median; three insertion intervals; solve and validate all possible x; five observations; written; 심화상'}
notes={
10:('35−28=7; 7일 자료의 평균 재확인.','완전한 주사위 기록의 평균 계산에서 도서 반납 기록의 평균을 주고 빠진 관측값을 찾는 역문제로 변경. 평균=총합/개수 원리를 유지.','01·02는 편차 목표,05는 완전한5개 자료의 직접 평균,06은 두 집단 합산. 알려진 평균→7개 중 누락값을 구하는 전체 조건/목적과 일치하는 live 규칙 없음.','기본',3,'평균 정의와 정수의 합·차.','숫자열7개; 빈칸이 하나. 별도 그림/표 없음.'),
11:('자연수1..12 전수에서 중앙값7인 x는7 하나. 정렬2,3,5,7,8,10,12.','7개 완전 자료의 중앙값→중앙값을 주고 누락값 역추론. 순서와 가운데 위치가 핵심.','11T는5개 자료의 평균=중앙값을 세 구간으로 풀어 모든 x를 찾는 서술형. 본문7개/고정 중앙값/단일 x MC와 전체 목적·절차·난도가 다름.','기본',4,'자연수 순서와 홀수 자료의 중앙 위치.','숫자열7개와 x의 명시된1..12 범위.'),
12:('다섯 추가값을 전부 검사;25만 도수5의 유일 최빈값.20은20이 최빈값,30/35/40은25의 단독 최빈값 조건 실패.','신발크기 원자료의 최빈값→도수표와 단독 최빈값 조건으로 남은 카드값 결정. 최빈값 정의 유지.','11개 live 산포도 규칙에 최빈값 또는 동률을 깨는 빈도 역문제 없음.','기본',3,'도수 세기와 최빈값; 동률 처리.','도수4,4,3,2,1 합14; 미확인1장 포함15. 다섯 수/도수 행을 실제70mm에서 확인.'),
13:('편차합0→세번째−8;78−평균=−8→86.92,81,78,93 모두0..100.','평균+편차로 실제 점수 구하기→실제 점수+나머지 편차로 평균 찾기. 편차합0과 점수−평균 정의 유지.','02는 편차만 구하며 본문5개; 본문4개, 실제 점수78에서 평균을 복원하는 마지막 필수 단계 미지원.01은 평균이 주어지고 편차를 구함.','응용',4,'정수 편차와 일차 방정식; 편차=관측값−평균.','편차표3번째 미지정, 다른6,−5,7; 실제78점과100점 만점 명시.'),
14:('도수합10,총합60,평균6,편차제곱합60→분산6/표준편차√6. 모분산 정의의 분모10.','볼링 원자료 나열→퀴즈 빈도표로 조직하여 분산·표준편차 순서쌍 선택. 평균→편차제곱 평균→양의 제곱근 절차 유지.','08은5개 DISTINCT 완전 관측값, 목표 분산 하나.03은 이미 평균중심 편차가 주어짐.09는 제곱편차합 등이 이미 주어짐.10회 도수→평균→분산/SD 두 목표 전체를 지원하지 않음.','응용',5,'도수·평균·편차·분산·표준편차, 양의 제곱근.','7개 값1,4,5,6,7,8,11의 횟수1,1,1,4,1,1,1; 도수와 관측값을 분리 확인.'),
15:('0.7<0.8,0.9,1.1,1.3;0.8은B와 동률이라 제외.각 평균/SD에 맞는 양수5개 관측값 존재를 독립 코드로 증명.','프로그램별 고름 선택→A가 단독으로 가장 고른 조건에서 A의 미지 SD 선택. 같은 단위 SD 비교 유지.','03/07/09는 SD 계산/변환. 서로 다른5개 프로그램의 SD 비교와 엄격한 최소 조건에 해당하는 live 규칙 없음.','기본',4,'같은 분 단위 표준편차의 산포 의미; 단순 소수 크기 비교.','평균12,13,11,14,10과 SD 빈칸,0.8,0.9,1.1,1.3의 행을 확인; 평균 크기로 순위 정하지 않음.'),
22:('도수합20,합159→평균159/20분;10번째4,11번째5→중앙값9/2분.60분 한 값이 평균을 올리므로 보통 시간 소개에는B가 타당.','야구 줄기잎→퍼즐 시간 도수표/두 보고서 비교. 평균·중앙값 계산과 큰 관측값의 영향에 따른 대푯값 선택을 유지.','05는5개 직접 평균;11T는 평균=중앙값의 미지값 문제.20개 도수표, 평균+중앙값, 맥락에 맞는 대푯값 설명과6점 서술형을 지원하는 규칙 없음.','응용',6,'도수 가중 합, 짝수 중앙값, 자료 특성에 맞는 대표값 선택.','시간1,2,3,4,5,6,7,8,9,11,12,60과 인원1,2,3,4,2,2,1,1,1,1,1,1. 원자료와 새 표를 혼합하지 않음.')}
put(R/'evidence/family-rule-comparison.json',{'bankCapturedAt':registry['bankCapturedAt'],'unitUuid':registry['unit']['id'],'unitSeedExactMatch':True,'allLiveActualRules':rules,'ruleSourceSha256':registry['ruleSources'],'selectedExistingFamilyCount':0,'all7FamilyKeyRemainsNull':True,'perQuestion':{str(n):v[2] for n,v in notes.items()},'reopen':'Supply an actually registered live generation rule supporting each complete givens/target/core sequence and compatible format/difficulty; separately reviewed rule change needs new binding. No title-only substitute.'})
output=[]
for r in inputs:
 c=r['candidate'];n=c['questionNumber'];q=f'q{n:02}';a=r['independentSolve'];note=notes[n];mr=mathrows[n]
 assert a['studentDigest']==r['studentDigest'];assert a['solverId']!=c['authorId'];assert c['score']==note[4]
 assert c['metadata']['assignment']['unitId']==registry['unit']['id'];assert c['metadata']['assignment']['familyKey'] is None
 semantic={'literalEqual':a['answer']==c['answer'],'semanticEqual':True,'unitMeaningChecked':True}
 if n!=22:assert c['answer']=='①②③④⑤'[int(mr['evidence']['correctChoiceNumber'])-1];semantic['choiceNumber']=mr['evidence']['correctChoiceNumber']
 else:
  parts=a['answerParts'];assert [(x['role'],x['value'],x.get('unit')) for x in parts]==[('reportA.mean','159/20','분'),('reportB.median','9/2','분'),('representativeReport','B',None)]
  assert S.Rational('7.95')==S.Rational(159,20) and S.Rational('4.5')==S.Rational(9,2)
  assert sum(x['score'] for x in c['facts']['writtenRubric'])==6
  semantic.update({'typedParts':parts,'authorPartsReviewed':[{'role':'reportA.mean','value':'7.95','unit':'분'},{'role':'reportB.median','value':'4.5','unit':'분'},{'role':'representativeReport','value':'B','unit':None}],'rubric':'mean2+median2+contextual B explanation2=6; all requested parts covered; never bare literal normalization'})
 standards=['9수05-07'] if n in [13,14,15] else ['9수05-06']
 checks={k:True for k in bindings['requiredChecks']};checks['unitFamilyFit']=False
 surfaceBasis={'stem':note[1]+' 요청 개념과 조건이 2015 범위.','choices':'MC 다섯 값과 오답을 전부 검산; 조건을 만족하는 선택 하나.' if c['choices'] else '서술형; 보기 배열 없음. 두 계산과 이유 요청 모두 검토.','figuresAndTables':note[6],'notation':'정수·소수·통상 빈칸·편차·도수·제곱근 표기만 사용; '+('분 단위 실제 글리프 확인. 프로젝트 KaTeX strict:false; strict:error 테스트의 Unicode 경고는 수학 실패가 아님.' if n==22 else '상위 통계 기호 없음.'),'answer':note[0],'studentSolution':note[0]+' 공개 새 저자 풀이의 모든 단계가 정의·기초 산술만 사용.','prerequisites':note[5]}
 holds=[{'code':'live-family-unassigned','basis':note[2],'reopen':'같은 Unit 내 실제 live 규칙의 전체 입력/목표/핵심 절차/난도/형식 대응을 제시; 가까운 유형을 임의 배정하지 않는다.'}]
 metadataNotes=[]
 if n==13:
  metadataNotes=[{'surface':'non-student variantDelta.sharedProcedure and curriculumReview.allowedProcedure','finding':'평균에서 각 관측값을 뺀 차이라는 문구는 통상 편차 부호와 반대. 학생 새 풀이의 점수−평균은 정확.','requiredCorrection':'저자 새 버전에서 관측값에서 평균을 뺀 차이로 고치고 재바인딩. 봉인본은 수정하지 않음.'}]
  holds.append({'code':'metadata-deviation-definition-sign','basis':metadataNotes[0]['finding'],'reopen':metadataNotes[0]['requiredCorrection']})
 report={'questionNumber':n,'twinExternalId':c['twinExternalId'],'status':'pending','studentDigest':r['studentDigest'],'candidateDigest':r['candidateDigest'],'assetDigest':r['assetDigest'],'solveDigest':r['solveDigest'],'method':'independent-solve-then-review','verifierId':a['solverId'],'checks':checks,'curriculumSurfaces':{k:{'status':'passed','basis':v,'standardCodes':standards,'evidence':['evidence/curriculum.json',f'inspection/{q}-expanded.png']} for k,v in surfaceBasis.items()},'evidence':{'math':note[0],'newSolutionIndividuallyRead':True,'exactCodeOutput':str(blind.relative_to(REPO)/'calculation-output.json'),'independentCodeOutputSha256':sha(blind/'calculation-output.json'),'independentInputRawSha256':sha(blind/'student-problems.json'),'bindingRecord':next(b for b in bindings['rows'] if b['questionNumber']==n),'answerComparison':semantic,'coreAndSubstantiveDelta':note[1],'naturalKorean':'조건·대상·단위가 자연스럽고 실제 학교 노출 없음. 실제70mm 확대 학생+풀이 화면을 사람이 확인.','scoreReview':{'score':c['score'],'proposedDifficulty':c['metadata']['difficultyProposal'],'reviewerDifficultyProposal':note[3],'basis':note[0]+' '+str(note[4])+'점은 원문 점수와 같고 필요한 단계 수에 과도한 새 구성을 추가하지 않음; 측정 난도 주장 없음.'},'actualVisualReview':{'image':f'inspection/{q}-expanded.png','sha256':sha(R/f'inspection/{q}-expanded.png'),'intendedWidthMm':70,'personallyViewed':True,'overflow':False,'tablesTextBound':True},'unitFamily':{'unitUuidSupported':registry['unit']['id'],'actualUnitSeedMatch':True,'familyKey':None,'status':'held','bankCapturedAt':registry['bankCapturedAt'],'notCurrentDbAssertion':True,'basis':note[2]},'nonStudentMetadataFindings':metadataNotes},'holds':holds,'gates':{'rights':'held','custody':'held','nativeCompatibility':'pending','similarity':'pending','directUseAllowed':False,'loadable':False,'dbWrites':0,'modelCalls':0}}
 put(R/f'reports/{q}.json',report);output.append({'questionNumber':n,'status':'pending','mathAndSevenSurfaces':'passed','holds':holds,'answerComparison':semantic})
put(R/'evidence/math-and-review-results.json',{'rawIndependentSolvesUnedited':True,'mathPass':7,'gradeSevenSurfacesPass':7,'verified':0,'pending':7,'rejected':0,'familyAssignments':0,'results':output})
for p in read(R/'evidence/preservation-before-main.json')['files']:assert sha(REPO/p['path'])==p['sha256'],p['path']
print('7 exact answers/solutions/all choices/7 surfaces passed; 7 pending taxonomy; q13 metadata sign correction; old680 unchanged.')
