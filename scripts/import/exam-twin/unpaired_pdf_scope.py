"""Original PDF references for jobs without a selected pair. Metadata only.

This does not manufacture an HWP/PDF pair or certify source identity/curriculum.
"""
from pathlib import PureWindowsPath
from source_inventory_scope_v2 import LEVELS, PROTECTED_SCHOOLS, selection_policy


def eligible_unpaired_job(job, seen, *, level, grade):
    selection_policy(level, grade)  # Keep the supported explicit scope contract.
    if type(job) is not dict:
        return False
    return (
        'selectedPair' in job and job['selectedPair'] is None
        and type(job.get('examId')) is str and bool(job['examId'])
        and job['examId'] == job['examId'].strip() and job['examId'] not in seen
        and type(job.get('school')) is str and bool(job['school'])
        and job['school'] == job['school'].strip()
        and job['school'] not in PROTECTED_SCHOOLS
        and type(job.get('existingExamIds')) is list and not job['existingExamIds']
        and type(job.get('existingQuestionCount')) is int
        and job['existingQuestionCount'] == 0
        and job.get('level') == LEVELS[level]
        and type(job.get('grade')) is int and job['grade'] == grade
        and type(job.get('year')) is int and job['year'] >= 2025
        and type(job.get('semester')) is int and job['semester'] in (1, 2)
        and job.get('round') in ('중간', '기말')
        and job.get('status') == 'readyForExtraction'
        and type(job.get('files')) is list and bool(job['files'])
    )


def original_pdf_candidates(job):
    """Fail closed on ambiguous file metadata; keep separate PDF references.

    Names/roles only select references. They never prove content equivalence or
    absence of answers. The caller must still quarantine every parser output.
    """
    result, seen = [], set()
    for entry in job['files']:
        if type(entry) is not dict:
            continue
        raw = entry.get('path')
        if (type(raw) is not str or not raw or raw != raw.strip()
                or entry.get('ext') != 'pdf' or entry.get('role') != '원본'
                or entry.get('conflict') is not False
                or entry.get('school') != job['school']
                or type(entry.get('year')) is not int or entry['year'] != job['year']
                or type(entry.get('grade')) is not int or entry['grade'] != job['grade']
                or type(entry.get('semester')) is not int
                or entry['semester'] != job['semester']
                or entry.get('exam') != job['round']):
            continue
        path = PureWindowsPath(raw)
        expected = PureWindowsPath('N:/개인/기출')
        if (not path.is_absolute() or not path.is_relative_to(expected)
                or '..' in path.parts or path.suffix.lower() != '.pdf'
                or ':' in str(path.relative_to(expected))
                or any(word in path.name for word in ('답안', '해답', '정답', '해설'))):
            continue
        identity = str(path).casefold()
        if identity not in seen:
            seen.add(identity)
            result.append(entry)
    return result
