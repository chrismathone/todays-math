"""Read-only date-label observations, never source identity/year approval."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
INPUT = BASE / 'n-discovered-hwp-first2-quarantine-20261020-r1/aggregate-receipt.json'
OUT = BASE / 'n-discovered-first2-header-labels-20261020-r1'
NROOT = Path('N:/\uac1c\uc778/\uae30\ucd9c').resolve(strict=True)
sys.path.insert(0, str(ROOT / 'scripts/import/exam-twin'))
from unpaired_pdf_scope import explicitly_answer_labelled
import fitz


def load(p):
    return json.loads(Path(p).read_text(encoding='utf-8-sig'))


def ref(p):
    p = Path(p)
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return dict(path=p.as_posix(), sha256=h.hexdigest(), bytes=p.stat().st_size)


def labels(text):
    return dict(
        fourDigitYears=sorted(set(map(int, re.findall(r'(?<!\d)(20\d{2})\s*\ub144', text)))),
        twoDigitYearLabels=sorted(set(map(int, re.findall(r'(?<!\d)(\d{2})\s*\ub144', text)))),
        semesters=sorted(set(map(int, re.findall(r'([12])\s*\ud559\uae30', text)))),
        middleGrades=sorted(set(map(int, re.findall(r'([123])\s*\ud559\ub144', text)))),
        mentionsMath='\uc218\ud559' in text,
        mentionsFinal='\uae30\ub9d0' in text,
        mentionsPractice='\ub300\ube44' in text,
        rawTextSha256=hashlib.sha256(text.encode('utf-8')).hexdigest())


assert not OUT.exists()
input_ref = ref(INPUT)
rows = []
for entry in load(INPUT)['entries']:
    local = Path(entry['localManifest']['path'])
    assert ref(local) == entry['localManifest']
    d = load(local)
    row = dict(proposalId=entry['proposalId'], hwpSource=entry['source'],
               localManifest=ref(local), metadataStillUnapproved=True,
               hwpHeaderLabels=[dict(kind=h['kind'], labels=labels(h['text']),
                                    recordSource=h['source']) for h in d['headers']],
               pdfReferences=[])
    for r in d['inventoryProposal']['references']:
        if r['extension'] != '.pdf':
            continue
        result = dict(referenceId=r['referenceId'], contentPairApproved=False,
                      sourceYearOrSemesterApproved=False)
        try:
            p = Path(r['path']).resolve(strict=True)
            assert p.is_relative_to(NROOT) and p.suffix.lower() == '.pdf'
            assert not explicitly_answer_labelled(p.stem)
            source = ref(p)
            with p.open('rb') as f:
                assert f.read(5) == b'%PDF-'
            with fitz.open(p) as doc:
                assert not doc.needs_pass and 1 <= len(doc) <= 80
                page = doc[0]
                # Only metadata regions; no question parsing or image rendering.
                top = page.get_text(clip=fitz.Rect(0, 0, page.rect.width, 105))
                bottom = page.get_text(clip=fitz.Rect(0, page.rect.height-85,
                                                      page.rect.width, page.rect.height))
                result.update(status='native-header-regions-observed-unverified',
                    source=source, pageCount=len(doc), pageSize=[page.rect.width, page.rect.height],
                    top=labels(top), bottom=labels(bottom),
                    nativeTextCharacters=len(top)+len(bottom),
                    actualVisualInspection=False, scanOcrRequested=False)
            assert ref(p) == source
        except Exception as ex:
            result.update(status='individual-reference-hold', errorType=type(ex).__name__,
                          error=str(ex))
        row['pdfReferences'].append(result)
    row.update(sourceIdentityApproved=False, actualYearSemesterApproved=False,
               authorDistributionAllowed=False, curriculumApproved=False,
               rightsApproved=False, originalQuestionsOrAnswersExported=False,
               interpretation='Head and practice-footer labels describe potentially different roles. No automatic year/semester correction or content-pair assertion.')
    rows.append(row)
assert ref(INPUT) == input_ref
OUT.mkdir()
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        input=input_ref, script=ref(Path(__file__)), entries=rows,
        twoDigitYearExpansionIsNotSourceYearEvidence=True,
        sourcePairApprovals=0, sourceYearApprovals=0, newSourceQuestionCredit=0,
        canonicalSourceCounterUnchanged=12080, originalWrites=0,
        dbWrites=0, loadable=0), f, ensure_ascii=True, indent=2)
    f.write('\n')
print(json.dumps(dict(groups=len(rows), pdfReferences=sum(len(r['pdfReferences']) for r in rows),
                      sourceApprovals=0, dbWrites=0)))
