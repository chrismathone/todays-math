/**
 * 공통수학1 「행렬」 — RPM 공통수학1(2022) 색인 12유형. **물결 1 세션 `h1-poly` 소유.**
 *
 * 본보기 `h1Identity.ts` 를 그대로 따른다(꼴마다 칸 · 식 정답이면 오답 넷 · 조사는 `josa.ts`).
 * 브리프 `docs/planning/tracks/high-wave1-brief.md`.
 *
 * ## 교육과정 울타리(브리프 §4 [10공수1-04-02])
 *
 * 행과 열의 수가 각각 **2 이하**인 행렬만 쓴다(RPM 에 있는 $3\times2$ · $2\times3$ 행렬 문항의 구조는
 * $2\times2$ 로 옮겼다). 역행렬·행렬식은 없다. 성분은 한 자리~두 자리 정수로 — 「지나치게 복잡한 연산」을 피한다.
 *
 * ## 표기 — 공용 후보
 *
 * 행렬은 `\begin{pmatrix}…\end{pmatrix}`(교과서의 둥근 괄호). 공용 표기(`poly.ts`·`numbers.ts`)에 없어
 * 이 파일의 `mat()` 에 두었다 — **공용 후보**(리드가 병합 때 올린다). 행렬 문자열 바로 뒤에는 조사를
 * 붙이지 않는다(「…일 때」로 받는다) — 행렬을 소리 내어 읽는 규칙이 `josa.ts` 에 없다.
 *
 * ## 「보기에서 옳은 것만을 고른 것은?」은 수로 옮겼다
 *
 * 12 「여러 가지 성질」의 대표문제는 ㄱ·ㄴ·ㄷ 고르기다. 우리 형식(단답·객관)으로는 못 낸다 — 같은 개념
 * ($A\neq O$, $B\neq O$ 인데 $AB=O$ · $AB=AC$ 인데 $B\neq C$)을 **미지의 성분을 구하는** 꼴로 묻는다.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「4. 행렬」)
 *
 *   01·02 → 행렬 · 03~05 → 행렬의 덧셈, 뺄셈과 실수배 · 06~08 → 행렬의 곱셈
 *   · 09~12 → 행렬의 곱셈의 성질
 *
 * RPM 원본은 구조만 보았다(`.rpm-src/22/`). 본문·수치를 옮기지 않는다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, ira } from "./josa";
import { q, qAdd, qTex, type Q } from "./numbers";
import {
  $,
  attempt,
  coefPrefix,
  distinctInts,
  numAnswer,
  nz,
  pickDistractors,
  pickOne,
  plusConst,
  randInt,
} from "./pick";
import { linTex, paren, term } from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "행렬";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 4. 행렬). */
const SEC = {
  행렬: "행렬",
  덧셈: "행렬의 덧셈, 뺄셈과 실수배",
  곱셈: "행렬의 곱셈",
  성질: "행렬의 곱셈의 성질",
} as const;

type Body = {
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  distractors?: readonly string[];
};

type Expr = readonly [tex: string, value: number];

function chooseExpr(rng: Rng, exprs: readonly Expr[]): [number, Expr] {
  const id = randInt(rng, 0, exprs.length - 1);
  return [id, exprs[id]!];
}

// ───────────────────────────── 행렬 ─────────────────────────────

type Ent = number | string;
type NMat = number[][];

// 공용 후보: 행렬 표기 — 2×2 이하. 성분은 수 또는 이미 만든 식 조각.
function mat(rows: readonly (readonly Ent[])[]): string {
  return `\\begin{pmatrix}${rows.map((r) => r.map(String).join("&")).join("\\\\")}\\end{pmatrix}`;
}

function col(a: Ent, b: Ent): string {
  return mat([[a], [b]]);
}

function mmul(A: NMat, B: NMat): NMat {
  return A.map((row) =>
    B[0]!.map((_, j) => row.reduce((s, a, k) => s + a * B[k]![j]!, 0)),
  );
}

function madd(A: NMat, B: NMat): NMat {
  return A.map((r, i) => r.map((v, j) => v + B[i]![j]!));
}

function mscale(A: NMat, k: number): NMat {
  return A.map((r) => r.map((v) => v * k));
}

function msum(A: NMat): number {
  return A.flat().reduce((s, v) => s + v, 0);
}

function mT(A: NMat): NMat {
  return A[0]!.map((_, j) => A.map((r) => r[j]!));
}

const E2: NMat = [
  [1, 0],
  [0, 1],
];

function randMat(rng: Rng, lo = -4, hi = 4): NMat {
  return [
    [randInt(rng, lo, hi), randInt(rng, lo, hi)],
    [randInt(rng, lo, hi), randInt(rng, lo, hi)],
  ];
}

/** 행렬을 facts 로 — `A11 A12 A21 A22`. */
function mfacts(prefix: string, M: NMat): Record<string, number> {
  const out: Record<string, number> = {};
  M.forEach((r, i) =>
    r.forEach((v, j) => (out[`${prefix}${i + 1}${j + 1}`] = v)),
  );
  return out;
}

/** 모든 성분의 합을 이어 쓴다 — `3+5+(-10)`. 0 인 성분은 뺀다(`+0` 은 지면 냄새다). */
function sumLine(M: NMat): string {
  const nz0 = M.flat().filter((v) => v !== 0);
  if (nz0.length === 0) return "0";
  return nz0
    .map((v, i) => (i === 0 ? String(v) : v < 0 ? `+(${v})` : `+${v}`))
    .join("");
}

/** 행렬의 결합 — `-\begin{pmatrix}…\end{pmatrix}+5\begin{pmatrix}…\end{pmatrix}`. 계수 0 은 뺀다. */
function matCombo(parts: readonly (readonly [number, NMat])[]): string {
  let out = "";
  for (const [c, M] of parts) {
    if (c === 0) continue;
    const sign = c < 0 ? "-" : out === "" ? "" : "+";
    out += `${sign}${Math.abs(c) === 1 ? "" : Math.abs(c)}${mat(M)}`;
  }
  return out;
}

/** 일차식 성분 — `2x+3y` · `a-b`. */
function lin2(c1: number, v1: string, c2: number, v2: string, k = 0): string {
  return linTex(
    [
      [c1, v1],
      [c2, v2],
    ],
    k,
  );
}

/** 곱으로 쓸 때의 한 항 — `3\times 2` · `2` · `-2`. */
function prodAbs(c: number, v: string): string {
  return Math.abs(c) === 1 ? v : `${Math.abs(c)}\\times ${v}`;
}

// ───────────────────────────── 01 ─────────────────────────────
// 행렬 구하기
// 꼴 0 (기본·대표): $a_{ij}$ 식으로 성분을 채운다 — 답이 행렬(오답 넷: 전치 · 행 바꿈 · 0부터 센 첨자 · 열 바꿈)
// 꼴 1 (응용): 경우로 나뉜 $a_{ij}$ — 모든 성분의 합
// 꼴 2 (심화하): 미정계수 k 가 든 $a_{ij}$ — 성분의 합에서 k

type Formula = {
  tex: string;
  at: (i: number, j: number) => number;
  sub: (i: number, j: number) => string;
};

function formulaOf(fam: number, al: number, be: number, gm: number): Formula {
  const signed = (c: number, v: string): string =>
    `${c < 0 ? "-" : "+"}${prodAbs(c, v)}`;
  const first = (c: number, v: string): string =>
    `${c < 0 ? "-" : ""}${prodAbs(c, v)}`;
  if (fam === 0)
    return {
      tex: lin2(al, "i", be, "j", gm),
      at: (i, j) => al * i + be * j + gm,
      // 계수 0 인 항은 안 쓴다 — `0\times 1` · `+0\times 2` 는 지면 냄새다
      sub: (i, j) => {
        const parts = (
          [
            [al, String(i)],
            [be, String(j)],
          ] as const
        ).filter(([c]) => c !== 0);
        const head = parts
          .map(([c, v], n) => (n === 0 ? first(c, v) : signed(c, v)))
          .join("");
        return head === "" ? String(gm) : `${head}${plusConst(gm)}`;
      },
    };
  if (fam === 1)
    return {
      tex: `i^{2}${term(be, "j")}${plusConst(gm)}`,
      at: (i, j) => i * i + be * j + gm,
      sub: (i, j) => `${i}^{2}${signed(be, String(j))}${plusConst(gm)}`,
    };
  return {
    tex: `${coefPrefix(al)}ij${term(be, "i")}${plusConst(gm)}`,
    at: (i, j) => al * i * j + be * i + gm,
    sub: (i, j) =>
      `${first(al, `${i}\\times ${j}`)}${signed(be, String(i))}${plusConst(gm)}`,
  };
}

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 2);
      const al = nz(rng, -3, 3);
      const be = nz(rng, -3, 3);
      const gm = randInt(rng, -3, 3);
      if (fam === 0 && al === be) return null;
      const F = formulaOf(fam, al, be, gm);
      const A = [
        [F.at(1, 1), F.at(1, 2)],
        [F.at(2, 1), F.at(2, 2)],
      ];
      if (A[0]![1] === A[1]![0]) return null;
      const off = [
        [F.at(0, 0), F.at(0, 1)],
        [F.at(1, 0), F.at(1, 1)],
      ];
      const ans = mat(A);
      const distractors = pickDistractors(rng, ans, [
        mat(mT(A)),
        mat([A[1]!, A[0]!]),
        mat(off),
        mat(A.map((r) => [r[1]!, r[0]!])),
      ]);
      if (distractors === null) return null;
      const aij = "a_{ij}";
      const cells = [
        [1, 1],
        [1, 2],
        [2, 1],
        [2, 2],
      ] as const;
      return {
        content: `이차정사각행렬 $A$의 $(i, j)$ 성분 $${aij}$${ga(aij)} $${aij}=${F.tex}$일 때, 행렬 $A$${eul("A")} 구하시오.`,
        answer: $(ans),
        solution: [
          cells
            .map(([i, j]) => `$a_{${i}${j}}=${F.sub(i, j)}=${F.at(i, j)}$`)
            .join(", ") + "이므로",
          `$A=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, al, be, gm },
        distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const piece = (): Formula =>
        formulaOf(
          0,
          randInt(rng, 0, 3),
          randInt(rng, -2, 3),
          randInt(rng, -3, 3),
        );
      const [p1, p2, p3] = [piece(), piece(), piece()];
      if ([p1, p2, p3].some((p) => p.tex === "0")) return null;
      const A = [
        [p2.at(1, 1), p3.at(1, 2)],
        [p1.at(2, 1), p2.at(2, 2)],
      ];
      const v = msum(A);
      const cases = `a_{ij}=\\begin{cases}${p1.tex} & (i>j)\\\\${p2.tex} & (i=j)\\\\${p3.tex} & (i<j)\\end{cases}`;
      const aij = "a_{ij}";
      return {
        content: `이차정사각행렬 $A$의 $(i, j)$ 성분 $${aij}$${ga(aij)} $${cases}$일 때, 행렬 $A$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$i>j$일 때 $a_{21}=${p1.sub(2, 1)}=${A[1]![0]}$`,
          `$i=j$일 때 $a_{11}=${p2.sub(1, 1)}=${A[0]![0]}$, $a_{22}=${p2.sub(2, 2)}=${A[1]![1]}$`,
          `$i<j$일 때 $a_{12}=${p3.sub(1, 2)}=${A[0]![1]}$`,
          `따라서 $A=${mat(A)}$이므로 모든 성분의 합은 $${sumLine(A)}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, ...mfacts("A", A) },
      };
    });
  return attempt<Body>((): Body | null => {
    const g = randInt(rng, 0, 1);
    const k = nz(rng, -5, 5);
    let tex: string;
    let base: NMat;
    let coefK: NMat;
    if (g === 0) {
      const al = nz(rng, -3, 3);
      const be = nz(rng, -3, 3);
      tex = `${lin2(al, "i", be, "j")}+k`;
      base = [
        [al + be, al + 2 * be],
        [2 * al + be, 2 * al + 2 * be],
      ];
      coefK = [
        [1, 1],
        [1, 1],
      ];
    } else {
      const b = pickOne(rng, [2, -2, 3]);
      const byJ = rng() < 0.5;
      tex = `${b < 0 ? `(${b})` : b}^{i+j}+k${byJ ? "j" : "i"}`;
      base = [
        [b ** 2, b ** 3],
        [b ** 3, b ** 4],
      ];
      coefK = byJ
        ? [
            [1, 2],
            [1, 2],
          ]
        : [
            [1, 1],
            [2, 2],
          ];
    }
    const S = msum(base) + msum(coefK) * k;
    const kSum = msum(coefK);
    const aij = "a_{ij}";
    const entry = (i: number, j: number) =>
      linTex([[coefK[i]![j]!, "k"]], base[i]![j]!);
    return {
      content: `이차정사각행렬 $A$의 $(i, j)$ 성분 $${aij}$${ga(aij)} $${aij}=${tex}$이다. 행렬 $A$의 모든 성분의 합이 $${S}$일 때, 상수 $k$의 값을 구하시오.`,
      answer: numAnswer(k),
      solution: [
        `$a_{11}=${entry(0, 0)}$, $a_{12}=${entry(0, 1)}$, $a_{21}=${entry(1, 0)}$, $a_{22}=${entry(1, 1)}$`,
        `모든 성분의 합이 $${S}$이므로 $${linTex([[kSum, "k"]], msum(base))}=${S}$`,
        `따라서 $k=${k}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, S, ...mfacts("B", base), ...mfacts("K", coefK) },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 두 행렬이 서로 같을 조건
// 꼴 0 (기본·대표): 대응하는 성분 → $x\pm y$, $xy$ → $x^2+y^2$
// 꼴 1 (기본): 일차식 성분 → 두 미지수
// 꼴 2 (응용): 두 문자씩 연립 — 네 미지수
// 꼴 3 (심화하): 두 이차방정식의 공통근

const PAIRS02: readonly (readonly [
  readonly [number, number],
  readonly [number, number],
])[] = [
  [
    [1, 2],
    [1, -1],
  ],
  [
    [2, 1],
    [1, -1],
  ],
  [
    [1, 1],
    [1, -1],
  ],
  [
    [2, -1],
    [1, 1],
  ],
  [
    [1, 3],
    [1, -2],
  ],
  [
    [3, 1],
    [1, -1],
  ],
];

function rootsTex(a: number, b: number): string {
  if (a === b) return `$z=${a}$`;
  const [u, v] = [a, b].sort((x, y) => x - y);
  return `$z=${u}$ 또는 $z=${v}$`;
}

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  const same = "두 행렬의 대응하는 성분이 서로 같아야 하므로";
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const useSum = rng() < 0.5;
      const g = nz(rng, -5, 5);
      const p = nz(rng, -6, 6);
      if (useSum ? g * g - 4 * p < 0 : g * g + 4 * p < 0) return null;
      const v = useSum ? g * g - 2 * p : g * g + 2 * p;
      const xy = useSum ? "x+y" : "x-y";
      const A = mat([
        ["x^{2}", g],
        [p, "y^{2}"],
      ]);
      const B = mat([
        ["a", xy],
        ["xy", "b"],
      ]);
      return {
        content: `두 행렬 $A=${A}$, $B=${B}$에 대하여 $A=B$일 때, $a+b$의 값을 구하시오. (단, $a$, $b$, $x$, $y$${eun("y")} 상수이다.)`,
        answer: numAnswer(v),
        solution: [
          same,
          `$x^{2}=a$, $${g}=${xy}$, $${p}=xy$, $y^{2}=b$`,
          `따라서 $a+b=x^{2}+y^{2}=(${xy})^{2}${useSum ? "-" : "+"}2xy=${paren(g)}^{2}${useSum ? "-" : "+"}2\\times ${paren(p)}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, sum: useSum ? 1 : 0, g, p },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const x = nz(rng, -4, 4);
      const y = nz(rng, -4, 4);
      const pc = nz(rng, -3, 3);
      const qc = randInt(rng, -5, 5);
      const rc = nz(rng, -3, 3);
      const c1 = randInt(rng, -5, 5);
      const c2 = randInt(rng, -5, 5);
      const s1 = c1 - y;
      const s2 = c2 - y;
      if (s1 === s2) return null;
      const P0 = pc * x + qc;
      const R0 = rc * x;
      const Ypart = (s: number) => linTex([[1, "y"]], s);
      const A = mat([
        [c1, linTex([[pc, "x"]], qc)],
        [c2, `${coefPrefix(rc)}x`],
      ]);
      const B = mat([
        [Ypart(s1), P0],
        [Ypart(s2), R0],
      ]);
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["x+y", x + y],
        ["xy", x * y],
        ["x-y", x - y],
      ]);
      return {
        content: `두 행렬 $A=${A}$, $B=${B}$에 대하여 $A=B$일 때, 상수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          same,
          `$${c1}=${Ypart(s1)}$, $${linTex([[pc, "x"]], qc)}=${P0}$, $${c2}=${Ypart(s2)}$, $${coefPrefix(rc)}x=${R0}$`,
          `따라서 $x=${x}$, $y=${y}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, pc, qc, rc, c1, c2, s1, s2, P0, R0, exprId },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const [a, b, c, d] = [
        nz(rng, -4, 4),
        nz(rng, -4, 4),
        nz(rng, -4, 4),
        nz(rng, -4, 4),
      ];
      const [[a1, b1], [a2, b2]] = pickOne(rng, PAIRS02);
      const [[g1, d1], [g2, d2]] = pickOne(rng, PAIRS02);
      const L1 = lin2(a1, "a", b1, "b");
      const L2 = lin2(a2, "a", b2, "b");
      const M1 = lin2(g1, "c", d1, "d");
      const M2 = lin2(g2, "c", d2, "d");
      const v1 = a1 * a + b1 * b;
      const v2 = a2 * a + b2 * b;
      const w1 = g1 * c + d1 * d;
      const w2 = g2 * c + d2 * d;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["abcd", a * b * c * d],
        ["a+b+c+d", a + b + c + d],
        ["ab-cd", a * b - c * d],
      ]);
      const A = mat([
        [L1, v2],
        [M1, w2],
      ]);
      const B = mat([
        [v1, L2],
        [w1, M2],
      ]);
      return {
        content: `두 행렬 $A=${A}$, $B=${B}$에 대하여 $A=B$일 때, $${et}$의 값을 구하시오. (단, $a$, $b$, $c$, $d$${eun("d")} 상수이다.)`,
        answer: numAnswer(ev),
        solution: [
          same,
          `$${L1}=${v1}$, $${v2}=${L2}$, $${M1}=${w1}$, $${w2}=${M2}$`,
          `두 식씩 연립하여 풀면 $a=${a}$, $b=${b}$, $c=${c}$, $d=${d}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, a1, b1, a2, b2, g1, d1, g2, d2, v1, v2, w1, w2, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const x = nz(rng, -4, 5);
    const y = nz(rng, -4, 4);
    const z = nz(rng, -4, 4);
    if (x + y === 0) return null;
    const pC = pickOne(rng, [2, 3, -2]);
    const K1 = z * z - x * z;
    const K2 = z * z + y * z;
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["x+y+z", x + y + z],
      ["x^{2}+y^{2}+z^{2}", x * x + y * y + z * z],
      ["xyz", x * y * z],
    ]);
    const A = mat([
      [K1, `${pC}x`],
      [K2, 0],
    ]);
    const B = mat([
      ["z^{2}-xz", pC * x],
      ["z^{2}+yz", `y${plusConst(-y)}`],
    ]);
    return {
      content: `두 행렬 $A=${A}$, $B=${B}$에 대하여 $A=B$일 때, $${et}$의 값을 구하시오. (단, $x$, $y$, $z$${eun("z")} 상수이다.)`,
      answer: numAnswer(ev),
      solution: [
        same,
        `$${K1}=z^{2}-xz$, $${pC}x=${pC * x}$, $${K2}=z^{2}+yz$, $0=y${plusConst(-y)}$`,
        `$x=${x}$, $y=${y}$이므로 $z^{2}${term(-x, "z")}${plusConst(-K1)}=0$, $z^{2}${term(y, "z")}${plusConst(-K2)}=0$`,
        `첫째 식에서 ${rootsTex(z, x - z)}, 둘째 식에서 ${rootsTex(z, -y - z)}`,
        `두 식을 모두 만족시키는 것은 $z=${z}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, pC, K1, K2, P: pC * x, q: -y, exprId },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 행렬의 덧셈, 뺄셈과 실수배
// 꼴 0 (기본·대표): 행렬 등식을 X 에 대해 풀기 — 모든 성분의 합(성분은 분수일 수 있다)
// 꼴 1 (기본): 식을 간단히 한 뒤 계산 — 합 · 한 성분
// 꼴 2 (응용): 행렬 등식을 풀어 X — 답이 행렬(오답 넷: 부호 · 전치 · 안 나눈 것)

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = pickOne(rng, [1, 2, 3]);
      const qq = pickOne(rng, [1, 2]);
      const A = randMat(rng);
      const B = randMat(rng);
      const N = madd(A, mscale(B, p));
      const den = p + qq;
      if (msum(N) % den !== 0) return null;
      const v = msum(N) / den;
      const X: Q[][] = N.map((r) => r.map((c) => q(c, den)));
      const lhs = p === 1 ? "X-B" : `${p}(X-B)`;
      const eq = `${lhs}=A-${coefPrefix(qq)}X`;
      const Xt = mat(X.map((r) => r.map(qTex)));
      // 0 인 성분은 합 줄에서 뺀다(`+0` 은 지면 냄새다)
      const sumQ = X.flat()
        .filter((x) => x.n !== 0)
        .map((x, i) =>
          i === 0 ? qTex(x) : x.n < 0 ? `+(${qTex(x)})` : `+${qTex(x)}`,
        )
        .join("");
      const total = X.flat().reduce((s, x) => qAdd(s, x), q(0));
      return {
        content: `두 행렬 $A=${mat(A)}$, $B=${mat(B)}$에 대하여 $${eq}$${eul(eq)} 만족시키는 행렬 $X$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$${eq}$에서 $${den}X=A+${coefPrefix(p)}B$이므로`,
          `$X=\\dfrac{1}{${den}}(A+${coefPrefix(p)}B)=${Xt}$`,
          `따라서 행렬 $X$의 모든 성분의 합은 $${sumQ}=${qTex(total)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qq, ...mfacts("A", A), ...mfacts("B", B) },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [p, qq] = distinctInts(rng, 2, 4, 2) as [number, number];
      const A = randMat(rng);
      const B = randMat(rng);
      const R = madd(mscale(A, p - qq), mscale(B, p + qq));
      const ask = randInt(rng, 0, 1);
      const i = randInt(rng, 1, 2);
      const j = randInt(rng, 1, 2);
      const v = ask === 0 ? msum(R) : R[i - 1]![j - 1]!;
      const expr = `${p}(A+B)-${qq}(A-B)`;
      const tail =
        ask === 0
          ? "의 모든 성분의 합을 구하시오."
          : `의 $(${i}, ${j})$ 성분을 구하시오.`;
      return {
        content: `두 행렬 $A=${mat(A)}$, $B=${mat(B)}$에 대하여 행렬 $${expr}$${tail}`,
        answer: numAnswer(v),
        solution: [
          `$${expr}=${lin2(p - qq, "A", p + qq, "B")}$`,
          `$=${matCombo([
            [p - qq, A],
            [p + qq, B],
          ])}=${mat(R)}$`,
          ask === 0
            ? `따라서 모든 성분의 합은 $${sumLine(R)}=${v}$`
            : `따라서 $(${i}, ${j})$ 성분은 $${v}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          p,
          q: qq,
          ask,
          i,
          j,
          ...mfacts("A", A),
          ...mfacts("B", B),
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const m = randInt(rng, 1, 4);
    const dn = pickOne(rng, [1, 2]);
    const n = m + dn;
    const A = randMat(rng);
    const B = randMat(rng);
    const N = madd(mscale(B, n), mscale(A, -1));
    if (N.flat().some((v) => v % dn !== 0)) return null;
    const X = N.map((r) => r.map((v) => v / dn + 0));
    const ans = mat(X);
    const cands = [mat(mscale(X, -1)), mat(mT(X)), mat([X[1]!, X[0]!])];
    const plusA = madd(mscale(B, n), A);
    if (plusA.flat().every((v) => v % dn === 0)) {
      cands.push(mat(plusA.map((r) => r.map((v) => v / dn + 0))));
    }
    if (dn === 2) cands.push(mat(N));
    const distractors = pickDistractors(rng, ans, cands);
    if (distractors === null) return null;
    const eq = `A-${coefPrefix(m)}X=${n}(B-X)`;
    return {
      content: `두 행렬 $A=${mat(A)}$, $B=${mat(B)}$에 대하여 $${eq}$${eul(eq)} 만족시키는 행렬 $X$${eul("X")} 구하시오.`,
      answer: $(ans),
      solution: [
        `$${eq}$에서 $A-${coefPrefix(m)}X=${n}B-${n}X$이므로 $${coefPrefix(dn)}X=${n}B-A$`,
        `$${n}B-A=${matCombo([
          [n, B],
          [-1, A],
        ])}=${mat(N)}$`,
        `따라서 $X=${dn === 2 ? `\\dfrac{1}{2}${mat(N)}=` : ""}${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, m, n, ...mfacts("A", A), ...mfacts("B", B) },
      distractors,
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 조건을 만족시키는 행렬 — 두 행렬 등식을 연립(표가 중하 하나 — 두 꼴 모두 기본)
// 꼴 0 (기본·대표): A, B 를 구해 다른 결합의 모든 성분의 합
// 꼴 1 (기본): X, Y 를 구해 성분의 곱 · 합 · 한 성분

const SYS04: readonly (readonly [
  readonly [number, number],
  readonly [number, number],
])[] = [
  [
    [2, -1],
    [1, -3],
  ],
  [
    [1, 1],
    [1, -1],
  ],
  [
    [1, -2],
    [2, 1],
  ],
  [
    [1, 2],
    [1, -1],
  ],
  [
    [2, 1],
    [1, 1],
  ],
  [
    [3, 1],
    [1, -1],
  ],
];

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const [[a1, b1], [a2, b2]] = pickOne(rng, SYS04);
    const A = randMat(rng);
    const B = randMat(rng);
    const P = madd(mscale(A, a1), mscale(B, b1));
    const Qm = madd(mscale(A, a2), mscale(B, b2));
    const [n0, n1] = mode === 0 ? ["A", "B"] : ["X", "Y"];
    const c1 = lin2(a1, n0, b1, n1);
    const c2 = lin2(a2, n0, b2, n1);
    const head = `두 이차정사각행렬 $${n0}$, $${n1}$에 대하여 $${c1}=${mat(P)}$, $${c2}=${mat(Qm)}$일 때,`;
    const solved = [
      `$${c1}=${mat(P)}$ ……㉠`,
      `$${c2}=${mat(Qm)}$ ……㉡`,
      `㉠, ㉡을 연립하여 풀면 $${n0}=${mat(A)}$, $${n1}=${mat(B)}$`,
    ];
    const base = { a1, b1, a2, b2, ...mfacts("P", P), ...mfacts("Q", Qm) };
    if (mode === 0) {
      const [g, d] = pickOne(
        rng,
        (
          [
            [1, -1],
            [1, 1],
            [2, 1],
            [1, 2],
            [3, -1],
          ] as const
        ).filter(
          ([x, y]) => !(x === a1 && y === b1) && !(x === a2 && y === b2),
        ),
      );
      const T = madd(mscale(A, g), mscale(B, d));
      const v = msum(T);
      const tt = lin2(g, "A", d, "B");
      return {
        content: `${head} 행렬 $${tt}$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          ...solved,
          `$${tt}=${mat(T)}$이므로 모든 성분의 합은 $${sumLine(T)}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, ...base, g, d, ask: 0, i: 0, j: 0 },
      };
    }
    const ask = randInt(rng, 0, 2);
    const i = randInt(rng, 1, 2);
    const j = randInt(rng, 1, 2);
    let v: number;
    let tail: string;
    let last: string;
    if (ask === 0) {
      v = A.flat().reduce((s, x) => s * x, 1);
      if (Math.abs(v) > 400) return null;
      tail = "행렬 $X$의 모든 성분의 곱을 구하시오.";
      last = `따라서 행렬 $X$의 모든 성분의 곱은 $${A.flat()
        .map((x) => paren(x))
        .join("\\times ")}=${v}$`;
    } else if (ask === 1) {
      const S = madd(A, B);
      v = msum(S);
      tail = "행렬 $X+Y$의 모든 성분의 합을 구하시오.";
      last = `$X+Y=${mat(S)}$이므로 모든 성분의 합은 $${sumLine(S)}=${v}$`;
    } else {
      v = B[i - 1]![j - 1]!;
      tail = `행렬 $Y$의 $(${i}, ${j})$ 성분을 구하시오.`;
      last = `따라서 행렬 $Y$의 $(${i}, ${j})$ 성분은 $${v}$이다.`;
    }
    return {
      content: `${head} ${tail}`,
      answer: numAnswer(v),
      solution: [...solved, last].join("\n"),
      difficulty: "기본",
      facts: { mode, ...base, g: 0, d: 0, ask, i, j },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 행렬의 변형 — $xA+yB=C$
// 꼴 0 (기본·대표): 대응하는 성분으로 x, y
// 꼴 1 (응용): 성분 하나가 미지수인 B — 나머지 성분으로 p, q 를 먼저 구한다

/** 두 자리의 성분 쌍이 독립인가 — 연립이 한 해를 갖는가. */
function independentPair(
  A: NMat,
  B: NMat,
  cells: readonly (readonly [number, number])[],
): boolean {
  for (let s = 0; s < cells.length; s += 1) {
    for (let t = s + 1; t < cells.length; t += 1) {
      const [i1, j1] = cells[s]!;
      const [i2, j2] = cells[t]!;
      if (A[i1]![j1]! * B[i2]![j2]! - A[i2]![j2]! * B[i1]![j1]! !== 0)
        return true;
    }
  }
  return false;
}

const CELLS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const A = randMat(rng, -3, 4);
      const B = randMat(rng, -3, 4);
      if (CELLS.some(([i, j]) => A[i]![j] === 0 && B[i]![j] === 0)) return null;
      if (!independentPair(A, B, CELLS)) return null;
      const x = nz(rng, -3, 3);
      const y = nz(rng, -3, 3);
      const C = madd(mscale(A, x), mscale(B, y));
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["x+y", x + y],
        ["xy", x * y],
        ["x-y", x - y],
      ]);
      const Em = A.map((r, i) => r.map((a, j) => lin2(a, "x", B[i]![j]!, "y")));
      const eqs = CELLS.map(([i, j]) => `$${Em[i]![j]}=${C[i]![j]}$`).join(
        ", ",
      );
      const cond = "xA+yB=C";
      return {
        content: `세 행렬 $A=${mat(A)}$, $B=${mat(B)}$, $C=${mat(C)}$에 대하여 $${cond}$${ga(cond)} 성립할 때, 실수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$x${mat(A)}+y${mat(B)}=${mat(C)}$에서 $${mat(Em)}=${mat(C)}$`,
          `두 행렬이 서로 같을 조건에 의하여 ${eqs}`,
          `이 식들을 연립하여 풀면 $x=${x}$, $y=${y}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          ...mfacts("A", A),
          ...mfacts("B", B),
          ...mfacts("C", C),
          exprId,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const A = randMat(rng, -3, 4);
    const B = randMat(rng, -3, 5);
    const [hr, hc] = pickOne(rng, CELLS);
    const rest = CELLS.filter(([i, j]) => !(i === hr && j === hc));
    if (rest.some(([i, j]) => A[i]![j] === 0 && B[i]![j] === 0)) return null;
    if (!independentPair(A, B, rest)) return null;
    const p = nz(rng, -3, 3);
    const qv = nz(rng, -3, 3);
    const a = B[hr]![hc]!;
    const C = madd(mscale(A, p), mscale(B, qv));
    const Bshow: Ent[][] = B.map((r, i) =>
      r.map((v, j) => (i === hr && j === hc ? "a" : v)),
    );
    const Em = A.map((r, i) =>
      r.map((v, j) =>
        i === hr && j === hc
          ? lin2(v, "p", 1, "aq")
          : lin2(v, "p", B[i]![j]!, "q"),
      ),
    );
    const eqs = CELLS.map(([i, j]) => `$${Em[i]![j]}=${C[i]![j]}$`).join(", ");
    const known = A[hr]![hc]! * p;
    const cond = "pA+qB=C";
    const Bfacts = B.map((r, i) =>
      r.map((v, j) => (i === hr && j === hc ? 0 : v)),
    );
    return {
      content: `세 행렬 $A=${mat(A)}$, $B=${mat(Bshow)}$, $C=${mat(C)}$에 대하여 $${cond}$${eul(cond)} 만족시키는 실수 $p$, $q$${ga("q")} 존재할 때, 상수 $a$의 값을 구하시오.`,
      answer: numAnswer(a),
      solution: [
        `$p${mat(A)}+q${mat(Bshow)}=${mat(C)}$에서 $${mat(Em)}=${mat(C)}$`,
        `두 행렬이 서로 같을 조건에 의하여 ${eqs}`,
        `$a$${ga("a")} 없는 식을 연립하여 풀면 $p=${p}$, $q=${qv}$`,
        `$${known === 0 ? "" : known}${term(qv, "a", known === 0)}=${C[hr]![hc]}$이므로 $a=${a}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: {
        mode,
        hr,
        hc,
        ...mfacts("A", A),
        ...mfacts("B", Bfacts),
        ...mfacts("C", C),
      },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 행렬의 곱셈
// 꼴 0 (기본·대표): 이차방정식의 두 근이 성분인 두 행렬의 곱 — 근과 계수의 관계
// 꼴 1 (기본): 곱을 직접 — $1\times2$ · $2\times1$ · $2\times2$
// 꼴 2 (응용): 곱의 등식에서 미지의 성분 셋
// 꼴 3 (응용): $XY=YX$ 가 되는 성분
// 꼴 4 (심화하): 두 등식으로 X, Y 를 구해 $XY-YX$

/** 계수가 0 이면 아무것도 안 쓰는 항. */
function termNZ(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

/** 곱의 합 — `1\times 3+2\times(-4)`. */
function dot(row: readonly number[], colv: readonly number[]): string {
  return row.map((a, k) => `${paren(a)}\\times ${paren(colv[k]!)}`).join("+");
}

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 4);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const s = nz(rng, -5, 5);
      const p = nz(rng, -6, 6);
      if (s * s - 4 * p <= 0) return null;
      const u = pickOne(rng, [1, -1, 2, -2]);
      const v = pickOne(rng, [1, -1, 2, -2]);
      const k = u + v - 2;
      const value = s * s + k * p;
      const M1 = mat([
        [`${coefPrefix(u)}\\alpha`, 0],
        ["\\beta", "\\alpha"],
      ]);
      const M2 = mat([
        ["\\beta", 0],
        ["\\alpha", `${coefPrefix(v)}\\beta`],
      ]);
      const prod = mat([
        [`${coefPrefix(u)}\\alpha\\beta`, 0],
        ["\\alpha^{2}+\\beta^{2}", `${coefPrefix(v)}\\alpha\\beta`],
      ]);
      const ab = "\\alpha\\beta";
      return {
        content: `이차방정식 $x^{2}${term(-s, "x")}${plusConst(p)}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, 행렬 $${M1}${M2}$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `근과 계수의 관계에 의하여 $\\alpha+\\beta=${s}$, $${ab}=${p}$`,
          `$${M1}${M2}=${prod}$이므로`,
          `모든 성분의 합은 $\\alpha^{2}+\\beta^{2}${termNZ(u + v, ab)}=(\\alpha+\\beta)^{2}${termNZ(k, ab)}$`,
          `$=${paren(s)}^{2}${k === 0 ? "" : `${k < 0 ? "-" : "+"}${prodAbs(k, paren(p))}`}=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, s, p, u, v },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const shape = randInt(rng, 0, 2);
      const [rA, cA, cB] =
        shape === 0 ? [1, 2, 2] : shape === 1 ? [2, 2, 1] : [2, 2, 2];
      const cell = () => randInt(rng, -3, 4);
      const A = Array.from({ length: rA }, () =>
        Array.from({ length: cA }, cell),
      );
      const B = Array.from({ length: cA }, () =>
        Array.from({ length: cB }, cell),
      );
      const R = mmul(A, B);
      const ask = shape === 2 ? randInt(rng, 0, 1) : 0;
      const i = randInt(rng, 1, R.length);
      const j = randInt(rng, 1, R[0]!.length);
      const v = ask === 0 ? msum(R) : R[i - 1]![j - 1]!;
      const Bcols = mT(B);
      const sym = A.map((row) => Bcols.map((cv) => dot(row, cv)));
      const tail =
        ask === 0
          ? "의 모든 성분의 합을 구하시오."
          : `의 $(${i}, ${j})$ 성분을 구하시오.`;
      return {
        content: `두 행렬 $A=${mat(A)}$, $B=${mat(B)}$에 대하여 행렬 $AB$${tail}`,
        answer: numAnswer(v),
        solution: [
          `$AB=${mat(A)}${mat(B)}=${mat(sym)}$`,
          `$=${mat(R)}$`,
          ask === 0
            ? `따라서 모든 성분의 합은 $${sumLine(R)}=${v}$`
            : `따라서 $(${i}, ${j})$ 성분은 $${v}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, shape, ask, i, j, ...mfacts("A", A), ...mfacts("B", B) },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -3, 3);
      const qv = nz(rng, -3, 3);
      const s = nz(rng, -3, 3);
      const t = nz(rng, -3, 3);
      const a = nz(rng, -4, 4);
      const b = nz(rng, -4, 4);
      const v1 = p * s + qv * b;
      const v2 = a * b;
      const pt = p * t;
      const ks = [2, -2, 3, -1].filter((k) => pt % k === 0);
      const k = ks.length > 0 ? pickOne(rng, ks) : 1;
      const c = pt / k;
      const v = a + b + c;
      const L = mat([
        [p, qv],
        [0, "a"],
      ]);
      const Rm = mat([
        [s, t],
        ["b", 0],
      ]);
      const RHS = mat([
        [v1, `${coefPrefix(k)}c`],
        [v2, 0],
      ]);
      const e11 = linTex([[qv, "b"]], p * s);
      return {
        content: `등식 $${L}${Rm}=${RHS}$일 때, 상수 $a$, $b$, $c$에 대하여 $a+b+c$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$${L}${Rm}=${mat([
            [e11, pt],
            ["ab", 0],
          ])}$이므로`,
          `$${e11}=${v1}$, $${pt}=${coefPrefix(k)}c$, $ab=${v2}$`,
          `따라서 $b=${b}$, $c=${c}$, $a=${a}$이므로 $a+b+c=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qv, s, t, v1, v2, k },
      };
    });
  if (mode === 3)
    return attempt<Body>((): Body | null => {
      const p = randInt(rng, -3, 3);
      const qv = nz(rng, -3, 3);
      const r = nz(rng, -3, 3);
      const a = nz(rng, -4, 4);
      const al = nz(rng, -2, 2);
      const be = randInt(rng, -3, 3);
      const Y = [
        [al * p + be, al * qv],
        [al * r, al * a + be],
      ];
      const [y11, y12, y21, y22] = [Y[0]![0]!, Y[0]![1]!, Y[1]![0]!, Y[1]![1]!];
      const X = mat([
        [p, qv],
        [r, "a"],
      ]);
      const XY = mat([
        [p * y11 + qv * y21, p * y12 + qv * y22],
        [linTex([[y21, "a"]], r * y11), linTex([[y22, "a"]], r * y12)],
      ]);
      const YX = mat([
        [y11 * p + y12 * r, linTex([[y12, "a"]], y11 * qv)],
        [y21 * p + y22 * r, linTex([[y22, "a"]], y21 * qv)],
      ]);
      const cond = "XY=YX";
      return {
        content: `두 행렬 $X=${X}$, $Y=${mat(Y)}$에 대하여 $${cond}$${ga(cond)} 성립하도록 하는 상수 $a$의 값을 구하시오.`,
        answer: numAnswer(a),
        solution: [
          `$XY=${XY}$`,
          `$YX=${YX}$`,
          `$XY=YX$이므로 $(1, 2)$ 성분에서 $${p * y12 + qv * y22}=${linTex([[y12, "a"]], y11 * qv)}$`,
          `따라서 $a=${a}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qv, r, ...mfacts("Y", Y) },
      };
    });
  return attempt<Body>((): Body | null => {
    const X = randMat(rng, -3, 3);
    const Y = randMat(rng, -3, 3);
    const P = madd(X, Y);
    const Qm = madd(X, mscale(Y, -1));
    const XY = mmul(X, Y);
    const YX = mmul(Y, X);
    const D = madd(XY, mscale(YX, -1));
    const v = msum(D);
    return {
      content: `두 이차정사각행렬 $X$, $Y$에 대하여 $X+Y=${mat(P)}$, $X-Y=${mat(Qm)}$일 때, 행렬 $XY-YX$의 모든 성분의 합을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `두 식을 변끼리 더하면 $2X=${mat(madd(P, Qm))}$, 즉 $X=${mat(X)}$`,
        `두 식을 변끼리 빼면 $2Y=${mat(madd(P, mscale(Qm, -1)))}$, 즉 $Y=${mat(Y)}$`,
        `$XY=${mat(XY)}$, $YX=${mat(YX)}$`,
        `$XY-YX=${mat(D)}$이므로 모든 성분의 합은 $${sumLine(D)}=${v}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, ...mfacts("P", P), ...mfacts("Q", Qm) },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 행렬의 곱셈의 변형 — $A(x\mathbf{u}+y\mathbf{w})=xA\mathbf{u}+yA\mathbf{w}$
// 꼴 0 (기본·대표): 문자 성분 두 열의 결합 — 답이 행렬(오답 넷: 계수 자리 바꿈 · 부호 · 계수 빠뜨림 · 성분 자리 바꿈)
// 꼴 1 (응용): 수 성분 — 목표 열을 두 열의 결합으로 먼저 나타낸다
// 꼴 2 (심화하): $(ma, nb)$ 꼴 두 열 — 결합의 계수가 분수

/** 유리수 계수 — `\dfrac{1}{2}` · `-` · `+3` (첫 항이면 `+` 없음, ±1 은 숫자 없음). */
function qCoef(v: Q, first: boolean): string {
  const sign = v.n < 0 ? "-" : first ? "" : "+";
  const abs = q(Math.abs(v.n), v.d);
  return `${sign}${abs.n === 1 && abs.d === 1 ? "" : qTex(abs)}`;
}

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const u = [randInt(rng, -5, 5), randInt(rng, -5, 5)] as const;
      const w = [randInt(rng, -5, 5), randInt(rng, -5, 5)] as const;
      if ((u[0] === 0 && u[1] === 0) || (w[0] === 0 && w[1] === 0)) return null;
      const [m, n] = distinctInts(rng, -2, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const r = [m * u[0] + n * w[0], m * u[1] + n * w[1]] as const;
      const ans = col(r[0], r[1]);
      const distractors = pickDistractors(rng, ans, [
        col(n * u[0] + m * w[0], n * u[1] + m * w[1]),
        col(m * u[0] - n * w[0], m * u[1] - n * w[1]),
        col(u[0] + w[0], u[1] + w[1]),
        col(r[1], r[0]),
        col(-r[0], -r[1]),
      ]);
      if (distractors === null) return null;
      const tcol = col(lin2(m, "a", n, "c"), lin2(m, "b", n, "d"));
      const cab = col("a", "b");
      const ccd = col("c", "d");
      const nPart = `${n < 0 ? "-" : "+"}${Math.abs(n) === 1 ? "" : Math.abs(n)}`;
      return {
        content: `이차정사각행렬 $A$에 대하여 $A${cab}=${col(u[0], u[1])}$, $A${ccd}=${col(w[0], w[1])}$이다. $A${tcol}=X$일 때, 행렬 $X$${eul("X")} 구하시오. (단, $a$, $b$, $c$, $d$${eun("d")} 상수이다.)`,
        answer: $(ans),
        solution: [
          `$${tcol}=${coefPrefix(m)}${cab}${nPart}${ccd}$이므로`,
          `$X=${coefPrefix(m)}A${cab}${nPart}A${ccd}$`,
          `$=${matCombo([
            [m, [[u[0]], [u[1]]]],
            [n, [[w[0]], [w[1]]]],
          ])}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, m, n, u0: u[0], u1: u[1], w0: w[0], w1: w[1] },
        distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const u1 = [randInt(rng, -3, 3), randInt(rng, -3, 3)] as const;
      const u2 = [randInt(rng, -3, 3), randInt(rng, -3, 3)] as const;
      if (u1[0] * u2[1] - u2[0] * u1[1] === 0) return null;
      const w1 = [randInt(rng, -5, 5), randInt(rng, -5, 5)] as const;
      const w2 = [randInt(rng, -5, 5), randInt(rng, -5, 5)] as const;
      const x = nz(rng, -3, 3);
      const y = nz(rng, -3, 3);
      const t = [x * u1[0] + y * u2[0], x * u1[1] + y * u2[1]] as const;
      const r = [x * w1[0] + y * w2[0], x * w1[1] + y * w2[1]] as const;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["p-q", r[0] - r[1]],
        ["p+q", r[0] + r[1]],
      ]);
      const C1 = col(u1[0], u1[1]);
      const C2 = col(u2[0], u2[1]);
      const eqn = `${col(t[0], t[1])}=x${C1}+y${C2}`;
      const yPart = `${y < 0 ? "-" : "+"}${Math.abs(y) === 1 ? "" : Math.abs(y)}`;
      return {
        content: `이차정사각행렬 $A$에 대하여 $A${C1}=${col(w1[0], w1[1])}$, $A${C2}=${col(w2[0], w2[1])}$일 때, $A${col(t[0], t[1])}=${col("p", "q")}$이다. 이때 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `실수 $x$, $y$에 대하여 $${eqn}$${ga(eqn)} 성립한다고 하면`,
          `$${lin2(u1[0], "x", u2[0], "y")}=${t[0]}$, $${lin2(u1[1], "x", u2[1], "y")}=${t[1]}$이므로 $x=${x}$, $y=${y}$`,
          `$A${col(t[0], t[1])}=${coefPrefix(x)}A${C1}${yPart}A${C2}=${matCombo(
            [
              [x, [[w1[0]], [w1[1]]]],
              [y, [[w2[0]], [w2[1]]]],
            ],
          )}=${col(r[0], r[1])}$`,
          `따라서 $p=${r[0]}$, $q=${r[1]}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          u10: u1[0],
          u11: u1[1],
          u20: u2[0],
          u21: u2[1],
          w10: w1[0],
          w11: w1[1],
          w20: w2[0],
          w21: w2[1],
          t0: t[0],
          t1: t[1],
          exprId,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const [m1, n1, m2, n2] = [
      nz(rng, -3, 4),
      nz(rng, -3, 4),
      nz(rng, -3, 4),
      nz(rng, -3, 4),
    ];
    const D = m1 * n2 - m2 * n1;
    if (D === 0 || Math.abs(D) > 6) return null;
    const x = q(n2 - m2, D);
    const y = q(m1 - n1, D);
    if (x.n === 0 || y.n === 0) return null;
    const w1 = [randInt(rng, -6, 6), randInt(rng, -6, 6)] as const;
    const w2 = [randInt(rng, -6, 6), randInt(rng, -6, 6)] as const;
    const r0 = ((n2 - m2) * w1[0] + (m1 - n1) * w2[0]) / D;
    const r1 = ((n2 - m2) * w1[1] + (m1 - n1) * w2[1]) / D;
    if (!Number.isInteger(r0) || !Number.isInteger(r1)) return null;
    const v = r0 + r1;
    const C1 = col(`${coefPrefix(m1)}a`, `${coefPrefix(n1)}b`);
    const C2 = col(`${coefPrefix(m2)}a`, `${coefPrefix(n2)}b`);
    const eqn = `${col("a", "b")}=x${C1}+y${C2}`;
    const zero = "0";
    return {
      content: `이차정사각행렬 $A$에 대하여 $A${C1}=${col(w1[0], w1[1])}$, $A${C2}=${col(w2[0], w2[1])}$일 때, 행렬 $A${col("a", "b")}$의 모든 성분의 합을 구하시오. (단, $a$, $b$${eun("b")} $${zero}$${ga(zero)} 아닌 상수이다.)`,
      answer: numAnswer(v),
      solution: [
        `실수 $x$, $y$에 대하여 $${eqn}$${ga(eqn)} 성립한다고 하면`,
        `$a=${lin2(m1, "ax", m2, "ay")}$, $b=${lin2(n1, "bx", n2, "by")}$이고 $a\\neq 0$, $b\\neq 0$이므로`,
        `$${lin2(m1, "x", m2, "y")}=1$, $${lin2(n1, "x", n2, "y")}=1$에서 $x=${qTex(x)}$, $y=${qTex(y)}$`,
        `$A${col("a", "b")}=${qCoef(x, true)}A${C1}${qCoef(y, false)}A${C2}=${col(r0, r1)}$`,
        `따라서 모든 성분의 합은 $${r0}+${paren(r1)}=${v}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: {
        mode,
        m1,
        n1,
        m2,
        n2,
        w10: w1[0],
        w11: w1[1],
        w20: w2[0],
        w21: w2[1],
      },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 행렬의 거듭제곱
// 꼴 0 (기본·대표): $A^2=kE$ — 성분 비교로 $a+b=0$, $a^2+pq=k$
// 꼴 1 (응용): $A^2-sA-tE=O$ — 성분 비교로 두 미지수
// 꼴 2 (응용): $A^3$ 을 차례로

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, 2, 4]);
      const p = nz(rng, -4, 4);
      const qv = nz(rng, -4, 4);
      const pq = p * qv;
      if (pq >= k) return null;
      const ask = randInt(rng, 0, 1);
      const sq = k - pq;
      const [et, v] = ask === 0 ? ["ab", pq - k] : ["a^{2}+b^{2}", 2 * sq];
      const Am = mat([
        ["a", p],
        [qv, "b"],
      ]);
      const A2 = mat([
        [`a^{2}${plusConst(pq)}`, `${coefPrefix(p)}(a+b)`],
        [`${coefPrefix(qv)}(a+b)`, `b^{2}${plusConst(pq)}`],
      ]);
      return {
        content: `행렬 $A=${Am}$에 대하여 $A^{2}=${coefPrefix(k)}E$일 때, $${et}$의 값을 구하시오. (단, $a$, $b$${eun("b")} 상수이고, $E$${eun("E")} 단위행렬이다.)`,
        answer: numAnswer(v),
        solution: [
          `$A^{2}=${Am}${Am}=${A2}$`,
          `$A^{2}=${coefPrefix(k)}E$이므로 $a^{2}${plusConst(pq)}=${k}$, $a+b=0$, $b^{2}${plusConst(pq)}=${k}$`,
          ask === 0
            ? `$b=-a$이므로 $ab=-a^{2}=-(${k}${plusConst(-pq)})=${v}$`
            : `$a^{2}=b^{2}=${sq}$이므로 $a^{2}+b^{2}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qv, k, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const a = randInt(rng, -3, 3);
      const b = nz(rng, -4, 4);
      const p = nz(rng, -3, 3);
      const d = nz(rng, -3, 3);
      const s = a + d;
      const t = -(a * d - p * b);
      const exprs: Expr[] = [["a+b", a + b]];
      if (a !== 0) exprs.push(["ab", a * b]);
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const Am = mat([
        ["a", p],
        ["b", d],
      ]);
      const eq = `A^{2}${termNZ(-s, "A")}${termNZ(-t, "E")}=O`;
      const A2 = mat([
        [`a^{2}${term(p, "b")}`, linTex([[p, "a"]], p * d)],
        [lin2(1, "ab", d, "b"), linTex([[p, "b"]], d * d)],
      ]);
      return {
        content: `행렬 $A=${Am}$에 대하여 $${eq}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오. (단, $E$${eun("E")} 단위행렬, $O$${eun("O")} 영행렬이다.)`,
        answer: numAnswer(ev),
        solution: [
          `$A^{2}=${Am}${Am}=${A2}$`,
          `$${eq}$의 $(1, 2)$ 성분에서 $${linTex([[p, "a"]], p * d - s * p)}=0$이므로 $a=${a}$`,
          `$(2, 2)$ 성분에서 $${linTex([[p, "b"]], d * d - s * d - t)}=0$이므로 $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, d, s, t, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const A = randMat(rng, -2, 2);
    if (A.flat().every((x) => x === 0)) return null;
    const A2 = mmul(A, A);
    const A3 = mmul(A2, A);
    const v = msum(A3);
    return {
      content: `행렬 $A=${mat(A)}$에 대하여 행렬 $A^{3}$의 모든 성분의 합을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$A^{2}=${mat(A)}${mat(A)}=${mat(A2)}$`,
        `$A^{3}=A^{2}A=${mat(A2)}${mat(A)}=${mat(A3)}$`,
        `따라서 모든 성분의 합은 $${sumLine(A3)}=${v}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, ...mfacts("A", A) },
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 행렬의 곱셈에 대한 성질 — 곱셈 공식은 $AB=BA$ 일 때만
// 꼴 0 (기본·대표): $(A+B)^2=A^2+2AB+B^2$ → $AB=BA$ → 미지의 성분
// 꼴 1 (응용): $(A+B)(A-B)=A^2-B^2$ · $(A-B)^2=A^2-2AB+B^2$ 로 같은 조건
// 꼴 2 (심화하): $AB+BA$ 를 $(A-B)^2$ 로 · $AB-AC+C(B-C)$ 를 곱으로 묶기

const IDENT09 = [
  ["(A+B)^{2}=A^{2}+2AB+B^{2}", "(A+B)^{2}=A^{2}+AB+BA+B^{2}"],
  ["(A+B)(A-B)=A^{2}-B^{2}", "(A+B)(A-B)=A^{2}-AB+BA-B^{2}"],
  ["(A-B)^{2}=A^{2}-2AB+B^{2}", "(A-B)^{2}=A^{2}-AB-BA+B^{2}"],
] as const;

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode < 2)
    return attempt<Body>((): Body | null => {
      const A = randMat(rng, -3, 3);
      const [a11, a12, a21, a22] = [A[0]![0]!, A[0]![1]!, A[1]![0]!, A[1]![1]!];
      if (a12 === 0 || a21 === 0) return null;
      const al = nz(rng, -2, 2);
      const be = randInt(rng, -3, 3);
      const b11 = al * a11 + be;
      const b12 = al * a12;
      const x = al * a21;
      const y = al * a22 + be;
      const id = mode === 0 ? 0 : pickOne(rng, [1, 2]);
      const [ident, expand] = IDENT09[id]!;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["xy", x * y],
        ["x+y", x + y],
      ]);
      const Bm = mat([
        [b11, b12],
        ["x", "y"],
      ]);
      const AB = mat([
        [linTex([[a12, "x"]], a11 * b11), linTex([[a12, "y"]], a11 * b12)],
        [linTex([[a22, "x"]], a21 * b11), linTex([[a22, "y"]], a21 * b12)],
      ]);
      const BA = mat([
        [b11 * a11 + b12 * a21, b11 * a12 + b12 * a22],
        [lin2(a11, "x", a21, "y"), lin2(a12, "x", a22, "y")],
      ]);
      return {
        content: `두 행렬 $A=${mat(A)}$, $B=${Bm}$에 대하여 $${ident}$${ga(ident)} 성립할 때, 상수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${expand}$이므로 주어진 등식이 성립하려면 $AB=BA$`,
          `$AB=${AB}$, $BA=${BA}$`,
          `두 행렬이 서로 같을 조건에 의하여 $${linTex([[a12, "x"]], a11 * b11)}=${b11 * a11 + b12 * a21}$, $${linTex([[a12, "y"]], a11 * b12)}=${b11 * a12 + b12 * a22}$`,
          `따라서 $x=${x}$, $y=${y}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: mode === 0 ? "기본" : "응용",
        facts: { mode, id, ...mfacts("A", A), b11, b12, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const vv = randInt(rng, 0, 1);
    if (vv === 0) {
      const A = randMat(rng, -3, 3);
      const B = randMat(rng, -3, 3);
      const P = madd(A, mscale(B, -1));
      const Qm = madd(mmul(A, A), mmul(B, B));
      const P2 = mmul(P, P);
      const R = madd(Qm, mscale(P2, -1));
      const v = msum(R);
      return {
        content: `두 이차정사각행렬 $A$, $B$에 대하여 $A-B=${mat(P)}$, $A^{2}+B^{2}=${mat(Qm)}$일 때, 행렬 $AB+BA$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$(A-B)^{2}=A^{2}-AB-BA+B^{2}$이므로 $AB+BA=A^{2}+B^{2}-(A-B)^{2}$`,
          `$(A-B)^{2}=${mat(P)}${mat(P)}=${mat(P2)}$`,
          `$AB+BA=${mat(Qm)}-${mat(P2)}=${mat(R)}$`,
          `따라서 모든 성분의 합은 $${sumLine(R)}=${v}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, vv, ...mfacts("P", P), ...mfacts("Q", Qm) },
      };
    }
    const M = randMat(rng, -3, 3);
    const N = randMat(rng, -3, 3);
    const R = mmul(M, N);
    const v = msum(R);
    return {
      content: `세 이차정사각행렬 $A$, $B$, $C$에 대하여 $A+C=${mat(M)}$, $B-C=${mat(N)}$일 때, 행렬 $AB-AC+C(B-C)$의 모든 성분의 합을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$AB-AC+C(B-C)=A(B-C)+C(B-C)=(A+C)(B-C)$`,
        `$=${mat(M)}${mat(N)}=${mat(R)}$`,
        `따라서 모든 성분의 합은 $${sumLine(R)}=${v}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, vv, ...mfacts("P", M), ...mfacts("Q", N) },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 단위행렬의 성질
// 꼴 0 (기본·대표): $AE=EA=A$ 로 곱을 곱셈 공식처럼 — $A^3\pm E$ · $A^2-E$
// 꼴 1 (응용): $A^2=\pm E$ 인 A 로 $(pE+qA)^2=xE+yA$
// 꼴 2 (심화하): $A+B=sE$, $AB=tE$ 에서 $A^2+B^2$ · $A^3+B^3$

const SQ_E: readonly NMat[] = [
  [
    [0, 1],
    [1, 0],
  ],
  [
    [1, 0],
    [0, -1],
  ],
  [
    [0, -1],
    [-1, 0],
  ],
  [
    [1, 2],
    [0, -1],
  ],
  [
    [-1, 0],
    [3, 1],
  ],
  [
    [2, -3],
    [1, -2],
  ],
];

const SQ_NE: readonly NMat[] = [
  [
    [0, 1],
    [-1, 0],
  ],
  [
    [0, -1],
    [1, 0],
  ],
  [
    [1, -2],
    [1, -1],
  ],
  [
    [1, 1],
    [-2, -1],
  ],
];

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const unitE = `(단, $E$${eun("E")} 단위행렬이다.)`;
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const A = randMat(rng, -2, 2);
      if (A.flat().every((x) => x === 0)) return null;
      const V = randInt(rng, 0, 2);
      const A2 = mmul(A, A);
      const A3 = mmul(A2, A);
      const R =
        V === 0
          ? madd(A3, E2)
          : V === 1
            ? madd(A3, mscale(E2, -1))
            : madd(A2, mscale(E2, -1));
      const v = msum(R);
      const [expr, simp, right] =
        V === 0
          ? ["(A+E)(A^{2}-A+E)", "A^{3}+E^{3}", "A^{3}+E"]
          : V === 1
            ? ["(A-E)(A^{2}+A+E)", "A^{3}-E^{3}", "A^{3}-E"]
            : ["(A+E)(A-E)", "A^{2}-E^{2}", "A^{2}-E"];
      return {
        content: `행렬 $A=${mat(A)}$에 대하여 행렬 $${expr}$의 모든 성분의 합을 구하시오. ${unitE}`,
        answer: numAnswer(v),
        solution: [
          `$AE=EA=A$이므로 $${expr}=${simp}=${right}$`,
          V === 2
            ? `이때 $A^{2}=${mat(A)}${mat(A)}=${mat(A2)}$이므로`
            : `이때 $A^{2}=${mat(A2)}$, $A^{3}=A^{2}A=${mat(A3)}$이므로`,
          `$${right}=${mat(R)}$`,
          `따라서 모든 성분의 합은 $${sumLine(R)}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, V, ...mfacts("A", A) },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const sg = rng() < 0.5 ? 1 : -1;
      const A = pickOne(rng, sg === 1 ? SQ_E : SQ_NE);
      const p = nz(rng, -3, 3);
      const qv = nz(rng, -3, 3);
      const x = p * p + sg * qv * qv;
      const y = 2 * p * qv;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["x-y", x - y],
        ["x+y", x + y],
        ["xy", x * y],
      ]);
      const base = lin2(p, "E", qv, "A");
      const rhs = "xE+yA";
      const qq = qv * qv === 1 ? "" : String(qv * qv);
      return {
        content: `행렬 $A=${mat(A)}$에 대하여 $(${base})^{2}=${rhs}$${ga(rhs)} 성립할 때, 실수 $x$, $y$에 대하여 $${et}$의 값을 구하시오. ${unitE}`,
        answer: numAnswer(ev),
        solution: [
          `$A^{2}=${mat(A)}${mat(A)}=${mat(mmul(A, A))}=${sg === 1 ? "E" : "-E"}$`,
          `$(${base})^{2}=${coefPrefix(p * p)}E${term(2 * p * qv, "A")}${term(qv * qv, "A^{2}")}$`,
          `$=${coefPrefix(p * p)}E${term(2 * p * qv, "A")}${sg === 1 ? "+" : "-"}${qq}E=${linTex(
            [
              [x, "E"],
              [y, "A"],
            ],
          )}$`,
          `따라서 $x=${x}$, $y=${y}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, sg, p, q: qv, ...mfacts("A", A), exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const s = nz(rng, -5, 5);
    const t = nz(rng, -5, 5);
    const ask = randInt(rng, 0, 1);
    const k = ask === 0 ? s * s - 2 * t : s ** 3 - 3 * s * t;
    const tgt = ask === 0 ? "A^{2}+B^{2}" : "A^{3}+B^{3}";
    const sE = `${coefPrefix(s)}E`;
    const tE = `${coefPrefix(t)}E`;
    const lines =
      ask === 0
        ? [
            `$A+B=${sE}$에서 $A=${lin2(s, "E", -1, "B")}$이므로 $AB=(${lin2(s, "E", -1, "B")})B=${lin2(s, "B", -1, "B^{2}")}$`,
            `$AB=${tE}$이므로 $B^{2}=${lin2(s, "B", -t, "E")}$`,
            `같은 방법으로 하면 $A^{2}=${lin2(s, "A", -t, "E")}$`,
            `$A^{2}+B^{2}=${coefPrefix(s)}(A+B)${term(-2 * t, "E")}=${coefPrefix(s * s)}E${term(-2 * t, "E")}=${coefPrefix(k)}E$`,
            `따라서 $k=${k}$`,
          ]
        : [
            `$B=${lin2(s, "E", -1, "A")}$이므로 $AB=BA=${lin2(s, "A", -1, "A^{2}")}$`,
            `$AB=BA$이므로 $A^{3}+B^{3}=(A+B)^{3}-3AB(A+B)$`,
            `$=\\{${paren(s)}^{3}-3\\times ${paren(t)}\\times ${paren(s)}\\}E=${coefPrefix(k)}E$`,
            `따라서 $k=${k}$`,
          ];
    return {
      content: `두 이차정사각행렬 $A$, $B$에 대하여 $A+B=${sE}$, $AB=${tE}$일 때, $${tgt}=kE$이다. 상수 $k$의 값을 구하시오. ${unitE}`,
      answer: numAnswer(k),
      solution: lines.join("\n"),
      difficulty: "심화하",
      facts: { mode, s, t, ask },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// $A^n$ 의 추정
// 꼴 0 (기본·대표): $\begin{pmatrix}1&k\\0&1\end{pmatrix}^n$ — 규칙을 찾아 큰 n
// 꼴 1 (심화하): $A^3=E$ — 거듭제곱의 합 · 큰 거듭제곱
// 꼴 2 (심화하): $A^n=E$ 가 되는 n — 세 자리 가장 작은 수 · 두 자리 가장 큰 수
// 꼴 3 (응용): 부호가 번갈아 붙은 거듭제곱의 합

/** 대각합 −1, 행렬식 1 — $A^2+A+E=O$, $A^3=E$. */
function cubeRootOfE(rng: Rng): NMat {
  const a = pickOne(rng, [-2, -1, 0, 1]);
  const d = -1 - a;
  const bc = -(a * a + a + 1);
  const pairs =
    bc === -1
      ? [
          [1, -1],
          [-1, 1],
        ]
      : [
          [1, -3],
          [3, -1],
          [-1, 3],
          [-3, 1],
        ];
  const [b, c] = pickOne(rng, pairs) as [number, number];
  return [
    [a, b],
    [c, d],
  ];
}

const ORDER11: readonly (readonly [NMat, number])[] = [
  [
    [
      [0, 1],
      [-1, 0],
    ],
    4,
  ],
  [
    [
      [0, -1],
      [1, 0],
    ],
    4,
  ],
  [
    [
      [1, -2],
      [1, -1],
    ],
    4,
  ],
  [
    [
      [1, 1],
      [-2, -1],
    ],
    4,
  ],
  [
    [
      [0, -1],
      [1, -1],
    ],
    3,
  ],
  [
    [
      [-1, 1],
      [-1, 0],
    ],
    3,
  ],
  [
    [
      [1, -3],
      [1, -2],
    ],
    3,
  ],
  [
    [
      [1, -1],
      [1, 0],
    ],
    6,
  ],
  [
    [
      [0, -1],
      [1, 1],
    ],
    6,
  ],
  [
    [
      [2, -3],
      [1, -1],
    ],
    6,
  ],
];

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  const unitE = `(단, $E$${eun("E")} 단위행렬이다.)`;
  if (mode === 0 || mode === 3)
    return attempt<Body>((): Body | null => {
      const k = nz(rng, -3, 3);
      const low = rng() < 0.5;
      const at = (n: number): NMat =>
        low
          ? [
              [1, 0],
              [n * k, 1],
            ]
          : [
              [1, n * k],
              [0, 1],
            ];
      const A = at(1);
      const kn = `${coefPrefix(k)}n`;
      const AnSym = low
        ? mat([
            [1, 0],
            [kn, 1],
          ])
        : mat([
            [1, kn],
            [0, 1],
          ]);
      const nNat = `($n$${eun("n")} 자연수)`;
      if (mode === 0) {
        const n = pickOne(rng, [10, 20, 50, 100]);
        const An = at(n);
        const v = msum(An);
        return {
          content: `행렬 $A=${mat(A)}$에 대하여 행렬 $A^{${n}}$의 모든 성분의 합을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            `$A^{2}=${mat(at(2))}$, $A^{3}=A^{2}A=${mat(at(3))}$, $\\cdots$이므로 $A^{n}=${AnSym}$ ${nNat}`,
            `따라서 $A^{${n}}=${mat(An)}$이므로 모든 성분의 합은 $${sumLine(An)}=${v}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, k, low: low ? 1 : 0, n },
        };
      }
      const m = pickOne(rng, [5, 10, 25, 50]);
      const pair = madd(at(1), mscale(at(2), -1));
      const R = mscale(pair, m);
      const v = msum(R);
      const seq = `A-A^{2}+A^{3}-A^{4}+\\cdots+A^{${2 * m - 1}}-A^{${2 * m}}`;
      return {
        content: `행렬 $A=${mat(A)}$에 대하여 행렬 $${seq}$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$A^{n}=${AnSym}$ ${nNat}이므로`,
          `$A-A^{2}=A^{3}-A^{4}=\\cdots=A^{${2 * m - 1}}-A^{${2 * m}}=${mat(pair)}$`,
          `따라서 주어진 행렬은 $${m}${mat(pair)}=${mat(R)}$이고 모든 성분의 합은 $${v}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, k, low: low ? 1 : 0, m },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const A = cubeRootOfE(rng);
      const A2 = mmul(A, A);
      const ask = randInt(rng, 0, 1);
      const n = randInt(rng, 10, 40);
      const r = n % 3;
      const head = [
        `$A^{2}=${mat(A)}${mat(A)}=${mat(A2)}$`,
        `$A^{3}=A^{2}A=${mat(A2)}${mat(A)}=${mat(mmul(A2, A))}=E$`,
      ];
      if (ask === 0) {
        if (r === 0) return null;
        const Rm = r === 1 ? A : madd(A, A2);
        const v = msum(Rm);
        return {
          content: `행렬 $A=${mat(A)}$에 대하여 행렬 $A+A^{2}+A^{3}+\\cdots+A^{${n}}$의 모든 성분의 합을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            ...head,
            `$A+A^{2}+A^{3}=A+A^{2}+E=${mat(madd(madd(A, A2), E2))}=O$이므로`,
            `$A+A^{2}+A^{3}+\\cdots+A^{${n}}=${r === 1 ? "A" : "A+A^{2}"}=${mat(Rm)}$`,
            `따라서 모든 성분의 합은 $${sumLine(Rm)}=${v}$`,
          ].join("\n"),
          difficulty: "심화하",
          facts: { mode, ask, n, ...mfacts("A", A) },
        };
      }
      const Rm = r === 0 ? E2 : r === 1 ? A : A2;
      const v = msum(Rm);
      const tail = r === 0 ? "" : r === 1 ? "A" : "A^{2}";
      return {
        content: `행렬 $A=${mat(A)}$에 대하여 행렬 $A^{${n}}$의 모든 성분의 합을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          ...head,
          `$A^{${n}}=(A^{3})^{${Math.floor(n / 3)}}${tail}=${r === 0 ? "E" : tail}=${mat(Rm)}$`,
          `따라서 모든 성분의 합은 $${sumLine(Rm)}=${v}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, ask, n, ...mfacts("A", A) },
      };
    });
  return attempt<Body>((): Body | null => {
    const [A, ord] = pickOne(rng, ORDER11);
    const ask = randInt(rng, 0, 1);
    const v =
      ask === 0 ? Math.ceil(100 / ord) * ord : Math.floor(99 / ord) * ord;
    const A2 = mmul(A, A);
    const A3 = mmul(A2, A);
    const pw =
      ord === 4
        ? [
            `$A^{2}=${mat(A)}${mat(A)}=${mat(A2)}=-E$`,
            `$A^{4}=(A^{2})^{2}=(-E)^{2}=E$`,
          ]
        : ord === 3
          ? [
              `$A^{2}=${mat(A)}${mat(A)}=${mat(A2)}$`,
              `$A^{3}=A^{2}A=${mat(A3)}=E$`,
            ]
          : [
              `$A^{2}=${mat(A)}${mat(A)}=${mat(A2)}$`,
              `$A^{3}=A^{2}A=${mat(A3)}=-E$`,
              `$A^{6}=(A^{3})^{2}=(-E)^{2}=E$`,
            ];
    const lower =
      ord === 3
        ? ["A", "A^{2}"]
        : ord === 4
          ? ["A", "A^{2}", "A^{3}"]
          : ["A", "A^{2}", "\\cdots", "A^{5}"];
    const lastLow = lower[lower.length - 1]!;
    const cond = "A^{n}=E";
    const ords = String(ord);
    return {
      content: `행렬 $A=${mat(A)}$에 대하여 $${cond}$${eul(cond)} 만족시키는 ${ask === 0 ? "세 자리" : "두 자리"} 자연수 $n$의 값 중 가장 ${ask === 0 ? "작은" : "큰"} 것을 구하시오. ${unitE}`,
      answer: numAnswer(v),
      solution: [
        ...pw,
        `${lower.map((x) => `$${x}$`).join(", ")}${eun(lastLow)} $E$${ga("E")} 아니므로 $${cond}$${ga(cond)} 되는 것은 $n$${ga("n")} $${ords}$의 배수일 때이다.`,
        `따라서 구하는 수는 $${v}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, ask, ord, ...mfacts("A", A) },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// 행렬의 곱셈의 여러 가지 성질 — ㄱ·ㄴ·ㄷ 고르기 대신 미지의 성분을 구하는 꼴(머리말)
// 꼴 0 (기본·대표): $A\neq O$, $B\neq O$ 인데 $AB=O$ — B 의 두 성분
// 꼴 1 (응용): $AB=AC$ 인데 $B\neq C$ — C 의 두 성분
// 꼴 2 (심화하): $AB=O$ 에서 성분을 구한 뒤 $BA$ — $BA\neq O$

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -3, 3);
    const qv = nz(rng, -3, 3);
    const kk = nz(rng, -2, 3);
    const A = [
      [p, qv],
      [kk * p, kk * qv],
    ];
    const s = nz(rng, -3, 3);
    const t = nz(rng, -3, 3);
    const D = [
      [qv * s, qv * t],
      [-p * s, -p * t],
    ];
    if (mode === 1) {
      const B = randMat(rng, -3, 3);
      const C = madd(B, D);
      const [x, y] = [C[0]![0]!, C[1]![1]!];
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["x+y", x + y],
        ["xy", x * y],
      ]);
      const Cshow = mat([
        ["x", C[0]![1]!],
        [C[1]![0]!, "y"],
      ]);
      const d12 = B[0]![1]! - C[0]![1]!;
      const d21 = B[1]![0]! - C[1]![0]!;
      const e11 = linTex([[-p, "x"]], p * B[0]![0]! + qv * d21);
      const e12 = linTex([[-qv, "y"]], p * d12 + qv * B[1]![1]!);
      const BmC = mat([
        [linTex([[-1, "x"]], B[0]![0]!), d12],
        [d21, linTex([[-1, "y"]], B[1]![1]!)],
      ]);
      return {
        content: `세 행렬 $A=${mat(A)}$, $B=${mat(B)}$, $C=${Cshow}$에 대하여 $AB=AC$일 때, 상수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$AB=AC$에서 $AB-AC=A(B-C)=O$`,
          `$B-C=${BmC}$이므로 $A(B-C)$의 제$1$행은 $${e11}$, $${e12}$`,
          `$A(B-C)=O$이므로 $${e11}=0$, $${e12}=0$`,
          `따라서 $x=${x}$, $y=${y}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          ...mfacts("A", A),
          ...mfacts("B", B),
          c12: C[0]![1]!,
          c21: C[1]![0]!,
          exprId,
        },
      };
    }
    const B = D;
    const [x, y] = [B[0]![0]!, B[1]![1]!];
    const Bshow = mat([
      ["x", B[0]![1]!],
      [B[1]![0]!, "y"],
    ]);
    const AB = mat([
      [linTex([[p, "x"]], qv * B[1]![0]!), linTex([[qv, "y"]], p * B[0]![1]!)],
      [
        linTex([[kk * p, "x"]], kk * qv * B[1]![0]!),
        linTex([[kk * qv, "y"]], kk * p * B[0]![1]!),
      ],
    ]);
    const first = [
      `$AB=${mat(A)}${Bshow}=${AB}$`,
      `$AB=O$이므로 $${linTex([[p, "x"]], qv * B[1]![0]!)}=0$, $${linTex([[qv, "y"]], p * B[0]![1]!)}=0$`,
    ];
    const unitO = `$O$${eun("O")} 영행렬이다.`;
    if (mode === 0) {
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["x+y", x + y],
        ["xy", x * y],
      ]);
      return {
        content: `두 행렬 $A=${mat(A)}$, $B=${Bshow}$에 대하여 $AB=O$일 때, 상수 $x$, $y$에 대하여 $${et}$의 값을 구하시오. (단, ${unitO})`,
        answer: numAnswer(ev),
        solution: [
          ...first,
          `따라서 $x=${x}$, $y=${y}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          ...mfacts("A", A),
          b12: B[0]![1]!,
          b21: B[1]![0]!,
          exprId,
        },
      };
    }
    const BA = mmul(B, A);
    const v = msum(BA);
    return {
      content: `두 행렬 $A=${mat(A)}$, $B=${Bshow}$에 대하여 $AB=O$일 때, 행렬 $BA$의 모든 성분의 합을 구하시오. (단, $x$, $y$${eun("y")} 상수이고, ${unitO})`,
      answer: numAnswer(v),
      solution: [
        ...first,
        `$x=${x}$, $y=${y}$이므로 $B=${mat(B)}$`,
        `$BA=${mat(B)}${mat(A)}=${mat(BA)}$`,
        `따라서 $BA$의 모든 성분의 합은 $${sumLine(BA)}=${v}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, ...mfacts("A", A), b12: B[0]![1]!, b21: B[1]![0]! },
    };
  });
}

// ───────────────────────────── 등록 ─────────────────────────────

function entry(
  number: string,
  title: string,
  unitSection: string,
  make: (rng: Rng) => Body,
): HighTypeEntry {
  const meta = {
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType: number,
    rpmTitle: title,
  };
  return {
    key: `${BOOK}|${MINOR}|${number}`,
    ...meta,
    handler: (rng: Rng): HighProblem => ({ ...meta, ...make(rng) }),
  };
}

/** 번호·제목은 `scripts/rpm/rpm-high-type-catalog.json` 의 **바이트 그대로**다(시험이 대조한다). */
export const H1_MATRIX: HighTypeEntry[] = [
  entry("01", "행렬 구하기", SEC.행렬, t01),
  entry("02", "두 행렬이 서로 같을 조건", SEC.행렬, t02),
  entry("03", ", 행렬의 덧셈 뺄셈과 실수배", SEC.덧셈, t03),
  entry("04", "조건을 만족시키는 행렬", SEC.덧셈, t04),
  entry("05", "행렬의 변형", SEC.덧셈, t05),
  entry("06", "행렬의 곱셈", SEC.곱셈, t06),
  entry("07", "행렬의 곱셈의 변형", SEC.곱셈, t07),
  entry("08", "행렬의 거듭제곱", SEC.곱셈, t08),
  entry("09", "행렬의 곱셈에 대한 성질", SEC.성질, t09),
  entry("10", "단위행렬의 성질", SEC.성질, t10),
  entry("11", "A^n의 추정", SEC.성질, t11),
  entry("12", "행렬의 곱셈의 여러 가지 성질", SEC.성질, t12),
];

/** 이 중단원은 색인 12유형을 모두 등록했다 — 보류 없음. */
export const H1_MATRIX_HOLD: HighHold[] = [];
