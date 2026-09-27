/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5e.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `117X` | SAS **닮음 조건**으로 대응변을 잡고 닮음비를 곱한다 | 닮음을 **한 번도 안 쓴다** — $\mathrm{A}$ 를 원점, $\mathrm{C}$ 를 $x$축 위에 놓고 $\mathrm{B}$ 의 좌표를 **코사인 제2법칙**으로 구해 $\overline{\mathrm{BD}}^{2}$ 를 유리수로 계산한 뒤 **정확한 제곱근**을 뽑는다. 유리수가 아니면 그 지면은 이 갈래가 아니므로 **던진다** |
 * | `118X` | 정리한 $ax\le b$ 에서 $\lfloor b/a\rfloor$ 를 세어 후보를 모은다 | 나눗셈도 내림도 **안 쓴다** — 정수 $a$ 를 차례로 넣고 자연수 $x$ 를 $1$ 부터 **실제로 대입해** 원래 부등식이 참인 횟수를 센다. 계수가 양수일 때 한 번 어긋나면 다시 안 맞는다는 **단조성**만 쓴다(제품의 규칙이 아니다) |
 * | `119X` | 기준 점에서 기울기를 견주어 한 직선 위의 셋을 찾는다 | 기울기를 **안 쓴다** — 네 점에서 셋을 고르는 네 가지를 **넓이 행렬식**으로 판정하고, 평행한 직선은 방향 벡터를 **더해** 둘째 점을 만든 뒤 **두 점 절편 공식**으로 $y$절편을 유리수로 낸다 |
 * | `120X` | 대변끼리 같다고 놓고 일차방정식을 **푼다** | 방정식을 **한 줄도 안 푼다** — $x=1$ 부터 차례로 **넣어 보아** 네 길이가 대변끼리 같아지는 $x$ 를 **찾는다**. 그런 $x$ 가 하나가 아니면 던진다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면 재현율만
 * 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * ## ⑶ 🔴 앞 물결들이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**(`5\times6+2=32` 꼴)을 뽑아 좌·우를 각각 계산해 맞댄다.
 *   ㄴ. **해설에 나온 모든 수가 재계산으로 설명되는가** — 발문에서 읽은 값과 독립
 *       검산이 낳은 값만 허용한다.
 *   ㄷ. **해설의 «말»** — 굳힘 개념을 진술하는 낱말을 맞바꾸거나 지우면 빨개진다.
 *       그리고 **낱말만 세지 않는다**: `118X` 의 나열 줄은 `$a=k$이면 $c$개` 를 **하나씩
 *       다시 세어** 맞대고, `119X` 의 기울기 줄은 `\dfrac{Δy}{Δx}=값` 을 **다시 계산**해
 *       맞댄다. 낱말만 보면 「값이 틀린 나열」이 통과한다.
 *   ㄹ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아닌가.
 *   ㅁ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 한 단(964.8px)이
 *       아니라 **700px** 아래로 잠근다.
 *   ㅂ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 🔴 **공용 훑개의 「정수 경계 걸음」 축이 `118X` 를 아예 못 본다.**
 *    `probe-middle-extending-tiers.boundStepFaults` 는 `$cx\le R$이다.` 꼴을 찾는데
 *    우리 부등식의 계수는 **문자**($ax\le b$)다. 그 자에게 이 갈래의 「걸음 0」은
 *    «깨끗»이 아니라 **«잴 것이 없다»** 다. 그 축은 **이 파일이 따로 들고 있다**
 *    (`countStepFault`). 남의 파일을 안 고치는 대신 여기 적어 둔다 — 리드가 공용 자에
 *    문자 계수 판을 넣기로 하면 그때 눈금 수가 바뀐다.
 * 2. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은 재지만
 *    설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로 눈으로
 *    읽었고, 그때 고친 자리(「$…185$**을**」 → 「**를**」 · 「$…=3$**로** 기울기가 같으므로」
 *    → 「**이므로** 두 기울기가 같고」 · 「$\dfrac{97}{a}$**는** 작아지므로」 → 「**은**」)를
 *    아래 회귀 잠금에 남긴다.
 * 3. `120X` 의 검산은 $x$ 를 $1$ 부터 $300$ 까지만 훑는다. 생성기가 $x_0\le9$ 이므로
 *    충분하지만, 매개변수를 넓히면 이 상한도 같이 넓혀야 한다(그 사실을 여기 적어 둔다).
 * 4. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 *
 * ## ⑸ 🔴 소단원 이름이 브리프와 다르다 — 근거
 *
 * 브리프의 네 이름 가운데 **둘**(「유한소수와 순환소수」·「평행선과 선분의 길이의 비」)이
 * `Unit.section` 정본에 **없다.** 리드의 배분표(`.tmp-lead/w5-args*.json`)를 따랐고
 * 그 근거는 모듈 머리말 ⑴-1 에 적었다. 아래 「소단원·중단원 이름을 정본에 대조한다」가
 * **그 판단이 옳은지를 매번 다시 확인한다** — 정본에 없는 이름을 쓰면 빨개진다.
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
import { pageShortcutValues } from "@/lib/middle/m1Top4";
import {
  coefTex,
  coefficientsWithCount,
  collinearTriple,
  fracTex,
  linTex,
  M2_TOP_5E,
  naturalSolutionCount,
  parallelIntercept,
  parallelogramPerimeter,
  reduceFraction,
  SAS_SPLITS,
  slopeOf,
  splitSimilarLength,
  type Point,
  type Side,
} from "@/lib/middle/m2Top5e";
import { repeatedStatement } from "@/lib/middle/solutionText";
import { resolveMiddleTier } from "@/lib/middle/tier";
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
/** 해설 높이·정답 쏠림은 **800판**으로 잰다(재현율은 곧 판 수다). */
const WIDE = 800;
const BASE_SEED = 20260905;
/**
 * 🔴 정답 쏠림은 **씨앗 블록 넷**으로 잰다. 블록 하나로 적으면 여유를 낙관적으로
 * 적게 된다 — 4차가 그렇게 물렸다(`m2Top4.ts` ㉴).
 */
const SEED_BLOCKS = [20260905, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260905, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];
/** 정답 쏠림 문턱 — 브리프가 못 박은 값. */
const SKEW_LIMIT = 12;

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5E.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E117 = entryOf("117X");
const E118 = entryOf("118X");
const E119 = entryOf("119X");
const E120 = entryOf("120X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "117X": "심화중",
  "118X": "심화상",
  "119X": "심화상",
  "120X": "심화중",
};

/** 유형마다 리드가 준 변형 폭 아래 끝. */
const VARIANT_FLOOR: Record<string, number> = {
  "117X": 6,
  "118X": 12,
  "119X": 12,
  "120X": 12,
};

// ── 소품 ────────────────────────────────────────────────────

function rows(entry: TypeEntry, n = SAMPLE, seed = BASE_SEED): MidProblem[] {
  const out: MidProblem[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(entry.handler(createRng(seed + i * 7919)));
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

// ── 유리수 산술 (검산 전용 — 제품에는 없다) ────────────────

type Rat = [number, number]; // 기약, 분모 > 0

function rat(n: number, d: number): Rat {
  if (d === 0) throw new Error("rat: 분모가 0");
  const s = d < 0 ? -1 : 1;
  const g = gcd2(n, d) || 1;
  return [(s * n) / g, (s * d) / g];
}

function ratAdd(a: Rat, b: Rat): Rat {
  return rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
}

function ratSub(a: Rat, b: Rat): Rat {
  return rat(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
}

function ratMul(a: Rat, b: Rat): Rat {
  return rat(a[0] * b[0], a[1] * b[1]);
}

function perfectSqrt(n: number): number | null {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
}

/** 유리수의 **정확한** 제곱근 — 완전제곱이 아니면 `null`. */
function ratSqrt(a: Rat): Rat | null {
  const n = perfectSqrt(a[0]);
  const d = perfectSqrt(a[1]);
  if (n === null || d === null) return null;
  return rat(n, d);
}

/** `\dfrac{a}{b}` 또는 정수 — 제품 `fracTex` 와 **다른 코드**로 짓는다. */
function ratTex(a: Rat): string {
  if (a[1] === 1) return String(a[0]);
  return a[0] < 0 ? `-\\dfrac{${-a[0]}}{${a[1]}}` : `\\dfrac{${a[0]}}{${a[1]}}`;
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

// ── ㄹ. 기약 · ㄴ. 미설명 수 ──────────────────────────────

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아니거나 분모가 $1$ 인** 것. */
function unreducedFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (gcd2(a, b) !== 1 || b === 1) out.push(`${a}/${b}`);
  }
  return out;
}

/** 이 자가 **몇 개를 봤는가**. */
function fractionCount(text: string): number {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].length;
}

/** `$...$` 안에 적힌 정수 전부 (부호 포함). */
function mathIntegers(text: string): number[] {
  const out: number[] = [];
  for (const span of text.matchAll(/\$([^$]*)\$/g)) {
    for (const n of span[1]!.matchAll(/-?\d+/g)) out.push(Number(n[0]));
  }
  return out;
}

// ── 118X 「문자 계수 판 개수 걸음」 — 공용 훑개가 못 보는 축(⑷ 1) ──

/**
 * 🔴 `$ax\le b$` 에서 「자연수인 해가 몇 개인가」로 뛸 때, 해설은
 *
 *   ⑴ 「$\dfrac{b}{a}$ 를 넘지 않는 가장 큰 자연수」라는 **근거**를 그 자리에서 적고,
 *   ⑵ 실제로 $a$ 마다 그 개수를 **세어 늘어놓아야** 한다.
 *
 * 안 적으면 「$ax\le b$ 이므로 $a=14,15,16$」이 되어 **걸음이 통째로 빈다**
 * (3차 `38V` 가 574건 그랬다). 공용 `boundStepFaults` 는 계수가 숫자인 판만 보므로
 * 이 자리를 **구조적으로 못 본다.**
 *
 * `seen` 은 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다.
 */
function countStepFault(
  solution: string,
  bound: number,
): { fault: string | null; seen: number } {
  const listed = [...solution.matchAll(/\$a=(\d+)\$이면 \$(\d+)\$개/g)];
  if (listed.length === 0)
    return { fault: "개수를 세어 늘어놓은 줄이 없다", seen: 0 };
  if (listed.length < 3)
    return {
      fault: `나열이 ${listed.length}개뿐이라 위·아래 이웃을 안 보였다`,
      seen: listed.length,
    };
  for (const m of listed) {
    const a = num(m[1]);
    const claimed = num(m[2]);
    // 근거는 **대입해 센 값**이다 — 제품 함수를 안 부른다.
    let real = 0;
    for (let x = 1; a * x <= bound; x += 1) real += 1;
    if (real !== claimed)
      return {
        fault: `$a=${a}$ 의 개수를 ${claimed} 로 적었는데 참은 ${real}`,
        seen: listed.length,
      };
  }
  if (
    !/\$\\dfrac\{\d+\}\{a\}\$(?:을|를) 넘지 않는 가장 큰 자연수/.test(solution)
  )
    return {
      fault: "「넘지 않는 가장 큰 자연수」 근거를 안 적고 개수로 뛰었다",
      seen: listed.length,
    };
  return { fault: null, seen: listed.length };
}

/** 해설에서 그 조각이 든 줄. 없으면 던진다 — 조용히 건너뛰면 분모 밖이 된다. */
function lineWith(solution: string, needle: string, who: string): string {
  const hit = solution.split("\n").find((l) => l.includes(needle));
  if (hit === undefined)
    throw new Error(`${who}: 「${needle}」가 든 줄이 없다 — ${solution}`);
  return hit;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const RE117 =
  /^삼각형 \$ABC\$에서 \$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$, \$\\overline\{AC\}=(\d+)\\,\\mathrm\{cm\}\$, \$\\overline\{BC\}=(\d+)\\,\\mathrm\{cm\}\$이다\. 변 \$AC\$ 위의 점 \$D\$에 대하여 \$\\overline\{AD\}=(\d+)\\,\\mathrm\{cm\}\$일 때, \$\\overline\{BD\}\$의 길이를 구하시오\.$/;

const RE118 =
  /^\$x\$에 대한 일차부등식 \$(\d+)\(ax\+(\d+)\)\\le ax\+(\d+)\$(?:을|를) 만족시키는 자연수 \$x\$가 \$(\d+)\$개가 되도록 하는 정수 \$a\$의 값을 모두 구하여 그 합을 구하시오\.$/;

const RE119 =
  /^좌표평면 위의 네 점 \$\\mathrm\{A\}\((-?\d+), (-?\d+)\)\$, \$\\mathrm\{B\}\((-?\d+), (-?\d+)\)\$, \$\\mathrm\{C\}\((-?\d+), (-?\d+)\)\$, \$\\mathrm\{D\}\((-?\d+), (-?\d+)\)\$ 가운데 세 점은 한 직선 위에 있다\. 그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 \$y\$절편을 구하시오\.$/;

const RE120_HEAD =
  /^평행사변형 \$ABCD\$의 두 대각선의 교점을 \$O\$라 하자\. 대각선 \$BD\$ 위에 \$\\overline\{BE\}=\\overline\{DF\}\$가 되도록 두 점 \$E\$, \$F\$를 잡았다\. /;
const RE120_TAIL = /일 때, \$\\square AECF\$의 둘레의 길이를 구하시오\.$/;
const SIDE_AE = /\$\\overline\{AE\}=\((\d*)x([+-]\d+)\)\\,\\mathrm\{cm\}\$/;
const SIDE_CF = /\$\\overline\{CF\}=\((\d*)x([+-]\d+)\)\\,\\mathrm\{cm\}\$/;
const SIDE_EC = /\$\\overline\{EC\}=\((\d*)x([+-]\d+)\)\\,\\mathrm\{cm\}\$/;
const SIDE_FA = /\$\\overline\{FA\}=\((\d*)x([+-]\d+)\)\\,\\mathrm\{cm\}\$/;

function sideFrom(re: RegExp, content: string, who: string): Side {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 변의 길이 식이 없다 — ${content}`);
  return [m[1] === "" ? 1 : num(m[1]), num(m[2])] as Side;
}

/** 세 점이 한 직선 위인가 — **넓이 행렬식**으로 본다(기울기를 안 쓴다). */
function areaTwice(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
}

const VERIFY: Record<string, (content: string) => string> = {
  // 117X — 닮음을 **안 쓴다.** 좌표와 코사인 제2법칙으로 $\overline{BD}$ 를 낸다.
  "117X": (content) => {
    const [abT, acT, bcT, adT] = grab(RE117, content, "117X");
    const ab = num(abT);
    const ac = num(acT);
    const bc = num(bcT);
    const ad = num(adT);
    if (ad <= 0 || ad >= ac)
      throw new Error("117X: 점 $D$ 가 변 $AC$ 위에 없다");
    if (ab + bc <= ac || ab + ac <= bc || bc + ac <= ab)
      throw new Error("117X: 세 길이가 삼각형을 이루지 않는다");
    // $\mathrm{A}$ 를 원점, $\mathrm{C}$ 를 $(ac,\ 0)$ 에 놓으면
    // $\mathrm{B}=(x_B,\ y_B)$ 이고 $x_B=\dfrac{ab^2+ac^2-bc^2}{2ac}$ 다.
    const xB = rat(ab * ab + ac * ac - bc * bc, 2 * ac);
    // $\overline{BD}^2=(x_B-ad)^2+y_B^2=ab^2+ad^2-2\,ad\,x_B$
    const bd2 = ratSub(rat(ab * ab + ad * ad, 1), ratMul(rat(2 * ad, 1), xB));
    if (bd2[0] <= 0)
      throw new Error("117X: $\\overline{BD}^2$ 이 양수가 아니다");
    const bd = ratSqrt(bd2);
    if (bd === null)
      throw new Error(
        "117X: $\\overline{BD}$ 가 유리수가 아니다 — 닮음이 서지 않는 지면이다",
      );
    if (bd[1] > 8) throw new Error("117X: 답의 분모가 너무 크다");
    // 🔴 지름길 — 답이 정수이고 발문 네 수의 한두 번 연산에 걸리면 찍어서 맞는다.
    if (bd[1] === 1 && pageShortcutValues([ab, ac, ad, bc]).has(bd[0]))
      throw new Error("117X: 발문의 수를 한두 번 연산하면 답이 나온다");
    return `${ratTex(bd)}\\,\\mathrm{cm}`;
  },

  // 118X — 나눗셈도 내림도 안 쓴다. 정수 $a$ 마다 자연수 $x$ 를 **대입해** 센다.
  "118X": (content) => {
    const [pT, qT, rT, nT] = grab(RE118, content, "118X");
    const p = num(pT);
    const q = num(qT);
    const r = num(rT);
    const n = num(nT);
    if (p < 2) throw new Error("118X: 괄호 앞의 수가 $2$ 보다 작다");
    const winners: number[] = [];
    for (let a = -60; a <= r; a += 1) {
      let c = 0;
      let tooMany = false;
      for (let x = 1; x <= 4000; x += 1) {
        if (p * (a * x + q) <= a * x + r) {
          c += 1;
          if (c > n + 1) {
            tooMany = true;
            break;
          }
        } else if (a > 0) {
          // 계수가 양수면 한 번 어긋난 뒤에는 다시 안 맞는다(단조성).
          break;
        }
      }
      if (!tooMany && c === n) winners.push(a);
    }
    if (winners.length < 2)
      throw new Error(
        `118X: 살아남는 $a$ 가 ${winners.length}개뿐이라 「모두 구하여」가 무색하다`,
      );
    if (winners.some((a) => a <= 0))
      throw new Error("118X: $0$ 이하의 $a$ 가 살아남았다 — 셀 수 없는 자리다");
    const sum = winners.reduce((s, v) => s + v, 0);
    if (pageShortcutValues([p, q, r, n]).has(sum))
      throw new Error("118X: 발문의 수를 한두 번 연산하면 답이 나온다");
    return String(sum);
  },

  // 119X — 기울기를 안 쓴다. 넓이 행렬식 + 방향 벡터 + 두 점 절편 공식.
  "119X": (content) => {
    const g = grab(RE119, content, "119X").map(num);
    const pts: Point[] = [
      [g[0]!, g[1]!],
      [g[2]!, g[3]!],
      [g[4]!, g[5]!],
      [g[6]!, g[7]!],
    ];
    const triples: number[][] = [];
    for (let i = 0; i < 4; i += 1)
      for (let j = i + 1; j < 4; j += 1)
        for (let k = j + 1; k < 4; k += 1)
          if (areaTwice(pts[i]!, pts[j]!, pts[k]!) === 0)
            triples.push([i, j, k]);
    if (triples.length === 0)
      throw new Error("119X: 한 직선 위에 있는 세 점이 없다");
    if (triples.length > 1)
      throw new Error(
        `119X: 한 직선 위의 세 점이 ${triples.length}가지라 정해지지 않는다`,
      );
    const tri = triples[0]!;
    const oddAt = [0, 1, 2, 3].find((i) => !tri.includes(i))!;
    const P = pts[oddAt]!;
    const Q1 = pts[tri[0]!]!;
    const Q2 = pts[tri[1]!]!;
    // 평행한 직선의 둘째 점은 **방향 벡터를 더해** 만든다 — 기울기를 안 구한다.
    const R: Point = [P[0] + (Q2[0] - Q1[0]), P[1] + (Q2[1] - Q1[1])];
    if (R[0] === P[0])
      throw new Error("119X: 그 직선이 세로선이라 절편이 없다");
    // 두 점 $(x_1,y_1)$, $(x_2,y_2)$ 를 지나는 직선의 $y$절편은
    // $\dfrac{y_1x_2-y_2x_1}{x_2-x_1}$ 다.
    const b = rat(P[1] * R[0] - R[1] * P[0], R[0] - P[0]);
    if (b[1] !== 1) throw new Error("119X: $y$절편이 정수가 아니다");
    const ans = b[0];
    if (ans === 0) throw new Error("119X: $y$절편이 $0$ 이다");
    const coords = pts.flatMap(([x, y]) => [x, y]);
    const shortcuts = pageShortcutValues(coords);
    if (shortcuts.has(ans) || shortcuts.has(-ans))
      throw new Error("119X: 좌표를 한두 번 연산하면 답이 나온다");
    if (coords.includes(ans) || coords.includes(-ans))
      throw new Error("119X: 좌표 하나를 그대로 집으면 답이 된다");
    return String(ans);
  },

  // 120X — 방정식을 안 푼다. $x$ 를 넣어 보아 대변끼리 같아지는 자리를 **찾는다**.
  "120X": (content) => {
    if (!RE120_HEAD.test(content) || !RE120_TAIL.test(content))
      throw new Error(`120X: 지면 모양이 다르다 — ${content}`);
    const ae = sideFrom(SIDE_AE, content, "120X");
    const cf = sideFrom(SIDE_CF, content, "120X");
    const ec = sideFrom(SIDE_EC, content, "120X");
    const fa = sideFrom(SIDE_FA, content, "120X");
    const at = (s: Side, x: number): number => s[0] * x + s[1];
    const hits: number[] = [];
    for (let x = 1; x <= 300; x += 1) {
      if (at(ae, x) === at(cf, x) && at(ec, x) === at(fa, x)) hits.push(x);
    }
    if (hits.length === 0)
      throw new Error("120X: 대변끼리 같아지는 $x$ 가 없다");
    if (hits.length > 1)
      throw new Error(`120X: 그런 $x$ 가 ${hits.length}가지라 정해지지 않는다`);
    const x0 = hits[0]!;
    const lens = [at(ae, x0), at(cf, x0), at(ec, x0), at(fa, x0)];
    if (lens.some((v) => v <= 0))
      throw new Error("120X: 길이가 양수가 아닌 변이 있다");
    const peri = 2 * (lens[0]! + lens[2]!);
    const printed = [ae[0], ae[1], cf[0], cf[1], ec[0], ec[1], fa[0], fa[1]];
    if (pageShortcutValues(printed).has(peri))
      throw new Error("120X: 발문의 수를 한두 번 연산하면 답이 나온다");
    return `${peri}\\,\\mathrm{cm}`;
  },
};

// ── ⑵ 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────

/** 양성 — 답을 아는 지면에서 그 답이 나온다. */
const CALIBRATION: readonly [string, string, string][] = [
  [
    "117X",
    "삼각형 $ABC$에서 $\\overline{AB}=12\\,\\mathrm{cm}$, $\\overline{AC}=16\\,\\mathrm{cm}$, $\\overline{BC}=14\\,\\mathrm{cm}$이다. 변 $AC$ 위의 점 $D$에 대하여 $\\overline{AD}=9\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.",
    "\\dfrac{21}{2}\\,\\mathrm{cm}",
  ],
  [
    "118X",
    "$x$에 대한 일차부등식 $3(ax+4)\\le ax+206$을 만족시키는 자연수 $x$가 $6$개가 되도록 하는 정수 $a$의 값을 모두 구하여 그 합을 구하시오.",
    "45",
  ],
  [
    "119X",
    "좌표평면 위의 네 점 $\\mathrm{A}(-3, 7)$, $\\mathrm{B}(1, -1)$, $\\mathrm{C}(4, -7)$, $\\mathrm{D}(5, 3)$ 가운데 세 점은 한 직선 위에 있다. 그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 $y$절편을 구하시오.",
    "13",
  ],
  [
    "120X",
    "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. 대각선 $BD$ 위에 $\\overline{BE}=\\overline{DF}$가 되도록 두 점 $E$, $F$를 잡았다. $\\overline{AE}=(3x+1)\\,\\mathrm{cm}$, $\\overline{CF}=(x+7)\\,\\mathrm{cm}$, $\\overline{EC}=(2x+1)\\,\\mathrm{cm}$, $\\overline{FA}=(x+4)\\,\\mathrm{cm}$일 때, $\\square AECF$의 둘레의 길이를 구하시오.",
    "34\\,\\mathrm{cm}",
  ],
];

/**
 * 음성 — 불변식을 어긴 지면은 **던진다.**
 *
 * 🔴 눈금은 **자기 축을 홀로 갈라야** 한다. 4차에서 여덟 개가 「다른 불변식에도 걸려」
 * 아무것도 못 재고 있었다. 그래서 여기 지면은 **재려는 축 하나만** 어기게 지었다.
 */
const REJECTS: readonly [string, string, string][] = [
  [
    "117X",
    "곱셈 관계가 안 서면 $\\overline{BD}$ 가 유리수가 아니다",
    "삼각형 $ABC$에서 $\\overline{AB}=12\\,\\mathrm{cm}$, $\\overline{AC}=16\\,\\mathrm{cm}$, $\\overline{BC}=14\\,\\mathrm{cm}$이다. 변 $AC$ 위의 점 $D$에 대하여 $\\overline{AD}=8\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.",
  ],
  [
    "117X",
    "세 길이가 삼각형을 이루지 않는다",
    "삼각형 $ABC$에서 $\\overline{AB}=6\\,\\mathrm{cm}$, $\\overline{AC}=24\\,\\mathrm{cm}$, $\\overline{BC}=5\\,\\mathrm{cm}$이다. 변 $AC$ 위의 점 $D$에 대하여 $\\overline{AD}=3\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.",
  ],
  [
    "117X",
    "점 $D$ 가 변 $AC$ 밖에 있다",
    "삼각형 $ABC$에서 $\\overline{AB}=12\\,\\mathrm{cm}$, $\\overline{AC}=16\\,\\mathrm{cm}$, $\\overline{BC}=14\\,\\mathrm{cm}$이다. 변 $AC$ 위의 점 $D$에 대하여 $\\overline{AD}=20\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.",
  ],
  [
    "117X",
    "발문의 두 수를 나누면 답이 나온다 (지름길)",
    "삼각형 $ABC$에서 $\\overline{AB}=10\\,\\mathrm{cm}$, $\\overline{AC}=20\\,\\mathrm{cm}$, $\\overline{BC}=20\\,\\mathrm{cm}$이다. 변 $AC$ 위의 점 $D$에 대하여 $\\overline{AD}=5\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.",
  ],
  [
    "118X",
    "살아남는 $a$ 가 하나뿐이라 「모두 구하여」가 무색하다",
    "$x$에 대한 일차부등식 $3(ax+4)\\le ax+206$을 만족시키는 자연수 $x$가 $7$개가 되도록 하는 정수 $a$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "118X",
    "살아남는 $a$ 가 하나도 없다",
    "$x$에 대한 일차부등식 $3(ax+4)\\le ax+206$을 만족시키는 자연수 $x$가 $9$개가 되도록 하는 정수 $a$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "118X",
    "발문의 두 수를 곱하면 답이 나온다 (지름길)",
    "$x$에 대한 일차부등식 $3(ax+1)\\le ax+83$을 만족시키는 자연수 $x$가 $5$개가 되도록 하는 정수 $a$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "119X",
    "네 점이 모두 한 직선 위에 있다",
    "좌표평면 위의 네 점 $\\mathrm{A}(-3, 7)$, $\\mathrm{B}(1, -1)$, $\\mathrm{C}(4, -7)$, $\\mathrm{D}(2, -3)$ 가운데 세 점은 한 직선 위에 있다. 그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 $y$절편을 구하시오.",
  ],
  [
    "119X",
    "한 직선 위의 세 점이 없다",
    "좌표평면 위의 네 점 $\\mathrm{A}(-3, 7)$, $\\mathrm{B}(1, -1)$, $\\mathrm{C}(4, -6)$, $\\mathrm{D}(5, 3)$ 가운데 세 점은 한 직선 위에 있다. 그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 $y$절편을 구하시오.",
  ],
  [
    "119X",
    "$y$절편이 정수가 아니다",
    "좌표평면 위의 네 점 $\\mathrm{A}(-2, 0)$, $\\mathrm{B}(0, 1)$, $\\mathrm{C}(2, 2)$, $\\mathrm{D}(1, 5)$ 가운데 세 점은 한 직선 위에 있다. 그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 $y$절편을 구하시오.",
  ],
  [
    "119X",
    "좌표 하나가 그대로 답이다 (지름길)",
    "좌표평면 위의 네 점 $\\mathrm{A}(-3, 7)$, $\\mathrm{B}(1, -1)$, $\\mathrm{C}(4, -7)$, $\\mathrm{D}(5, -6)$ 가운데 세 점은 한 직선 위에 있다. 그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 $y$절편을 구하시오.",
  ],
  [
    "120X",
    "두 쌍이 서로 다른 $x$ 를 주어 대변끼리 같아지는 자리가 없다",
    "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. 대각선 $BD$ 위에 $\\overline{BE}=\\overline{DF}$가 되도록 두 점 $E$, $F$를 잡았다. $\\overline{AE}=(3x+4)\\,\\mathrm{cm}$, $\\overline{CF}=(x+14)\\,\\mathrm{cm}$, $\\overline{EC}=(2x-3)\\,\\mathrm{cm}$, $\\overline{FA}=(4x-11)\\,\\mathrm{cm}$일 때, $\\square AECF$의 둘레의 길이를 구하시오.",
  ],
  [
    "120X",
    "$x$ 가 정수가 아니다",
    "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. 대각선 $BD$ 위에 $\\overline{BE}=\\overline{DF}$가 되도록 두 점 $E$, $F$를 잡았다. $\\overline{AE}=(2x+1)\\,\\mathrm{cm}$, $\\overline{CF}=(4x-2)\\,\\mathrm{cm}$, $\\overline{EC}=(2x-3)\\,\\mathrm{cm}$, $\\overline{FA}=(4x-6)\\,\\mathrm{cm}$일 때, $\\square AECF$의 둘레의 길이를 구하시오.",
  ],
  [
    "120X",
    "길이가 음수가 되는 변이 있다",
    "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. 대각선 $BD$ 위에 $\\overline{BE}=\\overline{DF}$가 되도록 두 점 $E$, $F$를 잡았다. $\\overline{AE}=(3x-20)\\,\\mathrm{cm}$, $\\overline{CF}=(x-4)\\,\\mathrm{cm}$, $\\overline{EC}=(2x-30)\\,\\mathrm{cm}$, $\\overline{FA}=(4x-46)\\,\\mathrm{cm}$일 때, $\\square AECF$의 둘레의 길이를 구하시오.",
  ],
  [
    "120X",
    "발문의 두 수를 곱하면 둘레가 나온다 (지름길)",
    "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. 대각선 $BD$ 위에 $\\overline{BE}=\\overline{DF}$가 되도록 두 점 $E$, $F$를 잡았다. $\\overline{AE}=(2x+2)\\,\\mathrm{cm}$, $\\overline{CF}=(x+4)\\,\\mathrm{cm}$, $\\overline{EC}=(3x+4)\\,\\mathrm{cm}$, $\\overline{FA}=(x+8)\\,\\mathrm{cm}$일 때, $\\square AECF$의 둘레의 길이를 구하시오.",
  ],
];

describe("중2 확대 갈래 5차 e — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, _why, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });

  it("🔴 눈금이 네 유형을 **모두** 덮는다 — 안 덮인 유형의 «0» 은 못 셈이다", () => {
    for (const t of ["117X", "118X", "119X", "120X"]) {
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

describe("중2 확대 갈래 5차 e — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5E.length).toBe(4);
    expect(M2_TOP_5E.map((e) => e.rpmType)).toEqual([
      "117X",
      "118X",
      "119X",
      "120X",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5E) {
      expect(isCatalogType(e), `${e.key} 는 색인에 없어야 한다`).toBe(false);
      expect(extensionNumberReason(e), e.key).toBeNull();
      expect(
        e.rpmType.endsWith("X"),
        `${e.key} 는 5차 물결 접미사여야 한다`,
      ).toBe(true);
      const titles = new Set(
        catalogTypesOfMinor(e.rpmBook, e.rpmMinor).map((t) => t.title),
      );
      expect(
        titles.has(e.rpmTitle),
        `${e.key} 의 제목이 색인 제목과 겹친다`,
      ).toBe(false);
    }
  });

  it("🔴 소단원·중단원 이름을 **정본에 대조**한다 — 브리프도 손도 믿지 않는다", () => {
    // 🔴 이 검사가 ⑸ 의 판단을 매번 다시 확인한다 — 브리프가 준 두 이름
    //    (「유한소수와 순환소수」·「평행선과 선분의 길이의 비」)은 여기서 빨개진다.
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    expect(sections.has("유한소수와 순환소수")).toBe(false);
    expect(sections.has("평행선과 선분의 길이의 비")).toBe(false);
    for (const e of M2_TOP_5E) {
      expect(e.grade).toBe("중2");
      expect(["2-1", "2-2"]).toContain(e.rpmBook);
      expect(
        sections.has(e.unitSection),
        `${e.key} 의 소단원 «${e.unitSection}» 가 단원 정본에 없다`,
      ).toBe(true);
      // 중단원은 RPM 색인이 정본이다 — 없는 이름이면 색인 조회가 조용히 빗나간다.
      expect(
        catalogTypesOfMinor(e.rpmBook, e.rpmMinor).length,
        `${e.key} 의 중단원 «${e.rpmMinor}» 가 색인에 없다`,
      ).toBeGreaterThan(0);
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
    }
  });

  it("🔴 `119X` 의 중단원 이름에 **가는 공백 U+2009** 가 실제로 들어 있다", () => {
    // 보통 공백 둘로 치면 눈으로는 같고 조회만 조용히 빗나간다 — 그 자리를 못 박는다.
    expect(E119.rpmMinor.includes("\u2009")).toBe(true);
    expect(E119.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑵");
  });

  it("네 유형이 어느 소단원에 붙는지 못 박는다", () => {
    expect(
      M2_TOP_5E.map((e) => [e.rpmBook, e.rpmType, e.rpmMinor, e.unitSection]),
    ).toEqual([
      ["2-2", "117X", "도형의 닮음", "삼각형의 닮음 조건"],
      ["2-1", "118X", "일차부등식", "일차부등식의 응용"],
      ["2-1", "119X", "일차함수와 그 그래프\u2009 ⑵", "일차함수의 식 구하기"],
      ["2-2", "120X", "평행사변형", "평행사변형이 되는 조건"],
    ]);
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_5E) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !M2_TOP_5E.includes(t),
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
    const foreign = registeredTypes().filter((e) => !M2_TOP_5E.includes(e));
    for (const e of M2_TOP_5E) {
      expect(
        foreign.some((f) => f.key === e.key),
        `${e.key} 가 남의 모듈과 겹친다`,
      ).toBe(false);
    }
  });

  it("🔴 갈래가 «심화중»과 «심화상»을 **둘 다** 낸다 (브리프 요구)", () => {
    const tiers = new Set(Object.values(EXPECTED_TIER));
    expect(tiers.has("심화중")).toBe(true);
    expect(tiers.has("심화상")).toBe(true);
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5E) {
      for (const p of rows(e, 60)) {
        expect(p.difficulty, e.key).toBe(EXPECTED_TIER[e.rpmType]);
        // 🔴 제품 함수를 **그대로 부른다** — 규칙을 여기 옮겨 적지 않는다(D-106).
        expect(
          resolveMiddleTier(p.difficulty, p.content, !!p.figureSpec),
          e.key,
        ).toBe(EXPECTED_TIER[e.rpmType]);
      }
    }
  });
});

describe("중2 확대 갈래 5차 e — 지면과 값", () => {
  for (const e of M2_TOP_5E) {
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
          const f = p.facts;
          const rebuilt =
            e.rpmType === "117X"
              ? `$${fracTex(f.x!, f.den!)}\\,\\mathrm{cm}$`
              : e.rpmType === "120X"
                ? `$${f.x}\\,\\mathrm{cm}$`
                : `$${f.x}$`;
          expect(rebuilt, p.content).toBe(p.answer);
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·(으)로·맨 숫자·그림 지시·상한 선언", () => {
        for (const p of sample()) {
          const both = `${p.content}\n${p.solution}\n${p.answer}`;
          expect(brokenRender(both), p.content).toBe(false);
          expect(pageSmells(both), p.content).toEqual([]);
          expect(josaMismatches(both), p.content).toEqual([]);
          expect(euroRoMismatches(both), p.content).toEqual([]);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(pointsAtFigure(p.content), p.content).toBeNull();
          // ㉱ 발문이 상한을 **선언하지 않는다** — 그러면 파생 오답이 그것을 넘을 수 없다.
          expect(declaredUpperBound(p.content), p.content).toBeNull();
          expect(p.figureSpec, p.content).toBeNull();
        }
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.content).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // 🔴 0 은 «깨끗»이 아니라 «못 셈»이다 — 네 유형 모두 판마다 **적어도 하나**를
        //    적는다(`117X`·`120X` 는 여럿, `118X`·`119X` 는 하나씩이다).
        expect(claims, `${e.rpmType} 산술 주장 수`).toBeGreaterThanOrEqual(
          SAMPLE,
        );
      });

      it("🔴 지면의 모든 분수가 기약이고 분모가 $1$ 이 아니다", () => {
        let seen = 0;
        for (const p of sample()) {
          const both = `${p.content}\n${p.solution}\n${p.answer}`;
          expect(unreducedFractions(both), p.content).toEqual([]);
          seen += fractionCount(both);
        }
        // 🔴 「몇 개를 봤나」를 유형마다 못 박는다 — `118X`·`120X` 의 0 은
        //    «못 셈»이 아니라 **«잴 것이 없다»** 다(분수를 안 쓰거나 분모가 문자다).
        if (e.rpmType === "117X" || e.rpmType === "119X") {
          expect(seen, `${e.rpmType} 가 본 분수`).toBeGreaterThan(0);
        } else {
          expect(seen, `${e.rpmType} 는 분수를 안 쓴다`).toBe(0);
        }
      });

      it(`🔴 해설이 정답지 한 단을 안 넘는다 — ${WIDE}판에서 최대 700px 미만`, () => {
        let max = 0;
        let worst = "";
        for (const p of rows(e, WIDE)) {
          const px = estimateSolutionPx(p.solution);
          if (px > max) {
            max = px;
            worst = p.solution;
          }
        }
        expect(max, `${e.rpmType} 최대 해설 높이\n${worst}`).toBeLessThan(700);
      });

      it(`🔴 변형 폭과 정답 쏠림 (씨앗 블록 ${SEED_BLOCKS.length} × ${WIDE}판)`, () => {
        // 변형 폭 — 같은 씨앗에서 `variant` 를 돌려 **서로 다른** 발문이 나오는가.
        const floor = VARIANT_FLOOR[e.rpmType]!;
        const seen = new Set<string>();
        for (let v = 0; v < floor * 2; v += 1) {
          seen.add(
            e.handler(createRng(BASE_SEED + 12345 + v * 0x9e37)).content,
          );
        }
        expect(seen.size, `${e.rpmType} 변형 폭`).toBeGreaterThanOrEqual(floor);

        for (const block of SEED_BLOCKS) {
          const counts = new Map<string, number>();
          for (const p of rows(e, WIDE, block))
            counts.set(p.answer, (counts.get(p.answer) ?? 0) + 1);
          const top = Math.max(...counts.values());
          expect(
            (top / WIDE) * 100,
            `${e.rpmType} 블록 ${block} 최빈 정답`,
          ).toBeLessThan(SKEW_LIMIT);
        }
      });

      it("등록되면 진짜 파이프라인으로도 같은 계약을 지킨다", () => {
        const prod = productRows(e);
        if (prod.length === 0) {
          // 🔴 조용히 통과시키지 않는다 — 「아직 등록 전」임을 스스로 찍는다.
          expect(
            registeredKeys.has(e.key),
            `${e.key} 미등록 (리드가 등록)`,
          ).toBe(false);
          return;
        }
        for (const p of prod) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
          expect(p.difficulty, p.content).toBe(EXPECTED_TIER[e.rpmType]);
          expect(estimateSolutionPx(p.solution), p.content).toBeLessThan(700);
        }
        // 변형 공간이 좁아 세트를 못 채우면 던진다 — 그 자리를 여기서 확인한다.
        expect(
          generateMiddleSet(e.key, BASE_SEED, VARIANT_FLOOR[e.rpmType]!).length,
        ).toBe(VARIANT_FLOOR[e.rpmType]);
      });
    });
  }
});

describe("중2 확대 갈래 5차 e — 🔴 해설의 중간값·말을 다른 길로 다시 잰다", () => {
  it("`117X` — 곱 두 줄·닮음비·대응변·마무리 계산을 **넷 다** 맞댄다", () => {
    for (const p of rows(E117)) {
      const [abT, acT, bcT, adT] = grab(RE117, p.content, "117X");
      const ab = num(abT);
      const ac = num(acT);
      const bc = num(bcT);
      const ad = num(adT);

      // ㄷ 굳힘 개념의 낱말 — 뒤집으면 빨개진다.
      const sasLine = lineWith(p.solution, "$\\mathrm{SAS}$ 닮음", "117X");
      expect(sasLine, p.content).toContain(
        "끼고 있는 두 변의 길이의 비가 같으므로",
      );
      expect(lineWith(p.solution, "$\\angle A$", "117X"), p.content).toContain(
        "공통",
      );

      // 두 곱셈 줄 — 값을 **여기서 다시 계산**해 맞댄다.
      const sq = lineWith(p.solution, "\\overline{AB}^{\\,2}", "117X");
      expect(sq, p.content).toContain(`${ab}\\times${ab}=${ab * ab}`);
      expect(sq, p.content).toContain(`${ad}\\times${ac}=${ad * ac}`);
      expect(ab * ab, p.content).toBe(ad * ac);

      // 닮음비 — 기약으로 줄인 값을 **다른 코드**로 다시 짓는다.
      const [rn, rd] = rat(ab, ac);
      expect(sasLine, p.content).toContain(`${ab}:${ac}=${rn}:${rd}`);
      expect(rd, "닮음비의 뒷항은 반드시 $2$ 이상이다").toBeGreaterThan(1);

      // 대응변 줄 — 「$\overline{CB}$ 에 대응한다」가 지워지면 빨개진다.
      const corr = lineWith(p.solution, "대응하는 변은", "117X");
      expect(corr, p.content).toContain("$\\overline{CB}$");
      expect(corr, p.content).toContain(`${rn}:${rd}$이고`);

      // 마무리 — 분자를 곱의 꼴로 적고, 그 값이 독립 검산과 같다.
      const last = lineWith(p.solution, "따라서 $\\overline{BD}", "117X");
      expect(last, p.content).toContain(`\\dfrac{${rn}\\times${bc}}{${rd}}`);
      expect(last, p.content).toContain(
        `=${plainAnswer(p.answer).replace("\\,\\mathrm{cm}", "")}\\,(\\mathrm{cm})`,
      );
    }
  });

  it("`118X` — 나열 줄의 개수를 **하나씩 다시 세고** 후보 목록·합 줄과 셋 다 맞댄다", () => {
    let seenTotal = 0;
    for (const p of rows(E118)) {
      const [pT, qT, rT, nT] = grab(RE118, p.content, "118X");
      const pp = num(pT);
      const q = num(qT);
      const r = num(rT);
      const n = num(nT);
      const b = (r - pp * q) / (pp - 1);
      expect(Number.isInteger(b), p.content).toBe(true);

      // ⑴ 「$ax\le b$」로 정리한 줄이 실제로 그 값인가 — 대입해 확인한다.
      const head = lineWith(p.solution, "괄호를 풀면", "118X");
      expect(head, p.content).toContain(`즉 $ax\\le${b}$이다.`);
      expect(
        pp * (1 * b + q) <= 1 * b + r,
        "정리한 값이 원래 부등식과 맞는가",
      ).toBe(true);

      // ⑵ 죽는 후보 둘 — 「$a=0$」과 「음의 정수」가 **왜** 죽는지 적혀 있다.
      const zero = lineWith(p.solution, "$a=0$이면", "118X");
      expect(zero, p.content).toContain("모든 자연수 $x$가 해가 되므로");
      const neg = lineWith(p.solution, "음의 정수", "118X");
      expect(neg, p.content).toContain("부등호의 방향이 바뀌어");
      expect(neg, p.content).toContain("음수이므로");

      // ⑶ 「자연수」 제약을 세운 뒤에만 후보를 늘어놓는다 (㉴).
      const lines = p.solution.split("\n");
      const declAt = lines.findIndex((l) => l.includes("$a$는 자연수이고"));
      const listAt = lines.findIndex((l) => l.includes("작은 것부터 넣어"));
      expect(declAt, p.content).toBeGreaterThan(-1);
      expect(listAt, p.content).toBeGreaterThan(declAt);

      // ⑷ 나열 줄의 개수를 **하나씩 다시 센다** (공용 훑개가 못 보는 축).
      const step = countStepFault(p.solution, b);
      expect(step.fault, p.content).toBeNull();
      expect(step.seen, p.content).toBeGreaterThanOrEqual(3);
      seenTotal += step.seen;

      // ⑸ **나열 줄**의 모든 $a$ 가 자연수이고 $0$·음수가 안 섞였다 (㉴).
      //    ⚠️ 해설 전체에 대고 세면 「$a=0$이면 …」이라는 **죽는 후보 줄**이 걸린다 —
      //       그 줄은 제약을 세우기 **전**이라 옳다. 그래서 나열 줄만 본다.
      const listLine = lineWith(p.solution, "작은 것부터 넣어", "118X");
      for (const m of listLine.matchAll(/\$a=(-?\d+)\$이면/g))
        expect(num(m[1]), p.content).toBeGreaterThan(0);
      // 그리고 「$a=0$」·「음의 정수」 줄은 제약 선언 **앞**에 있어야 한다.
      expect(
        lines.findIndex((l) => l.includes("$a=0$이면")),
        p.content,
      ).toBeLessThan(declAt);

      // ⑹ 후보 목록 ↔ 나열 ↔ 합 줄을 **셋 다** 맞댄다.
      const winners = [...p.solution.matchAll(/개인 것은 (.+?)뿐이다/g)];
      expect(winners.length, p.content).toBe(1);
      const listed = [...winners[0]![1]!.matchAll(/\$a=(\d+)\$/g)].map((m) =>
        num(m[1]),
      );
      const truth: number[] = [];
      for (let a = 1; a <= b; a += 1) {
        let c = 0;
        for (let x = 1; a * x <= b; x += 1) c += 1;
        if (c === n) truth.push(a);
      }
      expect(listed, p.content).toEqual(truth);
      const sum = truth.reduce((s, v) => s + v, 0);
      const tail = lineWith(p.solution, "따라서 구하는 합은", "118X");
      expect(tail, p.content).toContain(`$${truth.join("+")}=${sum}$`);
      expect(plainAnswer(p.answer), p.content).toBe(String(sum));
      expect(lineWith(p.solution, "커질수록", "118X"), p.content).toContain(
        "작아지므로",
      );
    }
    expect(seenTotal, "`118X` 가 다시 센 개수 주장").toBeGreaterThan(
      SAMPLE * 3,
    );
  });

  it("`119X` — 기울기 줄을 **다시 계산**하고 한 직선 위의 셋·평행·대입을 맞댄다", () => {
    for (const p of rows(E119)) {
      const g = grab(RE119, p.content, "119X").map(num);
      const pts: Point[] = [
        [g[0]!, g[1]!],
        [g[2]!, g[3]!],
        [g[4]!, g[5]!],
        [g[6]!, g[7]!],
      ];
      const names = ["A", "B", "C", "D"];

      // ⑴ 지면에 적힌 모든 기울기 조각을 **다시 계산**해 맞댄다.
      const pieces = [
        ...p.solution.matchAll(
          /\$\\mathrm\{([A-D])\}\$, \$\\mathrm\{([A-D])\}\$에서 \$\\dfrac\{(-?\d+)-\(?(-?\d+)\)?\}\{(-?\d+)-\(?(-?\d+)\)?\}=(-?(?:\\dfrac\{\d+\}\{\d+\}|\d+))\$/g,
        ),
      ];
      expect(pieces.length, p.content).toBeGreaterThanOrEqual(3);
      for (const m of pieces) {
        const i = names.indexOf(m[1]!);
        const j = names.indexOf(m[2]!);
        expect(num(m[3]), p.content).toBe(pts[j]![1]);
        expect(num(m[4]), p.content).toBe(pts[i]![1]);
        expect(num(m[5]), p.content).toBe(pts[j]![0]);
        expect(num(m[6]), p.content).toBe(pts[i]![0]);
        const want = rat(pts[j]![1] - pts[i]![1], pts[j]![0] - pts[i]![0]);
        expect(m[7], p.content).toBe(ratTex(want));
      }

      // ⑵ 「한 직선 위에 있는 세 점」과 「그 위에 있지 않은 점」이 실제로 그러한가.
      const claim = grab(
        /한 직선 위에 있는 세 점은 \$\\mathrm\{([A-D])\}\$, \$\\mathrm\{([A-D])\}\$, \$\\mathrm\{([A-D])\}\$이(?:고, |며 )그 직선 위에 있지 않은 점은 \$\\mathrm\{([A-D])\}\$이다\./,
        p.solution,
        "119X",
      );
      const tri = claim.slice(0, 3).map((s) => names.indexOf(s));
      const oddAt = names.indexOf(claim[3]!);
      expect(
        areaTwice(pts[tri[0]!]!, pts[tri[1]!]!, pts[tri[2]!]!),
        p.content,
      ).toBe(0);
      expect(tri.includes(oddAt), p.content).toBe(false);
      expect(
        areaTwice(pts[tri[0]!]!, pts[tri[1]!]!, pts[oddAt]!),
        p.content,
      ).not.toBe(0);

      // ⑶ 「모두 다르므로」 갈래는 기준 점이 **정말** 직선 밖일 때만 나온다.
      const branchB = p.solution.includes("세 기울기가 모두 다르므로");
      expect(branchB, p.content).toBe(oddAt === 0);

      // ⑷ 평행 근거와 대입 줄 — 낱말과 값을 함께 본다.
      const par = lineWith(p.solution, "평행한 두 직선", "119X");
      expect(par, p.content).toContain("기울기는 같으므로");
      const slope = rat(
        pts[tri[1]!]![1] - pts[tri[0]!]![1],
        pts[tri[1]!]![0] - pts[tri[0]!]![0],
      );
      expect(slope[1], p.content).toBe(1);
      expect(par, p.content).toContain(`기울기도 $${slope[0]}$이다.`);
      const sub = lineWith(p.solution, "구하는 직선의 식을", "119X");
      // 조사(을/를)는 끝 수의 읽기로 갈린다 — 맞는지는 `middleJosaAll.test.ts` 가 본다.
      const via = `점 $\\mathrm{${names[oddAt]}}(${pts[oddAt]![0]}, ${pts[oddAt]![1]})$`;
      expect(
        [`${via}을 지나므로`, `${via}를 지나므로`].some((s) => sub.includes(s)),
        `${p.content}\n${sub}`,
      ).toBe(true);
      const ans = pts[oddAt]![1] - slope[0] * pts[oddAt]![0];
      expect(plainAnswer(p.answer), p.content).toBe(String(ans));
      expect(
        lineWith(p.solution, "구하는 $y$절편은", "119X"),
        p.content,
      ).toContain(`$${ans}$이다.`);
    }
  });

  it("`120X` — 이등분 근거·대변 짝·두 값 확인·둘레를 **넷 다** 맞댄다", () => {
    for (const p of rows(E120)) {
      const ae = sideFrom(SIDE_AE, p.content, "120X");
      const cf = sideFrom(SIDE_CF, p.content, "120X");
      const ec = sideFrom(SIDE_EC, p.content, "120X");
      const fa = sideFrom(SIDE_FA, p.content, "120X");
      const at = (s: Side, x: number): number => s[0] * x + s[1];

      // ⑴ 굳힘 근거 — 「서로 다른 것을 이등분」이 **두 번** 나온다(바깥과 안쪽).
      const outer = lineWith(
        p.solution,
        "$\\overline{OA}=\\overline{OC}$",
        "120X",
      );
      expect(outer, p.content).toContain(
        "두 대각선은 서로 다른 것을 이등분하므로",
      );
      const inner = lineWith(p.solution, "평행사변형이다.", "120X");
      expect(inner, p.content).toContain("서로 다른 것을 이등분하므로");
      expect(inner, p.content).toContain("$\\overline{AC}$와 $\\overline{EF}$");
      const mid = lineWith(p.solution, "$\\overline{OE}", "120X");
      expect(mid, p.content).toContain(
        "$\\overline{OE}=\\overline{OB}-\\overline{BE}=\\overline{OD}-\\overline{DF}=\\overline{OF}$",
      );

      // ⑵ 대변 짝 — 「대변」이라는 낱말과 **어느 둘이 짝인지**를 함께 본다.
      const pair = lineWith(p.solution, "두 쌍의 대변", "120X");
      expect(pair, p.content).toContain("길이는 각각 같으므로");
      expect(pair, p.content).toContain(
        "$\\overline{AE}=\\overline{CF}$, $\\overline{EC}=\\overline{FA}$",
      );

      // ⑶ 방정식 줄 — $x$ 를 **찾아** 두고 지면의 값과 맞댄다.
      const hits: number[] = [];
      for (let x = 1; x <= 300; x += 1)
        if (at(ae, x) === at(cf, x) && at(ec, x) === at(fa, x)) hits.push(x);
      expect(hits.length, p.content).toBe(1);
      const x0 = hits[0]!;
      const eq = lineWith(p.solution, "에서 $" + linTex(ae[0], ae[1]), "120X");
      expect(eq, p.content).toContain(
        `$${coefTex(ae[0] - cf[0])}=${cf[1] - ae[1]}$, 즉 $x=${x0}$이다.`,
      );

      // ⑷ 나머지 한 쌍이 그 $x$ 에서 실제로 같은지 지면이 **확인해 적는다**.
      const check = lineWith(p.solution, "도 성립한다.", "120X");
      expect(check, p.content).toContain(`=${at(ec, x0)}$`);
      expect(check, p.content).toContain(`=${at(fa, x0)}$`);
      expect(at(ec, x0), p.content).toBe(at(fa, x0));

      // ⑸ 둘레 — 두 변의 합의 두 배.
      const peri = 2 * (at(ae, x0) + at(ec, x0));
      const tail = lineWith(p.solution, "둘레의 길이는", "120X");
      expect(tail, p.content).toContain(
        `$2\\times(${at(ae, x0)}+${at(ec, x0)})=2\\times${at(ae, x0) + at(ec, x0)}=${peri}\\,(\\mathrm{cm})$`,
      );
      expect(plainAnswer(p.answer), p.content).toBe(`${peri}\\,\\mathrm{cm}`);
    }
  });
});

/** 지수는 값이 아니다 — `\overline{AB}^{\,2}` 의 $2$ 를 «설명되지 않는 수»로 세면 안 된다. */
function stripExponents(text: string): string {
  return text.replace(/\^\{[^}]*\}/g, "").replace(/\^\d+/g, "");
}

/**
 * 🔴 「이 수는 어디서 왔나」 — **발문의 수와 독립 검산이 실제로 낳은 값**만 모은다.
 *
 * ⚠️ `facts` 를 **안 쓴다.** 생성기가 적어 준 값을 그대로 허락하면 이 자는
 *    「생성기가 쓴 수가 지면에 있다」는 **동어반복**이 된다(2026-08-18).
 *    아래 값들은 전부 이 파일이 `content` 에서 다시 계산한 것이다.
 */
function explainedValues(type: string, content: string): Set<number> {
  const out = new Set<number>();
  const add = (v: number): void => {
    if (Number.isFinite(v)) {
      out.add(v);
      out.add(-v);
    }
  };
  const stem = mathIntegers(content);
  for (const v of stem) add(v);
  for (const a of stem)
    for (const b of stem) {
      add(a + b);
      add(a - b);
      add(a * b);
      if (b !== 0 && a % b === 0) add(a / b);
    }
  add(2); // 「두 배」·「제곱」의 $2$

  if (type === "117X") {
    const [ab, ac, bc, ad] = grab(RE117, content, "117X").map(num);
    add(ab! * ab!);
    add(ad! * ac!);
    const [rn, rd] = rat(ab!, ac!);
    add(rn);
    add(rd);
    add(rn * bc!);
    const bd = rat(bc! * rn, rd);
    add(bd[0]);
    add(bd[1]);
  } else if (type === "118X") {
    const [p, q, r, n] = grab(RE118, content, "118X").map(num);
    const b = (r! - p! * q!) / (p! - 1);
    add(b);
    add(p! * q!);
    add(p! - 1);
    add(r! - p! * q!); // 정리 줄의 오른쪽 — $(p-1)b$ 와 같은 값이다
    const count = (a: number): number => {
      let c = 0;
      for (let x = 1; a * x <= b; x += 1) c += 1;
      return c;
    };
    const winners: number[] = [];
    for (let a = 1; a <= b; a += 1) if (count(a) === n) winners.push(a);
    const lo = winners[0]!;
    const hi = winners[winners.length - 1]!;
    for (let a = lo - 1; a <= hi + 1; a += 1) {
      add(a);
      add(count(a));
    }
    add(winners.reduce((s, v) => s + v, 0));
  } else if (type === "119X") {
    const g = grab(RE119, content, "119X").map(num);
    const pts: Point[] = [
      [g[0]!, g[1]!],
      [g[2]!, g[3]!],
      [g[4]!, g[5]!],
      [g[6]!, g[7]!],
    ];
    for (let i = 0; i < 4; i += 1)
      for (let j = 0; j < 4; j += 1) {
        if (i === j || pts[i]![0] === pts[j]![0]) continue;
        const s = rat(pts[j]![1] - pts[i]![1], pts[j]![0] - pts[i]![0]);
        add(s[0]);
        add(s[1]);
        for (const P of pts) {
          if (s[1] !== 1) continue;
          add(s[0] * P[0]);
          add(P[1] - s[0] * P[0]);
        }
      }
  } else {
    const ae = sideFrom(SIDE_AE, content, "120X");
    const cf = sideFrom(SIDE_CF, content, "120X");
    const ec = sideFrom(SIDE_EC, content, "120X");
    const fa = sideFrom(SIDE_FA, content, "120X");
    const at = (s: Side, x: number): number => s[0] * x + s[1];
    for (let x = 1; x <= 300; x += 1) {
      if (at(ae, x) !== at(cf, x) || at(ec, x) !== at(fa, x)) continue;
      add(x);
      const la = at(ae, x);
      const le = at(ec, x);
      add(la);
      add(le);
      add(la + le);
      add(2 * (la + le));
    }
    add(ae[0] - cf[0]);
    add(cf[1] - ae[1]);
  }
  return out;
}

describe("중2 확대 갈래 5차 e — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  for (const e of M2_TOP_5E) {
    it(`${e.rpmType} — 발문과 독립 검산이 낳은 값만 지면에 있다`, () => {
      for (const p of rows(e, 80)) {
        const explained = explainedValues(e.rpmType, p.content);
        for (const v of mathIntegers(p.answer)) {
          explained.add(v);
          explained.add(-v);
        }
        const unexplained = mathIntegers(stripExponents(p.solution)).filter(
          (v) => !explained.has(v),
        );
        expect(unexplained, `${p.content}\n${p.solution}`).toEqual([]);
      }
    });
  }
});

describe("중2 확대 갈래 5차 e — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`117X` — 발문 네 수의 한두 번 연산이 답과 늘 다르다", () => {
    for (const p of rows(E117)) {
      const [ab, ac, bc, ad] = grab(RE117, p.content, "117X").map(num);
      const f = p.facts;
      if (f.den === 1)
        expect(
          pageShortcutValues([ab!, ac!, bc!, ad!]).has(f.x!),
          p.content,
        ).toBe(false);
      // 분수 답은 그 자가 구조적으로 못 본다 — 「분수인 판이 얼마나 되는가」를 찍는다.
      expect(f.den, p.content).toBeGreaterThan(0);
    }
    const fracShare =
      rows(E117, WIDE).filter((p) => p.facts.den! > 1).length / WIDE;
    // 🔴 이 줄은 「지름길 자가 무엇을 못 보는가」를 **세어서** 남긴다.
    expect(fracShare, "분수 답의 비율").toBeGreaterThan(0.1);
  });

  it("`118X` — 후보 목록의 어느 자리도 답이 아니고 발문 수와도 다르다", () => {
    for (const p of rows(E118)) {
      const [pp, q, r, n] = grab(RE118, p.content, "118X").map(num);
      const sum = p.facts.x!;
      expect(pageShortcutValues([pp!, q!, r!, n!]).has(sum), p.content).toBe(
        false,
      );
      expect([p.facts.lo, p.facts.hi, p.facts.bound, r, n]).not.toContain(sum);
    }
  });

  it("`119X` — 좌표 여덟 수의 한두 번 연산이 답과 늘 다르다 (부호 포함)", () => {
    for (const p of rows(E119)) {
      const coords = grab(RE119, p.content, "119X").map(num);
      const ans = p.facts.x!;
      const s = pageShortcutValues(coords);
      expect(s.has(ans) || s.has(-ans), p.content).toBe(false);
      expect(coords.includes(ans) || coords.includes(-ans), p.content).toBe(
        false,
      );
      // 원래 직선의 $y$절편을 그대로 집으면 틀린다.
      expect(p.facts.lineIntercept, p.content).not.toBe(ans);
    }
  });

  it("`120X` — 여덟 수의 한두 번 연산이 둘레와 늘 다르고 한 변의 두 배도 아니다", () => {
    for (const p of rows(E120)) {
      const f = p.facts;
      const printed = [f.p1!, f.q1!, f.p2!, f.q2!, f.p3!, f.q3!, f.p4!, f.q4!];
      expect(pageShortcutValues(printed).has(f.x!), p.content).toBe(false);
      expect(f.x, p.content).not.toBe(2 * f.lenAe!);
      expect(f.x, p.content).not.toBe(2 * f.lenEc!);
      expect(f.x, p.content).not.toBe(4 * f.lenAe!);
    }
  });
});

describe("중2 확대 갈래 5차 e — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`117X` — 대응을 잘못 짚으면(`useSas=false`) 길이가 달라진다", () => {
    for (const p of rows(E117, 120)) {
      const f = p.facts;
      const good = splitSimilarLength(f.ab!, f.ac!, f.ad!, f.bc!)!;
      const bad = splitSimilarLength(f.ab!, f.ac!, f.ad!, f.bc!, false)!;
      expect(good, p.content).toEqual([f.x, f.den]);
      expect(bad, p.content).not.toEqual(good);
    }
  });

  it("`118X` — 「넘지 않는 가장 큰 자연수」를 반올림으로 바꾸면 후보가 달라진다", () => {
    for (const p of rows(E118, 120)) {
      const b = p.facts.bound!;
      const n = p.facts.n!;
      const good = coefficientsWithCount(b, n);
      const bad = coefficientsWithCount(b, n, false);
      expect(
        good.reduce((s, v) => s + v, 0),
        p.content,
      ).toBe(p.facts.x);
      expect(bad, p.content).not.toEqual(good);
    }
  });

  it("`119X` — 「직선 밖의 점을 지난다」를 지우면 절편이 달라진다", () => {
    for (const p of rows(E119, 120)) {
      const g = grab(RE119, p.content, "119X").map(num);
      const pts: Point[] = [
        [g[0]!, g[1]!],
        [g[2]!, g[3]!],
        [g[4]!, g[5]!],
        [g[6]!, g[7]!],
      ];
      const good = parallelIntercept(pts)!;
      const bad = parallelIntercept(pts, false)!;
      expect(good, p.content).toEqual([p.facts.x, 1]);
      expect(bad, p.content).not.toEqual(good);
      expect(bad, p.content).toEqual([p.facts.lineIntercept, 1]);
    }
  });

  it("`120X` — 이웃한 변을 짝지으면(`pairOpposite=false`) 둘레가 달라진다", () => {
    for (const p of rows(E120, 120)) {
      const f = p.facts;
      const ae: Side = [f.p1!, f.q1!];
      const cf: Side = [f.p2!, f.q2!];
      const ec: Side = [f.p3!, f.q3!];
      const fa: Side = [f.p4!, f.q4!];
      expect(parallelogramPerimeter(ae, cf, ec, fa), p.content).toBe(f.x);
      expect(parallelogramPerimeter(ae, cf, ec, fa, false), p.content).not.toBe(
        f.x,
      );
    }
  });
});

describe("중2 확대 갈래 5차 e — 굳힘 함수 (손 실측)", () => {
  it("`splitSimilarLength` 는 SAS 대응을 실제로 쓴다", () => {
    // $12^2=9\times16$ 이므로 $\triangle ABD\sim\triangle ACB$, 닮음비 $3:4$.
    expect(splitSimilarLength(12, 16, 9, 14)).toEqual([21, 2]);
    expect(splitSimilarLength(12, 16, 9, 14, false)).toEqual([63, 8]);
    // 곱셈 관계가 안 서면 이 갈래가 아니다.
    expect(splitSimilarLength(12, 16, 8, 14)).toBeNull();
    // $D$ 가 변 밖 · 삼각형이 안 됨 · 길이가 $0$.
    expect(splitSimilarLength(12, 16, 20, 14)).toBeNull();
    expect(splitSimilarLength(12, 16, 9, 3)).toBeNull();
    expect(splitSimilarLength(0, 16, 9, 14)).toBeNull();
  });

  it("`SAS_SPLITS` 는 곱셈 관계가 서는 자리만 담는다", () => {
    expect(SAS_SPLITS.length).toBeGreaterThan(10);
    for (const [ab, ac, ad] of SAS_SPLITS) {
      expect(ab * ab, `${ab}^2 = ${ad}*${ac}`).toBe(ad * ac);
      expect(ad).toBeLessThan(ab);
      expect(ab).toBeLessThan(ac);
      expect(ac).toBeLessThanOrEqual(45);
      expect(ac - ab).toBeGreaterThanOrEqual(2);
    }
  });

  it("`naturalSolutionCount` 는 내림을 쓰고 $a\\le0$ 을 «셀 수 없음»으로 낸다", () => {
    expect(naturalSolutionCount(97, 14)).toBe(6); // $97/14=6.9\dots$
    expect(naturalSolutionCount(97, 14, false)).toBe(7); // 반올림하면 달라진다
    expect(naturalSolutionCount(97, 0)).toBeNull();
    expect(naturalSolutionCount(97, -3)).toBeNull();
    expect(naturalSolutionCount(0, 3)).toBeNull();
  });

  it("`coefficientsWithCount` 는 살아남는 값을 **모두** 낸다", () => {
    expect(coefficientsWithCount(97, 6)).toEqual([14, 15, 16]);
    expect(coefficientsWithCount(97, 6, false)).toEqual([15, 16, 17]);
    expect(coefficientsWithCount(97, 7)).toEqual([13]);
    expect(coefficientsWithCount(97, 50)).toEqual([]);
  });

  it("`collinearTriple`·`slopeOf`·`parallelIntercept` (손 실측)", () => {
    const pts: Point[] = [
      [-3, 7],
      [1, -1],
      [4, -7],
      [5, 3],
    ];
    expect(collinearTriple(pts)).toEqual([0, 1, 2]);
    expect(slopeOf(pts[0]!, pts[1]!)).toEqual([-2, 1]);
    expect(slopeOf([2, 5], [2, 9])).toBeNull(); // 세로선
    expect(parallelIntercept(pts)).toEqual([13, 1]);
    expect(parallelIntercept(pts, false)).toEqual([1, 1]);
    // 넷이 모두 한 직선 위이면 «세 점»이 정해지지 않는다.
    expect(
      collinearTriple([
        [-3, 7],
        [1, -1],
        [4, -7],
        [2, -3],
      ]),
    ).toBeNull();
  });

  it("`parallelogramPerimeter` 는 대변끼리 짝짓고 나머지 한 쌍을 확인한다", () => {
    const ae: Side = [3, 4];
    const cf: Side = [1, 14];
    const ec: Side = [2, -3];
    const fa: Side = [4, -13];
    expect(parallelogramPerimeter(ae, cf, ec, fa)).toBe(52);
    // 이웃한 변을 짝지으면 $x$ 가 달라진다.
    expect(parallelogramPerimeter(ae, cf, ec, fa, false)).not.toBe(52);
    // 나머지 한 쌍이 그 $x$ 에서 안 맞으면 `null` — `fa` 가 실제로 쓰인다.
    expect(parallelogramPerimeter(ae, cf, ec, [4, -11])).toBeNull();
    // 계수가 같으면 $x$ 가 안 정해진다 · 해가 정수가 아니다.
    expect(parallelogramPerimeter([2, 1], [2, 5], ec, fa)).toBeNull();
    expect(parallelogramPerimeter([2, 1], [4, -2], ec, fa)).toBeNull();
  });

  it("`reduceFraction`·`fracTex`·`coefTex`·`linTex` (지면 규약)", () => {
    expect(reduceFraction(-8, -4)).toEqual([2, 1]);
    expect(reduceFraction(6, -8)).toEqual([-3, 4]);
    expect(fracTex(21, 2)).toBe("\\dfrac{21}{2}");
    expect(fracTex(48, 4)).toBe("12"); // 분모가 $1$ 이면 정수로
    expect(fracTex(-9, 5)).toBe("-\\dfrac{9}{5}"); // 부호는 분수 앞에
    expect(coefTex(1)).toBe("x");
    expect(coefTex(-1)).toBe("-x");
    expect(coefTex(3, "ax")).toBe("3ax");
    expect(coefTex(1, "ax")).toBe("ax");
    expect(linTex(1, -7)).toBe("x-7");
    expect(linTex(2, 5)).toBe("2x+5");
    expect(() => linTex(2, 0)).toThrow();
  });
});

describe("중2 확대 갈래 5차 e — 검사기 자신의 눈금", () => {
  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("$2\\times4+5=13$이다.")).toEqual([]);
    expect(arithmeticFaults("$2\\times4+5=14$이다.").length).toBe(1);
    expect(arithmeticFaults("$14+15+16=45$")).toEqual([]);
    expect(arithmeticFaults("$14+15+16=44$").length).toBe(1);
    expect(arithmeticClaims("$2\\times4+5=13$, $4+9=13$")).toBe(2);
  });

  it("`unreducedFractions` 는 약분 안 한 분수와 **분모 $1$** 을 잡는다", () => {
    expect(unreducedFractions("$\\dfrac{21}{2}$")).toEqual([]);
    expect(unreducedFractions("$\\dfrac{6}{4}$")).toEqual(["6/4"]);
    expect(unreducedFractions("$\\dfrac{24}{1}$")).toEqual(["24/1"]);
    expect(fractionCount("$\\dfrac{1}{2}$와 $\\frac{3}{4}$")).toBe(2);
  });

  it("🔴 `countStepFault` — 문자 계수 판에서 개수 걸음을 건너뛰면 잡는다", () => {
    const good =
      "그러므로 $a$는 자연수이고, 이때 해는 $x\\le\\dfrac{97}{a}$이므로 자연수인 해의 개수는 $\\dfrac{97}{a}$을 넘지 않는 가장 큰 자연수와 같다.\n" +
      "$a$에 자연수를 작은 것부터 넣어 그 개수를 세면 $a=13$이면 $7$개, $a=14$이면 $6$개, $a=15$이면 $6$개이다.";
    expect(countStepFault(good, 97).fault).toBeNull();
    expect(countStepFault(good, 97).seen).toBe(3);
    // 개수를 안 세고 후보로 뛰면 «못 셈»이 아니라 **결함**이다.
    expect(
      countStepFault("$ax\\le97$이므로 $a=14$, $a=15$, $a=16$이다.", 97).fault,
    ).toBe("개수를 세어 늘어놓은 줄이 없다");
    // 나열의 값이 틀리면 잡는다 (낱말만 보면 못 잡는 자리).
    const wrong = good.replace("$a=14$이면 $6$개", "$a=14$이면 $5$개");
    expect(countStepFault(wrong, 97).fault).toContain("참은 6");
    // 근거 문장을 지우면 잡는다.
    const noReason = good.replace("을 넘지 않는 가장 큰 자연수와 같다", "이다");
    expect(countStepFault(noReason, 97).fault).toContain("넘지 않는 가장 큰");
    // 이웃을 안 보이면 잡는다.
    expect(
      countStepFault("$a=14$이면 $6$개, $a=15$이면 $6$개이다.", 97).fault,
    ).toContain("위·아래 이웃");
  });

  it("`euroRoMismatches` 는 ㄹ 받침을 가른다 (「$7$으로」는 틀렸다)", () => {
    expect(euroRoMismatches("$7$로 나누면")).toEqual([]);
    expect(euroRoMismatches("$3$으로 나누면")).toEqual([]);
    expect(euroRoMismatches("$7$으로 나누면").length).toBe(1);
    expect(euroRoMismatches("$3$로 나누면").length).toBe(1);
  });

  it("`ratSqrt`·`ratTex` 는 유리수의 정확한 제곱근만 낸다", () => {
    expect(ratSqrt(rat(441, 4))).toEqual([21, 2]);
    expect(ratSqrt(rat(106, 1))).toBeNull();
    expect(ratTex(rat(24, 2))).toBe("12");
    expect(ratTex(rat(-9, 5))).toBe("-\\dfrac{9}{5}");
    expect(ratAdd(rat(1, 2), rat(1, 3))).toEqual([5, 6]);
  });

  it("`areaTwice` 는 한 직선 위인지를 곱셈만으로 판정한다", () => {
    expect(areaTwice([-3, 7], [1, -1], [4, -7])).toBe(0);
    expect(areaTwice([-3, 7], [1, -1], [5, 3])).not.toBe(0);
  });
});

describe("중2 확대 갈래 5차 e — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `118X` 발문의 조사가 **찍히는 수**를 따른다 (「$185$을」이 아니라 「를」)", () => {
    // $185$ 는 「백팔십오」라 「를」, $206$ 은 「이백육」이라 「을」이다.
    // 손으로 「을」을 박아 두었다가 실측 384자리가 걸렸다.
    let sawEul = false;
    let sawReul = false;
    for (const p of rows(E118, 400)) {
      const m = /\\le ax\+(\d+)\$(을|를) 만족시키는/.exec(p.content);
      expect(m, p.content).not.toBeNull();
      const d = num(m![1]) % 10;
      const want = d === 2 || d === 4 || d === 5 || d === 9 ? "를" : "을";
      expect(m![2], p.content).toBe(want);
      if (want === "을") sawEul = true;
      else sawReul = true;
    }
    // 🔴 둘 다 실제로 나오는지 센다 — 한쪽만 나오면 이 검사가 반쪽이다.
    expect(sawEul && sawReul, "두 조사가 모두 지면에 나온다").toBe(true);
  });

  it("⑵ 🔴 `118X` 의 「$\\dfrac{b}{a}$」 뒤 조사도 **분자의 읽기**를 따른다", () => {
    for (const p of rows(E118, 200)) {
      const b = p.facts.bound!;
      const d = b % 10;
      const eul = d === 2 || d === 4 || d === 5 || d === 9 ? "를" : "을";
      const eun = d === 2 || d === 4 || d === 5 || d === 9 ? "는" : "은";
      expect(p.solution, p.content).toContain(
        `\\dfrac{${b}}{a}$${eul} 넘지 않는`,
      );
      expect(p.solution, p.content).toContain(
        `\\dfrac{${b}}{a}$${eun} 작아지므로`,
      );
    }
  });

  it("⑶ 🔴 `119X` 가 「$…=3$로」라고 쓰지 않는다 (ㄹ 받침이 아닌 수의 「으로」)", () => {
    for (const p of rows(E119, 400)) {
      expect(euroRoMismatches(p.solution), p.content).toEqual([]);
      expect(p.solution.includes("로 기울기가 같으므로"), p.content).toBe(
        false,
      );
    }
  });

  it("⑷ 🔴 `119X` 의 좌표에 $0$ 이 없다 — 「상수 $0$」 냄새와 `\\times0` 을 막는다", () => {
    for (const p of rows(E119, 400)) {
      for (const v of grab(RE119, p.content, "119X").map(num))
        expect(v, p.content).not.toBe(0);
    }
  });

  it("⑸ 🔴 `119X` 의 직선 밖 점이 **네 자리에 고루** 나온다 (㉵)", () => {
    const slots = new Set(rows(E119, 400).map((p) => p.facts.oddAt));
    expect([...slots].sort(), "직선 밖 점의 자리").toEqual([0, 1, 2, 3]);
  });

  it("⑹ 🔴 `120X` 의 네 선분이 **자리를 바꿔** 찍힌다 (나란한 둘이 대변이라는 암시를 없앤다)", () => {
    const firsts = new Set<string>();
    for (const p of rows(E120, 400)) {
      const m = /잡았다\. \$\\overline\{([A-F]{2})\}/.exec(p.content);
      expect(m, p.content).not.toBeNull();
      firsts.add(m![1]!);
    }
    expect(firsts.size, "첫 자리에 오는 선분").toBeGreaterThan(2);
  });

  it("⑺ 🔴 `117X` 의 닮음비 뒷항이 늘 $2$ 이상이다 (분모 $1$ 인 분수를 안 낸다)", () => {
    for (const p of rows(E117, 400)) {
      expect(p.facts.ratioDen, p.content).toBeGreaterThan(1);
      expect(p.solution.includes("}{1}"), p.content).toBe(false);
    }
  });

  it("⑻ 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나간다", () => {
    for (const e of M2_TOP_5E)
      for (const p of rows(e, 40)) {
        expect(p.solution.includes("**"), p.content).toBe(false);
        expect(p.content.includes("**"), p.content).toBe(false);
      }
  });

  it("⑼ 🔴 우리말 — 「그 중」이 아니라 「그중」이다", () => {
    for (const e of M2_TOP_5E)
      for (const p of rows(e, 40))
        expect(`${p.content}${p.solution}`.includes("그 중"), p.content).toBe(
          false,
        );
  });

  it("⑾ 🔴 같은 등식이 이어 붙어 되풀이되지 않는다 (「$x=4$, 즉 $x=4$이다」)", () => {
    // 🔴 `120X` 에서 계수 차가 $1$ 이면 정리 줄이 「$x=4$, 즉 $x=4$이다」가 된다 —
    //    실측으로 났고, 제품이 `tidySolution` 으로 지우기 **전**에 여기서 막는다.
    //    판정은 **제품의 판정 함수**(`repeatedStatement`)를 그대로 부른다 —
    //    규칙을 여기 옮겨 적으면 두 벌이 되어 한쪽만 고쳐도 아무도 모른다.
    for (const e of M2_TOP_5E)
      for (const p of rows(e, 200))
        for (const line of p.solution.split("\n"))
          expect(repeatedStatement(line), `${e.rpmType}: ${line}`).toBeNull();
  });

  it("⑿ 🔴 `120X` 의 정리 줄이 계수를 **실제로 나누는** 걸음을 적는다", () => {
    for (const p of rows(E120, 200)) {
      const ae = sideFrom(SIDE_AE, p.content, "120X");
      const cf = sideFrom(SIDE_CF, p.content, "120X");
      // 계수 차가 $1$ 이면 나누는 걸음이 사라지고 되풀이 줄이 난다.
      expect(Math.abs(ae[0] - cf[0]), p.content).toBeGreaterThanOrEqual(2);
      const ec = sideFrom(SIDE_EC, p.content, "120X");
      const fa = sideFrom(SIDE_FA, p.content, "120X");
      expect(Math.abs(ec[0] - fa[0]), p.content).toBeGreaterThanOrEqual(2);
    }
  });

  it("⑽ 🔴 `118X` 의 나열이 후보의 위·아래 이웃을 **하나씩만** 붙인다 (㉮ 지면 길이)", () => {
    for (const p of rows(E118, 200)) {
      // ⚠️ 「개」까지 붙여 잡아야 한다 — 안 그러면 「$a=0$이면 부등식이 …」라는
      //    **죽는 후보 줄**이 나열로 세어져 개수가 하나 많아진다(실측으로 물렸다).
      const listed = [...p.solution.matchAll(/\$a=(\d+)\$이면 \$\d+\$개/g)].map(
        (m) => num(m[1]),
      );
      expect(listed.length, p.content).toBe(p.facts.howMany! + 2);
      expect(listed[0], p.content).toBe(p.facts.lo! - 1);
      expect(listed[listed.length - 1], p.content).toBe(p.facts.hi! + 1);
    }
  });
});
