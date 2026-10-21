"""Seal U65 broader checks and U66 current graph/native preview evidence."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
E = B / 'engine-upgrade-20261019'
def ref(path):
    p = Path(path)
    return dict(path=p.as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest())
old = B / 'engine-upgrades-progress-r46.json'
out = B / 'engine-upgrades-progress-r47.json'
assert not out.exists()
x = json.loads(old.read_text(encoding='utf-8'))
checks = []
for name, count in [('m38-related-20261021-r1.json',789),('m31-related-20261021-r1.json',200)]:
    p = E / name
    t = json.loads(p.read_text(encoding='utf-8'))
    assert t['success'] and t['numPassedTests'] == count and t['numFailedTests']==0
    checks.append(dict(report=ref(p),files=len(t['testResults']),passed=count,failed=0))
types = E / 'm38-m31-types-20261021-r2.json'
lint = E / 'm38-m31-eslint-20261021-r2.json'
assert json.loads(types.read_text(encoding='utf-8'))['rootErrors']==0
ls = json.loads(lint.read_text(encoding='utf-8'))
assert len(ls)==8 and sum(r['errorCount']+r['warningCount'] for r in ls)==0
independent = B / 'm31-outline-current-audit-20261021-r1/own-final-report.json'
assert ref(independent)['sha256']=='92cc216a43827ad69f71fdce4b2194f124d9835b46d26094bda7bcb3894719d9'
assert json.loads(independent.read_text(encoding='utf-8'))['allNodeEnded']
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
visual = E / 'm31-vector-visual-check-20261021-r1/human-observation.json'
assert not visual.exists()
visual.write_bytes((json.dumps(dict(utc=now,contact=ref(visual.with_name('contact.png')),
    sourceManifest=ref(visual.with_name('manifest.json')), viewedWith='view_image',
    figuresInspected=8, labelledVerticesDistinguishable=True, noVisibleClipping=True,
    noVisibleInternalDiagonals=True, pixelMathOracle=False, actualStudentPageOrPhysicalPrintReviewed=False,
    officialGradeRightsNativeOrReleaseApproval=False),indent=2)+'\n').encode('utf-8'))
paths = list(dict.fromkeys([r['path'] for r in x['code']] + ['src/lib/middle/m1Geo2.ts','src/__tests__/unit/middleM1PolygonQuestionFigure.test.ts']))
code = [ref(p) for p in paths]
finding = dict(id='U66',area='M31 outline-only polygon prompt with inverse branch kept figureless',
    status='implemented-parent-independent-graph-native-svg-bounded-passed-release-held',
    code=[ref(p) for p in ['src/lib/middle/m1Geo2.ts','src/lib/examStudy/adapters.ts','src/__tests__/unit/middleM1PolygonQuestionFigure.test.ts']],
    parentTests=checks[1],independent=ref(independent), independentCommit='dca0b3b038ec27ffc011b2488504f5239a8fe7cb',
    actualApiSeeds=100, forcedInputCases=16, independentGraphAssertions=383,
    nativeSvgPreviews=8, independentSvgAssertions=58, visualObservation=ref(visual),
    existingNumericalStemAnswerOrSolutionChanged=False, manualQuestionOrFigureOrBlindCountsIncremented=False,
    gradeRightsSourceNativeOrPublicReleaseApproved=False, DBWrites=0)
x['items'][-1].update(status='implemented-parent-and-independent-bounded-passed-release-held',
    broaderChecks=checks[0],types=ref(types),lint=ref(lint),widerChecksExecuted=True,
    independentMathSourceUnchanged=True,
    independentMetadataBindingHistoricalAfterSeparateM31Revision=True,
    allGradeRightsNativePublicReleaseHeld=True)
x['items'].append(finding)
x.update(kind='exam-engine-upgrades-progress/v47',version=47,createdAt=now,previous=ref(old),
    report='docs/planning/tracks/reports/exam-engine-polygon-outline-20261021.md',code=code,
    checkpointDelta='U65 broader9files789pass; U66 outline graph2files200pass, independent116outputs383checks/8SVG58checks and human vector preview. TS8roots0/lint8files0. Latest incoming CSS main integration still pending.',
    currentMainRuntimeValidation=dict(testedMain='400d379f56820f83cd31566fff816d75f11cfe37',
        runs=checks,typedRoots=8,types=ref(types),lint=ref(lint),
        latestFetchedMain=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip(),
        latestFetchedMainIntegrationAndRecheckPending=True,wholeProjectBuildOrTypecheck=False),
    pendingM38=dict(findings=['M8','M9','M19','M20'],status='bounded-regression-and-independent-math-passed-release-held',
        tests=checks[0],independentMathSourceUnchanged=True,allApprovalsHeld=True),
    newEngineNativeSvgPreviews=8,newManualNativeAssetApprovals=0,
    upcomingWork=['Preserve/integrate latest incoming math-text wrapping main; run related engine and new Chrome wrapping regressions before feature push.',
        'M2 Pythagoras given-only labels prepared separately; independent review/runtime/native render pending.',
        'Continue remaining M1..M38 engine cards and grade/metadata/image support; no existing issued/bank question mutations.'],
    wholeEngineComplete=False,wholeExtractionComplete=False,operationalLoads=0,dbWrites=0,deployed=False)
x['validations']['U65BroaderRegression']=checks[0]
x['validations']['U66']=finding
out.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
ip=B/'continuation-index.json';raw=ip.read_bytes();a=json.loads(raw);before=a['latestEngineCheckpoint'];after={**before,'utc':now,'progress':out.as_posix(),'sha256':ref(out)['sha256']}
needle=json.dumps(before,ensure_ascii=False,indent=2).replace('\n','\n  ').encode();replacement=json.dumps(after,ensure_ascii=False,indent=2).replace('\n','\n  ').encode();assert raw.count(needle)==1;ip.write_bytes(raw.replace(needle,replacement,1))
print(json.dumps(dict(codeFiles=len(code),parentTests=989,independentGraphChecks=383,SVGChecks=58,pendingMainIntegration=True)))
