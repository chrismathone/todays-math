"""Verify incoming frozen reviews and preserve checkout byte discrepancies explicitly."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import json, hashlib
from datetime import datetime, timezone
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
WORKER = ROOT.parent / 'exam-twin-author-geometry-20261008'
OUT = BASE / 'final31-integration-audit-r1'
OUT.mkdir(exist_ok=True)
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
allowed = {'docs/planning/tracks/reports/bumil-taxonomy-peer-r1-20261008.md',
           'docs/planning/tracks/reports/gyeonggu-authoring-r1-20261008.md'}
groups = []
for name, preservation, key in [
 ('gyeongsang-stat-final-review-r1','evidence/preservation-before-main.json','sha256'),
 ('gyeongsan-final-review-r1','evidence/preservation.json','rawSha256')]:
 scope = BASE / name
 freeze = read(scope/'review-freeze.json')
 for f in freeze['files']: assert sha(scope/f['path']) == f[key], f['path']
 rows = read(scope/preservation)['files']; discrepancies = []
 for f in rows:
  actual = sha(ROOT/f['path'])
  if actual == f['sha256']: continue
  assert f['path'] in allowed, 'Unexpected preservation mismatch: '+f['path']
  original = WORKER/f['path']; assert sha(original) == f['sha256']
  worker_bytes = original.read_bytes(); parent_bytes = (ROOT/f['path']).read_bytes()
  assert worker_bytes.replace(b'\r\n',b'\n') == parent_bytes.replace(b'\r\n',b'\n'), 'Not a line-ending-only difference'
  captured = OUT/(Path(f['path']).name+'.worker-original.raw')
  if captured.exists(): assert captured.read_bytes() == worker_bytes
  else:
   with captured.open('xb') as fp: fp.write(worker_bytes)
  discrepancies.append({'path':f['path'],'capturedExpectedSha256':f['sha256'],'parentActualSha256':actual,'workerOriginalCopy':str(captured.relative_to(ROOT)),'workerOriginalCopySha256':sha(captured),'difference':'LF/CRLF only; original report and original validator are not rewritten'})
 groups.append({'scope':name,'frozenReviewFilesExact':len(freeze['files']),'preservationEntries':len(rows),'preservationEntriesExact':len(rows)-len(discrepancies),'checkoutByteDiscrepancies':discrepancies,'unqualifiedOriginalValidatorPassed':False,'originalValidatorFailureReason':'Its preservation check compares two Markdown working-tree line endings byte-for-byte; no current candidate, figure, source or raw solve discrepancy.'})
assert all(len(g['checkoutByteDiscrepancies'])==2 for g in groups)
result={'kind':'final31-parent-integration-audit/v1','createdAt':datetime.now(timezone.utc).isoformat(),'groups':groups,'frozenReviewOutputExact':True,'rawAndCandidateByteExceptionsAllowed':False,'capturedByteExceptionsPreserved':True,'dbWrites':0,'fullApproval':False}
with (OUT/'audit.json').open('x',encoding='utf-8',newline='\n') as fp: json.dump(result,fp,ensure_ascii=False,indent=2);fp.write('\n')
print(json.dumps({'reviewScopes':2,'frozenOutputsExact':True,'lineEndingExceptionsPerScope':2,'originalValidationFailureDisclosed':True}))
