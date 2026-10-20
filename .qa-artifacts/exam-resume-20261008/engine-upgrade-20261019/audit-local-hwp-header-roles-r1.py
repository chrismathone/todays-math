"""Observe metadata labels in 98 local quarantines; never certify source dates."""
from pathlib import Path
from collections import Counter
import datetime
import hashlib
import json
import re

BASE = Path('.qa-artifacts/exam-resume-20261008')
OUT = BASE / 'local-hwp-header-roles-20261020-r1'
SCOPES = ['unpaired-hwp-first2-extraction-20261020-r1',
          'unpaired-hwp-remaining-20261020-r1',
          'n-discovered-hwp-first2-quarantine-20261020-r1']


def ref(p):
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())


def labels(text):
    return dict(
        fourDigitYears=sorted(set(map(int, re.findall(r'(?<!\d)(20\d{2})\s*\ub144', text)))),
        twoDigitYearLabels=sorted(set(map(int, re.findall(r'(?<!\d)(\d{2})\s*\ub144', text)))),
        semesters=sorted(set(map(int, re.findall(r'([12])\s*\ud559\uae30', text)))),
        grades=sorted(set(map(int, re.findall(r'([123])\s*\ud559\ub144', text)))),
        mentionsPractice='\ub300\ube44' in text,
        textSha256=hashlib.sha256(text.encode('utf-8')).hexdigest())


assert not OUT.exists()
paths = [p for scope in SCOPES for p in sorted((BASE / scope).glob('*/hwp-question-only-manifest.local.json'))]
assert len(paths) == 98 and len(set(paths)) == 98
rows, flags = [], Counter()
for p in paths:
    before = ref(p)
    d = json.loads(p.read_text(encoding='utf-8-sig'))
    assert d['originalAnswerNotesExported'] is False
    inv = d.get('inventoryAsProvided') or d['inventoryProposal']
    m = inv.get('metadata', inv)
    year = m.get('year', m.get('yearAsProposed'))
    grade = m.get('grade', m.get('gradeAsProposed'))
    semester = m.get('semester', m.get('semesterAsProposed'))
    hs = [dict(role=h['kind'], labels=labels(h['text']), recordSource=h['source']) for h in d['headers']]
    head = [h['labels'] for h in hs if h['role']=='head' and not h['labels']['mentionsPractice']]
    years = sorted({v for h in head for v in h['fourDigitYears']})
    grades = sorted({v for h in head for v in h['grades']})
    semesters = sorted({v for h in head for v in h['semesters']})
    f = []
    if not years: f.append('no-four-digit-nonpractice-head-year-observation')
    if len(years)>1: f.append('multiple-head-year-labels-review-needed')
    if any(v<2025 for v in years): f.append('head-year-before2025-not-authoring-input-until-resolved')
    if years and year not in years: f.append('filename-versus-head-year-label-mismatch')
    if grades and grade not in grades: f.append('filename-versus-head-grade-label-mismatch')
    if semesters and semester not in semesters: f.append('filename-versus-head-semester-label-mismatch')
    if any(h['role']=='foot' and h['labels']['mentionsPractice'] for h in hs):
        f.append('practice-footer-must-not-overwrite-source-metadata')
    flags.update(f)
    rows.append(dict(id=inv.get('examId', inv.get('proposalId')), localManifest=before,
        originalSource=d['source'], proposed=dict(year=year, grade=grade, semester=semester),
        headerRoles=hs, nonPracticeHead=dict(years=years, grades=grades, semesters=semesters),
        observationFlags=f, sourceIdentityApproved=False, sourceYearApproved=False,
        authoringInputApproved=False, sourcePairApproved=False, curriculumApproved=False,
        rightsApproved=False, noFlagsIsNotApproval=True))
    assert ref(p)==before
OUT.mkdir()
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        scope='98 existing local quarantines only, no fresh original or N read',
        entries=rows, documents=len(rows), flagCounts=dict(flags),
        allLocalInputsUnchanged=True, originalQuestionsOrAnswersExported=False,
        twoDigitYearsNotExpandedOrApproved=True, originalWrites=0, dbWrites=0,
        sourceIdentityYearPairOrCurriculumApprovals=0, newSourceQuestionCredit=0,
        canonicalSourceCounterUnchanged=12080, loadable=0), f, ensure_ascii=True, indent=2)
    f.write('\n')
print(json.dumps(dict(documents=len(rows), flagCounts=dict(flags), approvals=0, dbWrites=0)))
