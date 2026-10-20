"""Replay four already parsed sources in a separate namespace; never new observations."""
import pathlib
import json
import hashlib
import importlib.util
import subprocess
import sys
import datetime
from contextlib import redirect_stdout

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parents[3]
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'source-reader-v3-replay-20261020-r1'
OUT.mkdir(exist_ok=False)
SPOOL = OUT / 'isolated-local-spool'
SPOOL.mkdir()
TOOL = ROOT / 'scripts/import/exam-twin/extract-fresh-sources-20261019.py'
spec = importlib.util.spec_from_file_location('wired_source_scope_reader', TOOL)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def ref(path):
    path = pathlib.Path(path)
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def write(path, value):
    with path.open('x', encoding='utf-8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write('\n')


queue = BASE / 'engine-upgrade-20261019/remaining-ready-scopes-extraction-20261020-r1/aggregate-queue-receipt.json'
completed = json.loads(queue.read_text('utf-8'))
assert completed['completedBatches'] == completed['plannedBatches'] == 170
assert completed['sourceCodeInventoryBytesPreserved']
inventory = reader.INVENTORY
jobs = reader.load(inventory)['jobs']
old_spec = importlib.util.spec_from_file_location('previous_source_scope', TOOL.with_name('source_inventory_scope.py'))
old = importlib.util.module_from_spec(old_spec)
old_spec.loader.exec_module(old)
assert all(old.eligible_source_job(job, {reader.BUMIL}) == reader.eligible(job, {reader.BUMIL}) for job in jobs)
pilot = reader.load(BASE / 'source-scope-generalization-20261020-r1/explicit-pilot-plan.json')
steps = [step for step in pilot['plan'] if (step['level'], step['grade']) in [('middle', 1), ('high', 1)]]
assert len(steps) == 2
ids = {job['examId'] for step in steps for job in step['jobs']}
filtered = [job for job in jobs if job['examId'] in ids]
assert len(filtered) == 4
local_inventory = OUT / 'four-existing-jobs.metadata-only.json'
write(local_inventory, {'jobs': filtered, 'replayOnlyNotNewExtraction': True})
before = [ref(inventory), ref(queue), ref(TOOL), ref(TOOL.with_name('source_inventory_scope_v2.py'))]
reader.BASE = SPOOL
reader.INVENTORY = local_inventory
results = []
for step in steps:
    args = ['replay', '--job-ids', *[job['examId'] for job in step['jobs']], '--level', step['level'],
            '--grade', str(step['grade']), '--out', f"replay-{step['level']}{step['grade']}", '--max-success', '2']
    previous_args = sys.argv
    try:
        sys.argv = args
        with (OUT / f"{step['level']}{step['grade']}.local.log").open('x', encoding='utf-8') as log:
            with redirect_stdout(log):
                reader.main()
    finally:
        sys.argv = previous_args
    actual_root = SPOOL / f"replay-{step['level']}{step['grade']}"
    receipt_path = actual_root / 'aggregate-receipt.json'
    receipt = reader.load(receipt_path)
    expected_policy = reader.SOURCE_SCOPE.selection_policy(step['level'], step['grade'])
    assert receipt['selectionPolicy'] == expected_policy
    assert receipt['preserved'] and receipt['dbWrites'] == 0
    assert all(entry['status'] == 'parsed-quarantined' for entry in receipt['entries'])
    comparisons = []
    for job in step['jobs']:
        old_manifest = BASE / step['output'] / job['examId'] / 'source-manifest.local.json'
        new_manifest = actual_root / job['examId'] / 'source-manifest.local.json'
        original, replay = reader.load(old_manifest), reader.load(new_manifest)
        assert original['inputs'] == replay['inputs']
        original_digests = [(item['number'], item['sourceContentDigest']) for item in original['questions']]
        replay_digests = [(item['number'], item['sourceContentDigest']) for item in replay['questions']]
        assert original_digests == replay_digests
        assert replay['gradeApprovals'] == replay['rightsApprovals'] == 0
        assert replay['extractionScopeAsProvided']['studentCurriculumApproval'] is False
        comparisons.append({'examId': job['examId'], 'questionCount': len(original_digests),
                            'oldManifest': ref(old_manifest), 'replayManifest': ref(new_manifest),
                            'originalInputHashesAndAllQuestionDigestsEqual': True})
    results.append({'level': step['level'], 'grade': step['grade'], 'receipt': ref(receipt_path),
                    'correctDynamicPolicy': expected_policy, 'sources': comparisons,
                    'replayOnlyNotNewObservations': True})
    print(json.dumps({'scope': f"{step['level']}{step['grade']}", 'replayed': len(comparisons),
                      'allOriginalQuestionDigestsUnchanged': True, 'dynamicPolicyCorrect': True}), flush=True)
with (OUT / 'scope-tests.log').open('xb') as log:
    test = subprocess.run([sys.executable, '-B', '-m', 'unittest', 'discover', '-s',
                           'scripts/import/exam-twin', '-p', 'test_source_inventory_scope*.py', '-v'],
                          cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
assert test.returncode == 0
for item in before:
    assert ref(item['path'])['sha256'] == item['sha256']
write(OUT / 'parent-validation-r1.json', {
      'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'before': before,
      'all1715DefaultM3ChoicesPreserved': True, 'strictHelperActuallyWired': True,
      'dynamicPolicyActuallyWired': True, 'unitTests': 7, 'actualReplays': results,
      'replayedSourcePapers': 4, 'newSourceObservations': 0,
      'isolatedReplayCountersNotCorpusCounts': True, 'originalQuestionsAndReceiptsUnchanged': True,
      'noOriginalTextImagesStaged': True, 'independentWiringAuditPending': True,
      'studentGradeRightsApproval': False, 'dbWrites': 0, 'loadable': 0})
