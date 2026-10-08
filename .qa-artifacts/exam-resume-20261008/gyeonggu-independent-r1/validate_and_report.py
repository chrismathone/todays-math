"""Check raw solve/asset bindings and preservation before the blind commit."""
from pathlib import Path
import ast
from collections import Counter
import hashlib
import json
import math
import re
import subprocess
import sys
import fitz
import sympy as S
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,rationalize

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parent
OWN=ROOT.parents[2]
SOLVER='orca-codex-exam-twin-source-identity-20261008'

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def save(p,d):(ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def parse_written(s):
    s=re.sub(r'\s*\(표의 근삿값\)','',s)
    s=s.replace('cm²','').replace('cm³','').replace('cm','').replace('°','').replace('−','-')
    s=re.sub(r'√(\d+)',r'sqrt(\1)',s).replace('tan35','T35')
    return parse_expr(s,local_dict={'sqrt':S.sqrt,'T35':S.Symbol('T35',positive=True)},
                     transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def dot_angle(a,b,c):
    u=[float(a[i]-b[i]) for i in [0,1]];v=[float(c[i]-b[i]) for i in [0,1]]
    cos=sum(x*y for x,y in zip(u,v))/math.sqrt(sum(x*x for x in u)*sum(y*y for y in v))
    return math.degrees(math.acos(max(-1,min(1,cos))))

qs=load('blind/student-problems.json')
assert [q['questionNumber'] for q in qs]==[*range(1,20),21,22,23]
inputs=load('input-manifest.json');figs=load('figure-observations.json');manifest=load('raw-solves-manifest.json')
assert len(inputs['files'])==21 and len(figs)==20 and len(manifest['solves'])==22
assert sha(ROOT/'blind/student-problems.json')==inputs['wholeStudentInputSha256']
for f in inputs['files']:
    assert sha(f['sourcePath'])==sha(f['ownedPath'])==f['sha256']
    assert '/gyeonggu-review-r1/blind/' in f['sourcePath']
    assert f['sourcePath'].endswith('.svg') or f['sourcePath'].endswith('/student-problems.json')
for f in figs:
    assert f['visualInspection'].startswith('direct view_image completed')
    assert sha(ROOT/'blind'/f['svg'])==f['svgSha256']
    assert sha(ROOT/f['png'])==f['pngSha256'] and sha(ROOT/f['pdf'])==f['pdfSha256']
    with fitz.open(str(ROOT/f['pdf'])) as doc:
        assert abs(doc[0].rect.width/72*25.4-f['intendedWidthMm'])<0.01

all_choice_count=0;written_parts=0;answer_bindings=[]
for q,row in zip(qs,manifest['solves']):
    n=q['questionNumber'];p=ROOT/row['rawSolvePath'];d=json.loads(p.read_text(encoding='utf-8'))
    proof=load(row['proofPath'])
    assert sha(p)==row['rawSolveSha256']
    assert d['studentDigest']==q['studentDigest']==row['studentDigest']==proof['studentDigest']
    assert d['solverId']==SOLVER and d['status']=='solved' and d['heldReasons']==[]
    assert d['answer']==row['answer'] and len(d['solution'])>100
    assert len(d['evidence']['sevenStudentSurfaces'])==7
    assert all(x['inGradeForUsedStudentMethod'] for x in d['evidence']['sevenStudentSurfaces'])
    assert d['evidence']['proof']['sha256']==sha(ROOT/row['proofPath'])==row['proofSha256']
    assert d['evidence']['code']['sha256']==proof['codeSha256']==sha(ROOT/'solve_math.py')
    assert d['evidence']['newAuthorCandidateAnswersKnownBeforeThisSolve'] is False
    assert d['evidence']['originalKeyAgreementUsed'] is False and d['evidence']['otherSolverRead'] is False
    assert all(x['passed'] for x in proof['conditionChecks'])
    values=list(d['answerParts'].values())
    if n==3:values=[d['answerParts']['t']];assert d['answerParts']['해당 구간']=='1/2<t<2/3'
    if n==22:values=[d['answerParts'][k] for k in ['⑴ AP','⑵ 반지름','⑶ AO']]
    assert len(values)==len(proof['exactRequestedValues'])
    for text,exact in zip(values,proof['exactRequestedValues']):
        expected=S.sympify(exact,locals={'T35':S.Symbol('T35',positive=True)})
        assert S.simplify(parse_written(text)-expected)==0,(n,text,exact)
    answer_bindings.append({'questionNumber':n,'allWrittenExactPartsMatchIndependentProof':True})
    if q['choices']:
        cc=proof['choiceCheck'];all_choice_count+=len(cc['allChoices'])
        assert cc['exactlyOneChoice'] and len(cc['allChoices'])==5 and len(cc['matchingIndices1based'])==1
        selected=cc['allChoices'][cc['matchingIndices1based'][0]-1]
        assert all(selected.get('domainAndGivenConditionChecks',{}).values())
        assert d['answer'].startswith('①②③④⑤'[cc['matchingIndices1based'][0]-1]+':')
    else:written_parts+=proof['choiceCheck']['multiPartCount']
assert all_choice_count==95 and written_parts==10

# Additional angle checks from exact incidence witnesses; diagnostics only, not student vectors.
extra_angles=[]
for n,tests in {
    9:[('E','A','D',None),('D','A','C',None)],
    10:[('B','A','E',45),('E','A','F',30),('D','A','F',15)],
    13:[('A','D','C',105),('D','C','B',45)],
    21:[('B','A','C',45),('B','D','C',60),('A','P','B',75)],
    22:[('P','A','Q',60)],23:[('A','P','B',60),('A','O','B',120)]
}.items():
    points=load(f'blind/proofs/q{n:02}.json')['coordinateWitness']['points']
    points={k:tuple(S.sympify(v) for v in point) for k,point in points.items()}
    values=[]
    for a,b,c,target in tests:
        got=dot_angle(points[a],points[b],points[c]);values.append(got)
        if target is not None:assert abs(got-target)<1e-7,(n,a,b,c,got,target)
        extra_angles.append({'questionNumber':n,'angle':a+b+c,'degreesCalculated':got,'target':target,'passed':True})
    if n==9:assert abs(values[0]-values[1])<1e-7
save('additional-angle-checks.json',{'checks':extra_angles,'basis':'Fresh exact coordinate witnesses then local numerical diagnostics; no pixel/author-answer inputs; not a student prerequisite.'})

baseline=load('preservation-baseline.json')
oldfail=[x['path'] for x in baseline['prior2089'] if not Path(x['path']).is_file() or sha(x['path'])!=x['sha256']]
q07fail=[x['path'] for x in baseline['newQ07Evidence'] if not Path(x['path']).is_file() or sha(x['path'])!=x['sha256']]
assert baseline['preexistingExternalDifferences']==[]
assert oldfail==[] and q07fail==[]
preservation={'old2089Count':len(baseline['prior2089']),'allOld2089Unchanged':not oldfail,
              'completedQ07ExtraCount':len(baseline['newQ07Evidence']),'allCompletedQ07Unchanged':not q07fail,
              'changedPaths':oldfail+q07fail,'hashOnlyPreservationNotOriginalAnswerInspection':True}
save('preservation-check.json',preservation)
for p in ROOT.glob('*.py'):ast.parse(p.read_text(encoding='utf-8'))
assert not any(p.name=='__pycache__' for p in ROOT.rglob('*'))
visible=subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],cwd=OWN).decode('utf-8')
for line in visible.splitlines():
    path=(OWN/line[3:].strip('"')).resolve()
    assert path.is_relative_to(ROOT),line
save('validation.json',{'status':'passed','questions':22,'uniqueMultipleChoiceQuestions':19,'actualChoicesChecked':all_choice_count,
    'writtenSubpartsChecked':written_parts,'eachQuestionSurfaces':7,'surfaceObservationCount':154,
    'rawSolveAndProofAndCodeAndAnswerTextBindingsValid':True,'answerBindings':answer_bindings,
    'exactCoordinateWitnessAnglesChecked':len(extra_angles),'tableEntriesRoundedAndChecked':12,
    'figuresCopiedByteIdentically':20,'physicalWidthsVerifiedAndImagesDirectlyViewed':20,
    'heldQuestionNumbers':[],'rejectedQuestionNumbers':[],'preservation':preservation,
    'authorExposure':False,'otherSolverRead':False,'originalKeyAgreement':False,'dbActions':0,'paidCalls':0,'installs':0,
    'scope':'Integrity and independent math/student-method evidence; no author comparison, rights/native/family/overall-load approval.'})

code_files=['prepare_blind.py','solve_math.py','curriculum_and_figures.py','emit_solves.py','validate_and_report.py']
report=[
    '# Gyeonggu independent blind solves r1 — 2026-10-08',
    '',
    '**22 raw solves completed; held set: ∅; rejected set: ∅.** This is the independent blind stage for questions1–19,21–23. All19 multiple-choice questions have exactly one matching actual student choice (95 alternatives checked); all10 numbered written subparts have exact values and fresh explanations. q22⑴ also explains the perimeter relationship. Each raw record preserves the supplied studentDigest and solverId `'+SOLVER+'`.',
    '',
    'Only Root `gyeonggu-review-r1/blind/student-problems.json` and its20 referenced student SVGs were parsed. Their exact bytes were copied into this owned `blind/` scope. No Gyeonggu candidate, author-check, authored solution, private figure/spec/report, source answer, original key or another solver was read. There was no source-audit replay. Prior original-source familiarity is not used as an answer oracle; earlier own source work and incidental scan annotations concerned Bumil. Possible source familiarity from prior context is disclosed rather than claiming source-naive blindness. The newly authored candidate answers/solutions remain unknown at completion of these raw solves. Old protected files were hash-read only for preservation, without decoding answers.',
    '',
    'Whole student JSON SHA-256: `'+inputs['wholeStudentInputSha256']+'`. All21 student input files (JSON+20 SVGs) were rechecked byte-identically against the allowed Root paths. Per-question diagnostic canonical hashes are explicitly distinct from the supplied Root studentDigest algorithm, which this worker does not invent.',
    '',
    'The mathematical oracle is the new student text and its givens, not pixels, original-key agreement, a family title, or model confidence. Exact arithmetic and independently constructed coordinate witnesses check lengths, incidence, perpendicularity, angles, positive branches and existence. Coordinates/dot products and numerical trig diagnostics are local verifier calculations, not required student vector/calculus methods. Fresh Korean student solutions use definitions, elementary angle/congruence/similarity/area/Pythagoras and30°/45°/60° right triangles. The seven surfaces—stem, choices, figure/graph meanings, notation, answer format, full student solution, necessary procedure/prerequisites—are recorded for each of22 questions (154 observations).',
    '',
    'Specific legitimate-route checks: q05 compares acute-angle cosine/tangent geometrically without finding an exact75°/55° value; q09 uses ASA congruence and Pythagoras rather than an unverified angle-bisector length theorem; q10 builds its15° cosine from the supplied30°/45° triangles instead of an addition/half-angle formula; q13 obtains a45° subtriangle and uses a single triangle base-height area, with no105° trig value. q21 derives75° by angle sums. q23 uses the120° sector fraction and30° right triangle; no120° trig value. None of the student solutions uses arbitrary trig identities, addition formulas, law of sines/cosines, upper-grade extrema/calculus, vector methods, circle power or forced grade exceptions.',
    '',
    'q06’s requested records are the four-decimal table approximations0.6428 and0.7660; all12 table entries were independently rounded/check-tested and no exact squared-sum is imposed on rounded values. q17 permits many radii but uniquely determines chord14cm; q22 permits different B/C positions but uniquely determines AP, radius andAO. All written positive-root/interior-point branches and units are explicit. Numerical answer-text components were independently parsed and matched to exact code results before freezing.',
    '',
    'All20 SVGs were rendered into vector PDFs at exactly70mm, except bothq11 figures at55mm, then directly viewed with `view_image` as300dpi PNGs. Cairo’s native runtime was absent; existing PyMuPDF was used without installs. Raw SVG bytes stayed unchanged. Labels/angle markers are legible in those controlled views. q04/q10 use outward labels/leaders; their angles are explicitly fixed by the student stem. q16’s B label is displaced below the circle/OP intersection, but O,B,P ordering is explicit in text and no mathematical ambiguity remains. Standalone figure viewing does not certify complete final-page text/table rendering or production printing. Per-file observations and widths are in `figure-observations.json`.',
    '',
    'Primary applicable2015 standards and restrictions were freshly decoded from official2020-236 mathHWP and whole-clause checked against2015-74 mathPDF; exact records/pages/hashes are in `curriculum-method-evidence.json` (24 clauses). The2015/2022 official rollout records establish2015 for actual2025middle3 and separate2022middle3 rollout2027. [Official amended math book8](https://www.moe.go.kr/boardCnts/fileDown.do?m=0404&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84), [official2015 math archive](https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=dc926a43bf953203951fb928ff098b1c). q01/q03/q04/q07 directly evaluate definitions from actual lengths or specified special angles; they do not transfer a single known ratio to other same-angle ratios using prohibited identities. This legitimate-method evidence is not complete policy-history or future republication approval.',
    '',
    'Latest D:/todays-math/AGENTS.md and the project TypeSafe skill were read. Live [confidence](https://docs.typesafe.ai/confidence) and [citation-check](https://docs.typesafe.ai/cookbooks/citation_check) docs informed separation of observed facts, contextual curricular judgments and calculation. No probability/confidence was used to authorize grade content; no inference API was called.',
    '',
    'Preservation checks passed for all2089 previous baseline files plus all22 completedq07 adjudication files/report. No previous raw solves/reports/holds or frozen artifacts changed. No parent/main/N/old-output/shared-dependency/product writes, operational teacher/student UI, DB read/apply, install, Prisma generation, paid/model API, deployment or push occurred. Exact Unit/live family assignment, original-twin fidelity, rights/native provenance and overall loading remain outside this independent stage.',
    '',
    'The22 raw files and controlled assets/proofs are to be committed before authored-answer exposure. **Stop this scoped blind stage after reporting the full owned commit; await Root’s verify-pack and hash binding.** This does not pause or complete the parent’s overall goal. Root normalization is formatting-only; exact values and subparts below and in the raw files are authoritative as this solver’s unchanged independent result.',
    '',
    '## Raw solves and proof hashes',
    '',
    '| Question | Independent exact answer | studentDigest | Raw solve SHA-256 | Proof SHA-256 |',
    '|---|---|---|---|---|'
]
for row in manifest['solves']:
    report.append(f"| q{row['questionNumber']:02} | {row['answer']} | `{row['studentDigest']}` | `{row['rawSolveSha256']}` | `{row['proofSha256']}` |")
report+=['','## Exact copied figures','','| Student SVG | Width mm | Original/copy SHA-256 |','|---|---|---|']
for f in inputs['files'][1:]:report.append(f"| {Path(f['ownedPath']).name} | {f['intendedWidthMm']} | `{f['sha256']}` |")
report+=['','## Reproducible code and evidence bindings','','| Owned code | SHA-256 |','|---|---|']
for name in code_files:report.append(f'| {name} | `{sha(ROOT/name)}` |')
report+=['','All raw solves bind their full student solution, per-question proof, exact copied figure hashes and code hash. `raw-solves-manifest.json` is the raw solve binding list; `artifact-manifest.json` binds the remaining new controlled files. `validation.json` records integrity/independent checks; hashes alone are not mathematical or curricular proof.','']
(ROOT/'BLIND-SOLVE.md').write_text('\n'.join(report),encoding='utf-8')

artifacts=[{'path':p.relative_to(OWN).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
           for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name!='artifact-manifest.json']
save('artifact-manifest.json',{'schema':'gyeonggu-independent-blind-assets.v1','artifacts':artifacts,
    'manifestSelfHashExcluded':True,'authorExposureOccurred':False,'rawSolvesFrozenByNextOwnedCommit':True})
print(json.dumps({'checks':'passed','solved':22,'held':[],'actualChoicesChecked':95,'writtenSubparts':10,
                  'old2089Unchanged':True,'completedQ07Unchanged':22,'newArtifactsExcludingManifest':len(artifacts),
                  'rawSolveManifestSha256':sha(ROOT/'raw-solves-manifest.json'),'reportSha256':sha(ROOT/'BLIND-SOLVE.md')},ensure_ascii=False))
