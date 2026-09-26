import { intBetween } from "../../elementary/rng";
import { eqChoice, nonZero, numChoice, wrong, type QuickShape } from "./shape";
import { eq, lin, tail, tailTerm, term, withJosa } from "./tex";

/** `Ax+B=Cx+D` 의 네 수를 난이도에 맞춰 뽑는다. `A-C` 는 늘 양수. */
function pickSides(
  rng: () => number,
  difficulty: number,
): { A: number; B: number; C: number; D: number } | null {
  let A: number;
  let B: number;
  let C: number;
  let D: number;
  if (difficulty === 1) {
    A = intBetween(rng, 3, 6);
    C = intBetween(rng, 1, A - 1);
    B = intBetween(rng, 1, 5);
    D = intBetween(rng, B + 1, B + 9);
  } else if (difficulty === 2) {
    A = intBetween(rng, 4, 9);
    C = intBetween(rng, 1, A - 2);
    B = intBetween(rng, 1, 9);
    D = intBetween(rng, B + 2, 20);
  } else if (difficulty === 3) {
    A = intBetween(rng, 3, 8);
    C = intBetween(rng, 1, A - 1);
    B = -intBetween(rng, 1, 9);
    D = intBetween(rng, 1, 12);
  } else if (difficulty === 4) {
    A = intBetween(rng, 2, 6);
    C = -intBetween(rng, 1, 5);
    B = nonZero(rng, -9, 9);
    D = B + intBetween(rng, 1, 30);
  } else {
    A = intBetween(rng, 3, 9);
    C = nonZero(rng, A - 9, 8);
    if (C >= A) return null;
    // 난이도 5 는 늘 음수 두 자리 — 부호를 반반 섞으면 사다리가 4 아래로 내려간다(실측)
    B = -intBetween(rng, 10, 20);
    D = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 10, 30);
  }
  if (D === 0 || A === C) return null;
  return { A, B, C, D };
}

/** 이항해 `px=q` 로 정리 */
const collect: QuickShape = {
  conceptId: "both-sides",
  name: "collect",
  title: "x 항은 왼쪽, 수는 오른쪽",
  summary: "양변의 x 항과 상수항을 모아 px=q 꼴로 정리한다",
  seconds: [10, 14],
  hint: "$x$ 항은 좌변으로, 상수항은 우변으로 옮기고 부호를 바꿔요.",
  build(rng, difficulty) {
    const sides = pickSides(rng, difficulty);
    if (!sides) return null;
    const { A, B, C, D } = sides;
    if (D - B <= 0 || D - B > 40) return null;
    const equation = `${lin(A, B)}=${lin(C, D)}`;
    const correct = eqChoice(A - C, D - B);
    if (!correct) return null;
    return {
      prompt: `${withJosa(equation, "을/를")} 이항해 정리하면?`,
      correct,
      wrong: [
        wrong(eqChoice(A + C, D - B), "x 항의 부호를 바꾸지 않음"),
        wrong(eqChoice(A - C, D + B), "상수항의 부호를 바꾸지 않음"),
        wrong(eqChoice(A + C, D + B), "둘 다 부호를 바꾸지 않음"),
      ],
      solution: [
        `$${term(A)}${tailTerm(-C)}=${D}${tail(-B)}$ 이므로 $${eq(A - C, D - B)}$`,
      ],
    };
  },
};

/** 양변에 x 가 있는 방정식의 해 */
const solve: QuickShape = {
  conceptId: "both-sides",
  name: "solve",
  title: "해 구하기",
  summary: "x 항·상수항을 모은 뒤 계수로 나눠 x 의 값을 구한다",
  seconds: [14, 18],
  hint: "$x$ 항과 상수항을 각각 모은 뒤 계수로 나눠요.",
  build(rng, difficulty) {
    let A: number;
    let C: number;
    let B: number;
    let s: number;
    if (difficulty === 1) {
      A = intBetween(rng, 3, 6);
      C = intBetween(rng, A - 3, A - 1);
      B = intBetween(rng, 1, 6);
      s = intBetween(rng, 1, 5);
    } else if (difficulty === 2) {
      A = intBetween(rng, 4, 9);
      C = intBetween(rng, A - 4, A - 1);
      B = intBetween(rng, 1, 9);
      s = intBetween(rng, 2, 6);
    } else if (difficulty === 3) {
      A = intBetween(rng, 3, 8);
      C = intBetween(rng, A - 4, A - 1);
      B = -intBetween(rng, 1, 9);
      s = intBetween(rng, 1, 6);
    } else if (difficulty === 4) {
      A = intBetween(rng, 2, 5);
      C = -intBetween(rng, 1, 3);
      B = nonZero(rng, -9, 9);
      s = intBetween(rng, -5, -1);
    } else {
      A = intBetween(rng, 2, 7);
      C = nonZero(rng, -4, A - 1);
      B = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 10, 20);
      s = intBetween(rng, -6, -2);
    }
    if (C === 0 || A === C) return null;
    const D = (A - C) * s + B;
    if (D === 0 || Math.abs(D) > 60) return null;
    const correct = numChoice(s);
    if (!correct) return null;
    return {
      prompt: `$${lin(A, B)}=${lin(C, D)}$ 일 때 $x$ 의 값은?`,
      correct,
      wrong: [
        wrong(numChoice((D + B) / (A - C)), "상수항의 부호를 바꾸지 않음"),
        wrong(numChoice((D - B) / (A + C)), "x 항의 부호를 바꾸지 않음"),
        wrong(numChoice(-s), "부호를 반대로 함"),
        wrong(numChoice(D - B), "계수로 나누지 않음"),
      ],
      solution: [`$${eq(A - C, D - B)}$ 이므로 $x=${s}$`],
    };
  },
};

/** 해가 없거나 무수히 많을 조건의 상수 `a` */
const noSolution: QuickShape = {
  conceptId: "both-sides",
  name: "no-solution",
  title: "해가 없거나 무수히 많을 조건",
  summary: "해가 없거나 무수히 많도록 하는 상수 a 를 고른다",
  seconds: [10, 14],
  hint: "양변의 $x$ 의 계수가 같아야 해요. 상수항까지 같으면 해가 무수히 많아요.",
  build(rng, difficulty) {
    let equation: string;
    let kind: "없을" | "무수히 많을";
    let answer: number;
    let wrongs;
    if (difficulty === 1) {
      const C = intBetween(rng, 2, 5);
      const B = intBetween(rng, 1, 9);
      const D = intBetween(rng, 1, 9);
      if (B === D) return null;
      equation = `ax+${B}=${lin(C, D)}`;
      kind = "없을";
      answer = C;
      wrongs = [
        wrong(numChoice(-C), "부호를 반대로 함"),
        wrong(numChoice(0), "x 항을 없앰"),
        wrong(numChoice(D - B), "상수항끼리 뺌"),
        wrong(numChoice(D), "우변의 상수항과 헷갈림"),
      ];
    } else if (difficulty === 2) {
      const C = intBetween(rng, 2, 6);
      const D = intBetween(rng, 2, 12);
      if (C === D) return null;
      equation = `${term(C)}+a=${lin(C, D)}`;
      kind = "무수히 많을";
      answer = D;
      wrongs = [
        wrong(numChoice(-D), "부호를 반대로 함"),
        wrong(numChoice(0), "상수항을 없앰"),
        wrong(numChoice(C), "x 의 계수와 헷갈림"),
      ];
    } else if (difficulty === 3) {
      const C = intBetween(rng, 2, 6);
      const B = intBetween(rng, 1, 9);
      const D = intBetween(rng, 1, 9);
      equation = `ax-${B}=${lin(-C, D)}`;
      kind = "없을";
      answer = -C;
      wrongs = [
        wrong(numChoice(C), "부호를 반대로 함"),
        wrong(numChoice(0), "x 항을 없앰"),
        wrong(numChoice(D + B), "상수항끼리 정리함"),
      ];
    } else if (difficulty === 4) {
      const k = intBetween(rng, 2, 5);
      const B = intBetween(rng, 1, 6);
      const D = nonZero(rng, -12, 12);
      if (D === -k * B) return null;
      equation = `-${k}(${lin(1, B)})=ax${tail(D)}`;
      kind = "없을";
      answer = -k;
      wrongs = [
        wrong(numChoice(k), "부호를 반대로 함"),
        wrong(numChoice(0), "x 항을 없앰"),
        wrong(numChoice(B), "괄호 안의 수와 헷갈림"),
      ];
    } else {
      const C = intBetween(rng, 2, 6);
      const B = intBetween(rng, 2, 5);
      equation = `a(x-${B})=${lin(-C, C * B)}`;
      kind = "무수히 많을";
      answer = -C;
      wrongs = [
        wrong(numChoice(C), "부호를 반대로 함"),
        wrong(numChoice(B), "괄호 안의 수와 헷갈림"),
        wrong(numChoice(C * B), "상수항과 헷갈림"),
      ];
    }
    const correct = numChoice(answer);
    if (!correct) return null;
    return {
      prompt: `$${equation}$ 의 해가 ${kind} 때 $a$ 의 값은?`,
      correct,
      wrong: wrongs,
      solution: [
        kind === "없을"
          ? `$x$ 의 계수가 같고 상수항이 달라야 하므로 $a=${answer}$`
          : `$x$ 의 계수와 상수항이 모두 같아야 하므로 $a=${answer}$`,
      ],
    };
  },
};

export const BOTH_SIDES_SHAPES: QuickShape[] = [collect, solve, noSolution];
