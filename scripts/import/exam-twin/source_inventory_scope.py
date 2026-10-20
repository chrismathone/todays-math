"""Deterministic extraction scope only; no source, grade or rights approval."""
LEVELS = {'middle': '\uC911', 'high': '\uACE0'}
PROTECTED_SCHOOLS = {'동도중', '강동중', '경산여중', '정화중'}


def eligible_source_job(job, seen, *, level='middle', grade=3):
    if level not in LEVELS or type(grade) is not int or grade not in (1, 2, 3):
        raise ValueError('Explicit supported school level and grade required')
    if not isinstance(job, dict):
        return False
    return (isinstance(job.get('examId'), str) and bool(job['examId'])
            and isinstance(job.get('school'), str) and bool(job['school'])
            and job['examId'] not in seen and job['school'] not in PROTECTED_SCHOOLS
            and job.get('level') == LEVELS[level]
            and type(job.get('grade')) is int and job['grade'] == grade
            and type(job.get('year')) is int and job['year'] >= 2025
            and job.get('status') == 'readyForExtraction' and bool(job.get('selectedPair'))
            and not job.get('existingExamIds') and not job.get('existingQuestionCount'))
