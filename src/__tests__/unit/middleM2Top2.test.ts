/**
 * 중2 **확대 갈래 2차 물결**(`m2Top2.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 찍힌 글자를
 * 파싱해 **다른 길로** 답을 다시 낸다(2026-08-18 「지표의 «참»이 제품에서 나오면
 * 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `31U` | 분자의 홀수부 $p$ 로 사는 집합을 만든다 | 찍힌 분자·분모를 읽어 $x=1..N$ 마다 **실제로 약분**해 분모에 $2$·$5$ 말고 남는 게 있나 본다 (생성기의 $p$·$q$ 를 **모른 채** 간다) |
 * | `32U` | 지수의 최대공약수로 **맞춰** 밑만 견준다 | 지수를 안 맞춘다 — $b^{e}$ 를 **BigInt 로 통째로 계산**해 견준다 |
 * | `33U` | $C-n$ 으로 구간을 역산한다 | 찍힌 **분수 부등식 그대로**에 $a$ 를 넣어 자연수 해를 **세어** 개수가 $n$ 이 되는 $a$ 를 찾는다 |
 * | `34U` | 두 시각을 먼저 뽑고 속력을 역산한다 | 찍힌 속력으로 $x$ 를 $0.25$ 씩 훑어 **거리를 직접 재어** 답이 되는 때를 모은다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20). 손으로 쓴 지면에는
 * `facts` 가 없으므로, 검산기가 `facts` 를 되읽는 판이었다면 이 눈금은 **통과할
 * 수가 없다**.
 *
 * 양성 넷은 **정찰 브리프가 손으로 푼 실측**이고, `32U` 의 것은 이 생성기가
 * **절대 안 내는 지면**이다(밑이 오름차순인 차례는 불변식이 막는다) — 그래서
 * 「제품이 낸 것을 제품으로 검산한다」가 아니다.
 *
 * ## ⑶ 이 시험이 `generateMiddleProblem` 을 못 쓰는 까닭 — 그리고 그것을 메우는 법
 *
 * `generate.ts` 에 이 모듈을 등록하는 것은 **리드의 몫**이라, 이 파일이 쓰일 때
 * 아직 등록 전일 수 있다. 그래서 기본 경로는 `entry.handler` 를 직접 부른다.
 * 다만 **등록되면 진짜 파이프라인으로도 같은 계약을 잰다** — 아래
 * 「등록되면 …」 검사들이 그때 살아난다(등록 전에는 스스로 그 사실을 찍는다).
 * 갈래가 살아남는지는 등록과 무관하게 **제품 함수 `resolveMiddleTier` 를 그대로
 * 불러** 확인한다(규칙을 옮겨 적지 않는다).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간 결과의 **존재**는 재지만
 * 그 설명이 실제로 이해되는지는 사람이 읽어야 안다. 그래서 이 회차의 해설을
 * 표본으로 눈으로 읽었고, 그때 고친 자리(지면의 `**` 굵게 표시가 `pageSmells` 의
 * 「연산자가 붙어 있다」에 걸리던 것 · 「미터」 뒤 조사를 수의 받침으로 짓던 것)를
 * 아래 회귀 잠금에 남긴다.
 */
import { describe, expect, it } from "vitest";

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
  ascendingChain,
  chaseTimes,
  constantRangeForCount,
  finiteDecimalSurvivors,
  M2_TOP_2,
} from "@/lib/middle/m2Top2";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";

import { josaMismatches, pageSmells } from "../helpers/midPage";
import { extensionNumberReason, isCatalogType } from "../helpers/rpmCatalog";

/** 브리프가 요구한 최소 표본 200 을 넘긴다. */
const SAMPLE = 240;
const BASE_SEED = 20260902;
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260902, 7, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/**
 * 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 `34U` 의 **가는
 * 공백(U+2009)** 이 보통 공백이 되어 조용히 안 잡힌다(2026-08-23 물결 2D).
 */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_2.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E31 = entryOf("31U");
const E32 = entryOf("32U");
const E33 = entryOf("33U");
const E34 = entryOf("34U");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "31U": "심화상",
  "32U": "심화중",
  "33U": "심화중",
  "34U": "심화상",
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
function grab(re: RegExp, content: string, who: string): string[] {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${content}`);
  return m.slice(1);
}

const num = (s: string | undefined): number => Number(s);

/** 답 문자열에서 `$` 만 걷어 낸 것 — 검산기가 이 꼴로 답을 다시 짓는다. */
function plainAnswer(answer: string): string {
  return answer.replace(/\$/g, "");
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/** $2$ 와 $5$ 를 걷어 낸 나머지. $1$ 이면 유한소수의 분모가 될 수 있다. */
function strip25(n: number): number {
  let d = n;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d;
}

/** 기약분수로 고쳐 분모에 $2$·$5$ 말고 남는 것이 없는가 — **직접 약분한다**. */
function isTerminating(numer: number, denom: number): boolean {
  return strip25(denom / gcd(numer, denom)) === 1;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 을/를·은/는·와/과·가만 본다. 그런데 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다. 그래서 「$15$으로」가
 * 값 검산·냄새·조사 **셋 다 초록인 채로** 지면에 나갔다(이 회차 실측, 눈으로 찾았다).
 *
 * ⚠️ 규칙은 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 그러면 동어반복이라
 *    아무것도 안 지킨다. 여기 다시 적는다(`midPage` 가 같은 이유로 그렇게 서 있다).
 */
export function euroRoMismatches(text: string): string[] {
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
 *
 * 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로 렌더해서** 한다 —
 * 목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다(2026-08-18).
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

/** `2^{2}\times3\times5` → $60$. 모양이 다르면 던진다. */
function factorsValue(tex: string, who: string): number {
  let out = 1;
  for (const part of tex.split("\\times")) {
    const m = /^(\d+)(?:\^\{(\d+)\})?$/.exec(part.trim());
    if (m === null)
      throw new Error(`${who}: 분모 소인수 모양이 다르다 — ${part}`);
    out *= Number(m[1]) ** (m[2] === undefined ? 1 : Number(m[2]));
  }
  return out;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  // 31U — 찍힌 분자·분모를 읽어 $x$ 마다 **실제로 약분**한다.
  //       생성기가 쓴 «분자의 홀수부 $p$»·«분모의 홀수 소인수 $q$» 를 **모른 채** 간다.
  "31U": (content) => {
    const [numerTex, denTex] = grab(
      /분수 \$\\dfrac\{(\d+)\}\{(.+?)\\times x\}\$/,
      content,
      "31U",
    );
    const [limitTex] = grab(/\$(\d+)\$ 이하의 자연수 \$x\$/, content, "31U");
    const numer = num(numerTex);
    const den = factorsValue(denTex!, "31U");
    const limit = num(limitTex);

    const kept: number[] = [];
    for (let x = 1; x <= limit; x += 1) {
      if (isTerminating(numer, den * x)) kept.push(x);
    }
    if (kept.length < 5)
      throw new Error("31U: 사는 것이 다섯 미만이라 목록이 아니다");
    // 불변식 ㉮ — 「$x$ 가 $2^{a}5^{b}$ 꼴」로 **안 설명되는** 것이 둘 이상이어야
    // 한다. 하나도 없으면 성질 한 줄로 끝나 «중»으로 내려앉는다.
    const cancelled = kept.filter((x) => strip25(x) !== 1);
    if (cancelled.length < 2)
      throw new Error("31U: 약분되어 사는 것이 둘 미만 — «상»이 아니다");
    // 불변식 ㉯ — 죽는 것이 위끝의 $\tfrac13$ 이상이어야 조건이 실제로 거른다.
    if ((limit - kept.length) * 3 < limit)
      throw new Error("31U: 거의 다 살아 조건이 거의 안 거른다");
    // 불변식 ㉰ — 분모에 홀수 소인수가 있어야 「분모를 안 읽어도 되는」 지름길이 막힌다.
    if (strip25(den) === 1)
      throw new Error("31U: 분모에 먼저 약분할 홀수 소인수가 없다");
    return String(sum(kept));
  },

  // 32U — **지수를 안 맞춘다.** $b^{e}$ 를 BigInt 로 통째로 계산해 견준다.
  "32U": (content) => {
    const found = [...content.matchAll(/\$([abc])=(\d+)\^\{(\d+)\}\$/g)];
    if (found.length !== 3)
      throw new Error(`32U: 세 수를 못 읽었다 — ${content}`);
    const labels = found.map((m) => m[1]!);
    if (labels.join("") !== "abc")
      throw new Error(`32U: 이름이 $a$, $b$, $c$ 차례가 아니다 — ${labels}`);
    const bases = found.map((m) => num(m[2]));
    const exps = found.map((m) => num(m[3]));
    if (new Set(exps).size !== 3) throw new Error("32U: 지수가 겹친다");
    if (new Set(bases).size !== 3) throw new Error("32U: 밑이 겹친다");
    const common = gcd(gcd(exps[0]!, exps[1]!), exps[2]!);
    if (common < 2)
      throw new Error("32U: 지수의 최대공약수가 $1$ 이라 맞출 수가 없다");

    const values = bases.map((b, i) => BigInt(b) ** BigInt(exps[i]!));
    const chain = (order: readonly number[]): string =>
      order.map((i) => "abc"[i]!).join("<");
    const byValue = [0, 1, 2].sort((i, j) =>
      values[i]! < values[j]! ? -1 : values[i]! > values[j]! ? 1 : 0,
    );
    const truth = chain(byValue);
    const byBase = chain([0, 1, 2].sort((i, j) => bases[i]! - bases[j]!));
    const byExp = chain([0, 1, 2].sort((i, j) => exps[i]! - exps[j]!));
    // ㉠ 참 순서가 ㉮ 적은 차례 ㉯ 그 역 ㉰ 밑 찍기 ㉱ 지수 찍기 **넷 다**와 달라야 한다.
    if (truth === "a<b<c") throw new Error("32U: 참 순서가 적은 차례 그대로다");
    if (truth === "c<b<a") throw new Error("32U: 참 순서가 적은 차례의 역이다");
    if (truth === byBase) throw new Error("32U: 밑만 보고 찍어도 맞는다");
    if (truth === byExp) throw new Error("32U: 지수만 보고 찍어도 맞는다");
    return truth;
  },

  // 33U — 찍힌 **분수 부등식 그대로**에 $a$ 를 넣어 자연수 해를 센다.
  //       「정리하면 $x\le C-a$」라는 생성기의 길을 안 쓴다.
  "33U": (content) => {
    const [pTex, uTex, qTex, rTex, vTex, mulTex, countTex] = grab(
      /일차부등식 \$\\dfrac\{x\+(\d+)\}\{(\d+)\}-\\dfrac\{(\d+)x-(\d+)\}\{(\d+)\}\\ge\\dfrac\{a\}\{(\d+)\}\$를 만족시키는 자연수 \$x\$가 \$(\d+)\$개일 때/,
      content,
      "33U",
    );
    const p = num(pTex);
    const u = num(uTex);
    const q = num(qTex);
    const r = num(rTex);
    const v = num(vTex);
    const mul = num(mulTex);
    const count = num(countTex);
    if (mul !== u * v)
      throw new Error(`33U: 우변 분모 ${mul} 가 ${u}×${v} 와 다르다`);

    const natCount = (a: number): number => {
      let c = 0;
      for (let x = 1; x <= 400; x += 1) {
        if ((x + p) / u - (q * x - r) / v >= a / mul - 1e-9) c += 1;
      }
      return c;
    };
    const hits: number[] = [];
    for (let a = -80; a <= 80; a += 1) if (natCount(a) === count) hits.push(a);
    if (hits.length !== 1)
      throw new Error(
        `33U: 자연수 해가 ${count}개인 정수 $a$ 가 ${hits.length}개다 (하나여야 한다)`,
      );
    const hi = hits[0]!;
    // 구간의 길이가 정확히 $1$ 이고 등호가 **오른쪽에만** 붙는다 —
    // 이것이 이 갈래의 마디다. 셋 다 실제로 세어서 확인한다.
    if (natCount(hi - 0.5) !== count)
      throw new Error("33U: 구간 안쪽인데 개수가 다르다");
    if (natCount(hi - 1) !== count + 1)
      throw new Error("33U: 왼쪽 끝이 열려 있지 않다");
    if (natCount(hi + 0.5) !== count - 1)
      throw new Error("33U: 오른쪽 끝이 닫혀 있지 않다");
    return `${hi - 1}<a\\le${hi}`;
  },

  // 34U — 찍힌 속력으로 $x$ 를 훑어 **거리를 직접 재어** 답이 되는 때를 모은다.
  "34U": (content) => {
    const [slowTex, leadTex, fastTex, targetTex] = grab(
      /분속 \$(\d+)\\,\\mathrm\{m\}\$로 걸어간 지 \$(\d+)\$분 후에 .*?분속 \$(\d+)\\,\\mathrm\{m\}\$로 자전거를 타고 출발하였다\. 두 사람 사이의 거리가 \$(\d+)\\,\\mathrm\{m\}\$가 되는 것은/,
      content,
      "34U",
    );
    const slow = num(slowTex);
    const lead = num(leadTex);
    const fast = num(fastTex);
    const target = num(targetTex);
    if (!/모두 구하시오/.test(content))
      throw new Error("34U: 「모두 구하시오」가 아니면 답이 둘일 수 없다");
    // 🔴 「그 합」·「그 차」를 물으면 발문의 수 하나가 장식이 된다(㉠).
    if (/합을 구하시오|차를 구하시오/.test(content))
      throw new Error(
        "34U: 합·차를 물으면 $d$ 나 $L$ 을 안 읽고도 답이 나온다",
      );
    if (fast <= slow) throw new Error("34U: 뒷사람이 더 느리면 못 따라잡는다");

    const hits: number[] = [];
    for (let k = 1; k <= 400; k += 1) {
      const x = k / 4;
      if (Math.abs(Math.abs(slow * (x + lead) - fast * x) - target) < 1e-9) {
        hits.push(x);
      }
    }
    if (hits.length !== 2)
      throw new Error(`34U: 답이 되는 때가 ${hits.length}개다 (둘이어야 한다)`);
    const crossing = (slow * lead) / (fast - slow);
    if (!(hits[0]! < crossing && crossing < hits[1]!))
      throw new Error(
        "34U: 따라잡는 때가 두 답 사이에 없다 — 구간이 안 갈린다",
      );
    return `${hits[0]}분 후와 ${hits[1]}분 후`;
  },
};

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/** 양성: 답을 아는 지면에서 그 답을 낸다. 넷 다 정찰 브리프의 손 실측이다. */
const CALIBRATION: ReadonlyArray<readonly [string, string, string]> = [
  [
    "31U",
    "분수 $\\dfrac{21}{2^{2}\\times3\\times5\\times x}$이 유한소수가 되도록 하는 $15$ 이하의 자연수 $x$의 값을 모두 구하여 그 합을 구하시오.",
    "51",
  ],
  [
    // 🔴 이 지면은 **생성기가 절대 안 낸다**(밑이 $2<3<5$ 오름차순이라 불변식이 막는다).
    //    그래서 「제품이 낸 것을 제품으로 검산한다」가 아니다.
    "32U",
    "세 수 $a=2^{60}$, $b=3^{40}$, $c=5^{20}$의 대소를 부등호를 사용하여 나타내시오.",
    "c<a<b",
  ],
  [
    "33U",
    "$x$에 대한 일차부등식 $\\dfrac{x+2}{3}-\\dfrac{2x-1}{5}\\ge\\dfrac{a}{15}$를 만족시키는 자연수 $x$가 $7$개일 때, 상수 $a$의 값의 범위를 구하시오.",
    "5<a\\le6",
  ],
  [
    "34U",
    "형이 집을 출발하여 분속 $80\\,\\mathrm{m}$로 걸어간 지 $6$분 후에 동생이 같은 곳에서 같은 방향으로 분속 $200\\,\\mathrm{m}$로 자전거를 타고 출발하였다. 두 사람 사이의 거리가 $240\\,\\mathrm{m}$가 되는 것은 동생이 출발한 지 몇 분 후인지 모두 구하시오.",
    "2분 후와 6분 후",
  ],
  [
    // 브리프의 둘째 실측 — 씨앗이 달라도 같은 길로 풀린다.
    "34U",
    "형이 집을 출발하여 분속 $50\\,\\mathrm{m}$로 걸어간 지 $9$분 후에 동생이 같은 곳에서 같은 방향으로 분속 $200\\,\\mathrm{m}$로 자전거를 타고 출발하였다. 두 사람 사이의 거리가 $150\\,\\mathrm{m}$가 되는 것은 동생이 출발한 지 몇 분 후인지 모두 구하시오.",
    "2분 후와 4분 후",
  ],
];

/** 음성: 불변식을 어긴 지면은 **던진다**. 없으면 「0」이 «깨끗»인지 «못 셈»인지 안 갈린다. */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    "31U",
    "분수 $\\dfrac{7}{2^{2}\\times5\\times x}$이 유한소수가 되도록 하는 $15$ 이하의 자연수 $x$의 값을 모두 구하여 그 합을 구하시오.",
    "분모에 먼저 약분할 홀수 소인수가 없어 분모를 안 읽어도 된다 (㉠)",
  ],
  [
    "31U",
    "분수 $\\dfrac{33}{2\\times3\\times5\\times x}$이 유한소수가 되도록 하는 $9$ 이하의 자연수 $x$의 값을 모두 구하여 그 합을 구하시오.",
    "위끝이 $9$ 라 약분되어 사는 것이 $x=11$ 하나도 안 들어온다 — «상»이 아니다",
  ],
  [
    "32U",
    "세 수 $a=2^{20}$, $b=3^{30}$, $c=5^{40}$의 대소를 부등호를 사용하여 나타내시오.",
    "참 순서가 적은 차례 그대로라 읽은 차례만 옮겨 적어도 맞는다 (㉠)",
  ],
  [
    "32U",
    "세 수 $a=2^{7}$, $b=3^{5}$, $c=5^{3}$의 대소를 부등호를 사용하여 나타내시오.",
    "지수의 최대공약수가 $1$ 이라 「맞춘다」는 굳힘이 성립하지 않는다",
  ],
  [
    "33U",
    "$x$에 대한 일차부등식 $\\dfrac{x+2}{3}-\\dfrac{1x-1}{5}\\ge\\dfrac{a}{15}$를 만족시키는 자연수 $x$가 $7$개일 때, 상수 $a$의 값의 범위를 구하시오.",
    "정리하면 $x$ 의 계수가 $+2$ 라 해가 위로 열려 개수가 $7$ 이 되는 $a$ 가 없다",
  ],
  [
    "34U",
    "형이 집을 출발하여 분속 $80\\,\\mathrm{m}$로 걸어간 지 $6$분 후에 동생이 같은 곳에서 같은 방향으로 분속 $200\\,\\mathrm{m}$로 자전거를 타고 출발하였다. 두 사람 사이의 거리가 $600\\,\\mathrm{m}$가 되는 것은 동생이 출발한 지 몇 분 후인지 모두 구하시오.",
    "$d\\ge H$ 라 앞 구간의 답이 죽어 갈래가 한 식짜리로 내려앉는다",
  ],
  [
    "34U",
    "형이 집을 출발하여 분속 $80\\,\\mathrm{m}$로 걸어간 지 $6$분 후에 동생이 같은 곳에서 같은 방향으로 분속 $200\\,\\mathrm{m}$로 자전거를 타고 출발하였다. 두 사람 사이의 거리가 $240\\,\\mathrm{m}$가 되는 것은 동생이 출발한 지 몇 분 후인지 구하여 그 합을 구하시오.",
    "합을 물으면 $d$ 를 한 번도 안 읽고 답이 나온다 (㉠)",
  ],
];

describe("중2 확대 갈래 2차 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });
});

describe("중2 확대 갈래 2차 — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_2.length).toBe(4);
    expect(M2_TOP_2.map((e) => e.rpmType)).toEqual([
      "31U",
      "32U",
      "33U",
      "34U",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인 최대를 넘고 제목은 새것이다)", () => {
    for (const e of M2_TOP_2) {
      expect(isCatalogType(e), `${e.key} 는 색인에 없어야 한다`).toBe(false);
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
  });

  it("우리 단원 이름에 붙고 학년·책이 중2 것이다", () => {
    expect(M2_TOP_2.map((e) => [e.rpmType, e.unitSection] as const)).toEqual([
      ["31U", "유리수와 소수"],
      ["32U", "지수법칙"],
      ["33U", "일차부등식의 풀이"],
      ["34U", "일차함수의 활용(속력, 도형, 기타)"],
    ]);
    for (const e of M2_TOP_2) {
      expect(e.grade).toBe("중2");
      expect(e.rpmBook).toBe("2-1");
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
    }
  });

  it("🔴 `34U` 의 중단원 이름에 **가는 공백(U+2009)** 이 살아 있다", () => {
    // 보통 공백으로 적으면 색인 조회가 **조용히** 빗나간다 — 눈으로는 안 보인다.
    expect(E34.rpmMinor).toContain("\u2009");
    expect(E34.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑵");
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    const foreign = registeredTypes().filter((e) => !M2_TOP_2.includes(e));
    for (const e of M2_TOP_2) {
      expect(
        foreign.some((f) => f.key === e.key),
        `${e.key} 가 남의 모듈과 겹친다`,
      ).toBe(false);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_2) {
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

describe("중2 확대 갈래 2차 — 지면과 값", () => {
  for (const e of M2_TOP_2) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      // ⚠️ 표본은 **`it` 안에서** 만든다(한 번만 만들고 나눠 쓴다).
      //    `describe` 몸통에서 만들면 생성기가 던졌을 때 **수집 단계가 죽어**
      //    어느 검사가 물었는지를 못 대게 된다 — 변이 하네스가 그때 「빨간데 근거가
      //    없다」로 판정을 거부했다(2026-08-23 「판정 줄만 읽지 말고 근거 줄을 보라」).
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

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시", () => {
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
          }
          // 그림이 없으므로 발문이 지면을 가리키면 종이에서 못 푼다.
          expect(p.figureSpec ?? null, e.rpmType).toBe(null);
          expect(pointsAtFigure(p.content), e.rpmType).toBeNull();
        }
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸)", () => {
        for (const p of sample()) {
          const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
          expect(lines.length, `${e.rpmType} 해설 줄`).toBeGreaterThanOrEqual(
            5,
          );
          expect(
            p.solution.length,
            `${e.rpmType} 해설이 너무 짧다`,
          ).toBeGreaterThan(200);
          // 결론 줄(「따라서 …」)이 있어야 하고, 그것이 **끝 쪽**에 있어야 한다.
          // ⚠️ 마지막 줄로 못 박으면 안 된다 — `33U`·`34U` 는 결론 **뒤에**
          //    「실제로 $a=6$ 이면 …」 확인 줄을 하나 더 둔다(D-116 ⑸ 가 바라는 것이
          //    바로 그 걸음이다). 첫 판이 그렇게 못 박았다가 빨개져서 알았다.
          const conclusion = lines.findIndex((l) => l.startsWith("따라서"));
          expect(
            conclusion,
            `${e.rpmType} 「따라서」 결론 줄이 없다`,
          ).toBeGreaterThan(0);
          expect(
            lines.length - conclusion,
            `${e.rpmType} 결론이 너무 앞에 있다`,
          ).toBeLessThanOrEqual(2);
          // 결론 앞에 **중간 결과**가 실제로 있어야 한다 — 「구하면」 뒤에 답만 오면 안 된다.
          const middle = lines.slice(1, conclusion).join("\n");
          expect(middle, `${e.rpmType} 중간 결과가 없다`).toMatch(/\$/);
          expect(
            middle.split("\n").length,
            `${e.rpmType} 중간 걸음이 모자라다`,
          ).toBeGreaterThanOrEqual(3);
        }
      });

      it("변형 공간이 열 문항을 낸다 — 발문이 겹치지 않는다", () => {
        const seen = new Set(rows(e, 60).map((p) => p.content));
        expect(seen.size, `${e.rpmType} 변형 공간`).toBeGreaterThanOrEqual(10);
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
  if (rpmType === "31U") return `$${facts.x}$`;
  if (rpmType === "32U") {
    const values = [
      facts.b1! ** facts.k1!,
      facts.b2! ** facts.k2!,
      facts.b3! ** facts.k3!,
    ];
    return `$${ascendingChain(values)}$`;
  }
  if (rpmType === "33U") return `$${facts.x}<a\\le${facts.hi}$`;
  if (rpmType === "34U") return `$${facts.x}$분 후와 $${facts.second}$분 후`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

/**
 * 🔴 **㉠ 「창을 한쪽 끝만 주면 굳힘이 장식이 된다」** — 갈래마다 따로 찍는다.
 *
 * 「축이 없다」와 「축이 초록이다」는 다른 말이다(m1Top 머리말). 어느 쪽인지
 * 검사 이름에 적는다.
 */
describe("중2 확대 갈래 2차 — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`31U` — 답은 **후보 전부의 합**이라 목록의 어느 자리도 답이 아니다 (실측 0)", () => {
    let firstHits = 0;
    let lastHits = 0;
    for (const p of rows(E31, 120)) {
      const kept: number[] = [];
      for (let x = 1; x <= p.facts.limit!; x += 1) {
        if (isTerminating(p.facts.numer!, p.facts.den! * p.facts.q! * x)) {
          kept.push(x);
        }
      }
      expect(sum(kept), p.content).toBe(p.facts.x);
      if (kept[0] === p.facts.x) firstHits += 1;
      if (kept.at(-1) === p.facts.x) lastHits += 1;
    }
    expect(firstHits).toBe(0);
    expect(lastHits).toBe(0);
  });

  it("`32U` — 밑만 찍어도, 지수만 찍어도, 적힌 차례를 옮겨 적어도 틀린다 (전수)", () => {
    for (const p of rows(E32, 120)) {
      const bases = [p.facts.b1!, p.facts.b2!, p.facts.b3!];
      const exps = [p.facts.e1!, p.facts.e2!, p.facts.e3!];
      const values = [
        p.facts.b1! ** p.facts.k1!,
        p.facts.b2! ** p.facts.k2!,
        p.facts.b3! ** p.facts.k3!,
      ];
      const truth = ascendingChain(values);
      expect(truth, p.content).not.toBe(ascendingChain(bases));
      expect(truth, p.content).not.toBe(ascendingChain(exps));
      expect(truth).not.toBe("a<b<c");
      expect(truth).not.toBe("c<b<a");
      // 「적힌 차례 = 밑 차례」도 아니어야 힌트가 안 된다.
      expect(bases[0]! < bases[1]! && bases[1]! < bases[2]!, p.content).toBe(
        false,
      );
      expect(bases[0]! > bases[1]! && bases[1]! > bases[2]!, p.content).toBe(
        false,
      );
    }
  });

  it("`33U` — 이 축은 **없다**: 후보 목록이 아예 없고 값이 하나의 구간으로 굳는다", () => {
    for (const p of rows(E33, 60)) {
      // 「모두 구하여」류의 후보 열거가 발문에 없다 — 찍을 자리 자체가 없다.
      expect(p.content).not.toMatch(/모두 구/);
      expect(p.answer).toMatch(/^\$\d+<a\\le\d+\$$/);
    }
  });

  it("`34U` — 답이 두 시각을 다 적는 것이고, $d$·$L$ 을 흔들면 답이 바뀐다 (전수)", () => {
    for (const p of rows(E34, 120)) {
      const { slow, fast, lead, target, head } = p.facts as Record<
        string,
        number
      >;
      const truth = chaseTimes(slow!, fast!, lead!, target!);
      expect(truth).toEqual([p.facts.x, p.facts.second]);
      // 목표 거리를 안 읽으면 틀린다.
      expect(chaseTimes(slow!, fast!, lead!, target! + 40)).not.toEqual(truth);
      // 앞선 시간을 안 읽으면 틀린다.
      expect(chaseTimes(slow!, fast!, lead! + 1, target!)).not.toEqual(truth);
      // 목표 거리가 처음 벌어진 거리 이상이면 앞 구간의 답이 죽는다 — 그 자리를 피했다.
      expect(target!).toBeLessThan(head!);
      expect(chaseTimes(slow!, fast!, lead!, head!).length).toBe(1);
    }
  });
});

/**
 * 🔴 **㉡ 「굳힘이 항등식이면 조건을 지워도 답이 그대로다」**
 *
 * 넷 다 굳힘 조건을 **인자로 받는 순수 함수**로 뽑아 두었다. 그 인자를 흔들어
 * 답이 실제로 달라지는지 잰다 — 안 달라지면 그 유형은 장식이다.
 */
describe("중2 확대 갈래 2차 — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`31U` — 「분자와 약분된다」를 지우면 답이 달라진다 (전수)", () => {
    for (const p of rows(E31, 120)) {
      const truth = sum(finiteDecimalSurvivors(p.facts.p!, p.facts.limit!));
      expect(truth, p.content).toBe(p.facts.x);
      // 굳힘을 지운 판 — $x$ 자체가 $2^{a}5^{b}$ 꼴이어야 한다고 본 답.
      expect(
        sum(finiteDecimalSurvivors(1, p.facts.limit!)),
        p.content,
      ).not.toBe(truth);
      // 분모의 홀수 소인수를 **안 지운** 판 — 분모를 안 읽은 학생의 답.
      expect(
        sum(finiteDecimalSurvivors(p.facts.numer!, p.facts.limit!)),
        p.content,
      ).not.toBe(truth);
      // 「유한소수」 조건을 통째로 지운 판.
      let all = 0;
      for (let x = 1; x <= p.facts.limit!; x += 1) all += x;
      expect(all, p.content).not.toBe(truth);
    }
  });

  it("`32U` — `ascendingChain` 이 인자를 실제로 본다 (손 계산 눈금)", () => {
    // $8<9$ 이고 $5<8$ — 값으로 견주면 `b<a<c`.
    expect(ascendingChain([8, 5, 9])).toBe("b<a<c");
    expect(ascendingChain([5, 9, 8])).toBe("a<c<b");
    // 인자가 달라지면 답도 달라진다 — 안 그러면 이 함수는 굳힘이 아니다.
    expect(ascendingChain([2, 3, 5])).not.toBe(ascendingChain([5, 3, 2]));
  });

  it("`33U` — 부등호의 등호를 떼면 **등호의 자리가 뒤집힌다** (손 계산 눈금)", () => {
    const closed = constantRangeForCount(13, 7, true);
    const open = constantRangeForCount(13, 7, false);
    expect([closed.lo, closed.hi, closed.closedAtHi]).toEqual([5, 6, true]);
    expect([open.lo, open.hi, open.closedAtHi]).toEqual([5, 6, false]);
    const text = (r: typeof closed): string =>
      r.closedAtHi ? `${r.lo}<a\\le${r.hi}` : `${r.lo}\\le a<${r.hi}`;
    // 🔴 `closed` 인자를 안 보게 고치면 이 줄이 빨개진다.
    expect(text(closed)).not.toBe(text(open));
    // 개수를 흔들면 구간이 통째로 옮겨 간다 — 「개수」가 장식이 아니다.
    expect(constantRangeForCount(13, 8, true).hi).toBe(5);
  });

  it("`33U` — 씨앗마다 「개수」가 실제로 답을 정한다 (전수)", () => {
    for (const p of rows(E33, 120)) {
      const here = constantRangeForCount(p.facts.total!, p.facts.count!, true);
      expect([here.lo, here.hi], p.content).toEqual([p.facts.x, p.facts.hi]);
      const other = constantRangeForCount(
        p.facts.total!,
        p.facts.count! + 1,
        true,
      );
      expect(other.hi, p.content).not.toBe(here.hi);
    }
  });

  it("`34U` — 「구간을 둘로 나눈다」를 지우면 답이 반쪽이 된다 (손 계산 눈금)", () => {
    // 브리프 실측: $v_1=80$, $v_2=200$, $L=6$, $d=240$ → $2$분·$6$분.
    expect(chaseTimes(80, 200, 6, 240)).toEqual([2, 6]);
    expect(chaseTimes(50, 200, 9, 150)).toEqual([2, 4]);
    // 앞 구간만 본 답 · 뒤 구간만 본 답 — 둘 다 참값과 다르다.
    expect(chaseTimes(80, 200, 6, 240).slice(0, 1)).not.toEqual([2, 6]);
    expect(chaseTimes(80, 200, 6, 240).slice(1)).not.toEqual([2, 6]);
    // 뒷사람이 더 느리면 애초에 못 따라잡는다.
    expect(chaseTimes(200, 80, 6, 240)).toEqual([]);
  });
});

/**
 * 굳힘 함수 자체의 눈금 — 손 계산과 맞대 본다.
 * 여기가 빨개지면 위의 ㉠·㉡ 판정도 못 믿는다.
 */
describe("중2 확대 갈래 2차 — 굳힘 함수", () => {
  it("`finiteDecimalSurvivors` 는 분자와의 약분까지 센다", () => {
    // 분자의 홀수부가 $7$ · 위끝 $15$ — 브리프 실측.
    expect(finiteDecimalSurvivors(7, 15)).toEqual([1, 2, 4, 5, 7, 8, 10, 14]);
    // 약분 축을 지우면 $7$ · $14$ 가 빠진다.
    expect(finiteDecimalSurvivors(1, 15)).toEqual([1, 2, 4, 5, 8, 10]);
    // $x=9$ 는 $9/\gcd(3,9)=3$ 이라 죽는다 — 「$p$ 의 배수면 산다」가 아니다.
    expect(finiteDecimalSurvivors(3, 15)).not.toContain(9);
    expect(finiteDecimalSurvivors(3, 15)).toContain(3);
  });

  it("`constantRangeForCount` 는 자연수 해의 개수에서 구간을 낸다", () => {
    expect(constantRangeForCount(13, 7, true).hi).toBe(6);
    expect(constantRangeForCount(13, 7, true).lo).toBe(5);
  });

  it("`chaseTimes` 는 양의 시각만, 오름차순으로 낸다", () => {
    expect(chaseTimes(80, 200, 6, 600)).toEqual([9]); // $d\ge H$ — 앞 구간이 죽는다
    expect(chaseTimes(80, 200, 6, 480)).toEqual([8]); // $d=H$ — $t_1=0$ 은 답이 아니다
  });
});

/**
 * 🔴 **이 회차가 실제로 물린 결함** — 되돌아오면 여기서 빨개진다.
 *
 * 둘 다 **값 검산이 구조적으로 못 보는** 부류다(답은 맞는다). 하나는 냄새 자가,
 * 하나는 해설을 눈으로 읽어서 나왔다.
 */
describe("중2 확대 갈래 2차 — 물린 결함의 회귀 잠금", () => {
  it("⑴ 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나가고 냄새 자가 문다", () => {
    for (const e of M2_TOP_2) {
      for (const p of rows(e, 30)) {
        expect(p.solution, `${e.rpmType}`).not.toContain("**");
        // 냄새 자가 이것을 「연산자가 붙어 있다」로 잡는다 — 그 축이 살아 있는지 같이 본다.
        expect(pageSmells("$a$ 와 $b$ 는 **다르다**")).toContain(
          "연산자가 붙어 있다",
        );
      }
    }
  });

  it("⑵ 「(으)로」 자가 살아 있고, 넷 다 그것을 지킨다 — 0 은 «깨끗»과 «못 셈»을 안 가른다", () => {
    // 양성 대조 — 일부러 틀린 글을 대어 **검출기가 도는 것**을 회차마다 보인다.
    expect(euroRoMismatches("지수가 모두 $15$으로 같으므로")).toEqual([
      "$…15$으로 → 로",
    ]);
    expect(euroRoMismatches("지수가 모두 $30$로 같으므로")).toEqual([
      "$…30$로 → 으로",
    ]);
    // 음성 대조 — 옳은 글은 안 문다. 「거짓 경보는 가드를 끈다」(2026-08-20).
    expect(euroRoMismatches("지수가 모두 $15$로 같으므로")).toEqual([]);
    expect(euroRoMismatches("지수가 모두 $30$으로 같으므로")).toEqual([]);
    // 「미터」로 읽는 자리는 **수가 끝이 아니다** — 이 자의 분모 밖이라야 한다.
    expect(euroRoMismatches("분속 $80\\,\\mathrm{m}$로 걸어간")).toEqual([]);
  });

  it("⑶ 「미터」 뒤 조사를 **수의 받침**으로 짓지 않는다 — 읽는 끝은 «미터»다", () => {
    for (const p of rows(E34, 60)) {
      // `$480\,\mathrm{m}$을` 이 되면 안 된다 — 「사백팔십 미터를」로 읽는다.
      expect(p.solution).not.toMatch(/\\mathrm\{m\}\$을/);
      expect(p.solution).toMatch(/\\mathrm\{m\}\$를/);
    }
  });

  it("⑷ 🔴 `32U` 해설의 셈이 맞는다 — **값은 맞고 해설만 틀리는** 부류를 막는다", () => {
    // 🔴 이 검사는 **변이 시험이 찾아 준 구멍**이다. 「지수의 최대공약수로 맞춘다」를
    //    「아무 공약수로 맞춘다」로 바꾸면 답은 **그대로 맞는다** — 지수를 어떤 공약수로
    //    맞추든 밑의 대소는 같기 때문이다. 그런데 해설 첫 줄의 「최대공약수는 $G$이다」가
    //    거짓이 된다. 값 검산도, 냄새도, 렌더도 이 부류를 구조적으로 못 본다
    //    (2026-08-24 「값이 맞으면 시험이 다 초록이다」).
    for (const p of rows(E32, 60)) {
      const printed = [...p.content.matchAll(/\$[abc]=(\d+)\^\{(\d+)\}\$/g)];
      const exps = printed.map((m) => Number(m[2]));
      const [e1, e2, e3, g] = grab(
        /세 수의 지수 \$(\d+)\$, \$(\d+)\$, \$(\d+)\$의 최대공약수는 \$(\d+)\$이다\./,
        p.solution,
        "32U 해설",
      );
      expect([Number(e1), Number(e2), Number(e3)], p.solution).toEqual(exps);
      // 해설이 말한 값이 **정말** 최대공약수인가.
      expect(Number(g), p.solution).toBe(
        gcd(gcd(exps[0]!, exps[1]!), exps[2]!),
      );
      const common = Number(g);
      // 고쳐 쓴 세 줄의 셈도 맞아야 한다 — $b^{e}=\left(b^{k}\right)^{G}=v^{G}$.
      for (const m of p.solution.matchAll(
        /\$[abc]=(\d+)\^\{(\d+)\}=\\left\((\d+)\^\{(\d+)\}\\right\)\^\{(\d+)\}=(\d+)\^\{(\d+)\}\$/g,
      )) {
        const [b, e, b2, k, g1, v, g2] = m.slice(1).map(Number);
        expect(b).toBe(b2);
        expect(g1).toBe(common);
        expect(g2).toBe(common);
        expect(k! * common, p.solution).toBe(e);
        expect(b! ** k!, p.solution).toBe(v);
      }
      // 지수가 이미 맞은 줄은 **그 지수가 정말 $G$ 일 때만** 나와야 한다.
      for (const m of p.solution.matchAll(
        /\$[abc]=(\d+)\^\{(\d+)\}\$은 이미 지수가 \$(\d+)\$이다\./g,
      )) {
        expect(Number(m[2]), p.solution).toBe(common);
        expect(Number(m[3]), p.solution).toBe(common);
      }
    }
  });

  it("⑸ `31U` 해설이 후보를 **하나도 빠짐없이** 늘어놓는다 (D-116 ⑸)", () => {
    for (const p of rows(E31, 30)) {
      for (let x = 1; x <= p.facts.limit!; x += 1) {
        expect(p.solution, `${p.content} — $x=${x}$ 가 해설에 없다`).toContain(
          `$x=${x}$일 때`,
        );
      }
    }
  });

  it("⑹ `34U` 해설이 **두 구간을 다** 적는다 — 한쪽만 적으면 답이 반쪽이다", () => {
    // 🔴 **변이 시험이 이 가드를 한 번 뚫었다.** 처음엔 `$x>4$` 가 있는지만 봤는데,
    //    뒤 구간 줄을 통째로 지워도 **다른 줄**에 「이것은 $x>4$를 만족시킨다」가 남아
    //    초록이었다. 그래서 「구간을 **선언하는** 자리」(…$일 때)와 **두 구간의 식**을
    //    따로 요구한다. 낱말이 파일 안 다른 곳에도 있는지 먼저 보라(2026-08-18).
    for (const p of rows(E34, 30)) {
      const { meet, diff, head } = p.facts as Record<string, number>;
      expect(p.solution).toContain(`$0\\le x<${meet}$일 때`);
      expect(p.solution).toContain(`$x>${meet}$일 때`);
      // 두 구간의 거리 식이 **서로 다른 일차식**으로 둘 다 적혀 있어야 한다.
      expect(p.solution).toContain(`${head}-${diff}x`);
      expect(p.solution).toContain(`${diff}x-${head}`);
      expect(p.solution).toContain(`$x=${p.facts.x}$`);
      expect(p.solution).toContain(`$x=${p.facts.second}$`);
    }
  });
});
