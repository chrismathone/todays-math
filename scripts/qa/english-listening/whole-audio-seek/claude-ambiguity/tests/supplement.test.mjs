import assert from "node:assert/strict";
import { test } from "node:test";
import { Hold, verifyOwnEvidence } from "../lib/identity.mjs";
import { classify } from "../lib/supplement.mjs";
import {
  PLACES,
  SOURCE,
  probe,
  rebind,
  reseal,
  validInput,
} from "./fixture.mjs";

const SHARED = "다음을 듣고, 물음에 답하시오.";

/** Questions 3 and 4 of the fixture as one shared passage announced once. */
const sharedPassage = (text, change) =>
  validInput(3, (i) => {
    const questions = SOURCE.questions.map((q) =>
      q.sourceNumber >= 3
        ? {
            ...q,
            kind: "shared_passage",
            instruction: SHARED,
            promptSentence: null,
            spokenNumbers: [3, 4],
            scopeQuestionNumbers: [3, 4],
          }
        : q,
    );
    i.source = { ...SOURCE, questions };
    i.question = questions[2];
    i.loaded.cueProbe.container.probes[0] = probe(1, {
      onsetWindow: PLACES[3].number,
      windows: 700,
      language: "ko",
      purpose: "bridge_onset",
      texts: [text],
    });
    reseal(i.loaded.cueProbe);
    delete i.claim.numberClip;
    delete i.claim.dialogueProbe;
    delete i.claim.opening;
    rebind(i);
    change?.(i);
  });

const reasonOf = (input) => {
  try {
    verifyOwnEvidence(input);
    return null;
  } catch (error) {
    assert.ok(error instanceof Hold, error.stack);
    return error.reason;
  }
};

test("a shared passage is its two literal numbers and the frozen shared instruction", () => {
  const proof = verifyOwnEvidence(
    sharedPassage("3번에서 4번, 다음을 듣고 물음에 답하시오."),
  );
  assert.equal(proof.tier, "shared_passage_numbers_and_instruction");
  assert.deepEqual(proof.number.numbers, [3, 4]);
  // One wrong syllable still carries the sentence; the sentence itself is not repaired.
  assert.equal(
    reasonOf(sharedPassage("3번과 4번. 다음을 듣고 물음을 답하시오.")),
    null,
  );
});

test("a shared passage is refused on one number, bare digits or another sentence", () => {
  assert.equal(
    reasonOf(sharedPassage("3번 다음을 듣고 물음에 답하시오.")),
    "spoken_number_mismatch",
  );
  assert.equal(
    reasonOf(sharedPassage("3. 다음을 듣고 물음에 답하시오.")),
    "spoken_number_mismatch",
  );
  assert.equal(
    reasonOf(
      sharedPassage("3번과 4번, 대화를 듣고 가장 적절한 것을 고르시오."),
    ),
    "shared_passage_instruction_not_heard",
  );
  // The frozen instruction must really be a shared-passage instruction of both questions.
  assert.equal(
    reasonOf(
      sharedPassage("3번과 4번, 다음을 듣고 물음에 답하시오.", (i) => {
        i.source.questions[3] = { ...i.source.questions[3], instruction: null };
      }),
    ),
    "shared_passage_official_scope_mismatch",
  );
});

const result = (tier, numberGrade, extra = {}) => ({
  proof: {
    tier,
    numberGrade,
    sentence: { strictShare: 1 },
    number: { form: "beon" },
  },
  numberClipPurpose: null,
  ...extra,
});

test("only the agreed routes are offered; every weaker tier is named and kept out", () => {
  assert.deepEqual(
    classify(
      result("number_sentence_and_own_dialogue", "literal_number_at_start"),
    ),
    { offered: true, route: "explicit_numbered_section_own_dialogue" },
  );
  assert.deepEqual(
    classify(
      result(
        "number_sentence_and_own_dialogue",
        "bare_digits_with_literal_number_clip",
        { numberClipPurpose: "cue_only" },
      ),
    ),
    { offered: true, route: "explicit_numbered_section_own_dialogue" },
  );
  // A four-second clip is not the number alone.
  assert.deepEqual(
    classify(
      result(
        "number_sentence_and_own_dialogue",
        "bare_digits_with_literal_number_clip",
        { numberClipPurpose: "cue_context" },
      ),
    ),
    { offered: false, why: "bare_digits_without_number_only_clip" },
  );
  assert.equal(
    classify(
      result("member_number_and_own_dialogue", "literal_number_at_start"),
    ).route,
    "existing_member_route",
  );
  assert.equal(
    classify(
      result("ordinal_only_complete_chronology", "literal_number_at_start"),
    ).route,
    "existing_ordinal_only_route",
  );
  for (const tier of [
    "number_and_sentence",
    "number_and_sentence_on_hangul_only",
    "number_and_own_dialogue",
  ])
    assert.equal(
      classify(result(tier, "literal_number_at_start")).offered,
      false,
    );
  assert.equal(
    classify(result("something_new", "literal_number_at_start")).offered,
    false,
  );
});
