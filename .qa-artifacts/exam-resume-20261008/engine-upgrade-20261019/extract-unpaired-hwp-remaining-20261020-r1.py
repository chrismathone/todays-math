"""Quarantine explicit HWP references among 108 jobs without a strict original PDF.

Metadata and parser observations only. Never manufacture a pair, publish originals,
count independently verified questions, or approve a curriculum or rights status.
"""
from pathlib import Path, PureWindowsPath
import datetime
import hashlib
import importlib.util
import json
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
OUT = BASE / 'unpaired-hwp-remaining-20261020-r1'
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
NROOT = Path('N:/\uac1c\uc778/\uae30\ucd9c')
sys.path.insert(0, str(ROOT / 'scripts/import/exam-twin'))
from unpaired_pdf_scope import eligible_unpaired_job, original_pdf_candidates, explicitly_answer_labelled


def load(p):
    return json.loads(Path(p).read_text(encoding='utf-8-sig'))


def ref(p):
    p = Path(p)
    data = p.read_bytes()
    return dict(path=p.as_posix(), sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))


def write(p, value):
    with p.open('x', encoding='utf-8', newline='\n') as f:
        json.dump(value, f, ensure_ascii=True, indent=2)
        f.write('\n')


def module(p, name):
    spec = importlib.util.spec_from_file_location(name, p)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def selected_hwp_reference(job):
    raw = job.get('selectedHwp')
    if type(raw) is not str or not raw or raw != raw.strip():
        return None, 'no-explicit-selected-hwp'
    matches = [f for f in job['files'] if type(f) is dict and f.get('path') == raw]
    if len(matches) != 1:
        return None, 'ambiguous-selected-hwp-file-metadata'
    f = matches[0]
    if (f.get('ext') != 'hwp' or f.get('role') != '\uc644\ub8cc\ubcf8'
            or f.get('completed') is not True or f.get('conflict') is not False
            or any(f.get(k) != job[k] for k in ['school', 'year', 'grade', 'semester'])
            or any(type(f.get(k)) is not int for k in ['year', 'grade', 'semester'])
            or f.get('exam') != job['round']):
        return None, 'selected-hwp-metadata-conflict'
    win = PureWindowsPath(raw)
    expected = PureWindowsPath(str(NROOT))
    if (not win.is_absolute() or not win.is_relative_to(expected)
            or '..' in win.parts or ':' in str(win.relative_to(expected))
            or win.suffix.lower() != '.hwp' or explicitly_answer_labelled(win.stem)):
        return None, 'selected-hwp-path-or-answer-label-hold'
    return f, None


jobs = load(INVENTORY)['jobs']
selected = []
for level, grade in [('middle', 3), ('middle', 2), ('middle', 1), ('high', 1), ('high', 2), ('high', 3)]:
    selected.extend(j for j in jobs if eligible_unpaired_job(j, set(), level=level, grade=grade)
                    and not original_pdf_candidates(j))
assert len(selected) == 108 and len({j['examId'] for j in selected}) == 108
assert not OUT.exists()
reader_path = BASE / 'next-five-extraction-r1/extract_source.py'
converter_path = ROOT / 'scripts/qa/convert-hwp-spans.py'
protected = [ref(INVENTORY), ref(Path(__file__)), ref(reader_path), ref(converter_path)]
protected += [ref(ROOT / 'scripts/import/exam-twin' / name) for name in
              ['unpaired_pdf_scope.py', 'source_inventory_scope_v2.py', 'preflight-unpaired-pdfs.py']]
plan = []
for j in selected:
    f, reason = selected_hwp_reference(j)
    plan.append(dict(examId=j['examId'], metadata={k: j[k] for k in
                     ['school', 'level', 'grade', 'year', 'semester', 'round']},
                     selectedHwp=f['path'] if f else None, routeHold=reason,
                     selectedPairStillNone=True, wholePairCertified=False))
OUT.mkdir()
write(OUT / 'explicit-plan.json', dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
      scope='108-without-strict-original-pdf-reference', rows=plan,
      referenceEligible=sum(p['selectedHwp'] is not None for p in plan),
      immutableInputs=protected, actualNewQuestionObservationCredit=0, dbWrites=0))
reader = module(reader_path, 'captured_readonly_unpaired_remaining_hwp_reader')
converter = module(converter_path, 'captured_readonly_unpaired_remaining_hwp_converter')
reader.HERE, reader.ROOT = OUT, ROOT
resolved_nroot = NROOT.resolve(strict=True)
entries = []
for number, (j, planned) in enumerate(zip(selected, plan), 1):
    record = dict(examId=j['examId'], metadata=planned['metadata'], selectedPairStillNone=True,
                  wholePairCertified=False, curriculumApproved=False, rightsApproved=False,
                  sourceContentCertified=False, actualNewQuestionObservationCredit=0)
    if planned['routeHold']:
        record.update(status='individual-route-hold', reason=planned['routeHold'])
    else:
        try:
            src_path = Path(planned['selectedHwp']).resolve(strict=True)
            assert src_path.is_relative_to(resolved_nroot) and src_path.is_file()
            src = ref(src_path)
            hwp = reader.HwpReader(str(src_path))
            questions = [reader.normalize_hwp(q, converter, {'hand': []})
                         for q in reader.organize_shared_sources(hwp.questions())]
            assert questions, 'No parsed questions; keep this source held'
            folder = (OUT / j['examId']).resolve()
            assert folder.is_relative_to(OUT.resolve())
            folder.mkdir()
            local = folder / 'hwp-question-only-manifest.local.json'
            write(local, dict(kind='unselected-pair-hwp-only-quarantine/v1', source=src,
                  inventoryAsProvided=record, headers=hwp.headers, sections=hwp.sections,
                  questions=questions, originalAnswerNotesExported=False,
                  excludedAnswerNoteCount=len(hwp.excluded), unknownControls=hwp.unknown,
                  originalPdfCorrespondencePending=True, quarantined=True,
                  authorDistributionAllowed=False))
            assert ref(src_path) == src, 'Source bytes changed while reading'
            record.update(status='hwp-only-quarantined-correspondence-pending', source=src,
                          localManifest=ref(local), unverifiedParentCount=len(questions),
                          excludedAnswerNoteCount=len(hwp.excluded),
                          unknownControlCount=len(hwp.unknown),
                          questionDigests=[dict(number=q['number'], digest=q['sourceContentDigest'],
                              unknownOrUnmappedCount=len(q['unmappedItems'])) for q in questions])
        except Exception as error:
            record.update(status='individual-source-hold', errorType=type(error).__name__,
                          error=str(error), doesNotBlockOtherSource=True)
    entries.append(record)
    with (OUT / 'progress.ndjson').open('a', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(record, ensure_ascii=True) + '\n')
    print(json.dumps(dict(step=number, examId=j['examId'], status=record['status'],
                         unverifiedParents=record.get('unverifiedParentCount', 0))), flush=True)
preservation = [dict(path=r['path'], beforeSha256=r['sha256'],
                    afterSha256=ref(r['path'])['sha256']) for r in protected]
assert all(r['beforeSha256'] == r['afterSha256'] for r in preservation)
write(OUT / 'aggregate-receipt.json', dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
      scopeJobs=108, recordedJobs=len(entries), entries=entries,
      quarantinedJobs=sum(e['status'] == 'hwp-only-quarantined-correspondence-pending' for e in entries),
      routeHolds=sum(e['status'] == 'individual-route-hold' for e in entries),
      sourceHolds=sum(e['status'] == 'individual-source-hold' for e in entries),
      unverifiedHwpParents=sum(e.get('unverifiedParentCount', 0) for e in entries),
      preservation=preservation, codeInventoryBytesPreserved=True,
      existingCanonicalSourceObservationCountUnchanged=12080,
      pairOrContentCertifications=0, actualNewQuestionObservationCredit=0,
      gradeApprovals=0, rightsApprovals=0, twins=0, loadable=0, dbWrites=0))
