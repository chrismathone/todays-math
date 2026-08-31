/**
 * **중2 난이도 «높이» 계량기** — 벤치마킹 조사(`tracks/briefs/mid-tier-bench.md`)의 자.
 *
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --selftest   # 이 자가 눈이 멀었나
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --tiers      # 갈래 분포 · 유형 안 흔들림
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --axes       # 🔴 후보 축 나란히 (물음 ④)
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --keys       # 되짚기 열쇠를 낱개로
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --nodes      # 되짚기 «마디 수» 사다리 (④ ㉠)
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --coverage   # 소단원마다 어느 갈래가 서나
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --sixgrade   # 6단에 댈 신호 Ⓐ~Ⓔ
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --thin       # 「얇다」를 셀 수 있는 형태로
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --loaded     # 적재 원장 ↔ 등록 유형 대조
 *     npx tsx scripts/qa/census-tier-frames-m2.ts --chapters   # 중단원마다 심화하가 무엇을 시키나
 *
 * ## 🔴 이 자가 재는 것과 **못 재는 것**
 *
 * 재는 것은 전부 **지면의 모양**이다 — 발문·정답·해설 문자열. 「어려운가」는 지면에
 * 없다(초등 벤치가 열쇠 셋을 전 학년에 대 보고 전부 버렸다). 그러므로 아래 어느 수치도
 * 「이 갈래가 더 어렵다」를 뜻하지 않는다. 뜻하는 것은 **「이 모양이 갈래를 가르나」**뿐이다.
 *
 * 그리고 **0 은 «깨끗»과 «못 셈»을 안 가른다.** 그래서 `--selftest` 가 두 가지를 본다:
 *   ㉠ 손으로 지은 **양성·음성**에 검출기가 옳게 답하나 (검출기가 살아 있나)
 *   ㉡ **살아 있는 엔진**의 표본에서 그 검출기가 한 번이라도 무나 (모집단에 그 자리가 있나)
 * ㉡ 이 없으면 「축이 안 갈린다」가 «축이 없다»인지 «내 열쇠가 샌다»인지 못 가른다
 *    — D-115 ⑽ 이 초4 에서 실제로 물린 자리다.
 *
 * ## 모집단 — **하나다** (초등과 다른 자리)
 *
 * 초등은 갈래(`generateElementaryProblem`)와 문형(`generateElementaryForm`) 둘인데
 * 적재기는 문형만 돈다. 중등은 **적재기도 판정기도 `generateMiddleProblem` 하나**를
 * 부른다(`load-engine-problems.ts:256`). 그래서 이 자도 같은 함수를 부른다.
 * 다만 결합형(`middle/combo.ts` 의 `families`)은 `registeredTypes()` 밖이라 **여기서도
 * 안 보인다** — 그 사실을 `--loaded` 가 찍는다.
 */
import { readFileSync } from "node:fs";

import { countCalcSteps } from "../../src/lib/elementary/make";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { middleComboDefinitions } from "../../src/lib/middle/combo";
import type { TypeEntry } from "../../src/lib/middle/types";

// 「식만 주는 발문」의 열쇠는 **새로 짓지 않는다** — D-106 이 873유형 census 로 고른 것을
// 그대로 쓴다.
//
// 🔴 **`probe-middle-tier-4dan.ts` 에서 import 하면 안 된다.** 그 파일은 main 가드가
//    **없어서** import 하는 순간 전량 쓸기가 돌고 `process.exitCode = 1`(미검토 2건)까지
//    남긴다 — 내 스크립트가 그 종료 코드를 뒤집어쓴다. 실제로 한 번 물렸다.
//    g5 §7 「판정기를 import 했더니 그 판정기가 실행됐다」와 같은 자리다. 그래서
//    **부작용 없는 규칙 모듈**에서 가져와 여기서 두 조각을 잇는다.
import { loneInstruction } from "../../src/lib/middle/tier";
import { OPERATION_INSTRUCTION_WORDS } from "./tier4Rules";

import { isDirectScript } from "../import/isDirectScript";

const GRADE = "중2";
const SEEDS = [20260831, 7, 1234, 99991];
const VARIANTS = [0, 1, 2];
/** 사다리 차례 — 화면·표의 열 순서를 여기 한 곳에서 정한다. */
const TIERS = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;

export type Sample = {
  key: string;
  section: string;
  minor: string;
  book: string;
  title: string;
  seed: number;
  variant: number;
  tier: string;
  content: string;
  answer: string;
  solution: string;
  hasFigure: boolean;
};

export function m2Types(): TypeEntry[] {
  return registeredTypes().filter((e) => e.grade === GRADE);
}

export function buildCorpus(): Sample[] {
  const out: Sample[] = [];
  for (const e of m2Types())
    for (const seed of SEEDS)
      for (const variant of VARIANTS) {
        const p = generateMiddleProblem(e.key, seed, variant);
        out.push({
          key: e.key,
          section: e.unitSection,
          minor: e.rpmMinor,
          book: e.rpmBook,
          title: e.rpmTitle,
          seed,
          variant,
          tier: p.difficulty,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          hasFigure: !!p.figureSpec,
        });
      }
  return out;
}

/* ── 검출기 ──────────────────────────────────────────────────────────────
 * 낱말을 손으로 짓는 것이 이 저장소가 여러 번 데인 자리라, 아래 열쇠는 **중2 말뭉치
 * 6,864건의 한글 조각 census 에서 골랐다**(1~2낱말, 40회 이상 등장한 671+595종을
 * 심화하 쏠림 순으로 늘어놓고 읽었다). 그래도 «샌다» — 그래서 `--selftest` ㉡ 가
 * 「살아 있는 표본에서 무는가」를 같이 본다.
 */

/** 수식을 지우고 한글만 남긴다 — 「$a$ 대입」의 $a$ 가 낱말에 섞이지 않게. */
export const stripMath = (s: string): string => s.replace(/\$[^$]*\$/g, " ◇ ");

/** ㉮ 되짚기-해설 — 구한 값을 조건에 **도로 넣는다**. */
export const BACKSOLVE_SOLUTION =
  /대입(하면|하여|하자|해|한)|검산|거꾸로|역으로|반대로 (하면|계산)/;

/** ㉯ 되짚기-발문 — «결과»를 주고 «원인»을 묻는다. */
export const BACKSOLVE_CONTENT =
  /상수|어떤 (수|다항식|식|자연수|정수)|잘못|처음|원래|되도록|이려면|이어야|여야|만족(시키|하)/;

/** ㉰ 미지수 도입 — 중등의 «기본 도구»(방정식 세우기). 축이 되는지가 물음이다. */
export const UNKNOWN_INTRO = /라 (하면|하자|놓으면|하고)|놓으면/;

/**
 * ㉱ 열거 — 해설이 **같은 연산의 계산을 몇 개나 늘어놓나**.
 * 초등 자(`probe-elem-tier-enumeration.ts`)와 **같은 규칙**을 여기 옮겨 적지 않으려
 * 했으나, 그 파일은 최상위에서 초등 엔진 전량을 물고 온다(g5 §7 가 데인 자리).
 * 그래서 **규칙만** 옮기고, 두 벌이 갈리지 않게 아래 눈금이 초등 자의 실측 예시를
 * 그대로 쓴다.
 */
export function enumeratedSteps(solution: string): number {
  const byOp = new Map<string, number>();
  for (const m of solution.matchAll(/\$[^$]*=[^$]*\$/g)) {
    const c = m[0];
    const op = c.includes("times")
      ? "x"
      : c.includes("div")
        ? "d"
        : c.includes("+")
          ? "+"
          : c.includes("-")
            ? "-"
            : "";
    if (!op) continue;
    byOp.set(op, (byOp.get(op) ?? 0) + 1);
  }
  return Math.max(0, ...byOp.values());
}

/** ㉲ 조건절 — 발문이 조건을 몇 개 겹치나. */
export function conditionCount(content: string): number {
  return (stripMath(content).match(/일 때|이고|이며|하자|라 하|이면/g) ?? [])
    .length;
}

/**
 * ㉳ 미지수 — 발문 수식 안 서로 다른 소문자.
 *
 * ⚠️ **첫 판은 「앞뒤에 글자가 없는 홑 소문자」만 셌고, 그래서 `ax+by=1` 에서 0 을
 *    냈다.** 중등 발문의 대부분이 그 꼴이라 그 검출기는 구조적으로 눈이 멀어 있었다 —
 *    `--selftest` 의 양성 눈금이 그것을 잡았다. LaTeX 에서 붙어 있는 소문자는 곱이지
 *    한 낱말이 아니므로 **낱글자마다 센다.**
 *
 * 단위(`\mathrm{cm}`)·글(`\text{…}`)은 변수가 아니므로 **중괄호째** 먼저 지운다.
 * 안 지우면 `cm` 이 미지수 `c`·`m` 으로 새고, 실측 2,000행이 그렇게 부푼다.
 */
export function unknownCount(content: string): number {
  const set = new Set<string>();
  for (const m of content.matchAll(/\$([^$]*)\$/g)) {
    const body = m[1]!
      .replace(/\\(?:mathrm|text|operatorname|mathbf)\s*\{[^{}]*\}/g, " ")
      .replace(/\\[a-zA-Z]+/g, " ");
    for (const c of body.matchAll(/[a-z]/g)) set.add(c[0]!);
  }
  return set.size;
}

/** ㉴ 계산 걸음 — **제품 함수 그대로**(`src/lib/elementary/make.ts`). 두 벌을 안 둔다. */
export const calcSteps = (solution: string): number => countCalcSteps(solution);

/**
 * **D-115 잣대의 직역 — 「되짚기 사슬의 마디」가 몇 개인가.**
 *
 * D-115 는 심화하를 「사슬의 **마디마다 값이 하나로 굳는다**」로 정의한다. 지면에서
 * 그 «굳음»의 자국은 `기호 = 수` 꼴이다 — `a=5` · `\angle B=64^\circ` ·
 * `\overline{AD}=6`. 그래서 이 자는 **해설 안에서 그 꼴이 몇 번 나오나**를 센다.
 *
 * ⚠️ 이것은 «마디 수»의 **하한**이다. 값이 문자로만 굳는 마디(`x=2a-1`)는 안 센다 —
 *    넣으면 전개 한 줄이 전부 마디가 되어 계산 자체와 구분이 안 된다. 그리고
 *    **«굳지 않는 마디»는 못 본다**(그게 심화중·심화상을 가르는 것인데, 지면에는
 *    굳은 결과만 찍힌다). 그러므로 이 축은 사다리의 **밑동**만 잰다.
 */
export function pinnedNodes(solution: string): number {
  let n = 0;
  for (const m of solution.matchAll(/\$([^$]*)\$/g)) {
    const body = m[1]!;
    // 오른쪽이 **수 하나로 끝나야** 마디다. `x=2a-1` 처럼 뒤에 문자나 연산이 이어지면
    // 그것은 값이 굳은 자리가 아니라 식을 옮겨 적은 자리다 — 눈금이 그것을 잡았다.
    n += [
      ...body.matchAll(
        /(?:\\angle\s*[A-Z]+|\\overline\{[A-Z]+\}|[A-Za-z])\s*=\s*-?\d+(?:\.\d+)?(?![\d.]*[a-zA-Z])(?!\s*(?:[+\-/]|\\times|\\div|\\cdot))/g,
      ),
    ].length;
  }
  return n;
}

/** 해설의 등식 개수 — «사슬이 길다»를 재는 가장 무딘 자. */
export function equationCount(solution: string): number {
  return [...solution.matchAll(/\$([^$]*)\$/g)].filter((m) =>
    m[1]!.includes("="),
  ).length;
}

/**
 * ㉵ 학년 안 개념 결합 — 해설이 **그 문항의 소단원 밖** 중2 소단원 이름을 부르나.
 * 어휘를 손으로 짓지 않는다: 살아 있는 `registeredTypes()` 의 `unitSection` 이 곧 목록이다.
 */
const SECTION_TERMS: { section: string; terms: string[] }[] = [];
function sectionTerms(): { section: string; terms: string[] }[] {
  if (SECTION_TERMS.length) return SECTION_TERMS;
  const seen = new Set<string>();
  for (const e of m2Types()) {
    if (seen.has(e.unitSection)) continue;
    seen.add(e.unitSection);
    // 「의」 앞 머리 + 괄호 앞 머리만 남긴다 — 「연립방정식의 활용(농도…)」 → 「연립방정식」
    const head = e.unitSection.split("(")[0]!.split("의")[0]!.trim();
    const terms = [head].filter((t) => t.length >= 3);
    if (terms.length) SECTION_TERMS.push({ section: e.unitSection, terms });
  }
  return SECTION_TERMS;
}
export function foreignConcepts(s: Sample): number {
  const text = stripMath(s.solution);
  let n = 0;
  for (const { section, terms } of sectionTerms()) {
    if (section === s.section) continue;
    if (terms.some((t) => text.includes(t))) n += 1;
  }
  return n;
}

type Axis = {
  name: string;
  /** 이 축이 «무엇을 뜻하나» 한 줄 — 표에 같이 찍는다. */
  says: string;
  hit: (s: Sample) => boolean;
};

export function axes(): Axis[] {
  return [
    {
      name: "㉮ 되짚기-해설",
      says: "해설이 구한 값을 조건에 도로 넣는다",
      hit: (s) => BACKSOLVE_SOLUTION.test(stripMath(s.solution)),
    },
    {
      name: "㉯ 되짚기-발문",
      says: "발문이 결과를 주고 원인을 묻는다",
      hit: (s) => BACKSOLVE_CONTENT.test(stripMath(s.content)),
    },
    {
      name: "㉰ 되짚기 마디 ≥2",
      says: "해설에서 «기호=수»로 값이 굳는 자리가 둘 이상 (D-115 직역)",
      hit: (s) => pinnedNodes(s.solution) >= 2,
    },
    {
      name: "㉪ 미지수 도입",
      says: "해설이 «…라 하면»으로 식을 세운다",
      hit: (s) => UNKNOWN_INTRO.test(stripMath(s.solution)),
    },
    {
      name: "㉱ 열거 ≥3",
      says: "해설이 같은 연산 계산을 셋 이상 늘어놓는다",
      hit: (s) => enumeratedSteps(s.solution) >= 3,
    },
    {
      name: "㉲ 조건절 ≥3",
      says: "발문이 조건을 셋 이상 겹친다",
      hit: (s) => conditionCount(s.content) >= 3,
    },
    {
      name: "㉳ 미지수 ≥2",
      says: "발문에 서로 다른 미지수가 둘 이상",
      hit: (s) => unknownCount(s.content) >= 2,
    },
    {
      name: "㉴ 계산걸음 ≥2",
      says: "해설에 계산이 든 걸음이 둘 이상 (제품 함수)",
      hit: (s) => calcSteps(s.solution) >= 2,
    },
    {
      name: "㉵ 해설 등식 ≥3",
      says: "해설의 사슬이 길다 (등식 셋 이상)",
      hit: (s) => equationCount(s.solution) >= 3,
    },
    {
      name: "㉶ 개념 결합 ≥1",
      says: "해설이 그 소단원 밖 중2 개념을 부른다",
      hit: (s) => foreignConcepts(s) >= 1,
    },
  ];
}

/* ── 축 견주기 ───────────────────────────────────────────────────────────── */

export type AxisScore = {
  name: string;
  says: string;
  /** 갈래별 적중률(%) — TIERS 차례 */
  pct: number[];
  /** 전체 적중 건수. **0 이면 이 축은 못 센다** («깨끗»이 아니다). */
  hits: number;
  /** 심화하% ÷ (연산·기본·응용 중 최대%) */
  ratio: number;
  /** 심화하% ÷ 응용% — **꼭대기 한 칸**만 견준다. 사다리 밑동은 가르는데 위는
   *  못 가르는 축이 있어서, 이 둘을 따로 찍어야 «어디를 가르나»가 보인다. */
  topRatio: number;
  /** 반증 ④ 중등판 — 소단원마다 심화하율과 하위율을 견준다 */
  sep: { split: number; tie: number; flip: number; blind: number };
};

/**
 * **반증 ④ 의 중등판.** 초등은 소단원마다 갈래가 하나씩이라 「하위 갈래가 이 잣대를
 * 통과하면 안 갈린다」를 문항 단위로 물을 수 있었다. 중등은 한 소단원에 유형이 10개
 * 쯤이고 갈래가 유형마다 다르므로, **소단원 안에서 적중«률»을 견준다.**
 *
 *   갈림   심화하율 > 하위율      이 소단원에서 축이 위를 가리킨다
 *   동률   같다
 *   뒤집힘 심화하율 < 하위율      **하위가 더 많이 문다 — 이 소단원에서 축이 뒤집혔다**
 *   못잼   심화하 표본 0 또는 하위 표본 0
 */
export function separation(rows: Sample[], hit: (s: Sample) => boolean) {
  const per = new Map<
    string,
    { deep: number; deepHit: number; low: number; lowHit: number }
  >();
  for (const r of rows) {
    const v = per.get(r.section) ?? { deep: 0, deepHit: 0, low: 0, lowHit: 0 };
    const isDeep = r.tier.startsWith("심화");
    if (isDeep) {
      v.deep += 1;
      if (hit(r)) v.deepHit += 1;
    } else {
      v.low += 1;
      if (hit(r)) v.lowHit += 1;
    }
    per.set(r.section, v);
  }
  let split = 0,
    tie = 0,
    flip = 0,
    blind = 0;
  for (const v of per.values()) {
    if (v.deep === 0 || v.low === 0) {
      blind += 1;
      continue;
    }
    const d = v.deepHit / v.deep;
    const l = v.lowHit / v.low;
    if (d > l) split += 1;
    else if (d === l) tie += 1;
    else flip += 1;
  }
  return { split, tie, flip, blind };
}

export function scoreAxes(rows: Sample[]): AxisScore[] {
  const n: Record<string, number> = {};
  for (const t of TIERS) n[t] = rows.filter((r) => r.tier === t).length;
  return axes().map((ax) => {
    const pct = TIERS.map((t) => {
      const sub = rows.filter((r) => r.tier === t);
      return sub.length ? (sub.filter(ax.hit).length / sub.length) * 100 : NaN;
    });
    const lower = Math.max(pct[0] || 0, pct[1] || 0, pct[2] || 0);
    return {
      name: ax.name,
      says: ax.says,
      pct,
      hits: rows.filter(ax.hit).length,
      ratio: lower === 0 ? Infinity : (pct[3] || 0) / lower,
      topRatio: (pct[2] || 0) === 0 ? Infinity : (pct[3] || 0) / (pct[2] || 0),
      sep: separation(rows, ax.hit),
    };
  });
}

/* ── 눈금 ────────────────────────────────────────────────────────────────
 * ㉠ 손으로 지은 양성·음성 — 검출기가 «아니오»를 낼 수 있나.
 *    문자열은 **중2 지면에서 실제로 본 꼴**을 본떠 지었다(저작권 때문에 외부 교재
 *    문항은 한 글자도 안 쓴다 — 브리프 §0 ㉠).
 */
type Gauge = { label: string; ok: () => boolean };

function gauges(): Gauge[] {
  const sample = (over: Partial<Sample>): Sample => ({
    key: "x",
    section: "s",
    minor: "m",
    book: "2-1",
    title: "t",
    seed: 0,
    variant: 0,
    tier: "기본",
    content: "",
    answer: "",
    solution: "",
    hasFigure: false,
    ...over,
  });
  return [
    {
      label: "양성 ㉮ — 「대입하면」은 되짚기 자국이다",
      ok: () =>
        BACKSOLVE_SOLUTION.test(stripMath("$x=2$를 대입하면 $a=5$이다.")),
    },
    {
      label: "음성 ㉮ — 「대입」이 없는 순방향 해설은 아니다",
      ok: () =>
        !BACKSOLVE_SOLUTION.test(stripMath("$3x+2=11$이므로 $x=3$이다.")),
    },
    {
      label: "음성 ㉮ — 수식 안 글자가 낱말로 새면 안 된다",
      ok: () => !BACKSOLVE_SOLUTION.test(stripMath("$\\overline{검산}$")),
    },
    {
      label: "양성 ㉯ — 「상수 $a$의 값」은 결과→원인이다",
      ok: () =>
        BACKSOLVE_CONTENT.test(stripMath("해가 $x=1$일 때, 상수 $a$의 값은?")),
    },
    {
      label: "음성 ㉯ — 맨 계산 지시는 아니다",
      ok: () => !BACKSOLVE_CONTENT.test(stripMath("다음 식을 간단히 하시오.")),
    },
    {
      label: "양성 ㉰ — 「…라 하면」은 미지수 도입이다",
      ok: () => UNKNOWN_INTRO.test(stripMath("두 수를 $x$, $y$라 하면")),
    },
    {
      label: "음성 ㉰ — 「구하면」은 도입이 아니다",
      ok: () => !UNKNOWN_INTRO.test(stripMath("$x$를 구하면 $2$이다.")),
    },
    {
      label: "양성 ㉱ — 같은 연산 셋을 늘어놓으면 3",
      ok: () =>
        enumeratedSteps("$2\\times1=2$, $2\\times2=4$, $2\\times3=6$이므로") ===
        3,
    },
    {
      label: "음성 ㉱ — 연산이 다르면 안 쌓인다",
      ok: () => enumeratedSteps("$2+1=3$, $2\\times2=4$이다.") === 1,
    },
    {
      label: "양성 ㉲ — 조건 셋을 겹치면 3",
      ok: () => conditionCount("$a>0$이고 $b<0$이며 $a+b=1$일 때") === 3,
    },
    {
      label: "음성 ㉲ — 조건이 없으면 0",
      ok: () => conditionCount("다음을 계산하시오.") === 0,
    },
    {
      label: "양성 ㉳ — 붙어 있는 소문자도 곱이다 ($ax+by$ 는 넷)",
      ok: () => unknownCount("$ax+by=1$") === 4,
    },
    {
      label: "음성 ㉳ — 명령어·대문자 라벨은 미지수가 아니다",
      ok: () => unknownCount("$\\triangle ABC$에서 $\\angle A$") === 0,
    },
    {
      label: "음성 ㉳ — 단위 $\\mathrm{cm}$ 이 미지수로 새면 안 된다",
      ok: () => unknownCount("$\\overline{AB}=6\\,\\mathrm{cm}$") === 0,
    },
    {
      label: "양성 ㉴ — 제품 함수가 계산 걸음 둘을 센다",
      ok: () => calcSteps("$2+3=5$이고 $5\\times2=10$이다.") === 2,
    },
    {
      label: "음성 ㉴ — 계산이 없으면 0",
      ok: () => calcSteps("두 삼각형은 합동이다.") === 0,
    },
    {
      label: "양성 ㉰ — 「$a=5$이고 $\\angle B=64^\\circ$」는 마디 둘",
      ok: () => pinnedNodes("$a=5$이고 $\\angle B=64^\\circ$이다.") === 2,
    },
    {
      label: "음성 ㉰ — 문자로만 굳는 자리는 마디로 안 센다",
      ok: () => pinnedNodes("$x=2a-1$이다.") === 0,
    },
    {
      label: "양성 ㉵ — 등식 둘을 센다",
      ok: () => equationCount("$2+3=5$, $4=4$, $x$") === 2,
    },
    {
      label: "음성 ㉵ — 등식이 없으면 0",
      ok: () => equationCount("$2+3$ 이다.") === 0,
    },
    {
      label: "음성 — 표본 하나가 모든 축에 걸리면 축이 아니다 (맨 계산 발문)",
      ok: () => {
        const s = sample({
          content: "다음 식을 계산하시오.\n$2x+3x$",
          answer: "$5x$",
          solution: "$2x+3x=5x$이다.",
          tier: "연산",
        });
        return axes().filter((a) => a.hit(s)).length <= 2;
      },
    },
  ];
}

/**
 * ㉡ **살아 있는 엔진에 대어 「이 검출기가 한 번이라도 무는가」**를 본다.
 *    0 이면 그 축의 「안 갈린다」는 «축이 없다»가 아니라 **«내 열쇠가 샌다»**다.
 */
function liveProbe(rows: Sample[]): { name: string; hits: number }[] {
  return axes().map((ax) => ({
    name: ax.name,
    hits: rows.filter(ax.hit).length,
  }));
}

/* ── 출력 ────────────────────────────────────────────────────────────────── */

const pctCell = (v: number) => (Number.isNaN(v) ? "    —" : v.toFixed(1) + "%");

function showTiers(rows: Sample[]): void {
  const n = new Map<string, number>();
  for (const r of rows) n.set(r.tier, (n.get(r.tier) ?? 0) + 1);
  console.log(
    `모집단 ${rows.length} (중2 유형 ${m2Types().length} × 씨앗 ${SEEDS.length} × 변형 ${VARIANTS.length})`,
  );
  console.log("\n갈래 분포");
  for (const t of TIERS) {
    const c = n.get(t) ?? 0;
    console.log(
      `  ${t.padEnd(5)} ${String(c).padStart(6)}  ${((c / rows.length) * 100).toFixed(1)}%`,
    );
  }
  const extra = (n.get("심화중") ?? 0) + (n.get("심화상") ?? 0);
  console.log(
    `\nD-113 ⑼ 「중등은 아직 핵심 넷만 낸다」 → 확대 갈래 ${extra}건 ${extra === 0 ? "· 지금도 참" : "· **거짓이 됐다**"}`,
  );

  // 유형 안에서 갈래가 흔들리는가 — 난이도는 «유형»이 아니라 «문항»의 성질이다
  const per = new Map<string, Set<string>>();
  for (const r of rows) {
    const s = per.get(r.key) ?? new Set<string>();
    s.add(r.tier);
    per.set(r.key, s);
  }
  const wob = [...per].filter(([, s]) => s.size > 1);
  console.log(`\n한 유형 안에서 갈래가 흔들리는 유형 ${wob.length}개`);
  for (const [k, s] of wob) console.log(`  · ${k} → ${[...s].join(", ")}`);
}

function showAxes(rows: Sample[]): void {
  const scores = scoreAxes(rows);
  console.log(
    `모집단 ${rows.length} · 소단원 ${new Set(rows.map((r) => r.section)).size}`,
  );
  console.log(
    "\n축".padEnd(18) +
      TIERS.slice(0, 4)
        .map((t) => t.padStart(8))
        .join("") +
      "   배율  응용대비  갈림/동률/뒤집힘/못잼   적중",
  );
  for (const s of [...scores].sort((a, b) => b.topRatio - a.topRatio)) {
    console.log(
      s.name.padEnd(18) +
        s.pct
          .slice(0, 4)
          .map((p) => pctCell(p).padStart(8))
          .join("") +
        (s.ratio === Infinity ? "     ∞" : s.ratio.toFixed(2).padStart(7)) +
        (s.topRatio === Infinity
          ? "     ∞"
          : s.topRatio.toFixed(2).padStart(9)) +
        `   ${String(s.sep.split).padStart(2)}/${String(s.sep.tie).padStart(2)}/${String(s.sep.flip).padStart(2)}/${String(s.sep.blind).padStart(2)}` +
        String(s.hits).padStart(9),
    );
  }
  console.log(
    "\n배율 = 심화하% ÷ (연산·기본·응용 최대%) · 응용대비 = 심화하% ÷ 응용%.",
  );
  console.log(
    "**둘 다 1 보다 크지 않으면 그 축은 꼭대기를 안 가리킨다.** (초등 되짚기 축은 22~40배였다 — D-115 ⑵)",
  );
  console.log(
    "갈림/뒤집힘 = 소단원마다 심화하 적중률과 하위 적중률을 견준 것 (반증 ④ 중등판).",
  );
  const dead = scores.filter((s) => s.hits === 0);
  if (dead.length)
    console.log(
      `\n🔴 살아 있는 표본에서 한 번도 안 문 축 ${dead.length}개 — 그 0 은 «깨끗»이 아니라 «못 셈»이다: ${dead.map((d) => d.name).join(", ")}`,
    );
}

/**
 * 브리프 물음 ④ ㉠ — **갈래마다 「되짚기 사슬의 마디 수」 분포.**
 * 축이 «있나 없나»가 아니라 «몇 마디인가»를 봐야 사다리가 오르는지 보인다.
 */
function showNodes(rows: Sample[]): void {
  console.log("갈래별 «되짚기 마디»(기호=수) 수 — 평균과 꼬리");
  console.log(
    "\n갈래".padEnd(8) +
      "평균".padStart(8) +
      "≥1".padStart(9) +
      "≥2".padStart(9) +
      "≥3".padStart(9) +
      "≥4".padStart(9) +
      "표본".padStart(8),
  );
  for (const t of TIERS) {
    const sub = rows.filter((r) => r.tier === t);
    if (!sub.length) continue;
    const v = sub.map((r) => pinnedNodes(r.solution));
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    const at = (k: number) =>
      ((v.filter((x) => x >= k).length / v.length) * 100).toFixed(1) + "%";
    console.log(
      t.padEnd(8) +
        avg.toFixed(2).padStart(8) +
        at(1).padStart(9) +
        at(2).padStart(9) +
        at(3).padStart(9) +
        at(4).padStart(9) +
        String(v.length).padStart(8),
    );
  }
  console.log(
    "\n같은 자로 계산 걸음(제품 함수)도 찍는다 — 「사슬이 긴가」는 「되짚는가」와 다른 물음이다.",
  );
  console.log(
    "\n갈래".padEnd(8) +
      "걸음평균".padStart(10) +
      "등식평균".padStart(10) +
      "해설글자".padStart(10),
  );
  for (const t of TIERS) {
    const sub = rows.filter((r) => r.tier === t);
    if (!sub.length) continue;
    const mean = (f: (s: Sample) => number) =>
      sub.reduce((a, r) => a + f(r), 0) / sub.length;
    console.log(
      t.padEnd(8) +
        mean((r) => calcSteps(r.solution))
          .toFixed(2)
          .padStart(10) +
        mean((r) => equationCount(r.solution))
          .toFixed(2)
          .padStart(10) +
        mean((r) => r.solution.length)
          .toFixed(0)
          .padStart(10),
    );
  }
}

/**
 * **되짚기 축을 낱개 열쇠로 쪼개어 본다** — 합쳐 놓으면 «어느 조각이 새는지» 안 보인다.
 * 물음 ④ 의 답이 「축이 없다」인지 「내 합성 열쇠가 무디다」인지 가르는 자리다.
 */
function showKeys(rows: Sample[]): void {
  const KEYS: [string, RegExp, "content" | "solution"][] = [
    ["상수", /상수/, "content"],
    ["어떤 수/식", /어떤 (수|다항식|식|자연수|정수)/, "content"],
    ["잘못", /잘못/, "content"],
    ["처음/원래", /처음|원래/, "content"],
    ["되도록", /되도록/, "content"],
    ["이려면/이어야", /이려면|이어야|여야/, "content"],
    ["만족", /만족(시키|하)/, "content"],
    ["해가 ~", /해가/, "content"],
    ["대입", /대입(하면|하여|하자|해|한)/, "solution"],
    ["검산", /검산/, "solution"],
    ["거꾸로/역으로", /거꾸로|역으로/, "solution"],
    ["라 하면", /라 (하면|하자|놓으면|하고)/, "solution"],
    ["경우를 나누", /경우(를|로)? ?나누|경우가|각각의 경우/, "solution"],
  ];
  const out = KEYS.map(([name, re, field]) => {
    const pct = TIERS.slice(0, 4).map((t) => {
      const sub = rows.filter((r) => r.tier === t);
      return sub.length
        ? (sub.filter((r) => re.test(stripMath(r[field]))).length /
            sub.length) *
            100
        : NaN;
    });
    const n = rows.filter((r) => re.test(stripMath(r[field]))).length;
    const lower = Math.max(pct[0] || 0, pct[1] || 0, pct[2] || 0);
    return {
      name,
      pct,
      n,
      ratio: lower === 0 ? Infinity : (pct[3] || 0) / lower,
    };
  }).sort((a, b) => b.ratio - a.ratio);
  console.log(
    "되짚기 열쇠를 낱개로 — 어느 조각도 위를 안 가리키면 축이 없는 것이다\n",
  );
  console.log(
    "열쇠".padEnd(16) +
      TIERS.slice(0, 4)
        .map((t) => t.padStart(8))
        .join("") +
      "   배율      n",
  );
  for (const r of out)
    console.log(
      r.name.padEnd(16) +
        r.pct.map((p) => pctCell(p).padStart(8)).join("") +
        (r.ratio === Infinity ? "     ∞" : r.ratio.toFixed(2).padStart(7)) +
        String(r.n).padStart(7),
    );
  console.log(
    "\n⚠️ n=0 인 열쇠는 «없다»가 아니라 **«이 말뭉치에 그 말이 없다»**다 — 그 줄의 배율은 뜻이 없다.",
  );
}

/**
 * **6단(매쓰홀릭)에 대기 위한 신호 Ⓐ~Ⓔ** — g5 §2.4 와 같은 자리, 중2 판.
 *
 * ⚠️ 저쪽 문항은 **한 글자도 안 가져왔다**(브리프 §0 ㉠). 여기서 재는 것은 전부
 *    **우리 지면**이고, 6단의 이름과 성격은 리드가 준 눈금에서 왔다.
 */
export function sixGradeSignals(rows: Sample[]): void {
  const deep = rows.filter((r) => r.tier.startsWith("심화"));
  const app = rows.filter((r) => r.tier === "응용");
  const calc = rows.filter((r) => r.tier === "연산");

  /** `probe-middle-tier-4dan.bareOperationInstruction` 과 **같은 두 조각**을 잇는다. */
  const bare = (s: Sample) => {
    const only = loneInstruction(s.content);
    if (!only) return false;
    const tail = only.replace(/\.$/, "");
    return OPERATION_INSTRUCTION_WORDS.some((w) => tail.endsWith(w));
  };
  // Ⓓ 저쪽 「심화(중)」 = 「답이 여럿일 수 있는 **구조**를 탐색」.
  //    지면 자국 둘을 **동시에** 요구한다 — 낱말 하나로는 「경우의 수」 소단원이
  //    통째로 걸린다(그 소단원에서 경우를 세는 것은 심화가 아니라 그 단원의 일이다).
  const structural = (s: Sample) =>
    /모두 구하시오|가능한|만들 수 있는|짝지|배열|나열/.test(
      stripMath(s.content),
    ) && /,/.test(s.answer.replace(/\$[^$]*\$/g, (m) => m));
  // Ⓔ 답이 값 **여럿**인가 — 하나로 안 굳는 자리.
  const multi = (s: Sample) =>
    /\$[^$]*\$\s*,\s*\$[^$]*\$/.test(s.answer) ||
    /^[^$]*\d+\s*,\s*\d+/.test(s.answer);

  const pc = (n: number, d: number) =>
    d === 0 ? "—" : `${n} (${((n / d) * 100).toFixed(1)}%)`;
  const secOf = (list: Sample[], f: (s: Sample) => boolean) =>
    new Set(list.filter(f).map((s) => s.section)).size;

  console.log("Ⓐ 심화가 «지시 한 줄 + 식»뿐 (근거가 식 자체밖에 없다)");
  console.log(
    `   ${pc(deep.filter(bare).length, deep.length)} · 소단원 ${secOf(deep, bare)}/56`,
  );
  console.log("Ⓑ 응용이 «지시 한 줄 + 식»뿐");
  console.log(
    `   ${pc(app.filter(bare).length, app.length)} · 소단원 ${secOf(app, bare)}/56`,
  );
  console.log("Ⓒ 연산에 되짚기 마디가 둘 이상 (사다리 밑동이 이미 되짚는다)");
  const c = (s: Sample) => pinnedNodes(s.solution) >= 2;
  console.log(
    `   ${pc(calc.filter(c).length, calc.length)} · 소단원 ${secOf(calc, c)}/56`,
  );
  console.log("Ⓓ 저쪽 «심화(중)» 표지 — 구조를 탐색하고 답이 여럿");
  console.log(
    `   전체 ${pc(rows.filter(structural).length, rows.length)} · 심화 ${pc(deep.filter(structural).length, deep.length)}`,
  );
  console.log("Ⓔ 정답이 값 여럿 (하나로 안 굳는다)");
  console.log(
    `   전체 ${pc(rows.filter(multi).length, rows.length)} · 갈래별 ` +
      TIERS.slice(0, 4)
        .map((t) => {
          const sub = rows.filter((r) => r.tier === t);
          return `${t} ${pc(sub.filter(multi).length, sub.length)}`;
        })
        .join(" · "),
  );
  const hits = rows.filter(structural);
  if (hits.length) {
    console.log("\nⒹ 에 걸린 것 (눈으로 볼 목록 — 거짓 양성이 섞인다)");
    const seen = new Set<string>();
    for (const h of hits) {
      if (seen.has(h.key)) continue;
      seen.add(h.key);
      console.log(`  · [${h.tier}] ${h.key} ${h.title}`);
      console.log(`      ${h.content.replace(/\n/g, " ").slice(0, 110)}`);
      console.log(`      답: ${h.answer.slice(0, 60)}`);
    }
  }
}

/**
 * **소단원마다 어느 갈래가 서나** — 프리셋이 요구하는 갈래를 그 소단원이 못 내면
 * `ADJACENT_DIFFICULTY` 가 조용히 이웃에서 대체한다(D-115 ⑻). 그 «조용함»을 센다.
 */
function showCoverage(rows: Sample[]): void {
  const per = new Map<string, Map<string, number>>();
  const minorOf = new Map<string, string>();
  for (const r of rows) {
    const m = per.get(r.section) ?? new Map<string, number>();
    m.set(r.tier, (m.get(r.tier) ?? 0) + 1);
    per.set(r.section, m);
    minorOf.set(r.section, `${r.book} ${r.minor}`);
  }
  console.log(`소단원 ${per.size}개 · 갈래가 «없는» 소단원 수\n`);
  for (const t of TIERS) {
    const miss = [...per].filter(([, m]) => !m.get(t)).map(([s]) => s);
    console.log(
      `  ${t.padEnd(6)} 없는 소단원 ${String(miss.length).padStart(2)}/${per.size}`,
    );
  }
  for (const t of ["연산", "심화하"] as const) {
    const miss = [...per].filter(([, m]) => !m.get(t)).map(([s]) => s);
    if (!miss.length) continue;
    console.log(`\n■ «${t}» 이 없는 소단원 ${miss.length}개 — 중단원별`);
    const byMinor = new Map<string, number>();
    for (const s of miss)
      byMinor.set(minorOf.get(s)!, (byMinor.get(minorOf.get(s)!) ?? 0) + 1);
    const total = new Map<string, number>();
    for (const [s] of per)
      total.set(minorOf.get(s)!, (total.get(minorOf.get(s)!) ?? 0) + 1);
    for (const [k, n] of [...byMinor].sort())
      console.log(`   ${k.padEnd(34)} ${n}/${total.get(k)} 소단원에 없다`);
  }
}

function showThin(rows: Sample[]): void {
  // 「얇다」 = 한 소단원 · 한 갈래에서 씨앗·변형을 12번 돌려도 발문 «뼈대»가 몇 가지인가.
  // 뼈대 = 수식과 숫자를 지운 한글 골격 (숫자만 다른 아류를 한 가지로 접는다).
  const frame = (c: string) =>
    stripMath(c).replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
  const per = new Map<string, Map<string, Set<string>>>();
  for (const r of rows) {
    const m = per.get(r.section) ?? new Map<string, Set<string>>();
    const s = m.get(r.tier) ?? new Set<string>();
    s.add(frame(r.content));
    m.set(r.tier, s);
    per.set(r.section, m);
  }
  console.log(
    "갈래마다 «서로 다른 발문 뼈대»가 몇 가지인가 (소단원 평균 · 하나뿐인 소단원 수)",
  );
  console.log(
    "\n갈래".padEnd(8) +
      "평균 뼈대".padStart(10) +
      "  뼈대 하나뿐" +
      "  소단원",
  );
  for (const t of TIERS) {
    const counts: number[] = [];
    for (const [, m] of per) {
      const s = m.get(t);
      if (s) counts.push(s.size);
    }
    if (!counts.length) {
      console.log(`${t.padEnd(8)}${"—".padStart(10)}`);
      continue;
    }
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    console.log(
      t.padEnd(8) +
        avg.toFixed(2).padStart(10) +
        String(counts.filter((c) => c === 1).length).padStart(12) +
        String(counts.length).padStart(9),
    );
  }
  console.log(
    "\n⚠️ 이 수는 다양성의 **하한**이다(소재를 안 지운다). 그리고 다양성은 난이도가 아니다.",
  );
}

/** 적재 원장(커밋된 파일)에 나온 중2 유형 ↔ 지금 등록된 중2 유형. */
function showLoaded(): void {
  const files = [
    "engine-load-중등전량-3변형-형식3종.json",
    "engine-load-중등-유형보강-재적재.json",
    "engine-load-파일럿2회차-중등만.json",
    "engine-load-파일럿2회차-분류확대.json",
    "engine-load-중등-바뀐유형-되돌림.json",
  ];
  const keys = new Set(m2Types().map((e) => e.key));
  const seen = new Set<string>();
  for (const f of files) {
    let j: { rows?: { externalId?: string }[] };
    try {
      j = JSON.parse(
        readFileSync(`docs/planning/tracks/reports/${f}`, "utf8"),
      ) as { rows?: { externalId?: string }[] };
    } catch {
      console.log(`  (원장 없음) ${f}`);
      continue;
    }
    let mine = 0;
    for (const r of j.rows ?? []) {
      const id = r.externalId ?? "";
      if (!id.startsWith("engine-mid:")) continue;
      const key = id
        .slice("engine-mid:".length)
        .split("|")
        .slice(0, 3)
        .join("|");
      if (!keys.has(key)) continue;
      mine += 1;
      seen.add(key);
    }
    console.log(`  ${f} → 중2 행 ${mine}`);
  }
  const missing = [...keys].filter((k) => !seen.has(k));
  console.log(
    `\n등록 ${keys.size} · 적재 원장에 나온 것 ${seen.size} · **원장에 한 번도 안 나온 것 ${missing.length}**`,
  );
  for (const k of missing) {
    const e = m2Types().find((x) => x.key === k)!;
    const p = generateMiddleProblem(k, SEEDS[0]!, 0);
    console.log(`  · ${k}  ${e.rpmTitle}  → ${p.difficulty}`);
  }
  const combos = middleComboDefinitions().filter(
    (d: { anchorGrade?: string }) => d.anchorGrade === GRADE,
  );
  console.log(
    `\n결합형(판정기·적재기 밖) 중2 앵커 ${combos.length}건 — \`registeredTypes()\` 에 없으므로 이 자도 못 본다.`,
  );
}

/** 중단원마다 심화하가 무엇을 시키나 — 발문 뼈대 상위. */
function showChapters(rows: Sample[]): void {
  const frame = (c: string) =>
    stripMath(c).replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
  const per = new Map<string, Sample[]>();
  for (const r of rows) {
    if (!r.tier.startsWith("심화")) continue;
    const k = `${r.book} ${r.minor}`;
    per.set(k, [...(per.get(k) ?? []), r]);
  }
  for (const [k, list] of [...per].sort()) {
    const f = new Map<string, number>();
    for (const r of list)
      f.set(frame(r.content), (f.get(frame(r.content)) ?? 0) + 1);
    const top = [...f].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const types = new Set(list.map((r) => r.key)).size;
    console.log(
      `\n■ ${k} — 심화 표본 ${list.length} · 유형 ${types} · 서로 다른 뼈대 ${f.size}`,
    );
    for (const [fr, c] of top)
      console.log(`   ${String(c).padStart(3)}× ${fr.slice(0, 96)}`);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const want = (f: string) => argv.includes(f);

  if (want("--selftest")) {
    const gs = gauges();
    let bad = 0;
    for (const g of gs) {
      const ok = g.ok();
      if (!ok) bad += 1;
      console.log(`  ${ok ? "✅" : "❌"} ${g.label}`);
    }
    const rows = buildCorpus();
    console.log(
      `\n㉡ 살아 있는 표본 ${rows.length}건에서 각 검출기가 무는 수 (0 이면 못 셈이다)`,
    );
    let blind = 0;
    for (const p of liveProbe(rows)) {
      if (p.hits === 0) blind += 1;
      console.log(
        `  ${p.hits === 0 ? "❌" : "✅"} ${p.name.padEnd(16)} ${p.hits}`,
      );
    }
    if (bad || blind) {
      console.log(
        `\n❌ 눈금 ${bad}건 어긋남 · 살아 있는 표본을 못 무는 검출기 ${blind}개`,
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `\n✅ 눈금 ${gs.length}건 전부 맞다 (양성 ${gs.filter((g) => g.label.startsWith("양성")).length} · 음성 ${gs.filter((g) => g.label.startsWith("음성")).length}) · 검출기 ${axes().length}개 전부 살아 있다`,
    );
    return;
  }

  if (want("--loaded")) {
    showLoaded();
    return;
  }

  const rows = buildCorpus();
  if (want("--tiers")) showTiers(rows);
  else if (want("--axes")) showAxes(rows);
  else if (want("--nodes")) showNodes(rows);
  else if (want("--sixgrade")) sixGradeSignals(rows);
  else if (want("--keys")) showKeys(rows);
  else if (want("--coverage")) showCoverage(rows);
  else if (want("--thin")) showThin(rows);
  else if (want("--chapters")) showChapters(rows);
  else {
    showTiers(rows);
    console.log("\n───────────────────────────────────────────────\n");
    showAxes(rows);
  }
}

if (isDirectScript(import.meta.url)) main();
