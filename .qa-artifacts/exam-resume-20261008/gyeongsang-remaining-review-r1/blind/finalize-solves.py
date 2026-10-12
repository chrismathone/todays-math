import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,re,datetime
import fitz
import sympy as S
R=Path(__file__).resolve().parent;REPO=R.parents[3]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(p,x):
 b=(json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8');p.parent.mkdir(parents=True,exist_ok=True)
 if (R/'solve-freeze.json').exists():assert p.read_bytes()==b,str(p)
 else:p.write_bytes(b)
questions=read(R/'student-problems.json');calculations=read(R/'calculation-output.json');solutions=read(R/'student-solutions.json');scope=read(R/'curriculum-scope-input.json');manifest=read(R/'blind-manifest.json');layout=read(R/'inspection/layout.json')
assert sha(R/'student-problems.json')==manifest['studentProblemsSha256'];assert len(questions)==15 and len(manifest['figures'])==12
assert layout['networkRequests']==[] and layout['texWarnings']==[] and all(not x['overflow'] for x in layout['results'])
pdf=Path(scope['sourcePath']);assert sha(pdf)==scope['sourceRawSha256'];doc=fitz.open(pdf);norm=lambda s:re.sub(r'\s+','',s.replace('\x01',' '))
codes={1:['9수04-17','9수04-18'],2:['9수03-01','9수04-17','9수04-18'],3:['9수04-16','9수04-17','9수01-07','9수01-10'],4:['9수04-17','9수04-18'],5:['9수04-17'],6:['9수04-17'],7:['9수04-17','9수04-18','9수01-10'],8:['9수04-17','9수02-05','9수01-10'],9:['9수04-05','9수04-17','9수01-10'],16:['9수04-17','9수04-18','6수03-06'],17:['9수04-17','9수04-18'],18:['9수04-05','9수04-17','9수04-18','6수03-06','9수01-07','9수01-10'],19:['9수04-17','9수04-16','9수01-07','9수02-13','6수03-06'],20:['9수04-04','9수04-05','9수04-10','9수04-16','9수04-17','9수01-10'],21:['9수04-17','9수04-18','9수04-16','9수01-10']}
used={c for cs in codes.values() for c in cs};standards=[s for s in scope['standards'] if s['code'] in used];assert {s['code'] for s in standards}==used
for s in standards:assert s['code'] in doc[s['physicalPage1based']-1].get_text() and norm(s['exactText']) in norm(doc[s['physicalPage1based']-1].get_text())
clause='복잡하게 변형된 평면도형의 넓이와 둘레의 길이, 입체도형의 겉넓이와 부피를 구하는 문제는 다루지 않는다.';assert norm(clause) in norm(doc[38].get_text())
put(R/'curriculum-validation.json',{'officialPdfRawSha256':sha(pdf),'selectedStandardsExactlyReadAndMatched':standards,'restrictions':scope['restrictions'],'materialComplexityClause':{'exactText':clause,'physicalPage':39,'printedPage':35},'wholeStudentMethodAssessment':'14 in-scope independently proposed; q18 material complexity pending. Correct math is not final grade permission.','notSourceExamEvidence':True,'noUnrelatedWholePolicyAudit':True,'noUpperGradeStudentMethods':True,'modelCalls':0})
observations={1:'P는 왼쪽,R은 오른쪽 아래,Q는 오른쪽 위. R 직각과 QR의 맞은편 변 역할이 명확하다.',2:'R은 원점,P는 양의 x축,Q는 양의 y축. 두 축과 R 직각이 a,b 양수 조건과 일치한다.',3:'PQ는 빗변,PR은 각P의 이웃 직각변,QR은 맞은편 직각변. R 직각과 두 기록을 확인했다.',4:'O는 중심,P는 호 위,O-P-D는 일직선,H는 수선의 발. A 직각,40°와 세 길이 표가 명확하다.',7:'R 직각과 P45°. 아래쪽 PQ가 빗변이다.',9:'R 직각,Q는 위,P는 왼쪽. 각Q가 P의2배라는 조건은 본문에 명시되어 있다.',16:'H는 밑변 내부,P-H 수선과 Q60°. 밑변 QR과 높이 PH를 구별했다.',17:'P15° 경사판,Q는 위,H 직각. 수평 PH는 빗변 PQ와 구별된다.',18:'B-F-H-C 순서,B/C 직각,A60°/F45°,E는 두 사선 내부,회색 ABFE 영역을 확인했다. 전체 자료 복잡성 hold는 유지한다.',19:'R 직각,Q는 수직 QR의 위쪽. cosQ의 이웃변 QR이 명확하다.',20:'H는 QR의 중점,PH는 점선. 수직은 측정으로 판단하지 않고 요청대로 증명한다. α는 본문의 ∠QPH 정의로 읽는다.',21:'O-H-Q 순서,H 직각,O60°. PH 점선과 OH/HQ 두 분할 길이를 확인했다.'}
# Figure observations are measurements of supplied visual topology, never source-data extraction.
prereq={1:'sin 정의와 분수 곱셈',2:'좌표·두 축의 수직과 cos 정의',3:'실제 직각삼각형의 피타고라스·양의 제곱근·tan 정의',4:'두 실제 직각삼각형의 변 비·주어진 근사 기록·소수 나눗셈과 반올림',5:'주어진 표의 열 읽기와 소수 덧셈/뺄셈',6:'유한 표의 열 찾기와 정수 차;역삼각함수 없음',7:'실제45°각의 sin/cos 값 각각 대입과 근호 사칙',8:'네 특수각 값 각각 대입과 근호/일차방정식',9:'삼각형 내각의 합과 비,60°의 구체적인 값 대입',16:'주어진 수선의 발과 실제60°삼각형,높이와 초등 밑변높이 넓이',17:'실제 tan 정의와 주어진 근삿값;15° 반각 항등식을 유도하지 않음',18:'각 단계는 특수각/주어진 수선/넓이 차/양의 근이나 겹친 도형 전체의 자료 복잡성은 미확정',19:'cos 정의→실제 변의 피타고라스→초등 넓이→양의 근;일반 sin²+cos² 항등식 없음',20:'SSS 합동·이웃한 두 각 합180°·정삼각형60°·피타고라스·실제 변의 비',21:'주어진 수선의 발·실제60°길이·다른 직각삼각형의 피타고라스·점 순서;코사인 법칙 없음'}
rows=[]
for q in questions:
 n=q['questionNumber'];id=f'q{n:02}';calc=next(c for c in calculations['results'] if c['questionNumber']==n);sol=solutions[f'{n:02}'];assert calc['solverStatus']==('pending' if n==18 else 'solved')
 if q['choices']:
  expected='①②③④⑤'[calc['evidence']['correctChoiceNumber']-1];assert sol['answer'].startswith(expected)
 else:
  assert n in [19,20,21] and '[2점]' in q['content'];assert len(sol['answerParts'])=={19:5,20:6,21:4}[n]
  numericParts=sol['answerParts'][1:] if n==20 else sol['answerParts'];targets=S.sympify(calc['target']);assert len(numericParts)==len(targets)
  for part,value,unit in zip(numericParts,targets,calc['evidence']['orderedTargetUnits']):assert S.simplify(S.sympify(part['value'])-value)==0 and part['unit']==unit
  if n==20:assert sol['answerParts'][0]['role']=='part1.perpendicularProof' and sol['answerParts'][0]['unit'] is None
 official=[s for s in standards if s['code'] in codes[n]]
 statusFor=lambda surface:'pending-material-complexity' if n==18 and surface in ['stem','figuresAndTables','studentSolution','prerequisites'] else 'in-scope-independent-proposal'
 preview=next(p for p in layout['results'] if p['questionNumber']==n);assert sha(R/preview['png'])==preview['pngSha256']
 surfaces={
  'stem':{'status':statusFor('stem'),'basis':'실제 학생 입력의 전체 요청을 본 독립 해법으로2015 조항에 대응한다. 원학교·저자·분류로 승인하지 않는다. '+prereq[n],'standards':official},
  'choices':{'status':statusFor('choices'),'basis':'실제5보기를 전부 독립 계산/동치/참거짓 검사;정답 하나이고 동치 중복 없음.' if q['choices'] else '보기 없음. 세 번호 부분의 순서·증명·변의 비를 모두 포함했다.','independentChoiceEvidence':calc['evidence'].get('choiceCorrectness'),'duplicates':calc['evidence'].get('semanticDuplicateChoices')},
  'figuresAndTables':{'status':statusFor('figuresAndTables'),'basis':observations.get(n,'실제 문자 표 전체를 행·열·단위에 맞춰 읽었다. 별도 그림 없음.'),'actualStudentPreview':preview,'personallyViewed':True,'suppliedFigureHashes':[f['sha256'] for f in q['figures']]},
  'notation':{'status':'in-scope-independent-proposal','basis':'통상 선분·각·도·좌표·근호·비·삼각비·빈칸 기록. 벡터·라디안·고교 항등식/삼각형의 법칙 표기 없음.'},
  'answer':{'status':'independently-derived-math-only','basis':'제공 학생 입력에서만 계산했다. q18은 수학 답이 명확해도 복잡성 gate가 pending이다.','target':calc['target']},
  'studentSolution':{'status':statusFor('studentSolution'),'basis':prereq[n]+' 완전한 새 독립 학생 해법은 solution 필드에 있다. 저자 답/해법은 읽지 않았다.'},
  'prerequisites':{'status':statusFor('prerequisites'),'basis':prereq[n],'standards':official}}
 evidence={'studentInputRawSha256':sha(R/'student-problems.json'),'givenStudentDigest':q['studentDigest'],'blindManifestRawSha256':sha(R/'blind-manifest.json'),'opaquePackageDigestProvided':manifest['packageDigest'],'calculationCodePath':'calculation.py','calculationCodeRawSha256':sha(R/'calculation.py'),'calculationOutputPath':'calculation-output.json','calculationOutputRawSha256':sha(R/'calculation-output.json'),'exactCalculation':calc['evidence'],'knownHolds':calc['knownHolds'],'actualStudentPreview':preview,'suppliedFigures':q['figures'],'figureObservations':observations.get(n),'curriculumSurfaces':surfaces,'curriculumEvidenceRawSha256':sha(R/'curriculum-validation.json'),'freshNewAuthorAnswerExposure':False,'priorOriginalSourceConceptKnowledgeSeparatelyDisclosed':'input-audit.json','authorAnswerAndNewSolutionReview':'not-exposed;pending Root authorization after raw commit','mathematicalTargetUnique':True,'calculationOnlyNotFinalGradeApproval':True,'rightsAndNativeApproval':False}
 result={'questionNumber':n,'twinExternalId':q['twinExternalId'],'studentDigest':q['studentDigest'],'solverId':'orca-codex-exam-twin-author-geometry-20261008','status':calc['solverStatus'],'answer':sol['answer'],'solution':sol['solution'],'evidence':evidence,'curriculumGate':{'grade':'중3','edition':'2015','wholeStudentScope':'pending-material-complexity' if n==18 else 'in-scope-independent-proposal','requiredUpperGradeMethodDetected':False,'materialComplexityHold':n==18,'finalGradeApproval':False,'finalAuthorReviewPending':True},'gates':{'rights':'held','nativeCompatibility':'pending','loadable':False,'directUseAllowed':False,'modelCalls':0,'dbAccess':0}}
 if 'answerParts' in sol:result['answerParts']=sol['answerParts']
 put(R/f'solve/{id}.json',result);rows.append({'questionNumber':n,'studentDigest':q['studentDigest'],'status':result['status'],'answer':result['answer'],'mathUnique':True,'gradeComplexityHold':n==18})
assert sum(q['score'] for q in questions)==71 and sum(q['questionType']=='객관식' for q in questions)==12
put(R/'solve-summary.json',{'scope':'fresh raw GF15 independent solves;no final review before authorized exposure','counts':{'parents':15,'mathematicalAnswersDerived':15,'solved':14,'pending':1,'MC':12,'written':3,'numberedWrittenPartsCovered':9,'score':71,'suppliedSVG':12,'authorAnswersExposed':0,'rightsCleared':0,'nativeApproved':0,'loadable':0},'q18MaterialComplexityHoldPreserved':True,'priorNewGF15AnswerExposure':False,'rows':rows})
for f in read(R/'preservation.json')['files']:assert sha(REPO/f['path'])==f['sha256'],f['path']
print('GF15 independent solves written:14solved/1pending(q18complexity);12MC/9writtenparts/71points;old917 unchanged.')
