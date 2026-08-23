/**
 * 중2 「유리수와 순환소수 20 + 경우의 수 15 + 확률 13」 48유형 — 독립 검산.
 * (세션 2A-중2수확률 — docs/planning/tracks/middle-engine-wave2-plan.md §1)
 *
 * 생성기의 답을 그대로 믿지 않는다. 검산은 생성기와 **다른 방법**으로 한다:
 *  - 유한소수 판정: 생성기는 소인수 벗기기, 여기서는 **10^k 곱 정수화(BigInt)**
 *  - 순환소수 전개: 생성기는 닫힌 식(분수↔자릿수), 여기서는 **반대 방향**으로
 *    (분수를 받았으면 전개해 자릿수 대조, 자릿수를 받았으면 분수로 되돌려 대조)
 *  - 경우의 수·확률: 생성기는 공식, 여기서는 **표본공간 전수 나열**
 *    (순열 나열·격자 경로 나열·동전 삼중 루프·게임 6^4 모의)
 *  - 지식 명제(유리수와 소수의 관계): 이 파일의 **자체 진리표**로 본문을 대조
 *
 * RPM 유형 번호·제목은 `scripts/rpm/rpm-type-catalog.json`(색인 정본)과 대조하고,
 * 순환소수 `\overline` 표기는 **실제 렌더러**로 그려 repeat-dot(점 표기)과
 * 붉은 글자(#cc0000)·raw 폴백 부재를 확인한다 (CLAUDE.md 2026-08-14 교훈).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M2_COUNTING } from "../../lib/middle/m2Counting";
import { M2_PROB } from "../../lib/middle/m2Prob";
import { M2_RATIONAL } from "../../lib/middle/m2Rational";
import type { MidProblem } from "../../lib/middle/types";
import { renderMathHtml } from "../../lib/math/renderMathHtml";

/** tsconfig target 이 ES2017 이라 BigInt 리터럴(10n)을 못 쓴다 — 호출로 만든다. */
const BIG10 = BigInt(10);

const SEEDS = [20260823, 1, 7777, 424242, 99991];
const ALL = [...M2_RATIONAL, ...M2_COUNTING, ...M2_PROB];

// ── 검산 소품 (생성기와 다른 방법) ─────────────────────

function gcdT(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** n/d 가 유한소수인가 — n·10^40 이 d 로 나누어떨어지는지 (BigInt). */
function terminates(n: number, d: number): boolean {
  return (BigInt(n) * BIG10 ** BigInt(40)) % BigInt(d) === BigInt(0);
}

/** facts 의 접두사 인코딩(길이+값)에서 자릿수 문자열을 되살린다. */
function digitsOf(
  f: Record<string, number>,
  prefix: string,
): { int: number; pre: string; cyc: string } {
  const preLen = f[`${prefix}PreLen`]!;
  const cycLen = f[`${prefix}CycLen`]!;
  return {
    int: f[`${prefix}Int`]!,
    pre:
      preLen === 0 ? "" : String(f[`${prefix}PreVal`]!).padStart(preLen, "0"),
    cyc: String(f[`${prefix}CycVal`]!).padStart(cycLen, "0"),
  };
}

/** 자릿수 → 분수 (검산 쪽 닫힌 식 — 정의에서 곧바로). BigInt 로 정확히. */
function fracOfDigits(r: { int: number; pre: string; cyc: string }): {
  n: number;
  d: number;
} {
  const k = r.pre.length;
  const m = r.cyc.length;
  const den = Number(BIG10 ** BigInt(k) * (BIG10 ** BigInt(m) - BigInt(1)));
  const whole =
    Number(`${r.pre}${r.cyc}` || "0") - Number(r.pre === "" ? "0" : r.pre);
  const num = r.int * den + whole;
  const g = gcdT(num, den);
  return { n: num / g, d: den / g };
}

/** 분수 → (int, 소수점 아래 len 자리) — BigInt 나눗셈으로 통째 추출. */
function decimalDigits(
  n: number,
  d: number,
  len: number,
): {
  int: number;
  digits: string;
} {
  const int = Math.floor(n / d);
  const rem = BigInt(n - int * d);
  const scaled = (rem * BIG10 ** BigInt(len)) / BigInt(d);
  return { int, digits: scaled.toString().padStart(len, "0") };
}

/** pre + cyc 반복을 len 자리까지 펼친다. */
function laidDigits(pre: string, cyc: string, len: number): string {
  let s = pre;
  while (s.length < len) s += cyc;
  return s.slice(0, len);
}

/** 순환마디가 더 짧은 되풀이가 아닌가 (검산 쪽 구현). */
function primitive(c: string): boolean {
  for (let L = 1; L < c.length; L += 1) {
    if (c.length % L === 0 && c === c.slice(0, L).repeat(c.length / L)) {
      return false;
    }
  }
  return true;
}

function canonical(r: { int: number; pre: string; cyc: string }): boolean {
  return (
    r.cyc.length > 0 &&
    primitive(r.cyc) &&
    !/^0+$/.test(r.cyc) &&
    !/^9+$/.test(r.cyc) &&
    (r.pre.length === 0 || r.pre[r.pre.length - 1] !== r.cyc[r.cyc.length - 1])
  );
}

/** 분수를 나눗셈해 정규 순환 표현으로 (나머지 재등장 — 검산 쪽 구현). */
function expandRep(
  n: number,
  d: number,
): {
  int: number;
  pre: string;
  cyc: string;
} {
  const int = Math.floor(n / d);
  let r = n % d;
  const seen = new Map<number, number>();
  let digits = "";
  while (r !== 0 && !seen.has(r)) {
    seen.set(r, digits.length);
    r *= 10;
    digits += String(Math.floor(r / d));
    r %= d;
  }
  expect(r, `${n}/${d} 는 유한소수`).not.toBe(0);
  const k = seen.get(r)!;
  return { int, pre: digits.slice(0, k), cyc: digits.slice(k) };
}

const LETTERS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"] as const;

function lettersOf(mask: number, count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    if (mask & (1 << i)) out.push(LETTERS[i]!);
  }
  return out.join(", ");
}

function texOf(r: { int: number; pre: string; cyc: string }): string {
  return `${r.int}.${r.pre}\\overline{${r.cyc}}`;
}

/** 답 `$\dfrac{q}{p}$` / `$n$` 파서 — 기약 분수 검사까지. */
function parseFrac(ans: string): { n: number; d: number } {
  const frac = ans.match(/^\$\\dfrac\{(\d+)\}\{(\d+)\}\$$/);
  if (frac) {
    const n = Number(frac[1]);
    const d = Number(frac[2]);
    expect(gcdT(n, d), `기약이 아님: ${ans}`).toBe(1);
    return { n, d };
  }
  const whole = ans.match(/^\$(\d+)\$$/);
  expect(whole, `답 형식이 아님: ${ans}`).not.toBeNull();
  return { n: Number(whole![1]), d: 1 };
}

// ── 나열 소품 ─────────────────────────────────────────

/** 0..n-1 의 모든 순열에 대해 pred 를 세어 돌려준다. */
function countPerms(n: number, pred: (arr: number[]) => boolean): number {
  const used = new Array<boolean>(n).fill(false);
  const arr: number[] = [];
  let cnt = 0;
  const rec = (): void => {
    if (arr.length === n) {
      if (pred(arr)) cnt += 1;
      return;
    }
    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      arr.push(i);
      rec();
      arr.pop();
      used[i] = false;
    }
  };
  rec();
  return cnt;
}

/** pool 에서 서로 다른 r개를 뽑아 늘어놓는 모든 순서열을 센다. */
function countTuples(
  pool: readonly number[],
  r: number,
  pred: (arr: number[]) => boolean,
): number {
  const used = new Array<boolean>(pool.length).fill(false);
  const arr: number[] = [];
  let cnt = 0;
  const rec = (): void => {
    if (arr.length === r) {
      if (pred(arr)) cnt += 1;
      return;
    }
    for (let i = 0; i < pool.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      arr.push(pool[i]!);
      rec();
      arr.pop();
      used[i] = false;
    }
  };
  rec();
  return cnt;
}

/** 0..n-1 에서 크기 r 부분집합을 센다. */
function countSubsets(
  n: number,
  r: number,
  pred: (set: number[]) => boolean,
): number {
  const arr: number[] = [];
  let cnt = 0;
  const rec = (start: number): void => {
    if (arr.length === r) {
      if (pred(arr)) cnt += 1;
      return;
    }
    for (let i = start; i < n; i += 1) {
      arr.push(i);
      rec(i + 1);
      arr.pop();
    }
  };
  rec(0);
  return cnt;
}

/** (0,0)→(m,n) 오른쪽/위 최단 경로 전량 나열 — via 를 지나는 것만 세기도. */
function countPaths(
  m: number,
  n: number,
  via: { px: number; py: number } | null,
): number {
  let cnt = 0;
  const walk = (x: number, y: number, hit: boolean): void => {
    const nowHit = hit || (via !== null && x === via.px && y === via.py);
    if (x === m && y === n) {
      if (via === null || nowHit) cnt += 1;
      return;
    }
    if (x < m) walk(x + 1, y, nowHit);
    if (y < n) walk(x, y + 1, nowHit);
  };
  walk(0, 0, false);
  return cnt;
}

/** 유형 18 — 이 파일의 자체 진리표 (모듈과 별도로 적었다 — 이중 기입). */
const FACT_TRUTHS: Record<string, boolean> = {
  "모든 유한소수는 유리수이다.": true,
  "모든 순환소수는 유리수이다.": true,
  "모든 순환소수는 무한소수이다.": true,
  "모든 무한소수는 순환소수이다.": false,
  "모든 무한소수는 유리수가 아니다.": false,
  "순환소수 중에는 유리수가 아닌 것도 있다.": false,
  "유한소수로 나타낼 수 없는 기약분수는 순환소수로 나타낼 수 있다.": true,
  "정수가 아닌 유리수는 유한소수 또는 순환소수로 나타낼 수 있다.": true,
  "무한소수 중에는 순환소수가 아닌 것도 있다.": true,
  "기약분수의 분모가 $2$나 $5$ 이외의 소인수를 가지면 유한소수로 나타낼 수 없다.": true,
};

/** 유형 12(확률) — 주사위 조건 뜻을 여기서도 따로 적는다 (cond 색인별). */
const DICE_PREDS: readonly ((x: number) => boolean)[] = [
  (x) => x % 3 === 0,
  (x) => x % 2 === 0,
  (x) => x >= 5,
  (x) => x <= 3,
  (x) => 6 % x === 0,
];

// ── 유형별 검산 — 키는 전체 유형 키 ─────────────────────

type Check = (p: MidProblem) => void;

const R = "2-1|유리수와 순환소수";
const C = "2-2|경우의 수";
const P = "2-2|확률";

const CHECKS: Record<string, Check> = {
  // ── 유리수와 순환소수 ─────────────────────────────
  [`${R}|01`]: (p) => {
    const f = p.facts;
    let mask = 0;
    for (let i = 0; i < 5; i += 1) {
      const n = f[`n${i + 1}`]!;
      const d = f[`d${i + 1}`]!;
      expect(p.content).toContain(`${LETTERS[i]}. $\\dfrac{${n}}{${d}}$`);
      if (terminates(n, d)) mask |= 1 << i;
    }
    expect(mask).toBe(f.mask);
    expect(mask).toBeGreaterThan(0);
    expect(p.answer).toBe(lettersOf(mask, 5));
  },
  [`${R}|02`]: (p) => {
    const r = digitsOf(p.facts, "r");
    expect(canonical(r)).toBe(true);
    expect(p.content).toContain(
      `$${r.int}.${r.pre}${r.cyc}${r.cyc}${r.cyc}\\cdots$`,
    );
    expect(p.answer).toBe(`$${texOf(r)}$`);
  },
  [`${R}|03`]: (p) => {
    const f = p.facts;
    const r = digitsOf(f, "r");
    expect(gcdT(f.n!, f.d!)).toBe(1);
    expect(expandRep(f.n!, f.d!)).toEqual({
      int: r.int,
      pre: r.pre,
      cyc: r.cyc,
    });
    expect(p.answer).toBe(`$${texOf(r)}$`);
    expect(p.content).toContain(`\\dfrac{${f.n}}{${f.d}}`);
  },
  [`${R}|04`]: (p) => {
    const f = p.facts;
    // 소수점 아래 N번째 자리 — BigInt 로 곧바로 추출 (생성기의 색인 산술과 다름)
    const digit = Number(
      ((BigInt(f.n!) * BIG10 ** BigInt(f.N!)) / BigInt(f.d!)) % BigInt(10),
    );
    expect(digit).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
    expect(p.content).toContain(`$${f.N}$번째`);
  },
  [`${R}|05`]: (p) => {
    const f = p.facts;
    const isPow10 = (v: number): boolean => {
      let x = v;
      while (x % 10 === 0) x /= 10;
      return x === 1;
    };
    expect(isPow10(f.b! * f.mult!)).toBe(true);
    for (let t = 1; t < f.mult!; t += 1) {
      expect(isPow10(f.b! * t), `${t} 가 더 작다`).toBe(false);
    }
    expect(gcdT(f.a!, f.b!)).toBe(1);
    expect(p.answer).toBe(`$${f.mult}$`);
  },
  [`${R}|06`]: (p) => {
    const f = p.facts;
    let mask = 0;
    for (let i = 0; i < 5; i += 1) {
      const n = f[`n${i + 1}`]!;
      const d = f[`d${i + 1}`]!;
      expect(p.content).toContain(`${LETTERS[i]}. $\\dfrac{${n}}{${d}}$`);
      expect(gcdT(n, d), "기약 아님을 보여야 하는 유형").toBeGreaterThan(1);
      if (terminates(n, d)) mask |= 1 << i;
    }
    expect(mask).toBe(f.mask);
    expect(p.answer).toBe(lettersOf(mask, 5));
  },
  [`${R}|07`]: (p) => {
    const f = p.facts;
    let first = 0;
    for (let x = 1; x <= f.m!; x += 1) {
      if (terminates(f.n! * x, f.d!)) {
        first = x;
        break;
      }
    }
    expect(first).toBe(f.m);
    expect(p.answer).toBe(`$${f.m}$`);
  },
  [`${R}|08`]: (p) => {
    const f = p.facts;
    let first = 0;
    for (let A = 1; A <= f.L!; A += 1) {
      if (terminates(f.n1! * A, f.d1!) && terminates(f.n2! * A, f.d2!)) {
        first = A;
        break;
      }
    }
    expect(first).toBe(f.L);
    expect(p.answer).toBe(`$${f.L}$`);
  },
  [`${R}|09`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    for (let a = 10; a <= 99; a += 1) {
      if (terminates(a, f.d!)) cnt += 1;
    }
    expect(cnt).toBe(f.cnt);
    expect(cnt).toBeGreaterThan(0);
    expect(p.answer).toBe(`$${f.cnt}$`);
  },
  [`${R}|10`]: (p) => {
    const f = p.facts;
    expect(f.m! * f.k!).toBe(f.d);
    const g = gcdT(f.m!, f.d!);
    expect(f.m! / g).toBe(1);
    expect(f.d! / g).toBe(f.k);
    expect(terminates(1, f.k!)).toBe(true);
    expect(p.answer).toBe(`$${f.m}$`);
  },
  [`${R}|11`]: (p) => {
    const f = p.facts;
    const base = Math.pow(2, f.a!);
    for (let x = 1; x < f.ans!; x += 1) {
      expect(terminates(f.n!, base * x), `x=${x} 가 이미 순환`).toBe(true);
    }
    expect(terminates(f.n!, base * f.ans!)).toBe(false);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${R}|12`]: (p) => {
    const f = p.facts;
    const r = digitsOf(f, "r");
    expect(f.big).toBe(Math.pow(10, r.pre.length + r.cyc.length));
    expect(f.small).toBe(Math.pow(10, r.pre.length));
    // (big−small)·x 를 분수 정의로 정확히 — 정수여야 하고 그 값이 답이다.
    const { n, d } = fracOfDigits(r);
    const prod = BigInt(f.big! - f.small!) * BigInt(n);
    expect(prod % BigInt(d)).toBe(BigInt(0));
    expect(Number(prod / BigInt(d))).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${R}|13`]: (p) => {
    const f = p.facts;
    const r = digitsOf(f, "r");
    expect(gcdT(f.num!, f.den!)).toBe(1);
    expect(expandRep(f.num!, f.den!)).toEqual({
      int: r.int,
      pre: r.pre,
      cyc: r.cyc,
    });
    expect(p.answer).toBe(`$${f.num! + f.den!}$`);
  },
  [`${R}|14`]: (p) => {
    const f = p.facts;
    const r = digitsOf(f, "r");
    expect(fracOfDigits(r)).toEqual({ n: f.num, d: f.den });
    let first = 0;
    for (let a = 1; a <= f.m!; a += 1) {
      if (terminates(f.num! * a, f.den!)) {
        first = a;
        break;
      }
    }
    expect(first).toBe(f.m);
    expect(p.answer).toBe(`$${f.m}$`);
  },
  [`${R}|15`]: (p) => {
    const f = p.facts;
    const rx = digitsOf(f, "rx");
    const ry = digitsOf(f, "ry");
    const r0 = digitsOf(f, "r0");
    // 분모를 잘못 본 쪽 → 분자가 살아 있다 · 분자를 잘못 본 쪽 → 분모가 살아 있다
    const fx = fracOfDigits(rx);
    expect(fx.n).toBe(f.b);
    expect(fx.d).toBe(f.a1);
    const fy = fracOfDigits(ry);
    expect(fy.d).toBe(f.a);
    expect(fy.n).toBe(f.b2);
    expect(gcdT(f.b!, f.a!)).toBe(1);
    expect(expandRep(f.b!, f.a!)).toEqual({
      int: r0.int,
      pre: r0.pre,
      cyc: r0.cyc,
    });
    expect(p.answer).toBe(`$${texOf(r0)}$`);
  },
  [`${R}|16`]: (p) => {
    const f = p.facts;
    const x = fracOfDigits(digitsOf(f, "x"));
    const y = fracOfDigits(digitsOf(f, "y"));
    const num0 = f.op === 0 ? x.n * y.d + y.n * x.d : x.n * y.d - y.n * x.d;
    const den0 = x.d * y.d;
    expect(num0).toBeGreaterThan(0);
    const g = gcdT(num0, den0);
    expect(num0 / g).toBe(f.num);
    expect(den0 / g).toBe(f.den);
    expect(f.den).toBeGreaterThan(1);
    expect(p.answer).toBe(`$${f.num! + f.den!}$`);
  },
  [`${R}|17`]: (p) => {
    const f = p.facts;
    const LEN = 40;
    let mask = 0;
    for (let i = 1; i <= 4; i += 1) {
      const kind = f[`s${i}Kind`]!;
      let intL = 0;
      let intRt = 0;
      let dl = "";
      let dr = "";
      if (kind === 0) {
        const cyc = String(f[`s${i}Cyc`]!).padStart(f[`s${i}CycLen`]!, "0");
        dl = laidDigits(cyc, "0", LEN); // 유한 절단: 뒤는 0
        dr = laidDigits("", cyc, LEN);
      } else if (kind === 1) {
        const A = String(f[`s${i}A`]!);
        const B = String(f[`s${i}B`]!);
        dl = laidDigits(A, B, LEN);
        dr = laidDigits("", `${A}${B}`, LEN);
      } else {
        const pre =
          f[`s${i}PreLen`]! === 0
            ? ""
            : String(f[`s${i}PreVal`]!).padStart(f[`s${i}PreLen`]!, "0");
        intL = f[`s${i}Int`]!;
        dl = laidDigits(pre, String(f[`s${i}CycVal`]!), LEN);
        const dec = decimalDigits(f[`s${i}FracN`]!, f[`s${i}FracD`]!, LEN);
        intRt = dec.int;
        dr = dec.digits;
      }
      // 정수부 → 소수 자릿수 사전순 (40자리면 이 소재에서 충분히 갈린다)
      const lt = intL < intRt || (intL === intRt && dl < dr);
      const truth = f[`s${i}Shown`] === 0 ? lt : !lt && dl !== dr;
      if (truth) mask |= 1 << (i - 1);
    }
    expect(mask).toBe(f.mask);
    const cnt = [0, 1, 2, 3].filter((i) => mask & (1 << i)).length;
    expect(cnt).toBeGreaterThan(0);
    expect(cnt).toBeLessThan(4);
    expect(p.answer).toBe(lettersOf(mask, 4));
  },
  [`${R}|18`]: (p) => {
    const lines = p.content.split("\n").slice(1);
    expect(lines.length).toBe(4);
    let mask = 0;
    lines.forEach((line, i) => {
      const text = line.replace(`${LETTERS[i]}. `, "");
      const truth = FACT_TRUTHS[text];
      expect(truth, `진리표에 없는 명제: ${text}`).toBeDefined();
      if (truth) mask |= 1 << i;
    });
    expect(mask).toBe(p.facts.mask);
    expect(p.answer).toBe(lettersOf(mask, 4));
  },
  [`${R}|19`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    for (let x = 1; x <= f.D!; x += 1) {
      if (
        f.a! * f.D! < x * f.A! &&
        x * f.B! < f.b! * f.D! &&
        terminates(x, f.D!)
      ) {
        cnt += 1;
      }
    }
    expect(cnt).toBe(f.cnt);
    expect(cnt).toBeGreaterThan(0);
    expect(gcdT(f.a!, f.A!)).toBe(1);
    expect(gcdT(f.b!, f.B!)).toBe(1);
    expect(p.answer).toBe(`$${f.cnt}$`);
  },
  [`${R}|20`]: (p) => {
    const f = p.facts;
    expect(f.A).not.toBe(f.B);
    expect(f.A! + f.B!).not.toBe(9);
    const x = fracOfDigits({ int: 0, pre: "", cyc: `${f.A}${f.B}` });
    const y = fracOfDigits({ int: 0, pre: "", cyc: `${f.B}${f.A}` });
    const num0 = x.n * y.d + y.n * x.d;
    const den0 = x.d * y.d;
    const g = gcdT(num0, den0);
    expect(num0 / g).toBe(f.num);
    expect(den0 / g).toBe(f.den);
    expect(p.answer).toBe(`$${f.num! + f.den!}$`);
  },

  // ── 경우의 수 ─────────────────────────────────────
  [`${C}|01`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    if (f.kind === 0) {
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1) if (a + b === f.S) cnt += 1;
    } else if (f.kind === 1) {
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1) if (Math.abs(a - b) === f.D) cnt += 1;
    } else {
      for (let v = 1; v <= f.N!; v += 1) if (v % f.k! === 0) cnt += 1;
    }
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|02`]: (p) => {
    const f = p.facts;
    const lo = f.minOne === 1 ? 1 : 0;
    let ways = 0;
    for (let i = f.useBig === 1 ? lo : 0; i <= f.c500!; i += 1) {
      for (let j = lo; j <= f.c100!; j += 1) {
        for (let k = lo; k <= f.c50!; k += 1) {
          if (500 * i + 100 * j + 50 * k === f.M) ways += 1;
        }
      }
    }
    expect(ways).toBe(f.ways);
    expect(ways).toBeGreaterThanOrEqual(2);
    expect(p.answer).toBe(`$${f.ways}$`);
  },
  [`${C}|03`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    if (f.kind === 0) {
      // 합집합을 그대로 센다 — 두 사건이 겹치면(분리가 깨지면) 여기서 갈린다
      for (let v = 1; v <= f.N!; v += 1) {
        if (v % f.a! === 0 || v % f.b! === 0) cnt += 1;
      }
    } else {
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1)
          if (a + b === f.S1 || a + b === f.S2) cnt += 1;
    }
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|04`]: (p) => {
    const f = p.facts;
    expect(f.m! + f.n!).toBe(f.ans);
    expect(f.m).toBeGreaterThanOrEqual(2);
    expect(f.n).toBeGreaterThanOrEqual(2);
    expect(f.m).not.toBe(f.n);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|05`]: (p) => {
    const f = p.facts;
    const want = f.legs === 2 ? f.m! * f.n! : f.m! * f.n! * f.k!;
    expect(want).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|06`]: (p) => {
    const f = p.facts;
    const want = f.kind === 0 ? f.m! * f.n! : f.m! * f.n! * f.k!;
    expect(want).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|07`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    if (f.kind === 0) {
      // 동전 c개·주사위 d개 — 결과열을 실제로 나열해 센다
      const total = (slots: number[]): number => {
        if (slots.length === 0) return 1;
        return slots[0]! * total(slots.slice(1));
      };
      cnt = total([
        ...Array.from({ length: f.c! }, () => 2),
        ...Array.from({ length: f.d! }, () => 6),
      ]);
    } else {
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1)
          if (a % f.p! === 0 && f.q! % b === 0) cnt += 1;
    }
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|08`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    if (f.kind === 0) {
      cnt = countPerms(f.n!, () => true);
    } else if (f.kind === 1) {
      cnt = countPerms(f.n!, (arr) => arr[f.k! - 1] === 0);
    } else {
      cnt = countTuples(
        Array.from({ length: f.n! }, (_v, i) => i),
        f.r!,
        () => true,
      );
    }
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|09`]: (p) => {
    const f = p.facts;
    const cnt = countPerms(f.n!, (arr) => {
      const pos = arr
        .map((v, i) => ({ v, i }))
        .filter((x) => x.v < f.g!)
        .map((x) => x.i)
        .sort((a, b) => a - b);
      return pos[pos.length - 1]! - pos[0]! === f.g! - 1;
    });
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|10`]: (p) => {
    const f = p.facts;
    const pool = Array.from({ length: f.k! }, (_v, i) => i + 1);
    const cnt = countTuples(pool, f.r!, (arr) => {
      const last = arr[arr.length - 1]!;
      if (f.kind === 1) return last % 2 === 1;
      if (f.kind === 2) return last % 2 === 0;
      return true;
    });
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|11`]: (p) => {
    const f = p.facts;
    const pool = Array.from({ length: f.k! + 1 }, (_v, i) => i);
    const cnt = countTuples(pool, f.r!, (arr) => {
      if (arr[0] === 0) return false;
      if (f.kind === 1) {
        const last = arr[arr.length - 1]!;
        return last === 0 || last === 5;
      }
      return true;
    });
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|12`]: (p) => {
    const f = p.facts;
    const cnt = countTuples(
      Array.from({ length: f.n! }, (_v, i) => i),
      f.r!,
      () => true,
    );
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|13`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    if (f.kind === 0) {
      cnt = countSubsets(f.n!, f.r!, () => true);
    } else if (f.kind === 1) {
      cnt = countSubsets(f.n!, 2, () => true);
    } else {
      for (let leader = 0; leader < f.n!; leader += 1) {
        cnt += countSubsets(f.n!, 2, (set) => !set.includes(leader));
      }
    }
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|14`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    if (f.kind === 0) {
      cnt = countSubsets(f.n!, 2, () => true);
    } else if (f.kind === 1) {
      cnt = countSubsets(f.n!, 3, () => true);
    } else {
      // 두 평행선 위 점 — 좌표를 깔고 한 직선 위 세 점(일직선)을 뺀다
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < f.p!; i += 1) pts.push({ x: i, y: 0 });
      for (let i = 0; i < f.q!; i += 1) pts.push({ x: i, y: 1 });
      cnt = countSubsets(pts.length, 3, (set) => {
        const ys = new Set(set.map((i) => pts[i]!.y));
        return ys.size === 2;
      });
    }
    expect(cnt).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
  },
  [`${C}|16`]: (p) => {
    const f = p.facts;
    const via = f.via === 1 ? { px: f.px!, py: f.py! } : null;
    expect(countPaths(f.m!, f.n!, via)).toBe(f.ans);
    expect(p.answer).toBe(`$${f.ans}$`);
    expect(p.content).toContain(`가로 $${f.m}$칸, 세로 $${f.n}$칸`);
    // 그림 스펙이 발문과 같은 격자를 그린다 (그림 따로 발문 따로 금지)
    const spec = p.figureSpec as {
      version: number;
      points: Record<string, [number, number]>;
      segments: Record<string, [string, string]>;
      labels: Record<string, string>;
    };
    expect(spec.version).toBe(2);
    expect(Object.keys(spec.points).length).toBe((f.m! + 1) * (f.n! + 1));
    const hs = Object.keys(spec.segments).filter((k) => k.startsWith("h"));
    const vs = Object.keys(spec.segments).filter((k) => k.startsWith("v"));
    expect(hs.length).toBe(f.n! + 1);
    expect(vs.length).toBe(f.m! + 1);
    expect(spec.labels.P00).toBe("A");
    expect(spec.labels[`P${f.m}${f.n}`]).toBe("B");
    if (via) {
      expect(spec.labels[`P${via.px}${via.py}`]).toBe("P");
    } else {
      expect(Object.values(spec.labels)).not.toContain("P");
    }
    // 왼쪽 아래가 A — SVG y 는 아래로 자라므로 P00 의 y 가 가장 크다
    const y00 = spec.points.P00![1];
    for (const [, [, y]] of Object.entries(spec.points)) {
      expect(y00).toBeGreaterThanOrEqual(y);
    }
  },

  // ── 확률 ─────────────────────────────────────────
  [`${P}|01`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    for (let a = 1; a <= 6; a += 1) {
      for (let b = 1; b <= 6; b += 1) {
        if (f.kind === 0 ? a + b === f.S : Math.abs(a - b) === f.D) cnt += 1;
      }
    }
    const g = gcdT(cnt, 36);
    expect({ n: cnt / g, d: 36 / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|02`]: (p) => {
    const f = p.facts;
    let cnt = 0;
    for (let a = 1; a <= 6; a += 1)
      for (let b = 1; b <= 6; b += 1) if (f.c! * a - b === f.k) cnt += 1;
    expect(cnt).toBeGreaterThan(0);
    const g = gcdT(cnt, 36);
    expect({ n: cnt / g, d: 36 / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|03`]: (p) => {
    const f = p.facts;
    // 표본공간을 실제로 나열 — 노란 공은 0개, 빨강∪파랑이 전부
    const balls = [
      ...Array.from({ length: f.r! }, () => "빨"),
      ...Array.from({ length: f.b! }, () => "파"),
    ];
    const yellow = balls.filter((c) => c === "노").length;
    const redBlue = balls.filter((c) => c === "빨" || c === "파").length;
    expect(yellow / balls.length + redBlue / balls.length).toBe(1);
    expect(f.ans).toBe(1);
    expect(p.answer).toBe("$1$");
  },
  [`${P}|04`]: (p) => {
    const f = p.facts;
    let num = 0;
    let den = 0;
    if (f.kind === 0) {
      den = 36;
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1) if (a + b !== f.S) num += 1;
    } else {
      den = countSubsets(f.n!, 2, () => true);
      num = countSubsets(f.n!, 2, (set) => !set.includes(0)); // 0번이 A
    }
    const g = gcdT(num, den);
    expect({ n: num / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|05`]: (p) => {
    const f = p.facts;
    let num = 0;
    let den = 0;
    if (f.kind === 2) {
      den = countSubsets(f.m! + f.w!, 2, () => true);
      // 0..m-1 남, m..m+w-1 여 — 적어도 한 명 여학생
      num = countSubsets(f.m! + f.w!, 2, (set) => set.some((i) => i >= f.m!));
    } else {
      den = Math.pow(2, f.c!);
      for (let bits = 0; bits < den; bits += 1) {
        if (bits !== 0) num += 1; // 적어도 한 자리 성공
      }
    }
    const g = gcdT(num, den);
    expect({ n: num / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|06`]: (p) => {
    const f = p.facts;
    let num = 0;
    let den = 0;
    if (f.kind === 0) {
      den = f.N!;
      for (let v = 1; v <= f.N!; v += 1) {
        if (v % f.a! === 0 || v % f.b! === 0) num += 1;
      }
    } else {
      den = 36;
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1)
          if (a + b === f.S1 || a + b === f.S2) num += 1;
    }
    const g = gcdT(num, den);
    expect({ n: num / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|07`]: (p) => {
    const f = p.facts;
    const nA = f.w1! + f.b1!;
    const nB = f.w2! + f.b2!;
    let num = 0;
    for (let i = 0; i < nA; i += 1) {
      for (let j = 0; j < nB; j += 1) {
        if (i < f.w1! && j >= f.w2!) num += 1; // A 흰 · B 검
      }
    }
    const g = gcdT(num, nA * nB);
    expect({ n: num / g, d: (nA * nB) / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|08`]: (p) => {
    const f = p.facts;
    // 포함-배제: p + q − pq (생성기의 1−(1−p)(1−q) 와 다른 식)
    const den = f.pd! * f.qd!;
    const incl = f.pn! * f.qd! + f.qn! * f.pd! - f.pn! * f.qn!;
    const g = gcdT(incl, den);
    expect({ n: incl / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|09`]: (p) => {
    const f = p.facts;
    const nA = f.a1! + f.a2!;
    const nB = f.b1! + f.b2!;
    // 가중 나열: (접시, 그 접시의 만두) — 확률은 (a1·nB + b1·nA) / (2·nA·nB)
    const num = f.a1! * nB + f.b1! * nA;
    const den = 2 * nA * nB;
    const g = gcdT(num, den);
    expect({ n: num / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|10`]: (p) => {
    const f = p.facts;
    let num = 0;
    let den = 0;
    if (f.kind === 0) {
      const n = f.r! + f.b! + f.w!;
      den = n * n;
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          if (i >= f.r! && i < f.r! + f.b! && j >= f.r! && j < f.r! + f.b!)
            num += 1;
        }
      }
    } else {
      den = f.N! * f.N!;
      for (let i = 1; i <= f.N!; i += 1) {
        for (let j = 1; j <= f.N!; j += 1) {
          if (i % f.a! === 0 && f.q! % j === 0) num += 1;
        }
      }
    }
    const g = gcdT(num, den);
    expect({ n: num / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|11`]: (p) => {
    const f = p.facts;
    const n = f.r! + f.b!;
    let num = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        const iBlue = f.kind === 0 ? i >= f.r! : i >= f.r!;
        const jBlue = f.kind === 0 ? j >= f.r! : j >= f.r!;
        if (f.kind === 0 ? iBlue && jBlue : iBlue !== jBlue) num += 1;
      }
    }
    const den = n * (n - 1);
    const g = gcdT(num, den);
    expect({ n: num / g, d: den / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|12`]: (p) => {
    const f = p.facts;
    const succ = DICE_PREDS[f.cond!]!;
    expect([1, 2, 3, 4, 5, 6].filter(succ).length).toBe(f.succ);
    // 6^4 모의 — 처음 성공한 회차의 사람(홀수회 A, 짝수회 B)이 이긴다
    let win = 0;
    for (let d1 = 1; d1 <= 6; d1 += 1)
      for (let d2 = 1; d2 <= 6; d2 += 1)
        for (let d3 = 1; d3 <= 6; d3 += 1)
          for (let d4 = 1; d4 <= 6; d4 += 1) {
            const rolls = [d1, d2, d3, d4];
            const t = rolls.findIndex(succ);
            if (t === -1) continue;
            const winner = t % 2 === 0 ? 0 : 1; // 1·3회(짝수 색인) → A
            if (winner === f.who) win += 1;
          }
    const g = gcdT(win, 1296);
    expect({ n: win / g, d: 1296 / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
  [`${P}|13`]: (p) => {
    const f = p.facts;
    // 여사건 쪽 식: 셋째 날 이길 확률 = p1² + (1−p1)p2 — 생성기와 다른 결)
    const d = f.p1d! * f.p1d! * f.p2d!;
    const winNum =
      f.p1n! * f.p1n! * f.p2d! + (f.p1d! - f.p1n!) * f.p1d! * f.p2n!;
    const num = f.wantWin === 1 ? winNum : d - winNum;
    const g = gcdT(num, d);
    expect({ n: num / g, d: d / g }).toEqual({ n: f.num, d: f.den });
    expect(parseFrac(p.answer)).toEqual({ n: f.num, d: f.den });
  },
};

// ── 스위트 ───────────────────────────────────────────

type CatalogType = { minor: string; number: string; title: string };

describe("중2 수·확률 48유형 (2A-중2수확률)", () => {
  it("48유형이 등록돼 있고 유형 번호가 계획과 같다", () => {
    expect(ALL.length).toBe(48);
    const nums = (minor: string): string[] =>
      ALL.filter((e) => e.rpmMinor === minor)
        .map((e) => e.rpmType)
        .sort();
    expect(nums("유리수와 순환소수")).toEqual(
      Array.from({ length: 20 }, (_v, i) => String(i + 1).padStart(2, "0")),
    );
    expect(nums("경우의 수")).toEqual([
      ...Array.from({ length: 14 }, (_v, i) => String(i + 1).padStart(2, "0")),
      "16", // 15 색칠하기는 2B 대기 (영역 채색 필요 — m2Counting 머리 주석)
    ]);
    expect(nums("확률")).toEqual(
      Array.from({ length: 13 }, (_v, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("RPM 유형 번호·제목이 색인 정본과 일치한다 (지어낸 제목 금지)", () => {
    const raw = readFileSync(
      resolve(__dirname, "../../../scripts/rpm/rpm-type-catalog.json"),
      "utf-8",
    );
    const catalog = JSON.parse(raw) as Record<string, { types: CatalogType[] }>;
    for (const e of ALL) {
      const book = catalog[e.rpmBook]!.types;
      const hit = book.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `색인에 없는 유형: ${e.key}`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("우리 단원 8개에 실측 이름으로 붙는다", () => {
    const count = new Map<string, number>();
    for (const e of ALL) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    // 공유 DB Unit.section 실측 리터럴 (2026-08-23)
    expect(count).toEqual(
      new Map([
        ["유리수와 소수", 8],
        ["순환소수", 4],
        ["순환소수의 분수 표현", 4],
        ["순환소수를 포함한 식의 계산", 4],
        ["경우의 수", 7],
        ["여러 가지 경우의 수", 8],
        ["확률의 뜻과 성질", 5],
        ["확률의 계산", 8],
      ]),
    );
  });

  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of ALL) {
      expect(keys.has(e.key), e.key).toBe(true);
    }
  });

  /** 순환소수 표기가 지면에 나가는 유형 — 점(repeat-dot) 실렌더 확인 대상. */
  const DOT_TYPES = new Set(
    ["02", "03", "04", "12", "13", "14", "15", "16", "17", "20"].map(
      (n) => `${R}|${n}`,
    ),
  );

  for (const e of ALL) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("독립 검산 — 씨앗 5개 + 변형 12개", () => {
        const check = CHECKS[e.key];
        expect(check, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          check!(generateMiddleProblem(e.key, seed));
        }
        // 고정 씨앗이 못 밟는 가지(kind·소재)를 변형이 넓게 밟는다
        for (let variant = 0; variant < 12; variant += 1) {
          check!(generateMiddleProblem(e.key, 20260823, variant));
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
        // (CLAUDE.md 2026-08-14) — 성공 여부는 실제 렌더로만 잰다.
        for (const seed of SEEDS.slice(0, 3)) {
          const p = generateMiddleProblem(e.key, seed);
          let joined = "";
          for (const part of [p.content, p.answer, p.solution]) {
            const html = renderMathHtml(part);
            expect(/#cc0000/i.test(html), part).toBe(false);
            expect(html.includes("math-raw"), part).toBe(false);
            joined += html;
          }
          if (DOT_TYPES.has(e.key)) {
            // 순환마디 점 표기 — \overline 이 막대가 아니라 점으로 그려진다
            expect(joined, "repeat-dot 없음").toContain("repeat-dot");
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of ALL) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  it("그림은 최단거리(16)에만 있고 나머지는 없다", () => {
    for (const e of ALL) {
      const p = generateMiddleProblem(e.key, 20260823);
      if (e.key === `${C}|16`) {
        expect(p.figureSpec).toBeTruthy();
      } else {
        expect(p.figureSpec ?? null, e.key).toBeNull();
      }
    }
  });
});
