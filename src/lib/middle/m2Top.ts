/**
 * 중2 **확대 갈래**(`심화중`·`심화상`) 소유 모듈 — D-116.
 *
 * ## 왜 새 파일인가 (병렬 세션 규약)
 *
 * 학년마다 세션이 하나이고(중1 `m1Top.ts` · 중2 여기 · 중3 `m3Top.ts`),
 * `generate.ts` 의 `ALL` 에 **spread 한 줄**만 더한다. 기존 모듈(`m2System.ts` 등)에
 * 섞으면 그 모듈을 잠그는 시험들(「N유형 명부가 색인 그대로다」)이 통째로 빨개지고,
 * 그것을 초록으로 만드는 유일한 길은 **가드를 무르는 것**이다(`midSupB.ts` 머리말).
 *
 * ## 번호 규약
 *
 * 기존 갈래가 쓰는 자리(A ~43 · B 21~35·50~ · C 70번대 · D ~38)와 안 겹치게
 * **90번대**를 쓴다. 중1 `m1Types10.ts` 도 90~93 을 쓰지만 **중단원이 다르므로**
 * 키(`책|중단원|번호`)는 겹치지 않는다. 색인 최대 번호(연립일차방정식 20 ·
 * 경우의 수 16 · 피타고라스 정리 16)를 전부 넘으므로 `extensionNumberReason`
 * 이 요구하는 「확장 번호는 색인 최대를 넘어야 한다」도 만족한다.
 *
 * ## 🔴 무엇이 «중»이고 무엇이 «상»인가 (D-115 ⑶⑾ · D-116 ⑵)
 *
 * ```
 * 심화중  되짚기 사슬에 **값이 하나로 안 굳는 마디가 하나** 있고,
 *         **그 소단원의 성질**이 후보를 «끝까지 계산하지 않고» 굳힌다.
 * 심화상  성질로 못 굳혀 **후보를 다 만들어 견주어야** 하나가 남고,
 *         그 후보를 **발문이 주지 않는다.**
 * ```
 *
 * 그리고 **판정의 참은 «해설이 밟는 길»이다**(D-115 ⑾). 그래서 이 파일의 해설은
 * 후보를 **실제로 늘어놓고**(상) 또는 **성질 한 줄로 접는다**(중). 어느 쪽인지
 * 해설을 읽으면 바로 보이게 썼다.
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정을 여기서 막는다
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의
 *    같은 자리(끝)」면 굳힘 조건의 값은 유일성에는 필요하지만 «어느 후보인가»를
 *    한 번도 안 고른다 — 정보는 있고 **선택력이 0**이다. 초6 에서 갈래 둘이
 *    이것으로 병합이 막혔다(23/23 · 672/672 전수).
 *    → 후보 목록이 있는 갈래는 `2-1|연립일차방정식|91` 하나이고, 그 굳힘 조건
 *      (「$x+y$ 가 소수」)은 자리와 상관이 없다. 자를 따로 두었다:
 *      `scripts/qa/probe-middle-extending-tiers.ts --anchor`.
 * ㉡ **굳힘이 항등식이면 조건을 지워도 답이 그대로다.** 다섯 갈래 전부에 대해
 *    「굳힘 조건을 지우고 같은 씨앗으로 돌리면 답이 바뀌는가」를 잰다
 *    (`--erase`). 답이 안 바뀌면 그것은 굳힘이 아니라 장식이다.
 * ㉢ **갈래끼리 겹치면 한 시험지에 같이 실린다.** 같은 소단원의 `응용`·`심화하`
 *    와의 겹침을 «지면 수+정답»과 «발문 한글 낱말 Jaccard» 둘로 잰다(`--overlap`).
 *
 * ## 규모를 키우는 축은 안 쓴다 (D-115 ⑽③)
 *
 * 수를 크게 하거나 걸음을 늘리는 것은 난이도가 아니다. 여기서 늘어나는 것은
 * **후보의 가짓수**가 아니라 **「어느 후보인가를 무엇이 고르는가」**다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/**
 * 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다).
 * `midSupB.ts` 가 같은 이유로 같은 함수를 두고 있다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

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
  rpmBook: string,
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${rpmBook}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 셈 소품 (생성기 쪽 — 시험은 다른 방법으로 다시 잰다) ──────────

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

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
}

/** 계수 $1$ 은 지면에 안 쓴다 — `1x` 는 값이 맞고 **지면만 흉하다**. */
function coef(k: number, v: string): string {
  if (k === 1) return v;
  if (k === -1) return `-${v}`;
  return `${k}${v}`;
}

/** $k \times (m t)$ — 계수가 $1$ 이면 곱셈 기호를 안 쓴다(`1\times4t` 를 막는다). */
function mulTex(k: number, m: number): string {
  return k === 1 ? coef(m, "t") : `${k}\\times ${coef(m, "t")}`;
}

// ── ⑴ 2-1 연립일차방정식 ─────────────────────────────────

const BOOK1 = "2-1";
const MINOR_SYSTEM = "연립일차방정식";
/** 우리 Unit.section 정확한 이름 (등록 유형에서 실측 2026-09-01) */
const SEC_SYSTEM_INTRO = "미지수가 2개인 연립일차방정식";

/** 서로소인 $p<q$ — 비 $pa=qb$ 는 $a:b=q:p$ 로 굳는다. */
const RATIOS: ReadonlyArray<readonly [number, number]> = (() => {
  const out: [number, number][] = [];
  for (let p = 1; p <= 8; p += 1) {
    for (let q = p + 1; q <= 9; q += 1) {
      if (gcd(p, q) === 1) out.push([p, q]);
    }
  }
  return out;
})();

/** 분모 짝 — 서로 달라야 $x$ 의 계수가 $0$ 이 아니다. */
const DENOMS: ReadonlyArray<readonly [number, number]> = [
  [2, 3],
  [3, 2],
  [2, 5],
  [3, 4],
  [4, 3],
  [3, 5],
];

/**
 * **심화중** — 비가 접어 굳힌 값을 다시 «일차방정식의 해»로 놓고 상수를 역산한다.
 *
 * 굳지 않는 마디: $a$, $b$ 의 **값**. 식이 하나뿐이라 해가 무수히 많다.
 * 굳히는 성질: 그 소단원의 개념 — 「미지수가 $2$ 개인 일차방정식 하나로는 값이
 * 안 정해지지만 **비는 하나로 정해진다**」. 그래서 $a=qt$, $b=pt$ 로 놓으면
 * $t$ 가 약분되어 물어본 식의 값이 **후보를 만들지 않고** 하나로 굳는다.
 * (매쓰홀릭 중등 심화(중) 실물의 꼴 그대로 — `matholic-mid-scan.md` §4.1)
 */
const TYPE_RATIO_ROOT = def(
  BOOK1,
  MINOR_SYSTEM,
  "90",
  "비로 굳힌 식의 값을 해로 하는 일차방정식",
  SEC_SYSTEM_INTRO,
  "심화중",
  (rng) =>
    attempt(600, () => {
      const [p, q] = pick(rng, RATIOS);
      const ca = intBetween(rng, 1, 7);
      const cb = intBetween(rng, 1, 7);
      // 계수가 같으면 $3a+3b=3(a+b)$ 로 묶여 「비로 접는다」는 마디가 흐려진다.
      if (ca === cb) return null;
      const num = ca * q + cb * p;
      if (num % (q - p) !== 0) return null;
      const k = num / (q - p);
      if (k < 6 || k > 40) return null;

      const [u, v] = pick(rng, DENOMS);
      // $k-c$ 가 $0$ 이하이면 지면에 `-2\times-5` 같은 것이 나간다.
      const c = intBetween(rng, 1, Math.min(9, k - 1));
      const d = intBetween(rng, 1, 9);
      // (k+m)/u - (k-c)/v = d  ⟹  v(k+m) - u(k-c) = uvd
      const A = v * k;
      const B = u * (k - c);
      const C = u * v * d;
      if ((C - A + B) % v !== 0) return null;
      const m = (C - A + B) / v;
      if (m === 0 || Math.abs(m) > 40) return null;

      const ratioTex = `${coef(p, "a")}=${coef(q, "b")}`;
      const numeratorTex = `${coef(ca, "a")}+${coef(cb, "b")}`;
      const eqTex = `\\dfrac{x+m}{${u}}-\\dfrac{x-${c}}{${v}}=${d}`;
      return {
        content:
          `$0$이 아닌 두 수 $a$, $b$에 대하여 $${ratioTex}$일 때, ` +
          `$\\dfrac{${numeratorTex}}{a-b}$의 값을 $k$라 하자.\n` +
          `$x$에 대한 일차방정식 $${eqTex}$의 해가 $x=k$일 때, 상수 $m$의 값을 구하시오.`,
        answer: `$${m}$`,
        solution:
          `$${ratioTex}$이므로 $a$와 $b$의 값은 하나로 정해지지 않는다. ` +
          `그러나 두 수의 비는 $a:b=${q}:${p}$${euroRo(p)} 하나뿐이므로, $0$이 아닌 수 $t$에 대하여 ` +
          `$a=${coef(q, "t")}$, $b=${coef(p, "t")}$로 놓을 수 있다.\n` +
          `이때 $${numeratorTex}=${mulTex(ca, q)}+${mulTex(cb, p)}=${coef(num, "t")}$이고 ` +
          `$a-b=${coef(q, "t")}-${coef(p, "t")}=${coef(q - p, "t")}$이므로 ` +
          `$k=\\dfrac{${coef(num, "t")}}{${coef(q - p, "t")}}=${k}$이다. ` +
          `($t$가 약분되므로 $k$의 값은 $t$에 관계없이 하나로 정해진다.)\n` +
          `$x=${k}$${eulReul(k)} $${eqTex}$에 대입하면 $\\dfrac{${k}+m}{${u}}-\\dfrac{${k}-${c}}{${v}}=${d}$이다.\n` +
          `양변에 $${u * v}$${eulReul(u * v)} 곱하면 $${v}\\times(${k}+m)-${u}\\times${k - c}=${C}$, 즉 $${A}+${v}m-${B}=${C}$이다.\n` +
          `따라서 $${v}m=${C - A + B}$이므로 $m=${m}$이다.`,
        facts: { p, q, ca, cb, k, u, v, c, d, m },
        figureSpec: null,
      };
    }),
);

/** $px+qy=n$ 의 자연수 해를 $y$ 가 작은 쪽부터 — 후보 목록 그 자체. */
export function naturalSolutions(
  p: number,
  q: number,
  n: number,
): ReadonlyArray<readonly [number, number]> {
  const out: [number, number][] = [];
  for (let y = 1; q * y + p <= n; y += 1) {
    const rest = n - q * y;
    if (rest % p === 0) out.push([rest / p, y]);
  }
  return out;
}

/**
 * **심화상** — 자연수 해를 **다 만들어** 각각을 견주어야 하나가 남는다.
 *
 * 발문은 후보를 주지 않는다. 후보는 되짚기(「$x$가 자연수이려면 $n-qy$가 $p$의 배수」)가
 * 만들고, 그중 어느 것인지는 **성질로 못 굳힌다** — 순서쌍마다 $x+y$ 를 실제로
 * 구해 소수인지 따져야 한다. 자는 `--anchor`.
 *
 * 🔴 **왜 $x$의 계수 $p$ 가 $2$ 와 $3$ 둘인가 — ㉠ 이 잡았다.**
 * $x+y=\dfrac{n}{p}+y\left(1-\dfrac{q}{p}\right)$ 이므로 $x+y$ 는 $y$ 에 대해 **단조**다.
 * $q>p$ 이면 뒤로 갈수록 작아지고, 작은 수일수록 소수가 잦다 — 그래서 $p=2$ 만
 * 쓰면 「**끝**을 집으면 맞다」가 우연(23.5%)을 넘어 26.9% 가 나왔다.
 * $p=3$ 은 $q<p$ 인 짝($q=4,5,\dots$ 는 여전히 $q>p$ 지만 기울기 $1-q/p$ 가 달라진다)에서
 * 기울기가 달라져 이 쏠림을 상쇄한다. 실측: 첫 10.0% · 끝 17.1% · 우연 20.2%
 * — **둘 다 우연 아래**. 문턱을 옮긴 것이 아니라 **모집단을 고쳤다.**
 */
const TYPE_PRIME_SUM = def(
  BOOK1,
  MINOR_SYSTEM,
  "91",
  "자연수 해 중 두 수의 합이 소수인 것",
  SEC_SYSTEM_INTRO,
  "심화상",
  (rng) =>
    attempt(600, () => {
      const p = intBetween(rng, 2, 3);
      const q = pick(rng, [3, 4, 5, 7, 9, 11] as const);
      if (gcd(p, q) !== 1) return null;
      const n = intBetween(rng, 25, 160);
      const sols = naturalSolutions(p, q, n);
      if (sols.length < 4 || sols.length > 9) return null;
      // 「$x=y$ 인 해가 있으면 그것이 답」이라는 지름길을 막는다.
      if (sols.some(([x, y]) => x === y)) return null;
      const hits = sols.filter(([x, y]) => isPrime(x + y));
      if (hits.length !== 1) return null;
      const [x0, y0] = hits[0]!;
      // $qy \le n-p$ 에서 오는 진짜 위끝 — 「마지막 후보의 $y$」가 아니다.
      // 후자를 쓰면 「왜 거기서 멈추나」가 해설에 안 적힌다.
      const yMax = Math.floor((n - p) / q);
      const firstY = sols[0]![1];
      // $y=1$ 부터 처음 걸릴 때까지 실제로 넣어 본 값 — 「왜 거기서 시작하나」.
      const probe: string[] = [];
      for (let y = 1; y <= firstY; y += 1) probe.push(`$${n - q * y}$`);
      const rowY = sols.map(([, y]) => `$${y}$`).join(", ");
      const rowX = sols.map(([x]) => `$${x}$`).join(", ");
      const rowS = sols.map(([x, y]) => `$${x + y}$`).join(", ");
      const lhs = `${coef(p, "x")}+${coef(q, "y")}`;
      return {
        content:
          `$${lhs}=${n}$${eulReul(n)} 만족시키는 자연수 $x$, $y$에 대하여 ` +
          `$x+y$가 소수일 때, $xy$의 값을 구하시오.`,
        answer: `$${x0 * y0}$`,
        solution:
          `$${lhs}=${n}$에서 $x=\\dfrac{${n}-${coef(q, "y")}}{${p}}$이다.\n` +
          `$x$가 자연수이려면 $${n}-${coef(q, "y")}$가 $${p}$의 배수이고 $${p}$ 이상이어야 하므로, ` +
          `$${coef(q, "y")}\\le${n - p}$에서 $y\\le${yMax}$이다.\n` +
          `$y=1$부터 차례로 넣으면 $${n}-${coef(q, "y")}$는 ${probe.join(", ")}이므로 ` +
          `처음으로 $${p}$의 배수가 되는 것은 $y=${firstY}$일 때이고, ` +
          `$${q}$${waGwa(q)} $${p}$${iGa(p)} 서로소이므로 그 뒤로는 $y$가 $${p}$씩 커질 때마다 다시 $${p}$의 배수가 된다.\n` +
          `그러므로 $y$는 ${rowY}이고, 이때 $x$는 차례로 ${rowX}이다.\n` +
          `각 순서쌍에서 $x+y$를 구하면 차례로 ${rowS}이다.\n` +
          `이 중 소수는 $${x0 + y0}$뿐이므로 $x=${x0}$, $y=${y0}$이다.\n` +
          `따라서 $xy=${x0}\\times${y0}=${x0 * y0}$이다.`,
        facts: { p, q, n, count: sols.length, x: x0, y: y0, sum: x0 + y0 },
        figureSpec: null,
      };
    }),
);

// ── ⑵ 2-2 경우의 수 ──────────────────────────────────────

const BOOK2 = "2-2";
const MINOR_COUNT = "경우의 수";
const SEC_COUNT = "경우의 수";
const SEC_COUNT_VARIOUS = "여러 가지 경우의 수";

const PERSON_NAMES = ["A", "B", "C", "D", "E", "F"] as const;

function factorial(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

/** $n$ 부터 $1$ 까지 곱을 지면 글자로 — 「$4\times3\times2\times1$」. */
function factorialTex(n: number): string {
  const parts: number[] = [];
  for (let i = n; i >= 1; i -= 1) parts.push(i);
  return parts.join("\\times");
}

/**
 * **심화중** — 굳지 않는 마디는 「$P$ 가 $Q$ 보다 앞인 것이 몇 가지인가」이고,
 * 그것을 **곱의 법칙으로는 못 센다**(자리마다 고를 수 있는 수가 안 정해진다).
 *
 * 굳히는 성질: 그 소단원의 개념 — 「자격이 같은 둘을 뽑을 때는 순서만 다른 두
 * 경우가 같은 것이므로 $2$ 로 나눈다」(대표 뽑기). 여기서는 $P$, $Q$ 의 **자리만**
 * 맞바꾼 두 배열을 짝지어 전체를 둘로 가른다 — **하나도 세지 않고** 굳는다.
 *
 * ⚠️ 짝짓기가 성립하려면 이웃 조건에 걸린 둘과 앞뒤 조건에 걸린 둘이 **서로 달라야**
 *    한다. 겹치면 자리를 맞바꿀 때 이웃 여부가 깨져서 둘씩 나눠지지 않는다.
 *    그래서 네 사람을 겹치지 않게 뽑는다(시험이 이 불변식을 잠근다).
 */
const TYPE_LINE_HALF = def(
  BOOK2,
  MINOR_COUNT,
  "90",
  "이웃 조건과 앞뒤 조건이 겹친 한 줄 세우기",
  SEC_COUNT_VARIOUS,
  "심화중",
  (rng) =>
    attempt(200, () => {
      const n = intBetween(rng, 5, 6);
      const names = PERSON_NAMES.slice(0, n);
      const idx = [0, 1, 2, 3, 4, 5].slice(0, n);
      // 겹치지 않는 네 사람 — 앞 둘은 이웃 조건, 뒤 둘은 앞뒤 조건.
      const shuffled = [...idx];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = intBetween(rng, 0, i);
        const t = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = t;
      }
      // 순서 조건에 걸리는 사람 수 — 둘이면 «앞에», 셋이면 «이 순서대로».
      const orderSize = intBetween(rng, 2, 3);
      if (2 + orderSize > n) return null;
      const nearIdx = shuffled.slice(0, 2);
      const orderIdx = shuffled.slice(2, 2 + orderSize);
      if (nearIdx.length !== 2 || orderIdx.length !== orderSize) return null;
      const near = nearIdx.map((i) => names[i]!).sort();
      const order = orderIdx.map((i) => names[i]!);
      const adjacent = intBetween(rng, 0, 1) === 1;

      const total = factorial(n);
      const together = factorial(n - 1) * 2;
      const base = adjacent ? together : total - together;
      const groupWays = factorial(orderSize);
      const answer = base / groupWays;

      const nearTex = `$${near[0]}$와 $${near[1]}$`;
      const orderTex = order.map((x) => `$${x}$`).join(", ");
      const cond = adjacent ? "서로 이웃하고" : "서로 이웃하지 않고";
      const orderCond =
        orderSize === 2
          ? `$${order[0]}$가 $${order[1]}$보다 앞에 서는`
          : `${orderTex}가 앞에서부터 이 순서대로 서는`;
      const head =
        `${names.map((x) => `$${x}$`).join(", ")}의 $${n}$명을 한 줄로 세울 때, ` +
        `${nearTex}는 ${cond} ${orderCond} 경우의 수를 구하시오.` +
        (orderSize === 3 ? ` (단, ${orderTex}가 이웃할 필요는 없다.)` : "");

      const adjLine =
        `${nearTex}를 한 사람으로 묶으면 $${n - 1}$명을 한 줄로 세우는 것과 같으므로 ` +
        `$${factorialTex(n - 1)}=${factorial(n - 1)}$(가지)이고, ` +
        `묶음 안에서 두 사람의 자리를 바꾸는 경우가 $2$가지이므로 ` +
        `${nearTex}가 이웃하는 경우의 수는 $${factorial(n - 1)}\\times2=${together}$이다.`;
      const notAdjLine =
        `$${n}$명을 한 줄로 세우는 경우의 수는 $${factorialTex(n)}=${total}$이다.\n` +
        `이 중 ${nearTex}가 이웃하는 경우는 둘을 한 사람으로 묶어 ` +
        `$${factorialTex(n - 1)}=${factorial(n - 1)}$(가지)에 묶음 안에서 자리를 바꾸는 $2$를 곱한 ` +
        `$${factorial(n - 1)}\\times2=${together}$이다.\n` +
        `따라서 ${nearTex}가 이웃하지 않는 경우의 수는 $${total}-${together}=${base}$이다.`;

      return {
        content: head,
        answer: `$${answer}$`,
        solution:
          `${adjacent ? adjLine : notAdjLine}\n` +
          `이 $${base}$가지를 ${orderTex}가 놓인 ${orderSize === 2 ? "두" : "세"} 자리에 ` +
          `이 ${orderSize === 2 ? "두" : "세"} 사람을 배열하는 ` +
          `$${factorialTex(orderSize)}=${groupWays}$가지끼리 한 묶음으로 모으면, ` +
          `한 묶음 안의 $${groupWays}$가지 중 정확히 하나에서만 ${orderCond} 배열이 된다.\n` +
          `이 ${orderSize === 2 ? "두" : "세"} 사람끼리 자리를 바꾸어도 ${nearTex}의 이웃 여부는 ` +
          `달라지지 않으므로, 이 묶기는 $${base}$가지 전체를 빠짐없이 $${groupWays}$개씩 나눈다.\n` +
          `따라서 구하는 경우의 수는 $${base}\\div${groupWays}=${answer}$이다.`,
        facts: {
          n,
          adjacent: adjacent ? 1 : 0,
          orderSize,
          near1: nearIdx[0]!,
          near2: nearIdx[1]!,
          order1: orderIdx[0]!,
          order2: orderIdx[1]!,
          base,
          answer,
        },
        figureSpec: null,
      };
    }),
);

type DiceCondition = {
  /** 지면 글자 */
  text: string;
  ok: (a: number, b: number) => boolean;
};

const DICE_PAIRS: ReadonlyArray<readonly [number, number]> = (() => {
  const out: [number, number][] = [];
  for (let a = 1; a <= 6; a += 1)
    for (let b = 1; b <= 6; b += 1) out.push([a, b]);
  return out;
})();

/**
 * **심화상** — 조건이 **둘** 걸려 있고, 어느 순서쌍이 남는지는 성질로 못 굳힌다.
 * $36$ 쌍을 **실제로 만들어** 두 조건을 차례로 대야 한다.
 * (매쓰홀릭 중등 고난도 실물의 꼴 — 「조건 (가)(나)를 각각 훑는다」)
 *
 * 생성기는 **두 조건이 둘 다 무는 것**만 낸다 — 한쪽을 지워도 답이 그대로면
 * 그 조건은 굳힘이 아니라 장식이다(초등 ㉡ 함정). 그 불변식은 여기서 강제하고
 * `--erase` 가 다시 잰다.
 */
const TYPE_DICE_TWO_COND = def(
  BOOK2,
  MINOR_COUNT,
  "91",
  "두 조건을 모두 만족시키는 주사위 눈의 순서쌍",
  SEC_COUNT,
  "심화상",
  (rng) =>
    attempt(600, () => {
      // $k=2$ 이면 조건 (가)를 만족시키는 순서쌍이 18개라 해설의 목록이 지면을
      // 두 줄 넘게 먹는다. 나열은 이 갈래의 «일»이므로 지우지 않고, 대신 목록이
      // 읽을 만한 길이가 되는 $k$ 만 쓴다.
      const k = intBetween(rng, 3, 5);
      const condA: DiceCondition = {
        text: `$a+b$는 $${k}$의 배수이다.`,
        ok: (a, b) => (a + b) % k === 0,
      };
      const useProduct = intBetween(rng, 0, 1) === 1;
      const m = useProduct
        ? pick(rng, [4, 6, 8, 9, 10, 12] as const)
        : intBetween(rng, 0, 8);
      const condB: DiceCondition = useProduct
        ? {
            text: `$ab$는 $${m}$의 배수이다.`,
            ok: (a, b) => (a * b) % m === 0,
          }
        : {
            text: `$x$에 대한 일차방정식 $ax=b+${m}$의 해가 자연수이다.`,
            ok: (a, b) => (b + m) % a === 0,
          };
      if (!useProduct && m === 0) return null;

      const onlyA = DICE_PAIRS.filter(([a, b]) => condA.ok(a, b));
      const onlyB = DICE_PAIRS.filter(([a, b]) => condB.ok(a, b));
      const both = DICE_PAIRS.filter(
        ([a, b]) => condA.ok(a, b) && condB.ok(a, b),
      );
      if (both.length < 3 || both.length > 12) return null;
      // 두 조건이 **둘 다 물어야** 한다 — 한쪽만으로 답이 같으면 나머지는 장식이다.
      if (both.length === onlyA.length || both.length === onlyB.length) {
        return null;
      }

      const listA = onlyA.map(([a, b]) => `$(${a},\\,${b})$`).join(", ");
      const kept = both.map(([a, b]) => `$(${a},\\,${b})$`).join(", ");
      const dropped = onlyA
        .filter(([a, b]) => !condB.ok(a, b))
        .map(([a, b]) => `$(${a},\\,${b})$`)
        .join(", ");
      const checkLine = useProduct
        ? `각 순서쌍에서 $ab$를 구하면 차례로 ${onlyA
            .map(([a, b]) => `$${a * b}$`)
            .join(", ")}이다.`
        : `$ax=b+${m}$의 해는 $x=\\dfrac{b+${m}}{a}$이므로, 각 순서쌍에서 $\\dfrac{b+${m}}{a}$를 구하면 차례로 ` +
          `${onlyA
            .map(([a, b]) => {
              const t = b + m;
              if (t % a === 0) return `$${t / a}$`;
              // 약분하지 않으면 지면에 $\dfrac{10}{4}$ 가 나간다 — 값은 맞고
              // **지면만 흉한** 부류라 값 검산으로는 절대 안 잡힌다.
              const g = gcd(t, a);
              return `$\\dfrac{${t / g}}{${a / g}}$`;
            })
            .join(", ")}이다.`;

      return {
        content:
          `서로 다른 두 개의 주사위 A, B를 동시에 던져서 나온 눈의 수를 각각 $a$, $b$라 하자.\n` +
          `다음 두 조건을 모두 만족시키는 순서쌍 $(a,\\,b)$의 개수를 구하시오.\n` +
          `(가) ${condA.text}\n(나) ${condB.text}`,
        answer: `$${both.length}$`,
        solution:
          `조건 (가)를 만족시키는 순서쌍 $(a,\\,b)$는 ${listA}의 $${onlyA.length}$가지이다.\n` +
          `${checkLine}\n` +
          `이 중 조건 (나)를 만족시키는 것은 ${kept}이고, ` +
          `만족시키지 않는 것은 ${dropped}이다.\n` +
          `따라서 두 조건을 모두 만족시키는 순서쌍의 개수는 $${both.length}$이다.`,
        facts: {
          k,
          m,
          useProduct: useProduct ? 1 : 0,
          onlyA: onlyA.length,
          onlyB: onlyB.length,
          both: both.length,
        },
        figureSpec: null,
      };
    }),
);

// ── ⑶ 2-2 피타고라스 정리 ────────────────────────────────

const MINOR_PYTHA = "피타고라스 정리";
const SEC_PYTHA = "피타고라스 정리";

/**
 * 한 변이 $a$ 인 자연수 직각삼각형 — $(c+b)(c-b)=a^2$ 의 인수 짝을 **전부** 만든다.
 * 짧은 쪽 인수가 작을수록 빗변이 길다. $a$ 는 **짝수**다(아래 `LEGS` 참조).
 */
export function legTriangles(
  a: number,
): ReadonlyArray<{ m: number; n: number; b: number; c: number }> {
  const product = (a * a) / 4;
  const out: { m: number; n: number; b: number; c: number }[] = [];
  for (let m = 1; m * m < product; m += 1) {
    if (product % m !== 0) continue;
    const n = product / m;
    const c = m + n;
    const b = n - m;
    if (b < 1) continue;
    out.push({ m, n, b, c });
  }
  return out;
}

/**
 * 후보가 둘 이상이고 수가 지면에서 읽을 만한 한 변의 길이.
 *
 * 🔴 **왜 짝수만인가 — ㉡ 가 잡았다.** 처음에는 홀수 $a$ 도 받았다. 그런데 홀수면
 *    $(c+b)(c-b)=a^2$ 의 두 인수가 **저절로** 둘 다 홀수라, 해설의 「홀짝을 따진다」
 *    걸음이 **하는 일이 하나도 없다** — 그 걸음을 지워도 답이 그대로였다(`--erase`
 *    가 홀수 $a$ 에서 100%). 짝수면 $a^2$ 의 인수 짝 일곱 중 넷만 살아남는 식으로
 *    그 걸음이 실제로 후보를 거른다. 굳힘이 장식이 되는 자리를 **모집단에서**
 *    없앴다(문턱을 옮긴 것이 아니다).
 */
const LEGS: readonly number[] = (() => {
  const out: number[] = [];
  for (let a = 6; a <= 30; a += 2) {
    const t = legTriangles(a);
    if (t.length < 2) continue;
    if (Math.max(...t.map((x) => x.c)) > 150) continue;
    out.push(a);
  }
  return out;
})();

/**
 * **심화상** — 후보를 **다 만들어** 견주어야 한다. 발문은 후보를 주지 않는다:
 * $(c+b)(c-b)=a^2$ 의 인수 짝을 하나도 빠뜨리지 않고 만들어야 개수·넓이가 나온다.
 *
 * 왜 성질로 못 굳히나: 「어떤 인수 짝이 답인가」가 아니라 **전부가 답**이고,
 * 그 전부를 알려면 $a^2$ 의 약수를 실제로 늘어놓아야 한다. 「$3$, $4$, $5$」처럼
 * 외운 피타고라스 수 하나로는 나머지를 못 찾는다.
 *
 * ⚠️ 정직하게 — 이 갈래는 **후보 중 하나를 고르는 꼴이 아니라 전부를 세는 꼴**이라
 *    ㉠(「끝을 집으면 맞다」)이 성립할 자리가 없다. 대신 ㉡(조건을 지우면 답이
 *    바뀌는가)로만 잰다.
 */
const TYPE_LEG_TRIPLES = def(
  BOOK2,
  MINOR_PYTHA,
  "90",
  "빗변이 아닌 한 변이 주어진 자연수 직각삼각형",
  SEC_PYTHA,
  "심화상",
  (rng) =>
    attempt(200, () => {
      const a = pick(rng, LEGS);
      const tri = legTriangles(a);
      if (tri.length < 2) return null;
      const ask = intBetween(rng, 0, 2); // 0 개수 · 1 넓이의 합 · 2 빗변의 합
      const areas = tri.map((t) => (a * t.b) / 2);
      const areaSum = areas.reduce((s, x) => s + x, 0);
      const hypSum = tri.reduce((s, t) => s + t.c, 0);
      if (ask === 1 && areaSum > 4000) return null;

      const product = (a * a) / 4;
      const factorPairs: string[] = [];
      for (let m = 1; m * m <= product; m += 1) {
        if (product % m !== 0) continue;
        factorPairs.push(`$${m}\\times${product / m}$`);
      }
      const chosen = tri.map((t) => `$(${t.m},\\,${t.n})$`).join(", ");
      const bcList = tri.map((t) => `$(${t.b},\\,${t.c})$`).join(", ");
      const areaList = tri
        .map((t) => `$\\dfrac{1}{2}\\times${a}\\times${t.b}=${(a * t.b) / 2}$`)
        .join(", ");

      const askLine =
        ask === 0
          ? `이러한 직각삼각형은 모두 몇 개인지 구하시오.`
          : ask === 1
            ? `이러한 직각삼각형을 모두 찾아 그 넓이의 합을 구하시오.`
            : `이러한 직각삼각형을 모두 찾아 빗변의 길이의 합을 구하시오.`;
      const answer =
        ask === 0
          ? `$${tri.length}$`
          : ask === 1
            ? `$${areaSum}\\,\\mathrm{cm}^2$`
            : `$${hypSum}\\,\\mathrm{cm}$`;
      const closeLine =
        ask === 0
          ? `따라서 이러한 직각삼각형은 모두 $${tri.length}$개이다.`
          : ask === 1
            ? `각 삼각형의 넓이는 차례로 ${areaList}이다.\n` +
              `따라서 넓이의 합은 $${areas.join("+")}=${areaSum}\\,\\mathrm{cm}^2$이다.`
            : `따라서 빗변의 길이의 합은 $${tri.map((t) => t.c).join("+")}=${hypSum}\\,\\mathrm{cm}$이다.`;

      return {
        content:
          `세 변의 길이가 모두 자연수이고, 빗변이 아닌 한 변의 길이가 $${a}\\,\\mathrm{cm}$인 직각삼각형이 있다.\n` +
          askLine,
        answer,
        solution:
          `빗변이 아닌 나머지 한 변의 길이를 $b\\,\\mathrm{cm}$, 빗변의 길이를 $c\\,\\mathrm{cm}$라 하면 ` +
          `$b^2+${a}^2=c^2$이므로 $c^2-b^2=${a * a}$이다.\n` +
          `$c^2-b^2=(c+b)(c-b)$이므로 $(c+b)(c-b)=${a * a}$이다.\n` +
          `$c+b$와 $c-b$는 합이 $2c$로 짝수이므로 홀짝이 같고, 곱이 짝수이므로 둘 다 짝수이다.\n` +
          `$c-b=2m$, $c+b=2n$ ($m<n$인 자연수)으로 놓으면 $4mn=${a * a}$, 즉 $mn=${product}$이다.\n` +
          `$${product}$${eulReul(product)} 두 자연수의 곱으로 나타내면 ${factorPairs.join(", ")}이고, ` +
          `$m<n$이어야 하므로 $(m,\\,n)$은 ${chosen}의 $${tri.length}$가지이다.\n` +
          `각각에서 $c=m+n$, $b=n-m$이므로 $(b,\\,c)$는 차례로 ${bcList}이다.\n` +
          closeLine,
        facts: {
          a,
          count: tri.length,
          areaSum,
          hypSum,
          ask,
        },
        figureSpec: null,
      };
    }),
);

/**
 * 중2 확대 갈래 명부. `generate.ts` 의 `ALL` 에 **이 한 줄만** 더한다.
 */
export const M2_TOP: TypeEntry[] = [
  TYPE_RATIO_ROOT,
  TYPE_PRIME_SUM,
  TYPE_LINE_HALF,
  TYPE_DICE_TWO_COND,
  TYPE_LEG_TRIPLES,
];
