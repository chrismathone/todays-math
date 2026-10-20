"""Two explicit unselected-pair HWP references; local quarantine, no count credit."""
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'unpaired-hwp-first2-extraction-20261020-r1'
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
sys.path.insert(0, str(ROOT / 'scripts/import/exam-twin'))
from unpaired_pdf_scope import eligible_unpaired_job, safe_output_id


def load(p):
    return json.loads(Path(p).read_text(encoding='utf-8-sig'))


def ref(p):
    p = Path(p)
    raw = p.read_bytes()
    return dict(path=p.as_posix(), sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))


def module(p, name):
    spec = importlib.util.spec_from_file_location(name, p)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


jobs = {j['examId']: j for j in load(INVENTORY)['jobs']}
ids = ['personal-273b85b46b6ea294fef26b4de34becfc', 'personal-59bbe8ebff319ec20b823103fa6c5e8d']
for job_id in ids:
    assert eligible_unpaired_job(jobs[job_id], set(), level='middle', grade=3)
    assert safe_output_id(job_id)
    j = jobs[job_id]
    assert j['selectedPair'] is None
    assert type(j.get('selectedHwp')) is str
    entries = [f for f in j['files'] if f.get('path') == j['selectedHwp']]
    assert len(entries) == 1
    f = entries[0]
    assert f['ext'] == 'hwp' and f['role'] == '완료본'
    assert f['completed'] is True and f['conflict'] is False
    assert all(f[k] == j[k] for k in ['school', 'year', 'grade', 'semester'])
    assert f['exam'] == j['round']
    path = Path(f['path']).resolve(strict=True)
    assert path.is_relative_to(Path('N:/개인/기출').resolve(strict=True))

reader_path = BASE / 'next-five-extraction-r1/extract_source.py'
converter_path = ROOT / 'scripts/qa/convert-hwp-spans.py'
old = [ref(INVENTORY), ref(Path(__file__)), ref(reader_path), ref(converter_path),
       ref(ROOT / 'scripts/import/exam-twin/unpaired_pdf_scope.py'),
       ref(BASE / 'unpaired-pdf-preflight-20261020-r1/aggregate-receipt.json')]
reader = module(reader_path, 'unpaired_hwp_captured_readonly_reader')
converter = module(converter_path, 'unpaired_hwp_captured_converter')
OUT.mkdir()
reader.HERE, reader.ROOT = OUT, ROOT
entries = []
for job_id in ids:
    j = jobs[job_id]
    record = {k: j[k] for k in ['examId', 'school', 'year', 'grade', 'semester', 'round']}
    record.update(selectedPairStillNone=True, wholePairCertified=False, contentApproved=False,
                  curriculumApproved=False, rightsApproved=False, authorDistributionAllowed=False)
    try:
        src = ref(j['selectedHwp'])
        old.append(src)
        hwp = reader.HwpReader(j['selectedHwp'])
        questions = [reader.normalize_hwp(q, converter, {'hand': []})
                     for q in reader.organize_shared_sources(hwp.questions())]
        assert questions
        folder = (OUT / job_id).resolve()
        assert folder.is_relative_to(OUT.resolve())
        folder.mkdir()
        local = folder / 'hwp-question-only-manifest.local.json'
        with local.open('x', encoding='utf-8', newline='\n') as f:
            json.dump(dict(kind='unselected-pair-hwp-only-quarantine/v1', source=src,
                           inventoryAsProvided=record, headers=hwp.headers, sections=hwp.sections,
                           questions=questions, originalAnswerNotesExported=False,
                           excludedAnswerNoteCount=len(hwp.excluded), unknownControls=hwp.unknown,
                           originalPdfCorrespondencePending=True, quarantined=True,
                           authorDistributionAllowed=False), f, ensure_ascii=False, indent=2)
            f.write('\n')
        record.update(status='hwp-only-quarantined-correspondence-pending', source=src,
                      localManifest=ref(local), unverifiedParentCount=len(questions),
                      excludedAnswerNoteCount=len(hwp.excluded), unknownControlCount=len(hwp.unknown),
                      questions=[dict(number=q['number'], sourceContentDigest=q['sourceContentDigest'],
                                      choices=len(q['choices']), formulas=len(q['mathExpressions']),
                                      figures=len(q['hwpFigureRecords']),
                                      scoreOccurrenceCount=len(q['printedScoreOccurrences']),
                                      unmappedCount=len(q['unmappedItems']), approved=False)
                                 for q in questions])
    except Exception as error:
        record.update(status='individual-source-hold', errorType=type(error).__name__,
                      error=str(error), doesNotBlockOtherSource=True)
    entries.append(record)
    print(json.dumps({k: v for k, v in record.items() if k in ['examId', 'status', 'unverifiedParentCount', 'unknownControlCount', 'errorType']}), flush=True)
preservation = [dict(path=r['path'], beforeSha256=r['sha256'], afterSha256=ref(r['path'])['sha256']) for r in old]
assert all(r['beforeSha256'] == r['afterSha256'] for r in preservation)
receipt = dict(kind='two-explicit-unselected-pair-hwp-quarantine-aggregate/v1',
               utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), entries=entries,
               sourceCodeInventoryAndPriorBytesPreserved=True, preservation=preservation,
               existingCanonicalSourceObservationCountUnchanged=12080,
               unverifiedHwpParents=sum(e.get('unverifiedParentCount', 0) for e in entries),
               hwpPdfPairOrSourceContentCertifications=0, actualNewQuestionObservationCredit=0,
               gradeApprovals=0, rightsApprovals=0, twins=0, dbWrites=0, loadable=0)
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(receipt, f, ensure_ascii=True, indent=2)
    f.write('\n')
