/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5j.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `140X` | 여사건으로 뒤집어 $\dfrac{a}{a+b+x}=\dfrac{q-p}{q}$ 를 풀어 전체 개수를 얻는다 | **나눗셈을 한 번도 안 한다** — 전체 개수 $W$ 를 $a+b+2$ 부터 넉넉한 위끝까지 **전부 넣어 보고** $(W-a)\times q=W\times p$ 인 것만 모은다. 그런 $W$ 가 **하나뿐**인지까지 이 훑기가 답한다 |
 * | `141X` | 두 식을 변끼리 더해 $(a+1)x=N$ 을 얻고 $N$ 의 약수를 센다 | **약수를 한 번도 안 구한다** — $a$ 를 $1$ 부터 $2N$ 까지 넣어 보고 그때마다 **크라메르 공식**으로 $x=\dfrac{S+T}{a+1}$, $y=\dfrac{aS-T}{a+1}$ 를 **행렬식으로** 따로 만들어 둘 다 자연수인지 본다. 훑는 위끝이 $N$ 을 크게 넘으므로 「모두」가 범위 밖에서 반증되지 않는 것까지 확인된다 |
 * | `142X` | 세 대응마다 둘레 $\dfrac{(\text{둘레})\times t}{s}$ 를 한 번에 만든다 | **둘레를 곱해 쓰지 않는다** — 닮음비를 기약 $\dfrac{n}{d}$ 로 줄이고 **세 변을 하나씩** $v\times n\div d$ 로 만들어 셋 다 자연수인지 보고, 그 **세 값을 더해** 둘레를 얻는다 |
 * | `143X` | $\overline{PM}+\overline{QN}=\dfrac{1}{4}(\overline{AB}+\overline{AC})$ 로 합만 쓴다 | **합으로 뭉치지 않는다** — $\overline{AB}$ 를 실제 값 여럿으로 **직접 놓아** 네 변을 각각 만들고 더한다. 그리고 **그 여럿이 모두 같은 값을 주는지**까지 확인한다 — 이 유형이 「각각은 몰라도 된다」고 주장하는 바로 그 자리다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * 🔴 그리고 음성 눈금은 **자기 축을 홀로 갈라야** 한다. 그래서 던지는 말을 축마다
 * 다르게 두고, 눈금이 **그 말을 그대로 맞대게** 했다 — 다른 검사가 먼저 물면 말이
 * 달라져 **빨개진다**(4차가 여덟 자리에서 이것을 못 하고 있었다).
 *
 * ## ⑶ 🔴 앞 물결이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**을 뽑아 좌·우를 각각 계산해 맞댄다. 공식을 옮겨
 *       적는 게 아니라 **산술을 하는 것**이라 동어반복이 아니다. `\dfrac`·`\times`·
 *       `\div`·괄호·단위 괄호를 읽는 **작은 파서**를 여기 따로 들고 있다.
 *   ㄴ. **해설에 나온 모든 수가 재계산으로 설명되는가** — 발문에서 읽은 값과 독립
 *       검산이 낳은 값만 허용하고, 그 밖의 수가 하나라도 있으면 빨개진다.
 *   ㄷ. **해설의 «말»**(㉳) — 「$1$에서 … 뺀 것과 같다」·「변끼리 더하면」·「약수여야
 *       한다」·「나누어떨어지지 않으므로」·「중점연결정리」 따위를 **옳은 쪽이 있고
 *       뒤집힌 쪽이 없는가**로 잰다. 낱말을 뒤집으면 빨개지는 눈금을 같이 둔다.
 *       🔴 소재마다 달라지는 낱말은 **안 넣는다** — 넣으면 소재가 바뀌는 순간
 *       «깨끗»이 아니라 «못 셈»이 된다.
 *   ㄹ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아닌가.
 *   ㅁ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 한 단(964.8px)이
 *       아니라 **700px** 아래로 잠근다.
 *   ㅂ. **제약을 스스로 어기지 않는가**(㉴) — `141X` 가 지면에 적은 $x\le S-1$ 안에
 *       나열한 값이 **전부** 들어 있고, 버리는 값은 **밖**에 있는가.
 *   ㅅ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은
 *    재지만 설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로
 *    눈으로 읽었고, 그때 고친 자리(「구슬은 꺼낼 확률」 → 「구슬**을** 꺼낼 확률」 ·
 *    「$36$로」 → 「$36$**으로**」)를 아래 회귀 잠금에 남긴다.
 * 2. `142X` 의 검산은 유리수를 정수 분자·분모로 들고 다닌다(부동소수 티끌 없음).
 *    나머지 셋은 정수 산술이다.
 * 3. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 * 4. 「이 네 소단원에 확대 갈래가 없었다」는 **색인 유형에 대해서만** 확인한다 —
 *    다른 갈래가 같은 소단원에 확장 유형을 더하는 날 거짓 경보가 나지 않게 했다.
 * 5. 🔴 파생 객관식 오답(공용 `deriveFormats`)이 무엇을 내는지는 **안 잰다.**
 *    넷 다 발문이 상한을 선언하지 않아 ㉱ 의 자가 `null` 을 내는 것만 못 박는다.
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
  addedCount,
  divisorsOf,
  hasFinalConsonant,
  M2_TOP_5J,
  midQuadPerimeter,
  naturalCoefficients,
  similarPerimeters,
} from "@/lib/middle/m2Top5j";
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
const BASE_SEED = 20260906;
/** 🔴 쏠림은 **씨앗 블록 넷**으로 잰다 — 한 블록만 보면 여유를 낙관적으로 적는다. */
const SEED_BLOCKS = [20260906, 900000, 123456, 5550000];
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260906, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5J.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E140 = entryOf("140X");
const E141 = entryOf("141X");
const E142 = entryOf("142X");
const E143 = entryOf("143X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "140X": "심화중",
  "141X": "심화상",
  "142X": "심화상",
  "143X": "심화중",
};

/** 한 판에 **산술 등식이 몇 개** 나오는가 — 실측값(0 은 «깨끗»과 «못 셈»을 안 가른다). */
const ARITH_FLOOR: Record<string, number> = {
  "140X": 8,
  "141X": 9,
  "142X": 11,
  "143X": 5,
};

/**
 * 한 판에 **조사 판정 후보가 몇 개** 걸리는가 — 실측값.
 *
 * 🔴 `140X` 가 유난히 적은 데는 까닭이 있다. 그 지면의 조사는 대부분
 * 「$\dfrac{p}{q}$이 되었다」 꼴인데, `josaMismatches` 는 **「이」를 일부러 안 본다**
 * (서술격 「$5$이다」와 안 갈리기 때문이다 — `midPage.ts` 머리말). 그래서 「가」인
 * 판만 세어진다. 「$115$ 는 적다」가 아니라 **그 자가 이 유형에서 볼 수 있는 전부**다.
 */
const JOSA_FLOOR: Record<string, number> = {
  "140X": 100,
  "141X": 1500,
  "142X": 500,
  "143X": 400,
};

/** 리드가 소단원마다 실측해 준 **변형 폭 최소치**. */
const FLOOR: Record<string, number> = {
  "140X": 9,
  "141X": 12,
  "142X": 12,
  "143X": 12,
};

/** 유형이 붙는 소단원 — 이름은 아래에서 단원 정본에 **대조**한다. */
const SECTION_OF: Record<string, string> = {
  "140X": "확률의 뜻과 성질",
  "141X": "연립방정식의 풀이의 응용",
  "142X": "닮은 도형",
  "143X": "삼각형의 두 변의 중점을 연결한 선분",
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

/** ⚠️ 제품의 최대공약수를 **안 쓴다** — 검산이 제품을 부르면 동어반복이다. */
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

// ── ㄱ. 해설의 **모든 산술 등식**을 좌·우 따로 계산한다 ──────
//
// ⚠️ 4차의 자는 정수·`+`·`-`·`\times` 만 읽었다. 이 물결의 지면에는 `\dfrac`·`\div`·
//    괄호·단위 괄호 `\,(\mathrm{cm})` 가 들어가므로 그 자를 그대로 쓰면 **구조적으로
//    0** 이 되는 자리가 생긴다 — 실제로 단위 괄호를 안 걷었을 때 `143X` 의 산술
//    등식이 **한 판도 안 잡혔다**(실측 0). 그래서 아주 작은 파서를 여기 따로 둔다.

/** `42\times\dfrac{5}{7}\,(\mathrm{cm})` 처럼 순수 산술인 조각의 값. 아니면 `null`. */
export function evalArith(src: string): number | null {
  let s = src.replace(/\\,/g, "").replace(/\\mathrm\{[^}]*\}/g, "");
  s = s.replace(/\\d?frac\{(-?\d+)\}\{(-?\d+)\}/g, "($1/$2)");
  s = s.replace(/\\times/g, "*").replace(/\\div/g, "/");
  // 단위를 걷어 낸 자리에 남는 빈 괄호 — `12\,(\mathrm{cm})` → `12()`.
  s = s.replace(/\(\)/g, "");
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

const RE_140 = /속에 [가-힣 ]+ \$(\d+)\$개와 [가-힣 ]+ \$(\d+)\$개가 들어 있다/;
const RE_140_FRAC = /아닐 확률이 \$\\dfrac\{(\d+)\}\{(\d+)\}\$/;
const RE_141 = /\\begin\{cases\}x\+y=(\d+)\\\\ax-y=(\d+)\\end\{cases\}/;
const RE_142 =
  /세 변의 길이는 각각 \$(\d+)\\,\\mathrm\{cm\}\$, \$(\d+)\\,\\mathrm\{cm\}\$, \$(\d+)\\,\\mathrm\{cm\}\$이고, \$\\triangle DEF\$의 한 변의 길이는 \$(\d+)\\,\\mathrm\{cm\}\$/;
const RE_143 =
  /둘레의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$이고 \$\\overline\{BC\}=(\d+)\\,\\mathrm\{cm\}\$/;

/**
 * `140X` — **나눗셈을 한 번도 안 하고** 전체 개수를 전부 넣어 본다.
 * $(W-a)\times q=W\times p$ 인 $W$ 가 **하나뿐**인지까지 여기서 답한다.
 */
export function verifyAddedCount(content: string): string {
  const g = grab(RE_140, content, "140X");
  const f = grab(RE_140_FRAC, content, "140X 분수");
  const a = num(g[0]);
  const b = num(g[1]);
  const p = num(f[0]);
  const q = num(f[1]);
  if (!(p >= 1 && p < q))
    throw new Error("140X 불변식: 확률이 $0$ 과 $1$ 사이가 아니다");
  if (gcd2(p, q) !== 1)
    throw new Error("140X 불변식: 발문의 분수가 기약이 아니다");
  if (a < 2) throw new Error("140X 불변식: 처음 개수가 $2$ 미만이다");
  if (b < 1) throw new Error("140X 불변식: 다른 쪽 개수가 $1$ 미만이다");
  const found: number[] = [];
  for (let w = a + b + 1; w <= 40 * (a + b + 1); w += 1) {
    if ((w - a) * q === w * p) found.push(w);
  }
  if (found.length !== 1)
    throw new Error(
      `140X 불변식: 전체 개수가 자연수인 자리가 ${found.length}개다`,
    );
  const added = found[0]! - a - b;
  if (added < 2)
    throw new Error(`140X 불변식: 더 넣은 개수가 ${added}로 $2$ 미만이다`);
  return `${added}개`;
}

/**
 * `141X` — **약수를 한 번도 안 구한다.** $a$ 를 하나씩 넣어 **크라메르 공식**으로
 * $x$, $y$ 를 따로 만들어 둘 다 자연수인지 본다. 훑는 위끝이 $S+T$ 를 크게 넘으므로
 * 「모두」가 범위 밖에서 반증되지 않는 것까지 확인된다.
 */
export function verifyNaturalCoefficients(content: string): string {
  const g = grab(RE_141, content, "141X");
  const S = num(g[0]);
  const T = num(g[1]);
  if (S < 2) throw new Error("141X 불변식: 첫째 식의 우변이 $2$ 미만이다");
  if (T < 1) throw new Error("141X 불변식: 둘째 식의 우변이 $1$ 미만이다");
  const keep: number[] = [];
  const drop: number[] = [];
  for (let a = 1; a <= 2 * (S + T); a += 1) {
    // 크라메르 공식 — 계수행렬 $\begin{pmatrix}1&1\\a&-1\end{pmatrix}$ 의 행렬식은 $-(a+1)$.
    const den = a + 1;
    const xn = S + T;
    const yn = a * S - T;
    if (xn % den !== 0) continue;
    if (yn % den !== 0 || yn / den < 1) {
      drop.push(a);
      continue;
    }
    if (xn / den < 1) {
      drop.push(a);
      continue;
    }
    keep.push(a);
  }
  if (keep.length < 2 || keep.length > 4)
    throw new Error(`141X 불변식: 살아남는 값이 ${keep.length}개다`);
  if (drop.length < 1 || drop.length > 3)
    throw new Error(`141X 불변식: 버리는 값이 ${drop.length}개다`);
  return String(keep.reduce((s, v) => s + v, 0));
}

/**
 * `142X` — **둘레를 곱해 쓰지 않는다.** 닮음비를 기약 $\dfrac{n}{d}$ 로 줄이고
 * **세 변을 하나씩** 만들어 셋 다 자연수인지 본 뒤 그 셋을 **더해** 둘레를 얻는다.
 */
export function verifySimilarPerimeters(content: string): string {
  const g = grab(RE_142, content, "142X");
  const sides = [num(g[0]), num(g[1]), num(g[2])];
  const t = num(g[3]);
  if (new Set(sides).size !== 3)
    throw new Error("142X 불변식: 세 변의 길이가 서로 다르지 않다");
  const sorted = [...sides].sort((x, y) => x - y);
  if (sorted[0]! + sorted[1]! <= sorted[2]!)
    throw new Error("142X 불변식: 삼각형이 되지 않는다");
  if (sides.includes(t))
    throw new Error("142X 불변식: 주어진 변의 길이가 원래 삼각형의 변과 같다");
  const perims: number[] = [];
  for (const s of sides) {
    const k = gcd2(t, s);
    const n = t / k;
    const d = s / k;
    const made = sides.map((v) => ((v * n) % d === 0 ? (v * n) / d : null));
    if (made.some((v) => v === null)) continue;
    perims.push((made as number[]).reduce((x, y) => x + y, 0));
  }
  if (perims.length !== 2)
    throw new Error(`142X 불변식: 살아남는 후보가 ${perims.length}개다`);
  if (new Set(perims).size !== 2)
    throw new Error("142X 불변식: 두 둘레의 길이가 같다");
  const total = perims[0]! + perims[1]!;
  return `${total}\\,\\mathrm{cm}`;
}

/**
 * `143X` — **합으로 뭉치지 않는다.** $\overline{AB}$ 를 실제 값 여럿으로 직접 놓아
 * 네 변을 각각 만들고 더한 뒤, **그 여럿이 모두 같은 값을 주는지** 확인한다.
 * 이 유형이 「각각은 몰라도 된다」고 주장하는 바로 그 자리다.
 */
export function verifyMidQuadPerimeter(content: string): string {
  const g = grab(RE_143, content, "143X");
  const L = num(g[0]);
  const base = num(g[1]);
  const rest = L - base;
  if (rest <= base)
    throw new Error(
      "143X 불변식: 두 변의 길이의 합이 나머지 한 변보다 크지 않다",
    );
  if (base % 4 !== 0)
    throw new Error("143X 불변식: 밑변이 $4$의 배수가 아니다");
  if (rest % 4 !== 0)
    throw new Error("143X 불변식: 두 변의 길이의 합이 $4$의 배수가 아니다");
  // $\overline{AB}$ 를 여러 값으로 직접 놓는다 — 삼각형이 되는 자리만 쓴다.
  // 넷 배로 셈해 부동소수 티끌을 없앤다(마지막에 $4$ 로 나눈다).
  const seen = new Set<number>();
  for (let ab4 = 4; ab4 < 4 * rest; ab4 += 1) {
    const ac4 = 4 * rest - ab4;
    if (ac4 <= 0) continue;
    if (ab4 + ac4 <= 4 * base) continue;
    if (ab4 + 4 * base <= ac4 || ac4 + 4 * base <= ab4) continue;
    // $\overline{PQ}=\frac14 a$, $\overline{QN}=\frac14 \overline{AC}$,
    // $\overline{NM}=\frac12 a$, $\overline{MP}=\frac14 \overline{AB}$
    const sum16 = 4 * base + ac4 + 8 * base + ab4;
    if (sum16 % 16 !== 0) continue;
    seen.add(sum16 / 16);
  }
  if (seen.size !== 1)
    throw new Error(
      `143X 불변식: 둘레가 $\\overline{AB}$ 에 따라 ${seen.size}가지로 갈린다`,
    );
  return `${[...seen][0]}\\,\\mathrm{cm}`;
}

const VERIFY: Record<string, (content: string) => string> = {
  "140X": verifyAddedCount,
  "141X": verifyNaturalCoefficients,
  "142X": verifySimilarPerimeters,
  "143X": verifyMidQuadPerimeter,
};

/** `facts` 만으로 정답 문자열을 다시 짓는다 — 계약 ⑷.2 의 왕복 검사. */
function rebuildAnswer(rpmType: string, facts: Record<string, number>): string {
  if (rpmType === "140X") return `$${facts.x}$개`;
  if (rpmType === "141X") return `$${facts.x}$`;
  if (rpmType === "142X") return `$${facts.x}\\,\\mathrm{cm}$`;
  if (rpmType === "143X") return `$${facts.x}\\,\\mathrm{cm}$`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ═══════════════════════════════════════════════════════════
// ㄷ. 해설의 **말** — 옳은 쪽이 있고 뒤집힌 쪽이 없는가 (㉳)
// ═══════════════════════════════════════════════════════════

/**
 * 유형마다 「왜 그런가」를 진술하는 줄의 **낱말 쌍** — `[옳은 말, 뒤집힌 말]`.
 *
 * 🔴 「옳은 말이 있는가」만 보면 안 된다. 뒤집힌 말이 **접두로 옳은 말을 품는**
 *    자리가 있어서 한쪽만 보면 안 갈린다. 그래서 **둘 다** 본다.
 * 🔴 그리고 **소재마다 달라지는 낱말은 넣지 않는다** — 「구슬」·「사탕」을 넣으면
 *    소재가 바뀌는 순간 그 시험이 «깨끗»이 아니라 «못 셈»이 된다.
 */
const REASON_WORDS: Record<string, ReadonlyArray<readonly [string, string]>> = {
  "140X": [
    [
      "$1$에서 그 사건이 일어날 확률을 뺀 것과 같다",
      "$1$에 그 사건이 일어날 확률을 더한 것과 같다",
    ],
    ["그대로", "두 배로"],
    ["처음에 있던", "나중에 남은"],
    ["두 값이 같으므로", "두 값이 다르므로"],
  ],
  "141X": [
    ["변끼리 더하면", "변끼리 빼면"],
    ["의 약수여야 한다", "의 배수여야 한다"],
    ["둘 다 자연수이다", "둘 다 자연수가 아니다"],
    ["이 경우는 버린다", "이 경우도 넣는다"],
    ["$2$ 이상의 자연수", "$2$ 미만의 자연수"],
  ],
  "142X": [
    ["대응변의 길이의 비는 모두 같고", "대응변의 길이의 비는 서로 다르고"],
    [
      "정해져 있지 않으므로 세 경우를 모두 따진다",
      "정해져 있으므로 한 경우만 따진다",
    ],
    ["나누어떨어지지 않으므로", "꼭 나누어떨어지므로"],
    ["이 경우는 버린다", "이 경우도 넣는다"],
    ["둘 다 자연수이고", "둘 다 자연수가 아니고"],
  ],
  "143X": [
    ["중점연결정리에 의해", "피타고라스 정리에 의해"],
    [
      "각각의 길이는 정해지지 않지만 그 합은 정해진다",
      "각각의 길이도 그 합도 정해지지 않는다",
    ],
    ["같은 정리를 한 번 더 적용하면", "다른 정리를 처음으로 적용하면"],
    ["나머지 한 변과 평행하고", "나머지 한 변과 수직이고"],
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
    type: "140X",
    page:
      "주머니 속에 빨간 구슬 $6$개와 파란 구슬 $5$개가 들어 있다. " +
      "이 주머니에 파란 구슬만 몇 개 더 넣었더니 주머니에서 구슬 한 개를 꺼낼 때 " +
      "그것이 빨간 구슬이 아닐 확률이 $\\dfrac{5}{6}$가 되었다. 더 넣은 파란 구슬의 개수를 구하시오.",
    // 빨간 구슬일 확률 $\frac16$ → 전체 $36$ → $36-6-5=25$
    want: "25개",
  },
  {
    type: "141X",
    page:
      "$a$가 자연수일 때, 연립방정식 $\\begin{cases}x+y=12\\\\ax-y=14\\end{cases}$의 해 $x$, $y$가 " +
      "모두 자연수가 되도록 하는 $a$의 값을 모두 구하여 그 합을 구하시오.",
    // $(a+1)x=26$ → $a+1\in\{13,26\}$ → $a=12,25$ → 합 $37$ ($a+1=2$ 는 $y=-1$)
    want: "37",
  },
  {
    type: "142X",
    page:
      "두 삼각형 $ABC$와 $DEF$는 서로 닮은 도형이다. $\\triangle ABC$의 세 변의 길이는 각각 " +
      "$24\\,\\mathrm{cm}$, $8\\,\\mathrm{cm}$, $20\\,\\mathrm{cm}$이고, $\\triangle DEF$의 한 변의 " +
      "길이는 $6\\,\\mathrm{cm}$이며 나머지 두 변의 길이도 모두 자연수이다. " +
      "$\\triangle DEF$의 둘레의 길이가 될 수 있는 값을 모두 구하여 그 합을 구하시오.",
    // $s=24$ → $6,2,5$ (둘레 $13$) · $s=8$ → $18,6,15$ (둘레 $39$) · $s=20$ → $7.2$ 라 버린다
    want: "52\\,\\mathrm{cm}",
  },
  {
    type: "143X",
    page:
      "$\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하고, " +
      "$\\overline{AM}$, $\\overline{AN}$의 중점을 각각 $P$, $Q$라 하자. " +
      "$\\triangle ABC$의 둘레의 길이가 $60\\,\\mathrm{cm}$이고 $\\overline{BC}=24\\,\\mathrm{cm}$일 때, " +
      "사각형 $PMNQ$의 둘레의 길이를 구하시오.",
    // $\overline{PQ}=6$, $\overline{MN}=12$, $\overline{PM}+\overline{QN}=\frac14\times36=9$
    want: "27\\,\\mathrm{cm}",
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
    type: "140X",
    page: GAUGE_OK[0]!.page.replace("\\dfrac{5}{6}", "\\dfrac{4}{6}"),
    says: "발문의 분수가 기약이 아니다",
  },
  {
    type: "140X",
    page: GAUGE_OK[0]!.page.replace("\\dfrac{5}{6}", "\\dfrac{7}{6}"),
    says: "확률이 $0$ 과 $1$ 사이가 아니다",
  },
  {
    type: "140X",
    // 빨간 구슬일 확률이 $\frac47$ 이면 전체가 $10.5$ 라 자연수가 아니다.
    page: GAUGE_OK[0]!.page.replace("\\dfrac{5}{6}", "\\dfrac{3}{7}"),
    says: "전체 개수가 자연수인 자리가 0개다",
  },
  {
    type: "140X",
    // 빨간 구슬일 확률이 $\frac12$ 이면 전체가 $12$ 라 더 넣은 개수가 $1$ 뿐이다.
    page: GAUGE_OK[0]!.page.replace("\\dfrac{5}{6}", "\\dfrac{1}{2}"),
    says: "더 넣은 개수가 1로 $2$ 미만이다",
  },
  {
    type: "141X",
    // $N=36$, $x\le12$ → 약수 $3,4,6,9,12,18,36$ 의 **일곱**이 살아난다.
    page: GAUGE_OK[1]!.page
      .replace("x+y=12", "x+y=13")
      .replace("ax-y=14", "ax-y=23"),
    says: "살아남는 값이 7개다",
  },
  {
    type: "141X",
    // $N=7$ → 약수 $7$ 하나뿐이라 살아남는 값이 하나다.
    page: GAUGE_OK[1]!.page
      .replace("x+y=12", "x+y=6")
      .replace("ax-y=14", "ax-y=1"),
    says: "살아남는 값이 1개다",
  },
  {
    type: "141X",
    // $N=21$, $x\le11$ → 약수 $3,7,21$ 이 **전부** 살아나 버리는 값이 없다.
    page: GAUGE_OK[1]!.page.replace("ax-y=14", "ax-y=9"),
    says: "버리는 값이 0개다",
  },
  {
    type: "142X",
    page: GAUGE_OK[2]!.page.replace(
      "$8\\,\\mathrm{cm}$",
      "$24\\,\\mathrm{cm}$",
    ),
    says: "세 변의 길이가 서로 다르지 않다",
  },
  {
    type: "142X",
    // $2+20\le24$ — 삼각형이 안 된다.
    page: GAUGE_OK[2]!.page.replace("$8\\,\\mathrm{cm}$", "$2\\,\\mathrm{cm}$"),
    says: "삼각형이 되지 않는다",
  },
  {
    type: "142X",
    page: GAUGE_OK[2]!.page.replace(
      "길이는 $6\\,\\mathrm{cm}$이며",
      "길이는 $8\\,\\mathrm{cm}$이며",
    ),
    says: "주어진 변의 길이가 원래 삼각형의 변과 같다",
  },
  {
    type: "142X",
    // $t=4$ 면 $s=8$ 하나만 산다.
    page: GAUGE_OK[2]!.page.replace(
      "길이는 $6\\,\\mathrm{cm}$이며",
      "길이는 $4\\,\\mathrm{cm}$이며",
    ),
    says: "살아남는 후보가 1개다",
  },
  {
    type: "142X",
    // $t=120$ 이면 셋이 다 살아 «버리는 걸음»이 없다.
    page: GAUGE_OK[2]!.page.replace(
      "길이는 $6\\,\\mathrm{cm}$이며",
      "길이는 $120\\,\\mathrm{cm}$이며",
    ),
    says: "살아남는 후보가 3개다",
  },
  {
    type: "143X",
    page: GAUGE_OK[3]!.page.replace("\\overline{BC}=24", "\\overline{BC}=40"),
    says: "두 변의 길이의 합이 나머지 한 변보다 크지 않다",
  },
  {
    type: "143X",
    page: GAUGE_OK[3]!.page.replace("\\overline{BC}=24", "\\overline{BC}=26"),
    says: "밑변이 $4$의 배수가 아니다",
  },
  {
    type: "143X",
    page: GAUGE_OK[3]!.page.replace("둘레의 길이가 $60", "둘레의 길이가 $62"),
    says: "두 변의 길이의 합이 $4$의 배수가 아니다",
  },
];

describe("중2 확대 갈래 5차 `m2Top5j` — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
    for (const e of M2_TOP_5J) {
      expect(ok.has(e.rpmType), `${e.rpmType} 양성 눈금`).toBe(true);
      expect(bad.has(e.rpmType), `${e.rpmType} 음성 눈금`).toBe(true);
    }
    expect(GAUGE_BAD.length).toBeGreaterThanOrEqual(M2_TOP_5J.length * 3);
  });

  it("🔴 산술 자와 기약 자도 «아니오» 를 낸다", () => {
    expect(arithmeticFaults("$2\\times3=7$")).toHaveLength(1);
    expect(arithmeticFaults("$2\\times3=6$")).toEqual([]);
    expect(arithmeticFaults("$1-\\dfrac{5}{7}=\\dfrac{2}{7}$")).toEqual([]);
    expect(arithmeticFaults("$1-\\dfrac{5}{7}=\\dfrac{3}{7}$")).toHaveLength(1);
    expect(arithmeticFaults("$26\\div13=2$")).toEqual([]);
    expect(arithmeticFaults("$26\\div13=3$")).toHaveLength(1);
    // 🔴 단위 괄호를 못 걷으면 이 부류가 **구조적으로 0** 이 된다(실측으로 물렸다).
    expect(
      arithmeticClaims("$\\dfrac{1}{2}\\times24=12\\,(\\mathrm{cm})$"),
    ).toBe(1);
    expect(
      arithmeticFaults("$\\dfrac{1}{2}\\times24=13\\,(\\mathrm{cm})$"),
    ).toHaveLength(1);
    expect(arithmeticClaims("$2\\times3=6$")).toBe(1);
    // 문자가 든 식은 산술이 아니다 — 세지 않는다(거짓 경보는 가드를 끈다).
    expect(arithmeticClaims("$(a+1)x=26$")).toBe(0);
    expect(arithmeticClaims("$y=12-x$")).toBe(0);
    expect(unreducedFractions("$\\dfrac{2}{4}$")).toEqual(["2/4"]);
    expect(unreducedFractions("$\\dfrac{3}{1}$")).toEqual(["3/1"]);
    expect(unreducedFractions("$\\dfrac{3}{4}$")).toEqual([]);
    expect(fractionCount("$\\dfrac{5}{6}$와 $\\dfrac{1}{6}$")).toBe(2);
    // (으)로 자도 «아니오» 를 낸다.
    expect(euroRoMismatches("$36$로 같다")).toHaveLength(1);
    expect(euroRoMismatches("$36$으로 같다")).toEqual([]);
    expect(euroRoMismatches("$14$로 같다")).toEqual([]);
  });

  it("🔴 말 자도 «아니오» 를 낸다 — 낱말을 뒤집으면 전부 빨개진다", () => {
    for (const e of M2_TOP_5J) {
      const p = e.handler(createRng(BASE_SEED));
      // 음성 대조: 손 안 댄 판은 깨끗하다.
      expect(reasonFaults(e.rpmType, p.solution), e.rpmType).toEqual([]);
      const pairs = REASON_WORDS[e.rpmType]!;
      expect(pairs.length, `${e.rpmType} 말 쌍`).toBeGreaterThanOrEqual(4);
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

describe("중2 확대 갈래 5차 `m2Top5j` — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5J.map((e) => e.rpmType)).toEqual([
      "140X",
      "141X",
      "142X",
      "143X",
    ]);
    expect(new Set(M2_TOP_5J.map((e) => e.key)).size).toBe(4);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5J) {
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
    for (const e of M2_TOP_5J) {
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
    expect([E140.rpmBook, E140.rpmMinor]).toEqual(["2-2", "확률"]);
    expect([E141.rpmBook, E141.rpmMinor]).toEqual(["2-1", "연립일차방정식"]);
    expect([E142.rpmBook, E142.rpmMinor]).toEqual(["2-2", "도형의 닮음"]);
    expect([E143.rpmBook, E143.rpmMinor]).toEqual(["2-2", "삼각형의 무게중심"]);
    // 🔴 셋이 같은 책이라 번호가 겹치면 키가 부딪힌다.
    expect(new Set(M2_TOP_5J.map((e) => e.rpmType)).size).toBe(4);
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    for (const e of M2_TOP_5J) {
      const same = registeredTypes().filter((r) => r.key === e.key);
      // 등록 전이면 0, 등록 뒤면 1 — 둘 다 아니면 다른 모듈과 부딪힌 것이다.
      expect(same.length, `키 충돌: ${e.key}`).toBeLessThanOrEqual(1);
      if (same.length === 1) expect(same[0]!.rpmTitle).toBe(e.rpmTitle);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5J) {
      for (const p of rows(e, 40)) {
        expect(p.difficulty, e.rpmType).toBe(EXPECTED_TIER[e.rpmType]);
        expect(
          resolveMiddleTier(p.difficulty, p.content, !!p.figureSpec),
          e.rpmType,
        ).toBe(EXPECTED_TIER[e.rpmType]);
      }
    }
    // 갈래 넷 가운데 심화중·심화상이 **둘 다** 있다(D-116 브리프).
    const tiers = new Set(M2_TOP_5J.map((e) => EXPECTED_TIER[e.rpmType]));
    expect([...tiers].sort()).toEqual(["심화상", "심화중"]);
    // 몫이 **둘씩**이다 — 한쪽으로 몰리면 D-116 이 재려는 두 축 가운데 하나가 빈다.
    expect(
      M2_TOP_5J.filter((e) => EXPECTED_TIER[e.rpmType] === "심화중").length,
    ).toBe(2);
  });

  it("🔴 이 네 소단원의 **색인 유형**에는 확대 갈래가 하나도 없었다 (D-116 은 «빈 소단원»을 채운다)", () => {
    const targets = new Set(Object.values(SECTION_OF));
    const mine = new Set(M2_TOP_5J.map((e) => e.key));
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
    expect(looked, "네 소단원의 등록 유형").toBeGreaterThan(15);
    expect(failed, "생성에 실패한 유형").toBe(0);
  });
});

describe("중2 확대 갈래 5차 `m2Top5j` — 지면과 값", () => {
  for (const e of M2_TOP_5J) {
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
            // 마크다운 굵게 표시는 지면에 그대로 나간다.
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
        //    «못 셈»을 안 가른다. 유형마다 **실측한 값**으로 못 박는다(`JOSA_FLOOR`).
        expect(judged, `${e.rpmType} 조사 판정 후보`).toBeGreaterThanOrEqual(
          JOSA_FLOOR[e.rpmType]!,
        );
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.solution).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // 🔴 0 은 «깨끗»과 «못 셈»을 안 가른다. 유형마다 **한 판에 몇 개가 나오는지**
        //    실측해 못 박는다 — 지면에서 등식이 사라지면 그 순간 빨개진다.
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
        // `141X`·`142X` 는 분수를 아예 안 쓴다(나눗셈을 `\div` 로 적는다) —
        // 그 «0» 은 «못 셈»이 아니라 **«잴 것이 없다»** 다.
        if (e.rpmType === "141X" || e.rpmType === "142X") expect(seen).toBe(0);
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
          ).toBeGreaterThan(250);
          const conclusion = lines.findIndex((l) => l.startsWith("따라서"));
          expect(
            conclusion,
            `${e.rpmType} 「따라서」 결론 줄이 없다`,
          ).toBeGreaterThan(0);
          // ⚠️ 마지막 줄로 못 박으면 안 된다 — 결론 **뒤에** 확인 줄을 하나 둔다.
          expect(
            lines.length - conclusion,
            `${e.rpmType} 결론이 너무 앞에 있다`,
          ).toBe(2);
          // 🔴 「따라서」가 둘이면 위 `findIndex` 가 결론이 아닌 줄을 잡는다 —
          //    그러면 이 검사가 조용히 뜻을 잃는다.
          expect(
            (p.solution.match(/따라서/g) ?? []).length,
            `${e.rpmType} 「따라서」 개수`,
          ).toBe(1);
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
        //    (`generateMiddleSet` 이 `n*30` 벌까지 그렇게 한다).
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

describe("중2 확대 갈래 5차 `m2Top5j` — 해설의 중간값·제약", () => {
  it("`140X` — 여사건 줄·식 줄·나눗셈 줄·뺄셈 줄·확인 줄을 다섯 다 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E140, WIDE)) {
      const g = grab(RE_140, p.content, "140X");
      const f = grab(RE_140_FRAC, p.content, "140X 분수");
      const a = num(g[0]);
      const b = num(g[1]);
      const pp = num(f[0]);
      const q = num(f[1]);
      const r = q - pp;
      // 여사건 줄
      expect(p.solution).toContain(
        `$1-\\dfrac{${pp}}{${q}}=\\dfrac{${r}}{${q}}$`,
      );
      // 미지수를 세운 줄 — 분모가 «처음 둘 + $x$» 다
      expect(p.solution).toContain(`$\\dfrac{${a}}{${a}+${b}+x}$`);
      // 곱 줄
      expect(p.solution).toContain(
        `$${a}\\times${q}=${r}\\times(${a}+${b}+x)$`,
      );
      // 나눗셈 줄 — 전체 개수
      const whole = (a * q) / r;
      expect(Number.isInteger(whole), p.content).toBe(true);
      expect(p.solution).toContain(`$${a}\\times${q}=${a * q}$`);
      expect(p.solution).toContain(`$${a * q}\\div${r}=${whole}$`);
      // 뺄셈 줄
      expect(p.solution).toContain(`$${a}+${b}=${a + b}$개이므로`);
      expect(p.solution).toContain(`$x=${whole}-${a + b}=${whole - a - b}$`);
      // 확인 줄 — 두 곱이 같다
      const notTarget = whole - a;
      expect(p.solution).toContain(`$${whole}-${a}=${notTarget}$개이고`);
      expect(p.solution).toContain(
        `$${notTarget}\\times${q}=${notTarget * q}$`,
      );
      expect(p.solution).toContain(`$${whole}\\times${pp}=${whole * pp}$`);
      expect(notTarget * q).toBe(whole * pp);
      expect(p.answer).toBe(`$${whole - a - b}$개`);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });

  it("`141X` — 나열 줄이 **자기가 적은 제약 안**이고 버리는 값은 밖이다 (㉴)", () => {
    let checked = 0;
    for (const p of rows(E141, WIDE)) {
      const g = grab(RE_141, p.content, "141X");
      const S = num(g[0]);
      const T = num(g[1]);
      const N = S + T;
      // 가감 줄
      expect(p.solution).toContain(`$(a+1)x=${S}+${T}=${N}$`);
      // 지면이 스스로 못 박은 제약을 **글자에서** 읽는다.
      expect(p.solution).toContain("$2$ 이상의 자연수");
      const bound = num(
        grab(/즉 \$x\\le(\d+)\$이어야 한다/, p.solution, "141X 제약")[0],
      );
      expect(bound).toBe(S - 1);
      const lines = p.solution.split("\n");
      const keepLine = lines.find((l) => l.includes("둘 다 자연수이다"))!;
      const dropLine = lines.find((l) => l.includes("이 경우는 버린다"))!;
      expect(keepLine, p.solution).toBeDefined();
      expect(dropLine, p.solution).toBeDefined();
      const readPairs = (line: string): Array<[number, number]> =>
        [...line.matchAll(/\$a\+1=(\d+)\$이면 \$x=\d+\\div\d+=(\d+)\$/g)].map(
          (m) => [num(m[1]), num(m[2])],
        );
      const kept = readPairs(keepLine);
      const dropped = readPairs(dropLine);
      expect(kept.length, p.solution).toBeGreaterThanOrEqual(2);
      expect(dropped.length, p.solution).toBeGreaterThanOrEqual(1);
      // 🔴 ㉴ — 나열한 값이 **전부** 제약 안이고 버리는 값은 **밖**이다.
      for (const [d, x] of kept) {
        expect(
          d,
          `${p.solution} — $a+1=${d}$ 이 $2$ 미만`,
        ).toBeGreaterThanOrEqual(2);
        expect(d * x, `${p.solution} — $x$ 가 맞지 않다`).toBe(N);
        expect(x <= bound, `${p.solution} — $x=${x}$ 가 제약 밖`).toBe(true);
        expect(p.solution).toContain(`$y=${S}-${x}=${S - x}$이다`);
      }
      for (const [d, x] of dropped) {
        expect(d * x, `${p.solution} — 버리는 $x$ 가 맞지 않다`).toBe(N);
        expect(x > bound, `${p.solution} — 버리는 $x=${x}$ 가 제약 안`).toBe(
          true,
        );
        expect(p.solution).toContain(
          `$y=${S}-${x}=${S - x}$이므로 자연수가 아니다`,
        );
      }
      // 나열한 것과 버린 것을 합치면 $N$ 의 «$2$ 이상인 약수» 전부다.
      const all = [...kept, ...dropped].map(([d]) => d).sort((x, y) => x - y);
      expect(all).toEqual(divisorsOf(N).filter((d) => d >= 2));
      // 합 줄
      const as = kept.map(([d]) => d - 1).sort((x, y) => x - y);
      const sum = as.reduce((s, v) => s + v, 0);
      expect(p.solution).toContain(`$${as.length}$개이고`);
      expect(p.solution).toContain(`$${as.join("+")}=${sum}$`);
      expect(p.answer).toBe(`$${sum}$`);
      // 확인 줄 — 첫 $a$ 가 둘째 식을 실제로 만족시킨다.
      const [d0, x0] = kept[0]!;
      expect(p.solution).toContain(`$${d0 - 1}\\times${x0}-${S - x0}=${T}$`);
      expect((d0 - 1) * x0 - (S - x0)).toBe(T);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });

  it("`142X` — 세 경우가 전부 적혀 있고 살아남는 둘의 세 변이 실제로 자연수다", () => {
    let checked = 0;
    for (const p of rows(E142, WIDE)) {
      const g = grab(RE_142, p.content, "142X");
      const sides = [num(g[0]), num(g[1]), num(g[2])];
      const t = num(g[3]);
      // 세 경우가 **전부** 지면에 있다(㉳ 의 «버리는 걸음»을 포함).
      for (const s of sides) {
        expect(p.solution, `${p.content} — $${s}$ 경우가 없다`).toContain(
          `길이가 $${s}\\,\\mathrm{cm}$인 변에 대응한다고 하면`,
        );
      }
      let kept = 0;
      let dropped = 0;
      const perims: number[] = [];
      for (const s of sides) {
        const others = sides.filter((v) => v !== s);
        const ok = sides.every((v) => (v * t) % s === 0);
        if (ok) {
          kept += 1;
          const u = (others[0]! * t) / s;
          const v = (others[1]! * t) / s;
          expect(p.solution).toContain(
            `$${others[0]}\\times${t}\\div${s}=${u}$`,
          );
          expect(p.solution).toContain(
            `$${others[1]}\\times${t}\\div${s}=${v}$`,
          );
          expect(p.solution).toContain(
            `$${t}+${u}+${v}=${t + u + v}\\,(\\mathrm{cm})$`,
          );
          perims.push(t + u + v);
        } else {
          dropped += 1;
          const bad = sides.find((v) => (v * t) % s !== 0)!;
          expect(p.solution).toContain(`$${bad}\\times${t}=${bad * t}$`);
        }
      }
      expect(kept, p.content).toBe(2);
      expect(dropped, p.content).toBe(1);
      const total = perims[0]! + perims[1]!;
      expect(p.solution).toContain(
        `$${perims[0]}+${perims[1]}=${total}\\,(\\mathrm{cm})$`,
      );
      // 확인 줄 — 둘레의 비로 다시 만든 값이 같다.
      const perimeter = sides[0]! + sides[1]! + sides[2]!;
      expect(p.solution).toContain(
        `$${sides[0]}+${sides[1]}+${sides[2]}=${perimeter}\\,(\\mathrm{cm})$`,
      );
      const keptSides = sides.filter((s) =>
        sides.every((v) => (v * t) % s === 0),
      );
      expect(p.solution).toContain(
        `$${perimeter}\\times${t}\\div${keptSides[0]}=${(perimeter * t) / keptSides[0]!}$`,
      );
      expect(p.answer).toBe(`$${total}\\,\\mathrm{cm}$`);
      checked += 1;
    }
    expect(checked).toBe(WIDE);
  });

  it("`143X` — 두 층의 값과 «합만 알면 된다」는 줄을 넷 다 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E143, WIDE)) {
      const g = grab(RE_143, p.content, "143X");
      const L = num(g[0]);
      const base = num(g[1]);
      const rest = L - base;
      // 합 줄 — 각각은 안 정해진다.
      // ⚠️ 이 줄은 `$\overline{AB}+\overline{AC}=…$` 한 덩어리라 앞에 `$` 를 붙여
      //    찾으면 **영영 안 걸린다**(처음에 그렇게 써서 빨개졌다).
      expect(p.solution).toContain(`=${L}-${base}=${rest}\\,(\\mathrm{cm})$`);
      // 첫째 층 — 이 셋도 앞이 `$\overline{MN}=…` 이라 `$` 를 안 붙인다.
      expect(p.solution).toContain(
        `=\\dfrac{1}{2}\\times${base}=${base / 2}\\,(\\mathrm{cm})$`,
      );
      // 둘째 층
      expect(p.solution).toContain(
        `=\\dfrac{1}{2}\\times${base / 2}=${base / 4}\\,(\\mathrm{cm})$`,
      );
      // 두 팔의 합
      expect(p.solution).toContain(
        `=\\dfrac{1}{4}\\times${rest}=${rest / 4}\\,(\\mathrm{cm})$`,
      );
      // 결론 줄
      const answer = base / 4 + rest / 4 + base / 2;
      expect(p.solution).toContain(
        `$${base / 4}+${rest / 4}+${base / 2}=${answer}\\,(\\mathrm{cm})$`,
      );
      // 확인 줄 — $1:2:4$
      expect(p.solution).toContain(
        `$${base / 4}\\,\\mathrm{cm}$, $${base / 2}\\,\\mathrm{cm}$, $${base}\\,\\mathrm{cm}$`,
      );
      expect(p.solution).toContain("$1:2:4$");
      expect(p.answer).toBe(`$${answer}\\,\\mathrm{cm}$`);
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
  if (rpmType === "140X") {
    const g = grab(RE_140, content, "140X");
    const f = grab(RE_140_FRAC, content, "140X 분수");
    const a = num(g[0]);
    const b = num(g[1]);
    const p = num(f[0]);
    const q = num(f[1]);
    const r = q - p;
    const whole = (a * q) / r;
    for (const v of [
      a,
      b,
      p,
      q,
      r,
      a * q,
      whole,
      a + b,
      whole - a - b,
      whole - a,
      (whole - a) * q,
      whole * p,
    ])
      ok.add(v);
    return ok;
  }
  if (rpmType === "141X") {
    const g = grab(RE_141, content, "141X");
    const S = num(g[0]);
    const T = num(g[1]);
    const N = S + T;
    for (const v of [S, T, N, S - 1, 2]) ok.add(v);
    const as: number[] = [];
    for (const d of divisorsOf(N)) {
      if (d < 2) continue;
      const x = N / d;
      ok.add(d);
      ok.add(d - 1);
      ok.add(x);
      ok.add(Math.abs(S - x));
      if (S - x >= 1) as.push(d - 1);
    }
    ok.add(as.length);
    ok.add(as.reduce((s, v) => s + v, 0));
    return ok;
  }
  if (rpmType === "142X") {
    const g = grab(RE_142, content, "142X");
    const sides = [num(g[0]), num(g[1]), num(g[2])];
    const t = num(g[3]);
    const perimeter = sides[0]! + sides[1]! + sides[2]!;
    for (const v of [...sides, t, perimeter]) ok.add(v);
    const perims: number[] = [];
    for (const s of sides) {
      if (sides.every((v) => (v * t) % s === 0)) {
        let sum = 0;
        for (const v of sides) {
          ok.add((v * t) / s);
          sum += (v * t) / s;
        }
        ok.add(sum);
        perims.push(sum);
      } else {
        for (const v of sides) if ((v * t) % s !== 0) ok.add(v * t);
      }
    }
    ok.add(perims.reduce((s, v) => s + v, 0));
    return ok;
  }
  if (rpmType === "143X") {
    const g = grab(RE_143, content, "143X");
    const L = num(g[0]);
    const base = num(g[1]);
    const rest = L - base;
    for (const v of [
      L,
      base,
      rest,
      base / 2,
      base / 4,
      rest / 4,
      base / 4 + rest / 4 + base / 2,
      2,
      4,
    ])
      ok.add(v);
    return ok;
  }
  throw new Error(`모르는 유형: ${rpmType}`);
}

describe("중2 확대 갈래 5차 `m2Top5j` — «설명되지 않는 수»가 없다", () => {
  for (const e of M2_TOP_5J) {
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

describe("중2 확대 갈래 5차 `m2Top5j` — ㉠ 찍기로 맞을 수 있는가", () => {
  for (const e of M2_TOP_5J) {
    it(`\`${e.rpmType}\` — 발문에 찍힌 수의 한두 번 연산으로 답이 안 나온다`, () => {
      let hits = 0;
      let looked = 0;
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
        looked += 1;
        if (guesses.has(ans)) hits += 1;
      }
      expect(hits, `${e.rpmType} 지름길`).toBe(0);
      expect(looked).toBe(SAMPLE);
      // 🔴 **자가 살아 있는가.** 「$0$건」은 «깨끗»과 «못 셈»을 안 가른다 —
      //    발문의 두 수를 실제로 더한 값을 답이라 우기면 **전량이 걸려야** 한다.
      //    ⚠️ 처음에는 `printed.includes(printed[0])` 를 대조로 썼는데 그것은
      //    **늘 참**이라 아무것도 안 재는 도장이었다(2026-08-23).
      let caught = 0;
      let usable = 0;
      for (const p of rows(e, 40)) {
        const printed = [...new Set(mathIntegers(p.content))];
        // ⚠️ `141X` 은 발문에 수가 **둘뿐**이라 그 둘이 같은 판(예: $x+y=8$,
        //    $ax-y=8$)에서는 서로 다른 짝이 아예 없다 — 실측 40판 중 2판이 그랬다.
        //    그런 판을 세면 대조가 «구조적으로 못 맞히는» 자리를 결함으로 읽는다.
        if (printed.length < 2) continue;
        usable += 1;
        const guesses = new Set<number>();
        for (const a of printed)
          for (const b of printed) {
            if (a === b) continue;
            guesses.add(a + b);
          }
        if (guesses.has(printed[0]! + printed[1]!)) caught += 1;
      }
      expect(usable, `${e.rpmType} 대조에 쓸 수 있는 판`).toBeGreaterThan(30);
      expect(caught, `${e.rpmType} 지름길 자의 음성 대조`).toBe(usable);
    });
  }

  it("🔴 치환 대조 — 다른 판의 답을 이 판의 자루에 대면 우연히 맞는 비율이 낮다", () => {
    for (const e of M2_TOP_5J) {
      const sample = rows(e, 200);
      let coincidence = 0;
      for (let i = 0; i < sample.length; i += 1) {
        const mine = sample[i]!;
        const other = sample[(i + 97) % sample.length]!;
        const printed = [...new Set(mathIntegers(mine.content))];
        const guesses = new Set<number>();
        for (const a of printed)
          for (const b of printed) {
            if (a === b) continue;
            guesses.add(a - b);
            guesses.add(a + b);
            guesses.add(a * b);
          }
        const ans = num(grab(/(\d+)/, plainAnswer(other.answer), "치환")[0]);
        if (guesses.has(ans)) coincidence += 1;
      }
      // 🔴 **양쪽을 다 잰다.** 위가 없으면 「지름길 $0$건」이 «자루가 비었다»와
      //    안 갈린다 — 우연이 $0$ 이면 그 검사는 아무것도 안 재는 것이다.
      //    실측(800판·좁은 자루): `140X` $30.9\%$ · `141X` $1.4\%$ ·
      //    `142X` $4.8\%$ · `143X` $1.0\%$. 넓은 자루(시험이 실제로 쓰는 것)에서는
      //    $51.0/3.6/6.3/11.6\%$ 다 — 내 판의 답만 $0.00\%$ 인 것이 뜻이다.
      expect(
        coincidence,
        `${e.rpmType} 치환 우연이 0 이면 자루가 빈 것이다`,
      ).toBeGreaterThan(0);
      expect(coincidence, `${e.rpmType} 치환 우연`).toBeLessThan(80);
    }
  });
});

describe("중2 확대 갈래 5차 `m2Top5j` — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`140X` — 여사건을 안 쓰면 답이 달라지거나 아예 안 나온다", () => {
    let differs = 0;
    for (const p of rows(E140, 200)) {
      const { target, other, p: pp, q } = p.facts;
      expect(addedCount(target!, other!, pp!, q!)).toBe(p.facts.x);
      const naive = addedCount(target!, other!, pp!, q!, false);
      expect(naive, p.content).not.toBe(p.facts.x);
      if (naive !== null) differs += 1;
    }
    // 「늘 `null` 이라 다르다」가 아니라 **값이 나오는데도 다른** 판이 있어야
    // 이 축이 실제로 갈리는 것이다.
    expect(differs, "여사건을 안 써도 값은 나오는 판").toBeGreaterThan(0);
  });

  it("`141X` — $y$ 가 자연수라는 조건을 안 쓰면 후보가 늘고 합이 커진다", () => {
    for (const p of rows(E141, 200)) {
      const right = naturalCoefficients(p.facts.sum!, p.facts.diff!);
      const loose = naturalCoefficients(p.facts.sum!, p.facts.diff!, false);
      expect(right.reduce((s, v) => s + v, 0)).toBe(p.facts.x);
      expect(loose.length).toBeGreaterThan(right.length);
      expect(loose.reduce((s, v) => s + v, 0)).toBeGreaterThan(p.facts.x!);
      // 버려지는 후보의 개수가 지면이 적은 것과 같다.
      expect(loose.length - right.length).toBe(p.facts.dropped);
    }
  });

  it("`142X` — 「나머지 두 변도 자연수」를 안 보면 후보가 셋이 된다", () => {
    for (const p of rows(E142, 200)) {
      const sides = [p.facts.s1!, p.facts.s2!, p.facts.s3!];
      const t = p.facts.given!;
      const right = similarPerimeters(sides, t).filter(
        (v): v is number => v !== null,
      );
      expect(right.reduce((s, v) => s + v, 0)).toBe(p.facts.x);
      expect(right.length).toBe(2);
      const loose = similarPerimeters(sides, t, false);
      expect(loose.every((v) => v !== null)).toBe(true);
      expect(loose.filter((v) => v !== null).length).toBe(3);
      // 죽는 후보의 둘레는 **살아남는 둘 어디에도 없다.**
      const third = loose.find((v) => !right.includes(v as number))!;
      expect(third).toBeGreaterThan(0);
    }
  });

  it("`143X` — 둘째 층을 잊으면 답이 $\\overline{BC}$ 의 $\\dfrac14$ 만큼 커진다", () => {
    for (const p of rows(E143, 200)) {
      const right = midQuadPerimeter(p.facts.total!, p.facts.base!);
      const naive = midQuadPerimeter(p.facts.total!, p.facts.base!, false);
      expect(right).toBe(p.facts.x);
      expect(naive).toBe(p.facts.x! + p.facts.base! / 4);
      expect(naive).not.toBe(right);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 내보낸 함수 — 손 실측 눈금 (㉷ 주석의 단언을 시험이 문다)
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 `m2Top5j` — 내보낸 함수", () => {
  it("`addedCount` 는 여사건을 실제로 쓴다 (손 실측)", () => {
    // 빨간 $6$·파란 $5$, 아닐 확률 $\frac56$ → 빨간 확률 $\frac16$ → 전체 $36$ → $25$
    expect(addedCount(6, 5, 5, 6)).toBe(25);
    // 여사건을 안 쓰면 전체가 $\frac{36}{5}$ 라 자연수가 아니다
    expect(addedCount(6, 5, 5, 6, false)).toBeNull();
    // 값이 **나오면서도 다른** 자리 — 전체가 $9$ vs $18$
    expect(addedCount(6, 1, 1, 3)).toBe(2);
    expect(addedCount(6, 1, 1, 3, false)).toBe(11);
    // 음성 — 확률이 아니거나 나누어떨어지지 않거나 더 넣을 것이 없다
    expect(addedCount(6, 5, 7, 6)).toBeNull();
    expect(addedCount(6, 5, 3, 7)).toBeNull();
    expect(addedCount(6, 30, 1, 3)).toBeNull();
    // 🔴 나누어떨어짐 가드를 지우면 **자연수가 아닌 개수**가 나온다 —
    //    $\frac{10\times7}{3}=23.33\dots$ 이라 더 넣은 개수가 $12.33\dots$ 이 된다.
    //    이 줄이 없으면 그 가드를 아무것도 안 문다(변이 M2 로 실측).
    expect(addedCount(10, 1, 4, 7)).toBeNull();
  });

  it("`naturalCoefficients` 는 $y$ 조건을 실제로 본다 (손 실측)", () => {
    // $N=26$ → 약수 $2,13,26$ 인데 $x\le11$ 이라 $2$ 는 죽는다 → $a=12,25$
    expect(naturalCoefficients(12, 14)).toEqual([12, 25]);
    expect(naturalCoefficients(12, 14, false)).toEqual([1, 12, 25]);
    // 음성 — 우변이 자연수가 아니면 빈 목록
    expect(naturalCoefficients(1, 5)).toEqual([]);
    expect(naturalCoefficients(12, 0)).toEqual([]);
  });

  it("`similarPerimeters` 는 세 대응을 다 세운다 (손 실측)", () => {
    // 세 변 $24,8,20$·$t=6$ → $s=24$ 는 $6,2,5$(둘레 $13$), $s=8$ 은 $18,6,15$(둘레 $39$),
    // $s=20$ 은 $7.2$ 라 죽는다
    expect(similarPerimeters([24, 8, 20], 6)).toEqual([13, 39, null]);
    // 조건을 안 보면 셋이 다 살아나고 셋째는 자연수가 아니다
    expect(similarPerimeters([24, 8, 20], 6, false)).toEqual([13, 39, 15.6]);
    // 음성 — 변이 셋이 아니거나 길이가 $1$ 미만
    expect(similarPerimeters([24, 8], 6)).toEqual([null, null, null]);
    expect(similarPerimeters([24, 8, 20], 0)).toEqual([null, null, null]);
  });

  it("`midQuadPerimeter` 는 정리를 두 층에 적용한다 (손 실측)", () => {
    // 둘레 $60$·$\overline{BC}=24$ → $6+9+12=27$
    expect(midQuadPerimeter(60, 24)).toBe(27);
    // 둘째 층을 잊으면 $\overline{PQ}=12$ 라 $33$
    expect(midQuadPerimeter(60, 24, false)).toBe(33);
    // 음성 — 삼각형이 안 되거나 네 변이 자연수가 아니다
    expect(midQuadPerimeter(60, 40)).toBeNull();
    expect(midQuadPerimeter(60, 26)).toBeNull();
    expect(midQuadPerimeter(62, 24)).toBeNull();
  });

  it("`divisorsOf`·`hasFinalConsonant` (손 실측)", () => {
    expect(divisorsOf(26)).toEqual([1, 2, 13, 26]);
    expect(divisorsOf(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
    expect(divisorsOf(1)).toEqual([1]);
    // 🔴 조사 규칙이 **한글 음절 코드**에서 나오는가 — 손 목록이 아니다.
    expect(hasFinalConsonant("구슬")).toBe(true);
    expect(hasFinalConsonant("사탕")).toBe(true);
    expect(hasFinalConsonant("바구니")).toBe(false);
    expect(hasFinalConsonant("봉지")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 `m2Top5j` — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `140X` 가 「구슬은 꺼낼 확률」이 아니라 「구슬을 꺼낼 확률」이라고 적는다", () => {
    // 처음 판은 보조사(은/는)를 목적격 자리에 썼다. 값도 KaTeX 도 멀쩡해서
    // 어느 자도 못 봤고 표본을 눈으로 읽어서만 드러났다.
    for (const p of rows(E140, 300)) {
      expect(p.solution).not.toMatch(/[가-힣](은|는) 꺼낼 확률/);
      expect(p.solution).toMatch(/[가-힣](을|를) 꺼낼 확률은/);
    }
  });

  it("⑵ 🔴 `140X`·`141X`·`142X` 가 「(으)로」를 읽는 소리대로 적는다", () => {
    // 물린 자리: `142X` 의 「$36$로 둘 다 자연수이고」·`141X` 의 「$36$로 둘째 식을」.
    // 값도 KaTeX 도 멀쩡하고 `josaMismatches` 는 이 축을 **구조적으로 못 본다**.
    for (const e of [E140, E141, E142]) {
      let judged = 0;
      for (const p of rows(e, 300)) {
        expect(euroRoMismatches(p.solution), p.solution).toEqual([]);
        judged += (p.solution.match(/\$[^$]*?\d+\$(으로|로)/g) ?? []).length;
      }
      // 🔴 「0 건」이 «못 셈»이 아님을 못 박는다.
      expect(judged, `${e.rpmType} (으)로 판정 후보`).toBeGreaterThan(280);
    }
    // 🔴 `143X` 는 **잴 것이 없다** — 유일한 「로」가 단위 뒤(「$24\,\mathrm{cm}$로」)라
    //    읽을 때 마지막이 「센티미터」이고, 그 자는 숫자 뒤만 본다. 그 «0» 은
    //    «깨끗»이 아니라 «대상 없음»이므로 여기 적어 둔다.
    let none = 0;
    for (const p of rows(E143, 60))
      none += (p.solution.match(/\$[^$]*?\d+\$(으로|로)/g) ?? []).length;
    expect(none, "143X 는 숫자 뒤 (으)로 자리가 없다").toBe(0);
  });

  it("⑶ 🔴 소재가 넷 다 나온다 — 하나로 굳으면 말이 늘 같아진다", () => {
    const seen = new Set<string>();
    for (const p of rows(E140, WIDE)) {
      const idx = p.content.indexOf(" 속에");
      expect(idx, p.content).toBeGreaterThan(0);
      seen.add(p.content.slice(0, idx));
    }
    expect(seen.size, "140X 소재").toBe(4);
  });

  it("⑷ 🔴 `141X` 의 살아남는 값과 버리는 값의 개수가 여러 갈래로 나온다", () => {
    const keep = new Set<number>();
    const drop = new Set<number>();
    for (const p of rows(E141, WIDE)) {
      keep.add(p.facts.count!);
      drop.add(p.facts.dropped!);
    }
    expect(Math.min(...keep)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...keep)).toBeLessThanOrEqual(4);
    expect(Math.min(...drop)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...drop)).toBeLessThanOrEqual(3);
    expect(keep.size, "살아남는 개수 갈래").toBeGreaterThan(1);
    expect(drop.size, "버리는 개수 갈래").toBeGreaterThan(1);
  });

  it("⑻ 🔴 `142X` 의 두 둘레가 $120$ 이하다 — 주석이 적은 상한을 시험이 문다 (㉷)", () => {
    // 변이 시험에서 이 줄을 지운 판이 **초록**이었다 — 모듈이 「지면의 수가 너무
    // 크면 흉하다」고 적어 놓고 그것을 지키는 자가 없었다. 단언을 적었으면 물게 한다.
    for (const p of rows(E142, WIDE)) {
      expect(p.facts.p1, p.content).toBeLessThanOrEqual(120);
      expect(p.facts.p2, p.content).toBeLessThanOrEqual(120);
      // 지면에 적히는 둘레도 같은 값이다 — `facts` 만 보면 지면을 안 본 것이다.
      const g = grab(RE_142, p.content, "142X");
      const sides = [num(g[0]), num(g[1]), num(g[2])];
      const t = num(g[3]);
      const perimeter = sides[0]! + sides[1]! + sides[2]!;
      for (const s of sides) {
        if (!sides.every((v) => (v * t) % s === 0)) continue;
        expect((perimeter * t) / s, p.solution).toBeLessThanOrEqual(120);
      }
    }
  });

  it("⑸ 🔴 `142X` 의 세 변은 **섞여서** 찍힌다 (㉵ — 정렬은 순위를 암시한다)", () => {
    let ascending = 0;
    const dropPlace = new Set<number>();
    for (const p of rows(E142, WIDE)) {
      const g = grab(RE_142, p.content, "142X");
      const sides = [num(g[0]), num(g[1]), num(g[2])];
      if (sides[0]! < sides[1]! && sides[1]! < sides[2]!) ascending += 1;
      const t = num(g[3]);
      dropPlace.add(
        sides.findIndex((s) => !sides.every((v) => (v * t) % s === 0)),
      );
    }
    // 여섯 차례가 고루 나오면 오름차순은 대략 $\frac16$ 이다 — 늘 정렬이면 $800$ 이다.
    expect(ascending, "오름차순으로 찍힌 판").toBeLessThan(WIDE / 3);
    // 🔴 **버리는 자리**가 첫째·둘째·셋째에 다 온다.
    expect([...dropPlace].sort(), "버리는 자리").toEqual([0, 1, 2]);
  });

  it("⑹ 🔴 `143X` 는 $\\overline{AB}$ 와 $\\overline{AC}$ 를 **발문에 안 준다**", () => {
    for (const p of rows(E143, 300)) {
      expect(p.content).not.toContain("\\overline{AB}=");
      expect(p.content).not.toContain("\\overline{AC}=");
      // 그런데도 답이 하나로 정해진다는 것을 해설이 말한다.
      expect(p.solution).toContain(
        "각각의 길이는 정해지지 않지만 그 합은 정해진다",
      );
    }
  });

  it("⑺ 🔴 넷 다 그림을 안 쓰고 발문이 지면을 안 가리킨다", () => {
    for (const e of M2_TOP_5J) {
      for (const p of rows(e, 60)) {
        expect(p.figureSpec ?? null, e.rpmType).toBe(null);
        expect(pointsAtFigure(p.content), e.rpmType).toBeNull();
        expect(p.content, e.rpmType).not.toContain("그림");
      }
    }
  });
});
