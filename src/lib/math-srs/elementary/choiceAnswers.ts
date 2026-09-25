import { generateElementaryProblem } from "../../elementary/generate";
import { gradeCourseAnswer, validateCourseAnswer } from "./answers";
import { getCourseSection } from "./catalog";
import type { CourseProblem } from "./types";

const fractionOf = (raw: string) => {
  const answer = raw.trim().replace(/^\$(.*)\$$/, "$1");
  const match =
    /^\\(?:dfrac|tfrac|frac)\{(\d+)\}\{(\d+)\}$/.exec(answer) ??
    /^(\d+)\s*\/\s*(\d+)$/.exec(answer);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return denominator >= 2 &&
    denominator <= 12 &&
    numerator >= 1 &&
    numerator <= denominator
    ? { kind: "fraction-parts" as const, denominator, shape: "bar" as const }
    : null;
};

function stableRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function answerFormat(raw: string) {
  const text = raw.trim();
  return {
    notation: /\\(?:dfrac|tfrac|frac)\{|\d\s*\/\s*\d/.test(text)
      ? "fraction"
      : /\d\.\d/.test(text)
        ? "decimal"
        : "integer",
    unit: text.match(/([A-Za-z가-힣²³°%]+)$/)?.[1] ?? "",
  };
}

function nearbyAnswers(answer: string): string[] {
  const text = answer.trim();
  const mathNumber =
    /^(\$)([+-]?\d+(?:\.\d+)?)(\$)(\s*[A-Za-z가-힣²³°%]*)$/.exec(text);
  const plain = /^([+-]?\d+(?:\.\d+)?)(\s*[A-Za-z가-힣²³°%]*)$/.exec(text);
  const degree = /^\$([+-]?\d+)\^\\circ\$$/.exec(text);
  if (degree) {
    const value = Number(degree[1]);
    return [90, -90, 45, -45, 180, -180]
      .map((offset) => value + offset)
      .filter((candidate) => candidate > 0 && candidate <= 360)
      .map((candidate) => `$${candidate}^\\circ$`);
  }
  if (plain) {
    const value = Number(plain[1]);
    const decimalPlaces = plain[1].split(".")[1]?.length ?? 0;
    const step = 10 ** -decimalPlaces;
    return [1, -1, 2, -2, 3, -3, 4, -4]
      .map(
        (distance) =>
          `${(value + distance * step).toFixed(decimalPlaces)}${plain[2]}`,
      )
      .filter(
        (candidate) => Number(candidate.match(/^[+-]?\d+(?:\.\d+)?/)?.[0]) >= 0,
      );
  }
  if (mathNumber) {
    const value = Number(mathNumber[2]);
    const decimalPlaces = mathNumber[2].split(".")[1]?.length ?? 0;
    const step = 10 ** -decimalPlaces;
    return [1, -1, 2, -2, 3, -3, 4, -4]
      .map((distance) => value + distance * step)
      .filter((candidate) => candidate >= 0)
      .map(
        (candidate) => `$${candidate.toFixed(decimalPlaces)}$${mathNumber[4]}`,
      );
  }
  const bare = text.replace(/^\$(.*)\$$/, "$1");
  const tex = /^\\(dfrac|tfrac|frac)\{(\d+)\}\{(\d+)\}$/.exec(bare);
  const simple = /^(\d+)\s*\/\s*(\d+)$/.exec(bare);
  const numerator = Number(tex?.[2] ?? simple?.[1]);
  const denominator = Number(tex?.[3] ?? simple?.[2]);
  if (
    !Number.isInteger(numerator) ||
    !Number.isInteger(denominator) ||
    denominator < 2 ||
    denominator > 20
  )
    return [];
  const variants: [number, number][] = [
    [numerator + 1, denominator],
    [numerator - 1, denominator],
    [numerator + 2, denominator],
    [numerator, denominator + 1],
    [numerator, denominator - 1],
    [numerator + 1, denominator + 1],
    [numerator - 1, denominator + 1],
  ];
  return variants
    .filter(([n, d]) => n > 0 && d > 1)
    .map(([n, d]) =>
      tex
        ? `${text.startsWith("$") ? "$" : ""}\\${tex[1]}{${n}}{${d}}${text.endsWith("$") ? "$" : ""}`
        : `${n}/${d}`,
    );
}

/** Reuse a generator's own four candidates when its question asks to select one. */
export function embeddedCourseAnswerChoices(
  problem: CourseProblem,
): { content: string; answerChoices: string[] } | null {
  if (problem.input.mode !== "number") return null;

  // These are the number-list forms emitted by the grade-five factor/multiple
  // generators. Only remove a list when the exact mathematical predicate is
  // recognized and has the same unique answer as the persisted problem.
  const list = /\s+(\$([1-9]\d*(?:,\s*\\\s*[1-9]\d*){3})\$)\s*$/.exec(
    problem.content,
  );
  if (!list) return null;
  const content = problem.content.slice(0, list.index).trimEnd();
  const values = list[2].split(/,\s*\\\s*/).map(Number);
  if (
    new Set(values).size !== 4 ||
    values.some((value) => !Number.isSafeInteger(value))
  )
    return null;

  const one =
    /^다음 수 중에서 \$(\d+)\$의 (약수가 아닌 수|배수)를 찾아 쓰시오\.$/.exec(
      content,
    );
  const two =
    /^다음 수 중에서 \$(\d+)\$(?:과|와) \$(\d+)\$의 (공약수가 아닌 수|공배수)를 찾아 쓰시오\.$/.exec(
      content,
    );
  let matches: ((value: number) => boolean) | null = null;
  if (one) {
    const base = Number(one[1]);
    if (!Number.isSafeInteger(base) || base < 1) return null;
    matches =
      one[2] === "배수"
        ? (value) => value % base === 0
        : (value) => base % value !== 0;
  } else if (two) {
    const a = Number(two[1]);
    const b = Number(two[2]);
    if (![a, b].every((value) => Number.isSafeInteger(value) && value > 0))
      return null;
    matches =
      two[3] === "공배수"
        ? (value) => value % a === 0 && value % b === 0
        : (value) => a % value !== 0 || b % value !== 0;
  }
  if (!matches) return null;

  const answerChoices = values.map((value) => `$${value}$`);
  const correct = answerChoices.map(
    (choice) => gradeCourseAnswer(problem, choice) === true,
  );
  if (
    correct.filter(Boolean).length !== 1 ||
    values.some((value, index) => matches!(value) !== correct[index])
  )
    return null;
  return { content, answerChoices };
}

export function hasPrintedFourNumberCandidates(content: string): boolean {
  return (
    /^다음 수 중에서/.test(content) &&
    /\$[1-9]\d*(?:,\s*\\\s*[1-9]\d*){3}\$\s*$/.test(content)
  );
}

/** The student sees only this persisted list; grading still compares the answer on the server. */
export function makeCourseAnswerChoices(
  problem: CourseProblem,
  sameSectionAnswers: readonly string[],
): Pick<CourseProblem, "answerChoices" | "interactive"> {
  if (problem.input.mode !== "number")
    return { answerChoices: null, interactive: null };

  const embedded = embeddedCourseAnswerChoices(problem);
  if (embedded)
    return { answerChoices: embedded.answerChoices, interactive: null };
  // An unrecognized or ambiguous "choose from these numbers" prompt must not
  // show a different random set of choices alongside its printed candidates.
  if (hasPrintedFourNumberCandidates(problem.content))
    return { answerChoices: null, interactive: null };

  const choices = [problem.answer];
  const expectedFormat = answerFormat(problem.answer);
  const canUse = (candidate: string) => {
    const value = candidate.trim();
    if (!value || value.length > 100 || /[\n\r]/.test(value)) return false;
    const format = answerFormat(value);
    if (
      format.notation !== expectedFormat.notation ||
      format.unit !== expectedFormat.unit
    )
      return false;
    if (validateCourseAnswer(problem, value) !== null) return false;
    if (gradeCourseAnswer(problem, value) !== false) return false;
    return choices.every(
      (choice) =>
        gradeCourseAnswer({ ...problem, answer: choice }, value) !== true,
    );
  };
  const candidates = [...sameSectionAnswers];
  const candidateRandom = stableRandom(problem.seed ^ 0x85ebca6b);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(candidateRandom() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const candidate of candidates) {
    if (canUse(candidate)) choices.push(candidate.trim());
    if (choices.length === 4) break;
  }

  // The existing elementary problem generator is the safe fallback when the
  // approved bank has too few comparable answers for this section.
  if (choices.length < 4) {
    const section = getCourseSection(problem.sectionId);
    if (section) {
      for (let offset = 1; offset <= 32 && choices.length < 4; offset++) {
        const seed =
          ((problem.seed >>> 0) + Math.imul(offset, 2654435761)) >>> 0;
        const source = generateElementaryProblem(
          section.unit,
          seed,
          problem.tier,
        );
        if (canUse(source.answer)) choices.push(source.answer.trim());
      }
    }
  }

  // Nearby wrong values keep numeric items tappable even in sections whose
  // bank/generator repeats one answer (for example a fixed conversion fact).
  for (const candidate of nearbyAnswers(problem.answer)) {
    if (choices.length === 4) break;
    if (canUse(candidate)) choices.push(candidate);
  }

  const interactive = fractionOf(problem.answer);
  if (choices.length !== 4) return { answerChoices: null, interactive };
  const random = stableRandom(problem.seed ^ 0x9e3779b9);
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { answerChoices: choices, interactive };
}
