"""Bind a current passing run, independent controls and separate export versions."""
from pathlib import Path
import copy
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
OUT = Path(__file__).resolve().parent
H = OUT.parent / 'hangul-engine-import-20261021-r1'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
bind = lambda p: dict(path=str(p).replace('\\', '/'), sha256=sha(p))
old, new = B / 'engine-upgrades-progress-r57.json', B / 'engine-upgrades-progress-r58.json'
assert not new.exists()
d = copy.deepcopy(json.loads(old.read_text(encoding='utf-8')))
assert sha(d['canonicalIndex']['path']) == d['canonicalIndex']['sha256']
tests, execution = H / 'grid-advisory-r7-tests.json', OUT / 'grid-advisory-r7-execution.json'
t = json.loads(tests.read_text(encoding='utf-8'))
e = json.loads(execution.read_text(encoding='utf-8'))
assert t['success'] and t['numPassedTests'] == 151 and t['numFailedTests'] == 0
assert len(t['testResults']) == 10 and e['exitcode'] == 0 and e['sourcesUnchanged']
for p, digest in e['sourceSHA256'].items():
    assert sha(p) == digest, p
ind = B / 'grid-advisory-current-audit-20261021-r1/own-execution-r1/own-report.json'
i = json.loads(ind.read_text(encoding='utf-8'))
assert i['passed'] == 42 and i['failed'] == 0 and i['NodeEnded']
for p, digest in json.loads((ind.parent / 'own-after.json').read_text(encoding='utf-8')).items():
    assert sha(p) == digest, p
types = OUT / 'types-grid-r3.json'
assert json.loads(types.read_text(encoding='utf-8'))['rootErrors'] == 0
lint = OUT / 'eslint-grid-r2.json'
assert sum(r['errorCount'] + r['warningCount'] for r in json.loads(lint.read_text(encoding='utf-8'))) == 0
browser = OUT / 'actual-browser-results-r3.json'
br = json.loads(browser.read_text(encoding='utf-8'))
assert len(br['records']) == 4 and br['launches'] == 1 and not br['externalRequests']
assert all(r['noSourceMutation'] and all(f['ticksFit'] and f['legendDoesNotCoverIndices']
    for f in r['state']['frames']) for r in br['records'])
six = OUT / 'captured-six-r1.json'
assert json.loads(six.read_text(encoding='utf-8'))['matches'] == 6
roots = json.loads((OUT / 'typescript-root-files.json').read_text(encoding='utf-8'))
code = [bind(p) for p in dict.fromkeys([r['path'] for r in d['code']] + roots)]
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
main = subprocess.check_output(['git', 'rev-parse', 'origin/main'], text=True).strip()
subprocess.run(['git', 'merge-base', '--is-ancestor', main, head], check=True)
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
v = dict(utc=now, head=head, main=main, code=code, actualTestFiles=10,
    currentMainRelatedPassed=151, currentMainRelatedFailed=0,
    freshExecution=bind(execution), tests=bind(tests), independent=bind(ind),
    independent42NotAddedToParent151=True, browser=bind(browser),
    typeRoots=5, types=bind(types), lintRoots=5, lint=bind(lint),
    capturedPatch06SixByteMatches=6, capturedSix=bind(six),
    newLiveExportDrift=bind(OUT / 'live-export-timeline-r1.json'),
    liveNewestExportEqualityClaim=False, existingQuestionOrDBWrites=0)
validation = OUT / 'push-validation-r1.json'
assert not validation.exists()
validation.write_bytes((json.dumps(v, indent=2) + '\n').encode('utf-8'))
d.update(kind='exam-engine-upgrades-progress/v58', version=58, createdAt=now,
    previous=bind(old), code=code,
    report='docs/planning/tracks/reports/exam-engine-grid-advisory-20261021.md')
d['gridAdvisory'] = dict(status='IMPLEMENTED_BOUNDED_COMPARISON_ONLY_CONTROLS_PASS',
    newSourceOrQuestionMutation=False, newAuthoredOrIndependentQuestionCredits=0,
    pixelMathOrApprovalOracle=False, snapImported=False, sourceLabelsOrSpecMutation=False,
    countsMismatchRemainsVisible=True, unknownRemainsUnknown=True,
    finalSourceAndRenderedReviewRetained=True, timeoutCannotApprove=True,
    inputMaxSide=1400, inputMaxPixels=2000000, canvasMaxSide=900,
    existingBrowserAndPageReused=True, decodedResourceUniversalityClaim=False,
    tests=bind(tests), actualTestFiles=10, parentTests=151,
    independent=bind(ind), independentDirectControls=42,
    actualBrowser=bind(browser), uniqueTechnicalBrowserCases=4,
    types=bind(types), lint=bind(lint), existingQuestionGradeRightsOrOperationalApproval=False,
    currentValidation=bind(validation), dbWrites=0)
d['pendingM38']['strictSerializedArcAudit'] = bind(B / 'm28-strict-precision-audit-20261021-r1/own-report.json')
d['pendingM38']['precisionOnlyStillInsufficient'] = True
d['pendingM38']['inwardTrimCandidateProductionApplied'] = False
d['figureEngineAllSync']['outputContract'] = 'captured patch06 80ea37d0792aa1879abc443781eaaba5e673bf838eb13f99ce1a90e733311644'
d['figureEngineAllSync']['currentLiveEqualityClaim'] = False
d['figureEngineAllSync']['laterSourceAssets41PendingSeparateImport'] = True
d['sourceExportEvolution'] = dict(timeline=bind(OUT / 'live-export-timeline-r1.json'),
    capture=bind(OUT / 'live-export-drift-r1.json'), currentRootStocks=39,
    observedNewSourceStocks=41, precedingSixCaseLiveMatches=5,
    precedingSixCaseLiveMismatches=1, laterCheckerAndPatch07Uncommitted=True,
    sourceRepositoryWrites=0, originalExpectedFilesReplaced=False,
    sourceImagegenDoesNotEstablishRightsOrMath=True)
d['latestMainIntegration'] = dict(main=main, headAtCheck=head, tests=bind(tests),
    passed=151, failed=0, actualFiles=10, incomingDelta='No newer remote main at checkpoint fetch')
d['currentMainRuntimeValidation'] = v
d['items'].append(dict(id='U72', area='Bounded advisory grid measurement and peripheral comparison indices',
    status='implemented-bounded-no-snap-no-auto-approval', evidence='gridAdvisory',
    existingQuestionOrDBWrites=0))
d['nextAuthorizedWork'] = dict(
    instruction='Import verified new SourceD assets41/engine handoff as a separate version; preserve legacy SVG identity/frame compatibility; continue M28 strict and remaining engine cards',
    sourceRepositoryReadOnly=True, currentVersionImportNotYetClaimed=True,
    existingBankQuestionChanges=False, noAutoSnap=True, noUncertaintyToPass=True,
    finalFigureReviewRetained=True, strictGradeAndCurriculumGateBeforeQuestionApproval=True,
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
print(json.dumps(dict(progress=str(new), boundFiles=len(code), tests=151, independent=42,
    capturedV1ByteMatches=6, latestLiveEquality=False, pendingStocks=41, dbWrites=0)))
