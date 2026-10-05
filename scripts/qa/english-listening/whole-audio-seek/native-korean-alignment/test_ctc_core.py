"""Regression checks for repeated CTC labels and missing-text forced paths."""
import itertools
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np

from ctc_core import END, L, T, V, checked, immutable_json, literal_instruction, normalize, number, reference, viterbi


class CoreTests(unittest.TestCase):
    def test_number_mapping_boundaries(self):
        self.assertEqual([number(n) for n in (1, 10, 11, 16, 20, 21, 50)],
                         ['일', '십', '십일', '십육', '이십', '이십일', '오십'])
        for n in (0, 51, True):
            with self.assertRaises(ValueError):
                number(n)

    def test_literal_digit_and_jamo_spans(self):
        vocab = {c: i for i, c in enumerate(set(L + V + T))}
        result = normalize('16번입니다. 다음을 듣고 고르세요.', vocab)
        self.assertEqual(result['normalizedText'], '십육번입니다 다음을 듣고 고르세요')
        self.assertEqual(''.join(t['text'] for t in result['tokens'][:6]), 'ㅅㅣㅂㅇㅠㄱ')
        self.assertTrue(all(t['rawStart'] == 0 and t['rawEnd'] == 2 for t in result['tokens'][:6]))
        self.assertEqual(result['numberTokenEnd'], 6)
        with self.assertRaises(ValueError):
            normalize('1번 영어2를 고르세요.', vocab)

    def test_syllable_vocab_never_drops_unknown_characters(self):
        r = normalize('1번 입니다.', {'일': 0, '번': 1, '입': 2, '니': 3, '다': 4, '|': 5}, 'syllable')
        self.assertEqual([t['text'] for t in r['tokens']], ['일', '번', '|', '입', '니', '다'])
        with self.assertRaises(ValueError):
            normalize('1번 ABC', {'일': 0, '번': 1}, 'syllable')
        with self.assertRaises(ValueError):
            normalize('1번 거', {'일': 0, '번': 1}, 'syllable')

    def test_repeat_requires_blank_and_short_clip_no_path(self):
        logp = np.log(np.array([[.1, .9], [.9, .1], [.1, .9]]))
        r = viterbi(logp, [1, 1], 0)
        self.assertEqual(r['statePath'], [1, 2, 3])
        self.assertEqual(viterbi(logp[:2], [1, 1], 0)['status'], 'no_ctc_path')

    def test_dp_matches_bruteforce_ctc_best_path(self):
        rng = np.random.default_rng(32)
        probs = rng.random((5, 3))
        probs /= probs.sum(axis=1, keepdims=True)
        logp = np.log(probs)
        for target in ([1, 2], [1, 1], [2]):
            scores = []
            for path in itertools.product(range(3), repeat=5):
                collapsed = [k for k, _ in itertools.groupby(path) if k != 0]
                if collapsed == target:
                    scores.append(sum(logp[t, k] for t, k in enumerate(path)))
            r = viterbi(logp, target, 0)
            self.assertAlmostEqual(r['pathLogProbability'], max(scores), places=12)

    def test_absent_target_still_has_forced_path(self):
        # Greedy path is all blank; supplied target still gets a plausible timing.
        logp = np.log(np.array([[.99, .005, .005]] * 8))
        r = viterbi(logp, [1, 2], 0)
        self.assertEqual(r['status'], 'forced_path_found')
        self.assertLess(r['tokenSpans'][0]['geometricMeanPosterior'], .01)

    def test_only_exact_complete_reliable_literal_is_copied(self):
        p = {'overflow': False, 'segments': [{'id': 1, 'text': '1번입니다. 다음을 듣고 고르세요. Hello.',
             'localStartSeconds': 0, 'localEndSeconds': 5, 'uncertain': False}]}
        cue = lambda text: ([1], '') if text.startswith('1번') else (None, text)
        r = literal_instruction(p, lambda s: s['uncertain'], cue)
        self.assertEqual(r['text'], '1번입니다. 다음을 듣고 고르세요.')
        span = r['spans'][0]
        self.assertEqual(span['text'], p['segments'][0]['text'][span['rawStartCharacter']:span['rawEndCharacter']])
        p['segments'][0]['uncertain'] = True
        with self.assertRaises(ValueError):
            literal_instruction(p, lambda s: s['uncertain'], cue)

    def test_hash_binding_and_immutable_write(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'a.json'
            immutable_json(p, {'x': 1})
            ref = reference(p)
            self.assertEqual(checked(ref), {'x': 1})
            with self.assertRaises(FileExistsError):
                immutable_json(p, {'x': 2})
            p.write_text(json.dumps({'x': 3}))
            with self.assertRaises(ValueError):
                checked(ref)


if __name__ == '__main__':
    unittest.main()
