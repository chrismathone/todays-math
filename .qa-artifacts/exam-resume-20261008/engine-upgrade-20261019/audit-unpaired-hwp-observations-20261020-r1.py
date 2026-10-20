"""Inspect immutable local HWP observations; aggregate flags never certify content."""
from pathlib import Path
import collections
import datetime
import hashlib
import json

BASE = Path('.qa-artifacts/exam-resume-20261008')
OUT = BASE / 'unpaired-hwp-observation-audit-20261020-r1'
INPUTS = [BASE / 'unpaired-hwp-first2-extraction-20261020-r1/aggregate-receipt.json',
          BASE / 'unpaired-hwp-remaining-20261020-r1/aggregate-receipt.json']


def load(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))


def ref(p):
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())


assert not OUT.exists()
before = [ref(p) for p in INPUTS]
rows = []
for aggregate in INPUTS:
    for entry in load(aggregate)['entries']:
        if 'localManifest' not in entry:
            continue
        path = Path(entry['localManifest']['path'])
        assert ref(path)['sha256'] == entry['localManifest']['sha256']
        data = load(path)
        assert data['originalAnswerNotesExported'] is False
        questions = data['questions']
        numbers = [q['number'] for q in questions]
        duplicate_numbers = [n for n, count in collections.Counter(numbers).items() if count > 1]
        per_question = []
        for q in questions:
            score = q.get('printedScoreOccurrences', [])
            stem = q.get('stem', '')
            flags = []
            if not stem.strip():
                flags.append('empty-stem')
            if stem.count('$') % 2:
                flags.append('odd-math-delimiter-count-needs-review')
            if q.get('unmappedItems'):
                flags.append('unmapped-source-items')
            if len(score) != 1:
                flags.append('score-occurrence-count-not-one')
            if q.get('questionType') == 'multiple-choice' and len(q.get('choices', [])) != 5:
                flags.append('choice-count-not-five')
            per_question.append(dict(number=q['number'], sourceContentDigest=q['sourceContentDigest'],
                flags=flags, originalFigureRecordCount=len(q.get('hwpFigureRecords', [])),
                scoreOccurrenceCount=len(score), questionBoundaryApproved=False,
                mathApproved=False, gradeApproved=False))
        rows.append(dict(examId=entry['examId'], localManifest=ref(path),
            unverifiedParents=len(questions), duplicateNumbers=duplicate_numbers,
            numberingContiguousFrom1=numbers == list(range(1, len(numbers) + 1)),
            unknownControls=len(data.get('unknownControls', [])),
            excludedAnswerNotes=data.get('excludedAnswerNoteCount'),
            parentsWithAnyStructuralFlags=sum(bool(q['flags']) for q in per_question),
            parentsWithOriginalFigureRecords=sum(q['originalFigureRecordCount'] > 0 for q in per_question),
            questions=per_question, sourceContentCertified=False, wholeHwpPdfPairApproved=False))
assert len(rows) == 96 and sum(r['unverifiedParents'] for r in rows) == 2051
assert [ref(p) for p in INPUTS] == before
OUT.mkdir()
result = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), inputs=before,
    hwpFilesInspected=96, unverifiedParents=2051,
    filesWithUnknownControls=sum(r['unknownControls'] > 0 for r in rows),
    filesWithNoncontiguousNumbering=sum(not r['numberingContiguousFrom1'] for r in rows),
    filesWithDuplicateNumbers=sum(bool(r['duplicateNumbers']) for r in rows),
    parentsWithAnyStructuralFlags=sum(r['parentsWithAnyStructuralFlags'] for r in rows),
    parentsWithOriginalFigureRecords=sum(r['parentsWithOriginalFigureRecords'] for r in rows),
    rows=rows, inputsUnchanged=True, originalBodiesOrAnswerNotesExported=False,
    structuralFlagsNotMathematicalFindings=True, noFlagsDoesNotApproveBoundaries=True,
    canonicalSourceCounterUnchanged=12080, newSourceQuestionCredit=0, sourceApprovals=0,
    gradeApprovals=0, rightsApprovals=0, dbWrites=0, loadable=0)
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(result, f, ensure_ascii=True, indent=2)
    f.write('\n')
print(json.dumps({k: v for k, v in result.items() if k not in ['rows', 'inputs']}))
