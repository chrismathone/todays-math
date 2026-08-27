/**
 * 엔진 단답형 → 객관식·서술형 파생. 생성기마다 손대지 않고 **한 모듈**만 거친다.
 *
 * 브리프: 서술형 = 발문 끝 「풀이 과정과 답을 쓰시오」.
 *         객관식 = 5지선다, 오답은 계산 실수(무작위 수 금지).
 *         familyKey 는 형식에 갈라지지 않는다.
 * 판정은 규칙을 옮겨 적지 않는다 — `classifyFormat` / `deriveQuestionType`.
 */
import { describe, expect, it } from "vitest";

import { deriveQuestionType } from "@/lib/ai/questionType";
import {
  asDescriptive,
  asMultipleChoice,
  asShortAnswer,
  deriveThreeFormats,
  numericMistakes,
  toDescriptiveStem,
  type StemProblem,
} from "@/lib/engine/deriveFormats";
import { createRng } from "@/lib/elementary/rng";
import { canonicalCircled } from "@/lib/math/circledNumber";
import { choiceCountOf, hasChoices } from "@/lib/problem/choiceCountRule";
import { classifyFormat } from "@/lib/problem/provenance";

const FAMILY = "elem:초5|1-1-2 최대공약수|기본";

const STEM: StemProblem = {
  content: "$12$와 $18$의 최대공약수를 구하시오.",
  answer: "$6$",
  solution:
    "$12=2\\times2\\times3$, $18=2\\times3\\times3$ 이므로 $2\\times3=6$.",
  familyKey: FAMILY,
  problemType: "개념",
};

function asFormatInput(p: {
  content: string;
  answer: string;
  familyKey: string;
  questionType: string;
  problemType: string;
}) {
  return {
    content: p.content,
    answer: p.answer,
    familyKey: p.familyKey,
    questionType: p.questionType,
    problemType: p.problemType,
  };
}

describe("단답형", () => {
  it("본문·정답·familyKey·problemType 을 그대로 두고 questionType 만 단답형이다", () => {
    const got = asShortAnswer(STEM);
    expect(got.content).toBe(STEM.content);
    expect(got.answer).toBe(STEM.answer);
    expect(got.familyKey).toBe(FAMILY);
    expect(got.problemType).toBe("개념");
    expect(got.questionType).toBe("단답형");
  });

  it("classifyFormat 이 단답형이고 unknown 이 아니다", () => {
    const got = asShortAnswer(STEM);
    expect(classifyFormat(asFormatInput(got))).toBe("short_answer");
    expect(classifyFormat(asFormatInput(got))).not.toBe("unknown");
  });
});

describe("서술형", () => {
  it("구하시오 를 풀이 과정과 답을 쓰시오 로 바꾼다", () => {
    const got = asDescriptive(STEM);
    expect(got.content).toBe(
      "$12$와 $18$의 최대공약수를 풀이 과정과 답을 쓰시오.",
    );
    expect(got.answer).toBe(STEM.answer);
    expect(got.questionType).toBe("서술형");
    expect(got.problemType).toBe("개념");
  });

  it("입니까? 는 인지 풀이 과정과 답을 쓰시오 로 바꾼다", () => {
    const got = asDescriptive({
      ...STEM,
      content: "길이는 몇 $\\mathrm{cm}$입니까?",
    });
    expect(got.content).toBe(
      "길이는 몇 $\\mathrm{cm}$인지 풀이 과정과 답을 쓰시오.",
    );
  });

  it("이미 그 문장이면 두 번 붙이지 않는다", () => {
    const once = asDescriptive(STEM);
    const twice = asDescriptive({ ...STEM, content: once.content });
    expect(twice.content).toBe(once.content);
    expect(twice.content.split("풀이 과정과 답을 쓰시오").length - 1).toBe(1);
  });

  it("familyKey 는 그대로다", () => {
    expect(asDescriptive(STEM).familyKey).toBe(FAMILY);
  });

  it("classifyFormat 이 서술형이다 — 엔진 표지만 보면 단답이므로 questionType 이 있어야 한다", () => {
    const got = asDescriptive(STEM);
    expect(classifyFormat(asFormatInput(got))).toBe("descriptive");
    // questionType 을 안 적으면 엔진 표지가 단답으로 읽는다(provenance.ts).
    expect(
      classifyFormat(asFormatInput({ ...got, questionType: "단답형" })),
    ).toBe("short_answer");
  });
});

describe("서술형 — 발문 뒤에 목록이 붙은 문항", () => {
  /**
   * 🔴 `toDescriptiveStem` 은 **문자열 끝**을 보고 물음을 바꾼다. 그런데 중등에는
   *    「다음 보기 중 …인 것은 모두 몇 개인지 구하시오.」 뒤에 보기 목록이 붙는
   *    유형이 있다. 그러면 물음 문장이 **중간**에 있어서, 지시가 마지막 보기 뒤에
   *    붙는다 — 「⑤ $y=(x+2)^2$ 풀이 과정과 답을 쓰시오.」 라는 지면이 나간다.
   *
   *    실측으로 중등 3유형이 그렇다. 물음 **문장**을 바꿔야 한다.
   */
  it("보기 목록 앞의 물음 문장을 바꾼다 — 목록 뒤에 붙이지 않는다", () => {
    const content = [
      "다음 보기 중 $y$가 이차함수인 것은 모두 몇 개인지 구하시오.",
      "\u2460 $y=x^2$",
      "\u2461 $y=x^3$",
      "\u2464 $y=(x+2)^2$",
    ].join("\n");
    const got = toDescriptiveStem(content);
    const lines = got.split("\n");
    expect(lines[0]).toContain("풀이 과정과 답을 쓰시오");
    // 마지막 보기 줄은 그대로여야 한다.
    expect(lines[lines.length - 1]).toBe("\u2464 $y=(x+2)^2$");
    // 지시는 딱 한 번만.
    expect(got.split("풀이 과정과 답을 쓰시오").length - 1).toBe(1);
  });

  it("목록이 없으면 종전대로 끝을 바꾼다", () => {
    expect(toDescriptiveStem("넓이를 구하시오.")).toBe(
      "넓이를 풀이 과정과 답을 쓰시오.",
    );
  });
});

describe("객관식", () => {
  it("보기는 리터럴 5개이고 정답은 원문자다", () => {
    const got = asMultipleChoice(STEM, createRng(1));
    expect(choiceCountOf(got.content)).toBe(5);
    expect(hasChoices(got.content)).toBe(true);
    expect(["①", "②", "③", "④", "⑤"]).toContain(got.answer);
    expect(got.questionType).toBe("객관식");
    expect(got.familyKey).toBe(FAMILY);
    expect(got.problemType).toBe("개념");
  });

  it("classifyFormat · deriveQuestionType 이 둘 다 객관식이다", () => {
    const got = asMultipleChoice(STEM, createRng(1));
    expect(classifyFormat(asFormatInput(got))).toBe("multiple_choice");
    expect(
      deriveQuestionType({
        content: got.content,
        answer: got.answer,
        problemType: got.problemType,
      }),
    ).toBe("객관식");
  });

  it("정답 값이 보기 안에 있고, 오답 넷은 전부 계산 실수 목록에 있다", () => {
    const got = asMultipleChoice(STEM, createRng(7));
    const lines = got.content.split("\n").filter((l) => /^[①②③④⑤]/.test(l));
    expect(lines).toHaveLength(5);
    const values = lines.map((l) => l.replace(/^[①②③④⑤]\s*/, "").trim());
    const mark = got.answer;
    const chosen = lines.find((l) => l.startsWith(mark))!;
    const chosenValue = chosen.replace(/^[①②③④⑤]\s*/, "").trim();
    expect(chosenValue).toBe(STEM.answer);

    const allowed = new Set(numericMistakes(STEM.answer).map((m) => m.value));
    const distractors = values.filter((v) => v !== STEM.answer);
    expect(distractors).toHaveLength(4);
    for (const d of distractors) {
      expect(allowed.has(d), `오답 ${d} 은 계산 실수 목록에 없다`).toBe(true);
    }
  });

  it("오답은 무작위 수가 아니다 — 정답 6 의 목록에 없는 999 가 끼면 빨개진다", () => {
    const catalog = new Set(numericMistakes("$6$").map((m) => m.value));
    expect(catalog.has("$999$")).toBe(false);
    expect(catalog.has("999")).toBe(false);
    const got = asMultipleChoice(STEM, createRng(3));
    expect(got.content.includes("999")).toBe(false);
  });

  it("이미 보기가 있으면 겹쳐 만들지 않고 던진다", () => {
    expect(() =>
      asMultipleChoice(
        {
          ...STEM,
          content: "다음 중 옳은 것은?\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5",
          answer: "③",
        },
        createRng(1),
      ),
    ).toThrow(/보기/);
  });

  it("정답이 수가 아니면 던진다 — 오답을 지어내지 않는다", () => {
    expect(() =>
      asMultipleChoice({ ...STEM, answer: "정비례" }, createRng(1)),
    ).toThrow(/수/);
  });

  it("씨앗이 바뀌면 정답 원문자 자리가 달라질 수 있다 — 항상 ③ 이 아니다", () => {
    const marks = new Set<string>();
    for (let s = 1; s <= 40; s += 1) {
      marks.add(asMultipleChoice(STEM, createRng(s)).answer);
    }
    expect(marks.size).toBeGreaterThan(1);
    for (const m of marks) {
      expect(canonicalCircled(["①", "②", "③", "④", "⑤"].indexOf(m) + 1)).toBe(
        m,
      );
    }
  });
});

describe("세 형식 — familyKey 가 갈라지지 않는다", () => {
  it("객·단·서의 familyKey 는 하나다", () => {
    const three = deriveThreeFormats(STEM, createRng(11));
    expect(
      new Set([
        three.단답형.familyKey,
        three.객관식.familyKey,
        three.서술형.familyKey,
      ]).size,
    ).toBe(1);
    expect(three.단답형.familyKey).toBe(FAMILY);
  });

  it("화면 판정이 세 갈래로 서고 unknown 은 0이다", () => {
    const three = deriveThreeFormats(STEM, createRng(11));
    expect(classifyFormat(asFormatInput(three.단답형))).toBe("short_answer");
    expect(classifyFormat(asFormatInput(three.객관식))).toBe("multiple_choice");
    expect(classifyFormat(asFormatInput(three.서술형))).toBe("descriptive");
  });

  it("problemType 을 서술형으로 덮어쓰지 않는다 — 난이도 축을 형식에 접지 않는다", () => {
    const three = deriveThreeFormats(STEM, createRng(11));
    expect(three.서술형.problemType).toBe("개념");
    expect(three.객관식.problemType).toBe("개념");
  });
});

describe("계산 실수 목록 — 값이 목록을 가른다", () => {
  it("정수 정답의 후보에 하나 더하기·부호 반전·두 배가 있다", () => {
    const tags = new Set(numericMistakes("$6$").map((m) => m.tag));
    expect(tags.has("off-by-one-up")).toBe(true);
    expect(tags.has("off-by-one-down")).toBe(true);
    expect(tags.has("sign-flip")).toBe(true);
    expect(tags.has("double")).toBe(true);
  });

  it("분수 정답의 후보에 역수가 있다", () => {
    const tags = new Set(numericMistakes("$\\frac{2}{3}$").map((m) => m.tag));
    expect(tags.has("reciprocal")).toBe(true);
  });

  it("수가 아니면 빈 목록이다 — 오답을 지어내지 않는다", () => {
    expect(numericMistakes("정비례")).toEqual([]);
  });
});
