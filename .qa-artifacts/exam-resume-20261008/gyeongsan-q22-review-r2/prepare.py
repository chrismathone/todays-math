"""Owned input receipts and a raster view of the supplied student SVG only."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2];BLIND=OUT/'blind'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(name,value):
    p=OUT/name;assert p.resolve().is_relative_to(OUT);assert not p.exists()
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
student=BLIND/'student-problems.json';manifest=BLIND/'blind-manifest.json';brief=BLIND/'SOLVE-BRIEF.md'
data=json.loads(student.read_text('utf8'));m=json.loads(manifest.read_text('utf8'))
assert len(data)==1 and data[0]['questionNumber']==22
assert data[0]['twinExternalId']=='exam-twin-gyeongsan-2025-2-mid-author-r2-q22'
assert sha(student)==m['studentProblemsSha256'];assert len(m['figures'])==1
fig=BLIND/m['figures'][0]['path'];assert sha(fig)==m['figures'][0]['sha256']==data[0]['figures'][0]['sha256']
allowed={'twinExternalId','questionNumber','grade','curriculum','questionType','score','content','choices','figures','studentDigest'}
assert set(data[0])==allowed;assert len(data[0]['choices'])==5
save('access-disclosure.json',{'recordedAtUtc':datetime.now(timezone.utc).isoformat(),
 'candidateId':data[0]['twinExternalId'],'studentDigest':data[0]['studentDigest'],
 'priorQ22R2AuthorAnswerAccess':False,'priorQ22R2PrivateFactsAccess':False,'priorNewHelperTestTargetAccess':False,
 'firstUserFacingDisclosure':'Before opening this blind input, stated no known prior access to this candidate answer/private facts/new helper target.',
 'priorOtherExamAccess':'Earlier Gyeonggu q22 was reviewed only after its committed blind solve; earlier Gyeongsang authored scope was q1-9/q16-21, not this Gyeongsan r2 q22. Those separate histories are retained.',
 'basis':'Current retained conversation and actual tool/file-read history; no memory-erasure claim.',
 'exposureDisposition':'unexposed-for-this-r2-studentDigest','freshBlindSolvePermittedByObservedAccess':True,
 'newAuthorAnswersPrivateFactsRepairedFilesOrHelperTargetsRead':False,
 'readBoundary':'Only supplied blind student JSON/manifest/brief/figure, current instructions/skill; no source or original answer input.',
 'originalKeyAgreementAsApproval':False})
save('input-receipt.json',{'copiedByRootAlready':True,'inputFiles':[{'path':p.relative_to(OUT).as_posix(),'sha256':sha(p)} for p in [student,manifest,brief,fig]],
 'studentDigest':data[0]['studentDigest'],'packageDigestProvidedNotApproval':m['packageDigest'],
 'noPrivateAnswerOrFactsFieldsInStudentPayload':True,'answersInInput':False})
prior=[]
for p in (OWN/'.qa-artifacts/exam-resume-20261008').rglob('*'):
    if p.is_file() and not p.is_relative_to(OUT) and '__pycache__' not in p.parts and 'no-hooks' not in p.parts:
        prior.append({'path':p.as_posix(),'sha256':sha(p)})
save('preservation-baseline.json',{'ownPriorFiles':sorted(prior,key=lambda x:x['path']),
 'requiredPriorAuthoredCommit':'f6f59325cd636859e28d47972395dbeec3b03868',
 'requiredPriorRawAndReviewCommits':['c02838323307f69648124f837285503a53e99bd3','9b4828c3ff843b16947b0d6925e408f0aaa7f6e7'],
 'originalsRootSharedMainAndOtherSessionsNotTouched':True})
ad6=OWN.parent/'exam-extraction-resume-20261008/docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-6.md'
save('instruction-receipt.json',{'currentAgents':{'path':'D:/todays-math/AGENTS.md','sha256':sha('D:/todays-math/AGENTS.md')},
 'parentAddendum6':{'path':ad6.as_posix(),'sha256':sha(ad6)},
 'typesafeSkill':{'path':(OWN/'.agents/skills/typesafe-ai/SKILL.md').as_posix(),'sha256':sha(OWN/'.agents/skills/typesafe-ai/SKILL.md')},
 'liveTypeSafeDocsPreviouslyReadThisSession':['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/confidence','https://docs.typesafe.ai/cookbooks/citation_check'],
 'noNewIntegrationOrInferenceApi':True,'deterministicCalculationsInCode':True,
 'checkpointPushAuthorizedOnOwnedBranchOnly':True,'mainPushOrForcePushAuthorized':False,'databaseReadOrWriteAuthorized':False})
print(json.dumps({'blindInputsBound':4,'priorOwnFilesPreservedBaseline':len(prior),'renderedStudentFigure':False,'exposed':False}))
