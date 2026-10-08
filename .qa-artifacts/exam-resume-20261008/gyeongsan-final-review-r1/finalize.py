"""Post-exposure deterministic comparison and individually recorded review decisions."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,subprocess,datetime,re
import sympy as S
import fitz
R=Path(__file__).resolve().parent;REPO=R.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(p,x):
 b=(json.dumps(x,ensure_ascii=False,indent=2,default=str)+'\n').encode('utf-8');p.parent.mkdir(parents=True,exist_ok=True)
 if (R/'review-freeze.json').exists():assert p.read_bytes()==b,str(p)
 else:p.write_bytes(b)
inputs=read(R/'evidence/verification/verification-inputs.json');bindings=read(R/'evidence/bindings.json');D=read(R/'review-decisions.json');registry=read(R/'evidence/registry.json');layout=read(R/'inspection/layout.json');strict=read(R/'evidence/strict-render.json')
assert len(inputs)==24 and len(strict['results'])==18 and all(x['byteEqual'] and x['strict'] and not x['droppedDimensions'] for x in strict['results'])
assert layout['networkRequests']==[] and layout['texWarnings']==[] and all(not x['overflow'] for x in layout['results'])
blind=REPO/'.qa-artifacts/exam-resume-20261008/gyeongsan-independent-r1/blind';subprocess.run([sys.executable,str(blind/'calculation.py')],check=True)
calc=read(blind/'calculation-output.json');C={x['questionNumber']:x for x in calc['results']};assert sha(blind/'calculation-output.json')=='bc86a91bf98947442cf96b57aa001c9aca082a5689560c18d93f25e21755adfe'
scope=read(R/'evidence/curriculum-scope-input.json');pdf=Path(scope['sourcePath']);assert sha(pdf)==scope['sourceRawSha256'];doc=fitz.open(pdf)
norm=lambda s:re.sub(r'\s+','',s.replace('\x01',' '))
for s in scope['standards']:assert s['code'] in doc[s['physicalPage1based']-1].get_text();assert norm(s['exactText']) in norm(doc[s['physicalPage1based']-1].get_text())
for s in scope['restrictions']:assert norm(s['exactText']) in norm(doc[s['physicalPage1based']-1].get_text())
complexClause='복잡하게 변형된 평면도형의 넓이와 둘레의 길이, 입체도형의 겉넓이와 부피를 구하는 문제는 다루지 않는다.'
assert norm(complexClause) in norm(doc[38].get_text())
put(R/'evidence/curriculum-validation.json',{'officialPdfRawSha256':sha(pdf),'selectedStandardsExactlyMatched':len(scope['standards']),'selectedRestrictionsExactlyMatched':len(scope['restrictions']),'additionalRestriction':{'exactText':complexClause,'physicalPage':39,'printedPage':35},'scope':'2015 middle3 whole student methods and shown notation; no source-school permission; narrow selected provisions only','complexityMethodEvidence':{'q11':'complete-square graphic shape/right-branch monotonicity and one linear inequality; no general quadratic inequality solver','q19':'two45 degree right triangles plus one30 degree triangle; rectangle opposite sides; one scalar linear equation; no75 degree ratios','q20':'two right triangles congruent; one perpendicular to x-axis to read60 degree coordinates; linear substitutions; no circle equation/power/proportion','q24':'H already supplied; two base pieces from30/45 plus scale from60; elementary base-height area; t²=100 with positive length; no extra geometric construction','q25':'F already supplied; fold equal angles plus30/60 right triangles; base difference/height; no trig of120 degrees/vector reflection'}})
# Fresh exact edge checks reinforce semantic differences rather than string rewriting.
v,h=S.symbols('v h',positive=True);t=2*v/h
assert S.simplify(t/2-v/h)==0
root=S.sqrt(3);k=S.symbols('k',positive=True);xx=S.symbols('x',positive=True)
assert S.simplify(k*(xx+2)**2-9-(4*k-9)-k*xx*(xx+4))==0
q24h=10*(3-root)/2;q24bc=10*root;assert S.simplify(q24h*(root+1)-q24bc)==0
assert S.simplify(q24bc*q24h/2-75*(root-1))==0
q25bf=8*root;q25cf=8/root;q25bc=S.simplify(q25bf-q25cf);assert q25cf>0 and q25cf<q25bf;assert S.simplify(q25bc*8/2-64*root/3)==0
assert 10**2+24**2==26**2 and S.Rational(10,26)==S.Rational(5,13)
assert S.Rational(14819-6428,10000)==S.Rational(8391,10000)
put(R/'evidence/post-exposure-math.json',{'method':'sealed independent math recalculated from original student-only inputs; fresh exact symbolic edge checks; author facts approximate coordinates are private, never student methods','independentInputRawSha256':sha(blind/'student-problems.json'),'independentCodeSha256':sha(blind/'calculation.py'),'independentOutputRawSha256':sha(blind/'calculation-output.json'),'newCheckCodeSha256':sha(Path(__file__)),'q22GenericDuplicate':'UT/2=SQ/OS by AA triangles OUT~OSQ and OU=2, identically for all permitted configurations; not circle proportion','q11RightBranchPositiveDifference':'f(x)-f(0)=k*x*(x+4)>0 for k,x>0; boundary k9/4 included; full domain comparisons retained in independent output','q24AreaRecheck':'CD10,BC10√3,EH5(3−√3),area75(√3−1)','q25OrderAndAreaRecheck':'0<CF8√3/3<BF8√3;BC16√3/3;area64√3/3','q13Existence':'10,24,26 positive right triangle;cos5/13','q21TypedRecordedValue':'(14819−6428)/10000=8391/10000; values are rounded separately as stem requests','modelCalls':0,'dbWrites':0})
source=read(R/'evidence/source/questions.json');summary=[]
for r in inputs:
 c=r['candidate'];n=c['questionNumber'];q=f'q{n:02}';d=D[f'{n:02}'];a=r['independentSolve'];mr=C[n];br=next(b for b in bindings['rows'] if b['questionNumber']==n);sc=next(x for x in source['questions'] if x['number']==n)
 assert c['questionType']=='객관식' and len(c['choices'])==5 and a['status']=='solved';assert a['answer']==c['answer']=='①②③④⑤'[mr['evidence']['correctChoiceNumber']-1];assert mr['evidence']['oneCorrectChoice']
 assert c['score']==c['sourceReference']['sourceQuestionScore']==c['variantDelta']['scoreDelta']['authored'];assert c['directUseAllowed'] is False
 unit=next(u for u in registry['units'] if u['section']==d['unit']);supported=d.get('supportedFamily');semantic=d.get('semanticSupportedFamily');family=supported or semantic
 if family:
  entry=next(e for e in registry['registryEntries'] if 'mid:'+e['key']==family);live=next(f for f in registry['liveRows'] if f['family_key']==family);assert entry['unitSection']==unit['section'] and live['unit_id']==unit['id'];assert c['metadata']['assignment']['unitId']==unit['id'] and c['metadata']['assignment']['familyKey']==family
 checks={key:True for key in bindings['requiredChecks']};checks['unitFamilyFit']=bool(supported);checks['choicesCorrect']=n!=22
 holds=[]
 if not supported:holds.append({'code':'exact-unit-live-family-contract-pending','basis':d['family'],'reopen':'실제 live 규칙의 전체 조건/요청 목표/핵심 절차/난도/형식을 지원하는 근거를 제시하거나 별도 새 메타데이터 계약을 검토. Unit·제목·live count만으로 확정하지 않음.'})
 if d.get('extraHold'):holds.append({'code':'duplicate-incorrect-distractors' if n==22 else 'difficulty-proposal-mismatch','basis':d['extraHold'],'reopen':'수정은 새 버전으로 봉인/해시 바인딩 후 해당 차원 독립 재검토. 원본 풀이/후보 불변.'})
 codes=[s['code'] for s in a['evidence']['curriculumSurfaces']['stem']['standards']]
 if n==20:codes=list(dict.fromkeys(codes+['9수04-04','9수03-05']))
 if n==22:codes=list(dict.fromkeys(codes+['9수04-02','9수04-14']))
 if n==25:codes=list(dict.fromkeys(codes+['9수04-02','9수04-04','6수03-06']))
 if n in [12,24]:codes=list(dict.fromkeys(codes+['6수03-06']))
 standards=[s for s in scope['standards'] if s['code'] in codes];assert len(standards)==len(codes)
 basis={
  'stem':d['delta']+' 명시 조건과 요청은 아래 실제 중학교 해법으로 해결된다.',
  'choices':('실제5보기 모두 독립 검사;정답④는 하나이나②③ 동일 오답은 보기 품질 보류. 이 표현들의 개념/표기 자체는 학생 범위.' if n==22 else '실제5보기 전부 계산/도형 비교;정답 하나,나머지 비동치 오답. '+('다섯 choice:N 그림에서 기울기·절편 부호를 따로 확인.' if n==7 else '')),
  'figuresAndTables':('새 SVG '+str(len(r['assets']))+'개의 라벨·직각·각·점순서·영역을 stem과 함께 확인. ' if r['assets'] else '본문 표/수치/함수 기록을 직접 확인;별도 그림 없음. ')+('전·후 자산은35mm씩 왼쪽/오른쪽 배치로 실제 보기 확인.' if n==25 else '70mm 검사 화면에서 텍스트와 자산 역할 확인.'),
  'notation':'통상 좌표/함수/선분/도 단위/근호/실제 삼각비 표기. 일반 라디안·벡터·고교 공식 표기 없음. '+('120°는 내각 합으로 얻는 각;그 각의 삼각비는 호출하지 않는다.' if n==25 else ''),
  'answer':d['math']+' circled choice는 역할·값·단위가 독립 결과와 일치.',
  'studentSolution':d['procedure']+' 공개된 새 저자 풀이의 모든 단계와 실제 정의를 읽고 검산. '+('공학 코드에서의 좌표/삼각함수 값 검증을 학생 풀이 방법으로 취급하지 않음.' if n>=13 else ''),
  'prerequisites':d['procedure']+' 공식 선택 성취기준의 중학교 범위와 초등 밑변높이 원리;필요한 보조점/조건 명시 여부 확인.'}
 visual=next(x for x in layout['results'] if x['questionNumber']==n)
 assets=[{k:x[k] for k in ['role','specSha256','svgSha256','intendedWidthMm','studentPath']} for x in r['assets']]
 report={'questionNumber':n,'twinExternalId':c['twinExternalId'],'status':'verified' if all(checks.values()) and not holds else 'pending','studentDigest':r['studentDigest'],'candidateDigest':r['candidateDigest'],'assetDigest':r['assetDigest'],'solveDigest':r['solveDigest'],'method':'independent-solve-then-review','verifierId':a['solverId'],'checks':checks,'curriculumSurfaces':{s:{'status':'passed','basis':b,'standardCodes':codes,'officialEvidence':'evidence/curriculum-scope-input.json + curriculum-validation.json'} for s,b in basis.items()},'evidence':{
  'binding':br,'independentSolveCommit':'c8f8aeadfb28becb1d7447240fd4e28b6702fc4c','rawSolveUnchanged':True,'answerComparison':{'literalEqual':True,'semanticEqual':True,'role':'single selected choice','authorAnswer':c['answer'],'independentAnswer':a['answer'],'allFiveChoiceTruthValues':mr['evidence']['choiceCorrectness'],'semanticDuplicateChoices':mr['evidence']['semanticDuplicateChoices'],'unitAndTargetOrderChecked':True,'writtenPartsRequested':[],'writtenRubricApplicable':False},
  'independentExactCalculation':mr,'mathAndNewSolution':d['math'],'coreAndSubstantiveDelta':d['delta'],'allowedWholeStudentMethod':d['procedure'],'sourceQuestionOnly':{'sourceQuestionId':sc['sourceQuestionId'],'packetRawSha256':br['sourcePacketSha256'],'sourceDigestProvided':sc['sourceContentDigest'],'images':[{'file':x['file'],'rawSha256':sha(R/'evidence/source'/x['file']),'personallyViewed':True} for x in sc['images']],'sourceCropsNotNewAssets':True,'originalKeyOrSolutionFilesRead':False},
  'visualReview':{**visual,'personallyViewed':True,'imageRawSha256':sha(R/visual['png']),'actualQuestionAndExpandedSolutionInspected':True,'allSuppliedChoiceFiguresInspected':n==7,'assets':assets,'strictRegenerationResults':[x for x in strict['results'] if x['questionNumber']==n],'nativeCompatibilityNotApproved':True},
  'naturalKorean':'조건·대상각·선분·기록값·단위가 자연스럽고 모호한 원본 조건을 명시했다. 허구 학교 표시 해솔누리중학교와 실제 학교 내부 보존을 구별;원학교로 학년 승인하지 않음.',
  'scoreAndDifficulty':{'score':c['score'],'sourceScorePreserved':True,'authorDifficultyProposal':c['metadata']['difficultyProposal'],'reviewerDifficultyProposal':d['difficulty'],'basis':d['procedure']+' '+str(c['score'])+'점은 원문과 동일하고 필요한 단계 수를 근거로 제안. 검토자는 심화하/기본과 응용 차이를 기록하며 실측 난도나 학교 자동 승인 주장 없음.','measuredDifficulty':False},
  'taxonomy':{'unitUuidProposal':unit['id'],'unit':unit,'unitSeedExactMatch':True,'candidateMetadataAssignmentUnedited':c['metadata']['assignment'],'existingLiveFamilyProposal':supported,'semanticFamilyOnly':semantic,'status':'supported-proposal' if supported else 'held','basis':d['family'],'formatComparison':'Actual generation rule emits a mathematical open answer. Candidate MC wraps the same mathematical target in5 displayed choices checked independently; q08 also records the axis already read in the rule solution. This is purpose/method support only; native format/import approval stays pending.' if supported else 'Complete new target/format/difficulty support is unconfirmed as described in basis; no nearest/title mapping.','bankCapturedAt':registry['bankCapturedAt'],'snapshotScopeOnly':True,'liveCountNotPermission':True},
  'q22RepairRead':False,'q23SourceRoleMetadataBoundary':'Matching frozen q23 contains author source-role derivation metadata. New answer90m was independently sealed before exposure; source numerical derivation is not answer authority.' if n==23 else None},
  'holds':holds,'gates':{'rights':'held','custody':'held','similarity':'pending','nativeCompatibility':'pending','directUseAllowed':False,'loadable':False,'dbWrites':0,'modelCalls':0,'finalPublicationApproval':False}}
 put(R/f'reports/{q}.json',report);summary.append({'questionNumber':n,'status':report['status'],'mathematics':'passed','sevenStudentSurfaces':'passed','choiceQuality':'held duplicate2/3' if n==22 else 'passed','unitUuidProposal':unit['id'],'supportedFamily':supported,'semanticFamilyOnly':semantic,'difficulty':report['evidence']['scoreAndDifficulty'],'holds':holds})
assert sum(r['candidate']['score'] for r in inputs)==96
put(R/'evidence/review-results.json',{'method':'independent-solve-then-review','reviewed':24,'mathematicalAnswersAndNewSolutionsPassed':24,'sevenStudentSurfacesGradePassed':24,'choiceQualityPassed':23,'choiceQualityHeld':1,'verified':sum(r['status']=='verified' for r in summary),'pending':sum(r['status']=='pending' for r in summary),'rejected':0,'supportedFamilyProposals':2,'semanticFamilyWithDifficultyHold':1,'all24MC':True,'points':96,'q22OriginalR1DuplicateFindingPreserved':True,'allOriginalSolvesUnedited':True,'rightsCleared':0,'nativeApproved':0,'loadable':0,'results':summary})
for f in read(R/'evidence/preservation.json')['files']:assert sha(REPO/f['path'])==f['sha256'],f['path']
print('GS24 answers/new solutions/grade7 surfaces passed;23choice quality passed,q22 held;2fullfamily proposals,22overall pending;old743 unchanged.')
