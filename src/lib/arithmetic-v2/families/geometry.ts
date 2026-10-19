import { ArithmeticV2EngineError } from "../errors";
import { arithmeticAngleAssets } from "../geometry";
import type { ArithmeticV2Definition, ArithmeticV2Prompt } from "../types";

function prompt(id: string, a: number, b: number): ArithmeticV2Prompt {
  return {
    layout: "math",
    text: `주어진 각 ${a}°, ${b}°인 삼각형의 빈 각`,
    latex: "\\angle",
    instruction: "숫자가 없는 각의 크기를 구하세요.",
    figureId: id,
  };
}

function definition(
  kind: "triangle" | "right-triangle",
): ArithmeticV2Definition {
  const entries = arithmeticAngleAssets.filter((entry) => entry.kind === kind);
  const byParameters = new Map(
    entries.map((entry) => [entry.given.join(","), entry]),
  );
  const right = kind === "right-triangle";
  return {
    id: right ? "e4-right-triangle-missing-angle" : "e4-triangle-missing-angle",
    grade: "초4",
    strand: "도형",
    title: right ? "직각삼각형의 빈 예각" : "삼각형의 빈 각",
    description: right
      ? "직각 표시와 주어진 예각으로 나머지 예각을 구합니다."
      : "그림에 주어진 두 각으로 나머지 한 각을 구합니다.",
    labels: ["각도", "도형 연산"],
    rankGroup: right ? "right-triangle-angle" : "triangle-angle-sum",
    domainSize: entries.length,
    problemAt(index) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= entries.length)
        throw new ArithmeticV2EngineError("operand");
      const entry = entries[index];
      const [a, b] = entry.given;
      const answer = 180 - a - b;
      return {
        parameters: [a, b],
        prompt: prompt(entry.id, a, b),
        answer: {
          kind: "integer",
          exact: [String(answer)],
          text: `${answer}°`,
          latex: `${answer}^{\\circ}`,
        },
      };
    },
    verify(candidate) {
      const [a, b] = candidate.parameters;
      const entry = byParameters.get(candidate.parameters.join(","));
      if (
        !entry ||
        candidate.parameters.length !== 2 ||
        ![a, b].every(Number.isSafeInteger)
      )
        return false;
      const { answer } = candidate;
      const value = Number(answer.exact[0]);
      return (
        answer.kind === "integer" &&
        answer.exact.length === 1 &&
        Number.isSafeInteger(value) &&
        value > 0 &&
        value < 180 &&
        a + b + value === 180 &&
        (!right || (b === 90 && value < 90)) &&
        answer.exact[0] === String(value) &&
        answer.text === `${value}°` &&
        answer.latex === `${value}^{\\circ}` &&
        JSON.stringify(candidate.prompt) ===
          JSON.stringify(prompt(entry.id, a, b))
      );
    },
  };
}

export const GEOMETRY_ARITHMETIC_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [definition("triangle"), definition("right-triangle")];
