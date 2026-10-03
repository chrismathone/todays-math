/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5b.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `105X` | 「세 각의 합이 $90^\circ$」를 세우고 비를 그 $90$ 에 나눠 세 각을 굳힌 뒤, 이등변삼각형으로 $180^\circ-2\times$(밑각) 을 뺀다 | **그 합을 한 번도 안 쓴다.** 삼각형의 세 내각 $(\angle A,\angle B,\angle C)$ 를 $1^\circ$ 부터 **전부 넣어 보고**, 중심각 관계 $\angle AOB=2\angle C$ 와 $\triangle OAB$ 가 이등변이라는 데서 $\angle OAB=90^\circ-\angle C$ 를 얻어 **비가 맞는 삼각형**을 모은다. 비교는 나눗셈 없이 **교차곱**으로 한다. 그런 삼각형이 하나뿐인지까지 이 훑기가 답한다(「모두」의 반증) |
 * | `106X` | 부등식 둘을 세워 두 경계를 계산하고 그 사이 자연수를 센다 | **부등식을 한 줄도 안 세운다** — $x=1$ 부터 차례로 세 변 $(x,\ x,\ L-2x)$ 를 **실제로 만들어** ㉠ 셋이 다 자연수인가 ㉡ 둘레가 $L$ 인가 ㉢ **세 쌍 모두** 두 변의 합이 나머지보다 큰가 ㉣ 밑변이 $m$ 이상인가 를 물어 살아남는 것을 센다 |
 * | `107X` | 위끝을 나눗셈으로 구해 $a$ 의 범위를 정하고 등차수열의 합처럼 더한다 | **나눗셈도 내림도 안 한다** — $(a,\ b)$ 를 $1$ 부터 **두 겹으로 훑어** $ma+b=k$ 를 만족하는 자연수 쌍을 전부 모으고, 각각의 $na+b$ 를 계산해 **모아서 더한다** |
 * | `108X` | $p$ 를 $\sqrt{P}$ 까지 걸으며 약수 짝을 만든다 | **약수를 «나머지»로 찾지 않는다** — $p$ 를 $1$ 부터 $P$ 까지 훑으며 $q$ 를 같이 돌려 $p\times q$ 가 정말 $P$ 인지 **곱해서** 확인하고, 넓이도 $\dfrac{1}{2}pq=S$ 인지 **곱해서** 확인한다. 최솟값은 살아남은 합을 **전부 모아** 고른다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * 🔴 **음성 눈금은 자기 축을 «홀로» 갈라야 한다**(2026-08-23 m2Top4 ⑸). 아래 지면들은
 * 매개변수를 전수로 훑어 **그 축 하나만 걸리는** 자리에서 골랐다
 * (`scratch` 의 눈금 찾기). 그래도 홀로 못 서는 축이 셋 있고, 그 셋은 ⑸ 에 적었다.
 *
 * ## ⑶ 🔴 앞 물결이 흘린 자리를 여기서 어떻게 잡나
 *
 *   ㄱ. **해설의 모든 산술 등식**(`180-2\times27=126` 꼴)을 뽑아 좌·우를 각각 계산해
 *       맞댄다. `^\circ` 는 먼저 걷어 낸다 — 안 걷으면 각도 등식이 통째로 이 자의
 *       분모 밖이 된다(그러면 「0 건」이 «깨끗»이 아니라 «못 셈»이다).
 *   ㄴ. **해설에 나온 모든 수가 재계산으로 설명되는가** — 발문에서 읽은 값과 독립
 *       검산이 낳은 값만 허용하고, 그 밖의 수가 하나라도 있으면 빨개진다.
 *   ㄷ. **해설의 «말»** — 굳힘과 마무리 논거를 진술하는 낱말을 맞바꾸거나 지우면
 *       빨개진다(㉳). 나열 ↔ 수관형사 ↔ 합을 **셋 다** 맞댄다.
 *   ㄹ. **기약** — 지면의 모든 `\dfrac{수}{수}` 가 기약인가.
 *   ㅁ. **정수 경계 걸음** — `$cx\le R$` 에서 `$x\le B$` 로 뛸 때 참 경계 분수와
 *       「자연수이므로」를 **그 줄에서** 말했는가(㉯).
 *   ㅂ. **해설 높이** — 제품 `estimateSolutionPx` 로 **800판**을 재어 한 단(964.8px)이
 *       아니라 **700px** 아래로 잠근다.
 *   ㅅ. 그리고 그 검산들이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은
 *    재지만 설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로
 *    눈으로 읽었고, 그때 고친 자리를 아래 회귀 잠금에 남긴다.
 * 2. `105X`·`108X` 는 **그림이 없다.** 발문 글자만으로 풀리는지는 `pointsAtFigure` 가
 *    「가리키지 않는다」만 답한다 — 「가리키지 않아도 풀린다」는 사람이 읽어야 안다.
 *    (읽었다: 꼭짓점 이름과 관계식이 본문에 다 있고, 배치를 봐야 아는 값이 없다.)
 * 3. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
 * 4. 공용 훑개(`probe-middle-extending-tiers`)와 이 파일의 경계 걸음 자는 **겹친다.**
 *    남의 파일을 안 고치는 대신 여기 자기 판을 든다 — 리드가 공용 자를 고치면
 *    그때 눈금 수가 바뀐다.
 *
 * ## ⑸ 🔴 홀로 못 서는 축 셋 — **초록인 것이 옳다**
 *
 * - `108X` 「짝이 넷도 안 된다」 — 짝이 넷 미만이면 살아남는 짝과 버려지는 짝을
 *   **둘씩 나눌 수가 없다.** 「살아남는 짝이 둘도 안 된다」와 **같은 사건**이다.
 * - `108X` 「$2S$ 가 제곱수다」 — 전수($S\le900$·$D\le80$)에서 이 축이 홀로 걸리는
 *   지면이 **하나도 없다.** 짝 개수가 홀수라 넷~여섯을 맞추면 살아남는 앞머리가
 *   정확히 둘이 되고, 그러면 답이 $S+2$ 라 **지름길이 늘 함께 문다.** 그래도 두는
 *   까닭은 해설이 「모두 적으면」이라고 **선언**하기 때문이다 — 제곱수면 짝
 *   $(\sqrt{P},\ \sqrt{P})$ 가 $p<q$ 목록에서 빠져 그 말이 거짓이 된다(㉴).
 * - `108X` 「버린 짝에 더 작은 합이 있다」 — $p+q=p+P/p$ 도 $q-p=P/p-p$ 도 $p$ 가
 *   커질수록 작아지므로, 살아남는 쪽은 늘 **작은 $p$ 앞머리**이고 버려지는 쪽은
 *   **큰 $p$ 꼬리**다. 그래서 버려진 최소 합이 **반드시 더 작다** — 이 줄은 가드가
 *   아니라 그 사실을 못 박아 두는 **기록**이다(`39W` 의 「모두의 반증 시도」와 같다).
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
  circumAngles,
  diagonalPairs,
  isoscelesRange,
  M2_TOP_5B,
  naturalSlopes,
  reduceFraction,
} from "@/lib/middle/m2Top5b";
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
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260905, 17, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5B.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E105 = entryOf("105X");
const E106 = entryOf("106X");
const E107 = entryOf("107X");
const E108 = entryOf("108X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "105X": "심화중",
  "106X": "심화중",
  "107X": "심화상",
  "108X": "심화상",
};

/** 리드가 준 «변형 폭» 바닥 — 소단원마다 다르다. */
const VARIANT_FLOOR: Record<string, number> = {
  "105X": 5,
  "106X": 10,
  "107X": 12,
  "108X": 12,
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

/**
 * 🔴 **각도 표시를 먼저 걷는다.** 우리 해설의 산술은 거의 다
 * `$180^\circ-2\times27^\circ=126^\circ$` 꼴이라, 안 걷으면 아래 정규식이
 * **한 건도 못 잡는다** — 그러면 「등식 결함 0」이 «깨끗»이 아니라 «못 셈»이다.
 */
function stripDegrees(text: string): string {
  return text.replace(/\^\\circ/g, "");
}

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
  for (const m of stripDegrees(text).matchAll(CHAIN_EQ)) {
    const left = evalChain(m[1]!);
    const right = Number(m[2]);
    if (!Number.isFinite(left) || left !== right)
      out.push(`${m[1]}=${m[2]} (좌변은 ${left})`);
  }
  return out;
}

/** 이 자가 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다. */
function arithmeticClaims(text: string): number {
  return [...stripDegrees(text).matchAll(CHAIN_EQ)].length;
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

// ── ㅁ. 정수 경계 걸음 (㉯) ───────────────────────────────

/**
 * 🔴 **분수 경계에서 정수 경계로 뛸 때 걸음을 적었는가.**
 *
 * `$cx\le R$이다.` 에서 `$x\le B$이다.` 로 뛸 때 $R/c$ 가 정수가 아니면 해설은
 * **참 경계 분수와 「자연수이므로」를 반드시 그 줄에서** 적어야 한다. 안 적으면
 * 쓴 대로 읽었을 때 **거짓 함의**다(3차 `38V` 가 800씨앗 중 574건 그랬다).
 *
 * ⚠️ `seen` 이 거짓이면 **판정하지 않는다** — 볼 것이 없는 줄에서 「결함 0」을
 *    «깨끗»으로 읽으면 이 자가 통째로 눈이 먼다.
 */
function fractionBoundFault(
  line: string,
  claimRe: RegExp,
  kind: "lower" | "upper",
  finalRe: RegExp,
  sym: string,
): { fault: string | null; seen: boolean } {
  const claim = claimRe.exec(line);
  if (claim === null) return { fault: null, seen: false };
  const c = num(claim[1]);
  const r = num(claim[2]);
  const exact = r / c;
  if (Number.isInteger(exact))
    return {
      fault: `경계 ${r}/${c} 가 정수라 걸음이 잴 것이 없다`,
      seen: true,
    };
  const want = kind === "lower" ? Math.floor(exact) + 1 : Math.floor(exact);
  const fin = finalRe.exec(line);
  if (fin === null)
    return { fault: "정수 경계를 적은 자리가 없다", seen: true };
  if (num(fin[1]) !== want)
    return {
      fault: `정수 경계를 ${fin[1]} 로 적었는데 ${r}/${c} 에서 참은 ${want}`,
      seen: true,
    };
  const [fn, fd] = reduceFraction(r, c);
  if (!line.includes(`\\dfrac{${fn}}{${fd}}`))
    return {
      fault: `참 경계 ${fn}/${fd} 를 안 적고 정수로 뛰었다`,
      seen: true,
    };
  if (
    !line.includes(`$${sym}$는 자연수이므로`) &&
    !line.includes(`$${sym}$도 자연수이므로`)
  )
    return {
      fault: `「$${sym}$는 자연수」 걸음을 안 적고 정수로 뛰었다`,
      seen: true,
    };
  return { fault: null, seen: true };
}

// ── 105X 소품 — 세 내각을 **전부 넣어 보고** 비가 맞는 것을 찾는다 ──

type Tri = {
  oab: number;
  obc: number;
  oca: number;
  A: number;
  B: number;
  C: number;
};

/**
 * $\angle OAB : \angle OBC : \angle OCA = p:q:r$ 인 **예각삼각형을 전부** 찾는다.
 *
 * 「세 각의 합이 $90^\circ$」를 쓰지 않는다 — 세 내각을 $1^\circ$ 부터 다 넣어 보고,
 * 중심각 관계 $\angle AOB=2\angle C$ 와 $\triangle OAB$ 가 이등변이라는 데서
 * $\angle OAB=90^\circ-\angle C$ 를 얻어 비를 **교차곱**으로 견준다.
 */
function trianglesWithRatio(p: number, q: number, r: number): Tri[] {
  const out: Tri[] = [];
  for (let A = 1; A < 90; A += 1)
    for (let B = 1; B < 90; B += 1) {
      const C = 180 - A - B;
      if (C < 1 || C >= 90) continue;
      const oab = 90 - C;
      const obc = 90 - A;
      const oca = 90 - B;
      if (oab < 1 || obc < 1 || oca < 1) continue;
      if (oab * q !== obc * p) continue;
      if (obc * r !== oca * q) continue;
      out.push({ oab, obc, oca, A, B, C });
    }
  return out;
}

/** 물음 이름 → 두 배가 되는 꼭짓점. */
const CENTER_TO_VERTEX: Record<string, "A" | "B" | "C"> = {
  BOC: "A",
  COA: "B",
  AOB: "C",
};

// ── 106X 소품 — 삼각형을 **실제로 만들어** 본다 ─────────────

/** 세 변으로 삼각형이 되는가 — **세 쌍 모두** 본다(한 쌍만 보면 새는 자리가 있다). */
function isTriangle(a: number, b: number, c: number): boolean {
  return a + b > c && b + c > a && c + a > b;
}

/** 길이 `L` 의 끈으로 만들 수 있는 «등변 길이» 전부 (밑변 `m` 이상). */
function isoscelesXs(L: number, m: number): number[] {
  const out: number[] = [];
  for (let x = 1; x < L; x += 1) {
    const base = L - 2 * x;
    if (base < 1) continue;
    if (x + x + base !== L) continue;
    if (!isTriangle(x, x, base)) continue;
    if (base < m) continue;
    out.push(x);
  }
  return out;
}

// ── 107X 소품 — $(a,\ b)$ 를 **두 겹으로** 훑는다 ────────────

function naturalPairs(m: number, k: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = 1; a <= k; a += 1)
    for (let b = 1; b <= k; b += 1) {
      if (m * a + b !== k) continue;
      out.push([a, b]);
    }
  return out;
}

// ── 108X 소품 — 곱을 **곱해서** 확인한다 ────────────────────

/** $pq=P$ 이고 $p<q$ 인 짝 전부 — 나머지 연산 없이 곱으로 확인한다. */
function productPairs(P: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let p = 1; p < P; p += 1) {
    const q = Math.round(P / p);
    if (p * q !== P) continue;
    if (q <= p) break;
    out.push([p, q]);
  }
  return out;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  // 105X — 세 내각을 전부 넣어 보고 비가 맞는 삼각형을 찾는다.
  "105X": (content) => {
    if (!content.includes("예각삼각형"))
      throw new Error("105X: 예각삼각형 조건이 없다");
    const [pT, qT, rT, askT] = grab(
      /^점 \$O\$가 예각삼각형 \$ABC\$의 외심이고 \$\\angle OAB : \\angle OBC : \\angle OCA = (\d+) : (\d+) : (\d+)\$일 때, \$\\angle (BOC|COA|AOB)\$의 크기를 구하시오\.$/,
      content,
      "105X",
    );
    const p = num(pT);
    const q = num(qT);
    const r = num(rT);
    if (gcd2(gcd2(p, q), r) !== 1)
      throw new Error("105X: 비가 기약이 아니다 — 같은 문항이 여러 벌 난다");
    if (p === q && q === r)
      throw new Error("105X: 정삼각형이라 비를 줄 까닭이 없다");
    const hits = trianglesWithRatio(p, q, r);
    if (hits.length === 0)
      throw new Error("105X: 그런 비를 갖는 예각삼각형이 없다");
    // 🔴 「모두」의 반증 시도 — **한 번도 못 문다**(초록인 것이 옳다). 비와
    //    「합이 $90^\circ$」가 세 각을 하나로 굳히기 때문이다. 지우면 「여러 개일
    //    수 있는지 봤다」는 사실이 지면에서 사라진다.
    if (hits.length > 1)
      throw new Error(
        `105X: 그런 삼각형이 ${hits.length}개라 답이 안 정해진다`,
      );
    const t = hits[0]!;
    if (Math.min(t.oab, t.obc, t.oca) < 6)
      throw new Error("105X: $6^\\circ$ 미만인 각이 있어 지면이 흉하다");
    const vertex = CENTER_TO_VERTEX[askT!]!;
    const ans = 2 * (vertex === "A" ? t.A : vertex === "B" ? t.B : t.C);
    // 🔴 ㉵ 지름길 — 답은 위 훑기에서 왔고, 이 줄은 그 답이 「발문 세 수의 한두 번
    //    연산으로도 나오는가」를 되묻는 불변식이다(생성기 목록의 부분집합).
    const g = new Set<number>([p + q + r, p * q * r, 10 * (p + q + r)]);
    for (const a of [p, q, r])
      for (const b of [p, q, r]) {
        g.add(a + b);
        g.add(a * b);
        g.add(10 * (a + b));
      }
    if (g.has(ans))
      throw new Error(
        "105X: 발문 세 수의 한두 번 연산으로 답이 나온다 — 지름길",
      );
    return `${ans}^\\circ`;
  },

  // 106X — 삼각형을 실제로 만들어 본다. 부등식을 한 줄도 안 세운다.
  "106X": (content) => {
    const [lT, mT] = grab(
      /^길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다\. 세 변의 길이가 모두 자연수 \$\\mathrm\{cm\}\$이고 밑변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오\.$/,
      content,
      "106X",
    );
    const L = num(lT);
    const m = num(mT);
    const xs = isoscelesXs(L, m);
    if (xs.length < 3)
      throw new Error(`106X: 만들 수 있는 삼각형이 ${xs.length}가지뿐이다`);
    if (xs.length > 30)
      throw new Error("106X: 후보가 너무 많아 나열이 지면을 넘는다");
    // 두 경계가 **둘 다 분수**라야 「자연수이므로」 걸음을 둘 다 잴 수 있다(㉯).
    if (L % 4 === 0)
      throw new Error(
        "106X: 아래 경계가 정수라 「자연수」 걸음이 잴 것이 없다",
      );
    if ((L - m) % 2 === 0)
      throw new Error("106X: 위 경계가 정수라 「자연수」 걸음이 잴 것이 없다");
    // ㉴ 「밑변」이 어느 변인지 흐려지면 안 된다.
    if (xs.some((x) => L - 2 * x === x))
      throw new Error("106X: 정삼각형이 후보에 있어 밑변이 정해지지 않는다");
    const n = xs.length;
    const g = new Set<number>([
      L,
      m,
      L / 2,
      L / 4,
      L / 3,
      m / 2,
      L + m,
      L - m,
      (L - m) / 2,
      (L - m) / 4,
      L / 4 + m,
      L / 2 - m,
    ]);
    if (g.has(n))
      throw new Error(
        "106X: 발문 두 수의 한두 번 연산으로 답이 나온다 — 지름길",
      );
    return `${n}개`;
  },

  // 107X — $(a,\ b)$ 를 두 겹으로 훑는다. 나눗셈도 내림도 안 한다.
  "107X": (content) => {
    const [mT, kT, nT] = grab(
      /^일차함수 \$f\(x\)=ax\+b\$에서 \$a\$, \$b\$가 모두 자연수이고 \$f\((\d+)\)=(\d+)\$이다\. 이때 \$f\((-?\d+)\)\$의 값이 될 수 있는 모든 값의 합을 구하시오\.$/,
      content,
      "107X",
    );
    const m = num(mT);
    const k = num(kT);
    const n = num(nT);
    if (n === m) throw new Error("107X: 묻는 자리가 주어진 자리와 같다");
    const pairs = naturalPairs(m, k);
    if (pairs.length < 3)
      throw new Error(
        `107X: 후보가 ${pairs.length}개뿐이라 「모두」가 성립하지 않는다`,
      );
    if (pairs.length > 6)
      throw new Error("107X: 후보가 여섯을 넘어 나열이 지면을 넘는다");
    if (gcd2(k - 1, m) !== 1)
      throw new Error(
        "107X: 경계 분수가 기약이 아니라 지면에 약분 안 한 분수가 난다",
      );
    const values = pairs.map(([a, b]) => n * a + b);
    if (values.some((v) => v === 0))
      throw new Error("107X: 값에 $0$ 이 있어 지면에 `+0` 이 난다");
    if (new Set(values).size !== values.length)
      throw new Error("107X: 값이 겹쳐 「모두 다르다」가 거짓이다");
    const total = values.reduce((s, v) => s + v, 0);
    if (values.includes(total))
      throw new Error(
        "107X: 후보 하나가 곧 답이라 「다 세워 더한다」가 장식이다",
      );
    const g = new Set<number>([
      m + k + n,
      m * k * n,
      pairs.length,
      pairs.length * k,
    ]);
    for (const a of [m, k, n])
      for (const b of [m, k, n]) {
        g.add(a + b);
        g.add(a - b);
        g.add(a * b);
      }
    if (g.has(total))
      throw new Error(
        "107X: 발문 세 수의 한두 번 연산으로 답이 나온다 — 지름길",
      );
    return String(total);
  },

  // 108X — 곱을 곱해서 확인한다. 약수를 나머지로 찾지 않는다.
  "108X": (content) => {
    const [dT, sT] = grab(
      /^두 대각선의 길이가 모두 자연수 \$\\mathrm\{cm\}\$이고 두 대각선의 길이의 차가 \$(\d+)\\,\\mathrm\{cm\}\$ 이상인 마름모 \$ABCD\$가 있다\. 이 마름모의 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^2\$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것을 구하시오\.$/,
      content,
      "108X",
    );
    const D = num(dT);
    const S = num(sT);
    const P = 2 * S;
    const all = productPairs(P);
    // 넓이를 **곱해서** 다시 확인한다 — 짝을 만든 방법과 독립인 되물음이다.
    for (const [p, q] of all)
      if (p * q !== 2 * S)
        throw new Error("108X: 짝의 곱이 넓이의 두 배가 아니다");
    if (all.length < 4) throw new Error(`108X: 짝이 ${all.length}개뿐이다`);
    if (all.length > 6)
      throw new Error("108X: 짝이 여섯을 넘어 나열이 지면을 넘는다");
    const root = Math.round(Math.sqrt(P));
    // 🔴 ⑸ — 이 축은 홀로 못 문다(초록인 것이 옳다). 해설이 「모두 적으면」이라고
    //    선언하므로 남긴다: 제곱수면 $(\sqrt{P},\ \sqrt{P})$ 가 목록에서 빠진다.
    if (root * root === P)
      throw new Error("108X: $2S$ 가 제곱수라 「모두 적으면」이 거짓이 된다");
    const alive = all.filter(([p, q]) => q - p >= D);
    const dead = all.filter(([p, q]) => q - p < D);
    if (alive.length < 2)
      throw new Error("108X: 살아남는 짝이 둘도 안 되어 견줄 것이 없다");
    if (dead.length < 2)
      throw new Error(
        "108X: 버려지는 짝이 둘도 안 되어 차 조건이 거의 안 자른다",
      );
    const minSum = Math.min(...alive.map(([p, q]) => p + q));
    const deadMin = Math.min(...dead.map(([p, q]) => p + q));
    // 🔴 ⑸ — 이 줄도 홀로 못 문다. 「차 조건이 정말 답을 바꾼다」는 기록이다.
    if (deadMin >= minSum)
      throw new Error(
        "108X: 버려진 짝의 합이 더 크지 않아 차 조건이 답을 안 바꾼다",
      );
    const g = new Set<number>([
      S,
      2 * S,
      S + 1,
      S - 1,
      S + 2,
      S - 2,
      S / 2,
      D,
      2 * D,
      4 * D,
      S + D,
      S - D,
      S / 2 + D,
    ]);
    if (g.has(minSum))
      throw new Error(
        "108X: 발문 두 수의 한두 번 연산으로 답이 나온다 — 지름길",
      );
    return `${minSum}\\,\\mathrm{cm}`;
  },
};

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/**
 * 양성: 답을 아는 지면에서 그 답을 낸다. **손으로 풀어 확인한 값**이다.
 *
 * ⚠️ 이 지면들은 **문자열 픽스처**다. 엔진 산출물을 그때그때 불러 쓰면 엔진을 고치는
 *    순간 양성이 사라져 재현율을 영영 못 잰다(2026-08-23).
 */
it("MID-002: 외심 검산은 발문에 없는 예각 조건을 가정하지 않는다", () => {
  // A=101.25°, B=48.75°, C=30°도 이 비를 만족하고 COA=97.5°이다.
  // 예각삼각형만 센 검산기는 다른 답 114° 하나만 있다고 잘못 판단했다.
  expect(() =>
    VERIFY["105X"]!(
      "점 $O$가 $\\triangle ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 16 : 3 : 11$일 때, $\\angle COA$의 크기를 구하시오.",
    ),
  ).toThrow("예각삼각형 조건이 없다");
});

const CALIBRATION: ReadonlyArray<readonly [string, string, string]> = [
  [
    // $4+3+8=15$, $90\div15=6$ → $24^\circ,18^\circ,48^\circ$.
    // $\angle A=24+48=72$ 이므로 $\angle BOC=2\times72=144$.
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 4 : 3 : 8$일 때, $\\angle BOC$의 크기를 구하시오.",
    "144^\\circ",
  ],
  [
    // 같은 비에서 물음만 바꾼다 — $\angle B=24+18=42$ 이므로 $\angle COA=84$.
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 4 : 3 : 8$일 때, $\\angle COA$의 크기를 구하시오.",
    "84^\\circ",
  ],
  [
    // $122/4=30.5$ → $x\ge31$, $(122-21)/2=50.5$ → $x\le50$, $50-31+1=20$.
    "106X",
    "길이가 $122\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $21\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "20개",
  ],
  [
    // $4a+b=18$, $b\ge1$ → $a=1,2,3,4$; $b=14,10,6,2$;
    // $f(10)=10a+b=24,30,36,42$ → 합 $132$.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(4)=18$이다. 이때 $f(10)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "132",
  ],
  [
    // **뒤로 가는 자리**(음의 $n$)도 낸다 — 값이 줄어들고 합이 음수가 된다.
    // $2a+b=10$, $b\ge1$ → $a=1,2,3,4$; $b=8,6,4,2$;
    // $f(-5)=-5a+b=3,-4,-11,-18$ → 합 $-30$.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=10$이다. 이때 $f(-5)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "-30",
  ],
  [
    // $2\times81=162$; 짝 $(1,162),(2,81),(3,54),(6,27),(9,18)$; 차 $161,79,51,21,9$;
    // $43$ 이상은 앞 셋, 합 $163,83,57$ → 최소 $57$.
    "108X",
    "두 대각선의 길이가 모두 자연수 $\\mathrm{cm}$이고 두 대각선의 길이의 차가 $43\\,\\mathrm{cm}$ 이상인 마름모 $ABCD$가 있다. 이 마름모의 넓이가 $81\\,\\mathrm{cm}^2$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것을 구하시오.",
    "57\\,\\mathrm{cm}",
  ],
];

/**
 * 음성: 불변식을 어긴 지면은 **던진다**. 없으면 「0」이 «깨끗»인지 «못 셈»인지 안 갈린다.
 *
 * 🔴 전수로 훑어 **그 축 하나만 걸리는** 매개변수를 골랐다 — 다른 축에도 걸리는
 *    지면을 쓰면 그 검사를 지워도 다른 쪽이 대신 물어 「가드다」가 거짓이 된다.
 */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    // $2:2:6$ 은 $1:1:3$ 과 같은 문항이다 (전수에서 이 축만 걸린다).
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 2 : 2 : 6$일 때, $\\angle BOC$의 크기를 구하시오.",
    "비가 기약이 아니다",
  ],
  [
    // $1+1+2=4$ 이고 $90$ 이 $4$ 로 안 나뉘어 정수 각이 없다.
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 1 : 1 : 2$일 때, $\\angle BOC$의 크기를 구하시오.",
    "그런 비를 갖는 예각삼각형이 없다",
  ],
  [
    // $1+13+16=30$, $k=3$ → $3^\circ,39^\circ,48^\circ$ — $3^\circ$ 짜리 각이 난다.
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 1 : 13 : 16$일 때, $\\angle BOC$의 크기를 구하시오.",
    "$6^\\circ$ 미만인 각이 있다",
  ],
  [
    // 정삼각형 — 비를 줄 까닭이 없다.
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 1 : 1 : 1$일 때, $\\angle BOC$의 크기를 구하시오.",
    "정삼각형이라 비를 줄 까닭이 없다",
  ],
  [
    // $1+1+4=6$, $k=15$ → $15,15,60$; $\angle B=30$ → $\angle COA=60=10\times(1+1+4)$.
    "105X",
    "점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB : \\angle OBC : \\angle OCA = 1 : 1 : 4$일 때, $\\angle COA$의 크기를 구하시오.",
    "발문 세 수의 한두 번 연산으로 답이 나온다",
  ],
  [
    // $L=21$, $m=8$ — 만들 수 있는 삼각형이 둘뿐이다.
    "106X",
    "길이가 $21\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $8\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "만들 수 있는 삼각형이 셋도 안 된다",
  ],
  [
    // $L=127$, $m=2$ — 후보가 서른을 넘어 지면이 흉해진다.
    "106X",
    "길이가 $127\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $2\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "후보가 너무 많다",
  ],
  [
    // $L=28$ 은 $4$ 의 배수라 아래 경계가 정수다 — 「자연수」 걸음이 잴 것이 없다.
    "106X",
    "길이가 $28\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $3\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "아래 경계가 정수다",
  ],
  [
    // $L-m=18$ 이 짝수라 위 경계가 정수다.
    "106X",
    "길이가 $23\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $5\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "위 경계가 정수다",
  ],
  [
    // $L=21$ 이라 $x=7$ 이면 정삼각형 — 「밑변」이 어느 변인지 흐려진다.
    "106X",
    "길이가 $21\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $2\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "정삼각형이 후보에 있다",
  ],
  [
    // $L=23$, $m=4$ — 답 $4$ 가 발문의 $m$ 그대로다.
    "106X",
    "길이가 $23\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. 세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $4\\,\\mathrm{cm}$ 이상일 때, 만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.",
    "발문 두 수의 한두 번 연산으로 답이 나온다",
  ],
  [
    // 묻는 자리가 주어진 자리와 같다.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=5$이다. 이때 $f(2)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "묻는 자리가 주어진 자리와 같다",
  ],
  [
    // $2a+b=6$, $b\ge1$ → $a=1,2$ 뿐이다.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=6$이다. 이때 $f(-8)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "후보가 셋도 안 된다",
  ],
  [
    // $2a+b=16$ → $a=1..7$ 로 일곱이라 나열이 길다.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=16$이다. 이때 $f(-8)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "후보가 여섯을 넘는다",
  ],
  [
    // $\gcd(6,2)=2$ 라 $a\le\dfrac{6}{2}$ 가 약분된다.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=7$이다. 이때 $f(-8)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "경계 분수가 기약이 아니다",
  ],
  [
    // $2a+b=8$ → $(1,6),(2,4),(3,2)$; $f(-6)=-6a+b=0,-8,-16$ — 첫 값이 $0$ 이다.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=8$이다. 이때 $f(-6)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "값에 $0$ 이 있다",
  ],
  [
    // $3a+b=14$ → $a=1..4$; $f(-3)=-3a+b=5,-1,-7,-13$ → 합 $-16$ 이 아니라
    // 후보 하나와 같아지는 자리다(전수에서 이 축만 걸린다).
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(3)=14$이다. 이때 $f(-3)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "후보 하나가 곧 답이다",
  ],
  [
    // $2a+b=8$ → $a=1..3$; $f(-4)=-4a+b=2,-4,-10$ → 합 $-12$ 이고 $-12=2\times(-6)$…
    // 전수에서 지름길 축만 걸리는 자리다.
    "107X",
    "일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(2)=8$이다. 이때 $f(-4)$의 값이 될 수 있는 모든 값의 합을 구하시오.",
    "발문 세 수의 한두 번 연산으로 답이 나온다",
  ],
  [
    // $2\times60=120$ — 짝이 일곱이라 나열이 지면을 넘는다.
    "108X",
    "두 대각선의 길이가 모두 자연수 $\\mathrm{cm}$이고 두 대각선의 길이의 차가 $8\\,\\mathrm{cm}$ 이상인 마름모 $ABCD$가 있다. 이 마름모의 넓이가 $60\\,\\mathrm{cm}^2$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것을 구하시오.",
    "짝이 여섯을 넘는다",
  ],
  [
    // $2\times12=24$; 짝 $(1,24),(2,12),(3,8),(4,6)$; 차 $23,10,5,2$ — $11$ 이상은 하나뿐.
    "108X",
    "두 대각선의 길이가 모두 자연수 $\\mathrm{cm}$이고 두 대각선의 길이의 차가 $11\\,\\mathrm{cm}$ 이상인 마름모 $ABCD$가 있다. 이 마름모의 넓이가 $12\\,\\mathrm{cm}^2$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것을 구하시오.",
    "살아남는 짝이 둘도 안 된다",
  ],
  [
    // $2\times15=30$; 차가 $1$ 이상이면 넷 다 살아남아 아무것도 안 버린다.
    "108X",
    "두 대각선의 길이가 모두 자연수 $\\mathrm{cm}$이고 두 대각선의 길이의 차가 $1\\,\\mathrm{cm}$ 이상인 마름모 $ABCD$가 있다. 이 마름모의 넓이가 $15\\,\\mathrm{cm}^2$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것을 구하시오.",
    "버려지는 짝이 둘도 안 된다",
  ],
  [
    // $2\times12=24$, 차 $6$ 이상 → $(1,24),(2,12)$ 가 살고 최소 합이 $14=S+2$ 다.
    "108X",
    "두 대각선의 길이가 모두 자연수 $\\mathrm{cm}$이고 두 대각선의 길이의 차가 $6\\,\\mathrm{cm}$ 이상인 마름모 $ABCD$가 있다. 이 마름모의 넓이가 $12\\,\\mathrm{cm}^2$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것을 구하시오.",
    "발문 두 수의 한두 번 연산으로 답이 나온다",
  ],
];

describe("중2 확대 갈래 5차 (m2Top5b) — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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
    for (const t of ["105X", "106X", "107X", "108X"]) {
      expect(
        CALIBRATION.filter(([k]) => k === t).length,
        `${t} 양성 눈금`,
      ).toBeGreaterThan(0);
      expect(
        REJECTS.filter(([k]) => k === t).length,
        `${t} 음성 눈금`,
      ).toBeGreaterThan(3);
    }
  });
});

describe("중2 확대 갈래 5차 (m2Top5b) — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5B.length).toBe(4);
    expect(M2_TOP_5B.map((e) => e.rpmType)).toEqual([
      "105X",
      "106X",
      "107X",
      "108X",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5B) {
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
    for (const e of M2_TOP_5B) {
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

  it("🔴 `107X` 의 중단원 이름에 **가는 공백 U+2009** 가 실제로 들어 있다", () => {
    // 보통 공백 둘로 치면 눈으로는 같고 조회만 조용히 빗나간다 — 그 자리를 못 박는다.
    expect(E107.rpmMinor.includes("\u2009")).toBe(true);
    expect(E107.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑴");
  });

  it("네 유형이 어느 책·중단원·소단원에 붙는지 못 박는다", () => {
    expect(
      M2_TOP_5B.map((e) => [e.rpmType, e.rpmBook, e.rpmMinor, e.unitSection]),
    ).toEqual([
      ["105X", "2-2", "삼각형의 외심과 내심", "삼각형의 외심"],
      [
        "106X",
        "2-1",
        "일차부등식의 활용",
        "일차부등식의 활용(속력, 도형, 기타)",
      ],
      ["107X", "2-1", "일차함수와 그 그래프\u2009 ⑴", "함수와 함숫값"],
      ["108X", "2-2", "여러 가지 사각형", "직사각형, 마름모, 정사각형"],
    ]);
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_5B) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && !M2_TOP_5B.includes(t),
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
    const foreign = registeredTypes().filter((e) => !M2_TOP_5B.includes(e));
    for (const e of M2_TOP_5B) {
      expect(
        foreign.some((f) => f.key === e.key),
        `${e.key} 가 남의 모듈과 겹친다`,
      ).toBe(false);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5B) {
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

describe("중2 확대 갈래 5차 (m2Top5b) — 지면과 값", () => {
  for (const e of M2_TOP_5B) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      // ⚠️ 표본은 **`it` 안에서** 만든다. `describe` 몸통에서 만들면 생성기가 던졌을 때
      //    **수집 단계가 죽어** 어느 검사가 물었는지를 못 대게 된다(2026-08-23).
      let cached: MidProblem[] | null = null;
      const sample = (): MidProblem[] => (cached ??= rows(e));

      // 🔴 **표본을 여기서만 `WIDE` 로 넓힌다.** 변이 시험이 「정삼각형 제외」 가드를
      //    꺼도 초록이라고 했는데, 그것은 그 가드가 장식이어서가 아니라 **240판이
      //    그 자리를 안 건드려서**였다 — 전수 12,288 중 정삼각형 조합은 $1:1:1$
      //    **하나**(물음 셋을 세면 3)뿐이다. 800판으로 넓히자 빨개졌다.
      //    (2026-09-04 「변이가 초록이면 표본부터 의심하라」와 같은 자리.)
      it(`지면을 다시 풀면 같은 답이 나온다 (표본 ${WIDE})`, () => {
        for (const p of rows(e, WIDE)) {
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

      it("🔴 ㉱ 발문이 「전체를 $1$로 놓고」류 **상한을 선언하지 않는다**", () => {
        // 4차 `37W` 는 상한을 선언해 파생 오답의 51.7% 가 그 상한을 넘었다.
        // 넷 다 «선언하지 않는다» 는 것을 공용 함수로 확인한다 — 그러면 그 결함이
        // 이 넷에서 **구조적으로 못 난다**(안 본 것이 아니다).
        let seen = 0;
        for (const p of rows(e, WIDE)) {
          expect(declaredUpperBound(p.content), p.content).toBeNull();
          seen += 1;
        }
        expect(seen).toBe(WIDE);
        // 자가 살아 있는가 — 상한을 선언한 글에는 `1` 을 낸다.
        expect(declaredUpperBound("전체 일의 양을 $1$로 놓고 구하시오.")).toBe(
          1,
        );
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let claims = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.solution).toEqual([]);
          claims += arithmeticClaims(p.solution);
        }
        // 문항마다 **적어도 둘**은 봐야 한다 — 0 은 «깨끗»과 «못 셈»을 안 가른다.
        expect(claims, `${e.rpmType} 산술 등식`).toBeGreaterThanOrEqual(
          SAMPLE * 2,
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
        // `105X` 는 분수를 아예 안 쓴다 — 그 «0» 은 «못 셈»이 아니라 «잴 것이 없다» 다.
        if (e.rpmType === "105X") expect(seen).toBe(0);
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
          // ⚠️ 결론을 마지막 줄로 못 박으면 안 된다 — 그러면 「확인 줄을 뒤에 둔다」와
          //    「앞에 둔다」 가운데 하나를 강요하게 된다. `106X` 는 두 끝 확인과 죽는
          //    후보를 **결론 앞**에 두고(그 순서가 논증에 맞다), 나머지 셋은 결론
          //    **뒤**에 확인 줄을 하나 둔다. 둘 다 받되 결론이 너무 앞에 오는 것은 막는다.
          expect(
            lines.length - conclusion,
            `${e.rpmType} 결론이 너무 앞에 있다`,
          ).toBeLessThanOrEqual(2);
          // 🔴 그리고 **어느 쪽이든 «확인하는 줄»이 있어야** 한다 — 그 줄이 없으면
          //    지면이 자기가 세운 제약을 지키는지 아무도 안 본다(㉴).
          expect(p.solution, `${e.rpmType} 확인하는 줄이 없다`).toMatch(
            /실제로|이때|이므로 둘 다|만들어지지 않는다/,
          );
          const middle = lines.slice(1, conclusion);
          expect(middle.join("\n"), `${e.rpmType} 중간 결과가 없다`).toMatch(
            /\$/,
          );
          expect(
            middle.length,
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
        // 리드가 준 바닥을 크게 넘어야 한다 (적재가 그만큼 서로 다른 벌을 요구한다).
        expect(
          contents.size,
          `${e.rpmType} 서로 다른 발문 (바닥 ${VARIANT_FLOOR[e.rpmType]})`,
        ).toBeGreaterThan(VARIANT_FLOOR[e.rpmType]! * 10);
        expect(solutions.size, `${e.rpmType} 서로 다른 해설`).toBe(
          contents.size,
        );
        expect(answers.size, `${e.rpmType} 서로 다른 정답`).toBeGreaterThan(15);
        const top = Math.max(...answers.values()) / wide.length;
        // ㉴ 3차의 `52V` 는 최빈 정답이 51.2% 였다. 여기는 넷 다 9% 아래다(실측).
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
  if (rpmType === "105X") return `$${facts.x}^\\circ$`;
  if (rpmType === "106X") return `$${facts.x}$개`;
  if (rpmType === "107X") return `$${facts.x}$`;
  if (rpmType === "108X") return `$${facts.x}\\,\\mathrm{cm}$`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값**과 **말** — 앞 물결의 치명 결함이 난 자리
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 (m2Top5b) — 🔴 해설의 중간값을 다른 길로 다시 잰다", () => {
  it("`105X` — 비례상수·세 각·밑각·중심각·확인 줄을 **전부** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E105, 120)) {
      const [pT, qT, rT, askT] = grab(
        /\$\\angle OAB : \\angle OBC : \\angle OCA = (\d+) : (\d+) : (\d+)\$일 때, \$\\angle (BOC|COA|AOB)\$/,
        p.content,
        "105X 발문",
      );
      const pp = num(pT);
      const qq = num(qT);
      const rr = num(rT);
      const t = trianglesWithRatio(pp, qq, rr)[0]!;
      const s = pp + qq + rr;
      const k = 90 / s;

      // ⑴ 비례상수 줄 — 계수 나열이 발문의 비와 같은가(계수 $1$ 은 숫자를 안 적는다).
      const l1 = lineWith(p.solution, "인 양수 $k$가 있다", "105X ⑴");
      const coefs = [...l1.matchAll(/\\angle O[ABC]{2}=(\d*)k\^\\circ/g)].map(
        (m) => (m[1] === "" ? 1 : Number(m[1])),
      );
      expect(coefs).toEqual([pp, qq, rr]);

      // ⑵ 비례상수 값 줄 — 합·나눗셈·$k$ 가 서로 맞는가.
      const l2 = lineWith(p.solution, "나누면 $k=", "105X ⑵");
      const [sumT, s2T, kT] = grab(
        /즉 \$(\d+)k=90\$이다\. \$90\$[을를] \$(\d+)\$[으]?로 나누면 \$k=(\d+)\$이다\./,
        l2,
        "105X 비례상수",
      );
      expect(num(sumT)).toBe(s);
      expect(num(s2T)).toBe(s);
      expect(num(kT)).toBe(k);
      expect(num(s2T) * num(kT)).toBe(90);

      // ⑶ 세 각 줄 — 세 값이 비와 맞고 그 합이 정말 $90$ 인가.
      const l3 = lineWith(p.solution, "이 세 각의 크기의 합은", "105X ⑶");
      const [aT, bT, cT, listT] = grab(
        /그러므로 \$\\angle OAB=(\d+)\^\\circ\$, \$\\angle OBC=(\d+)\^\\circ\$, \$\\angle OCA=(\d+)\^\\circ\$이고, 이 세 각의 크기의 합은 \$([\d+]+)=90\$이므로/,
        l3,
        "105X 세 각",
      );
      expect([num(aT), num(bT), num(cT)]).toEqual([t.oab, t.obc, t.oca]);
      expect(listT!.split("+").map(Number)).toEqual([t.oab, t.obc, t.oca]);
      expect(num(aT) + num(bT) + num(cT)).toBe(90);

      // ⑷ 중심각 줄 — 이등변삼각형 이름·밑각·뺄셈이 서로 맞는가.
      const l4 = lineWith(p.solution, "인 이등변삼각형이고", "105X ⑷");
      const [triT, o1T, o2T, baseNameT, baseT, ask2T, base2T, ansT] = grab(
        // ⚠️ 중심각 이름은 **가운데가 $O$** 다(`BOC`·`COA`·`AOB`) — `[ABC]{3}` 으로
        //    적으면 한 판도 안 걸린다(첫 판이 그래서 통째로 못 읽었다).
        /\$\\triangle (O[ABC]{2})\$는 \$\\overline\{O([ABC])\}=\\overline\{O([ABC])\}\$인 이등변삼각형이고 두 밑각의 크기가 \$\\angle (O[ABC]{2})=(\d+)\^\\circ\$로 같으므로, \$\\angle ([ABC]O[ABC])=180\^\\circ-2\\times(\d+)\^\\circ=(\d+)\^\\circ\$이다\./,
        l4,
        "105X 중심각",
      );
      // 삼각형 이름이 물음의 두 끝과 짝이 맞는가 — 첫 판이 $\triangle OOC$ 를 냈다.
      expect(triT).toBe(`O${askT![0]}${askT![2]}`);
      expect(o1T).toBe(askT![0]);
      expect(o2T).toBe(askT![2]);
      expect(ask2T).toBe(askT);
      expect(num(baseT)).toBe(num(base2T));
      // 밑각의 «이름»이 그 값과 정말 짝이 맞는가.
      const byName: Record<string, number> = {
        OAB: t.oab,
        OBC: t.obc,
        OCA: t.oca,
      };
      expect(byName[baseNameT!]).toBe(num(baseT));
      expect(180 - 2 * num(baseT)).toBe(num(ansT));
      expect(plainAnswer(p.answer)).toBe(`${num(ansT)}^\\circ`);

      // ⑸ 확인 줄 — 꼭짓점 각이 두 각의 합이고 그 두 배가 답인가.
      const l5 = lineWith(p.solution, "가 성립한다", "105X ⑸");
      const [vT, n1T, n2T, v1T, v2T, sumVT, dblT, ans2T, ask3T, v2nT] = grab(
        /이때 \$\\angle ([ABC])=\\angle (O[ABC]{2})\+\\angle (O[ABC]{2})=(\d+)\^\\circ\+(\d+)\^\\circ=(\d+)\^\\circ\$이고 \$2\\times(\d+)=(\d+)\$[은는] 위에서 구한 값과 같으므로, \$\\angle ([ABC]O[ABC])=2\\angle ([ABC])\$가 성립한다\./,
        l5,
        "105X 확인",
      );
      expect(vT).toBe(CENTER_TO_VERTEX[askT!]);
      expect(v2nT).toBe(vT);
      expect(ask3T).toBe(askT);
      expect(num(v1T) + num(v2T)).toBe(num(sumVT));
      expect(num(sumVT)).toBe(num(dblT));
      expect(2 * num(dblT)).toBe(num(ans2T));
      expect(num(ans2T)).toBe(num(ansT));
      // 이름 ↔ 값 짝 — 「$\angle B=\angle OBC+\angle OBA$ 인데 값은 $\angle OAB$ 부터」를 막는다.
      // $\angle OBA=\angle OAB$ 처럼 **뒤집힌 이름**도 같은 값이므로 둘 다 본다.
      const angleValue = (name: string): number => {
        const flipped = `O${name[2]}${name[1]}`;
        const v = byName[name] ?? byName[flipped];
        if (v === undefined) throw new Error(`105X: 모르는 각 이름 ${name}`);
        return v;
      };
      expect(angleValue(n1T!)).toBe(num(v1T));
      expect(angleValue(n2T!)).toBe(num(v2T));
      // 꼭짓점 각이 정말 삼각형의 그 내각인가(독립 검산과 맞대기).
      expect(num(sumVT)).toBe(vT === "A" ? t.A : vT === "B" ? t.B : t.C);
      checked += 1;
    }
    expect(checked).toBe(120);
  });

  it("`106X` — 두 경계 걸음·개수 산술·두 끝 확인·죽는 후보를 **넷 다** 맞댄다", () => {
    let checked = 0;
    let boundsSeen = 0;
    for (const p of rows(E106, 120)) {
      const [lT, mT] = grab(
        /길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 끈을 .*밑변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$ 이상일 때/,
        p.content,
        "106X 발문",
      );
      const L = num(lT);
      const m = num(mT);
      const xs = isoscelesXs(L, m);
      const lo = xs[0]!;
      const hi = xs[xs.length - 1]!;

      // ⑴⑵ 두 경계 줄 — **분수 경계에서 정수로 뛰는 걸음**(㉯).
      const up = p.solution
        .split("\n")
        .find((l) => /\$\d+x\\le\d+\$이다\./.test(l))!;
      const down = p.solution
        .split("\n")
        .find((l) => /\$\d+x>\d+\$이다\./.test(l))!;
      const upV = fractionBoundFault(
        up,
        /\$(\d+)x\\le(\d+)\$이다\./,
        "upper",
        /\$x\\le(\d+)\$이다\./,
        "x",
      );
      const downV = fractionBoundFault(
        down,
        /\$(\d+)x>(\d+)\$이다\./,
        "lower",
        /\$x\\ge(\d+)\$이다\./,
        "x",
      );
      expect(
        upV.seen && downV.seen,
        `106X 경계 줄을 못 읽었다: ${p.solution}`,
      ).toBe(true);
      expect(upV.fault, up).toBeNull();
      expect(downV.fault, down).toBeNull();
      boundsSeen += 2;
      expect(num(grab(/\$x\\le(\d+)\$이다\./, up, "106X 위끝")[0])).toBe(hi);
      expect(num(grab(/\$x\\ge(\d+)\$이다\./, down, "106X 아래끝")[0])).toBe(
        lo,
      );

      // ⑶ 개수 줄 — 범위 ↔ 개수 산술이 맞는가.
      const l3 = lineWith(p.solution, "그 개수는", "106X 개수");
      const [loT, hiT, hi2T, lo2T, nT] = grab(
        /\$x\$는 \$(\d+)\$부터 \$(\d+)\$까지의 자연수이고, 그 개수는 \$(\d+)-(\d+)\+1=(\d+)\$이다\./,
        l3,
        "106X 개수",
      );
      expect([num(loT), num(hiT)]).toEqual([lo, hi]);
      expect([num(hi2T), num(lo2T)]).toEqual([hi, lo]);
      expect(num(nT)).toBe(xs.length);
      expect(plainAnswer(p.answer)).toBe(`${xs.length}개`);

      // ⑷ 두 끝 확인 줄 — 밑변이 정말 $m$ 이상인가(㉴ 스스로 세운 제약을 지키는가).
      const l4 = lineWith(p.solution, "둘 다", "106X 두 끝");
      const [x1, b1, x2, b2, mT2] = grab(
        /\$x=(\d+)\$일 때 밑변의 길이는 \$\d+-2\\times\d+=(\d+)\$에서 \$\d+\\,\\mathrm\{cm\}\$이고, \$x=(\d+)\$일 때 밑변의 길이는 \$\d+-2\\times\d+=(\d+)\$에서 \$\d+\\,\\mathrm\{cm\}\$이므로 둘 다 \$(\d+)\\,\\mathrm\{cm\}\$ 이상이다\./,
        l4,
        "106X 두 끝",
      );
      expect(num(x1)).toBe(lo);
      expect(num(x2)).toBe(hi);
      expect(num(b1)).toBe(L - 2 * lo);
      expect(num(b2)).toBe(L - 2 * hi);
      expect(num(mT2)).toBe(m);
      expect(num(b1)).toBeGreaterThanOrEqual(m);
      expect(num(b2)).toBeGreaterThanOrEqual(m);

      // ⑸ 죽는 후보 줄 — 왜 죽는지 값으로 확인한다(D-116 ⑹).
      const l5 = lineWith(
        p.solution,
        "삼각형이 만들어지지 않는다",
        "106X 죽음",
      );
      const [dxT, dbT, dtT] = grab(
        /\$x=(\d+)\$[이가] 되면 밑변의 길이가 \$\d+-2\\times\d+=(\d+)\$에서 \$\d+\\,\\mathrm\{cm\}\$가 되어 나머지 두 변의 길이의 합 \$(\d+)\\,\\mathrm\{cm\}\$보다 크므로 삼각형이 만들어지지 않는다\./,
        l5,
        "106X 죽음",
      );
      expect(num(dxT)).toBe(lo - 1);
      expect(num(dbT)).toBe(L - 2 * (lo - 1));
      expect(num(dtT)).toBe(2 * (lo - 1));
      // 「크다」는 낱말이 아니라 **값**으로 확인한다.
      expect(num(dbT)).toBeGreaterThan(num(dtT));
      expect(isTriangle(lo - 1, lo - 1, L - 2 * (lo - 1))).toBe(false);
      checked += 1;
    }
    expect(checked).toBe(120);
    expect(boundsSeen).toBe(240);
  });

  it("`107X` — 경계 걸음·후보 나열·값 나열·합·확인을 **다섯 다** 맞댄다", () => {
    let checked = 0;
    let boundsSeen = 0;
    for (const p of rows(E107, 120)) {
      const [mT, kT, nT] = grab(
        /\$f\((\d+)\)=(\d+)\$이다\. 이때 \$f\((-?\d+)\)\$/,
        p.content,
        "107X 발문",
      );
      const m = num(mT);
      const k = num(kT);
      const n = num(nT);
      const pairs = naturalPairs(m, k);
      const values = pairs.map(([a, b]) => n * a + b);
      const total = values.reduce((s, v) => s + v, 0);

      // ⑴ 경계 줄 — 분수 경계에서 정수로 뛰는 걸음(㉯).
      const bound = p.solution
        .split("\n")
        .find((l) => /\$\d+a\\le\d+\$이다\./.test(l))!;
      const bv = fractionBoundFault(
        bound,
        /\$(\d+)a\\le(\d+)\$이다\./,
        "upper",
        /의 \$(\d+)\$개이다\./,
        "a",
      );
      expect(bv.seen, `107X 경계 줄을 못 읽었다: ${p.solution}`).toBe(true);
      expect(bv.fault, bound).toBeNull();
      boundsSeen += 1;
      const listed = [
        ...grab(
          /될 수 있는 값은 (.+?)의 \$\d+\$개이다\./,
          bound,
          "107X 후보",
        )[0]!.matchAll(/\$(\d+)\$/g),
      ].map((x) => num(x[1]));
      expect(listed).toEqual(pairs.map(([a]) => a));

      // ⑵ 죽는 후보 줄 — 왜 죽는지 값으로 확인한다.
      const l2 = lineWith(p.solution, "자연수가 아니므로", "107X 죽음");
      const [overT, k2T, m2T, over2T, bT, lastT] = grab(
        /\$a=(\d+)\$[이가] 되면 \$b=(\d+)-(\d+)\\times(\d+)=(-?\d+)\$[이가] 되어 자연수가 아니므로 \$a\$는 \$(\d+)\$보다 클 수 없다\./,
        l2,
        "107X 죽음",
      );
      expect(num(overT)).toBe(pairs.length + 1);
      expect(num(over2T)).toBe(num(overT));
      expect(num(k2T)).toBe(k);
      expect(num(m2T)).toBe(m);
      expect(num(bT)).toBe(k - m * num(overT));
      expect(num(bT)).toBeLessThan(1);
      expect(num(lastT)).toBe(pairs.length);

      // ⑶ $(a,b)$ 나열 줄 — 두 벌이 짝이 맞고 식을 만족하는가.
      const l3 = lineWith(p.solution, "는 차례로", "107X 짝");
      const got = [...l3.matchAll(/\$\((\d+),\\,(-?\d+)\)\$/g)].map((x) => [
        num(x[1]),
        num(x[2]),
      ]);
      expect(got).toEqual(pairs);
      for (const [a, b] of got) expect(m * a! + b!).toBe(k);

      // ⑷ 값 나열 줄 — $f(n)$ 값이 짝과 맞는가.
      const l4 = lineWith(p.solution, "의 값은 차례로", "107X 값");
      const gotV = [
        ...grab(/의 값은 차례로 (.+?)이다\./, l4, "107X 값")[0]!.matchAll(
          /\$(-?\d+)\$/g,
        ),
      ].map((x) => num(x[1]));
      expect(gotV).toEqual(values);
      for (let i = 0; i < pairs.length; i += 1)
        expect(n * pairs[i]![0] + pairs[i]![1]).toBe(gotV[i]);

      // ⑸ 합 줄 — 나열과 합이 서로 맞는가.
      const l5 = lineWith(p.solution, "그 합은", "107X 합");
      const [cntT, sumListT, totalT] = grab(
        /이 \$(\d+)\$개의 값은 모두 다르고, 그 합은 \$(-?\d+(?:[+-]\d+)*)=(-?\d+)\$이다\./,
        l5,
        "107X 합",
      );
      expect(num(cntT)).toBe(pairs.length);
      expect(num(totalT)).toBe(total);
      expect(evalChain(sumListT!)).toBe(total);
      expect(plainAnswer(p.answer)).toBe(String(total));

      // ⑹ 확인 줄 — 마지막 짝이 정말 발문의 조건을 만족하는가.
      const l6 = lineWith(p.solution, "처음에 주어진", "107X 확인");
      const [aT, bLastT, m3T, a2T, b2T, k3T] = grab(
        /실제로 \$a=(\d+)\$일 때 \$b=(\d+)\$이고 \$(\d+)\\times(\d+)\+(\d+)=(\d+)\$[은는] 처음에 주어진 \$f\(\d+\)\$의 값과 같다\./,
        l6,
        "107X 확인",
      );
      expect(num(aT)).toBe(pairs[pairs.length - 1]![0]);
      expect(num(bLastT)).toBe(pairs[pairs.length - 1]![1]);
      expect(num(m3T) * num(a2T) + num(b2T)).toBe(num(k3T));
      expect(num(k3T)).toBe(k);
      checked += 1;
    }
    expect(checked).toBe(120);
    expect(boundsSeen).toBe(120);
  });

  it("`108X` — 곱·짝 나열·차 나열·버림·합 나열·최솟값·확인을 **일곱 다** 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E108, 120)) {
      const [dT, sT] = grab(
        /차가 \$(\d+)\\,\\mathrm\{cm\}\$ 이상인 마름모 \$ABCD\$가 있다\. 이 마름모의 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^2\$일 때/,
        p.content,
        "108X 발문",
      );
      const D = num(dT);
      const S = num(sT);
      const P = 2 * S;
      const all = productPairs(P);
      const alive = all.filter(([a, b]) => b - a >= D);
      const dead = all.filter(([a, b]) => b - a < D);
      const minSum = Math.min(...alive.map(([a, b]) => a + b));

      // ⑴ 곱 줄 — 넓이의 두 배가 맞는가.
      const l1 = lineWith(p.solution, "의 약수이다", "108X 곱");
      const [s1T, pT] = grab(
        /\$p\\times q=2\\times(\d+)=(\d+)\$이고, \$p\$와 \$q\$가 모두 자연수이므로 \$p\$는 \$\d+\$의 약수이다\./,
        l1,
        "108X 곱",
      );
      expect(num(s1T)).toBe(S);
      expect(num(pT)).toBe(P);

      // ⑵ 짝 나열 줄 — 짝이 전부이고 $p<q$ 이며 곱이 맞는가(㉴).
      const l2 = lineWith(p.solution, "두 자연수의 곱으로", "108X 짝");
      const gotPairs = [...l2.matchAll(/\$\((\d+),\\,(\d+)\)\$/g)].map((x) => [
        num(x[1]),
        num(x[2]),
      ]);
      expect(gotPairs).toEqual(all);
      for (const [a, b] of gotPairs) {
        expect(a! * b!).toBe(P);
        expect(a!).toBeLessThan(b!);
      }
      expect(num(grab(/모두 \$(\d+)\$개이다\./, l2, "108X 짝 수")[0])).toBe(
        all.length,
      );

      // ⑶ 차 나열 줄 — 뺄셈이 맞는가.
      const l3 = lineWith(p.solution, "길이의 차는 차례로", "108X 차");
      const gaps = [...l3.matchAll(/\$(\d+)-(\d+)=(\d+)\$/g)].map((x) => [
        num(x[1]),
        num(x[2]),
        num(x[3]),
      ]);
      expect(gaps.map((g) => [g[1], g[0]])).toEqual(all);
      for (const g of gaps) expect(g[0]! - g[1]!).toBe(g[2]);

      // ⑷ 버림 줄 — 버린 것이 정말 조건에 안 맞고 남은 것이 정말 맞는가.
      const l4 = lineWith(p.solution, "조건에 맞지 않아 버리고", "108X 버림");
      const [deadT, aliveT] = grab(
        /차가 \$(?:\d+)\\,\\mathrm\{cm\}\$ 이상이어야 하므로 (.+?)[은는] 조건에 맞지 않아 버리고, 남는 것은 (.+?)이다\./,
        l4,
        "108X 버림",
      );
      const deadGot = [...deadT!.matchAll(/\$\((\d+),\\,(\d+)\)\$/g)].map(
        (x) => [num(x[1]), num(x[2])],
      );
      const aliveGot = [...aliveT!.matchAll(/\$\((\d+),\\,(\d+)\)\$/g)].map(
        (x) => [num(x[1]), num(x[2])],
      );
      expect(deadGot).toEqual(dead);
      expect(aliveGot).toEqual(alive);
      for (const [a, b] of deadGot) expect(b! - a!).toBeLessThan(D);
      for (const [a, b] of aliveGot) expect(b! - a!).toBeGreaterThanOrEqual(D);

      // ⑸ 합 나열 + 최솟값 줄 — 덧셈과 「가장 작은」이 참인가.
      const l5 = lineWith(p.solution, "그중 가장 작은 것은", "108X 합");
      const sums = [...l5.matchAll(/\$(\d+)\+(\d+)=(\d+)\$/g)].map((x) => [
        num(x[1]),
        num(x[2]),
        num(x[3]),
      ]);
      expect(sums.map((g) => [g[0], g[1]])).toEqual(alive);
      for (const g of sums) expect(g[0]! + g[1]!).toBe(g[2]);
      const [minT] = grab(
        /그중 가장 작은 것은 \$(\d+)\$이다\./,
        l5,
        "108X 최소",
      );
      expect(num(minT)).toBe(minSum);
      expect(Math.min(...sums.map((g) => g[2]!))).toBe(minSum);
      expect(plainAnswer(p.answer)).toBe(`${minSum}\\,\\mathrm{cm}`);

      // ⑹ 확인 줄 — 고른 짝이 두 조건을 정말 만족하는가.
      const l6 = lineWith(p.solution, "두 조건을 모두 만족한다", "108X 확인");
      const [bpT, bqT, bq2T, bp2T, gapT, d2T, bp3T, bq3T, s2T] = grab(
        /두 대각선의 길이는 \$(\d+)\\,\\mathrm\{cm\}\$, \$(\d+)\\,\\mathrm\{cm\}\$이고 \$(\d+)-(\d+)=(\d+)\$[은는] \$(\d+)\$ 이상이며, 넓이는 \$\\dfrac\{1\}\{2\}\\times(\d+)\\times(\d+)=(\d+)\$에서/,
        l6,
        "108X 확인",
      );
      expect([num(bpT), num(bqT)]).toEqual(
        alive[alive.findIndex(([a, b]) => a + b === minSum)],
      );
      expect(num(bq2T)).toBe(num(bqT));
      expect(num(bp2T)).toBe(num(bpT));
      expect(num(gapT)).toBe(num(bqT) - num(bpT));
      expect(num(gapT)).toBeGreaterThanOrEqual(num(d2T));
      expect(num(d2T)).toBe(D);
      expect(num(bp3T) * num(bq3T)).toBe(2 * num(s2T));
      expect(num(s2T)).toBe(S);
      checked += 1;
    }
    expect(checked).toBe(120);
  });
});

// ═══════════════════════════════════════════════════════════
// ㄴ. 해설에 나온 **모든 수**가 재계산으로 설명되는가
// ═══════════════════════════════════════════════════════════

function allowedNumbers(rpmType: string, content: string): Set<number> {
  const ok = new Set<number>([0, 1]);
  const add = (...vs: number[]): void => {
    for (const v of vs) {
      ok.add(v);
      ok.add(-v);
    }
  };
  if (rpmType === "105X") {
    const [pT, qT, rT] = grab(
      /\$\\angle OAB : \\angle OBC : \\angle OCA = (\d+) : (\d+) : (\d+)\$/,
      content,
      "105X 허용값",
    );
    const p = num(pT);
    const q = num(qT);
    const r = num(rT);
    const t = trianglesWithRatio(p, q, r)[0]!;
    add(2, 90, 180, p, q, r, p + q + r, 90 / (p + q + r));
    add(t.oab, t.obc, t.oca, t.A, t.B, t.C, 2 * t.A, 2 * t.B, 2 * t.C);
  } else if (rpmType === "106X") {
    const [lT, mT] = grab(
      /길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 끈을 .*밑변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$ 이상일 때/,
      content,
      "106X 허용값",
    );
    const L = num(lT);
    const m = num(mT);
    const xs = isoscelesXs(L, m);
    const lo = xs[0]!;
    const hi = xs[xs.length - 1]!;
    add(2, 4, L, m, L - m, xs.length, lo, hi, lo - 1);
    add(...reduceFraction(L - m, 2), ...reduceFraction(L, 4));
    add(L - 2 * lo, L - 2 * hi, L - 2 * (lo - 1), 2 * (lo - 1));
  } else if (rpmType === "107X") {
    const [mT, kT, nT] = grab(
      /\$f\((\d+)\)=(\d+)\$이다\. 이때 \$f\((-?\d+)\)\$/,
      content,
      "107X 허용값",
    );
    const m = num(mT);
    const k = num(kT);
    const n = num(nT);
    const pairs = naturalPairs(m, k);
    const values = pairs.map(([a, b]) => n * a + b);
    add(m, k, n, k - 1, pairs.length, pairs.length + 1);
    add(...reduceFraction(k - 1, m));
    add(...pairs.map(([a]) => a), ...pairs.map(([, b]) => b));
    add(
      ...values,
      values.reduce((s, v) => s + v, 0),
    );
    add(k - m * (pairs.length + 1), Math.abs(n), Math.abs(n - m));
  } else {
    const [dT, sT] = grab(
      /차가 \$(\d+)\\,\\mathrm\{cm\}\$ 이상인 마름모 \$ABCD\$가 있다\. 이 마름모의 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^2\$일 때/,
      content,
      "108X 허용값",
    );
    const D = num(dT);
    const S = num(sT);
    const P = 2 * S;
    const all = productPairs(P);
    add(2, D, S, P, all.length);
    add(...all.map(([a]) => a), ...all.map(([, b]) => b));
    add(...all.map(([a, b]) => b - a), ...all.map(([a, b]) => a + b));
  }
  return ok;
}

describe("중2 확대 갈래 5차 (m2Top5b) — 🔴 해설에 «설명되지 않는 수»가 없다", () => {
  for (const e of M2_TOP_5B) {
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

describe("중2 확대 갈래 5차 (m2Top5b) — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`105X` — 답이 발문 세 수의 한두 번 연산으로 나오지 않는다", () => {
    for (const p of rows(E105, 200)) {
      const { p: pp, q, r, x } = p.facts as Record<string, number>;
      for (const a of [pp!, q!, r!])
        for (const b of [pp!, q!, r!]) {
          expect(x, p.content).not.toBe(a + b);
          expect(x, p.content).not.toBe(a * b);
          expect(x, p.content).not.toBe(10 * (a + b));
        }
      expect(x, p.content).not.toBe(pp! + q! + r!);
      expect(x, p.content).not.toBe(pp! * q! * r!);
    }
  });

  it("`106X` — 답이 **개수**라 범위의 두 끝 어느 것도 답이 아니다", () => {
    const sizes = new Set<number>();
    let sameAsEnd = 0;
    for (const p of rows(E106, 200)) {
      sizes.add(p.facts.x!);
      if (p.facts.x === p.facts.lo || p.facts.x === p.facts.hi) sameAsEnd += 1;
    }
    expect(sizes.size).toBeGreaterThan(10);
    expect(sameAsEnd / 200).toBeLessThan(0.3);
  });

  it("`107X` — 후보가 **여럿 살아남고** 답은 그 합이라 한 자리를 집으면 틀린다", () => {
    for (const p of rows(E107, 200)) {
      const pairs = naturalPairs(p.facts.at!, p.facts.value!);
      const values = pairs.map(([a, b]) => p.facts.ask! * a + b);
      expect(values.length).toBeGreaterThanOrEqual(3);
      expect(values, p.content).not.toContain(p.facts.x);
      expect(values.length, p.content).not.toBe(p.facts.x);
    }
  });

  it("`108X` — 답이 «가장 가까운 두 수»의 합이 아니다 (버린 짝이 그보다 작다)", () => {
    for (const p of rows(E108, 200)) {
      // 차 조건을 안 보면 **더 작은** 합이 나온다 — 그것을 집으면 틀린다.
      expect(p.facts.deadMin, p.content).toBeLessThan(p.facts.x!);
      const all = productPairs(p.facts.product!);
      const nearest = Math.min(...all.map(([a, b]) => a + b));
      expect(nearest, p.content).not.toBe(p.facts.x);
    }
  });
});

describe("중2 확대 갈래 5차 (m2Top5b) — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`105X` — 「세 내각이 두 개씩 나뉜다」를 지우면 세 각이 두 배가 된다", () => {
    for (const p of rows(E105, 200)) {
      const truth = circumAngles(p.facts.p!, p.facts.q!, p.facts.r!)!;
      expect(truth).toEqual([p.facts.oab, p.facts.obc, p.facts.oca]);
      const erased = circumAngles(p.facts.p!, p.facts.q!, p.facts.r!, false)!;
      expect(erased, p.content).not.toEqual(truth);
      for (let i = 0; i < 3; i += 1) expect(erased[i]).toBe(2 * truth[i]!);
      // 그 값으로 중심각을 구하면 답이 달라진다.
      expect(180 - 2 * erased[1]!, p.content).not.toBe(180 - 2 * truth[1]!);
    }
  });

  it("`106X` — 「삼각형이 되려면」을 지우면 아래끝이 $1$ 로 풀려 개수가 늘어난다", () => {
    for (const p of rows(E106, 200)) {
      const tight = isoscelesRange(p.facts.len!, p.facts.base!)!;
      expect(tight).toEqual([p.facts.lo, p.facts.hi]);
      const loose = isoscelesRange(p.facts.len!, p.facts.base!, false)!;
      expect(loose[0]).toBe(1);
      expect(loose[1]).toBe(tight[1]);
      const tightN = tight[1] - tight[0] + 1;
      const looseN = loose[1] - loose[0] + 1;
      expect(tightN).toBe(p.facts.x);
      expect(looseN, p.content).toBeGreaterThan(tightN);
    }
  });

  it("`107X` — 「$b$도 자연수」를 지우면 $a$ 가 위로 안 닫힌다", () => {
    for (const p of rows(E107, 200)) {
      const tight = naturalSlopes(p.facts.at!, p.facts.value!);
      expect(tight.length).toBe(p.facts.cnt);
      const loose = naturalSlopes(p.facts.at!, p.facts.value!, false, 200);
      expect(loose.length, p.content).toBe(200);
      expect(loose.length, p.content).toBeGreaterThan(tight.length);
    }
  });

  it("`108X` — 「차가 $D$ 이상」을 지우면 살아남는 짝이 달라져 답이 작아진다", () => {
    for (const p of rows(E108, 120)) {
      const all = diagonalPairs(p.facts.product!);
      expect(all.length).toBe(p.facts.pairs);
      const alive = diagonalPairs(p.facts.product!, p.facts.gap!);
      expect(alive.length).toBe(p.facts.alive);
      const withGap = Math.min(...alive.map(([a, b]) => a + b));
      const without = Math.min(...all.map(([a, b]) => a + b));
      expect(withGap).toBe(p.facts.x);
      expect(without, p.content).toBeLessThan(withGap);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수 — 손으로 푼 값으로 눈금을 맞춘다
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 (m2Top5b) — 굳힘 함수", () => {
  it("`circumAngles` 는 비를 $90^\\circ$ 에 나눈다 (손 실측)", () => {
    // $4+3+8=15$, $90\div15=6$.
    expect(circumAngles(4, 3, 8)).toEqual([24, 18, 48]);
    // 「두 개씩 나뉜다」를 지우면 $180$ 에 나눠 두 배가 된다.
    expect(circumAngles(4, 3, 8, false)).toEqual([48, 36, 96]);
    // $90$ 이 비의 합으로 안 나뉘면 정수 각이 없다.
    expect(circumAngles(1, 1, 2)).toBeNull();
    expect(circumAngles(0, 1, 2)).toBeNull();
  });

  it("`isoscelesRange` 는 두 경계를 실제로 낸다 (손 실측)", () => {
    // $122/4=30.5$ → $x\ge31$, $(122-21)/2=50.5$ → $x\le50$.
    expect(isoscelesRange(122, 21)).toEqual([31, 50]);
    // 삼각형 조건을 지우면 아래끝이 $1$ 이 된다.
    expect(isoscelesRange(122, 21, false)).toEqual([1, 50]);
    // 범위가 비면 `null`.
    expect(isoscelesRange(31, 26)).toBeNull();
  });

  it("`naturalSlopes` 는 $b$ 가 자연수인 $a$ 만 낸다 (손 실측)", () => {
    // $4a+b=18$, $b\ge1$ → $a=1,2,3,4$.
    expect(naturalSlopes(4, 18)).toEqual([1, 2, 3, 4]);
    // 조건을 늦추면 위로 안 닫힌다 — `limit` 까지 그대로 나온다.
    expect(naturalSlopes(4, 18, false, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("`diagonalPairs` 는 $p<q$ 인 약수 짝을 전부 낸다 (손 실측)", () => {
    expect(diagonalPairs(162)).toEqual([
      [1, 162],
      [2, 81],
      [3, 54],
      [6, 27],
      [9, 18],
    ]);
    // 차 조건을 걸면 꼬리가 잘린다.
    expect(diagonalPairs(162, 43)).toEqual([
      [1, 162],
      [2, 81],
      [3, 54],
    ]);
    // 제곱수면 $p=q$ 짝은 애초에 안 나온다(그래서 「모두」가 거짓이 된다).
    expect(diagonalPairs(36)).toEqual([
      [1, 36],
      [2, 18],
      [3, 12],
      [4, 9],
    ]);
  });

  it("`reduceFraction` 은 늘 기약이고 분모가 양수다", () => {
    expect(reduceFraction(122, 4)).toEqual([61, 2]);
    expect(reduceFraction(101, 2)).toEqual([101, 2]);
    expect(reduceFraction(3, -6)).toEqual([-1, 2]);
  });
});

// ═══════════════════════════════════════════════════════════
// 이 파일의 자가 «아니오» 를 낼 수 있는가 — 검사기의 눈금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 (m2Top5b) — 검사기 자신의 눈금", () => {
  it("🔴 `stripDegrees` 가 없으면 산술 자가 **한 건도 못 본다**", () => {
    const line = "$\\angle BOC=180^\\circ-2\\times27^\\circ=126^\\circ$이다.";
    expect(arithmeticClaims(line)).toBe(1);
    expect(arithmeticFaults(line)).toEqual([]);
    // 각도 표시를 안 걷으면 이 자의 분모가 통째로 0 이 된다 — 그 사실을 못 박는다.
    expect([...line.matchAll(CHAIN_EQ)]).toHaveLength(0);
  });

  it("`arithmeticFaults` 는 틀린 등식을 잡고 맞는 등식을 안 잡는다", () => {
    expect(arithmeticFaults("합은 $24+18+48=90$이다.")).toEqual([]);
    expect(arithmeticFaults("합은 $24+18+48=91$이다.")).toHaveLength(1);
    expect(arithmeticFaults("개수는 $50-31+1=20$이다.")).toEqual([]);
    expect(arithmeticFaults("개수는 $50-31+1=19$이다.")).toHaveLength(1);
    expect(
      arithmeticFaults(
        "$\\angle BOC=180^\\circ-2\\times27^\\circ=127^\\circ$이다.",
      ),
    ).toHaveLength(1);
    // 문자가 섞인 식은 이 자의 몫이 아니다 — 조용히 통과시키지 않고 **안 센다**.
    expect(arithmeticClaims("$4k+3k+8k=90$이다.")).toBe(0);
    expect(arithmeticClaims("합은 $24+18+48=90$이다.")).toBe(1);
  });

  it("`unreducedFractions` 는 약분 안 한 분수를 잡는다", () => {
    expect(unreducedFractions("$\\dfrac{101}{2}$")).toEqual([]);
    expect(unreducedFractions("$\\dfrac{122}{4}$")).toEqual(["122/4"]);
    expect(unreducedFractions("$\\dfrac{8}{6}+\\dfrac{4}{2}$")).toHaveLength(2);
  });

  it("🔴 `fractionBoundFault` — 분수 경계에서 「자연수」 걸음을 건너뛰면 잡는다", () => {
    const good =
      "즉 $2x\\le101$이다. $101$을 $2$로 나누면 $\\dfrac{101}{2}$이므로 $x\\le\\dfrac{101}{2}$이고, $x$는 자연수이므로 $x\\le50$이다.";
    const claim = /\$(\d+)x\\le(\d+)\$이다\./;
    const fin = /\$x\\le(\d+)\$이다\./;
    expect(fractionBoundFault(good, claim, "upper", fin, "x")).toEqual({
      fault: null,
      seen: true,
    });
    // 분수를 안 적고 정수로 뛰었다 — 쓴 대로 읽으면 거짓 함의다.
    expect(
      fractionBoundFault(
        "즉 $2x\\le101$이다. $x$는 자연수이므로 $x\\le50$이다.",
        claim,
        "upper",
        fin,
        "x",
      ).fault,
    ).not.toBeNull();
    // 「자연수」 걸음이 없다.
    expect(
      fractionBoundFault(
        "즉 $2x\\le101$이다. $\\dfrac{101}{2}$이므로 $x\\le50$이다.",
        claim,
        "upper",
        fin,
        "x",
      ).fault,
    ).not.toBeNull();
    // 내림을 잘못했다.
    expect(
      fractionBoundFault(
        good.replace("$x\\le50$이다", "$x\\le51$이다"),
        claim,
        "upper",
        fin,
        "x",
      ).fault,
    ).not.toBeNull();
    // 경계가 정수면 걸음이 잴 것이 없다.
    expect(
      fractionBoundFault(
        "즉 $2x\\le100$이다. $x$는 자연수이므로 $x\\le50$이다.",
        claim,
        "upper",
        fin,
        "x",
      ).fault,
    ).not.toBeNull();
    // 이 자가 볼 것이 없는 줄에서는 **판정하지 않는다**(0 을 «깨끗»으로 읽지 않게).
    expect(
      fractionBoundFault("$x\\le50$이다.", claim, "upper", fin, "x"),
    ).toEqual({ fault: null, seen: false });
    // 아래끝(엄격 부등호)도 같은 자가 본다.
    const low =
      "즉 $4x>122$이다. $122$를 $4$로 나누면 $\\dfrac{61}{2}$이므로 $x>\\dfrac{61}{2}$이고, $x$는 자연수이므로 $x\\ge31$이다.";
    expect(
      fractionBoundFault(
        low,
        /\$(\d+)x>(\d+)\$이다\./,
        "lower",
        /\$x\\ge(\d+)\$이다\./,
        "x",
      ),
    ).toEqual({ fault: null, seen: true });
    expect(
      fractionBoundFault(
        low.replace("$x\\ge31$이다", "$x\\ge30$이다"),
        /\$(\d+)x>(\d+)\$이다\./,
        "lower",
        /\$x\\ge(\d+)\$이다\./,
        "x",
      ).fault,
    ).not.toBeNull();
  });

  it("`trianglesWithRatio` 는 비가 맞는 삼각형을 실제로 찾고, 없으면 빈 배열을 낸다", () => {
    expect(trianglesWithRatio(4, 3, 8)).toEqual([
      { oab: 24, obc: 18, oca: 48, A: 72, B: 42, C: 66 },
    ]);
    expect(trianglesWithRatio(1, 1, 2)).toEqual([]);
    // 「모두」의 반증 시도 — 비가 굳으면 언제나 하나뿐이다.
    expect(trianglesWithRatio(1, 1, 1)).toHaveLength(1);
  });

  it("`isTriangle` 은 **세 쌍 모두** 본다 (한 쌍만 보면 새는 자리가 있다)", () => {
    expect(isTriangle(31, 31, 60)).toBe(true);
    expect(isTriangle(30, 30, 62)).toBe(false);
    // 한 쌍만 보면 통과하는 자리 — $a+b>c$ 만 보면 참이 된다.
    expect(isTriangle(1, 10, 10)).toBe(true);
    expect(isTriangle(1, 2, 10)).toBe(false);
  });

  it("`productPairs` 는 곱을 **곱해서** 확인한다", () => {
    expect(productPairs(24)).toEqual([
      [1, 24],
      [2, 12],
      [3, 8],
      [4, 6],
    ]);
    expect(productPairs(36)).toEqual([
      [1, 36],
      [2, 18],
      [3, 12],
      [4, 9],
    ]);
  });

  it("`naturalPairs` 는 두 겹으로 훑어 자연수 쌍만 낸다", () => {
    expect(naturalPairs(4, 18)).toEqual([
      [1, 14],
      [2, 10],
      [3, 6],
      [4, 2],
    ]);
    expect(naturalPairs(4, 5)).toEqual([[1, 1]]);
  });
});

// ═══════════════════════════════════════════════════════════
// 🔴 ㉳ 해설의 «말» — **「왜 그런가」를 진술하는 줄**을 지키는 자
//
// 4차 검문: 「$-a$가 $b$의 **약수**여야 한다」를 「배수」로 바꿔도 92개 시험이
// 전부 초록이었다. 값도 KaTeX 도 그대로다 — 이 부류는 여기서 안 물면 아무 데서도
// 안 물린다.
// ═══════════════════════════════════════════════════════════

/** 굳힘과 마무리 논거를 진술하는 문장. 값이 아니라 **문장 모양**을 본다. */
const WORDS: Record<string, readonly string[]> = {
  "105X": [
    "모두 이등변삼각형이다",
    "두 밑각의 크기는 같으므로",
    "세 내각이 이 여섯 각으로 두 개씩 나뉘므로",
    "인 이등변삼각형이고 두 밑각의 크기가",
  ],
  "106X": [
    "밑변의 길이가",
    "이상이어야 하므로",
    "두 변의 길이의 합이 나머지 한 변의 길이보다 커야 하므로",
    "는 자연수이므로",
    "삼각형이 만들어지지 않는다",
  ],
  "107X": [
    "$b$가 자연수이므로",
    "도 자연수이므로",
    "되어 자연수가 아니므로",
    "의 값이 서로 다르면",
    "모두 다르고",
  ],
  "108X": [
    "두 대각선의 길이의 곱의 반이므로",
    "모두 자연수이므로",
    "의 약수이다",
    "이상이어야 하므로",
    "조건에 맞지 않아 버리고",
    "그중 가장 작은 것은",
  ],
};

/** 참인 문장을 거짓으로 만드는 맞바꿈 — 눈금의 양성 대조. */
const FLIPS: Record<string, readonly (readonly [string, string])[]> = {
  "105X": [
    ["모두 이등변삼각형이다", "모두 정삼각형이다"],
    ["두 밑각의 크기는 같으므로", "두 밑각의 크기는 다르므로"],
    ["여섯 각으로 두 개씩 나뉘므로", "여섯 각으로 세 개씩 나뉘므로"],
  ],
  "106X": [
    [
      "나머지 한 변의 길이보다 커야 하므로",
      "나머지 한 변의 길이보다 작아야 하므로",
    ],
    ["이상이어야 하므로", "이하여야 하므로"],
    ["는 자연수이므로", "는 정수이므로"],
  ],
  "107X": [
    ["$b$가 자연수이므로", "$b$가 정수이므로"],
    ["되어 자연수가 아니므로", "되어 자연수이므로"],
    ["모두 다르고", "모두 같고"],
  ],
  "108X": [
    ["두 대각선의 길이의 곱의 반이므로", "두 대각선의 길이의 곱이므로"],
    ["의 약수이다", "의 배수이다"],
    ["그중 가장 작은 것은", "그중 가장 큰 것은"],
  ],
};

function missingWords(rpmType: string, solution: string): string[] {
  return (WORDS[rpmType] ?? []).filter((w) => !solution.includes(w));
}

describe("[중2 5차 물결 m2Top5b] ㉳ 해설의 «말»이 «왜 그런가»를 옳게 진술한다", () => {
  it("네 유형 800판 전량에 그 줄들이 있다", () => {
    for (const e of M2_TOP_5B) {
      let seen = 0;
      for (const p of rows(e, WIDE)) {
        expect(missingWords(e.rpmType, p.solution), e.rpmType).toEqual([]);
        seen += 1;
      }
      expect(seen).toBe(WIDE);
      expect(
        WORDS[e.rpmType]!.length,
        `${e.rpmType} 지키는 말`,
      ).toBeGreaterThan(3);
    }
  });

  it("🔴 눈금 — 낱말을 뒤집으면 **전부** 빨개진다 (양성 12)", () => {
    let positives = 0;
    for (const e of M2_TOP_5B) {
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
    expect(positives).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차 (m2Top5b) — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `105X` 의 이등변삼각형 이름이 $\\triangle OOC$ 가 아니다", () => {
    // 첫 판이 물음 이름을 `slice(1)` 로 잘라 $\triangle OOC$ 를 냈다.
    for (const p of rows(E105, 200)) {
      expect(p.solution, "삼각형 이름에 $OO$ 가 들어갔다").not.toMatch(
        /\\triangle OO/,
      );
      expect(p.solution).not.toMatch(/\\overline\{OO\}/);
    }
  });

  it("⑵ 🔴 `105X` 의 확인 줄에서 «각 이름»과 «값»의 짝이 맞는다", () => {
    // 첫 판이 $\angle B=\angle OBC+\angle OBA$ 라 적고 값은 $\angle OAB$ 부터 냈다.
    for (const p of rows(E105, 200)) {
      const l = lineWith(p.solution, "가 성립한다", "105X 확인");
      const [n1, n2, v1, v2] = grab(
        /=\\angle (O[ABC]{2})\+\\angle (O[ABC]{2})=(\d+)\^\\circ\+(\d+)\^\\circ=/,
        l,
        "105X 확인 짝",
      );
      const byName: Record<string, number> = {
        OAB: p.facts.oab!,
        OBC: p.facts.obc!,
        OCA: p.facts.oca!,
      };
      const val = (name: string): number =>
        byName[name] ?? byName[`O${name[2]}${name[1]}`]!;
      expect(val(n1!)).toBe(num(v1));
      expect(val(n2!)).toBe(num(v2));
    }
  });

  it("⑶ 🔴 정답에 「가지」를 붙이지 않는다 — 공용 조사 자가 단위 명사를 조사로 읽는다", () => {
    // `$6$가지` 는 「$6$」이 받침으로 끝나 「이」를 써야 하므로 거짓 경보가 난다.
    for (const p of rows(E106, 60)) {
      expect(p.answer).toMatch(/^\$\d+\$개$/);
      expect(p.answer).not.toContain("가지");
      expect(josaMismatches(p.answer)).toEqual([]);
    }
  });

  it("⑷ 🔴 `107X` 는 $n=0$ 을 안 낸다 — `0a` 가 지면에 나가면 냄새 자가 문다", () => {
    for (const p of rows(E107, 200)) {
      expect(p.facts.ask, p.content).not.toBe(0);
      expect(p.solution).not.toMatch(/(?<![\d.])0a/);
      expect(p.content).not.toContain("f(0)");
    }
  });

  it("⑸ 🔴 `105X` 의 계수 $1$ 은 숫자를 안 적는다 (`1k` 금지)", () => {
    let seen = 0;
    for (const p of rows(E105, 400)) {
      expect(p.solution).not.toMatch(/(?<![\d.])1k/);
      if (p.facts.p === 1 || p.facts.q === 1 || p.facts.r === 1) seen += 1;
    }
    // 🔴 계수 $1$ 이 실제로 나오는 판이 있어야 이 검사가 «잴 것»을 갖는다.
    expect(
      seen,
      "계수 $1$ 인 판이 하나도 없다 — 이 검사는 못 셈이다",
    ).toBeGreaterThan(0);
  });

  it("⑹ 🔴 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나간다", () => {
    for (const e of M2_TOP_5B)
      for (const p of rows(e, 40)) {
        for (const t of [p.content, p.answer, p.solution])
          expect(t, e.rpmType).not.toContain("**");
      }
  });

  it("⑺ 🔴 `108X` 의 짝 목록에 $p=q$ 가 없다 (한 줄 앞에 $p<q$ 를 선언했다)", () => {
    for (const p of rows(E108, 200)) {
      const all = productPairs(p.facts.product!);
      for (const [a, b] of all) expect(a).toBeLessThan(b);
      const root = Math.round(Math.sqrt(p.facts.product!));
      expect(root * root, p.content).not.toBe(p.facts.product);
    }
  });

  it("⑻ 🔴 `105X` 가 세 물음을 **다** 낸다 — 하나로 굳으면 견줄 까닭이 없다", () => {
    const asks = new Set<number>();
    for (const p of rows(E105, 200)) asks.add(p.facts.ask!);
    expect(asks).toEqual(new Set([0, 1, 2]));
  });

  it("⑼ 🔴 `107X` 가 «앞으로 가는 자리»와 «뒤로 가는 자리»를 **둘 다** 낸다", () => {
    let forward = 0;
    let backward = 0;
    for (const p of rows(E107, 200)) {
      if (p.facts.ask! > p.facts.at!) forward += 1;
      else backward += 1;
    }
    expect(forward, "$n>m$ 인 판이 없다").toBeGreaterThan(0);
    expect(backward, "$n<m$ 인 판이 없다").toBeGreaterThan(0);
  });

  it("⑽ 🔴 `106X` 의 두 경계가 **둘 다** 분수다 (㉯ 걸음을 둘 다 잰다)", () => {
    for (const p of rows(E106, 200)) {
      expect(p.facts.len! % 4, p.content).not.toBe(0);
      expect((p.facts.len! - p.facts.base!) % 2, p.content).toBe(1);
    }
  });
});
