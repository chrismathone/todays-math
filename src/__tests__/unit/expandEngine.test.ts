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
  it("수 정답이면 변형 3 × 형식 2 = 6행이고 familyKey 는 하나다", () => {
    const familyKey = "elem:fixture|최대공약수|기본";
    const got = expandFamily((v) => ({
      content: `$${12 + v}$와 $18$의 최대공약수를 구하시오.`,
      answer: v === 0 ? "$6$" : v === 1 ? "$3$" : "$2$",
      solution: "약수",
      familyKey,
      problemType: "개념",
    }));
    expect(got.skippedMcq).toBe(0);
    expect(got.items).toHaveLength(6);
    expect(new Set(got.items.map((i) => i.familyKey)).size).toBe(1);
    const qt = got.items.map((i) => i.questionType).sort();
    expect(qt.filter((t) => t === "단답형")).toHaveLength(3);
    expect(qt.filter((t) => t === "객관식")).toHaveLength(3);
  });

  it("수가 아닌 정답은 객관식만 건너뛰고 단답은 남긴다", () => {
    const got = expandFamily((v) => ({
      content: `관계를 말하시오. (${v})`,
      answer: "정비례",
      solution: "설명",
      familyKey: "elem:fixture|정비례|기본",
      problemType: "개념",
    }));
    expect(got.skippedMcq).toBe(3);
    expect(got.items).toHaveLength(3);
    expect(got.items.every((i) => i.questionType === "단답형")).toBe(true);
    expect(got.reasons.length).toBe(3);
  });

  /**
   * 🔴 **파생 서술형 금지** (원장님 확정 2026-08-27).
   *
   * 발문 끝맺음만 바꿔 만든 서술형은 문항이 아니라 **단답형의 복제**였다 —
   * 실측 9,476건 중 9,467건(99.9%)이 같은 문항류에 풀이가 글자까지 같은
   * 단답형 짝을 갖고 있었고, 절반은 쓸 과정 자체가 없었다
   * (「$13$은 두 수의 공배수가 아닙니다.」).
   *
   * 서술형은 **생성기가 처음부터 서술형으로** 낸다. 이 시험은 파생 경로가
   * 되살아나면 빨개진다 — `expandEngine` 이 `asDescriptive` 를 다시 부르는
   * 순간 걸린다. 어투 변환기 자체(`toDescriptiveStem`)는 남아 있으므로
   * 「함수가 있나」로는 못 막는다. **산출물**을 본다.
   */
  it("🔴 서술형을 파생하지 않는다 — 어떤 발문이 와도", () => {
    const shapes = [
      { content: "$12$와 $18$의 최대공약수를 구하시오.", answer: "$6$" },
      { content: "다음 식을 전개하시오.", answer: "$x^2+2x+1$" },
      { content: "관계를 말하시오.", answer: "정비례" },
      { content: "모두 몇 개인지 쓰시오.", answer: "$3$개" },
    ];
    for (const s of shapes) {
      const got = expandFamily((v) => ({
        content: `${s.content} (${v})`,
        answer: s.answer.replace("$6$", `$${6 + v}$`),
        solution: "풀이\n두 번째 줄\n세 번째 줄",
        familyKey: "elem:fixture|파생금지|기본",
        problemType: "개념",
      }));
      const desc = got.items.filter((i) => i.questionType === "서술형");
      expect(desc, `${s.content} → 서술형 ${desc.length}건`).toHaveLength(0);
    }
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
  it("보기가 있어도 정답이 번호가 아니면 객관식으로 접지 않는다", () => {
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
    // 🔴 여기가 요지다 — 「보기가 있다」만 보고 객관식으로 접으면 안 된다.
    //    (서술형은 2026-08-27 부터 파생하지 않으므로 여기 안 나온다.)
    expect(kinds).not.toContain("객관식");
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
