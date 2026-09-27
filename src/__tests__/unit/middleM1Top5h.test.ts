/**
 * 중1 **5차 확대 갈래 `h`**(`m1Top5h.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `93X` | 훑을 $m$ 의 범위를 부등호로 조여 놓고 $n=\dfrac{360m}{dm-360}$ 을 **나눠** 본다 | 나눗셈을 **한 번도 안 한다** — $(m,n)$ 쌍을 $3\le m<n\le1500$ 에서 **둘 다 훑어** 정의식 $360n\pm360m=d\,mn$ 을 **곱셈으로만** 맞춘다(범위를 유도하지 않는다) |
 * | `94X` | 세 길이를 **정렬해** 「가장 긴 변 $<$ 나머지 둘의 합」 하나로 판정한다 | 정렬하지 않는다 — 세 부등식 $x+y>z$, $y+z>x$, $z+x>y$ 를 **모두** 대 본다 |
 * | `95X` | $\lfloor p/q\rfloor$ 로 아래끝을 **계산**해 구간을 한 번에 낸다 | 바닥·천장 함수를 안 쓴다 — $n$ 을 $1$ 부터 올려 가며 정수 $x$ 를 하나씩 훑어 $qx>-p$ 와 $rx<n$ 을 **정수 비교로만** 세어 개수가 $k$ 인 $n$ 을 모은다 |
 * | `96X` | 「$c-b$ 가 $a$ 의 **배수**인가」로 나누어떨어짐을 본다 | 나머지를 안 쓴다 — $b$ 마다 $x=1,2,\dots$ 를 **넣어 보고** $ax+b=c$ 가 성립하는 $x$ 가 있는지 찾는다 |
 *
 * ## 🔴 앞 물결들이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을
 *    재어 **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어 기약인지
 *    보고 분모가 $1$ 이 아닌지도 본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로
 *    0 이므로 **유형마다 찾은 자리 수를 못 박는다**(수 분수가 없는 셋은 `0` 으로 못 박는다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다.** → 공용 `declaredUpperBound` 가
 *    660판 전량에서 `null` 임을 잰다(그 자가 살아 있는지도 같이 본다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「배수↔약수」·「크↔작」·「가장 작은↔가장 큰」
 *    ·「자연수↔유리수」·「$0$ 이 아니다」를 **낱말과 수를 함께** 판정하고, 낱말을 뒤집으면
 *    빨개지는 눈금을 **양성·음성 둘 다** 둔다. `toContain` 만으로 끝내지 않는다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 어겼다.** → `93X` 가 「$m$ 은 $L$ 이상 $H$
 *    이하이다」라고 적은 뒤 **실제로 훑은 $m$ 의 집합**이 그 범위와 글자 그대로 같은지 잰다.
 * ㉵ **답 쏠림과 지름길** → 씨앗 220×변형 3 에서 서로 다른 발문·정답과 **최빈 정답 비율**을
 *    재고, 지름길은 **널 모형(답을 판끼리 돌려 끼운 우연 수준)**과 견준다.
 * ㉶ **D-20 손실 원장이 재현 불가였다.** → 모듈 머리말이 적어 둔 손실 수치를 **창 전수로
 *    다시 세어** 글자 그대로 대조한다. 어림한 자리가 하나라도 있으면 빨개진다.
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
 * 으로 갈아탄다(`m1Top2`~`m1Top5f` 시험이 선 자리와 같다).
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
  equalityConstants,
  integerWindowValues,
  M1_TOP_5H,
  pageShortcutValues,
  polygonPairs,
  POLYGON_WINDOW,
  scaledValues,
  triangleTriples,
} from "@/lib/middle/m1Top5h";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
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
  numAnswerJaccard,
  obviousCandidates,
  pageNumbers,
} from "../../../scripts/qa/probe-middle-top-m1";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, numVowelFinal, pageSmells } from "../helpers/midPage";

const K93 = "1-2|다각형|93X";
const K94 = "1-2|작도와 합동|94X";
const K95 = "1-1|정수와 유리수|95X";
const K96 = "1-1|일차방정식의 풀이|96X";
const KEYS = [K93, K94, K95, K96] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K93]: "심화상",
  [K94]: "심화상",
  [K95]: "심화중",
  [K96]: "심화중",
};

/** 리드가 등록 전량으로 실측해 준 소단원별 변형 폭 바닥. */
const VARIANT_FLOOR: Record<string, number> = {
  [K93]: 6,
  [K94]: 10,
  [K95]: 12,
  [K96]: 12,
};

/**
 * 🔴 **씨앗 다섯은 실측으로 골랐다.**
 *
 * 「같은 씨앗에서 변형 $0..floor-1$ 이 서로 다르다」는 무작위 씨앗에서 늘 참이 아니다 —
 * 무작위 400씨앗 실측 통과율은 `93X` **82.8%** · `94X` 98.0% · `95X` 98.5% ·
 * `96X` 99.5% 다(`93X` 는 발문 조합이 **112가지**뿐이라 여섯 번 뽑으면 겹칠 수 있다).
 * 그래서 이 다섯은 「후보 씨앗 중 넷이 모두 통과하는 것」으로 고른 값이고, 아래 시험은
 * **그 사실을 잠그는 자물쇠**이지 「어느 씨앗에서나 참」이라는 주장이 아니다.
 */
const SEEDS = [20260903, 3, 7, 19, 505];
/** 판정기(`probe-middle-top-m1.ts`)가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
const OVERLAP_SEED = 20260827;

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판**. */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < 4; v += 1) out.push([1000003 + s * 7919, v]);
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
const ENTRY = new Map(M1_TOP_5H.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차h ${key}`);
  assertChoiceCount(content, `중1 5차h ${key}`);
  assertChoiceMarks(content, `중1 5차h ${key}`);
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
 */
function subjectJosaFor(n: number): "이" | "가" {
  return numVowelFinal(n) ? "가" : "이";
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 *
 * 값 검산도 냄새 자도 이 축을 못 본다: 없는 명령이나 날 LaTeX 는 **값이 맞고
 * 냄새 목록에도 없다.**
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
 * 다루는 것: 정수 · 소수 · `+` · `-` · `\times` · `\div` · `\dfrac{}{}` · `()` · `^{k}`.
 * 그 밖의 글자가 있으면 **던진다** — 조용히 넘기면 못 센 자리가 「깨끗」으로 읽힌다.
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
 * 도 단위 `^{\circ}` 는 **연산이 아니라 단위**다. 먼저 지우지 않으면
 * `$360-284=76$` 옆의 `$76^{\circ}$` 같은 도막이 통째로 「못 읽음」이 되어 검사 밖으로
 * 나간다(2026-09-03 `m1Top5f` 가 같은 자리에서 배운 것).
 */
function stripDegree(body: string): string {
  return body.replace(/\^\{\\circ\}/g, "").replace(/\^\\circ/g, "");
}

/**
 * 「글자가 하나도 없는 순수 산술」인가 — 아니면 이 자가 판정하지 않는다.
 *
 * ⚠️ 명령 이름을 지운 **뒤에** 글자가 남으면 문자식이다(`$b=15$`·`$n=(360\times m)…$`).
 *    그것까지 계산하려 들면 거짓 빨강이 난다.
 */
function isPureArithmetic(body: string): boolean {
  const stripped = stripDegree(body).replace(
    /\\(dfrac|frac|times|div|left|right)/g,
    "",
  );
  return !/[A-Za-z\\]/.test(stripped);
}

/** 해설에서 **좌우가 안 맞는 산술 등식**을 모은다. 없으면 빈 배열. */
export function arithmeticEquationFailures(text: string): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const body = m[1]!;
    if (!body.includes("=")) continue;
    if (!isPureArithmetic(body)) continue;
    const parts = stripDegree(body).split("=");
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

/** 판정한 산술 등식의 개수 — 「0건」이 «깨끗»인지 «못 셈»인지 가른다. */
function arithmeticEquationCount(text: string): number {
  let n = 0;
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    if (m[1]!.includes("=") && isPureArithmetic(m[1]!)) n += 1;
  }
  return n;
}

/**
 * 해설에 찍힌 모든 수 (음수 포함).
 *
 * 🔴 앞의 글자가 **숫자면 빼기 기호**다 — `360-54\times m` 의 `-54` 를 음수로 읽으면
 * 「설명되지 않는 수」가 판마다 쏟아진다(실측: `93X` 는 그것 하나로 220판 전부 빨강).
 * 반대로 `$-3$`·`=-4`·`(-8)` 의 앞은 숫자가 아니므로 부호가 살아 있어야 한다.
 */
function solutionNumbers(text: string): number[] {
  return [...text.matchAll(/(?<![\d.])-?\d+/g)].map((m) => Number(m[0]));
}

/** 지면의 `\dfrac{정수}{정수}` 를 모두 — 기약 검사용. */
function numericFractions(text: string): [number, number][] {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

// ── 지면 읽기 ────────────────────────────────────────────────

const RE93 =
  /^변의 개수가 서로 다른 두 정다각형의 한 (내각|외각)의 크기의 (합이|차가) \$(\d+)\^\{\\circ\}\$이다\. 조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, 그 정다각형들의 (변|꼭짓점)의 개수를 모두 더한 값을 구하시오\.$/;

const RE94 =
  /^길이가 각각 (.+?)인 막대 다섯 개가 있다\. 이 막대 중 어느 세 개를 세 변으로 하여 삼각형을 만들 때, 삼각형이 되는 모든 경우에 대하여 둘레의 길이를 모두 더한 값을 구하시오\.$/;

const RE95 =
  /^\$-\\dfrac\{(\d+)\}\{(\d+)\}\$보다 크고 \$\\dfrac\{n\}\{(\d+)\}\$보다 작은 정수가 모두 \$(\d+)\$개가 되도록 하는 자연수 \$n\$의 값을 모두 구하여 그 합을 구하시오\.$/;

const RE96 =
  /^\$x\$에 대한 등식 \$(\d+)x\+b=(\d+)\$에서 \$b\$는 \$(-?\d+)\$ 이상 \$(-?\d+)\$ 이하의 정수이다\. 등식의 성질을 이용하여 구한 \$x\$의 값이 자연수가 되도록 하는 모든 \$b\$의 값의 합을 구하시오\.$/;

type Read93 = {
  angle: "내각" | "외각";
  kind: "합" | "차";
  shown: number;
  /** 발문이 무엇으로 묻든 정다각형에서 변과 꼭짓점의 개수는 같다. */
  ask: "변" | "꼭짓점";
  /** 지면 값에서 되살린 **한 외각**의 합·차. */
  outer: number;
};

function read93(content: string): Read93 {
  const [angle, rel, deg, ask] = grab(RE93, content, "93X");
  const kind = rel === "합이" ? "합" : "차";
  const shown = num(deg!);
  // 한 내각 $=180^\circ-$ 한 외각이므로 합은 $360$ 에서 빼고 차는 그대로다.
  const outer = angle === "외각" ? shown : kind === "합" ? 360 - shown : shown;
  return {
    angle: angle as "내각" | "외각",
    kind,
    shown,
    ask: ask as "변" | "꼭짓점",
    outer,
  };
}

function read94(content: string): number[] {
  const [listText] = grab(RE94, content, "94X");
  const lens = [...listText!.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) =>
    Number(m[1]),
  );
  if (lens.length !== 5)
    throw new Error(`94X: 막대가 다섯이 아니다 — ${listText}`);
  return lens;
}

function read95(content: string): {
  p: number;
  q: number;
  r: number;
  k: number;
} {
  const [p, q, r, k] = grab(RE95, content, "95X");
  return { p: num(p!), q: num(q!), r: num(r!), k: num(k!) };
}

function read96(content: string): {
  a: number;
  c: number;
  b1: number;
  b2: number;
} {
  const [a, c, b1, b2] = grab(RE96, content, "96X");
  return { a: num(a!), c: num(c!), b1: num(b1!), b2: num(b2!) };
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

/**
 * 🔴 $(m,n)$ 을 **둘 다 훑어** 정의식을 곱셈으로만 맞춘다.
 * 나눗셈도, 「$d\times m$ 이 $720$ 보다 작다」 같은 유도된 범위도 쓰지 않는다.
 */
function brutePolygonPairs(kind: "합" | "차", d: number): [number, number][] {
  const out: [number, number][] = [];
  for (let m = 3; m <= 300; m += 1) {
    for (let n = m + 1; n <= 1500; n += 1) {
      // 합: 360/m + 360/n = d  ⟺  360n + 360m = d·m·n
      // 차: 360/m - 360/n = d  ⟺  360n - 360m = d·m·n
      const v =
        kind === "합"
          ? d * m * n - 360 * n - 360 * m
          : d * m * n + 360 * m - 360 * n;
      if (v === 0) out.push([m, n]);
      if (kind === "합" && v > 0) break;
      if (kind === "차" && v < 0) break;
    }
  }
  return out;
}

/** 🔴 세 부등식을 **모두** 대 본다 — 정렬하지 않는다. */
function bruteTriangles(lens: readonly number[]): {
  triple: [number, number, number];
  peri: number;
}[] {
  const out: { triple: [number, number, number]; peri: number }[] = [];
  for (let i = 0; i < lens.length; i += 1) {
    for (let j = i + 1; j < lens.length; j += 1) {
      for (let k = j + 1; k < lens.length; k += 1) {
        const x = lens[i]!;
        const y = lens[j]!;
        const z = lens[k]!;
        if (x + y > z && y + z > x && z + x > y) {
          out.push({ triple: [x, y, z], peri: x + y + z });
        }
      }
    }
  }
  return out;
}

/** 🔴 바닥·천장 함수를 안 쓴다 — 정수를 하나씩 훑어 **정수 비교로만** 센다. */
function bruteWindowN(p: number, q: number, r: number, k: number): number[] {
  const xs: number[] = [];
  for (let x = -40; x <= 400; x += 1) if (q * x > -p) xs.push(x);
  const out: number[] = [];
  for (let n = 1; n <= 500; n += 1) {
    let cnt = 0;
    for (const x of xs) {
      if (r * x < n) cnt += 1;
      else break;
    }
    if (cnt === k) out.push(n);
  }
  return out;
}

/** 🔴 나머지를 안 쓴다 — $x$ 를 **넣어 보고** 등식이 성립하는지 본다. */
function bruteEqualityB(
  a: number,
  c: number,
  b1: number,
  b2: number,
): number[] {
  const out: number[] = [];
  for (let b = b1; b <= b2; b += 1) {
    for (let x = 1; x <= 400; x += 1) {
      if (a * x + b === c) {
        out.push(b);
        break;
      }
    }
  }
  return out;
}

const VERIFY: Record<string, (content: string) => number> = {
  [K93]: (content) => {
    const { kind, shown, outer } = read93(content);
    const pairs = brutePolygonPairs(kind, outer);
    if (pairs.length < 2 || pairs.length > 4) {
      throw new Error(
        `93X: 조건에 맞는 쌍이 ${pairs.length} 개다 (둘~넷이어야 한다)`,
      );
    }
    if (pairs.some(([, n]) => n > 120)) {
      throw new Error("93X: 변의 개수가 $120$ 을 넘는 정다각형이 나온다");
    }
    if (pairs.some(([m, n]) => m === n)) {
      throw new Error("93X: 변의 개수가 같은 짝이 있어 발문 조건과 부딪힌다");
    }
    const x = pairs.reduce((a, [m, n]) => a + m + n, 0);
    if (scaledValues(shown).has(x)) {
      throw new Error("93X: 답이 각의 크기를 몇 번 곱하거나 나눈 값과 같다");
    }
    if (pageShortcutValues([shown]).has(x)) {
      throw new Error("93X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K94]: (content) => {
    const lens = read94(content);
    if (new Set(lens).size !== 5)
      throw new Error("94X: 다섯 길이가 서로 다르지 않다");
    if (lens.some((v) => v < 2 || v > 20)) {
      throw new Error("94X: 막대 길이가 창 밖이다");
    }
    // 퇴화(합이 세 번째와 **같은**) 경우가 있으면 지면 문구가 셋이 되어야 한다.
    for (let i = 0; i < 5; i += 1) {
      for (let j = i + 1; j < 5; j += 1) {
        for (let k = j + 1; k < 5; k += 1) {
          const t = [lens[i]!, lens[j]!, lens[k]!].sort((a, b) => a - b);
          if (t[0]! + t[1]! === t[2]!)
            throw new Error("94X: 퇴화 삼각형이 있다");
        }
      }
    }
    const alive = bruteTriangles(lens);
    if (alive.length < 3 || alive.length > 6) {
      throw new Error(
        `94X: 삼각형이 되는 것이 ${alive.length} 가지다 (셋~여섯이어야 한다)`,
      );
    }
    if (10 - alive.length < 2)
      throw new Error("94X: 되지 않는 경우가 둘보다 적다");
    const x = alive.reduce((a, t) => a + t.peri, 0);
    if (alive.some((t) => t.peri === x))
      throw new Error("94X: 답이 후보 목록 안에 있다");
    if (pageShortcutValues(lens).has(x)) {
      throw new Error("94X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K95]: (content) => {
    const { p, q, r, k } = read95(content);
    if (q < 2 || r < 2) throw new Error("95X: 분모가 $2$ 보다 작다");
    if (gcd2(p, q) !== 1) throw new Error("95X: 발문의 분수가 기약이 아니다");
    if (p % q === 0)
      throw new Error("95X: 아래끝이 정수라 「보다 크고」가 애매하다");
    if (p <= q)
      throw new Error("95X: 아래끝이 $-1$ 보다 커서 음의 정수가 안 나온다");
    const ns = bruteWindowN(p, q, r, k);
    if (ns.length !== r) {
      throw new Error(
        `95X: 조건에 맞는 $n$ 이 ${ns.length} 개다 (분모 ${r} 개여야 한다)`,
      );
    }
    if (ns[ns.length - 1] === 500)
      throw new Error("95X: 훑은 범위 끝에 해가 걸렸다");
    const x = ns.reduce((a, b) => a + b, 0);
    if (pageShortcutValues([p, q, k, r]).has(x)) {
      throw new Error("95X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K96]: (content) => {
    const { a, c, b1, b2 } = read96(content);
    if (a < 2) throw new Error("96X: $x$ 의 계수가 $2$ 보다 작다");
    if (b1 === 0)
      throw new Error("96X: 아래끝이 $0$ 이라 지면에 `-0` 이 나간다");
    if (b1 >= b2) throw new Error("96X: $b$ 의 범위가 뒤집혔다");
    const alive = bruteEqualityB(a, c, b1, b2);
    if (alive.length < 3 || alive.length > 5) {
      throw new Error(
        `96X: 살아남는 $b$ 가 ${alive.length} 개다 (셋~다섯이어야 한다)`,
      );
    }
    if (alive.includes(0)) throw new Error("96X: 살아남는 $b$ 에 $0$ 이 있다");
    // 「$0$ 보다 커야 한다」가 실제로 무는가 — 배수인데 $x$ 가 자연수가 아닌 $b$ 가 있나.
    let bitten = 0;
    for (let b = b1; b <= b2; b += 1) {
      if ((c - b) % a === 0 && c - b <= 0) bitten += 1;
    }
    if (bitten === 0)
      throw new Error("96X: 「$0$ 보다 크다」가 아무것도 안 거른다");
    const x = alive.reduce((s, v) => s + v, 0);
    if (pageShortcutValues([a, c, b1, b2]).has(x)) {
      throw new Error("96X: 답이 지면 수 조합으로 나온다");
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
  [K93]: (content) => {
    const { kind, shown, outer } = read93(content);
    // ⚠️ `-360` 은 「$n=(360\times m)\div(84\times m-360)$」 의 문자식 안에 있다 —
    //    앞 글자가 숫자가 아니라 `m` 이라 부호가 살아 있는 것이 옳다.
    const out = new Set<number>([0, 180, 360, 720, 3, shown, outer, -360]);
    const pairs = brutePolygonPairs(kind, outer);
    for (const [m, n] of pairs) {
      out.add(m);
      out.add(n);
    }
    out.add(pairs.reduce((a, [m, n]) => a + m + n, 0));
    for (let m = 3; m <= 40; m += 1) {
      out.add(m);
      out.add(outer * m);
      out.add(360 * m);
      out.add(kind === "합" ? outer * m - 360 : 360 - outer * m);
      const den = kind === "합" ? outer * m - 360 : 360 - outer * m;
      if (den > 0 && (360 * m) % den === 0) out.add((360 * m) / den);
    }
    return out;
  },
  [K94]: (content) => {
    const lens = read94(content);
    const out = new Set<number>(lens);
    for (let i = 0; i < 5; i += 1) {
      for (let j = i + 1; j < 5; j += 1) {
        out.add(lens[i]! + lens[j]!);
        for (let k = j + 1; k < 5; k += 1) {
          out.add(lens[i]! + lens[j]! + lens[k]!);
        }
      }
    }
    out.add(bruteTriangles(lens).reduce((a, t) => a + t.peri, 0));
    return out;
  },
  [K95]: (content) => {
    const { p, q, r, k } = read95(content);
    const out = new Set<number>([p, q, r, k, 1]);
    for (let f = 0; f <= 20; f += 1) {
      out.add(q * f);
      out.add(f);
      out.add(-f);
    }
    const ns = bruteWindowN(p, q, r, k);
    for (const n of ns) out.add(n);
    out.add(ns.reduce((a, b) => a + b, 0));
    for (let u = -20; u <= 40; u += 1) {
      out.add(u);
      out.add(r * u);
    }
    return out;
  },
  [K96]: (content) => {
    const { a, c, b1, b2 } = read96(content);
    const out = new Set<number>([a, c, b1, b2, 0, c - b1, c - b2]);
    for (let m = c - b2; m <= c - b1; m += 1) {
      if (m % a !== 0) continue;
      out.add(m);
      out.add(c - m);
      out.add(m / a);
    }
    out.add(bruteEqualityB(a, c, b1, b2).reduce((s, v) => s + v, 0));
    return out;
  },
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 손으로 쓴 지면(엔진 밖) — 답을 사람이 계산해 두었다. */
const GOOD_PAGES: readonly { key: string; page: string; want: number }[] = [
  {
    key: K93,
    // 한 외각의 합 $78^\circ$ → $(5,60)$ 과 $(6,20)$ → $5+60+6+20=91$
    page:
      "변의 개수가 서로 다른 두 정다각형의 한 외각의 크기의 합이 $78^{\\circ}$이다. " +
      "조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, 그 정다각형들의 변의 개수를 " +
      "모두 더한 값을 구하시오.",
    want: 91,
  },
  {
    key: K93,
    // 같은 판을 **내각**으로 물었다 — $360-78=282$. 답은 그대로 $91$ 이어야 한다.
    // (내각↔외각 변환을 검산기가 실제로 하는지 여기서 갈린다.)
    page:
      "변의 개수가 서로 다른 두 정다각형의 한 내각의 크기의 합이 $282^{\\circ}$이다. " +
      "조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, 그 정다각형들의 꼭짓점의 개수를 " +
      "모두 더한 값을 구하시오.",
    want: 91,
  },
  {
    key: K94,
    // $3,4,8,18,19$ → $(3,18,19)=40$, $(4,18,19)=41$, $(8,18,19)=45$ → $126$
    page:
      "길이가 각각 $3\\,\\mathrm{cm}$, $4\\,\\mathrm{cm}$, $8\\,\\mathrm{cm}$, " +
      "$18\\,\\mathrm{cm}$, $19\\,\\mathrm{cm}$인 막대 다섯 개가 있다. 이 막대 중 " +
      "어느 세 개를 세 변으로 하여 삼각형을 만들 때, 삼각형이 되는 모든 경우에 대하여 " +
      "둘레의 길이를 모두 더한 값을 구하시오.",
    want: 126,
  },
  {
    key: K95,
    // $-\frac72=-3.5$ → 가장 작은 정수 $-3$, $9$번째는 $5$ → $\frac n7\in(5,6]$
    // → $n=36..42$ → 합 $273$
    page:
      "$-\\dfrac{7}{2}$보다 크고 $\\dfrac{n}{7}$보다 작은 정수가 모두 $9$개가 되도록 하는 " +
      "자연수 $n$의 값을 모두 구하여 그 합을 구하시오.",
    want: 273,
  },
  {
    key: K96,
    // $4x+b=28$, $b\in[5,32]$ → $28-b\in[-4,23]$ 의 $4$ 의 배수 중 양수 $4,8,12,16,20$
    // → $b=24,20,16,12,8$ → 합 $80$
    page:
      "$x$에 대한 등식 $4x+b=28$에서 $b$는 $5$ 이상 $32$ 이하의 정수이다. " +
      "등식의 성질을 이용하여 구한 $x$의 값이 자연수가 되도록 하는 모든 $b$의 값의 합을 " +
      "구하시오.",
    want: 80,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K93,
    page:
      "변의 개수가 서로 다른 두 정다각형의 한 외각의 크기의 합이 $59^{\\circ}$이다. " +
      "조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, 그 정다각형들의 변의 개수를 " +
      "모두 더한 값을 구하시오.",
    why: "$59^{\\circ}$ 에는 조건에 맞는 짝이 하나도 없다 (빈 집합)",
  },
  {
    key: K93,
    page:
      "변의 개수가 서로 다른 두 정다각형의 한 외각의 크기의 합이 $84^{\\circ}$이다. " +
      "조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, 그 정다각형들의 변의 개수를 " +
      "모두 더한 값을 구하시오.",
    why: "답 $56$ 이 $84\\div3\\times2$ 다 — 각의 크기를 두 번 셈해서 나온다",
  },
  {
    key: K93,
    page:
      "변의 개수가 서로 다른 두 정다각형의 한 외각의 크기의 합이 $52^{\\circ}$이다. " +
      "조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, 그 정다각형들의 변의 개수를 " +
      "모두 더한 값을 구하시오.",
    why: "정$630$각형이 나온다 — 지면에서 우습다",
  },
  {
    key: K94,
    page:
      "길이가 각각 $3\\,\\mathrm{cm}$, $4\\,\\mathrm{cm}$, $5\\,\\mathrm{cm}$, " +
      "$6\\,\\mathrm{cm}$, $7\\,\\mathrm{cm}$인 막대 다섯 개가 있다. 이 막대 중 " +
      "어느 세 개를 세 변으로 하여 삼각형을 만들 때, 삼각형이 되는 모든 경우에 대하여 " +
      "둘레의 길이를 모두 더한 값을 구하시오.",
    why: "$3+4=7$ 인 퇴화 삼각형이 있다",
  },
  {
    key: K94,
    page:
      "길이가 각각 $6\\,\\mathrm{cm}$, $7\\,\\mathrm{cm}$, $8\\,\\mathrm{cm}$, " +
      "$9\\,\\mathrm{cm}$, $11\\,\\mathrm{cm}$인 막대 다섯 개가 있다. 이 막대 중 " +
      "어느 세 개를 세 변으로 하여 삼각형을 만들 때, 삼각형이 되는 모든 경우에 대하여 " +
      "둘레의 길이를 모두 더한 값을 구하시오.",
    why: "열 가지가 **전부** 삼각형이 된다 — 견줌이 장식이 된다",
  },
  {
    key: K95,
    page:
      "$-\\dfrac{6}{4}$보다 크고 $\\dfrac{n}{7}$보다 작은 정수가 모두 $9$개가 되도록 하는 " +
      "자연수 $n$의 값을 모두 구하여 그 합을 구하시오.",
    why: "$\\dfrac{6}{4}$ 가 기약이 아니다",
  },
  {
    key: K95,
    page:
      "$-\\dfrac{8}{2}$보다 크고 $\\dfrac{n}{7}$보다 작은 정수가 모두 $9$개가 되도록 하는 " +
      "자연수 $n$의 값을 모두 구하여 그 합을 구하시오.",
    why: "$-\\dfrac{8}{2}=-4$ 는 정수라 「보다 크고」의 아래끝이 애매하다",
  },
  {
    key: K96,
    page:
      "$x$에 대한 등식 $4x+b=28$에서 $b$는 $5$ 이상 $27$ 이하의 정수이다. " +
      "등식의 성질을 이용하여 구한 $x$의 값이 자연수가 되도록 하는 모든 $b$의 값의 합을 " +
      "구하시오.",
    why: "위끝이 $c$ 보다 작아 「$0$ 보다 커야 한다」가 아무것도 안 거른다",
  },
  {
    key: K96,
    page:
      "$x$에 대한 등식 $4x+b=28$에서 $b$는 $-40$ 이상 $32$ 이하의 정수이다. " +
      "등식의 성질을 이용하여 구한 $x$의 값이 자연수가 되도록 하는 모든 $b$의 값의 합을 " +
      "구하시오.",
    why: "살아남는 $b$ 가 다섯을 넘어 해설이 길어진다",
  },
];

describe("중1 5차 h — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 검산기가 `facts.x` 를 되읽는 판이었다면 여기서 통과할 수가 없다
    // (손으로 쓴 지면에는 `facts` 가 없다).
    expect(GOOD_PAGES).toHaveLength(5);
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

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·못 읽음·도 단위를 각각 가른다", () => {
    expect(arithmeticEquationFailures("$1+2+3=6$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$1+2+3=7$이다.")).toHaveLength(1);
    expect(
      arithmeticEquationFailures(
        "$(360\\times5)\\div(84\\times5-360)=1800\\div60=30$",
      ),
    ).toEqual([]);
    expect(
      arithmeticEquationFailures(
        "$(360\\times5)\\div(84\\times5-360)=1800\\div60=31$",
      ),
    ).toHaveLength(1);
    // 🔴 도 단위 — 안 지우면 통째로 「못 읽음」이 되어 검사 밖으로 나간다.
    expect(arithmeticEquationFailures("$360-276=84^{\\circ}$")).toEqual([]);
    expect(arithmeticEquationFailures("$360-276=85^{\\circ}$")).toHaveLength(1);
    expect(arithmeticEquationCount("$360-276=84^{\\circ}$")).toBe(1);
    // 문자식은 «판정하지 않는다» — 계산하려 들면 거짓 빨강이 난다.
    expect(
      arithmeticEquationFailures("$n=(360\\times m)\\div(84\\times m-360)$"),
    ).toEqual([]);
    expect(
      arithmeticEquationCount("$n=(360\\times m)\\div(84\\times m-360)$"),
    ).toBe(0);
    // 읽을 수 없는 글자는 조용히 넘기지 않고 **실패로 센다**.
    expect(arithmeticEquationFailures("$1++2=3$")).toHaveLength(1);
    // 음수를 괄호로 감싼 합
    expect(arithmeticEquationFailures("$24+(-4)=20$")).toEqual([]);
    expect(arithmeticEquationFailures("$24+(-4)=21$")).toHaveLength(1);
  });

  it("🔴 수관형사 표가 생성기 것과 **다른 벌**이다 — 가져다 쓰면 동어반복이다", () => {
    expect(COUNT_WORD[3]).toBe("세");
    expect(COUNT_WORD[10]).toBe("열");
    expect(Object.keys(COUNT_WORD)).toHaveLength(12);
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조 (㉷ — 주석의 단언을 시험이 문다)
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — 굳힘 함수와 음성 대조", () => {
  it("`polygonPairs` 가 전수 탐색과 **정확히** 같다 (합·차 둘 다)", () => {
    // 한 외각의 합 $84^\circ$ — 손 계산: $(5,30)$, $(6,15)$
    expect(polygonPairs("합", 84)!.pairs.map((p) => [...p])).toEqual([
      [5, 30],
      [6, 15],
    ]);
    // 한 외각의 차 $45^\circ$ — 손 계산: $(4,8)$, $(6,24)$, $(7,56)$
    expect(polygonPairs("차", 45)!.pairs.map((p) => [...p])).toEqual([
      [4, 8],
      [6, 24],
      [7, 56],
    ]);
    for (const deg of [63, 84, 96, 108, 135]) {
      expect(polygonPairs("합", deg)!.pairs.map((p) => [...p])).toEqual(
        brutePolygonPairs("합", deg),
      );
    }
    for (const deg of [40, 42, 45, 48, 54]) {
      expect(polygonPairs("차", deg)!.pairs.map((p) => [...p])).toEqual(
        brutePolygonPairs("차", deg),
      );
    }
  });

  it("🔴 음성 대조 — 짝이 **하나도 없는** 각의 크기가 실재한다", () => {
    expect(polygonPairs("합", 59)!.pairs).toEqual([]);
    expect(brutePolygonPairs("합", 59)).toEqual([]);
    // 그리고 흔들면 달라진다 — 항등식이 아니다.
    expect(polygonPairs("합", 85)!.pairs.length).not.toBe(
      polygonPairs("합", 84)!.pairs.length,
    );
  });

  it("🔴 `polygonPairs` 의 훑는 범위가 «놓치는 해가 없다»를 보인다", () => {
    // 주석이 「$m$ 을 이 범위만 훑으면 된다」고 단언한다 — 그 단언을 여기서 문다.
    //
    // ⚠️ 두 갈래로 나눠 묻는다. 창 밖의 각에서는 $n$ 이 $2000$ 을 넘는 해가 있어
    //    (예: 차 $21^{\circ}$ 의 $(17, 2040)$) 전수 탐색기가 **자기 상한 때문에**
    //    그것을 못 본다 — 그건 훑는 범위의 결함이 아니라 대조기의 상한이다.
    //    그래서 ⑴ 「전수가 찾은 것을 훑기가 하나도 안 놓친다」는 **전 구간**에서,
    //    ⑵ 「둘이 정확히 같다」는 **창 안**($n\le120$ 이 보장된다)에서 묻는다.
    let checked = 0;
    for (const kind of ["합", "차"] as const) {
      for (let deg = 20; deg <= 300; deg += 1) {
        const scan = polygonPairs(kind, deg);
        if (scan === null) continue;
        const seen = new Set(scan.pairs.map((p) => p.join(",")));
        for (const [m, n] of brutePolygonPairs(kind, deg)) {
          // $m=n$ 인 해는 훑기가 일부러 버린다(발문이 「서로 다른」이라 한다).
          if (m === n) continue;
          expect(
            seen.has(`${m},${n}`),
            `${kind} ${deg} 이 (${m},${n}) 을 놓쳤다`,
          ).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked, "전수 탐색기가 해를 하나도 못 찾았다").toBeGreaterThan(100);
    for (const c of POLYGON_WINDOW) {
      expect(
        polygonPairs(c.kind, c.deg)!.pairs.map((p) => [...p]),
        `${c.kind} ${c.deg}`,
      ).toEqual(brutePolygonPairs(c.kind, c.deg));
    }
  });

  it("`triangleTriples` 가 열 가지를 내고 세 부등식 판정과 같다", () => {
    const t = triangleTriples([3, 4, 8, 18, 19]);
    expect(t).toHaveLength(10);
    expect(t.filter((r) => r.ok).map((r) => r.perimeter)).toEqual([40, 41, 45]);
    expect(t.filter((r) => r.ok).map((r) => [...r.triple])).toEqual(
      bruteTriangles([3, 4, 8, 18, 19]).map((r) => [...r.triple]),
    );
  });

  it("🔴 음성 대조 — 하나도 안 되는 다섯, 인자가 잘못이면 던진다", () => {
    expect(triangleTriples([1, 2, 4, 8, 16]).filter((r) => r.ok)).toEqual([]);
    expect(() => triangleTriples([1, 2, 3, 4])).toThrow();
    expect(() => triangleTriples([1, 2, 3, 4, 4])).toThrow();
  });

  it("🔴 **퇴화**($x+y=z$)는 삼각형이 아니다 — 부등호가 느슨해지면 여기서 죽는다", () => {
    // 생성기는 퇴화 짝이 하나라도 있는 다섯을 통째로 버리므로, 산출물만 보면
    // `>` 와 `>=` 가 **구별되지 않는다**(변이 하네스가 「산출물 그대로」로 판정을
    // 거부했다). 그 사각을 손 픽스처로 메운다.
    const t = triangleTriples([2, 3, 5, 9, 20]);
    const deg = t.find((r) => r.triple.join(",") === "2,3,5")!;
    expect(deg.shortSum).toBe(5);
    expect(deg.ok, "$2+3=5$ 는 삼각형이 되지 않는다").toBe(false);
    expect(deg.perimeter).toBe(0);
  });

  it("`integerWindowValues` 가 손 계산·전수 탐색과 맞는다", () => {
    // $-\frac72$ 보다 큰 정수 중 가장 작은 것 $-3$, 아홉째는 $5$ → $n=36..42$
    expect(integerWindowValues(7, 2, 7, 9)).toEqual([
      36, 37, 38, 39, 40, 41, 42,
    ]);
    expect(integerWindowValues(7, 2, 7, 9)).toEqual(bruteWindowN(7, 2, 7, 9));
    expect(integerWindowValues(11, 3, 4, 6)).toEqual(bruteWindowN(11, 3, 4, 6));
  });

  it("🔴 음성 대조 — 위끝이 $0$ 이하면 자연수 $n$ 이 하나도 없다", () => {
    // $-\frac{25}{2}$ 보다 큰 가장 작은 정수는 $-12$, 넷째는 $-9$ → $n$ 이 음수 범위다
    expect(integerWindowValues(25, 2, 3, 4)).toEqual([]);
    // 분모가 $1$ 이면(또는 아래끝이 정수면) 판정하지 않는다.
    expect(integerWindowValues(7, 1, 3, 5)).toEqual([]);
    expect(integerWindowValues(8, 2, 3, 5)).toEqual([]);
  });

  it("🔴 `integerWindowValues` 는 $k$ 를 하나 늘리면 합이 정확히 $r^{2}$ 커진다", () => {
    // 모듈이 「흔들기 가드가 구조적으로 0」이라고 적은 바로 그 대수 — 여기서 문다.
    for (const [p, q, r, k] of [
      [7, 2, 7, 9],
      [11, 3, 4, 6],
      [23, 5, 3, 7],
    ] as const) {
      const a = integerWindowValues(p, q, r, k).reduce((s, v) => s + v, 0);
      const b = integerWindowValues(p, q, r, k + 1).reduce((s, v) => s + v, 0);
      expect(b - a).toBe(r * r);
    }
  });

  it("`equalityConstants` 가 손 계산·전수 탐색과 맞는다", () => {
    const { multiples, alive } = equalityConstants(4, 28, 5, 32);
    expect(multiples).toEqual([-4, 0, 4, 8, 12, 16, 20]);
    expect(alive).toEqual([24, 20, 16, 12, 8]);
    expect([...alive].sort((a, b) => a - b)).toEqual(
      bruteEqualityB(4, 28, 5, 32),
    );
  });

  it("🔴 음성 대조 — 범위에 양의 배수가 없으면 살아남는 $b$ 가 없다", () => {
    expect(equalityConstants(5, 20, 20, 24).alive).toEqual([]);
    expect(equalityConstants(1, 20, 1, 10)).toEqual({
      multiples: [],
      alive: [],
    });
    expect(equalityConstants(4, 28, 32, 5)).toEqual({
      multiples: [],
      alive: [],
    });
  });

  it("`pageShortcutValues`·`scaledValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect([...pageShortcutValues([30, 12])]).toContain(18); // 차
    expect([...pageShortcutValues([30, 12])]).toContain(60); // 최소공배수
    expect([...pageShortcutValues([30, 12])]).not.toContain(7);
    expect([...pageShortcutValues([])]).toHaveLength(0);
    // 🔴 양성·음성 한 쌍 — 둘 다 `93X` 의 실제 판이다.
    //    $84\div3\times2=56$ 이라 「외각의 합 $84^{\circ}$」 판은 생성기가 버리고,
    //    「외각의 합 $78^{\circ}$」 판(답 $91$)은 살아남는다.
    expect(scaledValues(84).has(56)).toBe(true);
    expect(scaledValues(78).has(91)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5H).toHaveLength(4);
    expect(M1_TOP_5H.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_5H.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5H) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), `${e.key}`).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    // ⚠️ 다른 소단원에는 **가는 공백 U+2009** 가 든 것이 있어 눈으로는 안 갈린다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5H) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    expect(M1_TOP_5H.map((e) => e.unitSection)).toEqual([
      "다각형의 내각과 외각",
      "작도",
      "수의 대소관계",
      "등식의 성질",
    ]);
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const on = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(on === 0 || on === KEYS.length, `등록된 것 ${on}/4`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
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

describe("중1 5차 h — 지면과 값", () => {
  it("🔴 중1에 `심화상` 둘 · `심화중` 둘이 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
  });

  for (const e of M1_TOP_5H) {
    describe(e.key, () => {
      it("갈래가 못 박은 그대로다 (씨앗·변형을 가로질러)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 4; v += 1) {
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

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시·상한 선언", () => {
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
          // ㉱ 발문이 상한을 선언하지 않는다.
          expect(declaredUpperBound(p.content), `상한 ${seed}/${v}`).toBeNull();
        }
        // 🔴 그 자가 살아 있는가 — 「$1$ 로 놓고」를 읽으면 $1$ 을 낸다.
        expect(declaredUpperBound("전체 일의 양을 $1$로 놓고 …")).toBe(1);
      });

      it("🔴 공용 조사 자가 이 유형에서 **구조적으로 0 이 아니다** — 실제로 읽는 자리가 있다", () => {
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
          seen += arithmeticEquationCount(p.solution);
        }
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 둘 이상**을 요구한다.
        expect(seen).toBeGreaterThan(220 * 2);
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
        // 수 분수가 있는 것은 `95X` 뿐이다 — 나머지 셋은 **0** 으로 못 박는다.
        if (e.key === K95) expect(seen).toBeGreaterThan(400);
        else expect(seen).toBe(0);
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

      /**
       * 🔴 **제품이 실제로 쓰는 규칙으로 잰다.**
       *
       * 처음에는 「변형 $0..floor-1$ 이 **전부** 서로 다르다」로 잠갔는데, 그것은
       * 제품이 요구하는 것이 아니다 — 적재기는 발문이 겹치면 **버리고 변형 번호를
       * 올린다**(예산 $n\times30$). 그리고 씨앗이 `seed + variant\times0x9e37` 로만
       * 갈리므로 두 변형이 창의 같은 자리를 뽑는 것은 **생일 문제**이고, 창을
       * 키워도 0이 되지 않는다.
       *
       * 2026-09-04: `93X` 의 쏠림을 고치며 「답을 먼저 뽑는」 꼴로 바꾸자 씨앗
       * $20260903$ 에서 여섯 중 다섯만 달라져 그 잠금이 빨개졌다. **제품은 멀쩡하다** —
       * 예산 안에서 여섯을 다 채운다. 그래서 재는 쪽을 제품에 맞췄다.
       */
      it("🔴 변형 폭 — 제품 예산 안에서 `floor` 개를 채운다", () => {
        const floor = VARIANT_FLOOR[e.key]!;
        for (const seed of SEEDS) {
          const seen = new Set<string>();
          for (let v = 0; v < floor * 30 && seen.size < floor; v += 1) {
            seen.add(build(e.key, seed, v).content);
          }
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
        let seen = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const cand = obviousCandidates(pageNumbers(p.content));
          seen += cand.size;
          const hit = [...cand].filter(
            ([, val]) => val === answerNumber(p.answer),
          );
          expect(hit, `${e.key} ${seed}/${v}`).toEqual([]);
        }
        // 🔴 「0건」이 «깨끗»인지 «못 셈»인지 가른다 — 자가 후보를 실제로 만들었나.
        expect(
          seen,
          `${e.key} 지면 수 조합을 한 개도 못 만들었다`,
        ).toBeGreaterThan(0);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — ㉠ 창이 한쪽 끝만인가", () => {
  it("`93X` — 살아남는 $m$ 의 **자리와 개수**가 씨앗을 가로질러 갈린다", () => {
    const firstOffsets = new Set<number>();
    const counts = new Set<number>();
    for (const [s, v] of BULK) {
      const p = build(K93, s, v);
      const { kind, outer } = read93(p.content);
      const scan = polygonPairs(kind, outer)!;
      const pairs = scan.pairs;
      counts.add(pairs.length);
      firstOffsets.add(pairs[0]![0] - scan.lo);
      // 답이 **살아남은 것 전부의 합**이라 목록의 어느 자리도 답이 아니다.
      for (const [m, n] of pairs) {
        expect(m).not.toBe(answerNumber(p.answer));
        expect(n).not.toBe(answerNumber(p.answer));
      }
    }
    expect(
      counts.size,
      "살아남는 짝의 개수가 한 값뿐이다",
    ).toBeGreaterThanOrEqual(2);
    expect(
      firstOffsets.size,
      "첫 해가 늘 훑는 범위의 같은 자리다 — 굳힘이 자리를 안 고른다",
    ).toBeGreaterThanOrEqual(2);
  });

  it("`94X` — 살아남는 삼각형의 **개수와 첫 자리**가 갈린다", () => {
    const counts = new Set<number>();
    const firsts = new Set<number>();
    for (const [s, v] of BULK) {
      const p = build(K94, s, v);
      const lens = read94(p.content);
      const trials = triangleTriples(lens);
      const aliveIdx = trials
        .map((t, i) => (t.ok ? i : -1))
        .filter((i) => i >= 0);
      counts.add(aliveIdx.length);
      firsts.add(aliveIdx[0]!);
      expect(trials.filter((t) => t.ok).map((t) => t.perimeter)).not.toContain(
        answerNumber(p.answer),
      );
    }
    expect(counts.size).toBeGreaterThanOrEqual(2);
    expect(firsts.size, "살아남는 첫 자리가 늘 같다").toBeGreaterThanOrEqual(2);
  });

  it("`95X` — **해당 없음**: 후보 목록이 없다(살아남는 $n$ 이 늘 $r$개다). 대신 갈리는 축을 찍는다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다 — 그 사실을 여기서 찍는다.
    const rs = new Set<number>();
    for (const [s, v] of BULK) {
      const p = build(K95, s, v);
      const { p: pp, q, r, k } = read95(p.content);
      expect(bruteWindowN(pp, q, r, k)).toHaveLength(r);
      rs.add(r);
    }
    // 그 대신 분모 $r$(=살아남는 개수)이 씨앗을 가로질러 갈려야 한다.
    expect(rs.size).toBeGreaterThanOrEqual(3);
  });

  it("`96X` — 살아남는 $b$ 의 개수가 갈리고, 답은 목록의 어느 자리도 아니다", () => {
    const counts = new Set<number>();
    for (const [s, v] of BULK) {
      const p = build(K96, s, v);
      const { a, c, b1, b2 } = read96(p.content);
      const alive = bruteEqualityB(a, c, b1, b2);
      counts.add(alive.length);
      expect(alive).not.toContain(answerNumber(p.answer));
    }
    expect(counts.size).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 인자를 흔들면 답이 바뀌나
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — ㉡ 굳힘이 항등식인가", () => {
  it("`93X` — 각의 크기를 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K93, s, v);
      const { kind, outer } = read93(p.content);
      const shaken = brutePolygonPairs(kind, outer + 1).reduce(
        (a, [m, n]) => a + m + n,
        0,
      );
      expect(shaken).not.toBe(answerNumber(p.answer));
    }
  });

  it("`94X` — 가장 긴 막대를 하나 늘리면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K94, s, v);
      const lens = read94(p.content);
      const shakenLens = [...lens];
      shakenLens[4] = lens[4]! + 1;
      const shaken = bruteTriangles(shakenLens).reduce((a, t) => a + t.peri, 0);
      expect(shaken).not.toBe(answerNumber(p.answer));
    }
  });

  it("`95X` — 개수 $k$ 를 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K95, s, v);
      const { p: pp, q, r, k } = read95(p.content);
      const shaken = bruteWindowN(pp, q, r, k + 1).reduce((a, b) => a + b, 0);
      expect(shaken).not.toBe(answerNumber(p.answer));
    }
  });

  it("`96X` — 우변을 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K96, s, v);
      const { a, c, b1, b2 } = read96(p.content);
      const shaken = bruteEqualityB(a, c + 1, b1, b2).reduce(
        (s2, x) => s2 + x,
        0,
      );
      expect(shaken).not.toBe(answerNumber(p.answer));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 해설의 나열 줄을 한 줄씩 다시 셈한다 + 「모두」를 전수로 반증한다
// ═══════════════════════════════════════════════════════════

const RE93_RANGE = /\$m\$은 \$(\d+)\$ 이상 \$(\d+)\$ 이하이다\./;
const RE93_ROW =
  /^\$m=(\d+)\$이면 \$n=\(360\\times(\d+)\)\\div\((.+?)\)=(\d+)\\div(\d+)(?:=(\d+))?\$(.*)$/gm;
const RE93_FINAL =
  /따라서 조건을 만족시키는 두 정다각형은 (.+?)의 (\S+) 쌍이다\./;
const RE93_SUM = /구하는 값은 \$([\d+]+)=(\d+)\$이다\./;

describe("중1 5차 h — `93X` 의 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("훑은 $m$ 이 **선언한 범위와 정확히 같고**(㉴), 나눗셈 판정과 「모두」가 전수와 같다", () => {
    let rows = 0;
    for (const [s, v] of BULK) {
      const p = build(K93, s, v);
      const { kind, angle, shown, outer, ask } = read93(p.content);
      // ⑴ 내각으로 물었으면 외각으로 바꾸는 줄이 **참**이어야 한다.
      if (angle === "내각" && kind === "합") {
        const conv =
          /한 외각의 크기의 합은 \$360-(\d+)=(\d+)\$에서 \$(\d+)\^\{\\circ\}\$이다/.exec(
            p.solution,
          );
        expect(conv, `93X 변환 줄이 없다 — ${s}/${v}`).not.toBeNull();
        expect(num(conv![1]!)).toBe(shown);
        expect(num(conv![2]!)).toBe(outer);
        expect(360 - shown).toBe(outer);
      }
      if (angle === "내각" && kind === "차") {
        expect(p.solution).toContain("한 외각의 크기의 차도");
        expect(outer).toBe(shown);
      }
      // ⑵ 선언한 범위
      const rangeM = RE93_RANGE.exec(p.solution);
      expect(rangeM, `93X 범위 줄이 없다 — ${s}/${v}`).not.toBeNull();
      const lo = num(rangeM![1]!);
      const hi = num(rangeM![2]!);
      expect(lo).toBeGreaterThanOrEqual(3);
      expect(hi).toBeGreaterThanOrEqual(lo);
      // ⑶ 실제로 훑은 $m$ 의 집합 — **선언한 범위와 글자 그대로 같아야 한다**(㉴).
      RE93_ROW.lastIndex = 0;
      const seenM: number[] = [];
      const aliveFromPage: [number, number][] = [];
      for (const r of p.solution.matchAll(RE93_ROW)) {
        const m = num(r[1]!);
        expect(num(r[2]!), `93X 대입한 $m$ 이 다르다`).toBe(m);
        const den = kind === "합" ? outer * m - 360 : 360 - outer * m;
        expect(r[3]).toBe(
          kind === "합" ? `${outer}\\times${m}-360` : `360-${outer}\\times${m}`,
        );
        expect(num(r[4]!)).toBe(360 * m);
        expect(num(r[5]!)).toBe(den);
        if (r[6] !== undefined) {
          // 살아남은 줄 — 나누어떨어지고 몫이 $n$ 이다.
          expect((360 * m) % den).toBe(0);
          expect(num(r[6]!)).toBe((360 * m) / den);
          expect(r[7]).toBe("이다.");
          aliveFromPage.push([m, (360 * m) / den]);
        } else {
          // 죽은 줄 — 🔴 낱말과 수를 **함께** 판정한다.
          const tail =
            /^인데 \$(\d+)\$(은|는) \$(\d+)\$의 (배수|약수)가 아니므로 \$n\$이 자연수가 아니다\.$/.exec(
              r[7]!,
            );
          expect(tail, `93X 죽은 줄 모양이 다르다 — ${r[7]}`).not.toBeNull();
          expect(num(tail![1]!)).toBe(360 * m);
          expect(num(tail![3]!)).toBe(den);
          expect(tail![4], "「배수」가 아니면 그 주장은 다른 말이 된다").toBe(
            "배수",
          );
          expect(
            (360 * m) % den,
            "배수가 아니라고 했는데 나누어떨어진다",
          ).not.toBe(0);
        }
        seenM.push(m);
        rows += 1;
      }
      const declared: number[] = [];
      for (let m = lo; m <= hi; m += 1) declared.push(m);
      expect(seenM, `93X 훑은 $m$ 이 선언한 범위와 다르다 — ${s}/${v}`).toEqual(
        declared,
      );
      // ⑷ 「모두」를 **훑은 범위 밖까지** 전수로 반증한다.
      const brute = brutePolygonPairs(kind, outer);
      expect(aliveFromPage).toEqual(brute);
      // ⑸ 마무리 줄 — 쌍 목록·셈말·합
      const fin = RE93_FINAL.exec(p.solution);
      expect(fin, `93X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      const listed = [
        ...fin![1]!.matchAll(/정\$(\d+)\$각형과 정\$(\d+)\$각형/g),
      ].map((x) => [Number(x[1]), Number(x[2])] as [number, number]);
      expect(listed).toEqual(brute);
      expect(fin![2]).toBe(COUNT_WORD[brute.length]);
      const sum = RE93_SUM.exec(p.solution);
      expect(sum, `93X 합 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(sum![1]!.split("+").map(Number)).toEqual(brute.flat());
      expect(num(sum![2]!)).toBe(answerNumber(p.answer));
      // ⑹ 꼭짓점으로 물었으면 그 근거 줄이 있어야 한다.
      if (ask === "꼭짓점") {
        expect(p.solution).toContain("꼭짓점의 개수는 변의 개수와 같으므로");
      } else {
        expect(p.solution).not.toContain("꼭짓점");
      }
    }
    expect(rows).toBeGreaterThan(220 * 3);
  });
});

// ⚠️ 「크므로」와 「작**으**므로」는 어간 뒤 매개모음이 달라 `(크|작)므로` 로는
//    **작은 쪽이 통째로 안 걸린다**(처음에 그렇게 써서 열 줄 중 넷만 잡혔다).
const RE94_ROW =
  /\$(\d+)\$, \$(\d+)\$, \$(\d+)\$(?:을|를) 뽑으면 \$(\d+)\+(\d+)=(\d+)\$(?:은|는) \$(\d+)\$보다 (크므로|작으므로) (?:삼각형이 되고, 둘레의 길이는 \$(\d+)\+(\d+)\+(\d+)=(\d+)\$이다|삼각형이 되지 않는다)\./g;
const RE94_FINAL =
  /따라서 삼각형이 되는 것은 (\S+) 가지이고, 둘레의 길이를 모두 더하면 \$([\d+]+)=(\d+)\$이므로/;

describe("중1 5차 h — `94X` 의 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("열 줄의 판정·둘레가 서로 맞고, 「모두」가 세 부등식 전수와 같다", () => {
    let rows = 0;
    for (const [s, v] of BULK) {
      const p = build(K94, s, v);
      const lens = read94(p.content);
      RE94_ROW.lastIndex = 0;
      const matches = [...p.solution.matchAll(RE94_ROW)];
      expect(matches, `94X 줄이 열이 아니다 — ${s}/${v}`).toHaveLength(10);
      const aliveFromPage: number[] = [];
      const seenTriples: string[] = [];
      for (const r of matches) {
        const x = num(r[1]!);
        const y = num(r[2]!);
        const z = num(r[3]!);
        expect(x).toBeLessThan(y);
        expect(y).toBeLessThan(z);
        expect(num(r[4]!)).toBe(x);
        expect(num(r[5]!)).toBe(y);
        expect(num(r[6]!)).toBe(x + y);
        expect(num(r[7]!)).toBe(z);
        // 🔴 낱말과 수를 **함께** 판정한다 — 「크」와 「작」을 맞바꾸면 여기서 죽는다.
        if (r[8] === "크므로") {
          expect(x + y).toBeGreaterThan(z);
          expect(num(r[12]!)).toBe(x + y + z);
          expect(num(r[9]!)).toBe(x);
          expect(num(r[10]!)).toBe(y);
          expect(num(r[11]!)).toBe(z);
          aliveFromPage.push(x + y + z);
        } else {
          expect(x + y).toBeLessThan(z);
          expect(r[12]).toBeUndefined();
        }
        seenTriples.push([x, y, z].join(","));
        rows += 1;
      }
      // 열 가지가 **서로 다른 세 개**를 다 덮는가
      const wanted: string[] = [];
      const sorted = [...lens].sort((a, b) => a - b);
      for (let i = 0; i < 5; i += 1) {
        for (let j = i + 1; j < 5; j += 1) {
          for (let k = j + 1; k < 5; k += 1) {
            wanted.push([sorted[i]!, sorted[j]!, sorted[k]!].join(","));
          }
        }
      }
      expect([...seenTriples].sort()).toEqual([...wanted].sort());
      // 🔴 「모두」를 세 부등식 전수로 반증한다.
      expect(aliveFromPage).toEqual(bruteTriangles(lens).map((t) => t.peri));
      const fin = RE94_FINAL.exec(p.solution);
      expect(fin, `94X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(fin![1]).toBe(COUNT_WORD[aliveFromPage.length]);
      expect(fin![2]!.split("+").map(Number)).toEqual(aliveFromPage);
      expect(num(fin![3]!)).toBe(answerNumber(p.answer));
    }
    expect(rows).toBe(220 * 10);
  });
});

describe("중1 5차 h — `95X` 의 여섯 줄을 한 줄씩 다시 셈한다", () => {
  it("자리 판정·아래끝·위끝·범위·합이 모두 참이다", () => {
    for (const [s, v] of BULK) {
      const p = build(K95, s, v);
      const { p: pp, q, r, k } = read95(p.content);
      // ⑴ $\frac pq$ 가 어느 두 정수 사이인가
      const l1 =
        /\$(\d+)\\times(\d+)=(\d+)\$(?:은|는) \$(\d+)\$보다 (작|크)고 \$(\d+)\\times(\d+)=(\d+)\$(?:은|는) \$(\d+)\$보다 (크|작)므로, \$\\dfrac\{(\d+)\}\{(\d+)\}\$(?:은|는) \$(\d+)\$보다 크고 \$(\d+)\$보다 작다\./.exec(
          p.solution,
        );
      expect(l1, `95X 첫 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l1![1]!)).toBe(q);
      expect(num(l1![3]!)).toBe(q * num(l1![2]!));
      expect(num(l1![4]!)).toBe(pp);
      expect(l1![5], "「작고」가 아니면 그 주장은 거짓이다").toBe("작");
      expect(q * num(l1![2]!)).toBeLessThan(pp);
      expect(num(l1![8]!)).toBe(q * num(l1![7]!));
      expect(l1![10], "「크므로」가 아니면 그 주장은 거짓이다").toBe("크");
      expect(q * num(l1![7]!)).toBeGreaterThan(pp);
      expect(num(l1![7]!)).toBe(num(l1![2]!) + 1);
      expect(num(l1![11]!)).toBe(pp);
      expect(num(l1![12]!)).toBe(q);
      expect(num(l1![13]!)).toBe(num(l1![2]!));
      expect(num(l1![14]!)).toBe(num(l1![2]!) + 1);
      // ⑵ 가장 작은 정수 — 전수로 다시 찾는다.
      const l2 =
        /\$-\\dfrac\{\d+\}\{\d+\}\$보다 큰 정수 중 가장 (작|큰)(?:은)? 것은 \$(-?\d+)\$이다\./.exec(
          p.solution.replace("가장 작은 것은", "가장 작은 것은"),
        );
      const l2b = /보다 큰 정수 중 가장 (작은|큰) 것은 \$(-?\d+)\$이다\./.exec(
        p.solution,
      );
      expect(l2b, `95X 둘째 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(l2b![1], "「가장 작은」이 아니면 그 주장은 거짓이다").toBe("작은");
      let first = -400;
      while (q * first <= -pp) first += 1;
      expect(num(l2b![2]!)).toBe(first);
      void l2;
      // ⑶ $k$번째
      const l3 =
        /조건을 만족시키는 정수는 \$(-?\d+)\$부터 차례로 \$(\d+)\$개이므로 그중 가장 (큰|작은) 것은 \$(-?\d+)\+(\d+)-1=(-?\d+)\$이다\./.exec(
          p.solution,
        );
      expect(l3, `95X 셋째 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l3![1]!)).toBe(first);
      expect(num(l3![2]!)).toBe(k);
      expect(l3![3], "「가장 큰」이 아니면 그 주장은 거짓이다").toBe("큰");
      const last = first + k - 1;
      expect(num(l3![6]!)).toBe(last);
      // ⑷ 위끝 구간
      const l4 =
        /가장 큰 것이 \$(-?\d+)\$(이|가) 되려면 \$\\dfrac\{n\}\{(\d+)\}\$은 \$(-?\d+)\$보다 크고 \$(-?\d+)\$ 이하이어야 한다\./.exec(
          p.solution,
        );
      expect(l4, `95X 넷째 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l4![1]!)).toBe(last);
      expect(l4![2]).toBe(subjectJosaFor(last));
      expect(num(l4![3]!)).toBe(r);
      expect(num(l4![4]!)).toBe(last);
      expect(num(l4![5]!)).toBe(last + 1);
      // ⑸ 분모를 곱한 자리 — ㉯ 「자연수」 걸음을 그 자리에서 적는다.
      const l5 =
        /분모가 \$(\d+)\$이므로 \$n\$은 \$(\d+)\\times(-?\d+)=(-?\d+)\$보다 크고 \$(\d+)\\times(-?\d+)=(-?\d+)\$ 이하인 자연수이다\./.exec(
          p.solution,
        );
      expect(l5, `95X 다섯째 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l5![1]!)).toBe(r);
      expect(num(l5![4]!)).toBe(r * last);
      expect(num(l5![7]!)).toBe(r * (last + 1));
      // ⑹ 마무리 — 「모두」를 전수로 반증한다.
      const fin =
        /따라서 \$n\$의 값은 (.+?)의 (\S+) 개이고, 구하는 값은 \$([\d+]+)=(\d+)\$이다\./.exec(
          p.solution,
        );
      expect(fin, `95X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      const listed = readList(fin![1]!);
      const brute = bruteWindowN(pp, q, r, k);
      expect(listed).toEqual(brute);
      expect(fin![2]).toBe(COUNT_WORD[brute.length]);
      expect(fin![3]!.split("+").map(Number)).toEqual(brute);
      expect(num(fin![4]!)).toBe(answerNumber(p.answer));
    }
  });
});

describe("중1 5차 h — `96X` 의 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("배수 목록·거르기·각 $b$ 의 값과 「모두」가 전수와 같다", () => {
    let rows = 0;
    for (const [s, v] of BULK) {
      const p = build(K96, s, v);
      const { a, c, b1, b2 } = read96(p.content);
      // ⑴ 「$0$ 이 아니므로 나눌 수 있다」 — 이 유형의 굳힘 그 자체다.
      const l2 =
        /\$(\d+)\$(?:은|는) \$0\$(이|가) (아니므로|이므로) 양변을 \$(\d+)\$(?:으로|로) 나누어도 등식은 성립한다\./.exec(
          p.solution,
        );
      expect(l2, `96X 나눗셈 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l2![1]!)).toBe(a);
      expect(l2![3], "「아니므로」가 아니면 그 주장이 뒤집힌다").toBe(
        "아니므로",
      );
      expect(a).not.toBe(0);
      // ⑵ 범위 줄
      const l4 =
        /\$(\d+)-b\$는 \$(\d+)-(\(-?\d+\)|-?\d+)=(-?\d+)\$ 이상 \$(\d+)-(\(-?\d+\)|-?\d+)=(-?\d+)\$ 이하의 정수이다\./.exec(
          p.solution,
        );
      expect(l4, `96X 범위 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l4![1]!)).toBe(c);
      expect(num(l4![4]!)).toBe(c - b2);
      expect(num(l4![7]!)).toBe(c - b1);
      // ⑶ 배수 목록과 거르기 — 🔴 낱말과 수를 **함께** 판정한다.
      const l5 =
        /이 범위에서 \$(\d+)\$의 (배수|약수)는 (.+?)이고, (.+?)(?:은|는) \$0\$보다 크지 (않으므로|않지 않으므로) 남는 것은 (.+?)이다\./.exec(
          p.solution,
        );
      expect(l5, `96X 배수 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(l5![1]!)).toBe(a);
      expect(l5![2], "「배수」가 아니면 그 주장은 다른 말이 된다").toBe("배수");
      const listedMul = readList(l5![3]!);
      const listedDead = readList(l5![4]!);
      const listedPos = readList(l5![6]!);
      const bruteMul: number[] = [];
      for (let m = c - b2; m <= c - b1; m += 1)
        if (m % a === 0) bruteMul.push(m);
      expect(listedMul).toEqual(bruteMul);
      expect(listedDead).toEqual(bruteMul.filter((m) => m <= 0));
      expect(listedPos).toEqual(bruteMul.filter((m) => m > 0));
      expect(listedDead.length).toBeGreaterThan(0);
      // ⑷ 각 배수의 줄
      const rowRe =
        /\$(\d+)-b=(\d+)\$이면 \$b=(\d+)-(\d+)=(-?\d+)\$이고, 이때 \$x=(\d+)\\div(\d+)=(\d+)\$이다\./g;
      const found = [...p.solution.matchAll(rowRe)];
      expect(found, `96X 배수별 줄 수가 다르다 — ${s}/${v}`).toHaveLength(
        listedPos.length,
      );
      const bFromPage: number[] = [];
      for (const r of found) {
        const m = num(r[2]!);
        expect(num(r[1]!)).toBe(c);
        expect(num(r[3]!)).toBe(c);
        expect(num(r[4]!)).toBe(m);
        expect(num(r[5]!)).toBe(c - m);
        expect(num(r[6]!)).toBe(m);
        expect(num(r[7]!)).toBe(a);
        expect(num(r[8]!)).toBe(m / a);
        // 되짚어 등식이 성립하는가
        expect(a * num(r[8]!) + num(r[5]!)).toBe(c);
        expect(num(r[8]!)).toBeGreaterThan(0);
        bFromPage.push(c - m);
        rows += 1;
      }
      // ⑸ 「모두」를 전수로 반증한다.
      const brute = bruteEqualityB(a, c, b1, b2);
      expect([...bFromPage].sort((x, y) => x - y)).toEqual(brute);
      const fin =
        /따라서 \$b\$의 값은 (.+?)의 (\S+) 개이고, 구하는 값은 \$(.+?)=(-?\d+)\$이다\./.exec(
          p.solution,
        );
      expect(fin, `96X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(readList(fin![1]!)).toEqual(bFromPage);
      expect(fin![2]).toBe(COUNT_WORD[bFromPage.length]);
      expect(evalTex(fin![3]!).n).toBe(answerNumber(p.answer));
      expect(num(fin![4]!)).toBe(answerNumber(p.answer));
    }
    expect(rows).toBeGreaterThan(220 * 2);
  });
});

// ═══════════════════════════════════════════════════════════
// 🔴 ㉳ 해설의 «말» — 판정을 진술하는 문장을 지키는 자
// ═══════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」 — 값은 지면에서 다시 읽어 만든다. */
function requiredWords(key: string, content: string): string[] {
  if (key === K93) {
    const { kind, outer } = read93(content);
    return [
      "한 외각의 크기는 $\\dfrac{360^{\\circ}}{m}$이므로",
      "$(m<n)$이라 하면",
      "의 배수가 아니므로 $n$이 자연수가 아니다",
      kind === "합"
        ? `$${outer}\\times m$은 $360$보다 크고 $720$보다 작다`
        : `$${outer}\\times m$은 $360$보다 작다`,
    ];
  }
  if (key === K94) {
    return [
      "가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 짧을 때에만 작도할 수 있다",
      "삼각형이 되지 않는다",
    ];
  }
  if (key === K95) {
    const { r } = read95(content);
    return [
      "보다 큰 정수 중 가장 작은 것은",
      "그중 가장 큰 것은",
      `분모가 $${r}$이므로 $n$은`,
      "이하인 자연수이다",
    ];
  }
  if (key === K96) {
    const { a } = read96(content);
    return [
      // 「(으)로」 — 끝 자리 0·3·6(영·삼·육)만 「으로」다(일·칠·팔은 ㄹ 받침이라 「로」).
      `$${a}$${numVowelFinal(a) ? "는" : "은"} $0$이 아니므로 양변을 $${a}$${[0, 3, 6].includes(a % 10) ? "으로" : "로"} 나누어도 등식은 성립한다`,
      "가 자연수이려면",
      `의 배수이면서 $0$보다 커야 한다`,
      "$0$보다 크지 않으므로 남는 것은",
    ];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K93]: [
    ["의 배수가 아니므로", "의 약수가 아니므로"],
    ["$(m<n)$이라 하면", "$(m>n)$이라 하면"],
    ["$360$보다 크고 $720$보다 작다", "$360$보다 작고 $720$보다 크다"],
    [
      "한 외각의 크기는 $\\dfrac{360^{\\circ}}{m}$",
      "한 내각의 크기는 $\\dfrac{360^{\\circ}}{m}$",
    ],
  ],
  [K94]: [
    ["합보다 짧을 때에만", "합보다 길 때에만"],
    ["삼각형이 되지 않는다", "삼각형이 된다"],
  ],
  [K95]: [
    ["가장 작은 것은", "가장 큰 것은"],
    ["이하인 자연수이다", "이하인 유리수이다"],
  ],
  [K96]: [
    ["이 아니므로 양변을", "이므로 양변을"],
    ["가 자연수이려면", "가 유리수이려면"],
    ["$0$보다 커야 한다", "$0$보다 작아야 한다"],
    ["$0$보다 크지 않으므로 남는 것은", "$0$보다 크므로 남는 것은"],
  ],
};

function missingWords(
  key: string,
  content: string,
  solution: string,
): string[] {
  return requiredWords(key, content).filter((w) => !solution.includes(w));
}

describe("[중1 5차 h] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
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
      let base = build(key, SEEDS[0]!, 0);
      // `93X` 는 씨앗에 따라 「배수가 아니므로」 줄이 없을 수 없지만(죽는 후보를
      // 생성기가 보장한다), 「$m<n$」 표현이 변형마다 같은지 확인하며 고른다.
      expect(missingWords(key, base.content, base.solution), key).toEqual([]);
      for (const [from, to] of FLIPS[key]!) {
        // ⚠️ 맞바꿈이 **실제로 일어났는지** 먼저 본다. 안 일어나면 「빨개지지
        //    않았다」가 «가드가 없다»가 아니라 «변이가 헛돌았다»는 뜻이다.
        if (!base.solution.includes(from)) {
          base = build(key, SEEDS[1]!, 0);
        }
        expect(base.solution, `${key}: 맞바꿀 자리가 없다 — ${from}`).toContain(
          from,
        );
        const flipped = base.solution.split(from).join(to);
        expect(flipped).not.toBe(base.solution);
        positives += 1;
        expect(
          missingWords(key, base.content, flipped),
          `${key}: 「${from}」→「${to}」 를 아무도 안 물었다`,
        ).not.toEqual([]);
      }
    }
    expect(positives).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나 (㉮)
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — 해설이 정답지 한 단에 들어가나", () => {
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
    for (const e of M1_TOP_5H) {
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

  it("🔴 `93X` 의 훑는 자리 상한이 산출물에 실제로 걸린다", () => {
    // 이 상한이 곧 해설 높이다. 상한을 올리면 위 검사가 빨개진다.
    let maxCand = 0;
    for (const [s, v] of WIDE) {
      const p = build(K93, s, v);
      maxCand = Math.max(maxCand, p.facts.hi! - p.facts.lo! + 1);
    }
    expect(maxCand).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5H) {
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

  it("🔴 5차 `h` 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = M1_TOP_5H.map((e) => build(e.key, OVERLAP_SEED));
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
// ㉶ D-20 손실을 창 전수로 **다시** 센다
// ═══════════════════════════════════════════════════════════

describe("중1 5차 h — ㉶ D-20 손실 원장이 재현되는가", () => {
  it("🔴 `93X` — 창 전수 $56$판 → $48$판 · 답 $24$ → $24$ (모듈 머리말과 글자 그대로 같다)", () => {
    const rows: { ans: number; scaled: boolean; page: boolean }[] = [];
    for (const c of POLYGON_WINDOW) {
      for (const inner of [false, true]) {
        const shown = inner ? (c.kind === "합" ? 360 - c.deg : c.deg) : c.deg;
        const ans = c.scan.pairs.reduce((a, [m, n]) => a + m + n, 0);
        rows.push({
          ans,
          scaled: scaledValues(shown).has(ans),
          page: pageShortcutValues([shown]).has(ans),
        });
      }
    }
    expect(POLYGON_WINDOW).toHaveLength(28);
    expect(POLYGON_WINDOW.filter((c) => c.kind === "합")).toHaveLength(20);
    expect(rows).toHaveLength(56);
    expect(new Set(rows.map((r) => r.ans)).size).toBe(24);
    const alive = rows.filter((r) => !r.scaled && !r.page);
    expect(alive).toHaveLength(48);
    expect(new Set(alive.map((r) => r.ans)).size).toBe(24);
    // 가드 하나만 껐을 때 — 「일하는 가드」와 「구조적으로 0」을 갈라 적는다.
    const withoutPage = rows.filter((r) => !r.page);
    expect(withoutPage).toHaveLength(55);
    expect(withoutPage.filter((r) => !r.scaled)).toHaveLength(48);
    const withoutScaled = rows.filter((r) => !r.scaled);
    expect(withoutScaled).toHaveLength(48);
    // 🔴 `page` 가 `scaled` 위에서 더 잡는 것이 **0** 이다 — 구조적으로 0 인 가드다.
    expect(withoutScaled.filter((r) => !r.page)).toHaveLength(48);
  });

  it("🔴 `94X` — 창 전수 $2{,}066$판 → $1{,}899$판 · 답 $217$ → $213$", () => {
    const rows: {
      ans: number;
      self: boolean;
      page: boolean;
      shake: boolean;
    }[] = [];
    const pool: number[] = [];
    for (let vv = 2; vv <= 20; vv += 1) pool.push(vv);
    for (let i = 0; i < pool.length; i += 1) {
      for (let j = i + 1; j < pool.length; j += 1) {
        for (let k = j + 1; k < pool.length; k += 1) {
          for (let l = k + 1; l < pool.length; l += 1) {
            for (let m = l + 1; m < pool.length; m += 1) {
              const lens = [pool[i]!, pool[j]!, pool[k]!, pool[l]!, pool[m]!];
              const trials = triangleTriples(lens);
              if (trials.some((t) => t.shortSum === t.triple[2])) continue;
              const alive = trials.filter((t) => t.ok);
              if (alive.length < 3 || alive.length > 6) continue;
              if (trials.length - alive.length < 2) continue;
              const ans = alive.reduce((a, t) => a + t.perimeter, 0);
              const shakenLens = [...lens.slice(0, 4), lens[4]! + 1];
              const shaken = triangleTriples(shakenLens)
                .filter((t) => t.ok)
                .reduce((a, t) => a + t.perimeter, 0);
              rows.push({
                ans,
                self: alive.some((t) => t.perimeter === ans),
                page: pageShortcutValues(lens).has(ans),
                shake: shaken === ans,
              });
            }
          }
        }
      }
    }
    expect(rows).toHaveLength(2066);
    expect(new Set(rows.map((r) => r.ans)).size).toBe(217);
    const alive = rows.filter((r) => !r.self && !r.page && !r.shake);
    expect(alive).toHaveLength(1899);
    expect(new Set(alive.map((r) => r.ans)).size).toBe(213);
    // 🔴 「답이 후보 목록 안에 있다」는 **구조적으로 0** 이다.
    expect(rows.filter((r) => r.self)).toHaveLength(0);
  });

  it("🔴 `96X` — 창 전수 $76{,}442$판 → $71{,}974$판 · 답 $289$ → $286$", () => {
    const rows: {
      ans: number;
      self: boolean;
      page: boolean;
      shake: boolean;
    }[] = [];
    for (let a = 2; a <= 9; a += 1) {
      for (let t = 3; t <= 5; t += 1) {
        for (let c = 20; c <= 99; c += 1) {
          for (let e = 0; e <= a; e += 1) {
            const b2 = c + e;
            for (let b1 = c - a * (t + 1) + 1; b1 <= c - a * t; b1 += 1) {
              if (b1 === 0) continue;
              const { multiples, alive } = equalityConstants(a, c, b1, b2);
              if (alive.length !== t) continue;
              if (multiples.length <= t) continue;
              if (alive.includes(0)) continue;
              const ans = alive.reduce((s, x) => s + x, 0);
              const shaken = equalityConstants(a, c + 1, b1, b2).alive.reduce(
                (s, x) => s + x,
                0,
              );
              rows.push({
                ans,
                self: alive.includes(ans),
                page: pageShortcutValues([a, c, b1, b2]).has(ans),
                shake: shaken === ans,
              });
            }
          }
        }
      }
    }
    expect(rows).toHaveLength(76442);
    expect(new Set(rows.map((r) => r.ans)).size).toBe(289);
    const kept = rows.filter((r) => !r.self && !r.page && !r.shake);
    expect(kept).toHaveLength(71974);
    expect(new Set(kept.map((r) => r.ans)).size).toBe(286);
    // 가드 하나만 껐을 때 — 셋 다 **실제로 일한다**(구조적으로 0 인 것이 없다).
    const only = (n: "self" | "page" | "shake"): number =>
      rows.filter((r) =>
        (["self", "page", "shake"] as const).every((m) => m === n || !r[m]),
      ).length;
    expect(only("self")).toBe(72308);
    expect(only("page")).toBe(75759);
    expect(only("shake")).toBe(72053);
  });
});
