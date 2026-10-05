import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coverage,
  englishWords,
  hintNumbers,
  koreanSentence,
  leadingCue,
} from "../lib/text.mjs";

test("a spoken number is read only at the very beginning", () => {
  assert.deepEqual(leadingCue("5번 다음을 듣고").numbers, [5]);
  assert.equal(leadingCue("5번 다음을 듣고").form, "beon");
  assert.deepEqual(leadingCue("“7번” 대화를 듣고").numbers, [7]);
  assert.deepEqual(leadingCue("19번과 20번. 대화를 듣고").numbers, [19, 20]);
  assert.deepEqual(leadingCue("십구번과 이십번 다음을").numbers, [19, 20]);
  assert.equal(leadingCue("십구번과 이십번 다음을").form, "spelled");
  assert.equal(
    leadingCue("19번과 20번. 대화를 듣고 | 19번").rest,
    "대화를 듣고 | 19번",
  );
});

test("text without a leading number is not a cue", () => {
  for (const text of [
    "수고하셨습니다.",
    "대화를 듣고, 3번 그림을 고르시오.",
    "10시에 만나자",
    "I have 2. apples",
    "이제 시작하겠습니다.",
    "",
  ])
    assert.equal(leadingCue(text), null, text);
});

test("digits with only a period are a separate, weaker form", () => {
  const cue = leadingCue("2. 대화를 듣고, 남자가 구입할");
  assert.deepEqual(cue.numbers, [2]);
  assert.equal(cue.form, "bare");
  // The bare form never joins a second number.
  assert.deepEqual(leadingCue("11. 5 대화").numbers, [11]);
});

test("numbers out of range are refused", () => {
  assert.equal(leadingCue("0번 다음을"), null);
});

test("instruction coverage counts the official Hangul only", () => {
  const official =
    "대화를 듣고, Dream Bank의 위치로 가장 알맞은 것을 고르시오.";
  assert.equal(
    coverage(
      official,
      "대화를 듣고 드림뱅크의 위치로 가장 알맞은 것을 고르시오.",
    ),
    1,
  );
  assert.ok(
    coverage(
      "대화를 듣고, 남자가 구입할 실내화로 가장 적절한 것을 고르시오.",
      "대화를 듣고, 여자가 가져올 물건으로 가장 적절한 것을 고르시오.",
    ) < 0.8,
  );
  assert.equal(coverage("다음을 듣고, 물음에 답하시오.", ""), 0);
  // Repeating one heard bigram does not cover two official ones.
  assert.ok(coverage("가나 가나 가나", "가나") < 1);
});

test("the official sentence stops at its first sentence end", () => {
  assert.equal(
    koreanSentence(
      "다음 상황 설명을 듣고, Jiho가 Mr. Jung에게 할 말로 가장 적절한 것을 고르시오. Jiho: Mr. Jung,",
    ),
    "다음 상황 설명을 듣고, Jiho가 Mr. Jung에게 할 말로 가장 적절한 것을 고르시오.",
  );
  // An answer blank alone carries no Korean sentence at all.
  assert.equal(/[가-힣]/.test(koreanSentence("Woman: ________")), false);
});

test("a listening hint is never a cue", () => {
  assert.deepEqual(hintNumbers("Number four."), [4]);
  assert.deepEqual(hintNumbers("18 and 19."), [18, 19]);
  assert.equal(leadingCue("Number four."), null);
  assert.equal(leadingCue("18 and 19."), null);
});

test("english words fold punctuation and apostrophes", () => {
  assert.deepEqual(englishWords("I’d like it, please!"), [
    "i'd",
    "like",
    "it",
    "please",
  ]);
});
