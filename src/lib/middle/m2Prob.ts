/**
 * 중2 RPM 2-2 「확률」 01~13 13유형 전량 — 세션 2A-중2수확률 소유
 * (docs/planning/tracks/middle-engine-wave2-plan.md §1).
 *
 * ## 회전판 소재 (세션 2E, 2026-08-23 — 채색 축이 main 에 들어온 뒤)
 * 01·03·06 에 **회전판 갈래**를 더했다. 그림은 `m2Shade.ts` 의 `spinnerSpec` —
 * 칸마다 다른 옅은 색을 깔되 **묻는 것은 칸에 적힌 수**다. 지면은 흑백으로
 * 인쇄되므로(절대 규칙 6) 색으로만 갈리는 회전판은 종이에서 못 푼다.
 * **그림이 곧 검산이다** — 테스트가 `figureSpec` 의 칸 라벨을 되읽어 조건에
 * 맞는 칸을 세고 그 값으로 확률을 다시 만든다.
 * 주사위·구슬 그림은 「그림 없이 성립하는 발문」 우선 원칙에 따라 텍스트로만 낸다.
 *
 * 우리 단원 배정 (공유 DB Unit.section 실측 2026-08-23):
 *   확률의 뜻과 성질(334) ← 01~05 · 확률의 계산(3) ← 06~13
 *
 * 계약(1차 물결 브리프 그대로): 정답 역산(기약분수) · facts 원 수치 ·
 * 숫자는 $...$ 안 · attempt 소진 시 던짐. 테스트는 표본공간 **전수 나열**
 * (주사위 36칸·공 짝 나열·게임 1296가지 모의)로 따로 검산한다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { spinnerSpec } from "./m2Shade";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR = "확률";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  뜻과성질: "확률의 뜻과 성질",
  계산: "확률의 계산",
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

// ── 분수 소품 ─────────────────────────────────────────

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** 주격 조사: $9$가 · $3$이 — m2Josa 와 같은 수 읽기 규칙. */
function iGa(n: number): "이" | "가" {
  const d = Math.abs(n) % 10;
  return d === 2 || d === 4 || d === 5 || d === 9 ? "가" : "이";
}

type Frac = { n: number; d: number };

function red(n: number, d: number): Frac {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function addF(a: Frac, b: Frac): Frac {
  return red(a.n * b.d + b.n * a.d, a.d * b.d);
}

function mulF(a: Frac, b: Frac): Frac {
  return red(a.n * b.n, a.d * b.d);
}

function oneMinus(a: Frac): Frac {
  return red(a.d - a.n, a.d);
}

function fracTex(f: Frac): string {
  return f.d === 1 ? String(f.n) : `\\dfrac{${f.n}}{${f.d}}`;
}

function ansTex(f: Frac): string {
  return `$${fracTex(f)}$`;
}

function fact(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

function comb(n: number, r: number): number {
  let num = 1;
  for (let i = 0; i < r; i += 1) num *= n - i;
  return num / fact(r);
}

/** 발문에 쓰는 «깔끔한» 확률 풀 — RPM 이 쓰는 승률·합격률 부류. */
const NICE_PROBS: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
  [3, 5],
];

/** 주사위 조건 풀 (유형 12) — 문구와 성공 눈 개수. */
const DICE_CONDS: readonly { text: string; count: number }[] = [
  { text: "$3$의 배수", count: 2 },
  { text: "$2$의 배수", count: 3 },
  { text: "$5$ 이상", count: 2 },
  { text: "$3$ 이하", count: 3 },
  { text: "$6$의 약수", count: 4 },
];

// ── 회전판 소품 ───────────────────────────────────

/** 회전판 칸 수 — 라벨이 칸 안에 들어가는 범위 (실렌더 확인 2026-08-23). */
const SPIN_SIZES = [4, 5, 6, 8] as const;

/** 칸에 적는 수는 늘 $1$부터 $k$까지 — 그림과 발문이 같은 말을 하게. */
function spinnerFigure(k: number): Record<string, unknown> {
  return spinnerSpec(
    k,
    Array.from({ length: k }, (_v, i) => String(i + 1)),
  );
}

/** 회전판 발문 머리 — 그림·조건 문구가 늘 붙어 다니게 한 곳에 둔다. */
function spinnerHead(k: number): string {
  return `다음 그림과 같이 크기가 같은 $${k}$개의 부분으로 나누어진 원판에 $1$부터 $${k}$까지의 자연수가 하나씩 적혀 있다. 이 원판을 돌린 후 멈추었을 때,`;
}

/** 회전판 발문 꼬리 — 바늘이 경계선을 가리키는 경우를 제외한다. */
const SPIN_TAIL = " (단, 바늘이 경계선을 가리키는 경우는 생각하지 않는다.)";

/**
 * `\dfrac{a}{b}=기약분수` — **이미 기약이면 한 번만** 적는다.
 * 그러지 않으면 해설에 `$\dfrac{1}{6}=\dfrac{1}{6}$` 같은 헛걸음이 나간다.
 */
function reduceTex(n: number, d: number): string {
  const f = red(n, d);
  const raw = `\\dfrac{${n}}{${d}}`;
  return f.n === n && f.d === d ? raw : `${raw}=${fracTex(f)}`;
}

export const M2_PROB: TypeEntry[] = [
  // 01 ─────────────────────────────────────────────
  def("01", "확률", SEC.뜻과성질, "기본", (rng): Body => {
    const kind = pick(rng, [0, 1, 2] as const);
    if (kind === 2) {
      // 회전판 — 칸에 적힌 수가 m 의 배수
      const k = pick(rng, SPIN_SIZES);
      const m = attempt(50, () => {
        const v = intBetween(rng, 2, 4);
        return Math.floor(k / v) >= 1 && Math.floor(k / v) < k ? v : null;
      });
      const cnt = Math.floor(k / m);
      const p = red(cnt, k);
      return {
        content: `${spinnerHead(k)} 바늘이 가리키는 부분에 적힌 수가 $${m}$의 배수일 확률을 구하시오.${SPIN_TAIL}`,
        answer: ansTex(p),
        solution: `모든 경우의 수는 $${k}$ 이고, $1$부터 $${k}$까지의 자연수 중 $${m}$의 배수는 $${cnt}$개이다.\n따라서 구하는 확률은 $${reduceTex(cnt, k)}$ 이다.`,
        facts: { kind, k, m, num: p.n, den: p.d },
        figureSpec: spinnerFigure(k),
      };
    }
    if (kind === 0) {
      const S = intBetween(rng, 4, 10);
      const cnt = 6 - Math.abs(7 - S);
      const p = red(cnt, 36);
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${S}$일 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `모든 경우의 수는 $6\\times6=36$ 이고, 두 눈의 수의 합이 $${S}$인 경우는 $${cnt}$가지이다.\n따라서 구하는 확률은 $\\dfrac{${cnt}}{36}=${fracTex(p)}$ 이다.`,
        facts: { kind, S, num: p.n, den: p.d },
      };
    }
    const D = intBetween(rng, 1, 4);
    const cnt = 2 * (6 - D);
    const p = red(cnt, 36);
    return {
      content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 차가 $${D}$일 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `모든 경우의 수는 $6\\times6=36$ 이고, 두 눈의 수의 차가 $${D}$인 경우는 $${cnt}$가지이다.\n따라서 구하는 확률은 $\\dfrac{${cnt}}{36}=${fracTex(p)}$ 이다.`,
      facts: { kind, D, num: p.n, den: p.d },
    };
  }),

  // 02 ─────────────────────────────────────────────
  def("02", "방정식 부등식에서의 확률", SEC.뜻과성질, "응용", (rng) =>
    attempt(200, (): Body | null => {
      const c = pick(rng, [2, 3] as const);
      const k = intBetween(rng, 1, 6);
      // ca−b=k 를 만족하는 (a,b) — b=ca−k 가 1..6 에 드는 a 의 개수.
      let cnt = 0;
      for (let a = 1; a <= 6; a += 1) {
        const b = c * a - k;
        if (b >= 1 && b <= 6) cnt += 1;
      }
      if (cnt < 1) return null;
      const p = red(cnt, 36);
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던져 나오는 눈의 수를 각각 $a$, $b$ 라 할 때, $${c}a-b=${k}$ 일 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `모든 경우의 수는 $6\\times6=36$ 이다.\n$b=${c}a-${k}$ ${iGa(k)} $1$ 이상 $6$ 이하가 되는 $a$ 를 찾으면 순서쌍 $(a,\\,b)$ 는 $${cnt}$가지이다.\n따라서 구하는 확률은 $\\dfrac{${cnt}}{36}=${fracTex(p)}$ 이다.`,
        facts: { c, k, num: p.n, den: p.d },
      };
    }),
  ),

  // 03 ─────────────────────────────────────────────
  def("03", "확률의 성질", SEC.뜻과성질, "기본", (rng): Body => {
    const kind = pick(rng, [0, 1] as const);
    if (kind === 1) {
      // 회전판 — 절대로 일어나지 않는 사건(원판에 없는 수)과 반드시 일어나는 사건
      const k = pick(rng, SPIN_SIZES);
      return {
        content: `${spinnerHead(k)} 바늘이 가리키는 부분에 적힌 수가 $${k + 1}$ 이상일 확률을 $p$, $${k}$ 이하일 확률을 $q$ 라 하자. $p+q$ 의 값을 구하시오.${SPIN_TAIL}`,
        answer: `$1$`,
        solution: `원판에 적힌 수는 $1$부터 $${k}$까지이므로 $${k + 1}$ 이상인 수는 없다. 절대로 일어나지 않는 사건이므로 $p=0$ 이다.\n바늘이 가리키는 수는 반드시 $${k}$ 이하이므로 반드시 일어나는 사건이고 $q=1$ 이다.\n따라서 $p+q=0+1=1$ 이다.`,
        facts: { kind, k, ans: 1 },
        figureSpec: spinnerFigure(k),
      };
    }
    const r = intBetween(rng, 2, 6);
    const b = intBetween(rng, 2, 6);
    return {
      content: `빨간 공 $${r}$개와 파란 공 $${b}$개가 들어 있는 주머니에서 한 개의 공을 꺼낼 때, 노란 공이 나올 확률을 $p$, 빨간 공 또는 파란 공이 나올 확률을 $q$ 라 하자. $p+q$ 의 값을 구하시오.`,
      answer: `$1$`,
      solution: `주머니에 노란 공은 없으므로 절대로 일어나지 않는 사건이고 $p=0$ 이다.\n꺼낸 공은 반드시 빨간 공 또는 파란 공이므로 $q=1$ 이다.\n따라서 $p+q=0+1=1$ 이다.`,
      facts: { kind, r, b, ans: 1 },
    };
  }),

  // 04 ─────────────────────────────────────────────
  def(
    "04",
    "어떤 사건이 일어나지 않을 확률",
    SEC.뜻과성질,
    "응용",
    (rng): Body => {
      const kind = pick(rng, [0, 1] as const);
      if (kind === 0) {
        const S = intBetween(rng, 5, 9);
        const cnt = 6 - Math.abs(7 - S);
        const p = red(36 - cnt, 36);
        return {
          content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${S}$${iGa(S)} 아닐 확률을 구하시오.`,
          answer: ansTex(p),
          solution: `두 눈의 수의 합이 $${S}$일 확률은 $\\dfrac{${cnt}}{36}$ 이다.\n따라서 구하는 확률은 $1-\\dfrac{${cnt}}{36}=${fracTex(p)}$ 이다.`,
          facts: { kind, S, num: p.n, den: p.d },
        };
      }
      const n = intBetween(rng, 5, 8);
      const p = red(comb(n - 1, 2), comb(n, 2));
      return {
        content: `A 를 포함한 $${n}$명의 후보 중에서 대표 $2$명을 뽑을 때, A 가 뽑히지 않을 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `모든 경우의 수는 $${n}$명 중 $2$명을 뽑는 $${comb(n, 2)}$가지이다.\nA 가 뽑히지 않는 경우는 나머지 $${n - 1}$명 중 $2$명을 뽑는 $${comb(n - 1, 2)}$가지이다.\n따라서 구하는 확률은 $\\dfrac{${comb(n - 1, 2)}}{${comb(n, 2)}}=${fracTex(p)}$ 이다.`,
        facts: { kind, n, num: p.n, den: p.d },
      };
    },
  ),

  // 05 ─────────────────────────────────────────────
  def("05", "적어도 하나는 일 확률", SEC.뜻과성질, "응용", (rng): Body => {
    const kind = pick(rng, [0, 1, 2] as const);
    if (kind === 0) {
      const c = intBetween(rng, 2, 4);
      const p = red(Math.pow(2, c) - 1, Math.pow(2, c));
      return {
        content: `서로 다른 $${c}$개의 동전을 동시에 던질 때, 적어도 한 개는 앞면이 나올 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `모두 뒷면이 나올 확률은 $\\dfrac{1}{${Math.pow(2, c)}}$ 이다.\n따라서 구하는 확률은 $1-\\dfrac{1}{${Math.pow(2, c)}}=${fracTex(p)}$ 이다.`,
        facts: { kind, c, num: p.n, den: p.d },
      };
    }
    if (kind === 1) {
      const c = intBetween(rng, 2, 4);
      const p = red(Math.pow(2, c) - 1, Math.pow(2, c));
      return {
        content: `맞으면 ◯, 틀리면 ×로 답하는 $${c}$개의 문제에 임의로 답할 때, 적어도 한 문제는 맞힐 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `모든 문제를 틀릴 확률은 $\\dfrac{1}{${Math.pow(2, c)}}$ 이다.\n따라서 구하는 확률은 $1-\\dfrac{1}{${Math.pow(2, c)}}=${fracTex(p)}$ 이다.`,
        facts: { kind, c, num: p.n, den: p.d },
      };
    }
    const m = intBetween(rng, 3, 6);
    const w = intBetween(rng, 2, 4);
    const p = red(comb(m + w, 2) - comb(m, 2), comb(m + w, 2));
    return {
      content: `남학생 $${m}$명과 여학생 $${w}$명 중에서 대표 $2$명을 뽑을 때, 적어도 한 명은 여학생이 뽑힐 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `모든 경우의 수는 $${m + w}$명 중 $2$명을 뽑는 $${comb(m + w, 2)}$가지이다.\n$2$명 모두 남학생인 경우는 $${comb(m, 2)}$가지이므로 그 확률은 $\\dfrac{${comb(m, 2)}}{${comb(m + w, 2)}}$ 이다.\n따라서 구하는 확률은 $1-\\dfrac{${comb(m, 2)}}{${comb(m + w, 2)}}=${fracTex(p)}$ 이다.`,
      facts: { kind, m, w, num: p.n, den: p.d },
    };
  }),

  def("01A", "확률을 분수로 나타내기", SEC.뜻과성질, "연산", (rng): Body => {
    const total = intBetween(rng, 8, 20);
    const favorable = intBetween(rng, 2, total - 2);
    const p = red(favorable, total);
    return {
      content: `어떤 실험에서 일어날 수 있는 모든 경우의 수가 $${total}$ 이고 사건 $A$ 가 일어나는 경우의 수가 $${favorable}$ 일 때, 사건 $A$ 가 일어날 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `각 경우가 일어날 가능성이 같으므로 구하는 확률은 $${reduceTex(favorable, total)}$ 이다.`,
      facts: { total, favorable, num: p.n, den: p.d },
    };
  }),

  def("02A", "색 공을 뽑을 확률", SEC.뜻과성질, "기본", (rng): Body => {
    const redCount = intBetween(rng, 3, 9);
    const blueCount = intBetween(rng, 2, 8);
    const p = red(blueCount, redCount + blueCount);
    return {
      content: `주머니에 크기와 모양이 같은 빨간 공 $${redCount}$개와 파란 공 $${blueCount}$개가 들어 있다. 이 주머니에서 공을 한 개 꺼낼 때 파란 공이 나올 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `전체 공은 $${redCount}+${blueCount}=${redCount + blueCount}$개이고 파란 공은 $${blueCount}$개이다.\n따라서 구하는 확률은 $${reduceTex(blueCount, redCount + blueCount)}$ 이다.`,
      facts: { redCount, blueCount, num: p.n, den: p.d },
    };
  }),

  def("03A", "수 카드의 범위와 확률", SEC.뜻과성질, "기본", (rng): Body => {
    const largest = intBetween(rng, 9, 20);
    // 문턱이 $2$ 이상이라야 사건이 «반드시 일어나는 사건»(확률 1)으로 무너지지 않는다.
    const threshold = intBetween(rng, 3, largest - 2);
    const favorable = largest - threshold + 1;
    const p = red(favorable, largest);
    return {
      content: `$1$부터 $${largest}$까지의 자연수가 각각 하나씩 적힌 $${largest}$장의 카드 중에서 한 장을 뽑을 때, 카드에 적힌 수가 $${threshold}$ 이상일 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `모든 경우의 수는 $${largest}$ 이고, $${threshold}$ 이상 $${largest}$ 이하인 자연수는 $${favorable}$개이다.\n따라서 구하는 확률은 $${reduceTex(favorable, largest)}$ 이다.`,
      facts: { largest, threshold, favorable, num: p.n, den: p.d },
    };
  }),

  def("04A", "배수인 수 카드의 확률", SEC.뜻과성질, "응용", (rng) =>
    attempt(100, (): Body | null => {
      const largest = intBetween(rng, 18, 30);
      const a = intBetween(rng, 3, 6);
      const b = intBetween(rng, a + 1, 8);
      // 한쪽이 다른 쪽의 배수이면 「$3$의 배수 또는 $6$의 배수」가 되어
      // 포함·배제가 헛돈다 — 발문도 어색하다. 그런 짝은 버린다.
      if (b % a === 0) return null;
      const lcm = (a * b) / gcd(a, b);
      const countA = Math.floor(largest / a);
      const countB = Math.floor(largest / b);
      const countBoth = Math.floor(largest / lcm);
      const favorable = countA + countB - countBoth;
      if (favorable < 3 || favorable >= largest) return null;
      const p = red(favorable, largest);
      return {
        content: `$1$부터 $${largest}$까지의 자연수가 각각 하나씩 적힌 $${largest}$장의 카드 중에서 한 장을 뽑을 때, 카드에 적힌 수가 $${a}$의 배수 또는 $${b}$의 배수일 확률을 구하시오.`,
        answer: ansTex(p),
        // 두 배수가 겹치지 않는 회차에 「$42$의 배수는 $0$개」·「$3+3-0$」이
        // 나가면 지면이 흉하다 — 값은 맞아도 그 부류는 값 검산으로 안 걸린다.
        solution:
          countBoth === 0
            ? `$${a}$의 배수는 $${countA}$개, $${b}$의 배수는 $${countB}$개이고 $${largest}$ 이하의 자연수 중 두 조건을 모두 만족하는 수는 없다.\n따라서 조건을 만족하는 경우의 수는 $${countA}+${countB}=${favorable}$ 이므로 구하는 확률은 $${reduceTex(favorable, largest)}$ 이다.`
            : `$${a}$의 배수는 $${countA}$개, $${b}$의 배수는 $${countB}$개이고, 두 조건을 모두 만족하는 $${lcm}$의 배수는 $${countBoth}$개이다.\n따라서 조건을 만족하는 경우의 수는 $${countA}+${countB}-${countBoth}=${favorable}$ 이므로 구하는 확률은 $${reduceTex(favorable, largest)}$ 이다.`,
        facts: { largest, a, b, lcm, favorable, num: p.n, den: p.d },
      };
    }),
  ),

  def(
    "05A",
    "확률에서 경우의 수 구하기",
    SEC.뜻과성질,
    "심화하",
    (rng): Body => {
      const [num, den] = pick(rng, NICE_PROBS);
      const scale = intBetween(rng, 2, 6);
      const finalTotal = den * scale;
      const winning = num * scale;
      // 더 넣은 꽝 제비 — 처음 꽝 제비가 $1$개 이상 남게 뽑는다.
      const added = intBetween(rng, 1, finalTotal - winning - 1);
      const losingBefore = finalTotal - winning - added;
      return {
        content: `당첨 제비 $${winning}$개와 꽝 제비 $${losingBefore}$개가 들어 있는 상자에 꽝 제비 몇 개를 더 넣었더니 이 상자에서 제비 한 개를 뽑을 때 당첨 제비를 뽑을 확률이 $\\dfrac{${num}}{${den}}$ 이 되었다. 더 넣은 꽝 제비는 몇 개인지 구하시오.`,
        answer: `$${added}$개`,
        solution: `더 넣은 꽝 제비를 $x$개라 하면 제비는 모두 $(${winning}+${losingBefore}+x)$개이므로 $\\dfrac{${winning}}{${winning + losingBefore}+x}=\\dfrac{${num}}{${den}}$ 이다.\n$${num}\\times(${winning + losingBefore}+x)=${den}\\times${winning}$ 에서 $${winning + losingBefore}+x=${finalTotal}$ 이므로 $x=${added}$ 이다.`,
        facts: {
          winning,
          losingBefore,
          probabilityNumerator: num,
          probabilityDenominator: den,
          added,
        },
      };
    },
  ),

  // 06 ─────────────────────────────────────────────
  def("06", "사건 또는 사건 가 일어날 확률", SEC.계산, "응용", (rng) => {
    // 갈래를 **재시도 밖에서** 뽑는다 — 안에서 뽑으면 조건이 까다로운 갈래
    // (회전판: 최소공배수가 칸 수를 넘어야 한다)가 재시도마다 밀려나
    // 지면에 거의 안 나온다. 실측으로 6문항 중 0회였다.
    const kind = pick(rng, [0, 1, 2] as const);
    return attempt(300, (): Body | null => {
      if (kind === 2) {
        // 회전판 — 두 배수 사건. 최소공배수가 k 를 넘어야 «동시에 일어나지 않는다»
        const k = pick(rng, SPIN_SIZES);
        const a = intBetween(rng, 2, 5);
        const b = intBetween(rng, 2, 5);
        if (a >= b) return null;
        if ((a * b) / gcd(a, b) <= k) return null;
        const ca = Math.floor(k / a);
        const cb = Math.floor(k / b);
        if (ca < 1 || cb < 1) return null;
        const p = red(ca + cb, k);
        return {
          content: `${spinnerHead(k)} 바늘이 가리키는 부분에 적힌 수가 $${a}$의 배수 또는 $${b}$의 배수일 확률을 구하시오.${SPIN_TAIL}`,
          answer: ansTex(p),
          solution: `$1$부터 $${k}$까지의 자연수 중 $${a}$의 배수는 $${ca}$개, $${b}$의 배수는 $${cb}$개이고, 두 사건은 동시에 일어나지 않는다.\n따라서 구하는 확률은 $\\dfrac{${ca}}{${k}}+\\dfrac{${cb}}{${k}}=${fracTex(p)}$ 이다.`,
          facts: { kind, k, a, b, num: p.n, den: p.d },
          figureSpec: spinnerFigure(k),
        };
      }
      if (kind === 0) {
        const N = intBetween(rng, 15, 30);
        const a = intBetween(rng, 4, 9);
        const b = intBetween(rng, 4, 9);
        if (a === b) return null;
        if ((a * b) / gcd(a, b) <= N) return null;
        const cnt = Math.floor(N / a) + Math.floor(N / b);
        const p = red(cnt, N);
        return {
          content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 한 장을 뽑을 때, $${a}$의 배수 또는 $${b}$의 배수가 적힌 카드가 나올 확률을 구하시오.`,
          answer: ansTex(p),
          solution: `$${a}$의 배수가 나올 확률은 $\\dfrac{${Math.floor(N / a)}}{${N}}$, $${b}$의 배수가 나올 확률은 $\\dfrac{${Math.floor(N / b)}}{${N}}$ 이고, 두 사건은 동시에 일어나지 않는다.\n따라서 구하는 확률은 $\\dfrac{${Math.floor(N / a)}}{${N}}+\\dfrac{${Math.floor(N / b)}}{${N}}=${fracTex(p)}$ 이다.`,
          facts: { kind, N, a, b, num: p.n, den: p.d },
        };
      }
      const S1 = intBetween(rng, 3, 6);
      const S2 = intBetween(rng, 8, 11);
      const c1 = 6 - Math.abs(7 - S1);
      const c2 = 6 - Math.abs(7 - S2);
      const p = red(c1 + c2, 36);
      return {
        content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${S1}$ 또는 $${S2}$일 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `합이 $${S1}$인 경우는 $${c1}$가지, 합이 $${S2}$인 경우는 $${c2}$가지이고, 두 사건은 동시에 일어나지 않는다.\n따라서 구하는 확률은 $\\dfrac{${c1}}{36}+\\dfrac{${c2}}{36}=${fracTex(p)}$ 이다.`,
        facts: { kind, S1, S2, num: p.n, den: p.d },
      };
    });
  }),

  // 07 ─────────────────────────────────────────────
  def("07", "두 사건 가 동시에 일어날 확률", SEC.계산, "응용", (rng): Body => {
    const w1 = intBetween(rng, 2, 5);
    const b1 = intBetween(rng, 2, 5);
    const w2 = intBetween(rng, 2, 5);
    const b2 = intBetween(rng, 2, 5);
    const p = red(w1 * b2, (w1 + b1) * (w2 + b2));
    return {
      content: `A 주머니에는 흰 공 $${w1}$개와 검은 공 $${b1}$개, B 주머니에는 흰 공 $${w2}$개와 검은 공 $${b2}$개가 들어 있다. A, B 두 주머니에서 각각 공을 한 개씩 꺼낼 때, A 주머니에서는 흰 공, B 주머니에서는 검은 공이 나올 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `A 주머니에서 흰 공이 나올 확률은 $\\dfrac{${w1}}{${w1 + b1}}$ 이고, B 주머니에서 검은 공이 나올 확률은 $\\dfrac{${b2}}{${w2 + b2}}$ 이다.\n두 사건은 서로 영향을 주지 않으므로 구하는 확률은 $\\dfrac{${w1}}{${w1 + b1}}\\times\\dfrac{${b2}}{${w2 + b2}}=${fracTex(p)}$ 이다.`,
      facts: { w1, b1, w2, b2, num: p.n, den: p.d },
    };
  }),

  // 08 ─────────────────────────────────────────────
  def("08", "두 사건 중 적어도 하나가 일어날 확률", SEC.계산, "응용", (rng) =>
    attempt(100, (): Body | null => {
      const pa = pick(rng, NICE_PROBS);
      const pb = pick(rng, NICE_PROBS);
      if (pa[0] * pb[1] === pb[0] * pa[1]) return null;
      const P: Frac = { n: pa[0], d: pa[1] };
      const Q: Frac = { n: pb[0], d: pb[1] };
      const miss = mulF(oneMinus(P), oneMinus(Q));
      const ans = oneMinus(miss);
      return {
        content: `어떤 자격시험에서 승우가 합격할 확률은 $${fracTex(P)}$ 이고, 나연이가 합격할 확률은 $${fracTex(Q)}$ 이다. 두 사람 중 적어도 한 명은 합격할 확률을 구하시오.`,
        answer: ansTex(ans),
        solution: `두 사람 모두 불합격할 확률은 $\\left(1-${fracTex(P)}\\right)\\times\\left(1-${fracTex(Q)}\\right)=${fracTex(miss)}$ 이다.\n따라서 적어도 한 명은 합격할 확률은 $1-${fracTex(miss)}=${fracTex(ans)}$ 이다.`,
        facts: { pn: P.n, pd: P.d, qn: Q.n, qd: Q.d, num: ans.n, den: ans.d },
      };
    }),
  ),

  // 09 ─────────────────────────────────────────────
  def("09", "확률의 덧셈과 곱셈", SEC.계산, "심화하", (rng) =>
    attempt(100, (): Body | null => {
      const a1 = intBetween(rng, 1, 4);
      const a2 = intBetween(rng, 1, 4);
      const b1 = intBetween(rng, 1, 4);
      const b2 = intBetween(rng, 1, 4);
      if (a1 + a2 === b1 + b2 && a1 === b1) return null; // 두 접시가 똑같으면 심심하다
      const nA = a1 + a2;
      const nB = b1 + b2;
      const half: Frac = { n: 1, d: 2 };
      const ans = addF(mulF(half, red(a1, nA)), mulF(half, red(b1, nB)));
      return {
        content: `A 접시에는 고기만두 $${a1}$개와 김치만두 $${a2}$개, B 접시에는 고기만두 $${b1}$개와 김치만두 $${b2}$개가 놓여 있다. 임의로 한 접시를 골라 만두 한 개를 집을 때, 고기만두일 확률을 구하시오. (단, 두 접시를 고를 확률은 같다.)`,
        answer: ansTex(ans),
        solution: `A 접시를 골라 고기만두를 집을 확률은 $\\dfrac{1}{2}\\times\\dfrac{${a1}}{${nA}}$ 이고, B 접시를 골라 고기만두를 집을 확률은 $\\dfrac{1}{2}\\times\\dfrac{${b1}}{${nB}}$ 이다.\n두 사건은 동시에 일어나지 않으므로 구하는 확률은 $\\dfrac{1}{2}\\times\\dfrac{${a1}}{${nA}}+\\dfrac{1}{2}\\times\\dfrac{${b1}}{${nB}}=${fracTex(ans)}$ 이다.`,
        facts: { a1, a2, b1, b2, num: ans.n, den: ans.d },
      };
    }),
  ),

  // 10 ─────────────────────────────────────────────
  def(
    "10",
    "연속하여 꺼내는 경우의 확률 꺼낸 것을 다시 넣는 경우",
    SEC.계산,
    "응용",
    (rng): Body => {
      const kind = pick(rng, [0, 1] as const);
      if (kind === 0) {
        const r = intBetween(rng, 2, 5);
        const b = intBetween(rng, 2, 5);
        const w = intBetween(rng, 1, 3);
        const n = r + b + w;
        const p = red(b * b, n * n);
        return {
          content: `빨간 공 $${r}$개, 파란 공 $${b}$개, 흰 공 $${w}$개가 들어 있는 주머니에서 한 개의 공을 꺼내어 확인하고 다시 넣은 후 한 개의 공을 또 꺼낼 때, 두 번 모두 파란 공이 나올 확률을 구하시오.`,
          answer: ansTex(p),
          solution: `꺼낸 공을 다시 넣으므로 두 번 모두 전체 $${n}$개 중에서 꺼낸다.\n따라서 구하는 확률은 $\\dfrac{${b}}{${n}}\\times\\dfrac{${b}}{${n}}=${fracTex(p)}$ 이다.`,
          facts: { kind, r, b, w, num: p.n, den: p.d },
        };
      }
      const N = pick(rng, [10, 12, 15, 20] as const);
      const a = pick(rng, [2, 3] as const);
      const q = pick(rng, [6, 8, 10, 12] as const);
      let cq = 0;
      for (let e = 1; e <= N; e += 1) {
        if (q % e === 0) cq += 1;
      }
      const ca = Math.floor(N / a);
      const p = red(ca * cq, N * N);
      return {
        content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 한 장을 뽑아 확인하고 다시 넣은 후 한 장을 또 뽑을 때, 첫 번째에는 $${a}$의 배수, 두 번째에는 $${q}$의 약수가 적힌 카드가 나올 확률을 구하시오.`,
        answer: ansTex(p),
        solution: `$${a}$의 배수는 $${ca}$장이므로 첫 번째 확률은 $\\dfrac{${ca}}{${N}}$ 이고, $${q}$의 약수는 $${cq}$장이므로 두 번째 확률은 $\\dfrac{${cq}}{${N}}$ 이다.\n따라서 구하는 확률은 $\\dfrac{${ca}}{${N}}\\times\\dfrac{${cq}}{${N}}=${fracTex(p)}$ 이다.`,
        facts: { kind, N, a, q, num: p.n, den: p.d },
      };
    },
  ),

  // 11 ─────────────────────────────────────────────
  def(
    "11",
    "연속하여 꺼내는 경우의 확률 꺼낸 것을 다시 넣지 않는 경우",
    SEC.계산,
    "응용",
    (rng): Body => {
      const kind = pick(rng, [0, 1] as const);
      if (kind === 0) {
        const r = intBetween(rng, 2, 5);
        const b = intBetween(rng, 3, 6);
        const n = r + b;
        const p = red(b * (b - 1), n * (n - 1));
        return {
          content: `빨간 공 $${r}$개와 파란 공 $${b}$개가 들어 있는 주머니에서 공을 한 개씩 두 번 꺼낼 때, 두 번 모두 파란 공이 나올 확률을 구하시오. (단, 꺼낸 공은 다시 넣지 않는다.)`,
          answer: ansTex(p),
          solution: `첫 번째에 파란 공이 나올 확률은 $\\dfrac{${b}}{${n}}$ 이고, 그때 두 번째에 파란 공이 나올 확률은 $\\dfrac{${b - 1}}{${n - 1}}$ 이다.\n따라서 구하는 확률은 $\\dfrac{${b}}{${n}}\\times\\dfrac{${b - 1}}{${n - 1}}=${fracTex(p)}$ 이다.`,
          facts: { kind, r, b, num: p.n, den: p.d },
        };
      }
      const r = intBetween(rng, 2, 5);
      const b = intBetween(rng, 2, 5);
      const n = r + b;
      const p = red(2 * r * b, n * (n - 1));
      return {
        content: `노란 공 $${r}$개와 파란 공 $${b}$개가 들어 있는 주머니에서 공을 한 개씩 두 번 꺼낼 때, 두 공의 색이 서로 다를 확률을 구하시오. (단, 꺼낸 공은 다시 넣지 않는다.)`,
        answer: ansTex(p),
        solution: `노란 공 다음 파란 공이 나올 확률은 $\\dfrac{${r}}{${n}}\\times\\dfrac{${b}}{${n - 1}}$ 이고, 파란 공 다음 노란 공이 나올 확률은 $\\dfrac{${b}}{${n}}\\times\\dfrac{${r}}{${n - 1}}$ 이다.\n따라서 구하는 확률은 두 확률의 합인 $${fracTex(p)}$ 이다.`,
        facts: { kind, r, b, num: p.n, den: p.d },
      };
    },
  ),

  // 12 ─────────────────────────────────────────────
  def("12", "승패에 대한 확률", SEC.계산, "심화하", (rng): Body => {
    const cond = pick(rng, [0, 1, 2, 3, 4] as const);
    const who = pick(rng, [0, 1] as const); // 0: A(1·3회), 1: B(2·4회)
    const c = DICE_CONDS[cond]!;
    const p = red(c.count, 6);
    const q = oneMinus(p);
    // A: p + q²p · B: qp + q³p
    const ans =
      who === 0
        ? addF(p, mulF(mulF(q, q), p))
        : addF(mulF(q, p), mulF(mulF(q, mulF(q, q)), p));
    const winner = who === 0 ? "A" : "B";
    return {
      content: `A, B 두 사람이 한 개의 주사위를 한 번씩 번갈아 던져 ${c.text}의 눈이 먼저 나오는 사람이 이기는 게임을 한다. $1$회에는 A, $2$회에는 B, $3$회에는 A, $4$회에는 B 의 순서로 던질 때, $4$회 이내에 ${winner} 가 이길 확률을 구하시오.`,
      answer: ansTex(ans),
      solution: `한 번 던져 ${c.text}의 눈이 나올 확률은 $${fracTex(p)}$, 나오지 않을 확률은 $${fracTex(q)}$ 이다.\n${
        who === 0
          ? `A 가 이기려면 $1$회에 성공하거나, $1$·$2$회에 모두 실패한 뒤 $3$회에 성공해야 한다.\n따라서 구하는 확률은 $${fracTex(p)}+${fracTex(q)}\\times${fracTex(q)}\\times${fracTex(p)}=${fracTex(ans)}$ 이다.`
          : `B 가 이기려면 $1$회 실패 뒤 $2$회에 성공하거나, $1$~$3$회에 모두 실패한 뒤 $4$회에 성공해야 한다.\n따라서 구하는 확률은 $${fracTex(q)}\\times${fracTex(p)}+${fracTex(q)}\\times${fracTex(q)}\\times${fracTex(q)}\\times${fracTex(p)}=${fracTex(ans)}$ 이다.`
      }`,
      facts: { cond, who, succ: c.count, num: ans.n, den: ans.d },
    };
  }),

  // 13 ─────────────────────────────────────────────
  def("13", "이전 사건에 영향을 받는 확률", SEC.계산, "심화하", (rng) =>
    attempt(100, (): Body | null => {
      const pw = pick(rng, NICE_PROBS);
      const pl = pick(rng, NICE_PROBS);
      if (pw[0] * pl[1] === pl[0] * pw[1]) return null;
      const P1: Frac = { n: pw[0], d: pw[1] }; // 이긴 다음 날 이길 확률
      const P2: Frac = { n: pl[0], d: pl[1] }; // 진 다음 날 이길 확률
      const wantWin = pick(rng, [0, 1] as const);
      const winP = addF(mulF(P1, P1), mulF(oneMinus(P1), P2));
      const ans = wantWin === 1 ? winP : oneMinus(winP);
      const word = wantWin === 1 ? "이길" : "질";
      return {
        content: `어느 축구팀이 경기에서 이긴 날의 다음 날 이길 확률은 $${fracTex(P1)}$ 이고, 진 날의 다음 날 이길 확률은 $${fracTex(P2)}$ 이다. 이 팀이 $3$일 연속으로 경기를 하는데 첫째 날 이겼을 때, 셋째 날 ${word} 확률을 구하시오. (단, 비기는 경우는 없다.)`,
        answer: ansTex(ans),
        solution: `둘째 날 이기고 셋째 날 이길 확률은 $${fracTex(P1)}\\times${fracTex(P1)}$ 이고, 둘째 날 지고 셋째 날 이길 확률은 $\\left(1-${fracTex(P1)}\\right)\\times${fracTex(P2)}$ 이다.\n따라서 셋째 날 이길 확률은 $${fracTex(winP)}$ 이고, 구하는 확률은 $${fracTex(ans)}$ 이다.`,
        facts: {
          p1n: P1.n,
          p1d: P1.d,
          p2n: P2.n,
          p2d: P2.d,
          wantWin,
          num: ans.n,
          den: ans.d,
        },
      };
    }),
  ),

  /*
   * 06A·07A — 확률의 계산에는 `연산`·`기본` 이 **하나도 없었다**(06~13 이 응용 5 ·
   * 심화 3). 하위반 프리셋이 이 소단원에서 밑단을 한 문항도 못 채운다(D-106).
   * 그래서 덧셈 정리·곱셈 정리를 각각 밑단으로 하나씩 세운다.
   */
  def("06A", "확률의 덧셈", SEC.계산, "연산", (rng) =>
    attempt(100, (): Body | null => {
      const pa = pick(rng, NICE_PROBS);
      const pb = pick(rng, NICE_PROBS);
      const P: Frac = { n: pa[0], d: pa[1] };
      const Q: Frac = { n: pb[0], d: pb[1] };
      // 합이 $1$ 이상이면 「동시에 일어나지 않는다」와 어긋난다.
      if (P.n * Q.d + Q.n * P.d >= P.d * Q.d) return null;
      const ans = addF(P, Q);
      return {
        content: `두 사건 $A$, $B$ 는 동시에 일어나지 않는다. 사건 $A$ 가 일어날 확률이 $${fracTex(P)}$, 사건 $B$ 가 일어날 확률이 $${fracTex(Q)}$ 일 때, 사건 $A$ 또는 사건 $B$ 가 일어날 확률을 구하시오.`,
        answer: ansTex(ans),
        solution: `두 사건이 동시에 일어나지 않으므로 두 확률을 더한다.\n따라서 구하는 확률은 $${fracTex(P)}+${fracTex(Q)}=${fracTex(ans)}$ 이다.`,
        facts: { pn: P.n, pd: P.d, qn: Q.n, qd: Q.d, num: ans.n, den: ans.d },
      };
    }),
  ),

  def("07A", "동전과 주사위의 확률", SEC.계산, "기본", (rng): Body => {
    const cond = pick(rng, [0, 1, 2, 3, 4] as const);
    const c = DICE_CONDS[cond]!;
    const p = red(c.count, 12);
    return {
      content: `한 개의 동전과 한 개의 주사위를 동시에 던질 때, 동전은 앞면이 나오고 주사위는 ${c.text}의 눈이 나올 확률을 구하시오.`,
      answer: ansTex(p),
      solution: `동전에서 앞면이 나올 확률은 $\\dfrac{1}{2}$ 이고, 주사위에서 ${c.text}의 눈이 나오는 경우는 $${c.count}$가지이므로 그 확률은 $${reduceTex(c.count, 6)}$ 이다.\n두 사건은 서로 영향을 주지 않으므로 구하는 확률은 $\\dfrac{1}{2}\\times${fracTex(red(c.count, 6))}=${fracTex(p)}$ 이다.`,
      facts: { cond, succ: c.count, num: p.n, den: p.d },
    };
  }),
];
