import { describe, expect, it } from "vitest";
import { positiveRadicalAnswerKey } from "@/lib/import/schoolTextbook/positiveRadicalAnswerNotation";
import { dbRetryAnswersAgree } from "@/lib/import/schoolTextbook/dbRetryReviewBinding";
describe("exact positive numeric radical powers", () => {
  it("compares frozen textbook area answers with plain blind radical notation", () => {
    const question = "삼각형의 넓이를 구하시오.";
    expect(
      dbRetryAnswersAgree(
        String.raw`$\frac{2\sqrt3}{13}$`,
        "2√3/13",
        "서술형",
        question,
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(String.raw`$12\sqrt5$`, "12√5", "서술형", question),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        String.raw`$\frac{2\sqrt3}{13}$`,
        "2√3/12",
        "서술형",
        question,
      ),
    ).toBe(false);
  });
  it.each([
    ["4\\sqrt[7]{8}", "2^{\\frac{17}{7}}"],
    ["4\\sqrt[5]{2}", "2^{11/5}"],
    ["27\\sqrt[7]{3}", "3^{22/7}"],
    ["2\\sqrt{2}", "2^{3/2}"],
    [String.raw`$\frac{2\sqrt3}{13}$`, "2√3/13"],
    [String.raw`$12\sqrt5$`, "12√5"],
    [String.raw`\frac{\sqrt{6}}{5}`, "√6/5"],
    [String.raw`\frac{12\sqrt{5}}{1}`, "12√5"],
  ])("proves positive monomials %s", (a, b) => {
    expect(positiveRadicalAnswerKey(a)).not.toBeNull();
    expect(positiveRadicalAnswerKey(a)).toEqual(positiveRadicalAnswerKey(b));
  });
  it.each([
    ["4\\sqrt[7]{8}", "2^{18/7}"],
    ["4\\sqrt[7]{8}", "4\\sqrt[6]{8}"],
    ["27\\sqrt[7]{3}", "2^{22/7}"],
  ])("preserves prime and exponent %s", (a, b) =>
    expect(positiveRadicalAnswerKey(a)).not.toEqual(
      positiveRadicalAnswerKey(b),
    ),
  );
  it.each([
    "-4\\sqrt[7]{8}",
    "±4\\sqrt[7]{8}",
    "4\\sqrt[7]{-8}",
    "a\\sqrt[7]{8}",
    "4\\sqrt[7]{8}cm",
    "0^{1/2}",
    "2^{1/0}",
    "2^{1/65}",
    "1000001^{1/2}",
    "2^{a/2}",
    "(-2)^{1/2}",
    "2√3/0",
    "2√3/a",
    "2√3/13cm",
  ])("rejects unsupported or nonpositive values %s", (input) =>
    expect(positiveRadicalAnswerKey(input)).toBeNull(),
  );
});
