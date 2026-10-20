import copy
import unittest
from unpaired_pdf_scope import eligible_unpaired_job, original_pdf_candidates


def fixture():
    f = dict(path='N:/개인/기출/2025/원본.pdf', ext='pdf', role='원본',
             conflict=False, school='새빛중', year=2025, grade=3,
             semester=1, exam='기말')
    return dict(examId='new-only', school='새빛중', selectedPair=None,
                existingExamIds=[], existingQuestionCount=0, level='중',
                grade=3, year=2025, semester=1, round='기말',
                status='readyForExtraction', files=[f])


class UnpairedPdfScopeTest(unittest.TestCase):
    def eligible(self, job):
        return eligible_unpaired_job(job, set(), level='middle', grade=3)

    def test_valid_reference_does_not_require_fake_hwp_pair(self):
        job = fixture()
        before = copy.deepcopy(job)
        self.assertTrue(self.eligible(job))
        self.assertEqual(original_pdf_candidates(job), job['files'])
        self.assertEqual(job, before)
        for school in ('동도중', '강동중', '경산여중', '정화중'):
            self.assertFalse(self.eligible({**job, 'school': school}))
            self.assertFalse(self.eligible({**job, 'school': school + ' '}))

    def test_unknown_or_existing_registration_is_not_empty(self):
        job = fixture()
        for key, values in {
            'selectedPair': [{}, False, '', {'pdf': 'x', 'hwp': 'x'}],
            'existingExamIds': [None, '', {}, ['registered']],
            'existingQuestionCount': [None, False, 0.0, '0', 1],
            'grade': [True, 3.0, '3', 2], 'year': [True, '2025', 2025.0, 2024],
            'semester': [True, 1.0, '1', 0], 'examId': ['', ' new-only'],
            'school': ['', '새빛중 '], 'files': [None, {}, []],
        }.items():
            for value in values:
                with self.subTest(key=key, value=value):
                    self.assertFalse(self.eligible({**job, key: value}))
            missing = {k: v for k, v in job.items() if k != key}
            self.assertFalse(self.eligible(missing))
        self.assertFalse(eligible_unpaired_job(job, {'new-only'}, level='middle', grade=3))

    def test_file_scope_and_answer_references_are_not_silently_selected(self):
        job = fixture()
        f = job['files'][0]
        mutations = [('conflict', None), ('conflict', 0), ('role', '완료본'),
                     ('year', 2024), ('year', True), ('grade', '3'),
                     ('semester', 2), ('school', '다른중'), ('exam', '중간'),
                     ('path', 'N:/개인/기출/2025/정답포함.pdf'),
                     ('path', 'N:/개인/기출/2025/해답포함.pdf')]
        for key, value in mutations:
            with self.subTest(key=key, value=value):
                self.assertEqual(original_pdf_candidates({**job, 'files': [{**f, key: value}]}), [])

    def test_paths_cannot_escape_reference_root_or_use_alternate_stream(self):
        job = fixture()
        for raw in ['C:/개인/기출/원본.pdf', 'N:/다른곳/원본.pdf',
                    'N:/개인/기출/../원본.pdf', 'N:/개인/기출/x:stream.pdf',
                    'N:개인/기출/원본.pdf', '../원본.pdf', '//server/share/원본.pdf',
                    'N:/개인/기출/원본.hwp', 'N:/개인/기출/원본.pdf ']:
            self.assertEqual(original_pdf_candidates({**job, 'files': [{**job['files'][0], 'path': raw}]}), [])
        f = job['files'][0]
        self.assertEqual(len(original_pdf_candidates({**job, 'files': [f, {**f, 'path': f['path'].lower()}]})), 1)

    def test_scope_is_explicit_and_separate(self):
        job = fixture()
        with self.assertRaises(ValueError):
            eligible_unpaired_job(job, set(), level='primary', grade=3)
        with self.assertRaises(ValueError):
            eligible_unpaired_job(job, set(), level='middle', grade=True)
        self.assertFalse(eligible_unpaired_job(job, set(), level='high', grade=3))
        self.assertTrue(eligible_unpaired_job({**job, 'level': '고'}, set(), level='high', grade=3))


if __name__ == '__main__':
    unittest.main()
