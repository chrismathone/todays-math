/**
 * 중1 **5차 확대 갈래 `f`**(`m1Top5f.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `85X` | 정다면체 다섯의 **표**를 손으로 적어 두고 «차이 $d$»로 찾는다 | 표를 안 쓴다 — 슐레플리 기호 $\{p,q\}$ 다섯 쌍에서 $V$·$E$·$F$ 를 **공식으로 지어** 그중 $E-V=d$ 인 것을 고른다 |
 * | `86X` | 기약분수 자료형(`rat`)으로 약분하며 나눈다 | 약분을 **한 번도 안 한다** — 분자·분모를 정수로만 들고 「$n_1d_2$ 가 $d_1n_2$ 로 나누어떨어지는가」로 정수 여부를 본다 |
 * | `87X` | 외각의 성질로 일차방정식을 세워 **푼다** | 방정식을 안 세운다 — $(\angle Y,\angle Z)$ 를 $1^\circ$부터 **전부 넣어 보고** 두 조건과 내각의 합을 다 만족하는 것을 찾는다 |
 * | `88X` | 넓이 공식 $2rh$·$rh$·$(a+b)h$ 를 쓴다 | 공식을 안 쓴다 — 단면의 **꼭짓점 좌표**를 만들어 **신발끈 공식**으로 넓이를 낸다 |
 *
 * ## 🔴 앞 물결이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을
 *    재어 **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어 기약인지
 *    보고, 분모가 $1$ 이 아닌지도 본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로
 *    0 이므로 **유형마다 찾은 자리 수를 못 박는다**(수 분수가 없는 셋은 `0` 으로 못 박는다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「많다↔적다」·「정수이다↔아니다」·
 *    「이웃하지 않는」·「지름↔반지름」·「큰↔작은」을 **낱말과 수를 함께** 판정하고,
 *    낱말을 뒤집으면 빨개지는 눈금을 **양성·음성 둘 다** 둔다. `toContain` 은 쓰지 않는다.
 * ㉴㉵ **답 쏠림과 지름길** → 씨앗 220×변형 3 에서 서로 다른 발문·정답과 **최빈 정답 비율**을
 *    재고, 지름길은 **널 모형(답을 판끼리 돌려 끼운 우연 수준)**과 견준다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는 지면에서
 * 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**). 손으로 쓴
 * 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면 이 눈금은
 * **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이 넷을
 * 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 — 그래서 `build()`
 * 가 제품의 후처리 **함수 자체**를 그대로 부르고, 등록되면 곧바로 `generateMiddleProblem`
 * 으로 갈아탄다(`m1Top2`~`m1Top4` 시험이 선 자리와 같다).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { bareNumbers } from "@/lib/elementary/rules";
import { createRng } from "@/lib/elementary/rng";
import { deriveThreeFormats, reversesOrder } from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  allQuotients,
  axialSectionAreas,
  edgeLengthSum,
  integerQuotients,
  M1_TOP_5F,
  distinctEdgeAlternatives,
  pageShortcutValues,
  platonicByGap,
  rat,
  ratDiv,
  ratIsInt,
  ratRecip,
  scaledValues,
  solveByExteriorChain,
} from "@/lib/middle/m1Top5f";
import * as MODULE from "@/lib/middle/m1Top5f";
import { estimateSolutionPx } from "@/lib/printOverflow";
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
  koreanJaccard,
  obviousCandidates,
} from "../../../scripts/qa/probe-middle-top-m1";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import {
  josaMismatches,
  numVowelFinal,
  pageSmells,
  trailingReadNumber,
} from "../helpers/midPage";

const K85 = "1-2|다면체와 회전체|85X";
const K86 = "1-1|정수와 유리수의 계산|86X";
const K87 = "1-2|다각형|87X";
const K88 = "1-2|다면체와 회전체|88X";
const KEYS = [K85, K86, K87, K88] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K85]: "심화중",
  [K86]: "심화상",
  [K87]: "심화중",
  [K88]: "심화상",
};

/** 리드가 등록 전량으로 실측해 준 소단원별 변형 폭 바닥. */
const VARIANT_FLOOR: Record<string, number> = {
  [K85]: 5,
  [K86]: 8,
  [K87]: 12,
  [K88]: 12,
};

const SEEDS = [20260903, 5, 17, 424242, 99991];

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판**. */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < 4; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

/** 지면 높이·변형 폭용 — 씨앗 $220$ × 변형 $3$ = **$660$ 판**(브리프의 600 이상). */
const WIDE: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 220; s += 1) {
    for (let v = 0; v < 3; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_5F.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차f ${key}`);
  assertChoiceCount(content, `중1 5차f ${key}`);
  assertChoiceMarks(content, `중1 5차f ${key}`);
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

/**
 * 우리말 수관형사 — 생성기의 `koreanCount` 를 **여기 다시 적는다.**
 *
 * 🔴 가져다 쓰면 동어반복이라 아무것도 안 지킨다. 검증이 「셈말이 개수와 맞나」를
 * 재는데 그 셈말을 생성기에서 가져오면 늘 맞는다(3차 물결에서 실제로 그 변이가
 * 92/92 초록이었다).
 */
const COUNT_WORD: Record<number, string> = {
  1: "한",
  2: "두",
  3: "세",
  4: "네",
  5: "다섯",
  6: "여섯",
};

/** 목록 글자(`$3$, $4$, $5$`)에서 수를 읽는다. */
function readList(listTex: string): number[] {
  return [...listTex.matchAll(/\$(-?\d+)\$/g)].map((m) => Number(m[1]));
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

// ── 🔴 해설의 산술 등식을 **직접 계산**하는 자 ─────────────────

type Rat2 = { n: number; d: number };

function r2(n: number, d = 1): Rat2 {
  if (d === 0) throw new Error("유리수의 분모가 $0$ 이다");
  const s = d < 0 ? -1 : 1;
  const g = gcd2(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}
const rAdd = (a: Rat2, b: Rat2): Rat2 => r2(a.n * b.d + b.n * a.d, a.d * b.d);
const rSub = (a: Rat2, b: Rat2): Rat2 => r2(a.n * b.d - b.n * a.d, a.d * b.d);
const rMul = (a: Rat2, b: Rat2): Rat2 => r2(a.n * b.n, a.d * b.d);
const rDiv = (a: Rat2, b: Rat2): Rat2 => r2(a.n * b.d, a.d * b.n);
const rEq = (a: Rat2, b: Rat2): boolean => a.n * b.d === b.n * a.d;

/**
 * 지면 수식 한 도막을 **유리수로 계산한다.**
 *
 * 다루는 것: 정수 · `+` · `-` · `\times` · `\div` · `\dfrac{}{}` · `()` · `\left(\right)`.
 * 그 밖의 글자가 있으면 **던진다** — 조용히 넘기면 못 센 자리가 「깨끗」으로 읽힌다.
 */
export function evalTex(src: string): Rat2 {
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
  function primary(): Rat2 {
    ws();
    for (const cmd of ["\\dfrac{", "\\frac{"]) {
      if (src.startsWith(cmd, i)) {
        i += cmd.length;
        const a = expr();
        eat("}");
        eat("{");
        const b = expr();
        eat("}");
        return rDiv(a, b);
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
      return r2(Number(s));
    }
    throw new Error(`읽을 수 없는 글자: «${src.slice(i, i + 10)}»`);
  }
  function unary(): Rat2 {
    ws();
    if (src[i] === "-") {
      i += 1;
      const v = unary();
      return r2(-v.n, v.d);
    }
    return primary();
  }
  function term(): Rat2 {
    let v = unary();
    for (;;) {
      ws();
      if (src.startsWith("\\times", i)) {
        i += 6;
        v = rMul(v, unary());
      } else if (src.startsWith("\\div", i)) {
        i += 4;
        v = rDiv(v, unary());
      } else break;
    }
    return v;
  }
  function expr(): Rat2 {
    let v = term();
    for (;;) {
      ws();
      if (src[i] === "+") {
        i += 1;
        v = rAdd(v, term());
      } else if (src[i] === "-") {
        i += 1;
        v = rSub(v, term());
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
 * ⚠️ 도 단위 `^\circ` 는 **연산이 아니라 단위**다. 먼저 지우지 않으면
 *    `$2\times32^\circ-38^\circ=26^\circ$` 가 통째로 「못 읽음」이 되어 검사 밖으로
 *    나간다 — `87X` 의 등식이 **전부** 그 모양이라 그러면 이 자는 그 유형에서
 *    구조적으로 0 이 된다.
 */
function stripDegree(body: string): string {
  return body.replace(/\^\\circ/g, "");
}

function isPureArithmetic(body: string): boolean {
  const stripped = body.replace(/\\(dfrac|frac|times|div|left|right)/g, "");
  return !/[A-Za-z\\]/.test(stripped);
}

/** 해설에서 **좌우가 안 맞는 산술 등식**을 모은다. 없으면 빈 배열. */
export function arithmeticEquationFailures(text: string): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const body = stripDegree(m[1]!);
    if (!body.includes("=")) continue;
    if (!isPureArithmetic(body)) continue;
    const parts = body.split("=").map((t) => t.trim());
    // 「$=2$」처럼 한쪽이 빈 것은 등식이 아니라 글의 조각이다(오일러 공식 줄에 있다).
    if (parts.some((t) => t === "")) continue;
    try {
      const vals = parts.map((p) => evalTex(p));
      for (let k = 1; k < vals.length; k += 1) {
        if (!rEq(vals[0]!, vals[k]!)) bad.push(body);
      }
    } catch (err) {
      bad.push(`${body} — ${(err as Error).message}`);
    }
  }
  return bad;
}

/** 해설에 나온 순수 산술 등식의 개수 — 「구조적으로 0」이 아님을 못 박으려고 센다. */
function arithmeticEquationCount(text: string): number {
  let n = 0;
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const body = stripDegree(m[1]!);
    if (!body.includes("=") || !isPureArithmetic(body)) continue;
    if (body.split("=").some((t) => t.trim() === "")) continue;
    n += 1;
  }
  return n;
}

/** 해설에 찍힌 모든 수. */
function solutionNumbers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

/**
 * 🔴 **해설에 나온 수가 전부 «어디서 왔는지» 설명되는가.**
 *
 * 등식 계산기는 「좌우가 맞는가」만 본다 — 아무 데서도 안 나온 수가 등식 없이 한 줄에
 * 놓이면 **구조적으로 못 본다.** 그래서 지면(`content`)만 보고 «나올 수 있는 수»의
 * 집합을 따로 지어 대조한다. 이 집합도 **지면에서** 짓는다(`facts` 를 안 본다).
 */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K85]: (content) => {
    const { gapA, lenA, gapB, lenB } = read85(content);
    const out = new Set<number>([2, gapA, gapB, lenA, lenB]);
    // 다섯 정다면체의 면의 개수는 해설이 통째로 늘어놓는다.
    for (const b of BUILT) out.add(b.f);
    for (const [gap, len] of [
      [gapA, lenA],
      [gapB, lenB],
    ] as const) {
      const s = solidByGap(gap);
      out.add(s.f);
      out.add(s.p);
      out.add(s.p * s.f);
      out.add(s.e);
      out.add(s.e * len);
    }
    const x = Math.abs(solidByGap(gapA).e * lenA - solidByGap(gapB).e * lenB);
    out.add(x);
    return out;
  },
  [K86]: (content) => {
    const fr = read86(content);
    const out = new Set<number>();
    for (const f of fr) {
      out.add(Math.abs(f.n));
      out.add(f.d);
    }
    let sum = 0;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        if (i === j) continue;
        // 역수도 지면에 찍힌다.
        out.add(Math.abs(fr[j]!.n));
        out.add(fr[j]!.d);
        const q = r2(fr[i]!.n * fr[j]!.d, fr[i]!.d * fr[j]!.n);
        out.add(Math.abs(q.n));
        out.add(q.d);
        if (q.d === 1) sum += q.n;
      }
    }
    out.add(Math.abs(sum));
    return out;
  },
  [K87]: (content) => {
    const r = read87(content);
    const out = new Set<number>([180, r.a, r.b, r.c, r.e, r.a - 1, r.b - 1]);
    const den = 1 + r.b * (r.a - 1);
    out.add(den);
    out.add(180 - r.b * r.s1 * r.c - r.s2 * r.e);
    const ang = solveByExteriorChain(r.a, r.c, r.s1, r.b, r.e, r.s2);
    if (ang === null) throw new Error("87X: 각이 안 나온다");
    out.add(ang.angX);
    out.add(ang.angY);
    out.add(ang.angZ);
    out.add(180 - ang.angZ);
    return out;
  },
  [K88]: (content) => {
    const out = new Set<number>([1, 2]);
    for (const sh of read88(content)) {
      if (sh.kind === "직사각형") {
        out.add(sh.w);
        out.add(2 * sh.w);
        out.add(sh.h);
      } else if (sh.kind === "직각삼각형") {
        out.add(sh.r);
        out.add(2 * sh.r);
        out.add(sh.h);
      } else {
        out.add(sh.top);
        out.add(2 * sh.top);
        out.add(sh.bottom);
        out.add(2 * sh.bottom);
        out.add(2 * sh.top + 2 * sh.bottom);
        out.add(sh.h);
      }
      out.add(shoelace(sectionPolygon(sh)));
    }
    const areas = read88(content).map((sh) => shoelace(sectionPolygon(sh)));
    out.add(Math.max(...areas) - Math.min(...areas));
    return out;
  },
};

/** 지면의 `\dfrac{정수}{정수}` 를 모두 — 기약 검사용. */
function numericFractions(text: string): [number, number][] {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

/** 공용 조사 자가 **실제로 판정한** 자리 수 — 「구조적으로 0」과 「깨끗」을 가른다. */
function josaJudgedSites(text: string): number {
  let n = 0;
  for (const m of text.matchAll(/\$([^$]*)\$(을|를|은|는|와|과|가)/g)) {
    if (trailingReadNumber(m[1]!) !== null) n += 1;
  }
  return n;
}

/**
 * 🔴 **주격 조사 「이/가」는 공용 자의 사각이다.**
 *
 * `josaMismatches` 는 「이」를 `JOSA_PAIR` 에 안 넣는다 — 서술격 「$5$이다」와 안 갈려
 * 거짓 경보가 쏟아지기 때문이다(그 파일 주석에 적혀 있다). 그래서 「가를 써야 할
 * 자리에 이를 썼다」가 그 자에서는 **구조적으로 0**이다. 실제로 변이 시험에서
 * 「면의 개수는 $4$**이** 되고」로 바꿔 봤더니 92개 시험이 전부 초록이었다.
 *
 * 여기서는 조사가 붙는 **자리를 못 박아** 그 사각을 메운다 — 뒤에 「되」가 오므로
 * 서술격과 헷갈릴 일이 없다. 받침 판정은 시험 쪽 규칙(`numVowelFinal`)에서 온다.
 */
/**
 * 수식 도막과 **그 바로 뒤에 오는 글**을 짝지어 낸다.
 *
 * ⚠️ **정규식 `\$([^$]*)\$` 으로 하면 안 된다.** 그 꼴은 앞에서부터 `$` 를 둘씩
 * 짝짓는데, 한 번 어긋나면 **여는 `$` 와 닫는 `$` 를 거꾸로 잡아** 그 뒤의 자리를
 * 통째로 못 본다. 실제로 `88X` 는 한 줄에 수식이 여럿이라 그 방식으로 세면
 * **660자리가 0** 으로 나왔다 — 「깨끗」이 아니라 「못 셈」이다.
 */
function mathSpans(text: string): { body: string; after: string }[] {
  const parts = text.split("$");
  const out: { body: string; after: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    out.push({ body: parts[i]!, after: parts[i + 1] ?? "" });
  }
  return out;
}

function subjectJosaFailures(text: string): string[] {
  const bad: string[] = [];
  for (const { body, after } of mathSpans(text)) {
    // ⚠️ 「된다」는 「되」+「ㄴ다」가 아니라 한 글자 「된」이다 — `startsWith("이 되")` 로 재면
    //    `88X` 의 660자리가 통째로 0 이 된다(실측으로 그러금 나왔다).
    const m = /^(이|가) (되|된)/.exec(after);
    if (m === null) continue;
    const n = trailingReadNumber(body);
    if (n === null) continue;
    const want = numVowelFinal(n) ? "가" : "이";
    if (m[1] !== want) bad.push(`$…${body.slice(-12)}$${m[1]} → ${want}`);
  }
  return bad;
}

function subjectJosaSites(text: string): number {
  let n = 0;
  for (const { body, after } of mathSpans(text)) {
    if (!/^(이|가) (되|된)/.test(after)) continue;
    if (trailingReadNumber(body) !== null) n += 1;
  }
  return n;
}

/** 유형마다 「이/가 되」 자리가 판마다 **몇 개**인가 — 「0」이 «못 셈»이 안 되게. */
const SUBJECT_JOSA_PER_PAGE: Record<string, number> = {
  [K85]: 2,
  // `86X` 는 몫마다 **은/는**을 쓴다 — 그쪽은 공용 자가 이미 전량을 판정한다.
  [K86]: 0,
  [K87]: 1,
  [K88]: 3,
};

// ═══════════════════════════════════════════════════════════
// 지면 읽기 — 유형마다 발문 모양을 **못 박는다**
// ═══════════════════════════════════════════════════════════

const RE85 =
  /^두 정다면체 \(가\), \(나\)가 있다\. \(가\)는 모서리의 개수가 꼭짓점의 개수보다 \$(\d+)\$만큼 많고 한 모서리의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$이며, \(나\)는 모서리의 개수가 꼭짓점의 개수보다 \$(\d+)\$만큼 많고 한 모서리의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$이다\. \(가\)의 모든 모서리의 길이의 합과 \(나\)의 모든 모서리의 길이의 합의 차를 구하시오\.$/;

const RE86 =
  /^세 유리수 \$(-?\\dfrac\{\d+\}\{\d+\})\$, \$(-?\\dfrac\{\d+\}\{\d+\})\$, \$(-?\\dfrac\{\d+\}\{\d+\})\$ 중에서 서로 다른 두 수를 뽑아 \(앞의 수\)\$\\div\$\(뒤의 수\)를 계산한다\. 이때 나올 수 있는 여섯 개의 몫 중에서 정수인 것을 모두 더한 값을 구하시오\.$/;

const RE87 =
  /^삼각형 \$ABC\$에서 \$\\angle ([ABC])\$의 외각의 크기는 \$\\angle ([ABC])\$의 크기의 \$(\d+)\$배보다 \$(\d+)\^\\circ\$만큼 (크고|작고), \$\\angle ([ABC])\$의 외각의 크기는 \$\\angle ([ABC])\$의 크기의 \$(\d+)\$배보다 \$(\d+)\^\\circ\$만큼 (크다|작다)\. 이때 \$\\angle ([ABC])\$의 외각의 크기를 구하시오\.$/;

const RE88_HEAD =
  /^다음 세 평면도형을 각각 주어진 변을 회전축으로 하여 \$1\$회전 시켜 회전체를 만들었다\. 세 회전체를 각각 회전축을 포함하는 평면으로 자를 때 생기는 단면의 넓이 중에서 가장 큰 것과 가장 작은 것의 차를 구하시오\.$/;

const RE88_RECT =
  /^\((가|나|다)\) 가로의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, 세로의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 직사각형을 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 변을 회전축으로 한 것$/;

const RE88_TRI =
  /^\((가|나|다)\) 직각을 낀 두 변의 길이가 각각 \$(\d+)\\,\\mathrm\{cm\}\$, \$(\d+)\\,\\mathrm\{cm\}\$인 직각삼각형을 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 변을 회전축으로 한 것$/;

const RE88_TRAP =
  /^\((가|나|다)\) 윗변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, 아랫변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, 높이가 \$(\d+)\\,\\mathrm\{cm\}\$이고 두 밑변에 수직인 변이 있는 사다리꼴을 그 수직인 변을 회전축으로 한 것$/;

type Read85 = { gapA: number; lenA: number; gapB: number; lenB: number };
function read85(content: string): Read85 {
  const [ga, la, gb, lb] = grab(RE85, content, "85X");
  return {
    gapA: num(ga!),
    lenA: num(la!),
    gapB: num(gb!),
    lenB: num(lb!),
  };
}

type Frac = { n: number; d: number };
function readFrac(tex: string): Frac {
  const m = /^(-?)\\dfrac\{(\d+)\}\{(\d+)\}$/.exec(tex);
  if (m === null) throw new Error(`분수 모양이 다르다 — ${tex}`);
  const n = Number(m[2]) * (m[1] === "-" ? -1 : 1);
  const d = Number(m[3]);
  if (d < 2) throw new Error(`분모가 $2$ 미만이다 — ${tex}`);
  if (gcd2(Math.abs(n), d) !== 1) throw new Error(`기약이 아니다 — ${tex}`);
  return { n, d };
}

function read86(content: string): Frac[] {
  const parts = grab(RE86, content, "86X");
  return parts.map((p) => readFrac(p!));
}

type Read87 = {
  lx: string;
  ly: string;
  lz: string;
  a: number;
  c: number;
  s1: number;
  b: number;
  e: number;
  s2: number;
};
function read87(content: string): Read87 {
  const [x1, y1, a, c, w1, y2, z1, b, e, w2, z2] = grab(RE87, content, "87X");
  if (y1 !== y2) throw new Error("87X: 사슬의 가운데 꼭짓점이 어긋난다");
  if (z1 !== z2) throw new Error("87X: 묻는 꼭짓점이 어긋난다");
  const labels = new Set([x1!, y1!, z1!]);
  if (labels.size !== 3) throw new Error("87X: 세 꼭짓점이 서로 다르지 않다");
  return {
    lx: x1!,
    ly: y1!,
    lz: z1!,
    a: num(a!),
    c: num(c!),
    s1: w1 === "크고" ? 1 : -1,
    b: num(b!),
    e: num(e!),
    s2: w2 === "크다" ? 1 : -1,
  };
}

type Shape =
  | { label: string; kind: "직사각형"; w: number; h: number }
  | { label: string; kind: "직각삼각형"; r: number; h: number }
  | { label: string; kind: "사다리꼴"; top: number; bottom: number; h: number };

function read88(content: string): Shape[] {
  const lines = content.split("\n");
  if (lines.length !== 4) throw new Error(`88X: 줄이 넷이 아니다 — ${content}`);
  grab(RE88_HEAD, lines[0]!, "88X 머리");
  const out: Shape[] = [];
  for (const line of lines.slice(1)) {
    const rect = RE88_RECT.exec(line);
    if (rect) {
      if (rect[3] !== rect[4])
        throw new Error("88X: 직사각형의 회전축이 세로가 아니다");
      out.push({
        label: rect[1]!,
        kind: "직사각형",
        w: num(rect[2]!),
        h: num(rect[3]!),
      });
      continue;
    }
    const tri = RE88_TRI.exec(line);
    if (tri) {
      if (tri[3] !== tri[4])
        throw new Error("88X: 직각삼각형의 회전축이 어긋난다");
      out.push({
        label: tri[1]!,
        kind: "직각삼각형",
        r: num(tri[2]!),
        h: num(tri[3]!),
      });
      continue;
    }
    const trap = RE88_TRAP.exec(line);
    if (trap) {
      const top = num(trap[2]!);
      const bottom = num(trap[3]!);
      if (top >= bottom)
        throw new Error("88X: 사다리꼴의 윗변이 아랫변보다 짧지 않다");
      out.push({
        label: trap[1]!,
        kind: "사다리꼴",
        top,
        bottom,
        h: num(trap[4]!),
      });
      continue;
    }
    throw new Error(`88X: 평면도형 줄 모양이 다르다 — ${line}`);
  }
  if (out.map((s) => s.label).join("") !== "가나다") {
    throw new Error("88X: 라벨이 (가)(나)(다) 차례가 아니다");
  }
  if (new Set(out.map((s) => s.kind)).size !== 3) {
    throw new Error("88X: 세 평면도형이 서로 다른 종류가 아니다");
  }
  return out;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

/**
 * 🔴 **정다면체 표를 안 쓴다.** 슐레플리 기호 $\{p,q\}$(한 면이 정$p$각형이고 한
 * 꼭짓점에 $q$ 개가 모인다) 다섯 쌍에서 공식으로 $V$·$E$·$F$ 를 짓는다.
 *
 * $\dfrac1p+\dfrac1q-\dfrac12=\dfrac1E$ 이므로 $E=\dfrac{2pq}{4-(p-2)(q-2)}$ 이고,
 * $V=\dfrac{2E}{q}$, $F=\dfrac{2E}{p}$ 다. 생성기의 표와 **한 글자도 안 겹친다.**
 */
const SCHLAFLI: readonly (readonly [number, number])[] = [
  [3, 3],
  [4, 3],
  [3, 4],
  [5, 3],
  [3, 5],
];

export function platonicFromSchlafli(): {
  p: number;
  q: number;
  v: number;
  e: number;
  f: number;
}[] {
  return SCHLAFLI.map(([p, q]) => {
    const den = 4 - (p - 2) * (q - 2);
    if (den <= 0) throw new Error(`정다면체가 아니다 — {${p},${q}}`);
    const e = (2 * p * q) / den;
    const v = (2 * e) / q;
    const f = (2 * e) / p;
    for (const t of [e, v, f]) {
      if (!Number.isInteger(t)) throw new Error(`정수가 아니다 — {${p},${q}}`);
    }
    if (v - e + f !== 2) throw new Error(`오일러 공식이 안 맞다 — {${p},${q}}`);
    return { p, q, v, e, f };
  });
}

const BUILT = platonicFromSchlafli();

function solidByGap(gap: number): {
  p: number;
  v: number;
  e: number;
  f: number;
} {
  const hits = BUILT.filter((s) => s.e - s.v === gap);
  if (hits.length !== 1) {
    throw new Error(
      `«모서리 $-$ 꼭짓점 $=${gap}$» 인 정다면체가 ${hits.length} 개다`,
    );
  }
  return hits[0]!;
}

/** 신발끈 공식 — 넓이 공식을 한 번도 안 쓴다. */
function shoelace(pts: readonly (readonly [number, number])[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** 회전축을 포함하는 단면의 꼭짓점 — 회전축은 $y$ 축이다. */
function sectionPolygon(s: Shape): [number, number][] {
  if (s.kind === "직사각형") {
    return [
      [-s.w, 0],
      [s.w, 0],
      [s.w, s.h],
      [-s.w, s.h],
    ];
  }
  if (s.kind === "직각삼각형") {
    return [
      [-s.r, 0],
      [s.r, 0],
      [0, s.h],
    ];
  }
  return [
    [-s.bottom, 0],
    [s.bottom, 0],
    [s.top, s.h],
    [-s.top, s.h],
  ];
}

const VERIFY: Record<string, (content: string) => number> = {
  [K85]: (content) => {
    const { gapA, lenA, gapB, lenB } = read85(content);
    if (gapA === gapB) throw new Error("85X: 두 정다면체가 같다");
    const sa = solidByGap(gapA);
    const sb = solidByGap(gapB);
    const sumA = sa.e * lenA;
    const sumB = sb.e * lenB;
    if (sumA === sumB) throw new Error("85X: 두 합이 같아 차가 $0$ 이다");
    const x = Math.abs(sumA - sumB);
    if (pageShortcutValues([gapA, lenA, gapB, lenB]).has(x)) {
      throw new Error("85X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K86]: (content) => {
    const fr = read86(content);
    if (new Set(fr.map((f) => f.d)).size < 2) {
      throw new Error("86X: 세 분모가 모두 같아 지면이 답을 흘린다");
    }
    if (new Set(fr.map((f) => Math.sign(f.n))).size < 2) {
      throw new Error("86X: 부호가 셋 다 같다");
    }
    if (new Set(fr.map((f) => `${f.n}/${f.d}`)).size !== 3) {
      throw new Error("86X: 세 유리수가 서로 다르지 않다");
    }
    // 🔴 약분을 **한 번도 안 한다.** $\dfrac{n_1}{d_1}\div\dfrac{n_2}{d_2}$ 가 정수인 것은
    //    $n_1d_2$ 가 $d_1n_2$ 로 나누어떨어지는 것과 같다.
    let sum = 0;
    let count = 0;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        if (i === j) continue;
        const up = fr[i]!.n * fr[j]!.d;
        const dn = fr[i]!.d * fr[j]!.n;
        if (up % dn !== 0) continue;
        sum += up / dn;
        count += 1;
      }
    }
    if (count < 2) throw new Error(`86X: 정수인 몫이 ${count} 개다`);
    if (sum === 0) throw new Error("86X: 정수인 몫의 합이 $0$ 이다");
    const nums = fr.flatMap((f) => [Math.abs(f.n), f.d]);
    if (pageShortcutValues(nums).has(sum)) {
      throw new Error("86X: 답이 지면 수 조합으로 나온다");
    }
    return sum;
  },

  [K87]: (content) => {
    const r = read87(content);
    // 🔴 방정식을 안 세운다 — $(\angle Y,\angle Z)$ 를 **전부 넣어 본다**.
    const found: number[] = [];
    for (let y = 1; y <= 178; y += 1) {
      for (let z = 1; z <= 178; z += 1) {
        const xAng = 180 - y - z;
        if (xAng < 1) break;
        if (y + z !== r.a * y + r.s1 * r.c) continue;
        if (z + xAng !== r.b * z + r.s2 * r.e) continue;
        found.push(z);
      }
    }
    if (found.length !== 1) {
      throw new Error(`87X: 조건에 맞는 삼각형이 ${found.length} 개다`);
    }
    const angZ = found[0]!;
    for (const v of [angZ]) {
      if (v < 10 || v > 160)
        throw new Error(`87X: 각이 $10$~$160$ 밖이다 — ${v}`);
    }
    const x = 180 - angZ;
    if (pageShortcutValues([r.a, r.c, r.b, r.e]).has(x)) {
      throw new Error("87X: 답이 지면 수 조합으로 나온다");
    }
    if (scaledValues(r.c).has(x) || scaledValues(r.e).has(x)) {
      throw new Error("87X: 답이 지면 수를 몇 번 곱하거나 나눈 값과 같다");
    }
    return x;
  },

  [K88]: (content) => {
    const shapes = read88(content);
    const areas = shapes.map((s) => shoelace(sectionPolygon(s)));
    for (const a of areas) {
      if (!Number.isInteger(a))
        throw new Error(`88X: 넓이가 정수가 아니다 — ${a}`);
    }
    if (new Set(areas).size !== 3)
      throw new Error("88X: 세 넓이가 서로 다르지 않다");
    const big = Math.max(...areas);
    const small = Math.min(...areas);
    if (big > small * 2.5)
      throw new Error("88X: 가장 큰 것이 작은 것의 $2.5$배를 넘는다");
    if (small < 30 || big > 300) throw new Error("88X: 넓이가 창 밖이다");
    const x = big - small;
    // 🔴 **지면에 찍힌 그대로** 수를 뽑는다 — 회전축이 되는 변의 길이는 **두 번**
    //    찍히므로(「세로의 길이가 $5$」이자 「길이가 $5$인 변」) 치수 목록을 손으로
    //    적으면 그 합을 못 만든다. 실측으로 그 한 판이 새어 나갔다.
    const nums = [...content.matchAll(/\d+/g)].map((m) => Number(m[0]));
    if (pageShortcutValues(nums).has(x)) {
      throw new Error("88X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },
};

// ═══════════════════════════════════════════════════════════
// ㉳ 해설의 «말» — 낱말과 수를 **함께** 판정한다
// ═══════════════════════════════════════════════════════════

type Claim = {
  label: string;
  ok: (content: string, solution: string) => boolean;
};

const CLAIMS: Record<string, Claim[]> = {
  [K85]: [
    {
      label: "오일러 공식을 옳게 적는다",
      ok: (_c, s) =>
        s.includes("(꼭짓점의 개수)$-$(모서리의 개수)$+$(면의 개수)$=2$") &&
        s.includes("(면의 개수)$=$(모서리의 개수)$-$(꼭짓점의 개수)$+2$"),
    },
    {
      label: "정다면체가 다섯 가지뿐이라고 적고 면의 개수를 옳게 늘어놓는다",
      ok: (_c, s) => {
        const m =
          /정다면체는 (.+?)의 다섯 가지뿐이고 그 면의 개수는 차례로 (.+?)이므로/.exec(
            s,
          );
        if (m === null) return false;
        const names = m[1]!.split(", ");
        const faces = readList(m[2]!);
        const want = BUILT.map((b) => b.f).sort((a, b) => a - b);
        return (
          names.length === 5 &&
          faces.length === 5 &&
          faces.every((v, i) => v === want[i])
        );
      },
    },
    {
      label: "두 정다면체마다 «많으므로 → 면의 개수 → 이름»이 맞다",
      ok: (c, s) => {
        const { gapA, gapB } = read85(c);
        for (const [label, gap] of [
          ["(가)", gapA],
          ["(나)", gapB],
        ] as const) {
          const solid = solidByGap(gap);
          const line = `${label}는 모서리의 개수가 꼭짓점의 개수보다 $${gap}$만큼 많으므로 면의 개수는 $${gap}+2=${solid.f}$`;
          if (!s.includes(line)) return false;
        }
        return true;
      },
    },
    {
      label: "한 모서리마다 두 면이 만난다고 적고 실제로 $2$ 로 나눈다",
      ok: (c, s) => {
        const { gapA, gapB } = read85(c);
        for (const gap of [gapA, gapB]) {
          const solid = solidByGap(gap);
          const total = solid.p * solid.f;
          const line = `면의 변은 모두 $${solid.p}\\times${solid.f}=${total}$개인데, 한 모서리마다 두 면이 만나므로 모서리의 개수는 $${total}\\div2=${solid.e}$이다.`;
          if (!s.includes(line)) return false;
        }
        return true;
      },
    },
  ],
  [K86]: [
    {
      label: "나눗셈을 역수의 곱셈으로 고친다고 적는다",
      ok: (_c, s) => s.includes("나누는 수의 역수를 곱하는 것과 같다"),
    },
    {
      label: "경우가 여섯 가지라고 적고 실제로 여섯 줄을 적는다",
      ok: (_c, s) =>
        s.includes("경우는 여섯 가지이므로") &&
        (s.match(/\$(?:은|는) 정수(?:이|가 아니)다\./g) ?? []).length === 6,
    },
    {
      label: "몫마다 «정수이다 / 정수가 아니다» 판정이 값과 맞는다",
      ok: (c, s) => {
        const fr = read86(c);
        for (let i = 0; i < 3; i += 1) {
          for (let j = 0; j < 3; j += 1) {
            if (i === j) continue;
            const up = fr[i]!.n * fr[j]!.d;
            const dn = fr[i]!.d * fr[j]!.n;
            const isInt = up % dn === 0;
            const q = r2(up, dn);
            const tex =
              q.d === 1
                ? `${q.n}`
                : q.n < 0
                  ? `-\\dfrac{${-q.n}}{${q.d}}`
                  : `\\dfrac{${q.n}}{${q.d}}`;
            const at = s.indexOf(`=${tex}$`);
            if (at < 0) return false;
            const tail = s.slice(at, at + 60);
            if (isInt && !/^=[^$]*\$(은|는) 정수이다\./.test(tail))
              return false;
            if (!isInt && !/^=[^$]*\$(은|는) 정수가 아니다\./.test(tail)) {
              return false;
            }
          }
        }
        return true;
      },
    },
    {
      label: "마지막 합에 «정수이다»로 판정한 것만 들어간다",
      ok: (c, s) => {
        const fr = read86(c);
        const ints: number[] = [];
        for (let i = 0; i < 3; i += 1) {
          for (let j = 0; j < 3; j += 1) {
            if (i === j) continue;
            const up = fr[i]!.n * fr[j]!.d;
            const dn = fr[i]!.d * fr[j]!.n;
            if (up % dn === 0) ints.push(up / dn);
          }
        }
        const m = /몫이 정수인 것은 (.+?)의 (\S+) 가지이다\./.exec(s);
        if (m === null) return false;
        const listed = readList(m[1]!);
        if (m[2] !== COUNT_WORD[ints.length]) return false;
        if (listed.length !== ints.length) return false;
        if (!listed.every((v, i) => v === ints[i])) return false;
        const sum = ints.reduce((a, b) => a + b, 0);
        const terms = ints
          .map((v, i) => (i === 0 ? String(v) : v < 0 ? `-${-v}` : `+${v}`))
          .join("");
        return s.includes(`따라서 구하는 값은 $${terms}=${sum}$이다.`);
      },
    },
  ],
  [K87]: [
    {
      label: "외각의 성질을 «이웃하지 않는 두 내각의 합»으로 적는다",
      ok: (_c, s) =>
        s.includes(
          "삼각형의 한 외각의 크기는 그와 이웃하지 않는 두 내각의 크기의 합과 같다.",
        ),
    },
    {
      label: "세 내각의 합을 $180^\\circ$ 라고 적는다",
      ok: (_c, s) =>
        s.includes("삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로"),
    },
    {
      label: "세 각의 검산 줄이 실제로 $180$ 이 된다",
      ok: (_c, s) => {
        const m =
          /세 내각의 크기를 더하면 \$(\d+)\+(\d+)\+(\d+)=(\d+)\$이 되어 조건에 맞는다\./.exec(
            s,
          );
        if (m === null) return false;
        const [p, q, t, sum] = m.slice(1).map(Number) as [
          number,
          number,
          number,
          number,
        ];
        return p + q + t === 180 && sum === 180;
      },
    },
    {
      label: "마지막 줄이 $180$ 에서 그 내각을 뺀 값이다",
      ok: (c, s) => {
        const m =
          /따라서 \$\\angle ([ABC])\$의 외각의 크기는 \$180\$과 \$(\d+)\$의 차인 \$180-(\d+)=(\d+)\$에서 \$(\d+)\^\\circ\$이다\.$/.exec(
            s,
          );
        if (m === null) return false;
        if (m[1] !== read87(c).lz) return false;
        if (m[2] !== m[3]) return false;
        return 180 - Number(m[3]) === Number(m[4]) && m[4] === m[5];
      },
    },
  ],
  [K88]: [
    {
      label: "평면도형마다 생기는 회전체의 이름이 맞다",
      ok: (c, s) => {
        // ⚠️ 회전체 이름 뒤의 조사가 이름마다 다르다(원기둥**이** · 원뿔**이** ·
        //    원뿔대**가**). 하나로 뭉개면 이 검사가 늘 거짓이 되어 «가드»가 아니라
        //    «늘 빨간 것»이 된다 — 그러면 다음 사람이 검사를 무른다.
        const want: Record<Shape["kind"], string> = {
          직사각형: "원기둥이 생긴다",
          직각삼각형: "원뿔이 생긴다",
          사다리꼴: "원뿔대가 생긴다",
        };
        for (const sh of read88(c)) {
          const line = s
            .split("\n")
            .find((l) => l.startsWith(`(${sh.label}) `));
          if (line === undefined) return false;
          if (!line.includes(want[sh.kind])) return false;
          for (const [k, v] of Object.entries(want)) {
            if (k !== sh.kind && line.includes(v)) return false;
          }
        }
        return true;
      },
    },
    {
      label: "회전축에 수직인 치수가 «지름»이 된다고 적고 $2$ 를 곱한다",
      ok: (c, s) => {
        for (const sh of read88(c)) {
          if (sh.kind === "사다리꼴") continue;
          const r = sh.kind === "직사각형" ? sh.w : sh.r;
          const line = `밑면인 원의 지름과 같은 $2\\times${r}=${2 * r}$`;
          if (!s.includes(line)) return false;
        }
        return true;
      },
    },
    {
      label: "«가장 큰 것»과 «가장 작은 것»의 라벨과 값이 맞다",
      ok: (c, s) => {
        const shapes = read88(c);
        const areas = shapes.map((sh) => shoelace(sectionPolygon(sh)));
        const big = Math.max(...areas);
        const small = Math.min(...areas);
        const bigLabel = shapes[areas.indexOf(big)]!.label;
        const smallLabel = shapes[areas.indexOf(small)]!.label;
        return s.includes(
          `가장 큰 것은 (${bigLabel})의 $${big}$이고 가장 작은 것은 (${smallLabel})의 $${small}$이다.`,
        );
      },
    },
    {
      label: "마지막 줄이 큰 것에서 작은 것을 뺀 값이다",
      ok: (c, s) => {
        const areas = read88(c).map((sh) => shoelace(sectionPolygon(sh)));
        const big = Math.max(...areas);
        const small = Math.min(...areas);
        return s.includes(
          `따라서 구하는 차는 $${big}-${small}=${big - small}$이므로`,
        );
      },
    },
  ],
};

function missingClaims(
  key: string,
  content: string,
  solution: string,
): string[] {
  return CLAIMS[key]!.filter((cl) => {
    try {
      return !cl.ok(content, solution);
    } catch {
      return true;
    }
  }).map((cl) => cl.label);
}

/** ㉳ 눈금 — 낱말을 뒤집으면 **반드시** 빨개져야 한다. */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K85]: [
    ["(면의 개수)$=2$", "(면의 개수)$=3$"],
    ["만큼 많으므로", "만큼 적으므로"],
    ["한 모서리마다 두 면이 만나므로", "한 모서리마다 세 면이 만나므로"],
    ["의 다섯 가지뿐이고", "의 네 가지뿐이고"],
  ],
  [K86]: [
    ["나누는 수의 역수를", "나누는 수의 약수를"],
    ["경우는 여섯 가지이므로", "경우는 다섯 가지이므로"],
    ["은 정수이다.", "은 정수가 아니다."],
    ["몫이 정수인 것은 $", "몫이 정수인 것은 $1"],
  ],
  [K87]: [
    ["그와 이웃하지 않는 두 내각", "그와 이웃하는 두 내각"],
    [
      "세 내각의 크기의 합은 $180^\\circ$이므로",
      "세 내각의 크기의 합은 $170^\\circ$이므로",
    ],
    ["세 내각의 크기를 더하면 $", "세 내각의 크기를 더하면 $1"],
    ["의 차인 $180-", "의 합인 $180-"],
  ],
  [K88]: [
    ["밑면인 원의 지름과 같은", "밑면인 원의 반지름과 같은"],
    ["가장 큰 것은 (", "가장 작은 것은 ("],
    ["원뿔대가 생긴다", "원뿔이 생긴다"],
    ["따라서 구하는 차는 $", "따라서 구하는 합은 $"],
  ],
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 🔴 엔진을 **한 번도 안 거친** 손으로 쓴 지면. 답은 사람이 따로 계산했다. */
const HAND: readonly { key: string; content: string; want: number }[] = [
  {
    // 정사면체($E=6$)와 정십이면체($E=30$): $7\times6=42$, $3\times30=90$, 차 $48$.
    key: K85,
    content:
      "두 정다면체 (가), (나)가 있다. (가)는 모서리의 개수가 꼭짓점의 개수보다 $2$만큼 많고 한 모서리의 길이가 $7\\,\\mathrm{cm}$이며, (나)는 모서리의 개수가 꼭짓점의 개수보다 $10$만큼 많고 한 모서리의 길이가 $3\\,\\mathrm{cm}$이다. (가)의 모든 모서리의 길이의 합과 (나)의 모든 모서리의 길이의 합의 차를 구하시오.",
    want: 48,
  },
  {
    // $\dfrac16$, $-\dfrac12$, $-\dfrac53$ — 사람이 손으로 여섯을 다 셈했다.
    //   $\left(-\dfrac12\right)\div\dfrac16=-3$ · $\left(-\dfrac53\right)\div\dfrac16=-10$ (정수)
    //   $\dfrac16\div\left(-\dfrac12\right)=-\dfrac13$ · $\dfrac16\div\left(-\dfrac53\right)=-\dfrac1{10}$
    //   $\left(-\dfrac12\right)\div\left(-\dfrac53\right)=\dfrac3{10}$ ·
    //   $\left(-\dfrac53\right)\div\left(-\dfrac12\right)=\dfrac{10}3$ (정수 아님)
    //   합은 $-3-10=-13$.
    key: K86,
    content:
      "세 유리수 $\\dfrac{1}{6}$, $-\\dfrac{1}{2}$, $-\\dfrac{5}{3}$ 중에서 서로 다른 두 수를 뽑아 (앞의 수)$\\div$(뒤의 수)를 계산한다. 이때 나올 수 있는 여섯 개의 몫 중에서 정수인 것을 모두 더한 값을 구하시오.",
    want: -13,
  },
  {
    // $\angle A$외$=\angle B+\angle C=3\angle B+10^\circ$, $\angle B$외$=2\angle C-6^\circ$.
    // 손 계산: $\angle C=2\angle B+10$, $\angle A=\angle C-6$ → $\angle B+2\angle C=186$
    // → $5\angle B=166$ … 정수가 아니므로 **음성**이다(아래 NEGATIVE 로 옮겼다).
    // 여기 것은 $a=3,c=15,+$ · $b=2,e=10,-$ → $\angle B+2\angle C=190$,
    // $\angle C=2\angle B+15$ → $5\angle B=160$, $\angle B=32$, $\angle C=79$, $\angle A=69$.
    key: K87,
    content:
      "삼각형 $ABC$에서 $\\angle A$의 외각의 크기는 $\\angle B$의 크기의 $3$배보다 $15^\\circ$만큼 크고, $\\angle B$의 외각의 크기는 $\\angle C$의 크기의 $2$배보다 $10^\\circ$만큼 작다. 이때 $\\angle C$의 외각의 크기를 구하시오.",
    want: 101,
  },
  {
    // 사람이 손으로 셈했다 — 원기둥 단면 $2\times3\times5=30$ · 원뿔 단면
    // $2\times3\times11\div2=33$ · 원뿔대 단면 $(2\times3+2\times7)\times5\div2=50$.
    // 가장 큰 것 $50$, 가장 작은 것 $30$, 차 $20$.
    key: K88,
    content:
      "다음 세 평면도형을 각각 주어진 변을 회전축으로 하여 $1$회전 시켜 회전체를 만들었다. 세 회전체를 각각 회전축을 포함하는 평면으로 자를 때 생기는 단면의 넓이 중에서 가장 큰 것과 가장 작은 것의 차를 구하시오.\n(가) 가로의 길이가 $3\\,\\mathrm{cm}$, 세로의 길이가 $5\\,\\mathrm{cm}$인 직사각형을 길이가 $5\\,\\mathrm{cm}$인 변을 회전축으로 한 것\n(나) 직각을 낀 두 변의 길이가 각각 $3\\,\\mathrm{cm}$, $11\\,\\mathrm{cm}$인 직각삼각형을 길이가 $11\\,\\mathrm{cm}$인 변을 회전축으로 한 것\n(다) 윗변의 길이가 $3\\,\\mathrm{cm}$, 아랫변의 길이가 $7\\,\\mathrm{cm}$, 높이가 $5\\,\\mathrm{cm}$이고 두 밑변에 수직인 변이 있는 사다리꼴을 그 수직인 변을 회전축으로 한 것",
    want: 20,
  },
];

/** 🔴 음성 — 불변식을 어긴 지면은 **반드시 던져야** 한다. */
const NEGATIVE: readonly { key: string; content: string; why: string }[] = [
  {
    key: K85,
    content: HAND[0]!.content.replace("$10$만큼", "$2$만큼"),
    why: "두 정다면체가 같다",
  },
  {
    key: K85,
    content: HAND[0]!.content.replace("$10$만큼", "$3$만큼"),
    why: "면이 다섯인 정다면체는 없다",
  },
  {
    key: K86,
    content: HAND[1]!.content.replace("$-\\dfrac{5}{3}$", "$-\\dfrac{5}{4}$"),
    why: "정수인 몫이 하나뿐이다",
  },
  {
    key: K86,
    content: HAND[1]!.content.replace("$\\dfrac{1}{6}$", "$\\dfrac{2}{12}$"),
    why: "기약이 아닌 분수가 지면에 있다",
  },
  {
    key: K87,
    content: HAND[2]!.content.replace("$15^\\circ$", "$11^\\circ$"),
    why: "각이 정수로 떨어지지 않아 조건에 맞는 삼각형이 없다",
  },
  {
    key: K88,
    content: HAND[3]!.content.replace(
      "높이가 $5\\,\\mathrm{cm}$이고",
      "높이가 $3\\,\\mathrm{cm}$이고",
    ),
    why: "원뿔대와 원기둥의 단면 넓이가 둘 다 $30$ 이라 «가장 큰 것»이 갈리지 않는다",
  },
];

describe("중1 5차 f — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    expect(HAND.length).toBe(4);
    for (const h of HAND) {
      expect(VERIFY[h.key]!(h.content), h.key).toBe(h.want);
    }
  });

  it("🔴 음성 — 불변식을 어긴 지면은 반드시 던진다", () => {
    expect(NEGATIVE.length).toBe(6);
    for (const n of NEGATIVE) {
      expect(() => VERIFY[n.key]!(n.content), `${n.key}: ${n.why}`).toThrow();
    }
  });

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·못 읽음·도 단위를 각각 가른다", () => {
    expect(arithmeticEquationFailures("$2+3=5$")).toEqual([]);
    expect(arithmeticEquationFailures("$2+3=6$").length).toBe(1);
    expect(
      arithmeticEquationFailures("$\\left(4+28\\right)\\times8\\div2=128$"),
    ).toEqual([]);
    expect(
      arithmeticEquationFailures("$\\left(4+28\\right)\\times8\\div2=127$")
        .length,
    ).toBe(1);
    // 도 단위는 **단위**라 지우고 읽는다 — 안 지우면 이 유형의 등식이 통째로 검사 밖이다.
    expect(
      arithmeticEquationFailures("$2\\times32^\\circ-38^\\circ=26^\\circ$"),
    ).toEqual([]);
    expect(
      arithmeticEquationFailures("$2\\times32^\\circ-38^\\circ=27^\\circ$")
        .length,
    ).toBe(1);
    // 문자가 있으면 판정하지 않는다(거짓 빨강 금지).
    expect(arithmeticEquationFailures("$11\\angle C=352^\\circ$")).toEqual([]);
    expect(arithmeticEquationCount("$11\\angle C=352^\\circ$")).toBe(0);
    expect(arithmeticEquationCount("$2+3=5$")).toBe(1);
  });

  it("🔴 수관형사 표가 생성기 것과 **다른 벌**이다 — 가져다 쓸 수가 없다", () => {
    // 생성기의 수관형사 표는 **내보내지 않는다.** 그래서 이 시험이 그것을 가져다
    // 쓰는 일이 구조적으로 불가능하다 — 「같은 표를 견주는」 동어반복이 안 생긴다.
    expect(Object.keys(MODULE)).not.toContain("koreanCount");
    expect(COUNT_WORD[2]).toBe("두");
    expect(COUNT_WORD[3]).toBe("세");
    expect(COUNT_WORD[6]).toBe("여섯");
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — 굳힘 함수와 음성 대조", () => {
  it("🔴 `platonicByGap` 이 슐레플리 기호로 지은 표와 완전히 같다", () => {
    for (const b of BUILT) {
      const got = platonicByGap(b.e - b.v);
      expect(got, `E-V=${b.e - b.v}`).not.toBeNull();
      expect(got!.faces).toBe(b.f);
      expect(got!.edges).toBe(b.e);
      expect(got!.vertices).toBe(b.v);
      expect(got!.sides).toBe(b.p);
    }
    // 다섯의 «차이»가 서로 달라야 이 열쇠가 이름을 굳힌다.
    expect(new Set(BUILT.map((b) => b.e - b.v)).size).toBe(5);
  });

  it("🔴 음성 대조 — 없는 «차이»에는 `null` 을 낸다 (그 자가 «아니오» 를 낼 수 있다)", () => {
    for (const gap of [1, 3, 5, 7, 8, 12, 20]) {
      expect(platonicByGap(gap), `gap=${gap}`).toBeNull();
    }
    expect(() => edgeLengthSum(3, 5)).toThrow();
  });

  it("🔴 `distinctEdgeAlternatives` 는 **모서리의 개수가 다른** 것만 낸다", () => {
    for (const b of BUILT) {
      const solid = platonicByGap(b.e - b.v)!;
      const alts = distinctEdgeAlternatives(solid);
      expect(alts.length, `${solid.name}`).toBeGreaterThan(0);
      for (const a of alts) {
        expect(a.edges, `${solid.name}`).not.toBe(solid.edges);
      }
    }
    // 음성 대조 — 정육면체와 정팔면체는 모서리가 **같다**(그래서 «한 칸 밀기»가 안 된다).
    expect(platonicByGap(4)!.edges).toBe(platonicByGap(6)!.edges);
    expect(platonicByGap(10)!.edges).toBe(platonicByGap(18)!.edges);
  });

  it("`integerQuotients` 는 손 계산과 맞는다", () => {
    const rs = [rat(-1, 6), rat(1, 3), rat(-3, 2)];
    expect(integerQuotients(rs).sort((a, b) => a - b)).toEqual([-2, 9]);
    expect(allQuotients(rs).length).toBe(6);
    expect(ratIsInt(ratDiv(rat(1, 3), rat(-1, 6)))).toBe(true);
    expect(ratRecip(rat(-3, 2))).toEqual({ n: -2, d: 3 });
  });

  it("🔴 음성 대조 — 정수인 몫이 **하나도 없는** 세 쌍이 실재한다", () => {
    expect(integerQuotients([rat(1, 2), rat(1, 3), rat(1, 5)])).toEqual([]);
    // 그리고 셋이 되는 짝(사슬)도 실재한다 — 개수 축이 2·3 둘 다 열려 있다.
    expect(integerQuotients([rat(1, 6), rat(1, 3), rat(2, 3)]).length).toBe(3);
  });

  it("`solveByExteriorChain` 은 손 계산과 맞는다", () => {
    // $a=3,c=15,+$ · $b=2,e=10,-$ → $\angle Y=32$, $\angle Z=79$, $\angle X=69$.
    expect(solveByExteriorChain(3, 15, 1, 2, 10, -1)).toEqual({
      angX: 69,
      angY: 32,
      angZ: 79,
    });
  });

  it("🔴 음성 대조 — 정수로 안 떨어지거나 각이 창 밖이면 `null` 이다", () => {
    // $D=1+2\times2=5$ 인데 $180-2\times11+10=168$ 이라 $5$ 로 안 나누어떨어진다.
    expect(solveByExteriorChain(3, 11, 1, 2, 10, -1)).toBeNull();
    // 정수로는 떨어지지만 세 각이 $9^\circ$, $102^\circ$, $69^\circ$ 라 창($10$~$160$) 밖이다.
    expect(solveByExteriorChain(2, 33, -1, 2, 60, -1)).toBeNull();
    // 그리고 **양성**이 실재한다 — 그래야 위 `null` 이 «못 셈»이 아니다.
    expect(solveByExteriorChain(3, 15, 1, 2, 10, -1)).not.toBeNull();
  });

  it("`axialSectionAreas` 는 신발끈 공식과 맞는다", () => {
    const cases = axialSectionAreas(
      { r: 5, h: 9 },
      { r: 6, h: 12 },
      { top: 3, bottom: 8, h: 8 },
    );
    expect(cases.map((c) => c.area)).toEqual([90, 72, 88]);
    expect(
      shoelace(sectionPolygon({ label: "가", kind: "직사각형", w: 5, h: 9 })),
    ).toBe(90);
    expect(
      shoelace(
        sectionPolygon({ label: "나", kind: "직각삼각형", r: 6, h: 12 }),
      ),
    ).toBe(72);
    expect(
      shoelace(
        sectionPolygon({
          label: "다",
          kind: "사다리꼴",
          top: 3,
          bottom: 8,
          h: 8,
        }),
      ),
    ).toBe(88);
  });

  it("🔴 음성 대조 — 세 넓이가 **같아지는** 치수가 실재한다 (그때는 «가장 큰 것»이 없다)", () => {
    const areas = axialSectionAreas(
      { r: 3, h: 6 },
      { r: 6, h: 6 },
      { top: 2, bottom: 4, h: 6 },
    ).map((c) => c.area);
    expect(new Set(areas).size).toBeLessThan(3);
  });

  it("`pageShortcutValues`·`scaledValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect(pageShortcutValues([3, 4]).has(12)).toBe(true);
    expect(pageShortcutValues([3, 4]).has(13)).toBe(false);
    expect(scaledValues(30).has(60)).toBe(true);
    expect(scaledValues(30).has(31)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5F).toHaveLength(4);
    expect(new Set(M1_TOP_5F.map((e) => e.key)).size).toBe(4);
    expect(M1_TOP_5F.map((e) => e.key)).toEqual([...KEYS]);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5F) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5F) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    expect(M1_TOP_5F.map((e) => e.unitSection)).toEqual([
      "정다면체",
      "유리수의 나눗셈",
      "삼각형의 내각과 외각",
      "회전체",
    ]);
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const on = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(on === 0 || on === KEYS.length, `등록된 것 ${on}/4`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_5F) {
      for (const seed of SEEDS) {
        const raw = e.handler(createRng(seed));
        expect(wrapDanClause(raw.content), e.key).toBe(raw.content);
        expect(tidySolution(raw.solution), e.key).toBe(raw.solution);
        expect(
          resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
          e.key,
        ).toBe(raw.difficulty);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — 지면과 값", () => {
  it("🔴 중1에 `심화중` 둘 · `심화상` 둘이 더 생겼다 (D-116 ⑴)", () => {
    const tiers = M1_TOP_5F.map(
      (e) => e.handler(createRng(SEEDS[0]!)).difficulty,
    );
    expect(tiers.filter((t) => t === "심화중").length).toBe(2);
    expect(tiers.filter((t) => t === "심화상").length).toBe(2);
  });

  for (const e of M1_TOP_5F) {
    describe(e.key, () => {
      it("갈래가 못 박은 그대로다 (씨앗·변형을 가로질러)", () => {
        for (const [seed, v] of BULK) {
          expect(
            build(e.key, seed, v).difficulty,
            `${e.key} ${seed}/${v}`,
          ).toBe(EXPECTED_TIER[e.key]);
        }
      });

      it("🔴 220판을 지면만 보고 다시 풀면 같은 답이 나온다 — 생성기 산술을 안 옮겨 적는다", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(VERIFY[e.key]!(p.content), `${e.key} 씨앗 ${seed}/${v}`).toBe(
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
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const where = `${e.key} ${seed}/${v}`;
          expect(brokenRender(p.content), `${where} 발문 렌더`).toBe(false);
          expect(brokenRender(p.solution), `${where} 해설 렌더`).toBe(false);
          expect(brokenRender(p.answer), `${where} 정답 렌더`).toBe(false);
          expect(pageSmells(p.content), `${where} 발문 냄새`).toEqual([]);
          expect(pageSmells(p.solution), `${where} 해설 냄새`).toEqual([]);
          expect(josaMismatches(p.content), `${where} 발문 조사`).toEqual([]);
          expect(josaMismatches(p.solution), `${where} 해설 조사`).toEqual([]);
          expect(bareNumbers(p.content), `${where} 발문 맨 숫자`).toEqual([]);
          expect(bareNumbers(p.answer), `${where} 정답 맨 숫자`).toEqual([]);
          expect(pointsAtFigure(p.content), `${where} 그림 지시`).toBeNull();
        }
      });

      it("🔴 공용 조사 자가 이 유형에서 **구조적으로 0 이 아니다** — 실제로 읽는 자리가 있다", () => {
        let sites = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          sites += josaJudgedSites(`${p.content}\n${p.solution}`);
        }
        // 판마다 적어도 하나는 읽어야 「조사 어긋남 0」이 «깨끗»이라는 뜻이 된다.
        expect(sites, `${e.key} 조사 판정 자리`).toBeGreaterThanOrEqual(
          BULK.length,
        );
      });

      it("🔴 주격 조사 「이/가」를 **직접** 잰다 (공용 자의 사각, 220판)", () => {
        let sites = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const text = `${p.content}\n${p.solution}`;
          expect(subjectJosaFailures(text), `${e.key} ${seed}/${v}`).toEqual(
            [],
          );
          sites += subjectJosaSites(text);
        }
        // 🔴 자리 수를 못 박는다 — 안 그러면 「0건」이 «깨끗»인지 «못 셈»인지 안 갈린다.
        expect(sites, `${e.key} 「이/가 되」 자리`).toBe(
          SUBJECT_JOSA_PER_PAGE[e.key]! * BULK.length,
        );
        // 그리고 그 자가 «아니오» 를 낼 수 있는지도 본다.
        expect(subjectJosaFailures("면의 개수는 $4$이 되고")).toHaveLength(1);
        expect(subjectJosaFailures("면의 개수는 $4$가 되고")).toEqual([]);
        expect(subjectJosaFailures("합은 $180$가 되어")).toHaveLength(1);
        expect(subjectJosaFailures("합은 $180$이 되어")).toEqual([]);
        // 「된다」는 「되」+「ㄴ다」가 아니라 한 글자 「된」이다 — 그 자리도 읽는가.
        expect(subjectJosaFailures("넓이는 $198$가 된다")).toHaveLength(1);
        expect(subjectJosaFailures("넓이는 $198$이 된다")).toEqual([]);
      });

      it("🔴 해설의 모든 산술 등식이 좌우가 맞는다 (220판)", () => {
        let seen = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(
            arithmeticEquationFailures(p.solution),
            `${e.key} 씨앗 ${seed}/${v}`,
          ).toEqual([]);
          seen += arithmeticEquationCount(p.solution);
        }
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 셋 이상**을 요구한다.
        expect(seen, `${e.key} 읽은 등식`).toBeGreaterThan(BULK.length * 3);
      });

      it("🔴 해설에 나온 수가 전부 설명된다 — 미설명 수 0 (220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const ok = EXPLAINED[e.key]!(p.content);
          const bad = solutionNumbers(p.solution).filter((n) => !ok.has(n));
          expect(bad, `${e.key} 씨앗 ${seed}/${v} 미설명 수`).toEqual([]);
        }
        // 🔴 그 자가 «아니오» 를 낼 수 있는지도 본다 — 없는 수를 한 줄 끼워 넣는다.
        const p = build(e.key, SEEDS[0]!, 0);
        const ok = EXPLAINED[e.key]!(p.content);
        let alien = 100003;
        while (ok.has(alien)) alien += 1;
        expect(
          solutionNumbers(`${p.solution}\n엉뚱한 수 $${alien}$이다.`).filter(
            (n) => !ok.has(n),
          ),
        ).toEqual([alien]);
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸ — 남의 자를 그대로 쓴다)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(isThin(p.content, p.solution), `${e.key} ${seed}/${v}`).toBe(
            false,
          );
        }
        // 그 자가 살아 있는지도 본다 — 안 그러면 「0건」이 «못 셈»일 수 있다.
        expect(
          isThin(
            "경우의 수를 구하시오.",
            "표로 정리하여 세면 모두 $3$가지이다.",
          ),
        ).toBe(true);
      });

      it("🔴 지면의 분수가 전부 기약이고 분모가 $1$ 이 아니다 (㉰)", () => {
        let seen = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          for (const [n, d] of numericFractions(
            `${p.content}\n${p.solution}`,
          )) {
            seen += 1;
            expect(gcd2(n, d), `${e.key} ${seed}/${v} — ${n}/${d}`).toBe(1);
            expect(d).not.toBe(1);
          }
        }
        // 이 유형에 수 분수가 아예 없으면 위 검사는 구조적으로 0 이다 — 그 사실을 찍는다.
        if (e.key === K86) expect(seen).toBeGreaterThan(BULK.length * 5);
        else expect(seen, `${e.key} 는 수 분수가 없다`).toBe(0);
      });

      it("🔴 ㉲ 객관식으로 파생된다 — 보기 다섯이 만들어지고 뒤집힌 구간이 안 나온다", () => {
        let made = 0;
        for (const [seed, v] of BULK.slice(0, 60)) {
          const p = build(e.key, seed, v);
          const out = deriveThreeFormats(
            {
              content: p.content,
              answer: p.answer,
              solution: p.solution,
              familyKey: `mid:${e.key}`,
              problemType: e.rpmTitle,
            },
            createRng(seed + 12345),
          );
          const mc = out["객관식"]!;
          const marks = (mc.content.match(/[①②③④⑤]/g) ?? []).length;
          expect(marks, `${e.key} 보기가 다섯이 아니다 — ${seed}/${v}`).toBe(5);
          expect(pageSmells(mc.content), `${e.key} 보기 냄새`).toEqual([]);
          expect(reversesOrder(mc.content), `${e.key} 뒤집힌 구간`).toBe(false);
          made += 1;
        }
        expect(made).toBe(60);
      });

      it("🔴 변형 폭 — 같은 씨앗에서 `floor` 개 변형이 **서로 다르다**", () => {
        const floor = VARIANT_FLOOR[e.key]!;
        for (const seed of SEEDS) {
          const seen = new Set<string>();
          for (let v = 0; v < floor; v += 1)
            seen.add(build(e.key, seed, v).content);
          expect(seen.size, `${e.key} 씨앗 ${seed}`).toBe(floor);
        }
      });

      it("🔴 정답 쏠림 — 최빈 정답이 $12$% 미만이다 (660판)", () => {
        const freq = new Map<number, number>();
        for (const [seed, v] of WIDE) {
          const x = answerNumber(build(e.key, seed, v).answer);
          freq.set(x, (freq.get(x) ?? 0) + 1);
        }
        const top = Math.max(...freq.values());
        expect(
          top / WIDE.length,
          `${e.key} 최빈 ${((top / WIDE.length) * 100).toFixed(2)}% · 서로 다른 답 ${freq.size}`,
        ).toBeLessThan(0.12);
        expect(freq.size, `${e.key} 서로 다른 답`).toBeGreaterThanOrEqual(
          VARIANT_FLOOR[e.key]!,
        );
      });

      it("🔴 ㉵ 지면 수 조합이 답과 부딪히지 않는다 (판정기의 자를 그대로 쓴다)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const nums = [...p.content.matchAll(/-?\d+/g)].map((m) =>
            Number(m[0]),
          );
          const hit = [...obviousCandidates(nums)].filter(
            ([, val]) => val === answerNumber(p.answer),
          );
          expect(hit, `${e.key} ${seed}/${v}`).toEqual([]);
        }
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — ㉠ 창이 한쪽 끝만인가", () => {
  it("`85X` — **해당 없음**: 「차이」가 정다면체를 **하나로** 굳혀 후보 목록이 없다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다. 그 사실을 여기서 찍는다.
    const solids = new Set<number>();
    for (const [seed, v] of WIDE) {
      const { gapA, gapB } = read85(build(K85, seed, v).content);
      for (const g of [gapA, gapB]) {
        expect(BUILT.filter((b) => b.e - b.v === g).length, `gap=${g}`).toBe(1);
        solids.add(g);
      }
    }
    // 대신 「어느 정다면체가 나오는가」는 다섯이 다 나와야 한다(창이 한쪽 끝이 아니다).
    expect(solids.size).toBe(5);
  });

  it("`86X` — 정수인 몫의 **개수와 자리**가 씨앗을 가로질러 갈린다", () => {
    const counts = new Set<number>();
    const slots = new Set<string>();
    for (const [seed, v] of WIDE) {
      const fr = read86(build(K86, seed, v).content);
      const hits: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          if (i === j) continue;
          if ((fr[i]!.n * fr[j]!.d) % (fr[i]!.d * fr[j]!.n) === 0) {
            hits.push(`${i}${j}`);
          }
        }
      }
      counts.add(hits.length);
      slots.add(hits.join("-"));
    }
    expect([...counts].sort()).toEqual([2, 3]);
    expect(slots.size).toBeGreaterThan(5);
  });

  it("🔴 `86X` — 「큰 것을 작은 것으로 나누면 정수」 어림짐작이 통하는 판이 사분의 일 아래다", () => {
    // 🔴 이 자는 **어림짐작이 얼마나 통하는가**를 잰다. 「반례가 판마다 있다」로
    //    적으면 거짓이 되므로(실측 15.15%는 통한다) 비율을 못 박아 둔다.
    let works = 0;
    for (const [seed, v] of WIDE) {
      const fr = read86(build(K86, seed, v).content);
      const abs = fr.map((f) => Math.abs(f.n / f.d));
      let truth = 0;
      let guess = 0;
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          if (i === j) continue;
          const up = fr[i]!.n * fr[j]!.d;
          const dn = fr[i]!.d * fr[j]!.n;
          if (up % dn === 0) truth += up / dn;
          if (abs[i]! > abs[j]!) guess += up / dn;
        }
      }
      if (guess === truth) works += 1;
    }
    expect(
      works / WIDE.length,
      `어림짐작이 통하는 판 ${works}/${WIDE.length}`,
    ).toBeLessThan(0.25);
    // 그리고 **0 은 아니다** — 0 이면 이 자가 무엇을 재는지 알 수 없다.
    expect(works).toBeGreaterThan(0);
  });

  it("`87X` — **해당 없음**: 전수 탐색으로도 삼각형이 **정확히 하나**다", () => {
    for (const [seed, v] of WIDE.slice(0, 120)) {
      const r = read87(build(K87, seed, v).content);
      let found = 0;
      for (let y = 1; y <= 178; y += 1) {
        for (let z = 1; z <= 178 - y; z += 1) {
          const xAng = 180 - y - z;
          if (xAng < 1) continue;
          if (y + z !== r.a * y + r.s1 * r.c) continue;
          if (z + xAng !== r.b * z + r.s2 * r.e) continue;
          found += 1;
        }
      }
      expect(found, `${seed}/${v}`).toBe(1);
    }
    // 대신 사슬 $X\to Y\to Z$ 의 여섯 가지가 다 나와야 한다(창이 한쪽 끝이 아니다).
    const chains = new Set<string>();
    for (const [seed, v] of WIDE) {
      const r = read87(build(K87, seed, v).content);
      chains.add(`${r.lx}${r.ly}${r.lz}`);
    }
    expect(chains.size).toBe(6);
  });

  it("`88X` — 가장 넓은 것·가장 좁은 것의 **자리와 종류**가 갈린다", () => {
    const bigKinds = new Set<string>();
    const smallKinds = new Set<string>();
    const bigLabels = new Set<string>();
    for (const [seed, v] of WIDE) {
      const shapes = read88(build(K88, seed, v).content);
      const areas = shapes.map((s) => shoelace(sectionPolygon(s)));
      const bi = areas.indexOf(Math.max(...areas));
      const si = areas.indexOf(Math.min(...areas));
      bigKinds.add(shapes[bi]!.kind);
      smallKinds.add(shapes[si]!.kind);
      bigLabels.add(shapes[bi]!.label);
    }
    expect(bigKinds.size).toBe(3);
    expect(smallKinds.size).toBe(3);
    expect(bigLabels.size).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — ㉡ 굳힘이 항등식인가", () => {
  it("`85X` — 정다면체를 모서리 개수가 다른 것으로 바꾸면 답이 달라진다 (220판)", () => {
    // 🔴 흔들 상대를 **여기서 직접 고른다.** 생성기의 `distinctEdgeAlternatives` 를
    //    부르면 그 함수를 망가뜨렸을 때 양쪽이 같이 망가져 **동어반복**이 된다.
    //    슐레플리 표(`BUILT`)에서 모서리 개수가 다른 것을 전부 대 본다.
    for (const [seed, v] of BULK) {
      const p = build(K85, seed, v);
      const { gapA, lenA, gapB, lenB } = read85(p.content);
      const mine = solidByGap(gapA);
      const other = solidByGap(gapB);
      const others = BUILT.filter((b) => b.e !== mine.e);
      expect(
        others.length,
        "모서리 개수가 다른 정다면체가 없다",
      ).toBeGreaterThan(0);
      const x = answerNumber(p.answer);
      for (const b of others) {
        expect(
          Math.abs(b.e * lenA - other.e * lenB),
          `${seed}/${v} — 모서리 ${mine.e} → ${b.e}`,
        ).not.toBe(x);
      }
    }
  });

  it("`86X` — 한 수의 분자를 하나 옮기면 답이 달라진다 (220판)", () => {
    for (const [seed, v] of BULK) {
      const p = build(K86, seed, v);
      const fr = read86(p.content);
      const moved = [...fr];
      moved[0] = { n: fr[0]!.n + (fr[0]!.n > 0 ? 1 : -1), d: fr[0]!.d };
      let sum = 0;
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) {
          if (i === j) continue;
          const up = moved[i]!.n * moved[j]!.d;
          const dn = moved[i]!.d * moved[j]!.n;
          if (dn !== 0 && up % dn === 0) sum += up / dn;
        }
      }
      expect(sum, `${seed}/${v}`).not.toBe(answerNumber(p.answer));
    }
  });

  it("`87X` — 네 인자 중 흔들 수 있는 것은 전부 답을 바꾼다 (220판)", () => {
    for (const [seed, v] of BULK) {
      const p = build(K87, seed, v);
      const r = read87(p.content);
      const x = answerNumber(p.answer);
      const shakes = [
        solveByExteriorChain(r.a + 1, r.c, r.s1, r.b, r.e, r.s2),
        solveByExteriorChain(r.a, r.c, r.s1, r.b + 1, r.e, r.s2),
        solveByExteriorChain(r.a, r.c + 1, r.s1, r.b, r.e, r.s2),
        solveByExteriorChain(r.a, r.c, r.s1, r.b, r.e + 1, r.s2),
      ];
      expect(
        shakes.some((t) => t !== null),
        `${seed}/${v} 흔들 수가 없다`,
      ).toBe(true);
      for (const t of shakes) {
        if (t !== null) expect(180 - t.angZ, `${seed}/${v}`).not.toBe(x);
      }
    }
  });

  it("`88X` — 원기둥의 반지름을 하나 늘리면 답이 달라진다 (220판)", () => {
    for (const [seed, v] of BULK) {
      const p = build(K88, seed, v);
      const shapes = read88(p.content);
      const bumped = shapes.map((s) =>
        s.kind === "직사각형" ? { ...s, w: s.w + 1 } : s,
      );
      const areas = bumped.map((s) => shoelace(sectionPolygon(s)));
      expect(Math.max(...areas) - Math.min(...areas), `${seed}/${v}`).not.toBe(
        answerNumber(p.answer),
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 나열 줄을 한 줄씩 다시 셈한다
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — 해설의 «말»이 판정을 옳게 진술한다 (㉳)", () => {
  it("네 유형 모두 — 660판 전량에 그 문장들이 있다", () => {
    for (const key of KEYS) {
      for (const [seed, v] of WIDE) {
        const p = build(key, seed, v);
        expect(
          missingClaims(key, p.content, p.solution),
          `${key} s${seed}v${v}`,
        ).toEqual([]);
      }
    }
  });

  it("눈금 — 낱말을 하나씩 뒤집으면 **전부** 빨개진다 (양성 16 · 음성 4)", () => {
    let positives = 0;
    let negatives = 0;
    for (const key of KEYS) {
      // 음성 — 손대지 않은 지면은 깨끗하다
      const p = build(key, SEEDS[0]!, 0);
      expect(missingClaims(key, p.content, p.solution), key).toEqual([]);
      negatives += 1;
      for (const [from, to] of FLIPS[key]!) {
        // ⚠️ 맞바꿈이 **실제로 일어났는지** 먼저 본다. 안 일어나면 「빨개지지 않았다」가
        //    «가드가 없다»가 아니라 «변이가 헛돌았다»는 뜻이다.
        expect(p.solution, `${key}: 맞바꿀 자리가 없다 — ${from}`).toContain(
          from,
        );
        const flipped = p.solution.split(from).join(to);
        expect(flipped).not.toBe(p.solution);
        positives += 1;
        expect(
          missingClaims(key, p.content, flipped),
          `${key}: 「${from}」→「${to}」 를 아무도 안 물었다`,
        ).not.toEqual([]);
      }
    }
    expect(positives).toBe(16);
    expect(negatives).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나 (㉮)
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — 해설이 정답지 한 단에 들어가나", () => {
  const LIMIT = 700;

  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const long = Array.from(
      { length: 60 },
      (_, i) => `$${i}$번째 줄이다.`,
    ).join("\n");
    expect(estimateSolutionPx(long)).toBeGreaterThan(964.8);
    expect(estimateSolutionPx("짧다.")).toBeLessThan(LIMIT);
  });

  it("🔴 네 유형 전부 660판에서 700px 미만이다", () => {
    for (const key of KEYS) {
      let worst = 0;
      let where = "";
      for (const [seed, v] of WIDE) {
        const px = estimateSolutionPx(build(key, seed, v).solution);
        if (px > worst) {
          worst = px;
          where = `${seed}/${v}`;
        }
      }
      expect(
        worst,
        `${key} 최대 ${worst.toFixed(1)}px (${where})`,
      ).toBeLessThan(LIMIT);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차 f — ㉢ 형제와의 겹침", () => {
  const OVERLAP_SEED = 20260827;

  for (const e of M1_TOP_5F) {
    it(`${e.rpmType} — 형제 중 가장 닮은 것이 기준선 최댓값보다 안 닮았다`, () => {
      const sibs = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && t.key !== e.key,
      );
      expect(sibs.length, `${e.key} 형제가 없다`).toBeGreaterThan(3);
      const sibPages = sibs.map((s) =>
        generateMiddleProblem(s.key, OVERLAP_SEED, 0),
      );
      let base = 0;
      for (let i = 0; i < sibPages.length; i += 1) {
        for (let j = i + 1; j < sibPages.length; j += 1) {
          base = Math.max(
            base,
            koreanJaccard(sibPages[i]!.content, sibPages[j]!.content),
          );
        }
      }
      const mine = e.handler(createRng(OVERLAP_SEED));
      let worst = 0;
      let worstKey = "";
      sibPages.forEach((p, i) => {
        const v = koreanJaccard(mine.content, p.content);
        if (v > worst) {
          worst = v;
          worstKey = sibs[i]!.key;
        }
      });
      expect(
        worst,
        `${e.key} 가장 닮은 형제 ${worstKey} ${worst.toFixed(3)} · 형제끼리 기준선 ${base.toFixed(3)}`,
      ).toBeLessThan(base);
      // 기준선이 낮으면 위 비교가 무의미하다 — 기준선 자체도 못 박는다.
      expect(base, `${e.key} 형제끼리 기준선`).toBeGreaterThan(0.5);
    });
  }

  it("🔴 5차 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    for (let i = 0; i < M1_TOP_5F.length; i += 1) {
      for (let j = i + 1; j < M1_TOP_5F.length; j += 1) {
        const a = M1_TOP_5F[i]!.handler(createRng(OVERLAP_SEED));
        const b = M1_TOP_5F[j]!.handler(createRng(OVERLAP_SEED));
        expect(
          koreanJaccard(a.content, b.content),
          `${M1_TOP_5F[i]!.rpmType} ~ ${M1_TOP_5F[j]!.rpmType}`,
        ).toBeLessThan(0.25);
      }
    }
  });
});
