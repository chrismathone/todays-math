/**
 * 중2 **확대 갈래 4차 물결**(`m2Top4.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `36W` | 마디·몫·나머지를 **먼저 뽑고** 합 $S$ 를 역산한다 | 나눗셈을 **한 번도 안 한다** — 순환소수를 첫째 자리부터 **한 자리씩 실제로 펼쳐** 누적합이 $S$ 가 되는 자리를 **전부** 모은다. 그 자리가 정확히 하나인지까지 이 훑기가 답한다(「모두」의 반증) |
 * | `37W` | 세 식을 더해 $2(a+b+c)$ 를 만들고 반으로 나눈다 | 그 항등식을 **안 쓴다** — $a$, $b$, $c$ 를 **정수 분자로 만들어** 발문의 세 식에 **대입해 맞는지 확인**하고(맞으면 그것이 해다), 셋이 다 양수인지 본 뒤 **그 셋을 더한다**. 해가 하나뿐인 것은 차 $(da,db,dc)$ 가 $da+db=db+dc=dc+da=0$ 을 만족하면 셋 다 $0$ 이라는 데서 온다 |
 * | `38W` | 두 경계를 계산해 창의 두 끝을 정한다 | 부등식을 **한 줄도 안 세운다** — $x=1$ 부터 차례로 **세 가게의 금액을 실제로 계산**해 가장 싼 곳을 고르고, 물은 가게가 이기는 $x$ 를 모은다. 그 집합이 이어져 있는지·양쪽에서 닫혔는지·동점이 없는지도 이 훑기가 답한다 |
 * | `39W` | 약수를 구해 절편을 만든다 | 약수를 **한 번도 안 구한다** — 정수 $a$ 를 $-4b$ 부터 $4b$ 까지 **전부 넣어 보고** $x$절편이 자연수인 것만 모은다. 훑는 범위가 $\pm b$ 를 크게 넘으므로 「모두」라는 주장이 **범위 밖에서 반증되지 않는다**는 것까지 확인된다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * ## ⑶ 🔴 3차 물결이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**(`5\times6+2=32` 꼴)을 뽑아 좌·우를 각각 계산해 맞댄다.
 *       공식을 옮겨 적는 게 아니라 **산술을 하는 것**이라 동어반복이 아니다.
 *   ㄴ. **해설에 나온 모든 수가 재계산으로 설명되는가** — 발문에서 읽은 값과 독립
 *       검산이 낳은 값만 허용하고, 그 밖의 수가 하나라도 있으면 빨개진다.
 *   ㄷ. **해설의 «말»** — 「몫」·「나머지」·「커진다」·「하나뿐」·「약수」·「음의 정수」·
 *       「가장 싸지 않」·「자연수이므로」를 맞바꾸거나 지우면 빨개진다. 나열 줄 ↔
 *       수관형사 ↔ 합 줄을 **셋 다** 맞댄다(둘만 맞대면 「답만 맞고 목록이 빈 해설」이 산다).
 *   ㄹ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약인가.
 *   ㅁ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 한 단(964.8px)이
 *       아니라 **700px** 아래로 잠근다.
 *   ㅂ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 🔴 **공용 훑개의 「정수 경계 걸음」 축이 `38W` 를 반쯤만 본다.**
 *    `probe-middle-extending-tiers.boundStepFaults` 는 `$cx\le R$이다.` 꼴을 찾는데,
 *    우리 경계는 **엄격 부등호**($700x>2000$)로 서고 정수 경계만 `\ge`·`\le` 다.
 *    그래서 그 자는 「$x\ge3$이다.」를 계수 $1$ 인 자명한 걸음으로 읽고 **분수를 건너뛴
 *    거짓 함의를 구조적으로 못 본다.** 그 축은 **이 파일이 따로 들고 있다**
 *    (`strictBoundFault`). 남의 파일을 안 고치는 대신 여기 적어 둔다 — 리드가
 *    공용 자에 엄격 부등호 판을 넣기로 하면 그때 눈금 수가 바뀐다.
 * 2. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은
 *    재지만 설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로
 *    눈으로 읽었고, 그때 고친 자리(「$8000$원고」 → 「$8000$원이고」 · 「$\dfrac{346}{3}$**는**」
 *    → 「**은**」 · 「주어져 있지 않다」 → 「구하지 않는다」)를 아래 회귀 잠금에 남긴다.
 * 3. `37W` 의 검산은 **유리수 산술**이라 부동소수 티끌이 없다(전부 정수 분자).
 *    대신 「분모가 $0$ 이 되는 자리」는 애초에 없다($p,q,r\ge2$).
 * 4. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 *
 * ## ⑸ 🔴 음성 눈금은 **자기 축을 홀로 갈라야** 한다 — 여덟이 그러지 못했다
 *
 * 검산기의 검사 16개를 하나씩 꺼 보는 변이 시험을 돌렸더니 처음에는 **7 만 빨강**이었다.
 * 나머지 아홉 중 여덟은 「이 눈금이 그 축을 재고 있다」가 **거짓**이었다 — 음성 지면이
 * **다른 불변식에도** 걸려서, 재려던 검사를 지워도 그쪽이 대신 물었다. 실례:
 *
 * | 축 | 첫 판 지면 | 왜 못 쟀나 | 갈아 끼운 지면 |
 * |---|---|---|---|
 * | 원시 마디 | $0.\overline{1212}$ 합 $19$ | 비례 어림에도 걸린다 | $0.\overline{911911}$ 합 $31$ |
 * | 자리 유일 | $0.\overline{12047}$ 합 $17$ | 비례 어림에도 걸린다 | $0.\overline{910}$ 합 $30$ |
 * | 몫이 양수 | $(2,3,6)$ | 통분 결과가 기약이 아니다 | $(2,3,7)$ |
 * | 날수 서로 다름 | $(6,6,9)$ | 통분 결과가 기약이 아니다 | $(3,3,4)$ |
 * | 통분 기약 | (없었다) | 눈금 자체가 없었다 | $(6,8,12)$ |
 * | 창의 아래끝 | 배송료 없는 가게를 물음 | 창이 한 칸뿐이라 앞 검사가 문다 | $1000/700/500$·$0/1225/6125$ |
 * | 창 길이 상한 | (없었다) | 눈금 자체가 없었다 | $1000/700/500$·$0/1000/6825$ |
 * | 배송료 없는 가게 하나 | (없었다) | 눈금 자체가 없었다 | 셋 다 배송료를 받는 지면 |
 * | `39W` 지름길 | $b=13$ | 「후보가 넷도 안 된다」가 먼저 문다 | $b=28$(완전수) |
 *
 * 그리고 검사 하나(「마디 끝에서 끊겼다」)는 **지웠다** — 나머지가 $0$ 이면 비례 어림이
 * 답과 **정확히** 같아져 홀로 설 수 없다(대수적으로 같은 말). 남은 둘(`38W` 「위로
 * 안 닫혔다」 · `39W` 「$|a|>b$·부호 한쪽」)은 **초록인 것이 옳다** — 각 자리에 까닭을
 * 적어 두었다. 지금 **14/16 이 빨강**이다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { createRng } from "@/lib/elementary/rng";
import { bareNumbers } from "@/lib/elementary/rules";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "@/lib/middle/generate";
import {
  combinedDaily,
  digitsUsed,
  divisorsOf,
  hasFinalConsonant,
  isPrimitiveCycle,
  M2_TOP_4,
  naturalIntercepts,
  objectParticle,
  partialSums,
  reduceFraction,
  winningCounts,
} from "@/lib/middle/m2Top4";
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
const BASE_SEED = 20260904;
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260904, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_4.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E36 = entryOf("36W");
const E37 = entryOf("37W");
const E38 = entryOf("38W");
const E39 = entryOf("39W");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "36W": "심화중",
  "37W": "심화중",
  "38W": "심화상",
  "39W": "심화상",
};

// ── 소품 ────────────────────────────────────────────────────

function rows(entry: TypeEntry, n = SAMPLE): MidProblem[] {
  const out: MidProblem[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(entry.handler(createRng(BASE_SEED + i * 7919)));
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

function lcm2(a: number, b: number): number {
  return (a / gcd2(a, b)) * b;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 을/를·은/는·와/과·가만 본다. 그런데 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다.
 *
 * ⚠️ 규칙은 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 그러면 동어반복이라
 *    아무것도 안 지킨다. 여기 다시 적는다.
 * ⚠️ 3차 물결 시험(`middleM2Top3.test.ts`)이 같은 함수를 내보내고 있지만
 *    **import 하지 않는다** — 시험 파일을 import 하면 그쪽 `describe` 가 이 파일의
 *    실행에 통째로 딸려 와 같은 검사가 두 번 돈다.
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

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아닌** 것. */
function unreducedFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (gcd2(a, b) !== 1) out.push(`${a}/${b}`);
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

// ── 36W 소품 — 순환소수를 **한 자리씩 실제로 펼친다** ────────

/**
 * $0.\overline{d_1d_2\cdots}$ 를 첫째 자리부터 펼쳐 누적합이 `sum` 이 되는 자리를
 * **전부** 모은다. 나눗셈도 부분합 목록도 안 쓴다.
 *
 * 자리가 둘 이상이면 발문의 「자연수 $n$의 값」이 정해지지 않는다 — 마디 가운데
 * $0$ 이 있을 때 그렇게 된다(모듈 ⑺ 2).
 */
function positionsWithRunningSum(digits: number[], sum: number): number[] {
  const hits: number[] = [];
  let acc = 0;
  const bound = sum + digits.length * 2 + 10;
  for (let pos = 1; pos <= bound; pos += 1) {
    acc += digits[(pos - 1) % digits.length]!;
    if (acc === sum) hits.push(pos);
    if (acc > sum + 200) break;
  }
  return hits;
}

// ── 37W 소품 — 세 식에 **대입해 맞는지** 확인한다 ────────────

/**
 * $a+b=\frac1p$, $b+c=\frac1q$, $c+a=\frac1r$ 의 해를 **분모 $D$ 위의 정수**로 만들고,
 * 발문의 세 식에 넣어 **정말 맞는지 확인**한다. 맞으면 그것이 해다.
 * (해가 하나뿐인 것은 두 해의 차 $(da,db,dc)$ 가 $da+db=db+dc=dc+da=0$ 을 만족하면
 *  셋 다 $0$ 이라는 데서 온다 — 「더해서 반으로 나눈다」는 항등식을 안 쓴다.)
 */
function solveWorkSystem(
  p: number,
  q: number,
  r: number,
): { d: number; a: number; b: number; c: number } | null {
  const L = lcm2(lcm2(p, q), r);
  const d = 2 * L;
  const a = L / p - L / q + L / r;
  const b = L / p + L / q - L / r;
  const c = -L / p + L / q + L / r;
  if (a + b !== d / p) return null;
  if (b + c !== d / q) return null;
  if (c + a !== d / r) return null;
  return { d, a, b, c };
}

// ── 38W 소품 — 금액을 **실제로 계산해** 가장 싼 곳을 고른다 ──

type Shop = { price: number; ship: number };

/** $x$ 마다 가장 싼 가게의 자리(동점이면 `null`). */
function cheapestAt(shops: Shop[], x: number): number | null {
  const costs = shops.map((s) => s.price * x + s.ship);
  const best = Math.min(...costs);
  const who = costs.filter((c) => c === best).length;
  return who === 1 ? costs.indexOf(best) : null;
}

/** 물은 가게가 **혼자** 가장 싼 $x$ 전부 — 부등식을 한 줄도 안 쓴다. */
function soleWinnerXs(shops: Shop[], who: number, limit: number): number[] {
  const out: number[] = [];
  for (let x = 1; x <= limit; x += 1)
    if (cheapestAt(shops, x) === who) out.push(x);
  return out;
}

/**
 * 🔴 **엄격 부등호 판 «정수 경계 걸음»** — 공용 훑개가 못 보는 축(⑷ 1).
 *
 * `$cx>R$이다.` 에서 `$x\ge B$이다.` 로 뛸 때 $R/c$ 가 정수가 아니면 해설은
 * **그 분수와 「$x$는 자연수」를 반드시 적어야** 한다. 안 적으면 쓴 대로 읽었을 때
 * **거짓 함의**다(3차 `38V` 가 800씨앗 중 574건 그랬다).
 */
function strictBoundFault(
  line: string,
  dir: "up" | "down",
): { fault: string | null; seen: boolean } {
  const claim =
    dir === "up"
      ? /\$(\d+)x>(\d+)\$이다\./.exec(line)
      : /\$(\d+)x<(\d+)\$이다\./.exec(line);
  if (claim === null) return { fault: null, seen: false };
  const c = num(claim[1]);
  const r = num(claim[2]);
  const finalRe =
    dir === "up" ? /\$x\\ge(\d+)\$이다\./ : /\$x\\le(\d+)\$이다\./;
  const fin = finalRe.exec(line);
  if (fin === null)
    return {
      fault: `정수 경계 「$x${dir === "up" ? "\\ge" : "\\le"}B$이다.」가 없다`,
      seen: true,
    };
  const b = num(fin[1]);
  const exact = r / c;
  const want = dir === "up" ? Math.floor(exact) + 1 : Math.ceil(exact) - 1;
  if (Number.isInteger(exact))
    return { fault: `경계 ${r}/${c} 가 정수라 동점이 난다`, seen: true };
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

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  // 36W — 순환소수를 한 자리씩 펼쳐 누적합이 $S$ 가 되는 자리를 **전부** 모은다.
  "36W": (content) => {
    const [blockT, sumT] = grab(
      /^순환소수 \$0\.\\overline\{(\d+)\}\$에 대하여 소수점 아래 첫째 자리부터 \$n\$번째 자리까지의 숫자의 합이 \$(\d+)\$일 때, 자연수 \$n\$의 값을 구하시오\.$/,
      content,
      "36W",
    );
    const digits = [...blockT!].map(Number);
    const S = num(sumT);
    const L = digits.length;
    if (L < 2) throw new Error("36W: 순환마디가 한 자리라 이 갈래가 아니다");
    if (!isPrimitiveCycle(digits))
      throw new Error(
        "36W: 순환마디가 원시가 아니다 — 더 짧은 마디로 적어야 한다",
      );
    const hits = positionsWithRunningSum(digits, S);
    if (hits.length === 0) throw new Error("36W: 그런 자리가 없다");
    if (hits.length > 1)
      throw new Error(
        `36W: 합이 $${S}$ 가 되는 자리가 ${hits.length}군데라 $n$ 이 정해지지 않는다`,
      );
    const n = hits[0]!;
    const C = digits.reduce((s, d) => s + d, 0);
    // 🔴 여기 있던 「마디 끝에서 끊겼다(\bmod)」 검사는 **지웠다** — 변이 시험이
    //    죽은 것을 잡았다. 나머지가 $0$ 이면 $S=qC$ 이므로 아래 비례 어림이
    //    $S\cdot L/C=qL=n$ **정확히** 되어 그 가드가 **늘 먼저** 문다 —
    //    대수적으로 같은 말이라 그 축은 홀로 설 수 없다. 죽은 검사는 아무것도
    //    안 지키면서 「축이 하나 더 있다」고 오해하게 만든다(2026-08-18 「LOOP 가
    //    있나」와 같은 자리). 음성 눈금도 같이 갈아 끼웠다.
    const prop = (S * L) / C;
    if (
      Math.floor(prop) === n ||
      Math.round(prop) === n ||
      Math.ceil(prop) === n
    )
      throw new Error("36W: 비례로 어림해도 답이 나온다 — 지름길이 열려 있다");
    const per = S / L;
    if (Math.floor(per) === n || Math.round(per) === n || Math.ceil(per) === n)
      throw new Error("36W: 합을 마디 길이로 나누기만 해도 답이 나온다");
    return String(n);
  },

  // 37W — 세 식에 **대입해** 해를 확인하고, 그 셋을 더한다.
  "37W": (content) => {
    const [pT, qT, rT] = grab(
      /어떤 일을 \$\\mathrm\{A\}\$와 \$\\mathrm\{B\}\$가 함께 하면 \$(\d+)\$일, \$\\mathrm\{B\}\$와 \$\\mathrm\{C\}\$가 함께 하면 \$(\d+)\$일, \$\\mathrm\{C\}\$와 \$\\mathrm\{A\}\$가 함께 하면 \$(\d+)\$일 만에 끝낼 수 있다\./,
      content,
      "37W",
    );
    const p = num(pT);
    const q = num(qT);
    const r = num(rT);
    if (p === q || q === r || p === r)
      throw new Error("37W: 두 짝의 날수가 같아 사실상 두 사람 문제다");
    const sol = solveWorkSystem(p, q, r);
    if (sol === null) throw new Error("37W: 세 식을 만족하는 해를 못 만들었다");
    if (sol.a <= 0 || sol.b <= 0 || sol.c <= 0)
      throw new Error(
        "37W: 한 사람의 하루 일의 양이 $0$ 이하라 그런 상황이 없다",
      );
    const M = lcm2(lcm2(p, q), r);
    if (M > 180)
      throw new Error(`37W: 최소공배수가 ${M} 이라 지면의 분모가 흉해진다`);
    const sumNum = M / p + M / q + M / r;
    if (gcd2(sumNum, M) !== 1)
      throw new Error(
        "37W: 통분 결과가 기약이 아니라 지면에 약분 안 한 분수가 난다",
      );
    const [tn, td] = reduceFraction(sol.a + sol.b + sol.c, sol.d);
    const [nn, nd] = reduceFraction(sumNum, M);
    if (nn === tn && nd === td)
      throw new Error("37W: 반으로 나누는 걸음을 빼도 답이 같다");
    return `\\dfrac{${tn}}{${td}}`;
  },

  // 38W — 금액을 실제로 계산해 가장 싼 곳을 고른다. 부등식을 한 줄도 안 쓴다.
  "38W": (content) => {
    const [aT, bT, cT] = grab(
      /\$\\mathrm\{A\}\$가 \$(\d+)\$원, \$\\mathrm\{B\}\$가 \$(\d+)\$원, \$\\mathrm\{C\}\$가 \$(\d+)\$원이다\./,
      content,
      "38W 값",
    );
    const prices = [num(aT), num(bT), num(cT)];
    const ships: (number | null)[] = [null, null, null];
    for (const m of content.matchAll(
      /\$\\mathrm\{([ABC])\}\$는 배송료가 (?:\$(\d+)\$원이|없)/g,
    )) {
      ships["ABC".indexOf(m[1]!)] = m[2] === undefined ? 0 : Number(m[2]);
    }
    if (ships.some((s) => s === null))
      throw new Error("38W: 세 가게의 배송료를 다 못 읽었다");
    if (ships.filter((s) => s === 0).length !== 1)
      throw new Error("38W: 배송료가 없는 가게가 정확히 하나가 아니다");
    const [whoT] = grab(
      /\$\\mathrm\{([ABC])\}\$에서 사는 것이 가장 싸게 되는 자연수 \$x\$는 모두 몇 개인지 구하시오\./,
      content,
      "38W 물음",
    );
    const who = "ABC".indexOf(whoT!);
    const shops: Shop[] = prices.map((price, i) => ({
      price,
      ship: ships[i]!,
    }));
    if (new Set(prices).size !== 3)
      throw new Error("38W: 두 가게의 단가가 같다");

    const LIMIT = 400;
    for (let x = 1; x <= LIMIT; x += 1) {
      if (cheapestAt(shops, x) === null)
        throw new Error(`38W: $x=${x}$ 에서 동점이 나 «가장 싼 곳»이 둘이다`);
    }
    const won = soleWinnerXs(shops, who, LIMIT);
    if (won.length < 2)
      throw new Error(
        `38W: 이기는 개수가 ${won.length}가지뿐이라 후보를 견줄 것이 없다`,
      );
    for (let k = 1; k < won.length; k += 1)
      if (won[k] !== won[k - 1]! + 1)
        throw new Error("38W: 이기는 개수가 이어져 있지 않다");
    if (won[0]! < 2)
      throw new Error(
        "38W: 창의 아래끝이 $1$ 이라 아래 조건이 아무것도 안 자른다",
      );
    // ⚠️ **이 검사와 아래 「너무 길다」는 이 문항 꼴에서 «같은 사건»이다** — 위로 안
    //    닫히면 단가가 가장 싼 가게가 큰 $x$ 에서 늘 이기므로 창이 반드시 길어진다.
    //    그래서 변이 V11 이 **초록으로 나오는 것이 옳다**(꺼도 아래 줄이 같은 지면을
    //    거부한다). 둘을 다 두는 까닭은 **거부 사유를 정확히 적기** 위해서다 —
    //    지우면 「창이 아예 안 닫힌다」가 「나열이 길다」로 둔갑한다.
    if (won[won.length - 1]! >= LIMIT - 5)
      throw new Error("38W: 창이 위로 안 닫혀 개수가 정해지지 않는다");
    // ⚠️ **「너무 길다」는 「위로 안 닫혔다」 뒤에 온다.** 거꾸로 두면 창이 안 닫힌
    //    지면이 늘 이쪽으로 먼저 걸려 「위로 닫혔나」 축이 통째로 죽는다(변이 V11).
    if (won.length > 25)
      throw new Error("38W: 창이 너무 길어 나열이 지면을 넘는다");
    // 🔴 ㉵ 지름길 — 답이 $2$~$25$ 인 작은 수라 발문 다섯 수의 차·몫에 우연히 맞는
    //    일이 잦다(전수 69.6%). **답은 위 전수 훑기에서 왔고**, 이 줄은 그 답이
    //    「한두 번 연산으로도 나오는가」를 되묻는 불변식이다.
    const printed = [...prices, ...ships.filter((s) => s !== 0)];
    const guesses = new Set<number>();
    for (const a of printed) {
      guesses.add(a! / 100);
      guesses.add(a! / 1000);
    }
    for (const a of printed)
      for (const b of printed) {
        if (a === b) continue;
        guesses.add(Math.abs(a! - b!));
        guesses.add(Math.abs(a! - b!) / 100);
        guesses.add(Math.abs(a! - b!) / 1000);
        guesses.add(Math.round(a! / b!));
        guesses.add(Math.floor(a! / b!));
        guesses.add(Math.ceil(a! / b!));
        guesses.add(Math.round(a! / b! / 100));
      }
    if (guesses.has(won.length))
      throw new Error(
        "38W: 발문 다섯 수의 한두 번 연산으로 답이 나온다 — 지름길이 열려 있다",
      );
    return `${won.length}개`;
  },

  // 39W — 정수 $a$ 를 넓게 다 넣어 보고 $x$절편이 자연수인 것만 모은다.
  "39W": (content) => {
    const [signT, bT] = grab(
      /^일차함수 \$y=ax([+-])(\d+)\$의 그래프의 \$x\$절편이 자연수가 되도록 하는 정수 \$a\$가 여러 개 있다\. 이때 \$x\$절편이 될 수 있는 모든 값의 합을 구하시오\.$/,
      content,
      "39W",
    );
    const plus = signT === "+";
    const b = num(bT);
    if (b < 2) throw new Error("39W: 상수항이 너무 작다");
    const hits: { a: number; x: number }[] = [];
    for (let a = -4 * b; a <= 4 * b; a += 1) {
      if (a === 0) continue;
      const x = plus ? -b / a : b / a;
      if (Number.isInteger(x) && x >= 1) hits.push({ a, x });
    }
    if (hits.length < 4)
      throw new Error(
        `39W: 살아남는 $a$ 가 ${hits.length}개뿐이라 「여러 개」가 성립하지 않는다`,
      );
    // 🔴 **「모두」의 반증 시도** — 위 훑기는 $\pm 4b$ 까지 갔다. 아래 두 줄은 그 시도가
    //    **아무것도 못 찾았다**는 기록이다. 둘 다 **구조적으로 못 문다**(변이 V16 이
    //    초록으로 나오는 것이 옳다) — $|x|=b/|a|\ge1$ 이면 $|a|\le b$ 이고,
    //    $x\ge1$ 이면 $a$ 의 부호가 상수항의 부호로 정해지기 때문이다.
    //    **그게 「모두」가 참이라는 뜻이고**, 가드가 아니다. 지우면 「범위를 넓혀
    //    봤다」는 사실이 지면에서 사라진다.
    if (hits.some((h) => Math.abs(h.a) > b))
      throw new Error("39W: $|a|>b$ 인 자리에서도 자연수 절편이 나온다");
    if (new Set(hits.map((h) => Math.sign(h.a))).size !== 1)
      throw new Error("39W: 살아남는 $a$ 의 부호가 한쪽이 아니다");
    const total = hits.reduce((s, h) => s + h.x, 0);
    if (total === b || total === 2 * b || total === b + 1)
      throw new Error(
        "39W: 상수항 한 번 연산으로 답이 나온다 — 지름길이 열려 있다",
      );
    return String(total);
  },
};

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/** 양성: 답을 아는 지면에서 그 답을 낸다. 손으로 풀어 확인한 값이다. */
const CALIBRATION: ReadonlyArray<readonly [string, string, string]> = [
  [
    // 마디 $12847$ 의 합은 $22$, $91=4\times22+3$, 부분합 $1,3,11,15$ 에서 $3$ 은 둘째.
    "36W",
    "순환소수 $0.\\overline{12847}$에 대하여 소수점 아래 첫째 자리부터 $n$번째 자리까지의 숫자의 합이 $91$일 때, 자연수 $n$의 값을 구하시오.",
    "22",
  ],
  [
    // $\frac16+\frac19+\frac1{12}=\frac{13}{36}$, 그 절반이 $\frac{13}{72}$.
    "37W",
    "어떤 일을 $\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $6$일, $\\mathrm{B}$와 $\\mathrm{C}$가 함께 하면 $9$일, $\\mathrm{C}$와 $\\mathrm{A}$가 함께 하면 $12$일 만에 끝낼 수 있다. 세 사람이 함께 할 때 하루에 하는 일의 양을 구하시오. (단, 전체 일의 양을 $1$로 놓고, 세 사람이 각각 혼자 하면 며칠이 걸리는지는 구하지 않는다.)",
    "\\dfrac{13}{72}",
  ],
  [
    // $\mathrm{A}$: $1200x+2000$. $\mathrm{C}$ 보다 싸려면 $700x>2000$ 에서 $x\ge3$,
    // $\mathrm{B}$ 보다 싸려면 $300x<5500$ 에서 $x\le18$ — $3$ 부터 $18$ 까지 $16$개.
    // ⚠️ 이 지면은 **문자열 픽스처**다. 엔진 산출물을 그때그때 불러 쓰면 엔진을 고치는
    //    순간 양성이 사라져 재현율을 영영 못 잰다(2026-08-23).
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 머그컵 한 개의 값은 $\\mathrm{A}$가 $1200$원, $\\mathrm{B}$가 $900$원, $\\mathrm{C}$가 $1900$원이다. $\\mathrm{A}$는 배송료가 $2000$원이고, $\\mathrm{B}$는 배송료가 $7500$원이고, $\\mathrm{C}$는 배송료가 없다. 배송료는 몇 개를 사든 한 번만 낸다. 이 머그컵을 $x$개 살 때 $\\mathrm{A}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "16개",
  ],
  [
    // $45$ 의 약수 여섯에서 절편 $45,15,9,5,3,1$ — 합 $78$.
    "39W",
    "일차함수 $y=ax+45$의 그래프의 $x$절편이 자연수가 되도록 하는 정수 $a$가 여러 개 있다. 이때 $x$절편이 될 수 있는 모든 값의 합을 구하시오.",
    "78",
  ],
  [
    // 부호를 뒤집어도 답은 같아야 한다 — 살아남는 $a$ 만 양수 쪽으로 옮겨 간다.
    "39W",
    "일차함수 $y=ax-45$의 그래프의 $x$절편이 자연수가 되도록 하는 정수 $a$가 여러 개 있다. 이때 $x$절편이 될 수 있는 모든 값의 합을 구하시오.",
    "78",
  ],
];

/** 음성: 불변식을 어긴 지면은 **던진다**. 없으면 「0」이 «깨끗»인지 «못 셈»인지 안 갈린다. */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    // 마디 가운데 $0$ — 부분합이 평평해져 합이 $17$ 인 자리가 **둘**이다 (⑺ 2).
    // 🔴 **첫 판은 마디 $12047$·합 $17$ 이었는데 그것으로는 이 축을 못 쟀다** —
    //    변이 V2 가 「자리 유일 검사를 꺼도 초록」이라고 알려 줬다. 그 지면은
    //    **비례 어림에도** 걸려서, 자리 검사를 지워도 다른 가드가 대신 물었다.
    //    「합이 그 값이 되는 자리가 둘」**하나만** 걸리는 지면으로 갈아 끼웠다.
    "36W",
    "순환소수 $0.\\overline{910}$에 대하여 소수점 아래 첫째 자리부터 $n$번째 자리까지의 숫자의 합이 $30$일 때, 자연수 $n$의 값을 구하시오.",
    "마디 끝이 $0$ 이라 합이 $30$ 이 되는 자리가 여덟째와 아홉째 **둘**이다",
  ],
  [
    // 🔴 **첫 판은 마디 $1212$·합 $19$ 였는데 그것으로는 이 축을 못 쟀다** —
    //    변이 시험이 「검산기의 원시 마디 검사를 꺼도 초록」이라고 알려 줬다(M19).
    //    그 지면은 **비례 어림에도** 걸려서, 원시 검사를 지워도 다른 가드가 대신
    //    물었다. 「원시가 아니다」**하나만** 걸리는 지면으로 갈아 끼웠다(전수로 찾음).
    "36W",
    "순환소수 $0.\\overline{911911}$에 대하여 소수점 아래 첫째 자리부터 $n$번째 자리까지의 숫자의 합이 $31$일 때, 자연수 $n$의 값을 구하시오.",
    "순환마디가 원시가 아니다 — 진짜 마디는 $911$ 이다",
  ],
  [
    // 🔴 **첫 판은 「마디 끝에서 끊겼다」를 재려 했다**(마디 $12847$·합 $66$).
    //    그런데 나머지가 $0$ 이면 비례 어림이 답과 **정확히** 같아져 그 가드가 늘
    //    먼저 문다 — 그 축은 홀로 설 수 없다(검산기에서 그 검사를 지운 까닭).
    //    대신 「합을 마디 길이로 나누기」 지름길**만** 걸리는 지면을 넣는다.
    "36W",
    "순환소수 $0.\\overline{217}$에 대하여 소수점 아래 첫째 자리부터 $n$번째 자리까지의 숫자의 합이 $13$일 때, 자연수 $n$의 값을 구하시오.",
    "$13\\div3$ 의 올림이 답 $5$ 라 「합을 마디 길이로 나누기」만으로 답이 나온다",
  ],
  [
    // $40\times5/15=13.33$ 의 올림이 $14=n$ — 비례 어림으로 답이 나온다.
    "36W",
    "순환소수 $0.\\overline{12345}$에 대하여 소수점 아래 첫째 자리부터 $n$번째 자리까지의 숫자의 합이 $40$일 때, 자연수 $n$의 값을 구하시오.",
    "비례로 어림해도 답이 나온다 — 지름길이 열려 있다",
  ],
  [
    // $\frac13+\frac16=\frac12$ 이라 $\mathrm{C}$ 의 몫이 $0$ 이다.
    // 🔴 **첫 판은 $(2,3,6)$ 이었는데 통분 결과가 기약이 아니라서도 걸렸다** —
    //    변이 V6 가 「몫 양수 검사를 꺼도 초록」이라고 알려 줬다.
    //    그 축**만** 걸리는 $(2,3,7)$ 로 갈아 끼웠다.
    "37W",
    "어떤 일을 $\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $2$일, $\\mathrm{B}$와 $\\mathrm{C}$가 함께 하면 $3$일, $\\mathrm{C}$와 $\\mathrm{A}$가 함께 하면 $7$일 만에 끝낼 수 있다. 세 사람이 함께 할 때 하루에 하는 일의 양을 구하시오. (단, 전체 일의 양을 $1$로 놓고, 세 사람이 각각 혼자 하면 며칠이 걸리는지는 구하지 않는다.)",
    "한 사람의 하루 일의 양이 $0$ 이하라 그런 상황이 없다",
  ],
  [
    // 🔴 **첫 판은 $(6,6,9)$ 였는데 통분 결과가 기약이 아니라서도 걸렸다**(변이 V5).
    //    그 축**만** 걸리는 $(3,3,4)$ 로 갈아 끼웠다.
    "37W",
    "어떤 일을 $\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $3$일, $\\mathrm{B}$와 $\\mathrm{C}$가 함께 하면 $3$일, $\\mathrm{C}$와 $\\mathrm{A}$가 함께 하면 $4$일 만에 끝낼 수 있다. 세 사람이 함께 할 때 하루에 하는 일의 양을 구하시오. (단, 전체 일의 양을 $1$로 놓고, 세 사람이 각각 혼자 하면 며칠이 걸리는지는 구하지 않는다.)",
    "두 짝의 날수가 같아 사실상 두 사람 문제다",
  ],
  [
    // 🔴 **새 눈금** — 변이 V8 이 「통분 기약 검사를 지켜 주는 눈금이 없다」고
    //    알려 줬다. $(6,8,12)$ 는 통분 결과가 $\\dfrac{4+3+2}{24}=\\dfrac{9}{24}$ 라
    //    기약이 아니고, 그러면 지면에 약분 안 한 분수가 나간다(㉑).
    "37W",
    "어떤 일을 $\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $6$일, $\\mathrm{B}$와 $\\mathrm{C}$가 함께 하면 $8$일, $\\mathrm{C}$와 $\\mathrm{A}$가 함께 하면 $12$일 만에 끝낼 수 있다. 세 사람이 함께 할 때 하루에 하는 일의 양을 구하시오. (단, 전체 일의 양을 $1$로 놓고, 세 사람이 각각 혼자 하면 며칠이 걸리는지는 구하지 않는다.)",
    "통분 결과 $\\dfrac{9}{24}$ 가 기약이 아니라 지면에 약분 안 한 분수가 난다",
  ],
  [
    // $\mathrm{lcm}(7,8,9)=504$ — 정답 분모가 $1008$ 이 된다.
    "37W",
    "어떤 일을 $\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $7$일, $\\mathrm{B}$와 $\\mathrm{C}$가 함께 하면 $8$일, $\\mathrm{C}$와 $\\mathrm{A}$가 함께 하면 $9$일 만에 끝낼 수 있다. 세 사람이 함께 할 때 하루에 하는 일의 양을 구하시오. (단, 전체 일의 양을 $1$로 놓고, 세 사람이 각각 혼자 하면 며칠이 걸리는지는 구하지 않는다.)",
    "최소공배수가 $504$ 라 지면의 분모가 흉해진다",
  ],
  [
    // 물은 가게가 **배송료 없는 곳** — 창이 $x=1$ 에서 시작해 아래 조건이 안 자른다.
    // 🔴 **이 지면이 실제로 무는 축은 「창이 두 칸도 안 된다」다** — 변이 V10 이
    //    「아래끝 검사를 꺼도 초록」이라고 알려 줘서 이름을 바로잡았다.
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1800$원, $\\mathrm{B}$가 $1200$원, $\\mathrm{C}$가 $1000$원이다. $\\mathrm{A}$는 배송료가 없고, $\\mathrm{B}$는 배송료가 $1000$원이고, $\\mathrm{C}$는 배송료가 $2500$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{A}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "이기는 개수가 한 가지뿐이라 후보를 견줄 것이 없다",
  ],
  [
    // 🔴 **새 눈금** — 「창의 아래끝이 $1$」**하나만** 걸리는 지면(전수로 찾았다).
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1000$원, $\\mathrm{B}$가 $700$원, $\\mathrm{C}$가 $500$원이다. $\\mathrm{A}$는 배송료가 없고, $\\mathrm{B}$는 배송료가 $1225$원이고, $\\mathrm{C}$는 배송료가 $6125$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{A}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "창의 아래끝이 $1$ 이라 아래 조건이 아무것도 안 자른다",
  ],
  [
    // 🔴 **새 눈금** — 「창이 너무 길다」**하나만** 걸리는 지면($4$~$29$, $26$칸).
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1000$원, $\\mathrm{B}$가 $700$원, $\\mathrm{C}$가 $500$원이다. $\\mathrm{A}$는 배송료가 없고, $\\mathrm{B}$는 배송료가 $1000$원이고, $\\mathrm{C}$는 배송료가 $6825$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{B}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "창이 $26$ 칸이라 나열이 지면을 넘는다",
  ],
  [
    // 🔴 **새 눈금** — 「배송료가 없는 가게가 하나가 아니다」**하나만** 걸린다.
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1000$원, $\\mathrm{B}$가 $700$원, $\\mathrm{C}$가 $500$원이다. $\\mathrm{A}$는 배송료가 $500$원이고, $\\mathrm{B}$는 배송료가 $1000$원이고, $\\mathrm{C}$는 배송료가 $2500$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{B}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "배송료가 없는 가게가 하나도 없어 이 갈래의 뼈대가 아니다",
  ],
  [
    // 물은 가게가 **단가가 가장 싼 곳** — 큰 $x$ 에서 늘 이겨 창이 위로 안 닫힌다.
    //   🔴 정찰의 예시 수치가 바로 이 자리에 서 있었다(모듈 ⑺ 1).
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1800$원, $\\mathrm{B}$가 $1200$원, $\\mathrm{C}$가 $1000$원이다. $\\mathrm{A}$는 배송료가 없고, $\\mathrm{B}$는 배송료가 $1000$원이고, $\\mathrm{C}$는 배송료가 $2500$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{C}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "단가가 가장 싼 가게는 큰 $x$ 에서 늘 이겨 창이 위로 안 닫힌다",
  ],
  [
    // 🔴 **정찰이 예로 든 수치 그대로** — 창은 $2\le x\le7$ 로 옳게 닫히는데
    //    $1800-1200=600$ 을 $100$ 으로 나누면 답 $6$ 이 그대로 나온다.
    //    「창이 맞는가」와 「지름길이 없는가」는 다른 물음이다.
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1800$원, $\\mathrm{B}$가 $1200$원, $\\mathrm{C}$가 $1000$원이다. $\\mathrm{A}$는 배송료가 없고, $\\mathrm{B}$는 배송료가 $1000$원이고, $\\mathrm{C}$는 배송료가 $2500$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{B}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "발문 다섯 수의 차 $1800-1200=600$ 을 $100$ 으로 나누면 답 $6$ 이 나온다 — 지름길",
  ],
  [
    // $\mathrm{A}$ 와 $\mathrm{B}$ 가 $x=2$ 에서 **동점** — 「가장 싼 곳」이 둘이 된다.
    "38W",
    "세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 공책 한 권의 값은 $\\mathrm{A}$가 $1800$원, $\\mathrm{B}$가 $1200$원, $\\mathrm{C}$가 $1000$원이다. $\\mathrm{A}$는 배송료가 없고, $\\mathrm{B}$는 배송료가 $1200$원이고, $\\mathrm{C}$는 배송료가 $2500$원이다. 배송료는 몇 권을 사든 한 번만 낸다. 이 공책을 $x$권 살 때 $\\mathrm{B}$에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.",
    "$x=2$ 에서 두 가게가 동점이라 «가장 싼 곳»이 둘이다",
  ],
  [
    "39W",
    "일차함수 $y=ax+49$의 그래프의 $x$절편이 자연수가 되도록 하는 정수 $a$가 여러 개 있다. 이때 $x$절편이 될 수 있는 모든 값의 합을 구하시오.",
    "$49$ 의 약수가 셋뿐이라 「다 세워 견준다」가 성립하지 않는다",
  ],
  [
    // 🔴 **첫 판은 $b=13$ 이었는데 「후보가 넷도 안 된다」로 먼저 걸렸다**(변이 V15).
    //    $b=28$ 은 약수가 여섯이라 그 축을 지나고, 절편의 합이 $56=2\\times28$ 이라
    //    **지름길만** 걸린다(완전수라 늘 그렇다).
    "39W",
    "일차함수 $y=ax-28$의 그래프의 $x$절편이 자연수가 되도록 하는 정수 $a$가 여러 개 있다. 이때 $x$절편이 될 수 있는 모든 값의 합을 구하시오.",
    "$28$ 이 완전수라 절편의 합이 $2\\times28$ 이 되어 상수항 한 번 연산으로 답이 나온다",
  ],
];

describe("중2 확대 갈래 4차 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
    for (const t of ["36W", "37W", "38W", "39W"]) {
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

describe("중2 확대 갈래 4차 — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_4.length).toBe(4);
    expect(M2_TOP_4.map((e) => e.rpmType)).toEqual([
      "36W",
      "37W",
      "38W",
      "39W",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_4) {
      expect(isCatalogType(e), `${e.key} 는 색인에 없어야 한다`).toBe(false);
      expect(extensionNumberReason(e), e.key).toBeNull();
      expect(
        e.rpmType.endsWith("W"),
        `${e.key} 는 4차 물결 접미사여야 한다`,
      ).toBe(true);
    }
  });

  it("🔴 소단원·중단원 이름을 **정본에 대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다", () => {
    // 소단원은 단원 시드가 정본이다. 괄호 안의 쉼표·공백·가는 공백은 눈으로 못 가른다.
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_4) {
      expect(e.grade).toBe("중2");
      expect(e.rpmBook).toBe("2-1");
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

  it("🔴 `39W` 의 중단원 이름에 **가는 공백 U+2009** 가 실제로 들어 있다", () => {
    // 보통 공백 둘로 치면 눈으로는 같고 조회만 조용히 빗나간다 — 그 자리를 못 박는다.
    expect(E39.rpmMinor.includes("\u2009")).toBe(true);
    expect(E39.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑴");
  });

  it("네 유형이 어느 소단원에 붙는지 못 박는다", () => {
    expect(M2_TOP_4.map((e) => [e.rpmType, e.rpmMinor, e.unitSection])).toEqual(
      [
        ["36W", "유리수와 순환소수", "순환소수"],
        ["37W", "연립일차방정식의 활용", "연립방정식의 활용(일, 속력)"],
        [
          "38W",
          "일차부등식의 활용",
          "일차부등식의 활용(개수, 예금액, 유리한 방법)",
        ],
        ["39W", "일차함수와 그 그래프\u2009 ⑴", "일차함수의 그래프와 절편"],
      ],
    );
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_4) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !M2_TOP_4.includes(t),
      );
      for (const t of others) {
        const tier = generateMiddleProblem(t.key, 20260904, 0).difficulty;
        expect(
          tier === "심화중" || tier === "심화상",
          `${t.key} 가 이미 확대 갈래다 — ${e.unitSection} 은 빈 소단원이 아니다`,
        ).toBe(false);
      }
    }
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    const foreign = registeredTypes().filter((e) => !M2_TOP_4.includes(e));
    for (const e of M2_TOP_4) {
      expect(
        foreign.some((f) => f.key === e.key),
        `${e.key} 가 남의 모듈과 겹친다`,
      ).toBe(false);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_4) {
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

describe("중2 확대 갈래 4차 — 지면과 값", () => {
  for (const e of M2_TOP_4) {
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

      it("지면이 깨끗하다 — 렌더·냄새·조사·(으)로·맨 숫자·그림 지시", () => {
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
          // 그림이 없으므로 발문이 지면을 가리키면 종이에서 못 푼다.
          expect(p.figureSpec ?? null, e.rpmType).toBe(null);
          expect(pointsAtFigure(p.content), e.rpmType).toBeNull();
        }
        // 🔴 **조사 자가 이 유형에서 구조적으로 0 이 아닌지** — 3차의 한 유형은
        //    수식이 `)` 로 끝나 800/800 을 건너뛰었다. 「0 건」은 «깨끗»과 «못 셈»을
        //    안 가른다.
        expect(judged, `${e.rpmType} 조사 판정 후보`).toBeGreaterThan(SAMPLE);
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.solution).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // `37W` 는 산술 등식이 **분수 꼴**이라 이 자가 못 본다 — 그 유형의 중간값은
        // 아래 「해설의 중간값」 검사가 분수로 따로 잰다. 0 이 «깨끗»이 아님을 못 박는다.
        if (e.rpmType === "37W") expect(claims).toBe(0);
        // 문항마다 **적어도 하나**는 봐야 한다 — 0 은 «깨끗»과 «못 셈»을 안 가른다.
        else
          expect(claims, `${e.rpmType} 산술 등식`).toBeGreaterThanOrEqual(
            SAMPLE,
          );
      });

      it("🔴 지면의 모든 분수가 기약이다 (그리고 몇 개를 봤는지 센다)", () => {
        let seen = 0;
        for (const p of sample()) {
          for (const text of [p.content, p.answer, p.solution]) {
            expect(unreducedFractions(text), `${e.rpmType}: ${text}`).toEqual(
              [],
            );
            seen += fractionCount(text);
          }
        }
        // `36W` 는 분수를 아예 안 쓴다 — 그 «0» 은 «못 셈»이 아니라 «잴 것이 없다» 다.
        if (e.rpmType === "36W") expect(seen).toBe(0);
        else expect(seen, `${e.rpmType} 분수`).toBeGreaterThanOrEqual(SAMPLE);
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑹)", () => {
        for (const p of sample()) {
          const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
          expect(lines.length, `${e.rpmType} 해설 줄`).toBeGreaterThanOrEqual(
            6,
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
          // ⚠️ 마지막 줄로 못 박으면 안 된다 — 결론 **뒤에** 확인·주의 줄을 하나 둔다.
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

      it(`🔴 변형 폭과 정답 쏠림 (${WIDE}씨앗)`, () => {
        const wide = rows(e, WIDE);
        const contents = new Set(wide.map((p) => p.content));
        const solutions = new Set(wide.map((p) => p.solution));
        const answers = new Map<string, number>();
        for (const p of wide)
          answers.set(p.answer, (answers.get(p.answer) ?? 0) + 1);
        expect(contents.size, `${e.rpmType} 서로 다른 발문`).toBeGreaterThan(
          60,
        );
        // 적재가 12벌을 요구한다.
        expect(solutions.size, `${e.rpmType} 서로 다른 해설`).toBeGreaterThan(
          60,
        );
        expect(answers.size, `${e.rpmType} 서로 다른 정답`).toBeGreaterThan(15);
        const top = Math.max(...answers.values()) / wide.length;
        // ㉴ 3차의 `52V` 는 최빈 정답이 51.2% 였다. 여기는 넷 다 11% 아래다(실측).
        expect(top, `${e.rpmType} 최빈 정답 비율`).toBeLessThan(0.12);
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
          new Set(generateMiddleSet(e.key, BASE_SEED, 10).map((p) => p.content))
            .size,
        ).toBe(10);
      });
    });
  }
});

/** `facts` 만으로 정답 문자열을 다시 짓는다 — 계약 ⑵ 의 왕복 검사. */
function rebuildAnswer(rpmType: string, facts: Record<string, number>): string {
  if (rpmType === "36W") return `$${facts.x}$`;
  if (rpmType === "37W") return `$\\dfrac{${facts.x}}{${facts.den}}$`;
  if (rpmType === "38W") return `$${facts.x}$개`;
  if (rpmType === "39W") return `$${facts.x}$`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값**과 **말** — 3차 물결의 치명 결함이 난 자리
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 4차 — 🔴 해설의 중간값·말을 다른 길로 다시 잰다", () => {
  it("`36W` — 몫·나머지·부분합·자리 이름을 **펼쳐서** 다시 재고 네 줄을 서로 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E36, 120)) {
      const [blockT, sumT] = grab(
        /순환소수 \$0\.\\overline\{(\d+)\}\$에 대하여 소수점 아래 첫째 자리부터 \$n\$번째 자리까지의 숫자의 합이 \$(\d+)\$일 때/,
        p.content,
        "36W 발문",
      );
      const digits = [...blockT!].map(Number);
      const S = num(sumT);
      const L = digits.length;
      const n = positionsWithRunningSum(digits, S)[0]!;
      const C = digits.reduce((s, d) => s + d, 0);
      const q = Math.floor(S / C);
      const rest = S - q * C;
      const P = partialSums(digits);

      // ⑴ 마디합 줄 — 숫자 나열과 합이 서로 맞는가.
      const l0 = lineWith(p.solution, "순환마디를 이루는 숫자의 합은", "36W ⑴");
      const [listT, cT] = grab(
        /합은 \$([\d+]+)=(\d+)\$이다\./,
        l0,
        "36W 마디합",
      );
      expect(listT!.split("+").map(Number)).toEqual(digits);
      expect(num(cT)).toBe(C);

      // ⑵ 나눗셈 줄 — 「몫」과 「나머지」를 **맞바꾸면 빨개진다**.
      const l2 = lineWith(p.solution, "나누면 몫이", "36W ⑵");
      const [sT, c2T, qT, restT] = grab(
        /\$(\d+)\$[을를] \$(\d+)\$[으]?로 나누면 몫이 \$(\d+)\$이고 나머지가 \$(\d+)\$이므로/,
        l2,
        "36W 나눗셈",
      );
      expect(num(sT)).toBe(S);
      expect(num(c2T)).toBe(C);
      expect(num(qT)).toBe(q);
      expect(num(restT)).toBe(rest);
      expect(num(qT) * num(c2T) + num(restT)).toBe(S);
      expect(num(restT)).toBeGreaterThan(0);
      expect(num(restT)).toBeLessThan(num(c2T));

      // ⑶ 부분합 줄 — 나열 ↔ 「커진다」 ↔ 「하나뿐」이 서로 맞는가.
      const l3 = lineWith(p.solution, "앞에서부터 더한 합은 차례로", "36W ⑶");
      const partsT = grab(
        /앞에서부터 더한 합은 차례로 (.+?)이고, 각 자리의 숫자가 모두 \$1\$ 이상이므로/,
        l3,
        "36W 부분합",
      )[0]!;
      const parts = [...partsT.matchAll(/\$(\d+)\$/g)].map((m) => num(m[1]));
      expect(parts).toEqual(P.slice(0, L - 1));
      // 「커진다」는 실제로 참이어야 한다 — 낱말만 있고 값이 안 늘면 빨개진다.
      expect(l3).toContain("자리가 뒤로 갈수록 커진다");
      for (let k = 1; k < parts.length; k += 1)
        expect(parts[k]!).toBeGreaterThan(parts[k - 1]!);
      // 「하나뿐」이라는 주장 — 부분합 가운데 나머지와 같은 것이 정말 하나인가.
      expect(l3).toContain("하나뿐이다");
      expect(P.filter((v) => v === rest).length).toBe(1);
      const ordT = grab(
        /되는 자리는 (\S+) 자리 하나뿐이다\./,
        l3,
        "36W 자리",
      )[0]!;
      const ORD = ["첫째", "둘째", "셋째", "넷째"];
      expect(ORD.indexOf(ordT) + 1).toBe(P.indexOf(rest) + 1);

      // ⑷ 결론 줄 — 세 값이 서로 맞는가.
      const l5 = lineWith(p.solution, "따라서 $n=", "36W ⑷");
      const [lT, q2T, iT, nT] = grab(
        /따라서 \$n=(\d+)\\times(\d+)\+(\d+)=(\d+)\$이다\./,
        l5,
        "36W 결론",
      );
      expect(num(lT)).toBe(L);
      expect(num(q2T)).toBe(q);
      expect(num(iT)).toBe(P.indexOf(rest) + 1);
      expect(num(nT)).toBe(n);
      checked += 1;
    }
    expect(checked).toBe(120);
  });

  it("`37W` — 통분·절반·나머지 몫을 **대입 검산**으로 다시 재고 세 줄을 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E37, 120)) {
      const [pT, qT, rT] = grab(
        /함께 하면 \$(\d+)\$일, \$\\mathrm\{B\}\$와 \$\\mathrm\{C\}\$가 함께 하면 \$(\d+)\$일, \$\\mathrm\{C\}\$와 \$\\mathrm\{A\}\$가 함께 하면 \$(\d+)\$일/,
        p.content,
        "37W 발문",
      );
      const pp = num(pT);
      const qq = num(qT);
      const rr = num(rT);
      const sol = solveWorkSystem(pp, qq, rr)!;
      const M = lcm2(lcm2(pp, qq), rr);

      // ⑴ 세 식 줄 — 단위분수의 분모가 발문과 같은가.
      const l1 = lineWith(p.solution, "마찬가지로", "37W ⑴");
      const [d1, d2, d3] = grab(
        /\$a\+b=\\dfrac\{1\}\{(\d+)\}\$이고, 마찬가지로 \$b\+c=\\dfrac\{1\}\{(\d+)\}\$, \$c\+a=\\dfrac\{1\}\{(\d+)\}\$이다\./,
        l1,
        "37W 세 식",
      );
      expect([num(d1), num(d2), num(d3)]).toEqual([pp, qq, rr]);

      // ⑵ 통분 줄 — 최소공배수·세 분자·합이 서로 맞는가.
      const l2 = lineWith(p.solution, "최소공배수가", "37W ⑵");
      const [mT, n1, n2, n3, mT2, sT, mT3] = grab(
        /최소공배수가 \$(\d+)\$이므로, 통분하면 \$\\dfrac\{(\d+)\+(\d+)\+(\d+)\}\{(\d+)\}=\\dfrac\{(\d+)\}\{(\d+)\}\$이다\./,
        l2,
        "37W 통분",
      );
      expect(num(mT)).toBe(M);
      expect(num(mT2)).toBe(M);
      expect(num(mT3)).toBe(M);
      expect([num(n1), num(n2), num(n3)]).toEqual([M / pp, M / qq, M / rr]);
      expect(num(n1) + num(n2) + num(n3)).toBe(num(sT));

      // ⑶ 절반 줄 — 「$2$로 나누면」이 정말 반인가.
      const l3 = lineWith(p.solution, "나누면 $a+b+c=", "37W ⑶");
      const [s2, m2, tn, td] = grab(
        /\$\\dfrac\{(\d+)\}\{(\d+)\}\$[을를] \$2\$로 나누면 \$a\+b\+c=\\dfrac\{(\d+)\}\{(\d+)\}\$이다\./,
        l3,
        "37W 절반",
      );
      expect(num(s2)).toBe(num(sT));
      expect(num(m2)).toBe(M);
      expect(num(tn) * 2 * num(m2)).toBe(num(s2) * num(td));
      expect(reduceFraction(sol.a + sol.b + sol.c, sol.d)).toEqual([
        num(tn),
        num(td),
      ]);

      // ⑷ 확인 줄 — 뺀 값이 정말 $c$ 이고 «양수»인가.
      const l4 = lineWith(p.solution, "빼면 $c=", "37W ⑷");
      const [tn2, td2, p2, cn, cd] = grab(
        /\$a\+b\+c=\\dfrac\{(\d+)\}\{(\d+)\}\$에서 \$a\+b=\\dfrac\{1\}\{(\d+)\}\$[을를] 빼면 \$c=\\dfrac\{(\d+)\}\{(\d+)\}\$이고, 이 값이 양수이므로/,
        l4,
        "37W 확인",
      );
      expect([num(tn2), num(td2)]).toEqual([num(tn), num(td)]);
      expect(num(p2)).toBe(pp);
      expect(reduceFraction(sol.c, sol.d)).toEqual([num(cn), num(cd)]);
      expect(num(cn)).toBeGreaterThan(0);

      // ⑸ 말 — 굳힘을 말하는 문장이 살아 있는가.
      expect(p.solution).toContain("변끼리 더하면");
      expect(p.solution).toContain("각각 구하지 않아도 된다");
      checked += 1;
    }
    expect(checked).toBe(120);
  });

  it("`38W` — 금액식·두 경계·창·확인 줄을 **실제 계산**으로 다시 재고 넷을 맞댄다", () => {
    let checked = 0;
    let boundsSeen = 0;
    for (const p of rows(E38, 120)) {
      const [aT, bT, cT] = grab(
        /\$\\mathrm\{A\}\$가 \$(\d+)\$원, \$\\mathrm\{B\}\$가 \$(\d+)\$원, \$\\mathrm\{C\}\$가 \$(\d+)\$원이다\./,
        p.content,
        "38W 값",
      );
      const prices = [num(aT), num(bT), num(cT)];
      const ships = [0, 0, 0];
      for (const m of p.content.matchAll(
        /\$\\mathrm\{([ABC])\}\$는 배송료가 (?:\$(\d+)\$원이|없)/g,
      ))
        ships["ABC".indexOf(m[1]!)] = m[2] === undefined ? 0 : Number(m[2]);
      const shops: Shop[] = prices.map((price, i) => ({
        price,
        ship: ships[i]!,
      }));
      const who = "ABC".indexOf(
        grab(
          /\$\\mathrm\{([ABC])\}\$에서 사는 것이 가장 싸게 되는 자연수/,
          p.content,
          "38W 물음",
        )[0]!,
      );
      const won = soleWinnerXs(shops, who, 400);
      const lo = won[0]!;
      const hi = won[won.length - 1]!;

      // ⑴ 금액식 줄 — 세 가게의 식이 발문의 값과 맞는가.
      const l0 = p.solution.split("\n")[0]!;
      for (let i = 0; i < 3; i += 1) {
        const want =
          shops[i]!.ship === 0
            ? `$${shops[i]!.price}x$원`
            : `$(${shops[i]!.price}x+${shops[i]!.ship})$원`;
        expect(l0, `38W 금액식 ${i}`).toContain(want);
      }

      // ⑵⑶ 두 경계 줄 — **엄격 부등호 판 정수 경계 걸음**(⑷ 1).
      const up = p.solution
        .split("\n")
        .find((l) => /\$\d+x>\d+\$이다\./.test(l))!;
      const down = p.solution
        .split("\n")
        .find((l) => /\$\d+x<\d+\$이다\./.test(l))!;
      const upV = strictBoundFault(up, "up");
      const downV = strictBoundFault(down, "down");
      expect(
        upV.seen && downV.seen,
        `38W 경계 줄을 못 읽었다: ${p.solution}`,
      ).toBe(true);
      expect(upV.fault, up).toBeNull();
      expect(downV.fault, down).toBeNull();
      boundsSeen += 2;
      expect(num(grab(/\$x\\ge(\d+)\$이다\./, up, "38W 아래끝")[0])).toBe(lo);
      expect(num(grab(/\$x\\le(\d+)\$이다\./, down, "38W 위끝")[0])).toBe(hi);

      // ⑷ 창 줄 — 나열(또는 범위) ↔ 개수 산술이 맞는가.
      const l4 = lineWith(p.solution, "그 개수는", "38W 창");
      const [hiT, loT, sizeT] = grab(
        /그 개수는 \$(\d+)-(\d+)\+1=(\d+)\$이다\./,
        l4,
        "38W 개수",
      );
      expect([num(hiT), num(loT), num(sizeT)]).toEqual([hi, lo, won.length]);
      if (won.length <= 8) {
        const listed = [...l4.matchAll(/\$(\d+)\$(?=,|이므로)/g)].map((m) =>
          num(m[1]),
        );
        expect(listed).toEqual(won);
      } else {
        expect(l4).toContain(`$${lo}$부터 $${hi}$까지의 자연수`);
      }

      // ⑸ 확인 줄 — 창 밖의 두 자리에서 «가장 싸지 않다»가 정말 참인가.
      const l5 = lineWith(p.solution, "역시 가장 싸지 않다", "38W 확인");
      const [x1, m1, r1, x2, m2, r2] = grab(
        /\$x=(\d+)\$일 때는 \$\\mathrm\{[ABC]\}\$에서 드는 돈이 \$(\d+)\$원, \$\\mathrm\{[ABC]\}\$에서 드는 돈이 \$(\d+)\$원이므로 \$\\mathrm\{[ABC]\}\$가 가장 싸지 않고, \$x=(\d+)\$일 때는 \$\\mathrm\{[ABC]\}\$에서 드는 돈이 \$(\d+)\$원, \$\\mathrm\{[ABC]\}\$에서 드는 돈이 \$(\d+)\$원이므로 역시 가장 싸지 않다\./,
        l5,
        "38W 확인",
      );
      expect(num(x1)).toBe(lo - 1);
      expect(num(x2)).toBe(hi + 1);
      const costOf = (i: number, x: number): number =>
        shops[i]!.price * x + shops[i]!.ship;
      expect(num(m1)).toBe(costOf(who, lo - 1));
      expect(num(m2)).toBe(costOf(who, hi + 1));
      // 「가장 싸지 않다」는 낱말이 아니라 **값**으로 확인한다.
      expect(num(r1)).toBeLessThan(num(m1));
      expect(num(r2)).toBeLessThan(num(m2));
      expect(cheapestAt(shops, lo - 1)).not.toBe(who);
      expect(cheapestAt(shops, hi + 1)).not.toBe(who);
      checked += 1;
    }
    expect(checked).toBe(120);
    expect(boundsSeen).toBe(240);
  });

  it("`39W` — 약수 나열 ↔ 수관형사 ↔ 절편 나열 ↔ 합을 **넷 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E39, 120)) {
      const [signT, bT] = grab(
        /일차함수 \$y=ax([+-])(\d+)\$의 그래프의/,
        p.content,
        "39W 발문",
      );
      const plus = signT === "+";
      const b = num(bT);
      const divs = divisorsOf(b);
      const values = divs.map((d) => b / d).sort((x, y) => y - x);
      const total = values.reduce((s, v) => s + v, 0);
      const sym = plus ? "-a" : "a";

      // ⑴ 부호 줄 — 「음의 정수」/「양의 정수」가 발문의 부호와 맞는가.
      const l1 = lineWith(p.solution, "정수이", "39W 부호");
      expect(l1).toContain(plus ? "$a$는 음의 정수" : "$a$는 양의 정수");
      expect(l1).toContain("자연수가 될 수 없다");

      // ⑵ 약수 줄 — 나열 ↔ 「$N$개」가 맞는가.
      const l2 = lineWith(p.solution, "의 약수는", "39W 약수");
      const [dlT, cntT, sym2, cnt2T] = grab(
        /의 약수는 (.+?)의 \$(\d+)\$개이므로 \$(-?a)\$가 될 수 있는 값도 이 \$(\d+)\$개이다\./,
        l2,
        "39W 약수",
      );
      expect([...dlT!.matchAll(/\$(\d+)\$/g)].map((m) => num(m[1]))).toEqual(
        divs,
      );
      expect(num(cntT)).toBe(divs.length);
      expect(num(cnt2T)).toBe(divs.length);
      expect(sym2).toBe(sym);

      // ⑶ 절편 줄 — 나열 두 벌이 서로 짝이 맞는가.
      const l3 = lineWith(p.solution, "일 때 $x$절편은 차례로", "39W 절편");
      const [d2T, v2T] = grab(
        /가 차례로 (.+?)일 때 \$x\$절편은 차례로 (.+?)이다\./,
        l3,
        "39W 절편",
      );
      const ds = [...d2T!.matchAll(/\$(\d+)\$/g)].map((m) => num(m[1]));
      const vs = [...v2T!.matchAll(/\$(\d+)\$/g)].map((m) => num(m[1]));
      expect(ds).toEqual(divs);
      expect(vs).toEqual(values);
      for (let k = 0; k < ds.length; k += 1) expect(ds[k]! * vs[k]!).toBe(b);

      // ⑷ 합 줄 — 나열과 합이 서로 맞는가.
      const l4 = lineWith(p.solution, "모든 값의 합은", "39W 합");
      const [sumListT, totalT] = grab(
        /모든 값의 합은 \$([\d+]+)=(\d+)\$이다\./,
        l4,
        "39W 합",
      );
      expect(sumListT!.split("+").map(Number)).toEqual(values);
      expect(num(totalT)).toBe(total);

      // ⑸ 죽는 후보 줄 — 증인이 정말 약수가 아니고 그 분수가 기약인가.
      const l5 = lineWith(p.solution, "약수가 아니면", "39W 증인");
      const [wT] = grab(/이를테면 \$-?a=(\d+)\$/, l5, "39W 증인");
      const w = num(wT);
      expect(b % w).not.toBe(0);
      expect(gcd2(b, w)).toBe(1);
      expect(l5).toContain(`\\dfrac{${b}}{${w}}`);
      checked += 1;
    }
    expect(checked).toBe(120);
  });
});

// ═══════════════════════════════════════════════════════════
// ㄴ. 해설에 나온 **모든 수**가 재계산으로 설명되는가
// ═══════════════════════════════════════════════════════════

/**
 * 발문에서 읽은 값과 **독립 검산이 낳은 값**만 허용한다. 그 밖의 수가 하나라도
 * 있으면 그 수는 아무도 설명하지 못한 것이다 — 3차의 치명 결함(`31U`)이 그 부류였다.
 */
function allowedNumbers(rpmType: string, content: string): Set<number> {
  const ok = new Set<number>([0, 1]);
  const add = (...vs: number[]): void => {
    for (const v of vs) {
      ok.add(v);
      ok.add(-v);
    }
  };
  if (rpmType === "36W") {
    const [blockT, sumT] = grab(
      /\$0\.\\overline\{(\d+)\}\$에 대하여 소수점 아래 첫째 자리부터 \$n\$번째 자리까지의 숫자의 합이 \$(\d+)\$/,
      content,
      "36W 허용값",
    );
    const digits = [...blockT!].map(Number);
    const S = num(sumT);
    const L = digits.length;
    const C = digits.reduce((s, d) => s + d, 0);
    const n = positionsWithRunningSum(digits, S)[0]!;
    add(Number(blockT), S, C, L, n, ...digits, ...partialSums(digits));
    add(Math.floor(S / C), S - Math.floor(S / C) * C, n - (n % L), n % L);
  } else if (rpmType === "37W") {
    const [pT, qT, rT] = grab(
      /함께 하면 \$(\d+)\$일, \$\\mathrm\{B\}\$와 \$\\mathrm\{C\}\$가 함께 하면 \$(\d+)\$일, \$\\mathrm\{C\}\$와 \$\\mathrm\{A\}\$가 함께 하면 \$(\d+)\$일/,
      content,
      "37W 허용값",
    );
    const p = num(pT);
    const q = num(qT);
    const r = num(rT);
    const M = lcm2(lcm2(p, q), r);
    const sol = solveWorkSystem(p, q, r)!;
    add(2, p, q, r, M, M / p, M / q, M / r, M / p + M / q + M / r);
    add(...reduceFraction(sol.a + sol.b + sol.c, sol.d));
    add(...reduceFraction(sol.c, sol.d));
  } else if (rpmType === "38W") {
    const [aT, bT, cT] = grab(
      /\$\\mathrm\{A\}\$가 \$(\d+)\$원, \$\\mathrm\{B\}\$가 \$(\d+)\$원, \$\\mathrm\{C\}\$가 \$(\d+)\$원이다\./,
      content,
      "38W 허용값",
    );
    const prices = [num(aT), num(bT), num(cT)];
    const ships = [0, 0, 0];
    for (const m of content.matchAll(
      /\$\\mathrm\{([ABC])\}\$는 배송료가 (?:\$(\d+)\$원이|없)/g,
    ))
      ships["ABC".indexOf(m[1]!)] = m[2] === undefined ? 0 : Number(m[2]);
    const shops: Shop[] = prices.map((price, i) => ({
      price,
      ship: ships[i]!,
    }));
    const who = "ABC".indexOf(
      grab(
        /\$\\mathrm\{([ABC])\}\$에서 사는 것이 가장 싸게 되는 자연수/,
        content,
        "38W 허용값 물음",
      )[0]!,
    );
    const won = soleWinnerXs(shops, who, 400);
    const lo = won[0]!;
    const hi = won[won.length - 1]!;
    add(...prices, ...ships, won.length, ...won, lo - 1, hi + 1);
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        if (i === j) continue;
        add(Math.abs(prices[i]! - prices[j]!), Math.abs(ships[i]! - ships[j]!));
        add(
          ...reduceFraction(
            Math.abs(ships[i]! - ships[j]!),
            Math.abs(prices[i]! - prices[j]!) || 1,
          ),
        );
      }
      for (const x of [lo - 1, hi + 1])
        add(shops[i]!.price * x + shops[i]!.ship);
    }
  } else {
    const [signT, bT] = grab(
      /일차함수 \$y=ax([+-])(\d+)\$의 그래프의/,
      content,
      "39W 허용값",
    );
    void signT;
    const b = num(bT);
    const divs = divisorsOf(b);
    add(b, divs.length, ...divs, ...divs.map((d) => b / d));
    add(divs.map((d) => b / d).reduce((s, v) => s + v, 0));
    for (let d = 2; d <= b; d += 1) {
      if (b % d === 0 || gcd2(b, d) !== 1) continue;
      add(d);
      break;
    }
  }
  return ok;
}

describe("중2 확대 갈래 4차 — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  for (const e of M2_TOP_4) {
    it(`${e.rpmType} — 발문과 독립 검산이 낳은 값만 지면에 있다`, () => {
      let seen = 0;
      for (const p of rows(e, 120)) {
        const ok = allowedNumbers(e.rpmType, p.content);
        const nums = mathIntegers(p.solution);
        seen += nums.length;
        const bad = nums.filter((v) => !ok.has(v));
        expect(bad, `${e.rpmType} 설명 안 되는 수: ${p.solution}`).toEqual([]);
      }
      // 자가 무언가를 실제로 봤는가 — 0 은 «깨끗»이 아니라 «못 셈»이다.
      expect(seen, `${e.rpmType} 훑은 수`).toBeGreaterThan(1000);
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 찍기로 맞을 수 있는가 · ㉡ 굳힘을 지우면 답이 바뀌는가
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 4차 — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`36W` — 후보 목록이 **없다**(값이 하나로 굳는다). 대신 두 어림이 늘 빗나간다", () => {
    for (const p of rows(E36, 200)) {
      const S = p.facts.sum!;
      const L = p.facts.len!;
      const C = p.facts.cycle!;
      const n = p.facts.x!;
      for (const est of [(S * L) / C, S / L]) {
        expect(Math.floor(est), p.content).not.toBe(n);
        expect(Math.round(est), p.content).not.toBe(n);
        expect(Math.ceil(est), p.content).not.toBe(n);
      }
    }
  });

  it("`37W` — 후보 목록이 **없다**. 「반으로 나누기」를 빠뜨린 값이 늘 다르다", () => {
    for (const p of rows(E37, 200)) {
      const naive = combinedDaily(p.facts.p!, p.facts.q!, p.facts.r!, false)!;
      expect([naive[0], naive[1]], p.content).not.toEqual([
        p.facts.x!,
        p.facts.den!,
      ]);
    }
  });

  it("`38W` — 답이 **개수**라 목록의 어느 자리도 답이 아니다 (창의 두 끝과도 다른가)", () => {
    const sizes = new Set<number>();
    let sameAsEnd = 0;
    for (const p of rows(E38, 200)) {
      sizes.add(p.facts.x!);
      if (p.facts.x === p.facts.lo || p.facts.x === p.facts.hi) sameAsEnd += 1;
    }
    // 개수가 씨앗마다 실제로 흔들려야 한다 — 늘 같으면 세지 않고도 맞힌다.
    expect(sizes.size).toBeGreaterThan(10);
    // 창의 끝을 그대로 읽어도 답이 되는 자리가 절반을 넘으면 «세기»가 장식이다.
    expect(sameAsEnd / 200).toBeLessThan(0.3);
  });

  it("`39W` — 후보가 **여럿 살아남고** 답은 그 합이라 한 자리를 집으면 틀린다", () => {
    for (const p of rows(E39, 200)) {
      const values = naturalIntercepts(p.facts.b!);
      expect(values.length).toBeGreaterThanOrEqual(4);
      expect(values[0], p.content).not.toBe(p.facts.x);
      expect(values[values.length - 1], p.content).not.toBe(p.facts.x);
      expect(values.length, p.content).not.toBe(p.facts.x);
    }
  });
});

describe("중2 확대 갈래 4차 — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`36W` — 「나머지를 부분합에서 되찾는 걸음」을 지우면 답이 짧아진다", () => {
    for (const p of rows(E36, 200)) {
      const digits = [...String(p.facts.block!)].map(Number);
      expect(digitsUsed(digits, p.facts.sum!), p.content).toBe(p.facts.x);
      const erased = digitsUsed(digits, p.facts.sum!, false);
      expect(erased, p.content).not.toBe(p.facts.x);
      expect(erased).toBe(p.facts.times! * p.facts.len!);
    }
  });

  it("`37W` — 「변끼리 더하면 좌변이 두 배」를 지우면 답이 두 배가 된다", () => {
    for (const p of rows(E37, 200)) {
      const truth = combinedDaily(p.facts.p!, p.facts.q!, p.facts.r!)!;
      expect(truth).toEqual([p.facts.x, p.facts.den]);
      const erased = combinedDaily(p.facts.p!, p.facts.q!, p.facts.r!, false)!;
      expect(erased[0] * truth[1]).toBe(2 * truth[0] * erased[1]);
    }
  });

  it("`38W` — 「두 쌍을 다 견주기」를 지우고 한 쌍만 보면 개수가 달라진다", () => {
    for (const p of rows(E38, 120)) {
      const shops: [number, number][] = [
        [p.facts.p0!, p.facts.s0!],
        [p.facts.p1!, p.facts.s1!],
        [p.facts.p2!, p.facts.s2!],
      ];
      const who = p.facts.ask!;
      const all = winningCounts(shops, who, 400);
      expect(all.length, p.content).toBe(p.facts.x);
      for (const foe of [p.facts.freeIdx!, p.facts.cheapIdx!]) {
        const half = winningCounts(shops, who, 400, [foe]);
        expect(half.length, `${p.content} (상대 ${foe})`).not.toBe(p.facts.x);
      }
    }
  });

  it("`39W` — 「$x$절편이 자연수」를 「정수」로 늦추면 합이 $0$ 이 된다", () => {
    for (const p of rows(E39, 200)) {
      const tight = naturalIntercepts(p.facts.b!).reduce((s, v) => s + v, 0);
      expect(tight, p.content).toBe(p.facts.x);
      const loose = naturalIntercepts(p.facts.b!, false).reduce(
        (s, v) => s + v,
        0,
      );
      expect(loose).toBe(0);
      expect(loose, p.content).not.toBe(p.facts.x);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수 — 손으로 푼 값으로 눈금을 맞춘다
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 4차 — 굳힘 함수", () => {
  it("`digitsUsed` 는 나머지를 부분합에서 실제로 되찾는다", () => {
    // $0.\overline{12847}$, 합 $91=4\times22+3$ → 부분합 $1,3,11,15$ 에서 $3$ 은 둘째.
    expect(digitsUsed([1, 2, 8, 4, 7], 91)).toBe(22);
    expect(digitsUsed([1, 2, 8, 4, 7], 91, false)).toBe(20);
    expect(digitsUsed([1, 2, 8, 4, 7], 88)).toBe(20); // 나머지 $0$ — 마디 끝
    // 마디에 $0$ 이 있으면 부분합이 평평해 되찾을 수 없다.
    expect(digitsUsed([1, 0, 3], 4)).toBeNull();
    expect(partialSums([1, 2, 8, 4, 7])).toEqual([1, 3, 11, 15, 22]);
    expect(isPrimitiveCycle([1, 2, 1, 2])).toBe(false);
    expect(isPrimitiveCycle([1, 2, 8, 4, 7])).toBe(true);
  });

  it("`combinedDaily` 는 세 식을 더해 반으로 나눈다 (손 실측)", () => {
    // $\frac16+\frac19+\frac1{12}=\frac{13}{36}$, 절반은 $\frac{13}{72}$.
    expect(combinedDaily(6, 9, 12)).toEqual([13, 72]);
    expect(combinedDaily(6, 9, 12, false)).toEqual([13, 36]);
    // $\frac13+\frac16=\frac12$ 이라 $\mathrm{C}$ 의 몫이 $0$ — 그런 상황이 없다.
    expect(combinedDaily(2, 3, 6)).toBeNull();
  });

  it("`winningCounts` 는 세 가게를 실제로 견준다 (손 실측)", () => {
    const shops: [number, number][] = [
      [1800, 0],
      [1200, 1000],
      [1000, 2500],
    ];
    expect(winningCounts(shops, 1, 30)).toEqual([2, 3, 4, 5, 6, 7]);
    // 한 쌍만 견주면 창이 한쪽으로 열린다.
    expect(winningCounts(shops, 1, 30, [0])).toEqual(
      Array.from({ length: 29 }, (_v, i) => i + 2),
    );
    expect(winningCounts(shops, 1, 30, [2])).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("`naturalIntercepts` 는 부호 조건을 실제로 본다 (손 실측)", () => {
    expect(divisorsOf(45)).toEqual([1, 3, 5, 9, 15, 45]);
    expect(naturalIntercepts(45)).toEqual([45, 15, 9, 5, 3, 1]);
    expect(naturalIntercepts(45).reduce((s, v) => s + v, 0)).toBe(78);
    expect(naturalIntercepts(45, false).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it("`objectParticle` 은 낱말의 받침을 **음절 코드**에서 계산한다 (손 목록이 아니다)", () => {
    expect(hasFinalConsonant("공책")).toBe(true);
    expect(hasFinalConsonant("자루")).toBe(false);
    expect(objectParticle("공책")).toBe("을");
    expect(objectParticle("자루")).toBe("를");
    expect(objectParticle("장")).toBe("을");
    expect(objectParticle("개")).toBe("를");
    expect(objectParticle("머그컵")).toBe("을");
    expect(objectParticle("손수건")).toBe("을");
  });

  it("`reduceFraction` 은 늘 기약이고 분모가 양수다", () => {
    expect(reduceFraction(50, 4)).toEqual([25, 2]);
    expect(reduceFraction(13, 72)).toEqual([13, 72]);
    expect(reduceFraction(3, -6)).toEqual([-1, 2]);
  });
});

// ═══════════════════════════════════════════════════════════
// 이 파일의 자가 «아니오» 를 낼 수 있는가 — 검사기의 눈금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 4차 — 검사기 자신의 눈금", () => {
  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("따라서 $n=5\\times6+2=32$이다.")).toEqual([]);
    expect(arithmeticFaults("따라서 $n=5\\times6+2=31$이다.")).toHaveLength(1);
    expect(arithmeticFaults("합은 $1+2+8+4+7=22$이다.")).toEqual([]);
    expect(arithmeticFaults("합은 $1+2+8+4+7=23$이다.")).toHaveLength(1);
    expect(arithmeticFaults("개수는 $16-8+1=9$이다.")).toEqual([]);
    expect(arithmeticFaults("개수는 $16-8+1=8$이다.")).toHaveLength(1);
    // 문자가 섞인 식은 이 자의 몫이 아니다 — 조용히 통과시키지 않고 **안 센다**.
    expect(arithmeticClaims("$1200x+2000<1900x$이다.")).toBe(0);
    expect(arithmeticClaims("합은 $1+2+8+4+7=22$이다.")).toBe(1);
  });

  it("`unreducedFractions` 는 약분 안 한 분수를 잡는다", () => {
    expect(unreducedFractions("$\\dfrac{13}{72}$")).toEqual([]);
    expect(unreducedFractions("$\\dfrac{50}{4}$")).toEqual(["50/4"]);
    expect(unreducedFractions("$\\dfrac{6}{36}+\\dfrac{4}{36}$")).toHaveLength(
      2,
    );
  });

  it("🔴 `strictBoundFault` — 엄격 부등호에서 「자연수」 걸음을 건너뛰면 잡는다", () => {
    const good =
      "$700x>2000$이다. $2000$을 $700$으로 나누면 $\\dfrac{20}{7}$이므로 $x>\\dfrac{20}{7}$이고, $x$는 자연수이므로 $x\\ge3$이다.";
    expect(strictBoundFault(good, "up")).toEqual({ fault: null, seen: true });
    // 분수를 안 적고 정수로 뛰었다 — 쓴 대로 읽으면 거짓 함의다.
    const skipped = "$700x>2000$이다. 그러므로 $x\\ge3$이다.";
    expect(strictBoundFault(skipped, "up").fault).not.toBeNull();
    // 올림을 잘못했다.
    const wrong =
      "$700x>2000$이다. $2000$을 $700$으로 나누면 $\\dfrac{20}{7}$이므로 $x>\\dfrac{20}{7}$이고, $x$는 자연수이므로 $x\\ge2$이다.";
    expect(strictBoundFault(wrong, "up").fault).not.toBeNull();
    // 경계가 정수면 동점이 난다.
    const tie =
      "$700x>1400$이다. $1400$을 $700$으로 나누면 $\\dfrac{2}{1}$이므로 $x>2$이고, $x$는 자연수이므로 $x\\ge3$이다.";
    expect(strictBoundFault(tie, "up").fault).not.toBeNull();
    // 이 자가 볼 것이 없는 줄에서는 **판정하지 않는다**(0 을 «깨끗»으로 읽지 않게).
    expect(strictBoundFault("$x\\ge3$이다.", "up")).toEqual({
      fault: null,
      seen: false,
    });
    const down =
      "$300x<5500$이다. $5500$을 $300$으로 나누면 $\\dfrac{55}{3}$이므로 $x<\\dfrac{55}{3}$이고, $x$는 자연수이므로 $x\\le18$이다.";
    expect(strictBoundFault(down, "down")).toEqual({ fault: null, seen: true });
    expect(
      strictBoundFault(down.replace("$x\\le18$", "$x\\le19$"), "down").fault,
    ).not.toBeNull();
  });

  it("`positionsWithRunningSum` 은 자리가 둘인 마디를 실제로 둘로 센다", () => {
    expect(positionsWithRunningSum([1, 2, 8, 4, 7], 91)).toEqual([22]);
    // $0.\overline{12047}$ 은 셋째 자리가 $0$ 이라 합 $17$ 이 두 자리에서 난다.
    expect(positionsWithRunningSum([1, 2, 0, 4, 7], 17)).toEqual([7, 8]);
  });

  it("`cheapestAt` 은 동점을 «판정 불가»로 낸다", () => {
    const shops: Shop[] = [
      { price: 1800, ship: 0 },
      { price: 1200, ship: 1200 },
      { price: 1000, ship: 2500 },
    ];
    expect(cheapestAt(shops, 2)).toBeNull(); // $3600=3600$
    expect(cheapestAt(shops, 1)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 4차 — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `38W` 배송료 줄이 「$8000$원고」가 아니라 「$8000$원이고」다", () => {
    for (const p of rows(E38, 200)) {
      expect(p.content, "첫 판이 「원고」였다").not.toMatch(/\$원고/);
      expect(p.content).not.toMatch(/\d\$원고/);
      expect(p.content).toMatch(/배송료가 (없고|없다|\$\d+\$원이[고다])/);
    }
  });

  it("⑵ 🔴 `39W` 의 「$\\dfrac{b}{d}$은/는」이 **분자의 읽기**를 따른다", () => {
    // 첫 판이 「는」으로 굳어 있어 $346$(육 → 받침)에서 어긋났다. 공용 조사 자가 잡았다.
    let seen = 0;
    for (const p of rows(E39, 200)) {
      const m = /\\dfrac\{(\d+)\}\{\d+\}\$(은|는)/.exec(p.solution);
      expect(m, p.solution).not.toBeNull();
      const b = Number(m![1]);
      const want = [2, 4, 5, 9].includes(b % 10) ? "는" : "은";
      expect(m![2], `$${b}$ 뒤`).toBe(want);
      seen += 1;
    }
    expect(seen).toBe(200);
  });

  it("⑶ 🔴 `37W` 발문이 「주어져 있지 않다」고 **단언하지 않는다**", () => {
    // 세 식으로 $a$, $b$, $c$ 는 사실 하나로 정해진다 — 「없다」고 쓰면 거짓이다.
    // 「구하지 않는다」는 참이고, 학생에게 어디를 보라는 뜻이 된다.
    for (const p of rows(E37, 60)) {
      expect(p.content).not.toContain("주어져 있지 않다");
      expect(p.content).toContain("며칠이 걸리는지는 구하지 않는다");
    }
  });

  it("⑷ 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나간다", () => {
    for (const e of M2_TOP_4)
      for (const p of rows(e, 40)) {
        for (const t of [p.content, p.answer, p.solution])
          expect(t, e.rpmType).not.toContain("**");
      }
  });

  it("⑸ 🔴 정답에 「가지」를 붙이지 않는다 — 공용 조사 자가 단위 명사를 조사로 읽는다", () => {
    // 3차 `38V` 가 이 자리를 피해 갔다. `38W` 는 「개」로 비켜 간다.
    for (const p of rows(E38, 60)) {
      expect(p.answer).toMatch(/^\$\d+\$개$/);
      expect(p.answer).not.toContain("가지");
      expect(josaMismatches(p.answer)).toEqual([]);
    }
  });

  it("⑹ 🔴 `36W` 의 순환마디에 $0$ 이 없다 — 있으면 $n$ 이 정해지지 않는다", () => {
    for (const p of rows(E36, 200)) {
      const digits = [...String(p.facts.block!)].map(Number);
      expect(digits.length).toBe(p.facts.len);
      expect(Math.min(...digits), p.content).toBeGreaterThanOrEqual(1);
      expect(positionsWithRunningSum(digits, p.facts.sum!)).toHaveLength(1);
    }
  });

  it("⑺ 🔴 `38W` 의 창이 **양쪽에서** 닫힌다 (정찰의 예시가 위로 안 닫혔다)", () => {
    for (const p of rows(E38, 120)) {
      const shops: Shop[] = [
        { price: p.facts.p0!, ship: p.facts.s0! },
        { price: p.facts.p1!, ship: p.facts.s1! },
        { price: p.facts.p2!, ship: p.facts.s2! },
      ];
      const won = soleWinnerXs(shops, p.facts.ask!, 400);
      expect(won[0], p.content).toBeGreaterThanOrEqual(2);
      expect(won[won.length - 1], p.content).toBeLessThan(200);
      expect(cheapestAt(shops, won[0]! - 1)).not.toBe(p.facts.ask);
      expect(cheapestAt(shops, won[won.length - 1]! + 1)).not.toBe(p.facts.ask);
      // 배송료 없는 가게는 «가운데 창»을 가질 수 없다 — 물은 가게가 그것이면 안 된다.
      expect(shops[p.facts.ask!]!.ship).toBeGreaterThan(0);
    }
  });

  it("⑻ 🔴 `38W` 의 역할이 자리마다 **섞인다** — 「$\\mathrm{A}$ 가 늘 아래끝을 준다」면 견줄 까닭이 없다", () => {
    const asked = new Set<number>();
    const free = new Set<number>();
    const cheap = new Set<number>();
    for (const p of rows(E38, 200)) {
      asked.add(p.facts.ask!);
      free.add(p.facts.freeIdx!);
      cheap.add(p.facts.cheapIdx!);
      // 세 역할이 서로 다른 자리에 있어야 한다.
      expect(
        new Set([p.facts.ask, p.facts.freeIdx, p.facts.cheapIdx]).size,
      ).toBe(3);
    }
    expect(asked, "물은 가게가 한 자리에 고정됐다").toEqual(new Set([0, 1, 2]));
    expect(free, "배송료 없는 가게가 한 자리에 고정됐다").toEqual(
      new Set([0, 1, 2]),
    );
    expect(cheap, "단가가 가장 싼 가게가 한 자리에 고정됐다").toEqual(
      new Set([0, 1, 2]),
    );
  });

  it("⑼ 🔴 `39W` 가 두 부호를 **둘 다** 낸다 — 한쪽만 나면 「버리는 걸음」이 한 방향뿐이다", () => {
    const signs = new Set<number>();
    for (const p of rows(E39, 200)) signs.add(p.facts.plus!);
    expect(signs).toEqual(new Set([0, 1]));
  });

  it("⑽ 🔴 `36W` 가 마디 길이 셋을 **다** 낸다 — 하나로 굳으면 나열 줄이 늘 같아진다", () => {
    const lens = new Set<number>();
    for (const p of rows(E36, 200)) lens.add(p.facts.len!);
    expect(lens).toEqual(new Set([3, 4, 5]));
  });
});
