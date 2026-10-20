"""Read-only explicit inventory queue. Only metadata receipts are Git candidates."""
import datetime
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parents[3]
TOOL = ROOT / 'scripts/import/exam-twin/extract-fresh-sources-20261019.py'
spec = importlib.util.spec_from_file_location('remaining_queue_source_reader', TOOL)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
BASE = reader.BASE
OUT = BASE / 'engine-upgrade-20261019/remaining-ready-m3-extraction-20261020-r1'
OUT.mkdir(exist_ok=False)


def ref(path):
    path = pathlib.Path(path)
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def write(path, value):
    with pathlib.Path(path).open('x', encoding='utf-8') as file:
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
jobs = [job for job in reader.load(reader.INVENTORY)['jobs']
        if reader.eligible(job, seen) and job['examId'] not in attempted]
assert len(jobs) == 79, 'Queue changed: inspect a new plan instead of silently reusing this scope'
before = [ref(reader.INVENTORY), ref(TOOL), ref(__file__)]
batches, pending = [], list(jobs)
while pending:
    size = 2 if len(pending) in (2, 4) else 3
    batch, pending = pending[:size], pending[size:]
    assert 2 <= len(batch) <= 3
    batches.append({'output': f'fresh-source-extraction-20261020-r{4+len(batches)}',
                    'jobs': [{key: job[key] for key in
                              ['examId', 'school', 'year', 'grade', 'semester', 'round']}
                             for job in batch]})
write(OUT / 'explicit-plan.json', {
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'before': before, 'historicalEligibleUnattemptedReadyM3': len(jobs),
    'batches': batches, 'earlierIndividualHoldsNotRetried': True,
    'scope': '2025+ middle3 ready selected-pair subset of 2026-10-03 inventory; not all N sources',
    'original82AndProtectedSchoolsExcluded': True, 'originalTextsImagesLocalOnly': True,
    'componentsOrRightsApproved': 0, 'dbWrites': 0,
})
progress = OUT / 'progress.ndjson'
progress.open('x', encoding='utf-8').close()
results = []
for index, batch in enumerate(batches):
    folder = BASE / batch['output']
    assert not folder.exists(), 'Never overwrite prior extraction evidence'
    command = [sys.executable, '-B', str(TOOL), '--job-ids',
               *[job['examId'] for job in batch['jobs']], '--out', batch['output'],
               '--max-success', '3']
    # Keep parser stdout/stderr local: no original material is published by this queue.
    with (OUT / f'batch-{index+1:02}.local.log').open('xb') as log:
        process = subprocess.run(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    receipt = folder / 'aggregate-receipt.json'
    row = {'batch': index+1, 'output': batch['output'], 'exit': process.returncode,
           'receipt': ref(receipt) if receipt.exists() else None}
    if receipt.exists():
        actual = reader.load(receipt)
        row.update(newParentObservations=actual['actualNewParents'],
                   preserved=actual['preserved'],
                   parsed=sum(entry['status'] == 'parsed-quarantined'
                              for entry in actual['entries']),
                   held=sum(entry['status'] != 'parsed-quarantined'
                            for entry in actual['entries']),
                   dbWrites=actual['dbWrites'])
        assert actual['preserved'] and actual['dbWrites'] == 0
    results.append(row)
    with progress.open('a', encoding='utf-8') as file:
        file.write(json.dumps(row, ensure_ascii=True) + '\n')
    print(json.dumps(row, ensure_ascii=True), flush=True)
for initial in before:
    assert ref(initial['path'])['sha256'] == initial['sha256']
write(OUT / 'aggregate-queue-receipt.json', {
    'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'plan': ref(OUT / 'explicit-plan.json'), 'results': results,
    'planned': len(jobs), 'parsed': sum(row.get('parsed', 0) for row in results),
    'held': sum(row.get('held', 0) for row in results),
    'newParentObservations': sum(row.get('newParentObservations', 0) for row in results),
    'before': before, 'beforeBytesPreserved': True,
    'wholeNExtractionOrDedupComplete': False, 'twinsOrGradeOrRightsApproved': 0,
    'originalTextImagesStaged': False, 'dbWrites': 0,
})
