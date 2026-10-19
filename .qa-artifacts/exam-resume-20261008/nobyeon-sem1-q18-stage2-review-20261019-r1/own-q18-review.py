from pathlib import Path
from fractions import Fraction as F
import json,hashlib,urllib.request,io,zlib,struct,olefile
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q18-stage2-review-20261019-r1')
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def read(q):return json.loads(q.read_text(encoding='utf-8-sig'))
def put(n,v):
 q=p/n;q.parent.mkdir(exist_ok=True)
 with q.open('x',encoding='utf-8',newline='\n') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
names=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q18-only.json','official-locators-reference.json'];before={n:sha(p/n) for n in names};a=read(p/names[0])[0];c=a['candidate'];seal=read(p/names[3]);rawp=p.parent/'nobyeon-sem1-q18-clean-blind-20261019-r1/solve/q18.json';raw=read(rawp)
assert before[names[0]]==read(p/names[1])['verificationInputsSha256'];assert sha(rawp)==seal['proofs'][0]['sha256'];assert raw==a['independentSolve'];assert hashlib.sha256(json.dumps(raw,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==a['solveDigest']
# Fresh exact calculation from printed expression, not candidate answer.
principal=abs(F(-3));factor=F(2);squaredNegativeRadical=F(18);den=abs(F(3,4));assert den>0
left=-principal*factor;right=squaredNegativeRadical/den;A=left+right;assert A==18
rootCoefficient=3;radicand=2;assert rootCoefficient**2*radicand==A;rootCoefficients=[-3,3];distanceCoefficient=rootCoefficients[1]-rootCoefficients[0];assert distanceCoefficient==6
sourceA=-abs(F(-2))*3+F(15)/abs(F(5,6));assert sourceA==12
assert c['answer']=='$6\\sqrt2$' and raw['answer']=='6\\sqrt{2}'
rubric=c['metadata']['writtenRubric'];assert rubric['total']==sum(x['point'] for x in rubric['criteria'])==c['score']==4
calc={'firstPrincipalRoot':str(principal),'sqrt2Squared':str(factor),'negativeSqrt18Squared':str(squaredNegativeRadical),'denominator':str(den),'firstTerm':str(left),'secondTerm':str(right),'A':str(A),'rootCoefficientsTimesSqrt2':rootCoefficients,'rootSquares':[k*k*radicand for k in rootCoefficients],'distanceCoefficientTimesSqrt2':distanceCoefficient,'sourceCalculationForCoreComparison':{'A':str(sourceA),'roots':'±2√3','sourceAnswerKeyUsed':False},'domain':'9,2,18,9/16 모두 음이 아닌 피제곱수; 분모3/4>0; A18>0; 부호 반대인 두 근은 서로 다르다.','uniqueness':'양수18의 제곱근은 정의와 제곱근 성질로 ±3√2뿐. 오른쪽양수-왼쪽음수=6√2>0이므로 거리 유일. 중3 제곱근 성질만으로 충분.','unit':'수직선의 추상적인 거리; cm 등 임의 단위 추가 없음.','choices':'서술형이고 실제 choices=[], 선택지5개 검토는 해당 없음.','figure':'figureArtifacts=[]/assets=[]; 도형 측정이나 표 자료 없음.','rubricAudit':{'criteria':rubric['criteria'],'sum':4,'interpretation':'주값/부호/분모1점, A계산1점, 두근1점, 거리1점은 각 학생 단계에 대응. 오류 이월/부분 채점 세칙의 운영 인증은 별도.'},'candidateSolutionStepAudit':['첫째 항의 외부 음수 부호 유지와 주값3 구분: 맞음','괄호 안 음의 근호를 제곱하여18: 맞음','양의 분수 제곱의 제곱근3/4 및0아님: 맞음','18÷3/4=24; A18: 맞음','A>0으로 서로 다른 두 근±3√2: 맞음','오른쪽 수-왼쪽 수=6√2, 순서 무관한 거리 해석: 맞음']}
put('own-q18-current-calculations.json',calc)
# Read actual primary HWP; store short paraphrases/locators, not full document.
l=read(p/'official-locators-reference.json');u=l['downloadUrl'];bb=urllib.request.urlopen(u,timeout=60).read();bh=hashlib.sha256(bb).hexdigest();assert bh==l['actualDownloadedSha256'];o=olefile.OleFileIO(io.BytesIO(bb));d=o.openstream('BodyText/Section0').read();flag=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0];d=zlib.decompress(d,-15) if flag&1 else d;i=0;n=0;selected=[]
codes={'[9수01-03]':'양수·음수, 정수·유리수의 개념','[9수01-04]':'정수·유리수의 대소 관계','[9수01-05]':'정수·유리수의 사칙계산','[9수01-07]':'제곱근의 뜻과 성질','[9수01-09]':'실수의 대소 관계','[9수01-10]':'근호를 포함한 식의 사칙계산'}
while i<len(d):
 h=struct.unpack_from('<I',d,i)[0];i+=4;s=h>>20
 if s==4095:s=struct.unpack_from('<I',d,i)[0];i+=4
 payload=d[i:i+s];i+=s;n+=1
 if h&1023==67:
  t=payload.decode('utf-16le',errors='replace')
  for code,par in codes.items():
   if code in t:selected.append({'record1based':n,'code':code,'ownParaphrase':par})
  if n==3799:assert all(z in t for z in ['수직선','절댓값','역수','양수','음수']);selected.append({'record1based':n,'code':'수와 연산 학습요소','ownParaphrase':'수직선, 절댓값, 역수, 양수/음수와 근호/실수 포함'})
assert len(selected)==7
pdfurl='https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202202101132253081.pdf';ph=hashlib.sha256();pn=0
with urllib.request.urlopen(pdfurl,timeout=60) as response:
 while True:
  chunk=response.read(65536)
  if not chunk:break
  ph.update(chunk);pn+=len(chunk)
primary={'moe2015':{'url':u,'actualSha256':bh,'actualRecordsRead':selected,'method':'공식 URL 직접 다운로드, olefile, 압축 플래그/Section0 raw-deflate와 순차 record/header로 tag67 실제 텍스트를 읽음. 원문 전체 저장 없음.'},'actualM3Placement':{'url':pdfurl,'actualStreamSha256':ph.hexdigest(),'bytes':pn,'zeroBasedPdfPage':38,'printedPage':'38','directRead':'웹 도구의 실제 공식 문서 해당 표를 읽었다. 대상 중학교3학년, 제곱근 뜻/성질9수01-07, 실수 대소9수01-09, 근호 사칙계산9수01-10의 차시별 배치. 실수를 수직선에 나타내고 두 실수의 뺄셈을 이용한 대소 관계를 설명하는 학습을 명시.','interpretation':'2022 발행 길라잡이는 당시2015 교육과정의 중3 배치 자료. 문서 제목2022를2022개정 교육과정 승인으로 해석하지 않음.','itemMapping':'제곱근의 주값/두근, 근호 계산, 실수 수직선의 두 근 위치와 차를 연결하는 q18 학생 요구가 직접 대응. 분수/음수 연산은 MOE3752/3756/3760 및3799의 이전 수 연산을 사용. exact M1 placement 별도 발견을 주장하지 않음; 실제 중3 표가 실수 수직선/뺄셈까지 명시함.'},'signedNumberPrerequisites':{'basis':'9수01-03/04/05 및 학습요소 수직선·절댓값·역수, 실제 중3 표9수01-09의 수직선/두수뺄셈','requirements':'음수의 제곱과 근호 밖 부호를 구별; 양의 분수로 나누기는 역수 곱셈; 왼쪽 음수와 오른쪽 양수의 차로 거리 구하기. 이 내용을 배운 학생에게만 배정. 고등학교 좌표거리공식/복소수/절댓값 방정식 일반해법은 필요 없음.'},'era':{'url':l['era']['url'],'basis':'이미 이 세션에서 실제 읽은 교육부2022-33 부칙: 중1 2025,중2 2026,중3 2027 순차 적용.','2015Scope':'source2025/practice2026 중3','2022M3':'pending separate actual placement review'},'negativeSearchLimit':'인천 기존 공식 PDF의 수직선/정수와 유리수 텍스트검색은0건. 학습 부재를 추론하지 않고 실제 중3 실수 수직선 표 및 MOE 원문 근거를 사용.','rights':'전체 문서 또는 외부 문항/이미지를 증거 파일에 복제하지 않음.'}
put('own-q18-primary-evidence.json',primary)
def sf(reason,basis,evidence):return {'status':'passed','reason':reason,'basis':basis,'evidence':evidence}
surfaces={
 'stem':sf('실수 계산 후 두 제곱근을 수직선 점으로 해석하는 요구는2015중3에서 배운 후 해결 가능.','MOE9수01-07/09/10, 경기 공식PDF38쪽 실제 중3 대상 제곱근·실수 수직선·근호 연산 배치.','현재 content의 식을 own-q18-current-calculations.json에서 A18로 독립 검산. 두근±3√2가 음/양 위치에 놓임. own-q18-primary-evidence.json actualM3Placement가 동일 요구에 대응.'),
 'choices':sf('서술형으로 선택지 학습 요구가 없다.','실제 questionType서술형, choices 빈 배열. 객관식 체크를 임의 생성하지 않음.','현재 입력 candidate.choices=[] 및 source.choices=[] 확인. 검토의 choicesCorrect는 해당 없음에 대한 일관성 통과이며5개 선택지가 있다는 뜻이 아니다.'),
 'figuresAndTables':sf('그림·표 없이 수직선을 말로 해석하며 추가 도형 정리나 측정이 없다.','경기 공식PDF38쪽 중3 실수를 수직선에 나타내고 위치/차로 대소를 해석하는 학습.','현재 figureArtifacts=[], assets=[]; assetDigest는 빈 배열 SHA와 일치. 봉인 raw의 직접 인쇄 확인과 현재 텍스트 대조; 계산에 픽셀이나 좌표 측정 사용 없음.'),
 'notation':sf('근호·괄호 제곱·부호·분수 나눗셈 표기는 해당 중학교 수 연산의 표기이다.','MOE records3752/3756/3760 양수음수/유리수,3776제곱근,3788근호사칙,3799수직선·역수·절댓값.','현재 -√((-3)²)와(-√18)² 및√((3/4)²)를 각각-3,+18,+3/4로 구분. own-q18-current-calculations.json의 정확유리수 계산과 sign audit 참조. 분모 양수이며0이 아님.'),
 'answer':sf('6√2는 두 실수 점 사이의 유일한 양의 거리이며 표기도 중3 근호 연산 결과이다.','MOE9수01-07/09/10; 실수 수직선 위치와 차의 실제 중3 배치.','봉인 raw answer6\\sqrt{2}와 현재 answer$6\\sqrt2$는 수학적으로 동일. 두근계수[-3,3]에√2를 곱하고 차의 계수6을 정확 계산. 두제곱근의 제곱은18,거리>0.'),
 'studentSolution':sf('주값/부호→분수 나눗셈→A→두근→거리의 순서가 중3 학생 방법으로 완결된다.','MOE9수01-03/05/07/09/10 및 경기 실제 중3 표. 복소수·고등학교 거리공식 불필요.','현재 해설의 모든 단계는 own-q18-current-calculations.json candidateSolutionStepAudit와 일치. 3/4≠0,A18>0,서로다른두근을 확인하고 오른쪽-왼쪽=6√2를 설명. 원문 답을 oracle로 쓰지 않았음.'),
 'prerequisites':sf('부호 있는 수·수직선·역수와 분수 나눗셈, 제곱근 뜻/성질 및 근호연산을 배운 뒤 배정하는 조건으로 적합하다.','MOE 실제 records3752/3756/3760/3776/3784/3788/3799; 경기PDF38쪽은 실수 수직선 위치와 뺄셈/근호 연산을 실제 중3에 배치.','own-q18-primary-evidence.json의 실제 원문 추출/배치 관찰 및 signedNumberPrerequisites를 현재 placementConditions 네 조건과 대조. 중학교군 코드만으로 학년을 추정하지 않고 실제 중3 표를 사용. 미확인 M1 세부학기/학교진도는 인증하지 않음.2022중3 별도pending.')}
checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','scoreAppropriate']};checks['unitFamilyFit']=False
metadataMismatch=c['metadata']['answerFormat']=='single-choice';assert metadataMismatch
r={'status':'pending','studentDigest':a['studentDigest'],'candidateDigest':a['candidateDigest'],'assetDigest':a['assetDigest'],'method':'independent-solve-then-review','verifierId':'codex-independent-q18-stage2-r1-20261019','solveDigest':a['solveDigest'],'checks':checks,'curriculumSurfaces':surfaces,'evidence':{'currentMath':'own-q18-current-calculations.json','primary':'own-q18-primary-evidence.json','rawSha256':sha(rawp),'parentSealCommit':seal['rawCommit'],'digestBinding':'입력SHA를 manifest와 대조하고 봉인 raw SHA 및 canonical solveDigest를 검증. candidateDigest는 해시 검증 envelope의 정확한 값으로 바인딩; 미공개 projection의 재계산을 주장하지 않음.','coreComparison':'원문은 -√((-2)²)×(√3)²+(-√15)²÷√((5/6)²)를 계산하여 양수A의 두제곱근을 답한다. 새문항도 주값·음수제곱·분수나눗셈과 두근을 구하는 같은 핵심 절차. 원문의 근 목록에서 새문항의 수직선 두 점 사이 거리로 최종 목표를 바꿔 두근의 위치/차 해석을 추가했다. 수치변경만의 차별성은 아니지만 구조변화는 마지막 해석단계의 확장으로 제한적이다. 원문 정답키는 제공/사용하지 않았다.','naturalKorean':'서로 다른 두 제곱근을 나타내는 두 점이라는 표현은 양수A의 음/양근을 가리키며, 거리 및 서술 요구가 분명. 후보 해설은 음의 외부부호와 괄호제곱을 명시하여 오해를 줄인다.','scoreEditorial':'현재 writtenRubric의1+1+1+1=4를 독립 합산. 주값/부호·분모, A계산, 두근, 거리의 네 단계에 대응하므로4점 제안 편집상 타당. 중복 감점/오류이월 운영 기준의 별도 세칙은 미확정.','difficultyEditorial':'실제 source label하는 보존되어 있다. 현재 기본 제안은 작은 수의 익숙한 근호/분수 계산과 수직선 한 단계만 요구하므로 편집상 타당. 새목표가 한 단계를 추가하므로 원문과 실측 동난도 또는 학습효과 승인은 아니다.','metadataHold':'questionType서술형/choices[]/서술형4점rubric과 달리 metadata.answerFormat이single-choice로 남아 있다. 실제 답은 scalar math이며 신규 교정버전이 필요. 입력은 수정하지 않는다.','unitFamilyHold':'근호 계산Unit99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1와 선수 제곱근Unit1682f01b-5293-4672-91cd-07fc02e305ac는 제안 메타데이터일 뿐. 두근의 수직선거리 서술형 목표까지 맞는 exact live definition 확인 없음. familyKeynull 및 키/개수로 의미 인증하지 않는다.','mathApproved':True,'gradeApproved2015M3':True,'gradeConditions':'제곱근 뜻/성질·근호 사칙·부호와 수직선·분수 나눗셈을 실제로 배운 뒤,2015중3 source2025/practice2026에 한정. 학교중간고사 진도 인증 아님.','2022M3':'pending separate placement','difficultyEqualityApproved':False,'metadataApproved':False,'liveFamilyApproved':False,'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'loadable':False}}
for v in surfaces.values():assert v['basis'] and v['evidence']
assert a['assets']==[] and hashlib.sha256(b'[]').hexdigest()==a['assetDigest'];put('reports/q18.json',r)
assert before=={n:sha(p/n) for n in names};assert sha(rawp)==seal['proofs'][0]['sha256']
put('own-q18-review-hashes.json',{'inputs':before,'rawSha256':sha(rawp),'inputsAndRawUnchanged':True,'reportSha256':sha(p/'reports/q18.json'),'calculationSha256':sha(p/'own-q18-current-calculations.json'),'primaryEvidenceSha256':sha(p/'own-q18-primary-evidence.json'),'counts':{'mathApproved':1,'gradeApproved2015M3':1,'held':1,'checksPassed':11,'checksHeld':1,'surfacesPassed':7},'heldReasons':['exact live family unknown','written versus metadata single-choice mismatch','source/rights/similarity/native/loadable','2022M3 actual placement pending'],'contractLocalCheck':'七個surfaceがstatus/reason/basis/evidenceを持つことのみローカル検証。親のcontract実装を読んだ/実行したとは主張しない。'})
print('report '+sha(p/'reports/q18.json'));print('hash-list '+sha(p/'own-q18-review-hashes.json'))
