"""Validate explicit source routing, then quarantine four separate two-paper pilots."""
import pathlib
import hashlib
import importlib.util
import json
import subprocess
import sys
import types
import datetime

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parents[3]
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'source-scope-generalization-20261020-r1'
TOOL = ROOT / 'scripts/import/exam-twin/extract-fresh-sources-20261019.py'
spec = importlib.util.spec_from_file_location('explicit_grade_source_reader', TOOL)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def ref(path):
    path = pathlib.Path(path)
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def write(name, value):
    with (OUT / name).open('x', encoding='utf-8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write('\n')


jobs = reader.load(reader.INVENTORY)['jobs']
seen, attempted = {reader.BUMIL}, set()
for path in BASE.glob('next-*/**/source-manifest.json'):
    seen.add(reader.load(path)['inventoryExamId'])
for path in BASE.glob('fresh-source-extraction-*/aggregate-receipt.json'):
    for entry in reader.load(path)['entries']:
        attempted.add(entry['examId'])
        if entry.get('status') == 'parsed-quarantined':
            seen.add(entry['examId'])
old = types.ModuleType('previous_middle3_scope')
old.__file__ = str(TOOL)
exec((OUT / 'extract-fresh-sources-before.py.snapshot').read_text('utf-8'), old.__dict__)
assert all(old.eligible(job, {reader.BUMIL}) == reader.eligible(job, {reader.BUMIL}) for job in jobs)
plan = []
for index, (level, grade) in enumerate([('middle', 1), ('middle', 2), ('high', 1), ('high', 2)]):
    candidates = [job for job in jobs if reader.eligible(job, seen, level=level, grade=grade)
                  and job['examId'] not in attempted]
    assert len(candidates) >= 2
    plan.append({'level': level, 'grade': grade,
                 'output': f'fresh-source-extraction-20261020-r{31+index}',
                 'jobs': [{key: job[key] for key in ['examId', 'school', 'year', 'grade', 'level']}
                          for job in candidates[:2]]})
code = [ref(TOOL), ref(TOOL.with_name('source_inventory_scope.py')),
        ref(TOOL.with_name('test_source_inventory_scope.py'))]
write('explicit-pilot-plan.json', {'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'inventory': ref(reader.INVENTORY), 'code': code, 'plan': plan,
      'historical1715DefaultM3RoutingIdentical': True,
      'sourceGradeMetadataIsNotStudentCurriculumApproval': True, 'dbWrites': 0})
with (OUT / 'scope-unit-tests.log').open('xb') as log:
    unit = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s',
                           'scripts/import/exam-twin', '-p', 'test_source_inventory_scope.py', '-v'],
                          cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
assert unit.returncode == 0
# A mixed-grade batch must stop before any source output or source-file reads.
negative_output = BASE / 'fresh-source-extraction-invalid-mixed-scope-20261020-r1'
assert not negative_output.exists()
with (OUT / 'mixed-scope-negative.log').open('xb') as log:
    negative = subprocess.run([sys.executable, '-B', str(TOOL), '--job-ids',
                               plan[0]['jobs'][0]['examId'], plan[1]['jobs'][0]['examId'],
                               '--level', 'middle', '--grade', '1', '--out', negative_output.name],
                              cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
assert negative.returncode != 0 and not negative_output.exists()
results = []
for step in plan:
    with (OUT / f"pilot-{step['level']}{step['grade']}.local.log").open('xb') as log:
        process = subprocess.run([sys.executable, '-B', str(TOOL), '--job-ids',
                                  *[job['examId'] for job in step['jobs']], '--level', step['level'],
                                  '--grade', str(step['grade']), '--out', step['output'],
                                  '--max-success', '2'], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
    assert process.returncode == 0
    receipt = BASE / step['output'] / 'aggregate-receipt.json'
    actual = reader.load(receipt)
    assert actual['preserved'] and actual['dbWrites'] == 0
    for entry in actual['entries']:
        assert entry['grade'] == step['grade']
        assert entry['extractionScopeAsProvided']['studentCurriculumApproval'] is False
        assert entry['gradeApprovals'] == 0 and entry['rightsApprovals'] == 0
    result = {**step, 'receipt': ref(receipt), 'newParentObservations': actual['actualNewParents'],
              'parsed': sum(entry['status'] == 'parsed-quarantined' for entry in actual['entries']),
              'held': sum(entry['status'] != 'parsed-quarantined' for entry in actual['entries'])}
    results.append(result)
    print(json.dumps({key: result[key] for key in ['level', 'grade', 'parsed', 'held', 'newParentObservations']}), flush=True)
for before in code:
    assert ref(before['path'])['sha256'] == before['sha256']
write('parent-validation-r1.json', {'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'code': code, 'all1715HistoricalDefaultM3RoutingEqual': True, 'unitTests': 3,
      'mixedGradeBatchRejectedBeforeOutput': True, 'results': results,
      'newParentObservations': sum(row['newParentObservations'] for row in results),
      'allSourcesCodeAndPriorEvidencePreserved': True, 'sourceTextImagesLocalOnly': True,
      'independentCodeAuditPending': True, 'studentGradeRightsOrLoadApproval': False, 'dbWrites': 0})
