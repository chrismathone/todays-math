"""Bound final-report consistency and frozen/prior bytes; no DB/API/private rereads outside scope."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,sys
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text('utf8'))
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf8')).hexdigest()
name=sys.argv[1] if len(sys.argv)>1 else 'validation-before-commit.json';assert name in ['validation-before-commit.json','validation-after-integration.json']
assert not (OUT/name).exists()
baseline=load(OUT/'preservation-baseline.json')
for r in baseline['files']:assert sha(r['path'])==r['sha256'],r['path']
for r in baseline['protectedInputFiles']:assert sha(OUT/r['path'])==r['sha256'],r['path']
counts={}
for c in baseline['requiredPriorGitCommits']:
 files=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',c],cwd=OWN,text=True).splitlines();counts[c]=len(files)
 for f in files:assert hashlib.sha256(subprocess.check_output(['git','show',c+':'+f],cwd=OWN)).hexdigest()==sha(OWN/f),(c,f)
report=load(OUT/'reports/q22.json');bind=load(OUT/'binding-validation.json');candidate=load(OUT/'inputs/package/private/q22/candidate.json');raw=load(OUT/'inputs/blind/solve/q22.json')
student=load(OUT/'inputs/blind/student-problems.json')[0];spec=OUT/'inputs/package/private/q22/figure-1.spec.json';svg=OUT/'inputs/package/private/q22/figure-1.svg'
assets=[{'role':'stem','specSha256':sha(spec),'svgSha256':sha(svg),'intendedWidthMm':70}]
assert digest(assets)==report['assetDigest'];assert digest({'candidate':candidate,'assetBindings':assets})==report['candidateDigest']
assert digest({k:v for k,v in student.items() if k!='studentDigest'})==report['studentDigest'];assert digest(raw)==report['solveDigest']
for k in ['candidateDigest','studentDigest','assetDigest','solveDigest']:assert report[k]==bind[k]
assert report['method']=='independent-solve-then-review' and report['verifierId']==raw['solverId']!=candidate['authorId']
assert report['status']=='pending' and sum(report['checks'].values())==11 and len(report['checks'])==12
assert report['checks']['unitFamilyFit'] is False
surfaces=report['curriculumSurfaces'];assert set(surfaces)=={'stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'}
assert all(s['status']=='passed' and s['basis'] and s['officialProvisions'] for s in surfaces.values())
for k in report['checks']:assert report['checkEvidence'][k]
assert report['dimensionResults']['mathematics']=='passed' and report['dimensionResults']['sevenSurfaceGrade']=='passed'
assert report['rightsApproved']==report['custodyApproved']==report['nativeProvenanceApproved']==report['overallVerified']==report['loadable']==False
for k in ['bindingValidation','freshAnswerEquivalenceAndMath','freshReviewCode','officialCurriculum','visualAndSourceCore','strictEngine','expandedRender','taxonomy','sourceQuestionOnly']:
 r=report['evidence'][k];assert sha(OUT/r['path'])==r['sha256'],k
math=load(OUT/'answer-equivalence-and-math.json');assert math['sameMarkAndExactRequestedValue'] and not math['literalRawAnswerAndAuthoredAnswerEqual']
assert len(math['allFiveActualExpressions'])==5;assert sum(r['equalForEveryLegalAngle'] for r in math['allFiveActualExpressions'])==1
assert math['codeSha256']==sha(OUT/'review_calculations.py')
engine=load(OUT/'strict-engine-check.json');assert engine['rerenderByteIdentical'] and engine['strict'] and engine['typeset'] and not engine['droppedDimensions']
assert engine['suppliedSvgSha256']==engine['rerenderedSvgSha256']==sha(svg)==sha(OUT/'qa/q22-strict-rerender.svg')
view=load(OUT/'visual-review.json');assert view['pixelsUsedToInferMathematicalValues']==False
for k in ['sourceCrop','expandedStudentSolution','studentOnly','strictRerenderView']:
 r=view[k];assert sha(OUT/r['path'])==r['sha256']
curr=load(OUT/'curriculum-evidence.json');assert len(curr['provisions'])==11 and all(r['wholeClausePDFMatch'] for r in curr['provisions'])
tax=load(OUT/'taxonomy-evidence.json');assert tax['unitFamilyFit']==False and tax['familyKeyAssigned'] is None and tax['snapshot']['isCurrentDatabase']==False
scopeFiles=[p for p in OUT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and 'no-hooks' not in p.parts]
receipt={'utc':datetime.now(timezone.utc).isoformat(),'ownedHEAD':subprocess.check_output(['git','rev-parse','HEAD'],cwd=OWN,text=True).strip(),
 'reportSha256':sha(OUT/'reports/q22.json'),'rawSolveSHA256':sha(OUT/'inputs/blind/solve/q22.json'),
 'priorOwnFilesUnchanged':len(baseline['files']),'frozenInputHashesMatched':len(baseline['protectedInputFiles']),
 'priorGitBlobCountsUnchanged':counts,'scopeFilesValidatedBeforeReceipt':len(scopeFiles),
 'mathematicsPassed':1,'allChoicesChecked':5,'wholeLegalDomainProof':True,'gradeSurfacesPassed':7,
 'sourceCorePassed':1,'checksPassed':11,'checksPending':['unitFamilyFit'],'status':'pending',
 'rawAnswerMeaningEquivalentButLiteralTextDifferent':True,'rawUneditedAfterExposure':True,
 'rightsCustodyNativeLoadingApprovals':0,'databaseCalls':0,'inferencePaidApiCalls':0,'frozenCandidateOrStudentWrites':0}
(OUT/name).write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(receipt,ensure_ascii=False))
