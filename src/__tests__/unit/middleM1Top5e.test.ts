/**
 * 중1 **5차 확대 갈래 — 갈래 `e`**(`m1Top5e.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `81X` | $N=180-c-r$ 의 **약수**를 $\sqrt N$ 까지 훑어 모으고 두 조건으로 거른다 | 「약수」라는 낱말을 한 번도 안 쓴다 — $d$ 를 $r+1$ 부터 올려 가며 $q$ 를 $1$ 부터 훑어 $d\times q+r=b$ 가 **곱셈만으로** 맞는지 본다 |
 * | `82X` | $S=\dfrac12 rL$ 로 반지름을 **나눗셈 한 번**에 얻는다 | 반지름과 중심각을 **둘 다 훑어** $r\times x=180L$ 과 $r^2\times x=360S$ 를 **곱셈으로만** 맞춘다 |
 * | `83X` | 기울기를 $(n-m)\div(q-p)$ 로 얻고 해를 $p+(0-m)\div a$ 로 얻는다 | 나눗셈을 한 번도 안 한다 — $a$ 를 $-400$ 부터 훑어 $b=m-ap$ 로 두고 $aq+b=n$ 인 $a$ 를 찾은 뒤, 해도 $x$ 를 훑어 $ax+b=0$ 인 자리를 찾는다 |
 * | `84X` | 구간마다 $gap\div rate$ 로 시각을 얻는다 | **분마다** 정수 산술로 높이를 되그려 $d$ 와 같아지는 시각을 줍는다(나눗셈 없음) |
 *
 * ## 🔴 앞 물결이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을 재어
 *    **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어
 *    기약인지 본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로 0 이므로
 *    **찾은 자리 수도 같이 못 박는다.**
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다.** → 공용 `declaredUpperBound` 가
 *    넷 전량에서 `null` 인 것을 660판에서 확인한다(그 자가 읽을 새 표현을 안 썼다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「엇각↔동위각」·「약수↔배수」·
 *    「절반↔두 배」·「참↔거짓」·「되지 않는다↔된다」를 **낱말과 수를 함께** 판정한다.
 *    `toContain` 하나로 끝내지 않는다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다.** → `81X` 는 지면에 적힌
 *    「살아남는 목록」과 「버려지는 목록」을 **다시 읽어** 전자가 두 조건을 모두 만족하고
 *    후자가 하나 이상을 어기는지 잰다. `84X` 는 구간마다 적힌 «왜 살고 죽는지»가
 *    지면의 좌표와 맞는지 잰다.
 * ㉵㉶ **답 쏠림·지름길·손실 원장** → 660판에서 최빈 정답 비중을 재고, 지름길은
 *    **널 모형(답을 판끼리 돌려 끼운 우연 수준)**과 견준다.
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
 * `generateMiddleProblem` 으로 갈아탄다(`m1Top2`~`m1Top4` 시험이 선 자리와 같다).
 *
 * ## ⚠️ 판정기(`scripts/qa/probe-middle-top-m1.ts`)의 `AXES` 는 **리드 몫**이다
 *
 * 그 자는 등록된 중1 `심화중`·`심화상` 을 모집단으로 삼고 축이 없으면 **빨갛게 찍는다.**
 * 이 갈래는 그 파일을 못 만지므로(5차 물결 규약: 자기 파일 둘만), 축을 **여기 같은
 * 모양으로** 두고 넷 다 재 둔다. 리드가 등록할 때 이 표를 그대로 옮기면 된다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { bareNumbers } from "@/lib/elementary/rules";
import { createRng } from "@/lib/elementary/rng";
import {
  declaredUpperBound,
  deriveThreeFormats,
  reversesOrder,
} from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  angleShortcutValues,
  heightCrossings,
  M1_TOP_5E,
  sectorCentralAngle,
  sectorFromAreaAndArc,
  solveFromTwoValues,
  splitAngleDivisors,
  type Segment,
} from "@/lib/middle/m1Top5e";
import { pageShortcutValues } from "@/lib/middle/m1Top4";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem } from "@/lib/middle/types";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { estimateSolutionPx } from "@/lib/printOverflow";
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
  numAnswerJaccard,
} from "../../../scripts/qa/probe-middle-top-m1";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, numVowelFinal, pageSmells } from "../helpers/midPage";

const K81 = "1-2|위치 관계|81X";
const K82 = "1-2|원과 부채꼴|82X";
const K83 = "1-1|일차방정식의 풀이|83X";
const K84 = "1-1|좌표와 그래프|84X";
const KEYS = [K81, K82, K83, K84] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K81]: "심화상",
  [K82]: "심화중",
  [K83]: "심화중",
  [K84]: "심화상",
};

/** 우리 `Unit.section` — 정본과 글자 그대로 대조한다. */
const EXPECTED_SECTION: Record<string, string> = {
  [K81]: "평행선",
  [K82]: "부채꼴의 호의 길이와 넓이",
  [K83]: "방정식과 그 해",
  [K84]: "그래프의 이해",
};

/** 리드가 준 소단원별 변형 폭 하한. `12` 보다 작은 것은 그 수가 **상한**이기도 하다. */
const VARIANT_FLOOR: Record<string, number> = {
  [K81]: 5,
  [K82]: 8,
  [K83]: 12,
  [K84]: 12,
};

const SEEDS = [20260903, 3, 11, 515151, 99991];
const VARIANTS = 4;
const OVERLAP_SEED = 20260827;

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판**. */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < VARIANTS; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

/** 지면 높이·쏠림용 — 씨앗 $220$ × 변형 $3$ = **$660$ 판**(브리프의 600 이상). */
const WIDE: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 220; s += 1) {
    for (let v = 0; v < 3; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_5E.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차e ${key}`);
  assertChoiceCount(content, `중1 5차e ${key}`);
  assertChoiceMarks(content, `중1 5차e ${key}`);
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
 * 🔴 가져다 쓰면 동어반복이라 아무것도 안 지킨다(3차 물결에서 그 변이가 92/92 초록).
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
  13: "열세",
  14: "열네",
  15: "열다섯",
  16: "열여섯",
};

/** 목록 글자(`$3$, $4$, $5$`)에서 수를 읽는다. */
function readList(listTex: string): number[] {
  return [...listTex.matchAll(/\$(-?\d+)\$/g)].map((m) => Number(m[1]));
}

/**
 * 🔴 **수 뒤 주격 조사 「이/가」** — 공용 `josaMismatches` 가 **못 보는 사각**이다.
 *
 * 그 자는 「이」를 `JOSA_PAIR` 에 안 넣는다(서술격 「$5$이다」와 안 갈려 거짓 경보가
 * 쏟아진다 — 그 파일 주석에 적혀 있다). 그래서 「가를 써야 할 자리에 이를 썼다」는
 * **구조적으로 0** 이다. 여기서는 조사가 붙는 **자리를 못 박아** 그 사각을 메운다.
 */
function subjectJosaFor(n: number): "이" | "가" {
  return numVowelFinal(n) ? "가" : "이";
}

function topicJosaFor(n: number): "은" | "는" {
  return numVowelFinal(n) ? "는" : "은";
}

/** **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참. */
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
 * 다루는 것: 정수 · 소수 · `+` · `-` · `\times` · `\div` · `\dfrac{}{}` · `()` · `^{k}`.
 * 그 밖의 글자가 있으면 **던진다** — 조용히 넘기면 못 센 자리가 「깨끗」으로 읽힌다.
 *
 * ⚠️ 이 계산기는 `m1Top4` 시험에도 한 벌 있다. 시험 파일을 서로 import 하면 그쪽
 *    `describe` 가 이 파일 안에서 한 번 더 돌아 **분모가 뒤섞이므로** 옮겨 적었다.
 *    대신 아래 「등식 계산기 자체의 눈금」이 이 벌이 실제로 참·거짓을 가르는지 잰다.
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
      if (!Number.isInteger(k) || k < 0) {
        throw new Error(`지수가 이상하다: ${e}`);
      }
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

/** 「글자가 하나도 없는 순수 산술」인가 — 아니면 이 자가 판정하지 않는다. */
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

/** 순수 산술 등식이 몇 도막인가 — 「구조적으로 0」을 가르려고 따로 센다. */
function arithmeticEquationCount(text: string): number {
  let seen = 0;
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    if (m[1]!.includes("=") && isPureArithmetic(m[1]!)) seen += 1;
  }
  return seen;
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

const RE81 =
  /^평행한 두 직선 \$l\$, \$m\$이 있다\. 직선 \$l\$ 위의 점 \$\\mathrm\{A\}\$와 직선 \$m\$ 위의 서로 다른 두 점 \$\\mathrm\{B\}\$, \$\\mathrm\{C\}\$를 이어 삼각형 \$\\mathrm\{ABC\}\$를 만들었더니 \$\\angle\\mathrm\{BAC\}=(\d+)\^\{\\circ\}\$였다\. \$\\angle\\mathrm\{ABC\}=b\^\{\\circ\}\$, \$\\angle\\mathrm\{ACB\}=d\^\{\\circ\}\$라 할 때 \$b\$와 \$d\$는 모두 자연수이고, 크기가 \$d\^\{\\circ\}\$인 각을 서로 겹치지 않게 여러 개 이어 붙여 크기가 \$b\^\{\\circ\}\$인 각을 채웠더니 \$(\d+)\^\{\\circ\}\$만큼 남았다\. 이때 \$d\$의 값이 될 수 있는 것을 모두 구하여 그 합을 구하시오\.$/;

const RE82 =
  /^넓이가 \$(\d+)\\pi\\,\\mathrm\{cm\}\^\{2\}\$이고 호의 길이가 \$(\d+)\\pi\\,\\mathrm\{cm\}\$인 부채꼴이 있다\. 이 부채꼴과 반지름의 길이는 같고 중심각의 크기는 \$(\d+)\^\{\\circ\}\$만큼 큰 부채꼴의 넓이를 구하시오\.$/;

const RE83 =
  /^\$x\$에 대한 방정식 \$ax\+b=0\$이 있다\. 여기에서 \$a\$, \$b\$는 상수이고 \$a\\neq0\$이다\. 이 방정식의 좌변에 \$x=(-?\d+)\$(?:을|를) 대입하면 그 값이 \$(-?\d+)\$이고, \$x=(-?\d+)\$(?:을|를) 대입하면 그 값이 \$(-?\d+)\$이다\. 이 방정식의 해를 구하시오\.$/;

const RE84 =
  /^어떤 열기구가 지면에서 출발하여 위로 올라갔다가 잠시 아래로 내려온 뒤 다시 위로 올라갔고, 마지막에는 지면으로 내려왔다\. 출발한 지 \$x\$분 후의 열기구의 높이를 \$y\\,\\mathrm\{m\}\$라 할 때, \$x\$의 값이 \$0\$부터 \$(\d+)\$까지 변하는 동안 \$x\$와 \$y\$ 사이의 관계를 나타내는 그래프는 다섯 점 \$\(0, 0\)\$, \$\((\d+), (\d+)\)\$, \$\((\d+), (\d+)\)\$, \$\((\d+), (\d+)\)\$, \$\((\d+), 0\)\$을 차례로 선분으로 이은 것이다\. 열기구의 높이가 \$(\d+)\\,\\mathrm\{m\}\$가 되는 것은 출발한 지 몇 분 후인지 모두 구하여 그 합을 구하시오\.$/;

function read81(content: string): { c: number; r: number } {
  const [c, r] = grab(RE81, content, "81X");
  return { c: num(c!), r: num(r!) };
}

function read82(content: string): {
  area: number;
  arc: number;
  grow: number;
} {
  const [a, l, g] = grab(RE82, content, "82X");
  return { area: num(a!), arc: num(l!), grow: num(g!) };
}

function read83(content: string): {
  p: number;
  m: number;
  q: number;
  n: number;
} {
  const [p, m, q, n] = grab(RE83, content, "83X");
  return { p: num(p!), m: num(m!), q: num(q!), n: num(n!) };
}

type Graph = {
  points: [number, number][];
  d: number;
};

function read84(content: string): Graph {
  const g = grab(RE84, content, "84X");
  const [end, t1, peak, t2, dip, t3, top, t4, d] = g.map(num);
  if (end !== t4) throw new Error("84X: 변하는 구간의 끝과 마지막 점이 다르다");
  return {
    points: [
      [0, 0],
      [t1!, peak!],
      [t2!, dip!],
      [t3!, top!],
      [t4!, 0],
    ],
    d: d!,
  };
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

/** `81X` — 지면만 보고 살아남는 $d$ 를 **곱셈만으로** 다시 찾는다. */
function aliveAnglesFromPage(c: number, r: number): number[] {
  const s = 180 - c;
  const out: number[] = [];
  for (let d = r + 1; d < s; d += 1) {
    const b = s - d;
    if (b < 1) break;
    for (let q = 1; q * d <= b; q += 1) {
      if (d * q + r === b) {
        out.push(d);
        break;
      }
    }
  }
  return out;
}

/** `82X` — 반지름과 중심각을 **둘 다 훑어** 곱셈으로만 맞춘다. */
function sectorFromPage(
  area: number,
  arc: number,
): { radius: number; angle: number } {
  const found: { radius: number; angle: number }[] = [];
  for (let radius = 1; radius <= 120; radius += 1) {
    for (let angle = 1; angle <= 359; angle += 1) {
      if (radius * angle !== 180 * arc) continue;
      if (radius * radius * angle !== 360 * area) continue;
      found.push({ radius, angle });
    }
  }
  if (found.length !== 1) {
    throw new Error(`82X: 반지름과 중심각이 ${found.length} 쌍이다`);
  }
  return found[0]!;
}

/** `83X` — 나눗셈을 한 번도 안 하고 $a$ 와 해를 **훑어** 찾는다. */
function rootFromPage(p: number, m: number, q: number, n: number): number {
  const roots: number[] = [];
  for (let a = -400; a <= 400; a += 1) {
    if (a === 0) continue;
    const b = m - a * p;
    if (a * q + b !== n) continue;
    for (let x = -4000; x <= 4000; x += 1) {
      if (a * x + b === 0) roots.push(x);
    }
  }
  if (roots.length !== 1) {
    throw new Error(`83X: 해가 ${roots.length} 개다`);
  }
  return roots[0]!;
}

/** `84X` — **분마다** 정수 산술로 높이를 되그려 $d$ 가 되는 시각을 줍는다. */
function crossingTimesFromPage(graph: Graph): number[] {
  const out: number[] = [];
  const { points, d } = graph;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    if (x1 <= x0) throw new Error("84X: 시각이 오름차순이 아니다");
    for (let t = x0; t <= x1; t += 1) {
      // 높이 $=y_0+(y_1-y_0)\times(t-x_0)\div(x_1-x_0)$ 의 양변에 $(x_1-x_0)$ 을
      // 곱해 **정수만** 다룬다 — 나눗셈이 없으므로 반올림이 끼어들 자리가 없다.
      if (d * (x1 - x0) !== y0 * (x1 - x0) + (y1 - y0) * (t - x0)) continue;
      if (out.includes(t)) throw new Error("84X: 같은 시각이 두 번 잡혔다");
      out.push(t);
    }
  }
  return out;
}

const VERIFY: Record<string, (content: string) => number> = {
  [K81]: (content) => {
    const { c, r } = read81(content);
    if (c < 1 || c > 178) throw new Error("81X: 꼭지각이 범위를 벗어난다");
    if (r < 1) throw new Error("81X: 남은 각이 $0$ 이하다");
    const alive = aliveAnglesFromPage(c, r);
    if (alive.length < 3 || alive.length > 6) {
      throw new Error(
        `81X: 살아남는 각이 ${alive.length} 개다 (셋~여섯이어야 한다)`,
      );
    }
    if (alive.some((d) => d <= r)) {
      throw new Error("81X: 남은 각보다 작은 값이 살아남았다");
    }
    const x = alive.reduce((a, b) => a + b, 0);
    if (alive.includes(x)) throw new Error("81X: 답이 후보 목록 안에 있다");
    if (angleShortcutValues(c, r).has(x)) {
      throw new Error("81X: 답이 $180$ 과 지면 두 수의 조합으로 나온다");
    }
    if (pageShortcutValues([c, r]).has(x)) {
      throw new Error("81X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K82]: (content) => {
    const { area, arc, grow } = read82(content);
    if (arc < 2) throw new Error("82X: 호의 길이가 너무 짧다");
    if (grow < 1) throw new Error("82X: 중심각이 커지지 않는다");
    const { radius, angle } = sectorFromPage(area, arc);
    if (angle + grow > 360) {
      throw new Error("82X: 커진 중심각이 $360^{\\circ}$ 를 넘는다");
    }
    const scaled = radius * radius * (angle + grow);
    if (scaled % 360 !== 0)
      throw new Error("82X: 구하는 넓이가 자연수가 아니다");
    const x = scaled / 360;
    if (x === area) throw new Error("82X: 답이 주어진 넓이와 같다");
    if (pageShortcutValues([area, arc, grow, 2]).has(x)) {
      throw new Error("82X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K83]: (content) => {
    const { p, m, q, n } = read83(content);
    if (p === q) throw new Error("83X: 두 대입점이 같다");
    if (m === n) throw new Error("83X: 두 값이 같아 $a$ 가 $0$ 이다");
    if (m === 0 || n === 0) {
      throw new Error("83X: 대입한 값이 $0$ 이라 해가 발문에 그대로 있다");
    }
    if (p === 0)
      throw new Error("83X: 대입점이 $0$ 이면 해설에 «$q-0$» 이 찍힌다");
    const x = rootFromPage(p, m, q, n);
    if (x === 0) throw new Error("83X: 해가 $0$ 이다");
    if (Math.abs(x) < 2) throw new Error("83X: 해의 절댓값이 $2$ 보다 작다");
    if (pageShortcutValues([0, p, m, q, n]).has(x)) {
      throw new Error("83X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K84]: (content) => {
    const graph = read84(content);
    const [, [, peak], [, dip], [, top]] = graph.points;
    if (!(dip! < peak! && peak! < top!)) {
      throw new Error("84X: 높이가 «올랐다 내렸다 더 올랐다» 꼴이 아니다");
    }
    if (graph.d <= 0 || graph.d >= top!) {
      throw new Error("84X: 묻는 높이가 그래프 밖이다");
    }
    if (graph.d === peak || graph.d === dip) {
      throw new Error("84X: 묻는 높이가 꼭짓점 높이와 같다");
    }
    const times = crossingTimesFromPage(graph);
    if (times.length < 2) {
      throw new Error(
        `84X: 높이가 되는 때가 ${times.length} 번이다 (둘 이상이어야 한다)`,
      );
    }
    const x = times.reduce((a, b) => a + b, 0);
    if (times.includes(x)) throw new Error("84X: 답이 후보 목록 안에 있다");
    const nums = graph.points.flat();
    if (pageShortcutValues([...nums, graph.d]).has(x)) {
      throw new Error("84X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },
};

/**
 * 해설에 **나와도 되는 수** — `content` 만 보고 다시 만든다.
 *
 * 여기 없는 수가 해설에 있으면 그것은 **아무 재계산으로도 설명되지 않는 수**다.
 */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K81]: (content) => {
    const { c, r } = read81(content);
    const s = 180 - c;
    const n = s - r;
    const out = new Set<number>([180, c, s, r, n, 1, 2]);
    for (let d = 1; d <= n; d += 1) if (n % d === 0) out.add(d);
    out.add(aliveAnglesFromPage(c, r).reduce((a, b) => a + b, 0));
    let mm = n;
    for (let pr = 2; pr * pr <= mm; pr += 1) {
      let e = 0;
      while (mm % pr === 0) {
        mm /= pr;
        e += 1;
      }
      if (e > 0) {
        out.add(pr);
        out.add(e);
      }
    }
    if (mm > 1) out.add(mm);
    return out;
  },
  [K82]: (content) => {
    const { area, arc, grow } = read82(content);
    const { radius, angle } = sectorFromPage(area, arc);
    return new Set<number>([
      1,
      2,
      180,
      360,
      area,
      arc,
      grow,
      radius,
      angle,
      angle + grow,
      (radius * radius * (angle + grow)) / 360,
    ]);
  },
  [K83]: (content) => {
    const { p, m, q, n } = read83(content);
    const x = rootFromPage(p, m, q, n);
    const out = new Set<number>([0, 1, p, q, m, n, x]);
    out.add(q - p);
    out.add(n - m);
    out.add(-m);
    out.add(x - p);
    // 기울기 — 지면에는 «$a$의 값» 으로 찍힌다.
    out.add((n - m) / (q - p));
    // 음수는 `-` 를 뗀 자리로 찍히므로 절댓값도 설명된 것으로 본다.
    for (const v of [...out]) out.add(Math.abs(v));
    return out;
  },
  [K84]: (content) => {
    const graph = read84(content);
    const out = new Set<number>([0, 1, graph.d]);
    for (const [t, h] of graph.points) {
      out.add(t);
      out.add(h);
    }
    for (let i = 0; i < graph.points.length - 1; i += 1) {
      const [x0, y0] = graph.points[i]!;
      const [x1, y1] = graph.points[i + 1]!;
      const span = x1 - x0;
      const diff = Math.abs(y1 - y0);
      out.add(span);
      out.add(diff);
      out.add(diff / span);
      const gap = y1 > y0 ? graph.d - y0 : y0 - graph.d;
      out.add(gap);
      if (span !== 0 && diff !== 0 && (gap * span) % diff === 0) {
        out.add((gap * span) / diff);
        out.add(x0 + (gap * span) / diff);
      }
    }
    out.add(crossingTimesFromPage(graph).reduce((a, b) => a + b, 0));
    return out;
  },
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 손으로 쓴 지면(엔진 밖) — 답을 사람이 계산해 두었다. */
const GOOD_PAGES: readonly { key: string; page: string; want: number }[] = [
  {
    key: K81,
    // $c=20$, $r=6$ → $S=160$, $N=154=2\times7\times11$.
    // $154$ 의 약수 $1,2,7,11,14,22,77,154$ 중 $6$ 보다 크고 $154$ 가 아닌 것은
    // $7,11,14,22,77$ → 합 $131$.
    page:
      "평행한 두 직선 $l$, $m$이 있다. 직선 $l$ 위의 점 $\\mathrm{A}$와 직선 $m$ 위의 " +
      "서로 다른 두 점 $\\mathrm{B}$, $\\mathrm{C}$를 이어 삼각형 $\\mathrm{ABC}$를 " +
      "만들었더니 $\\angle\\mathrm{BAC}=20^{\\circ}$였다. $\\angle\\mathrm{ABC}=b^{\\circ}$, " +
      "$\\angle\\mathrm{ACB}=d^{\\circ}$라 할 때 $b$와 $d$는 모두 자연수이고, 크기가 " +
      "$d^{\\circ}$인 각을 서로 겹치지 않게 여러 개 이어 붙여 크기가 $b^{\\circ}$인 각을 " +
      "채웠더니 $6^{\\circ}$만큼 남았다. 이때 $d$의 값이 될 수 있는 것을 모두 구하여 " +
      "그 합을 구하시오.",
    want: 131,
  },
  {
    key: K82,
    // $S=60$, $L=10$ → $r=12$, $x=150$. $d=30$ → $12^2\times180\div360=72$.
    page:
      "넓이가 $60\\pi\\,\\mathrm{cm}^{2}$이고 호의 길이가 $10\\pi\\,\\mathrm{cm}$인 " +
      "부채꼴이 있다. 이 부채꼴과 반지름의 길이는 같고 중심각의 크기는 " +
      "$30^{\\circ}$만큼 큰 부채꼴의 넓이를 구하시오.",
    want: 72,
  },
  {
    key: K83,
    // $a=3$, 해 $x=-3$ → $x=1$ 일 때 $12$, $x=7$ 일 때 $30$.
    page:
      "$x$에 대한 방정식 $ax+b=0$이 있다. 여기에서 $a$, $b$는 상수이고 $a\\neq0$이다. " +
      "이 방정식의 좌변에 $x=1$을 대입하면 그 값이 $12$이고, $x=7$을 대입하면 " +
      "그 값이 $30$이다. 이 방정식의 해를 구하시오.",
    want: -3,
  },
  {
    key: K84,
    // $(0,0)-(12,60)-(20,20)-(30,70)-(44,0)$, $d=30$ →
    // $6$ · $18$ · $22$ · $38$ → 합 $84$.
    page:
      "어떤 열기구가 지면에서 출발하여 위로 올라갔다가 잠시 아래로 내려온 뒤 다시 " +
      "위로 올라갔고, 마지막에는 지면으로 내려왔다. 출발한 지 $x$분 후의 열기구의 " +
      "높이를 $y\\,\\mathrm{m}$라 할 때, $x$의 값이 $0$부터 $44$까지 변하는 동안 " +
      "$x$와 $y$ 사이의 관계를 나타내는 그래프는 다섯 점 $(0, 0)$, $(12, 60)$, " +
      "$(20, 20)$, $(30, 70)$, $(44, 0)$을 차례로 선분으로 이은 것이다. 열기구의 " +
      "높이가 $30\\,\\mathrm{m}$가 되는 것은 출발한 지 몇 분 후인지 모두 구하여 " +
      "그 합을 구하시오.",
    want: 84,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K81,
    page: GOOD_PAGES[0]!.page.replace(
      "=20^{\\circ}$였다",
      "=170^{\\circ}$였다",
    ),
    why: "$N=4$ 라 살아남는 각이 셋에 못 미친다",
  },
  {
    key: K81,
    page: GOOD_PAGES[0]!.page.replace(
      "$6^{\\circ}$만큼 남았다",
      "$1^{\\circ}$만큼 남았다",
    ),
    why: "$N=159$ 의 약수 중 조건에 맞는 것이 둘뿐이다",
  },
  {
    key: K82,
    page: GOOD_PAGES[1]!.page.replace("$60\\pi", "$61\\pi"),
    why: "그런 반지름·중심각 쌍이 없다",
  },
  {
    key: K82,
    page: GOOD_PAGES[1]!.page.replace(
      "$30^{\\circ}$만큼",
      "$300^{\\circ}$만큼",
    ),
    why: "커진 중심각이 $360^{\\circ}$ 를 넘는다",
  },
  {
    key: K83,
    page: GOOD_PAGES[2]!.page.replace("그 값이 $30$이다", "그 값이 $12$이다"),
    why: "두 값이 같아 $a$ 가 $0$ 이다",
  },
  {
    key: K83,
    page: GOOD_PAGES[2]!.page.replace("그 값이 $12$이고", "그 값이 $13$이고"),
    why: "기울기가 정수가 아니라 해가 없다",
  },
  {
    key: K84,
    page: GOOD_PAGES[3]!.page.replace(
      "$(20, 20)$, $(30, 70)$",
      "$(20, 20)$, $(30, 50)$",
    ),
    why: "마지막 봉우리가 처음 봉우리보다 낮다 (꼴이 다르다)",
  },
  {
    key: K84,
    page: GOOD_PAGES[3]!.page.replace(
      "높이가 $30\\,\\mathrm{m}$가 되는",
      "높이가 $20\\,\\mathrm{m}$가 되는",
    ),
    why: "묻는 높이가 꼭짓점 높이와 같다",
  },
];

describe("중1 5차e 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 검산기가 `facts.x` 를 되읽는 판이었다면 여기서 통과할 수가 없다
    // (손으로 쓴 지면에는 `facts` 가 없다).
    expect(GOOD_PAGES).toHaveLength(4);
    for (const g of GOOD_PAGES) {
      expect(VERIFY[g.key]!(g.page), `${g.key} 손 계산 ${g.want}`).toBe(g.want);
    }
  });

  it("🔴 음성 — 불변식을 어긴 지면은 반드시 던진다", () => {
    expect(BAD_PAGES.length).toBeGreaterThanOrEqual(8);
    for (const b of BAD_PAGES) {
      // 맞바꿈이 실제로 일어났는지 먼저 본다 — 안 바뀌었으면 이 눈금은 헛돈다.
      expect(
        GOOD_PAGES.some((g) => g.key === b.key && g.page === b.page),
        `${b.key}: 나쁜 지면이 좋은 지면과 같다 — ${b.why}`,
      ).toBe(false);
      expect(() => VERIFY[b.key]!(b.page), b.why).toThrow();
    }
  });

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·소수·못 읽음을 각각 가른다", () => {
    expect(evalTex("12^{2}\\times180\\div360").n).toBe(72);
    expect(evalTex("9-(-6)").n).toBe(15);
    expect(evalTex("\\dfrac{1}{2}\\times12\\times10").n).toBe(60);
    expect(evalTex("0.5\\times4").n).toBe(2);
    expect(arithmeticEquationFailures("$2+2=4$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$2+2=5$이다.")).toHaveLength(1);
    // 글자가 섞이면 판정하지 않는다(거짓 빨강 방지) — 그 사실을 못 박는다.
    expect(arithmeticEquationFailures("$a\\times5=15$이다.")).toEqual([]);
    // 🔴 **모르는 명령이 들어오면 «순수 산술이 아니다»로 빠진다** — 그러니까 이 자의
    //    「0건」은 «지면이 깨끗하다»가 아니라 «내가 읽은 도막이 다 맞다»는 뜻뿐이다.
    //    그래서 위 「220판에서 도막 수가 판마다 셋 이상」을 함께 못 박아 둔다.
    expect(arithmeticEquationFailures("$2\\sqrt{2}=3$")).toEqual([]);
    // 계산기 자체는 못 읽는 글자에 **던진다**(조용히 넘기지 않는다).
    expect(() => evalTex("2\\sqrt{2}")).toThrow();
  });

  it("🔴 수관형사 표가 생성기 것과 **다른 벌**이다 — 가져다 쓰면 동어반복이다", () => {
    const src = M1_TOP_5E[0]!.handler(createRng(20260903));
    expect(Object.keys(COUNT_WORD)).toHaveLength(16);
    expect(COUNT_WORD[4]).toBe("네");
    // 생성기가 실제로 그 표를 쓰는지 — 지면에 셈말이 있어야 이 검사가 뜻을 가진다.
    expect(src.solution).toMatch(
      /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두|열세|열네|열다섯|열여섯) 개/,
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조 (㉡)
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`splitAngleDivisors` 는 손 계산과 맞는다", () => {
    // $154=2\times7\times11$ 의 약수 $1,2,7,11,14,22,77,154$ 중 $6<d\ne154$.
    expect(splitAngleDivisors(154, 6)).toEqual([7, 11, 14, 22, 77]);
    expect(splitAngleDivisors(108, 17)).toEqual([18, 27, 36, 54]);
    expect(() => splitAngleDivisors(0, 1)).toThrow();
    expect(() => splitAngleDivisors(10, -1)).toThrow();
  });

  it("🔴 음성 대조 — $c$ 와 $r$ 을 함께 옮기면 답이 **그대로**다 (흔들기가 «그대로»를 낼 수 있다)", () => {
    // 굳힘은 $c$ 와 $r$ 각각이 아니라 그 **차** $N=180-c-r$ 에 걸린다.
    const a = splitAngleDivisors(180 - 20 - 6, 6);
    const b = splitAngleDivisors(180 - 21 - 5, 5);
    expect(a.reduce((s, v) => s + v, 0)).toBe(b.reduce((s, v) => s + v, 0));
    // 그런데 $r$ **하나만** 흔들면 달라진다 — 그것이 이 유형의 굳힘이다.
    expect(splitAngleDivisors(154, 7)).not.toEqual(a);
  });

  it("`sectorFromAreaAndArc`·`sectorCentralAngle` 은 손 계산과 맞는다", () => {
    expect(sectorFromAreaAndArc(60, 10)).toBe(12);
    expect(sectorCentralAngle(12, 10)).toBe(150);
    expect(() => sectorFromAreaAndArc(60, 0)).toThrow();
    expect(() => sectorCentralAngle(0, 10)).toThrow();
  });

  it("🔴 음성 대조 — 넓이와 호를 **같은 배로** 키우면 반지름이 그대로다", () => {
    expect(sectorFromAreaAndArc(120, 20)).toBe(sectorFromAreaAndArc(60, 10));
    // 한쪽만 흔들면 달라진다.
    expect(sectorFromAreaAndArc(120, 10)).not.toBe(
      sectorFromAreaAndArc(60, 10),
    );
  });

  it("`solveFromTwoValues` 는 손 계산과 맞고, 못 푸는 것은 던진다", () => {
    // $a=3$, $b=9$ → 해 $-3$. $x=1$ 일 때 $12$, $x=7$ 일 때 $30$.
    expect(solveFromTwoValues(1, 12, 7, 30)).toBe(-3);
    expect(solveFromTwoValues(2, -6, 7, 9)).toBe(4);
    expect(() => solveFromTwoValues(1, 12, 1, 30)).toThrow();
    expect(() => solveFromTwoValues(1, 12, 7, 12)).toThrow();
    expect(() => solveFromTwoValues(1, 13, 7, 30)).toThrow();
  });

  it("🔴 음성 대조 — $m$ 과 $n$ 을 함께 옮겨도 기울기는 그대로다", () => {
    // 기울기 굳힘은 두 값 각각이 아니라 그 **차**에 걸린다 — 그래서 해가 옮겨 간다.
    expect(solveFromTwoValues(1, 12, 7, 30)).toBe(-3);
    expect(solveFromTwoValues(1, 15, 7, 33)).toBe(-4);
    // 그러나 $p$·$q$ 까지 같이 옮기면 해도 그만큼 옮겨 갈 뿐이다.
    expect(solveFromTwoValues(2, 12, 8, 30)).toBe(-2);
  });

  it("`heightCrossings` 는 손 계산과 맞는다", () => {
    const segs: Segment[] = [
      { from: 0, to: 12, low: 0, high: 60, rate: 5, rising: true },
      { from: 12, to: 20, low: 60, high: 20, rate: 5, rising: false },
      { from: 20, to: 30, low: 20, high: 70, rate: 5, rising: true },
      { from: 30, to: 44, low: 70, high: 0, rate: 5, rising: false },
    ];
    expect(heightCrossings(segs, 30).map((h) => h.at)).toEqual([6, 18, 22, 38]);
    expect(heightCrossings(segs, 10).map((h) => h.index)).toEqual([0, 3]);
    expect(heightCrossings(segs, 65).map((h) => h.index)).toEqual([2, 3]);
    expect(() => heightCrossings(segs, 31)).toThrow();
  });

  it("🔴 음성 대조 — $d$ 가 가장 높은 곳보다 크면 살아남는 구간이 **하나도 없다**", () => {
    const segs: Segment[] = [
      { from: 0, to: 12, low: 0, high: 60, rate: 5, rising: true },
      { from: 12, to: 20, low: 60, high: 20, rate: 5, rising: false },
      { from: 20, to: 30, low: 20, high: 70, rate: 5, rising: true },
      { from: 30, to: 44, low: 70, high: 0, rate: 5, rising: false },
    ];
    expect(heightCrossings(segs, 90)).toEqual([]);
  });

  it("`angleShortcutValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    const s = angleShortcutValues(20, 6);
    expect(s.has(180 - 20)).toBe(true); // $S$ 자체는 뻔한 값이다
    expect(s.has(131)).toBe(false); // 진짜 답은 안 들어 있다
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5E).toHaveLength(4);
    expect(new Set(M1_TOP_5E.map((e) => e.key)).size).toBe(4);
    expect(M1_TOP_5E.map((e) => e.key).sort()).toEqual([...KEYS].sort());
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5E) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), `${e.key} 번호`).toBeNull();
    }
  });

  it("🔴 소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5E) {
      expect(e.unitSection).toBe(EXPECTED_SECTION[e.key]);
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
      expect(e.grade).toBe("중1");
    }
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const marks = KEYS.map((k) => REGISTERED.has(k));
    expect(new Set(marks).size).toBe(1);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_5E) {
      for (const seed of SEEDS) {
        const raw = e.handler(createRng(seed));
        expect(wrapDanClause(raw.content), `${e.key} 단서절`).toBe(raw.content);
        expect(tidySolution(raw.solution), `${e.key} 되풀이`).toBe(
          raw.solution,
        );
        expect(
          resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
          `${e.key} 갈래 내림`,
        ).toBe(raw.difficulty);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
  });

  for (const e of M1_TOP_5E) {
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
          for (const m of `${p.content}\n${p.solution}`.matchAll(
            /\$([^$]*?)(-?\d+)\$(을|를|은|는|와|과|가)/g,
          )) {
            sites += 1;
            const want = m[3] === "가" || m[3] === "이" ? "이/가" : m[3]!;
            expect(want).toBeTruthy();
          }
        }
        expect(sites).toBeGreaterThan(40);
      });

      it("🔴 「이/가」 자리를 **직접** 잰다 (공용 자가 못 보는 사각, 220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const both = `${p.content}\n${p.solution}`;
          for (const m of both.matchAll(
            /\$([^$]*?)(-?\d+)\$(이|가)(?![다므고])/g,
          )) {
            const want = subjectJosaFor(Number(m[2]));
            expect(m[3], `${e.key} ${seed}/${v} — $…${m[2]}$${m[3]}`).toBe(
              want,
            );
          }
          for (const m of both.matchAll(/\$([^$]*?)(-?\d+)\$(은|는)/g)) {
            const want = topicJosaFor(Number(m[2]));
            expect(m[3], `${e.key} ${seed}/${v} — $…${m[2]}$${m[3]}`).toBe(
              want,
            );
          }
        }
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
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 셋 이상**을
        //    요구한다 — 실측 최저는 `81X` 의 판당 넷이다.
        expect(seen).toBeGreaterThan(220 * 3);
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
        // `82X` 는 판마다 $\dfrac{1}{2}$ 가 **두 자리**(넓이 관계 줄과 그 다음 줄)다.
        if (e.key === K82) expect(seen).toBe(440);
        else expect(seen).toBe(0);
      });

      it("🔴 ㉱ 발문이 상한을 선언하지 않는다 (공용 `declaredUpperBound` 가 `null`)", () => {
        for (const [seed, v] of BULK) {
          expect(
            declaredUpperBound(build(e.key, seed, v).content),
            `${e.key} ${seed}/${v}`,
          ).toBeNull();
        }
        // 그 자가 살아 있는지 — 상한을 선언하는 글은 $1$ 을 낸다.
        expect(declaredUpperBound("전체 일의 양을 $1$로 놓고 생각하자.")).toBe(
          1,
        );
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
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 변형 폭 (리드가 준 소단원별 floor)
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 변형 폭", () => {
  /**
   * 🔴 **왜 «전 씨앗 100%» 를 요구하지 않나.**
   *
   * `variant` 는 씨앗을 옮길 뿐이라 창에서 **되뽑기**가 일어난다(생일 문제).
   * 창이 $W$ 이고 $k$ 개를 뽑으면 겹칠 확률이 대략 $k(k-1)/(2W)$ 다 —
   * 실측 창은 `81X` **386** · `82X` **1997** 이라 각각 2.6% · 1.4% 가 구조적으로
   * 어쩔 수 없다. 그것을 「100%」로 못 박으면 **가드가 아니라 운**이 된다.
   * 그래서 ⑴ 씨앗 400개 중 몇 개가 `floor` 를 채우는지의 **비율**과
   * ⑵ 통틀어 몇 가지가 나오는지를 함께 잠근다.
   *
   * 실측(씨앗 400): `81X` 98.8% · `82X` 99.3% · `83X` 100% · `84X` 100%.
   *
   * ⚠️ 씨앗 수를 $400$ → $200$ 으로 줄인 것은 **`84X` 의 생성이 느려서**다
   * (판마다 높이 후보를 전부 훑는다 — 실측 1,200판 $3.0$초). $200$ 이면 위 비율의
   * 표준오차가 `81X` 기준 약 $0.8$%p 라 문턱 $95$% 와 충분히 벌어져 있다.
   */
  const SEED_COUNT = 200;

  for (const e of M1_TOP_5E) {
    it(`${e.rpmType} — 변형 $0$..${VARIANT_FLOOR[e.key]! - 1} 이 서로 다르다`, () => {
      const floor = VARIANT_FLOOR[e.key]!;
      let full = 0;
      let worst = floor;
      const totals = new Set<string>();
      for (let s = 0; s < SEED_COUNT; s += 1) {
        const seed = 700003 + s * 5449;
        const seen = new Set<string>();
        for (let v = 0; v < floor; v += 1) {
          const c = build(e.key, seed, v).content;
          seen.add(c);
          totals.add(c);
        }
        if (seen.size === floor) full += 1;
        worst = Math.min(worst, seen.size);
      }
      expect(
        full / SEED_COUNT,
        `${e.key} — 씨앗 ${SEED_COUNT} 중 ${full}개만 ${floor}가지를 채웠다`,
      ).toBeGreaterThanOrEqual(0.95);
      expect(worst, `${e.key} 최저`).toBeGreaterThanOrEqual(floor - 1);
      // 창이 `floor` 보다 훨씬 넓은지도 같이 못 박는다 — 좁으면 위 비율이 운이다.
      expect(totals.size, `${e.key} 통틀어`).toBeGreaterThan(floor * 20);
    }, 90_000);
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`81X` — 살아남는 창의 **시작 자리**가 씨앗을 가로질러 갈린다", () => {
    const starts = new Set<number>();
    let droppedTwoOrMore = 0;
    for (const [seed, v] of WIDE) {
      const { c, r } = read81(build(K81, seed, v).content);
      const n = 180 - c - r;
      const divs: number[] = [];
      for (let d = 1; d <= n; d += 1) if (n % d === 0) divs.push(d);
      const alive = aliveAnglesFromPage(c, r);
      starts.add(divs.indexOf(alive[0]!));
      if (divs.filter((d) => d <= r).length >= 2) droppedTwoOrMore += 1;
    }
    // 늘 같은 자리에서 시작하면 굳힘이 «어느 후보인가»를 한 번도 안 고른 것이다.
    expect(starts.size).toBeGreaterThan(2);
    expect(starts.has(1)).toBe(false); // $1$ 만 떨구는 판은 생성기가 버린다
    expect(droppedTwoOrMore).toBe(WIDE.length);
  });

  it("`84X` — 살아남는 구간의 **모임**이 세 가지로 갈린다", () => {
    const shapes = new Map<string, number>();
    for (const [seed, v] of WIDE) {
      const graph = read84(build(K84, seed, v).content);
      const times = crossingTimesFromPage(graph);
      const idx: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        const [x0] = graph.points[i]!;
        const [x1] = graph.points[i + 1]!;
        if (times.some((t) => t > x0 && t < x1)) idx.push(i + 1);
      }
      const key = idx.join("");
      shapes.set(key, (shapes.get(key) ?? 0) + 1);
    }
    // $d<C$ → $\{1,4\}$ · $C<d<A$ → $\{1,2,3,4\}$ · $A<d<B$ → $\{3,4\}$
    expect([...shapes.keys()].sort()).toEqual(["1234", "14", "34"]);
    for (const [, n] of shapes) expect(n).toBeGreaterThan(20);
  });

  it("`82X`·`83X` — **해당 없음**: 후보 목록이 없다(값이 하나로 굳는다)", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다 — 그 사실을 여기서 찍는다.
    // 굳힘이 값을 **하나**로 정한다는 것을 반례가 없음으로 보인다.
    for (const [seed, v] of BULK.slice(0, 40)) {
      const { area, arc } = read82(build(K82, seed, v).content);
      // `sectorFromPage` 는 쌍이 정확히 하나가 아니면 던진다.
      expect(() => sectorFromPage(area, arc)).not.toThrow();
      const { p, m, q, n } = read83(build(K83, seed, v).content);
      // `rootFromPage` 도 해가 정확히 하나가 아니면 던진다.
      expect(() => rootFromPage(p, m, q, n)).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 흔들면 답이 달라지나
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("`81X` — 남은 각을 흔들면 답이 달라진다 (220판)", () => {
    let same = 0;
    for (const [seed, v] of BULK) {
      const p = build(K81, seed, v);
      const { c, r } = read81(p.content);
      const want = answerNumber(p.answer);
      const shaken = splitAngleDivisors(180 - c - (r + 1), r + 1).reduce(
        (a, b) => a + b,
        0,
      );
      if (shaken === want) same += 1;
    }
    expect(same).toBe(0);
  });

  it("`82X` — 넓이를 흔들면 답이 달라진다 (220판)", () => {
    let same = 0;
    for (const [seed, v] of BULK) {
      const p = build(K82, seed, v);
      const { area, arc, grow } = read82(p.content);
      const want = answerNumber(p.answer);
      const radius = sectorFromAreaAndArc(area + arc, arc);
      const angle = sectorCentralAngle(radius, arc);
      if ((radius * radius * (angle + grow)) / 360 === want) same += 1;
    }
    expect(same).toBe(0);
  });

  it("`83X` — 두 대입값을 함께 흔들면 해가 옮겨 간다 (220판)", () => {
    /**
     * 🔴 흔드는 축을 고를 때 **풀 수 있는 흔들기**여야 한다. 처음에는 $n$ 만
     * $(q-p)$ 만큼 올려 기울기를 $a+1$ 로 만들었는데, 그러면 해가 정수가 아니게 되어
     * **220판 중 36판만** 판정에 닿았다 — 그 「0건」은 «굳힘이 산다»가 아니라
     * «대부분을 못 쟀다»는 뜻이 된다. 두 값을 함께 $a$ 만큼 내리면 기울기는 그대로고
     * 해만 $1$ 커지므로 **전 판이 판정에 닿는다.**
     *
     * 이 흔들기가 무엇을 지키나: `solveFromTwoValues` 가 $m$ 을 **실제로 읽는가**.
     * 차 $n-m$ 만 보고 $m$ 을 무시하는 판이었다면 답이 그대로여서 여기가 빨개진다.
     */
    let same = 0;
    let counted = 0;
    for (const [seed, v] of BULK) {
      const p = build(K83, seed, v);
      const { p: pp, m, q, n } = read83(p.content);
      const want = answerNumber(p.answer);
      const a = (n - m) / (q - pp);
      const got = solveFromTwoValues(pp, m - a, q, n - a);
      counted += 1;
      expect(got, `${seed}/${v} 흔든 해`).toBe(want + 1);
      if (got === want) same += 1;
    }
    expect(same).toBe(0);
    expect(counted).toBe(220);
  });

  it("`84X` — 묻는 높이를 흔들면 **시각의 모임**이 달라진다 (220판)", () => {
    /**
     * 🔴 여기서 견주는 것은 **합이 아니라 시각의 모임**이다.
     *
     * 합으로 견주면 «흔들어도 그대로»가 실측 220판 중 **27판(12.3%)** 나온다.
     * 그것은 결함이 아니라 대수적 상쇄다 — 첫 구간과 넷째 구간의 빠르기가 같으면
     * 높이를 $\delta$ 올릴 때 첫 시각이 $\delta\div u_1$ 늦어지고 넷째 시각이
     * 같은 만큼 빨라져 합이 **정확히** 되돌아온다. 굳힘(어느 구간이 사는가)은
     * 멀쩡히 일하고 있으므로, 그 자리를 「굳힘이 장식」으로 읽으면 거짓 신고다.
     * 그래서 답을 이루는 **모임 자체**가 달라지는지를 본다.
     */
    let same = 0;
    let moved = 0;
    let sumSame = 0;
    for (const [seed, v] of BULK) {
      const p = build(K84, seed, v);
      const graph = read84(p.content);
      const want = crossingTimesFromPage(graph);
      for (let step = 1; step <= 20; step += 1) {
        const other = { ...graph, d: graph.d + step };
        if (other.d >= graph.points[3]![1]) break;
        let times: number[];
        try {
          times = crossingTimesFromPage(other);
        } catch {
          continue;
        }
        if (times.length < 2) continue;
        moved += 1;
        if (times.join(",") === want.join(",")) same += 1;
        if (
          times.reduce((a, b) => a + b, 0) === want.reduce((a, b) => a + b, 0)
        ) {
          sumSame += 1;
        }
        break;
      }
    }
    expect(same).toBe(0);
    expect(moved).toBeGreaterThan(100);
    // 위 주석의 «12.3%» 가 지금도 그 자리인지 같이 못 박는다 — 크게 벌어지면
    // 상쇄가 아니라 다른 일이 일어난 것이다.
    expect(sumSame).toBeGreaterThan(0);
    expect(sumSame).toBeLessThan(moved / 2);
  });
});

// ═══════════════════════════════════════════════════════════
// 나열 줄을 한 줄씩 다시 셈한다 (㉴ 포함)
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`81X` — 약수 목록·살아남는 목록·버려지는 목록·셈말이 서로 맞는다 (660판)", () => {
    for (const [seed, v] of WIDE) {
      const p = build(K81, seed, v);
      const { c, r } = read81(p.content);
      const n = 180 - c - r;
      const where = `${seed}/${v}`;

      const divLine = /의 약수는 ([^\n]+?)의 (\S+) 개이다/.exec(p.solution);
      expect(divLine, `${where} 약수 줄이 없다`).not.toBeNull();
      const divs = readList(divLine![1]!);
      const wantDivs: number[] = [];
      for (let d = 1; d <= n; d += 1) if (n % d === 0) wantDivs.push(d);
      expect(divs, `${where} 약수 목록`).toEqual(wantDivs);
      expect(divLine![2], `${where} 약수 셈말`).toBe(COUNT_WORD[divs.length]);

      const aliveLine =
        /이 약수 중에서 \$(\d+)\$[을를] 넘고 \$(\d+)\$[이가] 아닌 것은 ([^\n]+?)의 (\S+) 개이고, ([^\n]+?)[은는] 이 두 조건 중 하나를 어겨 버려진다/.exec(
          p.solution,
        );
      expect(aliveLine, `${where} 살아남는 줄이 없다`).not.toBeNull();
      // 🔴 ㉴ 지면이 스스로 세운 두 제약을 그 뒤 모든 줄이 지키는가.
      expect(Number(aliveLine![1]), `${where} 첫 제약`).toBe(r);
      expect(Number(aliveLine![2]), `${where} 둘째 제약`).toBe(n);
      const alive = readList(aliveLine![3]!);
      const dropped = readList(aliveLine![5]!);
      expect(alive, `${where} 살아남는 목록`).toEqual(
        aliveAnglesFromPage(c, r),
      );
      expect(aliveLine![4], `${where} 살아남는 셈말`).toBe(
        COUNT_WORD[alive.length],
      );
      for (const d of alive) {
        expect(d > r && d !== n, `${where} 살아남은 ${d}`).toBe(true);
      }
      for (const d of dropped) {
        expect(d <= r || d === n, `${where} 버려진 ${d}`).toBe(true);
      }
      expect(
        [...alive, ...dropped].sort((a, b) => a - b),
        `${where} 합집합`,
      ).toEqual(wantDivs);

      const sumLine = new RegExp(
        `구하는 합은 \\$${alive.join("\\+")}=(\\d+)\\$이다`,
      ).exec(p.solution);
      expect(sumLine, `${where} 합 줄이 없다`).not.toBeNull();
      expect(Number(sumLine![1])).toBe(answerNumber(p.answer));
    }
  });

  it("`82X` — 반지름·중심각·커진 중심각·넓이 줄이 모두 참이다 (660판)", () => {
    for (const [seed, v] of WIDE) {
      const p = build(K82, seed, v);
      const { area, arc, grow } = read82(p.content);
      const { radius, angle } = sectorFromPage(area, arc);
      const where = `${seed}/${v}`;

      const rLine = new RegExp(
        `\\$r\\$의 값은 \\$2\\\\times${area}\\\\div${arc}=(\\d+)\\$이다`,
      ).exec(p.solution);
      expect(rLine, `${where} 반지름 줄이 없다`).not.toBeNull();
      expect(Number(rLine![1]), `${where} 반지름`).toBe(radius);

      const xLine = new RegExp(
        `\\$x\\$의 값은 \\$180\\\\times${arc}\\\\div${radius}=(\\d+)\\$이다`,
      ).exec(p.solution);
      expect(xLine, `${where} 중심각 줄이 없다`).not.toBeNull();
      expect(Number(xLine![1]), `${where} 중심각`).toBe(angle);

      const gLine = new RegExp(`\\$${angle}\\+${grow}=(\\d+)\\$`).exec(
        p.solution,
      );
      expect(gLine, `${where} 커진 중심각 줄이 없다`).not.toBeNull();
      expect(Number(gLine![1])).toBe(angle + grow);

      const aLine = new RegExp(
        `\\$${radius}\\^\\{2\\}\\\\times${angle + grow}\\\\div360=(\\d+)\\$`,
      ).exec(p.solution);
      expect(aLine, `${where} 넓이 줄이 없다`).not.toBeNull();
      expect(Number(aLine![1])).toBe(answerNumber(p.answer));
    }
  });

  it("`83X` — 기울기·변화량·해 줄이 모두 참이고 $b$ 를 안 구한다 (660판)", () => {
    for (const [seed, v] of WIDE) {
      const p = build(K83, seed, v);
      const { p: pp, m, q, n } = read83(p.content);
      const where = `${seed}/${v}`;
      const root = rootFromPage(pp, m, q, n);
      const a = (n - m) / (q - pp);

      const aLine =
        /\$a\$의 값은 \$(\(-?\d+\)|-?\d+)\\div(-?\d+)=(-?\d+)\$이다/.exec(
          p.solution,
        );
      expect(aLine, `${where} 기울기 줄이 없다`).not.toBeNull();
      expect(Number(aLine![1]!.replace(/[()]/g, "")), `${where} 분자`).toBe(
        n - m,
      );
      expect(Number(aLine![2]), `${where} 분모`).toBe(q - pp);
      expect(Number(aLine![3]), `${where} 기울기`).toBe(a);

      const dLine =
        /\$x\$의 값은 \$(\(-?\d+\)|-?\d+)\\div(-?\d+)=(-?\d+)\$만큼 변해야 한다/.exec(
          p.solution,
        );
      expect(dLine, `${where} 변화량 줄이 없다`).not.toBeNull();
      expect(Number(dLine![3]), `${where} 변화량`).toBe(root - pp);

      const rootLine = new RegExp(
        `구하는 \\$x\\$의 값은 \\$${pp}[+-]\\d+=(-?\\d+)\\$이고, 이 방정식의 해는 \\$x=(-?\\d+)\\$이다`,
      ).exec(p.solution);
      expect(rootLine, `${where} 해 줄이 없다`).not.toBeNull();
      expect(Number(rootLine![1]), `${where} 해`).toBe(root);
      expect(Number(rootLine![2]), `${where} 답`).toBe(answerNumber(p.answer));

      // 🔴 굳힘의 핵심 — 상수 $b$ 의 값을 지면에서 **끝까지 안 구한다.**
      expect(p.solution, `${where} b 를 구했다`).not.toMatch(/\$b=/);
    }
  });

  it("`84X` — 구간마다 «왜 살고 죽는지»가 그래프와 맞는다 (660판)", () => {
    const ORD = ["첫째", "둘째", "셋째", "넷째"];
    for (const [seed, v] of WIDE) {
      const p = build(K84, seed, v);
      const graph = read84(p.content);
      const times = crossingTimesFromPage(graph);
      const where = `${seed}/${v}`;
      for (let i = 0; i < 4; i += 1) {
        const [x0, y0] = graph.points[i]!;
        const [x1, y1] = graph.points[i + 1]!;
        const lo = Math.min(y0, y1);
        const hi = Math.max(y0, y1);
        const crosses = graph.d > lo && graph.d < hi;
        const line = p.solution
          .split("\n")
          .find((l) => l.startsWith(`${ORD[i]} 선분에서는`));
        expect(line, `${where} ${ORD[i]} 줄이 없다`).toBeDefined();
        // 구간의 길이·두 끝 높이가 지면과 맞는가.
        const head = new RegExp(
          `^${ORD[i]} 선분에서는 \\$${x1 - x0}\\$분 동안 높이가 \\$${y0}\\\\,\\\\mathrm\\{m\\}\\$에서 \\$${y1}\\\\,\\\\mathrm\\{m\\}\\$까지 (늘어난다|줄어든다)\\.`,
        ).exec(line!);
        expect(head, `${where} ${ORD[i]} 머리`).not.toBeNull();
        expect(head![1], `${where} ${ORD[i]} 방향`).toBe(
          y1 > y0 ? "늘어난다" : "줄어든다",
        );
        if (!crosses) {
          expect(line, `${where} ${ORD[i]} 죽는 까닭`).toMatch(
            new RegExp(
              `\\$${graph.d}\\$[이가] \\$${graph.d < lo ? lo : hi}\\$보다 ${graph.d < lo ? "크지" : "작지"} 않으므로 이 선분에서는 높이가 \\$${graph.d}\\\\,\\\\mathrm\\{m\\}\\$가 되지 않는다`,
            ),
          );
          continue;
        }
        const t = times.find((tt) => tt > x0 && tt < x1);
        expect(t, `${where} ${ORD[i]} 시각`).toBeDefined();
        expect(line, `${where} ${ORD[i]} 사는 까닭`).toMatch(
          new RegExp(
            `\\$${graph.d}\\$[은는] \\$${lo}\\$보다 크고 \\$${hi}\\$보다 작으므로`,
          ),
        );
        expect(line, `${where} ${ORD[i]} 도착 시각`).toMatch(
          new RegExp(`출발한 지 \\$${t}\\$분 후이다`),
        );
      }
      const sumLine = new RegExp(
        `구하는 합은 \\$${times.join("\\+")}=(\\d+)\\$이다`,
      ).exec(p.solution);
      expect(sumLine, `${where} 합 줄이 없다`).not.toBeNull();
      expect(Number(sumLine![1])).toBe(answerNumber(p.answer));
      const cntLine = /후의 (\S+) 번이고/.exec(p.solution);
      expect(cntLine, `${where} 셈말 줄이 없다`).not.toBeNull();
      expect(cntLine![1], `${where} 셈말`).toBe(COUNT_WORD[times.length]);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나 (㉮)
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
  const COLUMN = JASEUP_MEASURED_PX.answerSolutionsFull;
  /** 브리프가 못 박은 상한 — 한 단(964.8px)보다 넉넉히 아래. */
  const CAP = 700;

  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const huge = Array.from(
      { length: 80 },
      (_, i) => `${i + 1}단계를 계산한다.`,
    ).join("\n");
    expect(estimateSolutionPx(huge)).toBeGreaterThan(COLUMN);
    expect(estimateSolutionPx("$x=1$이다.")).toBeLessThan(CAP);
  });

  it("🔴 네 유형 전부 660판에서 700px 미만이다", () => {
    let measured = 0;
    let worst = { key: "", px: 0 };
    const over: string[] = [];
    for (const e of M1_TOP_5E) {
      for (const [s, v] of WIDE) {
        const px = estimateSolutionPx(build(e.key, s, v).solution);
        measured += 1;
        if (px > worst.px) worst = { key: e.key, px };
        if (px >= CAP) over.push(`${e.key} ${s}/${v} ${Math.round(px)}px`);
      }
    }
    expect(measured).toBe(4 * WIDE.length);
    expect(measured).toBeGreaterThanOrEqual(2400);
    expect(
      over,
      `해설이 ${CAP}px 을 넘는 판 — 가장 큰 것 ${worst.key} ${Math.round(worst.px)}px`,
    ).toEqual([]);
  });

  it("🔴 `81X` 의 훑는 자리 상한이 산출물에 실제로 걸린다", () => {
    // 이 상한이 곧 해설의 나열 줄 길이다. 올리면 위 검사가 빨개진다.
    let maxDivs = 0;
    let maxAlive = 0;
    for (const [s, v] of WIDE) {
      const { c, r } = read81(build(K81, s, v).content);
      const n = 180 - c - r;
      let k = 0;
      for (let d = 1; d <= n; d += 1) if (n % d === 0) k += 1;
      maxDivs = Math.max(maxDivs, k);
      maxAlive = Math.max(maxAlive, aliveAnglesFromPage(c, r).length);
    }
    expect(maxDivs).toBeLessThanOrEqual(14);
    expect(maxAlive).toBeLessThanOrEqual(6);
  });
});

// ═══════════════════════════════════════════════════════════
// 답 쏠림과 지름길 (㉵)
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — 답 쏠림과 지름길", () => {
  for (const e of M1_TOP_5E) {
    it(`${e.rpmType} — 최빈 정답이 660판의 $12$% 미만이다`, () => {
      const tally = new Map<string, number>();
      for (const [s, v] of WIDE) {
        const a = build(e.key, s, v).answer;
        tally.set(a, (tally.get(a) ?? 0) + 1);
      }
      const top = Math.max(...tally.values());
      expect(
        top / WIDE.length,
        `${e.key} 최빈 정답 비중 ${((top / WIDE.length) * 100).toFixed(2)}%`,
      ).toBeLessThan(0.12);
      expect(tally.size, `${e.key} 서로 다른 정답`).toBeGreaterThan(20);
    });
  }

  it("🔴 지면 수 조합이 답과 부딪히지 않는다 — 그리고 **널 모형**과 견준다 (660판)", () => {
    for (const e of M1_TOP_5E) {
      const pages: number[][] = [];
      const answers: number[] = [];
      for (const [s, v] of WIDE) {
        const p = build(e.key, s, v);
        pages.push(
          [...p.content.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0])),
        );
        answers.push(answerNumber(p.answer));
      }
      // ⑴ 제 답은 한 판도 안 걸린다.
      let hit = 0;
      for (let i = 0; i < pages.length; i += 1) {
        if (pageShortcutValues(pages[i]!).has(answers[i]!)) hit += 1;
      }
      expect(hit, `${e.key} 제 답이 지면 수 조합에 걸린 판`).toBe(0);
      // ⑵ 널 모형 — 남의 답을 끼우면 **걸리는 판이 있어야** 한다. 없으면 이 자가
      //    이 유형에서 구조적으로 0 이라는 뜻이고, 그때 ⑴ 의 «0» 은 아무것도 안 증명한다.
      let nullHit = 0;
      for (let i = 0; i < pages.length; i += 1) {
        const other = answers[(i + 7) % answers.length]!;
        if (pageShortcutValues(pages[i]!).has(other)) nullHit += 1;
      }
      expect(
        nullHit,
        `${e.key} 널 모형이 $0$ 이라 이 자가 구조적으로 못 센다`,
      ).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차e 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5E) {
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

  it("🔴 5차e 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = M1_TOP_5E.map((e) => build(e.key, OVERLAP_SEED));
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

// ════════════════════════════════════════════════════════════════════════════
// ㉳ 해설의 «말»이 판정을 옳게 진술한다
//
// 4차 물결 검문에서 참인 문장을 거짓으로 뒤집는 변이 **13개 중 10개가 초록**이었다.
// 값 검산·KaTeX·해설 높이·조사 자는 이 부류를 **구조적으로** 못 본다 — 문장이
// 거짓이어도 값은 그대로이기 때문이다(2026-08-24 「값이 맞으면 시험이 다 초록이다」).
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」 — 값은 지면에서 다시 읽어 만든다. */
function requiredWords(key: string, content: string): string[] {
  if (key === K81) {
    const { c, r } = read81(content);
    const n = 180 - c - r;
    return [
      "평행하므로 엇각의 크기는 서로 같다",
      `$b+d$의 값은 $180-${c}=${180 - c}$이다`,
      "남은 각의 크기는 이어 붙인 각의 크기보다 작아야 하므로",
      `그러므로 $d$는 $${180 - c}-${r}=${n}$의 약수이다`,
      `$d$는 $${n}$ 자신이 될 수 없다`,
    ];
  }
  if (key === K82) {
    return [
      "반지름의 길이와 호의 길이의 곱의 절반과 같으므로",
      "중심각의 크기를 먼저 구하지 않아도 된다",
      "차지하는 비율을 곱한 것이므로",
    ];
  }
  if (key === K83) {
    return [
      "방정식의 해는 그 방정식을 참이 되게 하는 $x$의 값이므로",
      "좌변의 값은 언제나 $a$만큼 커진다",
      "상수 $b$의 값은 끝까지 구하지 않아도 된다",
    ];
  }
  if (key === K84) {
    const graph = read84(content);
    const out = ["각 선분에서 높이는 일정한 빠르기로 늘어나거나 줄어든다"];
    const ORD = ["첫째", "둘째", "셋째", "넷째"];
    for (let i = 0; i < 4; i += 1) {
      const [, y0] = graph.points[i]!;
      const [, y1] = graph.points[i + 1]!;
      const lo = Math.min(y0, y1);
      const hi = Math.max(y0, y1);
      const crosses = graph.d > lo && graph.d < hi;
      out.push(crosses ? `${ORD[i]} 선분에서는` : `${ORD[i]} 선분에서는`);
      out.push(
        crosses
          ? `이 선분에서 높이가 $${graph.d}\\,\\mathrm{m}$가 되고`
          : `이 선분에서는 높이가 $${graph.d}\\,\\mathrm{m}$가 되지 않는다`,
      );
    }
    return [...new Set(out)];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K81]: [
    ["엇각의 크기는 서로 같다", "동위각의 크기는 서로 다르다"],
    ["보다 작아야 하므로", "보다 커야 하므로"],
    ["의 약수이다", "의 배수이다"],
    ["자신이 될 수 없다", "자신이 될 수 있다"],
  ],
  [K82]: [
    ["곱의 절반과 같으므로", "곱의 두 배와 같으므로"],
    ["먼저 구하지 않아도 된다", "먼저 구해야만 한다"],
    ["차지하는 비율을 곱한 것이므로", "차지하는 비율을 나눈 것이므로"],
  ],
  [K83]: [
    ["참이 되게 하는", "거짓이 되게 하는"],
    ["언제나 $a$만큼 커진다", "언제나 $a$만큼 작아진다"],
    ["끝까지 구하지 않아도 된다", "끝까지 구해야만 한다"],
  ],
  [K84]: [
    [
      "일정한 빠르기로 늘어나거나 줄어든다",
      "점점 빨라지며 늘어나거나 줄어든다",
    ],
    ["가 되지 않는다", "가 된다"],
  ],
};

function missingWords(
  key: string,
  content: string,
  solution: string,
): string[] {
  return requiredWords(key, content).filter((w) => !solution.includes(w));
}

describe("[중1 5차e 물결] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
  it("네 유형 모두 — 660판 전량에 그 문장들이 있다", () => {
    for (const key of KEYS) {
      for (const [seed, variant] of WIDE) {
        const p = build(key, seed, variant);
        expect(
          missingWords(key, p.content, p.solution),
          `${key} s${seed}v${variant}`,
        ).toEqual([]);
      }
    }
  });

  it("눈금 — 낱말을 하나씩 뒤집으면 **전부** 빨개진다 (양성 12 · 음성 4)", () => {
    let positives = 0;
    for (const key of KEYS) {
      // 음성 — 손대지 않은 지면은 깨끗하다
      const seed = key === K84 ? 20260903 : SEEDS[0]!;
      const p = build(key, seed, 0);
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
    expect(positives).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════
// 판정기의 축 — 리드가 `probe-middle-top-m1.ts` 에 옮겨 적을 표
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 `AXES` 와 **같은 모양**이다. 그 파일은 이 갈래가 못 만지므로(5차 물결 규약),
 * 여기서 넷 다 재 두고 리드가 그대로 옮기게 한다. 옮기지 않으면 등록되는 날
 * 판정기가 「축(AXES)을 안 적었다」를 넷에 대해 찍는다 — **조용히 빠지지는 않는다.**
 */
const LOCAL_AXES: Record<
  string,
  {
    withoutBinding: (f: Record<string, number>) => number | null;
    perturbed: (f: Record<string, number>) => number;
    candidateCount: (f: Record<string, number>) => number | null;
  }
> = {
  [K81]: {
    // 굳힘(평행선으로 두 밑각의 합이 $180-c$)을 안 읽으면 $N$ 을 못 만든다.
    withoutBinding: (f) =>
      splitAngleDivisors(180 - f.r!, f.r!).reduce((a, b) => a + b, 0),
    perturbed: (f) =>
      splitAngleDivisors(f.n! - 1, f.r!).reduce((a, b) => a + b, 0),
    candidateCount: (f) => f.cnt!,
  },
  [K82]: {
    withoutBinding: () => null, // 후보 목록이 없다 — 값이 하나로 굳는다
    perturbed: (f) => {
      const radius = sectorFromAreaAndArc(f.area! + f.arc!, f.arc!);
      const angle = sectorCentralAngle(radius, f.arc!);
      return (radius * radius * (angle + f.grow!)) / 360;
    },
    candidateCount: () => null,
  },
  [K83]: {
    withoutBinding: () => null,
    // 두 대입값을 함께 $a$ 만큼 내리면 기울기는 그대로고 해만 $1$ 커진다.
    // (⚠️ $n$ 만 흔들면 해가 정수가 아니게 되어 판정에 닿는 판이 220 → 36 이 된다.)
    perturbed: (f) => solveFromTwoValues(f.p!, f.m! - f.a!, f.q!, f.n! - f.a!),
    candidateCount: () => null,
  },
  [K84]: {
    // 굳힘(구간마다 두 끝 사이인지 보기)을 안 읽고 첫 구간만 보면 이 값이 나온다.
    withoutBinding: (f) => (f.d! * f.t1!) / f.peak!,
    // 그래프를 통째로 $1$분 늦게 띄우면 살아남는 구간은 그대로고 시각만 다 $1$ 늦는다.
    // 되그린 뒤 **실제로 세어** 낸다 — 「$x+cnt$」를 적어 넣지 않는다.
    perturbed: (f) => {
      const shifted: Segment[] = [
        {
          from: 1,
          to: f.t1! + 1,
          low: 0,
          high: f.peak!,
          rate: f.peak! / f.t1!,
          rising: true,
        },
        {
          from: f.t1! + 1,
          to: f.t2! + 1,
          low: f.peak!,
          high: f.dip!,
          rate: (f.peak! - f.dip!) / (f.t2! - f.t1!),
          rising: false,
        },
        {
          from: f.t2! + 1,
          to: f.t3! + 1,
          low: f.dip!,
          high: f.top!,
          rate: (f.top! - f.dip!) / (f.t3! - f.t2!),
          rising: true,
        },
        {
          from: f.t3! + 1,
          to: f.t4! + 1,
          low: f.top!,
          high: 0,
          rate: f.top! / (f.t4! - f.t3!),
          rising: false,
        },
      ];
      return heightCrossings(shifted, f.d!).reduce((s, h) => s + h.at, 0);
    },
    candidateCount: () => 4,
  },
};

describe("중1 5차e 확대 갈래 — 판정기의 축을 미리 댄다", () => {
  it("🔴 넷 다 축이 적혀 있다 (리드가 `AXES` 로 옮길 표)", () => {
    for (const key of KEYS) expect(LOCAL_AXES[key]).toBeDefined();
  });

  for (const key of KEYS) {
    it(`${key.split("|")[2]} — 굳힘을 지운 답 $0$% · 흔들면 늘 달라진다 (220판)`, () => {
      const axis = LOCAL_AXES[key]!;
      let noBind = 0;
      let same = 0;
      let counted = 0;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const want = answerNumber(p.answer);
        const wb = axis.withoutBinding(p.facts);
        if (wb !== null && wb === want) noBind += 1;
        let got: number;
        try {
          got = axis.perturbed(p.facts);
        } catch {
          continue;
        }
        counted += 1;
        expect(Number.isFinite(got), `${key} 흔든 답이 수가 아니다`).toBe(true);
        if (got === want) same += 1;
      }
      expect(noBind).toBe(0);
      expect(same).toBe(0);
      expect(counted).toBeGreaterThan(100);
    });
  }
});
