/**
 * 중2 RPM 2-2 「경우의 수」 — 세션 2A-중2수확률 소유
 * (docs/planning/tracks/middle-engine-wave2-plan.md §1).
 *
 * 등록: 01~16 (16유형 전량).
 *
 * 15 「색칠하는 경우의 수」는 FigureSpec v2 **채색 축**(`regions`)이 main 에 들어온
 * 뒤에 냈다(세션 2E, 2026-08-23). 도형은 `m2Shade.ts` 가 만들고, **그림이 곧
 * 검산**이다 — 테스트가 `figureSpec` 의 영역 경계에서 이웃 관계를 되읽어
 * 색칠 가짓수를 전수 나열로 세고 정답과 맞댄다.
 *
 * 우리 단원 배정 (공유 DB Unit.section 실측 2026-08-23):
 *   경우의 수(36) ← 01~07 · 여러 가지 경우의 수(254) ← 08~14·16
 *
 * 16 최단거리는 FigureSpec v2 격자(실렌더 검증 2026-08-23,
 * `C:/tmp/probe-round2.py` — mid23-engine-upgrade-review.md)를 쓴다.
 *
 * 계약(1차 물결 브리프 그대로): 정답 역산(닫힌 식) · facts 원 수치 ·
 * 숫자는 $...$ 안 · attempt 소진 시 던짐. 테스트는 **전수 나열**(순열 나열·
 * 격자 DP·동전 삼중 루프)로 따로 검산한다 — 생성기는 공식, 테스트는 나열.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import {
  PART_LETTERS,
  shadeAdjacency,
  shadeParts,
  shadePartsSpec,
  type ShadeShape,
} from "./m2Shade";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR = "경우의 수";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  경우의수: "경우의 수",
  여러가지: "여러 가지 경우의 수",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

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

// ── 조합 소품 (생성기 쪽 — 테스트는 나열로 잰다) ─────────

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function fact(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

function perm(n: number, r: number): number {
  let out = 1;
  for (let i = 0; i < r; i += 1) out *= n - i;
  return out;
}

function comb(n: number, r: number): number {
  return perm(n, r) / fact(r);
}

/** 거듭제곱 `b^{e}` — 지수가 $1$ 이면 밑만 적는다(「$2^{1}\times6^{2}$」가 아니라 「$2\times6^{2}$」). */
function powTex(b: number, e: number): string {
  return e === 1 ? `${b}` : `${b}^{${e}}`;
}

/** 자연수 r 을 자리 수 낱말로 — 두 자리·세 자리. */
function digitWord(r: number): string {
  return r === 2 ? "두 자리" : "세 자리";
}

/** 1~6 눈 중 q 의 약수의 개수 — 주사위 약수 표. */
function diceDivisors(q: number): number {
  let cnt = 0;
  for (let e = 1; e <= 6; e += 1) {
    if (q % e === 0) cnt += 1;
  }
  return cnt;
}

// ── 유형 16 격자 그림 — FigureSpec v2 (실렌더 검증 스펙과 같은 짜임) ──

const GRID_STEP = 45;
const GRID_X0 = 20;
const GRID_Y0 = 30;

/**
 * m×n 격자 도로망 스펙 — A 는 왼쪽 아래, B 는 오른쪽 위.
 * via 가 있으면 그 교차점에 P 라벨을 단다.
 */
export function gridFigureSpec(
  m: number,
  n: number,
  via: { px: number; py: number } | null,
): Record<string, unknown> {
  const points: Record<string, [number, number]> = {};
  for (let x = 0; x <= m; x += 1) {
    for (let y = 0; y <= n; y += 1) {
      points[`P${x}${y}`] = [
        GRID_X0 + x * GRID_STEP,
        GRID_Y0 + (n - y) * GRID_STEP,
      ];
    }
  }
  const segments: Record<string, [string, string]> = {};
  for (let y = 0; y <= n; y += 1) segments[`h${y}`] = [`P0${y}`, `P${m}${y}`];
  for (let x = 0; x <= m; x += 1) segments[`v${x}`] = [`P${x}0`, `P${x}${n}`];
  const labels: Record<string, string> = { P00: "A", [`P${m}${n}`]: "B" };
  if (via) labels[`P${via.px}${via.py}`] = "P";
  // 지점 표시 — RPM 원본 지면도 A·B·P 교차점에 점을 찍는다.
  // 이게 없으면 라벨이 칸 안쪽으로 밀려 «어느 교차점인가»가
  // 애매해진다 (2026-08-23 실렌더로 둘을 견줘 고른 것).
  const marks: Record<string, { center: string; radius: number }> = {
    mA: { center: "P00", radius: 2 },
    mB: { center: `P${m}${n}`, radius: 2 },
  };
  if (via) marks.mP = { center: `P${via.px}${via.py}`, radius: 2 };
  return { version: 2, points, segments, labels, circles: marks };
}

// ── 유형 15 색칠하기 소품 ────────────────────────────

/** 발문에 늘어놓는 색 이름 — 앞에서부터 `n` 개를 쓴다. */
const SHADE_COLORS = [
  "빨간색",
  "노란색",
  "파란색",
  "초록색",
  "보라색",
  "주황색",
] as const;

/** 부분 개수를 세는 우리말 수 — 「네 부분」. 아라비아 숫자로 쓰지 않는다. */
const PART_WORD: Record<number, string> = { 3: "세", 4: "네", 5: "다섯" };

/** 도형을 가리키는 말 — 그림의 생김새와 맞춘다. */
const SHAPE_NOUN: Record<ShadeShape, string> = {
  disc: "원",
  strip: "직사각형",
  fan: "직사각형",
  wheel: "도형",
};

/** `facts` 에 남길 도형 종류 코드 (facts 는 수만 담는다). */
const SHAPE_CODE: Record<ShadeShape, number> = {
  disc: 0,
  strip: 1,
  fan: 2,
  wheel: 3,
};

/** 「모두 다른 색」에 쓰는 (도형, 나눈 수) — 이웃 관계와 무관하므로 전부 쓴다. */
const DISTINCT_PAIRS: readonly (readonly [ShadeShape, number])[] = [
  ["disc", 3],
  ["disc", 4],
  ["disc", 5],
  ["strip", 3],
  ["strip", 4],
  ["strip", 5],
  ["fan", 3],
  ["fan", 4],
  ["wheel", 3],
  ["wheel", 4],
];

/**
 * 「이웃만 다르게」에 쓰는 (도형, 나눈 수) 와 색의 최소 개수.
 *
 * 아무 도형이나 못 쓴다 — A 부터 차례로 칠할 때 **앞서 칠한 이웃끼리 서로
 * 이웃이어야** 그 색들이 반드시 달라서 「남은 색 가짓수」가 한 수로 정해진다.
 * 원판을 넷 이상으로 나누면(둘레가 사슬) 마주 본 두 부분이 같은 색일 수도
 * 있어 곱셈 하나로 못 센다 — 그래서 원판은 셋만 둔다. `greedyFactors` 가
 * 그 성질을 다시 확인하고 어긋나면 **던진다**(표를 늘리다 조용히 틀리지 않게).
 */
const ADJ_PAIRS: readonly (readonly [ShadeShape, number, number])[] = [
  ["strip", 3, 3],
  ["strip", 4, 3],
  ["strip", 5, 3],
  ["fan", 3, 4],
  ["fan", 4, 4],
  ["disc", 3, 4],
  ["wheel", 3, 5],
];

/**
 * A 부터 차례로 칠할 때 각 부분에 쓸 수 있는 색의 가짓수.
 * 앞서 칠한 이웃들이 서로 이웃이 아니면(=색이 같을 수도 있으면) **던진다**.
 */
function greedyFactors(adj: readonly number[][], n: number): number[] {
  return adj.map((nb, i) => {
    const earlier = nb.filter((j) => j < i);
    for (const a of earlier) {
      for (const b of earlier) {
        if (a !== b && !adj[a]!.includes(b)) {
          throw new Error(
            `색칠 순서 ${i} 의 앞선 이웃 ${a}, ${b} 가 서로 이웃이 아닙니다 — 곱셈 하나로 셀 수 없는 도형입니다`,
          );
        }
      }
    }
    const f = n - earlier.length;
    if (f < 1) {
      throw new Error(`색이 모자랍니다: 부분 ${i} 에 남는 색이 ${f}가지`);
    }
    return f;
  });
}

function product(xs: readonly number[]): number {
  return xs.reduce((a, b) => a * b, 1);
}

/** `$5\times4\times3$` 의 곱셈식 본문 (달러 밖). */
function timesTex(xs: readonly number[]): string {
  return xs.join("\\times");
}

export const M2_COUNTING: TypeEntry[] = [
  // 01 ─────────────────────────────────────────────
  def("01", "경우의 수", SEC.경우의수, "기본", (rng): Body => {
    const kind = pick(rng, [0, 1, 2] as const);
    if (kind === 0) {
      const S = intBetween(rng, 4, 10);
      const ans = 6 - Math.abs(7 - S);
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${S}$인 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `두 눈의 수를 순서쌍으로 나타내어 합이 $${S}$ 인 것을 세면 $${ans}$가지이다.`,
        facts: { kind, S, ans },
      };
    }
    if (kind === 1) {
      const D = intBetween(rng, 1, 4);
      const ans = 2 * (6 - D);
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 차가 $${D}$인 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `두 눈의 수를 순서쌍으로 나타내어 차가 $${D}$ 인 것을 세면 $${ans}$가지이다.`,
        facts: { kind, D, ans },
      };
    }
    const N = intBetween(rng, 15, 30);
    const k = intBetween(rng, 3, 6);
    const ans = Math.floor(N / k);
    return {
      content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 한 장을 뽑을 때, $${k}$의 배수가 적힌 카드가 나오는 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `$1$부터 $${N}$까지의 자연수 중 $${k}$의 배수는 $${k}\\times1$부터 $${k}\\times${ans}$까지 $${ans}$개이다.`,
      facts: { kind, N, k, ans },
    };
  }),

  // 02 ─────────────────────────────────────────────
  def("02", "돈을 지불하는 방법의 수", SEC.경우의수, "심화하", (rng) =>
    attempt(400, (): Body | null => {
      const useBig = pick(rng, [0, 1] as const); // 1: 500원 포함 3종
      const c500 = useBig === 1 ? intBetween(rng, 1, 3) : 0;
      const c100 = intBetween(rng, 3, 8);
      const c50 = intBetween(rng, 4, 8);
      const minOne = useBig === 1 ? pick(rng, [0, 1] as const) : 0;
      const total = 500 * c500 + 100 * c100 + 50 * c50;
      const M = 50 * intBetween(rng, 6, Math.floor(total / 50) - 1);
      // 큰 동전부터 개수를 정하고 나머지를 50원으로 맞춘다 (RPM 풀이 방식).
      let ways = 0;
      const lo = minOne === 1 ? 1 : 0;
      for (let n5 = lo; n5 <= c500; n5 += 1) {
        const rem1 = M - 500 * n5;
        if (rem1 < 0) break;
        for (let n1 = lo; n1 <= c100; n1 += 1) {
          const rem2 = rem1 - 100 * n1;
          if (rem2 < 0) break;
          if (rem2 % 50 === 0 && rem2 / 50 <= c50 && rem2 / 50 >= lo) {
            ways += 1;
          }
        }
      }
      if (ways < 2 || ways > 9) return null;
      if (useBig === 1 && M < 550) return null; // 500원이 쓰일 수 있는 금액만
      const coins =
        useBig === 1
          ? `$500$원짜리 동전 $${c500}$개, $100$원짜리 동전 $${c100}$개, $50$원짜리 동전 $${c50}$개`
          : `$100$원짜리 동전 $${c100}$개와 $50$원짜리 동전 $${c50}$개`;
      const cond =
        minOne === 1 ? " (단, 세 종류의 동전을 각각 한 개 이상 사용한다.)" : "";
      return {
        content: `승우는 ${coins}를 가지고 있다. 이 동전으로 $${M}$원을 지불하는 방법의 수를 구하시오.${cond}`,
        answer: `$${ways}$`,
        solution: `금액이 큰 동전의 개수부터 정한 뒤 나머지 금액을 작은 동전으로 맞춘다.\n표로 정리하여 세면 지불하는 방법은 모두 $${ways}$가지이다.`,
        facts: { useBig, c500, c100, c50, minOne, M, ways },
      };
    }),
  ),

  // 03 ─────────────────────────────────────────────
  def(
    "03",
    "경우의 수의 합 수를 뽑거나 주사위를 던지는 경우",
    SEC.경우의수,
    "기본",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = pick(rng, [0, 1] as const);
        if (kind === 0) {
          const N = intBetween(rng, 15, 30);
          const a = intBetween(rng, 4, 9);
          const b = intBetween(rng, 4, 9);
          if (a === b) return null;
          // lcm 이 N 을 넘어야 두 사건이 동시에 일어나지 않는다 (합의 법칙).
          if ((a * b) / gcd(a, b) <= N) return null;
          const ans = Math.floor(N / a) + Math.floor(N / b);
          return {
            content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 한 장을 뽑을 때, $${a}$의 배수 또는 $${b}$의 배수가 적힌 카드가 나오는 경우의 수를 구하시오.`,
            answer: `$${ans}$`,
            solution: `$${a}$의 배수는 $${Math.floor(N / a)}$개, $${b}$의 배수는 $${Math.floor(N / b)}$개이고, 두 사건은 동시에 일어나지 않는다.\n따라서 구하는 경우의 수는 $${Math.floor(N / a)}+${Math.floor(N / b)}=${ans}$ 이다.`,
            facts: { kind, N, a, b, ans },
          };
        }
        const S1 = intBetween(rng, 3, 6);
        const S2 = intBetween(rng, 8, 11);
        const c1 = 6 - Math.abs(7 - S1);
        const c2 = 6 - Math.abs(7 - S2);
        const ans = c1 + c2;
        return {
          content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${S1}$ 또는 $${S2}$인 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `합이 $${S1}$인 경우는 $${c1}$가지, 합이 $${S2}$인 경우는 $${c2}$가지이고, 두 사건은 동시에 일어나지 않는다.\n따라서 구하는 경우의 수는 $${c1}+${c2}=${ans}$ 이다.`,
          facts: { kind, S1, S2, ans },
        };
      }),
  ),

  // 04 ─────────────────────────────────────────────
  def(
    "04",
    "경우의 수의 합 교통수단 또는 물건을 선택하는 경우",
    SEC.경우의수,
    "기본",
    (rng): Body => {
      const kind = pick(rng, [0, 1] as const);
      const m = intBetween(rng, 2, 6);
      const n = attempt(50, () => {
        const v = intBetween(rng, 2, 6);
        return v === m ? null : v;
      });
      const ans = m + n;
      if (kind === 0) {
        return {
          content: `집에서 도서관까지 가는 버스 노선은 $${m}$가지, 지하철 노선은 $${n}$가지가 있다. 버스 또는 지하철을 타고 집에서 도서관까지 가는 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `버스를 타는 경우가 $${m}$가지, 지하철을 타는 경우가 $${n}$가지이다.\n두 경우는 동시에 일어나지 않으므로 $${m}+${n}=${ans}$ 이다.`,
          facts: { kind, m, n, ans },
        };
      }
      return {
        content: `어느 서점에 소설책 $${m}$종류와 시집 $${n}$종류가 있다. 이 중에서 한 권을 골라 사는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `소설책을 고르는 경우가 $${m}$가지, 시집을 고르는 경우가 $${n}$가지이다.\n두 경우는 동시에 일어나지 않으므로 $${m}+${n}=${ans}$ 이다.`,
        facts: { kind, m, n, ans },
      };
    },
  ),

  // 05 ─────────────────────────────────────────────
  def(
    "05",
    "경우의 수의 곱 길을 선택하는 경우",
    SEC.경우의수,
    "기본",
    (rng): Body => {
      const legs = pick(rng, [2, 2, 3] as const);
      const m = intBetween(rng, 2, 5);
      const n = intBetween(rng, 2, 5);
      if (legs === 2) {
        const ans = m * n;
        return {
          content: `A 지점에서 B 지점까지 가는 길은 $${m}$가지, B 지점에서 C 지점까지 가는 길은 $${n}$가지가 있다. A 지점에서 출발하여 B 지점을 거쳐 C 지점까지 가는 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `A 지점에서 B 지점까지 가는 각각의 경우에 대하여 B 지점에서 C 지점까지 가는 경우가 $${n}$가지씩 있다.\n따라서 구하는 경우의 수는 $${m}\\times${n}=${ans}$ 이다.`,
          facts: { legs, m, n, ans },
        };
      }
      const k = intBetween(rng, 2, 4);
      const ans = m * n * k;
      return {
        content: `A 지점에서 B 지점까지 가는 길은 $${m}$가지, B 지점에서 C 지점까지 가는 길은 $${n}$가지, C 지점에서 D 지점까지 가는 길은 $${k}$가지가 있다. A 지점에서 출발하여 B 지점과 C 지점을 차례로 거쳐 D 지점까지 가는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `각 구간의 길을 고르는 경우가 차례로 $${m}$가지, $${n}$가지, $${k}$가지이다.\n따라서 구하는 경우의 수는 $${m}\\times${n}\\times${k}=${ans}$ 이다.`,
        facts: { legs, m, n, k, ans },
      };
    },
  ),

  // 06 ─────────────────────────────────────────────
  def(
    "06",
    "경우의 수의 곱 물건을 선택하는 경우",
    SEC.경우의수,
    "기본",
    (rng): Body => {
      const kind = pick(rng, [0, 1] as const);
      const m = intBetween(rng, 2, 6);
      const n = intBetween(rng, 2, 6);
      if (kind === 0) {
        const ans = m * n;
        return {
          content: `나연이는 티셔츠 $${m}$종류와 바지 $${n}$종류를 가지고 있다. 티셔츠와 바지를 각각 하나씩 짝 지어 입는 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `티셔츠를 고르는 각각의 경우에 대하여 바지를 고르는 경우가 $${n}$가지씩 있다.\n따라서 구하는 경우의 수는 $${m}\\times${n}=${ans}$ 이다.`,
          facts: { kind, m, n, ans },
        };
      }
      const k = intBetween(rng, 2, 4);
      const ans = m * n * k;
      return {
        content: `어느 선물 가게에 상자 $${m}$종류, 포장지 $${n}$종류, 리본 $${k}$종류가 있다. 선물을 상자에 담아 포장지와 리본으로 포장하는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `상자, 포장지, 리본을 고르는 경우가 차례로 $${m}$가지, $${n}$가지, $${k}$가지이다.\n따라서 구하는 경우의 수는 $${m}\\times${n}\\times${k}=${ans}$ 이다.`,
        facts: { kind, m, n, k, ans },
      };
    },
  ),

  // 07 ─────────────────────────────────────────────
  def(
    "07",
    "경우의 수의 곱 동전 또는 주사위를 던지는 경우",
    SEC.경우의수,
    "응용",
    (rng): Body => {
      const kind = pick(rng, [0, 1] as const);
      if (kind === 0) {
        const c = intBetween(rng, 1, 3);
        const d = c === 1 ? 2 : intBetween(rng, 1, 2);
        const ans = Math.pow(2, c) * Math.pow(6, d);
        return {
          content: `서로 다른 동전 $${c}$개와 서로 다른 주사위 $${d}$개를 동시에 던질 때, 일어날 수 있는 모든 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `동전 한 개는 $2$가지, 주사위 한 개는 $6$가지의 경우가 나온다.\n따라서 모든 경우의 수는 $${powTex(2, c)}\\times${powTex(6, d)}=${ans}$ 이다.`,
          facts: { kind, c, d, ans },
        };
      }
      const p = pick(rng, [2, 3] as const);
      const q = pick(rng, [4, 6, 8, 12] as const);
      const cm = Math.floor(6 / p);
      const cd = diceDivisors(q);
      const ans = cm * cd;
      return {
        content: `한 개의 주사위를 두 번 던질 때, 첫 번째에는 $${p}$의 배수의 눈이 나오고 두 번째에는 $${q}$의 약수의 눈이 나오는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `$${p}$의 배수의 눈은 $${cm}$가지, $${q}$의 약수의 눈은 $${cd}$가지이다.\n따라서 구하는 경우의 수는 $${cm}\\times${cd}=${ans}$ 이다.`,
        facts: { kind, p, q, ans },
      };
    },
  ),

  // 08 ─────────────────────────────────────────────
  def("08", "한 줄로 세우는 경우의 수", SEC.여러가지, "기본", (rng): Body => {
    const kind = pick(rng, [0, 1, 2] as const);
    if (kind === 0) {
      const n = intBetween(rng, 4, 6);
      const ans = fact(n);
      return {
        content: `서로 다른 $${n}$권의 책을 책꽂이에 한 줄로 꽂는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `$${n}$권을 한 줄로 나열하는 경우의 수는 $${n}$부터 $1$까지의 자연수를 모두 곱한 $${ans}$ 이다.`,
        facts: { kind, n, ans },
      };
    }
    if (kind === 1) {
      const n = intBetween(rng, 4, 6);
      const k = intBetween(rng, 2, n);
      const ans = fact(n - 1);
      return {
        content: `A 를 포함한 $${n}$명의 학생을 한 줄로 세울 때, A 가 앞에서 $${k}$번째에 서는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `A 의 자리를 앞에서 $${k}$번째로 고정하면 나머지 $${n - 1}$명을 한 줄로 세우면 된다.\n따라서 구하는 경우의 수는 $${n - 1}$부터 $1$까지의 자연수를 모두 곱한 $${ans}$ 이다.`,
        facts: { kind, n, k, ans },
      };
    }
    const n = intBetween(rng, 5, 7);
    const r = pick(rng, [2, 3] as const);
    const ans = perm(n, r);
    return {
      content: `$${n}$명의 학생 중에서 $${r}$명을 뽑아 한 줄로 세우는 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `첫 번째 자리에 $${n}$가지, 그다음 자리마다 한 명씩 줄어든 가짓수를 곱한다.\n따라서 구하는 경우의 수는 $${Array.from({ length: r }, (_v, t) => n - t).join("\\times")}=${ans}$ 이다.`,
      facts: { kind, n, r, ans },
    };
  }),

  // 09 ─────────────────────────────────────────────
  def(
    "09",
    "한 줄로 세우는 경우의 수 이웃하는 경우",
    SEC.여러가지,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 6);
      const g = pick(rng, n === 4 ? ([2] as const) : ([2, 3] as const));
      const ans = fact(n - g + 1) * fact(g);
      const who = g === 2 ? "A, B" : "A, B, C";
      const cond = g === 2 ? "A 와 B 가 서로" : "A, B, C 가 모두";
      return {
        content: `${who} 를 포함한 $${n}$명의 학생을 한 줄로 세울 때, ${cond} 이웃하게 서는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `이웃하는 $${g}$명을 한 묶음으로 보면 $${n - g + 1}$묶음을 한 줄로 세우는 경우의 수는 $${fact(n - g + 1)}$ 이다.\n묶음 안에서 $${g}$명이 자리를 바꾸는 경우의 수는 $${fact(g)}$ 이므로 구하는 경우의 수는 $${fact(n - g + 1)}\\times${fact(g)}=${ans}$ 이다.`,
        facts: { n, g, ans },
      };
    },
  ),

  // 10 ─────────────────────────────────────────────
  def(
    "10",
    "자연수의 개수을 포함하지 않는 경우",
    SEC.여러가지,
    "응용",
    (rng): Body => {
      const k = intBetween(rng, 4, 6);
      const r = pick(rng, [2, 3] as const);
      const kind = pick(rng, [0, 1, 2] as const);
      if (kind === 0) {
        const ans = perm(k, r);
        return {
          content: `$1$부터 $${k}$까지의 자연수가 각각 하나씩 적힌 $${k}$장의 카드 중에서 $${r}$장을 뽑아 만들 수 있는 ${digitWord(r)} 자연수의 개수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `각 자리에 놓을 수 있는 카드는 차례로 $${Array.from({ length: r }, (_v, t) => k - t).join("$장, $")}$장이다.\n따라서 구하는 개수는 $${Array.from({ length: r }, (_v, t) => k - t).join("\\times")}=${ans}$ 이다.`,
          facts: { k, r, kind, ans },
        };
      }
      const odds = Math.floor((k + 1) / 2);
      const evens = Math.floor(k / 2);
      const pickCnt = kind === 1 ? odds : evens;
      const ans = pickCnt * perm(k - 1, r - 1);
      const word = kind === 1 ? "홀수" : "짝수";
      return {
        content: `$1$부터 $${k}$까지의 자연수가 각각 하나씩 적힌 $${k}$장의 카드 중에서 $${r}$장을 뽑아 만들 수 있는 ${digitWord(r)} 자연수 중 ${word}의 개수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `${word}가 되려면 일의 자리에 ${word} 카드가 와야 하므로 $${pickCnt}$가지이다.\n나머지 자리에는 남은 $${k - 1}$장 중에서 차례로 놓으면 되므로 구하는 개수는 $${pickCnt}\\times${perm(k - 1, r - 1)}=${ans}$ 이다.`,
        facts: { k, r, kind, ans },
      };
    },
  ),

  // 11 ─────────────────────────────────────────────
  def(
    "11",
    "자연수의 개수을 포함하는 경우",
    SEC.여러가지,
    "응용",
    (rng): Body => {
      const k = intBetween(rng, 3, 5);
      const r = pick(rng, [2, 3] as const);
      const kind = k === 5 ? pick(rng, [0, 1] as const) : 0;
      if (kind === 0) {
        const ans = k * perm(k, r - 1);
        return {
          content: `$0$부터 $${k}$까지의 숫자가 각각 하나씩 적힌 $${k + 1}$장의 카드 중에서 $${r}$장을 뽑아 만들 수 있는 ${digitWord(r)} 자연수의 개수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `맨 앞 자리에는 $0$ 을 놓을 수 없으므로 $${k}$가지이고, 나머지 자리에는 남은 $${k}$장 중에서 차례로 놓는다.\n따라서 구하는 개수는 $${k}\\times${perm(k, r - 1)}=${ans}$ 이다.`,
          facts: { k, r, kind, ans },
        };
      }
      const endZero = perm(k, r - 1);
      const endFive = (k - 1) * (r === 2 ? 1 : perm(k - 1, r - 2));
      const ans = endZero + endFive;
      return {
        content: `$0$부터 $${k}$까지의 숫자가 각각 하나씩 적힌 $${k + 1}$장의 카드 중에서 $${r}$장을 뽑아 만들 수 있는 ${digitWord(r)} 자연수 중 $5$의 배수의 개수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `일의 자리가 $0$ 인 경우는 $${endZero}$가지이다.\n일의 자리가 $5$ 인 경우는 맨 앞 자리에 $0$ 을 놓을 수 없으므로 $${endFive}$가지이다.\n따라서 구하는 개수는 $${endZero}+${endFive}=${ans}$ 이다.`,
        facts: { k, r, kind, ans },
      };
    },
  ),

  // 12 ─────────────────────────────────────────────
  def("12", "대표 뽑기 자격이 다른 경우", SEC.여러가지, "기본", (rng): Body => {
    const r = pick(rng, [2, 3] as const);
    const n = intBetween(rng, 5, r === 2 ? 9 : 8);
    const ans = perm(n, r);
    const roles =
      r === 2
        ? "회장 $1$명, 부회장 $1$명"
        : "회장 $1$명, 부회장 $1$명, 총무 $1$명";
    return {
      content: `$${n}$명의 후보 중에서 ${roles}을 뽑는 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `뽑는 순서와 관계가 있으므로 자리마다 가짓수를 곱한다.\n따라서 구하는 경우의 수는 $${Array.from({ length: r }, (_v, t) => n - t).join("\\times")}=${ans}$ 이다.`,
      facts: { n, r, ans },
    };
  }),

  // 13 ─────────────────────────────────────────────
  def("13", "대표 뽑기 자격이 같은 경우", SEC.여러가지, "응용", (rng): Body => {
    const kind = pick(rng, [0, 1, 2] as const);
    if (kind === 0) {
      const n = intBetween(rng, 5, 10);
      const r = pick(rng, [2, 3] as const);
      const ans = comb(n, r);
      return {
        content: `$${n}$명의 학생 중에서 대표 $${r}$명을 뽑는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `뽑는 순서와 관계가 없으므로 한 줄로 세우는 경우의 수를 자리 바꿈의 수로 나눈다.\n따라서 구하는 경우의 수는 $\\dfrac{${Array.from({ length: r }, (_v, t) => n - t).join("\\times")}}{${fact(r)}}=${ans}$ 이다.`,
        facts: { kind, n, r, ans },
      };
    }
    if (kind === 1) {
      const n = intBetween(rng, 5, 8);
      const ans = comb(n, 2);
      return {
        content: `어느 모임에서 만난 $${n}$명이 한 사람도 빠짐없이 서로 한 번씩 악수를 할 때, 악수의 전체 횟수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `$${n}$명 중에서 자격이 같은 $2$명을 뽑는 경우의 수와 같다.\n따라서 구하는 횟수는 $\\dfrac{${n}\\times${n - 1}}{2}=${ans}$ 이다.`,
        facts: { kind, n, ans },
      };
    }
    const n = intBetween(rng, 5, 8);
    const ans = n * comb(n - 1, 2);
    return {
      content: `$${n}$명의 후보 중에서 대표 $1$명과 부대표 $2$명을 뽑는 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `대표를 뽑는 경우가 $${n}$가지이고, 나머지 $${n - 1}$명 중에서 자격이 같은 부대표 $2$명을 뽑는 경우가 $\\dfrac{${n - 1}\\times${n - 2}}{2}=${comb(n - 1, 2)}$가지이다.\n따라서 구하는 경우의 수는 $${n}\\times${comb(n - 1, 2)}=${ans}$ 이다.`,
      facts: { kind, n, ans },
    };
  }),

  // 14 ─────────────────────────────────────────────
  def("14", "선분 또는 삼각형의 개수", SEC.여러가지, "응용", (rng): Body => {
    const kind = pick(rng, [0, 1, 2] as const);
    if (kind === 0) {
      const n = intBetween(rng, 5, 8);
      const ans = comb(n, 2);
      return {
        content: `원 위에 $${n}$개의 점이 있다. 이 중에서 두 점을 이어 만들 수 있는 선분의 개수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `$${n}$개의 점 중에서 순서와 관계없이 $2$개를 뽑는 경우의 수와 같다.\n따라서 구하는 개수는 $\\dfrac{${n}\\times${n - 1}}{2}=${ans}$ 이다.`,
        facts: { kind, n, ans },
      };
    }
    if (kind === 1) {
      const n = intBetween(rng, 5, 7);
      const ans = comb(n, 3);
      return {
        content: `원 위에 $${n}$개의 점이 있다. 이 중에서 세 점을 꼭짓점으로 하는 삼각형의 개수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `원 위의 점은 어느 세 점도 한 직선 위에 있지 않으므로, $${n}$개 중 $3$개를 뽑는 경우의 수와 같다.\n따라서 구하는 개수는 $\\dfrac{${n}\\times${n - 1}\\times${n - 2}}{3\\times2\\times1}=${ans}$ 이다.`,
        facts: { kind, n, ans },
      };
    }
    const p = intBetween(rng, 3, 5);
    const q = intBetween(rng, 3, 5);
    const ans = comb(p, 2) * q + comb(q, 2) * p;
    return {
      content: `평행한 두 직선 $l$, $m$ 위에 각각 $${p}$개, $${q}$개의 점이 있다. 이 $${p + q}$개의 점 중에서 세 점을 꼭짓점으로 하는 삼각형의 개수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `직선 $l$ 에서 $2$개, 직선 $m$ 에서 $1$개를 뽑는 경우가 $${comb(p, 2)}\\times${q}=${comb(p, 2) * q}$가지이고, 직선 $l$ 에서 $1$개, 직선 $m$ 에서 $2$개를 뽑는 경우가 $${p}\\times${comb(q, 2)}=${comb(q, 2) * p}$가지이다.\n따라서 구하는 개수는 $${comb(p, 2) * q}+${comb(q, 2) * p}=${ans}$ 이다.`,
      facts: { kind, p, q, ans },
    };
  }),

  // 15 ─────────────────────────────────────────────
  def("15", "색칠하는 경우의 수", SEC.여러가지, "심화하", (rng): Body => {
    const rule = pick(rng, [0, 1] as const); // 0: 모두 다른 색 · 1: 이웃만 다르게
    const [shape, k, nLo] =
      rule === 0 ? [...pick(rng, DISTINCT_PAIRS), 0] : pick(rng, ADJ_PAIRS);
    const parts = shadeParts(shape as ShadeShape, k as number);
    const letters = PART_LETTERS.slice(0, parts);
    const n =
      rule === 0
        ? intBetween(rng, Math.max(4, parts), 5)
        : intBetween(rng, nLo as number, (nLo as number) + 1);
    const factors =
      rule === 0
        ? Array.from({ length: parts }, (_v, i) => n - i)
        : greedyFactors(shadeAdjacency(shape as ShadeShape, k as number), n);
    const ans = product(factors);
    const noun = SHAPE_NOUN[shape as ShadeShape];
    const colorList = SHADE_COLORS.slice(0, n).join(", ");
    const head = `다음 그림과 같이 ${letters.join(", ")} 의 ${PART_WORD[parts]!} 부분으로 나누어진 ${noun}이 있다. ${colorList}의 $${n}$가지 색을 사용하여`;
    const facts = {
      rule,
      shape: SHAPE_CODE[shape as ShadeShape],
      k: k as number,
      parts,
      colors: n,
      ans,
    };
    const figureSpec = shadePartsSpec(shape as ShadeShape, k as number);
    if (rule === 0) {
      const steps = letters
        .slice(1)
        .map((L, i) => `${L} 에는 $${factors[i + 1]}$가지`)
        .join(", ");
      return {
        content: `${head} 각 부분에 모두 다른 색을 칠하는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `이미 칠한 색은 다시 쓸 수 없으므로 ${letters[0]} 에는 $${n}$가지, ${steps}를 칠할 수 있다.\n따라서 구하는 경우의 수는 $${timesTex(factors)}=${ans}$ 이다.`,
        facts,
        figureSpec,
      };
    }
    const adj = shadeAdjacency(shape as ShadeShape, k as number);
    const steps = letters
      .slice(1)
      .map((L, i) => {
        const idx = i + 1;
        const earlier = adj[idx]!.filter((j) => j < idx).map(
          (j) => PART_LETTERS[j]!,
        );
        return `${L} 는 ${earlier.join(", ")} 와 이웃하므로 $${factors[idx]}$가지`;
      })
      .join(", ");
    return {
      content: `${head} 각 부분에 색을 칠하려고 한다. 같은 색을 여러 번 사용해도 좋으나 이웃하는 부분에는 서로 다른 색을 칠하는 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `${letters[0]} 부터 차례로 칠하면 ${letters[0]} 에 칠할 수 있는 색은 $${n}$가지이다.\n${steps}이다.\n따라서 구하는 경우의 수는 $${timesTex(factors)}=${ans}$ 이다.`,
      facts,
      figureSpec,
    };
  }),

  // 16 ─────────────────────────────────────────────
  def(
    "16",
    "최단 거리로 가는 경우의 수",
    SEC.여러가지,
    "심화하",
    (rng): Body => {
      const m = pick(rng, [3, 3, 4] as const);
      const n = m === 4 ? 2 : pick(rng, [2, 3] as const);
      const via = pick(rng, [0, 1] as const);
      if (via === 0) {
        const ans = comb(m + n, m);
        return {
          content: `다음 그림과 같이 가로 $${m}$칸, 세로 $${n}$칸의 바둑판 모양 도로망이 있다. A 지점에서 출발하여 B 지점까지 최단 거리로 가는 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `각 교차점에 A 지점에서 그 지점까지 최단 거리로 가는 경우의 수를 적으면, 그 값은 왼쪽 교차점과 아래쪽 교차점에 적힌 수의 합이 된다.\n이렇게 차례로 적으면 B 지점에는 $${ans}$ 가 적힌다.`,
          facts: { m, n, via, ans },
          figureSpec: gridFigureSpec(m, n, null),
        };
      }
      const px = intBetween(rng, 1, m - 1);
      const py = intBetween(rng, 1, n - 1);
      const c1 = comb(px + py, px);
      const c2 = comb(m - px + (n - py), m - px);
      const ans = c1 * c2;
      return {
        content: `다음 그림과 같이 가로 $${m}$칸, 세로 $${n}$칸의 바둑판 모양 도로망이 있다. A 지점에서 출발하여 P 지점을 거쳐 B 지점까지 최단 거리로 가는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `A 지점에서 P 지점까지 최단 거리로 가는 경우의 수는 $${c1}$ 이고, P 지점에서 B 지점까지 최단 거리로 가는 경우의 수는 $${c2}$ 이다.\n따라서 구하는 경우의 수는 $${c1}\\times${c2}=${ans}$ 이다.`,
        facts: { m, n, via, px, py, ans },
        figureSpec: gridFigureSpec(m, n, { px, py }),
      };
    },
  ),

  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 이 중단원을 16 까지만 담는다. 색인에 없는 유형을 지어야 하므로
  // 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    "70",
    "두 주사위의 눈의 차가 주어진 경우의 수",
    SEC.경우의수,
    "응용",
    (rng): Body => {
      const t = intBetween(rng, 1, 4);
      // 눈의 차가 t 인 (a,b) 쌍의 개수 = 2(6-t)
      const ans = 2 * (6 - t);
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 차가 $${t}$인 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `차가 $${t}$이려면 큰 눈이 작은 눈보다 $${t}$만큼 커야 한다.\n작은 눈이 $1$부터 $${6 - t}$까지 $${6 - t}$가지이고, 두 주사위를 바꾼 경우도 세므로 $2\\times${6 - t}=${ans}$이다.`,
        facts: { t, ans },
      };
    },
  ),

  def(
    "71",
    "동전과 주사위를 함께 던지는 경우의 수",
    SEC.경우의수,
    "응용",
    (rng): Body => {
      const coins = intBetween(rng, 2, 4); // 「서로 다른 1개」는 말이 안 된다
      const dice = intBetween(rng, 1, 2);
      const ans = 2 ** coins * 6 ** dice;
      return {
        content: `서로 다른 $${coins}$개의 동전과 ${dice > 1 ? "서로 다른 " : ""}$${dice}$개의 주사위를 동시에 던질 때, 일어나는 모든 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `동전은 각각 $2$가지, 주사위는 각각 $6$가지이다.\n따라서 경우의 수는 $${powTex(2, coins)}\\times${powTex(6, dice)}=${2 ** coins}\\times${6 ** dice}=${ans}$이다.`,
        facts: { coins, dice, ans },
      };
    },
  ),

  def(
    "72",
    "두 주사위의 눈의 수의 합이 배수인 경우의 수",
    SEC.경우의수,
    "응용",
    (rng): Body => {
      const k = pick(rng, [3, 4, 5] as const);
      // 합이 k 의 배수인 (a,b) 쌍의 개수 — 6×6 을 훑어 센다.
      let ans = 0;
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1) if ((a + b) % k === 0) ans += 1;
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${k}$의 배수인 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `두 눈의 수의 합은 $2$부터 $12$까지이다.\n합이 $${k}$의 배수가 되는 경우를 모두 세면 $${ans}$가지이다.`,
        facts: { k, ans },
      };
    },
  ),

  def(
    "73",
    "특정한 한 사람을 맨 앞에 세우는 경우의 수",
    SEC.여러가지,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 7);
      let ans = 1;
      for (let i = 1; i <= n - 1; i += 1) ans *= i;
      return {
        content: `$${n}$명을 한 줄로 세울 때, 특정한 한 사람을 맨 앞에 세우는 경우의 수를 구하시오.`,
        answer: `$${ans}$`,
        solution: `맨 앞은 정해져 있으므로 나머지 $${n - 1}$명을 한 줄로 세우면 된다.\n따라서 $${n - 1}!$의 값인 $${ans}$가지이다.`,
        facts: { n, ans },
      };
    },
  ),
];
