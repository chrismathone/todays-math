import unittest
from source_inventory_scope_v2 import eligible_source_job, selection_policy, LEVELS, PROTECTED_SCHOOLS


class StrictSourceScopeTest(unittest.TestCase):
    def setUp(self):
        self.job = dict(examId='new-source', school='새학교', level='중', grade=3,
                        year=2025, status='readyForExtraction',
                        selectedPair={'hwp': 'source.hwp', 'pdf': 'source.pdf'},
                        existingExamIds=[], existingQuestionCount=0)

    def test_all_six_explicit_scopes_and_matching_policy_labels(self):
        for level, label in LEVELS.items():
            for grade in (1, 2, 3):
                self.assertTrue(eligible_source_job(dict(self.job, level=label, grade=grade),
                                                    set(), level=level, grade=grade))
                policy = selection_policy(level, grade)
                self.assertIn(f'{level} grade{grade}', policy)
                self.assertIn('pending', policy)
                self.assertFalse(eligible_source_job(dict(self.job, year=2024), set(),
                                                     level=level, grade=grade))

    def test_malformed_pair_and_unknown_registration_metadata_are_held(self):
        fields = {
            'selectedPair': [None, True, 1, 'false', ['pair'], {}, {'pdf': 'x'}, {'hwp': 'x'},
                             {'pdf': None, 'hwp': None}, {'pdf': '', 'hwp': 'x'},
                             {'pdf': 'x', 'hwp': ' '}],
            'existingExamIds': [None, False, 0, '', {}, (), ['existing']],
            'existingQuestionCount': [None, False, 0.0, '', {}, [], '0', -1, 1],
        }
        for field, values in fields.items():
            for value in values:
                self.assertFalse(eligible_source_job(dict(self.job, **{field: value}), set()),
                                 (field, value))
            missing = dict(self.job)
            del missing[field]
            self.assertFalse(eligible_source_job(missing, set()))

    def test_protected_seen_and_scalar_corruption_preserve_exclusions(self):
        self.assertFalse(eligible_source_job(self.job, {'new-source'}))
        for school in PROTECTED_SCHOOLS:
            self.assertFalse(eligible_source_job(dict(self.job, school=school), set()))
        for field, values in {'year': [True, 2025.0, '2025'], 'grade': [True, 3.0, '3'],
                              'examId': ['', ' '], 'school': ['', ' ']}.items():
            for value in values:
                self.assertFalse(eligible_source_job(dict(self.job, **{field: value}), set()))
        class Derived(dict):
            pass
        self.assertFalse(eligible_source_job(Derived(self.job), set()))

    def test_scope_validation_and_no_caller_mutation(self):
        before = repr(self.job)
        self.assertTrue(eligible_source_job(self.job, frozenset()))
        self.assertEqual(repr(self.job), before)
        for grade in (True, 0, 4, '3', None):
            with self.assertRaises(ValueError):
                selection_policy('middle', grade)
        for level in ('elementary', '', None):
            with self.assertRaises(ValueError):
                eligible_source_job(self.job, set(), level=level)


if __name__ == '__main__':
    unittest.main()
