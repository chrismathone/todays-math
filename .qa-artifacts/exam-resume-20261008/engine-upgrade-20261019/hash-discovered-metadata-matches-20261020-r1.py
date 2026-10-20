"""File-byte comparison, never filename-only exam merging or question approval."""
from pathlib import Path
import collections
import datetime
import hashlib
import json
import sys

sys.dont_write_bytecode = True
BASE = Path('.qa-artifacts/exam-resume-20261008')
PROPOSED = BASE / 'n-discovered-metadata-proposals-20261020-r1/metadata-proposals.json'
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
OUT = BASE / 'n-discovered-reference-byte-audit-20261020-r1'
NROOT = Path('N:/\uac1c\uc778/\uae30\ucd9c').resolve(strict=True)
sys.path.insert(0, 'scripts/import/exam-twin')
from source_inventory_scope_v2 import PROTECTED_SCHOOLS


def load(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))


def ref(p):
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())


cache = {}


def file_hash(raw):
    identity = str(Path(raw)).casefold()
    if identity in cache:
        return cache[identity]
    result = dict(path=raw, payloadDecoded=False, contentCertified=False)
    try:
        p = Path(raw).resolve(strict=True)
        assert p.is_relative_to(NROOT) and p.suffix.lower() in ('.hwp', '.pdf') and p.is_file()
        before = p.stat()
        digest = hashlib.sha256()
        with p.open('rb') as f:
            for block in iter(lambda: f.read(1024 * 1024), b''):
                digest.update(block)
        after = p.stat()
        assert (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns)
        result.update(status='file-bytes-hashed-not-source-certified', sha256=digest.hexdigest(),
                      bytes=after.st_size, extension=p.suffix.lower(), stableStatDuringRead=True)
    except Exception as ex:
        result.update(status='individual-reference-hold', errorType=type(ex).__name__, error=str(ex))
    cache[identity] = result
    return result


assert not OUT.exists()
before = [ref(PROPOSED), ref(INVENTORY)]
jobs = {j['examId']: j for j in load(INVENTORY)['jobs']}
groups = [g for g in load(PROPOSED)['groups'] if g['historicalMetadataMatches']]
assert len(groups) == 87
OUT.mkdir()
results = []
for n, group in enumerate(groups, 1):
    known = [jobs[r['examId']] for r in group['historicalMetadataMatches']]
    assert group['schoolAsProvided'] not in PROTECTED_SCHOOLS
    assert group['yearAsProposed'] >= 2025
    if any(j['existingExamIds'] or j['existingQuestionCount'] for j in known):
        row = dict(proposalId=group['proposalId'], status='historical-existing-row-scope-held-not-read')
    else:
        assert all(j['year'] >= 2025 and j['school'] not in PROTECTED_SCHOOLS for j in known)
        old = [file_hash(f['path']) for j in known for f in j['files'] if f.get('ext') in ('hwp', 'pdf')]
        fresh = [file_hash(r['path']) for r in group['references']]
        comparisons = []
        for current in fresh:
            aliases = [r for r in old if r.get('sha256') and r.get('sha256') == current.get('sha256')
                       and r.get('extension') == current.get('extension')]
            comparisons.append(dict(reference=current, exactByteAliases=aliases,
                status='same-format-exact-byte-reference-alias' if aliases else
                       'different-or-unavailable-bytes-content-comparison-still-pending'))
        row = dict(proposalId=group['proposalId'], historicalExamIds=[j['examId'] for j in known],
                   comparisons=comparisons, metadataAndHeadersNotCertified=True,
                   crossFormatHwpPdfCorrespondenceApproved=False, examsMerged=False,
                   questionCredit=0, gradeApproved=False, rightsApproved=False)
    results.append(row)
    with (OUT / 'progress.ndjson').open('a', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(row, ensure_ascii=True) + '\n')
    print(json.dumps(dict(group=n, proposalId=group['proposalId'], refs=len(row.get('comparisons', [])),
                         exactAliases=sum(bool(c['exactByteAliases']) for c in row.get('comparisons', [])))), flush=True)
assert [ref(PROPOSED), ref(INVENTORY)] == before
all_comparisons = [c for r in results for c in r.get('comparisons', [])]
summary = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), immutableInputs=before,
              metadataGroupsRecorded=len(results), newReferencesCompared=len(all_comparisons),
              exactByteAliasReferences=sum(bool(c['exactByteAliases']) for c in all_comparisons),
              remainingContentComparisonReferences=sum(not c['exactByteAliases'] for c in all_comparisons),
              uniqueFilesRead=len(cache), fileReadStatuses=dict(collections.Counter(r['status'] for r in cache.values())),
              results=results, fileHashesNotCrossFormatOrSchoolIdentityApproval=True,
              oldInventoryUnchanged=True, originalFileWrites=0, questionCredit=0, dbWrites=0, loadable=0)
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(summary, f, ensure_ascii=True, indent=2)
    f.write('\n')
print(json.dumps({k: v for k, v in summary.items() if k not in ['results', 'immutableInputs']}))
