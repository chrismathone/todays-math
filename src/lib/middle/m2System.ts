/**
 * 중2 「일차부등식」 기본 9유형(01~09) · 「연립일차방정식」 13유형(01~11·19·20)
 * · 「연립일차방정식의 활용」 기본 8유형(01~08) — 물결 5C.
 *
 * 이 세 중단원은 **이미 일부가 등록돼 있다**(m2IneqApply 10~14 · m2SystemApply
 * 12~18·09~18). 여기는 그 앞자리, 곧 **기본기 유형**만 낸다. 남은 번호는
 * `npx tsx scripts/middle/type-census.ts` 로 확인했다(2026-08-24 실측).
 *
 * 생성 규칙 — 물결 계약대로 **답을 먼저 정하고 발문을 만든다.**
 *  - 연립방정식: 해 $(x,y)$ 를 먼저 고르고 그 해를 갖는 두 식을 만든다.
 *    두 식이 유일해를 갖도록 **계수 행렬식이 0 이 아닌지** 반드시 가드로 잠근다.
 *  - 부등식: 해 `x REL s` 를 먼저 고르고 그 해가 나오도록 계수를 짠다.
 *    $x$의 계수가 음수면 **인쇄되는 부등호를 뒤집어** 적는다.
 *  - 활용: 답(개수·나이·금액)을 먼저 고르고 발문 수치를 역산한다. 음수·소수가
 *    되는 조합은 `attempt` 로 걸러 낸다(조용히 기본값을 돌려주지 않는다).
 *
 * 검산은 시험 쪽에 따로 있다 — 시험은 **지면에 인쇄된 식을 직접 파싱해서**
 * 다시 푼다(생성기의 소거법을 옮겨 적지 않는다). 그래서 「값은 맞는데 지면이
 * 틀린」 경우도 빨개진다.
 *
 * 숫자는 전부 `$...$` 안에 쓴다 (elementary rules.bareNumbers 가드).
 * 대분수를 만들지 않는다 (D-73 — 제품이 가분수를 대분수로 바꾸지 않는다).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { CHOOSE_ALL_ANSWER_COUNT } from "../problem/chooseAllRule";

import { eulReul } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";
const MINOR_INEQ = "일차부등식";
const MINOR_SYS = "연립일차방정식";
const MINOR_APPLY = "연립일차방정식의 활용";

/** 우리 Unit.section 정확한 이름 (prisma/seed-data/units.ts 실측 2026-08-24) */
const SEC = {
  부등식: "부등식",
  부등식풀이: "일차부등식의 풀이",
  미지수2: "미지수가 2개인 연립일차방정식",
  연립풀이: "연립방정식의 풀이",
  여러가지: "여러 가지 연립방정식의 풀이",
  수나이: "연립방정식의 활용(수, 평균, 나이)",
  가격도형: "연립방정식의 활용(가격, 개수, 증감, 도형)",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

/** 0 이 아닌 정수를 [-max, -min]∪[min, max] 에서 뽑는다. */
function nonzero(rng: Rng, min: number, max: number): number {
  return pick(rng, [1, -1] as const) * intBetween(rng, min, max);
}

/** 이어 붙는 항 — 부호를 앞세운다: sg(3)="+3", sg(-3)="-3". */
function sg(n: number): string {
  return n >= 0 ? `+${n}` : `-${-n}`;
}

/** 이어 붙는 문자항 — sc(1,"y")="+y", sc(-3,"y")="-3y". */
function sc(n: number, v: string): string {
  const s = n >= 0 ? "+" : "-";
  const a = Math.abs(n);
  return a === 1 ? `${s}${v}` : `${s}${a}${v}`;
}

/** 맨 앞 문자항 — mc(1,"x")="x", mc(-1,"x")="-x", mc(3,"x")="3x". */
function mc(n: number, v: string): string {
  if (n === 1) return v;
  if (n === -1) return `-${v}`;
  return `${n}${v}`;
}

/** 한쪽 변 `ax+b` — 계수가 0 이면 상수만, 상수가 0 이면 문자항만. */
function side(coef: number, cnst: number, v = "x"): string {
  if (coef === 0) return `${cnst}`;
  return `${mc(coef, v)}${cnst === 0 ? "" : sg(cnst)}`;
}

/** 괄호 항 — `5(x+9)`, `-3(x-5)`, `(x-2)`. */
function paren(k: number, c: number, v = "x"): string {
  const inner = `${v}${c === 0 ? "" : sg(c)}`;
  if (k === 1) return `(${inner})`;
  if (k === -1) return `-(${inner})`;
  return `${k}(${inner})`;
}

// ── 부등호 ─────────────────────────────────────────────
/** 0:`<` 1:`>` 2:`\le` 3:`\ge` */
// ⚠️ `\le`·`\ge` 뒤에 **꼬리 공백**이 있다. 없으면 `\le x` 가 `\lex` 로 붙어
//    KaTeX 가 모르는 명령이 된다 — 붉은 글자로 지면에 나간다.
const REL_TEX = ["<", ">", "\\le ", "\\ge "] as const;
const REL_CODES = [0, 1, 2, 3] as const;

function relTex(r: number): string {
  return REL_TEX[r]!;
}

/** 양변에 음수를 곱했을 때의 방향. */
function flipRel(r: number): number {
  return r === 0 ? 1 : r === 1 ? 0 : r === 2 ? 3 : 2;
}

/**
 * 「$-3$**으로** 나누면」 — 수 뒤 도구격 조사. 끝 자리를 한자 수사로 읽어
 * 받침이 없거나 ㄹ 받침(일·칠·팔)이면 「로」, 나머지(삼·육·십/백/천)면 「으로」.
 * m2Josa 는 여러 세션이 함께 쓰는 파일이라 여기 안에 둔다.
 */
function euro(n: number): "로" | "으로" {
  const d = Math.abs(n) % 10;
  return d === 0 || d === 3 || d === 6 ? "으로" : "로";
}

function relHolds(r: number, lhs: number, rhs: number): boolean {
  if (r === 0) return lhs < rhs;
  if (r === 1) return lhs > rhs;
  if (r === 2) return lhs <= rhs;
  return lhs >= rhs;
}

// ── 소수 인쇄 ──────────────────────────────────────────
/** `n / 10^k` 를 정확한 소수 문자열로 (부동소수점을 거치지 않는다). */
function decStr(n: number, k: number): string {
  const neg = n < 0;
  const a = Math.abs(n);
  const p = 10 ** k;
  const ip = Math.floor(a / p);
  const fp = String(a % p)
    .padStart(k, "0")
    .replace(/0+$/, "");
  const s = fp ? `${ip}.${fp}` : `${ip}`;
  return neg ? `-${s}` : s;
}

/** 소수 계수의 맨 앞 문자항 — 계수가 ±1 이면 숫자를 안 적는다. */
function decMono(n: number, k: number, v = "x"): string {
  const p = 10 ** k;
  if (n === p) return v;
  if (n === -p) return `-${v}`;
  return `${decStr(n, k)}${v}`;
}

/** 소수 상수의 이어 붙는 항. */
function decAdd(n: number, k: number): string {
  if (n === 0) return "";
  return n > 0 ? `+${decStr(n, k)}` : `-${decStr(-n, k)}`;
}

/** 소수 계수 한쪽 변. */
function decSide(coef: number, cnst: number, k: number): string {
  if (coef === 0) return decStr(cnst, k);
  return `${decMono(coef, k, "x")}${decAdd(cnst, k)}`;
}

/** `\dfrac{ax+b}{d}` — 분자 계수가 ±1 이면 숫자를 안 적는다. */
function fracLin(coef: number, cnst: number, den: number): string {
  return `\\dfrac{${side(coef, cnst)}}{${den}}`;
}

// ── 보기 ①~⑤ ─────────────────────────────────────────
/**
 * 보기 표식 — 제품 렌더러가 **줄바꿈으로 읽는 문자**만 쓴다
 * (m2Rational 이 실렌더로 확인한 자리, CLAUDE.md 2026-08-23).
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

type PoolItem = { tex: string; ok: boolean };

/**
 * 참 `CHOOSE_ALL_ANSWER_COUNT`개 + 거짓 나머지를 뽑아 섞는다.
 *
 * 🔴 참의 개수는 **범위가 아니라 상수**다 (원장님 2026-08-25: 「모두 고르시오」의
 *    정답은 정확히 2개). 예전에는 `[lo,hi]` 를 씨앗이 골랐고, 그래서 같은 유형이
 *    씨앗마다 정답 1~4개를 냈다(실측 2026-08-25: 01 은 2~4개, 04 는 1~3개).
 *    **거르는 것이 아니라 만들 때 정한다** — 거르면 씨앗마다 성공률이 달라진다.
 */
function fiveItems(
  rng: Rng,
  yes: readonly string[],
  no: readonly string[],
): { items: PoolItem[]; mask: number } {
  const t = CHOOSE_ALL_ANSWER_COUNT;
  if (yes.length < t || no.length < 5 - t) {
    // 풀이 모자라면 조용히 적은 보기를 내지 않는다 — 「보기 5칸」은 지면 규약이다.
    throw new Error(
      `보기 풀이 모자랍니다: 참 ${yes.length}(필요 ${t}) · 거짓 ${no.length}(필요 ${5 - t})`,
    );
  }
  const picked = [
    ...shuffle(rng, yes)
      .slice(0, t)
      .map((tex) => ({ tex, ok: true })),
    ...shuffle(rng, no)
      .slice(0, 5 - t)
      .map((tex) => ({ tex, ok: false })),
  ];
  const items = shuffle(rng, picked);
  let mask = 0;
  items.forEach((it, i) => {
    if (it.ok) mask |= 1 << i;
  });
  return { items, mask };
}

function itemLines(items: PoolItem[]): string {
  return items.map((it, i) => `${LETTERS[i]} $${it.tex}$`).join("\n");
}

/** 보기의 원문을 facts 로 못 싣는다 — 대신 개수와 mask 만 싣는다. */
function itemFacts(items: PoolItem[], mask: number): Record<string, number> {
  return { 보기수: items.length, mask };
}

// ── 유형 등록 틀 ───────────────────────────────────────
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

// ── 보기 풀 ────────────────────────────────────────────
/** 부등식인 것 / 아닌 것 (등식이거나 관계가 아예 없는 식). */
const INEQ_YES = [
  "x-5<12",
  "5-1>0",
  "x+4<2x",
  "3x\\ge2(x-3)",
  "-4x+1\\le7",
  "2x-1>x+3",
  "10-8<5",
  "4x\\ge10-x",
] as const;
const INEQ_NO = [
  "x-5=2",
  "3\\times2-1=7",
  "5x=10",
  "6x+2",
  "3x-(1-x)",
  "x-2y",
  "-4x+1",
  "8+7=15",
] as const;

/** 일차부등식인 것 / 아닌 것. */
const LINEQ_YES = [
  "2x+1\\le3",
  "6(1-x)\\ge-2+3x",
  "x^2-6\\le x^2-x",
  "5-3x\\ge x+9",
  "x-2x^2>7-2x^2",
  "1-\\dfrac{x}{2}<0",
  "6x\\le3x+1",
] as const;
const LINEQ_NO = [
  "2x+1=3",
  "x^2+x-1>0",
  "3-x<5-x",
  "2x+3+4x>2(3x+1)",
  "x^2+x\\ge x-1",
  "5x-3",
  "x-2x^2>7",
] as const;

/** 미지수가 2개인 일차방정식인 것 / 아닌 것. */
const TWOVAR_YES = [
  "3x-y=2",
  "\\dfrac{1}{5}x+\\dfrac{1}{3}y=1",
  "x+1=-4y",
  "x=4y-3",
  "5x-2y+7=0",
  "x^2+2y=x^2-3y+x",
] as const;
const TWOVAR_NO = [
  "2x+3y-1",
  "3x+y=3(x-y+1)",
  "xy+3x+y=5",
  "x^2+y+1=0",
  "x+6y=x-y-2",
  "2y-(x-y)",
  "3x-2=x+1",
] as const;

/** 「부등식으로 나타내기」 상황 — 시험이 뜻을 따로 알고 대조한다. */
const PHRASES = [
  { w: "이상", rel: 3 },
  { w: "이하", rel: 2 },
  { w: "초과", rel: 1 },
  { w: "미만", rel: 0 },
] as const;

export const M2_SYSTEM: TypeEntry[] = [
  // ══ 일차부등식 01~05 (단원: 부등식) ═════════════════
  def(MINOR_INEQ, "01", "부등식의 뜻", SEC.부등식, "기본", (rng) => {
    const { items, mask } = fiveItems(rng, INEQ_YES, INEQ_NO);
    const yes = items
      .map((it, i) => ({ it, i }))
      .filter((r) => r.it.ok)
      .map((r) => LETTERS[r.i]);
    return {
      content: `다음 보기 중 부등식인 것을 모두 고르시오.\n${itemLines(items)}`,
      answer: lettersOfMask(mask, items.length),
      solution: `부등식은 부등호 $<$, $>$, $\\le$, $\\ge$ 를 사용하여 수 또는 식의 대소 관계를 나타낸 식이다.\n등호로 이어진 식과 부등호가 없는 식은 부등식이 아니다.\n따라서 부등식인 것은 ${yes.join(", ")}이다.`,
      facts: itemFacts(items, mask),
    };
  }),

  def(MINOR_INEQ, "02", "부등식으로 나타내기", SEC.부등식, "기본", (rng) => {
    const scn = intBetween(rng, 0, 4);
    const ph = pick(rng, PHRASES);
    const rel = ph.rel;
    const relSym = relTex(rel);
    if (scn === 0) {
      const p = pick(rng, [500, 700, 800, 1200] as const);
      const q = 100 * intBetween(rng, 30, 90);
      return {
        content: `한 자루에 $${p}$원인 볼펜 $x$자루의 가격은 $${q}$원 ${ph.w}이다. 이를 부등식으로 나타내시오.`,
        answer: `$${p}x${relSym}${q}$`,
        solution: `볼펜 $x$자루의 가격은 $${p}x$원이다.\n이 값이 $${q}$원 ${ph.w}이므로 $${p}x${relSym}${q}$이다.`,
        facts: { scn, p, q, r: 0, rel },
      };
    }
    if (scn === 1) {
      const q = intBetween(rng, 12, 60);
      return {
        content: `한 변의 길이가 $x\\,\\mathrm{cm}$인 정삼각형의 둘레의 길이는 $${q}\\,\\mathrm{cm}$ ${ph.w}이다. 이를 부등식으로 나타내시오.`,
        answer: `$3x${relSym}${q}$`,
        solution: `정삼각형의 둘레의 길이는 $3x\\,\\mathrm{cm}$이다.\n이 값이 $${q}\\,\\mathrm{cm}$ ${ph.w}이므로 $3x${relSym}${q}$이다.`,
        facts: { scn, p: 3, q, r: 0, rel },
      };
    }
    if (scn === 2) {
      const p = intBetween(rng, 3, 12);
      const q = intBetween(rng, 10, 60);
      return {
        content: `시속 $${p}\\,\\mathrm{km}$로 $x$시간 동안 간 거리는 $${q}\\,\\mathrm{km}$ ${ph.w}이다. 이를 부등식으로 나타내시오.`,
        answer: `$${p}x${relSym}${q}$`,
        solution: `시속 $${p}\\,\\mathrm{km}$로 $x$시간 동안 간 거리는 $${p}x\\,\\mathrm{km}$이다.\n이 값이 $${q}\\,\\mathrm{km}$ ${ph.w}이므로 $${p}x${relSym}${q}$이다.`,
        facts: { scn, p, q, r: 0, rel },
      };
    }
    if (scn === 3) {
      const p = intBetween(rng, 4, 15);
      // 한계값이 가로 두 변의 합보다 작으면 조건이 사실상 없는 것과 같다 — 넉넉히 띄운다.
      const q = 2 * p + intBetween(rng, 6, 40);
      return {
        content: `가로의 길이가 $${p}\\,\\mathrm{cm}$, 세로의 길이가 $x\\,\\mathrm{cm}$인 직사각형의 둘레의 길이는 $${q}\\,\\mathrm{cm}$ ${ph.w}이다. 이를 부등식으로 나타내시오.`,
        answer: `$2(${p}+x)${relSym}${q}$`,
        solution: `직사각형의 둘레의 길이는 $2(${p}+x)\\,\\mathrm{cm}$이다.\n이 값이 $${q}\\,\\mathrm{cm}$ ${ph.w}이므로 $2(${p}+x)${relSym}${q}$이다.`,
        facts: { scn, p, q, r: 0, rel },
      };
    }
    const p = intBetween(rng, 2, 9);
    const r = intBetween(rng, 1, 15);
    const q = intBetween(rng, 5, 40);
    return {
      content: `$x$의 $${p}$배에서 $${r}$${eulReul(r)} 뺀 수는 $${q}$ ${ph.w}이다. 이를 부등식으로 나타내시오.`,
      answer: `$${p}x-${r}${relSym}${q}$`,
      solution: `$x$의 $${p}$배에서 $${r}$${eulReul(r)} 뺀 수는 $${p}x-${r}$이다.\n이 값이 $${q}$ ${ph.w}이므로 $${p}x-${r}${relSym}${q}$이다.`,
      facts: { scn, p, q, r, rel },
    };
  }),

  def(MINOR_INEQ, "03", "부등식의 해", SEC.부등식, "기본", (rng) =>
    attempt(200, () => {
      const t = intBetween(rng, -1, 1);
      const ansRel = pick(rng, REL_CODES);
      const a = nonzero(rng, 1, 3);
      const b = intBetween(rng, -9, 9);
      const c = a * t + b;
      const prel = a > 0 ? ansRel : flipRel(ansRel);
      const sols = [-2, -1, 0, 1, 2].filter((v) =>
        relHolds(prel, a * v + b, c),
      );
      if (sols.length === 0 || sols.length === 5) return null;
      const tex = `${side(a, b)}${relTex(prel)}${c}`;
      return {
        content: `$x$의 값이 $-2$, $-1$, $0$, $1$, $2$ 일 때, 부등식 $${tex}$ 의 해를 모두 구하시오.`,
        answer: sols.map((v) => `$${v}$`).join(", "),
        solution: `$x$의 값을 차례로 대입하여 부등식이 참이 되는 것을 찾는다.\n$${tex}$ 에서 $${mc(a, "x")}${relTex(prel)}${c - b}$이므로 $x${relTex(ansRel)}${t}$이다.\n따라서 주어진 값 중 해는 ${sols.map((v) => `$${v}$`).join(", ")}이다.`,
        facts: { a, b, c, prel, t, first: sols[0]!, cnt: sols.length },
      };
    }),
  ),

  def(MINOR_INEQ, "04", "부등식의 성질", SEC.부등식, "기본", (rng) =>
    attempt(200, () => {
      const seen = new Set<string>();
      const items: PoolItem[] = [];
      for (let i = 0; i < 40 && items.length < 5; i += 1) {
        const m = nonzero(rng, 1, 5);
        const k = intBetween(rng, -9, 9);
        const rel = pick(rng, [0, 1] as const);
        const lhs = m < 0 && k > 0 ? `${k}${sc(m, "a")}` : `${side(m, k, "a")}`;
        const rhs = m < 0 && k > 0 ? `${k}${sc(m, "b")}` : `${side(m, k, "b")}`;
        const tex = `${lhs}${relTex(rel)}${rhs}`;
        if (seen.has(tex)) continue;
        seen.add(tex);
        items.push({ tex, ok: m > 0 ? rel === 0 : rel === 1 });
      }
      if (items.length < 5) return null;
      let mask = 0;
      items.forEach((it, i) => {
        if (it.ok) mask |= 1 << i;
      });
      const t = items.filter((it) => it.ok).length;
      // 🔴 「모두 고르시오」의 정답은 **정확히 2개** (원장님 2026-08-25).
      //    여기 보기는 무작위 계수에서 나와 참·거짓을 미리 고를 수 없으므로
      //    거르는 수밖에 없다 — 참이 2개일 확률이 C(5,2)/2^5≈31% 라 attempt(200)
      //    으로 충분하다(실패 확률 ~1e-32). 거르는 자리가 여기뿐이어야 한다.
      if (t !== CHOOSE_ALL_ANSWER_COUNT) return null;
      return {
        content: `$a<b$ 일 때, 다음 보기 중 옳은 것을 모두 고르시오.\n${itemLines(items)}`,
        answer: lettersOfMask(mask, items.length),
        solution: `부등식의 양변에 같은 수를 더하거나 빼도, 같은 양수를 곱하거나 나누어도 부등호의 방향은 바뀌지 않는다.\n그러나 같은 음수를 곱하거나 나누면 부등호의 방향이 바뀐다.\n$a<b$ 이므로 $a$, $b$의 계수가 양수이면 부등호의 방향이 그대로, 음수이면 반대가 되어야 옳다.`,
        facts: itemFacts(items, mask),
      };
    }),
  ),

  def(
    MINOR_INEQ,
    "05",
    "부등식의 성질을 이용하여 식의 값의 범위 구하기",
    SEC.부등식,
    "응용",
    (rng) => {
      const lo = intBetween(rng, -6, 2);
      const hi = lo + intBetween(rng, 2, 7);
      const cLo = pick(rng, [0, 2] as const); // 0:`<` 2:`\le`
      const cHi = pick(rng, [0, 2] as const);
      const m = nonzero(rng, 2, 5);
      const k = intBetween(rng, -8, 8);
      const vLo = m * lo + k;
      const vHi = m * hi + k;
      const aLo = m > 0 ? vLo : vHi;
      const aHi = m > 0 ? vHi : vLo;
      const rLo = m > 0 ? cLo : cHi;
      const rHi = m > 0 ? cHi : cLo;
      const def2 = side(m, k);
      return {
        content: `$${lo}${relTex(cLo)}x${relTex(cHi)}${hi}$ 일 때, $A=${def2}$ 의 값의 범위를 구하시오.`,
        answer: `$${aLo}${relTex(rLo)}A${relTex(rHi)}${aHi}$`,
        solution: `$${lo}${relTex(cLo)}x${relTex(cHi)}${hi}$ 의 각 변에 $${m}$${eulReul(m)} 곱하면 ${m < 0 ? "부등호의 방향이 바뀌어 " : ""}$${aLo - k}${relTex(rLo)}${mc(m, "x")}${relTex(rHi)}${aHi - k}$이다.\n${k === 0 ? "" : k > 0 ? `각 변에 $${k}$${eulReul(k)} 더하면 ` : `각 변에서 $${-k}$${eulReul(k)} 빼면 `}$${aLo}${relTex(rLo)}${def2}${relTex(rHi)}${aHi}$이다.\n따라서 $${aLo}${relTex(rLo)}A${relTex(rHi)}${aHi}$이다.`,
        facts: { lo, hi, cLo, cHi, m, k, aLo, aHi, rLo, rHi },
      };
    },
  ),

  // ══ 일차부등식 06~09 (단원: 일차부등식의 풀이) ══════
  def(MINOR_INEQ, "06", "일차부등식의 뜻", SEC.부등식풀이, "기본", (rng) => {
    const { items, mask } = fiveItems(rng, LINEQ_YES, LINEQ_NO);
    return {
      content: `다음 보기 중 일차부등식인 것을 모두 고르시오.\n${itemLines(items)}`,
      answer: lettersOfMask(mask, items.length),
      solution: `모든 항을 좌변으로 이항하여 정리했을 때 (일차식)$>0$, (일차식)$<0$, (일차식)$\\ge0$, (일차식)$\\le0$ 중 하나의 꼴이면 일차부등식이다.\n등호로 이어진 식, 부등호가 없는 식, 이항하여 정리하면 $x$가 사라지거나 $x^2$이 남는 식은 일차부등식이 아니다.`,
      facts: itemFacts(items, mask),
    };
  }),

  def(MINOR_INEQ, "07", "일차부등식의 풀이", SEC.부등식풀이, "기본", (rng) =>
    attempt(200, () => {
      const s = intBetween(rng, -8, 8);
      const ansRel = pick(rng, REL_CODES);
      const a = nonzero(rng, 1, 6);
      const q = intBetween(rng, -4, 4);
      const p = q + a;
      if (p === 0) return null;
      const b = intBetween(rng, -12, 12);
      const c = b + a * s;
      if (Math.abs(c) > 40) return null;
      const prel = a > 0 ? ansRel : flipRel(ansRel);
      const tex = `${side(p, b)}${relTex(prel)}${side(q, c)}`;
      const moved = `${mc(a, "x")}${relTex(prel)}${c - b}`;
      return {
        content: `일차부등식 $${tex}$ 의 해를 구하시오.`,
        answer: `$x${relTex(ansRel)}${s}$`,
        solution: `$x$를 포함하는 항은 좌변으로, 상수항은 우변으로 이항하면 $${moved}$이다.\n양변을 $${a}$${euro(a)} 나누면 ${a < 0 ? "부등호의 방향이 바뀌어 " : ""}$x${relTex(ansRel)}${s}$이다.`,
        facts: { p, b, q, c, prel, a, s, ansRel },
      };
    }),
  ),

  def(
    MINOR_INEQ,
    "08",
    "괄호가 있는 일차부등식의 풀이",
    SEC.부등식풀이,
    "응용",
    (rng) =>
      attempt(400, () => {
        const s = intBetween(rng, -7, 7);
        const ansRel = pick(rng, REL_CODES);
        const p = nonzero(rng, 2, 6);
        const q = nonzero(rng, 1, 5);
        const a = p - q;
        if (a === 0) return null;
        const u = intBetween(rng, -9, 9);
        const v = intBetween(rng, -9, 9);
        const w = a * s + p * u - q * v;
        if (Math.abs(w) > 40) return null;
        const prel = a > 0 ? ansRel : flipRel(ansRel);
        const lhs = paren(p, u);
        const rhs = `${paren(q, v)}${w === 0 ? "" : sg(w)}`;
        const expL = side(p, p * u);
        const expR = side(q, q * v + w);
        return {
          content: `일차부등식 $${lhs}${relTex(prel)}${rhs}$ 의 해를 구하시오.`,
          answer: `$x${relTex(ansRel)}${s}$`,
          solution: `괄호를 풀면 $${expL}${relTex(prel)}${expR}$이다.\n이항하여 정리하면 $${mc(a, "x")}${relTex(prel)}${a * s}$이다.\n양변을 $${a}$${euro(a)} 나누면 ${a < 0 ? "부등호의 방향이 바뀌어 " : ""}$x${relTex(ansRel)}${s}$이다.`,
          facts: { p, u, q, v, w, prel, a, s, ansRel },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "09",
    "계수가 소수 또는 분수인 일차부등식의 풀이",
    SEC.부등식풀이,
    "응용",
    (rng) => {
      const useDec = pick(rng, [true, false] as const);
      if (useDec) {
        return attempt(400, () => {
          const k = pick(rng, [1, 2] as const);
          const s = intBetween(rng, -8, 8);
          const ansRel = pick(rng, REL_CODES);
          const P = nonzero(rng, 1, 40);
          const R = intBetween(rng, -20, 20);
          const a = P - R;
          if (a === 0) return null;
          const Q = intBetween(rng, -60, 60);
          const S = Q + a * s;
          if (Math.abs(S) > 400) return null;
          const prel = a > 0 ? ansRel : flipRel(ansRel);
          const tex = `${decSide(P, Q, k)}${relTex(prel)}${decSide(R, S, k)}`;
          const scaled = `${side(P, Q)}${relTex(prel)}${side(R, S)}`;
          return {
            content: `일차부등식 $${tex}$ 의 해를 구하시오.`,
            answer: `$x${relTex(ansRel)}${s}$`,
            solution: `양변에 $${10 ** k}$${eulReul(10 ** k)} 곱하여 계수를 정수로 고치면 $${scaled}$이다.\n이항하여 정리하면 $${mc(a, "x")}${relTex(prel)}${a * s}$이다.\n양변을 $${a}$${euro(a)} 나누면 ${a < 0 ? "부등호의 방향이 바뀌어 " : ""}$x${relTex(ansRel)}${s}$이다.`,
            facts: { P, Q, R, S, k, prel, a, s, ansRel },
          };
        });
      }
      return attempt(2000, () => {
        const s = intBetween(rng, -8, 8);
        const ansRel = pick(rng, REL_CODES);
        const d = pick(rng, [2, 3, 4, 6] as const);
        const e = pick(rng, [2, 3, 4, 6] as const);
        if (d === e) return null;
        const m = intBetween(rng, 1, 4);
        const s2 = pick(rng, [1, -1] as const);
        const u = intBetween(rng, -6, 6);
        const v = intBetween(rng, -6, 6);
        const A = e + s2 * m * d;
        if (A === 0) return null;
        const B = e * u + s2 * d * v;
        const D = d * e;
        if ((A * s + B) % D !== 0) return null;
        const w = (A * s + B) / D;
        if (Math.abs(w) > 8) return null;
        const prel = A > 0 ? ansRel : flipRel(ansRel);
        const tex = `${fracLin(1, u, d)}${s2 > 0 ? "+" : "-"}${fracLin(m, v, e)}${relTex(prel)}${w}`;
        const cleared = `${side(e, e * u)}${s2 > 0 ? "+" : "-"}${s2 > 0 ? side(m * d, d * v) : `(${side(m * d, d * v)})`}${relTex(prel)}${D * w}`;
        return {
          content: `일차부등식 $${tex}$ 의 해를 구하시오.`,
          answer: `$x${relTex(ansRel)}${s}$`,
          solution: `양변에 분모의 공배수 $${D}$${eulReul(D)} 곱하면 $${cleared}$이다.\n정리하면 $${side(A, B)}${relTex(prel)}${D * w}$, 곧 $${mc(A, "x")}${relTex(prel)}${A * s}$이다.\n양변을 $${A}$${euro(A)} 나누면 ${A < 0 ? "부등호의 방향이 바뀌어 " : ""}$x${relTex(ansRel)}${s}$이다.`,
          facts: { d, e, m, s2, u, v, w, A, B, prel, s, ansRel },
        };
      });
    },
  ),

  // ══ 연립일차방정식 01~05 (미지수가 2개인 연립일차방정식) ══
  def(
    MINOR_SYS,
    "01",
    "미지수가 개인 일차방정식",
    SEC.미지수2,
    "기본",
    (rng) => {
      const { items, mask } = fiveItems(rng, TWOVAR_YES, TWOVAR_NO);
      return {
        content: `다음 보기 중 미지수가 $2$개인 일차방정식인 것을 모두 고르시오.\n${itemLines(items)}`,
        answer: lettersOfMask(mask, items.length),
        solution: `모든 항을 좌변으로 이항하여 정리했을 때 $ax+by+c=0$ (단, $a\\ne0$, $b\\ne0$)의 꼴이면 미지수가 $2$개인 일차방정식이다.\n등호가 없는 식, $xy$나 $x^2$이 남는 식, 정리하면 미지수가 하나만 남는 식은 아니다.`,
        facts: itemFacts(items, mask),
      };
    },
  ),

  def(
    MINOR_SYS,
    "02",
    "미지수가 개인 일차방정식의 해",
    SEC.미지수2,
    "기본",
    (rng) =>
      attempt(400, () => {
        const a = intBetween(rng, 2, 5);
        const b = intBetween(rng, 2, 5);
        if (a === b || gcd(a, b) !== 1) return null;
        const x0 = intBetween(rng, 1, 8);
        const y0 = intBetween(rng, 1, 8);
        const c = a * x0 + b * y0;
        let n = 0;
        for (let x = 1; a * x < c; x += 1) {
          const rest = c - a * x;
          if (rest % b === 0 && rest / b >= 1) n += 1;
        }
        if (n < 2 || n > 6) return null;
        return {
          content: `$x$, $y$가 자연수일 때, 일차방정식 $${a}x+${b}y=${c}$ ${eulReul(c)} 만족시키는 $x$, $y$의 순서쌍 $(x,\\ y)$는 모두 몇 개인지 구하시오.`,
          answer: `$${n}$개`,
          solution: `$x$에 $1$, $2$, $3$, $\\cdots$ 을 차례로 대입하여 $y$도 자연수가 되는 경우를 찾는다.\n$${b}y=${c}-${a}x$ 에서 $${c}-${a}x$ 가 $${b}$의 배수이면서 양수여야 한다.\n그러한 순서쌍은 모두 $${n}$개이다.`,
          facts: { a, b, c, n },
        };
      }),
  ),

  def(
    MINOR_SYS,
    "03",
    "일차방정식의 해가 주어질 때",
    SEC.미지수2,
    "응용",
    (rng) =>
      attempt(200, () => {
        const x0 = nonzero(rng, 1, 5);
        const y0 = nonzero(rng, 1, 5);
        const a = nonzero(rng, 2, 6);
        const q = nonzero(rng, 1, 5);
        const c = a * x0 + q * y0;
        if (Math.abs(c) > 40) return null;
        return {
          content: `일차방정식 $ax${sc(q, "y")}=${c}$ 의 한 해가 $x=${x0}$, $y=${y0}$ 일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$x=${x0}$, $y=${y0}$ ${eulReul(y0)} 주어진 식에 대입하면 $${mc(x0, "a")}${sg(q * y0)}=${c}$이다.\n$${mc(x0, "a")}=${a * x0}$이므로 $a=${a}$이다.`,
          facts: { x0, y0, a, q, c },
        };
      }),
  ),

  def(MINOR_SYS, "04", "연립방정식과 그 해", SEC.미지수2, "기본", (rng) =>
    attempt(400, () => {
      const x0 = nonzero(rng, 1, 5);
      const y0 = nonzero(rng, 1, 5);
      // 🔴 정답 개수는 씨앗이 고르지 않는다 — 정확히 2개 (원장님 2026-08-25).
      const t = CHOOSE_ALL_ANSWER_COUNT;
      const flags = shuffle(rng, [
        ...Array.from({ length: t }, () => true),
        ...Array.from({ length: 5 - t }, () => false),
      ]);
      const seen = new Set<string>();
      const items: PoolItem[] = [];
      for (const ok of flags) {
        let made: string | null = null;
        for (let i = 0; i < 60 && made === null; i += 1) {
          const a1 = nonzero(rng, 1, 4);
          const b1 = nonzero(rng, 1, 4);
          const a2 = nonzero(rng, 1, 4);
          const b2 = nonzero(rng, 1, 4);
          if (a1 * b2 - a2 * b1 === 0) continue;
          const c1 = a1 * x0 + b1 * y0;
          const c2 = a2 * x0 + b2 * y0;
          const d1 = ok ? 0 : pick(rng, [1, 0] as const);
          const d2 = ok || d1 === 1 ? 0 : 1;
          const e1 = d1 === 1 ? nonzero(rng, 1, 4) : 0;
          const e2 = d2 === 1 ? nonzero(rng, 1, 4) : 0;
          const tex = `$${mc(a1, "x")}${sc(b1, "y")}=${c1 + e1}$, $${mc(a2, "x")}${sc(b2, "y")}=${c2 + e2}$`;
          if (seen.has(tex)) continue;
          seen.add(tex);
          made = tex;
        }
        if (made === null) return null;
        items.push({ tex: made, ok });
      }
      let mask = 0;
      items.forEach((it, i) => {
        if (it.ok) mask |= 1 << i;
      });
      const lines = items.map((it, i) => `${LETTERS[i]} ${it.tex}`).join("\n");
      return {
        content: `다음 보기 중 $x=${x0}$, $y=${y0}$ 를 해로 갖는 연립방정식을 모두 고르시오.\n${lines}`,
        answer: lettersOfMask(mask, items.length),
        solution: `$x=${x0}$, $y=${y0}$ ${eulReul(y0)} 각 연립방정식의 두 방정식에 대입하여 둘 다 참이 되는 것을 찾는다.\n한 방정식만 참이면 그 연립방정식의 해가 아니다.`,
        facts: { x0, y0, mask, 보기수: items.length },
      };
    }),
  ),

  def(
    MINOR_SYS,
    "05",
    "연립방정식의 해가 주어질 때⑴",
    SEC.미지수2,
    "응용",
    (rng) =>
      attempt(200, () => {
        const x0 = nonzero(rng, 1, 5);
        const y0 = nonzero(rng, 1, 5);
        const a = nonzero(rng, 2, 6);
        const b = nonzero(rng, 2, 6);
        const q1 = nonzero(rng, 1, 4);
        const q2 = nonzero(rng, 1, 4);
        const c1 = a * x0 + q1 * y0;
        const c2 = q2 * x0 + b * y0;
        if (Math.abs(c1) > 40 || Math.abs(c2) > 40) return null;
        return {
          content: `연립방정식 $\\begin{cases}ax${sc(q1, "y")}=${c1}\\\\${mc(q2, "x")}+by=${c2}\\end{cases}$ 의 해가 $x=${x0}$, $y=${y0}$ 일 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
          answer: `$${a + b}$`,
          solution: `$x=${x0}$, $y=${y0}$ ${eulReul(y0)} 첫째 식에 대입하면 $${mc(x0, "a")}${sg(q1 * y0)}=${c1}$이므로 $a=${a}$이다.\n둘째 식에 대입하면 $${q2 * x0}${sc(y0, "b")}=${c2}$이므로 $b=${b}$이다.\n따라서 $a+b=${a + b}$이다.`,
          facts: { x0, y0, a, b, q1, q2, c1, c2, S: a + b },
        };
      }),
  ),

  def(
    MINOR_SYS,
    "01A",
    "두 수를 대입한 식의 값",
    SEC.미지수2,
    "연산",
    (rng) => {
      const x = nonzero(rng, 1, 7);
      const y = nonzero(rng, 1, 7);
      const a = nonzero(rng, 2, 6);
      const b = nonzero(rng, 2, 6);
      const answer = a * x + b * y;
      return {
        content: `$x=${x}$, $y=${y}$일 때, $${mc(a, "x")}${sc(b, "y")}$의 값을 구하시오.`,
        answer: `$${answer}$`,
        solution: `$x=${x}$, $y=${y}$를 대입하면 $${a}\times(${x})+(${b})\times(${y})=${answer}$이다.`,
        facts: { x, y, a, b, answer },
      };
    },
  ),

  def(
    MINOR_SYS,
    "02A",
    "일차방정식의 한 해 구하기",
    SEC.미지수2,
    "응용",
    (rng) => {
      const x = nonzero(rng, 1, 8);
      const y = nonzero(rng, 1, 8);
      const a = nonzero(rng, 2, 6);
      const b = nonzero(rng, 2, 6);
      const c = a * x + b * y;
      return {
        content: `순서쌍 $(${x}, y)$가 일차방정식 $${mc(a, "x")}${sc(b, "y")}=${c}$의 해일 때, $y$의 값을 구하시오.`,
        answer: `$${y}$`,
        solution: `$x=${x}$를 대입하면 $${a * x}${sc(b, "y")}=${c}$이다. 이를 풀면 $y=${y}$이다.`,
        facts: { x, y, a, b, c, answer: y },
      };
    },
  ),

  def(
    MINOR_SYS,
    "03A",
    "해를 이용하여 계수 구하기",
    SEC.미지수2,
    "응용",
    (rng) =>
      attempt(200, () => {
        const x = nonzero(rng, 1, 6);
        const y = nonzero(rng, 1, 6);
        const answer = nonzero(rng, 2, 7);
        const b = nonzero(rng, 1, 5);
        const c = answer * x + b * y;
        if (Math.abs(c) > 50) return null;
        return {
          content: `순서쌍 $(${x}, ${y})$가 일차방정식 $ax${sc(b, "y")}=${c}$의 해일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${answer}$`,
          solution: `$x=${x}$, $y=${y}$를 대입하면 $${mc(x, "a")}${sg(b * y)}=${c}$이므로 $a=${answer}$이다.`,
          facts: { x, y, b, c, answer },
        };
      }),
  ),

  def(MINOR_SYS, "04A", "음이 아닌 정수해의 개수", SEC.미지수2, "응용", (rng) =>
    attempt(300, () => {
      const a = intBetween(rng, 2, 6);
      const b = intBetween(rng, 2, 6);
      if (gcd(a, b) !== 1) return null;
      const c = intBetween(rng, 20, 60);
      let answer = 0;
      for (let x = 0; a * x <= c; x += 1) {
        if ((c - a * x) % b === 0) answer += 1;
      }
      if (answer < 2 || answer > 7) return null;
      return {
        content: `$x$, $y$가 음이 아닌 정수일 때, 일차방정식 $${a}x+${b}y=${c}$의 해 $(x,\ y)$는 모두 몇 개인지 구하시오.`,
        answer: `$${answer}$개`,
        solution: `$x=0$, $1$, $2$, $\cdots$를 대입하여 $${c}-${a}x$가 $${b}$의 음이 아닌 배수가 되는 경우를 세면 모두 $${answer}$개이다.`,
        facts: { a, b, c, answer },
      };
    }),
  ),

  def(MINOR_SYS, "05A", "두 방정식의 계수 구하기", SEC.미지수2, "심화", (rng) =>
    attempt(200, () => {
      const x = nonzero(rng, 1, 5);
      const y = nonzero(rng, 1, 5);
      const a = nonzero(rng, 2, 7);
      const b = nonzero(rng, 2, 7);
      const q = nonzero(rng, 1, 5);
      const r = nonzero(rng, 1, 5);
      const c1 = a * x + q * y;
      const c2 = r * x + b * y;
      if (Math.abs(c1) > 50 || Math.abs(c2) > 50) return null;
      const answer = a - b;
      return {
        content: `연립방정식 $\begin{cases}ax${sc(q, "y")}=${c1}\\${mc(r, "x")}+by=${c2}\end{cases}$의 해가 $x=${x}$, $y=${y}$일 때, $a-b$의 값을 구하시오.`,
        answer: `$${answer}$`,
        solution: `해를 첫째 식에 대입하면 $a=${a}$이고, 둘째 식에 대입하면 $b=${b}$이다. 따라서 $a-b=${a}-${b}=${answer}$이다.`,
        facts: { x, y, a, b, q, r, c1, c2, answer },
      };
    }),
  ),

  def(
    MINOR_SYS,
    "06A",
    "한 좌표가 주어진 일차방정식의 해",
    SEC.미지수2,
    "기본",
    (rng) => {
      const x = nonzero(rng, 1, 8);
      const y = nonzero(rng, 1, 8);
      const a = nonzero(rng, 2, 6);
      const b = nonzero(rng, 2, 6);
      const c = a * x + b * y;
      return {
        content: `순서쌍 $(x, ${y})$가 일차방정식 $${mc(a, "x")}${sc(b, "y")}=${c}$의 해일 때, $x$의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `$y=${y}$를 대입하면 $${mc(a, "x")}${sg(b * y)}=${c}$이다. 이를 풀면 $x=${x}$이다.`,
        facts: { x, y, a, b, c, answer: x },
      };
    },
  ),

  def(MINOR_SYS, "07A", "해와 계수의 관계", SEC.미지수2, "심화", (rng) => {
    const x = intBetween(rng, 1, 5);
    const y = intBetween(rng, 1, 5);
    const a = intBetween(rng, 2, 8);
    const b = intBetween(rng, 2, 8);
    const c = a * x + b * y;
    const difference = a - b;
    const answer = a + b;
    return {
      content: `순서쌍 $(${x}, ${y})$가 일차방정식 $ax+by=${c}$의 해이고 $a-b=${difference}$일 때, $a+b$의 값을 구하시오.`,
      answer: `$${answer}$`,
      solution: `해를 대입하면 $${x}a+${y}b=${c}$이고, $a-b=${difference}$이다. 두 식을 연립하여 풀면 $a=${a}$, $b=${b}$이므로 $a+b=${answer}$이다.`,
      facts: { x, y, a, b, c, difference, answer },
    };
  }),

  // ══ 연립일차방정식 06~07 (연립방정식의 풀이) ═════════
  def(
    MINOR_SYS,
    "06",
    "연립방정식의 풀이 대입법",
    SEC.연립풀이,
    "기본",
    (rng) =>
      attempt(200, () => {
        const x0 = nonzero(rng, 1, 6);
        const y0 = nonzero(rng, 1, 6);
        const p = nonzero(rng, 1, 4);
        const q = y0 - p * x0;
        if (Math.abs(q) > 20) return null;
        const a = nonzero(rng, 1, 5);
        const b = nonzero(rng, 1, 4);
        if (a + b * p === 0) return null;
        const c = a * x0 + b * y0;
        if (Math.abs(c) > 40) return null;
        const eq1 = `y=${side(p, q)}`;
        const eq2 = `${mc(a, "x")}${sc(b, "y")}=${c}`;
        return {
          content: `연립방정식 $\\begin{cases}${eq1}\\\\${eq2}\\end{cases}$ 의 해를 대입법으로 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `첫째 식을 둘째 식의 $y$에 대입하면 $${mc(a, "x")}${sc(b, `(${side(p, q)})`)}=${c}$이다.\n괄호를 풀어 정리하면 $${mc(a + b * p, "x")}${b * q === 0 ? "" : sg(b * q)}=${c}$이므로 $x=${x0}$이다.\n이를 첫째 식에 대입하면 $y=${y0}$이다.`,
          facts: { p, q, a, b, c, x0, y0 },
        };
      }),
  ),

  def(
    MINOR_SYS,
    "07",
    "연립방정식의 풀이 가감법",
    SEC.연립풀이,
    "기본",
    (rng) =>
      attempt(300, () => {
        const x0 = nonzero(rng, 1, 6);
        const y0 = nonzero(rng, 1, 6);
        const a1 = nonzero(rng, 1, 5);
        const b1 = nonzero(rng, 1, 5);
        const a2 = nonzero(rng, 1, 5);
        const b2 = nonzero(rng, 1, 5);
        const det = a1 * b2 - a2 * b1;
        if (det === 0) return null;
        const c1 = a1 * x0 + b1 * y0;
        const c2 = a2 * x0 + b2 * y0;
        if (Math.abs(c1) > 45 || Math.abs(c2) > 45) return null;
        // 곱하는 수는 **양수**로 둔다 — 음수를 곱하라는 해설은 지면에서 낯설다.
        // 그러면 두 식의 $y$의 계수는 부호가 같으면 같아지고(빼기), 다르면 반대가 된다(더하기).
        const k1 = Math.abs(b2);
        const k2 = Math.abs(b1);
        const same = b1 * b2 > 0;
        const op = same ? -1 : 1;
        const A = a1 * k1 + op * a2 * k2;
        const C = c1 * k1 + op * c2 * k2;
        if (A === 0) return null;
        return {
          content: `연립방정식 $\\begin{cases}${mc(a1, "x")}${sc(b1, "y")}=${c1}\\\\${mc(a2, "x")}${sc(b2, "y")}=${c2}\\end{cases}$ 의 해를 가감법으로 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `첫째 식의 양변에 $${k1}$${eulReul(k1)}, 둘째 식의 양변에 $${k2}$${eulReul(k2)} 곱하면 $y$의 계수의 절댓값이 같아진다.\n두 식을 변끼리 ${same ? "빼면" : "더하면"} $${mc(A, "x")}=${C}$이므로 $x=${x0}$이다.\n이를 첫째 식에 대입하면 $y=${y0}$이다.`,
          facts: { a1, b1, c1, a2, b2, c2, x0, y0, det },
        };
      }),
  ),

  // ══ 연립일차방정식 08~11·19·20 (여러 가지 연립방정식의 풀이) ══
  def(
    MINOR_SYS,
    "08",
    "괄호가 있는 연립방정식의 풀이",
    SEC.여러가지,
    "응용",
    (rng) =>
      attempt(400, () => {
        const x0 = nonzero(rng, 1, 5);
        const y0 = nonzero(rng, 1, 5);
        const a1 = nonzero(rng, 1, 4);
        const b1 = nonzero(rng, 1, 4);
        const c1 = a1 * x0 + b1 * y0;
        const p = nonzero(rng, 1, 5);
        const k = nonzero(rng, 1, 4);
        const r = nonzero(rng, 1, 4);
        const A2 = p - k;
        const B2 = -k * r;
        if (A2 === 0 || B2 === 0) return null;
        if (a1 * B2 - A2 * b1 === 0) return null;
        const c2 = A2 * x0 + B2 * y0;
        if (Math.abs(c1) > 40 || Math.abs(c2) > 45) return null;
        const inner = `x${sc(r, "y")}`;
        const kTex = Math.abs(k) === 1 ? "" : String(Math.abs(k));
        const eq2Tex = `${mc(p, "x")}${k > 0 ? "-" : "+"}${kTex}(${inner})=${c2}`;
        return {
          content: `연립방정식 $\\begin{cases}${mc(a1, "x")}${sc(b1, "y")}=${c1}\\\\${eq2Tex}\\end{cases}$ 의 해를 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `둘째 식의 괄호를 풀어 정리하면 $${side(A2, 0)}${sc(B2, "y")}=${c2}$이다.\n이 식과 첫째 식을 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
          facts: { a1, b1, c1, p, k, r, A2, B2, c2, x0, y0 },
        };
      }),
  ),

  def(
    MINOR_SYS,
    "09",
    "계수가 소수 또는 분수인 연립방정식의 풀이",
    SEC.여러가지,
    "응용",
    (rng) => {
      const useDec = pick(rng, [true, false] as const);
      if (useDec) {
        return attempt(400, () => {
          const x0 = nonzero(rng, 1, 6);
          const y0 = nonzero(rng, 1, 6);
          const a1 = nonzero(rng, 1, 12);
          const b1 = nonzero(rng, 1, 12);
          const a2 = nonzero(rng, 1, 12);
          const b2 = nonzero(rng, 1, 12);
          if (a1 * b2 - a2 * b1 === 0) return null;
          const c1 = a1 * x0 + b1 * y0;
          const c2 = a2 * x0 + b2 * y0;
          if (Math.abs(c1) > 120 || Math.abs(c2) > 120) return null;
          const row1 = `${decMono(a1, 1)}${b1 > 0 ? "+" : "-"}${decMono(Math.abs(b1), 1, "y")}=${decStr(c1, 1)}`;
          const row2 = `${decMono(a2, 1)}${b2 > 0 ? "+" : "-"}${decMono(Math.abs(b2), 1, "y")}=${decStr(c2, 1)}`;
          return {
            content: `연립방정식 $\\begin{cases}${row1}\\\\${row2}\\end{cases}$ 의 해를 구하시오.`,
            answer: `$x=${x0}$, $y=${y0}$`,
            solution: `두 식의 양변에 각각 $10$을 곱하여 계수를 정수로 고치면 $${mc(a1, "x")}${sc(b1, "y")}=${c1}$, $${mc(a2, "x")}${sc(b2, "y")}=${c2}$이다.\n두 식을 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
            facts: { a1, b1, c1, a2, b2, c2, x0, y0, dec: 1 },
          };
        });
      }
      return attempt(600, () => {
        const d1 = pick(rng, [2, 3, 4] as const);
        const d2 = pick(rng, [2, 3, 4] as const);
        const e1 = pick(rng, [2, 3, 4] as const);
        const e2 = pick(rng, [2, 3, 4] as const);
        const lx = (d1 * d2) / gcd(d1, d2);
        const ly = (e1 * e2) / gcd(e1, e2);
        const x0 = lx * nonzero(rng, 1, 3);
        const y0 = ly * nonzero(rng, 1, 3);
        const s1 = pick(rng, [1, -1] as const);
        const s2 = pick(rng, [1, -1] as const);
        // 계수 행렬식: (1/d1)(s2/e2) - (s1/e1)(1/d2)
        if (e1 * d2 * s2 - d1 * e2 * s1 === 0) return null;
        const c1 = x0 / d1 + (s1 * y0) / e1;
        const c2 = x0 / d2 + (s2 * y0) / e2;
        if (!Number.isInteger(c1) || !Number.isInteger(c2)) return null;
        if (Math.abs(c1) > 20 || Math.abs(c2) > 20) return null;
        const row1 = `\\dfrac{x}{${d1}}${s1 > 0 ? "+" : "-"}\\dfrac{y}{${e1}}=${c1}`;
        const row2 = `\\dfrac{x}{${d2}}${s2 > 0 ? "+" : "-"}\\dfrac{y}{${e2}}=${c2}`;
        const A1 = e1;
        const B1 = s1 * d1;
        const A2 = e2;
        const B2 = s2 * d2;
        return {
          content: `연립방정식 $\\begin{cases}${row1}\\\\${row2}\\end{cases}$ 의 해를 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `첫째 식의 양변에 $${d1 * e1}$${eulReul(d1 * e1)} 곱하면 $${mc(A1, "x")}${sc(B1, "y")}=${d1 * e1 * c1}$이다.\n둘째 식의 양변에 $${d2 * e2}$${eulReul(d2 * e2)} 곱하면 $${mc(A2, "x")}${sc(B2, "y")}=${d2 * e2 * c2}$이다.\n두 식을 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
          facts: { d1, e1, d2, e2, s1, s2, c1, c2, x0, y0 },
        };
      });
    },
  ),

  def(
    MINOR_SYS,
    "10",
    "비례식을 포함한 연립방정식의 풀이",
    SEC.여러가지,
    "응용",
    (rng) =>
      attempt(600, () => {
        const m = intBetween(rng, 2, 5);
        const n = intBetween(rng, 2, 5);
        if (m === n || gcd(m, n) !== 1) return null;
        const u = nonzero(rng, 1, 6);
        const v = nonzero(rng, 1, 6);
        // n(x+u) = m(y+v)  ⇔  n·x - m·y = m·v - n·u
        const A2 = n;
        const B2 = -m;
        const C2 = m * v - n * u;
        const a1 = nonzero(rng, 1, 4);
        const b1 = nonzero(rng, 1, 4);
        const det = a1 * B2 - A2 * b1;
        if (det === 0) return null;
        // 비례식을 먼저 정했으므로, 해가 정수로 떨어지는 조합만 남긴다.
        const x0 = nonzero(rng, 1, 5);
        const y0Num = A2 * x0 - C2;
        if (y0Num % m !== 0) return null;
        const y0 = y0Num / m;
        if (y0 === 0 || Math.abs(y0) > 12) return null;
        // 비가 성립하려면 두 항이 모두 0 이 아니어야 한다.
        if (x0 + u === 0 || y0 + v === 0) return null;
        const c1 = a1 * x0 + b1 * y0;
        if (Math.abs(c1) > 45) return null;
        return {
          content: `연립방정식 $\\begin{cases}${mc(a1, "x")}${sc(b1, "y")}=${c1}\\\\(x${sg(u)}):(y${sg(v)})=${m}:${n}\\end{cases}$ 의 해를 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `비례식에서 (외항의 곱)$=$(내항의 곱)이므로 $${n}(x${sg(u)})=${m}(y${sg(v)})$이다.\n정리하면 $${mc(A2, "x")}${sc(B2, "y")}=${C2}$이다.\n이 식과 첫째 식을 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
          facts: { a1, b1, c1, m, n, u, v, x0, y0, det },
        };
      }),
  ),

  def(MINOR_SYS, "11", "의 꼴의 방정식의 풀이", SEC.여러가지, "응용", (rng) =>
    attempt(300, () => {
      const x0 = nonzero(rng, 1, 5);
      const y0 = nonzero(rng, 1, 5);
      const a1 = nonzero(rng, 1, 4);
      const b1 = nonzero(rng, 1, 4);
      const c = a1 * x0 + b1 * y0;
      if (Math.abs(c) > 30) return null;
      // 둘째 식은 $y$의 계수를 **역산**한다 — 무작위로 뽑으면 $B=C$ 가 거의 안 맞는다.
      const a2 = nonzero(rng, 1, 4);
      const num = c - a2 * x0;
      if (num % y0 !== 0) return null;
      const b2 = num / y0;
      if (b2 === 0 || Math.abs(b2) > 6) return null;
      if (a1 * b2 - a2 * b1 === 0) return null;
      const A = `${mc(a1, "x")}${sc(b1, "y")}`;
      const B = `${mc(a2, "x")}${sc(b2, "y")}`;
      return {
        content: `방정식 $${A}=${B}=${c}$ 의 해를 구하시오.`,
        answer: `$x=${x0}$, $y=${y0}$`,
        solution: `$A=B=C$ 꼴의 방정식은 $\\begin{cases}A=C\\\\B=C\\end{cases}$ 로 바꾸어 푼다.\n$\\begin{cases}${A}=${c}\\\\${B}=${c}\\end{cases}$ 를 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
        facts: { a1, b1, a2, b2, c, x0, y0 },
      };
    }),
  ),

  def(
    MINOR_SYS,
    "19",
    "계수가 순환소수인 연립방정식",
    SEC.여러가지,
    "심화",
    (rng) =>
      attempt(8000, () => {
        const x0 = nonzero(rng, 1, 6);
        const y0 = nonzero(rng, 1, 6);
        // 순환마디는 $9$와 서로소인 숫자만 쓴다. $3$·$6$ 이면 $\dfrac{6}{9}$ 처럼
        // 기약이 아닌 분수가 지면에 나가고, $9$ 면 $0.\overline{9}=1$ 이 되어 버린다.
        const DIGITS = [1, 2, 4, 5, 7, 8] as const;
        // 첫째 식: 0.\dot{p}x + 0.\dot{q}y = c1  ⇔  p·x + q·y = 9c1
        const p = pick(rng, DIGITS);
        const q = pick(rng, DIGITS);
        const t1 = p * x0 + q * y0;
        if (t1 % 9 !== 0) return null;
        const c1 = t1 / 9;
        if (Math.abs(c1) > 12) return null;
        // 둘째 식: i.\dot{r}x ± 0.\dot{q2}y = c2  ⇔  (9i+r)x ± q2·y = 9c2
        // ⚠️ 둘째 식의 $y$ 계수를 정수 $1$ 로 두면 $A_2 x_0 \equiv 0 \pmod 9$ 가 필요한데
        //    $A_2$ 가 $3$ 과 서로소라 $9\mid x_0$ 이 되어 버린다 — 작은 해가 아예 안 나온다.
        const i2 = intBetween(rng, 0, 2);
        const r2 = pick(rng, DIGITS);
        const A2 = 9 * i2 + r2;
        const q2 = pick(rng, DIGITS);
        const s2 = pick(rng, [1, -1] as const);
        const B2 = s2 * q2;
        if (p * B2 - A2 * q === 0) return null;
        const t2 = A2 * x0 + B2 * y0;
        if (t2 % 9 !== 0) return null;
        const c2 = t2 / 9;
        if (Math.abs(c2) > 15) return null;
        const row1 = `0.\\overline{${p}}x+0.\\overline{${q}}y=${c1}`;
        const row2 = `${i2}.\\overline{${r2}}x${s2 > 0 ? "+" : "-"}0.\\overline{${q2}}y=${c2}`;
        // 같은 순환소수가 두 번 나오면 해설에 같은 줄이 두 번 찍힌다 — 한 번만 적는다.
        const conv = [
          ...new Set([
            `$0.\\overline{${p}}=\\dfrac{${p}}{9}$`,
            `$0.\\overline{${q}}=\\dfrac{${q}}{9}$`,
            `$${i2}.\\overline{${r2}}=\\dfrac{${A2}}{9}$`,
            `$0.\\overline{${q2}}=\\dfrac{${q2}}{9}$`,
          ]),
        ].join(", ");
        return {
          content: `연립방정식 $\\begin{cases}${row1}\\\\${row2}\\end{cases}$ 의 해를 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `순환소수를 분수로 고치면 ${conv}이다.\n두 식의 양변에 $9$를 곱하면 $${mc(p, "x")}${sc(q, "y")}=${9 * c1}$, $${mc(A2, "x")}${sc(B2, "y")}=${9 * c2}$이다.\n두 식을 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
          facts: { p, q, c1, i2, r2, A2, q2, s2, B2, c2, x0, y0 },
        };
      }),
  ),

  def(
    MINOR_SYS,
    "20",
    "지수법칙을 이용한 연립방정식",
    SEC.여러가지,
    "심화",
    (rng) =>
      attempt(300, () => {
        const b1 = pick(rng, [2, 3, 5] as const);
        const b2 = pick(rng, [2, 3, 5] as const);
        const y0 = intBetween(rng, 1, 3);
        // 지수 차를 $2$ 이상으로 둔다 — $1$ 이면 해설에 $2^{1}$ 이 나가 지면이 흉하다.
        const x0 = y0 + intBetween(rng, 2, 4);
        const s = x0 + y0;
        const d = x0 - y0;
        if (b1 ** s > 3000 || b2 ** d > 3000) return null;
        return {
          content: `$x$, $y$가 자연수일 때, 두 등식 $${b1}^{x}\\times${b1}^{y}=${b1 ** s}$, $${b2}^{x}\\div${b2}^{y}=${b2 ** d}$ 를 모두 만족시키는 $x$, $y$의 값을 각각 구하시오.`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `지수법칙에 의하여 $${b1}^{x}\\times${b1}^{y}=${b1}^{x+y}$, $${b2}^{x}\\div${b2}^{y}=${b2}^{x-y}$이다.\n$${b1 ** s}=${b1}^{${s}}$, $${b2 ** d}=${b2}^{${d}}$ 이므로 $x+y=${s}$, $x-y=${d}$이다.\n두 식을 연립하여 풀면 $x=${x0}$, $y=${y0}$이다.`,
          facts: { b1, b2, v1: b1 ** s, v2: b2 ** d, s, d, x0, y0 },
        };
      }),
  ),

  // ══ 연립일차방정식의 활용 01~03 (수, 평균, 나이) ═════
  def(MINOR_APPLY, "01", "수에 대한 문제", SEC.수나이, "기본", (rng) =>
    attempt(300, () => {
      const small = intBetween(rng, 3, 20);
      const k = intBetween(rng, 2, 4);
      const r = intBetween(rng, 1, 9);
      const big = k * small - r;
      if (big <= small) return null;
      const S = big + small;
      if (S > 90) return null;
      return {
        content: `두 자연수가 있다. 두 수의 합은 $${S}$이고, 큰 수는 작은 수의 $${k}$배보다 $${r}$만큼 작다고 한다. 두 수 중 큰 수를 구하시오.`,
        answer: `$${big}$`,
        solution: `큰 수를 $x$, 작은 수를 $y$라 하면 $x+y=${S}$, $x=${k}y-${r}$이다.\n둘째 식을 첫째 식에 대입하면 $${k + 1}y=${S + r}$이므로 $y=${small}$이다.\n따라서 $x=${big}$이므로 큰 수는 $${big}$이다.`,
        facts: { S, k, r, big, small },
      };
    }),
  ),

  def(MINOR_APPLY, "02", "자연수에 대한 문제", SEC.수나이, "응용", (rng) =>
    attempt(300, () => {
      const tens = intBetween(rng, 1, 7);
      const units = intBetween(rng, tens + 1, 9);
      const S = tens + units;
      const D = 9 * (units - tens);
      const N = 10 * tens + units;
      let cnt = 0;
      for (let v = 10; v <= 99; v += 1) {
        const a = Math.floor(v / 10);
        const b = v % 10;
        if (a + b === S && 10 * b + a - v === D) cnt += 1;
      }
      if (cnt !== 1) return null;
      return {
        content: `각 자리의 숫자의 합이 $${S}$인 두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $${D}$만큼 크다고 한다. 처음 수를 구하시오.`,
        answer: `$${N}$`,
        solution: `처음 수의 십의 자리의 숫자를 $x$, 일의 자리의 숫자를 $y$라 하면 $x+y=${S}$이다.\n바꾼 수는 $10y+x$이므로 $(10y+x)-(10x+y)=${D}$에서 $9y-9x=${D}$, 곧 $y-x=${units - tens}$이다.\n두 식을 연립하여 풀면 $x=${tens}$, $y=${units}$이므로 처음 수는 $${N}$이다.`,
        facts: { S, D, N, tens, units },
      };
    }),
  ),

  def(MINOR_APPLY, "03", "나이에 대한 문제", SEC.수나이, "응용", (rng) =>
    attempt(400, () => {
      const son = intBetween(rng, 8, 18);
      const father = intBetween(rng, son + 22, son + 38);
      const S = son + father;
      const k = intBetween(rng, 2, 12);
      const m = intBetween(rng, 2, 3);
      const r = m * (son + k) - (father + k);
      if (r < 1 || r > 20) return null;
      return {
        content: `현재 아버지와 아들의 나이의 합은 $${S}$세이다. $${k}$년 후에 아버지의 나이는 아들의 나이의 $${m}$배보다 $${r}$세 적다고 할 때, 현재 아들의 나이를 구하시오.`,
        answer: `$${son}$세`,
        solution: `현재 아버지의 나이를 $x$세, 아들의 나이를 $y$세라 하면 $x+y=${S}$이다.\n$${k}$년 후의 나이에서 $x+${k}=${m}(y+${k})-${r}$이므로 $x-${m}y=${m * k - k - r}$이다.\n두 식을 연립하여 풀면 $x=${father}$, $y=${son}$이므로 현재 아들의 나이는 $${son}$세이다.`,
        facts: { S, k, m, r, son, father },
      };
    }),
  ),

  def(MINOR_APPLY, "01A", "두 수의 합과 차", SEC.수나이, "연산", (rng) => {
    const small = intBetween(rng, 3, 30);
    const difference = intBetween(rng, 2, 18);
    const big = small + difference;
    const sum = big + small;
    return {
      content: `두 자연수의 합은 $${sum}$이고 차는 $${difference}$이다. 두 수 중 큰 수를 구하시오.`,
      answer: `$${big}$`,
      solution: `큰 수를 $x$, 작은 수를 $y$라 하면 $x+y=${sum}$, $x-y=${difference}$이다. 두 식을 변끼리 더하면 $2x=${2 * big}$이므로 큰 수는 $${big}$이다.`,
      facts: { sum, difference, big, small },
    };
  }),

  def(MINOR_APPLY, "02A", "배수 관계인 두 수", SEC.수나이, "기본", (rng) => {
    const small = intBetween(rng, 3, 18);
    const multiple = intBetween(rng, 2, 4);
    const extra = intBetween(rng, 1, 8);
    const big = multiple * small + extra;
    const sum = big + small;
    return {
      content: `두 자연수의 합은 $${sum}$이다. 큰 수는 작은 수의 $${multiple}$배보다 $${extra}$만큼 클 때, 작은 수를 구하시오.`,
      answer: `$${small}$`,
      solution: `큰 수를 $x$, 작은 수를 $y$라 하면 $x+y=${sum}$, $x=${multiple}y+${extra}$이다. 두 식을 연립하면 $${multiple + 1}y=${sum - extra}$이므로 작은 수는 $${small}$이다.`,
      facts: { sum, multiple, extra, big, small },
    };
  }),

  def(MINOR_APPLY, "03A", "두 수의 배수의 합", SEC.수나이, "응용", (rng) => {
    const first = intBetween(rng, 3, 20);
    const second = intBetween(rng, 3, 20);
    const a = intBetween(rng, 2, 4);
    const b = a + intBetween(rng, 1, 3);
    const sum = first + second;
    const weighted = a * first + b * second;
    return {
      content: `두 자연수의 합은 $${sum}$이고, 첫째 수의 $${a}$배와 둘째 수의 $${b}$배의 합은 $${weighted}$이다. 첫째 수를 구하시오.`,
      answer: `$${first}$`,
      solution: `첫째 수를 $x$, 둘째 수를 $y$라 하면 $x+y=${sum}$, $${a}x+${b}y=${weighted}$이다. 두 식을 연립하여 풀면 $x=${first}$, $y=${second}$이므로 첫째 수는 $${first}$이다.`,
      facts: { sum, a, b, weighted, first, second },
    };
  }),

  def(MINOR_APPLY, "04A", "두 집단의 평균", SEC.수나이, "기본", (rng) => {
    const count = intBetween(rng, 4, 12);
    const averageB = intBetween(rng, 55, 85);
    const difference = 2 * intBetween(rng, 2, 8);
    const averageA = averageB + difference;
    const averageAll = (averageA + averageB) / 2;
    return {
      content: `$\mathrm{A}$반과 $\mathrm{B}$반의 학생 수는 각각 $${count}$명이고, 두 반 전체의 평균 점수는 $${averageAll}$점이다. $\mathrm{A}$반의 평균 점수가 $\mathrm{B}$반보다 $${difference}$점 높을 때, $\mathrm{A}$반의 평균 점수를 구하시오.`,
      answer: `$${averageA}$점`,
      solution: `$\mathrm{A}$반과 $\mathrm{B}$반의 평균 점수를 각각 $x$점, $y$점이라 하면 학생 수가 같으므로 $x+y=${2 * averageAll}$이고 $x-y=${difference}$이다. 두 식을 연립하면 $x=${averageA}$이므로 $\mathrm{A}$반의 평균은 $${averageA}$점이다.`,
      facts: { count, averageAll, difference, averageA, averageB },
    };
  }),

  def(
    MINOR_APPLY,
    "05A",
    "전체 평균으로 인원 구하기",
    SEC.수나이,
    "응용",
    (rng) =>
      attempt(400, () => {
        const countA = intBetween(rng, 4, 16);
        const countB = intBetween(rng, 4, 16);
        const averageA = intBetween(rng, 70, 92);
        const averageB = intBetween(rng, 45, 68);
        const total = countA + countB;
        const score = averageA * countA + averageB * countB;
        if (score % total !== 0) return null;
        const averageAll = score / total;
        return {
          content: `평균 점수가 $${averageA}$점인 $\mathrm{A}$모둠과 평균 점수가 $${averageB}$점인 $\mathrm{B}$모둠의 학생은 모두 $${total}$명이고, 전체 평균은 $${averageAll}$점이다. $\mathrm{A}$모둠의 학생 수를 구하시오.`,
          answer: `$${countA}$명`,
          solution: `$\mathrm{A}$모둠과 $\mathrm{B}$모둠의 학생 수를 각각 $x$명, $y$명이라 하면 $x+y=${total}$, $${averageA}x+${averageB}y=${averageAll * total}$이다. 두 식을 연립하여 풀면 $x=${countA}$, $y=${countB}$이므로 $\mathrm{A}$모둠은 $${countA}$명이다.`,
          facts: { countA, countB, averageA, averageB, total, averageAll },
        };
      }),
  ),

  def(MINOR_APPLY, "06A", "몇 년 후의 나이", SEC.수나이, "기본", (rng) => {
    const son = intBetween(rng, 7, 16);
    const years = intBetween(rng, 3, 9);
    const multiple = intBetween(rng, 2, 3);
    const father = multiple * (son + years) - years;
    const difference = father - son;
    return {
      content: `현재 아버지와 아들의 나이 차는 $${difference}$세이다. $${years}$년 후 아버지의 나이가 아들의 나이의 $${multiple}$배가 될 때, 현재 아들의 나이를 구하시오.`,
      answer: `$${son}$세`,
      solution: `현재 아버지의 나이를 $x$세, 아들의 나이를 $y$세라 하면 $x-y=${difference}$이고 $x+${years}=${multiple}(y+${years})$이다. 두 식을 연립하여 풀면 $y=${son}$이므로 현재 아들의 나이는 $${son}$세이다.`,
      facts: { son, father, years, multiple, difference },
    };
  }),

  def(MINOR_APPLY, "07A", "몇 년 전의 나이", SEC.수나이, "심화", (rng) =>
    attempt(300, () => {
      const younger = intBetween(rng, 10, 18);
      const older = intBetween(rng, younger + 2, younger + 10);
      const years = intBetween(rng, 2, Math.min(7, younger - 2));
      const multiple = intBetween(rng, 2, 3);
      const extra = older - years - multiple * (younger - years);
      if (extra < 1 || extra > 12) return null;
      const sum = older + younger;
      return {
        content: `현재 형과 동생의 나이의 합은 $${sum}$세이다. $${years}$년 전 형의 나이는 동생의 나이의 $${multiple}$배보다 $${extra}$세 많았다. 현재 형의 나이를 구하시오.`,
        answer: `$${older}$세`,
        solution: `현재 형과 동생의 나이를 각각 $x$세, $y$세라 하면 $x+y=${sum}$이고 $x-${years}=${multiple}(y-${years})+${extra}$이다. 두 식을 연립하여 풀면 $x=${older}$, $y=${younger}$이므로 현재 형의 나이는 $${older}$세이다.`,
        facts: { older, younger, years, multiple, extra, sum },
      };
    }),
  ),

  // ══ 연립일차방정식의 활용 04~08 (가격, 개수, 증감, 도형) ══
  def(MINOR_APPLY, "04", "가격 개수에 대한 문제", SEC.가격도형, "기본", (rng) =>
    attempt(300, () => {
      const p = pick(rng, [500, 700, 800, 900, 1200] as const);
      // 두 풀은 서로소라 $p\ne q$ 가 보장된다 — 그래서 계수 행렬식이 0 이 아니다.
      const q = pick(rng, [300, 400, 600, 1000, 1500] as const);
      const na = intBetween(rng, 3, 12);
      const nb = intBetween(rng, 3, 12);
      const N = na + nb;
      const T = p * na + q * nb;
      return {
        content: `한 개에 $${p}$원인 사과와 한 개에 $${q}$원인 배를 합하여 $${N}$개를 사고 $${T}$원을 지불하였다. 사과는 몇 개 샀는지 구하시오.`,
        answer: `$${na}$개`,
        solution: `사과를 $x$개, 배를 $y$개 샀다고 하면 $x+y=${N}$, $${p}x+${q}y=${T}$이다.\n첫째 식에 $${q}$${eulReul(q)} 곱하여 둘째 식에서 빼면 $${p - q}x=${T - q * N}$이므로 $x=${na}$이다.\n따라서 사과는 $${na}$개 샀다.`,
        facts: { p, q, N, T, na, nb },
      };
    }),
  ),

  def(MINOR_APPLY, "05", "도형에 대한 문제", SEC.가격도형, "기본", (rng) =>
    attempt(200, () => {
      const h = intBetween(rng, 3, 20);
      const d = intBetween(rng, 1, 12);
      const w = h + d;
      const L = 2 * (w + h);
      return {
        content: `둘레의 길이가 $${L}\\,\\mathrm{cm}$인 직사각형이 있다. 가로의 길이가 세로의 길이보다 $${d}\\,\\mathrm{cm}$ 더 길 때, 가로의 길이를 구하시오.`,
        answer: `$${w}\\,\\mathrm{cm}$`,
        solution: `가로의 길이를 $x\\,\\mathrm{cm}$, 세로의 길이를 $y\\,\\mathrm{cm}$라 하면 $2(x+y)=${L}$에서 $x+y=${w + h}$이다.\n또 $x-y=${d}$이므로 두 식을 변끼리 더하면 $2x=${2 * w}$이다.\n따라서 가로의 길이는 $${w}\\,\\mathrm{cm}$이다.`,
        facts: { L, d, w, h },
      };
    }),
  ),

  def(MINOR_APPLY, "06", "득점 감점에 대한 문제", SEC.가격도형, "응용", (rng) =>
    attempt(200, () => {
      const N = pick(rng, [15, 20, 25, 30] as const);
      const p = intBetween(rng, 3, 6);
      const q = intBetween(rng, 1, 3);
      const right = intBetween(rng, 5, N - 3);
      const wrong = N - right;
      const T = p * right - q * wrong;
      if (T <= 0) return null;
      return {
        content: `$${N}$개의 문제가 출제된 시험에서 한 문제를 맞히면 $${p}$점을 얻고, 틀리면 $${q}$점을 잃는다. 이 시험에서 $${T}$점을 얻었을 때, 맞힌 문제는 몇 개인지 구하시오. (단, 모든 문제에 답하였다.)`,
        answer: `$${right}$개`,
        solution: `맞힌 문제를 $x$개, 틀린 문제를 $y$개라 하면 $x+y=${N}$, $${mc(p, "x")}${sc(-q, "y")}=${T}$이다.\n${q === 1 ? "두 식을 변끼리 더하면" : `첫째 식에 $${q}$${eulReul(q)} 곱하여 둘째 식에 더하면`} $${p + q}x=${T + q * N}$이므로 $x=${right}$이다.\n따라서 맞힌 문제는 $${right}$개이다.`,
        facts: { N, p, q, T, right, wrong },
      };
    }),
  ),

  def(MINOR_APPLY, "07", "증가 감소에 대한 문제", SEC.가격도형, "심화", (rng) =>
    attempt(400, () => {
      const a = pick(rng, [4, 5, 6, 8, 10, 20] as const);
      const b = pick(rng, [4, 5, 6, 8, 10, 20] as const);
      const km = intBetween(rng, 2, 5);
      const kf = intBetween(rng, 2, 5);
      const male = 100 * km;
      const female = 100 * kf;
      const T = male + female;
      const d = a * km - b * kf;
      if (d === 0) return null;
      const nowMale = km * (100 + a);
      const word = d > 0 ? "늘었다" : "줄었다";
      return {
        content: `어느 중학교의 작년 전체 학생은 $${T}$명이었다. 올해는 작년에 비하여 남학생이 $${a}\\%$ 증가하고 여학생이 $${b}\\%$ 감소하여 전체 학생이 $${Math.abs(d)}$명 ${word}. 올해의 남학생 수를 구하시오.`,
        answer: `$${nowMale}$명`,
        solution: `작년의 남학생을 $x$명, 여학생을 $y$명이라 하면 $x+y=${T}$이다.\n전체 학생의 증감에서 $\\dfrac{${a}}{100}x-\\dfrac{${b}}{100}y=${d}$이므로 $${a}x-${b}y=${100 * d}$이다.\n두 식을 연립하여 풀면 $x=${male}$, $y=${female}$이다.\n작년의 남학생 $${male}$명이 $${a}\\%$ 늘었으므로 올해의 남학생은 $${male}+${(a * male) / 100}=${nowMale}$(명)이다.`,
        facts: { T, a, b, d, male, female, nowMale },
      };
    }),
  ),

  def(MINOR_APPLY, "08", "원가 정가에 대한 문제", SEC.가격도형, "심화", (rng) =>
    attempt(400, () => {
      const a = pick(rng, [5, 10, 15, 20, 25, 30] as const);
      const b = pick(rng, [5, 10, 15, 20, 25, 30] as const);
      if (a === b) return null;
      const x = 100 * intBetween(rng, 20, 120);
      const y = 100 * intBetween(rng, 20, 120);
      const T = x + y;
      const P = (a * x + b * y) / 100;
      if (!Number.isInteger(P)) return null;
      return {
        content: `두 상품 $\\mathrm{A}$, $\\mathrm{B}$의 원가의 합은 $${T}$원이다. 상품 $\\mathrm{A}$는 원가의 $${a}\\%$, 상품 $\\mathrm{B}$는 원가의 $${b}\\%$의 이익을 붙여 정가를 정하고 두 상품을 모두 팔았더니 전체 이익이 $${P}$원이었다. 상품 $\\mathrm{A}$의 원가를 구하시오.`,
        answer: `$${x}$원`,
        solution: `상품 $\\mathrm{A}$, $\\mathrm{B}$의 원가를 각각 $x$원, $y$원이라 하면 $x+y=${T}$이다.\n이익에서 $\\dfrac{${a}}{100}x+\\dfrac{${b}}{100}y=${P}$이므로 $${a}x+${b}y=${100 * P}$이다.\n두 식을 연립하여 풀면 $x=${x}$, $y=${y}$이다.\n따라서 상품 $\\mathrm{A}$의 원가는 $${x}$원이다.`,
        facts: { T, a, b, P, x, y },
      };
    }),
  ),
];

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
