import { parseSubmittedNumber } from "../sharedAnswers";

import type { CourseProblem } from "./types";

type Rational = { numerator: bigint; denominator: bigint };
type Unit = { name: string; dimension: string; multiplier: number };
type Quantity = { value: Rational; unit?: Unit };
type AnswerSource = Pick<CourseProblem, "answer" | "content">;

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);
const DECIMAL = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
const SCALAR = new RegExp(`^(${DECIMAL})(?:\\s*/\\s*(${DECIMAL}))?$`);
const TEX_FRACTION = new RegExp(
  `^([+-]?)\\\\(?:dfrac|frac|tfrac)\\{(${DECIMAL})\\}\\{(${DECIMAL})\\}$`,
);

const UNITS: Unit[] = [
  ...[
    ["mm", 1],
    ["cm", 10],
    ["m", 1000],
    ["km", 1000000],
  ].flatMap(([name, multiplier]) =>
    [1, 2, 3].map((power) => ({
      name: `${name}${power === 1 ? "" : power === 2 ? "²" : "³"}`,
      dimension: `length${power}`,
      multiplier: Number(multiplier) ** power,
    })),
  ),
  { name: "mg", dimension: "mass", multiplier: 1 },
  { name: "g", dimension: "mass", multiplier: 1000 },
  { name: "kg", dimension: "mass", multiplier: 1000000 },
  { name: "t", dimension: "mass", multiplier: 1000000000 },
  { name: "mL", dimension: "capacity", multiplier: 1 },
  { name: "L", dimension: "capacity", multiplier: 1000 },
  { name: "초", dimension: "duration", multiplier: 1 },
  { name: "분", dimension: "duration", multiplier: 60 },
  { name: "시간", dimension: "duration", multiplier: 3600 },
  ...[
    "개",
    "개씩",
    "명",
    "원",
    "장",
    "자루",
    "권",
    "쪽",
    "일",
    "개월",
    "년",
    "칸",
    "번",
    "번째",
    "째",
    "배",
    "가지",
    "묶음",
    "봉지",
    "대",
    "도막",
    "시",
    "씩",
    "만",
    "억",
    "조",
    "°",
    "℃",
    "%",
  ].map((name) => ({ name, dimension: name, multiplier: 1 })),
].sort((a, b) => b.name.length - a.name.length);

function normalize(raw: string): string | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  let text = raw
    .trim()
    .replaceAll("−", "-")
    .replace(/^약\s+/, "");
  const math = text.match(/^\$([^$]+)\$([^$]*)$/);
  if (math) text = `${math[1]} ${math[2]}`;
  if (text.includes("$")) return null;
  return text
    .replace(/^약\s+/, "")
    .replace(
      /\\(?:mathrm|text)\{([A-Za-z℃°%]+)(?:\^\{?([23])\}?)?\}/g,
      (_, unit, power) =>
        `${unit}${power === "2" ? "²" : power === "3" ? "³" : ""}`,
    )
    .replace(/\^\{?\\circ\}?/g, "°")
    .replace(
      /(mm|cm|km|m)\^?\{?([23])\}?/g,
      (_, unit, power) => `${unit}${power === "2" ? "²" : "³"}`,
    )
    .replaceAll("\\%", "%")
    .replace(/\\[,!; ]/g, " ")
    .trim();
}

function decimal(value: string): Rational {
  const [whole, fraction = ""] = value.split(".");
  const sign = whole.startsWith("-") ? -ONE : ONE;
  const digits = `${whole.replace(/^[+-]/, "") || "0"}${fraction}`;
  return {
    numerator: sign * BigInt(digits),
    denominator: TEN ** BigInt(fraction.length),
  };
}

function divide(a: Rational, b: Rational): Rational | null {
  if (b.numerator === ZERO) return null;
  return {
    numerator: a.numerator * b.denominator,
    denominator: a.denominator * b.numerator,
  };
}

function scalar(text: string): Rational | null {
  // Shared parsing enforces the same finite-number and zero-denominator rules as SRS.
  if (parseSubmittedNumber(text) === null) return null;
  const fraction = text.match(TEX_FRACTION);
  if (fraction) {
    const numerator = decimal(fraction[2]);
    if (fraction[1] === "-") numerator.numerator *= -ONE;
    return divide(numerator, decimal(fraction[3]));
  }
  const plain = text.match(SCALAR);
  if (!plain) return null;
  return plain[2]
    ? divide(decimal(plain[1]), decimal(plain[2]))
    : decimal(plain[1]);
}

function number(text: string): Rational | null {
  // Keep grouping distinct from a list of answers; never simply remove every comma.
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text))
    text = text.replaceAll(",", "");
  const mixed =
    text.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/) ??
    text.match(/^([+-]?\d+)\s*\\(?:dfrac|frac|tfrac)\{(\d+)\}\{(\d+)\}$/);
  if (mixed) {
    const whole = BigInt(mixed[1]);
    const top = BigInt(mixed[2]);
    const bottom = BigInt(mixed[3]);
    if (bottom === ZERO || top >= bottom) return null;
    const sign = mixed[1].startsWith("-") ? -ONE : ONE;
    return { numerator: whole * bottom + sign * top, denominator: bottom };
  }
  return scalar(text);
}

function quantity(raw: string): Quantity | null {
  const text = normalize(raw);
  if (!text) return null;
  const plain = number(text);
  if (plain) return { value: plain };
  for (const unit of UNITS) {
    if (!text.endsWith(unit.name)) continue;
    const value = number(text.slice(0, -unit.name.length).trim());
    if (value) return { value, unit };
  }
  return null;
}

/** A value alone cannot assess a required drawing, explanation, or changed notation. */
function needsComparison(problem: AnswerSource): boolean {
  return /(?:대분수|가분수|기약분수|소수|분수)\s*(?:로|꼴로)\s*(?:고치|고쳐|고쳤|나타내|나타냈|쓰|바꾸)|약분(?:하|해)|통분(?:하|해)|그리시오|그려\s*보|이유를|설명하|식을\s*(?:쓰|만드)/.test(
    problem.content,
  );
}

export function getCourseProblemInput(
  problem: AnswerSource,
): CourseProblem["input"] {
  const expected = quantity(problem.answer);
  if (!expected || needsComparison(problem)) {
    return {
      mode: "self-check",
      label: "연습장에 풀어 주세요",
      placeholder: "",
      help: "풀이를 마친 뒤 정답·해설과 비교해 스스로 확인해요.",
    };
  }
  const unit = expected.unit?.name;
  const notation = `${problem.content} ${problem.answer}`;
  const fraction = /\\(?:dfrac|frac|tfrac)|\d\s*\/\s*\d/.test(notation);
  const decimalNotation = /\d\.\d/.test(notation);
  return {
    mode: "number",
    label: unit ? `나의 답 (${unit})` : "나의 답",
    placeholder: fraction
      ? "예: 1/2, 1 1/2"
      : decimalNotation
        ? "예: 0.5"
        : "예: 123",
    help: fraction
      ? "분수는 1/2, 대분수는 1 1/2로 쓸 수 있어요."
      : unit
        ? `${unit} 단위의 수를 입력해 주세요.`
        : "연습장에 계산한 답을 입력해 주세요.",
  };
}

export function validateCourseAnswer(
  problem: CourseProblem,
  input: string,
): string | null {
  if (getCourseProblemInput(problem).mode === "self-check") return null;
  if (!input.trim()) return "연습장에 푼 답을 입력해 주세요.";
  const expected = quantity(problem.answer);
  const actual = quantity(input);
  if (!actual)
    return "수 하나를 입력해 주세요. 분수는 1/2, 대분수는 1 1/2로 쓸 수 있어요.";
  if (actual.unit && actual.unit.dimension !== expected?.unit?.dimension) {
    return expected?.unit
      ? `${expected.unit.name}에 맞는 단위로 입력해 주세요.`
      : "단위를 빼고 수만 입력해 주세요.";
  }
  return null;
}

/** null explicitly requires the learner's solution comparison, never an exact-text guess. */
export function gradeCourseAnswer(
  problem: CourseProblem,
  input: string,
): boolean | null {
  if (getCourseProblemInput(problem).mode === "self-check") return null;
  if (validateCourseAnswer(problem, input)) return false;
  const expected = quantity(problem.answer)!;
  const actual = quantity(input)!;
  const expectedScale = BigInt(expected.unit?.multiplier ?? 1);
  const actualScale = BigInt(
    actual.unit?.multiplier ?? expected.unit?.multiplier ?? 1,
  );
  // Exact cross multiplication avoids accepting an adjacent large integer or rounded fraction.
  return (
    actual.value.numerator * actualScale * expected.value.denominator ===
    expected.value.numerator * expectedScale * actual.value.denominator
  );
}
