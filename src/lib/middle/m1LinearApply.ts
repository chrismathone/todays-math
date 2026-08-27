/**
 * 중1 「일차방정식의 활용」 — RPM 1-1 중단원 유형 22개 전량 (p108~118).
 *
 * 우리 DB 에서 이 자리(단원 7개 중 5개)가 출제 가능 문항 **0건**이었다 —
 * `scripts/rpm/match-units.ts` 가 잰 것. RPM 유형 색인이 곧 여기 목록이다
 * (`docs/planning/tracks/rpm-type-catalog.md` 중1 1-1).
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다
 *
 * 모든 생성기는 **정답(또는 핵심 미지수)을 먼저** 무작위로 뽑고, 그 답이 나오도록
 * 발문의 수치를 역산한다. 그래서 답은 항상 정수·깔끔한 값이고, 검산은
 * 「발문 수치가 방정식을 만족하는가」로 테스트가 **독립 재계산**한다
 * (`facts` 에 원 수치를 남긴다 — 생성기의 답을 그대로 믿지 않는다).
 *
 * 숫자는 전부 `$...$` 안에 쓴다 (초등 rules.bareNumbers 가드와 같은 규칙).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

/** 수 뒤 「을/를」 — `m2Josa` 의 받침 판정을 되쓴다(규칙을 옮겨 적지 않는다). */
const nEul = eulReul;

/**
 * 기약인 **진분수** (분자, 분모) — 「어떤 수의 $\dfrac{a}{b}$」에 쓴다.
 * 약분이 안 된 분수가 지면에 나가면 값은 맞아도 흉하므로 표로 못 박는다.
 */
const PROPER_UNIT_FRACS: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [1, 6],
  [5, 6],
];

const GRADE = "중1";
const BOOK = "1-1";
const MINOR = "일차방정식의 활용";

/** 우리 Unit.section 정확한 이름 (DB 실측 2026-08-23) */
const SEC = {
  수: "일차방정식의 활용(수)",
  나이: "일차방정식의 활용(나이, 과부족, 예금)",
  증감: "일차방정식의 활용(증가와 감소, 원가와 정가)",
  거리: "일차방정식의 활용(거리, 속력, 시간)",
  도형: "일차방정식의 활용(도형, 농도, 일)",
  비율: "일차방정식의 활용(비율, 시계, 규칙)",
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
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${MINOR}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: MINOR,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M1_LINEAR_APPLY: TypeEntry[] = [
  // ── (수) ──────────────────────────────────────────────
  def("01", "어떤 수에 대한 문제", SEC.수, "기본", (rng) =>
    attempt(50, () => {
      const x = intBetween(rng, 2, 12);
      const a = intBetween(rng, 2, 5);
      const c = intBetween(rng, 2, 7);
      if (a === c) return null;
      const b = intBetween(rng, 1, 9);
      const diff = a * x + b - c * x;
      if (diff === 0) return null;
      const rel = diff > 0 ? "크다" : "작다";
      const ad = Math.abs(diff);
      return {
        content: `어떤 수에 $${a}$${nEul(a)} 곱한 후 $${b}$${nEul(b)} 더한 수는 어떤 수의 $${c}$배보다 $${ad}$만큼 ${rel}고 한다. 어떤 수를 구하시오.`,
        answer: `$${x}$`,
        solution: `어떤 수를 $x$라 하면 $${a}x+${b}=${c}x${diff > 0 ? `+${ad}` : `-${ad}`}$이다.\n정리하여 풀면 $x=${x}$이다.`,
        facts: { x, a, b, c, diff },
      };
    }),
  ),

  def("02", "연속하는 자연수에 대한 문제", SEC.수, "기본", (rng) => {
    const m = intBetween(rng, 6, 40);
    const S = 3 * m;
    return {
      content: `연속하는 세 자연수의 합이 $${S}$일 때, 세 자연수 중 가장 큰 수를 구하시오.`,
      answer: `$${m + 1}$`,
      solution: `연속하는 세 자연수를 $x-1$, $x$, $x+1$이라 하면 합은 $3x=${S}$이다.\n따라서 $x=${m}$이고, 가장 큰 수는 $${m + 1}$이다.`,
      facts: { m, S },
    };
  }),

  def("03", "자릿수에 대한 문제", SEC.수, "응용", (rng) => {
    const a = intBetween(rng, 1, 8);
    const b = intBetween(rng, a + 1, 9);
    const s = a + b;
    const d = 9 * (b - a);
    const N = 10 * a + b;
    return {
      content: `각 자리의 숫자의 합이 $${s}$인 두 자리 자연수가 있다. 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $${d}$만큼 크다고 한다. 처음 수를 구하시오.`,
      answer: `$${N}$`,
      solution: `십의 자리의 숫자를 $x$라 하면 일의 자리의 숫자는 $${s}-x$이다.\n$10(${s}-x)+x=\\{10x+(${s}-x)\\}+${d}$${nEul(d)} 풀면 $x=${a}$이다.\n따라서 처음 수는 $${N}$이다.`,
      facts: { a, b, s, d, N },
    };
  }),

  def("06", "개수의 합이 일정한 문제", SEC.수, "기본", (rng) =>
    attempt(50, () => {
      const x = intBetween(rng, 3, 12);
      const T = x + intBetween(rng, 2, 10);
      const p = intBetween(rng, 3, 15) * 100;
      const q = intBetween(rng, 3, 15) * 100;
      if (p === q) return null;
      const C = p * x + q * (T - x);
      return {
        content: `한 자루에 $${p}$원인 볼펜과 한 자루에 $${q}$원인 연필을 합하여 $${T}$자루를 사고 $${C}$원을 지불하였다. 볼펜은 몇 자루 샀는지 구하시오.`,
        answer: `$${x}$자루`,
        solution: `볼펜을 $x$자루 샀다고 하면 연필은 $(${T}-x)$자루이다.\n$${p}x+${q}(${T}-x)=${C}$${nEul(C)} 풀면 $x=${x}$이다.\n따라서 볼펜은 $${x}$자루 샀다.`,
        facts: { x, T, p, q, C },
      };
    }),
  ),

  // ── (나이, 과부족, 예금) ─────────────────────────────
  def("04", "나이에 대한 문제", SEC.나이, "응용", (rng) =>
    attempt(80, () => {
      const s = intBetween(rng, 8, 15);
      const m = intBetween(rng, 2, 3);
      const k = intBetween(rng, 3, 15);
      const f = m * (s + k) - k;
      if (f - s < 24 || f - s > 45 || f > 65) return null;
      return {
        content: `현재 아버지의 나이는 $${f}$세, 아들의 나이는 $${s}$세이다. 아버지의 나이가 아들의 나이의 $${m}$배가 되는 것은 몇 년 후인지 구하시오.`,
        answer: `$${k}$년 후`,
        solution: `$x$년 후에 $${m}$배가 된다고 하면 $${f}+x=${m}(${s}+x)$이다.\n정리하여 풀면 $x=${k}$이다.\n따라서 $${k}$년 후이다.`,
        facts: { f, s, m, k },
      };
    }),
  ),

  def("05", "예금에 대한 문제", SEC.나이, "응용", (rng) =>
    attempt(120, () => {
      const n = intBetween(rng, 3, 12);
      const q = intBetween(rng, 2, 6) * 500;
      const p = intBetween(rng, 4, 10) * 500;
      if (p === 2 * q) return null;
      const b0 = intBetween(rng, 5, 20) * 1000;
      const a0 = 2 * (b0 + q * n) - p * n;
      if (a0 <= 0 || a0 === b0 || a0 >= 2 * b0) return null;
      return {
        content: `현재 형의 예금액은 $${a0}$원, 동생의 예금액은 $${b0}$원이다. 다음 달부터 매달 형은 $${p}$원씩, 동생은 $${q}$원씩 예금한다면 형의 예금액이 동생의 예금액의 $2$배가 되는 것은 몇 개월 후인지 구하시오.`,
        answer: `$${n}$개월 후`,
        solution: `$x$개월 후라 하면 $${a0}+${p}x=2(${b0}+${q}x)$이다.\n정리하여 풀면 $x=${n}$이다.\n따라서 $${n}$개월 후이다.`,
        facts: { a0, b0, p, q, n },
      };
    }),
  ),

  def("08", "과부족에 대한 문제", SEC.나이, "응용", (rng) =>
    attempt(80, () => {
      const n = intBetween(rng, 5, 20);
      const a = intBetween(rng, 2, 6);
      const b = a + intBetween(rng, 1, 2);
      const r = intBetween(rng, 1, a);
      const s = (b - a) * n - r;
      if (s < 1) return null;
      const T = a * n + r;
      return {
        content: `학생들에게 공책을 나누어 주려고 한다. 한 학생에게 $${a}$권씩 나누어 주면 $${r}$권이 남고, $${b}$권씩 나누어 주면 $${s}$권이 부족하다. 학생 수를 구하시오.`,
        answer: `$${n}$명`,
        solution: `학생 수를 $x$명이라 하면 공책의 수는 같으므로 $${a}x+${r}=${b}x-${s}$이다.\n정리하여 풀면 $x=${n}$이다.\n따라서 학생은 $${n}$명이다.`,
        facts: { n, a, b, r, s, T },
      };
    }),
  ),

  def("20", "긴 의자에 대한 문제", SEC.나이, "심화", (rng) =>
    attempt(300, () => {
      const b = intBetween(rng, 5, 8);
      const a = b - intBetween(rng, 1, 2);
      const m = intBetween(rng, 4, 15); // 꽉 채워 앉은 의자 수
      const S = b * m;
      const r = intBetween(rng, 1, a - 1);
      if ((S - r) % a !== 0) return null;
      const n = (S - r) / a;
      const k = n - m;
      if (k < 1) return null;
      return {
        content: `강당의 긴 의자에 학생들이 앉으려고 한다. 한 의자에 $${a}$명씩 앉으면 $${r}$명이 앉지 못하고, 한 의자에 $${b}$명씩 앉으면 의자 $${k}$개가 남는다. 의자의 개수를 구하시오.`,
        answer: `$${n}$개`,
        solution: `의자 수를 $x$개라 하면 학생 수는 같으므로 $${a}x+${r}=${b}(x-${k})$이다.\n정리하여 풀면 $x=${n}$이다.\n따라서 의자는 $${n}$개이다.`,
        facts: { a, b, r, k, n, S },
      };
    }),
  ),

  // ── (증가와 감소, 원가와 정가) ───────────────────────
  def("09", "증가 감소에 대한 문제", SEC.증감, "심화", (rng) =>
    attempt(80, () => {
      const a = pick(rng, [5, 10] as const);
      const b = pick(rng, [5, 10] as const);
      const x = intBetween(rng, 8, 25) * 20;
      const y = intBetween(rng, 8, 25) * 20;
      const c = (a * x) / 100 - (b * y) / 100;
      if (c === 0) return null;
      const T = x + y;
      const rel = c > 0 ? "늘었다" : "줄었다";
      return {
        content: `작년 어느 중학교의 전체 학생 수는 $${T}$명이었다. 올해는 작년보다 남학생이 $${a}\\%$ 늘고 여학생이 $${b}\\%$ 줄어서 전체 학생 수가 $${Math.abs(c)}$명 ${rel}. 작년 남학생 수를 구하시오.`,
        answer: `$${x}$명`,
        solution: `작년 남학생 수를 $x$명이라 하면 여학생 수는 $(${T}-x)$명이다.\n$\\dfrac{${a}}{100}x-\\dfrac{${b}}{100}(${T}-x)=${c}$${nEul(c)} 풀면 $x=${x}$이다.\n따라서 작년 남학생은 $${x}$명이다.`,
        facts: { a, b, x, y, c, T },
      };
    }),
  ),

  def("18", "원가 정가에 대한 문제", SEC.증감, "응용", (rng) =>
    attempt(80, () => {
      const x = intBetween(rng, 2, 20) * 1000;
      const m = pick(rng, [20, 25, 30, 40] as const);
      const gain = (x * m) / 100;
      const dMax = Math.floor(gain / 100) - 1;
      if (dMax < 1) return null;
      const d = intBetween(rng, 1, dMax) * 100;
      const p = gain - d;
      if (p <= 0) return null;
      return {
        content: `원가에 $${m}\\%$의 이익을 붙여 정가를 정한 상품이 팔리지 않아 정가에서 $${d}$원을 할인하여 팔았더니 $${p}$원의 이익이 생겼다. 이 상품의 원가를 구하시오.`,
        answer: `$${x}$원`,
        solution: `원가를 $x$원이라 하면 정가는 $\\left(1+\\dfrac{${m}}{100}\\right)x$원이다.\n(판매가)$-$(원가)$=$(이익)이므로 $\\dfrac{${m}}{100}x-${d}=${p}$이다.\n풀면 $x=${x}$이므로 원가는 $${x}$원이다.`,
        facts: { x, m, d, p },
      };
    }),
  ),

  // ── (거리, 속력, 시간) ───────────────────────────────
  def(
    "11",
    "거리 속력 시간에 대한 문제 속력이 바뀌는 경우",
    SEC.거리,
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
      const d = j * v1 * v2;
      const t = j * (v1 + v2);
      return {
        content: `등산을 하는데 올라갈 때는 시속 $${v1}\\,\\mathrm{km}$로, 내려올 때는 같은 길을 시속 $${v2}\\,\\mathrm{km}$로 걸어서 모두 $${t}$시간이 걸렸다. 올라간 거리를 구하시오.`,
        answer: `$${d}\\,\\mathrm{km}$`,
        solution: `올라간 거리를 $x\\,\\mathrm{km}$라 하면 $\\dfrac{x}{${v1}}+\\dfrac{x}{${v2}}=${t}$이다.\n양변에 $${v1 * v2}$${nEul(v1 * v2)} 곱하여 풀면 $x=${d}$이다.\n따라서 올라간 거리는 $${d}\\,\\mathrm{km}$이다.`,
        facts: { v1, v2, d, t },
      };
    },
  ),

  def(
    "12",
    "거리 속력 시간에 대한 문제 시간 차가 발생하는 경우",
    SEC.거리,
    "심화",
    (rng) => {
      const [v1, v2, coef] = pick(rng, [
        [3, 4, 5],
        [4, 6, 5],
        [5, 6, 2],
        [6, 10, 4],
      ] as const);
      const d = intBetween(rng, 2, 6);
      const k = coef * d;
      return {
        content: `집과 도서관 사이를 왕복하는데 갈 때는 시속 $${v1}\\,\\mathrm{km}$로, 올 때는 같은 길을 시속 $${v2}\\,\\mathrm{km}$로 걸었더니 올 때가 갈 때보다 $${k}$분 덜 걸렸다. 집과 도서관 사이의 거리를 구하시오.`,
        answer: `$${d}\\,\\mathrm{km}$`,
        solution: `집과 도서관 사이의 거리를 $x\\,\\mathrm{km}$라 하면 $\\dfrac{x}{${v1}}-\\dfrac{x}{${v2}}=\\dfrac{${k}}{60}$이다.\n풀면 $x=${d}$이므로 거리는 $${d}\\,\\mathrm{km}$이다.`,
        facts: { v1, v2, d, k },
      };
    },
  ),

  def(
    "13",
    "거리 속력 시간에 대한 문제 시간 차를 두고 출발하는 경우",
    SEC.거리,
    "심화",
    (rng) =>
      attempt(300, () => {
        const u = pick(rng, [40, 50, 60, 80] as const);
        const du = pick(rng, [20, 30, 40] as const);
        const x = intBetween(rng, 4, 20);
        if ((du * x) % u !== 0) return null;
        const t = (du * x) / u;
        if (t < 2 || t > 30) return null;
        const w = u + du;
        return {
          content: `동생이 분속 $${u}\\,\\mathrm{m}$로 걸어서 집을 나선 지 $${t}$분 후에 형이 분속 $${w}\\,\\mathrm{m}$로 같은 길을 따라갔다. 형이 출발한 지 몇 분 후에 동생을 만나는지 구하시오.`,
          answer: `$${x}$분 후`,
          solution: `형이 출발한 지 $x$분 후에 만난다고 하면 두 사람이 이동한 거리가 같으므로 $${u}(${t}+x)=${w}x$이다.\n정리하여 풀면 $x=${x}$이다.\n따라서 형이 출발한 지 $${x}$분 후에 만난다.`,
          facts: { u, w, t, x },
        };
      }),
  ),

  def(
    "14",
    "거리 속력 시간에 대한 문제 마주 보고 가거나 둘레를 도는 경우",
    SEC.거리,
    "응용",
    (rng) => {
      const t = intBetween(rng, 4, 15);
      const p = intBetween(rng, 5, 9) * 10;
      const q = intBetween(rng, 5, 9) * 10;
      const C = (p + q) * t;
      return {
        content: `둘레의 길이가 $${C}\\,\\mathrm{m}$인 호수의 같은 지점에서 두 사람이 동시에 반대 방향으로 출발하였다. 한 사람은 분속 $${p}\\,\\mathrm{m}$로, 다른 사람은 분속 $${q}\\,\\mathrm{m}$로 걸을 때, 두 사람은 출발한 지 몇 분 후에 처음으로 다시 만나는지 구하시오.`,
        answer: `$${t}$분 후`,
        solution: `$x$분 후에 처음 만난다고 하면 두 사람이 걸은 거리의 합이 둘레의 길이와 같으므로 $${p}x+${q}x=${C}$이다.\n$${p + q}x=${C}$이므로 $x=${t}$이다.\n따라서 $${t}$분 후에 처음으로 다시 만난다.`,
        facts: { t, p, q, C },
      };
    },
  ),

  def(
    "22",
    "거리 속력 시간에 대한 문제 기차가 다리 또는 터널을 지나는 경우",
    SEC.거리,
    "심화",
    (rng) =>
      attempt(120, () => {
        const v = pick(rng, [15, 20, 25, 30] as const);
        const L = intBetween(rng, 5, 15) * 20;
        const t1 = intBetween(rng, 20, 40);
        const t2 = intBetween(rng, 20, 40);
        if (t1 === t2) return null;
        const B1 = v * t1 - L;
        const B2 = v * t2 - L;
        if (B1 <= L || B2 <= L) return null;
        return {
          content: `일정한 속력으로 달리는 기차가 길이 $${B1}\\,\\mathrm{m}$인 다리를 완전히 지나는 데 $${t1}$초가 걸리고, 길이 $${B2}\\,\\mathrm{m}$인 터널을 완전히 지나는 데 $${t2}$초가 걸린다. 이 기차의 길이를 구하시오.`,
          answer: `$${L}\\,\\mathrm{m}$`,
          solution: `기차의 길이를 $x\\,\\mathrm{m}$라 하면 속력이 일정하므로 $\\dfrac{${B1}+x}{${t1}}=\\dfrac{${B2}+x}{${t2}}$이다.\n풀면 $x=${L}$이므로 기차의 길이는 $${L}\\,\\mathrm{m}$이다.`,
          facts: { v, L, t1, t2, B1, B2 },
        };
      }),
  ),

  // ── (도형, 농도, 일) ─────────────────────────────────
  def("07", "도형에 대한 문제", SEC.도형, "기본", (rng) => {
    const h = intBetween(rng, 4, 15);
    const d = intBetween(rng, 2, 8);
    const w = h + d;
    const P = 2 * (w + h);
    return {
      content: `가로의 길이가 세로의 길이보다 $${d}\\,\\mathrm{cm}$만큼 더 긴 직사각형의 둘레의 길이가 $${P}\\,\\mathrm{cm}$일 때, 세로의 길이를 구하시오.`,
      answer: `$${h}\\,\\mathrm{cm}$`,
      solution: `세로의 길이를 $x\\,\\mathrm{cm}$라 하면 가로의 길이는 $(x+${d})\\,\\mathrm{cm}$이다.\n$2\\{(x+${d})+x\\}=${P}$${nEul(P)} 풀면 $x=${h}$이다.\n따라서 세로의 길이는 $${h}\\,\\mathrm{cm}$이다.`,
      facts: { h, d, w, P },
    };
  }),

  def(
    "15",
    "농도에 대한 문제 물을 넣거나 증발시키는 경우",
    SEC.도형,
    "응용",
    (rng) => {
      const C = pick(rng, [4, 5, 6, 8, 10] as const);
      const A = C + intBetween(rng, 2, 6);
      const m = intBetween(rng, 20, 60);
      const B = C * m;
      const W = m * (A - C);
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$이 있다. 여기에 물을 몇 $\\mathrm{g}$ 더 넣으면 $${C}\\%$의 소금물이 되는지 구하시오.`,
        answer: `$${W}\\,\\mathrm{g}$`,
        solution: `물을 $x\\,\\mathrm{g}$ 더 넣는다고 하면 소금의 양은 변하지 않으므로 $\\dfrac{${A}}{100}\\times${B}=\\dfrac{${C}}{100}\\times(${B}+x)$이다.\n풀면 $x=${W}$이므로 물을 $${W}\\,\\mathrm{g}$ 더 넣어야 한다.`,
        facts: { A, B, C, W },
      };
    },
  ),

  def("16", "농도에 대한 문제 소금을 더 넣는 경우", SEC.도형, "심화", (rng) =>
    attempt(400, () => {
      const A = pick(rng, [5, 8, 10] as const);
      const C = pick(rng, [10, 20, 25] as const);
      if (C <= A) return null;
      const s = intBetween(rng, 5, 60);
      const num = s * (100 - C);
      if (num % (C - A) !== 0) return null;
      const B = num / (C - A);
      if (B < 50 || B > 600) return null;
      return {
        content: `$${A}\\%$의 소금물 $${B}\\,\\mathrm{g}$이 있다. 여기에 소금을 몇 $\\mathrm{g}$ 더 넣으면 $${C}\\%$의 소금물이 되는지 구하시오.`,
        answer: `$${s}\\,\\mathrm{g}$`,
        solution: `소금을 $x\\,\\mathrm{g}$ 더 넣는다고 하면 $\\dfrac{${A}}{100}\\times${B}+x=\\dfrac{${C}}{100}\\times(${B}+x)$이다.\n풀면 $x=${s}$이므로 소금을 $${s}\\,\\mathrm{g}$ 더 넣어야 한다.`,
        facts: { A, B, C, s },
      };
    }),
  ),

  def(
    "17",
    "농도에 대한 문제 농도가 다른 두 소금물을 섞는 경우",
    SEC.도형,
    "심화",
    (rng) =>
      attempt(400, () => {
        const a = pick(rng, [6, 8, 10, 12, 15] as const);
        const b = pick(rng, [2, 3, 4, 5, 6] as const);
        if (b + 1 > a - 1) return null; // 사이 농도가 설 자리가 없다 (a=6,b=5 등)
        const c = intBetween(rng, b + 1, a - 1);
        const T = pick(rng, [200, 300, 400, 500, 600] as const);
        const num = T * (c - b);
        if (num % (a - b) !== 0) return null;
        const x = num / (a - b);
        if (x < 50 || x > T - 50) return null;
        return {
          content: `$${a}\\%$의 소금물과 $${b}\\%$의 소금물을 섞어서 $${c}\\%$의 소금물 $${T}\\,\\mathrm{g}$을 만들려고 한다. $${a}\\%$의 소금물은 몇 $\\mathrm{g}$ 섞어야 하는지 구하시오.`,
          answer: `$${x}\\,\\mathrm{g}$`,
          solution: `$${a}\\%$의 소금물을 $x\\,\\mathrm{g}$ 섞는다고 하면 $${b}\\%$의 소금물은 $(${T}-x)\\,\\mathrm{g}$이다.\n소금의 양에서 $\\dfrac{${a}}{100}x+\\dfrac{${b}}{100}(${T}-x)=\\dfrac{${c}}{100}\\times${T}$이다.\n풀면 $x=${x}$이므로 $${a}\\%$의 소금물은 $${x}\\,\\mathrm{g}$ 섞어야 한다.`,
          facts: { a, b, c, T, x },
        };
      }),
  ),

  def("19", "일에 대한 문제", SEC.도형, "응용", (rng) => {
    const [a, b, x] = pick(rng, [
      [3, 6, 2],
      [4, 12, 3],
      [6, 12, 4],
      [10, 15, 6],
      [12, 24, 8],
      [6, 30, 5],
      [8, 24, 6],
      [20, 30, 12],
    ] as const);
    return {
      content: `어떤 일을 완성하는 데 $\\mathrm{A}$는 $${a}$일, $\\mathrm{B}$는 $${b}$일이 걸린다. 이 일을 두 사람이 함께 하면 며칠 만에 완성할 수 있는지 구하시오.`,
      answer: `$${x}$일`,
      solution: `전체 일의 양을 $1$이라 하면 $\\mathrm{A}$, $\\mathrm{B}$가 하루에 하는 일의 양은 각각 $\\dfrac{1}{${a}}$, $\\dfrac{1}{${b}}$이다.\n함께 $x$일이 걸린다고 하면 $\\left(\\dfrac{1}{${a}}+\\dfrac{1}{${b}}\\right)x=1$이다.\n풀면 $x=${x}$이므로 $${x}$일 만에 완성할 수 있다.`,
      facts: { a, b, x },
    };
  }),

  // ── (비율, 시계, 규칙) ───────────────────────────────
  def("10", "전체의 양에 대한 문제", SEC.비율, "응용", (rng) => {
    const a = intBetween(rng, 2, 4);
    const b = intBetween(rng, 2, 4);
    const k = intBetween(rng, 6, 30);
    const x = k * a * b;
    const N = k * (a - 1) * (b - 1);
    return {
      content: `어떤 책을 첫째 날에는 전체의 $\\dfrac{1}{${a}}$을 읽고, 둘째 날에는 나머지의 $\\dfrac{1}{${b}}$을 읽었더니 $${N}$쪽이 남았다. 이 책의 전체 쪽수를 구하시오.`,
      answer: `$${x}$쪽`,
      solution: `전체 쪽수를 $x$쪽이라 하면 둘째 날까지 읽고 남은 쪽수는 $x\\left(1-\\dfrac{1}{${a}}\\right)\\left(1-\\dfrac{1}{${b}}\\right)=${N}$이다.\n풀면 $x=${x}$이므로 전체 쪽수는 $${x}$쪽이다.`,
      facts: { a, b, k, x, N },
    };
  }),

  def("21", "규칙을 찾는 문제", SEC.비율, "기본", (rng) => {
    const n = intBetween(rng, 8, 30);
    const M = 2 * n + 1;
    return {
      content: `성냥개비로 정삼각형을 한 줄로 이어 붙여 만들려고 한다. 정삼각형 $1$개를 만들 때는 성냥개비 $3$개가 필요하고, 정삼각형을 $1$개 이어 붙일 때마다 성냥개비가 $2$개씩 더 필요하다. 성냥개비 $${M}$개로 만들 수 있는 정삼각형의 개수를 구하시오.`,
      answer: `$${n}$개`,
      solution: `정삼각형을 $x$개 만든다고 하면 필요한 성냥개비는 $\\{3+2(x-1)\\}$개이다.\n$3+2(x-1)=${M}$${nEul(M)} 풀면 $x=${n}$이다.\n따라서 정삼각형을 $${n}$개 만들 수 있다.`,
      facts: { n, M },
    };
  }),

  def("23", "비례배분으로 전체 구하기", SEC.비율, "기본", (rng) => {
    const a = intBetween(rng, 2, 7);
    const b = intBetween(rng, 2, 7);
    const k = intBetween(rng, 3, 15);
    const part = a * k;
    const total = (a + b) * k;
    return {
      content: `남학생 수와 여학생 수의 비가 $${a}:${b}$인 모둠에서 남학생이 $${part}$명이다. 이 모둠의 전체 학생 수를 구하시오.`,
      answer: `$${total}$명`,
      solution: `비의 한 칸은 $${part}\\div${a}=${k}$(명)이다.\n따라서 전체 학생 수는 $(${a}+${b})\\times${k}=${total}$(명)이다.`,
      facts: { a, b, k, part, total },
    };
  }),

  def("24", "일정량을 더한 뒤의 비", SEC.비율, "응용", (rng) => {
    const a = intBetween(rng, 2, 6);
    const b = intBetween(rng, a + 1, 9);
    const k = intBetween(rng, 3, 12);
    const added = (b - a) * k;
    const first = a * k;
    return {
      content: `두 상자 $\\mathrm{A}$, $\\mathrm{B}$에 들어 있는 공의 수의 비가 $${a}:${b}$이다. $\\mathrm{A}$ 상자에 공을 $${added}$개 더 넣었더니 두 상자의 공의 수가 같아졌다. 처음 $\\mathrm{A}$ 상자에 있던 공의 수를 구하시오.`,
      answer: `$${first}$개`,
      solution: `처음 공의 수를 각각 $${a}x$, $${b}x$라 하면 $${a}x+${added}=${b}x$이다.\n$x=${k}$이므로 처음 $\\mathrm{A}$ 상자의 공은 $${a}\\times${k}=${first}$(개)이다.`,
      facts: { a, b, k, added, first },
    };
  }),

  def("25", "전체에 대한 백분율", SEC.비율, "기본", (rng) => {
    const rate = pick(rng, [20, 25, 40, 50] as const);
    const unit = 100 / rate;
    const used = intBetween(rng, 2, 12) * rate;
    const total = used * unit;
    return {
      content: `어느 창고에 있던 쌀의 $${rate}\\%$를 사용하였더니 사용한 쌀이 $${used}\\,\\mathrm{kg}$이었다. 처음 창고에 있던 쌀의 양을 구하시오.`,
      answer: `$${total}\\,\\mathrm{kg}$`,
      solution: `처음 쌀의 양을 $x\\,\\mathrm{kg}$라 하면 $\\dfrac{${rate}}{100}x=${used}$이다.\n따라서 $x=${total}$이다.`,
      facts: { rate, used, total },
    };
  }),

  def("26", "시계의 분침이 움직인 각", SEC.비율, "기본", (rng) => {
    const minutes = intBetween(rng, 5, 40);
    const angle = minutes * 6;
    return {
      content: `시계의 분침은 $1$분에 $6^{\\circ}$씩 움직인다. 분침이 $${angle}^{\\circ}$ 움직이는 데 걸리는 시간을 구하시오.`,
      answer: `$${minutes}$분`,
      solution: `걸리는 시간을 $x$분이라 하면 $6x=${angle}$이다.\n따라서 $x=${minutes}$이다.`,
      facts: { minutes, angle },
    };
  }),

  def("27", "달력에서 같은 열의 수", SEC.비율, "기본", (rng) => {
    const top = intBetween(rng, 1, 14);
    const rows = intBetween(rng, 2, 3);
    const bottom = top + 7 * rows;
    const sum = ((rows + 1) * (top + bottom)) / 2;
    return {
      content: `달력의 같은 열에서 위에서부터 연속하여 $${rows + 1}$개의 수를 골랐더니 가장 위의 수는 $${top}$이고 각 수는 바로 위의 수보다 $7$씩 크다. 고른 수의 합을 구하시오.`,
      answer: `$${sum}$`,
      solution: `고른 수는 $${Array.from({ length: rows + 1 }, (_, i) => top + 7 * i).join(", ")}$이다.\n따라서 합은 $${sum}$이다.`,
      facts: { top, rows, bottom, sum },
    };
  }),

  def("28", "등차수열 모양의 규칙", SEC.비율, "응용", (rng) => {
    const first = intBetween(rng, 1, 8);
    const diff = intBetween(rng, 2, 7);
    const n = intBetween(rng, 8, 20);
    const value = first + (n - 1) * diff;
    return {
      content: `수 $${first}$에서 시작하여 바로 앞의 수보다 $${diff}$씩 큰 수를 차례로 쓴다. 이 규칙으로 쓴 $${n}$번째 수를 구하시오.`,
      answer: `$${value}$`,
      solution: `$n$번째 수는 $${first}+${diff}(n-1)$이다.\n따라서 $${n}$번째 수는 $${first}+${diff}\\times${n - 1}=${value}$이다.`,
      facts: { first, diff, n, value },
    };
  }),

  def("29", "정사각형을 이어 붙인 규칙", SEC.비율, "응용", (rng) => {
    const n = intBetween(rng, 4, 18);
    const sticks = 3 * n + 1;
    return {
      content: `성냥개비로 정사각형을 한 줄로 이어 붙인다. 정사각형 $1$개에는 $4$개가 필요하고 하나를 더 이어 붙일 때마다 $3$개씩 더 필요하다. 성냥개비 $${sticks}$개로 만들 수 있는 정사각형의 개수를 구하시오.`,
      answer: `$${n}$개`,
      solution: `정사각형을 $x$개 만들 때 성냥개비는 $4+3(x-1)$개 필요하다.\n$4+3(x-1)=${sticks}$이므로 $x=${n}$이다.`,
      facts: { n, sticks },
    };
  }),

  def("30", "톱니바퀴의 회전수 비", SEC.비율, "심화", (rng) => {
    const a = intBetween(rng, 2, 6) * 5;
    const b = intBetween(rng, 2, 6) * 5;
    const turnsA = intBetween(rng, 3, 12) * b;
    const turnsB = (a * turnsA) / b;
    return {
      content: `서로 맞물린 두 톱니바퀴 $\\mathrm{A}$, $\\mathrm{B}$의 톱니 수는 각각 $${a}$개, $${b}$개이다. $\\mathrm{A}$가 $${turnsA}$바퀴 도는 동안 $\\mathrm{B}$가 도는 바퀴 수를 구하시오.`,
      answer: `$${turnsB}$바퀴`,
      solution: `두 톱니바퀴가 맞물려 움직인 톱니 수는 같으므로 $${a}\\times${turnsA}=${b}\\times x$이다.\n따라서 $x=${turnsB}$이다.`,
      facts: { a, b, turnsA, turnsB },
    };
  }),

  def("31", "증가한 양으로 처음 값 구하기", SEC.증감, "기본", (rng) => {
    const rate = pick(rng, [10, 20, 25, 50] as const);
    const before = intBetween(rng, 4, 20) * 100;
    const after = (before * (100 + rate)) / 100;
    return {
      content: `어느 마을의 인구가 작년보다 $${rate}\\%$ 증가하여 올해 $${after}$명이 되었다. 작년의 인구를 구하시오.`,
      answer: `$${before}$명`,
      solution: `작년 인구를 $x$명이라 하면 $\\dfrac{${100 + rate}}{100}x=${after}$이다.\n따라서 $x=${before}$이다.`,
      facts: { rate, before, after },
    };
  }),

  def("32", "감소한 양으로 처음 값 구하기", SEC.증감, "기본", (rng) => {
    const rate = pick(rng, [10, 20, 25, 40] as const);
    const before = intBetween(rng, 4, 20) * 100;
    const after = (before * (100 - rate)) / 100;
    return {
      content: `어느 공장의 생산량이 지난달보다 $${rate}\\%$ 감소하여 이번 달 $${after}$개가 되었다. 지난달의 생산량을 구하시오.`,
      answer: `$${before}$개`,
      solution: `지난달 생산량을 $x$개라 하면 $\\dfrac{${100 - rate}}{100}x=${after}$이다.\n따라서 $x=${before}$이다.`,
      facts: { rate, before, after },
    };
  }),

  def("33", "이익률과 판매가", SEC.증감, "응용", (rng) => {
    const rate = pick(rng, [10, 20, 25, 50] as const);
    const cost = intBetween(rng, 4, 20) * 1000;
    const sale = (cost * (100 + rate)) / 100;
    return {
      content: `어떤 물건을 원가의 $${rate}\\%$의 이익을 남기고 $${sale}$원에 팔았다. 이 물건의 원가를 구하시오.`,
      answer: `$${cost}$원`,
      solution: `원가를 $x$원이라 하면 판매가는 $\\dfrac{${100 + rate}}{100}x$원이다.\n$\\dfrac{${100 + rate}}{100}x=${sale}$이므로 $x=${cost}$이다.`,
      facts: { rate, cost, sale },
    };
  }),

  def("34", "할인율과 정가", SEC.증감, "응용", (rng) => {
    const rate = pick(rng, [10, 20, 25, 40] as const);
    const price = intBetween(rng, 4, 20) * 1000;
    const sale = (price * (100 - rate)) / 100;
    return {
      content: `정가에서 $${rate}\\%$ 할인하여 $${sale}$원에 판매한 상품이 있다. 이 상품의 정가를 구하시오.`,
      answer: `$${price}$원`,
      solution: `정가를 $x$원이라 하면 $\\dfrac{${100 - rate}}{100}x=${sale}$이다.\n따라서 $x=${price}$이다.`,
      facts: { rate, price, sale },
    };
  }),

  def("35", "연속한 증가와 감소", SEC.증감, "심화", (rng) =>
    attempt(200, () => {
      const up = pick(rng, [20, 25, 50] as const);
      const down = pick(rng, [20, 25, 40] as const);
      const before = intBetween(rng, 4, 16) * 100;
      const after = (before * (100 + up) * (100 - down)) / 10000;
      // 제품 개수는 정수여야 한다 — $25\%$ 올렸다 $25\%$ 내리면 $\frac{15}{16}$ 배라
      // $700$개가 $656.25$개가 된다. 값은 맞고 **지면만 말이 안 된다**.
      if (!Number.isInteger(after)) return null;
      return {
        content: `어떤 제품의 생산량이 첫 달에는 $${up}\\%$ 증가하고 다음 달에는 $${down}\\%$ 감소하여 $${after}$개가 되었다. 증가하기 전 생산량을 구하시오.`,
        answer: `$${before}$개`,
        solution: `증가하기 전 생산량을 $x$개라 하면 $x\\times\\dfrac{${100 + up}}{100}\\times\\dfrac{${100 - down}}{100}=${after}$이다.\n따라서 $x=${before}$이다.`,
        facts: { up, down, before, after },
      };
    }),
  ),

  def("36", "부가세가 포함된 가격", SEC.증감, "응용", (rng) => {
    const rate = pick(rng, [5, 10, 20] as const);
    const before = intBetween(rng, 4, 20) * 1000;
    const included = (before * (100 + rate)) / 100;
    return {
      content: `어떤 물건의 세전 가격에 $${rate}\\%$의 세금을 더한 가격이 $${included}$원이다. 이 물건의 세전 가격을 구하시오.`,
      answer: `$${before}$원`,
      solution: `세전 가격을 $x$원이라 하면 $\\dfrac{${100 + rate}}{100}x=${included}$이다.\n따라서 $x=${before}$이다.`,
      facts: { rate, before, included },
    };
  }),

  def("37", "불량률을 제외한 제품 수", SEC.증감, "기본", (rng) => {
    const rate = pick(rng, [5, 10, 20, 25] as const);
    const total = intBetween(rng, 4, 20) * 100;
    const good = (total * (100 - rate)) / 100;
    return {
      content: `생산한 제품 중 $${rate}\\%$가 불량품이고 정상 제품은 $${good}$개이다. 생산한 제품의 전체 개수를 구하시오.`,
      answer: `$${total}$개`,
      solution: `전체 제품을 $x$개라 하면 정상 제품은 $\\dfrac{${100 - rate}}{100}x$개이다.\n$\\dfrac{${100 - rate}}{100}x=${good}$이므로 $x=${total}$이다.`,
      facts: { rate, total, good },
    };
  }),

  def("38", "일부를 쓰고 남은 양", SEC.증감, "응용", (rng) => {
    const firstRate = pick(rng, [10, 20, 25] as const);
    const secondRate = pick(rng, [10, 20, 25] as const);
    const total = intBetween(rng, 4, 20) * 100;
    const spent = (total * (firstRate + secondRate)) / 100;
    const left = total - spent;
    return {
      content: `예산의 $${firstRate}\\%$를 교재비로, 전체 예산의 $${secondRate}\\%$를 준비물비로 사용하였더니 $${left}$원이 남았다. 처음 예산을 구하시오.`,
      answer: `$${total}$원`,
      solution: `처음 예산을 $x$원이라 하면 남은 돈은 $\\dfrac{${100 - firstRate - secondRate}}{100}x$원이다.\n$\\dfrac{${100 - firstRate - secondRate}}{100}x=${left}$이므로 $x=${total}$이다.`,
      facts: { firstRate, secondRate, total, spent, left },
    };
  }),

  // ── 39~44 「나이, 과부족, 예금」을 10유형으로 채운 몫 (갈래 D) ──
  // 이 소단원은 **연산이 없다** — 「식이 따로 주어지고 지시가 하나」인 모양이
  // 활용 문제에는 성립하지 않는다(상황이 곧 발문이다). 배분은 사다리 대체가
  // 메운다. 그래서 기본 5 · 응용 4 · 심화 1 로 채운다.

  def("39", "두 사람의 나이의 합과 차", SEC.나이, "기본", (rng) =>
    attempt(80, () => {
      const younger = intBetween(rng, 8, 30);
      const gap = intBetween(rng, 2, 12);
      const older = younger + gap;
      const sum = older + younger;
      return {
        content: `형과 동생의 나이의 합은 $${sum}$세이고, 형은 동생보다 $${gap}$세 많다. 형의 나이를 구하시오.`,
        answer: `$${older}$세`,
        solution: `동생의 나이를 $x$세라 하면 형의 나이는 $(x+${gap})$세이다.\n$x+(x+${gap})=${sum}$이므로 $x=${younger}$이다.\n따라서 형의 나이는 $${younger}+${gap}=${older}$(세)이다.`,
        facts: { older, younger, gap, sum },
      };
    }),
  ),

  def("40", "몇 년 전에 몇 배였나", SEC.나이, "기본", (rng) =>
    attempt(120, () => {
      const child = intBetween(rng, 12, 20);
      const m = intBetween(rng, 3, 6);
      const k = intBetween(rng, 2, 8); // k년 전
      if (child - k < 4) return null;
      const parent = m * (child - k) + k;
      if (parent - child < 22 || parent > 60) return null;
      return {
        content: `현재 어머니의 나이는 $${parent}$세, 딸의 나이는 $${child}$세이다. 어머니의 나이가 딸의 나이의 $${m}$배였던 것은 몇 년 전인지 구하시오.`,
        answer: `$${k}$년 전`,
        solution: `$x$년 전에 $${m}$배였다고 하면 $${parent}-x=${m}(${child}-x)$이다.\n정리하여 풀면 $x=${k}$이다.\n따라서 $${k}$년 전이다.`,
        facts: { parent, child, m, k },
      };
    }),
  ),

  def("41", "예금액이 같아지는 때", SEC.나이, "기본", (rng) =>
    attempt(120, () => {
      const n = intBetween(rng, 3, 15);
      const p = intBetween(rng, 2, 8) * 500; // 적게 든 쪽이 더 많이 넣는다
      const q = intBetween(rng, 1, 5) * 500;
      if (p <= q) return null;
      const b0 = intBetween(rng, 10, 40) * 1000;
      const a0 = b0 + (q - p) * n;
      if (a0 <= 0 || a0 >= b0) return null;
      return {
        content: `현재 지호의 예금액은 $${a0}$원, 서연이의 예금액은 $${b0}$원이다. 다음 달부터 매달 지호는 $${p}$원씩, 서연이는 $${q}$원씩 예금한다면 두 사람의 예금액이 같아지는 것은 몇 개월 후인지 구하시오.`,
        answer: `$${n}$개월 후`,
        solution: `$x$개월 후에 같아진다고 하면 $${a0}+${p}x=${b0}+${q}x$이다.\n정리하여 풀면 $x=${n}$이다.\n따라서 $${n}$개월 후이다.`,
        facts: { a0, b0, p, q, n },
      };
    }),
  ),

  def("42", "과부족에서 물건의 개수 구하기", SEC.나이, "기본", (rng) =>
    attempt(120, () => {
      const n = intBetween(rng, 5, 20); // 사람 수
      const a = intBetween(rng, 2, 6);
      const b = a + intBetween(rng, 1, 2);
      const r = intBetween(rng, 1, a);
      const s = (b - a) * n - r;
      if (s < 1) return null;
      const total = a * n + r;
      return {
        content: `사탕을 학생들에게 나누어 주려고 한다. 한 학생에게 $${a}$개씩 주면 $${r}$개가 남고, $${b}$개씩 주면 $${s}$개가 모자란다. 사탕의 개수를 구하시오.`,
        answer: `$${total}$개`,
        solution: `학생 수를 $x$명이라 하면 사탕의 수는 같으므로 $${a}x+${r}=${b}x-${s}$이다.\n정리하여 풀면 $x=${n}$이다.\n따라서 사탕은 $${a}\\times${n}+${r}=${total}$(개)이다.`,
        facts: { n, a, b, r, s, total },
      };
    }),
  ),

  def("43", "목표액에 도달하는 때", SEC.나이, "기본", (rng) =>
    attempt(80, () => {
      const n = intBetween(rng, 4, 20);
      const p = intBetween(rng, 2, 10) * 1000;
      const a0 = intBetween(rng, 5, 30) * 1000;
      const target = a0 + p * n;
      return {
        content: `현재 통장에 $${a0}$원이 들어 있다. 다음 달부터 매달 $${p}$원씩 예금할 때, 예금액이 처음으로 $${target}$원이 되는 것은 몇 개월 후인지 구하시오.`,
        answer: `$${n}$개월 후`,
        solution: `$x$개월 후의 예금액은 $(${a0}+${p}x)$원이다.\n$${a0}+${p}x=${target}$이므로 $x=${n}$이다.\n따라서 $${n}$개월 후이다.`,
        facts: { a0, p, n, target },
      };
    }),
  ),

  def("44", "두 자녀의 나이의 합", SEC.나이, "응용", (rng) =>
    attempt(200, () => {
      const c1 = intBetween(rng, 6, 14);
      const c2 = c1 + intBetween(rng, 1, 6);
      const m = intBetween(rng, 2, 3);
      const k = intBetween(rng, 3, 15); // k년 후
      const parent = m * (c1 + c2 + 2 * k) - k;
      if (parent - c2 < 22 || parent > 60) return null;
      return {
        content: `현재 아버지의 나이는 $${parent}$세이고 두 자녀의 나이는 각각 $${c1}$세, $${c2}$세이다. 아버지의 나이가 두 자녀의 나이의 합의 $${m}$배가 되는 것은 몇 년 후인지 구하시오.`,
        answer: `$${k}$년 후`,
        solution: `$x$년 후라 하면 아버지는 $(${parent}+x)$세, 두 자녀의 나이의 합은 $(${c1 + c2}+2x)$세이다.\n$${parent}+x=${m}(${c1 + c2}+2x)$를 정리하여 풀면 $x=${k}$이다.\n따라서 $${k}$년 후이다.`,
        facts: { parent, c1, c2, m, k },
      };
    }),
  ),

  // ── 45~50 「수」를 10유형으로 채운 몫 (갈래 D) ──
  // 여기도 연산은 안 만든다(39~44 머리말 참조). 기본 5 · 응용 4 · 심화 1.

  def("45", "연속하는 두 짝수 홀수", SEC.수, "기본", (rng) => {
    const even = intBetween(rng, 0, 1) === 0;
    const small = even
      ? intBetween(rng, 1, 24) * 2
      : intBetween(rng, 0, 24) * 2 + 1;
    const big = small + 2;
    const sum = small + big;
    const word = even ? "짝" : "홀";
    return {
      content: `연속하는 두 ${word}수의 합이 $${sum}$일 때, 두 수 중 큰 수를 구하시오.`,
      answer: `$${big}$`,
      solution: `작은 수를 $x$라 하면 큰 수는 $(x+2)$이다.\n$x+(x+2)=${sum}$이므로 $x=${small}$이다.\n따라서 큰 수는 $${small}+2=${big}$이다.`,
      facts: { small, big, sum, even: even ? 1 : 0 },
    };
  }),

  def("46", "어떤 수의 일부에 대한 조건", SEC.수, "기본", (rng) =>
    attempt(120, () => {
      const [a, b] = pick(rng, PROPER_UNIT_FRACS);
      const t = intBetween(rng, 2, 12);
      const x = b * t; // 어떤 수 — 분수를 곱해도 정수가 되게 잡는다
      const c = intBetween(rng, 2, 20);
      const d = a * t + c;
      return {
        content: `어떤 수의 $\\dfrac{${a}}{${b}}$보다 $${c}$만큼 큰 수는 $${d}$이다. 어떤 수를 구하시오.`,
        answer: `$${x}$`,
        solution: `어떤 수를 $x$라 하면 $\\dfrac{${a}}{${b}}x+${c}=${d}$이다.\n정리하여 풀면 $x=${x}$이다.`,
        facts: { a, b, c, d, x },
      };
    }),
  ),

  def("47", "잘못 계산한 수", SEC.수, "응용", (rng) =>
    attempt(80, () => {
      const a = intBetween(rng, 3, 12);
      const x = intBetween(rng, 2, 20);
      const wrong = a * x;
      const right = x + a;
      return {
        content: `어떤 수에 $${a}$${nEul(a)} 더해야 할 것을 잘못하여 $${a}$${nEul(a)} 곱했더니 $${wrong}$이 되었다. 바르게 계산한 답을 구하시오.`,
        answer: `$${right}$`,
        solution: `어떤 수를 $x$라 하면 $${a}x=${wrong}$이므로 $x=${x}$이다.\n따라서 바르게 계산한 답은 $${x}+${a}=${right}$이다.`,
        facts: { a, x, wrong, right },
      };
    }),
  ),

  def("48", "두 수의 차와 배수 관계", SEC.수, "응용", (rng) =>
    attempt(80, () => {
      const m = intBetween(rng, 2, 6);
      const small = intBetween(rng, 2, 20);
      const big = m * small;
      const d = big - small;
      return {
        content: `두 자연수의 차가 $${d}$이고, 큰 수는 작은 수의 $${m}$배이다. 큰 수를 구하시오.`,
        answer: `$${big}$`,
        solution: `작은 수를 $x$라 하면 큰 수는 $${m}x$이다.\n$${m}x-x=${d}$이므로 $x=${small}$이다.\n따라서 큰 수는 $${m}\\times${small}=${big}$이다.`,
        facts: { m, small, big, d },
      };
    }),
  ),

  def("49", "연속하는 세 자연수의 조건", SEC.수, "응용", (rng) =>
    attempt(120, () => {
      const n = intBetween(rng, 2, 20);
      // 🔴 $m=2$ 는 못 쓴다 — $2(n+2)-(2n+1)=3$ 이라 **$n$ 과 무관하게 항상 $3$** 이다.
      //    그러면 「가장 작은 수」가 하나로 안 정해진다(답이 무수히 많다).
      //    값은 맞고 발문만 성립하지 않는 부류라 값 검산으로는 안 잡힌다.
      const m = intBetween(rng, 3, 5);
      const c = m * (n + 2) - (2 * n + 1);
      if (c < 1) return null;
      return {
        content: `연속하는 세 자연수가 있다. 가장 큰 수의 $${m}$배가 나머지 두 수의 합보다 $${c}$만큼 클 때, 가장 작은 수를 구하시오.`,
        answer: `$${n}$`,
        solution: `가장 작은 수를 $x$라 하면 세 수는 $x$, $(x+1)$, $(x+2)$이다.\n$${m}(x+2)-\\{x+(x+1)\\}=${c}$${nEul(c)} 정리하여 풀면 $x=${n}$이다.`,
        facts: { n, m, c },
      };
    }),
  ),

  def("50", "자릿수 배수 관계", SEC.수, "심화", (rng) =>
    attempt(200, () => {
      const ones = intBetween(rng, 1, 4);
      const m = intBetween(rng, 2, 9);
      const tens = m * ones;
      if (tens > 9) return null;
      const N = 10 * tens + ones;
      const d = 9 * ones * (m - 1);
      if (d < 1) return null;
      return {
        content: `두 자리 자연수에서 십의 자리의 숫자는 일의 자리의 숫자의 $${m}$배이고, 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $${d}$만큼 작다. 처음 수를 구하시오.`,
        answer: `$${N}$`,
        solution: `일의 자리의 숫자를 $x$라 하면 십의 자리의 숫자는 $${m}x$이므로 처음 수는 $${10 * m + 1}x$, 바꾼 수는 $${10 + m}x$이다.\n$${10 * m + 1}x-${10 + m}x=${d}$이므로 $x=${ones}$이다.\n따라서 처음 수는 $${N}$이다.`,
        facts: { ones, m, tens, N, d },
      };
    }),
  ),
];
