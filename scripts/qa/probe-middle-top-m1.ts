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
  valueFromReciprocalSum,
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
    perturbed: (f) =>
      valueFromReciprocalSum(f.s! + 1, f.p!, f.q!, f.r!, f.u!) ?? Number.NaN,
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
    let noBind = "**축 없음** (조건을 지우면 문제가 사라진다)";
    const probe = axis.withoutBinding(mine[0]!.facts);
    if (probe !== null) {
      const hit = mine.filter(
        (r) => axis.withoutBinding(r.facts) === answerNumber(r.answer),
      ).length;
      noBind = `${pct(hit, mine.length)} (${hit}/${mine.length})`;
    }
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
    const same = mine.filter((r) => {
      const got = axis.perturbed(r.facts);
      return Number.isFinite(got) && got === answerNumber(r.answer);
    }).length;
    console.log(
      `| \`${e.key.split("|")[2]}\` | ${mine.length} | ${pct(same, mine.length)} (${same}/${mine.length}) | ` +
        `${same === 0 ? "굳힘이 산다" : "🔴 **장식**"} |`,
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
  const decorative = (n: number): number => 42;
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
