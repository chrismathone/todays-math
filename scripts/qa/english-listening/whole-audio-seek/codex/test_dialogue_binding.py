import copy
import re
import unittest
from types import SimpleNamespace

import claude_adapter as a
import verifier as v


class SectionHeadingBoundaryTests(unittest.TestCase):
    def test_only_next_heading_whitespace_can_be_in_prior_section(self):
        text = "1번 W: Hello there. \n2번 W: Next dialogue."
        markers = list(re.finditer(r"(?:^|\s)(\d{1,2})번(?=\s)", text))
        start, next_heading = text.index(" W:"), text.index("2번")
        a.section_stays_before_next_heading(text, start, next_heading, markers)
        with self.assertRaisesRegex(v.InvalidEvidence, "overlaps_next"):
            a.section_stays_before_next_heading(text, start, next_heading + 1, markers)

    def test_literal_joint_bracket_is_part_of_next_heading(self):
        text = "18번 W: Prior. 【19-20】 공동 지시문"
        markers = list(re.finditer(r"【(\d+)-(\d+)】", text))
        at = text.index("【")
        a.section_stays_before_next_heading(text, 4, at, markers)
        with self.assertRaisesRegex(v.InvalidEvidence, "overlaps_next"):
            a.section_stays_before_next_heading(text, 4, at + 1, markers)


class DialogueOffsetTests(unittest.TestCase):
    def setUp(self):
        wf = 320
        self.replay = SimpleNamespace(actual={"sampleRate": 16000, "channels": 1, "windowFrames": wf, "frameCount": 1600000},
                                      energy=[1e8] * 5000)
        self.replay.energy[150:170] = [0] * 20
        self.probe = {"startFrame": 1600, "onsetFrame": 8000}
        self.dialogue = {"sampleRate": 16000, "channels": 1, "startFrame": 48000, "onsetFrame": 54400,
                         "frameCount": 224000, "quietBeforeFrames": 6400}
        self.row = {"kind": "shared_instruction_member", "dialogueProbeEvidence": {"offsetFromStartFrames": 46400}}

    def validate(self):
        return a.dialogue_offset_binding(self.row, self.probe, self.dialogue, self.replay)

    def test_separate_actual_measured_onset_keeps_numbered_seek_start(self):
        proof = self.validate()
        self.assertEqual(proof["method"], "measured_original_passage_offset_v1")
        self.assertEqual(proof["dialogueOnsetFrame"], 54400)
        self.assertEqual(self.probe["startFrame"], 1600)

    def test_forged_negative_boolean_or_missing_offset_cannot_bind(self):
        for value in (46401, -46400, True, None):
            self.row["dialogueProbeEvidence"]["offsetFromStartFrames"] = value
            with self.assertRaisesRegex(v.InvalidEvidence, "dialogue_probe_offset_mismatch"):
                self.validate()

    def test_member_offset_over_six_seconds_and_source_overflow_are_rejected(self):
        self.dialogue["startFrame"] += 96000
        self.dialogue["onsetFrame"] += 96000
        self.row["dialogueProbeEvidence"]["offsetFromStartFrames"] += 96000
        with self.assertRaisesRegex(v.InvalidEvidence, "passage_limit"):
            self.validate()
        self.setUp()
        self.dialogue["frameCount"] = 1600000
        with self.assertRaisesRegex(v.InvalidEvidence, "source_overflow"):
            self.validate()

    def test_prior_music_and_forged_quiet_count_cannot_be_delayed_onset(self):
        self.replay.energy[169] = 1e8
        with self.assertRaisesRegex(v.InvalidEvidence, "native_quiet_lead_mismatch"):
            self.validate()
        self.setUp()
        self.dialogue["quietBeforeFrames"] += 320
        with self.assertRaisesRegex(v.InvalidEvidence, "native_quiet_lead_mismatch"):
            self.validate()

    def test_wrong_native_clock_and_off_grid_onset_are_rejected(self):
        self.dialogue["channels"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "invalid_native_integer"):
            self.validate()
        self.setUp()
        self.dialogue["onsetFrame"] += 1
        with self.assertRaisesRegex(v.InvalidEvidence, "off_native_grid"):
            self.validate()


class ExactOpeningTests(unittest.TestCase):
    def setUp(self):
        self.text = "1번 지시문 Man: ______ [Telephone rings.] W: Hello? M: Hi, this is Minsu. W: I'm afraid he is away."
        self.turns = a.original_turns(self.text, 0)
        self.proof = {"firstDialogueOpeningEvidence": {"method": "exact_original_opening_v1", "quotes": [self.quote("Hello?"), self.quote("Hi, this is")]}}

    def quote(self, text):
        at = self.text.index(text)
        return {"text": text, "startCharacter": at, "endCharacter": at + len(text)}

    def test_real_short_first_greeting_and_immediate_next_prefix_are_exact(self):
        self.assertEqual(self.turns[0]["text"], "Hello?")
        self.assertEqual(a.exact_opening_words(self.proof, self.text, self.turns), ["hello", "hi", "this", "is"])

    def test_skipped_first_greeting_and_later_only_quote_are_rejected(self):
        self.proof["firstDialogueOpeningEvidence"]["quotes"] = [self.quote("Hi, this is"), self.quote("I'm afraid")]
        with self.assertRaisesRegex(v.InvalidEvidence, "character_bounds_or_quote_mismatch"):
            a.exact_opening_words(self.proof, self.text, self.turns)

    def test_source_char_offset_corruption_and_name_repair_are_rejected(self):
        q = self.proof["firstDialogueOpeningEvidence"]["quotes"][0]
        q["startCharacter"] += 1
        with self.assertRaisesRegex(v.InvalidEvidence, "character_bounds_or_quote_mismatch"):
            a.exact_opening_words(self.proof, self.text, self.turns)
        self.setUp()
        self.proof["firstDialogueOpeningEvidence"]["quotes"][1]["text"] = "Hi, this is Minsoo."
        with self.assertRaisesRegex(v.InvalidEvidence, "character_bounds_or_quote_mismatch"):
            a.exact_opening_words(self.proof, self.text, self.turns)

    def test_nonunique_opening_and_wrong_section_are_rejected(self):
        repeated = self.text + " 2번 W: Hello? M: Hi, this is another person."
        with self.assertRaisesRegex(v.InvalidEvidence, "original_opening_not_unique"):
            a.exact_opening_words(self.proof, repeated, self.turns)
        with self.assertRaisesRegex(v.InvalidEvidence, "opening_route_requires_actual_short_first_utterance"):
            a.exact_opening_words(self.proof, self.text, self.turns[1:])

    def test_prior_actual_utterance_cannot_be_truncated(self):
        self.text = self.text.replace("Hello?", "Hello there.")
        self.turns = a.original_turns(self.text, 0)
        self.proof["firstDialogueOpeningEvidence"]["quotes"] = [self.quote("Hello"), self.quote("Hi, this is")]
        with self.assertRaisesRegex(v.InvalidEvidence, "truncated_prior_utterance"):
            a.exact_opening_words(self.proof, self.text, self.turns)


class RepeatedOpeningAndInitialismTests(unittest.TestCase):
    def setUp(self):
        self.text = "1번 M: Hello, may I help you? W: Yes, please. 2번 M: Hello, may I help you? W: No, thanks."
        self.turns = a.original_turns(self.text[:self.text.index("2번")], 0)
        quotes = []
        for literal in ("Hello, may I help you?", "Yes"):
            at = self.text.index(literal)
            quotes.append({"text": literal, "startCharacter": at, "endCharacter": at + len(literal)})
        self.proof = {"firstDialogueOpeningEvidence": {"method": "exact_original_opening_v2", "quotes": quotes}}

    def test_repeated_complete_greeting_plus_immediate_reply_is_unique(self):
        self.assertEqual(a.exact_opening_words(self.proof, self.text, self.turns), ["hello", "may", "i", "help", "you", "yes"])
        self.proof["firstDialogueOpeningEvidence"]["method"] = "exact_original_opening_v1"
        with self.assertRaisesRegex(v.InvalidEvidence, "requires_actual_short"):
            a.exact_opening_words(self.proof, self.text, self.turns)

    def test_repeated_greeting_cannot_be_truncated_or_borrow_other_reply(self):
        quote = self.proof["firstDialogueOpeningEvidence"]["quotes"][0]
        quote["text"] = "Hello, may I"
        quote["endCharacter"] = quote["startCharacter"] + len(quote["text"])
        with self.assertRaisesRegex(v.InvalidEvidence, "truncated_prior"):
            a.exact_opening_words(self.proof, self.text, self.turns)
        self.setUp()
        quote = self.proof["firstDialogueOpeningEvidence"]["quotes"][1]
        quote.update(text="No", startCharacter=self.text.index("No"), endCharacter=self.text.index("No") + 2)
        with self.assertRaisesRegex(v.InvalidEvidence, "character_bounds_or_quote_mismatch"):
            a.exact_opening_words(self.proof, self.text, self.turns)

    def test_v2_does_not_accept_unique_first_utterance_or_repeated_context(self):
        with self.assertRaisesRegex(v.InvalidEvidence, "requires_repeated_complete"):
            a.exact_opening_words(self.proof, self.text[:self.text.index("2번")], self.turns)
        repeated = self.text.replace("No, thanks.", "Yes, please.")
        with self.assertRaisesRegex(v.InvalidEvidence, "original_opening_not_unique"):
            a.exact_opening_words(self.proof, repeated, self.turns)

    def test_dotted_initialisms_are_punctuation_only_without_name_repair(self):
        self.assertEqual(a.english_words("H.J. called at 5 p.m. in the U.S.A."), a.english_words("HJ called at 5 pm in the USA"))
        self.assertNotEqual(a.english_words("This is Minsu Kim"), a.english_words("This is Minsoo Kim"))
        self.assertNotEqual(a.english_words("H. J. Kim"), a.english_words("HJ Kim"))
        self.assertNotEqual(a.english_words("Pay 13.50"), a.english_words("Pay 1350"))


class DialogueBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.source = {"sourceRecordId": "A", "audio": {"durationMs": 100000}, "questions": [{"sourceNumber": 19}, {"sourceNumber": 20}]}
        self.row = {"sourceRecordId": "A", "questionId": "q19", "status": "admitted", "scopeQuestionNumbers": [19],
                    "proofKey": {"dialogueBinding": {"method": "measured_original_passage_offset_v1", "sampleRate": 16000,
                                                    "dialogueOnsetFrame": 160000, "selectedEstimatedEndFrame": 208000}}}
        self.next = {"sourceRecordId": "A", "questionId": "q20", "status": "preserved", "sourceNumber": 20, "audioRange": {"startMs": 20000, "endMs": 100000}}

    def test_delayed_first_dialogue_before_exact_preserved_next_start(self):
        self.assertFalse(v.check_dialogue_order([self.row, self.next], [self.source]))

    def test_neighboring_passage_or_overflowing_quote_is_rejected(self):
        self.row["proofKey"]["dialogueBinding"]["selectedEstimatedEndFrame"] = 320001
        self.assertIn("dialogue_probe_beyond_next_original_question", v.check_dialogue_order([self.row, self.next], [self.source])["q19"])

    def test_missing_next_measured_passage_boundary_stays_held(self):
        self.next["status"] = "held"
        self.assertIn("dialogue_offset_next_original_passage_boundary_missing", v.check_dialogue_order([self.row, self.next], [self.source])["q19"])

    def test_last_original_question_continues_to_full_source_end(self):
        self.row["scopeQuestionNumbers"] = [20]
        self.assertFalse(v.check_dialogue_order([self.row], [self.source]))


class OriginalMarkerTests(unittest.TestCase):
    def test_complete_beon_style_ignores_date_and_dialogue_decimal_numbers(self):
        source = {"questions": [{"sourceNumber": 1}, {"sourceNumber": 2}]}
        text = "2022. 1. 2. 시행 1번 지시문 M: Pay 2. dollars. 2번 다음 지시문 W: Hello."
        markers = a.original_script_markers(source, text)
        self.assertEqual([int(m[1]) for m in markers], [1, 2])

    def test_duplicate_real_heading_and_mixed_incomplete_style_remain_held(self):
        source = {"questions": [{"sourceNumber": 1}, {"sourceNumber": 2}]}
        for text in ("1번 지시 1번 지시 2번 지시", "1번 지시 2. 지시"):
            with self.assertRaisesRegex(v.InvalidEvidence, "numbering_not_unique"):
                a.original_script_markers(source, text)

    def test_out_of_order_source_headings_cannot_be_repaired_by_current_index(self):
        source = {"questions": [{"sourceNumber": 1}, {"sourceNumber": 2}]}
        with self.assertRaisesRegex(v.InvalidEvidence, "numbering_not_unique"):
            a.original_script_markers(source, "2번 지시 1번 지시")

    def test_literal_dot_style_requires_same_complete_ordered_uniqueness(self):
        source = {"questions": [{"sourceNumber": 1}, {"sourceNumber": 2}]}
        self.assertEqual([int(m[1]) for m in a.original_script_markers(source, "1. 지시 M: Hello. 2. 지시 W: Hi.")], [1, 2])

    def test_source_pdf_space_before_dot_keeps_literal_ordinal(self):
        source = {"questions": [{"sourceNumber": 9}, {"sourceNumber": 10}, {"sourceNumber": 11}]}
        text = "9. 지시 W: First. 10 . 지시 M: Second. 11. 지시 W: Third."
        self.assertEqual([int(m[1]) for m in a.original_script_markers(source, text)], [9, 10, 11])
        with self.assertRaisesRegex(v.InvalidEvidence, "numbering_not_unique"):
            a.original_script_markers(source, text + " 10 . 다른 지시")

    def test_true_original_joint_header_completes_style_without_individual_passage_guessing(self):
        instruction = "다음을 듣고, 물음에 답하시오."
        source = {"questions": [{"sourceNumber": 1}, {"sourceNumber": 2}, {"sourceNumber": 3, "instruction": instruction}]}
        markers = a.original_script_markers(source, "2022. 1. 3. 시행 1번 지시 W: Hello. 【2-3】 " + instruction + " M: A shared passage. 2. 질문 3. 질문")
        self.assertEqual([int(m[1]) for m in markers], [1, 2])
        source["questions"][2]["instruction"] = "대화를 듣고 알맞은 응답을 고르시오."
        with self.assertRaisesRegex(v.InvalidEvidence, "numbering_not_unique"):
            a.original_script_markers(source, "1번 지시 【2-3】 대화를 듣고 알맞은 응답을 고르시오.")

    def test_duplicated_joint_source_heading_is_never_first_match_guessed(self):
        instruction = "다음을 듣고, 물음에 답하시오."
        source = {"questions": [{"sourceNumber": 1}, {"sourceNumber": 2}, {"sourceNumber": 3, "instruction": instruction}]}
        with self.assertRaisesRegex(v.InvalidEvidence, "numbering_not_unique"):
            a.original_script_markers(source, "1번 지시 【2-3】 " + instruction + " M: Hello. 【2-3】 " + instruction + " M: Other words.")


if __name__ == "__main__":
    unittest.main()
