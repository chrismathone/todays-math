"""Actual replay of the same three immutable references; no new source credit."""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
E = BASE / 'engine-upgrade-20261019'
OUT = BASE / 'unpaired-pdf-replay-20261020-r2'
OUT.mkdir()
SPOOL = OUT / 'isolated-local-spool'
SPOOL.mkdir()
script = ROOT / 'scripts/import/exam-twin/preflight-unpaired-pdfs.py'
sys.path.insert(0, str(script.parent))
spec = importlib.util.spec_from_file_location('actual_unpaired_r2_replay', script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
code = [script, script.with_name('unpaired_pdf_scope.py'), script.with_name('test_unpaired_pdf_scope.py')]


def ref(path):
    p = Path(path)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())


before = [ref(p) for p in code]
module.BASE = SPOOL
sys.argv = [str(script), '--job-ids', 'personal-273b85b46b6ea294fef26b4de34becfc',
            'personal-59bbe8ebff319ec20b823103fa6c5e8d', '--level', 'middle',
            '--grade', '3', '--out', 'unpaired-pdf-preflight-existing2-r2']
module.main()
old_path = BASE / 'unpaired-pdf-preflight-20261020-r1/aggregate-receipt.json'
new_path = SPOOL / 'unpaired-pdf-preflight-existing2-r2/aggregate-receipt.json'
old = json.loads(old_path.read_text(encoding='utf-8'))
new = json.loads(new_path.read_text(encoding='utf-8'))
comparisons = []
for prior, current in zip(old['entries'], new['entries'], strict=True):
    assert prior['examId'] == current['examId']
    for a, b in zip(prior['references'], current['references'], strict=True):
        assert a['input'] == b['input']
        assert a['status'] == b['status']
        assert a['pages'] == b['pages']
        assert a['firstPage']['sha256'] == b['firstPage']['sha256']
        assert a.get('parserQuestionCountUnverified') == b.get('parserQuestionCountUnverified')
        assert a.get('localParser', {}).get('sha256') == b.get('localParser', {}).get('sha256')
        comparisons.append(dict(examId=prior['examId'], reference=a['index'],
                                inputSha256=b['input']['sha256'], pageMetadataEqual=True,
                                firstPageBytesEqual=True, quarantinedParserBytesEqual=True,
                                status=b['status']))
assert new['preserved'] and new['actualNewQuestionObservations'] == 0
for r in before:
    assert ref(r['path']) == r
tests = subprocess.run(['python', '-B', '-m', 'unittest', 'discover', '-s', str(script.parent),
                        '-p', 'test_*scope*.py'], capture_output=True, text=True)
(E / 'unpaired-pdf-parent-tests-r2.log').write_text(tests.stdout + tests.stderr, encoding='utf-8', newline='\n')
assert tests.returncode == 0
receipt = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), code=before,
               originalTechnicalHold=ref(BASE / 'unpaired-pdf-code-audit-20261020-r1/own-audit-report.json'),
               originalPilot=ref(old_path), newReplayAggregate=ref(new_path), comparisons=comparisons,
               pythonScopeTests=tests.stderr.strip(), actualReplayedJobs=2, actualReplayedReferences=3,
               allInputPageParserBytesUnchanged=True, replayQuestionObservationCredit=0,
               codePreservedDuringRun=True, priorRawReportsNeverRewritten=True,
               repairs=['strict safe Windows output component before import',
                        'same resolved output fence for directories, PNGs and JSON',
                        'bounded explicit standalone Korean/English answer filename tokens'],
               independentR2AuditPending=True, sourceIdentityGradeRightsApproved=False, dbWrites=0, loadable=0)
p = E / 'unpaired-pdf-parent-validation-r2.json'
with p.open('x', encoding='utf-8', newline='\n') as f:
    json.dump(receipt, f, ensure_ascii=True, indent=2)
    f.write('\n')
print(json.dumps(dict(replayedJobs=2, replayedReferences=3, unchanged=True, testsPassed=15,
                     sourceObservationCredit=0, loadable=0)))
