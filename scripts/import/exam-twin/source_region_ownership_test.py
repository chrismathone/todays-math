import unittest
from source_region_ownership import audit_region_ownership


def q(n, boxes):
    return {'number': n, 'regions': boxes}


def box(y0, y1, page=1, column=0):
    return {'page': page, 'column': column, 'bbox': [55, y0, 375, y1]}


class RegionOwnershipTest(unittest.TestCase):
    def test_cross_question_contamination_and_shared_context_stay_unapproved(self):
        # Captured shape: q13 reaches back over q8-10; q10 also includes q11's intro.
        rows = [q(8, [box(83, 375, 2)]), q(9, [box(381, 602, 2)]),
                q(10, [box(608, 943, 2), box(83, 291, 2, 1)]),
                q(11, [box(83, 461, 2, 1)]),
                q(13, [box(103, 943, 2), box(765, 943, 2, 1)])]
        out = audit_region_ownership(rows)
        self.assertEqual({tuple(r['questions']) for r in out['overlaps']},
                         {(8, 13), (9, 13), (10, 13), (10, 11)})
        self.assertFalse(out['questionContentCertified'])
        self.assertFalse(out['regionsModified'])
        self.assertFalse(out['mathPixelsUsed'])

    def test_touching_disjoint_page_or_column_does_not_cross_assign(self):
        out = audit_region_ownership([q(1, [box(10, 20)]), q(2, [box(20, 30)]),
                                      q(3, [box(10, 20, 2)]), q(4, [box(10, 20, 1, 1)])])
        self.assertEqual(out['overlaps'], [])
        self.assertEqual(out['status'], 'no-overlap-observed')
        self.assertFalse(out['authorDistributionAllowed'])

    def test_intentional_shared_material_requires_explicit_review(self):
        out = audit_region_ownership([q(11, [box(80, 180)]), q(12, [box(80, 180)])])
        self.assertEqual(out['flaggedQuestionNumbers'], [11, 12])
        self.assertEqual(out['status'], 'review-required')

    def test_invalid_or_missing_layout_is_not_silently_certified(self):
        for rows in [[], [q(1, [])], [q(1, [box(20, 10)])],
                     [q(1, [box(10, float('nan'))])],
                     [q(1, [box(10, 20)]), q(1, [box(30, 40)])]]:
            with self.assertRaises(ValueError):
                audit_region_ownership(rows)


if __name__ == '__main__':
    unittest.main()
