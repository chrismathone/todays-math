"""Bind the already implemented U64 to a fresh main test, keeping old ledgers."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

ROOT = Path.cwd()
B = Path('.qa-artifacts/exam-resume-20261008')
E = B / 'engine-upgrade-20261019'
def ref(p):
    p = Path(p)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())
def git(*args):
    return subprocess.check_output(['git', *args], text=True, encoding='utf-8').strip()
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
tests = E / 'u64-current-main-20261021-r1.json'
t = json.loads(tests.read_text(encoding='utf-8'))
assert t['success'] and t['numFailedTests'] == 0 and t['numPassedTests'] > 0
report_path = Path('docs/planning/tracks/reports/exam-engine-draft-ownership-checkpoint-20261021.md')
assert not report_path.exists()
old_path = B / 'engine-upgrades-progress-r43.json'
new_path = B / 'engine-upgrades-progress-r44.json'
validation_path = E / 'u64-current-main-validation-20261021-r1.json'
assert not new_path.exists() and not validation_path.exists()
old = json.loads(old_path.read_text(encoding='utf-8'))
new = json.loads(old_path.read_text(encoding='utf-8'))
head, main = git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main')
subprocess.run(['git', 'merge-base', '--is-ancestor', main, head], check=True)
code = [ref(p['path']) for p in old['code']]
for path in ['src/lib/examStudy/draftSnapshot.ts', 'src/__tests__/unit/examStudyDraftSnapshots.test.ts']:
    assert path not in {r['path'] for r in code}
    code.append(ref(path))
u64code = [ref(p) for p in ['src/lib/examStudy/draftSnapshot.ts', 'src/lib/examStudy/generate.ts',
    'src/lib/examStudy/registry.ts', 'src/contracts/examStudy.contract.ts',
    'src/__tests__/unit/examStudyDraftSnapshots.test.ts']]
independent = ref(B / 'render-boundary-postchange-audit-20261020-r2/own-report.json')
assert independent['sha256'] == '8b025d30fc3a399a0e07856aca0b21eb5c27ce405c2217e01d383792ec5202d6'
new.update(kind='exam-engine-upgrades-progress/v44', version=44, createdAt=now,
    previous=ref(old_path), report='docs/planning/tracks/reports/exam-engine-draft-ownership-checkpoint-20261021.md', code=code,
    checkpointDelta='U64 immutable detached draft ownership; fresh current-main bounded engine runtime recheck. M38 mathematical candidates remain separate/unapplied; no new authored questions or release approvals.',
    latestMainIntegration=dict(head=head, main=main, sourceConflictFiles=0,
        postIntegrationTests=ref(tests), passed=t['numPassedTests'], failed=0,
        actualFiles=len(t['testResults'])),
    currentMainRuntimeValidation=dict(tests=ref(tests), passed=t['numPassedTests'], failed=0,
        actualFiles=len(t['testResults']), prior2255CountIsHistorical=True,
        wholeProjectBuildOrTypecheck=False),
    pendingM38=dict(findings=['M8','M9','M19','M20'], status='separate-candidate-static-reviewed-not-applied',
        proposal=ref(E / 'm38-candidate-code-20261021-r3/proposal.json'),
        independent=ref(B / 'm38-proposal-review-20261021-r3/own-report.json'),
        staticAssertions=442, actualSeedReplayPending=True, productionMathChanged=False),
    wholeEngineComplete=False, wholeExtractionComplete=False, dbWrites=0,
    operationalLoads=0, deployed=False, automaticContinuationControllerChanged=False)
new['items'].append(dict(id='U64', area='Immutable verified draft and detached render/caller ownership',
    status='implemented-parent-and-independent-bounded-passed-release-held', code=u64code,
    currentMainTests=ref(tests), independent=independent,
    independentCommit='c23a46bb53be919bdbfebb7fcde669f6ed00a23f', independentScenarios=68, independentAssertions=121,
    policy='20261020-detached-immutable-drafts-r2', previousOrderFailurePreserved=True,
    publicReleaseOrGradeOrRightsApproval=False, issuedQuestionsOrDBChanged=0))
new['validations']['currentMainU64'] = new['currentMainRuntimeValidation']
report_path.write_text(f'''# 엔진 데이터 소유권 수정의 최신 main 검증 (2026-10-21)

U64는 검산한 draft와 렌더 콜백·호출자의 데이터를 별도 사본으로 분리한다. [구현과 최초 실패 기록](exam-engine-draft-ownership-20261020.md)을 보존하고, 최신 main `{main[:9]}`을 충돌 없이 통합한 `{head[:9]}`에서 관련 **{len(t['testResults'])}파일·{t['numPassedTests']}검사**를 다시 통과했다. API·기존 family·학년 관문·실제 strict Python 도형 경로를 포함한다. 프로젝트 전체 빌드·타입검사나 전체 은행 검수 결과는 아니다.

독립 R2 검토는 68개 한정 사례·121검사이며, 해당 5개 구현 파일의 현재 바이트와 연결한다. 과거 R1의 키 순서 결함과 실패 8개, 제한된 선행 통과 기록은 그대로 남긴다. 이전 main에서 통과한 422·30검사를 최신 main의 새 결과에 합산하지 않는다. 원장 r43의 과거 2,255검사는 이 main에서 전부 다시 실행했다는 뜻이 아니다.

다른 세션의 [M1~M38 인계](../brief-engine-handoff-display-20261021.md)를 받았다. 먼저 M8·M9·M19의 불가능한 삼각형/내접원 조건과 M20의 밑·지수 문자 충돌을 수정하는 별도 사본을 만들었고, 독립 Python 정적 검사 442개가 통과했다. 이 체크포인트에서는 **수학 생성 코드에 아직 적용하지 않았고**, 실제 생성 API 재현·회귀검사를 이어간다. 정적 조합 분석을 씨앗별 출력이나 학년 승인으로 세지 않는다. TeX escape를 잘못 줄인 준비본 r2도 실패로 보존하고, 실제 바이트를 확인한 r3를 검토 대상으로 삼았다.

[역할 분담](../brief-exam-engine-ownership-20261020.md)에 따라 기존 출제 문항·은행·학생 기록·다른 세션의 지면/서술형 검수 묶음을 수정하지 않는다. 실제 작성178/정본선택174/수학·학년173/최종·적재 가능0은 과거 정본 v50의 집계로 유지한다. 새 집필·그림·blind 승인·DB 쓰기·배포는0이다. 이 체크포인트가 학년·권리·출처·native 승인이나 전체 엔진 업그레이드의 완료를 뜻하지 않는다.
''', encoding='utf-8')
new_path.write_text(json.dumps(new, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
validation = dict(utc=now, head=head, main=main, target=git('rev-parse','origin/chrismathone/exam-extraction-resume-20261008'),
    currentMainRelatedPassed=t['numPassedTests'], currentMainRelatedFailed=0,
    actualTestFiles=len(t['testResults']), tests=ref(tests), code=code,
    progress=ref(new_path), DBOrIssuedQuestionWrites=0, wholeEngineComplete=False)
validation_path.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(dict(progress=str(new_path), codeFiles=len(code), currentMainPassed=t['numPassedTests'], currentMainFiles=len(t['testResults']), main=main)))
