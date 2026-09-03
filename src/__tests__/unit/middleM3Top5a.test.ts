/**
 * 중3 **5차 확대 갈래 (갈래 a)**(`m3Top5a.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `129X` | $k(k+2a-1)=2N$ 의 **약수**를 훑고 홀짝으로 거른다 | 약수를 한 번도 안 쓴다 — 첫 수 $a$ 를 $1$ 부터 놓고 **연속하는 수를 실제로 더해 가며** $N$ 이 되는 길이를 전부 모은다 |
 * | `130X` | $n=a-s^{2}$ 로 후보를 **만들어** 놓고 $n+b$ 를 본다 | $n$ 을 $1$ 부터 $a-1$ 까지 **하나씩** 놓고 두 값이 제곱수인지를 정수 곱 탐색으로 본다(후보를 만들지 않는다) |
 * | `131X` | 근 $\dfrac12$ 과 죽는 근에서 **계수를 지어낸다** | 반대 방향으로 간다 — 지면의 계수에서 **근의 공식**으로 근을 뽑고, 각을 `Math.asin`/`Math.acos` 로 되찾아 값을 **부동소수로** 다시 계산한다 |
 * | `132X` | 「다섯 호의 중심각의 합이 $360^{\circ}$」로 접는다 | 그 성질을 한 번도 안 쓴다 — 다섯 점을 **원 위 좌표로 실제로 놓고** 두 원주각을 벡터의 내적으로 재며, **안 정해지는 호를 여러 가지로 갈라** 그 값이 늘 같은지까지 본다 |
 *
 * ## 🔴 앞 물결들이 흘린 것을 여기서 어떻게 막나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다.** → 제품 `estimateSolutionPx` 로 **660판**을
 *    재어 **700px 미만**을 잠근다. 자가 살아 있는지(긴 글은 넘는다고 답하는지)도 같이 본다.
 * ㉯ **걸음을 건너뛰었다.** → 남의 자(`isThin`)를 **그대로 import** 해서 660판을 잰다.
 * ㉰ **기약이 아닌 분수를 찍었다.** → 지면의 `\dfrac{정수}{정수}` 를 **전부** 훑어 기약인지
 *    본다. ⚠️ 「한 자리도 못 찾으면」 그 검사는 구조적으로 0 이므로 **찾은 자리 수도 못 박는다.**
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다.** → 넷 다 `declaredUpperBound` 가
 *    `null` 임을 660판에서 찍는다(그 함수가 «있다»도 낼 수 있음을 양성으로 보인다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다.** → `claimFaults` 가 「홀수/짝수」·「제곱이
 *    아니다」·「$1$보다 클 수 없다」·「정할 수 없다」·「두 배/반」·「정해지지 않는다」를
 *    **낱말이 가리키는 사실을 지면의 수로 다시 계산해** 맞대고, 낱말을 뒤집으면
 *    빨개지는 눈금을 같이 둔다(양성 4 · 음성 12).
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다.** → `129X` 는 「$k\times k<2N$」을
 *    적고 **그것을 어기는 $k$ 를 한 번도 안 적어야** 하고, `130X` 는 「$a-n\le a-1$」을 적고
 *    그것을 어기는 후보를 안 만들어야 한다. 둘 다 지면에서 확인한다.
 * ㉵ **자료를 정렬해 찍으면 순위를 암시한다.** → 넷 다 자료를 늘어놓지 않는다(발문에
 *    오는 수는 조건뿐이다). 그 사실을 발문의 수 개수로 못 박는다.
 * ㉶ **D-20 손실 원장을 어림하면 안 된다.** → 창마다 「가드 **하나만** 껐을 때」를 전수로
 *    다시 세고, **판 수와 답 수를 같은 측정점**에서 찍는다. 죽은 규칙(지금 0을 버리는 것)도
 *    **0 이라고 적어** 다음 사람이 살아 있는 줄 알지 않게 한다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 *
 * ## 🔴 ㉢ 겹침은 **수치만으로 못 잡는다** — 형제 지면을 뽑아 눈으로 읽었다
 *
 * `132X` 의 첫 설계는 형제 `3-2|원주각|09` 와 **같은 문항**이었는데 한글 낱말 겹침이
 * $0.190$ 이었다(문턱 $0.35$ 아래). 낱말을 다르게 적기만 해도 그 자는 «안 닮았다»고
 * 한다. 그래서 이 파일은 겹침 수치와 **함께** 형제 발문을 실제로 뽑아 두고, 「이 소단원의
 * 형제가 몇이고 그 제목이 무엇인지」를 못 박는다 — 형제가 늘면 빨개져서 **다시 읽게** 된다.
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이
 * 넷을 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 —
 * 그래서 `build()` 가 제품의 후처리 **함수 자체**를 그대로 부르고, 등록되면 곧바로
 * `generateMiddleProblem` 으로 갈아탄다(`m3Top2`~`m3Top4` 시험이 선 자리와 같다).
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
import { estimateSolutionPx } from "@/lib/printOverflow";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem } from "@/lib/middle/types";
import {
  BRIEF_SECTION_NAMES,
  M3_TOP_5A,
  circleCrossAnswers,
  circleCrossPool,
  consecutiveAnswers,
  consecutiveCandidates,
  consecutiveCounts,
  consecutiveSumPool,
  deadRootCandidates,
  divisorsOf,
  firstTermFor,
  intSqrt,
  liveTrigRoots,
  oneStepReach,
  planCircleCross,
  planConsecutiveSum,
  planSquareGap,
  planTrigRoot,
  remainingInscribedSum,
  rootFate,
  specialAngleOf,
  squareGapAnswers,
  squareGapCandidates,
  squareGapHits,
  squareGapPool,
  trigExprValue,
  trigRootAnswers,
  trigRootPool,
} from "@/lib/middle/m3Top5a";
import type { TrigFn } from "@/lib/middle/m3Top5a";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";

// 🔴 남의 자를 **그대로 import** 한다 — 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
import { isThin } from "../../../scripts/qa/probe-middle-solution-depth";
import {
  jaccard,
  numberKey,
  wordKey,
} from "../../../scripts/qa/probe-middle-top-m3";
import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, numVowelFinal, pageSmells } from "../helpers/midPage";

const K129 = "3-1|이차방정식의 활용|129X";
const K130 = "3-1|제곱근의 뜻과 성질|130X";
const K131 = "3-2|삼각비|131X";
const K132 = "3-2|원주각|132X";
const KEYS = [K129, K130, K131, K132] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K129]: "심화상",
  [K130]: "심화상",
  [K131]: "심화중",
  [K132]: "심화중",
};

/** 리드가 준 소단원별 변형 폭 하한. 이 수만큼 **서로 다른** 변형이 나와야 한다. */
const VARIANT_FLOOR: Record<string, number> = {
  [K129]: 6,
  [K130]: 12,
  [K131]: 12,
  [K132]: 12,
};

/** 판정기(`probe-middle-top-m3.ts`)가 겹침을 잴 때 쓰는 씨앗 — 값을 맞춰 둔다. */
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
const ENTRY = new Map(M3_TOP_5A.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중3 5차a ${key}`);
  assertChoiceCount(content, `중3 5차a ${key}`);
  assertChoiceMarks(content, `중3 5차a ${key}`);
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

/** 제곱수인가 — **정수 곱 탐색**으로 본다(제품 `intSqrt` 를 안 부른다). */
function squareRootByScan(v: number): number | null {
  if (v < 0) return null;
  for (let s = 0; s * s <= v; s += 1) if (s * s === v) return s;
  return null;
}

// ═══════════════════════════════════════════════════════════
// 검산기 — **지면 글자만** 보고 다른 알고리즘으로 다시 푼다
// ═══════════════════════════════════════════════════════════

/**
 * `129X` — 연속하는 수를 **실제로 더해 가며** 길이를 모은다. 약수를 한 번도 안 쓴다.
 */
function verify129(content: string): number {
  const [nTex] = grab(
    /연속하는 두 개 이상의 자연수를 모두 더하여 \$(\d+)\$/,
    content,
    "129X",
  );
  const total = Number(nTex);
  const ks: number[] = [];
  for (let a = 1; a <= total; a += 1) {
    let sum = 0;
    for (let k = 1; ; k += 1) {
      sum += a + k - 1;
      if (sum > total) break;
      if (sum === total && k >= 2) ks.push(k);
    }
  }
  if (ks.length < 2) throw new Error(`129X: 살아남은 길이가 모자란다 — ${ks}`);
  return [...new Set(ks)].reduce((t, v) => t + v, 0);
}

/**
 * `130X` — $n$ 을 $1$ 부터 **하나씩** 놓는다. 후보를 $a-s^{2}$ 로 만들지 않는다.
 */
function verify130(content: string): number {
  const [aTex, bTex] = grab(
    /두 수 \$\\sqrt\{(\d+)-n\}\$, \$\\sqrt\{n\+(\d+)\}\$의 값이 모두 자연수이다/,
    content,
    "130X",
  );
  const a = Number(aTex);
  const b = Number(bTex);
  const hits: number[] = [];
  for (let n = 1; n < a; n += 1) {
    if (squareRootByScan(a - n) === null) continue;
    if (squareRootByScan(n + b) === null) continue;
    hits.push(n);
  }
  if (hits.length < 2)
    throw new Error(`130X: 살아남은 $n$ 이 모자란다 — ${hits}`);
  return hits.reduce((t, v) => t + v, 0);
}

/**
 * `131X` — **근의 공식**으로 근을 뽑고, 각을 `asin`/`acos` 로 되찾아 값을 부동소수로
 * 다시 낸다. 인수분해도, 특수각의 값 표도 한 번도 안 쓴다.
 */
/**
 * 지면의 이차방정식을 **항 단위로** 읽는다.
 *
 * ⚠️ 「$\square A$ 항이 있다」·「상수항이 있다」를 전제하면 안 된다 — 죽는 근이
 *    $-\dfrac12$ 이면 $4\cos^{2}A-1=0$ 이라 가운데 항이 없고, $0$ 이면
 *    $2\cos^{2}A-\cos A=0$ 이라 상수항이 없다. 첫 판이 그 둘을 못 읽어 220판이
 *    통째로 「지면 모양이 다르다」로 떨어졌다.
 */
function parseTrigEquation(eq: string): {
  fn: "sin" | "cos";
  P: number;
  Q: number;
  R: number;
} {
  for (const fn of ["sin", "cos"] as const) {
    const head =
      fn === "sin"
        ? /^(\d+)\\sin\^\{2\}A(.*)=0$/.exec(eq)
        : /^(\d+)\\cos\^\{2\}A(.*)=0$/.exec(eq);
    if (head === null) continue;
    let rest = head[2]!;
    let Q = 0;
    const mq =
      fn === "sin"
        ? /^([+-])(\d*)\\sin A/.exec(rest)
        : /^([+-])(\d*)\\cos A/.exec(rest);
    if (mq !== null) {
      Q = (mq[1] === "-" ? -1 : 1) * (mq[2] === "" ? 1 : Number(mq[2]));
      rest = rest.slice(mq[0].length);
    }
    let R = 0;
    if (rest !== "") {
      const mr = /^([+-])(\d+)$/.exec(rest);
      if (mr === null) throw new Error(`131X: 상수항을 못 읽었다 — ${eq}`);
      R = (mr[1] === "-" ? -1 : 1) * Number(mr[2]);
    }
    return { fn, P: Number(head[1]), Q, R };
  }
  throw new Error(`131X: 이차방정식 모양이 다르다 — ${eq}`);
}

function verify131(content: string): number {
  const [eq] = grab(
    /이차방정식 \$([^$]+)\$을 만족시킨다고 한다/,
    content,
    "131X 모양",
  );
  const { fn, P, Q, R } = parseTrigEquation(eq);
  const [uTex, gName, vTex] = grab(
    /\$(\d+)\\(sin|cos)\^\{2\}A\+(\d+)\\tan\^\{2\}A\$의 값을 구하시오/,
    content,
    "131X 식",
  );
  const u = Number(uTex);
  const v = Number(vTex);
  const disc = Q * Q - 4 * P * R;
  if (disc < 0) throw new Error("131X: 실근이 없다");
  const roots = [
    (-Q + Math.sqrt(disc)) / (2 * P),
    (-Q - Math.sqrt(disc)) / (2 * P),
  ];
  const values: number[] = [];
  for (const t of roots) {
    if (t < -1e-12 || t > 1 + 1e-12) continue;
    const deg =
      fn === "sin"
        ? (Math.asin(Math.min(1, Math.max(0, t))) * 180) / Math.PI
        : (Math.acos(Math.min(1, Math.max(0, t))) * 180) / Math.PI;
    if (Math.abs(deg - Math.round(deg)) > 1e-6) {
      throw new Error(`131X: 각이 정수가 아니다 — ${deg}`);
    }
    const a = Math.round(deg);
    if (a === 90) continue; // $\tan 90^\circ$ 는 값이 없다
    const rad = (a * Math.PI) / 180;
    const g = gName === "sin" ? Math.sin(rad) : Math.cos(rad);
    const val = u * g * g + v * Math.tan(rad) * Math.tan(rad);
    if (Math.abs(val - Math.round(val)) > 1e-6) {
      throw new Error(`131X: 값이 정수가 아니다 — ${val}`);
    }
    values.push(Math.round(val));
  }
  if (values.length !== 1) {
    throw new Error(`131X: 살아남는 각이 하나가 아니다 — ${values.join(",")}`);
  }
  return values[0]!;
}

/**
 * `132X` — 다섯 점을 **원 위 좌표로 놓고** 두 원주각을 벡터로 잰다.
 *
 * 안 정해지는 두 호를 **여러 가지로 갈라** 값이 늘 같은지까지 본다 — 그것이 이 유형의
 * 전제다. 「원주각은 중심각의 반」도, 「다섯 호의 합이 원 전체」도 쓰지 않는다.
 */
function inscribedAngleAt(center: number, from: number, to: number): number {
  const pt = (deg: number): [number, number] => [
    Math.cos((deg * Math.PI) / 180),
    Math.sin((deg * Math.PI) / 180),
  ];
  const [cx, cy] = pt(center);
  const [ax, ay] = pt(from);
  const [bx, by] = pt(to);
  const u: [number, number] = [ax - cx, ay - cy];
  const w: [number, number] = [bx - cx, by - cy];
  const cos =
    (u[0] * w[0] + u[1] * w[1]) /
    (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

function verify132(content: string): number {
  const [pTex, qTex, rTex] = grab(
    /\$\\angle ACB=(\d+)\^\{\\circ\}\$, \$\\angle BDC=(\d+)\^\{\\circ\}\$, \$\\angle CED=(\d+)\^\{\\circ\}\$/,
    content,
    "132X",
  );
  const arcAb = 2 * Number(pTex);
  const arcBc = 2 * Number(qTex);
  const arcCd = 2 * Number(rTex);
  const rest = 360 - arcAb - arcBc - arcCd;
  if (rest <= 1) throw new Error(`132X: 남은 호가 없다 — ${rest}`);
  const seen = new Set<number>();
  // 안 정해지는 두 호를 여러 가지로 갈라 본다.
  for (const share of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const arcDe = rest * share;
    const posA = 0;
    const posB = arcAb;
    const posC = arcAb + arcBc;
    const posD = arcAb + arcBc + arcCd;
    const posE = posD + arcDe;
    const dae = inscribedAngleAt(posA, posD, posE);
    const eba = inscribedAngleAt(posB, posE, posA);
    const sum = dae + eba;
    if (Math.abs(sum - Math.round(sum)) > 1e-6) {
      throw new Error(`132X: 합이 정수가 아니다 — ${sum}`);
    }
    seen.add(Math.round(sum));
  }
  if (seen.size !== 1) {
    throw new Error(
      `132X: 호를 어떻게 가르냐에 따라 답이 달라진다 — ${[...seen]}`,
    );
  }
  return [...seen][0]!;
}

const VERIFY: Record<string, (content: string) => number> = {
  [K129]: verify129,
  [K130]: verify130,
  [K131]: verify131,
  [K132]: verify132,
};

// ═══════════════════════════════════════════════════════════
// 해설의 «말» — ㉳. 낱말을 뒤집으면 빨개진다
// ═══════════════════════════════════════════════════════════

/**
 * 해설이 **판정을 옳게 진술하는가** — 낱말과 수를 함께 본다.
 *
 * 🔴 `toContain` 한 줄로 끝내면 「홀수이므로」를 「짝수이므로」로 바꿔도 초록이다
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

  if (key === K129) {
    need(/약수이고/, "«약수»라는 근거가 없다");
    const tw = /곧 \$k\(k\+2a-1\)=(\d+)\$이다/.exec(solution);
    if (!tw) bad.push("$2N$ 을 안 적었다");
    const twice = tw ? Number(tw[1]) : 0;
    // ㉴ — 「$k\times k<2N$」을 적었으면 그 뒤 열거가 그것을 지켜야 한다.
    const bound = new RegExp(`곧 \\$k\\\\times k<${twice}\\$이다`).test(
      solution,
    );
    if (!bound) bad.push("«$k\\times k<2N$» 제약을 안 적었다");
    /**
     * 🔴 **줄 단위로 본다.** 처음엔 「$V$가 홀수이므로 $a$는 자연수가 아니고」를 통째로
     * 정규식 하나로 물었는데, 「자연수가 아니고」를 「자연수이고」로 **바꾸면 그 정규식이
     * 아예 안 걸려** 결함이 $0$ 이 됐다 — 낱말을 뒤집으면 검사 자체가 사라지는 판이었다.
     * 그래서 후보 줄을 먼저 **모두 뽑아** 놓고, 줄마다 «홀짝», «자연수인가», «조건에
     * 맞는가» 셋을 각각 판정한다. 지우면 그 자리가 빈 채로 남아 걸린다.
     */
    const listed: number[] = [];
    const candLines = solution
      .split("\n")
      .filter((l) => /^[㉠-㉧] \$k=/.test(l));
    if (candLines.length < 3) bad.push("후보 줄이 셋보다 적다");
    for (const line of candLines) {
      const g =
        /^[㉠-㉧] \$k=(\d+)\$이면 \$2a=(\d+)\\div (\d+)-(\d+)\+1=(-?\d+)\$이다\. (.*)$/.exec(
          line,
        );
      if (g === null) {
        bad.push(`후보 줄 모양이 다르다 — ${line}`);
        continue;
      }
      const k = Number(g[1]);
      const value = Number(g[5]);
      const rest = g[6]!;
      listed.push(k);
      if (Number(g[2]) !== twice)
        bad.push(`나눗셈의 피제수가 다르다 — ${line}`);
      if (Number(g[3]) !== k || Number(g[4]) !== k)
        bad.push("나눗셈의 $k$ 가 다르다");
      if (twice / k - k + 1 !== value) bad.push(`$2a$ 계산이 틀렸다 — ${line}`);
      if (bound && k * k >= twice) bad.push(`제약을 어긴 $k$ 를 훑었다 — ${k}`);
      const odd = Math.abs(value) % 2 === 1;
      // ⑴ 홀짝을 옳게 말했나 — 낱말이 하나만 있어야 한다.
      const saysOdd = /홀수이므로/.test(rest);
      const saysEven = /짝수이므로/.test(rest);
      if (saysOdd === saysEven)
        bad.push(`홀짝을 안 말했거나 둘 다 말했다 — ${line}`);
      else if (saysOdd !== odd) bad.push(`홀짝 판정이 거짓이다 — ${line}`);
      // ⑵ 되짚는 수가 같은가.
      const back = /\$(-?\d+)\$[이가] (?:홀수|짝수)이므로/.exec(rest);
      if (back === null || Number(back[1]) !== value)
        bad.push(`되짚는 수가 다르다 — ${line}`);
      // ⑶ 「자연수인가」를 옳게 말했나 — 지우거나 뒤집으면 여기서 걸린다.
      const saysNotNat = /\$a\$는 자연수가 아니고/.test(rest);
      const natM = /\$a=(-?\d+)\$(?:으로|로) 자연수이고/.exec(rest);
      if (saysNotNat === (natM !== null)) {
        bad.push(`«자연수인가»를 안 말했거나 둘 다 말했다 — ${line}`);
      } else if (odd && !saysNotNat) {
        bad.push(`홀수인데 «자연수이다» — ${line}`);
      } else if (!odd && saysNotNat) {
        bad.push(`짝수인데 «자연수가 아니다» — ${line}`);
      } else if (natM !== null && value / 2 !== Number(natM[1])) {
        bad.push(`$a$ 가 틀렸다 — ${line}`);
      }
      // ⑷ 「조건에 맞는가」가 홀짝과 같은 쪽인가.
      const fits = /조건에 맞는다\.$/.test(rest);
      const notFits = /조건에 맞지 않는다\.$/.test(rest);
      if (fits === notFits)
        bad.push(`«조건»을 안 말했거나 둘 다 말했다 — ${line}`);
      else if (fits === odd) bad.push(`조건 판정이 홀짝과 어긋난다 — ${line}`);
    }
    const tail =
      /값은 \$((?:-?\d+\$, \$)*-?\d+)\$이고, 그 합은 \$([-\d+]+)=(-?\d+)\$이다/.exec(
        solution,
      );
    if (!tail) bad.push("마무리 줄이 없다");
    else {
      const kept = tail[1]!.split("$, $").map(Number);
      if (kept.reduce((t, v) => t + v, 0) !== Number(tail[3]))
        bad.push("합이 틀렸다");
      if (kept.join("+") !== tail[2]) bad.push("합의 식이 목록과 다르다");
      for (const k of kept) {
        if (!listed.includes(k))
          bad.push(`훑지 않은 $k$ 를 답에 넣었다 — ${k}`);
      }
    }
  }

  if (key === K130) {
    need(/어떤 자연수의 제곱이다/, "«자연수의 제곱»이라는 근거가 없다");
    const cap = /\$(\d+)-n\\le (\d+)\$이고/.exec(solution);
    if (!cap) bad.push("«$a-n$ 의 상한»을 안 적었다");
    else if (Number(cap[1]) - 1 !== Number(cap[2])) bad.push("상한이 틀렸다");
    // 🔴 129X 와 같은 이유로 **줄 단위**로 본다 — 낱말을 지우면 검사도 같이 사라지는
    //    판이 아니어야 한다.
    const listed: number[] = [];
    const candLines = solution
      .split("\n")
      .filter((l) => /^[㉠-㉧] \$n=/.test(l));
    if (candLines.length < 3) bad.push("후보 줄이 셋보다 적다");
    for (const line of candLines) {
      const g =
        /^[㉠-㉧] \$n=(\d+)\$이면 \$n\+(\d+)=(\d+)\+(\d+)=(\d+)\$이다\. (.*)$/.exec(
          line,
        );
      if (g === null) {
        bad.push(`후보 줄 모양이 다르다 — ${line}`);
        continue;
      }
      const n = Number(g[1]);
      const v = Number(g[5]);
      const rest = g[6]!;
      listed.push(n);
      if (Number(g[3]) !== n) bad.push("되짚는 $n$ 이 다르다");
      if (Number(g[2]) !== Number(g[4])) bad.push("더하는 수가 다르다");
      if (n + Number(g[2]) !== v) bad.push(`덧셈이 틀렸다 — ${line}`);
      // ㉴ — 위에서 적은 상한을 어기는 후보가 있으면 안 된다.
      if (cap && Number(cap[1]) - n > Number(cap[2]))
        bad.push(`상한을 어긴 후보 — ${n}`);
      const isSquare = squareRootByScan(v) !== null;
      const yes =
        /\$(\d+)=(\d+)\^\{2\}\$이므로 \$\\sqrt\{n\+\d+\}=(\d+)\$(?:으로|로) 자연수이고, 조건에 맞는다\.$/.exec(
          rest,
        );
      const no =
        /\$(\d+)\^\{2\}=(\d+)\$, \$(\d+)\^\{2\}=(\d+)\$이고 \$(\d+)<(\d+)<(\d+)\$이므로 \$(\d+)\$[이가] 어떤 자연수의 제곱도 아니고, 조건에 맞지 않는다\.$/.exec(
          rest,
        );
      if ((yes !== null) === (no !== null)) {
        bad.push(`«제곱인가»를 안 말했거나 둘 다 말했다 — ${line}`);
      } else if (isSquare && yes === null) {
        bad.push(`제곱수인데 «아니다»라고 적었다 — ${v}`);
      } else if (!isSquare && no === null) {
        bad.push(`제곱수가 아닌데 «맞다»라고 적었다 — ${v}`);
      } else if (yes !== null) {
        const root = Number(yes[2]);
        if (Number(yes[1]) !== v) bad.push(`판정하는 수가 다르다 — ${line}`);
        if (root * root !== v) bad.push(`제곱이 틀렸다 — ${line}`);
        if (Number(yes[3]) !== root) bad.push(`근호의 값이 다르다 — ${line}`);
      } else if (no !== null) {
        const lo = Number(no[1]);
        const hi = Number(no[3]);
        if (lo * lo !== Number(no[2]) || hi * hi !== Number(no[4])) {
          bad.push("끼인 제곱수가 틀렸다");
        }
        if (hi !== lo + 1) bad.push("끼인 두 제곱수가 이웃이 아니다");
        if (Number(no[5]) !== lo * lo || Number(no[7]) !== hi * hi) {
          bad.push("부등식의 양끝이 다르다");
        }
        if (Number(no[6]) !== v || Number(no[8]) !== v)
          bad.push("판정하는 수가 다르다");
        if (!(lo * lo < v && v < hi * hi))
          bad.push(`끼임 판정이 거짓이다 — ${line}`);
      }
    }
    const tail =
      /\$n\$의 값은 \$((?:\d+\$, \$)*\d+)\$이고, 그 합은 \$([\d+]+)=(\d+)\$이다/.exec(
        solution,
      );
    if (!tail) bad.push("마무리 줄이 없다");
    else {
      const hits = tail[1]!.split("$, $").map(Number);
      if (hits.reduce((t, v) => t + v, 0) !== Number(tail[3]))
        bad.push("합이 틀렸다");
      for (const n of hits)
        if (!listed.includes(n)) bad.push(`훑지 않은 $n$ — ${n}`);
    }
  }

  if (key === K131) {
    need(/인수분해하면/, "인수분해했다는 말이 없다");
    const fn = /\\(sin|cos) A=\\dfrac\{1\}\{2\}\$ 또는/.exec(solution)?.[1];
    if (!fn) bad.push("사는 근을 안 적었다");
    // 죽는 까닭 셋 중 정확히 하나가 있어야 하고, 그 근거가 실제로 참이어야 한다.
    const over = /그 값이 \$1\$보다 클 수는 없다/.test(solution);
    const neg = /그 값이 음수가 될 수는 없다/.test(solution);
    const notan = /\$\\tan 90\^\{\\circ\}\$의 값은 정할 수 없으므로/.test(
      solution,
    );
    if ([over, neg, notan].filter(Boolean).length !== 1) {
      bad.push("죽는 까닭이 하나가 아니다");
    }
    const dead =
      /\\(?:sin|cos) A=(-?)(?:(\d+)|\\dfrac\{(\d+)\}\{(\d+)\})\$인 경우/.exec(
        solution,
      );
    if (!dead) bad.push("죽는 근을 안 적었다");
    else {
      const sign = dead[1] === "-" ? -1 : 1;
      const value =
        dead[2] !== undefined
          ? sign * Number(dead[2])
          : (sign * Number(dead[3])) / Number(dead[4]);
      if (over && !(value > 1))
        bad.push(`«$1$보다 크다»가 거짓이다 — ${value}`);
      if (neg && !(value < 0)) bad.push(`«음수»가 거짓이다 — ${value}`);
      if (notan && value !== (fn === "sin" ? 1 : 0)) {
        bad.push(
          `«$\\tan 90^{\\circ}$» 갈래가 아닌데 그렇게 적었다 — ${value}`,
        );
      }
    }
    const live = /이므로 \$A=(\d+)\^\{\\circ\}\$이다/.exec(solution);
    if (!live) bad.push("사는 각을 안 적었다");
    else if (Number(live[1]) !== (fn === "sin" ? 30 : 60)) {
      bad.push(`$\\${fn}A=\\dfrac12$ 인데 각이 ${live[1]} 이다`);
    }
    const tail =
      /=(\d+)\\times\\dfrac\{3\}\{4\}\+(\d+)\\times(?:\\dfrac\{1\}\{3\}| 3)=(\d+)\+(\d+)=(\d+)\$이다/.exec(
        solution,
      );
    if (!tail) bad.push("마무리 계산이 없다");
    else {
      if ((3 * Number(tail[1])) / 4 !== Number(tail[3]))
        bad.push("$\\cos^2$ 항이 틀렸다");
      if (Number(tail[3]) + Number(tail[4]) !== Number(tail[5]))
        bad.push("마지막 덧셈이 틀렸다");
      const tanPart = /\\times 3=/.test(tail[0])
        ? 3 * Number(tail[2])
        : Number(tail[2]) / 3;
      if (tanPart !== Number(tail[4])) bad.push("$\\tan^2$ 항이 틀렸다");
    }
  }

  if (key === K132) {
    need(/하나로 정해지지 않는다/, "«정해지지 않는다»를 안 적었다");
    need(/원 전체가 되고/, "«원 전체»라는 근거가 없다");
    need(
      /원주각의 크기의 두 배이므로/,
      "«중심각은 원주각의 두 배»를 안 적었다",
    );
    need(
      /두 중심각의 크기의 합의 반이다/,
      "«원주각은 중심각의 반»을 안 적었다",
    );
    const given =
      /\$\\angle ACB=(\d+)\^\{\\circ\}\$, \$\\angle BDC=(\d+)\^\{\\circ\}\$, \$\\angle CED=(\d+)\^\{\\circ\}\$/.exec(
        content,
      );
    if (!given) bad.push("발문에서 세 각을 못 읽었다");
    const doubles: number[] = [];
    for (const g of solution.matchAll(
      /\$2\\times (\d+)\^\{\\circ\}=(\d+)\^\{\\circ\}\$/g,
    )) {
      if (2 * Number(g[1]) !== Number(g[2]))
        bad.push(`두 배가 틀렸다 — ${g[0]}`);
      doubles.push(Number(g[2]));
    }
    if (doubles.length !== 3) bad.push("중심각 셋을 안 적었다");
    if (given) {
      const want = [1, 2, 3].map((i) => 2 * Number(given[i]));
      if (doubles.join(",") !== want.join(","))
        bad.push("발문의 각과 중심각이 안 맞는다");
    }
    const sub =
      /\$360\^\{\\circ\}-\((\d+)\^\{\\circ\}\+(\d+)\^\{\\circ\}\+(\d+)\^\{\\circ\}\)=360\^\{\\circ\}-(\d+)\^\{\\circ\}=(\d+)\^\{\\circ\}\$이다/.exec(
        solution,
      );
    if (!sub) bad.push("남은 중심각의 합을 안 적었다");
    else {
      const s = Number(sub[1]) + Number(sub[2]) + Number(sub[3]);
      if (s !== Number(sub[4])) bad.push("괄호 안의 합이 틀렸다");
      if (360 - s !== Number(sub[5])) bad.push("빼기가 틀렸다");
      if (doubles.join(",") !== [sub[1], sub[2], sub[3]].join(",")) {
        bad.push("빼는 값이 위에서 구한 중심각과 다르다");
      }
    }
    const tail = /=(\d+)\^\{\\circ\}\\div 2=(\d+)\^\{\\circ\}\$이다/.exec(
      solution,
    );
    if (!tail) bad.push("마무리 줄이 없다");
    else {
      if (Number(tail[1]) / 2 !== Number(tail[2]))
        bad.push("반으로 나누기가 틀렸다");
      if (sub && Number(sub[5]) !== Number(tail[1]))
        bad.push("나누는 값이 위와 다르다");
    }
  }

  return bad;
}

/** 「$5$가」처럼 **가를 써야 할 자리에 이를 쓴** 것 — 공용 자의 사각이다. */
export function subjectJosaFaults(text: string): string[] {
  const out: string[] = [];
  // 「이」는 서술격(「$5$이다·이므로·이고」)과 안 갈리므로 그 꼬리를 뺀다.
  for (const m of text.matchAll(/\$(\d+)\$(가|이(?![다며면므고라니야]))/g)) {
    const want = numVowelFinal(Number(m[1])) ? "가" : "이";
    if (m[2] !== want) out.push(`$${m[1]}$${m[2]} → ${want}`);
  }
  return out;
}

/** 「$3$로」처럼 **(으)로**를 잘못 붙인 것 — 공용 자가 아예 안 보는 자리다. */
export function euroRoFaults(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$(\d+)\$(으로|로)/g)) {
    const d = Math.abs(Number(m[1])) % 10;
    const want = d === 0 || d === 3 || d === 6 ? "으로" : "로";
    if (m[2] !== want) out.push(`$${m[1]}$${m[2]} → ${want}`);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("🔴 양성 — 손으로 쓴 지면에서 사람이 계산한 답을 그대로 낸다", () => {
    // 129X: $18=5+6+7=3+4+5+6$ → 길이 $3$, $4$ → 합 $7$.
    expect(
      verify129(
        "연속하는 두 개 이상의 자연수를 모두 더하여 $18$을 만들려고 한다. 이때 더하는 자연수의 개수가 될 수 있는 값을 모두 구하고, 그 합을 구하시오.",
      ),
    ).toBe(7);
    // 130X: $a=20$, $b=45$ → $n=4$($16$, $49$)와 $n=19$($1$, $64$) → 합 $23$.
    expect(
      verify130(
        "자연수 $n$에 대하여 두 수 $\\sqrt{20-n}$, $\\sqrt{n+45}$의 값이 모두 자연수이다. 이러한 $n$의 값의 합을 구하시오.",
      ),
    ).toBe(23);
    // 131X: $\sin A=\dfrac12$ 또는 $\dfrac43$ → $A=30^\circ$ → $44\cdot\dfrac34+12\cdot\dfrac13=37$.
    expect(
      verify131(
        "$0^{\\circ}\\le A\\le 90^{\\circ}$인 각 $A$가 이차방정식 $6\\sin^{2}A-11\\sin A+4=0$을 만족시킨다고 한다. 이러한 각 $A$의 크기를 구한 뒤, $44\\cos^{2}A+12\\tan^{2}A$의 값을 구하시오.",
      ),
    ).toBe(37);
    // 132X: 호 $64+78+92=234$ → 남은 $126$ → 원주각의 합 $63$.
    expect(
      verify132(
        "원 $O$의 둘레 위에 다섯 점 $A$, $B$, $C$, $D$, $E$가 이 차례로 놓여 있다. $\\angle ACB=32^{\\circ}$, $\\angle BDC=39^{\\circ}$, $\\angle CED=46^{\\circ}$일 때, $\\angle DAE$와 $\\angle EBA$의 크기의 합을 구하시오.",
      ),
    ).toBe(63);
  });

  it("🔴 음성 — 모양이 어긋나거나 불변식을 어긴 지면은 반드시 던진다", () => {
    // 모양이 다르다
    expect(() =>
      verify129("연속하는 자연수를 더하여 $18$을 만든다."),
    ).toThrow();
    expect(() =>
      verify130("두 수 $\\sqrt{20-n}$의 값이 자연수이다."),
    ).toThrow();
    expect(() => verify131("$\\sin A=\\dfrac{1}{2}$일 때.")).toThrow();
    expect(() => verify132("원 위에 다섯 점이 있다.")).toThrow();
    // 🔴 불변식을 어긴다 — $16$ 은 $2$ 의 거듭제곱이라 연속하는 수의 합으로 못 만든다.
    expect(() =>
      verify129(
        "연속하는 두 개 이상의 자연수를 모두 더하여 $16$을 만들려고 한다. 이때 더하는 자연수의 개수가 될 수 있는 값을 모두 구하고, 그 합을 구하시오.",
      ),
    ).toThrow();
    // $a=11$, $b=100$ 에서는 $n=7$ 하나뿐이라 «합»이 성립하지 않는다.
    expect(() =>
      verify130(
        "자연수 $n$에 대하여 두 수 $\\sqrt{11-n}$, $\\sqrt{n+100}$의 값이 모두 자연수이다. 이러한 $n$의 값의 합을 구하시오.",
      ),
    ).toThrow();
    // 🔴 두 근이 모두 살아남으면(그리고 각이 정수면) 답이 하나가 아니다 —
    //    $2\sin^2A-\sin A=0$ 은 $\sin A=0$($0^\circ$)과 $\dfrac12$($30^\circ$) 둘 다 산다.
    expect(() =>
      verify131(
        "$0^{\\circ}\\le A\\le 90^{\\circ}$인 각 $A$가 이차방정식 $2\\sin^{2}A-1\\sin A+0=0$을 만족시킨다고 한다. 이러한 각 $A$의 크기를 구한 뒤, $44\\cos^{2}A+12\\tan^{2}A$의 값을 구하시오.",
      ),
    ).toThrow();
    // 세 호가 원을 다 먹으면 남는 호가 없다 ($2(90+45+45)=360$).
    expect(() =>
      verify132(
        "원 $O$의 둘레 위에 다섯 점 $A$, $B$, $C$, $D$, $E$가 이 차례로 놓여 있다. $\\angle ACB=90^{\\circ}$, $\\angle BDC=45^{\\circ}$, $\\angle CED=45^{\\circ}$일 때, $\\angle DAE$와 $\\angle EBA$의 크기의 합을 구하시오.",
      ),
    ).toThrow();
  });

  it("🔴 좌표 원주각 자체의 눈금 — 반원의 원주각은 $90^{\\circ}$ 다", () => {
    // 지름의 양 끝을 보는 원주각은 어디서 보든 $90^\circ$.
    for (const at of [30, 100, 200, 330]) {
      expect(inscribedAngleAt(at, 0, 180)).toBeCloseTo(90, 6);
    }
    // 중심각 $120^\circ$ 인 호의 원주각은 $60^\circ$.
    expect(inscribedAngleAt(250, 0, 120)).toBeCloseTo(60, 6);
    // 제곱수 판정기도 «아니오»를 낸다.
    expect(squareRootByScan(324)).toBe(18);
    expect(squareRootByScan(323)).toBeNull();
  });

  it("🔴 해설의 «말» 자가 낱말을 뒤집으면 빨개진다 (양성 4 · 음성 12)", () => {
    for (const key of KEYS) {
      const p = build(key, 20260903, 0);
      expect(claimFaults(key, p.content, p.solution), `${key} 양성`).toEqual(
        [],
      );
    }
    // 🔴 죽는 까닭은 씨앗마다 다르므로 **지면에서 읽어** 뒤집는다 — 낱말을 손으로
    //    적어 두면 다른 갈래의 판에서 「원문에 그 낱말이 없다」로 헛돈다.
    const seedFor = (key: string, re: RegExp): [number, number] => {
      for (const [s, v] of WIDE) {
        if (re.test(build(key, s, v).solution)) return [s, v];
      }
      throw new Error(`${key}: ${re} 인 판을 못 찾았다`);
    };
    const flips: ReadonlyArray<readonly [string, RegExp, string, string]> = [
      [K129, /홀수이므로/, "홀수이므로", "짝수이므로"],
      [K129, /자연수가 아니고/, "자연수가 아니고", "자연수이고"],
      [K129, /곧 \$k\\times k</, "곧 $k\\times k<", "곧 $k\\times k>"],
      [
        K130,
        /어떤 자연수의 제곱도 아니고/,
        "어떤 자연수의 제곱도 아니고",
        "어떤 자연수의 제곱이고",
      ],
      [
        K130,
        /어떤 자연수의 제곱이다/,
        "어떤 자연수의 제곱이다",
        "어떤 자연수의 세제곱이다",
      ],
      [
        K131,
        /그 값이 \$1\$보다 클 수는 없다/,
        "그 값이 $1$보다 클 수는 없다",
        "그 값이 $1$보다 작을 수는 없다",
      ],
      [
        K131,
        /그 값이 음수가 될 수는 없다/,
        "그 값이 음수가 될 수는 없다",
        "그 값이 양수가 될 수는 없다",
      ],
      [K131, /정할 수 없으므로/, "정할 수 없으므로", "정할 수 있으므로"],
      [
        K132,
        /원주각의 크기의 두 배이므로/,
        "원주각의 크기의 두 배이므로",
        "원주각의 크기의 반이므로",
      ],
      [
        K132,
        /두 중심각의 크기의 합의 반이다/,
        "두 중심각의 크기의 합의 반이다",
        "두 중심각의 크기의 합의 두 배이다",
      ],
      [
        K132,
        /하나로 정해지지 않는다/,
        "하나로 정해지지 않는다",
        "하나로 정해진다",
      ],
      [K132, /원 전체가 되고/, "원 전체가 되고", "반원이 되고"],
    ];
    for (const [key, re, from, to] of flips) {
      const [seed, variant] = seedFor(key, re);
      const p = build(key, seed, variant);
      expect(p.solution, `${key} 원문에 «${from}» 이 없다`).toContain(from);
      const bent = p.solution.replace(from, to);
      expect(bent, `${key} 변이가 안 먹었다`).not.toBe(p.solution);
      expect(
        claimFaults(key, p.content, bent).length,
        `${key} «${from}» → «${to}» 가 초록이다`,
      ).toBeGreaterThan(0);
    }
  });

  it("🔴 수를 흔들어도 빨개진다 — 낱말만 보는 자가 아니다", () => {
    // 129X — $2a$ 값을 하나 올린다(홀짝이 뒤집힌다).
    const p129 = build(K129, 20260903, 0);
    const b129 = p129.solution.replace(
      /=(\d+)\$이다\. \$(\d+)\$/,
      (_m, x, y) => `=${Number(x) + 1}$이다. $${y}$`,
    );
    expect(b129).not.toBe(p129.solution);
    expect(claimFaults(K129, p129.content, b129).length).toBeGreaterThan(0);
    // 130X — 끼인 제곱수를 어긋나게 한다.
    const p130 = build(K130, 20260903, 0);
    const b130 = p130.solution.replace(
      /\$(\d+)\^\{2\}=(\d+)\$,/,
      (_m, a, b) => `$${a}^{2}=${Number(b) + 1}$,`,
    );
    expect(b130).not.toBe(p130.solution);
    expect(claimFaults(K130, p130.content, b130).length).toBeGreaterThan(0);
    // 131X — 마지막 덧셈을 틀리게 한다.
    const p131 = build(K131, 20260903, 0);
    const b131 = p131.solution.replace(
      /=(\d+)\+(\d+)=(\d+)\$이다/,
      (_m, a, b, c) => `=${a}+${b}=${Number(c) + 1}$이다`,
    );
    expect(b131).not.toBe(p131.solution);
    expect(claimFaults(K131, p131.content, b131).length).toBeGreaterThan(0);
    // 132X — 중심각의 두 배를 틀리게 한다.
    const p132 = build(K132, 20260903, 0);
    const b132 = p132.solution.replace(
      /\$2\\times (\d+)\^\{\\circ\}=(\d+)\^\{\\circ\}\$/,
      (_m, a, b) => `$2\\times ${a}^{\\circ}=${Number(b) + 2}^{\\circ}$`,
    );
    expect(b132).not.toBe(p132.solution);
    expect(claimFaults(K132, p132.content, b132).length).toBeGreaterThan(0);
  });

  it("🔴 조사 자 둘이 «아니오»도 낸다 (양성·음성 한 쌍씩)", () => {
    expect(subjectJosaFaults("$5$이 있다")).toHaveLength(1);
    expect(subjectJosaFaults("$5$가 있다")).toEqual([]);
    expect(subjectJosaFaults("$3$가 있다")).toHaveLength(1);
    expect(subjectJosaFaults("$3$이 있다")).toEqual([]);
    // 서술격은 안 본다 — 거짓 경보는 가드를 끈다.
    expect(subjectJosaFaults("답은 $3$이다")).toEqual([]);
    expect(euroRoFaults("$3$로 자연수")).toHaveLength(1);
    expect(euroRoFaults("$3$으로 자연수")).toEqual([]);
    expect(euroRoFaults("$5$으로 자연수")).toHaveLength(1);
    expect(euroRoFaults("$5$로 자연수")).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// 배선
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M3_TOP_5A).toHaveLength(4);
    expect(M3_TOP_5A.map((e) => e.key).sort()).toEqual([...KEYS].sort());
    expect(new Set(M3_TOP_5A.map((e) => e.key)).size).toBe(4);
  });

  it("번호가 `X` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M3_TOP_5A) {
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
    // 번호 구간을 리드가 나눠 준 그대로 쓴다.
    expect(M3_TOP_5A.map((e) => e.rpmType)).toEqual([
      "129X",
      "130X",
      "131X",
      "132X",
    ]);
  });

  it("🔴 소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    for (const e of M3_TOP_5A) {
      expect(e.grade).toBe("중3");
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
    expect([...new Set(M3_TOP_5A.map((e) => e.unitSection))].sort()).toEqual(
      [
        "원주각",
        "삼각비의 값",
        "이차방정식의 활용",
        "제곱근의 뜻과 성질",
      ].sort(),
    );
  });

  it("🔴 브리프가 준 소단원 이름 하나(「원주각의 성질」)는 정본에 **없다** — 리드가 알아야 한다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    // 넷 중 셋은 정본에 있고, 「원주각의 성질」만 없다.
    expect(BRIEF_SECTION_NAMES.filter((s) => sections.has(s))).toEqual([
      "이차방정식의 활용",
      "제곱근의 뜻과 성질",
      "삼각비의 값",
    ]);
    expect(sections.has("원주각의 성질")).toBe(false);
    expect(sections.has("원주각")).toBe(true);
    // 그 이름은 **RPM 유형의 제목**이다 — 소단원과 헷갈릴 만한 자리라 근거를 남긴다.
    const titles = new Set(registeredTypes().map((t) => t.rpmTitle));
    expect(titles.has("원주각의 성질")).toBe(true);
  });

  it("🔴 소단원 이름과 RPM 중단원 이름이 **다른 것이 하나** 있다 — 손으로 적으면 어긋난다", () => {
    const diff = M3_TOP_5A.filter((e) => e.unitSection !== e.rpmMinor).map(
      (e) => [e.unitSection, e.rpmMinor],
    );
    expect(diff).toEqual([["삼각비의 값", "삼각비"]]);
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const hit = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(hit === 0 || hit === 4, `등록된 것 ${hit}/4`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M3_TOP_5A) {
      for (const [seed, v] of BULK.slice(0, 40)) {
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

  it("조용한 기본값을 안 낸다 — 못 만들면 **던진다**", () => {
    expect(() => planConsecutiveSum(() => 1.5)).toThrow();
    expect(() => planSquareGap(() => 1.5)).toThrow();
    expect(() => planTrigRoot(() => 1.5)).toThrow();
    expect(() => planCircleCross(() => 1.5)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — 지면과 값", () => {
  it("🔴 중3에 `심화중`·`심화상` 이 **둘 다** 더 생겼다 (D-116 ⑴)", () => {
    for (const key of KEYS) {
      expect(build(key, 20260903, 0).difficulty).toBe(EXPECTED_TIER[key]);
    }
    const tiers = KEYS.map((k) => EXPECTED_TIER[k]);
    expect(tiers.filter((t) => t === "심화중").length).toBeGreaterThan(0);
    expect(tiers.filter((t) => t === "심화상").length).toBeGreaterThan(0);
  });

  for (const e of M3_TOP_5A) {
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

      it("🔴 조사 — 공용 자와 «이/가»·«(으)로» 자를 함께 댄다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
          expect(josaMismatches(p.content), `${e.key} 발문 조사`).toEqual([]);
          expect(josaMismatches(p.solution), `${e.key} 해설 조사`).toEqual([]);
          expect(subjectJosaFaults(p.content), `${e.key} 발문 이/가`).toEqual(
            [],
          );
          expect(subjectJosaFaults(p.solution), `${e.key} 해설 이/가`).toEqual(
            [],
          );
          expect(euroRoFaults(p.content), `${e.key} 발문 (으)로`).toEqual([]);
          expect(euroRoFaults(p.solution), `${e.key} 해설 (으)로`).toEqual([]);
        }
      });

      it("냄새·걸음이 깨끗하다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const p = build(e.key, seed, v);
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

      it("🔴 ㉵ 발문이 자료를 늘어놓지 않는다 — 정렬이 순위를 암시할 자리가 없다 (660판)", () => {
        for (const [seed, v] of WIDE) {
          const nums = [...build(e.key, seed, v).content.matchAll(/-?\d+/g)];
          // 조건에 오는 수는 많아야 여섯(각도의 $0$·$90$·지수 $2$ 포함).
          expect(
            nums.length,
            `${e.key} 발문의 수 ${nums.length}개`,
          ).toBeLessThanOrEqual(12);
        }
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
        /**
         * 🔴 **이 수는 씨앗 소금에 따라 달라진다.** 등록되면 `build` 가
         * `generateMiddleProblem` 으로 갈아타 `keySalt(key)` 가 더해지므로 rng 흐름이
         * 바뀐다(4차 물결 갈래 a 가 여기서 물렸다 — 정확한 값을 얼렸다가 등록과 함께
         * 넷 다 빨개졌다). 그래서 **정확한 값이 아니라 상한**을 잠근다.
         * 등록 전 실측: `129X` 10 · `130X` 16 · `131X` 13 · `132X` 13 (창 220씨앗).
         */
        expect(
          worstVariant,
          `${e.key} 가장 오래 걸린 씨앗 ${worstVariant}변형`,
        ).toBeLessThanOrEqual(VARIANT_FLOOR[e.key]! + 8);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉮ 해설이 정답지 한 단에 들어가나
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — 해설이 정답지 한 단에 들어가나", () => {
  it("🔴 자가 살아 있는가 — 긴 글은 한 단을 넘고 짧은 글은 안 넘는다", () => {
    const long = Array.from({ length: 40 }, () => "가".repeat(60)).join("\n");
    expect(estimateSolutionPx(long)).toBeGreaterThan(964.8);
    expect(estimateSolutionPx("짧다.")).toBeLessThan(200);
  });

  it("🔴 네 유형 전부 660판에서 700px 미만이다", () => {
    for (const e of M3_TOP_5A) {
      let worst = 0;
      let where = "";
      for (const [seed, v] of WIDE) {
        const px = estimateSolutionPx(build(e.key, seed, v).solution);
        if (px > worst) {
          worst = px;
          where = `${seed}/${v}`;
        }
      }
      expect(
        worst,
        `${e.key} 최대 ${worst.toFixed(0)}px (${where})`,
      ).toBeLessThan(700);
    }
  });

  it("🔴 훑는 자리 상한이 산출물에 실제로 걸린다 — 지면 길이의 상한이 그것이다", () => {
    // 129X — 후보가 다섯을 안 넘는다(여섯이면 나열이 한 줄 더 길어진다).
    for (const r of consecutiveSumPool()) {
      const cand = consecutiveCounts(r.total, true, false);
      expect(cand.length).toBeGreaterThanOrEqual(3);
      expect(cand.length).toBeLessThanOrEqual(5);
      expect(r.kept.length).toBeGreaterThanOrEqual(2);
      expect(r.kept.length).toBeLessThanOrEqual(4);
    }
    // 130X — 후보가 여섯을 안 넘는다.
    for (const r of squareGapPool()) {
      const cand = squareGapCandidates(r.a);
      expect(cand.length).toBeGreaterThanOrEqual(3);
      expect(cand.length).toBeLessThanOrEqual(6);
    }
    // 🔴 창의 상한이 **지면에 실제로 걸리는지** 본다 — 상수와 지면이 갈리면
    //    해설이 훑지 않은 후보를 발문이 허락하게 된다.
    let mark129 = 0;
    let mark130 = 0;
    for (const [seed, v] of WIDE.slice(0, 90)) {
      mark129 = Math.max(
        mark129,
        (build(K129, seed, v).solution.match(/[㉠㉡㉢㉣㉤㉥㉦㉧]/g) ?? [])
          .length,
      );
      mark130 = Math.max(
        mark130,
        (build(K130, seed, v).solution.match(/[㉠㉡㉢㉣㉤㉥㉦㉧]/g) ?? [])
          .length,
      );
    }
    expect(mark129).toBeLessThanOrEqual(5);
    expect(mark130).toBeLessThanOrEqual(6);
    expect(mark129).toBeGreaterThanOrEqual(3);
    expect(mark130).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 창이 한쪽 끝만인가 · ㉡ 굳힘이 항등식인가
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("🔴 `129X` — 첫 후보 $k=2$ 는 **언제나 죽는다**. 그 구조적 사실을 숨기지 않는다", () => {
    /**
     * 🔴 **왜 언제나 죽나 — 그리고 왜 그것이 ㉠ 을 넘긴 근거가 아닌가.**
     *
     * $N$ 이 **홀수**면 $2N$ 의 약수는 전부 「$k$ 와 $2N\div k$ 의 홀짝이 반대」라
     * **후보가 하나도 안 죽는다.** 그래서 「죽는 것 $\ge1$」 가드가 $N$ 을 짝수로 못
     * 박고, 짝수 $N$ 에서 $k=2$ 는 $2N\div2-1=N-1$ 이 홀수라 **반드시** 죽는다.
     *
     * ㉠ 을 넘긴 근거는 그 사실이 아니라 ⓐ 답이 **살아남은 것 전부의 합**이라 목록의
     * 어느 자리도 답이 아니고 ⓑ **몇 개가 사는지**(2~4)와 **어느 자리가 사는지**가
     * 씨앗마다 갈린다는 것이다. 아래에서 둘 다 센다.
     */
    let firstAlive = 0;
    const patterns = new Set<string>();
    const keptCounts = new Set<number>();
    for (const r of consecutiveSumPool()) {
      const cand = consecutiveCounts(r.total, true, false);
      if (r.kept.includes(cand[0]!)) firstAlive += 1;
      patterns.add(cand.map((k) => (r.kept.includes(k) ? "O" : "X")).join(""));
      keptCounts.add(r.kept.length);
      expect(r.total % 2, `홀수 $N$ 이 풀에 있다 — ${r.total}`).toBe(0);
    }
    expect(firstAlive, "첫 후보가 사는 씨앗").toBe(0);
    // 홀수 $N$ 에서는 정말 아무것도 안 죽는지 확인한다(위 주장을 전수로).
    for (let total = 9; total <= 800; total += 2) {
      const cand = consecutiveCounts(total, true, false);
      const kept = consecutiveCounts(total, true, true);
      expect(kept.length, `홀수 $N=${total}$ 에서 죽은 후보가 있다`).toBe(
        cand.length,
      );
    }
    expect(patterns.size, "생존 무늬 가짓수").toBeGreaterThanOrEqual(4);
    // 🔴 창 가드는 「사는 것 $2$~$4$」인데 **실제로 나오는 것은 $2$ 와 $3$ 뿐**이다.
    //    후보가 다섯을 안 넘고 적어도 하나가 죽으므로 넷이 사는 자리가 구조적으로
    //    좁다 — 「가드가 $4$ 를 허락한다」와 「$4$ 가 나온다」는 다른 말이고, 여기 적어
    //    둔다(늘어나면 이 줄이 빨개져서 다시 보게 된다).
    expect([...keptCounts].sort()).toEqual([2, 3]);
  });

  it("`130X` — 첫 후보가 사는 씨앗과 죽는 씨앗이 **둘 다** 있다", () => {
    let alive = 0;
    let dead = 0;
    const patterns = new Set<string>();
    for (const r of squareGapPool()) {
      const cand = squareGapCandidates(r.a);
      const hits = squareGapHits(r.a, r.b, true);
      if (hits.includes(cand[0]!)) alive += 1;
      else dead += 1;
      patterns.add(cand.map((n) => (hits.includes(n) ? "O" : "X")).join(""));
    }
    expect(alive).toBeGreaterThan(0);
    expect(dead).toBeGreaterThan(0);
    expect(patterns.size).toBeGreaterThanOrEqual(10);
  });

  it("`131X` — 죽는 까닭이 셋 다 나오고, 큰 근도 작은 근도 죽는다", () => {
    const fates = new Set<string>();
    let big = 0;
    let small = 0;
    const angles = new Set<number>();
    for (const r of trigRootPool()) {
      fates.add(rootFate(r.fn, r.deadNum, r.deadDen));
      if (r.deadNum / r.deadDen > 0.5) big += 1;
      else small += 1;
      angles.add(r.angle);
    }
    expect([...fates].sort()).toEqual(
      ["음수", "일보다크다", "탄젠트없음"].sort(),
    );
    expect(big).toBeGreaterThan(0);
    expect(small).toBeGreaterThan(0);
    expect([...angles].sort((a, b) => a - b)).toEqual([30, 60]);
    // 지면에서도 세 까닭이 다 나오는지 본다(풀에만 있고 안 뽑히면 장식이다).
    const seen = new Set<string>();
    for (const [seed, v] of WIDE) {
      const s = build(K131, seed, v).solution;
      if (/그 값이 \$1\$보다 클 수는 없다/.test(s)) seen.add("일보다크다");
      if (/그 값이 음수가 될 수는 없다/.test(s)) seen.add("음수");
      if (/\$\\tan 90\^\{\\circ\}\$의 값은 정할 수 없으므로/.test(s))
        seen.add("탄젠트없음");
    }
    expect([...seen].sort()).toEqual(
      ["음수", "일보다크다", "탄젠트없음"].sort(),
    );
  });

  it("🔴 `132X` — **해당 없음**: 후보 목록이 없다. 값이 하나로 굳는 것을 대신 잰다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다 — 그 사실을 여기서 찍는다.
    const page = build(K132, 20260903, 0).solution;
    expect(/㉠|㉡|후보|조건에 맞지 않는다/.test(page)).toBe(false);
    // 안 정해지는 두 호를 어떻게 갈라도 답이 같다 — 좌표로 전수 확인(검산기가 그 일을 한다).
    for (const [seed, v] of WIDE.slice(0, 120)) {
      const p = build(K132, seed, v);
      expect(verify132(p.content)).toBe(answerNumber(p.answer));
    }
  });
});

describe("중3 5차a 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("`129X` — 굳힘이 **둘**이고, 끄면 훑는 것이 실제로 늘어난다 (창 전수)", () => {
    let parityMatters = 0;
    let smallMatters = 0;
    for (const r of consecutiveSumPool()) {
      const on = consecutiveCounts(r.total, true, true);
      const noParity = consecutiveCounts(r.total, true, false);
      const noSmall = consecutiveCounts(r.total, false, true);
      if (on.join(",") !== noParity.join(",")) parityMatters += 1;
      if (on.join(",") !== noSmall.join(",")) smallMatters += 1;
      // 「끄면 더 훑는다」는 주석의 단언 — 코드가 실제로 그런지 본다 (㉷).
      expect(noSmall.length).toBeGreaterThanOrEqual(on.length);
      expect(consecutiveCandidates(r.total).length).toBeGreaterThanOrEqual(
        noParity.length,
      );
    }
    expect(parityMatters).toBe(consecutiveSumPool().length);
    expect(smallMatters).toBe(consecutiveSumPool().length);
    // 굳힘의 뜻이 맞는지 — 살아남은 $k$ 는 첫 수가 자연수여야 한다.
    for (const r of consecutiveSumPool()) {
      for (const k of r.kept) expect(firstTermFor(r.total, k)).not.toBeNull();
      for (const k of consecutiveCounts(r.total, true, false)) {
        if (!r.kept.includes(k)) expect(firstTermFor(r.total, k)).toBeNull();
      }
    }
  });

  it("`130X` — 둘째 조건을 끄면 답이 달라진다 (창 전수)", () => {
    let changed = 0;
    for (const r of squareGapPool()) {
      const on = squareGapHits(r.a, r.b, true);
      const off = squareGapHits(r.a, r.b, false);
      expect(off.length).toBeGreaterThan(on.length);
      if (on.reduce((t, v) => t + v, 0) !== off.reduce((t, v) => t + v, 0))
        changed += 1;
    }
    expect(changed).toBe(squareGapPool().length);
  });

  it("`131X` — 굳힘 둘을 끄면 후보가 **둘 다** 살아 답이 안 정해진다 (창 전수)", () => {
    for (const fn of ["sin", "cos"] as TrigFn[]) {
      for (const [dn, dd] of deadRootCandidates(fn)) {
        expect(
          liveTrigRoots(fn, dn, dd, true, true),
          `${fn} ${dn}/${dd}`,
        ).toEqual([[1, 2]]);
        expect(
          liveTrigRoots(fn, dn, dd, false, false).length,
          `${fn} ${dn}/${dd} 끔`,
        ).toBe(2);
      }
    }
    // 굳힘 하나씩만 껐을 때도 «그 까닭에 맞는» 후보만 되살아난다.
    for (const fn of ["sin", "cos"] as TrigFn[]) {
      for (const [dn, dd] of deadRootCandidates(fn)) {
        const fate = rootFate(fn, dn, dd);
        const noRange = liveTrigRoots(fn, dn, dd, false, true).length;
        const noTan = liveTrigRoots(fn, dn, dd, true, false).length;
        if (fate === "탄젠트없음") {
          expect(noTan).toBe(2);
          expect(noRange).toBe(1);
        } else {
          expect(noRange).toBe(2);
          expect(noTan).toBe(1);
        }
      }
    }
    // 특수각 표 자체의 눈금.
    expect(specialAngleOf("sin", 1, 2)).toBe(30);
    expect(specialAngleOf("cos", 1, 2)).toBe(60);
    expect(specialAngleOf("sin", 1, 3)).toBeNull();
  });

  it("`132X` — 「원주각은 중심각의 반」을 끄면 답이 늘 두 배가 된다 (창 전수)", () => {
    for (const r of circleCrossPool()) {
      expect(remainingInscribedSum(r.p, r.q, r.r, false)).toBe(2 * r.answer);
      expect(remainingInscribedSum(r.p, r.q, r.r, true)).toBe(r.answer);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 정답 쏠림 · 지름길 · D-20 손실 원장
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — 쏠림과 지름길", () => {
  it("🔴 최빈 정답이 12% 미만이다 (660판)", () => {
    for (const e of M3_TOP_5A) {
      const tally = new Map<string, number>();
      for (const [seed, v] of WIDE) {
        const a = build(e.key, seed, v).answer;
        tally.set(a, (tally.get(a) ?? 0) + 1);
      }
      const top = [...tally.values()].sort((a, b) => b - a)[0]!;
      const rate = top / WIDE.length;
      expect(rate, `${e.key} 최빈 ${(rate * 100).toFixed(2)}%`).toBeLessThan(
        0.12,
      );
      expect(tally.size, `${e.key} 서로 다른 답`).toBeGreaterThanOrEqual(20);
    }
  });

  it("🔴 풀이 낼 수 있는 답을 하나도 안 빠뜨린다 — 「고르게」의 반대편", () => {
    expect(consecutiveAnswers()).toEqual(
      [...new Set(consecutiveSumPool().map((r) => r.answer))].sort(
        (a, b) => a - b,
      ),
    );
    expect(squareGapAnswers()).toEqual(
      [...new Set(squareGapPool().map((r) => r.answer))].sort((a, b) => a - b),
    );
    expect(trigRootAnswers()).toEqual(
      [...new Set(trigRootPool().map((r) => r.answer))].sort((a, b) => a - b),
    );
    expect(circleCrossAnswers()).toEqual(
      [...new Set(circleCrossPool().map((r) => r.answer))].sort(
        (a, b) => a - b,
      ),
    );
  });

  it("🔴 지름길이 한 판도 없다 — 발문의 수로 한 걸음에 안 닿는다 (660판)", () => {
    for (const e of M3_TOP_5A) {
      for (const [seed, v] of WIDE) {
        const p = build(e.key, seed, v);
        const nums = [...p.content.matchAll(/-?\d+/g)].map((m) => Number(m[0]));
        expect(nums.length, `${e.key} 지면에 수가 없다`).toBeGreaterThan(0);
        expect(
          oneStepReach(nums).has(answerNumber(p.answer)),
          `${e.key} ${seed}/${v}`,
        ).toBe(false);
      }
    }
    // 그 자가 «있다»도 낼 수 있음을 양성으로 보인다 — 없으면 위 $0$ 이 아무것도 안 뜻한다.
    expect(oneStepReach([3, 4]).has(12)).toBe(true);
    expect(oneStepReach([3, 4]).has(7)).toBe(true);
    expect(oneStepReach([3, 4]).has(11)).toBe(false);
  });

  it("🔴 지름길 비율을 **널 모형**(답을 판끼리 돌려 끼운 우연 수준)과 견준다", () => {
    for (const e of M3_TOP_5A) {
      const rows: { ans: number; nums: number[] }[] = [];
      for (const [seed, v] of WIDE.slice(0, 240)) {
        const p = build(e.key, seed, v);
        rows.push({
          ans: answerNumber(p.answer),
          nums: [...p.content.matchAll(/-?\d+/g)].map((m) => Number(m[0])),
        });
      }
      let chance = 0;
      for (let i = 0; i < rows.length; i += 1) {
        const other = rows[(i * 7 + 13) % rows.length]!.ans;
        if (oneStepReach(rows[i]!.nums).has(other)) chance += 1;
      }
      // 내보내는 판은 전부 $0$% 다(위 검사). 널 모형은 그 $0$ 이 «못 셈»이 아님을 보인다.
      expect(chance, `${e.key} 우연 수준`).toBeGreaterThan(0);
    }
  });

  it("🔴 D-20 손실 원장이 재현된다 — 창 전수, 「가드 하나만 껐을 때」", () => {
    type Row = { answer: number; keep: boolean };
    const t = (rows: Row[]): [number, number, number, number] => {
      const on = rows.filter((r) => r.keep);
      return [
        rows.length,
        new Set(rows.map((r) => r.answer)).size,
        on.length,
        new Set(on.map((r) => r.answer)).size,
      ];
    };

    // ── 129X — 창 $9\le N\le800$
    const r129 = (
      offCand: boolean,
      offKept: boolean,
      offDie: boolean,
      offShort: boolean,
    ): Row[] => {
      const out: Row[] = [];
      for (let total = 9; total <= 800; total += 1) {
        const cand = consecutiveCounts(total, true, false);
        const kept = consecutiveCounts(total, true, true);
        if (kept.length === 0) continue;
        const answer = kept.reduce((x, y) => x + y, 0);
        out.push({
          answer,
          keep:
            (offCand || (cand.length >= 3 && cand.length <= 5)) &&
            (offKept || (kept.length >= 2 && kept.length <= 4)) &&
            (offDie || cand.length - kept.length >= 1) &&
            (offShort || !oneStepReach([0, 1, 2, total]).has(answer)),
        });
      }
      return out;
    };
    expect(t(r129(false, false, false, false))).toEqual([786, 99, 88, 28]);
    expect(t(r129(true, false, false, false))).toEqual([786, 99, 159, 34]);
    expect(t(r129(false, true, false, false))).toEqual([786, 99, 168, 31]);
    expect(t(r129(false, false, true, false))).toEqual([786, 99, 249, 40]);
    // 🔴 **지름길 가드는 다른 가드가 켜진 뒤에는 아무것도 안 버린다.** 「$0$」을 적어
    //    둔다 — 다음 사람이 살아 있는 줄 알면 안 되고, 살아나면 이 줄이 빨개진다.
    expect(t(r129(false, false, false, true))).toEqual([786, 99, 88, 28]);
    // 그래도 죽은 규칙은 아니다 — **혼자 켜면** 218판을 버린다.
    let alone129 = 0;
    let base129 = 0;
    for (let total = 9; total <= 800; total += 1) {
      const kept = consecutiveCounts(total, true, true);
      if (kept.length === 0) continue;
      base129 += 1;
      if (!oneStepReach([0, 1, 2, total]).has(kept.reduce((x, y) => x + y, 0)))
        alone129 += 1;
    }
    expect([base129, alone129]).toEqual([786, 568]);
    expect(consecutiveSumPool().length).toBe(88);

    // ── 130X — 창 $10\le a\le50$, $1\le b\le300$
    const r130 = (
      offCand: boolean,
      offHits: boolean,
      offProper: boolean,
      offShort: boolean,
    ): Row[] => {
      const out: Row[] = [];
      for (let a = 10; a <= 50; a += 1) {
        const cand = squareGapCandidates(a);
        for (let b = 1; b <= 300; b += 1) {
          const hits = squareGapHits(a, b, true);
          if (hits.length === 0) continue;
          const answer = hits.reduce((x, y) => x + y, 0);
          out.push({
            answer,
            keep:
              (offCand || (cand.length >= 3 && cand.length <= 6)) &&
              (offHits || (hits.length >= 2 && hits.length <= 4)) &&
              (offProper || hits.length < cand.length) &&
              (offShort || !oneStepReach([0, 1, 2, a, b]).has(answer)),
          });
        }
      }
      return out;
    };
    expect(t(r130(false, false, false, false))).toEqual([2448, 78, 92, 51]);
    expect(t(r130(true, false, false, false))).toEqual([2448, 78, 99, 52]);
    expect(t(r130(false, true, false, false))).toEqual([2448, 78, 1541, 73]);
    // 🔴 「사는 것이 후보의 진부분집합」은 이 창에서 **혼자 켜도 $0$ 을 버린다** —
    //    후보가 셋 이상이면 전부 살아남는 일이 없기 때문이다. 불변식의 기록으로 남긴다.
    expect(t(r130(false, false, true, false))).toEqual([2448, 78, 92, 51]);
    let alone130 = 0;
    for (let a = 10; a <= 50; a += 1) {
      const cand = squareGapCandidates(a);
      for (let b = 1; b <= 300; b += 1) {
        const hits = squareGapHits(a, b, true);
        if (hits.length === 0) continue;
        if (hits.length < cand.length) alone130 += 1;
      }
    }
    expect(alone130).toBe(2448);
    expect(t(r130(false, false, false, true))).toEqual([2448, 78, 197, 68]);
    expect(squareGapPool().length).toBe(92);

    // ── 131X — 창 = 죽는 근 × $U$ × $V$
    const r131 = (offShort: boolean): Row[] => {
      const out: Row[] = [];
      for (const fn of ["sin", "cos"] as TrigFn[]) {
        const angle = fn === "sin" ? 30 : 60;
        for (const [dn, dd] of deadRootCandidates(fn)) {
          const coefP = 2 * dd;
          const coefQ = -(2 * dn + dd);
          for (let bu = 1; bu <= 15; bu += 1) {
            for (let bv = 1; bv <= 12; bv += 1) {
              const u = 4 * bu;
              const v = 3 * bv;
              const answer = trigExprValue(angle, u, v);
              const page = [
                0,
                1,
                2,
                90,
                u,
                v,
                Math.abs(coefP),
                Math.abs(coefQ),
                Math.abs(dn),
                Math.abs(dn),
                dd,
              ];
              out.push({
                answer,
                keep: offShort || !oneStepReach(page).has(answer),
              });
            }
          }
        }
      }
      return out;
    };
    expect(t(r131(false))).toEqual([7560, 86, 3703, 79]);
    expect(t(r131(true))).toEqual([7560, 86, 7560, 86]);
    expect(trigRootPool().length).toBe(3703);
    expect([
      deadRootCandidates("sin").length,
      deadRootCandidates("cos").length,
    ]).toEqual([21, 21]);

    // ── 132X — 창 $10\le p\le q\le r\le60$
    const r132 = (offRange: boolean, offShort: boolean): Row[] => {
      const out: Row[] = [];
      for (let p = 10; p <= 60; p += 1) {
        for (let q = p; q <= 60; q += 1) {
          for (let r = q; r <= 60; r += 1) {
            const answer = remainingInscribedSum(p, q, r, true);
            out.push({
              answer,
              keep:
                (offRange || (answer >= 20 && answer <= 140)) &&
                (offShort || !oneStepReach([0, 1, 2, p, q, r]).has(answer)),
            });
          }
        }
      }
      return out;
    };
    expect(t(r132(false, false))).toEqual([23426, 151, 19835, 121]);
    expect(t(r132(true, false))).toEqual([23426, 151, 20172, 146]);
    expect(t(r132(false, true))).toEqual([23426, 151, 23059, 121]);
    expect(circleCrossPool().length).toBe(19835);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉰ 지면의 분수가 모두 기약인가
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — ㉰ 분수", () => {
  it("🔴 지면의 모든 `dfrac{정수}{정수}` 가 기약이고 분모가 $1$ 이 아니다", () => {
    let found = 0;
    const gcd2 = (a: number, b: number): number =>
      b === 0 ? a : gcd2(b, a % b);
    for (const e of M3_TOP_5A) {
      for (const [seed, v] of BULK) {
        const p = build(e.key, seed, v);
        for (const m of `${p.content}\n${p.solution}`.matchAll(
          /\\d?frac\{(\d+)\}\{(\d+)\}/g,
        )) {
          found += 1;
          const a = Number(m[1]);
          const b = Number(m[2]);
          expect(b, `${e.key} 분모가 $1$ 이다`).not.toBe(1);
          expect(gcd2(a, b), `${e.key} ${m[0]} 이 기약이 아니다`).toBe(1);
        }
      }
    }
    // ⚠️ 한 자리도 못 찾으면 이 검사는 구조적으로 0 이다 — 찾은 자리 수도 못 박는다.
    expect(found).toBeGreaterThan(600);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉢ 형제와의 겹침
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — ㉢ 형제와의 겹침", () => {
  const all = registeredTypes();

  /** 그 소단원의 형제 지면 — 못 뽑는 유형은 건너뛰고, 몇을 건너뛰었는지 센다. */
  function siblingPages(section: string, exclude: string) {
    const rows: {
      key: string;
      title: string;
      content: string;
      answer: string;
    }[] = [];
    let skipped = 0;
    for (const t of all) {
      if (t.unitSection !== section || t.key === exclude) continue;
      try {
        const p = generateMiddleProblem(t.key, OVERLAP_SEED, 0);
        rows.push({
          key: t.key,
          title: t.rpmTitle,
          content: p.content,
          answer: p.answer,
        });
      } catch {
        skipped += 1;
      }
    }
    return { rows, skipped };
  }

  for (const e of M3_TOP_5A) {
    it(`${e.rpmType} — 형제 중 가장 닮은 것이 기준선보다 안 닮았다`, () => {
      const mine = build(e.key, OVERLAP_SEED);
      const { rows, skipped } = siblingPages(e.unitSection, e.key);
      expect(skipped, `${e.key} 못 뽑은 형제`).toBe(0);
      expect(rows.length).toBeGreaterThan(5);
      const base: number[] = [];
      for (let i = 0; i < rows.length; i += 1) {
        for (let j = i + 1; j < rows.length; j += 1) {
          base.push(
            jaccard(wordKey(rows[i]!.content), wordKey(rows[j]!.content)),
          );
        }
      }
      base.sort((a, b) => a - b);
      const median = base[Math.floor(base.length / 2)]!;
      let worst = 0;
      let worstKey = "";
      for (const r of rows) {
        const v = jaccard(wordKey(mine.content), wordKey(r.content));
        if (v > worst) {
          worst = v;
          worstKey = r.key;
        }
      }
      // ⚠️ 기준선 **최댓값**을 면제부로 쓰지 않는다 — 이 소단원들에서 그 값은 $1.000$ 이다
      //    (형제 둘의 발문이 「…의 값을 구하시오.」 뿐이라 한글 낱말이 같다). 그 천장은
      //    「이 열쇠로는 안 갈린다」는 뜻이지 「안 닮았다」는 뜻이 아니다.
      expect(
        worst,
        `${e.key} 가장 닮은 형제 ${worstKey} ${worst.toFixed(3)}`,
      ).toBeLessThan(0.35);
      expect(median).toBeLessThan(0.35);
      // 수 열쇠도 같이 본다(작은 집합에서 잘 듣는다).
      const worstNum = Math.max(
        ...rows.map((r) =>
          jaccard(
            numberKey(mine.content, mine.answer),
            numberKey(r.content, r.answer),
          ),
        ),
      );
      expect(worstNum, `${e.key} 수 열쇠 ${worstNum.toFixed(3)}`).toBeLessThan(
        0.35,
      );
    });
  }

  it("🔴 형제의 «제목»을 못 박는다 — 수치가 못 잡는 «같은 문항»은 사람이 읽어야 한다", () => {
    /**
     * 🔴 `132X` 의 첫 설계는 형제 `3-2|원주각|09` 와 **같은 문항**이었는데 한글 낱말
     * 겹침이 $0.190$ 이었다(문턱 아래). 낱말을 다르게 적기만 해도 그 자는 «안 닮았다»고
     * 한다. 그래서 형제 목록을 **글자로** 얼려 둔다 — 형제가 늘거나 제목이 바뀌면
     * 빨개지고, 그때 다시 **읽어야** 한다.
     */
    const titles = (section: string): string[] =>
      all
        .filter(
          (t) => t.unitSection === section && !KEYS.includes(t.key as never),
        )
        .map((t) => `${t.rpmType} ${t.rpmTitle}`)
        .sort();
    expect(titles("원주각")).toEqual(
      [
        "01 원주각과 중심각의 크기 ⑴",
        "02 원주각과 중심각의 크기 ⑵",
        "03 원주각과 중심각의 크기 두 접선이 주어진 경우",
        "04 원주각의 성질",
        "05 반원에 대한 원주각의 크기",
        "06 원주각의 성질과 삼각비의 값",
        "07 원주각의 크기와 호의 길이⑴",
        "08 원주각의 크기와 호의 길이⑵",
        "09 원주각의 크기와 호의 길이⑶",
        "10 반원에 대한 원주각의 크기의 응용",
      ].sort(),
    );
    // 🔴 `09` 는 **두 현의 교점 각**이다 — 우리 `132X` 가 그 자리를 비켜 갔음을 지면으로 본다.
    const nine = generateMiddleProblem(
      "3-2|원주각|09",
      OVERLAP_SEED,
      0,
    ).content;
    expect(nine).toContain("두 현");
    expect(nine).toContain("\\angle APB");
    const mine = build(K132, OVERLAP_SEED, 0).content;
    expect(mine).not.toContain("두 현");
    expect(mine).not.toContain("\\angle APB");
    expect(mine).toContain("다섯 점");
  });

  it("🔴 5차a 넷끼리도 안 닮았다 — 같은 시험지에 실릴 수 있다", () => {
    const pages = KEYS.map((k) => build(k, OVERLAP_SEED));
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const j1 = jaccard(
          wordKey(pages[i]!.content),
          wordKey(pages[j]!.content),
        );
        expect(j1, `${KEYS[i]} ↔ ${KEYS[j]} ${j1.toFixed(3)}`).toBeLessThan(
          0.3,
        );
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 리드에게 넘기는 자리 — 판정기 축은 여기서 못 적는다
// ═══════════════════════════════════════════════════════════

describe("중3 5차a 확대 갈래 — 리드 몫임을 못 박는다", () => {
  it("🔴 판정기 `probe-middle-top-m3` 의 축에 이 넷이 **아직 없다** — 등록과 함께 리드가 적어야 한다", () => {
    // 이 시험이 초록인 동안은 판정기가 이 넷을 「축을 안 적었다」로 **빨갛게 찍는다**.
    // 그 파일은 다른 갈래도 함께 쓰는 공용이라 여기서 못 고친다(브리프 절대 규칙 1).
    for (const key of KEYS) expect(key).toMatch(/\|\d+X$/);
    // 그 판정기가 쓰는 열쇠 둘은 여기서도 그대로 부른다 — 두 벌이 되지 않게.
    expect(wordKey("두 수의 합을 구하시오.").size).toBeGreaterThan(0);
    expect(numberKey("$3$과 $4$", "$7$").size).toBe(3);
  });

  it("소품 함수의 눈금 — `divisorsOf`·`intSqrt` 가 «아니오»도 낸다", () => {
    expect(divisorsOf(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
    expect(intSqrt(324)).toBe(18);
    expect(intSqrt(323)).toBeNull();
    expect(firstTermFor(18, 3)).toBe(5);
    expect(firstTermFor(18, 2)).toBeNull();
  });
});
