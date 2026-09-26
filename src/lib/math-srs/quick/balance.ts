import { intBetween } from "../../elementary/rng";
import {
  exprChoice,
  fracNumChoice,
  linChoice,
  nonZero,
  numChoice,
  wrong,
  type Choice,
  type QuickShape,
  type Wrong,
} from "./shape";
import { factor, tail, term } from "./tex";

/** 등식의 성질 — `a=b` 일 때 `a` 쪽 식과 같은 `b` 쪽 식 */
const sameOp: QuickShape = {
  conceptId: "balance",
  name: "same-op",
  title: "양변에 같은 연산",
  summary: "a=b 일 때 a 쪽 식과 같은 b 쪽 식을 고른다",
  seconds: [8, 10],
  hint: "$a$ 자리에 $b$ 를 넣어 보세요. 양변에 같은 연산을 하면 등식은 그대로예요.",
  build(rng, difficulty) {
    let left: string;
    let correct: Choice | null;
    let wrongs: (Wrong | null)[];
    if (difficulty === 1) {
      const k = intBetween(rng, 2, 9);
      left = `a+${k}`;
      correct = linChoice(1, k, "b");
      wrongs = [
        wrong(linChoice(1, -k, "b"), "더하기를 빼기로 바꿈"),
        wrong(linChoice(k, 0, "b"), "더하기를 곱하기로 바꿈"),
        wrong(linChoice(1, 0, "b"), "한쪽에만 더함"),
      ];
    } else if (difficulty === 2) {
      const k = intBetween(rng, 3, 12);
      left = `${k}a`;
      correct = linChoice(k, 0, "b");
      wrongs = [
        wrong(linChoice(1, k, "b"), "곱하기를 더하기로 바꿈"),
        wrong(
          exprChoice(`\\frac{b}{${k}}`, (t) => t / k),
          "곱하기를 나누기로 바꿈",
        ),
        wrong(linChoice(1, 0, "b"), "한쪽에만 곱함"),
      ];
    } else if (difficulty === 3) {
      const k = intBetween(rng, 3, 9);
      left = `a-${k}`;
      correct = linChoice(1, -k, "b");
      wrongs = [
        wrong(linChoice(1, k, "b"), "빼기를 더하기로 바꿈"),
        wrong(
          exprChoice(`${k}-b`, (t) => k - t),
          "빼는 순서를 바꿈",
        ),
        wrong(linChoice(1, 0, "b"), "한쪽에만 뺌"),
      ];
    } else if (difficulty === 4) {
      const k = intBetween(rng, 3, 12);
      left = `\\frac{a}{${k}}`;
      correct = exprChoice(`\\frac{b}{${k}}`, (t) => t / k);
      wrongs = [
        wrong(linChoice(k, 0, "b"), "나누기를 곱하기로 바꿈"),
        wrong(linChoice(1, -k, "b"), "나누기를 빼기로 바꿈"),
        wrong(linChoice(1, 0, "b"), "한쪽에만 나눔"),
      ];
    } else {
      const k = intBetween(rng, 2, 6);
      const c = intBetween(rng, 2, 9);
      left = `\\frac{a}{${k}}-${c}`;
      correct = exprChoice(`\\frac{b}{${k}}-${c}`, (t) => t / k - c);
      wrongs = [
        wrong(
          exprChoice(`\\frac{b}{${k}}+${c}`, (t) => t / k + c),
          "빼기를 더하기로 바꿈",
        ),
        wrong(
          exprChoice(`\\frac{b-${c}}{${k}}`, (t) => (t - c) / k),
          "빼기까지 분자에 넣음",
        ),
        wrong(linChoice(1, -c, "b"), "나누기를 빠뜨림"),
      ];
    }
    if (!correct) return null;
    return {
      prompt: "$a=b$ 일 때 같은 식은?",
      equation: left,
      correct,
      wrong: wrongs,
      solution: [`$a=b$ 이므로 $${left}=${correct.tex}$`],
    };
  },
};

/** 등식의 성질 — `x` 만 남기려면 양변에 무엇을 하나 */
const undo: QuickShape = {
  conceptId: "balance",
  name: "undo",
  title: "x 만 남기기",
  summary: "x 만 남기려면 양변에 더하거나 빼거나 곱하거나 나눌 수를 고른다",
  seconds: [8, 12],
  hint: "좌변에서 $x$ 에 붙은 수를 없애는 반대 연산을 찾으세요.",
  build(rng, difficulty) {
    let equation: string;
    let phrase: string;
    let answer: number;
    let wrongs: (Wrong | null)[];
    let solution: string;
    if (difficulty === 1) {
      const k = intBetween(rng, 2, 5);
      const s = intBetween(rng, 1, 7);
      const c = s + k;
      equation = `x+${k}=${c}`;
      phrase = "양변에서 뺄";
      answer = k;
      wrongs = [
        wrong(numChoice(-k), "부호를 반대로 함"),
        wrong(numChoice(c), "우변의 수를 고름"),
        wrong(numChoice(s), "x 의 값과 헷갈림"),
      ];
      solution = `$x+${k}-${k}=${c}-${k}$ 이므로 $x=${s}$`;
    } else if (difficulty === 2) {
      const k = intBetween(rng, 3, 9);
      const c = intBetween(rng, 2, 9);
      equation = `x-${k}=${c}`;
      phrase = "양변에 더할";
      answer = k;
      wrongs = [
        wrong(numChoice(-k), "부호를 반대로 함"),
        wrong(numChoice(c), "우변의 수를 고름"),
        wrong(numChoice(c + k), "x 의 값과 헷갈림"),
      ];
      solution = `$x-${k}+${k}=${c}+${k}$ 이므로 $x=${c + k}$`;
    } else if (difficulty === 3) {
      const k = intBetween(rng, 2, 6);
      const s = intBetween(rng, -6, -2);
      const c = k * s;
      equation = `${k}x=${c}`;
      phrase = "양변을 나눌";
      answer = k;
      wrongs = [
        wrong(numChoice(-k), "부호를 반대로 함"),
        wrong(numChoice(c), "우변의 수를 고름"),
        wrong(numChoice(s), "x 의 값과 헷갈림"),
      ];
      solution = `$x=${c}\\div ${k}=${s}$`;
    } else if (difficulty === 4) {
      const k = intBetween(rng, 2, 9);
      const s = nonZero(rng, -9, 9);
      if (Math.abs(s) < 2) return null;
      const c = -k * s;
      equation = `-${k}x=${c}`;
      phrase = "양변을 나눌";
      answer = -k;
      wrongs = [
        wrong(numChoice(k), "부호를 빠뜨림"),
        wrong(numChoice(c), "우변의 수를 고름"),
        wrong(numChoice(s), "x 의 값과 헷갈림"),
      ];
      solution = `$x=${c}\\div (-${k})=${s}$`;
    } else {
      const k = intBetween(rng, 2, 9);
      const c = nonZero(rng, -9, 9);
      if (Math.abs(c) < 2) return null;
      equation = `-\\frac{x}{${k}}=${c}`;
      phrase = "양변에 곱할";
      answer = -k;
      wrongs = [
        wrong(numChoice(k), "부호를 빠뜨림"),
        wrong(fracNumChoice(-1, k), "나눌 수와 헷갈림"),
        wrong(numChoice(c), "우변의 수를 고름"),
        wrong(numChoice(-k * c), "x 의 값과 헷갈림"),
      ];
      solution = `$x=${c}\\times (-${k})=${-k * c}$`;
    }
    const correct = numChoice(answer);
    if (!correct) return null;
    return {
      prompt: `$x$ 만 남기려면 ${phrase} 수는?`,
      equation,
      correct,
      wrong: wrongs,
      solution: [solution],
    };
  },
};

/** 등식의 뜻 — 해를 넣어 참이 되게 하는 상수 */
const rootConstant: QuickShape = {
  conceptId: "balance",
  name: "root-constant",
  title: "해를 넣어 상수 구하기",
  summary: "해가 주어진 방정식에서 모르는 상수 a 를 구한다",
  seconds: [10, 14],
  hint: "주어진 해를 $x$ 에 넣고 $a$ 만 남게 정리해요.",
  build(rng, difficulty) {
    let k: number;
    let q = 1;
    let s: number;
    if (difficulty === 1) {
      k = 1;
      s = intBetween(rng, 1, 6);
    } else if (difficulty === 2) {
      k = intBetween(rng, 2, 4);
      s = intBetween(rng, 1, 5);
    } else if (difficulty === 3) {
      k = intBetween(rng, 2, 4);
      s = intBetween(rng, -5, -1);
    } else if (difficulty === 4) {
      k = intBetween(rng, -5, -2);
      s = nonZero(rng, -5, 5);
    } else {
      k = 1;
      q = intBetween(rng, 2, 5);
      s = q * nonZero(rng, -4, 4);
    }
    const a =
      difficulty === 1 || difficulty === 2
        ? intBetween(rng, 1, 9)
        : difficulty === 3
          ? intBetween(rng, 2, 12)
          : nonZero(rng, -12, 12);
    const xPart = (k * s) / q; // x 자리에 해를 넣은 값
    const c = xPart + a;
    if (Math.abs(c) > 40) return null;
    const xTex = q > 1 ? `\\frac{x}{${q}}` : term(k);
    const equation = `${xTex}+a=${c}`;
    const plugged =
      q > 1
        ? `${factor(s)}\\div ${q}`
        : k === 1
          ? `${s}`
          : `${k === -1 ? "-" : k}${k === -1 ? factor(s) : `\\times ${factor(s)}`}`;
    const correct = numChoice(a);
    if (!correct) return null;
    return {
      prompt: `해가 $x=${s}$ 일 때 $a$ 의 값은?`,
      equation,
      correct,
      wrong: [
        wrong(numChoice(c + xPart), "옮길 때 부호를 바꾸지 않음"),
        wrong(numChoice(-a), "빼는 순서를 바꿈"),
        wrong(
          numChoice(c - s),
          q > 1 ? "분모로 나누지 않음" : "계수를 곱하지 않음",
        ),
        wrong(numChoice(c), "x 를 넣지 않음"),
      ],
      solution: [`$${plugged}+a=${c}$ 이므로 $a=${c}${tail(-xPart)}=${a}$`],
    };
  },
};

export const BALANCE_SHAPES: QuickShape[] = [sameOp, undo, rootConstant];
