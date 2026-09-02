/**
 * 중2 **확대 갈래 3차 물결**(`m2Top3.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `35V` | 답의 두 끝을 먼저 뽑고 두 조합의 범위를 역산한다 | 부등식의 성질을 **한 글자도 안 쓴다** — 발문의 두 부등식을 $x$ 에 대해 풀어, $y$ 를 $\tfrac1{20}$ 눈금으로 훑으며 **실제로 가능한 점**을 모아 $y$ 의 최소·최대를 잰다 |
 * | `36V` | 비 $p{:}q$ 와 두 평균에서 전체 평균을 역산한다 | 약분 규칙을 안 쓴다 — 인원 $(m,f)$ 를 $1{\sim}90$ 전수로 대입해 발문의 평균식을 만족하는 쌍을 **모두** 찾고, 그 쌍마다 다음 시험의 평균을 **산술평균의 정의 그대로** 계산해 값의 집합이 하나인지 본다 |
 * | `37V` | $r=mt$·$q=mt^{2}$ 로 두 근을 심고 상수항으로 하나를 죽인다 | 계수비를 안 쓴다 — 후보 $a$ 마다 **첫째 식 위의 점 $101$개**를 만들어 둘째 식에 넣고, 전부 맞으면 「무수히 많다」·하나도 안 맞으면 「없다」·섞이면 「하나」로 판정한다 |
 * | `38V` | 소거식의 창을 역산해 후보 수를 맞춘다 | 소거를 **한 줄도 안 쓴다** — $x$, $y$, $z$ 를 삼중 반복으로 전수 대입해 발문의 두 식을 만족하는 조합을 모은다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20). 손으로 쓴 지면에는
 * `facts` 가 없으므로, 검산기가 `facts` 를 되읽는 판이었다면 이 눈금은 **통과할
 * 수가 없다**. 양성 넷은 **정찰 브리프가 손으로 푼 실측**이다.
 *
 * ## ⑶ 🔴 2차 물결의 치명 결함이 난 자리 — 해설의 **중간값**
 *
 * 2차의 `31U` 는 해설이 「$x=9$일 때는 $9$가 남는다」고 적었는데 참은 $3$ 이었다.
 * 정답은 맞으므로 값 검산·냄새·조사·렌더가 **전부 초록**이었고, 11/12 유형에 그
 * 축이 **아예 없었다**. 그래서 이 파일은 「해설 중간값 검산」을 유형마다 따로 둔다:
 *
 *   ㄱ. 해설이 적은 **모든 수**를 지면의 다른 수에서 **다시 계산**해 맞댄다.
 *   ㄴ. 해설이 같은 사실을 **두 번 말하는 자리**(나열 줄 ↔ 까닭 줄, 창 ↔ 순서쌍 ↔
 *       가짓수, 후보 줄 ↔ 판정 줄 ↔ 결론 줄)는 **셋을 서로 맞댄다.** 둘만 맞대면
 *       「답만 맞고 목록이 빈 해설」이 통과한다.
 *   ㄷ. `toContain` 류의 「해설에 이 문자열이 있나」는 **쓰지 않는다** — 마지막 줄
 *       하나로 충족되어 ㉮ 를 그대로 통과시킨다. 정규식으로 **뽑아서 값을 견준다.**
 *   ㄹ. 그리고 그 검산이 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을
 *       안 가른다(2026-08-21).
 *
 * ## ⑷ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은
 *    재지만 설명이 실제로 이해되는지는 사람이 읽어야 안다. 그래서 이 회차의 해설을
 *    표본으로 눈으로 읽었고, 그때 고친 자리(「양변을 $2$**를** 나누면」 · 「…이므로
 *    …이므로」 겹침 · 「$a=-9$**이라고**」)를 아래 회귀 잠금에 남긴다.
 * 2. `35V` 의 격자 훑기는 **눈금이 $\tfrac1{20}$** 이다. 답의 두 끝은 늘 정수이므로
 *    격자에 반드시 들어오지만, 눈금보다 가는 차이는 구조적으로 못 본다.
 * 3. `37V` 는 정수 $a$ 만 훑는다. $a^{2}=mq$ 를 만족하는 무리수 $a$ 는 못 보는데,
 *    이 생성기는 $mq$ 를 늘 완전제곱으로 잡으므로(검산기가 그것을 **확인한다**)
 *    그 자리는 비어 있다.
 * 4. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수
 *    있다. 기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가
 *    살아난다(등록 전에는 **그 사실을 스스로 찍는다**).
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
  candidateRoots,
  M2_TOP_3,
  newAverage,
  rangeOfLetter,
  survivingRoot,
  waysToBuy,
} from "@/lib/middle/m2Top3";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";

import { josaMismatches, pageSmells } from "../helpers/midPage";
import {
  catalogTypesOfMinor,
  extensionNumberReason,
  isCatalogType,
} from "../helpers/rpmCatalog";

/** 브리프가 요구한 최소 표본 200 을 넘긴다. */
const SAMPLE = 240;
const BASE_SEED = 20260903;
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260903, 11, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다(㉳). */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_3.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E35 = entryOf("35V");
const E36 = entryOf("36V");
const E37 = entryOf("37V");
const E38 = entryOf("38V");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "35V": "심화중",
  "36V": "심화중",
  "37V": "심화상",
  "38V": "심화상",
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

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 을/를·은/는·와/과·가만 본다. 그런데 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다.
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

// ── 35V 소품 — 발문의 두 부등식만 쓰는 격자 훑기 ────────────

/**
 * 발문의 두 부등식을 **$x$ 에 대해 각각 푼 뒤** $y$ 를 $\tfrac1{20}$ 눈금으로 훑어
 * 실제로 가능한 점 $(x, y)$ 의 경계를 모은다.
 *
 * ⚠️ 부등식의 성질(음수를 곱하면 방향이 바뀐다 · 변끼리 더한다)을 **한 글자도
 *    쓰지 않는다.** 그것이 이 유형이 재려는 마디이므로, 검산이 그것을 쓰면 동어반복이다.
 */
function feasibleBoundary(
  s1: number,
  s2: number,
  d1: number,
  d2: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let k = -2000; k <= 2000; k += 1) {
    const y = k / 20;
    // $s_1\le x+y\le s_2$ → $s_1-y\le x\le s_2-y$ · $d_1\le x-y\le d_2$ → $d_1+y\le x\le d_2+y$
    const loX = Math.max(s1 - y, d1 + y);
    const hiX = Math.min(s2 - y, d2 + y);
    if (loX > hiX + 1e-9) continue;
    out.push({ x: loX, y });
    out.push({ x: hiX, y });
  }
  return out;
}

/**
 * 격자 산술의 부동소수 티끌을 턴다. 참값은 정수이고 격자는 $\tfrac1{20}$ 이므로
 * **진짜 어긋남은 $0.05$ 이상**이다 — $10^{-6}$ 반올림이 그것을 가릴 수 없다.
 * (안 털면 $-3$ 이 $-2.999999999999999$ 로 나와 옳은 지면이 빨개진다.)
 */
const snap = (v: number): number => Math.round(v * 1e6) / 1e6;

function extremes(
  pts: { x: number; y: number }[],
  f: (x: number, y: number) => number,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of pts) {
    const v = f(p.x, p.y);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min: snap(min), max: snap(max) };
}

// ── 36V 소품 — 인원을 실제로 만들어 본다 ────────────────────

/** 발문의 평균식을 만족하는 인원 쌍 $(m, f)$ 전부 — 약분 규칙을 안 쓴다. */
function headcountPairs(a: number, b: number, t: number): [number, number][] {
  const out: [number, number][] = [];
  for (let m = 1; m <= 90; m += 1) {
    for (let f = 1; f <= 90; f += 1) {
      if (a * m + b * f === t * (m + f)) out.push([m, f]);
    }
  }
  return out;
}

// ── 37V 소품 — 첫째 식 위의 점을 둘째 식에 넣어 본다 ────────

type Nature = "무수히" | "없다";

/**
 * 첫째 식 $ax+my=n$ 위의 점 $101$개를 만들어 둘째 식 $qx+ay=k$ 에 넣고 몇 개가
 * 맞는지 센다. 점 $(t,\ (n-at)/m)$ 을 양변에 $m$ 을 곱해 **정수 산술로만** 견준다.
 */
function hitsOnSecond(
  a: number,
  m: number,
  q: number,
  n: number,
  k: number,
): { hit: number; total: number } {
  let hit = 0;
  let total = 0;
  for (let t = -50; t <= 50; t += 1) {
    total += 1;
    if (q * t * m + a * (n - a * t) === k * m) hit += 1;
  }
  return { hit, total };
}

/**
 * **계수비를 안 쓰고** 후보를 판정한다 — 두 식이 평행할 때(후보 자리)만 뜻이 있다.
 * 전부 맞으면 같은 직선이라 해가 무수히 많고, 하나도 안 맞으면 해가 없다.
 *
 * 🔴 섞이면 **던진다** — 평행이 아닌 $a$ 를 넣었다는 뜻이고, 그때 이 판정은 거짓이다.
 */
function candidateNature(
  a: number,
  m: number,
  q: number,
  n: number,
  k: number,
): Nature {
  const { hit, total } = hitsOnSecond(a, m, q, n, k);
  if (hit === total) return "무수히";
  if (hit === 0) return "없다";
  throw new Error(`37V: $a=${a}$ 는 평행이 아니라 이 판정을 쓸 수 없다`);
}

/**
 * 후보가 아닌 $a$ 에 해가 **정확히 하나** 있음을 «만들어 보인다».
 *
 * ⚠️ 첫 판은 여기서도 점 훑기를 썼는데, 만나는 점이 **정수 자리가 아니면**
 *    한 점도 안 맞아 「해가 없다」로 읽혔다(실측 $a=-60$). 점 훑기는 «평행»과
 *    «정수 자리가 아닌 교점»을 구조적으로 못 가른다 — 그래서 해를 **직접 만들어**
 *    두 식에 넣어 보고(있으므로 «없다»가 아니다), 첫째 식 위에 둘째 식을 **안**
 *    만족하는 점도 있음을 보인다(그러므로 «무수히»도 아니다).
 */
function exactlyOneSolution(
  a: number,
  m: number,
  q: number,
  n: number,
  k: number,
): boolean {
  const det = a * a - m * q;
  if (det === 0) return false;
  const px = n * a - m * k; // $x=px/\det$
  const py = a * k - q * n; // $y=py/\det$
  const solves = a * px + m * py === n * det && q * px + a * py === k * det;
  const { hit, total } = hitsOnSecond(a, m, q, n, k);
  return solves && hit < total;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  // 35V — 발문의 두 부등식만 읽고 $y$ 의 실제 최소·최대를 격자로 잰다.
  "35V": (content) => {
    const [s1t, s2t, d1t, d2t] = grab(
      /두 수 \$x\$, \$y\$에 대하여 \$x\+y\$와 \$x-y\$의 값의 범위가 각각 \$(-?\d+)\\le x\+y\\le(-?\d+)\$, \$(-?\d+)\\le x-y\\le(-?\d+)\$이다\. 이때 \$y\$의 값의 범위를 구하시오\./,
      content,
      "35V",
    );
    const s1 = num(s1t);
    const s2 = num(s2t);
    const d1 = num(d1t);
    const d2 = num(d2t);
    if (s1 >= s2 || d1 >= d2)
      throw new Error("35V: 주어진 범위가 뒤집혔거나 한 점이다");
    if (d1 === 0 || d2 === 0)
      throw new Error("35V: 끝값이 $0$ 이면 지면에 `+0` 이 난다");
    // 🔴 대칭 구간이면 $-1$ 을 곱해도 같은 구간이라 **뒤집기가 항등식**이다.
    if (d1 + d2 === 0)
      throw new Error("35V: $x-y$ 의 범위가 대칭이라 뒤집기 걸음이 장식이다");

    const pts = feasibleBoundary(s1, s2, d1, d2);
    if (pts.length === 0) throw new Error("35V: 가능한 점이 하나도 없다");
    const y = extremes(pts, (_x, yy) => yy);
    if (!Number.isInteger(y.min) || !Number.isInteger(y.max))
      throw new Error("35V: 답의 끝이 정수가 아니다");
    // 뒤집기를 빠뜨린 값과 참이 같으면 이 유형의 마디가 사라진다.
    if ((s1 - d1) / 2 === y.min && (s2 - d2) / 2 === y.max)
      throw new Error("35V: 뒤집지 않고 그대로 뺀 값과 답이 같다");
    return `${y.min}\\le y\\le${y.max}`;
  },

  // 36V — 인원을 **실제로 만들어** 다음 시험의 평균이 하나로 정해지는지 본다.
  "36V": (content) => {
    const [at, bt, tt, ut, vt] = grab(
      /남학생의 평균 점수는 \$(\d+)\$점, 여학생의 평균 점수는 \$(\d+)\$점이고 반 전체의 평균 점수는 \$(\d+)\$점이었다\. 다음 시험에서 남학생의 평균 점수가 \$(\d+)\$점 오르고 여학생의 평균 점수가 \$(\d+)\$점 올랐다면/,
      content,
      "36V",
    );
    const a = num(at);
    const b = num(bt);
    const t = num(tt);
    const u = num(ut);
    const v = num(vt);
    if (!(b < t && t < a))
      throw new Error("36V: 전체 평균이 두 평균 사이에 없어 그런 반이 없다");
    if (/모두 \$\d+\$명|학생은 모두/.test(content))
      throw new Error("36V: 인원의 합을 주면 인원이 굳어 이 갈래가 아니다");

    const pairs = headcountPairs(a, b, t);
    if (pairs.length < 2)
      throw new Error(
        "36V: 인원 쌍이 둘 미만이라 «비만 굳는다»가 성립하지 않는다",
      );
    if (pairs.some(([m, f]) => m === f))
      throw new Error(
        "36V: 인원비가 $1:1$ 이라 인원이 같다고 봐도 답이 같다 — 함정이 죽는다",
      );
    const values = new Set<string>();
    for (const [m, f] of pairs) {
      const numer = (a + u) * m + (b + v) * f;
      const den = m + f;
      const g = gcd(numer, den);
      values.add(`${numer / g}/${den / g}`);
    }
    if (values.size !== 1)
      throw new Error(
        `36V: 다음 시험의 평균이 ${values.size}가지라 답이 하나로 안 정해진다`,
      );
    const [numer, den] = [...values][0]!.split("/").map(Number);
    if (den !== 1) throw new Error("36V: 답이 정수가 아니다");
    // 「인원이 같다고 본 값」과 참이 같으면 전체 평균을 안 읽어도 맞는다.
    if ((a + u + b + v) / 2 === numer)
      throw new Error("36V: 인원이 같다고 봐도 답이 같다");
    return `${numer}점`;
  },

  // 37V — 계수비를 안 쓰고, 첫째 식 위의 점을 둘째 식에 넣어 판정한다.
  "37V": (content) => {
    const [mt, nt, qt, kt, goal] = grab(
      /연립방정식 \$\\begin\{cases\}ax\+(\d+)y=(-?\d+)\\\\(\d+)x\+ay=(-?\d+)\\end\{cases\}\$에서 상수 \$a\$는 첫째 식의 \$x\$의 계수이고 둘째 식의 \$y\$의 계수이다\. 이 연립방정식의 해가 (없|무수히 많)도록 하는 \$a\$의 값을 모두 구하시오\./,
      content,
      "37V",
    );
    const m = num(mt);
    const n = num(nt);
    const q = num(qt);
    const k = num(kt);
    if (m < 2 || q < 2) throw new Error("37V: 계수 $1$ 이 지면에 난다");
    if (n === 0 || k === 0) throw new Error("37V: 상수항이 $0$ 이다");
    const r = Math.round(Math.sqrt(m * q));
    if (r * r !== m * q)
      throw new Error("37V: $mq$ 가 완전제곱이 아니라 정수 후보가 없다");
    if (q % r !== 0)
      throw new Error(
        "37V: 둘째 식이 첫째 식의 정수 배가 아니라 해설에 소수 배수가 난다",
      );

    const want: Nature = goal === "없" ? "없다" : "무수히";
    const cands: number[] = [];
    const live: number[] = [];
    for (let a = -60; a <= 60; a += 1) {
      if (a === 0) continue;
      if (a * a !== m * q) {
        // 평행이 아닌 $a$ 에는 해가 정확히 하나다 — **만들어 보여** 확인한다.
        if (!exactlyOneSolution(a, m, q, n, k))
          throw new Error(`37V: $a=${a}$ 에 해가 하나임을 못 보였다`);
        continue;
      }
      cands.push(a);
      if (candidateNature(a, m, q, n, k) === want) live.push(a);
    }
    if (cands.length !== 2)
      throw new Error(`37V: 후보가 ${cands.length}개다 — 둘이어야 «상»이다`);
    if (live.length !== 1)
      throw new Error(
        `37V: 조건에 맞는 $a$ 가 ${live.length}개다 — 후보를 견줘도 하나로 안 좁혀진다`,
      );
    return `a=${live[0]}`;
  },

  // 38V — 소거를 한 줄도 안 쓰고 삼중 반복으로 전수 대입한다.
  "38V": (content) => {
    const [p1t, p2t, p3t, nt, totalt] = grab(
      /\$(\d+)\$원인 \S+, \$(\d+)\$원인 \S+, \$(\d+)\$원인 \S+ 세 종류를 합하여 모두 \$(\d+)\$\S+ 사고 \$(\d+)\$원을 냈다\./,
      content,
      "38V",
    );
    const prices: [number, number, number] = [num(p1t), num(p2t), num(p3t)];
    const n = num(nt);
    const total = num(totalt);
    if (!(prices[0] > prices[1] && prices[1] > prices[2]))
      throw new Error("38V: 값이 비싼 것부터 차례가 아니다");
    if (!/각각 적어도 한 \S+씩/.test(content))
      throw new Error("38V: 「각각 적어도 한 개씩」 조건이 발문에 없다");

    const tight = waysToBuyHere(prices, n, total, 1);
    const loose = waysToBuyHere(prices, n, total, 0);
    if (tight.length < 2)
      throw new Error(
        `38V: 방법이 ${tight.length}가지뿐이라 후보를 견줄 것이 없다`,
      );
    if (tight.length > 5)
      throw new Error("38V: 후보가 너무 많아 나열이 지면을 넘는다");
    if (loose.length <= tight.length)
      throw new Error(
        "38V: 「적어도 한 개씩」을 지워도 가짓수가 같다 — 조건이 장식이다",
      );
    // 🔴 아래 경계가 $x\ge1$ 그대로면 조건의 절반(가장 싼 것 쪽)이 물지 않는다.
    if (Math.min(...tight.map((s) => s[0])) < 2)
      throw new Error(
        "38V: $x$ 의 아래 경계가 $1$ 이라 조건의 절반이 장식이다",
      );
    return String(tight.length);
  },
};

/**
 * 🔴 **제품 함수를 안 쓰고 여기 다시 적는다.** `waysToBuy` 를 그대로 부르면
 *    「제품이 낸 것을 제품으로 검산한다」가 되어 아무것도 안 지킨다.
 *    (제품 함수 자체의 눈금은 「굳힘 함수」 describe 가 손 계산으로 따로 잰다.)
 */
function waysToBuyHere(
  prices: readonly [number, number, number],
  n: number,
  total: number,
  minEach: number,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let x = minEach; x <= n; x += 1) {
    for (let y = minEach; y <= n; y += 1) {
      const z = n - x - y;
      if (z < minEach) continue;
      if (prices[0] * x + prices[1] * y + prices[2] * z === total) {
        out.push([x, y, z]);
      }
    }
  }
  return out;
}

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/** 양성: 답을 아는 지면에서 그 답을 낸다. 넷 다 정찰 브리프의 손 실측이다. */
const CALIBRATION: ReadonlyArray<readonly [string, string, string]> = [
  [
    "35V",
    "두 수 $x$, $y$에 대하여 $x+y$와 $x-y$의 값의 범위가 각각 $1\\le x+y\\le7$, $-3\\le x-y\\le1$이다. 이때 $y$의 값의 범위를 구하시오.",
    "0\\le y\\le5",
  ],
  [
    "36V",
    "어느 반의 시험에서 남학생의 평균 점수는 $78$점, 여학생의 평균 점수는 $66$점이고 반 전체의 평균 점수는 $74$점이었다. 다음 시험에서 남학생의 평균 점수가 $6$점 오르고 여학생의 평균 점수가 $3$점 올랐다면 반 전체의 평균 점수는 몇 점인지 구하시오.",
    "79점",
  ],
  [
    "37V",
    "연립방정식 $\\begin{cases}ax+3y=6\\\\12x+ay=12\\end{cases}$에서 상수 $a$는 첫째 식의 $x$의 계수이고 둘째 식의 $y$의 계수이다. 이 연립방정식의 해가 없도록 하는 $a$의 값을 모두 구하시오.",
    "a=-6",
  ],
  [
    // 같은 계수로 «무수히 많도록» 물으면 **답이 반대쪽 후보**가 된다.
    "37V",
    "연립방정식 $\\begin{cases}ax+3y=6\\\\12x+ay=12\\end{cases}$에서 상수 $a$는 첫째 식의 $x$의 계수이고 둘째 식의 $y$의 계수이다. 이 연립방정식의 해가 무수히 많도록 하는 $a$의 값을 모두 구하시오.",
    "a=6",
  ],
  [
    "38V",
    "어느 문구점에서 한 개에 $700$원인 공책, $500$원인 볼펜, $300$원인 지우개 세 종류를 합하여 모두 $10$개 사고 $5600$원을 냈다. 세 종류를 각각 적어도 한 개씩 샀을 때, 살 수 있는 방법의 가짓수를 구하시오.",
    "3",
  ],
];

/** 음성: 불변식을 어긴 지면은 **던진다**. 없으면 「0」이 «깨끗»인지 «못 셈»인지 안 갈린다. */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    "35V",
    "두 수 $x$, $y$에 대하여 $x+y$와 $x-y$의 값의 범위가 각각 $1\\le x+y\\le7$, $-3\\le x-y\\le3$이다. 이때 $y$의 값의 범위를 구하시오.",
    "$x-y$ 의 범위가 대칭이라 $-1$ 을 곱해도 같은 구간 — 뒤집기가 항등식이다 (㉠)",
  ],
  [
    "35V",
    "두 수 $x$, $y$에 대하여 $x+y$와 $x-y$의 값의 범위가 각각 $7\\le x+y\\le1$, $-3\\le x-y\\le1$이다. 이때 $y$의 값의 범위를 구하시오.",
    "주어진 범위가 뒤집혀 있어 그런 점이 없다",
  ],
  [
    "36V",
    "어느 반의 시험에서 남학생의 평균 점수는 $78$점, 여학생의 평균 점수는 $66$점이고 반 전체의 평균 점수는 $72$점이었다. 다음 시험에서 남학생의 평균 점수가 $6$점 오르고 여학생의 평균 점수가 $3$점 올랐다면 반 전체의 평균 점수는 몇 점인지 구하시오.",
    "인원비가 $1:1$ 이라 인원이 같다고 봐도 답이 같다 — 함정이 죽는다 (㉠)",
  ],
  [
    "36V",
    "어느 반의 시험에서 남학생의 평균 점수는 $78$점, 여학생의 평균 점수는 $66$점이고 반 전체의 평균 점수는 $80$점이었다. 다음 시험에서 남학생의 평균 점수가 $6$점 오르고 여학생의 평균 점수가 $3$점 올랐다면 반 전체의 평균 점수는 몇 점인지 구하시오.",
    "전체 평균이 두 평균 사이에 없어 그런 반이 아예 없다",
  ],
  [
    // 🔴 **시험이 찾아 준 결함의 눈금.** 다음 시험의 두 평균이 둘 다 $92$ 라
    //    가중평균이 인원비와 무관해진다 — 전체 평균을 한 번도 안 읽고 답이 나온다.
    "36V",
    "어느 반의 시험에서 남학생의 평균 점수는 $89$점, 여학생의 평균 점수는 $81$점이고 반 전체의 평균 점수는 $83$점이었다. 다음 시험에서 남학생의 평균 점수가 $3$점 오르고 여학생의 평균 점수가 $11$점 올랐다면 반 전체의 평균 점수는 몇 점인지 구하시오.",
    "다음 시험의 두 평균이 같아 비가 통째로 장식이 된다 (㉠)",
  ],
  [
    "37V",
    "연립방정식 $\\begin{cases}ax+3y=6\\\\11x+ay=12\\end{cases}$에서 상수 $a$는 첫째 식의 $x$의 계수이고 둘째 식의 $y$의 계수이다. 이 연립방정식의 해가 없도록 하는 $a$의 값을 모두 구하시오.",
    "$mq=33$ 이 완전제곱이 아니라 정수 후보가 태어나지 않는다",
  ],
  [
    "37V",
    "연립방정식 $\\begin{cases}ax+3y=6\\\\12x+ay=7\\end{cases}$에서 상수 $a$는 첫째 식의 $x$의 계수이고 둘째 식의 $y$의 계수이다. 이 연립방정식의 해가 없도록 하는 $a$의 값을 모두 구하시오.",
    "두 후보가 **둘 다** 「해가 없다」라 상수항을 견줘도 하나로 안 좁혀진다",
  ],
  [
    "37V",
    "연립방정식 $\\begin{cases}ax+4y=6\\\\9x+ay=9\\end{cases}$에서 상수 $a$는 첫째 식의 $x$의 계수이고 둘째 식의 $y$의 계수이다. 이 연립방정식의 해가 없도록 하는 $a$의 값을 모두 구하시오.",
    "둘째 식이 첫째 식의 $1.5$ 배라 해설에 소수 배수가 난다 (정찰의 $(4,9)$ 를 뺀 까닭)",
  ],
  [
    "38V",
    "어느 문구점에서 한 개에 $700$원인 공책, $500$원인 볼펜, $300$원인 지우개 세 종류를 합하여 모두 $10$개 사고 $4200$원을 냈다. 세 종류를 각각 적어도 한 개씩 샀을 때, 살 수 있는 방법의 가짓수를 구하시오.",
    "$x$ 의 아래 경계가 $1$ 이라 「적어도 한 개씩」의 절반이 장식이다 (㉠)",
  ],
  [
    "38V",
    "어느 문구점에서 한 개에 $700$원인 공책, $500$원인 볼펜, $300$원인 지우개 세 종류를 합하여 모두 $10$개 사고 $6200$원을 냈다. 세 종류를 각각 적어도 한 개씩 샀을 때, 살 수 있는 방법의 가짓수를 구하시오.",
    "방법이 하나뿐이라 후보를 견줄 것이 없다 — «상»이 아니다",
  ],
  [
    // 🔴 ㉡ 검사의 **양성 대조**다 — 이 자리가 없으면 「조건이 장식이다」 줄이
    //    한 번도 안 물어 «깨끗»인지 «못 셈»인지 안 갈린다. 실측으로 이런 자리가
    //    매개변수 범위 안에 **198개** 있다(`waysToBuy` 전수 훑기).
    "38V",
    "어느 문구점에서 한 개에 $800$원인 공책, $400$원인 볼펜, $200$원인 지우개 세 종류를 합하여 모두 $10$개 사고 $4600$원을 냈다. 세 종류를 각각 적어도 한 개씩 샀을 때, 살 수 있는 방법의 가짓수를 구하시오.",
    "「적어도 한 개씩」을 지워도 가짓수가 $3$ 으로 같다 — 조건이 장식이다 (㉡)",
  ],
];

describe("중2 확대 갈래 3차 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
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

describe("중2 확대 갈래 3차 — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_3.length).toBe(4);
    expect(M2_TOP_3.map((e) => e.rpmType)).toEqual([
      "35V",
      "36V",
      "37V",
      "38V",
    ]);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인 최대를 넘고 제목은 새것이다)", () => {
    for (const e of M2_TOP_3) {
      expect(isCatalogType(e), `${e.key} 는 색인에 없어야 한다`).toBe(false);
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
  });

  it("🔴 ㉳ 소단원·중단원 이름을 **정본에 대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다", () => {
    // 소단원은 단원 시드가 정본이다. 괄호 안의 쉼표·공백·가는 공백은 눈으로 못 가른다.
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_3) {
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

  it("네 유형이 어느 소단원에 붙는지 못 박는다", () => {
    expect(M2_TOP_3.map((e) => [e.rpmType, e.rpmMinor, e.unitSection])).toEqual(
      [
        ["35V", "일차부등식", "부등식"],
        ["36V", "연립일차방정식의 활용", "연립방정식의 활용(수, 평균, 나이)"],
        ["37V", "연립일차방정식", "해가 특수한 연립방정식"],
        [
          "38V",
          "연립일차방정식의 활용",
          "연립방정식의 활용(가격, 개수, 증감, 도형)",
        ],
      ],
    );
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    const foreign = registeredTypes().filter((e) => !M2_TOP_3.includes(e));
    for (const e of M2_TOP_3) {
      expect(
        foreign.some((f) => f.key === e.key),
        `${e.key} 가 남의 모듈과 겹친다`,
      ).toBe(false);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_3) {
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

describe("중2 확대 갈래 3차 — 지면과 값", () => {
  for (const e of M2_TOP_3) {
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

      it("변형 공간이 열 문항을 낸다 — 발문이 겹치지 않는다", () => {
        const seen = new Set(rows(e, 60).map((p) => p.content));
        expect(seen.size, `${e.rpmType} 변형 공간`).toBeGreaterThanOrEqual(10);
      });

      it("🔴 800씨앗에서 서로 다른 해설이 12벌을 넘는다 (적재가 12벌을 요구한다)", () => {
        const seen = new Set(rows(e, 800).map((p) => p.solution));
        expect(seen.size, `${e.rpmType} 서로 다른 해설`).toBeGreaterThan(12);
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
  if (rpmType === "35V") return `$${facts.x}\\le y\\le${facts.hi}$`;
  if (rpmType === "36V") return `$${facts.x}$점`;
  if (rpmType === "37V") return `$a=${facts.x}$`;
  if (rpmType === "38V") return `$${facts.x}$`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값** 검산 — 2차 물결의 치명 결함이 난 자리
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 3차 — 🔴 해설의 중간값을 다른 길로 다시 잰다", () => {
  it("`35V` — 뒤집은 범위·더한 범위·나눈 범위를 **격자로** 재고 세 줄을 서로 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E35, 120)) {
      const [s1t, s2t, d1t, d2t] = grab(
        /\$(-?\d+)\\le x\+y\\le(-?\d+)\$, \$(-?\d+)\\le x-y\\le(-?\d+)\$이다\./,
        p.content,
        "35V 발문",
      );
      const s1 = num(s1t);
      const s2 = num(s2t);
      const d1 = num(d1t);
      const d2 = num(d2t);
      const pts = feasibleBoundary(s1, s2, d1, d2);
      const negV = extremes(pts, (x, y) => y - x); // $-(x-y)$
      const diff = extremes(pts, (x, y) => x + y - (x - y)); // $(x+y)-(x-y)$
      const yy = extremes(pts, (_x, y) => y);

      // ⑴ 뒤집은 줄
      const [f1, f2] = grab(
        /각 변에 음수인 \$-1\$을 곱하면 부등호의 방향이 바뀌어 \$(-?\d+)\\le -\(x-y\)\\le(-?\d+)\$이다\./,
        p.solution,
        "35V 뒤집은 줄",
      );
      expect([num(f1), num(f2)], p.solution).toEqual([negV.min, negV.max]);
      // ⑵ 더한 줄 — 「즉」 뒤의 값도 같은 사실을 두 번째로 말하는 자리다.
      const [a1, a2] = grab(
        /변끼리 더하면 \$.+?\\le \(x\+y\)-\(x-y\)\\le.+?\$, 즉 \$(-?\d+)\\le 2y\\le(-?\d+)\$이다\./,
        p.solution,
        "35V 더한 줄",
      );
      expect([num(a1), num(a2)], p.solution).toEqual([diff.min, diff.max]);
      // 「더한 식」의 두 끝도 값으로 견준다 — 적어 둔 덧셈이 정말 그 값인가.
      const [sa, na, sb, nb] = grab(
        /변끼리 더하면 \$(-?\d+)\+\(?(-?\d+)\)?\\le \(x\+y\)-\(x-y\)\\le(-?\d+)\+\(?(-?\d+)\)?\$/,
        p.solution,
        "35V 더한 식",
      );
      expect(num(sa) + num(na), p.solution).toBe(diff.min);
      expect(num(sb) + num(nb), p.solution).toBe(diff.max);
      expect([num(sa), num(sb)], p.solution).toEqual([s1, s2]);
      expect([num(na), num(nb)], p.solution).toEqual([-d2, -d1]);
      // ⑶ 나눈 줄 · ⑷ 결론 줄 — 셋이 서로 맞아야 한다.
      const [q1, q2] = grab(
        /각 변을 양수인 \$2\$로 나누면 부등호의 방향이 그대로이므로 \$(-?\d+)\\le y\\le(-?\d+)\$이다\./,
        p.solution,
        "35V 나눈 줄",
      );
      const [c1, c2] = grab(
        /따라서 \$y\$의 값의 범위는 \$(-?\d+)\\le y\\le(-?\d+)\$이다\./,
        p.solution,
        "35V 결론 줄",
      );
      expect([num(q1), num(q2)], p.solution).toEqual([yy.min, yy.max]);
      expect([num(c1), num(c2)], p.solution).toEqual([yy.min, yy.max]);
      expect(num(a1) / 2, p.solution).toBe(num(q1));
      expect(num(a2) / 2, p.solution).toBe(num(q2));
      // ⑸ 함정 줄 — 「그대로 뺀 값」이 정말 그 값이고 참과 달라야 한다.
      const [w1, w2] = grab(
        /그대로 빼면 \$(-?\d+)\\le y\\le(-?\d+)\$[이가] 되어 답이 달라진다\./,
        p.solution,
        "35V 함정 줄",
      );
      expect([num(w1), num(w2)], p.solution).toEqual([
        (s1 - d1) / 2,
        (s2 - d2) / 2,
      ]);
      expect([num(w1), num(w2)], p.solution).not.toEqual([yy.min, yy.max]);
      // ⑹ 확인 줄 — 적어 둔 두 점이 정말 발문의 범위 안이고 그 $y$ 를 낸다.
      const [u1, v1, ya, u2, v2, yb] = grab(
        /실제로 \$x\+y=(-?\d+)\$, \$x-y=(-?\d+)\$일 때 \$y=(-?\d+)\$이고, \$x\+y=(-?\d+)\$, \$x-y=(-?\d+)\$일 때 \$y=(-?\d+)\$이므로/,
        p.solution,
        "35V 확인 줄",
      );
      for (const [uu, vv, yv] of [
        [num(u1), num(v1), num(ya)],
        [num(u2), num(v2), num(yb)],
      ]) {
        expect(uu! >= s1 && uu! <= s2, p.solution).toBe(true);
        expect(vv! >= d1 && vv! <= d2, p.solution).toBe(true);
        expect((uu! - vv!) / 2, p.solution).toBe(yv);
      }
      expect([num(ya), num(yb)], p.solution).toEqual([yy.min, yy.max]);
      checked += 1;
    }
    // 🔴 이 검사가 **무언가를 실제로 봤는지** 센다 — 0 은 «깨끗»과 «못 셈»을 안 가른다.
    expect(checked, "35V 해설을 하나도 못 읽었다").toBe(120);
  });

  it("`36V` — 비·다음 평균·함정 값을 **인원을 실제로 만들어** 다시 재고 세 줄을 맞댄다", () => {
    let checked = 0;
    for (const p of rows(E36, 120)) {
      const [at, bt, tt, ut, vt] = grab(
        /남학생의 평균 점수는 \$(\d+)\$점, 여학생의 평균 점수는 \$(\d+)\$점이고 반 전체의 평균 점수는 \$(\d+)\$점이었다\. 다음 시험에서 남학생의 평균 점수가 \$(\d+)\$점 오르고 여학생의 평균 점수가 \$(\d+)\$점 올랐다면/,
        p.content,
        "36V 발문",
      );
      const a = num(at);
      const b = num(bt);
      const t = num(tt);
      const u = num(ut);
      const v = num(vt);
      const pairs = headcountPairs(a, b, t);
      expect(pairs.length, p.content).toBeGreaterThan(1);

      // ⑴ 평균식 줄 — 발문의 세 수를 그대로 옮겼는가.
      const [fa, fb, ft] = grab(
        /\$\\dfrac\{(\d+)x\+(\d+)y\}\{x\+y\}=(\d+)\$이다\./,
        p.solution,
        "36V 평균식 줄",
      );
      expect([num(fa), num(fb), num(ft)], p.solution).toEqual([a, b, t]);
      // ⑵ 정리한 줄 — 그 등식이 **모든 인원 쌍**에서 참인가(규칙을 안 옮겨 적는다).
      const [cx, cy] = grab(
        /이항하여 정리하면 \$(\d+)x=(\d+)y\$이다\./,
        p.solution,
        "36V 정리한 줄",
      );
      for (const [m, f] of pairs) {
        expect(num(cx) * m, p.solution).toBe(num(cy) * f);
      }
      expect(num(cx), p.solution).toBeGreaterThan(1); // `1x` 는 지면 냄새다
      expect(num(cy), p.solution).toBeGreaterThan(1);
      // ⑶ 비 줄 — 적어 둔 비가 **모든 인원 쌍**과 맞고 기약인가.
      const [rx, ry] = grab(
        /두 인원의 비는 \$x:y=(\d+):(\d+)\$/,
        p.solution,
        "36V 비 줄",
      );
      expect(gcd(num(rx), num(ry)), p.solution).toBe(1);
      expect(Math.min(num(rx), num(ry)), p.solution).toBe(1);
      for (const [m, f] of pairs) {
        expect(m * num(ry), p.solution).toBe(f * num(rx));
      }
      // ⑷ 다음 시험 줄 — 새 평균 둘이 정말 오른 값인가.
      const [na, nb] = grab(
        /다음 시험에서 남학생의 평균은 \$(\d+)\$점, 여학생의 평균은 \$(\d+)\$점이므로/,
        p.solution,
        "36V 다음 시험 줄",
      );
      expect([num(na), num(nb)], p.solution).toEqual([a + u, b + v]);
      // ⑸ 대입 줄 — 약분 전후의 수를 **인원 쌍으로 다시 계산**해 맞댄다.
      const subst =
        /\\dfrac\{(\d+)\\times(\d+)y\+(\d+)y\}\{(\d+)y\+y\}=\\dfrac\{(\d+)y\}\{(\d+)y\}=(\d+)\$이다\./.exec(
          p.solution,
        ) ??
        /\\dfrac\{(\d+)x\+(\d+)\\times(\d+)x\}\{x\+(\d+)x\}=\\dfrac\{(\d+)x\}\{(\d+)x\}=(\d+)\$이다\./.exec(
          p.solution,
        );
      expect(subst, `36V 대입 줄을 못 읽었다 — ${p.solution}`).not.toBeNull();
      const numerated = num(subst![5]);
      const denominated = num(subst![6]);
      const shown = num(subst![7]);
      expect(numerated / denominated, p.solution).toBe(shown);
      // 인원 쌍마다 산술평균의 정의로 다시 계산한 값과 같아야 한다.
      for (const [m, f] of pairs) {
        expect(((a + u) * m + (b + v) * f) / (m + f), p.solution).toBe(shown);
      }
      // ⑹ 함정 줄 — 「똑같이 나눈」 값이 정말 그 값이고 참과 달라야 한다.
      const [nr, nv] = grab(
        /전체 평균도 \$(\d+)\$점 오른다고 보면 \$(\d+)\$점이지만/,
        p.solution,
        "36V 함정 줄",
      );
      expect(num(nr), p.solution).toBe((u + v) / 2);
      expect(num(nv), p.solution).toBe(t + (u + v) / 2);
      expect(num(nv), p.solution).not.toBe(shown);
      // ⑺ 결론 줄 — 셋(대입 줄 · 결론 줄 · 정답)이 서로 맞아야 한다.
      const [ct] = grab(
        /따라서 다음 시험에서 반 전체의 평균 점수는 \$(\d+)\$점이다\./,
        p.solution,
        "36V 결론 줄",
      );
      expect(num(ct), p.solution).toBe(shown);
      expect(p.answer).toBe(`$${shown}$점`);
      // 🔴 「두 식을 연립하여 풀면 $x=\dots$」 줄이 있으면 05A 와 같은 문항이 된다.
      expect(p.solution).not.toMatch(/연립하여 풀면/);
      expect(p.solution).not.toMatch(/남학생 수는 \$\d+\$명/);
      checked += 1;
    }
    expect(checked, "36V 해설을 하나도 못 읽었다").toBe(120);
  });

  it("`37V` — 후보 둘·각 후보의 배수와 판정 낱말을 **해집합으로** 다시 잰다", () => {
    let checked = 0;
    for (const p of rows(E37, 120)) {
      const [mt, nt, qt, kt, goal] = grab(
        /\$\\begin\{cases\}ax\+(\d+)y=(-?\d+)\\\\(\d+)x\+ay=(-?\d+)\\end\{cases\}\$에서 .*? 해가 (없|무수히 많)도록/,
        p.content,
        "37V 발문",
      );
      const m = num(mt);
      const n = num(nt);
      const q = num(qt);
      const k = num(kt);
      // ⑴ 계수비 줄 — 적어 둔 $a^{2}$ 이 정말 $mq$ 인가.
      const [rm, rq, prod] = grab(
        /\$a:(\d+)=(\d+):a\$이므로 \$a\\times a=\d+\\times\d+\$, 곧 \$a\^\{2\}=(\d+)\$이다\./,
        p.solution,
        "37V 계수비 줄",
      );
      expect([num(rq), num(rm)], p.solution).toEqual([m, q]);
      expect(num(prod), p.solution).toBe(m * q);
      // ⑵ 후보 줄 — 두 근이 정말 그 제곱근이고 서로 다른가.
      const [r1, r2] = grab(
        /이때 \$a\$는 \$(-?\d+)\$ 또는 \$(-?\d+)\$이다\./,
        p.solution,
        "37V 후보 줄",
      );
      expect(num(r1) * num(r1), p.solution).toBe(m * q);
      expect(num(r2) * num(r2), p.solution).toBe(m * q);
      expect(num(r1), p.solution).not.toBe(num(r2));
      // ⑶ 후보마다 — 두 식·배수·곱한 식·판정 낱말을 전부 값으로 견준다.
      const caseRe =
        /\$a=(-?\d+)\$일 때 두 식은 \$(-?\d+)x\+(\d+)y=(-?\d+)\$[와과] \$(\d+)x([+-])(\d+)y=(-?\d+)\$이다\. 첫째 식의 양변에 \$(-?\d+)\$[을를] 곱하면 \$(\d+)x([+-])(\d+)y=(-?\d+)\$이고, 둘째 식의 상수항은 \$(-?\d+)\$이므로 (두 식이 완전히 같아 해가 무수히 많다|두 식을 동시에 만족시키는 \$x\$, \$y\$가 없어 해가 없다)\./g;
      const seen: number[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = caseRe.exec(p.solution)) !== null) {
        const a = num(cm[1]);
        seen.push(a);
        // 두 식이 발문 그대로인가.
        expect([num(cm[2]), num(cm[3]), num(cm[4])], p.solution).toEqual([
          a,
          m,
          n,
        ]);
        const secondY = cm[6] === "-" ? -num(cm[7]) : num(cm[7]);
        expect([num(cm[5]), secondY, num(cm[8])], p.solution).toEqual([
          q,
          a,
          k,
        ]);
        // 🔴 배수 $c$ 를 **계수 세 자리에 각각** 대 본다 (2차 물결 ㉮).
        const c = num(cm[9]);
        expect(c * a, p.solution).toBe(q);
        expect(c * m, p.solution).toBe(a);
        const mulY = cm[11] === "-" ? -num(cm[12]) : num(cm[12]);
        expect([num(cm[10]), mulY, num(cm[13])], p.solution).toEqual([
          q,
          a,
          c * n,
        ]);
        expect(num(cm[14]), p.solution).toBe(k);
        // 판정 낱말 — 해집합을 직접 세어 얻은 것과 글자로 맞댄다.
        const truth = candidateNature(a, m, q, n, k);
        const said = cm[15]!.includes("무수히") ? "무수히" : "없다";
        expect(said, `${p.solution}\n$a=${a}$ 의 판정`).toBe(truth);
      }
      expect(seen, p.solution).toEqual([num(r1), num(r2)]);
      // ⑷ 결론 줄 — 판정 낱말과 목표가 맞는 후보가 **정확히 하나**이고 그것이 답인가.
      const want: Nature = goal === "없" ? "없다" : "무수히";
      const live = seen.filter((a) => candidateNature(a, m, q, n, k) === want);
      expect(live.length, p.solution).toBe(1);
      const [ct] = grab(
        /따라서 해가 (?:없|무수히 많)도록 하는 상수 \$a\$의 값은 \$(-?\d+)\$ 하나뿐이다\./,
        p.solution,
        "37V 결론 줄",
      );
      expect(num(ct), p.solution).toBe(live[0]);
      expect(p.answer).toBe(`$a=${live[0]}$`);
      // ⑸ 주의 줄 — 죽은 후보와 그 까닭이 맞는가.
      const [dt, why] = grab(
        /그러나 \$a=(-?\d+)\$일 때는 해가 (무수히 많아|없어) 조건에 맞지 않으므로/,
        p.solution,
        "37V 주의 줄",
      );
      const deadA = num(dt);
      expect(seen.includes(deadA), p.solution).toBe(true);
      expect(deadA, p.solution).not.toBe(live[0]);
      expect(why!.includes("무수히") ? "무수히" : "없다", p.solution).toBe(
        candidateNature(deadA, m, q, n, k),
      );
      checked += 1;
    }
    expect(checked, "37V 해설을 하나도 못 읽었다").toBe(120);
  });

  it("`38V` — 창·순서쌍·금액·가짓수를 **전수 대입**으로 다시 재고 셋을 맞댄다", () => {
    let checked = 0;
    let tupleCount = 0;
    for (const p of rows(E38, 120)) {
      const [p1t, p2t, p3t, nt, totalt] = grab(
        /\$(\d+)\$원인 \S+, \$(\d+)\$원인 \S+, \$(\d+)\$원인 \S+ 세 종류를 합하여 모두 \$(\d+)\$\S+ 사고 \$(\d+)\$원을 냈다\./,
        p.content,
        "38V 발문",
      );
      const prices: [number, number, number] = [num(p1t), num(p2t), num(p3t)];
      const n = num(nt);
      const total = num(totalt);
      const truth = waysToBuyHere(prices, n, total, 1);

      // ⑴ 백원으로 나눈 줄 — 값이 정말 그 몫인가.
      const [h1, h2, h3, mh] = grab(
        /둘째 식의 양변을 \$100\$으로 나누면 \$(\d+)x\+(\d+)y\+(\d+)z=(\d+)\$이다\./,
        p.solution,
        "38V 나눈 줄",
      );
      expect(
        [num(h1) * 100, num(h2) * 100, num(h3) * 100, num(mh) * 100],
        p.solution,
      ).toEqual([prices[0], prices[1], prices[2], total]);
      // ⑵ 소거 줄 — 뺀 결과가 **모든 해**에서 참인가.
      const [mul, mulRhs, ex, ey, rhs] = grab(
        /첫째 식의 양변에 \$(\d+)\$[을를] 곱하면 \$\d+x\+\d+y\+\d+z=(\d+)\$이고, 이것을 위 식에서 빼면 \$(\d+)x\+(\d+)y=(\d+)\$이다\./,
        p.solution,
        "38V 소거 줄",
      );
      expect(num(mul), p.solution).toBe(num(h3));
      expect(num(mulRhs), p.solution).toBe(num(h3) * n);
      for (const [x, y] of truth) {
        expect(num(ex) * x + num(ey) * y, p.solution).toBe(num(rhs));
      }
      // ⑶ 나눈 소거 줄 — 그 식이 **해집합을 정확히** 가르는가(넘치지도 모자라지도 않게).
      const [dv, alpha, kk] = grab(
        /양변을 \$(\d+)\$[으]?로 나누면 \$(\d+)x\+y=(\d+)\$이다\./,
        p.solution,
        "38V 나눈 소거 줄",
      );
      expect(num(dv) * num(alpha), p.solution).toBe(num(ex));
      expect(num(dv), p.solution).toBe(num(ey));
      expect(num(dv) * num(kk), p.solution).toBe(num(rhs));
      const byReduced: [number, number, number][] = [];
      for (let x = 1; x <= n; x += 1) {
        const y = num(kk) - num(alpha) * x;
        const z = n - x - y;
        if (y >= 1 && z >= 1) byReduced.push([x, y, z]);
      }
      expect(byReduced, p.solution).toEqual(truth);
      // ⑷ 위 경계 줄 · 아래 경계 줄 — 실제 최대·최소와 같은가, 그리고 **한 칸 밖은 정말 틀리는가**.
      const [xmax] = grab(
        /\$y\\ge1\$이므로 \$\d+-\d*x\\ge1\$에서 \$x\\le(\d+)\$이다\./,
        p.solution,
        "38V 위 경계 줄",
      );
      const [zc, zk, xmin] = grab(
        /=\$?(\d*)x-(\d+)\$이고 \$z\\ge1\$이므로 \$x\\ge(\d+)\$이다\./,
        p.solution,
        "38V 아래 경계 줄",
      );
      const coefZ = zc === "" ? 1 : num(zc);
      expect(coefZ, p.solution).toBe(num(alpha) - 1);
      expect(num(zk), p.solution).toBe(num(kk) - n);
      for (const [x, , z] of truth) {
        expect(coefZ * x - num(zk), p.solution).toBe(z);
      }
      expect(num(xmax), p.solution).toBe(Math.max(...truth.map((s) => s[0])));
      expect(num(xmin), p.solution).toBe(Math.min(...truth.map((s) => s[0])));
      // 창 밖의 이웃이 정말 조건을 어기는가 — 끝을 한 칸 잘못 적어도 답이 맞을 수 있다.
      for (const x of [num(xmin) - 1, num(xmax) + 1]) {
        const y = num(kk) - num(alpha) * x;
        const z = n - x - y;
        expect(x >= 1 && y >= 1 && z >= 1, `${p.solution}\n$x=${x}$`).toBe(
          false,
        );
      }
      // ⑸ 순서쌍 줄 — 집합으로 맞댄다(개수만 맞대면 원소가 틀려도 초록이다).
      const listed: [number, number, number][] = [];
      for (const t of p.solution.matchAll(
        /\$\\left\((\d+),\\ (\d+),\\ (\d+)\\right\)\$/g,
      )) {
        listed.push([num(t[1]), num(t[2]), num(t[3])]);
      }
      // 마지막 하나는 「사지 않아도 된다면」의 예다 — 그것만 떼어 따로 본다.
      const extra = listed.pop()!;
      expect(listed, p.solution).toEqual(truth);
      tupleCount += listed.length;
      expect(
        prices[0] * extra[0] + prices[1] * extra[1] + prices[2] * extra[2],
        p.solution,
      ).toBe(total);
      expect(extra[0] + extra[1] + extra[2], p.solution).toBe(n);
      expect(Math.min(...extra), p.solution).toBe(0);
      // ⑹ 금액 줄 — 발문의 단가로 다시 곱해 합이 정말 그 금액인가.
      const checks: [number, number, number][] = [];
      for (const t of p.solution.matchAll(
        /\$(\d+)\\times(\d+)\+(\d+)\\times(\d+)\+(\d+)\\times(\d+)=(\d+)\$/g,
      )) {
        expect([num(t[1]), num(t[3]), num(t[5])], p.solution).toEqual(prices);
        expect(
          num(t[1]) * num(t[2]) + num(t[3]) * num(t[4]) + num(t[5]) * num(t[6]),
          p.solution,
        ).toBe(num(t[7]));
        expect(num(t[7]), p.solution).toBe(total);
        checks.push([num(t[2]), num(t[4]), num(t[6])]);
      }
      expect(checks, p.solution).toEqual(truth);
      // ⑺ 🔴 셋을 맞댄다 — 전수 검산의 크기 · 나열한 순서쌍 수 · 적어 둔 가짓수.
      const [ct] = grab(
        /따라서 살 수 있는 방법의 가짓수는 \$(\d+)\$이다\./,
        p.solution,
        "38V 결론 줄",
      );
      expect([truth.length, listed.length, num(ct)], p.solution).toEqual([
        truth.length,
        truth.length,
        truth.length,
      ]);
      expect(p.answer).toBe(`$${truth.length}$`);
      checked += 1;
    }
    expect(checked, "38V 해설을 하나도 못 읽었다").toBe(120);
    expect(tupleCount, "38V 순서쌍을 하나도 못 읽었다").toBeGreaterThan(240);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 「창을 한쪽 끝만 주면 굳힘이 장식이 된다」 — 갈래마다 따로 찍는다
// ═══════════════════════════════════════════════════════════

/**
 * 「축이 없다」와 「축이 초록이다」는 다른 말이다(m1Top 머리말). 어느 쪽인지
 * 검사 이름에 적는다.
 */
describe("중2 확대 갈래 3차 — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`35V` — 이 축은 **없다**: 후보 목록이 아예 없고 값이 하나의 구간으로 굳는다", () => {
    for (const p of rows(E35, 60)) {
      expect(p.content).not.toMatch(/모두 구/);
      expect(p.answer).toMatch(/^\$-?\d+\\le y\\le-?\d+\$$/);
      // 대신 「굳힘을 안 읽은 학생의 답」이 참과 달라야 한다.
      const { s1, s2, d1, d2, x, hi } = p.facts as Record<string, number>;
      const naive = rangeOfLetter(s1!, s2!, d1!, d2!, false);
      expect([naive.lo, naive.hi], p.content).not.toEqual([x, hi]);
    }
  });

  it("`36V` — 이 축은 **없다**: 비가 하나로 굳어 후보 목록이 태어나지 않는다", () => {
    for (const p of rows(E36, 60)) {
      expect(p.content).not.toMatch(/모두 구/);
      // 「인원이 같다고 본 값」이 참과 달라야 한다 — 그것이 이 갈래의 함정이다.
      const { avgA, avgB, riseA, riseB, x } = p.facts as Record<string, number>;
      expect((avgA! + riseA! + avgB! + riseB!) / 2, p.content).not.toBe(x);
    }
  });

  it("`37V` — 사는 후보의 자리가 씨앗마다 **갈린다** (양수 쪽·음수 쪽이 둘 다 나온다)", () => {
    let first = 0;
    let last = 0;
    for (const p of rows(E37, 240)) {
      const { m, q, n, k, r, x, wantNone } = p.facts as Record<string, number>;
      const cands = candidateRoots(m!, q!);
      expect(cands, p.content).toEqual([r!, -r!]);
      const live = survivingRoot(m!, q!, n!, k!, wantNone === 1);
      expect(live, p.content).toEqual([x!]);
      if (x === cands[0]) first += 1;
      if (x === cands[1]) last += 1;
      // ⓒ 상수항을 안 보고 두 후보를 다 적은 답은 참과 다르다.
      expect(
        survivingRoot(m!, q!, n!, k!, wantNone === 1, false),
        p.content,
      ).not.toEqual([x!]);
    }
    expect(first + last).toBe(240);
    // ⓐ·ⓑ 한쪽 자리만 늘 답이면 목록을 안 읽고 찍어도 맞는다.
    expect(first, "첫 자리가 늘 답이다").toBeGreaterThan(24);
    expect(last, "끝 자리가 늘 답이다").toBeGreaterThan(24);
  });

  it("`38V` — 답이 **가짓수**라 목록의 어느 자리도 답이 아니다 (실측으로 흔들리는지 센다)", () => {
    const counts = new Set<number>();
    let firstX = 0;
    let lastX = 0;
    for (const p of rows(E38, 240)) {
      const { x, xMin, xMax } = p.facts as Record<string, number>;
      counts.add(x!);
      if (xMin === x) firstX += 1;
      if (xMax === x) lastX += 1;
    }
    // 가짓수가 늘 같으면 세지 않고도 맞힌다.
    expect(
      counts.size,
      `가짓수가 ${[...counts].join(",")} 뿐이다`,
    ).toBeGreaterThanOrEqual(3);
    // 「첫 후보의 $x$」·「끝 후보의 $x$」를 그대로 답으로 낸 값이 늘 맞지는 않는다.
    expect(firstX, "첫 후보의 $x$ 가 늘 답이다").toBeLessThan(240);
    expect(lastX, "끝 후보의 $x$ 가 늘 답이다").toBeLessThan(240);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉡ 「굳힘이 항등식이면 조건을 지워도 답이 그대로다」
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 3차 — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`35V` — 「$-1$을 곱해 방향을 바꾼다」를 지우면 답이 달라진다 (전수)", () => {
    for (const p of rows(E35, 120)) {
      const { s1, s2, d1, d2, x, hi } = p.facts as Record<string, number>;
      const truth = rangeOfLetter(s1!, s2!, d1!, d2!);
      expect([truth.lo, truth.hi], p.content).toEqual([x!, hi!]);
      const erased = rangeOfLetter(s1!, s2!, d1!, d2!, false);
      expect([erased.lo, erased.hi], p.content).not.toEqual([x!, hi!]);
      // $x-y$ 의 범위를 흔들어도 답이 달라져야 한다 — 안 그러면 그 조건이 장식이다.
      const shaken = rangeOfLetter(s1!, s2!, d1!, d2! + 2);
      expect([shaken.lo, shaken.hi], p.content).not.toEqual([x!, hi!]);
    }
  });

  it("`36V` — 전체 평균을 흔들면 비가 바뀌고 답도 바뀐다 (전수)", () => {
    for (const p of rows(E36, 120)) {
      const { avgA, avgB, total, riseA, riseB, x } = p.facts as Record<
        string,
        number
      >;
      expect(newAverage(avgA!, avgB!, total!, riseA!, riseB!), p.content).toBe(
        x,
      );
      for (const shift of [-1, 1]) {
        const other = newAverage(avgA!, avgB!, total! + shift, riseA!, riseB!);
        expect(other, `${p.content} (전체 평균 ${shift})`).not.toBe(x);
      }
      // 전체 평균이 두 평균 밖이면 그런 반이 없다 — 함수가 그것을 말한다.
      expect(newAverage(avgA!, avgB!, avgA! + 1, riseA!, riseB!)).toBeNull();
      expect(newAverage(avgA!, avgB!, avgB! - 1, riseA!, riseB!)).toBeNull();
    }
  });

  it("`37V` — 「상수항 견주기」를 지우면 후보 둘이 그대로 남는다 (전수)", () => {
    for (const p of rows(E37, 120)) {
      const { m, q, n, k, wantNone, x } = p.facts as Record<string, number>;
      expect(
        survivingRoot(m!, q!, n!, k!, wantNone === 1).length,
        p.content,
      ).toBe(1);
      expect(
        survivingRoot(m!, q!, n!, k!, wantNone === 1, false).length,
        p.content,
      ).toBe(2);
      // 상수항을 흔들면 살아남는 후보가 바뀌거나 사라진다.
      const other = survivingRoot(m!, q!, n!, -k!, wantNone === 1);
      expect(other, p.content).not.toEqual([x!]);
    }
  });

  it("`38V` — 「각각 적어도 한 개씩」을 지우면 가짓수가 달라진다 (전수)", () => {
    for (const p of rows(E38, 120)) {
      const { p1, p2, p3, n, total, x } = p.facts as Record<string, number>;
      const prices: [number, number, number] = [p1!, p2!, p3!];
      expect(waysToBuy(prices, n!, total!, 1).length, p.content).toBe(x);
      expect(
        waysToBuy(prices, n!, total!, 0).length,
        p.content,
      ).toBeGreaterThan(x!);
      // 금액을 흔들면 조합이 통째로 달라진다 — 금액이 장식이 아니다.
      expect(waysToBuy(prices, n!, total! + 100, 1), p.content).not.toEqual(
        waysToBuy(prices, n!, total!, 1),
      );
      // 개수의 합을 흔들어도 마찬가지다.
      expect(waysToBuy(prices, n! + 1, total!, 1), p.content).not.toEqual(
        waysToBuy(prices, n!, total!, 1),
      );
    }
  });
});

/**
 * 굳힘 함수 자체의 눈금 — 손 계산과 맞대 본다.
 * 여기가 빨개지면 위의 ㉠·㉡ 판정도 못 믿는다.
 */
describe("중2 확대 갈래 3차 — 굳힘 함수", () => {
  it("`rangeOfLetter` 는 뒤집기를 실제로 한다 (브리프 손 실측)", () => {
    // $1\le x+y\le7$, $-3\le x-y\le1$ → $0\le y\le5$
    expect(rangeOfLetter(1, 7, -3, 1)).toEqual({ lo: 0, hi: 5 });
    // 뒤집지 않고 그대로 뺀 값 — 브리프가 실측으로 낸 $[2,3]$.
    expect(rangeOfLetter(1, 7, -3, 1, false)).toEqual({ lo: 2, hi: 3 });
    // 인자가 달라지면 답도 달라진다.
    expect(rangeOfLetter(1, 7, -3, 3)).not.toEqual(rangeOfLetter(1, 7, -3, 1));
  });

  it("`newAverage` 는 비만으로 다음 평균을 낸다 (브리프 손 실측)", () => {
    // $78$·$66$·$74$ → 비 $2:1$ · $+6$·$+3$ → $79$
    expect(newAverage(78, 66, 74, 6, 3)).toBe(79);
    // 전체 평균을 흔들면 비가 바뀌어 답이 달라진다.
    expect(newAverage(78, 66, 72, 6, 3)).toBe(76.5);
    expect(newAverage(78, 66, 74, 6, 3)).not.toBe(newAverage(78, 66, 72, 6, 3));
    // 전체 평균이 두 평균 밖이면 그런 반이 없다.
    expect(newAverage(78, 66, 80, 6, 3)).toBeNull();
    expect(newAverage(78, 66, 60, 6, 3)).toBeNull();
  });

  it("`candidateRoots`·`survivingRoot` — 후보 둘 중 상수항이 하나를 죽인다 (브리프 손 실측)", () => {
    expect(candidateRoots(3, 12)).toEqual([6, -6]);
    expect(candidateRoots(3, 11)).toEqual([]); // 완전제곱이 아니다
    // $k=12$ 면 $a=6$ 이 「무수히 많다」로 죽고 $a=-6$ 이 산다.
    expect(survivingRoot(3, 12, 6, 12, true)).toEqual([-6]);
    expect(survivingRoot(3, 12, 6, 12, false)).toEqual([6]);
    // $k=-12$ 면 **반대**가 된다 — 답의 부호가 씨앗에 매여 있지 않다.
    expect(survivingRoot(3, 12, 6, -12, true)).toEqual([6]);
    expect(survivingRoot(3, 12, 6, -12, false)).toEqual([-6]);
    // 상수항을 안 견주면 둘 다 남는다.
    expect(survivingRoot(3, 12, 6, 12, true, false)).toEqual([6, -6]);
  });

  it("`waysToBuy` 는 자연수 조건을 실제로 본다 (브리프 손 실측)", () => {
    const prices: [number, number, number] = [700, 500, 300];
    expect(waysToBuy(prices, 10, 5600, 1)).toEqual([
      [4, 5, 1],
      [5, 3, 2],
      [6, 1, 3],
    ]);
    // 「적어도 한 개씩」을 지우면 $(3,7,0)$ 이 살아 네 가지가 된다.
    expect(waysToBuy(prices, 10, 5600, 0).length).toBe(4);
    expect(waysToBuy(prices, 10, 5600, 0)).toContainEqual([3, 7, 0]);
    // 🔴 그리고 **조건이 장식인 자리도 실재한다** — 그래서 생성기가 그것을 걸러야
    //    뜻이 있다(안 그러면 「지우면 달라진다」가 저절로 참인 동어반복이다).
    expect(waysToBuy([800, 400, 200], 10, 4600, 1).length).toBe(3);
    expect(waysToBuy([800, 400, 200], 10, 4600, 0).length).toBe(3);
  });
});

/**
 * 🔴 **이 회차가 실제로 물린 결함** — 되돌아오면 여기서 빨개진다.
 *
 * 셋 다 **값 검산이 구조적으로 못 보는** 부류다(답은 맞는다). 해설을 눈으로 읽어서 나왔다.
 */
describe("중2 확대 갈래 3차 — 물린 결함의 회귀 잠금", () => {
  it("⑴ 「나누다」 뒤 조사를 목적격으로 짓지 않는다 — 첫 판이 「양변을 $2$를 나누면」이었다", () => {
    // 🔴 값·냄새·렌더가 **전부 초록**인 채로 지면에 나가던 자리다. 공용 조사 자
    //    (`josaMismatches`)는 「(으)로」축을 구조적으로 못 본다.
    let seen = 0;
    for (const p of rows(E38, 60)) {
      expect(p.solution, "38V 목적격으로 지었다").not.toMatch(
        /\$-?\d+\$[을를] 나누면/,
      );
      // 「$d$(으)로 나누면」이 실제로 **두 자리**(백원 나누기 · 소거식 나누기)에 있다.
      expect(
        (p.solution.match(/\$-?\d+\$(?:으로|로) 나누면/g) ?? []).length,
        "38V",
      ).toBe(2);
      seen += 1;
    }
    expect(seen).toBe(60);
    // 양성 대조 — 일부러 틀린 글을 대어 **검출기가 도는 것**을 회차마다 보인다.
    expect(euroRoMismatches("양변을 $100$로 나누면")).toEqual([
      "$…100$로 → 으로",
    ]);
    expect(euroRoMismatches("양변을 $2$으로 나누면")).toEqual([
      "$…2$으로 → 로",
    ]);
    // 음성 대조 — 옳은 글은 안 문다. 「거짓 경보는 가드를 끈다」(2026-08-20).
    expect(euroRoMismatches("양변을 $100$으로 나누면")).toEqual([]);
    expect(euroRoMismatches("양변을 $2$로 나누면")).toEqual([]);
  });

  it("⑵ 「…이므로 …이므로」가 한 문장에 겹치지 않는다 — 첫 판의 `37V` 가 그랬다", () => {
    for (const e of M2_TOP_3) {
      for (const p of rows(e, 40)) {
        for (const line of p.solution.split("\n")) {
          const n = (line.match(/이므로/g) ?? []).length;
          expect(
            n,
            `${e.rpmType} 한 줄에 「이므로」가 ${n}번: ${line}`,
          ).toBeLessThanOrEqual(2);
          // 같은 마디 안에서 잇달아 겹치면 문장이 안 된다.
          expect(line, `${e.rpmType}: ${line}`).not.toMatch(
            /이므로[^.]{0,12}이므로/,
          );
        }
      }
    }
  });

  it("⑶ 해설에 마크다운 굵게 표시(`**`)를 쓰지 않는다 — 지면에 그대로 나가고 냄새 자가 문다", () => {
    for (const e of M2_TOP_3) {
      for (const p of rows(e, 30)) {
        expect(p.solution, `${e.rpmType}`).not.toContain("**");
      }
    }
    // 냄새 자의 그 축이 살아 있는지 같이 본다 — 0 은 «깨끗»과 «못 셈»을 안 가른다.
    expect(pageSmells("$a$ 와 $b$ 는 **다르다**")).toContain(
      "연산자가 붙어 있다",
    );
  });

  it("⑷ 🔴 `38V` 의 답에 「가지」를 붙이지 않는다 — 공용 조사 자가 단위 명사를 조사로 읽는다", () => {
    // 🔴 `josaMismatches` 는 `$3$가지` 의 「가」를 **주격 조사**로 읽어 거짓 경보를
    //    낸다(단위 명사인데). 남의 파일이라 고치지 않고 **피한다** — 그 대신
    //    「가짓수」를 묻는다. 그 자의 이 성질이 살아 있는 동안은 이 규약을 지켜야 한다.
    expect(josaMismatches("$3$가지")).toEqual(["$…3$가 → 이"]);
    for (const p of rows(E38, 30)) {
      expect(p.answer).toMatch(/^\$\d+\$$/);
      expect(p.content).toContain("가짓수를 구하시오");
      expect(`${p.content}\n${p.answer}\n${p.solution}`).not.toMatch(
        /\$\d+\$가지/,
      );
    }
  });
});
