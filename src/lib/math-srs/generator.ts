import type { Concept, ConceptId, Difficulty, GeneratedProblem, MissionKind } from "./types";

export const CONCEPTS: Concept[] = [
  { id: "balance", title: "등식의 성질", description: "양변에 같은 연산을 하여 x를 구해요." },
  { id: "two-step", title: "두 단계 방정식", description: "상수항을 정리하고 계수로 나눠요." },
  { id: "distribute", title: "괄호 풀기", description: "분배법칙으로 괄호 안의 모든 항을 곱해요." },
  { id: "both-sides", title: "양변에 x가 있는 식", description: "x가 있는 항을 한쪽으로 모아요." },
  { id: "fractions", title: "분수가 있는 식", description: "양변에 분모의 공배수를 곱해요." },
  { id: "word", title: "문장제", description: "상황을 x가 있는 등식으로 바꿔요." },
];

export const TEMPLATE_COUNT = 12;

const prerequisites: Record<ConceptId, ConceptId[]> = {
  balance: [], "two-step": ["balance"], distribute: ["two-step", "balance"],
  "both-sides": ["two-step", "balance"], fractions: ["balance", "two-step"],
  word: ["two-step", "balance"],
};

function randomSource(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function signedTerm(value: number) {
  return value < 0 ? ` − ${Math.abs(value)}` : ` + ${value}`;
}

function variable(coefficient: number) {
  return coefficient === 1 ? "x" : coefficient === -1 ? "−x" : `${coefficient}x`;
}

function linear(coefficient: number, constant: number) {
  return `${variable(coefficient)}${constant === 0 ? "" : signedTerm(constant)}`;
}

/** Reverse generation fixes an integer solution before constructing each equality. */
export function generateProblem({ conceptId, difficulty, seed, kind = "training" }: {
  conceptId: ConceptId; difficulty: Difficulty; seed: number; kind?: MissionKind;
}): GeneratedProblem {
  if (!CONCEPTS.some((concept) => concept.id === conceptId)
    || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5 || !Number.isFinite(seed)) {
    throw new Error("문제 생성 조건이 올바르지 않아요.");
  }
  const random = randomSource(seed);
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const variant = integer(0, 1);
  const limit = 3 + difficulty * 3;
  let answer = integer(difficulty < 3 ? 0 : -limit, limit);
  const a = integer(2, difficulty + 3) * (difficulty >= 4 && random() < 0.35 ? -1 : 1);
  const b = integer(1, limit) * (difficulty >= 3 && random() < 0.5 ? -1 : 1);
  const c = integer(2, difficulty + 3);
  let equation: string;
  let templateId: string;
  let hint: string;
  let solution: string[];
  let prompt = "다음 방정식을 풀어 x의 값을 구하세요.";
  let answerUnit: string | undefined;

  switch (conceptId) {
    case "balance": {
      if (variant === 0) {
        const right = answer + b;
        templateId = "balance-add";
        equation = `${linear(1, b)} = ${right}`;
        hint = `양변에서 ${b < 0 ? `음수 ${b}` : b}을 빼면 x만 남아요.`;
        solution = [`양변에서 ${b}을 뺍니다.`, `x = ${right} − (${b})`, `x = ${answer}`];
      } else {
        templateId = "balance-multiply";
        equation = `${variable(a)} = ${a * answer}`;
        hint = `x의 계수는 ${a}예요. 양변을 같은 수로 나눠 보세요.`;
        solution = [`양변을 ${a}로 나눕니다.`, `x = ${a * answer} ÷ (${a})`, `x = ${answer}`];
      }
      break;
    }
    case "two-step": {
      templateId = variant === 0 ? "two-step-add" : "two-step-subtract";
      const constant = variant === 0 ? b : -Math.abs(b);
      const right = a * answer + constant;
      equation = `${linear(a, constant)} = ${right}`;
      hint = "먼저 상수항을 없앤 뒤, x의 계수로 양변을 나눠 보세요.";
      solution = [`양변에서 ${constant}을 뺍니다.`, `${variable(a)} = ${right - constant}`,
        `양변을 ${a}로 나누면 x = ${answer}`];
      break;
    }
    case "distribute": {
      templateId = variant === 0 ? "distribute-single" : "distribute-offset";
      const offset = variant === 0 ? 0 : c * difficulty;
      const right = a * (answer + b) + offset;
      equation = `${a}(x${signedTerm(b)})${offset ? signedTerm(offset) : ""} = ${right}`;
      hint = `${a}을 괄호 안의 x와 ${b}에 각각 곱하세요.`;
      solution = [`분배법칙으로 괄호를 풀면 ${linear(a, a * b + offset)} = ${right}`,
        `${variable(a)} = ${right - a * b - offset}`, `양변을 ${a}로 나누면 x = ${answer}`];
      break;
    }
    case "both-sides": {
      // Distinct coefficients guarantee a unique solution, including x = 0.
      const other = a + c;
      templateId = variant === 0 ? "both-sides-linear" : "both-sides-group";
      const leftConstant = variant === 0 ? b : a * b;
      const rightConstant = (a - other) * answer + leftConstant;
      equation = `${variant === 0 ? linear(a, b) : `${a}(x${signedTerm(b)})`} = ${linear(other, rightConstant)}`;
      hint = "양변의 x항을 왼쪽으로, 상수항을 오른쪽으로 모아 보세요.";
      solution = [
        ...(variant ? [`괄호를 풀면 ${linear(a, leftConstant)} = ${linear(other, rightConstant)}`] : []),
        `양변에서 ${variable(other)}와 ${leftConstant}을 빼면 ${variable(a - other)} = ${rightConstant - leftConstant}`,
        `양변을 ${a - other}로 나누면 x = ${answer}`,
      ];
      break;
    }
    case "fractions": {
      templateId = variant === 0 ? "fractions-shift" : "fractions-two-denominators";
      const denominator = c + difficulty - 1;
      // The numerator is selected to cancel at the chosen integer answer.
      const right = b;
      const shift = denominator * right - answer;
      if (variant === 0) {
        equation = `(x${shift === 0 ? "" : signedTerm(shift)}) / ${denominator} = ${right}`;
        hint = `양변에 분모 ${denominator}를 곱해서 분수를 없애 보세요.`;
        solution = [`양변에 ${denominator}를 곱하면 ${linear(1, shift)} = ${denominator * right}`,
          `양변에서 ${shift}을 빼면 x = ${answer}`];
      } else {
        // (x + shift)/d + x/(2d) = (2bd + x)/(2d).
        const numerator = 2 * denominator * right + answer;
        equation = `(x${shift === 0 ? "" : signedTerm(shift)}) / ${denominator} + x / ${2 * denominator} = ${numerator} / ${2 * denominator}`;
        hint = `모든 분모의 공배수 ${2 * denominator}를 양변의 모든 항에 곱하세요.`;
        solution = [`양변에 ${2 * denominator}를 곱하면 2(x${signedTerm(shift)}) + x = ${numerator}`,
          `${linear(3, 2 * shift)} = ${numerator}`, `3x = ${numerator - 2 * shift}`, `x = ${answer}`];
      }
      break;
    }
    case "word": {
      answer = integer(2, limit);
      const count = Math.abs(a);
      const extra = Math.abs(b);
      if (variant === 0) {
        templateId = "word-purchase";
        answerUnit = "백 원";
        prompt = `공책 ${count}권과 ${extra * 100}원짜리 지우개 1개를 사서 ${(count * answer + extra) * 100}원을 냈어요. 공책 한 권의 가격을 x백 원이라고 할 때 x를 구하세요.`;
        equation = `${linear(count, extra)} = ${count * answer + extra}`;
        hint = "모든 가격을 백 원 단위로 맞추면, 공책 값의 합 + 지우개 값 = 전체 값이에요.";
        solution = [`지우개 값을 빼면 ${variable(count)} = ${count * answer}`,
          `공책 수 ${count}로 나누면 x = ${answer}`, `공책 한 권의 가격은 ${answer * 100}원입니다.`];
      } else {
        templateId = "word-boxes";
        answerUnit = "개";
        prompt = `상자 ${count}개에 구슬이 각각 x개씩 들어 있어요. 각 상자에 ${extra}개씩 더 넣었더니 구슬이 모두 ${count * (answer + extra)}개가 되었어요. 처음 한 상자에 있던 구슬 수 x를 구하세요.`;
        equation = `${count}(x + ${extra}) = ${count * (answer + extra)}`;
        hint = "전체 구슬 수를 상자 수로 나눈 뒤, 나중에 넣은 구슬 수를 빼세요.";
        solution = [`양변을 ${count}로 나누면 x + ${extra} = ${answer + extra}`,
          `양변에서 ${extra}를 빼면 x = ${answer}`];
      }
      break;
    }
  }

  return {
    id: `${templateId}-${difficulty}-${seed >>> 0}-${kind}`,
    templateId, conceptId,
    conceptWeights: [{ conceptId, weight: 1 }, ...prerequisites[conceptId].map((id) => ({ conceptId: id, weight: 0.15 }))],
    difficulty, kind, prompt, equation, answer, ...(answerUnit ? { answerUnit } : {}), hint, solution,
    expectedSeconds: 18 + difficulty * 9 + (conceptId === "word" || conceptId === "fractions" ? 18 : 0),
  };
}

/** Full-string numeric parsing: no coercion of blanks, no eval, and no trailing units. */
export function checkAnswer(input: string, expected: number): boolean {
  if (typeof input !== "string" || !Number.isFinite(expected)) return false;
  const clean = input.trim().replace(/^x\s*=\s*/i, "").trim().replace(/−/g, "-");
  const decimal = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const match = clean.match(new RegExp(`^(${decimal})(?:\\s*/\\s*(${decimal}))?$`));
  if (!match) return false;
  const numerator = Number(match[1]);
  const denominator = match[2] === undefined ? 1 : Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return false;
  const result = numerator / denominator;
  return Number.isFinite(result) && Math.abs(result - expected) <= 1e-9 * Math.max(1, Math.abs(expected));
}
