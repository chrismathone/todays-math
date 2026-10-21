"""Transport sealed worker bytes only; never merge its unrelated dirty tree."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

out = Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m38-proposal-review-transport-20261021-r1.json')
assert not out.exists()
records = []
for commit, folder in [
    ('c1c063cc4f80e874a426fdc65be211fc21572786', '.qa-artifacts/exam-resume-20261008/m38-proposal-review-20261021-r2'),
    ('a76e4ee55953088e35c389fe07412c076e05c2bf', '.qa-artifacts/exam-resume-20261008/m38-proposal-review-20261021-r3'),
]:
    paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', commit, '--', folder], text=True, encoding='utf-8').splitlines()
    assert paths
    for rel in paths:
        data = subprocess.check_output(['git', 'show', f'{commit}:{rel}'])
        p = Path(rel)
        if p.exists():
            assert p.read_bytes() == data, f'Preserve conflicting evidence: {rel}'
        else:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
        records.append(dict(commit=commit, path=rel, sha256=hashlib.sha256(data).hexdigest()))
out.write_text(json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    copied=records, productionOrBankEdits=0, workerOtherDirtyFilesCopied=False,
    staticOnly=True, actualSeedReplayPending=True), indent=2) + '\n', encoding='utf-8')
print(json.dumps(dict(copied=len(records), staticOnly=True)))
