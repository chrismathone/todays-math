import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/elementary/rng";
import { generateMiddleProblem } from "@/lib/middle/generate";
import {
  asMultipleChoice,
  declaredClassificationCount,
} from "@/lib/engine/deriveFormats";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";

const content =
  "다음 중 일차방정식인 것의 개수를 구하시오.\n$x+1=3$, $2x=4$, $x^2=1$, $x=x$, $1=2$";
const stem = {
  content,
  answer: "$2$개",
  solution: "검사",
  familyKey: "test",
  problemType: "계산",
};

describe("finite classification count choices", () => {
  it("uses the whole printed collection and declines incomplete or ambiguous descriptions", () => {
    expect(declaredClassificationCount(content)).toBe(5);
    for (const invalid of [
      content + "\n조건을 추가한다.",
      content.replace("$1=2$", "$x=x$"),
      content.replace("$1=2$", "그 밖의 식"),
      content.replace("일차방정식인 것의 개수", "자연수 해의 개수"),
      "일차방정식의 개수를 구하시오.",
    ])
      expect(declaredClassificationCount(invalid)).toBeNull();
  });

  it("keeps every choice within 0..5 and preserves the answer over actual generated tasks", () => {
    for (let seed = 1; seed <= 64; seed++) {
      const source = generateMiddleProblem("1-1|일차방정식의 풀이|09", seed, 0);
      const mc = asMultipleChoice({ ...stem, ...source }, createRng(seed));
      const options = parseProblemContent(mc.content).choices;
      expect(options).toHaveLength(5);
      expect(new Set(options).size).toBe(5);
      for (const option of options) expect(option).toMatch(/^\$[0-5]\$개$/);
      const index = "①②③④⑤".indexOf(mc.answer);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(options[index]).toBe(source.answer);
      expect(mc.solution).toBe(source.solution);
    }
  });

  it("rejects impossible answers, insufficient domains and invalid authored distractors", () => {
    for (const answer of ["$6$개", "$-1$개", "$2.5$개", "$2$"]) {
      expect(() =>
        asMultipleChoice({ ...stem, answer }, createRng(1)),
      ).toThrow();
    }
    expect(() =>
      asMultipleChoice(
        { ...stem, content: content.split(", $").slice(0, 3).join(", $") },
        createRng(1),
      ),
    ).toThrow();
    for (const distractors of [
      ["$0$개", "$1$개", "$3$개", "$6$개"],
      ["$0$개", "$1$개", "$3$개", "$3$개"],
      ["$0$개", "$1$개", "$2$개", "$4$개"],
      ["$0$개", "$1$개", "$3$개"],
    ])
      expect(() =>
        asMultipleChoice({ ...stem, distractors }, createRng(1)),
      ).toThrow();
  });

  it("accepts valid authored choices and leaves unrelated stems on the existing path", () => {
    const distractors = ["$0$개", "$1$개", "$3$개", "$5$개"];
    expect(
      parseProblemContent(
        asMultipleChoice({ ...stem, distractors }, createRng(7)).content,
      ).choices.sort(),
    ).toEqual([...distractors, stem.answer].sort());
    const unrelated = {
      ...stem,
      content: "자연수 해의 개수를 구하시오.",
      distractors: ["$0$개", "$1$개", "$3$개", "$6$개"],
    };
    expect(
      parseProblemContent(asMultipleChoice(unrelated, createRng(7)).content)
        .choices,
    ).toContain("$6$개");
  });
});
