"""Preserve newer main and seal a fresh related-test checkpoint."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

B = Path('.qa-artifacts/exam-resume-20261008')
OUT = Path(__file__).resolve().parent
def read(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))
def ref(p):
    p = Path(p)
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())
def write(p, obj):
    Path(p).write_bytes((json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
def git(*args):
    return subprocess.check_output(['git', *args], text=True, encoding='utf-8').strip()

old, new = B / 'engine-upgrades-progress-r50.json', B / 'engine-upgrades-progress-r51.json'
assert not new.exists()
p = read(old)
current_main, head = git('rev-parse', 'origin/main'), git('rev-parse', 'HEAD')
subprocess.run(['git', 'merge-base', '--is-ancestor', current_main, head], check=True)
before = p['currentMainRuntimeValidation']['main']
incoming = set(git('diff', '--name-only', before, current_main).splitlines())
code = [ref(row['path']) for row in p['code']]
changed = [dict(path=row['path'], previous=row['sha256'], current=current['sha256'])
           for row, current in zip(p['code'], code) if row['sha256'] != current['sha256']]
assert all(row['path'] in incoming for row in changed)
assert not any(row['path'].startswith(('vendor/', 'src/lib/examStudy/', 'src/lib/middle/')) for row in changed)
suites = {}
for filename in ['post-main-tests.json', 'post-main-fixed-tests.json']:
    for suite in read(OUT / filename)['testResults']:
        suites[Path(suite['name']).name] = suite
assert len(suites) == 5 and all(s['status'] == 'passed' for s in suites.values())
assert all(t['status'] == 'passed' for s in suites.values() for t in s['assertionResults'])
count = sum(len(s['assertionResults']) for s in suites.values())
now = datetime.datetime.now(datetime.timezone.utc).isoformat()
v = dict(utc=now, head=head, main=current_main, currentMainRelatedPassed=count, currentMainRelatedFailed=0,
         files=[dict(name=n, cases=len(s['assertionResults'])) for n, s in suites.items()],
         original=ref(OUT / 'post-main-tests.json'), corrected=ref(OUT / 'post-main-fixed-tests.json'),
         initialHarnessMissingProjectSetup=True,
         initialPrismaTargetWasUnreachableLoopback=True, sharedOrOperationalDBWrites=0,
         fixedUsesRepositoryPrismaTestDoubleAndServerOnlyMock=True,
         SQLRegressionUsesEphemeralPGliteOnly=True, changedInheritedCode=changed,
         noImportedEngineSourceChangesSinceR50=True, code=code, dbWrites=0)
write(OUT / 'post-main-validation.json', v)
p.update(kind='exam-engine-upgrades-progress/v51', version=51, createdAt=now, previous=ref(old),
         code=code, checkpointDelta='Preserve newer main656a2fff8; fresh five-file related checks. Initial missing test mocks/loopback refusal retained; rerun under repository setup passes. No new authored/reviewed/approved questions.',
         currentMainRuntimeValidation=v, wholeEngineComplete=False, wholeExtractionComplete=False,
         dbWrites=0, operationalLoads=0, deployed=False)
p['validations']['U67LatestMainPreserved'] = v
write(new, p)
index = B / 'continuation-index.json'
raw = index.read_bytes()
old_entry = json.loads(raw)['latestEngineCheckpoint']
new_entry = {**old_entry, 'utc': now, 'progress': new.as_posix(), 'sha256': ref(new)['sha256']}
a = json.dumps(old_entry, ensure_ascii=False, indent=2).replace('\n', '\n  ').encode('utf-8')
z = json.dumps(new_entry, ensure_ascii=False, indent=2).replace('\n', '\n  ').encode('utf-8')
assert raw.count(a) == 1
index.write_bytes(raw.replace(a, z, 1))
print(json.dumps(dict(main=current_main, relatedFiles=len(suites), passed=count, changedInheritedCode=changed,
                      importedEngineSourceUnchanged=True, dbWrites=0)))
