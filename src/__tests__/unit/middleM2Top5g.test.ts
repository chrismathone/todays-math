/**
 * 중2 **확대 갈래 5차 물결** `m2Top5g.ts` — `125X`~`128X` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `125X` | $\dfrac{ab}{9900}\times N=\dfrac{g_n}{g_d}$ 를 **나눗셈 한 번**으로 푼다 | 나눗셈을 **안 쓴다** — $N$ 을 $1$ 부터 넣어 보아 $N\cdot ab\cdot g_d=g_n\cdot9900$ 이 되는 자리를 **찾는다**(정수 곱셈만). 그런 $N$ 이 하나가 아니면 던진다 |
 * | `126X` | 두 조건의 부등식을 정리해 계수로 나누고 올림·내림으로 경계를 낸다 | 부등식을 **한 줄도 안 푼다** — 자연수 $x$ 를 $1$ 부터 **대입해** $r(M+x)\le pM+qx\le s(M+x)$ 가 참인 $x$ 를 모은다(분수도 나눗셈도 안 쓴다). 모은 것이 이어져 있지 않으면 던진다 |
 * | `127X` | 「평행 둘 + 한 점에서 만나기 하나」라는 **경우 나눔**으로 후보를 만든다 | 경우를 **안 나눈다** — 정수 $a$ 를 차례로 넣고 세 직선의 **쌍마다 교점**을 유리수로 구해 「서로 다른 점 셋」이 되는지 본다. 안 되는 $a$ 를 모아 더한다 |
 * | `128X` | $2C$ 를 **반으로 나누어** $C$ 를 얻는다 | 나눗셈을 **안 쓴다** — 정수 $c$ 를 훑어 $c+c$ 가 그 계수인 자리를 찾고, 얻은 $A$ 로 $A-(B-C)$ 와 $A-B-C$ 를 **실제로 전개해** 차가 발문의 값인지 확인한다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면 재현율만
 * 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * ## ⑶ 🔴 이 회차에 **실제로 물린 것** — 재고 나서 모듈을 고쳤다
 *
 * 모듈은 앞 세션이 저술만 하고 시험 없이 끊긴 채였다. 값(넷 다)은 전량 맞았고 **지면과
 * 쏠림이 샜다.** 아래가 실측이고, 회귀 잠금이 각 자리를 지금도 다시 잰다.
 *
 *   ㄱ. `127X` 정답 쏠림이 문턱을 **넘었다** — 답이 22종뿐이라 전수 최빈 **10.51%**,
 *       씨앗 40블록×800판의 최악이 **13.25%**(브리프 한계 12%). 매개변수를 넓혀
 *       37종 · 전수 **6.70%** · 40블록 최악 **9.00%** 가 됐다.
 *   ㄴ. `127X` 가 지면에 **계수 $1$** 을 찍었다 — `$1a=-2$`·`$-1\times(1)$`·`$1x=6$`.
 *       `pageSmells` 가 400판 중 **95판**을 물었다.
 *   ㄷ. **조사 다섯 자리가 손으로 박혀 있었다** —
 *       `125X` 「$0.\overline{ab}$**을**」(400/400)·「…**이라** 하면」(400/400),
 *       `127X` 「$y=ax+n_3$**가**」(어긋남 250/400)·「$y$절편이 … $n$**로**」(204/400)·
 *       「교점 $(p_x,\ p_y)$**를**」(400/400 손 박음).
 *       그중 `josaMismatches` 가 문 것은 **하나뿐**이다 — 나머지 넷은 그 자가
 *       구조적으로 못 본다(끝이 숫자가 아니거나 「(으)로」라 축이 다르다).
 *   ㄹ. `127X` 가 **양수를 괄호로 쌌다** — `\times(3)`(213/400). 값도 KaTeX 도 초록이라
 *       어느 자도 못 보는 부류다(2026-08-24 중3 다항식과 같은 자리).
 *   ㅁ. `126X` 해설이 분수 부등식의 양변에 $(M+x)$ 를 곱하는 **걸음을 「즉」으로 건너뛰었다.**
 *   ㅂ. 모듈 머리말의 **D-20 손실 원장이 재현되지 않았다**(㉶) — `126X` 의 모집단이
 *       `up` 축을 빼놓은 수였고 통과 수도 어느 가드 조합으로도 안 나왔다. 전수로 다시 쟀다.
 *
 * ## ⑷ 🔴 이 시험이 **못 보는 것** — 정직하게
 *
 * 1. **지름길 자는 「한두 번짜리」만 본다.** 세 번 이상 이어진 연산과, 발문에 안 찍힌
 *    중간값(교점 좌표 따위)을 거친 길은 못 본다. 그래서 이 자의 «0» 은 「지름길이
 *    없다」가 아니다 — 그 대신 **치환 대조**(같은 자루에 다른 판의 답)를 같이 재어
 *    「우연 수준보다 낮은가」를 묻는다.
 * 2. 🔴 **`128X` 에서는 그 자가 아예 눈이 멀었다** — 발문에 계수 아홉이 찍혀 있고 답의
 *    첫 수는 $2$~$9$ 라, **제 답 94.63% · 치환 대조 94.38%** 로 둘이 같다. 그 유형의
 *    지름길은 낱값이 아니라 **다항식 통째**로 봐야 하고, 그것은 아래 「뻔한 조합」이 본다.
 * 3. **자료 나열이 없어 ㉵(정렬이 순위를 암시한다)는 «잴 것이 없다»** 이지 «깨끗»이 아니다.
 * 4. `126X` 의 검산은 $x$ 를 $1$ 부터 $20{,}000$ 까지만 훑는다. 지금 위끝 상한이
 *    $2{,}000$ 이라 넉넉하지만, 매개변수를 넓히면 이 상한도 같이 넓혀야 한다.
 * 5. `127X` 의 검산은 정수 $a$ 를 $-400$~$400$ 만 훑는다. 후보는 $|m|\le6$·$|a_3|\le9$ 라
 *    충분하지만, 범위를 넓히면 같이 넓혀야 한다.
 * 6. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄의 **참·거짓**은 재지만 설명이
 *    실제로 이해되는지는 사람이 읽어야 안다. 이 회차 표본은 눈으로 읽었다.
 * 7. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 *
 * ## ⑸ 🔴 변이 시험 — **가드는 망가뜨려 봐야 가드인 줄 안다**
 *
 * 순서는 셋이다: ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나.
 * 그리고 변이 **전에** 음성 대조(손 안 댄 판이 초록인가)를 회차마다 한 번 본다 — 그
 * 판정에 도달하려면 **같은 명령**이 방금 초록을 낸 것을 본 뒤여야 하므로, 「늘 빨강을
 * 찍는 도장」은 판정 단계에 아예 못 온다(2026-08-23).
 *
 * 모듈에 변이 **26개**를 걸었다. **23개 빨강 · 3개 판정 거부**(⑵ 에서 산출물이 그대로).
 *
 * 🔴 그리고 **처음에는 넷이 초록이었다** — 그것이 이 시험의 구멍이었다:
 *   ㄱ. $a_3$ 범위를 좁혀 쏠림이 6.70% → 9.12% 로 나빠져도 초록이었다. 브리프의 12% 는
 *       **한계**라 여유가 너무 넓었다 → 「⑾ 모집단 값으로 잠근다」를 넣었다.
 *   ㄴ. 「자연수 걸음이 서는 조합만」 가드를 꺼도 초록 → 경계 두 줄 가운데 **적어도
 *       하나에 그 걸음이 선다**를 넣었다(안 그러면 ㉯ 축이 통째로 침묵한다).
 *   ㄷ. 절편 상한($\le36$)·분모 상한($\le900$)을 풀어도 초록 → 「⑽ 읽기 가드」를 넣었다.
 *   ㄹ. 그리고 **하네스도 한 번 눈이 멀었다** — 굳힘 인자(`subtractFinite`)를 지운 변이가
 *       「산출물 그대로」로 거부됐다. 지면만 찍었기 때문이다(제품은 그 길을 안 간다).
 *       지문에 **흔든 값**을 같이 찍자 그 변이가 빨개졌다.
 *
 * 남은 판정 거부 셋은 «가드가 아니다»가 **아니라** «이 지문으로는 못 잰다»다:
 * `values.length !== 3` 과 `gapDen === 99` 는 생성이 이미 그 자리를 안 만들어서
 * 60판 지문이 안 갈린다(전수로는 각각 0조합·14조합을 깎는다 — 모듈 머리말 ⑷).
 *
 * ## ⑹ D-20 손실 원장을 어떻게 쟀나 (모듈 머리말 ⑷ 의 절차)
 *
 * 새 스크립트를 만들지 않고 모듈이 내보낸 순수 함수(`shortcutHits`·`mixWindow`·
 * `noTriangleValues`·`multiplierFromGap`·`REPEAT_BLOCKS`·`CONCENTRATIONS`·`AMOUNTS`)를
 * 그대로 부르는 계량기로 **매개변수 전수**를 훑고, 가드를 **하나씩만** 껐다.
 * 「통과 조합 수 · 서로 다른 답 수 · 최빈 비율」을 **같은 모집단에서** 함께 센다.
 * 아래 「손실 원장이 재현된다」가 그 표의 핵심 칸을 **여기서 다시 계산해** 맞댄다 —
 * 표를 손으로 고치면 빨개진다.
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
  AMOUNTS,
  CONCENTRATIONS,
  M2_TOP_5G,
  mixBound,
  mixWindow,
  multiplierFromGap,
  noTriangleValues,
  recoverA,
  reduceFraction,
  REPEAT_BLOCKS,
  shortcutHits,
  timesArg,
  type Quad,
  noTriangleCase,
} from "@/lib/middle/m2Top5g";
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
 * 적게 된다. ⚠️ 그리고 **씨앗 표본의 최빈은 전수보다 늘 크게 나온다** — 답 수십 종
 * 위의 최댓값이라 순서통계량이 위로 치우친다. `127X` 는 전수 6.70% 인데 40블록의
 * 최악이 9.00% 였다. 문턱을 볼 때는 두 값을 **같이** 보라.
 */
const SEED_BLOCKS = [20260905, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260905, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];
/** 정답 쏠림 문턱 — 브리프가 못 박은 값. */
const SKEW_LIMIT = 12;

function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5G.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E125 = entryOf("125X");
const E126 = entryOf("126X");
const E127 = entryOf("127X");
const E128 = entryOf("128X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "125X": "심화중",
  "126X": "심화상",
  "127X": "심화상",
  "128X": "심화중",
};

/** 유형마다 리드가 준 변형 폭 아래 끝. */
const VARIANT_FLOOR: Record<string, number> = {
  "125X": 7,
  "126X": 12,
  "127X": 12,
  "128X": 12,
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

/** 해설에서 그 조각이 든 줄. 없으면 던진다 — 조용히 건너뛰면 분모 밖이 된다. */
function lineWith(solution: string, needle: string, who: string): string {
  const hit = solution.split("\n").find((l) => l.includes(needle));
  if (hit === undefined)
    throw new Error(`${who}: 「${needle}」가 든 줄이 없다 — ${solution}`);
  return hit;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 을/를·은/는·와/과·가만 본다. 그런데 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다.
 * 이 회차에 `127X` 가 400판 중 **204판**을 어겼고, 그 자는 한 판도 못 봤다.
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

// ── 해설의 **모든 산술 등식**을 뽑아 좌·우를 각각 계산한다 ──

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

/** 이 자가 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»과 «못 셈»이 안 갈린다. */
function arithmeticClaims(text: string): number {
  return [...text.matchAll(CHAIN_EQ)].length;
}

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

/** 지수는 값이 아니다 — `x^{2}` 의 $2$ 를 «설명되지 않는 수»로 세면 안 된다. */
function stripExponents(text: string): string {
  return text.replace(/\^\{[^}]*\}/g, "").replace(/\^\d+/g, "");
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const RE125 =
  /^어떤 자연수에 순환소수 \$0\.\\overline\{(\d\d)\}\$(?:을|를) 곱해야 할 것을, 잘못하여 유한소수 \$0\.(\d\d)\$(?:을|를) 곱했더니 그 결과가 바르게 계산한 값보다 \$\\dfrac\{(\d+)\}\{(\d+)\}\$만큼 작아졌다\. 이때 처음의 자연수를 구하시오\.$/;

const RE126 =
  /^농도가 \$(\d+)\\%\$인 소금물 \$(\d+)\$ g에 농도가 \$(\d+)\\%\$인 소금물 \$x\$ g을 섞으려고 한다\. 섞은 소금물의 농도가 \$(\d+)\\%\$ 이상 \$(\d+)\\%\$ 이하가 되도록 할 때, \$x\$의 값 중 가장 작은 값과 가장 큰 값의 합을 구하시오\. \(단, \$x\$는 자연수이다\.\)$/;

const RE127 =
  /^세 직선 \$y=(-?\d+)x([+-]\d+)\$, \$y=(-?\d+)x([+-]\d+)\$, \$y=ax([+-]\d+)\$(?:이|가) 삼각형을 이루지 않도록 하는 모든 상수 \$a\$의 값의 합을 구하시오\.$/;

const RE128 =
  /^세 다항식 \$A\$, \$B\$, \$C\$에 대하여 \$B=(-?\d+)x\^\{2\}([+-]\d+)x([+-]\d+)\$이다\. \$A-\(B-C\)\$를 계산해야 하는데 괄호를 빠뜨리고 \$A-B-C\$로 계산하였더니 \$(-?\d+)x\^\{2\}([+-]\d+)x([+-]\d+)\$(?:이|가) 되었다\. 바르게 계산한 식에서 잘못 계산한 식을 뺀 결과가 \$(-?\d+)x\^\{2\}([+-]\d+)x([+-]\d+)\$일 때, 다항식 \$A\$를 구하시오\.$/;

/** 126X — 자연수 $x$ 를 **대입해** 조건이 참인 자리를 모은다(부등식을 안 푼다). */
function mixHits(
  p: number,
  amount: number,
  q: number,
  r: number,
  s: number,
): number[] {
  const out: number[] = [];
  for (let x = 1; x <= 20000; x += 1) {
    const salt = p * amount + q * x; // 양변에 $100$ 을 곱해 둔 값
    const total = amount + x;
    if (salt >= r * total && salt <= s * total) out.push(x);
  }
  return out;
}

/** 두 직선의 교점 — 평행이면 `null`. 유리수 $(x,\ y)$ 를 **분수 쌍**으로 낸다. */
function meetPoint(
  m1: number,
  n1: number,
  m2: number,
  n2: number,
): [number, number, number] | null {
  if (m1 === m2) return null;
  // $x=\dfrac{n_2-n_1}{m_1-m_2}$, $y=\dfrac{m_1(n_2-n_1)+n_1(m_1-m_2)}{m_1-m_2}$
  const den = m1 - m2;
  const xn = n2 - n1;
  const yn = m1 * xn + n1 * den;
  return [xn, yn, den];
}

function samePoint(
  a: [number, number, number],
  b: [number, number, number],
): boolean {
  return a[0] * b[2] === b[0] * a[2] && a[1] * b[2] === b[1] * a[2];
}

/** 127X — 세 직선이 삼각형을 **못 이루는** 정수 $a$ 를 경우 나눔 없이 모은다. */
function noTriangleByGeometry(
  m1: number,
  n1: number,
  m2: number,
  n2: number,
  n3: number,
): number[] {
  const out: number[] = [];
  for (let a = -400; a <= 400; a += 1) {
    const P = meetPoint(m1, n1, m2, n2);
    const Q = meetPoint(m1, n1, a, n3);
    const R = meetPoint(m2, n2, a, n3);
    if (P === null || Q === null || R === null) {
      out.push(a);
      continue;
    }
    if (samePoint(P, Q) || samePoint(P, R) || samePoint(Q, R)) out.push(a);
  }
  return out;
}

/** `px^{2}+qx+r` 의 KaTeX 몸통 — 제품 `poly` 를 **안 부르고** 여기서 다시 짓는다. */
function quadTex(q: Quad): string {
  const parts: string[] = [];
  const term = (c: number, sym: string): string => {
    const sign = c < 0 ? "-" : parts.length === 0 ? "" : "+";
    const abs = Math.abs(c);
    const body = sym === "" ? String(abs) : abs === 1 ? sym : `${abs}${sym}`;
    return `${sign}${body}`;
  };
  if (q[0] !== 0) parts.push(term(q[0], "x^{2}"));
  if (q[1] !== 0) parts.push(term(q[1], "x"));
  if (q[2] !== 0) parts.push(term(q[2], ""));
  return parts.length === 0 ? "0" : parts.join("");
}

const VERIFY: Record<string, (content: string) => string> = {
  // 125X — 나눗셈을 안 쓴다. $N$ 을 넣어 보아 정수 곱셈이 맞아떨어지는 자리를 찾는다.
  "125X": (content) => {
    const [blockT, finiteT, gnT, gdT] = grab(RE125, content, "125X");
    const block = num(blockT);
    if (num(finiteT) !== block)
      throw new Error("125X: 순환소수와 유한소수의 두 자리가 다르다");
    const gn = num(gnT);
    const gd = num(gdT);
    if (gd === 99)
      throw new Error("125X: 차의 분모가 $99$ 라 차가 곧 그 순환소수다");
    if (gcd2(gn, gd) !== 1 || gd === 1)
      throw new Error("125X: 발문의 분수가 기약이 아니다");
    const found: number[] = [];
    for (let n = 1; n <= 5000; n += 1) {
      if (n * block * gd === gn * 9900) found.push(n);
    }
    if (found.length !== 1)
      throw new Error(`125X: 맞는 자연수가 ${found.length}개다`);
    const n = found[0]!;
    if (n < 2) throw new Error("125X: 곱한 수가 $2$ 보다 작다");
    return String(n);
  },

  // 126X — 부등식을 안 푼다. 자연수 $x$ 를 대입해 모은다.
  "126X": (content) => {
    const g = grab(RE126, content, "126X").map(num);
    const [p, amount, q, r, s] = g as [number, number, number, number, number];
    if (r >= s) throw new Error("126X: 아래 농도가 위 농도보다 작지 않다");
    if (amount % 100 !== 0)
      throw new Error(
        "126X: 소금물의 양이 $100$ 의 배수가 아니라 소금이 정수가 아니다",
      );
    const hits = mixHits(p, amount, q, r, s);
    if (hits.length === 0)
      throw new Error("126X: 조건을 만족하는 자연수가 없다");
    const lo = hits[0]!;
    const hi = hits[hits.length - 1]!;
    if (hi - lo + 1 !== hits.length)
      throw new Error("126X: 만족하는 자리가 이어져 있지 않다");
    if (lo < 2)
      throw new Error("126X: 아래끝이 $2$ 보다 작아 아래 조건이 안 자른다");
    if (hi >= 20000) throw new Error("126X: 위끝이 훑는 창을 넘었다");
    if (hi - lo < 4) throw new Error("126X: 창이 너무 좁다");
    return String(lo + hi);
  },

  // 127X — 경우를 안 나눈다. 쌍마다 교점을 구해 «서로 다른 점 셋»인지 본다.
  "127X": (content) => {
    const g = grab(RE127, content, "127X").map(num);
    const [m1, n1, m2, n2, n3] = g as [number, number, number, number, number];
    if (m1 === m2) throw new Error("127X: 앞 두 직선이 평행이라 교점이 없다");
    if (n3 === n1 || n3 === n2)
      throw new Error("127X: 셋째 직선의 $y$절편이 앞 직선과 같다");
    const fails = noTriangleByGeometry(m1, n1, m2, n2, n3);
    if (fails.length !== 3)
      throw new Error(`127X: 삼각형을 못 이루는 $a$ 가 ${fails.length}개다`);
    return String(fails.reduce((t, v) => t + v, 0));
  },

  // 128X — 나눗셈을 안 쓴다. $c$ 를 훑고, 얻은 $A$ 로 두 식을 실제로 전개해 확인한다.
  "128X": (content) => {
    const g = grab(RE128, content, "128X").map(num);
    const B: Quad = [g[0]!, g[1]!, g[2]!];
    const W: Quad = [g[3]!, g[4]!, g[5]!];
    const G: Quad = [g[6]!, g[7]!, g[8]!];
    const C: number[] = [];
    for (let k = 0; k < 3; k += 1) {
      let hit: number | null = null;
      for (let c = -80; c <= 80; c += 1) if (c + c === G[k]!) hit = c;
      if (hit === null)
        throw new Error("128X: $2C$ 가 홀수라 $C$ 가 정수가 아니다");
      if (hit === 0) throw new Error("128X: $C$ 의 항이 사라진다");
      C.push(hit);
    }
    const A: Quad = [
      W[0]! + B[0]! + C[0]!,
      W[1]! + B[1]! + C[1]!,
      W[2]! + B[2]! + C[2]!,
    ];
    // 전개해서 확인 — 뺀 결과가 발문의 값이고 잘못 계산한 식이 발문의 값인가.
    for (let k = 0; k < 3; k += 1) {
      const right = A[k]! - (B[k]! - C[k]!);
      const wrong = A[k]! - B[k]! - C[k]!;
      if (right - wrong !== G[k]! || wrong !== W[k]!)
        throw new Error("128X: 전개해 보니 발문과 안 맞는다");
    }
    if (A[0]! < 2)
      throw new Error("128X: 답의 $x^{2}$ 계수가 $2$ 보다 작다 (계약 ⑹.2)");
    if (A.some((v) => v === 0)) throw new Error("128X: 답에서 항이 사라진다");
    return quadTex(A);
  },
};

// ── ⑵ 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────

/** 양성 — 답을 아는 지면에서 그 답이 나온다. */
const CALIBRATION: readonly [string, string, string][] = [
  [
    "125X",
    "어떤 자연수에 순환소수 $0.\\overline{13}$을 곱해야 할 것을, 잘못하여 유한소수 $0.13$을 곱했더니 그 결과가 바르게 계산한 값보다 $\\dfrac{13}{225}$만큼 작아졌다. 이때 처음의 자연수를 구하시오.",
    "44",
  ],
  [
    "126X",
    "농도가 $11\\%$인 소금물 $200$ g에 농도가 $31\\%$인 소금물 $x$ g을 섞으려고 한다. 섞은 소금물의 농도가 $19\\%$ 이상 $23\\%$ 이하가 되도록 할 때, $x$의 값 중 가장 작은 값과 가장 큰 값의 합을 구하시오. (단, $x$는 자연수이다.)",
    "434",
  ],
  [
    "127X",
    "세 직선 $y=3x-5$, $y=-2x+5$, $y=ax+7$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
    "-2",
  ],
  [
    "128X",
    "세 다항식 $A$, $B$, $C$에 대하여 $B=2x^{2}+3x-4$이다. $A-(B-C)$를 계산해야 하는데 괄호를 빠뜨리고 $A-B-C$로 계산하였더니 $2x^{2}+5x+6$이 되었다. 바르게 계산한 식에서 잘못 계산한 식을 뺀 결과가 $10x^{2}-4x+6$일 때, 다항식 $A$를 구하시오.",
    "9x^{2}+6x+5",
  ],
];

/**
 * 음성 — 불변식을 어긴 지면은 **던진다.**
 *
 * 🔴 눈금은 **자기 축을 홀로 갈라야** 한다. 그래서 여기 지면은 **재려는 축 하나만**
 * 어기게 지었다(다른 불변식에도 걸리면 무엇을 재는지 알 수 없다).
 */
const REJECTS: readonly [string, string, string][] = [
  [
    "125X",
    "그 차를 내는 자연수가 없다",
    "어떤 자연수에 순환소수 $0.\\overline{13}$을 곱해야 할 것을, 잘못하여 유한소수 $0.13$을 곱했더니 그 결과가 바르게 계산한 값보다 $\\dfrac{7}{225}$만큼 작아졌다. 이때 처음의 자연수를 구하시오.",
  ],
  [
    "125X",
    "곱한 수가 $1$ 이라 「어떤 자연수」가 무색하다",
    "어떤 자연수에 순환소수 $0.\\overline{13}$을 곱해야 할 것을, 잘못하여 유한소수 $0.13$을 곱했더니 그 결과가 바르게 계산한 값보다 $\\dfrac{13}{9900}$만큼 작아졌다. 이때 처음의 자연수를 구하시오.",
  ],
  [
    "125X",
    "순환소수와 유한소수의 두 자리가 다르다",
    "어떤 자연수에 순환소수 $0.\\overline{13}$을 곱해야 할 것을, 잘못하여 유한소수 $0.17$을 곱했더니 그 결과가 바르게 계산한 값보다 $\\dfrac{13}{225}$만큼 작아졌다. 이때 처음의 자연수를 구하시오.",
  ],
  [
    "125X",
    "발문의 분수가 기약이 아니다 (㉰)",
    "어떤 자연수에 순환소수 $0.\\overline{13}$을 곱해야 할 것을, 잘못하여 유한소수 $0.13$을 곱했더니 그 결과가 바르게 계산한 값보다 $\\dfrac{26}{450}$만큼 작아졌다. 이때 처음의 자연수를 구하시오.",
  ],
  [
    "126X",
    "나중에 섞는 소금물이 묽어 아래 농도에 영영 못 미친다",
    "농도가 $11\\%$인 소금물 $200$ g에 농도가 $13\\%$인 소금물 $x$ g을 섞으려고 한다. 섞은 소금물의 농도가 $19\\%$ 이상 $23\\%$ 이하가 되도록 할 때, $x$의 값 중 가장 작은 값과 가장 큰 값의 합을 구하시오. (단, $x$는 자연수이다.)",
  ],
  [
    "126X",
    "위끝이 없어 창이 한쪽으로 열려 있다",
    "농도가 $11\\%$인 소금물 $200$ g에 농도가 $21\\%$인 소금물 $x$ g을 섞으려고 한다. 섞은 소금물의 농도가 $13\\%$ 이상 $23\\%$ 이하가 되도록 할 때, $x$의 값 중 가장 작은 값과 가장 큰 값의 합을 구하시오. (단, $x$는 자연수이다.)",
  ],
  [
    "126X",
    "창이 $4$보다 좁아 「가장 작은 값과 가장 큰 값」이 무색하다",
    "농도가 $49\\%$인 소금물 $100$ g에 농도가 $3\\%$인 소금물 $x$ g을 섞으려고 한다. 섞은 소금물의 농도가 $45\\%$ 이상 $46\\%$ 이하가 되도록 할 때, $x$의 값 중 가장 작은 값과 가장 큰 값의 합을 구하시오. (단, $x$는 자연수이다.)",
  ],
  [
    "127X",
    "앞 두 직선이 평행이라 교점이 없다",
    "세 직선 $y=3x-5$, $y=3x+5$, $y=ax+7$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
  ],
  [
    "127X",
    "교점이 격자점이 아니라 「한 점에서 만나는」 $a$ 가 정수로 안 나온다",
    "세 직선 $y=3x-5$, $y=-2x+6$, $y=ax+7$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
  ],
  [
    "127X",
    "셋째 직선의 $y$절편이 첫째와 같아 후보가 겹친다",
    "세 직선 $y=3x-5$, $y=-2x+5$, $y=ax-5$가 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
  ],
  [
    "128X",
    "$2C$ 의 계수가 홀수라 $C$ 가 정수가 아니다",
    "세 다항식 $A$, $B$, $C$에 대하여 $B=2x^{2}+3x-4$이다. $A-(B-C)$를 계산해야 하는데 괄호를 빠뜨리고 $A-B-C$로 계산하였더니 $2x^{2}+5x+6$이 되었다. 바르게 계산한 식에서 잘못 계산한 식을 뺀 결과가 $10x^{2}-5x+6$일 때, 다항식 $A$를 구하시오.",
  ],
  [
    "128X",
    "답의 $x^{2}$ 계수가 $2$ 보다 작다 (계약 ⑹.2)",
    "세 다항식 $A$, $B$, $C$에 대하여 $B=2x^{2}+3x-4$이다. $A-(B-C)$를 계산해야 하는데 괄호를 빠뜨리고 $A-B-C$로 계산하였더니 $-4x^{2}+5x+6$이 되었다. 바르게 계산한 식에서 잘못 계산한 식을 뺀 결과가 $6x^{2}-4x+6$일 때, 다항식 $A$를 구하시오.",
  ],
  [
    "128X",
    "$B$ 에서 항이 사라져 지면 모양이 다르다",
    "세 다항식 $A$, $B$, $C$에 대하여 $B=2x^{2}+3x$이다. $A-(B-C)$를 계산해야 하는데 괄호를 빠뜨리고 $A-B-C$로 계산하였더니 $2x^{2}+5x+6$이 되었다. 바르게 계산한 식에서 잘못 계산한 식을 뺀 결과가 $10x^{2}-4x+6$일 때, 다항식 $A$를 구하시오.",
  ],
];

describe("중2 확대 갈래 5차 g — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
    for (const t of ["125X", "126X", "127X", "128X"]) {
      expect(
        CALIBRATION.filter(([k]) => k === t).length,
        `${t} 양성 눈금`,
      ).toBeGreaterThan(0);
      expect(
        REJECTS.filter(([k]) => k === t).length,
        `${t} 음성 눈금`,
      ).toBeGreaterThan(1);
    }
  });
});

describe("중2 확대 갈래 5차 g — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5G.length).toBe(4);
    expect(M2_TOP_5G.map((e) => e.rpmType)).toEqual([
      "125X",
      "126X",
      "127X",
      "128X",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5G) {
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
    for (const e of M2_TOP_5G) {
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

  it("네 유형이 어느 소단원에 붙는지 못 박는다 (브리프가 준 이름 그대로)", () => {
    expect(
      M2_TOP_5G.map((e) => [e.rpmBook, e.rpmType, e.rpmMinor, e.unitSection]),
    ).toEqual([
      ["2-1", "125X", "유리수와 순환소수", "순환소수의 분수 표현"],
      ["2-1", "126X", "일차부등식의 활용", "일차부등식의 활용(농도)"],
      [
        "2-1",
        "127X",
        "일차함수와 일차방정식의 관계",
        "일차함수의 그래프와 연립방정식의 해",
      ],
      ["2-1", "128X", "다항식의 계산", "다항식의 덧셈과 뺄셈"],
    ]);
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    const mine = new Set(M2_TOP_5G.map((e) => e.key));
    for (const e of M2_TOP_5G) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !mine.has(t.key),
      );
      // 🔴 남의 유형이 하나도 없으면 이 검사는 «깨끗»이 아니라 «잴 것이 없다»다.
      expect(others.length, `${e.unitSection} 의 등록 유형`).toBeGreaterThan(0);
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
    const foreign = registeredTypes().filter((e) => !M2_TOP_5G.includes(e));
    for (const e of M2_TOP_5G) {
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
    for (const e of M2_TOP_5G) {
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

describe("중2 확대 갈래 5차 g — 지면과 값", () => {
  for (const e of M2_TOP_5G) {
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
            e.rpmType === "128X"
              ? `$${quadTex([f.x!, f.a1!, f.a0!])}$`
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
        // 🔴 0 은 «깨끗»이 아니라 «못 셈»이다 — 네 유형 모두 판마다 **적어도 하나**를 적는다.
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
        // 🔴 「몇 개를 봤나」를 유형마다 못 박는다 — `127X` 의 0 은 «못 셈»이 아니라
        //    **«잴 것이 없다»** 다(그 해설에는 분수가 한 개도 없다).
        if (e.rpmType === "127X") {
          expect(seen, "`127X` 는 분수를 안 쓴다").toBe(0);
        } else {
          expect(seen, `${e.rpmType} 가 본 분수`).toBeGreaterThanOrEqual(
            SAMPLE,
          );
        }
      });

      it("해설이 같은 등식을 이어 붙여 되풀이하지 않는다 (제품 판정 함수를 그대로 부른다)", () => {
        for (const p of sample())
          for (const line of p.solution.split("\n"))
            expect(repeatedStatement(line), `${e.rpmType}: ${line}`).toBeNull();
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
        const floor = VARIANT_FLOOR[e.rpmType]!;
        const seen = new Set<string>();
        for (let v = 0; v < floor; v += 1) {
          seen.add(
            e.handler(createRng(BASE_SEED + 12345 + v * 0x9e37)).content,
          );
        }
        // 🔴 `variant` 를 **floor 만큼만** 돌려 그 수만큼 서로 다른 발문이 나오는지 본다.
        expect(seen.size, `${e.rpmType} 변형 폭`).toBe(floor);

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
        expect(
          generateMiddleSet(e.key, BASE_SEED, VARIANT_FLOOR[e.rpmType]!).length,
        ).toBe(VARIANT_FLOOR[e.rpmType]);
      });
    });
  }
});

describe("중2 확대 갈래 5차 g — 🔴 해설의 중간값·말을 다른 길로 다시 잰다", () => {
  it("`125X` — 두 변환·통분·나눗셈·확인 줄을 **다섯 다** 맞댄다", () => {
    for (const p of rows(E125)) {
      const [blockT, , gnT, gdT] = grab(RE125, p.content, "125X");
      const b = num(blockT);
      const gn = num(gnT);
      const gd = num(gdT);

      // ⑴ 순환소수 → 분수 걸음: 「$100x-x$」와 「$99x$」가 그 자리에 있어야 한다.
      // 🔴 「$N$이라 하자」 — 뒤 다섯 줄이 전부 $N$ 을 쓴다. 문자를 바꾸면 정의되지
      //    않은 문자로 답하는 글이 되는데, 값이 맞아 어느 자도 못 봤다.
      expect(p.solution, p.content).toContain("구하는 자연수를 $N$이라 하자");
      const conv = lineWith(p.solution, "99x=", "125X");
      expect(conv, p.content).toContain(`$100x=${b}.\\overline{${b}}$`);
      expect(conv, p.content).toContain(`$100x-x=${b}$`);
      expect(conv, p.content).toContain(
        `순환소수 $0.\\overline{${b}}=\\dfrac{${b}}{99}$`,
      );

      // ⑵ 유한소수 걸음 — 굳힘 개념의 낱말이 지워지면 빨개진다.
      const fin = lineWith(p.solution, "유한소수", "125X");
      expect(fin, p.content).toContain(`$0.${b}=\\dfrac{${b}}{100}$`);

      // 🔴 「두 값의 **차**」 — 「합」으로 뒤집으면 분모 $9900$ 짜리 분수가 안 나온다.
      const diffLine = lineWith(p.solution, "바르게 계산한 값은", "125X");
      expect(diffLine, p.content).toContain("두 값의 차는");

      // ⑶ 통분 줄 — 최소공배수와 분자를 **여기서 다시 계산**해 맞댄다.
      const lcmLine = lineWith(p.solution, "최소공배수", "125X");
      expect(lcmLine, p.content).toContain("통분하면");
      expect(lcmLine, p.content).toContain(
        "$99$와 $100$의 최소공배수인 $9900$",
      );
      expect(lcmLine, p.content).toContain(
        `$${b}\\times100-${b}\\times99=${b}$`,
      );
      expect(b * 100 - b * 99, "한 번 곱할 때의 차의 분자").toBe(b);
      expect(lcmLine, p.content).toContain(
        `한 번 곱할 때의 차는 $\\dfrac{${b}}{9900}$`,
      );

      // ⑷ 마무리 — 나눗셈을 곱셈으로 바꾼 줄과 답이 독립 검산과 같다.
      const ans = num(VERIFY["125X"]!(p.content));
      const last = lineWith(p.solution, "따라서 $N=", "125X");
      expect(last, p.content).toContain(
        `\\dfrac{${gn}}{${gd}}\\div\\dfrac{${b}}{9900}=\\dfrac{${gn}}{${gd}}\\times\\dfrac{9900}{${b}}=${ans}$`,
      );
      // 🔴 「$\dfrac{9900}{ab}$」가 기약이려면 $ab$ 가 $9900$ 과 서로소여야 한다.
      expect(gcd2(9900, b), "순환마디는 $9900$ 과 서로소다").toBe(1);

      // ⑸ 확인 줄 — 되짚어 곱한 값이 발문의 차와 같다고 **적혀 있어야** 한다.
      const back = lineWith(p.solution, "실제로", "125X");
      expect(back, p.content).toContain(
        `$\\dfrac{${b}}{9900}\\times${ans}=\\dfrac{${gn}}{${gd}}$`,
      );
      expect(ans * b * gd, "되짚은 곱이 발문의 차와 같다").toBe(gn * 9900);
      // 🔴 결론 낱말 — 등식은 잠겼는데 「같다/다르다」가 안 잠겨 있었다.
      expect(back, p.content).toContain("발문의 차와 같다");
    }
  });

  it("`126X` — 견주기·두 경계·자연수 걸음·합·양끝 밖을 **다섯 다** 맞댄다", () => {
    let stepSeen = 0;
    for (const p of rows(E126)) {
      const g = grab(RE126, p.content, "126X").map(num);
      const [pp, amount, q, r, s] = g as [
        number,
        number,
        number,
        number,
        number,
      ];
      const hits = mixHits(pp, amount, q, r, s);
      const lo = hits[0]!;
      const hi = hits[hits.length - 1]!;

      // ⑴ 소금의 양 — 값을 여기서 다시 계산한다.
      const salt = lineWith(p.solution, "들어 있는 소금의 양", "126X");
      expect(salt, p.content).toContain(
        `$${amount}\\times\\dfrac{${pp}}{100}=${(amount / 100) * pp}$ (g)`,
      );
      expect(salt, p.content).toContain(`$\\dfrac{${q}x}{100}$ (g)`);

      // 🔴 섞은 뒤의 양과 **소금**의 양 — 「소금」을 「물」로, $(M+x)$ 를 $M$ 으로
      //    바꿔도 초록이었다. 둘 다 이 유형이 재려는 마디 그 자체다.
      const mixLine = lineWith(p.solution, "섞은 소금물의 양은", "126X");
      expect(mixLine, p.content).toContain(
        `섞은 소금물의 양은 $(${amount}+x)$ g`,
      );
      expect(mixLine, p.content).toContain("그 속의 소금의 양은");

      // ⑵ 🔴 양변에 $(M+x)$ 를 곱하는 **걸음**이 근거와 함께 서 있다(D-116 ⑹).
      const pos = lineWith(p.solution, "부등호의 방향은", "126X");
      expect(pos, p.content).toContain(`$x$는 자연수이므로 $${amount}+x>0$`);

      // ⑶ 🔴 견주기 줄 — 「어느 조건이 어느 끝인가」가 씨앗마다 뒤집힌다.
      const cmp = lineWith(p.solution, "커질수록", "126X");
      if (q > pp) {
        expect(cmp, p.content).toContain("높으므로");
        // 🔴 한 문장 안의 앞뒤 모순 — 「높으므로 … 낮아진다」가 그대로 통과했다.
        expect(cmp, p.content).toContain("농도도 높아진다");
        expect(cmp, p.content).toContain(
          `농도가 $${r}\\%$ 이상이라는 조건에서 $x$의 최솟값이, $${s}\\%$ 이하라는 조건에서 $x$의 최댓값이 나온다`,
        );
      } else {
        expect(cmp, p.content).toContain("낮으므로");
        expect(cmp, p.content).toContain("농도는 낮아진다");
        expect(cmp, p.content).toContain(
          `농도가 $${r}\\%$ 이상이라는 조건에서 $x$의 최댓값이, $${s}\\%$ 이하라는 조건에서 $x$의 최솟값이 나온다`,
        );
      }

      // ⑷ 두 경계 줄 — 정리한 식과 「자연수」 걸음을 **하나씩 다시 센다**(㉯).
      const ge = lineWith(p.solution, `농도가 $${r}\\%$ 이상이려면`, "126X");
      expect(ge, p.content).toContain(
        `$${pp * amount}+${q}x\\ge${r * amount}+${r}x$`,
      );
      const le = lineWith(p.solution, `농도가 $${s}\\%$ 이하이려면`, "126X");
      expect(le, p.content).toContain(
        `$${pp * amount}+${q}x\\le${s * amount}+${s}x$`,
      );
      let withFraction = 0;
      for (const [line, want] of [
        [ge, q > pp ? lo : hi],
        [le, q > pp ? hi : lo],
      ] as const) {
        const step = boundStepFault(line, want);
        expect(step.fault, `${p.content}\n${line}`).toBeNull();
        stepSeen += step.seen;
        if (line.includes("$x$는 자연수이므로")) withFraction += 1;
      }
      // 🔴 ㉯ 의 「자연수」 걸음이 **적어도 한 줄에는** 실제로 선다.
      //    두 경계가 다 나누어떨어지면 그 걸음이 지면에서 통째로 사라져,
      //    `boundStepFault` 의 «잴 것이 없다» 갈래만 남는다(그러면 이 축이 침묵한다).
      expect(withFraction, `${p.content}\n자연수 걸음이 선 줄`).toBeGreaterThan(
        0,
      );

      // ⑸ 합 줄 — 독립 검산의 두 끝과 맞댄다.
      const tail = lineWith(p.solution, "따라서 가능한", "126X");
      expect(tail, p.content).toContain(
        `$${lo}$ 이상 $${hi}$ 이하의 자연수이므로, 가장 작은 값은 $${lo}$, 가장 큰 값은 $${hi}$이고 그 합은 $${lo}+${hi}=${lo + hi}$`,
      );
      expect(plainAnswer(p.answer), p.content).toBe(String(lo + hi));

      // ⑹ 양끝 밖 — 「더 넓힐 수 없다」는 주장을 **대입해** 확인한다.
      const edge = lineWith(p.solution, "더 넓힐 수 없다", "126X");
      const below = q > pp ? r : s;
      const above = q > pp ? s : r;
      const word =
        q > pp ? ["낮아지고", "높아지므로"] : ["높아지고", "낮아지므로"];
      expect(edge, p.content).toContain(
        `$x=${lo - 1}$이면 농도가 $${below}\\%$보다 ${word[0]}`,
      );
      expect(edge, p.content).toContain(
        `$x=${hi + 1}$이면 농도가 $${above}\\%$보다 ${word[1]}`,
      );
      expect(hits.includes(lo - 1), "아래끝 바로 밖은 조건을 어긴다").toBe(
        false,
      );
      expect(hits.includes(hi + 1), "위끝 바로 밖은 조건을 어긴다").toBe(false);
    }
    // 🔴 「몇 걸음을 실제로 봤나」 — 0 이면 «깨끗»이 아니라 «못 셈»이다.
    expect(stepSeen, "`126X` 가 다시 센 경계 걸음").toBeGreaterThanOrEqual(
      SAMPLE * 2,
    );
  });

  it("`127X` — 교점·세 경우·평행 근거·합·겹침 없음을 **다섯 다** 맞댄다", () => {
    for (const p of rows(E127)) {
      const g = grab(RE127, p.content, "127X").map(num);
      const [m1, n1, m2, n2, n3] = g as [
        number,
        number,
        number,
        number,
        number,
      ];
      const fails = noTriangleByGeometry(m1, n1, m2, n2, n3);
      const sum = fails.reduce((t, v) => t + v, 0);
      // 교점을 **여기서** 다시 구한다 (정수임을 확인한다).
      const P = meetPoint(m1, n1, m2, n2)!;
      // ⚠️ `%` 는 $-0$ 을 낼 수 있어 `toBe(0)` 이 거짓 빨강을 만든다 — 참·거짓으로 묻는다.
      expect(P[0] % P[2] === 0, p.content).toBe(true);
      expect(P[1] % P[2] === 0, p.content).toBe(true);
      // ⚠️ `|| 0` 은 $-0$ 을 $0$ 으로 되돌린다. 안 하면 「$+0$ 이 $-0$ 이 아니다」라는
      //    거짓 빨강이 난다(교점이 $x$축 위에 있는 판에서 실제로 났다).
      const px = P[0] / P[2] || 0;
      const py = P[1] / P[2] || 0;

      // 🔴 첫 줄의 근거 — 기울기가 「같으므로」로 뒤집히면 교점을 하나 구하는
      //    바로 다음 줄이 무너지는데 초록이었다.
      const cross = lineWith(p.solution, "기울기가 서로 다르므로", "127X");
      expect(cross, p.content).toContain("한 점에서 만난다");

      // ⑴ 교점 줄 — 정리한 식과 대입 값을 다시 계산해 맞댄다.
      const meet = lineWith(p.solution, "연립한 해이므로", "127X");
      expect(meet, p.content).toContain(
        `$${m1 - m2}x=${n2 - n1}$, 즉 $x=${px}$`,
      );
      expect((m1 - m2) * px, p.content).toBe(n2 - n1);
      expect(meet, p.content).toContain(
        `$y=${m1}\\times${timesArg(px)}${n1 < 0 ? `-${-n1}` : `+${n1}`}=${py}$`,
      );
      expect(m1 * px + n1, p.content).toBe(py);
      expect(meet, p.content).toContain(`교점은 $(${px},\\ ${py})$`);

      // ⑵ 세 경우를 **다 세운다** — 낱말이 지워지면 빨개진다.
      const cases = lineWith(p.solution, "이렇게 셋뿐이다", "127X");
      // 🔴 이 줄은 「이루지 **않는**」이 뒤집혀도 초록이었다 — 줄을 찾는 열쇠가
      // 「셋뿐이다」라 낱말이 판정에 안 들어갔다. 뒤집으면 명제가 거짓이 된다.
      expect(cases, p.content).toContain("삼각형을 이루지 않는 경우는");
      expect(cases, p.content).toContain("첫째 직선과 평행한 경우");
      expect(cases, p.content).toContain("둘째 직선과 평행한 경우");
      expect(cases, p.content).toContain("세 직선이 한 점에서 만나는 경우");

      // ⑶ ㉠㉡ — 평행 근거와 「$y$절편이 서로 다르므로」(㉴ 의 자리).
      const par1 = lineWith(p.solution, "㉠ 평행하려면", "127X");
      expect(par1, p.content).toContain("기울기가 같아야 하므로");
      expect(par1, p.content).toContain(`$a=${m1}$`);
      expect(par1, p.content).toContain(
        "서로 다르므로 두 직선은 만나지 않는다",
      );
      expect(n3, "㉠ 이 성립하려면 $y$절편이 달라야 한다").not.toBe(n1);
      const par2 = lineWith(p.solution, "㉡ 같은 방법으로", "127X");
      expect(par2, p.content).toContain(`$a=${m2}$`);
      // 🔴 ㉠(`par1`)에만 걸려 있어, ㉡ 의 「서로 **다르므로**」를 「같으므로」로
      // 바꾸면 400판 전량이 거짓을 찍는데 102 시험이 다 초록이었다.
      // 절편이 같으면 평행이 아니라 **겹침**이다.
      expect(par2, p.content).toContain(
        "서로 다르므로 두 직선은 만나지 않는다",
      );
      expect(n3, "㉡ 이 성립하려면 $y$절편이 달라야 한다").not.toBe(n2);

      // ⑷ ㉢ — 교점을 지나는 조건을 다시 풀어 맞댄다.
      const thr = lineWith(p.solution, "㉢ 셋째 직선이", "127X");
      const a3 = (py - n3) / px;
      expect(Number.isInteger(a3), p.content).toBe(true);
      expect(thr, p.content).toContain(
        `$${py}=a\\times${timesArg(px)}${n3 < 0 ? `-${-n3}` : `+${n3}`}$`,
      );
      expect(thr, p.content).toContain(`$${px}a=${py - n3}$, 즉 $a=${a3}$`);

      // ⑸ 합 줄 — 세 값이 **서로 다르고** 그 합이 독립 검산과 같다.
      const sorted = [...new Set([m1, m2, a3])].sort((u, v) => u - v);
      expect(sorted.length, p.content).toBe(3);
      expect(sorted, p.content).toEqual(fails.slice().sort((u, v) => u - v));
      const tail = lineWith(p.solution, "따라서 구하는", "127X");
      expect(tail, p.content).toContain(
        sorted.map((v) => `$${v}$`).join(", ") + "의 셋이고",
      );
      const chain = sorted
        .map((v, i) => (i === 0 ? `${v}` : v < 0 ? `${v}` : `+${v}`))
        .join("");
      expect(tail, p.content).toContain(`$${chain}=${sum}$`);
      expect(plainAnswer(p.answer), p.content).toBe(String(sum));
      const last = lineWith(p.solution, "세 값이 서로 다르므로", "127X");
      expect(last, p.content).toContain("세 경우가 겹치지 않고");
      expect(last, p.content).toContain("세 직선이 삼각형을 이룬다");
    }
  });

  it("`128X` — 괄호·두 배·$C$·되짚기·동류항 세 줄을 **다섯 다** 맞댄다", () => {
    for (const p of rows(E128)) {
      const g = grab(RE128, p.content, "128X").map(num);
      const B: Quad = [g[0]!, g[1]!, g[2]!];
      const W: Quad = [g[3]!, g[4]!, g[5]!];
      const G: Quad = [g[6]!, g[7]!, g[8]!];
      const C: Quad = [G[0] / 2, G[1] / 2, G[2] / 2];
      const A: Quad = [
        W[0] + B[0] + C[0],
        W[1] + B[1] + C[1],
        W[2] + B[2] + C[2],
      ];

      // ⑴ 괄호를 푸는 규칙 — 낱말이 굳힘 개념이다.
      const open = lineWith(p.solution, "괄호를 풀면", "128X");
      expect(open, p.content).toContain("$A-(B-C)=A-B+C$");
      expect(open, p.content).toContain("잘못 계산한 식은 $A-B-C$이다");
      // ⑵ 「두 배」 — 이 줄을 「$C$」로 바꾸면 답이 통째로 달라진다.
      const twice = lineWith(p.solution, "두 배", "128X");
      expect(twice, p.content).toContain("$-C$의 부호가 바뀌어 $+C$가 되므로");
      expect(twice, p.content).toContain("$(A-B+C)-(A-B-C)=2C$");
      // ⑶ $C$ 를 실제로 적고, 그 값이 독립 계산과 같다.
      const cLine = lineWith(p.solution, "$C=\\dfrac{1}{2}", "128X");
      expect(cLine, p.content).toContain(`$2C=${quadTex(G)}$`);
      expect(cLine, p.content).toContain(
        `$C=\\dfrac{1}{2}\\times(${quadTex(G)})=${quadTex(C)}$`,
      );
      // ⑷ 되짚기 — $A=(A-B-C)+B+C$.
      const backLine = lineWith(p.solution, "잘못 계산한 식이", "128X");
      expect(backLine, p.content).toContain(
        `$A-B-C=${quadTex(W)}$이므로 $A=${quadTex(W)}+B+C$`,
      );
      const sub = lineWith(p.solution, "즉 $A=(", "128X");
      expect(sub, p.content).toContain(
        `$A=(${quadTex(W)})+(${quadTex(B)})+(${quadTex(C)})$`,
      );
      // ⑸ 동류항 세 줄 — 계수를 하나씩 다시 더한다.
      const like = lineWith(p.solution, "동류항끼리 모으면", "128X");
      const chain = (x: number, y: number, z: number): string =>
        `${x}${y < 0 ? `${y}` : `+${y}`}${z < 0 ? `${z}` : `+${z}`}`;
      expect(like, p.content).toContain(
        `$x^{2}$의 계수는 $${chain(W[0], B[0], C[0])}=${A[0]}$`,
      );
      expect(like, p.content).toContain(
        `$x$의 계수는 $${chain(W[1], B[1], C[1])}=${A[1]}$`,
      );
      expect(like, p.content).toContain(
        `상수항은 $${chain(W[2], B[2], C[2])}=${A[2]}$`,
      );
      expect(plainAnswer(p.answer), p.content).toBe(quadTex(A));
      // ⑹ 확인 줄
      const check = lineWith(p.solution, "실제로 $A-B-C$", "128X");
      expect(check, p.content).toContain(`$${quadTex(W)}$`);
      expect(check, p.content).toContain("되어 잘못 계산한 식과 같다");
    }
  });
});

/**
 * 🔴 「이 수는 어디서 왔나」 — **발문의 수와 독립 검산이 실제로 낳은 값**만 모은다.
 *
 * ⚠️ `facts` 를 **안 쓴다.** 생성기가 적어 준 값을 그대로 허락하면 이 자는
 *    「생성기가 쓴 수가 지면에 있다」는 **동어반복**이 된다(2026-08-18).
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
  add(1);
  add(2);

  if (type === "125X") {
    const [blockT, , gnT, gdT] = grab(RE125, content, "125X");
    const b = num(blockT);
    add(99);
    add(100);
    add(9900);
    add(b * 100);
    add(b * 99);
    add(num(VERIFY["125X"]!(content)));
    add(num(gnT));
    add(num(gdT));
  } else if (type === "126X") {
    const g = grab(RE126, content, "126X").map(num);
    const [p, amount, q, r, s] = g as [number, number, number, number, number];
    add((amount / 100) * p);
    add(p * amount);
    add(r * amount);
    add(s * amount);
    add(100);
    const hits = mixHits(p, amount, q, r, s);
    const lo = hits[0]!;
    const hi = hits[hits.length - 1]!;
    for (const v of [lo, hi, lo - 1, hi + 1, lo + hi]) add(v);
    // 정리한 부등식의 계수·상수와 그것을 약분한 값들 (경계 줄이 적는 수)
    for (const [c0, k0] of [
      [Math.abs(q - r), Math.abs((r - p) * amount)],
      [Math.abs(q - s), Math.abs((s - p) * amount)],
    ] as const) {
      add(c0);
      add(k0);
      const gg = gcd2(c0, k0) || 1;
      add(gg);
      add(c0 / gg);
      add(k0 / gg);
    }
  } else if (type === "127X") {
    const g = grab(RE127, content, "127X").map(num);
    const [m1, n1, m2, n2, n3] = g as [number, number, number, number, number];
    const P = meetPoint(m1, n1, m2, n2)!;
    const px = P[0] / P[2];
    const py = P[1] / P[2];
    add(px);
    add(py);
    add(m1 - m2);
    add(n2 - n1);
    add(py - n3);
    add((py - n3) / px);
    add(m1 + m2 + (py - n3) / px);
  } else {
    const g = grab(RE128, content, "128X").map(num);
    for (let k = 0; k < 3; k += 1) {
      const b = g[k]!;
      const w = g[3 + k]!;
      const gap = g[6 + k]!;
      const c = gap / 2;
      add(c);
      add(w + b + c);
    }
  }
  return out;
}

describe("중2 확대 갈래 5차 g — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  for (const e of M2_TOP_5G) {
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

describe("중2 확대 갈래 5차 g — ㉠ 찍기로 맞을 수 있는가 (치환 대조와 함께)", () => {
  /** 발문에 **찍히는** 수 — `facts` 가 아니라 `content` 에서 읽는다. */
  function printedOf(type: string, content: string): number[] {
    if (type === "125X") {
      const [b, , gn, gd] = grab(RE125, content, "125X").map(num);
      return [b!, gn!, gd!];
    }
    if (type === "126X") return grab(RE126, content, "126X").map(num);
    if (type === "127X") return grab(RE127, content, "127X").map(num);
    return grab(RE128, content, "128X").map(num);
  }

  it("🔴 제 답이 «우연 수준»보다 낮다 — 같은 자루에 **다른 판의 답**을 대어 견준다", () => {
    const report: string[] = [];
    for (const e of M2_TOP_5G) {
      const bags: number[][] = [];
      const answers: number[] = [];
      for (const p of rows(e, WIDE)) {
        bags.push(printedOf(e.rpmType, p.content));
        answers.push(p.facts.x!);
      }
      let self = 0;
      let control = 0;
      for (let i = 0; i < WIDE; i += 1) {
        const bag = pageShortcutValues(bags[i]!);
        if (bag.has(answers[i]!)) self += 1;
        // 대조군 — 같은 자루에 **다른 판의** 답을 댄다.
        if (bag.has(answers[(i * 37 + 11) % WIDE]!)) control += 1;
      }
      const selfPct = (self / WIDE) * 100;
      const ctrlPct = (control / WIDE) * 100;
      report.push(
        `${e.rpmType} 제 답 ${selfPct.toFixed(2)}% · 대조 ${ctrlPct.toFixed(2)}%`,
      );
      // 🔴 「0이어야 한다」가 아니다 — 자루가 넉넉하면 우연히도 걸린다.
      //    물어야 할 것은 **우연 수준을 넘는가**다.
      expect(selfPct, `${e.rpmType} 지름길\n${report.join("\n")}`).toBeLessThan(
        ctrlPct + 2,
      );
    }
    // 🔴 이 자가 **`128X` 에서는 눈이 멀었다**(⑷ 2) — 그 사실을 수치로 못 박는다.
    const blind = report.find((r) => r.startsWith("128X"))!;
    expect(blind, "`128X` 는 자루가 넓어 대조군도 90%를 넘는다").toMatch(
      /대조 9\d\.\d\d%/,
    );
  });

  it("🔴 `128X` — 발문 다항식의 **뻔한 조합**이 답과 늘 다르다 (낱값 자가 못 보는 축)", () => {
    for (const p of rows(E128, 400)) {
      const g = grab(RE128, p.content, "128X").map(num);
      const B: Quad = [g[0]!, g[1]!, g[2]!];
      const W: Quad = [g[3]!, g[4]!, g[5]!];
      const G: Quad = [g[6]!, g[7]!, g[8]!];
      const C: Quad = [G[0] / 2, G[1] / 2, G[2] / 2];
      const A = plainAnswer(p.answer);
      const add = (u: Quad, v: Quad): Quad => [
        u[0] + v[0],
        u[1] + v[1],
        u[2] + v[2],
      ];
      const sub = (u: Quad, v: Quad): Quad => [
        u[0] - v[0],
        u[1] - v[1],
        u[2] - v[2],
      ];
      const combos: Quad[] = [
        B,
        W,
        G,
        C,
        add(W, B),
        add(W, G),
        add(B, G),
        add(W, C),
        add(B, C),
        add(add(W, B), G),
        sub(W, B),
        sub(B, W),
        sub(G, W),
        sub(G, B),
        sub(G, C),
      ];
      for (const c of combos)
        expect(quadTex(c), `${p.content} — 뻔한 조합이 답과 같다`).not.toBe(A);
    }
  });
});

describe("중2 확대 갈래 5차 g — ㉡ 굳힘을 지우면 답이 바뀌는가 (㉷ 주석의 단언을 문다)", () => {
  it("`125X` — 「유한소수를 곱한 값을 뺀다」를 빠뜨리면 자연수가 안 나온다", () => {
    for (const p of rows(E125, 120)) {
      const f = p.facts;
      expect(multiplierFromGap(f.block!, f.gapNum!, f.gapDen!), p.content).toBe(
        f.x,
      );
      // `subtractFinite=false` 는 분모가 $99$ 라 답이 $\frac1{100}$ 배가 된다.
      expect(
        multiplierFromGap(f.block!, f.gapNum!, f.gapDen!, false),
        p.content,
      ).not.toBe(f.x);
    }
  });

  it("`126X` — 「섞으면 소금물이 늘어난다」를 빠뜨리면 창이 달라진다", () => {
    let differs = 0;
    let vanishes = 0;
    for (const p of rows(E126, 120)) {
      const f = p.facts;
      const good = mixWindow(f.p!, f.amount!, f.q!, f.r!, f.s!)!;
      expect([good.lo, good.hi], p.content).toEqual([f.lo, f.hi]);
      const bad = mixWindow(f.p!, f.amount!, f.q!, f.r!, f.s!, false);
      if (bad === null) vanishes += 1;
      else {
        expect([bad.lo, bad.hi], p.content).not.toEqual([f.lo, f.hi]);
        differs += 1;
      }
    }
    // 🔴 두 갈래가 **둘 다** 실제로 나오는지 센다 — 한쪽만 나오면 이 검사가 반쪽이다.
    expect(differs, "창이 달라지는 판").toBeGreaterThan(0);
    expect(vanishes, "창이 아예 안 닫히는 판").toBeGreaterThan(0);
  });

  it("`127X` — 「한 점에서 만나는 경우」를 빠뜨리면 합이 달라진다", () => {
    for (const p of rows(E127, 120)) {
      const f = p.facts;
      const good = noTriangleValues(f.m1!, f.n1!, f.m2!, f.n2!, f.n3!)!;
      expect(
        good.reduce((t, v) => t + v, 0),
        p.content,
      ).toBe(f.x);
      expect(good.length, p.content).toBe(3);
      const bad = noTriangleValues(f.m1!, f.n1!, f.m2!, f.n2!, f.n3!, false)!;
      expect(bad.length, p.content).toBe(2);
      expect(
        bad.reduce((t, v) => t + v, 0),
        p.content,
      ).not.toBe(f.x);
    }
  });

  it("`128X` — 차가 $2C$ 가 아니라 $C$ 라고 보면 $A$ 가 통째로 달라진다", () => {
    for (const p of rows(E128, 120)) {
      const f = p.facts;
      const wrong: Quad = [f.w2!, f.w1!, f.w0!];
      const B: Quad = [f.b2!, f.b1!, f.b0!];
      const gap: Quad = [2 * f.c2!, 2 * f.c1!, 2 * f.c0!];
      const good = recoverA(wrong, B, gap)!;
      expect(good, p.content).toEqual([f.x, f.a1, f.a0]);
      expect(recoverA(wrong, B, gap, false), p.content).not.toEqual(good);
    }
  });
});

describe("중2 확대 갈래 5차 g — 굳힘 함수 (손 실측)", () => {
  it("`multiplierFromGap` 은 «유한소수를 뺀다» 걸음을 실제로 쓴다", () => {
    // $\dfrac{13}{9900}\times44=\dfrac{13}{225}$
    expect(multiplierFromGap(13, 13, 225)).toBe(44);
    expect(multiplierFromGap(13, 13, 225, false)).toBeNull();
    expect(multiplierFromGap(13, 7, 225)).toBeNull(); // 정수가 아니다
    expect(multiplierFromGap(13, 13, 9900)).toBeNull(); // $N=1$ 은 안 받는다
    expect(multiplierFromGap(0, 13, 225)).toBeNull();
    expect(multiplierFromGap(13, 0, 225)).toBeNull();
  });

  it("`REPEAT_BLOCKS` 는 $9900$ 과 서로소인 두 자리 수만 담는다", () => {
    expect(REPEAT_BLOCKS.length).toBe(22);
    for (const b of REPEAT_BLOCKS) {
      expect(b, `${b} 는 두 자리`).toBeGreaterThan(9);
      expect(b).toBeLessThan(100);
      expect(gcd2(b, 9900), `${b} 와 $9900$`).toBe(1);
    }
    // 🔴 빠진 것이 없는지 **반대쪽**으로도 센다 — 손 목록은 샌다.
    const all: number[] = [];
    for (let b = 10; b < 100; b += 1) if (gcd2(b, 9900) === 1) all.push(b);
    expect([...REPEAT_BLOCKS].sort((a, b) => a - b)).toEqual(all);
  });

  it("`CONCENTRATIONS`·`AMOUNTS` 는 지면의 분수를 기약으로 만든다", () => {
    for (const c of CONCENTRATIONS) expect(gcd2(c, 100), `${c}/100`).toBe(1);
    for (const a of AMOUNTS) expect(a % 100, `${a}`).toBe(0);
    expect(CONCENTRATIONS.length).toBeGreaterThan(15);
    expect(AMOUNTS.length).toBe(5);
  });

  it("`mixBound` 는 계수가 음수일 때 부등호를 뒤집는다", () => {
    // $11\%$ 소금물 $200$ g 에 $31\%$ 를 섞어 $19\%$ 이상 — 계수가 양수다.
    const up = mixBound(11, 200, 31, 19, "ge")!;
    expect(up.dir).toBe("ge");
    expect(up.bound).toBe(134);
    // 진한 쪽에 묽은 쪽을 섞으면 같은 「이상」이 **위끝**을 준다.
    const down = mixBound(49, 100, 3, 45, "ge")!;
    expect(down.dir).toBe("le");
    expect(down.bound).toBe(9);
    // 「섞으면 양이 는다」를 빠뜨리면 계수가 달라진다.
    expect(mixBound(11, 200, 31, 19, "ge", false)!.bound).not.toBe(134);
    // 상수가 $0$ 이하이면 아무것도 안 자른다.
    expect(mixBound(19, 200, 31, 19, "ge")).toBeNull();
  });

  it("`mixWindow` 는 두 조건을 **견주어** 두 끝을 낸다", () => {
    const w = mixWindow(11, 200, 31, 19, 23)!;
    expect([w.lo, w.hi]).toEqual([134, 300]);
    expect([w.loFrom, w.hiFrom]).toEqual(["r", "s"]);
    const d = mixWindow(49, 100, 3, 45, 46)!;
    expect([d.lo, d.hi]).toEqual([7, 9]);
    // 묽은 쪽을 섞으면 「이상」이 위끝을 준다 — 그래서 아래끝은 $s$ 조건에서 온다.
    expect([d.loFrom, d.hiFrom]).toEqual(["s", "r"]);
    // 창이 한쪽으로만 열리면 `null`.
    expect(mixWindow(11, 200, 21, 13, 23)).toBeNull();
  });

  it("`noTriangleValues` 는 세 경우를 **다 세우고** 겹치는 것을 지운다", () => {
    // $y=3x-5$, $y=-2x+5$ 의 교점 $(2,\ 1)$, 셋째 $y=ax+7$ → $a=-3$.
    expect(noTriangleValues(3, -5, -2, 5, 7)).toEqual([-3, -2, 3]);
    expect(noTriangleValues(3, -5, -2, 5, 7, false)).toEqual([-2, 3]);
    // $y$절편이 같으면 그쪽은 «평행»이 아니라 «겹침»이라 안 센다.
    expect(noTriangleValues(3, -5, -2, 5, -5)).toEqual([-2, 3]);
    // 앞 두 직선이 평행이면 `null`.
    expect(noTriangleValues(3, -5, 3, 5, 7)).toBeNull();
    // 교점이 격자점이 아니면 `null`.
    expect(noTriangleValues(3, -5, -2, 6, 7)).toBeNull();
  });

  it("`recoverA` 는 차를 **반**으로 나눈다", () => {
    const wrong: Quad = [2, 5, 6];
    const B: Quad = [2, 3, -4];
    const gap: Quad = [10, -4, 6];
    expect(recoverA(wrong, B, gap)).toEqual([9, 6, 5]);
    expect(recoverA(wrong, B, gap, false)).toEqual([14, 4, 8]);
    expect(recoverA(wrong, B, [10, -5, 6])).toBeNull(); // 홀수라 정수가 아니다
  });

  it("`reduceFraction`·`timesArg`·`shortcutHits` (지면 규약)", () => {
    expect(reduceFraction(-8, -4)).toEqual([2, 1]);
    expect(reduceFraction(6, -8)).toEqual([-3, 4]);
    expect(timesArg(3)).toBe("3");
    expect(timesArg(-3)).toBe("(-3)");
    expect(timesArg(0)).toBe("0");
    expect(shortcutHits([6, 7], 42)).toBe(true);
    expect(shortcutHits([6, 7], 13)).toBe(true);
    expect(shortcutHits([6, 7], 43)).toBe(false);
  });
});

/**
 * 🔴 **「자연수」 걸음을 건너뛰었나** — 경계 줄 하나를 통째로 다시 센다(㉯).
 *
 * 정리한 부등식 `$cx\ge K$` 에서 자연수 경계로 뛸 때, 해설은 ⑴ 약분한 계수와 상수를
 * 적고 ⑵ 계수가 $1$ 이 아니면 **분수 꼴**을 적은 뒤 ⑶ 「$x$는 자연수이므로」라는
 * 근거와 함께 경계를 적어야 한다. 값은 **나눗셈 없이 곱셈으로만** 되센다.
 *
 * `seen` 은 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다.
 */
function boundStepFault(
  line: string,
  want: number,
): { fault: string | null; seen: number } {
  const claims = [...line.matchAll(/\$(\d+)x(\\ge|\\le)(\d+)\$/g)];
  const plain = [...line.matchAll(/\$x(\\ge|\\le)(\d+)\$/g)];
  const seen = claims.length + plain.length;
  if (claims.length === 0) return { fault: "정리한 부등식이 없다", seen };

  const last = claims[claims.length - 1]!;
  const c = Number(last[1]);
  const dir = last[2]!;
  const K = Number(last[3]);
  // ⑴ 약분 전 식이 있으면 **같은 부등식**이어야 한다 (곱셈으로만 견준다).
  const first = claims[0]!;
  if (first[2] !== dir) return { fault: "도중에 부등호 방향이 바뀌었다", seen };
  if (Number(first[1]) * K !== c * Number(first[3]))
    return {
      fault: `약분 전 ${first[1]}x…${first[3]} 과 뒤가 다른 부등식이다`,
      seen,
    };

  const g = gcd2(c, K) || 1;
  const cr = c / g;
  const Kr = K / g;
  const end = plain[plain.length - 1];
  if (end === undefined) return { fault: "자연수 경계를 안 적었다", seen };
  const bound = Number(end[2]);

  if (cr === 1) {
    // 🔴 계수가 $1$ 로 약분되면 분수 걸음이 **없다** — 그때 이 축은 «깨끗»이 아니라
    //    «잴 것이 없다»다. 나눈 값이 곧 경계여야 한다.
    if (bound !== Kr)
      return { fault: `경계를 ${bound} 로 적었는데 나눈 값은 ${Kr}`, seen };
    if (bound !== want)
      return { fault: `경계를 ${bound} 로 적었는데 참은 ${want}`, seen };
    return { fault: null, seen };
  }
  // 약분한 계수가 $2$ 이상 — 마지막 주장이 **이미 약분돼** 있어야 한다.
  if (c !== cr)
    return { fault: `마지막 주장 ${c}x${dir}${K} 이 약분되지 않았다`, seen };
  if (!line.includes(`\\dfrac{${K}}{${c}}`))
    return { fault: "분수 꼴을 안 적고 경계로 뛰었다", seen };
  if (!line.includes("$x$는 자연수이므로"))
    return { fault: "「자연수이므로」 근거 없이 경계로 뛰었다", seen };
  // 🔴 경계를 **곱셈으로만** 되센다 — 나눗셈도 올림·내림도 안 쓴다.
  if (dir === "\\ge") {
    if (!(c * bound >= K && c * (bound - 1) < K))
      return {
        fault: `$${c}x\\ge${K}$ 의 자연수 경계가 ${bound} 가 아니다`,
        seen,
      };
  } else if (!(c * bound <= K && c * (bound + 1) > K))
    return {
      fault: `$${c}x\\le${K}$ 의 자연수 경계가 ${bound} 가 아니다`,
      seen,
    };
  if (bound !== want)
    return { fault: `경계를 ${bound} 로 적었는데 참은 ${want}`, seen };
  return { fault: null, seen };
}

describe("중2 확대 갈래 5차 g — 검사기 자신의 눈금", () => {
  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("$83\\times100-83\\times99=83$이다.")).toEqual([]);
    expect(arithmeticFaults("$83\\times100-83\\times99=84$이다.").length).toBe(
      1,
    );
    expect(arithmeticFaults("$215+420=635$")).toEqual([]);
    expect(arithmeticFaults("$215+420=634$").length).toBe(1);
    expect(arithmeticClaims("$2+3=5$, $4\\times9=36$")).toBe(2);
  });

  it("`unreducedFractions` 는 약분 안 한 분수와 **분모 $1$** 을 잡는다", () => {
    expect(unreducedFractions("$\\dfrac{13}{225}$")).toEqual([]);
    expect(unreducedFractions("$\\dfrac{26}{450}$")).toEqual(["26/450"]);
    expect(unreducedFractions("$\\dfrac{24}{1}$")).toEqual(["24/1"]);
    expect(fractionCount("$\\dfrac{1}{2}$와 $\\frac{3}{4}$")).toBe(2);
  });

  it("`euroRoMismatches` 는 ㄹ 받침을 가른다 (「$3$로」는 틀렸다)", () => {
    expect(euroRoMismatches("$7$로 나누면")).toEqual([]);
    expect(euroRoMismatches("$3$으로 나누면")).toEqual([]);
    expect(euroRoMismatches("$9900$으로 통분하면")).toEqual([]);
    expect(euroRoMismatches("$3$로 서로 다르므로").length).toBe(1);
    expect(euroRoMismatches("$7$으로 나누면").length).toBe(1);
  });

  it("🔴 `boundStepFault` — 「자연수」 걸음을 건너뛰거나 값이 틀리면 잡는다", () => {
    const good =
      "농도가 $27\\%$ 이상이려면 $5100+41x\\ge8100+27x$이므로 $14x\\ge3000$이고, 양변을 $2$로 나누면 $7x\\ge1500$이다. 즉 $x\\ge\\dfrac{1500}{7}$이고 $x$는 자연수이므로 $x\\ge215$이다.";
    expect(boundStepFault(good, 215).fault).toBeNull();
    expect(boundStepFault(good, 215).seen).toBe(3);
    // 경계 값이 틀리면 잡는다.
    expect(boundStepFault(good, 216).fault).toContain("참은 216");
    // 「자연수이므로」를 지우면 잡는다.
    expect(
      boundStepFault(good.replace("이고 $x$는 자연수이므로", "이고"), 215)
        .fault,
    ).toContain("자연수이므로");
    // 분수 꼴을 안 적고 뛰면 잡는다.
    expect(
      boundStepFault(good.replace("즉 $x\\ge\\dfrac{1500}{7}$이고 ", ""), 215)
        .fault,
    ).toContain("분수 꼴");
    // 올림을 내림으로 바꾼 값은 곱셈 되세기가 잡는다.
    expect(
      boundStepFault(good.replace("x\\ge215$이다", "x\\ge214$이다"), 214).fault,
    ).toContain("자연수 경계가 214 가 아니다");
    // 계수가 $1$ 로 약분되는 판 — 분수 걸음이 없어도 통과한다(«잴 것이 없다»).
    const one =
      "농도가 $31\\%$ 이하이려면 $5100+41x\\le9300+31x$이므로 $10x\\le4200$이고, 양변을 $10$으로 나누면 $x\\le420$이다.";
    expect(boundStepFault(one, 420).fault).toBeNull();
    expect(boundStepFault(one, 421).fault).toContain("참은 421");
    // 아무 부등식도 없으면 «못 셈»을 결함으로 낸다.
    expect(boundStepFault("따라서 $x$는 자연수이다.", 5).fault).toBe(
      "정리한 부등식이 없다",
    );
  });

  it("`meetPoint`·`samePoint` 는 나눗셈 없이 교점을 견준다", () => {
    expect(meetPoint(3, -5, -2, 5)).toEqual([10, 5, 5]);
    expect(meetPoint(3, -5, 3, 5)).toBeNull();
    expect(samePoint([10, 5, 5], [2, 1, 1])).toBe(true);
    expect(samePoint([10, 5, 5], [2, 2, 1])).toBe(false);
  });

  it("`quadTex` 는 제품 `poly` 와 같은 꼴을 **다른 코드**로 짓는다", () => {
    expect(quadTex([9, 6, 5])).toBe("9x^{2}+6x+5");
    expect(quadTex([-4, -5, -3])).toBe("-4x^{2}-5x-3");
    expect(quadTex([1, -1, 0])).toBe("x^{2}-x");
    expect(quadTex([0, 0, 0])).toBe("0");
  });
});

describe("중2 확대 갈래 5차 g — 🔴 물린 결함의 회귀 잠금", () => {
  it("⑴ `125X` 순환소수 뒤 조사가 **찍히는 글자**를 따른다 (「$0.\\overline{79}$을」이 아니다)", () => {
    // 소수는 자리마다 읽으므로 마지막 글자는 **끝 자리 숫자**다.
    // 손으로 「을」을 박아 두어 400판 **전량**이 어긋나 있었다.
    let sawEul = false;
    let sawReul = false;
    for (const p of rows(E125, 400)) {
      const m = /순환소수 \$0\.\\overline\{(\d\d)\}\$(을|를) 곱해야/.exec(
        p.content,
      );
      expect(m, p.content).not.toBeNull();
      const d = num(m![1]) % 10;
      const want = d === 2 || d === 4 || d === 5 || d === 9 ? "를" : "을";
      expect(m![2], p.content).toBe(want);
      if (want === "을") sawEul = true;
      else sawReul = true;
      // 유한소수 쪽도 같은 규칙이다.
      expect(p.content, p.content).toContain(`$0.${m![1]}$${want} 곱했더니`);
    }
    // 🔴 둘 다 실제로 나오는지 센다 — 한쪽만 나오면 이 검사가 반쪽이다.
    expect(sawEul && sawReul, "두 조사가 모두 지면에 나온다").toBe(true);
  });

  it("⑵ `125X` 「…이라 하면」이 받침 뒤에서만 「이」를 쓴다", () => {
    let sawIra = false;
    let sawRa = false;
    for (const p of rows(E125, 400)) {
      const m = /\$x=0\.\\overline\{(\d\d)\}\$(이라|라) 하면/.exec(p.solution);
      expect(m, p.content).not.toBeNull();
      const d = num(m![1]) % 10;
      const want = d === 2 || d === 4 || d === 5 || d === 9 ? "라" : "이라";
      expect(m![2], p.content).toBe(want);
      if (want === "이라") sawIra = true;
      else sawRa = true;
    }
    expect(sawIra && sawRa, "두 꼴이 모두 지면에 나온다").toBe(true);
  });

  it("⑶ `127X` 발문의 주격 조사가 셋째 직선의 $y$절편을 따른다 (「$+21$가」가 아니다)", () => {
    let sawI = false;
    let sawGa = false;
    for (const p of rows(E127, 400)) {
      const m = /\$y=ax([+-]\d+)\$(이|가) 삼각형을/.exec(p.content);
      expect(m, p.content).not.toBeNull();
      const d = Math.abs(num(m![1])) % 10;
      const want = d === 2 || d === 4 || d === 5 || d === 9 ? "가" : "이";
      expect(m![2], p.content).toBe(want);
      if (want === "이") sawI = true;
      else sawGa = true;
      // 공용 자도 이 자리를 본다 — 두 자가 같은 답을 내는지 함께 확인한다.
      expect(josaMismatches(p.content), p.content).toEqual([]);
    }
    expect(sawI && sawGa, "두 조사가 모두 지면에 나온다").toBe(true);
  });

  it("⑷ `127X` 의 「(으)로」와 교점 뒤 조사가 맞다 (공용 자가 못 보는 두 자리)", () => {
    let sawEuro = false;
    let sawRo = false;
    let sawEul = false;
    let sawReul = false;
    for (const p of rows(E127, 400)) {
      expect(euroRoMismatches(p.solution), p.content).toEqual([]);
      for (const m of p.solution.matchAll(
        /\$(-?\d+)\$(으로|로) 서로 다르므로/g,
      )) {
        if (m[2] === "으로") sawEuro = true;
        else sawRo = true;
      }
      const c = /교점 \$\((-?\d+),\\ (-?\d+)\)\$(을|를) 지나야/.exec(
        p.solution,
      );
      expect(c, p.content).not.toBeNull();
      const d = Math.abs(num(c![2])) % 10;
      const want = d === 2 || d === 4 || d === 5 || d === 9 ? "를" : "을";
      expect(c![3], p.content).toBe(want);
      if (want === "을") sawEul = true;
      else sawReul = true;
    }
    expect(sawEuro && sawRo, "「으로」와 「로」가 모두 나온다").toBe(true);
    expect(sawEul && sawReul, "「을」과 「를」이 모두 나온다").toBe(true);
  });

  it("⑸ `127X` 가 지면에 **계수 $1$** 을 안 찍는다 ($p_x$·$m$·$m_1-m_2$ 셋 다)", () => {
    for (const p of rows(E127, 400)) {
      const f = p.facts;
      expect(Math.abs(f.px!), p.content).toBeGreaterThanOrEqual(2);
      expect(Math.abs(f.m1!), p.content).toBeGreaterThanOrEqual(2);
      expect(Math.abs(f.m2!), p.content).toBeGreaterThanOrEqual(2);
      expect(Math.abs(f.m1! - f.m2!), p.content).toBeGreaterThanOrEqual(2);
      // 🔴 근거는 규칙이 아니라 **지면**이다 — 공용 냄새 자가 실제로 물게 한다.
      expect(pageSmells(p.solution), p.content).toEqual([]);
      expect(
        /\$1a=|\$-1a=|\$1x=|\$-1x=|1\\times|-1\\times/.test(p.solution),
      ).toBe(false);
    }
  });

  it("⑹ `127X` 가 **양수를 괄호로 싸지 않는다** (`\\times(3)` 이 213/400 이었다)", () => {
    let sawBare = false;
    let sawParen = false;
    for (const p of rows(E127, 400)) {
      expect(/\\times\(\d/.test(p.solution), p.content).toBe(false);
      if (/\\times\d/.test(p.solution)) sawBare = true;
      if (/\\times\(-\d/.test(p.solution)) sawParen = true;
    }
    // 🔴 두 갈래가 다 나오는지 센다 — 음수만 나오면 이 검사가 반쪽이다.
    expect(sawBare && sawParen, "양수는 맨몸으로, 음수는 괄호로").toBe(true);
  });

  it("⑺ `126X` 해설이 양변에 $(M+x)$ 를 곱하는 **걸음**을 적는다", () => {
    for (const p of rows(E126, 200)) {
      const amount = num(grab(RE126, p.content, "126X")[1]);
      expect(p.solution, p.content).toContain(
        `$x$는 자연수이므로 $${amount}+x>0$이고, 따라서 아래 두 부등식의 양변에 $(${amount}+x)$를 곱해도 부등호의 방향은 바뀌지 않는다.`,
      );
    }
  });

  it("⑻ `126X` 의 「진해짐/묽어짐」 두 갈래가 **둘 다** 나온다 (견주기의 뿌리)", () => {
    const seen = new Set<number>();
    for (const p of rows(E126, 400)) seen.add(p.facts.up!);
    expect([...seen].sort(), "`up` 두 갈래").toEqual([0, 1]);
  });

  it("⑼ 해설에 마크다운 굵게 표시(`**`)를 쓰지 않고 「그중」을 붙여 쓴다", () => {
    for (const e of M2_TOP_5G)
      for (const p of rows(e, 60)) {
        expect(p.solution.includes("**"), p.content).toBe(false);
        expect(p.content.includes("**"), p.content).toBe(false);
        expect(`${p.content}${p.solution}`.includes("그 중"), p.content).toBe(
          false,
        );
      }
  });

  it("⑽ 지면에 나가는 수의 크기가 읽을 만한 자리에 묶여 있다 (읽기 가드)", () => {
    // 🔴 이 둘은 «값»이 아니라 «읽힘»을 지키는 가드다. 값 검산·냄새 자가 구조적으로
    //    못 보므로 여기서 수치를 못 박는다 — 풀면 $\dfrac{91}{9900}$ 과 $y=-6x+58$ 이 나간다.
    for (const p of rows(E125, 300)) {
      const [, , gn, gd] = grab(RE125, p.content, "125X").map(num);
      expect(gd, p.content).toBeLessThanOrEqual(900);
      expect(gd, p.content).not.toBe(99);
      expect(gn, p.content).toBeLessThanOrEqual(999);
    }
    for (const p of rows(E127, 300)) {
      const [, n1, , n2, n3] = grab(RE127, p.content, "127X").map(num);
      for (const n of [n1!, n2!, n3!])
        expect(Math.abs(n), p.content).toBeLessThanOrEqual(36);
    }
  });

  it("⑾ 🔴 정답 쏠림을 **모집단 값**으로 잠근다 (문턱 12% 는 여유가 너무 넓다)", () => {
    // 🔴 브리프의 12% 는 **한계**이고, 아래는 이 회차에 실제로 잰 **모집단 값**이다.
    //    12% 만 걸어 두면 매개변수를 좁혀 6.70% → 9.12% 로 나빠져도 통과한다
    //    (실측: `127X` 의 $a_3$ 를 $\pm9$ 에서 $\pm5$ 로 좁힌 변이가 그렇게 초록이었다).
    //    그래서 잰 값 옆에 좁은 여유를 두고 못 박는다.
    const CEIL: Record<string, number> = {
      "125X": 4.0, // 전수 2.59%
      "126X": 1.5, // 전수 0.51%
      "127X": 8.5, // 전수 6.70%
      "128X": 1.0, // 씨앗 4,000판 0.20%
    };
    const N = 4000;
    for (const e of M2_TOP_5G) {
      const counts = new Map<string, number>();
      for (const p of rows(e, N, 4242)) {
        counts.set(p.answer, (counts.get(p.answer) ?? 0) + 1);
      }
      const top = (Math.max(...counts.values()) / N) * 100;
      expect(top, `${e.rpmType} ${N}판 최빈 (모집단 잠금)`).toBeLessThan(
        CEIL[e.rpmType]!,
      );
    }
  });

  it("⑿ 🔴 D-20 손실 원장이 **재현된다** — 모듈 머리말 ⑷ 의 칸을 여기서 다시 센다", () => {
    // ── 125X 전수 ──
    const count125 = (skipShortcut: boolean): [number, number] => {
      let pass = 0;
      const ans = new Set<number>();
      for (const block of REPEAT_BLOCKS)
        for (let mul = 6; mul <= 150; mul += 1) {
          const [gn, gd] = reduceFraction(mul * block, 9900);
          if (gd > 900 || gn > 999 || gd === 99) continue;
          if (
            !skipShortcut &&
            shortcutHits(
              [block, Math.floor(block / 10), block % 10, gn, gd],
              mul,
            )
          )
            continue;
          pass += 1;
          ans.add(mul);
        }
      return [pass, ans.size];
    };
    expect(REPEAT_BLOCKS.length * 145, "125X 모집단").toBe(3190);
    expect(count125(false), "125X 전부 켠 뒤").toEqual([848, 42]);
    expect(count125(true), "125X 지름길만 끔").toEqual([917, 42]);

    // ── 127X 매개변수 격자 ──
    // 🔴 여기 있던 것은 생성기의 조건을 **손으로 옮겨 적은 모형**이었다. 2026-09-04 에
    //    제품에 가드 한 줄($m_1+m_2$ 가 $0$ 이면 버린다)을 더했는데 이 모형에는 없어,
    //    제품이 바뀌었는데 이 시험은 **초록인 채로** 옛 수(40944)를 잠그고 있었다.
    //    이제 **제품의 받아들임 함수를 그대로 부른다** — 한쪽만 고치는 일이
    //    구조적으로 불가능하다(옮겨 적을 규칙이 없다).
    const count127 = (skipShortcut: boolean): [number, number] => {
      let pass = 0;
      const ans = new Set<number>();
      for (let px = -5; px <= 5; px += 1)
        for (let py = -8; py <= 8; py += 1)
          for (let m1 = -6; m1 <= 6; m1 += 1)
            for (let m2 = -6; m2 <= 6; m2 += 1)
              for (let a3 = -9; a3 <= 9; a3 += 1) {
                const ok = noTriangleCase(px, py, m1, m2, a3, skipShortcut);
                if (ok === null) continue;
                pass += 1;
                ans.add(ok.sum);
              }
      return [pass, ans.size];
    };
    // 가드를 더하기 전에는 [40944, 37] / [119640, 39] 였다 — 8,122 조합을 잃고
    // 답 가짓수는 그대로다(그 판들은 답이 $a_3$ 하나로 접히던 자리다).
    expect(count127(false), "127X 전부 켠 뒤").toEqual([32822, 37]);
    expect(count127(true), "127X 지름길만 끔").toEqual([103448, 39]);
  });
});
