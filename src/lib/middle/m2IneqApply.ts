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
];
