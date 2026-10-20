"""Strict metadata boundary and scope label; neither proves source nor grade fit."""
LEVELS = {'middle': '중', 'high': '고'}
PROTECTED_SCHOOLS = frozenset({'동도중', '강동중', '경산여중', '정화중'})


def _scope(level, grade):
    if level not in LEVELS or type(grade) is not int or grade not in (1, 2, 3):
        raise ValueError('Explicit supported school level and grade required')


def eligible_source_job(job, seen, *, level='middle', grade=3):
    _scope(level, grade)
    if type(job) is not dict:
        return False
    pair = job.get('selectedPair')
    if (type(pair) is not dict
            or any(type(pair.get(key)) is not str or not pair[key].strip()
                   for key in ('hwp', 'pdf'))):
        return False
    # Unknown registration metadata must never mean "no registered rows".
    if (type(job.get('existingExamIds')) is not list or job['existingExamIds']
            or type(job.get('existingQuestionCount')) is not int
            or job['existingQuestionCount'] != 0):
        return False
    return (type(job.get('examId')) is str and bool(job['examId'].strip())
            and type(job.get('school')) is str and bool(job['school'].strip())
            and job['examId'] not in seen and job['school'] not in PROTECTED_SCHOOLS
            and job.get('level') == LEVELS[level]
            and type(job.get('grade')) is int and job['grade'] == grade
            and type(job.get('year')) is int and job['year'] >= 2025
            and job.get('status') == 'readyForExtraction')


def selection_policy(level, grade):
    _scope(level, grade)
    return (f'unparsed 2025+ {level} grade{grade} selected HWP/PDF pair; '
            'protected schools and known parsed/registered IDs excluded; '
            'original questions quarantined; source identity, student curriculum '
            'and rights approvals remain separate and pending')
