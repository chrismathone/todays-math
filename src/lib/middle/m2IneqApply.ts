/**
 * 중2 「일차부등식」 응용 5유형(10~14) + 「일차부등식의 활용」 14유형 전량.
 *
 * 우리 DB 실측(2026-08-23): 일차부등식의 응용 0건 · 활용(수, 평균, 정가) 0건 ·
 * 활용(속력, 도형, 기타) 0건 · 활용(농도) 0건. RPM 2-1 색인이 유형 정본이다
 * (`scripts/rpm/rpm-type-catalog.json`).
 *
 * 일차부등식 01~09(뜻·성질·풀이)는 보유가 넉넉한 단원(부등식 45건 ·
 * 일차부등식의 풀이 143건)이라 이번 스코프에서 제외 — 필요해지면 같은 틀로 추가한다.
 * 그림이 필요해 보류한 유형은 없다(08 도형은 치수 명시형이라 텍스트로 성립).
 *
 * 생성 규칙은 m1LinearApply 와 같다 — **정답을 먼저 뽑고 발문을 역산한다.**
 * `facts` 에 발문의 원 수치를 남기고, 테스트가 조건식을 독립 재계산한다.
 * 숫자는 전부 `$...$` 안에 쓴다 (elementary rules.bareNumbers 가드).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";
const MINOR_INEQ = "일차부등식";
const MINOR_APPLY = "일차부등식의 활용";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  응용: "일차부등식의 응용",
  수평균정가: "일차부등식의 활용(수, 평균, 정가)",
  개수예금: "일차부등식의 활용(개수, 예금액, 유리한 방법)",
  속력도형: "일차부등식의 활용(속력, 도형, 기타)",
  농도: "일차부등식의 활용(농도)",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts">;

function def(
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M2_INEQ_APPLY: TypeEntry[] = [
  // ── 일차부등식 (응용: 해의 조건·미지수) ──────────────
  def(
    MINOR_INEQ,
    "10",
    "의 계수가 문자인 일차부등식의 풀이",
    SEC.응용,
    "응용",
    (rng) => {
      const c = intBetween(rng, 2, 9);
      const gt = pick(rng, [1, 0] as const); // 1: ax-ca>0 (해 x<c) · 0: ax-ca<0 (해 x>c)
      const rel = gt === 1 ? ">" : "<";
      const ansRel = gt === 1 ? "<" : ">";
      return {
        content: `$a<0$일 때, $x$에 대한 일차부등식 $ax-${c}a${rel}0$ 의 해를 구하시오.`,
        answer: `$x${ansRel}${c}$`,
        solution: `$ax-${c}a${rel}0$에서 $ax${rel}${c}a$이다.\n$a<0$이므로 양변을 $a$로 나누면 부등호의 방향이 바뀌어 $x${ansRel}${c}$이다.`,
        facts: { c, gt },
      };
    },
  ),

  def(
    MINOR_INEQ,
    "11",
    "부등식의 해가 주어진 경우 미지수의 값 구하기 ⑴",
    SEC.응용,
    "기본",
    (rng) =>
      attempt(80, () => {
        const m = intBetween(rng, 2, 5);
        const s = intBetween(rng, 1, 8);
        const b = intBetween(rng, 1, 9);
        const a = m * s - b;
        if (a < 1) return null;
        return {
          content: `$x$에 대한 일차부등식 $${m}x-a\\le${b}$ 의 해가 $x\\le${s}$ 일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$${m}x-a\\le${b}$에서 $${m}x\\le a+${b}$, $x\\le\\dfrac{a+${b}}{${m}}$이다.\n해가 $x\\le${s}$이므로 $\\dfrac{a+${b}}{${m}}=${s}$, $a+${b}=${m * s}$이다.\n따라서 $a=${a}$이다.`,
          facts: { m, b, s, a },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "12",
    "해가 서로 같은 두 일차부등식",
    SEC.응용,
    "응용",
    (rng) =>
      attempt(80, () => {
        const s = intBetween(rng, 2, 9);
        const b1 = intBetween(rng, 1, 9);
        const b2 = s + b1;
        const c = intBetween(rng, 1, 9);
        const a = 2 * s - c;
        if (a < 1) return null;
        return {
          content: `두 일차부등식 $2x+${b1}<x+${b2}$ ${waGwa(b2)} $3x-a<x+${c}$ 의 해가 서로 같을 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$2x+${b1}<x+${b2}$${eulReul(b2)} 풀면 $x<${s}$이다.\n$3x-a<x+${c}$${eulReul(c)} 풀면 $2x<a+${c}$, $x<\\dfrac{a+${c}}{2}$이다.\n두 부등식의 해가 서로 같으므로 $\\dfrac{a+${c}}{2}=${s}$에서 $a=${a}$이다.`,
          facts: { b1, b2, c, a, s },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "13",
    "부등식의 해가 주어진 경우 미지수의 값 구하기⑵",
    SEC.응용,
    "응용",
    (rng) =>
      attempt(50, () => {
        const a = -intBetween(rng, 1, 6);
        const c = pick(rng, [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6] as const);
        const b = a * c;
        return {
          content: `$x$에 대한 부등식 $ax>${b}$ 의 해가 $x<${c}$ 일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `해가 $x<${c}$ 로 부등호의 방향이 바뀌었으므로 $a<0$이다.\n$ax>${b}$의 양변을 $a$로 나누면 $x<\\dfrac{${b}}{a}$이므로 $\\dfrac{${b}}{a}=${c}$이다.\n따라서 $a=${a}$이다.`,
          facts: { a, b, c },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "14",
    "부등식의 해의 조건이 주어진 경우",
    SEC.응용,
    "심화",
    (rng) => {
      const d = intBetween(rng, 1, 6);
      const n = intBetween(rng, 3, 8);
      const lo = n - d;
      return {
        content: `$x$에 대한 부등식 $x-a\\le${d}$ ${eulReul(d)} 만족시키는 자연수 $x$가 $${n}$개일 때, 상수 $a$의 값의 범위를 구하시오.`,
        answer: `$${lo}\\le a<${lo + 1}$`,
        solution: `$x-a\\le${d}$에서 $x\\le a+${d}$이다.\n이를 만족시키는 자연수 $x$가 $${n}$개이려면 $${n}\\le a+${d}<${n + 1}$이어야 한다.\n따라서 $${lo}\\le a<${lo + 1}$이다.`,
        facts: { d, n, lo },
      };
    },
  ),

  // ── 일차부등식의 활용 (수, 평균, 정가) ───────────────
  def(MINOR_APPLY, "01", "수에 대한 문제", SEC.수평균정가, "기본", (rng) => {
    const b = intBetween(rng, 1, 9);
    const c = intBetween(rng, 1, 9);
    const m = b + c + 1;
    return {
      content: `어떤 자연수의 $2$배에서 $${b}$${eulReul(b)} 뺀 수는 그 자연수에 $${c}$${eulReul(c)} 더한 수보다 크다고 한다. 이러한 자연수 중 가장 작은 수를 구하시오.`,
      answer: `$${m}$`,
      solution: `어떤 자연수를 $x$라 하면 $2x-${b}>x+${c}$이다.\n정리하면 $x>${b + c}$이므로 가장 작은 자연수는 $${m}$이다.`,
      facts: { b, c, m },
    };
  }),

  def(MINOR_APPLY, "03", "평균에 대한 문제", SEC.수평균정가, "기본", (rng) =>
    attempt(200, () => {
      const m = intBetween(rng, 80, 90);
      const x0 = intBetween(rng, m + 2, 100);
      const s3 = 4 * m - x0;
      const a = intBetween(rng, 75, 95);
      const b = intBetween(rng, 75, 95);
      const c = s3 - a - b;
      if (c < 60 || c > 100) return null;
      return {
        content: `세 번의 수학 시험에서 $${a}$점, $${b}$점, $${c}$점을 받았다. 네 번째 시험까지의 평균이 $${m}$점 이상이 되려면 네 번째 시험에서 최소 몇 점을 받아야 하는지 구하시오.`,
        answer: `$${x0}$점`,
        solution: `네 번째 시험 점수를 $x$점이라 하면 $\\dfrac{${a}+${b}+${c}+x}{4}\\ge${m}$이다.\n$${s3}+x\\ge${4 * m}$이므로 $x\\ge${x0}$이다.\n따라서 최소 $${x0}$점을 받아야 한다.`,
        facts: { a, b, c, m, x0 },
      };
    }),
  ),

  def(
    MINOR_APPLY,
    "09",
    "원가 정가에 대한 문제",
    SEC.수평균정가,
    "심화",
    (rng) => {
      const m = pick(rng, [20, 25, 30, 40] as const);
      const k = pick(rng, [5, 10, 15] as const);
      const j = intBetween(rng, 2, 20);
      const c0 = 1000 * j;
      const D = (c0 * (m - k)) / 100;
      return {
        content: `원가에 $${m}\\%$의 이익을 붙여 정가를 정한 상품이 있다. 이 상품을 정가에서 $${D}$원 할인하여 팔아도 원가의 $${k}\\%$ 이상의 이익을 얻으려면 원가는 몇 원 이상이어야 하는지 구하시오.`,
        answer: `$${c0}$원`,
        solution: `원가를 $x$원이라 하면 이익이 원가의 $${k}\\%$ 이상이어야 하므로 $\\dfrac{${m}}{100}x-${D}\\ge\\dfrac{${k}}{100}x$이다.\n양변에 $100$을 곱하면 $${m}x-${100 * D}\\ge${k}x$, $${m - k}x\\ge${100 * D}$이다.\n따라서 $x\\ge${c0}$이므로 원가는 $${c0}$원 이상이어야 한다.`,
        facts: { m, k, D, c0 },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "29",
    "연속하는 두 자연수에 대한 문제",
    SEC.수평균정가,
    "기본",
    (rng) => {
      const n = intBetween(rng, 4, 20);
      const limit = 2 * n + 1;
      return {
        content: `연속하는 두 자연수의 합이 $${limit}$ 이상일 때, 작은 수의 최솟값을 계산하시오.`,
        answer: `$${n}$`,
        solution: `작은 수를 $x$라 하면 큰 수는 $x+1$이므로 $x+(x+1)\\ge${limit}$이다. $2x+1\\ge${limit}$에서 $x\\ge${n}$이므로 최솟값은 $${n}$이다.`,
        facts: { n, limit },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "30",
    "어떤 수의 배에 대한 문제",
    SEC.수평균정가,
    "기본",
    (rng) => {
      const a = intBetween(rng, 3, 7);
      const b = intBetween(rng, 1, 9);
      const n = intBetween(rng, 3, 15);
      const limit = a * n - b;
      return {
        content: `어떤 자연수의 $${a}$배에서 $${b}$를 뺀 수가 $${limit}$ 이상일 때, 이러한 자연수의 최솟값을 계산하시오.`,
        answer: `$${n}$`,
        solution: `어떤 자연수를 $x$라 하면 $${a}x-${b}\\ge${limit}$이다. 풀면 $x\\ge${n}$이므로 가장 작은 자연수는 $${n}$이다.`,
        facts: { a, b, n, limit },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "31",
    "여러 번의 평균 점수",
    SEC.수평균정가,
    "응용",
    (rng) => {
      const count = intBetween(rng, 3, 5);
      const target = intBetween(rng, 75, 88);
      const score = intBetween(rng, target, 100);
      const previous = target * (count + 1) - score;
      return {
        content: `$${count}$번 시험의 점수 합이 $${previous}$점이다. 다음 시험까지의 평균이 $${target}$점 이상이 되려면 다음 시험에서 최소 몇 점을 받아야 하는지 구하시오.`,
        answer: `$${score}$점`,
        solution: `다음 시험 점수를 $x$점이라 하면 $\\dfrac{${previous}+x}{${count + 1}}\\ge${target}$이다. 풀면 $x\\ge${score}$이므로 최소 $${score}$점을 받아야 한다.`,
        facts: { count, target, score, previous },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "32",
    "평균을 넘지 않는 점수",
    SEC.수평균정가,
    "응용",
    (rng) => {
      const count = intBetween(rng, 3, 5);
      const target = intBetween(rng, 70, 85);
      const score = intBetween(rng, 55, target);
      const previous = target * (count + 1) - score;
      return {
        content: `$${count}$과목의 점수 합이 $${previous}$점이다. 전체 $${count + 1}$과목의 평균이 $${target}$점 이하가 되게 하려면 마지막 과목의 점수는 최대 몇 점이어야 하는지 구하시오.`,
        answer: `$${score}$점`,
        solution: `마지막 과목의 점수를 $x$점이라 하면 $\\dfrac{${previous}+x}{${count + 1}}\\le${target}$이다. 풀면 $x\\le${score}$이므로 최대 $${score}$점이다.`,
        facts: { count, target, score, previous },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "33",
    "정가에서 할인하여 파는 문제",
    SEC.수평균정가,
    "응용",
    (rng) => {
      const cost = 1000 * intBetween(rng, 5, 20);
      const profit = pick(rng, [10, 20, 25] as const);
      const price = (cost * (100 + profit)) / 100;
      const discount = price - cost;
      return {
        content: `원가가 $${cost}$원인 상품을 $${price}$원에 팔려고 한다. 원가 이상의 판매 금액을 유지하려면 최대 몇 원까지 할인할 수 있는지 계산하시오.`,
        answer: `$${discount}$원`,
        solution: `할인 금액을 $x$원이라 하면 $${price}-x\\ge${cost}$이다. 풀면 $x\\le${discount}$이므로 최대 $${discount}$원까지 할인할 수 있다.`,
        facts: { cost, profit, price, discount },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "34",
    "목표 이익을 얻는 판매 가격",
    SEC.수평균정가,
    "기본",
    (rng) => {
      const cost = 1000 * intBetween(rng, 4, 18);
      const profit = pick(rng, [10, 20, 25, 50] as const);
      const price = (cost * (100 + profit)) / 100;
      return {
        content: `원가가 $${cost}$원인 상품을 팔아 원가의 $${profit}\\%$ 이상의 이익을 얻으려고 한다. 판매 가격은 최소 몇 원이어야 하는지 계산하시오.`,
        answer: `$${price}$원`,
        solution: `판매 가격을 $x$원이라 하면 $x-${cost}\\ge\\dfrac{${profit}}{100}\\times${cost}$이다. 따라서 $x\\ge${price}$이므로 최소 $${price}$원에 팔아야 한다.`,
        facts: { cost, profit, price },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "35",
    "할인 판매와 목표 이익",
    SEC.수평균정가,
    "심화",
    (rng) => {
      const cost = 1000 * intBetween(rng, 5, 16);
      const profit = pick(rng, [10, 20, 25] as const);
      const discount = 500 * intBetween(rng, 2, 8);
      const price = (cost * (100 + profit)) / 100 + discount;
      return {
        content: `어떤 상품을 정가에서 $${discount}$원 할인하여 팔아도 원가의 $${profit}\\%$ 이상 이익을 얻으려고 한다. 원가가 $${cost}$원일 때 정가는 최소 몇 원이어야 하는지 구하시오.`,
        answer: `$${price}$원`,
        solution: `정가를 $x$원이라 하면 $x-${discount}-${cost}\\ge\\dfrac{${profit}}{100}\\times${cost}$이다. 풀면 $x\\ge${price}$이므로 정가는 최소 $${price}$원이어야 한다.`,
        facts: { cost, profit, discount, price },
      };
    },
  ),

  // ── 일차부등식의 활용 (개수, 예금액, 유리한 방법) ────
  def(MINOR_APPLY, "02", "예금액에 대한 문제", SEC.개수예금, "응용", (rng) => {
    const q = pick(rng, [1000, 1500, 2000, 2500] as const);
    const dp = pick(rng, [500, 1000, 1500] as const);
    const p = q + dp;
    const n0 = intBetween(rng, 3, 12);
    const r = 500 * intBetween(rng, 1, dp / 500);
    const diff = dp * n0 - r;
    const a0 = 5000 * intBetween(rng, 2, 6);
    const b0 = a0 + diff;
    return {
      content: `현재 형의 예금액은 $${a0}$원, 동생의 예금액은 $${b0}$원이다. 다음 달부터 매달 형은 $${p}$원씩, 동생은 $${q}$원씩 예금한다면 형의 예금액이 동생의 예금액보다 많아지는 것은 몇 개월 후부터인지 구하시오.`,
      answer: `$${n0}$개월 후`,
      solution: `$x$개월 후부터 많아진다고 하면 $${a0}+${p}x>${b0}+${q}x$이다.\n정리하면 $${dp}x>${diff}$이므로 $x>\\dfrac{${diff}}{${dp}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n0}$이므로 $${n0}$개월 후부터이다.`,
      facts: { a0, b0, p, q, n0 },
    };
  }),

  def(
    MINOR_APPLY,
    "04",
    "최대 개수에 대한 문제",
    SEC.개수예금,
    "기본",
    (rng) => {
      const p = pick(rng, [800, 1000, 1200, 1500] as const);
      const f = pick(rng, [2000, 2500, 3000] as const);
      const n = intBetween(rng, 5, 15);
      const r = 100 * intBetween(rng, 0, p / 100 - 1);
      const T = p * n + f + r;
      return {
        content: `한 개에 $${p}$원인 사과를 $${f}$원짜리 상자에 담아 사려고 한다. 전체 금액이 $${T}$원 이하가 되게 하려면 사과는 최대 몇 개까지 살 수 있는지 구하시오.`,
        answer: `$${n}$개`,
        solution: `사과를 $x$개 산다고 하면 $${p}x+${f}\\le${T}$이다.\n$${p}x\\le${T - f}$이므로 $x\\le\\dfrac{${T - f}}{${p}}$이다.\n이를 만족시키는 자연수 $x$의 최댓값은 $${n}$이므로 최대 $${n}$개까지 살 수 있다.`,
        facts: { p, f, T, n },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "05",
    "추가 요금에 대한 문제",
    SEC.개수예금,
    "응용",
    (rng) => {
      const base = pick(rng, [30, 60] as const);
      const F = pick(rng, [2000, 3000] as const);
      const p = pick(rng, [50, 100] as const);
      const k = intBetween(rng, 10, 60);
      const n = base + k;
      const T = F + p * k;
      return {
        content: `어느 주차장은 처음 $${base}$분까지 요금이 $${F}$원이고, $${base}$분을 초과하면 $1$분마다 $${p}$원씩 요금이 추가된다. 주차 요금이 $${T}$원 이하가 되게 하려면 최대 몇 분 동안 주차할 수 있는지 구하시오.`,
        answer: `$${n}$분`,
        solution: `주차 시간을 $x$분($x>${base}$)이라 하면 $${F}+${p}(x-${base})\\le${T}$이다.\n$${p}(x-${base})\\le${T - F}$, $x-${base}\\le${k}$이므로 $x\\le${n}$이다.\n따라서 최대 $${n}$분 동안 주차할 수 있다.`,
        facts: { base, F, p, T, n },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "06",
    "유리한 방법을 선택하는 문제⑴",
    SEC.개수예금,
    "응용",
    (rng) => {
      const b = pick(rng, [700, 800, 1000, 1200] as const);
      const d = pick(rng, [200, 300, 500] as const);
      const a = b + d;
      const n = intBetween(rng, 4, 15);
      const r = 100 * intBetween(rng, 1, d / 100 - 1);
      const D = d * (n - 1) + r;
      return {
        content: `집 앞 문구점에서 한 권에 $${a}$원인 공책이 인터넷 쇼핑몰에서는 한 권에 $${b}$원이다. 인터넷 쇼핑몰에서 사면 배송료가 $${D}$원일 때, 공책을 몇 권 이상 사야 인터넷 쇼핑몰에서 사는 것이 유리한지 구하시오.`,
        answer: `$${n}$권 이상`,
        solution: `공책을 $x$권 산다고 하면 $${a}x>${b}x+${D}$이어야 한다.\n$${d}x>${D}$이므로 $x>\\dfrac{${D}}{${d}}$이다.\n따라서 $${n}$권 이상 사야 인터넷 쇼핑몰에서 사는 것이 유리하다.`,
        facts: { a, b, D, n },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "07",
    "유리한 방법을 선택하는 문제⑵",
    SEC.개수예금,
    "심화",
    (rng) =>
      attempt(80, () => {
        const p = pick(rng, [5000, 8000, 10000, 12000] as const);
        const dc = pick(rng, [10, 20, 25, 30] as const);
        const t = pick(rng, [20, 30, 40, 50] as const);
        const q = (p * (100 - dc)) / 100;
        const n = Math.floor((q * t) / p) + 1;
        if (n >= t || n < 2) return null;
        return {
          content: `어느 미술관의 입장료는 한 사람당 $${p}$원이고, $${t}$명 이상의 단체는 입장료의 $${dc}\\%$를 할인해 준다. $${t}$명 미만의 단체는 몇 명 이상일 때 $${t}$명의 단체 입장권을 사는 것이 유리한지 구하시오.`,
          answer: `$${n}$명 이상`,
          solution: `$x$명이 입장할 때 $${t}$명의 단체 입장권을 사는 것이 유리하려면 $${p}x>${q}\\times${t}$이어야 한다.\n$${p}x>${q * t}$이므로 $x>\\dfrac{${q * t}}{${p}}$이다.\n따라서 $${n}$명 이상일 때 단체 입장권을 사는 것이 유리하다.`,
          facts: { p, dc, t, q, n },
        };
      }),
  ),

  // ── 일차부등식의 활용 (속력, 도형, 기타) ─────────────
  def(MINOR_APPLY, "08", "도형에 대한 문제", SEC.속력도형, "기본", (rng) => {
    const b = pick(rng, [4, 6, 8, 10, 12, 14, 16] as const);
    const h = intBetween(rng, 3, 15);
    const S = (b * h) / 2;
    return {
      content: `밑변의 길이가 $${b}\\,\\mathrm{cm}$인 삼각형의 넓이가 $${S}\\,\\mathrm{cm^2}$ 이상이 되게 하려면 높이는 몇 $\\mathrm{cm}$ 이상이어야 하는지 구하시오.`,
      answer: `$${h}\\,\\mathrm{cm}$`,
      solution: `높이를 $x\\,\\mathrm{cm}$라 하면 $\\dfrac{1}{2}\\times${b}\\times x\\ge${S}$이다.\n$${b / 2}x\\ge${S}$이므로 $x\\ge${h}$이다.\n따라서 높이는 $${h}\\,\\mathrm{cm}$ 이상이어야 한다.`,
      facts: { b, S, h },
    };
  }),

  def(
    MINOR_APPLY,
    "10",
    "거리 속력 시간에 대한 문제 ⑴",
    SEC.속력도형,
    "심화",
    (rng) => {
      const [v1, v2] = pick(rng, [
        [2, 3],
        [3, 4],
        [2, 4],
        [3, 6],
        [4, 6],
      ] as const);
      const j = intBetween(rng, 1, 2);
      const T = j * (v1 + v2);
      const d = j * v1 * v2;
      return {
        content: `갈 때는 시속 $${v1}\\,\\mathrm{km}$, 올 때는 같은 길을 시속 $${v2}\\,\\mathrm{km}$로 걸어서 전체 걸리는 시간이 $${T}$시간 이내가 되게 하려고 한다. 최대 몇 $\\mathrm{km}$ 떨어진 곳까지 갔다 올 수 있는지 구하시오.`,
        answer: `$${d}\\,\\mathrm{km}$`,
        solution: `$x\\,\\mathrm{km}$ 떨어진 곳까지 갔다 온다고 하면 $\\dfrac{x}{${v1}}+\\dfrac{x}{${v2}}\\le${T}$이다.\n양변에 $${v1 * v2}$${eulReul(v1 * v2)} 곱하여 풀면 $x\\le${d}$이다.\n따라서 최대 $${d}\\,\\mathrm{km}$ 떨어진 곳까지 갔다 올 수 있다.`,
        facts: { v1, v2, T, d },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "11",
    "거리 속력 시간에 대한 문제 ⑵",
    SEC.속력도형,
    "심화",
    (rng) => {
      const v = pick(rng, [50, 60, 80] as const);
      const s = pick(rng, [10, 15, 20] as const);
      const k = intBetween(rng, 5, 15);
      const d = v * k;
      const T = 2 * k + s;
      return {
        content: `기차가 출발하기 전까지 $${T}$분의 여유가 있어서 이 시간 동안 상점에 가서 물건을 사 오려고 한다. 물건을 사는 데 $${s}$분이 걸리고 분속 $${v}\\,\\mathrm{m}$로 걸을 때, 역에서 최대 몇 $\\mathrm{m}$ 떨어진 상점까지 다녀올 수 있는지 구하시오.`,
        answer: `$${d}\\,\\mathrm{m}$`,
        solution: `역에서 $x\\,\\mathrm{m}$ 떨어진 상점까지 다녀온다고 하면 $\\dfrac{x}{${v}}+${s}+\\dfrac{x}{${v}}\\le${T}$이다.\n$\\dfrac{2x}{${v}}\\le${T - s}$이므로 $x\\le${d}$이다.\n따라서 최대 $${d}\\,\\mathrm{m}$ 떨어진 상점까지 다녀올 수 있다.`,
        facts: { v, s, T, d },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "22",
    "직사각형의 둘레에 대한 문제",
    SEC.속력도형,
    "기본",
    (rng) => {
      const width = intBetween(rng, 3, 12);
      const length = intBetween(rng, width + 2, width + 12);
      const perimeter = 2 * (width + length);
      return {
        content: `가로의 길이가 $${width} cm$인 직사각형의 둘레의 길이를 $${perimeter} cm$ 이하로 만들려고 한다. 세로의 길이는 최대 몇 $cm$인지 계산하시오.`,
        answer: `$${length} cm$`,
        solution: `세로의 길이를 $x cm$라 하면 $2(${width}+x)\\le${perimeter}$이다. 풀면 $x\\le${length}$이므로 세로의 길이는 최대 $${length} cm$이다.`,
        facts: { width, length, perimeter },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "23",
    "평행사변형의 넓이에 대한 문제",
    SEC.속력도형,
    "기본",
    (rng) => {
      const base = intBetween(rng, 4, 12);
      const height = intBetween(rng, 3, 15);
      const area = base * height;
      return {
        content: `밑변의 길이가 $${base} cm$인 평행사변형의 넓이를 $${area} cm^2$ 이상으로 만들려고 한다. 높이는 몇 $cm$ 이상이어야 하는지 계산하시오.`,
        answer: `$${height} cm$`,
        solution: `높이를 $x cm$라 하면 $${base}x\\ge${area}$이다. 따라서 $x\\ge${height}$이므로 높이는 $${height} cm$ 이상이어야 한다.`,
        facts: { base, height, area },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "24",
    "제한 시간 안에 왕복하는 문제",
    SEC.속력도형,
    "응용",
    (rng) => {
      const speed = pick(rng, [3, 4, 5, 6] as const);
      const stay = intBetween(rng, 1, 4);
      const distance = speed * intBetween(rng, 2, 6);
      const limit = (2 * distance) / speed + stay;
      return {
        content: `분속 $${speed} m$로 걸어 어떤 곳에 다녀오되 그곳에서 $${stay}$분 동안 머문다. 전체 시간이 $${limit}$분 이하일 때 출발점에서 최대 몇 $m$ 떨어진 곳까지 다녀올 수 있는지 구하시오.`,
        answer: `$${distance} m$`,
        solution: `거리를 $x m$라 하면 $\\dfrac{2x}{${speed}}+${stay}\\le${limit}$이다. 풀면 $x\\le${distance}$이므로 최대 $${distance} m$ 떨어진 곳까지 다녀올 수 있다.`,
        facts: { speed, stay, distance, limit },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "25",
    "통화 요금의 최대 시간",
    SEC.속력도형,
    "응용",
    (rng) => {
      const base = pick(rng, [1000, 1500, 2000] as const);
      const rate = pick(rng, [50, 100, 200] as const);
      const minutes = intBetween(rng, 10, 40);
      const budget = base + rate * minutes;
      return {
        content: `기본요금이 $${base}$원이고 통화 $1$분마다 $${rate}$원이 추가되는 요금제가 있다. 요금을 $${budget}$원 이하로 내려면 최대 몇 분 동안 통화할 수 있는지 구하시오.`,
        answer: `$${minutes}$분`,
        solution: `통화 시간을 $x$분이라 하면 $${base}+${rate}x\\le${budget}$이다. 풀면 $x\\le${minutes}$이므로 최대 $${minutes}$분 동안 통화할 수 있다.`,
        facts: { base, rate, minutes, budget },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "26",
    "목표량을 채우는 운동 시간",
    SEC.속력도형,
    "기본",
    (rng) => {
      const initial = intBetween(rng, 20, 80);
      const rate = intBetween(rng, 5, 12);
      const minutes = intBetween(rng, 8, 20);
      const target = initial + rate * minutes;
      return {
        content: `이미 $${initial}$칼로리를 소비한 사람이 운동을 계속하여 $1$분마다 $${rate}$칼로리씩 소비한다. 모두 $${target}$칼로리 이상을 소비하려면 앞으로 몇 분 이상 운동해야 하는지 계산하시오.`,
        answer: `$${minutes}$분`,
        solution: `앞으로 운동할 시간을 $x$분이라 하면 $${initial}+${rate}x\\ge${target}$이다. 풀면 $x\\ge${minutes}$이므로 $${minutes}$분 이상 운동해야 한다.`,
        facts: { initial, rate, minutes, target },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "27",
    "운반할 수 있는 최대 무게",
    SEC.속력도형,
    "응용",
    (rng) => {
      const body = intBetween(rng, 40, 80);
      const load = intBetween(rng, 20, 70);
      const limit = body + load;
      return {
        content: `무게가 $${body} kg$인 사람이 제한 무게가 $${limit} kg$인 운반 장비를 이용하려고 한다. 짐은 최대 몇 $kg$까지 실을 수 있는지 구하시오.`,
        answer: `$${load} kg$`,
        solution: `짐의 무게를 $x kg$라 하면 $${body}+x\\le${limit}$이다. 따라서 $x\\le${load}$이므로 짐은 최대 $${load} kg$까지 실을 수 있다.`,
        facts: { body, load, limit },
      };
    },
  ),

  def(MINOR_APPLY, "28", "여러 바퀴를 도는 시간", SEC.속력도형, "심화", (rng) =>
    attempt(80, () => {
      const lap = pick(rng, [200, 300, 400] as const);
      const speed = pick(rng, [50, 60, 80, 100] as const);
      const laps = intBetween(rng, 3, 10);
      const limit = (lap * laps) / speed;
      if (!Number.isInteger(limit)) return null;
      return {
        content: `한 바퀴의 길이가 $${lap} m$인 산책로를 분속 $${speed} m$로 걸어 $${limit}$분 이내에 운동하려고 한다. 최대 몇 바퀴까지 돌 수 있는지 구하시오.`,
        answer: `$${laps}$바퀴`,
        solution: `도는 횟수를 자연수 $x$라 하면 $\\dfrac{${lap}x}{${speed}}\\le${limit}$이다. 풀면 $x\\le${laps}$이므로 최대 $${laps}$바퀴까지 돌 수 있다.`,
        facts: { lap, speed, laps, limit },
      };
    }),
  ),

  // ── 일차부등식의 활용 (농도) ─────────────────────────
  def(
    MINOR_APPLY,
    "12",
    "농도에 대한 문제 물을 넣거나 증발시키는 경우",
    SEC.농도,
    "응용",
    (rng) => {
      const C = pick(rng, [4, 5, 6, 8, 10] as const);
      const A = C + intBetween(rng, 2, 6);
      const m = intBetween(rng, 20, 60);
      const B = C * m;
      const W = m * (A - C);
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$이 있다. 여기에 물을 몇 $\\mathrm{g}$ 이상 넣으면 농도가 $${C}\\%$ 이하인 소금물이 되는지 구하시오.`,
        answer: `$${W}\\,\\mathrm{g}$`,
        solution: `물을 $x\\,\\mathrm{g}$ 넣는다고 하면 소금의 양은 변하지 않으므로 $\\dfrac{${A}}{100}\\times${B}\\le\\dfrac{${C}}{100}\\times(${B}+x)$이다.\n풀면 $x\\ge${W}$이므로 물을 $${W}\\,\\mathrm{g}$ 이상 넣어야 한다.`,
        facts: { A, B, C, W },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "13",
    "농도에 대한 문제 두 소금물을 섞는 경우",
    SEC.농도,
    "심화",
    (rng) =>
      attempt(400, () => {
        const a = pick(rng, [8, 10, 12, 15] as const);
        const b = pick(rng, [2, 3, 4, 5, 6] as const);
        if (b + 1 > a - 1) return null;
        const c = intBetween(rng, b + 1, a - 1);
        const T = pick(rng, [200, 300, 400, 500, 600] as const);
        const num = T * (c - b);
        if (num % (a - b) !== 0) return null;
        const x = num / (a - b);
        if (x < 50 || x > T - 50) return null;
        return {
          content: `$${a}\\%$의 소금물과 $${b}\\%$의 소금물을 섞어서 농도가 $${c}\\%$ 이하인 소금물 $${T}\\,\\mathrm{g}$을 만들려고 한다. $${a}\\%$의 소금물은 최대 몇 $\\mathrm{g}$까지 섞을 수 있는지 구하시오.`,
          answer: `$${x}\\,\\mathrm{g}$`,
          solution: `$${a}\\%$의 소금물을 $x\\,\\mathrm{g}$ 섞는다고 하면 $${b}\\%$의 소금물은 $(${T}-x)\\,\\mathrm{g}$이다.\n소금의 양에서 $\\dfrac{${a}}{100}x+\\dfrac{${b}}{100}(${T}-x)\\le\\dfrac{${c}}{100}\\times${T}$이다.\n풀면 $x\\le${x}$이므로 최대 $${x}\\,\\mathrm{g}$까지 섞을 수 있다.`,
          facts: { a, b, c, T, x },
        };
      }),
  ),

  def(MINOR_APPLY, "14", "합금 식품에 대한 문제", SEC.농도, "심화", (rng) => {
    const mat = pick(rng, [
      { noun: "구리", eul: "를", ga: "가", thing: "합금" },
      { noun: "단백질", eul: "을", ga: "이", thing: "식품" },
    ] as const);
    const p = pick(rng, [20, 30, 40] as const);
    const q = pick(rng, [5, 10, 15] as const);
    const T = pick(rng, [200, 300, 400, 500] as const);
    const x0 = 20 * intBetween(rng, 2, T / 20 - 2);
    const M = (x0 * (p - q) + q * T) / 100;
    return {
      content: `${mat.noun}${mat.eul} $${p}\\%$ 포함한 ${mat.thing} $\\mathrm{A}$와 ${mat.noun}${mat.eul} $${q}\\%$ 포함한 ${mat.thing} $\\mathrm{B}$를 섞어서 ${mat.thing} $${T}\\,\\mathrm{g}$을 만들려고 한다. ${mat.noun}${mat.ga} $${M}\\,\\mathrm{g}$ 이상 포함되게 하려면 ${mat.thing} $\\mathrm{A}$는 몇 $\\mathrm{g}$ 이상 섞어야 하는지 구하시오.`,
      answer: `$${x0}\\,\\mathrm{g}$`,
      solution: `${mat.thing} $\\mathrm{A}$를 $x\\,\\mathrm{g}$ 섞는다고 하면 ${mat.thing} $\\mathrm{B}$는 $(${T}-x)\\,\\mathrm{g}$이다.\n${mat.noun}의 양에서 $\\dfrac{${p}}{100}x+\\dfrac{${q}}{100}(${T}-x)\\ge${M}$이다.\n풀면 $x\\ge${x0}$이므로 $\\mathrm{A}$는 $${x0}\\,\\mathrm{g}$ 이상 섞어야 한다.`,
      facts: { p, q, T, M, x0 },
    };
  }),

  def(
    MINOR_APPLY,
    "15",
    "소금을 넣어 농도를 높이는 문제",
    SEC.농도,
    "기본",
    (rng) => {
      const [A, C, unit] = pick(rng, [
        [10, 20, 4],
        [20, 25, 3],
        [25, 40, 2],
      ] as const);
      const scale = intBetween(rng, 1, 4);
      const B = unit * (100 - C) * scale;
      const x = unit * (C - A) * scale;
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$에 소금을 넣어 농도가 $${C}\\%$ 이상이 되게 하려고 한다. 소금을 몇 $\\mathrm{g}$ 이상 넣어야 하는지 계산하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `소금을 $x\\,\\mathrm{g}$ 넣는다고 하면 $\\dfrac{${A * B}+100x}{${B}+x}\\ge${C}$이다. 풀면 $x\\ge${x}$이므로 소금을 $${x}\\,\\mathrm{g}$ 이상 넣어야 한다.`,
        facts: { A, B, C, x },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "16",
    "물을 증발시켜 농도를 높이는 문제",
    SEC.농도,
    "응용",
    (rng) => {
      const A = pick(rng, [5, 10, 15] as const);
      const C = A + pick(rng, [5, 10] as const);
      const scale = intBetween(rng, 2, 6);
      const B = C * scale;
      const x = (B * (C - A)) / C;
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$을 끓여서 농도가 $${C}\\%$ 이상이 되게 하려고 한다. 물을 몇 $\\mathrm{g}$ 이상 증발시켜야 하는지 구하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `물 $x\\,\\mathrm{g}$을 증발시키면 소금의 양은 그대로이고 전체 양은 $(${B}-x)\\,\\mathrm{g}$이다. $\\dfrac{${A * B}}{${B}-x}\\ge${C}$을 풀면 $x\\ge${x}$이다.`,
        facts: { A, B, C, x },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "17",
    "소금을 넣을 수 있는 최대량",
    SEC.농도,
    "응용",
    (rng) => {
      const [A, C, unit] = pick(rng, [
        [5, 20, 4],
        [10, 25, 3],
        [20, 40, 2],
      ] as const);
      const scale = intBetween(rng, 1, 4);
      const B = unit * (100 - C) * scale;
      const x = unit * (C - A) * scale;
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$에 소금을 넣되 농도가 $${C}\\%$ 이하가 되게 하려고 한다. 소금은 최대 몇 $\\mathrm{g}$까지 넣을 수 있는지 구하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `소금을 $x\\,\\mathrm{g}$ 넣는다고 하면 $\\dfrac{${A * B}+100x}{${B}+x}\\le${C}$이다. 풀면 $x\\le${x}$이므로 최대 $${x}\\,\\mathrm{g}$까지 넣을 수 있다.`,
        facts: { A, B, C, x },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "18",
    "농도를 유지하며 넣을 물의 최대량",
    SEC.농도,
    "기본",
    (rng) => {
      const C = pick(rng, [4, 5, 8, 10] as const);
      const A = C + intBetween(rng, 2, 6);
      const scale = intBetween(rng, 20, 50);
      const B = C * scale;
      const x = scale * (A - C);
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$에 물을 넣은 뒤에도 농도가 $${C}\\%$ 이상이 되게 하려고 한다. 물은 최대 몇 $\\mathrm{g}$까지 넣을 수 있는지 계산하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `물 $x\\,\\mathrm{g}$을 넣으면 $\\dfrac{${A * B}}{${B}+x}\\ge${C}$이다. 풀면 $x\\le${x}$이므로 물은 최대 $${x}\\,\\mathrm{g}$까지 넣을 수 있다.`,
        facts: { A, B, C, x },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "19",
    "소금물을 물로 치환하는 문제",
    SEC.농도,
    "심화",
    (rng) => {
      const A = pick(rng, [10, 12, 15, 20] as const);
      const C = pick(rng, [5, 6, 8, 10] as const);
      const scale = intBetween(rng, 10, 30);
      const B = A * scale;
      const x = scale * (A - C);
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$에서 소금물 $x\\,\\mathrm{g}$을 덜어 내고 같은 양의 물을 넣었다. 농도가 $${C}\\%$ 이하가 되게 하는 $x$의 최솟값을 구하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `덜어 낸 뒤 남은 소금의 양은 $\\dfrac{${A}}{100}(${B}-x)\\,\\mathrm{g}$이다. 전체 양은 $${B}\\,\\mathrm{g}$이므로 $${A}(${B}-x)\\le${C}\\times${B}$이다. 풀면 $x\\ge${x}$이다.`,
        facts: { A, B, C, x },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "20",
    "두 소금물을 섞어 농도 이상 만들기",
    SEC.농도,
    "응용",
    (rng) =>
      attempt(100, () => {
        const a = pick(rng, [15, 20, 25] as const);
        const b = pick(rng, [5, 10] as const);
        if (a <= b) return null;
        const c = intBetween(rng, b + 1, a - 1);
        const unit = intBetween(rng, 10, 30);
        const T = (a - b) * unit;
        const x = (c - b) * unit;
        return {
          content: `$${a}\\%$와 $${b}\\%$의 소금물을 섞어 농도가 $${c}\\%$ 이상인 소금물 $${T}\\,\\mathrm{g}$을 만들려고 한다. $${a}\\%$의 소금물은 몇 $\\mathrm{g}$ 이상 섞어야 하는지 구하시오.`,
          answer: `$${x}\\,\\mathrm{g}$`,
          solution: `$${a}\\%$의 소금물을 $x\\,\\mathrm{g}$ 넣으면 $${a}x+${b}(${T}-x)\\ge${c}\\times${T}$이다. 풀면 $x\\ge${x}$이다.`,
          facts: { a, b, c, T, x },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "21",
    "순수한 물질을 섞는 함량 문제",
    SEC.농도,
    "심화",
    (rng) => {
      const C = pick(rng, [20, 25, 40, 50] as const);
      const A = pick(rng, [5, 10, 15] as const);
      const scale = intBetween(rng, 2, 6);
      const B = (100 - C) * scale;
      const x = (C - A) * scale;
      return {
        content: `단백질이 $${A}\\%$ 들어 있는 식품 $${B}\\,\\mathrm{g}$에 순수한 단백질을 섞어 단백질 함량이 $${C}\\%$ 이상이 되게 하려고 한다. 단백질을 몇 $\\mathrm{g}$ 이상 섞어야 하는지 구하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `단백질을 $x\\,\\mathrm{g}$ 섞으면 $\\dfrac{${A * B}+100x}{${B}+x}\\ge${C}$이다. 풀면 $x\\ge${x}$이다.`,
        facts: { A, B, C, x },
      };
    },
  ),

  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「일차부등식」을 14, 「일차부등식의 활용」을 14 까지만 담는다.
  // 130소단원을 10유형으로 올리려면 색인에 없는 유형을 지어야 하므로 번호를
  // 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    MINOR_INEQ,
    "70",
    "일차부등식의 해 중에서 가장 큰 정수",
    SEC.응용,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 2, 6);
        const n = intBetween(rng, 1, 9);
        const r = intBetween(rng, 1, a - 1); // 나누어떨어지면 경계가 해에 들어간다
        const b = intBetween(rng, 1, 9);
        const c = a * n + r + b;
        if (c > 90) return null;
        return {
          content: `일차부등식 $${a}x+${b}\\le${c}$ 를 만족시키는 $x$ 중에서 가장 큰 정수를 구하시오.`,
          answer: `$${n}$`,
          solution: `$${a}x\\le${c - b}$이므로 $x\\le\\dfrac{${c - b}}{${a}}$이다.\n이를 만족시키는 가장 큰 정수는 $${n}$이다.`,
          facts: { a, b, c, n },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "71",
    "일차부등식을 만족시키는 자연수의 개수",
    SEC.응용,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 2, 6);
        const n = intBetween(rng, 2, 9);
        const r = intBetween(rng, 1, a - 1);
        const b = intBetween(rng, 1, 9);
        const d = a * n + r - b;
        if (d < 1 || d > 90) return null;
        return {
          content: `일차부등식 $${a}x-${b}<${d}$ 를 만족시키는 자연수 $x$의 개수를 구하시오.`,
          answer: `$${n}$개`,
          solution: `$${a}x<${d + b}$이므로 $x<\\dfrac{${d + b}}{${a}}$이다.\n이를 만족시키는 자연수는 $1$부터 $${n}$까지 $${n}$개이다.`,
          facts: { a, b, d, n },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "72",
    "괄호가 있는 일차부등식의 해 중에서 가장 작은 정수",
    SEC.응용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const b = intBetween(rng, 1, 4);
        const a = b + intBetween(rng, 2, 4); // a-b>=2 라야 나머지가 생긴다
        const p = intBetween(rng, 1, 6);
        const q = intBetween(rng, 1, 6);
        const d = a - b;
        const t = a * p + b * q;
        if (t % d === 0) return null; // 딱 나누어떨어지면 경계가 해에 들어간다
        const n = Math.floor(t / d) + 1;
        if (n > 20) return null;
        return {
          content: `일차부등식 $${a}(x-${p})>${b}(x+${q})$ 를 만족시키는 $x$ 중에서 가장 작은 정수를 구하시오.`,
          answer: `$${n}$`,
          solution: `괄호를 풀면 $${a}x-${a * p}>${b}x+${b * q}$이므로 $${d}x>${t}$이다.\n$x>\\dfrac{${t}}{${d}}$이므로 가장 작은 정수는 $${n}$이다.`,
          facts: { a, b, p, q, n },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "73",
    "두 일차부등식을 동시에 만족시키는 정수의 개수",
    SEC.응용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const lo = intBetween(rng, -6, 2);
        const hi = lo + intBetween(rng, 3, 9);
        const a1 = intBetween(rng, 1, 4);
        const b1 = intBetween(rng, -5, 5);
        const c1 = a1 * hi + b1; // a1·x + b1 < c1  ⟺  x < hi
        const a2 = intBetween(rng, 1, 4);
        const b2 = intBetween(rng, -5, 5);
        const c2 = a2 * lo + b2; // a2·x + b2 >= c2 ⟺  x >= lo
        return {
          content: `두 일차부등식 $${a1}x${b1 >= 0 ? `+${b1}` : b1}<${c1}$, $${a2}x${b2 >= 0 ? `+${b2}` : b2}\\ge${c2}$ 를 동시에 만족시키는 정수 $x$의 개수를 구하시오.`,
          answer: `$${hi - lo}$개`,
          solution: `앞 부등식에서 $x<${hi}$이고, 뒤 부등식에서 $x\\ge${lo}$이다.\n따라서 $${lo}\\le x<${hi}$이므로 정수 $x$는 $${lo}$부터 $${hi - 1}$까지 $${hi - lo}$개이다.`,
          facts: { a1, b1, c1, a2, b2, c2, lo, hi, ans: hi - lo },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "74",
    "해 중 자연수의 개수가 주어질 때 상수의 최솟값",
    SEC.응용,
    "심화",
    (rng) =>
      attempt(120, () => {
        const m = intBetween(rng, 2, 7);
        const n = intBetween(rng, 2, 9);
        const ans = m * n;
        if (ans > 70) return null;
        return {
          content: `$x$에 대한 일차부등식 $${m}x-a\\le0$ 의 해 중에서 자연수가 $${n}$개일 때, 자연수 $a$의 최솟값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `$${m}x\\le a$에서 $x\\le\\dfrac{a}{${m}}$이다.\n자연수인 해가 $${n}$개이려면 $${n}\\le\\dfrac{a}{${m}}<${n + 1}$이어야 하므로 $${ans}\\le a<${m * (n + 1)}$이다.\n따라서 자연수 $a$의 최솟값은 $${ans}$이다.`,
          facts: { m, n, ans },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "70",
    "목표 금액에 이르는 최소 개월",
    SEC.개수예금,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = pick(rng, [5000, 8000, 10000, 12000] as const);
        const a0 = 10000 * intBetween(rng, 2, 9);
        const n = intBetween(rng, 4, 15);
        const r = 1000 * intBetween(rng, 1, p / 1000 - 1);
        const T = a0 + p * n - r;
        return {
          content: `현재 예금액이 $${a0}$원이고 다음 달부터 매달 $${p}$원씩 예금한다. 예금액이 $${T}$원 이상이 되는 것은 최소 몇 개월 후인지 구하시오.`,
          answer: `$${n}$개월 후`,
          solution: `$x$개월 후의 예금액은 $(${a0}+${p}x)$원이다.\n$${a0}+${p}x\\ge${T}$에서 $${p}x\\ge${T - a0}$이므로 $x\\ge\\dfrac{${T - a0}}{${p}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이므로 $${n}$개월 후이다.`,
          facts: { a0, p, T, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "71",
    "예금액이 처음의 몇 배 이상이 되는 최소 개월",
    SEC.개수예금,
    "응용",
    (rng) =>
      attempt(200, () => {
        const a0 = 10000 * intBetween(rng, 2, 8);
        const k = intBetween(rng, 2, 4);
        const p = pick(rng, [4000, 5000, 6000, 8000] as const);
        const need = (k - 1) * a0;
        if (need % p === 0) return null; // 딱 나누어떨어지면 «최소»가 경계와 겹친다
        const n = Math.floor(need / p) + 1;
        if (n < 3 || n > 30) return null;
        return {
          content: `현재 예금액이 $${a0}$원이고 다음 달부터 매달 $${p}$원씩 예금한다. 예금액이 처음의 $${k}$배 이상이 되는 것은 최소 몇 개월 후인지 구하시오.`,
          answer: `$${n}$개월 후`,
          solution: `$x$개월 후의 예금액은 $(${a0}+${p}x)$원이고, 처음의 $${k}$배는 $${k * a0}$원이다.\n$${a0}+${p}x\\ge${k * a0}$에서 $${p}x\\ge${need}$이므로 $x\\ge\\dfrac{${need}}{${p}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이다.`,
          facts: { a0, p, k, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "72",
    "점수가 기준을 넘는 최소 정답 개수",
    SEC.개수예금,
    "응용",
    (rng) =>
      attempt(200, () => {
        const N = pick(rng, [20, 25, 30] as const);
        const a = pick(rng, [4, 5] as const);
        const b = pick(rng, [1, 2] as const);
        const n = intBetween(rng, Math.ceil(N / 2), N - 2);
        // x 개를 맞히면 점수는 a·x - b·(N-x) = (a+b)x - bN 이다.
        const score = (a + b) * n - b * N;
        const prev = (a + b) * (n - 1) - b * N;
        const M = intBetween(rng, prev + 1, score); // n 에서 처음으로 넘어선다
        return {
          content: `$${N}$문제가 나오는 시험에서 한 문제를 맞히면 $${a}$점을 얻고 틀리면 $${b}$점을 잃는다. $${M}$점 이상을 얻으려면 최소 몇 문제를 맞혀야 하는지 구하시오.`,
          answer: `$${n}$문제`,
          solution: `맞힌 문제를 $x$개라 하면 틀린 문제는 $(${N}-x)$개이므로 점수는 $\\{${a}x-${b}(${N}-x)\\}$점이다.\n$${a}x-${b}(${N}-x)\\ge${M}$에서 $${a + b}x\\ge${M + b * N}$이므로 $x\\ge\\dfrac{${M + b * N}}{${a + b}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이다.`,
          facts: { N, a, b, M, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "73",
    "짐을 모두 나르는 최소 횟수",
    SEC.개수예금,
    "기본",
    (rng) =>
      attempt(120, () => {
        const w = pick(rng, [40, 50, 60, 75] as const);
        const n = intBetween(rng, 4, 15);
        const r = 5 * intBetween(rng, 1, w / 5 - 1);
        const W = w * n - r;
        return {
          content: `무게가 모두 $${W}\\,\\mathrm{kg}$인 짐을 한 번에 $${w}\\,\\mathrm{kg}$까지 실을 수 있는 수레로 옮기려고 한다. 짐을 모두 옮기려면 최소 몇 번 날라야 하는지 구하시오.`,
          answer: `$${n}$번`,
          solution: `$x$번 나른다고 하면 $${w}x\\ge${W}$이므로 $x\\ge\\dfrac{${W}}{${w}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이므로 최소 $${n}$번 날라야 한다.`,
          facts: { W, w, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "74",
    "예산 안에서 비싼 쪽을 최대 몇 개 살 수 있는가",
    SEC.개수예금,
    "심화",
    (rng) =>
      attempt(200, () => {
        const p1 = pick(rng, [500, 700, 800] as const);
        const p2 = p1 + pick(rng, [300, 500, 700] as const);
        const N = intBetween(rng, 8, 20);
        const n = intBetween(rng, 2, N - 2);
        const d = p2 - p1;
        const r = 100 * intBetween(rng, 1, d / 100 - 1);
        const T = p1 * N + d * n + r; // x=n 은 되고 x=n+1 은 안 되게
        return {
          content: `한 개에 $${p1}$원인 사탕과 한 개에 $${p2}$원인 초콜릿을 합하여 $${N}$개 사려고 한다. 전체 금액이 $${T}$원 이하가 되게 하려면 초콜릿은 최대 몇 개까지 살 수 있는지 구하시오.`,
          answer: `$${n}$개`,
          solution: `초콜릿을 $x$개 산다고 하면 사탕은 $(${N}-x)$개이므로 $${p2}x+${p1}(${N}-x)\\le${T}$이다.\n$${d}x\\le${T - p1 * N}$이므로 $x\\le\\dfrac{${T - p1 * N}}{${d}}$이다.\n이를 만족시키는 자연수 $x$의 최댓값은 $${n}$이므로 최대 $${n}$개까지 살 수 있다.`,
          facts: { p1, p2, N, T, n },
        };
      }),
  ),
];
