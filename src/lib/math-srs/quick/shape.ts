import type { Rng } from "../../elementary/types";
import type { ConceptId, Difficulty } from "../types";
import { eq, frac, fracTerm, lin, tail } from "./tex";

/**
 * 한 걸음 문항의 «모양» 하나. 모양은 씨앗에서 수를 뽑아 발문·정답·오답 후보를 낸다.
 * 보기 넷을 고르고 섞는 일, 칸에 드는지·값이 겹치는지 거르는 일은 `generate.ts` 가 한다.
 */
export interface QuickShape {
  conceptId: ConceptId;
  /** `quick:<conceptId>:<name>` 의 끝 */
  name: string;
  /** 원장님께 보일 짧은 이름 */
  title: string;
  /** 무엇을 묻는가 한 줄 */
  summary: string;
  /** 난이도 1 과 5 의 목표 초 — 사이는 고르게 */
  seconds: readonly [number, number];
  hint: string;
  build(rng: Rng, difficulty: Difficulty): Draft | null;
}

/** 값의 지문 — 식은 여러 값에서, 방정식은 해, 수는 그 수. 둘이 같으면 «같은 보기»다. */
export interface Choice {
  tex: string;
  sig: readonly number[];
}
export interface Wrong extends Choice {
  /** 이 오답이 나오는 실수 — 시안 화면에 한 줄로 보인다 */
  mistake: string;
}

export interface Draft {
  /** 발문 — 식 칸으로 뺀 식은 넣지 않는다 */
  prompt: string;
  /**
   * 발문 아래 줄에 따로 크게 보일 핵심 식(`$` 없는 TeX). 없으면 `""` — 문장제는 식을 세우는 것이
   * 문제라 비운다(원장님 2026-09-27 «식은 발문 아래 줄에 따로 크게»).
   */
  equation: string;
  correct: Choice;
  /** 앞에서부터 «값이 안 겹치고 칸에 드는» 셋을 쓴다. 넉넉히 둔다. */
  wrong: (Wrong | null)[];
  solution: string[];
}

export const SAMPLE_POINTS = [-3.5, -1.25, 0.5, 2.75, 5.5] as const;

export const exprChoice = (tex: string, f: (x: number) => number): Choice => ({
  tex,
  sig: SAMPLE_POINTS.map(f),
});

/** `ax+b` (문자 `v`). `a=0` 이면 보기 종류가 바뀌므로 null. */
export function linChoice(a: number, b: number, v = "x"): Choice | null {
  if (a === 0) return null;
  return exprChoice(lin(a, b, v), (t) => a * t + b);
}

/** `(p/q)x + b` */
export function fracLinChoice(p: number, q: number, b: number): Choice | null {
  if (p === 0) return null;
  return exprChoice(`${fracTerm(p, q)}${tail(b)}`, (t) => (p / q) * t + b);
}

export const numChoice = (n: number): Choice | null =>
  Number.isInteger(n) ? { tex: String(n), sig: [n] } : null;

/** 진분수 수 `\frac{n}{d}` (정수·가분수는 만들지 않는다 — 제품 전처리가 대분수로 바꾼다) */
export function fracNumChoice(n: number, d: number): Choice | null {
  if (!(Math.abs(n) < d) || n === 0) return null;
  return { tex: frac(n, d), sig: [n / d] };
}

/** `px=q` 방정식 — 해로 견준다 */
export function eqChoice(p: number, q: number): Choice | null {
  if (p === 0 || !Number.isInteger(p) || !Number.isInteger(q)) return null;
  return { tex: eq(p, q), sig: [q / p] };
}

export function wrong(choice: Choice | null, mistake: string): Wrong | null {
  return choice ? { ...choice, mistake } : null;
}

/** 목록에서 하나 */
export function oneOf<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

/** `min..max` 정수에서 0 을 뺀 것 중 하나(부호 섞기) */
export function nonZero(rng: Rng, min: number, max: number): number {
  for (;;) {
    const v = min + Math.floor(rng() * (max - min + 1));
    if (v !== 0) return v;
  }
}

export const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);
export const lcm = (a: number, b: number) => Math.abs((a / gcd(a, b)) * b);
