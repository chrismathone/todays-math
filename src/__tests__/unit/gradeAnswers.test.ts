/** Q-P02 — 실제 엔진의 보기 번호를 응답 계약의 숫자로 보내 채점한다. */
import { describe, expect, it } from "vitest";

import { problemAnswerInputSchema } from "@/contracts/testresult.contract";
import { elementaryUnits } from "@/lib/elementary/generate";
import { generateElementaryForm } from "@/lib/elementary/forms";
import { createRng } from "@/lib/elementary/rng";
import { asMultipleChoice } from "@/lib/engine/deriveFormats";
import { generateMiddleProblem } from "@/lib/middle/generate";
import {
  gradeAnswers,
  type GradingProblem,
} from "@/lib/testResults/gradeAnswers";

const problem: GradingProblem = {
  id: "10000000-0000-4000-8000-000000000001",
  unitId: "test-unit",
  difficulty: "기본",
  answer: "②",
  score: 10,
};

function grade(answer: string, selectedChoice: number | null) {
  return gradeAnswers(
    [{ problemId: problem.id, selectedChoice, essayScore: null, sequence: 1 }],
    [{ ...problem, answer }],
  );
}

describe("Q-P02 객관식 정답 번호", () => {
  it("재현: 정답 ②에 2를 보내면 정답이고 배점 전액이다", () => {
    const result = grade("②", 2);
    expect(result.graded[0]!.isCorrect).toBe(true);
    expect(result.score).toBe(10);
  });

  it.each([
    ["①", 1],
    ["②", 2],
    ["③", 3],
    ["④", 4],
    ["⑤", 5],
    ["➀", 1],
    ["❷", 2],
    ["➌", 3],
    ["⓸", 4],
    ["➄", 5],
    [" ③ \n", 3],
  ] as const)("%s는 번호 %i 하나만 정답이다", (answer, correct) => {
    let correctCount = 0;
    for (let selected = 1; selected <= 5; selected += 1) {
      const result = grade(answer, selected);
      expect(result.graded[0]!.isCorrect).toBe(selected === correct);
      expect(result.score).toBe(selected === correct ? 10 : 0);
      if (result.graded[0]!.isCorrect) correctCount += 1;
    }
    expect(correctCount).toBe(1);
  });

  it("숫자로 저장된 옛 정답과 미답 처리는 그대로다", () => {
    for (let correct = 1; correct <= 5; correct += 1) {
      for (let selected = 1; selected <= 5; selected += 1) {
        const result = grade(` ${correct} `, selected);
        expect(result.score).toBe(selected === correct ? 10 : 0);
      }
    }
    expect(grade("②", null).graded[0]!.isCorrect).toBe(false);
    expect(grade("②", null).score).toBe(0);
  });

  it("현재 selectedChoice 한 번호 계약으로 복수 정답을 맞았다고 하지 않는다", () => {
    for (const answer of ["①, ④", "①④", "② 또는 ⑤", "1,4", "② ②"]) {
      for (let selected = 1; selected <= 5; selected += 1) {
        const result = grade(answer, selected);
        expect(result.graded[0]!.isCorrect, `${answer} / ${selected}`).toBe(
          false,
        );
        expect(result.score).toBe(0);
      }
    }
    expect(
      problemAnswerInputSchema.safeParse({
        problemId: problem.id,
        selectedChoice: [1, 4],
        essayScore: null,
        sequence: 1,
      }).success,
    ).toBe(false);
  });

  it("설명 속 번호나 비어 있는 정답에서 번호 하나를 잘라내지 않는다", () => {
    for (const answer of ["", "정답: ③", "③입니다", "③ (1점)"]) {
      expect(grade(answer, 3).score).toBe(0);
    }
  });

  it("초등·중등 엔진 → 객관식 → 숫자 응답의 씨앗 0~299 왕복", () => {
    const unit = elementaryUnits().find(
      (u) => u.grade === "초4" && u.section.startsWith("2-3-4 "),
    );
    expect(unit).toBeDefined();
    const generators = [
      (seed: number) => generateElementaryForm(unit!, seed, "01"),
      (seed: number) => generateMiddleProblem("3-2|삼각비|18", seed),
    ];
    let checked = 0;
    const positions = new Set<number>();
    for (const generate of generators) {
      for (let seed = 0; seed < 300; seed += 1) {
        const source = generate(seed);
        const mcq = asMultipleChoice(
          { ...source, familyKey: "roundtrip", problemType: "활용" },
          createRng(seed),
        );
        const values = mcq.content
          .split("\n")
          .slice(-5)
          .map((line) => line.slice(2));
        const correct = values.indexOf(source.answer) + 1;
        expect(correct).toBeGreaterThan(0);
        positions.add(correct);
        let correctCount = 0;
        for (let selected = 1; selected <= 5; selected += 1) {
          const result = grade(mcq.answer, selected);
          expect(
            result.graded[0]!.isCorrect,
            `${seed}/${mcq.answer}/${selected}`,
          ).toBe(selected === correct);
          expect(result.score).toBe(selected === correct ? 10 : 0);
          if (result.graded[0]!.isCorrect) correctCount += 1;
        }
        expect(correctCount).toBe(1);
        checked += 1;
      }
    }
    expect(checked).toBe(600);
    expect(positions.size).toBe(5);
  });
});
