"""Explicit frozen queue of unselected-pair PDF references; all question credit0."""
from pathlib import Path
import datetime
import hashlib
import json
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'engine-upgrade-20261019/remaining-unpaired-pdf-preflight-20261020-r1'
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
sys.path.insert(0, str(ROOT / 'scripts/import/exam-twin'))
from unpaired_pdf_scope import eligible_unpaired_job, original_pdf_candidates


def load(p):
    return json.loads(Path(p).read_text(encoding='utf-8-sig'))


def ref(p):
    p = Path(p)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())


def write(p, value):
    with p.open('x', encoding='utf-8', newline='\n') as f:
        json.dump(value, f, ensure_ascii=True, indent=2)
        f.write('\n')


audit_path = BASE / 'unpaired-pdf-code-audit-20261020-r2/own-audit-report.json'
audit = load(audit_path)
assert ref(audit_path)['sha256'] == '9d25b0a3caf2417a7a96fb65444e8352cc55de5be0152e1440b676a6eafc1d5d'
assert audit['status'] == 'bounded-code-repair-pass-with-explicit-limits'
assert audit['ownRuns']['uniqueCurrentControls'] == 12740 and audit['ownRuns']['failed'] == 0
scope = load(BASE / 'unpaired-pdf-code-audit-20261020-r2/provided-scope.json')
for r in scope['code']:
    assert ref(r['path']) == r
jobs = load(INVENTORY)['jobs']
old_receipts = sorted(BASE.glob('unpaired-pdf-preflight-*/aggregate-receipt.json'))
seen = {e['examId'] for p in old_receipts for e in load(p)['entries']}
assert len(seen) == 2
all_ids, batches = set(), []
eligible_total = with_pdf_total = 0
run_number = 2
for level, grade in [('middle', 3), ('middle', 2), ('middle', 1), ('high', 1), ('high', 2), ('high', 3)]:
    eligible = [j for j in jobs if eligible_unpaired_job(j, set(), level=level, grade=grade)]
    eligible_total += len(eligible)
    references = [j for j in eligible if original_pdf_candidates(j)]
    with_pdf_total += len(references)
    selected = [j for j in references if j['examId'] not in seen]
    for start in range(0, len(selected), 3):
        subset = selected[start:start+3]
        ids = [j['examId'] for j in subset]
        assert all(i not in all_ids for i in ids)
        all_ids.update(ids)
        batches.append(dict(level=level, grade=grade, ids=ids,
                            output=f'unpaired-pdf-preflight-20261020-r{run_number}',
                            plannedReferences=sum(len(original_pdf_candidates(j)) for j in subset)))
        run_number += 1
assert eligible_total == 733 and with_pdf_total == 625 and len(all_ids) == 623
assert sum(len(b['ids']) for b in batches) == 623
OUT.mkdir()
inputs = [ref(INVENTORY), ref(Path(__file__)), ref(audit_path)] + [ref(p) for p in old_receipts]
inputs += [ref(ROOT / r['path']) for r in scope['code']]
write(OUT / 'explicit-plan.json', dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
      inventory=ref(INVENTORY), independentCodeAudit=ref(audit_path), immutableInputs=inputs,
      historicalEligibleUnpairedJobs=733, withStrictOriginalPdfReferences=625,
      previousPilotJobsExcluded=2, plannedJobs=623, batches=batches,
      noSourceObservationCredit=True, noFakeSelectedPair=True, dbWrites=0, loadable=0))
results = []
for index, batch in enumerate(batches, 1):
    if shutil.disk_usage(ROOT).free < 10 * 1024**3:
        results.append(dict(batch=index, status='disk-budget-paused', noOtherSourceBlockInferred=True))
        break
    cmd = [sys.executable, '-B', str(ROOT / 'scripts/import/exam-twin/preflight-unpaired-pdfs.py'),
           '--job-ids', *batch['ids'], '--level', batch['level'], '--grade', str(batch['grade']),
           '--out', batch['output']]
    record = dict(batch=index, level=batch['level'], grade=batch['grade'], ids=batch['ids'])
    try:
        run = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=240)
        log = OUT / f'batch-{index:03}.log'
        log.write_text(run.stdout + run.stderr, encoding='utf-8', newline='\n')
        receipt = BASE / batch['output'] / 'aggregate-receipt.json'
        record.update(exit=run.returncode, log=ref(log))
        if run.returncode == 0 and receipt.exists():
            data = load(receipt)
            assert data['preserved'] and data['actualNewQuestionObservations'] == 0
            assert [e['examId'] for e in data['entries']] == batch['ids']
            refs = [r for e in data['entries'] for r in e['references']]
            record.update(status='preflight-recorded-not-approved', receipt=ref(receipt),
                          jobs=len(data['entries']), pdfReferences=len(refs),
                          jobsWithAnyParserOutput=sum(any(r['status']=='parser-output-quarantined-unverified' for r in e['references']) for e in data['entries']),
                          parserReferencesUnverified=sum(r['status']=='parser-output-quarantined-unverified' for r in refs),
                          scanOrParserUnavailableReferences=sum(r['status']=='visual-reference-held-parser-unavailable' for r in refs),
                          unreadableReferences=sum(r['status']=='individual-reference-hold' for r in refs))
        else:
            record.update(status='individual-batch-hold', rawPartialOutputsPreserved=True)
    except subprocess.TimeoutExpired:
        record.update(status='individual-batch-timeout', seconds=240, rawPartialOutputsPreserved=True)
    except Exception as error:
        record.update(status='individual-batch-review-hold', errorType=type(error).__name__, error=str(error))
    results.append(record)
    with (OUT / 'progress.ndjson').open('a', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(record, ensure_ascii=True) + '\n')
    print(json.dumps({k: v for k, v in record.items() if k in ['batch', 'status', 'jobs', 'pdfReferences', 'parserReferencesUnverified', 'scanOrParserUnavailableReferences', 'unreadableReferences']}), flush=True)
preservation = [dict(path=r['path'], beforeSha256=r['sha256'], afterSha256=ref(r['path'])['sha256']) for r in inputs]
assert all(r['beforeSha256'] == r['afterSha256'] for r in preservation)
ok = [r for r in results if r['status']=='preflight-recorded-not-approved']
write(OUT / 'aggregate-queue-receipt.json', dict(
    utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), plannedJobs=623,
    plannedBatches=len(batches), recordedBatches=len(ok), jobsRecorded=sum(r['jobs'] for r in ok),
    pdfReferencesRecorded=sum(r['pdfReferences'] for r in ok),
    jobsWithAnyParserOutputUnverified=sum(r['jobsWithAnyParserOutput'] for r in ok),
    parserReferencesUnverified=sum(r['parserReferencesUnverified'] for r in ok),
    scanOrParserUnavailableReferences=sum(r['scanOrParserUnavailableReferences'] for r in ok),
    unreadableReferences=sum(r['unreadableReferences'] for r in ok),
    batchHolds=sum(r['status']!='preflight-recorded-not-approved' for r in results),
    results=results, preservation=preservation, codeInventoryAndPriorBytesPreserved=True,
    actualNewQuestionObservationCredit=0, sourceFidelityCurriculumRightsApprovals=0,
    wholeNExtractionComplete=False, dbWrites=0, loadable=0))
