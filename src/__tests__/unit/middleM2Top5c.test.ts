/**
 * 중2 **확대 갈래 5차 물결 `m2Top5c`**(`src/lib/middle/m2Top5c.ts`) — 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `109X` | 피타고라스 세쌍 **둘을 미리 골라** 다섯쌍을 만든다(제곱을 견주는 판정은 표를 만들 때 한 번만) | 세쌍을 **한 번도 안 쓴다** — 지면의 다섯 길이에서 두 개를 고를 때마다 $\sqrt{l_i^2+l_j^2}$ 를 **실제로 구해** 그 값이 목록에 있는 정수인지 본다(제곱을 견주는 대신 **근을 구한다**). 그렇게 나온 직각삼각형이 정확히 둘인지까지 이 훑기가 답한다 |
 * | `110X` | 「부피의 비는 **닮음비의 세제곱**의 비」로 조각의 몫을 만든다 | 그 규칙을 **안 쓴다** — 높이가 $k$ 이면 밑면의 반지름도 $k$ 에 비례하므로 작은 뿔의 부피는 $\dfrac13\pi k^2\cdot k$ 다. **뿔의 부피 공식**(중1)으로 $k$ 층까지의 부피를 직접 만들고 이웃한 둘의 **차**로 조각을 얻는다 |
 * | `111X` | $9(b-a)$ 항등식으로 후보를 만들고 창의 자리 번호로 살아남는 것을 정한다 | 항등식도 자리 번호도 **안 쓴다** — 두 자리 자연수 $10$ 부터 $99$ 까지를 **전부** 훑어 자리를 바꾼 수와의 차·두 부등식을 **하나씩 확인**하고 남은 것을 더한다 |
 * | `112X` | 부호 한 쌍에서 지나지 않는 사분면을 표로 정한다 | 표를 **안 쓴다** — $x$절편 $x_0$ 를 기준으로 $t=\tfrac12,\,2,\,-1$ 인 세 점 $(t x_0,\ b(1-t))$ 를 **실제로 만들어** 그 사분면을 읽는다(이 셋이 서로 다른 사분면을 주고 그것이 전부라는 것도 여기서 드러난다). 네 부호 조합을 다 대 보고 **정확히 하나**만 발문과 맞는지 확인한다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * ⚠️ 눈금 지면은 **문자열 픽스처**다. 엔진 산출물을 그때그때 불러 쓰면 엔진을 고치는
 *    순간 양성이 사라져 재현율을 영영 못 잰다(2026-08-23).
 *
 * ## ⑶ 앞 물결이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**(`36+64=100` 꼴)을 뽑아 좌·우를 각각 계산해 맞댄다.
 *   ㄴ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니다.
 *   ㄷ. **엄격 부등호에서 「자연수」 걸음** — `111X` 의 두 경계 줄(㉯).
 *   ㄹ. **해설의 «말»** — 굳힘을 진술하는 낱말을 뒤집으면 빨개진다(㉳).
 *   ㅁ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 700px 아래로 잠근다.
 *   ㅂ. **선언한 제약을 스스로 어기지 않는다**(㉴).
 *   ㅅ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 🔴 **공용 훑개의 「정수 경계 걸음」 축이 `111X` 를 못 본다.**
 *    `probe-middle-extending-tiers.boundStepFaults` 는 `$cx\le R$이다.` 꼴을 찾는데,
 *    우리 경계는 **엄격 부등호**($5x>161$)로 선다. 그래서 그 자에게 이 유형의
 *    「정수 경계 걸음 0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다. 그 축은 이 파일이
 *    따로 들고 있다(`strictBoundFault`). 리드가 공용 자에 엄격 부등호 판을 넣기로
 *    하면 그때 눈금 수가 바뀐다.
 * 2. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은
 *    재지만 설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로
 *    눈으로 읽었고, 그때 고친 자리(「$64$**이라** 하면」 → 「$64$**라** 하면」 ·
 *    「이 ${'${shape}'}**을**」의 받침 계산)를 아래 회귀 잠금에 남긴다.
 * 3. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 * 4. `112X` 의 검산은 사분면을 **세 점**으로 읽는다. 그 셋이 서로 다른 사분면을 준다는
 *    것은 $t\in(0,1)$·$t>1$·$t<0$ 이 $(x,y)$ 의 부호쌍을 셋으로 가른다는 데서 오고,
 *    검산기가 **그 셋이 정말 서로 다른지** 스스로 확인한다. 그러나 「네 번째 사분면을
 *    정말 안 지나는가」는 이 셋으로 **증명되지 않는다** — 한 직선이 지나는 사분면이
 *    셋뿐이라는 사실을 쓴 것이고, 그 사실 자체는 여기서 안 잰다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { createRng } from "@/lib/elementary/rng";
import { bareNumbers } from "@/lib/elementary/rules";
import { declaredUpperBound } from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "@/lib/middle/generate";
import {
  hasFinalConsonant,
  largestNaturalBelow,
  looksLikeShortcut,
  M2_TOP_5C,
  missingQuadrant,
  objectParticle,
  pieceShare,
  reduceFraction,
  rightTriangleArea,
  rightTriangleTriples,
  signsFromMissingQuadrant,
  smallestNaturalAbove,
  survivingNumbers,
  swapDiffNumbers,
  withParticle,
} from "@/lib/middle/m2Top5c";
import { tidySolution } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";
import { estimateSolutionPx } from "@/lib/printOverflow";

import { josaMismatches, pageSmells } from "../helpers/midPage";
import {
  catalogTypesOfMinor,
  extensionNumberReason,
  isCatalogType,
} from "../helpers/rpmCatalog";

/** 브리프가 요구한 최소 표본 200 을 넘긴다. */
const SAMPLE = 240;
/** 해설 높이·정답 쏠림은 **800판**으로 잰다(브리프의 600판 이상). */
const WIDE = 800;
const BASE_SEED = 20260905;
/** 🔴 쏠림은 **씨앗 블록 여럿**으로 잰다 — 한 블록만 보면 여유를 낙관적으로 적는다. */
const SEED_BLOCKS = [20260905, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260905, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 리드가 준 소단원별 변형 폭 하한. 이 수만큼 **서로 다른** 변형이 나와야 한다. */
const VARIANT_FLOOR: Record<string, number> = {
  "109X": 5,
  "110X": 11,
  "111X": 12,
  "112X": 12,
};

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5C.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E109 = entryOf("109X");
const E110 = entryOf("110X");
const E111 = entryOf("111X");
const E112 = entryOf("112X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "109X": "심화상",
  "110X": "심화중",
  "111X": "심화상",
  "112X": "심화중",
};

// ── 소품 ────────────────────────────────────────────────────

function rows(entry: TypeEntry, n = SAMPLE, base = BASE_SEED): MidProblem[] {
  const out: MidProblem[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(entry.handler(createRng(base + i * 7919)));
  }
  return out;
}

const registeredKeys = new Set(registeredTypes().map((e) => e.key));

/** 등록되기 전에는 빈 배열 — 그 사실을 검사가 스스로 찍는다. */
function productRows(entry: TypeEntry): MidProblem[] {
  if (!registeredKeys.has(entry.key)) return [];
  const out: MidProblem[] = [];
  for (const s of PRODUCT_SEEDS) {
    for (const v of PRODUCT_VARIANTS)
      out.push(generateMiddleProblem(entry.key, s, v));
  }
  return out;
}

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, text: string, who: string): string[] {
  const m = re.exec(text);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${text}`);
  return m.slice(1);
}

const num = (s: string | undefined): number => Number(s);

/** 답 문자열에서 `$` 만 걷어 낸 것 — 검산기가 이 꼴로 답을 다시 짓는다. */
function plainAnswer(answer: string): string {
  return answer.replace(/\$/g, "");
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
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 을/를·은/는·와/과·가만 본다. 그런데 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다.
 *
 * ⚠️ 규칙은 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 그러면 동어반복이라
 *    아무것도 안 지킨다. 여기 다시 적는다.
 */
function euroRoMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$[^$]*?(\d+)\$(으로|로)/g)) {
    const d = Number(m[1]) % 10;
    const want = d === 0 || d === 3 || d === 6 ? "으로" : "로";
    if (m[2] !== want) out.push(`$…${m[1]}$${m[2]} → ${want}`);
  }
  return out;
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 * 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로 렌더해서** 한다(2026-08-18).
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

// ── ㄱ. 해설의 **모든 산술 등식**을 뽑아 좌·우를 각각 계산한다 ──

/** `5\times6+2` 처럼 정수·`+`·`-`·`\times` 만으로 된 식의 값. */
function evalChain(src: string): number {
  const s = src.replace(/\\times/g, "*");
  const terms = s.match(/^-?\d+(?:\*\d+)*|[+-]\d+(?:\*\d+)*/g);
  if (terms === null) return NaN;
  let total = 0;
  for (const term of terms) {
    const factors = term.split("*");
    let v = Number(factors[0]);
    for (let k = 1; k < factors.length; k += 1) v *= Number(factors[k]);
    total += v;
  }
  return total;
}

const CHAIN_EQ =
  /(?<![\w}\\])(-?\d+(?:(?:\+|-|\\times)\d+)+)=(-?\d+)(?![\w\d])/g;

/** 해설에 적힌 산술 등식 가운데 **좌변과 우변이 다른** 것. */
function arithmeticFaults(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CHAIN_EQ)) {
    const left = evalChain(m[1]!);
    const right = Number(m[2]);
    if (!Number.isFinite(left) || left !== right)
      out.push(`${m[1]}=${m[2]} (좌변은 ${left})`);
  }
  return out;
}

/** 이 자가 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다. */
function arithmeticClaims(text: string): number {
  return [...text.matchAll(CHAIN_EQ)].length;
}

// ── ㄴ. 기약 ────────────────────────────────────────────────

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아니거나 분모가 $1$** 인 것. */
function badFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b === 1) out.push(`${a}/${b} (분모가 1)`);
    else if (gcd2(a, b) !== 1) out.push(`${a}/${b}`);
  }
  return out;
}

/** 이 자가 **몇 개를 봤는가**. */
function fractionCount(text: string): number {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].length;
}

// ── ㄷ. 엄격 부등호에서 「자연수」 걸음 (㉯) ────────────────

/**
 * 🔴 **엄격 부등호 판 «정수 경계 걸음»** — 공용 훑개가 못 보는 축(⑷ 1).
 *
 * `$cx>R$` 에서 `$x\ge B$` 로 뛸 때 $R/c$ 가 정수가 아니면 해설은 **그 분수와
 * 「$x$는 자연수」를 반드시 적어야** 한다. 안 적으면 쓴 대로 읽었을 때 **거짓 함의**다.
 */
function strictBoundFault(
  line: string,
  dir: "up" | "down",
): { fault: string | null; seen: boolean } {
  const claim =
    dir === "up"
      ? /\$(\d+)x>(\d+)\$/.exec(line)
      : /\$(\d+)x<(\d+)\$/.exec(line);
  if (claim === null) return { fault: null, seen: false };
  const c = num(claim[1]);
  const r = num(claim[2]);
  const finalRe = dir === "up" ? /\$x\\ge(\d+)\$/ : /\$x\\le(\d+)\$/;
  const fin = finalRe.exec(line);
  if (fin === null)
    return {
      fault: `정수 경계 「$x${dir === "up" ? "\\ge" : "\\le"}B$」가 없다`,
      seen: true,
    };
  const b = num(fin[1]);
  const exact = r / c;
  if (Number.isInteger(exact))
    return { fault: `경계 ${r}/${c} 가 정수라 동점이 난다`, seen: true };
  const want = dir === "up" ? Math.floor(exact) + 1 : Math.ceil(exact) - 1;
  if (want !== b)
    return {
      fault: `정수 경계를 ${b} 로 적었는데 ${r}/${c} 에서 참은 ${want}`,
      seen: true,
    };
  const [fn, fd] = reduceFraction(r, c);
  if (!line.includes(`\\dfrac{${fn}}{${fd}}`))
    return {
      fault: `참 경계 ${fn}/${fd} 를 안 적고 정수로 뛰었다`,
      seen: true,
    };
  if (!line.includes("$x$는 자연수이므로"))
    return {
      fault: "「$x$는 자연수」 걸음을 안 적고 정수로 뛰었다",
      seen: true,
    };
  return { fault: null, seen: true };
}

/** 해설에서 그 조각이 든 줄. 없으면 던진다 — 조용히 건너뛰면 분모 밖이 된다. */
function lineWith(solution: string, needle: string, who: string): string {
  const hit = solution.split("\n").find((l) => l.includes(needle));
  if (hit === undefined)
    throw new Error(`${who}: 「${needle}」가 든 줄이 없다 — ${solution}`);
  return hit;
}

/** `$...$` 안에 적힌 정수 전부 (부호 포함). */
function mathIntegers(text: string): number[] {
  const out: number[] = [];
  for (const span of text.matchAll(/\$([^$]*)\$/g)) {
    for (const n of span[1]!.matchAll(/-?\d+/g)) out.push(Number(n[0]));
  }
  return out;
}

// ── 109X 소품 — 제곱을 견주지 않고 **근을 구한다** ──────────

/**
 * 다섯 길이에서 직각삼각형이 되는 세쌍 전부. 두 길이의 제곱의 합의 **제곱근**을 실제로
 * 구해 그 값이 목록에 있는지 본다 — 제품이 하는 「제곱끼리 견주기」와 다른 길이다.
 */
function rightTriplesByRoot(lengths: readonly number[]): number[][] {
  const out: number[][] = [];
  const pool = new Set(lengths);
  for (let i = 0; i < lengths.length; i += 1) {
    for (let j = i + 1; j < lengths.length; j += 1) {
      const a = lengths[i]!;
      const b = lengths[j]!;
      const h = Math.sqrt(a * a + b * b);
      if (Number.isInteger(h) && pool.has(h)) {
        out.push([a, b, h].sort((x, y) => x - y));
      }
    }
  }
  return out;
}

// ── 110X 소품 — **뿔의 부피 공식**으로 다시 만든다 ──────────

/**
 * 높이를 $n$ 등분한 뿔에서 꼭짓점 쪽 $k$ 층까지의 부피 — 상수 $\dfrac13\pi$ 는 비를
 * 볼 때 사라지므로 **밑넓이 × 높이**만 남긴다. 밑면의 반지름(또는 한 변)이 높이에
 * 비례하므로 밑넓이는 $k^2$ 에, 부피는 $k^2\times k$ 에 비례한다.
 */
function coneStackVolume(k: number): number {
  return k * k * k;
}

/** $k$ 번째 **조각** — 이웃한 두 층의 차. */
function conePieceVolume(k: number): number {
  return coneStackVolume(k) - coneStackVolume(k - 1);
}

const ORDINAL_WORDS = ["첫째", "둘째", "셋째", "넷째", "다섯째"] as const;

function ordinalIndex(word: string): number {
  const i = ORDINAL_WORDS.indexOf(word as (typeof ORDINAL_WORDS)[number]);
  if (i < 0) throw new Error(`모르는 차례: ${word}`);
  return i + 1;
}

// ── 111X 소품 — 두 자리 수를 **전부 훑는다** ────────────────

/**
 * $10$ 부터 $99$ 까지를 전부 훑어 조건을 하나씩 확인한다. 항등식 $9(b-a)$ 도, 창의
 * 자리 번호도 안 쓴다.
 */
function survivorsByScan(
  d: number,
  swapIsLarger: boolean,
  m: number,
  low: number,
  high: number,
): { family: number[]; survivors: number[] } {
  const family: number[] = [];
  const survivors: number[] = [];
  for (let n = 10; n <= 99; n += 1) {
    const a = Math.floor(n / 10);
    const b = n % 10;
    if (b === 0) continue; // 자리를 바꾼 수도 두 자리 자연수여야 한다
    const swapped = 10 * b + a;
    const diff = swapIsLarger ? swapped - n : n - swapped;
    if (diff !== d) continue;
    family.push(n);
    if (m * n > low && m * n < high) survivors.push(n);
  }
  return { family, survivors };
}

// ── 112X 소품 — 사분면을 **점을 찍어** 읽는다 ────────────────

/** 분수 $\dfrac{n}{d}$ 의 부호 (분모는 $0$ 이 아니다). */
function signOf(n: number, d: number): number {
  const v = n / d;
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function quadrantOf(sx: number, sy: number): number {
  if (sx > 0 && sy > 0) return 1;
  if (sx < 0 && sy > 0) return 2;
  if (sx < 0 && sy < 0) return 3;
  if (sx > 0 && sy < 0) return 4;
  throw new Error("축 위의 점은 어느 사분면에도 없다");
}

/**
 * $y=ax+b$ ($a\ne0$, $b\ne0$)의 그래프가 지나는 사분면 — **표를 안 쓴다.**
 *
 * $x$절편을 $x_0=-\dfrac{b}{a}$ 라 하면 그래프 위의 점은 $t$ 를 써서
 * $(t x_0,\ b(1-t))$ 로 적을 수 있다. $t\in(0,1)$·$t>1$·$t<0$ 이 두 좌표의 부호쌍을
 * 셋으로 가르므로 $t=\tfrac12,\,2,\,-1$ 세 점이면 충분하다.
 * (그 셋이 정말 서로 다른 사분면을 주는지 여기서 확인한다 — 아니면 던진다.)
 */
function quadrantsPassed(a: number, b: number): number[] {
  if (a === 0 || b === 0) throw new Error("quadrantsPassed: 절편이 축 위다");
  const ts: [number, number][] = [
    [1, 2],
    [2, 1],
    [-1, 1],
  ];
  const hit = new Set<number>();
  for (const [tn, td] of ts) {
    // 점 $(t x_0,\ b(1-t))$ — 분모를 곱해 부호만 본다.
    const sx = signOf(tn * -b, td * a);
    const sy = signOf(b * (td - tn), td);
    hit.add(quadrantOf(sx, sy));
  }
  if (hit.size !== 3)
    throw new Error(
      `quadrantsPassed: 세 점이 사분면을 셋으로 안 가른다 (${a}, ${b})`,
    );
  return [...hit].sort((x, y) => x - y);
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  // 109X — 두 길이의 제곱의 합의 **제곱근**을 실제로 구해 목록에 있는지 본다.
  "109X": (content) => {
    const head = grab(
      /^길이가 각각 ((?:\$\d+\\,\\mathrm\{cm\}\$(?:, )?)+)인 막대가 한 개씩 있다\./,
      content,
      "109X 길이",
    )[0]!;
    const lengths = [...head.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) =>
      num(m[1]),
    );
    if (lengths.length !== 5) throw new Error("109X: 막대가 다섯 개가 아니다");
    if (new Set(lengths).size !== 5)
      throw new Error("109X: 길이가 같은 막대가 있다");
    grab(
      /이 다섯 개의 막대 가운데 세 개를 골라 삼각형을 만들 때 직각삼각형이 되는 경우가 여러 가지 있다\. 이때 만들 수 있는 직각삼각형들의 넓이의 합을 구하시오\.$/,
      content,
      "109X 물음",
    );
    const sorted = [...lengths].sort((x, y) => x - y);
    if (sorted.join(",") === lengths.join(","))
      throw new Error(
        "109X: 다섯 길이가 정렬된 채로 찍혔다 — 이웃한 셋이 답을 암시한다(㉵)",
      );
    const rights = rightTriplesByRoot(sorted);
    if (rights.length < 2)
      throw new Error(
        `109X: 직각삼각형이 ${rights.length}가지뿐이라 「여러 가지」가 성립하지 않는다`,
      );
    if (rights.length > 2)
      throw new Error("109X: 직각삼각형이 셋 이상이라 나열이 지면을 넘는다");
    const total = rights.reduce((s, t) => s + (t[0]! * t[1]!) / 2, 0);
    if (!Number.isInteger(total))
      throw new Error("109X: 넓이의 합이 정수가 아니다");
    // 🔴 지름길 — 지면 다섯 수의 한두 번 연산으로 답이 나오면 안 된다.
    if (looksLikeShortcut(total, sorted))
      throw new Error("109X: 지면 다섯 수의 한두 번 연산으로 답이 나온다");
    return `${total}\\,\\mathrm{cm}^2`;
  },

  // 110X — 「닮음비의 세제곱」 규칙을 안 쓰고 **뿔의 부피 공식**으로 다시 만든다.
  "110X": (content) => {
    const [shape, nT, given1, orderT] = grab(
      /^어떤 (원뿔|사각뿔|삼각뿔)의 높이를 \$(\d+)\$등분하는 (?:한|두|세|네|다섯) 점을 지나고 밑면에 평행한 (?:한|두|세|네|다섯) 평면으로 이 \1(을|를) 잘라 (?:두|세|네|다섯) 개의 입체로 나누었다\. 꼭짓점에 가까운 쪽부터 차례로 ([^ ]+(?:, [^ ]+)*) 입체라 할 때,/,
      content,
      "110X 머리",
    ) as [string, string, string, string];
    const n = num(nT);
    if (n < 3 || n > 5) throw new Error(`110X: ${n}등분은 이 갈래가 아니다`);
    // 낱말 뒤 조사는 받침으로 갈린다 — 「원뿔을」·「사각뿔을」.
    if (given1 !== (hasFinalConsonantLocal(shape) ? "을" : "를"))
      throw new Error(`110X: 「${shape}${given1}」 조사가 받침과 안 맞는다`);
    const order = orderT.split(", ");
    if (order.length !== n)
      throw new Error("110X: 차례 이름의 개수가 등분 수와 다르다");
    for (let k = 0; k < n; k += 1)
      if (ordinalIndex(order[k]!) !== k + 1)
        throw new Error("110X: 차례 이름이 순서대로가 아니다");
    const [iT, vT] = grab(
      /([^ ,]+) 입체의 부피가 \$(\d+)\\,\\mathrm\{cm\}\^3\$이다\./,
      content,
      "110X 주어진 조각",
    );
    const [jT] = grab(
      /([^ ,]+) 입체의 부피를 구하시오\.$/,
      content,
      "110X 묻는 조각",
    );
    const i = ordinalIndex(iT!);
    const j = ordinalIndex(jT!);
    if (i === j) throw new Error("110X: 주어진 조각과 묻는 조각이 같다");
    if (i > n || j > n) throw new Error("110X: 없는 조각을 가리킨다");
    // 🔴 **첫째 조각은 몫이 $1$ 이라 지면이 흉해진다** — 주어진 것이 첫째면 해설에
    //    「$14$를 $1$로 나누면 $14$」라는 아무 일도 안 하는 나눗셈이, 묻는 것이 첫째면
    //    마무리에 「$1\times18=18$」이라는 장식 곱셈이 남는다. 값도 KaTeX 도 멀쩡해서
    //    **눈으로 보고서야** 찾았다.
    if (i === 1 || j === 1)
      throw new Error("110X: 첫째 조각은 몫이 $1$ 이라 걸음이 장식이 된다");
    const given = num(vT);
    const pi = conePieceVolume(i);
    const pj = conePieceVolume(j);
    if (given % pi !== 0)
      throw new Error(
        "110X: 주어진 부피가 그 조각의 몫으로 나누어떨어지지 않는다",
      );
    const unit = given / pi;
    if (unit < 2)
      throw new Error(
        "110X: 비의 값 $1$ 에 해당하는 부피가 $1$ 이하라 걸음이 없어진다",
      );
    const want = pj * unit;
    if (looksLikeShortcut(want, [n, given]))
      throw new Error(
        "110X: 등분 수와 주어진 부피의 한두 번 연산으로 답이 나온다",
      );
    return `${want}\\,\\mathrm{cm}^3`;
  },

  // 111X — 두 자리 수 $10$~$99$ 를 **전부** 훑어 조건을 하나씩 확인한다.
  "111X": (content) => {
    const [dT, dirT] = grab(
      /^어떤 두 자리 자연수가 있다\. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 \$(\d+)\$만큼 (크다|작다)\./,
      content,
      "111X 자리 조건",
    );
    const [mT, c1T, c2T] = grab(
      /또 처음 수의 \$(\d+)\$배는 \$(\d+)\$보다 크고 \$(\d+)\$보다 작다\. 이러한 두 자리 자연수를 모두 구하고, 그 수들의 합을 구하시오\.$/,
      content,
      "111X 부등식",
    );
    const d = num(dT);
    const swapIsLarger = dirT === "크다";
    const m = num(mT);
    const low = num(c1T);
    const high = num(c2T);
    if (m < 2) throw new Error("111X: 배수가 $1$ 이면 자연수 걸음이 없어진다");
    if (low % m === 0 || high % m === 0)
      throw new Error("111X: 경계가 정수라 「자연수」 걸음이 없어진다");
    if (gcd2(low, m) !== 1 || gcd2(high, m) !== 1)
      throw new Error(
        "111X: 경계 분수가 기약이 아니라 지면에 약분 안 한 분수가 난다",
      );
    const { family, survivors } = survivorsByScan(
      d,
      swapIsLarger,
      m,
      low,
      high,
    );
    if (family.length < 4)
      throw new Error(`111X: 후보가 ${family.length}개뿐이라 견줄 것이 없다`);
    if (survivors.length < 2)
      throw new Error(
        `111X: 살아남는 수가 ${survivors.length}개뿐이라 「모두 구하고 합」이 무색하다`,
      );
    if (survivors.length > 4)
      throw new Error("111X: 살아남는 수가 다섯 이상이라 나열이 지면을 넘는다");
    if (survivors.length === family.length)
      throw new Error("111X: 두 부등식이 아무 후보도 안 자른다");
    if (survivors[0] === family[0])
      throw new Error("111X: 아래끝 부등식이 아무것도 안 자른다");
    if (survivors[survivors.length - 1] === family[family.length - 1])
      throw new Error("111X: 위끝 부등식이 아무것도 안 자른다");
    const total = survivors.reduce((s, v) => s + v, 0);
    if (looksLikeShortcut(total, [d, m, low, high]))
      throw new Error("111X: 지면 네 수의 한두 번 연산으로 답이 나온다");
    return `${total}`;
  },

  // 112X — 사분면을 **점을 찍어** 읽고, 네 부호 조합을 다 대 본다.
  "112X": (content) => {
    const [pT, qT] = grab(
      /두 상수 \$a\$, \$b\$에 대하여 \$\|a\|=(\d+)\$, \$\|b\|=(\d+)\$일 때, 이 그래프의 \$x\$절편과 \$y\$절편의 합을 구하시오\.$/,
      content,
      "112X 절댓값",
    );
    const head = grab(
      /^일차함수 \$y=ax\+b\$의 그래프가 ((?:제\$\d\$사분면(?:, )?)+)을 지난다\./,
      content,
      "112X 사분면",
    )[0]!;
    const given = [...head.matchAll(/제\$(\d)\$사분면/g)].map((m) => num(m[1]));
    if (given.length !== 3)
      throw new Error("112X: 지나는 사분면이 셋이 아니다");
    if (new Set(given).size !== 3)
      throw new Error("112X: 사분면이 겹쳐 적혔다");
    const p = num(pT);
    const q = num(qT);
    if (p < 2) throw new Error("112X: $|a|=1$ 이면 $x$절편이 분수가 아니다");
    if (gcd2(p, q) !== 1)
      throw new Error(
        "112X: $|a|$ 와 $|b|$ 가 서로소가 아니라 답의 분수가 기약이 아니다",
      );
    const wanted = [...given].sort((x, y) => x - y).join(",");
    const fits: [number, number][] = [];
    for (const a of [p, -p]) {
      for (const b of [q, -q]) {
        if (quadrantsPassed(a, b).join(",") === wanted) fits.push([a, b]);
      }
    }
    if (fits.length === 0) throw new Error("112X: 그런 그래프가 없다");
    if (fits.length > 1)
      throw new Error("112X: 부호가 하나로 안 굳는다 — 답이 정해지지 않는다");
    const [a, b] = fits[0]!;
    // $x$절편은 $ax+b=0$ 의 해, $y$절편은 $b$. 합 = $\dfrac{-b}{a}+b$.
    const [xn, xd] = reduceFraction(-b, a);
    if (xd === 1)
      throw new Error("112X: $x$절편이 정수라 지면에 분수가 안 나온다");
    const [sn, sd] = reduceFraction(xn + b * xd, xd);
    if (sd === 1)
      throw new Error("112X: 두 절편의 합이 정수라 이 갈래가 아니다");
    const value = sn / sd;
    const obvious = new Set<number>([
      q / p,
      -q / p,
      p / q,
      -p / q,
      q,
      -q,
      p,
      -p,
      p * q,
      -p * q,
      p + q,
      -(p + q),
      p - q,
      q - p,
    ]);
    if (obvious.has(value))
      throw new Error("112X: 지면 두 수의 한두 번 연산으로 답이 나온다");
    return sn < 0 ? `-\\dfrac{${-sn}}{${sd}}` : `\\dfrac{${sn}}{${sd}}`;
  },
};

/**
 * 낱말의 받침 — 검산기가 쓰는 판. **제품 함수를 안 부른다**(동어반복이면 아무것도
 * 안 지킨다). 한글 음절은 `0xAC00` 부터 28개씩 묶인다.
 */
function hasFinalConsonantLocal(word: string): boolean {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 !== 0;
}

/** `facts` 만으로 정답 문자열을 다시 짓는다 — 계약 ⑻.2 의 왕복 검사. */
function rebuildAnswer(rpmType: string, facts: Record<string, number>): string {
  if (rpmType === "109X") return `$${facts.x}\\,\\mathrm{cm}^2$`;
  if (rpmType === "110X") return `$${facts.x}\\,\\mathrm{cm}^3$`;
  if (rpmType === "111X") return `$${facts.x}$`;
  if (rpmType === "112X") {
    const n = facts.x!;
    return n < 0
      ? `$-\\dfrac{${-n}}{${facts.den}}$`
      : `$\\dfrac{${n}}{${facts.den}}$`;
  }
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/** 양성: 답을 아는 지면에서 그 답을 낸다. 손으로 풀어 확인한 값이다. */
const CALIBRATION: ReadonlyArray<readonly [string, string, string]> = [
  [
    // $\{6,8,10,15,17\}$ — $6^2+8^2=10^2$, $8^2+15^2=17^2$. 넓이 $24+60=84$.
    "109X",
    "길이가 각각 $15\\,\\mathrm{cm}$, $6\\,\\mathrm{cm}$, $17\\,\\mathrm{cm}$, $10\\,\\mathrm{cm}$, $8\\,\\mathrm{cm}$인 막대가 한 개씩 있다. 이 다섯 개의 막대 가운데 세 개를 골라 삼각형을 만들 때 직각삼각형이 되는 경우가 여러 가지 있다. 이때 만들 수 있는 직각삼각형들의 넓이의 합을 구하시오.",
    "84\\,\\mathrm{cm}^2",
  ],
  [
    // $4$등분 — 조각의 몫은 $1,7,19,37$. 둘째가 $21$ 이면 단위는 $3$, 넷째는 $111$.
    "110X",
    "어떤 원뿔의 높이를 $4$등분하는 세 점을 지나고 밑면에 평행한 세 평면으로 이 원뿔을 잘라 네 개의 입체로 나누었다. 꼭짓점에 가까운 쪽부터 차례로 첫째, 둘째, 셋째, 넷째 입체라 할 때, 둘째 입체의 부피가 $21\\,\\mathrm{cm}^3$이다. 넷째 입체의 부피를 구하시오.",
    "111\\,\\mathrm{cm}^3",
  ],
  [
    // 후보 $14,25,36,47,58,69$. $3x>118 \Rightarrow x\ge40$, $3x<190 \Rightarrow x\le63$.
    "111X",
    "어떤 두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $27$만큼 크다. 또 처음 수의 $3$배는 $118$보다 크고 $190$보다 작다. 이러한 두 자리 자연수를 모두 구하고, 그 수들의 합을 구하시오.",
    "105",
  ],
  [
    // 제1,2,3사분면 → $a>0$, $b>0$ → $a=3$, $b=5$. $-\frac53+5=\frac{10}3$.
    "112X",
    "일차함수 $y=ax+b$의 그래프가 제$1$사분면, 제$2$사분면, 제$3$사분면을 지난다. 두 상수 $a$, $b$에 대하여 $|a|=3$, $|b|=5$일 때, 이 그래프의 $x$절편과 $y$절편의 합을 구하시오.",
    "\\dfrac{10}{3}",
  ],
  [
    // 부호를 뒤집은 판 — 제2,3,4사분면 → $a<0$, $b<0$ → $a=-3$, $b=-5$.
    // $x$절편 $-\frac53$, $y$절편 $-5$ → 합 $-\frac{20}{3}$.
    "112X",
    "일차함수 $y=ax+b$의 그래프가 제$2$사분면, 제$3$사분면, 제$4$사분면을 지난다. 두 상수 $a$, $b$에 대하여 $|a|=3$, $|b|=5$일 때, 이 그래프의 $x$절편과 $y$절편의 합을 구하시오.",
    "-\\dfrac{20}{3}",
  ],
];

/**
 * 음성: 불변식을 어긴 지면은 **던진다**. 없으면 「0」이 «깨끗»인지 «못 셈»인지 안 갈린다.
 *
 * ⚠️ 눈금은 **자기 축을 홀로 갈라야** 한다 — 다른 불변식에도 걸리면 재려던 검사를
 *    지워도 그쪽이 대신 물어 「가드다」가 거짓이 된다(4차 물결이 여덟 번 물린 자리).
 *    아래 지면은 하나씩 **그 축만** 걸리게 골랐다.
 */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    // $\{3,4,5,6,8\}$ — $3^2+4^2=5^2$ 하나뿐이다(「여러 가지」가 거짓).
    "109X",
    "길이가 각각 $8\\,\\mathrm{cm}$, $3\\,\\mathrm{cm}$, $6\\,\\mathrm{cm}$, $5\\,\\mathrm{cm}$, $4\\,\\mathrm{cm}$인 막대가 한 개씩 있다. 이 다섯 개의 막대 가운데 세 개를 골라 삼각형을 만들 때 직각삼각형이 되는 경우가 여러 가지 있다. 이때 만들 수 있는 직각삼각형들의 넓이의 합을 구하시오.",
    "직각삼각형이 한 가지뿐이라 「여러 가지」가 거짓이다",
  ],
  [
    // $\{3,4,5,12,13\}$ — 넓이의 합 $6+30=36$ 인데 $3\times12=36$ 이다.
    "109X",
    "길이가 각각 $13\\,\\mathrm{cm}$, $3\\,\\mathrm{cm}$, $12\\,\\mathrm{cm}$, $5\\,\\mathrm{cm}$, $4\\,\\mathrm{cm}$인 막대가 한 개씩 있다. 이 다섯 개의 막대 가운데 세 개를 골라 삼각형을 만들 때 직각삼각형이 되는 경우가 여러 가지 있다. 이때 만들 수 있는 직각삼각형들의 넓이의 합을 구하시오.",
    "넓이의 합 $36$ 이 $3\\times12$ 라 지면 두 수를 곱하면 답이 나온다",
  ],
  [
    // 정렬된 채로 찍혔다 — 이웃한 셋이 답을 암시한다(㉵).
    "109X",
    "길이가 각각 $6\\,\\mathrm{cm}$, $8\\,\\mathrm{cm}$, $10\\,\\mathrm{cm}$, $15\\,\\mathrm{cm}$, $17\\,\\mathrm{cm}$인 막대가 한 개씩 있다. 이 다섯 개의 막대 가운데 세 개를 골라 삼각형을 만들 때 직각삼각형이 되는 경우가 여러 가지 있다. 이때 만들 수 있는 직각삼각형들의 넓이의 합을 구하시오.",
    "다섯 길이가 정렬된 채로 찍혔다 (㉵)",
  ],
  [
    // 낱말 뒤 조사가 받침과 안 맞는다 — 「원뿔를」.
    "110X",
    "어떤 원뿔의 높이를 $4$등분하는 세 점을 지나고 밑면에 평행한 세 평면으로 이 원뿔를 잘라 네 개의 입체로 나누었다. 꼭짓점에 가까운 쪽부터 차례로 첫째, 둘째, 셋째, 넷째 입체라 할 때, 둘째 입체의 부피가 $21\\,\\mathrm{cm}^3$이다. 넷째 입체의 부피를 구하시오.",
    "「원뿔를」 — 받침이 있는 낱말 뒤에 「를」을 붙였다",
  ],
  [
    // 둘째 조각의 몫은 $7$ 인데 주어진 부피가 $20$ 이라 나누어떨어지지 않는다.
    "110X",
    "어떤 원뿔의 높이를 $4$등분하는 세 점을 지나고 밑면에 평행한 세 평면으로 이 원뿔을 잘라 네 개의 입체로 나누었다. 꼭짓점에 가까운 쪽부터 차례로 첫째, 둘째, 셋째, 넷째 입체라 할 때, 둘째 입체의 부피가 $20\\,\\mathrm{cm}^3$이다. 넷째 입체의 부피를 구하시오.",
    "$20$ 이 둘째 조각의 몫 $7$ 로 나누어떨어지지 않는다",
  ],
  [
    // 비의 값 $1$ 에 해당하는 부피가 $1$ 이라 「몇 배인가」 걸음이 없어진다.
    // ⚠️ 첫판은 **첫째 입체**를 줬는데, 그러면 아래 「첫째 조각」 눈금에도 걸려
    //    두 축이 서로를 가린다. 둘째 입체($A_2=7$)에 $7$ 을 줘서 **이 축만** 걸리게 했다.
    "110X",
    "어떤 원뿔의 높이를 $3$등분하는 두 점을 지나고 밑면에 평행한 두 평면으로 이 원뿔을 잘라 세 개의 입체로 나누었다. 꼭짓점에 가까운 쪽부터 차례로 첫째, 둘째, 셋째 입체라 할 때, 둘째 입체의 부피가 $7\\,\\mathrm{cm}^3$이다. 셋째 입체의 부피를 구하시오.",
    "비의 값 $1$ 에 해당하는 부피가 $1$ 이라 「몇 배인가」 걸음이 없어진다",
  ],
  [
    // 🔴 **첫째 조각**은 몫이 $1$ 이라 해설의 걸음이 장식이 된다 — 눈으로 찾은 결함.
    //    $4$등분·첫째 $5$ → 셋째 $95$. 나누어떨어짐·단위·지름길은 다 통과하고
    //    **이 축만** 걸린다.
    "110X",
    "어떤 원뿔의 높이를 $4$등분하는 세 점을 지나고 밑면에 평행한 세 평면으로 이 원뿔을 잘라 네 개의 입체로 나누었다. 꼭짓점에 가까운 쪽부터 차례로 첫째, 둘째, 셋째, 넷째 입체라 할 때, 첫째 입체의 부피가 $5\\,\\mathrm{cm}^3$이다. 셋째 입체의 부피를 구하시오.",
    "첫째 조각은 몫이 $1$ 이라 「나누면」·「곱하면」 걸음이 아무 일도 안 한다",
  ],
  [
    // $3x>120$ 은 경계가 정수라 $x>40$ 에서 동점이 나고 자연수 걸음이 없어진다(㉯).
    "111X",
    "어떤 두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $27$만큼 크다. 또 처음 수의 $3$배는 $120$보다 크고 $190$보다 작다. 이러한 두 자리 자연수를 모두 구하고, 그 수들의 합을 구하시오.",
    "경계 $120/3$ 이 정수라 「자연수」 걸음이 없어진다 (㉯)",
  ],
  [
    // 위끝이 아무것도 안 자른다 — $3x<250$ 이면 $x\le83$ 이라 $69$ 까지 다 산다.
    "111X",
    "어떤 두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $27$만큼 크다. 또 처음 수의 $3$배는 $118$보다 크고 $250$보다 작다. 이러한 두 자리 자연수를 모두 구하고, 그 수들의 합을 구하시오.",
    "위끝 부등식이 아무 후보도 안 자른다",
  ],
  [
    // 경계 $184/4$ 는 정수는 아니지만 $\gcd(184,4)=4$ 라 지면 분수가 기약이 아니다(㉰).
    "111X",
    "어떤 두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 바꾼 수는 처음 수보다 $27$만큼 크다. 또 처음 수의 $4$배는 $158$보다 크고 $250$보다 작다. 이러한 두 자리 자연수를 모두 구하고, 그 수들의 합을 구하시오.",
    "경계 분수 $\\dfrac{158}{4}$ 가 기약이 아니다 (㉰)",
  ],
  [
    // $|a|=|b|=6$ 이면 $x$절편이 정수라 지면에 분수가 안 나온다.
    "112X",
    "일차함수 $y=ax+b$의 그래프가 제$1$사분면, 제$2$사분면, 제$3$사분면을 지난다. 두 상수 $a$, $b$에 대하여 $|a|=6$, $|b|=6$일 때, 이 그래프의 $x$절편과 $y$절편의 합을 구하시오.",
    "$|a|$ 와 $|b|$ 가 서로소가 아니다",
  ],
  [
    // 제1,2,4사분면 → $a<0$, $b>0$ → $a=-2$, $b=1$. 합 $= \frac12+1=\frac32$.
    // 그런데 $p-q=1$ 이 아니라… $\frac32$ 는 뻔한 값 목록에 없다. 대신 $|a|=2$,
    // $|b|=3$ 으로 잡으면 합 $=\frac32+3=\frac92$ 다. 여기서는 **지나는 사분면이
    // 넷**이라 「셋이 아니다」로 걸리는 지면을 쓴다.
    "112X",
    "일차함수 $y=ax+b$의 그래프가 제$1$사분면, 제$2$사분면, 제$3$사분면, 제$4$사분면을 지난다. 두 상수 $a$, $b$에 대하여 $|a|=3$, $|b|=5$일 때, 이 그래프의 $x$절편과 $y$절편의 합을 구하시오.",
    "지나는 사분면이 넷이라 그런 일차함수가 없다",
  ],
  [
    // $|a|=2$, $|b|=2$ 는 서로소가 아니지만, 그 앞에 **부호가 하나로 안 굳는** 판을
    // 따로 둔다: 제1,3사분면만으로는 부호가 안 정해진다 → 「셋이 아니다」로 걸린다.
    // 그래서 여기서는 **지름길**만 홀로 걸리는 지면을 쓴다.
    // 제$1$,$3$,$4$사분면 → $a>0$, $b<0$ → $a=2$, $b=-3$.
    // $x$절편 $\frac32$, $y$절편 $-3$ → 합 $-\frac32$ … 이는 $-q/p$ 가 아니라
    // $-p/q\cdot\frac94$… 실제로는 $-\dfrac{3}{2}=-\dfrac{q}{p}$ 라 지름길이다.
    "112X",
    "일차함수 $y=ax+b$의 그래프가 제$1$사분면, 제$3$사분면, 제$4$사분면을 지난다. 두 상수 $a$, $b$에 대하여 $|a|=2$, $|b|=3$일 때, 이 그래프의 $x$절편과 $y$절편의 합을 구하시오.",
    "합이 $-\\dfrac{3}{2}$ 라 지면 두 수를 나눈 값 그대로다",
  ],
];

describe("중2 5차c 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });

  it("🔴 눈금이 네 유형을 **모두** 덮는다 — 안 덮인 유형의 «0» 은 못 셈이다", () => {
    for (const t of ["109X", "110X", "111X", "112X"]) {
      expect(
        CALIBRATION.filter(([k]) => k === t).length,
        `${t} 양성 눈금`,
      ).toBeGreaterThan(0);
      expect(
        REJECTS.filter(([k]) => k === t).length,
        `${t} 음성 눈금`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("중2 5차c 확대 갈래 — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5C.length).toBe(4);
    expect(M2_TOP_5C.map((e) => e.rpmType)).toEqual([
      "109X",
      "110X",
      "111X",
      "112X",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5C) {
      expect(isCatalogType(e), `${e.key} 는 색인에 없어야 한다`).toBe(false);
      expect(extensionNumberReason(e), e.key).toBeNull();
      expect(
        e.rpmType.endsWith("X"),
        `${e.key} 는 5차 물결 접미사여야 한다`,
      ).toBe(true);
    }
  });

  it("🔴 소단원·중단원 이름을 **정본에 대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_5C) {
      expect(e.grade).toBe("중2");
      expect(["2-1", "2-2"]).toContain(e.rpmBook);
      expect(
        sections.has(e.unitSection),
        `${e.key} 의 소단원 «${e.unitSection}» 가 단원 정본에 없다`,
      ).toBe(true);
      expect(
        catalogTypesOfMinor(e.rpmBook, e.rpmMinor).length,
        `${e.key} 의 중단원 «${e.rpmMinor}» 가 색인에 없다`,
      ).toBeGreaterThan(0);
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
    }
  });

  it("🔴 `112X` 의 중단원 이름에 **가는 공백 U+2009** 가 실제로 들어 있다", () => {
    expect(E112.rpmMinor.includes("\u2009")).toBe(true);
    expect(E112.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑵");
  });

  it("네 유형이 어느 소단원에 붙는지 못 박는다", () => {
    expect(
      M2_TOP_5C.map((e) => [e.rpmType, e.rpmBook, e.rpmMinor, e.unitSection]),
    ).toEqual([
      ["109X", "2-2", "피타고라스 정리", "피타고라스 정리의 활용"],
      ["110X", "2-2", "도형의 닮음", "닮은 도형의 넓이의 비와 부피의 비"],
      ["111X", "2-1", "일차부등식의 활용", "일차부등식의 활용(수, 평균, 정가)"],
      [
        "112X",
        "2-1",
        "일차함수와 그 그래프\u2009 ⑵",
        "일차함수의 그래프의 성질",
      ],
    ]);
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_5C) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !M2_TOP_5C.includes(t),
      );
      for (const t of others) {
        const tier = generateMiddleProblem(t.key, BASE_SEED, 0).difficulty;
        expect(
          tier === "심화중" || tier === "심화상",
          `${t.key} 가 이미 확대 갈래다 — ${e.unitSection} 은 빈 소단원이 아니다`,
        ).toBe(false);
      }
    }
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    const foreign = registeredTypes().filter((e) => !M2_TOP_5C.includes(e));
    for (const e of M2_TOP_5C) {
      expect(
        foreign.some((f) => f.key === e.key),
        `${e.key} 가 남의 모듈과 겹친다`,
      ).toBe(false);
    }
  });

  it("🔴 제품 후처리가 이 넷에 대해 **항등**이다 — 그래서 이 시험의 지면이 제품의 지면이다", () => {
    // 🔴 이 시험은 `entry.handler` 를 직접 부른다(등록 전이라 그 길밖에 없다).
    //    그런데 제품은 그 뒤에 `tidySolution`·`wrapDanClause`·보기 검사를 얹는다.
    //    그 셋이 **아무것도 안 바꿔야** 여기서 잰 지면이 종이의 지면과 같다
    //    (2026-08-18 「자에 넣는 입력이 조판과 다르면 놓침이 된다」와 같은 자리).
    for (const e of M2_TOP_5C) {
      for (const p of rows(e, 60)) {
        expect(tidySolution(p.solution), `${e.rpmType} 되풀이 다듬기`).toBe(
          p.solution,
        );
        expect(wrapDanClause(p.content), `${e.rpmType} 「단, …」 괄호`).toBe(
          p.content,
        );
        expect(() =>
          assertChooseAllAnswerCount(p.content, p.answer, e.key),
        ).not.toThrow();
        expect(() => assertChoiceCount(p.content, e.key)).not.toThrow();
        expect(() => assertChoiceMarks(p.content, e.key)).not.toThrow();
      }
    }
  });

  it("🔴 갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5C) {
      for (const p of rows(e, 60)) {
        expect(p.difficulty, e.key).toBe(EXPECTED_TIER[e.rpmType]);
        // 🔴 제품 함수를 **그대로 부른다** — 규칙을 여기 옮겨 적지 않는다(D-106).
        expect(
          resolveMiddleTier(p.difficulty, p.content, !!p.figureSpec),
          e.key,
        ).toBe(EXPECTED_TIER[e.rpmType]);
      }
    }
    expect(new Set(Object.values(EXPECTED_TIER))).toEqual(
      new Set(["심화중", "심화상"]),
    );
  });
});

describe("중2 5차c 확대 갈래 — 지면과 값", () => {
  for (const e of M2_TOP_5C) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      // ⚠️ 표본은 **`it` 안에서** 만든다. `describe` 몸통에서 만들면 생성기가 던졌을 때
      //    **수집 단계가 죽어** 어느 검사가 물었는지를 못 대게 된다(2026-08-23).
      let cached: MidProblem[] | null = null;
      const sample = (): MidProblem[] => (cached ??= rows(e));

      it(`지면을 다시 풀면 같은 답이 나온다 (표본 ${SAMPLE})`, () => {
        for (const p of sample()) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
        }
      });

      it("`facts` 로 정답 문자열을 다시 지을 수 있다", () => {
        for (const p of sample()) {
          expect(rebuildAnswer(e.rpmType, p.facts), p.content).toBe(p.answer);
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·(으)로·맨 숫자·그림 지시·상한 선언", () => {
        let judged = 0;
        for (const p of sample()) {
          for (const text of [p.content, p.answer, p.solution]) {
            expect(brokenRender(text), `${e.rpmType} 렌더: ${text}`).toBe(
              false,
            );
            expect(pageSmells(text), `${e.rpmType} 냄새: ${text}`).toEqual([]);
            expect(josaMismatches(text), `${e.rpmType} 조사: ${text}`).toEqual(
              [],
            );
            expect(
              euroRoMismatches(text),
              `${e.rpmType} (으)로: ${text}`,
            ).toEqual([]);
            expect(bareNumbers(text), `${e.rpmType} 맨 숫자: ${text}`).toEqual(
              [],
            );
            judged += (text.match(/\$[^$]*\$(을|를|은|는|와|과|가)/g) ?? [])
              .length;
          }
          expect(p.figureSpec ?? null, e.rpmType).toBe(null);
          expect(pointsAtFigure(p.content), e.rpmType).toBeNull();
          // ㉱ 발문이 스스로 상한을 못 박으면 파생 오답이 그것을 넘는다.
          expect(declaredUpperBound(p.content), e.rpmType).toBeNull();
        }
        // 🔴 **조사 자가 이 유형에서 구조적으로 0 이 아닌지** — 「0 건」은 «깨끗»과
        //    «못 셈»을 안 가른다. 문항마다 적어도 하나는 봐야 한다.
        expect(judged, `${e.rpmType} 조사 판정 후보`).toBeGreaterThanOrEqual(
          SAMPLE,
        );
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.solution).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // `112X` 는 해설의 산술이 **분수 꼴**이라 이 자가 못 본다 — 그 유형의 중간값은
        // 아래 「해설의 중간값」 검사가 분수로 따로 잰다. 0 이 «깨끗»이 아님을 못 박는다.
        if (e.rpmType === "112X") expect(claims).toBe(0);
        else
          expect(claims, `${e.rpmType} 산술 등식`).toBeGreaterThanOrEqual(
            SAMPLE,
          );
      });

      it("🔴 지면의 모든 분수가 기약이고 분모가 $1$ 이 아니다 (그리고 몇 개를 봤는지 센다)", () => {
        let seen = 0;
        for (const p of sample()) {
          for (const text of [p.content, p.answer, p.solution]) {
            expect(badFractions(text), `${e.rpmType}: ${text}`).toEqual([]);
            seen += fractionCount(text);
          }
        }
        // 🔴 **0 이 «깨끗»인지 «잴 것이 없다»인지 유형마다 적어 둔다.**
        //  · `110X` 는 분수를 아예 안 쓴다 — 잴 것이 없다.
        //  · `109X` 는 넓이 줄에 `\dfrac{6\times8}{2}` 를 쓰는데, 분자가 **곱**이라
        //    이 자(분자·분모가 둘 다 숫자인 것만 본다)가 **구조적으로 못 본다.**
        //    그 줄은 아래 「중간값」 검사가 **글자 그대로** 잠근다.
        if (e.rpmType === "110X" || e.rpmType === "109X") expect(seen).toBe(0);
        else expect(seen, `${e.rpmType} 분수`).toBeGreaterThanOrEqual(SAMPLE);
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑹)", () => {
        for (const p of sample()) {
          const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
          expect(lines.length, `${e.rpmType} 해설 줄`).toBeGreaterThanOrEqual(
            7,
          );
          expect(
            p.solution.length,
            `${e.rpmType} 해설이 너무 짧다`,
          ).toBeGreaterThan(200);
          const conclusion = lines.findIndex((l) => l.startsWith("따라서"));
          expect(
            conclusion,
            `${e.rpmType} 「따라서」 결론 줄이 없다`,
          ).toBeGreaterThan(0);
          expect(
            lines.length - conclusion,
            `${e.rpmType} 결론이 너무 앞에 있다`,
          ).toBeLessThanOrEqual(2);
          const middle = lines.slice(1, conclusion).join("\n");
          expect(middle, `${e.rpmType} 중간 결과가 없다`).toMatch(/\$/);
          expect(
            middle.split("\n").length,
            `${e.rpmType} 중간 걸음이 모자라다`,
          ).toBeGreaterThanOrEqual(4);
        }
      });

      it(`🔴 해설이 정답지 한 단을 안 넘는다 — ${WIDE}판에서 최대 700px 미만`, () => {
        let worst = 0;
        let where = "";
        for (const p of rows(e, WIDE)) {
          const px = estimateSolutionPx(p.solution);
          if (px > worst) {
            worst = px;
            where = p.content;
          }
        }
        expect(worst, `${e.rpmType} 가장 큰 해설 — ${where}`).toBeLessThan(700);
        // 자가 살아 있는가 — 억지로 부풀린 해설은 넘는다고 답한다.
        const huge = Array.from({ length: 80 }, (_v, i) => `${i}단계.`).join(
          "\n",
        );
        expect(estimateSolutionPx(huge)).toBeGreaterThan(700);
      });

      it(`🔴 정답 쏠림 — 씨앗 블록 ${SEED_BLOCKS.length}개 × ${WIDE}판에서 모두 12% 미만`, () => {
        for (const base of SEED_BLOCKS) {
          const wide = rows(e, WIDE, base);
          const answers = new Map<string, number>();
          for (const p of wide)
            answers.set(p.answer, (answers.get(p.answer) ?? 0) + 1);
          const top = Math.max(...answers.values()) / wide.length;
          expect(
            top,
            `${e.rpmType} 씨앗 ${base} 최빈 정답 비율 (정답 ${answers.size}가지)`,
          ).toBeLessThan(0.12);
          expect(
            answers.size,
            `${e.rpmType} 씨앗 ${base} 서로 다른 정답`,
          ).toBeGreaterThan(15);
        }
      });

      it("🔴 변형 폭 — 같은 씨앗에서 리드가 준 하한만큼 서로 다른 변형이 나온다", () => {
        const floor = VARIANT_FLOOR[e.rpmType]!;
        const seen = new Set<string>();
        for (let v = 0; v < floor; v += 1) {
          // 제품 `generateMiddleProblem` 과 **같은 방식**으로 변형을 가른다.
          seen.add(e.handler(createRng(BASE_SEED + v * 0x9e37)).content);
        }
        expect(seen.size, `${e.rpmType} 변형 폭(하한 ${floor})`).toBe(floor);
      });

      it("등록되면 진짜 파이프라인으로도 같은 계약을 지킨다", () => {
        const produced = productRows(e);
        if (produced.length === 0) {
          // 🟡 아직 리드가 `generate.ts` 에 안 넣었다. 「검사가 돌았다」와
          //    「검사가 볼 것이 없었다」를 가르려고 그 사실을 여기 적어 둔다.
          expect(registeredKeys.has(e.key)).toBe(false);
          return;
        }
        for (const p of produced) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
          expect(p.difficulty).toBe(EXPECTED_TIER[e.rpmType]);
          expect(pageSmells(p.solution)).toEqual([]);
        }
        expect(
          new Set(
            generateMiddleSet(e.key, BASE_SEED, VARIANT_FLOOR[e.rpmType]!).map(
              (p) => p.content,
            ),
          ).size,
        ).toBe(VARIANT_FLOOR[e.rpmType]!);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값**과 **말** — 앞 물결의 치명 결함이 난 자리
// ═══════════════════════════════════════════════════════════

describe("중2 5차c 확대 갈래 — 🔴 해설의 중간값을 다른 길로 다시 잰다", () => {
  it("`109X` — 제곱 목록 ↔ 열 짝의 합 ↔ 살아남는 둘 ↔ 넓이를 **넷 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E109, 120)) {
      const lengths = [
        ...p.content.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g),
      ].map((m) => num(m[1]));
      const sorted = [...lengths].sort((x, y) => x - y);
      const squares = sorted.map((v) => v * v);
      const squareLine = lineWith(p.solution, "각각을 제곱하면", "109X");
      for (const s of squares)
        expect(squareLine, `109X 제곱 ${s}`).toContain(`$${s}$`);
      // 열 짝의 합이 **전부** 적혔는가 — 하나라도 빠지면 「다 세워 견주었다」가 거짓이다.
      const pairLine = lineWith(
        p.solution,
        "두 개를 고르는 방법은 열 가지",
        "109X",
      );
      let pairCount = 0;
      for (let i = 0; i < 5; i += 1)
        for (let j = i + 1; j < 5; j += 1) {
          expect(pairLine, `109X 짝 ${squares[i]}+${squares[j]}`).toContain(
            `$${squares[i]}+${squares[j]}=${squares[i]! + squares[j]!}$`,
          );
          pairCount += 1;
        }
      expect(pairCount).toBe(10);
      // 살아남는 둘 ↔ 넓이 ↔ 합
      const rights = rightTriplesByRoot(sorted);
      expect(rights.length).toBe(2);
      const areas = rights.map((t) => (t[0]! * t[1]!) / 2);
      const areaLine = lineWith(p.solution, "그 넓이는 각각", "109X");
      for (let k = 0; k < 2; k += 1) {
        const t = rights[k]!;
        expect(areaLine).toContain(
          `$\\dfrac{${t[0]}\\times${t[1]}}{2}=${areas[k]}\\,(\\mathrm{cm}^2)$`,
        );
      }
      const sumLine = lineWith(p.solution, "넓이의 합은", "109X");
      expect(sumLine).toContain(
        `$${areas[0]}+${areas[1]}=${areas[0]! + areas[1]!}\\,(\\mathrm{cm}^2)$`,
      );
      expect(p.answer).toBe(`$${areas[0]! + areas[1]!}\\,\\mathrm{cm}^2$`);
      checked += 1;
    }
    expect(checked).toBe(120);
  });

  it("`110X` — 층의 부피 ↔ 조각의 부피 ↔ 비 ↔ 단위 ↔ 전체 확인을 **다섯 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E110, 120)) {
      const n = num(grab(/높이를 \$(\d+)\$등분/, p.content, "110X")[0]);
      const given = num(
        grab(
          /입체의 부피가 \$(\d+)\\,\\mathrm\{cm\}\^3\$이다/,
          p.content,
          "110X",
        )[0],
      );
      const i = ordinalIndex(
        grab(/([^ ,]+) 입체의 부피가 \$/, p.content, "110X")[0]!,
      );
      const j = ordinalIndex(
        grab(/([^ ,]+) 입체의 부피를 구하시오/, p.content, "110X")[0]!,
      );
      const cubeLine = lineWith(p.solution, "차례로", "110X");
      for (let k = 1; k <= n; k += 1)
        expect(cubeLine, `110X 층 ${k}`).toContain(`$${coneStackVolume(k)}$`);
      const pieceLine = lineWith(
        p.solution,
        "이웃한 두 작은 뿔의 부피의 차",
        "110X",
      );
      for (let k = 2; k <= n; k += 1)
        expect(pieceLine, `110X 조각 ${k}`).toContain(
          `$${coneStackVolume(k)}-${coneStackVolume(k - 1)}=${conePieceVolume(k)}$`,
        );
      // ⚠️ 「의 비는 $」로 찾으면 **닮음비 줄**($k^3:5^3$)이 먼저 걸린다 — 조각의 몫이
      //    아니라 문자 식이라 검사가 통째로 헛돈다. 그 줄에만 있는 조각을 쓴다.
      const ratioLine = lineWith(p.solution, "입체의 부피 $", "110X");
      expect(ratioLine).toContain(
        `$${conePieceVolume(i)}:${conePieceVolume(j)}$`,
      );
      const unit = given / conePieceVolume(i);
      expect(Number.isInteger(unit)).toBe(true);
      const unitLine = lineWith(p.solution, "나누면", "110X");
      expect(unitLine).toContain(`$${given}$`);
      expect(unitLine).toContain(`$${conePieceVolume(i)}$`);
      expect(unitLine).toContain(`$${unit}$`);
      const lastLine = lineWith(p.solution, "실제로", "110X");
      const volumes = Array.from(
        { length: n },
        (_v, k) => conePieceVolume(k + 1) * unit,
      );
      expect(lastLine).toContain(
        `$${volumes.join("+")}=${n ** 3 * unit}\\,(\\mathrm{cm}^3)$`,
      );
      expect(p.answer).toBe(`$${conePieceVolume(j) * unit}\\,\\mathrm{cm}^3$`);
      checked += 1;
    }
    expect(checked).toBe(120);
  });

  it("`111X` — 후보 나열 ↔ 두 경계 ↔ 살아남는 수 ↔ 버리는 수 ↔ 합을 **다섯 다** 맞댄다", () => {
    let bounds = 0;
    for (const p of rows(E111, 120)) {
      const d = num(grab(/처음 수보다 \$(\d+)\$만큼/, p.content, "111X")[0]);
      const larger = /만큼 크다\./.test(p.content);
      const [mT, c1T, c2T] = grab(
        /처음 수의 \$(\d+)\$배는 \$(\d+)\$보다 크고 \$(\d+)\$보다 작다/,
        p.content,
        "111X",
      );
      const m = num(mT);
      const low = num(c1T);
      const high = num(c2T);
      const { family, survivors } = survivorsByScan(d, larger, m, low, high);
      // ㉴ 선언한 제약을 지면이 스스로 어기지 않는가 — 후보의 두 자리 숫자가 모두 $1$~$9$.
      for (const v of family) {
        expect(Math.floor(v / 10)).toBeGreaterThanOrEqual(1);
        expect(v % 10).toBeGreaterThanOrEqual(1);
      }
      const famLine = lineWith(p.solution, "처음 수가 될 수 있는 것은", "111X");
      for (const v of family)
        expect(famLine, `111X 후보 ${v}`).toContain(`$${v}$`);
      // 두 경계 줄 — 엄격 부등호에서 「자연수」 걸음(㉯)
      const upLine = lineWith(p.solution, `$${m}x>${low}$`, "111X");
      const upFault = strictBoundFault(upLine, "up");
      expect(upFault.seen, "111X 아래끝 걸음을 못 봤다").toBe(true);
      expect(upFault.fault, upLine).toBeNull();
      const downLine = lineWith(p.solution, `$${m}x<${high}$`, "111X");
      const downFault = strictBoundFault(downLine, "down");
      expect(downFault.seen, "111X 위끝 걸음을 못 봤다").toBe(true);
      expect(downFault.fault, downLine).toBeNull();
      bounds += 2;
      // 살아남는 수 ↔ 버리는 수 ↔ 합
      const keepLine = lineWith(p.solution, "이 범위에 있는 것은", "111X");
      for (const v of survivors)
        expect(keepLine, `111X 살아남는 ${v}`).toContain(`$${v}$`);
      const dropLine = lineWith(
        p.solution,
        "두 조건을 모두 만족하지 않는다",
        "111X",
      );
      for (const v of family)
        if (!survivors.includes(v))
          expect(dropLine, `111X 버리는 ${v}`).toContain(`$${v}$`);
      const total = survivors.reduce((s, v) => s + v, 0);
      expect(lineWith(p.solution, "구하는 합은", "111X")).toContain(
        `$${survivors.join("+")}=${total}$`,
      );
      expect(p.answer).toBe(`$${total}$`);
    }
    expect(bounds).toBe(240);
  });

  it("`112X` — 부호 ↔ 두 절편 ↔ 통분 ↔ 합을 **넷 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E112, 120)) {
      const given = [...p.content.matchAll(/제\$(\d)\$사분면/g)]
        .map((m) => num(m[1]))
        .slice(0, 3);
      const [pT, qT] = grab(
        /\$\|a\|=(\d+)\$, \$\|b\|=(\d+)\$/,
        p.content,
        "112X",
      );
      const pv = num(pT);
      const qv = num(qT);
      const fits: [number, number][] = [];
      for (const a of [pv, -pv])
        for (const b of [qv, -qv])
          if (
            quadrantsPassed(a, b).join(",") ===
            [...given].sort((x, y) => x - y).join(",")
          )
            fits.push([a, b]);
      expect(fits.length, "112X 부호가 하나로 안 굳는다").toBe(1);
      const [a, b] = fits[0]!;
      const signLine = lineWith(p.solution, "이므로 $a", "112X");
      expect(signLine).toContain(`$a${a > 0 ? ">" : "<"}0$`);
      expect(signLine).toContain(`$b${b > 0 ? ">" : "<"}0$`);
      const valueLine = lineWith(p.solution, "$|a|=", "112X");
      expect(valueLine).toContain(`$a=${a}$`);
      expect(valueLine).toContain(`$b=${b}$`);
      const [xn, xd] = reduceFraction(-b, a);
      const xTex = xn < 0 ? `-\\dfrac{${-xn}}{${xd}}` : `\\dfrac{${xn}}{${xd}}`;
      const xLine = lineWith(p.solution, "$x$절편은 $y=0$", "112X");
      expect(xLine).toContain(`$${a}x${b < 0 ? "-" : "+"}${Math.abs(b)}=0$`);
      expect(xLine).toContain(`$x=${xTex}$`);
      const [sn, sd] = reduceFraction(xn + b * xd, xd);
      const sTex = sn < 0 ? `-\\dfrac{${-sn}}{${sd}}` : `\\dfrac{${sn}}{${sd}}`;
      const sumLine = lineWith(p.solution, "절편의 합은", "112X");
      // 통분 줄의 분자는 **합의 꼴**이라야 한다(㉰) — 약분되는 분수를 지면에 안 낸다.
      expect(sumLine).toContain(
        `\\dfrac{${xn}${b * xd < 0 ? "-" : "+"}${Math.abs(b * xd)}}{${xd}}`,
      );
      expect(sumLine).toContain(`=${sTex}$`);
      expect(p.answer).toBe(`$${sTex}$`);
      checked += 1;
    }
    expect(checked).toBe(120);
  });
});

describe("중2 5차c 확대 갈래 — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  it("`111X` — 발문과 독립 검산이 낳은 값만 지면에 있다", () => {
    for (const p of rows(E111, 60)) {
      const d = num(grab(/처음 수보다 \$(\d+)\$만큼/, p.content, "111X")[0]);
      const larger = /만큼 크다\./.test(p.content);
      const [mT, c1T, c2T] = grab(
        /처음 수의 \$(\d+)\$배는 \$(\d+)\$보다 크고 \$(\d+)\$보다 작다/,
        p.content,
        "111X",
      );
      const m = num(mT);
      const low = num(c1T);
      const high = num(c2T);
      const { family, survivors } = survivorsByScan(d, larger, m, low, high);
      const allowed = new Set<number>([
        0,
        1,
        9,
        // 🔴 `$9b-9a=27$` 의 둘째 항은 **`-9`** 로 읽힌다(부호까지 세는 자다).
        //    그 하나만 허용한다 — 「모든 값의 음수」를 열면 이 자가 절반 눈이 먼다.
        -9,
        10,
        d,
        d / 9,
        m,
        low,
        high,
        smallestNaturalAbove(low, m),
        largestNaturalBelow(high, m),
        survivors.reduce((s, v) => s + v, 0),
        ...family,
      ]);
      for (const v of mathIntegers(p.solution)) {
        expect(
          allowed.has(v),
          `111X 설명되지 않는 수 ${v} — ${p.solution}`,
        ).toBe(true);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 🔴 ㉳ 해설의 «말» — **「왜 그런가」를 진술하는 줄**을 지키는 자
//
// 값도 KaTeX 도 그대로인 부류다 — 여기서 안 물면 아무 데서도 안 물린다.
// ════════════════════════════════════════════════════════════════════════════

/** 유형마다 **굳힘과 마무리 논거를 진술하는 문장 조각**. */
const WORDS: Record<string, readonly string[]> = {
  "109X": [
    "가장 긴 것을 빗변으로 놓고 견주어야 한다",
    "두 길이의 제곱의 합",
    "어느 것과도 같지 않으므로 직각삼각형이 되지 않는다",
  ],
  "110X": [
    "부피의 비는 닮음비의 세제곱의 비와 같으므로",
    "이웃한 두 작은 뿔의 부피의 차가 그 사이의 조각이므로",
  ],
  "111X": [
    "자리를 바꾼 수도 두 자리 자연수이므로",
    "$x$는 자연수이므로",
    "두 조건을 모두 만족하지 않는다",
  ],
  "112X": [
    "$a$는 기울기이고 $b$는 $y$절편이다",
    "$x$절편은 $y=0$일 때의 $x$의 값이므로",
  ],
};

/** 참인 문장을 거짓으로 만드는 맞바꿈 — 눈금의 양성 대조. */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  "109X": [
    [
      "가장 긴 것을 빗변으로 놓고 견주어야 한다",
      "가장 짧은 것을 빗변으로 놓고 견주어야 한다",
    ],
    ["두 길이의 제곱의 합", "두 길이의 제곱의 차"],
    [
      "어느 것과도 같지 않으므로 직각삼각형이 되지 않는다",
      "어느 것과도 같으므로 직각삼각형이 된다",
    ],
  ],
  "110X": [
    [
      "부피의 비는 닮음비의 세제곱의 비와 같으므로",
      "부피의 비는 닮음비의 제곱의 비와 같으므로",
    ],
    [
      "이웃한 두 작은 뿔의 부피의 차가 그 사이의 조각이므로",
      "이웃한 두 작은 뿔의 부피의 합이 그 사이의 조각이므로",
    ],
  ],
  "111X": [
    [
      "자리를 바꾼 수도 두 자리 자연수이므로",
      "자리를 바꾼 수는 한 자리 자연수여도 되므로",
    ],
    ["$x$는 자연수이므로", "$x$는 유리수이므로"],
    ["두 조건을 모두 만족하지 않는다", "두 조건을 모두 만족한다"],
  ],
  "112X": [
    [
      "$a$는 기울기이고 $b$는 $y$절편이다",
      "$a$는 $y$절편이고 $b$는 기울기이다",
    ],
    [
      "$x$절편은 $y=0$일 때의 $x$의 값이므로",
      "$x$절편은 $x=0$일 때의 $y$의 값이므로",
    ],
  ],
};

function missingWords(rpmType: string, solution: string): string[] {
  return (WORDS[rpmType] ?? []).filter((w) => !solution.includes(w));
}

describe("[중2 5차c] ㉳ 해설의 «말»이 «왜 그런가»를 옳게 진술한다", () => {
  it(`네 유형 ${WIDE}판 전량에 그 줄이 있다`, () => {
    for (const e of M2_TOP_5C) {
      for (const p of rows(e, WIDE)) {
        expect(missingWords(e.rpmType, p.solution), e.rpmType).toEqual([]);
      }
    }
  });

  it("눈금 — 낱말을 뒤집으면 **전부** 빨개진다 (음성 대조를 먼저 본다)", () => {
    let positives = 0;
    for (const e of M2_TOP_5C) {
      const boards = rows(e, 40);
      for (const [from, to] of FLIPS[e.rpmType]!) {
        const hit = boards.find((p) => p.solution.includes(from));
        expect(
          hit,
          `${e.rpmType}: 맞바꿀 자리를 40판에서 못 찾았다 — ${from}`,
        ).toBeDefined();
        // 음성 — 손대지 않은 지면은 깨끗하다
        expect(missingWords(e.rpmType, hit!.solution)).toEqual([]);
        const flipped = hit!.solution.split(from).join(to);
        expect(flipped).not.toBe(hit!.solution);
        positives += 1;
        expect(
          missingWords(e.rpmType, flipped),
          `${e.rpmType}: 「${from}」→「${to}」 를 아무도 안 물었다`,
        ).not.toEqual([]);
      }
    }
    expect(positives).toBe(
      Object.values(FLIPS).reduce((s, v) => s + v.length, 0),
    );
    expect(positives).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 찍기로 맞을 수 있는가 · ㉡ 굳힘을 지우면 답이 바뀌는가
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **지면에서 학생이 «굴릴 수 있는 수»만 고른다.**
 *
 * 그냥 `mathIntegers(content)` 를 쓰면 안 된다 — 두 부류가 섞여 들어와 **거짓 경보**가
 * 난다(실측으로 둘 다 났다).
 *   ⑴ 단위의 지수: `\mathrm{cm}^3` 의 $3$. 이것이 들어오면 답 $18$ 이 「$3$ 의 여섯 배」로
 *      읽혀 멀쩡한 판이 지름길로 걸린다.
 *   ⑵ `112X` 의 사분면 **번호**: 제$1$·제$2$·제$3$사분면은 자료가 아니라 **이름**이다.
 *      그것을 넣으면 답의 분자 $10$ 이 「$2\times5$」로 읽힌다.
 * **거짓 경보는 가드를 끈다**(2026-08-20) — 그래서 자리를 좁힌다.
 */
function dataNumbers(content: string): number[] {
  const stripped = content
    .replace(/\\,\\mathrm\{cm\}\^\d/g, " ")
    .replace(/\\,\\mathrm\{cm\}/g, " ")
    .replace(/제\$\d\$사분면/g, " ");
  return mathIntegers(stripped).filter((v) => v > 0);
}

/** `112X` 의 답은 **분수**라 정수 자로 못 잰다 — 뻔한 유리수 목록으로 따로 잰다. */
function obviousRationals(p: number, q: number): Set<number> {
  return new Set<number>([
    q / p,
    -q / p,
    p / q,
    -p / q,
    q,
    -q,
    p,
    -p,
    p * q,
    -p * q,
    p + q,
    -(p + q),
    p - q,
    q - p,
  ]);
}

describe("중2 5차c 확대 갈래 — ㉠ 지름길과 널 모형", () => {
  const INTEGER_ANSWER = [E109, E110, E111];

  it("🔴 답이 정수인 셋 — 「지면의 수를 한두 번 굴린 값」이 답이 아니다 (600판)", () => {
    for (const e of INTEGER_ANSWER) {
      for (const p of rows(e, 600)) {
        const page = dataNumbers(p.content);
        expect(
          page.length,
          `${e.rpmType} 지면 수를 하나도 못 읽었다`,
        ).toBeGreaterThan(1);
        const target = mathIntegers(p.answer)[0]!;
        expect(
          looksLikeShortcut(target, page),
          `${e.rpmType} 지름길: ${p.content} → ${p.answer}`,
        ).toBe(false);
      }
    }
  });

  it("🔴 `112X` — 답이 분수라 **뻔한 유리수** 목록으로 잰다 (600판)", () => {
    for (const p of rows(E112, 600)) {
      const pv = num(grab(/\$\|a\|=(\d+)\$/, p.content, "112X")[0]);
      const qv = num(grab(/\$\|b\|=(\d+)\$/, p.content, "112X")[0]);
      const [signT, snT, sdT] = grab(
        /^\$(-?)\\dfrac\{(\d+)\}\{(\d+)\}\$$/,
        p.answer,
        "112X 답",
      );
      const value = ((signT === "-" ? -1 : 1) * num(snT)) / num(sdT);
      expect(
        obviousRationals(pv, qv).has(value),
        `112X 지름길: ${p.content} → ${p.answer}`,
      ).toBe(false);
    }
  });

  it("🔴 **널 모형** — 답을 판끼리 돌려 끼우면 우연 수준이 드러난다", () => {
    for (const e of INTEGER_ANSWER) {
      const boards = rows(e, 300);
      let coincidence = 0;
      for (let i = 0; i < boards.length; i += 1) {
        const page = dataNumbers(boards[i]!.content);
        const other = mathIntegers(
          boards[(i + 137) % boards.length]!.answer,
        )[0]!;
        if (looksLikeShortcut(other, page)) coincidence += 1;
      }
      // 우리 판은 0 이다. 널 모형이 **0 이 아니라야** 이 자가 무언가를 잰다.
      expect(
        coincidence,
        `${e.rpmType} 널 모형이 0 이면 이 자는 아무것도 못 잰다`,
      ).toBeGreaterThan(0);
    }
    // 🔴 `112X` 는 **한 번 돌려 끼우면 0** 이다(실측). 답이 분수라 뻔한 유리수 열넷과
    //    우연히 같아지는 일이 드물기 때문이다. 그러면 「0 이면 못 잰다」가 거꾸로
    //    이 시험을 죽인다 — 그래서 **짝을 전수로** 본다(200판 × 199 = 39,800짝).
    //    실측 우연 수준 **0.741%**(295짝)인데 **자기 판은 0** 이다.
    const boards = rows(E112, 200);
    const info = boards.map((p) => {
      const [signT, snT, sdT] = grab(
        /^\$(-?)\\dfrac\{(\d+)\}\{(\d+)\}\$$/,
        p.answer,
        "112X 답",
      );
      return {
        p: num(grab(/\$\|a\|=(\d+)\$/, p.content, "112X")[0]),
        q: num(grab(/\$\|b\|=(\d+)\$/, p.content, "112X")[0]),
        v: ((signT === "-" ? -1 : 1) * num(snT)) / num(sdT),
      };
    });
    let hits = 0;
    let pairs = 0;
    for (let i = 0; i < info.length; i += 1) {
      const set = obviousRationals(info[i]!.p, info[i]!.q);
      for (let j = 0; j < info.length; j += 1) {
        if (i === j) continue;
        pairs += 1;
        if (set.has(info[j]!.v)) hits += 1;
      }
    }
    expect(pairs).toBe(200 * 199);
    expect(
      hits,
      "112X 널 모형이 0 이면 이 자는 아무것도 못 잰다",
    ).toBeGreaterThan(0);
  });
});

describe("중2 5차c 확대 갈래 — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`109X` — 「가장 긴 변을 빗변으로」를 지우면 짝이 어긋난다", () => {
    let differ = 0;
    for (const p of rows(E109, 120)) {
      const pageOrder = [
        ...p.content.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g),
      ].map((m) => num(m[1]));
      const right = rightTriangleTriples(pageOrder, true);
      const wrong = rightTriangleTriples(pageOrder, false);
      expect(right.length).toBe(2);
      if (wrong.length !== right.length) differ += 1;
    }
    // 지면 순서가 섞여 있으므로 대부분의 판에서 갈린다.
    expect(differ, "109X 빗변 축이 한 판도 안 갈렸다").toBeGreaterThan(60);
  });

  it("`110X` — 「세제곱의 비」를 「제곱의 비」로 바꾸면 조각의 몫이 달라진다", () => {
    for (let n = 3; n <= 5; n += 1) {
      for (let k = 1; k <= n; k += 1) {
        const cube = pieceShare(k, n, true);
        const square = pieceShare(k, n, false);
        if (k === 1)
          expect(cube).toBe(square); // 첫 조각만 둘 다 $1$ 이다
        else expect(cube, `${n}등분 ${k}번째`).not.toBe(square);
      }
    }
  });

  it("`111X` — 아래끝 부등식을 안 보면 살아남는 수가 늘어난다", () => {
    let differ = 0;
    for (const p of rows(E111, 120)) {
      const d = num(grab(/처음 수보다 \$(\d+)\$만큼/, p.content, "111X")[0]);
      const larger = /만큼 크다\./.test(p.content);
      const [mT, c1T, c2T] = grab(
        /처음 수의 \$(\d+)\$배는 \$(\d+)\$보다 크고 \$(\d+)\$보다 작다/,
        p.content,
        "111X",
      );
      const cands = swapDiffNumbers(d / 9, larger);
      const both = survivingNumbers(cands, num(mT), num(c1T), num(c2T), "both");
      const upper = survivingNumbers(
        cands,
        num(mT),
        num(c1T),
        num(c2T),
        "upper",
      );
      expect(upper.length).toBeGreaterThan(both.length);
      if (upper.reduce((s, v) => s + v, 0) !== both.reduce((s, v) => s + v, 0))
        differ += 1;
    }
    expect(differ).toBe(120);
  });

  it("`112X` — 「$b$ 가 $y$절편」 걸음을 지우면 사분면이 안 정해진다", () => {
    let differ = 0;
    for (let p = 2; p <= 9; p += 1) {
      for (const a of [p, -p]) {
        for (const b of [3, -3]) {
          const right = missingQuadrant(a, b, true);
          const wrong = missingQuadrant(a, b, false);
          if (right !== wrong) differ += 1;
          // 되짚기와 왕복한다.
          const [aPos, bPos] = signsFromMissingQuadrant(right);
          expect(aPos).toBe(a > 0);
          expect(bPos).toBe(b > 0);
        }
      }
    }
    // $b<0$ 인 자리에서 전부 갈린다 — $8\times2=16$ 판.
    expect(differ).toBe(16);
  });
});

describe("중2 5차c 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`rightTriangleTriples`·`rightTriangleArea` 는 손 실측과 맞는다", () => {
    expect(rightTriangleTriples([6, 8, 10, 15, 17])).toEqual([
      [6, 8, 10],
      [8, 15, 17],
    ]);
    expect(rightTriangleArea([6, 8, 10])).toBe(24);
    expect(rightTriangleArea([8, 15, 17])).toBe(60);
    // 음성 — 직각삼각형이 없는 다섯쌍에서는 빈 배열을 낸다(늘 무언가를 찾지 않는다).
    expect(rightTriangleTriples([2, 3, 5, 7, 11])).toEqual([]);
  });

  it("`pieceShare` 는 손 실측과 맞고, 없는 조각을 물으면 던진다", () => {
    expect([1, 2, 3, 4].map((k) => pieceShare(k, 4))).toEqual([1, 7, 19, 37]);
    expect([1, 2, 3].map((k) => pieceShare(k, 3))).toEqual([1, 7, 19]);
    expect([1, 2, 3, 4, 5].reduce((s, k) => s + pieceShare(k, 5), 0)).toBe(125);
    expect(() => pieceShare(0, 4)).toThrow();
    expect(() => pieceShare(5, 4)).toThrow();
    expect(() => pieceShare(1, 1)).toThrow();
  });

  it("`swapDiffNumbers` 는 손 실측과 맞고 범위 밖이면 던진다", () => {
    expect(swapDiffNumbers(3, true)).toEqual([14, 25, 36, 47, 58, 69]);
    expect(swapDiffNumbers(3, false)).toEqual([41, 52, 63, 74, 85, 96]);
    // 자리를 바꾼 수도 두 자리라야 하므로 $30$ 은 없다(일의 자리가 $0$).
    expect(swapDiffNumbers(3, false)).not.toContain(30);
    expect(() => swapDiffNumbers(0, true)).toThrow();
    expect(() => swapDiffNumbers(9, true)).toThrow();
  });

  it("`survivingNumbers` 는 세 갈래를 실제로 가른다", () => {
    const c = [14, 25, 36, 47, 58, 69];
    expect(survivingNumbers(c, 3, 118, 190, "both")).toEqual([47, 58]);
    expect(survivingNumbers(c, 3, 118, 190, "upper")).toEqual([
      14, 25, 36, 47, 58,
    ]);
    expect(survivingNumbers(c, 3, 118, 190, "lower")).toEqual([47, 58, 69]);
    expect(() => survivingNumbers(c, 1, 118, 190)).toThrow();
  });

  it("`smallestNaturalAbove`·`largestNaturalBelow` 는 정수 경계를 **거부한다**", () => {
    expect(smallestNaturalAbove(118, 3)).toBe(40);
    expect(largestNaturalBelow(190, 3)).toBe(63);
    expect(() => smallestNaturalAbove(120, 3)).toThrow();
    expect(() => largestNaturalBelow(120, 3)).toThrow();
  });

  it("`missingQuadrant`·`signsFromMissingQuadrant` 는 왕복하고 축 위를 거부한다", () => {
    expect(missingQuadrant(3, 5)).toBe(4);
    expect(missingQuadrant(3, -5)).toBe(2);
    expect(missingQuadrant(-3, 5)).toBe(3);
    expect(missingQuadrant(-3, -5)).toBe(1);
    for (const q of [1, 2, 3, 4]) {
      const [aPos, bPos] = signsFromMissingQuadrant(q);
      expect(missingQuadrant(aPos ? 2 : -2, bPos ? 7 : -7)).toBe(q);
    }
    expect(() => missingQuadrant(0, 3)).toThrow();
    expect(() => missingQuadrant(3, 0)).toThrow();
    expect(() => signsFromMissingQuadrant(5)).toThrow();
  });

  it("`reduceFraction` 은 늘 기약이고 분모가 양수다", () => {
    expect(reduceFraction(-5, 3)).toEqual([-5, 3]);
    expect(reduceFraction(5, -3)).toEqual([-5, 3]);
    expect(reduceFraction(-10, -4)).toEqual([5, 2]);
    expect(reduceFraction(0, 7)).toEqual([0, 1]);
  });

  it("`hasFinalConsonant`·`objectParticle`·`withParticle` 은 **음절 코드**에서 계산한다", () => {
    expect(hasFinalConsonant("원뿔")).toBe(true);
    expect(hasFinalConsonant("사다리")).toBe(false);
    expect(objectParticle("원뿔")).toBe("을");
    expect(objectParticle("사다리")).toBe("를");
    expect(withParticle("사각뿔")).toBe("과");
    expect(withParticle("사다리")).toBe("와");
    // 손 목록이 아니라 규칙임을 못 박는다 — 목록에 없던 낱말도 옳게 가른다.
    expect(objectParticle("공책")).toBe("을");
    expect(objectParticle("가위")).toBe("를");
  });

  it("`looksLikeShortcut` 이 «아니오» 도 낸다 (양성·음성 한 쌍)", () => {
    expect(looksLikeShortcut(36, [3, 12])).toBe(true); // $3\times12$
    expect(looksLikeShortcut(15, [3, 12])).toBe(true); // $3+12$
    expect(looksLikeShortcut(84, [6, 8, 10, 15, 17])).toBe(false);
    expect(looksLikeShortcut(111, [4, 21])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 🔴 D-20 손실 원장 — 「가드 **하나만** 껐을 때」를 전수로 다시 센다 (㉶)
// ═══════════════════════════════════════════════════════════

describe("중2 5차c 확대 갈래 — 🔴 D-20 손실 원장이 재현된다", () => {
  /** 매개변수 전수와 그 정답 분포. `label` 은 모듈 머리말 ⑷ 의 칸 이름이다. */
  function distribution(answers: number[]): {
    combos: number;
    kinds: number;
    top: number;
  } {
    const m = new Map<number, number>();
    for (const a of answers) m.set(a, (m.get(a) ?? 0) + 1);
    return {
      combos: answers.length,
      kinds: m.size,
      top: m.size === 0 ? 0 : Math.max(...m.values()) / answers.length,
    };
  }

  it("`109X` — 지름길 가드를 껐을 때 **56** · 켰을 때 **46**", () => {
    const LIM = 60;
    const trips: [number, number, number][] = [];
    for (let a = 3; a <= LIM; a += 1)
      for (let b = a + 1; b <= LIM; b += 1) {
        const cc = a * a + b * b;
        const c = Math.round(Math.sqrt(cc));
        if (c * c === cc && c <= LIM) trips.push([a, b, c]);
      }
    const all: { L: number[]; area: number }[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < trips.length; i += 1)
      for (let j = i + 1; j < trips.length; j += 1) {
        const u = new Set([...trips[i]!, ...trips[j]!]);
        if (u.size !== 5) continue;
        const L = [...u].sort((x, y) => x - y);
        const key = L.join(",");
        if (seen.has(key)) continue;
        const rights = rightTriplesByRoot(L);
        if (rights.length !== 2) continue;
        const area = rights.reduce((s, t) => s + (t[0]! * t[1]!) / 2, 0);
        if (!Number.isInteger(area)) continue;
        seen.add(key);
        all.push({ L, area });
      }
    const off = distribution(all.map((r) => r.area));
    const on = distribution(
      all.filter((r) => !looksLikeShortcut(r.area, r.L)).map((r) => r.area),
    );
    expect([off.combos, off.kinds]).toEqual([56, 46]);
    expect([on.combos, on.kinds]).toEqual([46, 36]);
    expect(off.top).toBeCloseTo(0.0536, 3);
    expect(on.top).toBeCloseTo(0.0652, 3);
  });

  it("`110X` — 첫째 조각을 쓸 때 **566** · 안 쓸 때 **344** (그리고 지름길 가드는 **죽는다**)", () => {
    const build = (lo: number): { ans: number; page: number[] }[] => {
      const out: { ans: number; page: number[] }[] = [];
      for (const n of [3, 4, 5])
        for (let i = lo; i <= n; i += 1)
          for (let j = lo; j <= n; j += 1) {
            if (i === j) continue;
            for (let t = 2; t <= 20; t += 1) {
              const given = conePieceVolume(i) * t;
              const want = conePieceVolume(j) * t;
              if (given < 8 || given > 900 || want < 8 || want > 900) continue;
              out.push({ ans: want, page: [n, given] });
            }
          }
      return out;
    };
    const withFirst = distribution(build(1).map((r) => r.ans));
    const product = distribution(build(2).map((r) => r.ans));
    expect([withFirst.combos, withFirst.kinds]).toEqual([566, 81]);
    expect([product.combos, product.kinds]).toEqual([344, 69]);
    expect(withFirst.top).toBeCloseTo(0.0265, 3);
    expect(product.top).toBeCloseTo(0.032, 3);
    // 🔴 **지름길 가드가 죽는다** — 첫째 조각을 뺀 뒤로 걸리는 조합이 하나도 없다.
    //    그래서 생성기에서 그 줄을 **지웠다**. 그 사실 자체를 여기서 잰다 —
    //    0 이 «깨끗»인지 «못 셈»인지 가르려면 「1도 안 걸린다」를 세어 두어야 한다.
    expect(
      build(1).filter((r) => looksLikeShortcut(r.ans, r.page)).length,
    ).toBe(35);
    expect(
      build(2).filter((r) => looksLikeShortcut(r.ans, r.page)).length,
    ).toBe(0);
  });

  it("`111X` — 기약 가드만 **487,630** · 지름길까지 **421,735** (창 **62**)", () => {
    let windows = 0;
    let all = 0;
    let gcdOnly = 0;
    let both = 0;
    const kindsOff = new Set<number>();
    const kindsOn = new Set<number>();
    for (const swapIsLarger of [true, false])
      for (let t = 1; t <= 5; t += 1) {
        const cands = swapDiffNumbers(t, swapIsLarger);
        if (cands.length < 4) continue;
        for (let lo = 2; lo <= cands.length - 2; lo += 1)
          for (let hi = lo + 1; hi <= cands.length - 1; hi += 1) {
            if (hi - lo + 1 > 4) continue;
            windows += 1;
            const sum = cands.slice(lo - 1, hi).reduce((s, v) => s + v, 0);
            for (let m = 2; m <= 7; m += 1) {
              const below = cands[lo - 2]!;
              const first = cands[lo - 1]!;
              const last = cands[hi - 1]!;
              const above = cands[hi]!;
              for (let c1 = m * below + 1; c1 <= m * first - 1; c1 += 1)
                for (let c2 = m * last + 1; c2 <= m * above - 1; c2 += 1) {
                  all += 1;
                  kindsOff.add(sum);
                  if (gcd2(c1, m) !== 1 || gcd2(c2, m) !== 1) continue;
                  gcdOnly += 1;
                  if (looksLikeShortcut(sum, [9 * t, m, c1, c2])) continue;
                  both += 1;
                  kindsOn.add(sum);
                }
            }
          }
      }
    expect(windows).toBe(62);
    expect(all).toBe(1006322);
    expect(gcdOnly).toBe(487630);
    expect(both).toBe(421735);
    expect(kindsOff.size).toBe(57);
    expect(kindsOn.size).toBe(56);
  });

  it("`112X` — 지름길 가드를 껐을 때 **280** · 켰을 때 **266**", () => {
    const all: { val: number; p: number; q: number }[] = [];
    for (const [aPos, bPos] of [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ] as const)
      for (let p = 2; p <= 9; p += 1)
        for (let q = 1; q <= 14; q += 1) {
          if (gcd2(p, q) !== 1) continue;
          const a = aPos ? p : -p;
          const b = bPos ? q : -q;
          const [xn, xd] = reduceFraction(-b, a);
          if (xd === 1) continue;
          const [sn, sd] = reduceFraction(xn + b * xd, xd);
          if (sd === 1) continue;
          all.push({ val: sn / sd, p, q });
        }
    const obvious = (r: { val: number; p: number; q: number }): boolean =>
      new Set<number>([
        r.q / r.p,
        -r.q / r.p,
        r.p / r.q,
        -r.p / r.q,
        r.q,
        -r.q,
        r.p,
        -r.p,
        r.p * r.q,
        -r.p * r.q,
        r.p + r.q,
        -(r.p + r.q),
        r.p - r.q,
        r.q - r.p,
      ]).has(r.val);
    expect(all.length).toBe(280);
    expect(all.filter((r) => !obvious(r)).length).toBe(266);
    expect(new Set(all.map((r) => r.val)).size).toBe(242);
    expect(new Set(all.filter((r) => !obvious(r)).map((r) => r.val)).size).toBe(
      232,
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 검사기 자신의 눈금 — 「이 자가 «아니오» 를 낼 수 있는가」
// ═══════════════════════════════════════════════════════════

describe("중2 5차c 확대 갈래 — 검사기 자신의 눈금", () => {
  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("$36+64=100$")).toEqual([]);
    expect(arithmeticFaults("$36+64=101$")).toHaveLength(1);
    expect(arithmeticFaults("$64-27=37$")).toEqual([]);
    expect(arithmeticFaults("$64-27=36$")).toHaveLength(1);
    expect(arithmeticFaults("$19\\times11=209$")).toEqual([]);
    expect(arithmeticFaults("$19\\times11=208$")).toHaveLength(1);
    // 🔴 지면에 실제로 쓰는 꼴에서 **거짓 경보가 안 난다** — 분수 안의 곱은 안 센다.
    expect(arithmeticFaults("$\\dfrac{6\\times8}{2}=24$")).toEqual([]);
    expect(arithmeticFaults("$\\dfrac{-5+15}{3}=\\dfrac{10}{3}$")).toEqual([]);
    expect(arithmeticClaims("$\\dfrac{6\\times8}{2}=24$")).toBe(0);
    expect(arithmeticClaims("$36+64=100$")).toBe(1);
  });

  it("`badFractions` 는 약분 안 한 분수와 분모 $1$ 을 잡는다", () => {
    expect(badFractions("$\\dfrac{10}{3}$")).toEqual([]);
    expect(badFractions("$\\dfrac{15}{3}$")).toHaveLength(1);
    expect(badFractions("$\\dfrac{7}{1}$")).toHaveLength(1);
    expect(fractionCount("$\\dfrac{10}{3}$ 와 $\\dfrac{1}{2}$")).toBe(2);
  });

  it("🔴 `strictBoundFault` — 엄격 부등호에서 「자연수」 걸음을 건너뛰면 잡는다", () => {
    const good =
      "처음 수를 $x$라 하면 $3$배가 $118$보다 크므로 $3x>118$, 곧 $x>\\dfrac{118}{3}$이다. $x$는 자연수이므로 $x\\ge40$이다.";
    expect(strictBoundFault(good, "up")).toEqual({ fault: null, seen: true });
    // 분수를 안 적고 뛰었다
    expect(
      strictBoundFault("$3x>118$이므로 $x\\ge40$이다.", "up").fault,
    ).not.toBeNull();
    // 「자연수」 걸음이 없다
    expect(
      strictBoundFault(
        "$3x>118$, 곧 $x>\\dfrac{118}{3}$이다. $x\\ge40$이다.",
        "up",
      ).fault,
    ).not.toBeNull();
    // 정수 경계를 틀리게 적었다
    expect(
      strictBoundFault(
        "$3x>118$, 곧 $x>\\dfrac{118}{3}$이다. $x$는 자연수이므로 $x\\ge39$이다.",
        "up",
      ).fault,
    ).not.toBeNull();
    // 경계가 정수라 동점이 난다
    expect(
      strictBoundFault(
        "$3x>120$, 곧 $x>\\dfrac{120}{3}$이다. $x$는 자연수이므로 $x\\ge41$이다.",
        "up",
      ).fault,
    ).not.toBeNull();
    // 아래 방향도 같은 눈금
    const goodDown =
      "$3x<190$, 곧 $x<\\dfrac{190}{3}$이다. $x$는 자연수이므로 $x\\le63$이다.";
    expect(strictBoundFault(goodDown, "down")).toEqual({
      fault: null,
      seen: true,
    });
    // 볼 것이 없으면 «못 셈»이라고 답한다 — «깨끗»과 안 섞는다.
    expect(strictBoundFault("아무 부등식도 없다.", "up")).toEqual({
      fault: null,
      seen: false,
    });
  });

  it("`rightTriplesByRoot` 와 `quadrantsPassed` 는 손 실측과 맞는다", () => {
    expect(rightTriplesByRoot([6, 8, 10, 15, 17])).toEqual([
      [6, 8, 10],
      [8, 15, 17],
    ]);
    expect(rightTriplesByRoot([2, 3, 5, 7, 11])).toEqual([]);
    expect(quadrantsPassed(3, 5)).toEqual([1, 2, 3]);
    expect(quadrantsPassed(3, -5)).toEqual([1, 3, 4]);
    expect(quadrantsPassed(-3, 5)).toEqual([1, 2, 4]);
    expect(quadrantsPassed(-3, -5)).toEqual([2, 3, 4]);
    expect(() => quadrantsPassed(0, 5)).toThrow();
    expect(() => quadrantsPassed(3, 0)).toThrow();
  });

  it("`survivorsByScan` 은 두 자리 수를 실제로 훑는다 (손 실측)", () => {
    const r = survivorsByScan(27, true, 3, 118, 190);
    expect(r.family).toEqual([14, 25, 36, 47, 58, 69]);
    expect(r.survivors).toEqual([47, 58]);
    const s = survivorsByScan(27, false, 3, 118, 190);
    expect(s.family).toEqual([41, 52, 63, 74, 85, 96]);
    // 🔴 손으로 적은 첫 값 `[52, 63]` 은 **틀렸다** — $3\times41=123>118$ 이라
    //    $41$ 도 산다. 시험이 잡았다(그래서 손 실측은 반드시 돌려서 확인한다).
    expect(s.survivors).toEqual([41, 52, 63]);
  });

  it("🔴 `conePieceVolume` 은 **뿔의 부피 공식**에서 오고 굳힘 함수와 값이 같다", () => {
    // 같은 값을 내지만 오는 길이 다르다 — 이 짝이 어긋나면 둘 중 하나가 틀린 것이다.
    for (let n = 3; n <= 5; n += 1)
      for (let k = 1; k <= n; k += 1)
        expect(conePieceVolume(k), `${n}등분 ${k}번째`).toBe(pieceShare(k, n));
    expect(coneStackVolume(4)).toBe(64);
    expect(conePieceVolume(4)).toBe(37);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 5차c 확대 갈래 — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `110X` 가 「$64$**이라** 하면」이 아니라 「$64$**라** 하면」이다", () => {
    let seen = 0;
    for (const p of rows(E110, 200)) {
      const line = lineWith(p.solution, "라 하면", "110X");
      const cube = num(grab(/부피를 \$(\d+)\$/, line, "110X")[0]);
      const want = [2, 4, 5, 9].includes(cube % 10) ? "라 하면" : "이라 하면";
      expect(line, `110X 「${cube}${want}」`).toContain(`$${cube}$${want}`);
      seen += 1;
    }
    expect(seen).toBe(200);
  });

  it("⑵ 🔴 `110X` 의 낱말 뒤 조사가 **받침**을 따른다 (「원뿔을」·「원뿔과」)", () => {
    for (const p of rows(E110, 120)) {
      const shape = grab(/^어떤 (원뿔|사각뿔|삼각뿔)의/, p.content, "110X")[0]!;
      expect(p.content).toContain(`이 ${shape}을 잘라`);
      expect(p.solution).toContain(`처음 ${shape}과 닮은 도형`);
    }
  });

  it("⑶ 🔴 `109X` 의 다섯 길이가 발문에서 **섞여** 있다 (㉵)", () => {
    let shuffled = 0;
    for (const p of rows(E109, 200)) {
      const shown = [...p.content.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map(
        (m) => num(m[1]),
      );
      const sorted = [...shown].sort((x, y) => x - y);
      expect(shown.join(",")).not.toBe(sorted.join(","));
      shuffled += 1;
    }
    expect(shuffled).toBe(200);
  });

  it("⑷ 🔴 `111X` 의 창이 **양쪽에서** 닫히고 두 경계가 다른 부등식에서 온다", () => {
    for (const p of rows(E111, 200)) {
      const d = num(grab(/처음 수보다 \$(\d+)\$만큼/, p.content, "111X")[0]);
      const larger = /만큼 크다\./.test(p.content);
      const [mT, c1T, c2T] = grab(
        /처음 수의 \$(\d+)\$배는 \$(\d+)\$보다 크고 \$(\d+)\$보다 작다/,
        p.content,
        "111X",
      );
      const { family, survivors } = survivorsByScan(
        d,
        larger,
        num(mT),
        num(c1T),
        num(c2T),
      );
      expect(survivors[0]).not.toBe(family[0]);
      expect(survivors[survivors.length - 1]).not.toBe(
        family[family.length - 1],
      );
      expect(survivors.length).toBeGreaterThanOrEqual(2);
      expect(survivors.length).toBeLessThanOrEqual(4);
    }
  });

  it("⑸ 🔴 `112X` 가 네 부호 조합을 **다** 낸다 — 하나만 나면 버리는 걸음이 한 방향뿐이다", () => {
    const seen = new Set<number>();
    for (const p of rows(E112, 200)) {
      const q = num(grab(/그래프가 제\$(\d)\$사분면/, p.content, "112X")[0]);
      seen.add(q);
      // ㉴ 선언한 부호를 지면이 스스로 어기지 않는다.
      const signLine = lineWith(p.solution, "이므로 $a", "112X");
      const aPos = signLine.includes("$a>0$");
      const bPos = signLine.includes("$b>0$");
      const pv = num(grab(/\$\|a\|=(\d+)\$/, p.content, "112X")[0]);
      const qv = num(grab(/\$\|b\|=(\d+)\$/, p.content, "112X")[0]);
      expect(p.solution).toContain(`$a=${aPos ? pv : -pv}$`);
      expect(p.solution).toContain(`$b=${bPos ? qv : -qv}$`);
    }
    // 지나는 사분면 목록의 첫 번째가 $1$ 또는 $2$ 로 갈린다 (제1사분면을 지나는가).
    expect(seen.size).toBeGreaterThanOrEqual(2);
    const misses = new Set<number>();
    for (const p of rows(E112, 200)) {
      const given = [...p.content.matchAll(/제\$(\d)\$사분면/g)]
        .map((m) => num(m[1]))
        .slice(0, 3);
      misses.add([1, 2, 3, 4].find((k) => !given.includes(k))!);
    }
    expect([...misses].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("⑹ 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나간다", () => {
    for (const e of M2_TOP_5C)
      for (const p of rows(e, 40)) {
        expect(p.solution, e.rpmType).not.toContain("**");
        expect(p.content, e.rpmType).not.toContain("**");
        // ㉸ 「그중」은 붙여 쓴다.
        expect(p.solution, e.rpmType).not.toContain("그 중");
      }
  });
});
