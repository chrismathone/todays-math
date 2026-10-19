import json,hashlib,urllib.request
from pathlib import Path
from fractions import Fraction
from xml.etree import ElementTree as ET
p=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group5-review-20261020-r2');v=p/'verification'
def read(q):return json.loads(q.read_text(encoding='utf-8-sig'))
def sha(q):return hashlib.sha256(q.read_bytes()).hexdigest()
def canon(o):return hashlib.sha256(json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
probe=v/'own-q05-review-utf8-probe.txt'
if not probe.exists():
 with probe.open('x',encoding='utf-8') as f:f.write('검수 UTF-8 확인: 원주각·AA닮음·양의 길이.\n')
assert probe.read_text(encoding='utf-8')=='검수 UTF-8 확인: 원주각·AA닮음·양의 길이.\n'
x=read(v/'verification-inputs.json')[0]; c=x['candidate']; m=read(v/'verification-manifest.json');seal=read(v/'sealed-raw-commit.json');raw=read(p/'blind/solve/q05.json');s=read(p/'source-q05-only.json')
assert sha(v/'verification-inputs.json')==m['verificationInputsSha256']
assert sha(p/'blind/solve/q05.json')==m['originalSolveFileHashes'][0]['sha256']==seal['proofs'][0]['sha256']=='95166e93887c2655dfedf57f81eee3082a809356de238afeb96d7e2941b7abb1'
assert raw==x['independentSolve']
assert canon(raw)==x['solveDigest'] # Candidate/asset manifest digests use an unspecified projection; bind supplied values to verified input SHA, not guessed full-object canonicalization.
student=read(p/'blind/student-problems.json')[0]
assert canon({k:a for k,a in student.items() if k!='studentDigest'})==x['studentDigest']
for k in ['content','choices','questionType','score','twinExternalId']:assert student[k]==c[k]
assert c['answer']==raw['answer']=='③'
svg=p/'blind/figures/q05-1.svg';assert sha(svg)==x['assets'][0]['svgSha256']
labels=[e.attrib['data-label'] for e in ET.fromstring(svg.read_bytes()).iter() if 'data-label' in e.attrib]
assert set(['P','Q','R','D','H','O','24','15'])<=set(labels)
PD=30;PQ=10;PR=24;PH=Fraction(PQ,PD)*PR;QH2=PQ**2-PH**2;DR2=PD**2-PR**2
assert PH==8 and QH2==36 and DR2==324 and Fraction(6,18)==Fraction(8,24)==Fraction(10,30)
choices=[{'mark':'①②③④⑤'[i],'QH_cm':q,'PQ_squared':q*q+PH**2,'matches':q*q+PH**2==PQ**2} for i,q in enumerate([4,5,6,8,10])]
for e in choices:e['PQ_squared']=str(e['PQ_squared'])
assert [a['mark'] for a in choices if a['matches']]==['③']
ref=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-grade-reference-20261020-r1')
loc=read(ref/'actual-visual-grade-locator-r1.json')
assert sha(ref/'school-2024-plan.local.pdf')==loc['primaryDocumentSha256']
assert sha(ref/'school-2024-m3-page74.local.png')==loc['actualViewedPng']['sha256']
primary={'normative':{'url':'https://askmath.kosac.re.kr/mathEduProcess/index.do','observedEdition':'2015년 (page lines84-85)','locators':'lines540: 9수04-13/14 similarity, 9수04-16 Pythagoras, 9수04-20 inscribed angles; line558 circle proportionality excluded; lines560,565 student-level explanation permitted without complex formal logic','interpretation':'실제 원주각의 각 대응으로 AA닮음을 직접 증명한 뒤 대응변 비를 쓰는 이 풀이를 검토했다. 원과 비례 일반공식, 현곱/할선곱, 사인법칙, 외접반지름 공식을 학생에게 요구하지 않는다.'},'actualGradePlacement':{'url':loc['url'],'pdfSha256':loc['primaryDocumentSha256'],'viewedPageSha256':loc['actualViewedPng']['sha256'],'pdfIndex0':73,'physicalPage':74,'printedPage':72,'observed':'실제 페이지 상단 중3 수학 2학기, 10월 원주각 9수04-20. 최초 내려받기 기록의 잠정 printed73은 실제 printed72와 다르며 그 오류를 고쳐 쓰거나 숨기지 않는다.','limits':'공식 2024 학교계획의 실제 M3 배치 증거이지 경신 원본 중간고사 진도·년도·2022 배치 인증은 아니다. 닮음과 피타고라스를 이미 학습한 학생에게만 적용한다.'}}
try:
 with urllib.request.urlopen(primary['normative']['url'],timeout=20) as r: html=r.read()
 primary['normative']['retrievedHtmlSha256']=hashlib.sha256(html).hexdigest()
 primary['normative']['retrievedHtmlBytes']=len(html)
except Exception as e:primary['normative']['htmlHashFetchDiagnostic']=str(e)
math={'PD_cm':30,'PH_cm':str(PH),'QH_squared_cm2':str(QH2),'DR_squared_cm2':DR2,'QH_cm':6,'HR_squared_cm2':512,'allChoices':choices,'AA':{'rightAngles':'∠PHQ=∠PRD=90°: PH⊥QR and PD diameter.','equalAngles':'H内部 gives ∠PQH=∠PQR; Q and D on same arc PR in actual diagram, hence ∠PQR=∠PDR. H内部 also makes angle Q acute; D angle is acute in right triangle PDR, ruling out the supplementary opposite-segment alternative.','correspondence':{'P':'P','Q':'D','H':'R'},'sides':'PQ↔PD,PH↔PR,QH↔DR','ratio':'10/30=8/24=6/18=1/3'},'existence':raw['evidence']['existenceAndUniqueness'],'uniqueness':'PD,PQ,PR force PH=8 by AA; positive QH=√36=6 only. Mirrored figures do not invalidate uniqueness of requested length. HR=16√2>0; PH,PQ,PR,PD,DR,QH all positive; denominators30,24,18 nonzero.','negativeControls':{'wrongSimilarityPairing':'10/24 != 8/30 (5/12 !=4/15); swapping hypotenuse/corresponding leg fails.','negativeSquareRoot':'-6 rejected because a segment length is positive.','zeroDenominator':'PD=30,PR=24,DR=18; no zero divisor.'}}
assert Fraction(10,24)!=Fraction(8,30)
faces={
 'stem':{'status':'passed','basis':'원 반지름·지름·원 위 점·현의 수선의 발과 내부 조건은 기본 도형 및 9수04-20의 원주각 상황이다. 실제 M3배치는 primary.actualGradePlacement의 printed72. PH⊥QR와 PQ10,PR24는 본문에 명시됐다.'},
 'choices':{'status':'passed','basis':'4,5,6,8,10 cm는 양의 정수 길이 다섯 개로 중복이 없다. PH8인 직각삼각형의 피타고라스 검산에서 80,89,100,128,164 중100 하나만 성립한다. 새 기법이 없는 수와 단위 표현이다.'},
 'figuresAndTables':{'status':'passed','basis':'학생 PNG에서 P,Q,R,D가 원 위, P-O-D 지름, Q-H-R 순서, PH의 직각 표시, PR24와 반지름15를 확인했다. PQ10은 본문에 완전히 남아 있으며 중복 그림 치수 부재는 조건 손실이 아니다. 원주각 보조선 RD는 해설에서 그린다. 표·좌표·픽셀 측정은 학생 자료나 풀이의 필수 전제가 아니다.'},
 'notation':{'status':'passed','basis':'선분의 윗줄, 원O, 각기호, 수직기호, 삼각형, 대응변의 분수비, cm 및 제곱 표시는 원주각·닮음·피타고라스의 통상 중학교 표기이다. 고등 삼각함수·외접반지름 기호를 도입하지 않는다.'},
 'answer':{'status':'passed','basis':'정답③은 QH=6 cm라는 유일한 양의 길이를 가리킨다. PH8을 구한 뒤 10²−8²=36의 양의 제곱근만 취하므로 고등 근의 분기 처리가 필요 없다.'},
 'studentSolution':{'status':'passed','basis':'실제 저자 해설은 RD 보조선→PD지름으로 ∠PRD90°→PH수직으로 ∠PHQ90°→같은 호 PR의 ∠PQR=∠PDR→△PQH~△PDR→PH/PR=PQ/PD=1/3→PH8→피타고라스로QH6 순서이다. P↔P,Q↔D,H↔R가 정확하다. 9수04-14/16/20을 실제 적용하며 2015 지침이 제외한 원과 비례 정리로 결과만 선언하지 않는다.'},
 'prerequisites':{'status':'passed','basis':'조건부 배정: 2015 중3 원주각(지름의90°,같은호 각), 이전에 배운 삼각형AA닮음·대응변 비 및 피타고라스, 양의 제곱근·단위를 모두 학습한 뒤이다. 규범 기준은9수04-13/14/16/20이고 실제 중3 원주각 배치는 공식2024계획 printed72로 확인했다. 해당 학교 시험 진도나 2022 시행학년 배치는 인증하지 않는다. 닮음/피타고라스 Unit UUID는 미포착 상태로 유지한다.'}}
checks={k:True for k in ['answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure','distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','scoreAppropriate']};checks['unitFamilyFit']=False
basis={
 'answerCorrect':'봉인 raw의③/6cm와 현재 저자 답③가 같고 별도 Fraction 재계산도6을 강제한다.',
 'solutionCorrect':math['AA'],
 'existenceUniqueness':math['uniqueness']+' '+math['existence'],
 'choicesCorrect':choices,
 'figureConsistent':'학생 SVG hash가 현 자산 svgSha256과 일치. 현재 학생PNG와 실제 SVG라벨을 확인: 원/현/지름/수선/이름/24/15 일치. PQ10은 본문에 남아 있다. r1의 짧은PQ 치수 실패를 검토하거나 수정한 것으로 주장하지 않으며 현재r2만 판정한다. private spec bytes나 author coordinates를 열거나 계산 근거로 쓰지 않았다.',
 'sameCoreConceptAndProcedure':'원본 q05 완료본 및 H의 q05에는 AD지름, AB8,AC12,BH2와 반지름 질문이 있다. 보조선 CD, 지름의 직각, 같은 호 AC의 각과 AA닮음, 피타고라스로 연결할 수 있다. 현재도 같은 원주각+AA+피타고라스 연결을 보존한다. 원본 답/키를 비교 기준으로 삼지 않았다.',
 'distinctPresentation':'원본은 짧은 분할선분BH를 주고 반지름을 구한다. 현재는 반지름15를 주고 분할선분QH를 복원한다. 원본의 높이 선계산→지름 복원 순서가 현재 지름→닮음으로높이→분할선분 순서로 바뀌는 실제 역목표다. 숫자/점이름만 바꾼 것으로 판단하지 않는다.',
 'naturalKorean':'수선의 발 H와 내부 조건을 직접 명시하여 발의 가지를 제한한다. 반지름과 두 현의 길이로 QH를 묻는 문장/단위가 일관되며 그림에 PQ10이 반복되지 않아도 본문 조건은 완전하다.',
 'curriculumAppropriate':primary,
 'allStudentSurfacesInScope':'일곱 면별 판정과 basis는 curriculumSurfaces에 각각 기록; 모두2015M3 선수학습 후 한정.',
 'unitFamilyFit':'captured Unit b6d4dc2e-0db8-44fe-a763-7214284d9bea 원주각의활용은 의미상 주단원으로 타당하나 실제 현행 live family 정의/목표/도메인을 이번 범위에서 확인하지 않았다. familyKey null 유지. snapshot은 현재DB 약속이 아니다.',
 'scoreAppropriate':'원본 이미지5점, 현재5점. 보조선RD 선택·두각대응·닮음비·피타고라스의 복합 연결이5점 제안을 지지한다. 계산은 정수로 단순해졌으나 역목표로 필요한 관계 선택은 남아 있다. 표준은 편집상 타당 제안이며 실측 난도/원본 난도라벨 일치나 통계적 동등성을 승인하지 않는다.'}
report={'status':'pending','studentDigest':x['studentDigest'],'candidateDigest':x['candidateDigest'],'assetDigest':x['assetDigest'],'method':'independent-solve-then-review','verifierId':'independent-retained-helper-gyeongsin-q05-r2-review','solveDigest':x['solveDigest'],'checks':checks,'curriculumSurfaces':faces,'evidence':{'checkBasis':basis,'independentCalculations':math,'primaryReferences':primary,'rawBinding':{'helperCommit':'2f147ab15820ec28f88c8bf747fa75ab013c7626','parentSealCommit':seal['rawCommit'],'rawSha256':sha(p/'blind/solve/q05.json'),'rawUnchanged':True,'exposureDeclaration':raw['evidence']['exposureDeclaration'],'currentAuthorExposure':'Only after raw seal, during this authorized verification. Prior-original incidental exposure is preserved; no completely original-unexposed claim.'},'sourceComparison':'Only supplied q05 JSON and q05 components in completed/originalH images used. Full originalH view incidentally includes adjacent original items already exposed in prior q06 review; no answers computed or borrowed for those items. Original footer restricts reproduction; no rights approval follows from component correspondence.','assetBinding':{'studentSvgSha256':sha(svg),'labels':labels,'specSha256DeclaredOnly':x['assets'][0]['specSha256'],'privateSpecBytesRead':False,'pixelOrCoordinateNumericOracle':False,'visualStudentPngViewed':True},'holds':{'sourceIdentityApproved':False,'sourcePairApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeReaderParity':False,'unitFamilyFit':False,'liveFamilyKey':None,'loadable':False,'curriculum2022':'pending','sourceDifficultyLabel':'unknown'},'counts':{'mathematicsPass':1,'gradePass':1,'contentHeld':1,'newManualOrBlindCountIncrement':0,'releaseApprovals':0},'limitations':'2015M3 after prerequisites only; actual source school pacing, whole-pair/year custody, live DB family, native renderer and 2022 placement unverified. Current source component correspondence is not identity/rights certification. Candidate/asset digest projection was not provided; exact manifest values are bound to verified verification-input bytes; naive full-object hashing differs and is preserved in own-q05-review-digest-diagnostic.json, not represented as independently reproduced manifest projection.'}}
inputs=[v/'VERIFY-BRIEF.md',v/'verification-inputs.json',v/'verification-manifest.json',v/'sealed-raw-commit.json',p/'source-q05-only.json',p/'source-completed-q05.local.png',p/'source-original-H-page2.local.webp',p/'student-preview/q05.png',svg,p/'blind/solve/q05.json',ref/'school-2024-plan.local.pdf',ref/'school-2024-m3-page74.local.png',ref/'actual-visual-grade-locator-r1.json',ref/'download-and-locator-r1.json']
hashes={str(t):sha(t) for t in inputs}
for target,obj in [(v/'own-q05-review-calculations.json',{'math':math,'primary':primary,'inputSha256':hashes,'digestChecks':{'student':x['studentDigest'],'candidateManifestValue':x['candidateDigest'],'assetManifestValue':x['assetDigest'],'fullCandidateCanonicalDiagnostic':canon(c),'fullAssetsCanonicalDiagnostic':canon(x['assets']),'solve':canon(raw)},'rawExposedOnlyAfterSeal':True}),(v/'reports/q05.json',report)]:
 with target.open('x',encoding='utf-8',newline='\n') as f:json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
assert all(sha(Path(t))==h for t,h in hashes.items())
assert len(report['checks'])==12 and len(faces)==7 and all(z.get('basis') for z in faces.values())
print(json.dumps({'reportSha256':sha(v/'reports/q05.json'),'calculationSha256':sha(v/'own-q05-review-calculations.json'),'rawSha256Unchanged':sha(p/'blind/solve/q05.json'),'checksTrue':sum(checks.values()),'checksFalse':[k for k,z in checks.items() if not z],'gradeSurfacesPassed':sum(z['status']=='passed' for z in faces.values())},ensure_ascii=False))

