import json,hashlib,urllib.request
from pathlib import Path
from fractions import Fraction
from xml.etree import ElementTree as ET
base=Path('.qa-artifacts/exam-resume-20261008');ref=base/'gyeongsin-grade-reference-20261020-r1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def digest(x):return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
loc=read(ref/'actual-visual-grade-locator-r1.json');assert sha(ref/'school-2024-plan.local.pdf')==loc['primaryDocumentSha256'];assert sha(ref/'school-2024-m3-page74.local.png')==loc['actualViewedPng']['sha256']
primary={'normative':{'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','edition':'2015년 tab (lines84-85)','locators':'line540: 9수04-13/14 similarity;9수04-16 Pythagoras;9수04-19 chords/tangents. line558 excludes general circle proportionality; line561 permits tangent-length terminology; lines560/565 student-level justification, not complex formal logic.','interpretation':'실제 삼각형의 합동·닮음과 접선의 성질을 직접 쓰는 풀이만 심사했다. 원의 일반 비례/현곱·접선곱 공식을 이름만 바꾸어 허용하지 않는다.'},'gradePlacement':{'url':loc['url'],'pdfSha256':loc['primaryDocumentSha256'],'pageSha256':loc['actualViewedPng']['sha256'],'pdfIndex0':73,'physicalPage':74,'printedPage':72,'actuallyViewed':'표 머리: 중학교3학년 수학2학기. 9월 원과직선/9수04-19 행에 원의 수직이등분선, 현과접선 성질이 명시되어 있다.','limits':'실제 공식2024 M3배치 근거이며 경신 원본의 시험 진도·출처년도 인증이나2022배치 승인 아님. 과거 잠정 printed73 오류를 그대로 승인하지 않고 실제 printed72를 인용한다.'}}
try:
 with urllib.request.urlopen(primary['normative']['url'],timeout=20) as response:b=response.read()
 primary['normative']['currentHtmlSha256']=hashlib.sha256(b).hexdigest()
except Exception as e:primary['normative']['fetchDiagnostic']=str(e)
for n,folder,rawhash in [(7,'gyeongsin-group6-review-20261020-r2','7f445e88791ae1d4d9d9ac2b3422733073cd20299a4407ed4ecdad0229cab3f4'),(8,'gyeongsin-group7-review-20261020-r1','b5cfd361f72c42a2ce5793e1031e87f9fcfc3d672b92b5c6b5483b5aa5004858')]:
 p=base/folder;v=p/'verification';prefix=f'own-q{n:02}-review-'
 with (v/(prefix+'utf8-probe.txt')).open('x',encoding='utf-8') as f:f.write(f'q{n:02} 검수 UTF-8 확인: 봉인·접선·닮음.\n')
 assert (v/(prefix+'utf8-probe.txt')).read_text(encoding='utf-8')==f'q{n:02} 검수 UTF-8 확인: 봉인·접선·닮음.\n'
 x=read(v/'verification-inputs.json')[0];c=x['candidate'];rawfile=p/f'blind/solve/q{n:02}.json';raw=read(rawfile);m=read(v/'verification-manifest.json');seal=read(v/'sealed-raw-commit.json');assert sha(rawfile)==rawhash==m['originalSolveFileHashes'][0]['sha256']==seal['proofs'][0]['sha256'];assert raw==x['independentSolve']
 assert sha(v/'verification-inputs.json')==m['verificationInputsSha256'];assert digest(raw)==x['solveDigest']
 ab=[{k:a[k] for k in ['role','specSha256','svgSha256','intendedWidthMm']} for a in x['assets']]
 assert digest(ab)==x['assetDigest'];assert digest({'candidate':c,'assetBindings':ab})==x['candidateDigest']
 student=read(p/'blind/student-problems.json')[0];assert digest({k:z for k,z in student.items() if k!='studentDigest'})==x['studentDigest']
 for k in ['content','choices','score','questionType','twinExternalId']:assert student[k]==c[k]
 assert c['answer']==raw['answer']
 assets=[]
 for a in x['assets']:
  spec=Path(a['sourceSpecPath']);svg=Path(a['sourceSvgPath']);assert sha(spec)==a['specSha256'];assert sha(svg)==a['svgSha256']==sha(p/'blind'/a['studentPath']);assets.extend([spec,svg])
 root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
 source=root/c['sourceReference']['componentObservation']['path'];assert sha(source)==c['sourceReference']['componentObservation']['sha256'];sourceobs=read(source)
 if n==7:
  assert Fraction(1,2)/Fraction(3,4)==Fraction(2,3)
  assert Fraction(1,2)-Fraction(1,3)==Fraction(1,6)
  choices=[{'mark':'①②③④⑤'[i],'diameter_cm':d,'implied_TU_squared_cm2':str(Fraction(d*d,48)),'matches':Fraction(d*d,48)==3}for i,d in enumerate([8,10,12,14,16])]
  assert [z['mark']for z in choices if z['matches']]==['③']
  math={'radius_cm':6,'diameter_cm':12,'OT_cm':'3√3','OU_cm':'2√3','TU_cm':'√3','OM_cm':3,'RT_cm':3,'OT_squared_cm2':27,'OU_squared_cm2':12,'AAauthor':'OMU~OTR: O↔O,M↔T,U↔R. Both right at M,T; ∠MOU=∠TOR=30°. Thus OU/OR=OM/OT=1/√3. Distinct from own raw using OTQ; both correspondences valid because OQR equilateral.','noTrigJustification':'OM=r/2 follows equilateral OPQ altitude to base OQ. A 30° right triangle half-hypotenuse property here follows that equilateral construction, without sine/cosine. OT²=3r²/4 by Pythagoras; TU=r√3/6 and TU=√3 give r6 by positive-length division, no calculus/monotonicity theorem required.','allChoices':choices,'existence':raw['evidence']['existenceUniqueness'],'domain':'r>0, OM=r/2>0, OT=r√3/2>0, OU=2OT/3>0, TU=OT/3>0. r−6 forbidden; denominator√3,r,OT nonzero. Units cm/cm².'}
  faces={
   'stem':'원 위 점, 중심 O에서 두 현에 내린 수선, 같은 현과 반지름, 교점과 분할선분을 준다. 실제9수04-19 현의 수직이등분선 성질에 해당하며 공식계획printed72의 중3 원과직선 행에 직접 배치되어 있다.',
   'choices':'지름8,10,12,14,16 cm의 양수 정수 다섯 값이다. TU²를 D²/48로 검산하면4/3,25/12,3,49/12,16/3 중3인③만 된다. 추가 학년 밖 지식은 없다.',
   'figuresAndTables':'학생SVG 및 독립 렌더 PNG에서 P,Q,R 원주점, Q-M-O와 O-U-T의 순서, PR과OQ 및 QR과OT의 두 수직 관계와 이름을 확인했다. TU의√3 숫자는 본문에 완전 명시되어 그림 반복 누락이 조건 손실이 아니다. 길이·각은 픽셀로 계산하지 않았다.',
   'notation':'선분 윗줄·직교·원O·정삼각형·각30°/60°·근호√3·분수비·cm는 중학교 정삼각형/닮음/제곱근 표기다. 삼각함수 값이나 사인법칙 표기는 쓰지 않는다.',
   'answer':'③은 지름12 cm이다. TU=r√3/6에서 r>0인 유일한 r6을 취하고 두 배를 한다. 학생에게 고등 근 판정이나 함수의 증가 정리를 요구하지 않는다.',
   'studentSolution':'실제 저자 해설은 OPQ정삼각형→중심수선의 현 이등분과 OPM/ORM합동→OQR정삼각형→OM=r/2,OT=√3r/2→OMU~OTR의 실제AA→OU=√3r/3→차TU→r6 순서다. M↔T,U↔R와 O의 각30°가 맞고 원과비례 공식을 전제로 하지 않는다.',
   'prerequisites':'2015중3 원과현9수04-19를 학습한 뒤, 삼각형합동·정삼각형높이, AA닮음9수04-14,피타고라스9수04-16,근호·분수 계산을 이미 배운 학생에게 한정한다. 실제M3현/접선 배치는 공식계획printed72. named prerequisite UUID 미포착, 해당학교 진도와2022배치는 미승인이다.'}
  core='원본은 OB=AB=4와 두 수선/교점에서 HJ를 묻는다(이전 실제 H q7 그림·조건 노출 및 현재 component 관찰). 현재는 그 출력에 대응하는 TU=√3를 조건으로 옮겨 반지름의 두 배를 복원한다. 현의 수직이등분, 정삼각형, 두 직각삼각형의 닮음과 길이 차라는 핵심을 보존하며 실제 역목표라 숫자·점이름 교체만이 아니다.'
  metadataissues=[]
  natural='수선의 발T, OQ와PR 교점M, OT와PR 교점U를 각각 정의하고 TU를 주어 지름을 묻는다. 그림과 문장의 점 순서가 같으며 r>0에서 U 내부도 증명된다. 소문자함수·좌표 같은 새 용어가 없다.'
 else:
  RF=Fraction(144,12);assert RF==12;assert(RF+3)**2==144+(RF-3)**2
  choices=[{'mark':'①②③④⑤'[i],'ER_cm':d,'EQ_cm':d-6,'residual_cm2':d*d-(d-6)**2-144,'matches':d*d-(d-6)**2==144}for i,d in enumerate([12,13,14,15,16])]
  assert [z['mark']for z in choices if z['matches']]==['④']
  math={'radius_cm':6,'PI_PH_SG_SH_cm':6,'EI_EF_cm':3,'RF_RG_cm':12,'height_cm':18,'EQ_cm':9,'ER_cm':15,'authorEquation':'x=RF=RG>3; (x+3)²=144+(x−3)² ->12x=144 ->x12. Own raw x denotes height18, so variable meaning differs legitimately.','tangentJustification':'接線' ,'allChoices':choices,'existence':raw['evidence']['existenceUniqueness'],'domain':'RF=x>3 gives EQ=x−3>0; x12. All radius6,EI/EF3,RF/RG12,height18,EQ9,ER15 positive, F internal since EF+FR15. Denominators2,12,ER15 nonzero. cm/cm².'}
  math['tangentJustification']='接点' # overwritten immediately with specific Korean proof below
  math['tangentJustification']='EO공통빗변과 OI=OF인 두 직각삼각형 EIO,EFO의 합동으로 EI=EF. OR공통빗변과 OG=OF인 RGO,RFO 합동으로 RG=RF. OHIP와 OHSG는 세 직각과 같은 반지름을 가진 한 변6의 정사각형이므로 PI=PH=SG=SH=6. 실제 접선·반지름 직각과 합동을 쓰며 접선곱·원과비례는 아니다.'
  faces={
   'stem':'직사각형 세 변에 접하는 원, 접선ER와 발F, PE9 및 폭QR12는9수04-19 원의접선 상황이다. 실제 공식M3계획printed72의 현/접선9수04-19 행과 연결되며 원과비례 관계를 조건으로 요구하지 않는다.',
   'choices':'접선 전체길이12,13,14,15,16 cm는 중복 없는 양수 정수다. 관계에서 EQ=ER−6이며 피타고라스 잔차−36,−24,−12,0,12 중④만0이다. 보기 표기나 선택에 추가 선수가 없다.',
   'figuresAndTables':'학생SVG와 자체 렌더 PNG에서 P-Q-R-S 직사각형, 위H/왼I/오른G 접점, PQ위E, ER위F, OF수직과 PE9/QR12를 확인했다. E는I아래, F는ER내부이며 실제 독립 구성 검산도 이를 만족한다. 그림좌표·픽셀은 수치 근거가 아니다.',
   'notation':'원O, 접점H/I/G/F, 선분윗줄, 직각, cm, 미지수x,제곱과 전개는 중학교 도형·식의 표기다. 원의 방정식·외접반지름·현곱/접선곱 또는 고등 삼각함수를 도입하지 않는다.',
   'answer':'④은 ER15 cm로 EF3+FR12다. 양수 접선 길이와 EQ9를 확인하고 피타고라스9²+12²=15² 검산을 통과한다. 일차식 해12를 접선 부분길이로 해석하여 전체길이15를 내는 역할이 명확하다.',
   'studentSolution':'실제 저자 해설은 폭12→반지름6→PI/PH/SG/SH6→EI=EF3→x=RF=RG와 EQ=x−3,ER=x+3→직각EQR의피타고라스→12x144→ER15다. 접선길이같음9수04-19와피타고라스9수04-16,직사각형 및 전개/일차방정식만 필요하다. 원과비례나 고등 원의방정식이 아니다.',
   'prerequisites':'2015중3 접선의성질9수04-19 후, 접점반지름수직·같은점접선길이,직사각형,피타고라스9수04-16,다항식곱셈전개와 이전일차방정식을 배운 학생에게 배정한다. 공식2024중3계획printed72에서 접선 배치를 확인했다. 정확한 선수UUID·경신시험진도·2022배치는 미인증이다.'}
  core='원본 q8은 직사각형의 세변 접촉과 CE10/반지름OF4를 주고 AE를 묻는다(이전 실제H q8 노출 및 현재component 관찰). 현재는 부분변PE9와 폭QR12(지름으로 반지름을 추론)를 주고 전체접선ER를 복원한다. 같은점의 접선길이,변의합·차,피타고라스로 일차식을 만드는 핵심은 같고 입력/출력의 실제 교환이 있다. 원문 정답/키는 계산하거나 대조하지 않았다.'
  metadataissues=[{'field':'sourceReference.actualReference','observed':c['sourceReference']['actualReference'],'issue':'q08인데 OriginalH page2 q7 viewed라고 적혀 있다. 같은 객체 originalQuestionRender.printedQuestion8 및 component관찰q8과 충돌한다. source identity hold; 수정은별도버전 필요.'},{'field':'variantDelta.actualStructuralChange','observed':c['variantDelta']['actualStructuralChange'],'issue':'원문의 접선 길이 출력/부분선분 입력이라고 쓴 부분은 실제 원문과 반대다. 원문은 접선전체길이입력/부분선분출력이다. before/after 및 실제현재문항은 역목표로 타당하지만 이 메타설명은 수정 필요.'}]
  natural='본문은 세변과 접점의 순서를 각각정의하고 PQ위E와 ER의접점을 명시한다. 원이 내부에있고 변에접한다는 표현은 내접원의 통상용례이며 조건모순이 없다. 폭12와 PE9는 그림과일치한다.'
 checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','scoreAppropriate']};checks['unitFamilyFit']=False
 unit=c['metadata']['assignment']['currentUnit']
 basis={'answerCorrect':f'현재 저자답{c["answer"]}와 봉인raw가 일치하고 이번별도정확계산/모든보기검산으로 다시 확인했다.','solutionCorrect':math,'existenceUniqueness':math['existence']+' '+math['domain'],'choicesCorrect':choices,'figureConsistent':faces['figuresAndTables']+' 학생SVG·현재private spec/SVG 해시 일치; private좌표를 수학oracle로 사용하지 않았다. native reader parity는별도보류.','sameCoreConceptAndProcedure':core,'distinctPresentation':core,'naturalKorean':natural,'curriculumAppropriate':primary,'allStudentSurfacesInScope':'curriculumSurfaces에 실제7면별 개별근거를 기록. 전제는2015M3 선수학습완료 후이며2022아님.','unitFamilyFit':{'capturedUnit':unit,'assessment':'단원명의개념은 실제현/접선목표와 연결되지만 exactlivefamily의 정의·도메인·출력목표는 검증하지 않았다. familyKey null 유지. snapshot은현재DB약속아님. 선수UUID도미포착.'},'scoreAppropriate':'원본component에서5점, 현재5점. 원과현/접선→보조삼각형 또는 접선부분길이→닮음/피타고라스→역으로전체길이를구하는 복합절차가5점제안을지지한다. 표준은편집상제안으로 타당하지만 측정난도·원문난도라벨(unknown)동등성이나 실측수행자료를승인하지 않는다.'}
 report={'status':'pending','studentDigest':x['studentDigest'],'candidateDigest':x['candidateDigest'],'assetDigest':x['assetDigest'],'method':'independent-solve-then-review','verifierId':f'independent-retained-helper-gyeongsin-q{n:02}-review','solveDigest':x['solveDigest'],'checks':checks,'curriculumSurfaces':{k:{'status':'passed','basis':b}for k,b in faces.items()},'evidence':{'checkBasis':basis,'ownExactCalculations':math,'primaryReferences':primary,'rawSeal':{'parentCommit':seal['rawCommit'],'rawSha256':rawhash,'rawUnchanged':True,'preAuthorExposureDeclarationPreserved':raw['evidence']['exposureDeclaration'],'authorExposure':'Current author answer/solution first read only after raw Git seal. Original-page prior exposure separately disclosed; no clean original-unexposed claim.'},'sourceComponentObservation':sourceobs,'metadataCorrectionHolds':metadataissues,'diagnostic':'Attempted local review-root source-qNN-only.json reads failed because those files were absent. No inputs changed. Used exact authorized parent componentObservation path with declared SHA and prior actually viewed original q7/q8 components, not source answer keys.','holds':{'sourceIdentityApproved':False,'sourcePairApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'liveFamilyKey':None,'unitFamilyFit':False,'loadable':False,'curriculum2022':'pending','difficultyLabelFromSource':'unknown'},'counts':{'mathematicsPass':1,'gradePass':1,'contentHeld':1,'newBlindOrManualCountIncrement':0,'releaseApprovals':0},'limits':'範囲' }}
 report['evidence']['limits']='2015M3 선수학습후만. 해당학교 시험진도·출처전체쌍/년도·권리·포괄유사도·현재DB livefamily·native/reader·2022배치는인증하지 않는다. actualsource문항 대응과 수학/학년통과는 이보류를해제하지않는다.'
 paths=[v/'VERIFY-BRIEF.md',v/'verification-inputs.json',v/'verification-manifest.json',v/'sealed-raw-commit.json',rawfile,p/'blind/student-problems.json',p/f'blind/figures/q{n:02}-1.svg',source,*assets,ref/'school-2024-plan.local.pdf',ref/'school-2024-m3-page74.local.png']
 before={str(f):sha(f)for f in paths};assert len(checks)==12 and len(faces)==7 and all(report['curriculumSurfaces'][z]['basis']for z in faces)
 for target,obj in [(v/(prefix+'calculations.json'),{'calculations':math,'primary':primary,'inputSha256Before':before,'inputSha256After':{str(f):sha(f)for f in paths},'digestValidation':{'student':x['studentDigest'],'candidate':x['candidateDigest'],'asset':x['assetDigest'],'solve':x['solveDigest'],'allIndependentlyRecomputed':True},'metadataIssues':metadataissues}),(v/f'reports/q{n:02}.json',report)]:
  target.parent.mkdir(exist_ok=True)
  with target.open('x',encoding='utf-8')as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
 assert all(sha(Path(f))==h for f,h in before.items())
 print(json.dumps({'q':n,'reportSha256':sha(v/f'reports/q{n:02}.json'),'calculationSha256':sha(v/(prefix+'calculations.json')),'checksTrue':sum(checks.values()),'gradeFacesPassed':7,'metadataIssues':len(metadataissues)},ensure_ascii=False))
