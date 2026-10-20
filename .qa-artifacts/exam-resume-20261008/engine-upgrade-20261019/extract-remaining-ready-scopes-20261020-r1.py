"""Sequential, explicit, quarantined inventory queue; no learner or DB approval."""
import pathlib
import importlib.util
import hashlib
import json
import datetime
import subprocess
import sys
import shutil

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parents[3]
TOOL = ROOT / 'scripts/import/exam-twin/extract-fresh-sources-20261019.py'
spec = importlib.util.spec_from_file_location('scoped_quarantine_reader', TOOL)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
BASE = reader.BASE
OUT = BASE / 'engine-upgrade-20261019/remaining-ready-scopes-extraction-20261020-r1'
OUT.mkdir(exist_ok=False)


def ref(path):
    path = pathlib.Path(path)
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def write(name, value):
    with (OUT / name).open('x', encoding='utf-8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write('\n')


seen, attempted = {reader.BUMIL}, set()
for path in BASE.glob('next-*/**/source-manifest.json'):
    seen.add(reader.load(path)['inventoryExamId'])
for path in BASE.glob('fresh-source-extraction-*/aggregate-receipt.json'):
    for entry in reader.load(path)['entries']:
        attempted.add(entry['examId'])
        if entry.get('status') == 'parsed-quarantined':
            seen.add(entry['examId'])
jobs = reader.load(reader.INVENTORY)['jobs']
batches, scope_counts = [], {}
for level, grade in [('middle', 1), ('middle', 2), ('high', 1), ('high', 2)]:
    pending = [job for job in jobs if reader.eligible(job, seen, level=level, grade=grade)
               and job['examId'] not in attempted]
    scope_counts[f'{level}{grade}'] = len(pending)
    while pending:
        size = 2 if len(pending) in (2, 4) else 3
        batch, pending = pending[:size], pending[size:]
        assert 2 <= len(batch) <= 3
        batches.append({'level': level, 'grade': grade,
                        'output': f'fresh-source-extraction-20261020-r{35+len(batches)}',
                        'jobs': [{key: job[key] for key in
                                  ['examId', 'school', 'year', 'level', 'grade', 'semester', 'round']}
                                 for job in batch]})
assert scope_counts == {'middle1': 68, 'middle2': 109, 'high1': 121, 'high2': 207}
before = [ref(reader.INVENTORY), ref(TOOL), ref(TOOL.with_name('source_inventory_scope.py')), ref(__file__)]
write('explicit-plan.json', {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'before': before, 'scopeCounts': scope_counts, 'plannedPapers': sum(scope_counts.values()),
      'batches': batches, 'earlierIndividualHoldsNotRetried': True,
      'scope': '2025+ ready selected pairs in the historical10/03inventory; not all current N files',
      'yearGradeCurriculumAndSourceIdentityStillRequireActualReview': True,
      'sourceOriginalsQuarantinedLocalOnly': True, 'studentGradeRightsApproval': False, 'dbWrites': 0})
progress = OUT / 'progress.ndjson'
progress.open('x', encoding='utf-8').close()
results = []
for index, step in enumerate(batches):
    if shutil.disk_usage(ROOT).free < 10 * 1024**3:
        write('disk-capacity-hold.json', {'nextBatch': index+1,
              'freeBytes': shutil.disk_usage(ROOT).free, 'partialEvidencePreserved': True})
        break
    assert not (BASE / step['output']).exists()
    command = [sys.executable, '-B', str(TOOL), '--job-ids',
               *[job['examId'] for job in step['jobs']], '--level', step['level'],
               '--grade', str(step['grade']), '--out', step['output'], '--max-success', '3']
    with (OUT / f'batch-{index+1:03}.local.log').open('xb') as log:
        try:
            process = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, timeout=180)
            exit_code = process.returncode
        except subprocess.TimeoutExpired:
            exit_code = 'own-parser-timeout-held-no-retry'
    receipt = BASE / step['output'] / 'aggregate-receipt.json'
    row = {'batch': index+1, 'level': step['level'], 'grade': step['grade'],
           'output': step['output'], 'exit': exit_code,
           'receipt': ref(receipt) if receipt.exists() else None}
    if receipt.exists():
        actual = reader.load(receipt)
        assert actual['preserved'] and actual['dbWrites'] == 0
        row.update(newParentObservations=actual['actualNewParents'],
                   parsed=sum(entry['status'] == 'parsed-quarantined' for entry in actual['entries']),
                   held=sum(entry['status'] != 'parsed-quarantined' for entry in actual['entries']),
                   dbWrites=0)
    results.append(row)
    with progress.open('a', encoding='utf-8') as file:
        file.write(json.dumps(row, ensure_ascii=True) + '\n')
    print(json.dumps(row, ensure_ascii=True), flush=True)
for initial in before:
    assert ref(initial['path'])['sha256'] == initial['sha256']
write('aggregate-queue-receipt.json', {'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'plan': ref(OUT / 'explicit-plan.json'), 'results': results,
      'planned': sum(scope_counts.values()), 'completedBatches': len(results), 'plannedBatches': len(batches),
      'parsed': sum(row.get('parsed', 0) for row in results),
      'held': sum(row.get('held', 0) for row in results),
      'newParentObservations': sum(row.get('newParentObservations', 0) for row in results),
      'before': before, 'sourceCodeInventoryBytesPreserved': True,
      'wholeNExtractionOrDedupComplete': False, 'twinsOrStudentGradeOrRightsApproved': 0,
      'originalTextImagesStaged': False, 'dbWrites': 0})
