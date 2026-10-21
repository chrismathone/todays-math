"""Seal the executed asset-editor checkpoint after preserving current main."""
from pathlib import Path
import copy
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
OUT = Path(__file__).resolve().parent
ENGINE = OUT.parent / 'engine-all-sync-20261021-r1'
HANGUL = OUT.parent / 'hangul-engine-import-20261021-r1'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind = lambda p: dict(path=str(p).replace('\\', '/'), sha256=sha(p))
old, new = B / 'engine-upgrades-progress-r56.json', B / 'engine-upgrades-progress-r57.json'
assert not new.exists()
d = copy.deepcopy(json.loads(old.read_text(encoding='utf-8')))
assert sha(d['canonicalIndex']['path']) == d['canonicalIndex']['sha256']

tests = HANGUL / 'assets-editor-after-main-r1-tests.json'
execution = OUT / 'assets-editor-after-main-r1-execution.json'
t = json.loads(tests.read_text(encoding='utf-8'))
e = json.loads(execution.read_text(encoding='utf-8'))
assert t['numPassedTests'] == 175 and t['numFailedTests'] == 0
assert len(t['testResults']) == 11 and e['exitcode'] == 0 and e['sourcesUnchanged']
for p, digest in e['sourceSHA256'].items():
    assert sha(p) == digest, p
ind = B / 'figure-assets-editor-current-audit-20261021-r1/own-executed-report.json'
i = json.loads(ind.read_text(encoding='utf-8'))
assert i['counts']['passed'] == 88 and i['counts']['failed'] == 0
for p, digest in json.loads((ind.parent / 'own-execution-r1/own-final-after.json').read_text(encoding='utf-8')).items():
    assert sha(p) == digest, p
six = ENGINE / 'check-after-main-r1.json'
s = json.loads(six.read_text(encoding='utf-8'))
assert s['exitcode'] == 0 and s['originalCheckerInvoked'] and s['sourceCheckerAndExpectedUnchanged']
browser = OUT / 'browser/browser-results-r4.json'
assert all(r['passed'] for r in json.loads(browser.read_text(encoding='utf-8'))['results'])
roots = json.loads((OUT / 'typescript-root-files.json').read_text(encoding='utf-8'))
paths = list(dict.fromkeys([r['path'] for r in d['code']] + roots + [
    'src/lib/figure/asset-editor-geometry.json', 'scripts/figure/build_asset_editor_registry.py']))
code = [bind(p) for p in paths]
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
main = subprocess.check_output(['git', 'rev-parse', 'origin/main'], text=True).strip()
subprocess.run(['git', 'merge-base', '--is-ancestor', main, head], check=True)
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
v = dict(utc=now, head=head, main=main, code=code,
         currentMainRelatedPassed=175, currentMainRelatedFailed=0,
         actualTestFiles=11, freshTests=bind(tests), freshExecution=bind(execution),
         ownerSixRawByteContract=bind(six), sixExactOutputs=6,
         independentDirectDOMControls=88, independent=bind(ind),
         independentNotAddedToParentTests=True, priorBrowserViewportRuns=4,
         existingQuestionOrDBWrites=0, preservedMainAndOtherAuthorChanges=True)
validation = OUT / 'push-validation-r1.json'
assert not validation.exists()
validation.write_bytes((json.dumps(v, indent=2) + '\n').encode('utf-8'))

d.update(kind='exam-engine-upgrades-progress/v57', version=57, createdAt=now,
         previous=bind(old), code=code,
         report='docs/planning/tracks/reports/exam-engine-assets-editor-20261021.md')
d['assetsEditorIntegration'] = dict(
    status='IMPLEMENTED_BOUNDED_EDITOR_AND_NATIVE_CONTROLS_PASS',
    source=bind(OUT / 'baseline.json'), registeredStockGeometry=39,
    pictureAllowlist=23, geometryIdentityNotRightsOrProvenance=True,
    sourceDigestKind='sha256-utf8-lf', frame='registered-viewBox-four-corners-not-ink-or-math',
    badOrForgedMarkerOnlyDemoted=True, strictTransformAndAncestorChecks=True,
    assetsBodyStrippingImported=False, preserveOtherGeometryAndIds=True,
    promptAndBothMathJaxUnitPathsConnected=True,
    unsafeIssueFilterOrFinalReviewSkipImported=False,
    currentMainRelatedTestFiles=11, currentMainRelatedTests=175,
    independentDirectDOMControls=88, independent=bind(ind),
    browser=bind(browser), priorActualBrowserViewports=4,
    typesRootFiles=12, types=bind(OUT / 'types-next-ambient-r4.json'),
    eslintRootFiles=12, eslint=bind(OUT / 'eslint-r4.json'),
    priorType384MiBHeapFailureAndHarnessFailuresPreserved=True,
    latestMain=main, validation=bind(validation),
    fullQuestionGradeRightsOrOperationalApproval=False,
    existingQuestionChanges=0, authoredOrBlindQuestionCredits=0, dbWrites=0)
d['figureEngineAllSync']['srcAssetEditorAndPromptIntegrationNotYetClaimed'] = False
d['figureEngineAllSync']['srcIntegrationCheckpoint'] = 'assetsEditorIntegration'
d['latestMainIntegration'] = dict(main=main, headAtCheck=head,
    tests=bind(tests), passed=175, failed=0, actualFiles=11,
    incomingDelta='11 SRS commits preserved; no engine/editor source overlap',
    sixOwnerRequestedOutputsStillByteIdentical=True)
d['currentMainRuntimeValidation'] = v
d['items'].append(dict(id='U71', area='Verified stock-geometry editor actions and shared picture capability prompt',
    status='implemented-bounded-native-DOM-UI-tests-pass-not-provenance-or-question-approval',
    evidence='assetsEditorIntegration', existingQuestionOrDBWrites=0))
d['nextAuthorizedWork'] = dict(
    instruction='M28 strict serialized arc precision; bounded grid-measure advisory support; continue remaining engine cards',
    sourceRepositoryReadOnly=True, existingBankQuestionChanges=False,
    noAutoSnap=True, noUncertaintyToPass=True, finalFigureReviewRetained=True,
    strictGradeAndCurriculumGateBeforeAnyQuestionApproval=True,
    operationalDBOrDeploymentAuthorized=False)
assert not d['wholeEngineComplete'] and d['dbWrites'] == 0 and d['operationalLoads'] == 0
new.write_bytes((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
index = B / 'continuation-index.json'
raw = index.read_bytes()
prior = json.loads(raw)['latestEngineCheckpoint']
for a, z in [(prior['utc'], now), (prior['progress'], str(new).replace('\\', '/')), (prior['sha256'], sha(new))]:
    assert raw.count(a.encode()) == 1
    raw = raw.replace(a.encode(), z.encode(), 1)
index.write_bytes(raw)
print(json.dumps(dict(progress=str(new), boundFiles=len(code), tests=175, independent=88,
                      exactRawOutputs=6, latestMain=main, dbWrites=0)))
