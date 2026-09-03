/**
 * 🔴 **중1 상위 갈래(`심화중`·`심화상`)가 «정말 서 있는가»를 잰다** (D-116, 브리프 §3).
 *
 * 초등이 네 물결에 걸쳐 물린 함정 셋이 그대로 중등에 온다. 이 자는 그 셋을
 * **갈래마다 따로** 재고, 축이 **없는** 자리는 「깨끗」이 아니라 **「축 없음」**으로 찍는다
 * (「0 은 «깨끗»과 «못 셈»을 안 가른다」 — 이 저장소가 여러 번 데인 자리).
 *
 * ```bash
 * npx tsx scripts/qa/probe-middle-top-m1.ts --selftest   # 눈금 24건 (양성 13 · 음성 11)
 * npx tsx scripts/qa/probe-middle-top-m1.ts              # ㉠㉡㉢ + 해설 깊이 + 해설 높이
 * npx tsx scripts/qa/probe-middle-top-m1.ts --overlap    # ㉢ 만 (천장 포함)
 * ```
 *
 * ## 무엇을 재나
 *
 * **㉠ 지름길** — 「굳힘 조건을 **안 읽고** 지면의 수만으로 뻔한 한 수를 집으면 몇 %가
 * 맞나」. 초6 에서 두 갈래가 이것으로 병합이 막혔다(각각 **전수** 100%). 우연 수준은
 * 후보가 $k$개일 때 $1/k$ 다. 여기서는 **두 벌**로 잰다.
 *   ⑴ **지면 수 조합 20종** — 유형을 안 가리는 자다. 최댓값·최솟값·합·차·곱·
 *      최대공약수·최소공배수… 를 전부 만들어 정답과 맞대 본다.
 *   ⑵ **유형마다 «굳힘 조건을 지운 판»** — 그 조건이 없을 때 나오는 답을 실제로
 *      계산해 견준다. ⑴ 이 못 보는 자리를 이쪽이 본다.
 *
 * **㉡ 굳힘이 항등식인가** — 굳힘 인자를 흔들어 답이 **안 바뀌면** 그것은 굳힘이 아니라
 * 장식이다. 초등에서 이 검사로만 갈래 넷이 걸렸다.
 *
 * **㉢ 갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 실린다.
 * ⚠️ 「수+정답」 열쇠에는 **천장**이 있다(심화상에서 자기 자신과도 19.2%). 그래서
 * **쌍마다 천장을 먼저 찍고**, 천장이 문턱 아래면 «겹침 없음»이 아니라 **«판정 불가»**
 * 로 적는다. 한글 낱말 Jaccard 를 같이 낸다(심화에서는 이쪽이 듣는다).
 *
 * **⑸ 해설 깊이** — 규칙을 옮겨 적지 않는다. `probe-middle-solution-depth.ts` 의
 * `isThin` 을 **그대로 import** 한다(두 벌이 되면 한쪽만 고쳐도 아무도 모른다).
 *
 * **⑹ 해설 높이** — 「걸음을 건너뛰지 않는다」(D-116 ⑹)와 **정면으로 부딪히는 축**이다.
 * 후보를 한 줄씩 적으면 해설이 길어지고, 정답지 한 단(964.8px)을 넘으면 **그 쪽 다른
 * 문항의 해설이 통째로 사라진다.** 3차 물결의 `53V` 가 1242px 로 착지할 뻔했는데
 * 이 자에도 저술자의 시험 92개에도 그 축이 **아예 없었다** — 값·글자만 보고 지면을
 * 안 봤기 때문이다(2026-08-24 「값이 맞으면 시험이 다 초록이다」와 같은 자리).
 *
 * ## 🔴 이 자가 못 보는 것
 *
 * 1. **「해설이 밟는 길」을 못 본다.** D-115 ⑾ 이 「중·상의 참은 해설이다」라고 못 박았고
 *    「어느 쪽인지는 기계가 못 정한다 — 사람이 본다」고 이어 적었다. `--rubric` 이 내는
 *    표는 **사람이 읽을 목록**이지 판정이 아니다.
 * 2. **반증 ④(같은 소단원의 아래 갈래가 이 잣대를 통과하나)를 기계로 못 판정한다.**
 *    그래서 그 소단원의 연산·기본·응용을 **전량 찍어** 사람이 읽게 한다.
 * 3. 지면 수 조합 20종은 **손 목록**이다. 목록에 없는 지름길은 구조적으로 0이 된다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  coprimePairSums,
  divisors,
  gcd,
  naturalRootCandidates,
  ratioValue,
  solveSameRemainder,
} from "../../src/lib/middle/m1Top";
// 2차 물결(`m1Top2.ts`)의 굳힘 함수 — **규칙을 옮겨 적지 않는다.**
// 이 자가 저마다 다시 구현하면 한쪽만 고쳐도 아무도 모른다.
import {
  allTriplesSum,
  integerTriples,
  tenDivisorNumbers,
  unitDigitCycle,
  unitDigitOfProduct,
  TRIPLES,
} from "../../src/lib/middle/m1Top2";
// 3차 물결(`m1Top3.ts`)의 굳힘 함수 — 여기서 다시 구현하지 않는다.
import {
  boxCountsLeavingLast,
  integersMeetingSegment,
  looseBoxCounts,
  scorePairs,
  smallestMultiplierFraction,
  swappedMultiplierAnswer,
  upperOnlySum,
} from "../../src/lib/middle/m1Top3";
// 4차 물결(`m1Top4.ts`)의 굳힘 함수 — 여기서 다시 구현하지 않는다.
import {
  boxDimensionPairs,
  classFrequencySum,
  divisorSum,
  divisorsOf,
  meanEqualsMedianValues,
  productTotalAnswer,
  relativeDenominator,
  smallestTotalCount,
} from "../../src/lib/middle/m1Top4";
// 5차 물결 갈래 a(`m1Top5a.ts`)의 굳힘 함수 — 여기서 다시 구현하지 않는다.
import {
  aboveInTriangle,
  belowInTriangle,
  bisectorAngleFromMiddle,
  equalPartArcs,
  middleSumFromBisector,
  PART_MAX,
  PART_MIN,
  prismFromSkew,
  rowEnd,
  solidCounts,
} from "../../src/lib/middle/m1Top5a";
// 5차 물결 갈래 `b`(`m1Top5b.ts`)의 굳힘 함수·물음 표 — 여기서 다시 구현하지 않는다.
import {
  LINEAR_ASKS,
  POINT_ASKS,
  PYRAMID_ASKS,
  PYRAMID_SCAN,
  linearCoefficientPair,
  possibleMedians,
  pyramidSideFromSkew,
  skewPairCount,
} from "../../src/lib/middle/m1Top5b";
// 5차 물결 갈래 `c`(`m1Top5c.ts`)의 굳힘 함수 — 여기서 다시 구현하지 않는다.
import {
  factorPairWithSum,
  largerFromSumAndDiff,
  polyhedronDivisorCandidates,
  polyhedronScan,
  polyhedronStop,
  sumOfPairSums,
} from "../../src/lib/middle/m1Top5c";
// 5차 물결 갈래 d(`m1Top5d.ts`)의 굳힘 함수 — 여기서 다시 구현하지 않는다.
import {
  classesAtLeastPercent,
  drawnSaltAmount,
  fourTriangleAreas,
  quadrantLatticeCount,
} from "../../src/lib/middle/m1Top5d";
import { JASEUP_MEASURED_PX } from "../../src/lib/printGeometry";
import { estimateSolutionPx } from "../../src/lib/printOverflow";
import { isThin } from "./probe-middle-solution-depth";
import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260827, 7, 4242, 99991, 31337, 5150131, 20260901, 12345];

/**
 * 🔴 **모집단을 손 목록(`M1_TOP`)에서 뽑지 않는다** — 2026-09-02.
 *
 * 이 자는 `M1_TOP` 을 돌고 있었다. 그런데 확대 갈래는 물결마다 **새 모듈**에
 * 서므로(`m1Top2.ts` · 접미사 `U`), 2차 물결 넷이 이 보고서에서 **조용히 빠져**
 * 있었다 — 「이 유형들은 깨끗하다」가 아니라 **아무도 안 쟀다**는 뜻이다.
 * 이 저장소가 여러 번 적은 「목록을 손으로 쓰면 세는 쪽이 눈이 먼다」 그대로다.
 *
 * 그래서 **등록에서 뽑는다** — 중2 판정기(`probe-middle-extending-tiers`)가 이미
 * 그렇게 서 있다. 축(`AXES`)을 안 적은 유형은 조용히 빠지지 않고 **빨갛게 찍힌다.**
 */
function topEntries(): { key: string }[] {
  return registeredTypes()
    .filter((e) => e.grade === "중1")
    .filter((e) => {
      const d = generateMiddleProblem(e.key, SEEDS[0]!, 0).difficulty;
      return d === "심화중" || d === "심화상";
    })
    .map((e) => ({ key: e.key }));
}
const VARIANTS = [0, 1, 2];
/** 「수+정답」 열쇠가 뜻을 가지려면 천장이 이보다 높아야 한다. */
const CEILING_FLOOR = 0.5;

// ── 열쇠 ────────────────────────────────────────────────────

/** 지면에 찍힌 수 전부 (부호 포함). */
export function pageNumbers(content: string): number[] {
  const out: number[] = [];
  for (const m of content.matchAll(/-?\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  return out;
}

/**
 * 답에서 처음 나오는 수 — **없으면 `null`(판정 불가)**.
 *
 * 🔴 2026-09-02 수리. 종전 판은 수가 없으면 **던졌다.** 그런데 형제 유형의 답에는
 * 수가 없는 것이 흔하다 — 실측으로 소단원 «정비례 관계 y=ax의 그래프» 형제 12개 중
 * **4개**가 그렇다(`06`→`$y=-x$` · `08`→`증가한다.` · `09`→`$y=-x$` · `23`→`$y=bx$`).
 * 그래서 그 소단원에 확대 갈래를 세우는 순간 `--overlap` 이 **그 자리에서 죽었다**
 * (`Error: 답에 수가 없다: $y=-x$`). 「이 열쇠로는 못 잰다」와 「자가 고장 났다」는
 * 다른 말인데 던지면 둘이 같아진다 — 그리고 죽은 자는 아무것도 안 지킨다.
 *
 * 참고로 「반비례 관계 y=a/x의 그래프」 쪽은 답이 전부 수를 품고 있어 **0건**이다.
 * 이 결함은 정비례 쪽에만 있었고, 그래서 2차 물결까지는 드러나지 않았다.
 */
export function answerNumberOrNull(answer: string): number | null {
  const m = answer.match(/-?\d+(?:\.\d+)?/);
  return m === null ? null : Number(m[0]);
}

/** 답에서 처음 나오는 수 — 우리 유형의 답은 반드시 수다. 없으면 던진다. */
export function answerNumber(answer: string): number {
  const v = answerNumberOrNull(answer);
  if (v === null) throw new Error(`답에 수가 없다: ${answer}`);
  return v;
}

function lcm(a: number, b: number): number {
  return Math.abs((a / gcd(a, b)) * b);
}

/**
 * 🔴 **지면 수만으로 만들 수 있는 «뻔한 한 수» 목록.**
 *
 * ⚠️ 손 목록이라 **샌다** — 여기 없는 지름길은 구조적으로 0이 된다. 그래서 유형마다
 * 「굳힘 조건을 지운 판」을 따로 두고(⑵), 둘을 같이 본다.
 */
export function obviousCandidates(
  nums: readonly number[],
): Map<string, number> {
  const out = new Map<string, number>();
  const xs = nums.filter((v) => Number.isInteger(v));
  if (xs.length === 0) return out;
  const pos = xs.filter((v) => v > 0);
  out.set("최댓값", Math.max(...xs));
  out.set("최솟값", Math.min(...xs));
  out.set(
    "합",
    xs.reduce((a, b) => a + b, 0),
  );
  if (pos.length > 0) {
    out.set(
      "양수합",
      pos.reduce((a, b) => a + b, 0),
    );
    out.set("양수최댓값", Math.max(...pos));
    out.set("양수최솟값", Math.min(...pos));
    out.set(
      "전체최대공약수",
      pos.reduce((a, b) => gcd(a, b)),
    );
  }
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const a = xs[i]!;
      const b = xs[j]!;
      out.set(`차 #${i}#${j}`, Math.abs(a - b));
      out.set(`합 #${i}#${j}`, a + b);
      out.set(`곱 #${i}#${j}`, a * b);
      if (a !== 0 && b !== 0) {
        out.set(`최대공약수 #${i}#${j}`, gcd(a, b));
        if (Math.abs(a * b) < 1e7) out.set(`최소공배수 #${i}#${j}`, lcm(a, b));
        if (b !== 0 && a % b === 0) out.set(`몫 #${i}#${j}`, a / b);
        if (a !== 0 && b % a === 0) out.set(`몫 #${j}#${i}`, b / a);
      }
    }
  }
  return out;
}

/** 한글 낱말 Jaccard — 심화에서 진짜 겹침은 0.94~0.97, 무관은 0.03~0.06. */
export function koreanJaccard(a: string, b: string): number {
  const words = (s: string): Set<string> =>
    new Set(
      s
        .replace(/\$[^$]*\$/g, " ")
        .split(/[^가-힣]+/)
        .filter((w) => w.length >= 2),
    );
  const x = words(a);
  const y = words(b);
  if (x.size === 0 && y.size === 0) return 1;
  let hit = 0;
  for (const w of x) if (y.has(w)) hit += 1;
  return hit / (x.size + y.size - hit);
}

/**
 * 「지면 수 + 정답」 열쇠 — 작은 집합에서 잘 듣는다.
 *
 * 🔴 한쪽 답에 수가 없으면 **`null`(판정 불가)** 을 낸다. 던지지 않는다 —
 * 위 `answerNumberOrNull` 주석 참조.
 */
export function numAnswerJaccard(
  aContent: string,
  aAnswer: string,
  bContent: string,
  bAnswer: string,
): number | null {
  const na = answerNumberOrNull(aAnswer);
  const nb = answerNumberOrNull(bAnswer);
  if (na === null || nb === null) return null;
  const key = (c: string, n: number): Set<string> =>
    new Set([...pageNumbers(c).map(String), `=${n}`]);
  const x = key(aContent, na);
  const y = key(bContent, nb);
  let hit = 0;
  for (const w of x) if (y.has(w)) hit += 1;
  return hit / (x.size + y.size - hit);
}

// ── ㉠·㉡ — 유형마다 «굳힘 조건을 지운 판» ──────────────────────

type Row = {
  key: string;
  tier: string;
  seed: number;
  variant: number;
  content: string;
  answer: string;
  solution: string;
  facts: Record<string, number>;
};

/**
 * 유형마다 ⑴ 굳힘 조건을 **지운** 답 ⑵ 굳힘 인자를 **흔든** 답.
 *
 * `null` 은 「그 축이 이 유형에 **없다**」는 뜻이다 — 「0%」와 **다른 말**이라
 * 표에서도 따로 찍는다.
 */
export type Axis = {
  /** 굳힘 조건을 안 읽고 낼 수 있는 답. 없으면 `null`(축 없음). */
  withoutBinding: (f: Record<string, number>) => number | null;
  /** 굳힘 인자를 흔든 답. 원래와 같으면 굳힘이 장식이다. */
  perturbed: (f: Record<string, number>) => number;
  /** 후보 개수 — 우연 수준 $1/k$ 를 찍기 위해. `null` 이면 후보 목록이 없다. */
  candidateCount: (f: Record<string, number>) => number | null;
};

/**
 * 🔴 **내보내는 까닭** — 등록(`generate.ts`)이 리드 몫이라, 새 물결의 유형은 이 자의
 * 모집단(`registeredTypes()`)에 아직 없을 수 있다. 그러면 여기 적은 축이 **한 번도
 * 안 돌고**, 등록되는 날에야 처음 돈다 — 그날 틀린 것이 드러나면 이미 늦다.
 * 그래서 각 물결의 시험이 **이 표를 그대로 import 해서** 자기 유형의 축을 미리 댄다
 * (`middleM1Top3.test.ts`). 규칙을 옮겨 적는 것이 아니라 **같은 것을 부르는 것**이다.
 */
const SOLID_ASKS = ["모서리", "꼭짓점", "면"] as const;

/**
 * `68X` — `facts` 에 「무엇을 물었나」가 **없다.** 세는 값 둘(`e1`·`e2`)로 되만든다.
 *
 * 세 물음은 각기둥 쪽이 $3n_1$·$2n_1$·$n_1+2$ 라 $n_1\ge3$ 이면 서로 겹치지 않는다
 * ($3n_1=2n_1\iff n_1=0$ · $3n_1=n_1+2\iff n_1=1$ · $2n_1=n_1+2\iff n_1=2$).
 * 🔴 논증으로 두지 않고 **창 전수로 확인했다** — $n_1,n_2\in[3,24]$ 의 $1{,}452$자리
 * 전부에서 맞는 물음이 정확히 하나였다(모호 $0$).
 *
 * ⚠️ 여기서 `null` 은 「되만들기 실패」다. 그것을 그대로 `withoutBinding` 이 내면
 * 판정기가 **「축 없음」**으로 읽어 두 뜻이 겹치므로, 부르는 쪽이 **던진다**.
 */
function solidAskOf(
  f: Record<string, number>,
): (typeof SOLID_ASKS)[number] | null {
  const hits = SOLID_ASKS.filter((ask) => {
    const [a, b] = solidCounts(ask, f.n1!, f.n2!);
    return a === f.e1! && b === f.e2!;
  });
  return hits.length === 1 ? hits[0]! : null;
}

/**
 * `71X` 발문의 다항식 $(pa-qb)x^{2}+(a-b)x+cab$ 에서 **물음이 가리키는 값**.
 *
 * ⚠️ 제품이 이 조립을 함수로 안 내놓아 여기 한 벌을 둔다(생성기 본문에 인라인이다).
 *    그래서 두 벌이 갈리면 드러나게 **참 짝($a,b,c$)으로 부르면 `facts.x` 와 같아야
 *    한다**는 항등을 따로 잰다(실측 144판 전량 일치). 물음은 색인을 식으로 옮겨
 *    적지 않고 **제품 표 `LINEAR_ASKS` 의 `key`** 로 읽는다.
 */
function linearAnswer(ask: number, a: number, b: number, c: number): number {
  const key = LINEAR_ASKS[ask]!.key;
  const coef = a - b;
  const konst = c * a * b;
  return key === "const" ? konst : key === "coef" ? coef : coef + konst;
}

/**
 * `72X` 의 `facts` 에는 줄기와 잎 그림의 자료가 없다(`{x,s,v5,v6,n}`). 그런데
 * `possibleMedians` 가 실제로 보는 것은 **다섯째·여섯째 값뿐**이다 — 나머지 여덟은
 * 정렬 자리만 채운다($x$ 가 어디에 끼든 여섯 번째 값은 $v_5$·$x$·$v_6$ 셋 중 하나다).
 * 그래서 그 성질만 지키는 열 개를 세워 **제품 함수를 그대로** 부른다.
 *
 * ⚠️ 이 세움이 옳다는 것을 가정하지 않는다 — 참 판에서 이것으로 부른 합이
 *    `facts.x` 와 같은지 재었다(실측 144판 전량 일치).
 */
function flatKnown(v5: number, v6: number): number[] {
  return [
    v5 - 4,
    v5 - 3,
    v5 - 2,
    v5 - 1,
    v5,
    v6,
    v6 + 1,
    v6 + 2,
    v6 + 3,
    v6 + 4,
  ];
}

// ── 5차 물결 갈래 `c`(`m1Top5c.ts`)의 소품 ──────────────────
//
// 🔴 **`74X` 는 「무엇을 물었나」가 `facts` 에 없다.** 생성기는 물음 넷 중 하나를
//    `askIndex` 로 고르는데 그 색인을 `facts` 에 안 적는다. 그래서 답 `x` 를 네 물음의
//    값과 맞대어 **되만든다** — 어느 것과도 안 맞으면 `null`(못 되만듦)이다.
//    규칙을 옮겨 적는 것이 아니라 `m1Top5c` 의 `polyhedronStop`·`polyhedronScan` 을
//    **그대로 부른다**(아래 축 참조).

/** $a$각기둥(=각뿔대)과 $b$각뿔에서 물음 넷의 값 — 생성기 `asks` 와 같은 차례. */
function polyhedronAsk(a: number, b: number): number[] {
  return [
    (a + 2) * (b + 1), // 면 × 면
    2 * a * (b + 1), // 꼭짓점 × 꼭짓점
    (a + 2) * (2 * b), // 면 × 모서리
    3 * a * (b + 1), // 모서리 × 면
  ];
}

/**
 * 답 `x` 로 「무엇을 물었나」를 되만든다 — 맞는 물음이 **둘 이상일 수 있다.**
 * 실측 **74/1,200(6.2%)** 이고 두 부류다(못 되만든 판은 **0/1,200**):
 *
 * ⑴ **62건은 대수적 항등** — $a=2b$ 이면 «꼭짓점의 곱» $2a(b+1)$ 과 «면×모서리»
 *    $(a+2)\cdot2b$ 가 **항상 같다**($ab+a=ab+2b \iff a=2b$). 지면이 그 둘을 갈라
 *    물어도 **답이 같으므로** 학생의 답도 같다 — 되만들기 식이 모호한 것이 아니다.
 * ⑵ **12건은 수치 우연** — $(a+2)\cdot2b=3a(b+1)$ 이 우연히 서는 자리($a=3,b=9$ 등).
 *
 * 그때는 **지름길을 과대평가하는 쪽**으로 고른다 — 결함을 숨기지 않는다. 그 과대평가가
 * 실제로 일어났는지도 세었다: 끝 후보에서 두 물음이 **갈리는** 판은 12건뿐이고
 * **그중 «적중»으로 센 것은 0건**이라, `74X` 의 48.0% 에 모호 판이 기여한 것은 없다.
 */
function polyhedronAskIndexes(f: Record<string, number>): number[] {
  const out: number[] = [];
  polyhedronAsk(f.a!, f.b!).forEach((v, i) => {
    if (v === f.x!) out.push(i);
  });
  return out;
}

/** 「$a$ 를 이것으로 찍었다면 답이 얼마인가」. 되만들지 못하면 `null`. */
function polyhedronAt(f: Record<string, number>, a: number): number | null {
  const idxs = polyhedronAskIndexes(f);
  if (idxs.length === 0) return null;
  const b = f.vSum! - 1 - 2 * a;
  if (b < 3) return null;
  const vals = polyhedronAsk(a, b);
  // 모호하면 참 답과 맞는 쪽을 고른다(지름길을 과대평가 = 보수적).
  const same = idxs.find((i) => vals[i]! === f.x!);
  return vals[same ?? idxs[0]!]!;
}

/** `77X` 의 계급값 다섯 — `facts` 에 첫 계급값과 계급의 크기가 있다(등차수열이다). */
const classValues77 = (f: Record<string, number>): number[] =>
  [0, 1, 2, 3, 4].map((i) => f.c1! + f.width! * i);
const frequencies77 = (f: Record<string, number>): number[] => [
  f.f1!,
  f.f2!,
  f.f3!,
  f.f4!,
  f.f5!,
];
const sum5d = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
/** `79X` 의 네 넓이 — 굳힘 함수를 그대로 부른다(규칙을 옮겨 적지 않는다). */
const areas79 = (f: Record<string, number>): number[] =>
  fourTriangleAreas(f.p!, f.q!, f.t!, f.r!, f.u!, f.v!);
const spread79 = (xs: readonly number[]): number =>
  Math.max(...xs) - Math.min(...xs);

export const AXES: Record<string, Axis> = {
  // 31T — 굳힘 조건(「나머지가 모두 같다」)을 지우면 문제 자체가 사라진다.
  // 그래서 ㉠ 은 「셋 중 둘만 읽으면 맞나」로 잰다(`thirdNumberMatters` 가 막는 것).
  "1-1|최대공약수와 최소공배수|31T": {
    withoutBinding: (f) => solveSameRemainder([f.a!, f.b!]),
    // ⚠️ 첫 판은 `c + x`(= $c+g$) 로 흔들었다. 그것은 **$g$의 배수를 더한 것**이라
    //    차가 여전히 $g$의 배수다 — 뜻이 안 바뀌는 변이라 「그대로 25%」가 나왔고,
    //    하마터면 멀쩡한 굳힘을 «장식»으로 적을 뻔했다. 변이는 «파일이 바뀌었나»가
    //    아니라 **«뜻이 바뀌었나»**를 봐야 한다(2026-08-21).
    perturbed: (f) => solveSameRemainder([f.a!, f.b!, f.c! + 1]),
    candidateCount: (f) => divisors(f.x!).length,
  },
  // 32T — 굳힘 조건은 「$a$, $b$ 가 서로소」. 지우면 곱이 $n$ 인 **모든** 쌍이 산다.
  "1-1|최대공약수와 최소공배수|32T": {
    withoutBinding: (f) => {
      const g = f.g!;
      const n = f.n!;
      let s = 0;
      for (const a of divisors(n)) {
        const b = n / a;
        if (a > b) continue;
        s += g * (a + b);
      }
      return s;
    },
    perturbed: (f) =>
      coprimePairSums(f.g!, f.n! * 2).reduce((a, b) => a + b, 0),
    candidateCount: (f) => coprimePairSums(f.g!, f.n!).length,
  },
  // 94T — 굳힘 조건은 비 $a:b:c$. 지우면 식의 값이 안 정해져 답이 없다(축 없음).
  "1-1|일차방정식의 풀이|94T": {
    withoutBinding: () => null,
    // ⚠️ 첫 판은 $r_2 \to r_2+r_1$ 로 흔들었다. 그러면 **분모까지 같이 바뀌어**
    //    $k$ 가 정수가 아니게 되는 자리가 많고(그때 `null`), 남은 자리에서는 우연히
    //    같은 $k$ 가 나와 「그대로 45.8%」가 찍혔다. 그것은 굳힘의 성적이 아니라
    //    **내 변이가 뜻을 안 바꾼 것**이다. $r_1 \to r_1+r_2$ 로 바꾸면
    //    $k' = k + c_1$ 이라 **늘 정수이고 늘 다르다** — 이제 이 축이 실제로 잰다.
    perturbed: (f) => {
      const k =
        ratioValue([f.r1! + f.r2!, f.r2!, f.r3!], [f.c1!, f.c2!, f.c3!]) ??
        Number.NaN;
      return f.s! + (f.q! - f.p!) * k;
    },
    candidateCount: () => null,
  },
  // 95T — 굳힘 조건은 **둘째 방정식**. 지우면 $M$의 약수가 전부 산다.
  "1-1|일차방정식의 풀이|95T": {
    withoutBinding: (f) => divisors(f.m!).reduce((a, b) => a + b, 0),
    perturbed: (f) =>
      naturalRootCandidates(f.m!, f.t! + 1, f.n!).kept.reduce(
        (a, b) => a + b,
        0,
      ),
    candidateCount: (f) => divisors(f.m!).length,
  },

  // ══ 2차 물결(`m1Top2.ts`) — 2026-09-02 에 등록했다 ══════════════
  //
  // 🔴 모집단을 등록에서 뽑도록 고친 뒤에도 이 넷은 「축(AXES)을 안 적었다」로
  //    ㉠·㉡ 표에 **여덟 줄**이 빨갛게 찍히고 있었다. 그 빨간 줄의 뜻은
  //    「이 유형들이 나쁘다」가 아니라 **「아무도 안 쟀다」**이다 — 손 목록으로
  //    돌던 옛 판이었다면 넷이 **조용히 빠져** 「깨끗」으로 읽혔을 자리다.

  // 41U — 굳힘은 「거듭제곱의 일의 자리는 네 개마다 되풀이된다」 하나다.
  "1-1|소인수분해|41U": {
    // 되풀이를 모르면 지수를 못 다루므로 「밑끼리만 곱해 일의 자리를 본다」
    // (= 지수를 $1$ 로 본 것)가 가장 뻔한 지름길이다.
    withoutBinding: (f) => (f.b1! * f.b2!) % 10,
    // ⚠️ 지수를 **$4$ 의 배수만큼** 흔들면 주기 때문에 답이 그대로다 — 그것은
    //    「굳힘이 장식」이 아니라 **내 변이가 뜻을 안 바꾼 것**이다(2026-08-21).
    //    그래서 $1$ 만 흔든다. 생성기가 이 값을 이미 막고 있으므로 이 줄은
    //    「그 가드가 산출물에 실제로 반영되는가」를 잰다 — 가드를 지우면 빨개진다.
    perturbed: (f) => unitDigitOfProduct(f.b1!, f.e1! + 1, f.b2!, f.e2!),
    // 후보 목록은 «두 주기표의 곱»이 낼 수 있는 서로 다른 일의 자리다.
    candidateCount: (f) => {
      const out = new Set<number>();
      for (const d1 of unitDigitCycle(f.b1!)) {
        for (const d2 of unitDigitCycle(f.b2!)) out.add((d1 * d2) % 10);
      }
      return out.size;
    },
  },
  // 42U — 굳힘 조건은 「밑 $p$ 를 바꿔 가며 상한 안인지 하나씩 견준다」.
  //       밑을 $2$ 로만 보고 멈추면 `facts.loose` 가 나온다.
  "1-1|소인수분해|42U": {
    withoutBinding: (f) => f.loose!,
    // ⚠️ 상한을 $+1$ 만 흔들면 경계에 수가 없는 판에서 답이 그대로라
    //    「뜻이 안 바뀌는 변이」가 된다. 새 $q$ 가 반드시 들어오도록 크게 흔든다.
    perturbed: (f) =>
      tenDivisorNumbers(f.limit! + 100).reduce((a, b) => a + b, 0),
    candidateCount: (f) => f.count!,
  },
  // 43U — 굳힘 조건은 $\frac1a+\frac1b=s$. 지우면 식의 값이 안 정해져
  //       답 자체가 없다(94T 와 같은 «축 없음»).
  "1-1|문자의 사용과 식의 계산|43U": {
    withoutBinding: () => null,
    // 🔴 **첫 판은 `valueFromReciprocalSum(s+1, …) ?? NaN` 이었다 — 그것이 96판 중
    //    95판에서 `null` 을 냈다.** 그 함수는 몫이 정수가 아니면 거부하는데(지면에
    //    소수를 안 내려고), 생성기가 참 $s$ 에서만 나누어떨어지게 계수를 역산하므로
    //    $s$ 를 흔들면 거의 언제나 정수가 아니다. 그런데 아래 `reportBinding` 이
    //    `Number.isFinite` 로 걸러 그 95판을 **「답이 바뀌었다 → 굳힘이 산다」**로
    //    세고 있었다 — 실제로 잰 것은 **1판**뿐이었고 나머지는 «못 셈»이 «깨끗»으로
    //    읽혔다(2026-09-04 에 실측으로 드러났다).
    //
    //    ㉡ 이 묻는 것은 「$s$ 를 흔들면 **값이** 달라지나」이지 「정수인가」가 아니다.
    //    정수 조건은 **지면을 위한 것**이라 이 판정과 아무 상관이 없다. 그래서
    //    유리수 그대로 견준다 — 분모 $r(s+1)+u$ 는 $r\ge1$, $s\ge2$, $u\ge1$ 이라
    //    늘 $4$ 이상이므로 **언제나 정의된다**(실측 분모 $0$ 인 판 0/96).
    //    고친 뒤 잰 판 1 → **96**, 답이 그대로인 판 **0** (결론은 그대로 «굳힘이 산다»).
    //    이 함수가 «장식»도 낼 수 있음은 기울기 $pu+qr=0$ 인 계수로 확인했다
    //    ($p=2$, $q=-1$, $r=2$, $u=1$ 에서 $s=3$ 과 $s=4$ 의 값이 둘 다 $1$ 이다).
    perturbed: (f) => (f.p! * (f.s! + 1) - f.q!) / (f.r! * (f.s! + 1) + f.u!),
    candidateCount: () => null,
  },
  // 44U — 굳힘 조건은 「세 수의 합이 **정수**」. 지우면 열 가지가 다 산다.
  "1-1|정수와 유리수의 계산|44U": {
    withoutBinding: (f) =>
      allTriplesSum([f.n1!, f.n2!, f.n3!, f.n4!, f.n5!], f.L!),
    // 「정수」의 뜻 자체를 흔든다 — 분자 세 개의 합이 $L$ 이 아니라
    // $L+1$ 의 배수여야 한다면 살아남는 조합이 통째로 달라진다.
    perturbed: (f) =>
      integerTriples([f.n1!, f.n2!, f.n3!, f.n4!, f.n5!], f.L! + 1).reduce(
        (a, k) => a + k.sum,
        0,
      ),
    candidateCount: () => TRIPLES.length,
  },

  // ══ 3차 물결(`m1Top3.ts`) — 2026-09-02 ═══════════════════════════
  //
  // 🔴 등록(`generate.ts`)은 리드 몫이라 이 넷이 아직 `registeredTypes()` 에 없을 수
  //    있다. 그때 이 항목들은 **잠자코 있다** — 모집단이 등록에서 오기 때문이다.
  //    등록되는 순간 함께 재어지고, 안 적었으면 그 자리에 🔴 이 찍힌다.

  // 51V — 굳힘은 「$q$ 는 두 분모의 공배수, $p$ 는 두 분자의 공약수」 둘이다.
  "1-1|최대공약수와 최소공배수|51V": {
    // 🔴 이 유형 고유의 지름길은 「굳힘을 안 읽은 답」이 아니라 **뒤집어 쓴 답**이다 —
    //    분자에 최대공약수, 분모에 최소공배수를 넣는 흔한 오답. 그것이 참 답과 같으면
    //    뒤집어 푼 학생과 옳게 푼 학생을 못 가른다(정찰이 실제로 그런 판을 만났다:
    //    $\frac{28}{15}$, $\frac{42}{25}$ 에서 $14+75$ 와 $5+84$ 가 **둘 다 $89$**).
    withoutBinding: (f) => swappedMultiplierAnswer(f.n1!, f.d1!, f.n2!, f.d2!),
    // ⚠️ 분모 하나를 흔든다. $d_2$ 가 $d_1$ 의 약수이면 최소공배수가 $d_1$ 그대로라
    //    흔들어도 답이 안 바뀌는데(그것이 이 축의 **음성 대조**다), 생성기가 그런 판을
    //    버리므로 여기서는 늘 달라져야 한다.
    perturbed: (f) => {
      const got = smallestMultiplierFraction(f.n1!, f.d1!, f.n2!, f.d2! + 1);
      return got.p + got.q;
    },
    // 후보 목록이 **아예 없다** — 값이 하나로 굳는다(94T·43U 와 같은 «축 없음»).
    candidateCount: () => null,
  },
  // 52V — 굳힘은 「$x=x_0$ 에서 $y=ax_0$」과 「$a$ 가 커지면 그 값도 커진다」 둘이다.
  "1-1|정비례와 반비례|52V": {
    // 굳힘의 **절반**(아래 끝)을 안 읽고 「$ax_0$ 이 $y_B$ 이하」만 본 답.
    withoutBinding: (f) => upperOnlySum(f.x0!, f.yb!),
    // ⚠️ $y_\mathrm{B}$ 를 $x_0$ **미만**으로 흔들면 창이 안 바뀐다(음성 대조).
    //    그래서 $x_0$ 만큼 올려 정수가 반드시 하나 더 들어오게 한다.
    perturbed: (f) =>
      integersMeetingSegment(f.x0!, f.ya!, f.yb! + f.x0!).reduce(
        (a, b) => a + b,
        0,
      ),
    candidateCount: (f) => f.cnt!,
  },
  // 53V — 굳힘 조건은 「마지막 한 상자에만 $c$개보다 적게 + 빈 상자 없음」.
  "1-1|일차방정식의 활용|53V": {
    // 그 조건의 **절반**(빈 상자 없음)만 읽고 멈춘 답.
    withoutBinding: (f) =>
      looseBoxCounts(f.a!, f.b!, f.c!).reduce((s, n) => s + n, 0),
    perturbed: (f) =>
      boxCountsLeavingLast(f.a!, f.b!, f.c! + 1).reduce((s, n) => s + n, 0),
    candidateCount: (f) => f.cnt!,
  },
  // 54V — 굳힘 조건은 총점. 첫 해를 찾고 멈추면 `facts.first` 가 나온다.
  "1-1|일차방정식의 활용|54V": {
    withoutBinding: (f) => f.first!,
    perturbed: (f) =>
      scorePairs(f.p!, f.q!, f.t! + 1).reduce((s, k) => s + k.a, 0),
    candidateCount: (f) => f.cnt!,
  },

  // ══ 4차 물결(`m1Top4.ts`) — 2026-09-03 ═══════════════════════════
  //
  // 🔴 등록(`generate.ts`)은 리드 몫이라 이 넷이 아직 `registeredTypes()` 에 없을 수
  //    있다. 그때 이 항목들은 **잠자코 있다** — 모집단이 등록에서 오기 때문이다.
  //    등록되는 순간 함께 재어지고, 안 적었으면 그 자리에 🔴 이 찍힌다.
  //    (그래서 저술자의 시험이 이 표를 **그대로 import 해서** 미리 댄다.)

  // 61W — 굳힘은 「$xy=a$ 이고 둘 다 자연수 ⟹ $x$ 는 $a$ 의 약수」 하나다.
  "1-1|정비례와 반비례|61W": {
    // 🔴 **축 없음** — 굳힘을 안 읽으면 그래프 위의 점이 무수히 많아 답 자체가
    //    안 나온다(`94T`·`43U`·`51V` 와 같은 자리). 이 유형의 진짜 지름길은
    //    「$a$ 에 작은 수를 한두 번 곱하거나 나눈 값」인데, 지면에 수가 $a$ **하나**
    //    뿐이라 아래 ⑴ 의 자로는 구조적으로 0 이다 — 그 축은 생성기가 막고
    //    저술자의 시험이 **널 모형과 견주어** 잰다(지름길 2.08% · 우연 5.90%).
    withoutBinding: () => null,
    // 그래프의 상수를 흔들면 약수의 합이 달라져야 한다.
    // ⚠️ 음성 대조: $\sigma(14)=\sigma(15)=24$ 라 «그대로»가 나올 수 있는 짝이
    //    실재한다 — 생성기 창(약수 6~12개)에는 그런 짝이 없다(실측 0/94).
    perturbed: (f) => divisorSum(f.a! + 1),
    // 후보 목록은 «$a$ 의 약수» 다.
    candidateCount: (f) => divisorsOf(f.a!).length,
  },
  // 62W — 굳힘은 「(도수)=(총합)×(상대도수)이고 도수는 자연수」 하나다.
  "1-2|도수분포표와 상대도수|62W": {
    // 「최소공배수 = 두 수의 곱」으로 아는 학생의 답. 두 기약분모가 서로소이면
    // 참 답과 **같아진다** — 생성기가 그런 판을 버리므로 여기서는 늘 갈려야 한다.
    withoutBinding: (f) => productTotalAnswer(f.p!, f.q!),
    // 상대도수 하나를 흔들면 기약분모가 달라져 답이 달라져야 한다.
    perturbed: (f) => classFrequencySum(f.p!, f.q! + 1),
    // 후보 목록이 **아예 없다** — 값이 하나로 굳는다.
    candidateCount: () => null,
  },
  // 63W — 굳지 않는다. 중앙값의 자리를 세 경우로 갈라 각각 넣어 봐야 한다.
  "1-2|대푯값|63W": {
    // 첫 경우에서 멈춘 답 — (가) 의 해 하나만 적고 끝낸 학생.
    withoutBinding: (f) => f.first!,
    perturbed: (f) =>
      meanEqualsMedianValues(f.c1!, f.c2!, f.c3!, f.c4! + 1).reduce(
        (a, b) => a + b,
        0,
      ),
    candidateCount: (f) => f.cnt!,
  },
  // 64W — 굳지 않는다. $a$ 를 하나씩 넣어 $b$ 가 자연수인지 봐야 한다.
  "1-2|입체도형의 겉넓이와 부피|64W": {
    // 첫 밑면을 찾고 멈춘 답.
    withoutBinding: (f) => f.first!,
    perturbed: (f) =>
      boxDimensionPairs(f.h!, f.k! + 1).reduce(
        (s, [a, b]) => s + a * b * f.h!,
        0,
      ),
    candidateCount: (f) => f.cnt!,
  },

  // ══ 5차 물결 갈래 a(`m1Top5a.ts`) — 2026-09-04 ═══════════════════
  //
  // 🔴 **네 유형 다 `withoutBinding` 이 «축 없음»이 아니다.** 처음에 `65X`·`67X` 를
  //    「굳힘(평각 · 줄 끝 수)을 안 읽으면 답이 아예 없다」는 근거로 `null` 로 적었다.
  //    그 명제는 참인데, 이 자리가 재는 것은 그것이 아니라 **«굳힘을 읽고 덜 간 답»**
  //    이다(`53V`·`54V`·`63W`·`64W` 가 이미 그렇게 서 있다). 창 전수에 대 보니
  //    **둘 다 진짜 지름길이 있었다**(0.98% · 9.58%, 널 모형은 둘 다 0.00%).
  //    `null` 은 도망칠 구멍이 아니다 — 적기 전에 창 전수에 대 볼 것.
  //
  // 🔴 **되찾기 실패를 `NaN`·`null` 로 덮지 않는다.** `NaN` 은 무엇과도 안 같아서 그 판이
  //    ㉡ 을 **언제나 통과**한다 — 「굳힘이 산다」가 아니라 「내 자가 그 판을 못 잰다」인데
  //    표에는 초록으로 보인다. `withoutBinding` 의 `null` 도 판정기가 「축 없음」으로 읽어
  //    뜻이 겹친다. 그래서 넷 다 **던진다.** 대신 「한 판도 안 던지는가」를 창 전수로 셌다
  //    (65X 1,427 · 66X 935 · 67X 261 · 68X 1,138 — **던짐 0 · NaN 0 · null 0**).

  // 65X — 굳힘은 「평각은 $180^\circ$」 하나. 두 각을 하나도 안 구하고 **합만** 쓴다.
  "1-2|기본 도형|65X": {
    // 그 합(`rest`)을 구하고 **거기서 멈춘** 답. mode B 는 거꾸로 묻는 판이라
    // 대응하는 «덜 간 답»이 「$2$배를 잊음」(`half`)이다.
    // 🔴 창 전수 $1{,}427$ 중 **14자리(0.98%)** 에서 이것이 참 답과 같다 — 널 모형은
    //    **0.00%** 이므로 우연이 아니라 **구조적**이다. 전부 mode C 이고 $c_1+c_2=60$ 이라
    //    답도 두 각의 합도 $120^\circ$ 다. mode A 는 같은 자리를 생성기가 막는데
    //    (`scaledValues(60)` 에 $120$ 이 있다) mode C 는 지면에 **합이 안 찍혀** 샌다.
    // ⚠️ 모드는 `facts` 키로 갈린다(A: `mid`+`rest` · B: `poq`+`half` · C: `c1`·`c2` 추가).
    //    되만들기 실패는 **던진다** — 창 전수 $1{,}427$자리에서 0건.
    withoutBinding: (f) => {
      const v = f.poq === undefined ? f.rest : f.half;
      if (v === undefined) {
        throw new Error(
          `65X 지름길: 모드를 되만들지 못했다 — ${JSON.stringify(f)}`,
        );
      }
      return v;
    },
    // 굳힘 인자는 «가운데 각들의 합»이다. $+2$ 로 흔든다(짝수여야 절반이 정수).
    // ⚠️ 창을 벗어나 던지지 않는다 — A·C 의 `mid` 는 $\le170$, B 의 `poq` 는 $\le175$ 라
    //    흔든 값이 $172$·$176$ 로 두 함수의 정의역 안이다(창 전수 예외 0).
    perturbed: (f) =>
      f.poq === undefined
        ? bisectorAngleFromMiddle(f.mid! + 2)
        : middleSumFromBisector(f.poq + 1),
    // 후보 목록이 **아예 없다** — 값이 하나로 굳는다(`51V`·`62W` 와 같은 자리).
    candidateCount: () => null,
  },
  // 66X — 굳지 않는다. $n$ 을 $3$ 부터 $9$ 까지 하나씩 넣어 봐야 한다.
  "1-2|원과 부채꼴|66X": {
    // 나누어떨어지는 $n$ 을 **하나 찾고 멈춘** 답(`63W`·`64W` 의 `first` 와 같은 자리).
    // 🔴 **정직하게 적어 둘 것**: 답이 «살아남은 것 **전부**의 합»이고 창이 살아남는
    //    $n$ 을 둘 이상으로 못 박으므로 이 축은 **구조적으로 0** 이다. 그래서 이 «0» 은
    //    «깨끗»이 아니라 **「창 조건이 살아 있다」**는 뜻이다 — 그 조건을 끄면
    //    (살아남는 $n$ 이 하나인 둘레를 허용하면) **326/326 = 100%** 로 뛴다(실측).
    //    저술자의 시험이 그 음성 대조를 들고 있어야 이 $0$ 이 뜻을 갖는다.
    withoutBinding: (f) => {
      const first = equalPartArcs(f.C!)[0];
      if (first === undefined) {
        throw new Error(`66X 지름길: 살아남는 n 이 하나도 없다 — C=${f.C}`);
      }
      return first.arc;
    },
    // 굳힘 인자는 둘레다. $C+1$ 은 창 전수 $935$자리 **전부**에서 살아남는 $n$ 집합을
    // 바꾼다(100%) — $C\times2$ 는 69.41%뿐이라 이쪽을 골랐다. 「파일이 바뀌었나」가
    // 아니라 **「뜻이 바뀌었나」**를 본 것이다(2026-08-21).
    // ⚠️ 그중 54.44%는 살아남는 $n$ 이 **하나도 없어** 합이 $0$ 이 된다. 그것은 흔들기가
    //    죽은 것이 아니라 `equalPartArcs` 가 «없음»을 낼 수 있다는 머리말 ㉡ 의 음성
    //    대조와 **같은 자리**다(합 $0$ 은 유한한 수라 ㉡ 의 분모에서 안 빠진다).
    //    나머지 45.56%는 실제로 다른 합이 나온다.
    perturbed: (f) => equalPartArcs(f.C! + 1).reduce((s, e) => s + e.arc, 0),
    // 후보는 훑어야 하는 $n$ 의 자리 수다.
    // ⚠️ 답이 «살아남은 것의 합»이라 「후보 하나를 찍는」 $1/k$ 가 그대로 우연 수준은
    //    아니다. 여기 적는 $7$ 은 **훑는 자리의 수**이고, 진짜 우연 수준은 널 모형이다
    //    (창 전수 0.00%).
    candidateCount: () => PART_MAX - PART_MIN + 1,
  },
  // 67X — 굳지 않는다. 줄이 끝나는 자리를 차례로 만들어 $N$ 이 몇째 줄인지 찾아야 한다.
  "1-1|일차방정식의 활용|67X": {
    // 목표 줄까지는 갔지만 **「왼쪽으로부터 몇 번째」를 안 세고** 그 줄의 첫 수를 답한 것.
    // 🔴 창 전수 $261$ 중 **25자리(9.58%)** 에서 이것이 참 답과 같다 — 널 모형 **0.00%**.
    //    전부 $col=1$ 인 자리다($N$ 이 자기 줄의 첫 수라 「목표 줄의 첫 수」가 곧 답).
    //    방향은 위 13 · 아래 12 로 갈리므로 한쪽 방향만의 결함이 아니다.
    // ⚠️ 「지면에 줄 번호 $r$ 이 없으니 축이 없다」고 적으면 **이 25자리를 영영 못 본다.**
    //    「$N+1$」류 대체 가정은 창이 이미 막아 0.00%였고(`looksLikeShortcut`),
    //    그것만 보고 «축 없음»으로 접었던 것이 첫 판의 잘못이다.
    withoutBinding: (f) => rowEnd(f.target! - 1) + 1,
    // 굳힘 인자는 $N$ 이다. $N+r$ 로 흔들면 **반드시 다음 줄**로 넘어간다
    // ($N\in[\,\mathrm{rowEnd}(r-1)+1,\ \mathrm{rowEnd}(r)\,]$ 이므로
    //  $N+r\in[\,\mathrm{rowEnd}(r)+1,\ \mathrm{rowEnd}(r+1)\,]$).
    // ⚠️ $N+1$ 로 흔들면 안 된다 — 「위」 방향에서 $col=r-1$ 인 판이 자리를 잃고,
    //    $N$ 이 줄의 마지막이면 흔든 답이 **원래와 같아진다**(뜻이 안 바뀌는 변이).
    //    $N+r$ 은 새 줄이 한 칸 길고 $col$ 이 그대로라 자리가 반드시 있다 —
    //    **던짐 0**(창 전수 261).
    perturbed: (f) => {
      if (f.target! > f.r!) return belowInTriangle(f.N! + f.r!);
      const v = aboveInTriangle(f.N! + f.r!);
      if (v === null) {
        throw new Error(
          `67X 흔들기: 위 줄에 그 자리가 없다 — N=${f.N} r=${f.r}`,
        );
      }
      return v;
    },
    // 후보는 「$N$ 이 몇째 줄인가」의 자리 수 — 첫째 줄부터 $r$째 줄까지 견준다.
    candidateCount: (f) => f.r!,
  },
  // 68X — 굳힘은 「평행·만남·꼬인 위치가 모서리 전체를 남김없이 나눈다」 하나다.
  "1-2|위치 관계|68X": {
    // 되짚지 **않고** 「$p$개·$q$개」를 그대로 밑면의 변의 수로 읽은 답.
    // 🔴 창 전수 $1{,}138$ 중 **31자리(2.72%)**. 우연이 아니라 **대수적**이다 —
    //    꼭짓점은 $4n_1+n_2-9=2n_1+n_2+1\iff n_1=5$, 면은
    //    $2n_1+n_2-3=n_1+n_2+3\iff n_1=6$. 그래서 씨앗을 넓혀도 안 사라진다.
    //    다만 널 모형이 **2.46%** 라 그 차이는 0.26%p 뿐이다(`65X`·`67X` 와 달리 우연
    //    수준과 뚜렷이 안 갈린다) — 「크기」는 작게 읽되 「구조적」임은 잊지 말 것.
    withoutBinding: (f) => {
      const ask = solidAskOf(f);
      if (ask === null) {
        throw new Error(
          `68X 지름길: 물음을 되만들지 못했다 — ${JSON.stringify(f)}`,
        );
      }
      const [a, b] = solidCounts(ask, f.p!, f.q!);
      return a + b;
    },
    // 굳힘 인자는 꼬인 위치의 개수다. $p+2$ 는 짝수를 지켜 되짚기가 $n_1+1$ 을 낸다.
    // 물음마다 답이 $+3$·$+2$·$+1$ 로 **반드시** 달라진다(창 전수 «그대로» 0).
    perturbed: (f) => {
      const ask = solidAskOf(f);
      if (ask === null) {
        throw new Error(
          `68X 흔들기: 물음을 되만들지 못했다 — ${JSON.stringify(f)}`,
        );
      }
      const n1 = prismFromSkew(f.p! + 2);
      if (n1 === null) {
        throw new Error(`68X 흔들기: 되짚기가 실패했다 — p=${f.p}`);
      }
      const [a, b] = solidCounts(ask, n1, f.n2!);
      return a + b;
    },
    // 후보 목록이 **아예 없다** — 값이 하나로 굳는다.
    candidateCount: () => null,
  },

  // ══ 5차 물결 갈래 `b`(`m1Top5b.ts`) — 2026-09-04 ═══════════════════

  // 69X — 굳지 않는다(심화상). 훑는 자리 열한 개의 값을 다 만들어 견줘야 한다.
  "1-2|위치 관계|69X": {
    // 🔴 **축 없음** — 굳힘 조건(「꼬인 위치인 짝이 $k$쌍이다」)을 지우면 각뿔 자체가
    //    안 정해져 답이 없다(`94T`·`43U`·`51V`·`61W` 와 같은 자리). 도망이 아니라
    //    **재어 보고 적는다**: 이 유형에서 그럴듯한 «굳힘을 잘못 읽은» 축은 둘인데
    //    창 전수 24판에서 **둘 다 한 판도 정의되지 않는다.**
    //    ㉮ 「만나는 두 개까지 세어 $k=n^{2}$」 → $n=\sqrt k$ 인데
    //       $k=n_0(n_0-2)=(n_0-1)^{2}-1$ 은 제곱수와 $1$ 차이라 **절대 제곱수가 아니다**
    //       (차가 $1$ 인 두 제곱수는 $0,1$ 뿐이다). 실측 0/24.
    //    ㉯ 「끝 점 하나만 빼서 $k=n(n-1)$」 → $n_0(n_0-2)=n(n-1)$ 인 정수 $n$ 이
    //       창 $n_0\in[5,12]$ 어디에도 없다. 실측 0/24.
    //    그래서 이 자리는 「0%」가 아니라 **「축 없음」**이 정직하다. 지름길 판정은
    //    생성기의 `scaledOnce` 가드(창 24 중 4판을 실제로 깎는다)와 저술자의 시험이
    //    널 모형과 견주어 맡는다.
    withoutBinding: () => null,
    // 굳힘 인자는 지면의 $k$ 다. ⚠️ $k$ 를 $\pm1$ 흔들면 $n(n-2)$ 가 드문드문해
    //    되찾기가 대개 `null` 이 되어 「뜻이 바뀌었나」가 아니라 「창 밖으로 나갔나」를
    //    재게 된다. 그래서 **다음 각뿔의 짝 수**로 옮긴다 — 되찾기가 반드시 $n+1$ 을
    //    내고($n+1\le13$ 이라 `PYRAMID_SCAN` 안이다), 세 물음이 다 순증가라
    //    ($2n$·$n+1$·$3n+1$) 값이 늘 갈린다.
    //    ⚠️ 🔴 **되찾기 실패를 `NaN` 으로 덮지 않는다.** 판정기 ㉡ 은
    //       `Number.isFinite(got) && got === want` 로 세므로 `NaN` 은 「그대로 아님」
    //       으로 집계되어 **못 잰 판이 초록으로 숨는다**(0 은 «깨끗»과 «못 셈»을
    //       안 가른다). 그래서 폴백을 **원래 답 그대로**로 둔다 — 되찾기가 실패하는
    //       날 그 판은 「흔들어도 답이 그대로」로 **빨갛게** 찍힌다.
    //       창 전수 24판에서 되찾기가 `null` 인 판 **0** · $n+1$ 이 아닌 판 **0** ·
    //       흔든 답이 원래와 같은 판 **0** 이므로 이 폴백은 오늘 도달할 수 없다.
    perturbed: (f) => {
      const n2 = pyramidSideFromSkew(skewPairCount(f.n! + 1));
      return PYRAMID_ASKS[f.ask!]!.value(n2 ?? f.n!);
    },
    // 견줘야 하는 후보는 훑는 자리 그대로다(`61W` 가 약수 개수를 쓰는 것과 같은 자리).
    candidateCount: () => PYRAMID_SCAN.length,
  },

  // 70X — 굳힘은 「서로 다른 두 점을 지나는 직선은 오직 하나」 하나다.
  "1-2|기본 도형|70X": {
    // 굳힘 조건(「$m$개가 한 직선 위에 있다」)을 **안 읽으면** 형제 `02`·`03` 의
    // 표준형(어느 세 점도 한 직선 위에 없다)으로 보게 되어 직선이 $\binom n2$ 개가 된다.
    // ⚠️ 그 «안 읽은 판»을 식으로 옮겨 적지 않는다 — 제품 표에 $m=2$ 를 넣으면
    //    $\binom22=1$ 이라 빼고 더한 것이 서로 지워져 **정확히 그 값**이 된다
    //    (`distinctLineCount` 주석이 그것을 이 함수의 음성 대조로 적어 두었다).
    // 🔴 **이 «0%» 는 «못 잰다»가 아니라 «세었더니 늘 갈린다»이다.** 창 전수 105판
    //    (총점 7 × 겹침 5 × 물음 3)에서 굳힘은 답을 **늘 $inom m2-1$ 만큼 옮긴다** —
    //    실측 폭 $5,9,14,20,27$($m=4..8$) · **최소 5** · **폭이 $0$ 인 판 0**, 그리고 그
    //    폭이 세 물음과 무관하게 같다. 곧 이 축은 「굳힘이 값을 가르는가」를 **실제로
    //    재고 있고** 그 답이 「늘 가른다」다. ($m=2$ 이면 폭이 $0$ 이 되어 참 답과
    //    만나는데, 창이 $m\ge4$ 라 그 자리를 안 낸다.)
    withoutBinding: (f) => POINT_ASKS[f.ask!]!.value(f.n!, 2),
    // $m$ 을 하나 올린다 — 세 물음 모두 $m$ 만큼 갈리므로 **늘** 다르다.
    // 창이 $m\le8<10\le n$ 이라 `distinctLineCount` 의 창 검사($m>n$ 이면 던진다)에
    // 걸리지 않는다.
    perturbed: (f) => POINT_ASKS[f.ask!]!.value(f.n!, f.m! + 1),
    // 후보 목록이 **아예 없다** — 굳힘 한 줄이 값을 곧장 굳힌다(`51V`·`62W` 와 같다).
    candidateCount: () => null,
  },

  // 71X — 굳힘은 「일차식이려면 $x^{2}$ 의 계수가 $0$」 하나다.
  "1-1|문자의 사용과 식의 계산|71X": {
    // 🔴 굳힘의 **자리를 잘못 잡은** 학생 — 「$x$ 의 계수 $a-b$」를 $0$ 으로 놓으면
    //    $1\cdot a-1\cdot b=0$ 이라 **제품 함수에 $p=q=1$ 을 넣은 것과 같다.**
    //    🔴 **이 축은 창이 막고 있는 진짜 지름길이다** — 창 전수 $2052$판에서 그 오해가
    //    참 답과 겹치는 판이 **17판**이고 **전부 «합» 물음**이다(다른 두 물음에서
    //    구조적으로 못 일어난다는 이 유형 주석의 단언을 실측으로 확인했다).
    //    그중 3판은 상수항 상한($600$)에도 걸리므로 굳힘오해 가드가 **홀로 깎는 것은
    //    14판** — 이 파일 머리말의 D-20 원장 「굳힘오해 −14」와 정확히 맞는다.
    //    그래서 산출물의 «0%» 는 «못 셈»이 아니라 **가드가 실제로 일한 결과**다.
    //    ⚠️ $S$ 가 홀수면 그 학생은 자연수 짝을 못 얻지만 계산은 밀고 나가므로
    //       반값을 그대로 쓴다(참 답은 정수라 그 판에서는 구조적으로 안 맞는다).
    //       어느 쪽이든 **늘 정의된다** — 던지지 않는다. 실측 144판 중 $S$ 가 짝수여서
    //       이 축이 실제로 겨루는 판은 **102판(70.8%)** 이다.
    withoutBinding: (f) => {
      const [a, b] =
        f.s! % 2 === 0
          ? linearCoefficientPair(1, 1, f.s!)
          : [f.s! / 2, f.s! / 2];
      return linearAnswer(f.ask!, a, b, f.c!);
    },
    // ⚠️ $p$ 나 $q$ 를 직접 흔들면 $S$ 가 $p+q$ 의 배수가 아니게 되어
    //    `linearCoefficientPair` 가 **던진다**(판정기가 죽는다). 대신 $S$ 를
    //    $p+q$ 만큼 옮긴다 — $S'=(p+q)(t+1)$ 이라 $b'=p(t+1)$, $a'=q(t+1)$ 로
    //    **늘 자연수 짝**이고, $p\ne q$ 이므로 $a'-b'=(q-p)(t+1)$ 과
    //    $a'b'=pq(t+1)^{2}$ 가 원래와 반드시 갈린다(세 물음 전부).
    perturbed: (f) => {
      const [a, b] = linearCoefficientPair(f.p!, f.q!, f.s! + f.p! + f.q!);
      return linearAnswer(f.ask!, a, b, f.c!);
    },
    // 굳힘 전 후보는 「합이 $S$ 인 두 자연수」 $S-1$ 쌍이다(이 유형 머리말의 그 수).
    candidateCount: (f) => f.s! - 1,
  },

  // 72X — 굳지 않는다(심화상). 열 가지 $x$ 를 세 무리로 갈라 저마다 여섯 번째 값을
  //       만들어 견줘야 한다.
  "1-2|도수분포표와 상대도수|72X": {
    // 🔴 **가운데 무리를 빠뜨린 학생의 답** — $v_5<x<v_6$ 일 때 중앙값이 $x$ 자신이
    //    된다는 것을 못 보고 양 끝 둘($v_5$·$v_6$)만 적는다. 굳힘(자리 세기)의
    //    **절반만 읽은** 답이다(`52V`·`53V` 와 같은 계보).
    //    ⚠️ 식을 옮겨 적지 않는다 — 훑는 구간을 그 두 무리로 좁혀 **제품 함수를
    //       그대로** 부른다.
    //    ⚠️ 이 축은 「구조적으로 0」이 아니라 **창이 막고 있는 진짜 지름길**이다:
    //       생성기가 $d_6\ge d_5+3$ 으로 가운데를 반드시 비우지 않게 뽑는데, 그 조건을
    //       $d_6=d_5+1$ 까지 열면 참 답이 곧 $v_5+v_6$ 이 되어 **같아진다** —
    //       실측으로 그렇게 연 판에서 이 축이 **144/144 적중**한다.
    withoutBinding: (f) => {
      const known = flatKnown(f.v5!, f.v6!);
      const ends = new Set([
        ...possibleMedians(known, 10 * f.s!, f.v5!),
        ...possibleMedians(known, f.v6!, 10 * f.s! + 9),
      ]);
      return [...ends].reduce((a, b) => a + b, 0);
    },
    // 여섯 번째 값을 하나 올린다 — 가능한 중앙값이 $[v_5,v_6+1]$ 로 넓어져 합이
    // 반드시 $v_6+1$ 만큼 커진다. 창이 $v_6\le10s+7$ 이라 $v_6+1$ 은 늘
    // $[10s,10s+9]$ 안이고, `possibleMedians` 의 「전체가 홀수」 검사도 통과한다.
    perturbed: (f) =>
      possibleMedians(
        flatKnown(f.v5!, f.v6! + 1),
        10 * f.s!,
        10 * f.s! + 9,
      ).reduce((a, b) => a + b, 0),
    // 견줘야 하는 후보는 «가능한 중앙값» 이다(답은 그 전부의 합 — `61W` 가 약수 개수를
    // 쓰는 것과 같은 꼴이라 «찍어서 맞힐 확률»이 아니라 **견줄 후보의 수**다).
    candidateCount: (f) => f.n!,
  },

  // ══ 5차 물결 갈래 `c`(`m1Top5c.ts`) — 2026-09-04 ═════════════════
  //
  // 🔴 등록(`generate.ts`)은 리드 몫이라 이 넷이 아직 `registeredTypes()` 에 없을 수
  //    있다. 그때 이 항목들은 **잠자코 있다** — 모집단이 등록에서 오기 때문이다.
  //    ⚠️ 굳힘 함수를 **여기서 다시 구현하지 않는다.** `m1Top5c.ts` 가 이미 다섯을
  //    내보내고 있어 그 파일에 **한 글자도 안 더했다**(`largerFromSumAndDiff` ·
  //    `polyhedronScan` · `polyhedronStop` · `sumOfPairSums` · `factorPairWithSum`).

  // 73X — 굳힘은 이 소단원의 개념 하나다: 「직사각형의 넓이 = 계급의 크기 × 도수」.
  //       그것을 안 읽으면 넓이의 차를 **곧장 도수의 차로** 읽는다.
  "1-2|도수분포표와 상대도수|73X": {
    // 🔴 **계급의 크기로 나누는 걸음을 건너뛴 답** — 굳힘의 앞쪽 절반(이 소단원의
    //    개념 그 자체)을 안 읽은 학생이다. 뒤쪽 절반(합과 차)은 제품 함수를 그대로
    //    부르므로, 이 축은 「개념 한 걸음만 빼면 답이 갈리나」를 정확히 잰다.
    //    ⚠️ **`null` 이 아니라 `NaN` 을 낸다.** 넓이의 차는 계급의 크기(2~30)를
    //    곱한 값이라 도수의 합보다 큰 판이 많고(실측 1,200판 중 **91.2%**), 그때는
    //    자연수 짝이 아예 없어 **그 학생이 답을 못 낸다.** 「축이 없다」(null)와
    //    「이 판에서는 지름길이 서지도 않는다」(NaN)는 다른 말이므로 갈라 적는다 —
    //    `null` 로 내면 표가 이 유형을 **「축 없음」으로 통째로 지운다.**
    //    ⚠️ 그러면 판정기의 「0%」는 분모의 91% 가 **값이 안 서는 판**이 된다 —
    //    값이 선 판만 분모로 해도 적중은 **0/106**(1,200판 기준)이라 결론은 같지만,
    //    표에 그 수를 같이 안 찍으면 그 「0%」가 «깨끗»인지 «못 셈»인지 안 갈린다.
    withoutBinding: (f) => {
      const big = largerFromSumAndDiff(f.sum!, f.area!);
      if (big === null) return Number.NaN;
      // 「큰 계급을 물었나」는 `facts` 에 없다 — `x` 가 `big` 인지로 되만든다
      // (생성기가 차를 $2$ 이상으로 묶어 `big !== small` 이 보장된다).
      return f.x! === f.big! ? big : f.sum! - big;
    },
    // ⚠️ 차를 $1$ 만큼 흔들면 **합과 홀짝이 어긋나** `largerFromSumAndDiff` 가
    //    `null` 을 내고, 그러면 「답이 달라졌다」가 **자연수 짝이 없어서**인지
    //    「굳힘이 산다」인지 안 갈린다. `null`(→`NaN`)은 무엇과도 안 같아서 그 판이
    //    ㉡ 을 **언제나 통과**한다 — 「굳힘이 산다」가 아니라 「내 자가 그 판을 못 잰다」다.
    //    $2$ 만큼 흔들면 홀짝이 보존되어(합과 차의 합이 $2\times$큰 도수라 늘 짝수)
    //    늘 정의되고 큰 도수 $+1$ · 작은 도수 $-1$ 로 늘 달라진다. **창 전수
    //    1,551,420판(가드를 끈 넓은 창)에서 되찾기 실패 0 · 흔들어도 그대로 0**
    //    ($\text{diff}+2\le\text{sum}$ 은 작은 도수 $\ge1$ 과 동치라 구조적으로 참).
    perturbed: (f) => {
      const big = largerFromSumAndDiff(f.sum!, f.diff! + 2);
      if (big === null) return Number.NaN;
      return f.x! === f.big! ? big : f.sum! - big;
    },
    // 후보 목록이 **아예 없다** — 합과 차에서 값이 하나로 굳는다(94T·43U·51V 와 같은 자리).
    candidateCount: () => null,
  },

  // 74X — 굳지 않는다. $a=3,4,5,\dots$ 를 차례로 넣어 모서리의 곱을 견줘야 한다.
  // 74X — 굳지 않는다. $a$ 를 차례로 넣어 **최대공약수를 실제로 구해** 견줘야 한다.
  "1-2|다면체와 회전체|74X": {
    // 🔴 **이 유형은 2026-09-04 에 둘째 조건을 «곱»에서 «최대공약수»로 갈았다.**
    //    곱이던 때는 「끝 후보를 찍는다」가 **48.2%**(우연의 2.46배)로 맞았다 —
    //    $P=6a(K-2a)$ 가 위로 볼록이라 $a$ 와 $K/2-a$ 가 같은 곱을 내고, 끝쪽은 그 짝이
    //    $3$ 미만이라 **유일성이 공짜**였다(자리별 통과율 $19	o35	o48	o41	o50	o63	o100$,
    //    단조 증가). 창을 깎는 안 셋(끝 버림·양끝 버림·$K$ 홀수만)은 쏠림을 **옆으로
    //    옮길 뿐**이었고, 「답을 먼저 뽑는다」도 안 들었다 — 그 방법이 듣는 조건은
    //    «버리는 규칙이 답과 무관»인데 여기선 규칙이 답의 자리를 보기 때문이다.
    //    최대공약수는 볼록 짝이 없어 통과율이 단조가 아니게 되고, 창·서로 다른 답·최빈
    //    정답이 **모두 좋아졌다**(83→96 · 41→52 · 7.2%→5.2%).
    //
    //    ⚠️ **1.34배는 «지름길이 없다»가 아니라 «우연보다 크게 낫지 않다»**이다.
    //    후보가 평균 서넛뿐이라 고정 자리 하나가 이미 우연히 28% 를 맞는다.
    //    그리고 배수가 낮다고 심화상인 것도 아니다 — 대조로 재 본 「모서리의 **합**」은
    //    배수 1.30 으로 더 낮은데 $a=2K-S$ 로 **곧장 풀린다.** 「자리가 고르다」와
    //    「견줘야 한다」는 다른 말이고, 최대공약수는 닫힌 식이 없어 후보마다 계산해야 한다.
    //
    //    축은 **가장 잘 뚫는 자리**를 쓴다(«학생의 습관»이 아니라 «가장 잘 뚫는 길»).
    //    제품 경로 96판 실측 — 첫 29.2% · 둘째 35.4% · **끝둘째 37.5%** · 끝 36.5%
    //    (우연 28.0% · 배수 1.34 · 되만들기 모호 0/96).
    //    ⚠️ **아래 표는 24판(씨앗 8 × 변형 3)만 쓰므로 이 값보다 높게 찍힌다**
    //    (실측 45.8%). 표본이 넷째만큼 작아서지 유형이 나빠진 것이 아니다 —
    //    표를 읽을 때 96판 값과 함께 볼 것.
    withoutBinding: (f) => {
      const cands = polyhedronDivisorCandidates(f.vSum! - 1, f.edgeGcd!);
      if (cands.length < 2) return null; // 견줄 자리가 없으면 이 축이 아예 없다
      return polyhedronAt(f, cands[cands.length - 2]!);
    },
    // 굳힘 인자는 **최대공약수**다. 이웃 후보 $a'$ 가 반드시 살아남도록 그 자리의
    // 실제 최대공약수로 흔들고, `polyhedronDivisorCandidates` 가 정말 $a'$ 를 내놓는지
    // **제품 함수로 확인**한다. 되찾기가 실패하면 `NaN` 이 아니라 **참 답 그대로**를
    // 내어 ㉡ 이 「흔들어도 그대로」로 **빨갛게** 찍히게 한다 — `NaN` 은 무엇과도 안
    // 같아 조용히 통과하고, 그것은 「굳힘이 산다」가 아니라 「못 쟀다」이다.
    perturbed: (f) => {
      const kSum = f.vSum! - 1;
      const a2 = kSum - 2 * (f.a! + 1) >= 3 ? f.a! + 1 : f.a! - 1;
      if (a2 < 3) return f.x!;
      const b2 = kSum - 2 * a2;
      const g2 = gcd(3 * a2, 2 * b2);
      if (!polyhedronDivisorCandidates(kSum, g2).includes(a2)) return f.x!;
      return polyhedronAt(f, a2) ?? f.x!;
    },
    // 후보는 훑어서 견줘야 하는 $a$ 의 자리 수다(제품 함수를 그대로 부른다 —
    // `facts.lines` 를 안 믿는다: 믿으면 그 값이 틀렸을 때 이 자가 같이 눈이 먼다).
    candidateCount: (f) =>
      polyhedronDivisorCandidates(f.vSum! - 1, f.edgeGcd!).length || null,
  },
  // 75X — 굳힘은 「세 식을 모두 더하면 $A+B+C$ 의 **$2$배**」 하나다.
  "1-1|문자의 사용과 식의 계산|75X": {
    // 🔴 **$2$ 로 나누는 걸음을 건너뛴 답** — 세 식을 모두 더한 것을 곧장 $A+B+C$ 로
    //    보고 $B+C$ 를 뺀다. 굳힘의 **핵심 한 마디**만 지운 것이라 이 유형의 참
    //    지름길이고, 생성기의 `oneStep`·지면 수 가드가 **막지 않는 축**이다
    //    (그 가드들이 막는 「$(A+B)-(B+C)$」로 재면 그 가드의 성적을 다시 재는
    //    동어반복이 된다). 참 답과 같아지려면 $s_1+s_0=0$ 이어야 하는데 실측
    //    1,200판 중 **0판**이라 적중 **0.0%** — 그 «0» 은 «못 셈»이 아니라
    //    **조건이 실제로 안 서는 것**이고, 그 조건 자체를 함께 세어 두었다.
    withoutBinding: (f) => f.s1! - f.q1! + (f.s0! - f.q0!),
    // ⚠️ 한 합의 계수를 $1$ 만 흔들면 세 합의 총합이 **홀수**가 되어 `sumOfPairSums`
    //    가 `null` 을 낸다 — 「답이 달라졌다」가 **$2$ 로 안 나눠져서**인지 굳힘 덕인지
    //    안 갈린다. $2$ 만큼 흔들면 늘 정의되고 답이 정확히 $1$ 줄어든다.
    //    🔴 `sumOfPairSums` 는 $x$의 계수와 상수항의 홀짝을 **따로** 보므로 곱집합을
    //    두 축으로 갈라 전수했다 — 계수 삼중 **4,096** · 상수 삼중 **5,832**, 곧
    //    **23,887,872판에서 되찾기 실패 0**. 구조적이다:
    //    $(A+B)+(B+C)+(C+A)=2(A+B+C)$ 라 총합이 **늘 짝수**이고 $+2$ 도 짝수다.
    perturbed: (f) => {
      const got = sumOfPairSums(
        [f.p1!, f.p0!],
        [f.q1! + 2, f.q0!],
        [f.r1!, f.r0!],
      );
      return got === null ? Number.NaN : got[0] + got[1];
    },
    // 후보 목록이 **아예 없다** — 값이 하나로 굳는다.
    candidateCount: () => null,
  },

  // 76X — 굳지 않는다. 합이 $S$ 인 자연수 짝을 전부 만들어 곱을 견줘야 한다.
  "1-2|도수분포표와 상대도수|76X": {
    // 🔴 **곱 조건을 안 읽고 «합을 반씩 나눈» 답**(= 짝 목록의 **끝**). 첫 짝
    //    $(1,\ S-1)$ 로 재면 생성기 창이 작은 도수를 $3$ 부터 뽑아 **구조적으로 0**이라
    //    아무것도 못 잰다. 끝 짝은 실측 **8.0%** 가 맞고 참 짝의 상대 위치 중앙값이
    //    **0.688**(0=첫, 1=끝)이라 뒤쪽으로 쏠려 있다 — 그 쏠림을 재는 축이다.
    //    우연 수준 7.2% 의 **1.11배**라 판별력은 크지 않지만, 「살아남는 자리가 목록의
    //    한쪽 끝인가」(초등 함정 ㉠)를 이 유형에서 실제로 재는 유일한 축이다.
    withoutBinding: (f) => {
      const small = Math.floor(f.sum! / 2);
      return f.x! === f.big! ? f.sum! - small : small;
    },
    // ⚠️ 곱을 아무렇게나 흔들면 **아무 짝과도 안 맞아** `null`(→`NaN`)이 되어
    //    흔들기가 아무것도 안 잰다. 그래서 **이웃 짝이 반드시 서도록** 흔들고
    //    (작은 도수 $-1$ · 큰 도수 $+1$), `factorPairWithSum` 이 실제로 그 짝을
    //    내놓는지 **제품 함수로 확인**한다. **창 전수 660판**(가드를 끈 넓은 창)에서
    //    되찾기 실패 **0** · 흔들어도 그대로 **0** — 구조적이다: 작은 도수가 $3$ 이상이라
    //    $-1$ 해도 $2\ge1$ 이고 합이 그대로여서 그 짝이 목록에 반드시 선다.
    perturbed: (f) => {
      const got = factorPairWithSum(f.sum!, (f.small! - 1) * (f.big! + 1));
      if (got === null || got[0] !== f.small! - 1) return Number.NaN;
      return f.x! === f.big! ? got[1] : got[0];
    },
    // 후보는 합이 $S$ 인 자연수 짝의 개수 — 곧 `facts.pairs` 다(실측 1/13.9).
    candidateCount: (f) => f.pairs!,
  },

  // ══ 5차 물결 갈래 d(`m1Top5d.ts`) — 2026-09-04 ═══════════════════
  //
  // 🔴 등록(`generate.ts`)이 리드 몫이라 이 넷이 아직 `registeredTypes()` 에 없을 수
  //    있다. 그때 이 항목들은 잠자코 있다가 등록되는 순간 함께 재어진다.
  //    넷 다 `withoutBinding` 이 **수를 낸다** — 「축 없음(null)」을 주장한 유형이 없다.

  // 77X — 굳지 않는다. 총합을 먼저 구한 뒤에도 다섯 계급을 하나씩 견주어야 하고,
  //       답이 살아남은 것 **전부의 합**이라 하나만 알아서는 못 낸다.
  "1-2|도수분포표와 상대도수|77X": {
    // 견줌을 아예 안 하고 다섯 계급값을 다 더한 답. 기준을 $0\%$ 로 내리면 다섯이
    // 전부 살아남으므로 **굳힘 함수를 그대로 부르면서** 조건만 지운다.
    // 생성기가 「살아남는 계급 셋~넷」만 받고 계급값이 모두 양수이므로 이 값은 답보다
    // 반드시 크다 — 실측 0/2400.
    withoutBinding: (f) =>
      sum5d(classesAtLeastPercent(classValues77(f), frequencies77(f), 0)),
    // ⚠️ **$+1$ 로 흔들면 안 된다.** 도수가 서로 다른 정수라 $f\times100$ 은 $100$ 씩
    //    떨어져 있는데 문턱은 총합($25\sim70$)만 움직여, 실측 **73.8%(531/720)** 가
    //    그대로다 — 그것은 「굳힘이 장식」이 아니라 내 흔들기가 경계를 못 넘은 것이다
    //    (2026-08-21). $+20$ 은 산술로 증명된다: 새 기준이 $35\%$ 이상이라 세 계급이
    //    살면 도수의 합이 총합을 넘으므로 살아남는 것이 **둘 이하로 반드시 줄고**,
    //    그것이 원래의 부분집합이며 계급값이 모두 양수이므로 합이 **반드시 작아진다**.
    //    실측 0/2400(그리고 「둘 이하 & 합이 더 작다」가 2400/2400).
    perturbed: (f) =>
      sum5d(
        classesAtLeastPercent(
          classValues77(f),
          frequencies77(f),
          f.percent! + 20,
        ),
      ),
    // 후보 목록 = 이 판이 낼 수 있는 답, 곧 다섯 계급값 가운데 **셋 또는 넷**을 고른 합.
    // 계급값이 등차라 $\binom53+\binom54=15$ 중 셋이 겹쳐 늘 **12** 다(우연 8.3%).
    candidateCount: (f) => {
      const cs = classValues77(f);
      const seen = new Set<number>();
      for (let mask = 0; mask < 32; mask += 1) {
        const chosen = cs.filter((_, i) => (mask >> i) & 1);
        if (chosen.length < 3 || chosen.length > 4) continue;
        seen.add(sum5d(chosen));
      }
      return seen.size;
    },
  },
  // 78X — 굳힘은 이 소단원의 개념 「(소금의 양)$=$(소금물의 양)$\times$(농도)」 하나.
  "1-1|일차방정식의 활용|78X": {
    // 그 개념을 안 쓰면 「덜어낸 소금물 $x$ g 만큼 소금도 $x$ g 줄었다」로 읽게 된다.
    // 그 답은 (처음 소금)$+$(넣은 소금)$-$(나중 소금)이고, 풀어 보면 참 답의
    // $\frac{a}{100}$ 배다 — 농도 $a$ 가 $30$ 이하이므로 **절대 같아지지 않는다**.
    // 실측: 그 항등식이 2400/2400 · 맞은 판 0/2400.
    withoutBinding: (f) => f.startSalt! + f.salt! - f.endSalt!,
    // 소금물을 $a$ g 늘리면 분자가 $(a-b)\times a$ 만큼 움직여 답이 **정확히 $a-b$**
    // 옮겨 간다(나눗셈이 늘 떨어진다). $a\ne b$ 를 생성기가 막아 두었으므로 답은 늘
    // 달라진다. 그 값이 창($0<x<$ 소금물의 양) 밖이면 소금을 $a$ g 더 넣는 쪽으로
    // 흔든다(그쪽은 답이 $100-b$ 만큼 옮겨 간다).
    // 🔴 **창 전수 3,038판**(생성기의 네 겹 가드를 그대로 건 전수)에서
    //    첫 갈래가 막히는 판 **4** · **두 갈래가 다 막히는 판 0** · 답과 같아지는 판 **0**.
    //    단일 흔들기로는 전수 0 이 안 된다(mass+a 4 · mass-a 83 · mass+2a 19 ·
    //    salt+a 688 · salt-a 298). 그래서 두 갈래다.
    // ⚠️ 둘 다 막히면 **`NaN` 이 아니라 원래 답(`f.x`)** 을 낸다. NaN 은 무엇과도 안
    //    같아서 그 판이 ㉡ 을 **늘 통과**하고, 표에서 「굳힘이 산다」와 「내 자가 그 판을
    //    못 쟀다」가 같아 보인다(0 은 «깨끗»과 «못 셈»을 안 가른다 — 2차 물결 `43U` 가
    //    실제로 96판 중 95판을 그렇게 통과하고 있었다). 원래 답을 내면 그런 판이
    //    생기는 날 ㉡ 이 **「흔들어도 답이 그대로」로 빨갛게** 찍혀 눈에 띈다.
    perturbed: (f) =>
      drawnSaltAmount(f.a!, f.mass! + f.a!, f.salt!, f.b!) ??
      drawnSaltAmount(f.a!, f.mass!, f.salt! + f.a!, f.b!) ??
      f.x!,
    // 후보 목록이 **아예 없다** — 값이 일차방정식 하나로 굳는다(`51V`·`62W` 와 같은 자리).
    candidateCount: () => null,
  },
  // 79X — 굳지 않는다. 네 삼각형의 넓이를 다 계산해 견주어야 하고, 답이 그 **차**다.
  "1-1|좌표와 그래프|79X": {
    // 밑변을 $\mathrm{AB}$ 로만 보고 **둘에서 멈춘** 답(`63W`·`64W` 의 `f.first` 자리).
    // 🔴 이 축은 **0% 가 아니다 — 9.9%(238/2400)**. 그리고 그 238판은 전부
    //    「최대와 최소가 **둘 다** 자리 $0\cdot1$」인 판이고 **값만 우연히 같은 판은
    //    0건**이다(238/238). 잣대가 둘인데 **서로 반대**라 둘 다 적는다:
    //    ⑴ 널 모형(답을 판끼리 돌려 끼운 우연)은 **1.25%** 라 실측이 그 **8배**다 —
    //       이 모형이 참 풀이의 **절반(네 넓이 중 둘)을 실제로 계산**하니 당연하다.
    //    ⑵ 「최대·최소가 넷 중 어느 쌍에 있나」가 고르다면 $1/6=16.7\%$ 인데 실측이
    //       그보다 **낮고**, 후보 우연 $1/4=25\%$ 의 절반도 안 된다.
    //    「반만 하면 열에 하나 맞는다」가 이 수의 뜻이다. 0 으로 만들려면 생성기가
    //    「최대·최소가 같은 밑변 쪽인 판」을 버려야 하고 비용은 **19.5%(469/2400)** 다.
    withoutBinding: (f) => {
      const a = areas79(f);
      return Math.abs(a[0]! - a[1]!);
    },
    // ⚠️ **국소 흔들기는 0% 가 안 된다.** 실측 `v+2` 1.7% · `q+2` 1.9% · `t+2` 15.8% ·
    //    `r+2` 15.3%(2400판). $t$·$r$ 이 큰 까닭은 그 좌표가 **한 쌍의 두 넓이를 같은
    //    양만큼** 옮겨 차를 보존하기 때문이다 — 최대·최소가 반대쪽 쌍에 있으면 답이
    //    그대로다. 그건 「장식」도 「뜻이 안 바뀐 흔들기」도 아니고 **뜻은 바뀌었는데
    //    답이 우연히 같은** 세 번째 경우인데, 씨앗이 바뀔 때마다 🔴 이 깜빡인다
    //    (거짓 경보는 가드를 끈다 — 2026-08-20).
    //    $x$좌표만 두 배로 하면 $\mathrm{AB}$ 와 두 밑변까지의 거리가 함께 두 배가 되어
    //    **네 넓이가 모두 두 배**가 되고, 답도 $2x$ 가 된다. 생성기가 $x\ge5$ 를 요구하니
    //    $2x\ne x$ 다 — 실측 0/2400, 그리고 「$2x$ 와 같다」가 2400/2400.
    perturbed: (f) =>
      spread79(
        fourTriangleAreas(f.p! * 2, f.q! * 2, f.t!, f.r! * 2, f.u!, f.v!),
      ),
    // 후보 목록 = 네 넓이에서 고를 수 있는 차. 넓이는 서로 다르지만 차끼리는 겹쳐
    // 중앙값 **4**(최소 3 · 최대 6) — 우연 25.0%.
    candidateCount: (f) => {
      const a = areas79(f);
      const seen = new Set<number>();
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) seen.add(Math.abs(a[i]! - a[j]!));
      }
      return seen.size;
    },
  },
  // 80X — 굳힘은 이 소단원의 개념 둘(거리$\leftrightarrow$절댓값 · 사분면 위의 점은
  //       두 좌표가 $0$ 이 아니다). 점을 하나도 나열하지 않고 곱 하나로 끝난다.
  "1-1|좌표와 그래프|80X": {
    // 둘째 개념을 안 읽어 **축 위의 점을 안 걷어낸** 답 — 그러면 각 좌표가 한 가지씩
    // 늘어 $2(m+1)(n+1)$ 이 된다. $m,n\ge2$ 이므로 $2mn$ 보다 반드시 크다.
    // 창 전수 19,354판에서 맞은 판 **0**.
    // ⚠️ 「미만을 이하로 읽은 답」($2\,m_{said}n_{said}$)을 쓰면 안 된다 — 실측 **24.9%**
    //    가 맞는데, 그 값이 「이하·이하」 판의 비율 **24.9%** 와 소수점까지 같다.
    //    그 판에는 그 걸음이 **애초에 없어서** 맞는 것이라 영구 거짓 경보가 된다.
    withoutBinding: (f) =>
      quadrantLatticeCount(f.m! + 1, f.n! + 1, [f.q1!, f.q2!]),
    // 「미만↔이하」를 뒤집는다 — 발문의 뜻이 바뀌고 $m$ 이 **정확히 $\pm1$** 움직여
    // 답 $2mn$ 이 반드시 달라진다. 창 전수 19,354판에서 그대로인 판 **0** ·
    // `quadrantLatticeCount` 가 던진 판 **0**($m\ge2$ 라 $m-1\ge1$ 이다).
    // ⚠️ **$m$ 쪽만** 뒤집는다. 둘 다 뒤집으면 $(m-1)(n+1)=mn$ 인 자리가 있어
    //    실측 **2.0%** 가 그대로다(곱이라 대칭이라는 모듈 주석의 그 자리).
    perturbed: (f) =>
      quadrantLatticeCount(f.mStrict! === 1 ? f.mSaid! : f.mSaid! - 1, f.n!, [
        f.q1!,
        f.q2!,
      ]),
    // 후보 목록이 **아예 없다** — 곱 하나로 굳는다.
    candidateCount: () => null,
  },
};

export function sweep(): Row[] {
  const out: Row[] = [];
  for (const e of topEntries()) {
    for (const seed of SEEDS) {
      for (const v of VARIANTS) {
        const p = generateMiddleProblem(e.key, seed, v);
        out.push({
          key: e.key,
          tier: p.difficulty,
          seed,
          variant: v,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          facts: p.facts,
        });
      }
    }
  }
  return out;
}

// ── 보고 ────────────────────────────────────────────────────

function pct(hit: number, all: number): string {
  return `${((hit / all) * 100).toFixed(1)}%`;
}

function reportShortcuts(rows: Row[]): void {
  console.log("\n## ㉠ 지름길 — 굳힘 조건을 안 읽고 답이 나오나\n");
  console.log(
    "| 유형 | 표본 | ⑴ 지면 수 조합이 맞은 최고 규칙 | ⑵ 굳힘 조건을 지운 답 | 우연 수준 |",
  );
  console.log("|---|---|---|---|---|");
  for (const e of topEntries()) {
    const mine = rows.filter((r) => r.key === e.key);
    const tally = new Map<string, number>();
    for (const r of mine) {
      const want = answerNumber(r.answer);
      for (const [name, v] of obviousCandidates(pageNumbers(r.content))) {
        // `#i#j` 는 자리 이름이라 유형 안에서만 뜻이 있다.
        if (v === want) tally.set(name, (tally.get(name) ?? 0) + 1);
      }
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    // 🔴 축을 안 적은 유형은 **조용히 빠지지 않는다** — 그 줄이 «깨끗»으로 읽히면
    //    새 물결이 판정기 밖에 서 있는 것을 아무도 모른다.
    const axis = AXES[e.key];
    if (axis === undefined) {
      console.log(
        `| ${e.key} | ${mine.length} | 🔴 **축(AXES)을 안 적었다** | — |`,
      );
      continue;
    }
    // 🔴 **판마다 따로 본다.** 예전에는 `mine[0]` 하나가 `null` 이면 그 유형을 통째로
    //    「축 없음」으로 적었다 — 판에 따라 축이 서고 안 서는 유형에서 나머지를
    //    구조적으로 못 본다. 그리고 값이 **안 서는** 판(`NaN`)은 「지름길이 안 맞았다」와
    //    다른 말이라 분모에서 뺀다 — 안 빼면 「지름길 0%」의 분모 대부분이 애초에
    //    지름길이 서지도 않는 판일 수 있고, 그 표는 «깨끗»과 «못 셈»을 안 가른다.
    let hit = 0;
    let noAxis = 0;
    let noValue = 0;
    for (const r of mine) {
      let wb: number | null;
      try {
        wb = axis.withoutBinding(r.facts);
      } catch {
        wb = Number.NaN;
      }
      if (wb === null) noAxis += 1;
      else if (!Number.isFinite(wb)) noValue += 1;
      else if (wb === answerNumber(r.answer)) hit += 1;
    }
    const scored = mine.length - noAxis - noValue;
    const tail = noValue > 0 ? ` · 지름길이 안 서는 판 ${noValue}` : "";
    const noBind =
      noAxis === mine.length
        ? "**축 없음** (조건을 지우면 문제가 사라진다)"
        : scored === 0
          ? `🔴 **못 쟀다** (${mine.length}판 모두 값이 안 섰다)`
          : `${pct(hit, scored)} (${hit}/${scored})${tail}${noAxis > 0 ? ` · 축 없는 판 ${noAxis}` : ""}`;
    const ks = mine
      .map((r) => axis.candidateCount(r.facts))
      .filter((v): v is number => v !== null);
    const chance =
      ks.length === 0
        ? "— (후보 목록 없음)"
        : `1/${(ks.reduce((a, b) => a + b, 0) / ks.length).toFixed(1)}`;
    console.log(
      `| \`${e.key.split("|")[2]}\` ${mine[0]!.tier} | ${mine.length} | ` +
        `${best ? `\`${best[0]}\` ${pct(best[1], mine.length)}` : "**0건**"} | ${noBind} | ${chance} |`,
    );
  }
}

function reportBinding(rows: Row[]): void {
  console.log("\n## ㉡ 굳힘이 항등식인가 — 인자를 흔들면 답이 바뀌나\n");
  console.log("| 유형 | 표본 | 흔들어도 답이 그대로 | 판정 |");
  console.log("|---|---|---|---|");
  for (const e of topEntries()) {
    const mine = rows.filter((r) => r.key === e.key);
    const axis = AXES[e.key];
    if (axis === undefined) {
      console.log(
        `| ${e.key} | ${mine.length} | 🔴 **축(AXES)을 안 적었다** | — |`,
      );
      continue;
    }
    // 🔴 **값을 못 낸 판을 «답이 바뀌었다»로 세지 않는다.** 예전에는 아래 `same`
    //    하나만 세고 `Number.isFinite` 로 조용히 걸렀는데, 그러면 흔들기가 창 밖으로
    //    나가 `NaN`·`null` 을 내는 판이 전부 **「굳힘이 산다」**로 읽힌다.
    //    실제로 `43U` 가 96판 중 **95판**을 그렇게 통과하고 있었다(2026-09-04).
    //    「답이 안 바뀌었다」(장식)와 「잴 수가 없었다」(못 셈)는 다른 말이므로
    //    분모를 갈라 찍고, 못 잰 판이 있으면 판정을 **보류**한다.
    let same = 0;
    let unmeasured = 0;
    for (const r of mine) {
      let got: number;
      try {
        got = axis.perturbed(r.facts);
      } catch {
        got = Number.NaN;
      }
      if (!Number.isFinite(got)) unmeasured += 1;
      else if (got === answerNumber(r.answer)) same += 1;
    }
    const measured = mine.length - unmeasured;
    const verdict =
      measured === 0
        ? "🔴 **못 쟀다** (흔들기가 한 판도 값을 못 냈다)"
        : same > 0
          ? "🔴 **장식**"
          : unmeasured > 0
            ? `⚠️ 굳힘이 산다 — 다만 ${unmeasured}판은 **못 쟀다**`
            : "굳힘이 산다";
    console.log(
      `| \`${e.key.split("|")[2]}\` | ${mine.length} | ${pct(same, measured)} (${same}/${measured}) | ` +
        `${verdict} |`,
    );
  }
}

function reportOverlap(rows: Row[]): void {
  console.log("\n## ㉢ 갈래끼리 겹침 — 천장을 먼저 찍는다\n");
  console.log(
    "⚠️ **한글 Jaccard 는 «다름이 수식 안에만 있는» 유형을 못 본다.** 기준선의 `1.000` 쌍은",
  );
  console.log(
    "「중복」이 아니라 **「이 열쇠로는 안 갈린다」**이다(`10`↔`11` 은 둘 다 「다음 방정식을 푸시오」다).",
  );
  console.log(
    "그러므로 기준선의 최댓값을 **내 값의 면제부로 쓰면 안 된다** — 중앙값과 견주어라.\n",
  );
  const all = registeredTypes();
  for (const e of topEntries()) {
    const mine = rows.filter((r) => r.key === e.key);
    const p0 = generateMiddleProblem(e.key, SEEDS[0]!, 0);
    // 천장 — 같은 유형을 다른 씨앗으로 자기 자신과 견준다.
    let ceilNum = 0;
    let ceilNumPairs = 0;
    let ceilJac = 0;
    let n = 0;
    for (let i = 0; i < mine.length; i += 1) {
      for (let j = i + 1; j < mine.length; j += 1) {
        const v = numAnswerJaccard(
          mine[i]!.content,
          mine[i]!.answer,
          mine[j]!.content,
          mine[j]!.answer,
        );
        // 🔴 「수+정답」 열쇠로 못 재는 쌍은 **평균에서 빼고 세어 찍는다.** 0 으로
        //    치면 천장이 낮아져 「이 열쇠로는 판정 불가」가 실제보다 더 자주 나온다.
        if (v !== null) {
          ceilNum += v;
          ceilNumPairs += 1;
        }
        ceilJac += koreanJaccard(mine[i]!.content, mine[j]!.content);
        n += 1;
      }
    }
    ceilNum = ceilNumPairs === 0 ? Number.NaN : ceilNum / ceilNumPairs;
    ceilJac /= n;
    const section = p0.unitSection;
    const siblings = all.filter(
      (t) =>
        t.key !== e.key &&
        generateMiddleProblem(t.key, SEEDS[0]!, 0).unitSection === section,
    );
    console.log(
      `\n### \`${e.key}\` (${p0.difficulty}) — 소단원 «${section}» 형제 ${siblings.length}`,
    );
    console.log(
      `천장(자기 자신): 수+정답 **${Number.isNaN(ceilNum) ? "판정 불가(답에 수가 없다)" : ceilNum.toFixed(3)}**` +
        ` (잰 쌍 ${ceilNumPairs}/${n}) · 한글 Jaccard **${ceilJac.toFixed(3)}**` +
        `${ceilNum < CEILING_FLOOR ? "  ← 수+정답 천장이 문턱 아래다. 그 열쇠로는 **판정 불가**" : ""}`,
    );
    // 🔴 **분모** — 형제끼리는 원래 얼마나 닮았나. 이것 없이 내 값만 보면
    //    「0.833 이 높은가」를 알 수 없다. 착지한 유형끼리의 분포가 기준선이다.
    const baseline: number[] = [];
    for (let i = 0; i < siblings.length; i += 1) {
      for (let j = i + 1; j < siblings.length; j += 1) {
        baseline.push(
          koreanJaccard(
            generateMiddleProblem(siblings[i]!.key, SEEDS[0]!, 0).content,
            generateMiddleProblem(siblings[j]!.key, SEEDS[0]!, 0).content,
          ),
        );
      }
    }
    baseline.sort((a, b) => a - b);
    const med = baseline[Math.floor(baseline.length / 2)] ?? 0;
    console.log(
      `기준선(**착지한 형제끼리**, ${baseline.length}쌍): 한글 Jaccard 중앙값 **${med.toFixed(3)}** · ` +
        `최댓값 **${(baseline[baseline.length - 1] ?? 0).toFixed(3)}**`,
    );
    console.log("\n| 형제 | 갈래 | 수+정답 | 한글 Jaccard |");
    console.log("|---|---|---|---|");
    const scored = siblings.map((t) => {
      const q = generateMiddleProblem(t.key, SEEDS[0]!, 0);
      return {
        key: t.key.split("|")[2]!,
        tier: q.difficulty,
        num: numAnswerJaccard(p0.content, p0.answer, q.content, q.answer),
        jac: koreanJaccard(p0.content, q.content),
      };
    });
    for (const s of scored.sort((a, b) => b.jac - a.jac)) {
      // 🔴 「판정 불가」를 **0.000 으로 찍지 않는다.** 0 으로 보이면 「안 닮았다」로
      //    읽히는데 실은 **이 열쇠가 그 형제를 못 본다**는 뜻이다.
      const num = s.num === null ? "판정 불가" : s.num.toFixed(3);
      console.log(
        `| \`${s.key}\` | ${s.tier} | ${num} | **${s.jac.toFixed(3)}** |`,
      );
    }
  }
}

function reportDepth(rows: Row[]): void {
  console.log(
    "\n## ⑸ 해설 깊이 — `probe-middle-solution-depth` 의 자를 그대로 쓴다\n",
  );
  console.log("| 유형 | 표본 | 걸음 건너뛰기 | 해설 길이 중앙값 |");
  console.log("|---|---|---|---|");
  for (const e of topEntries()) {
    const mine = rows.filter((r) => r.key === e.key);
    const thin = mine.filter((r) => isThin(r.content, r.solution)).length;
    const lens = mine.map((r) => r.solution.length).sort((a, b) => a - b);
    console.log(
      `| \`${e.key.split("|")[2]}\` | ${mine.length} | ${pct(thin, mine.length)} (${thin}/${mine.length}) | ${lens[Math.floor(lens.length / 2)]}자 |`,
    );
  }
}

/**
 * 🔴 **⑹ 해설이 정답지 한 단에 들어가나** — 2026-09-02 에 세운 축.
 *
 * ## 왜 이 축이 필요한가
 *
 * 3차 물결의 `53V` 가 해설 **1242.3px** 로 착지할 뻔했다. 정답지 한 단은
 * `JASEUP_MEASURED_PX.answerSolutionsFull` = 964.8px 이고, `.answerSolutions` 는
 * `column-count:2` + `overflow:hidden` 이라 **넘친 해설은 «조금 잘리는» 것이 아니라
 * 그 쪽 다른 문항의 해설을 밀어내 통째로 없앤다**(`printOverflow.ts` 주석).
 *
 * 그런데 그 결함을 **이 판정기도, 저술자의 시험 92개도, 관문 어느 것도 못 봤다** —
 * 값 검산·미설명 수·KaTeX·냄새 자는 전부 「값이 맞나」와 「글자가 옳나」를 볼 뿐
 * 「지면에 들어가나」를 안 본다. 심화 갈래는 해설이 **후보를 하나씩 적어야** 하므로
 * (D-116 ⑹) 이 축이 구조적으로 위험한 자리다. 그래서 **갈래마다 재어 찍는다.**
 *
 * ⚠️ 자를 옮겨 적지 않는다 — 제품 `estimateSolutionPx` 를 **그대로 부른다.**
 */
function reportSolutionHeight(): void {
  const col = JASEUP_MEASURED_PX.answerSolutionsFull;
  console.log(
    `\n## ⑹ 해설이 정답지 한 단(${col}px)에 들어가나 — 제품 \`estimateSolutionPx\` 를 그대로 부른다\n`,
  );
  console.log(
    "⚠️ 넘치면 **그 쪽 다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).",
  );
  console.log(
    "심화 갈래는 후보를 한 줄씩 적으므로(D-116 ⑹) 여기가 구조적으로 위험한 자리다.\n",
  );
  console.log("| 유형 | 표본 | 중앙 | 최대 | 한 단 초과 | 한 단 대비 |");
  console.log("|---|---|---|---|---|---|");
  // 🔴 보고용 표본(24판)으로는 최댓값을 못 믿는다 — 여기서만 씨앗을 넓힌다.
  const WIDE = 60;
  for (const e of topEntries()) {
    const px: number[] = [];
    for (let s = 0; s < WIDE; s += 1) {
      for (const v of VARIANTS) {
        px.push(
          estimateSolutionPx(
            generateMiddleProblem(e.key, 1000003 + s * 7919, v).solution,
          ),
        );
      }
    }
    px.sort((a, b) => a - b);
    const over = px.filter((h) => h > col).length;
    const max = px[px.length - 1]!;
    console.log(
      `| \`${e.key.split("|")[2]}\` | ${px.length} | ${px[Math.floor(px.length / 2)]!.toFixed(0)}px | ` +
        `**${max.toFixed(0)}px** | ${over === 0 ? "0" : `🔴 **${pct(over, px.length)} (${over}/${px.length})**`} | ` +
        `${((max / col) * 100).toFixed(0)}% |`,
    );
  }
}

function reportRubric(): void {
  console.log(
    "\n## 반증 ④ — 같은 소단원의 **연산·기본·응용**을 사람이 읽을 목록\n",
  );
  console.log(
    "⚠️ **이 표는 판정이 아니다.** D-115 ⑾ 이 「어느 쪽인지는 기계가 못 정한다 —",
  );
  console.log(
    "사람이 본다」고 못 박았다. 읽은 결과는 보고서에 **[눈]** 으로 적는다.\n",
  );
  const all = registeredTypes();
  for (const e of topEntries()) {
    const section = generateMiddleProblem(e.key, SEEDS[0]!, 0).unitSection;
    console.log(`\n### «${section}» — \`${e.key.split("|")[2]}\` 가 서는 자리`);
    for (const t of all) {
      const q = generateMiddleProblem(t.key, SEEDS[0]!, 0);
      if (q.unitSection !== section) continue;
      if (!["연산", "기본", "응용"].includes(q.difficulty)) continue;
      console.log(`  [${q.difficulty}] ${t.rpmType} ${t.rpmTitle}`);
      console.log(`      ${q.content.replace(/\n/g, " ")}`);
    }
  }
}

// ── 눈금 — **이 자가 «아니오»를 낼 수 있는가** ──────────────────

/**
 * 양성 13 · 음성 11 (2026-09-03 에 4차 물결 여덟을 더했다). 음성이 없으면 재현율만
 * 재고 거짓 경보는 구조적으로 0이 된다
 * (2026-08-20 「판정자의 성적표에는 양성과 음성 대조군이 둘 다 있어야 한다」).
 *
 * 🔴 대조군을 **엔진 밖에서** 짓는다 — 엔진 산출물로만 눈금을 매기면 갈래를 고치는
 * 순간 양성이 사라지고, 그 뒤로는 전량 초록이라 잘 도는 것처럼 보인다.
 */
function selftest(): number {
  const cases: [string, boolean, boolean, string][] = [];
  const add = (
    name: string,
    want: boolean,
    got: boolean,
    why: string,
  ): void => {
    cases.push([name, want, got, why]);
  };

  // ㉠ ⑴ 지면 수 조합 — 양성: 답이 두 수의 차인 지면
  add(
    "양성 ㉠: 답이 두 수의 차면 잡는다",
    true,
    [...obviousCandidates([30, 12]).values()].includes(18),
    "obviousCandidates([30,12]) 에 18 이 있어야 한다",
  );
  // 음성: 목록에 없는 수는 안 잡는다
  add(
    "음성 ㉠: 뻔하지 않은 수는 안 잡는다",
    false,
    [...obviousCandidates([30, 12]).values()].includes(7),
    "30·12 로 7 을 만드는 뻔한 규칙은 없다",
  );

  // ㉡ 굳힘 검출 — 양성: 인자를 흔들어도 값이 같은 «장식» 함수
  // 인자를 **받되 안 쓰는** 함수 — 그것이 «장식»의 정의다. 삼항으로 적어야
  //    `no-unused-vars` 가 안 울린다(경고는 가드를 끄는 잡음이 된다).
  const decorative = (n: number): number => (n > 0 ? 42 : 42);
  add(
    "양성 ㉡: 장식인 굳힘은 흔들어도 답이 같다",
    true,
    decorative(1) === decorative(999),
    "인자를 무시하는 함수는 장식이다 — 검사가 이것을 잡아야 한다",
  );
  // 음성: 진짜 굳힘은 흔들면 달라진다
  add(
    "음성 ㉡: 산 굳힘은 흔들면 답이 달라진다",
    false,
    solveSameRemainder([75, 183, 318]) === solveSameRemainder([75, 183, 345]),
    "셋째 수를 바꾸면 차들의 최대공약수가 달라져야 한다",
  );

  // ㉢ 수+정답 — 양성: 같은 지면끼리는 1.0
  add(
    "양성 ㉢: 같은 지면끼리 수+정답은 1.0",
    true,
    numAnswerJaccard("$12$와 $18$", "$6$", "$12$와 $18$", "$6$") === 1,
    "자기 자신과 견주면 1.0 이어야 한다",
  );
  // 음성: 무관한 지면은 낮다
  add(
    "음성 ㉢: 무관한 지면은 수+정답이 낮다",
    false,
    (numAnswerJaccard("$12$와 $18$", "$6$", "$77$과 $91$", "$7$") ?? 1) > 0.3,
    "겹치는 수가 없으면 0 이어야 한다",
  );

  // 🔴 2026-09-02 — 「답에 수가 없는 형제」. 종전 판은 **던져서** `--overlap` 이
  //    그 자리에서 죽었다(소단원 «정비례 관계 y=ax의 그래프» 형제 12개 중 4개).
  //    「이 열쇠로는 못 잰다」와 「자가 고장 났다」를 갈라야 한다 — 죽은 자는
  //    아무것도 안 지킨다. 양성·음성을 **한 쌍**으로 둔다.
  add(
    "양성 ㉢: 답에 수가 없으면 «판정 불가»(null)를 낸다",
    true,
    numAnswerJaccard("$y=ax$의 그래프", "$27$", "네 정비례 관계", "$y=-x$") ===
      null,
    "형제 `06` 의 답 `$y=-x$` 에는 수가 없다 — 던지지 말고 판정 불가여야 한다",
  );
  add(
    "음성 ㉢: 답에 수가 있으면 판정 불가가 아니다",
    false,
    numAnswerJaccard("$12$와 $18$", "$6$", "$12$와 $18$", "$6$") === null,
    "이 자가 «판정 불가»를 **아무 때나** 내면 겹침을 영영 못 잰다",
  );

  // ㉢ 한글 Jaccard — 양성/음성
  add(
    "양성 ㉢: 같은 발문끼리 Jaccard 는 1.0",
    true,
    koreanJaccard(
      "세 자연수를 어떤 자연수로 나누면 나머지가 모두 같다",
      "세 자연수를 어떤 자연수로 나누면 나머지가 모두 같다",
    ) === 1,
    "자기 자신과 견주면 1.0 이어야 한다",
  );
  add(
    "음성 ㉢: 무관한 발문은 Jaccard 가 낮다",
    false,
    koreanJaccard(
      "세 자연수를 어떤 자연수로 나누면 나머지가 모두 같다",
      "다음 도수분포표에서 계급값을 구하시오",
    ) > 0.15,
    "겹치는 낱말이 없으면 0 에 가까워야 한다",
  );

  // 해설 깊이 — 남의 자를 그대로 쓴다. 그 자가 살아 있는지 여기서도 확인한다.
  add(
    "양성 ⑸: 생략 표지 뒤에 답만 오면 얇다",
    true,
    isThin("경우의 수를 구하시오.", "표로 정리하여 세면 모두 $3$가지이다."),
    "probe-middle-solution-depth 의 나쁜 실례",
  );
  add(
    "음성 ⑸: 중간 결과가 있으면 얇지 않다",
    false,
    isThin(
      "값을 구하시오.",
      "풀면 $2x=8$이고 $x=4$이다. 이때 $y=3x=12$이므로 $x+y=16$이다.",
    ),
    "생략 표지가 있어도 중간 결과가 셋이면 얇지 않다",
  );

  // ⑹ 해설 높이 — 제품 자를 그대로 쓴다. 그 자가 «아니오»를 낼 수 있는지 여기서 본다.
  //    🔴 양성만 두면 「길면 잡는다」만 재고 **거짓 경보는 구조적으로 0** 이 된다.
  const oneColumn = JASEUP_MEASURED_PX.answerSolutionsFull;
  add(
    "양성 ⑹: 아주 긴 해설은 정답지 한 단을 넘는다",
    true,
    estimateSolutionPx(
      Array.from(
        { length: 60 },
        (_, i) =>
          `$${i}$ 이것은 아주 긴 해설 줄이며 지면에서 여러 줄을 먹는다.`,
      ).join("\n"),
    ) > oneColumn,
    `한 단은 ${oneColumn}px — 60줄짜리 해설은 그것을 넘어야 한다`,
  );
  add(
    "음성 ⑹: 짧은 해설은 한 단을 안 넘는다",
    false,
    estimateSolutionPx("따라서 구하는 값은 $12$이다.") > oneColumn,
    "이 자가 아무 글이나 «넘친다»고 하면 아무것도 못 잰다",
  );

  // 굳힘 함수 자체 — 답을 아는 손 계산과 맞대 본다
  add(
    "양성: 31T 굳힘 함수가 손 계산과 같다",
    true,
    solveSameRemainder([75, 183, 318]) === 27,
    "차 108·135·243 의 최대공약수는 27",
  );
  add(
    "양성: 32T 굳힘 함수가 손 계산과 같다",
    true,
    coprimePairSums(4, 385).join(",") === "184,248,328,1544",
    "(1,385)(5,77)(7,55)(11,35) 에 4를 곱한 합",
  );

  // ══ 4차 물결(`m1Top4.ts`)의 굳힘 함수 — 양성 4 · 음성 4 ═══════════
  //
  // 🔴 대조군을 **엔진 밖에서** 짓는다. 넷 다 «손 계산»과 «그 자가 «아니오»를 낼 수
  //    있는가»를 한 쌍으로 둔다 — 양성만 두면 재현율만 재고 거짓 경보는 구조적으로
  //    0 이 된다(2026-08-20).
  add(
    "양성: 61W 굳힘 함수가 손 계산과 같다",
    true,
    divisorSum(36) === 91,
    "$36$ 의 약수 $1,2,3,4,6,9,12,18,36$ 의 합은 $91$",
  );
  add(
    "음성: 61W 는 상수를 흔들면 답이 달라진다",
    false,
    divisorSum(36) === divisorSum(37),
    "$\\sigma(36)=91$ · $\\sigma(37)=38$ — 흔들기 축이 살아 있다",
  );
  add(
    "양성: 62W 굳힘 함수가 손 계산과 같다",
    true,
    relativeDenominator(35) === 20 &&
      smallestTotalCount(30, 35) === 20 &&
      classFrequencySum(30, 35) === 13,
    "$0.3=\\frac3{10}$ · $0.35=\\frac7{20}$ → $N=20$, 도수 $6+7=13$",
  );
  add(
    "음성: 62W 는 기약분모가 서로소가 아니면 «곱으로 본 답»과 갈린다",
    false,
    productTotalAnswer(30, 35) === classFrequencySum(30, 35),
    "서로소인 판($0.2$·$0.25$)에서는 같아진다 — 그래서 생성기가 그것을 버린다",
  );
  add(
    "양성: 63W 는 조건에 맞는 $x$ 가 **하나도 없는** 판을 낼 수 있다",
    true,
    meanEqualsMedianValues(5, 6, 7, 12).length === 0,
    "$5,6,7,12$ — 세 경우가 다 죽는다(자가 «없음»을 낼 수 있다)",
  );
  add(
    "음성: 63W 우리 창의 판은 빈 집합이 아니다",
    false,
    meanEqualsMedianValues(7, 10, 13, 18).length === 0,
    "$7,10,13,18$ → $x=2,12,17$",
  );
  add(
    "양성: 64W 는 밑면이 **하나도 없는** 판을 낼 수 있다",
    true,
    boxDimensionPairs(8, 12).length === 0,
    "$h=8$, $K=12$ — 첫 자리에서 이미 $a>b$ 다",
  );
  add(
    "음성: 64W 우리 창의 판은 빈 집합이 아니다",
    false,
    boxDimensionPairs(3, 63).length === 0,
    "$h=3$, $K=63$ → 밑면 $1\\times15$, $3\\times9$, $5\\times6$",
  );

  let bad = 0;
  console.log("## 눈금 — 이 자가 «아니오»를 낼 수 있는가\n");
  for (const [name, want, got, why] of cases) {
    const ok = want === got;
    if (!ok) bad += 1;
    console.log(`${ok ? "  ✅" : "  ❌"} ${name} — ${why}`);
  }
  // 🔴 형식은 **관문이 읽는 모양**이어야 한다 — `elemProbeGauges.test.ts` 가
  //    `눈금 N건` 을 세고, 그 수를 그냥 믿지 않고 판정 줄(`✅`/`❌`)을 **다시** 센다.
  //    그리고 파일 이름이 `probe-middle-*` 라야 그 그물에 걸린다 — 처음엔
  //    `probe-mid-top-m1.ts` 였고, 그러면 이 눈금은 **한 번도 자동으로 안 돈다**
  //    (관문은 초록인데 아무것도 안 지킨다 — 「축이 없다」의 또 한 얼굴이다).
  console.log(
    `\n눈금 ${cases.length}건 — ${bad === 0 ? "전부 통과" : `${bad}건 어긋남`}` +
      ` (양성 ${cases.filter((c) => c[1]).length} · 음성 ${cases.filter((c) => !c[1]).length})`,
  );
  return bad;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) {
    process.exitCode = selftest() === 0 ? 0 : 1;
    return;
  }
  const rows = sweep();
  console.log(
    `# 중1 상위 갈래 판정 — 유형 ${topEntries().length} × 씨앗 ${SEEDS.length} × 변형 ${VARIANTS.length} = ${rows.length}문항`,
  );
  if (argv.includes("--rubric")) {
    reportRubric();
    return;
  }
  if (argv.includes("--overlap")) {
    reportOverlap(rows);
    return;
  }
  reportShortcuts(rows);
  reportBinding(rows);
  reportDepth(rows);
  reportSolutionHeight();
  reportOverlap(rows);
}

if (isDirectScript(import.meta.url)) main();
