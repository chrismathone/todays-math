"""Regressions for frozen-source protection and factual recognition input scopes."""

import unittest
from unittest.mock import patch

from strict_stage_support import context, recognition_windows


class StrictStageTests(unittest.TestCase):
    def test_applied_source_rejected_before_any_write(self):
        with patch("sys.argv", ["stage", "--base", "missing", "--source-id", "ebsi-high-1-2022-2"]), patch("pathlib.Path.mkdir") as mkdir:
            with self.assertRaisesRegex(ValueError, "frozen"):
                context("test")
            mkdir.assert_not_called()

    def test_shared_announcer_scope_is_only_a_recognition_scope(self):
        activity = {"chunks": [{"startSample": 0, "endSample": 160000}, {"startSample": 320000, "endSample": 480000}]}
        korean = {"segments": [{"id": 1, "text": "19번과 20번", "uncertain": False, "sourceEventId": 1, "estimatedStartSeconds": 0, "estimatedEndSeconds": 2},
                               {"id": 2, "text": "수고하셨습니다", "uncertain": False, "sourceEventId": 2, "estimatedStartSeconds": 20, "estimatedEndSeconds": 22}]}
        windows = recognition_windows(activity, korean, 20)
        self.assertEqual(windows[0]["questionNumbers"], [19, 20])
        self.assertEqual(windows[0]["endSample"], 160000)
        self.assertEqual(windows[0]["purpose"], "recognition_only_not_clip_boundaries")
        self.assertNotIn("sharedPassageQuestionNumbers", windows[0])

    def test_uncertain_or_ambiguous_cue_and_missing_closing_are_not_inferred(self):
        activity = {"chunks": [{"startSample": 0, "endSample": 160000}]}
        for text, uncertain in [("이번 대화", False), ("2번", True), ("2번", False)]:
            korean = {"segments": [{"id": 1, "text": text, "uncertain": uncertain, "sourceEventId": 1, "estimatedStartSeconds": 0, "estimatedEndSeconds": 2}]}
            self.assertEqual(recognition_windows(activity, korean, 20), [])


if __name__ == "__main__":
    unittest.main()
