"""Conservative metadata proposals only; not an extraction manifest or pair proof."""
from pathlib import Path, PureWindowsPath
import collections
import datetime
import hashlib
import json
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path.cwd()
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
DISCOVERY = BASE / 'n-filename-discovery-20261020-r2/filenames-only.local.json'
OUT = BASE / 'n-discovered-metadata-proposals-20261020-r1'
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
sys.path.insert(0, str(ROOT / 'scripts/import/exam-twin'))
from unpaired_pdf_scope import explicitly_answer_labelled
from source_inventory_scope_v2 import PROTECTED_SCHOOLS


def load(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))


def ref(p):
    return dict(path=p.as_posix(), sha256=hashlib.sha256(p.read_bytes()).hexdigest())


def proposal(row):
    p = PureWindowsPath(row['path'])
    flags = dict(sourceBodiesRead=False, contentYearVerified=False, curriculumApproved=False,
                 rightsApproved=False, sourceIdentityApproved=False, approvedPair=False,
                 subjectVerified=False, extractionAllowed=False, loadable=False)
    result = dict(referenceId='discovered-ref-' + hashlib.sha256(str(p).casefold().encode()).hexdigest()[:24],
                  path=str(p), extension=p.suffix.lower(), **flags)
    tokens = re.findall(r'\[([^\[\]]+)\]', p.stem)
    term = [re.fullmatch(r'(\d{2})-([12])-(\uc911\uac04|\uae30\ub9d0)', t) for t in tokens]
    term = [m for m in term if m]
    if len(tokens) < 3 or len(term) != 1 or tokens[1] not in ('1', '2', '3'):
        return dict(result, status='filename-structure-hold')
    school = tokens[0].strip()
    if not school or school != tokens[0]:
        return dict(result, status='school-token-hold')
    if school in PROTECTED_SCHOOLS:
        return dict(result, schoolAsProvided=school, status='protected-school-excluded')
    if explicitly_answer_labelled(p.stem):
        return dict(result, schoolAsProvided=school, status='explicit-answer-labelled-reference-held')
    if p.suffix.lower() == '.hwpx':
        return dict(result, schoolAsProvided=school, status='hwpx-reader-not-approved-hold')
    m = term[0]
    year, semester, round_name, grade = 2000 + int(m[1]), int(m[2]), m[3], int(tokens[1])
    if row['filenameYearHints'] != [year] or year < 2025:
        return dict(result, status='filename-year-conflict-hold')
    level_hints, grade_hints = set(), set()
    for part in p.parts[:-1]:
        if part in ('\uc911\ud559\uad50',):
            level_hints.add('middle')
        if part in ('\uace0\ub4f1\ud559\uad50',):
            level_hints.add('high')
        match = re.fullmatch(r'(\uc911|\uace0)([123])', part)
        if match:
            level_hints.add('middle' if match[1] == '\uc911' else 'high')
            grade_hints.add(int(match[2]))
    if school.endswith(('\uc911', '\uc911\ud559\uad50')):
        level_hints.add('middle')
    if school.endswith(('\uace0', '\uace0\ub4f1\ud559\uad50')):
        level_hints.add('high')
    if len(level_hints) != 1 or grade_hints - {grade}:
        return dict(result, schoolAsProvided=school, status='level-or-grade-hold')
    result.update(schoolAsProvided=school, levelAsProposed=next(iter(level_hints)), gradeAsProposed=grade,
                  yearAsProposed=year, semesterAsProposed=semester, roundAsProposed=round_name,
                  subjectTokensAsProvided=[t for t in tokens[2:] if not re.fullmatch(
                      r'\d{2}-[12]-(\uc911\uac04|\uae30\ub9d0)', t)],
                  status='metadata-proposed-content-and-subject-unverified')
    return result


assert not OUT.exists()
source = load(DISCOVERY)
rows = [r for r in source['unseen'] if r['status'] == 'filename-2025plus-candidate-not-content-verified']
assert len(rows) == 289
inventory_before = ref(INVENTORY)
jobs = load(INVENTORY)['jobs']
proposals = [proposal(r) for r in rows]
groups = {}
for r in proposals:
    if r['status'] != 'metadata-proposed-content-and-subject-unverified':
        continue
    key = (r['schoolAsProvided'], r['levelAsProposed'], r['gradeAsProposed'],
           r['yearAsProposed'], r['semesterAsProposed'], r['roundAsProposed'])
    groups.setdefault(key, []).append(r)
records = []
for key, refs in sorted(groups.items()):
    school, level, grade, year, semester, round_name = key
    known = [j for j in jobs if j['school'] == school and j['grade'] == grade and j['year'] == year
             and j['semester'] == semester and j['round'] == round_name]
    record = dict(proposalId='discovered-exam-' + hashlib.sha256(json.dumps(key, ensure_ascii=True).encode()).hexdigest()[:24],
                  schoolAsProvided=school, levelAsProposed=level, gradeAsProposed=grade,
                  yearAsProposed=year, semesterAsProposed=semester, roundAsProposed=round_name,
                  references=refs, historicalMetadataMatches=[dict(examId=j['examId'], status=j['status'],
                      existingExamIds=j.get('existingExamIds', [])) for j in known],
                  status='additional-reference-metadata-match-not-content-alias' if known else 'new-exam-metadata-only',
                  subjectDisambiguationPending=True, actualContentGroupingApproved=False,
                  selectedPairNotManufactured=True, approvedForExtraction=False,
                  gradeApproved=False, rightsApproved=False, loadable=False)
    records.append(record)
assert len({r['referenceId'] for r in proposals}) == 289
assert all(not r['extractionAllowed'] and not r['loadable'] for r in proposals)
assert ref(INVENTORY) == inventory_before
OUT.mkdir()
with (OUT / 'metadata-proposals.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(dict(createdAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  groups=records, allReferenceProposals=proposals), f, ensure_ascii=True, indent=2)
    f.write('\n')
aggregate = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), input=ref(DISCOVERY),
                 inventory=inventory_before, proposed=ref(OUT / 'metadata-proposals.json'),
                 referenceCount=289, referenceStatuses=dict(collections.Counter(r['status'] for r in proposals)),
                 metadataGroups=len(records), groupStatuses=dict(collections.Counter(r['status'] for r in records)),
                 sourceBodiesRead=0, pairCertifications=0, sourceQuestionCredit=0,
                 oldInventoryBytesPreserved=True, dbWrites=0, loadable=0)
with (OUT / 'aggregate-receipt.json').open('x', encoding='utf-8', newline='\n') as f:
    json.dump(aggregate, f, indent=2)
    f.write('\n')
print(json.dumps(aggregate))
