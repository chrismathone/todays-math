"""Seal bounded Pythagoras/solid results without changing question counts."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
E = B / 'engine-upgrade-20261019'
OUT = Path(__file__).resolve().parent
H = E / 'hangul-engine-import-20261021-r1'
S = E / 'solid-candidate-parent-review-20261021-r1'
def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))
def ref(path):
    path = Path(path)
    return dict(path=path.as_posix(), sha256=hashlib.sha256(path.read_bytes()).hexdigest())
def write(path, obj):
    Path(path).write_bytes((json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

old, new = B / 'engine-upgrades-progress-r51.json', B / 'engine-upgrades-progress-r52.json'
assert not new.exists()
p = read(old)
red, green, native = (read(H / (name + '-tests.json')) for name in ['pytha-red', 'pytha-green', 'pytha-native'])
assert red['numPassedTests'] == 2 and red['numFailedTests'] == 2
assert green['numPassedTests'] == 122 and green['numFailedTests'] == 0 and green['success']
assert native['numPassedTests'] == 20 and native['numFailedTests'] == 0 and native['success']
types = read(OUT / 'types.json')
assert types['rootErrors'] == 0 and not types['globalDiagnostics'] and not types['projectConfigurationDiagnostics']
assert all(ref(r['path'])['sha256'] == r['sha256'] for r in types['rootFiles'])
lint = read(OUT / 'eslint.json')
assert len(lint) == 3 and all(r['errorCount'] == r['warningCount'] == 0 for r in lint)
independent_path = B / 'm2-pytha-current-api-audit-20261021-r1/own-report.json'
independent = read(independent_path)
assert independent['actualAPICalls'] == 80 and independent['distinctPrintedTasks'] == 20
assert not independent['findings'] and independent['sourceBeforeAfterUnchanged']
for path, sha in independent['sourceSHA256'].items():
    assert ref(path)['sha256'] == sha
solid = read(B / 'solid-verification-candidate-20261021-r2/own-report.json')
assert ref('vendor/figure-engine/core/figure_solid.py')['sha256'] == solid['candidateSHA256']
assert read(S / 'green.json')['returncode'] == 0
assert read(S / 'source-checks.json')['run'] == 32 and read(S / 'source-checks.json')['failures'] == 0
assert read(S / 'red.json')['returncode'] != 0
paths = list(dict.fromkeys([r['path'] for r in p['code']] + ['src/lib/middle/m2Pytha.ts',
    'src/lib/examStudy/adapters.ts', 'src/__tests__/unit/middleM2PythaGivenFigure.test.ts',
    'vendor/figure-engine/core/figure_solid.py', 'scripts/figure/test_solid_verification.py']))
code = [ref(path) for path in paths]
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
head, main = git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main')
subprocess.run(['git', 'merge-base', '--is-ancestor', main, head], check=True)
v = dict(utc=now, head=head, main=main, currentMainRelatedPassed=122, currentMainRelatedFailed=0,
    code=code, parentRelated=ref(H / 'pytha-green-tests.json'), parentFiles=4,
    red=ref(H / 'pytha-red-tests.json'), native=ref(H / 'pytha-native-tests.json'), nativeCases=20,
    scopedTypes=ref(OUT / 'types.json'), eslint=ref(OUT / 'eslint.json'),
    independent=ref(independent_path), independentApiCalls=80, independentDistinctTasks=20,
    solidCandidate=ref(B / 'solid-verification-candidate-20261021-r2/own-report.json'),
    parentSolid=ref(S / 'green.json'), parentSolidCases=6, parentSolidExisting=ref(S / 'source-checks.json'),
    parentSolidExistingCases=32, gradeRightsNativeOrReleaseApproval=False, dbWrites=0)
write(OUT / 'checkpoint-validation.json', v)
pytha = dict(id='U68', area='M2 Pythagoras10 given-only dimensions;09 shared helper preserved',
    status='implemented-bounded-answer-vector-native-pass-grade-review-held',
    code=[ref(path) for path in paths if path in ['src/lib/middle/m2Pytha.ts', 'src/lib/examStudy/adapters.ts',
                                               'src/__tests__/unit/middleM2PythaGivenFigure.test.ts']],
    validation=ref(OUT / 'checkpoint-validation.json'), independent=ref(independent_path),
    actualIndependentOutputs=80, distinctIndependentPrintedTasks=20, nativeTechnicalPreviews=20,
    newAuthoredOrBlindQuestionCount=0, existingQuestionOrDBWrites=0, officialGradeRightsOrLoadableApproval=False)
solid_item = dict(id='U69', area='Finite/nondegenerate solid evidence, retry invalidation and one-shot conditions',
    status='implemented-bounded-parent-and-prewritten-regression-pass',
    code=[ref('vendor/figure-engine/core/figure_solid.py'), ref('scripts/figure/test_solid_verification.py')],
    candidateReport=ref(B / 'solid-verification-candidate-20261021-r2/own-report.json'),
    rejectedR1=ref(S / 'generator-counterexample.json'), parent=ref(S / 'green.json'),
    parentExisting=ref(S / 'source-checks.json'), iterableScenarioCount=28,
    completeGeometryOrSVGOrGradeRightsApproval=False, existingQuestionOrDBWrites=0)
p.update(kind='exam-engine-upgrades-progress/v52', version=52, createdAt=now, previous=ref(old), code=code,
    report='docs/planning/tracks/reports/exam-engine-pytha-solid-20261021.md',
    checkpointDelta='U68 given-only labels and family10 revision; U69 rejects invalid/stale/consumed solid evidence. Related122/native20/scopedtypes3; independent80calls/20distinct and separate solid cohorts. Existing questions and counts unchanged.',
    currentMainRuntimeValidation=v, wholeEngineComplete=False, wholeExtractionComplete=False,
    pendingM38=dict(historyPreviousProgress=ref(old), scopedCodeFixes=['M2','M8','M9','M19','M20','M31'],
        activeNext=['M28'], otherOriginalCardsRemainOpen=True, wholeM38Complete=False),
    dbWrites=0, operationalLoads=0, deployed=False)
p['items'].extend([pytha, solid_item])
p['validations']['U68U69Bounded'] = v
write(new, p)
index = B / 'continuation-index.json'
raw = index.read_bytes()
a = json.loads(raw)['latestEngineCheckpoint']
z = {**a, 'utc': now, 'progress': new.as_posix(), 'sha256': ref(new)['sha256']}
needle = json.dumps(a, ensure_ascii=False, indent=2).replace('\n', '\n  ').encode('utf-8')
replacement = json.dumps(z, ensure_ascii=False, indent=2).replace('\n', '\n  ').encode('utf-8')
assert raw.count(needle) == 1
index.write_bytes(raw.replace(needle, replacement, 1))
write(OUT / 'visual-observation.json', dict(utc=now, contact=ref(OUT / 'contact.png'),
    inspectedTechnicalPNGs=8, sourceNativeSVGs=20, pixelMathOracle=False,
    observations=['Only the stated two side lengths are shown; no derived CA on10',
        'A/B/C/D and both right marks remain visible in selected samples',
        'D below the hypotenuse dimension still needs full sheet/content review; no layout or student approval'],
    authoredOrApprovedQuestionAssets=0))
print(json.dumps(dict(progress=str(new), codeFiles=len(code), relatedPass=122, nativePass=20,
                      independentCalls=80, distinctTasks=20, DBWrites=0)))
