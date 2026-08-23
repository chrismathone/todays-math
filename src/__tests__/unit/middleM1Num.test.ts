/**
 * 중1 RPM 1-1 「수」 38유형 (`m1Num.ts`) — 독립 검산.
 *
 * ## 검산은 생성기와 «다른 길»로 간다 (동어반복 금지)
 *
 * | 무엇 | 생성기 | 이 시험 |
 * |---|---|---|
 * | 소인수분해 | 지수를 **먼저 뽑아** 수를 만든다 | 그 수를 **시행나눗셈으로 다시 분해**한다 |
 * | 약수의 개수 | $\prod(e_i+1)$ | 약수를 **전수 열거**해서 센다(√ 짝짓기) |
 * | 최대공약수·최소공배수 | 몫 쪽 소수를 갈라 **구성으로** 정한다 | **유클리드 호제법**으로 다시 잰다 |
 * | 제곱수 만들기 | 홀수 지수 소인수의 곱 | $N\times m$ 이 제곱인 **가장 작은 $m$** 을 전수로 찾는다 |
 * | 「가장 작은 …」류 | 답을 먼저 뽑고 최소성을 확인 | 후보를 **처음부터 다시 훑어** 최소성을 재확인 |
 * | 유리수 분류·대소 | 만들 때 값을 안다 | **발문 글자에서 다시 파싱**해 분류·정렬한다 |
 * | 참·거짓 문장 | 자기 표 | **딴 손으로 옮긴 이 파일의 표** |
 *
 * 자기 모듈(`M1_NUM`)을 직접 훑는다 — `registeredTypes()` 를 중단원 이름으로
 * 거르면 같은 중단원의 남의 유형을 쓸어 담는다(물결 2 에서 실제로 났다).
 *
 * 유형 번호·제목은 `scripts/rpm/rpm-type-catalog.json`(정본)과 직접 대조한다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M1_NUM } from "../../lib/middle/m1Num";
import type { MidProblem } from "../../lib/middle/types";

const REPO = path.resolve(__dirname, "../../..");
const SEEDS = [20260823, 1, 7777, 424242, 99991];

// ── 독립 검산 연장 (생성기와 다른 방법) ─────────────────────

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
}

/** 시행나눗셈 소인수분해 — 생성기는 «구성»으로 알고 있던 것을 여기서 다시 캔다. */
function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p += 1) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e += 1;
    }
    if (e > 0) out.push([p, e]);
  }
  if (rest > 1) out.push([rest, 1]);
  return out;
}

/** 약수 **전수 열거** (√ 짝짓기) — 「지수에 1을 더해 곱하기」와 다른 길. */
function divisorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i * i <= n; i += 1) {
    if (n % i !== 0) continue;
    out.push(i);
    if (i !== n / i) out.push(n / i);
  }
  return out.sort((a, b) => a - b);
}

/** 유클리드 호제법 — 생성기는 이 함수를 한 번도 부르지 않는다. */
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

const gcd3 = (a: number, b: number, c: number): number => gcd(gcd(a, b), c);
const lcm3 = (a: number, b: number, c: number): number => lcm(lcm(a, b), c);

function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** 본문의 `$...$` 알맹이들. */
function mathBodies(text: string): string[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]!);
}

/** 수식 안에 나온 정수 전부 — 「발문이 정말 그 수를 말하는가」를 볼 때 쓴다. */
function intsIn(text: string): number[] {
  return mathBodies(text).flatMap((b) => (b.match(/-?\d+/g) ?? []).map(Number));
}

function shows(text: string, ...values: number[]): void {
  const got = intsIn(text);
  for (const v of values) {
    expect(got, `발문에 $${v}$ 가 없다: ${text.slice(0, 90)}`).toContain(v);
  }
}

/** 정답의 첫 정수. */
function answerNum(p: MidProblem): number {
  const m = p.answer.match(/-?\d+/);
  if (!m) throw new Error(`정답에 수가 없습니다: ${p.answer}`);
  return Number(m[0]);
}

/** `2^{2}\times3\times5` → `[[2,2],[3,1],[5,1]]`. 꼴이 다르면 던진다. */
function parseFacTex(tex: string): [number, number][] {
  return tex.split("\\times").map((t) => {
    const m = t.match(/^(\d+)(?:\^\{(\d+)\})?$/);
    if (!m) throw new Error(`소인수분해 꼴이 아님: ${JSON.stringify(t)}`);
    return [Number(m[1]), m[2] ? Number(m[2]) : 1] as [number, number];
  });
}

/** 소인수분해 꼴 정답이 **정말 그 수의 소인수분해인가**를 값·소수성·차례로 본다. */
function expectFactorizationOf(tex: string, n: number): void {
  const f = parseFacTex(tex);
  let v = 1;
  for (const [p, e] of f) {
    expect(isPrime(p), `밑 ${p} 이 소수가 아니다`).toBe(true);
    expect(e).toBeGreaterThanOrEqual(1);
    v *= p ** e;
  }
  expect(v, `${tex} 의 값이 ${n} 이 아니다`).toBe(n);
  const bases = f.map(([p]) => p);
  expect(bases, "소인수가 오름차순이 아니거나 겹친다").toEqual(
    [...new Set(bases)].sort((a, b) => a - b),
  );
}

type Rat = { num: number; den: number };

/** 표시된 수 한 개를 유리수로 되읽는다 — 정수·분수·소수 세 꼴만 허용. */
function parseTok(tex: string): Rat {
  let s = tex.trim();
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  const f = s.match(/^\\frac\{(\d+)\}\{(\d+)\}$/);
  if (f) return { num: sign * Number(f[1]), den: Number(f[2]) };
  const d = s.match(/^(\d+)\.(\d+)$/);
  if (d) {
    const den = 10 ** d[2]!.length;
    return { num: sign * (Number(d[1]) * den + Number(d[2])), den };
  }
  const i = s.match(/^(\d+)$/);
  if (i) return { num: sign * Number(i[1]), den: 1 };
  throw new Error(`모르는 수 표기: ${JSON.stringify(tex)}`);
}

const ratVal = (r: Rat): number => r.num / r.den;
const ratIsInt = (r: Rat): boolean => r.num % r.den === 0;

/** 마지막 줄(자료 나열 행)의 표시 수들을 되읽는다. */
function dataToks(content: string): { tex: string; rat: Rat }[] {
  const line = content.split("\n").pop()!;
  return mathBodies(line).map((tex) => ({ tex, rat: parseTok(tex) }));
}

// ── 유형 04(성질)의 참·거짓 — 생성기 표를 **딴 손으로** 옮긴 것 ──
const PROP_TRUTH: Record<string, boolean> = {
  "모든 자연수는 정수이다.": true,
  "모든 정수는 유리수이다.": true,
  "모든 유리수는 정수이다.": false,
  "$0$은 정수이다.": true,
  "$0$은 양수도 음수도 아니다.": true,
  "$0$은 유리수가 아니다.": false,
  "음의 정수는 자연수이다.": false,
  "정수가 아닌 유리수가 있다.": true,
  "자연수가 아닌 양의 정수가 있다.": false,
  "가장 작은 정수가 있다.": false,
  "$-5$는 정수이면서 유리수이다.": true,
  "분모가 $1$인 분수는 정수로 나타낼 수 있다.": true,
  "$1$과 $2$ 사이에는 유리수가 없다.": false,
  "서로 다른 두 유리수 사이에는 항상 다른 유리수가 있다.": true,
};

// ── 유형 12(부등호)의 말 → 등호 포함 여부 — 딴 손으로 옮긴 표 ──
const LOW_STRICT: Record<string, number> = {
  "보다 크거나 같고": 0,
  이상이고: 0,
  "보다 작지 않고": 0,
  "보다 크고": 1,
  초과이고: 1,
};
const HIGH_STRICT: Record<string, number> = {
  "보다 작거나 같다.": 0,
  "이하이다.": 0,
  "보다 크지 않다.": 0,
  "보다 작다.": 1,
  "미만이다.": 1,
};

// ── 유형 15(조건 대소)의 조건 — 딴 손으로 옮긴 표(id 계약) ──
const COND_TEXT: Record<number, string> = {
  0: "$a$는 $b$보다 크다.",
  1: "$b$는 $c$보다 작다.",
  2: "$a$는 음수이다.",
  3: "$c$는 양수이다.",
  4: "$b$의 절댓값은 $a$의 절댓값보다 크다.",
  5: "$a$의 절댓값과 $c$의 절댓값은 같다.",
  6: "$c$를 수직선 위에 나타내면 $a$를 나타내는 점보다 오른쪽에 있다.",
  7: "$b$는 $a$, $b$, $c$ 중 가장 작은 수이다.",
};

/** 조건 술어 — 생성기의 `orderCondHolds` 를 **딴 손으로** 옮긴 것. */
function condHolds(id: number, a: number, b: number, c: number): boolean {
  if (id === 0) return a > b;
  if (id === 1) return b < c;
  if (id === 2) return a < 0;
  if (id === 3) return c > 0;
  if (id === 4) return Math.abs(b) > Math.abs(a);
  if (id === 5) return Math.abs(a) === Math.abs(c);
  if (id === 6) return c > a;
  if (id === 7) return b < a && b < c;
  throw new Error(`모르는 조건 id: ${id}`);
}

function orderOf(a: number, b: number, c: number): string {
  return (
    [
      ["a", a],
      ["b", b],
      ["c", c],
    ] as [string, number][]
  )
    .sort((x, y) => x[1] - y[1])
    .map(([n]) => n)
    .join("<");
}

// ── 우리 단원 이름 — 공유 DB 실측 리터럴 (2026-08-23, orderIndex 362~367) ──
const EXPECTED_SECTION: Record<string, string> = {
  "1-1|소인수분해|04": "소인수분해",
  "1-1|소인수분해|05": "소인수분해",
  "1-1|소인수분해|06": "소인수분해",
  "1-1|소인수분해|07": "소인수분해",
  "1-1|소인수분해|08": "소인수분해",
  "1-1|소인수분해|09": "소인수분해",
  "1-1|소인수분해|10": "소인수분해",
  "1-1|최대공약수와 최소공배수|01": "공약수와 최대공약수",
  "1-1|최대공약수와 최소공배수|02": "공약수와 최대공약수",
  "1-1|최대공약수와 최소공배수|03": "공약수와 최대공약수",
  "1-1|최대공약수와 최소공배수|04": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|05": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|06": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|07": "공배수와 최소공배수",
  "1-1|최대공약수와 최소공배수|08": "공배수와 최소공배수",
  "1-1|최대공약수와 최소공배수|09": "공배수와 최소공배수",
  "1-1|최대공약수와 최소공배수|10": "공배수와 최소공배수",
  "1-1|최대공약수와 최소공배수|11": "공배수와 최소공배수",
  "1-1|최대공약수와 최소공배수|12": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|13": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|14": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|15": "최대공약수와 최소공배수의 활용",
  "1-1|최대공약수와 최소공배수|16": "최대공약수와 최소공배수의 활용",
  "1-1|정수와 유리수|01": "정수와 유리수",
  "1-1|정수와 유리수|02": "정수와 유리수",
  "1-1|정수와 유리수|03": "정수와 유리수",
  "1-1|정수와 유리수|04": "정수와 유리수",
  "1-1|정수와 유리수|05": "정수와 유리수",
  "1-1|정수와 유리수|06": "정수와 유리수",
  "1-1|정수와 유리수|07": "정수와 유리수",
  "1-1|정수와 유리수|08": "정수와 유리수",
  "1-1|정수와 유리수|09": "정수와 유리수",
  "1-1|정수와 유리수|10": "정수와 유리수",
  "1-1|정수와 유리수|11": "수의 대소관계",
  "1-1|정수와 유리수|12": "수의 대소관계",
  "1-1|정수와 유리수|13": "수의 대소관계",
  "1-1|정수와 유리수|14": "정수와 유리수",
  "1-1|정수와 유리수|15": "수의 대소관계",
};

// ── 유형별 독립 검산 ────────────────────────────────────────

const CHECKS: Record<string, (p: MidProblem) => void> = {
  "1-1|소인수분해|04": (p) => {
    const { kind, N, expSum } = p.facts as Record<string, number>;
    shows(p.content, N!);
    const f = factorize(N!); // 생성기가 «구성»으로 알던 것을 다시 캔다
    expect(f.reduce((s, [, e]) => s + e, 0)).toBe(expSum);
    if (kind === 0) {
      expectFactorizationOf(mathBodies(p.answer)[0]!, N!);
    } else {
      expect(f.length, "두 소인수 꼴이어야 한다").toBe(2);
      expect(answerNum(p)).toBe(expSum);
    }
  },

  "1-1|소인수분해|05": (p) => {
    const { kind, N, answer } = p.facts as Record<string, number>;
    shows(p.content, N!);
    const primes = factorize(N!).map(([q]) => q);
    for (const q of primes) expect(isPrime(q)).toBe(true);
    const want =
      kind === 0
        ? primes.reduce((s, q) => s + q, 0)
        : kind === 1
          ? Math.max(...primes)
          : primes.length;
    expect(want).toBe(answer);
    expect(answerNum(p)).toBe(want);
  },

  "1-1|소인수분해|06": (p) => {
    const { kind, N, answer, e2 } = p.facts as Record<string, number>;
    shows(p.content, N!);
    const ds = divisorsOf(N!); // 약수 전수 열거 — 지수 곱셈을 안 쓴다
    expect(factorize(N!).find(([q]) => q === 2)?.[1]).toBe(e2);
    const want =
      kind === 0
        ? ds[ds.length - 2]!
        : kind === 1
          ? ds.filter(isSquare).length
          : Math.max(...ds.filter((d) => d % 2 === 1));
    expect(want).toBe(answer);
    expect(answerNum(p)).toBe(want);
  },

  "1-1|소인수분해|07": (p) => {
    const { N, count } = p.facts as Record<string, number>;
    expect(divisorsOf(N!).length).toBe(count);
    expect(answerNum(p)).toBe(count);
  },

  "1-1|소인수분해|08": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, p: pr, q, k, a, N } = f;
    const other = kind === 0 ? f.n! : f.b!;
    expect(isPrime(pr!) && isPrime(q!)).toBe(true);
    expect(pr! ** a! * q! ** other).toBe(N);
    expect(divisorsOf(N!).length, "약수의 개수가 발문과 다르다").toBe(k);
    // kind 1 은 두 지수가 모두 미지수라 발문에 수로 나오지 않는다
    if (kind === 0) shows(p.content, k!, other);
    else shows(p.content, k!);
    if (kind === 0) {
      // 그 개수를 내는 지수가 하나뿐이어야 답이 정해진다
      const hits: number[] = [];
      for (let x = 1; x <= 12; x += 1) {
        if (divisorsOf(pr! ** x * q! ** other).length === k) hits.push(x);
      }
      expect(hits).toEqual([a]);
      expect(answerNum(p)).toBe(a);
    } else {
      const hits: [number, number][] = [];
      for (let x = 2; x <= 10; x += 1) {
        for (let y = 1; y < x; y += 1) {
          if (divisorsOf(pr! ** x * q! ** y).length === k) hits.push([x, y]);
        }
      }
      expect(hits).toEqual([[a, f.b]]);
      expect(answerNum(p)).toBe(a! + f.b!);
    }
  },

  "1-1|소인수분해|09": (p) => {
    const { kind, N, x, y, squared } = p.facts as Record<string, number>;
    shows(p.content, N!);
    // 「가장 작은 수」를 처음부터 다시 훑어 확인한다(생성기는 홀수 지수로 구했다)
    let least = 0;
    for (let m = 1; m <= 5000; m += 1) {
      const ok =
        kind === 1 ? N! % m === 0 && isSquare(N! / m) : isSquare(N! * m);
      if (ok) {
        least = m;
        break;
      }
    }
    expect(least, "가장 작은 수가 다르다").toBe(x);
    expect(kind === 1 ? N! / x! : N! * x!).toBe(squared);
    expect(isSquare(squared!)).toBe(true);
    expect(y! * y!).toBe(squared);
    expect(answerNum(p)).toBe(kind === 2 ? x! + y! : x);
  },

  "1-1|소인수분해|10": (p) => {
    const { B, x, k, N } = p.facts as Record<string, number>;
    expect(B! * x!).toBe(N);
    expect(divisorsOf(N!).length).toBe(k);
    for (let m = 1; m < x!; m += 1) {
      expect(
        divisorsOf(B! * m).length,
        `$\\square=${m}$ 도 약수 ${k}개라 «가장 작은 수»가 아니다`,
      ).not.toBe(k);
    }
    shows(p.content, k!);
    expect(answerNum(p)).toBe(x);
  },

  "1-1|최대공약수와 최소공배수|01": (p) => {
    const { N, limit, count } = p.facts as Record<string, number>;
    shows(p.content, N!, limit!);
    let c = 0; // 호제법으로 다시 센다 (생성기는 소인수 나눗셈으로 셌다)
    for (let v = 1; v <= limit!; v += 1) if (gcd(v, N!) === 1) c += 1;
    expect(c).toBe(count);
    expect(answerNum(p)).toBe(count);
  },

  "1-1|최대공약수와 최소공배수|02": (p) => {
    const { kind, A, B, G } = p.facts as Record<string, number>;
    expect(gcd(A!, B!)).toBe(G);
    const shown = mathBodies(p.content);
    if (kind === 0) {
      expectFactorizationOf(shown[0]!, A!);
      expectFactorizationOf(shown[1]!, B!);
      expectFactorizationOf(mathBodies(p.answer)[0]!, G!);
    } else {
      shows(p.content, A!, B!);
      expect(answerNum(p)).toBe(G);
    }
  },

  "1-1|최대공약수와 최소공배수|03": (p) => {
    const { kind, A, B, G, answer } = p.facts as Record<string, number>;
    expect(gcd(A!, B!)).toBe(G);
    shows(p.content, A!, B!);
    const common = divisorsOf(A!).filter((d) => B! % d === 0);
    const want =
      kind === 0
        ? common.length
        : kind === 1
          ? common[common.length - 1]!
          : common[common.length - 2]!;
    expect(want).toBe(answer);
    expect(answerNum(p)).toBe(want);
  },

  "1-1|최대공약수와 최소공배수|04": (p) => {
    const { kind, A, B, g, s, t, answer } = p.facts as Record<string, number>;
    expect(g! * s!).toBe(A);
    expect(g! * t!).toBe(B);
    expect(gcd(A!, B!), "최대공약수가 학생 수와 다르다").toBe(g);
    expect(gcd(s!, t!), "한 사람 몫이 서로소가 아니다").toBe(1);
    shows(p.content, A!, B!);
    expect(kind === 0 ? g : kind === 1 ? s : s! + t!).toBe(answer);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|05": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, A, B, g, u, v, answer } = f;
    if (kind === 2) {
      expect(gcd3(A!, B!, f.C!)).toBe(g);
      expect(g! * f.w!).toBe(f.C);
      shows(p.content, A!, B!, f.C!);
      expect(answer).toBe(u! * v! * f.w!);
    } else {
      expect(gcd(A!, B!)).toBe(g);
      shows(p.content, A!, B!);
      expect(answer).toBe(kind === 0 ? g : u! * v!);
    }
    expect(g! * u!).toBe(A);
    expect(g! * v!).toBe(B);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|06": (p) => {
    const { kind, A, B, g, trees, perimeter, answer } = p.facts as Record<
      string,
      number
    >;
    expect(gcd(A!, B!)).toBe(g);
    expect(perimeter).toBe(2 * (A! + B!));
    expect(trees).toBe(perimeter! / g!);
    shows(p.content, A!, B!);
    expect(answer).toBe(kind === 0 ? trees : g);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|07": (p) => {
    const { kind, A, B, L } = p.facts as Record<string, number>;
    expect(lcm(A!, B!)).toBe(L);
    const shown = mathBodies(p.content);
    if (kind === 0) {
      expectFactorizationOf(shown[0]!, A!);
      expectFactorizationOf(shown[1]!, B!);
      expectFactorizationOf(mathBodies(p.answer)[0]!, L!);
    } else {
      shows(p.content, A!, B!);
      expect(answerNum(p)).toBe(L);
    }
  },

  "1-1|최대공약수와 최소공배수|08": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, A, B, L, answer } = f;
    expect(lcm(A!, B!)).toBe(L);
    shows(p.content, A!, B!);
    if (kind === 0) {
      let c = 0;
      for (let v = L!; v <= f.limit!; v += L!) c += 1;
      expect(c).toBe(answer);
    } else if (kind === 1) {
      let first = 0;
      for (let v = 100; v <= 999; v += 1) {
        if (v % L! === 0) {
          first = v;
          break;
        }
      }
      expect(first).toBe(answer);
    } else {
      expect(L! * f.k!).toBe(answer);
    }
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|09": (p) => {
    const f = p.facts as Record<string, number>;
    const build = (x: number, y: number): [number, number] => [
      f.p! ** x * f.q! ** f.qOther! * f.r! ** f.rExp!,
      f.p! ** f.pOther! * f.q! ** y,
    ];
    const [A, B] = build(f.a!, f.b!);
    expect(A).toBe(f.A);
    expect(B).toBe(f.B);
    expect(gcd(A, B)).toBe(f.G);
    expect(lcm(A, B)).toBe(f.L);
    // 조건을 만족시키는 (a, b) 가 하나뿐이어야 답이 정해진다
    const hits: [number, number][] = [];
    for (let x = 1; x <= 8; x += 1) {
      for (let y = 1; y <= 8; y += 1) {
        const [u, w] = build(x, y);
        if (gcd(u, w) === f.G && lcm(u, w) === f.L) hits.push([x, y]);
      }
    }
    expect(hits).toEqual([[f.a, f.b]]);
    expect(answerNum(p)).toBe(f.a! + f.b!);
  },

  "1-1|최대공약수와 최소공배수|10": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, c1, c2, c3, x, L, answer } = f;
    expect(lcm3(c1! * x!, c2! * x!, c3! * x!)).toBe(L);
    shows(p.content, c1!, c2!, c3!, L!);
    const hits: number[] = [];
    for (let v = 1; v <= 80; v += 1) {
      if (lcm3(c1! * v, c2! * v, c3! * v) === L) hits.push(v);
    }
    expect(hits, "x 가 하나로 안 정해진다").toEqual([x]);
    expect(answer).toBe(kind === 0 ? x : gcd3(c1! * x!, c2! * x!, c3! * x!));
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|11": (p) => {
    const { kind, A, L, answer, count, least } = p.facts as Record<
      string,
      number
    >;
    shows(p.content, A!, L!);
    const cands: number[] = [];
    for (let n = 1; n <= L!; n += 1) if (lcm(A!, n) === L) cands.push(n);
    expect(cands.length).toBe(count);
    expect(cands[0]).toBe(least);
    expect(answer).toBe(kind === 0 ? least : count);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|12": (p) => {
    const { kind, A, B, L, sheets, answer } = p.facts as Record<string, number>;
    expect(lcm(A!, B!)).toBe(L);
    expect(sheets).toBe((L! / A!) * (L! / B!));
    shows(p.content, A!, B!);
    expect(answer).toBe(kind === 0 ? L : sheets);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|13": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, a, b, L } = f;
    expect(lcm(a!, b!)).toBe(L);
    shows(p.content, a!, b!, f.startHour!);
    if (kind === 0) {
      expect(answerNum(p)).toBe(L);
    } else if (kind === 1) {
      expect(f.hh).toBe(f.startHour! + Math.floor(L! / 60));
      expect(f.mm).toBe(L! % 60);
      expect(f.hh).toBeLessThanOrEqual(11);
      shows(p.answer, f.hh!, f.mm!);
    } else {
      expect(f.totalMin).toBe((f.endHour! - f.startHour!) * 60);
      expect(f.endHour).toBeGreaterThan(12);
      expect(answerNum(p)).toBe(Math.floor(f.totalMin! / L!));
    }
  },

  "1-1|최대공약수와 최소공배수|14": (p) => {
    const { kind, a, b, L, turnA, turnB, answer } = p.facts as Record<
      string,
      number
    >;
    expect(lcm(a!, b!)).toBe(L);
    expect(turnA).toBe(L! / a!);
    expect(turnB).toBe(L! / b!);
    shows(p.content, a!, b!);
    expect(answer).toBe(kind === 0 ? turnA : kind === 1 ? L : turnB);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|15": (p) => {
    const { kind, A, B, G, L, biggest, smallest, count, answer } =
      p.facts as Record<string, number>;
    shows(p.content, A!, B!, G!, L!);
    const cands: number[] = [];
    for (let n = 1; n <= L!; n += 1) {
      if (gcd3(A!, B!, n) === G && lcm3(A!, B!, n) === L) cands.push(n);
    }
    expect(cands.length).toBe(count);
    expect(cands.length).toBeGreaterThan(1);
    expect(cands[0]).toBe(smallest);
    expect(cands[cands.length - 1]).toBe(biggest);
    expect(answer).toBe(
      kind === 0 ? biggest : kind === 1 ? biggest! + smallest! : count,
    );
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|최대공약수와 최소공배수|16": (p) => {
    const { kind, G, L, S, D, A, B, answer } = p.facts as Record<
      string,
      number
    >;
    expect(gcd(A!, B!)).toBe(G);
    expect(lcm(A!, B!)).toBe(L);
    expect(A! + B!).toBe(S);
    expect(A! - B!).toBe(D);
    expect(A).toBeGreaterThan(B!);
    shows(p.content, G!, L!, kind === 1 ? D! : S!);
    // 주어진 조건을 만족시키는 두 수가 한 쌍뿐이어야 한다
    const hits: [number, number][] = [];
    for (let y = 1; y <= L!; y += 1) {
      for (let x = y + 1; x <= L!; x += 1) {
        if (gcd(x, y) !== G || lcm(x, y) !== L) continue;
        if (kind === 1 ? x - y === D : x + y === S) hits.push([x, y]);
      }
    }
    expect(hits).toEqual([[A, B]]);
    expect(answer).toBe(kind === 0 ? D : kind === 1 ? S : A);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|01": (p) => {
    const { kind, a, b, answer } = p.facts as Record<string, number>;
    expect(a).toBeLessThan(0);
    expect(b).toBeGreaterThan(0);
    shows(p.content, -a!, b!);
    expect(answer).toBe(kind === 0 ? a! + b! : b! - a!);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|02": (p) => {
    const { kind, n, answer } = p.facts as Record<string, number>;
    const toks = dataToks(p.content); // 발문 글자에서 다시 읽는다
    expect(toks.length).toBe(n);
    const ints = toks.filter((t) => ratIsInt(t.rat));
    const want =
      kind === 0
        ? ints.filter((t) => ratVal(t.rat) > 0).length
        : kind === 1
          ? ints.filter((t) => ratVal(t.rat) < 0).length
          : kind === 2
            ? ints.length
            : toks.length - ints.length;
    expect(want).toBe(answer);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|03": (p) => {
    const { kind, n, answer } = p.facts as Record<string, number>;
    const toks = dataToks(p.content);
    expect(toks.length).toBe(n);
    const ints = toks.filter((t) => ratIsInt(t.rat));
    const want =
      kind === 0
        ? toks.length - ints.length
        : kind === 1
          ? toks.filter((t) => ratVal(t.rat) > 0).length
          : kind === 2
            ? toks.filter((t) => ratVal(t.rat) < 0).length
            : ints.length;
    expect(want).toBe(answer);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|04": (p) => {
    const { n, trueCount } = p.facts as Record<string, number>;
    const lines = [...p.content.matchAll(/^[ㄱ-ㅎ]\.\s*(.+)$/gm)].map(
      (m) => m[1]!,
    );
    expect(lines.length).toBe(n);
    let c = 0;
    for (const line of lines) {
      const truth = PROP_TRUTH[line];
      expect(truth, `이 시험이 모르는 문장: ${line}`).toBeDefined();
      if (truth === true) c += 1;
    }
    expect(c).toBe(trueCount);
    expect(answerNum(p)).toBe(trueCount);
  },

  "1-1|정수와 유리수|05": (p) => {
    const { kind, s, d, x, t } = p.facts as Record<string, number>;
    if (kind === 2) {
      expect(d).toBe(Math.abs(s! - t!));
      shows(p.content, s!, t!);
      expect(answerNum(p)).toBe(d);
    } else {
      expect(x).toBe(kind === 0 ? s! + d! : s! - d!);
      shows(p.content, s!, d!);
      expect(answerNum(p)).toBe(x);
    }
  },

  "1-1|정수와 유리수|06": (p) => {
    const { kind, lo, hi, m, d } = p.facts as Record<string, number>;
    expect(lo).toBe(m! - d!);
    expect(hi).toBe(m! + d!);
    expect(m).toBe((lo! + hi!) / 2); // 한가운데인지 직접 확인
    if (kind === 0) {
      shows(p.content, lo!, hi!);
      expect(answerNum(p)).toBe(m);
    } else {
      shows(p.content, 2 * d!, m!);
      expect(answerNum(p)).toBe(hi);
    }
  },

  "1-1|정수와 유리수|07": (p) => {
    const { kind, sign, m, n, a, b, answer } = p.facts as Record<
      string,
      number
    >;
    expect(a).toBe(Math.abs(-m!));
    expect(Math.abs(b!)).toBe(n);
    expect(b! > 0).toBe(sign === 0);
    shows(p.content, -m!, n!);
    expect(answer).toBe(kind === 0 ? a! + b! : kind === 1 ? a! - b! : a! * b!);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|08": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, count } = f;
    let c = 0; // 정수를 전수로 훑어 센다 (생성기는 2n+1 꼴로 셌다)
    for (let v = -80; v <= 80; v += 1) {
      const A = Math.abs(v);
      const ok =
        kind === 0
          ? A <= f.n!
          : kind === 1
            ? A < f.n!
            : A >= f.lo! && A <= f.hi!;
      if (ok) c += 1;
    }
    expect(c).toBe(count);
    expect(answerNum(p)).toBe(count);
  },

  "1-1|정수와 유리수|09": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, n, answer } = f;
    expect(answer).toBe(
      kind === 0 ? 2 * n! : kind === 1 ? n! - f.m! : -(n! * n!),
    );
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|10": (p) => {
    const { kind, x, d, answer } = p.facts as Record<string, number>;
    expect(d).toBe(2 * x!);
    expect(answer).toBe(kind === 0 ? x : kind === 1 ? -x! : d);
    expect(answerNum(p)).toBe(answer);
    shows(p.content, kind === 2 ? x! : d!);
  },

  "1-1|정수와 유리수|11": (p) => {
    const { kind, n, k } = p.facts as Record<string, number>;
    const toks = dataToks(p.content); // 발문에서 다시 읽어 스스로 정렬한다
    expect(toks.length).toBe(n);
    const asc = [...toks].sort((a, b) => ratVal(a.rat) - ratVal(b.rat));
    const want = kind === 0 ? asc[k! - 1]! : asc[n! - k!]!;
    expect(mathBodies(p.answer)[0]).toBe(want.tex);
  },

  "1-1|정수와 유리수|12": (p) => {
    const { a, b, loStrict, hiStrict } = p.facts as Record<string, number>;
    const line = p.content.split("\n").pop()!;
    const m = line.match(/^\$x\$는 \$(-?\d+)\$(.*?) \$(-?\d+)\$(.*)$/);
    expect(m, `발문 꼴이 다르다: ${line}`).not.toBeNull();
    expect(Number(m![1])).toBe(a);
    expect(Number(m![3])).toBe(b);
    const lo = LOW_STRICT[m![2]!.trim()];
    const hiS = HIGH_STRICT[m![4]!.trim()];
    expect(lo, `모르는 말: ${m![2]}`).toBeDefined();
    expect(hiS, `모르는 말: ${m![4]}`).toBeDefined();
    expect(lo).toBe(loStrict);
    expect(hiS).toBe(hiStrict);
    const loSym = lo === 0 ? "\\le" : "<";
    const hiSym = hiS === 0 ? "\\le" : "<";
    expect(p.answer).toBe(`$${a}${loSym} x${hiSym}${b}$`);
    expect(a).toBeLessThan(b!);
  },

  "1-1|정수와 유리수|13": (p) => {
    const f = p.facts as Record<string, number>;
    const { kind, lo, hi, answer } = f;
    const bodies = mathBodies(p.content);
    const left = parseTok(bodies[0]!);
    const right = parseTok(bodies[1]!);
    expect(left.num).toBe(f.lNum);
    expect(left.den).toBe(f.lDen);
    expect(right.num).toBe(f.rNum);
    expect(right.den).toBe(f.rDen);
    const between: number[] = []; // 사이의 정수를 직접 훑는다
    for (let v = -60; v <= 60; v += 1) {
      if (ratVal(left) < v && v < ratVal(right)) between.push(v);
    }
    expect(between[0]).toBe(lo);
    expect(between[between.length - 1]).toBe(hi);
    const want =
      kind === 0
        ? between.length
        : kind === 1
          ? between[between.length - 1]!
          : between.reduce((s, v) => s + v, 0);
    expect(want).toBe(answer);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|14": (p) => {
    const { kind, k, a, b, dist, answer } = p.facts as Record<string, number>;
    expect(a).toBeLessThan(0);
    expect(b).toBeGreaterThan(0);
    expect(Math.abs(b!)).toBe(k! * Math.abs(a!));
    expect(Math.abs(a! - b!)).toBe(dist);
    shows(p.content, k!, dist!);
    expect(answer).toBe(kind === 0 ? b : kind === 1 ? a : a! + b!);
    expect(answerNum(p)).toBe(answer);
  },

  "1-1|정수와 유리수|15": (p) => {
    const f = p.facts as Record<string, number>;
    const { a, b, c, n } = f;
    const ids = [f.c1!, f.c2!, f.c3!, f.c4!].filter((v) => v !== -1);
    expect(ids.length).toBe(n);
    // 발문에 적힌 조건이 이 시험의 표와 글자 그대로 같아야 한다
    const lines = [...p.content.matchAll(/^\((?:가|나|다|라)\)\s*(.+)$/gm)].map(
      (m) => m[1]!,
    );
    expect(lines.length).toBe(n);
    expect(lines).toEqual(ids.map((id) => COND_TEXT[id]));
    // 실제 값이 조건을 전부 만족시키는가
    for (const id of ids) {
      expect(condHolds(id, a!, b!, c!), `조건 ${id} 이 거짓`).toBe(true);
    }
    expect(p.answer).toBe(`$${orderOf(a!, b!, c!)}$`);
    // 같은 조건을 만족시키는 다른 세 수도 같은 대소 순서를 내야 한다
    for (let x = -8; x <= 8; x += 1) {
      for (let y = -8; y <= 8; y += 1) {
        for (let z = -8; z <= 8; z += 1) {
          if (x === y || y === z || x === z) continue;
          if (!ids.every((id) => condHolds(id, x, y, z))) continue;
          expect(orderOf(x, y, z), "조건이 대소 순서를 하나로 못 정한다").toBe(
            orderOf(a!, b!, c!),
          );
        }
      }
    }
  },
};

// ── 시험 ────────────────────────────────────────────────────

/** `$...$` 를 걷어 낸 나머지 — 여기 백슬래시가 남으면 단위·명령이 수식 밖으로 샌 것 */
function outsideMath(text: string): string {
  return text.replace(/\$[^$]*\$/g, "");
}

/** 수 읽기의 끝 글자에 받침이 있는가 — `m2Josa` 와 같은 규칙을 시험 쪽에 다시 적은 것 */
function numVowelFinal(n: number): boolean {
  const d = Math.abs(n) % 10;
  return d === 2 || d === 4 || d === 5 || d === 9;
}

/**
 * 수식 끝에서 «읽을 때 마지막에 오는 수» — 없으면 `null`(판정하지 않는다).
 *
 * 분수를 그냥 건너뛰면 안 된다. `improperToMixed`(textPreprocess)가 가분수를
 * **대분수**로 그리므로 $\frac{14}{5}$ 는 「$2$와 $5$분의 $4$」로 읽히고,
 * 조사는 그 **나머지**를 따른다. 처음엔 「숫자로 끝나는 것」만 봐서 유형 13 의
 * 64자리를 통째로 못 봤다 — 지표가 실패를 셀 수 있는 형태여야 한다.
 */
function trailingReadNumber(body: string): number | null {
  const frac = body.match(/\\frac\{(\d+)\}\{(\d+)\}$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (a % b === 0) return a / b;
    return a > b ? a % b : a;
  }
  const int = body.match(/(\d+)$/);
  return int ? Number(int[1]) : null;
}
const JOSA_PAIR: Record<string, [string, string]> = {
  을: ["을", "를"],
  를: ["을", "를"],
  은: ["은", "는"],
  는: ["은", "는"],
  와: ["과", "와"],
  과: ["과", "와"],
};

describe("중1 1-1 「수」 38유형 (m1Num)", () => {
  it("38유형 명부와 unitSection 이 공유 DB 실측 그대로다", () => {
    expect(new Set(M1_NUM.map((e) => e.key))).toEqual(
      new Set(Object.keys(EXPECTED_SECTION)),
    );
    expect(M1_NUM.length).toBe(38);
    for (const e of M1_NUM) {
      expect(e.unitSection, e.key).toBe(EXPECTED_SECTION[e.key]);
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.grade).toBe("중1");
    }
  });

  it("세 중단원을 통째로(또는 남은 몫 전부) 덮는다", () => {
    const byMinor = new Map<string, string[]>();
    for (const e of M1_NUM) {
      byMinor.set(e.rpmMinor, [...(byMinor.get(e.rpmMinor) ?? []), e.rpmType]);
    }
    expect([...byMinor.get("소인수분해")!].sort()).toEqual([
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
    ]);
    expect(byMinor.get("최대공약수와 최소공배수")!.length).toBe(16);
    expect(byMinor.get("정수와 유리수")!.length).toBe(15);
  });

  it("유형 번호·제목이 RPM 색인(정본)에 실재한다", () => {
    const catalog = JSON.parse(
      readFileSync(
        path.resolve(REPO, "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    for (const e of M1_NUM) {
      const hit = catalog[e.rpmBook]?.types.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `${e.key} — 색인에 없는 번호`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of M1_NUM) expect(keys.has(e.key), e.key).toBe(true);
  });

  for (const e of M1_NUM) {
    describe(`${e.key} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치·구조를 다시 계산한다", () => {
        const check = CHECKS[e.key];
        expect(check, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) check!(generateMiddleProblem(e.key, seed));
      });

      it("변형 20개도 전부 검산을 통과한다", () => {
        const check = CHECKS[e.key]!;
        for (let variant = 0; variant < 20; variant += 1) {
          check(generateMiddleProblem(e.key, 20260823, variant));
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });

      it("LaTeX 명령이 수식 밖으로 새지 않는다", () => {
        // 단위를 `$…$` 밖에 두면 지면에 `\,\mathrm{cm}` 이 날 것으로 나간다.
        // bareNumbers 도 렌더 검사도 이 부류를 **구조적으로 못 잡는다**
        // (숫자가 없고, KaTeX 는 에러도 아니다) — 실제로 05·06·12 가 그랬다.
        for (let variant = 0; variant < 20; variant += 1) {
          const p = generateMiddleProblem(e.key, 20260823, variant);
          for (const part of [p.content, p.answer, p.solution]) {
            expect(outsideMath(part), part).not.toContain("\\");
          }
        }
      });

      it("수 뒤 조사가 읽기와 맞는다", () => {
        // 「$15$과」·「$63$와」처럼 받침을 거스르면 지면에서 바로 티가 난다.
        for (let variant = 0; variant < 20; variant += 1) {
          const p = generateMiddleProblem(e.key, 20260823, variant);
          for (const part of [p.content, p.answer, p.solution]) {
            for (const m of part.matchAll(/\$([^$]*)\$(을|를|은|는|와|과)/g)) {
              const n = trailingReadNumber(m[1]!);
              if (n === null) continue; // 지수·문자로 끝나면 읽기를 알 수 없다
              const want = numVowelFinal(n)
                ? JOSA_PAIR[m[2]!]![1]
                : JOSA_PAIR[m[2]!]![0];
              expect(
                m[2],
                `$…${m[1]!.slice(-16)}$${m[2]} → ${want} (${part})`,
              ).toBe(want);
            }
          }
        }
      });

      it("실제 렌더러가 붉은 글자·raw 폴백 없이 그린다", () => {
        // KaTeX 는 unknown command 를 에러가 아니라 #cc0000 으로 그린다
        // (CLAUDE.md 2026-08-14) — 성공 여부는 실제 렌더로만 잰다.
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const part of [p.content, p.answer, p.solution]) {
            const html = renderMathHtml(part);
            expect(/#cc0000/i.test(html), part).toBe(false);
            expect(html.includes("math-raw"), part).toBe(false);
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_NUM) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("가지가 있는 유형은 모든 가지가 표본에 나온다", () => {
    // 픽스처가 경계를 안 가르면 그 가지의 변이는 영영 초록이다 (2026-08-21).
    const seen = (key: string, field: string, tries: number): Set<number> => {
      const s = new Set<number>();
      for (let v = 0; v < tries; v += 1) {
        s.add(generateMiddleProblem(key, 20260823, v).facts[field]!);
      }
      return s;
    };
    const two = new Set([0, 1]);
    const three = new Set([0, 1, 2]);
    const four = new Set([0, 1, 2, 3]);
    expect(seen("1-1|소인수분해|04", "kind", 60)).toEqual(two);
    expect(seen("1-1|소인수분해|05", "kind", 60)).toEqual(three);
    expect(seen("1-1|소인수분해|06", "kind", 60)).toEqual(three);
    expect(seen("1-1|소인수분해|07", "kind", 60)).toEqual(three);
    expect(seen("1-1|소인수분해|08", "kind", 60)).toEqual(two);
    expect(seen("1-1|소인수분해|09", "kind", 60)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|02", "kind", 60)).toEqual(two);
    expect(seen("1-1|최대공약수와 최소공배수|03", "kind", 60)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|04", "kind", 60)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|05", "kind", 60)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|06", "kind", 60)).toEqual(two);
    expect(seen("1-1|최대공약수와 최소공배수|07", "kind", 60)).toEqual(two);
    expect(seen("1-1|최대공약수와 최소공배수|08", "kind", 80)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|10", "kind", 60)).toEqual(two);
    expect(seen("1-1|최대공약수와 최소공배수|11", "kind", 80)).toEqual(two);
    expect(seen("1-1|최대공약수와 최소공배수|12", "kind", 60)).toEqual(two);
    expect(seen("1-1|최대공약수와 최소공배수|13", "kind", 80)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|14", "kind", 60)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|15", "kind", 80)).toEqual(three);
    expect(seen("1-1|최대공약수와 최소공배수|16", "kind", 80)).toEqual(three);
    expect(seen("1-1|정수와 유리수|01", "kind", 60)).toEqual(two);
    expect(seen("1-1|정수와 유리수|02", "kind", 80)).toEqual(four);
    expect(seen("1-1|정수와 유리수|03", "kind", 80)).toEqual(four);
    expect(seen("1-1|정수와 유리수|05", "kind", 60)).toEqual(three);
    expect(seen("1-1|정수와 유리수|06", "kind", 60)).toEqual(two);
    expect(seen("1-1|정수와 유리수|07", "kind", 60)).toEqual(three);
    expect(seen("1-1|정수와 유리수|07", "sign", 60)).toEqual(two);
    expect(seen("1-1|정수와 유리수|08", "kind", 60)).toEqual(three);
    expect(seen("1-1|정수와 유리수|09", "kind", 60)).toEqual(three);
    expect(seen("1-1|정수와 유리수|10", "kind", 60)).toEqual(three);
    expect(seen("1-1|정수와 유리수|11", "kind", 60)).toEqual(two);
    expect(seen("1-1|정수와 유리수|13", "kind", 60)).toEqual(three);
    expect(seen("1-1|정수와 유리수|14", "kind", 60)).toEqual(three);
    // 부등호 유형은 말투 다섯 가지가 양쪽 다 나와야 표가 검증된다
    expect(seen("1-1|정수와 유리수|12", "lowIdx", 200).size).toBe(5);
    expect(seen("1-1|정수와 유리수|12", "highIdx", 200).size).toBe(5);
    // 조건 대소는 조건 id 가 여러 가지로 나와야 표가 검증된다
    expect(seen("1-1|정수와 유리수|15", "c1", 200).size).toBeGreaterThan(2);
  });
});
