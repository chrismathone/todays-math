/**
 * 중2 RPM 2-1 「유리수와 순환소수」 20유형 전량 — 세션 2A-중2수확률 소유
 * (docs/planning/tracks/middle-engine-wave2-plan.md §1).
 *
 * 우리 단원 배정 (공유 DB Unit.section 실측 2026-08-23):
 *   유리수와 소수(196) ← 01·05·06·07·08·09·10·19
 *   순환소수(176) ← 02·03·04·11
 *   순환소수의 분수 표현(1) ← 12·13·14·15
 *   순환소수를 포함한 식의 계산(735) ← 16·17·18·20
 *
 * 순환소수 표기는 `\overline{숫자}` 로 쓴다 — 제품 전처리(textPreprocess)가
 * 순환마디 첫·끝 숫자 위 **점**(repeat-dot)으로 그린다. 「순환소수는 막대가
 * 아니라 점」(CLAUDE.md 2026-08-14) — 테스트가 실렌더로 repeat-dot 을 확인한다.
 *
 * 계약(1차 물결 브리프 그대로): 정답 역산 · facts 원 수치 · 숫자는 $...$ 안 ·
 * attempt 소진 시 던짐. 검산은 테스트 쪽이 **다른 식**(전개는 BigInt 자릿수
 * 추출, 유한 판정은 10^k 곱 검사)으로 다시 한다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";
const MINOR = "유리수와 순환소수";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  유리수와소수: "유리수와 소수",
  순환소수: "순환소수",
  분수표현: "순환소수의 분수 표현",
  식계산: "순환소수를 포함한 식의 계산",
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

// ── 수 뒤 조사 — m2Josa 와 같은 수 읽기 규칙 (주격·보조사만 여기서) ──

function vowelFinal(n: number): boolean {
  const d = Math.abs(n) % 10;
  return d === 2 || d === 4 || d === 5 || d === 9;
}

/** 주격 조사: $9$가 · $3$이 */
function iGa(n: number): "이" | "가" {
  return vowelFinal(n) ? "가" : "이";
}

/** 보조사: $9$는 · $3$은 */
function eunNeun(n: number): "은" | "는" {
  return vowelFinal(n) ? "는" : "은";
}

/** 도구격 조사: $2$로 · $3$으로 — 모음·ㄹ 받침(일·칠·팔) 뒤는 「로」. */
function euRo(n: number): "로" | "으로" {
  const d = Math.abs(n) % 10;
  return d === 0 || d === 3 || d === 6 ? "으로" : "로";
}

// ── 수론 소품 (생성기 쪽 방법 — 테스트는 10^k 곱 검사로 따로 잰다) ──

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

/** 2와 5를 전부 나눠 낸 나머지 — 1 이면 (기약일 때) 유한소수 분모다. */
function stripTwoFive(n: number): number {
  let m = n;
  while (m % 2 === 0) m /= 2;
  while (m % 5 === 0) m /= 5;
  return m;
}

/** n/d 가 유한소수인가 — 기약분수로 줄인 분모의 2·5 밖 소인수 유무. */
function isTerminating(n: number, d: number): boolean {
  return stripTwoFive(d / gcd(n, d)) === 1;
}

/** 소인수분해 KaTeX 몸통 — `2^{2}\times5\times7`. `$` 는 밖에서 감싼다. */
function factorTex(n: number): string {
  const parts: string[] = [];
  let m = n;
  for (const p of [2, 3, 5, 7, 11, 13]) {
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e += 1;
    }
    if (e === 1) parts.push(String(p));
    else if (e > 1) parts.push(`${p}^{${e}}`);
  }
  if (m !== 1) parts.push(String(m));
  return parts.join("\\times");
}

// ── 순환소수 표현 소품 ─────────────────────────────────

/** 정규 표현 한 벌 — int.pre(cyc 반복). pre·cyc 는 자릿수 보존 문자열. */
type Rep = { int: number; pre: string; cyc: string };

function isPrimitiveCycle(c: string): boolean {
  for (let len = 1; len < c.length; len += 1) {
    if (c.length % len === 0 && c === c.slice(0, len).repeat(c.length / len)) {
      return false;
    }
  }
  return true;
}

/** 표기가 유일한(최소 순환마디·최소 앞자리) 꼴인가. */
function isCanonicalRep(r: Rep): boolean {
  if (r.cyc.length === 0) return false;
  if (!isPrimitiveCycle(r.cyc)) return false;
  if (/^0+$/.test(r.cyc) || /^9+$/.test(r.cyc)) return false;
  if (r.pre.length > 0 && r.pre[r.pre.length - 1] === r.cyc[r.cyc.length - 1]) {
    return false;
  }
  return true;
}

function randDigits(rng: Rng, len: number): string {
  let s = "";
  for (let i = 0; i < len; i += 1) s += String(intBetween(rng, 0, 9));
  return s;
}

function randRep(
  rng: Rng,
  intMax: number,
  preLen: number,
  cycLen: number,
): Rep {
  return attempt(200, () => {
    const r: Rep = {
      int: intBetween(rng, 0, intMax),
      pre: randDigits(rng, preLen),
      cyc: randDigits(rng, cycLen),
    };
    return isCanonicalRep(r) ? r : null;
  });
}

/** 표현 → 기약분수. 닫힌 식 (전체자리수 − 앞자리수) / (9…90…0). */
function fracOfRep(r: Rep): { n: number; d: number } {
  const k = r.pre.length;
  const m = r.cyc.length;
  const den = Math.pow(10, k) * (Math.pow(10, m) - 1);
  const whole = Number(`${r.pre}${r.cyc}`) - Number(r.pre === "" ? "0" : r.pre);
  const num = r.int * den + whole;
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

/** 표현 → KaTeX (`1.2\overline{34}`). 전처리가 점 표기로 그린다. */
function texOfRep(r: Rep): string {
  return `${r.int}.${r.pre}\\overline{${r.cyc}}`;
}

/** 표현 → 펼친 소수 (`1.2343434\cdots`) — 순환마디 3회. */
function laidOutRep(r: Rep): string {
  return `${r.int}.${r.pre}${r.cyc.repeat(3)}\\cdots`;
}

/**
 * 분수 → 정규 표현 — 나머지 재등장 자리로 순환마디를 찾는 나눗셈 시늉.
 * 유한소수면 던진다 (이 모듈에서는 순환일 때만 부른다).
 */
function expandFrac(n: number, d: number): Rep {
  const int = Math.floor(n / d);
  let r = n % d;
  const seen = new Map<number, number>();
  let digits = "";
  while (r !== 0 && !seen.has(r)) {
    seen.set(r, digits.length);
    r *= 10;
    digits += String(Math.floor(r / d));
    r %= d;
  }
  if (r === 0) throw new Error(`유한소수입니다: ${n}/${d}`);
  const k = seen.get(r)!;
  return { int, pre: digits.slice(0, k), cyc: digits.slice(k) };
}

/** facts 에 표현을 평평하게 싣는다 — 앞자리 0 보존을 위해 길이도 같이. */
function repFacts(prefix: string, r: Rep): Record<string, number> {
  return {
    [`${prefix}Int`]: r.int,
    [`${prefix}PreLen`]: r.pre.length,
    [`${prefix}PreVal`]: r.pre === "" ? 0 : Number(r.pre),
    [`${prefix}CycLen`]: r.cyc.length,
    [`${prefix}CycVal`]: Number(r.cyc),
  };
}

/**
 * 보기 표식 — 제품 렌더러가 **줄바꿈으로 읽는 문자**만 쓴다.
 * `renderMathHtml` 은 개행 뒤에 ①~⑮ 또는 `1.` 이 올 때만 줄을 바꿄다
 * (`BODY_CHOICE_CLASS`). 「ㄱ. ㄴ.」로 쓰면 보기 다섯이 **한 줄로 죽 이어진다**
 * — 2026-08-23 실렌더로 확인했고, RPM 원본도 ①~⑤ 를 쓴다.
 */
const LETTERS = ["①", "②", "③", "④", "⑤"] as const;

function lettersOfMask(mask: number, count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    if (mask & (1 << i)) out.push(LETTERS[i]!);
  }
  return out.join(", ");
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

// ── 유형 18 지식 명제 풀 — 테스트가 **자기 진리표**로 대조한다 ──
export const RATIONAL_FACT_POOL: readonly {
  text: string;
  truth: boolean;
}[] = [
  { text: "모든 유한소수는 유리수이다.", truth: true },
  { text: "모든 순환소수는 유리수이다.", truth: true },
  { text: "모든 순환소수는 무한소수이다.", truth: true },
  { text: "모든 무한소수는 순환소수이다.", truth: false },
  { text: "모든 무한소수는 유리수가 아니다.", truth: false },
  { text: "순환소수 중에는 유리수가 아닌 것도 있다.", truth: false },
  {
    text: "유한소수로 나타낼 수 없는 기약분수는 순환소수로 나타낼 수 있다.",
    truth: true,
  },
  {
    text: "정수가 아닌 유리수는 유한소수 또는 순환소수로 나타낼 수 있다.",
    truth: true,
  },
  { text: "무한소수 중에는 순환소수가 아닌 것도 있다.", truth: true },
  {
    text: "기약분수의 분모가 $2$나 $5$ 이외의 소인수를 가지면 유한소수로 나타낼 수 없다.",
    truth: true,
  },
];

/** 유한소수가 되는 기약분수 (분모 2^a·5^b) 풀. */
const TERM_FRACS: readonly (readonly [number, number])[] = [
  [3, 4],
  [7, 8],
  [3, 16],
  [9, 20],
  [7, 25],
  [11, 40],
  [13, 50],
  [1, 5],
];

/** 순환소수가 되는 기약분수 (분모에 2·5 밖 소인수) 풀. */
const REPEAT_FRACS: readonly (readonly [number, number])[] = [
  [2, 3],
  [5, 6],
  [3, 7],
  [8, 9],
  [7, 11],
  [5, 12],
  [4, 15],
  [7, 18],
  [5, 21],
  [9, 22],
];

/** 곱해서 보여 줄 「기약 아님」 계수. */
const UNREDUCE: readonly number[] = [2, 3, 6, 7, 11];

/** 순환마디 길이 1~2 를 내는 분모 풀 (유형 15 — 앞자리도 2 이하). */
const SHORT_PERIOD_DENS: readonly number[] = [
  3, 6, 9, 11, 12, 15, 18, 22, 30, 33, 45, 66, 90, 99,
];

/** 유한 판정을 막는 소인수 덩어리 풀. */
const OBSTRUCTIONS: readonly number[] = [3, 7, 9, 11, 13, 21, 33];

/** 보기 5개(유한 2 + 순환 3)를 섞어 mask 와 함께 돌려준다. */
function mixedFracItems(rng: Rng): { n: number; d: number; term: boolean }[] {
  const terms = shuffle(rng, TERM_FRACS).slice(0, 2);
  const reps = shuffle(rng, REPEAT_FRACS).slice(0, 3);
  return shuffle(rng, [
    ...terms.map((f) => ({ n: f[0], d: f[1], term: true })),
    ...reps.map((f) => ({ n: f[0], d: f[1], term: false })),
  ]);
}

export const M2_RATIONAL: TypeEntry[] = [
  // 01 ─────────────────────────────────────────────
  def("01", "유한소수와 무한소수", SEC.유리수와소수, "기본", (rng) => {
    const items = mixedFracItems(rng);
    let mask = 0;
    items.forEach((it, i) => {
      if (it.term) mask |= 1 << i;
    });
    const lines = items
      .map((it, i) => `${LETTERS[i]} $\\dfrac{${it.n}}{${it.d}}$`)
      .join("\n");
    const facts: Record<string, number> = { mask };
    items.forEach((it, i) => {
      facts[`n${i + 1}`] = it.n;
      facts[`d${i + 1}`] = it.d;
    });
    const termList = items.map((it, i) => ({ it, i })).filter((x) => x.it.term);
    return {
      content: `다음 보기의 분수를 소수로 나타낼 때, 유한소수가 되는 것을 모두 고르시오.\n${lines}`,
      answer: lettersOfMask(mask, 5),
      solution: `기약분수의 분모에 $2$나 $5$ 이외의 소인수가 없으면 유한소수가 된다.\n${termList
        .map(
          (x) =>
            `${LETTERS[x.i]}의 분모는 $${x.it.d}=${factorTex(x.it.d)}$ 이므로 유한소수가 된다.`,
        )
        .join(
          "\n",
        )}\n따라서 유한소수가 되는 것은 ${lettersOfMask(mask, 5)}이다.`,
      facts,
    };
  }),

  // 02 ─────────────────────────────────────────────
  def("02", "순환소수의 표현", SEC.순환소수, "기본", (rng) => {
    const preLen = pick(rng, [0, 0, 1] as const);
    const cycLen = pick(rng, [2, 3] as const);
    const r = randRep(rng, 3, preLen, cycLen);
    return {
      content: `다음 순환소수를 순환마디를 이용하여 간단히 나타내시오.\n$${laidOutRep(r)}$`,
      answer: `$${texOfRep(r)}$`,
      solution: `소수점 아래에서 $${r.cyc}$ 부분이 한없이 되풀이되므로 순환마디는 $${r.cyc}$ 이다.\n따라서 순환마디의 양 끝 숫자 위에 점을 찍어 $${texOfRep(r)}$ 로 나타낸다.`,
      facts: repFacts("r", r),
    };
  }),

  // 03 ─────────────────────────────────────────────
  def("03", "분수를 순환소수로 나타내기", SEC.순환소수, "기본", (rng) =>
    attempt(200, () => {
      const preLen = pick(rng, [0, 0, 1] as const);
      const cycLen = pick(rng, [1, 2] as const);
      const r = randRep(rng, 0, preLen, cycLen);
      const { n, d } = fracOfRep(r);
      if (n === 0 || d > 999) return null;
      return {
        content: `분수 $\\dfrac{${n}}{${d}}$ ${eulReul(n)} 순환소수로 나타내시오.`,
        answer: `$${texOfRep(r)}$`,
        solution: `$${n}\\div${d}=${laidOutRep(r)}$ 이므로 순환마디는 $${r.cyc}$ 이다.\n따라서 $\\dfrac{${n}}{${d}}=${texOfRep(r)}$ 이다.`,
        facts: { n, d, ...repFacts("r", r) },
      };
    }),
  ),

  // 04 ─────────────────────────────────────────────
  def(
    "04",
    "소수점 아래 번째 자리의 숫자 구하기",
    SEC.순환소수,
    "응용",
    (rng) =>
      attempt(200, () => {
        const preLen = pick(rng, [0, 1] as const);
        const cycLen = pick(rng, [2, 3] as const);
        const r = randRep(rng, 0, preLen, cycLen);
        const { n, d } = fracOfRep(r);
        if (n === 0 || d > 999) return null;
        const N = intBetween(rng, 20, 80);
        const idx = (N - r.pre.length - 1) % r.cyc.length;
        const ans = Number(r.cyc[idx]);
        const diff = N - r.pre.length;
        return {
          content: `분수 $\\dfrac{${n}}{${d}}$ ${eulReul(n)} 소수로 나타낼 때, 소수점 아래 $${N}$번째 자리의 숫자를 구하시오.`,
          answer: `$${ans}$`,
          solution: `$\\dfrac{${n}}{${d}}=${texOfRep(r)}$ 이므로 ${r.pre.length > 0 ? `소수점 아래 $${r.pre.length}$번째 자리까지는 $${r.pre}$ 이고 그 뒤로는 순환마디 $${r.cyc}$ 의 $${r.cyc.length}$개 숫자가 되풀이된다` : `소수점 아래에서 순환마디 $${r.cyc}$ 의 $${r.cyc.length}$개 숫자가 되풀이된다`}.
${r.pre.length > 0 ? `$${N}-${r.pre.length}=${diff}$ ${eulReul(diff)}` : `$${N}$${eulReul(N)}`} $${r.cyc.length}$${euRo(r.cyc.length)} 나눈 나머지가 $${diff % r.cyc.length}$ 이므로 구하는 숫자는 $${ans}$ 이다.`,
          facts: { n, d, N, ans, ...repFacts("r", r) },
        };
      }),
  ),

  // 05 ─────────────────────────────────────────────
  def(
    "05",
    "의 거듭제곱을 이용하여 분수를 유한소수로 나타내기",
    SEC.유리수와소수,
    "기본",
    (rng) =>
      attempt(200, () => {
        const i = intBetween(rng, 0, 3);
        const j = intBetween(rng, 0, 3);
        if (i === j) return null;
        const b = Math.pow(2, i) * Math.pow(5, j);
        if (b < 4 || b > 200) return null;
        const mult = i < j ? Math.pow(2, j - i) : Math.pow(5, i - j);
        const a = attempt(50, () => {
          const v = intBetween(rng, 1, Math.min(b - 1, 30));
          return gcd(v, b) === 1 ? v : null;
        });
        const k = Math.max(i, j);
        return {
          content: `분수 $\\dfrac{${a}}{${b}}$ 의 분모를 $10$의 거듭제곱으로 나타내어 유한소수로 나타내려고 한다. 분모와 분자에 공통으로 곱할 수 있는 가장 작은 자연수를 구하시오.`,
          answer: `$${mult}$`,
          solution: `$${b}=${factorTex(b)}$ 이므로 분모와 분자에 $${mult}$ ${eulReul(mult)} 곱하면 분모가 $10^{${k}}$ 이 된다.\n따라서 곱할 수 있는 가장 작은 자연수는 $${mult}$ 이다.`,
          facts: { a, b, mult },
        };
      }),
  ),

  // 06 ─────────────────────────────────────────────
  def("06", "유한소수로 나타낼 수 있는 분수", SEC.유리수와소수, "응용", (rng) =>
    attempt(200, () => {
      const items = mixedFracItems(rng).map((it) => {
        const c = pick(rng, UNREDUCE);
        return { n: it.n * c, d: it.d * c, term: it.term };
      });
      if (items.some((it) => it.d > 260)) return null;
      let mask = 0;
      items.forEach((it, i) => {
        if (it.term) mask |= 1 << i;
      });
      const lines = items
        .map((it, i) => `${LETTERS[i]} $\\dfrac{${it.n}}{${it.d}}$`)
        .join("\n");
      const facts: Record<string, number> = { mask };
      items.forEach((it, i) => {
        facts[`n${i + 1}`] = it.n;
        facts[`d${i + 1}`] = it.d;
      });
      const termList = items
        .map((it, i) => ({ it, i }))
        .filter((x) => x.it.term);
      return {
        content: `다음 보기의 분수를 소수로 나타낼 때, 유한소수로 나타낼 수 있는 것을 모두 고르시오.\n${lines}`,
        answer: lettersOfMask(mask, 5),
        solution: `기약분수로 나타낸 뒤 분모의 소인수를 살핀다.\n${termList
          .map((x) => {
            const g = gcd(x.it.n, x.it.d);
            return `${LETTERS[x.i]}: $\\dfrac{${x.it.n}}{${x.it.d}}=\\dfrac{${x.it.n / g}}{${x.it.d / g}}$ 이고 분모 $${x.it.d / g}=${factorTex(x.it.d / g)}$ 이므로 유한소수가 된다.`;
          })
          .join(
            "\n",
          )}\n따라서 유한소수로 나타낼 수 있는 것은 ${lettersOfMask(mask, 5)}이다.`,
        facts,
      };
    }),
  ),

  // 07 ─────────────────────────────────────────────
  def("07", "가 유한소수가 되도록 하는 의", SEC.유리수와소수, "응용", (rng) =>
    attempt(200, () => {
      const m = pick(rng, OBSTRUCTIONS);
      const a = intBetween(rng, 1, 3);
      const bpow = intBetween(rng, 0, 2);
      const d = Math.pow(2, a) * Math.pow(5, bpow) * m;
      if (d > 500) return null;
      const n = attempt(50, () => {
        const v = intBetween(rng, 1, 40);
        return gcd(v, m) === 1 ? v : null;
      });
      return {
        content: `분수 $\\dfrac{${n}}{${d}}$ 에 자연수 $x$ 를 곱한 수를 소수로 나타내면 유한소수가 된다고 한다. $x$ 의 값이 될 수 있는 가장 작은 자연수를 구하시오.`,
        answer: `$${m}$`,
        solution: `$${d}=${factorTex(d)}$ 이고 $${n}$ ${waGwa(n)} $${m}$ ${eunNeun(m)} 서로소이므로 분모의 소인수 $${m}$ ${iGa(m)} 약분되지 않는다.\n유한소수가 되려면 $x$ 가 $${m}$ 의 배수이어야 하므로, 가장 작은 자연수는 $${m}$ 이다.`,
        facts: { n, d, m },
      };
    }),
  ),

  // 08 ─────────────────────────────────────────────
  def(
    "08",
    "두 분수가 모두 유한소수가 되도록 하는 값 구하기",
    SEC.유리수와소수,
    "응용",
    (rng) =>
      attempt(300, () => {
        const m1 = pick(rng, OBSTRUCTIONS);
        const m2 = pick(rng, OBSTRUCTIONS);
        if (m1 === m2) return null;
        const L = (m1 * m2) / gcd(m1, m2);
        if (L > 250 || L === m1 || L === m2) return null;
        const mk = (m: number) => {
          const d = Math.pow(2, intBetween(rng, 0, 2)) * pick(rng, [1, 5]) * m;
          const n = attempt(50, () => {
            const v = intBetween(rng, 1, 30);
            return gcd(v, m) === 1 ? v : null;
          });
          return { n, d };
        };
        const f1 = mk(m1);
        const f2 = mk(m2);
        if (f1.d > 400 || f2.d > 400 || f1.d === f2.d) return null;
        return {
          content: `두 분수 $\\dfrac{${f1.n}}{${f1.d}}$ ${waGwa(f1.n)} $\\dfrac{${f2.n}}{${f2.d}}$ 에 각각 자연수 $A$ 를 곱하면 두 분수를 모두 유한소수로 나타낼 수 있다고 한다. $A$ 의 값이 될 수 있는 가장 작은 자연수를 구하시오.`,
          answer: `$${L}$`,
          solution: `$${f1.d}=${factorTex(f1.d)}$, $${f2.d}=${factorTex(f2.d)}$ 이므로 $A$ 는 $${m1}$ 의 배수이면서 $${m2}$ 의 배수이어야 한다.\n따라서 $A$ 의 값이 될 수 있는 가장 작은 자연수는 $${m1}$ ${waGwa(m1)} $${m2}$ 의 최소공배수인 $${L}$ 이다.`,
          facts: { n1: f1.n, d1: f1.d, n2: f2.n, d2: f2.d, L },
        };
      }),
  ),

  // 09 ─────────────────────────────────────────────
  def("09", "가 유한소수가 되도록 하는 의", SEC.유리수와소수, "응용", (rng) =>
    attempt(200, () => {
      const m = pick(rng, [3, 7, 11, 13] as const);
      const i = intBetween(rng, 1, 3);
      const j = intBetween(rng, 0, 1);
      const d = Math.pow(2, i) * Math.pow(5, j) * m;
      if (d > 600) return null;
      const cnt = Math.floor(99 / m) - Math.floor(9 / m);
      const first = m * (Math.floor(9 / m) + 1);
      const last = m * Math.floor(99 / m);
      return {
        content: `분수 $\\dfrac{a}{${factorTex(d)}}$ 를 소수로 나타내면 유한소수가 될 때, $a$ 의 값이 될 수 있는 두 자리 자연수의 개수를 구하시오.`,
        answer: `$${cnt}$`,
        solution: `유한소수가 되려면 분모의 소인수 $${m}$ ${iGa(m)} 약분되어야 하므로 $a$ 는 $${m}$ 의 배수이다.\n두 자리 자연수 중 $${m}$ 의 배수는 $${first}$부터 $${last}$까지 $${cnt}$개이다.`,
        facts: { d, m, cnt },
      };
    }),
  ),

  // 10 ─────────────────────────────────────────────
  def(
    "10",
    "유한소수가 되도록 하는 미지수의 값과 기약분수",
    SEC.유리수와소수,
    "심화",
    (rng) =>
      attempt(200, () => {
        const k = pick(rng, [8, 10, 16, 20, 25, 40, 50] as const);
        const m = pick(rng, [3, 7, 9, 11, 13] as const);
        const d = k * m;
        if (d > 700) return null;
        return {
          content: `분수 $\\dfrac{x}{${d}}$ 를 소수로 나타내면 유한소수가 되고, 기약분수로 나타내면 $\\dfrac{1}{${k}}$ 이 된다. 자연수 $x$ 의 값을 구하시오.`,
          answer: `$${m}$`,
          solution: `$\\dfrac{x}{${d}}=\\dfrac{1}{${k}}$ 에서 $x\\times${k}=${d}$ 이므로 $x=${m}$ 이다.\n실제로 $\\dfrac{${m}}{${d}}=\\dfrac{1}{${k}}$ 이고 $${k}=${factorTex(k)}$ 이므로 유한소수가 된다.`,
          facts: { d, k, m },
        };
      }),
  ),

  // 11 ─────────────────────────────────────────────
  def(
    "11",
    "순환소수가 되도록 하는 미지수의 값 구하기",
    SEC.순환소수,
    "응용",
    (rng) =>
      attempt(300, () => {
        const n = pick(rng, [3, 7, 9, 11, 21, 27, 33, 49, 63] as const);
        const a = intBetween(rng, 2, 4);
        const base = Math.pow(2, a);
        let ans = 0;
        for (let x = 1; x <= 200; x += 1) {
          if (!isTerminating(n, base * x)) {
            ans = x;
            break;
          }
        }
        if (ans < 3) return null;
        return {
          content: `분수 $\\dfrac{${n}}{2^{${a}}\\times x}$ ${eulReul(n)} 소수로 나타내면 순환소수가 될 때, $x$ 의 값이 될 수 있는 가장 작은 자연수를 구하시오.`,
          answer: `$${ans}$`,
          solution: `순환소수가 되려면 기약분수로 나타냈을 때 분모에 $2$나 $5$ 이외의 소인수가 남아야 한다.\n$x=1$부터 차례로 대입하면 $x<${ans}$ 일 때는 분자 $${n}$ ${waGwa(n)} 약분되거나 소인수가 $2$, $5$ 뿐이어서 모두 유한소수가 되고, $x=${ans}$ 일 때 처음으로 순환소수가 된다.`,
          facts: { n, a, ans },
        };
      }),
  ),

  // 12 ─────────────────────────────────────────────
  def(
    "12",
    "순환소수를 분수로 나타내기 의 거듭제곱 이용",
    SEC.분수표현,
    "기본",
    (rng) => {
      const r = attempt(200, () => {
        const cand: Rep = {
          int: intBetween(rng, 1, 3),
          pre: randDigits(rng, 1),
          cyc: randDigits(rng, 2),
        };
        return isCanonicalRep(cand) ? cand : null;
      });
      const big = Math.pow(10, r.pre.length + r.cyc.length);
      const small = Math.pow(10, r.pre.length);
      const whole = Number(`${r.int}${r.pre}${r.cyc}`);
      const part = Number(`${r.int}${r.pre}`);
      const ans = whole - part;
      return {
        content: `순환소수 $x=${texOfRep(r)}$ 에 대하여 $${big}x-${small}x$ 의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution: `$${big}x=${whole}.${r.cyc}${r.cyc}\\cdots$ 이고 $${small}x=${part}.${r.cyc}${r.cyc}\\cdots$ 이다.\n두 수는 소수 부분이 같으므로 $${big}x-${small}x=${whole}-${part}=${ans}$ 이다.`,
        facts: { big, small, ans, ...repFacts("r", r) },
      };
    },
  ),

  // 13 ─────────────────────────────────────────────
  def(
    "13",
    "순환소수를 분수로 나타내기; 공식 이용",
    SEC.분수표현,
    "응용",
    (rng) =>
      attempt(200, () => {
        const preLen = pick(rng, [0, 1] as const);
        const cycLen = pick(rng, [1, 2] as const);
        const r = randRep(rng, pick(rng, [0, 0, 1] as const), preLen, cycLen);
        const { n, d } = fracOfRep(r);
        if (n === 0 || d > 999 || d === 1) return null;
        return {
          content: `다음 순환소수를 기약분수로 나타내면 $\\dfrac{b}{a}$ 가 된다. 자연수 $a$, $b$ 에 대하여 $a+b$ 의 값을 구하시오.\n$${texOfRep(r)}$`,
          answer: `$${n + d}$`,
          solution: `$${texOfRep(r)}=\\dfrac{${n}}{${d}}$ 이므로 $a=${d}$, $b=${n}$ 이다.\n따라서 $a+b=${n + d}$ 이다.`,
          facts: { num: n, den: d, sum: n + d, ...repFacts("r", r) },
        };
      }),
  ),

  // 14 ─────────────────────────────────────────────
  def(
    "14",
    "순환소수에 적당한 수를 곱하여 유한소수 만들기",
    SEC.분수표현,
    "응용",
    (rng) =>
      attempt(300, () => {
        const preLen = pick(rng, [0, 1] as const);
        const cycLen = pick(rng, [1, 2] as const);
        const r = randRep(rng, 0, preLen, cycLen);
        const { n, d } = fracOfRep(r);
        if (n === 0 || d > 999) return null;
        const m = stripTwoFive(d);
        if (m < 3 || m > 99) return null;
        return {
          content: `순환소수 $${texOfRep(r)}$ 에 자연수 $a$ 를 곱한 수가 유한소수가 될 때, $a$ 의 값이 될 수 있는 가장 작은 자연수를 구하시오.`,
          answer: `$${m}$`,
          solution: `$${texOfRep(r)}=\\dfrac{${n}}{${d}}$ 이고 $${d}=${factorTex(d)}$ 이다.\n유한소수가 되려면 분모의 소인수 중 $2$와 $5$ 이외의 부분인 $${m}$ ${iGa(m)} 약분되어야 하므로, 가장 작은 자연수 $a$ 는 $${m}$ 이다.`,
          facts: { num: n, den: d, m, ...repFacts("r", r) },
        };
      }),
  ),

  // 15 ─────────────────────────────────────────────
  def(
    "15",
    "기약분수의 분모 분자를 잘못 보고 소수로 나타낸 경우",
    SEC.분수표현,
    "심화",
    (rng) =>
      attempt(500, () => {
        const a = pick(rng, SHORT_PERIOD_DENS);
        const b = attempt(50, () => {
          const v = intBetween(rng, 1, a - 1);
          return gcd(v, a) === 1 ? v : null;
        });
        const a1 = pick(rng, SHORT_PERIOD_DENS);
        if (a1 === a || gcd(b, a1) !== 1 || b >= a1) return null;
        const b2 = attempt(50, () => {
          const v = intBetween(rng, 1, a - 1);
          return gcd(v, a) === 1 && v !== b ? v : null;
        });
        let r0: Rep;
        let rx: Rep;
        let ry: Rep;
        try {
          r0 = expandFrac(b, a);
          rx = expandFrac(b, a1);
          ry = expandFrac(b2, a);
        } catch {
          return null;
        }
        if (rx.pre.length > 2 || ry.pre.length > 2 || r0.pre.length > 2) {
          return null;
        }
        return {
          content: `어떤 기약분수를 순환소수로 나타내는데 승우는 분모를 잘못 보아 $${texOfRep(rx)}$ 로 나타내었고, 나연이는 분자를 잘못 보아 $${texOfRep(ry)}$ 로 나타내었다. 처음 기약분수를 순환소수로 나타내시오.`,
          answer: `$${texOfRep(r0)}$`,
          solution: `승우는 분자를 옳게 보았으므로 $${texOfRep(rx)}=\\dfrac{${b}}{${a1}}$ 에서 처음 분수의 분자는 $${b}$ 이다.\n나연이는 분모를 옳게 보았으므로 $${texOfRep(ry)}=\\dfrac{${b2}}{${a}}$ 에서 처음 분수의 분모는 $${a}$ 이다.\n따라서 처음 기약분수는 $\\dfrac{${b}}{${a}}=${texOfRep(r0)}$ 이다.`,
          facts: {
            b,
            a,
            a1,
            b2,
            ...repFacts("r0", r0),
            ...repFacts("rx", rx),
            ...repFacts("ry", ry),
          },
        };
      }),
  ),

  // 16 ─────────────────────────────────────────────
  def("16", "순환소수가 포함된 식의 계산 ⑴", SEC.식계산, "응용", (rng) =>
    attempt(200, () => {
      const x: Rep = {
        int: intBetween(rng, 1, 7),
        pre: "",
        cyc: String(intBetween(rng, 1, 8)),
      };
      const y: Rep = {
        int: intBetween(rng, 1, 7),
        pre: "",
        cyc: String(intBetween(rng, 1, 8)),
      };
      if (!isCanonicalRep(x) || !isCanonicalRep(y)) return null;
      const op = pick(rng, [0, 1] as const); // 0: +, 1: −
      const fx = fracOfRep(x);
      const fy = fracOfRep(y);
      const num0 =
        op === 0 ? fx.n * fy.d + fy.n * fx.d : fx.n * fy.d - fy.n * fx.d;
      const den0 = fx.d * fy.d;
      if (num0 <= 0) return null;
      const g = gcd(num0, den0);
      const num = num0 / g;
      const den = den0 / g;
      if (den === 1) return null;
      const opTex = op === 0 ? "+" : "-";
      return {
        content: `다음을 계산한 값을 기약분수 $\\dfrac{b}{a}$ 로 나타낼 때, 자연수 $a$, $b$ 에 대하여 $a+b$ 의 값을 구하시오.\n$${texOfRep(x)}${opTex}${texOfRep(y)}$`,
        answer: `$${num + den}$`,
        solution: `$${texOfRep(x)}=\\dfrac{${fx.n}}{${fx.d}}$, $${texOfRep(y)}=\\dfrac{${fy.n}}{${fy.d}}$ 이다.\n$\\dfrac{${fx.n}}{${fx.d}}${opTex}\\dfrac{${fy.n}}{${fy.d}}=\\dfrac{${num}}{${den}}$ 이므로 $a=${den}$, $b=${num}$ 이다.\n따라서 $a+b=${num + den}$ 이다.`,
        facts: {
          op,
          num,
          den,
          ...repFacts("x", x),
          ...repFacts("y", y),
        },
      };
    }),
  ),

  // 17 ─────────────────────────────────────────────
  def("17", "순환소수의 대소 관계", SEC.식계산, "심화", (rng) =>
    attempt(300, () => {
      // 명제 네 개 — 각각 (좌, 우) 값과 표기된 부등호. 값 비교는 분수 교차곱.
      type Stmt = {
        texL: string;
        texR: string;
        fl: { n: number; d: number };
        fr: { n: number; d: number };
        shown: number; // 0: '<', 1: '>'
        facts: Record<string, number>;
      };
      const mk = (kind: number, si: number): Stmt | null => {
        const shown = pick(rng, [0, 1] as const);
        if (kind === 0) {
          // 순환소수 vs 그 유한 절단 (0.\overline{35} vs 0.35)
          const r = randRep(rng, 0, 0, pick(rng, [1, 2] as const));
          const cut = { n: Number(r.cyc), d: Math.pow(10, r.cyc.length) };
          return {
            texL: `0.${r.cyc}`,
            texR: texOfRep(r),
            fl: cut,
            fr: fracOfRep(r),
            shown,
            facts: {
              [`s${si}Kind`]: 0,
              [`s${si}Cyc`]: Number(r.cyc),
              [`s${si}CycLen`]: r.cyc.length,
              [`s${si}Shown`]: shown,
            },
          };
        }
        if (kind === 1) {
          // 점 위치만 옮긴 짝 (0.a\overline{b} vs 0.\overline{ab})
          const A = intBetween(rng, 1, 9);
          const B = attempt(30, () => {
            const v = intBetween(rng, 0, 9);
            return v !== A ? v : null;
          });
          const rl: Rep = { int: 0, pre: String(A), cyc: String(B) };
          const rr: Rep = { int: 0, pre: "", cyc: `${A}${B}` };
          if (!isCanonicalRep(rl) || !isCanonicalRep(rr)) return null;
          return {
            texL: texOfRep(rl),
            texR: texOfRep(rr),
            fl: fracOfRep(rl),
            fr: fracOfRep(rr),
            shown,
            facts: {
              [`s${si}Kind`]: 1,
              [`s${si}A`]: A,
              [`s${si}B`]: B,
              [`s${si}Shown`]: shown,
            },
          };
        }
        // kind 2: 순환소수 vs 분수
        const r = randRep(rng, 0, pick(rng, [0, 1] as const), 1);
        const a = fracOfRep(r);
        const fr = attempt(30, () => {
          const den = pick(rng, [3, 6, 9, 11, 12, 15] as const);
          const num = intBetween(rng, 1, den - 1);
          if (num * a.d === a.n * den) return null; // 같으면 대소가 없다
          return { n: num, d: den };
        });
        return {
          texL: texOfRep(r),
          texR: `\\dfrac{${fr.n}}{${fr.d}}`,
          fl: a,
          fr,
          shown,
          facts: {
            [`s${si}Kind`]: 2,
            [`s${si}Int`]: r.int,
            [`s${si}PreLen`]: r.pre.length,
            [`s${si}PreVal`]: r.pre === "" ? 0 : Number(r.pre),
            [`s${si}CycVal`]: Number(r.cyc),
            [`s${si}FracN`]: fr.n,
            [`s${si}FracD`]: fr.d,
            [`s${si}Shown`]: shown,
          },
        };
      };
      const kinds = shuffle(rng, [0, 1, 2, pick(rng, [0, 1, 2] as const)]);
      const stmts: Stmt[] = [];
      for (let i = 0; i < 4; i += 1) {
        const s = mk(kinds[i]!, i + 1);
        if (s === null) return null;
        stmts.push(s);
      }
      let mask = 0;
      stmts.forEach((s, i) => {
        const lt = s.fl.n * s.fr.d < s.fr.n * s.fl.d;
        const truth = s.shown === 0 ? lt : !lt;
        if (truth) mask |= 1 << i;
      });
      const cnt = stmts.reduce((acc, _s, i) => acc + ((mask >> i) & 1), 0);
      if (cnt === 0 || cnt === 4) return null;
      const lines = stmts
        .map(
          (s, i) =>
            `${LETTERS[i]} $${s.texL}${s.shown === 0 ? "<" : ">"}${s.texR}$`,
        )
        .join("\n");
      const facts: Record<string, number> = { mask };
      stmts.forEach((s) => Object.assign(facts, s.facts));
      return {
        content: `다음 중 두 수의 대소 관계가 옳은 것을 모두 고르시오.\n${lines}`,
        answer: lettersOfMask(mask, 4),
        solution: `순환소수를 소수점 아래로 몇 자리 펼쳐 처음으로 달라지는 자리를 견주거나, 분수로 나타내어 비교한다.\n각 보기를 이렇게 확인하면 옳은 것은 ${lettersOfMask(mask, 4)}이다.`,
        facts,
      };
    }),
  ),

  // 18 ─────────────────────────────────────────────
  def("18", "유리수와 소수의 관계", SEC.식계산, "기본", (rng) =>
    attempt(200, () => {
      const idxs = shuffle(
        rng,
        RATIONAL_FACT_POOL.map((_s, i) => i),
      ).slice(0, 4);
      let mask = 0;
      idxs.forEach((idx, i) => {
        if (RATIONAL_FACT_POOL[idx]!.truth) mask |= 1 << i;
      });
      const cnt = idxs.reduce((acc, _v, i) => acc + ((mask >> i) & 1), 0);
      if (cnt === 0 || cnt === 4) return null;
      const lines = idxs
        .map((idx, i) => `${LETTERS[i]} ${RATIONAL_FACT_POOL[idx]!.text}`)
        .join("\n");
      const facts: Record<string, number> = { mask };
      idxs.forEach((idx, i) => {
        facts[`i${i + 1}`] = idx;
      });
      return {
        content: `다음 보기에서 옳은 것을 모두 고르시오.\n${lines}`,
        answer: lettersOfMask(mask, 4),
        solution: `유한소수와 순환소수는 모두 분수로 나타낼 수 있으므로 유리수이고, 순환소수가 아닌 무한소수는 유리수가 아니다.\n이를 근거로 보기를 살피면 옳은 것은 ${lettersOfMask(mask, 4)}이다.`,
        facts,
      };
    }),
  ),

  // 19 ─────────────────────────────────────────────
  def(
    "19",
    "두 분수 사이에 있는 유한소수의 개수",
    SEC.유리수와소수,
    "심화",
    (rng) =>
      attempt(400, () => {
        const A = pick(rng, [3, 4, 5, 6] as const);
        const B = pick(rng, [3, 4, 5, 6] as const);
        const a = intBetween(rng, 1, A - 1);
        const b = intBetween(rng, 1, B - 1);
        if (a * B >= b * A) return null; // a/A < b/B
        if (gcd(a, A) !== 1 || gcd(b, B) !== 1) return null; // 기약만 보여 준다
        const D = pick(rng, [12, 15, 24, 30] as const);
        const m = stripTwoFive(D);
        let cnt = 0;
        for (let x = 1; x <= D; x += 1) {
          if (a * D < x * A && x * B < b * D && isTerminating(x, D)) cnt += 1;
        }
        if (cnt < 1 || cnt > 6) return null;
        return {
          content: `두 분수 $\\dfrac{${a}}{${A}}$ ${waGwa(a)} $\\dfrac{${b}}{${B}}$ 사이에 있는 분수 중에서 분모가 $${D}$ 인 분수를 $\\dfrac{x}{${D}}$ 라 할 때, 유한소수로 나타낼 수 있는 자연수 $x$ 의 개수를 구하시오.`,
          answer: `$${cnt}$`,
          solution: `$\\dfrac{${a}}{${A}}<\\dfrac{x}{${D}}<\\dfrac{${b}}{${B}}$ 의 각 변에 $${D}$ ${eulReul(D)} 곱하면 $${(a * D) % A === 0 ? String((a * D) / A) : `\\dfrac{${a * D}}{${A}}`}<x<${(b * D) % B === 0 ? String((b * D) / B) : `\\dfrac{${b * D}}{${B}}`}$ 이다.\n$${D}=${factorTex(D)}$ 이므로 $\\dfrac{x}{${D}}$ 가 유한소수가 되려면 $x$ 는 $${m}$ 의 배수이어야 한다.\n이 범위의 $${m}$ 의 배수를 세면 $${cnt}$개이다.`,
          facts: { a, A, b, B, D, cnt },
        };
      }),
  ),

  // 20 ─────────────────────────────────────────────
  def("20", "순환소수가 포함된 식의 계산 ⑵", SEC.식계산, "심화", (rng) =>
    attempt(200, () => {
      const A = intBetween(rng, 1, 9);
      const B = intBetween(rng, 1, 9);
      if (A === B || A + B === 9) return null;
      const x: Rep = { int: 0, pre: "", cyc: `${A}${B}` };
      const y: Rep = { int: 0, pre: "", cyc: `${B}${A}` };
      if (!isCanonicalRep(x) || !isCanonicalRep(y)) return null;
      const num0 = 11 * (A + B);
      const den0 = 99;
      const g = gcd(num0, den0);
      const num = num0 / g;
      const den = den0 / g;
      if (den === 1) return null;
      return {
        content: `두 순환소수 $x=${texOfRep(x)}$, $y=${texOfRep(y)}$ 에 대하여 $x+y$ 를 기약분수 $\\dfrac{q}{p}$ 로 나타낼 때, 자연수 $p$, $q$ 에 대하여 $p+q$ 의 값을 구하시오.`,
        answer: `$${num + den}$`,
        solution: `$x=\\dfrac{${A}${B}}{99}$, $y=\\dfrac{${B}${A}}{99}$ 이므로 $x+y=\\dfrac{${Number(`${A}${B}`) + Number(`${B}${A}`)}}{99}=\\dfrac{${num}}{${den}}$ 이다.\n따라서 $p=${den}$, $q=${num}$ 이고 $p+q=${num + den}$ 이다.`,
        facts: { A, B, num, den },
      };
    }),
  ),
];
