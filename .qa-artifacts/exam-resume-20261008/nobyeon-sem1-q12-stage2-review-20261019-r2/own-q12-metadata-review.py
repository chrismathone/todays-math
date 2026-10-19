from pathlib import Path
from fractions import Fraction as F
import json,hashlib
b=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q12-stage2-review-20261019-r2');r1=b.parent/'nobyeon-sem1-q12-stage2-review-20261019-r1'
def sha(x):return hashlib.sha256(x).hexdigest()
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def digest(x):return sha(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode())
names=['verification-inputs.json','verification-manifest.json','VERIFY-BRIEF.md','sealed-raw-commit.json','source-q12-only.json','official-locators-reference.json','metadata-correction-receipt-r2.json']
hashes={n:sha((b/n).read_bytes()) for n in names}
v=load(b/'verification-inputs.json')[0];man=load(b/'verification-manifest.json');seal=load(b/'sealed-raw-commit.json');receipt=load(b/'metadata-correction-receipt-r2.json');source=load(b/'source-q12-only.json')
assert hashes['verification-inputs.json']==man['verificationInputsSha256']
rawpath=b.parent/'nobyeon-sem1-q12-clean-blind-20261019-r1/solve/q12.json';raw=load(rawpath);old=load(r1/'reports/q12.json');oldcalc=load(r1/'own-q12-calculations.json')
bindings={str(p):sha(p.read_bytes()) for p in [rawpath,r1/'reports/q12.json',r1/'own-q12-calculations.json']}
assert sha(rawpath.read_bytes())==seal['proofs'][0]['sha256']==man['originalSolveFileHashes'][0]['sha256']==old['evidence']['rawSha256']
assert raw==v['independentSolve'] and digest(raw)==v['solveDigest']==old['solveDigest']
assert v['studentDigest']==old['studentDigest']==raw['studentDigest'] and v['assetDigest']==old['assetDigest']==digest(v['assets'])
assert v['candidateDigest']!=old['candidateDigest'] and v['candidate']['metadata']['metadataRevision']['previous']['candidateDigest']==old['candidateDigest']
c=v['candidate'];meta=c['metadata']
# Prior authored text retained from the earlier authorized r1 read in this session.
# No old verification-inputs or original candidate file is reopened under this scope.
previousObserved=dict(twinExternalId='exam-twin-nobyeon-2025-1-mid-author-group6-r1-q12',questionNumber=12,grade='중3',curriculum='2015',questionType='객관식',score=4,content=r'두 수 $u=\dfrac1{\sqrt5-1}$, $v=\dfrac1{\sqrt5+1}$에 대하여'+'\n\n'+r'$u^{3}v-uv^{3}+t(u+v)=\dfrac{13\sqrt5}{16}$'+'\n\n'+'이 성립할 때, 실수 $t$의 값은?',choices=[r'$-\dfrac12$','$0$',r'$\dfrac12$','$1$',r'$\dfrac32$'],answer='⑤',solution=r'분모를 유리화하면 $u=\dfrac{\sqrt5+1}{4}$, $v=\dfrac{\sqrt5-1}{4}$이다. 따라서 $u+v=\dfrac{\sqrt5}{2}$, $u-v=\dfrac12$, $uv=\dfrac14$이다.'+'\n\n'+r'공통인수 $uv$로 묶고 합과 차의 곱을 이용하면 $u^{3}v-uv^{3}=uv(u^{2}-v^{2})=uv(u-v)(u+v)$이다. 그 값은 $\dfrac14\times\dfrac12\times\dfrac{\sqrt5}{2}=\dfrac{\sqrt5}{16}$이다.'+'\n\n'+r'이를 주어진 등식에 대입하면 $\dfrac{\sqrt5}{16}+t\dfrac{\sqrt5}{2}=\dfrac{13\sqrt5}{16}$이다. $\sqrt5\ne0$이므로 양변에 $\dfrac{16}{\sqrt5}$를 곱하면 $1+8t=13$이다. 따라서 $t=\dfrac32$이다.'+'\n\n'+r'실제로 $t=\dfrac32$일 때 좌변은 $\dfrac{\sqrt5}{16}+\dfrac32\times\dfrac{\sqrt5}{2}=\dfrac{13\sqrt5}{16}$이다. $u+v=\dfrac{\sqrt5}{2}$가 $0$이 아니므로 $t$의 값은 하나뿐이다. 두 분모도 $\sqrt5>1$에 따라 $0$이 아니어서 처음 정의된 두 수는 모두 실수이다.',figureArtifacts=[])
comparison=[]
for field,before in previousObserved.items():
 current=meta[field] if field in ['grade'] else (meta['curriculum']['target'] if field=='curriculum' else c[field])
 assert current==before,field
 comparison.append(dict(field=field,exactEqual=True,previousObservedSha256=digest(before),currentSha256=digest(current)))
assert c['answer']==raw['answer']
assert source['question']['difficultyLabelFromSource']==meta['sourceDifficultyLabelObserved']=='하'
assert meta['difficultyProposal'] is None and meta['difficultyStatus']=='held-source-difficulty-calibration-required'
assert '하/4점' in c['variantDelta']['difficultyBasis'] and '동일 난도 승인' in c['variantDelta']['difficultyBasis']
assert meta['metadataRevision']['existingMathAndGradeEvidenceIsNotDifficultyApproval'] is True
factor=[u for u in meta['prerequisiteUnits'] if u['id']=='068bcc39-0927-4f43-a919-24b61ca425f9'];assert len(factor)==1 and factor[0]['section']=='인수분해' and factor[0]['grade']=='중3'
assert any(u['id']=='99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1' for u in meta['prerequisiteUnits'])
placement=meta['placementConditions'];expected=['근호 분모의 유리화','다항식의 곱셈 공식','공통인수로 묶기','제곱의 차 인수분해','수치 일차방정식']
assert placement['requiresLearnedBeforeAssignment']==expected
assert placement['sourceExamYear']==2025 and placement['practiceAcademicYear']==2026 and placement['curriculumEdition']=='2015' and placement['grade']=='중3'
assert placement['schoolMidtermPacingCertified'] is False and placement['m3From2027']=='pending-separate-2022-grade-placement-review'
assert meta['assignment']['familyKey'] is None
for key in ['sourceIdentityApproved','rightsApproved','similarityApproved','nativeProvenanceApproved','loadable']:assert meta[key] is False
# Narrow arithmetic recheck of unchanged equation/choices; not a new independent proof.
lhs=[F(1,16)+F(t,2) for t in [F(-1,2),F(0),F(1,2),F(1),F(3,2)]]
assert lhs==[F(-3,16),F(1,16),F(5,16),F(9,16),F(13,16)]
assert [r['lhs']['sqrt5Coefficient'] for r in oldcalc['choices']]==[str(x) for x in lhs]
assert oldcalc['t']['rational']=='3/2' and sum(x==F(13,16) for x in lhs)==1
standalone_candidate_sha=sha((json.dumps(c,ensure_ascii=False,indent=2)+'\n').encode())
audit=dict(reviewKind='metadata-only-r2',freshBlind=False,newQuestion=False,countIncrement=0,inputHashes=hashes,allowedPriorEvidence=bindings,previousCandidateDigest=old['candidateDigest'],currentCandidateDigest=v['candidateDigest'],studentAssetSolveDigestsUnchanged=True,exactPriorObservedFieldComparisons=comparison,comparisonBoundary='Prior authored strings/fields are frozen from earlier authorized session read; old r1 verification-inputs and original standalone candidates were not reopened. Raw/r1report/r1calcs are directly hash-bound; complete original candidate file raw-byte diff is not claimed.',currentCandidateReconstructedUtf8Sha256=standalone_candidate_sha,receiptCurrentStandaloneSha256=receipt['current']['sha256'],reconstructedStandaloneMatchesReceipt=standalone_candidate_sha==receipt['current']['sha256'],difficultyCorrection=dict(observedSource='하',priorFalseDescription='중',currentSourceDescription='하/4점',difficultyProposal=None,status=meta['difficultyStatus'],sameDifficultyApproved=False),factorizationPrerequisite=factor[0],placementConditions=placement,exactArithmeticLhsSqrt5Coefficients=[str(x) for x in lhs],newMathApproval=False,newGradeApproval=False)
checks={key:key!='unitFamilyFit' for key in old['checks']}
surfaces=dict(stem='passed',choices='passed',figuresAndTables='passed',notation='passed',answer='passed',studentSolution='passed',prerequisites='passed')
evidence=dict(metadataAudit='own-q12-metadata-audit.json',reviewScope='메타데이터 수정만 새로 검토. 학생 텍스트·보기·답·현재 저자 해설은 앞서 허용된 r1 읽기에서 보존한 완전 문자열과 정확히 같고 raw/계산은 직접 해시 비교했다. 새 blind나 새 문항/통과 수로 세지 않는다.',answerCorrect='같은 ⑤이며 보존된 raw 및 r1 계산과 일치한다. 좁은 재계산에서도 √5계수13/16이 되는 t는3/2 하나이다.',solutionCorrect='현재 저자 해설의 완전 UTF-8 문자열이 이전 관찰과 동일하다. 유리화→합·차·곱→uv(u-v)(u+v)→1+8t=13→대입 및 비영계수 유일성 경로가 그대로다.',existenceUniqueness='변하지 않은 u+v=√5/2>0가 t의 비영계수이고 두 원분모는√5>1로 비영이다. t=3/2 대입 확인을 보존한다.',choicesCorrect=dict(lhsSqrt5Coefficients=[str(x) for x in lhs],onlySelectedMark='⑤'),figureConsistent='현재 figureArtifacts=[] 및 assets=[]이고 이전 관찰/assetDigest와 동일하다.',sameCoreConceptAndProcedure='학생 과제와 해설을 변경하지 않아 r1의 유리화·합차곱·공통인수 계산 경로가 유지된다. 이 r2는 새 변형을 추가하지 않는다.',distinctPresentation='원문 고정 결과 직접계산에서 합의 계수t 역복원으로 바꾼 기존 변형 그대로이다. 메타 수정은 추가 문항이나 추가 차별성으로 계산하지 않는다.',naturalKorean='기존 학생 본문·해설은 완전 문자열 동일. 수정된 메타 설명은 실제 source 하/4점을 사용하고, 목표 난도를 확인 전 보류한다는 의미를 명확히 한다.',curriculumAppropriate='2015 중3에서 근호 유리화·곱셈공식·공통인수·제곱의차·수치 일차방정식을 모두 학습한 이후라는 기존 조건을 현 placementConditions의 다섯 항목이 명시한다. 이전 r1의 실제 1차자료 검토 결과를 동일 과제에 연결하며 새 학년 승인을 더하지 않는다.',allStudentSurfacesInScope='학생 여섯 표면은 불변이고 prerequisites는 실제 근호Unit 유지 및 인수분해Unit068bcc39 추가와 다섯 선행학습조건으로 명시 보완됐다. 7개 모두2015조건부 범위 안이며2022는pending이다.',unitFamilyFit='false/pending 유지. familyKey=null이고 정확한 live family 의미·목표·domain 호환성 근거를 새로 확보하지 않았다.',scoreAppropriate='불변인4점에 대한 r1 편집 판단만 유지한다. 이것은 difficultyProposal=null을 승인된 난도로 대체하거나 source 하와 동일한 난도를 보장하지 않는다. 동일 난도/실측 보정/목표 난도 분류는 별도 보류한다.',curriculumSurfaceEvidence=dict(stem='이전 관찰과 본문이 정확히 동일하다.',choices='다섯 보기와 순서가 정확히 동일하다.',figuresAndTables='assetDigest와 빈 자산이 동일하다.',notation='기존 근호/분수/지수/문자가 동일하다.',answer='⑤ 및 studentDigest가 불변이다.',studentSolution='저자 해설의 전체 UTF-8 문자열 동일성을 대조했다.',prerequisites='근호유리화Unit99ca...와 인수분해Unit068b...를 확인하고 모든 다섯 learned-before-assignment조건을 검사했다.'),rawSha256=sha(rawpath.read_bytes()),parentRawCommit=seal['rawCommit'],priorReportSha256=bindings[str(r1/'reports/q12.json')],priorReportCommit='83413114be1ec3694d73b00eff02eda02fc4a698',pendingReasons=['목표 난도 분류 및 source와 동일 난도 확인 보류','정확한 live family 미확정','2022중3 배치 별도 검토'],noFreshBlindClaim=True,noCountIncrement=True)
report=dict(status='pending',studentDigest=v['studentDigest'],candidateDigest=v['candidateDigest'],assetDigest=v['assetDigest'],method='independent-solve-then-review',verifierId='codex-q12-metadata-only-r2-20261019',solveDigest=v['solveDigest'],checks=checks,evidence=evidence,curriculumSurfaces=surfaces,reviewKind='metadata-only-r2',freshBlind=False,newQuestion=False,countIncrement=0,mathApproved=True,gradeApproved2015M3=True,approvalBasis='불변 과제의 기존 봉인 수학/조건부학년 근거를 현candidateDigest에 새로 연결; 새통과수 아님',targetDifficultyApproved=False,sameDifficultyApproved=False,year2022M3='pending-separate-placement-review',liveFamily=False,unitFamilyFit=False,sourceIdentityApproved=False,rightsApproved=False,similarityApproved=False,nativeProvenanceApproved=False,loadable=False)
assert len(checks)==12 and sum(checks.values())==11 and len(surfaces)==7
(b/'reports').mkdir(exist_ok=True)
for path,obj in [(b/'reports/q12.json',report),(b/'own-q12-metadata-audit.json',audit),(b/'own-q12-input-hashes.json',hashes)]:
 with path.open('x',encoding='utf-8',newline='\n') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
for n,h in hashes.items():assert sha((b/n).read_bytes())==h
for p,h in bindings.items():assert sha(Path(p).read_bytes())==h
print('ReportSHA256',sha((b/'reports/q12.json').read_bytes()))
print('Exactfields:',len(comparison),'checks11/12,surfaces7;noquestion/countincrement;difficulty/familyheld.')
