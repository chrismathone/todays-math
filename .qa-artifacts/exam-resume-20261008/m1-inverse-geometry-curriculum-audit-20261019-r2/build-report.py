import json,pathlib,hashlib,datetime
out=pathlib.Path(__file__).parent
root=pathlib.Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
prior=root/'.qa-artifacts/exam-resume-20261008/m1-inverse-geometry-curriculum-audit-20261019-r1'
def read(name):return json.loads((out/name).read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(name,x):(out/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
before=read('source-before.json');after=read('source-after.json')
closing={p:sha(root/p) for p in before}
assert before==after==closing
write('source-closing.json',closing)
summary=read('summary.json');rows=read('actual24-and-independent-findings.json');probes=read('verifier-semantic-limits.json')
assert len(rows)==24 and len(probes)==2 and all(p['result']['valid'] for p in probes)
visual={
 'existingSheet':'C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008/.qa-artifacts/exam-resume-20261008/m1-inverse-geometry-curriculum-audit-20261019-r1/local-view/existing-70mm-six.png',
 'actualSheetSha256':'1dfe426c0d5d47796463d1f87bd671afae4de6948e82cf7ffe677c1164765234',
 'independentlyViewedThisTurn':True,'newRender':False,'selected':{'inverseArea':[0,1,2,11],'square':[0,7]},
 'observation':'6개 기존70mm뷰에서 좌표축/O/A/B/C 및 square의D/R/정비례식이 식별된다. area의AC수선과CB보조선 및OA/AB/OB는 넓이 분할을 설명하기에 충분하다. area1의AB현과곡선이B부근에서 가깝지만B점/라벨은 구별된다. square0의y=1x 표기는 y=x로 단순화 가능하나 수학/학년 오류는 아니다.',
 'binding':'현재20개 명세를 기존20개 snapshot/기존SVG해시와 각각 대조했다. 새 area해설의 명명/분할만 달라졌고 그림은 그대로다. 원시JSON좌표는 확인용이고 정답은 인쇄값/문장/라벨에서 먼저 계산했다.',
 'limits':'선택6뷰 재열람이며20개 모든 인쇄 배치나현재 제품 native rendering을 승인하지 않는다. 그림 픽셀은 수치 계산의 근거가 아니다.'}
assert sha(pathlib.Path(visual['existingSheet']))==visual['actualSheetSha256']
write('visual-review.json',visual)
source_evidence={}
for name in ['current-audit.mts','primary-locators.json','existing-figure-bindings.json','visual-view-metadata.json','report.json','actual-student-surfaces.json']:
 source_evidence[name]={'path':str(prior/name),'sha256':sha(prior/name),'role':'Allowed prior own evidence; this r2 reruns current finite outputs rather than inheriting prior approval.'}
write('prior-evidence-receipt.json',source_evidence)
family={
'equalLegs':{
 'familyId':'study-middle-inverse-equal-legs','version':'2-m1-single-variable','variants':4,
 'decision':'current-student-method-passed-with-readiness-condition',
 'sevenSurfaces':{
 'stem':{'status':'passed','evidence':'모든4발문에서양수서로다른x좌표p=2/3,q=5/7, u>v>0,가로/세로차의동일조건,동일반비례식이주어진다. k,u,v라는세이름은세미지수연립법을필수화하지않는다.'},
 'choices':{'status':'not-present','evidence':'현재4출력은단답형이다. 객관식보기/오답선지/서술형rubric은없고검토하지않았다.'},
 'figuresAndTables':{'status':'not-present','evidence':'figureSpec=null. 좌표와조건은발문에직접인쇄되어숨은도형전제가없다.'},
 'notation':{'status':'passed','evidence':'y=k/x, 좌표쌍, k/u/v와새변수t는문자사용/좌표/반비례범위이다. p와q는검토자표기이며학생출력은숫자계수2,3,5,7만쓴다. 상수×(t+수)분배는일차식계산이다.'},
 'answer':{'status':'passed','evidence':'독립계산k/u/v는순서대로10/5/2,14/7/2,15/5/3,21/7/3. 각쌍은양수·두곱일치·두차일치. q-p>0인수치계수로유일해이다.'},
 'studentSolution':{'status':'passed','evidence':'실제4풀이가v=t,u=t+d에서p(t+d)=qt라는한미지수수치방정식을세우고분배/이항/나눗셈으로t를복원한다. 두미지수식의가감·소거가없다. 2022의9수02-01~04와07로지원된다.'},
 'prerequisites':{'status':'passed-with-readiness-condition','evidence':'일차식/등식성질/일차방정식/좌표/반비례를배운후가능. 2025/2026중1의2022범위. 두미지수연립9수02-13을필수선수로추가하지않았다. 개별학교진도는확인하지않았다.'}
 },
 'primitiveOperations':'좌표차빼기→v=t,u=t+d→같은반비례좌표곱→숫자계수분배→일차식정리→양수계수나눗셈→나머지수치대입. 실제4개방정식/원조건수치는actual24-and-independent-findings.json에모두보존.'},
'inverseArea':{
 'familyId':'study-middle-inverse-area-ratio','version':'2-m1-elementary-area','variants':12,
 'decision':'current-student-method-passed-with-readiness-condition',
 'sevenSurfaces':{
 'stem':{'status':'passed','evidence':'모든12발문에서동일양수반비례의제1사분면A/B,B가A오른쪽,C가수선의발,ABC:OAC넓이비를명시한다. 인쇄A좌표와양수비가B와면적을유일하게정한다.'},
 'choices':{'status':'not-present','evidence':'현재12출력은단답형. 보기도native서술rubric도없다.'},
 'figuresAndTables':{'status':'passed-with-visual-limit','evidence':'현재12명세가기존그림명세와일치. A숫자좌표/C발/O및B라벨,OA/AB/OB/AC/CB가조건을나타낸다. A/B입사,제1사분면곡선,점선두개를수치검사했다. 대표4area70mm뷰를다시보았으며전12배치인증은아니다.'},
 'notation':{'status':'passed','evidence':'x_B,y_B는B좌표를명명한표기이며좌표성분이상의정리가아니다. [OAC]는해설에서삼각형넓이라고정의한다. 숫자비와×,÷2및수치곱/나눗셈이다. 행렬식·신발끈·닮음·기울기공식이필요없다.'},
 'answer':{'status':'passed','evidence':'공유양수밑변AC로offset=a*r/s가유일하게정해지고b=a+offset>a,z=ay/b>0. 각12개에서z<y,곱bz=ay,넓이비및양수최종넓이를확인했다. 12개정확한B/세넓이/최종합은독립수치파일에있다.'},
 'studentSolution':{'status':'passed','evidence':'실제12해설에OAC,ABC,OBC의숫자밑변×높이÷2가모두나온다. 사각형OABC=OAC+ABC=OAB+OBC라는두분할을밝혀OAB=OAC+ABC-OBC를설명한다. 막연한큰삼각형빼기또는좌표면적공식으로건너뛰지않는다. OBC의높이는삼각형밖에있을수있으며2015초등공식지도유의가이를포함한다.'},
 'prerequisites':{'status':'passed-with-readiness-condition','evidence':'2022중1의좌표/반비례/수치일차표현과2015초5~6삼각형넓이(외부높이포함),비/간단한비례식. 2025중1은2023/2024초5/6,2026중1은2024/2025초5/6를2015로이수한정상학년코호트이다. 학기/개별진도는별도이다.'}
 },
 'primitiveOperations':'공유AC밑변의넓이비→수치가로높이비→단순비례식→반비례수치곱/나눗셈→삼각형세개의밑변×수직높이÷2→넓이가법성에의한합/차. 원점좌표행렬식은학생필수방법이아니다.'},
'sharedSquare':{
 'familyId':'study-middle-shared-side-square','version':'1','variants':8,
 'decision':'unchanged-current-student-method-passed-with-readiness-condition',
 'sevenSurfaces':{
 'stem':{'status':'passed','evidence':'축평행정사각형,왼쪽A/D의서로다른정비례입사,오른쪽좌표R및C제1사분면조건이정해진다. 8개모두기존발문동일.'},
 'choices':{'status':'not-present','evidence':'8개모두단답형이며선지/rubric인증은범위밖이다.'},
 'figuresAndTables':{'status':'passed-with-visual-limit','evidence':'8개현재명세/곡선계수/꼭짓점라벨/R점선과기존명세동일. 두숫자정비례식과R을읽어먼저풀었고이후네점을대조했다. 기존square0/7뷰재확인. 모든8인쇄배치인증은아니다.'},
 'notation':{'status':'passed','evidence':'A=(u,숫자u),D=(u,숫자u)의같은u와숫자계수일차식만쓴다. 보이는숫자계수의합/차를추상변수끼리곱으로오분류하지않는다. y=1x는문체상간소화가능하다.'},
 'answer':{'status':'passed','evidence':'양수숫자계수1+b-a로u=R/(1+b-a)>0가유일하고side=(b-a)u>0. C=(R,bu),나머지세점도제1사분면. 8개실제좌표/같은변/입사조건수치확인.'},
 'studentSolution':{'status':'passed','evidence':'실제8개는세로길이=(b-a)u,가로길이=R-u,같은변에서u+(b-a)u=R인한미지수방정식이다. 좌표거리공식·피타고라스·닮음·연립법·문자끼리곱이필수아니다. 기존8개해설/답/발문/명세가바이트직렬화비교상그대로이다.'},
 'prerequisites':{'status':'passed-with-readiness-condition','evidence':'2015초3~4의정사각형성질4수02-10을배운정상2025/2026중1코호트에2022중1문자식/일차방정식/좌표/정비례를연결한다. 해당정비례단원학습후만지원하며학교진도는인증하지않는다.'}
 },
 'primitiveOperations':'같은x=u의정비례세로좌표→숫자계수일차식의차→정사각형같은두변→한미지수수치방정식→C세로좌표대입. 실제8개필수계산은독립수치파일에있다.'}
}
report={
 'kind':'bounded-independent-engine-student-method-audit/v2',
 'status':'pending-verifier-soundness-hold',
 'reviewerId':'codex-clean-blind-20261019-r1-same-session-engine-audit',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'scope':{'rootReadOnly':str(root),'currentRootFiles':list(before),'families':3,'actualVariants':24,'newIndependentNobyeonSolverCount':0,'otherPaperQuestionsRead':0,'wholeOriginalPapersRead':0,'broadRegistrySweeps':0,'rootEdits':0},
 'conclusion':'現行24出力の学生方法自体は2022中1の学習済み条件と2015初等の前提で支持できる。ただし二つの矛盾追記を検証器が受理するため全体の検証器承認は保留。',
 'currentOutputMathAndMethod':'passed-with-readiness-condition',
 'verificationSufficiency':'held: canonical correct clauses plus appended conflicting arithmetic still valid=true',
 'summary':summary,
 'numericalEvidence':'actual24-and-independent-findings.json:全24印刷面/独立計算/符号/存在/一意性/primitive operations/旧比較を保持。',
 'familyOutcomes':family,
 'findings':[
  {'id':'R2-G1','status':'resolved-in-actual-current-output','family':'equalLegs','coverage':'all4','evidence':'version2-m1-single-variable uses only numerical one-variable t equations. All four actual previous v1 solutions rejected with correct current answers unchanged.'},
  {'id':'R2-G2','status':'resolved-in-actual-current-output','family':'inverseArea','coverage':'all12','evidence':'version2-m1-elementary-area explicitly names three elementary areas and both partitions. All12actual previous v1 solutions and each missing/corrupted OAC/ABC/OBC area rejected.'},
  {'id':'R2-G3','severity':'high','status':'open-verifier-failure','family':'equalLegs','location':'algebra.ts equalLegs.solve clauses(item.solution,...) / support.ts family.verify','counterexample':'Variant0 valid canonical solution plus 추가로 $t=99$이다., original final answer unchanged. Actual verify.valid=true despite t=2 in the numerical solution.','expected':'Reject conflicting intermediate equation; correct final answer and required snippets do not certify all printed mathematics.','evidence':'verifier-semantic-limits.json[0]'},
  {'id':'R2-G4','severity':'high','status':'open-verifier-failure','family':'inverseArea','location':'graphs.ts inverseArea.solve clauses(item.solution,...) / support.ts family.verify','counterexample':'Variant0 valid canonical solution plus 추가로 $[ABC]=999$이다., original final answer unchanged. Actual verify.valid=true despite correct ABC=6.','expected':'Reject false intermediate area even when required correct area clauses also remain present.','evidence':'verifier-semantic-limits.json[1]'}
 ],
 'negativeControls':{'replacementRemovalCases':128,'rejected':128,'answersUnchanged':True,'includesActualPriorV1Outputs':16,'semanticAppendCases':2,'incorrectlyAccepted':2,'failureNotExcusedByConfidence':True,'files':['verifier-negative-cases.json','verifier-semantic-limits.json']},
 'versionAndFactoryScope':'Actual exported versions checked: equalLegs2-m1-single-variable, inverseArea2-m1-elementary-area, square1. Factory verifies actual24and rejects128mutations including exact old16solutions. This does not prove every arbitrary prose mutation or persistence/release version gate sound. Internal author verification still uses linear2/area helpers; these were not imported as the independent oracle and are not printed student prerequisites.',
 'primaryEvidence':'primary-locators.json / primary-check.py: actual official2015HWP and2022HWP hashes matched;2022attachment is ZIP and only math book8 HWP parsed in memory.16targeted record locators retained as paraphrases/hashes, plus actual KICE/MOE2026M1 example page24and publication page61.',
 'cohortApplicability':read('primary-locators.json')['cohort'],
 'observedInferredUnknown':{
  'observed':'Exact current24printed outputs,128factory rejection results,twoacceptedfalseappendcontrols,484KaTeXblocks,20unchangedfigurebindings,sixview reread,official HWP hashes/records and KICEexample actualcodes.',
  'inferred':'Single-variable numerical distribution and triangle area additivity are adequate student routes within learned2022M1 plus the normal cohorts2015elementary prerequisites. Correct output paths may pass even though the general verifier remains insufficient.',
  'unknown':'School-specific pacing/readiness,individual prior learning,empirical difficulty/learning effects,all20layoutquality,native final rendering,arbitrary prose correctness and future fixed version behavior are not established.'},
 'visualEvidence':'visual-review.json; all20bindings in existing20-bindings.json; only six selected existing70mmviews inspected, no new engine rendering.',
 'difficultyAndLanguage':'All actual24are native short-answer 심화하 with positive small integer constants/ordinary ratios and one numerical linear unknown or elementary area arithmetic. The added name t and named OAC/ABC/OBC improve transparency; no full-paper score/time/empirical level calibration performed. Multiple target letters/coordinate labels alone are not a grade violation. Numeric coordinates/areas have no printed physical unit, so no cm/cm² is invented; coordinate and area results remain consistent.',
 'parentEvidenceOnly':'Parent-reported54root tests and type/lint passes were not rerun or used as independent grade approval. No fullregistry/broad sweep/operating app was run.',
 'sourceIntegrity':{'before':before,'after':after,'closing':closing,'equal':True,'limits':'Hash equality covers the four authorized current root source/test files. No claim about unrelated root work or total checkout cleanliness is made.'},
 'auditChronology':['Explicit user authorized only current method files, prior own engine audit evidence and referenced figures/primary docs. No other Nobyeon or paper questions read.','Ownbounded24runner calculated from printed text/labels before comparing outputs or actual verifier.','Official curriculum checked directly in memory; existing six-view sheet read.','Actual current revisions resolve old student-method gaps. Exact old output negative controls rejected; two contradictory append probes accepted and recorded as failures.','User instructed to seal current r2 before any parent fix; report/evidence only committed without root changes or waiting for a fix.'],
 'limitsAndHolds':{'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeRenderingApproved':False,'liveFamilyAssignmentApproved':False,'releaseApproved':False,'arbitraryProseCertified':False,'loadable':False,'reason':'Current template math/method finding only; source/rights/native/family/release holds remain and twoverifier counterexamples remain open. Parent may later revise only reviewedtwo templates and request focusedr3; no future fix is assumed.'},
 'operatingDB':0,'deploys':0,'pushes':0,'installs':0,'newWorkers':0,'newWorktrees':0,'fullThirdPartyPublished':False
}
report['conclusion']='현재24출력의학생방법자체는2022중1학습완료조건과2015초등선수로지원된다. 그러나검증기가모순추가2건을받아들이므로전체검증기승인은보류한다.'
report['numericalEvidence']='actual24-and-independent-findings.json:전체24개인쇄면,독립수치계산,양수/존재/유일성,기본연산,기존출력비교를보존한다.'
write('report.json',report)
# Seal only own source/evidence, not downloaded publications.
entries={p.name:sha(p) for p in sorted(out.iterdir()) if p.is_file() and p.name!='evidence-manifest.json'}
write('evidence-manifest.json',{'kind':'own-bounded-engine-audit-evidence','files':entries,'thirdPartyFullDocumentsIncluded':False,'rootSourcesCopiedAsFiles':False})
print(json.dumps({'status':report['status'],'reportSha256':sha(out/'report.json'),'files':len(entries)+1,'sourceBeforeAfterClosingEqual':True},ensure_ascii=False))
