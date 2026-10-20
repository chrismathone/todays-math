"""Original PDF references for jobs without a selected pair. Metadata only.

This does not manufacture an HWP/PDF pair or certify source identity/curriculum.
"""
from pathlib import PureWindowsPath
import re
from source_inventory_scope_v2 import LEVELS, PROTECTED_SCHOOLS, selection_policy


def safe_output_id(value):
    """One ordinary Windows directory component, never an absolute path/ADS."""
    return (type(value) is str
            and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}', value) is not None
            and re.fullmatch(r'(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])', value) is None)


def explicitly_answer_labelled(name):
    """Bounded filename tokens only; absence never certifies answer-free content."""
    return (any(word in name for word in ('답안', '해답', '정답', '해설'))
            or re.search(r'(?<![A-Za-z0-9가-힣])답(?:포함|지|만|수록|있음)?(?:[-_ ]?[0-9]+)?(?![A-Za-z0-9가-힣])', name) is not None
            or re.search(r'(?i)(?<![A-Za-z0-9])(?:answers?|solutions?)(?:[-_ ]?key)?(?:[-_ ]?[0-9]+)?(?![A-Za-z0-9])', name) is not None)


def eligible_unpaired_job(job, seen, *, level, grade):
    selection_policy(level, grade)  # Keep the supported explicit scope contract.
    if type(job) is not dict:
        return False
    return (
        'selectedPair' in job and job['selectedPair'] is None
        and safe_output_id(job.get('examId')) and job['examId'] not in seen
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
                or explicitly_answer_labelled(path.stem)):
            continue
        identity = str(path).casefold()
        if identity not in seen:
            seen.add(identity)
            result.append(entry)
    return result
