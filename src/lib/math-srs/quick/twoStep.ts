import { intBetween } from "../../elementary/rng";
import {
  eqChoice,
  nonZero,
  numChoice,
  oneOf,
  wrong,
  type QuickShape,
} from "./shape";
import { eq, factor, fracTerm, lin, tail, term, withJosa, withRo } from "./tex";

/** `ax+b=c` 에서 상수항 `b` 를 이항한 모양 */
const transpose: QuickShape = {
  conceptId: "two-step",
  name: "transpose",
  title: "상수항 이항",
  summary: "좌변의 상수항을 우변으로 옮긴 식을 고른다",
  seconds: [8, 11],
  hint: "이항하면 부호가 바뀌어요. $x$ 의 계수는 그대로 둬요.",
  build(rng, difficulty) {
    const [aMin, aMax, bMin, bMax, sMin, sMax] = (
      [
        [2, 3, 1, 5, 1, 5],
        [2, 5, 2, 9, 2, 6],
        [2, 5, -9, -2, 1, 6],
        [3, 6, -12, -5, 4, 8],
        [2, 9, -25, -10, 2, 9],
      ] as const
    )[difficulty - 1]!;
    const a = intBetween(rng, aMin, aMax);
    const b = intBetween(rng, bMin, bMax);
    const s = intBetween(rng, sMin, sMax);
    if (a * s > 60) return null;
    const c = a * s + b;
    const equation = `${lin(a, b)}=${c}`;
    const correct = eqChoice(a, c - b);
    if (!correct) return null;
    return {
      prompt: `$${equation}$ 에서 ${withJosa(String(b), "을/를")} 이항하면?`,
      correct,
      wrong: [
        wrong(eqChoice(a, c + b), "부호를 바꾸지 않음"),
        wrong(eqChoice(1, c - b), "계수까지 없앰"),
        wrong(eqChoice(a, c), "옮기지 않고 지움"),
      ],
      solution: [`$${term(a)}=${c}${tail(-b)}$ 이므로 $${eq(a, c - b)}$`],
    };
  },
};

/** `ax=c` · `(p/q)x=c` — 계수로 나누는 한 걸음 */
const coef: QuickShape = {
  conceptId: "two-step",
  name: "coef",
  title: "계수로 나누기",
  summary: "x 의 계수로 양변을 나눠 x 의 값을 구한다",
  seconds: [8, 12],
  hint: "양변을 $x$ 의 계수로 나눠요. 분수 계수는 역수를 곱해요.",
  build(rng, difficulty) {
    if (difficulty === 5) {
      const [p, q] = oneOf(rng, [
        [2, 3],
        [3, 4],
        [2, 5],
        [3, 5],
        [4, 5],
      ] as const);
      // 난이도 5 는 분수 계수에 음수까지 — 부호를 반반 섞으면 사다리가 4 아래로 내려간다(실측)
      const j = -intBetween(rng, 1, 5);
      const s = q * j;
      const c = p * j;
      const correct = numChoice(s);
      if (!correct) return null;
      return {
        prompt: `$${fracTerm(p, q)}=${c}$ 일 때 $x$ 의 값은?`,
        correct,
        wrong: [
          wrong(numChoice(c * q), "분모만 곱함"),
          wrong(numChoice(j), "분자로만 나눔"),
          wrong(numChoice(-s), "부호를 반대로 함"),
          wrong(numChoice(c), "우변의 수 그대로"),
        ],
        solution: [
          `양변에 ${withJosa(String(q), "을/를")} 곱하고 ${withRo(String(p))} 나누면 $x=${s}$`,
        ],
      };
    }
    const [aMin, aMax, sMin, sMax] = (
      [
        [2, 5, 1, 5],
        [2, 9, 2, 9],
        [2, 9, -9, -2],
        [-9, -2, -9, 9],
      ] as const
    )[difficulty - 1]!;
    const a = intBetween(rng, aMin, aMax);
    const s =
      difficulty === 4 ? nonZero(rng, sMin, sMax) : intBetween(rng, sMin, sMax);
    if (Math.abs(s) < 2 && difficulty === 4) return null;
    const c = a * s;
    const correct = numChoice(s);
    if (!correct) return null;
    return {
      prompt: `$${term(a)}=${c}$ 일 때 $x$ 의 값은?`,
      correct,
      wrong: [
        wrong(numChoice(-s), "부호를 반대로 함"),
        wrong(numChoice(c - a), "나누기 대신 뺌"),
        wrong(numChoice(c * a), "나누기 대신 곱함"),
        wrong(numChoice(c + a), "나누기 대신 더함"),
        wrong(numChoice(c), "우변의 수 그대로"),
      ],
      solution: [`$x=${c}\\div ${factor(a)}=${s}$`],
    };
  },
};

/** `ax+b=c` 를 풀어 `x` 의 값 */
const solve: QuickShape = {
  conceptId: "two-step",
  name: "solve",
  title: "해 구하기",
  summary: "상수항을 옮기고 계수로 나눠 x 의 값을 구한다",
  seconds: [12, 16],
  hint: "상수항을 이항한 뒤 $x$ 의 계수로 나눠요.",
  build(rng, difficulty) {
    let a: number;
    let b: number;
    let s: number;
    if (difficulty === 1) {
      a = intBetween(rng, 2, 3);
      b = intBetween(rng, 1, 5);
      s = intBetween(rng, 1, 4);
    } else if (difficulty === 2) {
      a = intBetween(rng, 2, 5);
      b = intBetween(rng, 2, 9);
      s = intBetween(rng, 2, 6);
    } else if (difficulty === 3) {
      a = intBetween(rng, 2, 5);
      b = intBetween(rng, -9, -2);
      s = intBetween(rng, 1, 6);
    } else if (difficulty === 4) {
      a = intBetween(rng, 2, 5);
      b = nonZero(rng, -12, 12);
      s = intBetween(rng, -6, -1);
    } else {
      a = intBetween(rng, -5, -2);
      b = nonZero(rng, -15, 15);
      s = nonZero(rng, -6, 6);
      if (Math.abs(b) < 5 || Math.abs(s) < 2) return null;
    }
    const c = a * s + b;
    if (Math.abs(c) > 60) return null;
    const correct = numChoice(s);
    if (!correct) return null;
    return {
      prompt: `$${lin(a, b)}=${c}$ 일 때 $x$ 의 값은?`,
      correct,
      wrong: [
        wrong(numChoice((c + b) / a), "이항할 때 부호를 바꾸지 않음"),
        wrong(numChoice(c - b), "계수로 나누지 않음"),
        wrong(numChoice(-s), "부호를 반대로 함"),
        wrong(numChoice(c / a - b), "나누기를 먼저 하고 상수항은 그대로"),
      ],
      solution: [`$${eq(a, c - b)}$ 이므로 $x=${s}$`],
    };
  },
};

export const TWO_STEP_SHAPES: QuickShape[] = [transpose, coef, solve];
