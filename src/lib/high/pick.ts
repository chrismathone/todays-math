/**
 * 고등 유형 모듈이 같이 쓰는 뽑기 · 재시도 · 수 정답 · 오답 고르기.
 *
 * 본보기 `h1Identity.ts` 에 있던 것을 **그대로** 옮겼다(2026-09-13, 물결 1 착수 전).
 * 물결 1 에서는 중단원 모듈 열한 개가 동시에 생긴다. 모듈마다 `randInt`·`attempt` 를 제 손으로
 * 적으면 규칙이 갈린다 — 특히 `attempt` 가 **무엇을 삼키나**(`Retry` 만)와 `numAnswer` 가
 * **0 을 버리는 까닭**은 한 곳에만 있어야 한다. 옮기면서 동작은 안 바꿨다(본보기 산출물의
 * 같은 씨앗 지문이 전후 같다).
 */
import type { Rng } from "../elementary/types";

// ───────────────────────────── 뽑기 ─────────────────────────────

export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pickOne<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)]!;
}

/** `lo..hi` 에서 0 이 아닌 정수. */
export function nz(rng: Rng, lo: number, hi: number): number {
  for (let i = 0; i < 100; i += 1) {
    const v = randInt(rng, lo, hi);
    if (v !== 0) return v;
  }
  throw new Error("0 이 아닌 수를 못 뽑았습니다");
}

/** `lo..hi` 에서 서로 다른 정수 `n` 개. */
export function distinctInts(
  rng: Rng,
  lo: number,
  hi: number,
  n: number,
  opts: { nonzero?: boolean; exclude?: readonly number[] } = {},
): number[] {
  const pool: number[] = [];
  for (let v = lo; v <= hi; v += 1) {
    if (opts.nonzero && v === 0) continue;
    if (opts.exclude?.includes(v)) continue;
    pool.push(v);
  }
  if (pool.length < n) throw new Error("서로 다른 수를 뽑을 풀이 모자랍니다");
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  return pool.slice(0, n);
}

// ───────────────────────────── 재시도 ─────────────────────────────

/** 이 판을 버리고 다시 뽑으라는 신호 — 지면을 다 만든 뒤에야 알 수 있는 조건에 쓴다. */
export class Retry extends Error {}

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
export function attempt<T>(f: () => T | null, tries = 300): T {
  for (let i = 0; i < tries; i += 1) {
    try {
      const v = f();
      if (v !== null) return v;
    } catch (e) {
      // `Retry` 만 삼킨다. 생성기 결함(나눗셈이 안 떨어짐 등)은 그대로 올려보낸다 —
      // 여기서 다 삼키면 결함이 «재시도 초과»로 둔갑한다.
      if (!(e instanceof Retry)) throw e;
    }
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

// ───────────────────────────── 지면 ─────────────────────────────

export const $ = (s: string | number): string => `$${s}$`;

/**
 * 수 정답 — **0 이면 다시 뽑는다.**
 *
 * 공용 오답 경로(`deriveFormats.numericMistakes`)는 $0$ 에서 서로 다른 오답을 넷 못 만든다.
 * 그러면 그 변형의 객관식이 조용히 빠지고 단답형만 나간다. 값이 0 인 판은 버린다 —
 * 같은 유형의 다른 수치로 얼마든지 나온다(`highIdentity.test.ts` 가 「변형마다 객관식」을 잠근다).
 */
export function numAnswer(v: number): string {
  if (v === 0) throw new Retry("정답이 0 이라 객관식 오답을 못 만든다");
  return $(v);
}

/** 식 뒤에 붙는 상수항 — 0 이면 아무것도 안 쓴다(`+0` 은 지면 냄새다). */
export function plusConst(k: number): string {
  if (k === 0) return "";
  return k > 0 ? `+${k}` : `${k}`;
}

/** 이미 만든 식 조각을 이어 붙일 때 부호를 챙긴다. `0` 이면 버린다. */
export function withSign(s: string): string {
  if (s === "0") return "";
  return s.startsWith("-") ? s : `+${s}`;
}

/** 곱의 계수 — 1 과 −1 은 숫자를 안 쓴다. */
export function coefPrefix(k: number): string {
  if (k === 1) return "";
  if (k === -1) return "-";
  return String(k);
}

// ───────────────────────────── 오답 ─────────────────────────────

/**
 * 오답 넷 — 후보(수식 몸통, `$` 없이)에서 정답·겹침을 걸러 무작위로 넷. 모자라면 `null`
 * (`attempt` 안에서 다시 뽑는다). 후보는 **그 풀이에서 틀리기 쉬운 자리**에서 만든다
 * (`high-engine-plan.md` §1-1).
 */
export function pickDistractors(
  rng: Rng,
  answerBody: string,
  candidates: readonly string[],
): string[] | null {
  const seen = new Set<string>([answerBody]);
  const pool: string[] = [];
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    pool.push(c);
  }
  if (pool.length < 4) return null;
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  return pool.slice(0, 4).map((d) => $(d));
}
