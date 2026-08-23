/**
 * 중3 「삼각비」 32유형 (RPM 3-2 삼각비 18 + 삼각비의 활용 14) — 독립 검산.
 *
 * ## 이 시험이 무엇을 «다르게» 재는가
 *
 * 생성기는 **정확한 무리수 대수**(`Surd`)와 피타고라스 세 쌍으로 답을 만든다.
 * 이 시험은 그 대수를 **한 줄도 안 쓴다** — `facts`(발문의 원 수치)에서
 * **부동소수 삼각함수**(`Math.sin`·`Math.atan2`)와 코사인·사인법칙으로 답을 다시
 * 유도한다. 같은 식을 옮겨 적으면 동어반복이라 아무것도 못 잡는다.
 * (실제로 2026-08-23 에 `surdDiv` 가 `d2`·`r2` 를 빠뜨려 `20÷\cos 30^\circ` 를
 *  `20\sqrt{3}` 으로 냈다 — 45° 계열에서만 우연히 맞아 값 비교로만 갈린다.)
 *
 * 그리고 **정답 문자열을 직접 파싱해 값을 잰다**(`latexValue`). `facts` 가 맞아도
 * 지면에 나가는 글자가 틀릴 수 있기 때문이다. 파서 자체도 양성·음성 대조군으로
 * 먼저 시험한다 — 판정기의 성적표에는 둘 다 있어야 한다(CLAUDE.md 2026-08-20).
 *
 * ## 분모를 지킨다
 *
 * `registeredTypes()` 를 중단원 이름으로 거르지 않는다 — 같은 중단원의 **남의
 * 유형**을 쓸어 담는다(물결 2 에서 실제로 났다). `M3_TRIG` 를 직접 돈다.
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M3_TRIG, M3_TRIG_MINORS } from "../../lib/middle/m3Trig";
import type { MidProblem } from "../../lib/middle/types";
import { preprocessMathText } from "../../lib/math/textPreprocess";

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31415];
const DEG = Math.PI / 180;
const EPS = 1e-9;

type F = Record<string, number>;

const SIN = (d: number): number => Math.sin(d * DEG);
const COS = (d: number): number => Math.cos(d * DEG);
const TAN = (d: number): number => Math.tan(d * DEG);
/** `fn` 0=sin · 1=cos · 2=tan — 발문의 색인과 같은 순서. */
const TRIG = (fn: number, deg: number): number => [SIN, COS, TAN][fn]!(deg);
const near = (a: number, b: number, tol = 1e-9): boolean =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/* ────────────────────────────────────────────────────────────────────────
 * 정답 문자열 파서 — 지면에 나가는 «글자»의 값을 잰다
 * ──────────────────────────────────────────────────────────────────────── */

/** 최상위(중괄호 깊이 0)의 `+`/`-` 로 항을 자른다. */
function splitSigned(t: string): { sign: number; body: string }[] {
  const out: { sign: number; body: string }[] = [];
  let depth = 0;
  let start = 0;
  let sign = 1;
  if (t.startsWith("-")) {
    sign = -1;
    start = 1;
  }
  for (let i = start; i < t.length; i += 1) {
    const c = t[i]!;
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (depth === 0 && (c === "+" || c === "-") && i > start) {
      out.push({ sign, body: t.slice(start, i) });
      sign = c === "+" ? 1 : -1;
      start = i + 1;
    }
  }
  out.push({ sign, body: t.slice(start) });
  return out;
}

function stripWrap(raw: string): string {
  let t = raw
    .replace(/^\$/, "")
    .replace(/\$$/, "")
    .replace(/\\,\(?\\mathrm\{[a-z]+\}(\^2)?\)?/g, "")
    .replace(/\^\\circ/g, "")
    .trim();
  if (t.startsWith("(") && t.endsWith(")")) t = t.slice(1, -1);
  return t;
}

/** 최상위 `\\times`·`\\div` 로 인수를 자른다. 앞선 연산이 나눗셈이면 `div`. */
function splitFactors(t: string): { div: boolean; body: string }[] {
  const out: { div: boolean; body: string }[] = [];
  let depth = 0;
  let start = 0;
  let div = false;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i]!;
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (depth === 0 && c === "\\") {
      if (t.startsWith("\\times", i)) {
        out.push({ div, body: t.slice(start, i) });
        div = false;
        start = i + 6;
        i += 5;
      } else if (t.startsWith("\\div", i)) {
        out.push({ div, body: t.slice(start, i) });
        div = true;
        start = i + 4;
        i += 3;
      }
    }
  }
  out.push({ div, body: t.slice(start) });
  return out;
}

/** `t[open]` 이 `{` 일 때 짝이 되는 `}` 의 색인. 없으면 `-1`. */
function matchBrace(t: string, open: number): number {
  let depth = 0;
  for (let i = open; i < t.length; i += 1) {
    if (t[i] === "{") depth += 1;
    else if (t[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * `\\dfrac{A}{B}` · `n\\sqrt{r}` · 순수한 수.
 *
 * ⚠️ 분수는 **중괄호 짝을 세어** 가른다. 정규식 하나로는
 * `\\dfrac{6}{\\dfrac{\\sqrt{3}}{2}}` 처럼 **중첩된 분수**를 엉뚱하게 갈라
 * 「못 읽는 항」으로 만든다 — 그러면 등식 검사가 그 줄을 **조용히 건너뛴다**
 * (2026-08-23: 양성 대조군이 그래서 안 걸렸다).
 */
function parseAtom(body: string): number {
  const t = body.trim();
  if (t.startsWith("\\dfrac{")) {
    const a = matchBrace(t, 6);
    if (a > 0 && t[a + 1] === "{") {
      const b = matchBrace(t, a + 1);
      if (b === t.length - 1) {
        return parseExpr(t.slice(7, a)) / parseExpr(t.slice(a + 2, b));
      }
    }
    throw new Error(`분수를 못 읽었다: ${body}`);
  }
  const r = t.match(/^(\d*)\\sqrt\{(\d+)\}$/);
  if (r) return (r[1] ? Number(r[1]) : 1) * Math.sqrt(Number(r[2]));
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  throw new Error(`알 수 없는 항: ${body}`);
}

function parseProduct(t: string): number {
  let acc = 1;
  let first = true;
  for (const f of splitFactors(t)) {
    const v = parseAtom(f.body);
    acc = first ? (f.div ? 1 / v : v) : f.div ? acc / v : acc * v;
    first = false;
  }
  return acc;
}

function parseExpr(t: string): number {
  const s = t.trim();
  if (s === "0") return 0;
  return splitSigned(s).reduce(
    (u, { sign, body }) => u + sign * parseProduct(body),
    0,
  );
}

/** `$(12-4\sqrt{3})\,\mathrm{cm}$` 같은 정답의 수. 모르는 모양이면 **던진다**. */
function latexValue(raw: string): number {
  return parseExpr(stripWrap(raw));
}

/**
 * 해설·발문에 적힌 **등식이 실제로 성립하는가**. `$a=b=c$` 를 `=` 로 갈라
 * **둘 다 수로 읽히는 이웃 쌍만** 견준다(`\overline{AB}`·`\sin 30^\circ` 처럼
 * 못 읽는 쪽은 건너뛴다).
 *
 * 왜 필요한가: 값(`facts`)과 정답이 맞아도 **해설의 계산 줄이 틀릴 수 있다.**
 * 2026-08-23 변이 시험에서 활용 05 의 「가까운 각」을 「먼 각」으로 바꾸니
 * 해설이 `\dfrac{6}{\sin 45^\circ}=6\sqrt{2}` 대신 틀린 각으로 나눴는데
 * **다른 검사는 전부 초록**이었다 — 그 자리를 이 검사가 막는다.
 */
function equalityMismatches(text: string): string[] {
  const out: string[] = [];
  for (const seg of text.match(/\$[^$]*\$/g) ?? []) {
    const parts = seg.slice(1, -1).split("=");
    if (parts.length < 2) continue;
    let prev: number | null = null;
    let prevRaw = "";
    for (const part of parts) {
      let v: number | null = null;
      try {
        v = latexValue(part);
      } catch {
        v = null;
      }
      if (v !== null && prev !== null && !near(v, prev, 1e-6)) {
        out.push(`${prevRaw.trim()} = ${part.trim()} → ${prev} vs ${v}`);
      }
      prev = v;
      prevRaw = part;
    }
  }
  return out;
}

/** `$2\cos A$` 처럼 `c0 ± c\sin A ± c\cos A ± c\tan A` 꼴을 각 `deg` 에서 잰다. */
function trigLinearValue(raw: string, deg: number): number {
  const t = stripWrap(raw);
  if (t === "0") return 0;
  return splitSigned(t).reduce((u, { sign, body }) => {
    const m = body.match(/^(\d*)\\(sin|cos|tan) A$/);
    if (m) {
      const coef = m[1] ? Number(m[1]) : 1;
      const fn = { sin: 0, cos: 1, tan: 2 }[m[2] as "sin" | "cos" | "tan"];
      return u + sign * coef * TRIG(fn, deg);
    }
    return u + sign * parseProduct(body);
  }, 0);
}

/* ────────────────────────────────────────────────────────────────────────
 * 전처리 판정기 — 지면이 수를 고쳐 쓰는가
 * ──────────────────────────────────────────────────────────────────────── */

const MIXED = /(?:^|[^\d.])(\d{1,4})\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;
const FRAC = /\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;
const countMixed = (s: string): number => [...s.matchAll(MIXED)].length;
const countFrac = (s: string): number => [...s.matchAll(FRAC)].length;

/** 제품 전처리가 이 문자열의 «수»를 고쳐 쓰는 자리. */
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
 * 그림 — 스펙의 점을 풀어 불변식을 잰다
 * ──────────────────────────────────────────────────────────────────────── */

type XY = [number, number];

function resolvePoints(spec: Record<string, unknown>): Record<string, XY> {
  const circles = (spec.circles ?? {}) as Record<
    string,
    { center: string; radius: number }
  >;
  const raw = spec.points as Record<string, unknown>;
  const out: Record<string, XY> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) out[k] = [Number(v[0]), Number(v[1])];
  }
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) continue;
    const o = v as { type: string; circle: string; angle: number };
    if (o.type !== "on_circle") throw new Error(`모르는 점 종류: ${o.type}`);
    const c = circles[o.circle]!;
    const center = out[c.center]!;
    // 엔진 `circle_pt` 규약: 수학각(도) + y-down 보정.
    out[k] = [
      center[0] + c.radius * Math.cos(o.angle * DEG),
      center[1] - c.radius * Math.sin(o.angle * DEG),
    ];
  }
  return out;
}

/**
 * 스펙의 좌표는 소수 둘째 자리에서 끊는다(`r2`) — 직각의 코사인이 정확히 0이
 * 되지 않고 **반올림 잡음**만큼 뜬다(실측 최대 1.1e-4 ≈ 0.006°). 문턱은 그
 * 잡음 위, «진짜 틀린 각»(다른 점을 가리키면 0.1~1) 아래로 잡는다.
 */
const RIGHT_TOL = 2e-3;

/** `right: true` 인 각마다 두 반직선이 이루는 각의 코사인. */
function rightAngleCosines(spec: Record<string, unknown>): [string, number][] {
  const pts = resolvePoints(spec);
  const angles = (spec.angles ?? {}) as Record<
    string,
    { vertex: string; points: [string, string]; right?: boolean }
  >;
  const out: [string, number][] = [];
  for (const [name, a] of Object.entries(angles)) {
    if (!a.right) continue;
    const V = pts[a.vertex]!;
    const P = pts[a.points[0]]!;
    const Q = pts[a.points[1]]!;
    const dot = (P[0] - V[0]) * (Q[0] - V[0]) + (P[1] - V[1]) * (Q[1] - V[1]);
    const norm =
      Math.hypot(P[0] - V[0], P[1] - V[1]) *
      Math.hypot(Q[0] - V[0], Q[1] - V[1]);
    out.push([name, dot / norm]);
  }
  return out;
}

function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/** 스펙의 모든 글자(점 라벨·각 라벨)에서 수를 긁는다. */
function labelNumbers(spec: Record<string, unknown>): number[] {
  const out: number[] = [];
  const push = (text: string): void => {
    for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  };
  for (const [k, v] of Object.entries(
    (spec.labels ?? {}) as Record<string, string>,
  )) {
    if (k.startsWith("n_")) push(v);
  }
  for (const a of Object.values(
    (spec.angles ?? {}) as Record<string, { label?: string }>,
  )) {
    if (typeof a.label === "string" && /^\d+(\.\d+)?°$/.test(a.label)) {
      push(a.label);
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────
 * 유형별 독립 검산 — `facts` 로 «다른 식»을 세운다
 * ──────────────────────────────────────────────────────────────────────── */

const T = "3-2|삼각비";
const A = "3-2|삼각비의 활용";

/** 활용 15 의 원식 — 시험이 따로 들고 있는 «간단히 하기 전» 식. */
const EXPR15: { latex: string; f: (deg: number) => number }[] = [
  {
    latex: "\\sqrt{(\\sin A-\\cos A)^2}+\\sqrt{(\\sin A+\\cos A)^2}",
    f: (d) =>
      Math.sqrt((SIN(d) - COS(d)) ** 2) + Math.sqrt((SIN(d) + COS(d)) ** 2),
  },
  {
    latex: "\\sqrt{(\\sin A-\\cos A)^2}+\\sqrt{(\\sin A+\\cos A)^2}",
    f: (d) =>
      Math.sqrt((SIN(d) - COS(d)) ** 2) + Math.sqrt((SIN(d) + COS(d)) ** 2),
  },
  {
    latex: "\\sqrt{(\\tan A-1)^2}-\\sqrt{(1-\\tan A)^2}",
    f: (d) => Math.sqrt((TAN(d) - 1) ** 2) - Math.sqrt((1 - TAN(d)) ** 2),
  },
  {
    latex: "\\sqrt{(1-\\sin A)^2}+\\sqrt{(\\sin A-1)^2}",
    f: (d) => Math.sqrt((1 - SIN(d)) ** 2) + Math.sqrt((SIN(d) - 1) ** 2),
  },
  {
    latex: "\\sqrt{(\\cos A-\\sin A)^2}-\\sqrt{(\\cos A+\\sin A)^2}",
    f: (d) =>
      Math.sqrt((COS(d) - SIN(d)) ** 2) - Math.sqrt((COS(d) + SIN(d)) ** 2),
  },
];

const VERIFY: Record<string, (f: F) => boolean> = {
  // 두 직각변 → 예각 A 를 atan2 로 되찾아 삼각비를 다시 잰다.
  [`${T}|01`]: (f) => {
    if (f.ab * f.ab + f.bc * f.bc !== f.ac * f.ac) return false;
    if (gcd(f.num, f.den) !== 1) return false;
    return near(f.num / f.den, TRIG(f.mode, Math.atan2(f.bc, f.ab) / DEG));
  },
  // 주어진 삼각비로 각을 되찾아 «주어진 변 × 그 각의 삼각비» 로 답을 다시 만든다.
  [`${T}|02`]: (f) => {
    const ang = [Math.asin, Math.acos, Math.atan][f.mode]!(f.num / f.den) / DEG;
    const want = f.mode === 0 ? SIN(ang) : f.mode === 1 ? COS(ang) : TAN(ang);
    return near(f.x, f.given * want, 1e-9);
  },
  // 한 삼각비 → 각 → 다른 삼각비.
  [`${T}|03`]: (f) => {
    if (f.p * f.p + f.q * f.q !== f.r * f.r) return false;
    const ang = Math.asin(f.p / f.r) / DEG;
    return (
      near(f.gnum / f.gden, TRIG(f.given, ang)) &&
      near(f.num / f.den, TRIG(f.want, ang))
    );
  },
  // 닮음이 옮겨 준 각 — which 0 은 ∠C, 1 은 ∠B.
  [`${T}|04`]: (f) => {
    if (f.ab * f.ab + f.ac * f.ac !== f.bc * f.bc) return false;
    const ang =
      f.which === 0
        ? Math.atan2(f.ab, f.ac) / DEG
        : Math.atan2(f.ac, f.ab) / DEG;
    return near(f.num / f.den, TRIG(f.fn, ang));
  },
  // 직각삼각형 ABH — which 0 은 ∠B, 1 은 ∠BAH(=∠C).
  [`${T}|05`]: (f) => {
    if (f.ah * f.ah + f.bh * f.bh !== f.ab * f.ab) return false;
    const ang =
      f.which === 0
        ? Math.atan2(f.ah, f.bh) / DEG
        : Math.atan2(f.bh, f.ah) / DEG;
    return near(f.num / f.den, TRIG(f.fn, ang));
  },
  // 직선의 기울기 = tan a — 계수에서 기울기를 다시 만든다.
  [`${T}|06`]: (f) => {
    if (f.p * f.p + f.q * f.q !== f.r * f.r) return false;
    const ang = Math.atan(f.p / f.q) / DEG;
    return near(f.num / f.den, TRIG(f.mode, ang));
  },
  // 직육면체 — 밑면 대각선·대각선을 다시 재고 각을 되찾는다.
  [`${T}|07`]: (f) => {
    if (f.a * f.a + f.b * f.b !== f.d * f.d) return false;
    if (f.d * f.d + f.h * f.h !== f.s * f.s) return false;
    return near(f.num / f.den, TRIG(f.mode, Math.atan2(f.h, f.d) / DEG));
  },
  // 특수각 계산 — 부동소수로 식을 그대로 계산해 정확값과 견준다.
  [`${T}|08`]: (f) => verifySpecial(f),
  [`${T}|09`]: (f) =>
    f.m * f.x + f.off === f.theta &&
    f.x > 0 &&
    f.x < 90 &&
    near((f.an * Math.sqrt(f.ar)) / f.ad, TRIG(f.fn, f.theta), 1e-12),
  // 주어진 변에서 빗변을 되찾고 구하는 변을 다시 잰다.
  [`${T}|10`]: (f) => {
    const toHyp = [COS(f.theta), SIN(f.theta), 1][f.gi]!;
    const hyp = f.given / toHyp;
    const want = hyp * [COS(f.theta), SIN(f.theta), 1][f.wi]!;
    return near(f.an * Math.sqrt(f.ar), want, 1e-9);
  },
  [`${T}|11`]: (f) => {
    if (f.mode === 0) return f.x === f.ang && near(f.x, f.ang);
    // 점 (a,b) 를 지나고 기울기가 tan(ang) 인 직선의 y절편.
    return near(f.c0 + f.c1 * Math.sqrt(f.root), f.b - f.a * TAN(f.ang), 1e-9);
  },
  // 사분원 — 선분 길이가 그 각의 삼각비여야 한다(소수 둘째 자리 반올림).
  [`${T}|12`]: (f) => {
    if (Math.abs(f.s100 / 100 - SIN(f.ang)) > 0.005) return false;
    if (Math.abs(f.c100 / 100 - COS(f.ang)) > 0.005) return false;
    if (Math.abs(f.t100 / 100 - TAN(f.ang)) > 0.005) return false;
    const want = [f.s100, f.c100, f.t100, f.s100 + f.c100, f.c100 + f.t100][
      f.mode
    ]!;
    return f.x100 === want;
  },
  [`${T}|13`]: (f) => verifySpecial(f),
  // 대소 관계 — 세 값을 실제로 재서 argmax·argmin 을 다시 고른다.
  [`${T}|14`]: (f) => {
    const v = [SIN(f.ang), COS(f.ang), TAN(f.ang)];
    let best = 0;
    for (let i = 1; i < 3; i += 1) {
      if (f.mode === 0 ? v[i]! > v[best]! : v[i]! < v[best]!) best = i;
    }
    return best === f.pick;
  },
  // 간단히 한 식이 원식과 같은 값인가 — 범위 안 여러 각에서 잰다.
  [`${T}|15`]: (f) => {
    const spec = EXPR15[f.mode]!;
    for (let i = 1; i <= 9; i += 1) {
      const d = f.lo + ((f.hi - f.lo) * i) / 10;
      const simplified = f.c0 + f.cs * SIN(d) + f.cc * COS(d) + f.ct * TAN(d);
      if (Math.abs(spec.f(d) - simplified) > 1e-9) return false;
    }
    return true;
  },
  // 삼각비의 표 — 값을 여기서 다시 계산한다(표를 옮겨 적지 않는다).
  [`${T}|16`]: (f) => {
    const at = (deg: number): number => Number(TRIG(f.fn, deg).toFixed(4));
    if (f.mode === 0) return near(f.val, at(f.target), 1e-12);
    if (f.mode === 1) {
      return near(f.val, Number((at(f.b) + at(f.b + 2)).toFixed(4)), 1e-12);
    }
    const lo = f.fn === 1 ? f.b + 2 : f.b;
    return near(f.val, Number((at(f.target) - at(lo)).toFixed(4)), 1e-12);
  },
  [`${T}|17`]: (f) => {
    if (!near(f.val, Number(TRIG(f.mode, f.ang).toFixed(4)), 1e-12))
      return false;
    return near(f.x, Number((f.given * f.val).toFixed(2)), 1e-12);
  },
  // 여각 — sin(90-a)=cos a 를 시험 쪽에서 다시 쓴다.
  [`${T}|18`]: (f) => {
    if (!near(f.sv, Number(SIN(f.a).toFixed(4)), 1e-12)) return false;
    if (!near(f.cv, Number(COS(f.a).toFixed(4)), 1e-12)) return false;
    const want = [f.sv, f.cv, Number((f.sv + f.cv).toFixed(4))][f.mode]!;
    return near(f.val, want, 1e-12);
  },

  // ── 삼각비의 활용 ────────────────────────────────────────────────
  [`${A}|01`]: (f) => {
    const adj = f.given * COS(f.theta);
    const opp = f.given * SIN(f.theta);
    if (f.mode === 0)
      return near(f.an * Math.sqrt(f.ar), (adj * opp) / 2, 1e-9);
    return near(f.c0 + f.c1 * Math.sqrt(f.root), f.given + adj + opp, 1e-9);
  },
  [`${A}|02`]: (f) => {
    const want = f.mode === 1 ? f.base / COS(f.theta) : f.base * TAN(f.theta);
    return near(f.an * Math.sqrt(f.ar), want, 1e-9);
  },
  [`${A}|03`]: (f) => {
    const want =
      f.mode === 0
        ? f.d * TAN(f.theta)
        : f.mode === 1
          ? f.d / COS(f.theta)
          : f.d * SIN(f.theta);
    return near(f.an * Math.sqrt(f.ar), want, 1e-9);
  },
  // 코사인법칙 — 생성기는 수선의 발로 계산했다. 다른 식이다.
  [`${A}|04`]: (f) => {
    const ab = f.abC * Math.sqrt(f.abR);
    const want = Math.sqrt(ab * ab + f.bc * f.bc - 2 * ab * f.bc * COS(f.ang));
    return near(f.ac, want, 1e-9);
  },
  // 사인법칙 — 생성기는 높이로 계산했다.
  [`${A}|05`]: (f) => {
    const bc = f.bcC0 + f.bcC1 * Math.sqrt(f.bcRoot);
    const angA = 180 - f.angB - f.angC;
    const want = (bc * SIN(f.ask === 0 ? f.angC : f.angB)) / SIN(angA);
    if (!near(f.an * Math.sqrt(f.ar), want, 1e-9)) return false;
    const h = bc / (1 / TAN(f.angB) + 1 / TAN(f.angC));
    return near(f.h, h, 1e-9);
  },
  [`${A}|06`]: (f) => {
    const h = f.bc / (1 / TAN(f.angB) + 1 / TAN(f.angC));
    return near(f.c0 + f.c1 * Math.sqrt(f.root), h, 1e-9);
  },
  [`${A}|07`]: (f) => {
    if (f.abc + f.outer !== 180) return false;
    const h = f.bc / (1 / TAN(f.angC) - 1 / TAN(f.outer));
    return near(f.c0 + f.c1 * Math.sqrt(f.root), h, 1e-9);
  },
  [`${A}|08`]: (f) => verifyArea(f),
  [`${A}|09`]: (f) => verifyArea(f),
  // 사각형이 **닫히는가** — 두 삼각형이 같은 대각선을 봐야 그림이 참말이다.
  [`${A}|10`]: (f) => {
    const ac1 = Math.sqrt(
      f.ab * f.ab + f.bc * f.bc - 2 * f.ab * f.bc * COS(f.angB),
    );
    const ac2 = Math.sqrt(
      f.ad * f.ad + f.dc * f.dc - 2 * f.ad * f.dc * COS(f.angD),
    );
    if (!near(ac1, f.ac, 1e-9) || !near(ac2, f.ac, 1e-9)) return false;
    const s1 = (f.ab * f.bc * SIN(f.angB)) / 2;
    const s2 = (f.ad * f.dc * SIN(f.angD)) / 2;
    return near(f.total * Math.sqrt(3), s1 + s2, 1e-9);
  },
  [`${A}|11`]: (f) => {
    const area = f.a * f.b * SIN(f.ang);
    return near(f.an * Math.sqrt(f.ar), area, 1e-9);
  },
  [`${A}|12`]: (f) => {
    const area = (f.d1 * f.d2 * SIN(f.ang)) / 2;
    return near(f.an * Math.sqrt(f.ar), area, 1e-9);
  },
  [`${A}|13`]: (f) => {
    const h = f.d / (1 / TAN(f.a1) - 1 / TAN(f.a2));
    return near(f.c0 + f.c1 * Math.sqrt(f.root), h, 1e-9);
  },
  [`${A}|14`]: (f) => {
    const area = (f.n / 2) * f.R * f.R * SIN(360 / f.n);
    return near(f.an * Math.sqrt(f.ar), area, 1e-9);
  },
};

/** 특수각 두 항 식(08·13) — 부동소수로 그대로 계산한다. */
function verifySpecial(f: F): boolean {
  const v1 = TRIG(f.f1, f.a1);
  const v2 = TRIG(f.f2, f.a2);
  const res = [v1 + v2, v1 - v2, v1 * v2, v1 / v2][f.op]!;
  return near((f.an * Math.sqrt(f.ar)) / f.ad, res, 1e-9);
}

/** 삼각형의 넓이(08 예각 · 09 둔각) — 한 자를 쓴다. */
function verifyArea(f: F): boolean {
  const area = (f.a * f.b * SIN(f.ang)) / 2;
  return near(f.an * Math.sqrt(f.ar), area, 1e-9);
}

/** 답 문자열의 값이 이것과 같아야 한다. `null` 이면 수가 아닌 답(14·15). */
const ANSWER_VALUE: Record<string, (f: F) => number | null> = {
  [`${T}|01`]: (f) => f.num / f.den,
  [`${T}|02`]: (f) => f.x,
  [`${T}|03`]: (f) => f.num / f.den,
  [`${T}|04`]: (f) => f.num / f.den,
  [`${T}|05`]: (f) => f.num / f.den,
  [`${T}|06`]: (f) => f.num / f.den,
  [`${T}|07`]: (f) => f.num / f.den,
  [`${T}|08`]: (f) => (f.an * Math.sqrt(f.ar)) / f.ad,
  [`${T}|09`]: (f) => f.x,
  [`${T}|10`]: (f) => f.an * Math.sqrt(f.ar),
  [`${T}|11`]: (f) => (f.mode === 0 ? f.ang : f.c0 + f.c1 * Math.sqrt(f.root)),
  [`${T}|12`]: (f) => f.x100 / 100,
  [`${T}|13`]: (f) => (f.an * Math.sqrt(f.ar)) / f.ad,
  [`${T}|14`]: () => null,
  [`${T}|15`]: () => null,
  [`${T}|16`]: (f) => (f.mode === 0 ? f.target : f.val),
  [`${T}|17`]: (f) => f.x,
  [`${T}|18`]: (f) => f.val,
  [`${A}|01`]: (f) =>
    f.mode === 0 ? f.an * Math.sqrt(f.ar) : f.c0 + f.c1 * Math.sqrt(f.root),
  [`${A}|02`]: (f) => f.an * Math.sqrt(f.ar),
  [`${A}|03`]: (f) => f.an * Math.sqrt(f.ar),
  [`${A}|04`]: (f) => f.ac,
  [`${A}|05`]: (f) => f.an * Math.sqrt(f.ar),
  [`${A}|06`]: (f) => f.c0 + f.c1 * Math.sqrt(f.root),
  [`${A}|07`]: (f) => f.c0 + f.c1 * Math.sqrt(f.root),
  [`${A}|08`]: (f) => (f.mode === 0 ? f.an * Math.sqrt(f.ar) : f.b),
  [`${A}|09`]: (f) => (f.mode === 0 ? f.an * Math.sqrt(f.ar) : f.b),
  [`${A}|10`]: (f) => f.total * Math.sqrt(3),
  [`${A}|11`]: (f) => (f.mode === 0 ? f.an * Math.sqrt(f.ar) : f.b),
  [`${A}|12`]: (f) => (f.mode === 0 ? f.an * Math.sqrt(f.ar) : f.d2),
  [`${A}|13`]: (f) => f.c0 + f.c1 * Math.sqrt(f.root),
  [`${A}|14`]: (f) => f.an * Math.sqrt(f.ar),
};

/** RPM 색인(`scripts/rpm/rpm-type-catalog.json` 3-2)의 제목 — 바이트 그대로. */
const TITLES: Record<string, string> = {
  [`${T}|01`]: "삼각비의 값",
  [`${T}|02`]: "삼각비를 이용하여 삼각형의 변의 길이 구하기",
  [`${T}|03`]: "한 삼각비의 값을 알 때 다른 삼각비의 값 구하기",
  [`${T}|04`]: "직각삼각형의 닮음과 삼각비⑴",
  [`${T}|05`]: "직각삼각형의 닮음과 삼각비⑵",
  [`${T}|06`]: "직선의 방정식과 삼각비",
  [`${T}|07`]: "입체도형에서 삼각비의 값 구하기",
  [`${T}|08`]: "의 삼각비의 값",
  [`${T}|09`]: "의 삼각비의 값을 이용하여 각의 크기 구하기",
  [`${T}|10`]: "의 삼각비의 값을 이용하여 변의 길이 구하기",
  [`${T}|11`]: "직선의 기울기와 삼각비",
  [`${T}|12`]: "사분원을 이용하여 삼각비의 값 구하기",
  [`${T}|13`]: "의 삼각비의 값",
  [`${T}|14`]: "삼각비의 값의 대소 관계",
  [`${T}|15`]: "삼각비의 값의 대소 관계를 이용한 식의 계산",
  [`${T}|16`]: "삼각비의 표를 이용하여 삼각비의 값 구하기",
  [`${T}|17`]: "삼각비의 표를 이용하여 변의 길이 구하기",
  [`${T}|18`]: "의 삼각비의 값을 이용하여 다른 삼각비의 값 구하기",
  [`${A}|01`]: "직각삼각형의 변의 길이 구하기",
  [`${A}|02`]: "입체도형에서 직각삼각형의 변의 길이의 활용",
  [`${A}|03`]: "실생활에서 직각삼각형의 변의 길이의 활용 ⑴",
  [`${A}|04`]:
    "일반 삼각형의 변의 길이 구하기 두 변의 길이와 그 끼인각의 크기를 아는 경우",
  [`${A}|05`]:
    "일반 삼각형의 변의 길이 구하기 한 변의 길이와 그 양 끝 각의 크기를 아는 경우",
  [`${A}|06`]: "삼각형의 높이 구하기 주어진 각이 모두 예각인 경우",
  [`${A}|07`]: "삼각형의 높이 구하기 주어진 각 중 한 각이 둔각인 경우",
  [`${A}|08`]: "삼각형의 넓이 예각이 주어진 경우",
  [`${A}|09`]: "삼각형의 넓이 둔각이 주어진 경우",
  [`${A}|10`]: "다각형의 넓이",
  [`${A}|11`]: "평행사변형의 넓이",
  [`${A}|12`]: "사각형의 넓이",
  [`${A}|13`]: "실생활에서 직각삼각형의 변의 길이의 활용 ⑵",
  [`${A}|14`]: "정다각형의 넓이",
};

/** 우리 `Unit.section` (prisma/seed-data/units.ts 481~483) — 실측 리터럴. */
const SECTION: Record<string, string> = {};
for (let i = 1; i <= 18; i += 1) {
  const n = String(i).padStart(2, "0");
  SECTION[`${T}|${n}`] = i <= 7 ? "삼각비의 뜻" : "삼각비의 값";
}
for (let i = 1; i <= 14; i += 1) {
  SECTION[`${A}|${String(i).padStart(2, "0")}`] = "삼각비의 활용";
}

/** 그림이 있어야 하는 유형. 나머지는 발문이 그림 없이 완결된다(모듈 주석). */
const FIGURE_KEYS = new Set([
  `${T}|01`,
  `${T}|02`,
  `${T}|04`,
  `${T}|05`,
  `${T}|10`,
  `${T}|12`,
  `${T}|17`,
  `${A}|01`,
  `${A}|03`,
  `${A}|04`,
  `${A}|05`,
  `${A}|06`,
  `${A}|07`,
  `${A}|08`,
  `${A}|09`,
  `${A}|10`,
  `${A}|11`,
  `${A}|12`,
  `${A}|13`,
  `${A}|14`,
]);

/** 40변형에서 나와야 하는 **서로 다른 발문의 하한** (2026-08-23 실측값). */
const MIN_CONTENTS: Record<string, number> = {
  [`${T}|01`]: 26,
  [`${T}|02`]: 35,
  [`${T}|03`]: 20,
  [`${T}|04`]: 32,
  [`${T}|05`]: 34,
  [`${T}|06`]: 38,
  [`${T}|07`]: 18,
  [`${T}|08`]: 36,
  [`${T}|09`]: 33,
  [`${T}|10`]: 35,
  [`${T}|11`]: 33,
  [`${T}|12`]: 36,
  [`${T}|13`]: 37,
  [`${T}|14`]: 35,
  [`${T}|15`]: 5,
  [`${T}|16`]: 38,
  [`${T}|17`]: 34,
  [`${T}|18`]: 33,
  [`${A}|01`]: 26,
  [`${A}|02`]: 26,
  [`${A}|03`]: 30,
  [`${A}|04`]: 16,
  [`${A}|05`]: 27,
  [`${A}|06`]: 19,
  [`${A}|07`]: 17,
  [`${A}|08`]: 38,
  [`${A}|09`]: 40,
  [`${A}|10`]: 6,
  [`${A}|11`]: 40,
  [`${A}|12`]: 39,
  [`${A}|13`]: 19,
  [`${A}|14`]: 27,
};

/* ────────────────────────────────────────────────────────────────────────
 * 시험
 * ──────────────────────────────────────────────────────────────────────── */

describe("정답 문자열 파서 — 판정기부터 눈금을 맞춘다", () => {
  it("아는 모양의 값을 바르게 잰다 (양성 대조군)", () => {
    expect(latexValue("$\\dfrac{\\sqrt{3}}{2}$")).toBeCloseTo(0.8660254, 6);
    expect(latexValue("$(12-4\\sqrt{3})\\,\\mathrm{cm}$")).toBeCloseTo(
      5.0717968,
      6,
    );
    expect(latexValue("$4\\sqrt{3}-4$")).toBeCloseTo(2.9282032, 6);
    expect(latexValue("$(7+7\\sqrt{3})\\,\\mathrm{m}$")).toBeCloseTo(
      19.1243557,
      6,
    );
    expect(latexValue("$36^\\circ$")).toBe(36);
    expect(latexValue("$0.5299$")).toBe(0.5299);
    expect(latexValue("$-\\dfrac{1}{2}$")).toBe(-0.5);
    expect(latexValue("$0$")).toBe(0);
    expect(latexValue("$24\\sqrt{3}\\,\\mathrm{cm}^2$")).toBeCloseTo(
      41.5692194,
      6,
    );
  });

  it("모르는 모양이면 **던진다** — 조용히 0을 돌려주지 않는다 (음성 대조군)", () => {
    expect(() => latexValue("$\\sin 30^\\circ$")).toThrow();
    expect(() => latexValue("$2\\cos A$")).toThrow();
  });

  it("`c0 ± c\\sin A` 꼴을 각에서 잰다", () => {
    expect(trigLinearValue("$2\\cos A$", 60)).toBeCloseTo(1, 12);
    expect(trigLinearValue("$2-2\\sin A$", 30)).toBeCloseTo(1, 12);
    expect(trigLinearValue("$-2\\cos A$", 60)).toBeCloseTo(-1, 12);
    expect(trigLinearValue("$0$", 33)).toBe(0);
  });
});

describe("직각 판정기 — 문턱이 «진짜 틀린 각»을 가르는가", () => {
  /**
   * 문턱(2e-3)이 반올림 잡음보다 크므로, **그 문턱이 아무것도 안 가르는지**를
   * 먼저 확인한다. 실제 스펙의 직각 표시가 가리키는 점 하나를 **다른 점으로
   * 바꿔** 보고 빨개지는 것을 본다(가드는 망가뜨려 봐야 가드인 줄 안다).
   */
  it("직각 표시의 반직선을 다른 점으로 바꾸면 잡힌다 (음성 대조군)", () => {
    const p = generateMiddleProblem(`${T}|01`, 20260823);
    const spec = JSON.parse(JSON.stringify(p.figureSpec)) as Record<
      string,
      unknown
    >;
    const clean = rightAngleCosines(spec);
    expect(clean.length, "직각 표시가 없으면 이 대조군은 장식이다").toBe(1);
    expect(Math.abs(clean[0]![1])).toBeLessThan(RIGHT_TOL);

    const angles = spec.angles as Record<
      string,
      { vertex: string; points: [string, string] }
    >;
    // $\angle ABC$ 의 한쪽 반직선을 $C$ 대신 «빗변 위가 아닌» 점 $A$ 로 바꾼다.
    angles.r_B!.points = ["A", "A"];
    expect(Math.abs(rightAngleCosines(spec)[0]![1])).toBeGreaterThan(RIGHT_TOL);
  });
});

describe("등식 판정기 — 틀린 계산 줄을 실제로 잡는가", () => {
  it("양쪽이 다르면 잡는다 (양성 대조군)", () => {
    expect(
      equalityMismatches("$\\dfrac{6}{\\dfrac{\\sqrt{3}}{2}}=6\\sqrt{2}$"),
    ).toHaveLength(1);
    expect(equalityMismatches("$100\\times0.5878=58.79$")).toHaveLength(1);
  });
  it("맞으면 안 잡고, 못 읽는 쪽은 건너뛴다 (음성 대조군)", () => {
    expect(equalityMismatches("$100\\times0.5878=58.78$")).toEqual([]);
    expect(
      equalityMismatches(
        "$\\overline{AB}=\\dfrac{6}{\\sin 45^\\circ}=6\\sqrt{2}$",
      ),
    ).toEqual([]);
    expect(equalityMismatches("$0.5878-0.5592=0.0286$")).toEqual([]);
  });
});

describe("전처리 판정기 — 지면이 수를 고쳐 쓰는가", () => {
  it("이 판정기의 «찾기» 가 살아 있다 — 제품을 거치지 않고 본다", () => {
    // 2026-08-24 D-73 으로 제품은 더 이상 가분수를 대분수로 바꾸지 않는다.
    // 그래서 「제품이 바꾸나」로는 이 자를 **못 잰다** — 구조적으로 0 이다.
    // (원래 여기 있던 양성 대조군이 그 규칙을 없애자 빨갛게 났다.)
    // 살아 있음은 **손으로 만든 «이미 바뀐 글»** 로 확인한다.
    expect(countMixed(String.raw`1\dfrac{1}{2}y`)).toBe(1);
    expect(countMixed(String.raw`\dfrac{3}{2}y`)).toBe(0);
    expect(countFrac(String.raw`\dfrac{6}{3}=2`)).toBe(1);
    expect(countFrac("2=2")).toBe(0);
  });
  it("멀쩡한 진분수·근호 분수는 안 잡는다 (음성 대조군)", () => {
    expect(preprocessRewrites("$\\dfrac{1}{2}+\\dfrac{\\sqrt{3}}{2}$")).toEqual(
      [],
    );
  });
});

describe("중3 삼각비 32유형 (RPM 3-2 삼각비 18 + 삼각비의 활용 14)", () => {
  // 브리프 계약 5 — 합본을 중단원 이름으로 거르지 않는다. 내 배열을 직접 돈다.
  const entries = M3_TRIG;

  it("삼각비 18유형 + 삼각비의 활용 14유형 = 32유형이 등록돼 있다", () => {
    expect(entries.length).toBe(32);
    const trig = entries.filter((e) => e.rpmMinor === "삼각비");
    const apply = entries.filter((e) => e.rpmMinor === "삼각비의 활용");
    expect(trig.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 18 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(apply.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect([...M3_TRIG_MINORS]).toEqual(["삼각비", "삼각비의 활용"]);
    expect(new Set(entries.map((e) => e.rpmBook))).toEqual(new Set(["3-2"]));
    expect(new Set(entries.map((e) => e.grade))).toEqual(new Set(["중3"]));
  });

  it("우리 단원 이름은 DB 시드 실측 리터럴과 일치한다", () => {
    // prisma/seed-data/units.ts 481~483 — 「삼각비의 뜻」·「삼각비의 값」·「삼각비의 활용」.
    for (const e of entries) {
      expect(e.unitSection, e.key).toBe(SECTION[e.key]);
    }
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.unitSection, (counts.get(e.unitSection) ?? 0) + 1);
    }
    expect([...counts.entries()].sort()).toEqual([
      ["삼각비의 값", 11],
      ["삼각비의 뜻", 7],
      ["삼각비의 활용", 14],
    ]);
  });

  it("RPM 색인의 실제 제목을 쓴다 (32유형 전량 리터럴 대조)", () => {
    for (const e of entries) {
      expect(e.rpmTitle, e.key).toBe(TITLES[e.key]);
    }
    // 08·13 은 색인이 앞의 각도 표기를 잃어 「의 …」로 시작한다 — 손으로 고치면 안 된다.
    expect(TITLES[`${T}|08`]!.startsWith("의 ")).toBe(true);
  });

  for (const e of M3_TRIG) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — facts 로 «다른 식»을 세워 답을 다시 유도한다", () => {
        const verify = VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          for (let v = 0; v < 8; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              verify!(p.facts),
              `seed ${seed} v${v} 검산 실패: ${JSON.stringify(p.facts)}`,
            ).toBe(true);
          }
        }
      });

      it("지면에 나가는 **정답 글자**의 값이 독립 계산값과 같다", () => {
        const want = ANSWER_VALUE[e.key];
        expect(want, `답 값 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            const expected = want!(p.facts);
            if (expected === null) continue;
            expect(
              latexValue(p.answer),
              `seed ${seed} v${v} 답 ${p.answer}`,
            ).toBeCloseTo(expected, 8);
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(bareNumbers(p.content), `${e.key} 발문`).toEqual([]);
            expect(bareNumbers(p.answer), `${e.key} 정답`).toEqual([]);
            expect(bareNumbers(p.solution), `${e.key} 해설`).toEqual([]);
          }
        }
      });

      /**
       * KaTeX 밖의 백슬래시는 지면에 **날 문자로** 나간다(제품 렌더러가 `$` 밖
       * 백슬래시를 글자 그대로 이스케이프한다). 숫자 가드는 이 부류를 못 본다.
       */
      it("KaTeX 밖에 백슬래시가 없다", () => {
        const outside = (t: string): string => t.replace(/\$[^$]*\$/g, " ");
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["content", p.content],
              ["answer", p.answer],
              ["solution", p.solution],
            ] as const) {
              expect(
                outside(text).match(/\\[\s\S]/g) ?? [],
                `${e.key} seed ${seed} v${v} ${name}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("해설이 한 줄로 뭉치지 않는다 (단계 사이 줄바꿈)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              p.solution.split("\n").filter((s) => s.trim() !== "").length,
              `${e.key} seed ${seed} v${v}`,
            ).toBeGreaterThanOrEqual(2);
          }
        }
      });

      /**
       * 제품 전처리가 **지면에서** 가분수를 대분수로 고쳐 쓴다. 삼각비는
       * `\dfrac{4}{3}` 같은 값이 흔하므로 여기서 반드시 막는다 — 규칙을 옮겨
       * 적지 않고 **제품 함수를 실제로 돌려** 본다.
       */
      it("제품 전처리가 수식의 수를 고쳐 쓰지 않는다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(
                preprocessRewrites(text),
                `${e.key} seed ${seed} v${v}: ${text}`,
              ).toEqual([]);
            }
          }
        }
      });

      /**
       * 값(`facts`)과 정답이 맞아도 **해설의 계산 줄이 틀릴 수 있다.** 등식의
       * 양쪽이 둘 다 수로 읽히면 실제로 같은지 잰다.
       */
      it("발문·해설에 적힌 등식이 실제로 성립한다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["발문", p.content],
              ["정답", p.answer],
              ["해설", p.solution],
            ] as const) {
              expect(
                equalityMismatches(text),
                `${e.key} seed ${seed} v${v} ${name}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("그림: 있어야 하는 유형에만 있고, 스펙의 수는 전부 유한하다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 4; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            if (!FIGURE_KEYS.has(e.key)) {
              expect(
                p.figureSpec ?? null,
                `${e.key} 는 그림이 없어야 한다`,
              ).toBe(null);
              continue;
            }
            expect(p.figureSpec, `${e.key} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe(2);
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
          }
        }
      });

      it("직각 표시가 **실제로** 직각이다 (좌표로 다시 잰다)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 4; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            if (!p.figureSpec) continue;
            for (const [name, cosine] of rightAngleCosines(
              p.figureSpec as Record<string, unknown>,
            )) {
              expect(
                Math.abs(cosine),
                `${e.key} seed ${seed} v${v} ${name} 이 직각이 아니다`,
              ).toBeLessThan(RIGHT_TOL);
            }
          }
        }
      });

      /**
       * 그림에 적힌 수가 발문의 값이 아니면 **그럴듯한 오답 그림**이 된다
       * (realScene.ts 의 같은 규칙). 라벨의 수는 전부 `facts` 에 있어야 한다.
       */
      it("그림의 글자에 적힌 수는 전부 facts 에서 온다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 4; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            if (!p.figureSpec) continue;
            const nums = labelNumbers(p.figureSpec as Record<string, unknown>);
            const known = new Set(Object.values(p.facts));
            for (const n of nums) {
              expect(
                known.has(n),
                `${e.key} seed ${seed} v${v}: 그림의 ${n} 이 facts 에 없다 (${JSON.stringify(p.facts)})`,
              ).toBe(true);
            }
          }
        }
      });

      it("변형 폭 — 40변형에서 발문이 실측 하한만큼 갈린다", () => {
        const contents = new Set<string>();
        for (let v = 0; v < 40; v += 1) {
          contents.add(generateMiddleProblem(e.key, 20260823, v).content);
        }
        expect(contents.size, `${e.key} 발문 다양성`).toBeGreaterThanOrEqual(
          MIN_CONTENTS[e.key]!,
        );
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  /**
   * 활용 10 은 **사각형**이라고 발문이 말한다. 두 삼각형이 같은 대각선을 봐도
   * 네 점이 볼록하지 않으면 그림이 거짓말을 한다 — 실제로 처음 판은 $D$ 를
   * $B$ 와 **같은 쪽**에 놓아 삼각형 안으로 들어갔다(2026-08-23 미리보기).
   */
  it("활용 10 의 사각형 ABCD 는 볼록하다 (그림이 발문과 같은 말을 한다)", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < 8; v += 1) {
        const p = generateMiddleProblem(`${A}|10`, seed, v);
        const pts = resolvePoints(p.figureSpec as Record<string, unknown>);
        const poly = ["A", "B", "C", "D"].map((k) => pts[k]!);
        const signs = poly.map((_, i) => {
          const a = poly[i]!;
          const b = poly[(i + 1) % 4]!;
          const c = poly[(i + 2) % 4]!;
          return Math.sign(
            (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]),
          );
        });
        expect(
          new Set(signs).size,
          `seed ${seed} v${v} 사각형이 볼록하지 않다: ${JSON.stringify(poly)}`,
        ).toBe(1);
      }
    }
  });

  /**
   * 활용 15 는 「간단히 하기」다 — 답이 수가 아니라 **식**이다. 정답 문자열을
   * 직접 파싱해 원식과 **여러 각에서** 값을 견준다(발문의 범위 안에서).
   */
  it("삼각비 15: 정답 식이 원식과 같은 값이다 (범위 안 9개 각)", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < 10; v += 1) {
        const p = generateMiddleProblem(`${T}|15`, seed, v);
        const spec = EXPR15[p.facts.mode!]!;
        expect(p.content, "발문이 그 모드의 식을 담고 있어야 한다").toContain(
          spec.latex,
        );
        for (let i = 1; i <= 9; i += 1) {
          const d = p.facts.lo! + ((p.facts.hi! - p.facts.lo!) * i) / 10;
          expect(
            trigLinearValue(p.answer, d),
            `seed ${seed} v${v} A=${d} 답 ${p.answer}`,
          ).toBeCloseTo(spec.f(d), 9);
        }
      }
    }
  });

  /** 14 는 답이 삼각비 이름이다 — 이름과 각이 발문과 같아야 한다. */
  it("삼각비 14: 정답이 발문의 각에 대한 옳은 삼각비 이름이다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < 10; v += 1) {
        const p = generateMiddleProblem(`${T}|14`, seed, v);
        const name = ["\\sin", "\\cos", "\\tan"][p.facts.pick!]!;
        expect(p.answer).toBe(`$${name} ${p.facts.ang}^\\circ$`);
        expect(p.facts.ang).not.toBe(45);
      }
    }
  });

  /**
   * 넓은 씨앗 전량 검산 — 좁은 표본은 드물게 나는 조합을 구조적으로 못 본다
   * (CLAUDE.md 2026-08-19 「0% 를 «구조적으로 못 센다»로 단정하기 전에 표본을 넓혀라」).
   */
  it("넓은 씨앗(300×4)에서도 32유형 전량이 검산을 통과한다", () => {
    let checked = 0;
    for (let s = 0; s < 300; s += 1) {
      for (const e of M3_TRIG) {
        const p = generateMiddleProblem(e.key, s * 977 + 13, s % 4);
        expect(
          VERIFY[e.key]!(p.facts),
          `${e.key} seed#${s} 검산 실패: ${JSON.stringify(p.facts)}`,
        ).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBe(300 * 32);
  });

  it("정확한 무리수 대수가 아니라 **부동소수**로 재고 있다 (동어반복 방지)", () => {
    // 이 시험 파일은 `Surd`·`surdText`·`frac` 를 import 하지 않는다. 그것을
    // 쓰면 「생성기가 쓴 식으로 생성기를 검산」하는 셈이라 아무것도 못 잡는다.
    expect(Object.keys(VERIFY).length).toBe(32);
    expect(Object.keys(ANSWER_VALUE).length).toBe(32);
    expect(EPS).toBeGreaterThan(0);
  });
});
