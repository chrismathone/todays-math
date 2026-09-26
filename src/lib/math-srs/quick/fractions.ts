import { intBetween } from "../../elementary/rng";
import {
  eqChoice,
  lcm,
  linChoice,
  nonZero,
  numChoice,
  oneOf,
  wrong,
  type QuickShape,
} from "./shape";
import { eq, lin, withJosa } from "./tex";

const xOver = (d: number) => `\\frac{x}{${d}}`;
const oneOver = (d: number) => `\\frac{1}{${d}}`;

/** 양변에 곱할 가장 작은 자연수(분모의 최소공배수) */
const lcd: QuickShape = {
  conceptId: "fractions",
  name: "lcd",
  title: "분모의 최소공배수",
  summary: "분모를 없애려고 양변에 곱할 가장 작은 자연수를 고른다",
  seconds: [8, 12],
  hint: "모든 분모의 최소공배수를 양변에 곱해요.",
  build(rng, difficulty) {
    let equation: string;
    let dens: number[];
    if (difficulty === 1) {
      const [p, q] = oneOf(rng, [
        [2, 4],
        [2, 6],
        [3, 6],
        [4, 6],
        [2, 3],
        [3, 4],
      ] as const);
      dens = [p, q];
      equation = `${xOver(p)}+${xOver(q)}=${intBetween(rng, 1, 9)}`;
    } else if (difficulty === 2) {
      const p = intBetween(rng, 2, 8);
      const q = intBetween(rng, p + 1, 9);
      dens = [p, q];
      if (lcm(p, q) > 36) return null;
      equation = `${xOver(p)}+${xOver(q)}=${intBetween(rng, 1, 12)}`;
    } else if (difficulty === 3) {
      const p = intBetween(rng, 2, 8);
      const q = intBetween(rng, p + 1, 9);
      dens = [p, q];
      if (lcm(p, q) > 36) return null;
      equation =
        rng() < 0.5
          ? `${xOver(p)}-${xOver(q)}=${nonZero(rng, -9, 9)}`
          : `${xOver(p)}-${oneOver(q)}=${intBetween(rng, 1, 9)}`;
    } else if (difficulty === 4) {
      const p = intBetween(rng, 2, 9);
      const q = intBetween(rng, 2, 9);
      const r = intBetween(rng, 2, 9);
      if (new Set([p, q, r]).size < 3) return null;
      dens = [p, q, r];
      if (dens.reduce(lcm) > 60) return null;
      equation = `${xOver(p)}-${oneOver(q)}=${xOver(r)}`;
    } else {
      const [p, q] = oneOf(rng, [
        [10, 15],
        [12, 18],
        [12, 16],
        [14, 21],
        [15, 20],
        [16, 24],
        [18, 24],
        [20, 30],
        [10, 12],
        [15, 25],
      ] as const);
      dens = [p, q];
      equation = `${xOver(p)}-${xOver(q)}=-${intBetween(rng, 1, 9)}`;
    }
    const least = dens.reduce(lcm);
    const correct = numChoice(least);
    if (!correct) return null;
    const product = dens.reduce((x, y) => x * y, 1);
    return {
      prompt: `$${equation}$ 의 양변에 곱할 가장 작은 자연수는?`,
      correct,
      wrong: [
        wrong(product !== least ? numChoice(product) : null, "분모끼리 곱함"),
        wrong(numChoice(dens[0]! + dens[1]!), "분모끼리 더함"),
        wrong(numChoice(Math.max(...dens)), "가장 큰 분모만 봄"),
        wrong(numChoice(2 * least), "공배수이지만 가장 작지 않음"),
        wrong(numChoice(Math.min(...dens)), "가장 작은 분모만 봄"),
      ],
      solution: [
        `분모 ${dens.map((d) => `$${d}$`).join(", ")} 의 최소공배수는 $${least}$`,
      ],
    };
  },
};

/** 양변에 공배수를 곱했을 때의 좌변 */
const clear: QuickShape = {
  conceptId: "fractions",
  name: "clear",
  title: "분모 없애기",
  summary: "양변에 공배수를 곱했을 때 좌변이 어떻게 되는지 고른다",
  seconds: [10, 14],
  hint: "양변의 모든 항에 곱해요. 상수항도 빠뜨리지 마세요.",
  build(rng, difficulty) {
    let left: string;
    let right: string;
    let M: number;
    // 좌변 = (a·x + c) / p  또는  a·x/p + c  — 곱한 결과는 늘 `lin(·,·)`
    let correct;
    let wrongs;
    if (difficulty === 1) {
      const p = intBetween(rng, 2, 3);
      const c = intBetween(rng, 1, 5);
      left = `${xOver(p)}+${c}`;
      right = `${intBetween(rng, c + 1, 9)}`;
      M = p;
      correct = linChoice(1, p * c);
      wrongs = [
        wrong(linChoice(1, c), "상수항에 곱하지 않음"),
        wrong(linChoice(p, p * c), "분모를 약분하지 않음"),
        wrong(linChoice(p, c), "약분도 상수항도 빠뜨림"),
      ];
    } else if (difficulty === 2) {
      const p = intBetween(rng, 2, 5);
      const q = intBetween(rng, 2, 6);
      if (p === q) return null;
      M = lcm(p, q);
      if (M > 30 || M === p) return null;
      const c = intBetween(rng, 1, 9);
      left = `\\frac{${lin(1, c)}}{${p}}`;
      right = xOver(q);
      const u = M / p;
      correct = linChoice(u, u * c);
      wrongs = [
        wrong(linChoice(u, c), "분자 전체에 곱하지 않음"),
        wrong(linChoice(M, M * c), "분모를 약분하지 않음"),
        wrong(linChoice(M / q, (M / q) * c), "다른 분모로 약분함"),
      ];
    } else if (difficulty === 3) {
      const p = intBetween(rng, 2, 5);
      const q = intBetween(rng, 2, 6);
      if (p === q) return null;
      M = lcm(p, q);
      if (M > 20 || M === p) return null;
      const c = intBetween(rng, 1, 3);
      left = `${xOver(p)}-${c}`;
      right = xOver(q);
      correct = linChoice(M / p, -M * c);
      wrongs = [
        wrong(linChoice(M / p, -c), "상수항에 곱하지 않음"),
        wrong(linChoice(M, -M * c), "분모를 약분하지 않음"),
        wrong(linChoice(M / q, -M * c), "다른 분모로 약분함"),
      ];
    } else {
      const p = intBetween(rng, 2, difficulty === 4 ? 6 : 9);
      const q = intBetween(rng, 2, difficulty === 4 ? 6 : 9);
      if (p === q) return null;
      M = lcm(p, q);
      if (M === p || M > (difficulty === 4 ? 36 : 72)) return null;
      if (difficulty === 5 && M < 10) return null;
      const a = difficulty === 4 ? 1 : intBetween(rng, 2, 3);
      const c = intBetween(rng, 1, 9);
      left = `\\frac{${lin(a, -c)}}{${p}}`;
      right =
        difficulty === 4
          ? xOver(q)
          : `\\frac{${lin(1, intBetween(rng, 1, 5))}}{${q}}`;
      const u = M / p;
      correct = linChoice(u * a, -u * c);
      wrongs = [
        wrong(linChoice(u * a, -c), "분자 전체에 곱하지 않음"),
        wrong(linChoice(M * a, -M * c), "분모를 약분하지 않음"),
        wrong(linChoice((M / q) * a, -(M / q) * c), "다른 분모로 약분함"),
        wrong(linChoice(u * a, u * c), "뒤 항의 부호를 바꿈"),
      ];
    }
    if (!correct) return null;
    return {
      prompt: `$${left}=${right}$ 의 양변에 ${withJosa(String(M), "을/를")} 곱하면 좌변은?`,
      correct,
      wrong: wrongs,
      solution: [`$${M}\\times(${left})=${correct.tex}$`],
    };
  },
};

/** 비례식 → 방정식(외항의 곱 = 내항의 곱) */
const proportion: QuickShape = {
  conceptId: "fractions",
  name: "proportion",
  title: "비례식을 방정식으로",
  summary: "비례식을 «외항의 곱 = 내항의 곱» 방정식으로 바꾼다",
  seconds: [10, 13],
  hint: "외항의 곱과 내항의 곱은 같아요.",
  build(rng, difficulty) {
    const [lo, hi] = (
      [
        [4, 20],
        [10, 30],
        [16, 45],
        [24, 63],
        [36, 81],
      ] as const
    )[difficulty - 1]!;
    const pos = difficulty <= 4 ? difficulty - 1 : intBetween(rng, 0, 3);
    const partner = 3 - pos;
    const P = intBetween(rng, 2, 9);
    const Q = intBetween(rng, 2, 9);
    const R = intBetween(rng, 2, 9);
    const product = Q * R;
    if (product < lo || product > hi || product % P !== 0) return null;
    const terms: string[] = [];
    const others = [0, 1, 2, 3].filter((i) => i !== pos && i !== partner);
    terms[pos] = "x";
    terms[partner] = String(P);
    terms[others[0]!] = String(Q);
    terms[others[1]!] = String(R);
    const ratio = `${terms[0]}:${terms[1]}=${terms[2]}:${terms[3]}`;
    const correct = eqChoice(P, product);
    if (!correct) return null;
    return {
      prompt: `비례식 ${withJosa(ratio, "을/를")} 방정식으로 바꾸면?`,
      correct,
      wrong: [
        wrong(eqChoice(Q, P * R), "짝을 잘못 지음"),
        wrong(eqChoice(R, P * Q), "짝을 잘못 지음"),
        wrong(eqChoice(1, product), "x 의 짝을 곱하지 않음"),
      ],
      solution: [`외항의 곱과 내항의 곱이 같으므로 $${eq(P, product)}$`],
    };
  },
};

export const FRACTIONS_SHAPES: QuickShape[] = [lcd, clear, proportion];
