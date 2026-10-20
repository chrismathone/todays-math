import unittest
from source_inventory_scope import eligible_source_job, LEVELS, PROTECTED_SCHOOLS


class SourceInventoryScopeTest(unittest.TestCase):
    def setUp(self):
        self.job = dict(examId='new-source', school='새학교', level='중', grade=3,
                        year=2025, status='readyForExtraction', selectedPair=True,
                        existingExamIds=[], existingQuestionCount=0)

    def test_six_explicit_year_grade_scopes_and_old_default(self):
        for level, label in LEVELS.items():
            for grade in (1, 2, 3):
                for year in (2025, 2026, 2027):
                    job = dict(self.job, level=label, grade=grade, year=year)
                    self.assertTrue(eligible_source_job(job, set(), level=level, grade=grade))
                    self.assertEqual(eligible_source_job(job, set()), level == 'middle' and grade == 3)
                    self.assertFalse(eligible_source_job(dict(job, year=2024), set(), level=level, grade=grade))

    def test_protected_existing_or_unready_sources_never_eligible(self):
        self.assertFalse(eligible_source_job(self.job, {'new-source'}))
        for school in PROTECTED_SCHOOLS:
            self.assertFalse(eligible_source_job(dict(self.job, school=school), set()))
        for field, value in [('existingExamIds', ['existing-id']), ('existingQuestionCount', 1),
                             ('selectedPair', False), ('status', 'holdMetadata'),
                             ('school', ''), ('examId', ''), ('level', '초')]:
            self.assertFalse(eligible_source_job(dict(self.job, **{field: value}), set()))

    def test_types_and_explicit_scope_refuse_grade_or_year_coercion(self):
        for value in (True, 3.0, '3', None):
            self.assertFalse(eligible_source_job(dict(self.job, grade=value), set()))
        for value in (True, 2025.0, '2025', None):
            self.assertFalse(eligible_source_job(dict(self.job, year=value), set()))
        for grade in (True, 0, 4, '3', None):
            with self.assertRaises(ValueError):
                eligible_source_job(self.job, set(), grade=grade)
        for level in ('elementary', 'middle3', None):
            with self.assertRaises(ValueError):
                eligible_source_job(self.job, set(), level=level)
        for malformed in (None, [], {}, 'source'):
            self.assertFalse(eligible_source_job(malformed, set()))


if __name__ == '__main__':
    unittest.main()
