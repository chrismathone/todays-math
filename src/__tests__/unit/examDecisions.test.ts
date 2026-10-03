import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  examRoot,
  type ExamDraft,
} from "../../../scripts/import/exam-paper/audit-bank-fix";

const output = mkdtempSync(join(tmpdir(), "bank-decide-exams-"));
const built = new Map<string, ExamDraft[]>();
function build(school: string, number: number): ExamDraft {
  if (!built.has(school)) {
    const file = join(output, `${school}.json`);
    execFileSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        resolve("scripts/import/exam-paper/build-exam-drafts.ts"),
        join(examRoot, `2025-${school}-3-2-mid`),
        file,
      ],
      { encoding: "utf8", stdio: "pipe" },
    );
    built.set(school, JSON.parse(readFileSync(file, "utf8")) as ExamDraft[]);
  }
  const d = built.get(school)!.find((d) => d.questionNumber === number);
  expect(d).toBeDefined();
  return d!;
}
const note = "(제공 자료의 풀이 식을 바로잡음 — 답은 같음)";
/** 해당 풀이 식만 계산하는 독립 계산기. 알 수 없는 표기는 통과시키지 않는다. */
function evaluate(
  expression: string,
  values: Record<string, number> = {},
): number {
  let text = expression
    .replace(/\\,/g, "")
    .replace(/\\sin A/g, `(${Math.sin(values.A ?? 0)})`);
  for (let i = 0; i < 6; i++)
    text = text
      .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "(($1)/($2))");
  text = text
    .replace(/[abx]/g, (key) => `(${values[key]})`)
    .replace(/(\d|\))(?=\(|sqrt)/g, "$1*");
  if (!/^[\d+\-*/().\ssqrt]+$/.test(text))
    throw new Error(`계산할 수 없는 식: ${expression}`);
  return Function("sqrt", `return (${text});`)(Math.sqrt) as number;
}
describe("원장님 결정 A2·A3·A7 — 실제 빌더 산출의 수학", () => {
  it("동도 16: 분산식에 들어간 분모로 검산해도 겉넓이 90이 나온다", () => {
    const d = build("dongdo", 16);
    const denominator = Number(
      d.solution?.match(/\(c-4\)\^\{2\}\}\{(\d+)\}=2/)?.[1],
    );
    const sum = 3 * 4;
    const sumSquares = 2 * denominator + 8 * sum - 48;
    expect(sum ** 2 - sumSquares).toBe(Number(d.answer.replace(/\$/g, "")));
    expect(d.solution?.endsWith(note)).toBe(true);
  });
  it("상인 23: 30도 삼각비와 높이 방정식이 같은 양의 높이를 준다", () => {
    const d = build("sangin", 23);
    const height = 50 / (Math.sqrt(3) - 1);
    expect(height / (height + 50)).toBeCloseTo(Math.tan(Math.PI / 6));
    const tangent = d.solution!.match(/\\tan 30°=([^$]+)\$/)![1];
    expect(evaluate(tangent)).toBeCloseTo(Math.tan(Math.PI / 6));
    const equation = d
      .solution!.match(/이므로, \$([^$]+)\$이 되어야/)![1]
      .split("=");
    expect(equation).toHaveLength(2);
    expect(evaluate(equation[0], { x: height })).toBeCloseTo(
      evaluate(equation[1]),
    );
    expect(d.solution?.endsWith(note)).toBe(true);
  });
  it("성화 22: 300개 크기·각도에서 해설의 S와 T가 넓이 및 비 8/7과 맞는다", () => {
    const d = build("seonghwa", 22);
    const smallArea = d.solution!.match(/S=[^$]+=([^=$]+)\$/)![1];
    const difference = d.solution!.match(
      /T=\\triangle ([A-Z]+)-\\triangle ([A-Z]+)/,
    )!;
    for (let a = 1; a <= 20; a++)
      for (let b = 1; b <= 15; b++) {
        const sine = Math.sin(((a + b) * Math.PI) / 180);
        const s = (7 * a * 4 * b * sine) / 2;
        const t = (12 * a * 5 * b * sine) / 2 - s;
        expect(
          evaluate(smallArea, { a, b, A: ((a + b) * Math.PI) / 180 }),
        ).toBeCloseTo(s);
        const areas: Record<string, number> = {
          ABC: (12 * a * 5 * b * sine) / 2,
          ADE: s,
        };
        expect(areas[difference[1]] - areas[difference[2]]).toBeCloseTo(t);
        expect(t / s).toBeCloseTo(8 / 7);
      }
    expect(d.solution?.endsWith(note)).toBe(true);
  });
  it("칠곡 7: 다섯 보기 중 f(1)=-8은 ②만이고 잘못 옮긴 꼭짓점의 값 4는 ④다", () => {
    const d = build("chilgok", 7);
    const choices = parseProblemContent(d.content).choices.map((s) =>
      Number(s.replace(/\$/g, "")),
    );
    expect(choices).toHaveLength(5);
    const correct = -3 * (1 + 1) ** 2 + 4;
    expect(choices.flatMap((v, i) => (v === correct ? [i + 1] : []))).toEqual([
      2,
    ]);
    expect(choices[3]).toBe(-3 * (1 - 1) ** 2 + 4);
    expect(choices).toEqual([...choices].sort((a, b) => a - b));
    expect(d.answer).toBe("②");
  });
  it("새론 8: 셋째 자리 반올림 값은 ⑤ 하나이고 정답 번호와 다른 보기는 그대로다", () => {
    const d = build("saeron", 8);
    const choices = parseProblemContent(d.content).choices.map((s) =>
      Number(s.replace(/\$/g, "")),
    );
    const height = Math.round((10.64 * 0.84 + 0.77) * 100) / 100;
    expect(choices.slice(0, 4)).toEqual([8.4, 9.04, 9.17, 9.24]);
    expect(choices.flatMap((v, i) => (v === height ? [i + 1] : []))).toEqual([
      5,
    ]);
    expect(d.answer).toBe("⑤");
  });
});
