"""One-time raw pre-exposure seal, without author/private or repository helpers."""
import sys
sys.dont_write_bytecode = True
from pathlib import Path
import hashlib, json, datetime
R = Path(__file__).resolve().parent
SCOPE = R.parent
REPO = R.parents[3]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p): return json.loads(p.read_text(encoding='utf-8'))
dest = R/'solve-freeze.json'
assert not dest.exists(), 'Do not rewrite an existing blind seal'
manifest = read(R/'blind-manifest.json')
audit = read(R/'input-audit.json')
summary = read(R/'solve-summary.json')
assert not audit['freshNewGF15AnswerExposure']
assert summary['counts']['solved'] == 14 and summary['counts']['pending'] == 1
assert sha(R/'student-problems.json') == manifest['studentProblemsSha256'] == audit['studentInputRawSha256']
for f in manifest['figures']: assert sha(R/f['path']) == f['sha256']
preservation = read(R/'preservation.json')
assert len(preservation['files']) == 917
for f in preservation['files']: assert sha(REPO/f['path']) == f['sha256'], f['path']
solves = []
for q in read(R/'student-problems.json'):
    p = R/f"solve/q{q['questionNumber']:02}.json"
    solve = read(p)
    assert solve['studentDigest'] == q['studentDigest']
    assert solve['status'] == ('pending' if q['questionNumber'] == 18 else 'solved')
    solves.append({'questionNumber': q['questionNumber'], 'studentDigest': q['studentDigest'],
                   'path': p.relative_to(SCOPE).as_posix(), 'rawSolveSha256': sha(p), 'status': solve['status']})
files = [{'path': p.relative_to(SCOPE).as_posix(), 'rawSha256': sha(p), 'bytes': p.stat().st_size}
         for p in sorted(SCOPE.rglob('*')) if p.is_file() and p.name not in ['solve-freeze.json','validation-report.json']]
assert all('__pycache__' not in f['path'] for f in files)
payload = {
    'schemaVersion': 1, 'scope': 'GF15 raw independent blind; not final author review',
    'originalSessionId': '01a1177e-fbb2-7822-a7e2-51c40b39e38f',
    'solverId': audit['solverId'], 'sealedBeforeAuthorExposureAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'newGF15AuthorAnswerExposure': False, 'priorKnowledgeDisclosure': 'blind/input-audit.json',
    'opaquePackageDigestProvided': manifest['packageDigest'],
    'rawInputSha256': sha(R/'student-problems.json'), 'rawManifestSha256': sha(R/'blind-manifest.json'),
    'rawBriefSha256': sha(R/'SOLVE-BRIEF.md'), 'suppliedFigures': manifest['figures'],
    'calculationCodeRawSha256': sha(R/'calculation.py'), 'calculationOutputRawSha256': sha(R/'calculation-output.json'),
    'counts': summary['counts'], 'solves': solves, 'files': files,
    'previous917BytesUnchanged': True, 'providedDigestsReplaced': False,
    'rightsCleared': False, 'nativeApproved': False, 'loadable': False,
    'authorAnswerComparison': 'not exposed; await separate Root authorization after raw commit'
}
dest.write_bytes((json.dumps(payload, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
print(json.dumps({'sealed': len(solves), 'solved': 14, 'pending': 1, 'rawSealSha256': sha(dest),
                  'preExposureUtc': payload['sealedBeforeAuthorExposureAtUtc'], 'boundFiles': len(files)}))
