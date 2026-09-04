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
  declaredUpperBound,
  deriveThreeFormats,
  monomialExponentMistakes,
  numericMistakes,
  reversesOrder,
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
  // ⚠️ 예전 기대값은 「최대공약수를 풀이 과정과…」였다. 그건 우리말이 아니다 —
  //    끝맺음 동사를 지운 결과였고, 그 자체가 결함이었다(실측 초등 494 · 중등 654).
  it("구하시오 를 매김꼴로 바꿔 잇는다", () => {
    const got = asDescriptive(STEM);
    expect(got.content).toBe(
      "$12$와 $18$의 최대공약수를 구하는 풀이 과정과 답을 쓰시오.",
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

  /**
   * 🔴 끝맺음 동사를 **지우면 말이 깨진다.**
   *    「다음 식을 전개하시오.」 → 「다음 식을 전개풀이 과정과 답을 쓰시오.」
   *    실측으로 중등 873 중 654, 초등 2,300 중 494 가 그랬다.
   *    지우지 말고 매김꼴(-는)로 바꿔 잇는다.
   */
  it("끝맺음 동사를 매김꼴로 바꿔 잇는다 — 앞말에 붙여 깨뜨리지 않는다", () => {
    expect(toDescriptiveStem("다음 식을 전개하시오.")).toBe(
      "다음 식을 전개하는 풀이 과정과 답을 쓰시오.",
    );
    expect(toDescriptiveStem("가장 큰 수를 구하시오.")).toBe(
      "가장 큰 수를 구하는 풀이 과정과 답을 쓰시오.",
    );
    // 「쓰시오·나타내시오」는 지시와 겹치므로 「구하는」으로 받는다.
    expect(toDescriptiveStem("백의 자리 숫자를 쓰시오.")).toBe(
      "백의 자리 숫자를 구하는 풀이 과정과 답을 쓰시오.",
    );
    // 🔴 앞말에 바로 붙으면 안 된다.
    for (const c of [
      "다음 식을 전개하시오.",
      "가장 큰 수를 구하시오.",
      "넓이를 구하여라.",
      "옳은 것을 고르시오.",
    ])
      expect(toDescriptiveStem(c), c).not.toMatch(
        /[가-힣]풀이 과정과 답을 쓰시오/,
      );
  });

  it("앞이 이미 «묻는 꼴»이면 동사를 떨군다 — 원장님 예시 그대로", () => {
    expect(toDescriptiveStem("길이는 몇 cm 인지 구하시오.")).toBe(
      "길이는 몇 cm 인지 풀이 과정과 답을 쓰시오.",
    );
    expect(toDescriptiveStem("모두 몇 개인지 쓰시오.")).toBe(
      "모두 몇 개인지 풀이 과정과 답을 쓰시오.",
    );
    // 겹쳐 쓰지 않는다.
    expect(toDescriptiveStem("모두 몇 개인지 구하시오.")).not.toContain(
      "구하는 풀이",
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

describe("단위·꼬리표가 붙은 정답 — 틀은 남기고 수만 바꾼다", () => {
  /**
   * 🔴 중등 객관식이 873 중 227 뿐이던 까닭은 「정답이 식」이라서가 **아니었다.**
   *    전수로 세니 못 만든 정답의 대부분이 **단위가 붙은 수**였다:
   *      $8\,\mathrm{cm}$ 78 · $90^\circ$ 76 · $12$개 61 · $254\,\mathrm{cm}^2$ 29 …
   *    `numericMistakes` 가 맨 숫자만 봐서 통째로 못 만들었다.
   *    수만 바꾸고 **틀은 그대로** 두면 그대로 오답이 된다.
   */
  it("단위가 붙어도 오답을 만든다 — 단위는 그대로 따라간다", () => {
    for (const answer of [
      "$8\\,\\mathrm{cm}$",
      "$90^\\circ$",
      "$12$개",
      "$254\\,\\mathrm{cm}^2$",
      "$11$명",
      "$86$점",
    ]) {
      const got = numericMistakes(answer);
      expect(got.length, answer).toBeGreaterThanOrEqual(4);
      // 틀이 살아 있어야 한다 — 숫자만 다르고 나머지는 같다.
      const shape = (t: string) => t.replace(/-?\d+(?:\.\d+)?/g, "N");
      for (const m of got)
        expect(shape(m.value), `${answer} → ${m.value}`).toBe(shape(answer));
    }
  });

  it("dfrac 도 frac 과 같이 다룬다", () => {
    const got = numericMistakes("$\\dfrac{2}{3}$");
    expect(got.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * 🔴 **닫힌 영역**은 손대지 않는다. 「제$2$사분면」에서 수를 바꾸면
   *    「제$8$사분면」이 나온다 — 학생이 계산 없이 지워 내는 가짜 오답이라
   *    문항이 오히려 쉬워진다. 없는 것을 지어내지 않는다.
   */
  it("🔴 닫힌 영역(사분면)은 오답을 지어내지 않는다", () => {
    expect(numericMistakes("제$2$사분면")).toHaveLength(0);
  });
});

describe("계산 실수 목록 — 값이 목록을 가른다", () => {
  it("정수 정답의 후보에 하나 더하기·두 배가 있다", () => {
    const tags = new Set(numericMistakes("$6$").map((m) => m.tag));
    expect(tags.has("off-by-one-up")).toBe(true);
    expect(tags.has("off-by-one-down")).toBe(true);
    expect(tags.has("double")).toBe(true);
  });

  /**
   * 🔴 이 시험은 종전에 「정답 $6$ 의 후보에 `sign-flip` 이 **있다**」를 지키고
   *    있었다. 그것이 결함 그 자체였다 — 초3 「두 수의 합」 보기에 `$-865$` 가
   *    나간 원인이다(원장님 지적 2026-08-27). 초등에는 음수가 없고, 합이
   *    분수가 될 수도 없다. 학생이 계산 없이 지워 내므로 오답이 아니다.
   *
   * ⚠️ 「없다」만 재면 `numericMistakes` 가 통째로 빈 목록을 내도 초록이다.
   *    그래서 **음의 정수 정답에서는 있다**를 같이 잰다 — 중등 부호 실수는
   *    진짜 오답이라 살아 있어야 한다. 둘 중 하나만 있으면 이 규칙을 못 지킨다.
   */
  it("🔴 음이 아닌 정수 정답에는 음수·분수 오답이 없다 (음의 정수에는 있다)", () => {
    const plus = numericMistakes("$865$");
    expect(plus.length).toBeGreaterThanOrEqual(4);
    expect(plus.filter((m) => m.value.includes("-"))).toEqual([]);
    expect(plus.filter((m) => m.value.includes("frac"))).toEqual([]);

    const minus = numericMistakes("$-5$");
    expect(minus.some((m) => m.tag === "sign-flip" && m.value === "$5$")).toBe(
      true,
    );
  });

  /**
   * 🔴 **위 시험은 «정수» 정답만 본다.** 그래서 「정답이 분수·소수면 부호 가드가
   *    통째로 꺼진다」를 구조적으로 못 봤다 — `sameKind` 의 첫 줄이
   *    `if (answer.d !== 1) return true;` 라 **분모가 1이 아니면 무엇이든 통과**했다.
   *    초3 정답 `$0.3$` 의 보기에 `$-0.03$` 이 나갔다 — 적재본 실측 **293건**
   *    (초등 261 · 중등 32, 2026-08-30).
   *
   * ⚠️ 여기서도 「없다」만 재면 `numericMistakes` 가 빈 목록을 내도 초록이다.
   *    개수 하한과 **음의 분수 정답에는 있다**를 같이 잰다.
   */
  it("🔴 음이 아닌 **분수·소수** 정답에도 음수 오답이 없다 (음의 분수에는 있다)", () => {
    for (const answer of ["$\\frac{1}{6}$", "$0.3$", "$3.3$"]) {
      const got = numericMistakes(answer);
      expect(got.length, answer).toBeGreaterThanOrEqual(3);
      expect(
        got.filter((m) => /^\$\s*-/.test(m.value)).map((m) => m.value),
        `${answer} 의 보기에 음수가 있다`,
      ).toEqual([]);
    }
    // 정답이 음수면 부호 실수는 **진짜 오답**이다 — 살아 있어야 한다(중등).
    const minus = numericMistakes("$-\\frac{1}{6}$");
    expect(minus.some((m) => /^\$\s*-/.test(m.value))).toBe(true);
  });

  /**
   * 위 가드를 켜면 `sign-flip`·`reciprocal`·`denominator-plus` 가 빠져 정수
   * 정답의 후보가 모자란다. **자릿수 실수**로 채운다 — 없는 자리는 안 만든다.
   */
  it("자릿수 실수는 그 자리가 있을 때만 낸다", () => {
    const big = new Set(numericMistakes("$865$").map((m) => m.tag));
    expect(big.has("carry-10-up")).toBe(true);
    expect(big.has("carry-100-down")).toBe(true);

    const small = new Set(numericMistakes("$6$").map((m) => m.tag));
    expect(small.has("carry-10-up")).toBe(false);
    expect(small.has("carry-100-up")).toBe(false);
    expect(small.has("off-by-two-up")).toBe(true);
  });

  /**
   * `×10`·`÷10` 은 자릿수가 통째로 달라져 크기만 보고 지워 낸다. 그러나 버리면
   * 초등 69갈래·중등 54유형이 5지선다를 잃는다(실측) — **뒤로 밀 뿐 안 버린다.**
   * 좋은 후보가 넷 이상이면 보기에 안 나오고, 모자라면 나온다.
   */
  it("🔴 ×10 은 좋은 후보로 넷을 채울 수 있으면 보기에 안 나온다", () => {
    const stem = {
      content: "두 수의 합을 구하시오.\n\n$485$,  $342$",
      answer: "$827$",
      solution: "",
      familyKey: "elem:초3|1-1-1|01",
      problemType: "계산",
    };
    for (let seed = 1; seed <= 20; seed += 1) {
      const got = asMultipleChoice(stem, createRng(seed));
      expect(got.content, `씨앗 ${seed}`).not.toContain("$8270$");
      expect(got.content, `씨앗 ${seed}`).not.toContain("$82$");
    }
  });

  it("분수 정답의 후보에 역수가 있다", () => {
    const tags = new Set(numericMistakes("$\\frac{2}{3}$").map((m) => m.tag));
    expect(tags.has("reciprocal")).toBe(true);
  });

  it("수가 아니면 빈 목록이다 — 오답을 지어내지 않는다", () => {
    expect(numericMistakes("정비례")).toEqual([]);
  });
});

/**
 * 🔴 **구간이 정답인 유형** — 2026-09-02 확대 갈래 3차 물결(중2 `35V`)이 처음 들여왔다.
 *
 * 한쪽 끝만 흔들면 «있을 수 없는 구간»이 보기에 찍힌다. 실측 157/1200판(13.1%).
 * `shapeOf` 가르기는 이 부류를 **구조적으로 못 본다** — 모양은 그대로다.
 * 등록 1,411유형을 전수로 훑어 이 부류를 내는 것은 `35V` 하나뿐이었다.
 */
describe("객관식 — 구간이 정답이면 뒤집힌 구간을 보기로 내지 않는다", () => {
  it("자가 살아 있다 — 뒤집힌 것은 잡고 옳은 것은 안 잡는다", () => {
    expect(reversesOrder("$12\\le y\\le10$")).toBe(true);
    expect(reversesOrder("$8\\le y\\le12$")).toBe(false);
    expect(reversesOrder("$-3\\le x\\le-5$")).toBe(true);
    // 사슬이 아니면 아무 말도 안 한다 — 「$5\\le x$」 하나만으로는 못 뒤집는다.
    expect(reversesOrder("$5\\le x$")).toBe(false);
    expect(reversesOrder("$7$")).toBe(false);
  });

  it("오답 후보에서 뒤집힌 구간이 빠진다", () => {
    const answer = "$6\\le y\\le10$";
    const values = numericMistakes(answer).map((m) => m.value);
    expect(values.length).toBeGreaterThan(0); // 「0개라 초록」이 아님을 못 박는다
    for (const v of values) expect(reversesOrder(v)).toBe(false);
    // 가드가 없으면 나오던 바로 그 값
    expect(values).not.toContain("$12\\le y\\le10$");
  });

  it("보기 다섯을 만들어도 뒤집힌 구간이 없다", () => {
    const stem: StemProblem = {
      content: "$y$의 값의 범위를 구하시오.",
      answer: "$6\\le y\\le10$",
      solution: "풀이.",
      familyKey: "mid:test",
      problemType: "활용",
    };
    let made = 0;
    for (let i = 0; i < 40; i += 1) {
      let mc;
      try {
        mc = asMultipleChoice(stem, createRng(1000 + i));
      } catch {
        continue; // 후보가 넷이 안 되면 객관식을 안 만든다 — 그건 정상이다
      }
      made += 1;
      expect(reversesOrder(mc.content), mc.content).toBe(false);
    }
    expect(made).toBeGreaterThan(0);

    // 🔴 대가(D-20) — 후보가 넷을 못 채우면 그 변형은 **객관식이 안 나온다.**
    //    `$1\\le y\\le9$` 는 후보가 셋뿐이라(위쪽 $2$·아래쪽 $0$·$3$)
    //    던진다. 35V 실측으로 1,200판 중 객관식을 못 만든 판이 107 → 186 이 됐다.
    //    단답형은 그대로 나가므로 문항을 잃지는 않는다.
    expect(() =>
      asMultipleChoice({ ...stem, answer: "$1\\le y\\le9$" }, createRng(1)),
    ).toThrow();
  });
});

describe("발문이 스스로 못 박은 상한 (4차 물결 `37W`)", () => {
  const WORK_STEM =
    "(단, 전체 일의 양을 $1$로 놓고, 두 사람이 하루에 하는 일의 양은 일정하다.)";

  it("눈금 — 이 자가 «있다»와 «없다»를 가른다", () => {
    // 양성 — 발문이 스스로 상한을 선언한다
    expect(declaredUpperBound(WORK_STEM)).toBe(1);
    expect(declaredUpperBound("전체를 $1$이라 하면 …")).toBe(1);
    expect(declaredUpperBound("전체 일의 양을 1로 생각하자.")).toBe(1);
    // 음성 — 「전체」가 나와도 상한을 선언하지 않으면 아무 말도 안 한다
    expect(declaredUpperBound("전체 학생 수를 구하시오.")).toBeNull();
    expect(declaredUpperBound("두 수의 합이 $1$이다.")).toBeNull();
    expect(declaredUpperBound("$100$점 만점인 시험에서 …")).toBeNull();
  });

  it("상한을 넘는 오답은 **맨 뒤로 밀린다** — 넷이 다 넘는 판이 없다", () => {
    const stem: StemProblem = {
      content: `두 사람이 함께 하루에 하는 일의 양을 구하시오. ${WORK_STEM}`,
      answer: "$\\dfrac{37}{180}$",
      solution: "풀이.",
      familyKey: "mid:test",
      problemType: "활용",
    };
    const value = (t: string): number | null => {
      const m = /frac\{(-?\d+)\}\{(-?\d+)\}/.exec(t);
      return m ? Number(m[1]) / Number(m[2]) : null;
    };
    let made = 0;
    let worst = 0;
    for (let i = 0; i < 60; i += 1) {
      let mc;
      try {
        mc = asMultipleChoice(stem, createRng(4000 + i));
      } catch {
        continue;
      }
      made += 1;
      const opts = mc.content
        .split("\n")
        .filter((ln) => "①②③④⑤".includes(ln.trim()[0] ?? ""))
        .map((ln) => ln.trim().slice(1).trim());
      expect(opts).toHaveLength(5);
      const over = opts.filter((t) => {
        const v = value(t);
        return t !== stem.answer && v !== null && v > 1;
      }).length;
      worst = Math.max(worst, over);
    }
    expect(made).toBeGreaterThan(0);
    // 🔴 가드가 없으면 여기가 **4** 였다(실측 400판 중 3판, 0.75%). 그 판은
    //    학생이 계산 없이 답을 집는다. 「뒤로 민다」이므로 0 은 못 되고,
    //    좋은 후보 셋이 늘 있으므로 **하나까지**다.
    expect(worst).toBeLessThanOrEqual(1);
  });

  it("상한을 안 선언하는 발문에서는 아무것도 안 바뀐다 (음성 대조)", () => {
    const stem: StemProblem = {
      content: "두 수의 곱을 구하시오.",
      answer: "$\\dfrac{37}{180}$",
      solution: "풀이.",
      familyKey: "mid:test",
      problemType: "활용",
    };
    // 상한을 안 선언하면 «$1$ 을 넘는 오답»이 그대로 나온다 — 그게 정상이다.
    // ⚠️ 씨앗 하나로 보면 안 된다. 뽑기가 무작위라 그 판에 안 실릴 수 있다 —
    //    그러면 이 음성 대조가 「가드가 꺼져 있다」를 못 보고 조용히 초록이 된다.
    let over = 0;
    for (let i = 0; i < 30; i += 1) {
      const opts = asMultipleChoice(stem, createRng(7000 + i))
        .content.split("\n")
        .filter((ln) => "①②③④⑤".includes(ln.trim()[0] ?? ""));
      expect(opts).toHaveLength(5);
      const m = /frac\{(-?\d+)\}\{(-?\d+)\}/;
      over += opts.filter((t) => {
        const g = m.exec(t);
        return (
          g !== null &&
          !t.includes("{37}{180}") &&
          Number(g[1]) / Number(g[2]) > 1
        );
      }).length;
    }
    expect(over).toBeGreaterThan(0);
  });

  it("상한 때문에 후보가 모자라도 객관식을 잃지 않는다 — 버리지 않고 민다", () => {
    // 정답이 $1$ 에 가까우면 좋은 후보가 거의 다 상한을 넘는다.
    const stem: StemProblem = {
      content: `하루에 하는 일의 양을 구하시오. ${WORK_STEM}`,
      answer: "$\\dfrac{9}{10}$",
      solution: "풀이.",
      familyKey: "mid:test",
      problemType: "활용",
    };
    const mc = asMultipleChoice(stem, createRng(11));
    expect(
      mc.content
        .split("\n")
        .filter((ln) => "①②③④⑤".includes(ln.trim()[0] ?? "")),
    ).toHaveLength(5);
  });
});

/**
 * 단항식 정답의 **지수 오답** — 2026-09-04 중2 `124X`(심화상) 적대 검문이
 * 잡은 자리. 계수만 흔들면 보기 다섯의 지수가 전부 같아져, 「$x$·$y$ 의 지수를
 * 각각 따져야 한다」가 마디인 유형이 객관식에서 계수 하나로 풀린다.
 *
 * 🔴 여기서 재는 것은 둘이다 — ⑴ **단항식에만** 낸다(아니면 이차함수·곱셈공식의
 * 보기가 «이차식이 아닌 것»이 되어 오히려 쉬워진다) ⑵ 단항식이면 **반드시 하나는**
 * 보기에 든다(넷을 무작위로 뽑으므로 넣어 두기만 해서는 안 드는 판이 생긴다).
 */
describe("단항식 지수 오답", () => {
  const expsOf = (t: string): string =>
    [...t.matchAll(/\^\{(\d+)\}/g)].map((m) => m[1]).join(",");

  it("계수는 그대로 두고 지수만 흔든다 — 맞바꿈까지", () => {
    const got = monomialExponentMistakes("$36x^{9}y^{7}$");
    const values = got.map((m) => m.value);
    expect(values).toContain("$36x^{10}y^{7}$");
    expect(values).toContain("$36x^{8}y^{7}$");
    expect(values).toContain("$36x^{9}y^{8}$");
    expect(values).toContain("$36x^{9}y^{6}$");
    expect(values, "두 지수를 맞바꾼 실수").toContain("$36x^{7}y^{9}$");
    for (const v of values) {
      expect(v, "계수는 한 번도 안 바뀐다").toMatch(/^\$36[a-z]/);
      expect(v, "정답 그 자체는 오답이 아니다").not.toBe("$36x^{9}y^{7}$");
    }
  });

  it("지수 $1$·$0$ 은 안 만든다 — 표기가 사라져 모양이 달라진다", () => {
    // 🔴 처음엔 「`^{1}`·`^{0}` 이 없다」로만 봤는데, 지수가 $1$ 이면 표기 자체가
    //    사라져 `$5xy^{2}$` 가 되므로 그 검사가 **구조적으로 못 본다**(변이가 초록이었다).
    //    모양을 통째로 못 박는다 — 두 변수가 **둘 다** 지수를 달고 있어야 한다.
    for (const v of monomialExponentMistakes("$5x^{2}y^{2}$").map(
      (m) => m.value,
    )) {
      expect(v, "지수 표기가 사라지면 모양이 달라진다").toMatch(
        /^\$5x\^\{\d+\}y\^\{\d+\}\$$/,
      );
      for (const e of [...v.matchAll(/\^\{(\d+)\}/g)]) {
        expect(Number(e[1]), v).toBeGreaterThanOrEqual(2);
      }
    }
    // 지수가 $1$ 인 변수는 **올리기만** 한다 — 내리면 변수가 사라진다.
    for (const v of monomialExponentMistakes("$5xy^{2}$").map((m) => m.value)) {
      expect(v, "변수가 사라지면 안 된다").toMatch(/x/);
      expect(v).toMatch(/y/);
      expect(v).not.toMatch(/\^\{[01]\}/);
    }
  });

  it("🔴 음성 대조 — 단항식이 아니면 한 개도 안 낸다", () => {
    for (const notMono of [
      "$4x^{2}-81$", // 곱셈 공식
      "$y=4x^{2}$", // 이차함수
      "$6x^{2}y(x-5y)$", // 인수분해
      "$12$", // 그냥 수
      "$\dfrac{3}{4}$",
      "$8\,\mathrm{cm}^{3}$", // 단위 지수
      "$x^{6}y^{4}$", // 계수가 없다
    ]) {
      expect(monomialExponentMistakes(notMono), notMono).toEqual([]);
    }
  });

  it("보기 다섯에 지수 오답이 **반드시** 하나는 든다", () => {
    const stem: StemProblem = {
      content: "다음 식을 간단히 하시오. $A\times B\div C$",
      answer: "$36x^{9}y^{7}$",
      solution: "풀이.",
      familyKey: "mid:test",
      problemType: "계산",
    };
    let vary = 0;
    for (let s = 1; s <= 200; s += 1) {
      const mc = asMultipleChoice(stem, createRng(s * 7919 + 13));
      const sets = new Set(
        mc.content
          .split("\n")
          .filter((ln) => "①②③④⑤".includes(ln.trim()[0] ?? ""))
          .map((ln) => expsOf(ln)),
      );
      expect(sets.size, mc.content).toBeGreaterThan(0);
      if (sets.size > 1) vary += 1;
    }
    // 🔴 고치기 전에는 **0/200** 이었다(계수만 흔들었다).
    expect(vary, "지수가 갈리는 판").toBe(200);
  });

  it("🔴 음성 대조 — 단항식이 아닌 정답의 보기는 지수가 그대로다", () => {
    const stem: StemProblem = {
      content: "다음 식을 전개하시오. $(2x-9)(2x+9)$",
      answer: "$4x^{2}-81$",
      solution: "풀이.",
      familyKey: "mid:test",
      problemType: "계산",
    };
    for (let s = 1; s <= 50; s += 1) {
      const mc = asMultipleChoice(stem, createRng(s * 31 + 5));
      const sets = new Set(
        mc.content
          .split("\n")
          .filter((ln) => "①②③④⑤".includes(ln.trim()[0] ?? ""))
          .map((ln) => expsOf(ln)),
      );
      expect(sets.size, mc.content).toBe(1);
    }
  });
});
