"""Read-only filename discovery; filenames never approve source identity or year."""
from pathlib import Path, PureWindowsPath
import collections
import datetime
import hashlib
import json
import re
import subprocess

ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'n-filename-discovery-20261020-r2'
NROOT = Path('N:/\uac1c\uc778/\uae30\ucd9c')
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
assert NROOT.is_dir() and not OUT.exists()
before = INVENTORY.read_bytes()
jobs = json.loads(before.decode('utf-8-sig'))['jobs']
identity = lambda p: str(PureWindowsPath(p)).casefold()
known = {identity(f['path']) for j in jobs for f in j['files']}
run = subprocess.run(['rg', '--files', '--hidden', '--no-ignore', '--iglob', '*.hwp', '--iglob', '*.hwpx', '--iglob', '*.pdf', str(NROOT)],
                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
assert run.returncode == 0, run.stderr.decode('utf-8', errors='replace')
paths = sorted(set(run.stdout.decode('utf-8-sig').splitlines()), key=identity)
assert all(PureWindowsPath(p).is_relative_to(PureWindowsPath(str(NROOT))) for p in paths)
rows = []
for p in paths:
    if identity(p) in known:
        continue
    explicit = {int(y) for y in re.findall(r'(?<!\d)(20\d{2})(?!\d)', p)}
    short = {2000 + int(y) for y in re.findall(r'\[(\d{2})-[12]-(?:\uc911\uac04|\uae30\ub9d0)\]', p)}
    years = sorted(explicit | short)
    status = ('filename-2025plus-candidate-not-content-verified' if len(years) == 1 and years[0] >= 2025
              else 'filename-pre2025-excluded' if years and max(years) < 2025
              else 'filename-year-conflict-hold' if len(years) > 1
              else 'filename-year-unknown-hold')
    rows.append(dict(path=p, extension=PureWindowsPath(p).suffix.lower(),
                     filenameYearHints=years, status=status, contentsRead=False,
                     schoolGradeSemesterSubjectIdentityApproved=False,
                     curriculumApproved=False, rightsApproved=False, sourceQuestionCredit=0))
assert INVENTORY.read_bytes() == before
OUT.mkdir()
with (OUT / 'filenames-only.local.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(dict(paths=paths, unseen=rows), f, ensure_ascii=True, indent=2)
    f.write('\n')
metadata = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                inventorySha256=hashlib.sha256(before).hexdigest(),
                inventoryKnownReferences=len(known), currentSupportedFiles=len(paths),
                currentMatchedKnown=sum(identity(p) in known for p in paths),
                unseenReferences=len(rows), unseenByStatus=dict(collections.Counter(r['status'] for r in rows)),
                eligibleFilenameYearHints=dict(collections.Counter(str(r['filenameYearHints'][0]) for r in rows
                    if r['status'] == 'filename-2025plus-candidate-not-content-verified')),
                filenamesOnlySha256=hashlib.sha256((OUT / 'filenames-only.local.json').read_bytes()).hexdigest(),
                rgStderrSha256=hashlib.sha256(run.stderr).hexdigest(),
                caseInsensitiveExtensions=True, includesHiddenAndIgnoredFilenames=True,
                sourceBodiesRead=0, newContentCertified=0, questionCredit=0,
                sourceYearStillNeedsContentVerification=True, oldInventoryUnchanged=True,
                protected82OrPermanentExclusionsNotReopened=True, wholeNExtractionComplete=False,
                dbWrites=0, loadable=0)
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(metadata, f, indent=2)
    f.write('\n')
print(json.dumps(metadata))
