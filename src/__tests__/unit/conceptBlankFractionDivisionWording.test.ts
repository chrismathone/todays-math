import { describe, expect, it } from "vitest";
import {
  blankKeywords,
  splitBlankSentence,
  visibleLength,
} from "@/contracts/conceptBlank.contract";
import { bank as base } from "@/lib/concept-blank/bank/e6";
import { bank as plus } from "@/lib/concept-blank/bank/e6-plus";

const concepts = [...base.concepts, ...plus.concepts].filter((item) =>
  item.id.startsWith("e6-2-1-"),
);
const definition = (suffix: string) => {
  const item = concepts.find((entry) => entry.id === `e6-2-1-${suffix}`);
  expect(item, suffix).toBeDefined();
  return item!.definition;
};
const studentText = (suffix: string) =>
  splitBlankSentence(definition(suffix))
    .map((piece) => (piece.kind === "text" ? piece.text : "□"))
    .join("");

describe("초6 2-1 분수의 나눗셈 개념 빈칸", () => {
  it("keeps the whole unit as concept questions with short, bounded answers", () => {
    expect(concepts).toHaveLength(81);
    for (const item of concepts) {
      expect(item.givenCase, item.id).not.toBe(true);
      expect(item.definition, item.id).not.toContain("역수");
      for (const answer of blankKeywords(item.definition)) {
        expect(
          visibleLength(answer),
          `${item.id}: ${answer}`,
        ).toBeLessThanOrEqual(10);
        // 양수 조건·범위와 긴 절차·부정 문장을 학생이 추측하여 채우지 않는다.
        expect(answer, item.id).not.toMatch(
          /\$0\$|보다 (?:크|작)|방법으로|통하는|통하지|나눈 뒤|바꾸어|몇 개인지/,
        );
        // 1은 곱셈·나눗셈의 관계를 묻는 값이며, 특정 계산의 결과는 새로 묻지 않는다.
        const mathAnswers = answer.match(/\$[^$]+\$/g) ?? [];
        expect(
          mathAnswers.every((value) => value === "$1$"),
          item.id,
        ).toBe(true);
      }
    }
  });

  it.each([
    ["4-xc5", ["약분"]], // 사진 Q3: 공약수로 나누는 개념의 이름
    ["5-c1", ["분자"]], // 사진 Q4: 단위분수의 전체 개수를 적는 자리
    ["5-xc1", ["단위분수"]], // 사진 Q5: 가분수에도 같은 원리가 성립하는 까닭
    ["4-c2", ["나누는 분수"]], // 사진 Q6: 분자와 분모를 바꾸는 대상
    ["4-xc12", ["같을"]], // 사진 Q7: 앞의 분수만 뒤집는 잘못의 예외
    ["4-xc13", ["크다"]], // 사진 Q8: 피제수와 몫의 관계
    ["5-xc12", ["나누는 수"]], // 사진 Q10: 부분끼리 나눌 수 없는 까닭
  ] as const)(
    "%s asks for a term or a short mathematical relation",
    (id, answers) => {
      expect(blankKeywords(definition(id))).toEqual(answers);
    },
  );

  it("asks about cancellation only after converting division to multiplication", () => {
    const text = studentText("4-xc5");
    expect(text).toContain("곱셈으로 바꾼 뒤");
    expect(text).toContain("분자 쪽 수와 분모 쪽 수");
    expect(text).toContain("$1$보다 큰 공약수");
  });

  it("retains the mixed-number numerator construction and its unit-fraction meaning", () => {
    const text = studentText("5-c1");
    expect(text).toContain(
      "자연수 부분에 분모를 곱한 값과 원래 분자를 더한 수",
    );
    expect(text).toContain("단위분수의 개수");
    expect(text).toContain("분모는 그대로");
    expect(studentText("5-xc1")).toContain("분자가 분모보다 크거나 같아도");
  });

  it.each(["3-c3", "2-xc22", "3-xc6", "4-xc13"])(
    "%s shows the positive dividend and strict divisor range before the blank",
    (id) => {
      const text = studentText(id);
      expect(text).toContain("$0$보다 크고 $1$보다 작은 분수");
      expect(text).toMatch(/\$0\$보다 큰 (?:수|분수)|자연수를/);
    },
  );

  it("keeps the reason and compares the quotient with the dividend, not with one", () => {
    const text = studentText("4-xc13");
    expect(text).toContain("$1$보다 큰 수를 곱하는 셈");
    expect(text).toContain("몫은 나누어지는 수보다 □");
    expect(studentText("3-xc16")).toContain(
      "$0$보다 큰 수를 $1$보다 큰 분수로",
    );
    expect(studentText("4-xc25")).toContain(
      "$0$보다 큰 수를 $0$보다 큰 분수로",
    );
  });

  it("distinguishes the wrong reversal from its equal-input exception", () => {
    const text = studentText("4-xc12");
    expect(text).toContain("$0$보다 큰 두 수");
    expect(text).toContain("앞의 분수만 뒤집어 곱한 결과");
    expect(text).toContain("올바른 몫과 같아지는 것은 두 분수의 크기가 □ 때뿐");
    expect(studentText("4-c2")).toContain(
      "$0$이 아닌 □의 분자와 분모만 맞바꾼다",
    );
  });

  it("rejects dividing corresponding mixed-number parts, not splitting only the dividend", () => {
    const text = studentText("5-xc12");
    expect(text).toContain(
      "자연수 부분끼리, 분수 부분끼리 각각 나눈 몫을 더하면",
    );
    expect(text).toContain("올바른 몫이 되지 않는다");
    expect(text).toContain("나누어지는 수가 □ 전체의 몇 배인지");
  });

  it("makes numerator rules apply to proper or improper fractions, not mixed-number parts", () => {
    for (const id of [
      "1-c1",
      "1-c2",
      "1-c3",
      "2-c2",
      "2-c3",
      "4-c1",
      "4-c2",
      "4-c3",
      "1-xc3",
      "1-xc8",
      "1-xc10",
      "1-xc26",
      "2-xc14",
      "2-xc15",
      "2-xc17",
      "3-xc2",
      "3-xc4",
      "3-xc7",
      "3-xc20",
      "4-xc7",
      "4-xc8",
      "4-xc12",
      "4-xc14",
      "4-xc15",
      "4-xc19",
    ]) {
      expect(studentText(id), id).toContain("진분수나 가분수");
    }
  });

  it("identifies the unit fraction relative to the original denominator", () => {
    expect(studentText("3-xc2")).toContain("원래 분수와 분모가 같은 □");
    expect(blankKeywords(definition("3-xc2"))).toEqual(["단위분수"]);
  });

  it("specifies a rectangle's other dimension rather than an arbitrary other side", () => {
    expect(studentText("2-xc26")).toContain("직사각형");
    expect(studentText("2-xc26")).toContain("넓이를 가로로 나누면 □");
    expect(blankKeywords(definition("2-xc26"))).toEqual(["세로"]);
  });

  it("states when complete pieces and the whole part of a mixed quotient are counted", () => {
    expect(studentText("2-xc9")).toContain("큰 분모가 작은 분모의 배수");
    expect(studentText("3-xc27")).toContain(
      "몫이 $1$보다 크고 자연수가 아니면",
    );
    expect(studentText("3-xc27")).toContain("몫을 대분수로 나타낸다");
    expect(blankKeywords(definition("3-xc27"))).toEqual(["자연수 부분", "$1$"]);
  });

  it("does not immediately repeat the answer to the unit-count explanation", () => {
    expect(studentText("1-xc26")).not.toContain("자연수");
    expect(studentText("4-xc19")).not.toContain("분자");
    expect(studentText("3-c2")).not.toContain("분모");
  });
});
