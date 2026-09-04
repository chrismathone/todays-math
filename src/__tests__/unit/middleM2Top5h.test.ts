/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5h.ts`) — `심화상` 하나·`심화중` 둘을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `133X` | $c$ 를 $1$ 부터 훑으며 $90c\mp10r$ 이 $D=(10a+b)-a$ 의 배수인지 본다 | **$c$ 를 안 훑는다.** 순환소수 값을 **등비급수**로 세우고($0.a\overline{b}=\dfrac a{10}+\dfrac b{90}$), $x$ 를 $1$ 부터 넣어 좌변이 **정수가 되는 자리**를 찾는다. 「분자가 $D$ 의 배수」라는 규칙을 한 번도 안 쓴다 |
 * | `134X` | 「높이가 같은 두 삼각형의 넓이의 비는 밑변의 길이의 비」를 **두 번** 곱한다 | **넓이의 비 정리를 한 번도 안 쓴다.** $B$·$C$·$A$ 를 좌표에 놓고 $D$·$E$ 를 내분점으로 만든 뒤 세 넓이를 **행렬식**으로 재서 $\triangle ABC/\triangle EBD$ 를 유리수로 낸다 |
 * | `135X` | 밑 다항식에서 시작해 단항식을 두 번 곱하거나 나눈다 | **지면의 잘못 계산한 식과 단항식만 읽어** 되돌린다. 그리고 그 답이 옳은지는 **여러 점에 수를 넣어**(대입) $A\times M^{2}$ 또는 $A\div M^{2}$ 가 지면 식과 같은지로 다시 본다 — 식 조작과 대입은 서로 다른 길이다 |
 *
 * ⚠️ **항의 차례와 지면 표기(계수 $\pm1$ 생략·지수 $1$ 생략)는 «규약»이라 옮겨 적는다.**
 * 그것까지 다른 길로 지으면 답 문자열을 아예 못 만든다. 대신 **값**은 위의 대입 검산이
 * 따로 본다 — 규약이 틀리면 문자열이, 값이 틀리면 대입이 잡는다.
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면 재현율만
 * 재고 지어냄은 구조적으로 0이 된다(2026-08-20). 음성 지면은 **재려는 축 하나만**
 * 어기게 지었다 — 여러 축에 걸리면 무엇을 재는지 알 수 없다.
 *
 * ## ⑶ 🔴 앞 물결들이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**(`5\times6+2=32` 꼴)을 뽑아 좌·우를 각각 계산해 맞댄다.
 *   ㄴ. **해설에 나온 모든 수가 재계산으로 설명되는가** — 발문에서 읽은 값과 독립
 *       검산이 낳은 값만 허용한다.
 *   ㄷ. **해설의 «말»**(㉳) — 굳힘 개념을 진술하는 낱말을 맞바꾸거나 지우면 빨개진다.
 *       그리고 **낱말만 세지 않는다**: `133X` 의 「배수」는 나열된 $c$ 마다 실제로
 *       나누어떨어지는지를(그리고 **거꾸로는 아닌지**를) 세어 확인하고, `134X` 의
 *       두 비는 **다시 계산**해 맞댄다. 낱말만 보면 「값이 틀린 진술」이 통과한다.
 *   ㄹ. **기약**(㉰) — 지면의 모든 `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아닌가.
 *   ㅁ. **해설 높이**(㉮) — 제품 `estimateSolutionPx` 로 **800판**을 재어 한 단(964.8px)이
 *       아니라 **700px** 아래로 잠근다. 실측 최대는 `133X` 289.9 · `134X` 252.1 ·
 *       `135X` 208.4 px 다.
 *   ㅂ. **㉴ 지면이 자기 제약을 어기는가** — `133X` 는 발문이 「$c$ 는 $18$ 이하」라고
 *       못 박으므로 해설이 나열한 $c$ 와 대입 줄의 $c$ 가 **전부 그 창 안**이어야 하고
 *       **서로 글자 그대로 같아야** 한다.
 *   ㅅ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 **못 보는 것** — 정직하게
 *
 * 1. **`josaMismatches` 가 이 갈래에서 잴 것이 거의 없다.** 세 유형 다 「수 바로 뒤에
 *    을/를·은/는·와/과」가 붙는 자리를 지면에 안 두었기 때문이다(모듈 ⑹ 7). 그러니
 *    그 자의 «0» 은 «깨끗»이 아니라 **«잴 것이 없다»** 다. 대신 이 파일이
 *    `monoJosaFaults` 로 **단항식 뒤 조사**를 따로 본다 — 그 축은 공용 자가 못 본다
 *    (수로 안 끝나기 때문에 구조적으로 건너뛴다).
 * 2. **`declaredUpperBound` 는 `133X` 의 「$c$ 는 $18$ 이하」를 못 읽는다.** 그 함수가
 *    보는 것은 「전체 일의 양을 $1$ 로 놓고」류의 **답에 걸린 상한**이다. `133X` 의
 *    상한은 **$c$ 에 걸린 것**이라 파생 오답이 그것을 넘어도 문항이 안 쉬워진다.
 *    그래서 ㉱ 는 이 갈래에서 «해당 없음»이고, 대신 ㅂ 을 잰다.
 * 3. **`135X` 의 지름길 축은 뜻이 얇다.** 답이 다항식이라 「찍힌 수 한두 번 연산」으로
 *    맞출 수 있는 것이 아니다. 실측으로 제 답 44.8% · 치환 대조 39.8% 라 **우연과
 *    구별되지 않는다** — 그래서 이 유형에는 지름길 가드를 안 걸고, 그 사실을 여기
 *    적는다(0 을 «깨끗»으로 읽지 않기 위해서다).
 * 4. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 이 회차의 해설은 세 유형 × 여섯 판을
 *    눈으로 읽었고, 그때 나온 것을 ⑹ 에 적었다.
 * 5. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 *
 * ## ⑸ 🔴 변이 시험
 *
 * 회차마다 **음성 대조**(변이 없이 초록)를 먼저 보고, ⑴ 파일이 바뀌었나
 * ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 를 차례로 물었다.
 * 굳힘 인자 셋(`subtractLead`·`wholeCevian`·`twice`)은 **답을 실제로 바꾼다** —
 * 400판 전량에서 갈렸다(133X 400/400 · 134X 400/400 · 135X 400/400).
 *
 * ## ⑹ 🔴 이 회차에 **재서 나온 결함** — 회귀 잠금
 *
 * 모듈은 앞 세션이 저술만 하고 시험을 한 줄도 못 쓴 채 끊긴 것이었다. 재 보니 셋이 나왔다.
 *
 * 1. **`133X` 의 발문이 두 가지를 묻는데 정답 칸은 하나였다**(800판 **전량**).
 *    「$c$를 **모두 구하고**, 그때의 해를 모두 더한 값을 구하시오」 — 우리말로 답이
 *    둘이라는 뜻이다. 「**모든 $c$에 대하여**, …」로 고쳤다. 값 검산·냄새·조사·렌더
 *    어느 자도 이 부류를 구조적으로 못 본다(읽어서 나왔다).
 * 2. **모듈 머리말 ⑹ 2 의 단언 둘이 거짓이었다**(㉷). `facts.x` 가 「답의 첫 수」라
 *    적혀 있는데 `135X` 는 **절댓값**이라 계수가 음수인 406/800 판에서 어긋났고,
 *    「`facts` 로 정답 문자열을 다시 지을 수 있다」는 항 정보가 없어 **아예 불가능**했다.
 *    항마다 `c{i}`·`x{i}`·`y{i}` 를 남기게 고치고, 이 파일이 **그 값들만으로** 답을
 *    다시 지어 맞댄다.
 * 3. **D-20 손실 원장이 재현되지 않았다**(㉶ — 4차 중1 `62W` 와 같은 자리).
 *    여덟 자리가 실제와 달랐다(`134X` 전량 5,245 → 5,807 · `133X` 가드 껐을 때
 *    741 → 378 등). 아래 「D-20 원장을 **전수로 다시 센다**」가 머리말의 표를
 *    **한 칸씩** 다시 세어 맞대므로, 표를 손으로 고치면 빨개진다.
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
  correctedExpression,
  divByMono,
  M2_TOP_5H,
  monoTex,
  mulByMono,
  oneOpValues,
  polyTex,
  ratioFactorTex,
  REPEAT_C_MAX,
  repeatingEquationSolutions,
  triangleWholeArea,
  type Mono,
} from "@/lib/middle/m2Top5h";
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
 * 적게 된다 — 4차가 그렇게 물렸다.
 *
 * 실측(800판): `133X` 6.50·6.00·6.63·5.88% · `134X` 3.50·3.62·4.00·3.38% ·
 * `135X` 0.25% 넷.
 */
const SEED_BLOCKS = [20260905, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260905, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];
/** 정답 쏠림 문턱 — 브리프가 못 박은 값. */
const SKEW_LIMIT = 12;

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5H.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E133 = entryOf("133X");
const E134 = entryOf("134X");
const E135 = entryOf("135X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "133X": "심화상",
  "134X": "심화중",
  "135X": "심화중",
};

/** 리드가 준 변형 폭 아래 끝. 실측(씨앗 40회): 32 · 40 · 40. */
const VARIANT_FLOOR: Record<string, number> = {
  "133X": 7,
  "134X": 12,
  "135X": 12,
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

function ratDiv(a: Rat, b: Rat): Rat {
  if (b[0] === 0) throw new Error("ratDiv: 0 으로 나눈다");
  return rat(a[0] * b[1], a[1] * b[0]);
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

// ── ㄹ. 기약 ──────────────────────────────────────────────

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

// ── 🔴 단항식 뒤 조사 — 공용 자가 **구조적으로 못 보는 축**(⑷ 1) ──

/**
 * `josaMismatches`·`euroRo` 계열은 「$…수$」 뒤만 본다. 그런데 `135X` 는 조사가
 * **단항식** 뒤에 붙는다(「$-2y$로 나누어야」). 그 자리를 아무도 안 보면
 * 모듈 ⑺ 4 의 좁힘(끝 글자를 늘 맨 문자로)이 **아무것도 안 지키는 말**이 된다.
 *
 * 규칙은 제품에서 가져오지 않는다 — 여기 다시 적는다.
 *   · 맨 문자 $x$·$y$ 로 끝나면 읽기가 「엑스」·「와이」라 받침이 없다 → 「로」·「를」
 *   · **지수로 끝나면** 「…제곱」이라 받침이 생겨 「으로」가 옳아진다 → 그런 자리를
 *     아예 두지 않기로 했으므로, 있으면 그것이 곧 결함이다
 */
function monoJosaFaults(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$(으로|로|을|를)/g)) {
    const body = m[1]!;
    if (/\d$/.test(body)) continue; // 수로 끝난다 — 공용 자의 몫
    if (/\^\{?\d+\}?$/.test(body)) {
      out.push(`지수로 끝나는 식 뒤에 조사를 붙였다: $${body}$${m[2]}`);
      continue;
    }
    if (!/[a-zA-Z]$/.test(body)) continue;
    const tail = body.slice(-1);
    if (tail !== "x" && tail !== "y") continue; // 다른 문자는 읽기를 못 정한다
    const want = m[2] === "으로" || m[2] === "로" ? "로" : "를";
    if (m[2] !== want) out.push(`$${body}$${m[2]} → ${want}`);
  }
  return out;
}

/** 이 자가 **몇 개를 봤는가**. */
function monoJosaSeen(text: string): number {
  let n = 0;
  for (const m of text.matchAll(/\$([^$]*)\$(으로|로|을|를)/g)) {
    const body = m[1]!;
    if (/\d$/.test(body)) continue;
    if (/[a-zA-Z]$/.test(body) || /\^\{?\d+\}?$/.test(body)) n += 1;
  }
  return n;
}

// ── 다항식 — **지면에서 읽고 지면으로 다시 쓴다** ──────────

/** 한 항을 지면 글자에서 읽는다. */
function parseTerm(src: string): Mono {
  const m = /^([+-]?)(\d*)(x(?:\^\{(\d+)\})?)?(y(?:\^\{(\d+)\})?)?$/.exec(src);
  if (m === null) throw new Error(`항을 못 읽는다: ${src}`);
  if (m[2] === "" && m[3] === undefined && m[5] === undefined)
    throw new Error(`빈 항이다: ${src}`);
  const sign = m[1] === "-" ? -1 : 1;
  const abs = m[2] === "" ? 1 : Number(m[2]);
  const x = m[3] === undefined ? 0 : m[4] === undefined ? 1 : Number(m[4]);
  const y = m[5] === undefined ? 0 : m[6] === undefined ? 1 : Number(m[6]);
  return { c: sign * abs, x, y };
}

function parsePoly(src: string): Mono[] {
  const parts = src.match(/[+-]?[^+-]+/g);
  if (parts === null) throw new Error(`다항식을 못 읽는다: ${src}`);
  return parts.map(parseTerm);
}

function mulTerms(terms: readonly Mono[], mono: Mono): Mono[] {
  return terms.map((t) => ({
    c: t.c * mono.c,
    x: t.x + mono.x,
    y: t.y + mono.y,
  }));
}

/** 나누어떨어지지 않으면 **던진다** — 그 지면은 다항식이 안 된다. */
function divTerms(terms: readonly Mono[], mono: Mono): Mono[] {
  return terms.map((t) => {
    if (t.c % mono.c !== 0 || t.x < mono.x || t.y < mono.y)
      throw new Error("다항식 ÷ 단항식이 다항식이 아니다");
    return { c: t.c / mono.c, x: t.x - mono.x, y: t.y - mono.y };
  });
}

/** 항의 차례 — **지면 규약**이라 옮겨 적는다(⑴ 의 ⚠️ 참조). */
function orderTerms(terms: readonly Mono[]): Mono[] {
  return [...terms].sort(
    (p, q) => q.x + q.y - (p.x + p.y) || q.x - p.x || q.y - p.y,
  );
}

/** 지면 표기 — `monoTex` 를 안 부르고 여기서 다시 짓는다. */
function termOut(t: Mono, lead: boolean): string {
  const sign = t.c < 0 ? "-" : lead ? "" : "+";
  const abs = Math.abs(t.c);
  const xs = t.x === 0 ? "" : t.x === 1 ? "x" : `x^{${t.x}}`;
  const ys = t.y === 0 ? "" : t.y === 1 ? "y" : `y^{${t.y}}`;
  const letters = `${xs}${ys}`;
  const head = abs === 1 && letters !== "" ? "" : String(abs);
  return `${sign}${head}${letters}`;
}

function polyOut(terms: readonly Mono[]): string {
  if (terms.length === 0) return "0";
  return terms.map((t, i) => termOut(t, i === 0)).join("");
}

/**
 * 다항식에 수를 넣는다 — **식 조작을 한 줄도 안 쓰는** 두 번째 길.
 *
 * ⚠️ `-0` 을 안 낸다. `toBe` 는 `Object.is` 라 `-0` 과 `0` 을 **다르다고** 하는데,
 *    그 차이는 지면에 아무 뜻이 없다(값이 0 인 자리에서 거짓 빨강이 난다).
 */
function evalPoly(terms: readonly Mono[], x: number, y: number): number {
  return terms.reduce((s, t) => s + t.c * x ** t.x * y ** t.y, 0) + 0;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const RE133 =
  /^\$c\$는 \$(\d+)\$ 이하의 자연수이다\. \$x\$에 대한 방정식 \$0\.(\d)\\overline\{(\d)\}x([+-])0\.\\overline\{(\d)\}=c\$의 해가 자연수가 되도록 하는 모든 \$c\$에 대하여, 그때의 해를 모두 더한 값을 구하시오\.$/;

const RE134 =
  /^삼각형 \$ABC\$에서 \$\\overline\{BC\}\$ 위의 점 \$D\$에 대하여 \$\\overline\{BD\}:\\overline\{DC\}=(\d+):(\d+)\$이고, \$\\overline\{AD\}\$ 위의 점 \$E\$에 대하여 \$\\overline\{AE\}:\\overline\{ED\}=(\d+):(\d+)\$이다\. 삼각형 \$EBD\$의 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^2\$일 때, 삼각형 \$ABC\$의 넓이를 구하시오\.$/;

const RE135_DIV =
  /^어떤 식을 \$([^$]+)\$로 나누어야 할 것을 잘못하여 곱하였더니 다음과 같은 식이 되었다\. 바르게 계산한 식을 구하시오\.\n\$([^$]+)\$$/;
const RE135_MUL =
  /^어떤 식에 \$([^$]+)\$를 곱해야 할 것을 잘못하여 나누었더니 다음과 같은 식이 되었다\. 바르게 계산한 식을 구하시오\.\n\$([^$]+)\$$/;

/** `133X` 의 지면에서 읽어 낸 것 + 독립 검산이 낳은 후보. */
type Solved133 = {
  cmax: number;
  a: number;
  b: number;
  r: number;
  sign: 1 | -1;
  den: number;
  konst: number;
  found: { c: number; x: number }[];
  sum: number;
};

/**
 * 🔴 **$c$ 를 안 훑는다.** 순환소수를 등비급수로 세우고 $x$ 를 넣어 좌변이 정수가
 * 되는 자리를 찾는다 — 제품이 쓰는 「분자가 $D$ 의 배수」를 한 번도 안 쓴다.
 */
function solve133(content: string): Solved133 {
  const [cmaxT, aT, bT, signT, rT] = grab(RE133, content, "133X");
  const cmax = num(cmaxT);
  const a = num(aT);
  const b = num(bT);
  const sign: 1 | -1 = signT === "+" ? 1 : -1;
  const r = num(rT);
  if (a === b)
    throw new Error("133X: $0.a\\overline{a}$ 는 혼합순환소수가 아니다");
  if (r === 9)
    throw new Error("133X: $0.\\overline{9}=1$ 이라 순환소수가 아니다");
  if (cmax < 2) throw new Error("133X: $c$ 의 창이 너무 좁다");
  // $0.a\overline{b}=\dfrac a{10}+\dfrac b{10}\left(\dfrac1{10}+\dfrac1{100}+\cdots\right)$
  const coef = ratAdd(rat(a, 10), rat(b, 90));
  // $0.\overline{r}=\dfrac r{10}\cdot\dfrac1{1-1/10}$
  const cst = rat(r, 9);
  const found: { c: number; x: number }[] = [];
  for (let x = 1; x <= 4000; x += 1) {
    const lhs = ratAdd(ratMul(coef, rat(x, 1)), ratMul(rat(sign, 1), cst));
    if (lhs[0] / lhs[1] > cmax) break;
    if (lhs[1] !== 1) continue;
    if (lhs[0] >= 1) found.push({ c: lhs[0], x });
  }
  if (found.length < 2)
    throw new Error(
      `133X: 살아남는 $c$ 가 ${found.length}개뿐이라 「모든 $c$」가 무색하다`,
    );
  if (found.length > 4)
    throw new Error(
      `133X: 살아남는 $c$ 가 ${found.length}개라 대입 줄이 지면을 먹는다`,
    );
  const xs = found.map((f) => f.x);
  if (Math.min(...xs) < 2) throw new Error("133X: 해가 $2$ 보다 작다");
  if (Math.max(...xs) > 120) throw new Error("133X: 해가 $120$ 을 넘는다");
  const sum = xs.reduce((p, q) => p + q, 0);
  if (oneOpValues([a, b, r, cmax]).has(sum))
    throw new Error("133X: 찍힌 수를 한 번 연산하면 답이 나온다");
  return { cmax, a, b, r, sign, den: 9 * a + b, konst: 10 * r, found, sum };
}

type Solved134 = {
  m: number;
  n: number;
  s: number;
  t: number;
  k: number;
  abd: number;
  whole: number;
};

/** 🔴 **넓이의 비 정리를 안 쓴다.** 좌표에 놓고 행렬식으로 잰다. */
function solve134(content: string): Solved134 {
  const g = grab(RE134, content, "134X").map(num);
  const [m, n, s, t, k] = g as [number, number, number, number, number];
  if (gcd2(m, n) !== 1) throw new Error("134X: $m:n$ 이 기약이 아니다");
  if (gcd2(s, t) !== 1) throw new Error("134X: $s:t$ 가 기약이 아니다");
  if (m === 1 && n === 1)
    throw new Error("134X: 점 $D$ 가 중점이라 색인 `19` 와 겹친다");
  if (k < 4 || k > 150) throw new Error("134X: 주어진 넓이가 창 밖이다");
  type P = [Rat, Rat];
  const B: P = [rat(0, 1), rat(0, 1)];
  const C: P = [rat(m + n, 1), rat(0, 1)];
  const A: P = [rat(3, 1), rat(7, 1)]; // 한 직선 위만 아니면 어디든 된다
  const D: P = [rat(m, 1), rat(0, 1)];
  const lerp = (P0: P, P1: P, f: Rat): P => [
    ratAdd(P0[0], ratMul(f, ratSub(P1[0], P0[0]))),
    ratAdd(P0[1], ratMul(f, ratSub(P1[1], P0[1]))),
  ];
  const E = lerp(A, D, rat(s, s + t));
  const det = (P0: P, P1: P, P2: P): Rat =>
    ratSub(
      ratMul(ratSub(P1[0], P0[0]), ratSub(P2[1], P0[1])),
      ratMul(ratSub(P2[0], P0[0]), ratSub(P1[1], P0[1])),
    );
  const ebd = det(E, B, D);
  const abdDet = det(A, B, D);
  const abcDet = det(A, B, C);
  if (ebd[0] === 0) throw new Error("134X: 삼각형 $EBD$ 가 찌그러졌다");
  const scale = ratDiv(rat(k, 1), ebd); // 넓이 한 단위가 몇 cm² 인가
  const abdR = ratMul(abdDet, scale);
  const wholeR = ratMul(abcDet, scale);
  if (abdR[1] !== 1)
    throw new Error("134X: 삼각형 $ABD$ 의 넓이가 자연수가 아니다");
  if (wholeR[1] !== 1)
    throw new Error("134X: 삼각형 $ABC$ 의 넓이가 자연수가 아니다");
  const whole = wholeR[0];
  if (whole > 300) throw new Error("134X: 넓이가 $300$ 을 넘는다");
  if (oneOpValues([m, n, s, t, k]).has(whole))
    throw new Error("134X: 찍힌 수를 한 번 연산하면 답이 나온다");
  return { m, n, s, t, k, abd: abdR[0], whole };
}

type Solved135 = {
  mode: 0 | 1;
  mono: Mono;
  wrong: Mono[];
  middle: Mono[];
  right: Mono[];
};

function solve135(content: string): Solved135 {
  const div = RE135_DIV.exec(content);
  const mul = RE135_MUL.exec(content);
  if (div === null && mul === null)
    throw new Error(`135X: 지면 모양이 다르다 — ${content}`);
  if (div !== null && mul !== null)
    throw new Error("135X: 두 모드가 한꺼번에 잡혔다");
  const mode: 0 | 1 = div !== null ? 0 : 1;
  const hit = (div ?? mul)!;
  const mono = parseTerm(hit[1]!);
  if (mono.x > 1 || mono.y > 1)
    throw new Error("135X: 단항식이 지수로 끝나 조사 읽기가 갈린다 (⑺ 4)");
  if (mono.x === 0 && mono.y === 0)
    throw new Error("135X: 단항식에 문자가 없다");
  if (Math.abs(mono.c) < 2)
    throw new Error("135X: 단항식의 계수가 $\\pm1$ 이다");
  const wrong = orderTerms(parsePoly(hit[2]!));
  // 되돌린 뒤 **한 번 더** 같은 연산 — 그것이 이 유형의 마디다.
  const middle = orderTerms(
    mode === 0 ? divTerms(wrong, mono) : mulTerms(wrong, mono),
  );
  const right = orderTerms(
    mode === 0 ? divTerms(middle, mono) : mulTerms(middle, mono),
  );
  if (right.some((t) => Math.abs(t.c) < 2))
    throw new Error("135X: 답에 계수 $\\pm1$ 인 항이 있다 (⑺ 5)");
  const wrongTex = polyOut(wrong);
  const rightTex = polyOut(right);
  if (rightTex === wrongTex)
    throw new Error("135X: 바르게 계산한 식이 잘못 계산한 식과 같다");
  if (rightTex === polyOut(middle))
    throw new Error("135X: 바르게 계산한 식이 어떤 식 $A$ 와 같다");
  if (wrongTex.length > 46 || rightTex.length > 46)
    throw new Error("135X: 지면 식이 한 줄을 넘는다");
  return { mode, mono, wrong, middle, right };
}

const VERIFY: Record<string, (content: string) => string> = {
  "133X": (content) => String(solve133(content).sum),
  "134X": (content) => `${solve134(content).whole}\\,\\mathrm{cm}^2`,
  "135X": (content) => polyOut(solve135(content).right),
};

// ── ⑵ 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────

/** 양성 — 답을 아는 지면에서 그 답이 나온다. */
const CALIBRATION: readonly [string, string, string][] = [
  [
    "133X",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.4\\overline{6}x+0.\\overline{6}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
    "60",
  ],
  [
    "133X",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.2\\overline{7}x-0.\\overline{8}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
    "164",
  ],
  [
    "134X",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=5:3$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=1:3$이다. 삼각형 $EBD$의 넓이가 $45\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
    "96\\,\\mathrm{cm}^2",
  ],
  [
    "134X",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=3:2$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=4:3$이다. 삼각형 $EBD$의 넓이가 $36\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
    "140\\,\\mathrm{cm}^2",
  ],
  [
    "135X",
    "어떤 식에 $-2y$를 곱해야 할 것을 잘못하여 나누었더니 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n$-5x^{2}y-8x$",
    "-20x^{2}y^{3}-32xy^{2}",
  ],
  [
    "135X",
    "어떤 식을 $-2x$로 나누어야 할 것을 잘못하여 곱하였더니 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n$28x^{3}-16x^{2}$",
    "7x-4",
  ],
];

/**
 * 음성 — 불변식을 어긴 지면은 **던진다.**
 *
 * 🔴 눈금은 **자기 축을 홀로 갈라야** 한다. 여기 지면은 **재려는 축 하나만** 어기게
 * 지었다 — 여럿에 걸리면 무엇이 잡았는지 알 수 없다.
 */
const REJECTS: readonly [string, string, string][] = [
  [
    "133X",
    "살아남는 $c$ 가 하나뿐이라 「모든 $c$」가 무색하다",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.1\\overline{2}x+0.\\overline{2}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
  ],
  [
    "133X",
    "살아남는 $c$ 가 다섯이라 대입 줄이 지면을 먹는다",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.2\\overline{6}x-0.\\overline{3}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
  ],
  [
    "133X",
    "해가 $120$ 을 넘는다",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.1\\overline{2}x+0.\\overline{1}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
  ],
  [
    "133X",
    "찍힌 수 $5$ 를 제곱하면 답이 나온다 (지름길)",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.5\\overline{3}x+0.\\overline{3}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
  ],
  [
    "133X",
    "$0.5\\overline{5}$ 는 혼합순환소수가 아니다",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.5\\overline{5}x+0.\\overline{2}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
  ],
  [
    "133X",
    "$0.\\overline{9}=1$ 이라 순환소수가 아니다",
    "$c$는 $18$ 이하의 자연수이다. $x$에 대한 방정식 $0.4\\overline{6}x+0.\\overline{9}=c$의 해가 자연수가 되도록 하는 모든 $c$에 대하여, 그때의 해를 모두 더한 값을 구하시오.",
  ],
  [
    "134X",
    "삼각형 $ABD$ 의 넓이가 자연수가 아니다",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=5:3$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=1:3$이다. 삼각형 $EBD$의 넓이가 $46\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
  ],
  [
    "134X",
    "점 $D$ 가 $\\overline{BC}$ 의 중점이라 색인 `19` 와 겹친다",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=1:1$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=1:1$이다. 삼각형 $EBD$의 넓이가 $4\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
  ],
  [
    "134X",
    "$\\overline{BD}:\\overline{DC}$ 가 기약이 아니다",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=2:4$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=1:3$이다. 삼각형 $EBD$의 넓이가 $45\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
  ],
  [
    "134X",
    "넓이가 $300$ 을 넘는다",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=1:2$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=1:1$이다. 삼각형 $EBD$의 넓이가 $51\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
  ],
  [
    "134X",
    "찍힌 두 수를 곱하면 넓이가 나온다 (지름길)",
    "삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 $\\overline{BD}:\\overline{DC}=1:2$이고, $\\overline{AD}$ 위의 점 $E$에 대하여 $\\overline{AE}:\\overline{ED}=1:1$이다. 삼각형 $EBD$의 넓이가 $6\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.",
  ],
  [
    "135X",
    "나눗셈이 다항식을 내지 않는다",
    "어떤 식을 $-2x$로 나누어야 할 것을 잘못하여 곱하였더니 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n$28x^{3}-15x^{2}$",
  ],
  [
    "135X",
    "단항식이 지수로 끝나 조사 읽기가 갈린다 (⑺ 4)",
    "어떤 식을 $-2y^{2}$로 나누어야 할 것을 잘못하여 곱하였더니 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n$28x^{3}y^{4}-16x^{2}y^{4}$",
  ],
  [
    "135X",
    "답에 계수 $\\pm1$ 인 항이 있다 (⑺ 5)",
    "어떤 식을 $-2x$로 나누어야 할 것을 잘못하여 곱하였더니 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n$4x^{3}-8x^{2}$",
  ],
  [
    "135X",
    "단항식에 문자가 없다",
    "어떤 식을 $-2$로 나누어야 할 것을 잘못하여 곱하였더니 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n$28x^{3}-16x^{2}$",
  ],
];

describe("중2 확대 갈래 5차 h — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, _why, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });

  it("🔴 눈금이 세 유형을 **모두** 덮는다 — 안 덮인 유형의 «0» 은 못 셈이다", () => {
    for (const t of ["133X", "134X", "135X"]) {
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

  it("🔴 `135X` 의 눈금이 두 모드를 **둘 다** 덮는다", () => {
    const modes = CALIBRATION.filter(([k]) => k === "135X").map(
      ([, c]) => solve135(c).mode,
    );
    expect(new Set(modes)).toEqual(new Set([0, 1]));
  });
});

describe("중2 확대 갈래 5차 h — 명부와 규약", () => {
  it("🔴 유형은 정확히 셋이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5H.length).toBe(3);
    expect(M2_TOP_5H.map((e) => e.rpmType)).toEqual(["133X", "134X", "135X"]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5H) {
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
    for (const e of M2_TOP_5H) {
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

  it("세 유형이 어느 소단원에 붙는지 못 박는다 (브리프가 준 이름 그대로)", () => {
    expect(
      M2_TOP_5H.map((e) => [e.rpmBook, e.rpmType, e.rpmMinor, e.unitSection]),
    ).toEqual([
      ["2-1", "133X", "유리수와 순환소수", "순환소수를 포함한 식의 계산"],
      ["2-2", "134X", "여러 가지 사각형", "평행선과 삼각형의 넓이"],
      ["2-1", "135X", "다항식의 계산", "다항식의 곱셈과 나눗셈"],
    ]);
  });

  it("🔴 세 소단원에는 확대 갈래가 **우리 셋뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_5H) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !M2_TOP_5H.includes(t),
      );
      // 분모가 0 이면 이 검사는 아무것도 안 본다 — 그 자리를 먼저 못 박는다.
      expect(others.length, `${e.unitSection} 의 이웃 유형`).toBeGreaterThan(5);
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
    const foreign = registeredTypes().filter((e) => !M2_TOP_5H.includes(e));
    for (const e of M2_TOP_5H) {
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
    for (const e of M2_TOP_5H) {
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

describe("중2 확대 갈래 5차 h — 지면과 값", () => {
  for (const e of M2_TOP_5H) {
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

      it("🔴 `facts` 로 정답 문자열을 다시 지을 수 있다", () => {
        for (const p of sample()) {
          const f = p.facts;
          let rebuilt: string;
          if (e.rpmType === "133X") rebuilt = `$${f.x}$`;
          else if (e.rpmType === "134X") rebuilt = `$${f.x}\\,\\mathrm{cm}^2$`;
          else {
            // 🔴 항 정보만으로 짓는다 — `polyTex` 도 안 부른다.
            const terms: Mono[] = [];
            for (let i = 0; i < f.terms!; i += 1)
              terms.push({ c: f[`c${i}`]!, x: f[`x${i}`]!, y: f[`y${i}`]! });
            expect(terms.length, "항이 하나도 없다").toBeGreaterThan(0);
            rebuilt = `$${polyOut(terms)}$`;
          }
          expect(rebuilt, p.content).toBe(p.answer);
        }
      });

      it("🔴 `facts.x` 가 답의 **첫 수**다 (부호까지)", () => {
        for (const p of sample()) {
          const m = p.answer.match(/-?\d+/);
          expect(m, `답에 수가 없다: ${p.answer}`).not.toBeNull();
          expect(Number(m![0]), `${p.answer} vs ${p.facts.x}`).toBe(p.facts.x);
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시·상한 선언", () => {
        for (const p of sample()) {
          const both = `${p.content}\n${p.solution}\n${p.answer}`;
          expect(brokenRender(both), p.content).toBe(false);
          expect(pageSmells(both), p.content).toEqual([]);
          expect(josaMismatches(both), p.content).toEqual([]);
          expect(monoJosaFaults(both), p.content).toEqual([]);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(pointsAtFigure(p.content), p.content).toBeNull();
          // ㉱ 답에 걸린 상한을 **선언하지 않는다**(⑷ 2 참조 — `133X` 의 「$18$ 이하」는
          //    $c$ 에 걸린 것이라 이 자가 못 보고, 그 축은 ㅂ 에서 따로 잰다).
          expect(declaredUpperBound(p.content), p.content).toBeNull();
          expect(p.figureSpec, p.content).toBeNull();
          expect(both.includes("**"), "마크다운 굵게가 지면에 나간다").toBe(
            false,
          );
          expect(both.includes("그 중"), "「그중」은 붙여 쓴다").toBe(false);
          for (const line of p.solution.split("\n"))
            expect(repeatedStatement(line), line).toBeNull();
        }
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.content).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // 🔴 0 은 «깨끗»과 «못 셈»을 안 가른다 — 그러니 유형마다 **몇 개를 볼 수
        //    있는지**를 못 박는다. 이 자는 정수·`+`·`-`·`\times` 만으로 된 사슬만 본다.
        //    · `133X` 판마다 합 줄(`$5+20+35=60$`)이 하나씩 있다 → 표본 수 이상
        //    · `134X` 는 비례상수가 **분수인 판**의 곱셈 줄을 못 본다(`\dfrac` 이 낀다).
        //      정수인 판만 걸려 실측 117/240 이다. 못 보는 자리는 아래
        //      「두 비·두 곱셈 줄을 넷 다 맞댄다」가 **유리수로 다시 재서** 본다.
        //    · `135X` 는 **0** 이다 — 산술 사슬이 지면에 아예 없다(다항식뿐).
        //      그 «0» 은 «깨끗»이 아니라 **«잴 것이 없다»** 이고, 그 유형의 값은
        //      「수를 넣어 다시 잰다」가 본다.
        if (e.rpmType === "133X")
          expect(claims, "133X 산술 주장 수").toBeGreaterThanOrEqual(SAMPLE);
        else if (e.rpmType === "134X") {
          expect(claims, "134X 산술 주장 수").toBeGreaterThan(SAMPLE / 4);
          expect(claims, "134X 는 분수 곱셈 줄을 못 본다").toBeLessThan(SAMPLE);
        } else expect(claims, "135X 는 산술 사슬을 안 쓴다").toBe(0);
      });

      it("🔴 지면의 모든 분수가 기약이고 분모가 $1$ 이 아니다", () => {
        let seen = 0;
        for (const p of sample()) {
          const both = `${p.content}\n${p.solution}\n${p.answer}`;
          expect(unreducedFractions(both), p.content).toEqual([]);
          seen += fractionCount(both);
        }
        // 🔴 「몇 개를 봤나」를 유형마다 못 박는다 — `135X` 의 0 은 «못 셈»이 아니라
        //    **«잴 것이 없다»** 다(분수를 한 번도 안 쓴다).
        if (e.rpmType === "135X") {
          expect(seen, "135X 는 분수를 안 쓴다").toBe(0);
        } else {
          expect(seen, `${e.rpmType} 가 본 분수`).toBeGreaterThan(0);
        }
      });

      it("🔴 단항식 뒤 조사 자를 «몇 개 봤는가» — `135X` 만 잴 것이 있다", () => {
        let seen = 0;
        for (const p of sample())
          seen += monoJosaSeen(`${p.content}\n${p.solution}`);
        if (e.rpmType === "135X") {
          expect(seen, "135X 단항식 뒤 조사").toBeGreaterThanOrEqual(
            SAMPLE * 2,
          );
        } else {
          expect(seen, `${e.rpmType} 는 단항식 뒤에 조사를 안 쓴다`).toBe(0);
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
        // 🔴 0 에 가까우면 그것도 이상하다 — 걸음을 지운 것일 수 있다(D-116 ⑹).
        expect(max, `${e.rpmType} 해설이 너무 짧다`).toBeGreaterThan(100);
      });

      it(`🔴 변형 폭과 정답 쏠림 (씨앗 블록 ${SEED_BLOCKS.length} × ${WIDE}판)`, () => {
        // 변형 폭 — 제품의 `variant` 걸음(`+v*0x9e37`)을 그대로 흉내 낸다.
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

// ── ㄷ. 해설의 «말» — 낱말을 읽고, 값도 다시 센다 ────────────

/**
 * 🔴 **해설이 「왜 그런가」를 진술하는 줄**을 낱말과 값 **둘 다** 로 본다(㉳).
 *
 * `content` 를 같이 받는 까닭은 `135X` 때문이다 — 「두 번 **나눈**·**곱한**」이
 * 발문의 모드에 따라 갈리므로, 해설만 보면 뒤집혀도 못 잡는다.
 */
function wordingFaults(
  rpmType: string,
  content: string,
  solution: string,
): string[] {
  const out: string[] = [];
  const need = (needle: string, why: string): void => {
    if (!solution.includes(needle)) out.push(`${why}: 「${needle}」가 없다`);
  };
  if (rpmType === "133X") {
    need("$x$가 자연수이려면", "㉯ 정수 조건을 그 자리에서 말한다");
    need("차례로 넣어 보면", "후보를 다 세워 견주었다는 말");
    need("나머지 $c$에서는", "D-116 ⑹ 버리는 근거");
    need("해가 자연수가 아니다", "왜 버리는지");
    need("따라서 구하는 합은", "마무리");
    // 발문이 「자연수」라고 했으면 해설도 「자연수」여야 한다 (㉴).
    if (
      content.includes("해가 자연수가") &&
      solution.includes("$x$가 정수이려면")
    )
      out.push("발문은 자연수인데 해설이 정수라고 적었다");
    // 🔴 낱말만 세지 않는다 — 「배수」 주장을 나열된 $c$ 로 실제로 확인한다.
    const claim = /\$90c([+-])(\d+)\$이 \$(\d+)\$의 (배수|약수)여야 한다/.exec(
      solution,
    );
    if (claim === null) out.push("나누어떨어짐 주장이 든 줄이 없다");
    else {
      const s = claim[1] === "+" ? 1 : -1;
      const k = num(claim[2]);
      const den = num(claim[3]);
      const listed = [
        ...(/그런 \$c\$는 (.+?)뿐이고/.exec(solution)?.[1] ?? "").matchAll(
          /\$(\d+)\$/g,
        ),
      ].map((m) => num(m[1]));
      if (listed.length === 0) out.push("나열된 $c$ 가 없다");
      for (const c of listed) {
        const top = 90 * c + s * k;
        // 「배수」면 큰 쪽이 작은 쪽으로 나누어떨어져야 하고, **거꾸로는 아니어야** 한다.
        if (claim[4] === "배수") {
          if (top % den !== 0)
            out.push(`$c=${c}$ 에서 ${top} 이 ${den} 의 배수가 아니다`);
          if (den % top === 0)
            out.push(`$c=${c}$ 에서 배수와 약수가 뒤바뀌어도 참이다`);
        } else {
          if (den % top !== 0)
            out.push(`$c=${c}$ 에서 ${den} 이 ${top} 의 약수 주장이 거짓이다`);
        }
      }
    }
  }
  if (rpmType === "134X") {
    need(
      "높이가 같은 두 삼각형의 넓이의 비는 밑변의 길이의 비와 같으므로",
      "굳힘 개념",
    );
    need(
      "점 $B$에서 직선 $AD$에 내린 수선을 공통으로 하여 높이가 같다",
      "첫 비의 근거",
    );
    need(
      "점 $A$에서 직선 $BC$에 내린 수선을 공통으로 하여 높이가 같고",
      "둘째 비의 근거",
    );
    need("밑변을 각각", "무엇을 밑변으로 보는지");
  }
  if (rpmType === "135X") {
    need("어떤 식을 $A$라 하면", "미지의 식을 세운다");
    need("바르게 계산한 식은", "무엇을 묻는지");
    need("곱셈과 나눗셈을 서로 바꾸어 계산했으므로", "굳힘 개념");
    // 🔴 방향이 발문과 맞는가 — 뒤집히면 값은 그대로여도 말이 거짓이 된다.
    const mode = content.includes("나누어야 할 것을 잘못하여 곱하였더니")
      ? 0
      : 1;
    const want = mode === 0 ? "두 번 나눈 것과 같다" : "두 번 곱한 것과 같다";
    const other = mode === 0 ? "두 번 곱한 것과 같다" : "두 번 나눈 것과 같다";
    if (!solution.includes(want))
      out.push(`되돌림 방향이 발문과 어긋난다: 「${want}」가 없다`);
    if (solution.includes(other))
      out.push(`되돌림 방향이 거꾸로 적혔다: 「${other}」`);
  }
  return out;
}

describe("중2 확대 갈래 5차 h — 🔴 해설의 중간값·말을 다른 길로 다시 잰다", () => {
  it("`133X` — 분수 줄·분자 줄·나열·대입 줄·합 줄을 **다섯 다** 맞댄다", () => {
    for (const p of rows(E133)) {
      const v = solve133(p.content);
      const lines = p.solution.split("\n");
      expect(lines.length, p.content).toBe(3 + v.found.length + 1);

      // ⑴ 첫 줄 — 혼합순환소수를 분수로, 그리고 양변에 $90$ 을 곱한 결과.
      const first = lines[0]!;
      const head = grab(
        /^\$0\.(\d)\\overline\{(\d)\}=\\dfrac\{(\d+)-(\d+)\}\{90\}\$이고 \$0\.\\overline\{(\d)\}=\\dfrac\{(\d+)\}\{(\d+)\}\$이므로, 방정식의 양변에 \$90\$을 곱하면 \$(\d+)x([+-])(\d+)=90c\$이다\.$/,
        first,
        "133X 첫 줄",
      );
      expect(num(head[2]), "분자의 앞 두 자리").toBe(10 * v.a + v.b);
      expect(num(head[3]), "빼는 앞자리").toBe(v.a);
      // $0.\overline{r}$ 은 기약분수로 — 값이 맞는지 유리수로 다시 본다.
      expect(ratMul(rat(num(head[5]), num(head[6])), rat(9, 1))[0]).toBe(v.r);
      expect(num(head[7]), "양변에 90 을 곱한 계수").toBe(v.den);
      expect(head[8], "상수항 부호").toBe(v.sign === 1 ? "+" : "-");
      expect(num(head[9]), "상수항").toBe(v.konst);

      // ⑵ 둘째 줄 — $x$ 의 분자에서 부호가 뒤집힌다.
      const second = lines[1]!;
      const body = grab(
        /^그러므로 \$x=\\dfrac\{90c([+-])(\d+)\}\{(\d+)\}\$이고, /,
        second,
        "133X 둘째 줄",
      );
      expect(body[0], "분자 부호는 방정식과 반대다").toBe(
        v.sign === 1 ? "-" : "+",
      );
      expect(num(body[1])).toBe(v.konst);
      expect(num(body[2])).toBe(v.den);

      // ⑶ 셋째 줄 — 나열한 $c$ 가 독립 검산과 같고 **전부 창 안**이다 (㉴).
      const listed = [
        ...grab(
          /그런 \$c\$는 (.+?)뿐이고/,
          lines[2]!,
          "133X 나열",
        )[0]!.matchAll(/\$(\d+)\$/g),
      ].map((m) => num(m[1]));
      expect(listed, p.content).toEqual(v.found.map((f) => f.c));
      for (const c of listed) {
        expect(c, `$c=${c}$ 가 창 밖이다`).toBeGreaterThanOrEqual(1);
        expect(c, `$c=${c}$ 가 창 밖이다`).toBeLessThanOrEqual(v.cmax);
      }
      expect(
        lines[2]!.includes(`$1$부터 $${v.cmax}$까지`),
        "창을 안 적었다",
      ).toBe(true);

      // ⑷ 대입 줄 — 하나씩 다시 계산한다.
      v.found.forEach((f, i) => {
        const g = grab(
          /^\$c=(\d+)\$일 때 \$x=\\dfrac\{90\\times(\d+)([+-])(\d+)\}\{(\d+)\}=(\d+)\$이다\.$/,
          lines[3 + i]!,
          "133X 대입 줄",
        );
        expect(num(g[0]), "나열한 $c$ 와 대입한 $c$ 가 다르다").toBe(f.c);
        expect(num(g[1]), "곱하는 $c$").toBe(f.c);
        const top = 90 * f.c + (g[2] === "+" ? 1 : -1) * num(g[3]);
        expect(num(g[4]), "분모").toBe(v.den);
        expect(top / v.den, "대입 줄의 값").toBe(num(g[5]));
        expect(num(g[5]), "독립 검산이 낸 해").toBe(f.x);
      });

      // ⑸ 마지막 줄 — 더한 항이 대입 줄의 해와 하나씩 같다.
      const tail = grab(
        /^따라서 구하는 합은 \$([\d+]+)=(\d+)\$이다\.$/,
        lines[lines.length - 1]!,
        "133X 합 줄",
      );
      expect(tail[0]!.split("+").map(Number)).toEqual(v.found.map((f) => f.x));
      expect(num(tail[1])).toBe(v.sum);
    }
  });

  it("`134X` — 두 비·두 곱셈 줄·마무리를 **넷 다** 맞댄다", () => {
    for (const p of rows(E134)) {
      const v = solve134(p.content);
      const lines = p.solution.split("\n");
      expect(lines.length, p.content).toBe(4);

      const g1 = grab(
        /\$\\overline\{ED\}:\\overline\{AD\}=(\d+):(\d+)\$에서 삼각형 \$ABD\$의 넓이는 \$(\d+)\\times(.+?)=(\d+)\\,\(\\mathrm\{cm\}\^2\)\$이다\.$/,
        lines[1]!,
        "134X 첫 비",
      );
      // $\overline{ED}:\overline{AD}$ 는 $t:(s+t)$ 다 — 발문의 $s:t$ 와 다른 값이다.
      expect([num(g1[0]), num(g1[1])], "첫 비").toEqual([v.t, v.s + v.t]);
      expect(num(g1[2]), "곱하는 넓이").toBe(v.k);
      expect(num(g1[4]), "삼각형 $ABD$ 의 넓이").toBe(v.abd);
      // 곱하는 인수를 유리수로 읽어 값을 다시 낸다.
      const f1 = /^\\dfrac\{(\d+)\}\{(\d+)\}$/.exec(g1[3]!);
      const factor1 = f1 ? rat(num(f1[1]), num(f1[2])) : rat(num(g1[3]!), 1);
      expect(factor1, "첫 비례상수").toEqual(rat(v.s + v.t, v.t));
      expect(ratMul(rat(v.k, 1), factor1), "곱셈 결과").toEqual(rat(v.abd, 1));

      const g2 = grab(
        /\$\\overline\{BD\}:\\overline\{BC\}=(\d+):(\d+)\$이다\.$/,
        lines[2]!,
        "134X 둘째 비",
      );
      expect([num(g2[0]), num(g2[1])], "둘째 비").toEqual([v.m, v.m + v.n]);

      const g3 = grab(
        /^따라서 삼각형 \$ABC\$의 넓이는 \$(\d+)\\times(.+?)=(\d+)\\,\(\\mathrm\{cm\}\^2\)\$이다\.$/,
        lines[3]!,
        "134X 마무리",
      );
      expect(num(g3[0]), "이어받은 넓이").toBe(v.abd);
      expect(num(g3[2]), "전체 넓이").toBe(v.whole);
      const f2 = /^\\dfrac\{(\d+)\}\{(\d+)\}$/.exec(g3[1]!);
      const factor2 = f2 ? rat(num(f2[1]), num(f2[2])) : rat(num(g3[1]!), 1);
      expect(factor2, "둘째 비례상수").toEqual(rat(v.m + v.n, v.m));
      expect(ratMul(rat(v.abd, 1), factor2)).toEqual(rat(v.whole, 1));
    }
  });

  it("`135X` — $A$ 줄과 마무리 줄을 **수를 넣어** 다시 잰다 (식 조작을 안 쓴다)", () => {
    for (const p of rows(E135)) {
      const v = solve135(p.content);
      const lines = p.solution.split("\n");
      expect(lines.length, p.content).toBe(3);

      const g1 = grab(
        /^어떤 식을 \$A\$라 하면 잘못 계산한 식이 \$A(\\times|\\div)\\left\((.+?)\\right\)\$이므로, \$A=\\left\((.+?)\\right\)(\\times|\\div)\\left\((.+?)\\right\)=(.+?)\$이다\.$/,
        lines[0]!,
        "135X 첫 줄",
      );
      // 잘못한 연산은 발문의 «잘못하여 …» 와 같아야 한다.
      expect(g1[0], "잘못한 연산").toBe(v.mode === 0 ? "\\times" : "\\div");
      // 되돌리는 연산은 그 반대여야 한다.
      expect(g1[3], "되돌리는 연산").toBe(v.mode === 0 ? "\\div" : "\\times");
      expect(g1[1], "단항식").toBe(polyOut([v.mono]));
      expect(g1[4], "단항식").toBe(polyOut([v.mono]));
      expect(g1[2], "잘못 계산한 식").toBe(polyOut(v.wrong));
      const middle = parsePoly(g1[5]!);
      // 🔴 값 검산 — 식 조작이 아니라 **대입**으로 본다.
      const zero = (n: number): number => n + 0; // `-0` 은 `0` 과 같다고 본다
      let nonZero = 0;
      for (const [x, y] of [
        [2, 3],
        [3, 5],
        [5, 2],
        [7, 11],
      ] as [number, number][]) {
        const M = evalPoly([v.mono], x, y);
        const W = evalPoly(v.wrong, x, y);
        const A = evalPoly(middle, x, y);
        if (W !== 0) nonZero += 1;
        expect(
          zero(v.mode === 0 ? A * M : A),
          `첫 줄의 $A$ 가 ($x$,$y$)=(${x},${y}) 에서 안 맞는다`,
        ).toBe(zero(v.mode === 0 ? W : W * M));
      }
      // 🔴 네 점이 다 $0$ 이면 이 검사는 아무것도 안 본 것이다.
      expect(nonZero, `대입 검산이 헛돌았다 — ${p.content}`).toBeGreaterThan(0);

      const g2 = grab(
        /^바르게 계산한 식은 \$A(\\times|\\div)\\left\((.+?)\\right\)\$이므로 \$\\left\((.+?)\\right\)(\\times|\\div)\\left\((.+?)\\right\)=(.+?)\$이다\.$/,
        lines[1]!,
        "135X 둘째 줄",
      );
      expect(g2[0], "바른 연산").toBe(v.mode === 0 ? "\\div" : "\\times");
      expect(g2[3], "같은 연산을 한 번 더").toBe(g2[0]);
      expect(g2[2], "이어받은 $A$").toBe(g1[5]);
      expect(g2[5], "답").toBe(polyOut(v.right));
      for (const [x, y] of [
        [2, 3],
        [3, 5],
        [5, 2],
      ] as [number, number][]) {
        const M = evalPoly([v.mono], x, y);
        const A = evalPoly(middle, x, y);
        const R = evalPoly(v.right, x, y);
        expect(
          zero(v.mode === 0 ? R * M : R),
          `마무리 줄이 ($x$,$y$)=(${x},${y}) 에서 안 맞는다`,
        ).toBe(zero(v.mode === 0 ? A : A * M));
      }
    }
  });

  it("🔴 해설의 «말»이 굳힘을 진술한다 (낱말과 값 둘 다)", () => {
    for (const e of M2_TOP_5H) {
      for (const p of rows(e, 120)) {
        expect(
          wordingFaults(e.rpmType, p.content, p.solution),
          `${e.rpmType}\n${p.content}\n${p.solution}`,
        ).toEqual([]);
      }
    }
  });
});

describe("중2 확대 갈래 5차 h — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  it("`133X` — 발문과 독립 검산이 낳은 값만 지면에 있다", () => {
    for (const p of rows(E133, 120)) {
      const v = solve133(p.content);
      const ok = new Set<number>([
        0, // 소수점 앞의 $0$ — `$0.4\overline{6}$` 에서 읽힌다
        1,
        90,
        v.cmax,
        v.a,
        v.b,
        v.r,
        10 * v.a + v.b,
        v.den,
        v.konst,
        v.sum,
        ...v.found.map((f) => f.c),
        ...v.found.map((f) => f.x),
        // $0.\overline{r}$ 의 기약분수
        v.r / (gcd2(v.r, 9) || 1),
        9 / (gcd2(v.r, 9) || 1),
      ]);
      // ⚠️ 이 자는 `\dfrac{46-4}{90}`·`90c-60` 의 뺄셈 기호를 **음수 부호로 읽는다.**
      //    그 부호는 지면의 연산자이지 값이 아니므로 절댓값으로 견준다.
      for (const n of mathIntegers(p.solution))
        expect(
          ok.has(Math.abs(n)),
          `해설의 $${n}$ 을 설명할 수 없다 — ${p.solution}`,
        ).toBe(true);
    }
  });

  it("`134X` — 발문과 독립 검산이 낳은 값만 지면에 있다", () => {
    for (const p of rows(E134, 120)) {
      const v = solve134(p.content);
      const ok = new Set<number>([
        2, // $\mathrm{cm}^2$ 의 지수
        v.m,
        v.n,
        v.s,
        v.t,
        v.k,
        v.abd,
        v.whole,
        v.m + v.n,
        v.s + v.t,
      ]);
      for (const n of mathIntegers(p.solution))
        expect(
          ok.has(n),
          `해설의 $${n}$ 을 설명할 수 없다 — ${p.solution}`,
        ).toBe(true);
    }
  });

  it("`135X` — 계수와 지수가 전부 세 식 가운데 하나에서 온다", () => {
    for (const p of rows(E135, 120)) {
      const v = solve135(p.content);
      const ok = new Set<number>();
      for (const t of [...v.wrong, ...v.middle, ...v.right, v.mono]) {
        ok.add(t.c);
        ok.add(Math.abs(t.c));
        ok.add(t.x);
        ok.add(t.y);
      }
      for (const n of mathIntegers(p.solution))
        expect(
          ok.has(n),
          `해설의 $${n}$ 을 설명할 수 없다 — ${p.solution}`,
        ).toBe(true);
    }
  });
});

describe("중2 확대 갈래 5차 h — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`133X` — 찍힌 수의 한두 번 연산이 답과 늘 다르다", () => {
    for (const p of rows(E133, 200)) {
      const v = solve133(p.content);
      expect(oneOpValues([v.a, v.b, v.r, v.cmax]).has(v.sum), p.content).toBe(
        false,
      );
    }
  });

  it("`134X` — 찍힌 다섯 수의 한두 번 연산이 넓이와 늘 다르다", () => {
    for (const p of rows(E134, 200)) {
      const v = solve134(p.content);
      expect(
        pageShortcutValues([v.m, v.n, v.s, v.t, v.k]).has(v.whole),
        p.content,
      ).toBe(false);
    }
  });

  it("`135X` — 답이 발문 식도 어떤 식 $A$ 도 아니다 (가장 흔한 두 오답)", () => {
    for (const p of rows(E135, 200)) {
      const v = solve135(p.content);
      expect(polyOut(v.right), p.content).not.toBe(polyOut(v.wrong));
      expect(polyOut(v.right), p.content).not.toBe(polyOut(v.middle));
    }
  });
});

describe("중2 확대 갈래 5차 h — ㉡ 굳힘을 흔들면 답이 바뀌는가", () => {
  it("`133X` — 앞자리를 안 빼면(`subtractLead=false`) 후보와 합이 달라진다", () => {
    let differ = 0;
    for (const p of rows(E133, 200)) {
      const f = p.facts;
      const sign: 1 | -1 = f.plus === 1 ? 1 : -1;
      const kept = repeatingEquationSolutions(
        f.a!,
        f.b!,
        f.r!,
        sign,
        REPEAT_C_MAX,
      )!;
      const shaken = repeatingEquationSolutions(
        f.a!,
        f.b!,
        f.r!,
        sign,
        REPEAT_C_MAX,
        false,
      )!;
      const sumOf = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
      expect(sumOf(kept.xs), p.content).toBe(f.x);
      if (sumOf(shaken.xs) !== sumOf(kept.xs)) differ += 1;
    }
    // 🔴 «흔들었는데 그대로»가 하나라도 있으면 그 판에서 이 마디는 안 재진다.
    expect(differ, "흔들어도 답이 같은 판이 있다").toBe(200);
  });

  it("`134X` — 두 번째 비의 분모를 $\\overline{AE}$ 로 읽으면 넓이가 달라진다", () => {
    let differ = 0;
    for (const p of rows(E134, 200)) {
      const f = p.facts;
      const kept = triangleWholeArea(f.m!, f.n!, f.s!, f.t!, f.k!);
      expect(kept, p.content).toBe(f.x);
      const shaken = triangleWholeArea(f.m!, f.n!, f.s!, f.t!, f.k!, false);
      if (shaken !== kept) differ += 1;
    }
    expect(differ, "흔들어도 넓이가 같은 판이 있다").toBe(200);
  });

  it("`135X` — 한 번만 되돌리면(`twice=false`) 그것은 답이 아니라 $A$ 다", () => {
    let differ = 0;
    for (const p of rows(E135, 200)) {
      const v = solve135(p.content);
      const once = correctedExpression(v.wrong, v.mono, v.mode, false)!;
      const twice = correctedExpression(v.wrong, v.mono, v.mode)!;
      expect(polyOut(orderTerms(twice)), p.content).toBe(polyOut(v.right));
      expect(polyOut(orderTerms(once)), p.content).toBe(polyOut(v.middle));
      if (polyOut(orderTerms(once)) !== polyOut(v.right)) differ += 1;
    }
    expect(differ, "한 번만 되돌려도 답이 같은 판이 있다").toBe(200);
  });
});

describe("중2 확대 갈래 5차 h — 굳힘 함수와 소품 (손 실측)", () => {
  it("`repeatingEquationSolutions` 는 창 안의 $c$ 를 **모두** 낸다", () => {
    // $0.4\overline{6}x+0.\overline{6}=c$ — 손으로 풀면 $c\equiv3\pmod 7$ 이다.
    const f = repeatingEquationSolutions(4, 6, 6, 1, 18)!;
    expect(f.cs).toEqual([3, 10, 17]);
    expect(f.xs).toEqual([5, 20, 35]);
    // 창을 넓히면 그 다음 것도 나온다 — 창이 실제로 도는 값이다.
    expect(repeatingEquationSolutions(4, 6, 6, 1, 24)!.cs).toEqual([
      3, 10, 17, 24,
    ]);
  });

  it("`repeatingEquationSolutions` 는 범위 밖 자릿수를 **거부**한다", () => {
    expect(repeatingEquationSolutions(0, 6, 6, 1, 18)).toBeNull();
    expect(repeatingEquationSolutions(4, 0, 6, 1, 18)).toBeNull();
    expect(repeatingEquationSolutions(5, 5, 6, 1, 18)).toBeNull(); // $a=b$
    expect(repeatingEquationSolutions(4, 6, 9, 1, 18)).toBeNull(); // $0.\overline{9}$
    expect(repeatingEquationSolutions(4, 6, 0, 1, 18)).toBeNull();
    expect(repeatingEquationSolutions(4, 6, 6, 1, 0)).toBeNull();
    expect(repeatingEquationSolutions(4.5, 6, 6, 1, 18)).toBeNull();
  });

  it("🔴 머리말 ⑼ 의 단언 — `top <= 0` 은 제품 범위에서 한 번도 안 문다", () => {
    // $c\ge1$, $r\le8$ 이므로 $90c-10r\ge10>0$ 이다. 그 단언을 **세어서** 확인한다.
    let smallest = Infinity;
    for (let c = 1; c <= REPEAT_C_MAX; c += 1)
      for (let r = 1; r <= 8; r += 1)
        for (const sign of [1, -1] as const)
          smallest = Math.min(smallest, 90 * c - sign * 10 * r);
    expect(smallest).toBe(10);
    expect(smallest).toBeGreaterThan(0);
  });

  it("`triangleWholeArea` 는 두 비를 **차례로** 쓴다 (손 실측)", () => {
    // $\overline{BD}:\overline{DC}=5:3$, $\overline{AE}:\overline{ED}=1:3$, $k=45$
    // → $\triangle ABD=45\times\frac43=60$ → $\triangle ABC=60\times\frac85=96$
    expect(triangleWholeArea(5, 3, 1, 3, 45)).toBe(96);
    expect(triangleWholeArea(3, 2, 4, 3, 36)).toBe(140);
    // 중간값이 자연수가 아니면 `null`
    expect(triangleWholeArea(5, 3, 1, 3, 46)).toBeNull();
    expect(triangleWholeArea(0, 3, 1, 3, 45)).toBeNull();
    expect(triangleWholeArea(5, 3, 1, 3, 0)).toBeNull();
  });

  it("`ratioFactorTex` 는 기약으로 적고 분모가 $1$ 이면 정수로 적는다", () => {
    expect(ratioFactorTex(4, 3)).toBe("\\dfrac{4}{3}");
    expect(ratioFactorTex(8, 5)).toBe("\\dfrac{8}{5}");
    expect(ratioFactorTex(4, 1)).toBe("4");
    expect(ratioFactorTex(6, 4)).toBe("\\dfrac{3}{2}");
    expect(ratioFactorTex(6, 3)).toBe("2");
  });

  it("`monoTex`·`polyTex` 는 계수 $\\pm1$ 과 지수 $1$ 을 안 적는다", () => {
    expect(monoTex({ c: -1, x: 1, y: 0 }, true)).toBe("-x");
    expect(monoTex({ c: 1, x: 0, y: 2 }, false)).toBe("+y^{2}");
    expect(monoTex({ c: -3, x: 0, y: 0 }, true)).toBe("-3");
    expect(polyTex([])).toBe("0");
    expect(
      polyTex([
        { c: 2, x: 2, y: 1 },
        { c: -5, x: 0, y: 0 },
      ]),
    ).toBe("2x^{2}y-5");
  });

  it("`mulByMono`·`divByMono` 는 서로를 되돌린다 (그리고 못 나누면 `null`)", () => {
    const base: Mono[] = [
      { c: 3, x: 2, y: 0 },
      { c: -4, x: 0, y: 1 },
    ];
    const mono: Mono = { c: -2, x: 1, y: 1 };
    const up = mulByMono(base, mono);
    expect(polyTex(up)).toBe("-6x^{3}y+8xy^{2}");
    expect(divByMono(up, mono)).toEqual(base);
    expect(divByMono(base, mono)).toBeNull(); // 지수가 모자란다
    expect(divByMono(base, { c: 0, x: 0, y: 0 })).toBeNull();
    expect(divByMono([{ c: 3, x: 1, y: 0 }], { c: 2, x: 1, y: 0 })).toBeNull();
  });

  it("`correctedExpression` 은 **두 번** 되돌린다 (`twice=false` 는 한 번)", () => {
    const mono: Mono = { c: -2, x: 1, y: 0 };
    const wrong: Mono[] = [
      { c: 28, x: 3, y: 0 },
      { c: -16, x: 2, y: 0 },
    ];
    expect(polyTex(correctedExpression(wrong, mono, 0)!)).toBe("7x-4");
    expect(polyTex(correctedExpression(wrong, mono, 0, false)!)).toBe(
      "-14x^{2}+8x",
    );
    expect(polyTex(correctedExpression(wrong, mono, 1)!)).toBe(
      "112x^{5}-64x^{4}",
    );
    expect(correctedExpression([{ c: 3, x: 0, y: 0 }], mono, 0)).toBeNull();
  });

  it("`oneOpValues` 는 한 번 연산만 센다 (두 번은 못 센다 — 그 사실을 못 박는다)", () => {
    const s = oneOpValues([2, 3]);
    expect(s.has(5)).toBe(true); // 2+3
    expect(s.has(6)).toBe(true); // 2*3
    expect(s.has(-1)).toBe(true); // 2-3
    expect(s.has(12)).toBe(false); // 2*3*2 는 두 번이다
    expect(oneOpValues([]).size).toBe(0);
  });
});

describe("중2 확대 갈래 5차 h — 검사기 자신의 눈금", () => {
  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("$14+32+50+68=164$이다.")).toEqual([]);
    expect(arithmeticFaults("$14+32+50+68=165$이다.")).toHaveLength(1);
    expect(arithmeticFaults("$90\\times3-60=210$")).toEqual([]);
    expect(arithmeticFaults("$90\\times3-60=211$")).toHaveLength(1);
    expect(arithmeticClaims("$14+32=46$ · $2+2=4$")).toBe(2);
  });

  it("`unreducedFractions` 는 약분 안 한 분수와 **분모 $1$** 을 잡는다", () => {
    expect(unreducedFractions("$\\dfrac{2}{3}$")).toEqual([]);
    expect(unreducedFractions("$\\dfrac{4}{6}$")).toEqual(["4/6"]);
    expect(unreducedFractions("$\\dfrac{4}{1}$")).toEqual(["4/1"]);
    expect(fractionCount("$\\dfrac{2}{3}$와 $\\frac{1}{2}$")).toBe(2);
  });

  it("🔴 `monoJosaFaults` 는 지수로 끝나는 단항식 뒤 조사를 잡는다", () => {
    expect(monoJosaFaults("$-2y$로 나누어야")).toEqual([]);
    expect(monoJosaFaults("$3xy$를 곱해야")).toEqual([]);
    expect(monoJosaFaults("$-2y$으로 나누어야")).toHaveLength(1);
    expect(monoJosaFaults("$-2y$을 곱해야")).toHaveLength(1);
    expect(monoJosaFaults("$-2y^{2}$로 나누어야")).toHaveLength(1);
    // 수로 끝나면 공용 자의 몫이라 여기서는 안 본다.
    expect(monoJosaFaults("$18$을 곱해야")).toEqual([]);
    expect(monoJosaSeen("$-2y$로 나누고 $3x$를 곱한다")).toBe(2);
  });

  it("🔴 `wordingFaults` 는 낱말을 뒤집으면 빨개진다 (양성·음성)", () => {
    const p133 = E133.handler(createRng(BASE_SEED));
    expect(wordingFaults("133X", p133.content, p133.solution)).toEqual([]);
    // 「배수」 → 「약수」: 값 검산이 잡는다(낱말만 보는 자가 아니다).
    expect(
      wordingFaults(
        "133X",
        p133.content,
        p133.solution.replace("의 배수여야 한다", "의 약수여야 한다"),
      ).length,
    ).toBeGreaterThan(0);
    // 「자연수」 걸음을 지우면
    expect(
      wordingFaults(
        "133X",
        p133.content,
        p133.solution.replace("$x$가 자연수이려면", "$x$가 정수이려면"),
      ).length,
    ).toBeGreaterThan(0);
    // 버리는 근거를 지우면 (D-116 ⑹)
    expect(
      wordingFaults(
        "133X",
        p133.content,
        p133.solution.replace("나머지 $c$에서는", "그리고"),
      ).length,
    ).toBeGreaterThan(0);
    // 나열을 지우면 배수 주장을 확인할 자리가 사라진다
    expect(
      wordingFaults(
        "133X",
        p133.content,
        p133.solution.replace(/그런 \$c\$는 .+?뿐이고/, "그런 $c$가 있고"),
      ).length,
    ).toBeGreaterThan(0);

    const p134 = E134.handler(createRng(BASE_SEED));
    expect(wordingFaults("134X", p134.content, p134.solution)).toEqual([]);
    expect(
      wordingFaults(
        "134X",
        p134.content,
        p134.solution.replace("높이가 같은 두 삼각형", "밑변이 같은 두 삼각형"),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      wordingFaults(
        "134X",
        p134.content,
        p134.solution.replace("점 $B$에서 직선 $AD$", "점 $C$에서 직선 $AD$"),
      ).length,
    ).toBeGreaterThan(0);

    const p135 = E135.handler(createRng(BASE_SEED));
    expect(wordingFaults("135X", p135.content, p135.solution)).toEqual([]);
    // 🔴 되돌림 방향을 **뒤집는다.** ⚠️ 두 번 `replace` 하면 두 번째가 첫 번째를
    //    되돌려 놓는다 — 그렇게 짰다가 이 눈금이 «0» 을 냈다(거짓 초록).
    const flipped = p135.solution.includes("두 번 곱한 것과 같다")
      ? p135.solution.replace("두 번 곱한 것과 같다", "두 번 나눈 것과 같다")
      : p135.solution.replace("두 번 나눈 것과 같다", "두 번 곱한 것과 같다");
    expect(flipped, "변이가 실제로 먹었나").not.toBe(p135.solution);
    expect(wordingFaults("135X", p135.content, flipped).length).toBeGreaterThan(
      0,
    );
    expect(
      wordingFaults(
        "135X",
        p135.content,
        p135.solution.replace(
          "곱셈과 나눗셈을 서로 바꾸어 계산했으므로",
          "그러므로",
        ),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("🔴 `parseTerm`·`polyOut` 은 지면 글자를 왕복한다 (그리고 못 읽으면 던진다)", () => {
    for (const s of ["-20x^{2}y^{3}", "7x", "-4", "y", "-x", "32xy^{2}"]) {
      expect(polyOut([parseTerm(s)])).toBe(s);
    }
    expect(polyOut(parsePoly("-20x^{2}y^{3}-32xy^{2}"))).toBe(
      "-20x^{2}y^{3}-32xy^{2}",
    );
    expect(() => parseTerm("")).toThrow();
    expect(() => parseTerm("2z")).toThrow();
    expect(() => parseTerm("2yx")).toThrow(); // 차례가 규약과 다르다
  });

  it("🔴 `evalPoly` 는 식 조작 없이 값을 낸다 (대입 검산의 뿌리)", () => {
    const p = parsePoly("-20x^{2}y^{3}-32xy^{2}");
    expect(evalPoly(p, 1, 1)).toBe(-52);
    expect(evalPoly(p, 2, 1)).toBe(-144);
    expect(evalPoly(parsePoly("7x-4"), 3, 5)).toBe(17);
  });
});

describe("중2 확대 갈래 5차 h — 🔴 D-20 원장을 **전수로 다시 센다** (㉶)", () => {
  type G133 = { len: boolean; range: boolean; shortcut: boolean };

  function census133(on: G133) {
    let total = 0;
    let pass = 0;
    const answers = new Map<number, number>();
    const dist = new Map<number, number>();
    for (let a = 1; a <= 9; a += 1)
      for (let b = 1; b <= 9; b += 1) {
        if (a === b) continue;
        for (let r = 1; r <= 8; r += 1)
          for (const sign of [1, -1] as const) {
            total += 1;
            const f = repeatingEquationSolutions(a, b, r, sign, REPEAT_C_MAX)!;
            dist.set(f.cs.length, (dist.get(f.cs.length) ?? 0) + 1);
            if (on.len && (f.cs.length < 2 || f.cs.length > 4)) continue;
            const lo = Math.min(...f.xs);
            const hi = Math.max(...f.xs);
            if (on.range && (lo < 2 || hi > 120)) continue;
            const sum = f.xs.reduce((p, q) => p + q, 0);
            if (on.shortcut && oneOpValues([a, b, r, REPEAT_C_MAX]).has(sum))
              continue;
            pass += 1;
            answers.set(sum, (answers.get(sum) ?? 0) + 1);
          }
      }
    const top = answers.size ? Math.max(...answers.values()) : 0;
    return {
      total,
      pass,
      kinds: answers.size,
      topPct: Number(((top / pass) * 100).toFixed(2)),
      dist,
    };
  }

  function census134(mn11: boolean, shortcut: boolean) {
    let pass = 0;
    const answers = new Map<number, number>();
    for (let m = 1; m <= 5; m += 1)
      for (let n = 1; n <= 5; n += 1) {
        if (gcd2(m, n) !== 1) continue;
        if (mn11 && m === 1 && n === 1) continue;
        for (let s = 1; s <= 5; s += 1)
          for (let t = 1; t <= 5; t += 1) {
            if (gcd2(s, t) !== 1) continue;
            const g = gcd2(m, s + t) || 1;
            const unit = ((m + n) * (s + t)) / g;
            for (let i = 1; i <= Math.floor(300 / unit); i += 1) {
              const whole = unit * i;
              const abd = (whole * m) / (m + n);
              const k = (abd * t) / (s + t);
              if (!Number.isInteger(abd) || !Number.isInteger(k)) continue;
              if (k < 4 || k > 150) continue;
              if (shortcut && oneOpValues([m, n, s, t, k]).has(whole)) continue;
              pass += 1;
              answers.set(whole, (answers.get(whole) ?? 0) + 1);
            }
          }
      }
    const top = answers.size ? Math.max(...answers.values()) : 0;
    return {
      pass,
      kinds: answers.size,
      topPct: Number(((top / pass) * 100).toFixed(2)),
    };
  }

  it("`133X` 의 표 — 전량·통과·가짓수·최빈", () => {
    const all = census133({ len: true, range: true, shortcut: true });
    expect(all.total, "전량").toBe(1152);
    expect(all.pass, "가드 다 켠 뒤").toBe(144);
    expect(all.kinds, "정답 가짓수").toBe(48);
    expect(all.topPct, "최빈 정답").toBe(6.25);
    // 후보 수 분포 — 머리말 ⑷ 가 적은 그대로여야 한다.
    expect([...all.dist.entries()].sort((p, q) => p[0] - q[0])).toEqual([
      [0, 587],
      [1, 398],
      [2, 104],
      [3, 37],
      [4, 15],
      [5, 3],
      [9, 4],
      [18, 4],
    ]);
  });

  it("`133X` 의 「가드 하나만 껐을 때」 세 줄", () => {
    const noLen = census133({ len: false, range: true, shortcut: true });
    expect([noLen.pass, noLen.kinds, noLen.topPct]).toEqual([378, 66, 11.38]);
    const noRange = census133({ len: true, range: false, shortcut: true });
    expect([noRange.pass, noRange.kinds, noRange.topPct]).toEqual([
      150, 50, 6.0,
    ]);
    const noShort = census133({ len: true, range: true, shortcut: false });
    expect([noShort.pass, noShort.kinds, noShort.topPct]).toEqual([
      150, 48, 6.0,
    ]);
    // 🔴 「가장 비싼 가드」의 값 — 머리말이 적은 61.9% 를 여기서 다시 낸다.
    expect(Number((((378 - 144) / 378) * 100).toFixed(1))).toBe(61.9);
  });

  it("`134X` 의 표와 「가드 하나만 껐을 때」 두 줄", () => {
    const all = census134(true, true);
    expect([all.pass, all.kinds, all.topPct]).toEqual([4763, 191, 2.46]);
    const full = census134(false, false);
    expect(full.pass, "전량").toBe(5807);
    expect(Number(((4763 / 5807) * 100).toFixed(1))).toBe(82.0);
    const no11 = census134(false, true);
    expect([no11.pass, no11.kinds, no11.topPct]).toEqual([5307, 191, 2.41]);
    const noShort = census134(true, false);
    expect([noShort.pass, noShort.kinds, noShort.topPct]).toEqual([
      5258, 194, 2.36,
    ]);
  });

  it("🔴 지름길 가드의 «우연 수준» — 제 답과 치환 대조를 함께 잰다", () => {
    // `133X` — 가드 앞에 선 판 전부에서 제 답 4.0% · 우연 4.7% (우연보다 낮다).
    const b133: { printed: number[]; sum: number }[] = [];
    for (let a = 1; a <= 9; a += 1)
      for (let b = 1; b <= 9; b += 1) {
        if (a === b) continue;
        for (let r = 1; r <= 8; r += 1)
          for (const sign of [1, -1] as const) {
            const f = repeatingEquationSolutions(a, b, r, sign, REPEAT_C_MAX)!;
            if (f.cs.length < 2 || f.cs.length > 4) continue;
            if (Math.min(...f.xs) < 2 || Math.max(...f.xs) > 120) continue;
            b133.push({
              printed: [a, b, r, REPEAT_C_MAX],
              sum: f.xs.reduce((p, q) => p + q, 0),
            });
          }
      }
    expect(b133.length).toBe(150);
    let own = 0;
    let ctrl = 0;
    for (let i = 0; i < b133.length; i += 1) {
      const s = oneOpValues(b133[i]!.printed);
      if (s.has(b133[i]!.sum)) own += 1;
      if (s.has(b133[(i + 37) % b133.length]!.sum)) ctrl += 1;
    }
    expect(Number(((own / b133.length) * 100).toFixed(1))).toBe(4.0);
    expect(Number(((ctrl / b133.length) * 100).toFixed(1))).toBe(4.7);
    // 🔴 제 답이 우연보다 **높지 않다** — 그러니 「지름길을 막았다」고 읽으면 안 된다.
    expect(own).toBeLessThanOrEqual(ctrl);
  });
});

describe("중2 확대 갈래 5차 h — 🔴 이 회차에 물린 결함의 회귀 잠금 (⑹)", () => {
  it("⑴ `133X` 의 발문이 묻는 것은 **하나**다 (「모두 구하고,」 가 없다)", () => {
    for (const p of rows(E133, 200)) {
      expect(
        p.content.includes("모두 구하고,"),
        `발문이 두 가지를 묻는데 정답 칸은 하나다 — ${p.content}`,
      ).toBe(false);
      expect(p.content.includes("모든 $c$에 대하여,")).toBe(true);
      // 묻는 것이 하나라는 것을 «구하시오» 개수로도 못 박는다.
      expect(p.content.match(/구하시오/g)!.length).toBe(1);
      expect(p.answer.match(/\$/g)!.length, "정답 칸도 하나다").toBe(2);
    }
  });

  it("⑵ `facts` 왕복이 **항 정보를 실제로 쓴다** — 한 항을 지우면 어긋난다", () => {
    for (const p of rows(E135, 60)) {
      const f = p.facts;
      const terms: Mono[] = [];
      for (let i = 0; i < f.terms!; i += 1)
        terms.push({ c: f[`c${i}`]!, x: f[`x${i}`]!, y: f[`y${i}`]! });
      expect(`$${polyOut(terms)}$`).toBe(p.answer);
      // 🔴 항 정보를 안 쓰면(첫 항만으로 지으면) 못 짓는다 — 왕복이 장식이 아니다.
      expect(`$${polyOut(terms.slice(0, 1))}$`).not.toBe(p.answer);
      // 계수만 있고 지수가 없으면 못 짓는다.
      const flat = terms.map((t) => ({ c: t.c, x: 0, y: 0 }));
      expect(`$${polyOut(flat)}$`).not.toBe(p.answer);
    }
  });

  it("⑶ `135X` 의 단항식은 **늘 맨 문자로 끝난다** (⑺ 4 — 조사 목록을 두 벌로 안 만든다)", () => {
    for (const p of rows(E135, 200)) {
      const v = solve135(p.content);
      expect(v.mono.x <= 1 && v.mono.y <= 1, p.content).toBe(true);
      expect(v.mono.x + v.mono.y, "문자가 없다").toBeGreaterThan(0);
      const body = polyOut([v.mono]);
      expect(/[xy]$/.test(body), `단항식이 맨 문자로 안 끝난다: ${body}`).toBe(
        true,
      );
      expect(Math.abs(v.mono.c), "단항식 계수 절댓값").toBeGreaterThanOrEqual(
        2,
      );
    }
  });

  it("⑷ `135X` 의 답은 계수 절댓값이 **$2$ 이상**이다 (⑺ 5 — 첫 수가 지수가 되면 안 된다)", () => {
    for (const p of rows(E135, 200)) {
      const v = solve135(p.content);
      for (const t of v.right)
        expect(Math.abs(t.c), `${p.answer} 의 계수`).toBeGreaterThanOrEqual(2);
      // 답의 첫 수는 **계수**이지 지수가 아니다.
      const first = Number(p.answer.match(/-?\d+/)![0]);
      expect(first).toBe(v.right[0]!.c);
    }
  });

  it("⑸ `134X` 의 두 비례상수가 늘 기약이고, 분모가 $1$ 이면 **정수로** 적힌다", () => {
    let sawInteger = 0;
    let sawFraction = 0;
    for (const p of rows(E134, 300)) {
      const v = solve134(p.content);
      expect(gcd2(v.s + v.t, v.t), "첫 비례상수").toBe(1);
      expect(gcd2(v.m + v.n, v.m), "둘째 비례상수").toBe(1);
      if (v.t === 1 || v.m === 1) sawInteger += 1;
      if (v.t > 1 && v.m > 1) sawFraction += 1;
      expect(unreducedFractions(p.solution), p.content).toEqual([]);
    }
    // 🔴 두 갈래가 표본에 **둘 다** 있어야 위 검사가 두 자리를 다 본다.
    expect(sawInteger, "분모 $1$ 인 판").toBeGreaterThan(0);
    expect(sawFraction, "진짜 분수인 판").toBeGreaterThan(0);
  });

  it("⑹ `133X` 의 대입 줄 수가 나열한 $c$ 의 수와 같다 (㉮ 지면 길이와 D-116 ⑹ 둘 다)", () => {
    const counts = new Set<number>();
    for (const p of rows(E133, 300)) {
      const v = solve133(p.content);
      const subs = [...p.solution.matchAll(/^\$c=(\d+)\$일 때/gm)].map((m) =>
        num(m[1]),
      );
      expect(subs, p.content).toEqual(v.found.map((f) => f.c));
      counts.add(subs.length);
    }
    // 후보 수가 $2$~$4$ 사이로만 나온다 — 그리고 표본에 **셋 다** 있어야 한다.
    expect([...counts].sort()).toEqual([2, 3, 4]);
  });

  it("⑺ 세 유형 다 그림이 없고 발문이 지면을 안 가리킨다", () => {
    for (const e of M2_TOP_5H) {
      for (const p of rows(e, 100)) {
        expect(p.figureSpec, p.content).toBeNull();
        expect(pointsAtFigure(p.content), p.content).toBeNull();
        expect(p.content.includes("그림"), p.content).toBe(false);
      }
    }
  });
});
