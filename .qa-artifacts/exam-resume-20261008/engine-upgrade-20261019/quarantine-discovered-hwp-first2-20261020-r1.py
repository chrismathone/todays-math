"""Read-only quarantine of two new filename proposals, not approved extraction."""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
PROPOSALS = BASE / 'n-discovered-metadata-proposals-20261020-r1/metadata-proposals.json'
OUT = BASE / 'n-discovered-hwp-first2-quarantine-20261020-r1'
NROOT = Path('N:/\uac1c\uc778/\uae30\ucd9c').resolve(strict=True)
sys.path.insert(0, str(ROOT / 'scripts/import/exam-twin'))
from source_inventory_scope_v2 import PROTECTED_SCHOOLS
from unpaired_pdf_scope import explicitly_answer_labelled, safe_output_id


def load(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))


def ref(p):
    p = Path(p)
    data = p.read_bytes()
    return dict(path=p.as_posix(), sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))


def module(p, name):
    spec = importlib.util.spec_from_file_location(name, p)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


assert not OUT.exists()
groups = {g['proposalId']: g for g in load(PROPOSALS)['groups']}
ids = ['discovered-exam-a8c06e129904834d9cee2b24', 'discovered-exam-6d226bc692321e05b1cf3a84']
inputs = [ref(PROPOSALS), ref(Path(__file__)),
          ref(BASE / 'next-five-extraction-r1/extract_source.py'),
          ref(ROOT / 'scripts/qa/convert-hwp-spans.py')]
selected = []
for id in ids:
    g = groups[id]
    assert safe_output_id(id) and not g['historicalMetadataMatches']
    assert g['schoolAsProvided'] not in PROTECTED_SCHOOLS
    assert g['levelAsProposed'] == 'middle' and g['gradeAsProposed'] == 3
    assert g['yearAsProposed'] == 2025 and g['semesterAsProposed'] == 2
    assert g['roundAsProposed'] == '\uae30\ub9d0'
    candidates = [r for r in g['references'] if r['extension'] == '.hwp']
    assert len(candidates) == 1
    r = candidates[0]
    p = Path(r['path']).resolve(strict=True)
    assert p.is_relative_to(NROOT) and p.suffix.lower() == '.hwp'
    assert re.search(r'\(\s*\uc644\ub8cc\s*\)', p.stem)
    assert not explicitly_answer_labelled(p.stem)
    selected.append((g, p))
OUT.mkdir()
reader = module(BASE / 'next-five-extraction-r1/extract_source.py', 'captured_new_filename_hwp_reader')
converter = module(ROOT / 'scripts/qa/convert-hwp-spans.py', 'captured_new_filename_hwp_converter')
reader.HERE, reader.ROOT = OUT, ROOT
rows = []
for g, p in selected:
    row = dict(proposalId=g['proposalId'], schoolAsProposed=g['schoolAsProvided'],
               yearAsProposed=2025, gradeAsProposed=3, semesterAsProposed=2,
               metadataStillUnapproved=True, pairNotManufactured=True,
               onlyReadOnlyQuarantineObservation=True, curriculumApproved=False,
               sourceIdentityApproved=False, rightsApproved=False)
    try:
        source = ref(p)
        with p.open('rb') as f:
            assert f.read(8) == bytes.fromhex('d0cf11e0a1b11ae1')
        hwp = reader.HwpReader(str(p))
        questions = [reader.normalize_hwp(q, converter, {'hand': []})
                     for q in reader.organize_shared_sources(hwp.questions())]
        assert questions
        folder = OUT / g['proposalId']
        folder.mkdir()
        local = folder / 'hwp-question-only-manifest.local.json'
        data = dict(kind='new-discovered-metadata-proposal-hwp-quarantine/v1',
            source=source, inventoryProposal=g, headers=hwp.headers, sections=hwp.sections,
            questions=questions, originalAnswerNotesExported=False,
            excludedAnswerNoteCount=len(hwp.excluded), unknownControls=hwp.unknown,
            subjectHeaderReviewPending=True, actualYearSemesterHeaderReviewPending=True,
            hwpPdfContentCorrespondencePending=True, authorDistributionAllowed=False)
        with local.open('x', encoding='utf-8', newline='\n') as f:
            json.dump(data, f, ensure_ascii=True, indent=2)
            f.write('\n')
        assert ref(p) == source
        row.update(status='local-hwp-observations-quarantined-not-approved', source=source,
                   localManifest=ref(local), unverifiedParents=len(questions),
                   unknownControls=len(hwp.unknown), excludedAnswerNotes=len(hwp.excluded),
                   questions=[dict(number=q['number'], sourceContentDigest=q['sourceContentDigest'],
                       originalFigureRecords=len(q['hwpFigureRecords']), unmappedItems=len(q['unmappedItems']))
                       for q in questions])
    except Exception as ex:
        row.update(status='individual-source-quarantine-hold', errorType=type(ex).__name__, error=str(ex))
    rows.append(row)
    print(json.dumps({k: v for k, v in row.items() if k in ['proposalId', 'status', 'unverifiedParents', 'unknownControls']}), flush=True)
assert all(ref(r['path']) == r for r in inputs)
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), entries=rows,
        inputs=inputs, metadataProposalsUnchanged=True,
        unverifiedParents=sum(r.get('unverifiedParents', 0) for r in rows),
        canonicalSourceCounterUnchanged=12080, newSourceQuestionCredit=0,
        sourceYearOrHeaderOrSubjectCertifications=0, sourcePairApprovals=0,
        gradeApprovals=0, rightsApprovals=0, originalWrites=0, dbWrites=0, loadable=0),
        f, ensure_ascii=True, indent=2)
    f.write('\n')
