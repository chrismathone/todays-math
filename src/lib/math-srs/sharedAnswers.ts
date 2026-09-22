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
