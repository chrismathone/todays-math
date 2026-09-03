/**
 * 중1 **5차 확대 갈래 — 갈래 `c`**(`m1Top5c.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `73X` | 넓이의 차를 계급의 크기로 **나눠** 도수의 차를 얻고, 합과 차로 두 값을 **한 번에** 낸다 | 나눗셈도 「합과 차」도 **한 번도 안 쓴다** — 큰 도수를 $1$ 부터 올려 가며 넣어, 두 도수의 합이 맞고 넓이의 차가 맞는 첫 짝을 찾는다 |
 * | `74X` | 꼭짓점 조건에서 $b=K-2a$ 를 **유도해** $a$ 하나만 훑는다 | $a$ 와 $b$ 를 **둘 다** 훑어 꼭짓점 식과 모서리 식을 **각각** 맞춘다(유도를 안 한다) |
 * | `75X` | 세 식을 모두 더해 $2$로 나누고 $B+C$ 를 뺀다 | **덧셈도 나눗셈도 안 한다** — $a_1$ 을 $-40$ 부터 훑어 $b_1=p_1-a_1$, $c_1=q_1-b_1$ 로 잇고 마지막 식 $c_1+a_1=r_1$ 이 맞는지만 본다 |
 * | `76X` | 합이 $S$ 인 짝을 $(1,\ S-1)$ 부터 만들어 **곱**을 견준다 | 반대로 간다 — **곱을 인수분해**해 약수 짝을 만들고 그 **합**이 $S$ 인 것을 찾는다 |
 *
 * ## 🔴 앞 물결이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을 재어
 *    **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑는다.
 *    ⚠️ 이 파일의 넷은 분수를 **한 자리도 안 쓴다** — 그러면 그 검사는 «구조적으로 0» 이라
 *    아무것도 안 지킨다. 그래서 **찾은 자리 수를 «$0$ 이어야 한다»로 못 박아**, 나중에
 *    누가 분수를 넣으면 그 사실이 **먼저 빨개지고** 기약 검사를 살리게 한다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「곱↔합」·「나눈↔곱한」·「큰↔작은」·
 *    「자연수↔유리수」·「두 번씩↔세 번씩」을 **낱말과 수를 함께** 판정한다. 그리고
 *    **뒤집으면 빨개지는 눈금**을 양성 15 · 음성 4 로 같이 둔다.
 * ㉴ **지면이 자기가 세운 제약을 스스로 어긴다.** → `74X` 의 해설이 「$a$, $b$ 는 모두
 *    $3$ 이상」이라 적고서 실제로 $a=3$ 부터 훑는지, 멈추는 자리가 그 제약과 맞는지를
 *    **지면 글자에서 다시 읽어** 잰다.
 * ㉵㉶ **답 쏠림·지름길·손실 원장** → 씨앗 220×변형 3 에서 서로 다른 발문·정답과
 *    **최빈 정답 비율**을 **씨앗 블록 셋**으로 따로 재고, 지름길은 판정기의 자
 *    (`obviousCandidates`)로 다시 잰다.
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
 * ## 🔴 판정기(`scripts/qa/probe-middle-top-m1.ts`)의 `AXES` 는 **여기서 안 건드린다**
 *
 * 그 파일은 5차 물결의 **21개 갈래가 같이 쓰는 공용 자**다. 갈래마다 자기 축을 거기
 * 적으면 21개가 같은 파일을 동시에 고쳐 말없이 덮어쓴다(2026-08-23). 그래서 축을
 * **이 파일 안에** 세워 같은 성질(굳힘을 지우면 답이 안 나온다 · 흔들면 달라진다)을
 * 잠그고, 판정기 등록은 **리드 몫**으로 남긴다. 판정기의 **열쇠**(`obviousCandidates`·
 * `pageNumbers`·`koreanJaccard`)는 그대로 **읽어 와서** 쓴다 — 규칙을 두 벌로 두지 않는다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { createRng } from "@/lib/elementary/rng";
import { bareNumbers } from "@/lib/elementary/rules";
import {
  declaredUpperBound,
  deriveThreeFormats,
  reversesOrder,
} from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  factorPairWithSum,
  largerFromSumAndDiff,
  M1_TOP_5C,
  pageShortcutValues,
  polyhedronScan,
  printedNumbers,
  polyhedronStop,
  sumOfPairSums,
} from "@/lib/middle/m1Top5c";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem } from "@/lib/middle/types";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { estimateSolutionPx } from "@/lib/printOverflow";

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

const K73 = "1-2|도수분포표와 상대도수|73X";
const K74 = "1-2|다면체와 회전체|74X";
const K75 = "1-1|문자의 사용과 식의 계산|75X";
const K76 = "1-2|도수분포표와 상대도수|76X";
const KEYS = [K73, K74, K75, K76] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K73]: "심화중",
  [K74]: "심화상",
  [K75]: "심화중",
  [K76]: "심화상",
};

/** 리드가 소단원마다 실측으로 준 **변형 폭 바닥**. */
const VARIANT_FLOOR: Record<string, number> = {
  [K73]: 5,
  [K74]: 7,
  [K75]: 12,
  [K76]: 12,
};

const SEEDS = [20260903, 3, 11, 515151, 99991];
const VARIANTS = 4;
/** 겹침을 잴 때 쓰는 씨앗 — 판정기와 값을 맞춰 둔다. */
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

/**
 * 🔴 **정답 쏠림은 «씨앗 블록 여럿»으로 잰다.**
 *
 * 한 블록만 보면 그 블록이 우연히 고른 값에 매인다. 서로 겹치지 않는 세 블록을
 * 따로 재고 **가장 나쁜 블록**으로 판정한다.
 */
const BLOCKS: readonly (readonly (readonly [number, number])[])[] = [
  WIDE,
  (() => {
    const out: [number, number][] = [];
    for (let s = 0; s < 220; s += 1) {
      for (let v = 0; v < 3; v += 1) out.push([77771 + s * 104729, v]);
    }
    return out;
  })(),
  (() => {
    const out: [number, number][] = [];
    for (let s = 0; s < 220; s += 1) {
      for (let v = 0; v < 3; v += 1) out.push([31337 + s * 15485863, v]);
    }
    return out;
  })(),
];

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_5C.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차c ${key}`);
  assertChoiceCount(content, `중1 5차c ${key}`);
  assertChoiceMarks(content, `중1 5차c ${key}`);
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
  13: "열세",
  14: "열네",
  15: "열다섯",
  16: "열여섯",
  17: "열일곱",
};

/** 다각형 이름의 한자 수사 — 이것도 생성기 것과 **다른 벌**이다. */
const SINO: Record<number, string> = {
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
  13: "십삼",
  14: "십사",
  15: "십오",
};

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

/** 접속 조사 — 「$3$과 $4$」. 역시 시험 쪽 규칙으로 판정한다. */
function conjJosaFor(n: number): "와" | "과" {
  return numVowelFinal(n) ? "와" : "과";
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
      const vals = parts.map((pp) => evalTex(pp));
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

const UNIT = "(?:분|점|시간|회|권)";
const CLASS_RE = new RegExp(
  `\\$(\\d+)\\$${UNIT} 이상 \\$(\\d+)\\$${UNIT} 미만인 계급`,
  "g",
);

type StatPage = {
  n: number;
  width: number;
  bounds: number[];
  f1: number;
  f2: number;
  asked: [number, number];
};

/**
 * 🔴 **읽는 자를 `73X`·`76X` 가 나눠 쓰지 않는다.**
 *
 * 처음에는 한 함수로 둘을 다 읽었다. 그런데 두 발문의 한글 낱말 Jaccard 가 **0.543**
 * 이라 「같은 시험지에 실리면 학생이 «아까 그 문제»로 읽는다」는 문제가 있었고,
 * `76X` 의 말투를 통째로 바꿔 **0.148** 로 내렸다(실측). 말투가 갈렸으니 읽는 자도
 * 갈라야 한다 — 한 자로 둘을 읽으려 하면 그 자가 **다시 둘을 닮게 만든다.**
 */
function classPairs(content: string): [number, number][] {
  return [...content.matchAll(CLASS_RE)].map(
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  );
}

/** 경계 다섯이 계급의 크기와 맞는지 — 안 맞으면 던진다. */
function checkBounds(bounds: number[], width: number, who: string): void {
  for (let k = 1; k < bounds.length; k += 1) {
    if (bounds[k] !== bounds[k - 1]! + width) {
      throw new Error(`${who}: 계급의 크기가 경계와 안 맞는다`);
    }
  }
}

function readAsked(content: string, who: string): [number, number] {
  const m = new RegExp(
    `\\$(\\d+)\\$${UNIT} 이상 \\$(\\d+)\\$${UNIT} 미만인 계급의 도수를 구하시오\\.$`,
  ).exec(content);
  if (m === null) throw new Error(`${who}: 묻는 계급을 못 읽었다 — ${content}`);
  return [Number(m[1]), Number(m[2])];
}

function read73(content: string): StatPage & { area: number } {
  const [n, , width] = grab(
    new RegExp(
      `^어느 중학교 학생 \\$(\\d+)\\$명의 (.+?) 조사하여 히스토그램으로 나타내었다\\. ` +
        `계급의 크기는 \\$(\\d+)\\$${UNIT}이고 계급은 `,
    ),
    content,
    "73X",
  );
  const w = num(width!);
  const classes = classPairs(content);
  // 「…부터 …까지 네 개이다」라 첫 표기가 첫째 계급, 둘째 표기가 **넷째** 계급이다.
  if (classes.length !== 7) {
    throw new Error(`73X: 계급 표기가 일곱이 아니다 — ${classes.length}`);
  }
  const bounds = [
    classes[0]![0],
    classes[0]![1],
    classes[1]![0] - w,
    classes[1]![0],
    classes[1]![1],
  ];
  checkBounds(bounds, w, "73X");
  const freqs = [...content.matchAll(/계급의 도수는 \$(\d+)\$명/g)].map((m) =>
    Number(m[1]),
  );
  if (freqs.length !== 2) throw new Error("73X: 주어진 도수가 둘이 아니다");
  const [area] = grab(/넓이보다 \$(\d+)\$만큼 크다\./, content, "73X");
  return {
    n: num(n!),
    width: w,
    bounds,
    f1: freqs[0]!,
    f2: freqs[1]!,
    asked: readAsked(content, "73X"),
    area: num(area!),
  };
}

function read76(content: string): StatPage & { product: number } {
  const [n, , width] = grab(
    new RegExp(
      `^어느 중학교 \\$(\\d+)\\$명의 학생을 대상으로 (.+?) 조사한 뒤, ` +
        `계급의 크기가 \\$(\\d+)\\$${UNIT}인 계급 네 개로 나누어 도수분포표를 만들었다\\. `,
    ),
    content,
    "76X",
  );
  const w = num(width!);
  const classes = classPairs(content);
  // 여기서는 네 계급이 차례로 다 찍힌다(그다음이 묻는 계급).
  if (classes.length !== 5) {
    throw new Error(`76X: 계급 표기가 다섯이 아니다 — ${classes.length}`);
  }
  const bounds = [
    classes[0]![0],
    classes[0]![1],
    classes[1]![1],
    classes[2]![1],
    classes[3]![1],
  ];
  checkBounds(bounds, w, "76X");
  const freqs = [...content.matchAll(/에 속하는 학생은 \$(\d+)\$명/g)].map(
    (m) => Number(m[1]),
  );
  if (freqs.length !== 2) throw new Error("76X: 주어진 도수가 둘이 아니다");
  const [product] = grab(
    /두 계급의 도수의 곱은 \$(\d+)\$이다\./,
    content,
    "76X",
  );
  return {
    n: num(n!),
    width: w,
    bounds,
    f1: freqs[0]!,
    f2: freqs[1]!,
    asked: readAsked(content, "76X"),
    product: num(product!),
  };
}

const RE74 =
  /^어떤 (각기둥|각뿔대)((?: 모양의 (?:상자|블록|조형물|모형))?) (\(가\)|\$A\$)와 어떤 각뿔\2 (\(나\)|\$B\$)가 있다\. 두 (입체도형|상자|블록|조형물|모형)의 모서리의 개수의 곱은 \$(\d+)\$이고 꼭짓점의 개수의 합은 \$(\d+)\$이다\. (.+)$/;

type Page74 = {
  prism: string;
  l1: string;
  l2: string;
  thing: string;
  edgeProduct: number;
  vSum: number;
  ask: string;
};

function read74(content: string): Page74 {
  const [prism, , l1, l2, thing, ep, vs, ask] = grab(RE74, content, "74X");
  return {
    prism: prism!,
    l1: l1!,
    l2: l2!,
    thing: thing!,
    edgeProduct: num(ep!),
    vSum: num(vs!),
    ask: ask!,
  };
}

const RE75 =
  /^세 일차식 \$A\$, \$B\$, \$C\$에 대하여 \$A\+B=([^$]+)\$, \$B\+C=([^$]+)\$, \$C\+A=([^$]+)\$이다\. 이때 \$A\$의 \$x\$의 계수와 상수항의 합을 구하시오\.$/;

/** `3x+5` · `-x-2` · `x+7` 을 계수 짝으로. 모양이 다르면 던진다. */
function parseLin(src: string): [number, number] {
  const m = /^(-?\d*)x([+-]\d+)$/.exec(src);
  if (m === null) throw new Error(`75X: 일차식 모양이 다르다 — ${src}`);
  const head = m[1]!;
  const c1 = head === "" ? 1 : head === "-" ? -1 : Number(head);
  if (c1 === 0) throw new Error("75X: $x$의 계수가 $0$ 이다");
  const c0 = Number(m[2]);
  if (c0 === 0) throw new Error("75X: 상수항이 $0$ 이다");
  return [c1, c0];
}

function read75(content: string): {
  p: [number, number];
  q: [number, number];
  r: [number, number];
} {
  const [ps, qs, rs] = grab(RE75, content, "75X");
  return { p: parseLin(ps!), q: parseLin(qs!), r: parseLin(rs!) };
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

const VERIFY: Record<string, (content: string) => number> = {
  [K73]: (content) => {
    const { n, width, bounds, f1, f2, area, asked } = read73(content);
    if (f1 < 1 || f2 < 1) throw new Error("73X: 주어진 도수가 자연수가 아니다");
    if (area % width !== 0) {
      throw new Error("73X: 넓이의 차가 계급의 크기로 안 나누어떨어진다");
    }
    // 🔴 나눗셈도 「합과 차」도 안 쓴다 — 큰 도수를 $1$ 부터 올려 가며 **넣어** 본다.
    const hits: [number, number][] = [];
    for (let big = 1; big <= n; big += 1) {
      for (let small = 1; small < big; small += 1) {
        if (f1 + f2 + big + small !== n) continue;
        if (width * (big - small) !== area) continue;
        hits.push([big, small]);
      }
    }
    if (hits.length !== 1) {
      throw new Error(`73X: 조건에 맞는 두 도수가 ${hits.length} 짝이다`);
    }
    const [big, small] = hits[0]!;
    if (big - small < 2) throw new Error("73X: 두 도수의 차가 $2$ 보다 작다");
    if (n < 20 || n > 66) throw new Error("73X: 학생 수가 창 밖이다");
    const sum = big + small;
    const diff = big - small;
    /**
     * ㉵ 지면 수 조합으로 답이 나오면 심화가 아니다.
     *
     * ⚠️ **«찍힌 그대로»로 재야 한다.** 처음에 `[n, f1, f2, area, ...bounds]` 아홉 개로
     *    쟀더니 생성기가 통과시킨 판을 여기서 **던졌다** — 그 자는 목록 전체의 합·최댓값
     *    같은 «모아서 만드는 값»도 내므로, 목록이 다르면 **한쪽에만 있는 값**이 생긴다
     *    (아홉 개 목록 ⊆ 열아홉 개 목록인데도 그렇다). 생성기와 같은 것을 봐야 한다.
     */
    const ans = asked[0] === bounds[2] ? big : small;
    if (pageShortcutValues(printedNumbers(content)).has(ans)) {
      throw new Error("73X: 답이 지면 수 조합으로 나온다");
    }
    if (ans === diff || ans === sum) {
      throw new Error("73X: 답이 도수의 차 또는 합 그대로다");
    }
    if (asked[0] !== bounds[2] && asked[0] !== bounds[3]) {
      throw new Error("73X: 묻는 계급이 모르는 두 계급이 아니다");
    }
    return ans;
  },

  [K74]: (content) => {
    const { l1, l2, edgeProduct, vSum, ask, thing } = read74(content);
    // 🔴 $a$ 와 $b$ 를 **둘 다** 훑는다 — $b=K-2a$ 를 유도하지 않는다.
    const hits: [number, number][] = [];
    for (let a = 3; a <= 60; a += 1) {
      for (let b = 3; b <= 60; b += 1) {
        if (2 * a + (b + 1) !== vSum) continue;
        if (3 * a * (2 * b) !== edgeProduct) continue;
        hits.push([a, b]);
      }
    }
    if (hits.length !== 1) {
      throw new Error(`74X: 조건에 맞는 짝이 ${hits.length} 개다`);
    }
    const [a, b] = hits[0]!;
    // 훑는 줄이 셋~일곱이어야 한다(해설 높이 상한).
    let stop = 3;
    for (; vSum - 1 - 2 * stop >= 3; stop += 1);
    if (stop - 3 < 3 || stop - 3 > 7) {
      throw new Error(`74X: 훑는 줄이 ${stop - 3} 이다`);
    }
    const table: Record<string, number> = {
      [`두 ${thing}의 면의 개수의 곱을 구하시오.`]: (a + 2) * (b + 1),
      [`두 ${thing}의 꼭짓점의 개수의 곱을 구하시오.`]: 2 * a * (b + 1),
      [`${l1}의 면의 개수와 ${l2}의 모서리의 개수의 곱을 구하시오.`]:
        (a + 2) * (2 * b),
      [`${l1}의 모서리의 개수와 ${l2}의 면의 개수의 곱을 구하시오.`]:
        3 * a * (b + 1),
    };
    const ans = table[ask];
    if (ans === undefined) throw new Error(`74X: 모르는 물음 — ${ask}`);
    if (pageShortcutValues([edgeProduct, vSum]).has(ans)) {
      throw new Error("74X: 답이 지면 수 조합으로 나온다");
    }
    return ans;
  },

  [K75]: (content) => {
    const { p, q, r } = read75(content);
    // 🔴 덧셈도 나눗셈도 안 한다 — $a$ 를 훑어 사슬을 잇고 마지막 식만 본다.
    const solve = (
      p1: number,
      q1: number,
      r1: number,
    ): [number, number, number] => {
      const found: [number, number, number][] = [];
      for (let a = -40; a <= 40; a += 1) {
        const b = p1 - a;
        const c = q1 - b;
        if (c + a === r1) found.push([a, b, c]);
      }
      if (found.length !== 1) {
        throw new Error(`75X: 해가 ${found.length} 개다`);
      }
      return found[0]!;
    };
    const [a1, b1, c1] = solve(p[0], q[0], r[0]);
    const [a0, b0, c0] = solve(p[1], q[1], r[1]);
    for (const v of [a1, b1, c1, a0, b0, c0]) {
      if (v === 0)
        throw new Error("75X: 세 일차식 중 계수나 상수항이 $0$ 이다");
    }
    if (Math.abs(a1) > 8 || Math.abs(b1) > 8 || Math.abs(c1) > 8) {
      throw new Error("75X: $x$의 계수가 창 밖이다");
    }
    if (Math.abs(a0) > 9 || Math.abs(b0) > 9 || Math.abs(c0) > 9) {
      throw new Error("75X: 상수항이 창 밖이다");
    }
    const ans = a1 + a0;
    const nums = [p[0], p[1], q[0], q[1], r[0], r[1]];
    const set = pageShortcutValues(nums);
    if (set.has(ans) || set.has(-ans)) {
      throw new Error("75X: 답이 지면 수 조합으로 나온다");
    }
    return ans;
  },

  [K76]: (content) => {
    const { n, bounds, f1, f2, product, asked } = read76(content);
    const sum = n - f1 - f2;
    // 🔴 생성기와 **반대로** 간다 — 곱을 인수분해해 약수 짝을 만들고 합을 견준다.
    const hits: [number, number][] = [];
    for (let d = 1; d * d <= product; d += 1) {
      if (product % d !== 0) continue;
      const other = product / d;
      if (d + other === sum && d < other) hits.push([other, d]);
    }
    if (hits.length !== 1) {
      throw new Error(`76X: 조건에 맞는 두 도수가 ${hits.length} 짝이다`);
    }
    const [big, small] = hits[0]!;
    if (small < 3) {
      throw new Error("76X: 작은 도수가 $3$ 보다 작아 곱 하나로 답이 나온다");
    }
    const pairs = Math.floor(sum / 2);
    if (pairs < 4 || pairs > 17) throw new Error(`76X: 짝이 ${pairs} 가지다`);
    if (n < 20 || n > 64) throw new Error("76X: 학생 수가 창 밖이다");
    if (asked[0] !== bounds[2] && asked[0] !== bounds[3]) {
      throw new Error("76X: 묻는 계급이 모르는 두 계급이 아니다");
    }
    const ans = asked[0] === bounds[2] ? big : small;
    if (pageShortcutValues(printedNumbers(content)).has(ans)) {
      throw new Error("76X: 답이 지면 수 조합으로 나온다");
    }
    return ans;
  },
};

// ── 해설에 나온 수가 전부 설명되는가 ──────────────────────────

const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K73]: (content) => {
    const { n, width, bounds, f1, f2, area } = read73(content);
    const out = new Set<number>([n, width, f1, f2, area, 2, ...bounds]);
    const diff = area / width;
    for (let big = 1; big <= n; big += 1) {
      const small = n - f1 - f2 - big;
      if (small < 1 || small >= big) continue;
      if (big - small !== diff) continue;
      out.add(big);
      out.add(small);
      out.add(big + small);
    }
    out.add(diff);
    return out;
  },
  [K74]: (content) => {
    const { edgeProduct, vSum } = read74(content);
    const out = new Set<number>([1, 2, 3, edgeProduct, vSum]);
    const kSum = vSum - 1;
    let stop = 3;
    for (; kSum - 2 * stop >= 3; stop += 1);
    out.add(stop);
    for (let t = 3; t < stop; t += 1) {
      const bt = kSum - 2 * t;
      out.add(t);
      out.add(2 * t);
      out.add(bt);
      out.add(3 * t);
      out.add(2 * bt);
      out.add(3 * t * (2 * bt));
      if (3 * t * (2 * bt) === edgeProduct) {
        out.add(t + 2);
        out.add(bt + 1);
        out.add((t + 2) * (bt + 1));
        out.add(2 * t * (bt + 1));
        out.add((t + 2) * (2 * bt));
        out.add(3 * t * (bt + 1));
      }
    }
    return out;
  },
  [K75]: (content) => {
    const { p, q, r } = read75(content);
    const out = new Set<number>([2]);
    const add = (v: number): void => {
      out.add(Math.abs(v));
    };
    for (const [u1, u0] of [p, q, r]) {
      add(u1);
      add(u0);
    }
    const s1 = p[0] + q[0] + r[0];
    const s0 = p[1] + q[1] + r[1];
    add(s1);
    add(s0);
    add(s1 / 2);
    add(s0 / 2);
    add(s1 / 2 - q[0]);
    add(s0 / 2 - q[1]);
    add(s1 / 2 - q[0] + (s0 / 2 - q[1]));
    return out;
  },
  [K76]: (content) => {
    const { n, width, bounds, f1, f2, product } = read76(content);
    const out = new Set<number>([n, width, f1, f2, product, ...bounds]);
    const sum = n - f1 - f2;
    out.add(sum);
    for (let s = 1; s * 2 <= sum; s += 1) {
      out.add(s);
      out.add(sum - s);
      out.add(s * (sum - s));
    }
    return out;
  },
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 손으로 쓴 지면(엔진 밖) — 답을 사람이 계산해 두었다. */
const GOOD_PAGES: readonly { key: string; page: string; want: number }[] = [
  {
    key: K73,
    // 도수의 합 $=32-7-8=17$ · 차 $=50\div10=5$ → 큰 $11$ · 작은 $6$
    page:
      "어느 중학교 학생 $32$명의 수학 성적을 조사하여 히스토그램으로 나타내었다. " +
      "계급의 크기는 $10$점이고 계급은 $50$점 이상 $60$점 미만인 계급부터 " +
      "$80$점 이상 $90$점 미만인 계급까지 네 개이다. " +
      "$50$점 이상 $60$점 미만인 계급의 도수는 $7$명, " +
      "$60$점 이상 $70$점 미만인 계급의 도수는 $8$명이고, " +
      "$70$점 이상 $80$점 미만인 계급의 직사각형의 넓이는 $80$점 이상 $90$점 미만인 " +
      "계급의 직사각형의 넓이보다 $50$만큼 크다. " +
      "$70$점 이상 $80$점 미만인 계급의 도수를 구하시오.",
    want: 11,
  },
  {
    key: K74,
    // 꼭짓점 합 $22$ → $b=21-2a$ · 모서리 곱 $6ab=270$ → $a=3$, $b=15$
    // 면의 개수의 곱 $=(3+2)\times(15+1)=80$
    page:
      "어떤 각기둥 (가)와 어떤 각뿔 (나)가 있다. " +
      "두 입체도형의 모서리의 개수의 곱은 $270$이고 꼭짓점의 개수의 합은 $22$이다. " +
      "두 입체도형의 면의 개수의 곱을 구하시오.",
    want: 80,
  },
  {
    key: K75,
    // $A+B=6x+4$, $B+C=10x+8$, $C+A=8x+6$ → 세 식의 합 $24x+18$
    // → $A+B+C=12x+9$ → $A=(12x+9)-(10x+8)=2x+1$ → $2+1=3$
    page:
      "세 일차식 $A$, $B$, $C$에 대하여 $A+B=6x+4$, $B+C=10x+8$, $C+A=8x+6$이다. " +
      "이때 $A$의 $x$의 계수와 상수항의 합을 구하시오.",
    want: 3,
  },
  {
    key: K76,
    // 합 $=25-5-5=15$ · 짝의 곱은 차례로 $14,26,36,44,50,54,56$ → $44$ 는 $(4,11)$
    // → 큰 쪽 $11$
    page:
      "어느 중학교 $25$명의 학생을 대상으로 국어 성적을 조사한 뒤, " +
      "계급의 크기가 $10$점인 계급 네 개로 나누어 도수분포표를 만들었다. " +
      "$40$점 이상 $50$점 미만인 계급에 속하는 학생은 $5$명, " +
      "$50$점 이상 $60$점 미만인 계급에 속하는 학생은 $5$명이다. " +
      "남은 두 계급 가운데 $60$점 이상 $70$점 미만인 계급의 도수가 " +
      "$70$점 이상 $80$점 미만인 계급의 도수보다 크고, 두 계급의 도수의 곱은 $44$이다. " +
      "$60$점 이상 $70$점 미만인 계급의 도수를 구하시오.",
    want: 11,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K73,
    page: GOOD_PAGES[0]!.page.replace("$50$만큼", "$55$만큼"),
    why: "넓이의 차가 계급의 크기로 안 나누어떨어진다",
  },
  {
    key: K73,
    page: GOOD_PAGES[0]!.page.replace("$50$만큼", "$10$만큼"),
    why: "두 도수의 차가 $1$ — 「합과 차」 걸음이 시시해진다",
  },
  {
    key: K73,
    page: GOOD_PAGES[0]!.page
      .replace("학생 $32$명", "학생 $80$명")
      .replace("$50$만큼", "$20$만큼"),
    why: "학생 수가 창 밖이다",
  },
  {
    key: K74,
    page: GOOD_PAGES[1]!.page.replace("곱은 $270$", "곱은 $271$"),
    why: "조건에 맞는 짝이 하나도 없다",
  },
  {
    key: K74,
    // 꼭짓점 합 $13$ → 훑는 줄이 셋보다 적다
    page:
      "어떤 각기둥 (가)와 어떤 각뿔 (나)가 있다. " +
      "두 입체도형의 모서리의 개수의 곱은 $162$이고 꼭짓점의 개수의 합은 $13$이다. " +
      "두 입체도형의 면의 개수의 곱을 구하시오.",
    why: "훑는 줄이 셋보다 적어 «다 만들어 견준다»가 얕다",
  },
  {
    key: K75,
    page: GOOD_PAGES[2]!.page.replace("$C+A=8x+6$", "$C+A=8x+7$"),
    why: "상수항 쪽 합이 $19$ 로 홀수라 각 항을 $2$ 로 나눌 수 없다 — 해가 없다",
  },
  {
    key: K75,
    page: GOOD_PAGES[2]!.page.replace("$C+A=8x+6$", "$C+A=8x+12$"),
    why: "$B$ 의 상수항이 $0$ 이 되어 지면에서 그 항이 사라진다",
  },
  {
    key: K76,
    page: GOOD_PAGES[3]!.page.replace("곱은 $44$", "곱은 $43$"),
    why: "합이 $15$ 인 자연수 짝 중 곱이 $43$ 인 것이 없다",
  },
  {
    key: K76,
    page: GOOD_PAGES[3]!.page.replace("곱은 $44$", "곱은 $14$"),
    why: "작은 도수가 $1$ — 지면의 곱 하나로 답이 나온다",
  },
];

describe("중1 5차c 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 검산기가 `facts.x` 를 되읽는 판이었다면 여기서 통과할 수가 없다
    // (손으로 쓴 지면에는 `facts` 가 없다).
    expect(GOOD_PAGES).toHaveLength(4);
    for (const { key, page, want } of GOOD_PAGES) {
      expect(VERIFY[key]!(page), `${key} 양성 눈금`).toBe(want);
    }
  });

  it("🔴 음성 — 불변식을 어긴 지면은 반드시 던진다", () => {
    expect(BAD_PAGES.length).toBeGreaterThanOrEqual(9);
    for (const { key, page, why } of BAD_PAGES) {
      // 음성 지면이 양성과 **실제로 달라야** 한다 — 안 그러면 이 눈금이 헛돈다.
      expect(page).not.toBe(GOOD_PAGES.find((g) => g.key === key)!.page);
      expect(() => VERIFY[key]!(page), `${key} 음성 눈금: ${why}`).toThrow();
    }
  });

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·괄호·못 읽음을 각각 가른다", () => {
    expect(arithmeticEquationFailures("$1+2+3=6$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$1+2+3=7$이다.")).toHaveLength(1);
    expect(arithmeticEquationFailures("$(14+4)\\div2=9$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$(14+4)\\div2=8$이다.")).toHaveLength(1);
    expect(arithmeticEquationFailures("$40\\div10=4$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$-1+1+10=10$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$-1+1+10=11$이다.")).toHaveLength(1);
    // 문자식은 «판정하지 않는다» — 계산하려 들면 거짓 빨강이 난다.
    expect(arithmeticEquationFailures("$b=22-1-2\\times a$")).toEqual([]);
    // 읽을 수 없는 글자는 조용히 넘기지 않고 **실패로 센다**.
    // ⚠️ 명령(`\\notacommand`)을 쓰면 안 된다 — 그건 「문자식이라 판정하지 않는다」로
    //    빠져나가서 이 눈금이 **아무것도 안 재게** 된다.
    expect(arithmeticEquationFailures("$1++2=3$")).toHaveLength(1);
  });

  it("🔴 우리말 표가 생성기 것과 **다른 벌**이다 — 가져다 쓰면 동어반복이다", () => {
    expect(COUNT_WORD[3]).toBe("세");
    expect(COUNT_WORD[15]).toBe("열다섯");
    expect(COUNT_WORD[17]).toBe("열일곱");
    expect(Object.keys(COUNT_WORD)).toHaveLength(17);
    expect(SINO[5]).toBe("오");
    expect(SINO[15]).toBe("십오");
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`largerFromSumAndDiff` 는 손 계산과 맞는다", () => {
    expect(largerFromSumAndDiff(17, 5)).toBe(11);
    expect(largerFromSumAndDiff(14, 4)).toBe(9);
    expect(largerFromSumAndDiff(30, 2)).toBe(16);
  });

  it("🔴 음성 대조 — 합과 차의 홀짝이 어긋나면 자연수 짝이 **없다**", () => {
    expect(largerFromSumAndDiff(17, 4)).toBeNull();
    expect(largerFromSumAndDiff(10, 3)).toBeNull();
    // 차가 합보다 크면 작은 쪽이 자연수가 아니다.
    expect(largerFromSumAndDiff(6, 8)).toBeNull();
    // 차가 합과 같으면 작은 쪽이 $0$ 이라 도수가 아니다.
    expect(largerFromSumAndDiff(8, 8)).toBeNull();
  });

  it("`polyhedronScan`·`polyhedronStop` 은 손 계산과 맞는다", () => {
    // 꼭짓점의 합 $22$ → $K=21$ · $b=21-2a$ · $6ab=270$ → $a=3$, $b=15$
    expect(polyhedronScan(21, 270)).toEqual([3]);
    expect(polyhedronStop(21)).toBe(10);
    // $a=3$ 부터 $b\ge3$ 인 마지막은 $a=9$($b=3$) 이므로 멈추는 자리는 $10$.
    expect(21 - 2 * 9).toBe(3);
    expect(21 - 2 * 10).toBeLessThan(3);
  });

  it("🔴 음성 대조 — 살아남는 $a$ 가 **둘**인 판과 **하나도 없는** 판이 실재한다", () => {
    // $K=16$ 이면 $6a(16-2a)$ 는 $a=3$ 과 $a=5$ 에서 똑같이 $180$ 이다.
    expect(6 * 3 * (16 - 6)).toBe(180);
    expect(6 * 5 * (16 - 10)).toBe(180);
    expect(polyhedronScan(16, 180)).toEqual([3, 5]);
    // 아무 $a$ 도 안 맞는 곱.
    expect(polyhedronScan(21, 271)).toEqual([]);
  });

  it("`sumOfPairSums` 는 손 계산과 맞는다", () => {
    // $A+B=4x+7$, $B+C=-2x+3$, $C+A=6x-2$ → $A=6x+1$
    expect(sumOfPairSums([4, 7], [-2, 3], [6, -2])).toEqual([6, 1]);
  });

  it("🔴 음성 대조 — 합이 홀수면 각 항을 $2$ 로 나눌 수 없어 **`null`** 이다", () => {
    expect(sumOfPairSums([4, 7], [-2, 3], [6, -3])).toBeNull();
    expect(sumOfPairSums([5, 7], [-2, 3], [6, -2])).toBeNull();
  });

  it("`factorPairWithSum` 은 손 계산과 맞는다", () => {
    expect(factorPairWithSum(19, 88)).toEqual([8, 11]);
    expect(factorPairWithSum(21, 90)).toEqual([6, 15]);
  });

  it("🔴 음성 대조 — 아무 짝과도 안 맞는 곱이면 **빈 값**이다", () => {
    expect(factorPairWithSum(19, 87)).toBeNull();
    expect(factorPairWithSum(19, 1000)).toBeNull();
  });

  it("`pageShortcutValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect(pageShortcutValues([6, 4]).has(24)).toBe(true);
    expect(pageShortcutValues([6, 4]).has(2)).toBe(true);
    expect(pageShortcutValues([6, 4]).has(37)).toBe(false);
    expect(pageShortcutValues([]).size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5C).toHaveLength(4);
    expect(new Set(M1_TOP_5C.map((e) => e.key)).size).toBe(4);
    expect(M1_TOP_5C.map((e) => e.key).sort()).toEqual([...KEYS].sort());
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5C) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), `${e.key} 번호 규약`).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5C) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
    // 🔴 로마 숫자 Ⅱ(U+2161)는 라틴 `II` 가 아니다 — 눈으로는 안 갈린다.
    const expr = M1_TOP_5C.find((e) => e.rpmType === "75X")!;
    expect(expr.unitSection).toBe("일차식의 뜻Ⅱ");
    expect(expr.unitSection.includes("II")).toBe(false);
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const flags = KEYS.map((k) => REGISTERED.has(k));
    expect(new Set(flags).size).toBe(1);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_5C) {
      for (const seed of SEEDS) {
        const raw = e.handler(createRng(seed));
        expect(wrapDanClause(raw.content), `${e.key} 단 절`).toBe(raw.content);
        expect(tidySolution(raw.solution), `${e.key} 해설 다듬기`).toBe(
          raw.solution,
        );
        expect(
          resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
          `${e.key} 갈래 내리기`,
        ).toBe(raw.difficulty);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
  });

  for (const e of M1_TOP_5C) {
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

      it("🔴 ㉱ 발문이 상한을 선언하지 않는다 — 공용 자가 읽을 표현이 없다", () => {
        // 4차 중2 `37W` 는 「전체 일의 양을 $1$로 놓고」처럼 상한을 선언해 놓고
        // 파생 오답이 그것을 넘었다. 이 넷은 그 표현을 아예 안 쓴다.
        for (const [seed, v] of BULK.slice(0, 80)) {
          expect(
            declaredUpperBound(build(e.key, seed, v).content),
            `${e.key} ${seed}/${v}`,
          ).toBeNull();
        }
        // 그 자가 살아 있는지 — 상한을 선언한 글에는 값을 낸다.
        expect(
          declaredUpperBound("전체 일의 양을 $1$로 놓고 …를 구하시오."),
        ).not.toBeNull();
      });

      it("🔴 공용 조사 자가 이 유형에서 **구조적으로 0 이 아니다** — 실제로 읽는 자리가 있다", () => {
        // 3차의 한 유형은 수식이 `)` 로 끝나 조사 자가 800/800 을 건너뛰었다.
        // 「어긋남 0」이 «깨끗»인지 «못 셈»인지 여기서 가른다.
        //
        // ⚠️ **자리를 세는 것만으로는 모자란다.** `josaMismatches` 는 수식이 수로
        //    끝날 때만 판정한다(`trailingReadNumber` 가 글자로 끝나면 `null`). 처음에
        //    자리만 세었더니 `75X` 가 `$C$가` 하나로 40판에서 40자리를 채웠는데,
        //    그 자리는 자가 **한 번도 읽지 않는다** — 실제로 판정되는 자리는 **0** 이었다.
        //    그래서 여기서는 **수로 끝나는 자리만** 센다.
        let sites = 0;
        for (const [seed, v] of BULK.slice(0, 40)) {
          const p = build(e.key, seed, v);
          for (const m of `${p.content}\n${p.solution}`.matchAll(
            /\$([^$]*)\$(을|를|은|는|와|과|가)/g,
          )) {
            if (/\d$/.test(m[1]!)) sites += 1;
          }
        }
        expect(sites, `${e.key} 조사 자가 실제로 읽는 자리`).toBeGreaterThan(
          40,
        );
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
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 넷 이상**을
        //    요구한다 — 그래야 「등식이 다 맞는다」가 마지막 줄 하나만 보는 셈이 안 된다.
        expect(seen).toBeGreaterThan(220 * 4);
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

      it("🔴 지면에 분수가 **한 자리도 없다** (㉰ 가 구조적으로 0 인 것을 못 박는다)", () => {
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
        // 🔴 「기약이다」가 «깨끗»인지 «못 셈»인지 가른다. 이 넷은 나눗셈을 전부
        //    `\div` 로 적으므로 분수가 0 자리여야 하고, 누가 분수를 넣으면 **여기가
        //    먼저 빨개져** 위 기약 검사를 살리게 한다.
        expect(seen, `${e.key} 분수 자리`).toBe(0);
        // 그 자가 살아 있는지 — 분수가 있는 글에서는 찾아낸다.
        expect(numericFractions("$\\dfrac{3}{4}$")).toEqual([[3, 4]]);
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

      it("🔴 변형 폭 — 같은 씨앗에서 `variant` 를 `0..floor-1` 로 돌리면 전부 다르다", () => {
        const floor = VARIANT_FLOOR[e.key]!;
        const seeds: number[] = [];
        for (let s = 0; s < 40; s += 1) seeds.push(1000003 + s * 7919);
        const sizes = seeds.map((s) => {
          const set = new Set<string>();
          for (let v = 0; v < floor; v += 1)
            set.add(build(e.key, s, v).content);
          return set.size;
        });
        expect(Math.min(...sizes), `${e.key} 변형 폭 최소`).toBe(floor);
        expect(sizes).toHaveLength(40);
      });

      it("변형 공간이 열 문항보다 훨씬 넓다 — 660판에서 발문이 겹치지 않는다", () => {
        const seen = new Set<string>();
        for (const [seed, v] of WIDE) seen.add(build(e.key, seed, v).content);
        expect(seen.size).toBeGreaterThanOrEqual(500);
      });

      it("🔴 ㉴ 정답 쏠림 — 씨앗 블록 셋에서 최빈 정답이 모두 12% 미만이다", () => {
        const rates: number[] = [];
        for (const block of BLOCKS) {
          const freq = new Map<number, number>();
          for (const [seed, v] of block) {
            const a = answerNumber(build(e.key, seed, v).answer);
            freq.set(a, (freq.get(a) ?? 0) + 1);
          }
          const top = Math.max(...freq.values());
          rates.push((top / block.length) * 100);
          // 서로 다른 답이 열보다 많아야 「최빈이 낮다」가 뜻을 가진다.
          expect(freq.size, `${e.key} 서로 다른 답`).toBeGreaterThan(10);
        }
        expect(rates.length).toBe(3);
        expect(
          Math.max(...rates),
          `${e.key} 블록별 최빈 ${rates.map((r) => r.toFixed(2)).join(" / ")}%`,
        ).toBeLessThan(12);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`73X` — **해당 없음**: 후보 목록이 없다. 대신 묻는 쪽이 갈리는 것을 잰다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다. 이 유형은 두 도수가 합·차로
    // 한 번에 굳으므로 «어느 후보인가»를 고르는 자리가 아예 없다. 그 대신
    // 「큰 쪽을 묻는가 작은 쪽을 묻는가」가 씨앗을 가로질러 갈리는지 잰다 —
    // 한쪽만 나오면 학생이 늘 같은 값을 답하게 된다.
    let askBig = 0;
    for (const [s, v] of WIDE) {
      const p = build(K73, s, v);
      if (p.facts.x === p.facts.big) askBig += 1;
    }
    expect(askBig).toBeGreaterThan(WIDE.length * 0.3);
    expect(askBig).toBeLessThan(WIDE.length * 0.7);
  });

  it("`74X` — 살아남는 $a$ 의 **자리**가 씨앗을 가로질러 갈린다", () => {
    const first: number[] = [];
    const last: number[] = [];
    const slots = new Set<number>();
    for (const [s, v] of WIDE) {
      const p = build(K74, s, v);
      const a = p.facts.a!;
      const stop = p.facts.stop!;
      slots.add(a);
      if (a === 3) first.push(a);
      if (a === stop - 1) last.push(a);
    }
    // 세 자리 이상에서 살아남아야 「굳힘이 어느 후보인가를 고른다」가 참이다.
    expect(slots.size).toBeGreaterThanOrEqual(3);
    // 늘 첫 자리이거나 늘 마지막 자리이면 굳힘이 장식이다.
    expect(first.length).toBeLessThan(WIDE.length);
    expect(last.length).toBeLessThan(WIDE.length);
    expect(first.length + last.length).toBeLessThan(WIDE.length);
  });

  it("`75X` — **해당 없음**: 후보 목록이 없다. 대신 $A$ 의 부호가 갈리는 것을 잰다", () => {
    let posCoef = 0;
    let posConst = 0;
    for (const [s, v] of WIDE) {
      const p = build(K75, s, v);
      if (p.facts.a1! > 0) posCoef += 1;
      if (p.facts.a0! > 0) posConst += 1;
    }
    for (const c of [posCoef, posConst]) {
      expect(c).toBeGreaterThan(WIDE.length * 0.3);
      expect(c).toBeLessThan(WIDE.length * 0.7);
    }
  });

  it("`76X` — 살아남는 짝의 **자리**가 씨앗을 가로질러 갈린다", () => {
    const slots = new Set<number>();
    let firstSlot = 0;
    let lastSlot = 0;
    for (const [s, v] of WIDE) {
      const p = build(K76, s, v);
      const small = p.facts.small!;
      const pairs = p.facts.pairs!;
      slots.add(small);
      if (small === 1) firstSlot += 1;
      if (small === pairs) lastSlot += 1;
    }
    expect(slots.size).toBeGreaterThanOrEqual(5);
    // 작은 도수가 $3$ 이상이므로 첫 자리는 **구조적으로 안 나온다** — 그 사실을 찍는다.
    expect(firstSlot).toBe(0);
    expect(lastSlot).toBeLessThan(WIDE.length);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 이 파일 안에 세운 축
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 판정기의 `AXES` 를 **여기 대신 둔다**(머리말 참조). 두 함수의 뜻은 그쪽과 같다.
 *  - `withoutBinding` — 굳힘 조건을 **지웠을 때** 나오는 값. 답과 같으면 굳힘이 장식이다.
 *  - `perturbed` — 굳힘 인자를 **흔들었을 때** 나오는 값. 답과 같으면 굳힘이 항등식이다.
 */
type Axis = {
  /**
   * 굳힘을 지웠을 때 학생이 낼 수 있는 **정해진** 답. 지우면 답이 아예 안 정해지는
   * 유형(`74X`)은 `null` 을 내고, 그 대신 아래 「후보가 여럿 남는다」로 잰다.
   */
  withoutBinding: (f: Record<string, number>) => number | null;
  /** 굳힘 인자를 흔들었을 때의 답. 원래 답과 같으면 굳힘이 항등식이다. */
  perturbed: (f: Record<string, number>) => number;
};

const AXES_LOCAL: Record<string, Axis> = {
  // 73X — 굳힘은 「넓이의 차 ÷ 계급의 크기 = 도수의 차」. 그것을 지우면 차를 모르므로
  //       학생이 할 수 있는 것은 「두 도수가 같다」로 놓는 것뿐이다(합의 절반).
  [K73]: {
    withoutBinding: (f) => (f.sum! % 2 === 0 ? f.sum! / 2 : null),
    perturbed: (f) => {
      const d = f.area! / f.w! + 2;
      const big = (f.sum! + d) / 2;
      return f.x === f.big ? big : f.sum! - big;
    },
  },
  /**
   * 74X — 굳힘은 모서리의 곱이다. 그것을 지우면 꼭짓점 식만 남아 $a$ 가 **하나로
   * 안 정해진다**(후보가 셋~일곱). 그래서 여기서는 `withoutBinding` 이 낼 «정해진 답»이
   * 아예 없다 — `null` 을 내고, 대신 아래 「후보가 여럿 남고 그중 하나만 답을 낸다」로 잰다.
   *
   * ⚠️ 처음에는 「학생이 $a=3$ 으로 찍는다」를 굳힘 없는 답으로 삼았다. 그런데 그 값은
   *    **$a$ 가 정말 $3$ 인 판에서 맞는다** — 실측 220판 중 **17판**이 그랬고, 그러면
   *    「굳힘 없는 답 0%」가 빨개진다. 그 빨강은 굳힘이 장식이라는 뜻이 아니라
   *    **내 축이 틀렸다**는 뜻이었다(2026-08-29 「판정이 놀라운 값을 내면 재는 쪽을 먼저
   *    의심하라」). 축을 고치고 그 사실을 여기 적어 둔다.
   */
  [K74]: {
    withoutBinding: () => null,
    perturbed: (f) => {
      const alive = polyhedronScan(f.vSum! - 1, f.edgeProduct! + 6);
      if (alive.length === 0) return -1;
      const a = alive[0]!;
      const b = f.vSum! - 1 - 2 * a;
      return (a + 2) * (b + 1);
    },
  },
  // 75X — 굳힘은 「세 식을 모두 더하면 $A+B+C$ 의 $2$배」. 그것을 지우면 학생이 할 수
  //       있는 것은 $A+B$ 를 그대로 $A$ 로 보는 것뿐이다.
  [K75]: {
    withoutBinding: (f) => f.p1! + f.p0!,
    perturbed: (f) => {
      const back = sumOfPairSums(
        [f.p1!, f.p0!],
        [f.q1! + 2, f.q0!],
        [f.r1!, f.r0!],
      );
      return back === null ? -999 : back[0] + back[1];
    },
  },
  // 76X — 굳힘은 도수의 곱. 그것을 지우면 합만 남아 「두 도수가 같다」로 놓게 된다.
  [K76]: {
    withoutBinding: (f) => (f.sum! % 2 === 0 ? f.sum! / 2 : null),
    perturbed: (f) => {
      const pair = factorPairWithSum(f.sum!, f.product! + 1);
      if (pair === null) return -1;
      return f.x === f.big ? pair[1] : pair[0];
    },
  },
};

/**
 * 🔴 **굳힘을 지우면 후보가 몇 개 남고, 그중 몇 개가 지면의 답을 내는가.**
 *
 * 「하나만 남는다」면 굳힘이 아무 일도 안 한 것이고, 「둘 이상이 답을 낸다」면 발문의
 * 답이 안 정해진다. 둘 다 아니어야 굳힘이 **실제로 후보를 고른다.**
 */
function candidatesWithoutBinding(
  key: string,
  f: Record<string, number>,
): { total: number; matching: number } {
  if (key === K73 || key === K76) {
    // 합만 알 때: 합이 `sum` 인 서로 다른 두 자연수 짝 전부.
    let total = 0;
    let matching = 0;
    for (let small = 1; small * 2 < f.sum!; small += 1) {
      total += 1;
      const big = f.sum! - small;
      const cand = f.x === f.big ? big : small;
      if (cand === f.x) matching += 1;
    }
    return { total, matching };
  }
  if (key === K74) {
    // 꼭짓점 식만 알 때: $b\ge3$ 인 $a$ 전부.
    let total = 0;
    let matching = 0;
    for (let a = 3; f.vSum! - 1 - 2 * a >= 3; a += 1) {
      const b = f.vSum! - 1 - 2 * a;
      total += 1;
      const vals = [
        (a + 2) * (b + 1),
        2 * a * (b + 1),
        (a + 2) * (2 * b),
        3 * a * (b + 1),
      ];
      // 지면이 무엇을 물었는지는 `facts` 에 없으므로, 참 후보 $a$ 가 내는 값과 같은
      // 것을 내는 후보를 센다(참 $a$ 는 반드시 하나 세어진다).
      const trueA = f.a!;
      const trueB = f.b!;
      const trueVals = [
        (trueA + 2) * (trueB + 1),
        2 * trueA * (trueB + 1),
        (trueA + 2) * (2 * trueB),
        3 * trueA * (trueB + 1),
      ];
      const idx = trueVals.indexOf(f.x!);
      if (idx >= 0 && vals[idx] === f.x) matching += 1;
    }
    return { total, matching };
  }
  throw new Error(`후보 세는 법이 없는 유형: ${key}`);
}

describe("중1 5차c 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  for (const key of KEYS) {
    it(`${key.split("|")[2]} — 굳힘 인자를 흔들면 답이 늘 달라진다 (220판)`, () => {
      const axis = AXES_LOCAL[key]!;
      let same = 0;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const got = axis.perturbed(p.facts);
        expect(Number.isFinite(got), `${key} 흔든 답이 수가 아니다`).toBe(true);
        if (got === answerNumber(p.answer)) same += 1;
      }
      expect(same).toBe(0);
    });
  }

  for (const key of [K73, K75, K76]) {
    it(`${key.split("|")[2]} — 굳힘을 지운 답이 정답과 같은 판 $0$건 (220판)`, () => {
      const axis = AXES_LOCAL[key]!;
      let noBind = 0;
      let sites = 0;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const wb = axis.withoutBinding(p.facts);
        if (wb === null) continue;
        sites += 1;
        if (wb === answerNumber(p.answer)) noBind += 1;
      }
      expect(noBind).toBe(0);
      // 🔴 「$0$건」이 «깨끗»인지 «못 셈»인지 가른다 — 굳힘 없는 답을 실제로 만들었나.
      expect(
        sites,
        `${key} 굳힘 없는 답을 한 판도 못 만들었다`,
      ).toBeGreaterThan(50);
    });
  }

  for (const key of [K73, K74, K76]) {
    it(`${key.split("|")[2]} — 굳힘을 지우면 후보가 여럿 남고 그중 **하나만** 답을 낸다 (220판)`, () => {
      let minTotal = 999;
      for (const [s, v] of BULK) {
        const p = build(key, s, v);
        const { total, matching } = candidatesWithoutBinding(key, p.facts);
        expect(matching, `${key} ${s}/${v} 답을 내는 후보`).toBe(1);
        minTotal = Math.min(minTotal, total);
      }
      // 후보가 하나뿐이면 굳힘이 아무 일도 안 한 것이다.
      expect(
        minTotal,
        `${key} 굳힘 없이 남는 후보의 최솟값`,
      ).toBeGreaterThanOrEqual(2);
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 나열 줄을 한 줄씩 다시 셈한다
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`73X` — 나눗셈·합·「합과 차」 줄이 모두 참이다 (220판)", () => {
    let checked = 0;
    for (const [s, v] of BULK) {
      const p = build(K73, s, v);
      const { n, width, f1, f2, area } = read73(p.content);
      const [d1, d2, d3] = grab(
        /나눈 값인 \$(\d+)\\div(\d+)=(\d+)\$이다\./,
        p.solution,
        "73X 나눗셈 줄",
      );
      expect(num(d1!)).toBe(area);
      expect(num(d2!)).toBe(width);
      expect(num(d3!) * width).toBe(area);
      const [s1, s2, s3, s4] = grab(
        /도수의 합은 \$(\d+)-(\d+)-(\d+)=(\d+)\$이다\./,
        p.solution,
        "73X 합 줄",
      );
      expect([num(s1!), num(s2!), num(s3!)]).toEqual([n, f1, f2]);
      expect(num(s4!)).toBe(n - f1 - f2);
      const [b1, b2, b3, b4, b5] = grab(
        /큰 도수는 \$\((\d+)\+(\d+)\)\\div2=(\d+)\$이고, 작은 도수는 \$(\d+)-\3=(\d+)\$이다\./,
        p.solution,
        "73X 합과 차 줄",
      );
      expect(num(b1!)).toBe(n - f1 - f2);
      expect(num(b2!)).toBe(area / width);
      expect(num(b3!) * 2).toBe(num(b1!) + num(b2!));
      expect(num(b4!)).toBe(num(b1!));
      expect(num(b5!)).toBe(num(b1!) - num(b3!));
      // 큰 쪽이 정말 크다.
      expect(num(b3!)).toBeGreaterThan(num(b5!));
      checked += 1;
    }
    expect(checked).toBe(220);
  });

  it("`74X` — $a$ 마다 두 수와 곱 판정이 맞고, 「모두」가 전수 탐색과 같다 (220판)", () => {
    let lines = 0;
    for (const [s, v] of BULK) {
      const p = build(K74, s, v);
      const { edgeProduct, vSum } = read74(p.content);
      const rows = [
        ...p.solution.matchAll(
          /\$a=(\d+)\$이면 \$b=(\d+)-1-(\d+)=(\d+)\$이고, 모서리의 개수는 각각 \$(\d+)\$(?:와|과) \$(\d+)\$이므로 그 곱은 \$(\d+)\\times(\d+)=(\d+)\$이다\. 이것은 \$(\d+)\$(?:(?:와|과) 같으므로 조건에 맞는다|(?:이|가) 아니므로 조건에 맞지 않는다)\./g,
        ),
      ];
      // ㉴ 훑는 자리가 선언한 제약과 맞는가 — $a=3$ 부터, $b\ge3$ 인 동안.
      const scanned = rows.map((m) => Number(m[1]));
      expect(scanned[0], "74X: 훑기가 $a=3$ 에서 시작하지 않는다").toBe(3);
      expect(scanned).toEqual(scanned.map((_, i) => i + 3));
      let alive = 0;
      for (const m of rows) {
        const a = Number(m[1]);
        expect(Number(m[2])).toBe(vSum);
        expect(Number(m[3])).toBe(2 * a);
        expect(Number(m[4])).toBe(vSum - 1 - 2 * a);
        expect(Number(m[4])).toBeGreaterThanOrEqual(3);
        expect(Number(m[5])).toBe(3 * a);
        expect(Number(m[6])).toBe(2 * Number(m[4]));
        expect(Number(m[7])).toBe(3 * a);
        expect(Number(m[8])).toBe(2 * Number(m[4]));
        expect(Number(m[9])).toBe(3 * a * 2 * Number(m[4]));
        expect(Number(m[10])).toBe(edgeProduct);
        // 판정 낱말이 실제 값과 맞는가 — 「맞는다」와 「맞지 않는다」를 갈라 본다.
        const says =
          m[0].includes("와 같으므로 조건에 맞는다") ||
          m[0].includes("과 같으므로 조건에 맞는다");
        expect(says, `74X 판정 낱말이 값과 어긋난다 — ${m[0]}`).toBe(
          Number(m[9]) === edgeProduct,
        );
        if (says) alive += 1;
        lines += 1;
      }
      expect(alive, "74X: 살아남는 줄이 정확히 하나가 아니다").toBe(1);
      // 멈추는 자리가 제약 그대로인가.
      const [stopText] = grab(
        /\$a\$가 \$(\d+)\$ 이상이면 \$b\$가 \$3\$보다 작아져/,
        p.solution,
        "74X 멈춤 줄",
      );
      const stop = num(stopText!);
      expect(vSum - 1 - 2 * stop).toBeLessThan(3);
      expect(vSum - 1 - 2 * (stop - 1)).toBeGreaterThanOrEqual(3);
      expect(rows).toHaveLength(stop - 3);
      // 「모두」가 전수 탐색과 같은가 — 여기서는 $a$·$b$ 를 둘 다 훑는다.
      const brute: number[] = [];
      for (let a = 3; a <= 60; a += 1) {
        for (let b = 3; b <= 60; b += 1) {
          if (2 * a + b + 1 === vSum && 3 * a * (2 * b) === edgeProduct) {
            brute.push(a);
          }
        }
      }
      expect(brute).toHaveLength(1);
      expect(rows.filter((m) => m[0].includes("맞는다.")).length).toBe(1);
      // 다면체 이름이 밑면의 변의 개수와 맞는가 (`$5$각기둥` 이 아니라 「오각기둥」).
      const a0 = brute[0]!;
      const b0 = vSum - 1 - 2 * a0;
      const prism = read74(p.content).prism;
      const stemWord = prism === "각기둥" ? "기둥" : "뿔대";
      expect(p.solution).toContain(`${SINO[a0]}각${stemWord}`);
      expect(p.solution).toContain(`${SINO[b0]}각뿔`);
      expect(p.solution).not.toMatch(/\$\d+\$각(기둥|뿔대|뿔)/);
      // 「두 가지」 셈말이 개수와 맞는가.
      expect(p.solution).toContain(`${COUNT_WORD[2]} 가지뿐이다`);
    }
    expect(lines).toBeGreaterThan(220 * 3);
  });

  it("`75X` — 동류항 합·나누기·빼기 줄이 모두 참이다 (220판)", () => {
    let checked = 0;
    for (const [s, v] of BULK) {
      const p = build(K75, s, v);
      const { p: pp, q, r } = read75(p.content);
      const [c1, c2] = grab(
        /동류항끼리 더하면 \$x\$의 계수는 \$(.+?)\$이고 상수항은 \$(.+?)\$이므로/,
        p.solution,
        "75X 동류항 줄",
      );
      const readEq = (src: string): [number[], number] => {
        const parts = src.split("=");
        expect(parts).toHaveLength(2);
        const terms = [...parts[0]!.matchAll(/-?\d+/g)].map((m) =>
          Number(m[0]),
        );
        return [terms, Number(parts[1])];
      };
      const [t1, v1] = readEq(c1!);
      expect(t1).toEqual([pp[0], q[0], r[0]]);
      expect(v1).toBe(pp[0] + q[0] + r[0]);
      const [t0, v0] = readEq(c2!);
      expect(t0).toEqual([pp[1], q[1], r[1]]);
      expect(v0).toBe(pp[1] + q[1] + r[1]);
      const [d1, d2, d3, d4] = grab(
        /\$(-?\d+)\\div2=(-?\d+)\$, 상수항은 \$(-?\d+)\\div2=(-?\d+)\$이고/,
        p.solution,
        "75X 나누기 줄",
      );
      expect(num(d1!)).toBe(v1);
      expect(num(d2!) * 2).toBe(v1);
      expect(num(d3!)).toBe(v0);
      expect(num(d4!) * 2).toBe(v0);
      const [e1, e2] = grab(
        /\$x\$의 계수를 뺀 \$(.+?)\$이고, 상수항은 같은 방법으로 \$(.+?)\$이다\./,
        p.solution,
        "75X 빼기 줄",
      );
      const [u1, w1] = readEq(e1!);
      expect(u1[0]).toBe(v1 / 2);
      expect(u1[0]! + u1[1]!).toBe(w1);
      expect(w1).toBe(v1 / 2 - q[0]);
      const [u0, w0] = readEq(e2!);
      expect(u0[0]).toBe(v0 / 2);
      expect(w0).toBe(v0 / 2 - q[1]);
      expect(w1 + w0).toBe(answerNumber(p.answer));
      checked += 1;
    }
    expect(checked).toBe(220);
  });

  it("`76X` — 짝 목록·곱 목록·셈말이 모두 참이고, 「모두」가 전수 탐색과 같다 (220판)", () => {
    let items = 0;
    for (const [s, v] of BULK) {
      const p = build(K76, s, v);
      const { n, f1, f2, product } = read76(p.content);
      const sum = n - f1 - f2;
      const [g1, g2, g3, g4] = grab(
        /도수의 합은 \$(\d+)-(\d+)-(\d+)=(\d+)\$이다\./,
        p.solution,
        "76X 합 줄",
      );
      expect([num(g1!), num(g2!), num(g3!), num(g4!)]).toEqual([
        n,
        f1,
        f2,
        sum,
      ]);
      const [pairText, countWord] = grab(
        /가능한 짝은 (.+?)의 (\S+) 가지이다\./,
        p.solution,
        "76X 짝 줄",
      );
      const pairNums = [...pairText!.matchAll(/\$(\d+)\$/g)].map((m) =>
        Number(m[1]),
      );
      expect(pairNums.length % 2).toBe(0);
      const pairCount = pairNums.length / 2;
      expect(pairCount).toBe(Math.floor(sum / 2));
      expect(countWord).toBe(COUNT_WORD[pairCount]);
      for (let k = 0; k < pairCount; k += 1) {
        expect(pairNums[2 * k]).toBe(k + 1);
        expect(pairNums[2 * k + 1]).toBe(sum - (k + 1));
        // 접속 조사가 지면 글자와 맞는가 (`$3$과 $4$`).
        expect(pairText).toContain(
          `$${k + 1}$${conjJosaFor(k + 1)} $${sum - (k + 1)}$`,
        );
      }
      const prodRows = [
        ...p.solution.matchAll(/\$(\d+)\\times(\d+)=(\d+)\$/g),
      ].filter((m) => Number(m[1]) + Number(m[2]) === sum);
      expect(prodRows).toHaveLength(pairCount);
      let alive = 0;
      for (const m of prodRows) {
        expect(Number(m[3])).toBe(Number(m[1]) * Number(m[2]));
        if (Number(m[3]) === product) alive += 1;
        items += 1;
      }
      expect(alive, "76X: 곱이 맞는 짝이 정확히 하나가 아니다").toBe(1);
      // 「모두」가 전수 탐색과 같은가 — 여기서는 곱을 인수분해해서 본다.
      const brute: number[] = [];
      for (let d = 1; d * d <= product; d += 1) {
        if (product % d === 0 && d + product / d === sum) brute.push(d);
      }
      expect(brute).toHaveLength(1);
      const small = brute[0]!;
      expect(p.solution).toContain(
        `$${small}$${conjJosaFor(small)} $${product / small}$뿐이므로`,
      );
      // 주격 조사가 붙는 자리는 없지만, 정답 줄의 「명」 단위는 늘 붙는다.
      expect(p.solution).toContain(
        `따라서 구하는 도수는 $${p.facts.x}$명이다.`,
      );
    }
    expect(items).toBeGreaterThan(220 * 4);
  });

  it("🔴 「이/가」 자리를 **직접** 잰다 — 공용 자의 사각 (74X, 220판)", () => {
    // `josaMismatches` 는 「이」를 안 본다(서술격과 안 갈려서). 74X 의 판정 줄에는
    // 「$270$이 아니므로」·「$270$과 같으므로」가 판마다 여러 번 나오므로 여기서 잰다.
    let sites = 0;
    for (const [s, v] of BULK) {
      const p = build(K74, s, v);
      const { edgeProduct } = read74(p.content);
      for (const m of p.solution.matchAll(
        /이것은 \$(\d+)\$(이|가) 아니므로/g,
      )) {
        expect(m[2], `74X 「이/가」 — $${m[1]}$`).toBe(
          subjectJosaFor(Number(m[1])),
        );
        expect(Number(m[1])).toBe(edgeProduct);
        sites += 1;
      }
      for (const m of p.solution.matchAll(
        /이것은 \$(\d+)\$(와|과) 같으므로/g,
      )) {
        expect(m[2], `74X 「와/과」 — $${m[1]}$`).toBe(
          conjJosaFor(Number(m[1])),
        );
        sites += 1;
      }
    }
    expect(sites).toBeGreaterThan(220 * 3);
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
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
    for (const e of M1_TOP_5C) {
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

  it("🔴 `74X` 의 훑는 자리 상한이 산출물에 실제로 걸린다", () => {
    // 이 상한이 곧 해설 높이다. 실측으로 한 줄이 53.5px 이므로 여덟 줄이면 700px 을
    // 넘는다 — 상한을 올리면 위 검사가 빨개진다.
    let maxLines = 0;
    let minLines = 99;
    for (const [s, v] of WIDE) {
      const p = build(K74, s, v);
      maxLines = Math.max(maxLines, p.facts.lines!);
      minLines = Math.min(minLines, p.facts.lines!);
    }
    expect(maxLines).toBe(7);
    expect(minLines).toBe(3);
  });

  it("🔴 `76X` 의 짝 상한이 산출물에 실제로 걸린다", () => {
    let maxPairs = 0;
    let minPairs = 99;
    for (const [s, v] of WIDE) {
      const p = build(K76, s, v);
      maxPairs = Math.max(maxPairs, p.facts.pairs!);
      minPairs = Math.min(minPairs, p.facts.pairs!);
    }
    expect(maxPairs).toBe(17);
    // 아래 상한(넷)도 실제로 걸린다. 660판에서 관측된 최솟값은 **다섯**이다 —
    // 짝이 넷이려면 두 도수의 합이 $8$~$9$ 인데, 작은 도수가 $3$ 이상이고 학생 수가
    // $20$ 이상이어야 해서 창이 아주 좁다. 「넷」은 여기서 상한이지 관측값이 아니다.
    expect(minPairs).toBeGreaterThanOrEqual(4);
    expect(minPairs).toBeLessThanOrEqual(6);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5C) {
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

  it("🔴 5차c 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    /**
     * 🔴 **문턱 $0.20$ 은 실측에서 나왔다.**
     *
     * 처음 판에서 `73X` ↔ `76X` 가 **0.543** 이었다 — 둘 다 「어느 중학교 학생 $N$명의
     * … 조사하여 …. 계급의 크기는 …이고 …」로 시작해 뼈대가 통째로 같았다. 소재 표를
     * 갈라 놓은 것만으로는 모자랐고, `76X` 의 **말투를 바꿔** **0.148** 로 내렸다.
     * 지금 여섯 쌍의 실측: `73X`↔`74X` 0.021 · `73X`↔`75X` 0.027 · `73X`↔`76X` 0.148 ·
     * `74X`↔`75X` 0.083 · `74X`↔`76X` 0.064 · `75X`↔`76X` 0.053.
     *
     * ⚠️ 같은 중단원 형제쌍의 기준선은 훨씬 높다(실측 중앙값: 히스토그램 0.259 ·
     *    다면체 0.143 · 일차식의 뜻Ⅱ 0.071 · 도수분포표 **0.429**). 그러니 이 문턱을
     *    「형제보다 낮아야 한다」로 잡으면 도수분포표 쪽에서 **아무것도 안 지킨다** —
     *    그래서 실측 최댓값(0.148)에 여유를 얹은 **고정 문턱**으로 못 박는다.
     */
    const pages = M1_TOP_5C.map((e) => build(e.key, OVERLAP_SEED));
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const j1 = koreanJaccard(pages[i]!.content, pages[j]!.content);
        expect(j1, `${KEYS[i]} ↔ ${KEYS[j]} ${j1.toFixed(3)}`).toBeLessThan(
          0.2,
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

  it("🔴 `73X` 와 `76X` 의 소재 표가 겹치지 않는다 — 같은 시험지에서 같은 이야기가 두 번 안 나온다", () => {
    // ⚠️ 두 발문의 말투가 다르므로 읽는 규칙도 다르다 — 한 정규식으로 둘을 읽으려
    //    하면 그 자체가 「둘이 닮았다」를 전제한 것이 된다.
    const stems = (key: string, re: RegExp): Set<string> => {
      const out = new Set<string>();
      for (const [s, v] of WIDE) {
        const m = re.exec(build(key, s, v).content);
        if (m === null) throw new Error(`${key}: 소재를 못 읽었다`);
        out.add(m[1]!);
      }
      return out;
    };
    const a = stems(K73, /명의 (.+?) 조사하여 히스토그램/);
    const b = stems(K76, /학생을 대상으로 (.+?) 조사한 뒤/);
    expect(a.size).toBeGreaterThanOrEqual(5);
    expect(b.size).toBeGreaterThanOrEqual(5);
    expect(
      [...a].filter((x) => b.has(x)),
      "소재가 겹친다",
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// 판정기의 자를 미리 댄다
// ═══════════════════════════════════════════════════════════

describe("중1 5차c 확대 갈래 — 판정기의 자를 미리 댄다", () => {
  it("🔴 ㉵ 지면 수 조합이 답과 부딪히지 않는다 (220판, 판정기의 자를 그대로 쓴다)", () => {
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

  it("🔴 `74X` 의 지면에는 수가 **둘뿐**이라 그 자가 구조적으로 약하다 — 그 사실을 찍는다", () => {
    // 「0건」을 «깨끗»으로 읽지 않기 위해, 이 유형에서 그 자가 만들 수 있는 후보가
    // 몇 개인지 세어 둔다. 실측 전수(창 128판)에서 걸림 **0건** · 우연 수준 1.56%.
    const p = build(K74, SEEDS[0]!);
    const nums = pageNumbers(p.content);
    expect(nums).toHaveLength(2);
    const cand = obviousCandidates(nums);
    expect(new Set(cand.values()).size).toBeLessThanOrEqual(8);
  });

  it("🔴 지면 수의 **개수**를 못 박는다 — 그 개수가 그 자의 힘을 정한다", () => {
    /**
     * 실측 전수(D-20 원장): 지면 수 조합 가드의 걸림률 대 우연 수준은
     * `73X` **65.27% vs 67.3%**(0.97배 — 우연보다 낮다) · `74X` **0.00% vs 1.6%**(구조적 0) ·
     * `75X` **83.32% vs 62.7%**(1.33배) · `76X` **79.21% vs 70.6%**(1.12배)다.
     * 갈리는 것은 유형의 «뻔함»이 아니라 **지면에 수가 몇 개 찍히는가**다 —
     * 걸림률만 보고 「이 유형이 더 뻔하다」로 읽지 말라는 뜻을 여기 못 박는다.
     */
    for (const [seed, v] of BULK.slice(0, 40)) {
      expect(pageNumbers(build(K73, seed, v).content)).toHaveLength(19);
      expect(pageNumbers(build(K74, seed, v).content)).toHaveLength(2);
      expect(pageNumbers(build(K76, seed, v).content)).toHaveLength(15);
      // 75X 는 계수가 $1$·$-1$ 이면 그 수를 안 찍으므로 넷~여섯이다.
      const n75 = pageNumbers(build(K75, seed, v).content).length;
      expect(n75).toBeGreaterThanOrEqual(4);
      expect(n75).toBeLessThanOrEqual(6);
    }
  });

  it("🔴 생성기의 `printedNumbers` 와 판정기의 `pageNumbers` 가 **같은 것**을 낸다", () => {
    // 둘이 갈라지면 생성기가 막는 것과 판정기가 세는 것이 달라진다 — 그 순간
    // 「걸림 0건」이 아무것도 증명하지 않는다.
    let checked = 0;
    for (const key of KEYS) {
      for (const [seed, v] of BULK.slice(0, 40)) {
        const c = build(key, seed, v).content;
        expect(printedNumbers(c), `${key} ${seed}/${v}`).toEqual(
          pageNumbers(c),
        );
        checked += 1;
      }
    }
    expect(checked).toBe(160);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 🔴 ㉳ 해설의 «말» — **판정을 진술하는 문장**을 지키는 자
//
// 4차 물결 검문에서 참인 문장을 거짓으로 뒤집는 변이 13개 중 10개가 초록이었다 —
// 「$x$는 $a$의 **약수**」를 「배수」로 바꿔도 아무 시험도 안 물었다. 굳힘 개념과
// 마무리 논거가 통째로 그 문장들 안에 있다.
//
// ⚠️ 값 검산·KaTeX·해설 높이·조사 자는 이 부류를 **구조적으로** 못 본다 —
//    문장이 거짓이어도 값은 그대로이기 때문이다(2026-08-24 「값이 맞으면 시험이
//    다 초록이다」와 같은 자리).
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」. */
function requiredWords(key: string): string[] {
  if (key === K73) {
    return [
      "직사각형의 넓이는 계급의 크기와 도수의 곱과 같다",
      "넓이의 차를 계급의 크기로 나눈 값인",
      "더하면 큰 도수의 $2$배이므로",
      "직사각형의 넓이가 더 크므로 그 계급의 도수가 더 큰",
    ];
  }
  if (key === K74) {
    return [
      "밑면은 다각형이므로 $a$와 $b$는 모두 $3$ 이상인 자연수이다",
      "모서리가 $3\\times a$개이고",
      "각뿔은 꼭짓점이 $b+1$개, 모서리가 $2\\times b$개이다",
      "$b$가 $3$보다 작아져 밑면이 다각형이 될 수 없으므로",
    ];
  }
  if (key === K75) {
    return [
      "$A$, $B$, $C$가 각각 두 번씩 더해지므로",
      "$A+B+C$의 $2$배와 같다",
      "동류항끼리 더하면",
      "$A=(A+B+C)-(B+C)$이므로",
    ];
  }
  if (key === K76) {
    return [
      "도수의 총합은 각 계급의 도수를 모두 더한 것이므로",
      "두 계급의 도수는 모두 자연수이고 그 합이",
      "도수가 더 크므로 그 도수는",
    ];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K73]: [
    ["계급의 크기와 도수의 곱과 같다", "계급의 크기와 도수의 합과 같다"],
    ["계급의 크기로 나눈 값인", "계급의 크기로 곱한 값인"],
    ["큰 도수의 $2$배이므로", "작은 도수의 $2$배이므로"],
    ["그 계급의 도수가 더 큰", "그 계급의 도수가 더 작은"],
  ],
  [K74]: [
    ["모두 $3$ 이상인 자연수이다", "모두 $2$ 이상인 자연수이다"],
    ["모서리가 $3\\times a$개이고", "모서리가 $4\\times a$개이고"],
    ["모서리가 $2\\times b$개이다", "모서리가 $3\\times b$개이다"],
    ["$3$보다 작아져 밑면이", "$3$보다 커져 밑면이"],
  ],
  [K75]: [
    ["각각 두 번씩 더해지므로", "각각 세 번씩 더해지므로"],
    ["$A+B+C$의 $2$배와 같다", "$A+B+C$의 $3$배와 같다"],
    ["동류항끼리 더하면", "모든 항끼리 더하면"],
    ["$A=(A+B+C)-(B+C)$이므로", "$A=(A+B+C)-(C+A)$이므로"],
  ],
  [K76]: [
    ["도수를 모두 더한 것이므로", "도수를 모두 곱한 것이므로"],
    ["도수는 모두 자연수이고", "도수는 모두 유리수이고"],
    ["도수가 더 크므로 그 도수는", "도수가 더 작으므로 그 도수는"],
  ],
};

function missingWords(key: string, solution: string): string[] {
  return requiredWords(key).filter((w) => !solution.includes(w));
}

describe("[중1 5차c] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
  it("네 유형 모두 — 660판 전량에 그 문장들이 있다", () => {
    let checked = 0;
    for (const key of KEYS) {
      for (const [seed, variant] of WIDE) {
        const p = build(key, seed, variant);
        expect(
          missingWords(key, p.solution),
          `${key} s${seed}v${variant}`,
        ).toEqual([]);
        checked += 1;
      }
    }
    expect(checked).toBe(4 * WIDE.length);
  });

  it("눈금 — 낱말을 하나씩 뒤집으면 **전부** 빨개진다 (양성 15 · 음성 4)", () => {
    let positives = 0;
    for (const key of KEYS) {
      const p = build(key, SEEDS[0]!, 0);
      // 음성 — 손대지 않은 지면은 깨끗하다
      expect(missingWords(key, p.solution), key).toEqual([]);
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
          missingWords(key, flipped),
          `${key}: 「${from}」→「${to}」 를 아무도 안 물었다`,
        ).not.toEqual([]);
      }
    }
    expect(positives).toBe(15);
  });
});
