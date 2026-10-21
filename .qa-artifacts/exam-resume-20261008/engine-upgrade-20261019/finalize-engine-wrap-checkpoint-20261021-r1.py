"""Bind fresh main checks and preserve the stale-shared-dependency control."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B=Path('.qa-artifacts/exam-resume-20261008');E=B/'engine-upgrade-20261019'
def ref(path):
    p=Path(path);return dict(path=p.as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest())
def git(*args):return subprocess.check_output(['git',*args],text=True,encoding='utf-8').strip()
tp=E/'engine-wrap-locked-katex-20261021-r2.json';t=json.loads(tp.read_text(encoding='utf-8'))
assert t['success'] and t['numFailedTests']==0 and t['numPassedTests']==48
negative=E/'engine-wrap-main-20261021-r1.json';n=json.loads(negative.read_text(encoding='utf-8'))
assert n['numPassedTests']==47 and n['numFailedTests']==1
before=json.loads((E/'parity-diagnostic-before-20261021-r1.json').read_text(encoding='utf-8'))
assert ref(before['source']['path'])==before['source']
assert ref(before['golden']['path'])==before['golden']
old=B/'engine-upgrades-progress-r47.json';out=B/'engine-upgrades-progress-r48.json'
vpath=E/'engine-wrap-validation-20261021-r2.json';assert not out.exists() and not vpath.exists()
x=json.loads(old.read_text(encoding='utf-8'))
for r in x['code']:assert ref(r['path'])==r
now=datetime.datetime.now(datetime.timezone.utc).isoformat();head=git('rev-parse','HEAD')
main='314bdb0e9cc7b7c72a69cbe5b3daf1a94e811856'
subprocess.run(['git','merge-base','--is-ancestor',main,head],check=True)
assert head=='2d969c07ccde5a143f479802cef2cfd7b16f1c4c'
runtime=dict(testedMain=main,headAtExecution=head,tests=ref(tp),files=len(t['testResults']),passed=48,failed=0,
    actualChromeWrappingPassed=True,originalGoldenFixtureChanged=False,
    staleSharedDependencyControl=ref(negative),staleControlPassed=47,staleControlFailed=1,
    sharedKatex='0.16.47',lockPinnedKatex='0.18.2',isolatedDependency=ref(E/'locked-katex-receipt-20261021-r1.json'),
    pinnedJavascriptAndCssFontsUsed=True,onlyTestHarnessCssResolverOverlaid=True,
    sharedNodeModulesChanges=0,wholeProjectBuildOrTypecheck=False)
x.update(kind='exam-engine-upgrades-progress/v48',version=48,createdAt=now,previous=ref(old),
    currentMainRuntimeValidation=runtime,latestMainIntegration=dict(main=main,head=head,sourceConflictFiles=0,
        preserved='Main word-wrapping and SRS handoff docs/harness; no incoming engine path edits',checks=runtime),
    checkpointDelta='U65/U66 unchanged115source hashes; latestmain6files48pass including actualChrome+originalgolden with isolatedlockpinnedKaTeX0.18.2. Sharedold0.16.47 corpus-only mismatch preserved; no golden/dependency writes.',
    nextAuthorizedWork=dict(instruction='After this checkpoint, review/import exam Koreanization package into todays-math with fit filtering.',
        entrypoint='D:/시험지 한글화/docs/export/todays-math/README.md',sourceRepositoryReadOnly=True,
        preserveAheadFigureScene=True,operationalDBOrDeploymentAuthorized=False),
    wholeEngineComplete=False,wholeExtractionComplete=False,operationalLoads=0,dbWrites=0,deployed=False)
x['validations']['latestMainWrapAndEngine']=runtime
out.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
v=dict(utc=now,head=head,main=main,target=git('rev-parse','origin/chrismathone/exam-extraction-resume-20261008'),
    currentMainRelatedPassed=48,currentMainRelatedFailed=0,tests=ref(tp),code=x['code'],progress=ref(out),
    runtimeEnvironment=runtime,wholeEngineComplete=False,dbWrites=0,deployed=False)
vpath.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
ip=B/'continuation-index.json';raw=ip.read_bytes();a=json.loads(raw);previous=a['latestEngineCheckpoint'];updated={**previous,'utc':now,'progress':out.as_posix(),'sha256':ref(out)['sha256']}
needle=json.dumps(previous,ensure_ascii=False,indent=2).replace('\n','\n  ').encode();replacement=json.dumps(updated,ensure_ascii=False,indent=2).replace('\n','\n  ').encode();assert raw.count(needle)==1;ip.write_bytes(raw.replace(needle,replacement,1))
report=Path('docs/planning/tracks/reports/exam-engine-polygon-outline-20261021.md')
extra='\n최신 main `314bdb0e9`(한글 어절 줄바꿈과 SRS 인계 자료 포함)을 보존·통합한 뒤 엔진·API·원래 렌더 해시·실제 Chrome 줄바꿈 **6파일·48검사**를 통과했다. 공유 설치 KaTeX 0.16.47에서는 corpus 해시 하나가 달랐으나, 잠금 파일의 0.18.2를 무결성 검증 후 별도 테스트 의존성으로 사용하자 원래 기준이 모두 일치했다. JavaScript와 CSS·폰트를 함께 분리했으며 공유 node_modules·기준 fixture는 변경하지 않았다. 이전 989검사와 이 재실행을 합산하지 않는다.\n'
report.write_bytes(report.read_bytes()+extra.encode('utf-8'))
print(json.dumps(dict(main=main,currentChecksPassed=48,codeFiles=len(x['code']),sharedModuleChanges=0)))
