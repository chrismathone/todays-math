import unittest

import claude_adapter as a
import verifier as v


class NativeTransportBatchTests(unittest.TestCase):
    def test_dense_catalog_is_partitioned_without_dropping_or_reordering_inputs(self):
        probes = [{"id": str(i), "frameCount": 60 * 48000 if i % 5 == 0 else 14 * 48000} for i in range(200)]
        batches = a.localized_probe_batches(probes, 2)
        self.assertEqual([p for batch in batches for p in batch], probes)
        self.assertGreater(len(batches), 1)
        self.assertTrue(all(len(batch) <= 64 and sum(p["frameCount"] * 4 for p in batch) <= 64 * 1024 * 1024 for batch in batches))

    def test_many_tiny_negative_clips_hit_count_cap_independently_of_bytes(self):
        probes = [{"id": str(i), "frameCount": 19200} for i in range(129)]
        batches = a.localized_probe_batches(probes, 2)
        self.assertEqual([len(b) for b in batches], [64, 64, 1])

    def test_excessive_catalog_single_allocation_or_invalid_channels_rejected(self):
        for probes, channels, reason in (([{"frameCount": 1}] * 2049, 2, "unbounded_localized_source_probe_catalog"),
                                         ([{"frameCount": 20 * 1024 * 1024}], 2, "unbounded_localized_transport_probe"),
                                         ([{"frameCount": True}], 2, "unbounded_localized_transport_probe"),
                                         ([], True, "invalid_localized_batch_channels")):
            with self.subTest(reason=reason):
                with self.assertRaisesRegex(v.InvalidEvidence, reason):
                    a.localized_probe_batches(probes, channels)

    def test_zero_probe_full_original_replay_still_has_one_empty_batch(self):
        self.assertEqual(a.localized_probe_batches([], 2), [[]])


if __name__ == "__main__":
    unittest.main()
