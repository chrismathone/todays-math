/**
 * 공통수학1 「항등식과 나머지정리」 — RPM 공통수학1(2022) 색인 14유형. **고등 엔진의 본보기.**
 *
 * 다음 세션은 이 파일을 읽고 그대로 따라 한다(`docs/planning/tracks/high-engine-plan.md` §3).
 * 중등 본보기(`src/lib/middle/m1LinearApply.ts`)의 계약을 물려받고, 고등이라서 더한 것은 셋이다:
 *
 * ## ⑴ 꼴(mode)마다 칸이 다르다 — 대표문제 꼴은 `기본`
 *
 * RPM 2022 의 난이도 표는 거의 「중」이다(공통수학1 285/452). 유형 단위로 칸을 하나 매기면
 * 거의 전부 `응용`이 되고 하위반 배분의 `기본` 칸이 빈다. 그래서 유형마다 **대표문제 꼴은
 * `기본`**, 나머지 꼴은 그 유형 문항의 검은 표를 따른다(중하 → 기본 · 중 → 응용 · 상중 → 심화하).
 * 규칙은 **시험 쪽에** 있다(`highIdentity.test.ts` — 모듈이 저장소 밖 산출물인 색인 json 을
 * 읽지 않게). 여기서는 칸을 직접 적는다.
 *
 * ## ⑵ 정답이 다항식이면 오답 넷을 여기서 낸다
 *
 * 「나머지를 구하시오」의 답은 `$-x^{2}+2x+2$` 같은 식이다. 공용 오답 경로는 **정답 속 첫 수**를
 * 흔들기 때문에 그 수가 지수이면 `$-x^{1}+2x+2$` 같은 보기를 낸다(실측 2026-09-13 — 객관식이
 * 빠지는 게 아니라 **보기가 흉해진다**). 그 꼴은 `distractors` 에 **틀리기 쉬운 자리**의 오답을
 * 넣는다(계수 자리 바꿈 · 상수항 부호 · 한 조건만 쓴 나머지). 정답이 수인 꼴은 비워 둔다.
 *
 * ## ⑶ 수식 뒤 조사는 `josa.ts` 로만 붙인다
 *
 * 고등 발문은 「$x-3$으로 나누었을 때」처럼 수식 바로 뒤 조사가 많고, 끝이 수·문자·지수·괄호로
 * 제각각이다. 손으로 「으로」를 적으면 `$x+2$으로` 가 나간다 — 값 검산으로는 절대 안 잡힌다.
 *
 * ## 생성 규칙 — 답을 먼저 정하고 식을 짓는다
 *
 * 미정계수·나머지·몫을 먼저 정수로 뽑고 발문의 다항식을 그로부터 **전개해** 만든다.
 * `facts` 에는 원 수치만 싣고, 시험은 그 수치로 **다른 식**(직접 나눗셈·여러 점 대입·BigInt)을
 * 세워 답을 다시 낸다. 나눗셈이 정수로 안 떨어지면 `poly.divMod` 가 던진다.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「1. 다항식」)
 *
 *   01~04 → 항등식 · 05·13 → 다항식의 나눗셈과 항등식 · 06~10·14 → 나머지와 인수정리(1)
 *   · 11·12 → 나머지와 인수정리(2).
 *   13(조립제법과 항등식)은 RPM 이 이 중단원에 두었고, 시드에서 가장 가까운 것이 「다항식의
 *   나눗셈과 항등식」이다(「다항식의 나눗셈(2)」가 조립제법 자체라면 옮길 수 있다 — 원장님 확인 대상).
 *
 * RPM 원본은 보기만 한다(`.rpm-src/22/`). 본문·수치를 옮기지 않는다(저작권) — 유형의 구조만.
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, ira, ro } from "./josa";
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
  withSign,
} from "./pick";
import {
  add,
  divMod,
  evalAt,
  factorParen,
  factorTex,
  fromRoots,
  linTex,
  paren,
  polyTex,
  pow,
  scale,
  shiftedToPoly,
  sub,
  term,
} from "./poly";
import type { HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "항등식과 나머지정리";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 1. 다항식). */
const SEC = {
  항등식: "항등식",
  나눗셈항등식: "다항식의 나눗셈과 항등식",
  나머지: "나머지와 인수정리(1)",
  인수: "나머지와 인수정리(2)",
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

// ───────────────────────────── 지면 ─────────────────────────────

function termIf(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

/** $(x-u)(x-v)\cdots$ — 근이 0 이면 `x` 를 앞에 둔다(`x(x-1)`). */
function prodTex(roots: readonly number[]): string {
  return [...roots]
    .sort((a, b) => Number(b === 0) - Number(a === 0))
    .map((r) => factorParen(r))
    .join("");
}

function chooseExpr(rng: Rng, exprs: readonly Expr[]): [number, Expr] {
  const id = randInt(rng, 0, exprs.length - 1);
  return [id, exprs[id]!];
}

// ───────────────────────────── 01 ─────────────────────────────
// 항등식에서 미정계수 구하기 - 계수 비교법
// 꼴 0 (기본·대표): (x-r)(x²+bx+c) 를 전개해 비교
// 꼴 1 (응용): k 의 값에 관계없이 성립 → x−y, xy 를 얻어 대칭식
// 꼴 2 (심화하): 몫 Q(x) 를 모르는 나눗셈 등식

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const r = nz(rng, -4, 4);
      const b = randInt(rng, -5, 5);
      const c = nz(rng, -6, 6);
      const L2 = b - r;
      const a = c - r * b;
      const L0 = -r * c;
      if (a === 0) return null;
      const exprs: Expr[] = [
        ["a+b+c", a + b + c],
        ["a+b-c", a + b - c],
      ];
      if (b !== 0) exprs.push(["abc", a * b * c]);
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const lhs = `x^{3}${termIf(L2, "x^{2}")}+ax${plusConst(L0)}`;
      const rhs = `${factorParen(r)}(x^{2}+bx+c)`;
      const e2 = linTex([[1, "b"]], -r);
      const e1 = linTex([
        [1, "c"],
        [-r, "b"],
      ]);
      const e0 = linTex([[-r, "c"]]);
      return {
        content: `등식 $${lhs}=${rhs}$${ga(rhs)} $x$에 대한 항등식일 때, 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `우변을 전개하면 $${rhs}=x^{3}+(${e2})x^{2}+(${e1})x${withSign(e0)}$`,
          `이 등식이 $x$에 대한 항등식이므로 양변의 동류항의 계수를 비교하면`,
          `$${L2}=${e2}$, $a=${e1}$, $${L0}=${e0}$`,
          `따라서 $b=${b}$, $c=${c}$, $a=${a}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, r, b, c, a, L2, L0, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const m = nz(rng, -4, 4);
      const n = randInt(rng, 1, 9);
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["x^{2}+y^{2}", m * m + 2 * n],
        ["(x+y)^{2}", m * m + 4 * n],
      ]);
      const eq = `kx+xy-ky${term(-m, "k")}${plusConst(-n)}=0`;
      const how =
        exprId === 0
          ? `(x-y)^{2}+2xy=${paren(m)}^{2}+2\\times ${n}`
          : `(x-y)^{2}+4xy=${paren(m)}^{2}+4\\times ${n}`;
      return {
        content: `등식 $${eq}$${ga(eq)} $k$의 값에 관계없이 항상 성립할 때, 상수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `주어진 등식을 $k$에 대하여 정리하면 $(x-y${plusConst(-m)})k+xy${plusConst(-n)}=0$`,
          `이 등식이 $k$에 대한 항등식이므로 $x-y${plusConst(-m)}=0$, $xy${plusConst(-n)}=0$`,
          `즉 $x-y=${m}$, $xy=${n}$이므로`,
          `$${et}=${how}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, m, n, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const d = nz(rng, -3, 3);
    const e = nz(rng, -4, 4);
    const b = nz(rng, -6, 6);
    const R = nz(rng, -6, 6);
    const P = e - d * d + b;
    const a = -d * e + R;
    if (P === 0 || a === 0) return null;
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["ab", a * b],
      ["a+b", a + b],
    ]);
    const D = polyTex([e, d, 1]);
    const lhs = `x^{3}${term(P, "x")}+a`;
    const rhs = `(${D})Q(x)+bx${plusConst(R)}`;
    const q2 = linTex([[1, "q"]], d);
    const q1 = linTex(
      [
        [d, "q"],
        [1, "b"],
      ],
      e,
    );
    const q0 = linTex([[e, "q"]], R);
    return {
      content: `임의의 실수 $x$에 대하여 등식 $${lhs}=${rhs}$${ga(rhs)} 성립할 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오. (단, $Q(x)$는 $x$에 대한 다항식이다.)`,
      answer: numAnswer(ev),
      solution: [
        `$Q(x)$는 최고차항의 계수가 $1$인 일차식이므로 $Q(x)=x+q$ ($q$는 상수)라 하면`,
        `$${lhs}=(${D})(x+q)+bx${plusConst(R)}$`,
        `$=x^{3}+(${q2})x^{2}+(${q1})x${withSign(q0)}$`,
        `이 등식이 $x$에 대한 항등식이므로`,
        `$0=${q2}$, $${P}=${q1}$, $a=${q0}$`,
        `따라서 $q=${-d}$, $b=${b}$, $a=${a}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, d, e, b, R, P, a, exprId },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 항등식에서 미정계수 구하기 - 수치 대입법
// 꼴 0 (기본·대표): a(x−v)(x−w)+b(x−u)(x−w)+c(x−u)(x−v) — 세 점 대입
// 꼴 1 (응용): a(x−s)²+b(x−s)+c — x=s, s±1 대입
// 꼴 2 (심화하): xⁿ+ax+b=(x−u)(x−v)f(x) 에서 f(t)

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v, w] = distinctInts(rng, -2, 2, 3) as [number, number, number];
      const a = nz(rng, -4, 4);
      const b = nz(rng, -4, 4);
      const c = nz(rng, -4, 4);
      if (a + b + c === 0) return null;
      const f = add(
        add(scale(fromRoots([v, w]), a), scale(fromRoots([u, w]), b)),
        scale(fromRoots([u, v]), c),
      );
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["abc", a * b * c],
        ["a+b+c", a + b + c],
        ["a-b+c", a - b + c],
      ]);
      const rhs = `a${prodTex([v, w])}+b${prodTex([u, w])}+c${prodTex([u, v])}`;
      const nodes: [number, number, string][] = [
        [u, (u - v) * (u - w), "a"],
        [v, (v - u) * (v - w), "b"],
        [w, (w - u) * (w - v), "c"],
      ];
      return {
        content: `등식 $${polyTex(f)}=${rhs}$${ga(rhs)} $x$에 대한 항등식일 때, 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `주어진 등식의 양변에 $x=${u}$, $x=${v}$, $x=${w}$${eul(String(w))} 각각 대입하면`,
          nodes
            .map(([z, k, s]) => `$${evalAt(f, z)}=${linTex([[k, s]])}$`)
            .join(", "),
          `따라서 $a=${a}$, $b=${b}$, $c=${c}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, w, a, b, c, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const s = nz(rng, -3, 3);
      const a = nz(rng, -4, 4);
      const b = randInt(rng, -6, 6);
      const c = nz(rng, -6, 6);
      const f = shiftedToPoly([c, b, a], s);
      const exprs: Expr[] = [
        ["2a+b-c", 2 * a + b - c],
        ["a+b+c", a + b + c],
      ];
      if (b !== 0) exprs.push(["abc", a * b * c]);
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const fs = factorParen(s);
      const rhs = `a${fs}^{2}+b${fs}+c`;
      return {
        content: `모든 실수 $x$에 대하여 등식 $${polyTex(f)}=${rhs}$${ga(rhs)} 성립할 때, 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `주어진 등식의 양변에 $x=${s}$, $x=${s + 1}$, $x=${s - 1}$${eul(String(s - 1))} 각각 대입하면`,
          `$${evalAt(f, s)}=c$, $${evalAt(f, s + 1)}=a+b+c$, $${evalAt(f, s - 1)}=a-b+c$`,
          `따라서 $a=${a}$, $b=${b}$, $c=${c}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, s, a, b, c, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const n = pickOne(rng, [3, 4, 5]);
    const [u, v] = distinctInts(rng, -2, 2, 2, { nonzero: true }) as [
      number,
      number,
    ];
    const A = -(u ** n - v ** n) / (u - v);
    const B = -(u ** n) - A * u;
    const t = pickOne(
      rng,
      [-3, -2, -1, 0, 1, 2, 3].filter((z) => z !== u && z !== v),
    );
    const lhsPoly = new Array<number>(n + 1).fill(0);
    lhsPoly[0] = B;
    lhsPoly[1] = A;
    lhsPoly[n] = 1;
    const { q, r } = divMod(lhsPoly, fromRoots([u, v]));
    if (r.some((x) => x !== 0)) return null;
    const ft = evalAt(q, t);
    const k = (t - u) * (t - v);
    return {
      content: `다항식 $f(x)$에 대하여 등식 $x^{${n}}+ax+b=${prodTex([u, v])}f(x)$${ga("f(x)")} $x$에 대한 항등식일 때, $f(${t})$의 값을 구하시오. (단, $a$, $b$는 상수이다.)`,
      answer: numAnswer(ft),
      solution: [
        `주어진 등식의 양변에 $x=${u}$, $x=${v}$${eul(String(v))} 각각 대입하면`,
        `$${linTex(
          [
            [u, "a"],
            [1, "b"],
          ],
          u ** n,
        )}=0$, $${linTex(
          [
            [v, "a"],
            [1, "b"],
          ],
          v ** n,
        )}=0$`,
        `두 식을 연립하여 풀면 $a=${A}$, $b=${B}$`,
        `따라서 주어진 등식은 $${polyTex(lhsPoly)}=${prodTex([u, v])}f(x)$`,
        `이 등식의 양변에 $x=${t}$${eul(String(t))} 대입하면 $${evalAt(lhsPoly, t)}=${coefPrefix(k)}f(${t})$`,
        `따라서 $f(${t})=${ft}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, n, u, v, t, a: A, b: B },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 조건을 만족시키는 항등식
// 꼴 0 (기본·대표): 일차 관계식을 대입하면 한 문자에 대한 항등식
// 꼴 1 (응용): k 의 값에 관계없이 늘 α 를 근으로 갖는 이차방정식

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const m = nz(rng, -3, 3);
      const n = nz(rng, -4, 4);
      const p = pickOne(rng, [1, 2, 3]);
      const a = nz(rng, -5, 5);
      const q = p * a * n;
      const b = p * a * m;
      const rel = `x${term(m, "y")}=${n}`;
      const pa = p === 1 ? "a" : `${p}a`;
      const eq = `${pa}x+by=${q}`;
      const xOf = linTex([[-m, "y"]], n);
      const cy = linTex([
        [-p * m, "a"],
        [1, "b"],
      ]);
      const c0 = linTex([[p * n, "a"]], -q);
      return {
        content: `$${rel}$${eul(rel)} 만족시키는 모든 실수 $x$, $y$에 대하여 등식 $${eq}$${ga(eq)} 성립할 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: numAnswer(a + b),
        solution: [
          `$${rel}$에서 $x=${xOf}$`,
          `이것을 주어진 등식에 대입하면 $${pa}(${xOf})+by=${q}$`,
          `$y$에 대하여 정리하면 $(${cy})y${withSign(c0)}=0$`,
          `이 등식이 $y$에 대한 항등식이므로 $${cy}=0$, $${c0}=0$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, m, n, p, a, b, q },
      };
    });
  return attempt<Body>((): Body | null => {
    const al = pickOne(rng, [-2, -1, 1, 2]);
    const s = randInt(rng, -4, 4);
    const t = nz(rng, -3, 3);
    const p = -al;
    const q = -(al * al) - s * al + t * al;
    const xCoef = s === 0 ? "kx" : `(k${plusConst(s)})x`;
    const eq = `x^{2}+${xCoef}+(k${plusConst(t)})p+q=0`;
    const kTimes =
      s === 0
        ? `k\\times ${paren(al)}`
        : `(k${plusConst(s)})\\times ${paren(al)}`;
    const c1 = linTex([[1, "p"]], al);
    const c0 = linTex(
      [
        [t, "p"],
        [1, "q"],
      ],
      al * al + s * al,
    );
    const alT = String(al);
    return {
      content: `이차방정식 $${eq}$${ga(eq)} 실수 $k$의 값에 관계없이 항상 $${al}$${eul(alT)} 근으로 가질 때, 상수 $p$, $q$에 대하여 $p+q$의 값을 구하시오.`,
      answer: numAnswer(p + q),
      solution: [
        `주어진 방정식이 $${al}$${eul(alT)} 근으로 가지므로 $x=${al}$${eul(alT)} 대입하면`,
        `$${al * al}+${kTimes}+(k${plusConst(t)})p+q=0$`,
        `$k$에 대하여 정리하면 $(${c1})k${withSign(c0)}=0$`,
        `이 등식이 $k$에 대한 항등식이므로 $${c1}=0$, $${c0}=0$`,
        `따라서 $p=${p}$, $q=${q}$이므로 $p+q=${p + q}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, al, s, t, p, q },
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 항등식에서 계수의 합 구하기
// 꼴 0 (기본·대표): 계수 전체의 합 — x=1 한 번
// 꼴 1 (응용): 짝수 차수·홀수 차수·a₀ 를 뺀 합 — 두 번 대입

function coefListTex(idx: readonly number[]): string {
  const parts = idx.map((i) => `a_{${i}}`);
  if (parts.length <= 4) return parts.join("+");
  return `${parts[0]}+${parts[1]}+${parts[2]}+\\cdots+${parts[parts.length - 1]}`;
}

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const quad = rng() < 0.5;
    const base = quad
      ? [nz(rng, -2, 2), randInt(rng, -2, 2), 1]
      : [pickOne(rng, [-2, -1, 1, 2, 3]), 1];
    const n = quad ? pickOne(rng, [2, 3]) : pickOne(rng, [4, 5, 6]);
    const f = pow(base, n);
    const N = f.length - 1;
    const kind = mode === 0 ? 0 : pickOne(rng, [1, 2, 3]);
    const all = Array.from({ length: N + 1 }, (_, i) => i);
    const idx =
      kind === 0
        ? all
        : kind === 1
          ? all.filter((i) => i % 2 === 0)
          : kind === 2
            ? all.filter((i) => i % 2 === 1)
            : all.slice(1);
    const value = idx.reduce((sum, i) => sum + f[i]!, 0);
    const ask = coefListTex(idx);
    const baseTex = `(${polyTex(base)})^{${n}}`;
    const rhs = `a_{0}+a_{1}x+a_{2}x^{2}+\\cdots+a_{${N}}x^{${N}}`;
    const b1 = evalAt(base, 1);
    const bm = evalAt(base, -1);
    const S1 = b1 ** n;
    const Sm = bm ** n;
    const allSum = `a_{0}+a_{1}+a_{2}+\\cdots+a_{${N}}`;
    const lines: string[] = [];
    if (kind === 0) {
      lines.push(
        `주어진 등식의 양변에 $x=1$을 대입하면`,
        `$${paren(b1)}^{${n}}=${allSum}$`,
        `따라서 구하는 값은 $${value}$`,
      );
    } else if (kind === 1 || kind === 2) {
      lines.push(
        `주어진 등식의 양변에 $x=1$을 대입하면`,
        `$${paren(b1)}^{${n}}=${allSum}$ ……㉠`,
        `양변에 $x=-1$을 대입하면`,
        `$${paren(bm)}^{${n}}=a_{0}-a_{1}+a_{2}-\\cdots${N % 2 === 0 ? "+" : "-"}a_{${N}}$ ……㉡`,
        kind === 1
          ? `㉠+㉡을 하면 $${S1 + Sm}=2(${ask})$`
          : `㉠-㉡을 하면 $${S1 - Sm}=2(${ask})$`,
        `따라서 구하는 값은 $${value}$`,
      );
    } else {
      const f0 = f[0]!;
      lines.push(
        `주어진 등식의 양변에 $x=0$을 대입하면 $a_{0}=${f0}$`,
        `양변에 $x=1$을 대입하면 $${paren(b1)}^{${n}}=${allSum}$`,
        `따라서 $${ask}=(${allSum})-a_{0}=${S1}-${paren(f0)}=${value}$`,
      );
    }
    const aN = `a_{${N}}`;
    return {
      content: `등식 $${baseTex}=${rhs}$${ga(rhs)} $x$에 대한 항등식일 때, $${ask}$의 값을 구하시오. (단, $a_{0}$, $a_{1}$, $a_{2}$, $\\cdots$, $${aN}$${eun(aN)} 상수이다.)`,
      answer: numAnswer(value),
      solution: lines.join("\n"),
      difficulty: kind === 0 ? "기본" : "응용",
      facts: {
        mode,
        kind,
        n,
        c0: base[0]!,
        c1: base[1]!,
        c2: base[2] ?? 0,
      },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 다항식의 나눗셈과 항등식
// 꼴 0 (기본·대표): 나머지가 주어진 나눗셈 — 몫을 x+c 로 놓고 비교
// 꼴 1 (응용): 나누어떨어지는 나눗셈
// 꼴 2 (응용): 인수분해되는 이차식으로 나눈 나머지 — 두 점 대입

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const d = nz(rng, -4, 4);
      const b = nz(rng, -5, 5);
      const r1 = nz(rng, -5, 5);
      const r0 = randInt(rng, -6, 6);
      const a = b - d * d + r1;
      const K = -b * d + r0;
      if (a === 0 || K === 0) return null;
      const dividend = `x^{3}+ax${plusConst(K)}`;
      const divisor = `x^{2}${term(d, "x")}+b`;
      const rem = polyTex([r0, r1]);
      const c2 = linTex([[1, "c"]], d);
      const c1 = linTex(
        [
          [d, "c"],
          [1, "b"],
        ],
        r1,
      );
      const c0 = linTex([[1, "bc"]], r0);
      return {
        content: `다항식 $${dividend}$${eul(dividend)} $${divisor}$${ro(divisor)} 나누었을 때의 나머지가 $${rem}$${ga(rem)} 되도록 하는 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: numAnswer(a + b),
        solution: [
          `$${dividend}$${eul(dividend)} $${divisor}$${ro(divisor)} 나누었을 때의 몫을 $x+c$ ($c$는 상수)라 하면`,
          `$${dividend}=(${divisor})(x+c)${withSign(rem)}$`,
          `$=x^{3}+(${c2})x^{2}+(${c1})x${withSign(c0)}$`,
          `이 등식이 $x$에 대한 항등식이므로`,
          `$0=${c2}$, $a=${c1}$, $${K}=${c0}$`,
          `따라서 $c=${-d}$, $b=${b}$, $a=${a}$이므로 $a+b=${a + b}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, d, b, r1, r0, a, K },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const D = nz(rng, -4, 4);
      const c = nz(rng, -5, 5);
      const b = nz(rng, -6, 6);
      const P = c + D;
      const Q = b + D * c;
      const a = -b * c;
      if (P === 0 || Q === 0) return null;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a-b", a - b],
        ["a+b", a + b],
      ]);
      const dividend = `x^{3}${term(P, "x^{2}")}${term(Q, "x")}-a`;
      const divisor = `x^{2}${term(D, "x")}+b`;
      const c2 = linTex([[1, "c"]], D);
      const c1 = linTex([
        [D, "c"],
        [1, "b"],
      ]);
      return {
        content: `다항식 $${dividend}$${ga(dividend)} $${divisor}$${ro(divisor)} 나누어떨어질 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${dividend}$${eul(dividend)} $${divisor}$${ro(divisor)} 나누었을 때의 몫을 $x+c$ ($c$는 상수)라 하면`,
          `$${dividend}=(${divisor})(x+c)$`,
          `$=x^{3}+(${c2})x^{2}+(${c1})x+bc$`,
          `이 등식이 $x$에 대한 항등식이므로 $${P}=${c2}$, $${Q}=${c1}$, $-a=bc$`,
          `따라서 $c=${c}$, $b=${b}$, $a=${a}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, D, c, b, P, Q, a, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
      number,
      number,
    ];
    // u² = v² 이면 두 식이 a 를 못 가른다 — 연립이 안 풀린다.
    if (u === -v) return null;
    const a = nz(rng, -4, 4);
    const b = nz(rng, -6, 6);
    const D = fromRoots([u, v]);
    const { r } = divMod([b, 0, a, 1], D);
    const r0 = r[0] ?? 0;
    const r1 = r[1] ?? 0;
    if (r0 === 0 && r1 === 0) return null;
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["ab", a * b],
      ["a+b", a + b],
    ]);
    const rem = polyTex([r0, r1]);
    const Dt = polyTex(D);
    return {
      content: `다항식 $x^{3}+ax^{2}+b$를 $${Dt}$${ro(Dt)} 나누었을 때의 나머지가 $${rem}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$x^{3}+ax^{2}+b$를 $${Dt}$${ro(Dt)} 나누었을 때의 몫을 $Q(x)$라 하면`,
        `$x^{3}+ax^{2}+b=${prodTex([u, v])}Q(x)${withSign(rem)}$`,
        `이 등식이 $x$에 대한 항등식이므로 양변에 $x=${u}$, $x=${v}$${eul(String(v))} 각각 대입하면`,
        `$${linTex(
          [
            [u * u, "a"],
            [1, "b"],
          ],
          u ** 3,
        )}=${r1 * u + r0}$, $${linTex(
          [
            [v * v, "a"],
            [1, "b"],
          ],
          v ** 3,
        )}=${r1 * v + r0}$`,
        `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
        `따라서 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, u, v, a, b, r1, r0, exprId },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 일차식으로 나누었을 때의 나머지
// 꼴 0 (기본·대표): f(α), g(α) 로 mf+ng 의 나머지
// 꼴 1 (기본): 두 일차식으로 나눈 나머지가 같다
// 꼴 2 (응용): x−1, x+1 로 나눈 나머지 둘로 두 계수

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const al = nz(rng, -4, 4);
      const F = nz(rng, -6, 6);
      const G = nz(rng, -6, 6);
      const m = nz(rng, -3, 4);
      const n = nz(rng, -3, 4);
      const combo = `${coefPrefix(m)}f(x)${term(n, "g(x)")}`;
      const val = m * F + n * G;
      const dv = factorTex(al);
      return {
        content: `다항식 $f(x)$를 $${dv}$${ro(dv)} 나누었을 때의 나머지는 $${F}$이고, 다항식 $g(x)$를 $${dv}$${ro(dv)} 나누었을 때의 나머지는 $${G}$이다. 이때 다항식 $${combo}$${eul(combo)} $${dv}$${ro(dv)} 나누었을 때의 나머지를 구하시오.`,
        answer: numAnswer(val),
        solution: [
          `나머지정리에 의하여 $f(${al})=${F}$, $g(${al})=${G}$`,
          `따라서 구하는 나머지는 $${coefPrefix(m)}f(${al})${term(n, `g(${al})`)}=${m}\\times ${paren(F)}${n < 0 ? "-" : "+"}${Math.abs(n)}\\times ${paren(G)}=${val}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, al, F, G, m, n },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const p = randInt(rng, -3, 3);
      const q = nz(rng, -8, 8);
      const a = -(u * u + u * v + v * v + p * (u + v));
      if (a === 0) return null;
      const fx = `x^{3}${termIf(p, "x^{2}")}+ax${plusConst(q)}`;
      const U0 = u ** 3 + p * u * u + q;
      const V0 = v ** 3 + p * v * v + q;
      const fu = factorTex(u);
      const fv = factorTex(v);
      return {
        content: `다항식 $f(x)=${fx}$${eul(fx)} $${fu}$${ro(fu)} 나누었을 때의 나머지와 $${fv}$${ro(fv)} 나누었을 때의 나머지가 같을 때, 상수 $a$의 값을 구하시오.`,
        answer: numAnswer(a),
        solution: [
          `나머지정리에 의하여 $f(${u})=f(${v})$이므로`,
          `$${linTex([[u, "a"]], U0)}=${linTex([[v, "a"]], V0)}$`,
          `따라서 $${linTex([[u - v, "a"]])}=${V0 - U0}$이므로 $a=${a}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, p, q, a },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = nz(rng, -4, 4);
    const b = nz(rng, -4, 4);
    const k = nz(rng, -5, 5);
    const R1 = 1 + a + b + k;
    const R2 = 1 - a + b + k;
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["ab", a * b],
      ["a+b", a + b],
    ]);
    const fx = `x^{4}+ax^{3}+bx^{2}${plusConst(k)}`;
    return {
      content: `다항식 $${fx}$${eul(fx)} $x-1$로 나누었을 때의 나머지가 $${R1}$이고, $x+1$로 나누었을 때의 나머지가 $${R2}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$f(x)=${fx}$${ira(fx)} 하면 나머지정리에 의하여 $f(1)=${R1}$, $f(-1)=${R2}$`,
        `$${linTex(
          [
            [1, "a"],
            [1, "b"],
          ],
          1 + k,
        )}=${R1}$, $${linTex(
          [
            [-1, "a"],
            [1, "b"],
          ],
          1 + k,
        )}=${R2}$`,
        `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
        `따라서 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b, k, R1, R2, exprId },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 이차식으로 나누었을 때의 나머지
// 꼴 0 (기본·대표): 두 일차식 나머지로 이차식 나머지 R(x) 를 세우고 R(t)
// 꼴 1 (응용): 서로 다른 두 이차식의 나머지로 세 번째 이차식의 나머지 — 답이 식(오답 넷)

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const m = nz(rng, -4, 4);
      const n = randInt(rng, -6, 6);
      const t = randInt(rng, -2, 3);
      // 🔴 $t$ 가 나누는 일차식의 근이면 $R(t)=f(t)$ 가 발문에 적힌 나머지 그대로다 — 「$x-2$로 나눈 나머지가
      //    $-1$ … $R(2)$의 값」의 답이 $-1$ 이다. 씨앗 여덟의 이 꼴 51판 가운데 12판이 그랬다
      //    (2026-10-08 적재 전 관문 — 값 검산은 답이 맞아 못 본다). 그런 판은 다시 뽑는다.
      if (t === u || t === v) return null;
      const P = m * u + n;
      const Q = m * v + n;
      const D = polyTex(fromRoots([u, v]));
      const fu = factorTex(u);
      const fv = factorTex(v);
      return {
        content: `다항식 $f(x)$를 $${fu}$, $${fv}$${ro(fv)} 나누었을 때의 나머지는 각각 $${P}$, $${Q}$이다. $f(x)$를 $${D}$${ro(D)} 나누었을 때의 나머지를 $R(x)$라 할 때, $R(${t})$의 값을 구하시오.`,
        answer: numAnswer(m * t + n),
        solution: [
          `나머지정리에 의하여 $f(${u})=${P}$, $f(${v})=${Q}$`,
          `$f(x)$를 $${D}$${ro(D)} 나누었을 때의 몫을 $Q(x)$, $R(x)=ax+b$ ($a$, $b$는 상수)라 하면`,
          `$f(x)=(${D})Q(x)+ax+b=${prodTex([u, v])}Q(x)+ax+b$`,
          `양변에 $x=${u}$, $x=${v}$${eul(String(v))} 각각 대입하면 $${linTex([
            [u, "a"],
            [1, "b"],
          ])}=${P}$, $${linTex([
            [v, "a"],
            [1, "b"],
          ])}=${Q}$`,
          `두 식을 연립하여 풀면 $a=${m}$, $b=${n}$`,
          `따라서 $R(x)=${polyTex([n, m])}$이므로 $R(${t})=${m * t + n}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, m, n, t, P, Q },
      };
    });
  return attempt<Body>((): Body | null => {
    const [p, q, r, s] = distinctInts(rng, -3, 3, 4) as [
      number,
      number,
      number,
      number,
    ];
    const m = nz(rng, -5, 5);
    const n = nz(rng, -6, 6);
    const al = randInt(rng, -4, 4);
    const gm = randInt(rng, -4, 4);
    // 🔴 주어진 나머지의 기울기가 답의 기울기와 같으면 그 나머지가 곧 답이다 — 한 점을 같이 지나는 두 직선의
    //    기울기가 같으면 같은 직선이다. 「… 나머지는 $x-3$이다. … 나머지를 구하시오」의 답이 $x-3$ 이 된다
    //    (2026-10-08 적재 전 관문 — 씨앗 여덟에서 8판). 그런 판은 다시 뽑는다.
    if (al === m || gm === m) return null;
    const fp = m * p + n;
    const fr = m * r + n;
    const R1 = [fp - al * p, al];
    const R2 = [fr - gm * r, gm];
    const D1t = polyTex(fromRoots([p, q]));
    const D2t = polyTex(fromRoots([r, s]));
    const D3t = polyTex(fromRoots([p, r]));
    const R1t = polyTex(R1);
    const R2t = polyTex(R2);
    const ansBody = polyTex([n, m]);
    const distractors = pickDistractors(rng, ansBody, [
      polyTex([m, n]),
      polyTex([-n, m]),
      polyTex([n, -m]),
      polyTex([n + m, m]),
      polyTex([n - m, m]),
      polyTex([n, m + 1]),
      polyTex([n, m - 1]),
    ]);
    if (distractors === null) return null;
    return {
      content: `다항식 $f(x)$를 $${D1t}$${ro(D1t)} 나누었을 때의 나머지는 $${R1t}$이고, $${D2t}$${ro(D2t)} 나누었을 때의 나머지는 $${R2t}$이다. 이때 $f(x)$를 $${D3t}$${ro(D3t)} 나누었을 때의 나머지를 구하시오.`,
      answer: $(ansBody),
      solution: [
        `$f(x)$를 $${D1t}$${ro(D1t)} 나누었을 때의 몫을 $Q_{1}(x)$라 하면 $f(x)=${prodTex([p, q])}Q_{1}(x)${withSign(R1t)}$`,
        `$f(x)$를 $${D2t}$${ro(D2t)} 나누었을 때의 몫을 $Q_{2}(x)$라 하면 $f(x)=${prodTex([r, s])}Q_{2}(x)${withSign(R2t)}$`,
        `$f(x)$를 $${D3t}$${ro(D3t)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $ax+b$ ($a$, $b$는 상수)라 하면 $f(x)=${prodTex([p, r])}Q(x)+ax+b$`,
        `위의 식에서 $f(${p})=${fp}$, $f(${r})=${fr}$이므로 $${linTex([
          [p, "a"],
          [1, "b"],
        ])}=${fp}$, $${linTex([
          [r, "a"],
          [1, "b"],
        ])}=${fr}$`,
        `두 식을 연립하여 풀면 $a=${m}$, $b=${n}$`,
        `따라서 구하는 나머지는 $${ansBody}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q, r, s, m, n, al, gm },
      distractors,
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 삼차식으로 나누었을 때의 나머지
// 꼴 0 (기본·대표): 이차식·일차식 나머지로 삼차식 나머지 R(x) 를 세우고 R(w)
// 꼴 1 (응용): 같은 설정에서 나머지 자체 — 답이 식(오답 넷)
// 꼴 2 (응용): 거듭제곱 다항식을 x³−x 로 나눈 나머지 — 세 점 대입

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const es = distinctInts(rng, 3, 13, 3).sort((x, y) => y - x);
      const [e1, e2, e3] = es as [number, number, number];
      const s1 = pickOne(rng, [1, -1]);
      const s2 = pickOne(rng, [1, -1]);
      const s3 = pickOne(rng, [1, -1]);
      const k = randInt(rng, -5, 5);
      const coefs = new Array<number>(e1 + 1).fill(0);
      coefs[e1] = s1;
      coefs[e2] = s2;
      coefs[e3] = s3;
      coefs[0] = k;
      const ft = polyTex(coefs);
      const f1 = s1 + s2 + s3 + k;
      const fm = s1 * (-1) ** e1 + s2 * (-1) ** e2 + s3 * (-1) ** e3 + k;
      const C = k;
      const B = (f1 - fm) / 2;
      const A = (f1 + fm) / 2 - C;
      const t = pickOne(rng, [2, 3, 4]);
      const ans = A * t * t + B * t + C;
      return {
        content: `다항식 $${ft}$${eul(ft)} $x^{3}-x$로 나누었을 때의 나머지를 $R(x)$라 할 때, $R(${t})$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${ft}$${eul(ft)} $x^{3}-x$로 나누었을 때의 몫을 $Q(x)$, $R(x)=ax^{2}+bx+c$ ($a$, $b$, $c$는 상수)라 하면`,
          `$${ft}=(x^{3}-x)Q(x)+ax^{2}+bx+c=x(x+1)(x-1)Q(x)+ax^{2}+bx+c$`,
          `양변에 $x=0$을 대입하면 $c=${C}$`,
          `양변에 $x=1$을 대입하면 $a+b+c=${f1}$, $x=-1$을 대입하면 $a-b+c=${fm}$`,
          `두 식을 연립하여 풀면 $a=${A}$, $b=${B}$`,
          `따라서 $R(x)=${polyTex([C, B, A])}$이므로 $R(${t})=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, e1, e2, e3, s1, s2, s3, k, t },
      };
    });
  return attempt<Body>((): Body | null => {
    const P = randInt(rng, -3, 3);
    const Q = nz(rng, -4, 4);
    const D = [Q, P, 1];
    const t = nz(rng, -3, 3);
    const Dt = evalAt(D, t);
    if (Dt === 0) return null;
    const a = nz(rng, -3, 3);
    const r1 = randInt(rng, -5, 5);
    const r0 = randInt(rng, -6, 6);
    if (r1 === 0 && r0 === 0) return null;
    const rem = [r0, r1];
    const K = a * Dt + r1 * t + r0;
    const R = add(scale(D, a), rem);
    const DT = polyTex(D);
    const remT = polyTex(rem);
    const tf = factorTex(t);
    const cubic = `(${DT})(${tf})`;
    const head = `다항식 $f(x)$를 $${DT}$${ro(DT)} 나누었을 때의 나머지는 $${remT}$이고, $${tf}$${ro(tf)} 나누었을 때의 나머지는 $${K}$이다.`;
    const lines = [
      `$f(x)$를 $${cubic}$${ro(cubic)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $ax^{2}+bx+c$ ($a$, $b$, $c$는 상수)라 하면`,
      `$f(x)=${cubic}Q(x)+ax^{2}+bx+c$`,
      `$ax^{2}+bx+c$를 $${DT}$${ro(DT)} 나누었을 때의 나머지가 $${remT}$이므로`,
      `$f(x)=${cubic}Q(x)+a(${DT})${withSign(remT)}$`,
      `$f(${t})=${K}$이므로 $${linTex([[Dt, "a"]], r1 * t + r0)}=${K}$, 즉 $a=${a}$`,
    ];
    const Rtex = `${coefPrefix(a)}(${DT})${withSign(remT)}=${polyTex(R)}`;
    if (mode === 0) {
      const w = randInt(rng, -2, 3);
      // 🔴 $w$ 가 나누는 일차식의 근이면 $R(w)=f(w)$ 가 발문에 적힌 나머지 그대로다(07 꼴 0 과 같은 자리 —
      //    씨앗 여덟의 이 꼴 24판 가운데 4판). 그런 판은 다시 뽑는다.
      if (w === t) return null;
      const ans = evalAt(R, w);
      lines.push(`따라서 $R(x)=${Rtex}$이므로 $R(${w})=${ans}$`);
      return {
        content: `${head} $f(x)$를 $${cubic}$${ro(cubic)} 나누었을 때의 나머지를 $R(x)$라 할 때, $R(${w})$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: lines.join("\n"),
        difficulty: "기본",
        facts: { mode, P, Q, t, a, r1, r0, K, w },
      };
    }
    const distractors = pickDistractors(rng, polyTex(R), [
      ...[-a, a + 1, a - 1, 2 * a, a + 2]
        .filter((x) => x !== a)
        .map((x) => polyTex(add(scale(D, x), rem))),
      polyTex(sub(scale(D, a), rem)),
    ]);
    if (distractors === null) return null;
    lines.push(`따라서 구하는 나머지는 $${Rtex}$이다.`);
    return {
      content: `${head} 이때 $f(x)$를 $${cubic}$${ro(cubic)} 나누었을 때의 나머지를 구하시오.`,
      answer: $(polyTex(R)),
      solution: lines.join("\n"),
      difficulty: "응용",
      facts: { mode, P, Q, t, a, r1, r0, K },
      distractors,
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// f(ax+b)를 x-α로 나누는 경우
// 꼴 0 (기본·대표): f(px+q) 를 x−α 로 나눈 나머지 = f(pα+q)
// 꼴 1 (응용): (x−k)f(px+q) 를 x−α 로 나눈 나머지

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const [u, v] = distinctInts(rng, -3, 3, 2) as [number, number];
    const r1 = nz(rng, -4, 4);
    const r0 = randInt(rng, -6, 6);
    const w = pickOne(rng, [u, v]);
    const p = pickOne(rng, [2, 3, -1, -2]);
    const al = nz(rng, -2, 3);
    const q = w - p * al;
    const k =
      mode === 1
        ? pickOne(
            rng,
            [-3, -2, -1, 1, 2, 3].filter((z) => z !== al),
          )
        : 0;
    const inner = polyTex([q, p]);
    const D = polyTex(fromRoots([u, v]));
    const rem = polyTex([r0, r1]);
    const fw = r1 * w + r0;
    const ans = mode === 0 ? fw : (al - k) * fw;
    const target = mode === 0 ? `f(${inner})` : `${factorParen(k)}f(${inner})`;
    const fa = factorTex(al);
    const arg = `${p}\\times ${paren(al)}${plusConst(q)}`;
    const lines = [
      `$f(x)$를 $${D}$${ro(D)} 나누었을 때의 몫을 $Q(x)$라 하면`,
      `$f(x)=${prodTex([u, v])}Q(x)${withSign(rem)}$`,
      `$${target}$${eul(target)} $${fa}$${ro(fa)} 나누었을 때의 나머지는 나머지정리에 의하여`,
    ];
    if (mode === 0) {
      lines.push(
        `$f(${arg})=f(${w})=${r1}\\times ${paren(w)}${plusConst(r0)}=${fw}$`,
      );
    } else {
      lines.push(
        `$(${al}${plusConst(-k)})\\times f(${arg})=${coefPrefix(al - k)}f(${w})$`,
        `이때 $f(${w})=${r1}\\times ${paren(w)}${plusConst(r0)}=${fw}$이므로 구하는 나머지는 $${ans}$`,
      );
    }
    return {
      content: `다항식 $f(x)$를 $${D}$${ro(D)} 나누었을 때의 나머지가 $${rem}$일 때, 다항식 $${target}$${eul(target)} $${fa}$${ro(fa)} 나누었을 때의 나머지를 구하시오.`,
      answer: numAnswer(ans),
      solution: lines.join("\n"),
      difficulty: mode === 0 ? "기본" : "응용",
      facts: { mode, u, v, r1, r0, p, q, al, w, k },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 몫을 x-α로 나누는 경우
// 꼴 0 (기본·대표): 몫 Q(x) 의 나머지로 xf(x) 의 나머지
// 꼴 1 (심화하): 거듭제곱 다항식의 몫을 다시 나눈 나머지 — Q(−1)

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const R = nz(rng, -6, 6);
      const S = nz(rng, -5, 5);
      const fv = (v - u) * S + R;
      const ans = v * fv;
      const fu = factorTex(u);
      const fvx = factorTex(v);
      return {
        content: `다항식 $f(x)$를 $${fu}$${ro(fu)} 나누었을 때의 몫이 $Q(x)$, 나머지가 $${R}$이고, 다항식 $Q(x)$를 $${fvx}$${ro(fvx)} 나누었을 때의 나머지가 $${S}$일 때, 다항식 $xf(x)$를 $${fvx}$${ro(fvx)} 나누었을 때의 나머지를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$f(x)=(${fu})Q(x)${plusConst(R)}$`,
          `$Q(x)$를 $${fvx}$${ro(fvx)} 나누었을 때의 나머지가 $${S}$이므로 $Q(${v})=${S}$`,
          `$xf(x)$를 $${fvx}$${ro(fvx)} 나누었을 때의 나머지는 $${coefPrefix(v)}f(${v})$이고`,
          `$f(${v})=${coefPrefix(v - u)}Q(${v})${plusConst(R)}=${v - u}\\times ${paren(S)}${plusConst(R)}=${fv}$`,
          `따라서 구하는 나머지는 $${v}\\times ${paren(fv)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, R, S },
      };
    });
  return attempt<Body>((): Body | null => {
    const e1 = pickOne(rng, [2024, 2025, 2026, 99, 100, 101, 50, 51]);
    const e2 = e1 - pickOne(rng, [1, 2, 3]);
    const s = pickOne(rng, [1, -1]);
    const c = nz(rng, -4, 4);
    const f1 = 1 + s + c;
    const fm = (-1) ** e1 + s * (-1) ** e2 - c;
    const ans = (f1 - fm) / 2;
    const ft = `x^{${e1}}${s > 0 ? "+" : "-"}x^{${e2}}${term(c, "x")}`;
    return {
      content: `다항식 $${ft}$${eul(ft)} $x-1$로 나누었을 때의 몫을 $Q(x)$라 할 때, $Q(x)$를 $x+1$로 나누었을 때의 나머지를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${ft}$${eul(ft)} $x-1$로 나누었을 때의 나머지는 나머지정리에 의하여 $${f1}$이므로`,
        `$${ft}=(x-1)Q(x)${plusConst(f1)}$ ……㉠`,
        `$Q(x)$를 $x+1$로 나누었을 때의 나머지는 $Q(-1)$이므로 ㉠의 양변에 $x=-1$을 대입하면`,
        `$${fm}=-2Q(-1)${plusConst(f1)}$`,
        `따라서 $Q(-1)=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, e1, e2, s, c },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 인수정리 - 일차식으로 나누는 경우
// 꼴 0 (기본·대표): 두 일차식으로 각각 나누어떨어짐 → 두 계수
// 꼴 1 (기본): 한 일차식으로 나누어떨어짐 → 한 계수
// 꼴 2 (심화하): f(u)=f(v)=f(w)=K 인 삼차식 → f(x)−K 의 인수

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v, w] = distinctInts(rng, -4, 4, 3, { nonzero: true }) as [
        number,
        number,
        number,
      ];
      const K = -u * v * w;
      const a = -(u + v + w);
      const b = u * v + v * w + w * u;
      if (a === 0 || b === 0) return null;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["ab", a * b],
        ["a+b", a + b],
      ]);
      const fx = `x^{3}+ax^{2}+bx${plusConst(K)}`;
      const fu = factorTex(u);
      const fv = factorTex(v);
      return {
        content: `다항식 $${fx}$${ga(fx)} $${fu}$, $${fv}$${ro(fv)} 각각 나누어떨어질 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$f(x)=${fx}$${ira(fx)} 하면 $f(${u})=0$, $f(${v})=0$`,
          `$${linTex(
            [
              [u * u, "a"],
              [u, "b"],
            ],
            u ** 3 + K,
          )}=0$, $${linTex(
            [
              [v * v, "a"],
              [v, "b"],
            ],
            v ** 3 + K,
          )}=0$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, w, K, a, b, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const u = nz(rng, -3, 3);
      const k = nz(rng, -6, 6);
      const p = randInt(rng, -5, 5);
      const q = -(u ** 4 + k * u * u + p * u);
      if (q === 0) return null;
      const fx = `x^{4}+kx^{2}${termIf(p, "x")}${plusConst(q)}`;
      const fu = factorTex(u);
      return {
        content: `다항식 $f(x)=${fx}$${ga(fx)} $${fu}$${ro(fu)} 나누어떨어질 때, 상수 $k$의 값을 구하시오.`,
        answer: numAnswer(k),
        solution: [
          `$f(x)$가 $${fu}$${ro(fu)} 나누어떨어지므로 $f(${u})=0$`,
          `$${linTex([[u * u, "k"]], u ** 4 + p * u + q)}=0$`,
          `따라서 $k=${k}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, k, p, q },
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v, w] = distinctInts(rng, -3, 3, 3).sort((x, y) => x - y) as [
      number,
      number,
      number,
    ];
    const K = nz(rng, -5, 5);
    const t = pickOne(
      rng,
      [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter(
        (z) => z !== u && z !== v && z !== w,
      ),
    );
    const ans = (t - u) * (t - v) * (t - w) + K;
    const g = `f(x)${plusConst(-K)}`;
    const ft = factorTex(t);
    const fw = factorTex(w);
    return {
      content: `$x^{3}$의 계수가 $1$인 삼차식 $f(x)$에 대하여 $f(${u})=f(${v})=f(${w})=${K}$일 때, $f(x)$를 $${ft}$${ro(ft)} 나누었을 때의 나머지를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$f(${u})${plusConst(-K)}=0$, $f(${v})${plusConst(-K)}=0$, $f(${w})${plusConst(-K)}=0$이므로 $${g}$${eun(g)} $${factorTex(u)}$, $${factorTex(v)}$, $${fw}$${ro(fw)} 각각 나누어떨어진다.`,
        `이때 $f(x)$는 $x^{3}$의 계수가 $1$인 삼차식이므로 $${g}=${prodTex([u, v, w])}$`,
        `즉 $f(x)=${prodTex([u, v, w])}${plusConst(K)}$`,
        `따라서 구하는 나머지는 $f(${t})=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, u, v, w, K, t },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// 인수정리 - 이차식으로 나누는 경우
// 꼴 0 (기본·대표): 이차식으로 나누어떨어짐 → 두 계수
// 꼴 1 (응용): 나누어떨어지는 조건으로 식을 정한 뒤 다른 일차식으로 나눈 나머지

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v, w] = distinctInts(rng, -4, 4, 3, { nonzero: true }) as [
        number,
        number,
        number,
      ];
      const K = -u * v * w;
      const a = -(u + v + w);
      const b = u * v + v * w + w * u;
      if (a === 0 || b === 0) return null;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a-b", a - b],
        ["ab", a * b],
      ]);
      const D = polyTex(fromRoots([u, v]));
      const uv = prodTex([u, v]);
      const fx = `x^{3}+ax^{2}+bx${plusConst(K)}`;
      return {
        content: `다항식 $${fx}$${ga(fx)} $${D}$${ro(D)} 나누어떨어질 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$f(x)=${fx}$${ira(fx)} 하면 $f(x)$가 $${D}$, 즉 $${uv}$${ro(uv)} 나누어떨어지므로 $f(${u})=0$, $f(${v})=0$`,
          `$${linTex(
            [
              [u * u, "a"],
              [u, "b"],
            ],
            u ** 3 + K,
          )}=0$, $${linTex(
            [
              [v * v, "a"],
              [v, "b"],
            ],
            v ** 3 + K,
          )}=0$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, w, K, a, b, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v, w] = distinctInts(rng, -3, 3, 3, { nonzero: true }) as [
      number,
      number,
      number,
    ];
    const P = -(u + v + w);
    if (P === 0) return null;
    const a = u * v + v * w + w * u;
    const b = -u * v * w;
    const t = pickOne(
      rng,
      [-3, -2, -1, 0, 1, 2, 3, 4].filter((z) => z !== u && z !== v && z !== w),
    );
    const f = [b, a, P, 1];
    const ft = evalAt(f, t);
    const fx = `x^{3}${term(P, "x^{2}")}+ax+b`;
    const uv = prodTex([u, v]);
    const tf = factorTex(t);
    return {
      content: `다항식 $${fx}$${ga(fx)} $${uv}$${ro(uv)} 나누어떨어질 때, 이 다항식을 $${tf}$${ro(tf)} 나누었을 때의 나머지를 구하시오. (단, $a$, $b$는 상수이다.)`,
      answer: numAnswer(ft),
      solution: [
        `$f(x)=${fx}$${ira(fx)} 하면 $f(${u})=0$, $f(${v})=0$`,
        `$${linTex(
          [
            [u, "a"],
            [1, "b"],
          ],
          u ** 3 + P * u * u,
        )}=0$, $${linTex(
          [
            [v, "a"],
            [1, "b"],
          ],
          v ** 3 + P * v * v,
        )}=0$`,
        `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
        `즉 $f(x)=${polyTex(f)}$이므로 구하는 나머지는 $f(${t})=${ft}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, u, v, w, P, a, b, t },
    };
  });
}

// ───────────────────────────── 13 ─────────────────────────────
// 조립제법과 항등식
// 꼴 0 (기본·대표): 최고차항 계수 1 — x−s 로 거듭 나누기
// 꼴 1 (응용): 최고차항 계수가 1 이 아님

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const s = nz(rng, -3, 3);
    const A = mode === 0 ? 1 : pickOne(rng, [-1, 2, -2]);
    const b = nz(rng, -6, 6);
    const c = nz(rng, -6, 6);
    const d = nz(rng, -6, 6);
    const f = shiftedToPoly([d, c, b, A], s);
    const exprs: Expr[] =
      mode === 0
        ? [
            ["abcd", A * b * c * d],
            ["a+b+c+d", A + b + c + d],
          ]
        : [
            ["ab+cd", A * b + c * d],
            ["abcd", A * b * c * d],
          ];
    const [exprId, [et, ev]] = chooseExpr(rng, exprs);
    const lin = [-s, 1];
    const d1 = divMod(f, lin);
    const d2 = divMod(d1.q, lin);
    const fs = factorParen(s);
    const ft = factorTex(s);
    const F = polyTex(f);
    const Q1 = polyTex(d1.q);
    const Q2 = polyTex(d2.q);
    const rhs = `a${fs}^{3}+b${fs}^{2}+c${fs}+d`;
    return {
      content: `등식 $${F}=${rhs}$${ga(rhs)} $x$에 대한 항등식일 때, $${et}$의 값을 구하시오. (단, $a$, $b$, $c$, $d$는 상수이다.)`,
      answer: numAnswer(ev),
      solution: [
        `조립제법을 연속으로 이용하여 $${F}$${eul(F)} $${ft}$${ro(ft)} 거듭 나누면`,
        `$${F}=(${ft})(${Q1})${plusConst(d)}$`,
        `$${Q1}=(${ft})(${Q2})${plusConst(c)}$`,
        `$${Q2}=${coefPrefix(A)}(${ft})${plusConst(b)}$`,
        `따라서 $${F}=${coefPrefix(A)}${fs}^{3}${term(b, `${fs}^{2}`)}${term(c, fs)}${plusConst(d)}$이므로`,
        `$a=${A}$, $b=${b}$, $c=${c}$, $d=${d}$이고 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: mode === 0 ? "기본" : "응용",
      facts: { mode, s, A, b, c, d, exprId },
    };
  });
}

// ───────────────────────────── 14 ─────────────────────────────
// 수의 나눗셈에서 나머지정리의 활용
// 꼴 0 (기본·대표): Nᵉ 을 N−k 로 나눈 나머지 — x=N 으로 놓고 x−k
// 꼴 1 (심화하): N+1 로 나눈 나머지 — 음의 나머지를 고쳐 쓴다(한 거듭제곱 · 세 거듭제곱의 합)

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const N = pickOne(rng, [100, 1000]);
      const k = pickOne(rng, [2, 3]);
      const e = randInt(rng, 6, 12);
      const M = N - k;
      const kp = k ** e;
      const r = kp % M;
      const qq = Math.floor(kp / M);
      const base = `${N}^{${e}}`;
      const xe = `x^{${e}}`;
      const xk = `x-${k}`;
      const lines = [
        `$x=${N}$${ira(String(N))} 하면 $${M}=${xk}$`,
        `$${xe}$${eul(xe)} $${xk}$${ro(xk)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$라 하면`,
        `$${xe}=(${xk})Q(x)+R$ ……㉠`,
        `㉠의 양변에 $x=${k}$${eul(String(k))} 대입하면 $R=${k}^{${e}}=${kp}$`,
        `㉠의 양변에 $x=${N}$${eul(String(N))} 대입하면 $${base}=${M}Q(${N})+${kp}$`,
      ];
      if (qq > 0) lines.push(`$=${M}\\{Q(${N})+${qq}\\}+${r}$`);
      lines.push(
        `따라서 $${base}$${eul(base)} $${M}$${ro(String(M))} 나누었을 때의 나머지는 $${r}$이다.`,
      );
      return {
        content: `$${base}$${eul(base)} $${M}$${ro(String(M))} 나누었을 때의 나머지를 구하시오.`,
        answer: numAnswer(r),
        solution: lines.join("\n"),
        difficulty: "기본",
        facts: { mode, variant: 0, N, k, e, M },
      };
    });
  return attempt<Body>((): Body | null => {
    const variant = randInt(rng, 0, 1);
    if (variant === 0) {
      const N = randInt(rng, 20, 98);
      const e = randInt(rng, 5, 15);
      const M = N + 1;
      const pm = e % 2 === 0 ? 1 : -1;
      const ans = pm === 1 ? 1 : N;
      const base = `${N}^{${e}}`;
      const xe = `x^{${e}}`;
      return {
        content: `$${base}$${eul(base)} $${M}$${ro(String(M))} 나누었을 때의 나머지를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$x=${N}$${ira(String(N))} 하면 $${M}=x+1$`,
          `$${xe}$${eul(xe)} $x+1$로 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$라 하면`,
          `$${xe}=(x+1)Q(x)+R$ ……㉠`,
          `㉠의 양변에 $x=-1$을 대입하면 $R=(-1)^{${e}}=${pm}$`,
          `㉠의 양변에 $x=${N}$${eul(String(N))} 대입하면 $${base}=${M}Q(${N})${plusConst(pm)}$`,
          ...(pm === -1 ? [`$=${M}\\{Q(${N})-1\\}+${N}$`] : []),
          `따라서 구하는 나머지는 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, variant, N, e, M },
      };
    }
    const b = randInt(rng, 2, 9);
    const e = randInt(rng, 50, 120);
    const M = b + 1;
    const pm = e % 2 === 0 ? 1 : -1;
    const ans = pm === 1 ? 1 : b;
    const expr = `${b}^{${e}}+${b}^{${e + 1}}+${b}^{${e + 2}}`;
    const xexpr = `x^{${e}}+x^{${e + 1}}+x^{${e + 2}}`;
    return {
      content: `$${expr}$${eul(expr)} $${M}$${ro(String(M))} 나누었을 때의 나머지를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$x=${b}$${ira(String(b))} 하면 $${M}=x+1$`,
        `$${xexpr}$${eul(xexpr)} $x+1$로 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$라 하면`,
        `$${xexpr}=(x+1)Q(x)+R$ ……㉠`,
        `㉠의 양변에 $x=-1$을 대입하면 $R=(-1)^{${e}}+(-1)^{${e + 1}}+(-1)^{${e + 2}}=${pm}$`,
        `㉠의 양변에 $x=${b}$${eul(String(b))} 대입하면 $${expr}=${M}Q(${b})${plusConst(pm)}$`,
        ...(pm === -1 ? [`$=${M}\\{Q(${b})-1\\}+${b}$`] : []),
        `따라서 구하는 나머지는 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, variant, b, e, M },
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
export const H1_IDENTITY: HighTypeEntry[] = [
  entry("01", "항등식에서 미정계수 구하기 - 계수 비교법", SEC.항등식, t01),
  entry("02", "항등식에서 미정계수 구하기 - 수치 대입법", SEC.항등식, t02),
  entry("03", "조건을 만족시키는 항등식", SEC.항등식, t03),
  entry("04", "항등식에서 계수의 합 구하기", SEC.항등식, t04),
  entry("05", "다항식의 나눗셈과 항등식", SEC.나눗셈항등식, t05),
  entry("06", "일차식으로 나누었을 때의 나머지", SEC.나머지, t06),
  entry("07", "이차식으로 나누었을 때의 나머지", SEC.나머지, t07),
  entry("08", "삼차식으로 나누었을 때의 나머지", SEC.나머지, t08),
  entry("09", "f(ax+b)를 x-alpha로 나누는 경우", SEC.나머지, t09),
  entry("10", "몫을 x-alpha로 나누는 경우", SEC.나머지, t10),
  entry("11", "인수정리 - 일차식으로 나누는 경우", SEC.인수, t11),
  entry("12", "인수정리 - 이차식으로 나누는 경우", SEC.인수, t12),
  entry("13", "조립제법과 항등식", SEC.나눗셈항등식, t13),
  entry("14", "수의 나눗셈에서 나머지정리의 활용", SEC.나머지, t14),
];
