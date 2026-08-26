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
});
