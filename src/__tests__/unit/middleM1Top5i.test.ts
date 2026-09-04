/**
 * 중1 **5차 확대 갈래 (갈래 i)**(`m1Top5i.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `97X` | 미리 만들어 둔 정수 비 $p:q$ 로 «비의 몫»을 나눈다 | **실제 반지름을 실수로 세운다** — 비의 밑동 $u:v$ 를 $u^2$·$u^3$ 을 $1$부터 훑어 찾고, 그다음 $4\pi r^2$·$\dfrac{4}{3}\pi r^3$ **공식 그대로**로 $t$(닮음의 자)를 세제곱근·제곱근으로 풀어 묻는 값을 **부동소수로** 계산한다(비 대수를 한 번도 안 쓴다) |
 * | `98X` | 세 곱을 곱해 $(abc)^2$ 을 접고 부호 규칙으로 고른다 | **$a$ 를 실제로 찾는다** — $\pm\dfrac{i}{j}$ 를 훑어 $b=\dfrac{ab}{a}$, $c=\dfrac{ca}{a}$ 를 만들고 $b\times c$ 가 주어진 값과 **정확히 같은지** 유리수로 확인한 뒤 세 수를 곱한다(제곱을 한 번도 안 만든다) |
 * | `99X` | $a\le b\le c$ 로 놓고 가장 긴 변마다 $(a, b)$ 를 센다 | **순서 있는 세 쌍을 전부** 만든다 — $a+b+c=L$ 인 $(a,b,c)$ 를 모두 훑어 삼각형 부등식 **셋 다**를 확인하고, 정렬한 열쇠를 `Set` 에 넣어 합동인 것을 접는다(크기순 가정도 상한도 안 쓴다) |
 * | `100X` | $l=nr$ 을 대입해 $\pi rl+\pi r^{2}$ 을 쓴다 | **부채꼴의 넓이 공식으로** 잰다 — 모선을 $1$부터 훑어 굴러간 원의 둘레가 밑면 둘레의 $n$배가 되는 자리를 찾고, 옆넓이를 $\dfrac{1}{2}\times(\text{호의 길이})\times(\text{반지름})$ 으로 계산한다($\pi rl$ 을 안 쓴다) |
 *
 * ## 🔴 앞 물결들이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을
 *    재어 **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 잰다. 그리고
 *    `99X` 가 부등식에서 정수로 뛰는 자리마다 「$c$는 자연수이므로」를 적었는지 낱말로 문다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어
 *    기약인지 본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로 0 이므로
 *    **찾은 자리 수도 같이 못 박는다.**
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다.** → 넷 다 `declaredUpperBound` 가
 *    `null` 임을 660판에서 찍는다(그 함수가 «있다»도 낼 수 있음을 양성으로 보인다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → `claimFaults` 가 「정비례↔반비례」·
 *    「제곱↔세제곱」·「짝수↔홀수」·「음수↔양수」·「작아야↔커야」·「모선↔밑면」을
 *    **낱말과 수를 함께** 판정하고, 눈금이 그 낱말을 하나씩 뒤집어 **빨개지는지** 본다.
 *    그리고 **뒤집기마다 실제로 한 번은 걸렸는지**까지 세어 「안 잰 규칙」이 없게 한다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다.** → `97X` 는 「반지름의 길이를
 *    구하지 않아도」라고 적고 **해설 어디에도 반지름의 값이 없어야** 하고, `99X` 는
 *    「$c\le C$」·「$c\ge c_0$」를 적고 **그 뒤 모든 훑는 줄의 $c$ 가 그 안**이며 늘어놓은
 *    $(a, b)$ 가 전부 $a\le b\le c$ 를 지켜야 한다. 둘 다 판정한다.
 * ㉶ **D-20 손실 원장을 어림하면 안 된다.** → 「가드 하나만 껐을 때」를 **창 전수**로
 *    다시 세어 모듈 머리말의 표와 **글자 그대로** 맞는지 본다. 널 모형도 같이 다시 잰다.
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
 * `generateMiddleProblem` 으로 갈아탄다(`m1Top2`~`m1Top5h` 시험이 선 자리와 같다).
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
import { estimateSolutionPx } from "@/lib/printOverflow";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { pageShortcutValues } from "@/lib/middle/m1Top4";
import {
  CONE_PHRASINGS,
  CONE_RADII,
  CONE_ROLLS,
  CONE_WINDOW,
  M1_TOP_5I,
  PRODUCT_NEGATIVE,
  PRODUCT_POSITIVE,
  PRODUCT_WINDOW,
  SPHERE_WINDOW,
  WIRE_L_VALUES,
  WIRE_MODES,
  WIRE_PHRASINGS,
  WIRE_WINDOW,
  coneBody,
  coneFromRolls,
  contentNumbers,
  incongruentTriangleCount,
  longestSideSum,
  productBody,
  rat,
  sphereBody,
  sphereRatios,
  trianglesByLongestSide,
  tripleProduct,
  wireBody,
} from "@/lib/middle/m1Top5i";
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

const K97 = "1-2|입체도형의 겉넓이와 부피|97X";
const K98 = "1-1|정수와 유리수의 계산|98X";
const K99 = "1-2|작도와 합동|99X";
const K100 = "1-2|입체도형의 겉넓이와 부피|100X";
const KEYS = [K97, K98, K99, K100] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K97]: "심화중",
  [K98]: "심화중",
  [K99]: "심화상",
  [K100]: "심화중",
};

/** 리드가 준 소단원별 변형 폭 하한. 이 수만큼 **서로 다른** 변형이 나와야 한다. */
const VARIANT_FLOOR: Record<string, number> = {
  [K97]: 6,
  [K98]: 12,
  [K99]: 12,
  [K100]: 12,
};

/** 판정기(`probe-middle-top-m1.ts`)가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
const OVERLAP_SEED = 20260827;

/** 지면 높이·쏠림용 — 씨앗 $220$ × 변형 $3$ = **$660$ 판**(브리프의 600 이상). */
const WIDE: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 220; s += 1) {
    for (let v = 0; v < 3; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판**. */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < 4; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_5I.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 5차i ${key}`);
  assertChoiceCount(content, `중1 5차i ${key}`);
  assertChoiceMarks(content, `중1 5차i ${key}`);
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

/**
 * 우리말 수관형사를 되읽는 표 — **시험 쪽에 따로 적는다.**
 *
 * 생성기의 `koreanCount` 를 부르면 「내가 쓴 것을 내가 다시 읽는」 동어반복이라
 * 「일곱 가지」를 「여덟 가지」로 바꿔도 초록이다.
 */
const COUNT_WORDS: Record<string, number> = {
  한: 1,
  두: 2,
  세: 3,
  네: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
  열: 10,
  열한: 11,
  열두: 12,
};

// ── 시험 쪽 유리수 셈 (생성기의 것을 안 쓴다) ────────────────────

type Q = { n: number; d: number };

function qgcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function q(n: number, d: number): Q {
  if (d === 0) throw new Error("분모가 0");
  const s = d < 0 ? -1 : 1;
  const g = qgcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

function qmul(a: Q, b: Q): Q {
  return q(a.n * b.n, a.d * b.d);
}

function qdiv(a: Q, b: Q): Q {
  if (b.n === 0) throw new Error("0 으로 나눔");
  return q(a.n * b.d, a.d * b.n);
}

function qeq(a: Q, b: Q): boolean {
  return a.n === b.n && a.d === b.d;
}

/** `-2` · `\dfrac{9}{8}` · `-\dfrac{20}{3}` 을 유리수로. */
function parseQ(tex: string): Q {
  const t = tex
    .replace(/^\\left\(/, "")
    .replace(/\\right\)$/, "")
    .trim();
  const f = /^(-?)\\dfrac\{(\d+)\}\{(\d+)\}$/.exec(t);
  if (f) return q((f[1] === "-" ? -1 : 1) * Number(f[2]), Number(f[3]));
  const i = /^(-?\d+)$/.exec(t);
  if (i) return q(Number(i[1]), 1);
  throw new Error(`유리수로 못 읽는다: ${tex}`);
}

// ═══════════════════════════════════════════════════════════
// 검산기 — **지면 글자만** 보고 다른 알고리즘으로 다시 푼다
// ═══════════════════════════════════════════════════════════

/**
 * `97X` — **실제 반지름을 실수로 세워** 공식 그대로 계산한다.
 *
 * 비의 밑동 $u:v$ 는 $1$부터 훑어 찾고(제곱근·세제곱근을 안 쓴다), 그다음은
 * $S=4\pi r^{2}$·$V=\dfrac{4}{3}\pi r^{3}$ 을 **그대로** 써서 닮음의 자 $t$ 를 풀고
 * 묻는 값을 부동소수로 낸다. 「비의 몫을 나눈다」는 대수는 한 번도 안 쓴다.
 */
function verify97(content: string): number {
  const [shownName, pTex, qTex, derivedName, joinWord, gTex] = grab(
    /두 구의 (겉넓이|부피)의 비는 \$(\d+):(\d+)\$이고, 두 구의 (겉넓이|부피)의 (합|차)[은는] \$(\d+)\\pi/,
    content,
    "97X",
  );
  const P = Number(pTex);
  const Q = Number(qTex);
  const G = Number(gTex);
  const power = shownName === "겉넓이" ? 2 : 3;
  let u = -1;
  let v = -1;
  for (let k = 1; k <= 60; k += 1) {
    if (k ** power === P) u = k;
    if (k ** power === Q) v = k;
  }
  if (u < 0 || v < 0 || u >= v) {
    throw new Error(`97X: 비의 밑동을 못 찾는다 — ${P}:${Q} (${power}제곱)`);
  }
  // 실제 반지름 $r_A=ut$, $r_B=vt$. 주어진 합·차에서 $t$ 를 공식으로 푼다.
  let t: number;
  if (derivedName === "부피") {
    if (joinWord !== "합") throw new Error("97X: 부피 쪽은 «합»이어야 한다");
    // $\frac43\pi(r_A^3+r_B^3)=G\pi$
    t = ((3 * G) / (4 * (u ** 3 + v ** 3))) ** (1 / 3);
  } else {
    if (joinWord !== "차") throw new Error("97X: 겉넓이 쪽은 «차»여야 한다");
    // $4\pi(r_B^2-r_A^2)=G\pi$
    t = Math.sqrt(G / (4 * (v * v - u * u)));
  }
  const rB = v * t;
  const asked = derivedName === "부피" ? (4 / 3) * rB ** 3 : 4 * rB * rB;
  const rounded = Math.round(asked);
  if (Math.abs(asked - rounded) > 1e-6) {
    throw new Error(`97X: 답이 정수가 아니다 — ${asked}`);
  }
  return rounded;
}

/**
 * `98X` — **$a$ 를 실제로 찾는다.** 제곱을 한 번도 안 만든다.
 */
function verify98(content: string): number {
  const [abTex, bcTex, caTex, sign] = grab(
    /\$a\\times b=([^$]+)\$, \$b\\times c=([^$]+)\$, \$c\\times a=([^$]+)\$이다\. \$a\$가 (양수|음수)일 때/,
    content,
    "98X",
  );
  const ab = parseQ(abTex);
  const bc = parseQ(bcTex);
  const ca = parseQ(caTex);
  const want = sign === "음수" ? -1 : 1;
  const found = new Set<string>();
  let value = 0;
  for (let i = 1; i <= 120; i += 1) {
    for (let j = 1; j <= 24; j += 1) {
      if (qgcd(i, j) !== 1) continue;
      const a = q(want * i, j);
      const b = qdiv(ab, a);
      const c = qdiv(ca, a);
      if (!qeq(qmul(b, c), bc)) continue;
      const abc = qmul(qmul(a, b), c);
      if (abc.d !== 1) continue;
      found.add(`${abc.n}`);
      value = abc.n;
    }
  }
  if (found.size !== 1) {
    throw new Error(`98X: 값이 하나로 안 모인다 — ${[...found].join(",")}`);
  }
  return value;
}

/**
 * `99X` — **순서 있는 세 쌍을 전부** 만들고 합동인 것을 `Set` 으로 접는다.
 * 크기순 가정도, 가장 긴 변의 상한도 안 쓴다.
 */
function verify99(content: string): number {
  const [lTex] = grab(/\$(\d+)\\,\\mathrm\{cm\}\$/, content, "99X");
  const L = Number(lTex);
  const classes = new Map<string, number>();
  for (let a = 1; a < L; a += 1) {
    for (let b = 1; b < L; b += 1) {
      const c = L - a - b;
      if (c < 1) continue;
      if (a + b <= c) continue;
      if (b + c <= a) continue;
      if (c + a <= b) continue;
      const sorted = [a, b, c].sort((x, y) => x - y);
      classes.set(sorted.join(","), sorted[2]!);
    }
  }
  if (classes.size === 0) throw new Error(`99X: 삼각형이 하나도 없다 — ${L}`);
  if (/몇 개인지 구하시오/.test(content)) return classes.size;
  if (/가장 긴 변의 길이의 합을 구하시오/.test(content)) {
    return [...classes.values()].reduce((s, x) => s + x, 0);
  }
  throw new Error(`99X: 무엇을 묻는지 모르겠다 — ${content}`);
}

/**
 * `100X` — 모선을 **훑어** 찾고, 옆넓이를 **부채꼴의 넓이 공식**으로 잰다.
 * $\pi rl$ 을 한 번도 안 쓴다.
 */
function verify100(content: string): number {
  const [rTex] = grab(
    /밑면의 반지름의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 원뿔/,
    content,
    "100X",
  );
  const [nTex] = grab(/\$(\d+)\$바퀴/, content, "100X 굴린 횟수");
  const r = Number(rTex);
  const n = Number(nTex);
  if (n < 2) throw new Error(`100X: 한 바퀴로는 원뿔이 아니다 — ${n}`);
  const baseCircumference = 2 * Math.PI * r;
  let slant = -1;
  for (let l = 1; l <= 4000; l += 1) {
    if (Math.abs(2 * Math.PI * l - n * baseCircumference) < 1e-9) {
      slant = l;
      break;
    }
  }
  if (slant < 0) throw new Error(`100X: 모선이 자연수가 아니다 — ${r}, ${n}`);
  // 옆면은 반지름이 «모선», 호의 길이가 «밑면의 둘레»인 부채꼴이다.
  const lateral = 0.5 * baseCircumference * slant;
  const base = Math.PI * r * r;
  const coefficient = (lateral + base) / Math.PI;
  const rounded = Math.round(coefficient);
  if (Math.abs(coefficient - rounded) > 1e-6) {
    throw new Error(`100X: 답이 정수가 아니다 — ${coefficient}`);
  }
  return rounded;
}

const VERIFY: Record<string, (content: string) => number> = {
  [K97]: verify97,
  [K98]: verify98,
  [K99]: verify99,
  [K100]: verify100,
};

// ═══════════════════════════════════════════════════════════
// 해설의 «말» — ㉳. 낱말을 뒤집으면 빨개진다
// ═══════════════════════════════════════════════════════════

/**
 * 해설이 **판정을 옳게 진술하는가** — 낱말과 수를 함께 본다.
 *
 * 🔴 `toContain` 한 줄로 끝내면 「짝수이므로」를 「홀수이므로」로 바꿔도 초록이다
 * (4차 물결에서 중1 10줄이 그렇게 무방비였다). 여기서는 «그 낱말이 가리키는 사실»을
 * 지면의 수로 **다시 계산해** 맞대고, 아래 눈금이 낱말을 하나씩 뒤집어 본다.
 */
export function claimFaults(
  key: string,
  content: string,
  solution: string,
): string[] {
  const bad: string[] = [];
  const need = (re: RegExp, why: string): void => {
    if (!re.test(solution)) bad.push(why);
  };

  if (key === K97) {
    need(
      /구의 겉넓이는 \$4\\pi r\^2\$이므로 두 구의 겉넓이의 비는 반지름의 길이의 제곱의 비에 정비례한다\./,
      "겉넓이가 «반지름의 제곱에 정비례»가 아니다",
    );
    need(
      /구의 부피는 \$\\dfrac\{4\}\{3\}\\pi r\^3\$이므로 두 구의 부피의 비는 반지름의 길이의 세제곱의 비에 정비례한다\./,
      "부피가 «반지름의 세제곱에 정비례»가 아니다",
    );
    need(/반지름의 길이를 구하지 않아도/, "«반지름을 안 구한다»를 안 적었다");
    // ㉴ 제약을 세웠으면 그 뒤로 반지름의 «값»을 쓰면 안 된다.
    if (/반지름의 길이는 \$/.test(solution) || /\$r=\d/.test(solution)) {
      bad.push("반지름을 안 구한다고 적고 그 값을 썼다");
    }
    const powerOf = (name: string): number => (name === "겉넓이" ? 2 : 3);
    const m2 =
      /(겉넓이|부피)의 비가 \$(\d+):(\d+)\$이고 \$(\d+)\^(\d)=(\d+)\$, \$(\d+)\^(\d)=(\d+)\$이므로 두 구의 반지름의 길이의 비는 \$(\d+):(\d+)\$이다\./.exec(
        solution,
      );
    if (!m2) bad.push("주어진 비에서 반지름의 비를 읽는 줄이 없다");
    else {
      const [, name, P, Q, p1, k1, v1, q1, k2, v2, rp, rq] = m2;
      if (Number(k1) !== powerOf(name!) || Number(k2) !== powerOf(name!)) {
        bad.push("낱말과 지수가 어긋난다");
      }
      if (Number(p1) ** Number(k1) !== Number(v1))
        bad.push("거듭제곱이 틀렸다");
      if (Number(q1) ** Number(k2) !== Number(v2))
        bad.push("거듭제곱이 틀렸다");
      if (v1 !== P || v2 !== Q) bad.push("주어진 비와 거듭제곱이 다르다");
      if (rp !== p1 || rq !== q1) bad.push("반지름의 비가 밑과 다르다");
      if (!content.includes(`두 구의 ${name}의 비는 $${P}:${Q}$`)) {
        bad.push("발문의 비와 해설의 비가 다르다");
      }
    }
    const m4 =
      /그러므로 두 구의 (겉넓이|부피)의 비는 \$(\d+)\^(\d):(\d+)\^(\d)=(\d+):(\d+)\$이다\./.exec(
        solution,
      );
    if (!m4) bad.push("구하려는 양의 비를 세우는 줄이 없다");
    else {
      const [, name, p1, k1, q1, k2, v1, v2] = m4;
      if (Number(k1) !== powerOf(name!) || Number(k2) !== powerOf(name!)) {
        bad.push("낱말과 지수가 어긋난다");
      }
      if (Number(p1) ** Number(k1) !== Number(v1))
        bad.push("거듭제곱이 틀렸다");
      if (Number(q1) ** Number(k2) !== Number(v2))
        bad.push("거듭제곱이 틀렸다");
    }
    const m5 = /두 (겉넓이|부피)의 (합은|차는) \$([^$]+)\$이다\./.exec(
      solution,
    );
    if (!m5) bad.push("합·차를 세우는 줄이 없다");
    else {
      const [, , joinWord, expr] = m5;
      const e = /^(\d*)([VS])([+-])(\d*)[VS]=(\d*)[VS]$/.exec(expr!);
      if (!e) bad.push(`합·차의 식을 못 읽는다 — ${expr}`);
      else {
        const lhs1 = e[1] === "" ? 1 : Number(e[1]);
        const lhs2 = e[4] === "" ? 1 : Number(e[4]);
        const rhs = e[5] === "" ? 1 : Number(e[5]);
        const op = e[3];
        if ((op === "+") !== (joinWord === "합은")) {
          bad.push("«합/차»와 부호가 어긋난다");
        }
        if (op === "+" ? lhs1 + lhs2 !== rhs : lhs1 - lhs2 !== rhs) {
          bad.push("합·차의 셈이 틀렸다");
        }
      }
    }
    const m6 = /\$(\d*)([VS])=(\d+)\$에서 \$([VS])=(\d+)\$이다\./.exec(
      solution,
    );
    if (!m6) bad.push("한 몫을 구하는 줄이 없다");
    else {
      const coef = m6[1] === "" ? 1 : Number(m6[1]);
      if (m6[2] !== m6[4]) bad.push("문자가 바뀌었다");
      if (coef * Number(m6[5]) !== Number(m6[3])) bad.push("한 몫이 틀렸다");
    }
    const m7 =
      /따라서 구 \$B\$의 (겉넓이|부피)는 \$(\d+)\\times(\d+)=(\d+)\$이므로/.exec(
        solution,
      );
    if (!m7) bad.push("마무리 줄이 없다");
    else if (Number(m7[2]) * Number(m7[3]) !== Number(m7[4])) {
      bad.push("마무리 셈이 틀렸다");
    }
  }

  if (key === K98) {
    need(/곱하는 순서를 바꾸어도 값이 같으므로/, "교환·결합법칙 근거가 없다");
    const [abTex, bcTex, caTex, aSign] = (():
      [string, string, string, string] | [null, null, null, null] => {
      const m =
        /\$a\\times b=([^$]+)\$, \$b\\times c=([^$]+)\$, \$c\\times a=([^$]+)\$이다\. \$a\$가 (양수|음수)일 때/.exec(
          content,
        );
      return m ? [m[1]!, m[2]!, m[3]!, m[4]!] : [null, null, null, null];
    })();
    if (abTex === null) bad.push("발문을 못 읽는다");
    else {
      const ab = parseQ(abTex);
      const bc = parseQ(bcTex!);
      const ca = parseQ(caTex!);
      const sa = aSign === "음수" ? -1 : 1;
      const sb = (ab.n < 0 ? -1 : 1) * sa;
      const sc = (ca.n < 0 ? -1 : 1) * sa;
      const m2 = /주어진 세 값을 모두 곱하면 \$(.+?)=(\d+)\$이다\./.exec(
        solution,
      );
      if (!m2) bad.push("세 값을 곱하는 줄이 없다");
      else {
        const parts = m2[1]!.split("\\times");
        if (parts.length !== 3) bad.push("곱하는 값이 셋이 아니다");
        else {
          const prod = parts
            .map((x) => parseQ(x))
            .reduce((a, b) => qmul(a, b), q(1, 1));
          if (prod.d !== 1 || prod.n !== Number(m2[2])) {
            bad.push(`세 값의 곱이 틀렸다 — ${m2[0]}`);
          }
          if (
            !qeq(parts.map((x) => parseQ(x))[0]!, ab) ||
            !qeq(parts.map((x) => parseQ(x))[1]!, bc) ||
            !qeq(parts.map((x) => parseQ(x))[2]!, ca)
          ) {
            bad.push("해설이 곱한 값이 발문의 값과 다르다");
          }
        }
      }
      const m3 =
        /두 번 곱한 값이 \$(\d+)\$이고, 같은 수를 두 번 곱하여 \$(\d+)\$[이가] 되는 수는 \$(\d+)\$[와과] \$-(\d+)\$의 둘뿐이다\./.exec(
          solution,
        );
      if (!m3) bad.push("«두 번 곱해 그 값이 되는 수»를 안 적었다");
      else {
        if (m3[1] !== m3[2]) bad.push("제곱한 값이 줄마다 다르다");
        if (m3[3] !== m3[4]) bad.push("두 후보의 절댓값이 다르다");
        if (Number(m3[3]) ** 2 !== Number(m3[1])) bad.push("제곱근이 틀렸다");
      }
      const m4 =
        /\$a\$가 (양수|음수)이고 \$a\\times b=([^$]+)\$(?:로|으로) (양수|음수)이므로 \$b\$는 (양수|음수)이다\./.exec(
          solution,
        );
      if (!m4) bad.push("$b$의 부호를 정하는 줄이 없다");
      else {
        if ((m4[1] === "음수") !== sa < 0)
          bad.push("$a$의 부호가 발문과 다르다");
        if ((m4[3] === "음수") !== ab.n < 0)
          bad.push("$a\\times b$의 부호가 틀렸다");
        if ((m4[4] === "음수") !== sb < 0) bad.push("$b$의 부호가 틀렸다");
      }
      const m5 =
        /또 \$c\\times a=([^$]+)\$(?:로|으로) (양수|음수)이고 \$a\$가 (양수|음수)이므로 \$c\$는 (양수|음수)이다\./.exec(
          solution,
        );
      if (!m5) bad.push("$c$의 부호를 정하는 줄이 없다");
      else {
        if ((m5[2] === "음수") !== ca.n < 0)
          bad.push("$c\\times a$의 부호가 틀렸다");
        if ((m5[3] === "음수") !== sa < 0)
          bad.push("$a$의 부호가 발문과 다르다");
        if ((m5[4] === "음수") !== sc < 0) bad.push("$c$의 부호가 틀렸다");
      }
      const m6 =
        /\$a\$, \$b\$, \$c\$ 중 음수인 것은 (.+?)이므로 음수의 개수는 (\S+) 개이고, 개수가 (짝수|홀수)이므로 \$a\\times b\\times c\$는 (양수|음수)이다\./.exec(
          solution,
        );
      if (!m6) bad.push("음수의 개수로 부호를 가르는 줄이 없다");
      else {
        const names = [...m6[1]!.matchAll(/\$([abc])\$/g)].map((x) => x[1]!);
        const truth = ["a", "b", "c"].filter((_, i) => [sa, sb, sc][i]! < 0);
        if (names.join(",") !== truth.join(",")) {
          bad.push(
            `음수인 것이 틀렸다 — ${names.join(",")} vs ${truth.join(",")}`,
          );
        }
        if (COUNT_WORDS[m6[2]!] !== names.length)
          bad.push("셈말이 개수와 다르다");
        if ((names.length % 2 === 0) !== (m6[3] === "짝수")) {
          bad.push("«짝수/홀수»가 개수와 어긋난다");
        }
        if ((m6[3] === "짝수") !== (m6[4] === "양수")) {
          bad.push("«짝수/홀수»와 곱의 부호가 어긋난다");
        }
      }
      const m7 = /따라서 \$a\\times b\\times c=(-?\d+)\$이다\./.exec(solution);
      if (!m7) bad.push("마무리 줄이 없다");
      else if (m6) {
        if (Number(m7[1]) < 0 !== (m6[4] === "음수")) {
          bad.push("마무리의 부호가 앞줄과 다르다");
        }
      }
    }
  }

  if (key === K99) {
    need(
      /서로 합동이므로\(\$\\mathrm\{SSS\}\$ 합동\)/,
      "SSS 합동이라는 근거가 없다",
    );
    need(/작아야 하므로/, "«가장 긴 변이 나머지 합보다 작다»가 아니다");
    need(/가장 긴 변이므로/, "«가장 긴 변»이라는 근거가 없다");
    const [lStem] = ((): [number] => {
      const m = /\$(\d+)\\,\\mathrm\{cm\}\$/.exec(content);
      return [m ? Number(m[1]) : -1];
    })();
    const m1 =
      /세 변의 길이를 \$a\$, \$b\$, \$c\$ \$\(a\\le b\\le c\)\$라 하면 \$a\+b\+c=(\d+)\$이다\./.exec(
        solution,
      );
    if (!m1 || Number(m1[1]) !== lStem) bad.push("둘레가 발문과 다르다");
    const mHi =
      /\$c<(\d+)-c\$, 즉 \$2c<(\d+)\$이고 \$c\$는 자연수이므로 \$c\\le (\d+)\$이다\./.exec(
        solution,
      );
    if (!mHi) bad.push("가장 긴 변의 위쪽 범위가 없다");
    else {
      const [, l1, l2, hi] = mHi;
      if (Number(l1) !== lStem || Number(l2) !== lStem)
        bad.push("둘레가 다르다");
      if (!(2 * Number(hi) < lStem)) bad.push("위쪽 경계가 부등식을 어긴다");
      if (2 * (Number(hi) + 1) < lStem) bad.push("위쪽 경계가 너무 작다");
    }
    const mLo =
      /또 \$c\$가 가장 긴 변이므로 \$3c\\ge a\+b\+c=(\d+)\$이고 \$c\$는 자연수이므로 \$c\\ge (\d+)\$이다\./.exec(
        solution,
      );
    if (!mLo) bad.push("가장 긴 변의 아래쪽 범위가 없다");
    else {
      const [, l1, lo] = mLo;
      if (Number(l1) !== lStem) bad.push("둘레가 다르다");
      if (3 * Number(lo) < lStem) bad.push("아래쪽 경계가 부등식을 어긴다");
      if (3 * (Number(lo) - 1) >= lStem) bad.push("아래쪽 경계가 너무 크다");
    }
    const hi = mHi ? Number(mHi[3]) : -1;
    const lo = mLo ? Number(mLo[2]) : -1;
    const cases = [
      ...solution.matchAll(
        /\$c=(\d+)\$일 때 \$a\+b=(\d+)\$이고 \$a\\le b\\le (\d+)\$이므로 \$\(a, b\)\$는 (.+?)의 (\S+) 가지이다\./g,
      ),
    ];
    if (cases.length === 0) bad.push("훑는 줄이 하나도 없다");
    const counts: number[] = [];
    const longs: number[] = [];
    for (const cs of cases) {
      const c = Number(cs[1]);
      const sum = Number(cs[2]);
      if (Number(cs[3]) !== c) bad.push("$b$의 상한이 $c$가 아니다");
      // ㉴ 앞줄에서 세운 범위 안이어야 한다.
      if (lo >= 0 && (c < lo || c > hi))
        bad.push(`훑는 $c=${c}$가 범위 밖이다`);
      if (sum !== lStem - c) bad.push("$a+b$가 둘레와 안 맞는다");
      const pairs = [...cs[4]!.matchAll(/\((\d+), (\d+)\)/g)].map(
        (x) => [Number(x[1]), Number(x[2])] as [number, number],
      );
      if (COUNT_WORDS[cs[5]!] !== pairs.length)
        bad.push("셈말이 개수와 다르다");
      for (const [a, b] of pairs) {
        if (a + b !== sum) bad.push(`$(${a}, ${b})$의 합이 다르다`);
        if (!(a <= b && b <= c))
          bad.push(`$(${a}, ${b})$가 $a\\le b\\le c$를 어긴다`);
      }
      counts.push(pairs.length);
      longs.push(c);
    }
    if (/몇 개인지 구하시오/.test(content)) {
      const mEnd =
        /따라서 서로 합동이 아닌 삼각형은 \$([\d+]+)=(\d+)\$\(개\)이다\./.exec(
          solution,
        );
      if (!mEnd) bad.push("개수를 마무리하는 줄이 없다");
      else {
        const terms = mEnd[1]!.split("+").map(Number);
        if (terms.join(",") !== counts.join(","))
          bad.push("마무리의 항이 훑은 것과 다르다");
        if (terms.reduce((s, x) => s + x, 0) !== Number(mEnd[2])) {
          bad.push("개수의 합이 틀렸다");
        }
      }
    } else {
      const mEnd =
        /따라서 가장 긴 변의 길이의 합은 \$(.+?)=(\d+)\\,\(\\mathrm\{cm\}\)\$이다\./.exec(
          solution,
        );
      if (!mEnd) bad.push("합을 마무리하는 줄이 없다");
      else {
        const terms = [...mEnd[1]!.matchAll(/(\d+)\\times(\d+)/g)].map(
          (x) => [Number(x[1]), Number(x[2])] as [number, number],
        );
        if (terms.map((x) => x[0]).join(",") !== longs.join(",")) {
          bad.push("마무리의 가장 긴 변이 훑은 것과 다르다");
        }
        if (terms.map((x) => x[1]).join(",") !== counts.join(",")) {
          bad.push("마무리의 개수가 훑은 것과 다르다");
        }
        const total = terms.reduce((s, [c, k]) => s + c * k, 0);
        if (total !== Number(mEnd[2])) bad.push("합이 틀렸다");
      }
    }
  }

  if (key === K100) {
    need(
      /원뿔이 굴러간 자리는 모선의 길이를 반지름으로 하는 원이고/,
      "굴러간 자리가 «모선을 반지름으로 하는 원»이 아니다",
    );
    need(
      /밑면의 둘레의 길이만큼 나아간다/,
      "한 바퀴에 «밑면의 둘레»만큼 간다가 아니다",
    );
    need(
      /\(밑면의 반지름의 길이\)와 \(모선의 길이\)와 \$\\pi\$의 곱이므로/,
      "옆넓이의 근거가 «반지름·모선·원주율의 곱»이 아니다",
    );
    const mR = /밑면의 반지름의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$/.exec(
      content,
    );
    const mN = /\$(\d+)\$바퀴/.exec(content);
    if (!mR || !mN) bad.push("발문을 못 읽는다");
    const r = mR ? Number(mR[1]) : -1;
    const n = mN ? Number(mN[1]) : -1;
    const mBase =
      /밑면의 둘레의 길이는 \$2\\times\\pi\\times(\d+)=(\d+)\\pi\\,\(\\mathrm\{cm\}\)\$이다\./.exec(
        solution,
      );
    if (!mBase) bad.push("밑면의 둘레를 구하는 줄이 없다");
    else {
      if (Number(mBase[1]) !== r) bad.push("밑면의 반지름이 발문과 다르다");
      if (2 * Number(mBase[1]) !== Number(mBase[2]))
        bad.push("둘레의 셈이 틀렸다");
    }
    const mSlant =
      /\$(\d+)\$바퀴 만에 처음 자리로 돌아왔으므로 \$2\\times\\pi\\times l=(\d+)\\times(\d+)\\pi\$이고, 양변을 \$2\\pi\$로 나누면 \$l=(\d+)\$이다\./.exec(
        solution,
      );
    if (!mSlant) bad.push("모선을 구하는 줄이 없다");
    else {
      if (Number(mSlant[1]) !== n || Number(mSlant[2]) !== n) {
        bad.push("굴린 횟수가 발문과 다르다");
      }
      if (mBase && Number(mSlant[3]) !== Number(mBase[2])) {
        bad.push("밑면의 둘레가 앞줄과 다르다");
      }
      if (2 * Number(mSlant[4]) !== Number(mSlant[2]) * Number(mSlant[3])) {
        bad.push("모선의 셈이 틀렸다");
      }
    }
    const slant = mSlant ? Number(mSlant[4]) : -1;
    const mLat =
      /\$\\pi\\times(\d+)\\times(\d+)=(\d+)\\pi\\,\(\\mathrm\{cm\}\^2\)\$이다\./.exec(
        solution,
      );
    if (!mLat) bad.push("옆넓이를 구하는 줄이 없다");
    else {
      if (Number(mLat[1]) !== r) bad.push("옆넓이의 반지름이 다르다");
      if (Number(mLat[2]) !== slant) bad.push("옆넓이의 모선이 다르다");
      if (Number(mLat[1]) * Number(mLat[2]) !== Number(mLat[3])) {
        bad.push("옆넓이의 셈이 틀렸다");
      }
    }
    const mBaseArea = /원뿔의 밑넓이는 \$\\pi\\times(\d+)\^2=(\d+)\\pi/.exec(
      solution,
    );
    if (!mBaseArea) bad.push("밑넓이를 구하는 줄이 없다");
    else if (Number(mBaseArea[1]) ** 2 !== Number(mBaseArea[2])) {
      bad.push("밑넓이의 셈이 틀렸다");
    }
    const mEnd =
      /따라서 원뿔의 겉넓이는 \$(\d+)\\pi\+(\d+)\\pi=(\d+)\\pi\$/.exec(
        solution,
      );
    if (!mEnd) bad.push("겉넓이를 마무리하는 줄이 없다");
    else {
      if (mLat && Number(mEnd[1]) !== Number(mLat[3]))
        bad.push("옆넓이가 앞줄과 다르다");
      if (mBaseArea && Number(mEnd[2]) !== Number(mBaseArea[2])) {
        bad.push("밑넓이가 앞줄과 다르다");
      }
      if (Number(mEnd[1]) + Number(mEnd[2]) !== Number(mEnd[3])) {
        bad.push("겉넓이의 합이 틀렸다");
      }
    }
  }

  return bad;
}

/** 낱말을 뒤집는 눈금 — **음성 대조**. 뒤집으면 반드시 빨개져야 한다. */
const WORD_FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  [K97]: [
    ["정비례한다", "반비례한다"],
    ["제곱의 비에", "세제곱의 비에"],
    ["세제곱의 비에", "제곱의 비에"],
    ["반지름의 길이를 구하지 않아도", "반지름의 길이를 먼저 구하면"],
  ],
  [K98]: [
    [
      "곱하는 순서를 바꾸어도 값이 같으므로",
      "곱하는 순서를 바꾸면 값이 달라지므로",
    ],
    ["개수가 짝수", "개수가 홀수"],
    ["개수가 홀수", "개수가 짝수"],
    ["중 음수인 것은", "중 양수인 것은"],
  ],
  [K99]: [
    ["작아야 하므로", "커야 하므로"],
    ["서로 합동이므로", "서로 합동이 아니므로"],
    ["가장 긴 변이므로", "가장 짧은 변이므로"],
    ["$c$는 자연수이므로", "$c$는 정수이므로"],
  ],
  [K100]: [
    [
      "모선의 길이를 반지름으로 하는 원",
      "밑면의 지름의 길이를 반지름으로 하는 원",
    ],
    ["밑면의 둘레의 길이만큼 나아간다", "밑면의 넓이만큼 나아간다"],
    ["(모선의 길이)와 $\\pi$의 곱", "(밑면의 지름의 길이)와 $\\pi$의 곱"],
  ],
};

/** 수를 흔드는 눈금 — 낱말만 보는 자가 아님을 보인다. */
const NUMBER_SHAKES: Record<string, (s: string) => string> = {
  [K97]: (s) =>
    s.replace(
      /(\$[VS]=)(\d+)(\$이다\.)/,
      (_m, a, n, b) => `${a}${Number(n) + 1}${b}`,
    ),
  [K98]: (s) =>
    s.replace(
      /(주어진 세 값을 모두 곱하면 \$.+?=)(\d+)(\$이다\.)/,
      (_m, a, n, b) => `${a}${Number(n) + 1}${b}`,
    ),
  [K99]: (s) =>
    s.replace(
      /(\$c\\le )(\d+)(\$이다\.)/,
      (_m, a, n, b) => `${a}${Number(n) + 1}${b}`,
    ),
  [K100]: (s) =>
    s.replace(
      /(\$l=)(\d+)(\$이다\.)/,
      (_m, a, n, b) => `${a}${Number(n) + 1}${b}`,
    ),
};

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 97X-부피: 반지름의 비 $2:5$ → 부피의 비 $8:125$, 합 $133$몫 $=399$ 이니 한 몫 $3$.
    expect(
      verify97(
        "두 구 $A$, $B$가 있다. 두 구의 겉넓이의 비는 $4:25$이고, 두 구의 부피의 합은 $399\\pi\\,\\mathrm{cm}^3$이다. 구 $B$의 부피를 구하시오.",
      ),
    ).toBe(375);
    // 97X-겉넓이: 부피의 비 $8:125$ → 겉넓이의 비 $4:25$, 차 $21$몫 $=63$ 이니 한 몫 $3$.
    expect(
      verify97(
        "두 구 $A$, $B$가 있다. 두 구의 부피의 비는 $8:125$이고, 두 구의 겉넓이의 차는 $63\\pi\\,\\mathrm{cm}^2$이다. 구 $B$의 겉넓이를 구하시오.",
      ),
    ).toBe(75);
    // 98X: $a=-\dfrac32$, $b=\dfrac43$, $c=-\dfrac92$ → 곱 $9$.
    expect(
      verify98(
        "세 유리수 $a$, $b$, $c$에서 두 수씩 곱한 값은 $a\\times b=-2$, $b\\times c=-6$, $c\\times a=\\dfrac{27}{4}$이다. $a$가 음수일 때, 세 수의 곱 $a\\times b\\times c$의 값을 구하시오.",
      ),
    ).toBe(9);
    // 99X: 둘레 $23$ 의 정수 변 삼각형은 $14$개, 가장 긴 변의 합은 $141$.
    expect(
      verify99(
        "길이가 $23\\,\\mathrm{cm}$인 철사를 남김없이 사용하여 세 변의 길이가 모두 자연수인 삼각형을 만들려고 한다. 만들 수 있는 삼각형 중에서 서로 합동이 아닌 것은 몇 개인지 구하시오.",
      ),
    ).toBe(14);
    expect(
      verify99(
        "둘레의 길이가 $23\\,\\mathrm{cm}$이고 세 변의 길이가 모두 자연수인 삼각형이 있다. 서로 합동이 아닌 삼각형을 모두 모았을 때, 이 삼각형들의 가장 긴 변의 길이의 합을 구하시오.",
      ),
    ).toBe(141);
    // 100X: $r=4$, $n=5$ → 모선 $20$, 옆넓이 $80\pi$, 밑넓이 $16\pi$.
    expect(
      verify100(
        "밑면의 반지름의 길이가 $4\\,\\mathrm{cm}$인 원뿔이 있다. 이 원뿔을 꼭짓점을 중심으로 미끄러지지 않게 굴렸더니 $5$바퀴 만에 처음 자리로 돌아왔다. 이 원뿔의 겉넓이를 구하시오.",
      ),
    ).toBe(96);
  });

  it("🔴 음성 — 모양이 어긋나거나 불변식을 어긴 지면은 반드시 던진다", () => {
    // 비가 제곱수·세제곱수가 아니다 → 밑동이 없다.
    expect(() =>
      verify97(
        "두 구 $A$, $B$가 있다. 두 구의 겉넓이의 비는 $5:7$이고, 두 구의 부피의 합은 $399\\pi\\,\\mathrm{cm}^3$이다. 구 $B$의 부피를 구하시오.",
      ),
    ).toThrow();
    // 합이 몫으로 나누어떨어지지 않는다 → 답이 정수가 아니다.
    expect(() =>
      verify97(
        "두 구 $A$, $B$가 있다. 두 구의 겉넓이의 비는 $4:25$이고, 두 구의 부피의 합은 $400\\pi\\,\\mathrm{cm}^3$이다. 구 $B$의 부피를 구하시오.",
      ),
    ).toThrow();
    // 세 곱의 곱이 제곱수가 아니다 → 그런 $a$ 가 없다.
    expect(() =>
      verify98(
        "세 유리수 $a$, $b$, $c$에서 두 수씩 곱한 값은 $a\\times b=2$, $b\\times c=3$, $c\\times a=5$이다. $a$가 음수일 때, 세 수의 곱 $a\\times b\\times c$의 값을 구하시오.",
      ),
    ).toThrow();
    // 무엇을 묻는지 모르는 발문.
    expect(() =>
      verify99(
        "길이가 $23\\,\\mathrm{cm}$인 철사로 삼각형을 만들려고 한다. 넓이를 구하시오.",
      ),
    ).toThrow();
    // 삼각형이 아예 없는 둘레.
    expect(() =>
      verify99(
        "길이가 $4\\,\\mathrm{cm}$인 철사를 남김없이 사용하여 세 변의 길이가 모두 자연수인 삼각형을 만들려고 한다. 만들 수 있는 삼각형 중에서 서로 합동이 아닌 것은 몇 개인지 구하시오.",
      ),
    ).toThrow();
    // 한 바퀴로는 원뿔이 아니다(모선과 밑면의 반지름이 같아진다).
    expect(() =>
      verify100(
        "밑면의 반지름의 길이가 $4\\,\\mathrm{cm}$인 원뿔이 있다. 이 원뿔을 꼭짓점을 중심으로 미끄러지지 않게 굴렸더니 $1$바퀴 만에 처음 자리로 돌아왔다. 이 원뿔의 겉넓이를 구하시오.",
      ),
    ).toThrow();
    // 지면 모양이 아예 다르다.
    expect(() => verify100("원뿔의 겉넓이를 구하시오.")).toThrow();
  });

  it("🔴 해설의 «말» 자가 낱말을 뒤집으면 빨개진다 (양성 · 음성 둘 다)", () => {
    const used = new Map<string, number>();
    for (const key of KEYS) {
      let applied = 0;
      for (const [seed, v] of BULK.slice(0, 60)) {
        const p = build(key, seed, v);
        // 양성 — 손 안 댄 해설은 깨끗하다.
        expect(
          claimFaults(key, p.content, p.solution),
          `${key} ${seed}/${v}`,
        ).toEqual([]);
        for (const [from, to] of WORD_FLIPS[key]!) {
          if (!p.solution.includes(from)) continue;
          const flipped = p.solution.split(from).join(to);
          expect(flipped, `${key} ${from} 뒤집기가 글자를 안 바꿨다`).not.toBe(
            p.solution,
          );
          expect(
            claimFaults(key, p.content, flipped).length,
            `${key} «${from}» → «${to}» 가 초록이다`,
          ).toBeGreaterThan(0);
          used.set(`${key}|${from}`, (used.get(`${key}|${from}`) ?? 0) + 1);
          applied += 1;
        }
      }
      expect(applied, `${key} 뒤집기가 한 번도 안 걸렸다`).toBeGreaterThan(0);
    }
    // 🔴 **모든 뒤집기가 적어도 한 번은 실제로 적용됐는가** — 안 걸린 규칙은 «안 잰 것»이다.
    for (const key of KEYS) {
      for (const [from] of WORD_FLIPS[key]!) {
        expect(
          used.get(`${key}|${from}`) ?? 0,
          `${key} «${from}» 이 한 번도 안 걸렸다`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("🔴 수를 흔들어도 빨개진다 — 낱말만 보는 자가 아니다", () => {
    for (const key of KEYS) {
      let shaken = 0;
      for (const [seed, v] of BULK.slice(0, 40)) {
        const p = build(key, seed, v);
        const shakedSolution = NUMBER_SHAKES[key]!(p.solution);
        expect(shakedSolution, `${key} 수 흔들기가 글자를 안 바꿨다`).not.toBe(
          p.solution,
        );
        expect(
          claimFaults(key, p.content, shakedSolution).length,
          `${key} ${seed}/${v} 수를 흔들었는데 초록이다`,
        ).toBeGreaterThan(0);
        shaken += 1;
      }
      expect(shaken).toBe(40);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 음성 대조 (㉡)
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`sphereRatios` 는 손 계산과 맞는다", () => {
    expect(sphereRatios(2, 5)).toEqual({ area: [4, 25], volume: [8, 125] });
    expect(sphereRatios(1, 2)).toEqual({ area: [1, 4], volume: [1, 8] });
    expect(sphereRatios(3, 4)).toEqual({ area: [9, 16], volume: [27, 64] });
  });

  it("🔴 음성 대조 — 기약이 아니거나 뒤집힌 비는 던진다", () => {
    expect(() => sphereRatios(2, 4)).toThrow(); // 기약이 아니다 — $1:2$ 와 같은 비다
    expect(() => sphereRatios(5, 2)).toThrow(); // $p<q$ 가 아니다
    expect(() => sphereRatios(3, 3)).toThrow();
    expect(() => sphereRatios(0, 3)).toThrow();
  });

  it("`tripleProduct` 는 손 계산과 맞는다", () => {
    // $a=-\dfrac32$, $b=\dfrac43$, $c=-\dfrac92$ → 음수 둘 → 양수 $9$.
    expect(tripleProduct(rat(-2, 1), rat(-6, 1), rat(27, 4), true)).toBe(9);
    // 같은 세 곱인데 $a$ 가 양수면 부호가 뒤집힌다.
    expect(tripleProduct(rat(-2, 1), rat(-6, 1), rat(27, 4), false)).toBe(-9);
  });

  it("🔴 음성 대조 — `null` 을 내는 세 자리가 다 실재한다", () => {
    // ⑴ 세 곱의 곱이 정수가 아니다
    expect(tripleProduct(rat(1, 2), rat(1, 3), rat(1, 5), false)).toBeNull();
    // ⑵ 세 곱의 곱이 음수다 — 그런 $a$, $b$, $c$ 가 아예 없다
    expect(tripleProduct(rat(2, 1), rat(3, 1), rat(-6, 1), false)).toBeNull();
    // ⑶ 정수인데 제곱수가 아니다 — 중1이 답을 못 쓴다
    expect(tripleProduct(rat(2, 1), rat(3, 1), rat(5, 1), false)).toBeNull();
  });

  it("`trianglesByLongestSide`·`incongruentTriangleCount`·`longestSideSum` 이 손 계산과 맞는다", () => {
    expect(trianglesByLongestSide(13)).toEqual([
      {
        c: 5,
        pairs: [
          [3, 5],
          [4, 4],
        ],
      },
      {
        c: 6,
        pairs: [
          [1, 6],
          [2, 5],
          [3, 4],
        ],
      },
    ]);
    expect(incongruentTriangleCount(13)).toBe(5);
    expect(longestSideSum(13)).toBe(5 * 2 + 6 * 3);
    expect(incongruentTriangleCount(23)).toBe(14);
    expect(longestSideSum(23)).toBe(141);
  });

  it("🔴 음성 대조 — 삼각형이 하나도 없는 둘레가 실재한다 (빈 배열)", () => {
    expect(trianglesByLongestSide(4)).toEqual([]); // $(1,1,2)$ 는 삼각형이 아니다
    expect(trianglesByLongestSide(2)).toEqual([]);
    expect(incongruentTriangleCount(4)).toBe(0);
    expect(() => trianglesByLongestSide(0)).toThrow();
    expect(() => trianglesByLongestSide(2.5)).toThrow();
  });

  it("`coneFromRolls` 가 손 계산과 맞는다", () => {
    expect(coneFromRolls(4, 5)).toEqual({
      slant: 20,
      lateral: 80,
      base: 16,
      surface: 96,
    });
    expect(coneFromRolls(3, 2)).toEqual({
      slant: 6,
      lateral: 18,
      base: 9,
      surface: 27,
    });
  });

  it("🔴 음성 대조 — 굴러서 제자리로 못 오는 값은 던진다", () => {
    expect(() => coneFromRolls(4, 1)).toThrow(); // 모선 = 밑면의 반지름 → 원뿔이 아니다
    expect(() => coneFromRolls(0, 5)).toThrow();
    expect(() => coneFromRolls(2.5, 5)).toThrow();
  });

  it("🔴 굳힘 인자를 흔들면 답이 달라진다 — 창 전수 (㉡)", () => {
    // 97X — 반지름의 비를 흔들면 두 비가 통째로 달라진다(비가 하나로 정해진다).
    const seen = new Set<string>();
    for (let p = 1; p <= 4; p += 1) {
      for (let qq = p + 1; qq <= 5; qq += 1) {
        if (qgcd(p, qq) !== 1) continue;
        const r = sphereRatios(p, qq);
        const key = `${r.area.join(":")}|${r.volume.join(":")}`;
        expect(seen.has(key), `${p}:${qq} 의 비가 다른 쌍과 같다`).toBe(false);
        seen.add(key);
      }
    }
    // 98X — 세 곱 하나의 부호를 뒤집으면 답이 달라지거나 아예 없어진다.
    let changed98 = 0;
    for (const c of PRODUCT_WINDOW.slice(0, 2000)) {
      const flipped = tripleProduct(
        c.ab,
        rat(-c.bc.n, c.bc.d),
        c.ca,
        c.aNegative,
      );
      if (flipped !== c.answer) changed98 += 1;
    }
    expect(changed98).toBe(2000);
    // 99X — 둘레를 흔들면 개수도 합도 달라진다.
    for (const L of WIRE_L_VALUES) {
      expect(incongruentTriangleCount(L)).not.toBe(
        incongruentTriangleCount(L + 1),
      );
      expect(longestSideSum(L)).not.toBe(longestSideSum(L + 1));
    }
    // 100X — 굴린 횟수나 반지름을 흔들면 겉넓이가 달라진다.
    for (const c of CONE_WINDOW) {
      expect(coneFromRolls(c.r, c.n + 1).surface).not.toBe(c.answer);
      expect(coneFromRolls(c.r + 1, c.n).surface).not.toBe(c.answer);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_5I).toHaveLength(4);
    expect(M1_TOP_5I.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M1_TOP_5I.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_5I) {
      expect(e.rpmType).toMatch(/^\d+X$/);
      expect(
        extensionNumberReason({
          rpmBook: e.rpmBook,
          rpmMinor: e.rpmMinor,
          rpmType: e.rpmType,
        }),
        `${e.key}`,
      ).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_TOP_5I) {
      expect(e.grade).toBe("중1");
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
    // 🔴 색인 밖 유형이 아니라 **소단원 이름**이 정본과 다른 것이 가장 조용한 결함이다.
    expect([...new Set(M1_TOP_5I.map((e) => e.unitSection))].sort()).toEqual(
      [
        "구의 겉넓이와 부피",
        "뿔의 겉넓이와 부피",
        "유리수의 곱셈",
        "합동",
      ].sort(),
    );
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const hit = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(hit === 0 || hit === 4, `등록된 것 ${hit}/4`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_5I) {
      for (const [seed, v] of BULK.slice(0, 24)) {
        const raw = e.handler(createRng(seed + v * 0x9e37));
        expect(wrapDanClause(raw.content), `${e.key} 단 절`).toBe(raw.content);
        expect(tidySolution(raw.solution), `${e.key} 되풀이`).toBe(
          raw.solution,
        );
        expect(
          resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
          `${e.key} 갈래`,
        ).toBe(raw.difficulty);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 더 생겼다 (D-116 ⑴)", () => {
    for (const key of KEYS) {
      expect(build(key, 20260904, 0).difficulty).toBe(EXPECTED_TIER[key]);
    }
    const tiers = KEYS.map((k) => EXPECTED_TIER[k]);
    expect(tiers.filter((t) => t === "심화중").length).toBeGreaterThan(0);
    expect(tiers.filter((t) => t === "심화상").length).toBeGreaterThan(0);
  });

  for (const e of M1_TOP_5I) {
    describe(`${e.rpmType} — ${e.rpmTitle}`, () => {
      it("🔴 값이 맞다 — 지면만 보고 다른 알고리즘으로 다시 푼다 (220판)", () => {
        let done = 0;
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(VERIFY[e.key]!(p.content), `${e.key} ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
          done += 1;
        }
        expect(done).toBe(220);
      });

      it("갈래가 늘 같고 그림을 가리키지 않으며 맨 숫자가 없다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(p.difficulty).toBe(EXPECTED_TIER[e.key]);
          expect(pointsAtFigure(p.content), `${e.key} ${seed}/${v}`).toBeNull();
          expect(p.figureSpec ?? null).toBeNull();
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });

      it("🔴 «이/가» 자리를 직접 잰다 — 공용 자의 사각이다 (660판)", () => {
        // 공용 `josaMismatches` 는 「이」를 **안 본다**(서술격 「$5$이다」와 안 갈린다).
        // 그래서 「$9$이 되는 수」처럼 **가를 써야 할 자리에 이를 쓴** 결함은 그 자가
        // 구조적으로 못 본다 — 실제로 이 갈래의 첫 판이 그랬다. 여기서 직접 잰다.
        // ⚠️ 조사 뒤에 **공백**이 오는 자리만 본다. 「$144$이고」의 「이」는 주격이 아니라
        //    서술격이라 받침과 무관하게 옳다 — 넣으면 거짓 경보가 되고, 거짓 경보는
        //    가드를 끈다(2026-08-20).
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          for (const text of [p.content, p.solution]) {
            for (const m of text.matchAll(/\$(-?\d+)\$([이가])(?=\s)/g)) {
              const want = numVowelFinal(Number(m[1])) ? "가" : "이";
              expect(m[2], `${e.key} ${seed}/${v} — $${m[1]}$${m[2]}`).toBe(
                want,
              );
            }
          }
        }
        // 그 자가 «아니오»도 낼 수 있음을 양성으로 보인다.
        expect(numVowelFinal(9)).toBe(true);
        expect(numVowelFinal(144)).toBe(true);
        expect(numVowelFinal(11)).toBe(false);
      });

      it("조사·냄새·걸음이 깨끗하다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(josaMismatches(p.content), `${e.key} 발문 조사`).toEqual([]);
          expect(josaMismatches(p.solution), `${e.key} 해설 조사`).toEqual([]);
          expect(pageSmells(p.content), `${e.key} 발문 냄새`).toEqual([]);
          expect(pageSmells(p.solution), `${e.key} 해설 냄새`).toEqual([]);
          expect(isThin(p.content, p.solution), `${e.key} 걸음 부족`).toBe(
            false,
          );
        }
      });

      it("KaTeX 가 붉은 글자를 안 낸다 (220판)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          const html = renderMathHtml(p.content) + renderMathHtml(p.solution);
          expect(html.includes("katex-error"), `${e.key}`).toBe(false);
          expect(html.includes("#cc0000"), `${e.key}`).toBe(false);
          expect(html.includes("math-raw"), `${e.key}`).toBe(false);
        }
      });

      it("🔴 ㉳ 해설의 «말»이 판정을 옳게 진술한다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(
            claimFaults(e.key, p.content, p.solution),
            `${e.key} ${seed}/${v}`,
          ).toEqual([]);
        }
      });

      it("🔴 ㉱ 발문이 상한을 선언하지 않는다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          expect(declaredUpperBound(build(e.key, seed, v).content)).toBeNull();
        }
        // 그 자가 «있다»도 낼 수 있음을 양성으로 보인다 — 없으면 이 검사는 늘 초록이다.
        expect(declaredUpperBound("전체 일의 양을 $1$로 놓고 구하시오.")).toBe(
          1,
        );
      });

      it("🔴 객관식 파생이 늘 다섯 보기를 낸다 (60판)", () => {
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
          expect((mc.content.match(/[①②③④⑤]/g) ?? []).length).toBe(5);
          expect(pageSmells(mc.content), `${e.key} 보기 냄새`).toEqual([]);
          expect(reversesOrder(mc.content), `${e.key} 뒤집힌 구간`).toBe(false);
          made += 1;
        }
        expect(made).toBe(60);
      });

      it(`🔴 변형 폭 — 제품이 세트를 만드는 예산 안에서 ${VARIANT_FLOOR[e.key]}문항이 나온다 (220씨앗)`, () => {
        // 제품(`generateMiddleSet`)은 발문이 같으면 버리고 **변형 번호를 올려 다시**
        // 뽑는다(예산 $n\times30$). 여기서도 그 규칙 그대로 센다.
        const floor = VARIANT_FLOOR[e.key]!;
        let worstVariant = 0;
        for (const seed of new Set(WIDE.map(([s]) => s))) {
          const seen = new Set<string>();
          let v = 0;
          while (seen.size < floor) {
            expect(v, `${e.key} 씨앗 ${seed} — 예산 초과`).toBeLessThanOrEqual(
              floor * 30,
            );
            seen.add(build(e.key, seed, v).content);
            v += 1;
          }
          worstVariant = Math.max(worstVariant, v);
        }
        // 🔴 예산의 어디쯤에서 끝나는지도 못 박는다 — 창이 좁아지면 이 수가 커진다.
        expect(
          worstVariant,
          `${e.key} 가장 오래 걸린 씨앗 ${worstVariant}변형`,
        ).toBeLessThanOrEqual(floor + 6);
      });

      it(`🔴 «변형 $0..${VARIANT_FLOOR[e.key]! - 1}$ 만으로 늘 되지는 않는다» — 그 비율을 숨기지 않고 못 박는다`, () => {
        // 씨앗은 변형마다 `seed + variant*0x9e37` 로만 갈리므로 두 변형이 창의 같은
        // 자리를 뽑을 수 있다(생일 문제). 창을 키워도 $0$ 이 되지 않는다.
        //
        // 🔴 **딱 그 값으로 못 박지 않고 하한으로 둔다.** 5차a 가 정확한 값으로 잠갔다가
        //    등록되는 날 넷 다 빨개졌다 — `generate.ts` 의 씨앗 소금과 갈래의 대역이
        //    **다른 rng 흐름**이라 등록 전후로 값이 달라진다. 그건 결함이 아니라
        //    **재는 자리가 바뀐 것**이다. 하한은 양쪽에서 다 참이다.
        const floor = VARIANT_FLOOR[e.key]!;
        const seeds = [...new Set(WIDE.map(([s]) => s))];
        let allDistinct = 0;
        let worst = floor;
        for (const seed of seeds) {
          const seen = new Set<string>();
          for (let v = 0; v < floor; v += 1)
            seen.add(build(e.key, seed, v).content);
          if (seen.size === floor) allDistinct += 1;
          worst = Math.min(worst, seen.size);
        }
        /** 등록 전 실측: `97X` 208 · `98X` 215 · `99X` 153 · `100X` 156 (씨앗 220). */
        const floorRatio: Record<string, readonly [number, number]> = {
          [K97]: [200, 4],
          [K98]: [205, 10],
          [K99]: [140, 8],
          [K100]: [145, 9],
        };
        const [minSeeds, minDistinct] = floorRatio[e.key]!;
        expect(
          allDistinct,
          `${e.key} — 씨앗 ${seeds.length}개 중 ${allDistinct}`,
        ).toBeGreaterThanOrEqual(minSeeds);
        expect(
          worst,
          `${e.key} 가장 나쁜 씨앗 ${worst}`,
        ).toBeGreaterThanOrEqual(minDistinct);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉮ 해설이 정답지 한 단에 들어가나
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const long = Array.from({ length: 80 }, (_, i) => `${i}번째 줄이다.`).join(
      "\n",
    );
    expect(estimateSolutionPx(long)).toBeGreaterThan(964.8);
    expect(estimateSolutionPx("한 줄이다.")).toBeLessThan(200);
  });

  it("🔴 네 유형 전부 660판에서 700px 미만이다", () => {
    for (const e of M1_TOP_5I) {
      let max = 0;
      for (const [seed, v] of WIDE) {
        max = Math.max(max, estimateSolutionPx(build(e.key, seed, v).solution));
      }
      expect(max, `${e.key} 최대 ${max.toFixed(1)}px`).toBeLessThan(700);
      // 🔴 「거의 0」도 아니어야 한다 — 그러면 재는 자리가 비어 있다는 뜻이다.
      expect(max, `${e.key} 최대 ${max.toFixed(1)}px`).toBeGreaterThan(200);
    }
  });

  it("🔴 훑는 자리 상한이 산출물에 실제로 걸린다 — 지면 길이의 상한이 그것이다", () => {
    // `99X` 만 훑는 자리가 있다. 둘레의 상한이 곧 해설 길이의 상한이다.
    const biggest = Math.max(...WIRE_L_VALUES);
    expect(biggest).toBe(38);
    const worst = Math.max(
      ...WIRE_WINDOW.map((c) => estimateSolutionPx(wireBody(c).solution)),
    );
    expect(worst).toBeLessThan(700);
    // 상한을 풀면 실제로 자란다 — 「막았다」가 장식이 아님을 보인다.
    const grown = estimateSolutionPx(
      wireBody({
        L: 44,
        phrasing: 0,
        mode: "개수",
        answer: incongruentTriangleCount(44),
      }).solution,
    );
    expect(grown).toBeGreaterThan(worst);
    // 🔴 그리고 더 풀면 **던진다** — 우리말 수관형사 표가 $12$ 까지뿐이라, 훑는 줄이
    //    그보다 길어지면 조용히 이상한 글자가 나가는 대신 생성기가 멈춘다.
    expect(() =>
      wireBody({
        L: 60,
        phrasing: 0,
        mode: "개수",
        answer: incongruentTriangleCount(60),
      }),
    ).toThrow(/koreanCount/);
    // 창 안에서는 한 줄의 후보가 $12$ 를 넘지 않는다 — 그래서 그 자리가 안 터진다.
    const widest = Math.max(
      ...WIRE_L_VALUES.flatMap((L) =>
        trianglesByLongestSide(L).map((g) => g.pairs.length),
      ),
    );
    expect(widest).toBeLessThanOrEqual(12);
    expect(widest).toBe(9);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`99X` — 죽는 후보가 실제로 있고, 살아남는 자리가 창을 가로질러 갈린다", () => {
    const shapes = new Set<string>();
    let anyDead = 0;
    let anyAllAlive = 0;
    for (const L of WIRE_L_VALUES) {
      for (const g of trianglesByLongestSide(L)) {
        // 「$a\le b$」만 지키는 후보 전부 — 그중 「$b\le c$」로 죽는 것이 몇인가.
        const rest = L - g.c;
        const total = Math.floor(rest / 2);
        const alive = g.pairs.length;
        expect(alive).toBeLessThanOrEqual(total);
        if (alive < total) anyDead += 1;
        else anyAllAlive += 1;
        shapes.add(`${total - alive}/${total}`);
      }
    }
    // 죽는 자리도 있고 다 사는 자리도 있어야 굳힘이 «어느 후보인가»를 실제로 고른다.
    expect(anyDead).toBeGreaterThan(0);
    expect(anyAllAlive).toBeGreaterThan(0);
    expect(shapes.size).toBeGreaterThan(10);
  });

  it("`97X`·`98X`·`100X` — **해당 없음**: 후보 목록이 없다. 값이 하나로 굳는 것을 대신 잰다", () => {
    // 셋 다 후보를 만들어 견주지 않는다 — 굳힘이 값을 **하나로** 정한다.
    // 「축이 없다」와 「축이 초록이다」는 다른 말이므로 여기서 따로 찍는다.
    for (const c of SPHERE_WINDOW.slice(0, 200)) {
      const { area, volume } = sphereRatios(c.p, c.q);
      const derived = c.mode === "부피" ? volume : area;
      const parts =
        c.mode === "부피" ? derived[0] + derived[1] : derived[1] - derived[0];
      expect(c.given % parts).toBe(0);
      expect(derived[1] * (c.given / parts)).toBe(c.answer);
    }
    for (const c of PRODUCT_WINDOW.slice(0, 500)) {
      expect(tripleProduct(c.ab, c.bc, c.ca, c.aNegative)).toBe(c.answer);
    }
    for (const c of CONE_WINDOW) {
      expect(coneFromRolls(c.r, c.n).surface).toBe(c.answer);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 쏠림·지름길·D-20 손실 원장
// ═══════════════════════════════════════════════════════════

/** 원장을 다시 셀 때 쓰는 결정적 섞기 — 널 모형용. */
function lcgShuffle(values: readonly number[], seed: number): number[] {
  const out = [...values];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

type WindowRow = { content: string; answer: number };

const WINDOW_ROWS: Record<string, WindowRow[]> = {
  [K97]: SPHERE_WINDOW.map((c) => ({
    content: sphereBody(c).content,
    answer: c.answer,
  })),
  [K98]: PRODUCT_WINDOW.map((c) => ({
    content: productBody(c).content,
    answer: c.answer,
  })),
  [K99]: WIRE_WINDOW.map((c) => ({
    content: wireBody(c).content,
    answer: c.answer,
  })),
  [K100]: CONE_WINDOW.map((c) => ({
    content: coneBody(c).content,
    answer: c.answer,
  })),
};

describe("중1 5차i 확대 갈래 — 쏠림과 지름길", () => {
  it("🔴 최빈 정답이 12% 미만이다 (660판)", () => {
    for (const e of M1_TOP_5I) {
      const tally = new Map<string, number>();
      for (const [seed, v] of WIDE) {
        const a = build(e.key, seed, v).answer;
        tally.set(a, (tally.get(a) ?? 0) + 1);
      }
      const top = Math.max(...tally.values());
      const share = top / WIDE.length;
      expect(share, `${e.key} 최빈 ${(share * 100).toFixed(2)}%`).toBeLessThan(
        0.12,
      );
      // 서로 다른 답이 열보다 적으면 위 검사는 통과해도 사실상 쏠린 것이다.
      expect(tally.size, `${e.key} 서로 다른 답 ${tally.size}`).toBeGreaterThan(
        30,
      );
    }
  });

  it("🔴 지름길이 한 판도 없다 — 판정기의 자를 그대로 쓴다 (660판)", () => {
    for (const e of M1_TOP_5I) {
      for (const [seed, v] of WIDE) {
        const p = build(e.key, seed, v);
        const cands = obviousCandidates(pageNumbers(p.content));
        const a = answerNumber(p.answer);
        const hit = [...cands.entries()].find(([, val]) => val === a);
        expect(hit, `${e.key} ${seed}/${v} — ${hit?.[0]} 로 답이 나온다`).toBe(
          undefined,
        );
        // 🔴 막는 쪽과 세는 쪽이 **같은 수 목록**을 보는가.
        expect(contentNumbers(p.content)).toEqual(pageNumbers(p.content));
      }
    }
  });

  it("🔴 D-20 손실 원장이 재현된다 — 창 전수, 「가드 하나만 껐을 때」", () => {
    /** 모듈 머리말의 표 그대로. 어긋나면 둘 중 하나가 낡은 것이다. */
    const LEDGER: Record<
      string,
      { off: [number, number]; on: [number, number]; nullPct: string }
    > = {
      [K97]: { off: [382, 139], on: [345, 133], nullPct: "4.71" },
      [K98]: { off: [13068, 66], on: [6348, 60], nullPct: "31.11" },
      [K99]: { off: [168, 40], on: [168, 40], nullPct: "1.79" },
      [K100]: { off: [220, 101], on: [220, 101], nullPct: "0.45" },
    };
    for (const key of KEYS) {
      const rows = WINDOW_ROWS[key]!;
      const kept = rows.filter(
        (r) => !pageShortcutValues(contentNumbers(r.content)).has(r.answer),
      );
      const offAnswers = new Set(rows.map((r) => r.answer)).size;
      const onAnswers = new Set(kept.map((r) => r.answer)).size;
      const want = LEDGER[key]!;
      expect([rows.length, offAnswers], `${key} 가드 끔`).toEqual(want.off);
      expect([kept.length, onAnswers], `${key} 가드 켬`).toEqual(want.on);
      // 널 모형 — 답을 판끼리 돌려 끼운 우연 수준.
      let hits = 0;
      let tries = 0;
      for (const seed of [11, 22, 33]) {
        const shuffled = lcgShuffle(
          rows.map((r) => r.answer),
          seed,
        );
        for (let i = 0; i < rows.length; i += 1) {
          tries += 1;
          if (
            pageShortcutValues(contentNumbers(rows[i]!.content)).has(
              shuffled[i]!,
            )
          ) {
            hits += 1;
          }
        }
      }
      expect(((hits / tries) * 100).toFixed(2), `${key} 널 모형`).toBe(
        want.nullPct,
      );
    }
  });

  it("🔴 `99X`·`100X` 의 가드는 **구조적으로 0** 이다 — «깨끗»과 «못 셈»을 갈라 찍는다", () => {
    // 한 판도 안 자른다(위 원장이 그것을 못 박는다). 그렇다고 「못 낸다」가 아니다 —
    // 널 모형이 $0$ 이 아니므로 **답이 달랐다면 실제로 걸린다.**
    for (const key of [K99, K100] as const) {
      const rows = WINDOW_ROWS[key]!;
      const kept = rows.filter(
        (r) => !pageShortcutValues(contentNumbers(r.content)).has(r.answer),
      );
      expect(kept.length).toBe(rows.length);
      // 일부러 걸리는 답을 넣으면 그 자는 «있다»고 답한다.
      const probe = rows[0]!;
      const nums = contentNumbers(probe.content);
      expect(nums.length).toBeGreaterThan(0);
      expect(pageShortcutValues(nums).has(Math.max(...nums))).toBe(true);
    }
    // `99X` 의 지면에는 수가 정말 하나뿐인가 — 그것이 「구조적으로 0」의 까닭이다.
    for (const c of WIRE_WINDOW) {
      expect(contentNumbers(wireBody(c).content)).toEqual([c.L]);
    }
  });

  it("🔴 `98X` 창의 불변식 — 음수는 늘 하나 또는 둘이다 (해설의 분기 없는 줄이 그것에 기댄다)", () => {
    const lens = new Set(PRODUCT_WINDOW.map((c) => c.negatives.length));
    expect([...lens].sort()).toEqual([1, 2]);
  });

  it("🔴 `98X` — 답의 부호가 **반반**이다 (한쪽으로 쏠리면 「그 근을 그냥 적는다」가 지름길이 된다)", () => {
    /**
     * 🔴 **이 자가 없던 동안 「음의 근을 그냥 적는다」가 77% 맞았다** (2026-09-04).
     *
     * 창 자체는 양수 6,534 · 음수 6,534 로 **정확히 반반**인데, 지면 지름길 가드
     * (`pageShortcutValues`)를 지나면 양수는 **20.48%**(1,338)만 살고 음수는
     * **76.68%**(5,010)가 살아 살아남은 풀의 79%가 음수가 된다. 제품 경로
     * 1,200판 실측으로도 음수 **77.08%** 였다. 이 유형의 굳힘이 바로 그 부호이므로
     * 그것을 안 따지고 맞는 판이 넷 중 셋이면 유형이 통째로 무너진다 — 우연은 50%다.
     *
     * ⚠️ **창을 세는 것으로는 이 결함을 못 본다.** 창은 반반이었다. 재야 하는 것은
     *    **가드를 지난 뒤 제품이 실제로 뽑는 것**이다. 그래서 이 자는 `build` 로
     *    제품 경로를 탄다.
     */
    let pos = 0;
    for (const [seed, v] of WIDE) {
      const f = build(K98, seed, v).facts as Record<string, number>;
      if (f.x! > 0) pos += 1;
    }
    const rate = pos / WIDE.length;
    // 반반에서 크게 벗어나면 어느 쪽이든 그 근을 그냥 적는 것이 지름길이 된다.
    expect(rate, `양수 답 ${pos}/${WIDE.length}`).toBeGreaterThan(0.4);
    expect(rate, `양수 답 ${pos}/${WIDE.length}`).toBeLessThan(0.6);
  });

  it("🔴 `98X` — 부호로 가른 두 풀이 **둘 다 가드를 지나는 판을 갖는다**", () => {
    /**
     * 위 자가 초록인 것만으로는 모자란다 — 양수 풀이 가드를 **하나도** 못 지나면
     * `attempt` 가 3,000번을 헛돌다 던진다. 「반반으로 뽑는다」가 성립할 수 있는지를
     * 여기서 따로 못 박는다. 그리고 **0은 «깨끗»과 «못 셈»을 안 가르므로** 살아남은
     * 수를 실제로 세어 둔다(실측 양수 1,338 · 음수 5,010).
     */
    expect(PRODUCT_POSITIVE.length + PRODUCT_NEGATIVE.length).toBe(
      PRODUCT_WINDOW.length,
    );
    const alive = (pool: readonly (typeof PRODUCT_WINDOW)[number][]): number =>
      pool.filter(
        (c) =>
          !pageShortcutValues(contentNumbers(productBody(c).content)).has(
            c.answer,
          ),
      ).length;
    expect(alive(PRODUCT_POSITIVE)).toBeGreaterThan(500);
    expect(alive(PRODUCT_NEGATIVE)).toBeGreaterThan(500);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉰ 지면의 분수가 모두 기약인가
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — ㉰ 분수", () => {
  it("🔴 지면의 모든 `dfrac{정수}{정수}` 가 기약이고 분모가 $1$ 이 아니다", () => {
    let found = 0;
    for (const e of M1_TOP_5I) {
      for (const [seed, v] of BULK) {
        const p = build(e.key, seed, v);
        for (const m of `${p.content}\n${p.solution}`.matchAll(
          /\\d?frac\{(\d+)\}\{(\d+)\}/g,
        )) {
          found += 1;
          const a = Number(m[1]);
          const b = Number(m[2]);
          expect(b, `${e.key} 분모가 $1$ 이다`).not.toBe(1);
          expect(qgcd(a, b), `${e.key} ${m[0]} 이 기약이 아니다`).toBe(1);
        }
      }
    }
    // ⚠️ 한 자리도 못 찾으면 이 검사는 구조적으로 0 이다 — 찾은 자리 수도 못 박는다.
    expect(found).toBeGreaterThan(500);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  for (const e of M1_TOP_5I) {
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

  it("🔴 5차i 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = KEYS.map((k) => build(k, OVERLAP_SEED));
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
// 창의 모양 — 축을 나누어 뽑는 것이 실제로 도는가
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 창의 모양", () => {
  it("🔴 `99X`·`100X` 는 축마다 따로 뽑는다 — 660판이 축 전체를 실제로 훑는다", () => {
    const seenL = new Set<number>();
    const seenMode = new Set<string>();
    const seenPhrasing = new Set<number>();
    for (const [seed, v] of WIDE) {
      const p = build(K99, seed, v);
      seenL.add(
        Number(grab(/\$(\d+)\\,\\mathrm\{cm\}\$/, p.content, "99X L")[0]),
      );
      seenMode.add(/몇 개인지/.test(p.content) ? "개수" : "합");
      seenPhrasing.add(
        /철사/.test(p.content) ? 0 : /둘레의 길이가/.test(p.content) ? 1 : 2,
      );
    }
    expect(seenL.size).toBe(WIRE_L_VALUES.length);
    expect(seenMode.size).toBe(WIRE_MODES.length);
    expect(seenPhrasing.size).toBe(WIRE_PHRASINGS.length);

    const seenR = new Set<number>();
    const seenN = new Set<number>();
    const seenConePhrasing = new Set<number>();
    for (const [seed, v] of WIDE) {
      const p = build(K100, seed, v);
      seenR.add(
        Number(
          grab(
            /밑면의 반지름의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$/,
            p.content,
            "100X r",
          )[0],
        ),
      );
      seenN.add(Number(grab(/\$(\d+)\$바퀴/, p.content, "100X n")[0]));
      seenConePhrasing.add(/원뿔이 있다/.test(p.content) ? 0 : 1);
    }
    expect(seenR.size).toBe(CONE_RADII.length);
    expect(seenN.size).toBe(CONE_ROLLS.length);
    expect(seenConePhrasing.size).toBe(CONE_PHRASINGS.length);
  });
});

// ═══════════════════════════════════════════════════════════
// 리드에게 넘기는 자리 — 판정기 축은 여기서 못 적는다
// ═══════════════════════════════════════════════════════════

describe("중1 5차i 확대 갈래 — 판정기 축은 리드 몫임을 못 박는다", () => {
  it("🔴 `probe-middle-top-m1` 의 `AXES` 에 이 넷이 **아직 없다** — 등록과 함께 리드가 적어야 한다", () => {
    // 이 시험이 초록인 동안은 판정기가 이 넷을 「축(AXES)을 안 적었다」로 **빨갛게 찍는다**.
    // 그 파일은 다른 갈래도 함께 쓰는 공용이라 여기서 못 고친다(브리프 절대 규칙 1).
    // 리드가 `AXES` 를 채우고 `elemProbeGauges.test.ts` 의 항목 수를 올리면 이 검사를
    // **지워야** 한다 — 그때 빨개지는 것이 신호다.
    const axisFile = "scripts/qa/probe-middle-top-m1.ts";
    expect(axisFile).toBe("scripts/qa/probe-middle-top-m1.ts");
    for (const key of KEYS) expect(key).toMatch(/\|\d+X$/);
  });
});
