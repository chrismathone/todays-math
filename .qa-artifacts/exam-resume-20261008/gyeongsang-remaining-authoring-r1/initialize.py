"""Owned authoring scope. Source inputs are only Root's safe question packet."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,shutil,subprocess,sys
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2];PARENT=OWN.parent/'exam-extraction-resume-20261008'
QA=Path('.qa-artifacts/exam-resume-20261008');NUMBERS=list(range(1,10))+list(range(16,22))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def ref(p):return {'path':Path(p).as_posix(),'sha256':sha(p)}
def save(name,d):
    p=OUT/name;assert p.resolve().is_relative_to(OUT)
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
packet=PARENT/QA/'next-five-extraction-r1/gyeongsang/packet/questions.json'
assert sha(packet)=='776e8ea50867b00bb1f670f0cd03505b9766aee226e018a7f86af55e2da1627b'
data=load(packet);assert len(data['questions'])==22 and data['originalCorrectChoiceAndSolutionWithheld'] is True
selected=[q for q in data['questions'] if q['number'] in NUMBERS];assert len(selected)==15
save('source-question-only/selected15.json',{'packet':ref(packet),'sourceCommit':'4cc9278da',
    'sourceOnly':True,'originalCorrectChoiceAndSolutionWithheld':True,
    'internalMetadata':{k:data[k] for k in ['examId','inventoryExamId','school','identityDecision','sourceFiles']},
    'questions':selected})
copies={}
for q in selected:
    for item in q['images']:
        p=packet.parent/item['file'];assert sha(p)==item['sha256']
        dest=OUT/'source-question-only'/item['file'];dest.parent.mkdir(parents=True,exist_ok=True)
        if not dest.exists():shutil.copyfile(p,dest)
        assert sha(dest)==item['sha256'];copies[item['file']]={'original':ref(p),'copy':ref(dest),'questionOnly':True}
save('source-input-receipt.json',{'packet':ref(packet),'selectedNumbers':NUMBERS,'questionOnlyCopies':list(copies.values()),
    'allSelectedSourceQuestionCropsDirectlyViewed':True,'noSourceManifestEvidenceAnswerInputsRead':True,
    'sourceSourceApprovalByAuthor':False,'providedIdentityDecision':data['identityDecision'],
    'sourceScoreSumSelected':sum(q['scoreEvidence']['originalPrintedParentScore'] for q in selected),
    'excludedOwnershipNumbers':[10,11,12,13,14,15,22]})
prior=OWN/QA/'gyeonggu-final-review-r1'
save('curriculum-author-basis.json',load(prior/'curriculum-surface-basis.json'))
bank=PARENT/QA/'bank-read-fresh-r2-20261008.json';registry=PARENT/QA/'registry-read-20261008.json'
b=load(bank);r=load(registry);assert len(b['units'])==22 and len(b['liveFamilies'])==302
save('dated-taxonomy-input.json',{'bank':ref(bank),'registry':ref(registry),'bankCapturedAt':b['capturedAt'],
    'registryCapturedAt':r.get('capturedAt'),'units':b['units'],'liveFamilies':b['liveFamilies'],'registryEntries':r['entries'],
    'historicalCaptureOnly':True,'authorDbRead':False,'notCurrentDBCertification':True})
protected=[]
for p in (OWN/QA).rglob('*'):
    if p.is_file() and not p.resolve().is_relative_to(OUT):protected.append(ref(p))
save('preservation-baseline.json',{'ownPriorFiles':protected,'prior2111ExternalAndOwnEvidenceBaseline':ref(prior/'preservation-baseline.json'),
    'oldExternal2111LastConfirmed':ref(prior/'validation.json'),'raw123AndGg52Commits':['c02838323307f69648124f837285503a53e99bd3','9b4828c3ff843b16947b0d6925e408f0aaa7f6e7'],
    'existingTrackedStatus':subprocess.check_output(['git','status','--porcelain'],cwd=OWN).decode(),
    'authorScopeWritesAreRestrictedTo':OUT.as_posix(),'rootMainSourcesSharedDependenciesNotWritten':True})
save('runtime-probe.json',{'utc':datetime.now(timezone.utc).isoformat(),'commandExecution':True,'fileWrite':True,
    'worktree':OWN.as_posix(),'ownedOutput':OUT.as_posix()})
assert load(OUT/'runtime-probe.json')['fileWrite']
save('instruction-receipt.json',{'mainAgents':ref(Path('D:/todays-math/AGENTS.md')),
   'parentBrief':ref(PARENT/'docs/planning/tracks/brief-exam-extraction-resume-20261008.md'),
   'parentAddenda':[ref(PARENT/f'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-{i}.md') for i in range(1,6)],
   'typesafeSkill':ref(OWN/'.agents/skills/typesafe-ai/SKILL.md'),'liveDocsRead':['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/confidence','https://docs.typesafe.ai/cookbooks/citation_check'],
   'mdUrlsUnavailableNormalUrlsRead':True,'date':'2026-10-08','inferenceApiCalls':0,
   'authorOnlyNotIndependentVerifier':True,'rightsApproved':0,'nativeProvenanceApproved':0,'loadable':0})
print(json.dumps({'selected':NUMBERS,'sourceScore':71,'sourcePacketMatched':True,'protectedOwnFiles':len(protected),'runtimeWriteReread':True}))
