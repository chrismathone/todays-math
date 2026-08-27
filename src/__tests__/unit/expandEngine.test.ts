/**
 * 엔진 산출을 변형 3 × 형식 3 으로 펼친다.
 * generate* 본문은 그대로 두고 이 모듈만 거친다.
 */
import { describe, expect, it } from "vitest";

import { expandFamily } from "@/lib/engine/expandEngine";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { generateMiddleProblem, typesForSection } from "@/lib/middle/generate";
import { classifyFormat } from "@/lib/problem/provenance";

describe("expandFamily", () => {
  it("수 정답이면 변형 3 × 형식 3 = 9행이고 familyKey 는 하나다", () => {
    const familyKey = "elem:fixture|최대공약수|기본";
    const got = expandFamily((v) => ({
      content: `$${12 + v}$와 $18$의 최대공약수를 구하시오.`,
      answer: v === 0 ? "$6$" : v === 1 ? "$3$" : "$2$",
      solution: "약수",
      familyKey,
      problemType: "개념",
    }));
    expect(got.skippedMcq).toBe(0);
    expect(got.items).toHaveLength(9);
    expect(new Set(got.items.map((i) => i.familyKey)).size).toBe(1);
    const qt = got.items.map((i) => i.questionType).sort();
    expect(qt.filter((t) => t === "단답형")).toHaveLength(3);
    expect(qt.filter((t) => t === "서술형")).toHaveLength(3);
    expect(qt.filter((t) => t === "객관식")).toHaveLength(3);
  });

  it("수가 아닌 정답은 객관식만 건너뛰고 단답·서술은 남긴다", () => {
    const got = expandFamily((v) => ({
      content: `관계를 말하시오. (${v})`,
      answer: "정비례",
      solution: "설명",
      familyKey: "elem:fixture|정비례|기본",
      problemType: "개념",
    }));
    expect(got.skippedMcq).toBe(3);
    expect(got.items).toHaveLength(6);
    expect(got.items.every((i) => i.questionType !== "객관식")).toBe(true);
    expect(got.reasons.length).toBe(3);
  });
});

describe("실물 엔진 한 갈래", () => {
  it("초등 한 갈래의 펼친 행이 classifyFormat unknown 이 아니다", () => {
    const unit = elementaryUnits().find(
      (u) => u.grade === "초5" && supportedTiers(u).length === 4,
    );
    expect(unit).toBeTruthy();
    const familyKey = `elem:${unit!.grade}|${unit!.section}|기본`;
    const got = expandFamily((v) => {
      const p = generateElementaryProblem(unit!, 20260826 + v * 1009, "기본");
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey,
        problemType: "개념",
      };
    });
    expect(got.items.length).toBeGreaterThanOrEqual(6);
    for (const item of got.items) {
      const format = classifyFormat({
        content: item.content,
        answer: item.answer,
        familyKey: item.familyKey,
        questionType: item.questionType,
        problemType: item.problemType,
      });
      expect(format, item.content.slice(0, 40)).not.toBe("unknown");
      expect(item.familyKey).toBe(familyKey);
    }
  });

  it("중등 한 유형의 펼친 행이 classifyFormat unknown 이 아니다", () => {
    const types = typesForSection("다항식의 곱셈");
    expect(types.length).toBeGreaterThan(0);
    const entry = types[0]!;
    const familyKey = `mid:${entry.key}`;
    const got = expandFamily((v) => {
      const p = generateMiddleProblem(entry.key, 20260826, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey,
        problemType:
          p.difficulty === "연산" || p.difficulty === "기본" ? "계산" : "활용",
      };
    });
    expect(got.items.length).toBeGreaterThanOrEqual(6);
    for (const item of got.items) {
      const format = classifyFormat({
        content: item.content,
        answer: item.answer,
        familyKey: item.familyKey,
        questionType: item.questionType,
        problemType: item.problemType,
      });
      expect(format, item.content.slice(0, 40)).not.toBe("unknown");
      expect(item.familyKey).toBe(familyKey);
    }
  });

  /**
   * 🔴 중등에는 **이미 보기가 붙은 유형**이 20개 있다(873 중 2.3%).
   *    그런 발문을 파생하면 두 가지가 어긋난다:
   *      ⑴ `asShortAnswer` 가 「단답형」으로 찍는다 — 보기가 다섯 개인데.
   *      ⑵ `asDescriptive` 가 「…풀이 과정과 답을 쓰시오」를 붙인다 —
   *         보기 ①~⑤ 가 그대로 달린 채로. 말이 안 되는 지면이 나간다.
   *    적재 전에 여기서 막는다. `deriveQuestionType` 은 이미 옳게 읽는데
   *    (객관식) 펼치는 쪽만 몰랐다 — 규칙이 두 벌이던 자리다.
   */
  it("이미 보기가 붙은 발문은 파생하지 않고 객관식 그대로 낸다", () => {
    const stem = {
      content: [
        "다음 중 옳은 것은?",
        "① $1$",
        "② $2$",
        "③ $3$",
        "④ $4$",
        "⑤ $5$",
      ].join("\n"),
      answer: "③",
      solution: "풀이",
      familyKey: "mid:2-1|일차부등식|01",
      problemType: "활용",
    };
    let v = 0;
    const got = expandFamily(() => ({
      ...stem,
      content: stem.content.replace("옳은 것은?", `옳은 것은? (${v++})`),
    }));
    // 변형 셋 각각 **한 행**만 — 단답·서술로 부풀리지 않는다.
    expect(got.items).toHaveLength(3);
    for (const item of got.items) {
      expect(item.questionType).toBe("객관식");
      // 서술 지시가 붙으면 안 된다.
      expect(item.content).not.toContain("풀이 과정과 답을 쓰시오");
      // 보기를 한 겹 더 얹으면 안 된다 — ①이 하나뿐이어야 한다.
      expect(item.content.split("①").length - 1).toBe(1);
    }
    expect(got.skippedMcq).toBe(0);
  });

  /**
   * 🔴 위 규칙의 **음성 쪽**. 보기가 붙어 있어도 **정답이 번호가 아니면**
   *    객관식이 아니다 — 「다음 보기 중 …인 것은 모두 몇 개인지 구하시오」는
   *    보기가 **세는 대상**이고 정답이 「$2$개」다.
   *    보기만 보고 접으면 중등 3유형이 통째로 `[?형식]` 이 된다(실측).
   */
  it("보기가 있어도 정답이 번호가 아니면 단답·서술로 파생한다", () => {
    const stem = {
      content: [
        "다음 보기 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.",
        "① $y=x$",
        "② $y=x^2$",
        "③ $y=2x$",
        "④ $y=3x$",
        "⑤ $y=4x$",
      ].join("\n"),
      answer: "$2$개",
      solution: "풀이",
      familyKey: "mid:2-1|일차함수와 그 그래프|01",
      problemType: "활용",
    };
    let v = 0;
    const got = expandFamily(() => ({
      ...stem,
      content: stem.content.replace("함수인", `함수인(${v++})`),
    }));
    const kinds = got.items.map((i) => i.questionType);
    expect(kinds).toContain("단답형");
    expect(kinds).toContain("서술형");
    // 그리고 화면 판정이 `unknown` 으로 떨어지면 안 된다.
    for (const item of got.items) {
      expect(
        classifyFormat({
          content: item.content,
          answer: item.answer,
          familyKey: item.familyKey,
          questionType: item.questionType,
          problemType: item.problemType,
        }),
        item.questionType,
      ).not.toBe("unknown");
    }
  });
});
