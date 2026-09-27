/**
 * 중1 **5차 확대 갈래 (갈래 d)** — `m1Top5d.ts` 의 `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `77X` | 계급마다 $f\times100$ 과 $N\times p$ 를 **정수로** 견준다 | 자료 $N$ 개를 **통째로 늘어놓고**(계급값을 도수만큼 복사) 값마다 몇 번 나오는지 세어 견준다 — 도수 배열을 한 번도 안 더한다 |
 * | `78X` | 닫힌 식 $x=\{(a-b)M+(100-b)s\}\div a$ 로 **한 번에** 낸다 | 식을 세우지 않는다 — $x=1$ 부터 $M-1$ 까지 넣어 「덜어낸 뒤 용질의 양 $+s$」가 「나중 용질의 양」과 같아지는 자리를 **찾는다** |
 * | `79X` | 밑변$\times$높이$\div2$ (좌표축에 평행한 변을 밑변으로) | **신발끈 공식**으로 세 꼭짓점에서 곧장 넓이를 낸다. 삼각형도 네 점의 **모든 세 점 뽑기**로 만든다(「밑변이 $\mathrm{AB}$ 인 둘 · $\mathrm{CD}$ 인 둘」이라는 구조를 안 쓴다) |
 * | `80X` | 닫힌 식 $2mn$ | 격자점을 **하나씩 만들어** 조건을 확인하고 센다($[-40,40]^2$ 전수) |
 *
 * ## 🔴 앞 물결들이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다.** → 제품 `estimateSolutionPx` 로
 *    **660판**을 재어 **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고
 *    답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac`/`\frac` 을 **전부** 훑는다.
 *    이 파일의 넷은 분수를 아예 안 쓰므로 「$0$ 자리」가 참인데, 「$0$」이 «깨끗»인지
 *    «못 셈»인지 가르려고 **검출기가 살아 있는지**를 손으로 쓴 글로 따로 확인한다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다.** → 공용 `declaredUpperBound` 가
 *    **660판 전량에서 `null`** 임을 잠근다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → 「이상↔미만」·「크므로↔작으므로」·
 *    「변하지 않으므로↔변하므로」·「가장 크고↔가장 작고」·「겹치지 않으므로↔겹치므로」를
 *    **낱말과 수를 함께** 판정하고, 뒤집으면 빨개지는 **양성 눈금**을 같이 둔다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다.** → `77X` 의 도수가
 *    오름차순인 판과 내림차순인 판이 **둘 다** 나오는지, 그리고 「가장 큰 도수」가
 *    늘 같은 자리에 오지 않는지 잰다.
 * ㉶ **D-20 손실 원장은 재현 가능해야 한다.** → 모듈 주석의 수치를 재려면
 *    `scripts` 밖의 뽑기가 필요하므로 여기서는 **가드가 실제로 무는지**만 잠근다
 *    (지름길이 답과 부딪히는 판이 $0$, 그리고 그 자가 후보를 **실제로 만든다**).
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
 * ⚠️ **판정기(`scripts/qa/probe-middle-top-m1.ts`)의 `AXES` 에 이 넷의 축을 적는 것은
 *    리드 몫이다.** 그 파일은 21갈래가 함께 쓰는 공용물이라 이 갈래가 손대면 말없이
 *    덮어쓴다(2026-08-23). 대신 여기서 **같은 뜻의 축**을 세워 재고, 그 자의 지면 수
 *    조합 도구(`obviousCandidates`)는 **그대로 import 해서** 쓴다.
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
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { estimateSolutionPx } from "@/lib/printOverflow";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  classesAtLeastPercent,
  drawnSaltAmount,
  fourTriangleAreas,
  M1_TOP_5D,
  quadrantLatticeCount,
} from "@/lib/middle/m1Top5d";
import { pageShortcutValues } from "@/lib/middle/m1Top4";
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
import {
  josaMismatches,
  pageSmells,
  trailingReadNumber,
} from "../helpers/midPage";

const K77 = "1-2|도수분포표와 상대도수|77X";
const K78 = "1-1|일차방정식의 활용|78X";
const K79 = "1-1|좌표와 그래프|79X";
const K80 = "1-1|좌표와 그래프|80X";
const KEYS = [K77, K78, K79, K80] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K77]: "심화상",
  [K78]: "심화중",
  [K79]: "심화상",
  [K80]: "심화중",
};

/** 리드가 갈래마다 준 변형 폭의 바닥. */
const VARIANT_FLOOR: Record<string, number> = {
  [K77]: 5,
  [K78]: 8,
  [K79]: 12,
  [K80]: 12,
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
const ENTRY = new Map(M1_TOP_5D.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차 d ${key}`);
  assertChoiceCount(content, `중1 5차 d ${key}`);
  assertChoiceMarks(content, `중1 5차 d ${key}`);
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
};

/**
 * 사분면마다 두 좌표의 부호 — **여기 다시 적는다.**
 *
 * 생성기의 `QUADRANT_SIGNS` 를 가져오면 「부호 낱말이 사분면과 맞나」가 동어반복이
 * 된다. 이 표는 교과서에서 온 것이고, 둘이 갈라지면 아래 검사가 빨개진다.
 */
const SIGNS: Record<number, readonly [boolean, boolean]> = {
  1: [true, true],
  2: [false, true],
  3: [false, false],
  4: [true, false],
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
//
// ⚠️ 4차 물결의 시험(`middleM1Top4.test.ts`)에 같은 계산기가 있다. 그 파일을
//    import 하면 그쪽 시험이 통째로 한 번 더 돌므로 여기 한 벌을 둔다 — 이것은
//    **시험 쪽 연장**이라 제품 규칙이 두 벌이 되는 것과는 다른 이야기다.

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
 * 다루는 것: 정수 · 소수 · `+` · `-` · `\times` · `\div` · `\dfrac{}{}` · `()`.
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
  function term(): Rat {
    let v = unary();
    for (;;) {
      ws();
      if (src.startsWith("\\times", i)) {
        i += 6;
        v = ratMul(v, unary());
      } else if (src.startsWith("\\div", i)) {
        i += 4;
        v = ratDiv(v, unary());
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
 * ⚠️ 명령 이름을 지운 **뒤에** 글자가 남으면 문자식이다(`$20\times x$`).
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

const RE77 =
  /^어느 반 학생들의 (.+?) 조사하여 도수분포다각형으로 나타내었다\. 계급값이 ((?:\$\d+\$, ){4}\$\d+\$)인 다섯 계급의 도수는 차례로 ((?:\$\d+\$, ){4}\$\d+\$)이다\. 도수가 전체의 \$(\d+)\\%\$ 이상인 계급의 계급값을 모두 구하여 그 합을 구하시오\.$/;

const RE78 =
  // ⚠️ 그릇 이름은 **지면 축**이라 뜻에 관여하지 않는다 — 잡지 않고 «셋 중 하나»만
  //    확인한다(넷째가 몰래 들어오면 여기서 던진다).
  /^\$(\d+)\\%\$의 (소금물|설탕물) \$(\d+)\\,\\mathrm\{g\}\$이 담긴 (?:그릇|비커|컵)에서 \2을 얼마쯤 덜어내고, 덜어낸 양만큼 물을 넣었다\. 여기에 (소금|설탕) \$(\d+)\\,\\mathrm\{g\}\$을 더 넣고 잘 섞었더니 \$(\d+)\\%\$의 \2이 되었다\. 덜어낸 \2의 양을 구하시오\.$/;

const RE79 =
  /^좌표평면 위에 네 점 \$\\mathrm\{A\}\((-?\d+),\\ (-?\d+)\)\$, \$\\mathrm\{B\}\((-?\d+),\\ (-?\d+)\)\$, \$\\mathrm\{C\}\((-?\d+),\\ (-?\d+)\)\$, \$\\mathrm\{D\}\((-?\d+),\\ (-?\d+)\)\$(?:이|가) 있다\. 이 중에서 세 점을 골라 만든 삼각형의 넓이 가운데 가장 큰 값과 가장 작은 값의 차를 구하시오\. \(단, 어느 세 점도 한 직선 위에 있지 않다\.\)$/;

const RE80 =
  /^\$x\$좌표와 \$y\$좌표가 모두 정수인 점 중에서 \$x\$축까지의 거리가 \$(\d+)\$ (이하|미만)이고 \$y\$축까지의 거리가 \$(\d+)\$ (이하|미만)이며, 제\$(\d)\$사분면 또는 제\$(\d)\$사분면 위에 있는 점의 개수를 구하시오\.$/;

function read77(content: string): {
  classValues: number[];
  frequencies: number[];
  percent: number;
} {
  const [, cs, fs, p] = grab(RE77, content, "77X");
  const classValues = readList(cs!);
  const frequencies = readList(fs!);
  if (classValues.length !== 5 || frequencies.length !== 5) {
    throw new Error("77X: 계급이 다섯이 아니다");
  }
  return { classValues, frequencies, percent: num(p!) };
}

function read78(content: string): {
  a: number;
  liquid: string;
  mass: number;
  solute: string;
  salt: number;
  b: number;
} {
  const [a, liquid, mass, solute, salt, b] = grab(RE78, content, "78X");
  if (`${solute}물` !== liquid) throw new Error("78X: 용질과 용액이 안 맞는다");
  return {
    a: num(a!),
    liquid: liquid!,
    mass: num(mass!),
    solute: solute!,
    salt: num(salt!),
    b: num(b!),
  };
}

function read79(content: string): {
  pts: [number, number][];
} {
  const raw = grab(RE79, content, "79X").map(num);
  const pts: [number, number][] = [
    [raw[0]!, raw[1]!],
    [raw[2]!, raw[3]!],
    [raw[4]!, raw[5]!],
    [raw[6]!, raw[7]!],
  ];
  return { pts };
}

function read80(content: string): {
  mSaid: number;
  mStrict: boolean;
  nSaid: number;
  nStrict: boolean;
  q1: number;
  q2: number;
} {
  const [m, mw, n, nw, q1, q2] = grab(RE80, content, "80X");
  return {
    mSaid: num(m!),
    mStrict: mw === "미만",
    nSaid: num(n!),
    nStrict: nw === "미만",
    q1: num(q1!),
    q2: num(q2!),
  };
}

/** 신발끈 공식 — 생성기의 「밑변$\times$높이$\div2$」와 **다른 길**이다. */
function shoelaceArea(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): number {
  return (
    Math.abs(
      a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]),
    ) / 2
  );
}

/** 네 점에서 세 점을 고르는 **모든** 방법 — 구조를 가정하지 않는다. */
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 2, 3],
  [1, 2, 3],
];

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

const VERIFY: Record<string, (content: string) => number> = {
  [K77]: (content) => {
    const { classValues, frequencies, percent } = read77(content);
    const step = classValues[1]! - classValues[0]!;
    if (step <= 0) throw new Error("77X: 계급값이 오름차순이 아니다");
    for (let i = 1; i < 5; i += 1) {
      if (classValues[i]! - classValues[i - 1]! !== step) {
        throw new Error("77X: 계급의 크기가 일정하지 않다");
      }
    }
    if (new Set(frequencies).size !== 5) {
      throw new Error("77X: 도수가 서로 다르지 않다");
    }
    if (frequencies.some((f) => f < 2))
      throw new Error("77X: 도수가 너무 작다");
    // 🔴 자료를 **통째로 늘어놓고** 센다 — 도수 배열을 한 번도 안 더한다.
    const data: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      for (let k = 0; k < frequencies[i]!; k += 1) data.push(classValues[i]!);
    }
    if (data.length < 25 || data.length > 70) {
      throw new Error(`77X: 자료가 ${data.length} 개다 (25~70이어야 한다)`);
    }
    const alive: number[] = [];
    for (const c of classValues) {
      const count = data.filter((v) => v === c).length;
      if (count * 100 >= data.length * percent) alive.push(c);
    }
    if (alive.length < 3 || alive.length > 4) {
      throw new Error(
        `77X: 조건에 맞는 계급이 ${alive.length} 개다 (셋~넷이어야 한다)`,
      );
    }
    const x = alive.reduce((a, b) => a + b, 0);
    if (alive.includes(x)) throw new Error("77X: 답이 후보 목록 안에 있다");
    if (pageShortcutValues([...classValues, ...frequencies, percent]).has(x)) {
      throw new Error("77X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K78]: (content) => {
    const { a, mass, salt, b } = read78(content);
    if (a === b) throw new Error("78X: 처음과 나중 농도가 같다");
    if ((a * mass) % 100 !== 0)
      throw new Error("78X: 처음 용질이 정수가 아니다");
    if ((b * (mass + salt)) % 100 !== 0) {
      throw new Error("78X: 나중 용질이 정수가 아니다");
    }
    // 🔴 식을 세우지 않는다 — $x$ 를 넣어 «용질의 양»이 맞아떨어지는 자리를 찾는다.
    const endSolute = ((mass + salt) * b) / 100;
    const found: number[] = [];
    for (let cand = 1; cand < mass; cand += 1) {
      if ((a * (mass - cand)) % 100 !== 0) continue;
      if ((a * (mass - cand)) / 100 + salt === endSolute) found.push(cand);
    }
    if (found.length !== 1) {
      throw new Error(`78X: 조건에 맞는 값이 ${found.length} 개다`);
    }
    const x = found[0]!;
    if (pageShortcutValues([a, mass, salt, b]).has(x)) {
      throw new Error("78X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K79]: (content) => {
    const { pts } = read79(content);
    if (pts.some(([px, py]) => px === 0 || py === 0)) {
      throw new Error("79X: 좌표에 $0$ 이 있어 지면에 `-0` 이 나간다");
    }
    // 🔴 **신발끈 공식**으로 네 삼각형을 모두 만든다 — 밑변·높이 구조를 안 쓴다.
    const areas = TRIPLES.map(([i, j, k]) =>
      shoelaceArea(pts[i]!, pts[j]!, pts[k]!),
    );
    if (areas.some((s) => s === 0)) {
      throw new Error("79X: 세 점이 한 직선 위에 있어 삼각형이 아니다");
    }
    if (areas.some((s) => !Number.isInteger(s))) {
      throw new Error("79X: 넓이가 정수가 아니다");
    }
    if (new Set(areas).size !== 4) {
      throw new Error("79X: 넓이가 같은 삼각형이 있어 최대·최소가 흐려진다");
    }
    const mx = Math.max(...areas);
    const mn = Math.min(...areas);
    if (mn < 3) throw new Error("79X: 가장 작은 넓이가 너무 작다");
    const x = mx - mn;
    if (x < 5) throw new Error("79X: 최대와 최소의 차가 너무 작다");
    if (pageShortcutValues(pts.flat()).has(x)) {
      throw new Error("79X: 답이 지면 수 조합으로 나온다");
    }
    return x;
  },

  [K80]: (content) => {
    const { mSaid, mStrict, nSaid, nStrict, q1, q2 } = read80(content);
    if (q1 === q2) throw new Error("80X: 두 사분면이 같다");
    const m = mStrict ? mSaid - 1 : mSaid;
    const n = nStrict ? nSaid - 1 : nSaid;
    if (m < 2 || n < 2) throw new Error("80X: 셀 수 있는 자리가 너무 좁다");
    // 🔴 격자점을 **하나씩 만들어** 센다 — 곱셈 공식을 한 번도 안 쓴다.
    let count = 0;
    for (let bx = -40; bx <= 40; bx += 1) {
      for (let by = -40; by <= 40; by += 1) {
        if (Math.abs(by) > m) continue; // $x$축까지의 거리
        if (Math.abs(bx) > n) continue; // $y$축까지의 거리
        if (bx === 0 || by === 0) continue; // 축 위의 점은 사분면에 없다
        const quadrant = bx > 0 ? (by > 0 ? 1 : 4) : by > 0 ? 2 : 3;
        if (quadrant === q1 || quadrant === q2) count += 1;
      }
    }
    if (count === 0) throw new Error("80X: 조건에 맞는 점이 하나도 없다");
    if (pageShortcutValues([mSaid, nSaid, q1, q2]).has(count)) {
      throw new Error("80X: 답이 지면 수 조합으로 나온다");
    }
    return count;
  },
};

/**
 * 해설에 **나와도 되는 수** — `content` 만 보고 다시 만든다.
 *
 * 여기 없는 수가 해설에 있으면 그것은 **아무 재계산으로도 설명되지 않는 수**다.
 */
const EXPLAINED: Record<string, (content: string) => Set<number>> = {
  [K77]: (content) => {
    const { classValues, frequencies, percent } = read77(content);
    const total = frequencies.reduce((a, b) => a + b, 0);
    const out = new Set<number>([percent, total, 100, total * percent]);
    for (const c of classValues) out.add(c);
    for (const f of frequencies) {
      out.add(f);
      out.add(f * 100);
    }
    const alive = classValues.filter(
      (_, i) => frequencies[i]! * 100 >= total * percent,
    );
    out.add(alive.reduce((a, b) => a + b, 0));
    return out;
  },
  [K78]: (content) => {
    const { a, mass, salt, b } = read78(content);
    const totalMass = mass + salt;
    const endSolute = (totalMass * b) / 100;
    const out = new Set<number>([
      a,
      b,
      mass,
      salt,
      100,
      totalMass,
      endSolute,
      (mass * a) / 100,
      a * mass,
      100 * salt,
      b * totalMass,
    ]);
    for (let cand = 1; cand < mass; cand += 1) {
      if ((a * (mass - cand)) % 100 !== 0) continue;
      if ((a * (mass - cand)) / 100 + salt !== endSolute) continue;
      out.add(cand);
      out.add(a * cand);
      out.add((a * (mass - cand)) / 100);
    }
    return out;
  },
  [K79]: (content) => {
    const { pts } = read79(content);
    const out = new Set<number>([2]);
    for (const [px, py] of pts) {
      out.add(Math.abs(px));
      out.add(Math.abs(py));
    }
    // 두 밑변과 네 높이·네 넓이
    const [A, B, C, D] = pts as [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
    out.add(Math.abs(B[0] - A[0]));
    out.add(Math.abs(C[1] - D[1]));
    out.add(Math.abs(C[1] - A[1]));
    out.add(Math.abs(D[1] - A[1]));
    out.add(Math.abs(C[0] - A[0]));
    out.add(Math.abs(C[0] - B[0]));
    const areas = TRIPLES.map(([i, j, k]) =>
      shoelaceArea(pts[i]!, pts[j]!, pts[k]!),
    );
    for (const s of areas) out.add(s);
    out.add(Math.max(...areas) - Math.min(...areas));
    return out;
  },
  [K80]: (content) => {
    const { mSaid, mStrict, nSaid, nStrict, q1, q2 } = read80(content);
    const m = mStrict ? mSaid - 1 : mSaid;
    const n = nStrict ? nSaid - 1 : nSaid;
    return new Set<number>([
      0,
      1,
      q1,
      q2,
      mSaid,
      nSaid,
      m,
      n,
      m * n,
      2 * m * n,
    ]);
  },
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 손으로 쓴 지면(엔진 밖) — 답을 사람이 계산해 두었다. */
const GOOD_PAGES: readonly { key: string; page: string; want: number }[] = [
  {
    key: K77,
    // $N=43$, 기준 $43\times20=860$. $f\times100$ 은 $1100,1400,300,900,600$ 이므로
    // 살아남는 계급값은 $55,65,85$ 이고 합은 $205$ 다.
    page:
      "어느 반 학생들의 국어 점수를 조사하여 도수분포다각형으로 나타내었다. " +
      "계급값이 $55$, $65$, $75$, $85$, $95$인 다섯 계급의 도수는 차례로 " +
      "$11$, $14$, $3$, $9$, $6$이다. " +
      "도수가 전체의 $20\\%$ 이상인 계급의 계급값을 모두 구하여 그 합을 구하시오.",
    want: 205,
  },
  {
    key: K78,
    // 처음 소금 $60$g. $160$g 덜어내면 남은 $140$g 에 소금 $28$g. 물을 채워 $300$g,
    // 소금 $20$g 을 넣으면 $320$g 에 소금 $48$g 이고 $48\div320=0.15$ 다.
    page:
      "$20\\%$의 소금물 $300\\,\\mathrm{g}$이 담긴 그릇에서 소금물을 얼마쯤 덜어내고, " +
      "덜어낸 양만큼 물을 넣었다. 여기에 소금 $20\\,\\mathrm{g}$을 더 넣고 잘 섞었더니 " +
      "$15\\%$의 소금물이 되었다. 덜어낸 소금물의 양을 구하시오.",
    want: 160,
  },
  {
    key: K79,
    // $\mathrm{AB}=10$, $\mathrm{CD}=6$. 넓이는 차례로 $40,10,33,3$ 이고 $40-3=37$.
    page:
      "좌표평면 위에 네 점 $\\mathrm{A}(-4,\\ 3)$, $\\mathrm{B}(6,\\ 3)$, " +
      "$\\mathrm{C}(7,\\ -5)$, $\\mathrm{D}(7,\\ 1)$이 있다. " +
      "이 중에서 세 점을 골라 만든 삼각형의 넓이 가운데 가장 큰 값과 가장 작은 값의 차를 구하시오. " +
      "(단, 어느 세 점도 한 직선 위에 있지 않다.)",
    want: 37,
  },
  {
    key: K80,
    // $|b|\le7$ 이고 $|a|\le9$($10$ 미만). 제$2$사분면 $9\times7=63$, 제$4$사분면도 $63$.
    page:
      "$x$좌표와 $y$좌표가 모두 정수인 점 중에서 $x$축까지의 거리가 $7$ 이하이고 " +
      "$y$축까지의 거리가 $10$ 미만이며, 제$2$사분면 또는 제$4$사분면 위에 있는 점의 개수를 구하시오.",
    want: 126,
  },
];

/** 손으로 쓴 **나쁜** 지면 — 검산기가 반드시 던져야 한다. */
const BAD_PAGES: readonly { key: string; page: string; why: string }[] = [
  {
    key: K77,
    page:
      "어느 반 학생들의 국어 점수를 조사하여 도수분포다각형으로 나타내었다. " +
      "계급값이 $55$, $65$, $75$, $85$, $95$인 다섯 계급의 도수는 차례로 " +
      "$20$, $14$, $3$, $2$, $2$이다. " +
      "도수가 전체의 $20\\%$ 이상인 계급의 계급값을 모두 구하여 그 합을 구하시오.",
    why: "조건에 맞는 계급이 둘뿐 — 답이 두 지면 수의 합이 되어 「모두」가 무색하다",
  },
  {
    key: K77,
    page:
      "어느 반 학생들의 국어 점수를 조사하여 도수분포다각형으로 나타내었다. " +
      "계급값이 $55$, $65$, $70$, $85$, $95$인 다섯 계급의 도수는 차례로 " +
      "$11$, $14$, $3$, $9$, $6$이다. " +
      "도수가 전체의 $20\\%$ 이상인 계급의 계급값을 모두 구하여 그 합을 구하시오.",
    why: "계급의 크기가 일정하지 않다 — 도수분포다각형이 아니다",
  },
  {
    key: K78,
    page:
      "$20\\%$의 소금물 $300\\,\\mathrm{g}$이 담긴 그릇에서 소금물을 얼마쯤 덜어내고, " +
      "덜어낸 양만큼 물을 넣었다. 여기에 소금 $20\\,\\mathrm{g}$을 더 넣고 잘 섞었더니 " +
      "$20\\%$의 소금물이 되었다. 덜어낸 소금물의 양을 구하시오.",
    why: "처음과 나중 농도가 같다 — 덜어낸 양이 소금의 양만으로 정해진다",
  },
  {
    key: K78,
    page:
      "$13\\%$의 소금물 $300\\,\\mathrm{g}$이 담긴 그릇에서 소금물을 얼마쯤 덜어내고, " +
      "덜어낸 양만큼 물을 넣었다. 여기에 소금 $20\\,\\mathrm{g}$을 더 넣고 잘 섞었더니 " +
      "$15\\%$의 소금물이 되었다. 덜어낸 소금물의 양을 구하시오.",
    why: "처음 소금의 양이 정수가 아니다",
  },
  {
    key: K79,
    page:
      "좌표평면 위에 네 점 $\\mathrm{A}(-4,\\ 3)$, $\\mathrm{B}(6,\\ 3)$, " +
      "$\\mathrm{C}(7,\\ 3)$, $\\mathrm{D}(7,\\ 1)$이 있다. " +
      "이 중에서 세 점을 골라 만든 삼각형의 넓이 가운데 가장 큰 값과 가장 작은 값의 차를 구하시오. " +
      "(단, 어느 세 점도 한 직선 위에 있지 않다.)",
    why: "$\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$ 가 한 직선 위 — 넓이가 $0$ 이다",
  },
  {
    key: K79,
    page:
      "좌표평면 위에 네 점 $\\mathrm{A}(-4,\\ 3)$, $\\mathrm{B}(6,\\ 3)$, " +
      "$\\mathrm{C}(0,\\ -5)$, $\\mathrm{D}(0,\\ 1)$이 있다. " +
      "이 중에서 세 점을 골라 만든 삼각형의 넓이 가운데 가장 큰 값과 가장 작은 값의 차를 구하시오. " +
      "(단, 어느 세 점도 한 직선 위에 있지 않다.)",
    why: "좌표에 $0$ 이 있다 — 지면에 `-0` 이 나가 냄새 자가 문다",
  },
  {
    key: K80,
    page:
      "$x$좌표와 $y$좌표가 모두 정수인 점 중에서 $x$축까지의 거리가 $7$ 이하이고 " +
      "$y$축까지의 거리가 $10$ 미만이며, 제$2$사분면 또는 제$2$사분면 위에 있는 점의 개수를 구하시오.",
    why: "두 사분면이 같다 — 「겹치지 않으므로」가 거짓이 된다",
  },
  {
    key: K80,
    page:
      "$x$좌표와 $y$좌표가 모두 정수인 점 중에서 $x$축까지의 거리가 $2$ 미만이고 " +
      "$y$축까지의 거리가 $10$ 미만이며, 제$2$사분면 또는 제$4$사분면 위에 있는 점의 개수를 구하시오.",
    why: "$y$좌표가 $-1$ 과 $1$ 뿐이라 셀 자리가 너무 좁다",
  },
  {
    key: K80,
    // 창을 전수로 훑어 찾은 **진짜 지름길 판**이다 — $m=3$, $n=2$ 라 답이 $12$ 이고
    // 그것은 지면의 $3$ 과 $4$ 의 곱이다. 「지름길 0」이 «못 셈»이 아님을 이 판이 보인다.
    page:
      "$x$좌표와 $y$좌표가 모두 정수인 점 중에서 $x$축까지의 거리가 $3$ 이하이고 " +
      "$y$축까지의 거리가 $3$ 미만이며, 제$1$사분면 또는 제$4$사분면 위에 있는 점의 개수를 구하시오.",
    why: "답 $12$ 가 지면의 $3$ 과 $4$ 의 곱이다 — 지면 수 조합",
  },
];

describe("중1 5차 확대 갈래 d — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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

  it("🔴 등식 계산기 자체의 눈금 — 참·거짓·나눗셈·못 읽음을 각각 가른다", () => {
    expect(arithmeticEquationFailures("$1+2+3=6$이다.")).toEqual([]);
    expect(arithmeticEquationFailures("$1+2+3=7$이다.")).toHaveLength(1);
    expect(arithmeticEquationFailures("$300\\times20\\div100=60$")).toEqual([]);
    expect(
      arithmeticEquationFailures("$300\\times20\\div100=70$"),
    ).toHaveLength(1);
    expect(arithmeticEquationFailures("$(300-40)\\times20=5200$")).toEqual([]);
    // 문자식은 «판정하지 않는다» — 계산하려 들면 거짓 빨강이 난다.
    expect(
      arithmeticEquationFailures("$(300-x)\\times20\\div100+20=48$"),
    ).toEqual([]);
    // 읽을 수 없는 글자는 조용히 넘기지 않고 **실패로 센다**.
    expect(arithmeticEquationFailures("$1++2=3$")).toHaveLength(1);
  });

  it("🔴 기약 분수 검출기가 살아 있다 — 「$0$ 자리」가 «못 셈»이 아님을 보인다", () => {
    expect(numericFractions("값은 $\\dfrac{3}{4}$이다.")).toEqual([[3, 4]]);
    expect(numericFractions("값은 $\\frac{2}{6}$이다.")).toEqual([[2, 6]]);
    expect(numericFractions("값은 $3\\div4$이다.")).toEqual([]);
  });

  it("🔴 수관형사·사분면 부호 표가 생성기 것과 **다른 벌**이다", () => {
    // 가져다 쓰면 동어반복이다. 둘이 갈라지면 아래 검사들이 빨개진다.
    expect(COUNT_WORD[3]).toBe("세");
    expect(Object.keys(COUNT_WORD)).toHaveLength(5);
    expect(SIGNS[2]).toEqual([false, true]);
    expect(Object.keys(SIGNS)).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — 굳힘 함수와 음성 대조", () => {
  it("`classesAtLeastPercent` 는 손 계산과 맞는다", () => {
    // $N=43$, 기준 $860$. $f\times100$: $1100,1400,300,900,600$
    expect(
      classesAtLeastPercent([55, 65, 75, 85, 95], [11, 14, 3, 9, 6], 20),
    ).toEqual([55, 65, 85]);
  });

  it("🔴 음성 대조 — 기준을 낮추면 **다섯이 전부** 살아 「계급값의 합」과 안 갈린다", () => {
    expect(
      classesAtLeastPercent([55, 65, 75, 85, 95], [11, 14, 3, 9, 6], 5),
    ).toEqual([55, 65, 75, 85, 95]);
    // 반대로 올리면 하나만 산다 — 굳힘 인자가 실제로 고르고 있다.
    expect(
      classesAtLeastPercent([55, 65, 75, 85, 95], [11, 14, 3, 9, 6], 31),
    ).toEqual([65]);
  });

  it("`drawnSaltAmount` 는 손 계산과 맞는다", () => {
    // $20\%$ $300$g → $160$g 덜어내고 물 채운 뒤 소금 $20$g → $15\%$
    expect(drawnSaltAmount(20, 300, 20, 15)).toBe(160);
  });

  it("🔴 음성 대조 — 나누어떨어지지 않거나 창을 벗어나면 `null` 이다", () => {
    expect(drawnSaltAmount(7, 300, 20, 15)).toBeNull(); // 정수가 아니다
    expect(drawnSaltAmount(20, 300, 20, 5)).toBeNull(); // $x\ge M$
    // 🔴 $b=a$ 이면 답이 **소금물의 양과 무관**해진다 — 생성기가 버리는 까닭이다.
    expect(drawnSaltAmount(20, 300, 20, 20)).toBe(
      drawnSaltAmount(20, 500, 20, 20),
    );
    expect(drawnSaltAmount(20, 300, 20, 20)).toBe(80);
  });

  it("`fourTriangleAreas` 는 신발끈 공식과 맞는다 (같은 값, 다른 길)", () => {
    const areas = fourTriangleAreas(-4, 6, 3, 7, -5, 1);
    expect(areas).toEqual([40, 10, 33, 3]);
    const pts: [number, number][] = [
      [-4, 3],
      [6, 3],
      [7, -5],
      [7, 1],
    ];
    expect(
      TRIPLES.map(([i, j, k]) => shoelaceArea(pts[i]!, pts[j]!, pts[k]!)),
    ).toEqual(areas);
  });

  it("🔴 음성 대조 — 세 점이 한 직선 위면 그 넓이가 $0$ 이다", () => {
    // $u=t$ 이면 $\mathrm{C}$ 가 직선 $\mathrm{AB}$ 위에 있다.
    expect(fourTriangleAreas(-4, 6, 3, 7, 3, 1)[0]).toBe(0);
  });

  it("`quadrantLatticeCount` 는 손 계산과 맞는다", () => {
    expect(quadrantLatticeCount(7, 9, [2, 4])).toBe(126);
    expect(quadrantLatticeCount(6, 8, [1, 3])).toBe(96);
  });

  it("🔴 음성 대조 — 맞바꾸면 **그대로**이고, 같은 사분면 둘이면 **절반**이다", () => {
    // 곱이라 대칭이다 — 흔들기는 맞바꿈이 아니라 더하기로 해야 갈린다.
    expect(quadrantLatticeCount(7, 9, [2, 4])).toBe(
      quadrantLatticeCount(9, 7, [2, 4]),
    );
    expect(quadrantLatticeCount(7, 9, [2, 2])).toBe(63);
    expect(quadrantLatticeCount(8, 9, [2, 4])).not.toBe(
      quadrantLatticeCount(7, 9, [2, 4]),
    );
    expect(() => quadrantLatticeCount(7, 9, [5, 1])).toThrow();
  });

  it("`pageShortcutValues` 가 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect([...pageShortcutValues([30, 12])]).toContain(18); // 차
    expect([...pageShortcutValues([30, 12])]).not.toContain(7);
    expect([...pageShortcutValues([])]).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5D).toHaveLength(4);
    expect(M1_TOP_5D.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_5D.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5D) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(extensionNumberReason(e), `${e.key}`).toBeNull();
    }
    // 리드가 준 번호대를 그대로 쓴다.
    expect(M1_TOP_5D.map((e) => e.rpmType)).toEqual([
      "77X",
      "78X",
      "79X",
      "80X",
    ]);
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    // ⚠️ 다른 소단원에는 **가는 공백 U+2009** 가 든 것이 있어 눈으로는 안 갈린다.
    //    그래서 정본과 **글자 그대로** 대조한다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5D) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    expect(M1_TOP_5D.map((e) => e.unitSection)).toEqual([
      "도수분포다각형",
      "일차방정식의 활용(도형, 농도, 일)",
      "순서쌍과 좌표평면(응용)",
      "순서쌍과 좌표평면(기본)",
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

describe("중1 5차 확대 갈래 d — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 더 생겼다 (D-116 ⑴)", () => {
    const tiers = KEYS.map((k) => build(k, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중")).toHaveLength(2);
    expect(tiers.filter((t) => t === "심화상")).toHaveLength(2);
  });

  for (const e of M1_TOP_5D) {
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
          // ㉱ 발문이 상한을 선언하면 파생 오답이 그 상한을 넘는다(4차 중2 `37W`).
          expect(
            declaredUpperBound(p.content),
            `상한 선언 ${seed}/${v}`,
          ).toBeNull();
        }
      });

      it("🔴 공용 조사 자가 이 유형에서 **구조적으로 0 이 아니다** — 실제로 «판정하는» 자리가 있다", () => {
        // 3차의 한 유형은 수식이 `)` 로 끝나 조사 자가 800/800 을 건너뛰었다.
        // 「어긋남 0」이 «깨끗»인지 «못 셈»인지 여기서 가른다.
        // ⚠️ 자리를 세는 것만으로는 모자란다 — `trailingReadNumber` 가 `null` 이면
        //    그 자는 **판정하지 않고 지나간다**. 실제로 판정하는 자리만 센다.
        let judged = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          for (const m of `${p.content}\n${p.solution}`.matchAll(
            /\$([^$]*)\$(을|를|은|는|와|과|가)/g,
          )) {
            if (trailingReadNumber(m[1]!) !== null) judged += 1;
          }
        }
        expect(judged, `${e.key} 판정 자리`).toBeGreaterThanOrEqual(220);
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
        //    요구한다 — 하나뿐이면 「등식이 다 맞는다」가 마지막 줄 하나만 보는 셈이다.
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

      it("🔴 지면에 분수가 한 자리도 없다 (㉰ — 기약이 아닌 분수를 만들 자리를 안 둔다)", () => {
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
        // 「$0$ 자리」가 참이라는 것을 못 박는다. 검출기가 살아 있음은 위 눈금이 보인다.
        expect(seen).toBe(0);
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

      it("🔴 변형 폭 — 같은 씨앗에서 변형을 리드가 준 바닥만큼 돌리면 다 다르다", () => {
        const floor = VARIANT_FLOOR[e.key]!;
        for (const seed of SEEDS) {
          const seen = new Set<string>();
          for (let v = 0; v < floor; v += 1) {
            seen.add(build(e.key, seed, v).content);
          }
          expect(seen.size, `${e.key} 씨앗 ${seed} 변형 폭`).toBe(floor);
        }
        // 넓게도 본다 — 660판에서 서로 다른 발문이 바닥의 스무 배는 넘는다.
        const wide = new Set<string>();
        for (const [seed, v] of WIDE) wide.add(build(e.key, seed, v).content);
        expect(wide.size).toBeGreaterThan(floor * 20);
      });

      it("🔴 정답 쏠림 — 660판에서 최빈 정답이 12% 미만이다", () => {
        const freq = new Map<number, number>();
        for (const [seed, v] of WIDE) {
          const a = answerNumber(build(e.key, seed, v).answer);
          freq.set(a, (freq.get(a) ?? 0) + 1);
        }
        const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]!;
        expect(
          top[1] / WIDE.length,
          `${e.key} 최빈 정답 $${top[0]}$ 이 ${((top[1] / WIDE.length) * 100).toFixed(2)}%`,
        ).toBeLessThan(0.12);
        // 서로 다른 답이 스물은 넘어야 「쏠림 12% 미만」이 뜻을 갖는다.
        expect(freq.size).toBeGreaterThan(20);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 지름길 — 지면 수만 보고 답을 집을 수 있나 (판정기의 자를 그대로 쓴다)
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — ㉠ 지름길", () => {
  it("🔴 지면 수 조합이 답과 부딪히지 않는다 (220판 × 네 유형)", () => {
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

  it("🔴 널 모형 — 답을 판끼리 돌려 끼우면 우연히 맞는 판이 **생긴다**", () => {
    // 널 모형이 0 이면 「지름길 0」이 «깨끗»인지 «못 셈»인지 안 갈린다.
    for (const key of KEYS) {
      const rows = BULK.map(([s, v]) => {
        const p = build(key, s, v);
        return {
          nums: pageNumbers(p.content),
          ans: answerNumber(p.answer),
        };
      });
      let chance = 0;
      for (let i = 0; i < rows.length; i += 1) {
        const cand = obviousCandidates(rows[i]!.nums);
        if ([...cand.values()].includes(rows[(i + 7) % rows.length]!.ans)) {
          chance += 1;
        }
      }
      expect(
        chance,
        `${key} 널 모형이 0 이면 이 자는 아무것도 못 잰다`,
      ).toBeGreaterThan(0);
    }
  });

  it("🔴 `77X`·`79X` — 살아남는 «자리»가 씨앗을 가로질러 갈린다 (창이 한쪽 끝만이 아니다)", () => {
    // 초등 네 물결이 물린 함정: 살아남는 후보가 늘 목록의 같은 자리면
    // 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
    const shapes77 = new Set<string>();
    const ascending = { up: 0, down: 0 };
    for (const [s, v] of BULK) {
      const p = build(K77, s, v);
      const { classValues, frequencies, percent } = read77(p.content);
      const total = frequencies.reduce((a, b) => a + b, 0);
      shapes77.add(
        classValues
          .map((_, i) => (frequencies[i]! * 100 >= total * percent ? "O" : "X"))
          .join(""),
      );
      // ㉵ 자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다 — 안 정렬한다.
      const sortedUp = [...frequencies].sort((a, b) => a - b);
      if (frequencies.join() === sortedUp.join()) ascending.up += 1;
      if (frequencies.join() === [...sortedUp].reverse().join()) {
        ascending.down += 1;
      }
    }
    expect(
      shapes77.size,
      "77X 살아남는 자리의 모양이 하나뿐이다",
    ).toBeGreaterThan(4);
    expect(ascending.up, "77X 도수가 늘 오름차순이다").toBeLessThan(11);
    expect(ascending.down, "77X 도수가 늘 내림차순이다").toBeLessThan(11);

    const argmax = new Set<number>();
    const argmin = new Set<number>();
    for (const [s, v] of BULK) {
      const p = build(K79, s, v);
      const { pts } = read79(p.content);
      const areas = TRIPLES.map(([i, j, k]) =>
        shoelaceArea(pts[i]!, pts[j]!, pts[k]!),
      );
      argmax.add(areas.indexOf(Math.max(...areas)));
      argmin.add(areas.indexOf(Math.min(...areas)));
    }
    // 네 삼각형 어느 것이든 가장 클 수도 가장 작을 수도 있어야 한다.
    expect(argmax.size, "79X 가장 큰 삼각형이 늘 같은 자리다").toBe(4);
    expect(argmin.size, "79X 가장 작은 삼각형이 늘 같은 자리다").toBe(4);
  });

  it("🔴 `78X`·`80X` — 후보 목록이 **아예 없다**(해당 없음). 굳힘을 지운 답과 갈리는지를 대신 잰다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다. 그 사실을 여기서 찍는다.
    for (const [s, v] of BULK) {
      // 78X — 「덜어내도 농도는 그대로」를 안 읽으면(=소금을 덜어내지 않았다고 보면)
      //        남은 소금이 처음 그대로라 답이 달라진다.
      const p78 = build(K78, s, v);
      const { a, mass, salt, b } = read78(p78.content);
      const withoutBinding = ((mass + salt) * b) / 100 - salt; // 남은 소금이 이 값이어야 한다
      const wrongX = mass - (withoutBinding * 100) / a; // (참) 굳힘을 읽은 값
      expect(wrongX).toBe(answerNumber(p78.answer));
      // 굳힘을 «지운» 판 — 소금물을 덜어내도 소금은 안 준다고 보면 $x$ 가 안 나온다.
      const noShrink = ((mass * a) / 100 + salt) * 100;
      expect(noShrink).not.toBe(answerNumber(p78.answer));

      // 80X — 「축 위의 점을 안 센다」를 안 읽으면 $0$ 을 넣어 답이 커진다.
      const p80 = build(K80, s, v);
      const { mSaid, mStrict, nSaid, nStrict } = read80(p80.content);
      const m = mStrict ? mSaid - 1 : mSaid;
      const n = nStrict ? nSaid - 1 : nSaid;
      const withZero = 2 * (m + 1) * (n + 1);
      expect(withZero).not.toBe(answerNumber(p80.answer));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 굳힘이 항등식인가 — 인자를 흔들면 답이 바뀌나
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — ㉡ 굳힘이 항등식인가", () => {
  it("`77X` — 기준 백분율을 흔들면 살아남는 계급이 달라진다 (220판)", () => {
    /**
     * ⚠️ **작은 흔들기는 늘 답을 바꾸지 못한다** — 살아남은 계급이 기준보다 훨씬
     * 위에 있으면 기준을 조금 올려도 같은 셋이 산다. 그것은 유형의 결함이 아니라
     * 이 축의 성질이다. 그래서 **반드시 달라지는 두 극단**을 하드 가드로 두고,
     * 작은 흔들기는 **실측한 바닥**으로 잠근다(실측 187/220).
     */
    let small = 0;
    for (const [s, v] of BULK) {
      const p = build(K77, s, v);
      const { classValues, frequencies, percent } = read77(p.content);
      const want = answerNumber(p.answer);
      const sum = (ps: number[]): number => ps.reduce((a, b) => a + b, 0);
      // 기준을 거의 $0$ 으로 내리면 **다섯이 전부** 살아 계급값의 총합이 된다.
      expect(sum(classesAtLeastPercent(classValues, frequencies, 1))).not.toBe(
        want,
      );
      // 기준을 $99\%$ 로 올리면 살아남는 것이 없거나 하나뿐이다.
      expect(sum(classesAtLeastPercent(classValues, frequencies, 99))).not.toBe(
        want,
      );
      if (
        sum(classesAtLeastPercent(classValues, frequencies, percent + 6)) !==
        want
      ) {
        small += 1;
      }
    }
    expect(
      small,
      "기준을 조금 올려도 답이 그대로인 판이 너무 많다",
    ).toBeGreaterThanOrEqual(180);
  });

  it("`78X` — 나중 농도를 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K78, s, v);
      const { a, mass, salt, b } = read78(p.content);
      expect(drawnSaltAmount(a, mass, salt, b + 1)).not.toBe(
        answerNumber(p.answer),
      );
    }
  });

  it("`79X` — 점을 옮기면 답이 달라진다 (220판)", () => {
    /**
     * ⚠️ 여기도 **작은 흔들기가 늘 답을 바꾸지는 않는다**(최대와 최소가 그대로일 수
     * 있다). 반드시 달라지는 흔들기(좌표를 두 배 — 넓이가 네 배가 되므로 차도 네 배다)를
     * 하드 가드로 두고, 한 점만 옮기는 작은 흔들기는 **실측한 바닥**으로 잠근다
     * (실측 217/220).
     */
    const spread = (ps: readonly (readonly [number, number])[]): number => {
      const areas = TRIPLES.map(([i, j, k]) =>
        shoelaceArea(ps[i]!, ps[j]!, ps[k]!),
      );
      return Math.max(...areas) - Math.min(...areas);
    };
    let small = 0;
    for (const [s, v] of BULK) {
      const p = build(K79, s, v);
      const { pts } = read79(p.content);
      const want = answerNumber(p.answer);
      expect(spread(pts)).toBe(want);
      const scaled = pts.map(
        ([px, py]) => [px * 2, py * 2] as [number, number],
      );
      expect(spread(scaled)).toBe(want * 4);
      const moved: [number, number][] = [
        pts[0]!,
        pts[1]!,
        [pts[2]![0], pts[2]![1] + 2],
        pts[3]!,
      ];
      if (spread(moved) !== want) small += 1;
    }
    expect(
      small,
      "점을 옮겨도 답이 그대로인 판이 너무 많다",
    ).toBeGreaterThanOrEqual(210);
  });

  it("`80X` — 거리 상한을 흔들면 답이 달라진다 (220판)", () => {
    for (const [s, v] of BULK) {
      const p = build(K80, s, v);
      const { mSaid, mStrict, nSaid, nStrict, q1, q2 } = read80(p.content);
      const m = mStrict ? mSaid - 1 : mSaid;
      const n = nStrict ? nSaid - 1 : nSaid;
      // ⚠️ 맞바꿈으로는 못 흔든다(곱이라 대칭이다) — **더하기**로 흔든다.
      expect(quadrantLatticeCount(m + 1, n, [q1, q2])).not.toBe(
        answerNumber(p.answer),
      );
      expect(quadrantLatticeCount(m, n, [q1, q2])).toBe(answerNumber(p.answer));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 해설의 나열 줄을 한 줄씩 다시 셈한다 + 「모두」를 전수로 반증한다
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — 나열 줄을 한 줄씩 다시 셈한다", () => {
  it("`77X` — 총합·기준·다섯 견줌·마무리가 서로 맞고, 「모두」가 전수 탐색과 같다", () => {
    let rows = 0;
    for (const [s, v] of BULK) {
      const p = build(K77, s, v);
      const { classValues, frequencies, percent } = read77(p.content);
      const total = frequencies.reduce((a, b) => a + b, 0);
      // ⑴ 총합 줄 — 항이 도수와 **정확히 같은 차례**여야 한다.
      const tm = /^도수의 총합은 \$([\d+]+)=(\d+)\$\(명\)이다\.$/m.exec(
        p.solution,
      );
      expect(tm, `77X 총합 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(tm![1]!.split("+").map(Number)).toEqual(frequencies);
      expect(num(tm![2]!)).toBe(total);
      // ⑵ 기준 줄 — 「이상」이라는 낱말과 수를 함께 판정한다.
      const km =
        /도수가 전체의 \$(\d+)\\%\$ (이상|미만)인 계급은 \(그 계급의 도수\)\$\\times100\$이 \$(\d+)\\times(\d+)=(\d+)\$ (이상|미만)인 계급이므로/.exec(
          p.solution,
        );
      expect(km, `77X 기준 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(km![1]!)).toBe(percent);
      expect(km![2]).toBe("이상");
      expect(km![6]).toBe("이상");
      expect(num(km![3]!)).toBe(total);
      expect(num(km![4]!)).toBe(percent);
      const K = num(km![5]!);
      expect(K).toBe(total * percent);
      // ⑶ 다섯 견줌 — 낱말(크/작/같으 · 맞는다/맞지 않는다)을 **수로** 확인한다.
      const cmp = [
        ...p.solution.matchAll(
          /계급값이 \$(\d+)\$인 계급은 도수가 \$(\d+)\$이고 \$(\d+)\\times100=(\d+)\$인데, 이 값은 \$(\d+)\$(보다 크|[와과] 같으|보다 작으)므로 조건에 (맞는다|맞지 않는다)\./g,
        ),
      ];
      expect(cmp, `77X 견줌 줄이 다섯이 아니다 — ${s}/${v}`).toHaveLength(5);
      const alive: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const g = cmp[i]!;
        expect(num(g[1]!)).toBe(classValues[i]);
        expect(num(g[2]!)).toBe(frequencies[i]);
        expect(num(g[3]!)).toBe(frequencies[i]);
        expect(num(g[4]!)).toBe(frequencies[i]! * 100);
        expect(num(g[5]!)).toBe(K);
        const f100 = frequencies[i]! * 100;
        const word = g[6]!;
        if (word === "보다 크") expect(f100).toBeGreaterThan(K);
        else if (word === "보다 작으") expect(f100).toBeLessThan(K);
        else expect(f100).toBe(K);
        const verdict = g[7]!;
        expect(verdict).toBe(f100 >= K ? "맞는다" : "맞지 않는다");
        if (verdict === "맞는다") alive.push(classValues[i]!);
        rows += 1;
      }
      // ⑷ 마무리 — 「모두」를 전수 탐색과 **정확히** 맞댄다(빠짐 0 · 군더더기 0).
      const fm =
        /따라서 조건에 맞는 계급의 계급값은 (.+?)의 (\S+) 가지이고, 구하는 값은 \$([\d+]+)=(\d+)\$이다\.$/m.exec(
          p.solution,
        );
      expect(fm, `77X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      const listed = readList(fm![1]!);
      const brute = classValues.filter(
        (_, i) => frequencies[i]! * 100 >= total * percent,
      );
      expect(listed).toEqual(brute);
      expect(listed).toEqual(alive);
      expect(fm![2]).toBe(COUNT_WORD[listed.length]);
      expect(fm![3]!.split("+").map(Number)).toEqual(brute);
      expect(num(fm![4]!)).toBe(answerNumber(p.answer));
    }
    expect(rows).toBe(220 * 5);
  });

  it("`78X` — 용질의 양이 줄마다 맞고, 마지막 검산이 실제로 맞아떨어진다", () => {
    let lines = 0;
    for (const [s, v] of BULK) {
      const p = build(K78, s, v);
      const { a, liquid, mass, solute, salt, b } = read78(p.content);
      const totalMass = mass + salt;
      const endSolute = (totalMass * b) / 100;
      const x = answerNumber(p.answer);
      // ⑴ 처음 용질
      const s1 = new RegExp(
        `^처음 ${liquid}에 들어 있는 ${solute}의 양은 \\$(\\d+)\\\\times(\\d+)\\\\div100=(\\d+)\\$\\(g\\)이다\\.$`,
        "m",
      ).exec(p.solution);
      expect(s1, `78X 처음 용질 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(s1![1]!)).toBe(mass);
      expect(num(s1![2]!)).toBe(a);
      expect(num(s1![3]!)).toBe((mass * a) / 100);
      // ⑵ 「농도는 변하지 않으므로」 — 굳힘을 진술하는 문장
      expect(p.solution).toContain(
        `${liquid}을 덜어내어도 농도는 변하지 않으므로`,
      );
      // ⑶ 나중 용질
      const s2 = new RegExp(
        `${liquid}의 양은 \\$(\\d+)\\+(\\d+)=(\\d+)\\$\\(g\\)이고, 그 \\$(\\d+)\\\\%\\$는 \\$(\\d+)\\\\times(\\d+)\\\\div100=(\\d+)\\$\\(g\\)이다\\.`,
      ).exec(p.solution);
      expect(s2, `78X 나중 용질 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(s2![1]!)).toBe(mass);
      expect(num(s2![2]!)).toBe(salt);
      expect(num(s2![3]!)).toBe(totalMass);
      expect(num(s2![4]!)).toBe(b);
      expect(num(s2![7]!)).toBe(endSolute);
      // ⑷ 양변에 $100$ 을 곱한 식
      const s3 =
        /양변에 \$100\$을 곱하면 \$\((\d+)-x\)\\times(\d+)\+(\d+)=(\d+)\$이다\./.exec(
          p.solution,
        );
      expect(s3, `78X 곱하기 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(s3![1]!)).toBe(mass);
      expect(num(s3![2]!)).toBe(a);
      expect(num(s3![3]!)).toBe(100 * salt);
      expect(num(s3![4]!)).toBe(b * totalMass);
      // ⑸ 마무리 — 두 등식이 실제로 맞고 답과 이어진다
      const s4 =
        /\$(\d+)\\times(\d+)=(\d+)\$이므로 \$(\d+)\\times x\$의 값은 \$(\d+)\+(\d+)-(\d+)=(\d+)\$이고, \$x\$의 값은 \$(\d+)\\div(\d+)=(\d+)\$이다\./.exec(
          p.solution,
        );
      expect(s4, `78X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(s4![3]!)).toBe(mass * a);
      expect(num(s4![4]!)).toBe(a);
      expect(num(s4![8]!)).toBe(a * x);
      expect(num(s4![11]!)).toBe(x);
      // ⑹ 괄호 속 검산 — 남은 용질 + 넣은 용질 = 나중 용질
      const s5 = new RegExp(
        `\\(남은 ${solute}은 \\$(\\d+)\\\\,\\\\mathrm\\{g\\}\\$이고 \\$(\\d+)\\+(\\d+)=(\\d+)\\$이므로 맞다\\.\\)`,
      ).exec(p.solution);
      expect(s5, `78X 검산 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(s5![1]!)).toBe(((mass - x) * a) / 100);
      expect(num(s5![3]!)).toBe(salt);
      expect(num(s5![4]!)).toBe(endSolute);
      expect(num(s5![1]!) + salt).toBe(endSolute);
      lines += 1;
    }
    expect(lines).toBe(220);
  });

  it("`79X` — 두 밑변·네 삼각형·최대와 최소가 모두 참이다", () => {
    let rows = 0;
    for (const [s, v] of BULK) {
      const p = build(K79, s, v);
      const { pts } = read79(p.content);
      const [A, B, C, D] = pts as [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ];
      // ⑴ 두 밑변 — 「$x$축에 평행」·「$y$축에 평행」을 좌표로 확인한다.
      const ab =
        /두 점 \$\\mathrm\{A\}\$와 \$\\mathrm\{B\}\$는 \$y\$좌표가 \$(-?\d+)\$(?:으로|로) 같으므로 선분 \$\\mathrm\{AB\}\$는 \$(x|y)\$축에 평행하고, 그 길이는 \$(-?\d+)-\(?(-?\d+)\)?=(\d+)\$이다\./.exec(
          p.solution,
        );
      expect(ab, `79X AB 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(ab![1]!)).toBe(A[1]);
      expect(A[1]).toBe(B[1]);
      expect(ab![2]).toBe("x");
      expect(num(ab![5]!)).toBe(Math.abs(B[0] - A[0]));
      expect(num(ab![3]!) - num(ab![4]!)).toBe(num(ab![5]!));
      const cd =
        /두 점 \$\\mathrm\{C\}\$와 \$\\mathrm\{D\}\$는 \$x\$좌표가 \$(-?\d+)\$(?:으로|로) 같으므로 선분 \$\\mathrm\{CD\}\$는 \$(x|y)\$축에 평행하고, 그 길이는 \$(-?\d+)-\(?(-?\d+)\)?=(\d+)\$이다\./.exec(
          p.solution,
        );
      expect(cd, `79X CD 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(cd![1]!)).toBe(C[0]);
      expect(C[0]).toBe(D[0]);
      expect(cd![2]).toBe("y");
      expect(num(cd![5]!)).toBe(Math.abs(D[1] - C[1]));
      // ⑵ 네 삼각형 — 넓이를 **신발끈 공식**으로 다시 낸다.
      const tris = [
        ...p.solution.matchAll(
          /삼각형 \$\\mathrm\{(\w{3})\}\$의 밑변을 \$\\mathrm\{(\w{2})\}\$로 보면 높이는 점 \$\\mathrm\{(\w)\}\$와 직선 \$\\mathrm\{\w{2}\}\$ 사이의 거리인 \$(-?\d+)-\(?(-?\d+)\)?=(\d+)\$이므로, 넓이는 \$(\d+)\\times(\d+)\\div2=(\d+)\$이다\./g,
        ),
      ];
      expect(tris, `79X 삼각형 줄이 넷이 아니다 — ${s}/${v}`).toHaveLength(4);
      const named: Record<string, [number, number]> = {
        A,
        B,
        C,
        D,
      };
      const areas: number[] = [];
      for (const g of tris) {
        const [i, j, k] = g[1]!.split("") as [string, string, string];
        const want = shoelaceArea(named[i]!, named[j]!, named[k]!);
        expect(num(g[4]!) - num(g[5]!)).toBe(num(g[6]!));
        expect(num(g[8]!)).toBe(num(g[6]!));
        expect(num(g[7]!)).toBe(
          g[2] === "AB" ? Math.abs(B[0] - A[0]) : Math.abs(D[1] - C[1]),
        );
        expect((num(g[7]!) * num(g[8]!)) / 2).toBe(num(g[9]!));
        expect(num(g[9]!)).toBe(want);
        areas.push(want);
        rows += 1;
      }
      expect(areas).toEqual(
        TRIPLES.map(([i, j, k]) => shoelaceArea(pts[i]!, pts[j]!, pts[k]!)),
      );
      // ⑶ 「가장 크고」·「가장 작다」 — 낱말을 **수로** 확인한다.
      const mm =
        /네 삼각형의 넓이는 차례로 (.+?)이므로 이 가운데 \$(\d+)\$[은는] 가장 (크|작으)고 \$(\d+)\$[은는] 가장 (작다|크다)\./.exec(
          p.solution,
        );
      expect(mm, `79X 최대·최소 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(readList(mm![1]!)).toEqual(areas);
      expect(mm![3]).toBe("크");
      expect(mm![5]).toBe("작다");
      expect(num(mm![2]!)).toBe(Math.max(...areas));
      expect(num(mm![4]!)).toBe(Math.min(...areas));
      const fin = /따라서 구하는 차는 \$(\d+)-(\d+)=(\d+)\$이다\.$/m.exec(
        p.solution,
      );
      expect(fin, `79X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(fin![1]!) - num(fin![2]!)).toBe(num(fin![3]!));
      expect(num(fin![3]!)).toBe(answerNumber(p.answer));
    }
    expect(rows).toBe(220 * 4);
  });

  it("`80X` — 상한·부호·구간·합이 모두 참이고, 선언한 제약을 그 뒤 줄이 지킨다", () => {
    let rows = 0;
    for (const [s, v] of BULK) {
      const p = build(K80, s, v);
      const { mSaid, mStrict, nSaid, nStrict, q1, q2 } = read80(p.content);
      const m = mStrict ? mSaid - 1 : mSaid;
      const n = nStrict ? nSaid - 1 : nSaid;
      expect(q1).not.toBe(q2);
      // ⑴ 상한 줄 — 「이하」·「미만」이 발문과 같고, 유효 상한이 맞는다.
      const bm =
        /\$x\$축까지의 거리가 \$(\d+)\$ (이하|미만)이므로 \$b\$의 절댓값은 (?:\$\d+\$보다 작은 정수, 즉 )?\$(\d+)\$ 이하이다\. 또 \$y\$축까지의 거리가 \$(\d+)\$ (이하|미만)이므로 \$a\$의 절댓값은 (?:\$\d+\$보다 작은 정수, 즉 )?\$(\d+)\$ 이하이다\./.exec(
          p.solution,
        );
      expect(bm, `80X 상한 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(bm![1]!)).toBe(mSaid);
      expect(bm![2]).toBe(mStrict ? "미만" : "이하");
      expect(num(bm![3]!)).toBe(m);
      expect(num(bm![4]!)).toBe(nSaid);
      expect(bm![5]).toBe(nStrict ? "미만" : "이하");
      expect(num(bm![5 + 1]!)).toBe(n);
      // ⑵ 제약 선언 — 그리고 그 뒤 줄이 그 제약 안에 있는지 ⑶ 에서 확인한다.
      expect(p.solution).toContain(
        "사분면 위의 점은 두 좌표가 모두 $0$이 아니므로",
      );
      // ⑶ 두 사분면 줄 — 부호 낱말·구간·개수를 전부 수로 확인한다.
      const qs = [
        ...p.solution.matchAll(
          /제\$(\d)\$사분면 위의 점은 \$x\$좌표가 (양수|음수)이고 \$y\$좌표가 (양수|음수)이므로, \$a\$는 (\$1\$부터 \$(\d+)\$까지|\$-(\d+)\$부터 \$-1\$까지)의 \$(\d+)\$개이고 \$b\$는 (\$1\$부터 \$(\d+)\$까지|\$-(\d+)\$부터 \$-1\$까지)의 \$(\d+)\$개이다\. 그러한 점은 \$(\d+)\\times(\d+)=(\d+)\$\(개\)이다\./g,
        ),
      ];
      expect(qs, `80X 사분면 줄이 둘이 아니다 — ${s}/${v}`).toHaveLength(2);
      expect(qs.map((g) => num(g[1]!))).toEqual([q1, q2]);
      for (const g of qs) {
        const q = num(g[1]!);
        const [xPos, yPos] = SIGNS[q]!;
        expect(g[2]).toBe(xPos ? "양수" : "음수");
        expect(g[3]).toBe(yPos ? "양수" : "음수");
        // 구간의 방향이 부호와 맞고, 끝이 $0$ 을 안 넘는다(㉴).
        expect(g[4]!.startsWith("$1$부터")).toBe(xPos);
        expect(num((xPos ? g[5] : g[6])!)).toBe(n);
        expect(num(g[7]!)).toBe(n);
        expect(g[8]!.startsWith("$1$부터")).toBe(yPos);
        expect(num((yPos ? g[9] : g[10])!)).toBe(m);
        expect(num(g[11]!)).toBe(m);
        expect(num(g[12]!)).toBe(n);
        expect(num(g[13]!)).toBe(m);
        expect(num(g[14]!)).toBe(m * n);
        rows += 1;
      }
      // ⑷ 마무리 — 「겹치지 않으므로」와 합
      const fm =
        /두 사분면 위의 점은 겹치지 않으므로 구하는 점의 개수는 \$(\d+)\$[와과] \$(\d+)\$의 합인 \$(\d+)\+(\d+)=(\d+)\$\(개\)이다\.$/m.exec(
          p.solution,
        );
      expect(fm, `80X 마무리 줄이 없다 — ${s}/${v}`).not.toBeNull();
      expect(num(fm![1]!)).toBe(m * n);
      expect(num(fm![2]!)).toBe(m * n);
      expect(num(fm![3]!) + num(fm![4]!)).toBe(num(fm![5]!));
      expect(num(fm![5]!)).toBe(answerNumber(p.answer));
    }
    expect(rows).toBe(220 * 2);
  });
});

// ═══════════════════════════════════════════════════════════
// 해설이 정답지 한 단에 들어가나 (㉮)
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — 해설이 정답지 한 단에 들어가나", () => {
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
    for (const e of M1_TOP_5D) {
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

  it("🔴 훑는 자리가 실제로 묶여 있다 — 그 상한이 곧 해설 높이다", () => {
    // `77X` 는 계급이 늘 다섯, `79X` 는 삼각형이 늘 넷이다. 늘리면 위 검사가 빨개진다.
    for (const [s, v] of WIDE.slice(0, 90)) {
      const p77 = build(K77, s, v);
      expect(read77(p77.content).classValues).toHaveLength(5);
      expect([
        ...p77.solution.matchAll(/계급값이 \$\d+\$인 계급은 도수가/g),
      ]).toHaveLength(5);
      const p79 = build(K79, s, v);
      expect([
        ...p79.solution.matchAll(/삼각형 \$\\mathrm\{\w{3}\}\$의 밑변을/g),
      ]).toHaveLength(4);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차 확대 갈래 d — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5D) {
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

  it("🔴 5차 d 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = M1_TOP_5D.map((e) => build(e.key, OVERLAP_SEED));
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
// 13개 중 10개가 초록이었다 — 「$x$는 $a$의 **약수**」를 「배수」로 바꿔도, 「중앙값은
// **세 번째** 값」을 「두 번째」로 바꿔도 아무 시험도 안 물었다. 굳힘 개념과 마무리
// 논거가 통째로 그 문장들 안에 있다.
//
// ⚠️ 값 검산·KaTeX·해설 높이·조사 자는 이 부류를 **구조적으로** 못 본다 —
//    문장이 거짓이어도 값은 그대로이기 때문이다(2026-08-24 「값이 맞으면 시험이
//    다 초록이다」와 같은 자리).
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 「반드시 있어야 하는 문장」 — 값은 지면에서 다시 읽어 만든다. */
function requiredWords(key: string, content: string): string[] {
  if (key === K77) {
    const { percent } = read77(content);
    return [
      "도수의 총합은",
      `도수가 전체의 $${percent}\\%$ 이상인 계급은`,
      "조건에 맞는다",
      "조건에 맞지 않는다",
    ];
  }
  if (key === K78) {
    const { liquid, solute } = read78(content);
    return [
      `${liquid}을 덜어내어도 농도는 변하지 않으므로`,
      `물을 넣으면 ${solute}의 양은 그대로이고`,
      "양변에 $100$을 곱하면",
    ];
  }
  if (key === K79) {
    return ["$x$축에 평행하고", "$y$축에 평행하고", "가장 크고", "가장 작다"];
  }
  if (key === K80) {
    return [
      "절댓값과 같고",
      "사분면 위의 점은 두 좌표가 모두 $0$이 아니므로",
      "겹치지 않으므로",
    ];
  }
  throw new Error(`말 목록이 없는 유형: ${key}`);
}

/**
 * 「그 문장을 거짓으로 만드는 맞바꿈」 — 눈금의 **양성 대조**다.
 * 각 짝은 `[찾을 것, 바꿀 것]` 이고, 바꾼 뒤 `requiredWords` 가 반드시 물어야 한다.
 */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K77]: [
    ["도수의 총합은", "도수의 평균은"],
    ["이상인 계급은", "미만인 계급은"],
    ["조건에 맞지 않는다", "조건에 맞는다"],
  ],
  [K78]: [
    ["농도는 변하지 않으므로", "농도는 변하므로"],
    ["의 양은 그대로이고", "의 양은 늘어나고"],
    ["양변에 $100$을 곱하면", "양변을 $100$으로 나누면"],
  ],
  [K79]: [
    ["$x$축에 평행하고", "$y$축에 평행하고"],
    ["가장 크고", "가장 작고"],
    ["가장 작다", "가장 크다"],
  ],
  [K80]: [
    ["절댓값과 같고", "절댓값의 두 배와 같고"],
    ["두 좌표가 모두 $0$이 아니므로", "두 좌표가 모두 $0$이므로"],
    ["겹치지 않으므로", "겹치므로"],
  ],
};

function missingWords(
  key: string,
  content: string,
  solution: string,
): string[] {
  return requiredWords(key, content).filter((w) => !solution.includes(w));
}

describe("[중1 5차 d] ㉳ 해설의 «말»이 판정을 옳게 진술한다", () => {
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
    expect(positives).toBe(12);
  });
});
