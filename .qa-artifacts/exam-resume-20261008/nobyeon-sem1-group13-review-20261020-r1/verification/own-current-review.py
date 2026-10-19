import json,hashlib
from pathlib import Path
from fractions import Fraction as F
base=Path('.qa-artifacts/exam-resume-20261008')
q3=base/'nobyeon-sem1-group13-review-20261020-r1/verification'
q19=base/'nobyeon-sem1-group11-review-20261020-r3/verification'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
canon=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'))
digest=lambda x:hashlib.sha256(canon(x).encode()).hexdigest()
primary={'kind':'actual official documents previously directly inspected in this same session; reused locators, no new primary sweep','moe':{'url':'https://www.moe.go.kr/boardCnts/fileDown.do?m=&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84','sha256':'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb','stream':'BodyText/Section0','records1based':{'3776':'9수01-07 제곱근의 뜻과 성질','3780':'9수01-08 무리수의 개념','3784':'9수01-09 실수의 대소 관계','3788':'9수01-10 근호를 포함한 식의 사칙계산','3956':'9수02-12 다항식의 곱셈과 인수분해'},'formulaRecordsTag88':[4029,4035,4041]},'actualM3Roots':{'url':'https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202202101132253081.pdf','pageIndex0':38,'printedPage':38,'observed':'중3 표에 9수01-07/08/09/10의 실제 배치; 문서 발행 2022는 2022 개정 교육과정 인증이 아님'},'actualM3Polynomial':{'url':'https://www.ice.go.kr/upload/board/1098/2021/10/1633051011135.pdf','pageIndex0':89,'printedPage':90,'observed':'중3 9수02-12와 곱셈공식·인수분해 관계 및 완전제곱식/공통인수 학습'},'yearScope':'2025 source and 2026 practice M3:2015; 2027 M3/2022 separate pending','limits':'문서 코드만으로 승인하지 않고 실제 아래 학생 절차와 실제 중3 배치를 결합함. 학교/학기 진도 인증 아님.'}
checksNames=['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate']
def surface(basis,evidence): return {'status':'passed','basis':basis,'evidence':evidence}
def make(q,p,surfaces,evidence):
 i=read(p/'verification-inputs.json')[0];m=read(p/'verification-manifest.json');assert h(p/'verification-inputs.json')==m['verificationInputsSha256']
 c=i['candidate'];assert digest({'candidate':c,'assetBindings':[]})==i['candidateDigest']; assert digest(i['independentSolve'])==i['solveDigest'];assert digest([])==i['assetDigest']
 student={'twinExternalId':c['twinExternalId'],'questionNumber':c['questionNumber'],'grade':c['curriculumReview']['grade'],'curriculum':c['curriculumReview']['edition'],'questionType':c['questionType'],'score':c['score'],'content':c['content'],'choices':c['choices'],'figures':[]}; assert digest(student)==i['studentDigest']
 rawPath=base/('nobyeon-sem1-group13-review-20261020-r1' if q=='03' else 'nobyeon-sem1-group11-review-20261020-r1')/'blind/solve'/('q'+q+'.json'); seal=read(p/'sealed-raw-commit.json');assert h(rawPath)==seal['proofs'][0]['sha256'];assert read(rawPath)==i['independentSolve'];assert i['independentSolve']['solverId']!=c['authorId']
 evidence.update({'primaryReferences':primary,'preExposureRaw':{'path':str(rawPath),'sha256':h(rawPath),'parentSeal':seal['rawCommit'],'rawUnchanged':True,'originalDeclarationPreserved':True},'currentBinding':{k:i[k] for k in ['studentDigest','candidateDigest','assetDigest','solveDigest']},'mathReviewed':True,'grade2015M3AfterPrerequisites':True,'newBlindOrQuestionIncrement':0,'separateHolds':{'unitFamilyFit':False,'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'loadable':False,'2022M3': 'pending'},'countsAreNotApprovalByHash':True})
 report={'status':'pending','studentDigest':i['studentDigest'],'candidateDigest':i['candidateDigest'],'assetDigest':i['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-helper-current-review-20261020-q'+q,'solveDigest':i['solveDigest'],'checks':{k:k!='unitFamilyFit' for k in checksNames},'curriculumSurfaces':surfaces,'evidence':evidence}
 (p/'reports').mkdir(exist_ok=True)
 with (p/'reports'/('q'+q+'.json')).open('x',encoding='utf-8',newline='\n') as out: json.dump(report,out,ensure_ascii=False,indent=2);out.write('\n')
 sealout={'inputHashes':{name:h(p/name) for name in ['VERIFY-BRIEF.md','verification-inputs.json','verification-manifest.json','sealed-raw-commit.json']},'rawSha256':h(rawPath),'reportSha256':h(p/'reports'/('q'+q+'.json')),'canonicalDigestsIndependentlyRecomputed':True,'checks':{'passed':11,'held':1},'surfacesPassed':7,'notRootCollectorRun':True}
 with (p/('own-q'+q+'-current-report-hashes.json')).open('x',encoding='utf-8') as out:json.dump(sealout,out,indent=2)
 print('q'+q+' report '+sealout['reportSha256'])
# All q03 calculations were made in sealed blind code; verify those exact bounds again.
calc=read(base/'nobyeon-sem1-group13-review-20261020-r1/blind/own-q03-blind-calculations.json')
for n,(lo,hi) in calc['rootBounds'].items():assert F(lo)**2<int(n)<F(hi)**2
assert calc['uniqueMissing']==[-1,1,0] and calc['choiceIntervalsPairwiseDisjoint']
source=read(base/'nobyeon-sem1-group13-review-20261020-r1/source-question-only.json')
s3={
 'stem':surface('제곱근의 대소와 다섯 실수의 최댓값·최솟값을 해석한다. 9수01-07/09/10의 실제 중3 배치 및 학습 이후 범위이다.','남은 최댓값 M=√7−1>1, 다른 수는 1 이하; 누락 최솟값 x=M−주어진차이. 함수의 극값정리 없이 유한 목록만 비교한다.'),
 'choices':surface('다섯 보기는 양의 정수의 제곱근과 덧셈·뺄셈뿐이다. 실제 중3 실수 대소/근호 계산으로 구별된다.','②=x=√2−√7. ①/③은 양수,④=x+1,⑤=x+2−√2이며 모두 x와 다르다. 자체 정확 유리수 구간도 다섯 개가 서로 겹치지 않는다.'),
 'figuresAndTables':surface('도형·표·측정이나 별도 기하 선수는 없다. 네 수의 목록은 실수 자료이다.','assets=[], figureArtifacts=[], 원본 그림/픽셀을 쓰지 않고 인쇄 JSON만 계산했다.'),
 'notation':surface('√7,√3,√2는 양수의 주제곱근이며 수 목록과 차이 표기가 중3 범위이다.','피제곱수 양수, 괄호를 포함한 차이 계산이 일관된다. 근삿값을 학생의 정확한 답으로 대체하지 않았다. 렌더러 실제 검증은 별도 보류.'),
 'answer':surface('②의 정확한 실수값 √2−√7은 9수01-09/10의 대소·근호항 정리로 구한다.','M−x=2√7−√2−1>0, x<2−√7<0<나머지 세 수. 최솟값이 엄격하고 유일하다.'),
 'studentSolution':surface('현재 해설은 √7>2,√3<2,√2>1 비교와 두 근호식의 뺄셈만 사용한다. 실제 중3 제곱근 성질·실수 대소·근호 계산 이후 정당하다.','√3−√2<1, M=√7−1; 주어진 차이를 빼 x 산출 후 √2<2로 최소성 재확인한다. 남은 세 수의 양수성은 √3>√2 및 √7>2로 즉시 확인 가능. 고등 무리부등식/함수정리 없음.'),
 'prerequisites':surface('제곱근의 뜻과 성질, 양수 제곱 비교, 실수의 순서, 동류 근호항 계산 및 이전의 뺄셈 역관계를 배운 뒤 배정한다.','2015 실제 중3 root 표의 9수01-07/09/10. captured 제곱근 UUID1682f01b-5293-4672-91cd-07fc02e305ac 및 근호 계산 학습이 먼저 필요; 중간고사라는 학교명/시기만으로 진도 인증하지 않는다.')}
make('03',q3,s3,{'independentCalculation':calc,'sourceComparison':{'sourceSha256':h(base/'nobyeon-sem1-group13-review-20261020-r1/source-question-only.json'),'observed':'원문은 완성된 다섯 근호 수에서 최댓값 a·최솟값 b를 찾아 a+b를 출력하는 4점/하 문항이다. 원문 답 계산/정답키는 사용하지 않았다.','sameCore':'양수 제곱근의 순서와 정수 경계로 유한 수를 비교한 뒤 극값 역할에 맞게 근호항을 계산한다.','actualChange':'새 문항은 최솟값이 지워진 불완전 목록과 최댓값−최솟값 조건에서 누락 입력을 복원한다. 합→차이만 바꾼 것이 아니라 미지 자료의 역할과 검산이 추가된 역추론이다.','sourceGradeField':'제공 source grade 문자열은 ?3으로 손상되어 학년 근거로 쓰지 않았다. 실제 primary 중3 배치와 학생 방법으로 판단.'},'scoreDifficulty':{'sourceObserved':'하/4점','currentProposal':'기본/4점','decision':'편집상 수용 가능한 제안; 실측 동난도 인증 아님','basis':'보이는 최댓값 파악, 차이 관계로 복원, 최솟값 검산의 짧은 과정이다. 역추론은 추가되지만 작은 정수 경계만 쓰고 복잡한 근삿값 계산이 없어 기본 4점 제안은 합리적이다.'},'naturalKorean':'가장 작은 수 하나가 지워졌다는 조건과 원래 다섯 수의 차이를 명확히 연결한다. 실제 해가 엄격한 최솟값이므로 동률의 모호성이 정답에 영향을 주지 않는다.','unitFamily':'captured Unit28032bdd-3db3-4788-9e7a-2f1909233fdb는 실수 대소와 관련되지만 근호 계산/누락최솟값 역추론 전체 목표에 맞는 실제 family 정의를 이 범위에서 확인하지 못했다. familyKey=null 유지.'})
# Recompute q19 current mathematics with independent exact rational coefficient pairs.
def add(x,y):return(x[0]+y[0],x[1]+y[1])
def mul(x,y):return(x[0]*y[0]+2*x[1]*y[1],x[0]*y[1]+x[1]*y[0])
b=(F(-4),F(3));conj=(F(4),F(3));assert mul(b,conj)==(2,0)
quot=(F(8),F(6));assert mul(quot,b)==(4,0)
square=mul(add(b,(3,0)),add(b,(3,0)));assert square==(19,-6)
assert add(quot,square)==(27,0)
q19calc={'method':'own Fraction pair p+q*sqrt2; exact, not a student algebraic-field prerequisite','a':4,'b':['-4','3'],'denominatorProduct':2,'correctedQuotient':['8','6'],'square':['19','-6'],'total':['27','0'],'recordTruth':[True,False,True],'wrongRecordConstantDifference':16,'domain':'16<18<25 gives0<b<1; conjugate positive, denominator2; all real, no units','unique':'a/b decomposition and all three independent records uniquely determined'}
with (q19/'own-q19-r3-current-calculations.json').open('x',encoding='utf-8') as out:json.dump(q19calc,out,ensure_ascii=False,indent=2)
s19={
 'stem':surface('정수부분/소수부분, 근호 계산, 세 독립 기록의 오류 진단은 2015 실제 중3 root 및 다항식 곱셈 학습 이후 방법이다.','16<18<25로 a=4,b=3√2−4. 서로 따로 계산한 기록이므로 ㄴ의 오류를 ㄷ에 전파하지 않는다. 고등 바닥함수 정리 불필요.'),
 'choices':surface('객관식 선택지는 없으며 세 기록의 진위를 모두 검토하는 서술형이다. 각 기록은 중3 계산으로 판단된다.','ㄱ 참, ㄴ은 올바른 값보다16작아 거짓, ㄷ은 제곱 전개로 참. 기록 ㄴ 하나만 오류이다.'),
 'figuresAndTables':surface('도형·표나 별도 기하 선수 없이 세 대수 기록만 있다.','assets와 figureArtifacts는 비어 있고 학생 조건/수식만 검토했다. 이미지 측정·외부 자료 없음.'),
 'notation':surface('a/b,(b+3)^2와 세 기록 기호는 중3 분수·제곱 표기이다. r3 typed schema는 학생이 요구한 수정식과 최종식의 역할을 정확히 기록한다.','correctedExpression=\\frac{a}{b},totalExpression=\\frac{a}{b}+(b+3)^2. 기존 답의 세 부분과 sealed raw의 역할/상수값이 실제 parser에서 일치한다. 단순 문자열 일치나 relation truth 증명으로 오인하지 않는다.'),
 'answer':surface('ㄴ, a/b=8+6√2, 최종합27은 실제 중3 유리화/동류항 계산으로 구한 결과이다.','분모곱18−16=2, 몫(8+6√2)(3√2−4)=4. ㄷ=19−6√2와 합해27. r3는 이 값이나 raw를 변경하지 않는다.'),
 'studentSolution':surface('현재 해설은 양수 제곱 비교, 켤레를 곱하는 유리화, 제곱의 차 및 완전제곱식 전개만 요구한다.','MOE actual9수01-10 및9수02-12, formula records4029/4035/4041; 실제 중3 다항식 학습 배치 확인. 분모b>0/켤레>0/새분모2를 명시해 각 등식의 정당성을 설명한다.'),
 'prerequisites':surface('정수부분·소수부분, 근호의 사칙계산·유리화, 다항식 곱셈공식을 학습한 뒤에만 배정한다.','실제2015 중3 root/다항식 primary 배치. UUID1682f01b/28032bdd/99ca37c0/e63d61c6 계열 제안 중 특히 다항식 곱셈 선수472가 필요하다. 9수02-05 선형식 코드를 곱셈공식 근거로 재사용하지 않는다; 실제9수02-12 record3956이다.')}
make('19',q19,s19,{'reviewType':'metadata-only r3; not fresh blind or new question','currentMath':q19calc,'metadataEqualityAndActualParse':'own-q19-r3-metadata-parse-check.json','oldFailurePreserved':{'actualRootR2':{'math':0,'grade':0},'reason':'unsupported multipart serialization','source':'user supplied actual collector outcome; former report preserved without rewriting','currentEvidence':'r3 schema and current adapter actually parsed author/raw; no pass inferred from matching hashes'},'sourceComparison':{'basis':'same source facts previously read in authorized q19 r2 source-question-only.json; no new source file or key read','observed':'原文 예시 후 2√3의 정수부분/소수부분으로 a/b+(b+2)^2 직접 계산, 중/6점.','sameCore':'제곱수 비교→소수부분 차→유리화와 제곱공식→동류항 정리','actualChange':'직접 결과 계산에서 독립 세 기록의 단일 오류 특정/계산 과정 수정/합 완성으로 목표와 구조 변경. 숫자 변경만으로 주장하지 않는다.'},'scoreDifficulty':{'sourceObserved':'중/6점','proposal':'응용/6점','rubricSum':6,'basis':'a,b1점+오류위치1점+유리화과정2점+ㄷ확인1점+합1점=6. 진단 부담 추가와 최종 근호항 소거 부담 감소를 함께 본 편집 제안; 실측 동난도/성취효과 인증 아님.'},'naturalKorean':'서로 따로 계산한 세 기록과 정확히 하나 오류라는 문장이 오류 전파 혼동을 막으며 수정 과정 및 최종합 요구가 분명하다.','unitFamily':'captured 근호계산UUID99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1 및 다항식 선수 제안은 있으나 세 기록진단/수정/합 전체 목표의 실제 livefamily는 정의 확인 전 null이다.'})
