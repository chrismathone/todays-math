/**
 * 중1 **5차 확대 갈래 g**(`m1Top5g.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `89X` | 대각선의 개수를 **한 꼭짓점에서 $n-3$개씩** 세어 $\dfrac{n(n-3)}2$ 로 쓰고, $m$ 을 $\lfloor(S-1)/2\rfloor$ 까지만 훑는다 | 대각선의 개수를 **꼭짓점을 잇는 선분 전체에서 변을 뺀 것**으로 센다($\dfrac{n(n-1)}2-n$). 훑는 자리도 $3$부터 $S-3$까지 **전부** 본다(반으로 접지 않는다) |
 * | `90X` | $x=\dfrac{ab(p+q)}{b-a}$ 라는 **공식**을 쓴다 | 공식을 한 번도 안 쓴다 — $x=1$ 부터 올려 가며 「두 시간이 정수이고 $\dfrac xa-p=\dfrac xb+q$」인 첫 $x$ 를 **찾는다** |
 * | `91X` | $a=\dfrac{100(d_2-d_1)}{r_1-e_2}$ 라는 **공식**을 쓴다 | 원가를 $10$원부터 올려 가며 「두 조건이 같은 정가를 낸다」를 만족하는 첫 값을 **찾는다** |
 * | `92X` | 첫 조건으로 **창을 만들고** 그 안만 훑는다 | 창을 만들지 않는다 — $-300$부터 $300$까지의 정수를 **전부** 두 조건에 대 본다 |
 *
 * ## 🔴 앞 물결들이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을 재어
 *    **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑는다.
 *    ⚠️ 이 넷의 지면에는 **수 분수가 한 자리도 없다**(문자가 든 분수뿐). 그러면 그 검사는
 *    구조적으로 0 이므로, **「한 자리도 없다」는 사실 자체를 못 박고** 대신 나눗셈이
 *    `\div` 로만 적히는지를 센다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「$m<n$」·「$t$가 없어져」·「정가는
 *    하나뿐이므로」·「거리와 같다」를 **낱말과 수를 함께** 판정하고, 낱말을 뒤집으면
 *    **전부 빨개지는** 눈금(양성 19)을 같이 둔다.
 * ㉴ **지면이 자기가 세운 제약을 스스로 어긴다.** → `89X` 가 훑은 $m$ 의 최댓값이
 *    선언한 $\lfloor(S-1)/2\rfloor$ 를 **넘지 않는지** 지면 글자에서 다시 읽어 잰다.
 * ㉵㉶ **답 쏠림·지름길·손실 원장** → 씨앗 220×변형 3 에서 서로 다른 발문·정답과
 *    **최빈 정답 비율**을 재고, 지름길은 **널 모형(답을 판끼리 돌려 끼운 우연 수준)**과 견준다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 *
 * ## 🔴 변이 시험 — 이 시험이 실제로 무는가 (2026-09-03 실측)
 *
 * 순서는 셋이다: ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 빨개지나.
 * ⑵ 를 건너뛰면 「가드가 아니다」가 거짓말이 된다(2026-08-21). 변이 **전에** 손
 * 안 댄 판이 초록인지부터 봤다 — 도장은 초록을 못 내므로 그 한 줄이 이 도구가
 * «아니오»를 낼 수 있음을 회차마다 증명한다(2026-08-23).
 *
 * **가드로 기대한 13개 전부 🔴 RED** — `89X` 반씩·훑는 자리·판정 낱말·멈추는
 * 근거·지면수 / `90X` 계수 $1$·거리 공식 / `91X` 정가 식 부호·검산 줄 조사 /
 * `92X` 영포함·경계·후보안·후보합.
 *
 * **「실측 걸림 $0$ 건」이라 적어 둔 5개는 «산출물이 그대로»로 판정이 거부됐다** —
 * `89X` 유일성·흔들기 / `90X` 흔들기 / `91X` 할인차 / `92X` 답 $0$. 그것이 곧
 * 「이 줄은 막는 가드가 아니라 **불변식을 지면 옆에 적어 두는 자리**」라는 뜻이고,
 * 모듈 주석이 그 다섯을 그렇게 적어 두었다. 🔴 **「초록이니 지워라」로 읽지 말 것** —
 * 지우면 그 불변식을 다음 사람이 다시 물어야 한다.
 *
 * ⚠️ **첫 회차에 앵커 하나가 `count == 0` 으로 판정 거부됐다.** 이 파일이 **CRLF**
 *    인데 앵커를 `\n` 으로 지었기 때문이다 — 「빨개지지 않았다」가 아니라 「변이가
 *    아예 안 걸렸다」였고, 하네스가 그것을 **판정하지 않고 멈춰서** 드러났다.
 *
 * ## 🔴 리드에게 — `AXES` 는 여기서 못 채운다
 *
 * 판정기(`scripts/qa/probe-middle-top-m1.ts`)의 `AXES` 는 **공용 파일**이라 5차 물결
 * 21갈래가 동시에 도는 지금 이 갈래가 손대면 남의 것을 덮어쓴다. 그래서 축을
 * **이 파일 안에 같은 모양으로** 두고 재 둔다(`LOCAL_AXES`) — 리드가 `AXES` 에 옮겨
 * 적을 때 그대로 쓰면 된다.
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이
 * 넷을 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 —
 * 그래서 `build()` 가 제품의 후처리 **함수 자체**를 그대로 부르고, 등록되면 곧바로
 * `generateMiddleProblem` 으로 갈아탄다.
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
import { pageShortcutValues, scaledValues } from "@/lib/middle/m1Top4";
import {
  absoluteWindowCandidates,
  absoluteWindowSurvivors,
  costFromDiscounts,
  differenceTex,
  halvedSideProduct,
  lastSideToCheck,
  listPriceFromDiscounts,
  M1_TOP_5G,
  polygonDiagonals,
  sidePairFromSums,
  sumTex,
  survivorBlocks,
  travelDistance,
} from "@/lib/middle/m1Top5g";
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

const K89 = "1-2|다각형|89X";
const K90 = "1-1|일차방정식의 활용|90X";
const K91 = "1-1|일차방정식의 활용|91X";
const K92 = "1-1|정수와 유리수|92X";
const KEYS = [K89, K90, K91, K92] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K89]: "심화상",
  [K90]: "심화중",
  [K91]: "심화중",
  [K92]: "심화상",
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
const ENTRY = new Map(M1_TOP_5G.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차g ${key}`);
  assertChoiceCount(content, `중1 5차g ${key}`);
  assertChoiceMarks(content, `중1 5차g ${key}`);
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
 * 수 뒤 조사 — **생성기의 `m2Josa` 를 안 부른다.** 부르면 동어반복이라 아무것도
 * 안 지킨다. 받침 판정은 시험 쪽 규칙(`midPage.numVowelFinal`)에서 온다.
 */
const waGwaTest = (n: number): "와" | "과" => (numVowelFinal(n) ? "와" : "과");
const iGaTest = (n: number): "이" | "가" => (numVowelFinal(n) ? "가" : "이");

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
 * ⚠️ 소수 축이 꼭 필요하다 — `91X` 는 이익률을 `0.16` 처럼 소수로 찍으므로
 *    그 축이 없으면 `$0.16\times17500=2800$` 이 통째로 「못 읽음」이 되어
 *    **검사 밖**으로 나간다.
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
      // 소수 — `0.16` 은 «영 점 일육»이 아니라 한 수다.
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
 * ⚠️ 명령 이름을 지운 **뒤**에 글자가 남으면 문자식이다(`$x=17500$`·`$m=4$`).
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

/** 해설에 찍힌 모든 수 (소수까지 한 덩어리로, 부호는 안 본다). */
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

const RE89 =
  /^두 다각형의 변의 개수의 합은 \$(\d+)\$이고, 두 다각형의 대각선의 개수의 합은 \$(\d+)\$이다\. 두 다각형의 변의 개수가 서로 다를 때, 두 다각형의 변의 개수의 곱을 구하시오\.$/;

const RE90 =
  /^(.+?)에서 (.+?)까지 가는데 분속 \$(\d+)\\,\\mathrm\{m\}\$로 가면 (.+?)보다 \$(\d+)\$분 늦게 도착하고, 분속 \$(\d+)\\,\\mathrm\{m\}\$로 가면 (.+?)보다 \$(\d+)\$분 일찍 도착한다\. (.+?)에서 (.+?)까지의 거리를 구하시오\.$/;

const RE91 =
  /^어떤 (.+?)의 정가에서 \$(\d+)\$원을 할인하여 팔면 원가의 \$(\d+)\\%\$의 이익이 생기고, 정가에서 \$(\d+)\$원을 할인하여 팔면 원가의 \$(\d+)\\%\$의 (이익이 생긴다|손해를 본다)\. 이 (.+?)의 정가를 구하시오\.$/;

const RE92 =
  /^정수 \$a\$에 대하여 \$a\$와 \$(-?\d+)\$의 차의 절댓값은 \$(\d+)\$ 이하이고, \$a\$와 \$(-?\d+)\$의 차의 절댓값은 \$(\d+)\$ 이상이다\. 이러한 정수 \$a\$를 모두 구하여 그 합을 구하시오\.$/;

function read89(content: string): { s: number; d: number } {
  const [s, d] = grab(RE89, content, "89X");
  return { s: num(s!), d: num(d!) };
}

function read90(content: string): {
  from: string;
  to: string;
  when: string;
  a: number;
  b: number;
  p: number;
  q: number;
} {
  const [from, to, a, when, p, b, when2, q, from2, to2] = grab(
    RE90,
    content,
    "90X",
  );
  if (when !== when2) throw new Error("90X: 기준 시각이 두 곳에서 다르다");
  if (from !== from2 || to !== to2) {
    throw new Error("90X: 출발지·도착지가 두 곳에서 다르다");
  }
  return {
    from: from!,
    to: to!,
    when: when!,
    a: num(a!),
    b: num(b!),
    p: num(p!),
    q: num(q!),
  };
}

function read91(content: string): {
  thing: string;
  d1: number;
  r1: number;
  d2: number;
  r2: number;
  loss: boolean;
} {
  const [thing, d1, r1, d2, r2, tail, thing2] = grab(RE91, content, "91X");
  if (thing !== thing2) throw new Error("91X: 물건 이름이 두 곳에서 다르다");
  return {
    thing: thing!,
    d1: num(d1!),
    r1: num(r1!),
    d2: num(d2!),
    r2: num(r2!),
    loss: tail === "손해를 본다",
  };
}

function read92(content: string): {
  c1: number;
  d1: number;
  c2: number;
  d2: number;
} {
  const [c1, d1, c2, d2] = grab(RE92, content, "92X");
  return { c1: num(c1!), d1: num(d1!), c2: num(c2!), d2: num(d2!) };
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

/** 대각선의 개수를 **선분 전체에서 변을 뺀 것**으로 센다 — 생성기와 다른 길. */
function diagBySegments(k: number): number {
  return (k * (k - 1)) / 2 - k;
}

const VERIFY: Record<string, (content: string) => number> = {
  [K89]: (content) => {
    const { s, d } = read89(content);
    if (s < 11 || s > 21)
      throw new Error(`89X: 변의 개수의 합이 창 밖이다 — ${s}`);
    // 🔴 $m$ 을 $3$부터 $S-3$까지 **전부** 훑는다(반으로 접지 않는다).
    const found: [number, number][] = [];
    for (let m = 3; m <= s - 3; m += 1) {
      const n = s - m;
      if (n < 3 || m >= n) continue;
      if (diagBySegments(m) + diagBySegments(n) === d) found.push([m, n]);
    }
    if (found.length !== 1) {
      throw new Error(`89X: 조건에 맞는 두 다각형이 ${found.length} 짝이다`);
    }
    const [m, n] = found[0]!;
    const x = m * n;
    // ㉠ 「대각선 조건을 안 보고 반씩 나눈」 학생이 맞으면 안 된다.
    const half = Math.floor((s - 1) / 2);
    if (half * (s - half) === x) {
      throw new Error("89X: 반씩 나눈 답이 정답과 같다");
    }
    if (pageShortcutValues([s, d]).has(x)) {
      throw new Error("89X: 답이 지면 수 조합으로 나온다");
    }
    if (scaledValues(s).has(x) || scaledValues(d).has(x)) {
      throw new Error("89X: 답이 지면 수를 몇 번 곱하거나 나눈 값과 같다");
    }
    return x;
  },

  [K90]: (content) => {
    const { a, b, p, q } = read90(content);
    if (!(b > a)) throw new Error("90X: 두 속력의 앞뒤가 뒤집혔다");
    // 🔴 공식을 한 번도 안 쓴다 — 조건을 만족하는 첫 거리를 **찾는다**.
    let found: number | null = null;
    for (let v = 1; v <= 20000; v += 1) {
      if (v % a !== 0 || v % b !== 0) continue;
      if (v / a - p === v / b + q) {
        found = v;
        break;
      }
    }
    if (found === null) throw new Error("90X: 조건을 만족하는 거리가 없다");
    const x = found;
    if (x < 600 || x > 5000) throw new Error(`90X: 거리가 창 밖이다 — ${x}`);
    if (x % 10 !== 0) throw new Error("90X: 거리가 $10$의 배수가 아니다");
    const t = x / a - p;
    if (t < 3 || t > 60) throw new Error(`90X: 남은 시간이 창 밖이다 — ${t}`);
    if (x / b < 1) throw new Error("90X: 빠른 쪽이 $1$분도 안 걸린다");
    // 느린 쪽이 빠른 쪽의 약수이면 지면에 `$1x$` 가 나간다(냄새).
    if (b % a === 0) throw new Error("90X: 느린 속력이 빠른 속력의 약수다");
    if (pageShortcutValues([a, b, p, q]).has(x)) {
      throw new Error("90X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K91]: (content) => {
    const { d1, r1, d2, r2, loss } = read91(content);
    const e2 = loss ? -r2 : r2;
    if (r1 <= e2) throw new Error("91X: 두 조건의 이익률 앞뒤가 뒤집혔다");
    if (d2 <= d1) throw new Error("91X: 두 할인액의 앞뒤가 뒤집혔다");
    /**
     * 🔴 공식을 한 번도 안 쓴다 — 원가를 올려 가며 **두 조건이 같은 정가를 내는**
     * 첫 값을 찾는다.
     *
     * ⚠️ $10$원 단위로 훑는 것은 생성기의 불변식(`cost % 10 === 0`)을 빌린 것이다.
     *    그 불변식이 깨진 지면은 여기서 **못 찾아 던진다** — 조용히 통과하지 않는다.
     */
    let cost: number | null = null;
    for (let c = 10; c <= 200000; c += 10) {
      const g1 = c * (100 + r1);
      const g2 = c * (100 + e2);
      if (g1 % 100 !== 0 || g2 % 100 !== 0) continue;
      if (g1 / 100 + d1 === g2 / 100 + d2) {
        cost = c;
        break;
      }
    }
    if (cost === null) throw new Error("91X: 조건을 만족하는 원가가 없다");
    if (cost < 2000 || cost > 60000) {
      throw new Error(`91X: 원가가 창 밖이다 — ${cost}`);
    }
    const x = (cost * (100 + r1)) / 100 + d1;
    if (!Number.isInteger(x)) throw new Error("91X: 정가가 정수가 아니다");
    if (x % 10 !== 0) throw new Error("91X: 정가가 $10$의 배수가 아니다");
    if (x <= d2) throw new Error("91X: 두 번째 할인액이 정가보다 크다");
    if (x === d2 - d1) throw new Error("91X: 정가가 두 할인액의 차와 같다");
    if (pageShortcutValues([d1, r1, d2, r2]).has(x)) {
      throw new Error("91X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K92]: (content) => {
    const { c1, d1, c2, d2 } = read92(content);
    if (c1 === c2) throw new Error("92X: 두 기준 수가 같다");
    // 🔴 창을 만들지 않는다 — 넓은 범위의 정수를 **전부** 두 조건에 대 본다.
    const cands: number[] = [];
    const alive: number[] = [];
    for (let v = -300; v <= 300; v += 1) {
      const dist1 = Math.max(v, c1) - Math.min(v, c1);
      if (dist1 > d1) continue;
      cands.push(v);
      const dist2 = Math.max(v, c2) - Math.min(v, c2);
      if (dist2 >= d2) alive.push(v);
    }
    if (cands.length !== 2 * d1 + 1) {
      throw new Error(`92X: 첫 조건의 후보가 ${cands.length} 개다`);
    }
    const dead = cands.length - alive.length;
    if (alive.length < 3) {
      throw new Error(`92X: 조건에 맞는 정수가 ${alive.length} 개다`);
    }
    if (dead < 3) throw new Error(`92X: 조건에 안 맞는 정수가 ${dead} 개다`);
    if (alive.includes(0)) {
      throw new Error(
        "92X: 조건에 맞는 정수에 $0$ 이 있어 합의 식에 `+0` 이 난다",
      );
    }
    const x = alive.reduce((s, v) => s + v, 0);
    if (x === 0) throw new Error("92X: 답이 $0$ 이다");
    if (alive.includes(x) || cands.includes(x)) {
      throw new Error("92X: 답이 후보 목록 안에 있다");
    }
    if (cands.reduce((s, v) => s + v, 0) === x) {
      throw new Error("92X: 두 번째 조건을 안 본 합이 정답과 같다");
    }
    if (pageShortcutValues([c1, d1, c2, d2]).has(x)) {
      throw new Error("92X: 답이 지면 수 조합으로 나온다");
    }
    const shaken = cands
      .filter((v) => Math.max(v, c2) - Math.min(v, c2) >= d2 + 1)
      .reduce((s, v) => s + v, 0);
    if (shaken === x) throw new Error("92X: 두 번째 조건을 흔들어도 답이 같다");
    return x;
  },
};

/**
 * 해설에 **나와도 되는 수** — `content` 만 보고 다시 만든다.
 *
 * 여기 없는 수가 해설에 있으면 그것은 **아무 재계산으로도 설명되지 않는 수**다.
 * 부호는 안 본다(`solutionNumbers` 가 숫자만 읽는다).
 */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K89]: (content) => {
    const { s, d } = read89(content);
    const stop = Math.floor((s - 1) / 2);
    const out = new Set<number>([s, d, 2, 3, stop + 1]);
    for (let m = 3; m <= stop; m += 1) {
      const n = s - m;
      out.add(m);
      out.add(n);
      out.add(diagBySegments(m) + diagBySegments(n));
      out.add(diagBySegments(n));
      if (diagBySegments(m) + diagBySegments(n) === d) out.add(m * n);
    }
    return out;
  },
  [K90]: (content) => {
    const { a, b, p, q } = read90(content);
    let x = 0;
    for (let v = 1; v <= 20000; v += 1) {
      if (v % a !== 0 || v % b !== 0) continue;
      if (v / a - p === v / b + q) {
        x = v;
        break;
      }
    }
    const l = (a / gcd2(a, b)) * b;
    return new Set<number>([
      a,
      b,
      p,
      q,
      x,
      x / a,
      x / b,
      p + q,
      l,
      l / a,
      l / b,
      l / a - l / b,
      l * (p + q),
    ]);
  },
  [K91]: (content) => {
    const { d1, r1, d2, r2, loss } = read91(content);
    const e2 = loss ? -r2 : r2;
    let cost = 0;
    for (let c = 10; c <= 200000; c += 10) {
      if ((c * (100 + r1)) % 100 !== 0 || (c * (100 + e2)) % 100 !== 0)
        continue;
      if ((c * (100 + r1)) / 100 + d1 === (c * (100 + e2)) / 100 + d2) {
        cost = c;
        break;
      }
    }
    const x = (cost * (100 + r1)) / 100 + d1;
    return new Set<number>([
      d1,
      d2,
      r1,
      r2,
      cost,
      x,
      (cost * r1) / 100,
      (cost * r2) / 100,
      x - d2,
      d2 - d1,
      r1 / 100,
      r2 / 100,
      (r1 - e2) / 100,
    ]);
  },
  [K92]: (content) => {
    const { c1, d1, c2, d2 } = read92(content);
    const out = new Set<number>([Math.abs(c1), d1, Math.abs(c2), d2]);
    let sum = 0;
    for (let v = c1 - d1; v <= c1 + d1; v += 1) {
      out.add(Math.abs(v));
      out.add(Math.max(v, c2) - Math.min(v, c2));
      if (Math.max(v, c2) - Math.min(v, c2) >= d2) sum += v;
    }
    out.add(Math.abs(sum));
    return out;
  },
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 손으로 쓴 지면(엔진 밖) — 답을 사람이 계산해 두었다. */
const GOOD_PAGES: readonly { key: string; page: string; want: number }[] = [
  {
    key: K89,
    // $S=15$ · $D=46$ → $4$각형($2$개)과 $11$각형($44$개) → $4\times11=44$
    page:
      "두 다각형의 변의 개수의 합은 $15$이고, 두 다각형의 대각선의 개수의 합은 " +
      "$46$이다. 두 다각형의 변의 개수가 서로 다를 때, 두 다각형의 변의 개수의 곱을 구하시오.",
    want: 44,
  },
  {
    key: K90,
    // $\frac x{60}-5=\frac x{80}+3$ → $\frac x{240}=8$ → $x=1920$
    page:
      "집에서 학교까지 가는데 분속 $60\\,\\mathrm{m}$로 가면 수업이 시작하는 시각보다 " +
      "$5$분 늦게 도착하고, 분속 $80\\,\\mathrm{m}$로 가면 수업이 시작하는 시각보다 " +
      "$3$분 일찍 도착한다. 집에서 학교까지의 거리를 구하시오.",
    want: 1920,
  },
  {
    key: K91,
    // $1.2x+500=1.05x+2000$ → $x=10000$ → 정가 $10000+2000+500=12500$
    page:
      "어떤 상품의 정가에서 $500$원을 할인하여 팔면 원가의 $20\\%$의 이익이 생기고, " +
      "정가에서 $2000$원을 할인하여 팔면 원가의 $5\\%$의 이익이 생긴다. " +
      "이 상품의 정가를 구하시오.",
    want: 12500,
  },
  {
    key: K92,
    // 후보 $-12\ldots-2$ 중 $-5$ 와의 거리가 $4$ 이상인 것은 $-12,-11,-10,-9$ → $-42$
    page:
      "정수 $a$에 대하여 $a$와 $-7$의 차의 절댓값은 $5$ 이하이고, " +
      "$a$와 $-5$의 차의 절댓값은 $4$ 이상이다. " +
      "이러한 정수 $a$를 모두 구하여 그 합을 구하시오.",
    want: -42,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K89,
    page:
      "두 다각형의 변의 개수의 합은 $15$이고, 두 다각형의 대각선의 개수의 합은 " +
      "$34$이다. 두 다각형의 변의 개수가 서로 다를 때, 두 다각형의 변의 개수의 곱을 구하시오.",
    why: "$7$각형과 $8$각형 — 「반씩 나눈」 학생이 그대로 맞는다",
  },
  {
    key: K89,
    page:
      "두 다각형의 변의 개수의 합은 $15$이고, 두 다각형의 대각선의 개수의 합은 " +
      "$100$이다. 두 다각형의 변의 개수가 서로 다를 때, 두 다각형의 변의 개수의 곱을 구하시오.",
    why: "조건에 맞는 두 다각형이 하나도 없다 (빈 집합)",
  },
  {
    key: K89,
    page: "두 다각형의 변의 개수의 합은 $15$이다. 두 다각형의 변의 개수의 곱을 구하시오.",
    why: "지면 모양이 다르다 — 대각선의 개수의 합이 없다",
  },
  {
    key: K90,
    page:
      "집에서 학교까지 가는데 분속 $40\\,\\mathrm{m}$로 가면 수업이 시작하는 시각보다 " +
      "$5$분 늦게 도착하고, 분속 $80\\,\\mathrm{m}$로 가면 수업이 시작하는 시각보다 " +
      "$5$분 일찍 도착한다. 집에서 학교까지의 거리를 구하시오.",
    why: "$40$이 $80$의 약수 — 지면에 `$1x$` 가 나간다(냄새)",
  },
  {
    key: K90,
    page:
      "집에서 학교까지 가는데 분속 $70\\,\\mathrm{m}$로 가면 수업이 시작하는 시각보다 " +
      "$1$분 늦게 도착하고, 분속 $100\\,\\mathrm{m}$로 가면 수업이 시작하는 시각보다 " +
      "$1$분 일찍 도착한다. 집에서 학교까지의 거리를 구하시오.",
    why: "거리가 정수가 아니다 ($14000\\div30$)",
  },
  {
    key: K91,
    page:
      "어떤 상품의 정가에서 $500$원을 할인하여 팔면 원가의 $20\\%$의 이익이 생기고, " +
      "정가에서 $2000$원을 할인하여 팔면 원가의 $20\\%$의 이익이 생긴다. " +
      "이 상품의 정가를 구하시오.",
    why: "두 이익률이 같아 원가가 아예 정해지지 않는다",
  },
  {
    key: K91,
    page:
      "어떤 상품의 정가에서 $2000$원을 할인하여 팔면 원가의 $20\\%$의 이익이 생기고, " +
      "정가에서 $500$원을 할인하여 팔면 원가의 $5\\%$의 이익이 생긴다. " +
      "이 상품의 정가를 구하시오.",
    why: "할인액의 앞뒤가 뒤집혀 원가가 음수가 된다",
  },
  {
    key: K92,
    page:
      "정수 $a$에 대하여 $a$와 $-7$의 차의 절댓값은 $4$ 이하이고, " +
      "$a$와 $2$의 차의 절댓값은 $6$ 이상이다. " +
      "이러한 정수 $a$를 모두 구하여 그 합을 구하시오.",
    why: "조건에 안 맞는 정수가 하나뿐 — 「모두 구하여」가 무색하다",
  },
  {
    key: K92,
    page:
      "정수 $a$에 대하여 $a$와 $-2$의 차의 절댓값은 $5$ 이하이고, " +
      "$a$와 $6$의 차의 절댓값은 $6$ 이상이다. " +
      "이러한 정수 $a$를 모두 구하여 그 합을 구하시오.",
    why: "조건에 맞는 정수에 $0$ 이 있어 합의 식에 `+0` 이 난다",
  },
  {
    key: K92,
    page: "정수 $a$에 대하여 $a$와 $-7$의 차의 절댓값은 $5$ 이하이다. 그 합을 구하시오.",
    why: "지면 모양이 다르다 — 두 번째 조건이 없다",
  },
];

describe("중1 5차g 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
    // 🔴 소수 축 — `91X` 는 이익률을 소수로 찍는다.
    expect(arithmeticEquationFailures("$0.16\\times17500=2800$이다.")).toEqual(
      [],
    );
    expect(
      arithmeticEquationFailures("$0.16\\times17500=2900$이다."),
    ).toHaveLength(1);
    // 🔴 음수를 이어 더한 식 — `92X` 의 마지막 줄이 그 모양이다.
    expect(arithmeticEquationFailures("$-12-11-10-9=-42$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$-12-11-10-9=-41$이다.")).toHaveLength(
      1,
    );
    // 🔴 괄호와 나눗셈 — `89X` 의 후보 줄이 그 모양이다.
    expect(
      arithmeticEquationFailures(
        "$4\\times(4-3)\\div2+13\\times(13-3)\\div2=67$",
      ),
    ).toEqual([]);
    expect(
      arithmeticEquationFailures(
        "$4\\times(4-3)\\div2+13\\times(13-3)\\div2=68$",
      ),
    ).toHaveLength(1);
    // 문자식은 «판정하지 않는다» — 계산하려 들면 거짓 빨강이 난다.
    expect(arithmeticEquationFailures("$0.15\\times x=1500$")).toEqual([]);
    // 읽을 수 없는 글자는 조용히 넘기지 않고 **실패로 센다**.
    // ⚠️ 명령(`\\notacommand`)을 쓰면 안 된다 — 그건 「문자식이라 판정하지 않는다」로
    //    빠져나가서 이 눈금이 **아무것도 안 재게** 된다.
    expect(arithmeticEquationFailures("$1++2=3$")).toHaveLength(1);
  });

  it("🔴 수관형사 표가 생성기 것과 **다른 벌**이다 — 가져다 쓰면 동어반복이다", () => {
    expect(COUNT_WORD[4]).toBe("네");
    expect(COUNT_WORD[13]).toBe("열세");
    expect(Object.keys(COUNT_WORD)).toHaveLength(13);
  });

  it("🔴 조사 표도 다른 벌이다 — 생성기의 `m2Josa` 를 안 부른다", () => {
    expect(waGwaTest(44)).toBe("와");
    expect(waGwaTest(46)).toBe("과");
    expect(iGaTest(44)).toBe("가");
    expect(iGaTest(46)).toBe("이");
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`polygonDiagonals`·`lastSideToCheck` 는 손 계산과 맞는다", () => {
    // $3$각형 $0$ · $4$각형 $2$ · $6$각형 $9$ · $11$각형 $44$
    expect(polygonDiagonals(3)).toBe(0);
    expect(polygonDiagonals(4)).toBe(2);
    expect(polygonDiagonals(6)).toBe(9);
    expect(polygonDiagonals(11)).toBe(44);
    // 🔴 두 길이 같은 값을 낸다 — 검산기의 길이 옳다는 근거다.
    for (let k = 3; k <= 25; k += 1) {
      expect(polygonDiagonals(k)).toBe(diagBySegments(k));
    }
    expect(lastSideToCheck(15)).toBe(7);
    expect(lastSideToCheck(16)).toBe(7);
    expect(lastSideToCheck(21)).toBe(10);
    expect(() => polygonDiagonals(2)).toThrow();
  });

  it("`sidePairFromSums` 는 손 계산과 맞는다", () => {
    // $S=15$ · $D=46$ → $4$각형($2$)과 $11$각형($44$)
    expect(sidePairFromSums(15, 46)).toEqual([4, 11]);
    expect(sidePairFromSums(15, 34)).toEqual([7, 8]);
    expect(halvedSideProduct(15)).toBe(56);
  });

  it("🔴 음성 대조 — 짝이 **하나도 없는** $(S,D)$ 가 실재한다", () => {
    expect(sidePairFromSums(15, 100)).toBeNull();
    expect(sidePairFromSums(15, 45)).toBeNull();
    // 변이 셋 미만이면 훑을 자리가 아예 없다.
    expect(sidePairFromSums(6, 0)).toBeNull();
  });

  it("`travelDistance` 는 손 계산과 맞는다", () => {
    // $\frac x{60}-5=\frac x{80}+3$ → $x=1920$
    expect(travelDistance(60, 80, 5, 3)).toBe(1920);
    expect(travelDistance(40, 50, 1, 5)).toBe(1200);
  });

  it("🔴 음성 대조 — 거리가 정수가 아닌 짝이 실재한다", () => {
    expect(travelDistance(70, 100, 1, 1)).toBeNull();
    // 앞뒤가 뒤집히면 판정하지 않는다.
    expect(travelDistance(80, 60, 5, 3)).toBeNull();
  });

  it("`costFromDiscounts`·`listPriceFromDiscounts` 는 손 계산과 맞는다", () => {
    // $1.2x+500=1.05x+2000$ → $x=10000$ → 정가 $12500$
    expect(costFromDiscounts(20, 5, 500, 2000)).toBe(10000);
    expect(listPriceFromDiscounts(20, 5, 500, 2000)).toBe(12500);
    // 손해 쪽 — $1.16x+1200=0.92x+2400$ → $0.24x=1200$ → $x=5000$
    expect(costFromDiscounts(16, -8, 1200, 2400)).toBe(5000);
    expect(listPriceFromDiscounts(16, -8, 1200, 2400)).toBe(5000 + 800 + 1200);
    // 🔴 나누어떨어지지 않으면 **던지지 않고 `null`** 이다 — 그 자리도 못 박는다
    //    ($100\times1400\div24$ 는 정수가 아니다).
    expect(costFromDiscounts(16, -8, 1000, 2400)).toBeNull();
  });

  it("🔴 음성 대조 — 두 이익률이 같으면 원가가 **아예 정해지지 않는다**", () => {
    expect(costFromDiscounts(20, 20, 500, 2000)).toBeNull();
    expect(listPriceFromDiscounts(20, 20, 500, 2000)).toBeNull();
    // 할인액의 앞뒤가 뒤집히면 원가가 음수라 역시 `null`.
    expect(costFromDiscounts(20, 5, 2000, 500)).toBeNull();
  });

  it("`absoluteWindowCandidates`·`absoluteWindowSurvivors` 는 손 계산과 맞는다", () => {
    expect(absoluteWindowCandidates(-7, 2)).toEqual([-9, -8, -7, -6, -5]);
    expect(absoluteWindowSurvivors(-7, 5, -5, 4)).toEqual([-12, -11, -10, -9]);
    expect(survivorBlocks([-12, -11, -10, -9])).toBe(1);
    expect(survivorBlocks([-12, -11, -3, -2])).toBe(2);
    expect(() => absoluteWindowCandidates(-7, 0)).toThrow();
  });

  it("🔴 음성 대조 — 두 창이 안 겹치면 살아남는 정수가 **하나도 없다**", () => {
    expect(absoluteWindowSurvivors(0, 3, 0, 9)).toEqual([]);
  });

  it("`sumTex` 는 `+-`·`+0` 을 안 만든다 (양성·음성 한 쌍)", () => {
    expect(sumTex([-12, -11, -10, -9])).toBe("-12-11-10-9");
    expect(sumTex([-2, -1, 7, 8])).toBe("-2-1+7+8");
    expect(pageSmells(`$${sumTex([-2, -1, 7, 8])}$`)).toEqual([]);
    // $0$ 은 `+0` 냄새를 만드므로 **던진다** — 조용히 지나가지 않는다.
    expect(() => sumTex([-2, 0, 7])).toThrow();
    expect(() => sumTex([])).toThrow();
  });

  it("`differenceTex` 는 `-0` 을 안 만든다 (양성·음성 한 쌍)", () => {
    expect(differenceTex(-11, 2)).toBe("2-(-11)");
    expect(differenceTex(5, 2)).toBe("5-2");
    // 작은 쪽이 $0$ 이면 뺄셈을 아예 안 적는다 — `$3-0$` 은 지면 냄새다.
    expect(differenceTex(0, 3)).toBeNull();
    expect(differenceTex(3, 0)).toBeNull();
    expect(pageSmells("$3-0=3$")).not.toEqual([]);
  });

  it("`pageShortcutValues`·`scaledValues` 가 «아니오» 도 낸다", () => {
    expect([...pageShortcutValues([15, 46])]).toContain(31); // 차
    expect([...pageShortcutValues([15, 46])]).not.toContain(44);
    expect(scaledValues(15).has(30)).toBe(true);
    expect(scaledValues(15).has(44)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5G).toHaveLength(4);
    expect(M1_TOP_5G.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_5G.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5G) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), `${e.key}`).toBeNull();
    }
    // 리드가 나눠 준 구간 그대로다 — 다른 갈래와 안 겹친다.
    expect(M1_TOP_5G.map((e) => e.rpmType)).toEqual([
      "89X",
      "90X",
      "91X",
      "92X",
    ]);
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    // ⚠️ 다른 소단원에는 **가는 공백 U+2009** 가 든 것이 있어 눈으로는 안 갈린다.
    //    그래서 정본과 **글자 그대로** 대조한다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5G) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    expect(M1_TOP_5G.map((e) => e.unitSection)).toEqual([
      "다각형",
      "일차방정식의 활용(거리, 속력, 시간)",
      "일차방정식의 활용(증가와 감소, 원가와 정가)",
      "정수와 유리수",
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

describe("중1 5차g 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
  });

  for (const e of M1_TOP_5G) {
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
          ].filter((m) => /\d$/.test(m[1]!)).length;
        }
        // 🔴 「판마다 하나 이상」 — 이것이 $0$ 이면 그 유형에서 공용 조사 자는
        //    아무것도 안 읽는다(그러면 「어긋남 0」이 «못 셈»이다). `91X` 는 실제로
        //    $0$ 이었고, 그래서 **생성기의 검산 줄을 목적격 조사가 붙는 문장으로 고쳤다.**
        expect(sites, `${e.key} 조사 자가 읽는 자리`).toBeGreaterThanOrEqual(
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
        // 🔴 한 도막도 못 읽었으면 이 검사는 구조적으로 0 이다. **판마다 셋 이상**을
        //    요구한다 — 넷 다 실측으로 그보다 많다(가장 적은 `90X` 가 판마다 셋).
        expect(seen).toBeGreaterThanOrEqual(220 * 3);
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

      it("🔴 지면에 수 분수가 **한 자리도 없다** (㉰ — 그 사실을 못 박는다)", () => {
        let seen = 0;
        let divs = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const both = `${p.content}\n${p.solution}`;
          for (const [n, d] of numericFractions(both)) {
            seen += 1;
            expect(gcd2(n, d), `${e.key} ${seed}/${v} — ${n}/${d}`).toBe(1);
            expect(d).not.toBe(1);
          }
          divs += (both.match(/\\div/g) ?? []).length;
        }
        // 🔴 「$0$ 자리」가 «깨끗»인지 «못 셈»인지 가른다.
        expect(seen, `${e.key} 수 분수가 생겼다`).toBe(0);
        /**
         * 나눗셈을 `\div` 로만 적는지 — **유형마다 실측값이 다르다.**
         * `92X` 는 나눗셈이 아예 없고 뺄셈만 있으므로 `0` 이 옳다. 그 사실을
         * 「$0$ 이니 통과」로 뭉개지 않고 **유형별로 따로** 못 박는다 —
         * 처음에 한 문턱으로 뭉갰다가 `92X` 에서 빨개졌고, 그때 「이 유형에는
         * 나눗셈이 없다」는 것이 드러났다.
         */
        const wantDiv: Record<string, number> = {
          [K89]: 220 * 6,
          [K90]: 220 * 2,
          [K91]: 220,
          [K92]: 0,
        };
        expect(divs, `${e.key} 나눗셈 개수`).toBeGreaterThanOrEqual(
          wantDiv[e.key]!,
        );
        if (e.key === K92) expect(divs).toBe(0);
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

  it("🔴 변형 폭 — 리드가 못 박은 바닥을 넘는다 (660판)", () => {
    /**
     * 브리프가 소단원마다 준 바닥: `89X` 6 · `90X` 10 · `91X` 12 · `92X` 12.
     * ⚠️ `89X` 의 바닥이 낮은 것은 창이 좁아서다 — 실측 **34종**이 창 전수 그대로다
     *    (변의 개수의 합 $11$~$21$ 에서 조건을 만족하는 $(S,D)$ 가 그만큼뿐이다).
     */
    const floors: Record<string, number> = {
      [K89]: 6,
      [K90]: 10,
      [K91]: 12,
      [K92]: 12,
    };
    const got: Record<string, number> = {};
    for (const e of M1_TOP_5G) {
      const seen = new Set<string>();
      for (const [seed, v] of WIDE) seen.add(build(e.key, seed, v).content);
      got[e.key] = seen.size;
      expect(
        seen.size,
        `${e.key} 변형 폭 ${seen.size} < ${floors[e.key]}`,
      ).toBeGreaterThanOrEqual(floors[e.key]!);
    }
    // 실측을 못 박는다 — 조용히 좁아지면 빨개진다.
    expect(got[K89]).toBeGreaterThanOrEqual(30);
    expect(got[K90]).toBeGreaterThanOrEqual(500);
    expect(got[K91]).toBeGreaterThanOrEqual(500);
    expect(got[K92]).toBeGreaterThanOrEqual(400);
  });

  it("🔴 ㉴ 정답 쏠림 — 최빈 정답이 $12$% 미만이다 (660판)", () => {
    for (const e of M1_TOP_5G) {
      const cnt = new Map<number, number>();
      for (const [seed, v] of WIDE) {
        const a = answerNumber(build(e.key, seed, v).answer);
        cnt.set(a, (cnt.get(a) ?? 0) + 1);
      }
      const top = Math.max(...cnt.values());
      const ratio = (top / WIDE.length) * 100;
      expect(cnt.size, `${e.key} 서로 다른 답`).toBeGreaterThanOrEqual(20);
      expect(ratio, `${e.key} 최빈 ${ratio.toFixed(2)}%`).toBeLessThan(12);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`89X` — 살아남는 자리가 갈리고, **마지막 자리는 구조적으로 0** 이다", () => {
    const at = new Map<number, number>();
    let last = 0;
    for (const [seed, v] of BULK) {
      const p = build(K89, seed, v);
      at.set(p.facts.m!, (at.get(p.facts.m!) ?? 0) + 1);
      if (p.facts.m === p.facts.stop) last += 1;
    }
    // 앞쪽 자리들은 실제로 갈린다.
    expect(at.size, "살아남는 $m$ 이 한 자리뿐이다").toBeGreaterThanOrEqual(4);
    /**
     * 🔴 **마지막 자리는 한 판도 없다 — 그것이 «축이 죽었다»는 뜻이 아니다.**
     *
     * 마지막 자리($m=\lfloor(S-1)/2\rfloor$)는 곧 «반씩 나눈» 자리이고, 그때는
     * 「대각선 조건을 안 보고 반씩 나눈」 학생이 그대로 맞는다. 그래서 생성기가
     * 그 판을 통째로 버린다(창 58판 중 11판, 18.97%). 이 검사는 그 사실을
     * **«구조적으로 0»으로 찍어** 다음 사람이 「축이 갈리지 않는다」로 오해하지
     * 않게 한다.
     */
    expect(last, "마지막 자리가 살아남았다").toBe(0);
    // 그리고 훑는 자리 자체는 판마다 다르다(창이 한쪽 끝만이 아니다).
    const stops = new Set(BULK.map(([s, v]) => build(K89, s, v).facts.stop!));
    expect(stops.size).toBeGreaterThanOrEqual(4);
  });

  it("`90X` — **해당 없음**: 후보 목록이 없다. 굳힘이 실제로 일하는 것을 대신 잰다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다. 이 유형은 값이 하나로 굳으므로
    // «후보 목록에서 고르는 걸음»이 아예 없다 — 그 사실을 여기서 찍는다.
    expect(
      LOCAL_AXES[K90]!.candidateCount(build(K90, SEEDS[0]!).facts),
    ).toBeNull();
    // 대신 「남은 시간 $t$ 가 판마다 다르다」를 잰다 — 그 마디가 실제로 느슨하다는 뜻이다.
    const ts = new Set(BULK.map(([s, v]) => build(K90, s, v).facts.t!));
    expect(ts.size).toBeGreaterThanOrEqual(10);
  });

  it("`91X` — **해당 없음**: 값이 하나로 굳는다. 「정가가 지면에 없다」를 대신 잰다", () => {
    expect(
      LOCAL_AXES[K91]!.candidateCount(build(K91, SEEDS[0]!).facts),
    ).toBeNull();
    // 🔴 이 유형의 굳힘은 「정가는 하나뿐」이다. 그 정가가 **발문에 한 번도 안 찍히는지**
    //    를 잰다 — 찍히면 굳힐 것이 없다.
    for (const [seed, v] of BULK) {
      const p = build(K91, seed, v);
      const nums = pageNumbers(p.content);
      expect(nums, `${seed}/${v} 정가가 발문에 찍혔다`).not.toContain(
        p.facts.x!,
      );
      // ⚠️ **원가는 여기서 못 잰다.** 원가가 할인액과 **우연히 같은 판**이 실재한다
      //    (실측 씨앗 1055436: 지면 수 $[800,40,2000,20]$ · 원가 $2000$). 그건 결함이
      //    아니라 두 값이 우연히 같은 것뿐이고, 발문이 묻는 것은 정가다. 이 문장을
      //    안 적으면 다음 사람이 「원가도 재야 하는데 빠졌다」로 읽는다.
    }
  });

  it("`92X` — 살아남는 개수와 덩어리 수가 씨앗을 가로질러 갈린다", () => {
    const cnt = new Set<number>();
    const blocks = new Set<number>();
    let firstIsMin = 0;
    for (const [seed, v] of BULK) {
      const p = build(K92, seed, v);
      cnt.add(p.facts.cnt!);
      blocks.add(p.facts.blocks!);
      if (p.facts.first === p.facts.c1! - p.facts.d1!) firstIsMin += 1;
    }
    expect(cnt.size, "살아남는 개수가 한 값뿐이다").toBeGreaterThanOrEqual(3);
    // 🔴 살아남는 것이 **한 덩어리일 때와 두 덩어리일 때가 둘 다** 나온다.
    expect(blocks, "덩어리 수가 한 값뿐이다").toEqual(new Set([1, 2]));
    // 그리고 「늘 창의 왼쪽 끝부터 살아남는다」가 아니다.
    expect(firstIsMin).toBeGreaterThan(0);
    expect(firstIsMin).toBeLessThan(BULK.length);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 판정기 축을 여기 미리 둔다 (리드가 `AXES` 로 옮긴다)
// ═══════════════════════════════════════════════════════════

type LocalAxis = {
  /** 후보 목록의 길이 — 후보를 세는 걸음이 없으면 `null`. */
  candidateCount: (f: Record<string, number>) => number | null;
  /** 굳힘 조건을 **안 쓰고** 낸 답 — 정답과 같으면 굳힘이 장식이다. */
  withoutBinding: (f: Record<string, number>) => number | null;
  /** 굳힘 인자를 하나 흔들어 다시 낸 답 — 정답과 같으면 항등식이다. */
  perturbed: (f: Record<string, number>) => number;
};

/**
 * 🔴 **리드에게** — 이 표를 `scripts/qa/probe-middle-top-m1.ts` 의 `AXES` 에 그대로
 * 옮기면 된다. 여기 둔 까닭은 그 파일이 **공용**이라 5차 물결 21갈래가 동시에
 * 만지면 말없이 덮어쓰기 때문이다(2026-08-23).
 */
const LOCAL_AXES: Record<string, LocalAxis> = {
  [K89]: {
    candidateCount: (f) => f.stop! - 2,
    // 「대각선 조건을 안 보고 반씩 나눈」 답.
    withoutBinding: (f) => halvedSideProduct(f.s!),
    perturbed: (f) => {
      const sh = sidePairFromSums(f.s!, f.d! + 1);
      return sh === null ? -1 : sh[0] * sh[1];
    },
  },
  [K90]: {
    candidateCount: () => null,
    // 「시간 차에 빠른 쪽 속력을 곱한」 답 — 가장 흔한 오답.
    withoutBinding: (f) => (f.p! + f.q!) * f.b!,
    perturbed: (f) => travelDistance(f.a!, f.b!, f.p! + 1, f.q!) ?? -1,
  },
  [K91]: {
    candidateCount: () => null,
    // 「이익과 손해를 거꾸로 읽은」 답.
    withoutBinding: (f) => listPriceFromDiscounts(f.r1!, -f.e2!, f.d1!, f.d2!),
    perturbed: (f) =>
      listPriceFromDiscounts(f.r1! + 1, f.e2!, f.d1!, f.d2!) ?? -1,
  },
  [K92]: {
    candidateCount: (f) => 2 * f.d1! + 1,
    // 「두 번째 조건을 안 보고 후보를 전부 더한」 답.
    withoutBinding: (f) =>
      absoluteWindowCandidates(f.c1!, f.d1!).reduce((s, v) => s + v, 0),
    perturbed: (f) =>
      absoluteWindowSurvivors(f.c1!, f.d1!, f.c2!, f.d2! + 1).reduce(
        (s, v) => s + v,
        0,
      ),
  },
};

describe("중1 5차g 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("🔴 `probe-middle-top-m1` 의 `AXES` 에 이 넷이 **아직 없다** — 등록과 함께 리드가 적어야 한다", () => {
    // 이 시험이 초록인 동안은 판정기가 이 넷을 「축을 안 적었다」로 **빨갛게 찍는다**.
    // 리드가 `AXES` 를 채우면 위 `LOCAL_AXES` 를 그대로 옮겨 적으면 된다.
    expect(Object.keys(LOCAL_AXES).sort()).toEqual([...KEYS].sort());
  });

  for (const key of KEYS) {
    it(`${key.split("|")[2]} — 굳힘을 지운 답 $0$% · 흔들면 늘 달라진다 (220판)`, () => {
      const axis = LOCAL_AXES[key]!;
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

  it("🔴 그 축이 «아니오» 도 낼 수 있다 — 손으로 만든 판에서 굳힘을 지우면 답이 같다", () => {
    /**
     * 「$0$건」이 «깨끗»인지 «못 셈»인지 가른다. 아래 넷은 **일부러 굳힘이 장식이
     * 되게 만든** 판이고, 그때 축이 실제로 «같다»를 낸다.
     */
    // 89X — $S=15$·$D=34$ 는 반씩 나눈 답 $7\times8=56$ 이 그대로 정답이다.
    expect(halvedSideProduct(15)).toBe(56);
    expect(sidePairFromSums(15, 34)!.reduce((a, b) => a * b)).toBe(56);
    // 90X — $b=2a$ 이면 시간 차 × 빠른 속력이 그대로 거리다.
    expect(travelDistance(40, 80, 5, 5)).toBe((5 + 5) * 80);
    // 92X — 죽는 후보의 합이 $0$ 이면 후보 전부의 합이 정답과 같다.
    const c = absoluteWindowCandidates(0, 4);
    const a92 = absoluteWindowSurvivors(0, 4, 0, 2);
    expect(c.reduce((s, v) => s + v, 0)).toBe(a92.reduce((s, v) => s + v, 0));
    // 91X — 흔들기가 «그대로»를 낼 수 있는 자리: 이익률을 흔들어도 정수가 아니면 `null`.
    expect(listPriceFromDiscounts(3, 5, 500, 2000)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// 나열 줄을 한 줄씩 다시 셈한다
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`89X` — 후보 줄마다 두 다각형·합·판정이 맞고, 훑는 자리가 제약을 안 넘는다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K89, seed, v);
      const { s, d } = read89(p.content);
      const stop = Math.floor((s - 1) / 2);
      const rows = [
        ...p.solution.matchAll(/\$m=(\d+)\$이면 \$n=(\d+)\$이고/g),
      ].map((m) => [Number(m[1]), Number(m[2])] as const);
      // 훑은 자리가 $3$부터 `stop` 까지 **빠짐없이** 있고 그 밖으로 안 나간다(㉴).
      expect(
        rows.map(([m]) => m),
        `${seed}/${v} 훑은 자리`,
      ).toEqual(Array.from({ length: stop - 2 }, (_, i) => i + 3));
      for (const [m2, n2] of rows) {
        expect(n2, `${seed}/${v} $m=${m2}$ 의 짝`).toBe(s - m2);
        expect(m2).toBeLessThan(n2);
      }
      // 후보마다 합이 맞고 판정 낱말이 그 합과 맞는다.
      const sums = [
        ...p.solution.matchAll(
          /대각선의 개수의 합은 \$([^$]+)=(\d+)\$이고, (이는[^\n]*)/g,
        ),
      ];
      expect(sums, `${seed}/${v} 합 줄`).toHaveLength(stop - 2);
      let alive = 0;
      for (let i = 0; i < sums.length; i += 1) {
        const m2 = rows[i]![0];
        const n2 = rows[i]![1];
        const want = diagBySegments(m2) + diagBySegments(n2);
        expect(Number(sums[i]![2]), `${seed}/${v} $m=${m2}$ 의 합`).toBe(want);
        const verdict = sums[i]![3]!;
        if (want === d) {
          expect(verdict, `${seed}/${v} 살아야 하는 줄`).toContain(
            `이는 $${d}$${waGwaTest(d)} 같으므로 조건에 맞는다.`,
          );
          alive += 1;
        } else {
          expect(verdict, `${seed}/${v} 죽어야 하는 줄`).toContain(
            `이는 $${d}$${iGaTest(d)} 아니므로 조건에 맞지 않는다.`,
          );
        }
      }
      expect(alive, `${seed}/${v} 살아남는 후보가 하나가 아니다`).toBe(1);
      // 멈추는 근거가 선언한 제약 그대로다(㉴).
      expect(p.solution).toContain(
        `$m$이 $${stop + 1}$ 이상이면 $n$이 $m$보다 크지 않아 $m<n$에 어긋나므로`,
      );
      /**
       * 🔴 **그 근거 문장이 실제로 참인지 다시 잰다** — 「있다」가 아니라 「맞다」.
       *
       * 처음에는 「$n$이 $m$보다 **작아져**」라고 적었고, $S$ 가 짝수면 그것이
       * **거짓**이었다($m=S/2$ 에서 $n=m$). 값·KaTeX·해설 높이·조사 자는 그
       * 부류를 구조적으로 못 본다 — 문장만 거짓이고 답은 그대로이기 때문이다.
       */
      const mStop = stop + 1;
      expect(
        s - mStop,
        `${seed}/${v} 멈추는 근거가 거짓이다`,
      ).toBeLessThanOrEqual(mStop);
      expect(p.solution).not.toContain("$n$이 $m$보다 작아져");
    }
    // 🔴 짝수 $S$ 가 표본에 실제로 있어야 위 검사가 뜻을 가진다 — 홀수만 보면
    //    「작아져」도 늘 참이라 이 축이 **구조적으로 0** 이 된다.
    const evens = BULK.filter(([s, v]) => build(K89, s, v).facts.s! % 2 === 0);
    expect(evens.length, "짝수 $S$ 가 표본에 없다").toBeGreaterThan(20);
  });

  it("`90X` — 곱하는 수·계수·나눗셈이 모두 참이고 검산 줄이 맞는다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K90, seed, v);
      const { a, b, p: late, q } = read90(p.content);
      const mul = Number(
        grab(/양변에 \$(\d+)\$을 곱하면/, p.solution, "90X 곱하는 수")[0]!,
      );
      // 곱하는 수는 두 속력의 **공배수**여야 한다(그래야 분모가 사라진다).
      expect(mul % a, `${seed}/${v} 곱하는 수가 $${a}$ 의 배수가 아니다`).toBe(
        0,
      );
      expect(mul % b).toBe(0);
      const [ca, cb, rhs] = grab(
        /\$(\d+)x-(\d+)x=(\d+)\$/,
        p.solution,
        "90X 계수",
      ).map(Number);
      expect(ca).toBe(mul / a);
      expect(cb).toBe(mul / b);
      expect(cb, "지면에 `$1x$` 가 나갔다").toBeGreaterThanOrEqual(2);
      expect(rhs).toBe(mul * (late + q));
      // 검산 줄 — 두 시간의 차가 늦은 시간과 이른 시간의 합이다.
      const [x1, slow, x2, fast, s2, f2, diff] = grab(
        /\$(\d+)\\div\d+=(\d+)\$\(분\), 분속 \$\d+\\,\\mathrm\{m\}\$로 가면 \$(\d+)\\div\d+=(\d+)\$\(분\)이 걸려 걸린 시간의 차가 \$(\d+)-(\d+)=(\d+)\$\(분\)이다\./,
        p.solution,
        "90X 검산",
      ).map(Number);
      expect(x1).toBe(x2);
      expect(x1! / a).toBe(slow);
      expect(x1! / b).toBe(fast);
      expect(s2).toBe(slow);
      expect(f2).toBe(fast);
      expect(diff).toBe(late + q);
      expect(slow! - fast!).toBe(late + q);
      expect(x1).toBe(answerNumber(p.answer));
    }
  });

  it("`91X` — 원가·이익·정가·검산이 모두 참이고 두 조건이 같은 정가를 낸다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K91, seed, v);
      const { d1, r1, d2, r2, loss } = read91(p.content);
      const e2 = loss ? -r2 : r2;
      const [cost] = grab(
        /이므로 \$x=(\d+)\$이다\./,
        p.solution,
        "91X 원가",
      ).map(Number);
      const [c2, profit, list] = grab(
        /정가는 \$(\d+)\+(\d+)\+\d+=(\d+)\$\(원\)이다\./,
        p.solution,
        "91X 정가",
      ).map(Number);
      expect(c2).toBe(cost);
      expect(profit, `${seed}/${v} 이익`).toBe((cost! * r1) / 100);
      expect(list).toBe(cost! + profit! + d1);
      expect(list).toBe(answerNumber(p.answer));
      // 🔴 굳힘 그 자체 — **두 조건이 같은 정가를 낸다.**
      expect((cost! * (100 + r1)) / 100 + d1).toBe(
        (cost! * (100 + e2)) / 100 + d2,
      );
      // 검산 줄이 두 번째 조건을 실제로 다시 센다.
      const [lx, ld2, sale] = grab(
        /실제로 정가에서 \$(?:\d+)\$원을 할인하면 \$(\d+)-(\d+)=(\d+)\$\(원\)이고/,
        p.solution,
        "91X 검산",
      ).map(Number);
      expect(lx).toBe(list);
      expect(ld2).toBe(d2);
      expect(sale).toBe(list! - d2);
      expect(sale).toBe(cost! + (cost! * e2) / 100);
    }
  });

  it("`92X` — 후보마다 거리와 판정이 맞고, 「모두」가 전수 탐색과 같다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K92, seed, v);
      const { c1, d1, c2, d2 } = read92(p.content);
      // 후보 목록 줄
      const [listText, word] = grab(
        /만큼 큰 수까지이므로 (.+?)의 (\S+) 개이다\./,
        p.solution,
        "92X 후보 목록",
      );
      const cands = readList(listText!);
      expect(cands, `${seed}/${v} 후보 목록`).toEqual(
        Array.from({ length: 2 * d1 + 1 }, (_, i) => c1 - d1 + i),
      );
      expect(word, `${seed}/${v} 셈말`).toBe(COUNT_WORD[cands.length]);
      // 후보마다 한 줄
      const rows = [
        ...p.solution.matchAll(
          /\$a=(-?\d+)\$이면 (?:\$[^$]+=(\d+)\$이므로 차의 절댓값은|\$-?\d+\$[와과] \$-?\d+\$의 차의 절댓값은) \$(\d+)\$이고, (.+)/g,
        ),
      ];
      expect(rows, `${seed}/${v} 후보 줄 수`).toHaveLength(cands.length);
      const alive: number[] = [];
      for (let i = 0; i < rows.length; i += 1) {
        const a = Number(rows[i]![1]);
        expect(a, `${seed}/${v} 후보 차례`).toBe(cands[i]);
        const dist = Math.max(a, c2) - Math.min(a, c2);
        expect(Number(rows[i]![3]), `${seed}/${v} $a=${a}$ 의 거리`).toBe(dist);
        if (rows[i]![2] !== undefined) {
          expect(Number(rows[i]![2]), `${seed}/${v} 뺄셈 값`).toBe(dist);
        }
        const verdict = rows[i]![4]!;
        if (dist >= d2) {
          expect(verdict, `${seed}/${v} $a=${a}$ 는 살아야 한다`).toContain(
            "조건에 맞는다.",
          );
          expect(verdict).not.toContain("조건에 맞지 않는다.");
          alive.push(a);
        } else {
          expect(verdict, `${seed}/${v} $a=${a}$ 는 죽어야 한다`).toContain(
            "조건에 맞지 않는다.",
          );
        }
      }
      // 마지막 줄의 「모두」가 전수 탐색과 같다.
      const [aliveText, aliveWord, sumText, total] = grab(
        /따라서 조건에 맞는 정수는 (.+?)의 (\S+) 개이고, 구하는 값은 \$([^$]+)=(-?\d+)\$이다\.$/,
        p.solution,
        "92X 마무리",
      );
      expect(readList(aliveText!)).toEqual(alive);
      expect(aliveWord).toBe(COUNT_WORD[alive.length]);
      expect(Number(total)).toBe(alive.reduce((s, x) => s + x, 0));
      expect(Number(total)).toBe(answerNumber(p.answer));
      expect(sumText).toBe(sumTex(alive));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
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
    for (const e of M1_TOP_5G) {
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

  it("🔴 `89X`·`92X` 의 훑는 자리 상한이 산출물에 실제로 걸린다", () => {
    // 이 상한이 곧 해설 높이다. 상한을 올리면 위 검사가 빨개진다.
    let maxStop = 0;
    let maxWindow = 0;
    for (const [s, v] of WIDE) {
      maxStop = Math.max(maxStop, build(K89, s, v).facts.stop!);
      maxWindow = Math.max(maxWindow, 2 * build(K92, s, v).facts.d1! + 1);
    }
    expect(maxStop, "`89X` 가 훑는 자리").toBe(10);
    expect(maxWindow, "`92X` 의 후보 수").toBe(11);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5G) {
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

  it("🔴 5차g 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = M1_TOP_5G.map((e) => build(e.key, OVERLAP_SEED));
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
// ㉵ 지름길 — 판정기의 자를 그대로 쓰고, 우연 수준과 견준다
// ═══════════════════════════════════════════════════════════

describe("중1 5차g 확대 갈래 — ㉵ 지름길", () => {
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
        220,
      );
    }
  });

  it("🔴 우연 수준(널 모형)과 견준다 — 「걸렀으니 깨끗」으로 읽지 않기 위해", () => {
    /**
     * 답을 판끼리 **돌려 끼워** 「지면 수 조합이 남의 답을 맞히는 비율」을 잰다.
     * 이 값보다 지름길 가드의 거른 비율이 낮으면 그 가드는 **우연보다 못하다** —
     * 실측(창 전수·널 모형 3회)은 `89X` 2.75% · `90X` 3.16% · `91X` 1.67% ·
     * `92X` 8.15% 이고, 가드가 거른 비율은 6.38% · 4.42% · **1.45%** · 9.43% 다.
     * 곧 **`91X` 의 지름길 가드는 우연보다도 약하다** — 그 사실을 모듈 주석에
     * 적어 두었고, 여기서는 널 모형이 **$0$ 이 아님**을 확인해 그 비교가 뜻을
     * 가지게 한다(널 모형이 늘 $0$ 이면 무엇과도 견줄 수 없다).
     */
    const chance: Record<string, number> = {};
    for (const key of KEYS) {
      const rows = BULK.map(([s, v]) => {
        const p = build(key, s, v);
        return {
          nums: pageNumbers(p.content),
          ans: answerNumber(p.answer),
        };
      });
      let hit = 0;
      let trials = 0;
      for (const rot of [1, 37, 91]) {
        for (let i = 0; i < rows.length; i += 1) {
          const other = rows[(i + rot) % rows.length]!;
          if (other.ans === rows[i]!.ans) continue;
          trials += 1;
          if (pageShortcutValues(rows[i]!.nums).has(other.ans)) hit += 1;
        }
      }
      expect(trials, `${key} 널 모형을 한 번도 못 돌렸다`).toBeGreaterThan(300);
      chance[key] = (hit / trials) * 100;
    }
    // 널 모형이 넷 다 $0$ 이 아니다 — 그래야 「우연보다 낫다/못하다」가 말이 된다.
    for (const key of KEYS) {
      expect(
        chance[key],
        `${key} 널 모형 ${chance[key]!.toFixed(2)}%`,
      ).toBeGreaterThan(0);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 🔴 ㉳ 해설의 «말» — **판정을 진술하는 문장**을 지키는 자
//
// 4차 물결 검문에서 낱말 가드에 큰 구멍이 있었다. 참인 문장을 거짓으로 뒤집는
// 변이가 **13개 중 10개 초록**이었다 — 「약수」를 「배수」로, 「세 번째 값」을
// 「두 번째」로 바꿔도 아무 시험도 안 물었다. 굳힘 개념과 마무리 논거가 통째로
// 그 문장들 안에 있다.
//
// ⚠️ 값 검산·KaTeX·해설 높이·조사 자는 이 부류를 **구조적으로** 못 본다 —
//    문장이 거짓이어도 값은 그대로이기 때문이다(2026-08-24 「값이 맞으면 시험이
//    다 초록이다」와 같은 자리).
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」 — 값은 지면에서 다시 읽어 만든다. */
function requiredWords(key: string, content: string): string[] {
  if (key === K89) {
    const { s, d } = read89(content);
    const stop = Math.floor((s - 1) / 2);
    return [
      `$m<n$이라 하면 $m+n=${s}$이다.`,
      "대각선의 개수의 합은",
      `$m$이 $${stop + 1}$ 이상이면 $n$이 $m$보다 크지 않아 $m<n$에 어긋나므로`,
      `이는 $${d}$${waGwaTest(d)} 같으므로 조건에 맞는다.`,
      `이는 $${d}$${iGaTest(d)} 아니므로 조건에 맞지 않는다.`,
    ];
  }
  if (key === K90) {
    const { when, p, q } = read90(content);
    return [
      "(시간)은 (거리)를 (속력)으로 나눈 값이므로",
      `${when}까지 남은 시간을 $t$분이라 하면`,
      "두 식의 차를 구하면 $t$가 없어져",
      `$${p}$분 늦게 도착하므로`,
      `$${q}$분 일찍 도착하므로`,
    ];
  }
  if (key === K91) {
    const { d1, r1 } = read91(content);
    return [
      "정가는 하나뿐이므로 두 식이 같다",
      `원가보다 원가의 $${r1}\\%$만큼 많으므로`,
      `여기에 할인한 $${d1}$원을 더한 것이 정가이므로`,
      "양변에서 $x$를 빼고 정리하면",
    ];
  }
  if (key === K92) {
    const { c1, d1 } = read92(content);
    return [
      "두 수의 차의 절댓값은 수직선 위에서 그 두 수를 나타내는 두 점 사이의 거리와 같다",
      `$${c1}$보다 $${d1}$만큼 작은 수부터 $${d1}$만큼 큰 수까지이므로`,
      "하나씩 두 번째 조건에 대 본다",
      "보다 크므로 조건에 맞는다",
      "보다 작으므로 조건에 맞지 않는다",
    ];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K89]: [
    ["$m<n$이라 하면", "$m>n$이라 하면"],
    ["대각선의 개수의 합은", "대각선의 개수의 곱은"],
    ["$n$이 $m$보다 크지 않아", "$n$이 $m$보다 작지 않아"],
    ["같으므로 조건에 맞는다", "같으므로 조건에 맞지 않는다"],
    ["아니므로 조건에 맞지 않는다", "아니므로 조건에 맞는다"],
  ],
  [K90]: [
    ["나눈 값이므로", "곱한 값이므로"],
    ["까지 남은 시간을", "까지 지난 시간을"],
    ["$t$가 없어져", "$t$가 남아"],
    ["분 늦게 도착하므로", "분 일찍 도착하므로"],
    ["분 일찍 도착하므로", "분 늦게 도착하므로"],
  ],
  [K91]: [
    ["정가는 하나뿐이므로", "원가는 하나뿐이므로"],
    ["만큼 많으므로", "만큼 적으므로"],
    ["더한 것이 정가이므로", "뺀 것이 정가이므로"],
    ["양변에서 $x$를 빼고", "양변에서 $x$를 더하고"],
  ],
  [K92]: [
    ["두 점 사이의 거리와 같다", "두 점 사이의 거리보다 크다"],
    ["만큼 작은 수부터", "만큼 큰 수부터"],
    ["하나씩 두 번째 조건에 대 본다", "하나씩 첫 번째 조건에 대 본다"],
    ["보다 크므로 조건에 맞는다", "보다 크므로 조건에 맞지 않는다"],
    ["보다 작으므로 조건에 맞지 않는다", "보다 작으므로 조건에 맞는다"],
  ],
};

function missingWords(
  key: string,
  content: string,
  solution: string,
): string[] {
  return requiredWords(key, content).filter((w) => !solution.includes(w));
}

describe("[중1 5차g 물결] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
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

  it("눈금 — 낱말을 하나씩 뒤집으면 **전부** 빨개진다 (양성 19 · 음성 4)", () => {
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
    expect(positives).toBe(19);
  });
});
