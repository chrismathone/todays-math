/**
 * 중1 저조 단원 45유형 (m1Extra) — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)와 **발문 자체**로
 * 조건을 여기서 다시 세워 검산한다. 검산 도구는 생성기와 **다른 방법**을 쓴다 —
 * 소수는 나눗셈 판별(생성기는 소수 집합), 삼각형 넓이는 신발끈 공식(생성기는
 * 밑변×높이), 직육면체 위치 관계는 좌표 기하(생성기는 꼭짓점 문자 공유 수),
 * 사분면 변환은 별도 표본 두 점(생성기는 자기 표본 한 점).
 *
 * 유형 번호·제목의 정본 대조는 `middleTypeCoverage.test.ts` 가 전량으로 한다 —
 * 손 목록 이중화 금지 (2026-08-18 교훈).
 */

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M1EXTRA_TYPES } from "../../lib/middle/m1Extra";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

type Facts = Record<string, number>;

// ── 독립 검산 도구 (생성기와 다른 방법) ─────────────────────

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) {
    if (n % d === 0) return false;
  }
  return true;
}

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/**
 * 다항식 몸통에서 **일차항의 계수** — 지면 글자에서 다시 읽는다.
 *
 * 생성기는 계수 ±1 을 지면에 안 적으므로(`polyTex`) `x`·`-x` 도 $1$·$-1$ 로
 * 읽어야 한다. 뒤에 `^`·문자·숫자가 붙으면 일차항이 아니다.
 */
function linearCoef(body: string): number {
  const m = body.match(/(^|[+-])(\d*)x(?![\^a-zA-Z0-9])/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2]));
}

/** content 마지막 줄(자료 나열 행)의 수들 — 발문↔facts 일치 검사용 */
function dataLineNumbers(content: string): number[] {
  const line = content.split("\n").pop()!;
  return (line.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function quadrantOf(x: number, y: number): number {
  if (x === 0 || y === 0) throw new Error(`축 위의 점: (${x}, ${y})`);
  if (x > 0 && y > 0) return 1;
  if (x < 0 && y > 0) return 2;
  if (x < 0 && y < 0) return 3;
  return 4;
}

/**
 * 점 변환 재구현 — 생성기 `PT_TRANS` 와 같은 id 계약을 **딴 손으로** 옮긴 것.
 * 0 (a,b) · 1 (b,a) · 2 (-a,b) · 3 (a,-b) · 4 (-a,-b) · 5 (ab,a-b) · 6 (ab,b-a)
 */
function applyTrans(t: number, a: number, b: number): [number, number] {
  switch (t) {
    case 0:
      return [a, b];
    case 1:
      return [b, a];
    case 2:
      return [-a, b];
    case 3:
      return [a, -b];
    case 4:
      return [-a, -b];
    case 5:
      return [a * b, a - b];
    case 6:
      return [a * b, b - a];
    default:
      throw new Error(`모르는 변환 id: ${t}`);
  }
}

/** 사분면별 표본 두 점 — 생성기의 표본(±2, ±3)과 다른 값을 쓴다. */
const QUAD_SAMPLES: Record<number, readonly (readonly [number, number])[]> = {
  1: [
    [1, 4],
    [5, 2],
  ],
  2: [
    [-1, 4],
    [-5, 2],
  ],
  3: [
    [-1, -4],
    [-5, -2],
  ],
  4: [
    [1, -4],
    [5, -2],
  ],
};

/** 좌표 06 부호 조건 — id 순서는 생성기 SIGN_CONDS 와 같은 계약 */
const COND_PRED: readonly ((a: number, b: number) => boolean)[] = [
  (a, b) => a * b > 0 && a + b > 0,
  (a, b) => a * b > 0 && a + b < 0,
  (a, b) => a * b < 0 && a > b,
  (a, b) => a * b < 0 && a < b,
];
const COND_SAMPLES: readonly (readonly (readonly [number, number])[])[] = [
  [
    [1, 4],
    [5, 2],
  ],
  [
    [-1, -4],
    [-5, -2],
  ],
  [
    [1, -4],
    [5, -2],
  ],
  [
    [-1, 4],
    [-5, 2],
  ],
];

/** 신발끈 공식 — 넓이의 2배 (생성기는 밑변×높이로 계산했다) */
function doubleArea(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  return Math.abs(ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
}

function factsValues(f: Facts, n: number): number[] {
  return Array.from({ length: n }, (_, i) => f[`v${i + 1}`]!);
}

function medianOf(vals: number[]): number {
  const s = [...vals].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 === 1 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

function uniqueModeOf(vals: number[]): number | null {
  const freq = new Map<number, number>();
  for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best: number | null = null;
  let bestCnt = 0;
  let tie = false;
  for (const [v, cnt] of freq) {
    if (cnt > bestCnt) {
      best = v;
      bestCnt = cnt;
      tie = false;
    } else if (cnt === bestCnt) {
      tie = true;
    }
  }
  return tie ? null : best;
}

// ── 직육면체 좌표 기하 (생성기는 꼭짓점 문자 공유 수로 셌다) ──

type V3 = readonly [number, number, number];

function cuboidVerts(a: number, b: number, c: number): Record<string, V3> {
  return {
    A: [0, 0, c],
    B: [a, 0, c],
    C: [a, b, c],
    D: [0, b, c],
    E: [0, 0, 0],
    F: [a, 0, 0],
    G: [a, b, 0],
    H: [0, b, 0],
  };
}

const FACES6 = ["ABCD", "EFGH", "ABFE", "BFGC", "CGHD", "DHEA"] as const;
const EDGES12 = [
  "AB",
  "BC",
  "CD",
  "DA",
  "EF",
  "FG",
  "GH",
  "HE",
  "AE",
  "BF",
  "CG",
  "DH",
] as const;

const sub = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross = (u: V3, v: V3): V3 => [
  u[1] * v[2] - u[2] * v[1],
  u[2] * v[0] - u[0] * v[2],
  u[0] * v[1] - u[1] * v[0],
];
const dot = (u: V3, v: V3): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const isZero = (u: V3): boolean => u[0] === 0 && u[1] === 0 && u[2] === 0;

function faceNormal(verts: Record<string, V3>, face: string): V3 {
  const p0 = verts[face[0]!]!;
  const p1 = verts[face[1]!]!;
  const p2 = verts[face[2]!]!;
  return cross(sub(p1, p0), sub(p2, p0));
}

function pointToPlane(verts: Record<string, V3>, face: string, p: V3): number {
  const n = faceNormal(verts, face);
  const p0 = verts[face[0]!]!;
  return Math.abs(dot(n, sub(p, p0))) / Math.sqrt(dot(n, n));
}

type EdgeFaceRel = "contained" | "parallel" | "perp" | "meets";

function edgeFaceRel(
  verts: Record<string, V3>,
  edge: string,
  face: string,
): EdgeFaceRel {
  const p = verts[edge[0]!]!;
  const q = verts[edge[1]!]!;
  const n = faceNormal(verts, face);
  const p0 = verts[face[0]!]!;
  const dp = dot(n, sub(p, p0));
  const dq = dot(n, sub(q, p0));
  const dir = sub(q, p);
  if (dp === 0 && dq === 0) return "contained";
  if (dot(n, dir) === 0) return "parallel";
  if (isZero(cross(dir, n))) return "perp";
  return "meets";
}

function faceFaceRel(
  verts: Record<string, V3>,
  f1: string,
  f2: string,
): "parallel" | "perp" | "other" {
  const n1 = faceNormal(verts, f1);
  const n2 = faceNormal(verts, f2);
  if (isZero(cross(n1, n2))) return "parallel";
  if (dot(n1, n2) === 0) return "perp";
  return "other";
}

// ── unitSection 실측 잠금 (공유 DB 2026-08-23) + 45유형 명부 ──

const EXPECTED_SECTION: Record<string, string> = {
  "1-1|소인수분해|01": "소수와 거듭제곱",
  "1-1|소인수분해|02": "소수와 거듭제곱",
  "1-1|소인수분해|03": "소수와 거듭제곱",
  // 11~17 은 RPM 색인 밖 — 「소수와 거듭제곱」을 10유형으로 채우려고 갈래 D 가
  // 지은 것이다. 이 중단원의 색인 최댓값은 10 이고, 04~10 은 `m1Num.ts` 몫이다.
  "1-1|소인수분해|11": "소수와 거듭제곱",
  "1-1|소인수분해|12": "소수와 거듭제곱",
  "1-1|소인수분해|13": "소수와 거듭제곱",
  "1-1|소인수분해|14": "소수와 거듭제곱",
  "1-1|소인수분해|15": "소수와 거듭제곱",
  "1-1|소인수분해|16": "소수와 거듭제곱",
  "1-1|소인수분해|17": "소수와 거듭제곱",
  "1-1|문자의 사용과 식의 계산|09": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|10": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|12": "일차식의 뜻Ⅱ",
  "1-1|문자의 사용과 식의 계산|13": "일차식의 뜻Ⅱ",
  // 21~28 은 RPM 색인 밖 — 「일차식의 뜻Ⅰ」을 10유형으로 채우려고 갈래 D 가
  // 지은 것이다. 이 중단원의 색인 최댓값은 20 이고, 14~20 은 `m1Expr.ts` 몫이다.
  "1-1|문자의 사용과 식의 계산|21": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|22": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|23": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|24": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|25": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|26": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|27": "일차식의 뜻Ⅰ",
  "1-1|문자의 사용과 식의 계산|28": "일차식의 뜻Ⅰ",
  "1-1|좌표와 그래프|03": "순서쌍과 좌표평면(응용)",
  "1-1|좌표와 그래프|04": "순서쌍과 좌표평면(응용)",
  "1-1|좌표와 그래프|05": "순서쌍과 좌표평면(응용)",
  "1-1|좌표와 그래프|06": "순서쌍과 좌표평면(응용)",
  "1-1|좌표와 그래프|10": "순서쌍과 좌표평면(응용)",
  "1-1|일차방정식의 풀이|05": "방정식과 그 해",
  "1-2|다각형|07": "삼각형의 내각과 외각",
  "1-2|다각형|08": "삼각형의 내각과 외각",
  "1-2|대푯값|01": "대푯값",
  "1-2|대푯값|02": "대푯값",
  "1-2|대푯값|03": "대푯값",
  "1-2|대푯값|04": "대푯값",
  "1-2|대푯값|05": "대푯값",
  "1-2|대푯값|06": "대푯값",
  "1-2|입체도형의 겉넓이와 부피|01": "기둥의 겉넓이와 부피",
  "1-2|입체도형의 겉넓이와 부피|02": "기둥의 겉넓이와 부피",
  "1-2|입체도형의 겉넓이와 부피|03": "기둥의 겉넓이와 부피",
  "1-2|입체도형의 겉넓이와 부피|04": "기둥의 겉넓이와 부피",
  "1-2|원과 부채꼴|09": "부채꼴의 호의 길이와 넓이",
  "1-2|원과 부채꼴|10": "부채꼴의 호의 길이와 넓이",
  "1-2|위치 관계|06": "공간에서 평면의 위치 관계",
  "1-2|위치 관계|07": "공간에서 평면의 위치 관계",
  "1-2|위치 관계|08": "공간에서 평면의 위치 관계",
};

// ── 유형별 독립 검산 ────────────────────────────────────────

const CHECKS: Record<string, (p: MidProblem) => void> = {
  "1-1|소인수분해|01": (p) => {
    const f = p.facts;
    const nums = [f.n1!, f.n2!, f.n3!, f.n4!, f.n5!, f.n6!];
    expect(dataLineNumbers(p.content)).toEqual(nums);
    expect(nums.filter(isPrime).length).toBe(f.count);
    expect(firstNumber(p.answer)).toBe(f.count);
  },
  "1-1|소인수분해|02": (p) => {
    const f = p.facts;
    const range: number[] = [];
    for (let v = f.lo!; v <= f.hi!; v += 1) range.push(v);
    const expected =
      f.kind === 0
        ? range.filter(isPrime).length
        : range.filter((v) => v >= 2 && !isPrime(v)).length;
    expect(expected).toBe(f.count);
    expect(p.content.includes(f.kind === 0 ? "소수" : "합성수")).toBe(true);
    expect(firstNumber(p.answer)).toBe(f.count);
  },
  "1-1|소인수분해|03": (p) => {
    const f = p.facts;
    const nums = (p.content.match(/\d+/g) ?? []).map(Number);
    expect(nums.filter((v) => v === f.p).length).toBe(f.m);
    expect(nums.filter((v) => v === f.q).length).toBe(f.n);
    expect(nums.length).toBe(f.m! + f.n!);
    expect(f.m!).toBeGreaterThanOrEqual(2);
    expect(f.n!).toBeGreaterThanOrEqual(2);
    expect(f.p).not.toBe(f.q);
    const am = p.answer.match(
      /^\$(\d+)\^\{(\d+)\} \\times (\d+)\^\{(\d+)\}\$$/,
    );
    expect(am, p.answer).not.toBeNull();
    expect([am![1], am![2], am![3], am![4]].map(Number)).toEqual([
      f.p,
      f.m,
      f.q,
      f.n,
    ]);
  },

  // ── 11~17 「소수와 거듭제곱」을 10유형으로 채운 몫 (갈래 D) ──
  // 검산은 **지면 글자에서** 밑·지수·보기 수를 되읽어 다시 계산한다.
  // `facts` 만 보면 「식을 그리는 쪽」이 틀려도 초록이다.

  "1-1|소인수분해|11": (p) => {
    const m = p.content.match(/\$(\d+)\^\{(\d+)\}\$에서/);
    expect(m, p.content).not.toBeNull();
    const base = Number(m![1]);
    const exp = Number(m![2]);
    expect([base, exp]).toEqual([p.facts.p, p.facts.n]);
    expect(firstNumber(p.answer)).toBe(base + exp);
  },

  "1-1|소인수분해|12": (p) => {
    const m = p.content.match(
      /\$(\d+)\^\{(\d+)\}\\times(\d+)\^\{(\d+)\}\$의 값/,
    );
    expect(m, p.content).not.toBeNull();
    const value =
      Number(m![1]) ** Number(m![2]) * Number(m![3]) ** Number(m![4]);
    expect(value).toBe(p.facts.value);
    expect(firstNumber(p.answer)).toBe(value);
  },

  "1-1|소인수분해|13": (p) => {
    const chain = p.content.match(/\\dfrac\{1\}\{([^}]+)\}/)![1]!;
    const parts = chain.split("\\times");
    // 같은 수만 곱해야 「$p^{x}$」로 묶인다 — 섞여 있으면 발문이 성립하지 않는다.
    expect(new Set(parts).size, chain).toBe(1);
    expect(Number(parts[0])).toBe(p.facts.p);
    expect(firstNumber(p.answer)).toBe(parts.length);
  },

  "1-1|소인수분해|14": (p) => {
    const m = p.content.match(/\$(\d+)\^\{x\}=(\d+)\$/);
    expect(m, p.content).not.toBeNull();
    const base = Number(m![1]);
    // 생성기는 «지수를 뽑아 값을 만들었다». 여기서는 **나눠 떨어뜨려** 되짚는다.
    let rest = Number(m![2]);
    let k = 0;
    while (rest % base === 0) {
      rest /= base;
      k += 1;
    }
    expect(rest, `${m![2]} 이 ${base} 의 거듭제곱이 아니다`).toBe(1);
    expect(firstNumber(p.answer)).toBe(k);
  },

  "1-1|소인수분해|15": (p) => {
    const m = p.content.match(
      /\$(\d+)\$ 이상 \$(\d+)\$ 이하의 자연수 중에서 소수를 모두 더한/,
    );
    expect(m, p.content).not.toBeNull();
    // 생성기는 소수 «집합»으로 골랐다. 여기서는 나눗셈으로 다시 판별해 더한다.
    let sum = 0;
    let count = 0;
    for (let v = Number(m![1]); v <= Number(m![2]); v += 1) {
      if (!isPrime(v)) continue;
      sum += v;
      count += 1;
    }
    expect(
      count,
      "범위에 소수가 셋은 있어야 «합»이 뜻이 있다",
    ).toBeGreaterThanOrEqual(3);
    expect(sum).toBe(p.facts.sum);
    expect(firstNumber(p.answer)).toBe(sum);
  },

  "1-1|소인수분해|16": (p) => {
    const m = p.content.match(
      /\$(\d+)\$ 이상 \$(\d+)\$ 이하의 자연수 중에서 가장 (큰|작은) 소수/,
    );
    expect(m, p.content).not.toBeNull();
    const primes: number[] = [];
    for (let v = Number(m![1]); v <= Number(m![2]); v += 1) {
      if (isPrime(v)) primes.push(v);
    }
    expect(
      primes.length,
      "범위에 소수가 셋은 있어야 «가장»이 뜻이 있다",
    ).toBeGreaterThanOrEqual(3);
    const want = m![3] === "큰" ? primes[primes.length - 1]! : primes[0]!;
    expect(firstNumber(p.answer)).toBe(want);
  },

  "1-1|소인수분해|17": (p) => {
    const vals = [...p.content.matchAll(/[abc]=(\d+)\^\{(\d+)\}/g)].map(
      (m) => Number(m[1]) ** Number(m[2]),
    );
    expect(vals, p.content).toHaveLength(3);
    expect(new Set(vals).size, "세 값이 서로 달라야 «가장»이 하나로 선다").toBe(
      3,
    );
    expect(firstNumber(p.answer)).toBe(Math.max(...vals) - Math.min(...vals));
  },

  "1-1|문자의 사용과 식의 계산|09": (p) => {
    const f = p.facts;
    const m = p.content.match(/다항식 \$(\d+)x\^\{2\}([+-]\d+)x([+-]\d+)\$/);
    expect(m, p.content).not.toBeNull();
    expect([m![1], m![2], m![3]].map(Number)).toEqual([f.a, f.b, f.c]);
    expect(f.a! + f.b! + f.c!).toBe(f.S);
    expect(firstNumber(p.answer)).toBe(f.S);
  },
  "1-1|문자의 사용과 식의 계산|10": (p) => {
    const f = p.facts;
    let cnt = 0;
    for (let i = 1; i <= 5; i += 1) {
      if (f[`p${i}`] === 0 && f[`q${i}`] !== 0) cnt += 1;
    }
    expect(cnt).toBe(f.count);
    expect(f.count!).toBeGreaterThanOrEqual(2);
    expect(f.count!).toBeLessThanOrEqual(3);
    expect(firstNumber(p.answer)).toBe(f.count);
  },
  "1-1|문자의 사용과 식의 계산|12": (p) => {
    const f = p.facts;
    let cnt = 0;
    for (let i = 1; i <= 5; i += 1) {
      if (f[`kd${i}`] === 0) cnt += 1;
    }
    expect(cnt).toBe(f.count);
    expect(p.content).toContain(`$${f.k}x$`);
    expect(firstNumber(p.answer)).toBe(f.count);
  },
  "1-1|문자의 사용과 식의 계산|13": (p) => {
    const f = p.facts;
    expect(Math.abs(f.op!)).toBe(1);
    expect(f.p).toBe(f.a! + f.op! * f.k! * f.c!);
    expect(f.q).toBe(f.b! + f.op! * f.k! * f.d!);
    expect(f.p).not.toBe(0);
    expect(firstNumber(p.answer)).toBe(f.p);
  },

  // ── 21~28 「일차식의 뜻Ⅰ」을 10유형으로 채운 몫 (갈래 D) ──
  // 검산은 **지면 글자에서** 계수를 다시 읽어서 한다 — `facts` 만 보면
  // 「식을 그리는 쪽」이 틀려도 초록이다(실제로 `1x` 가 그렇게 나갔다).

  "1-1|문자의 사용과 식의 계산|21": (p) => {
    const body = p.content.match(/다항식 \$([^$]+)\$의 항의 개수/)![1]!;
    const terms = body.match(/[+-]?[^+-]+/g)!.length;
    expect(terms, body).toBe(p.facts.terms);
    expect(firstNumber(p.answer)).toBe(terms);
  },

  "1-1|문자의 사용과 식의 계산|22": (p) => {
    const body = p.content.match(/다항식 \$([^$]+)\$의 차수/)![1]!;
    const exps = [...body.matchAll(/x(?:\^\{(\d+)\})?/g)].map((m) =>
      m[1] ? Number(m[1]) : 1,
    );
    expect(exps.length, `문자가 든 항이 없다: ${body}`).toBeGreaterThan(0);
    const degree = Math.max(...exps);
    expect(degree, body).toBe(p.facts.degree);
    expect(firstNumber(p.answer)).toBe(degree);
  },

  "1-1|문자의 사용과 식의 계산|23": (p) => {
    const body = p.content.match(/다항식 \$([^$]+)\$에서/)![1]!;
    expect(linearCoef(body), body).toBe(p.facts.b);
    expect(firstNumber(p.answer)).toBe(p.facts.b);
  },

  "1-1|문자의 사용과 식의 계산|24": (p) => {
    const body = p.content.match(/다항식 \$([^$]+)\$의 상수항/)![1]!;
    const tail = body.match(/([+-]\d+)$/);
    expect(tail, `상수항이 없다: ${body}`).not.toBeNull();
    expect(Number(tail![1])).toBe(p.facts.c);
    expect(firstNumber(p.answer)).toBe(p.facts.c);
  },

  "1-1|문자의 사용과 식의 계산|25": (p) => {
    const m = p.content.match(/\$x=(-?\d+)\$일 때, 일차식 \$([^$]+)\$의 값/);
    expect(m, p.content).not.toBeNull();
    const x = Number(m![1]);
    const lin = m![2]!;
    const a = linearCoef(lin);
    const tail = lin.match(/([+-]\d+)$/);
    expect(tail, `상수항이 없다: ${lin}`).not.toBeNull();
    const value = a * x + Number(tail![1]);
    expect(value, lin).toBe(p.facts.value);
    expect(firstNumber(p.answer)).toBe(value);
  },

  "1-1|문자의 사용과 식의 계산|26": (p) => {
    const m = p.content.match(
      /한 개에 \$(\d+)\$원인 공책 \$x\$개의 값과 포장비 \$(\d+)\$원.*\$x=(\d+)\$일 때/,
    );
    expect(m, p.content).not.toBeNull();
    const total = Number(m![1]) * Number(m![3]) + Number(m![2]);
    expect(total).toBe(p.facts.total);
    expect(firstNumber(p.answer)).toBe(total);
  },

  "1-1|문자의 사용과 식의 계산|27": (p) => {
    const body = p.content.match(/다항식 \$([^$]+)\$/)![1]!;
    expect(body.startsWith("kx^{2}"), body).toBe(true);
    // 「$k=0$ 이면 일차식」이 성립하려면 **일차항 계수가 0 이 아니어야** 한다.
    const a = linearCoef(body);
    expect(a, body).not.toBe(0);
    expect(a).toBe(p.facts.a);
    expect(firstNumber(p.answer)).toBe(0);
  },

  "1-1|문자의 사용과 식의 계산|28": (p) => {
    const m = p.content.match(/가로의 길이가 \$\(x\+(\d+)\).*\$x=(\d+)\$일 때/);
    expect(m, p.content).not.toBeNull();
    const add = Number(m![1]);
    const x = Number(m![2]);
    const perimeter = 2 * (x + add + x); // 둘레를 정의로 다시 잰다
    expect(perimeter).toBe(p.facts.perimeter);
    expect(firstNumber(p.answer)).toBe(perimeter);
  },

  "1-1|좌표와 그래프|03": (p) => {
    const f = p.facts;
    expect(f.by).toBe(f.cy);
    expect(doubleArea(f.ax!, f.ay!, f.bx!, f.by!, f.cx!, f.cy!)).toBe(
      2 * f.area!,
    );
    expect(p.content).toContain(`$\\mathrm{A}(${f.ax}, ${f.ay})$`);
    expect(p.content).toContain(`$\\mathrm{B}(${f.bx}, ${f.by})$`);
    expect(p.content).toContain(`$\\mathrm{C}(${f.cx}, ${f.cy})$`);
    expect(firstNumber(p.answer)).toBe(f.area);
  },
  "1-1|좌표와 그래프|04": (p) => {
    const f = p.facts;
    expect(quadrantOf(f.a!, f.b!)).toBe(f.q);
    expect(p.content).toContain(`$(${f.a}, ${f.b})$`);
    expect(firstNumber(p.answer)).toBe(f.q);
  },
  "1-1|좌표와 그래프|05": (p) => {
    const f = p.facts;
    expect(f.t!).toBeGreaterThanOrEqual(1);
    if (f.t! >= 5) expect([2, 4]).toContain(f.s);
    for (const [a, b] of QUAD_SAMPLES[f.s!]!) {
      expect(quadrantOf(a, b)).toBe(f.s);
      const [x, y] = applyTrans(f.t!, a, b);
      expect(quadrantOf(x, y), `표본 (${a}, ${b})`).toBe(f.q);
    }
    expect(firstNumber(p.answer)).toBe(f.q);
  },
  "1-1|좌표와 그래프|06": (p) => {
    const f = p.facts;
    if (f.t! >= 5) expect([2, 3]).toContain(f.c);
    for (const [a, b] of COND_SAMPLES[f.c!]!) {
      expect(COND_PRED[f.c!]!(a, b)).toBe(true);
      const [x, y] = applyTrans(f.t!, a, b);
      expect(quadrantOf(x, y), `표본 (${a}, ${b})`).toBe(f.q);
    }
    expect(firstNumber(p.answer)).toBe(f.q);
  },
  "1-1|좌표와 그래프|10": (p) => {
    const f = p.facts;
    const [ec, ed] =
      f.axis === 0
        ? [f.a!, -f.b!]
        : f.axis === 1
          ? [-f.a!, f.b!]
          : [-f.a!, -f.b!];
    expect([f.c, f.d]).toEqual([ec, ed]);
    const axisWord = f.axis === 0 ? "$x$축" : f.axis === 1 ? "$y$축" : "원점";
    expect(p.content).toContain(axisWord);
    expect(p.content).toContain(`$(${f.a}, ${f.b})$`);
    expect((p.answer.match(/-?\d+/g) ?? []).map(Number)).toEqual([f.c, f.d]);
  },
  "1-1|일차방정식의 풀이|05": (p) => {
    const f = p.facts;
    expect(f.S).toBe(f.p! + f.b!);
    expect(f.k! * f.b!).toBe(f.c);
    expect(Math.abs(f.k!)).toBeGreaterThanOrEqual(2);
    expect(firstNumber(p.answer)).toBe(f.S);
  },
  "1-2|다각형|07": (p) => {
    const f = p.facts;
    if (f.kind === 0) {
      expect(f.ans! * (f.r1! + f.r2! + f.r3!)).toBe(180 * f.r3!);
      expect(f.r1! < f.r2! && f.r2! < f.r3!).toBe(true);
    } else {
      expect(f.p! + f.q! + f.ans!).toBe(180);
    }
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|다각형|08": (p) => {
    const f = p.facts;
    expect(f.p! + f.ans!).toBe(f.e);
    expect(firstNumber(p.answer)).toBe(f.ans);
  },
  "1-2|대푯값|01": (p) => {
    const f = p.facts;
    const vals = factsValues(f, 5);
    expect(dataLineNumbers(p.content)).toEqual(vals);
    expect(vals.reduce((s, v) => s + v, 0)).toBe(5 * f.M!);
    expect(firstNumber(p.answer)).toBe(f.M);
  },
  "1-2|대푯값|02": (p) => {
    const f = p.facts;
    const vals = factsValues(f, f.n!);
    expect(dataLineNumbers(p.content)).toEqual(vals);
    expect(medianOf(vals)).toBe(f.med);
    expect(firstNumber(p.answer)).toBe(f.med);
  },
  "1-2|대푯값|03": (p) => {
    const f = p.facts;
    const vals = factsValues(f, f.n!);
    expect(dataLineNumbers(p.content)).toEqual(vals);
    expect(uniqueModeOf(vals)).toBe(f.mode);
    expect(firstNumber(p.answer)).toBe(f.mode);
  },
  "1-2|대푯값|04": (p) => {
    const f = p.facts;
    const vals = factsValues(f, f.n!);
    expect(dataLineNumbers(p.content)).toEqual(vals);
    expect(uniqueModeOf(vals)).toBe(f.mode);
    expect(p.answer).toContain("최빈값");
    expect(firstNumber(p.answer)).toBe(f.mode);
  },
  "1-2|대푯값|05": (p) => {
    const f = p.facts;
    expect(f.k1! + f.k2! + f.k3! + f.k4! + f.x!).toBe(5 * f.M!);
    expect(dataLineNumbers(p.content)).toEqual([f.k1, f.k2, f.k3, f.k4]);
    expect(firstNumber(p.answer)).toBe(f.x);
  },
  "1-2|대푯값|06": (p) => {
    const f = p.facts;
    expect(f.n! * f.m! + f.v!).toBe((f.n! + 1) * f.M!);
    expect(firstNumber(p.answer)).toBe(f.M);
  },
  "1-2|입체도형의 겉넓이와 부피|01": (p) => {
    const f = p.facts;
    expect(2 * (f.a! * f.b! + f.b! * f.c! + f.c! * f.a!)).toBe(f.S);
    expect(firstNumber(p.answer)).toBe(f.S);
  },
  "1-2|입체도형의 겉넓이와 부피|02": (p) => {
    const f = p.facts;
    expect(2 * f.r! * (f.r! + f.h!)).toBe(f.K);
    expect(firstNumber(p.answer)).toBe(f.K);
  },
  "1-2|입체도형의 겉넓이와 부피|03": (p) => {
    const f = p.facts;
    expect(f.a! * f.b! * f.h!).toBe(2 * f.V!);
    expect(firstNumber(p.answer)).toBe(f.V);
  },
  "1-2|입체도형의 겉넓이와 부피|04": (p) => {
    const f = p.facts;
    expect(f.r! * f.r! * f.h!).toBe(f.K);
    expect(firstNumber(p.answer)).toBe(f.K);
  },
  "1-2|원과 부채꼴|09": (p) => {
    const f = p.facts;
    expect(f.r! * f.r!).toBe(f.A);
    expect(2 * f.r!).toBe(f.C);
    expect(firstNumber(p.answer)).toBe(f.C);
  },
  "1-2|원과 부채꼴|10": (p) => {
    const f = p.facts;
    expect(f.L! * 180).toBe(f.r! * f.deg!);
    expect(f.S! * 360).toBe(f.r! * f.r! * f.deg!);
    const ms = [...p.answer.matchAll(/\$(\d+)\\pi/g)].map((m) => Number(m[1]));
    expect(ms).toEqual([f.L, f.S]);
  },
  "1-2|위치 관계|06": (p) => {
    const f = p.facts;
    const verts = cuboidVerts(2, 3, 5);
    const faceT = p.content.match(/면 \$\\mathrm\{([A-H]{4})\}\$[에와]/);
    const edgeT = p.content.match(/모서리 \$\\mathrm\{([A-H]{2})\}\$[를와]/);
    let expected: number;
    if (faceT) {
      const face = faceT[1]!;
      const rel: EdgeFaceRel = p.content.includes("에 포함된 모서리")
        ? "contained"
        : p.content.includes("와 평행한 모서리")
          ? "parallel"
          : "perp";
      expect(p.content).toContain("모서리의 개수");
      expected = EDGES12.filter(
        (e) => edgeFaceRel(verts, e, face) === rel,
      ).length;
    } else {
      expect(edgeT, p.content).not.toBeNull();
      const edge = edgeT![1]!;
      const rel: EdgeFaceRel = p.content.includes("를 포함하는 면")
        ? "contained"
        : p.content.includes("와 평행한 면")
          ? "parallel"
          : "perp";
      expect(p.content).toContain("면의 개수");
      expected = FACES6.filter(
        (fc) => edgeFaceRel(verts, edge, fc) === rel,
      ).length;
    }
    expect(expected).toBe(f.count);
    expect(firstNumber(p.answer)).toBe(f.count);
  },
  "1-2|위치 관계|07": (p) => {
    const f = p.facts;
    const a = Number(p.content.match(/\\mathrm\{AB\}=(\d+)/)![1]);
    const b = Number(p.content.match(/\\mathrm\{AD\}=(\d+)/)![1]);
    const c = Number(p.content.match(/\\mathrm\{AE\}=(\d+)/)![1]);
    expect([a, b, c]).toEqual([f.a, f.b, f.c]);
    const P = p.content.match(/점 \$\\mathrm\{([A-H])\}\$/)![1]!;
    const F = p.content.match(/면 \$\\mathrm\{([A-H]{4})\}\$/)![1]!;
    expect(F.includes(P)).toBe(false);
    const verts = cuboidVerts(a, b, c);
    expect(pointToPlane(verts, F, verts[P]!)).toBeCloseTo(f.dist!, 9);
    expect(firstNumber(p.answer)).toBe(f.dist);
  },
  "1-2|위치 관계|08": (p) => {
    const f = p.facts;
    const F = p.content.match(/면 \$\\mathrm\{([A-H]{4})\}\$와/)![1]!;
    const rel = p.content.includes("평행한 면") ? "parallel" : "perp";
    const verts = cuboidVerts(2, 3, 5);
    const expected = FACES6.filter(
      (o) => o !== F && faceFaceRel(verts, o, F) === rel,
    ).length;
    expect(expected).toBe(f.count);
    expect(firstNumber(p.answer)).toBe(f.count);
  },
};

// ── 명부·색인·등록 ──────────────────────────────────────────

describe("중1 저조 단원 45유형 (m1Extra)", () => {
  it("45유형 명부와 unitSection 이 실측 그대로다", () => {
    expect(new Set(M1EXTRA_TYPES.map((e) => e.key))).toEqual(
      new Set(Object.keys(EXPECTED_SECTION)),
    );
    expect(M1EXTRA_TYPES.length).toBe(45);
    for (const e of M1EXTRA_TYPES) {
      expect(e.unitSection, e.key).toBe(EXPECTED_SECTION[e.key]);
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.grade).toBe("중1");
    }
  });

  // 색인 대조는 `middleTypeCoverage.test.ts` **한 곳**이 전량으로 한다
  // (색인 안 번호는 제목까지, 색인 밖 번호는 그 중단원 색인 최댓값 뒤인지).
  // 여기 다시 적으면 규칙이 여러 벌이 되어 한쪽만 고쳐도 아무도 모른다.

  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of M1EXTRA_TYPES) {
      expect(keys.has(e.key), e.key).toBe(true);
    }
  });

  for (const e of M1EXTRA_TYPES) {
    describe(`${e.key} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치·구조를 재계산한다", () => {
        const check = CHECKS[e.key];
        expect(check, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          check!(p);
        }
      });

      it("변형 20개도 전부 검산을 통과한다", () => {
        // 고정 씨앗 5개가 못 건드리는 가지(변환·kind)를 변형이 넓게 밟는다.
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

      it("실제 렌더러가 붉은 글자·raw 폴백 없이 그린다", () => {
        // KaTeX 는 unknown command 를 에러가 아니라 #cc0000 으로 그린다
        // (CLAUDE.md 2026-08-14) — 그래서 성공 여부는 실제 렌더로만 잰다.
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
    for (const e of M1EXTRA_TYPES) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
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
    expect(seen("1-1|소인수분해|02", "kind", 40)).toEqual(new Set([0, 1]));
    expect(seen("1-1|좌표와 그래프|05", "t", 120)).toEqual(
      new Set([1, 2, 3, 4, 5, 6]),
    );
    expect(seen("1-1|좌표와 그래프|06", "t", 120)).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6]),
    );
    expect(seen("1-1|좌표와 그래프|06", "c", 120)).toEqual(
      new Set([0, 1, 2, 3]),
    );
    expect(seen("1-1|좌표와 그래프|10", "axis", 60)).toEqual(
      new Set([0, 1, 2]),
    );
    expect(seen("1-2|다각형|07", "kind", 40)).toEqual(new Set([0, 1]));
    expect(seen("1-2|대푯값|02", "n", 60)).toEqual(new Set([5, 6, 7]));
    expect(seen("1-2|위치 관계|06", "kind", 120)).toEqual(
      new Set([0, 1, 2, 3, 4, 5]),
    );
    expect(seen("1-2|위치 관계|08", "kind", 40)).toEqual(new Set([0, 1]));
  });
});
