/**
 * 중1 병렬 세션(세션 중1) 공용 소품 — `m1Book1.ts`·`m1Book2.ts` 만 쓴다.
 *
 * 본보기 `m1LinearApply.ts` 와 같은 계약: 정답(핵심 수치)을 먼저 뽑고 발문을
 * 역산하며, `facts` 에 발문의 원 수치를 남겨 테스트가 **독립 재계산**으로
 * 검산한다. 숫자는 전부 `$...$` 안에 (elementary/rules `bareNumbers` 가드).
 */
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

export const M1_GRADE = "중1";

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
export function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

export type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts"
>;

export function defType(
  book: string,
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${book}|${minor}|${rpmType}`,
    grade: M1_GRADE,
    unitSection,
    rpmBook: book,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: M1_GRADE,
      unitSection,
      rpmBook: book,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

/** 결정적 셔플(Fisher–Yates) — 씨앗이 같으면 순서도 같다. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

/** 풀에서 서로 다른 n개 — 순서도 무작위. */
export function pickDistinct<T>(rng: Rng, pool: readonly T[], n: number): T[] {
  if (pool.length < n) throw new Error("pickDistinct 풀이 모자랍니다");
  return shuffle(rng, pool).slice(0, n);
}

/** 부호 붙은 항 이어붙이기용 — `+3` / `-3`. */
export function signed(n: number): string {
  return n < 0 ? `-${-n}` : `+${n}`;
}

/** [lo, hi] 에서 0 이 아닌 정수. */
export function intNonzero(rng: Rng, lo: number, hi: number): number {
  return attempt(80, () => {
    const v = lo + Math.floor(rng() * (hi - lo + 1));
    return v === 0 ? null : v;
  });
}

/**
 * `px^{2}+qx+r` 의 KaTeX 몸통 — 0항 생략, 계수 ±1 처리. `$` 는 밖에서 감싼다.
 */
export function poly(p: number, q: number, r: number): string {
  const parts: string[] = [];
  const term = (coef: number, sym: string): string => {
    const sign = coef < 0 ? "-" : parts.length === 0 ? "" : "+";
    const abs = Math.abs(coef);
    const body = sym === "" ? String(abs) : abs === 1 ? sym : `${abs}${sym}`;
    return `${sign}${body}`;
  };
  if (p !== 0) parts.push(term(p, "x^{2}"));
  if (q !== 0) parts.push(term(q, "x"));
  if (r !== 0) parts.push(term(r, ""));
  if (parts.length === 0) return "0";
  return parts.join("");
}
