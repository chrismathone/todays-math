/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5f.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받고
 * 모듈의 굳힘 함수도 **한 번도 안 부른다.** 그래서 생성기의 산술을 옮겨 적을 수가
 * **구조적으로 없다**(2026-08-18 「지표의 «참»이 제품에서 나오면 제품이 틀릴수록 좋은
 * 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `121X` | 「무게중심이 셋으로 나눈다」·「높이가 같으면 넓이의 비는 밑변의 비」라는 **넓이비 추론**으로 조각을 세고, 그 비를 `reduceFraction` 으로 줄인다 | 넓이비를 **한 번도 안 쓴다** — $\mathrm{A}(0,0)$, $\mathrm{B}(1,0)$, $\mathrm{C}(0,1)$ 로 놓고 $\mathrm{G}$·$\mathrm{M}$·$\mathrm{N}$ 의 좌표를 **유리수로** 잡은 뒤 **신발끈 공식**으로 $\square\mathrm{AMGN}$·$\triangle\mathrm{ABC}$·$\triangle\mathrm{GBC}$ 의 넓이를 각각 구해 비를 낸다 |
 * | `122X` | 칸 수를 세어 $P$ 를 $3n-m$ 으로 **나눈다** | 나눗셈을 **한 번도 안 쓴다** — $k=1$ 부터 **넣어 보고**, 그 $k$ 마다 다리 $L$ 을 $1$ 부터 훑어 $\triangle\mathrm{DEC}$ 가 정삼각형이 되는지를 **제곱 거리**로 판정한다. 둘레가 $P$ 와 같아지는 $k$ 가 하나가 아니면 던진다 |
 * | `123X` | `n % d` 로 약수를 **나눗셈으로** 모으고 걸러 낸다 | 나머지 연산을 **한 번도 안 쓴다** — $d\cdot e=P-Q$ 인 **곱셈 짝**을 찾아 후보를 모으고, 살아남는 후보마다 $a=1+e$·$b=1$ 로 두 양초를 **실제로 태워** 길이가 같고 둘 다 양수인지 확인한다 |
 * | `124X` | 지수를 **더하고 빼고**, 계수를 **나누어** 자연수인지 본다 | 뺄셈도 나눗셈도 **안 쓴다** — 계수를 **소인수 개수 표**로, $x$·$y$ 를 **개수**로 바꾸어 곱은 «합치기», 나눗셈은 «덜어내기»로 한다. 덜어낼 것이 모자라면 그 문자는 **분모에 남는다** |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면 재현율만
 * 재고 지어냄은 구조적으로 0이 된다(2026-08-20). 해설의 «말»을 보는 자
 * (`wordFaults`)도 마찬가지로 **낱말을 뒤집은 지면**에 대 본다.
 *
 * ## ⑶ 🔴 이 회차가 **실제로 잡은 결함 셋** — 전부 「값은 맞고 KaTeX 도 초록」이다
 *
 *   ㄱ. `123X` 가 「$Q$**와** 같으면」을 **글자로 박아** 두었다. $Q$ 의 읽기가 받침으로
 *       끝나면 「과」다 — 실측 $3{,}200$판 중 **1,971판**이 틀린 조사로 나가고 있었다.
 *       `waGwa(Q)` 로 고쳤고, 아래 「회귀 잠금 ⑴」이 다시 못 들어오게 막는다.
 *   ㄴ. `124X` 발문이 「$C=12x^{5}y$**이** 있다」로 끝났다. $y$ 는 「와이」라 「가」인데
 *       지수가 붙으면 「제곱」이라 「이」가 맞아 **판마다 갈렸다**(실측 $800$판 중
 *       **220판**). `josaMismatches` 는 「이」를 일부러 안 보므로(서술격 「이다」와
 *       겹쳐 거짓 경보가 난다) **구조적으로 못 잡는 자리**다. 손 목록을 더하는 대신
 *       문장을 「… **중에서** 두 개를 곱한 …」으로 바꿔 **조사가 필요 없게** 했다.
 *   ㄷ. 모듈 ⑷ 의 **D-20 손실 원장이 아홉 자리 틀려 있었다**(이를테면 `122X` 는
 *       «271 → 117» 이 아니라 **288 → 127**, `124X` 는 599,664 가 아니라 **536,238**).
 *       ㉶ 가 요구하는 「재현 가능」을 못 채우던 것이다. 아래 「D-20 손실 원장」이
 *       **전수로 다시 세고**, 모듈 머리말의 표 줄까지 글자 그대로 대조한다.
 *
 * ## ⑷ 🔴 실측 (⑸-1) — 씨앗 블록 넷($20260906$·$900000$·$123456$·$5550000$) × 800판
 *
 * 모듈 머리말 ⑸ 가 가리키는 표다. **두 곳에 적으면 한쪽만 고쳐도 아무도 모르므로**
 * 잰 값은 여기에만 적고, 모듈은 문턱(최빈 $12\%$ 미만 · 해설 $700\mathrm{px}$ 미만)만
 * 못 박는다.
 *
 * | 유형 | 갈래 | 최빈 정답(블록 넷 가운데 가장 나쁜 값) | 해설 최대 px(3,200판) | 서로 다른 정답(블록마다) | 변형 폭(40회차) | 하한 |
 * |---|---|---|---|---|---|---|
 * | `121X` | 심화중 | **6.13%** | **496.1** | 51~52 | **35** | 6 |
 * | `122X` | 심화중 | **7.25%** | **315.4** | 33 | **35** | 12 |
 * | `123X` | 심화상 | **5.63%** | **440.1** | 59~61 | **40** | 12 |
 * | `124X` | 심화상 | **1.63%** | **412.5** | 378~402 | **40** | 12 |
 *
 * ## ⑸ 이 시험이 **못 보는 것** — 정직하게
 *
 * 1. **「이」로 끝나는 조사는 아무 자도 안 본다.** `josaMismatches` 가 서술격
 *    「$5$이다」와 겹쳐 일부러 뺐기 때문이다. 그래서 ⑶ ㄴ 같은 결함은 **지면을 눈으로
 *    읽어야** 나온다 — 이 회차는 「수로 끝나지 않는 수식 뒤의 조사」를 전량 뽑아
 *    빈도표로 훑어 찾았고, 그 훑기를 「회귀 잠금 ⑵」로 남겼다(발문에 그 자리가 다시
 *    생기면 빨개진다).
 * 2. **`bareNumbers` 는 `content` 만 본다.** 해설의 맨 숫자는 이 자의 밖이다.
 *    대신 「설명되지 않는 수」가 해설의 `$...$` 안 정수를 전량 대조한다.
 * 3. **`pageSmells` 의 「지수 1」은 `x^1` 꼴만 본다.** 우리 지면은 `powBody` 가
 *    지수 $1$ 을 아예 안 적으므로 그 자의 「0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다
 *    — 그래서 `powBody` 를 직접 흔들어 잰다(「굳힘 함수 손 실측」).
 * 4. **공용 훑개의 「정수 경계 걸음」(`boundStepFaults`) 축이 이 파일에 없다.**
 *    `123X` 만 부등식 $bt<Q$ 를 쓰는데 거기서 정수로 **뛰지 않는다**($b\ge1$ 이므로
 *    곧바로 $t<Q$ 다). 그 자의 「0」은 «깨끗»이 아니라 **«잴 것이 없다»** 이고,
 *    그 사실을 「$123X$ — 버리는 근거가 나눗셈이 아니다」가 못 박는다.
 * 5. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전이다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 * 6. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 이 회차의 해설은 유형마다 표본을
 *    눈으로 읽었고, 그때 고친 자리는 ⑶ 에 남겼다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

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
import { pageShortcutValues, scaledValues } from "@/lib/middle/m1Top4";
import {
  CANDLE_PAIRS,
  CENTROID_PAIRS,
  centroidPieceArea,
  centroidQuadRatio,
  coefTerm,
  divisorsOf,
  looksLikeShortcut,
  M2_TOP_5F,
  MONO_COEF_TRIOS,
  MONO_EXP_TRIOS,
  monomialBody,
  monomialResults,
  powBody,
  reduceFraction,
  resultBody,
  survivingTimes,
  TRAPEZOID_PAIRS,
  trapezoidLeg,
  uniqueMonomialIndex,
  type MonomialTriple,
} from "@/lib/middle/m2Top5f";
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
/** 해설 높이·정답 쏠림은 블록마다 **800판**으로 잰다(재현율은 곧 판 수다). */
const WIDE = 800;
const BASE_SEED = 20260906;
/**
 * 🔴 정답 쏠림은 **씨앗 블록 넷**으로 잰다. 블록 하나로 적으면 여유를 낙관적으로
 * 적게 된다(4차 물결이 그렇게 물렸다).
 */
const SEED_BLOCKS = [20260906, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260906, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];
/** 정답 쏠림 문턱 — 브리프가 못 박은 값. */
const SKEW_LIMIT = 12;
/** 해설 높이 문턱 — 정답지 한 단(964.8px)이 아니라 넉넉히 앞에서 잠근다(㉮). */
const SOLUTION_PX_LIMIT = 700;

const MODULE_PATH = path.resolve(process.cwd(), "src/lib/middle/m2Top5f.ts");
const MODULE_SRC = readFileSync(MODULE_PATH, "utf-8");

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5F.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E121 = entryOf("121X");
const E122 = entryOf("122X");
const E123 = entryOf("123X");
const E124 = entryOf("124X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "121X": "심화중",
  "122X": "심화중",
  "123X": "심화상",
  "124X": "심화상",
};

/** 유형마다 리드가 준 변형 폭 아래 끝. */
const VARIANT_FLOOR: Record<string, number> = {
  "121X": 6,
  "122X": 12,
  "123X": 12,
  "124X": 12,
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

/**
 * 🔴 **지름길 자** — 규칙을 모듈에서 가져오지 않는다(가져오면 동어반복이다).
 * 4차 물결의 두 자(`pageShortcutValues`·`scaledValues`)를 **읽어만** 와서 여기서
 * 다시 엮는다. 모듈의 `looksLikeShortcut` 과 같은 답을 내는지는 아래
 * 「검사기 자신의 눈금」이 따로 견준다.
 */
function shortcutHit(answer: number, pageNums: readonly number[]): boolean {
  if (pageShortcutValues(pageNums).has(answer)) return true;
  for (const v of pageNums) {
    if (v > 0 && scaledValues(v).has(answer)) return true;
  }
  return false;
}

/** 해설에서 그 조각이 든 줄. 없으면 던진다 — 조용히 건너뛰면 분모 밖이 된다. */
function lineWith(solution: string, needle: string, who: string): string {
  const hit = solution.split("\n").find((l) => l.includes(needle));
  if (hit === undefined)
    throw new Error(`${who}: 「${needle}」가 든 줄이 없다 — ${solution}`);
  return hit;
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

function ratDiv(a: Rat, b: Rat): Rat {
  if (b[0] === 0) throw new Error("ratDiv: 0 으로 나눈다");
  return rat(a[0] * b[1], a[1] * b[0]);
}

type Pt = [Rat, Rat];

function cross(a: Pt, b: Pt): Rat {
  return ratSub(ratMul(a[0], b[1]), ratMul(b[0], a[1]));
}

/** 신발끈 — 넓이의 **두 배**(부호 있음). 다각형은 차례대로 준다. */
function shoelace2(pts: readonly Pt[]): Rat {
  let acc: Rat = [0, 1];
  for (let i = 0; i < pts.length; i += 1) {
    acc = ratAdd(acc, cross(pts[i]!, pts[(i + 1) % pts.length]!));
  }
  return acc;
}

// ── 소인수 개수 표 (124X 검산 전용 — 뺄셈·나눗셈을 안 쓴다) ──

type Counts = Map<number, number>;

function primeCounts(n: number): Counts {
  if (!Number.isInteger(n) || n < 1)
    throw new Error(`primeCounts: 자연수여야 한다 — ${n}`);
  const out: Counts = new Map();
  let v = n;
  for (let p = 2; p * p <= v; p += 1) {
    while (v % p === 0) {
      out.set(p, (out.get(p) ?? 0) + 1);
      v /= p;
    }
  }
  if (v > 1) out.set(v, (out.get(v) ?? 0) + 1);
  return out;
}

function mergeCounts(a: Counts, b: Counts): Counts {
  const out: Counts = new Map(a);
  for (const [p, c] of b) out.set(p, (out.get(p) ?? 0) + c);
  return out;
}

function takeCounts(a: Counts, b: Counts): Counts {
  const out: Counts = new Map(a);
  for (const [p, c] of b) out.set(p, (out.get(p) ?? 0) - c);
  return out;
}

/** 표를 다시 수로 — 덜어낼 것이 모자랐으면 `null`(자연수가 아니다). */
function countsToNatural(c: Counts): number | null {
  let out = 1;
  for (const [p, k] of c) {
    if (k < 0) return null;
    for (let i = 0; i < k; i += 1) out *= p;
  }
  return out;
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

const FRACTION = /\\d?frac\{(\d+)\}\{(\d+)\}/g;

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아니거나 분모가 $1$ 인** 것. */
function unreducedFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(FRACTION)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (gcd2(a, b) !== 1 || b === 1) out.push(`${a}/${b}`);
  }
  return out;
}

/** 이 자가 **몇 개를 봤는가**. */
function fractionCount(text: string): number {
  return [...text.matchAll(FRACTION)].length;
}

/** `$...$` 안에 적힌 정수 전부 (부호 포함). */
function mathIntegers(text: string): number[] {
  const out: number[] = [];
  for (const span of text.matchAll(/\$([^$]*)\$/g)) {
    for (const n of span[1]!.matchAll(/-?\d+/g)) out.push(Number(n[0]));
  }
  return out;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 * 그 자는 을/를·은/는·와/과·가만 본다. 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다.
 *
 * ⚠️ 규칙은 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 그러면 동어반복이다.
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
 * 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로 렌더해서** 한다.
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

// ── ㉳ 해설의 «말» ─────────────────────────────────────────

/**
 * 🔴 **굳힘 개념과 마무리 논거를 진술하는 줄의 «낱말»을 읽는다.**
 *
 * 4차에서 중1 10줄·중2 3줄이 무방비였다 — 「약수」를 「배수」로 바꿔도 92개 시험이
 * 전부 초록이었다. 여기 목록은 **그 낱말이 없으면 빨개진다**. 그리고 아래
 * 「검사기 자신의 눈금」이 **낱말을 뒤집은 지면**을 대어 이 자가 «아니오» 를 낼 수
 * 있는지 확인한다(양성·음성 둘 다).
 */
const WORD_CLAIMS: Record<
  string,
  readonly (readonly [string, RegExp, number])[]
> = {
  "121X": [
    [
      "무게중심이 «넓이가 같은 세 삼각형»으로 나눈다",
      /무게중심이므로 세 삼각형 [^\n]*넓이가 같은 세 삼각형이고/g,
      1,
    ],
    [
      "$\\mathrm{M}$ 이 «중점»이라 밑변이 같다",
      /중점이므로 두 삼각형 [^\n]*밑변의 길이가 같고 높이도 같다/g,
      1,
    ],
    ["그래서 «절반»이다", /넓이의 절반인/g, 1],
    [
      "«높이가 같으므로» 넓이의 비가 길이의 비다",
      /높이가 같으므로 넓이의 비도/g,
      1,
    ],
    [
      "사각형을 «대각선»으로 두 삼각형으로 «나누어»진다",
      /대각선 [^\n]*에 의해 두 삼각형 [^\n]*으로 나누어지므로/g,
      1,
    ],
  ],
  "122X": [
    [
      "등변사다리꼴의 «평행하지 않은 두 변»이 같다",
      /평행하지 않은 두 변의 길이는 같으므로/g,
      1,
    ],
    [
      "«두 쌍의 대변이 각각 평행»하면 «평행사변형»",
      /두 쌍의 대변이 각각 평행한 평행사변형이다/g,
      1,
    ],
    [
      "평행사변형의 «대변의 길이는 각각 같»다",
      /두 쌍의 대변의 길이는 각각 같으므로/g,
      1,
    ],
    ["그래서 «이미 이등변삼각형»이다", /이미 이등변삼각형이고/g, 1],
    [
      "«정삼각형이 되려면 나머지 한 변»이 같아야 한다",
      /정삼각형이 되려면 나머지 한 변이 같아야 하므로/g,
      1,
    ],
  ],
  "123X": [
    ["$a-b$ 가 «자연수»다", /\$a-b\$도 자연수이다/g, 1],
    ["그래서 $t$ 는 «약수»다", /\$t\$는 \$\d+\$의 약수이고/g, 1],
    ["«$b$ 는 $1$ 이상»이라 경계가 곧 $Q$ 다", /\$b\$는 \$1\$ 이상이므로/g, 1],
    ["넘으면 «이미 다 타 버린다»", /이미 다 타 버린다/g, 1],
    ["남은 것은 «모두 조건을 만족»한다", /값은 모두 조건을 만족한다/g, 1],
  ],
  "124X": [
    ["«계수만으로는 가릴 수 없다»", /계수만으로는 가릴 수 없고/g, 1],
    [
      "$x$ 의 지수가 음수라 «$x$가 분모에 남는다»",
      /\$x\$의 지수가 \$-\d+\$(?:으로|로) 음수이므로 \$x\$가 분모에 남는다/g,
      1,
    ],
    [
      "$y$ 의 지수가 음수라 «$y$가 분모에 남는다»",
      /\$y\$의 지수가 \$-\d+\$(?:으로|로) 음수이므로 \$y\$가 분모에 남는다/g,
      1,
    ],
    // 🔴 **개수까지 센다.** 죽는 계산이 둘이라 이 문장은 **두 번** 나와야 한다 —
    //    「있나」만 보면 한쪽을 뒤집어도 다른 쪽이 가려 준다(이 회차에 실제로 물렸다).
    [
      "죽는 둘 다 «단항식이 아니다»라고 적는다 (두 번)",
      /그러므로 단항식이 아니다/g,
      2,
    ],
    [
      "단항식이 되는 것은 «하나뿐»이다",
      /단항식이 되는 것은 [^\n]*하나뿐이고/g,
      1,
    ],
  ],
};

/** 굳힘 개념을 진술하는 줄이 빠졌거나 낱말이 뒤집힌 자리. */
function wordFaults(rpmType: string, solution: string): string[] {
  const claims = WORD_CLAIMS[rpmType];
  if (claims === undefined) throw new Error(`말 목록이 없다 — ${rpmType}`);
  return claims
    .filter(([, re, n]) => [...solution.matchAll(re)].length < n)
    .map(([label]) => label);
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const RE121 =
  /^삼각형 \$\\mathrm\{ABC\}\$의 무게중심을 \$\\mathrm\{G\}\$, 변 \$\\mathrm\{AB\}\$의 중점을 \$\\mathrm\{M\}\$이라 하고, 변 \$\\mathrm\{AC\}\$ 위에 \$\\overline\{\\mathrm\{AN\}\}:\\overline\{\\mathrm\{NC\}\}=(\d+):(\d+)\$인 점 \$\\mathrm\{N\}\$을 잡았다\. 사각형 \$\\mathrm\{AMGN\}\$의 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^2\$일 때, 삼각형 \$\\mathrm\{GBC\}\$의 넓이를 구하시오\.$/;

const RE122 =
  /^등변사다리꼴 \$\\mathrm\{ABCD\}\$에서 \$\\overline\{\\mathrm\{AD\}\}\\parallel\\overline\{\\mathrm\{BC\}\}\$이고 \$\\overline\{\\mathrm\{AD\}\}:\\overline\{\\mathrm\{BC\}\}=(\d+):(\d+)\$이다\. 꼭짓점 \$\\mathrm\{D\}\$를 지나 \$\\overline\{\\mathrm\{AB\}\}\$에 평행하게 그은 직선이 변 \$\\mathrm\{BC\}\$와 만나는 점을 \$\\mathrm\{E\}\$라 할 때, 삼각형 \$\\mathrm\{DEC\}\$는 정삼각형이다\. 이 등변사다리꼴의 둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$일 때, \$\\overline\{\\mathrm\{AB\}\}\$의 길이를 구하시오\.$/;

const RE123 =
  /^길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 양초 \$\\mathrm\{A\}\$와 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 양초 \$\\mathrm\{B\}\$에 동시에 불을 붙였다\. 두 양초는 각각 \$1\$분에 일정한 길이만큼 짧아지고, \$1\$분에 짧아지는 길이는 둘 다 자연수 \$\\mathrm\{cm\}\$이다\. 불을 붙인 지 \$t\$분 후에 두 양초의 길이가 처음으로 같아졌고, 그때 두 양초는 모두 다 타지 않고 남아 있었다\. 자연수 \$t\$의 값을 모두 구하여 그 합을 구하시오\.$/;

const RE124 =
  /^세 단항식 \$A=(\d+)x(?:\^\{(\d+)\})?y(?:\^\{(\d+)\})?\$, \$B=(\d+)x(?:\^\{(\d+)\})?y(?:\^\{(\d+)\})?\$, \$C=(\d+)x(?:\^\{(\d+)\})?y(?:\^\{(\d+)\})?\$ 중에서 두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 서로 다른 세 가지 결과를 얻는다\. 그 세 가지 가운데 단항식이 되는 것은 오직 하나이고 나머지 둘은 분모에 문자가 남는다\. 단항식이 되는 것을 구하시오\.$/;

type Mono = { coef: number; ex: number; ey: number };

function monoFrom(g: readonly (string | undefined)[], at: number): Mono {
  return {
    coef: num(g[at]),
    ex: g[at + 1] === undefined ? 1 : num(g[at + 1]),
    ey: g[at + 2] === undefined ? 1 : num(g[at + 2]),
  };
}

/** 검산기가 스스로 짓는 지면 글자 — 제품 `monomialBody` 를 안 부른다. */
function ownMonoTex(coef: number, ex: number, ey: number): string {
  const c = coef === 1 ? "" : String(coef);
  const x = ex === 1 ? "x" : `x^{${ex}}`;
  const y = ey === 1 ? "y" : `y^{${ey}}`;
  return `${c}${x}${y}`;
}

const VERIFY: Record<string, (content: string) => string> = {
  // 121X — 넓이비 추론을 **안 쓴다.** 좌표와 신발끈 공식으로 세 넓이를 각각 낸다.
  "121X": (content) => {
    const [mT, nT, sT] = grab(RE121, content, "121X");
    const m = num(mT);
    const n = num(nT);
    const s = num(sT);
    if (m < 1 || n < 1) throw new Error("121X: 비가 자연수가 아니다");
    if (m === n)
      throw new Error(
        "121X: $m=n$ 이면 사각형이 삼각형의 $\\dfrac13$ 이라 답이 주어진 값 그대로다",
      );
    if (gcd2(m, n) !== 1) throw new Error("121X: 비가 기약이 아니다");
    const A: Pt = [
      [0, 1],
      [0, 1],
    ];
    const B: Pt = [
      [1, 1],
      [0, 1],
    ];
    const C: Pt = [
      [0, 1],
      [1, 1],
    ];
    // 무게중심은 세 꼭짓점의 **평균**이다 — 「셋으로 나눈다」를 안 쓴다.
    const G: Pt = [
      ratMul(ratAdd(ratAdd(A[0], B[0]), C[0]), rat(1, 3)),
      ratMul(ratAdd(ratAdd(A[1], B[1]), C[1]), rat(1, 3)),
    ];
    const M: Pt = [
      ratMul(ratAdd(A[0], B[0]), rat(1, 2)),
      ratMul(ratAdd(A[1], B[1]), rat(1, 2)),
    ];
    // $\mathrm{N}$ 은 $\mathrm{A}$ 에서 $\mathrm{C}$ 로 $m:(m+n)$ 만큼 간 점.
    const w = rat(m, m + n);
    const N: Pt = [
      ratAdd(A[0], ratMul(ratSub(C[0], A[0]), w)),
      ratAdd(A[1], ratMul(ratSub(C[1], A[1]), w)),
    ];
    const tri2 = shoelace2([A, B, C]);
    const quad2 = shoelace2([A, M, G, N]);
    const gbc2 = shoelace2([G, B, C]);
    const rQuad = ratDiv(quad2, tri2);
    const rGbc = ratDiv(gbc2, tri2);
    if (rQuad[0] <= 0 || rQuad[0] * 1 >= rQuad[1])
      throw new Error("121X: 사각형이 삼각형보다 크다");
    const total = ratDiv(rat(s, 1), rQuad);
    const ans = ratMul(total, rGbc);
    if (ans[1] !== 1)
      throw new Error(`121X: 답이 정수가 아니다 — ${ans[0]}/${ans[1]}`);
    if (ans[0] < 1) throw new Error("121X: 답이 양수가 아니다");
    if (shortcutHit(ans[0], [m, n, s]))
      throw new Error("121X: 발문의 수를 한두 번 연산하면 답이 나온다");
    return `${ans[0]}\\,\\mathrm{cm}^2`;
  },

  // 122X — 나눗셈을 안 쓴다. $k$ 를 넣어 보고 다리는 **제곱 거리**로 찾는다.
  "122X": (content) => {
    const [mT, nT, pT] = grab(RE122, content, "122X");
    const m = num(mT);
    const n = num(nT);
    const P = num(pT);
    if (m < 1 || n <= m)
      throw new Error(`122X: 비가 이상하다 — ${m}:${n} (윗변이 더 길다)`);
    if (gcd2(m, n) !== 1) throw new Error("122X: 비가 기약이 아니다");
    if (n - m < 2)
      throw new Error(
        "122X: $n-m=1$ 이면 마무리가 $1\\times t=t$ 라는 아무 일도 안 하는 곱셈이다",
      );
    const hits: { k: number; leg: number }[] = [];
    for (let k = 1; k <= 400; k += 1) {
      const a = m * k;
      const b = n * k;
      // $\mathrm{B}(0,0)$, $\mathrm{C}(b,0)$, $\mathrm{E}(a,0)$,
      // $\mathrm{D}\left(\dfrac{a+b}{2},\ y\right)$ 로 놓는다. 반올림을 피하려고
      // **두 배 좌표**로 재고 제곱 거리만 견준다.
      const twoH = b - a; // $2h$
      let leg: number | null = null;
      for (let L = 1; L <= 4 * b; L += 1) {
        const fourY2 = 4 * L * L - twoH * twoH; // $(2y)^2$
        if (fourY2 <= 0) continue; // 사다리꼴이 서지 않는다
        const ec2 = twoH * twoH; // $\overline{EC}^2$
        const de2 = L * L; // $\overline{DE}^2=\overline{DC}^2$
        if (ec2 !== de2) continue; // 정삼각형이 아니다
        leg = L;
        break;
      }
      if (leg === null) continue;
      if (a + b + 2 * leg === P) hits.push({ k, leg });
    }
    if (hits.length === 0)
      throw new Error(`122X: 둘레가 $${P}$ 가 되는 사다리꼴이 없다`);
    if (hits.length > 1)
      throw new Error(`122X: 그런 사다리꼴이 ${hits.length}가지라 안 정해진다`);
    const { leg } = hits[0]!;
    if (shortcutHit(leg, [m, n, P]))
      throw new Error("122X: 발문의 수를 한두 번 연산하면 답이 나온다");
    return `${leg}\\,\\mathrm{cm}`;
  },

  // 123X — 나머지 연산을 안 쓴다. 곱셈 짝으로 후보를 모으고 **태워 본다**.
  "123X": (content) => {
    const [pT, qT] = grab(RE123, content, "123X");
    const P = num(pT);
    const Q = num(qT);
    if (P <= Q) throw new Error("123X: 긴 양초가 더 길지 않다");
    const D = P - Q;
    // $d\cdot e=D$ 인 곱셈 짝 — 나머지 연산을 안 쓴다.
    const pairs: { t: number; e: number }[] = [];
    for (let d = 1; d <= D; d += 1) {
      for (let e = 1; e <= D; e += 1) {
        if (d * e === D) {
          pairs.push({ t: d, e });
          break;
        }
      }
    }
    if (pairs.length < 6 || pairs.length > 12)
      throw new Error(
        `123X: 약수가 ${pairs.length}개라 「모두」가 무색하거나 줄이 넘친다`,
      );
    const live = pairs.filter((p) => p.t < Q);
    const dead = pairs.filter((p) => p.t >= Q);
    if (live.length < 3 || live.length > 7)
      throw new Error(`123X: 살아남는 후보가 ${live.length}개다`);
    if (dead.length < 1)
      throw new Error("123X: 버리는 후보가 없어 「$t<Q$」가 장식이 된다");
    // 살아남는다고 한 것을 **실제로 태워** 본다.
    for (const { t, e } of live) {
      const a = 1 + e;
      const b = 1;
      const restA = P - a * t;
      const restB = Q - b * t;
      if (restA !== restB || restA <= 0)
        throw new Error(`123X: $t=${t}$ 에서 두 길이가 같지 않거나 다 탔다`);
    }
    // 버린다고 한 것은 **어떤 자연수 $b$ 로도** 남지 않아야 한다.
    for (const { t } of dead) {
      if (Q - 1 * t > 0)
        throw new Error(`123X: $t=${t}$ 는 버릴 자리가 아니다`);
    }
    const sum = live.reduce((s, v) => s + v.t, 0);
    if (shortcutHit(sum, [P, Q]))
      throw new Error("123X: 발문의 수를 한두 번 연산하면 답이 나온다");
    return `${sum}`;
  },

  // 124X — 뺄셈도 나눗셈도 안 쓴다. 소인수 개수 표와 문자 개수로 합치고 덜어낸다.
  "124X": (content) => {
    const g = grab(RE124, content, "124X");
    const ms: Mono[] = [monoFrom(g, 0), monoFrom(g, 3), monoFrom(g, 6)];
    for (const mo of ms) {
      if (mo.coef < 2)
        throw new Error("124X: 계수 $1$ 은 지면에 적히지 않아야 한다");
      if (mo.ex < 1 || mo.ey < 1)
        throw new Error("124X: 발문의 지수가 자연수가 아니다");
    }
    type Res = { coef: number | null; ex: number; ey: number };
    const res: Res[] = [];
    for (let i = 0; i < 3; i += 1) {
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      const merged = mergeCounts(
        primeCounts(ms[i]!.coef),
        primeCounts(ms[j]!.coef),
      );
      const left = takeCounts(merged, primeCounts(ms[k]!.coef));
      res.push({
        coef: countsToNatural(left),
        // 문자도 «개수»로 — 합친 뒤 덜어낸다.
        ex: ms[i]!.ex + ms[j]!.ex - ms[k]!.ex,
        ey: ms[i]!.ey + ms[j]!.ey - ms[k]!.ey,
      });
    }
    if (res.some((r) => r.coef === null))
      throw new Error("124X: 계수가 자연수가 아닌 계산이 있다 — 계수로 갈린다");
    if (res.some((r) => r.ex === 0 || r.ey === 0))
      throw new Error("124X: 지수가 $0$ 이 되는 계산이 있다 — 문자가 사라진다");
    const winners: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      if (res[i]!.ex >= 1 && res[i]!.ey >= 1) winners.push(i);
    }
    if (winners.length !== 1)
      throw new Error(`124X: 단항식이 ${winners.length}가지라 안 정해진다`);
    const win = winners[0]!;
    const w = res[win]!;
    if (w.coef! < 2)
      throw new Error("124X: 답의 계수가 $1$ 이라 지면에 안 적힌다");
    for (let i = 0; i < 3; i += 1) {
      if (i === win) continue;
      const b = res[i]!;
      const neg = (b.ex < 0 ? 1 : 0) + (b.ey < 0 ? 1 : 0);
      if (neg !== 1) throw new Error("124X: 죽는 계산이 한 축만 음수가 아니다");
    }
    return ownMonoTex(w.coef!, w.ex, w.ey);
  },
};

// ── ⑵ 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────

/** 양성 — 답을 아는 지면에서 그 답이 나온다. */
const CALIBRATION: readonly [string, string, string][] = [
  [
    "121X",
    "삼각형 $\\mathrm{ABC}$의 무게중심을 $\\mathrm{G}$, 변 $\\mathrm{AB}$의 중점을 $\\mathrm{M}$이라 하고, 변 $\\mathrm{AC}$ 위에 $\\overline{\\mathrm{AN}}:\\overline{\\mathrm{NC}}=2:7$인 점 $\\mathrm{N}$을 잡았다. 사각형 $\\mathrm{AMGN}$의 넓이가 $39\\,\\mathrm{cm}^2$일 때, 삼각형 $\\mathrm{GBC}$의 넓이를 구하시오.",
    "54\\,\\mathrm{cm}^2",
  ],
  [
    "122X",
    "등변사다리꼴 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BC}}$이고 $\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=2:7$이다. 꼭짓점 $\\mathrm{D}$를 지나 $\\overline{\\mathrm{AB}}$에 평행하게 그은 직선이 변 $\\mathrm{BC}$와 만나는 점을 $\\mathrm{E}$라 할 때, 삼각형 $\\mathrm{DEC}$는 정삼각형이다. 이 등변사다리꼴의 둘레의 길이가 $57\\,\\mathrm{cm}$일 때, $\\overline{\\mathrm{AB}}$의 길이를 구하시오.",
    "15\\,\\mathrm{cm}",
  ],
  [
    "123X",
    "길이가 $132\\,\\mathrm{cm}$인 양초 $\\mathrm{A}$와 길이가 $66\\,\\mathrm{cm}$인 양초 $\\mathrm{B}$에 동시에 불을 붙였다. 두 양초는 각각 $1$분에 일정한 길이만큼 짧아지고, $1$분에 짧아지는 길이는 둘 다 자연수 $\\mathrm{cm}$이다. 불을 붙인 지 $t$분 후에 두 양초의 길이가 처음으로 같아졌고, 그때 두 양초는 모두 다 타지 않고 남아 있었다. 자연수 $t$의 값을 모두 구하여 그 합을 구하시오.",
    "78",
  ],
  [
    "124X",
    "세 단항식 $A=4x^{2}y$, $B=12x^{2}y^{5}$, $C=12x^{5}y$ 중에서 두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 서로 다른 세 가지 결과를 얻는다. 그 세 가지 가운데 단항식이 되는 것은 오직 하나이고 나머지 둘은 분모에 문자가 남는다. 단항식이 되는 것을 구하시오.",
    "36x^{5}y^{5}",
  ],
];

/**
 * 음성 — 불변식을 어긴 지면은 **던진다.**
 *
 * 🔴 눈금은 **자기 축을 홀로 갈라야** 한다. 그래서 여기 지면은 재려는 축 하나만
 * 어기게 지었다(다른 불변식에도 걸리면 무엇을 재는지 알 수 없다).
 */
const REJECTS: readonly [string, string, string][] = [
  [
    "121X",
    "$m=n=1$ 이면 답이 주어진 값 그대로다",
    "삼각형 $\\mathrm{ABC}$의 무게중심을 $\\mathrm{G}$, 변 $\\mathrm{AB}$의 중점을 $\\mathrm{M}$이라 하고, 변 $\\mathrm{AC}$ 위에 $\\overline{\\mathrm{AN}}:\\overline{\\mathrm{NC}}=1:1$인 점 $\\mathrm{N}$을 잡았다. 사각형 $\\mathrm{AMGN}$의 넓이가 $39\\,\\mathrm{cm}^2$일 때, 삼각형 $\\mathrm{GBC}$의 넓이를 구하시오.",
  ],
  [
    "121X",
    "답이 정수로 안 떨어진다",
    "삼각형 $\\mathrm{ABC}$의 무게중심을 $\\mathrm{G}$, 변 $\\mathrm{AB}$의 중점을 $\\mathrm{M}$이라 하고, 변 $\\mathrm{AC}$ 위에 $\\overline{\\mathrm{AN}}:\\overline{\\mathrm{NC}}=1:2$인 점 $\\mathrm{N}$을 잡았다. 사각형 $\\mathrm{AMGN}$의 넓이가 $21\\,\\mathrm{cm}^2$일 때, 삼각형 $\\mathrm{GBC}$의 넓이를 구하시오.",
  ],
  [
    "121X",
    "발문의 수를 곱하면 답이 나온다 (지름길)",
    "삼각형 $\\mathrm{ABC}$의 무게중심을 $\\mathrm{G}$, 변 $\\mathrm{AB}$의 중점을 $\\mathrm{M}$이라 하고, 변 $\\mathrm{AC}$ 위에 $\\overline{\\mathrm{AN}}:\\overline{\\mathrm{NC}}=1:2$인 점 $\\mathrm{N}$을 잡았다. 사각형 $\\mathrm{AMGN}$의 넓이가 $20\\,\\mathrm{cm}^2$일 때, 삼각형 $\\mathrm{GBC}$의 넓이를 구하시오.",
  ],
  [
    "122X",
    "둘레가 칸 수로 안 나누어떨어져 그런 사다리꼴이 없다",
    "등변사다리꼴 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BC}}$이고 $\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=2:7$이다. 꼭짓점 $\\mathrm{D}$를 지나 $\\overline{\\mathrm{AB}}$에 평행하게 그은 직선이 변 $\\mathrm{BC}$와 만나는 점을 $\\mathrm{E}$라 할 때, 삼각형 $\\mathrm{DEC}$는 정삼각형이다. 이 등변사다리꼴의 둘레의 길이가 $58\\,\\mathrm{cm}$일 때, $\\overline{\\mathrm{AB}}$의 길이를 구하시오.",
  ],
  [
    "122X",
    "$n-m=1$ 이라 마무리가 아무 일도 안 하는 곱셈이다",
    "등변사다리꼴 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BC}}$이고 $\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=2:3$이다. 꼭짓점 $\\mathrm{D}$를 지나 $\\overline{\\mathrm{AB}}$에 평행하게 그은 직선이 변 $\\mathrm{BC}$와 만나는 점을 $\\mathrm{E}$라 할 때, 삼각형 $\\mathrm{DEC}$는 정삼각형이다. 이 등변사다리꼴의 둘레의 길이가 $70\\,\\mathrm{cm}$일 때, $\\overline{\\mathrm{AB}}$의 길이를 구하시오.",
  ],
  [
    "122X",
    "윗변이 아랫변보다 길다",
    "등변사다리꼴 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BC}}$이고 $\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=7:2$이다. 꼭짓점 $\\mathrm{D}$를 지나 $\\overline{\\mathrm{AB}}$에 평행하게 그은 직선이 변 $\\mathrm{BC}$와 만나는 점을 $\\mathrm{E}$라 할 때, 삼각형 $\\mathrm{DEC}$는 정삼각형이다. 이 등변사다리꼴의 둘레의 길이가 $57\\,\\mathrm{cm}$일 때, $\\overline{\\mathrm{AB}}$의 길이를 구하시오.",
  ],
  [
    "122X",
    "발문의 두 수의 차가 그대로 답이다 (지름길)",
    "등변사다리꼴 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BC}}$이고 $\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=2:7$이다. 꼭짓점 $\\mathrm{D}$를 지나 $\\overline{\\mathrm{AB}}$에 평행하게 그은 직선이 변 $\\mathrm{BC}$와 만나는 점을 $\\mathrm{E}$라 할 때, 삼각형 $\\mathrm{DEC}$는 정삼각형이다. 이 등변사다리꼴의 둘레의 길이가 $19\\,\\mathrm{cm}$일 때, $\\overline{\\mathrm{AB}}$의 길이를 구하시오.",
  ],
  [
    "123X",
    "버리는 후보가 없어 「$t<Q$」가 장식이 된다",
    "길이가 $102\\,\\mathrm{cm}$인 양초 $\\mathrm{A}$와 길이가 $90\\,\\mathrm{cm}$인 양초 $\\mathrm{B}$에 동시에 불을 붙였다. 두 양초는 각각 $1$분에 일정한 길이만큼 짧아지고, $1$분에 짧아지는 길이는 둘 다 자연수 $\\mathrm{cm}$이다. 불을 붙인 지 $t$분 후에 두 양초의 길이가 처음으로 같아졌고, 그때 두 양초는 모두 다 타지 않고 남아 있었다. 자연수 $t$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "123X",
    "살아남는 후보가 $3$개가 안 된다",
    "길이가 $15\\,\\mathrm{cm}$인 양초 $\\mathrm{A}$와 길이가 $3\\,\\mathrm{cm}$인 양초 $\\mathrm{B}$에 동시에 불을 붙였다. 두 양초는 각각 $1$분에 일정한 길이만큼 짧아지고, $1$분에 짧아지는 길이는 둘 다 자연수 $\\mathrm{cm}$이다. 불을 붙인 지 $t$분 후에 두 양초의 길이가 처음으로 같아졌고, 그때 두 양초는 모두 다 타지 않고 남아 있었다. 자연수 $t$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "123X",
    "살아남는 후보가 $7$개를 넘어 나열 줄이 길어진다",
    "길이가 $91\\,\\mathrm{cm}$인 양초 $\\mathrm{A}$와 길이가 $31\\,\\mathrm{cm}$인 양초 $\\mathrm{B}$에 동시에 불을 붙였다. 두 양초는 각각 $1$분에 일정한 길이만큼 짧아지고, $1$분에 짧아지는 길이는 둘 다 자연수 $\\mathrm{cm}$이다. 불을 붙인 지 $t$분 후에 두 양초의 길이가 처음으로 같아졌고, 그때 두 양초는 모두 다 타지 않고 남아 있었다. 자연수 $t$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "123X",
    "짧은 양초의 길이를 두 배 하면 답이 나온다 (지름길)",
    "길이가 $20\\,\\mathrm{cm}$인 양초 $\\mathrm{A}$와 길이가 $8\\,\\mathrm{cm}$인 양초 $\\mathrm{B}$에 동시에 불을 붙였다. 두 양초는 각각 $1$분에 일정한 길이만큼 짧아지고, $1$분에 짧아지는 길이는 둘 다 자연수 $\\mathrm{cm}$이다. 불을 붙인 지 $t$분 후에 두 양초의 길이가 처음으로 같아졌고, 그때 두 양초는 모두 다 타지 않고 남아 있었다. 자연수 $t$의 값을 모두 구하여 그 합을 구하시오.",
  ],
  [
    "124X",
    "두 축이 같은 자리를 죽여 단항식이 둘이다",
    "세 단항식 $A=4x^{2}y$, $B=12x^{2}y$, $C=12x^{5}y^{5}$ 중에서 두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 서로 다른 세 가지 결과를 얻는다. 그 세 가지 가운데 단항식이 되는 것은 오직 하나이고 나머지 둘은 분모에 문자가 남는다. 단항식이 되는 것을 구하시오.",
  ],
  [
    "124X",
    "계수가 자연수가 아닌 계산이 있어 계수만 보고 고를 수 있다",
    "세 단항식 $A=2x^{2}y$, $B=3x^{2}y^{5}$, $C=5x^{5}y$ 중에서 두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 서로 다른 세 가지 결과를 얻는다. 그 세 가지 가운데 단항식이 되는 것은 오직 하나이고 나머지 둘은 분모에 문자가 남는다. 단항식이 되는 것을 구하시오.",
  ],
  [
    "124X",
    "답의 계수가 $1$ 이라 지면에 안 적힌다",
    "세 단항식 $A=2x^{5}y$, $B=2xy^{5}$, $C=4xy$ 중에서 두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 서로 다른 세 가지 결과를 얻는다. 그 세 가지 가운데 단항식이 되는 것은 오직 하나이고 나머지 둘은 분모에 문자가 남는다. 단항식이 되는 것을 구하시오.",
  ],
  [
    "124X",
    "지면 모양이 다르다 (옛 「… 이 있다」 발문)",
    "세 단항식 $A=4x^{2}y$, $B=12x^{2}y^{5}$, $C=12x^{5}y$이 있다. 이 셋 중에서 두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 서로 다른 세 가지 결과를 얻는다. 그 세 가지 가운데 단항식이 되는 것은 오직 하나이고 나머지 둘은 분모에 문자가 남는다. 단항식이 되는 것을 구하시오.",
  ],
];

describe("중2 확대 갈래 5차 f — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
    for (const t of ["121X", "122X", "123X", "124X"]) {
      expect(
        CALIBRATION.filter(([k]) => k === t).length,
        `${t} 양성 눈금`,
      ).toBeGreaterThan(0);
      expect(
        REJECTS.filter(([k]) => k === t).length,
        `${t} 음성 눈금`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("중2 확대 갈래 5차 f — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5F.length).toBe(4);
    expect(M2_TOP_5F.map((e) => e.rpmType)).toEqual([
      "121X",
      "122X",
      "123X",
      "124X",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5F) {
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
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_5F) {
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

  it("🔴 `123X` 의 중단원 이름에 **가는 공백 U+2009** 가 실제로 들어 있다", () => {
    // 보통 공백 둘로 치면 눈으로는 같고 조회만 조용히 빗나간다 — 그 자리를 못 박는다.
    expect(E123.rpmMinor.includes("\u2009")).toBe(true);
    expect(E123.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑵");
  });

  it("네 유형이 어느 소단원에 붙는지 못 박는다 (브리프가 준 이름 그대로)", () => {
    expect(
      M2_TOP_5F.map((e) => [e.rpmBook, e.rpmType, e.rpmMinor, e.unitSection]),
    ).toEqual([
      ["2-2", "121X", "삼각형의 무게중심", "삼각형의 무게중심"],
      ["2-2", "122X", "여러 가지 사각형", "등변사다리꼴, 여러 가지 사각형"],
      [
        "2-1",
        "123X",
        "일차함수와 그 그래프\u2009 ⑵",
        "일차함수의 활용(온도, 길이)",
      ],
      ["2-1", "124X", "단항식의 계산", "단항식의 곱셈과 나눗셈"],
    ]);
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_5F) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !M2_TOP_5F.includes(t),
      );
      expect(
        others.length,
        `${e.unitSection} 에 등록된 다른 유형이 하나도 없다 — 조회가 빗나갔을 수 있다`,
      ).toBeGreaterThan(0);
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
    const foreign = registeredTypes().filter((e) => !M2_TOP_5F.includes(e));
    for (const e of M2_TOP_5F) {
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
    for (const e of M2_TOP_5F) {
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

// ── 넓은 표본은 한 번만 만든다 (블록 넷 × 800판) ────────────

type WideStats = {
  maxPx: number;
  worstPx: string;
  perBlock: { block: number; top: number; distinct: number }[];
  pageFaults: string[];
  fractionsSeen: number;
  arithmeticSeen: number;
};

const WIDE_CACHE = new Map<string, WideStats>();

function wideStats(e: TypeEntry): WideStats {
  const hit = WIDE_CACHE.get(e.rpmType);
  if (hit) return hit;
  let maxPx = 0;
  let worstPx = "";
  let fractionsSeen = 0;
  let arithmeticSeen = 0;
  const pageFaults: string[] = [];
  const perBlock: WideStats["perBlock"] = [];
  for (const block of SEED_BLOCKS) {
    const counts = new Map<string, number>();
    for (const p of rows(e, WIDE, block)) {
      counts.set(p.answer, (counts.get(p.answer) ?? 0) + 1);
      const both = `${p.content}\n${p.solution}\n${p.answer}`;
      const px = estimateSolutionPx(p.solution);
      if (px > maxPx) {
        maxPx = px;
        worstPx = p.content;
      }
      fractionsSeen += fractionCount(both);
      arithmeticSeen += arithmeticClaims(p.solution);
      const smells = pageSmells(both);
      if (smells.length)
        pageFaults.push(`냄새 ${smells.join(",")} — ${p.content}`);
      const josa = josaMismatches(both);
      if (josa.length) pageFaults.push(`조사 ${josa.join(",")} — ${p.content}`);
      const euro = euroRoMismatches(both);
      if (euro.length)
        pageFaults.push(`(으)로 ${euro.join(",")} — ${p.content}`);
      const bare = bareNumbers(p.content);
      if (bare.length)
        pageFaults.push(`맨 숫자 ${bare.join(",")} — ${p.content}`);
      if (pointsAtFigure(p.content) !== null)
        pageFaults.push(`그림 지시 — ${p.content}`);
      if (declaredUpperBound(p.content) !== null)
        pageFaults.push(`상한 선언 — ${p.content}`);
      if (p.figureSpec !== null) pageFaults.push(`그림 스펙 — ${p.content}`);
      const unred = unreducedFractions(both);
      if (unred.length)
        pageFaults.push(`기약 아님 ${unred.join(",")} — ${p.solution}`);
      if (/\*\*/.test(p.solution)) pageFaults.push(`굵게 표시 — ${p.content}`);
      if (/그 중/.test(both))
        pageFaults.push(`「그 중」 띄어쓰기 — ${p.content}`);
      const rep = repeatedStatement(p.solution);
      if (rep !== null) pageFaults.push(`되풀이 ${rep} — ${p.content}`);
      const arith = arithmeticFaults(p.solution);
      if (arith.length)
        pageFaults.push(`산술 ${arith.join(",")} — ${p.solution}`);
      const words = wordFaults(e.rpmType, p.solution);
      if (words.length)
        pageFaults.push(`말 ${words.join(",")} — ${p.solution}`);
    }
    perBlock.push({
      block,
      top: Math.max(...counts.values()),
      distinct: counts.size,
    });
  }
  const out: WideStats = {
    maxPx,
    worstPx,
    perBlock,
    pageFaults,
    fractionsSeen,
    arithmeticSeen,
  };
  WIDE_CACHE.set(e.rpmType, out);
  return out;
}

describe("중2 확대 갈래 5차 f — 지면과 값", () => {
  for (const e of M2_TOP_5F) {
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
            e.rpmType === "121X"
              ? `$${f.x}\\,\\mathrm{cm}^2$`
              : e.rpmType === "122X"
                ? `$${f.x}\\,\\mathrm{cm}$`
                : e.rpmType === "123X"
                  ? `$${f.x}$`
                  : `$${ownMonoTex(f.x!, f.ex!, f.ey!)}$`;
          expect(rebuilt, p.content).toBe(p.answer);
          // 계약 ⑹.2 — `facts.x` 는 답의 **첫 수**다.
          const firstNumber = mathIntegers(p.answer)[0];
          expect(firstNumber, p.answer).toBe(f.x);
        }
      });

      it("지면을 제품 렌더러로 그려도 붉지 않다", () => {
        for (const p of sample()) {
          const both = `${p.content}\n${p.solution}\n${p.answer}`;
          expect(brokenRender(both), p.content).toBe(false);
        }
      });

      it(`지면이 깨끗하다 — 냄새·조사·(으)로·맨 숫자·그림·상한·기약·되풀이·산술·말 (블록 넷 × ${WIDE}판)`, () => {
        const st = wideStats(e);
        expect(st.pageFaults.slice(0, 5), `${e.rpmType} 지면 결함`).toEqual([]);
        expect(st.pageFaults.length, `${e.rpmType} 지면 결함 수`).toBe(0);
      });

      it("🔴 산술 등식 자가 **무언가를 실제로 봤다** — 0 은 «못 셈»이다", () => {
        const st = wideStats(e);
        // 네 유형 모두 판마다 **적어도 하나**의 산술 등식을 적는다.
        expect(
          st.arithmeticSeen,
          `${e.rpmType} 산술 주장 수`,
        ).toBeGreaterThanOrEqual(SEED_BLOCKS.length * WIDE);
      });

      it("🔴 분수 자가 **무엇을 봤는지** 유형마다 못 박는다", () => {
        const st = wideStats(e);
        if (e.rpmType === "121X") {
          // 통분·역수 곱까지 판마다 여럿이다.
          expect(st.fractionsSeen).toBeGreaterThanOrEqual(
            SEED_BLOCKS.length * WIDE * 5,
          );
        } else {
          // 🔴 여기의 «0» 은 «깨끗»이 아니라 **«잴 것이 없다»** 다 —
          //    `122X`·`123X` 는 분수를 안 쓰고 `124X` 의 분수는 분자에 문자가 있다.
          expect(st.fractionsSeen, `${e.rpmType} 는 수 분수를 안 쓴다`).toBe(0);
        }
      });

      it(`🔴 해설이 정답지 한 단을 안 넘는다 — 최대 ${SOLUTION_PX_LIMIT}px 미만`, () => {
        const st = wideStats(e);
        expect(
          st.maxPx,
          `${e.rpmType} 최대 해설 높이\n${st.worstPx}`,
        ).toBeLessThan(SOLUTION_PX_LIMIT);
      });

      it(`🔴 변형 폭과 정답 쏠림 (씨앗 블록 ${SEED_BLOCKS.length} × ${WIDE}판)`, () => {
        const floor = VARIANT_FLOOR[e.rpmType]!;
        const seen = new Set<string>();
        for (let v = 0; v < floor * 2; v += 1) {
          seen.add(
            e.handler(createRng(BASE_SEED + 12345 + v * 0x9e37)).content,
          );
        }
        expect(seen.size, `${e.rpmType} 변형 폭`).toBeGreaterThanOrEqual(floor);

        for (const b of wideStats(e).perBlock) {
          expect(
            (b.top / WIDE) * 100,
            `${e.rpmType} 블록 ${b.block} 최빈 정답`,
          ).toBeLessThan(SKEW_LIMIT);
          expect(
            b.distinct,
            `${e.rpmType} 블록 ${b.block} 서로 다른 정답`,
          ).toBeGreaterThanOrEqual(30);
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
          expect(estimateSolutionPx(p.solution), p.content).toBeLessThan(
            SOLUTION_PX_LIMIT,
          );
        }
        // 변형 공간이 좁아 세트를 못 채우면 던진다 — 그 자리를 여기서 확인한다.
        expect(
          generateMiddleSet(e.key, BASE_SEED, VARIANT_FLOOR[e.rpmType]!).length,
        ).toBe(VARIANT_FLOOR[e.rpmType]);
      });
    });
  }
});

// ── 🔴 해설의 중간값을 **다른 길로** 다시 잰다 ─────────────

const RE121_RATIO =
  /\$\\overline\{\\mathrm\{AN\}\}:\\overline\{\\mathrm\{AC\}\}=(\d+):(\d+)\$/;
const RE121_AGN =
  /삼각형 \$\\mathrm\{AGN\}\$의 넓이는 \$\\dfrac\{(\d+)\}\{(\d+)\}\\times\\dfrac\{1\}\{3\}S=\\dfrac\{(\d+)\}\{(\d+)\}S\$이다\./;
const RE121_SUM =
  /\\dfrac\{1\}\{6\}S\+\\dfrac\{(\d+)\}\{(\d+)\}S=\\dfrac\{(\d+)\+(\d+)\}\{(\d+)\}S\$이고, 분자를 계산하면 \$(\d+)\+(\d+)=(\d+)\$이므로 \$\\dfrac\{(\d+)\}\{(\d+)\}S\$이다\./;
const RE121_TOTAL =
  /\$\\dfrac\{(\d+)\}\{(\d+)\}S=(\d+)\$에서 \$S=(\d+)\\times\\dfrac\{(\d+)\}\{(\d+)\}=(\d+)\$이다\./;
const RE121_LAST =
  /따라서 삼각형 \$\\mathrm\{GBC\}\$의 넓이는 \$(\d+)\\,\\mathrm\{cm\}\^2\$이다\. 실제로 \$(\d+)\\times3=(\d+)\$이다\./;

const RE122_UNITS =
  /\$\\overline\{\\mathrm\{AD\}\}=(\d*)k\\,\\mathrm\{cm\}\$, \$\\overline\{\\mathrm\{BC\}\}=(\d*)k\\,\\mathrm\{cm\}\$인 양수 \$k\$가 있고, 이때 \$\\overline\{\\mathrm\{AB\}\}=\\overline\{\\mathrm\{DC\}\}=(\d*)k\\,\\mathrm\{cm\}\$이다\./;
const RE122_SUM =
  /네 변의 길이의 합은 \$(\d*)k\+(\d*)k\+(\d*)k\+(\d*)k=(\d*)k\$이고 이 값이 \$(\d+)\$이므로, \$(\d+)\$(?:을|를) \$(\d+)\$(?:으로|로) 나누면 \$k=(\d+)\$이다\./;
const RE122_LAST =
  /따라서 \$\\overline\{\\mathrm\{AB\}\}\$의 길이는 \$(\d+)\\times(\d+)=(\d+)\\,\(\\mathrm\{cm\}\)\$이다\./;

const RE123_DIFF = /양변을 정리하면 \$\(a-b\)t=(\d+)-(\d+)=(\d+)\$이다\./;
const RE123_BOUND =
  /\$bt<(\d+)\$이고, \$b\$는 \$1\$ 이상이므로 \$t<(\d+)\$이어야 한다\. 즉 \$t\$가 \$(\d+)\$(?:을|를) 넘거나 \$(\d+)\$(?:와|과) 같으면/;
const RE123_EXAMPLE =
  /이를테면 \$t=(\d+)\$일 때 \$a-b=(\d+)\$이고 \$b=1\$로 잡으면/;
const RE123_LAST = /따라서 구하는 합은 \$([\d+]+)=(\d+)\$이다\./;

const RE124_STEP =
  /\$([A-C])\\times ([A-C])\\div ([A-C])\$에서 계수는 \$(\d+)\\times(\d+)=(\d+)\$(?:을|를) \$(\d+)\$(?:으로|로) 나눈 \$(\d+)\$이고, \$x\$의 지수는 \$(\d+)\+(\d+)-(\d+)=(-?\d+)\$, \$y\$의 지수는 \$(\d+)\+(\d+)-(\d+)=(-?\d+)\$이다\. 그러므로 \$[A-C]\\times [A-C]\\div [A-C]=([^$]+)\$이다\./g;
const RE124_LAST =
  /따라서 단항식이 되는 것은 \$([A-C])\\times ([A-C])\\div ([A-C])\$ 하나뿐이고, 그 단항식은 \$([^$]+)\$이다\./;

/** 목록을 `$1$, $2$` 꼴로 — 제품 `listTex` 를 안 부른다. */
function ownListTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

describe("중2 확대 갈래 5차 f — 🔴 해설의 중간값·말을 다른 길로 다시 잰다", () => {
  it("`121X` — 비·조각 넓이·통분·전체 넓이·마무리를 **다섯 다** 맞댄다", () => {
    let seen = 0;
    for (const p of rows(E121)) {
      const [mT, nT, sT] = grab(RE121, p.content, "121X");
      const m = num(mT);
      const n = num(nT);
      const s = num(sT);
      const sol = p.solution;

      const [an, ac] = grab(RE121_RATIO, sol, "121X 비");
      expect([num(an), num(ac)], p.content).toEqual([m, m + n]);

      const agn = grab(RE121_AGN, sol, "121X 조각").map(num);
      // $\dfrac{m}{m+n}$ 은 기약이라야 하고, 그 $\dfrac13$ 이 $\dfrac{m}{3(m+n)}$ 이다.
      expect([agn[0], agn[1]], p.content).toEqual(reduceFractionHere(m, m + n));
      expect([agn[2], agn[3]], p.content).toEqual(
        reduceFractionHere(agn[0]!, agn[1]! * 3),
      );

      const sum = grab(RE121_SUM, sol, "121X 통분").map(num);
      expect([sum[0], sum[1]], p.content).toEqual([agn[2], agn[3]]);
      expect([sum[2], sum[3], sum[4]], p.content).toEqual([
        m + n,
        2 * m,
        6 * (m + n),
      ]);
      expect([sum[5], sum[6], sum[7]], p.content).toEqual([
        m + n,
        2 * m,
        m + n + 2 * m,
      ]);
      // 통분한 값이 실제로 $\dfrac16+\dfrac{m}{3(m+n)}$ 과 같은가.
      const lhs = ratAdd(rat(1, 6), rat(agn[2]!, agn[3]!));
      expect([lhs[0], lhs[1]], p.content).toEqual([sum[8], sum[9]]);

      const tot = grab(RE121_TOTAL, sol, "121X 전체").map(num);
      expect([tot[0], tot[1]], p.content).toEqual([sum[8], sum[9]]);
      expect(tot[2], p.content).toBe(s);
      expect(tot[3], p.content).toBe(s);
      expect([tot[4], tot[5]], p.content).toEqual([sum[9], sum[8]]);
      expect(tot[6]! * sum[8]!, p.content).toBe(s * sum[9]!);

      const last = grab(RE121_LAST, sol, "121X 마무리").map(num);
      expect(last[0], p.content).toBe(last[1]);
      expect(last[1]! * 3, p.content).toBe(last[2]);
      expect(last[2], p.content).toBe(tot[6]);
      expect(`$${last[0]}\\,\\mathrm{cm}^2$`, p.content).toBe(p.answer);
      seen += 1;
    }
    expect(seen).toBe(SAMPLE);
  });

  it("`122X` — 칸 수·둘레·나눗셈·마무리를 **넷 다** 맞댄다", () => {
    let seen = 0;
    for (const p of rows(E122)) {
      const [mT, nT, pT] = grab(RE122, p.content, "122X");
      const m = num(mT);
      const n = num(nT);
      const P = num(pT);
      const sol = p.solution;
      const one = (s: string | undefined): number => (s === "" ? 1 : num(s));

      const u = grab(RE122_UNITS, sol, "122X 칸").map(one);
      expect([u[0], u[1]], p.content).toEqual([m, n]);
      expect(u[2], p.content).toBe(n - m);

      const su = grab(RE122_SUM, sol, "122X 둘레");
      const c = [one(su[0]), one(su[1]), one(su[2]), one(su[3])];
      const units = one(su[4]);
      expect(c, p.content).toEqual([m, n, n - m, n - m]);
      expect(c[0]! + c[1]! + c[2]! + c[3]!, p.content).toBe(units);
      expect(num(su[5]), p.content).toBe(P);
      expect(num(su[6]), p.content).toBe(P);
      expect(num(su[7]), p.content).toBe(units);
      const k = num(su[8]);
      expect(units * k, p.content).toBe(P);

      const last = grab(RE122_LAST, sol, "122X 마무리").map(num);
      expect(last[0], p.content).toBe(n - m);
      expect(last[1], p.content).toBe(k);
      expect(last[0]! * last[1]!, p.content).toBe(last[2]);
      expect(`$${last[2]}\\,\\mathrm{cm}$`, p.content).toBe(p.answer);
      // 🔴 ⑺ 3 — 마무리가 「아무 일도 안 하는 곱셈」이면 안 된다.
      expect(last[0], p.content).toBeGreaterThanOrEqual(2);
      expect(last[1], p.content).toBeGreaterThanOrEqual(2);
      seen += 1;
    }
    expect(seen).toBe(SAMPLE);
  });

  it("`123X` — 약수 나열·버림·남김·보기·합을 **다섯 다** 맞댄다 (㉴ 제약을 지키는가)", () => {
    let seen = 0;
    for (const p of rows(E123)) {
      const [pT, qT] = grab(RE123, p.content, "123X");
      const P = num(pT);
      const Q = num(qT);
      const sol = p.solution;

      const diff = grab(RE123_DIFF, sol, "123X 차").map(num);
      expect([diff[0], diff[1]], p.content).toEqual([P, Q]);
      expect(diff[2], p.content).toBe(P - Q);
      const D = diff[2]!;

      // 약수 나열 — 곱셈 짝으로 다시 세고 **오름차순**까지 견준다.
      const divisorLine = lineWith(sol, "그 약수는", "123X");
      const listed = [
        ...divisorLine
          .slice(divisorLine.indexOf("그 약수는"))
          .matchAll(/\$(\d+)\$/g),
      ].map((mm) => num(mm[1]));
      const truth: number[] = [];
      for (let d = 1; d <= D; d += 1) {
        for (let e2 = 1; e2 <= D; e2 += 1) {
          if (d * e2 === D) {
            truth.push(d);
            break;
          }
        }
      }
      expect(listed, p.content).toEqual(truth);

      const bound = grab(RE123_BOUND, sol, "123X 경계").map(num);
      expect(bound, p.content).toEqual([Q, Q, Q, Q]);

      // 버림·남김 — ㉴ 「선언한 제약 안에 있는가」.
      const dropLine = lineWith(sol, "조건을 만족하지 않고", "123X");
      const head = dropLine.slice(
        dropLine.indexOf("약수 가운데"),
        dropLine.indexOf("조건을 만족하지 않고"),
      );
      const tail = dropLine.slice(dropLine.indexOf("남는 것은"));
      const dropped = [...head.matchAll(/\$(\d+)\$/g)].map((mm) => num(mm[1]));
      const keptAll = [...tail.matchAll(/\$(\d+)\$/g)].map((mm) => num(mm[1]));
      const kept = keptAll.slice(0, keptAll.length - 1);
      const count = keptAll[keptAll.length - 1]!;
      expect(dropped.length, p.content).toBeGreaterThan(0);
      for (const v of dropped)
        expect(
          v,
          `${p.content}\n버린 ${v} 가 $t<${Q}$ 안에 있다`,
        ).toBeGreaterThanOrEqual(Q);
      for (const v of kept)
        expect(v, `${p.content}\n남긴 ${v} 가 $t<${Q}$ 밖이다`).toBeLessThan(Q);
      expect(
        [...kept, ...dropped].sort((a, b) => a - b),
        p.content,
      ).toEqual(truth);
      expect(count, p.content).toBe(kept.length);
      expect(kept.length, p.content).toBeGreaterThanOrEqual(3);
      expect(kept.length, p.content).toBeLessThanOrEqual(7);
      // 나열 줄이 실제로 그 목록을 적었는가(글자까지).
      expect(sol.includes(ownListTex(kept)), p.content).toBe(true);
      expect(sol.includes(ownListTex(dropped)), p.content).toBe(true);

      // 보기로 든 후보를 **실제로 태워** 본다.
      const ex = grab(RE123_EXAMPLE, sol, "123X 보기").map(num);
      expect(ex[0], p.content).toBe(kept[kept.length - 1]);
      expect(ex[1]! * ex[0]!, p.content).toBe(D);
      const a = 1 + ex[1]!;
      expect(P - a * ex[0]!, p.content).toBe(Q - ex[0]!);
      expect(Q - ex[0]!, p.content).toBeGreaterThan(0);

      const last = grab(RE123_LAST, sol, "123X 합");
      expect(last[0]!.split("+").map(Number), p.content).toEqual(kept);
      expect(
        kept.reduce((s2, v) => s2 + v, 0),
        p.content,
      ).toBe(num(last[1]));
      expect(`$${last[1]}$`, p.content).toBe(p.answer);
      seen += 1;
    }
    expect(seen).toBe(SAMPLE);
  });

  it("`124X` — 세 계산의 계수·지수·지면 글자와 마무리를 **전부** 맞댄다", () => {
    let seen = 0;
    for (const p of rows(E124)) {
      const g = grab(RE124, p.content, "124X");
      const ms: Mono[] = [monoFrom(g, 0), monoFrom(g, 3), monoFrom(g, 6)];
      const names = ["A", "B", "C"];
      const steps = [...p.solution.matchAll(RE124_STEP)];
      expect(steps.length, p.content).toBe(3);
      const printed: { coef: number; ex: number; ey: number }[] = [];
      for (let i = 0; i < 3; i += 1) {
        const st = steps[i]!;
        const j = (i + 1) % 3;
        const k = (i + 2) % 3;
        expect([st[1], st[2], st[3]], p.content).toEqual([
          names[i],
          names[j],
          names[k],
        ]);
        expect([num(st[4]), num(st[5])], p.content).toEqual([
          ms[i]!.coef,
          ms[j]!.coef,
        ]);
        const prod = num(st[6]);
        expect(ms[i]!.coef * ms[j]!.coef, p.content).toBe(prod);
        expect(num(st[7]), p.content).toBe(ms[k]!.coef);
        const quo = num(st[8]);
        expect(quo * ms[k]!.coef, p.content).toBe(prod);
        expect([num(st[9]), num(st[10]), num(st[11])], p.content).toEqual([
          ms[i]!.ex,
          ms[j]!.ex,
          ms[k]!.ex,
        ]);
        const ex = num(st[12]);
        expect(ms[i]!.ex + ms[j]!.ex - ms[k]!.ex, p.content).toBe(ex);
        expect([num(st[13]), num(st[14]), num(st[15])], p.content).toEqual([
          ms[i]!.ey,
          ms[j]!.ey,
          ms[k]!.ey,
        ]);
        const ey = num(st[16]);
        expect(ms[i]!.ey + ms[j]!.ey - ms[k]!.ey, p.content).toBe(ey);
        // 지면 글자를 **직접 다시 지어** 맞댄다 (제품 `resultBody` 를 안 부른다).
        const want =
          ex >= 1 && ey >= 1
            ? ownMonoTex(quo, ex, ey)
            : ex < 0
              ? `\\dfrac{${quo === 1 ? "" : quo}${ey === 1 ? "y" : `y^{${ey}}`}}{${-ex === 1 ? "x" : `x^{${-ex}}`}}`
              : `\\dfrac{${quo === 1 ? "" : quo}${ex === 1 ? "x" : `x^{${ex}}`}}{${-ey === 1 ? "y" : `y^{${-ey}}`}}`;
        expect(st[17], p.content).toBe(want);
        printed.push({ coef: quo, ex, ey });
      }
      // 🔴 계수만 보고는 못 고른다 — 셋 다 자연수, 그리고 축마다 자연수인 것이 둘.
      for (const r of printed)
        expect(Number.isInteger(r.coef), p.content).toBe(true);
      for (const r of printed)
        expect(r.coef, p.content).toBeGreaterThanOrEqual(1);
      expect(printed.filter((r) => r.ex >= 1).length, p.content).toBe(2);
      expect(printed.filter((r) => r.ey >= 1).length, p.content).toBe(2);

      const last = grab(RE124_LAST, p.solution, "124X 마무리");
      const winIdx = names.indexOf(last[0]!);
      expect(winIdx, p.content).toBeGreaterThanOrEqual(0);
      expect([last[1], last[2]], p.content).toEqual([
        names[(winIdx + 1) % 3],
        names[(winIdx + 2) % 3],
      ]);
      const w = printed[winIdx]!;
      expect(w.ex, p.content).toBeGreaterThanOrEqual(1);
      expect(w.ey, p.content).toBeGreaterThanOrEqual(1);
      expect(last[3], p.content).toBe(ownMonoTex(w.coef, w.ex, w.ey));
      expect(`$${last[3]}$`, p.content).toBe(p.answer);
      // 죽는 둘은 **서로 다른 축**에서 죽는다.
      const deadIdx = [0, 1, 2].filter((i) => i !== winIdx);
      const negAxes = deadIdx.map((i) =>
        printed[i]!.ex < 0 ? "x" : printed[i]!.ey < 0 ? "y" : "?",
      );
      expect(new Set(negAxes), p.content).toEqual(new Set(["x", "y"]));
      seen += 1;
    }
    expect(seen).toBe(SAMPLE);
  });

  it("🔴 `123X` — 버리는 근거가 **나눗셈이 아니다** (공용 「정수 경계」 축이 잴 것이 없는 까닭)", () => {
    for (const p of rows(E123, 60)) {
      const line = lineWith(p.solution, "이상이므로", "123X");
      // 경계가 곧 $Q$ 라 나눗셈도 내림도 없다 — 그래서 공용 훑개가 볼 것이 없다.
      expect(/\\dfrac|\\div|나눈|나누면/.test(line), p.content).toBe(false);
      const [q1, q2] = grab(RE123_BOUND, p.solution, "123X").map(num);
      expect(q1, p.content).toBe(q2);
    }
  });
});

/** 검산 전용 기약분수 — 제품 `reduceFraction` 을 안 부른다. */
function reduceFractionHere(n: number, d: number): [number, number] {
  const g = gcd2(n, d) || 1;
  return [n / g, d / g];
}

describe("중2 확대 갈래 5차 f — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  it.each(M2_TOP_5F.map((e) => [e.rpmType, e] as const))(
    "%s — 발문과 독립 검산이 낳은 값만 지면에 있다",
    (_t, e) => {
      let seen = 0;
      for (const p of rows(e, 80)) {
        const allowed = new Set<number>([1, 2, 3, 6]);
        if (e.rpmType === "121X") {
          const [mT, nT, sT] = grab(RE121, p.content, "121X");
          const m = num(mT);
          const n = num(nT);
          const s = num(sT);
          const [rn, rd] = reduceFractionHere(3 * m + n, 6 * (m + n));
          const total = (s * rd) / rn;
          for (const v of [
            m,
            n,
            s,
            m + n,
            2 * m,
            3 * (m + n),
            6 * (m + n),
            rn,
            rd,
            total,
            total / 3,
            ...reduceFractionHere(m, m + n),
            ...reduceFractionHere(m, 3 * (m + n)),
          ])
            allowed.add(v);
        } else if (e.rpmType === "122X") {
          const [mT, nT, pT] = grab(RE122, p.content, "122X");
          const m = num(mT);
          const n = num(nT);
          const P = num(pT);
          const units = 3 * n - m;
          for (const v of [
            m,
            n,
            P,
            units,
            n - m,
            P / units,
            ((n - m) * P) / units,
          ])
            allowed.add(v);
        } else if (e.rpmType === "123X") {
          const [pT, qT] = grab(RE123, p.content, "123X");
          const P = num(pT);
          const Q = num(qT);
          const D = P - Q;
          // 🔴 음수도 넣는다 — `$132-66=66$` 의 `-66` 이 그대로 정수로 읽힌다.
          for (const v of [P, Q, D, -P, -Q, -D]) allowed.add(v);
          let sum = 0;
          let live = 0;
          for (let d = 1; d <= D; d += 1) {
            for (let e2 = 1; e2 <= D; e2 += 1) {
              if (d * e2 === D) {
                allowed.add(d);
                allowed.add(e2);
                if (d < Q) {
                  sum += d;
                  live += 1;
                }
                break;
              }
            }
          }
          allowed.add(sum);
          allowed.add(live); // 「남는 것은 … 의 $N$개이다」
        } else {
          const g = grab(RE124, p.content, "124X");
          const ms: Mono[] = [monoFrom(g, 0), monoFrom(g, 3), monoFrom(g, 6)];
          for (const mo of ms) {
            for (const v of [mo.coef, mo.ex, mo.ey]) {
              allowed.add(v);
              allowed.add(-v);
            }
          }
          for (let i = 0; i < 3; i += 1) {
            const j = (i + 1) % 3;
            const k = (i + 2) % 3;
            const prod = ms[i]!.coef * ms[j]!.coef;
            allowed.add(prod);
            allowed.add(prod / ms[k]!.coef);
            const ex = ms[i]!.ex + ms[j]!.ex - ms[k]!.ex;
            const ey = ms[i]!.ey + ms[j]!.ey - ms[k]!.ey;
            for (const v of [ex, ey]) {
              allowed.add(v);
              allowed.add(-v);
            }
          }
        }
        const unexplained = mathIntegers(p.solution).filter(
          (v) => !allowed.has(v),
        );
        expect(unexplained, `${p.content}\n${p.solution}`).toEqual([]);
        seen += 1;
      }
      expect(seen).toBe(80);
    },
  );
});

describe("중2 확대 갈래 5차 f — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`121X` — 발문 세 수의 한두 번 연산이 답과 늘 다르다", () => {
    for (const p of rows(E121)) {
      const [mT, nT, sT] = grab(RE121, p.content, "121X");
      const ans = mathIntegers(p.answer)[0]!;
      expect(shortcutHit(ans, [num(mT), num(nT), num(sT)]), p.content).toBe(
        false,
      );
    }
  });

  it("`122X` — 발문 세 수의 한두 번 연산이 답과 늘 다르다", () => {
    for (const p of rows(E122)) {
      const [mT, nT, pT] = grab(RE122, p.content, "122X");
      const ans = mathIntegers(p.answer)[0]!;
      expect(shortcutHit(ans, [num(mT), num(nT), num(pT)]), p.content).toBe(
        false,
      );
    }
  });

  it("`123X` — 발문 두 수의 한두 번 연산이 답과 늘 다르다", () => {
    for (const p of rows(E123)) {
      const [pT, qT] = grab(RE123, p.content, "123X");
      const ans = mathIntegers(p.answer)[0]!;
      expect(shortcutHit(ans, [num(pT), num(qT)]), p.content).toBe(false);
    }
    // ⚠️ 「합이 $P-Q$ 의 약수 하나와 같으면 안 된다」도 걸어 봤는데 **뺐다.**
    //    실측(P=129·Q=12)에서 합 $13$ 이 $117$ 의 약수와 겹쳤지만, 약수 목록은
    //    **발문에 없다** — 학생이 그것을 알려면 이미 풀이를 절반 한 것이고, 게다가
    //    합은 목록의 최대도 최소도 아니라 «찍을 자리»가 아니다. 거짓 경보는 가드를
    //    끈다(2026-08-20). 진짜 지름길($P$·$Q$ 로 도달하는 값)은 위 줄이 막는다.
  });

  it("🔴 치환 대조 — 「우연히 안 걸린 것」이 아니다 (다른 판의 답을 이 판의 수에 대 본다)", () => {
    const axes: [string, TypeEntry, RegExp][] = [
      ["121X", E121, RE121],
      ["122X", E122, RE122],
      ["123X", E123, RE123],
    ];
    for (const [t, e, re] of axes) {
      const pool = rows(e, 300).map((p) => ({
        nums: grab(re, p.content, t).map(num),
        ans: mathIntegers(p.answer)[0]!,
      }));
      let own = 0;
      let swapped = 0;
      for (let i = 0; i < pool.length; i += 1) {
        const mine = pool[i]!;
        const other = pool[(i + 1) % pool.length]!;
        if (shortcutHit(mine.ans, mine.nums)) own += 1;
        if (shortcutHit(other.ans, mine.nums)) swapped += 1;
      }
      // 제품은 **0** 이어야 하고, 우연 수준(치환)은 **0 이 아니어야** 한다 —
      // 치환도 0 이면 이 자는 아무것도 못 재는 것이고 우리 0 은 «못 셈»이다.
      expect(own, `${t} 제 답이 지름길에 걸린 수`).toBe(0);
      expect(
        swapped,
        `${t} 치환 대조가 0 이다 — 이 자가 이 유형에서 아무것도 못 잡는다`,
      ).toBeGreaterThan(0);
    }
    // 🔴 `124X` 에는 이 축이 **없다** — 답이 수가 아니라 단항식이라 「지면 수의 한두
    //    번 연산」이 성립하지 않는다(모듈 ⑷). 그 자리를 대신하는 세 불변식은
    //    「해설의 중간값」과 「D-20 손실 원장」이 전량으로 확인한다.
    expect(mathIntegers(rows(E124, 1)[0]!.answer).length).toBeGreaterThan(1);
  });

  it("`124X` — 답이 발문 세 단항식 가운데 하나와 같지 않다", () => {
    for (const p of rows(E124)) {
      const g = grab(RE124, p.content, "124X");
      const ms: Mono[] = [monoFrom(g, 0), monoFrom(g, 3), monoFrom(g, 6)];
      const printed = ms.map((mo) => `$${ownMonoTex(mo.coef, mo.ex, mo.ey)}$`);
      expect(printed.includes(p.answer), p.content).toBe(false);
    }
  });
});

describe("중2 확대 갈래 5차 f — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("🔴 `121X` — 재는 마디는 「조각이 **셋**」이 아니라 「셋의 넓이가 **같다**」이다", () => {
    // 🔴 이 회차가 전수로 재어 찾은 것 — `shareDen` 은 **비**를 흔들지만 **답**은
    //    못 흔든다($d$ 가 약분된다). 모듈 머리말이 그렇게 적혀 있는지까지 못 박는다.
    expect(centroidQuadRatio(2, 7)).not.toEqual(centroidQuadRatio(2, 7, 4));
    for (const p of rows(E121, 60)) {
      const m = p.facts.m!;
      const n = p.facts.n!;
      const s = p.facts.quad!;
      expect(centroidPieceArea(s, m, n), p.content).toBe(p.facts.x);
      // 조각 수를 흔들어도 답은 그대로다 — «있다»가 아니라 «같다»가 마디다.
      expect(centroidPieceArea(s, m, n, 4), p.content).toBe(p.facts.x);
      expect(centroidPieceArea(s, m, n, 7), p.content).toBe(p.facts.x);
    }
    expect(
      MODULE_SRC.includes("$d$ 가 통째로 약분된다"),
      "모듈이 아직 「$d$ 를 흔들면 답이 달라져야 한다」고 적고 있다",
    ).toBe(true);
  });

  it("🔴 `121X` — 학생이 실제로 하는 두 실수를 재현하면 답이 달라진다", () => {
    // 답은 $\dfrac{2(m+n)}{3m+n}s$ 다. 아래 둘은 **다른 유리수**여야 한다.
    //  ⒜ $\mathrm{M}$ 이 중점임을 잊는다 → $\dfrac{m+n}{2m+n}s$
    //  ⒝ $\overline{\mathrm{AN}}:\overline{\mathrm{AC}}$ 를 $m:n$ 으로 읽는다 → $\dfrac{2n}{2m+n}s$
    let seenA = 0;
    let seenB = 0;
    for (const p of rows(E121, 60)) {
      const m = p.facts.m!;
      const n = p.facts.n!;
      const s = p.facts.quad!;
      const real = rat(2 * s * (m + n), 3 * m + n);
      expect([real[0], real[1]], p.content).toEqual([p.facts.x, 1]);
      const missMid = rat(s * (m + n), 2 * m + n);
      const missRatio = rat(2 * s * n, 2 * m + n);
      expect(missMid, p.content).not.toEqual(real);
      expect(missRatio, p.content).not.toEqual(real);
      seenA += 1;
      seenB += 1;
    }
    expect([seenA, seenB]).toEqual([60, 60]);
  });

  it("`122X` — 평행사변형 걸음을 빠뜨리면(`useParallelogram=false`) 다리가 달라진다", () => {
    let changed = 0;
    for (const p of rows(E122, 60)) {
      const m = p.facts.m!;
      const n = p.facts.n!;
      const P = p.facts.perimeter!;
      const real = trapezoidLeg(m, n, P);
      const shaken = trapezoidLeg(m, n, P, false);
      expect(real, p.content).toBe(p.facts.x);
      if (shaken !== real) changed += 1;
    }
    expect(changed, "걸음을 빠뜨렸는데 답이 그대로인 판이 있다").toBe(60);
  });

  it("`123X` — 「다 타 버린 후보를 버린다」를 지우면(`prune=false`) 합이 커진다", () => {
    for (const p of rows(E123, 60)) {
      const D = p.facts.diff!;
      const Q = p.facts.shorter!;
      const real = survivingTimes(D, Q).reduce((a, b) => a + b, 0);
      const shaken = survivingTimes(D, Q, false).reduce((a, b) => a + b, 0);
      expect(real, p.content).toBe(p.facts.x);
      expect(shaken, p.content).toBeGreaterThan(real);
    }
  });

  it("`124X` — 「지수가 자연수라야 단항식」을 지우면 답이 안 정해진다", () => {
    for (const p of rows(E124, 60)) {
      const t: MonomialTriple = {
        coefs: [p.facts.ca!, p.facts.cb!, p.facts.cc!],
        xs: [p.facts.xa!, p.facts.xb!, p.facts.xc!],
        ys: [p.facts.ya!, p.facts.yb!, p.facts.yc!],
      };
      expect(uniqueMonomialIndex(t), p.content).toBe(p.facts.win);
      expect(uniqueMonomialIndex(t, false), p.content).toBeNull();
    }
  });
});

describe("중2 확대 갈래 5차 f — 굳힘 함수 (손 실측)", () => {
  it("`reduceFraction` 은 기약으로 줄이고 분모를 양수로 둔다", () => {
    expect(reduceFraction(4, 8)).toEqual([1, 2]);
    expect(reduceFraction(3, -6)).toEqual([-1, 2]);
    expect(reduceFraction(13, 54)).toEqual([13, 54]);
    expect(() => reduceFraction(1, 0)).toThrow();
  });

  it("`centroidQuadRatio` 는 «셋으로 나눈다»를 실제로 쓴다", () => {
    // 손 실측: $\dfrac16+\dfrac{2}{27}=\dfrac{13}{54}$.
    expect(centroidQuadRatio(2, 7)).toEqual([13, 54]);
    // $m=n=1$ 이면 사각형이 정확히 $\dfrac13$ — 그래서 그 판을 안 낸다.
    expect(centroidQuadRatio(1, 1)).toEqual([1, 3]);
    // 조각 수를 $4$ 로 흔들면 값이 달라진다.
    expect(centroidQuadRatio(2, 7, 4)).toEqual([13, 72]);
    expect(() => centroidQuadRatio(0, 3)).toThrow();
    expect(() => centroidQuadRatio(2, 7, 1)).toThrow();
  });

  it("`centroidPieceArea` 는 정수로 안 떨어지면 `null` 이다", () => {
    expect(centroidPieceArea(39, 2, 7)).toBe(54);
    expect(centroidPieceArea(40, 2, 7)).toBeNull();
    expect(centroidPieceArea(0, 2, 7)).toBeNull();
  });

  it("`CENTROID_PAIRS` 는 네 가드를 모두 통과한 짝만 담는다", () => {
    expect(CENTROID_PAIRS.length).toBe(18);
    for (const [m, n] of CENTROID_PAIRS) {
      expect(m).not.toBe(n);
      expect(gcd2(m, n)).toBe(1);
      expect(m % 3).not.toBe(0);
      expect(gcd2(3 * m + n, 6 * (m + n))).toBe(1);
    }
  });

  it("`trapezoidLeg` 는 평행사변형 걸음을 실제로 쓴다", () => {
    expect(trapezoidLeg(2, 7, 57)).toBe(15); // 칸 $19$ · $k=3$ · 다리 $5$칸
    expect(trapezoidLeg(1, 3, 40)).toBe(10);
    expect(trapezoidLeg(1, 3, 40, false)).toBe(12); // 걸음을 빠뜨리면 $n$ 칸이 된다
    expect(trapezoidLeg(2, 7, 58)).toBeNull(); // 칸 수로 안 나누어떨어진다
    expect(() => trapezoidLeg(7, 2, 57)).toThrow();
  });

  it("`TRAPEZOID_PAIRS` 는 $n-m\\ge2$ 인 기약 짝만 담는다", () => {
    expect(TRAPEZOID_PAIRS.length).toBe(31);
    for (const [m, n] of TRAPEZOID_PAIRS) {
      expect(n - m).toBeGreaterThanOrEqual(2);
      expect(gcd2(m, n)).toBe(1);
    }
  });

  it("`divisorsOf`·`survivingTimes` (손 실측)", () => {
    expect(divisorsOf(66)).toEqual([1, 2, 3, 6, 11, 22, 33, 66]);
    expect(divisorsOf(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
    expect(divisorsOf(1)).toEqual([1]);
    expect(() => divisorsOf(0)).toThrow();
    expect(survivingTimes(66, 66)).toEqual([1, 2, 3, 6, 11, 22, 33]);
    expect(survivingTimes(66, 66, false)).toEqual([1, 2, 3, 6, 11, 22, 33, 66]);
    expect(() => survivingTimes(66, 0)).toThrow();
  });

  it("`CANDLE_PAIRS` 는 다섯 가드를 통과한 짝만 담는다", () => {
    expect(CANDLE_PAIRS.length).toBe(2060);
    for (const [D, Q] of CANDLE_PAIRS) {
      const divs = divisorsOf(D);
      expect(divs.length).toBeGreaterThanOrEqual(6);
      expect(divs.length).toBeLessThanOrEqual(12);
      const live = divs.filter((v) => v < Q);
      expect(live.length).toBeGreaterThanOrEqual(3);
      expect(live.length).toBeLessThanOrEqual(7);
      expect(live.length).toBeLessThan(divs.length);
      expect(Q + D).toBeLessThanOrEqual(200);
    }
  });

  it("`monomialResults`·`uniqueMonomialIndex` (손 실측)", () => {
    const t: MonomialTriple = {
      coefs: [4, 12, 12],
      xs: [2, 2, 5],
      ys: [1, 5, 1],
    };
    expect(monomialResults(t)).toEqual([
      { coef: 4, ex: -1, ey: 5 },
      { coef: 36, ex: 5, ey: 5 },
      { coef: 4, ex: 5, ey: -3 },
    ]);
    expect(uniqueMonomialIndex(t)).toBe(1);
    expect(uniqueMonomialIndex(t, false)).toBeNull();
  });

  it("`MONO_COEF_TRIOS`·`MONO_EXP_TRIOS` 는 이 유형이 서는 자리만 담는다", () => {
    expect(MONO_COEF_TRIOS.length).toBe(105);
    for (const [p, q, r] of MONO_COEF_TRIOS) {
      for (const v of [p, q, r]) expect(v).toBeGreaterThanOrEqual(2);
      const c = [(p * q) / r, (q * r) / p, (r * p) / q];
      for (const v of c) expect(Number.isInteger(v)).toBe(true);
      expect(new Set(c).size).toBeGreaterThanOrEqual(2);
      expect(Math.max(...c)).toBeLessThanOrEqual(144);
    }
    expect(MONO_EXP_TRIOS.length).toBe(93);
    for (const t of MONO_EXP_TRIOS) {
      const [a, b, c] = t.base;
      expect(t.results).toEqual([a! + b! - c!, b! + c! - a!, c! + a! - b!]);
      expect(t.results.filter((v) => v < 0).length).toBe(1);
      expect(t.results.some((v) => v === 0)).toBe(false);
      expect(t.results[t.who]).toBeLessThan(0);
    }
  });

  it("`coefTerm`·`powBody`·`monomialBody`·`resultBody` (지면 규약 ⑻)", () => {
    expect(coefTerm(1, "k")).toBe("k");
    expect(coefTerm(3, "k")).toBe("3k");
    expect(coefTerm(1, "")).toBe("");
    expect(() => coefTerm(0, "k")).toThrow();
    expect(powBody("x", 1)).toBe("x");
    expect(powBody("x", 3)).toBe("x^{3}");
    expect(() => powBody("x", 0)).toThrow();
    expect(monomialBody(6, 2, 1)).toBe("6x^{2}y");
    expect(monomialBody(1, 1, 1)).toBe("xy");
    expect(resultBody({ coef: 4, ex: -1, ey: 5 })).toBe("\\dfrac{4y^{5}}{x}");
    expect(resultBody({ coef: 4, ex: 5, ey: -3 })).toBe(
      "\\dfrac{4x^{5}}{y^{3}}",
    );
    expect(resultBody({ coef: 36, ex: 5, ey: 5 })).toBe("36x^{5}y^{5}");
    expect(() => resultBody({ coef: 2, ex: -1, ey: -1 })).toThrow();
  });

  it("`looksLikeShortcut` 은 이 시험의 자와 **같은 답**을 낸다 (규칙이 두 벌이 아니다)", () => {
    const cases: [number, number[]][] = [
      [24, [1, 2, 20]],
      [54, [2, 7, 39]],
      [5, [2, 7, 19]],
      [78, [132, 66]],
      [16, [20, 8]],
      [15, [2, 7, 57]],
    ];
    for (const [ans, nums] of cases) {
      expect(looksLikeShortcut(ans, nums), `${ans} ← ${nums}`).toBe(
        shortcutHit(ans, nums),
      );
    }
    // 양성·음성이 **둘 다** 있어야 이 대조가 뜻이 있다.
    expect(cases.filter(([a, n]) => shortcutHit(a, n)).length).toBeGreaterThan(
      0,
    );
    expect(cases.filter(([a, n]) => !shortcutHit(a, n)).length).toBeGreaterThan(
      0,
    );
  });
});

describe("중2 확대 갈래 5차 f — 검사기 자신의 눈금", () => {
  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("$9+4=13$이다.")).toEqual([]);
    expect(arithmeticFaults("$9+4=14$이다.")).toHaveLength(1);
    expect(arithmeticFaults("$54\\times3=162$")).toEqual([]);
    expect(arithmeticFaults("$54\\times3=163$")).toHaveLength(1);
    expect(arithmeticFaults("$132-66=66$")).toEqual([]);
    expect(arithmeticFaults("$2+2-5=-1$")).toEqual([]);
    expect(arithmeticFaults("$2+2-5=-2$")).toHaveLength(1);
    expect(arithmeticClaims("$9+4=13$이고 $54\\times3=162$이다.")).toBe(2);
  });

  it("`unreducedFractions` 는 약분 안 한 분수와 **분모 $1$** 을 잡는다", () => {
    expect(unreducedFractions("$\\dfrac{13}{54}$")).toEqual([]);
    expect(unreducedFractions("$\\dfrac{2}{4}$")).toEqual(["2/4"]);
    expect(unreducedFractions("$\\dfrac{5}{1}$")).toEqual(["5/1"]);
    // 분자가 합의 꼴이면 «통분한 각 항»이 판정 대상이 아니다 — 그 사실을 못 박는다.
    expect(fractionCount("$\\dfrac{9+4}{54}$")).toBe(0);
    expect(fractionCount("$\\dfrac{13}{54}$")).toBe(1);
  });

  it("`euroRoMismatches` 는 ㄹ 받침을 가른다 (「$7$으로」는 틀렸다)", () => {
    expect(euroRoMismatches("$19$로 나누면")).toEqual([]);
    expect(euroRoMismatches("$3$으로 나누면")).toEqual([]);
    expect(euroRoMismatches("$7$으로 나누면")).toHaveLength(1);
    expect(euroRoMismatches("$3$로 나누면")).toHaveLength(1);
    expect(euroRoMismatches("$-1$로 음수이므로")).toEqual([]);
    expect(euroRoMismatches("$-3$로 음수이므로")).toHaveLength(1);
  });

  it("🔴 `wordFaults` 는 낱말을 뒤집으면 빨개진다 (양성·음성 둘 다)", () => {
    const flips: readonly [string, string, string][] = [
      ["121X", "넓이가 같은 세 삼각형", "넓이가 다른 세 삼각형"],
      ["121X", "중점이므로", "끝점이므로"],
      ["121X", "높이가 같으므로", "높이가 다르므로"],
      ["121X", "대각선", "변"],
      ["121X", "절반인", "두 배인"],
      ["122X", "평행사변형이다", "마름모이다"],
      ["122X", "이미 이등변삼각형이고", "이미 직각삼각형이고"],
      [
        "122X",
        "평행하지 않은 두 변의 길이는 같으므로",
        "평행한 두 변의 길이는 같으므로",
      ],
      [
        "122X",
        "대변의 길이는 각각 같으므로",
        "이웃한 변의 길이는 각각 같으므로",
      ],
      ["122X", "나머지 한 변이 같아야 하므로", "나머지 한 각이 같아야 하므로"],
      ["123X", "의 약수이고", "의 배수이고"],
      ["123X", "이상이므로", "이하이므로"],
      ["123X", "이미 다 타 버린다", "아직 남아 있다"],
      ["123X", "모두 조건을 만족한다", "모두 조건을 만족하지 않는다"],
      ["123X", "도 자연수이다", "도 정수이다"],
      ["124X", "계수만으로는 가릴 수 없고", "계수만으로 가릴 수 있고"],
      ["124X", "가 분모에 남는다", "가 분자에 남는다"],
      ["124X", "그러므로 단항식이 아니다", "그러므로 단항식이다"],
      ["124X", "하나뿐이고", "둘뿐이고"],
    ];
    const base: Record<string, string> = {};
    for (const e of M2_TOP_5F) base[e.rpmType] = rows(e, 1)[0]!.solution;
    // 양성 — 손 안 댄 해설은 깨끗하다.
    for (const [t, sol] of Object.entries(base))
      expect(wordFaults(t, sol), t).toEqual([]);
    // 음성 — 낱말을 하나 뒤집으면 반드시 잡힌다.
    for (const [t, from, to] of flips) {
      const sol = base[t]!;
      const flipped = sol.replace(from, to);
      // ⚠️ 뜻이 실제로 바뀌었는지 먼저 확인한다 — 안 바뀌면 「가드가 아니다」가 거짓말이다.
      expect(flipped, `${t}: 「${from}」가 해설에 없다`).not.toBe(sol);
      expect(wordFaults(t, flipped), `${t}: 「${from}」→「${to}」`).not.toEqual(
        [],
      );
    }
    // 유형마다 적어도 넷을 흔들어 본다.
    for (const t of ["121X", "122X", "123X", "124X"])
      expect(flips.filter(([k]) => k === t).length, t).toBeGreaterThanOrEqual(
        4,
      );
  });

  it("🔴 `VERIFY` 는 모듈의 굳힘 함수를 **한 번도 안 부른다** (지면만 본다)", () => {
    // 함수 본문에 모듈 함수 이름이 있으면 검산이 동어반복이 된다.
    for (const [key, fn] of Object.entries(VERIFY)) {
      const src = fn.toString();
      for (const banned of [
        "centroidQuadRatio",
        "centroidPieceArea",
        "trapezoidLeg",
        "survivingTimes",
        "divisorsOf",
        "monomialResults",
        "uniqueMonomialIndex",
        "resultBody",
        "monomialBody",
        "reduceFraction",
        "looksLikeShortcut",
        "facts",
      ]) {
        expect(src.includes(banned), `${key} 가 ${banned} 를 쓴다`).toBe(false);
      }
    }
  });
});

// ── 🔴 D-20 손실 원장 (㉶) — 전수로 다시 센다 ───────────────

type LedgerRow = {
  type: string;
  label: string;
  combos: number;
  pct: string;
  kinds: number;
  top: string;
};

function tallyNums(vals: readonly number[]): { kinds: number; top: number } {
  const m = new Map<number, number>();
  for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
  return { kinds: m.size, top: Math.max(...m.values()) };
}

function tallyKeys(vals: readonly string[]): { kinds: number; top: number } {
  const m = new Map<string, number>();
  for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
  return { kinds: m.size, top: Math.max(...m.values()) };
}

function centroidCombos(opts: {
  distinct?: boolean;
  notMul3?: boolean;
  coprime?: boolean;
  guard?: boolean;
}): number[] {
  const {
    distinct = true,
    notMul3 = true,
    coprime = true,
    guard = true,
  } = opts;
  const out: number[] = [];
  for (let m = 1; m <= 9; m += 1)
    for (let n = 1; n <= 9; n += 1) {
      if (distinct && m === n) continue;
      if (gcd2(m, n) !== 1) continue;
      if (notMul3 && m % 3 === 0) continue;
      if (coprime && gcd2(3 * m + n, 6 * (m + n)) !== 1) continue;
      for (let k = 1; k <= 12; k += 1) {
        const [rn] = centroidQuadRatio(m, n);
        const s = rn * k;
        if (s < 20 || s > 400) continue;
        const ans = centroidPieceArea(s, m, n);
        if (ans === null) continue;
        if (guard && shortcutHit(ans, [m, n, s])) continue;
        out.push(ans);
      }
    }
  return out;
}

function trapezoidCombos(opts: { gap2?: boolean; guard?: boolean }): number[] {
  const { gap2 = true, guard = true } = opts;
  const out: number[] = [];
  for (let m = 1; m <= 9; m += 1)
    for (let n = m + (gap2 ? 2 : 1); n <= 11; n += 1) {
      if (gcd2(m, n) !== 1) continue;
      for (let t = 1; t <= 14; t += 1) {
        const P = (3 * n - m) * t;
        if (P < 24 || P > 220) continue;
        const ans = trapezoidLeg(m, n, P);
        if (ans === null) continue;
        if (guard && shortcutHit(ans, [m, n, P])) continue;
        out.push(ans);
      }
    }
  return out;
}

function candleCombos(opts: {
  needDead?: boolean;
  liveRange?: boolean;
  guard?: boolean;
}): number[] {
  const { needDead = true, liveRange = true, guard = true } = opts;
  const out: number[] = [];
  for (let d = 12; d <= 120; d += 1) {
    const divs = divisorsOf(d);
    if (divs.length < 6 || divs.length > 12) continue;
    for (let q = 6; q <= 90; q += 1) {
      const live = divs.filter((v) => v < q);
      if (liveRange && (live.length < 3 || live.length > 7)) continue;
      if (live.length < 3) continue; // 생성기가 한 번 더 확인하는 자리
      if (needDead && live.length === divs.length) continue;
      if (q + d > 200) continue;
      const ans = live.reduce((a, b) => a + b, 0);
      if (guard && shortcutHit(ans, [q + d, q])) continue;
      out.push(ans);
    }
  }
  return out;
}

function monoCombos(opts: {
  differentWho?: boolean;
  coefTwo?: boolean;
  oneAxis?: boolean;
  twoEach?: boolean;
}): string[] {
  const {
    differentWho = true,
    coefTwo = true,
    oneAxis = true,
    twoEach = true,
  } = opts;
  const out: string[] = [];
  for (const X of MONO_EXP_TRIOS)
    for (const Y of MONO_EXP_TRIOS) {
      if (differentWho && X.who === Y.who) continue;
      for (const [p, q, r] of MONO_COEF_TRIOS) {
        const triple: MonomialTriple = {
          coefs: [p, q, r],
          xs: X.base,
          ys: Y.base,
        };
        const win = uniqueMonomialIndex(triple);
        if (win === null) continue;
        const rs = monomialResults(triple);
        const w = rs[win]!;
        if (coefTwo && w.coef < 2) continue;
        if (oneAxis) {
          let bad = false;
          for (let i = 0; i < 3; i += 1) {
            if (i === win) continue;
            const b = rs[i]!;
            if (b.ex <= -1 && b.ey <= -1) bad = true;
            if (b.ex >= 1 && b.ey >= 1) bad = true;
          }
          if (bad) continue;
        }
        if (twoEach) {
          if (rs.filter((v) => v.ex >= 1).length !== 2) continue;
          if (rs.filter((v) => v.ey >= 1).length !== 2) continue;
        }
        out.push(`${w.coef}|${w.ex}|${w.ey}`);
      }
    }
  return out;
}

describe("중2 확대 갈래 5차 f — 🔴 D-20 손실 원장이 **재현된다** (㉶)", () => {
  // ⚠️ 전수는 **`it` 안에서** 센다. `describe` 몸통에서 세면 무언가 던졌을 때
  //    **수집 단계가 죽어** 어느 검사가 물었는지를 못 대게 된다(2026-08-23).
  type Product = {
    stats: Record<string, { kinds: number; top: number }>;
    combos: Record<string, number>;
  };
  let productCache: Product | null = null;
  const productOf = (): Product => {
    if (productCache !== null) return productCache;
    const c121 = centroidCombos({});
    const c122 = trapezoidCombos({});
    const c123 = candleCombos({});
    const c124 = monoCombos({});
    productCache = {
      stats: {
        "121X": tallyNums(c121),
        "122X": tallyNums(c122),
        "123X": tallyNums(c123),
        "124X": tallyKeys(c124),
      },
      combos: {
        "121X": c121.length,
        "122X": c122.length,
        "123X": c123.length,
        "124X": c124.length,
      },
    };
    return productCache;
  };

  it("제품(가드를 전부 켰을 때)의 조합·정답 가짓수·최빈이 모듈 표와 같다", () => {
    const want = [
      ["121X", 163, 52, "4.91"],
      ["122X", 127, 33, "6.30"],
      ["123X", 1703, 61, "4.23"],
      ["124X", 536238, 931, "1.15"],
    ] as const;
    const prod = productOf();
    for (const [t, combos, kinds, top] of want) {
      expect(prod.combos[t], `${t} 조합`).toBe(combos);
      expect(prod.stats[t]!.kinds, `${t} 정답 가짓수`).toBe(kinds);
      const pct = ((prod.stats[t]!.top / combos) * 100).toFixed(2);
      expect(pct, `${t} 최빈`).toBe(top);
      // 🔴 모듈 머리말 ⑷ 의 그 줄과 **글자 그대로** 대조한다.
      const row = `**${combos.toLocaleString("en-US")}** | **${kinds}** | **${top}%** |`;
      expect(MODULE_SRC.includes(row), `모듈 ⑷ 에 «${row}» 가 없다`).toBe(true);
    }
  });

  it("가드를 **하나씩** 껐을 때의 조합·비율·정답 가짓수·최빈이 모듈 표와 같다", () => {
    const prod = productOf();
    const rowsOff: LedgerRow[] = [];
    const push = (
      type: string,
      label: string,
      vals: readonly number[] | readonly string[],
    ): void => {
      const t =
        typeof vals[0] === "string"
          ? tallyKeys(vals as readonly string[])
          : tallyNums(vals as readonly number[]);
      rowsOff.push({
        type,
        label,
        combos: vals.length,
        pct: ((prod.combos[type]! / vals.length) * 100).toFixed(1),
        kinds: t.kinds,
        top: ((t.top / vals.length) * 100).toFixed(2),
      });
    };
    push("121X", "지름길", centroidCombos({ guard: false }));
    push("121X", "3∤m", centroidCombos({ notMul3: false }));
    push("121X", "gcd", centroidCombos({ coprime: false }));
    push("121X", "m≠n", centroidCombos({ distinct: false }));
    push("122X", "지름길", trapezoidCombos({ guard: false }));
    push("122X", "n-m≥2", trapezoidCombos({ gap2: false }));
    push("123X", "지름길", candleCombos({ guard: false }));
    push("123X", "버리는 것", candleCombos({ needDead: false }));
    push("123X", "살아남는 것", candleCombos({ liveRange: false }));
    push("124X", "계수 2 이상", monoCombos({ coefTwo: false }));

    const want: Record<string, [number, string, number, string]> = {
      "121X|지름길": [201, "81.1", 61, "4.98"],
      "121X|3∤m": [248, "65.7", 61, "4.44"],
      "121X|gcd": [227, "71.8", 63, "3.52"],
      "121X|m≠n": [163, "100.0", 52, "4.91"],
      "122X|지름길": [288, "44.1", 43, "5.90"],
      "122X|n-m≥2": [146, "87.0", 38, "5.48"],
      "123X|지름길": [2060, "82.7", 62, "4.85"],
      "123X|버리는 것": [2253, "75.6", 69, "4.31"],
      "123X|살아남는 것": [2261, "75.3", 76, "4.82"],
      "124X|계수 2 이상": [605430, "88.6", 980, "1.02"],
    };
    for (const r of rowsOff) {
      const key = `${r.type}|${r.label}`;
      expect(want[key], `${key} 가 기대표에 없다`).toBeDefined();
      expect([r.combos, r.pct, r.kinds, r.top], key).toEqual(want[key]);
      // 🔴 모듈 머리말 ⑷ 의 그 줄과 **글자 그대로** 대조한다.
      const row = `| **${r.combos.toLocaleString("en-US")}** | ${r.pct}% | ${r.kinds} | ${r.top}% |`;
      expect(MODULE_SRC.includes(row), `모듈 ⑷ 에 «${row}» 가 없다`).toBe(true);
    }
    expect(rowsOff.length).toBe(Object.keys(want).length);
  });

  it("🔴 «가드처럼 적혔지만 아무것도 안 자르는» 다섯을 못 박는다 (넓히면 빨개진다)", () => {
    const prod = productOf();
    // 121X 의 $m\ne n$ — 뒤 가드가 이미 잘라 낸다.
    expect(centroidCombos({ distinct: false }).length).toBe(
      prod.combos["121X"],
    );
    // 124X 의 셋 — `MONO_EXP_TRIOS` 가 보장하는 **불변식**이다.
    expect(monoCombos({ differentWho: false }).length).toBe(
      prod.combos["124X"],
    );
    expect(monoCombos({ oneAxis: false }).length).toBe(prod.combos["124X"]);
    expect(monoCombos({ twoEach: false }).length).toBe(prod.combos["124X"]);
    // 123X 생성기 안의 두 번째 확인 — 풀이 이미 둘 다 보장한다.
    // 🔴 변이 하네스가 그 줄을 지웠는데 **산출물이 한 글자도 안 바뀌어** 알았다.
    for (const [D, Q] of CANDLE_PAIRS) {
      const divs = divisorsOf(D);
      const live = survivingTimes(D, Q);
      const dead = divs.filter((v) => v >= Q);
      expect(live.length, `${D}/${Q}`).toBeGreaterThanOrEqual(3);
      expect(dead.length, `${D}/${Q}`).toBeGreaterThanOrEqual(1);
    }
    const row = "| **536,238** | 100.0% | 931 | 1.15% |";
    expect(MODULE_SRC.includes(row), `모듈 ⑷ 에 «${row}» 가 없다`).toBe(true);
    expect(
      MODULE_SRC.includes("아무것도 안 자르는 줄이 다섯 있다"),
      "모듈 ⑷ 가 아직 «넷»이라고 적고 있다",
    ).toBe(true);
  });

  it("🔴 잃은 정답 값 열과 「$t=1$ 이 하나도 안 산다」를 못 박는다", () => {
    const off = new Set(trapezoidCombos({ guard: false }));
    const on = new Set(trapezoidCombos({}));
    const lost = [...off].filter((v) => !on.has(v)).sort((a, b) => a - b);
    expect(lost).toEqual([2, 3, 4, 5, 6, 7, 10, 22, 26, 66]);
    expect(lost.filter((v) => v <= 10).length).toBe(7);
    expect(MODULE_SRC.includes("$2,3,4,5,6,7,10,22,26,66$")).toBe(true);
    // $t=1$ 이면 마무리가 $(n-m)\times1$ 이라 아무 일도 안 한다 — 하나도 안 살아남는다.
    let survivedWithT1 = 0;
    for (const [m, n] of TRAPEZOID_PAIRS) {
      const P = 3 * n - m; // $t=1$
      if (P < 24 || P > 220) continue;
      const ans = trapezoidLeg(m, n, P);
      if (ans === null) continue;
      if (!shortcutHit(ans, [m, n, P])) survivedWithT1 += 1;
    }
    expect(survivedWithT1).toBe(0);
  });
});

describe("중2 확대 갈래 5차 f — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `123X` 의 「$Q$과/와 같으면」이 **찍히는 수**를 따른다 (글자로 박지 않는다)", () => {
    let sawGwa = 0;
    let sawWa = 0;
    for (const p of rows(E123, 400)) {
      const Q = p.facts.shorter!;
      const want = [2, 4, 5, 9].includes(Q % 10) ? "와" : "과";
      expect(
        p.solution.includes(`$${Q}$${want} 같으면`),
        `${p.content}\n$${Q}$ 뒤에 「${want}」가 와야 한다`,
      ).toBe(true);
      if (want === "과") sawGwa += 1;
      else sawWa += 1;
    }
    // 🔴 양쪽이 **둘 다** 나와야 이 잠금이 뜻이 있다 — 한쪽만 나오면 글자로 박아도 초록이다.
    expect(sawGwa, "받침으로 끝나는 $Q$ 를 하나도 안 봤다").toBeGreaterThan(0);
    expect(sawWa, "모음으로 끝나는 $Q$ 를 하나도 안 봤다").toBeGreaterThan(0);
  });

  it("⑵ 🔴 `124X` 발문이 **문자 뒤 조사**를 아예 안 쓴다 (「$…y$이 있다」 재발 방지)", () => {
    let plainY = 0;
    for (const p of rows(E124, 400)) {
      expect(p.content.includes("$ 중에서 두 개를"), p.content).toBe(true);
      // 「이/가」가 수식 바로 뒤에 붙는 자리가 발문에 없어야 한다.
      expect(/\$[^$]*[a-zA-Z}]\$(?:이|가) /.test(p.content), p.content).toBe(
        false,
      );
      if (/C=[^$]*y\$ 중에서/.test(p.content)) plainY += 1;
    }
    // 🔴 그 자리(맨 $y$ 로 끝나는 판)를 **실제로 봤는가** — 0 이면 «못 셈»이다.
    expect(plainY, "맨 $y$ 로 끝나는 판을 하나도 안 봤다").toBeGreaterThan(0);
  });

  it("⑶ 🔴 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나간다", () => {
    for (const e of M2_TOP_5F)
      for (const p of rows(e, 40))
        expect(/\*\*/.test(`${p.content}${p.solution}`), p.content).toBe(false);
  });

  it("⑷ 🔴 우리말 — 「그 중」이 아니라 「그중」이다", () => {
    for (const e of M2_TOP_5F)
      for (const p of rows(e, 40))
        expect(/그 중/.test(`${p.content}${p.solution}`), p.content).toBe(
          false,
        );
  });

  it("⑸ 🔴 `121X` 의 통분 줄은 분자를 **합의 꼴**로 적는다 (기약 판정을 피하지 않는다)", () => {
    for (const p of rows(E121, 40)) {
      const line = lineWith(p.solution, "대각선", "121X");
      expect(/\\dfrac\{\d+\+\d+\}\{\d+\}/.test(line), p.content).toBe(true);
      // 그리고 **바로 다음에** 그 분자를 실제로 계산해 보인다(걸음을 안 건너뛴다).
      expect(/분자를 계산하면 \$\d+\+\d+=\d+\$/.test(line), p.content).toBe(
        true,
      );
    }
  });

  it("⑹ 🔴 `123X` 의 약수 나열은 **오름차순**이다 (풀이가 만든 목록이라 섞지 않는다 · ㉵)", () => {
    for (const p of rows(E123, 60)) {
      const line = lineWith(p.solution, "그 약수는", "123X");
      const listed = [
        ...line.slice(line.indexOf("그 약수는")).matchAll(/\$(\d+)\$/g),
      ].map((m) => num(m[1]));
      expect(listed.length, p.content).toBeGreaterThanOrEqual(6);
      expect(
        [...listed].sort((a, b) => a - b),
        p.content,
      ).toEqual(listed);
    }
  });

  it("⑺ 🔴 발문이 **상한을 선언하지 않는다** (㉱ — 파생 오답이 넘을 자리가 없다)", () => {
    for (const e of M2_TOP_5F)
      for (const p of rows(e, 40))
        expect(declaredUpperBound(p.content), p.content).toBeNull();
  });

  it("⑻ 🔴 정답이 **한 값**이다 (㉲ — 구간 답이면 파생 오답이 뒤집힌다)", () => {
    for (const e of M2_TOP_5F)
      for (const p of rows(e, 40)) {
        expect(
          /이상|이하|미만|초과|~|\\le|\\ge|</.test(p.answer),
          p.answer,
        ).toBe(false);
        // `$...$` 묶음이 정확히 하나고, 그 안에 목록 구분(쉼표+빈칸)이 없다.
        // ⚠️ `,` 하나만 세면 안 된다 — `\,` 는 KaTeX 의 **가는 빈칸**이다(단위 앞).
        expect([...p.answer.matchAll(/\$[^$]*\$/g)].length, p.answer).toBe(1);
        expect(p.answer.includes(", "), p.answer).toBe(false);
      }
  });
});
