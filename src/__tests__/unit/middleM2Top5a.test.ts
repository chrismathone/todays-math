/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5a.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `101X` | 갈래 **셋**의 분자를 공통분모 $D$ 위에서 만들어 더한다 | 갈래를 안 센다 — 세 사람의 성공·실패를 **$2^3=8$ 가지로 전부 펼쳐** 각 갈래의 확률을 유리수로 곱하고, 성공한 사람이 **정확히 둘**인 것만 더한다. 「정확히 두 명」이 몇 갈래인지도 이 훑기가 답한다 |
 * | `102X` | 둘레의 비 $\ell:L$ 를 기약으로 줄여 $\overline{\mathrm{AB}}$ 에 곱한다 | 비를 **한 번도 안 줄인다** — $\overline{\mathrm{AD}}$ 를 $1$ 부터 $\overline{\mathrm{AB}}-1$ 까지 **전부 넣어 보고** $\overline{\mathrm{AD}}\times L=\ell\times\overline{\mathrm{AB}}$ 가 되는 것만 모은다. 그것이 **하나뿐인지**까지 이 훑기가 답한다 |
 * | `103X` | 두 식을 변끼리 더해 $y$ 를 얻고 대입해 $x$ 를 얻는다 | 식을 **한 줄도 안 세운다** — $x$ 를 $1$ 부터 두 그릇의 양 가운데 작은 것까지 **전부 넣어 보고**, 바꾸어 넣은 뒤 두 그릇의 농도를 유리수로 만들어 **정말 같은지 확인**한다. 해가 하나뿐인지도 이 훑기가 답한다 |
 * | `104X` | 최대공약수로 줄인 $t$ 의 배수를 범위 안에서 고른다 | 최대공약수를 **한 번도 안 구한다** — $a$ 를 $1$ 부터 넉넉한 위끝까지 **전부 넣어 보고** 삼각형 부등식 **셋을 따로** 확인한 뒤 $\overline{\mathrm{AB}}\times a$ 가 $\overline{\mathrm{AB}}+\overline{\mathrm{AC}}$ 로 나누어떨어지는 것만 모은다. 훑는 범위가 $b+c$ 를 크게 넘으므로 「모두」라는 주장이 **범위 밖에서 반증되지 않는다**는 것까지 확인된다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * 🔴 그리고 음성 눈금은 **자기 축을 홀로 갈라야** 한다. 그래서 던지는 말을 축마다
 * 다르게 두고, 눈금이 **그 말을 그대로 맞대게** 했다 — 다른 검사가 먼저 물면 말이
 * 달라져 **빨개진다**(4차가 여덟 자리에서 「이 눈금이 그 축을 재고 있다」가 거짓임을
 * 찾아낸 자리다).
 *
 * ## ⑶ 🔴 앞 물결이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**을 뽑아 좌·우를 각각 계산해 맞댄다. 공식을 옮겨
 *       적는 게 아니라 **산술을 하는 것**이라 동어반복이 아니다. `\dfrac`·`\times`·
 *       `\div`·괄호를 읽는 **작은 파서**를 여기 따로 들고 있다.
 *   ㄴ. **해설에 나온 모든 수가 재계산으로 설명되는가** — 발문에서 읽은 값과 독립
 *       검산이 낳은 값만 허용하고, 그 밖의 수가 하나라도 있으면 빨개진다.
 *   ㄷ. **해설의 «말»** — 「동시에 일어날 수 없」·「모두 같은 비」·「서로 지워져」·
 *       「배수」·「서로소」·「삼각형이 만들어지지 않으므로 버린다」를 **옳은 쪽이 있고
 *       뒤집힌 쪽이 없는가**로 잰다(㉳). 낱말을 뒤집으면 빨개지는 눈금을 같이 둔다.
 *   ㄹ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아닌가.
 *   ㅁ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 한 단(964.8px)이
 *       아니라 **700px** 아래로 잠근다.
 *   ㅂ. **제약을 스스로 어기지 않는가**(㉴) — `104X` 가 적은 범위 안에 나열한 값이
 *       **전부** 들어 있고, 버리는 값은 **밖**에 있는가.
 *   ㅅ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 🔴 **`101X` 의 파생 오답이 확률 $1$ 을 넘는 것을 공용 자가 못 본다.** ㉱ 의
 *    `declaredUpperBound` 는 「전체를 $1$ 로 놓고」류의 **말**을 찾는데, 확률 문항은
 *    그런 말을 안 하고도 답이 $1$ 이하여야 한다. 그 자는 넷 전량에서 `null` 을 내고
 *    (아래 검사가 그것을 못 박는다), 대신 **이 파일이 몇 %가 $1$ 을 넘는지 직접 센다** —
 *    실측 400판·2,000보기에서 **6개(0.3%)** 다. 고치려면 공용 `deriveFormats` 를
 *    손대야 하므로 **리드의 몫**이다(이 갈래는 남의 파일을 안 고친다).
 * 2. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은
 *    재지만 설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로
 *    눈으로 읽었고, 그때 고친 자리(「성공하는 확률」 → 「성공할 확률」 · 「$4$가므로」 →
 *    「최대공약수가 $4$이므로」 · 「$3$을 $5$는 서로소」 → 「$3$과 $5$는 서로소」)를
 *    아래 회귀 잠금에 남긴다.
 * 3. `103X` 의 검산은 **정수 산술**이라 부동소수 티끌이 없다(양변에 $100PQ$ 를 곱한
 *    꼴로 견준다). `101X` 의 확률만 유리수를 정수 분자·분모로 들고 다닌다.
 * 4. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 * 5. 「이 네 소단원에 확대 갈래가 없었다」는 **색인 유형에 대해서만** 확인한다 —
 *    다른 갈래가 같은 소단원에 확장 유형을 더하는 날 거짓 경보가 나지 않게 했다.
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
  bisectorNaturalBases,
  exactlyTwoProbability,
  M2_TOP_5A,
  reduceFraction,
  segmentFromPerimeters,
  swapAmount,
} from "@/lib/middle/m2Top5a";
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
/** 🔴 쏠림은 **씨앗 블록 넷**으로 잰다 — 한 블록만 보면 여유를 낙관적으로 적는다(4차 ㉴). */
const SEED_BLOCKS = [20260905, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260905, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5A.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E101 = entryOf("101X");
const E102 = entryOf("102X");
const E103 = entryOf("103X");
const E104 = entryOf("104X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "101X": "심화상",
  "102X": "심화중",
  "103X": "심화중",
  "104X": "심화상",
};

/** 한 판에 **산술 등식이 몇 개** 나오는가 — 실측값(0 은 «깨끗»과 «못 셈»을 안 가른다). */
const ARITH_FLOOR: Record<string, number> = {
  "101X": 6,
  "102X": 2,
  "103X": 7,
  "104X": 1,
};

/** 리드가 소단원마다 실측해 준 **변형 폭 최소치**. */
const FLOOR: Record<string, number> = {
  "101X": 5,
  "102X": 9,
  "103X": 12,
  "104X": 12,
};

/** 유형이 붙는 소단원 — 이름은 아래에서 단원 정본에 **대조**한다. */
const SECTION_OF: Record<string, string> = {
  "101X": "확률의 계산",
  "102X": "삼각형에서 평행선 사이의 선분의 길이의 비",
  "103X": "연립방정식의 활용(농도, 비율, 합금)",
  "104X": "삼각형의 각의 이등분선",
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

/** 답 문자열에서 `$` 만 걷어 낸 것 — 검산기가 이 꼴로 답을 다시 짓는다. */
function plainAnswer(answer: string): string {
  return answer.replace(/\$/g, "");
}

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, text: string, who: string): string[] {
  const m = re.exec(text);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${text}`);
  return m.slice(1);
}

const num = (s: string | undefined): number => Number(s);

/** ⚠️ 제품의 `reduceFraction` 을 **안 쓴다** — 검산이 제품을 부르면 동어반복이다. */
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

function redFrac(n: number, d: number): [number, number] {
  const g = gcd2(n, d) || 1;
  return [n / g, d / g];
}

// ── ㄱ. 해설의 **모든 산술 등식**을 좌·우 따로 계산한다 ──────
//
// ⚠️ 4차의 자는 정수·`+`·`-`·`\times` 만 읽었다. 이 물결의 지면에는 `\dfrac`·`\div`·
//    괄호가 들어가므로 그 자를 그대로 쓰면 **구조적으로 0** 이 되는 자리가 생긴다.
//    그래서 아주 작은 파서를 여기 따로 둔다(제품 코드를 안 부른다 — 산술을 여기서
//    직접 한다).

/** `42\times\dfrac{5}{7}` 처럼 순수 산술인 조각의 값. 아니면 `null`. */
export function evalArith(src: string): number | null {
  let s = src.replace(/\\,/g, "").replace(/\\mathrm\{[^}]*\}/g, "");
  s = s.replace(/\\d?frac\{(-?\d+)\}\{(-?\d+)\}/g, "($1/$2)");
  s = s.replace(/\\times/g, "*").replace(/\\div/g, "/");
  s = s.replace(/\s+/g, "");
  if (s === "" || !/^[-+*/().\d]+$/.test(s)) return null;
  let i = 0;
  const peek = (): string | undefined => s[i];
  const factor = (): number | null => {
    if (peek() === "+") {
      i += 1;
      return factor();
    }
    if (peek() === "-") {
      i += 1;
      const v = factor();
      return v === null ? null : -v;
    }
    if (peek() === "(") {
      i += 1;
      const v = expr();
      if (peek() !== ")") return null;
      i += 1;
      return v;
    }
    const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const term = (): number | null => {
    let v = factor();
    while (v !== null && (peek() === "*" || peek() === "/")) {
      const op = peek();
      i += 1;
      const r = factor();
      if (r === null) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  };
  function expr(): number | null {
    let v = term();
    while (v !== null && (peek() === "+" || peek() === "-")) {
      const op = peek();
      i += 1;
      const r = term();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const v = expr();
  return i === s.length ? v : null;
}

/** 해설에 적힌 산술 등식 가운데 **좌변과 우변이 다른** 것. */
export function arithmeticFaults(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const body = m[1]!;
    if (!body.includes("=")) continue;
    const vals: number[] = [];
    for (const part of body.split("=")) {
      const v = evalArith(part);
      if (v !== null) vals.push(v);
    }
    if (vals.length < 2) continue;
    for (const v of vals)
      if (Math.abs(v - vals[0]!) > 1e-9)
        out.push(`${body} (${vals.join(" ≠ ")})`);
  }
  return out;
}

/** 이 자가 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다. */
function arithmeticClaims(text: string): number {
  let seen = 0;
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const body = m[1]!;
    if (!body.includes("=")) continue;
    let vals = 0;
    for (const part of body.split("=")) if (evalArith(part) !== null) vals += 1;
    if (vals >= 2) seen += 1;
  }
  return seen;
}

// ── ㄹ. 기약 ───────────────────────────────────────────────

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아니거나 분모가 $1$ 인** 것. */
export function unreducedFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b === 1 || gcd2(a, b) !== 1) out.push(`${a}/${b}`);
  }
  return out;
}

/** 이 자가 **몇 개를 봤는가**. */
function fractionCount(text: string): number {
  return [...text.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g)].length;
}

/** `$...$` 안에 적힌 정수 전부. */
function mathIntegers(text: string): number[] {
  const out: number[] = [];
  for (const span of text.matchAll(/\$([^$]*)\$/g))
    for (const n of span[1]!.matchAll(/\d+/g)) out.push(Number(n[0]));
  return out;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 * 그 자는 을/를·은/는·와/과·가만 본다. 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다(일·칠·팔은 받침이 있어도 「로」).
 *
 * ⚠️ 규칙을 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 동어반복이 된다.
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

/** **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참. */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

// ═══════════════════════════════════════════════════════════
// 🔴 검산기 — 인자가 **`content` 하나**다
// ═══════════════════════════════════════════════════════════

/**
 * `101X` — 세 사람의 성공·실패를 **$2^3$ 가지로 전부 펼쳐** 확률을 다시 만든다.
 * 갈래가 셋이라는 것을 **쓰지 않고** 「성공이 정확히 둘」인 것만 모은다.
 */
export function verifyExactlyTwo(content: string): string {
  const g = grab(
    /확률이 각각 \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$이다/,
    content,
    "101X",
  );
  const hit = [num(g[0]), num(g[2]), num(g[4])];
  const all = [num(g[1]), num(g[3]), num(g[5])];
  for (let z = 0; z < 3; z += 1) {
    if (!(hit[z]! >= 1 && hit[z]! < all[z]!))
      throw new Error("101X 불변식: 확률이 $0$ 과 $1$ 사이가 아니다");
    if (gcd2(hit[z]!, all[z]!) !== 1)
      throw new Error("101X 불변식: 발문의 분수가 기약이 아니다");
  }
  const keys = new Set([0, 1, 2].map((z) => `${hit[z]}/${all[z]}`));
  if (keys.size !== 3)
    throw new Error("101X 불변식: 세 확률이 서로 다르지 않다");
  const den = all[0]! * all[1]! * all[2]!;
  let numer = 0;
  for (let mask = 0; mask < 8; mask += 1) {
    let ones = 0;
    let term = 1;
    for (let z = 0; z < 3; z += 1) {
      const on = (mask >> z) & 1;
      ones += on;
      term *= on === 1 ? hit[z]! : all[z]! - hit[z]!;
    }
    if (ones === 2) numer += term;
  }
  if (numer <= 0 || numer >= den)
    throw new Error("101X 불변식: 확률이 $0$ 과 $1$ 사이가 아니다");
  const [p, q] = redFrac(numer, den);
  return `\\dfrac{${p}}{${q}}`;
}

/**
 * `102X` — 비를 **한 번도 안 줄이고** $\overline{\mathrm{AD}}$ 를 전부 넣어 본다.
 * $\overline{\mathrm{AD}}\times L=\ell\times\overline{\mathrm{AB}}$ 가 되는 자연수가
 * **하나뿐**인지까지 여기서 답한다.
 */
export function verifyPerimeterSegment(content: string): string {
  const g = grab(
    /\$\\triangle ABC\$의 둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, \$\\triangle ADE\$의 둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$이고 \$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$일 때/,
    content,
    "102X",
  );
  const whole = num(g[0]);
  const small = num(g[1]);
  const ab = num(g[2]);
  if (small >= whole)
    throw new Error("102X 불변식: 작은 삼각형의 둘레가 더 짧지 않다");
  if (ab * 2 >= whole)
    throw new Error("102X 불변식: 한 변이 둘레의 절반보다 짧지 않다");
  const found: number[] = [];
  for (let ad = 1; ad < ab; ad += 1) {
    if (ad * whole === small * ab) found.push(ad);
  }
  if (found.length !== 1)
    throw new Error(
      `102X 불변식: $\\overline{AD}$ 가 자연수인 자리가 ${found.length}개다`,
    );
  return `${ab - found[0]!}\\,\\mathrm{cm}`;
}

/**
 * `103X` — 식을 **한 줄도 안 세우고** 덜어 낼 양을 전부 넣어 본다.
 * 바꾸어 넣은 뒤 두 그릇의 농도가 정말 같은지를 **정수 곱셈**으로 견준다
 * (양변에 분모를 곱한 꼴이라 부동소수 티끌이 없다).
 */
export function verifySwapAmount(content: string): string {
  const g = grab(
    /\$\\mathrm\{A\}\$ 그릇에는 \$(\d+)\\%\$의 [가-힣]+ \$(\d+)\\,\\mathrm\{g\}\$이, \$\\mathrm\{B\}\$ 그릇에는 \$(\d+)\\%\$의 [가-힣]+ \$(\d+)\\,\\mathrm\{g\}\$이 들어 있다/,
    content,
    "103X",
  );
  const a = num(g[0]);
  const P = num(g[1]);
  const b = num(g[2]);
  const Q = num(g[3]);
  if (a === b) throw new Error("103X 불변식: 두 농도가 같다");
  const found: number[] = [];
  const cap = Math.min(P, Q);
  for (let x = 1; x < cap; x += 1) {
    // $\dfrac{a(P-x)+bx}{P}=\dfrac{b(Q-x)+ax}{Q}$ 를 정수 곱으로 견준다.
    if (Q * (a * (P - x) + b * x) === P * (b * (Q - x) + a * x)) found.push(x);
  }
  if (found.length !== 1)
    throw new Error(`103X 불변식: 농도가 같아지는 양이 ${found.length}개다`);
  return `${found[0]!}\\,\\mathrm{g}`;
}

/**
 * `104X` — 최대공약수를 **한 번도 안 구하고** 밑변을 전부 넣어 본다.
 * 삼각형 부등식 **셋을 따로** 확인하고, 훑는 위끝을 $b+c$ 보다 훨씬 크게 잡아
 * 「모두」라는 주장이 범위 밖에서 반증되지 않는 것까지 본다.
 */
export function verifyBisectorSum(content: string): string {
  const g = grab(
    /\$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$, \$\\overline\{AC\}=(\d+)\\,\\mathrm\{cm\}\$/,
    content,
    "104X",
  );
  const c = num(g[0]);
  const b = num(g[1]);
  if (b === c) throw new Error("104X 불변식: 두 변의 길이가 같다");
  const found: number[] = [];
  for (let a = 1; a <= 4 * (b + c); a += 1) {
    if (!(a + b > c && b + c > a && c + a > b)) continue;
    if ((c * a) % (b + c) !== 0) continue;
    found.push(a);
  }
  if (found.length < 2)
    throw new Error(`104X 불변식: 후보가 ${found.length}개뿐이다`);
  if (found.length > 5)
    throw new Error(`104X 불변식: 후보가 ${found.length}개나 된다`);
  return `${found.reduce((s, v) => s + v, 0)}\\,\\mathrm{cm}`;
}

const VERIFY: Record<string, (content: string) => string> = {
  "101X": verifyExactlyTwo,
  "102X": verifyPerimeterSegment,
  "103X": verifySwapAmount,
  "104X": verifyBisectorSum,
};

/** `facts` 만으로 정답 문자열을 다시 짓는다 — 계약 ⑹.2 의 왕복 검사. */
function rebuildAnswer(rpmType: string, facts: Record<string, number>): string {
  if (rpmType === "101X") return `$\\dfrac{${facts.x}}{${facts.den}}$`;
  if (rpmType === "102X") return `$${facts.x}\\,\\mathrm{cm}$`;
  if (rpmType === "103X") return `$${facts.x}\\,\\mathrm{g}$`;
  if (rpmType === "104X") return `$${facts.x}\\,\\mathrm{cm}$`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ═══════════════════════════════════════════════════════════
// ㄷ. 해설의 **말** — 옳은 쪽이 있고 뒤집힌 쪽이 없는가 (㉳)
// ═══════════════════════════════════════════════════════════

/**
 * 유형마다 「왜 그런가」를 진술하는 줄의 **낱말 쌍** — `[옳은 말, 뒤집힌 말]`.
 *
 * 🔴 「옳은 말이 있는가」만 보면 안 된다. 뒤집힌 말이 **접두로 옳은 말을 품는**
 *    자리가 있어서(「서로소」 ⊂ 「서로소가 아니」) 한쪽만 보면 안 갈린다.
 *    그래서 **둘 다** 본다.
 */
const REASON_WORDS: Record<string, ReadonlyArray<readonly [string, string]>> = {
  "101X": [
    ["동시에 일어날 수 없", "동시에 일어날 수 있"],
    ["정확히 두 명", "정확히 세 명"],
    ["세 분모의 곱", "세 분자의 곱"],
    ["최대공약수", "최소공배수"],
  ],
  "102X": [
    ["비가 모두 같으면", "비가 서로 다르면"],
    [
      "세 변의 길이를 더한 둘레의 길이의 비도 그 비와 같다",
      "세 변의 길이를 더한 둘레의 길이의 비는 그 비와 다르다",
    ],
    [
      "같은 비로 줄어들면 그 합도 같은 비로",
      "같은 비로 줄어들면 그 합은 다른 비로",
    ],
    ["대응하는 세 변", "대응하는 한 변"],
  ],
  "103X": [
    ["변끼리 더하면", "변끼리 빼면"],
    ["서로 지워져", "그대로 남아"],
    ["다르므로", "같으므로"],
    ["하나로 정해진다", "정해지지 않는다"],
  ],
  "104X": [
    ["의 배수여야 한다", "의 약수여야 한다"],
    ["서로소이므로", "서로소가 아니므로"],
    ["삼각형이 만들어지지 않으므로 버린다", "삼각형이 만들어지므로 넣는다"],
    [
      "두 변의 길이의 합이 나머지 한 변의 길이보다 커야",
      "두 변의 길이의 합이 나머지 한 변의 길이보다 작아야",
    ],
  ],
};

/** 해설의 «말»이 어긋난 자리 — 없으면 빈 배열. */
export function reasonFaults(rpmType: string, solution: string): string[] {
  const pairs = REASON_WORDS[rpmType];
  if (!pairs) return [`말 목록이 없는 유형: ${rpmType}`];
  const out: string[] = [];
  for (const [right, wrong] of pairs) {
    if (!solution.includes(right)) out.push(`「${right}」가 없다`);
    if (solution.includes(wrong)) out.push(`「${wrong}」가 있다`);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// 눈금 — 이 자가 «아니오» 를 낼 수 있는가 (양성·음성 둘 다)
// ═══════════════════════════════════════════════════════════

/** 엔진을 **안 거친** 손으로 쓴 지면 — 양성(답을 안다)과 음성(불변식을 어겼다). */
const GAUGE_OK: ReadonlyArray<{ type: string; page: string; want: string }> = [
  {
    type: "101X",
    page:
      "세 사람 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$가 과녁을 맞힐 확률이 각각 " +
      "$\\dfrac{1}{2}$, $\\dfrac{1}{3}$, $\\dfrac{1}{4}$이다. 세 사람이 화살을 각각 한 번씩 쏠 때, " +
      "맞힌 사람이 정확히 두 명일 확률을 구하시오.",
    // $\frac12\frac13\frac34+\frac12\frac23\frac14+\frac12\frac13\frac14=\frac{3+2+1}{24}=\frac14$
    want: "\\dfrac{1}{4}",
  },
  {
    type: "102X",
    page:
      "$\\triangle ABC$에서 $\\overline{AB}$ 위의 점 $\\mathrm{D}$와 $\\overline{AC}$ 위의 점 " +
      "$\\mathrm{E}$에 대하여 $\\overline{DE}\\parallel\\overline{BC}$이다. " +
      "$\\triangle ABC$의 둘레의 길이가 $147\\,\\mathrm{cm}$, $\\triangle ADE$의 둘레의 길이가 " +
      "$105\\,\\mathrm{cm}$이고 $\\overline{AB}=42\\,\\mathrm{cm}$일 때, $\\overline{DB}$의 길이를 구하시오.",
    // $\overline{AD}=42\times\frac{105}{147}=30$ 이므로 $\overline{DB}=12$
    want: "12\\,\\mathrm{cm}",
  },
  {
    type: "103X",
    page:
      "$\\mathrm{A}$ 그릇에는 $17\\%$의 소금물 $360\\,\\mathrm{g}$이, $\\mathrm{B}$ 그릇에는 " +
      "$2\\%$의 소금물 $240\\,\\mathrm{g}$이 들어 있다. 두 그릇에서 소금물을 같은 양만큼 " +
      "덜어 내어 서로 바꾸어 넣고 잘 섞었더니 두 그릇의 소금물의 농도가 같아졌다. " +
      "이때 덜어 낸 소금물의 양을 구하시오.",
    // $\frac{360\times240}{600}=144$
    want: "144\\,\\mathrm{g}",
  },
  {
    type: "104X",
    page:
      "$\\triangle ABC$에서 $\\overline{AB}=16\\,\\mathrm{cm}$, $\\overline{AC}=28\\,\\mathrm{cm}$이고 " +
      "$\\overline{BC}$의 길이는 자연수이다. $\\angle A$의 이등분선이 $\\overline{BC}$와 만나는 점을 " +
      "$\\mathrm{D}$라 할 때, $\\overline{BD}$의 길이도 자연수가 되도록 하는 $\\overline{BC}$의 길이를 " +
      "모두 구하여 그 합을 구하시오.",
    // $\overline{BD}:\overline{DC}=4:7$ 이므로 $a$ 는 $11$ 의 배수 → $22$, $33$
    want: "55\\,\\mathrm{cm}",
  },
];

/**
 * 음성 눈금 — **던지는 말까지** 맞댄다.
 *
 * 🔴 말을 맞대야 「그 축 하나만 걸린다」가 잠긴다. 다른 검사가 먼저 물면 말이 달라져
 *    **빨개진다**(4차가 여덟 자리에서 이것을 못 하고 있었다).
 */
const GAUGE_BAD: ReadonlyArray<{ type: string; page: string; says: string }> = [
  {
    type: "101X",
    page: GAUGE_OK[0]!.page.replace("\\dfrac{1}{3}", "\\dfrac{2}{6}"),
    says: "발문의 분수가 기약이 아니다",
  },
  {
    type: "101X",
    page: GAUGE_OK[0]!.page.replace("\\dfrac{1}{3}", "\\dfrac{5}{3}"),
    says: "확률이 $0$ 과 $1$ 사이가 아니다",
  },
  {
    type: "101X",
    page: GAUGE_OK[0]!.page.replace("\\dfrac{1}{4}", "\\dfrac{1}{2}"),
    says: "세 확률이 서로 다르지 않다",
  },
  {
    type: "102X",
    page: GAUGE_OK[1]!.page.replace(
      "$105\\,\\mathrm{cm}$",
      "$147\\,\\mathrm{cm}$",
    ),
    says: "작은 삼각형의 둘레가 더 짧지 않다",
  },
  {
    type: "102X",
    // $\overline{AB}=84$ 는 둘레 $147$ 의 절반보다 길다 — 삼각형이 안 된다.
    page: GAUGE_OK[1]!.page.replace("$\\overline{AB}=42", "$\\overline{AB}=84"),
    says: "한 변이 둘레의 절반보다 짧지 않다",
  },
  {
    type: "102X",
    // $\overline{AD}=42\times\frac{100}{147}$ 은 자연수가 아니다.
    page: GAUGE_OK[1]!.page.replace(
      "$105\\,\\mathrm{cm}$",
      "$100\\,\\mathrm{cm}$",
    ),
    says: "가 자연수인 자리가 0개다",
  },
  {
    type: "103X",
    page: GAUGE_OK[2]!.page.replace("$2\\%$", "$17\\%$"),
    says: "두 농도가 같다",
  },
  {
    type: "103X",
    // $\dfrac{360\times250}{610}$ 은 자연수가 아니다.
    page: GAUGE_OK[2]!.page.replace(
      "$240\\,\\mathrm{g}$",
      "$250\\,\\mathrm{g}$",
    ),
    says: "농도가 같아지는 양이 0개다",
  },
  {
    type: "104X",
    page: GAUGE_OK[3]!.page.replace("\\overline{AC}=28", "\\overline{AC}=16"),
    says: "두 변의 길이가 같다",
  },
  {
    type: "104X",
    // $\overline{AB}=5$, $\overline{AC}=7$ 이면 $a$ 가 $12$ 의 배수여야 하는데
    // 범위 $(2,12)$ 안에 없다.
    page: GAUGE_OK[3]!.page
      .replace("\\overline{AB}=16", "\\overline{AB}=5")
      .replace("\\overline{AC}=28", "\\overline{AC}=7"),
    says: "후보가 0개뿐이다",
  },
  {
    type: "104X",
    // $\overline{AB}=12$, $\overline{AC}=24$ 이면 $a$ 가 $3$ 의 배수이고 범위가
    // $(12,36)$ 라 $15,18,21,24,27,30,33$ 의 **일곱**이 살아난다.
    page: GAUGE_OK[3]!.page
      .replace("\\overline{AB}=16", "\\overline{AB}=12")
      .replace("\\overline{AC}=28", "\\overline{AC}=24"),
    says: "후보가 7개나 된다",
  },
];

describe("중2 확대 갈래 5차 `m2Top5a` — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  for (const g of GAUGE_OK) {
    it(`${g.type} — 답을 아는 손 지면에서 그 답을 낸다`, () => {
      expect(VERIFY[g.type]!(g.page)).toBe(g.want);
    });
  }

  for (const [i, g] of GAUGE_BAD.entries()) {
    it(`${g.type} 음성 ${i} — 「${g.says}」로 던진다 (다른 검사가 먼저 물면 빨개진다)`, () => {
      expect(() => VERIFY[g.type]!(g.page)).toThrow(g.says);
    });
  }

  it("🔴 눈금이 네 유형을 **모두** 덮는다 — 안 덮인 유형의 «0» 은 못 셈이다", () => {
    const ok = new Set(GAUGE_OK.map((g) => g.type));
    const bad = new Set(GAUGE_BAD.map((g) => g.type));
    for (const e of M2_TOP_5A) {
      expect(ok.has(e.rpmType), `${e.rpmType} 양성 눈금`).toBe(true);
      expect(bad.has(e.rpmType), `${e.rpmType} 음성 눈금`).toBe(true);
    }
    expect(GAUGE_BAD.length).toBeGreaterThanOrEqual(M2_TOP_5A.length * 2);
  });

  it("🔴 산술 자와 기약 자도 «아니오» 를 낸다", () => {
    expect(arithmeticFaults("$2\\times3=7$")).toHaveLength(1);
    expect(arithmeticFaults("$2\\times3=6$")).toEqual([]);
    expect(arithmeticFaults("$1-\\dfrac{5}{7}=\\dfrac{2}{7}$")).toEqual([]);
    expect(arithmeticFaults("$1-\\dfrac{5}{7}=\\dfrac{3}{7}$")).toHaveLength(1);
    expect(arithmeticFaults("$6600\\div600=11$")).toEqual([]);
    expect(arithmeticFaults("$6600\\div600=12$")).toHaveLength(1);
    expect(arithmeticClaims("$2\\times3=6$")).toBe(1);
    // 문자·비 표기는 산술이 아니다 — 세지 않는다(거짓 경보는 가드를 끈다).
    expect(arithmeticClaims("$15x=2160$")).toBe(0);
    expect(arithmeticClaims("$105:147=5:7$")).toBe(0);
    expect(unreducedFractions("$\\dfrac{2}{4}$")).toEqual(["2/4"]);
    expect(unreducedFractions("$\\dfrac{3}{1}$")).toEqual(["3/1"]);
    expect(unreducedFractions("$\\dfrac{3}{4}$")).toEqual([]);
    // 분자가 합의 꼴이면 기약 판정 대상이 아니다 — 세는 자도 그것을 안 센다.
    expect(fractionCount("$\\dfrac{75+12+20}{245}$")).toBe(0);
  });

  it("🔴 말 자도 «아니오» 를 낸다 — 낱말을 뒤집으면 전부 빨개진다", () => {
    for (const e of M2_TOP_5A) {
      const p = e.handler(createRng(BASE_SEED));
      // 음성 대조: 손 안 댄 판은 깨끗하다.
      expect(reasonFaults(e.rpmType, p.solution), e.rpmType).toEqual([]);
      const pairs = REASON_WORDS[e.rpmType]!;
      expect(pairs.length, `${e.rpmType} 말 쌍`).toBeGreaterThanOrEqual(3);
      for (const [right, wrong] of pairs) {
        const flipped = p.solution.split(right).join(wrong);
        expect(
          flipped,
          `${e.rpmType} 「${right}」 뒤집기가 안 먹었다`,
        ).not.toBe(p.solution);
        expect(
          reasonFaults(e.rpmType, flipped).length,
          `${e.rpmType} 「${right}」 → 「${wrong}」`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("중2 확대 갈래 5차 `m2Top5a` — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5A.map((e) => e.rpmType)).toEqual([
      "101X",
      "102X",
      "103X",
      "104X",
    ]);
    expect(new Set(M2_TOP_5A.map((e) => e.key)).size).toBe(4);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5A) {
      expect(extensionNumberReason(e), e.rpmType).toBeNull();
      expect(isCatalogType(e), `${e.rpmType} 가 색인에 있다`).toBe(false);
      const titles = catalogTypesOfMinor(e.rpmBook, e.rpmMinor).map(
        (t) => t.title,
      );
      expect(titles).not.toContain(e.rpmTitle);
      expect(
        e.rpmType.endsWith("X"),
        `${e.rpmType} 는 5차 접미사가 아니다`,
      ).toBe(true);
    }
  });

  it("🔴 소단원·중단원 이름을 **정본에 대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_5A) {
      expect(
        sections.has(e.unitSection),
        `단원 정본에 없다: ${e.unitSection}`,
      ).toBe(true);
      expect(e.unitSection).toBe(SECTION_OF[e.rpmType]);
      expect(
        catalogTypesOfMinor(e.rpmBook, e.rpmMinor).length,
        `색인에 없는 중단원: ${e.rpmBook}|${e.rpmMinor}`,
      ).toBeGreaterThan(0);
      expect(e.grade).toBe("중2");
    }
  });

  it("네 유형이 어느 소단원·중단원에 붙는지 못 박는다", () => {
    expect([E101.rpmBook, E101.rpmMinor]).toEqual(["2-2", "확률"]);
    expect([E102.rpmBook, E102.rpmMinor]).toEqual([
      "2-2",
      "평행선 사이의 선분의 길이의 비",
    ]);
    expect([E103.rpmBook, E103.rpmMinor]).toEqual([
      "2-1",
      "연립일차방정식의 활용",
    ]);
    expect([E104.rpmBook, E104.rpmMinor]).toEqual([
      "2-2",
      "평행선 사이의 선분의 길이의 비",
    ]);
    // 🔴 `102X` 와 `104X` 는 **같은 중단원**이라 번호가 겹치면 키가 부딪힌다.
    expect(E102.rpmType).not.toBe(E104.rpmType);
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    for (const e of M2_TOP_5A) {
      const same = registeredTypes().filter((r) => r.key === e.key);
      // 등록 전이면 0, 등록 뒤면 1 — 둘 다 아니면 다른 모듈과 부딪힌 것이다.
      expect(same.length, `키 충돌: ${e.key}`).toBeLessThanOrEqual(1);
      if (same.length === 1) expect(same[0]!.rpmTitle).toBe(e.rpmTitle);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5A) {
      for (const p of rows(e, 40)) {
        expect(p.difficulty, e.rpmType).toBe(EXPECTED_TIER[e.rpmType]);
        expect(
          resolveMiddleTier(p.difficulty, p.content, !!p.figureSpec),
          e.rpmType,
        ).toBe(EXPECTED_TIER[e.rpmType]);
      }
    }
    // 갈래 넷 가운데 심화중·심화상이 **둘 다** 있다(D-116 브리프).
    const tiers = new Set(M2_TOP_5A.map((e) => EXPECTED_TIER[e.rpmType]));
    expect([...tiers].sort()).toEqual(["심화상", "심화중"]);
    // 몫이 **둘씩**이다 — 한쪽으로 몰리면 D-116 이 재려는 두 축 가운데 하나가 빈다.
    expect(
      M2_TOP_5A.filter((e) => EXPECTED_TIER[e.rpmType] === "심화중").length,
    ).toBe(2);
  });

  it("🔴 이 네 소단원의 **색인 유형**에는 확대 갈래가 하나도 없었다 (D-116 은 «빈 소단원»을 채운다)", () => {
    const targets = new Set(Object.values(SECTION_OF));
    const mine = new Set(M2_TOP_5A.map((e) => e.key));
    let looked = 0;
    let failed = 0;
    const upper: string[] = [];
    for (const e of registeredTypes()) {
      if (!targets.has(e.unitSection)) continue;
      if (mine.has(e.key)) continue;
      looked += 1;
      let tier: string;
      try {
        tier = e.handler(createRng(BASE_SEED)).difficulty;
      } catch {
        failed += 1;
        continue;
      }
      if (tier !== "심화중" && tier !== "심화상") continue;
      // 확장 유형(숫자+영문 한 글자)은 다른 갈래가 이번 물결에 더한 것일 수 있다.
      if (!/^\d+[A-Z]$/.test(e.rpmType)) upper.push(`${e.key} → ${tier}`);
    }
    expect(upper, "색인 유형이 이미 확대 갈래를 들고 있다").toEqual([]);
    // 「0 건」이 «못 셈»이 아님을 못 박는다 — 실제로 몇 개를 봤는지 센다.
    if (registeredKeys.has(E101.key))
      expect(looked, "네 소단원의 등록 유형").toBeGreaterThan(10);
    expect(failed, "생성에 실패한 유형").toBe(0);
  });
});

describe("중2 확대 갈래 5차 `m2Top5a` — 지면과 값", () => {
  for (const e of M2_TOP_5A) {
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

      it("지면이 깨끗하다 — 렌더·냄새·조사·(으)로·맨 숫자·그림 지시·굵게 표시", () => {
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
            // 마크다운 굵게 표시는 지면에 그대로 나간다(4차 회귀 잠금 ⑷).
            expect(text.includes("**"), `${e.rpmType} 굵게: ${text}`).toBe(
              false,
            );
            judged += (text.match(/\$[^$]*\$(을|를|은|는|와|과|가)/g) ?? [])
              .length;
          }
          expect(p.figureSpec ?? null, e.rpmType).toBe(null);
          expect(pointsAtFigure(p.content), e.rpmType).toBeNull();
        }
        // 🔴 **조사 자가 이 유형에서 구조적으로 0 이 아닌지** — 「0 건」은 «깨끗»과
        //    «못 셈»을 안 가른다.
        expect(judged, `${e.rpmType} 조사 판정 후보`).toBeGreaterThan(SAMPLE);
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.solution).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // 🔴 0 은 «깨끗»과 «못 셈»을 안 가른다. 유형마다 **한 판에 몇 개가 나오는지**
        //    실측해 못 박는다 — 지면에서 등식이 사라지면 그 순간 빨개진다.
        //    (`104X` 는 등식이 합 줄 하나뿐이다. 나머지는 비 표기·문자식이라 이 자의
        //     대상이 아니고, 그 값들은 「해설의 중간값」 검사가 따로 잰다.)
        expect(claims, `${e.rpmType} 산술 등식`).toBeGreaterThanOrEqual(
          SAMPLE * ARITH_FLOOR[e.rpmType]!,
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
        // `103X` 는 분수를 아예 안 쓴다(양변에 $100$ 을 곱해 정수로 세운다) —
        // 그 «0» 은 «못 셈»이 아니라 **«잴 것이 없다»** 다.
        if (e.rpmType === "103X") expect(seen).toBe(0);
        else expect(seen, `${e.rpmType} 분수`).toBeGreaterThanOrEqual(SAMPLE);
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑹)", () => {
        for (const p of sample()) {
          const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
          expect(lines.length, `${e.rpmType} 해설 줄`).toBeGreaterThanOrEqual(
            5,
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
          // ⚠️ 마지막 줄로 못 박으면 안 된다 — 결론 **뒤에** 확인 줄을 하나 둔다.
          expect(
            lines.length - conclusion,
            `${e.rpmType} 결론이 너무 앞에 있다`,
          ).toBeLessThanOrEqual(2);
          const middle = lines.slice(1, conclusion).join("\n");
          expect(middle, `${e.rpmType} 중간 결과가 없다`).toMatch(/\$/);
          expect(
            middle.split("\n").length,
            `${e.rpmType} 중간 걸음이 모자라다`,
          ).toBeGreaterThanOrEqual(3);
          expect(reasonFaults(e.rpmType, p.solution), p.solution).toEqual([]);
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

      it(`🔴 변형 폭과 정답 쏠림 (씨앗 블록 ${SEED_BLOCKS.length} × ${WIDE}판)`, () => {
        const floor = FLOOR[e.rpmType]!;
        // 🔴 브리프가 시킨 대로 **`variant` 를 돌려** `floor` 벌이 서로 다른지 본다.
        //    아직 등록 전일 수 있으므로 제품과 **같은 꼴**로 흉내 낸다 — 변형 오프셋도
        //    같고(`0x9e37`), **되풀이되는 발문은 버리고 다시 뽑는 것**도 같다
        //    (`generateMiddleSet` 이 `n*30` 벌까지 그렇게 한다). 제품은 여기에 키 소금을
        //    한 번 더 더하는데 그것은 상수라 다양성이 안 바뀐다.
        const byVariant = new Set<string>();
        let variant = 0;
        while (byVariant.size < floor && variant <= floor * 30) {
          byVariant.add(
            e.handler(createRng(BASE_SEED + variant * 0x9e37)).content,
          );
          variant += 1;
        }
        expect(byVariant.size, `${e.rpmType} 변형 ${floor}벌`).toBe(floor);
        // 🔴 몇 벌을 뽑아서 채웠는지도 못 박는다 — 제품의 상한(`n*30`)에 닿기 전에
        //    채워야 「변형 공간이 좁다」로 던지지 않는다.
        expect(variant, `${e.rpmType} 변형을 채우는 데 쓴 벌`).toBeLessThan(
          floor * 4,
        );

        for (const seed of SEED_BLOCKS) {
          const wide = rows(e, WIDE, seed);
          const contents = new Set(wide.map((p) => p.content));
          const solutions = new Set(wide.map((p) => p.solution));
          const answers = new Map<string, number>();
          for (const p of wide)
            answers.set(p.answer, (answers.get(p.answer) ?? 0) + 1);
          expect(
            contents.size,
            `${e.rpmType} 씨앗 ${seed} 서로 다른 발문`,
          ).toBeGreaterThanOrEqual(floor * 4);
          expect(
            solutions.size,
            `${e.rpmType} 씨앗 ${seed} 서로 다른 해설`,
          ).toBeGreaterThanOrEqual(floor * 4);
          expect(
            answers.size,
            `${e.rpmType} 씨앗 ${seed} 서로 다른 정답`,
          ).toBeGreaterThan(15);
          const top = Math.max(...answers.values()) / wide.length;
          expect(top, `${e.rpmType} 씨앗 ${seed} 최빈 정답 비율`).toBeLessThan(
            0.12,
          );
        }
      });

      it("🔴 발문이 상한을 **선언하지 않는다** (㉱ — 공용 자가 읽을 말이 없다)", () => {
        for (const p of rows(e, WIDE)) {
          expect(declaredUpperBound(p.content), p.content).toBeNull();
        }
        // 자가 살아 있는가 — 선언하는 지면에는 «아니오» 를 낸다.
        expect(declaredUpperBound("전체 일의 양을 $1$로 놓고 구하시오.")).toBe(
          1,
        );
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
          expect(reasonFaults(e.rpmType, p.solution)).toEqual([]);
        }
        const floor = FLOOR[e.rpmType]!;
        expect(
          new Set(
            generateMiddleSet(e.key, BASE_SEED, floor).map((p) => p.content),
          ).size,
        ).toBe(floor);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값**을 다른 길로 다시 재고 줄끼리 맞댄다
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 `m2Top5a` — 해설의 중간값·제약", () => {
  it("`101X` — 여덟 갈래로 펼친 값이 지면의 분자 셋·합·약분과 모두 맞는다", () => {
    let checked = 0;
    for (const p of rows(E101, WIDE)) {
      const g = grab(
        /확률이 각각 \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$이다/,
        p.content,
        "101X",
      );
      const hit = [num(g[0]), num(g[2]), num(g[4])];
      const all = [num(g[1]), num(g[3]), num(g[5])];
      const den = all[0]! * all[1]! * all[2]!;
      // 지면이 적은 세 분자를 **차례대로** 읽는다.
      const printed = [
        ...p.solution.matchAll(
          /분자는? \$(\d+)\\times(\d+)\\times(\d+)=(\d+)\$/g,
        ),
      ];
      expect(printed.length, `${p.content} — 분자 줄이 셋이 아니다`).toBe(3);
      const mine: number[] = [];
      for (let mask = 0; mask < 8; mask += 1) {
        let ones = 0;
        let term = 1;
        for (let z = 0; z < 3; z += 1) {
          const on = (mask >> z) & 1;
          ones += on;
          term *= on === 1 ? hit[z]! : all[z]! - hit[z]!;
        }
        if (ones === 2) mine.push(term);
      }
      // 지면의 분자 셋은 «정확히 둘이 성공하는 갈래»의 분자 셋과 **같은 무리**다.
      expect(
        printed.map((m) => num(m[4])).sort((x, y) => x - y),
        p.solution,
      ).toEqual([...mine].sort((x, y) => x - y));
      const total = mine.reduce((s, v) => s + v, 0);
      expect(p.solution, "합 줄").toContain(`=${total}$이고`);
      const [pp, qq] = redFrac(total, den);
      expect(p.answer).toBe(`$\\dfrac{${pp}}{${qq}}$`);
      // 약분 줄이 «최대공약수»를 옳게 적는가 — 여기서 따로 구한다.
      expect(p.solution).toContain(`최대공약수가 $${gcd2(total, den)}$이므로`);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });

  it("`102X` — 비 줄·곱 줄·뺄셈 줄·확인 줄을 넷 다 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E102, WIDE)) {
      const g = grab(
        /둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, \$\\triangle ADE\$의 둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$이고 \$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$/,
        p.content,
        "102X",
      );
      const whole = num(g[0]);
      const small = num(g[1]);
      const ab = num(g[2]);
      const [s, t] = redFrac(small, whole);
      // 비 줄
      expect(p.solution).toContain(`$${small}:${whole}=${s}:${t}$`);
      // 곱 줄 — $\overline{AD}$
      const ad = (ab * s) / t;
      expect(Number.isInteger(ad), p.content).toBe(true);
      expect(p.solution).toContain(
        `$\\overline{AD}=${ab}\\times\\dfrac{${s}}{${t}}=${ad}\\,\\mathrm{cm}$`,
      );
      // 뺄셈 줄
      expect(p.solution).toContain(`=${ab}-${ad}=${ab - ad}\\,\\mathrm{cm}$`);
      // 확인 줄 — $\overline{AD}:\overline{DB}$ 가 기약이다
      const [rs, rt] = redFrac(ad, ab - ad);
      expect(p.solution).toContain(
        `$\\overline{AD}:\\overline{DB}=${ad}:${ab - ad}=${rs}:${rt}$`,
      );
      expect(p.answer).toBe(`$${ab - ad}\\,\\mathrm{cm}$`);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });

  it("`103X` — 두 식·가감 줄·농도 줄·대입 줄·확인 줄을 다섯 다 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E103, WIDE)) {
      const g = grab(
        /\$(\d+)\\%\$의 [가-힣]+ \$(\d+)\\,\\mathrm\{g\}\$이, \$\\mathrm\{B\}\$ 그릇에는 \$(\d+)\\%\$의 [가-힣]+ \$(\d+)\\,\\mathrm\{g\}\$이/,
        p.content,
        "103X",
      );
      const a = num(g[0]);
      const P = num(g[1]);
      const b = num(g[2]);
      const Q = num(g[3]);
      // 두 그릇의 식
      expect(p.solution).toContain(`$${a}(${P}-x)+${b}x=${P}y$`);
      expect(p.solution).toContain(`$${b}(${Q}-x)+${a}x=${Q}y$`);
      // 가감 줄 — $x$ 항이 지워진다
      expect(p.solution).toContain(`$-${a}+${b}-${b}+${a}=0$`);
      // 농도 줄 — 가중평균
      const sum = a * P + b * Q;
      const totalAmount = P + Q;
      expect(sum % totalAmount, p.content).toBe(0);
      const y = sum / totalAmount;
      expect(p.solution).toContain(`$y=${sum}\\div${totalAmount}=${y}$`);
      // 대입 줄
      const gap = Math.abs(b - a);
      const rhs = b > a ? P * y - a * P : a * P - P * y;
      expect(rhs > 0, p.content).toBe(true);
      expect(rhs % gap, p.content).toBe(0);
      expect(p.solution).toContain(`$x=${rhs}\\div${gap}=${rhs / gap}$`);
      // 확인 줄 — $\mathrm{B}$ 그릇에서도 농도가 $y$ 다
      const x = rhs / gap;
      expect(p.solution).toContain(`+${a}\\times${x}=${b * (Q - x) + a * x}$`);
      expect(p.solution).toContain(`$${Q}\\times${y}=${Q * y}$`);
      expect(b * (Q - x) + a * x).toBe(Q * y);
      expect(p.answer).toBe(`$${x}\\,\\mathrm{g}$`);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });

  it("`104X` — 나열 줄이 **자기가 적은 범위 안**이고 버리는 값은 밖이다 (㉴)", () => {
    let checked = 0;
    for (const p of rows(E104, WIDE)) {
      const g = grab(
        /\$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$, \$\\overline\{AC\}=(\d+)\\,\\mathrm\{cm\}\$/,
        p.content,
        "104X",
      );
      const c = num(g[0]);
      const b = num(g[1]);
      // 지면이 스스로 못 박은 범위를 **글자에서** 읽는다.
      const r = grab(/\$(\d+)<a<(\d+)\$/, p.solution, "104X 범위");
      const lo = num(r[0]);
      const hi = num(r[1]);
      expect(lo).toBe(Math.abs(b - c));
      expect(hi).toBe(b + c);
      // 나열 줄
      const listLine = grab(
        /배수는 ((?:\$\d+\$, )*\$\d+\$)의 \$(\d+)\$개이고, 이때 \$\\overline\{BD\}\$는 차례로 ((?:\$\d+\$, )*\$\d+\$)(?:으로|로) 모두 자연수이다/,
        p.solution,
        "104X 나열",
      );
      const listed = [...listLine[0]!.matchAll(/\d+/g)].map((m) =>
        Number(m[0]),
      );
      const bdListed = [...listLine[2]!.matchAll(/\d+/g)].map((m) =>
        Number(m[0]),
      );
      expect(listed.length).toBe(num(listLine[1]));
      expect(bdListed.length).toBe(listed.length);
      // 🔴 ㉴ — 적은 제약 안에 **전부** 들어 있다.
      for (const v of listed) {
        expect(v > lo && v < hi, `${p.solution} — ${v} 가 범위 밖`).toBe(true);
        expect((c * v) % (b + c), `${v}`).toBe(0);
      }
      // $\overline{BD}$ 값이 실제로 그 값인가
      expect(bdListed).toEqual(listed.map((v) => (c * v) / (b + c)));
      // 버리는 값은 **범위 밖**이다.
      expect(p.solution).toContain(`$a=${hi}$`);
      expect(hi < hi).toBe(false);
      expect((c * hi) % (b + c)).toBe(0);
      // 합 줄
      const sum = listed.reduce((s, v) => s + v, 0);
      expect(p.solution).toContain(`$${listed.join("+")}=${sum}$`);
      expect(p.answer).toBe(`$${sum}\\,\\mathrm{cm}$`);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });
});

// ═══════════════════════════════════════════════════════════
// ㄴ. 해설에 «설명되지 않는 수»가 없다
// ═══════════════════════════════════════════════════════════

/** 그 유형의 지면에 나올 수 있는 수 전부 — **독립 재계산**이 낳은 것만. */
function allowedNumbers(rpmType: string, content: string): Set<number> {
  const ok = new Set<number>([0, 1]);
  if (rpmType === "101X") {
    const g = grab(
      /확률이 각각 \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$이다/,
      content,
      "101X",
    );
    const hit = [num(g[0]), num(g[2]), num(g[4])];
    const all = [num(g[1]), num(g[3]), num(g[5])];
    const den = all[0]! * all[1]! * all[2]!;
    ok.add(den);
    for (let z = 0; z < 3; z += 1) {
      ok.add(hit[z]!);
      ok.add(all[z]!);
      ok.add(all[z]! - hit[z]!);
    }
    let total = 0;
    for (let mask = 0; mask < 8; mask += 1) {
      let ones = 0;
      let term = 1;
      for (let z = 0; z < 3; z += 1) {
        const on = (mask >> z) & 1;
        ones += on;
        term *= on === 1 ? hit[z]! : all[z]! - hit[z]!;
      }
      if (ones === 2) {
        ok.add(term);
        total += term;
      }
    }
    ok.add(total);
    ok.add(gcd2(total, den));
    const [p, q] = redFrac(total, den);
    ok.add(p);
    ok.add(q);
    return ok;
  }
  if (rpmType === "102X") {
    const g = grab(
      /둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, \$\\triangle ADE\$의 둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$이고 \$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$/,
      content,
      "102X",
    );
    const whole = num(g[0]);
    const small = num(g[1]);
    const ab = num(g[2]);
    const [s, t] = redFrac(small, whole);
    const ad = (ab * s) / t;
    for (const v of [whole, small, ab, s, t, ad, ab - ad]) ok.add(v);
    const [rs, rt] = redFrac(ad, ab - ad);
    ok.add(rs);
    ok.add(rt);
    return ok;
  }
  if (rpmType === "103X") {
    const g = grab(
      /\$(\d+)\\%\$의 [가-힣]+ \$(\d+)\\,\\mathrm\{g\}\$이, \$\\mathrm\{B\}\$ 그릇에는 \$(\d+)\\%\$의 [가-힣]+ \$(\d+)\\,\\mathrm\{g\}\$이/,
      content,
      "103X",
    );
    const a = num(g[0]);
    const P = num(g[1]);
    const b = num(g[2]);
    const Q = num(g[3]);
    const sum = a * P + b * Q;
    const totalAmount = P + Q;
    const y = sum / totalAmount;
    const gap = Math.abs(b - a);
    const rhs = b > a ? P * y - a * P : a * P - P * y;
    const x = rhs / gap;
    for (const v of [a, b, P, Q, sum, totalAmount, y, gap, rhs, x, 100])
      ok.add(v);
    ok.add(P - x);
    ok.add(Q - x);
    ok.add(b * (Q - x) + a * x);
    ok.add(Q * y);
    return ok;
  }
  if (rpmType === "104X") {
    const g = grab(
      /\$\\overline\{AB\}=(\d+)\\,\\mathrm\{cm\}\$, \$\\overline\{AC\}=(\d+)\\,\\mathrm\{cm\}\$/,
      content,
      "104X",
    );
    const c = num(g[0]);
    const b = num(g[1]);
    const [cp, bp] = redFrac(c, b);
    const t = bp + cp;
    for (const v of [c, b, cp, bp, t, Math.abs(b - c), b + c]) ok.add(v);
    const list: number[] = [];
    for (let a = Math.abs(b - c) + 1; a < b + c; a += 1) {
      if ((c * a) % (b + c) !== 0) continue;
      list.push(a);
      ok.add(a);
      ok.add((c * a) / (b + c));
    }
    ok.add(list.length);
    ok.add(list.reduce((s, v) => s + v, 0));
    return ok;
  }
  throw new Error(`모르는 유형: ${rpmType}`);
}

describe("중2 확대 갈래 5차 `m2Top5a` — «설명되지 않는 수»가 없다", () => {
  for (const e of M2_TOP_5A) {
    it(`${e.rpmType} — 발문과 독립 검산이 낳은 값만 지면에 있다`, () => {
      let seen = 0;
      for (const p of rows(e)) {
        const ok = allowedNumbers(e.rpmType, p.content);
        for (const v of mathIntegers(p.solution)) {
          expect(
            ok.has(v),
            `${e.rpmType} 해설에 설명되지 않는 수 ${v}\n${p.solution}`,
          ).toBe(true);
          seen += 1;
        }
      }
      // 0 은 «깨끗»과 «못 셈»을 안 가른다.
      expect(seen, `${e.rpmType} 본 수`).toBeGreaterThan(SAMPLE * 10);
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ㉠ 찍기로 맞을 수 있는가 · ㉡ 굳힘을 지우면 답이 바뀌는가
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 `m2Top5a` — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`101X` — 발문의 세 분수·여사건·곱 어느 것도 답이 아니다", () => {
    for (const p of rows(E101)) {
      const g = grab(
        /확률이 각각 \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$, \$\\dfrac\{(\d+)\}\{(\d+)\}\$이다/,
        p.content,
        "101X",
      );
      const hit = [num(g[0]), num(g[2]), num(g[4])];
      const all = [num(g[1]), num(g[3]), num(g[5])];
      const bad = new Set<string>(["1/2"]);
      const mark = (n: number, d: number): void => {
        const [x, y] = redFrac(n, d);
        bad.add(`${x}/${y}`);
      };
      for (let z = 0; z < 3; z += 1) {
        mark(hit[z]!, all[z]!);
        mark(all[z]! - hit[z]!, all[z]!);
      }
      const den = all[0]! * all[1]! * all[2]!;
      const allHit = hit[0]! * hit[1]! * hit[2]!;
      mark(allHit, den);
      mark(den - allHit, den);
      const f = grab(
        /\\dfrac\{(\d+)\}\{(\d+)\}/,
        plainAnswer(p.answer),
        "101X 답",
      );
      expect(bad.has(`${num(f[0])}/${num(f[1])}`), p.content).toBe(false);
    }
  });

  for (const e of [E102, E103, E104]) {
    it(`\`${e.rpmType}\` — 발문에 찍힌 수의 한두 번 연산으로 답이 안 나온다`, () => {
      let hits = 0;
      for (const p of rows(e)) {
        const printed = [...new Set(mathIntegers(p.content))];
        const guesses = new Set<number>();
        for (const a of printed) {
          guesses.add(a);
          guesses.add(2 * a);
          guesses.add(3 * a);
          for (const d of [2, 3, 4, 5, 6, 10]) guesses.add(a / d);
        }
        for (const a of printed)
          for (const b of printed) {
            if (a === b) continue;
            guesses.add(a - b);
            guesses.add(a + b);
            guesses.add(a * b);
            guesses.add(a / b);
            guesses.add(Math.round(a / b));
            guesses.add((a - b) / 2);
            guesses.add((a + b) / 2);
            guesses.add((a - b) / 3);
          }
        const ans = num(
          grab(/(\d+)/, plainAnswer(p.answer), `${e.rpmType} 답`)[0],
        );
        if (guesses.has(ans)) hits += 1;
      }
      expect(hits, `${e.rpmType} 지름길`).toBe(0);
    });
  }
});

describe("중2 확대 갈래 5차 `m2Top5a` — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`101X` — 갈래를 하나 빠뜨리면 확률이 작아진다", () => {
    for (const p of rows(E101, 60)) {
      const chances: [number, number][] = [
        [p.facts.a1!, p.facts.b1!],
        [p.facts.a2!, p.facts.b2!],
        [p.facts.a3!, p.facts.b3!],
      ];
      const full = exactlyTwoProbability(chances)!;
      for (const cases of [
        [0, 1],
        [1, 2],
        [0, 2],
      ]) {
        const part = exactlyTwoProbability(chances, cases)!;
        expect(part[0] / part[1], p.content).toBeLessThan(full[0] / full[1]);
      }
    }
  });

  it("`102X` — 「둘레의 차」로 읽으면 답이 달라진다", () => {
    for (const p of rows(E102, 60)) {
      const right = segmentFromPerimeters(
        p.facts.ab!,
        p.facts.whole!,
        p.facts.small!,
      );
      const wrong = segmentFromPerimeters(
        p.facts.ab!,
        p.facts.whole!,
        p.facts.small!,
        false,
      );
      expect(right).toBe(p.facts.x);
      expect(wrong).not.toBe(right);
    }
  });

  it("`103X` — 「단순평균」으로 읽으면 답이 달라진다", () => {
    for (const p of rows(E103, 60)) {
      const right = swapAmount(
        p.facts.a!,
        p.facts.b!,
        p.facts.amountA!,
        p.facts.amountB!,
      );
      const wrong = swapAmount(
        p.facts.a!,
        p.facts.b!,
        p.facts.amountA!,
        p.facts.amountB!,
        false,
      );
      expect(right).toBe(p.facts.x);
      expect(wrong).toBe(p.facts.amountA! / 2);
      expect(wrong).not.toBe(right);
    }
  });

  it("`104X` — 삼각형 조건을 안 쓰면 합이 커진다", () => {
    for (const p of rows(E104, 60)) {
      const right = bisectorNaturalBases(p.facts.sideAC!, p.facts.sideAB!);
      const loose = bisectorNaturalBases(
        p.facts.sideAC!,
        p.facts.sideAB!,
        false,
      );
      expect(right.reduce((s, v) => s + v, 0)).toBe(p.facts.x);
      expect(loose.reduce((s, v) => s + v, 0)).toBeGreaterThan(p.facts.x!);
      // 버려지는 값에 $b+c$ 가 반드시 들어 있다(㉴ 의 버리는 걸음).
      expect(loose).toContain(p.facts.sideAB! + p.facts.sideAC!);
      expect(right).not.toContain(p.facts.sideAB! + p.facts.sideAC!);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 내보낸 함수 — 손 실측 눈금 (㉷ 주석의 단언을 시험이 문다)
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 `m2Top5a` — 내보낸 함수", () => {
  it("`exactlyTwoProbability` 는 갈래 셋을 실제로 센다 (손 실측)", () => {
    // $P(A)=\frac12$, $P(B)=\frac13$, $P(C)=\frac14$
    // 정확히 둘: $\frac12\cdot\frac13\cdot\frac34+\frac12\cdot\frac23\cdot\frac14+\frac12\cdot\frac13\cdot\frac14$
    //          $=\frac{3+2+1}{24}=\frac14$
    expect(
      exactlyTwoProbability([
        [1, 2],
        [1, 3],
        [1, 4],
      ]),
    ).toEqual([1, 4]);
    // 갈래 둘만 세면 $\frac{1+2}{24}=\frac18$
    expect(
      exactlyTwoProbability(
        [
          [1, 2],
          [1, 3],
          [1, 4],
        ],
        [0, 1],
      ),
    ).toEqual([1, 8]);
    // 음성 — 셋이 아니거나 확률이 아니면 `null`
    expect(
      exactlyTwoProbability([
        [1, 2],
        [1, 3],
      ]),
    ).toBeNull();
    expect(
      exactlyTwoProbability([
        [3, 2],
        [1, 3],
        [1, 4],
      ]),
    ).toBeNull();
    expect(
      exactlyTwoProbability(
        [
          [1, 2],
          [1, 3],
          [1, 4],
        ],
        [0, 5],
      ),
    ).toBeNull();
  });

  it("`segmentFromPerimeters` 는 둘레의 비를 실제로 쓴다 (손 실측)", () => {
    // $\overline{AD}=42\times\frac{105}{147}=30$ 이므로 $\overline{DB}=12$
    expect(segmentFromPerimeters(42, 147, 105)).toBe(12);
    // 굳힘을 지우면 「둘레의 차」 $147-105=42$
    expect(segmentFromPerimeters(42, 147, 105, false)).toBe(42);
    // 음성 — 나누어떨어지지 않거나 둘레가 뒤집혔다
    expect(segmentFromPerimeters(10, 7, 3)).toBeNull();
    expect(segmentFromPerimeters(42, 105, 147)).toBeNull();
  });

  it("`swapAmount` 는 가중평균을 실제로 쓴다 (손 실측)", () => {
    // $y=\frac{17\times360+2\times240}{600}=11$, $x=\frac{(11-17)\times360}{2-17}=144$
    expect(swapAmount(17, 2, 360, 240)).toBe(144);
    // 단순평균으로 읽으면 $\frac{P}{2}=180$
    expect(swapAmount(17, 2, 360, 240, false)).toBe(180);
    // 음성 — 두 농도가 같거나 자연수로 안 떨어진다
    expect(swapAmount(5, 5, 100, 200)).toBeNull();
    expect(swapAmount(10, 20, 100, 140)).toBeNull();
  });

  it("`bisectorNaturalBases` 는 삼각형 조건을 실제로 본다 (손 실측)", () => {
    // $\overline{AB}=16$, $\overline{AC}=28$ → $\overline{BD}:\overline{DC}=4:7$,
    // $a$ 는 $11$ 의 배수, 범위 $(12,44)$ → $22$, $33$
    expect(bisectorNaturalBases(28, 16)).toEqual([22, 33]);
    // 조건을 안 쓰면 $11$, $22$, $33$, $44$ 가 다 살아난다
    expect(bisectorNaturalBases(28, 16, false)).toEqual([11, 22, 33, 44]);
    expect(bisectorNaturalBases(0, 5)).toEqual([]);
  });

  it("`reduceFraction` 은 늘 기약이고 분모가 양수다", () => {
    expect(reduceFraction(6, 24)).toEqual([1, 4]);
    expect(reduceFraction(3, -9)).toEqual([-1, 3]);
    expect(reduceFraction(0, 5)).toEqual([0, 1]);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 `m2Top5a` — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `101X` 가 「성공하는 확률」이 아니라 「성공할 확률」이라고 적는다", () => {
    for (const p of rows(E101, 200)) {
      expect(p.solution).not.toContain("성공하는 확률");
      expect(p.solution).not.toContain("맞히는 확률");
      expect(p.solution).toMatch(/(성공할|맞힐) 확률은/);
    }
  });

  it("⑵ 🔴 `101X` 의 약분 줄이 「$N$가므로」가 아니라 「$N$이므로」다", () => {
    for (const p of rows(E101, 200)) {
      expect(p.solution).not.toMatch(/\$\d+\$가므로/);
      expect(p.solution).toMatch(/최대공약수가 \$\d+\$이므로/);
    }
  });

  it("⑶ 🔴 `104X` 가 「$3$을 $5$는 서로소」가 아니라 「$3$과 $5$는 서로소」다", () => {
    for (const p of rows(E104, 200)) {
      expect(p.solution).toMatch(/\$\d+\$(과|와) \$\d+\$(은|는) 서로소이므로/);
      expect(p.solution).not.toMatch(/\$\d+\$(을|를) \$\d+\$(은|는) 서로소/);
    }
  });

  it("⑷ 🔴 `103X` 의 $x$ 계수가 $1$ 이 아니다 — 지면에 `1x` 가 나가면 안 된다", () => {
    for (const p of rows(E103, 400)) {
      expect(Math.abs(p.facts.a! - p.facts.b!)).toBeGreaterThanOrEqual(2);
      expect(p.solution).not.toMatch(/(?<![\d.])1x/);
    }
  });

  it("⑸ 🔴 `102X` 의 $\\overline{AB}$ 가 둘레의 절반보다 짧다 — 아니면 삼각형이 아니다", () => {
    for (const p of rows(E102, 400)) {
      expect(p.facts.ab! * 2, p.content).toBeLessThan(p.facts.whole!);
      expect(p.facts.small!, p.content).toBeLessThan(p.facts.whole!);
    }
  });

  it("⑹ 🔴 `104X` 의 두 변이 서로 다르다 — 같으면 $\\mathrm{D}$ 가 중점이라 시시하다", () => {
    for (const p of rows(E104, 400)) {
      expect(p.facts.sideAB).not.toBe(p.facts.sideAC);
      expect(p.facts.count, p.content).toBeGreaterThanOrEqual(2);
      expect(p.facts.count, p.content).toBeLessThanOrEqual(5);
    }
  });

  it("⑺ 🔴 `101X` 가 소재 넷을 **다** 낸다 — 하나로 굳으면 말이 늘 같아진다", () => {
    const seen = new Set<string>();
    for (const p of rows(E101, WIDE)) {
      const m = /확률이 각각/.exec(p.content);
      expect(m, p.content).not.toBeNull();
      seen.add(p.content.slice(0, p.content.indexOf(" 확률이 각각")));
    }
    expect(seen.size, "소재").toBeGreaterThanOrEqual(4);
  });

  it("⑻ 🔴 `103X` 가 두 소재를 **둘 다** 내고 두 그릇의 크기 차례도 섞인다", () => {
    let bigger = 0;
    let smaller = 0;
    const liquids = new Set<string>();
    for (const p of rows(E103, WIDE)) {
      liquids.add(/소금물/.test(p.content) ? "소금물" : "설탕물");
      if (p.facts.amountA! > p.facts.amountB!) bigger += 1;
      else smaller += 1;
    }
    expect(liquids.size).toBe(2);
    expect(bigger).toBeGreaterThan(50);
    expect(smaller).toBeGreaterThan(50);
  });

  it("⑼ 🔴 `103X` 가 두 농도의 차례를 섞는다 — 늘 $a<b$ 면 대입 줄이 한 방향뿐이다", () => {
    let up = 0;
    let down = 0;
    for (const p of rows(E103, WIDE)) {
      if (p.facts.b! > p.facts.a!) up += 1;
      else down += 1;
    }
    expect(up).toBeGreaterThan(50);
    expect(down).toBeGreaterThan(50);
  });

  it("⑽ 🔴 `104X` 가 후보 개수를 둘 이상으로 낸다 — 하나면 「모두」가 뜻이 없다", () => {
    const counts = new Set<number>();
    for (const p of rows(E104, WIDE)) counts.add(p.facts.count!);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(2);
    expect(counts.size, "후보 개수 갈래").toBeGreaterThan(1);
  });
});
