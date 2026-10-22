"""Conservative answer comparison: formatting is not permission to erase meaning."""
import unittest
from verify import compare_answers, diagnostic_candidate


class ReviewTests(unittest.TestCase):
    def test_exact_rationals(self):
        for a, b in [('0.5', r'\frac{1}{2}'), ('+2.7', '27/10'),
                     ('⑴ 1/2 ⑵ -0.5', '⑴ 0.5 ⑵ -1/2'), ('8, 16, 24', '8,16,24')]:
            with self.subTest(a=a): self.assertEqual(compare_answers(a, b)['verdict'], 'match')

    def test_units_roles_order_and_bad_fractions_not_collapsed(self):
        for a, b in [(r'\frac{1}{2}3', '1.5'), ('12', '1 2'), ('3cm', '3m'),
                     ('⑴ 1 ⑵ 2', '⑴ 2 ⑵ 1'), ('1,2', '2,1'), ('x=1', 'y=1'),
                     ('x(1)', '1'), ('0.5', '50%'), ('2/0', '0')]:
            with self.subTest(a=a, b=b): self.assertNotEqual(compare_answers(a, b)['verdict'], 'match')
        self.assertEqual(compare_answers('2x+2', '2(x+1)')['verdict'], 'hold')

    def test_diagnostic_extraction_is_unambiguous(self):
        obj = '{"status":"solved","answer":"5","reasoning":"2+3=5"}'
        self.assertEqual(diagnostic_candidate('```json\n'+obj+'\n```')['answer'], '5')
        self.assertIsNone(diagnostic_candidate(obj+'\n'+obj.replace('"5"', '"6"')))
        self.assertIsNone(diagnostic_candidate('{"status":"solved","answer":"5","answer":"6","reasoning":"ok"}'))


if __name__ == '__main__': unittest.main()
