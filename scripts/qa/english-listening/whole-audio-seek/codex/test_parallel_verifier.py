"""Prefetch cannot substitute input identity, swallow failures or retain all PCM."""
import threading
import unittest

from parallel_verifier import SourcePrefetch
import verifier as v


class PrefetchTests(unittest.TestCase):
    def specs(self, count):
        return [("root", {"sourceRecordId": str(i)}, {"clock": i}, [{"row": i}]) for i in range(count)]

    def test_only_two_sources_are_submitted_ahead_and_every_source_is_consumed(self):
        specs = self.specs(6)
        replay = SourcePrefetch(specs, lambda *spec: spec[1]["sourceRecordId"])
        try:
            self.assertEqual(set(replay.pending), {"0", "1"})
            for spec in specs:
                self.assertLessEqual(len(replay.pending), 2)
                self.assertEqual(replay(*spec), spec[1]["sourceRecordId"])
            self.assertEqual(replay.pending, {})
        finally:
            replay.close()

    def test_worker_failure_is_propagated_and_does_not_block_later_source(self):
        def construct(root, source, clock, rows):
            if source["sourceRecordId"] == "0":
                raise OSError("physical source corrupt")
            return source["sourceRecordId"]
        specs = self.specs(3)
        replay = SourcePrefetch(specs, construct)
        try:
            with self.assertRaisesRegex(OSError, "physical source corrupt"):
                replay(*specs[0])
            self.assertEqual(replay(*specs[1]), "1")
            self.assertEqual(replay(*specs[2]), "2")
        finally:
            replay.close()

    def test_substituted_clock_or_rows_and_closed_executor_are_rejected(self):
        spec = self.specs(1)[0]
        replay = SourcePrefetch([spec], lambda *s: s)
        try:
            with self.assertRaisesRegex(v.InvalidEvidence, "prefetch_input_differs"):
                replay(spec[0], spec[1], {"clock": "different"}, spec[3])
        finally:
            replay.close()
        with self.assertRaisesRegex(v.InvalidEvidence, "unexpected_prefetch_source"):
            replay(*spec)

    def test_close_waits_for_running_decode_and_clears_all_retained_results(self):
        began, release = threading.Event(), threading.Event()
        def construct(*spec):
            began.set()
            release.wait(2)
            return b"temporary PCM"
        replay = SourcePrefetch(self.specs(1), construct)
        self.assertTrue(began.wait(2))
        release.set()
        replay.close()
        self.assertEqual(replay.pending, {})
        self.assertTrue(replay.closed)


if __name__ == "__main__":
    unittest.main()
