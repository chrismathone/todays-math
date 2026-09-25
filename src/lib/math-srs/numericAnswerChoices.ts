import { checkAnswer, parseSubmittedNumber } from "./sharedAnswers";

const unsupported = () => new Error("이 문제의 보기를 만들지 못했어요.");

type NumericProblem = {
  id: string;
  answer: number;
  conceptId: string;
  answerUnit?: string;
};

/** Keep equivalent fractions and units from identifying the correct choice by formatting. */
export function numericAnswerChoices(
  problem: NumericProblem,
  pool: readonly NumericProblem[],
): string[] {
  const expected = problem.answer;
  let denominator = 1;
  if (!Number.isInteger(expected)) {
    for (let d = 2; d <= 1000; d++) {
      if (checkAnswer(`${Math.round(expected * d)}/${d}`, expected)) {
        denominator = d;
        break;
      }
    }
  }
  const format = (value: number) =>
    denominator > 1
      ? `$\\frac{${Math.round(value * denominator)}}{${denominator}}$`
      : `$${value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })}$`;
  const choices = [format(expected)];
  if (!checkAnswer(choices[0], expected)) throw unsupported();
  const add = (value: number) => {
    if (choices.length === 4 || !Number.isFinite(value)) return;
    if (Number.isInteger(expected) && !Number.isInteger(value)) return;
    const choice = format(value);
    const parsed = parseSubmittedNumber(choice);
    if (parsed === null || choices.some((other) => checkAnswer(other, parsed)))
      return;
    choices.push(choice);
  };
  let hash = 2166136261;
  for (const char of problem.id)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    return hash / 0x1_0000_0000;
  };
  const candidates = pool.filter(
    (p) =>
      p.id !== problem.id &&
      p.conceptId === problem.conceptId &&
      p.answerUnit === problem.answerUnit,
  );
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.forEach((candidate) => add(candidate.answer));
  const delta = Number.isInteger(expected)
    ? Math.max(1, Math.ceil(Math.abs(expected) * 0.1))
    : Math.max(1 / denominator, Math.abs(expected) * 0.1);
  for (const offset of [-1, 1, -2, 2, -3, 3]) add(expected + delta * offset);
  if (choices.length !== 4) throw unsupported();
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}
