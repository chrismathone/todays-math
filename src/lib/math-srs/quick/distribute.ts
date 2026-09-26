import { intBetween } from "../../elementary/rng";
import {
  fracLinChoice,
  linChoice,
  nonZero,
  wrong,
  type QuickShape,
} from "./shape";
import { fracTerm, lin, tail, tailTerm, term, withJosa } from "./tex";

/** `-(A+B)` — 괄호 앞 `-` 를 모든 항에 */
const sign: QuickShape = {
  conceptId: "distribute",
  name: "sign",
  title: "괄호 앞의 −",
  summary: "괄호 앞 − 를 풀어 두 항의 부호를 모두 바꾼다",
  seconds: [8, 10],
  hint: "괄호 앞의 $-$ 는 괄호 안 모든 항의 부호를 바꿔요.",
  build(rng, difficulty) {
    let p: number; // x 의 계수 분자
    let q = 1; // x 의 계수 분모
    let b: number;
    if (difficulty === 1) {
      p = 1;
      b = intBetween(rng, 1, 9);
    } else if (difficulty === 2) {
      p = 1;
      b = -intBetween(rng, 2, 9);
    } else if (difficulty === 3) {
      p = intBetween(rng, 2, 5);
      b = nonZero(rng, -9, 9);
    } else if (difficulty === 4) {
      p = -intBetween(rng, 2, 6);
      b = intBetween(rng, 2, 9);
    } else {
      p = rng() < 0.5 ? 1 : -1;
      q = intBetween(rng, 2, 5);
      b = nonZero(rng, -9, 9);
    }
    const inner = `${fracTerm(p, q)}${tail(b)}`;
    const correct = fracLinChoice(-p, q, -b);
    if (!correct) return null;
    return {
      prompt: `$-(${inner})$ 의 괄호를 풀면?`,
      correct,
      wrong: [
        wrong(fracLinChoice(-p, q, b), "뒤 항의 부호를 바꾸지 않음"),
        wrong(fracLinChoice(p, q, -b), "앞 항의 부호를 바꾸지 않음"),
        wrong(fracLinChoice(p, q, b), "괄호만 지움"),
      ],
      solution: [`$-(${inner})=${correct.tex}$`],
    };
  },
};

/** `k(ax+b)` — 괄호 앞의 수를 두 항 모두에 */
const times: QuickShape = {
  conceptId: "distribute",
  name: "times",
  title: "괄호 앞의 수 곱하기",
  summary: "괄호 앞의 수를 두 항 모두에 곱한다",
  seconds: [8, 12],
  hint: "괄호 앞의 수를 괄호 안의 모든 항에 곱해요. 부호도 같이 곱해요.",
  build(rng, difficulty) {
    let prefix: string;
    let k: number;
    let a: number;
    let b: number;
    if (difficulty === 5) {
      const pDen = intBetween(rng, 2, 3);
      const negative = rng() < 0.5;
      k = (negative ? -1 : 1) / pDen;
      prefix = `${negative ? "-" : ""}\\frac{1}{${pDen}}`;
      a = pDen * intBetween(rng, 1, 3);
      b = pDen * nonZero(rng, -5, 5);
    } else {
      // 3 은 괄호 앞 음수(작은 수), 4 는 큰 수에 뒤 항 음수. 음수 앞 계수는 보기 폭 때문에
      // 한 자리로 눌리므로(`-3x+27` 은 320px 칸을 넘는다) 큰 수 단계보다 앞에 둔다(실측).
      const [kMin, kMax, aMin, aMax] = (
        [
          [2, 5, 1, 1],
          [2, 4, 2, 3],
          [-3, -2, 1, 2],
          [2, 5, 1, 3],
        ] as const
      )[difficulty - 1]!;
      k = intBetween(rng, kMin, kMax);
      prefix = `${k}`;
      a = intBetween(rng, aMin, aMax);
      b =
        difficulty <= 2
          ? intBetween(rng, 1, 5)
          : difficulty === 3
            ? nonZero(rng, -4, 4)
            : -intBetween(rng, 1, 9);
    }
    const ka = Math.round(k * a);
    const kb = Math.round(k * b);
    const expr = `${prefix}(${lin(a, b)})`;
    const correct = linChoice(ka, kb);
    if (!correct) return null;
    const wrongs =
      k > 0
        ? [
            wrong(linChoice(ka, b), "뒤 항에 곱하지 않음"),
            wrong(linChoice(a, kb), "앞 항에 곱하지 않음"),
            wrong(linChoice(ka, -kb), "뒤 항의 부호를 바꿈"),
          ]
        : [
            wrong(linChoice(ka, -kb), "뒤 항에 − 를 곱하지 않음"),
            wrong(linChoice(ka, b), "뒤 항에 곱하지 않음"),
            wrong(linChoice(-ka, kb), "앞 항에 − 를 곱하지 않음"),
          ];
    return {
      prompt: `$${expr}$ 의 괄호를 풀면?`,
      correct,
      wrong: wrongs,
      solution: [`$${expr}=${correct.tex}$`],
    };
  },
};

/** `ax-k(bx+c)` — 괄호를 풀고 동류항 정리 */
const simplify: QuickShape = {
  conceptId: "distribute",
  name: "simplify",
  title: "괄호 풀고 정리",
  summary: "괄호 앞 − 를 풀고 x 항끼리 모은 식을 고른다",
  seconds: [10, 14],
  hint: "괄호를 먼저 풀고, $x$ 항끼리·상수항끼리 모아요.",
  build(rng, difficulty) {
    let k = 1;
    let a: number;
    let b: number;
    let c: number;
    if (difficulty === 1) {
      // 괄호 앞이 + — 몸풀기. 부호가 없는 유일한 단계라 사다리의 바닥이다.
      a = intBetween(rng, 2, 6);
      b = intBetween(rng, 1, 3);
      c = intBetween(rng, 1, 5);
      const expr = `${term(a)}+(${lin(b, c)})`;
      const correct = linChoice(a + b, c);
      if (!correct) return null;
      return {
        prompt: `${withJosa(expr, "을/를")} 간단히 하면?`,
        correct,
        wrong: [
          wrong(linChoice(a + b, -c), "상수항의 부호를 바꿈"),
          wrong(linChoice(a - b, c), "더하기를 빼기로 봄"),
          wrong(linChoice(a, c), "괄호 안 x 항을 빠뜨림"),
          wrong(linChoice(a * b, c), "x 항끼리 곱함"),
        ],
        solution: [
          `$${expr}=${term(a)}${tailTerm(b)}${tail(c)}=${correct.tex}$`,
        ],
      };
    } else if (difficulty === 2) {
      b = 1;
      c = intBetween(rng, 1, 5);
      a = intBetween(rng, 2, 5);
    } else if (difficulty === 3) {
      b = 1;
      c = -intBetween(rng, 1, 9);
      a = intBetween(rng, 2, 6);
    } else if (difficulty === 4) {
      b = intBetween(rng, 2, 7);
      c = nonZero(rng, -9, 9);
      a = intBetween(rng, 1, 9);
      if (a === b) return null;
    } else {
      k = intBetween(rng, 2, 3);
      b = intBetween(rng, 1, 3);
      c = nonZero(rng, -6, 6);
      a = intBetween(rng, 1, 9);
    }
    if (a - k * b === 0) return null;
    const expr = `${term(a)}-${k === 1 ? "" : k}(${lin(b, c)})`;
    const correct = linChoice(a - k * b, -k * c);
    if (!correct) return null;
    const wrongs =
      k === 1
        ? [
            wrong(linChoice(a - b, c), "뒤 항의 부호를 바꾸지 않음"),
            wrong(linChoice(a + b, -c), "앞 항의 부호를 바꾸지 않음"),
            wrong(linChoice(a + b, c), "괄호만 지움"),
          ]
        : [
            wrong(linChoice(a - k * b, -c), "뒤 항에 곱하지 않음"),
            wrong(linChoice(a - k * b, k * c), "뒤 항의 부호를 바꾸지 않음"),
            wrong(linChoice(a + k * b, -k * c), "앞 항의 부호를 바꾸지 않음"),
          ];
    return {
      prompt: `${withJosa(expr, "을/를")} 간단히 하면?`,
      correct,
      wrong: wrongs,
      solution: [
        `$${expr}=${term(a)}${tailTerm(-k * b)}${tail(-k * c)}=${correct.tex}$`,
      ],
    };
  },
};

export const DISTRIBUTE_SHAPES: QuickShape[] = [sign, times, simplify];
