"""Checks only raw solve integrity and preservation; no private answer input."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,sys
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text('utf8'))
receipt_name=sys.argv[1] if len(sys.argv)>1 else 'validation-before-commit.json'
assert receipt_name in ['validation-before-commit.json','validation-after-main-integration.json','validation-before-push-r2.json']
receipt=OUT/receipt_name;assert not receipt.exists()
rawhash=load(OUT/'raw-output-hashes.json')
for k in ['rawSolve','exactProof','freshCode','studentInput','studentFigure']:
    r=rawhash[k];assert sha(OUT/r['path'])==r['sha256'],k
inputs=load(OUT/'input-receipt.json')
for r in inputs['inputFiles']:assert sha(OUT/r['path'])==r['sha256']
student=load(OUT/'blind/student-problems.json')[0];payload={k:v for k,v in student.items() if k!='studentDigest'}
canonical=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':'))
assert hashlib.sha256(canonical.encode('utf8')).hexdigest()==student['studentDigest']
solve=load(OUT/'solve/q22.json');proof=load(OUT/'proofs/q22-exact-calculations.json')
assert solve['studentDigest']==proof['studentDigest']==student['studentDigest']
assert solve['status']=='solved';assert solve['solverId']=='orca-codex-exam-twin-source-identity-20261008'
assert solve['evidence']['chosenChoiceIndex1based']==4 and solve['answer'].startswith('④')
assert len(proof['allFiveActualChoices'])==5
assert [r['actualStudentExpression'] for r in proof['allFiveActualChoices']]==student['choices']
assert [r['index1based'] for r in proof['allFiveActualChoices'] if r['equalOnEntireLegalDomain']]==[4]
assert set(solve['evidence']['sevenStudentSurfaces'])=={'stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'}
disclosure=load(OUT/'access-disclosure.json');assert not disclosure['priorQ22R2AuthorAnswerAccess'] and not disclosure['priorQ22R2PrivateFactsAccess'] and not disclosure['priorNewHelperTestTargetAccess']
view=load(OUT/'figure-render-receipt.json');assert view['directViewImageCompleted'] and not view['actualViewImageInspectionPending']
assert abs(view['actualSvgWidthMm']-70)<.01;assert view['networkRequests']==[]
assert sha(OUT/view['png']['path'])==view['png']['sha256']
prior=load(OUT/'preservation-baseline.json');assert len(prior['ownPriorFiles'])==634
for r in prior['ownPriorFiles']:assert sha(r['path'])==r['sha256'],r['path']
commit_counts={}
for commit in prior['requiredPriorRawAndReviewCommits']+[prior['requiredPriorAuthoredCommit']]:
    files=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',commit],cwd=OWN,text=True).splitlines()
    for f in files:
        blob=subprocess.check_output(['git','show',commit+':'+f],cwd=OWN)
        assert hashlib.sha256(blob).hexdigest()==sha(OWN/f),(commit,f)
    commit_counts[commit]=len(files)
assert sorted(commit_counts.values())==[52,123,167]
branch=subprocess.check_output(['git','branch','--show-current'],cwd=OWN,text=True).strip()
assert branch=='chrismathone/exam-twin-source-identity-20261008'
r={'checkedAtUtc':datetime.now(timezone.utc).isoformat(),'stage':'blind raw solve validation before new answer exposure',
 'ownedBranch':branch,'ownedHeadAtValidation':subprocess.check_output(['git','rev-parse','HEAD'],cwd=OWN,text=True).strip(),
 'studentDigest':student['studentDigest'],'rawSolveSHA256':rawhash['rawSolve']['sha256'],'freshCodeSHA256':rawhash['freshCode']['sha256'],
 'inputHashesAndManifestChecked':4,'studentCanonicalDigestChecked':True,'figureActuallyViewedAt70mm':True,
 'allFiveExpressionsAndFullDomainBoundToFreshProof':True,'chosenChoice':4,'rawAnswerUnedited':True,
 'priorOwnFilesUnchanged':634,'priorGitBlobCountsUnchanged':commit_counts,
 'newAuthorAnswerPrivateFactsHelperTargetAccess':False,'originalAnswerApproval':False,
 'stageStatus':'solved','fullContentFamilyRightsNativeLoadingApproved':False,'databaseCalls':0,'inferenceOrPaidApiCalls':0}
receipt.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(r,ensure_ascii=False))
