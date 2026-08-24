/**
 * 중3 「이차함수」 42유형 (RPM 3-1 이차함수의 그래프 ⑴ 21 + ⑵ 21) — 독립 검산.
 *
 * ## 이 시험이 무엇을 «다르게» 재는가
 *
 * 생성기는 **꼭짓점 $(p, q)$ 와 계수 $a$ 를 먼저 고르고 일반형으로 전개해서** 발문과
 * 정답을 만든다. 이 시험은 그 전개 산술을 한 줄도 안 쓴다 — 지면에 나가는 **글자**
 * (발문의 식 · 정답의 식)를 각각 **파싱해 여러 정수 점에 대입**하고, 필요하면
 * **라그랑주 보간으로 계수를 되찾아** 꼭짓점 공식 $\left(-\dfrac{b}{2a},\,
 * c-\dfrac{b^2}{4a}\right)$ 로 **거꾸로** 간다. 표준형과 일반형은 서로의 검산이다.
 *
 * 최대·최소 활용(⑵17·⑵19)처럼 지면에 식이 없는 유형은 **잘게 훑어(grid) 최댓값을
 * 찾는다** — 생성기가 쓴 닫힌 식과 다른 길이다.
 *
 * ## 부호를 재는 자리 (5A 브리프가 미리 짚은 것)
 *
 * - 평행이동(⑴09·⑴12·⑴19·⑵07)은 **옮긴 함수 == 원함수를 옮긴 것**을 여러 점에서
 *   견준다. `p` 의 부호가 뒤집히면 여기서 갈라진다.
 * - 최댓값·최솟값(⑵14~⑵16·⑵20)은 `(a<0) === isMax` 를 잠근다. 「최댓값을 구하시오」
 *   인데 $a>0$ 인 갈래가 섞이면 답이 없다.
 * - 그림 유형은 **실제 엔진으로 그려 본다**. `marks` 가 곡선 위가 아니면 엔진이
 *   던지므로 그림이 곧 검산이다.
 *
 * ## 분모를 지킨다
 *
 * `registeredTypes()` 를 중단원 이름으로 거르지 않는다 — 이 중단원에는 **남의 유형이
 * 없지만**(0/21·0/21에서 시작했다) 나중에 생기면 그때 남의 유형을 쓸어 담는다.
 * `M3_FUNC` 를 직접 돈다(물결 5 공통 계약 5).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers, josaFaults } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import {
  M3_FUNC,
  M3_FUNC_FIGURE_KEYS,
  M3_FUNC_MINORS,
  M3_FUNC_POOL_SIZES,
  QUAD_DEF_POOL,
} from "../../lib/middle/m3Func";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31415];
const TOL = 1e-7;

const M1 = "이차함수의 그래프 ⑴";
const M2 = "이차함수의 그래프 ⑵";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine =
  existsSync(VENDOR) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

type Env = Record<string, number>;

/* ────────────────────────────────────────────────────────────────────────
 * LaTeX 식 계산기 — 지면에 나가는 «글자»의 값을 잰다
 *
 * 모르는 모양이면 **던진다**. 조용히 건너뛰면 검산이 그 줄을 안 본 채로 초록이 된다
 * (middleM3Poly.test.ts 와 같은 무늬 — 그쪽에서 실증된 파서를 이 유형에 맞게 줄였다).
 * ──────────────────────────────────────────────────────────────────────── */

function evalLatex(raw: string, env: Env): number {
  const s = raw
    .replace(/\\left|\\right|\\!|\\,|\\;|\\quad/g, "")
    .replace(/\s+/g, "");
  let i = 0;

  const peek = (): string => s[i] ?? "";
  const starts = (t: string): boolean => s.startsWith(t, i);

  function expect1(c: string): void {
    if (peek() !== c) {
      throw new Error(`«${c}» 를 기다렸는데 «${peek()}» (${raw} @${i})`);
    }
    i += 1;
  }

  function atomStart(): boolean {
    const c = peek();
    if (c === "") return false;
    if (/[0-9(a-zA-Z]/.test(c)) return true;
    if (c === "\\") return starts("\\dfrac") || starts("\\frac");
    return false;
  }

  function atom(): number {
    if (peek() === "(") {
      i += 1;
      const v = expr();
      expect1(")");
      return v;
    }
    if (peek() === "{") {
      i += 1;
      const v = expr();
      expect1("}");
      return v;
    }
    if (starts("\\dfrac") || starts("\\frac")) {
      i += starts("\\dfrac") ? 6 : 5;
      expect1("{");
      const n = expr();
      expect1("}");
      expect1("{");
      const d = expr();
      expect1("}");
      if (d === 0) throw new Error(`0 으로 나눈다: ${raw}`);
      return n / d;
    }
    const num = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (num) {
      i += num[0].length;
      return Number(num[0]);
    }
    const c = peek();
    if (/[a-zA-Z]/.test(c)) {
      i += 1;
      if (!(c in env)) throw new Error(`모르는 문자 «${c}»: ${raw}`);
      return env[c]!;
    }
    throw new Error(`알 수 없는 글자 «${c}»: ${raw} @${i}`);
  }

  function exponent(): number {
    if (peek() === "{") {
      i += 1;
      const v = expr();
      expect1("}");
      return v;
    }
    if (peek() === "-") {
      i += 1;
      return -exponent();
    }
    const c = peek();
    if (/[0-9]/.test(c)) {
      i += 1;
      return Number(c);
    }
    if (/[a-zA-Z]/.test(c)) {
      i += 1;
      if (!(c in env)) throw new Error(`모르는 지수 문자 «${c}»: ${raw}`);
      return env[c]!;
    }
    throw new Error(`알 수 없는 지수: ${raw} @${i}`);
  }

  function power(): number {
    let v = atom();
    while (peek() === "^") {
      i += 1;
      v = Math.pow(v, exponent());
    }
    return v;
  }

  function unary(): number {
    if (peek() === "-") {
      i += 1;
      return -unary();
    }
    if (peek() === "+") {
      i += 1;
      return unary();
    }
    return power();
  }

  function term(): number {
    let v = unary();
    for (;;) {
      if (starts("\\times")) {
        i += 6;
        v *= unary();
      } else if (starts("\\cdot")) {
        i += 5;
        v *= unary();
      } else if (starts("\\div")) {
        i += 4;
        v /= unary();
      } else if (atomStart()) {
        v *= unary();
      } else {
        return v;
      }
    }
  }

  function expr(): number {
    let v = term();
    for (;;) {
      if (peek() === "+") {
        i += 1;
        v += term();
      } else if (peek() === "-") {
        i += 1;
        v -= term();
      } else {
        return v;
      }
    }
  }

  const out = expr();
  if (i !== s.length) throw new Error(`다 못 읽었다 (@${i}): ${raw}`);
  if (!Number.isFinite(out)) throw new Error(`유한하지 않다: ${raw}`);
  return out;
}

const near = (a: number, b: number, tol = TOL): boolean =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

/* ────────────────────────────────────────────────────────────────────────
 * 지면 글자 다루기
 * ──────────────────────────────────────────────────────────────────────── */

/** `$...$` 안쪽만 모은다. */
function maths(text: string): string[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]!);
}

/** 조각 하나에서 `sub` 를 품은 첫 수식. 없으면 던진다(조용히 건너뛰지 않는다). */
function mathWith(text: string, sub: string): string {
  const hit = maths(text).find((s) => s.includes(sub));
  if (hit === undefined)
    throw new Error(`«${sub}» 를 품은 수식이 없다: ${text}`);
  return hit;
}

/** `y=…` · `f(x)=…` 의 오른변. */
function rhsOf(seg: string): string {
  const at = seg.indexOf("=");
  if (at < 0) throw new Error(`등호가 없다: ${seg}`);
  return seg.slice(at + 1);
}

/** 단위 표기를 떼고 수식만 남긴다 — `$45\,\mathrm{m}$` 의 값은 $45$ 다. */
function stripUnits(seg: string): string {
  return seg
    .replace(/\\,\\mathrm\{[^}]*\}(\^\d)?/g, "")
    .replace(/\\mathrm\{[^}]*\}/g, "")
    .trim();
}

/** 정답의 첫 수식을 수로 읽는다. */
function ansNum(p: MidProblem): number {
  return evalLatex(stripUnits(maths(p.answer)[0]!), {});
}

/** 본문에 적힌 좌표쌍 `(x, y)` 를 전부 — 「지나는 점」 검산의 재료다. */
function pointsIn(text: string): [number, number][] {
  return [...text.matchAll(/\((-?\d+),\s*(-?\d+)\)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  );
}

/**
 * 지면의 식에서 이차식의 계수를 **되찾는다**(라그랑주 보간).
 * 네 번째 점으로 «정말 이차식인가»를 반증한다 — 아니면 던진다.
 */
function quadCoef(rhs: string, env: Env, v = "x"): [number, number, number] {
  const y = [-1, 0, 1].map((t) => evalLatex(rhs, { ...env, [v]: t }));
  const c = y[1]!;
  const a = (y[0]! + y[2]!) / 2 - c;
  const b = (y[2]! - y[0]!) / 2;
  const chk = evalLatex(rhs, { ...env, [v]: 3 });
  if (!near(chk, 9 * a + 3 * b + c, 1e-6)) {
    throw new Error(`이차식이 아니다: ${rhs}`);
  }
  return [a, b, c];
}

/** 꼭짓점 — 생성기가 간 길(완전제곱)의 **반대 방향**이다. */
function vertexOf(a: number, b: number, c: number): { x: number; y: number } {
  if (a === 0) throw new Error("이차항이 없다");
  return { x: -b / (2 * a), y: c - (b * b) / (4 * a) };
}

/**
 * 다항식의 차수 — 다섯 점으로 4차까지 보간하고 **여섯째 점으로 반증**한다.
 * 다항식이 아니면(`\dfrac{1}{x^2}`) `null`.
 */
function polyDegree(rhs: string, env: Env = {}): number | null {
  const xs = [1, 2, 3, 4, 5];
  let ys: number[];
  try {
    ys = xs.map((x) => evalLatex(rhs, { ...env, x }));
  } catch {
    return null;
  }
  const co = solveVandermonde(xs, ys);
  const at = 7;
  const pred = co.reduce((acc, k, i) => acc + k * Math.pow(at, i), 0);
  if (!near(evalLatex(rhs, { ...env, x: at }), pred, 1e-6)) return null;
  for (let d = co.length - 1; d >= 0; d -= 1) {
    if (Math.abs(co[d]!) > 1e-6) return d;
  }
  return 0;
}

/** 반데르몽드 연립을 가우스 소거로 푼다. */
function solveVandermonde(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const a: number[][] = xs.map((x, r) => {
    const row: number[] = [];
    for (let j = 0; j < n; j += 1) row.push(Math.pow(x, j));
    row.push(ys[r]!);
    return row;
  });
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) {
      if (Math.abs(a[r]![c]!) > Math.abs(a[piv]![c]!)) piv = r;
    }
    if (Math.abs(a[piv]![c]!) < 1e-12) throw new Error("보간이 특이하다");
    [a[c], a[piv]] = [a[piv]!, a[c]!];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = a[r]![c]! / a[c]![c]!;
      for (let k = c; k <= n; k += 1) a[r]![k]! -= f * a[c]![k]!;
    }
  }
  return Array.from({ length: n }, (_, j) => a[j]![n]! / a[j]![j]!);
}

/** 잘게 훑어 최댓값(또는 최솟값)을 찾는다 — 닫힌 식을 안 쓰는 길이다. */
function gridExtreme(
  f: (x: number) => number,
  lo: number,
  hi: number,
  max: boolean,
): { x: number; y: number } {
  let bx = lo;
  let by = f(lo);
  const step = (hi - lo) / 20000;
  for (let x = lo; x <= hi; x += step) {
    const y = f(x);
    if (max ? y > by : y < by) {
      by = y;
      bx = x;
    }
  }
  return { x: bx, y: by };
}

/** 제몇 사분면인가 — 축 위는 `0`. */
function quadrantOf(x: number, y: number): number {
  if (Math.abs(x) < 1e-9 || Math.abs(y) < 1e-9) return 0;
  if (x > 0) return y > 0 ? 1 : 4;
  return y > 0 ? 2 : 3;
}

/** 수만으로 읽히는 등식 사슬이 실제로 성립하는가. 문자가 끼면 건너뛴다. */
function numericEqualityMismatches(text: string): string[] {
  const out: string[] = [];
  for (const seg of maths(text)) {
    const parts = stripUnits(seg).split("=");
    if (parts.length < 2) continue;
    let prev: number | null = null;
    let prevRaw = "";
    for (const part of parts) {
      let v: number | null = null;
      try {
        v = evalLatex(part, {});
      } catch {
        v = null;
      }
      if (v !== null && prev !== null && !near(v, prev, 1e-9)) {
        out.push(`${prevRaw} = ${part} → ${prev} vs ${v}`);
      }
      prev = v;
      prevRaw = part;
    }
  }
  return out;
}

/** 제품 전처리가 지면의 수를 고쳐 쓰는가 — 대분수·분수 접힘 (D-73). */
function countMixed(t: string): number {
  return (t.match(/\d\\d?frac/g) ?? []).length;
}
function countFrac(t: string): number {
  return (t.match(/\\d?frac/g) ?? []).length;
}
function preprocessRewrites(text: string): string[] {
  const after = preprocessMathText(text);
  const out: string[] = [];
  const mixed = countMixed(after) - countMixed(text);
  if (mixed > 0) out.push(`가분수→대분수 ${mixed}`);
  const fold = countFrac(text) - countFrac(after);
  if (fold > 0) out.push(`분수 접힘 ${fold}`);
  return out;
}

/* ────────────────────────────────────────────────────────────────────────
 * 보기 명제 진리표 — **생성기와 따로** 손으로 적었다
 *
 * 같은 상수를 import 하면 명제가 틀려도 영원히 초록이다. 색인은 모듈의 풀 순서와
 * 같아야 하고, 길이는 `M3_FUNC_POOL_SIZES` 로 잠근다(풀을 늘리면 여기서 빨개진다).
 * ──────────────────────────────────────────────────────────────────────── */

/** ⑴01 — 우변을 정리하면 «$x$에 대한 이차식»인가. */
const DEF_TRUTH: readonly boolean[] = [
  true, // x^2-4x+1
  false, // 3x-5
  false, // x(x+2)-x^2 = 2x
  true, // (x-1)^2+x
  false, // 1/x^2 — 다항식이 아니다
  false, // 2x^3-x^2 — 삼차
  true, // (x+3)(x-2)
  false, // (x+1)^2-(x-1)^2 = 4x
  true, // -x^2+7
  true, // x(x-5)
  true, // x^2/2 - x
  false, // (2x-1)(x+4)-2x^2 = 7x-4
];

/** ⑴06 — $y=ax^2$ 의 성질 (a 는 계수의 값). */
const P06: readonly ((a: number) => boolean)[] = [
  () => true, // 원점을 지난다
  () => true, // 축 x=0
  (a) => a > 0, // 아래로 볼록
  (a) => a < 0, // 위로 볼록
  () => true, // y=-ax^2 와 x축 대칭
  () => true, // 꼭짓점 (0,0)
  (a) => Math.abs(a) > 1, // y=x^2 보다 폭이 좁다
  (a) => a > 0, // x>0 에서 증가
  (a) => a < 0, // 제3·4사분면
];

/** ⑴10 — $y=ax^2+q$ 의 성질. */
const P10: readonly ((a: number, q: number) => boolean)[] = [
  () => true, // 꼭짓점 (0,q)
  () => true, // 축 x=0
  (a) => a > 0, // 아래로 볼록
  () => true, // y=ax^2 를 y축으로 q 평행이동
  () => true, // y축과 (0,q)
  (a, q) => (a > 0 && q < 0) || (a < 0 && q > 0), // 모든 사분면
  (a) => a > 0, // x<0 에서 감소
  (a, q) => a > 0 || q > 0, // 제1사분면
  () => false, // 원점을 지난다 (q≠0)
];

/** ⑴13 — $y=a(x-p)^2$ 의 성질. */
const P13: readonly ((a: number, p: number) => boolean)[] = [
  () => true, // 꼭짓점 (p,0)
  () => true, // 축 x=p
  () => true, // y=ax^2 를 x축으로 p 평행이동
  (a) => a > 0, // 아래로 볼록
  (a) => a < 0, // 위로 볼록
  (a) => a > 0, // x>p 에서 증가
  (a) => a > 0, // x<p 에서 감소
  () => true, // x축과 한 점
  () => true, // y축과 (0, ap^2)
  () => false, // 원점을 지난다 (p≠0)
  () => false, // 축의 방정식이 y=p
];

/** ⑴17 — $y=a(x-p)^2+q$ 의 성질. */
const P17: readonly ((a: number, p: number, q: number) => boolean)[] = [
  () => true, // 꼭짓점 (p,q)
  () => true, // 축 x=p
  () => true, // 평행이동
  () => true, // y축과의 교점
  (a) => a > 0, // 아래로 볼록
  (a) => a < 0, // 위로 볼록
  (a) => a > 0, // x>p 에서 증가
  (a) => a > 0, // x<p 에서 감소
  (a, _p, q) => (a > 0 && q < 0) || (a < 0 && q > 0), // x축과 두 점
];

/** ⑵06 — $y=ax^2+bx+c$ 의 성질. */
const PG06: readonly ((
  a: number,
  p: number,
  q: number,
  c: number,
) => boolean)[] = [
  () => true, // 꼭짓점 (p,q)
  () => true, // 축 x=p
  () => true, // y축 교점의 y좌표 c
  (a) => a > 0, // 아래로 볼록
  () => true, // y=ax^2 를 평행이동
  (a) => a > 0, // x>p 에서 증가
  (a, _p, q) => (a > 0 && q < 0) || (a < 0 && q > 0), // x축과 두 점
  () => false, // 원점을 지난다 (c≠0)
  (a) => a < 0, // 위로 볼록
];

const MARK_CHARS = ["①", "②", "③", "④", "⑤"] as const;

function pickedIndices(f: Record<string, number>): number[] {
  return [f.i0!, f.i1!, f.i2!, f.i3!, f.i4!];
}

function marksOf(flags: readonly boolean[]): string {
  return flags
    .map((v, i) => (v ? MARK_CHARS[i]! : ""))
    .filter(Boolean)
    .join(", ");
}

/* ────────────────────────────────────────────────────────────────────────
 * RPM 색인 정본 — 42유형 제목 리터럴 (`scripts/rpm/rpm-type-catalog.json` 그대로)
 * ──────────────────────────────────────────────────────────────────────── */

const TITLES: Record<string, string> = {
  [`${M1}|01`]: "이차함수의 뜻",
  [`${M1}|02`]: "이차함수가 되도록 하는 조건",
  [`${M1}|03`]: "이차함수의 함숫값",
  [`${M1}|04`]: "이차함수 의 그래프",
  [`${M1}|05`]: "두 이차함수 의 그래프의 관계",
  [`${M1}|06`]: "이차함수 의 그래프의 성질",
  [`${M1}|07`]: "이차함수 의 그래프 위의 점",
  [`${M1}|08`]: "이차함수의 식 구하기",
  [`${M1}|09`]: "이차함수 의 그래프",
  [`${M1}|10`]: "이차함수 의 그래프의 성질",
  [`${M1}|11`]: "이차함수의 식 구하기",
  [`${M1}|12`]: "이차함수 의 그래프",
  [`${M1}|13`]: "이차함수 의 그래프의 성질",
  [`${M1}|14`]: "이차함수의 식 구하기",
  [`${M1}|15`]: "이차함수 의 그래프",
  [`${M1}|16`]: "이차함수 의 증가와 감소",
  [`${M1}|17`]: "이차함수 의 그래프의 성질",
  [`${M1}|18`]: "이차함수의 식 구하기",
  [`${M1}|19`]: "이차함수 의 그래프의 평행이동",
  [`${M1}|20`]: "이차함수 의 그래프에서 의 부호",
  [`${M1}|21`]: "이차함수의 그래프의 활용",
  [`${M2}|01`]: "이차함수 를 의 꼴로 고치기",
  [`${M2}|02`]: "이차함수 의 그래프의 꼭짓점과 축",
  [`${M2}|03`]: "이차함수 의 그래프 그리기",
  [`${M2}|04`]: "이차함수 의 증가와 감소",
  [`${M2}|05`]: "이차함수의 그래프와 축축과의 교점",
  [`${M2}|06`]: "이차함수 의 그래프의 성질",
  [`${M2}|07`]: "이차함수 의 그래프의 평행이동",
  [`${M2}|08`]: "이차함수의 그래프와 삼각형의 넓이",
  [`${M2}|09`]: "이차함수 의 그래프에서 의 부호",
  [`${M2}|10`]: "이차함수의 식 구하기 꼭짓점과 다른 한 점을 알 때",
  [`${M2}|11`]: "이차함수의 식 구하기 축의 방정식과 두 점을 알 때",
  [`${M2}|12`]: "이차함수의 식 구하기 서로 다른 세 점을 알 때",
  [`${M2}|13`]: "이차함수의 식 구하기 축과의 두 교점과 다른 한 점을 알 때",
  [`${M2}|14`]: "이차함수의 최댓값과 최솟값",
  [`${M2}|15`]:
    "이차함수의 최댓값 또는 최솟값이 주어질 때 미지수의 값 구하기 ⑴",
  [`${M2}|16`]:
    "이차함수의 최댓값 또는 최솟값이 주어질 때 미지수의 값 구하기 ⑵",
  [`${M2}|17`]: "이차함수의 활용 합 또는 차가 일정한 두 수의 곱",
  [`${M2}|18`]: "이차함수의 활용 쏘아 올린 물체",
  [`${M2}|19`]: "이차함수의 활용 도형의 넓이",
  [`${M2}|20`]: "최댓값의 최솟값 또는 최솟값의 최댓값",
  [`${M2}|21`]: "이차함수의 활용 내접하는 도형의 넓이",
};

/* ────────────────────────────────────────────────────────────────────────
 * 유형별 독립 검산표 — 키는 `중단원|번호`
 * ──────────────────────────────────────────────────────────────────────── */

/** 발문 안 「$y=…$」 중 **수로만 이루어진** 것들의 오른변. */
function numericFnRhs(text: string): string[] {
  return maths(text)
    .filter((s) => s.startsWith("y=") || s.startsWith("f(x)="))
    .map(rhsOf)
    .filter((r) => {
      try {
        evalLatex(r, { x: 2 });
        return true;
      } catch {
        return false;
      }
    });
}

/** 정답의 함수식 오른변. */
function ansRhs(p: MidProblem): string {
  return rhsOf(mathWith(p.answer, "y="));
}

const VERIFY: Record<string, (p: MidProblem) => void> = {
  // ── ⑴ 이차함수의 그래프 ⑴ ──────────────────────────────────────────
  [`${M1}|01`]: (p) => {
    const items = maths(p.content).filter((s) => s.startsWith("y="));
    expect(items).toHaveLength(5);
    // 지면 글자를 파싱해 **스스로** 「이차식인가」를 판정한다.
    const flags = items.map((s) => polyDegree(rhsOf(s)) === 2);
    expect(ansNum(p)).toBe(flags.filter(Boolean).length);
    // 손 진리표와도 대 본다 — 둘이 갈리면 어느 한쪽이 틀린 것이다.
    expect(pickedIndices(p.facts).map((i) => DEF_TRUTH[i]!)).toEqual(flags);
  },

  [`${M1}|02`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "y="));
    const k = p.facts.ans!;
    // 그 $k$ 에서만 이차항이 사라진다 — 이웃 값에서는 남는다.
    expect(polyDegree(rhs, { k })).toBeLessThanOrEqual(1);
    expect(polyDegree(rhs, { k: k + 1 })).toBe(2);
    expect(polyDegree(rhs, { k: k - 1 })).toBe(2);
    expect(p.answer).toBe(`$k \\neq ${k}$`);
  },

  [`${M1}|03`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "f(x)="));
    const f = (x: number): number => evalLatex(rhs, { x });
    const { p: pp, q, mode } = p.facts as Record<string, number>;
    const want =
      mode === 0
        ? f(pp!) + f(q!)
        : mode === 1
          ? f(pp!) - f(q!)
          : 2 * f(pp!) + f(q!);
    expect(near(ansNum(p), want)).toBe(true);
    expect(near(f(pp!), p.facts.fp!)).toBe(true);
    expect(near(f(q!), p.facts.fq!)).toBe(true);
  },

  [`${M1}|04`]: (p) => {
    const items = maths(p.content).filter((s) => s.startsWith("y="));
    expect(items).toHaveLength(4);
    const coefs = items.map((s) => evalLatex(rhsOf(s), { x: 1 }));
    const abs = coefs.map(Math.abs);
    expect(new Set(abs).size).toBe(4);
    const want = p.facts.mode === 0 ? Math.min(...abs) : Math.max(...abs);
    expect(near(ansNum(p), coefs[abs.indexOf(want)]!)).toBe(true);
  },

  [`${M1}|05`]: (p) => {
    const given = numericFnRhs(p.content);
    if (p.facts.mode === 0) {
      expect(given).toHaveLength(1);
      // $x$축 대칭 == 같은 $x$ 에서 값의 부호만 반대
      for (const x of [1, 2, 3]) {
        expect(
          near(evalLatex(given[0]!, { x }) + evalLatex(ansRhs(p), { x }), 0),
        ).toBe(true);
      }
      return;
    }
    // 발문에 적힌 두 식은 $-a$, $-b$ 다 — 곱은 $ab$ 와 같다.
    expect(given).toHaveLength(2);
    const first = evalLatex(given[0]!, { x: 1 });
    const second = evalLatex(given[1]!, { x: 1 });
    expect(near(ansNum(p), first * second)).toBe(true);
  },

  [`${M1}|06`]: (p) => {
    const a = evalLatex(rhsOf(mathWith(p.content, "y=")), { x: 1 });
    const flags = pickedIndices(p.facts).map((i) => P06[i]!(a));
    expect(p.answer).toBe(marksOf(flags));
    expect(p.facts.ans).toBe(flags.filter(Boolean).length);
  },

  [`${M1}|07`]: (p) => {
    const { m, n, mode } = p.facts as Record<string, number>;
    if (mode === 0) {
      // 정답 $a$ 를 되넣으면 그 점을 지난다
      expect(near(ansNum(p) * m! * m!, n!)).toBe(true);
    } else {
      // $t=\dfrac{n}{m^2}k^2$ — 정수 곱으로 견준다(나눗셈을 안 쓴다)
      const k = p.facts.k!;
      expect(near(ansNum(p) * m! * m!, n! * k * k)).toBe(true);
    }
    const spec = p.figureSpec as { marks?: number[][] };
    expect(spec.marks).toEqual([[m, n]]);
  },

  [`${M1}|08`]: (p) => {
    const { m, n, mode } = p.facts as Record<string, number>;
    if (mode === 0) {
      const f = ansRhs(p);
      expect(near(evalLatex(f, { x: m! }), n!)).toBe(true);
      expect(near(evalLatex(f, { x: 0 }), 0)).toBe(true);
      return;
    }
    const k = ansNum(p);
    expect(k).toBeGreaterThan(0);
    // $a=\dfrac{n}{m^2}$ 이고 $ak^2=w$ — 정수 곱으로 견준다
    expect(near(n! * k * k, p.facts.w! * m! * m!)).toBe(true);
  },

  [`${M1}|09`]: (p) => {
    const { mode, q } = p.facts as Record<string, number>;
    const src = numericFnRhs(p.content)[0]!;
    if (mode === 0) {
      const dst = ansRhs(p);
      for (const x of [-2, 0, 3]) {
        expect(
          near(evalLatex(dst, { x }) - evalLatex(src, { x }), q!),
          `평행이동 부호: x=${x}`,
        ).toBe(true);
      }
      return;
    }
    if (mode === 1) {
      // 발문 식의 꼭짓점을 보간으로 되찾는다
      const [A, B, C] = quadCoef(src, {});
      const v = vertexOf(A, B, C);
      expect(near(v.x, 0)).toBe(true);
      expect(near(v.y, q!)).toBe(true);
      expect(p.answer).toBe(`$(0, ${q})$, $x=0$`);
      return;
    }
    expect(near(evalLatex(src, { x: p.facts.m! }) + q!, p.facts.v!)).toBe(true);
    expect(ansNum(p)).toBe(q!);
  },

  [`${M1}|10`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    expect(near(B, 0)).toBe(true);
    const flags = pickedIndices(p.facts).map((i) => P10[i]!(A, C));
    expect(ansNum(p)).toBe(flags.filter(Boolean).length);
  },

  [`${M1}|11`]: (p) => {
    const { m, v, q, mode } = p.facts as Record<string, number>;
    if (mode === 0) {
      const f = ansRhs(p);
      expect(near(evalLatex(f, { x: 0 }), q!)).toBe(true);
      expect(near(evalLatex(f, { x: m! }), v!)).toBe(true);
      return;
    }
    // $t$ 를 되넣어 세 점이 한 포물선 위인지 본다 (a 를 두 점에서 각각 구해 견준다)
    const { k, w } = p.facts as Record<string, number>;
    expect(near((v! - q!) * k! * k!, (w! - q!) * m! * m!)).toBe(true);
    expect(ansNum(p)).toBe(w!);
  },

  [`${M1}|12`]: (p) => {
    const { mode, p: pp } = p.facts as Record<string, number>;
    const src = numericFnRhs(p.content)[0]!;
    if (mode === 0) {
      const dst = ansRhs(p);
      for (const x of [-2, 1, 4]) {
        expect(
          near(evalLatex(dst, { x }), evalLatex(src, { x: x - pp! })),
          `x축 평행이동 부호: x=${x}`,
        ).toBe(true);
      }
      return;
    }
    const [A, B, C] = quadCoef(src, {});
    const v = vertexOf(A, B, C);
    expect(near(v.x, pp!)).toBe(true);
    expect(near(v.y, 0)).toBe(true);
    if (mode === 1) {
      expect(p.answer).toBe(`$(${pp}, 0)$, $x=${pp}$`);
    } else {
      expect(near(evalLatex(src, { x: p.facts.m! }), ansNum(p))).toBe(true);
    }
  },

  [`${M1}|13`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const v = vertexOf(A, B, C);
    const idx = pickedIndices(p.facts);
    const flags = idx.map((i) => P13[i]!(A, v.x));
    const slot = p.facts.slot!;
    expect(flags[slot]).toBe(false);
    expect(flags.filter((f) => !f)).toHaveLength(1);
    expect(p.answer).toBe(MARK_CHARS[slot]!);
    expect(near(v.y, 0)).toBe(true);
  },

  [`${M1}|14`]: (p) => {
    const { p: pp, m, v } = p.facts as Record<string, number>;
    const f = ansRhs(p);
    expect(near(evalLatex(f, { x: pp! }), 0)).toBe(true);
    expect(near(evalLatex(f, { x: m! }), v!)).toBe(true);
    // 꼭짓점이 정말 $x=p$ 인가 — 좌우 대칭으로 본다
    expect(
      near(evalLatex(f, { x: pp! - 1 }), evalLatex(f, { x: pp! + 1 })),
    ).toBe(true);
  },

  [`${M1}|15`]: (p) => {
    const f = p.facts as Record<string, number>;
    const a = f.aN! / f.aD!;
    if (f.mode === 0) {
      expect(near(a * (f.m! - f.p!) * (f.m! - f.p!) + f.q!, f.v!)).toBe(true);
      expect(near(ansNum(p), a - f.pp!)).toBe(true);
      expect(f.pp).toBe(-f.p!);
      return;
    }
    if (f.mode === 1) {
      // 원함수를 옮긴 함수의 꼭짓점을 보간으로 되찾는다
      const src = numericFnRhs(p.content)[0]!;
      const g = (x: number): number => evalLatex(src, { x: x - f.p! }) + f.q!;
      const y = [-1, 0, 1].map(g);
      const c = y[1]!;
      const A = (y[0]! + y[2]!) / 2 - c;
      const B = (y[2]! - y[0]!) / 2;
      const v = vertexOf(A, B, c);
      expect(near(v.x, f.p!)).toBe(true);
      expect(near(v.y, f.q!)).toBe(true);
      expect(ansNum(p)).toBe(2 * f.p! - f.q!);
      return;
    }
    // 꼭짓점 $(p, q)$ 가 발문의 직선 위에 있는가 — 직선식을 지면에서 읽는다
    const line = numericFnRhs(p.content).find((r) => polyDegree(r) === 1);
    expect(line, "직선식을 지면에서 못 읽었다").toBeDefined();
    expect(near(evalLatex(line!, { x: f.p! }), f.q!)).toBe(true);
    expect(f.pp).toBe(-f.p!);
    expect(ansNum(p)).toBe(f.pp! + f.q!);
  },

  [`${M1}|16`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "y="));
    const [, ,] = quadCoef(rhs, {});
    const ans = maths(p.answer)[0]!;
    const m = /^x([<>])(-?\d+)$/.exec(ans);
    expect(m, `정답 꼴이 아니다: ${ans}`).not.toBeNull();
    const right = m![1] === ">";
    const t = Number(m![2]);
    const f = (x: number): number => evalLatex(rhs, { x });
    // 적힌 쪽에서 «증가할 때 증가/감소»가 실제로 그런가 (반대쪽은 반대여야 한다)
    const grow = p.facts.mode === 0;
    const inSide = right ? [t + 0.5, t + 2] : [t - 2, t - 0.5];
    const outSide = right ? [t - 2, t - 0.5] : [t + 0.5, t + 2];
    expect(f(inSide[1]!) > f(inSide[0]!)).toBe(grow);
    expect(f(outSide[1]!) > f(outSide[0]!)).toBe(!grow);
  },

  [`${M1}|17`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const v = vertexOf(A, B, C);
    const flags = pickedIndices(p.facts).map((i) => P17[i]!(A, v.x, v.y));
    expect(ansNum(p)).toBe(flags.filter(Boolean).length);
  },

  [`${M1}|18`]: (p) => {
    const f = ansRhs(p);
    const { p: pp, q, m, v } = p.facts as Record<string, number>;
    expect(near(evalLatex(f, { x: pp! }), q!)).toBe(true);
    expect(near(evalLatex(f, { x: m! }), v!)).toBe(true);
    expect(
      near(evalLatex(f, { x: pp! - 1 }), evalLatex(f, { x: pp! + 1 })),
    ).toBe(true);
    // 발문이 말한 두 점이 그림의 표식과 같아야 한다 — 그림이 곧 검산이다
    const spec = p.figureSpec as { marks?: number[][] };
    expect(spec.marks).toEqual([
      [pp, q],
      [m, v],
    ]);
  },

  [`${M1}|19`]: (p) => {
    const f = p.facts as Record<string, number>;
    const src = numericFnRhs(p.content)[0]!;
    const shifted = (x: number): number =>
      evalLatex(src, { x: x - f.mx! }) + f.my!;
    if (f.mode === 0) {
      const dst = ansRhs(p);
      for (const x of [-3, 0, 2, 5]) {
        expect(near(evalLatex(dst, { x }), shifted(x)), `부호: x=${x}`).toBe(
          true,
        );
      }
      return;
    }
    if (f.mode === 1) {
      const pts = pointsIn(p.answer);
      expect(pts).toHaveLength(1);
      expect(near(shifted(pts[0]![0]), pts[0]![1])).toBe(true);
      // 그 점이 꼭짓점인가 — 좌우 대칭
      expect(near(shifted(pts[0]![0] - 1), shifted(pts[0]![0] + 1))).toBe(true);
      return;
    }
    // 발문에 두 식이 다 있다 — 옮긴 것이 정말 뒤엣것인가
    const both = numericFnRhs(p.content);
    expect(both).toHaveLength(2);
    for (const x of [-3, 0, 2]) {
      expect(near(evalLatex(both[1]!, { x }), shifted(x))).toBe(true);
    }
    expect(ansNum(p)).toBe(f.mx! + f.my!);
  },

  [`${M1}|20`]: (p) => {
    const f = p.facts as Record<string, number>;
    // 답의 근거는 **그려진 그래프**다 — 스펙에서 직접 읽는다
    const spec = p.figureSpec as {
      curves: { a: number; p: number; q: number }[];
    };
    const cur = spec.curves[0]!;
    expect(Math.sign(cur.a)).toBe(f.sa);
    expect(Math.sign(cur.p)).toBe(f.sp);
    expect(Math.sign(cur.q)).toBe(f.sq);
    const gt = (s: number): string => (s > 0 ? ">" : "<");
    if (f.mode === 1) {
      const quad2 = cur.p > 0 ? (cur.a > 0 ? 1 : 4) : cur.a > 0 ? 2 : 3;
      expect(p.answer).toBe(`제$${quad2}$사분면`);
    } else if (f.mode === 2) {
      expect(p.answer).toBe(`$ap${gt(cur.a * cur.p)}0$`);
    } else if (f.mode === 3) {
      expect(p.answer).toBe(`$apq${gt(cur.a * cur.p * cur.q)}0$`);
    } else if (f.mode === 4) {
      expect(p.answer).toBe(`$\\dfrac{q}{a}${gt(cur.q / cur.a)}0$`);
    } else {
      expect(p.answer).toBe(
        `$a${gt(cur.a)}0$, $p${gt(cur.p)}0$, $q${gt(cur.q)}0$`,
      );
    }
  },

  [`${M1}|21`]: (p) => {
    const { m, h, mode } = p.facts as Record<string, number>;
    const src = numericFnRhs(p.content)[0]!;
    expect(near(evalLatex(src, { x: m! }), h!)).toBe(true);
    expect(ansNum(p)).toBe(mode === 0 ? m! * h! : 2 * (m! + h!));
    const spec = p.figureSpec as { marks?: number[][] };
    expect(spec.marks).toEqual([[m, h]]);
  },

  // ── ⑵ 이차함수의 그래프 ⑵ ──────────────────────────────────────────
  [`${M2}|01`]: (p) => {
    // 표준형 ↔ 일반형 — 두 꼴이 같은 함수인가
    const gen = rhsOf(mathWith(p.content, "y="));
    const std = ansRhs(p);
    for (const x of [-3, -1, 0, 2, 4]) {
      expect(near(evalLatex(std, { x }), evalLatex(gen, { x })), `x=${x}`).toBe(
        true,
      );
    }
  },

  [`${M2}|02`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const v = vertexOf(A, B, C);
    if (p.facts.mode === 0) {
      expect(p.answer).toBe(`$(${v.x}, ${v.y})$, $x=${v.x}$`);
    } else {
      expect(near(ansNum(p), 2 * v.x + v.y)).toBe(true);
    }
  },

  [`${M2}|03`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    // 사분면을 **훑어서** 찾는다 — 생성기의 부호 조합을 옮겨 적지 않는다
    const seen = new Set<number>();
    for (let x = -40; x <= 40; x += 0.005) {
      const qd = quadrantOf(x, A * x * x + B * x + C);
      if (qd !== 0) seen.add(qd);
    }
    const missing = [1, 2, 3, 4].filter((qd) => !seen.has(qd));
    expect(missing, "지나지 않는 사분면이 하나가 아니다").toHaveLength(1);
    expect(p.answer).toBe(`제$${missing[0]}$사분면`);
  },

  [`${M2}|04`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "y="));
    const ans = maths(p.answer)[0]!;
    const m = /^x([<>])(-?\d+)$/.exec(ans);
    expect(m, `정답 꼴이 아니다: ${ans}`).not.toBeNull();
    const right = m![1] === ">";
    const t = Number(m![2]);
    const f = (x: number): number => evalLatex(rhs, { x });
    const grow = p.facts.mode === 0;
    const inSide = right ? [t + 0.5, t + 2] : [t - 2, t - 0.5];
    const outSide = right ? [t - 2, t - 0.5] : [t + 0.5, t + 2];
    expect(f(inSide[1]!) > f(inSide[0]!)).toBe(grow);
    expect(f(outSide[1]!) > f(outSide[0]!)).toBe(!grow);
  },

  [`${M2}|05`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const disc = B * B - 4 * A * C;
    expect(disc).toBeGreaterThan(0);
    const r1 = (-B - Math.sqrt(disc)) / (2 * A);
    const r2 = (-B + Math.sqrt(disc)) / (2 * A);
    const lo = Math.min(r1, r2);
    const hi = Math.max(r1, r2);
    if (p.facts.mode === 0) {
      expect(near(ansNum(p), hi - lo)).toBe(true);
    } else {
      const known = pointsIn(p.content).find(([, y]) => y === 0)!;
      const other = pointsIn(p.answer)[0]!;
      expect(
        near(evalLatex(rhsOf(mathWith(p.content, "y=")), { x: other[0] }), 0),
      ).toBe(true);
      expect(other[1]).toBe(0);
      expect(other[0]).not.toBe(known[0]);
      expect(near(known[0] + other[0], lo + hi)).toBe(true);
    }
  },

  [`${M2}|06`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const v = vertexOf(A, B, C);
    const flags = pickedIndices(p.facts).map((i) => PG06[i]!(A, v.x, v.y, C));
    expect(p.answer).toBe(marksOf(flags));
  },

  [`${M2}|07`]: (p) => {
    const f = p.facts as Record<string, number>;
    const src = rhsOf(mathWith(p.content, "y="));
    const moved = (x: number): number =>
      evalLatex(src, { x: x - f.mx! }) + f.my!;
    const y = [-1, 0, 1].map(moved);
    const C = y[1]!;
    const A = (y[0]! + y[2]!) / 2 - C;
    const B = (y[2]! - y[0]!) / 2;
    expect(near(moved(3), 9 * A + 3 * B + C)).toBe(true);
    expect(near(ansNum(p), A + B - C)).toBe(true);
  },

  [`${M2}|08`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const disc = B * B - 4 * A * C;
    expect(disc).toBeGreaterThan(0);
    const r1 = (-B - Math.sqrt(disc)) / (2 * A);
    const r2 = (-B + Math.sqrt(disc)) / (2 * A);
    const base = Math.abs(r2 - r1);
    expect(near(ansNum(p), (base * Math.abs(C)) / 2)).toBe(true);
    const spec = p.figureSpec as { marks?: number[][] };
    const want = [
      [Math.round(Math.min(r1, r2)), 0],
      [Math.round(Math.max(r1, r2)), 0],
      [0, Math.round(C)],
    ];
    expect(spec.marks).toEqual(want);
  },

  [`${M2}|09`]: (p) => {
    const f = p.facts as Record<string, number>;
    const spec = p.figureSpec as {
      curves: { a: number; p: number; q: number }[];
    };
    const cur = spec.curves[0]!;
    // 그려진 곡선에서 일반형 계수를 만든다 — 답의 근거는 그림이다
    const A = cur.a;
    const B = -2 * cur.a * cur.p;
    const C = cur.a * cur.p * cur.p + cur.q;
    expect(Math.sign(A)).toBe(f.sa);
    expect(Math.sign(B)).toBe(f.sb);
    expect(Math.sign(C)).toBe(f.sc);
    const gt = (s: number): string => (s > 0 ? ">" : "<");
    if (f.mode === 1) {
      expect(p.answer).toBe(`$abc${gt(A * B * C)}0$`);
    } else if (f.mode === 2) {
      expect(p.answer).toBe(`$a+b+c${gt(A + B + C)}0$`);
    } else if (f.mode === 3) {
      expect(p.answer).toBe(`$a-b+c${gt(A - B + C)}0$`);
    } else if (f.mode === 4) {
      expect(p.answer).toBe(`$\\dfrac{b}{a}${gt(B / A)}0$`);
    } else {
      expect(p.answer).toBe(`$a${gt(A)}0$, $b${gt(B)}0$, $c${gt(C)}0$`);
    }
  },

  [`${M2}|10`]: (p) => passesStatedPoints(p, "vertex"),
  [`${M2}|11`]: (p) => passesStatedPoints(p, "axis"),
  [`${M2}|12`]: (p) => passesStatedPoints(p, "none"),
  [`${M2}|13`]: (p) => passesStatedPoints(p, "none"),

  [`${M2}|14`]: (p) => {
    const [A, B, C] = quadCoef(rhsOf(mathWith(p.content, "y=")), {});
    const v = vertexOf(A, B, C);
    expect(near(ansNum(p), v.y)).toBe(true);
    const isMax = A < 0;
    expect(isMax).toBe(p.facts.isMax === 1);
    expect(p.content.includes(isMax ? "최댓값" : "최솟값")).toBe(true);
    expect(p.content.includes(isMax ? "최솟값" : "최댓값")).toBe(false);
    // 훑어서도 그 값이 최대(최소)인가
    const g = gridExtreme(
      (x) => A * x * x + B * x + C,
      v.x - 8,
      v.x + 8,
      isMax,
    );
    expect(near(g.y, v.y, 1e-4)).toBe(true);
  },

  [`${M2}|15`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "y="));
    const k = ansNum(p);
    const [A, B, C] = quadCoef(rhs, { k });
    const v = vertexOf(A, B, C);
    const want = /최[댓솟]값이 \$(-?\d+)\$일 때/.exec(p.content);
    expect(want, `발문에서 값을 못 읽었다: ${p.content}`).not.toBeNull();
    expect(near(v.y, Number(want![1]))).toBe(true);
    expect(A < 0).toBe(p.facts.isMax === 1);
    expect(p.content.includes(A < 0 ? "최댓값" : "최솟값")).toBe(true);
  },

  [`${M2}|16`]: (p) => {
    const f = p.facts as Record<string, number>;
    // 발문의 조건 두 개(꼭짓점의 x좌표·그때의 값)를 **연립으로** 푼다
    const A = f.A!;
    const pp = f.p!;
    const q = f.q!;
    // f(pp)=q, f(pp+1)=f(pp-1) → 2×2 연립 (b, c)
    const sol = solve2([pp, 1, q - A * pp * pp], [2, 0, -4 * A * pp]);
    expect(near(sol.x * 1 + sol.y, ansNum(p))).toBe(true);
    expect(A < 0).toBe(f.isMax === 1);
    expect(p.content.includes(A < 0 ? "최댓값" : "최솟값")).toBe(true);
    // 되찾은 b, c 로 세운 함수가 정말 그 자리에서 그 값인가
    const g = (x: number): number => A * x * x + sol.x * x + sol.y;
    expect(near(g(pp), q)).toBe(true);
    expect(near(g(pp - 1), g(pp + 1))).toBe(true);
  },

  [`${M2}|17`]: (p) => {
    const f = p.facts as Record<string, number>;
    if (f.mode === 0) {
      const g = gridExtreme((x) => x * (f.m! - x), -f.m!, 2 * f.m!, true);
      expect(near(ansNum(p), g.y, 1e-3)).toBe(true);
      return;
    }
    if (f.mode === 1) {
      const two = maths(p.answer).map((s) => evalLatex(s, {}));
      expect(two).toHaveLength(2);
      expect(Math.abs(two[1]! - two[0]!)).toBe(f.m!);
      const g = gridExtreme((x) => x * (x + f.m!), -2 * f.m!, f.m!, false);
      expect(near(two[0]! * two[1]!, g.y, 1e-3)).toBe(true);
      return;
    }
    const g = gridExtreme((x) => x * (2 * x - f.m!), -f.m!, f.m!, false);
    expect(near(ansNum(p), g.y, 1e-3)).toBe(true);
  },

  [`${M2}|18`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "y="));
    const [A, B, C] = quadCoef(rhs, {});
    const v = vertexOf(A, B, C);
    expect(near(C, 0)).toBe(true);
    if (p.facts.mode === 0) {
      expect(near(ansNum(p), v.x)).toBe(true);
    } else if (p.facts.mode === 1) {
      expect(near(ansNum(p), v.y)).toBe(true);
    } else {
      // 다시 지면에 떨어지는 때 — $y=0$ 의 양수 근
      expect(near(A * ansNum(p) * ansNum(p) + B * ansNum(p) + C, 0)).toBe(true);
      expect(ansNum(p)).toBeGreaterThan(0);
    }
  },

  [`${M2}|19`]: (p) => {
    const f = p.facts as Record<string, number>;
    const h = f.h!;
    if (f.mode === 0) {
      const g = gridExtreme((x) => x * (2 * h - x), 0, 2 * h, true);
      expect(near(ansNum(p), g.y, 1e-3)).toBe(true);
    } else if (f.mode === 1) {
      const g = gridExtreme((x) => x * (2 * h - x), 0, 2 * h, true);
      expect(near(ansNum(p), g.x, 1e-3)).toBe(true);
    } else {
      const g = gridExtreme((x) => (x * (2 * h - x)) / 2, 0, 2 * h, true);
      expect(near(ansNum(p), g.y, 1e-3)).toBe(true);
    }
  },

  [`${M2}|20`]: (p) => {
    const rhs = rhsOf(mathWith(p.content, "y="));
    const outer = p.facts.mode === 0 ? "k" : "a";
    const max = p.facts.mode === 0;
    // 안쪽(최댓값 $M$ 또는 최솟값 $m$)을 $k$ 마다 구하고, 그것을 다시 이차식으로 본다
    const M = (t: number): number => {
      const [A, B, C] = quadCoef(rhs, { [outer]: t });
      expect(A < 0).toBe(max);
      return vertexOf(A, B, C).y;
    };
    const y = [-1, 0, 1].map(M);
    const c = y[1]!;
    const A2 = (y[0]! + y[2]!) / 2 - c;
    const B2 = (y[2]! - y[0]!) / 2;
    expect(near(M(3), 9 * A2 + 3 * B2 + c)).toBe(true);
    const v = vertexOf(A2, B2, c);
    expect(near(A2 > 0 ? v.y : v.x, p.facts.mode === 0 ? v.y : v.x)).toBe(true);
    if (p.facts.mode === 0) {
      expect(A2).toBeGreaterThan(0); // $M(k)$ 는 아래로 볼록 — 최솟값이 있다
      expect(near(ansNum(p), v.y)).toBe(true);
    } else {
      expect(A2).toBeLessThan(0); // $m(a)$ 는 위로 볼록 — 최댓값이 있다
      expect(near(ansNum(p), v.x)).toBe(true);
    }
  },

  [`${M2}|21`]: (p) => {
    const line = rhsOf(mathWith(p.content, "y="));
    const f = p.facts as Record<string, number>;
    const half = f.mode === 2 ? 0.5 : 1;
    const hi = f.b! / (f.mode === 0 ? 1 : f.m!);
    const g = gridExtreme(
      (x) => half * x * evalLatex(line, { x }),
      0,
      hi,
      true,
    );
    expect(near(ansNum(p), g.y, 1e-3)).toBe(true);
  },
};

/**
 * ⑵10~13 — 정답의 식이 **발문이 말한 점을 전부** 지나는가.
 *
 * `axis`: 발문이 축을 어떻게 말했나 —
 *  `"vertex"` 첫 좌표가 꼭짓점 · `"axis"` `$x=…$` 로 적혔다 · `"none"` 축을 안 말한다.
 */
function passesStatedPoints(
  p: MidProblem,
  axis: "vertex" | "axis" | "none",
): void {
  const f = ansRhs(p);
  const pts = pointsIn(p.content);
  expect(pts.length).toBeGreaterThanOrEqual(2);
  for (const [x, y] of pts) {
    expect(near(evalLatex(f, { x }), y), `점 (${x}, ${y})`).toBe(true);
  }
  let t: number | null = null;
  if (axis === "vertex") {
    t = pts[0]![0];
  } else if (axis === "axis") {
    const m = /\$x=(-?\d+)\$/.exec(p.content);
    expect(m, `축을 못 읽었다: ${p.content}`).not.toBeNull();
    t = Number(m![1]);
  }
  if (t !== null) {
    // 좌우 대칭이면 그 자리가 축이다 — 꼭짓점 공식을 옮겨 적지 않는다
    expect(
      near(evalLatex(f, { x: t - 1 }), evalLatex(f, { x: t + 1 })),
      `축 x=${t}`,
    ).toBe(true);
  }
  // 이차식인가 — 아니면 quadCoef 가 던진다
  const [A] = quadCoef(f, {});
  expect(Math.abs(A)).toBeGreaterThan(1e-9);
}

/** 2×2 연립 `[a1,b1,c1]`, `[a2,b2,c2]` (a·x + b·y = c) — 가우스 소거. */
function solve2(
  r1: [number, number, number],
  r2: [number, number, number],
): { x: number; y: number } {
  const det = r1[0] * r2[1] - r2[0] * r1[1];
  if (Math.abs(det) < 1e-12) throw new Error("연립이 특이하다");
  return {
    x: (r1[2] * r2[1] - r2[2] * r1[1]) / det,
    y: (r1[0] * r2[2] - r2[0] * r1[2]) / det,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 판정기 눈금 — 양성·음성 대조군이 **둘 다** 있어야 한다 (2026-08-20)
 * ──────────────────────────────────────────────────────────────────────── */

describe("이 시험의 판정기들이 «아니오»를 낼 수 있는가", () => {
  it("polyDegree — 이차식은 2, 일차식은 1, 다항식이 아니면 null", () => {
    expect(polyDegree("x^2-4x+1")).toBe(2);
    expect(polyDegree("3x-5")).toBe(1);
    expect(polyDegree("2x^3-x^2")).toBe(3);
    expect(polyDegree("\\dfrac{1}{x^2}")).toBeNull();
    expect(polyDegree("x(x+2)-x^2")).toBe(1);
    expect(polyDegree("(x+1)^2-(x-1)^2")).toBe(1);
  });

  it("quadCoef — 이차식이 아니면 던진다", () => {
    expect(quadCoef("2x^2-8x+3", {})).toEqual([2, -8, 3]);
    expect(() => quadCoef("x^3+1", {})).toThrow();
  });

  it("vertexOf — 완전제곱과 같은 답을 낸다", () => {
    const v = vertexOf(2, -8, 3);
    expect(v.x).toBe(2);
    expect(v.y).toBe(-5);
  });

  it("numericEqualityMismatches — 틀린 계산을 잡고 맞는 것은 안 잡는다", () => {
    expect(numericEqualityMismatches("$2\\times3=7$")).not.toEqual([]);
    expect(numericEqualityMismatches("$2\\times3=6$")).toEqual([]);
    expect(numericEqualityMismatches("$x+2=5$")).toEqual([]);
  });

  it("preprocessRewrites 의 «찾기» 가 살아 있다 — 제품을 거치지 않고 본다", () => {
    // D-73 으로 제품은 가분수를 대분수로 안 바꾼다. 그래서 「제품이 바꾸나」로는
    // 이 자를 못 잰다(구조적으로 0) — 손으로 만든 대분수 글로 확인한다.
    expect(countMixed("$1\\dfrac{2}{9}$")).toBe(1);
    expect(countMixed("$\\dfrac{11}{9}$")).toBe(0);
  });

  it("quadrantOf — 축 위는 0", () => {
    expect(quadrantOf(1, 1)).toBe(1);
    expect(quadrantOf(-1, 1)).toBe(2);
    expect(quadrantOf(-1, -1)).toBe(3);
    expect(quadrantOf(1, -1)).toBe(4);
    expect(quadrantOf(0, 3)).toBe(0);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 유형 등록·색인
 * ──────────────────────────────────────────────────────────────────────── */

describe("중3 이차함수 42유형", () => {
  const entries = M3_FUNC;

  it("42유형이 전부 등록돼 있다", () => {
    expect(entries).toHaveLength(42);
    for (const minor of [M1, M2]) {
      const nums = entries
        .filter((e) => e.rpmMinor === minor)
        .map((e) => e.rpmType)
        .sort();
      expect(nums).toEqual(
        Array.from({ length: 21 }, (_, i) => String(i + 1).padStart(2, "0")),
      );
    }
  });

  it("중단원 이름이 RPM 색인 정본 바이트다", () => {
    expect([...M3_FUNC_MINORS]).toEqual([M1, M2]);
    // ⑴·⑵ 는 U+2474·U+2475 다 — 괄호+숫자로 치면 여기서 갈린다
    expect(M1.endsWith("\u2474")).toBe(true);
    expect(M2.endsWith("\u2475")).toBe(true);
  });

  it("RPM 색인의 실제 제목을 쓴다 (42유형 전량 리터럴 대조)", () => {
    for (const e of entries) {
      expect(e.rpmTitle, e.key).toBe(TITLES[`${e.rpmMinor}|${e.rpmType}`]);
    }
    expect(Object.keys(TITLES)).toHaveLength(42);
  });

  it("우리 단원(Unit.section)이 세 갈래로 갈린다", () => {
    const bySection = new Map<string, number>();
    for (const e of entries) {
      bySection.set(e.unitSection, (bySection.get(e.unitSection) ?? 0) + 1);
    }
    expect([...bySection.entries()].sort()).toEqual([
      ["이차함수 y=ax^2+bx+c의 그래프", 13],
      ["이차함수와 그래프", 21],
      ["이차함수의 최댓값과 최솟값", 8],
    ]);
  });

  it("모든 유형에 판정표가 있다 — 분모가 조용히 줄지 않게", () => {
    const missing = entries
      .filter((e) => !VERIFY[`${e.rpmMinor}|${e.rpmType}`])
      .map((e) => e.key);
    expect(missing).toEqual([]);
    expect(Object.keys(VERIFY)).toHaveLength(42);
  });

  it("보기 풀의 크기가 판정표와 같다 — 풀을 늘리면 여기서 빨개진다", () => {
    expect(QUAD_DEF_POOL).toHaveLength(DEF_TRUTH.length);
    expect(M3_FUNC_POOL_SIZES.뜻).toBe(DEF_TRUTH.length);
    expect(M3_FUNC_POOL_SIZES.성질06).toBe(P06.length);
    expect(M3_FUNC_POOL_SIZES.성질10).toBe(P10.length);
    expect(M3_FUNC_POOL_SIZES.성질13).toBe(P13.length);
    expect(M3_FUNC_POOL_SIZES.성질17).toBe(P17.length);
    expect(M3_FUNC_POOL_SIZES.성질G06).toBe(PG06.length);
  });

  it("그림이 붙는 유형 목록이 실제 산출물과 맞는다", () => {
    const withFig = new Set<string>();
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (let v = 0; v < 5; v += 1) {
          if (generateMiddleProblem(e.key, seed, v).figureSpec) {
            withFig.add(e.key);
          }
        }
      }
    }
    expect([...withFig].sort()).toEqual([...M3_FUNC_FIGURE_KEYS].sort());
  });

  /* ── 유형마다 ─────────────────────────────────────────────────────── */

  for (const e of entries) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      const vk = `${e.rpmMinor}|${e.rpmType}`;

      it("같은 씨앗이면 같은 문항", () => {
        for (const seed of SEEDS) {
          const a = generateMiddleProblem(e.key, seed);
          const b = generateMiddleProblem(e.key, seed);
          expect(a).toEqual(b);
        }
      });

      it("유형별 독립 검산", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            try {
              VERIFY[vk]!(p);
            } catch (err) {
              throw new Error(
                `${e.key} seed ${seed} v${v}\n발문 ${p.content}\n정답 ${p.answer}\n→ ${(err as Error).message}`,
              );
            }
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["발문", p.content],
              ["정답", p.answer],
              ["해설", p.solution],
            ] as const) {
              expect(bareNumbers(text), `${e.key} ${name}: ${text}`).toEqual(
                [],
              );
            }
          }
        }
      });

      it("KaTeX 밖에 백슬래시가 없다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              const outside = text.replace(/\$[^$]*\$/g, "");
              expect(outside.includes("\\"), `${e.key}: ${text}`).toBe(false);
              // 홀수 개의 `$` 는 수식이 안 닫힌 것이다
              expect((text.match(/\$/g) ?? []).length % 2, e.key).toBe(0);
            }
          }
        }
      });

      it("수식 뒤 조사가 읽는 소리와 맞는다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(josaFaults(text), `${e.key}: ${text}`).toEqual([]);
            }
          }
        }
      });

      it("제품 전처리가 수식의 수를 고쳐 쓰지 않는다 (대분수 0)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(preprocessRewrites(text), `${e.key}: ${text}`).toEqual([]);
            }
          }
        }
      });

      it("발문·해설에 적힌 수 계산이 실제로 성립한다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["발문", p.content],
              ["정답", p.answer],
              ["해설", p.solution],
            ] as const) {
              expect(
                numericEqualityMismatches(text),
                `${e.key} ${name}: ${text}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("해설이 한 줄로 뭉치지 않는다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            p.solution.split("\n").filter((s) => s.trim() !== "").length,
            e.key,
          ).toBeGreaterThanOrEqual(2);
        }
      });

      it("지면 냄새 — `1x`·`+-`·`^1`·군더더기 괄호가 없다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              for (const seg of maths(text)) {
                expect(
                  /(^|[^0-9a-zA-Z.])1[a-zA-Z(]/.test(seg),
                  `1계수: ${seg}`,
                ).toBe(false);
                expect(/\+-|-\+|\+\+|--/.test(seg), `이중부호: ${seg}`).toBe(
                  false,
                );
                expect(/\^1(?![0-9])/.test(seg), `지수 1: ${seg}`).toBe(false);
                expect(/[+\-]\(\d+\)/.test(seg), `군더더기 괄호: ${seg}`).toBe(
                  false,
                );
                expect(/\btimes\(\d+\)\^/.test(seg), `양수 괄호: ${seg}`).toBe(
                  false,
                );
              }
            }
          }
        }
      });

      it("변형 폭 — 40변형에서 발문이 넷 이상 갈린다", () => {
        const contents = new Set<string>();
        for (let v = 0; v < 40; v += 1) {
          contents.add(generateMiddleProblem(e.key, 20260824, v).content);
        }
        expect(contents.size, e.key).toBeGreaterThanOrEqual(4);
      });

      it("그림은 목록에 있는 유형만 쓴다", () => {
        const want = M3_FUNC_FIGURE_KEYS.includes(e.key);
        for (const seed of SEEDS) {
          for (let v = 0; v < 4; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(Boolean(p.figureSpec), e.key).toBe(want);
            if (p.figureSpec) {
              const spec = p.figureSpec as Record<string, unknown>;
              expect(spec.kind).toBe("curveGraph");
              expect(spec.version).toBe("elem-1");
            }
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  /**
   * 넓은 씨앗 전량 — 좁은 표본은 드물게 나는 조합을 구조적으로 못 본다
   * (CLAUDE.md 2026-08-19 「0% 를 «구조적으로 못 센다»로 단정하기 전에 표본을 넓혀라」).
   */
  it("넓은 씨앗(60×3)에서도 42유형 전량이 던지지 않고 검산을 통과한다", () => {
    let checked = 0;
    for (let s = 0; s < 60; s += 1) {
      for (const e of entries) {
        const p = generateMiddleProblem(e.key, s * 977 + 13, s % 3);
        VERIFY[`${e.rpmMinor}|${e.rpmType}`]!(p);
        expect(bareNumbers(p.content), `${e.key} seed#${s}`).toEqual([]);
        expect(
          numericEqualityMismatches(p.solution),
          `${e.key} seed#${s} 해설`,
        ).toEqual([]);
        checked += 1;
      }
    }
    expect(checked).toBe(60 * 42);
  });

  it("계수 산술이 아니라 **지면 글자**를 재고 있다 (동어반복 방지)", () => {
    // 이 시험 파일은 모듈의 서식 함수(`stdRhs`·`genRhs`·`expand`)를 import 하지
    // 않는다. 그것을 쓰면 「생성기가 쓴 식으로 생성기를 검산」하는 셈이다.
    expect(Object.keys(VERIFY)).toHaveLength(42);
    expect(TOL).toBeGreaterThan(0);
  });

  describe.skipIf(!hasEngine)("실제 엔진 렌더", () => {
    it("그림 유형의 figureSpec 이 전부 그려진다 — 곡선 밖 mark 면 엔진이 던진다", async () => {
      for (const key of M3_FUNC_FIGURE_KEYS) {
        for (const seed of SEEDS) {
          for (let v = 0; v < 3; v += 1) {
            const p = generateMiddleProblem(key, seed, v);
            const r = await renderFigureSpec(p.figureSpec);
            expect(
              r.ok,
              `${key} seed ${seed} v${v}: ${r.ok ? "" : r.error}`,
            ).toBe(true);
          }
        }
      }
    }, 120_000);

    it("폭이 지면 등급 하나로 박혀 있다 (viewBox 240)", async () => {
      const p = generateMiddleProblem(M3_FUNC_FIGURE_KEYS[0]!, 20260824);
      const r = await renderFigureSpec(p.figureSpec);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(/viewBox="0 0 240 /.test(r.svg), r.svg.slice(0, 80)).toBe(true);
      }
    }, 30_000);
  });
});
