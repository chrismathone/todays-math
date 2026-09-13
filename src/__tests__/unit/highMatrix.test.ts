/**
 * 공통수학1 「행렬」 12유형 — **독립 검산** (물결 1 세션 `h1-poly`).
 *
 * 본보기 `highIdentity.test.ts` 를 따른다. 생성기의 답을 믿지 않고 `facts` 로 **다른 길**을 걷는다 —
 * 행렬 등식을 시험 쪽에서 다시 풀기(크라메르) · 곱셈 공식으로 줄이지 않고 **곱을 그대로** 계산하기 ·
 * 조건을 만족시키는 행렬을 실제로 하나 만들어 곱해 보기 · 거듭제곱을 한 번씩 곱해 나가기.
 * 행렬 셈은 제품(`h1Matrix.ts`)을 안 부르고 여기 다시 적었다.
 *
 * 지면 · 난이도 · 형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다 — 여기 옮겨 적지 않는다.
 *
 * 공용 후보(리드에게 — 세션은 `helpers/` 를 못 고친다): `readMatrix`(pmatrix 정답 → 수의 배열) ·
 * `matsIn`(발문의 행렬 전부) · `evalTex`(highFactor.test.ts 와 같은 읽개 — 두 벌이 되었으니
 * 병합 때 helpers 로 올릴 것).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_MATRIX, H1_MATRIX_HOLD } from "../../lib/high/h1Matrix";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues, readValues } from "../helpers/highAnswer";
import {
  highCatalog,
  mathSpans,
  parsePolyTex,
  pkey,
} from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "행렬";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);
const rowOf = (number: string) => {
  const row = catalogRows.find((t) => t.number === number);
  if (!row) throw new Error(`색인에 없는 번호: ${number}`);
  return row;
};

type Fact = Record<string, number>;
type M = number[][];
type Env = Record<string, number>;

// ───────────────────────────── 행렬 셈(시험 쪽) ─────────────────────────────

const tmul = (A: M, B: M): M =>
  A.map((row) =>
    B[0]!.map((_, j) => row.reduce((s, a, k) => s + a * B[k]![j]!, 0)),
  );
const tadd = (A: M, B: M): M => A.map((r, i) => r.map((v, j) => v + B[i]![j]!));
const tsc = (A: M, k: number): M => A.map((r) => r.map((v) => v * k));
const tsum = (A: M): number => A.flat().reduce((s, v) => s + v, 0);
const tE: M = [
  [1, 0],
  [0, 1],
];
const isE = (A: M, k = 1) =>
  Math.abs(A[0]![0]! - k) < 1e-9 &&
  Math.abs(A[1]![1]! - k) < 1e-9 &&
  Math.abs(A[0]![1]!) < 1e-9 &&
  Math.abs(A[1]![0]!) < 1e-9;
const isO = (A: M) => A.flat().every((v) => Math.abs(v) < 1e-9);

/** facts 의 `P11 P12 …` → 행렬. 행·열 수를 모르면 2×2. */
function mget(f: Fact, p: string, rows = 2, cols = 2): M {
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      const v = f[`${p}${i + 1}${j + 1}`];
      if (v === undefined)
        throw new Error(`facts 에 ${p}${i + 1}${j + 1} 가 없다`);
      return v;
    }),
  );
}

/** 2×2 연립일차방정식 — 크라메르. */
function solve2(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): [number, number] {
  const det = a * d - b * c;
  expect(det, "연립방정식이 한 해를 갖지 않는다").not.toBe(0);
  return [(e * d - b * f) / det, (a * f - e * c) / det];
}

// ───────────────────────────── 지면 읽기 ─────────────────────────────

/** `\begin{pmatrix}…\end{pmatrix}` 의 성분 문자열 — 행마다. */
function splitMat(inner: string): string[][] {
  return inner.split("\\\\").map((r) => r.split("&").map((x) => x.trim()));
}

function matsIn(text: string): string[][][] {
  return [
    ...text.matchAll(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g),
  ].map((m) => splitMat(m[1]!));
}

/** 정답 행렬을 수로 — 성분은 정수·분수. 못 읽으면 던진다. */
function readMatrix(answer: string): M {
  const m = /^\$\\begin\{pmatrix\}([\s\S]*)\\end\{pmatrix\}\$$/.exec(
    answer.trim(),
  );
  if (!m) throw new Error(`정답이 행렬 한 덩어리가 아니다: ${answer}`);
  return splitMat(m[1]!).map((r) =>
    r.map((x) => {
      const v = readValues(x);
      if (v.length !== 1 || v[0]!.im !== 0)
        throw new Error(`성분을 못 읽는다: ${x}`);
      return v[0]!.re;
    }),
  );
}

const num = (s: string): number | null => {
  try {
    const v = readValues(s);
    return v.length === 1 && v[0]!.im === 0 ? v[0]!.re : null;
  } catch {
    return null;
  }
};

// 공용 후보: highFactor.test.ts 의 evalTex 와 같은 읽개(문자·괄호·지수·분수·근호) — 여기는 i, j, k 만 쓴다.
function evalTex(src: string, env: Env): number {
  const s = src.replace(/\s+/g, "");
  let pos = 0;
  const peek = () => s[pos];
  const fail = (why: string): never => {
    throw new Error(`식을 못 읽는다 — ${why} (${src})`);
  };
  const group = (): number => {
    if (peek() !== "{") fail("{ 자리");
    pos += 1;
    const v = expr();
    if (peek() !== "}") fail("} 자리");
    pos += 1;
    return v;
  };
  const atom = (): number => {
    const ch = peek();
    if (ch === undefined) return fail("끝");
    const d = /^\d+/.exec(s.slice(pos));
    if (d) {
      pos += d[0].length;
      return Number(d[0]);
    }
    if (ch === "(") {
      pos += 1;
      const v = expr();
      if (peek() !== ")") fail(") 자리");
      pos += 1;
      return v;
    }
    if (/[a-z]/.test(ch)) {
      pos += 1;
      const v = env[ch];
      if (v === undefined) return fail(`모르는 문자 ${ch}`);
      return v;
    }
    return fail(`«${ch}»`);
  };
  const power = (): number => {
    let b = atom();
    while (peek() === "^") {
      pos += 1;
      b = b ** (peek() === "{" ? group() : atom());
    }
    return b;
  };
  const term = (): number => {
    let v = power();
    while (peek() !== undefined && /[\d(a-z]/.test(peek()!)) v *= power();
    return v;
  };
  function expr(): number {
    let sign = 1;
    if (peek() === "-" || peek() === "+") {
      sign = peek() === "-" ? -1 : 1;
      pos += 1;
    }
    let v = sign * term();
    while (peek() === "+" || peek() === "-") {
      const op = peek();
      pos += 1;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const v = expr();
  if (pos !== s.length) fail("끝에 남은 조각");
  return v;
}

const IJ: Env[] = [
  { i: 1, j: 1, k: 0.37 },
  { i: 1, j: 2, k: 0.37 },
  { i: 2, j: 1, k: -1.21 },
  { i: 2, j: 2, k: 2.03 },
];

/**
 * 발문이 facts 의 행렬·식을 **실제로** 보여 주나.
 *   · `mat` — 발문의 행렬 가운데 모양이 같고 성분이 맞는 것이 있나(`null` 성분은 안 본다 · 문자 성분은 글자 그대로)
 *   · `fn`  — $a_{ij}$ 식(등식의 오른쪽 · cases 의 조각)을 $(i,j)$ 넷에서 값으로 맞댄다
 *   · `poly` · `has`
 */
class Shown {
  checked = 0;
  private readonly mats: string[][][];
  private readonly vecs: number[][] = [];
  private readonly polys = new Set<string>();

  constructor(
    private readonly content: string,
    private readonly where: string,
  ) {
    this.mats = matsIn(content);
    for (const span of mathSpans(content)) {
      const pieces = span.split("=");
      const cases = /\\begin\{cases\}([\s\S]*?)\\end\{cases\}/.exec(span);
      if (cases) {
        for (const row of cases[1]!.split("\\\\"))
          pieces.push(row.split("&")[0]!);
      }
      for (const piece of pieces) {
        const p = parsePolyTex(piece);
        if (p) this.polys.add(pkey(p));
        try {
          this.vecs.push(IJ.map((e) => evalTex(piece, e)));
        } catch {
          // 행렬 · 첨자 · 명령어가 든 조각은 대조하지 않는다
        }
      }
    }
  }

  mat(want: readonly (readonly (number | string | null)[])[]): void {
    this.checked += 1;
    const ok = this.mats.some(
      (m) =>
        m.length === want.length &&
        m.every(
          (row, i) =>
            row.length === want[i]!.length &&
            row.every((cell, j) => {
              const w = want[i]![j];
              if (w === null || w === undefined) return true;
              if (typeof w === "string") return cell.replace(/\s+/g, "") === w;
              const v = num(cell);
              return v !== null && Math.abs(v - w) < 1e-9;
            }),
        ),
    );
    expect(
      ok,
      `${this.where}: 발문에 행렬 ${JSON.stringify(want)} 가 없다`,
    ).toBe(true);
  }

  fn(f: (e: Env) => number): void {
    this.checked += 1;
    const want = IJ.map(f);
    expect(
      this.vecs.some((v) => v.every((x, i) => Math.abs(x - want[i]!) < 1e-9)),
      `${this.where}: 발문에 그 식이 없다`,
    ).toBe(true);
  }

  poly(p: readonly number[]): void {
    this.checked += 1;
    expect(
      this.polys.has(pkey(p)),
      `${this.where}: 발문에 다항식 ${pkey(p)} 가 없다`,
    ).toBe(true);
  }

  has(fragment: string): void {
    this.checked += 1;
    expect(
      this.content.includes(fragment),
      `${this.where}: 발문에 «${fragment}» 가 없다`,
    ).toBe(true);
  }
}

// ───────────────────────────── VERIFY ─────────────────────────────

type Expect = { num: number } | { mat: M };

function checkAnswer(p: HighProblem, want: Expect, where: string): void {
  if ("num" in want) {
    const got = readAnswerValues(p.answer);
    expect(got.length, `${where} 값 개수`).toBe(1);
    expect(Math.abs(got[0]!.im), where).toBeLessThan(1e-9);
    expect(
      Math.abs(got[0]!.re - want.num),
      `${where}: 지면 ${p.answer} · 검산 ${want.num}`,
    ).toBeLessThan(1e-6 * Math.max(1, Math.abs(want.num)));
    return;
  }
  const got = readMatrix(p.answer);
  expect(got.length, `${where} 행 수`).toBe(want.mat.length);
  got.forEach((row, i) =>
    row.forEach((v, j) =>
      expect(
        Math.abs(v - want.mat[i]![j]!),
        `${where}: 지면 ${p.answer}`,
      ).toBeLessThan(1e-9),
    ),
  );
}

/** 01 의 $a_{ij}$ 식 — facts 의 매개변수로 시험이 따로 계산한다. */
function f01(f: Fact): (i: number, j: number) => number {
  if (f.fam === 0) return (i, j) => f.al! * i + f.be! * j + f.gm!;
  if (f.fam === 1) return (i, j) => i * i + f.be! * j + f.gm!;
  return (i, j) => f.al! * i * j + f.be! * i + f.gm!;
}

const VERIFY: Record<string, (f: Fact) => Expect> = {
  "01": (f) => {
    if (f.mode === 0) {
      const a = f01(f);
      return {
        mat: [
          [a(1, 1), a(1, 2)],
          [a(2, 1), a(2, 2)],
        ],
      };
    }
    if (f.mode === 1) return { num: tsum(mget(f, "A")) };
    // 모든 성분의 합이 k 의 일차식 — 시험이 k=0, k=1 에서 따로 세워 푼다
    const B = mget(f, "B");
    const K = mget(f, "K");
    const at = (k: number) => tsum(tadd(B, tsc(K, k)));
    return { num: (f.S! - at(0)) / (at(1) - at(0)) };
  },

  "02": (f) => {
    if (f.mode === 0) {
      const g = f.g!;
      const p = f.p!;
      const x =
        f.sum === 1
          ? (g + Math.sqrt(g * g - 4 * p)) / 2
          : (g + Math.sqrt(g * g + 4 * p)) / 2;
      const y = f.sum === 1 ? g - x : x - g;
      return { num: x * x + y * y };
    }
    if (f.mode === 1) {
      const y = f.c1! - f.s1!;
      expect(f.c2! - f.s2!, "두 성분이 가리키는 y 가 다르다").toBe(y);
      const x = (f.P0! - f.qc!) / f.pc!;
      expect(f.rc! * x, "두 성분이 가리키는 x 가 다르다").toBe(f.R0!);
      return { num: [x + y, x * y, x - y][f.exprId!]! };
    }
    if (f.mode === 2) {
      const [a, b] = solve2(f.a1!, f.b1!, f.a2!, f.b2!, f.v1!, f.v2!);
      const [c, d] = solve2(f.g1!, f.d1!, f.g2!, f.d2!, f.w1!, f.w2!);
      return { num: [a * b * c * d, a + b + c + d, a * b - c * d][f.exprId!]! };
    }
    const x = f.P! / f.pC!;
    const y = -f.q!;
    // z² - xz - K1 = 0 과 z² + yz - K2 = 0 의 공통근
    const r1 = [
      x / 2 + Math.sqrt((x * x) / 4 + f.K1!),
      x / 2 - Math.sqrt((x * x) / 4 + f.K1!),
    ];
    const r2 = [
      -y / 2 + Math.sqrt((y * y) / 4 + f.K2!),
      -y / 2 - Math.sqrt((y * y) / 4 + f.K2!),
    ];
    const common = r1.filter((z) => r2.some((w) => Math.abs(z - w) < 1e-9));
    expect(
      new Set(common.map((z) => z.toFixed(9))).size,
      "공통근이 하나가 아니다",
    ).toBe(1);
    const z = common[0]!;
    return { num: [x + y + z, x * x + y * y + z * z, x * y * z][f.exprId!]! };
  },

  "03": (f) => {
    const A = mget(f, "A");
    const B = mget(f, "B");
    if (f.mode === 0) {
      // p(X - B) = A - qX  →  (p + q)X = A + pB
      return { num: tsum(tsc(tadd(A, tsc(B, f.p!)), 1 / (f.p! + f.q!))) };
    }
    if (f.mode === 1) {
      const R = tadd(tsc(tadd(A, B), f.p!), tsc(tadd(A, tsc(B, -1)), -f.q!));
      return { num: f.ask === 0 ? tsum(R) : R[f.i! - 1]![f.j! - 1]! };
    }
    // A - mX = n(B - X)  →  (n - m)X = nB - A
    return { mat: tsc(tadd(tsc(B, f.n!), tsc(A, -1)), 1 / (f.n! - f.m!)) };
  },

  "04": (f) => {
    const P = mget(f, "P");
    const Q = mget(f, "Q");
    const det = f.a1! * f.b2! - f.a2! * f.b1!;
    const A = tsc(tadd(tsc(P, f.b2!), tsc(Q, -f.b1!)), 1 / det);
    const B = tsc(tadd(tsc(Q, f.a1!), tsc(P, -f.a2!)), 1 / det);
    if (f.mode === 0) return { num: tsum(tadd(tsc(A, f.g!), tsc(B, f.d!))) };
    if (f.ask === 0) return { num: A.flat().reduce((s, v) => s * v, 1) };
    if (f.ask === 1) return { num: tsum(tadd(A, B)) };
    return { num: B[f.i! - 1]![f.j! - 1]! };
  },

  "05": (f) => {
    const A = mget(f, "A");
    const B = mget(f, "B");
    const C = mget(f, "C");
    const cells: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ].filter(([i, j]) => f.mode === 0 || !(i === f.hr && j === f.hc)) as [
      number,
      number,
    ][];
    let sol: [number, number] | null = null;
    for (let s = 0; s < cells.length && !sol; s += 1)
      for (let t = s + 1; t < cells.length && !sol; t += 1) {
        const [i1, j1] = cells[s]!;
        const [i2, j2] = cells[t]!;
        const det = A[i1]![j1]! * B[i2]![j2]! - A[i2]![j2]! * B[i1]![j1]!;
        if (det !== 0)
          sol = solve2(
            A[i1]![j1]!,
            B[i1]![j1]!,
            A[i2]![j2]!,
            B[i2]![j2]!,
            C[i1]![j1]!,
            C[i2]![j2]!,
          );
      }
    expect(sol, "성분 둘로 계수를 못 정한다").not.toBeNull();
    const [x, y] = sol!;
    for (const [i, j] of cells) {
      expect(
        Math.abs(A[i]![j]! * x + B[i]![j]! * y - C[i]![j]!),
        "나머지 성분이 안 맞는다",
      ).toBeLessThan(1e-9);
    }
    if (f.mode === 0) return { num: [x + y, x * y, x - y][f.exprId!]! };
    return { num: (C[f.hr!]![f.hc!]! - A[f.hr!]![f.hc!]! * x) / y };
  },

  "06": (f) => {
    if (f.mode === 0) {
      const D = Math.sqrt(f.s! * f.s! - 4 * f.p!);
      const al = (f.s! + D) / 2;
      const be = (f.s! - D) / 2;
      const R = tmul(
        [
          [f.u! * al, 0],
          [be, al],
        ],
        [
          [be, 0],
          [al, f.v! * be],
        ],
      );
      return { num: tsum(R) };
    }
    if (f.mode === 1) {
      const [rA, cA, cB] =
        f.shape === 0 ? [1, 2, 2] : f.shape === 1 ? [2, 2, 1] : [2, 2, 2];
      const R = tmul(mget(f, "A", rA, cA), mget(f, "B", cA, cB));
      return { num: f.ask === 0 ? tsum(R) : R[f.i! - 1]![f.j! - 1]! };
    }
    if (f.mode === 2) {
      const b = (f.v1! - f.p! * f.s!) / f.q!;
      const c = (f.p! * f.t!) / f.k!;
      const a = f.v2! / b;
      expect(
        tmul(
          [
            [f.p!, f.q!],
            [0, a],
          ],
          [
            [f.s!, f.t!],
            [b, 0],
          ],
        ),
        "구한 성분으로 곱이 안 맞는다",
      ).toEqual([
        [f.v1!, f.k! * c],
        [f.v2!, 0],
      ]);
      return { num: a + b + c };
    }
    if (f.mode === 3) {
      const Y = mget(f, "Y");
      const a =
        (f.p! * Y[0]![1]! + f.q! * Y[1]![1]! - Y[0]![0]! * f.q!) / Y[0]![1]!;
      const X = [
        [f.p!, f.q!],
        [f.r!, a],
      ];
      expect(
        isO(tadd(tmul(X, Y), tsc(tmul(Y, X), -1))),
        "XY 와 YX 가 다르다",
      ).toBe(true);
      return { num: a };
    }
    const P = mget(f, "P");
    const Q = mget(f, "Q");
    const X = tsc(tadd(P, Q), 1 / 2);
    const Y = tsc(tadd(P, tsc(Q, -1)), 1 / 2);
    return { num: tsum(tadd(tmul(X, Y), tsc(tmul(Y, X), -1))) };
  },

  "07": (f) => {
    if (f.mode === 0) {
      // a=1, b=0, c=0, d=1 인 A 를 실제로 만들어 곱해 본다
      const A = [
        [f.u0!, f.w0!],
        [f.u1!, f.w1!],
      ];
      return { mat: tmul(A, [[f.m!], [f.n!]]) };
    }
    if (f.mode === 1) {
      const [x, y] = solve2(f.u10!, f.u20!, f.u11!, f.u21!, f.t0!, f.t1!);
      const p = x * f.w10! + y * f.w20!;
      const q = x * f.w11! + y * f.w21!;
      return { num: [p - q, p + q][f.exprId!]! };
    }
    // a=b=1 로 놓고 A 를 풀어 A(1,1)ᵀ 를 곱한다
    const V = [
      [f.m1!, f.m2!],
      [f.n1!, f.n2!],
    ];
    const W = [
      [f.w10!, f.w20!],
      [f.w11!, f.w21!],
    ];
    const det = V[0]![0]! * V[1]![1]! - V[0]![1]! * V[1]![0]!;
    const Vinv = tsc(
      [
        [V[1]![1]!, -V[0]![1]!],
        [-V[1]![0]!, V[0]![0]!],
      ],
      1 / det,
    );
    const A = tmul(W, Vinv);
    return { num: tsum(tmul(A, [[1], [1]])) };
  },

  "08": (f) => {
    if (f.mode === 0) {
      const a = Math.sqrt(f.k! - f.p! * f.q!);
      const b = -a;
      const A = [
        [a, f.p!],
        [f.q!, b],
      ];
      expect(isE(tmul(A, A), f.k!), "A² 이 kE 가 아니다").toBe(true);
      return { num: f.ask === 0 ? a * b : a * a + b * b };
    }
    if (f.mode === 1) {
      const a = f.s! - f.d!;
      const b = (f.t! + f.s! * f.d! - f.d! * f.d!) / f.p!;
      const A = [
        [a, f.p!],
        [b, f.d!],
      ];
      const Z = tadd(tadd(tmul(A, A), tsc(A, -f.s!)), tsc(tE, -f.t!));
      expect(isO(Z), "A²-sA-tE 가 O 가 아니다").toBe(true);
      return { num: [a + b, a * b][f.exprId!]! };
    }
    const A = mget(f, "A");
    return { num: tsum(tmul(tmul(A, A), A)) };
  },

  "09": (f) => {
    if (f.mode < 2) {
      const A = mget(f, "A");
      const [a11, a12, a21, a22] = [A[0]![0]!, A[0]![1]!, A[1]![0]!, A[1]![1]!];
      const x = (f.b12! * a21) / a12;
      const y = (f.b11! * a12 + f.b12! * a22 - a11 * f.b12!) / a12;
      const B = [
        [f.b11!, f.b12!],
        [x, y],
      ];
      expect(
        isO(tadd(tmul(A, B), tsc(tmul(B, A), -1))),
        "AB 와 BA 가 다르다",
      ).toBe(true);
      return { num: [x * y, x + y][f.exprId!]! };
    }
    const P = mget(f, "P");
    const Q = mget(f, "Q");
    if (f.vv === 0) return { num: tsum(tadd(Q, tsc(tmul(P, P), -1))) };
    return { num: tsum(tmul(P, Q)) };
  },

  "10": (f) => {
    if (f.mode === 0) {
      const A = mget(f, "A");
      const A2 = tmul(A, A);
      const R =
        f.V === 0
          ? tmul(tadd(A, tE), tadd(tadd(A2, tsc(A, -1)), tE))
          : f.V === 1
            ? tmul(tadd(A, tsc(tE, -1)), tadd(tadd(A2, A), tE))
            : tmul(tadd(A, tE), tadd(A, tsc(tE, -1)));
      return { num: tsum(R) };
    }
    if (f.mode === 1) {
      const A = mget(f, "A");
      expect(isE(tmul(A, A), f.sg!), "A² 이 ±E 가 아니다").toBe(true);
      const S = tadd(tsc(tE, f.p!), tsc(A, f.q!));
      const Mm = tmul(S, S);
      let y: number;
      if (A[0]![1] !== 0) y = Mm[0]![1]! / A[0]![1]!;
      else if (A[1]![0] !== 0) y = Mm[1]![0]! / A[1]![0]!;
      else y = (Mm[0]![0]! - Mm[1]![1]!) / (A[0]![0]! - A[1]![1]!);
      const x = Mm[0]![0]! - y * A[0]![0]!;
      return { num: [x - y, x + y, x * y][f.exprId!]! };
    }
    // A+B=sE, AB=tE 를 만족시키는 A, B 를 실제로 하나 만든다
    const A = [
      [0, 1],
      [-f.t!, f.s!],
    ];
    const B = tadd(tsc(tE, f.s!), tsc(A, -1));
    expect(isE(tmul(A, B), f.t!), "AB 가 tE 가 아니다").toBe(true);
    const R =
      f.ask === 0
        ? tadd(tmul(A, A), tmul(B, B))
        : tadd(tmul(tmul(A, A), A), tmul(tmul(B, B), B));
    expect(
      Math.abs(R[0]![1]!) + Math.abs(R[1]![0]!),
      "kE 꼴이 아니다",
    ).toBeLessThan(1e-9);
    return { num: R[0]![0]! };
  },

  "11": (f) => {
    const pw = (A: M, n: number): M => {
      let out = tE;
      for (let i = 0; i < n; i += 1) out = tmul(out, A);
      return out;
    };
    if (f.mode === 0 || f.mode === 3) {
      const A =
        f.low === 1
          ? [
              [1, 0],
              [f.k!, 1],
            ]
          : [
              [1, f.k!],
              [0, 1],
            ];
      if (f.mode === 0) return { num: tsum(pw(A, f.n!)) };
      let S: M = [
        [0, 0],
        [0, 0],
      ];
      for (let i = 1; i <= 2 * f.m!; i += 1)
        S = tadd(S, tsc(pw(A, i), i % 2 === 1 ? 1 : -1));
      return { num: tsum(S) };
    }
    const A = mget(f, "A");
    if (f.mode === 1) {
      if (f.ask === 1) return { num: tsum(pw(A, f.n!)) };
      let S: M = [
        [0, 0],
        [0, 0],
      ];
      for (let i = 1; i <= f.n!; i += 1) S = tadd(S, pw(A, i));
      return { num: tsum(S) };
    }
    let ord = 0;
    for (let i = 1; i <= 12 && ord === 0; i += 1) if (isE(pw(A, i))) ord = i;
    expect(ord, "A^n=E 가 되는 n 을 못 찾았다").toBeGreaterThan(0);
    return {
      num:
        f.ask === 0 ? Math.ceil(100 / ord) * ord : Math.floor(99 / ord) * ord,
    };
  },

  "12": (f) => {
    const A = mget(f, "A");
    const [a11, a12] = [A[0]![0]!, A[0]![1]!];
    if (f.mode === 1) {
      const B = mget(f, "B");
      const x = B[0]![0]! + (a12 * (B[1]![0]! - f.c21!)) / a11;
      const y = B[1]![1]! + (a11 * (B[0]![1]! - f.c12!)) / a12;
      const C = [
        [x, f.c12!],
        [f.c21!, y],
      ];
      expect(isO(tmul(A, tadd(B, tsc(C, -1)))), "A(B-C) 가 O 가 아니다").toBe(
        true,
      );
      expect(
        isO(tadd(B, tsc(C, -1))),
        "B 와 C 가 같다 — «AB=AC 인데 B≠C» 가 아니다",
      ).toBe(false);
      return { num: [x + y, x * y][f.exprId!]! };
    }
    const x = (-a12 * f.b21!) / a11;
    const y = (-a11 * f.b12!) / a12;
    const B = [
      [x, f.b12!],
      [f.b21!, y],
    ];
    expect(isO(tmul(A, B)), "AB 가 O 가 아니다").toBe(true);
    if (f.mode === 0) return { num: [x + y, x * y][f.exprId!]! };
    return { num: tsum(tmul(B, A)) };
  },
};

// ───────────────────────────── SHOWN ─────────────────────────────

const SHOWN: Record<string, (f: Fact, sh: Shown) => void> = {
  "01": (f, sh) => {
    if (f.mode === 0) {
      const a = f01(f);
      sh.fn((e) => a(e.i!, e.j!));
    } else if (f.mode === 1) {
      const A = mget(f, "A");
      // cases 의 세 조각이 각자 제 자리 성분을 낸다 — 적어도 대각 성분 식과 두 비대각 식이 있어야 한다
      sh.has("\\begin{cases}");
      expect(A.length).toBe(2);
    } else {
      const B = mget(f, "B");
      const K = mget(f, "K");
      sh.fn((e) => B[e.i! - 1]![e.j! - 1]! + K[e.i! - 1]![e.j! - 1]! * e.k!);
      sh.has(`$${f.S}$`);
    }
  },
  "02": (f, sh) => {
    if (f.mode === 0) {
      sh.mat([
        ["x^{2}", f.g!],
        [f.p!, "y^{2}"],
      ]);
    } else if (f.mode === 1) {
      sh.mat([
        [f.c1!, null],
        [f.c2!, null],
      ]);
      sh.mat([
        [null, f.P0!],
        [null, f.R0!],
      ]);
    } else if (f.mode === 2) {
      sh.mat([
        [null, f.v2!],
        [null, f.w2!],
      ]);
      sh.mat([
        [f.v1!, null],
        [f.w1!, null],
      ]);
    } else {
      sh.mat([
        [f.K1!, null],
        [f.K2!, 0],
      ]);
      sh.mat([
        [null, f.P!],
        [null, null],
      ]);
    }
  },
  "03": (f, sh) => {
    sh.mat(mget(f, "A"));
    sh.mat(mget(f, "B"));
  },
  "04": (f, sh) => {
    sh.mat(mget(f, "P"));
    sh.mat(mget(f, "Q"));
  },
  "05": (f, sh) => {
    sh.mat(mget(f, "A"));
    sh.mat(mget(f, "C"));
    const B: (number | null)[][] = mget(f, "B");
    if (f.mode === 1) B[f.hr!]![f.hc!] = null;
    sh.mat(B);
  },
  "06": (f, sh) => {
    if (f.mode === 0) sh.poly([f.p!, -f.s!, 1]);
    else if (f.mode === 1) {
      const [rA, cA, cB] =
        f.shape === 0 ? [1, 2, 2] : f.shape === 1 ? [2, 2, 1] : [2, 2, 2];
      sh.mat(mget(f, "A", rA, cA));
      sh.mat(mget(f, "B", cA, cB));
    } else if (f.mode === 2) {
      sh.mat([
        [f.p!, f.q!],
        [0, null],
      ]);
      sh.mat([
        [f.s!, f.t!],
        [null, 0],
      ]);
      sh.mat([
        [f.v1!, null],
        [f.v2!, 0],
      ]);
    } else if (f.mode === 3) {
      sh.mat(mget(f, "Y"));
      sh.mat([
        [f.p!, f.q!],
        [f.r!, null],
      ]);
    } else {
      sh.mat(mget(f, "P"));
      sh.mat(mget(f, "Q"));
    }
  },
  "07": (f, sh) => {
    if (f.mode === 0) {
      sh.mat([[f.u0!], [f.u1!]]);
      sh.mat([[f.w0!], [f.w1!]]);
    } else if (f.mode === 1) {
      sh.mat([[f.u10!], [f.u11!]]);
      sh.mat([[f.u20!], [f.u21!]]);
      sh.mat([[f.w10!], [f.w11!]]);
      sh.mat([[f.w20!], [f.w21!]]);
      sh.mat([[f.t0!], [f.t1!]]);
    } else {
      sh.mat([[f.w10!], [f.w11!]]);
      sh.mat([[f.w20!], [f.w21!]]);
    }
  },
  "08": (f, sh) => {
    if (f.mode === 0) {
      sh.mat([
        ["a", f.p!],
        [f.q!, "b"],
      ]);
      sh.has(`A^{2}=${f.k === 1 ? "" : f.k}E`);
    } else if (f.mode === 1) {
      sh.mat([
        ["a", f.p!],
        ["b", f.d!],
      ]);
    } else {
      sh.mat(mget(f, "A"));
    }
  },
  "09": (f, sh) => {
    if (f.mode < 2) {
      sh.mat(mget(f, "A"));
      sh.mat([
        [f.b11!, f.b12!],
        ["x", "y"],
      ]);
    } else {
      sh.mat(mget(f, "P"));
      sh.mat(mget(f, "Q"));
    }
  },
  "10": (f, sh) => {
    if (f.mode < 2) sh.mat(mget(f, "A"));
    else {
      const c = (v: number) => (v === 1 ? "" : v === -1 ? "-" : String(v));
      sh.has(`A+B=${c(f.s!)}E`);
      sh.has(`AB=${c(f.t!)}E`);
    }
  },
  "11": (f, sh) => {
    if (f.mode === 0 || f.mode === 3) {
      sh.mat(
        f.low === 1
          ? [
              [1, 0],
              [f.k!, 1],
            ]
          : [
              [1, f.k!],
              [0, 1],
            ],
      );
      if (f.mode === 0) sh.has(`A^{${f.n}}`);
      else sh.has(`A^{${2 * f.m!}}`);
    } else {
      sh.mat(mget(f, "A"));
    }
  },
  "12": (f, sh) => {
    sh.mat(mget(f, "A"));
    if (f.mode === 1) {
      sh.mat(mget(f, "B"));
      sh.mat([
        ["x", f.c12!],
        [f.c21!, "y"],
      ]);
    } else {
      sh.mat([
        ["x", f.b12!],
        [f.b21!, "y"],
      ]);
    }
  },
};

const MODES: Record<string, number> = {
  "01": 3,
  "02": 4,
  "03": 3,
  "04": 2,
  "05": 2,
  "06": 5,
  "07": 3,
  "08": 3,
  "09": 3,
  "10": 3,
  "11": 4,
  "12": 3,
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_MATRIX) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 행렬 — 등록", () => {
  it("색인 12유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(12);
    expect(H1_MATRIX.length + H1_MATRIX_HOLD.length).toBe(catalogRows.length);
    for (const e of H1_MATRIX) {
      const row = rowOf(e.rpmType);
      expect(e.rpmTitle, `${e.key} 제목`).toBe(row.title);
      expect(e.rpmMinor).toBe(MINOR);
      expect(e.rpmBook).toBe(BOOK);
      expect(e.grade).toBe(BOOK);
      expect(e.key).toBe(`${BOOK}|${MINOR}|${e.rpmType}`);
    }
  });

  it("유형의 단원은 교육과정 시드에 실제로 있는 이름이다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === BOOK).map((u) => u.section),
    );
    for (const e of H1_MATRIX) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부에 들어 있고, 보류와 겹치지 않는다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_MATRIX) expect(keys.has(e.key)).toBe(true);
    const held = new Set(registeredHighHolds().map((h) => h.key));
    for (const e of H1_MATRIX) expect(held.has(e.key)).toBe(false);
  });
});

describe("고등 공통수학1 행렬 — 값", () => {
  it("정답을 facts 로 다시 세운 것과 같다", () => {
    eachProblem((p, key, number) => {
      checkAnswer(
        p,
        VERIFY[number]!(p.facts),
        `${key} (${JSON.stringify(p.facts)})`,
      );
    });
  });

  it("발문이 facts 가 말하는 행렬·식을 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const sh = new Shown(p.content, `${key} (${JSON.stringify(p.facts)})`);
      SHOWN[number]!(p.facts, sh);
      expect(sh.checked, `${key}: 이 꼴은 대조가 하나도 없다`).toBeGreaterThan(
        0,
      );
      checked += sh.checked;
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1000);
  });

  it("01 꼴 1 — 경우로 나뉜 식을 발문에서 읽어 성분을 다시 낸다", () => {
    let seen = 0;
    eachProblem((p, key, number) => {
      if (number !== "01" || p.facts.mode !== 1) return;
      seen += 1;
      const cases = /\\begin\{cases\}([\s\S]*?)\\end\{cases\}/.exec(
        p.content,
      )![1]!;
      const [gt, eq, lt] = cases.split("\\\\").map((r) => r.split("&")[0]!);
      const at = (tex: string, i: number, j: number) => evalTex(tex, { i, j });
      const A = [
        [at(eq!, 1, 1), at(lt!, 1, 2)],
        [at(gt!, 2, 1), at(eq!, 2, 2)],
      ];
      expect(A, `${key}: facts 의 성분과 발문의 식이 다르다`).toEqual(
        mget(p.facts, "A"),
      );
    });
    expect(
      seen,
      "이 꼴이 한 번도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(5);
  });

  it("유형마다 모든 꼴이 한 번은 검산된다", () => {
    const seen = new Map<string, Set<number>>();
    eachProblem((p, _key, number) => {
      if (!seen.has(number)) seen.set(number, new Set());
      seen.get(number)!.add(p.facts.mode!);
    });
    for (const [number, n] of Object.entries(MODES)) {
      expect(
        [...(seen.get(number) ?? [])].sort(),
        `${number}: 안 돈 꼴이 있다`,
      ).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });
});

describe("고등 공통수학1 행렬 — 오답", () => {
  it("행렬 정답의 오답은 넷이고 모양이 같으며 정답과 다른 행렬이다", () => {
    let withDistractors = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      withDistractors += 1;
      expect(p.distractors, key).toHaveLength(4);
      const ans = readMatrix(p.answer);
      for (const d of p.distractors) {
        const m = readMatrix(d);
        expect(m.length, `${key} 오답 모양: ${d}`).toBe(ans.length);
        expect(m[0]!.length, `${key} 오답 모양: ${d}`).toBe(ans[0]!.length);
        expect(JSON.stringify(m), `${key} 오답이 정답과 같다: ${d}`).not.toBe(
          JSON.stringify(ans),
        );
      }
    });
    expect(
      withDistractors,
      "오답을 내는 꼴이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(50);
  });
});
