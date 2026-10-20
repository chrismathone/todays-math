"""Append-only metadata corrections for closed receipts; active reader stays immutable."""
import pathlib
import json
import hashlib
import importlib.util
import datetime
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'source-scope-policy-overlays-20261020-r1'
OUT.mkdir(exist_ok=False)
strict_path = ROOT / 'scripts/import/exam-twin/source_inventory_scope_v2.py'
spec = importlib.util.spec_from_file_location('strict_overlay_scope', strict_path)
strict = importlib.util.module_from_spec(spec)
spec.loader.exec_module(strict)


def ref(path):
    path = pathlib.Path(path)
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def write(path, value):
    with path.open('x', encoding='utf-8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write('\n')


active = [ref(ROOT / 'scripts/import/exam-twin' / name) for name in
          ['extract-fresh-sources-20261019.py', 'source_inventory_scope.py', 'test_source_inventory_scope.py']]
new_code = [ref(strict_path), ref(strict_path.with_name('test_source_inventory_scope_v2.py'))]
inventory = pathlib.Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
inventory_ref = ref(inventory)
jobs = {job['examId']: job for job in json.loads(inventory.read_text('utf-8-sig'))['jobs']}
plan_path = BASE / 'engine-upgrade-20261019/remaining-ready-scopes-extraction-20261020-r1/explicit-plan.json'
plan = json.loads(plan_path.read_text('utf-8'))
invalid = []
for batch in plan['batches']:
    for row in batch['jobs']:
        if not strict.eligible_source_job(jobs[row['examId']], set(), level=batch['level'], grade=batch['grade']):
            invalid.append(row['examId'])
assert invalid == []
with (OUT / 'strict-scope-tests.log').open('xb') as log:
    test = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s',
                           'scripts/import/exam-twin', '-p', 'test_source_inventory_scope_v2.py', '-v'],
                          cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
assert test.returncode == 0
results = []
for receipt in sorted(BASE.glob('fresh-source-extraction-20261020-r*/aggregate-receipt.json')):
    revision = int(receipt.parent.name.rsplit('-r', 1)[1])
    if revision < 31:
        continue
    raw = receipt.read_bytes()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        continue  # Still being written: inspect it in the next new overlay revision.
    scopes = {(entry['extractionScopeAsProvided']['level'], entry['grade']) for entry in data['entries']}
    assert len(scopes) == 1
    level, grade = scopes.pop()
    for entry in data['entries']:
        assert entry['level'] == strict.LEVELS[level]
        assert entry['extractionScopeAsProvided']['grade'] == grade
        assert entry['gradeApprovals'] == 0 and entry['rightsApprovals'] == 0
        assert entry['extractionScopeAsProvided']['studentCurriculumApproval'] is False
    target = OUT / f'r{revision:03}.policy-overlay.json'
    write(target, {'kind': 'source-scope-policy-text-correction/v1',
          'originalReceipt': {'path': str(receipt), 'sha256': hashlib.sha256(raw).hexdigest()},
          'originalSelectionPolicy': data['selectionPolicy'],
          'correctedSelectionPolicy': strict.selection_policy(level, grade),
          'actualMetadataScope': {'level': level, 'grade': grade},
          'basis': 'Explicit job/entry scope agreement; does not infer original printed curriculum or verify question content',
          'rawReceiptBytesPreserved': True, 'studentGradeRightsSourceIdentityApproved': False,
          'activeReaderCodeChanged': False, 'dbWrites': 0, 'loadable': 0})
    assert receipt.read_bytes() == raw
    results.append(ref(target))
for original in [*active, *new_code, inventory_ref]:
    assert ref(original['path'])['sha256'] == original['sha256']
write(OUT / 'parent-validation-r1.json', {
      'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'activeReaderCode': active,
      'strictFutureCode': new_code, 'inventory': inventory_ref, 'activePlan': ref(plan_path),
      'active505RecordsPassStrictBoundary': True, 'invalidPlannedIds': invalid,
      'unitTests': 4, 'closedReceiptPolicyOverlays': results,
      'notYetWiredIntoActiveParser': True, 'originalMetadataAndAllCodeBytesPreserved': True,
      'newOriginalQuestionTextImagesStaged': False, 'independentReauditPending': True,
      'dbWrites': 0, 'loadable': 0})
print(json.dumps({'strictActiveRecords': 505, 'closedPolicyOverlays': len(results),
                  'activeReaderChanged': False, 'independentReauditPending': True, 'loadable': 0}))
