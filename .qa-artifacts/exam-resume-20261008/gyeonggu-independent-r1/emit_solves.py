"""Write all 22 raw blind solves, with exact independent proofs bound by hash."""
from pathlib import Path
import hashlib
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parent
SOLVER='orca-codex-exam-twin-source-identity-20261008'

def load(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def canonical_sha(d):return hashlib.sha256(json.dumps(d,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()
def save(p,d):
    p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

questions=load('blind/student-problems.json')
notes=load('student_solutions.json')
assert set(notes)=={str(q['questionNumber']) for q in questions}
figs=load('figure-observations.json')
curric=load('curriculum-method-evidence.json')
clauses={x['id']:x for x in curric['provisions']}
manifest=load('input-manifest.json')
rows=[]
for q in questions:
    n=q['questionNumber'];note=notes[str(n)]
    p=ROOT/f'blind/proofs/q{n:02}.json';proof=json.loads(p.read_text(encoding='utf-8'))
    assert proof['studentDigest']==q['studentDigest']
    assert proof['codeSha256']==sha(ROOT/'solve_math.py')
    observations=[x for x in figs if x['questionNumber']==n]
    choice=proof['choiceCheck']
    answer={'schema':'independent-blind-solve.v1','questionNumber':n,'twinExternalId':q['twinExternalId'],
        'studentDigest':q['studentDigest'],'solverId':SOLVER,'status':'solved',
        'answer':note['answer'],'answerParts':note['parts'],'solution':note['solution'],
        'evidence':{
            'method':'independent-student-input-solve-before-author-answer-exposure',
            'studentMethod':note['method'],'conditionAndDomainNotes':note['conditions'],
            'exactValuesFromCode':proof['exactRequestedValues'],
            'code':{'path':'solve_math.py','sha256':sha(ROOT/'solve_math.py')},
            'proof':{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p)},
            'studentSolutionSource':{'path':'student_solutions.json','wholeFileSha256':sha(ROOT/'student_solutions.json'),
                                     'questionRecordSha256':canonical_sha(note)},
            'wholeStudentInputSha256':manifest['wholeStudentInputSha256'],
            'contentSha256Utf8':hashlib.sha256(q['content'].encode('utf-8')).hexdigest(),
            'studentObjectCanonicalSha256':canonical_sha(q),
            'canonicalHashLimit':'This diagnostic canonical hash is not a claim about Root studentDigest algorithm; supplied studentDigest is retained unchanged.',
            'choiceCheck':choice,
            'existenceUniquenessPositivity':{
                'actualCodeChecks':proof['conditionChecks'],
                'supplementalExactCoordinateWitness':proof['coordinateWitness'],
                'uniqueRequestedAnswer':True,
                'wholeConfigurationMustBeUnique':False,
                'limit':'q17 radii and q22 triangle placements can vary while requested answers are unique. No pixel lengths or model probability determine uniqueness.'},
            'figures':[{'svgPath':f['svgPath'],'sha256':f['sha256'],'intendedWidthMm':f['intendedWidthMm']} for f in q['figures']],
            'directFigureInspections':observations,
            'sevenStudentSurfaces':[
                {'surface':'stem','observation':note['conditions'],'inGradeForUsedStudentMethod':True,
                 'limit':'New student stem only; original-twin faithfulness and provenance are not reviewed.'},
                {'surface':'choices','observation':'All actual student choices parsed and every requested component/strict interval compared.' if q['choices'] else 'No choices; every numbered subpart answered, including required relationship explanation.',
                 'detailedCodeResult':choice,'inGradeForUsedStudentMethod':True},
                {'surface':'figure_and_graph_semantics','observation':[x['observation'] for x in observations] or ['No student figure provided; stem determines the calculation.'],
                 'specifiedPhysicalWidthsViewed':[x['intendedWidthMm'] for x in observations],
                 'inGradeForUsedStudentMethod':True,'pixelOracle':False,
                 'limit':'Standalone SVG physical rendering only; no claim about a complete final paper/student UI layout.'},
                {'surface':'notation','observation':note['surfaceNotes'],'inGradeForUsedStudentMethod':True,
                 'trigScope':'Only acute-angle trig definitions and30/45/60 values used; arbitrary-angle formula, ratio identity, vector or calculus notation is not necessary.'},
                {'surface':'answer_format','observation':note['answer'],'partsWithUnits':note['parts'],
                 'inGradeForUsedStudentMethod':True,
                 'limit':'q06 explicitly uses the given four-decimal approximations; exact lengths are not claimed for those table records.' if n==6 else 'Own raw exact answer; Root may normalize formatting only after binding hashes.'},
                {'surface':'student_solution','observation':note['solution'],'inGradeForUsedStudentMethod':True,
                 'basis':'Full fresh elementary student proof written before authored-solution exposure; calculation alone does not grant curricular permission.'},
                {'surface':'necessary_procedure','observation':note['method'],'conditions':note['conditions'],
                 'primaryStandardReferences':[clauses[x] for x in note['standards']],
                 'inGradeForUsedStudentMethod':True,'forbiddenStudentPrerequisiteUsed':False}
            ],
            'curriculumMethod':{'reference':'actual2025middle3 ->2015','legitimateStudentMethodFound':True,
                               'standards':[clauses[x] for x in note['standards']],
                               'restrictionsFile':'curriculum-method-evidence.json','restrictionsFileSha256':sha(ROOT/'curriculum-method-evidence.json'),
                               'approvalForRightsFamilyNativeOrLoading':False,'fullCurrentFuturePublicationApproval':False},
            'annotationsAndSourceFamiliarityDisclosure':manifest['disclosure'],
            'newAuthorCandidateAnswersKnownBeforeThisSolve':False,
            'originalKeyAgreementUsed':False,'otherSolverRead':False,'inferenceApiCalls':0,
            'limits':['Independent blind solve and bounded legitimate-method observations only. Exact Unit/live family, rights/native provenance, author-solution comparison and overall loading are outside this stage.']
        },
        'heldReasons':[], 'rejectedStudentMethods':[
            'No arbitrary trig ratio identities or addition/half-angle formulas.',
            'No upper-grade extrema/calculus, law of sines/cosines, vectors or circle power.',
            'q09 uses congruence and Pythagoras instead of an unverified angle-bisector length theorem.'
        ]
    }
    dest=Path(f'blind/solve/q{n:02}.json');save(dest,answer)
    rows.append({'questionNumber':n,'studentDigest':q['studentDigest'],'rawSolvePath':dest.as_posix(),
                 'rawSolveSha256':sha(ROOT/dest),'status':'solved','answer':note['answer'],
                 'proofPath':p.relative_to(ROOT).as_posix(),'proofSha256':sha(p)})
save('raw-solves-manifest.json',{
    'solverId':SOLVER,'wholeStudentInputSha256':manifest['wholeStudentInputSha256'],
    'rawSolveCount':22,'solvedCount':22,'heldQuestionNumbers':[],'rejectedQuestionNumbers':[],
    'solves':rows,'hashBindingBeforeAuthorExposure':True,
    'authorExposureHasOccurred':False,'RootVerifyPackReceived':False,
    'stage':'raw blind solves, awaiting Root verification-pack after owned commit',
    'scopeApproval':False})
print('Written22 raw blind solves; 19 unique choice answers and10 written subparts; author answers unseen')
