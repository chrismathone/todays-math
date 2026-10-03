/**
 * 공통수학1 「조합」 — **전수 나열 검산** (물결 1 세션 `h1-count`).
 *
 * 생성기는 교과서 공식(조합의 수 · 여사건 · 특정한 것 먼저 뽑기 · 같은 크기 묶음은 k! 로 나누기)으로
 * 답을 낸다. 여기서는 같은 `facts` 로 부분집합·줄 세우기·직선·나눔·대진표를 **실제로 늘어놓고 센다** —
 * 공식을 옮겨 적지 않는다. 제품의 `nCr`·`nPr` 도 안 부른다(같이 틀리지 않게).
 *
 * 되묻는 꼴(경우의 수 K 가 주어지면 n)은 **발문의 K 를 읽어** 찾는다 — facts 만 보면 「발문에 딴 K」를
 * 못 본다. 02(증명의 빈칸)는 답이 식이다: 증명의 각 줄을 등식으로 보고 빈칸이 가져야 할 값을 여러
 * (n, r) 에서 따로 풀어, 지면의 답 식을 계산한 값과 맞댄다. 오답 넷은 그 값과 **달라야** 한다.
 *
 * 지면(수는 수식 안·냄새·조사)·난이도·형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_COMB, H1_COMB_HOLD } from "../../lib/high/h1Comb";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues } from "../helpers/highAnswer";
import { highCatalog, mathSpans } from "../helpers/highPage";
import { expectedHighTitle } from "../helpers/highTitles";

const BOOK = "공통수학1";
const MINOR = "조합";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

type Fact = Record<string, number>;

// ───────────────────────────── 나열 도구 ─────────────────────────────

/** 0..n-1 에서 k 개를 고르는 부분집합(오름차순) 전부. */
function subsetsOf(n: number, k: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const go = (from: number): void => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let v = from; v < n; v += 1) {
      cur.push(v);
      go(v + 1);
      cur.pop();
    }
  };
  go(0);
  return out;
}

/** 0..n-1 에서 서로 다른 k 개를 골라 **줄 세운** 것 전부. */
function arrangementsOf(n: number, k: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const go = (): void => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let v = 0; v < n; v += 1) {
      if (used[v]) continue;
      used[v] = true;
      cur.push(v);
      go();
      cur.pop();
      used[v] = false;
    }
  };
  go();
  return out;
}

const countCache = new Map<string, number>();
function cached(key: string, f: () => number): number {
  const hit = countCache.get(key);
  if (hit !== undefined) return hit;
  const v = f();
  countCache.set(key, v);
  return v;
}

/** 부분집합을 **세어서** 얻은 ₙCᵣ — 제품의 셈을 안 부른다. */
const choose = (n: number, k: number): number =>
  k < 0 || k > n ? 0 : cached(`C${n},${k}`, () => subsetsOf(n, k).length);

/** 줄 세운 것을 **세어서** 얻은 ₙPᵣ. */
const arrange = (n: number, k: number): number =>
  k < 0 || k > n ? 0 : cached(`P${n},${k}`, () => arrangementsOf(n, k).length);

/** 허락된 숫자로 만든, 숫자가 서로 다른 r 자리 자연수 전부. */
function distinctDigitNumbers(digits: readonly number[], r: number): number[] {
  const out: number[] = [];
  const go = (acc: number[]): void => {
    if (acc.length === r) {
      out.push(Number(acc.join("")));
      return;
    }
    for (const d of digits) {
      if (acc.includes(d)) continue;
      if (acc.length === 0 && d === 0) continue;
      go([...acc, d]);
    }
  };
  go([]);
  return out;
}

/** 조건을 만족하는 값이 **정확히 하나**여야 한다 — 되묻는 꼴의 답이 하나로 정해지는가. */
function uniqueHit(lo: number, hi: number, ok: (x: number) => boolean): number {
  const hits: number[] = [];
  for (let x = lo; x <= hi; x += 1) if (ok(x)) hits.push(x);
  expect(hits, `답이 하나로 정해지지 않는다 (${lo}..${hi})`).toHaveLength(1);
  return hits[0]!;
}

/** 지면에서 수 하나를 읽는다 — 못 읽으면 던진다(조용히 통과 금지). */
function readInt(text: string, re: RegExp, what: string): number {
  const m = re.exec(text);
  if (!m) throw new Error(`${what} 을(를) 발문에서 못 읽는다: ${text}`);
  return Number(m[1]);
}

/** 정수 좌표 점들이 정하는 서로 다른 직선의 수 — 한 직선 위의 점 묶음을 열쇠로 센다. */
function distinctLines(pts: readonly (readonly [number, number])[]): number {
  const keys = new Set<string>();
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[j]!;
      const on = pts
        .map((q, idx) => [q, idx] as const)
        .filter(([[x, y]]) => (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) === 0)
        .map(([, idx]) => idx);
      keys.add(on.join(","));
    }
  }
  return keys.size;
}

/** 정수 좌표 점들로 만드는 삼각형의 수 — 세 점이 한 직선 위에 있지 않은 것. */
function triangles(pts: readonly (readonly [number, number])[]): number {
  let c = 0;
  for (const [i, j, k] of subsetsOf(pts.length, 3) as [
    number,
    number,
    number,
  ][]) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[j]!;
    const [x3, y3] = pts[k]!;
    if ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) !== 0) c += 1;
  }
  return c;
}

function grid(a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (let j = 0; j < b; j += 1)
    for (let i = 0; i < a; i += 1) out.push([i, j]);
  return out;
}

/** 다각형의 대각선 — 이웃하지 않는 두 꼭짓점을 이은 선분을 센다. */
function diagonalCount(n: number): number {
  let c = 0;
  for (const [i, j] of subsetsOf(n, 2) as [number, number][]) {
    const gap = j - i;
    if (gap !== 1 && gap !== n - 1) c += 1;
  }
  return c;
}

// ───────────────────────────── 02 증명의 빈칸 ─────────────────────────────

function fc(k: number): number {
  let out = 1;
  for (let i = 2; i <= k; i += 1) out *= i;
  return out;
}

/**
 * 증명의 각 줄을 등식으로 보고 **빈칸이 가져야 할 값**을 푼 것. 답의 식이 아니라 줄의 등식을 적었다
 * (예: `n×(n-1)!/((r-1)!·㈎) = n×ₙ₋₁Cᵣ₋₁` 에서 ㈎ 를 푼다).
 */
const BLANK_VALUE: Record<number, ((n: number, r: number) => number)[]> = {
  1: [
    (n, r) => fc(n - 1) / (fc(r - 1) * choose(n - 1, r - 1)),
    (n, r) =>
      ((n * fc(n - 1)) / (fc(r - 1) * fc(n - r))) * fc(r - 1) * fc(n - r),
    (n, r) => (r * fc(n)) / (fc(n) / (fc(r - 1) * fc(n - r))) / fc(n - r),
  ],
  2: [
    (n, r) =>
      (fc(n - 1) / (fc(r) * fc(n - r - 1)) / fc(n - 1)) * fc(r) * fc(n - r),
    (n, r) =>
      (fc(n - 1) / (fc(r - 1) * fc(n - r)) / fc(n - 1)) * fc(r) * fc(n - r),
    (n, r) => (choose(n, r) * fc(r) * fc(n - r)) / fc(n - 1),
  ],
  3: [(n, r) => fc(n) / (fc(n - r) * choose(n, r))],
  5: [(n, r) => (n * fc(n - 1)) / arrange(n, r)],
  6: [(n, r) => fc(n) / arrange(n, r)],
};

const SAMPLES: readonly (readonly [number, number])[] = [
  [5, 2],
  [6, 3],
  [7, 2],
  [8, 5],
  [9, 4],
  [6, 1],
];

/** 답 식(`(n-r)!` · `n-r` · `2n` …)을 (n, r) 에서 계산한다 — 못 읽는 꼴이면 던진다. */
function evalExpr(src: string, n: number, r: number): number {
  const s = src.replace(/\s+/g, "");
  let i = 0;
  const expr = (): number => {
    let v = term();
    while (s[i] === "+" || s[i] === "-") {
      const op = s[i]!;
      i += 1;
      const w = term();
      v = op === "+" ? v + w : v - w;
    }
    return v;
  };
  const term = (): number => {
    let v = factor();
    while (i < s.length && /[0-9nr(]/.test(s[i]!)) v *= factor();
    return v;
  };
  const factor = (): number => {
    let v: number;
    const c = s[i];
    if (c === "(") {
      i += 1;
      v = expr();
      if (s[i] !== ")") throw new Error(`괄호가 안 닫혔다: ${src}`);
      i += 1;
    } else if (c === "n" || c === "r") {
      i += 1;
      v = c === "n" ? n : r;
    } else if (c !== undefined && /[0-9]/.test(c)) {
      const m = /^\d+/.exec(s.slice(i))!;
      i += m[0].length;
      v = Number(m[0]);
    } else {
      throw new Error(`답 식을 못 읽는다: ${src} @${i}`);
    }
    while (s[i] === "!") {
      v = fc(v);
      i += 1;
    }
    return v;
  };
  const v = expr();
  if (i !== s.length) throw new Error(`답 식 끝에 남은 조각: ${src}`);
  return v;
}

const bodyOf = (tex: string): string => /^\$(.+)\$$/.exec(tex.trim())![1]!;

// ───────────────────────────── 09·10 도형 ─────────────────────────────

/**
 * 반원 위의 점을 **정수 좌표**로 — 세 점이 한 직선 위에 있는지를 부동소수 없이 판정하려고.
 * 호 위의 점은 단위원의 유리점 `((b²−a²)/(a²+b²), 2ab/(a²+b²))`(위 반원), 지름 위의 점은 x 좌표가
 * 유리수인 점이다. 분모의 최소공배수로 키웠다.
 */
const ARC_T: readonly (readonly [number, number])[] = [
  [1, 5],
  [1, 4],
  [1, 3],
  [1, 2],
  [2, 1],
  [3, 1],
];
const DIAMETER_X: readonly (readonly [number, number])[] = [
  [-1, 1],
  [1, 1],
  [0, 1],
  [-1, 2],
  [1, 3],
];
const SCALE = 13260; // 26·17·10·5·2·3 의 최소공배수
function semicirclePoints(p: number, q: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [num, den] of DIAMETER_X.slice(0, p)) {
    out.push([(SCALE * num) / den, 0]);
  }
  for (const [a, b] of ARC_T.slice(0, q)) {
    const d = a * a + b * b;
    out.push([(SCALE * (b * b - a * a)) / d, (SCALE * 2 * a * b) / d]);
  }
  return out;
}

/** 평행한 두 직선 y=0 · y=3 위의 점(07 과 같은 배치). */
function twoLinePoints(p: number, q: number): [number, number][] {
  return [
    ...Array.from({ length: p }, (_, i): [number, number] => [i, 0]),
    ...Array.from({ length: q }, (_, i): [number, number] => [2 * i + 1, 3]),
  ];
}

function collinear(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): boolean {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) === 0;
}

/** 네 점 가운데 어느 세 점도 한 직선 위에 있지 않은 것 — 사각형이 되는 네 점. */
function quadrilaterals(pts: readonly (readonly [number, number])[]): number {
  return subsetsOf(pts.length, 4).filter((s) =>
    subsetsOf(4, 3).every(
      ([i, j, k]) => !collinear(pts[s[i!]!]!, pts[s[j!]!]!, pts[s[k!]!]!),
    ),
  ).length;
}

// ───────────────────────────── 11·12 나눔 ─────────────────────────────

const partitionCache = new Map<number, number[][]>();
/** 서로 다른 n 개를 이름 없는 묶음으로 나눈 것 전부 — 첫 등장 순서로 묶음 번호를 매긴 수열. */
function setPartitions(n: number): number[][] {
  const hit = partitionCache.get(n);
  if (hit) return hit;
  const out: number[][] = [];
  const cur: number[] = [];
  const go = (i: number, blocks: number): void => {
    if (i === n) {
      out.push([...cur]);
      return;
    }
    for (let b = 0; b <= blocks; b += 1) {
      cur.push(b);
      go(i + 1, Math.max(blocks, b + 1));
      cur.pop();
    }
  };
  go(0, 0);
  partitionCache.set(n, out);
  return out;
}

/** 묶음(또는 사람·층)마다 몇 개가 들어갔나 — 큰 것부터. */
function blockSizes(labels: readonly number[], blocks?: number): number[] {
  const k = blocks ?? Math.max(...labels) + 1;
  const out = new Array<number>(k).fill(0);
  for (const b of labels) out[b]! += 1;
  return out.sort((x, y) => y - x);
}

const sameList = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

// ───────────────────────────── 13 대진표 ─────────────────────────────

/** 대진표 모양 — 수는 자리 번호. 발문의 글(조 크기 · 조 안의 방식)을 시험이 따로 옮긴 것이다. */
type Tree = number | Tree[];
const BRACKET_TREE: Record<number, Tree> = {
  4: [
    [0, 1],
    [2, 3],
  ],
  5: [
    [0, [1, 2]],
    [3, 4],
  ],
  6: [
    [0, [1, 2]],
    [3, [4, 5]],
  ],
  7: [
    [
      [0, 1],
      [2, 3],
    ],
    [4, [5, 6]],
  ],
  8: [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [4, 5],
      [6, 7],
    ],
  ],
};

/** 자리마다 (결승에서부터의 깊이, 결승의 어느 쪽 조인가). */
function slotInfo(
  t: Tree,
  depth = 0,
  side = -1,
  out = new Map<number, [number, number]>(),
) {
  if (typeof t === "number") {
    out.set(t, [depth, side]);
    return out;
  }
  t.forEach((c, i) => slotInfo(c, depth + 1, depth === 0 ? i : side, out));
  return out;
}

/** 팀 배치를 경기 순서와 무관한 모양으로 — 한 경기의 두 쪽은 순서가 없다. */
function canon(t: Tree, team: readonly number[]): string {
  if (typeof t === "number") return String(team[t]);
  return `(${t
    .map((c) => canon(c, team))
    .sort()
    .join(",")})`;
}

/** 서로 다른 대진표의 수 — 팀 0 = A팀, 팀 1 = B팀. */
function bracketCount(n: number, mode: number): number {
  return cached(`13-${n}-${mode}`, () => {
    const tree = BRACKET_TREE[n]!;
    const info = slotInfo(tree);
    const seen = new Set<string>();
    for (const team of arrangementsOf(n, n)) {
      const slotOf = (x: number): number => team.indexOf(x);
      if (mode === 1 && info.get(slotOf(0))![0] !== 2) continue;
      if (mode === 2 && info.get(slotOf(0))![1] === info.get(slotOf(1))![1])
        continue;
      seen.add(canon(tree, team));
    }
    return seen.size;
  });
}

// ───────────────────────────── VERIFY ─────────────────────────────

const VERIFY: Record<string, (f: Fact, p: HighProblem) => number> = {
  "01": (f, p) => {
    if (f.mode === 0) {
      const K = readInt(p.content, /\\mathrm\{P\}_\{\d\}=(\d+)\$일 때/, "K");
      const n = uniqueHit(f.r0!, 30, (x) => arrange(x, f.r0!) === K);
      return choose(n, f.a!) + arrange(n, f.b!);
    }
    if (f.mode === 1) {
      if (f.kind === 0) {
        return uniqueHit(f.b!, 30, (x) => choose(x, f.a!) === choose(x, f.b!));
      }
      return uniqueHit(f.r!, 30, (x) => choose(x, f.r!) === f.K);
    }
    if (f.mode === 2) {
      return uniqueHit(1, 30, (r) => {
        const i1 = r + f.s!;
        const i2 = f.p! * r - f.t!;
        if (i1 < 0 || i1 > f.n! || i2 < 0 || i2 > f.n!) return false;
        return choose(f.n!, i1) === choose(f.n!, i2);
      });
    }
    if (f.kind === 0) {
      return uniqueHit(4, 30, (x) => arrange(x, 4) === f.k! * arrange(x, 2));
    }
    return uniqueHit(3, 30, (x) => arrange(x, 3) === f.k! * choose(x, 2));
  },

  "03": (f, p) => {
    if (f.mode === 0) {
      return subsetsOf(f.m! + f.w!, f.k!).filter(
        (s) => s.every((x) => x < f.m!) || s.every((x) => x >= f.m!),
      ).length;
    }
    if (f.mode === 1) {
      return subsetsOf(f.N!, 2).filter(([a, b]) => {
        const x = a! + 1;
        const y = b! + 1;
        if (f.kind === 0) return (x + y) % 2 === 0;
        if (f.kind === 1) return (x + y) % 2 === 1;
        return (x * y) % 2 === 0;
      }).length;
    }
    if (f.mode === 2) {
      return uniqueHit(2, 30, (n) => f.g! * subsetsOf(n, 2).length === f.G);
    }
    if (f.mode === 3) {
      return uniqueHit(
        f.r1!,
        20,
        (n) => choose(n, f.r1!) * choose(f.Y!, f.r2!) === f.K,
      );
    }
    if (f.mode === 4) {
      const len = f.z! + f.b!;
      return subsetsOf(len, f.z!).filter((zeros) => {
        if (zeros[0] === 0) return false;
        return zeros.every((x, i) => i === 0 || x - zeros[i - 1]! > 1);
      }).length;
    }
    // 양말 — 짝 번호가 floor(i/2) 인 2n 짝에서 4짝, 온전한 켤레가 정확히 하나
    void p;
    return subsetsOf(2 * f.n!, 4).filter((s) => {
      const pairs = new Map<number, number>();
      for (const x of s) pairs.set(x >> 1, (pairs.get(x >> 1) ?? 0) + 1);
      return [...pairs.values()].filter((c) => c === 2).length === 1;
    }).length;
  },

  "04": (f, p) => {
    if (f.mode === 0) {
      return subsetsOf(f.N!, f.r!).filter((s) =>
        s.some((x) => ((x + 1) % 2 === 0) === (f.kind === 0)),
      ).length;
    }
    if (f.mode === 1) {
      return subsetsOf(f.Y! + f.B!, f.r!).filter((s) =>
        s.some((x) => x >= f.Y!),
      ).length;
    }
    if (f.mode === 2) {
      return subsetsOf(f.m! + f.w!, f.r!).filter(
        (s) => s.some((x) => x < f.m!) && s.some((x) => x >= f.m!),
      ).length;
    }
    if (f.mode === 3) {
      const K = readInt(p.content, /경우의 수가 \$(\d+)\$일 때/, "K");
      const women = uniqueHit(
        2,
        f.N! - 1,
        (x) =>
          subsetsOf(f.N!, 2).filter(([a, b]) => a! < f.N! - x || b! < f.N! - x)
            .length === K,
      );
      return f.N! - women;
    }
    return subsetsOf(f.m! + f.w!, 4).filter(
      (s) => s.filter((x) => x >= f.m!).length >= 2,
    ).length;
  },

  "05": (f) => {
    if (f.mode === 0) {
      return subsetsOf(f.n!, f.r!).filter(
        (s) => s.includes(0) !== s.includes(1),
      ).length;
    }
    if (f.mode === 1) {
      return subsetsOf(f.N!, f.r!).filter((s) =>
        Array.from({ length: f.k! }, (_, i) => i).every((x) => s.includes(x)),
      ).length;
    }
    if (f.mode === 2) {
      return subsetsOf(f.n!, f.r!).filter(
        (s) => !s.includes(0) && !s.includes(1),
      ).length;
    }
    if (f.mode === 3) {
      return subsetsOf(f.N!, f.r!).filter((s) => {
        const vals = s.map((x) => x + 1);
        for (let v = 1; v <= f.N!; v += 1) {
          if (v % f.a! === 0 && !vals.includes(v)) return false;
          if (v % f.b! === 0 && vals.includes(v)) return false;
        }
        return true;
      }).length;
    }
    if (f.mode === 4) {
      return subsetsOf(f.N!, 3).filter((s) => s[2]! + 1 >= f.t!).length;
    }
    const pairs = subsetsOf(f.n!, 2);
    let c = 0;
    for (const A of pairs)
      for (const B of pairs) {
        const common = A.filter((x) => B.includes(x)).length;
        if (
          f.kind === 0
            ? common <= 1
            : f.kind === 1
              ? common === 1
              : common === 0
        )
          c += 1;
      }
    return c;
  },

  "06": (f, p) => {
    if (f.mode === 0) {
      return arrangementsOf(f.n!, f.r!).filter((s) => {
        const i = s.indexOf(0);
        const j = s.indexOf(1);
        return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
      }).length;
    }
    if (f.mode === 1) {
      return arrangementsOf(f.a! + f.b!, f.p! + f.q!).filter(
        (s) => s.filter((x) => x < f.a!).length === f.p,
      ).length;
    }
    if (f.mode === 2) {
      return distinctDigitNumbers(
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        f.p! + f.q!,
      ).filter(
        (x) => [...String(x)].filter((d) => Number(d) % 2 === 1).length === f.p,
      ).length;
    }
    if (f.mode === 3) {
      const K = readInt(p.content, /경우의 수가 \$(\d+)\$일 때/, "K");
      return uniqueHit(
        f.r!,
        20,
        (n) =>
          cached(
            `06-3-${n}-${f.r}`,
            () => arrangementsOf(n, f.r!).filter((s) => s.includes(0)).length,
          ) === K,
      );
    }
    if (f.mode === 4) {
      const digits = Array.from({ length: f.N! }, (_, i) => i + 1);
      return distinctDigitNumbers(digits, f.k!).filter((x) => {
        const s = String(x);
        return s.includes(String(f.x)) && !s.includes(String(f.y));
      }).length;
    }
    const adults = f.a!;
    return arrangementsOf(adults + f.c!, f.p! + 2).filter((s) => {
      const kids = s.map((x) => x >= adults);
      if (kids.filter(Boolean).length !== 2) return false;
      return kids.every((k, i) => i === 0 || !(k && kids[i - 1]));
    }).length;
  },

  "07": (f) => {
    if (f.mode === 0) {
      // 원 위의 점 · 어느 세 점도 한 직선 위에 없는 점 — 두 점마다 직선이 하나
      return subsetsOf(f.n!, 2).length;
    }
    if (f.mode === 1) {
      const pts: [number, number][] = [
        ...Array.from({ length: f.p! }, (_, i): [number, number] => [i, 0]),
        ...Array.from({ length: f.q! }, (_, i): [number, number] => [
          2 * i + 1,
          3,
        ]),
      ];
      return distinctLines(pts);
    }
    return distinctLines(grid(f.a!, f.b!));
  },

  "08": (f) => {
    if (f.mode === 0) return diagonalCount(f.n!);
    if (f.mode === 1) return diagonalCount(f.n1!) + diagonalCount(f.n2!);
    if (f.mode === 2) return uniqueHit(3, 40, (n) => diagonalCount(n) === f.K);
    const n = uniqueHit(3, 40, (x) => {
      let fromOne = 0;
      for (let j = 1; j < x; j += 1) if (j !== 1 && j !== x - 1) fromOne += 1;
      return fromOne === f.d;
    });
    return diagonalCount(n);
  },

  "09": (f) => {
    if (f.mode === 0) return triangles(semicirclePoints(f.p!, f.q!));
    if (f.mode === 1) {
      const pts = twoLinePoints(f.p!, f.q!);
      return f.kind === 0 ? quadrilaterals(pts) : triangles(pts);
    }
    if (f.mode === 2) return triangles(grid(f.a!, f.b!));
    // 같은 간격의 2k 점 — 번호 차가 k 인 두 점(지름의 양 끝)을 품은 삼각형이 직각삼각형(탈레스)
    const m = 2 * f.k!;
    const all = subsetsOf(m, 3);
    const right = all.filter(([x, y, z]) =>
      [
        [x!, y!],
        [x!, z!],
        [y!, z!],
      ].some(([u, v]) => v! - u! === f.k),
    ).length;
    return f.kind === 0 ? right : all.length - right;
  },

  "10": (f, p) => {
    if (f.mode === 0) {
      return subsetsOf(f.m!, 2).length * subsetsOf(f.n!, 2).length;
    }
    if (f.mode === 1) {
      let c = 0;
      for (let x1 = 0; x1 <= f.a!; x1 += 1)
        for (let x2 = x1 + 1; x2 <= f.a!; x2 += 1)
          for (let y1 = 0; y1 <= f.b!; y1 += 1)
            for (let y2 = y1 + 1; y2 <= f.b!; y2 += 1)
              if (x2 - x1 !== y2 - y1) c += 1;
      return c;
    }
    if (f.mode === 2) {
      const K = readInt(p.content, /개수가 \$(\d+)\$일 때/, "K");
      return uniqueHit(3, 20, (n) => choose(n, 2) * choose(n - 1, 2) === K);
    }
    const fam = [f.a!, f.b!, f.c!];
    let c = 0;
    for (const [i, j] of subsetsOf(3, 2) as [number, number][]) {
      c += subsetsOf(fam[i]!, 2).length * subsetsOf(fam[j]!, 2).length;
    }
    return c;
  },

  "11": (f) => {
    if (f.mode === 0 || f.mode === 3) {
      // 두 묶음 — 0 번이 든 묶음을 {0} ∪ S 로 두면 나눔 하나가 꼭 한 번 세어진다.
      const n = f.mode === 0 ? f.n! : f.g! + f.b!;
      const h = n / 2;
      const withZero: number[][] = [];
      for (let k = 0; k <= n - 2; k += 1) {
        for (const s of subsetsOf(n - 1, k)) {
          withZero.push([0, ...s.map((x) => x + 1)]);
        }
      }
      if (f.mode === 0) {
        const a = withZero.filter((b0) => b0.length === h).length;
        const b = withZero.filter(
          (b0) => b0.length === f.p || b0.length === n - f.p!,
        ).length;
        return Math.abs(b - a);
      }
      // 여학생은 0..g-1 — 0 번이 든 묶음 밖에도 여학생이 있어야 한다.
      return withZero.filter(
        (b0) =>
          b0.length === h &&
          Array.from({ length: f.g! }, (_, i) => i).some(
            (x) => !b0.includes(x),
          ),
      ).length;
    }
    if (f.mode === 1) {
      return setPartitions(f.n!).filter((l) =>
        sameList(blockSizes(l), [f.s1!, f.s2!, f.s3!]),
      ).length;
    }
    return setPartitions(f.n!).filter((l) => Math.max(...l) === f.k! - 1)
      .length;
  },

  "12": (f) => {
    const desc = (c: readonly number[]) => [...c].sort((x, y) => y - x);
    if (f.mode === 0) {
      const sizes = [f.s1!, f.s2!, f.s3!];
      return countLabeled(sum3(sizes), 3, (c) => sameList(desc(c), sizes));
    }
    if (f.mode === 1) {
      return countLabeled(f.n!, f.k!, (c) => c.every((x) => x > 0));
    }
    if (f.mode === 2) {
      const sizes = [f.s1!, f.s2!, f.s3!];
      const floors = f.F! - 1;
      const want = [...sizes, ...new Array<number>(floors - 3).fill(0)];
      return countLabeled(sum3(sizes), floors, (c) => sameList(desc(c), want));
    }
    return countLabeled(f.c!, 3, (c) => c.every((x) => x <= f.m! - 1));
  },

  "13": (f) => bracketCount(f.n!, f.mode!),
};

const sum3 = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);

/**
 * 서로 다른 n 개를 이름 있는 k 곳에 넣는 kⁿ 가지를 모두 훑어, 곳마다 들어간 **개수**가 조건을
 * 만족하는 것을 센다(사람·층·관람차 칸이 이름 있는 곳이다). 열쇠마다 한 번만 센다.
 */
function countLabeled(
  n: number,
  k: number,
  ok: (counts: readonly number[]) => boolean,
): number {
  let c = 0;
  const counts = new Array<number>(k).fill(0);
  const go = (i: number): void => {
    if (i === n) {
      if (ok(counts)) c += 1;
      return;
    }
    for (let b = 0; b < k; b += 1) {
      counts[b]! += 1;
      go(i + 1);
      counts[b]! -= 1;
    }
  };
  go(0);
  return c;
}

// ───────────────────────────── SHOWN ─────────────────────────────

/** 발문이 **보여 줘야 하는** 수 — 수식 안의 정수 조각으로 있어야 한다. */
const SHOWN: Record<string, (f: Fact) => number[]> = {
  "01": (f) =>
    f.mode === 0
      ? [f.r0!, f.a!, f.b!]
      : f.mode === 1
        ? f.kind === 0
          ? [f.a!, f.b!]
          : [f.r!, f.K!]
        : f.mode === 2
          ? [f.n!, f.s!, f.p!, f.t!]
          : [f.k!],
  "02": () => [],
  "03": (f) =>
    [
      [f.m!, f.w!, f.k!],
      [f.N!],
      [f.g!, f.G!],
      [f.Y!, f.r1!, f.r2!, f.K!],
      [f.z!, f.b!],
      [f.n!, 2 * f.n!],
    ][f.mode!]!,
  "04": (f) =>
    [
      [f.N!, f.r!],
      [f.Y!, f.B!, f.r!],
      [f.m!, f.w!, f.r!],
      [f.N!, f.K!],
      [f.m!, f.w!],
    ][f.mode!]!,
  "05": (f) =>
    [
      [f.n!, f.r!],
      [f.k!, f.N!, f.r!],
      [f.n!, f.r!],
      [f.N!, f.a!, f.b!, f.r!],
      [f.N!, f.t!],
      [f.n!],
    ][f.mode!]!,
  "06": (f) =>
    [
      [f.n!, f.r!],
      [f.a!, f.b!, f.p!, f.q!],
      [f.p!, f.q!],
      [f.r!, f.K!],
      [f.N!, f.k!, f.x!, f.y!],
      [f.a!, f.c!, f.p!],
    ][f.mode!]!,
  "07": (f) => [[f.n!], [f.p!, f.q!], [f.a!, f.b!, f.a! * f.b!]][f.mode!]!,
  "08": (f) => (f.mode === 2 ? [f.K!] : f.mode === 3 ? [f.d!] : []),
  "09": (f) =>
    [
      [f.p!, f.q!, f.p! + f.q!],
      [f.p!, f.q!],
      [f.a!, f.b!, f.a! * f.b!],
      [2 * f.k!],
    ][f.mode!]!,
  "10": (f) =>
    [[f.m!, f.n!], [f.a!, f.b!, f.a! * f.b!], [f.K!], [f.a!, f.b!, f.c!]][
      f.mode!
    ]!,
  "11": (f) =>
    [
      [f.n!, f.n! / 2, f.n! - f.p!, f.p!],
      [f.n!, f.s1!, f.s2!, f.s3!],
      [f.n!, f.k!],
      [f.g!, f.b!, (f.g! + f.b!) / 2],
    ][f.mode!]!,
  "12": (f) =>
    [
      [f.s1! + f.s2! + f.s3!, f.s1!, f.s2!, f.s3!],
      [f.n!, f.k!],
      [f.F!, f.s1! + f.s2! + f.s3!, f.s1!, f.s2!, f.s3!],
      [f.m!, f.c!, f.c! + 3],
    ][f.mode!]!,
  // 조 크기는 시험 쪽 표(`BRACKET_TREE` 의 두 갈래 크기)에서 따로 낸다.
  "13": (f) => [f.n!, ...bracketSides(f.n!)],
};

/** 대진표 두 조의 팀 수 — 시험 쪽 모양에서 센다. */
function bracketSides(n: number): number[] {
  const tree = BRACKET_TREE[n] as Tree[];
  const leaves = (t: Tree): number =>
    typeof t === "number" ? 1 : sum3(t.map(leaves));
  return tree.map(leaves);
}

/** 다각형 이름 — 시험 쪽 표(제품의 이름 짓기를 안 부른다). */
const POLYGON: Record<number, string> = {
  5: "오각형",
  6: "육각형",
  7: "칠각형",
  8: "팔각형",
  9: "구각형",
  10: "십각형",
  11: "십일각형",
  12: "십이각형",
  13: "십삼각형",
  14: "십사각형",
  15: "십오각형",
};

/** 발문에 글자 그대로 있어야 하는 것 — 수로 못 적는 것들. */
const SHOWN_TEXT: Record<string, (f: Fact) => string[]> = {
  "02": (f) =>
    [
      "",
      "r\\times {}_{n}\\mathrm{C}_{r}=n\\times {}_{n-1}\\mathrm{C}_{r-1}",
      "{}_{n}\\mathrm{C}_{r}={}_{n-1}\\mathrm{C}_{r}+{}_{n-1}\\mathrm{C}_{r-1}",
      "{}_{n}\\mathrm{C}_{n-r}={}_{n}\\mathrm{C}_{r}",
      "",
      "{}_{n}\\mathrm{P}_{r}=n\\times {}_{n-1}\\mathrm{P}_{r-1}",
      "{}_{n}\\mathrm{C}_{r}\\times r!={}_{n}\\mathrm{P}_{r}",
    ]
      [f.id!]!.split("\0")
      .filter((s) => s !== "")
      .concat([`${["㈎", "㈏", "㈐"][f.blank!]!}에 알맞은 것`]),
  "08": (f) =>
    f.mode === 0
      ? [`정${POLYGON[f.n!]!}`]
      : f.mode === 1
        ? [POLYGON[f.n1!]!, POLYGON[f.n2!]!]
        : [],
  // 대진표 — 꼴마다 조건 문장이 달라야 한다(꼴과 발문이 어긋나면 값 검산이 엉뚱한 것을 센다).
  "13": (f) =>
    [
      ["대진표를 작성하는 경우의 수"],
      ["A팀이 한 번만 이기면 결승전에 오르도록"],
      ["A팀과 B팀이 결승전에서만 만날 수 있도록"],
    ][f.mode!]!,
};

function spanInts(content: string): Set<number> {
  const out = new Set<number>();
  for (const s of mathSpans(content)) {
    for (const m of s.matchAll(/\d+/g)) out.add(Number(m[0]));
  }
  return out;
}

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_COMB) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 조합 — 등록", () => {
  it("색인 13유형이 등록 ∪ 보류로 전부 덮이고, 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(13);
    const covered = [
      ...H1_COMB.map((e) => e.rpmType),
      ...H1_COMB_HOLD.map((h) => h.key.split("|")[2]!),
    ].sort();
    expect(covered).toEqual(catalogRows.map((t) => t.number).sort());
    for (const e of H1_COMB) {
      const row = catalogRows.find((t) => t.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없는 번호`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(
        expectedHighTitle(e.key, row!.title),
      );
      expect(e.rpmMinor).toBe(MINOR);
      expect(e.key).toBe(`${BOOK}|${MINOR}|${e.rpmType}`);
    }
  });

  it("단원은 시드의 「조합」 · 「조 나누기」이다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === BOOK).map((u) => u.section),
    );
    for (const e of H1_COMB) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
      expect(Number(e.rpmType) <= 10 ? "조합" : "조 나누기").toBe(
        e.unitSection,
      );
    }
  });

  it("등록부에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_COMB) expect(keys.has(e.key)).toBe(true);
  });
});

describe("고등 공통수학1 조합 — 값", () => {
  it("수 정답이 facts 로 늘어놓고 센 것과 같다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      if (number === "02") return;
      const want = VERIFY[number]!(p.facts, p);
      const got = readAnswerValues(p.answer);
      expect(got, `${key} 정답이 값 하나가 아니다: ${p.answer}`).toHaveLength(
        1,
      );
      expect(got[0]!.im, `${key} 허수부`).toBe(0);
      expect(got[0]!.re, `${key} (${JSON.stringify(p.facts)})`).toBe(want);
      expect(p.distractors, `${key}: 수 정답에 생성기 오답`).toBeUndefined();
      checked += 1;
    });
    // 02(식 정답) 말고 전부 — 하나라도 건너뛰면 수가 모자란다.
    expect(checked).toBe((H1_COMB.length - 1) * SEEDS.length * VARIANTS);
  });

  it("02 증명의 빈칸 — 답 식이 줄의 등식을 채우고, 오답 넷은 채우지 못한다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      if (number !== "02") return;
      const need = BLANK_VALUE[p.facts.id!]![p.facts.blank!]!;
      const ans = bodyOf(p.answer);
      for (const [n, r] of SAMPLES) {
        if (p.facts.id === 2 && r >= n) continue;
        expect(evalExpr(ans, n, r), `${key} ${ans} @(${n},${r})`).toBeCloseTo(
          need(n, r),
          9,
        );
      }
      expect(p.distractors, key).toHaveLength(4);
      for (const d of p.distractors!) {
        const body = bodyOf(d);
        const breaks = SAMPLES.some(
          ([n, r]) => Math.abs(evalExpr(body, n, r) - need(n, r)) > 1e-9,
        );
        expect(breaks, `${key} 오답 ${body} 가 빈칸을 채워 버린다`).toBe(true);
      }
      checked += 1;
    });
    expect(
      checked,
      "02 가 한 번도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(20);
  });

  it("발문이 facts 의 수치를 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const shown = spanInts(p.content);
      for (const want of SHOWN[number]!(p.facts)) {
        expect(
          shown.has(want),
          `${key}: 발문에 ${want} 가 없다 — ${p.content}`,
        ).toBe(true);
        checked += 1;
      }
      for (const text of SHOWN_TEXT[number]?.(p.facts) ?? []) {
        expect(p.content, `${key}: 발문에 «${text}» 가 없다`).toContain(text);
        checked += 1;
      }
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1000);
  });

  it("유형마다 꼴이 셋 이상 나온다 — 한 꼴에 갇히지 않는다", () => {
    for (const entry of H1_COMB) {
      const modes = new Set<number>();
      for (const seed of SEEDS)
        for (let v = 0; v < VARIANTS; v += 1)
          modes.add(generateHighProblem(entry.key, seed, v).facts.mode!);
      const want = entry.rpmType === "02" ? 2 : 3;
      expect(
        modes.size,
        `${entry.key} 꼴 ${[...modes].join(",")}`,
      ).toBeGreaterThanOrEqual(want);
    }
  });
});
