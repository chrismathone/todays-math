import { describe, expect, it } from "vitest";
import { expandFamily } from "@/lib/engine/expandEngine";

const stem = (choices: string[]) => ({
  familyKey: "fixture-native-mcq",
  problemType: "계산",
  content:
    "다음 보기에서 답을 고르시오.\n" +
    choices.map((v, i) => `${"①②③④⑤"[i]} ${v}`).join("\n"),
  answer: "③",
  solution: "검토용 풀이",
});
describe("native MC stems share exact duplicate checks", () => {
  it("rejects equal distractors even when the marked correct option is unique", () => {
    expect(() =>
      expandFamily(
        () => stem(["$\\sqrt{8}$", "$2\\sqrt{2}$", "$3$", "$4$", "$5$"]),
        1,
      ),
    ).toThrow(/1=2/);
    expect(() =>
      expandFamily(
        () => stem(["$0.5$", "$\\frac{1}{2}$", "$3$", "$4$", "$5$"]),
        1,
      ),
    ).toThrow(/1=2/);
  });
  it("preserves valid direct MC stems, distinct units and the original answer", () => {
    const p = stem([
      "$2\\,\\mathrm{cm}$",
      "$2\\,\\mathrm{m}$",
      "$3$",
      "$4$",
      "$5$",
    ]);
    expect(expandFamily(() => p, 1)).toMatchObject({
      items: [{ ...p, questionType: "객관식" }],
      skippedMcq: 0,
      shortBy: 0,
    });
  });
  it("does not certify unreadable symbolic equivalence or reject it by numeric approximation", () => {
    const p = stem(["$x+1$", "$1+x$", "$x+2$", "$x+3$", "$x+4$"]);
    expect(expandFamily(() => p, 1).items[0]?.content).toBe(p.content);
  });
});
