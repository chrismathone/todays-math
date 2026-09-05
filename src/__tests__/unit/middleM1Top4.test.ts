/**
 * 중1 **4차 확대 갈래**(`m1Top4.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `61W` | 약수를 $\sqrt a$ 까지만 훑어 짝으로 모으고 «약수의 합» 하나로 끝낸다 | 격자점을 **하나씩** 만든다 — $x=1$ 부터 $a$ 까지 넣어 $y=a\div x$ 가 자연수인 점을 모아 그 $y$ 를 더한다(약수라는 낱말을 한 번도 안 쓴다) |
 * | `62W` | 기약분모를 구해 **최소공배수**를 쓴다 | $N=1$ 부터 올려 가며 두 도수가 **둘 다 정수**가 되는 첫 $N$ 을 찾는다(최소공배수·최대공약수를 한 번도 안 쓴다) |
 * | `63W` | 중앙값의 자리를 **세 경우**로 갈라 방정식을 푼다 | 경우를 **하나도 안 가른다** — $x=1$ 부터 $2000$ 까지 넣어 실제로 정렬해 평균과 중앙값을 견준다 |
 * | `64W` | $b=(K-ha)\div(a+h)$ 로 **나눗셈**을 한다 | $a$ 와 $b$ 를 **둘 다 훑어** 겉넓이 식 $2ab+2h(a+b)=S$ 를 **곱셈으로만** 맞춘다 |
 *
 * ## 🔴 3차 물결이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을 재어
 *    **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어
 *    기약인지 본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로 0 이므로
 *    **찾은 자리 수도 같이 못 박는다.**
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「약수↔배수」·「공배수↔최소공배수」·
 *    「크다↔작다」·「세 번째 값」을 **낱말과 수를 함께** 판정한다. `toContain` 은 쓰지 않는다.
 * ㉴㉵ **답 쏠림과 지름길** → 씨앗 220×변형 3 에서 서로 다른 발문·정답과 **최빈 정답
 *    비율**을 재고, 지름길은 **널 모형(답을 판끼리 돌려 끼운 우연 수준)**과 견준다.
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
 * `generateMiddleProblem` 으로 갈아탄다(`m1Top2`·`m1Top3` 시험이 선 자리와 같다).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { bareNumbers } from "@/lib/elementary/rules";
import { createRng } from "@/lib/elementary/rng";
import { deriveThreeFormats, reversesOrder } from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { estimateSolutionPx } from "@/lib/printOverflow";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  boxDimensionPairs,
  classFrequencySum,
  divisorSum,
  divisorsOf,
  lastAToCheck,
  M1_TOP_4,
  meanEqualsMedianValues,
  pageShortcutValues,
  productTotalAnswer,
  relativeDenominator,
  scaledValues,
  smallestTotalCount,
} from "@/lib/middle/m1Top4";
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

const K61 = "1-1|정비례와 반비례|61W";
const K62 = "1-2|도수분포표와 상대도수|62W";
const K63 = "1-2|대푯값|63W";
const K64 = "1-2|입체도형의 겉넓이와 부피|64W";
const KEYS = [K61, K62, K63, K64] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K61]: "심화중",
  [K62]: "심화중",
  [K63]: "심화상",
  [K64]: "심화상",
};

const SEEDS = [20260903, 3, 11, 515151, 99991];
const VARIANTS = 4;
/** 판정기(`probe-middle-top-m1.ts`)가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
const OVERLAP_SEED = 20260827;

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판**. */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < VARIANTS; v += 1) out.push([1000003 + s * 7919, v]);
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
const ENTRY = new Map(M1_TOP_4.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 4차 ${key}`);
  assertChoiceCount(content, `중1 4차 ${key}`);
  assertChoiceMarks(content, `중1 4차 ${key}`);
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
  7: "일곱",
  8: "여덟",
  9: "아홉",
  10: "열",
  11: "열한",
  12: "열두",
};

/** 목록 글자(`$3$, $4$, $5$`)에서 수를 읽는다. */
function readList(listTex: string): number[] {
  return [...listTex.matchAll(/\$(-?\d+)\$/g)].map((m) => Number(m[1]));
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
 * 다루는 것: 정수 · **소수** · `+` · `-` · `\times` · `\div` · `\dfrac{}{}` ·
 * `()` · `^{k}`. 그 밖의 글자가 있으면 **던진다** — 조용히 넘기면 못 센 자리가
 * 「깨끗」으로 읽힌다.
 *
 * ⚠️ 3차 물결의 판에는 **소수가 없었다.** 이 물결의 `62W` 는 상대도수를 소수로
 *    찍으므로 그 축을 여기서 새로 연다 — 안 열면 `$50\times0.42=21$` 이 통째로
 *    「못 읽음」이 되어 **검사 밖**으로 나간다.
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
      // 소수 — `0.42` 는 «영 점 사이»가 아니라 한 수다.
      if (src[i] === "." && /\d/.test(src[i + 1] ?? "")) {
        i += 1;
        let frac = "";
        while (/\d/.test(src[i] ?? "")) {
          frac += src[i];
          i += 1;
        }
        return ratOf(Number(s + frac), 10 ** frac.length);
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
 * ⚠️ 명령 이름을 지운 **뒤에** 글자가 남으면 문자식이다(`$b=15$`·`$a=1$`).
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

/** 해설에 찍힌 모든 수 (소수까지 한 덩어리로). */
function solutionNumbers(text: string): number[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

/** 지면의 `\dfrac{정수}{정수}` 를 모두 — 기약 검사용. */
function numericFractions(text: string): [number, number][] {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

// ── 지면 읽기 ────────────────────────────────────────────────

const RE61 =
  /^반비례 관계 \$y=\\dfrac\{(\d+)\}\{x\}\$의 그래프 위의 점 중에서 \$x\$좌표와 \$y\$좌표가 모두 자연수인 점이 여러 개 있다\. 이 점들의 \$y\$좌표를 모두 더한 값을 구하시오\.$/;

const RE62 =
  /^어느 중학교 학생들의 (.+?) 조사하여 상대도수의 분포표를 만들었더니 \$(\d+)\$(분|권|시간|점) 이상 \$(\d+)\$\3 미만인 계급의 상대도수는 \$([\d.]+)\$이고, \$(\d+)\$\3 이상 \$(\d+)\$\3 미만인 계급의 상대도수는 \$([\d.]+)\$이다\. 조사한 학생 수가 가장 적을 때, 이 두 계급의 도수의 합을 구하시오\.$/;

const RE63 =
  /^어느 모둠 학생 \$5\$명의 (.+?) 다음과 같다\. \$x\$가 자연수이고 이 자료의 평균과 중앙값이 서로 같을 때, \$x\$의 값을 모두 구하여 그 합을 구하시오\.\n\(단위: (\S+)\)\n(.+)$/;

const RE64 =
  /^높이가 \$(\d+)\\,\\mathrm\{cm\}\$인 사각기둥의 밑면은 직사각형이고, 밑면의 가로와 세로의 길이는 \$\\mathrm\{cm\}\$를 단위로 할 때 모두 자연수이다\. 이 사각기둥의 겉넓이가 \$(\d+)\\,\\mathrm\{cm\}\^\{2\}\$일 때, 조건에 맞는 사각기둥의 부피를 모두 구하여 그 합을 구하시오\. \(단, 가로와 세로의 길이를 서로 바꾼 것은 같은 사각기둥으로 본다\.\)$/;

function read61(content: string): { a: number } {
  const [a] = grab(RE61, content, "61W");
  return { a: num(a!) };
}

function read62(content: string): {
  b1: number;
  b2: number;
  b3: number;
  p100: number;
  q100: number;
} {
  const [, s1, , s2, p, s2b, s3, q] = grab(RE62, content, "62W");
  if (num(s2!) !== num(s2b!)) {
    throw new Error("62W: 두 계급이 맞닿아 있지 않다");
  }
  const p100 = Math.round(Number(p!) * 100);
  const q100 = Math.round(Number(q!) * 100);
  if (Math.abs(Number(p!) * 100 - p100) > 1e-9) {
    throw new Error("62W: 상대도수가 소수 둘째 자리를 넘는다");
  }
  if (Math.abs(Number(q!) * 100 - q100) > 1e-9) {
    throw new Error("62W: 상대도수가 소수 둘째 자리를 넘는다");
  }
  return { b1: num(s1!), b2: num(s2!), b3: num(s3!), p100, q100 };
}

function read63(content: string): { vals: number[]; unit: string } {
  const [, unit, listText] = grab(RE63, content, "63W");
  const cells = listText!.split(", ");
  if (cells.length !== 5) throw new Error("63W: 자료가 다섯이 아니다");
  if (cells.filter((c) => c === "$x$").length !== 1) {
    throw new Error("63W: 자료 안의 $x$ 가 정확히 하나가 아니다");
  }
  const vals = cells
    .filter((c) => c !== "$x$")
    .map((c) => {
      const m = /^\$(\d+)\$$/.exec(c);
      if (m === null) throw new Error(`63W: 자료 칸 모양이 다르다 — ${c}`);
      return Number(m[1]);
    });
  return { vals, unit: unit! };
}

function read64(content: string): { h: number; surface: number } {
  const [h, s] = grab(RE64, content, "64W");
  return { h: num(h!), surface: num(s!) };
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

const VERIFY: Record<string, (content: string) => number> = {
  [K61]: (content) => {
    const { a } = read61(content);
    // 🔴 격자점을 **하나씩** 만든다 — 「약수」라는 낱말을 한 번도 안 쓴다.
    let sum = 0;
    let count = 0;
    for (let x = 1; x <= a; x += 1) {
      const y = a / x;
      if (!Number.isInteger(y)) continue;
      sum += y;
      count += 1;
    }
    if (count < 6 || count > 12) {
      throw new Error(`61W: 자연수 점이 ${count} 개다 (여섯~열둘이어야 한다)`);
    }
    // ㉵ 「$a$ 에 작은 수를 곱하거나 나눈 값」이 답이면 심화가 아니다.
    if (scaledValues(a).has(sum)) {
      throw new Error("61W: 답이 $a$ 를 몇 번 곱하거나 나눈 값과 같다");
    }
    if (pageShortcutValues([a]).has(sum)) {
      throw new Error("61W: 답이 지면 수 조합으로 나온다");
    }
    return sum;
  },

  [K62]: (content) => {
    const { b1, b2, b3, p100, q100 } = read62(content);
    if (!(b1 < b2 && b2 < b3)) throw new Error("62W: 계급이 오름차순이 아니다");
    if (b2 - b1 !== b3 - b2) throw new Error("62W: 두 계급의 폭이 다르다");
    if (p100 < 1 || q100 < 1) throw new Error("62W: 상대도수가 $0$ 이하다");
    if (p100 > 60 || q100 > 60) {
      throw new Error("62W: 한 계급의 상대도수가 $0.6$ 을 넘는다");
    }
    if (p100 + q100 > 90) {
      throw new Error("62W: 두 계급의 상대도수 합이 $0.9$ 를 넘는다");
    }
    if (p100 === q100) throw new Error("62W: 두 상대도수가 같다");
    // 🔴 $N$ 을 $1$ 부터 올려 가며 **둘 다 정수**가 되는 첫 자리를 찾는다 —
    //    최소공배수·최대공약수를 한 번도 안 쓴다.
    let total = 0;
    for (let n = 1; n <= 100000; n += 1) {
      if ((n * p100) % 100 === 0 && (n * q100) % 100 === 0) {
        total = n;
        break;
      }
    }
    if (total === 0) throw new Error("62W: 조건을 만족하는 학생 수가 없다");
    if (total < 20) throw new Error("62W: 가장 작은 학생 수가 너무 적다");
    if (total >= 100) {
      throw new Error(
        "62W: 가장 작은 학생 수가 $100$ 이상이라 「$100$ 명이라고 찍으면 맞는다」",
      );
    }
    const d1 = 100 / gcd2(p100, 100);
    const d2 = 100 / gcd2(q100, 100);
    if (d1 === d2)
      throw new Error("62W: 두 기약분모가 같아 공배수가 무의미하다");
    if (gcd2(d1, d2) === 1) {
      throw new Error(
        "62W: 두 기약분모가 서로소라 「최소공배수 = 두 수의 곱」 오답과 안 갈린다",
      );
    }
    const x = (total * (p100 + q100)) / 100;
    // ⚠️ 가운데 경계는 지면에 **두 번** 찍힌다 — 판정기의 자와 같은 입력을 넘겨야
    //    $2b_2$·$b_2^{2}$ 같은 후보가 안 새어 나간다.
    if (pageShortcutValues([b1, b2, b2, b3]).has(x)) {
      throw new Error("62W: 답이 계급 경계의 조합으로 나온다");
    }
    return x;
  },

  [K63]: (content) => {
    const { vals } = read63(content);
    const sorted = [...vals].sort((a, b) => a - b);
    if (new Set(sorted).size !== 4)
      throw new Error("63W: 자료 넷이 서로 다르지 않다");
    const s = sorted.reduce((a, b) => a + b, 0);
    // 🔴 경우를 **하나도 안 가른다** — $x$ 를 넣어 실제로 정렬해 견준다.
    const alive: number[] = [];
    for (let x = 1; x <= 2000; x += 1) {
      const arr = [...sorted, x].sort((a, b) => a - b);
      const total = s + x;
      // 평균 == 중앙값 ⟺ (합) == 5 × (세 번째 값)
      if (total === 5 * arr[2]!) alive.push(x);
    }
    if (alive.length < 2) {
      throw new Error(
        `63W: 조건에 맞는 $x$ 가 ${alive.length} 개다 (둘 이상이어야 한다)`,
      );
    }
    const x = alive.reduce((a, b) => a + b, 0);
    if (alive.includes(x)) throw new Error("63W: 답이 후보 목록 안에 있다");
    if (pageShortcutValues([5, ...sorted]).has(x)) {
      throw new Error("63W: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K64]: (content) => {
    const { h, surface } = read64(content);
    if (surface % 2 !== 0) throw new Error("64W: 겉넓이가 짝수가 아니다");
    // 🔴 $a$ 와 $b$ 를 **둘 다 훑어** 곱셈으로만 맞춘다 — 나눗셈을 한 번도 안 한다.
    const vols: number[] = [];
    for (let a = 1; a <= surface; a += 1) {
      if (2 * a * a + 2 * h * (a + a) > surface) break;
      for (let b = a; b <= surface; b += 1) {
        const area = 2 * a * b + 2 * h * (a + b);
        if (area > surface) break;
        if (area === surface) vols.push(a * b * h);
      }
    }
    if (vols.length < 3 || vols.length > 5) {
      throw new Error(
        `64W: 조건에 맞는 밑면이 ${vols.length} 개다 (셋~다섯이어야 한다)`,
      );
    }
    const x = vols.reduce((a, b) => a + b, 0);
    if (vols.includes(x)) throw new Error("64W: 답이 후보 목록 안에 있다");
    if (pageShortcutValues([h, surface, 2]).has(x)) {
      throw new Error("64W: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },
};

/**
 * 해설에 **나와도 되는 수** — `content` 만 보고 다시 만든다.
 *
 * 여기 없는 수가 해설에 있으면 그것은 **아무 재계산으로도 설명되지 않는 수**다
 * (3차 물결이 물린 ㉮ 의 그 자리 — 「$x=9$일 때 $9$가 남는다」의 그 $9$).
 */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K61]: (content) => {
    const { a } = read61(content);
    const out = new Set<number>([a, 1]);
    let sum = 0;
    for (let d = 1; d <= a; d += 1) {
      if (a % d !== 0) continue;
      out.add(d);
      out.add(a / d);
      sum += d;
    }
    out.add(sum);
    // 소인수분해 줄의 밑과 지수
    let m = a;
    for (let p = 2; p * p <= m; p += 1) {
      let e = 0;
      while (m % p === 0) {
        m /= p;
        e += 1;
      }
      if (e > 0) {
        out.add(p);
        out.add(e);
      }
    }
    if (m > 1) out.add(m);
    return out;
  },
  [K62]: (content) => {
    const { p100, q100 } = read62(content);
    let total = 1;
    while ((total * p100) % 100 !== 0 || (total * q100) % 100 !== 0) total += 1;
    const f1 = (total * p100) / 100;
    const f2 = (total * q100) / 100;
    return new Set<number>([
      p100 / 100,
      q100 / 100,
      p100 / gcd2(p100, 100),
      100 / gcd2(p100, 100),
      q100 / gcd2(q100, 100),
      100 / gcd2(q100, 100),
      total,
      f1,
      f2,
      f1 + f2,
    ]);
  },
  [K63]: (content) => {
    const { vals } = read63(content);
    const sorted = [...vals].sort((a, b) => a - b);
    const s = sorted.reduce((a, b) => a + b, 0);
    const out = new Set<number>([...sorted, s, 4, 5]);
    out.add(5 * sorted[1]!);
    out.add(5 * sorted[2]!);
    out.add(Math.abs(5 * sorted[1]! - s));
    out.add(Math.abs(5 * sorted[2]! - s));
    if (s % 4 === 0) out.add(s / 4);
    let sum = 0;
    for (let x = 1; x <= 2000; x += 1) {
      const arr = [...sorted, x].sort((a, b) => a - b);
      if (s + x === 5 * arr[2]!) {
        out.add(x);
        sum += x;
      }
    }
    out.add(sum);
    return out;
  },
  [K64]: (content) => {
    const { h, surface } = read64(content);
    const k = surface / 2;
    const out = new Set<number>([2, 2 * h, h, k, surface]);
    let stop = 1;
    while (stop * stop + 2 * h * stop <= k) stop += 1;
    out.add(stop);
    let sum = 0;
    for (let a = 1; a < stop; a += 1) {
      out.add(a);
      out.add(k - h * a);
      out.add(a + h);
      if ((k - h * a) % (a + h) === 0) {
        const b = (k - h * a) / (a + h);
        out.add(b);
        out.add(a * b * h);
        sum += a * b * h;
      }
    }
    out.add(sum);
    return out;
  },
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 손으로 쓴 지면(엔진 밖) — 답을 사람이 계산해 두었다. */
const GOOD_PAGES: readonly { key: string; page: string; want: number }[] = [
  {
    key: K61,
    // $36$ 의 약수 $1,2,3,4,6,9,12,18,36$ 의 합 $=91$
    page:
      "반비례 관계 $y=\\dfrac{36}{x}$의 그래프 위의 점 중에서 $x$좌표와 $y$좌표가 " +
      "모두 자연수인 점이 여러 개 있다. 이 점들의 $y$좌표를 모두 더한 값을 구하시오.",
    want: 91,
  },
  {
    key: K62,
    // $0.3=\frac3{10}$, $0.35=\frac7{20}$ → $N=20$, 도수 $6$ 과 $7$ → $13$
    page:
      "어느 중학교 학생들의 통학 시간을 조사하여 상대도수의 분포표를 만들었더니 " +
      "$20$분 이상 $30$분 미만인 계급의 상대도수는 $0.3$이고, " +
      "$30$분 이상 $40$분 미만인 계급의 상대도수는 $0.35$이다. " +
      "조사한 학생 수가 가장 적을 때, 이 두 계급의 도수의 합을 구하시오.",
    want: 13,
  },
  {
    key: K63,
    // $7,12,16,21$ · $S=56$ → (가) $x=4$ · (나) $x=14$ · (다) $x=24$ → $42$
    page:
      "어느 모둠 학생 $5$명의 일주일 동안 운동한 시간이 다음과 같다. " +
      "$x$가 자연수이고 이 자료의 평균과 중앙값이 서로 같을 때, " +
      "$x$의 값을 모두 구하여 그 합을 구하시오.\n(단위: 시간)\n$7$, $12$, $x$, $16$, $21$",
    want: 42,
  },
  {
    key: K64,
    // $h=3$, $S=126$ → $K=63$ · 밑면 $1\times15$, $3\times9$, $5\times6$ → $45+81+90=216$
    page:
      "높이가 $3\\,\\mathrm{cm}$인 사각기둥의 밑면은 직사각형이고, 밑면의 가로와 " +
      "세로의 길이는 $\\mathrm{cm}$를 단위로 할 때 모두 자연수이다. 이 사각기둥의 " +
      "겉넓이가 $126\\,\\mathrm{cm}^{2}$일 때, 조건에 맞는 사각기둥의 부피를 모두 " +
      "구하여 그 합을 구하시오. (단, 가로와 세로의 길이를 서로 바꾼 것은 같은 " +
      "사각기둥으로 본다.)",
    want: 216,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K61,
    page:
      "반비례 관계 $y=\\dfrac{13}{x}$의 그래프 위의 점 중에서 $x$좌표와 $y$좌표가 " +
      "모두 자연수인 점이 여러 개 있다. 이 점들의 $y$좌표를 모두 더한 값을 구하시오.",
    why: "$13$ 은 소수라 자연수 점이 둘뿐 — 「여러 개」가 무색하다",
  },
  {
    key: K61,
    page:
      "반비례 관계 $y=\\dfrac{28}{x}$의 그래프 위의 점 중에서 $x$좌표와 $y$좌표가 " +
      "모두 자연수인 점이 여러 개 있다. 이 점들의 $y$좌표를 모두 더한 값을 구하시오.",
    why: "$\\sigma(28)=56=28\\times2$ — 지면 수를 두 배 한 값이 답이다",
  },
  {
    key: K62,
    page:
      "어느 중학교 학생들의 통학 시간을 조사하여 상대도수의 분포표를 만들었더니 " +
      "$20$분 이상 $30$분 미만인 계급의 상대도수는 $0.2$이고, " +
      "$30$분 이상 $40$분 미만인 계급의 상대도수는 $0.25$이다. " +
      "조사한 학생 수가 가장 적을 때, 이 두 계급의 도수의 합을 구하시오.",
    why: "기약분모 $5$ 와 $4$ 가 서로소 — 「최소공배수 = 곱」 오답과 안 갈린다",
  },
  {
    key: K62,
    page:
      "어느 중학교 학생들의 통학 시간을 조사하여 상대도수의 분포표를 만들었더니 " +
      "$20$분 이상 $30$분 미만인 계급의 상대도수는 $0.35$이고, " +
      "$30$분 이상 $40$분 미만인 계급의 상대도수는 $0.16$이다. " +
      "조사한 학생 수가 가장 적을 때, 이 두 계급의 도수의 합을 구하시오.",
    why: "최소공배수가 $100$ — 「소수 둘째 자리이니 $100$ 명」이라고 찍으면 맞는다",
  },
  {
    key: K63,
    page:
      "어느 모둠 학생 $5$명의 일주일 동안 운동한 시간이 다음과 같다. " +
      "$x$가 자연수이고 이 자료의 평균과 중앙값이 서로 같을 때, " +
      "$x$의 값을 모두 구하여 그 합을 구하시오.\n(단위: 시간)\n$9$, $13$, $x$, $18$, $26$",
    why: "조건에 맞는 $x$ 가 $24$ 하나뿐 — 「모두 구하여 그 합」이 무색하다",
  },
  {
    key: K63,
    page:
      "어느 모둠 학생 $5$명의 일주일 동안 운동한 시간이 다음과 같다. " +
      "$x$가 자연수이고 이 자료의 평균과 중앙값이 서로 같을 때, " +
      "$x$의 값을 모두 구하여 그 합을 구하시오.\n(단위: 시간)\n$7$, $12$, $16$, $21$, $24$",
    why: "자료에 $x$ 가 없다 — 지면 모양이 다르다",
  },
  {
    key: K64,
    page:
      "높이가 $8\\,\\mathrm{cm}$인 사각기둥의 밑면은 직사각형이고, 밑면의 가로와 " +
      "세로의 길이는 $\\mathrm{cm}$를 단위로 할 때 모두 자연수이다. 이 사각기둥의 " +
      "겉넓이가 $24\\,\\mathrm{cm}^{2}$일 때, 조건에 맞는 사각기둥의 부피를 모두 " +
      "구하여 그 합을 구하시오. (단, 가로와 세로의 길이를 서로 바꾼 것은 같은 " +
      "사각기둥으로 본다.)",
    why: "조건에 맞는 밑면이 하나도 없다 (빈 집합)",
  },
  {
    key: K64,
    page:
      "높이가 $3\\,\\mathrm{cm}$인 사각기둥의 밑면은 직사각형이고, 밑면의 가로와 " +
      "세로의 길이는 $\\mathrm{cm}$를 단위로 할 때 모두 자연수이다. 이 사각기둥의 " +
      "겉넓이가 $127\\,\\mathrm{cm}^{2}$일 때, 조건에 맞는 사각기둥의 부피를 모두 " +
      "구하여 그 합을 구하시오. (단, 가로와 세로의 길이를 서로 바꾼 것은 같은 " +
      "사각기둥으로 본다.)",
    why: "겉넓이가 홀수 — $2ab+2h(a+b)$ 는 늘 짝수라 성립하지 않는다",
  },
];

describe("중1 4차 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 검산기가 `facts.x` 를 되읽는 판이었다면 여기서 통과할 수가 없다
    // (손으로 쓴 지면에는 `facts` 가 없다).
    expect(GOOD_PAGES).toHaveLength(4);
    for (const { key, page, want } of GOOD_PAGES) {
      expect(VERIFY[key]!(page), `${key} 양성 눈금`).toBe(want);
    }
  });

  it("🔴 음성 — 불변식을 어긴 지면은 반드시 던진다", () => {
    expect(BAD_PAGES.length).toBeGreaterThanOrEqual(8);
    for (const { key, page, why } of BAD_PAGES) {
      expect(() => VERIFY[key]!(page), `${key} 음성 눈금: ${why}`).toThrow();
    }
  });

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·소수·못 읽음을 각각 가른다", () => {
    expect(arithmeticEquationFailures("$1+2+3=6$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$1+2+3=7$이다.")).toHaveLength(1);
    // 🔴 소수 축 — 3차 물결의 판에는 이 자리가 아예 없었다.
    expect(arithmeticEquationFailures("$50\\times0.42=21$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$50\\times0.42=22$이다.")).toHaveLength(
      1,
    );
    expect(arithmeticEquationFailures("$0.35=\\dfrac{7}{20}$이다.")).toEqual(
      [],
    );
    expect(
      arithmeticEquationFailures("$0.35=\\dfrac{7}{25}$이다."),
    ).toHaveLength(1);
    // 문자식은 «판정하지 않는다» — 계산하려 들면 거짓 빨강이 난다.
    expect(arithmeticEquationFailures("$b=(63-3\\times a)\\div(a+3)$")).toEqual(
      [],
    );
    // 읽을 수 없는 글자는 조용히 넘기지 않고 **실패로 센다**.
    // ⚠️ 명령(`\\notacommand`)을 쓰면 안 된다 — 그건 「문자식이라 판정하지 않는다」로
    //    빠져나가서 이 눈금이 **아무것도 안 재게** 된다(처음에 그렇게 짰다가 빨개졌다).
    expect(arithmeticEquationFailures("$1++2=3$")).toHaveLength(1);
  });

  it("🔴 수관형사 표가 생성기 것과 **다른 벌**이다 — 가져다 쓰면 동어반복이다", () => {
    // 여기 표는 이 파일 것이고, 생성기 표는 `m1Top4.ts` 안에 있다. 둘이 갈라지면
    // 아래 「셈말이 개수와 맞나」 검사가 빨개진다 — 그것이 이 표가 사는 까닭이다.
    expect(COUNT_WORD[3]).toBe("세");
    expect(COUNT_WORD[12]).toBe("열두");
    expect(Object.keys(COUNT_WORD)).toHaveLength(12);
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`divisorSum` 은 손 계산과 맞는다", () => {
    // $36=1+2+3+4+6+9+12+18+36$
    expect(divisorSum(36)).toBe(91);
    expect(divisorsOf(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
    expect(divisorSum(99)).toBe(1 + 3 + 9 + 11 + 33 + 99);
  });

  it("🔴 음성 대조 — $\\sigma(a)=\\sigma(a+1)$ 인 짝이 실재한다 (흔들기가 «그대로»를 낼 수 있다)", () => {
    // $\sigma(14)=1+2+7+14=24$ · $\sigma(15)=1+3+5+15=24$
    expect(divisorSum(14)).toBe(24);
    expect(divisorSum(15)).toBe(24);
    expect(divisorSum(14)).toBe(divisorSum(15));
    // 반대로 우리 창의 값은 흔들면 달라진다.
    expect(divisorSum(36)).not.toBe(divisorSum(37));
  });

  it("`smallestTotalCount`·`classFrequencySum` 은 손 계산과 맞는다", () => {
    // $0.3=\frac3{10}$, $0.35=\frac7{20}$ → 공배수의 최소는 $20$
    expect(relativeDenominator(30)).toBe(10);
    expect(relativeDenominator(35)).toBe(20);
    expect(smallestTotalCount(30, 35)).toBe(20);
    expect(classFrequencySum(30, 35)).toBe(6 + 7);
  });

  it("🔴 음성 대조 — 두 기약분모가 서로소이면 «곱으로 본 답»이 참 답과 **같다**", () => {
    // $0.2=\frac15$, $0.25=\frac14$ — 최소공배수 $20$ 이 곱 $20$ 과 같다.
    expect(gcd2(relativeDenominator(20), relativeDenominator(25))).toBe(1);
    expect(productTotalAnswer(20, 25)).toBe(classFrequencySum(20, 25));
    // 서로소가 아니면 갈린다 — 그것이 생성기가 서로소를 버리는 까닭이다.
    expect(gcd2(relativeDenominator(30), relativeDenominator(35))).not.toBe(1);
    expect(productTotalAnswer(30, 35)).not.toBe(classFrequencySum(30, 35));
  });

  it("`meanEqualsMedianValues` 는 손 계산과 맞는다", () => {
    // $7,10,13,18$ · $S=48$ → (가) $x=2$ · (나) $x=12$ · (다) $x=17$
    expect(meanEqualsMedianValues(7, 10, 13, 18)).toEqual([2, 12, 17]);
    // $7,12,16,21$ · $S=56$ → $4$, $14$, $24$
    expect(meanEqualsMedianValues(7, 12, 16, 21)).toEqual([4, 14, 24]);
  });

  it("🔴 음성 대조 — 조건에 맞는 $x$ 가 **하나도 없는** 판이 실재한다", () => {
    // $5,6,7,12$ · $S=30$ → (가) $x=0$ · (나) $S$ 가 $4$ 의 배수 아님 · (다) $x=5<7$
    expect(meanEqualsMedianValues(5, 6, 7, 12)).toEqual([]);
  });

  it("`boxDimensionPairs`·`lastAToCheck` 는 손 계산과 맞는다", () => {
    // $h=3$, $K=63$ → $a=1$ 이면 $60\div4=15$ · $a=3$ 이면 $54\div6=9$ · $a=5$ 이면 $48\div8=6$
    expect(boxDimensionPairs(3, 63)).toEqual([
      [1, 15],
      [3, 9],
      [5, 6],
    ]);
    // $a=6$ 이면 $36+36=72>63$ 이라 거기서 멈춘다.
    expect(lastAToCheck(3, 63)).toBe(6);
  });

  it("🔴 음성 대조 — $h$ 가 크고 $K$ 가 작으면 살아남는 밑면이 **하나도 없다**", () => {
    expect(boxDimensionPairs(8, 12)).toEqual([]);
    expect(lastAToCheck(8, 12)).toBe(1);
  });

  it("`pageShortcutValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect([...pageShortcutValues([30, 12])]).toContain(18); // 차
    expect([...pageShortcutValues([30, 12])]).not.toContain(7);
    expect([...pageShortcutValues([])]).toHaveLength(0);
  });

  it("`scaledValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect(scaledValues(28).has(56)).toBe(true); // $28\times2$
    expect(scaledValues(36).has(91)).toBe(false); // $\sigma(36)$ 은 못 만든다
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_4).toHaveLength(4);
    expect(M1_TOP_4.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_4.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `W` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_4) {
      expect(e.rpmType).toMatch(/^\d+W$/);
      expect(extensionNumberReason(e), `${e.key}`).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    // ⚠️ 다른 소단원에는 **가는 공백 U+2009** 가 든 것이 있어 눈으로는 안 갈린다.
    //    그래서 정본과 **글자 그대로** 대조한다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_4) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    expect(M1_TOP_4.map((e) => e.unitSection)).toEqual([
      "반비례 관계 y=a/x의 그래프",
      "상대도수",
      "대푯값",
      "기둥의 겉넓이와 부피",
    ]);
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const on = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(on === 0 || on === KEYS.length, `등록된 것 ${on}/4`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    // 등록되기 전에도 이 시험이 «제품과 같은 지면»을 본다는 근거다.
    for (const key of KEYS) {
      const entry = ENTRY.get(key)!;
      for (const seed of SEEDS) {
        const raw = entry.handler(createRng(seed));
        expect(wrapDanClause(raw.content)).toBe(raw.content);
        expect(tidySolution(raw.solution)).toBe(raw.solution);
        expect(
          resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
        ).toBe(raw.difficulty);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
  });

  for (const e of M1_TOP_4) {
    describe(e.key, () => {
      it("갈래가 못 박은 그대로다 (씨앗·변형을 가로질러)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            expect(build(e.key, seed, v).difficulty).toBe(EXPECTED_TIER[e.key]);
          }
        }
      });

      it("🔴 220판을 지면만 보고 다시 풀면 같은 답이 나온다 — 생성기 산술을 안 옮겨 적는다", () => {
        let n = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(VERIFY[e.key]!(p.content), `${e.key} 씨앗 ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
          n += 1;
        }
        // 「몇 판을 실제로 쟀는가」를 같이 못 박는다 — 전부 건너뛰어도 초록이면 장식이다.
        expect(n).toBe(220);
      });

      it("`facts.x` 가 정답이다 (이웃 모듈과 같은 계약)", () => {
        for (const [seed, v] of BULK.slice(0, 60)) {
          const p = build(e.key, seed, v);
          expect(p.facts.x).toBe(answerNumber(p.answer));
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const both = `${p.content}\n${p.solution}`;
          expect(brokenRender(both), `렌더 ${seed}/${v}`).toBe(false);
          expect(pageSmells(both), `냄새 ${seed}/${v}`).toEqual([]);
          expect(josaMismatches(both), `조사 ${seed}/${v}`).toEqual([]);
          expect(bareNumbers(p.content), `맨 숫자 ${seed}/${v}`).toEqual([]);
          expect(bareNumbers(p.solution), `맨 숫자 ${seed}/${v}`).toEqual([]);
          expect(
            pointsAtFigure(p.content),
            `그림 지시 ${seed}/${v}`,
          ).toBeNull();
          expect(p.figureSpec ?? null).toBeNull();
        }
      });

      it("🔴 공용 조사 자가 이 유형에서 **구조적으로 0 이 아니다** — 실제로 읽는 자리가 있다", () => {
        // 3차의 한 유형은 수식이 `)` 로 끝나 조사 자가 800/800 을 건너뛰었다.
        // 「어긋남 0」이 «깨끗»인지 «못 셈»인지 여기서 가른다.
        let sites = 0;
        for (const [seed, v] of BULK.slice(0, 40)) {
          const p = build(e.key, seed, v);
          sites += [
            ...`${p.content}\n${p.solution}`.matchAll(
              /\$([^$]*)\$(을|를|은|는|와|과|가)/g,
            ),
          ].length;
        }
        expect(sites).toBeGreaterThan(40);
      });

      it("🔴 해설의 모든 산술 등식이 좌우가 맞는다 (220판)", () => {
        let seen = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(
            arithmeticEquationFailures(p.solution),
            `${e.key} 씨앗 ${seed}/${v}`,
          ).toEqual([]);
          for (const m of p.solution.matchAll(/\$([^$]*)\$/g)) {
            if (m[1]!.includes("=") && isPureArithmetic(m[1]!)) seen += 1;
          }
        }
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 둘 이상**을
        //    요구한다 — 처음에 `61W` 는 판마다 하나뿐이었고(소인수분해를 등호 없이
        //    적어서), 그러면 「등식이 다 맞는다」가 마지막 줄 하나만 보는 셈이 된다.
        expect(seen).toBeGreaterThan(220 * 1.5);
      });

      it("🔴 해설에 나온 수가 전부 설명된다 — 미설명 수 0 (220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const ok = EXPLAINED[e.key]!(p.content);
          const bad = solutionNumbers(p.solution).filter((n) => !ok.has(n));
          expect(bad, `${e.key} 씨앗 ${seed}/${v} 미설명 수`).toEqual([]);
        }
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

      it("🔴 지면의 분수가 전부 기약이다 (㉰)", () => {
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
        if (e.key === K62) expect(seen).toBeGreaterThan(400);
        else expect(seen).toBe(0);
      });

      it("🔴 ㉲ 객관식으로 파생된다 — 보기 다섯이 만들어지고 뒤집힌 구간이 안 나온다", () => {
        /**
         * 3차 물결의 중2 `35V` 는 정답이 **구간**이라 파생 오답이 `$12\le y\le10$`
         * 으로 뒤집혔고, 그것을 막자 이번에는 **후보가 넷을 못 채워 객관식이 아예
         * 안 만들어지는** 유형이 생겼다. 그 둘은 같은 자리의 앞뒤 면이다.
         * 적재기가 한 문항을 단답형·객관식 두 벌로 넣으므로, 여기서 미리 재 둔다.
         */
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

      it("변형 공간이 열 문항을 낸다 — 발문이 겹치지 않는다", () => {
        const seen = new Set<string>();
        for (const [seed, v] of WIDE) seen.add(build(e.key, seed, v).content);
        expect(seen.size).toBeGreaterThanOrEqual(10);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`61W` — **해당 없음**: 후보 목록이 없다. 지름길이 우연보다 낮은 것을 대신 잰다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다. 이 유형은 값이 하나로 굳으므로
    // «후보 목록에서 고르는 걸음»이 아예 없다 — 그 사실을 여기서 찍는다.
    expect(
      AXES[K61]!.candidateCount(build(K61, SEEDS[0]!).facts),
    ).not.toBeNull();
    expect(AXES[K61]!.withoutBinding(build(K61, SEEDS[0]!).facts)).toBeNull();

    // 대신 이 유형의 진짜 지름길(「$a$ 에 작은 수를 곱하거나 나눈 값」)을 재고
    // **널 모형**(답을 판끼리 돌려 끼운 우연 수준)과 견준다.
    const rows = BULK.map(([s, v]) => {
      const p = build(K61, s, v);
      return { a: p.facts.a!, x: answerNumber(p.answer) };
    });
    const hit = rows.filter((r) => scaledValues(r.a).has(r.x)).length;
    let chance = 0;
    let tries = 0;
    for (const shift of [7, 13, 29]) {
      for (let i = 0; i < rows.length; i += 1) {
        if (scaledValues(rows[i]!.a).has(rows[(i + shift) % rows.length]!.x)) {
          chance += 1;
        }
        tries += 1;
      }
    }
    expect(hit).toBe(0);
    // 널 모형이 0 이면 「지름길 0」이 «깨끗»인지 «못 셈»인지 안 갈린다.
    expect(chance, "널 모형이 0 이면 이 자는 아무것도 못 잰다").toBeGreaterThan(
      0,
    );
    expect(tries).toBe(rows.length * 3);
  });

  it("`62W` — **해당 없음**: 값이 하나로 굳는다. 「곱으로 본 오답」과 갈리는 것을 대신 잰다", () => {
    expect(AXES[K62]!.candidateCount(build(K62, SEEDS[0]!).facts)).toBeNull();
    let same = 0;
    for (const [s, v] of BULK) {
      const p = build(K62, s, v);
      const got = productTotalAnswer(p.facts.p!, p.facts.q!);
      if (got === answerNumber(p.answer)) same += 1;
      // 그 오답이 **아예 못 만들어지는 값**이면 이 축은 죽은 것이다.
      expect(Number.isFinite(got)).toBe(true);
    }
    expect(same).toBe(0);
    // 자가 살아 있는지 — 서로소인 판에서는 같아야 한다.
    expect(productTotalAnswer(20, 25)).toBe(classFrequencySum(20, 25));
  });

  it("`63W` — (가)·(나)가 씨앗을 가로질러 갈리고, (다)는 **구조적으로** 늘 산다", () => {
    const shapes = new Map<string, number>();
    for (const [s, v] of BULK) {
      const p = build(K63, s, v);
      const { vals } = read63(p.content);
      const sorted = [...vals].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const xa = 5 * sorted[1]! - sum;
      const xb = sum % 4 === 0 ? sum / 4 : null;
      const xc = 5 * sorted[2]! - sum;
      const key =
        (xa >= 1 && xa <= sorted[1]! ? "가" : "") +
        (xb !== null && xb >= 1 && xb >= sorted[1]! && xb <= sorted[2]!
          ? "나"
          : "") +
        (xc >= 1 && xc >= sorted[2]! ? "다" : "");
      shapes.set(key, (shapes.get(key) ?? 0) + 1);
    }
    // (가) 가 죽는 판과 (나) 가 죽는 판이 **둘 다** 있어야 굳힘이 자리를 고른다.
    const total = [...shapes.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(220);
    const withoutA = [...shapes.entries()]
      .filter(([k]) => !k.includes("가"))
      .reduce((a, [, n]) => a + n, 0);
    const withoutB = [...shapes.entries()]
      .filter(([k]) => !k.includes("나"))
      .reduce((a, [, n]) => a + n, 0);
    expect(withoutA, "(가) 가 죽는 판이 하나도 없다").toBeGreaterThan(0);
    expect(withoutB, "(나) 가 죽는 판이 하나도 없다").toBeGreaterThan(0);
    // (다) 는 살아남는 것이 둘 이상이면 **대수적으로** 늘 산다 — 「축 없음」으로 찍는다.
    const withoutC = [...shapes.entries()]
      .filter(([k]) => !k.includes("다"))
      .reduce((a, [, n]) => a + n, 0);
    expect(
      withoutC,
      "(다) 가 죽는 판이 생겼다 — 머리말의 대수 논증이 틀렸다",
    ).toBe(0);
    // 답이 **후보 전부의 합**이라 (다) 하나를 알아도 답이 안 나온다.
    for (const [s, v] of BULK) {
      const p = build(K63, s, v);
      const alive = readList(
        /값은 (.+?)의 \S+ 가지이고/.exec(p.solution)?.[1] ?? "",
      );
      expect(alive.length).toBeGreaterThanOrEqual(2);
      expect(alive).not.toContain(answerNumber(p.answer));
    }
  });

  it("`64W` — 살아남는 후보 개수와 첫 자리가 씨앗을 가로질러 갈린다", () => {
    const counts = new Set<number>();
    const firsts = new Set<number>();
    for (const [s, v] of BULK) {
      const p = build(K64, s, v);
      counts.add(p.facts.cnt!);
      const pairs = boxDimensionPairs(p.facts.h!, p.facts.k!);
      firsts.add(pairs[0]![0]);
      expect(pairs).toHaveLength(p.facts.cnt!);
    }
    expect(counts.size).toBeGreaterThanOrEqual(2);
    expect(firsts.size).toBeGreaterThanOrEqual(2);
    // 답이 **후보 전부의 합**이라 목록의 어느 자리도 답이 아니다.
    for (const [s, v] of BULK.slice(0, 40)) {
      const p = build(K64, s, v);
      const vols = boxDimensionPairs(p.facts.h!, p.facts.k!).map(
        ([a, b]) => a * b * p.facts.h!,
      );
      expect(vols).not.toContain(answerNumber(p.answer));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 인자를 흔들면 답이 바뀌나
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("`61W` — 그래프의 상수를 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K61, s, v);
      expect(divisorSum(p.facts.a! + 1)).not.toBe(answerNumber(p.answer));
    }
  });

  it("`62W` — 상대도수 하나를 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K62, s, v);
      expect(classFrequencySum(p.facts.p!, p.facts.q! + 1)).not.toBe(
        answerNumber(p.answer),
      );
    }
  });

  it("`63W` — 가장 큰 변량을 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K63, s, v);
      const shaken = meanEqualsMedianValues(
        p.facts.c1!,
        p.facts.c2!,
        p.facts.c3!,
        p.facts.c4! + 1,
      ).reduce((a, b) => a + b, 0);
      expect(shaken).not.toBe(answerNumber(p.answer));
    }
  });

  it("`64W` — 겉넓이를 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K64, s, v);
      const shaken = boxDimensionPairs(p.facts.h!, p.facts.k! + 1).reduce(
        (a, [x, y]) => a + x * y * p.facts.h!,
        0,
      );
      expect(shaken).not.toBe(answerNumber(p.answer));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 해설의 나열 줄을 한 줄씩 다시 셈한다 + 「모두」를 전수로 반증한다
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`61W` — 약수 목록·짝·셈말·합이 서로 맞고, 「모두」가 전수 탐색과 같다", () => {
    let lines = 0;
    for (const [s, v] of BULK) {
      const p = build(K61, s, v);
      const { a } = read61(p.content);
      // ⑴ 「$a$의 약수는 … 의 N 개이다」 — 낱말·목록·셈말을 함께 판정한다.
      const m = /\$(\d+)\$의 (약수|배수)는 (.+?)의 (\S+) 개이다/.exec(
        p.solution,
      );
      expect(m, `61W 약수 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(m![1]!)).toBe(a);
      const listed = readList(m![3]!);
      // 「약수」라는 낱말이 참인지 **수로** 확인한다 — 「배수」로 바꾸면 여기서 죽는다.
      if (m![2] === "약수") {
        for (const d of listed) expect(a % d).toBe(0);
      } else {
        for (const d of listed) expect(d % a).toBe(0);
      }
      // 전수 탐색과 **정확히** 같아야 한다(빠짐 0 · 군더더기 0).
      const brute: number[] = [];
      for (let d = 1; d <= a; d += 1) if (a % d === 0) brute.push(d);
      expect(listed).toEqual(brute);
      expect(m![4]).toBe(COUNT_WORD[listed.length]);
      // ⑵ 「곱이 $a$인 두 약수끼리 짝을 지으면 …」 — 곱을 실제로 셈한다.
      const pm =
        /곱이 \$(\d+)\$인 두 (약수|배수)끼리 짝을 지으면 (.+?)이므로/.exec(
          p.solution,
        );
      expect(pm, `61W 짝 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(pm![1]!)).toBe(a);
      expect(pm![2]).toBe("약수");
      const pairs = [...pm![3]!.matchAll(/\$(\d+)\$[와과] \$(\d+)\$/g)].map(
        (x) => [Number(x[1]), Number(x[2])] as [number, number],
      );
      expect(pairs.length).toBe(Math.ceil(brute.length / 2));
      const covered: number[] = [];
      for (const [lo, hi] of pairs) {
        expect(lo * hi).toBe(a);
        covered.push(lo);
        if (lo !== hi) covered.push(hi);
      }
      expect(covered.sort((x, y) => x - y)).toEqual(brute);
      // ⑶ 마지막 줄의 항이 그 목록과 같고 합이 정답이다.
      const fm = /따라서 구하는 값은 \$([\d+]+)=(\d+)\$이다/.exec(p.solution);
      expect(fm, `61W 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(fm![1]!.split("+").map(Number)).toEqual(brute);
      expect(num(fm![2]!)).toBe(answerNumber(p.answer));
      lines += 1;
    }
    expect(lines).toBe(220);
  });

  it("`62W` — 배수 판정·공배수·최소·검산 줄이 모두 참이다", () => {
    let lines = 0;
    for (const [s, v] of BULK) {
      const p = build(K62, s, v);
      const { p100, q100 } = read62(p.content);
      const total = p.facts.total!;
      // ⑴ 「$N$이 $d$의 배수이어야 한다」 — 낱말과 수를 함께 판정한다.
      const mults = [
        ...p.solution.matchAll(
          /\$N\$(?:이|은) \$(\d+)\$의 (배수|약수)이어야 한다/g,
        ),
      ];
      expect(mults).toHaveLength(2);
      for (const m of mults) {
        const d = Number(m[1]);
        if (m[2] === "배수") expect(total % d).toBe(0);
        else expect(d % total).toBe(0);
      }
      expect(mults.map((m) => Number(m[1])).sort((x, y) => x - y)).toEqual(
        [100 / gcd2(p100, 100), 100 / gcd2(q100, 100)].sort((x, y) => x - y),
      );
      // ⑵ 「$N$은 $d_1$과 $d_2$의 공배수이고, 가장 작은 수는 최소공배수인 $L$이다」
      const cm =
        /\$N\$은 \$(\d+)\$[와과] \$(\d+)\$의 (공배수|공약수)이고, 그중 가장 (작은|큰) 수는 두 수의 (최소공배수|최대공약수)인 \$(\d+)\$이다/.exec(
          p.solution,
        );
      expect(cm, `62W 공배수 줄이 없다 — ${s}/${v}`).not.toBeNull();
      const d1 = Number(cm![1]);
      const d2 = Number(cm![2]);
      expect(cm![3]).toBe("공배수");
      expect(cm![4]).toBe("작은");
      expect(cm![5]).toBe("최소공배수");
      const L = Number(cm![6]);
      expect(L).toBe(total);
      // 「공배수」·「가장 작은」·「최소공배수」를 **수로** 확인한다.
      expect(L % d1).toBe(0);
      expect(L % d2).toBe(0);
      let least = 1;
      while (least % d1 !== 0 || least % d2 !== 0) least += 1;
      expect(least).toBe(L);
      // 공약수였다면 거짓이어야 한다(그래야 낱말을 바꾸면 죽는다).
      expect(d1 % L === 0 && d2 % L === 0).toBe(false);
      // ⑶ 검산 줄 — 두 도수가 실제로 자연수다.
      const checks = [
        ...p.solution.matchAll(/\$(\d+)\\times([\d.]+)=(\d+)\$\(명\)/g),
      ];
      expect(checks).toHaveLength(2);
      for (const c of checks) {
        expect(Number(c[1])).toBe(total);
        expect(Number(c[1]) * Number(c[2])).toBeCloseTo(Number(c[3]), 9);
      }
      expect(checks.reduce((a, c) => a + Number(c[3]), 0)).toBe(
        answerNumber(p.answer),
      );
      lines += 1;
    }
    expect(lines).toBe(220);
  });

  it("🔴 `62W` 의 「이/가」 자리를 **직접** 잰다 (공용 자의 사각, 220판)", () => {
    /**
     * 공용 `josaMismatches` 는 「이」를 `JOSA_PAIR` 에 안 넣는다(서술격 「$5$이다」와
     * 안 갈려서 거짓 경보가 쏟아진다). 그래서 「가를 써야 할 자리에 이를 썼다」는
     * **구조적으로 0** 이다 — 그 사각을 여기서 메운다.
     *
     * 🔴 그리고 이 자리는 **소수의 뒤 $0$ 이 사라지는** 함정이 있는 곳이다.
     * `0.2` 는 「영 점 이」라 「가」인데 백분율 정수 $20$(이십)으로 읽으면 「이」가 된다.
     */
    let sites = 0;
    for (const [s, v] of BULK) {
      const p = build(K62, s, v);
      const hits = [
        ...p.solution.matchAll(/\$N\\times([\d.]+)\$(이|가) 자연수이려면/g),
      ];
      expect(hits, `62W 「이/가」 자리를 못 찾았다 — ${s}/${v}`).toHaveLength(
        1,
      );
      for (const h of hits) {
        const tex = h[1]!;
        const tail = Number(tex[tex.length - 1]);
        expect(h[2], `62W ${tex} 뒤의 조사 — ${s}/${v}`).toBe(
          subjectJosaFor(tail),
        );
        sites += 1;
      }
    }
    expect(sites).toBe(220);
    // 자가 살아 있는가 — 「이」와 「가」를 **둘 다** 낼 수 있어야 한다.
    expect(subjectJosaFor(2)).toBe("가");
    expect(subjectJosaFor(6)).toBe("이");
  });

  it("`63W` — 세 경우의 중앙값·해·판정이 맞고, 「모두」가 전수 탐색과 같다", () => {
    let cases = 0;
    for (const [s, v] of BULK) {
      const p = build(K63, s, v);
      const { vals } = read63(p.content);
      const sorted = [...vals].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      // (가)·(다) — 「세 번째 값은 $c$이므로」가 실제로 그런지 넣어 본다.
      const heads = [
        ...p.solution.matchAll(
          /\$x\\(le|ge)(\d+)\$이면 세 번째 값은 \$(\d+)\$이므로/g,
        ),
      ];
      expect(heads).toHaveLength(2);
      for (const h of heads) {
        const bound = Number(h[2]);
        const claimed = Number(h[3]);
        // 그 범위 안의 $x$ 를 실제로 몇 개 넣어 정렬해 본다.
        const probes =
          h[1] === "le"
            ? [1, Math.max(1, bound - 1), bound]
            : [bound, bound + 5, bound + 40];
        for (const x of probes) {
          const arr = [...sorted, x].sort((a, b) => a - b);
          expect(
            arr[2],
            `63W 세 번째 값 주장이 틀렸다 (${s}/${v}, x=${x})`,
          ).toBe(claimed);
        }
        cases += 1;
      }
      // (나) — 「세 번째 값은 $x$」
      const mid = /\$(\d+)\\le x\\le(\d+)\$이면 세 번째 값은 \$x\$이므로/.exec(
        p.solution,
      );
      expect(mid, `63W (나) 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(Number(mid![1])).toBe(sorted[1]);
      expect(Number(mid![2])).toBe(sorted[2]);
      for (const x of [sorted[1]!, sorted[2]!]) {
        const arr = [...sorted, x].sort((a, b) => a - b);
        expect(arr[2]).toBe(x);
      }
      /**
       * 🔴 판정 — 「조건에 맞는다」로 끝난 해가 **전수 탐색과 정확히 같아야** 한다.
       *
       * ⚠️ 처음에는 «맞는다고 적은 해가 전부 참 해에 들어 있나»만 봤다. 그러면
       * **한쪽 방향만** 지켜서, 참 해를 「가정에 어긋나 조건에 맞지 않는다」로 적어도
       * 초록이었다 — 변이 시험이 그것을 잡았다((가) 의 비교를 뒤집는 변이가 🟢).
       * 이제 **양방향**으로 잠근다.
       */
      const verdicts = [
        ...p.solution.matchAll(/\$x=(-?\d+)\$이고, [^\n]*?조건에 맞는다\./g),
      ].map((m) => Number(m[1]));
      const brute: number[] = [];
      for (let x = 1; x <= 2000; x += 1) {
        const arr = [...sorted, x].sort((a, b) => a - b);
        if (sum + x === 5 * arr[2]!) brute.push(x);
      }
      // (나) 의 살아남은 해는 다른 문구를 쓰므로 마무리 줄에서 함께 본다.
      const fin =
        /값은 (.+?)의 (\S+) 가지이고, 구하는 값은 \$([\d+]+)=(\d+)\$이다/.exec(
          p.solution,
        );
      expect(fin, `63W 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      const alive = readList(fin![1]!);
      // 🔴 「모두」를 **전수로** 반증한다 — 빠짐 0 · 군더더기 0.
      expect(alive).toEqual(brute);
      expect(fin![2]).toBe(COUNT_WORD[alive.length]);
      expect(fin![3]!.split("+").map(Number)).toEqual(alive);
      expect(num(fin![4]!)).toBe(answerNumber(p.answer));
      /**
       * 🔴 세 경우의 판정이 참 해와 **정확히** 같다 — 빠짐 0 · 군더더기 0.
       *
       * ⚠️ **같은 해가 두 번 적힐 수 있다.** 세 경우의 창은 경계에서 겹치므로
       * ($x=c_2$ 는 (가) 와 (나) 에, $x=c_3$ 은 (나) 와 (다) 에 함께 든다)
       * 그 자리에서는 두 줄이 같은 $x$ 를 「조건에 맞는다」로 적는다 — 그것은
       * 결함이 아니라 **참**이고, 마무리 줄이 한 번만 적어 앞뒤가 맞는다.
       * 그래서 «겹침»으로 견준다(실측 220판 중 그런 판이 있다).
       */
      expect(
        [...new Set(verdicts)].sort((a, b) => a - b),
        `63W 경우별 판정이 참 해와 다르다 — ${s}/${v}`,
      ).toEqual(brute);
    }
    expect(cases).toBe(440);
  });

  it("`64W` — $a$ 마다 두 수와 나눗셈 판정이 맞고, 「모두」가 전수 탐색과 같다", () => {
    let lines = 0;
    for (const [s, v] of BULK) {
      const p = build(K64, s, v);
      const { h, surface } = read64(p.content);
      const k = surface / 2;
      const rows = [
        ...p.solution.matchAll(
          /\$a=(\d+)\$이면 \$(\d+)-(\d+)\\times\d+=(\d+)\$이고(, \$(\d+)\$[은는] \$(\d+)\$의 (배수|약수)가 아니므로 \$b\$가 자연수가 아니다| \$(\d+)\\div(\d+)=(\d+)\$이므로 \$b=(\d+)\$이다\. 이때 부피는 \$(\d+)\\times(\d+)\\times(\d+)=(\d+)\$이다)\./g,
        ),
      ];
      const stop = p.facts.stop!;
      expect(rows).toHaveLength(stop - 1);
      const vols: number[] = [];
      for (const r of rows) {
        const a = Number(r[1]);
        expect(Number(r[2])).toBe(k);
        expect(Number(r[3])).toBe(h);
        const numer = Number(r[4]);
        expect(numer).toBe(k - h * a);
        if (r[8] !== undefined) {
          // 「배수가 아니다」 — 낱말과 수를 함께 본다.
          // ⚠️ 갈래 안쪽의 묶음 번호는 **바깥 묶음 다음부터** 센다(5 는 갈래 전체다).
          expect(r[8]).toBe("배수");
          expect(Number(r[6])).toBe(numer);
          expect(Number(r[7])).toBe(a + h);
          expect(numer % (a + h)).not.toBe(0);
        } else {
          const b = Number(r[12]);
          expect(numer % (a + h)).toBe(0);
          expect(numer / (a + h)).toBe(b);
          expect(Number(r[9])).toBe(numer);
          expect(Number(r[10])).toBe(a + h);
          expect(Number(r[11])).toBe(b);
          expect(2 * a * b + 2 * h * (a + b)).toBe(surface);
          expect(Number(r[16])).toBe(a * b * h);
          vols.push(a * b * h);
        }
        lines += 1;
      }
      // 🔴 「모두」를 **훑은 범위 밖까지** 전수로 반증한다.
      const brute: number[] = [];
      for (let a = 1; a <= surface; a += 1) {
        for (let b = a; b <= surface; b += 1) {
          if (2 * a * b + 2 * h * (a + b) === surface) brute.push(a * b * h);
        }
      }
      expect(vols).toEqual(brute);
      // 멈춤 줄의 근거가 참이다 — $a=$stop 에서는 정말로 $a>b$ 다.
      const sm = /\$a\$가 \$(\d+)\$ 이상이면 \$b\$가 \$a\$보다 작아져/.exec(
        p.solution,
      );
      expect(sm, `64W 멈춤 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(Number(sm![1])).toBe(stop);
      expect(stop * stop + 2 * h * stop).toBeGreaterThan(k);
      expect((stop - 1) * (stop - 1) + 2 * h * (stop - 1)).toBeLessThanOrEqual(
        k,
      );
      // 마무리 줄
      const fin =
        /부피는 (.+?)의 (\S+) 가지이고, 구하는 값은 \$([\d+]+)=(\d+)\$이므로/.exec(
          p.solution,
        );
      expect(fin, `64W 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(readList(fin![1]!)).toEqual(brute);
      expect(fin![2]).toBe(COUNT_WORD[brute.length]);
      expect(fin![3]!.split("+").map(Number)).toEqual(brute);
      expect(num(fin![4]!)).toBe(answerNumber(p.answer));
    }
    expect(lines).toBeGreaterThan(220 * 4);
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나 (㉮)
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
  const COLUMN = JASEUP_MEASURED_PX.answerSolutionsFull;

  /**
   * 실측 기록(2026-09-06, 씨앗 220 × 변형 3 = 660판, 제품 `estimateSolutionPx`).
   *
   * ## 🔴 왜 「전부 700px 미만」에서 **유형별 기록**으로 바뀌었나
   *
   * 처음엔 브리프가 못 박은 한 줄(`CAP = 700`)이었다. 그 한 줄은 **네 유형을 한
   * 문턱으로** 재므로, `61W`(305.5px)가 **두 배**가 돼도 아무 말을 안 한다 —
   * 「해설이 갑자기 길어졌다」를 못 보는 자리가 셋이나 열려 있었다.
   * `middleM1Top3.test.ts` 가 이미 쓰던 «유형별 실측 기록» 꼴로 맞췄다.
   *
   * ## 🔴 그리고 2026-09-06 에 **지면이 아니라 자가 바뀌었다**
   *
   * `estimateSolutionPx` 가 그날까지 **원문**을 쟀다 — 지면은 `solutionForDisplay`
   * 로 갈라 그리는데 자만 안 걸려 있었다(`solutionWiring.test.ts`). 옛 자를
   * `git show HEAD:` 로 꺼내 같은 660판에 대어 재니 여기서 둘이 올라갔다:
   * `63W` 402.7 → **420.5** · `64W` 671.9 → **761.0**. `61W`·`62W` 는 0.0 차이다.
   *
   * **생성기는 한 글자도 안 바뀌었다** — 지면은 늘 761px 이었고 자가 몰랐을 뿐이라
   * 회귀가 아니라 기록의 수정이다. 한 단(964.8px)은 옛 자·새 자 어느 쪽으로도
   * 660판 × 4유형에서 **한 판도 안 넘는다**.
   */
  const MEASURED_PX: Record<string, number> = {
    [K61]: 305.5,
    [K62]: 323.4,
    [K63]: 420.5, // 옛 자로는 402.7
    [K64]: 761.0, // 옛 자로는 671.9
  };

  /**
   * 여유 — 지면 **한 줄**(17.825px)이다.
   *
   * ⚠️ **두 줄(36px)로 두면 가드가 죽는다.** `m1Top4.ts:817` 의 `stop > 12` 를
   *    `stop > 13` 으로 한 칸 올리면 `64W` 최대가 761.0 → **796.6px**, 딱 +35.6px
   *    이라 36 여유 안에 숨는다(실제로 재 봤다). 18 이면 빨개진다.
   *    아래 「훑는 자리 상한」 시험과 **짝**이다 — 그쪽이 `maxStop === 12` 를 잡고
   *    이쪽이 그 상한이 곧 높이임을 잡는다.
   */
  const SLACK_PX = 18;

  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const huge = Array.from(
      { length: 80 },
      (_, i) => `${i + 1}단계를 계산한다.`,
    ).join("\n");
    expect(estimateSolutionPx(huge)).toBeGreaterThan(COLUMN);
    expect(estimateSolutionPx("$x=1$이다.")).toBeLessThan(200);
  });

  it("🔴 네 유형 전부 660판에서 실측 기록 안이다 — 한 단(964.8px)은 물론이다", () => {
    let measured = 0;
    const over: string[] = [];
    const worstOf = new Map<string, number>();
    for (const e of M1_TOP_4) {
      for (const [s, v] of WIDE) {
        const px = estimateSolutionPx(build(e.key, s, v).solution);
        measured += 1;
        worstOf.set(e.key, Math.max(worstOf.get(e.key) ?? 0, px));
        // 진짜 한계는 한 단이다 — 넘으면 옆 문항 해설이 통째로 사라진다.
        if (px > COLUMN) over.push(`${e.key} ${s}/${v} ${Math.round(px)}px`);
      }
    }
    expect(measured).toBe(4 * WIDE.length);
    expect(measured).toBeGreaterThanOrEqual(2400);
    // 🔴 기록이 네 유형을 **다 덮는가** — 안 덮으면 그 유형은 분모 밖이고,
    //    `MEASURED_PX[e.key]` 가 `undefined` 라 아래 비교가 조용히 뜻을 잃는다.
    expect(M1_TOP_4.map((e) => e.key).sort()).toEqual(
      Object.keys(MEASURED_PX).sort(),
    );
    expect(over, "해설이 한 단을 넘는 판").toEqual([]);
    // 그리고 **기록보다 커지면** 그것대로 빨개진다 — 문턱이 아니라 기록이다.
    for (const e of M1_TOP_4) {
      const worst = worstOf.get(e.key)!;
      expect(
        worst,
        `${e.key} 최대 ${worst.toFixed(1)}px — 기록 ${MEASURED_PX[e.key]}px`,
      ).toBeLessThanOrEqual(MEASURED_PX[e.key]! + SLACK_PX);
    }
  });

  it("🔴 `64W` 의 훑는 자리 상한이 산출물에 실제로 걸린다", () => {
    // 이 상한이 곧 해설 높이다. 상한을 올리면 위 검사가 빨개진다.
    let maxStop = 0;
    for (const [s, v] of WIDE) {
      const p = build(K64, s, v);
      maxStop = Math.max(maxStop, p.facts.stop!);
    }
    expect(maxStop).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_4) {
    it(`${e.rpmType} — 형제 중 가장 닮은 것이 기준선 최댓값보다 안 닮았다`, () => {
      const mine = build(e.key, OVERLAP_SEED);
      const sibs = all.filter((t) => {
        if (t.key === e.key) return false;
        try {
          return (
            generateMiddleProblem(t.key, OVERLAP_SEED, 0).unitSection ===
            e.unitSection
          );
        } catch {
          return false;
        }
      });
      expect(sibs.length).toBeGreaterThan(5);
      const base: number[] = [];
      for (let i = 0; i < sibs.length; i += 1) {
        for (let j = i + 1; j < sibs.length; j += 1) {
          base.push(
            koreanJaccard(
              generateMiddleProblem(sibs[i]!.key, OVERLAP_SEED, 0).content,
              generateMiddleProblem(sibs[j]!.key, OVERLAP_SEED, 0).content,
            ),
          );
        }
      }
      base.sort((a, b) => a - b);
      const median = base[Math.floor(base.length / 2)]!;
      const worst = Math.max(
        ...sibs.map((t) =>
          koreanJaccard(
            mine.content,
            generateMiddleProblem(t.key, OVERLAP_SEED, 0).content,
          ),
        ),
      );
      // ⚠️ 기준선 **최댓값**을 면제부로 쓰지 않는다(그 값은 「이 열쇠로는 안 갈린다」는
      //    뜻일 수 있다). 중앙값의 세 배를 넘지 않는지로 잠근다.
      expect(worst, `${e.key} 가장 닮은 형제 ${worst.toFixed(3)}`).toBeLessThan(
        Math.max(0.35, median * 3),
      );
      expect(worst).toBeLessThan(base[base.length - 1]!);
    });
  }

  it("🔴 4차 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = M1_TOP_4.map((e) => build(e.key, OVERLAP_SEED));
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const j1 = koreanJaccard(pages[i]!.content, pages[j]!.content);
        expect(j1, `${KEYS[i]} ↔ ${KEYS[j]} ${j1.toFixed(3)}`).toBeLessThan(
          0.3,
        );
        const j2 = numAnswerJaccard(
          pages[i]!.content,
          pages[i]!.answer,
          pages[j]!.content,
          pages[j]!.answer,
        );
        expect(j2 === null || j2 < 0.3).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 판정기(`probe-middle-top-m1`)의 축을 미리 댄다
// ═══════════════════════════════════════════════════════════

describe("중1 4차 확대 갈래 — 판정기의 축을 미리 댄다", () => {
  it("🔴 넷 다 `AXES` 에 적혀 있다 — 안 적으면 판정기가 «축을 안 적었다»를 찍는다", () => {
    for (const key of KEYS) {
      expect(AXES[key], `${key} 의 축이 판정기에 없다`).toBeDefined();
    }
  });

  for (const key of KEYS) {
    it(`${key.split("|")[2]} — 굳힘을 지운 답 $0$% · 흔들면 늘 달라진다 (220판)`, () => {
      const axis = AXES[key]!;
      let noBind = 0;
      let same = 0;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const want = answerNumber(p.answer);
        const wb = axis.withoutBinding(p.facts);
        if (wb !== null && wb === want) noBind += 1;
        const got = axis.perturbed(p.facts);
        expect(Number.isFinite(got), `${key} 흔든 답이 수가 아니다`).toBe(true);
        if (got === want) same += 1;
      }
      expect(noBind).toBe(0);
      expect(same).toBe(0);
    });
  }

  it("🔴 ㉠ ⑴ 지면 수 조합이 답과 부딪히지 않는다 (220판, 판정기의 자를 그대로 쓴다)", () => {
    for (const key of KEYS) {
      let hit = 0;
      let seen = 0;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const cand = obviousCandidates(pageNumbers(p.content));
        seen += cand.size;
        if ([...cand.values()].includes(answerNumber(p.answer))) hit += 1;
      }
      expect(hit, `${key} 지면 수 조합이 답을 맞혔다`).toBe(0);
      // 🔴 「0건」이 «깨끗»인지 «못 셈»인지 가른다 — 자가 후보를 실제로 만들었나.
      expect(seen, `${key} 지면 수 조합을 한 개도 못 만들었다`).toBeGreaterThan(
        0,
      );
    }
  });

  it("🔴 `61W` 의 지면에는 수가 **하나뿐**이라 그 자가 구조적으로 약하다 — 그 사실을 찍는다", () => {
    // 「0건」을 «깨끗»으로 읽지 않기 위해, 이 유형에서 그 자가 만들 수 있는 후보가
    // 몇 개인지 세어 둔다(전부 $a$ 자신이다).
    const p = build(K61, SEEDS[0]!);
    const cand = obviousCandidates(pageNumbers(p.content));
    expect(new Set(cand.values()).size).toBe(1);
    expect([...cand.values()][0]).toBe(p.facts.a);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 🔴 ㉳ 해설의 «말» — **판정을 진술하는 문장**을 지키는 자
//
// 2026-09-03 검문에서 이 파일의 낱말 가드에 큰 구멍이 있었다. 참인 문장을
// 거짓으로 뒤집는 변이 **13개 중 10개가 초록**이었다 — 「$x$는 $a$의 **약수**」를
// 「배수」로 바꿔도, 「중앙값은 **세 번째** 값」을 「두 번째」로 바꿔도, 「$a\le b$라
// 하자」를 「$a\ge b$」로 바꿔도 아무 시험도 안 물었다. 굳힘 개념과 마무리 논거가
// 통째로 그 문장들 안에 있다.
//
// ⚠️ 값 검산·KaTeX·해설 높이·조사 자는 이 부류를 **구조적으로** 못 본다 —
//    문장이 거짓이어도 값은 그대로이기 때문이다(2026-08-24 「값이 맞으면 시험이
//    다 초록이다」와 같은 자리).
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」 — 값은 지면에서 다시 읽어 만든다. */
function requiredWords(key: string, content: string): string[] {
  if (key === K61) {
    const { a } = read61(content);
    return [
      `두 수의 곱이 $${a}$이므로`,
      `$x$는 $${a}$의 약수이고`,
      `도 $${a}$의 약수이다`,
      `$${a}$의 약수를 모두 더한 값과 같다`,
    ];
  }
  if (key === K62) {
    return ["도수는 학생 수이므로 둘 다 자연수이다", "서로소이므로"];
  }
  if (key === K63) {
    return [
      "다섯 수의 평균은",
      "중앙값은 크기순으로 나열했을 때 세 번째 값인데",
    ];
  }
  if (key === K64) {
    return ["$a\\le b$라 하자", "밑넓이의 $2$배와 옆넓이의 합이므로"];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K61]: [
    ["의 약수이고", "의 배수이고"],
    ["의 약수이다", "의 배수이다"],
    ["의 약수를 모두 더한 값과 같다", "의 배수를 모두 더한 값과 같다"],
    ["두 수의 곱이", "두 수의 합이"],
  ],
  [K62]: [
    ["둘 다 자연수이다", "둘 다 유리수이다"],
    ["서로소이므로", "서로 같으므로"],
  ],
  [K63]: [
    ["다섯 수의 평균은", "다섯 수의 중앙값은"],
    ["세 번째 값인데", "두 번째 값인데"],
  ],
  [K64]: [
    ["$a\\le b$라 하자", "$a\\ge b$라 하자"],
    ["옆넓이의 합이므로", "옆넓이의 곱이므로"],
  ],
};

function missingWords(
  key: string,
  content: string,
  solution: string,
): string[] {
  return requiredWords(key, content).filter((w) => !solution.includes(w));
}

describe("[중1 4차 물결] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
  it("네 유형 모두 — 660판 전량에 그 문장들이 있다", () => {
    for (const key of [K61, K62, K63, K64]) {
      for (const [seed, variant] of WIDE) {
        const p = build(key, seed, variant);
        expect(
          missingWords(key, p.content, p.solution),
          `${key} s${seed}v${variant}`,
        ).toEqual([]);
      }
    }
  });

  it("눈금 — 낱말을 하나씩 뒤집으면 **전부** 빨개진다 (양성 10 · 음성 4)", () => {
    let positives = 0;
    for (const key of [K61, K62, K63, K64]) {
      const p = build(key, SEEDS[0]!, 0);
      // 음성 — 손대지 않은 지면은 깨끗하다
      expect(missingWords(key, p.content, p.solution), key).toEqual([]);
      for (const [from, to] of FLIPS[key]!) {
        // ⚠️ 맞바꿈이 **실제로 일어났는지** 먼저 본다. 안 일어나면 「빨개지지
        //    않았다」가 «가드가 없다»가 아니라 «변이가 헛돌았다»는 뜻이다.
        expect(p.solution, `${key}: 맞바꿀 자리가 없다 — ${from}`).toContain(
          from,
        );
        const flipped = p.solution.split(from).join(to);
        expect(flipped).not.toBe(p.solution);
        positives += 1;
        expect(
          missingWords(key, p.content, flipped),
          `${key}: 「${from}」→「${to}」 를 아무도 안 물었다`,
        ).not.toEqual([]);
      }
    }
    expect(positives).toBe(10);
  });
});
