"""Run: py -3.12 scripts/qa/test_listening_ocr_evidence.py"""
import base64
import copy
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location("evidence", Path(__file__).with_name("prepare-listening-ocr-evidence.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        image = io.BytesIO()
        Image.new("RGB", (30, 20), "white").save(image, "PNG")
        self.png = image.getvalue()
        self.original = {"id": "question", "sourceNumber": 4, "choices": [{"id": str(i), "text": str(i)} for i in range(5)], "answerChoiceId": "3", "image": {"width": 30, "height": 20, "dataUrl": "data:image/png;base64," + base64.b64encode(self.png).decode()}}
        self.question = {"questionId": "question", "sourceNumber": 4, "choices": copy.deepcopy(self.original["choices"]), "answerChoiceId": "3", "conversion": {"method": "original_image_preserved"}}
        self.stage = {"sourceRecordId": "ebsi-high-1-2022-1", "sourceQuestionPdfSha256": "a" * 64, "originalPreparedSha256": "b" * 64}

    def run_row(self):
        with tempfile.TemporaryDirectory() as temporary:
            row = module.evidence_row(self.stage, self.question, self.original, Path(temporary))
            self.assertEqual(Path(row["imagePath"]).read_bytes(), self.png)
            return row

    def test_exact_original_and_identity_preserved_unreviewed(self):
        row = self.run_row()
        self.assertEqual(row["imageSha256"], module.sha(self.png))
        self.assertEqual(row["choiceIds"], [str(i) for i in range(5)])
        self.assertEqual(row["answerChoiceId"], "3")
        self.assertEqual(row["decision"], "unreviewed")
        self.assertFalse(row["databaseWritten"])

    def test_question_mismatch_refused(self):
        self.question["questionId"] = "other"
        with self.assertRaises(ValueError): self.run_row()

    def test_choice_reorder_refused(self):
        self.question["choices"].reverse()
        with self.assertRaises(ValueError): self.run_row()

    def test_answer_change_refused(self):
        self.question["answerChoiceId"] = "0"
        with self.assertRaises(ValueError): self.run_row()

    def test_missing_fifth_choice_refused(self):
        self.original["choices"].pop()
        self.question["choices"].pop()
        with self.assertRaises(ValueError): self.run_row()

    def test_source_name_cannot_escape_evidence_directory(self):
        self.stage["sourceRecordId"] = "../escape"
        with self.assertRaises(ValueError): self.run_row()

    def test_duplicate_choices_refused(self):
        self.original["choices"][0]["id"] = "1"
        self.question["choices"][0]["id"] = "1"
        with self.assertRaises(ValueError): self.run_row()

    def test_unknown_original_answer_refused(self):
        self.original["answerChoiceId"] = self.question["answerChoiceId"] = "missing"
        with self.assertRaises(ValueError): self.run_row()

    def test_incorrect_image_dimensions_refused(self):
        self.original["image"]["height"] = 21
        with self.assertRaises(ValueError): self.run_row()

    def prepare_review(self, base: Path):
        source = base / "source"
        source.mkdir()
        row = module.evidence_row(self.stage, self.question, self.original, base)
        document = {**self.stage, "questions": [self.question], "conversion": {"nativeCount": 0, "preservedImageCount": 1}}
        module.write_json(source / (self.stage["sourceRecordId"] + ".json"), document)
        module.write_json(base / "outlined-manifest.json", {"items": [row]})
        module.write_json(base / "ocr" / (row["key"] + ".json"), {"imageSha256": row["imageSha256"], "text": "deliberately wrong OCR"})
        reviewed = {"databaseWritten": False, "reviewBasis": "Direct original-image comparison", "questions": [{"sourceRecordId": self.stage["sourceRecordId"], "sourceNumber": 4, "prompt": "Verified original prompt", "choices": ["First", "Second", "Third", "Fourth", "Fifth"]}]}
        review_path = base / "review.json"
        module.write_json(review_path, reviewed)
        return source, review_path, reviewed

    def test_explicit_review_uses_no_raw_ocr_and_keeps_ids(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, path, _ = self.prepare_review(base)
            result = module.stage_reviewed_questions(source, base, path)
            question = result["questions"][0]["question"]
            self.assertEqual(question["prompt"], "Verified original prompt")
            self.assertNotIn("image", question)
            self.assertEqual(question["answerChoiceId"], "3")
            self.assertEqual([c["id"] for c in question["choices"]], [str(i) for i in range(5)])
            self.assertNotIn("deliberately wrong OCR", json.dumps(result))
            self.assertEqual(result["unreviewedOcrAutomaticNativeCount"], 0)

    def test_visual_crop_preserves_pixels_and_ids(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, path, review = self.prepare_review(base)
            review["questions"][0].update({"visualBoundsPixels": [0, 5, 30, 20], "choices": None})
            module.write_json(path, review)
            question = module.stage_reviewed_questions(source, base, path)["questions"][0]["question"]
            data = module.checked_image(question["image"])
            with Image.open(io.BytesIO(data)) as decoded:
                self.assertEqual(decoded.size, (30, 15))
                self.assertEqual(decoded.getpixel((0, 0)), (255, 255, 255))
            self.assertEqual(question["image"]["role"], "visual")
            self.assertEqual(question["choices"], self.original["choices"])

    def test_reviewed_source_mutation_refused(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, path, _ = self.prepare_review(base)
            original = next((base / "original-images").glob("*.png"))
            original.write_bytes(b"mutated")
            with self.assertRaises(ValueError): module.stage_reviewed_questions(source, base, path)

    def test_crop_outside_source_refused(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, path, review = self.prepare_review(base)
            review["questions"][0]["visualBoundsPixels"] = [0, 0, 31, 20]
            module.write_json(path, review)
            with self.assertRaises(ValueError): module.stage_reviewed_questions(source, base, path)

    def test_missing_visual_review_basis_refused(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, path, review = self.prepare_review(base)
            del review["reviewBasis"]
            module.write_json(path, review)
            with self.assertRaises(ValueError): module.stage_reviewed_questions(source, base, path)


if __name__ == "__main__": unittest.main()
