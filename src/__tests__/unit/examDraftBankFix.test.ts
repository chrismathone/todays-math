// 고정 기출의 정본 조각을 제품 분리기에 넣고 수학적 값과 답/풀이 경계를 함께 묻는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  examRoot,
  readDraftCorpus,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import { splitAnswer } from "../../../scripts/import/exam-paper/splitAnswer";

function source(school: string, n: number): string {
  const rows = JSON.parse(
    readFileSync(
      join(examRoot, `2025-${school}-3-2-mid`, "sol_fixed.json"),
      "utf8",
    ),
  ) as { id: string; text: string }[];
  const row = rows.find((r) => r.id === String(n));
  expect(row, `${school} ${n}: 검증 모집단 누락`).toBeDefined();
  return row!.text;
}

function recovered(school: string, n: number) {
  const config = JSON.parse(
    readFileSync(join(examRoot, `2025-${school}-3-2-mid`, "exam.json"), "utf8"),
  );
  return splitAnswer(source(school, n), "", config.answerRepairs?.[n]);
}

/** 숫자 답용 작은 독립 계산기. 해설이나 잘린 수식이 섞이면 NaN으로 실패한다. */
function value(answer: string): number {
  let expression = answer.replace(/^\$|\$$/g, "").replace(/\\,/g, "");
  for (let i = 0; i < 10; i += 1) {
    const before = expression;
    expression = expression
      .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))");
    if (expression === before) break;
  }
  expression = expression.replace(/(\d|\))(?=sqrt\()/g, "$1*");
  if (!/^[\d+\-*/().\ssqrt]+$/.test(expression) || !expression.trim())
    return NaN;
  return Function("sqrt", `return (${expression});`)(Math.sqrt) as number;
}

describe("기출 외부 검토: 답 분리 (EX-01·EX-02)", () => {
  it("고정 모집단은 25편 533문항이며 빈 모집단을 통과시키지 않는다", () => {
    const drafts = readDraftCorpus();
    expect(drafts).toHaveLength(533);
    expect(new Set(drafts.map((d) => d.examId)).size).toBe(25);
    expect(new Set(drafts.map((d) => d.externalId)).size).toBe(drafts.length);
  });

  it("EX-01 동도 16: 12모서리의 평균·분산이 정한 겉넓이를 답으로 분리한다", () => {
    const { answer, solution } = splitAnswer(source("dongdo", 16));
    const mean = 4;
    const variance = 2;
    const sum = 3 * mean;
    const sumSquares = 3 * (variance + mean ** 2);
    expect(value(answer)).toBe(sum ** 2 - sumSquares);
    expect(solution.startsWith("평균이")).toBe(true);
  });

  it("EX-01 강동 18~20: 계산값과 평균 방정식의 유일해를 복구한다", () => {
    expect(value(splitAnswer(source("gangdong", 18)).answer)).toBeCloseTo(
      5 * (0.88 - 0.47),
    );
    expect(value(splitAnswer(source("gangdong", 19)).answer)).toBeCloseTo(
      1 / 3,
    );
    const known = [7, 1, 5, 2, 11, 10, 6, 4, 8];
    const solutions = Array.from({ length: 100 }, (_, x) => x).filter(
      (x) => (known.reduce((a, b) => a + b, 0) + x) / 10 === x,
    );
    expect(solutions).toHaveLength(1);
    const sorted = [...known, solutions[0]].sort((a, b) => a - b);
    expect(value(splitAnswer(source("gangdong", 20)).answer)).toBe(
      (sorted[4] + sorted[5]) / 2,
    );
  });

  it("EX-02 새론 16: 정사면체 높이로 계산한 한 값만 답이고 첫 풀이 식은 남는다", () => {
    const { answer, solution } = splitAnswer(source("saeron", 16));
    const edge = 6;
    const median = (Math.sqrt(3) * edge) / 2;
    const eg = median / 3;
    const ag = Math.sqrt(edge ** 2 - ((median * 2) / 3) ** 2);
    expect(value(answer)).toBeCloseTo((3 * ag) / edge - (4 * eg) / ag);
    expect(solution.startsWith("$\\overline{AE}=")).toBe(true);
  });

  it("EX-02 새론 17: 두 소문항의 답과 정삼각형의 넓이를 모두 보존한다", () => {
    const { answer, solution } = splitAnswer(source("saeron", 17));
    expect([...answer.matchAll(/\$\([12]\)\$/g)]).toHaveLength(2);
    expect(answer).toContain("정삼각형");
    const area = /\$([^$]+)\\mathrm\{c\}m\^\{2\}\$/.exec(answer)?.[1] ?? "";
    const inradius = 3;
    const side = (2 * inradius) / Math.tan(Math.PI / 6);
    expect(value(area)).toBeCloseTo((Math.sqrt(3) * side ** 2) / 4);
    expect(solution.startsWith("$(1)$ $\\overline{OM}")).toBe(true);
  });

  it("증명형은 첫 가정의 식을 숫자 정답으로 오인하지 않는다", () => {
    for (const n of [15, 16]) {
      expect(splitAnswer(source("deokwon", n)).answer).toBe("");
    }
  });

  it("EX-01 머리 없이 결론만 있는 풀이도 좌표·부피·분산에서 나온 유일한 값을 복구한다", () => {
    expect(value(recovered("daejin", 17).answer)).toBe(
      ((3 - 1) / (0 - 2) ** 2) * 2 + 1,
    );
    const widths = Array.from({ length: 100 }, (_, n) => n).filter(
      (x) => x > 13 && 4 * (x - 8) * (x - 13) === 816,
    );
    expect(widths).toHaveLength(1);
    expect(value(recovered("daejin", 18).answer)).toBe(2 * (2 * widths[0] - 5));
    const sd = Math.sqrt(260 / 10 - (120 / 4 / 10) ** 2);
    expect(value(recovered("sinmyeongyeo", 24).answer)).toBeCloseTo(
      sd - 2 * Math.floor(sd),
    );
  });

  it("EX-01 대구일 19·조암 19: 요구한 삼각비 여섯·셋 모두 답에 남는다", () => {
    expect([
      ...recovered("daeguil", 19).answer.matchAll(/\\(?:sin|cos|tan)\b/g),
    ]).toHaveLength(6);
    expect([
      ...recovered("joam", 19).answer.matchAll(/\\(?:sin|cos|tan)\b/g),
    ]).toHaveLength(3);
    const opposite = Math.sqrt(6 ** 2 - 5 ** 2);
    expect((opposite / 6) ** 2 + (5 / 6) ** 2).toBeCloseTo(1);
    expect(opposite / 6 / (5 / 6)).toBeCloseTo(opposite / 5);
  });
});
