/**
 * 중1 물결 6B(`m1Geo2.ts`) — 「작도와 합동」14 + 「다각형」22(남은 번호) = 36유형
 * **독립 검산**.
 *
 * ## 이 시험이 무엇을 «다르게» 재는가
 *
 * 09·10·11·23(이등분선이 이루는 각)은 생성기가 외각의 성질을 텍스트로 유도한
 * 값이다. 여기서는 그 공식을 다시 옮겨 적지 않고, 삼각형을 **실제 좌표로
 * 세워** 각의 이등분선·외각의 이등분선을 벡터로 구성한 뒤 실제 각을
 * `acos`로 재는 좌표 기하 시뮬레이션으로 검산한다(생성기와 완전히 다른
 * 방법). 08·11~13(합동 대응)은 대응 순서(순열)를 시험이 **독자적으로** 다시
 * 조립해 라벨이 옳은지 본다. 01·03·07·09·10(다각형 03)처럼 「옳은 것의
 * 개수」를 묻는 유형은 표를 **모듈과 따로** 든다(같은 진실표를 두 번 쓰지
 * 않는다).
 *
 * ## 자기 배열을 직접 훑는다
 * `M1_CONSTR_TYPES`·`M1_POLY2_TYPES` 를 직접 쓴다 — 「다각형」 중단원에는
 * `m1Book2.ts` 가 이미 낸 07·08 이 있어 `registeredTypes()` 를 중단원 이름으로
 * 거르면 남의 유형이 섞인다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  arabicPolygons,
  bareNumbers,
  runawayDecimals,
  unfilledPlaceholders,
} from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import {
  M1_CONSTR_TYPES,
  M1_GEO2,
  M1_POLY2_TYPES,
} from "../../lib/middle/m1Geo2";
import type { MidProblem, TypeEntry } from "../../lib/middle/types";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31337, 5150, 60613];
const SWEEP = Array.from({ length: 90 }, (_, i) => i * 7919 + 13);
const ALL_SEEDS = [...SEEDS, ...SWEEP];

type F = Record<string, number>;
type Spec = Record<string, unknown>;
type Check = (f: F, p: MidProblem) => boolean;

/* ────────────────────────────────────────────────────────────────────────
 * 발문에서 읽어 내는 도우미 — 생성기의 내부 변수를 안 믿는다
 * ──────────────────────────────────────────────────────────────────────── */

function bogiLines(content: string): string[] {
  return content
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^[ㄱ-ㅁ]\.\s/.test(s))
    .map((s) => s.replace(/^[ㄱ-ㅁ]\.\s*/, ""));
}

function circledOptions(content: string): string[] {
  return content
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^[①②③④⑤]/.test(s))
    .map((s) => s.replace(/^[①②③④⑤]\s*/, ""));
}

/** 본문에 «값으로» 실린 수 — 단위·아래첨자의 숫자는 값이 아니다. */
function dollarNums(text: string): number[] {
  const cleaned = text
    .replace(/\\mathrm\{[^}]*\}/g, " ")
    .replace(/[\^_]\{?-?\d+\}?/g, " ");
  return (cleaned.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/* ────────────────────────────────────────────────────────────────────────
 * T/F 진실표 — 모듈의 은행과 **따로** 든다(같은 문자열, 독립된 진실값 판단)
 * ──────────────────────────────────────────────────────────────────────── */

const TRUTH_01: Record<string, boolean> = {
  "작도에서는 눈금 없는 자를 사용하여 두 점을 지나는 직선을 그린다.": true,
  "작도에서는 컴퍼스를 사용하여 두 선분의 길이를 비교한다.": true,
  "작도에서는 눈금 있는 자를 사용하여 선분의 길이를 잰다.": false,
  "작도에서는 각도기를 사용하여 각의 크기를 잰다.": false,
  "작도에서는 컴퍼스를 사용하여 원을 그린다.": true,
  "작도에서는 컴퍼스를 사용하여 주어진 선분과 길이가 같은 선분을 다른 위치에 옮긴다.": true,
  "작도에서는 눈금 없는 자를 사용하여 선분을 연장한다.": true,
  "작도에서는 삼각자를 사용하여 평행선을 그린다.": false,
};

const TRUTH_07: Record<string, boolean> = {
  "세 변의 길이가 주어질 때 (단, 가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 작다.)": true,
  "두 변의 길이와 그 끼인각의 크기가 주어질 때": true,
  "한 변의 길이와 그 양 끝 각의 크기가 주어질 때": true,
  "세 각의 크기가 주어질 때": false,
  "두 변의 길이와 그 끼인각이 아닌 다른 한 각의 크기가 주어질 때": false,
  "한 변의 길이와 그 변에 이웃한 한 각의 크기가 주어질 때": false,
  "세 변의 길이가 주어질 때 (단, 가장 긴 변의 길이가 나머지 두 변의 길이의 합과 같다.)": false,
  "두 각의 크기와 그 끼인변이 아닌 다른 한 변의 길이가 주어질 때": true,
};

const TRUTH_POLY01: Record<string, boolean> = {
  정육각형: true,
  원: false,
  부채꼴: false,
  직사각형: true,
  마름모: true,
  원기둥: false,
  오각형: true,
  구: false,
};

const TRUTH_POLY03: Record<string, boolean> = {
  정삼각형: true,
  정사각형: true,
  직사각형: false,
  마름모: false,
  정오각형: true,
  이등변삼각형: false,
  정육각형: true,
  평행사변형: false,
};

function truthCountCheck(
  table: Record<string, boolean>,
): (f: F, p: MidProblem) => boolean {
  return (f, p) => {
    const lines = bogiLines(p.content);
    if (lines.length === 0) return false;
    let t = 0;
    for (const line of lines) {
      const v = table[line];
      if (v === undefined) return false;
      if (v) t += 1;
    }
    return t === f.ans;
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 좌표 기하 — 09·10·11·23 을 생성기와 **다른 방법**으로 검산한다
 * ──────────────────────────────────────────────────────────────────────── */

type Pt = [number, number];
const GEO_DEG = Math.PI / 180;

function lineInter(p: Pt, d: Pt, q: Pt, e: Pt): Pt {
  const det = d[0] * e[1] - d[1] * e[0];
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / det;
  return [p[0] + t * d[0], p[1] + t * d[1]];
}
function unitVec(v: Pt): Pt {
  const m = Math.hypot(v[0], v[1]);
  return [v[0] / m, v[1] / m];
}
/** 꼭짓점에서 두 점을 향한 두 단위벡터의 합 — 내각의 이등분선 방향. */
function bisectorDir(vertex: Pt, p1: Pt, p2: Pt): Pt {
  const u1 = unitVec([p1[0] - vertex[0], p1[1] - vertex[1]]);
  const u2 = unitVec([p2[0] - vertex[0], p2[1] - vertex[1]]);
  return [u1[0] + u2[0], u1[1] + u2[1]];
}
function perp(v: Pt): Pt {
  return [-v[1], v[0]];
}
/** 세 점이 이루는 각 — 벡터 내적의 arccos (부호 없는 각, 0~180°). */
function angleAt(vertex: Pt, a: Pt, b: Pt): number {
  const v1: Pt = [a[0] - vertex[0], a[1] - vertex[1]];
  const v2: Pt = [b[0] - vertex[0], b[1] - vertex[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag = Math.hypot(...v1) * Math.hypot(...v2);
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) / GEO_DEG;
}
/** $B=(0,0)$, $C=(1,0)$ 로 두고 두 밑각으로 $A$ 를 세운다. */
function triangleFromAngles(Bdeg: number, Cdeg: number) {
  const B: Pt = [0, 0];
  const C: Pt = [1, 0];
  const A = lineInter(
    B,
    [Math.cos(Bdeg * GEO_DEG), Math.sin(Bdeg * GEO_DEG)],
    C,
    [-Math.cos(Cdeg * GEO_DEG), Math.sin(Cdeg * GEO_DEG)],
  );
  return { A, B, C };
}
function near(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

/* ────────────────────────────────────────────────────────────────────────
 * 합동 대응 순열 — 모듈과 같은 여섯 가지를 시험도 독자적으로 든다
 * ──────────────────────────────────────────────────────────────────────── */

const PERM3: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/* ────────────────────────────────────────────────────────────────────────
 * 작도와 합동 — 독립 검산
 * ──────────────────────────────────────────────────────────────────────── */

const VERIFY_CONSTR: Record<string, Check> = {
  "01": truthCountCheck(TRUTH_01),

  "02": (f, p) => {
    if (f.mode === 0) return f.p + f.q === f.ans;
    // mode 1 — 발문에 적힌 PQ·PR 두 값을 읽어 QR 을 다시 뺀다.
    const nums = dollarNums(p.content);
    if (nums.length < 2) return false;
    return nums[0] === f.p && nums[1] - nums[0] === f.ans;
  },

  "03": (f) => {
    if (f.mode === 0) return f.theta + f.x === 180;
    return f.t1 + f.t2 + f.x === 180;
  },

  "04": (f) => f.theta + f.x === 180,

  "05": (f) => {
    // 다른 식으로: 정수 x 를 직접 세어 본다(닫힌 식이 아니라 나열).
    let count = 0;
    for (let x = 1; x <= f.a + f.b; x += 1) {
      if (f.a - f.b < x && x < f.a + f.b) count += 1;
    }
    return count === f.ans;
  },

  "06": (f) => {
    let count = 0;
    for (let i = 0; i < 4; i += 1) {
      const a = f[`s${i}a`]!;
      const b = f[`s${i}b`]!;
      const c = f[`s${i}c`]!;
      const longest = Math.max(a, b, c);
      const rest = a + b + c - longest;
      if (longest < rest) count += 1;
    }
    return count === f.ans;
  },

  "07": truthCountCheck(TRUTH_07),

  "08": (f) => 360 - f.p - f.q - f.r === f.ans && f.ans > 0 && f.ans < 360,

  "09": (f) => {
    let count = 0;
    for (let i = 0; i < 3; i += 1) {
      const a1 = [f[`p${i}a1`]!, f[`p${i}a2`]!, f[`p${i}a3`]!].sort(
        (x, y) => x - y,
      );
      const a2 = [f[`p${i}b1`]!, f[`p${i}b2`]!, f[`p${i}b3`]!].sort(
        (x, y) => x - y,
      );
      if (a1[0] === a2[0] && a1[1] === a2[1] && a1[2] === a2[2]) count += 1;
    }
    return count === f.ans;
  },

  "10": (f, p) => {
    const CORR: Record<string, string> = { A: "D", B: "E", C: "F" };
    const angleByConfig = ["B", "A", "C"];
    const angle = angleByConfig[f.config]!;
    const wantText = `$\\angle ${angle}=\\angle ${CORR[angle]}$`;
    const options = circledOptions(p.content);
    if (options.length !== 4) return false;
    const idx = options.indexOf(wantText);
    return idx !== -1 && idx === f.correctPos;
  },

  "11": (f, p) => {
    const rhs = PERM3[f.perm]!.map((i) => ["D", "E", "F"][i]);
    if (!p.content.includes(`\\mathrm{${rhs.join("")}}`)) return false;
    const sides = [f.a, f.b, f.c];
    return dollarNums(p.answer)[0] === sides[f.ask];
  },

  "12": (f, p) => {
    const rhs = PERM3[f.perm]!.map((i) => ["D", "E", "F"][i]);
    if (!p.content.includes(`\\mathrm{${rhs.join("")}}`)) return false;
    if (!p.content.includes(`\\angle ${rhs[1]}`)) return false;
    return dollarNums(p.answer)[0] === f.theta;
  },

  "13": (f, p) => {
    const rhs = PERM3[f.perm]!.map((i) => ["D", "E", "F"][i]);
    if (!p.content.includes(`\\mathrm{${rhs.join("")}}`)) return false;
    if (!p.content.includes(`\\angle ${rhs[2]}`)) return false;
    return f.a + f.b + f.c === 180 && dollarNums(p.answer)[0] === f.c;
  },

  "14": (f, p) => {
    if (f.x <= 0) return false;
    // AB=DE 가 두 방향 어느 쪽으로 물어도 같은 값이어야 한다.
    return (
      dollarNums(p.content).includes(f.x) && dollarNums(p.answer)[0] === f.x
    );
  },
};

const ANSWER_CONSTR: Record<string, (f: F) => number[]> = {
  "01": (f) => [f.ans],
  "02": (f) => [f.ans],
  "03": (f) => [f.x],
  "04": (f) => [f.x],
  "05": (f) => [f.ans],
  "06": (f) => [f.ans],
  "07": (f) => [f.ans],
  "08": (f) => [f.ans],
  "09": (f) => [f.ans],
  "10": () => [],
  "11": (f) => [[f.a, f.b, f.c][f.ask]!],
  "12": (f) => [f.theta],
  "13": (f) => [f.c],
  "14": (f) => [f.x],
};

/**
 * 09~13(합동)은 답의 수가 발문에도 흔하다(같은 삼각형의 변·각) — 누출
 * 검사에서 뺀다. 14 는 $\overline{AB}=\overline{DE}$ 가 이 유형의 결론
 * 자체라 두 선분이 **같은 수**를 갖는 것이 정상이다(생성기가 답을 베낀 게
 * 아니라 합동이 그렇게 만든다). 05·06·08 은 서로 독립인 무작위 값을 여럿
 * 늘어놓고 그중 하나를 세거나 빼는 유형이라, 발문에 실린 값 하나가 «개수»
 * 답과 우연히 같은 숫자가 되는 일이 있다(예: 변 $11\,\mathrm{cm}$ 인데
 * 가능한 $x$ 의 개수도 $11$개) — 같은 뜻을 가리키는 게 아니므로 누출이
 * 아니다.
 */
const NO_LEAK_CONSTR = new Set([
  "05",
  "06",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
]);

/* ────────────────────────────────────────────────────────────────────────
 * 다각형 — 독립 검산
 * ──────────────────────────────────────────────────────────────────────── */

const VALID_N_19 = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20];

const VERIFY_POLY: Record<string, Check> = {
  "01": truthCountCheck(TRUTH_POLY01),
  "02": (f) => f.known + f.ans === 180,
  "03": truthCountCheck(TRUTH_POLY03),
  "04": (f) => f.v === f.n - 3,
  "05": (f) => f.d === (f.n * (f.n - 3)) / 2,
  "06": (f) => f.d === (f.n * (f.n - 3)) / 2,

  "09": (f) => {
    // 좌표로 삼각형을 세워 실제로 각도를 재고 비교한다(생성기와 다른 방법).
    const { A, B, C } = triangleFromAngles(f.B, f.C);
    const AB = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const AC = Math.hypot(A[0] - C[0], A[1] - C[1]);
    const D: Pt = [
      (AC * B[0] + AB * C[0]) / (AB + AC),
      (AC * B[1] + AB * C[1]) / (AB + AC),
    ];
    const ans = f.mode === 0 ? angleAt(D, A, B) : angleAt(D, A, C);
    return near(ans, f.ans, 1e-6);
  },

  "10": (f) => {
    const Bd = (180 - f.A) / 2;
    const Cd = 180 - f.A - Bd;
    const { A, B, C } = triangleFromAngles(Bd, Cd);
    const a = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const b = Math.hypot(A[0] - C[0], A[1] - C[1]);
    const c = Math.hypot(A[0] - B[0], A[1] - B[1]);
    const I: Pt = [
      (a * A[0] + b * B[0] + c * C[0]) / (a + b + c),
      (a * A[1] + b * B[1] + c * C[1]) / (a + b + c),
    ];
    return near(angleAt(I, B, C), f.ans, 1e-6);
  },

  "11": (f) => {
    const Bd = (180 - f.A) / 2 + 10;
    const Cd = 180 - f.A - Bd;
    const { A, B, C } = triangleFromAngles(Bd, Cd);
    const dB = bisectorDir(B, A, C);
    const dCint = bisectorDir(C, A, B);
    const dCext = perp(dCint);
    const P = lineInter(B, dB, C, dCext);
    return near(angleAt(P, B, C), f.ans, 1e-6);
  },

  "23": (f) => {
    const Bd = (180 - f.A) / 2 - 8;
    const Cd = 180 - f.A - Bd;
    const { A, B, C } = triangleFromAngles(Bd, Cd);
    const dBint = bisectorDir(B, A, C);
    const dBext = perp(dBint);
    const dCint = bisectorDir(C, A, B);
    const dCext = perp(dCint);
    const P = lineInter(B, dBext, C, dCext);
    return near(angleAt(P, B, C), f.ans, 1e-6);
  },

  "12": (f) => {
    if (f.mode === 0) return f.apex + 2 * f.base === 180;
    return f.base * (f.m + 2 * f.n) === 180 * f.n;
  },

  "13": (f) => f.a + f.b === f.c + f.d,

  "14": (f) => f.a + f.b + f.c + f.d + f.e === 180,

  "15": (f) => f.s === (f.n - 2) * 180,

  "16": (f) => {
    let sum = f.ans;
    for (let i = 0; i < f.n - 1; i += 1) sum += f[`a${i}`]!;
    return sum === (f.n - 2) * 180;
  },

  "17": (f) => {
    let sum = f.ans;
    for (let i = 0; i < f.n - 1; i += 1) sum += f[`a${i}`]!;
    return sum === 360;
  },

  "18": (f) => {
    const n = f.s / 180 + 2;
    if (n !== f.n) return false;
    const diag = (n * (n - 3)) / 2;
    const vFromVertex = n - 3;
    return f.mode === 0 ? f.ans === diag : f.ans === vFromVertex;
  },

  "19": (f) => {
    if (!VALID_N_19.includes(f.n)) return false;
    if (f.ext !== 360 / f.n) return false;
    if (f.int + f.ext !== 180) return false;
    if (f.mode === 0) {
      return f.ans === (f.which === 0 ? f.int : f.ext);
    }
    return f.ans === f.n;
  },

  "20": (f) => f.a * 2 === f.b * (f.n - 2),

  "21": (f) => f.n % 2 === 0 && f.k === (f.n - 2) / 2,

  "22": (f) => f.K === (f.n * (f.n - 1)) / 2,

  "24": (f) => f.a + f.b + f.d + f.x === 180,
};

const ANSWER_POLY: Record<string, (f: F) => number[]> = {
  "01": (f) => [f.ans],
  "02": (f) => [f.ans],
  "03": (f) => [f.ans],
  "04": (f) => [f.mode === 0 ? f.v : f.n],
  "05": (f) => [f.d],
  "06": (f) => [f.n],
  "09": (f) => [f.ans],
  "10": (f) => [f.ans],
  "11": (f) => [f.ans],
  "12": (f) => [f.base],
  "13": (f) => [f.d],
  "14": (f) => [f.e],
  "15": (f) => [f.mode === 0 ? f.s : f.n],
  "16": (f) => [f.ans],
  "17": (f) => [f.ans],
  "18": (f) => [f.ans],
  "19": (f) => [f.ans],
  "20": (f) => [f.n],
  "21": (f) => [f.n],
  "22": (f) => [f.n],
  "23": (f) => [f.ans],
  "24": (f) => [f.x],
};

/**
 * 04·05·06·18·20~22 는 개수·변의 개수를 세거나 역산하는 유형이라 작도합동
 * 05·06·08 과 같은 우연한 숫자 겹침이 난다. 13(리본)·14(별)·16·17(다각형
 * 내각/외각 나머지 구하기)·24 는 서로 독립인 무작위 각을 여럿 늘어놓고
 * 그중 하나를 구하는 유형이라, 나열한 각 중 하나가 답과 우연히 같은
 * 숫자가 되는 일이 있다(둘은 서로 다른 꼭짓점의 각이라 실제로는 다른 값).
 */
const NO_LEAK_POLY = new Set([
  "04",
  "05",
  "06",
  "13",
  "14",
  "16",
  "17",
  "18",
  "20",
  "21",
  "22",
  "24",
]);

/* ────────────────────────────────────────────────────────────────────────
 * 그림 — figureSpec 을 붙인 다섯 유형만
 * ──────────────────────────────────────────────────────────────────────── */

const FIGURE_TYPES = new Set([
  "1-2|작도와 합동|02",
  "1-2|작도와 합동|03",
  "1-2|작도와 합동|04",
  "1-2|다각형|04",
  "1-2|다각형|05",
]);
/**
 * 「다각형」 05 는 $n>8$ 이면 그림을 안 붙인다(대각선이 너무 빽빽해진다).
 * 「다각형」 04 는 변의 개수 $n$ 을 **묻는** 갈래(mode 1)에서 안 붙인다 —
 * 그 그림을 보여 주면 꼭짓점을 세어 답을 그대로 읽을 수 있다.
 */
const FIGURE_OPTIONAL = new Set(["1-2|다각형|05", "1-2|다각형|04"]);

/* ────────────────────────────────────────────────────────────────────────
 * 시험
 * ──────────────────────────────────────────────────────────────────────── */

describe("중1 6B — 작도와 합동 · 다각형(남은 번호)", () => {
  it("자기 배열만 훑는다 — 36유형, key 겹침 없음", () => {
    expect(M1_CONSTR_TYPES.length).toBe(14);
    expect(M1_POLY2_TYPES.length).toBe(22);
    expect(M1_GEO2.length).toBe(36);
    expect(new Set(M1_GEO2.map((e) => e.key)).size).toBe(36);
  });

  it("RPM 색인의 「작도와 합동」 14유형을 빠짐없이 낸다", () => {
    expect(M1_CONSTR_TYPES.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(new Set(M1_CONSTR_TYPES.map((e) => e.rpmMinor))).toEqual(
      new Set(["작도와 합동"]),
    );
  });

  it("「다각형」은 남은 번호만 낸다 (01~06·09~24)", () => {
    expect(M1_POLY2_TYPES.map((e) => e.rpmType)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
      "23",
      "24",
    ]);
    expect(new Set(M1_POLY2_TYPES.map((e) => e.rpmMinor))).toEqual(
      new Set(["다각형"]),
    );
  });

  it("우리 단원 이름이 교육과정 시드(정본)에 실제로 있다", () => {
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_GEO2) {
      expect(
        seeded.has(e.unitSection),
        `중1 시드에 없는 단원 이름: ${e.unitSection} (${e.key})`,
      ).toBe(true);
    }
  });

  it("붙인 단원이 다섯뿐이다 — 엉뚱한 단원으로 새면 눈에 띄게", () => {
    expect(new Set(M1_GEO2.map((e) => e.unitSection))).toEqual(
      new Set([
        "작도",
        "합동",
        "다각형",
        "삼각형의 내각과 외각",
        "다각형의 내각과 외각",
      ]),
    );
  });

  it("제품 전처리가 내 수식의 수를 바꾸지 않는다 (D-73)", () => {
    const digits = (s: string) =>
      (s.match(/\$[^$]*\$/g) ?? []).join(" ").match(/\d+/g)?.join(",") ?? "";
    for (const e of M1_GEO2) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        for (const field of [p.content, p.answer, p.solution]) {
          expect(
            digits(preprocessMathText(field)),
            `${e.key} — 전처리가 수식을 고쳐 씁니다: ${field}`,
          ).toBe(digits(field));
        }
      }
    }
  });

  it("대분수를 직접 쓰지 않았다 (D-73) · 아라비아 숫자 도형 이름 없음 · 빈 자리 없음", () => {
    for (const e of M1_GEO2) {
      for (const seed of ALL_SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        for (const field of [p.content, p.answer, p.solution]) {
          expect(/\d\s*\\d?frac/.test(field), `${e.key} 대분수: ${field}`).toBe(
            false,
          );
          expect(arabicPolygons(field), `${e.key}: ${field}`).toEqual([]);
          expect(unfilledPlaceholders(field), `${e.key}: ${field}`).toEqual([]);
        }
      }
    }
  });

  it("숫자가 KaTeX 밖에 없다 · 지면에 소수가 없다(이 단원은 전부 정수)", () => {
    for (const e of M1_GEO2) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        expect(bareNumbers(p.content), p.content).toEqual([]);
        expect(bareNumbers(p.answer), p.answer).toEqual([]);
        expect(bareNumbers(p.solution), p.solution).toEqual([]);
        for (const field of [p.content, p.answer, p.solution]) {
          expect(
            field.match(/\d+\.\d+/g) ?? [],
            `${e.key} 지면에 소수: ${field}`,
          ).toEqual([]);
          expect(runawayDecimals(field), `${e.key}: ${field}`).toEqual([]);
        }
      }
    }
  });

  it("씨앗을 넓게 훑어도 던지지 않는다 (attempt 소진 없음)", () => {
    for (const e of M1_GEO2) {
      for (const seed of ALL_SEEDS) {
        expect(() => generateMiddleProblem(e.key, seed)).not.toThrow();
      }
    }
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_GEO2) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  for (const [label, entries, verify, answers, noLeak] of [
    [
      "작도와 합동",
      M1_CONSTR_TYPES,
      VERIFY_CONSTR,
      ANSWER_CONSTR,
      NO_LEAK_CONSTR,
    ],
    ["다각형", M1_POLY2_TYPES, VERIFY_POLY, ANSWER_POLY, NO_LEAK_POLY],
  ] as [
    string,
    TypeEntry[],
    Record<string, Check>,
    Record<string, (f: F) => number[]>,
    Set<string>,
  ][]) {
    describe(label, () => {
      for (const e of entries) {
        describe(`${e.rpmType} ${e.rpmTitle}`, () => {
          it("같은 씨앗이면 같은 문항", () => {
            expect(generateMiddleProblem(e.key, 20260824)).toEqual(
              generateMiddleProblem(e.key, 20260824),
            );
          });

          it("씨앗별 독립 검산", () => {
            const check = verify[e.rpmType];
            expect(check, `검산식 누락: ${label}${e.rpmType}`).toBeDefined();
            for (const seed of ALL_SEEDS) {
              const p = generateMiddleProblem(e.key, seed);
              expect(
                check!(p.facts, p),
                `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}\n${p.content}`,
              ).toBe(true);
            }
          });

          it("답에 실린 수가 facts 와 일치한다", () => {
            const want = answers[e.rpmType];
            if (!want) return;
            for (const seed of SEEDS) {
              const p = generateMiddleProblem(e.key, seed);
              const expected = want(p.facts);
              if (expected.length === 0) continue;
              expect(
                dollarNums(p.answer),
                `${e.key} / ${p.answer} vs ${JSON.stringify(p.facts)}`,
              ).toEqual(expected);
            }
          });

          it("답이 발문에 그대로 적혀 있지 않다", () => {
            const id = e.rpmType;
            if (noLeak.has(id)) return;
            const want = answers[id];
            if (!want) return;
            for (const seed of SEEDS) {
              const p = generateMiddleProblem(e.key, seed);
              const inContent = dollarNums(p.content);
              for (const v of want(p.facts)) {
                expect(
                  inContent.includes(v),
                  `답 ${v} 가 발문에 그대로 있다: ${p.content}`,
                ).toBe(false);
              }
            }
          });

          it("그림: 있어야 할 다섯 유형에만 있고, 스펙에 NaN/무한대가 없다", () => {
            const shouldHave = FIGURE_TYPES.has(e.key);
            const optional = FIGURE_OPTIONAL.has(e.key);
            for (const seed of SEEDS) {
              const p = generateMiddleProblem(e.key, seed);
              if (shouldHave) {
                if (!p.figureSpec) {
                  expect(optional, `${e.key} seed ${seed}: 그림 누락`).toBe(
                    true,
                  );
                  continue;
                }
                const spec = p.figureSpec as Spec;
                expect(spec.version, e.key).toBe(2);
                expect(everyNumberFinite(spec), `${e.key}: NaN/무한대`).toBe(
                  true,
                );
                expect(
                  Object.keys(spec.segments as Record<string, unknown>).length,
                  `${e.key}: 선분이 없는 도형`,
                ).toBeGreaterThan(0);
              } else {
                expect(
                  p.figureSpec ?? null,
                  `${e.key} seed ${seed}: 그림이 없어야 한다`,
                ).toBe(null);
              }
            }
          });
        });
      }
    });
  }

  it("작도와 합동 T/F 은행 — 참·거짓이 둘 다 실제로 나온다", () => {
    for (const [key, table] of [
      [M1_CONSTR_TYPES.find((e) => e.rpmType === "01")!.key, TRUTH_01],
      [M1_CONSTR_TYPES.find((e) => e.rpmType === "07")!.key, TRUTH_07],
      [M1_POLY2_TYPES.find((e) => e.rpmType === "01")!.key, TRUTH_POLY01],
      [M1_POLY2_TYPES.find((e) => e.rpmType === "03")!.key, TRUTH_POLY03],
    ] as [string, Record<string, boolean>][]) {
      let trues = 0;
      let falses = 0;
      for (const seed of ALL_SEEDS) {
        const p = generateMiddleProblem(key, seed);
        for (const line of bogiLines(p.content)) {
          if (table[line] === undefined) continue;
          if (table[line]) trues += 1;
          else falses += 1;
        }
      }
      expect(trues, `${key}: 참인 보기가 안 나온다`).toBeGreaterThan(5);
      expect(falses, `${key}: 거짓인 보기가 안 나온다`).toBeGreaterThan(5);
    }
  });

  it("합동 10 — 네 config 가 모두 나오고, 정답 위치가 한쪽으로 쏠리지 않는다", () => {
    const e = M1_CONSTR_TYPES.find((x) => x.rpmType === "10")!;
    const seen = new Set<number>();
    const positions = new Set<number>();
    for (const seed of ALL_SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      seen.add(p.facts.config!);
      positions.add(p.facts.correctPos!);
    }
    expect(seen).toEqual(new Set([0, 1, 2]));
    expect(positions.size, "정답 자리가 한 곳으로 고정됨").toBeGreaterThan(2);
  });

  it("다각형 19 — 두 모드·두 갈래(내각/외각)가 모두 나온다", () => {
    const e = M1_POLY2_TYPES.find((x) => x.rpmType === "19")!;
    const modes = new Set<number>();
    const whichs = new Set<number>();
    for (const seed of ALL_SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      modes.add(p.facts.mode!);
      whichs.add(p.facts.which!);
    }
    expect(modes).toEqual(new Set([0, 1]));
    expect(whichs).toEqual(new Set([0, 1]));
  });
});

describe.skipIf(!hasEngine)("중1 6B — 그림이 실제로 그려진다", () => {
  const figured = M1_GEO2.filter((e) => FIGURE_TYPES.has(e.key));
  expect(figured.length).toBe(5);
  for (const e of figured) {
    it(`${e.rpmType} ${e.rpmTitle}`, async () => {
      for (const seed of SEEDS.slice(0, 4)) {
        const p = generateMiddleProblem(e.key, seed);
        if (!p.figureSpec) continue;
        const r = await renderFigureSpec(p.figureSpec);
        expect(
          r.ok,
          `${e.key} seed ${seed}: ${r.ok ? "" : r.error} ${JSON.stringify(p.figureSpec)}`,
        ).toBe(true);
      }
    }, 60_000);
  }
});
