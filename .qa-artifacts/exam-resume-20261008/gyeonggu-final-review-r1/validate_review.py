"""Required scoped reports/digest/preservation checks; no operational side effects."""
from pathlib import Path
import datetime,hashlib,json,subprocess,sys
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def save(name,data):(OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
baseline=load(OUT/'preservation-baseline.json');results=[];mismatch=[]
for kind in ['old2111','rawBlind123']:
    for row in baseline[kind]:
        p=Path(row['path']);actual=sha(p) if p.is_file() else None
        if actual!=row['sha256']:mismatch.append({'path':row['path'],'expected':row['sha256'],'actual':actual,'group':kind})
    results.append({'group':kind,'files':len(baseline[kind]),'byteIdentical':not any(x['group']==kind for x in mismatch)})
assert not mismatch,mismatch
bindings=load(OUT/'input-bindings.json');given={x['questionNumber']:x['providedDigests'] for x in bindings['bindings']}
expected=set(range(1,20))|{21,22,23}
paths=sorted((OUT/'reports').glob('q*.json'));assert len(paths)==22
surfacekeys={'stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'}
checkkeys={'answerCorrect','solutionCorrect','existenceUniqueness','choicesCorrect','figureConsistent','sameCoreConceptAndProcedure',
           'distinctPresentation','naturalKorean','curriculumAppropriate','allStudentSurfacesInScope','unitFamilyFit','scoreAppropriate'}
seen=set()
for p in paths:
    r=load(p);n=r['questionNumber'];seen.add(n)
    assert r['method']=='independent-solve-then-review' and r['verifierId']=='orca-codex-exam-twin-source-identity-20261008'
    assert {k:r[k] for k in given[n]}==given[n]
    assert set(r['checks'])==checkkeys and all(type(x) is bool for x in r['checks'].values())
    assert set(r['curriculumSurfaces'])==surfacekeys and all(x['status']=='passed' for x in r['curriculumSurfaces'].values())
    assert r['checks']['unitFamilyFit']==(n==18)
    assert r['status']==('verified' if n==18 else 'pending')
    assert all(r['checks'][k] for k in checkkeys-{'unitFamilyFit'})
    assert all(k in r['evidence'] for k in checkkeys)
    assert r['loadApproved'] is False and r['dbReads']==r['dbWrites']==r['inferenceApiCalls']==0
    raw=r['frozenInputBinding']['rawBlindFile'];assert sha(raw['path'])==raw['sha256']
    assert r['answerEquivalence']['rawAnswerRewritten'] is False
    if n==13:assert r['evidence']['sameCoreConceptAndProcedure']['angleCorrection']['sha256']==sha(OUT/'q13-source-correction-review.json')
assert seen==expected
for name in ['answer-equivalence-evidence.json','figure-semantics-evidence.json']:
    evidence=load(OUT/name);assert sha(evidence['code']['path'])==evidence['code']['sha256']
source=bindings['finalSourcePacketQuestionOnly'];assert sha(source['path'])==source['sha256']
for name in ['verificationInputs','verificationManifest','authorFreeze','authorIndex','sourceJoin']:
    row=bindings[name];assert sha(row['path'])==row['sha256'],name
for b in bindings['bindings']:
    for name in ['rawBlindFile','rootCanonicalRawCopy','authorFrozenFile']:
        row=b[name];assert sha(row['path'])==row['sha256']
    for f in b['figures']:
        for kind in ['spec','svg']:
            row=f[kind];assert sha(row['path'])==row['sha256']
for row in load(OUT/'layout-view-manifest.json'):assert row['viewed'] and sha(row['path'])==row['sha256']
for row in load(OUT/'rule-evidence.json')['sourceFiles']:assert sha(row['path'])==row['sha256']
probe=OWN/'.qa-artifacts/exam-resume-20261008/gyeonggu-independent-r1/runtime-probe-resume-r2.json'
save('evidence/runtime-probe-resume-r2-final-check.json',{'original':{'path':probe.as_posix(),'sha256':sha(probe)},'reread':load(probe),
    'earlierProbeSnapshotPreserved':'evidence/runtime-probe-resume-r2.json','notPartOfImmutableBlind123':True})
save('validation.json',{'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'preservation':results,'mismatches':mismatch,
    'reports':22,'schemaAndFourDigestsValid':True,'curriculumSurfaceDecisions':154,
    'q13SourceCoreConfirmed':True,'allFrozenStudentCandidateSolveFigureBytesUnchanged':True,
    'scope':'New owned final-review files only; no original/main/Root/shareddeps/DB changes by reviewer.',
    'runtimeProbeUpdatedOnlyByExplicitUserRequest':True,'code':{'path':Path(__file__).as_posix(),'sha256':sha(__file__)}})
print(json.dumps({'preservation':results,'reports':22,'surfaceDecisions':154,'fourDigestsValid':True,'allFrozenBytesFixed':True}))
