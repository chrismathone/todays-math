"""Only supplied student JSON/SVGs and previously read official curriculum."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,datetime,shutil
R=Path(__file__).resolve().parent;REPO=R.parents[3]
assert not (R/'input-audit.json').exists(),'Do not restart/overwrite input audit'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(p,x):p.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
m=read(R/'blind-manifest.json');qs=read(R/'student-problems.json');assert sha(R/'student-problems.json')==m['studentProblemsSha256']
assert [q['questionNumber'] for q in qs]==list(range(1,10))+list(range(16,22))
assert len(m['figures'])==12
for f in m['figures']:assert sha(R/f['path'])==f['sha256'],f['path']
for q in qs:
 assert set(q)=={'twinExternalId','questionNumber','grade','curriculum','questionType','score','content','choices','figures','studentDigest'}
 assert q['grade']=='중3' and q['curriculum']=='2015'
 assert (len(q['choices'])==5)==(q['questionType']=='객관식')
 for f in q['figures']:assert sha(R/f['svgPath'])==f['sha256'] and f['intendedWidthMm']<=70
old=read(REPO/'.qa-artifacts/exam-resume-20261008/gyeongsan-final-review-r1/evidence/preservation.json')['files']
for p in (REPO/'.qa-artifacts/exam-resume-20261008/gyeongsan-final-review-r1').rglob('*'):
 if p.is_file():old.append({'path':p.relative_to(REPO).as_posix(),'sha256':sha(p)})
assert len(old)==917
for f in old:assert sha(REPO/f['path'])==f['sha256'],f['path']
put(R/'preservation.json',{'previousFiles':917,'allBytesUnchanged':True,'files':old})
curr=REPO/'.qa-artifacts/exam-resume-20261008/gyeongsan-independent-r1/blind/curriculum-scope-input.json'
shutil.copyfile(curr,R/'curriculum-scope-input.json');assert sha(curr)==sha(R/'curriculum-scope-input.json')
put(R/'input-audit.json',{'startedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'studentInputRawSha256':sha(R/'student-problems.json'),'manifestRawSha256':sha(R/'blind-manifest.json'),'briefRawSha256':sha(R/'SOLVE-BRIEF.md'),'opaquePackageDigest':m['packageDigest'],'providedStudentDigests':{str(q['questionNumber']):q['studentDigest'] for q in qs},'figures':m['figures'],'solverId':'orca-codex-exam-twin-author-geometry-20261008','freshNewGF15AnswerExposure':False,'newGF15AuthorCandidatesAnswersSolutionsChecksSourceEvidenceRead':False,'priorKnowledgeDisclosure':'Earlier stats core review included original answer-free Gyeongsang source concepts, and generic curriculum/rules were read in prior scopes. Those are separate from this newly authored GF15. No newGF15 candidate answer/solution/mathcheck has been exposed. All new numerical answers will be derived from these student-only files.','priorGS22DuplicateAndStat13MetadataSignFindingPreserved':True,'q18MaterialComplexityHoldFromUser':True,'q18CorrectMathWillNotClearHold':True,'officialCurriculumInputCopiedFromPreviouslyReadSafeEvidence':str(curr),'noFinalReviewBeforeRootExposure':True,'modelCalls':0,'dbAccess':0})
print('GF15 supplied shape/digests/12SVGs verified;no prior newGF15 answer exposure;917 priorfiles unchanged.')
