/**
 * 중1 **3차 확대 갈래**(`m1Top3.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `51V` | $q=\mathrm{lcm}(d_1,d_2)$, $p=\gcd(n_1,n_2)$ (공배수·공약수 개념) | 분모 $P$ 와 분자 $Q$ 를 **전수로 훑어** 두 곱이 모두 자연수인 기약분수 $\dfrac{Q}{P}$ 중 **값이 가장 작은 것**을 찾는다 — 최소공배수·최대공약수를 한 번도 안 쓴다 |
 * | `52V` | 창의 양 끝을 $\lceil\cdot\rceil$·$\lfloor\cdot\rfloor$ 로 얻는다 | $a$ 를 $-600$ 부터 $600$ 까지 **전부 대입해** $ax_0$ 이 두 $y$좌표 사이인지 본다 — 나눗셈을 한 번도 안 한다 |
 * | `53V` | 마지막 상자 개수를 닫힌 식 $(an+b)-c(n-1)$ 로 얻는다 | 상자를 **하나씩 채우는 되풀이**로 흉내 내어(모자라면 그때 멈춘다) 마지막에 남는 것을 센다 |
 * | `54V` | $b$ 를 훑으며 $T-qb$ 가 $p$ 의 배수인지 나눗셈으로 본다 | $a$ 와 $b$ 를 **둘 다 훑어** $pa+qb=T$ 인 쌍을 곱셈으로 찾는다 |
 *
 * ## 🔴 2차 물결이 흘린 치명 결함(㉮)을 여기서 어떻게 막나
 *
 * 2차는 해설이 「$x=9$일 때는 $9$가 남는다」고 썼는데 참이 $3$ 이었고, **바로 윗줄과
 * 스스로 모순**이었다. 11/12 유형에 그 축이 **아예 없어서** 통과했다. 「해설에 이
 * 문자열이 있나」(`toContain`)는 마지막 줄 하나로 충족되므로 가드가 아니다.
 *
 * 그래서 네 겹으로 잰다.
 *  ⑴ **해설의 모든 산술 등식을 파싱해 좌·우를 유리수로 각각 계산한다**
 *     (`arithmeticEquationFailures`). 최소공배수 공식을 옮겨 적는 게 아니라 **산술을
 *     하는 것**이라 동어반복이 아니다.
 *  ⑵ **해설에 나온 모든 수가 재계산으로 설명되는지** 센다(`EXPLAINED`, 미설명 수 0).
 *     ㉮ 의 `9` 는 어떤 재계산값과도 안 맞으므로 이 축에 걸린다.
 *  ⑶ 후보를 견주는 갈래(`53V`·`54V`)는 **나열 줄마다 세 수와 판정을 각각 다시 셈해**
 *     맞댄다. 까닭이 뒤바뀌어도 결론은 같을 수 있으므로 **까닭까지** 본다
 *     (「$c$개보다 적지 않다」 ↔ 「빈 상자가 생긴다」).
 *  ⑷ 「모두」라는 주장을 **반대쪽 모집단으로 반증 시도**한다 — 훑은 범위 밖까지 전수로
 *     돌려 해설이 적은 집합과 **정확히 같은지** 본다(빠짐 0 · 군더더기 0).
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이
 * 넷을 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 —
 * 그래서 `build()` 가 제품의 후처리 **함수 자체**를 그대로 부르고, 등록되면 곧바로
 * `generateMiddleProblem` 으로 갈아탄다(`m1Top2` 시험이 선 자리와 같다).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { bareNumbers } from "@/lib/elementary/rules";
import { createRng } from "@/lib/elementary/rng";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { estimateSolutionPx } from "@/lib/printOverflow";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  boxCountsLeavingLast,
  factorTex,
  integersMeetingSegment,
  lastBToCheck,
  lcm,
  looseBoxCounts,
  M1_TOP_3,
  primeFactors,
  scorePairs,
  smallestMultiplierFraction,
  swappedMultiplierAnswer,
  upperOnlySum,
} from "@/lib/middle/m1Top3";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem } from "@/lib/middle/types";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";

// 🔴 남의 자를 **그대로 import** 한다 — 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
import { isThin } from "../../../scripts/qa/probe-middle-solution-depth";
import {
  AXES,
  koreanJaccard,
  numAnswerJaccard,
  obviousCandidates,
  pageNumbers,
} from "../../../scripts/qa/probe-middle-top-m1";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, numVowelFinal, pageSmells } from "../helpers/midPage";

const K51 = "1-1|최대공약수와 최소공배수|51V";
const K52 = "1-1|정비례와 반비례|52V";
const K53 = "1-1|일차방정식의 활용|53V";
const K54 = "1-1|일차방정식의 활용|54V";
const KEYS = [K51, K52, K53, K54] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K51]: "심화중",
  [K52]: "심화중",
  [K53]: "심화상",
  [K54]: "심화상",
};

const SEEDS = [20260902, 3, 11, 515151, 99991];
const VARIANTS = 4;
/** 판정기(`probe-middle-top-m1.ts`)가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
const OVERLAP_SEED = 20260827;

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판** (브리프가 요구한 $200$ 이상). */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < VARIANTS; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_3.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 3차 ${key}`);
  assertChoiceCount(content, `중1 3차 ${key}`);
  assertChoiceMarks(content, `중1 3차 ${key}`);
  return {
    ...p,
    content,
    solution: tidySolution(p.solution),
    difficulty: resolveMiddleTier(p.difficulty, content, !!p.figureSpec),
  };
}

// ── 소품 ────────────────────────────────────────────────────

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, content: string, who: string): string[] {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${content}`);
  return m.slice(1);
}

const num = (s: string): number => Number(s);

function answerNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (m === null) throw new Error(`답에 수가 없다: ${text}`);
  return Number(m[0]);
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function lcm2(a: number, b: number): number {
  return Math.abs((a / gcd2(a, b)) * b);
}

/**
 * 우리말 수관형사 — 생성기의 `koreanCount` 를 **여기 다시 적는다.**
 *
 * 🔴 가져다 쓰면 동어반복이라 아무것도 안 지킨다. 검증이 「셈말이 개수와 맞나」를
 * 재는데 그 셈말을 생성기에서 가져오면 늘 맞는다 — 2026-09-02 검증에서 실제로
 * `koreanCount(n)` 를 `koreanCount(n-1)` 로 바꾼 변이가 **92/92 초록**이었다.
 */
const COUNT_WORD: Record<number, string> = {
  3: "세",
  4: "네",
  5: "다섯",
  6: "여섯",
  7: "일곱",
  8: "여덟",
};

/** 목록 글자(`$3$, $4$, $5$`)에서 수를 읽는다. */
function readList(listTex: string): number[] {
  return [...listTex.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
}

/**
 * 🔴 **수 뒤 주격 조사 「이/가」** — 공용 `josaMismatches` 가 **못 보는 사각**이다.
 *
 * 그 자는 「이」를 `JOSA_PAIR` 에 넣지 않는다(서술격 「$5$이다」와 안 갈려서
 * 거짓 경보가 쏟아진다 — 그 파일 주석에 적혀 있다). 그래서 「가를 써야 할 자리에
 * 이를 썼다」는 **구조적으로 0** 이다. 여기서는 조사가 붙는 **자리를 못 박아**
 * 그 사각을 메운다 — 뒤에 오는 말이 정해져 있으므로 서술격과 헷갈릴 일이 없다.
 *
 * 받침 판정은 `midPage.numVowelFinal`(시험 쪽 규칙)에서 온다 — 생성기의
 * `m2Josa` 를 부르면 동어반복이다.
 */
function subjectJosaFor(n: number): "이" | "가" {
  return numVowelFinal(n) ? "가" : "이";
}

/** 목적격 조사 「을/를」 — 위와 같은 까닭으로 자리를 못 박아 잰다. */
function objectJosaFor(n: number): "을" | "를" {
  return numVowelFinal(n) ? "를" : "을";
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 *
 * 값 검산도 냄새 자도 이 축을 못 본다: 없는 명령이나 날 LaTeX 는 **값이 맞고
 * 냄새 목록에도 없다.** 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로
 * 렌더해서** 한다.
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

// ── 🔴 해설의 산술 등식을 **직접 계산**하는 자 (㉮ ⑴) ──────────────

type Rat = { n: number; d: number };

function ratOf(n: number, d = 1): Rat {
  if (d === 0) throw new Error("유리수의 분모가 $0$ 이다");
  const s = d < 0 ? -1 : 1;
  const g = gcd2(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}
const ratAdd = (a: Rat, b: Rat): Rat => ratOf(a.n * b.d + b.n * a.d, a.d * b.d);
const ratSub = (a: Rat, b: Rat): Rat => ratOf(a.n * b.d - b.n * a.d, a.d * b.d);
const ratMul = (a: Rat, b: Rat): Rat => ratOf(a.n * b.n, a.d * b.d);
const ratDiv = (a: Rat, b: Rat): Rat => ratOf(a.n * b.d, a.d * b.n);
const ratEq = (a: Rat, b: Rat): boolean => a.n * b.d === b.n * a.d;

/**
 * 지면 수식 한 도막을 **유리수로 계산한다.**
 *
 * 다루는 것: 정수 · `+` · `-` · `\times` · `\div` · `\dfrac{}{}` · `\left(\right)` ·
 * `()` · `^{k}`. 그 밖의 글자가 있으면 **던진다** — 조용히 넘기면 못 센 자리가
 * 「깨끗」으로 읽힌다.
 */
export function evalTex(src: string): Rat {
  let i = 0;
  const ws = (): void => {
    while (i < src.length && src[i] === " ") i += 1;
  };
  const eat = (s: string): void => {
    ws();
    if (!src.startsWith(s, i)) {
      throw new Error(`«${s}» 가 있어야 하는데 «${src.slice(i, i + 8)}» 이다`);
    }
    i += s.length;
  };
  function primary(): Rat {
    ws();
    for (const cmd of ["\\dfrac{", "\\frac{"]) {
      if (src.startsWith(cmd, i)) {
        i += cmd.length;
        const a = expr();
        eat("}");
        eat("{");
        const b = expr();
        eat("}");
        return ratDiv(a, b);
      }
    }
    if (src.startsWith("\\left(", i)) {
      i += 6;
      const v = expr();
      eat("\\right)");
      return v;
    }
    if (src[i] === "(") {
      i += 1;
      const v = expr();
      eat(")");
      return v;
    }
    if (/\d/.test(src[i] ?? "")) {
      let s = "";
      while (/\d/.test(src[i] ?? "")) {
        s += src[i];
        i += 1;
      }
      return ratOf(Number(s));
    }
    throw new Error(`읽을 수 없는 글자: «${src.slice(i, i + 10)}»`);
  }
  function unary(): Rat {
    ws();
    if (src[i] === "-") {
      i += 1;
      const v = unary();
      return ratOf(-v.n, v.d);
    }
    return primary();
  }
  function power(): Rat {
    let v = unary();
    ws();
    if (src[i] === "^") {
      i += 1;
      let e = "";
      if (src[i] === "{") {
        const j = src.indexOf("}", i);
        if (j < 0) throw new Error("지수의 중괄호가 안 닫혔다");
        e = src.slice(i + 1, j);
        i = j + 1;
      } else {
        while (/\d/.test(src[i] ?? "")) {
          e += src[i];
          i += 1;
        }
      }
      const k = Number(e);
      if (!Number.isInteger(k) || k < 0)
        throw new Error(`지수가 이상하다: ${e}`);
      let r = ratOf(1);
      for (let t = 0; t < k; t += 1) r = ratMul(r, v);
      v = r;
    }
    return v;
  }
  function term(): Rat {
    let v = power();
    for (;;) {
      ws();
      if (src.startsWith("\\times", i)) {
        i += 6;
        v = ratMul(v, power());
      } else if (src.startsWith("\\div", i)) {
        i += 4;
        v = ratDiv(v, power());
      } else break;
    }
    return v;
  }
  function expr(): Rat {
    let v = term();
    for (;;) {
      ws();
      if (src[i] === "+") {
        i += 1;
        v = ratAdd(v, term());
      } else if (src[i] === "-") {
        i += 1;
        v = ratSub(v, term());
      } else break;
    }
    return v;
  }
  const out = expr();
  ws();
  if (i !== src.length) throw new Error(`남은 글자: «${src.slice(i)}»`);
  return out;
}

/**
 * 「글자가 하나도 없는 순수 산술」인가 — 아니면 이 자가 판정하지 않는다.
 *
 * ⚠️ 명령 이름을 지운 **뒤에** 글자가 남으면 문자식이다(`$p+q$`·`$b=1$`).
 *    그것까지 계산하려 들면 거짓 빨강이 난다.
 */
function isPureArithmetic(body: string): boolean {
  const stripped = body.replace(/\\(dfrac|frac|times|div|left|right)/g, "");
  return !/[A-Za-z\\]/.test(stripped);
}

/** 해설에서 **좌우가 안 맞는 산술 등식**을 모은다. 없으면 빈 배열. */
export function arithmeticEquationFailures(text: string): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const body = m[1]!;
    if (!body.includes("=")) continue;
    if (!isPureArithmetic(body)) continue;
    const parts = body.split("=");
    try {
      const vals = parts.map((p) => evalTex(p));
      for (let k = 1; k < vals.length; k += 1) {
        if (!ratEq(vals[0]!, vals[k]!)) bad.push(body);
      }
    } catch (err) {
      bad.push(`${body} — ${(err as Error).message}`);
    }
  }
  return bad;
}

/** 해설에 찍힌 모든 자연수 (지수 안의 수까지). */
function solutionNumbers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

/**
 * `51V` — **최소공배수·최대공약수를 한 번도 쓰지 않고** 가장 작은 분수를 찾는다.
 *
 * 분모 $P$ 를 $1$ 부터 두 분자의 작은 쪽까지, 분자 $Q$ 를 $1$ 부터 $d_1d_2$ 까지 훑어
 * 두 곱이 모두 자연수인 기약분수 중 **값이 가장 작은 것**을 고른다.
 */
function smallestByBruteForce(
  n1: number,
  d1: number,
  n2: number,
  d2: number,
): { p: number; q: number } {
  let best: { p: number; q: number } | null = null;
  const capQ = d1 * d2;
  for (let P = 1; P <= Math.min(n1, n2); P += 1) {
    for (let Q = 1; Q <= capQ; Q += 1) {
      if (gcd2(Q, P) !== 1) continue;
      if ((n1 * Q) % (d1 * P) !== 0) continue;
      if ((n2 * Q) % (d2 * P) !== 0) continue;
      if (best === null || Q * best.p < best.q * P) best = { p: P, q: Q };
      break; // 이 $P$ 에서는 이보다 작은 $Q$ 가 없다
    }
  }
  if (best === null) throw new Error("51V: 조건을 만족하는 분수를 못 찾았다");
  return best;
}

const RE51 =
  /^두 분수 \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$ 중 어느 것에 곱하여도 그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 \$\\dfrac\{q\}\{p\}\$라 할 때, \$p\+q\$의 값을 구하시오\. \(단, \$p\$, \$q\$는 서로소인 자연수이다\.\)$/;

const RE52 =
  /^좌표평면 위에 두 점 \$\\mathrm\{A\}\((\d+), (\d+)\)\$, \$\\mathrm\{B\}\((\d+), (\d+)\)\$[이가] 있다\. 정비례 관계 \$y=ax\$의 그래프가 두 점을 이은 선분 \$\\mathrm\{AB\}\$와 만나도록 하는 정수 \$a\$의 값을 모두 더한 값을 구하시오\.$/;

const RE53 =
  /^과자를 여러 개의 상자에 나누어 담으려고 한다\. 한 상자에 \$(\d+)\$개씩 담으면 \$(\d+)\$개가 남고, 한 상자에 \$(\d+)\$개씩 담으면 마지막 한 상자에만 \$(\d+)\$개보다 적게 담기고 빈 상자는 생기지 않는다\. 조건에 맞는 상자의 개수를 모두 찾아 그 합을 구하시오\.$/;

const RE54 =
  /^\$(\d+)\$점짜리 문제와 \$(\d+)\$점짜리 문제로만 이루어진 시험이 있다\. 어떤 학생이 두 가지 문제를 각각 적어도 한 문제씩 맞혀 \$(\d+)\$점을 받았을 때, 이 학생이 맞힌 \$(\d+)\$점짜리 문제의 개수가 될 수 있는 값을 모두 더한 값을 구하시오\.$/;

/** `51V` 지면에서 읽은 네 수. */
function read51(content: string): {
  n1: number;
  d1: number;
  n2: number;
  d2: number;
} {
  const [a, b, c, d] = grab(RE51, content, "51V");
  return { n1: num(a!), d1: num(b!), n2: num(c!), d2: num(d!) };
}

/** `52V` 지면에서 읽은 세 수. */
function read52(content: string): { x0: number; yA: number; yB: number } {
  const [x1, ya, x2, yb] = grab(RE52, content, "52V");
  if (num(x1!) !== num(x2!)) {
    throw new Error("52V: 두 점의 $x$좌표가 달라 세로 선분이 아니다");
  }
  return { x0: num(x1!), yA: num(ya!), yB: num(yb!) };
}

/** `53V` 지면에서 읽은 세 수. */
function read53(content: string): { a: number; b: number; c: number } {
  const [a, b, c, c2] = grab(RE53, content, "53V");
  if (num(c!) !== num(c2!)) {
    throw new Error(
      "53V: 둘째 조건의 두 수가 달라 「마지막 한 상자」가 안 정해진다",
    );
  }
  return { a: num(a!), b: num(b!), c: num(c!) };
}

/** `54V` 지면에서 읽은 세 수. */
function read54(content: string): { p: number; q: number; t: number } {
  const [p, q, t, p2] = grab(RE54, content, "54V");
  if (num(p!) !== num(p2!)) {
    throw new Error("54V: 묻는 배점과 첫 배점이 다르다");
  }
  return { p: num(p!), q: num(q!), t: num(t!) };
}

/** `53V` — 닫힌 식을 안 쓰고 **상자를 하나씩 채워** 마지막에 남는 것을 센다. */
function simulateLastBox(
  a: number,
  b: number,
  c: number,
  n: number,
): { total: number; last: number; ranOut: boolean } {
  const total = a * n + b;
  let rest = total;
  let ranOut = false;
  for (let i = 0; i < n - 1; i += 1) {
    if (rest < c) {
      ranOut = true;
      rest = 0;
      break;
    }
    rest -= c;
  }
  return { total, last: rest, ranOut };
}

const VERIFY: Record<string, (content: string) => number> = {
  [K51]: (content) => {
    const { n1, d1, n2, d2 } = read51(content);
    // 지면의 두 분수는 기약 진분수여야 한다 — 아니면 아래 이론이 통째로 달라진다.
    if (gcd2(n1, d1) !== 1 || gcd2(n2, d2) !== 1) {
      throw new Error("51V: 지면의 분수가 기약분수가 아니다");
    }
    if (n1 >= d1 || n2 >= d2) throw new Error("51V: 진분수가 아니다");
    if (n1 === n2 && d1 === d2) throw new Error("51V: 두 분수가 같다");
    const best = smallestByBruteForce(n1, d1, n2, d2);
    if (gcd2(best.q, best.p) !== 1) {
      throw new Error(
        "51V: 답이 기약분수가 아니라 발문의 「서로소」가 거짓이다",
      );
    }
    // ㉯ $p=1$ 이면 지면에 $\dfrac{q}{1}$ 이 나온다.
    if (best.p < 2) throw new Error("51V: 곱할 분수의 분모가 $1$ 이다");
    const x = best.p + best.q;
    // 🔴 ㉠ 「분자에 최대공약수, 분모에 최소공배수」로 뒤집어 푼 답과 같으면 두 학생을 못 가른다.
    if (swappedMultiplierAnswer(n1, d1, n2, d2) === x) {
      throw new Error("51V: 뒤집어 푼 답이 참 답과 같다");
    }
    if (n1 + d1 === x || n2 + d2 === x) {
      throw new Error("51V: 한 분수만 읽고 멈춘 답이 참 답과 같다");
    }
    return x;
  },

  [K52]: (content) => {
    const { x0, yA, yB } = read52(content);
    if (x0 <= 0 || yA <= 0) throw new Error("52V: 창이 모두 양수가 아니다");
    if (yB <= yA) throw new Error("52V: 두 점의 위아래가 뒤집혔다");
    if (yA % x0 === 0 || yB % x0 === 0) {
      throw new Error(
        "52V: 창의 끝이 정수라 「경계가 포함되나」 시비가 생긴다",
      );
    }
    // 🔴 나눗셈을 한 번도 안 한다 — $a$ 를 전부 대입해 본다.
    const ints: number[] = [];
    for (let a = -600; a <= 600; a += 1) {
      const y = a * x0;
      if (y >= yA && y <= yB) ints.push(a);
    }
    if (ints.length < 4 || ints.length > 7) {
      throw new Error(
        `52V: 창 안의 정수가 ${ints.length} 개다 (넷~일곱이어야 한다)`,
      );
    }
    if (ints[0]! < 2) throw new Error("52V: 창이 $2$ 보다 작은 정수를 품는다");
    const x = ints.reduce((s, v) => s + v, 0);
    // 🔴 ㉠ 답이 후보 전부의 합이라 목록의 어느 자리도 답이 될 수 없다.
    if (ints.includes(x)) throw new Error("52V: 답이 후보 목록 안에 있다");
    let loose = 0;
    for (let a = 1; a * x0 <= yB; a += 1) loose += a;
    if (loose === x) {
      throw new Error(
        "52V: 아래 끝을 안 읽어도 답이 같다 (굳힘의 절반이 장식)",
      );
    }
    return x;
  },

  [K53]: (content) => {
    const { a, b, c } = read53(content);
    if (a >= c) {
      throw new Error("53V: 나중 개수가 더 작아 조건에 맞는 상자 수가 없다");
    }
    const alive: number[] = [];
    let loose = 0;
    for (let n = 1; n <= 500; n += 1) {
      const s = simulateLastBox(a, b, c, n);
      if (!s.ranOut && s.last >= 1) loose += n;
      if (!s.ranOut && s.last >= 1 && s.last <= c - 1) alive.push(n);
    }
    if (alive.length < 3 || alive.length > 5) {
      throw new Error(`53V: 살아남는 상자 수가 ${alive.length} 가지다`);
    }
    if (alive[0]! < 2) {
      throw new Error(
        "53V: 상자가 하나뿐인 경우가 살아남아 「마지막 한 상자」가 뜻을 잃는다",
      );
    }
    const x = alive.reduce((s, v) => s + v, 0);
    if (alive.includes(x)) throw new Error("53V: 답이 후보 목록 안에 있다");
    if (loose === x) {
      throw new Error("53V: 「마지막 한 상자에만」을 안 읽어도 답이 같다");
    }
    return x;
  },

  [K54]: (content) => {
    const { p, q, t } = read54(content);
    if (p >= q) throw new Error("54V: 배점의 앞뒤가 뒤집혔다");
    // 🔴 나눗셈을 안 한다 — $a$, $b$ 를 둘 다 훑어 곱셈으로 찾는다.
    const found: { a: number; b: number }[] = [];
    for (let b = 1; b * q < t; b += 1) {
      for (let a = 1; a * p + b * q <= t; a += 1) {
        if (a * p + b * q === t) found.push({ a, b });
      }
    }
    if (found.length < 3 || found.length > 5) {
      throw new Error(`54V: 해가 ${found.length} 가지다 (셋~다섯이어야 한다)`);
    }
    // 🔴 ㉡ 「$p$ 의 배수인가」가 한 번은 «아니오» 를 내야 한다 — $p\mid q$ 이면 안 그렇다.
    const alive = new Set(found.map((k) => k.b));
    let dead = 0;
    for (let b = 1; b <= lastBToCheck(p, q, t); b += 1)
      if (!alive.has(b)) dead += 1;
    if (dead === 0) {
      throw new Error(
        "54V: 훑는 모든 $b$ 가 살아남아 배수 판정이 아무 일도 안 한다",
      );
    }
    const x = found.reduce((s, k) => s + k.a, 0);
    if (found.some((k) => k.a === x))
      throw new Error("54V: 답이 후보 목록 안에 있다");
    const first = found.reduce((m, k) => (k.b < m.b ? k : m), found[0]!);
    if (first.a === x) throw new Error("54V: 첫 해에서 멈춘 값이 참 답과 같다");
    return x;
  },
};

// ── 🔴 해설에 나온 수가 **전부 설명되는가** (㉮ ⑵) ─────────────────

/** 지면에서 읽은 수만으로 «해설에 나와도 되는 수»를 다시 만든다. `facts` 를 안 본다. */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K51]: (content) => {
    const { n1, d1, n2, d2 } = read51(content);
    const best = smallestByBruteForce(n1, d1, n2, d2);
    const out = new Set<number>([
      n1,
      d1,
      n2,
      d2,
      best.p,
      best.q,
      best.p + best.q,
      (n1 * best.q) / (d1 * best.p),
      (n2 * best.q) / (d2 * best.p),
    ]);
    for (const v of [n1, d1, n2, d2, best.p, best.q]) {
      for (const [pr, ex] of primeFactors(v)) {
        out.add(pr);
        out.add(ex);
      }
    }
    return out;
  },
  [K52]: (content) => {
    const { x0, yA, yB } = read52(content);
    const out = new Set<number>([x0, yA, yB]);
    // 🔴 창의 양 끝은 **기약분수**로 그린다(2026-09-02). 약분한 분자·분모가
    //    지면에 새로 나오므로 여기에 같이 적는다 — 안 적으면 이 축이
    //    「고친 것」을 결함으로 신고한다.
    for (const y of [yA, yB]) {
      const g = gcd2(y, x0);
      out.add(y / g);
      out.add(x0 / g);
    }
    for (const a of integersMeetingSegment(x0, yA, yB)) out.add(a);
    out.add(integersMeetingSegment(x0, yA, yB).reduce((s, v) => s + v, 0));
    return out;
  },
  [K53]: (content) => {
    const { a, b, c } = read53(content);
    const out = new Set<number>([a, b, c, c - 1, 1]);
    const alive = boxCountsLeavingLast(a, b, c);
    for (const n of alive) out.add(n);
    out.add(alive.reduce((s, v) => s + v, 0));
    // 🔴 훑기는 $n=2$ 부터다 — 발문의 「여러 개의 상자」가 $n=1$ 을 이미 뺐다.
    for (let n = 2; n <= alive[alive.length - 1]! + 1; n += 1) {
      out.add(n);
      out.add(n - 1);
      const s = simulateLastBox(a, b, c, n);
      out.add(s.total);
      out.add(c * (n - 1));
      if (!s.ranOut) out.add(s.last);
    }
    return out;
  },
  [K54]: (content) => {
    const { p, q, t } = read54(content);
    const out = new Set<number>([p, q, t, 1]);
    const stop = lastBToCheck(p, q, t) + 1;
    out.add(stop);
    out.add(q * stop);
    let sum = 0;
    for (let b = 1; b <= stop - 1; b += 1) {
      out.add(b);
      out.add(q * b);
      const rest = t - q * b;
      out.add(rest);
      if (rest % p === 0) {
        out.add(rest / p);
        sum += rest / p;
      }
    }
    out.add(sum);
    return out;
  },
};

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/**
 * 양성: 답을 아는 지면에서 그 답을 낸다.
 *
 * 손 계산 —
 * `51V`: $\dfrac{18}{35}$, $\dfrac{24}{49}$ → $q=\mathrm{lcm}(35,49)=245$,
 *        $p=\gcd(18,24)=6$ → $6+245=251$. 검산 $\frac{18}{35}\cdot\frac{245}{6}=21$,
 *        $\frac{24}{49}\cdot\frac{245}{6}=20$ 으로 둘 다 자연수.
 * `52V`: $\mathrm{A}(2,3)$, $\mathrm{B}(2,15)$ → $2a$ 가 $3$~$15$ → $a$ 는 $2$~$7$ → $27$.
 * `53V`: $a=5$, $b=8$, $c=7$ → 마지막 상자는 $15-2n$ 개라 $n=5,6,7$ → $18$.
 * `54V`: $3a+5b=53$ → $(16,1),(11,4),(6,7),(1,10)$ → $16+11+6+1=34$.
 */
const CALIBRATION: ReadonlyArray<readonly [string, string, number]> = [
  [
    K51,
    "두 분수 $\\dfrac{18}{35}$, $\\dfrac{24}{49}$ 중 어느 것에 곱하여도 그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 $\\dfrac{q}{p}$라 할 때, $p+q$의 값을 구하시오. (단, $p$, $q$는 서로소인 자연수이다.)",
    251,
  ],
  [
    K51,
    "두 분수 $\\dfrac{20}{33}$, $\\dfrac{8}{9}$ 중 어느 것에 곱하여도 그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 $\\dfrac{q}{p}$라 할 때, $p+q$의 값을 구하시오. (단, $p$, $q$는 서로소인 자연수이다.)",
    103,
  ],
  [
    K52,
    "좌표평면 위에 두 점 $\\mathrm{A}(2, 3)$, $\\mathrm{B}(2, 15)$가 있다. 정비례 관계 $y=ax$의 그래프가 두 점을 이은 선분 $\\mathrm{AB}$와 만나도록 하는 정수 $a$의 값을 모두 더한 값을 구하시오.",
    27,
  ],
  [
    K52,
    "좌표평면 위에 두 점 $\\mathrm{A}(5, 18)$, $\\mathrm{B}(5, 46)$이 있다. 정비례 관계 $y=ax$의 그래프가 두 점을 이은 선분 $\\mathrm{AB}$와 만나도록 하는 정수 $a$의 값을 모두 더한 값을 구하시오.",
    39,
  ],
  [
    K53,
    "과자를 여러 개의 상자에 나누어 담으려고 한다. 한 상자에 $5$개씩 담으면 $8$개가 남고, 한 상자에 $7$개씩 담으면 마지막 한 상자에만 $7$개보다 적게 담기고 빈 상자는 생기지 않는다. 조건에 맞는 상자의 개수를 모두 찾아 그 합을 구하시오.",
    18,
  ],
  [
    K54,
    "$3$점짜리 문제와 $5$점짜리 문제로만 이루어진 시험이 있다. 어떤 학생이 두 가지 문제를 각각 적어도 한 문제씩 맞혀 $53$점을 받았을 때, 이 학생이 맞힌 $3$점짜리 문제의 개수가 될 수 있는 값을 모두 더한 값을 구하시오.",
    34,
  ],
  [
    K54,
    "$5$점짜리 문제와 $6$점짜리 문제로만 이루어진 시험이 있다. 어떤 학생이 두 가지 문제를 각각 적어도 한 문제씩 맞혀 $76$점을 받았을 때, 이 학생이 맞힌 $5$점짜리 문제의 개수가 될 수 있는 값을 모두 더한 값을 구하시오.",
    24,
  ],
];

/** 음성: 모양이 어긋나거나 **불변식을 어긴** 지면은 던진다. */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    K51,
    "두 분수 $\\dfrac{8}{9}$, $\\dfrac{38}{51}$ 중 어느 것에 곱하여도 그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 $\\dfrac{q}{p}$라 할 때, $p+q$의 값을 구하시오. (단, $p$, $q$는 서로소인 자연수이다.)",
    "옳은 답 $2+153$ 과 뒤집어 푼 답 $3+152$ 가 **둘 다 $155$** — 두 학생을 못 가른다 (㉠)",
  ],
  [
    K51,
    "두 분수 $\\dfrac{5}{12}$, $\\dfrac{7}{18}$ 중 어느 것에 곱하여도 그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 $\\dfrac{q}{p}$라 할 때, $p+q$의 값을 구하시오. (단, $p$, $q$는 서로소인 자연수이다.)",
    "두 분자가 서로소라 $p=1$ — 지면에 $\\dfrac{36}{1}$ 이 나온다 (㉯)",
  ],
  [
    K51,
    "두 분수 $\\dfrac{20}{21}$, $\\dfrac{36}{14}$ 중 어느 것에 곱하여도 그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 $\\dfrac{q}{p}$라 할 때, $p+q$의 값을 구하시오. (단, $p$, $q$는 서로소인 자연수이다.)",
    "$\\dfrac{36}{14}$ 가 기약분수가 아니다 — 이때만 $\\gcd(q,p)>1$ 이 생긴다",
  ],
  [
    K51,
    "두 수 $3^{a}\\times5^{2}\\times7$, $3^{3}\\times7^{b}$의 최대공약수가 $3\\times7$, 최소공배수가 $3^{3}\\times5^{2}\\times7^{4}$일 때, 자연수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.",
    "같은 소단원 심화하 `09` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K52,
    "좌표평면 위에 두 점 $\\mathrm{A}(2, 4)$, $\\mathrm{B}(2, 16)$이 있다. 정비례 관계 $y=ax$의 그래프가 두 점을 이은 선분 $\\mathrm{AB}$와 만나도록 하는 정수 $a$의 값을 모두 더한 값을 구하시오.",
    "창의 끝이 정수($a=2$, $a=8$)라 「경계가 포함되나」라는 군더더기 시비가 생긴다",
  ],
  [
    K52,
    "좌표평면 위에 두 점 $\\mathrm{A}(3, 2)$, $\\mathrm{B}(3, 20)$이 있다. 정비례 관계 $y=ax$의 그래프가 두 점을 이은 선분 $\\mathrm{AB}$와 만나도록 하는 정수 $a$의 값을 모두 더한 값을 구하시오.",
    "창이 $1$ 부터라 아래 끝을 안 읽어도 답이 같다 — 굳힘의 절반이 장식 (㉡ 음성 대조)",
  ],
  [
    K52,
    "오른쪽 그림과 같이 정비례 관계 $y=3x$의 그래프 위의 점 $\\mathrm{P}$의 $x$좌표가 $2$이다. 삼각형 $\\mathrm{POH}$의 넓이를 구하시오.",
    "같은 소단원 심화하 `10` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K53,
    "과자를 여러 개의 상자에 나누어 담으려고 한다. 한 상자에 $7$개씩 담으면 $8$개가 남고, 한 상자에 $5$개씩 담으면 마지막 한 상자에만 $5$개보다 적게 담기고 빈 상자는 생기지 않는다. 조건에 맞는 상자의 개수를 모두 찾아 그 합을 구하시오.",
    "나중 개수가 더 작아 조건에 맞는 상자 수가 **하나도 없다** (㉡ 음성 대조)",
  ],
  [
    K53,
    "과자를 여러 개의 상자에 나누어 담으려고 한다. 한 상자에 $8$개씩 담으면 $3$개가 남고, 한 상자에 $9$개씩 담으면 마지막 한 상자에만 $9$개보다 적게 담기고 빈 상자는 생기지 않는다. 조건에 맞는 상자의 개수를 모두 찾아 그 합을 구하시오.",
    "살아남는 상자 수가 $4$~$11$ 의 **여덟 가지** — 다섯을 넘어 열거가 지면에 안 담긴다",
  ],
  [
    K53,
    "강당의 긴 의자에 학생들이 앉으려고 한다. 한 의자에 $4$명씩 앉으면 $2$명이 앉지 못하고, 한 의자에 $5$명씩 앉으면 의자 $2$개가 남는다. 의자의 개수를 구하시오.",
    "같은 소단원 심화하 `20` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K54,
    "$3$점짜리 문제와 $6$점짜리 문제로만 이루어진 시험이 있다. 어떤 학생이 두 가지 문제를 각각 적어도 한 문제씩 맞혀 $60$점을 받았을 때, 이 학생이 맞힌 $3$점짜리 문제의 개수가 될 수 있는 값을 모두 더한 값을 구하시오.",
    "$3\\mid6$ 이라 훑는 모든 $b$ 가 살아남는다 — 배수 판정이 한 번도 «아니오» 를 안 낸다 (㉡ 음성 대조)",
  ],
  [
    K54,
    "한 자루에 $1100$원인 볼펜과 한 자루에 $700$원인 연필을 합하여 $12$자루를 사고 $11200$원을 지불하였다. 볼펜은 몇 자루 샀는지 구하시오.",
    "같은 소단원 기본 `06` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
];

describe("중1 3차 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·못 읽음을 각각 가른다", () => {
    // 양성: 참인 등식은 빈 배열
    expect(arithmeticEquationFailures("$5\\times7^{2}=245$")).toEqual([]);
    expect(
      arithmeticEquationFailures("$\\dfrac{18}{35}\\times\\dfrac{245}{6}=21$"),
    ).toEqual([]);
    expect(arithmeticEquationFailures("$2+3+4+5+6+7=27$")).toEqual([]);
    expect(arithmeticEquationFailures("$48\\div3=16$")).toEqual([]);
    expect(arithmeticEquationFailures("$5\\times5+8=33$")).toEqual([]);
    // 음성: 거짓인 등식은 잡힌다 — 이 자가 «아니오» 를 낼 수 있다
    expect(arithmeticEquationFailures("$5\\times7^{2}=246$")).toHaveLength(1);
    expect(arithmeticEquationFailures("$33-28=6$")).toHaveLength(1);
    expect(
      arithmeticEquationFailures("$\\dfrac{18}{35}\\times\\dfrac{245}{6}=22$"),
    ).toHaveLength(1);
    // 문자식은 판정하지 않는다 (거짓 경보를 안 낸다)
    expect(arithmeticEquationFailures("$b=1$이면 $p+q$의 값")).toEqual([]);
    expect(arithmeticEquationFailures("$7\\times n+12$")).toEqual([]);
    // 등식이 아니면 아무 말도 안 한다
    expect(arithmeticEquationFailures("$245$")).toEqual([]);
    expect(evalTex("2^{3}\\times3").n).toBe(24);
    expect(evalTex("\\dfrac{3}{2}").d).toBe(2);
    expect(() => evalTex("2+")).toThrow();
  });
});

/**
 * 굳힘 함수 자체의 눈금 — **음성 대조를 같이 둔다.**
 *
 * 「굳힘을 흔들면 답이 달라진다」만 재면 그 자가 «아니오» 를 낼 수 있는지 알 수 없다.
 * 그래서 흔들어도 **안 달라지는** 입력을 일부러 넣어 그 사실을 확인한다.
 */
describe("중1 3차 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`smallestMultiplierFraction` 은 손 계산과 맞고 전수 탐색과도 맞는다", () => {
    expect(smallestMultiplierFraction(18, 35, 24, 49)).toEqual({
      p: 6,
      q: 245,
    });
    expect(smallestMultiplierFraction(20, 33, 8, 9)).toEqual({ p: 4, q: 99 });
    // 🔴 **다른 길**(전수 탐색)과 맞대 본다 — 규칙을 옮겨 적은 것이 아님을 여기서 보인다.
    for (const [n1, d1, n2, d2] of [
      [18, 35, 24, 49],
      [20, 33, 8, 9],
      [8, 9, 38, 51],
      [4, 7, 6, 13],
    ] as const) {
      expect(
        smallestByBruteForce(n1, d1, n2, d2),
        `${n1}/${d1},${n2}/${d2}`,
      ).toEqual(smallestMultiplierFraction(n1, d1, n2, d2));
    }
    expect(swappedMultiplierAnswer(8, 9, 38, 51)).toBe(155);
    expect(
      smallestMultiplierFraction(8, 9, 38, 51).p +
        smallestMultiplierFraction(8, 9, 38, 51).q,
    ).toBe(155);
  });

  it("🔴 음성 대조 — $d_2$ 가 $d_1$ 의 약수이면 $d_2$ 를 흔들어도 답이 그대로다", () => {
    // $\mathrm{lcm}(12,6)=\mathrm{lcm}(12,4)=\mathrm{lcm}(12,3)=12$ — 굳힘이 장식인 자리.
    for (const d2 of [6, 4, 3, 2]) {
      expect(lcm(12, d2), `분모 ${d2}`).toBe(12);
    }
    expect(smallestMultiplierFraction(10, 12, 15, 6).q).toBe(
      smallestMultiplierFraction(10, 12, 15, 4).q,
    );
    // 우리가 쓰는 판에서는 흔들면 달라진다.
    expect(lcm(35, 49)).not.toBe(lcm(35, 50));
  });

  it("`integersMeetingSegment` 는 손 계산과 맞는다", () => {
    expect(integersMeetingSegment(2, 3, 15)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(integersMeetingSegment(5, 18, 46)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(upperOnlySum(2, 15)).toBe(28);
    expect(upperOnlySum(5, 46)).toBe(45);
    expect(() => integersMeetingSegment(0, 3, 15)).toThrow();
    expect(() => integersMeetingSegment(2, 15, 3)).toThrow();
  });

  it("🔴 음성 대조 — $y_\\mathrm{B}$ 를 한 칸 안에서 흔들면 정수 집합이 안 바뀐다", () => {
    // $x_0=2$ 이므로 $y_\mathrm{B}$ 가 $15$ 든 $14$ 든 $\lfloor y_\mathrm{B}/2\rfloor=7$ 이다.
    expect(integersMeetingSegment(2, 3, 15)).toEqual(
      integersMeetingSegment(2, 3, 14),
    );
    // $x_0$ 만큼 올리면 반드시 하나 늘어난다 — 생성기가 쓰는 그 흔들기.
    expect(integersMeetingSegment(2, 3, 17)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("`boxCountsLeavingLast` 는 손 계산과 맞는다", () => {
    expect(boxCountsLeavingLast(5, 8, 7)).toEqual([5, 6, 7]);
    expect(boxCountsLeavingLast(7, 12, 10)).toEqual([5, 6, 7]);
    expect(boxCountsLeavingLast(3, 1, 4)).toEqual([2, 3, 4]);
  });

  it("🔴 음성 대조 — $c\\le a$ 이면 살아남는 상자 수가 **하나도 없다**", () => {
    // 정찰 브리프는 이 자리를 「창이 끝나지 않는다(무한)」로 적었는데, 실측하면
    // **꽉 찬 조건 쪽은 빈 집합**이고 **느슨한 쪽(빈 상자만 안 생기면 된다)이 무한**이다.
    // 둘을 갈라서 적어 둔다 — 어느 쪽이 무한인지 모르면 이 음성 대조가 아무 말도 못 한다.
    for (const [a, c] of [
      [7, 5],
      [7, 6],
      [5, 5],
      [9, 4],
    ] as const) {
      expect(boxCountsLeavingLast(a, 8, c), `a=${a} c=${c}`).toEqual([]);
    }
    expect(looseBoxCounts(7, 8, 5, 100)).toHaveLength(100);
    expect(looseBoxCounts(7, 8, 5, 200)).toHaveLength(200);
    // 우리가 쓰는 판($a<c$)에서는 느슨한 쪽도 끝난다.
    expect(looseBoxCounts(5, 8, 7, 400).length).toBeLessThan(400);
  });

  it("`scorePairs` 와 `lastBToCheck` 는 손 계산과 맞는다", () => {
    expect(scorePairs(3, 5, 53)).toEqual([
      { a: 16, b: 1 },
      { a: 11, b: 4 },
      { a: 6, b: 7 },
      { a: 1, b: 10 },
    ]);
    expect(lastBToCheck(3, 5, 53)).toBe(10);
    expect(scorePairs(5, 6, 76).map((k) => k.a)).toEqual([14, 8, 2]);
  });

  it("🔴 음성 대조 — $p\\mid q$ 이면 훑는 모든 $b$ 가 살아남는다", () => {
    // 「$T-qb$ 가 $p$ 의 배수인가」가 $p\mid T$ 와 같은 말이 되어 견주는 걸음이 사라진다.
    const got = scorePairs(3, 6, 60);
    expect(got.map((k) => k.b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(got.length).toBe(lastBToCheck(3, 6, 60));
    // 우리가 쓰는 서로소 판에서는 대부분이 죽는다.
    expect(scorePairs(3, 5, 53).length).toBeLessThan(lastBToCheck(3, 5, 53));
  });

  it("`factorTex` 는 지수 $1$ 을 안 적는다 (`pageSmells` 가 잡는 자리)", () => {
    expect(factorTex(35)).toBe("5\\times7");
    expect(factorTex(49)).toBe("7^{2}");
    expect(factorTex(245)).toBe("5\\times7^{2}");
    expect(factorTex(8)).toBe("2^{3}");
    expect(factorTex(11)).toBe("11");
    expect(pageSmells(`$${factorTex(49)}$`)).toEqual([]);
    expect(() => primeFactors(1)).toThrow();
  });
});

describe("중1 3차 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_3.length).toBe(4);
    expect(new Set(M1_TOP_3.map((e) => e.key)).size).toBe(4);
    expect(M1_TOP_3.map((e) => e.key).sort()).toEqual([...KEYS].sort());
  });

  it("번호가 `V` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_3) {
      expect(/^\d+V$/.test(e.rpmType), e.key).toBe(true);
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다 (㉳)", () => {
    for (const e of M1_TOP_3) {
      expect(
        CURRICULUM_UNITS.some(
          (u) => u.grade === "중1" && u.section === e.unitSection,
        ),
        `${e.key} → ${e.unitSection}`,
      ).toBe(true);
      expect(e.grade).toBe("중1");
      // 가는 공백(U+2009)·줄바꿈 없는 공백(U+00A0)이 섞이면 눈으로는 안 보인다.
      expect(/[  ​]/.test(e.unitSection), e.key).toBe(false);
    }
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const n = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(n === 0 || n === KEYS.length, `등록 ${n}/${KEYS.length}`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_3) {
      for (const seed of SEEDS) {
        for (let v = 0; v < VARIANTS; v += 1) {
          const raw = e.handler(createRng(seed + v * 0x9e37));
          expect(wrapDanClause(raw.content), `${e.key} 단절`).toBe(raw.content);
          expect(tidySolution(raw.solution), `${e.key} 되풀이`).toBe(
            raw.solution,
          );
          expect(
            resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
            `${e.key} 갈래 내리기`,
          ).toBe(raw.difficulty);
        }
      }
    }
  });
});

describe("중1 3차 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = M1_TOP_3.map((e) => build(e.key, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중").length).toBe(2);
    expect(tiers.filter((t) => t === "심화상").length).toBe(2);
  });

  for (const e of M1_TOP_3) {
    describe(e.key, () => {
      it("갈래가 못 박은 그대로다 (씨앗·변형을 가로질러)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            expect(
              build(e.key, seed, v).difficulty,
              `${e.key} seed ${seed} v${v}`,
            ).toBe(EXPECTED_TIER[e.key]);
          }
        }
      });

      it("🔴 220판을 지면만 보고 다시 풀면 같은 답이 나온다 — 생성기 산술을 안 옮겨 적는다", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(VERIFY[e.key]!(p.content), `${e.key} ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
        }
      });

      it("`facts.x` 가 정답이다 (이웃 모듈과 같은 계약)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(p.facts.x, `${e.key} ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = build(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(brokenRender(text), `${e.key} 렌더: ${text}`).toBe(false);
              expect(pageSmells(text), `${e.key} 냄새`).toEqual([]);
              expect(josaMismatches(text), `${e.key} 조사`).toEqual([]);
              expect(bareNumbers(text), `${e.key} 맨 숫자`).toEqual([]);
            }
            // 그림이 없으므로 발문이 지면을 가리키면 종이에서 못 푼다.
            expect(p.figureSpec ?? null, e.key).toBe(null);
            expect(pointsAtFigure(p.content), e.key).toBeNull();
          }
        }
      });

      it("🔴 ㉮ ⑴ 해설의 모든 산술 등식이 좌우가 맞는다 (220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(
            arithmeticEquationFailures(p.solution),
            `${e.key} ${seed}/${v}`,
          ).toEqual([]);
          expect(
            arithmeticEquationFailures(p.content),
            `${e.key} 발문 ${seed}/${v}`,
          ).toEqual([]);
        }
      });

      it("🔴 ㉮ ⑵ 해설에 나온 수가 전부 설명된다 — 미설명 수 0 (220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const ok = EXPLAINED[e.key]!(p.content);
          const bad = solutionNumbers(p.solution).filter((n) => !ok.has(n));
          expect(
            [...new Set(bad)],
            `${e.key} ${seed}/${v}\n${p.solution}`,
          ).toEqual([]);
        }
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸ — 남의 자를 그대로 쓴다)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = build(e.key, seed, v);
            expect(isThin(p.content, p.solution), `${e.key} ${seed}/${v}`).toBe(
              false,
            );
            const lines = p.solution.split("\n");
            expect(lines.length, `${e.key} 해설 줄`).toBeGreaterThanOrEqual(7);
            expect(p.solution.length, `${e.key} 해설이 짧다`).toBeGreaterThan(
              200,
            );
            expect(
              (p.solution.match(/=/g) ?? []).length,
              `${e.key} 중간 등식`,
            ).toBeGreaterThanOrEqual(3);
            expect(lines[lines.length - 1]!, `${e.key} 마지막 줄`).toContain(
              String(answerNumber(p.answer)),
            );
          }
        }
      });

      it("변형 공간이 열 문항을 낸다 — 발문이 겹치지 않는다", () => {
        const seen = new Set<string>();
        for (let v = 0; v < 300 && seen.size < 10; v += 1) {
          seen.add(build(e.key, 20260902, v).content);
        }
        expect(seen.size, e.key).toBe(10);
      });
    });
  }
});

/**
 * 🔴 **㉠ 창이 한쪽 끝만인가** — 「살아남는 후보가 늘 목록의 같은 자리」면 굳힘이
 * «어느 후보인가»를 한 번도 안 고른다. 갈래마다 축이 다르므로 **따로** 잰다.
 * 「축이 없다」와 「축이 초록이다」는 다른 말이라 `51V` 는 «해당 없음»을 따로 찍는다.
 */
describe("중1 3차 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`51V` — **해당 없음**: 후보 목록이 없다. 뒤집은 오답과 갈리는 것을 대신 잰다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K51, seed, v);
      const { n1, d1, n2, d2, x } = p.facts as Record<string, number>;
      // 값이 하나로 굳는다 — 조건을 만족하는 $(q,p)$ 를 골라야 할 일이 없다.
      expect(smallestByBruteForce(n1!, d1!, n2!, d2!)).toEqual({
        p: p.facts.p!,
        q: p.facts.q!,
      });
      // 이 유형 고유의 지름길: 뒤집어 푼 답이 참 답과 같으면 두 학생을 못 가른다.
      expect(
        swappedMultiplierAnswer(n1!, d1!, n2!, d2!),
        `${seed}/${v}`,
      ).not.toBe(x!);
      expect(n1! + d1!, `${seed}/${v}`).not.toBe(x!);
      expect(n2! + d2!, `${seed}/${v}`).not.toBe(x!);
      /**
       * 🔴 **3항 지름길** — 「최소공배수 = 두 수의 곱」이라 잘못 아는 학생.
       *
       * 판정기의 `obviousCandidates` 는 **두 수 짝**(합·차·곱·gcd·lcm)만 만들어서
       * 이 부류를 **표현할 수 없다** — 그 자로는 구조적으로 0이다(2026-09-02
       * 검증이 짚은 자리). 그래서 여기서 직접 잰다.
       *
       * 두 분모가 서로소이면 $d_1d_2=\mathrm{lcm}(d_1,d_2)$ 라 이 값이 참 답과
       * **정확히** 같아진다(전수 실측 68/3384 = 2.01%). 생성기가 그 판을 버린다.
       */
      expect(d1! * d2! + gcd2(n1!, n2!), `${seed}/${v} 곱=lcm 지름길`).not.toBe(
        x!,
      );
      expect(gcd2(d1!, d2!), `${seed}/${v} 두 분모가 서로소다`).toBeGreaterThan(
        1,
      );
    }
  });

  it("`52V` — 창의 시작이 씨앗을 가로질러 갈리고, 답은 목록의 어느 자리도 아니다", () => {
    const starts = new Set<number>();
    const sizes = new Set<number>();
    for (const [seed, v] of BULK) {
      const p = build(K52, seed, v);
      const ints = integersMeetingSegment(
        p.facts.x0!,
        p.facts.ya!,
        p.facts.yb!,
      );
      expect(ints, `${seed}/${v}`).not.toContain(p.facts.x!);
      expect(ints.reduce((s, n) => s + n, 0)).toBe(p.facts.x!);
      expect(ints[0]!, `${seed}/${v}`).toBeGreaterThanOrEqual(2);
      starts.add(ints[0]!);
      sizes.add(ints.length);
    }
    // 창이 늘 같은 자리에서 시작하면 굳힘의 한쪽이 장식이 된다.
    expect(starts.size).toBeGreaterThanOrEqual(4);
    expect([...sizes].sort((a, b) => a - b)).toEqual([4, 5, 6, 7]);
  });

  it("`53V` — 살아남는 개수 셋·넷·다섯이 다 나오고 시작 자리도 갈린다", () => {
    const sizes = new Set<number>();
    const starts = new Set<number>();
    for (const [seed, v] of BULK) {
      const p = build(K53, seed, v);
      const alive = boxCountsLeavingLast(p.facts.a!, p.facts.b!, p.facts.c!);
      expect(alive, `${seed}/${v}`).not.toContain(p.facts.x!);
      expect(alive.reduce((s, n) => s + n, 0)).toBe(p.facts.x!);
      expect(alive.length).toBe(p.facts.cnt!);
      sizes.add(alive.length);
      starts.add(alive[0]!);
    }
    expect([...sizes].sort((a, b) => a - b)).toEqual([3, 4, 5]);
    expect(starts.size).toBeGreaterThanOrEqual(4);
  });

  it("`54V` — 살아남는 $b$ 의 첫 자리가 씨앗을 가로질러 갈린다", () => {
    const firstB = new Set<number>();
    for (const [seed, v] of BULK) {
      const p = build(K54, seed, v);
      const found = scorePairs(p.facts.p!, p.facts.q!, p.facts.t!);
      expect(
        found.map((k) => k.a),
        `${seed}/${v}`,
      ).not.toContain(p.facts.x!);
      expect(found.reduce((s, k) => s + k.a, 0)).toBe(p.facts.x!);
      expect(found[0]!.a).toBe(p.facts.first!);
      firstB.add(found[0]!.b);
    }
    // 늘 $b=1$ 에서 첫 해가 나오면 「차례로 넣어 본다」가 반쪽이 된다.
    expect(firstB.size).toBeGreaterThanOrEqual(3);
    expect(firstB.has(1)).toBe(true);
  });
});

/**
 * 🔴 **㉡ 굳힘이 항등식인가** — 굳힘 조건을 흔들었을 때 답이 그대로면 그것은 굳힘이
 * 아니라 장식이다. 위 「굳힘 함수와 음성 대조」가 그 자가 «아니오» 를 낼 수 있음을
 * 보였으므로, 여기서는 **실제로 나온 지면**이 그 자를 통과하는지를 잰다.
 */
describe("중1 3차 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("`51V` — 분모 하나를 흔들면 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const { n1, d1, n2, d2, x } = build(K51, seed, v).facts as Record<
        string,
        number
      >;
      const got = smallestMultiplierFraction(n1!, d1!, n2!, d2!);
      expect(got.p + got.q).toBe(x!);
      const shaken = smallestMultiplierFraction(n1!, d1!, n2!, d2! + 1);
      expect(shaken.p + shaken.q, `${seed}/${v}`).not.toBe(x!);
    }
  });

  it("`52V` — 점 $\\mathrm{B}$ 를 $x_0$ 만큼 올리면 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const { x0, ya, yb, x } = build(K52, seed, v).facts as Record<
        string,
        number
      >;
      expect(
        integersMeetingSegment(x0!, ya!, yb!).reduce((s, a) => s + a, 0),
      ).toBe(x!);
      expect(
        integersMeetingSegment(x0!, ya!, yb! + x0!).reduce((s, a) => s + a, 0),
        `${seed}/${v}`,
      ).not.toBe(x!);
      // 굳힘의 절반(아래 끝)을 안 읽은 답과도 갈려야 한다.
      expect(upperOnlySum(x0!, yb!), `${seed}/${v}`).not.toBe(x!);
    }
  });

  it("`53V` — 둘째 조건의 개수를 흔들면 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const { a, b, c, x } = build(K53, seed, v).facts as Record<
        string,
        number
      >;
      expect(boxCountsLeavingLast(a!, b!, c!).reduce((s, n) => s + n, 0)).toBe(
        x!,
      );
      expect(
        boxCountsLeavingLast(a!, b!, c! + 1).reduce((s, n) => s + n, 0),
        `${seed}/${v}`,
      ).not.toBe(x!);
      expect(
        looseBoxCounts(a!, b!, c!).reduce((s, n) => s + n, 0),
        `${seed}/${v}`,
      ).not.toBe(x!);
    }
  });

  it("`54V` — 총점을 흔들면 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const { p, q, t, x, first } = build(K54, seed, v).facts as Record<
        string,
        number
      >;
      expect(scorePairs(p!, q!, t!).reduce((s, k) => s + k.a, 0)).toBe(x!);
      expect(
        scorePairs(p!, q!, t! + 1).reduce((s, k) => s + k.a, 0),
        `${seed}/${v}`,
      ).not.toBe(x!);
      // 첫 해를 찾고 멈춘 값과 갈려야 한다.
      expect(first!, `${seed}/${v}`).not.toBe(x!);
    }
  });
});

/**
 * 🔴 **후보를 견주는 갈래는 후보를 하나씩 적고 각각 왜 살고 죽는지까지 적는다**
 * (D-116 ⑹). 그리고 그 줄의 **모든 중간값을 다시 셈해** 맞댄다 — 2차 물결이 여기서
 * 샜다(㉮). 「해설에 이 문자열이 있나」는 마지막 줄 하나로 충족되므로 안 쓴다.
 */
describe("중1 3차 확대 갈래 — 해설의 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`53V` — 상자 개수마다 세 수와 «까닭»이 맞고, 「모두」가 전수 탐색과 같다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K53, seed, v);
      const { a, b, c } = read53(p.content);
      const all = p.solution.split("\n");
      /**
       * 🔴 **차림 세 줄의 «주장»** — 여기서 $a$ 와 $c$ 가 뒤바뀌면 뒤의 모든 줄과
       * 어긋나는데, 값 검산은 문자 $n$ 이 든 식을 판정 대상에서 빼므로 못 본다.
       * 그래서 **역할을 수에 묶어** 읽는다.
       */
      const [setA, setB] = grab(
        /^상자의 개수를 \$n\$이라 하면 한 상자에 \$(\d+)\$개씩 담고 \$(\d+)\$개가 남으므로 과자는 모두 \$(\d+)\\times n\+(\d+)\$\(개\)이다\.$/,
        all[0]!,
        "53V 차림 첫 줄",
      );
      expect([num(setA!), num(setB!)], `${seed}/${v} 첫 조건`).toEqual([a, b]);
      const [packC, packC2] = grab(
        /^이 과자를 \$(\d+)\$개씩 담으면 앞의 \$n-1\$개 상자에 \$(\d+)\\times\(n-1\)\$\(개\)가 들어가고, 마지막 상자에는 나머지가 담긴다\.$/,
        all[1]!,
        "53V 차림 둘째 줄",
      );
      expect([num(packC!), num(packC2!)], `${seed}/${v} 둘째 조건`).toEqual([
        c,
        c,
      ]);
      const [critC, critLo, critHi] = grab(
        /^마지막 한 상자에만 \$(\d+)\$개보다 적게 담기고 빈 상자가 생기지 않으려면 마지막 상자에 담기는 과자가 \$(\d+)\$개부터 \$(\d+)\$개까지이어야 한다\. 상자는 여러 개이므로 \$n\$의 값을 \$2\$부터 차례로 넣어 본다\.$/,
        all[2]!,
        "53V 기준 줄",
      );
      expect(
        [num(critC!), num(critLo!), num(critHi!)],
        `${seed}/${v} 기준`,
      ).toEqual([c, 1, c - 1]);
      const lines = all.filter((l) => /^\$n=\d+\$이면/.test(l));
      const seenN: number[] = [];
      const aliveFromText: number[] = [];
      for (const line of lines) {
        // ⓐ 과자 수 · ⓑ 앞 상자 몫 — 한 줄에서 **네 수**를 한꺼번에 읽는다.
        //    앞 상자가 하나뿐이면 `$c\times1=c$` 대신 `$c$` 라 쓰므로 `=` 는 선택이다.
        const [nRaw, totalRaw, prevRaw, needRaw] = grab(
          /^\$n=(\d+)\$이면 과자 \$[^$]*?=(\d+)\$\(개\) 중 앞의 \$(\d+)\$개 상자에 \$(?:[^$]*=)?(\d+)\$\(개\)가 담기므로/,
          line,
          "53V 나열 줄",
        );
        const n = num(nRaw!);
        const total = num(totalRaw!);
        seenN.push(n);
        const sim = simulateLastBox(a, b, c, n);
        expect(total, `${seed}/${v} n=${n} 과자 수`).toBe(sim.total);
        expect(num(prevRaw!), `${seed}/${v} n=${n} 앞 상자 수`).toBe(n - 1);
        expect(num(needRaw!), `${seed}/${v} n=${n} 앞 상자 몫`).toBe(
          c * (n - 1),
        );
        const alive = /조건에 맞는다\.$/.test(line);
        const dead = /조건에 맞지 않는다\.$/.test(line);
        expect(alive !== dead, `${seed}/${v} n=${n} 판정 문구`).toBe(true);
        if (sim.ranOut || sim.last <= 0) {
          // ⓒ 「빈 상자가 생긴다」쪽 — 까닭이 바뀌어도 결론은 같으므로 까닭까지 본다.
          expect(line, `${seed}/${v} n=${n} 까닭`).toContain(
            "마지막 상자에 담을 과자가 없다. 빈 상자가 생기므로",
          );
          // 그 줄은 마지막 상자 개수를 **적으면 안 된다** — 담을 것이 없다.
          expect(line, `${seed}/${v} n=${n} 없는 수`).not.toContain(
            "마지막 상자는",
          );
          expect(alive).toBe(false);
        } else {
          // ⓓ 마지막 상자 개수 — **뺄셈의 두 항까지** 읽어 맞댄다(걸음을 건너뛰면 안 된다).
          const [minu, subt, lastRaw] = grab(
            /마지막 상자는 \$(\d+)-(\d+)=(\d+)\$\(개\)이다\./,
            line,
            "53V 마지막 상자 줄",
          );
          expect(num(minu!), `${seed}/${v} n=${n} 피감수`).toBe(sim.total);
          expect(num(subt!), `${seed}/${v} n=${n} 감수`).toBe(c * (n - 1));
          expect(num(lastRaw!), `${seed}/${v} n=${n} 마지막 상자`).toBe(
            sim.last,
          );
          expect(alive, `${seed}/${v} n=${n} 판정`).toBe(sim.last <= c - 1);
          // ⓔ **까닭이 기준과 같은 수를 말하나** — 살면 「$1$개 이상 $c-1$개 이하」,
          //    죽으면 「$c$개보다 적지 않다」. 기준을 흔들면 여기서 빨개진다.
          if (alive) {
            const [loRaw, hiRaw] = grab(
              /\$(\d+)\$개 이상 \$(\d+)\$개 이하이므로 조건에 맞는다\.$/,
              line,
              "53V 살아남는 까닭",
            );
            expect([num(loRaw!), num(hiRaw!)], `${seed}/${v} n=${n}`).toEqual([
              1,
              c - 1,
            ]);
          } else {
            const [limRaw] = grab(
              /\$(\d+)\$개보다 적지 않으므로 조건에 맞지 않는다\.$/,
              line,
              "53V 죽는 까닭",
            );
            expect(num(limRaw!), `${seed}/${v} n=${n} 까닭의 기준`).toBe(c);
          }
        }
        if (alive) aliveFromText.push(n);
      }
      // 🔴 훑은 자리가 $2$ 부터 빠짐없이 이어져야 「모두」가 참이 된다. $1$ 이 아니라
      //    $2$ 인 까닭은 발문이 「**여러 개**의 상자」라고 이미 $n=1$ 을 뺐기 때문이다.
      expect(seenN, `${seed}/${v} 훑은 자리`).toEqual(
        Array.from({ length: seenN.length }, (_, k) => k + 2),
      );
      // 🔴 반증 — 훑은 범위 **밖**까지 전수로 돌려 같은 집합이 나오는지 본다.
      //    $n=1$ 까지 포함해 훑는다(발문이 뺐다는 주장 자체를 여기서 확인한다).
      const brute: number[] = [];
      for (let n = 1; n <= 500; n += 1) {
        const s = simulateLastBox(a, b, c, n);
        if (!s.ranOut && s.last >= 1 && s.last <= c - 1) brute.push(n);
      }
      expect(aliveFromText, `${seed}/${v} 모두`).toEqual(brute);
      expect(
        brute[0]!,
        `${seed}/${v} $n=1$ 이 살아남으면 발문이 거짓말한다`,
      ).toBeGreaterThanOrEqual(2);
      // 🔴 **위쪽 끝이 «왜» 죽는지도 한 줄 보여야 한다** (D-116 ⑹). 마지막 나열 줄이
      //    살아남는 경우이면 학생은 「왜 여기서 끝나나」를 못 본다 — 마무리 문장의
      //    주장이 지면 어디에서도 확인되지 않는다. 변이 시험이 이 자리를 찾아 줬다
      //    (`top` 을 하나 줄여도 나머지 검사가 전부 초록이었다).
      expect(seenN[seenN.length - 1]!, `${seed}/${v} 위쪽 끝`).toBe(
        brute[brute.length - 1]! + 1,
      );
      // 🔴 마무리 줄의 상한이 **실제로 훑은 마지막 자리**를 가리켜야 한다.
      const [capRaw] = grab(
        /^상자가 \$(\d+)\$개보다 많으면 .*빈 상자가 생기므로 조건에 맞지 않는다\.$/m,
        p.solution,
        "53V 마무리 줄",
      );
      expect(num(capRaw!), `${seed}/${v} 마무리 상한`).toBe(
        seenN[seenN.length - 1]!,
      );
      // 🔴 **결론 줄의 «목록»과 «셈말»** — 2026-09-02 검증이 짚은 사각이다.
      //    종전 판은 합식(`$5+6+7=18$`)만 봤으므로, 목록에서 후보를 하나 빼거나
      //    셈말을 「세」→「네」로 바꿔도 92개 시험이 전부 초록이었다.
      const [listWordsRaw, countWordRaw, listRaw, sumRaw] = grab(
        /따라서 조건에 맞는 상자의 개수는 ((?:\$\d+\$(?:, )?)+)의 (\S+) 가지이고, 구하는 값은 \$([\d+]+)=(\d+)\$이다\.$/,
        p.solution,
        "53V 마지막 줄",
      );
      expect(readList(listWordsRaw!), `${seed}/${v} 결론 목록`).toEqual(brute);
      expect(countWordRaw!, `${seed}/${v} 결론 셈말`).toBe(
        COUNT_WORD[brute.length],
      );
      expect(listRaw!.split("+").map(Number)).toEqual(brute);
      expect(num(sumRaw!)).toBe(brute.reduce((s, n) => s + n, 0));
      expect(num(sumRaw!)).toBe(p.facts.x!);
      expect(num(sumRaw!)).toBe(answerNumber(p.answer));
    }
  });

  it("`54V` — $b$ 마다 두 수와 배수 판정이 맞고, 「모두」가 전수 탐색과 같다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K54, seed, v);
      const { p: pp, q, t } = read54(p.content);
      const lines = p.solution
        .split("\n")
        .filter((l) => /^\$b=\d+\$이면/.test(l));
      const seenB: number[] = [];
      const pairs: { a: number; b: number }[] = [];
      for (const line of lines) {
        const [bRaw, restRaw] = grab(
          /^\$b=(\d+)\$이면 \$[^$]*?=(\d+)\$이고,/,
          line,
          "54V 나열 줄",
        );
        const b = num(bRaw!);
        const rest = num(restRaw!);
        seenB.push(b);
        // ⓐ 남은 점수
        expect(rest, `${seed}/${v} b=${b} 남은 점수`).toBe(t - q * b);
        const said = /배수이므로/.test(line);
        const saidNot = /배수가 아니므로/.test(line);
        expect(said !== saidNot, `${seed}/${v} b=${b} 판정 문구`).toBe(true);
        // ⓑ 배수 판정
        expect(said, `${seed}/${v} b=${b} 배수 판정`).toBe(rest % pp === 0);
        if (said) {
          // ⓒ 그때의 $a$
          const [aRaw] = grab(/\$\d+\\div\d+=(\d+)\$이다/, line, "54V 몫");
          expect(num(aRaw!), `${seed}/${v} b=${b} 몫`).toBe(rest / pp);
          pairs.push({ a: rest / pp, b });
        }
      }
      expect(seenB, `${seed}/${v} 훑은 자리`).toEqual(
        Array.from({ length: seenB.length }, (_, k) => k + 1),
      );
      expect(seenB[seenB.length - 1]!).toBe(lastBToCheck(pp, q, t));
      // 🔴 반증 — $a$, $b$ 를 둘 다 전수로 훑어 얻은 집합과 같아야 한다.
      const brute: { a: number; b: number }[] = [];
      for (let b = 1; b * q < t; b += 1) {
        for (let a = 1; a * pp + b * q <= t; a += 1) {
          if (a * pp + b * q === t) brute.push({ a, b });
        }
      }
      expect(pairs, `${seed}/${v} 모두`).toEqual(brute);
      // 되짚기 — 나눗셈으로 얻은 값을 곱셈으로 다시 확인한다.
      for (const k of pairs) expect(k.a * pp + k.b * q).toBe(t);
      const [listRaw, sumRaw] = grab(
        /구하는 값은 \$([\d+]+)=(\d+)\$이다\.$/,
        p.solution,
        "54V 마지막 줄",
      );
      expect(listRaw!.split("+").map(Number)).toEqual(brute.map((k) => k.a));
      expect(num(sumRaw!)).toBe(brute.reduce((s, k) => s + k.a, 0));
      expect(num(sumRaw!)).toBe(p.facts.x!);
      expect(num(sumRaw!)).toBe(answerNumber(p.answer));
    }
  });

  it("`51V` — 검산 줄이 두 곱을 실제로 자연수로 만든다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K51, seed, v);
      const { n1, d1, n2, d2 } = read51(p.content);
      const best = smallestByBruteForce(n1, d1, n2, d2);
      const [q1, p1, k1, q2, p2, k2] = grab(
        /실제로 \$\\dfrac\{\d+\}\{\d+\}\\times\\dfrac\{(\d+)\}\{(\d+)\}=(\d+)\$, \$\\dfrac\{\d+\}\{\d+\}\\times\\dfrac\{(\d+)\}\{(\d+)\}=(\d+)\$/,
        p.solution,
        "51V 검산 줄",
      );
      expect([num(q1!), num(p1!)]).toEqual([best.q, best.p]);
      expect([num(q2!), num(p2!)]).toEqual([best.q, best.p]);
      expect(num(k1!) * (d1 * best.p)).toBe(n1 * best.q);
      expect(num(k2!) * (d2 * best.p)).toBe(n2 * best.q);
      const [sumRaw] = grab(
        /구하는 값은 \$\d+\+\d+=(\d+)\$이다\.$/,
        p.solution,
        "51V 마지막 줄",
      );
      expect(num(sumRaw!)).toBe(best.p + best.q);
      expect(num(sumRaw!)).toBe(p.facts.x!);
    }
  });

  it("`52V` — 경계 두 줄이 실제로 끝점을 지나게 하는 $a$ 다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K52, seed, v);
      const { x0, yA, yB } = read52(p.content);
      // 「$a$ 의 값이 이것이면 그래프가 점 A 를 지난다」는 주장을 **대입해서** 확인한다.
      //
      // 🔴 2026-09-02 — 창의 양 끝을 **기약분수**로 그리게 고쳤다. 그래서 분모가
      //    $x_0$ 이라고 못 박을 수 없다. 대신 ⑴ 곱하는 수가 $x_0$ 이고 ⑵ 분수가
      //    **기약**이며 ⑶ 그 값에 $x_0$ 을 곱하면 끝점이 나오는지를 정수 산술로 본다.
      const [mulA, n1, d1, got1] = grab(
        /\$(\d+)\\times\\dfrac\{(\d+)\}\{(\d+)\}=(\d+)\$이므로 그래프는 점 \$\\mathrm\{A\}\$를 지나고/,
        p.solution,
        "52V 아래 경계",
      );
      expect(num(mulA!), `${seed}/${v} 아래 경계의 곱하는 수`).toBe(x0);
      expect(
        gcd2(num(n1!), num(d1!)),
        `${seed}/${v} 아래 경계가 기약이 아니다`,
      ).toBe(1);
      expect(num(n1!) * x0, `${seed}/${v} 아래 경계 값`).toBe(yA * num(d1!));
      expect(num(got1!)).toBe(yA);
      const [mulB, n2, d2, got2] = grab(
        /\$(\d+)\\times\\dfrac\{(\d+)\}\{(\d+)\}=(\d+)\$이므로 그래프는 점 \$\\mathrm\{B\}\$를 지나고/,
        p.solution,
        "52V 위 경계",
      );
      expect(num(mulB!), `${seed}/${v} 위 경계의 곱하는 수`).toBe(x0);
      expect(
        gcd2(num(n2!), num(d2!)),
        `${seed}/${v} 위 경계가 기약이 아니다`,
      ).toBe(1);
      expect(num(n2!) * x0, `${seed}/${v} 위 경계 값`).toBe(yB * num(d2!));
      expect(num(got2!)).toBe(yB);
      const ints = integersMeetingSegment(x0, yA, yB);
      // 🔴 **나열 줄 ↔ 셈말 ↔ 합 줄, 셋이 서로 맞나** — 2026-09-02 검증이 짚은 사각이다.
      //    종전 판은 합식만 봤으므로 나열에서 첫 후보를 빼거나 셈말을 하나 줄여도
      //    92개 시험이 전부 초록이었다(지면은 스스로 모순인 채 나간다).
      const [loTex, hiTex, listWordsRaw, countWordRaw] = grab(
        /그러므로 \$a\$의 값은 \$(\\dfrac\{\d+\}\{\d+\})\$부터 \$(\\dfrac\{\d+\}\{\d+\})\$까지의 수이고, 이 가운데 정수는 ((?:\$\d+\$(?:, )?)+)의 (\S+) 개이다\./,
        p.solution,
        "52V 나열 줄",
      );
      // 범위 줄의 두 끝이 경계 두 줄의 그것과 **같은 글자**여야 한다.
      expect(loTex!, `${seed}/${v} 범위의 아래 끝`).toBe(
        `\\dfrac{${num(n1!)}}{${num(d1!)}}`,
      );
      expect(hiTex!, `${seed}/${v} 범위의 위 끝`).toBe(
        `\\dfrac{${num(n2!)}}{${num(d2!)}}`,
      );
      expect(readList(listWordsRaw!), `${seed}/${v} 나열`).toEqual(ints);
      expect(countWordRaw!, `${seed}/${v} 셈말`).toBe(COUNT_WORD[ints.length]);
      const [listRaw, sumRaw] = grab(
        /구하는 값은 \$([\d+]+)=(\d+)\$이다\.$/,
        p.solution,
        "52V 마지막 줄",
      );
      expect(listRaw!.split("+").map(Number)).toEqual(ints);
      // 🔴 반증 — 목록에 **없는** 정수는 전부 밖이어야 한다.
      for (let a = -600; a <= 600; a += 1) {
        const inside = a * x0 >= yA && a * x0 <= yB;
        expect(ints.includes(a), `${seed}/${v} a=${a}`).toBe(inside);
      }
      expect(num(sumRaw!)).toBe(ints.reduce((s, n) => s + n, 0));
      expect(num(sumRaw!)).toBe(p.facts.x!);
    }
  });
});

/**
 * 🔴 **해설의 «말»을 지킨다** — 2026-09-02 검증이 짚은 사각.
 *
 * 종전 92개 시험은 해설의 **수**만 지키고 **주장**(논리 문장)은 하나도 안 봤다.
 * 검증자가 「배수↔약수」·「공배수↔공약수」·「최소공배수↔최대공약수」·「분자는 가장
 * 작아야↔분모는 가장 커야」를 맞바꾸고 굳힘의 핵심 줄을 **통째로 지웠는데 92/92 가
 * 전부 초록**이었다. 2차 물결의 치명 결함(해설이 스스로 모순인 두 줄)과 **같은
 * 모양**이다 — 값 검산·미설명 수·KaTeX 는 이 축을 구조적으로 못 본다.
 *
 * ⚠️ 여기서 쓰는 정규식은 **역할을 수에 묶는다.** 「$q$ 가 $55$ 의 배수」에서
 *    $55$ 가 **분모**여야 하고 「$p$ 가 $16$ 의 약수」에서 $16$ 이 **분자**여야
 *    한다 — 낱말만 바꿔치기하면 수가 제자리를 벗어나 빨개진다.
 */
describe("중1 3차 확대 갈래 — 해설의 «주장»이 옳은 자리를 가리키나", () => {
  it("`51V` — 배수·약수·공배수·공약수·최소공배수·최대공약수가 제자리다 (220판)", () => {
    for (const [seed, v] of BULK) {
      const p = build(K51, seed, v);
      const { n1, d1, n2, d2 } = read51(p.content);
      const best = smallestByBruteForce(n1, d1, n2, d2);
      const lines = p.solution.split("\n");
      // 🔴 줄 수를 못 박는다 — 굳힘 줄을 통째로 지우면 여기서 먼저 빨개진다.
      expect(lines.length, `${seed}/${v} 해설 줄 수`).toBe(8);
      // ⓐ 첫 두 줄 — 「$q$ 가 **분모**의 배수, $p$ 가 **분자**의 약수」
      const [mul1, div1] = grab(
        /이 값이 자연수가 되려면 \$q\$가 \$(\d+)\$의 배수이고 \$p\$가 \$(\d+)\$의 약수이어야 한다\.$/,
        lines[0]!,
        "51V 첫 줄의 주장",
      );
      expect([num(mul1!), num(div1!)], `${seed}/${v} 첫 분수`).toEqual([
        d1,
        n1,
      ]);
      const [mul2, div2] = grab(
        /^같은 까닭으로 .*자연수가 되려면 \$q\$가 \$(\d+)\$의 배수이고 \$p\$가 \$(\d+)\$의 약수이어야 한다\.$/,
        lines[1]!,
        "51V 둘째 줄의 주장",
      );
      expect([num(mul2!), num(div2!)], `${seed}/${v} 둘째 분수`).toEqual([
        d2,
        n2,
      ]);
      // ⓑ 셋째 줄 — 「$q$ 는 두 **분모**의 **공배수**, $p$ 는 두 **분자**의 **공약수**」
      const [ca, cb, cc, cd] = grab(
        /^즉 \$q\$는 두 분모 \$(\d+)\$, \$(\d+)\$의 공배수이고, \$p\$는 두 분자 \$(\d+)\$, \$(\d+)\$의 공약수이다\.$/,
        lines[2]!,
        "51V 셋째 줄의 주장",
      );
      expect(
        [num(ca!), num(cb!), num(cc!), num(cd!)],
        `${seed}/${v} 공배수·공약수`,
      ).toEqual([d1, d2, n1, n2]);
      // ⓒ **굳힘 줄** — 「분자는 가장 작아야 · 분모는 가장 커야」와
      //    「$q$ 는 최소공배수 · $p$ 는 최대공약수」. 이 줄이 이 유형의 «중»이다.
      expect(
        /^\$\\dfrac\{q\}\{p\}\$가 가장 작으려면 분자 \$q\$는 가장 작아야 하고 분모 \$p\$는 가장 커야 하므로, \$q\$는 두 분모의 최소공배수이고 \$p\$는 두 분자의 최대공약수이다\.$/.test(
          lines[3]!,
        ),
        `${seed}/${v} 굳힘 줄: ${lines[3]}`,
      ).toBe(true);
      // ⓓ 값 줄 — 「두 **분모**를 소인수분해 … 두 분모의 **최소공배수**는 $q$」
      const [f1, f2, lcmVal] = grab(
        /^두 분모를 소인수분해하면 \$(\d+)=[^$]*\$, \$(\d+)=[^$]*\$이므로 두 분모의 최소공배수는 \$(?:[^$]*=)?(\d+)\$이다\.$/,
        lines[4]!,
        "51V 최소공배수 줄",
      );
      expect([num(f1!), num(f2!)], `${seed}/${v} 소인수분해한 두 수`).toEqual([
        d1,
        d2,
      ]);
      expect(num(lcmVal!), `${seed}/${v} 최소공배수 값`).toBe(best.q);
      expect(num(lcmVal!), `${seed}/${v} 최소공배수 재계산`).toBe(lcm2(d1, d2));
      const [g1, g2, gcdVal] = grab(
        /^두 분자를 소인수분해하면 \$(\d+)=[^$]*\$, \$(\d+)=[^$]*\$이므로 두 분자의 최대공약수는 \$(?:[^$]*=)?(\d+)\$이다\.$/,
        lines[5]!,
        "51V 최대공약수 줄",
      );
      expect([num(g1!), num(g2!)], `${seed}/${v} 소인수분해한 두 분자`).toEqual(
        [n1, n2],
      );
      expect(num(gcdVal!), `${seed}/${v} 최대공약수 값`).toBe(best.p);
      expect(num(gcdVal!), `${seed}/${v} 최대공약수 재계산`).toBe(gcd2(n1, n2));
      // ⓔ 마지막 줄 — $p$ 와 $q$ 가 뒤바뀌면 여기서 걸린다.
      const [pRaw, qRaw] = grab(
        /^따라서 \$p=(\d+)\$, \$q=(\d+)\$이므로 구하는 값은 \$\d+\+\d+=\d+\$이다\.$/,
        lines[7]!,
        "51V 마지막 줄",
      );
      expect([num(pRaw!), num(qRaw!)], `${seed}/${v} p·q`).toEqual([
        best.p,
        best.q,
      ]);
    }
  });

  it("`54V` — 첫 줄의 계수 배치와 마무리(상한) 줄의 주장이 참이다 (220판)", () => {
    for (const [seed, v] of BULK) {
      const p = build(K54, seed, v);
      const { p: pp, q, t } = read54(p.content);
      const lines = p.solution.split("\n");
      /**
       * ⓐ **첫 줄의 계수 배치.** $a$ 는 $p$점짜리, $b$ 는 $q$점짜리의 개수이므로
       * 식은 $p\times a+q\times b=T$ 여야 한다. 둘을 맞바꾸면 바로 다음 줄
       * (「$T-q\times b$ 가 $p$ 의 배수」)과 정면으로 어긋나는데, 종전 시험은
       * 그 식을 **판정 대상에서 빼고 있었다**(`isPureArithmetic` 이 문자 $a$·$b$
       * 때문에 건너뛴다). 그래서 맞바꾼 지면이 92/92 초록이었다.
       */
      const [decA, decB, coefA, coefB, total] = grab(
        /^맞힌 \$(\d+)\$점짜리 문제의 개수를 \$a\$, 맞힌 \$(\d+)\$점짜리 문제의 개수를 \$b\$라 하면 \$(\d+)\\times a\+(\d+)\\times b=(\d+)\$이고/,
        lines[0]!,
        "54V 첫 줄",
      );
      expect(num(decA!), `${seed}/${v} $a$ 의 배점`).toBe(pp);
      expect(num(decB!), `${seed}/${v} $b$ 의 배점`).toBe(q);
      expect(num(coefA!), `${seed}/${v} $a$ 의 계수`).toBe(pp);
      expect(num(coefB!), `${seed}/${v} $b$ 의 계수`).toBe(q);
      expect(num(total!), `${seed}/${v} 총점`).toBe(t);
      // 둘째 줄도 같은 배점을 써야 한다 — 첫 줄만 고치면 여기서 갈린다.
      const [subQ, divP] = grab(
        /^\$b\$의 값을 \$1\$부터 차례로 넣어 \$\d+-(\d+)\\times b\$가 \$(\d+)\$의 배수가 되는지 확인한다\.$/,
        lines[1]!,
        "54V 둘째 줄",
      );
      expect([num(subQ!), num(divP!)], `${seed}/${v} 훑기 줄의 배점`).toEqual([
        q,
        pp,
      ]);
      /**
       * ⓑ **마무리(상한) 줄** — 이 심화상 문항의 「모두」를 떠받치는 유일한 근거다.
       * 종전 시험은 이 줄을 **한 글자도 안 읽었다**: 임계 $b$ 를 하나 줄이면
       * 바로 윗줄이 그 $b$ 에서 답을 구했는데 이 줄이 그것을 부정하는 지면이
       * 나오는데도 92/92 초록이었다(`arithmeticEquationFailures` 는 `=` 가 든
       * 순수 산술만 보고, 그 줄의 임계값·배점에는 `=` 가 없다).
       */
      const stopLine = lines[lines.length - 2]!;
      const [stopRaw, qRaw, mulQ, mulStop, prod, restP, askP] = grab(
        /^\$b\$의 값이 \$(\d+)\$ 이상이면 \$(\d+)\$점짜리 문제만으로 얻는 점수가 \$(\d+)\\times(\d+)=(\d+)\$\(점\) 이상이 되어 남는 점수가 \$(\d+)\$점보다 작아지므로 \$(\d+)\$점짜리 문제를 한 문제도 맞힐 수 없다\.$/,
        stopLine,
        "54V 마무리 줄",
      );
      const stop = num(stopRaw!);
      expect(num(qRaw!), `${seed}/${v} 마무리의 배점`).toBe(q);
      expect([num(mulQ!), num(mulStop!)], `${seed}/${v} 곱의 두 항`).toEqual([
        q,
        stop,
      ]);
      expect(num(prod!), `${seed}/${v} 곱`).toBe(q * stop);
      expect(
        [num(restP!), num(askP!)],
        `${seed}/${v} 남는 점수의 기준`,
      ).toEqual([pp, pp]);
      // 🔴 **주장이 참인가** — 임계에서 남는 점수가 $p$ 보다 작아야 하고(맞다),
      //    바로 앞자리에서는 **작지 않아야** 한다(임계가 헐겁지 않다).
      expect(t - q * stop, `${seed}/${v} 임계에서 남는 점수`).toBeLessThan(pp);
      expect(
        t - q * (stop - 1),
        `${seed}/${v} 임계 바로 앞은 아직 살아 있어야 한다`,
      ).toBeGreaterThanOrEqual(pp);
      // 그리고 훑은 마지막 자리가 임계 바로 앞이어야 이어진다.
      expect(stop - 1, `${seed}/${v} 훑기와 마무리가 이어지나`).toBe(
        lastBToCheck(pp, q, t),
      );
      /**
       * ⓒ **결론 줄의 목록과 셈말.** 후보가 넷·다섯인 조합이 전수의 41% 라
       * 드문 자리가 아닌데, 셈말을 늘 「세」로 고정해도 92/92 초록이었다.
       */
      const found = scorePairs(pp, q, t);
      const [listWordsRaw, countWordRaw, listRaw, sumRaw] = grab(
        /따라서 \$a\$의 값은 ((?:\$\d+\$(?:, )?)+)의 (\S+) 가지이고, 구하는 값은 \$([\d+]+)=(\d+)\$이다\.$/,
        lines[lines.length - 1]!,
        "54V 결론 줄",
      );
      expect(readList(listWordsRaw!), `${seed}/${v} 결론 목록`).toEqual(
        found.map((k) => k.a),
      );
      expect(countWordRaw!, `${seed}/${v} 결론 셈말`).toBe(
        COUNT_WORD[found.length],
      );
      expect(listRaw!.split("+").map(Number)).toEqual(found.map((k) => k.a));
      expect(num(sumRaw!)).toBe(answerNumber(p.answer));
    }
  });

  /**
   * 🔴 **수 뒤 주격 조사 「이/가」** — 공용 `josaMismatches` 가 **못 보는 자리**다.
   *
   * ⑴ 그 자는 「이」를 `JOSA_PAIR` 에 안 넣는다(서술격 「$5$이다」와 안 갈려서
   *    거짓 경보가 쏟아진다). 그래서 「가를 써야 할 자리에 이를 썼다」는 0 이다.
   * ⑵ `52V` 는 더 나쁘다 — 수식이 `)` 로 끝나 `trailingReadNumber` 가 `null` 이라
   *    **800/800 전량을 건너뛴다.** 모듈 머리말은 「공용 자를 그대로 쓴다」고 적었지만
   *    이 유형에서는 **구조적으로 0** 이었다(「0 은 «깨끗»과 «못 셈»을 안 가른다」).
   *
   * 여기서는 조사가 붙는 **자리를 못 박아** 잰다 — 뒤에 오는 말이 정해져 있으므로
   * 서술격과 헷갈릴 일이 없다. 받침 규칙은 시험 쪽 `numVowelFinal` 에서 온다.
   */
  it("🔴 `51V`·`52V` 의 조사 자리를 **직접** 잰다 (공용 자의 사각, 220판)", () => {
    // 눈금 — 이 자가 «아니오» 를 낼 수 있는가. 받침 있는 수는 「이/을」, 없는 수는 「가/를」.
    expect([subjectJosaFor(36), subjectJosaFor(10), subjectJosaFor(7)]).toEqual(
      ["이", "이", "이"],
    );
    expect([subjectJosaFor(4), subjectJosaFor(59), subjectJosaFor(25)]).toEqual(
      ["가", "가", "가"],
    );
    expect([objectJosaFor(63), objectJosaFor(34)]).toEqual(["을", "를"]);
    // 그리고 공용 자가 이 자리들을 **정말 못 보는지** 확인한다 — 못 본다는 사실이
    // 참이라야 이 시험이 뜻을 가진다(참이 아니게 되면 여기서 알려 준다).
    expect(josaMismatches("두 점 $\\mathrm{B}(4, 59)$이 있다")).toEqual([]);
    expect(josaMismatches("$36$이 서로소이며")).toEqual([]);
    let seen51 = 0;
    let seen52 = 0;
    for (const [seed, v] of BULK) {
      const p51 = build(K51, seed, v);
      const { d1 } = read51(p51.content);
      const [num51, josa51] = grab(
        /\$(\d+)\$([이가]) 서로소이며/,
        p51.solution,
        "51V 조사 자리",
      );
      seen51 += 1;
      // 조사가 붙은 수가 **첫 분수의 분모**여야 한다 — 아니면 자리를 잘못 잡은 것이다.
      expect(num(num51!), `${seed}/${v} 51V 조사가 붙은 수`).toBe(d1);
      expect(josa51!, `${seed}/${v} 51V $${d1}$ 뒤 조사`).toBe(
        subjectJosaFor(d1),
      );
      const p52 = build(K52, seed, v);
      const { yB } = read52(p52.content);
      const [yContent, josaContent] = grab(
        /\$\\mathrm\{B\}\(\d+, (\d+)\)\$([이가]) 있다/,
        p52.content,
        "52V 발문 조사 자리",
      );
      const [ySolution, josaSolution] = grab(
        /\$\\mathrm\{B\}\(\d+, (\d+)\)\$([을를]) 이은 선분이므로/,
        p52.solution,
        "52V 해설 조사 자리",
      );
      seen52 += 1;
      // 「읽을 때 마지막에 오는 수」는 점 $\mathrm{B}$ 의 $y$좌표다.
      expect(
        [num(yContent!), num(ySolution!)],
        `${seed}/${v} 52V 읽는 수`,
      ).toEqual([yB, yB]);
      expect(josaContent!, `${seed}/${v} 52V 발문 $${yB}$ 뒤 조사`).toBe(
        subjectJosaFor(yB),
      );
      expect(josaSolution!, `${seed}/${v} 52V 해설 $${yB}$ 뒤 조사`).toBe(
        objectJosaFor(yB),
      );
    }
    // 🔴 **그 줄을 실제로 읽었는가** — 0 건이면 「깨끗」이 아니라 「못 셈」이다.
    expect(seen51, "51V 조사 자리를 한 번도 안 읽었다").toBe(BULK.length);
    expect(seen52, "52V 조사 자리를 한 번도 안 읽었다").toBe(BULK.length);
  });
});

/**
 * 🔴 **정답지 한 단을 넘으면 옆 문항 해설이 통째로 사라진다.**
 *
 * `.answerSolutions` 는 `column-count:2` + `overflow:hidden` 이라, 넘친 해설은
 * «조금 잘리는» 것이 아니라 **그 쪽 다른 문항의 해설을 밀어내 없앤다**
 * (`printOverflow.ts` `assessAnswerKeyRisk` 주석).
 *
 * ⚠️ **이 축이 통째로 시험 밖이었다.** 값 검산·미설명 수·KaTeX·냄새 자 어느 것도
 *    「해설이 지면에 들어가나」를 못 본다 — 그래서 `53V` 가 **1242px**(등록 1,4xx
 *    유형 중 혼자 한 단 초과, 2위가 872px)로 착지할 뻔했다. 씨앗 200×변형 3 =
 *    600판에서 **317판(52.8%)** 이 한 단 초과였다.
 *
 * 자를 **제품에서 그대로 부른다**(`estimateSolutionPx`) — 규칙을 옮겨 적지 않는다.
 * 상한은 **문턱이 아니라 실측 기록**이다: 커지면 빨개져야 한다.
 */
describe("중1 3차 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
  /**
   * 실측(2026-09-02 최초 · **2026-09-06 다시 잼**, 씨앗 200 × 변형 3 = 600판,
   * 제품 `estimateSolutionPx`).
   *
   * ## 🔴 2026-09-06 — **지면이 아니라 자가 바뀌었다**
   *
   * `estimateSolutionPx` 가 그날까지 **원문**을 재고 있었다. 지면은
   * `solutionForDisplay` 로 갈라 그리는데(`PrintAnswerKeyPage` 외 세 화면) 자만
   * 안 걸려 있었다 — 그래서 갈린 줄을 **한 줄로** 세고 있었다
   * (`solutionWiring.test.ts` 「자도 지면과 같은 글을 본다」).
   *
   * 자를 지면에 맞추자 **여덟 유형 중 셋**이 올라갔다(옛 자 → 새 자):
   * `53V` 689.7 → **814.5** · `63W` 402.7 → 420.5 · `64W` 671.9 → 761.0.
   * 나머지 다섯은 **0.0 차이**다. 옛 자를 `git show HEAD:` 로 꺼내 같은 판에 대어
   * 잰 값이다 — 추론이 아니다.
   *
   * **생성기는 한 글자도 안 바뀌었다.** 지면은 늘 814.5px 이었고 자가 몰랐을 뿐이다.
   * 그래서 이것은 회귀가 아니라 **기록의 수정**이고, 한 단(964.8px)은 옛 자·새 자
   * 어느 쪽으로도 **한 판도 안 넘는다**(600판 × 4유형에서 초과 0).
   */
  const MEASURED_PX: Record<string, number> = {
    [K51]: 408.8,
    [K52]: 392.8,
    [K53]: 814.5, // 고치기 전 **1242.3** · 옛 자로는 689.7 로 보였다
    [K54]: 654.1,
  };
  /** 여유 — 실측이 이보다 커지면 빨개진다. 지면 한 줄(17.825px)의 두 배쯤. */
  const SLACK_PX = 36;

  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const col = JASEUP_MEASURED_PX.answerSolutionsFull;
    const long = Array.from(
      { length: 60 },
      (_, i) =>
        `$${i}$ 이것은 아주 긴 해설 줄이며 지면에서 여러 줄을 먹는다. 그러므로 높이가 커야 한다.`,
    ).join("\n");
    expect(
      estimateSolutionPx(long),
      "긴 글이 한 단을 안 넘는다",
    ).toBeGreaterThan(col);
    expect(
      estimateSolutionPx("짧다."),
      "짧은 글이 한 단을 넘는다",
    ).toBeLessThan(200);
  });

  it("🔴 네 유형 전부 한 단(964.8px) 안에 들어간다 — 600판", () => {
    const col = JASEUP_MEASURED_PX.answerSolutionsFull;
    for (const key of KEYS) {
      let worst = 0;
      let over = 0;
      let n = 0;
      for (let s = 0; s < 200; s += 1) {
        for (let v = 0; v < 3; v += 1) {
          const px = estimateSolutionPx(
            build(key, 1000003 + s * 7919, v).solution,
          );
          worst = Math.max(worst, px);
          if (px > col) over += 1;
          n += 1;
        }
      }
      expect(n, `${key} 표본`).toBe(600);
      expect(over, `${key} 한 단 초과`).toBe(0);
      expect(worst, `${key} 최대 ${worst.toFixed(1)}px`).toBeLessThanOrEqual(
        MEASURED_PX[key]! + SLACK_PX,
      );
    }
  });

  it("🔴 `53V` 의 훑는 자리 상한(`top <= 8`)이 해설 높이를 실제로 지킨다", () => {
    // 🔴 **망가뜨려 봤다** — `m1Top3.ts:641` 의 `top > 8` 을 `top > 9` 로 한 칸만
    //    올리면 600판 최대가 814.5 → **885.8px** 이 되어 아래 줄이 빨개진다
    //    (여유 36px 로도 71px 이 남는다). 상한이 곧 해설 높이라는 말의 근거다.
    //
    // ⚠️ 이 줄의 값은 **문턱이 아니라 실측 기록**이라 `MEASURED_PX` 를 그대로 쓴다.
    //    숫자를 여기 따로 적으면 두 벌이 되어 한쪽만 옮겨도 아무도 모른다.
    let worst = 0;
    for (let s = 0; s < 200; s += 1) {
      for (let v = 0; v < 3; v += 1) {
        const p = build(K53, 1000003 + s * 7919, v);
        worst = Math.max(worst, estimateSolutionPx(p.solution));
        expect(p.facts.top!, `${s}/${v} 훑는 자리`).toBeLessThanOrEqual(8);
      }
    }
    expect(worst, `53V 최대 ${worst.toFixed(1)}px`).toBeLessThanOrEqual(
      MEASURED_PX[K53]! + SLACK_PX,
    );
  });

  it("🔴 `54V` 의 해설 길이 상한(`bStop <= 13`)이 산출물에 실제로 걸린다", () => {
    // 그 상한을 지우면 나열 줄이 12 → 23 이 되어 해설이 한 단을 넘는다.
    for (const [seed, v] of BULK) {
      const p = build(K54, seed, v);
      const rows = p.solution
        .split("\n")
        .filter((l) => /^\$b=\d+\$이면/.test(l));
      expect(p.facts.bstop!, `${seed}/${v} bStop`).toBeLessThanOrEqual(13);
      expect(rows.length, `${seed}/${v} 나열 줄`).toBe(p.facts.bstop! - 1);
      expect(rows.length, `${seed}/${v} 나열 줄 상한`).toBeLessThanOrEqual(12);
    }
  });
});

/**
 * 🔴 **㉢ 갈래끼리 겹침** — 새 갈래가 그 소단원의 형제와 한 시험지에 실린다.
 *
 * ⚠️ 기준선의 **최댓값을 면제부로 쓰지 않는다**(형제 `06`↔`09` 는 둘 다 「…의 식을
 * 구하시오」라 `1.000` 이 나오는데 그건 「중복」이 아니라 「이 열쇠로는 안 갈린다」이다).
 * 중앙값과 견주고, **실측한 최댓값을 그대로 못 박아** 커지면 빨개지게 한다.
 */
describe("중1 3차 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();
  /** 실측(2026-09-02, 씨앗 `20260827`). 커지면 빨개진다 — 문턱이 아니라 **기록**이다. */
  const MEASURED_MAX: Record<string, number> = {
    [K51]: 0.167,
    [K52]: 0.278,
    [K53]: 0.206,
    [K54]: 0.091,
  };

  for (const e of M1_TOP_3) {
    it(`${e.rpmType} — 형제 중 가장 닮은 것이 실측값보다 안 닮았다`, () => {
      const mine = build(e.key, OVERLAP_SEED, 0);
      const siblings = all.filter(
        (t) =>
          t.key !== e.key &&
          generateMiddleProblem(t.key, OVERLAP_SEED, 0).unitSection ===
            mine.unitSection,
      );
      expect(siblings.length, `${e.key} 형제가 없다`).toBeGreaterThan(3);
      let worst = 0;
      for (const t of siblings) {
        const q = generateMiddleProblem(t.key, OVERLAP_SEED, 0);
        worst = Math.max(worst, koreanJaccard(mine.content, q.content));
      }
      expect(worst, `${e.key} 최댓값`).toBeLessThanOrEqual(
        MEASURED_MAX[e.key]! + 1e-9,
      );
    });
  }

  it("🔴 `52V` 의 형제 넷은 답에 수가 없다 — 그 열쇠는 «판정 불가»여야 하고 죽으면 안 된다", () => {
    const mine = build(K52, OVERLAP_SEED, 0);
    const siblings = all.filter(
      (t) =>
        t.key !== K52 &&
        generateMiddleProblem(t.key, OVERLAP_SEED, 0).unitSection ===
          mine.unitSection,
    );
    let cannot = 0;
    for (const t of siblings) {
      const q = generateMiddleProblem(t.key, OVERLAP_SEED, 0);
      // 🔴 던지면 안 된다 — 종전 판은 여기서 `--overlap` 이 통째로 죽었다.
      const v = numAnswerJaccard(
        mine.content,
        mine.answer,
        q.content,
        q.answer,
      );
      if (v === null) cannot += 1;
    }
    // 실측 4건(`06`·`08`·`09`·`23`). 이 수가 $0$ 이 되면 그 자리는 다시 안 재어진다.
    expect(cannot).toBe(4);
  });

  it("🔴 `53V` 와 `54V` 는 같은 중단원이라 한 시험지에 실릴 수 있다 — 그래서 따로 잰다", () => {
    const a = build(K53, OVERLAP_SEED, 0);
    const b = build(K54, OVERLAP_SEED, 0);
    expect(a.rpmMinor).toBe(b.rpmMinor);
    expect(a.unitSection).not.toBe(b.unitSection);
    // 실측 0.041 — 소재를 「상자에 담기」와 「배점」으로 멀리 떼어 둔 값이다.
    expect(koreanJaccard(a.content, b.content)).toBeLessThan(0.1);
  });
});

/**
 * 🔴 **판정기의 축을 여기서 미리 댄다** — `generate.ts` 등록은 리드 몫이라, 그날까지
 * `probe-middle-top-m1.ts` 의 모집단(`registeredTypes()`)에 이 넷이 없다. 그러면 내가
 * 적은 `AXES` 항목이 **한 번도 안 돌고**, 등록되는 날에야 처음 돈다 — 그때 틀린 것이
 * 드러나면 이미 늦다(2차 물결 넷이 정확히 그렇게 판정기 밖에 서 있었다).
 *
 * ⚠️ 축을 **여기서 다시 구현하지 않는다.** 판정기의 `AXES` 를 **그대로 import 해서**
 * 부른다 — 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
 */
describe("중1 3차 확대 갈래 — 판정기(`probe-middle-top-m1`)의 축을 미리 댄다", () => {
  it("🔴 넷 다 `AXES` 에 적혀 있다 — 안 적으면 판정기가 «축을 안 적었다»를 찍는다", () => {
    for (const key of KEYS) {
      expect(AXES[key], `${key} 의 축이 없다`).toBeDefined();
    }
  });

  for (const key of KEYS) {
    it(`${key.split("|")[2]} — 굳힘을 지운 답 $0$% · 흔들면 늘 달라진다 (220판)`, () => {
      const axis = AXES[key]!;
      let shortcut = 0;
      let decorative = 0;
      for (const [seed, v] of BULK) {
        const p = build(key, seed, v);
        const want = answerNumber(p.answer);
        const loose = axis.withoutBinding(p.facts);
        if (loose !== null && loose === want) shortcut += 1;
        const shaken = axis.perturbed(p.facts);
        if (Number.isFinite(shaken) && shaken === want) decorative += 1;
        // 후보 개수는 「우연 수준 $1/k$」를 찍는 값이다 — `null`(축 없음)이거나 $2$ 이상.
        const k = axis.candidateCount(p.facts);
        expect(k === null || k >= 2, `${key} ${seed}/${v} 후보 ${k}`).toBe(
          true,
        );
      }
      expect(shortcut, `${key} 지름길`).toBe(0);
      expect(decorative, `${key} 굳힘이 장식`).toBe(0);
    });
  }

  it("`51V` 만 «축 없음»(후보 목록이 없다)이고 나머지 셋은 후보를 센다", () => {
    const f51 = build(K51, SEEDS[0]!).facts;
    expect(AXES[K51]!.candidateCount(f51)).toBeNull();
    for (const key of [K52, K53, K54]) {
      expect(
        AXES[key]!.candidateCount(build(key, SEEDS[0]!).facts),
      ).not.toBeNull();
    }
  });

  it("🔴 ㉠ ⑴ 지면 수 조합이 우연 수준을 넘지 않는다 (220판, 판정기의 자를 그대로 쓴다)", () => {
    /**
     * 실측(2026-09-02, 220판). **문턱이 아니라 기록**이다 — 이 값이 커지면 새 지름길이
     * 생긴 것이므로 빨개져야 한다. 우연 수준(후보 $k$개일 때 $1/k$)과 같이 적는다:
     * `52V` 창은 넷~일곱이라 $14$~$25$%, `53V`·`54V` 는 셋~다섯이라 $20$~$33$% 다.
     * 아래 넷은 **전부 그 아래**라 「굳힘을 안 읽고 집어서 맞는 자리」가 아니다.
     */
    const MEASURED: Record<string, number> = {
      [K51]: 0.02, // 실측 0.5% (`합`·`양수합`)
      [K52]: 0.05, // 실측 3.2% (`차 #0#3`, 우연 14~25%)
      // 🔴 실측 **10.5%**(`최소공배수 #0#2` = $\mathrm{lcm}(a,c)$, 우연 20~33%).
      //    2026-09-02 에 6.9% 에서 올랐다 — **지름길이 새로 생긴 것이 아니라
      //    분모가 좁아졌다.** 해설이 정답지 한 단을 넘어(1242px) 훑는 자리를
      //    $12\to8$ 로 줄였고, 그래서 유효 조합이 140 → 67 이 되면서 원래 있던
      //    우연 판의 «비율»이 커졌다. 전수 67조합으로 다시 세면 최고 규칙이
      //    **9.0%**(`합 #2#3`=$2c$ · `합 #0#2`=$a+c$)이고 `최소공배수 #0#2` 는
      //    **6.0%(4/67)** 다 — 220판 표본이 그 4조합을 더 자주 뽑았을 뿐이다.
      //    ⚠️ 우연 수준(후보 셋~다섯이면 20~33%)의 **절반 아래**라 「굳힘을 안 읽고
      //    집어서 맞는 자리」가 아니다. 그리고 개념 지름길(`withoutBinding` =
      //    `looseBoxCounts`)은 아래 시험에서 **0%** 다.
      [K53]: 0.11,
      [K54]: 0.03, // 실측 1.4% (우연 20~33%)
    };
    for (const key of KEYS) {
      const tally = new Map<string, number>();
      for (const [seed, v] of BULK) {
        const p = build(key, seed, v);
        const want = answerNumber(p.answer);
        for (const [name, val] of obviousCandidates(pageNumbers(p.content))) {
          if (val === want) tally.set(name, (tally.get(name) ?? 0) + 1);
        }
      }
      const best = Math.max(0, ...tally.values()) / BULK.length;
      expect(
        best,
        `${key} 최고 규칙 ${[...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]}`,
      ).toBeLessThanOrEqual(MEASURED[key]!);
    }
  });
});
