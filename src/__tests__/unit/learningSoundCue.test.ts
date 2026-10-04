import { describe, expect, it } from "vitest";
import {
  learningSoundCue,
  type LearningAnswerAction,
} from "@/components/math-srs/learningSoundCue";

describe("confirmed answer cue semantics", () => {
  it.each([
    [{ type: "answer", choiceIds: [0] }, true, "correct"],
    [{ type: "answer", choiceIds: [0] }, false, "soft"],
    [{ type: "answer", choiceIds: [] }, true, "soft"],
    [{ type: "supplement-answer", choiceIds: [] }, false, "soft"],
    [{ type: "course" }, true, "correct"],
    [{ type: "course", selfCorrect: true }, true, "soft"],
    [{ type: "course", selfCorrect: false }, false, "soft"],
    [{ type: "course", giveUp: true }, true, "soft"],
    [{ type: "middle", submittedAnswer: "" }, true, "soft"],
    [{ type: "middle", submittedAnswer: "3" }, true, "correct"],
    [{ type: "replay", submittedAnswer: "3" }, false, "soft"],
    ...[
      "lab-predict",
      "lab-split",
      "lab-match",
      "lab-rule",
      "lab-check",
    ].flatMap((type) => [
      [{ type }, true, null],
      [{ type }, false, null],
    ]),
  ] as [LearningAnswerAction, boolean, "correct" | "soft" | null][])(
    "%j / correct=%s -> %s",
    (action, correct, expected) => {
      expect(learningSoundCue(action, correct)).toBe(expected);
    },
  );
});
