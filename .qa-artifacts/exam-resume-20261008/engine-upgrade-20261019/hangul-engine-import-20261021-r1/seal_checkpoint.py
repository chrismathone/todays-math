"""Bind current import code, resolved QA results and append-only progress."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
OUT = Path(__file__).resolve().parent

def ref(path):
    p = Path(path)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())

def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))

def write(path, obj):
    Path(path).write_bytes((json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

old, new = B / 'engine-upgrades-progress-r49.json', B / 'engine-upgrades-progress-r50.json'
assert not new.exists()
p = read(old)
baseline = read(OUT / 'baseline.json')
for row in baseline['sourceFiles']:
    assert ref(Path(baseline['sourceRoot']) / row['path'])['sha256'] == row['sha256']
for row in baseline['targetBefore']:
    if Path(row['path']).name in ['figure_scene.py', 'figure_solid.py', 'label_markup.py', 'render_spec.py']:
        assert ref(row['path'])['sha256'] == row['sha256']
python = read(OUT / 'python-checks-r3.json')
assert all(r['returncode'] == 0 for r in python['runs'])
assert [r['tests'] for r in python['runs']] == [29, 96, None]
hwpeq = read(OUT / 'hwpeq-parent-r1.json')
assert len(hwpeq) == 28 and all(r['passed'] for r in hwpeq)
node, dom = (read(OUT / n) for n in ['related-tests.json', 'hwpx-dom-tests.json'])
results = {}
for report in [node, dom]:
    for suite in report['testResults']:
        # it.each may reuse the same display title; retain every actual case.
        for i, test in enumerate(suite['assertionResults']):
            results[(Path(suite['name']).name, i, test['fullName'])] = test['status']
assert len(results) == 32 and all(s == 'passed' for s in results.values()), dict(
    total=len(results), failures=[k for k, s in results.items() if s != 'passed'],
    fileCounts=[[(Path(s['name']).name, len(s['assertionResults'])) for s in r['testResults']] for r in [node, dom]])
independent_path = B / 'figure-import-independent-20261021-r2/own-report.json'
independent = read(independent_path)
assert independent['passed'] == 43 and independent['failed'] == 0
for name, sha in independent['currentCoreSHA256'].items():
    assert ref(Path('vendor/figure-engine/core') / name)['sha256'] == sha

changed = ['vendor/figure-engine/core/' + n for n in
           ['figure_svg.py', 'figure_quality.py', 'figure_exam.py', 'figure_spec_repair.py']]
changed += ['vendor/hwpx/latex_to_hwpeq.py', 'scripts/figure/example_exam_tools.py',
            'scripts/figure/test_vendor_tools.py', 'src/__tests__/unit/vendoredFigureEngine.test.ts',
            'src/__tests__/unit/latex_to_hwpeq_regression_test.py']
code = [ref(path) for path in dict.fromkeys([r['path'] for r in p['code']] + changed)]
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
main, head = git('rev-parse', 'origin/main'), git('rev-parse', 'HEAD')
subprocess.run(['git', 'merge-base', '--is-ancestor', main, head], check=True)
validation = dict(utc=now, head=head, main=main, currentMainRelatedPassed=32, currentMainRelatedFailed=0,
                  resolvedRelatedFiles=6, originalNodePass=26, originalNodeFail=6,
                  failedOriginalCasesResolvedUnderJSDOM=True, testsOrProductExpectationsChangedForEnvironment=False,
                  node=ref(OUT / 'related-tests.json'), dom=ref(OUT / 'hwpx-dom-tests.json'),
                  python=ref(OUT / 'python-checks-r3.json'), ownPythonPassed=29, sourceCompatiblePassed=96,
                  hwpeq=ref(OUT / 'hwpeq-parent-r1.json'), hwpeqPassed=28,
                  independent=ref(independent_path), independentControlsPassed=43,
                  code=code, gradeRightsNativeOrReleaseApproval=False, dbWrites=0)
write(OUT / 'checkpoint-validation.json', validation)
finding = dict(id='U67', area='Vendored hangul figure/math import with fail-closed authoring boundaries',
               status='implemented-bounded-parent-and-independent-checks-pass', code=[ref(f) for f in changed],
               validation=ref(OUT / 'checkpoint-validation.json'), independent=ref(independent_path),
               liveRepairRouting=False, geometrySnapDefault=False, sourceExportUnchanged=True,
               retainedClearAngleLabels=True, exampleIsCalibrationOnly=True,
               originalCropOrCOMOrPaidModelFallbackImported=False,
               existingQuestionOrBankOrDBWrites=0, gradeRightsNativeOrReleaseApproval=False)
p.update(kind='exam-engine-upgrades-progress/v50', version=50, createdAt=now, previous=ref(old), code=code,
         report='docs/planning/tracks/reports/exam-engine-hangul-import-20261021.md',
         checkpointDelta='Import patch01/02 selectively; lint restored, offline tools and four formula fixes; independent FI1/FI2/FI3 repaired. Parent29/source96/formula28 and six related files32 pass; independent43. Counts are separate, no new approved questions.',
         currentMainRuntimeValidation=validation, wholeEngineComplete=False, wholeExtractionComplete=False,
         dbWrites=0, operationalLoads=0, deployed=False)
p['items'].append(finding)
p['validations']['U67HangulToolsImport'] = finding
write(new, p)
index_path = B / 'continuation-index.json'
raw = index_path.read_bytes()
before = json.loads(raw)['latestEngineCheckpoint']
after = {**before, 'utc': now, 'progress': new.as_posix(), 'sha256': ref(new)['sha256']}
needle = json.dumps(before, ensure_ascii=False, indent=2).replace('\n', '\n  ').encode('utf-8')
replacement = json.dumps(after, ensure_ascii=False, indent=2).replace('\n', '\n  ').encode('utf-8')
assert raw.count(needle) == 1
index_path.write_bytes(raw.replace(needle, replacement, 1))
write(OUT / 'visual-observation.json', dict(
    utc=now, method='view_image of actual resvg-generated PNGs; visual placement only, no pixel math oracle',
    first=ref(OUT / 'example-plane/calibration-triangle.png'),
    firstObservation='No clipping or lost side values; H below the base dimension is too far from its foot',
    revised=ref(OUT / 'example-plane-r2/calibration-triangle.png'),
    revisedObservation='H explicitly NW of its foot, separated from the base dimension and right-angle mark',
    mathematicalValuesCheckedFromCoordinates=True, newAuthoredBankQuestions=0, approvedQuestionAssets=0))
print(json.dumps(dict(progress=str(new), codeFiles=len(code), finalRelatedPassed=32, independent43=True,
                      originalCountsUnchanged=True, dbWrites=0)))
