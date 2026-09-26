import { intBetween } from "../../elementary/rng";
import {
  exprChoice,
  fracLinChoice,
  linChoice,
  oneOf,
  wrong,
  type Choice,
  type QuickShape,
  type Wrong,
} from "./shape";
import { withJosa } from "./tex";

/** 말을 식으로 — «~배보다 ~ 큰 수» */
const phrase: QuickShape = {
  conceptId: "word",
  name: "phrase",
  title: "말을 식으로",
  summary: "«어떤 수의 몇 배보다 몇 큰 수» 같은 말을 식으로 옮긴다",
  seconds: [8, 12],
  hint: "«~보다 ~ 큰»은 더하기, «~보다 ~ 작은»은 빼기, «~배»는 곱하기예요.",
  build(rng, difficulty) {
    let prompt: string;
    let correct: Choice | null;
    let wrongs: (Wrong | null)[];
    if (difficulty === 1 && rng() < 0.5) {
      const k = intBetween(rng, 2, 9);
      prompt = `어떤 수 $x$ 의 $${k}$ 배는?`;
      correct = linChoice(k, 0);
      wrongs = [
        wrong(linChoice(1, k), "더하기로 읽음"),
        wrong(
          exprChoice(`\\frac{x}{${k}}`, (t) => t / k),
          "나누기로 읽음",
        ),
        wrong(linChoice(1, -k), "빼기로 읽음"),
      ];
    } else if (difficulty === 1) {
      const k = intBetween(rng, 2, 9);
      prompt = `어떤 수 $x$ 보다 $${k}$ 큰 수는?`;
      correct = linChoice(1, k);
      wrongs = [
        wrong(linChoice(1, -k), "큰 것을 작은 것으로 읽음"),
        wrong(linChoice(k, 0), "배로 읽음"),
        wrong(
          exprChoice(`${k}-x`, (t) => k - t),
          "순서를 바꿔 뺌",
        ),
      ];
    } else if (difficulty === 2 || difficulty === 3) {
      const a = intBetween(rng, 2, 5);
      const k = intBetween(rng, 2, 9);
      if (a === k) return null;
      const bigger = difficulty === 2;
      prompt = `어떤 수 $x$ 의 $${a}$ 배보다 $${k}$ ${bigger ? "큰" : "작은"} 수는?`;
      correct = linChoice(a, bigger ? k : -k);
      wrongs = bigger
        ? [
            wrong(linChoice(a, -k), "큰 것을 작은 것으로 읽음"),
            wrong(linChoice(k, a), "두 수를 바꿈"),
            wrong(
              exprChoice(`${a}(x+${k})`, (t) => a * (t + k)),
              "괄호로 묶음",
            ),
          ]
        : [
            wrong(linChoice(a, k), "작은 것을 큰 것으로 읽음"),
            wrong(
              exprChoice(`${k}-${a}x`, (t) => k - a * t),
              "순서를 바꿔 뺌",
            ),
            wrong(
              exprChoice(`${a}(x-${k})`, (t) => a * (t - k)),
              "괄호로 묶음",
            ),
          ];
    } else if (difficulty === 4) {
      const k = intBetween(rng, 2, 9);
      const a = intBetween(rng, 2, 6);
      if (a === k) return null;
      prompt = `어떤 수 $x$ 에서 ${withJosa(String(k), "을/를")} 뺀 수의 $${a}$ 배는?`;
      correct = exprChoice(`${a}(x-${k})`, (t) => a * (t - k));
      wrongs = [
        wrong(linChoice(a, -k), "괄호를 빠뜨림"),
        wrong(
          exprChoice(`${a}(${k}-x)`, (t) => a * (k - t)),
          "순서를 바꿔 뺌",
        ),
        wrong(
          exprChoice(`${k}(x-${a})`, (t) => k * (t - a)),
          "두 수를 바꿈",
        ),
      ];
    } else {
      const a = intBetween(rng, 2, 5);
      const k = intBetween(rng, 2, 9);
      if (a === k) return null;
      prompt = `어떤 수 $x$ 의 $\\frac{1}{${a}}$ 보다 $${k}$ 작은 수는?`;
      correct = exprChoice(`\\frac{x}{${a}}-${k}`, (t) => t / a - k);
      wrongs = [
        wrong(
          exprChoice(`\\frac{x-${k}}{${a}}`, (t) => (t - k) / a),
          "먼저 빼고 나눔",
        ),
        wrong(linChoice(a, -k), "나누기를 곱하기로 읽음"),
        wrong(
          exprChoice(`\\frac{x}{${a}}+${k}`, (t) => t / a + k),
          "작은 것을 큰 것으로 읽음",
        ),
      ];
    }
    if (!correct) return null;
    return {
      prompt,
      correct,
      wrong: wrongs,
      solution: [`식으로 나타내면 $${correct.tex}$`],
    };
  },
};

const COUNT_WORD = { 2: "두", 3: "세", 4: "네" } as const;
type Kind = "자연수" | "정수" | "짝수" | "홀수";

/** 연속하는 수의 합 */
const consecutive: QuickShape = {
  conceptId: "word",
  name: "consecutive",
  title: "연속하는 수의 합",
  summary: "연속하는 자연수·짝수·홀수 가운데 하나를 x 로 두고 합을 식으로 쓴다",
  seconds: [10, 14],
  hint: "연속하는 자연수는 $1$ 씩, 짝수와 홀수는 $2$ 씩 차이 나요.",
  build(rng, difficulty) {
    const n = ([2, 3, 2, 3, 4] as const)[difficulty - 1]!;
    const fromSmallest = difficulty <= 2;
    const kind = oneOf<Kind>(rng, ["자연수", "정수", "짝수", "홀수"]);
    const step = kind === "자연수" || kind === "정수" ? 1 : 2;
    const other = step === 1 ? 2 : 1;
    const dir = fromSmallest ? 1 : -1;
    const tri = (n * (n - 1)) / 2;
    const endWord =
      n === 2
        ? fromSmallest
          ? "작은"
          : "큰"
        : fromSmallest
          ? "가장 작은"
          : "가장 큰";
    const numbers = Array.from({ length: n }, (_, i) =>
      i === 0 ? "x" : `x${dir > 0 ? "+" : "-"}${i * step}`,
    );
    const correct = linChoice(n, dir * step * tri);
    if (!correct) return null;
    return {
      prompt: `연속하는 ${COUNT_WORD[n]} ${kind} 중 ${endWord} 수가 $x$ 일 때 ${COUNT_WORD[n]} 수의 합은?`,
      correct,
      wrong: [
        wrong(
          linChoice(n, dir * other * tri),
          `간격을 ${other === 1 ? "하나" : "둘"}로 봄`,
        ),
        wrong(linChoice(n, -dir * step * tri), "x 를 반대쪽 끝 수로 봄"),
        wrong(linChoice(n, 0), "모두 x 로 봄"),
        wrong(linChoice(1, dir * step * (n - 1)), "한 수만 씀"),
      ],
      solution: [
        `${numbers.map((t) => `$${t}$`).join(", ")} 의 합은 $${correct.tex}$`,
      ],
    };
  },
};

/** 나이를 식으로 */
const age: QuickShape = {
  conceptId: "word",
  name: "age",
  title: "나이를 식으로",
  summary: "몇 년 후·전, 형·동생의 나이 차이를 식으로 쓴다",
  seconds: [8, 12],
  hint: "«후»는 더하고 «전»은 빼요. 형은 동생보다 많고, 동생은 형보다 적어요.",
  build(rng, difficulty) {
    let prompt: string;
    let answer: number;
    let wrongs: (Wrong | null)[];
    if (difficulty === 1 || difficulty === 3) {
      const later = difficulty === 1;
      const k = later ? intBetween(rng, 2, 9) : intBetween(rng, 3, 12);
      prompt = `$x$ 살인 사람의 $${k}$ 년 ${later ? "후" : "전"} 나이는?`;
      answer = later ? k : -k;
      wrongs = [
        wrong(
          linChoice(1, -answer),
          later ? "후를 전으로 읽음" : "전을 후로 읽음",
        ),
        wrong(linChoice(k, 0), "배로 읽음"),
        wrong(
          exprChoice(`${k}-x`, (t) => k - t),
          "순서를 바꿔 뺌",
        ),
      ];
    } else if (difficulty === 2) {
      const k = intBetween(rng, 2, 9);
      const y = intBetween(rng, 2, 9);
      if (k === y) return null;
      prompt = `$x$ 살인 동생보다 $${k}$ 살 많은 형의 $${y}$ 년 후 나이는?`;
      answer = k + y;
      wrongs = [
        wrong(linChoice(1, k - y), "후를 전으로 읽음"),
        wrong(linChoice(1, k), "몇 년 후를 빠뜨림"),
        wrong(linChoice(1, y), "나이 차이를 빠뜨림"),
        wrong(linChoice(1, y - k), "많은 것을 적은 것으로 읽음"),
      ];
    } else {
      const later = difficulty === 4;
      const k = intBetween(rng, 4, 12);
      const y = later ? intBetween(rng, 2, k - 1) : intBetween(rng, 3, 12);
      if (k === y) return null;
      prompt = `$x$ 살인 형보다 $${k}$ 살 적은 동생의 $${y}$ 년 ${later ? "후" : "전"} 나이는?`;
      answer = later ? -k + y : -k - y;
      wrongs = [
        wrong(
          linChoice(1, later ? k + y : k - y),
          "적은 것을 많은 것으로 읽음",
        ),
        wrong(
          linChoice(1, later ? -k - y : -k + y),
          later ? "후를 전으로 읽음" : "전을 후로 읽음",
        ),
        wrong(
          linChoice(1, -k),
          later ? "몇 년 후를 빠뜨림" : "몇 년 전을 빠뜨림",
        ),
        wrong(linChoice(1, later ? y : -y), "나이 차이를 빠뜨림"),
      ];
    }
    const correct = linChoice(1, answer);
    if (!correct) return null;
    return {
      prompt,
      correct,
      wrong: wrongs,
      solution: [`식으로 나타내면 $${correct.tex}$`],
    };
  },
};

/** 거리·속력·시간 */
const speed: QuickShape = {
  conceptId: "word",
  name: "speed",
  title: "거리·속력·시간",
  summary: "속력이 x 일 때 거리나 시간을 식으로 쓴다",
  seconds: [10, 15],
  hint: "거리는 속력과 시간의 곱, 시간은 거리를 속력으로 나눈 값이에요. 분은 시간으로 바꿔요.",
  build(rng, difficulty) {
    let prompt: string;
    let correct: Choice | null;
    let wrongs: (Wrong | null)[];
    if (difficulty === 1) {
      const k = intBetween(rng, 2, 9);
      prompt = `시속 $x$ km 로 $${k}$ 시간 동안 간 거리는?`;
      correct = linChoice(k, 0);
      wrongs = [
        wrong(linChoice(1, k), "곱하기를 더하기로 함"),
        wrong(
          exprChoice(`\\frac{x}{${k}}`, (t) => t / k),
          "나누기로 함",
        ),
        wrong(
          exprChoice(`\\frac{${k}}{x}`, (t) => k / t),
          "시간 공식과 헷갈림",
        ),
      ];
    } else if (difficulty === 2) {
      const k = intBetween(rng, 6, 20);
      prompt = `$${k}$ km 를 시속 $x$ km 로 갈 때 걸리는 시간은?`;
      correct = exprChoice(`\\frac{${k}}{x}`, (t) => k / t);
      wrongs = [
        wrong(linChoice(k, 0), "곱하기로 함"),
        wrong(
          exprChoice(`\\frac{x}{${k}}`, (t) => t / k),
          "거꾸로 나눔",
        ),
        wrong(
          exprChoice(`${k}-x`, (t) => k - t),
          "빼기로 함",
        ),
      ];
    } else if (difficulty === 3) {
      const k = intBetween(rng, 10, 24);
      const h = intBetween(rng, 2, 4);
      prompt = `$${k}$ km 중 시속 $x$ km 로 $${h}$ 시간 가고 남은 거리는?`;
      correct = exprChoice(`${k}-${h}x`, (t) => k - h * t);
      wrongs = [
        wrong(
          exprChoice(`${h}x-${k}`, (t) => h * t - k),
          "순서를 바꿔 뺌",
        ),
        wrong(
          exprChoice(`${k}-\\frac{x}{${h}}`, (t) => k - t / h),
          "시간으로 나눔",
        ),
        wrong(linChoice(h, k), "남은 거리를 더함"),
      ];
    } else {
      const minutes =
        difficulty === 4
          ? oneOf(rng, [30, 20, 15])
          : oneOf(rng, [40, 45, 50, 36, 48, 24, 42, 54]);
      const g = gcd60(minutes);
      const p = minutes / g;
      const q = 60 / g;
      prompt = `시속 $x$ km 로 $${minutes}$ 분 동안 간 거리는?`;
      correct = fracLinChoice(p, q, 0);
      wrongs = [
        wrong(linChoice(minutes, 0), "분을 시간으로 바꾸지 않음"),
        wrong(
          exprChoice(`\\frac{x}{${minutes}}`, (t) => t / minutes),
          "분으로 나눔",
        ),
        wrong(
          p === 1 ? linChoice(q, 0) : fracLinChoice(1, q, 0),
          p === 1 ? "거꾸로 곱함" : "분자를 빠뜨림",
        ),
      ];
    }
    if (!correct) return null;
    return {
      prompt,
      correct,
      wrong: wrongs,
      solution: [`식으로 나타내면 $${correct.tex}$`],
    };
  },
};

function gcd60(minutes: number): number {
  let a = 60;
  let b = minutes;
  while (b) [a, b] = [b, a % b];
  return a;
}

export const WORD_SHAPES: QuickShape[] = [phrase, consecutive, age, speed];
