/**
 * 공통수학1 「이차부등식과 연립이차부등식」 21유형 — **독립 검산** (물결 1 세션 `h1-ineq`).
 *
 * facts 는 발문 이차식의 **계수**다. 시험은 그 계수로 이차식을 다시 세워
 *
 *   ⑴ `SHOWN` — 지면의 부등식을 직접 읽어(`helpers/highIneq.parseChain`, 정확한 유리수) 같은 부등식인지
 *   ⑵ `VERIFY` — 정수를 하나하나 대입하거나(`intsWhere`) 부호표를 따로 그려(`chartSolve`, 임계점은
 *      시험 쪽 `ratRoots`) 답을 다시 내는지
 *
 * 본다. 제품의 풀이 경로(`quadSol`·`factoredTex`·`h1LinIneq` 구간 셈)를 안 부른다.
 * 지면 · 난이도 · 형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_QUAD_INEQ, H1_QUAD_INEQ_HOLD } from "../../lib/high/h1QuadIneq";
import type { HighProblem } from "../../lib/high/types";
import {
  and,
  chartSolve,
  checkAnswer,
  checkDistractors,
  checkShown,
  type Expect,
  type F,
  type Fact,
  fAbs,
  fAdd,
  fDiv,
  fMul,
  fNum,
  fr,
  fSub,
  intsWhere,
  num,
  only,
  type Pred,
  ratRoots,
  relHolds,
  relOf,
  type ShownSpec,
  type TIv,
  tivHas,
} from "../helpers/highIneq";
import { highCatalog } from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "이차부등식과 연립이차부등식";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

/** `ax²+bx+c` 의 값 */
function qv(a: number, b: number, c: number): (x: F) => F {
  const [A, B, C] = [fr(a), fr(b), fr(c)];
  return (x) => fAdd(fAdd(fMul(A, fMul(x, x)), fMul(B, x)), C);
}

/** `ax²+bx+c rel 0` */
function qPred(a: number, b: number, c: number, code: number): Pred {
  const f = qv(a, b, c);
  const r = relOf(code);
  return (x) => relHolds(r, f(x), fr(0));
}

/** 유리근(없으면 빈 배열) — 부호표의 임계점 */
const roots = (a: number, b: number, c: number): F[] => ratRoots(a, b, c) ?? [];

const sum = (ns: readonly number[]): number => ns.reduce((s, n) => s + n, 0);

/** 해의 모양에서 |x−p| rel q 의 p, q 를 **다시** 읽는다 — 한 구간이면 가운데와 반지름, 두 반직선이면 그 틈. */
function centerRadius(sol: readonly TIv[]): [F, F] {
  const [lo, hi] =
    sol.length === 1 ? [sol[0]!.lo!, sol[0]!.hi!] : [sol[0]!.hi!, sol[1]!.lo!];
  return [fDiv(fAdd(lo, hi), fr(2)), fDiv(fSub(hi, lo), fr(2))];
}

const VERIFY: Record<string, (f: Fact) => Expect> = {
  "02": (f) => {
    if (f.mode === 0) {
      const ints = intsWhere(
        qPred(num(f, "a"), num(f, "b"), num(f, "c"), num(f, "r")),
      );
      expect(ints.length, "해가 양쪽으로 막혀 있어야 한다").toBeLessThan(50);
      return f.kind === 0 ? ints.length : sum(ints);
    }
    if (f.mode === 1) {
      // 두 근을 근의 공식으로 **따로** 구해 뺀다(제품의 근호 정리를 안 거친다)
      const b = num(f, "b");
      const c = num(f, "c");
      const D = b * b - 4 * c;
      return (-b + Math.sqrt(D)) / 2 - (-b - Math.sqrt(D)) / 2;
    }
    const [A, B, C] = [num(f, "A"), num(f, "B"), num(f, "C")];
    const sol = chartSolve(qPred(A, B, C, num(f, "r")), roots(A, B, C));
    const [p, q] = centerRadius(sol);
    return [fNum(fAdd(p, q)), fNum(fMul(p, q))][num(f, "exprId")]!;
  },

  "03": (f) => {
    const r = relOf(num(f, "r"));
    if (f.mode === 0) {
      const g = qv(1, num(f, "b"), num(f, "c"));
      const p = fr(num(f, "p"));
      const q = fr(num(f, "q"));
      return intsWhere((x) => relHolds(r, g(x), fAbs(fAdd(fMul(p, x), q))))
        .length;
    }
    if (f.mode === 1) {
      const p = num(f, "p");
      const q = num(f, "q");
      const pred: Pred = (x) =>
        relHolds(r, fAdd(fAdd(fMul(x, x), fMul(fr(p), fAbs(x))), fr(q)), fr(0));
      const crit = [fr(0), ...roots(1, p, q), ...roots(1, -p, q)];
      return { v: "x", exact: only(chartSolve(pred, crit), "해는 한 구간") };
    }
    const b = num(f, "b");
    const c = fr(num(f, "c"));
    const g = qv(1, b, num(f, "d"));
    const ints = intsWhere((x) => relHolds(r, fAbs(g(x)), c));
    return f.kind === 0 ? ints.length : sum(ints);
  },

  "04": (f) => {
    if (f.mode === 0) {
      const a = num(f, "a");
      const b = num(f, "b");
      return [a + b, a * b, a - b][num(f, "exprId")]!;
    }
    if (f.mode === 1) {
      const a = num(f, "a");
      const b = num(f, "b");
      const B2 = num(f, "s") * a;
      const C2 = num(f, "t") * b;
      const sol = chartSolve(qPred(1, B2, C2, num(f, "r2")), roots(1, B2, C2));
      return { v: "x", exact: only(sol, "둘째 부등식의 해는 한 구간") };
    }
    // a<0 인 한 벌(k=1)로 세운다 — 답은 k 에 기대지 않는다
    const [p1, p2] = [num(f, "p1"), num(f, "p2")];
    const [a, b, c] = [-p1 * p2, p1 + p2, -1];
    const first = only(
      chartSolve(qPred(a, b, c, 1), roots(a, b, c)),
      "첫 부등식의 해는 한 구간",
    );
    expect(fNum(first.lo!), "첫 해의 왼쪽 끝 1/p2").toBeCloseTo(1 / p2, 12);
    expect(fNum(first.hi!), "첫 해의 오른쪽 끝 1/p1").toBeCloseTo(1 / p1, 12);
    return sum(intsWhere(qPred(c, b, a, 1)));
  },
};

const SHOWN: Record<string, (f: Fact) => ShownSpec> = {
  "02": (f) => {
    if (f.mode === 0) {
      const [a, b, c] = [num(f, "a"), num(f, "b"), num(f, "c")];
      return {
        env: {},
        wants: [
          {
            what: "이차부등식",
            pred: qPred(a, b, c, num(f, "r")),
            crit: roots(a, b, c),
          },
        ],
      };
    }
    if (f.mode === 1) {
      return {
        env: {},
        wants: [
          {
            what: "이차부등식",
            pred: qPred(1, num(f, "b"), num(f, "c"), num(f, "r")),
            crit: [],
          },
        ],
      };
    }
    const [A, B, C] = [num(f, "A"), num(f, "B"), num(f, "C")];
    const pred = qPred(A, B, C, num(f, "r"));
    const crit = roots(A, B, C);
    const [p, q] = centerRadius(chartSolve(pred, crit));
    return {
      env: { p, q },
      wants: [
        { what: "이차부등식", pred, crit, mustContain: "x^{2}" },
        { what: "|x−p| rel q", pred, crit, mustContain: "|" },
      ],
    };
  },
  "03": (f) => {
    const r = relOf(num(f, "r"));
    if (f.mode === 0) {
      const [b, c, p, q] = [num(f, "b"), num(f, "c"), num(f, "p"), num(f, "q")];
      const g = qv(1, b, c);
      const pred: Pred = (x) =>
        relHolds(r, g(x), fAbs(fAdd(fMul(fr(p), x), fr(q))));
      return {
        env: {},
        wants: [
          {
            what: "절댓값 이차부등식",
            pred,
            crit: [
              fr(-q, p),
              ...roots(1, b - p, c - q),
              ...roots(1, b + p, c + q),
            ],
          },
        ],
      };
    }
    if (f.mode === 1) {
      const [p, q] = [num(f, "p"), num(f, "q")];
      const pred: Pred = (x) =>
        relHolds(r, fAdd(fAdd(fMul(x, x), fMul(fr(p), fAbs(x))), fr(q)), fr(0));
      return {
        env: {},
        wants: [
          {
            what: "x²+p|x|+q",
            pred,
            crit: [fr(0), ...roots(1, p, q), ...roots(1, -p, q)],
          },
        ],
      };
    }
    const [b, c] = [num(f, "b"), num(f, "c")];
    const g = qv(1, b, num(f, "d"));
    return {
      env: {},
      wants: [
        {
          what: "|x²+bx| rel c",
          pred: (x) => relHolds(r, fAbs(g(x)), fr(c)),
          crit: [
            ...roots(1, b, num(f, "d") - c),
            ...roots(1, b, num(f, "d") + c),
          ],
        },
      ],
    };
  },
  "04": (f) => {
    if (f.mode === 0) {
      const [a, b] = [num(f, "a"), num(f, "b")];
      const pred = qPred(1, a, b, num(f, "r"));
      const crit = roots(1, a, b);
      const sol = chartSolve(pred, crit);
      return {
        env: { a: fr(a), b: fr(b) },
        wants: [
          { what: "x²+ax+b", pred, crit, mustContain: "a" },
          ...sol.map((s, i) => ({
            what: `주어진 해 ${i + 1}`,
            pred: sol.length === 1 ? pred : (x: F) => tivHas(s, x),
            crit,
          })),
        ],
      };
    }
    if (f.mode === 1) {
      const [a, b, c0] = [num(f, "a"), num(f, "b"), num(f, "c0")];
      const pred1 = qPred(a, b, c0, num(f, "r1"));
      const crit1 = roots(a, b, c0);
      const sol1 = chartSolve(pred1, crit1);
      const B2 = num(f, "s") * a;
      const C2 = num(f, "t") * b;
      return {
        env: { a: fr(a), b: fr(b) },
        wants: [
          {
            what: "첫 이차부등식",
            pred: pred1,
            crit: crit1,
            mustContain: "ax^{2}",
          },
          ...sol1.map((s, i) => ({
            what: `주어진 해 ${i + 1}`,
            pred: (x: F) => tivHas(s, x),
            crit: crit1,
          })),
          {
            what: "둘째 이차부등식",
            pred: qPred(1, B2, C2, num(f, "r2")),
            crit: roots(1, B2, C2),
          },
        ],
      };
    }
    const [p1, p2] = [num(f, "p1"), num(f, "p2")];
    const [a, b, c] = [-p1 * p2, p1 + p2, -1];
    return {
      env: {},
      wants: [
        {
          what: "주어진 해 1/p2<x<1/p1",
          pred: qPred(a, b, c, 1),
          crit: roots(a, b, c),
          mustContain: "dfrac",
        },
      ],
    };
  },
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
): void {
  for (const entry of H1_QUAD_INEQ) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 등록", () => {
  it("색인 21유형을 등록 ∪ 보류로 덮고, 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(21);
    const numbers = [
      ...H1_QUAD_INEQ.map((e) => e.rpmType),
      ...H1_QUAD_INEQ_HOLD.map((h) => h.key.split("|")[2]!),
    ];
    expect(numbers.sort()).toEqual(catalogRows.map((r) => r.number).sort());
    for (const e of H1_QUAD_INEQ) {
      const row = catalogRows.find((r) => r.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없다`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(row!.title);
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
    for (const e of H1_QUAD_INEQ) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부·보류 목록에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_QUAD_INEQ) expect(keys.has(e.key), e.key).toBe(true);
    const holds = new Set(registeredHighHolds().map((h) => h.key));
    for (const h of H1_QUAD_INEQ_HOLD)
      expect(holds.has(h.key), h.key).toBe(true);
  });

  it("그래프가 있어야 하는 01 은 보류이고, 까닭이 물결 2 를 가리킨다", () => {
    const h = H1_QUAD_INEQ_HOLD.find((x) => x.key.endsWith("|01"));
    expect(h, "01 보류").toBeDefined();
    expect(h!.reason).toMatch(/funcGraph/);
  });
});

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 값", () => {
  it("정답을 facts 로 다시 세운 것과 같다", () => {
    eachProblem((p, key, number) => {
      const verify = VERIFY[number];
      expect(verify, `${number}: 검산식이 없다`).toBeDefined();
      checkAnswer(
        p.answer,
        verify!(p.facts),
        `${key} ${JSON.stringify(p.facts)} — ${p.answer}`,
      );
    });
  });

  it("발문이 facts 의 부등식을 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const spec = SHOWN[number];
      expect(spec, `${number}: 지면 대조가 없다`).toBeDefined();
      checked += checkShown(p.content, spec!(p.facts), key);
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(200);
  });
});

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 오답", () => {
  it("생성기가 낸 오답 넷은 모두 읽히고, 정답과 다르다", () => {
    let seen = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      seen += 1;
      checkDistractors(p.answer, p.distractors, key);
    });
    expect(
      seen,
      "오답을 내는 꼴이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(0);
  });
});
