/**
 * 중1 **5차 확대 갈래 · 갈래 `b`**(`m1Top5b.ts`) — `심화중` 둘·`심화상` 둘을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `69X` | 「옆모서리마다 $n-2$ 개」라는 **셈의 규칙**으로 $n\times(n-2)$ 를 만든다 | 규칙을 안 쓴다 — 정$n$각뿔의 꼭짓점 **좌표를 실제로 찍어** 모서리 쌍마다 네 점이 한 평면에 있는지 **행렬식**으로 보고 꼬인 짝을 센다. 그렇게 센 값이 지면의 $k$ 와 같은 $n$ 을 찾는다 |
 * | `70X` | $\binom n2-\binom m2+1$ 이라는 **식** | 식을 안 쓴다 — 점을 **좌표로 놓고**(겹치는 $m$ 개는 $x$축 위, 나머지는 포물선 위) 두 점마다 직선을 유리수로 정규화해 **집합에 넣어** 개수를 센다. 세 점이 한 직선 위인 자리가 뜻대로인지도 그 좌표로 확인한다 |
 * | `71X` | $pa=qb$ 와 $a+b=S$ 를 **나눗셈으로** 푼다 | 나눗셈을 안 한다 — $a=1$ 부터 $S-1$ 까지 **전부 넣어 보고** 두 조건을 만족하는 짝이 정확히 하나인지 센다 |
 * | `72X` | 세 무리로 갈라 여섯 번째 값을 만든다 | 무리를 안 가른다 — $x$ 를 하나씩 넣고 여섯 번째 값을 **세기(counting)** 로 고른다(정렬을 쓰지 않는다). 자료는 **줄기와 잎 그림을 파싱해서** 얻는다 |
 *
 * ## 🔴 앞 물결이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을 재어
 *    **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 전부 훑는다.
 *    ⚠️ 이 갈래의 지면에는 분수가 **한 자리도 없다** — 그러면 그 검사는 구조적으로
 *    0이므로, **자가 살아 있음을 손으로 쓴 분수로 따로 보인다**(0을 «깨끗»으로 읽지
 *    않기 위해서다, 2026-08-21).
 * ㉱ **발문이 못 박은 상한을 오답이 넘었다.** → 공용 `declaredUpperBound` 가 넷 전량에서
 *    `null` 임을 확인한다(그 함수는 공용이라 우리가 못 고친다 — 못 읽으면 리드 몫이다).
 * ㉲ **정답이 구간이면 파생 오답이 뒤집힌다.** → 60판에서 5지선다가 실제로 만들어지고
 *    `reversesOrder` 가 거짓임을 본다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 굳힘과 마무리 논거를 낱말로 판정하고,
 *    낱말을 뒤집으면 **전부** 빨개지는 눈금을 둔다. `toContain` 한 줄로 끝내지 않는다.
 * ㉴ **지면이 자기가 세운 제약을 스스로 어겼다.** → `69X` 의 「$n=3$부터 $13$까지」와
 *    `72X` 의 「$x$ 는 $10s$ 이상 $10s+9$ 이하」를 **지면 글자로 다시 재어** 그 뒤 모든
 *    줄이 그 안에 있는지 본다.
 * ㉵ **정렬해 찍은 자료가 순위를 암시했다.** → `72X` 의 빠진 값이 줄기와 잎 그림 안에
 *    **자리를 차지하지 않는다**는 것을 세어 확인한다(그림의 잎 개수가 늘 $10$ 이다).
 * ㉶ **D-20 손실 원장이 재현 불가였다.** → 창을 **전수로 열거**하고 모듈의 가드 함수를
 *    그대로 불러 「이 가드 하나만 껐을 때」를 세어, 머리말에 적힌 수와 맞대 본다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**.
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이
 * 넷을 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 —
 * 그래서 `build()` 가 제품의 후처리 **함수 자체**를 그대로 부르고, 등록되면 곧바로
 * `generateMiddleProblem` 으로 갈아탄다.
 *
 * ## 🔴 리드에게 — `AXES` 는 여기서 못 채운다
 *
 * 판정기(`scripts/qa/probe-middle-top-m1.ts`)의 `AXES` 는 **공용 파일**이라 이 갈래가
 * 못 고친다(브리프 절대 규칙 1). 그래서 그 축(굳힘을 지운 답 · 굳힘을 흔든 답)을
 * **이 파일 안에 같은 모양으로** 두고 재 둔다 — 리드가 `AXES` 에 옮겨 적을 때
 * 그대로 쓰면 된다(`LOCAL_AXES` 참조).
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
  M1_TOP_5B,
  PYRAMID_SCAN,
  distinctLineCount,
  linearCoefficientPair,
  pageDigits,
  pairCount,
  possibleMedians,
  pyramidSideFromSkew,
  scaledOnce,
  skewPairCount,
  stemAndLeafPage,
} from "@/lib/middle/m1Top5b";
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
  obviousCandidates,
  pageNumbers,
} from "../../../scripts/qa/probe-middle-top-m1";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, numVowelFinal, pageSmells } from "../helpers/midPage";

const K69 = "1-2|위치 관계|69X";
const K70 = "1-2|기본 도형|70X";
const K71 = "1-1|문자의 사용과 식의 계산|71X";
const K72 = "1-2|도수분포표와 상대도수|72X";
const KEYS = [K69, K70, K71, K72] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K69]: "심화상",
  [K70]: "심화중",
  [K71]: "심화중",
  [K72]: "심화상",
};

/** 브리프가 갈래마다 준 변형 폭의 바닥. */
const VARIANT_FLOOR: Record<string, number> = {
  [K69]: 4,
  [K70]: 7,
  [K71]: 12,
  [K72]: 12,
};

const SEEDS = [20260903, 3, 11, 515151, 99991];
const VARIANTS = 4;
/** 판정기가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
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
const ENTRY = new Map(M1_TOP_5B.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차b ${key}`);
  assertChoiceCount(content, `중1 5차b ${key}`);
  assertChoiceMarks(content, `중1 5차b ${key}`);
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
 * 우리말 수사 — 생성기의 `koNum` 을 **여기 다시 적는다.**
 *
 * 🔴 가져다 쓰면 동어반복이라 아무것도 안 지킨다(4차 물결에서 그 변이가 92/92 초록이었다).
 */
const KO_WORD: Record<number, string> = {
  3: "삼",
  4: "사",
  5: "오",
  6: "육",
  7: "칠",
  8: "팔",
  9: "구",
  10: "십",
  11: "십일",
  12: "십이",
};

/**
 * 🔴 **수 뒤 주격 조사 「이/가」** — 공용 `josaMismatches` 가 **못 보는 사각**이다.
 * 그 자는 「이」를 넣지 않는다(서술격 「$5$이다」와 안 갈려 거짓 경보가 쏟아진다).
 * 받침 판정은 `midPage.numVowelFinal`(시험 쪽 규칙)에서 온다.
 */
function subjectJosaFor(n: number): "이" | "가" {
  return numVowelFinal(n) ? "가" : "이";
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
 * 지면 수식 한 도막을 **유리수로 계산한다.** 다루는 것: 정수 · 소수 · `+` · `-` ·
 * `\times` · `\div` · `\dfrac{}{}` · `()` · `^{k}`. 그 밖의 글자가 있으면 **던진다**.
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

// ═══════════════════════════════════════════════════════════
// 지면 읽기
// ═══════════════════════════════════════════════════════════

const RE69 =
  /^어떤 각뿔에서 밑면의 모서리 하나와 옆모서리 하나를 골라 짝을 지을 때, 두 모서리가 꼬인 위치에 있는 짝은 모두 \$(\d+)\$쌍이다\. 이 각뿔의 (모서리의 개수와 꼭짓점의 개수의 합|모서리의 개수|꼭짓점의 개수)(?:을|를) 구하시오\.$/;

const RE70 =
  /^어떤 평면 위에 점 \$(\d+)\$개가 찍혀 있다\. 그중 \$(\d+)\$개는 한 직선 위에 나란히 놓여 있고, 나머지는 어느 셋을 골라도 한 직선 위에 있지 않다\. (.+)$/;

const RE71 =
  /^두 자연수 \$a\$, \$b\$에 대하여 \$a\+b=(\d+)\$이다\. 다항식 \$\((\d+)a-(\d+)b\)x\^\{2\}\+\(a-b\)x\+(\d*)ab\$가 \$x\$에 대한 일차식일 때, 이 일차식의 (\$x\$의 계수와 상수항의 합|\$x\$의 계수|상수항)(?:을|를) 구하시오\.$/;

const RE72 =
  /^다음은 어느 반 학생 \$11\$명의 .+ 조사하여 나타낸 줄기와 잎 그림인데, 한 학생의 자료가 빠져 있다\. 빠진 학생의 자료가 십의 자리 숫자가 \$(\d+)\$인 자연수일 때, 이 반 학생 \$11\$명의 자료의 중앙값으로 가능한 값을 모두 구하여 그 합을 구하시오\.\n\(단위: .+\)\n\(줄기 \| 잎\)\n([\s\S]+)$/;

function read69(content: string): { k: number; ask: string } {
  const [k, ask] = grab(RE69, content, "69X");
  return { k: Number(k), ask: ask! };
}

function read70(content: string): { n: number; m: number; tail: string } {
  const [n, m, tail] = grab(RE70, content, "70X");
  return { n: Number(n), m: Number(m), tail: tail! };
}

function read71(content: string): {
  s: number;
  p: number;
  q: number;
  c: number;
  ask: string;
} {
  const [s, p, q, c, ask] = grab(RE71, content, "71X");
  return {
    s: Number(s),
    p: Number(p),
    q: Number(q),
    c: c === "" ? 1 : Number(c),
    ask: ask!,
  };
}

/** 줄기와 잎 그림을 **자료로 되돌린다** — 그림이 지면의 유일한 자료 출처다. */
function read72(content: string): { s: number; known: number[] } {
  const [s, plot] = grab(RE72, content, "72X");
  const known: number[] = [];
  for (const line of plot!.split("\n")) {
    const head = /^\$(\d+)\$ \| (.+)$/.exec(line);
    if (head === null) throw new Error(`72X 줄기 줄이 이상하다 — ${line}`);
    const stem = Number(head[1]);
    for (const leaf of [...head[2]!.matchAll(/\$(\d)\$/g)]) {
      known.push(stem * 10 + Number(leaf[1]));
    }
  }
  if (known.length !== 10) {
    throw new Error(`72X 그림의 자료가 $10$개가 아니다 — ${known.length}`);
  }
  return { s: Number(s), known };
}

// ═══════════════════════════════════════════════════════════
// 검산 — 생성기가 간 길을 한 번도 쓰지 않는다
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **정$n$각뿔을 좌표로 세워** 모서리 두 개가 꼬인 위치인지 **행렬식**으로 본다.
 *
 * 두 직선이 꼬인 위치 ⟺ 만나지도 평행하지도 않다 ⟺ 두 방향 벡터와 이음 벡터가
 * **한 평면에 없다**(세 벡터의 스칼라 삼중곱 $\ne0$). 생성기의 「끝 점을 지나는
 * $2$개는 만난다」는 규칙을 한 번도 안 쓴다.
 */
function skewPairsByGeometry(n: number): number {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    pts.push([
      Math.cos((2 * Math.PI * i) / n),
      Math.sin((2 * Math.PI * i) / n),
      0,
    ]);
  }
  const apex: [number, number, number] = [0, 0, 1];
  const base: [number, number][] = [];
  for (let i = 0; i < n; i += 1) base.push([i, (i + 1) % n]);
  let count = 0;
  for (let i = 0; i < n; i += 1) {
    for (const [j, k] of base) {
      const u = [
        apex[0] - pts[i]![0],
        apex[1] - pts[i]![1],
        apex[2] - pts[i]![2],
      ];
      const v = [
        pts[k]![0] - pts[j]![0],
        pts[k]![1] - pts[j]![1],
        pts[k]![2] - pts[j]![2],
      ];
      const w = [
        pts[j]![0] - pts[i]![0],
        pts[j]![1] - pts[i]![1],
        pts[j]![2] - pts[i]![2],
      ];
      const det =
        u[0]! * (v[1]! * w[2]! - v[2]! * w[1]!) -
        u[1]! * (v[0]! * w[2]! - v[2]! * w[0]!) +
        u[2]! * (v[0]! * w[1]! - v[1]! * w[0]!);
      if (Math.abs(det) > 1e-9) count += 1;
    }
  }
  return count;
}

/**
 * 🔴 **점을 좌표로 놓고** 두 점을 지나는 직선을 유리수로 정규화해 **세어** 본다.
 * $\binom n2-\binom m2+1$ 이라는 식을 한 번도 안 쓴다.
 *
 * 겹치는 $m$ 개는 $x$축 위 $(0,0)\dots(m-1,0)$, 나머지는 포물선 $y=x^{2}$ 위
 * $x=10,20,\dots$ 에 둔다. 「그 밖에는 어느 세 점도 한 직선 위에 없다」가 실제로
 * 참인지 **여기서 세어 확인**한다 — 아니면 던진다(모형이 발문과 다르면 검산이 거짓이다).
 */
function lineCountByCoordinates(
  n: number,
  m: number,
): {
  lines: number;
  segments: number;
} {
  const pts: [number, number][] = [];
  for (let i = 0; i < m; i += 1) pts.push([i, 0]);
  // ⚠️ 포물선 점을 **멀리** 둔다. $x=10k$ 로 두었더니 두 포물선 점을 잇는 직선이
  //    $x$축의 정수점 $(8,0)$ 을 지나 «뜻하지 않은 삼점공선»이 생겼다($n=14$·$m=9$).
  //    그 직선은 $y=0$ 을 $x=1000ij\div(i+j)$ 에서 지나므로 $666$ 보다 크고,
  //    겹치는 점은 $x\le m-1\le9$ 라 절대 안 만난다. 아래 삼점공선 세기가 그것을 잰다.
  for (let i = 0; i < n - m; i += 1) {
    const x = 1000 * (i + 1);
    pts.push([x, x * x]);
  }
  // 세 점이 한 직선 위인 자리가 뜻대로인가 — 겹치는 무리 안에서만이어야 한다.
  let triples = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      for (let k = j + 1; k < n; k += 1) {
        const [x1, y1] = pts[i]!;
        const [x2, y2] = pts[j]!;
        const [x3, y3] = pts[k]!;
        if ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) === 0) triples += 1;
      }
    }
  }
  const want = (m * (m - 1) * (m - 2)) / 6;
  if (triples !== want) {
    throw new Error(
      `좌표 모형이 발문과 다르다 — 삼점공선 ${triples} ≠ ${want}`,
    );
  }
  const seen = new Set<string>();
  let segments = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      segments += 1;
      const [x1, y1] = pts[i]!;
      const [x2, y2] = pts[j]!;
      // 직선 $Ax+By=C$ 를 정수로 정규화한다.
      let a = y2 - y1;
      let b = x1 - x2;
      let c = a * x1 + b * y1;
      const g = gcd2(gcd2(a, b), c) || 1;
      a /= g;
      b /= g;
      c /= g;
      if (a < 0 || (a === 0 && b < 0)) {
        a = -a;
        b = -b;
        c = -c;
      }
      seen.add(`${a}|${b}|${c}`);
    }
  }
  return { lines: seen.size, segments };
}

/**
 * 🔴 **$a$ 를 $1$ 부터 $S-1$ 까지 전부 넣어 본다** — 나눗셈을 한 번도 안 한다.
 * 짝이 정확히 하나가 아니면 던진다.
 */
function linearPairByBruteForce(
  p: number,
  q: number,
  s: number,
): [number, number] {
  const hits: [number, number][] = [];
  for (let a = 1; a <= s - 1; a += 1) {
    const b = s - a;
    if (p * a - q * b !== 0) continue;
    if (a - b === 0) continue; // $x$ 의 계수가 $0$ 이면 일차식이 아니다
    hits.push([a, b]);
  }
  if (hits.length !== 1) {
    throw new Error(`71X 짝이 하나가 아니다 — ${hits.length}개`);
  }
  return hits[0]!;
}

/**
 * 🔴 **여섯 번째 값을 «세기»로 고른다** — 정렬을 한 번도 안 쓴다.
 * (생성기와 `possibleMedians` 는 정렬로 고른다.)
 */
function sixthByCounting(values: readonly number[]): number {
  for (const v of values) {
    const less = values.filter((u) => u < v).length;
    const notMore = values.filter((u) => u <= v).length;
    if (less < 6 && 6 <= notMore) return v;
  }
  throw new Error("여섯 번째 값을 못 찾았다");
}

const VERIFY: Record<string, (content: string) => number> = {
  [K69]: (content) => {
    const { k, ask } = read69(content);
    const hits: number[] = [];
    for (let n = 3; n <= 40; n += 1) {
      if (skewPairsByGeometry(n) === k) hits.push(n);
    }
    if (hits.length !== 1)
      throw new Error(`69X 각뿔이 하나가 아니다 — ${hits}`);
    const n = hits[0]!;
    if (ask === "모서리의 개수") return 2 * n;
    if (ask === "꼭짓점의 개수") return n + 1;
    return 2 * n + (n + 1);
  },
  [K70]: (content) => {
    const { n, m, tail } = read70(content);
    if (m < 3 || m > n) throw new Error(`70X 겹침 수가 창 밖이다 — ${m}`);
    const { lines, segments } = lineCountByCoordinates(n, m);
    if (tail.startsWith("이 점들 가운데 둘을 지나는 직선을 모두 그었을 때"))
      return lines;
    if (tail.includes("뺀 값을 구하시오")) return segments - lines;
    if (tail.includes("더한 값을 구하시오")) return segments + lines;
    throw new Error(`70X 물음을 못 읽었다 — ${tail}`);
  },
  [K71]: (content) => {
    const { s, p, q, c, ask } = read71(content);
    const [a, b] = linearPairByBruteForce(p, q, s);
    const coef = a - b;
    const konst = c * a * b;
    if (ask === "상수항") return konst;
    if (ask === "$x$의 계수") return coef;
    return coef + konst;
  },
  [K72]: (content) => {
    const { s, known } = read72(content);
    const out = new Set<number>();
    for (let x = 10 * s; x <= 10 * s + 9; x += 1) {
      out.add(sixthByCounting([...known, x]));
    }
    if (out.size < 2)
      throw new Error("72X 중앙값이 하나뿐이라 «모두»가 무색하다");
    return [...out].reduce((u, v) => u + v, 0);
  },
};

/** 해설에 나와도 되는 수 — 「미설명 수 $0$」 검사가 쓴다. */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K69]: (content) => {
    const { k } = read69(content);
    const out = new Set<number>([0, 1, 2, 3]);
    for (const n of PYRAMID_SCAN) {
      out.add(n);
      out.add(skewPairsByGeometry(n));
    }
    out.add(k);
    for (let n = 3; n <= 40; n += 1) {
      if (skewPairsByGeometry(n) !== k) continue;
      out.add(n);
      out.add(2 * n);
      out.add(n + 1);
      out.add(3 * n + 1);
    }
    return out;
  },
  [K70]: (content) => {
    const { n, m } = read70(content);
    const { lines, segments } = lineCountByCoordinates(n, m);
    return new Set<number>([
      0,
      1,
      2,
      n,
      n - 1,
      m,
      m - 1,
      segments,
      pairCount(m),
      lines,
      segments - lines,
      segments + lines,
    ]);
  },
  [K71]: (content) => {
    const { s, p, q, c } = read71(content);
    const [a, b] = linearPairByBruteForce(p, q, s);
    return new Set<number>([
      0,
      1,
      2,
      c,
      p,
      q,
      s,
      p * s,
      p + q,
      a,
      b,
      Math.abs(a - b),
      c * a * b,
      Math.abs(a - b + c * a * b),
    ]);
  },
  [K72]: (content) => {
    const { s, known } = read72(content);
    const out = new Set<number>([1, 5, 6, 10, 11, s, 10 * s, 10 * s + 9]);
    for (const v of known) out.add(v);
    const meds = new Set<number>();
    for (let x = 10 * s; x <= 10 * s + 9; x += 1) {
      meds.add(sixthByCounting([...known, x]));
    }
    let sum = 0;
    for (const v of meds) {
      out.add(v);
      out.add(v + 1);
      out.add(v - 1);
      sum += v;
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
    key: K69,
    // 오각뿔: 옆모서리 $5$ 개마다 꼬인 밑면 모서리 $3$ 개 → $15$ 쌍. 모서리 $=10$.
    page:
      "어떤 각뿔에서 밑면의 모서리 하나와 옆모서리 하나를 골라 짝을 지을 때, " +
      "두 모서리가 꼬인 위치에 있는 짝은 모두 $15$쌍이다. 이 각뿔의 모서리의 개수를 구하시오.",
    want: 10,
  },
  {
    key: K70,
    // $\binom{12}2=66$, 겹침 $\binom52=10$ → $66-10+1=57$
    page:
      "어떤 평면 위에 점 $12$개가 찍혀 있다. 그중 $5$개는 한 직선 위에 나란히 놓여 있고, " +
      "나머지는 어느 셋을 골라도 한 직선 위에 있지 않다. " +
      "이 점들 가운데 둘을 지나는 직선을 모두 그었을 때, 서로 다른 직선은 모두 몇 개인지 구하시오.",
    want: 57,
  },
  {
    key: K71,
    // $2a=3b$, $a+b=10$ → $a=6$, $b=4$ → 상수항 $ab=24$
    page:
      "두 자연수 $a$, $b$에 대하여 $a+b=10$이다. " +
      "다항식 $(2a-3b)x^{2}+(a-b)x+ab$가 $x$에 대한 일차식일 때, " +
      "이 일차식의 상수항을 구하시오.",
    want: 24,
  },
  {
    key: K72,
    // 자료 $23,28,30,31,32,37,38,41,45,49$ · 다섯째 $32$ · 여섯째 $37$
    // → 중앙값은 $32$~$37$ 전부 → $32+33+34+35+36+37=207$
    page:
      "다음은 어느 반 학생 $11$명의 제기차기 기록을 조사하여 나타낸 줄기와 잎 그림인데, " +
      "한 학생의 자료가 빠져 있다. 빠진 학생의 자료가 십의 자리 숫자가 $3$인 자연수일 때, " +
      "이 반 학생 $11$명의 자료의 중앙값으로 가능한 값을 모두 구하여 그 합을 구하시오." +
      "\n(단위: 회)\n(줄기 | 잎)\n" +
      "$2$ | $3$ $8$\n$3$ | $0$ $1$ $2$ $7$ $8$\n$4$ | $1$ $5$ $9$",
    want: 207,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K69,
    page:
      "어떤 각뿔에서 밑면의 모서리 하나와 옆모서리 하나를 골라 짝을 지을 때, " +
      "두 모서리가 꼬인 위치에 있는 짝은 모두 $20$쌍이다. 이 각뿔의 모서리의 개수를 구하시오.",
    why: "$n\\times(n-2)=20$ 인 자연수 $n$ 이 없다 — 답이 아예 없는 발문이다",
  },
  {
    key: K69,
    page:
      "어떤 각뿔에서 밑면의 모서리와 옆모서리가 꼬인 위치에 있는 짝은 $35$쌍이다. " +
      "이 각뿔의 모서리의 개수를 구하시오.",
    why: "지면 모양이 다르다 — 파싱이 안 되면 조용히 넘기지 않고 던져야 한다",
  },
  {
    key: K70,
    page:
      "어떤 평면 위에 점 $12$개가 찍혀 있다. 그중 $2$개는 한 직선 위에 나란히 놓여 있고, " +
      "나머지는 어느 셋을 골라도 한 직선 위에 있지 않다. " +
      "이 점들 가운데 둘을 지나는 직선을 모두 그었을 때, 서로 다른 직선은 모두 몇 개인지 구하시오.",
    why: "두 점은 언제나 한 직선 위에 있다 — 「이 중 $2$개」는 조건이 아니다",
  },
  {
    key: K70,
    page:
      "어떤 평면 위에 점 $5$개가 찍혀 있다. 그중 $7$개는 한 직선 위에 나란히 놓여 있고, " +
      "나머지는 어느 셋을 골라도 한 직선 위에 있지 않다. " +
      "이 점들 가운데 둘을 지나는 직선을 모두 그었을 때, 서로 다른 직선은 모두 몇 개인지 구하시오.",
    why: "겹치는 점이 전체보다 많다",
  },
  {
    key: K71,
    page:
      "두 자연수 $a$, $b$에 대하여 $a+b=10$이다. " +
      "다항식 $(3a-3b)x^{2}+(a-b)x+ab$가 $x$에 대한 일차식일 때, " +
      "이 일차식의 상수항을 구하시오.",
    why: "$3a=3b$ 이면 $a=b$ 라 $x$ 의 계수가 $0$ — 일차식이 될 수 없다",
  },
  {
    key: K71,
    page:
      "두 자연수 $a$, $b$에 대하여 $a+b=11$이다. " +
      "다항식 $(2a-3b)x^{2}+(a-b)x+ab$가 $x$에 대한 일차식일 때, " +
      "이 일차식의 상수항을 구하시오.",
    why: "$a+b=11$ 은 $p+q=5$ 의 배수가 아니라 자연수 짝이 없다",
  },
  {
    key: K72,
    page:
      "다음은 어느 반 학생 $11$명의 제기차기 기록을 조사하여 나타낸 줄기와 잎 그림인데, " +
      "한 학생의 자료가 빠져 있다. 빠진 학생의 자료가 십의 자리 숫자가 $3$인 자연수일 때, " +
      "이 반 학생 $11$명의 자료의 중앙값으로 가능한 값을 모두 구하여 그 합을 구하시오." +
      "\n(단위: 회)\n(줄기 | 잎)\n" +
      "$2$ | $3$ $8$\n$3$ | $0$ $1$ $2$ $7$ $8$\n$4$ | $1$ $5$",
    why: "그림의 자료가 $9$개뿐이다 — 전체가 $11$ 이 아니다",
  },
  {
    key: K72,
    page:
      "다음은 어느 반 학생 $11$명의 제기차기 기록을 조사하여 나타낸 줄기와 잎 그림인데, " +
      "한 학생의 자료가 빠져 있다. 빠진 학생의 자료가 십의 자리 숫자가 $7$인 자연수일 때, " +
      "이 반 학생 $11$명의 자료의 중앙값으로 가능한 값을 모두 구하여 그 합을 구하시오." +
      "\n(단위: 회)\n(줄기 | 잎)\n" +
      "$2$ | $3$ $8$\n$3$ | $0$ $1$ $2$ $7$ $8$\n$4$ | $1$ $5$ $9$",
    why: "빠진 자료가 $70$대라 중앙값이 $37$ 하나로 굳는다 — 「모두」가 무색하다",
  },
];

describe("중1 5차b 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
      expect(() => VERIFY[key]!(page), `${key}: ${why}`).toThrow();
    }
  });

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·소수·못 읽음을 각각 가른다", () => {
    expect(arithmeticEquationFailures("$2\\times7=14$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$2\\times7=15$이다.")).toHaveLength(1);
    expect(arithmeticEquationFailures("$66-10+1=57$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$66-10+1=58$이다.")).toHaveLength(1);
    // 글자가 섞이면 판정하지 않는다(거짓 빨강 금지).
    expect(arithmeticEquationFailures("$a=42-b$이다.")).toEqual([]);
    // 분수도 실제로 계산한다.
    expect(arithmeticEquationFailures("$\\dfrac{6}{4}=\\dfrac{3}{2}$")).toEqual(
      [],
    );
  });

  it("🔴 기약 검사기가 살아 있다 — 기약이 아닌 분수를 실제로 잡는다", () => {
    // 이 갈래의 지면에는 분수가 한 자리도 없다. 그러면 「분수가 다 기약이다」는
    // 구조적으로 0이므로, 자가 «아니오» 를 낼 수 있음을 여기서 따로 보인다.
    const found = numericFractions("$\\dfrac{6}{4}$와 $\\dfrac{3}{2}$");
    expect(found).toEqual([
      [6, 4],
      [3, 2],
    ]);
    expect(gcd2(6, 4)).not.toBe(1);
    expect(gcd2(3, 2)).toBe(1);
  });

  it("🔴 우리말 수사 표가 생성기 것과 **다른 벌**이다 — 가져다 쓰면 동어반복이다", () => {
    expect(KO_WORD[7]).toBe("칠");
    expect(KO_WORD[12]).toBe("십이");
    expect(Object.keys(KO_WORD)).toHaveLength(10);
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조 (㉡ · ㉷)
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`skewPairCount` 가 좌표 기하와 맞는다 (양성 · 순증가)", () => {
    for (let n = 3; n <= 20; n += 1) {
      expect(skewPairCount(n), `n=${n}`).toBe(skewPairsByGeometry(n));
      expect(skewPairCount(n)).toBeGreaterThan(
        skewPairCount(n - 1 < 3 ? 3 : n - 1) - 1,
      );
    }
    for (let n = 4; n <= 20; n += 1) {
      expect(skewPairCount(n)).toBeGreaterThan(skewPairCount(n - 1));
    }
    expect(() => skewPairCount(2)).toThrow();
  });

  it("🔴 음성 대조 — `pyramidSideFromSkew` 는 답이 없는 수에 `null` 을 낸다", () => {
    // 「0 이 «깨끗»인지 «못 셈»인지」를 가른다 — 늘 값을 내는 자였다면 여기서 걸린다.
    expect(pyramidSideFromSkew(20)).toBeNull();
    expect(pyramidSideFromSkew(1)).toBeNull();
    expect(pyramidSideFromSkew(63)).toBe(9);
    // 훑는 자리 밖이면 값이 있어도 못 찾는다 — 그 사실을 못 박는다.
    expect(skewPairCount(14)).toBe(168);
    expect(pyramidSideFromSkew(168)).toBeNull();
  });

  it("`distinctLineCount` 가 좌표 세기와 맞는다", () => {
    for (let n = 5; n <= 14; n += 1) {
      for (let m = 3; m <= n - 1; m += 1) {
        expect(distinctLineCount(n, m), `n=${n} m=${m}`).toBe(
          lineCountByCoordinates(n, m).lines,
        );
      }
    }
  });

  it("🔴 음성 대조 — 겹침이 $2$ 이면 굳힘이 «아무것도 안 한다»", () => {
    // $\binom22=1$ 이라 빼고 더한 것이 서로 지워져 «겹침이 없는 경우»와 값이 같다.
    // 굳힘 인자를 흔들어도 답이 그대로인 자리가 실재한다는 증거다 — 그래서 창에서 뺐다.
    for (let n = 6; n <= 12; n += 1) {
      expect(distinctLineCount(n, 2)).toBe(pairCount(n));
    }
    expect(() => distinctLineCount(10, 1)).toThrow();
    expect(() => distinctLineCount(10, 11)).toThrow();
  });

  it("`linearCoefficientPair` 가 전수 탐색과 맞는다", () => {
    for (const [p, q] of [
      [2, 3],
      [3, 2],
      [4, 5],
      [5, 4],
      [2, 9],
    ] as const) {
      for (let t = 2; t <= 7; t += 1) {
        const s = (p + q) * t;
        expect(linearCoefficientPair(p, q, s), `${p}/${q}/${s}`).toEqual(
          linearPairByBruteForce(p, q, s),
        );
      }
    }
  });

  it("🔴 음성 대조 — $p=q$ 이면 굳힘이 **스스로를 무너뜨린다**", () => {
    // $a=b$ 라 $x$ 의 계수가 $0$ 이 되어 일차식이 아니게 된다.
    expect(linearCoefficientPair(3, 3, 10)).toEqual([5, 5]);
    expect(() => linearPairByBruteForce(3, 3, 10)).toThrow();
    // $S$ 가 $p+q$ 의 배수가 아니면 자연수 짝이 없다.
    expect(() => linearCoefficientPair(2, 3, 11)).toThrow();
  });

  it("`possibleMedians` 가 «세기» 방식과 맞는다", () => {
    const known = [23, 28, 30, 31, 32, 37, 38, 41, 45, 49];
    const byCounting = new Set<number>();
    for (let x = 30; x <= 39; x += 1) {
      byCounting.add(sixthByCounting([...known, x]));
    }
    expect(possibleMedians(known, 30, 39)).toEqual(
      [...byCounting].sort((a, b) => a - b),
    );
    expect(possibleMedians(known, 30, 39)).toEqual([32, 33, 34, 35, 36, 37]);
  });

  it("🔴 음성 대조 — 창이 자료 밖이면 중앙값이 **하나로 굳는다**", () => {
    const known = [23, 28, 30, 31, 32, 37, 38, 41, 45, 49];
    // $70$대는 전부 여섯째 값을 $37$ 로 만든다 — 견줄 것이 하나도 없다.
    expect(possibleMedians(known, 70, 79)).toEqual([37]);
    // 전체가 짝수면 이 유형의 지면이 성립하지 않는다.
    expect(() => possibleMedians([1, 2, 3], 1, 2)).toThrow();
  });

  it("`scaledOnce`·`pageDigits` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect(scaledOnce(24).has(12)).toBe(true);
    expect(scaledOnce(24).has(13)).toBe(false);
    // 🔴 부호를 함께 읽는다 — 그것이 `71X` 의 구멍을 막은 열쇠다.
    expect(pageDigits("$(2a-5b)x^{2}$")).toEqual([2, -5, 2]);
    expect(pageDigits("$a+b=42$")).toEqual([42]);
  });

  it("`stemAndLeafPage` 가 형제 유형(`m1Extra`)과 **같은 줄 모양**이다", () => {
    // 같은 소단원 형제와 지면이 갈리면 원장님이 종이에서 두 모양을 보신다.
    expect(stemAndLeafPage([23, 28, 31, 32, 45])).toBe(
      "$2$ | $3$ $8$\n$3$ | $1$ $2$\n$4$ | $5$",
    );
    const sibling = generateMiddleProblem("1-2|도수분포표와 상대도수|20", 7, 0);
    expect(sibling.content).toContain("(줄기 | 잎)");
    expect(sibling.content).toMatch(/\$\d+\$ \| \$\d\$/);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5B).toHaveLength(4);
    expect(M1_TOP_5B.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_5B.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5B) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), `${e.key}`).toBeNull();
    }
    expect(M1_TOP_5B.map((e) => e.rpmType)).toEqual([
      "69X",
      "70X",
      "71X",
      "72X",
    ]);
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    // ⚠️ 「일차식의 뜻Ⅰ」의 `Ⅰ` 은 로마 숫자 U+2160 이다 — 라틴 `I` 와 눈으로 안 갈린다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5B) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    expect(M1_TOP_5B.map((e) => e.unitSection)).toEqual([
      "두 직선의 위치 관계",
      "점, 선, 면",
      "일차식의 뜻Ⅰ",
      "줄기와 잎 그림",
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

describe("중1 5차b 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
  });

  for (const e of M1_TOP_5B) {
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

      it("🔴 공용 조사 자가 이 유형에서 **구조적으로 0 이 아니다** — 판마다 읽는 자리가 있다", () => {
        // 3차의 한 유형은 수식이 `)` 로 끝나 조사 자가 800/800 을 건너뛰었다.
        // 「어긋남 0」이 «깨끗»인지 «못 셈»인지 여기서 가른다.
        let sites = 0;
        const sample = BULK.slice(0, 40);
        for (const [seed, v] of sample) {
          const p = build(e.key, seed, v);
          // **수로 끝나는** 수식 뒤의 조사만 센다 — 그 자만이 판정할 수 있는 자리다.
          sites += [
            ...`${p.content}\n${p.solution}`.matchAll(
              /\$([^$]*\d)\$(을|를|은|는|와|과|가)/g,
            ),
          ].length;
        }
        expect(sites).toBeGreaterThanOrEqual(sample.length);
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
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 둘 이상**을 요구한다.
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

      it("🔴 지면에 분수가 한 자리도 없다 (㉰ — 그래서 기약 문제가 구조적으로 안 난다)", () => {
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
        // 「0」을 «깨끗»으로 읽지 않기 위해, 이 갈래에 분수가 **없다**는 사실을 못 박는다
        // (자가 살아 있음은 위 눈금이 손으로 쓴 분수로 따로 보였다).
        expect(seen).toBe(0);
      });

      it("🔴 ㉱ 발문이 상한을 선언하지 않는다 — 공용 `declaredUpperBound` 가 `null`", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(
            declaredUpperBound(p.content),
            `${e.key} ${seed}/${v}`,
          ).toBeNull();
        }
        // 그 자가 살아 있는지 — 상한을 선언한 글에는 값을 낸다.
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

      it("🔴 변형 폭 — 브리프의 바닥을 넘는다 (같은 씨앗 · 660판 둘 다)", () => {
        const floor = VARIANT_FLOOR[e.key]!;
        // ⑴ 같은 씨앗에서 `variant` 를 $0$..floor$-1$ 로 돌린다.
        for (const seed of SEEDS) {
          const seen = new Set<string>();
          for (let v = 0; v < floor; v += 1)
            seen.add(build(e.key, seed, v).content);
          expect(seen.size, `${e.key} 씨앗 ${seed}`).toBeGreaterThanOrEqual(
            floor,
          );
        }
        // ⑵ 660판 전체 — 창이 실제로 얼마나 넓은지도 같이 찍는다.
        const all = new Set<string>();
        for (const [s, v] of WIDE) all.add(build(e.key, s, v).content);
        expect(all.size).toBeGreaterThanOrEqual(floor);
      });

      it("🔴 정답 쏠림 — 660판에서 최빈 정답이 12% 미만이다", () => {
        const count = new Map<number, number>();
        for (const [s, v] of WIDE) {
          const a = answerNumber(build(e.key, s, v).answer);
          count.set(a, (count.get(a) ?? 0) + 1);
        }
        const total = WIDE.length;
        const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]!;
        expect(
          top[1] / total,
          `${e.key} 최빈 정답 $${top[0]}$ ${((top[1] / total) * 100).toFixed(2)}%`,
        ).toBeLessThan(0.12);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — 「이/가」 자리를 직접 잰다 (공용 자의 사각)", () => {
  it("🔴 660판 전량에서 맞고, **어느 유형이 구조적으로 0인지**까지 찍는다", () => {
    // 공용 `josaMismatches` 는 「이」를 아예 안 본다(서술격 「$5$이다」와 안 갈려
    // 거짓 경보가 쏟아진다 — 그 파일 주석에 적혀 있다). 그래서 「가를 써야 할 자리에
    // 이를 썼다」는 그 자에서 **구조적으로 0**이다. 여기서 자리를 못 박아 메운다.
    const sites: Record<string, number> = {};
    for (const key of KEYS) {
      let n = 0;
      for (const [seed, v] of WIDE) {
        const p = build(key, seed, v);
        const both = `${p.content}\n${p.solution}`;
        for (const m of both.matchAll(/\$([^$]*?)(\d+)\$(이|가) /g)) {
          n += 1;
          expect(m[3], `${key} ${seed}/${v} — ${m[0]}`).toBe(
            subjectJosaFor(Number(m[2])),
          );
        }
      }
      sites[key] = n;
    }
    // 🔴 「어긋남 0」이 «깨끗»인지 «못 셈»인지 가른다. 이 갈래에서 그 자리는
    //    `71X` 의 「$0$이 아니므로」 **하나뿐**이고 나머지 셋은 **구조적으로 0**이다
    //    (수 뒤에 「이/가」가 오고 그다음이 띄어쓰기인 문형을 안 쓴다).
    expect(sites[K71]).toBe(WIDE.length);
    expect(sites[K69]).toBe(0);
    expect(sites[K70]).toBe(0);
    expect(sites[K72]).toBe(0);
    // 판정기 자체가 살아 있는가 — 틀린 조사를 실제로 가른다.
    expect(subjectJosaFor(5)).toBe("가");
    expect(subjectJosaFor(3)).toBe("이");
  });
});

describe("중1 5차b 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`69X` — 살아남는 자리가 씨앗을 가로질러 갈리고, **뒤에도 후보가 남는다**", () => {
    // 「찾는 즉시 멈추기」였다면 살아남는 후보가 언제나 목록의 **마지막**이 된다.
    const spots = new Set<number>();
    for (const [s, v] of WIDE) {
      const p = build(K69, s, v);
      const { k } = read69(p.content);
      const idx = PYRAMID_SCAN.findIndex((n) => skewPairsByGeometry(n) === k);
      expect(idx).toBeGreaterThanOrEqual(0);
      spots.add(idx + 1);
      // 살아남은 것 뒤에도 실제로 후보가 남아 있다(마지막 자리가 아니다).
      expect(idx).toBeLessThan(PYRAMID_SCAN.length - 1);
    }
    expect(spots.size).toBeGreaterThanOrEqual(6);
    expect(Math.min(...spots)).toBe(3);
    expect(Math.max(...spots)).toBe(10);
  });

  it("`72X` — 세 무리가 **전부** 살아 있고 가운데 무리의 크기가 갈린다", () => {
    const widths = new Set<number>();
    for (const [s, v] of WIDE) {
      const p = build(K72, s, v);
      const { s: stem, known } = read72(p.content);
      const lo = 10 * stem;
      const hi = lo + 9;
      let below = 0;
      let above = 0;
      let inside = 0;
      const sorted = [...known].sort((a, b) => a - b);
      for (let x = lo; x <= hi; x += 1) {
        const sixth = sixthByCounting([...known, x]);
        if (sixth === sorted[4]) below += 1;
        else if (sixth === sorted[5]) above += 1;
        else inside += 1;
      }
      expect(below, "«$x$ 가 작을 때» 무리가 비었다").toBeGreaterThan(0);
      expect(above, "«$x$ 가 클 때» 무리가 비었다").toBeGreaterThan(0);
      expect(inside, "«$x$ 자신이 중앙값» 무리가 비었다").toBeGreaterThan(0);
      widths.add(inside);
    }
    expect(widths.size).toBeGreaterThanOrEqual(3);
  });

  it("`70X`·`71X` — **해당 없음**: 후보 목록이 없다(값이 하나로 굳는다)", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다 — 그 사실을 여기서 찍는다.
    // 둘 다 굳힘 한 줄이 후보를 **만들기 전에** 값을 정한다. 대신 굳힘을 지운 답이
    // 참 답과 갈리는지를 아래 ㉡ 에서 잰다.
    const p70 = build(K70, SEEDS[0]!);
    const p71 = build(K71, SEEDS[0]!);
    expect(LOCAL_AXES[K70]!.candidateCount(p70.facts)).toBeNull();
    expect(LOCAL_AXES[K71]!.candidateCount(p71.facts)).toBeNull();
    expect(LOCAL_AXES[K69]!.candidateCount(build(K69, SEEDS[0]!).facts)).toBe(
      PYRAMID_SCAN.length,
    );
    expect(LOCAL_AXES[K72]!.candidateCount(build(K72, SEEDS[0]!).facts)).toBe(
      10,
    );
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 판정기 축을 여기 미리 둔다 (리드가 `AXES` 로 옮긴다)
// ═══════════════════════════════════════════════════════════

type LocalAxis = {
  /** 견줄 후보가 몇 개인가 — 후보 목록이 없으면 `null`. */
  candidateCount: (f: Record<string, number>) => number | null;
  /** 굳힘을 **지운** 사람이 낼 답 — 없으면 `null`. */
  withoutBinding: (f: Record<string, number>) => number | null;
  /** 굳힘 인자를 **흔든** 답 — 늘 참 답과 달라야 한다. */
  perturbed: (f: Record<string, number>) => number;
};

const LOCAL_AXES: Record<string, LocalAxis> = {
  [K69]: {
    candidateCount: () => PYRAMID_SCAN.length,
    // 굳힘(꼬인 짝의 수 ↔ 밑면의 변의 수)을 지우면 발문의 수를 그대로 답으로 쓴다.
    withoutBinding: (f) => f.k!,
    // 밑면을 한 칸 흔들면 답이 달라져야 한다. 분기는 `facts.ask` 로 가른다 —
    // 값으로 되짚으면 두 물음의 답이 우연히 같을 때 엉뚱한 가지를 탄다.
    perturbed: (f) => {
      const n = f.n! + 1;
      if (f.ask === 0) return 2 * n;
      if (f.ask === 1) return n + 1;
      return 3 * n + 1;
    },
  },
  [K70]: {
    candidateCount: () => null,
    // 「겹치는 $m$ 개도 저마다 다른 직선을 만든다」고 본 답.
    withoutBinding: (f) => {
      const c = f.c!;
      if (f.ask === 0) return c;
      if (f.ask === 1) return 0;
      return 2 * c;
    },
    // 겹침을 한 칸 흔들면 답이 달라져야 한다.
    perturbed: (f) => {
      const m = f.m! + 1;
      const c = f.c!;
      const lines = c - pairCount(m) + 1;
      if (f.ask === 0) return lines;
      if (f.ask === 1) return c - lines;
      return c + lines;
    },
  },
  [K71]: {
    candidateCount: () => null,
    // 「$x^{2}$ 의 계수를 $0$ 으로」를 안 세우고 $a=b$ 로 본 답(합만 보고 반씩 나눔).
    withoutBinding: (f) => {
      const half = f.s! / 2;
      if (!Number.isInteger(half)) return null;
      const konst = f.c! * half * half;
      if (f.ask === 1) return 0;
      return konst;
    },
    // 합을 다음 배수로 흔들면 짝이 달라져야 한다.
    perturbed: (f) => {
      const s = f.s! + (f.p! + f.q!);
      const [a, b] = linearCoefficientPair(f.p!, f.q!, s);
      const coef = a - b;
      const konst = f.c! * a * b;
      if (f.ask === 0) return konst;
      if (f.ask === 1) return coef;
      return coef + konst;
    },
  },
  [K72]: {
    candidateCount: () => 10,
    // 「가능한 중앙값은 다섯째와 여섯째 둘뿐」이라고 본 답.
    withoutBinding: (f) => f.v5! + f.v6!,
    // 여섯째 값을 한 칸 흔들면 합이 달라져야 한다.
    perturbed: (f) => {
      let sum = 0;
      for (let v = f.v5!; v <= f.v6! - 1; v += 1) sum += v;
      return sum;
    },
  },
};

describe("중1 5차b 확대 갈래 — ㉡ 굳힘이 항등식인가 (리드가 `AXES` 로 옮길 축)", () => {
  for (const key of KEYS) {
    it(`${key.split("|")[2]} — 굳힘을 지운 답 $0$% · 흔들면 늘 달라진다 (220판)`, () => {
      const axis = LOCAL_AXES[key]!;
      let noBind = 0;
      let same = 0;
      let checked = 0;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const want = answerNumber(p.answer);
        const wb = axis.withoutBinding(p.facts);
        if (wb !== null && wb === want) noBind += 1;
        const got = axis.perturbed(p.facts);
        expect(Number.isFinite(got), `${key} 흔든 답이 수가 아니다`).toBe(true);
        if (got === want) same += 1;
        checked += 1;
      }
      expect(checked).toBe(220);
      expect(noBind, `${key} 굳힘을 지운 답이 참 답과 같다`).toBe(0);
      expect(same, `${key} 굳힘을 흔들어도 답이 그대로다`).toBe(0);
    });
  }

  it("🔴 그 축이 «예»도 낼 수 있다 — 흔들지 않으면 반드시 같다 (음성 대조)", () => {
    // 흔든 값이 «늘 다르다»만 재면 「축이 늘 이상한 값을 낸다」도 통과한다.
    for (const key of KEYS) {
      const p = build(key, SEEDS[0]!);
      const axis = LOCAL_AXES[key]!;
      const same = { ...p.facts };
      // 흔들기의 인자를 **되돌려** 주면 참 답이 나와야 한다.
      if (key === K69) same.n = p.facts.n! - 1;
      if (key === K70) same.m = p.facts.m! - 1;
      if (key === K71) same.s = p.facts.s! - (p.facts.p! + p.facts.q!);
      if (key === K72) same.v6 = p.facts.v6! + 1;
      expect(axis.perturbed(same), `${key} 되돌린 축`).toBe(
        answerNumber(p.answer),
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 나열 줄을 한 줄씩 다시 셈한다 (㉴ 포함)
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`69X` — 훑은 목록이 지면의 약속과 정확히 같다 (㉴)", () => {
    for (const [s, v] of WIDE) {
      const p = build(K69, s, v);
      const [first, last] = grab(
        /\$n=(\d+)\$부터 \$n=(\d+)\$까지 차례로 넣으면 그 값은 (.+)이다\./,
        p.solution,
        "69X 훑기",
      ) as [string, string];
      const listed = [
        ...grab(
          /차례로 넣으면 그 값은 (.+)이다\./,
          p.solution,
          "69X 목록",
        )[0]!.matchAll(/\$(\d+)\$/g),
      ].map((m) => Number(m[1]));
      // 지면이 「$a$부터 $b$까지」라고 적었으면 **정확히 그 개수**가 찍혀야 한다.
      expect(listed).toHaveLength(Number(last) - Number(first) + 1);
      const want: number[] = [];
      for (let n = Number(first); n <= Number(last); n += 1) {
        want.push(skewPairsByGeometry(n));
      }
      expect(listed).toEqual(want);
      // 그 뒤 줄이 그 제약 안에 있는가 — 「$b$보다 크면」의 값이 목록의 끝이어야 한다.
      const tail = grab(
        /\$n\$이 \$(\d+)\$보다 크면 그 값은 \$(\d+)\$보다 크므로/,
        p.solution,
        "69X 끝",
      );
      expect(Number(tail[0])).toBe(Number(last));
      expect(Number(tail[1])).toBe(want[want.length - 1]);
      // 밑면의 한글 수사가 실제 $n$ 과 맞는가.
      const gon = grab(
        /따라서 밑면은 (.+?)각형이므로/,
        p.solution,
        "69X 밑면",
      )[0]!;
      const hit = want.indexOf(read69(p.content).k) + Number(first);
      expect(gon).toBe(KO_WORD[hit]);
    }
  });

  it("`70X` — 세 줄의 셈이 좌표 세기와 맞는다", () => {
    for (const [s, v] of BULK) {
      const p = build(K70, s, v);
      const { n, m } = read70(p.content);
      const { lines, segments } = lineCountByCoordinates(n, m);
      const a = grab(
        /방법의 수는 \$(\d+)\\times(\d+)\\div2=(\d+)\$이다\./,
        p.solution,
        "70X 첫 줄",
      ).map(Number);
      expect(a[0]).toBe(n);
      expect(a[1]).toBe(n - 1);
      expect(a[2]).toBe(segments);
      const b = grab(
        /점에서 두 점을 고르는 방법의 수 \$(\d+)\\times(\d+)\\div2=(\d+)\$만큼의/,
        p.solution,
        "70X 겹침 줄",
      ).map(Number);
      expect(b[0]).toBe(m);
      expect(b[1]).toBe(m - 1);
      expect(b[2]).toBe(pairCount(m));
      const c = grab(
        /직선의 개수는 \$(\d+)\$에서 \$(\d+)\$(?:을|를) 빼고 \$1\$을 더한 \$(\d+)-(\d+)\+1=(\d+)\$이다\./,
        p.solution,
        "70X 마무리",
      ).map(Number);
      expect(c[0]).toBe(segments);
      expect(c[1]).toBe(pairCount(m));
      expect(c[4]).toBe(lines);
    }
  });

  it("`71X` — 굳힘 줄과 확인 줄이 전수 탐색과 맞는다", () => {
    for (const [s, v] of BULK) {
      const p = build(K71, s, v);
      const { s: sum, p: pp, q: qq, c } = read71(p.content);
      const [a, b] = linearPairByBruteForce(pp, qq, sum);
      const g = grab(
        /\$x\^\{2\}\$의 계수가 \$0\$이어야 하므로 \$(\d+)a-(\d+)b=0\$, 곧 \$(\d+)a=(\d+)b\$이다\./,
        p.solution,
        "71X 굳힘",
      ).map(Number);
      expect(g).toEqual([pp, qq, pp, qq]);
      const d = grab(
        /\$(\d+)\$(?:을|를) \$(\d+)\$(?:로|으로) 나누면 \$b=(\d+)\$이고, \$a\$의 값은 \$(\d+)-(\d+)=(\d+)\$이다\./,
        p.solution,
        "71X 풀이",
      ).map(Number);
      expect(d[0]).toBe(pp * sum);
      expect(d[1]).toBe(pp + qq);
      expect(d[2]).toBe(b);
      expect(d[5]).toBe(a);
      const k = grab(
        /\$x\$의 계수 \$a-b\$의 값은 \$(\d+)-(\d+)=(-?\d+)\$이고 \$0\$이 아니므로/,
        p.solution,
        "71X 확인",
      ).map(Number);
      expect(k[2]).toBe(a - b);
      expect(k[2]).not.toBe(0);
      const kk = grab(
        c === 1
          ? /상수항 \$ab\$의 값은 \$(\d+)\\times(\d+)=(\d+)\$이다\./
          : /상수항 \$\d+ab\$의 값은 \$(\d+)\\times(\d+)\\times(\d+)=(\d+)\$이다\./,
        p.solution,
        "71X 상수항",
      ).map(Number);
      expect(kk[kk.length - 1]).toBe(c * a * b);
    }
  });

  it("`72X` — 세 무리의 범위가 지면의 약속과 맞고 합집합이 창 전체다 (㉴)", () => {
    for (const [s, v] of WIDE) {
      const p = build(K72, s, v);
      const { s: stem, known } = read72(p.content);
      const lo = 10 * stem;
      const hi = lo + 9;
      const head = grab(
        /\$x\$는 십의 자리 숫자가 \$(\d+)\$인 자연수이므로 \$(\d+)\$ 이상 \$(\d+)\$ 이하이다\. 곧 \$x\$가 될 수 있는 값은 모두 \$\d+-\d+\+1=10\$개이다\./,
        p.solution,
        "72X 창",
      ).map(Number);
      expect(head).toEqual([stem, lo, hi]);
      const g1 = grab(
        /이때 \$x\$는 \$(\d+)\$부터 \$(\d+)\$까지이다\.\n/,
        p.solution,
        "72X 첫 무리",
      ).map(Number);
      const ranges = [
        ...p.solution.matchAll(
          /이때 \$x\$는 \$(\d+)\$부터 \$(\d+)\$까지이다\./g,
        ),
      ].map((m) => [Number(m[1]), Number(m[2])] as const);
      expect(ranges).toHaveLength(3);
      expect(g1[0]).toBe(lo);
      // 세 무리의 합집합이 **정확히** 창 전체여야 한다 — 빈틈도 겹침도 없다.
      const covered = new Set<number>();
      for (const [a, b] of ranges) {
        for (let x = a; x <= b; x += 1) {
          expect(covered.has(x), `72X 무리가 겹친다 — $${x}$`).toBe(false);
          covered.add(x);
        }
      }
      expect([...covered].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 10 }, (_, i) => lo + i),
      );
      // 무리마다 여섯 번째 값이 지면이 적은 그대로인가.
      const sorted = [...known].sort((a, b) => a - b);
      for (let x = ranges[0]![0]; x <= ranges[0]![1]; x += 1) {
        expect(sixthByCounting([...known, x])).toBe(sorted[4]);
      }
      for (let x = ranges[1]![0]; x <= ranges[1]![1]; x += 1) {
        expect(sixthByCounting([...known, x])).toBe(sorted[5]);
      }
      for (let x = ranges[2]![0]; x <= ranges[2]![1]; x += 1) {
        expect(sixthByCounting([...known, x])).toBe(x);
      }
    }
  });

  it("🔴 ㉵ `72X` 의 빠진 값이 그림 안에 **자리를 차지하지 않는다**", () => {
    // 줄기와 잎 그림은 정의상 크기순이라 «섞는다»는 처방을 쓸 수 없다. 대신
    // 암시할 자리를 없앴다 — 그림의 잎은 늘 $10$ 개이고 빠진 값은 말로만 주어진다.
    for (const [s, v] of WIDE) {
      const p = build(K72, s, v);
      const { known } = read72(p.content);
      expect(known).toHaveLength(10);
      // 빈칸·물음표·네모 따위로 자리를 잡아 두면 그것이 순위를 암시한다.
      expect(p.content).not.toMatch(/□|\?|◯|_{2,}/);
      // 그림에 찍힌 잎의 개수가 자료 수와 같다(자리를 비워 두지 않았다).
      const leaves = [...p.content.matchAll(/\$\d\$/g)].length;
      expect(leaves).toBeGreaterThanOrEqual(10);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나 (㉮)
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
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
    for (const e of M1_TOP_5B) {
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

  it("🔴 `71X` 의 상수항 상한이 산출물에 실제로 걸린다 — 그 상한이 곧 지면의 자릿수다", () => {
    // 🔴 이 검사는 **변이가 찾아냈다.** 모듈에서 `konst > 600` 을 지워도 어떤 시험도
    //    안 물어서 「초록 ← 가드가 아니다」가 나왔다. 그 상한은 D-20 원장에서
    //    1236판을 깎는 가장 큰 손실인데, 정작 «지금 지면이 그 안에 있는가»를
    //    아무도 안 재고 있었다(단언을 적었으면 시험이 물게 하라).
    let maxKonst = 0;
    let minKonst = Number.POSITIVE_INFINITY;
    for (const [s, v] of WIDE) {
      const f = build(K71, s, v).facts;
      expect(
        f.konst,
        `71X 상수항이 상한을 넘었다 — ${s}/${v}`,
      ).toBeLessThanOrEqual(600);
      maxKonst = Math.max(maxKonst, f.konst!);
      minKonst = Math.min(minKonst, f.konst!);
    }
    // 상한이 **실제로 닿는가** — 안 닿으면 그 상한은 장식이고, 창을 넓혀도 아무 일이 없다.
    expect(maxKonst).toBe(600);
    expect(minKonst).toBeLessThan(100);
  });

  it("🔴 `69X` 의 훑는 자리 상한이 산출물에 실제로 걸린다 — 그 상한이 곧 해설 높이다", () => {
    expect(PYRAMID_SCAN).toHaveLength(11);
    expect(PYRAMID_SCAN[PYRAMID_SCAN.length - 1]).toBe(13);
    for (const [s, v] of WIDE.slice(0, 60)) {
      const p = build(K69, s, v);
      const listed = [
        ...grab(
          /차례로 넣으면 그 값은 (.+)이다\./,
          p.solution,
          "69X 목록",
        )[0]!.matchAll(/\$(\d+)\$/g),
      ];
      expect(listed).toHaveLength(PYRAMID_SCAN.length);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 🔴 ㉶ D-20 손실 원장 — 창을 전수로 열거해 **다시 센다**
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — ㉶ D-20 손실 원장이 재현된다", () => {
  /**
   * ⚠️ 창은 모듈 안 상수라 여기서 **다시 적는다.** 그래서 「그 창이 정말 이것인가」를
   *    660판 산출물로 먼저 확인한다 — 창이 넓어지면 산출물이 이 범위를 벗어나 빨개진다.
   *    (판 수와 답 수의 측정점을 **같은 자리**, 곧 창 전수 열거에 맞춰 둔다.)
   */
  it("`69X` — 창 24 → 20 (−4) · 서로 다른 답 20 → 18", () => {
    const sides = new Set<number>();
    for (const [s, v] of WIDE) sides.add(build(K69, s, v).facts.n!);
    expect([...sides].sort((a, b) => a - b)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12,
    ]);

    const asks: [string, "을" | "를", (n: number) => number][] = [
      ["모서리의 개수", "를", (n) => 2 * n],
      ["꼭짓점의 개수", "를", (n) => n + 1],
      ["모서리의 개수와 꼭짓점의 개수의 합", "을", (n) => 3 * n + 1],
    ];
    let all = 0;
    let byScaled = 0;
    let byPage = 0;
    const kept: number[] = [];
    const every: number[] = [];
    for (let n = 5; n <= 12; n += 1) {
      for (const [ask, josa, f] of asks) {
        all += 1;
        const k = skewPairCount(n);
        const x = f(n);
        every.push(x);
        // 모듈이 가드를 **거는 차례 그대로** 센다.
        if (scaledOnce(k).has(x)) {
          byScaled += 1;
          continue;
        }
        const page =
          `어떤 각뿔에서 밑면의 모서리 하나와 옆모서리 하나를 골라 짝을 지을 때, ` +
          `두 모서리가 꼬인 위치에 있는 짝은 모두 $${k}$쌍이다. 이 각뿔의 ${ask}${josa} 구하시오.`;
        if (pageShortcutValues(pageDigits(page)).has(x)) {
          byPage += 1;
          continue;
        }
        kept.push(x);
      }
    }
    expect(all).toBe(24);
    expect(byScaled).toBe(4);
    // 🔴 「$0$건」이 «깨끗»인지 «못 셈»인지 가른다 — 이 자는 지면의 수가 $k$ 하나라
    //    구조적으로 거의 못 막는다. 그 사실을 수로 찍어 둔다.
    expect(byPage).toBe(0);
    expect(kept).toHaveLength(20);
    expect(new Set(every).size).toBe(20);
    expect(new Set(kept).size).toBe(18);
    // 사라진 답이 정확히 무엇인지도 못 박는다 — 「−4판」만 적으면 무엇을 잃었는지 모른다.
    const gone = [...new Set(every)].filter((x) => !kept.includes(x));
    expect(gone.sort((a, b) => a - b)).toEqual([20, 24]);
  });

  it("`70X` — 창 105 → 99 (−6) · 서로 다른 답 69 → 66", () => {
    const ns = new Set<number>();
    const ms = new Set<number>();
    for (const [s, v] of WIDE) {
      const f = build(K70, s, v).facts;
      ns.add(f.n!);
      ms.add(f.m!);
    }
    expect([...ns].sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15, 16]);
    expect([...ms].sort((a, b) => a - b)).toEqual([4, 5, 6, 7, 8]);

    const tails = [
      "이 점들 가운데 둘을 지나는 직선을 모두 그었을 때, 서로 다른 직선은 모두 몇 개인지 구하시오.",
      "이 점들 가운데 둘을 양 끝 점으로 하는 선분의 개수에서, 둘을 지나는 서로 다른 직선의 개수를 뺀 값을 구하시오.",
      "이 점들 가운데 둘을 양 끝 점으로 하는 선분의 개수와, 둘을 지나는 서로 다른 직선의 개수를 더한 값을 구하시오.",
    ];
    let all = 0;
    const kept: number[] = [];
    const every: number[] = [];
    for (let n = 10; n <= 16; n += 1) {
      for (let m = 4; m <= 8; m += 1) {
        const c = pairCount(n);
        const lines = distinctLineCount(n, m);
        const xs = [lines, c - lines, c + lines];
        for (let i = 0; i < 3; i += 1) {
          const x = xs[i]!;
          all += 1;
          every.push(x);
          // 모듈과 같은 자를 쓴다 — 지면을 지어 **그 지면의 수**로 잰다.
          const page =
            `어떤 평면 위에 점 $${n}$개가 찍혀 있다. 그중 $${m}$개는 한 직선 위에 ` +
            `나란히 놓여 있고, 나머지는 어느 셋을 골라도 한 직선 위에 있지 않다. ` +
            tails[i]!;
          if (pageShortcutValues(pageDigits(page)).has(x)) continue;
          kept.push(x);
        }
      }
    }
    expect(all).toBe(105);
    expect(kept).toHaveLength(99);
    expect(new Set(every).size).toBe(69);
    expect(new Set(kept).size).toBe(66);
  });

  it("`71X` — 창 2052 → 상한 −1236 → 굳힘오해 −14 → 지름길 −92 → 710 · 답 782 → 283", () => {
    const ts = new Set<number>();
    const cs = new Set<number>();
    const pairs = new Set<string>();
    for (const [s, v] of WIDE) {
      const f = build(K71, s, v).facts;
      ts.add(f.s! / (f.p! + f.q!));
      cs.add(f.c!);
      pairs.add(`${f.p}|${f.q}`);
      expect(f.p).not.toBe(f.q);
      expect(gcd2(f.p!, f.q!)).toBe(1);
      expect(f.p).toBeGreaterThanOrEqual(2);
      expect(f.q).toBeLessThanOrEqual(9);
    }
    expect([...ts].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7]);
    expect([...cs].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    // 창의 계수 짝이 실제로 넓다 — 여기가 좁으면 아래 전수 열거가 허구가 된다.
    expect(pairs.size).toBeGreaterThanOrEqual(30);

    let all = 0;
    let cap = 0;
    let mis = 0;
    let short = 0;
    const kept: number[] = [];
    const every: number[] = [];
    for (let p = 2; p <= 9; p += 1) {
      for (let q = 2; q <= 9; q += 1) {
        if (p === q || gcd2(p, q) !== 1) continue;
        for (let t = 2; t <= 7; t += 1) {
          const s = (p + q) * t;
          const [a, b] = linearCoefficientPair(p, q, s);
          for (const c of [1, 2, 3]) {
            const coef = a - b;
            const konst = c * a * b;
            const xs = [konst, coef, coef + konst];
            for (let i = 0; i < 3; i += 1) {
              const x = xs[i]!;
              all += 1;
              every.push(x);
              // 모듈이 가드를 **거는 차례 그대로** 센다 — 차례가 다르면 같은 수가 안 나온다.
              if (konst > 600) {
                cap += 1;
                continue;
              }
              if (i === 2 && s % 2 === 0 && c * (s / 2) * (s / 2) === x) {
                mis += 1;
                continue;
              }
              const cTex = c === 1 ? "" : String(c);
              const ask = ["상수항", "$x$의 계수", "$x$의 계수와 상수항의 합"][
                i
              ]!;
              const josa = i === 1 ? "를" : "을";
              const page =
                `두 자연수 $a$, $b$에 대하여 $a+b=${s}$이다. ` +
                `다항식 $(${p}a-${q}b)x^{2}+(a-b)x+${cTex}ab$가 $x$에 대한 일차식일 때, ` +
                `이 일차식의 ${ask}${josa} 구하시오.`;
              if (pageShortcutValues(pageDigits(page)).has(x)) {
                short += 1;
                continue;
              }
              kept.push(x);
            }
          }
        }
      }
    }
    expect(all).toBe(2052);
    expect(cap).toBe(1236);
    expect(mis).toBe(14);
    expect(short).toBe(92);
    expect(kept).toHaveLength(710);
    expect(new Set(every).size).toBe(782);
    expect(new Set(kept).size).toBe(283);
  });

  it("`72X` — 창이 자료까지라 전수 열거가 안 된다 — 그 사실을 찍고 씨앗 실측을 대신 적는다", () => {
    // 「전수를 못 센다」와 「안 셌다」는 다른 말이다. 무엇이 못 세게 하는지 적어 둔다:
    // 자료 열 개를 뽑는 자리가 창에 들어 있어 조합이 수백만이다.
    const stems = new Set<number>();
    const widths = new Set<number>();
    const contents = new Set<string>();
    for (const [s, v] of WIDE) {
      const p = build(K72, s, v);
      stems.add(p.facts.s!);
      widths.add(p.facts.n!);
      contents.add(p.content);
    }
    expect([...stems].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6]);
    expect([...widths].sort((a, b) => a - b)).toEqual([4, 5, 6]);
    // 씨앗 660판에서 발문이 거의 전부 다르다 — 창이 넓다는 실측 근거.
    expect(contents.size).toBeGreaterThanOrEqual(650);
  });
});

// ═══════════════════════════════════════════════════════════
// 지름길 — 우연 수준(널 모형)과 견준다
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — 지름길이 우연보다 뻔하지 않은가", () => {
  it("🔴 지면 수 조합이 답과 부딪히지 않는다 (220판, 판정기의 자를 그대로 쓴다)", () => {
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

  it("🔴 널 모형 — **유형마다** 우연 수준을 재고, 어디가 구조적으로 0인지 찍는다", () => {
    /**
     * 「가드 뒤 지름길 $0$건」이 «가드 덕»인지 «이 자가 원래 못 셈»인지 가른다.
     * 답을 판끼리 $37$ 칸 돌려 끼워(널 모형) 그 자가 우연히 맞히는 비율을 잰다.
     *
     * 🔴 실측(220판) — `69X` **0** · `70X` **6**(2.73%) · `71X` **23**(10.45%) ·
     *    `72X` **0**. 곧 `69X`·`72X` 에서 이 자는 **구조적으로 0**이다:
     *    `69X` 는 지면의 수가 $k$ 하나뿐이라 후보를 하나밖에 못 만들고,
     *    `72X` 는 지면의 수가 줄기($1$~$7$)·잎($0$~$9$)·$11$ 뿐이라 두 수의 곱이
     *    $99$ 를 못 넘는데 답은 대개 세 자리다.
     *    → 그 둘의 지름길 근거는 이 자가 아니다. `69X` 는 `scaledOnce`(창 24 중
     *      4판을 실제로 깎는다), `72X` 는 「$v_5$·$v_6$ 를 줄기와 잎 그림에서
     *      되짚는 것 자체가 «지면 수 한두 번 연산»이 아니다」는 사실이다.
     *      그 한계를 적어 두지 않으면 「$0$건」이 «깨끗»으로 읽힌다.
     */
    const nulls: Record<string, number> = {};
    for (const key of KEYS) {
      const pages = BULK.map(([s, v]) => build(key, s, v));
      let coincidence = 0;
      for (let i = 0; i < pages.length; i += 1) {
        const other = pages[(i + 37) % pages.length]!;
        const cand = obviousCandidates(pageNumbers(pages[i]!.content));
        if ([...cand.values()].includes(answerNumber(other.answer))) {
          coincidence += 1;
        }
      }
      nulls[key] = coincidence;
    }
    // 자가 살아 있는 두 유형 — 우연 수준이 실제 $0$건보다 **높다**.
    expect(nulls[K70]).toBeGreaterThan(0);
    expect(nulls[K71]).toBeGreaterThan(0);
    // 구조적으로 0인 두 유형 — 그 사실을 수로 못 박는다(늘면 위 주석을 고쳐야 한다).
    expect(nulls[K69]).toBe(0);
    expect(nulls[K72]).toBe(0);
  });

  it("🔴 `69X` 의 지면에는 수가 **하나뿐**이라 그 자가 구조적으로 약하다 — 그 사실을 찍는다", () => {
    const p = build(K69, SEEDS[0]!);
    const cand = obviousCandidates(pageNumbers(p.content));
    expect(new Set(cand.values()).size).toBe(1);
    expect([...cand.values()][0]).toBe(p.facts.k);
    // 그래서 이 유형은 `scaledOnce` 를 따로 둔다 — 그 자가 실제로 일한다.
    expect(scaledOnce(24).has(12)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차b 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5B) {
    it(`${e.rpmType} — 형제 중 가장 닮은 것이 기준선을 넘지 않는다`, () => {
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
      expect(sibs.length).toBeGreaterThan(3);
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

  it("🔴 5차b 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = M1_TOP_5B.map((e) => build(e.key, OVERLAP_SEED));
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
// 🔴 ㉳ 해설의 «말» — **판정을 진술하는 문장**을 지키는 자
//
// 4차 물결 검문에서 이 자리에 큰 구멍이 있었다. 참인 문장을 거짓으로 뒤집는 변이
// 13개 중 10개가 초록이었다 — 굳힘 개념과 마무리 논거가 통째로 그 문장들 안에 있다.
// 값 검산·KaTeX·해설 높이·조사 자는 이 부류를 **구조적으로** 못 본다.
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」 — 값은 지면에서 다시 읽어 만든다. */
function requiredWords(key: string, content: string): string[] {
  if (key === K69) {
    const { k } = read69(content);
    return [
      "옆모서리는 밑면과 한 점에서만 만나므로 밑면 위의 어떤 직선과도 평행할 수 없다",
      "만나지 않으면 두 모서리는 반드시 꼬인 위치에 있다",
      "$2$개는 그 옆모서리와 만나고, 나머지 $n-2$개는 꼬인 위치에 있다",
      "$n$은 커질수록 $n\\times(n-2)$도 커진다",
      `이 중 $${k}$`,
      "보다 크므로 더 볼 필요가 없다",
    ];
  }
  if (key === K70) {
    const { m } = read70(content);
    return [
      "서로 다른 두 점을 지나는 직선은 오직 하나뿐이므로",
      `한 직선 위에 있는 $${m}$개의 점에서`,
      "만큼의 짝은 모두 같은 직선 하나를 나타낸다",
      "어느 세 점도 한 직선 위에 있지 않으므로 나머지 짝은 저마다 다른 직선을 만든다",
      "빼고 $1$을 더한",
    ];
  }
  if (key === K71) {
    return [
      "$x$에 대한 일차식은 $x^{2}$의 계수가 $0$이어야 하므로",
      "$0$이 아니므로 이 다항식은 참으로 $x$에 대한 일차식이다",
    ];
  }
  if (key === K72) {
    return [
      "중앙값은 크기순으로 늘어놓았을 때 여섯 번째 값이다",
      "$6$개가 되므로 여섯 번째 값은",
      "$5$개뿐이고 그다음으로 작은 자료가",
      "$x$보다 작은 자료가 $5$개이므로 여섯 번째 값은 $x$ 자신이다",
    ];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K69]: [
    ["어떤 직선과도 평행할 수 없다", "어떤 직선과도 수직일 수 없다"],
    [
      "만나지 않으면 두 모서리는 반드시 꼬인 위치에 있다",
      "만나면 두 모서리는 반드시 꼬인 위치에 있다",
    ],
    ["나머지 $n-2$개는 꼬인 위치에 있다", "나머지 $n-1$개는 꼬인 위치에 있다"],
    ["$n$은 커질수록", "$n$은 작아질수록"],
    ["보다 크므로 더 볼 필요가 없다", "보다 작으므로 더 볼 필요가 없다"],
  ],
  [K70]: [
    ["직선은 오직 하나뿐이므로", "직선은 여러 개이므로"],
    ["모두 같은 직선 하나를 나타낸다", "모두 다른 직선을 나타낸다"],
    ["저마다 다른 직선을 만든다", "저마다 같은 직선을 만든다"],
    ["빼고 $1$을 더한", "빼고 $1$을 뺀"],
  ],
  [K71]: [
    ["계수가 $0$이어야 하므로", "계수가 $1$이어야 하므로"],
    ["$0$이 아니므로 이 다항식은", "$0$이므로 이 다항식은"],
  ],
  [K72]: [
    ["여섯 번째 값이다", "다섯 번째 값이다"],
    ["$6$개가 되므로 여섯 번째 값은", "$7$개가 되므로 여섯 번째 값은"],
    ["$5$개뿐이고 그다음으로 작은 자료가", "$5$개뿐이고 그다음으로 큰 자료가"],
    ["$x$보다 작은 자료가 $5$개이므로", "$x$보다 큰 자료가 $5$개이므로"],
  ],
};

function missingWords(
  key: string,
  content: string,
  solution: string,
): string[] {
  return requiredWords(key, content).filter((w) => !solution.includes(w));
}

describe("[중1 5차b 물결] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
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

  it("눈금 — 낱말을 하나씩 뒤집으면 **전부** 빨개진다 (양성 15 · 음성 4)", () => {
    let positives = 0;
    for (const key of KEYS) {
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
    expect(positives).toBe(15);
  });
});
