import { normalizeMathgenAnswer } from "../math/normalizeMathgenText";
import { answerShape } from "../problem/chooseAllRule";

const DECIMAL = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
const NUMERIC = new RegExp(`^(${DECIMAL})(?:\\s*/\\s*(${DECIMAL}))?$`);
const TEX_FRACTION = new RegExp(
  `^([+-]?)\\\\(?:dfrac|frac|tfrac)\\{(${DECIMAL})\\}\\{(${DECIMAL})\\}$`,
);

/** Full-string parsing: never discard units, prose, or an extra answer. */
export function parseSubmittedNumber(input: string): number | null {
  if (typeof input !== "string") return null;
  let text = input.trim().replaceAll("−", "-");
  if (/^\$[^$]+\$$/.test(text)) text = text.slice(1, -1).trim();
  text = text.replace(/^[a-zA-Z]\s*=\s*/, "").trim();
  const fraction = text.match(TEX_FRACTION);
  if (fraction) {
    const numerator = (fraction[1] === "-" ? -1 : 1) * Number(fraction[2]);
    const denominator = Number(fraction[3]);
    const result = numerator / denominator;
    return Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator !== 0 &&
      Number.isFinite(result)
      ? result
      : null;
  }
  const match = text.match(NUMERIC);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = match[2] === undefined ? 1 : Number(match[2]);
  const result = numerator / denominator;
  return Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    denominator !== 0 &&
    Number.isFinite(result)
    ? result
    : null;
}

/** Quantities emitted by the existing M1 corpus, not arbitrary suffix stripping. */
const PROSE_UNITS = new Set([
  "개",
  "명",
  "원",
  "세",
  "자루",
  "쪽",
  "일",
  "분",
  "바퀴",
  "년 후",
  "년 전",
  "개월 후",
  "분 후",
]);

export function readEngineAnswer(raw: string): {
  value: number;
  unit?: string;
} {
  const normalized = normalizeMathgenAnswer(raw).trim();
  // The corpus's \, is spacing, not the comma separating multiple answers.
  if (answerShape(normalized.replace(/\\,/g, " ")).kind !== "단일") {
    throw new Error(`숫자 하나로 채점할 수 없는 기존 정답입니다: ${raw}`);
  }
  const match = normalized.match(/^(초속\s+)?\$([^$]+)\$(.*)$/);
  if (!match) throw new Error(`기존 정답의 수식 경계를 확인하세요: ${raw}`);
  let numeric = match[2].trim();
  const proseUnit = match[3].trim();
  const metric = numeric.match(
    /^(.*?)\\,\\mathrm\{(g|kg|m|km|cm)\}(\^\{2\})?$/,
  );
  let unit: string | undefined;
  if (metric) {
    if (proseUnit) throw new Error(`기존 정답의 단위가 모호합니다: ${raw}`);
    numeric = metric[1].trim();
    unit = metric[2] + (metric[3] ? "²" : "");
  } else if (proseUnit) {
    if (!PROSE_UNITS.has(proseUnit))
      throw new Error(`지원하지 않는 기존 정답 단위입니다: ${raw}`);
    unit = proseUnit;
  }
  if (match[1]) {
    if (unit !== "m") throw new Error(`지원하지 않는 속력 단위입니다: ${raw}`);
    unit = "m/s";
  }
  const value = parseSubmittedNumber(numeric);
  if (value === null)
    throw new Error(`기존 정답이 숫자 하나가 아닙니다: ${raw}`);
  return { value, ...(unit ? { unit } : {}) };
}

export function checkAnswer(input: string, expected: number): boolean {
  if (typeof input !== "string" || !Number.isFinite(expected)) return false;
  const result = parseSubmittedNumber(input);
  return (
    result !== null &&
    Math.abs(result - expected) <= 1e-9 * Math.max(1, Math.abs(expected))
  );
}

/** A submitted answer is at most 200 characters (`mathSrsAttemptInputSchema`). */
const SRS_CHOICE_MAX = 200;

type SrsGradable = { answer: number; choices?: readonly string[] };

/** The correct choice's text; null for a numeric problem or a broken index. */
export function correctSrsChoice(problem: SrsGradable): string | null {
  if (problem.choices === undefined || !Number.isInteger(problem.answer))
    return null;
  return problem.choices[problem.answer] ?? null;
}

/**
 * The one grader for middle review. A choice problem is right only for the
 * exact stored text of its correct choice — there `answer` is that choice's
 * index, never a value to compare, so a typed "1" is wrong. Otherwise one number.
 */
export function gradeSrsAnswer(
  problem: SrsGradable,
  submitted: string,
): boolean {
  if (problem.choices !== undefined)
    return (
      typeof submitted === "string" && correctSrsChoice(problem) === submitted
    );
  return checkAnswer(submitted, problem.answer);
}

/** Why a stored choice problem cannot be shown and graded fairly; null when it can. */
export function srsChoiceIssue(problem: {
  answer?: unknown;
  choices?: unknown;
  answerText?: unknown;
  answerUnit?: unknown;
}): string | null {
  const { choices, answer } = problem;
  if (choices === undefined) return null;
  if (!Array.isArray(choices) || choices.length !== 4)
    return "보기형 문제에는 보기가 4개 있어야 합니다.";
  if (
    choices.some(
      (choice) =>
        typeof choice !== "string" ||
        !choice ||
        choice !== choice.trim() ||
        choice.length > SRS_CHOICE_MAX,
    )
  )
    return "보기 글자가 올바르지 않습니다.";
  // Spacing inside TeX does not change what the student sees.
  if (
    new Set(choices.map((choice: string) => choice.replace(/\s+/g, "")))
      .size !== choices.length
  )
    return "보기가 중복되었습니다.";
  if (
    typeof answer !== "number" ||
    !Number.isInteger(answer) ||
    answer < 0 ||
    answer >= choices.length
  )
    return "보기형 문제의 정답이 보기 밖입니다.";
  if (problem.answerText !== undefined || problem.answerUnit !== undefined)
    return "보기형 문제에는 숫자 정답 표기를 두지 않습니다.";
  return null;
}
