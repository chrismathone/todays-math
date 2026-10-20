"""Enforce fetched main/target ancestry and current validation before FF backup."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess
import sys

BRANCH = 'chrismathone/exam-extraction-resume-20261008'


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def ancestor(a, z):
    subprocess.run(['git', 'merge-base', '--is-ancestor', a, z], check=True)


validation_path, receipt_path = map(Path, sys.argv[1:])
assert not receipt_path.exists()
assert git('branch', '--show-current') == BRANCH
assert not git('status', '--porcelain'), 'Commit owned changes before backup'
subprocess.run(['git', 'fetch', 'origin', 'main', BRANCH], check=True)
head, main, target = (git('rev-parse', ref) for ref in
                      ['HEAD', 'origin/main', 'origin/' + BRANCH])
ancestor(main, head)  # Never proceed to push after merely printing divergence.
ancestor(target, head)
v = json.loads(validation_path.read_text(encoding='utf-8'))
assert v['main'] == main, 'New main needs integration and relevant revalidation'
ancestor(v['head'], head)
assert v['currentMainRelatedFailed'] == 0 and v['currentMainRelatedPassed'] > 0
for r in v['code']:
    assert hashlib.sha256(Path(r['path']).read_bytes()).hexdigest() == r['sha256']
subprocess.run(['git', 'push', 'origin', 'HEAD:refs/heads/' + BRANCH], check=True)
remote = git('ls-remote', 'origin', 'refs/heads/' + BRANCH).split()[0]
assert remote == head
with receipt_path.open('x', encoding='utf-8', newline='\n') as f:
    json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   head=head, fetchedMain=main, fetchedTarget=target, remoteHead=remote,
                   validation=str(validation_path), mainAndTargetAncestorChecksPassed=True,
                   fastForwardOnly=True, forcePush=False, mainMergedFromFeature=False,
                   deployed=False, dbWrites=0), f, indent=2)
    f.write('\n')
print(json.dumps(dict(pushed=head, remoteHead=remote, dbWrites=0)))
