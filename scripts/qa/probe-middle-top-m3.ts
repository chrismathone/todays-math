/**
 * 🔴 **중3 확대 갈래(`심화중`·`심화상`)가 «굳힘»을 정말로 갖고 있나** — D-116.
 *
 * 브리프 `tracks/briefs/mid-extending-tiers.md` §3 이 「반드시 재라」고 못 박은 함정
 * 셋을 잰다. 초등이 네 물결에 걸쳐 물렸고 초6 에서는 **이것으로 병합이 두 번 막혔다**
 * (`tier-fill-g6-w3-adversarial.md` §7.1).
 *
 * ```
 * ㉠ 굳힘 조건을 **안 읽고** 후보의 최댓값(또는 최솟값)을 집으면 몇 %가 맞나.
 *    우연 수준(후보가 k개면 1/k)을 넘으면 그 갈래는 다시 지어야 한다.
 * ㉡ 굳힘을 **지우면** 답이 바뀌나. 안 바뀌면 그것은 굳힘이 아니라 장식이다.
 * ㉢ 새 갈래가 같은 소단원의 아랫 갈래와 겹치나 — 열쇠 둘을 **같이** 쓰고,
 *    쌍마다 **천장을 먼저 찍는다.**
 * ```
 *
 * ## 🔴 이 자가 «아니오»를 낼 수 있나 — 눈금이 먼저다
 *
 * 판정기도 판정자다. 양성만 대면 재현율만 재고 «지어냄»은 구조적으로 0 이 된다
 * (2026-08-20). 그래서 검사마다 **양성**(걸려야 하는 가짜 설계)과 **음성**(걸리면
 * 안 되는 것)을 둘 다 댄다. `--selftest` 가 그것이다.
 *
 * ⚠️ ㉠·㉡ 의 양성 대조군은 **손으로 지은 `Sift`** 다. 살아 있는 엔진만 보면
 *    생성기가 이미 그 씨앗을 버리므로 «늘 통과»가 나오고, 그러면 **검출 능력을
 *    잃어도 답이 같다**(2026-08-31 초6 이 「양성 대조군을 문자열 픽스처로 박았다」로
 *    적어 둔 자리와 같은 처방).
 *
 * ## 참이 어디서 오나
 *
 * **엔진**이다 — `planMedianMean`·`planVertexQuadrant` 와 `generateMiddleProblem` 을
 * 그대로 부른다. 적재본(DB)이 아니다. 둘은 다른 것이고 고친 시각과 적재한 시각의
 * 순서가 결함의 유무를 정한다(2026-08-27·08-30). 이 워크트리는 DB 를 쓰지도 읽지도
 * 않는다(브리프 §6).
 *
 * ```bash
 * npx tsx scripts/qa/probe-middle-top-m3.ts --selftest   # 눈금 (양성 5 · 음성 5)
 * npx tsx scripts/qa/probe-middle-top-m3.ts              # ㉠ ㉡ ㉢ 전량
 * npx tsx scripts/qa/probe-middle-top-m3.ts --overlap    # ㉢ 만 (천장 포함, 느리다)
 * ```
 */
import { pathToFileURL } from "node:url";

import { createRng } from "../../src/lib/elementary/rng";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  M3_TOP,
  planMedianMean,
  planVertexQuadrant,
  type Sift,
} from "../../src/lib/middle/m3Top";
import {
  M3_TOP_3,
  planCancel,
  planQuadraticAlive,
  planRationalRoots,
  planRootSum,
} from "../../src/lib/middle/m3Top3";
import { tidySolution } from "../../src/lib/middle/solutionText";
import { resolveMiddleTier } from "../../src/lib/middle/tier";
import type { MidProblem } from "../../src/lib/middle/types";
import { wrapDanClause } from "../../src/lib/problemText";

const SEEDS = 400;
const SEED0 = 20260901;

/**
 * 🔴 **모집단을 손 목록(`M3_TOP`)에서 뽑지 않는다** — 2026-09-02.
 *
 * 확대 갈래는 물결마다 **새 모듈**에 서므로(`m3Top2.ts` · 접미사 `U`), 2차 물결
 * 넷이 이 판정기에서 **조용히 빠져** 있었다 — 「깨끗하다」가 아니라 **아무도 안
 * 쟀다**는 뜻이다. 중2 판정기는 이미 등록에서 뽑는다. 여기도 맞췄다.
 *
 * 🔴 **그런데 등록만으로는 한 걸음 모자란다** — 2026-09-02 (3차 물결).
 *
 * 확대 갈래는 물결마다 **새 모듈**에 선다(`m3Top2.ts` `U` · `m3Top3.ts` `V`).
 * 그런데 `generate.ts` 에 spread 한 줄을 넣는 것은 **리드의 몫**이라, 저술 세션이
 * 이 자를 돌리는 시점에는 그 물결이 `registeredTypes()` 에 **아직 없다.**
 * 등록만 보면 그 넷은 조용히 빠지고 「🔴 줄이 없다」가 나오는데, 그것은
 * 「깨끗하다」가 아니라 **아무도 안 쟀다**는 뜻이다 — 0 은 「깨끗」과 「못 셈」을
 * 안 가른다(2026-08-21). 그래서 등록 목록에 **소유 모듈을 합집합**으로 얹는다.
 *
 * 합집합이 실제로 일하는지는 `--selftest` 가 「3차 물결 넷이 모집단에 있다」로 센다.
 */
export function topEntries(): { key: string; unitSection: string }[] {
  const rows = new Map<string, string>();
  for (const e of registeredTypes()) {
    if (e.grade !== "중3") continue;
    const d = makeSample(e.key, SEED0, 0).difficulty;
    if (d !== "심화중" && d !== "심화상") continue;
    rows.set(e.key, e.unitSection);
  }
  // 아직 등록되지 않은 소유 모듈 — 등록되면 위에서 이미 잡히므로 여기서는 덮어쓰기다.
  for (const e of M3_TOP_3) rows.set(e.key, e.unitSection);
  return [...rows].map(([key, unitSection]) => ({ key, unitSection }));
}

const LOCAL_BY_KEY = new Map(M3_TOP_3.map((e) => [e.key, e]));
const REGISTERED_KEYS = new Set(registeredTypes().map((e) => e.key));

/** `generate.ts` 의 소금 — 등록 뒤에는 두 길이 **글자까지 같아야** 한다. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * 한 문항 — 등록돼 있으면 **제품 함수**를, 아직이면 소유 모듈의 생성기를 쓴다.
 *
 * ⚠️ 등록 전 길도 `generateMiddleProblem` 이 **부르는 그 함수들**
 * (`tidySolution`·`wrapDanClause`·`resolveMiddleTier`)을 그대로 밟는다 —
 * 규칙을 옮겨 적으면 두 길이 갈라져도 아무도 모른다.
 */
function makeSample(key: string, seed: number, variant: number): MidProblem {
  const local = LOCAL_BY_KEY.get(key);
  if (!local || REGISTERED_KEYS.has(key)) {
    return generateMiddleProblem(key, seed, variant);
  }
  const p = local.handler(createRng(seed + keySalt(key) + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  return {
    ...p,
    content,
    solution: tidySolution(p.solution),
    difficulty: resolveMiddleTier(p.difficulty, content, !!p.figureSpec),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// ㉠ 굳힘을 안 읽고 극단을 집으면 몇 %가 맞나
// ────────────────────────────────────────────────────────────────────────────

export type EdgeScore = {
  n: number;
  /** 후보의 최댓값만 집었을 때 답과 같은 비율 */
  maxHit: number;
  /** 최솟값만 집었을 때 */
  minHit: number;
  /** 우연 수준 = 1/(후보 수) 의 평균 */
  chance: number;
};

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

/**
 * ㉠ 을 잰다. **굳힘을 한 글자도 안 읽고** 후보의 극단만 집는 «게으른 학생»이
 * 몇 %나 맞는지가 곧 굳힘의 선택력이다.
 */
export function edgeScore(sifts: readonly Sift[]): EdgeScore {
  let maxHit = 0;
  let minHit = 0;
  let chance = 0;
  for (const s of sifts) {
    const mx = Math.max(...s.candidates);
    const mn = Math.min(...s.candidates);
    if (sameSet([mx], s.kept)) maxHit += 1;
    if (sameSet([mn], s.kept)) minHit += 1;
    chance += 1 / s.candidates.length;
  }
  const n = sifts.length || 1;
  return {
    n: sifts.length,
    maxHit: maxHit / n,
    minHit: minHit / n,
    chance: chance / n,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// ㉡ 굳힘을 지우면 답이 바뀌나
// ────────────────────────────────────────────────────────────────────────────

export type SiftScore = {
  n: number;
  /** 굳힘이 아무도 안 거른 비율 — 이것이 «항등식 굳힘» 이다 */
  identity: number;
  /** 굳힘이 남긴 후보 수의 평균 */
  keptAvg: number;
  /** `kept` 가 `candidates` 의 부분집합이 아닌 건수 — 있으면 설계가 깨진 것 */
  broken: number;
};

/** ㉡ 을 잰다 — 굳힘을 지운다는 것은 「후보 전부가 답이 된다」는 뜻이다. */
export function siftScore(sifts: readonly Sift[]): SiftScore {
  let identity = 0;
  let kept = 0;
  let broken = 0;
  for (const s of sifts) {
    const cand = new Set(s.candidates);
    if (!s.kept.every((x) => cand.has(x))) broken += 1;
    if (sameSet(s.candidates, s.kept)) identity += 1;
    kept += s.kept.length;
  }
  const n = sifts.length || 1;
  return {
    n: sifts.length,
    identity: identity / n,
    keptAvg: kept / n,
    broken,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// ㉢ 갈래끼리 겹침 — 열쇠 둘을 같이, 천장을 먼저
// ────────────────────────────────────────────────────────────────────────────

/** 지면에 적힌 수 전부 + 정답. 작은 집합에서 잘 듣는 열쇠. */
export function numberKey(content: string, answer: string): Set<string> {
  const out = new Set<string>();
  for (const text of [content, answer]) {
    for (const m of text.matchAll(/-?\d+(?:\.\d+)?/g)) out.add(m[0]!);
  }
  return out;
}

/**
 * 발문의 **한글 낱말**. 심화에서는 이쪽이 듣는다(진짜 겹침 0.94~0.97 · 무관
 * 0.03~0.06, 브리프 §3 ㉢).
 *
 * 수식을 통째로 지운 뒤 한글 덩어리만 센다 — 수만 다른 두 유형이 «다르다»로
 * 새지 않게.
 */
export function wordKey(content: string): Set<string> {
  const plain = content.replace(/\$[^$]*\$/g, " ");
  const out = new Set<string>();
  for (const m of plain.matchAll(/[가-힣]+/g)) {
    if (m[0]!.length >= 2) out.add(m[0]!);
  }
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

type Sample = { key: string; tier: string; content: string; answer: string };

function sampleType(key: string, seeds: number[]): Sample[] {
  const out: Sample[] = [];
  for (const s of seeds) {
    for (const v of [0, 1, 2]) {
      try {
        const p = makeSample(key, s, v);
        out.push({
          key,
          tier: p.difficulty,
          content: p.content,
          answer: p.answer,
        });
      } catch {
        /* 변형 공간 밖 — 건너뛴다 */
      }
    }
  }
  return out;
}

/** 두 표본 무리 사이의 최대 겹침 — 쌍마다 두 열쇠를 각각 잰다. */
function pairMax(xs: Sample[], ys: Sample[]): { num: number; word: number } {
  let num = 0;
  let word = 0;
  for (const x of xs) {
    const xn = numberKey(x.content, x.answer);
    const xw = wordKey(x.content);
    for (const y of ys) {
      if (x === y) continue;
      num = Math.max(num, jaccard(xn, numberKey(y.content, y.answer)));
      word = Math.max(word, jaccard(xw, wordKey(y.content)));
    }
  }
  return { num, word };
}

// ────────────────────────────────────────────────────────────────────────────
// 눈금 — 이 자가 «아니오» 를 낼 수 있나
// ────────────────────────────────────────────────────────────────────────────

function selftest(): void {
  const rows: { name: string; want: boolean; got: boolean; why: string }[] = [];
  const say = (name: string, want: boolean, got: boolean, why: string) =>
    rows.push({ name, want, got, why });

  // ── ㉠ 양성: 굳힘이 «늘 최댓값»을 남기는 가짜 설계 (초6 1-1-1 이 물린 그 자리)
  const alwaysMax: Sift[] = [];
  for (let i = 0; i < 50; i += 1) {
    const cand = [i + 1, i + 5, i + 9];
    alwaysMax.push({ candidates: cand, kept: [Math.max(...cand)] });
  }
  say(
    "㉠ 양성 — 늘 최댓값이 답인 설계를 잡는다",
    true,
    edgeScore(alwaysMax).maxHit > 0.9,
    `maxHit=${(edgeScore(alwaysMax).maxHit * 100).toFixed(1)}%`,
  );

  // ── ㉠ 음성: 답이 골고루 흩어지는 설계는 «우연 수준» 근처여야 한다
  const spread: Sift[] = [];
  for (let i = 0; i < 60; i += 1) {
    const cand = [1, 2, 3];
    spread.push({ candidates: cand, kept: [cand[i % 3]!] });
  }
  const sp = edgeScore(spread);
  say(
    "㉠ 음성 — 흩어진 설계를 «장식»으로 잡지 않는다",
    true,
    sp.maxHit < 0.5 && sp.minHit < 0.5,
    `maxHit=${(sp.maxHit * 100).toFixed(1)}% minHit=${(sp.minHit * 100).toFixed(1)}% chance=${(sp.chance * 100).toFixed(1)}%`,
  );

  // ── ㉡ 양성: 굳힘이 아무도 안 거르는 «항등식» 설계
  const idle: Sift[] = [{ candidates: [3, 7, 9], kept: [3, 7, 9] }];
  say(
    "㉡ 양성 — 굳힘이 아무도 안 거르면 잡는다",
    true,
    siftScore(idle).identity === 1,
    `identity=${siftScore(idle).identity}`,
  );

  // ── ㉡ 음성: 실제로 거르는 설계는 안 잡힌다
  const real: Sift[] = [{ candidates: [3, 7, 9], kept: [7] }];
  say(
    "㉡ 음성 — 실제로 거르는 설계는 안 잡는다",
    true,
    siftScore(real).identity === 0 && siftScore(real).broken === 0,
    `identity=0 broken=0`,
  );

  // ── ㉡ 양성 ②: `kept` 가 후보 밖이면 설계가 깨진 것이다
  const bad: Sift[] = [{ candidates: [3, 7], kept: [5] }];
  say(
    "㉡ 양성② — 굳힘이 후보 밖 값을 내면 잡는다",
    true,
    siftScore(bad).broken === 1,
    `broken=1`,
  );

  // ── ㉢ 양성: 같은 글은 두 열쇠 다 1.0 근처
  const same = "다음 자료의 평균과 중앙값이 같을 때 $x$의 값을 모두 구하시오.";
  say(
    "㉢ 양성 — 같은 발문을 «겹침»으로 잡는다",
    true,
    jaccard(wordKey(same), wordKey(same)) === 1,
    "word=1.00",
  );

  // ── ㉢ 음성: 무관한 두 발문은 낮아야 한다
  const other =
    "이차함수 $y=x^2-2kx+2k^2-5$의 그래프의 꼭짓점이 제$1$사분면 위에 있을 때 상수 $k$의 값을 구하시오.";
  const w = jaccard(wordKey(same), wordKey(other));
  say(
    "㉢ 음성 — 무관한 발문을 «겹침»으로 안 잡는다",
    true,
    w < 0.3,
    `word=${w.toFixed(2)}`,
  );

  // ── 열쇠가 수식만 다른 것을 «다르다»로 새지 않는가
  const a1 = "다음 자료의 중앙값이 $7$일 때 $x$의 값을 구하시오.";
  const a2 = "다음 자료의 중앙값이 $19$일 때 $x$의 값을 구하시오.";
  say(
    "㉢ 열쇠 — 수만 다른 두 발문은 낱말 열쇠로 같다",
    true,
    jaccard(wordKey(a1), wordKey(a2)) === 1,
    "word=1.00",
  );

  // ── 수 열쇠는 반대로 그 둘을 가른다 (두 열쇠를 «같이» 쓰는 까닭)
  say(
    "㉢ 열쇠 — 수 열쇠는 그 둘을 가른다",
    true,
    jaccard(numberKey(a1, "$3$"), numberKey(a2, "$3$")) < 1,
    `num=${jaccard(numberKey(a1, "$3$"), numberKey(a2, "$3$")).toFixed(2)}`,
  );

  // ── 등록: 새 갈래가 실제로 `심화중`·`심화상` 으로 나오는가 (분모)
  const tiers = new Set(
    topEntries().map((e) => makeSample(e.key, SEED0, 0).difficulty),
  );
  say(
    "분모 — 등록한 유형이 확대 갈래로 나온다",
    true,
    tiers.has("심화중") && tiers.has("심화상"),
    [...tiers].join("·"),
  );

  // 🔴 **모집단이 새는가** — 등록이 리드의 몫이라, 합집합이 죽으면 3차 물결 넷이
  //    조용히 빠지고 「🔴 줄 없음」이 「깨끗」으로 읽힌다.
  //
  //    ⚠️ 그 검사는 여기 두지 **않았다.** 이 `--selftest` 의 «눈금 건수»는 공유 시험
  //    `src/__tests__/unit/elemProbeGauges.test.ts` 가 **숫자로 얼려** 두었고, 그 파일은
  //    이 세션의 몫이 아니다(병렬 세션 셋이 같은 줄을 고치면 병합에서 부딪힌다).
  //    그래서 같은 검사를 `middleM3Top3.test.ts` 의
  //    「판정기 모집단에 3차 물결 넷이 들어 있다」로 옮겼다 — 관문에서 똑같이 돈다.

  let ok = 0;
  for (const r of rows) {
    const pass = r.want === r.got;
    if (pass) ok += 1;
    console.log(`  ${pass ? "✅" : "🔴"} ${r.name.padEnd(44)} ${r.why}`);
  }
  console.log(
    `\n${ok === rows.length ? "✅" : "❌"} 눈금 ${rows.length}건 ${ok === rows.length ? "전부 맞다" : `중 ${rows.length - ok}건 어긋났다`}`,
  );
  if (ok !== rows.length) process.exitCode = 1;
}

// ────────────────────────────────────────────────────────────────────────────
// 본 판정
// ────────────────────────────────────────────────────────────────────────────

function collectSifts(): { name: string; sifts: Sift[] }[] {
  const median: Sift[] = [];
  const vertex: Sift[] = [];
  // 3차 물결(`m3Top3.ts` · 접미사 `V`) — 후보를 견주는 셋.
  // `52V` 는 값이 하나로 굳어 **후보 목록이 아예 없다**. 0 으로 찍으면 「깨끗」과
  // 「못 셈」이 안 갈리므로 여기 넣지 않고 `reportNoSiftAxis()` 가 따로 찍는다.
  const quadAlive: Sift[] = [];
  const rational: Sift[] = [];
  const rootSum: Sift[] = [];
  for (let i = 0; i < SEEDS; i += 1) {
    median.push(planMedianMean(createRng(SEED0 + i * 7919)).sift);
    vertex.push(planVertexQuadrant(createRng(SEED0 + i * 7919)).sift);
    quadAlive.push(planQuadraticAlive(createRng(SEED0 + i * 7919)).sift);
    rational.push(planRationalRoots(createRng(SEED0 + i * 7919)).sift);
    rootSum.push(planRootSum(createRng(SEED0 + i * 7919)).sift);
  }
  return [
    { name: "3-2|산포도|11T (심화상)", sifts: median },
    { name: "3-1|이차함수의 그래프 ⑵|22T (심화중)", sifts: vertex },
    { name: "3-1|이차방정식의 풀이|51V (심화중)", sifts: quadAlive },
    { name: "3-1|이차방정식의 활용|53V (심화상)", sifts: rational },
    { name: "3-1|근호를 포함한 식의 계산|54V (심화상)", sifts: rootSum },
  ];
}

/**
 * 🔴 **「축이 없다」와 「축이 초록이다」는 다른 말이다.**
 *
 * 값이 하나로 굳는 갈래(`52V`)는 후보 목록이 설계에 **없어서** ㉠ 을 잴 수 없다.
 * 0 으로 찍으면 「깨끗」과 「못 셈」이 안 갈리므로 **«잴 축 없음»으로 따로 찍고**,
 * 그 대신 재는 것(「답이 발문에 적힌 수 가운데 하나인가」)을 같이 낸다.
 */
function reportNoSiftAxis(): void {
  let inStem = 0;
  const answers = new Set<number>();
  for (let i = 0; i < SEEDS; i += 1) {
    const p = planCancel(createRng(SEED0 + i * 7919));
    answers.add(p.answer);
    const stem = new Set([0, 2, 3, p.cs[0], p.cs[1], p.cs[2], p.s, -p.s]);
    if (stem.has(p.answer)) inStem += 1;
  }
  console.log(`\n  3-1|다항식의 곱셈|52V (심화중)`);
  console.log(
    `    ⚪ ㉠ **잴 축 없음** — 값이 하나로 굳어 후보 목록(\`sift\`)이 설계에 없다.`,
  );
  console.log(
    `    ${inStem === 0 ? "✅" : "🔴"} 그 대신: 답이 발문에 적힌 수 가운데 하나인 씨앗 ${inStem}건` +
      `  (서로 다른 답 ${answers.size}종 · 씨앗 ${SEEDS})`,
  );
}

function reportEdgeAndSift(): void {
  console.log("\n═══ ㉠ 굳힘을 **안 읽고** 극단을 집으면 몇 %가 맞나 ═══");
  console.log(
    "   (우연 수준을 넘으면 그 갈래는 다시 지어야 한다 — 브리프 §3 ㉠)\n",
  );
  for (const { name, sifts } of collectSifts()) {
    const e = edgeScore(sifts);
    const s = siftScore(sifts);
    const worst = Math.max(e.maxHit, e.minHit);
    const verdict = worst <= e.chance + 0.1 ? "✅" : "🔴";
    console.log(`  ${name}`);
    console.log(
      `    ${verdict} 최댓값 집기 ${(e.maxHit * 100).toFixed(1)}% · 최솟값 집기 ${(e.minHit * 100).toFixed(1)}%` +
        `  ← 우연 수준 ${(e.chance * 100).toFixed(1)}%   (씨앗 ${e.n})`,
    );
    console.log(
      `    ${s.identity === 0 ? "✅" : "🔴"} ㉡ 굳힘이 아무도 안 거른 비율 ${(s.identity * 100).toFixed(1)}%` +
        ` · 남긴 후보 평균 ${s.keptAvg.toFixed(2)} / ${sifts[0]!.candidates.length}` +
        ` · 설계 깨짐 ${s.broken}`,
    );
  }
  reportNoSiftAxis();
}

function reportOverlap(): void {
  console.log("\n═══ ㉢ 같은 소단원 안에서 겹치나 — 천장을 먼저 찍는다 ═══");
  console.log(
    "   ⚠️ 「수+정답」 열쇠에는 천장이 있다. 천장이 문턱 아래면 «겹침 없음»이 아니라\n" +
      "      **«판정 불가»** 로 읽어야 한다 (브리프 §3 ㉢).\n",
  );
  const seeds = [SEED0, 5150131, 777003, 424242, 31337];
  const all = registeredTypes();
  for (const mine of topEntries()) {
    const xs = sampleType(mine.key, seeds);
    const ceiling = pairMax(xs, xs); // 자기 자신과 — 다른 씨앗끼리
    console.log(`  ── ${mine.key}  (${xs[0]!.tier})`);
    console.log(
      `     천장(자기 자신과): 수+정답 ${ceiling.num.toFixed(3)} · 낱말 ${ceiling.word.toFixed(3)}`,
    );
    const siblings = all.filter(
      (e) => e.unitSection === mine.unitSection && e.key !== mine.key,
    );
    const rows: { key: string; tier: string; num: number; word: number }[] = [];
    for (const sib of siblings) {
      const ys = sampleType(sib.key, seeds);
      if (ys.length === 0) continue;
      const m = pairMax(xs, ys);
      rows.push({ key: sib.key, tier: ys[0]!.tier, ...m });
    }
    rows.sort((a, b) => b.word - a.word);
    for (const r of rows.slice(0, 6)) {
      const flag = r.word >= 0.7 ? "🔴" : r.word >= 0.5 ? "🟡" : "  ";
      console.log(
        `     ${flag} ${r.key.padEnd(34)} ${r.tier.padEnd(4)} 낱말 ${r.word.toFixed(3)} · 수+정답 ${r.num.toFixed(3)}`,
      );
    }
    console.log(
      `     … 형제 ${rows.length}개 중 낱말 0.7 이상 ${rows.filter((r) => r.word >= 0.7).length}개` +
        ` · 0.5 이상 ${rows.filter((r) => r.word >= 0.5).length}개`,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 비운 자리의 근거 — 「비운 것도 산출물」(브리프 §7)
// ────────────────────────────────────────────────────────────────────────────

/**
 * 🔴 **왜 통계에 «심화중»을 안 세웠나** — 돌려서 보인다.
 *
 * 「자료 넷 + 미지수 $x$, **중앙값이 $m$**」 하나만 주면 마디가 안 생긴다:
 * $m$ 이 기존 자료에 없으면 $x=m$ 으로 **하나로 굳고**, 있으면 답이 **범위**가 된다.
 * 곧 「값이 하나로 굳지 않는 마디가 하나 있다」(심화중의 전제)가 성립하지 않는다.
 * 조건을 하나 더 겹치면 그때는 후보를 **다 만들어 견주어야** 해서 «상»이 된다 —
 * 그것이 세운 `11T` 다.
 */
function reportWhyNoMedianMid(): void {
  console.log("\n═══ 비움 근거 ⑴ — 통계의 «심화중»: 마디가 안 생긴다 ═══\n");
  let unique = 0;
  let range = 0;
  let none = 0;
  const LIMIT = 400;
  for (let i = 0; i < LIMIT; i += 1) {
    const rng = createRng(SEED0 + i * 7919);
    const a = 1 + Math.floor(rng() * 12);
    const b = a + 1 + Math.floor(rng() * 9);
    const c = b + 1 + Math.floor(rng() * 12);
    const d = c + 1 + Math.floor(rng() * 14);
    const base = [a, b, c, d];
    const m = [a, b, c, d, b + 1 + Math.floor(rng() * 3)][
      Math.floor(rng() * 5)
    ]!;
    // 중앙값이 m 인 자연수 x 를 전부 훑는다 — 규칙을 안 쓰고 정렬해서 센다.
    const hit: number[] = [];
    for (let x = 1; x <= 400; x += 1) {
      const s = [...base, x].sort((p, q) => p - q);
      if (s[2] === m) hit.push(x);
    }
    if (hit.length === 0) none += 1;
    else if (hit.length === 1) unique += 1;
    else range += 1;
  }
  console.log(
    `  「중앙값 = m」 하나만 걸었을 때 조건을 만족하는 자연수 $x$ 의 개수 (표본 ${LIMIT})`,
  );
  console.log(
    `    · 정확히 하나  ${unique} (${((unique / LIMIT) * 100).toFixed(1)}%)  ← 마디가 **굳는다** (심화하)`,
  );
  console.log(
    `    · 여럿(=범위)  ${range} (${((range / LIMIT) * 100).toFixed(1)}%)  ← 답이 범위가 된다 (묻는 꼴이 아니다)`,
  );
  console.log(
    `    · 없음        ${none} (${((none / LIMIT) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  🔴 어느 쪽이든 «값이 하나로 굳지 않는 마디»가 안 생긴다 — 심화중의 전제가 없다.`,
  );
}

/**
 * 🔴 **왜 3-1 Ⅱ(인수분해와 이차방정식)를 비웠나** — 그 축이 이미 아래 칸에 있다.
 *
 * D-115 반증문 ④: 「같은 소단원의 연산·기본·응용 중 하나라도 이 잣대를 통과하면
 * 그 소단원에서는 이 축이 난이도를 안 가른다 — 채우지 말고 비운다」.
 *
 * ⚠️ 열쇠는 **해설의 «버린다» 표지**다. 손으로 고른 목록이라 **하한**이고, 「후보가
 *    셋 이상」과 「둘」을 못 가른다. 그래서 이 수는 «있다»를 보이는 데만 쓰고,
 *    실물은 보고서에 눈으로 본 것을 함께 적었다.
 */
const DISCARD_MARK =
  /(버린다|맞지 않으므로|적합하지 않으므로|될 수 없으므로|이어야 하므로)/;

function reportWhyNoQuadratic(): void {
  console.log(
    "\n═══ 비움 근거 ⑵ — 3-1 Ⅱ: 「근 둘 중 하나를 조건이 버린다」가 이미 아랫 칸에 있다 ═══\n",
  );
  const sections = [
    "이차방정식의 풀이",
    "이차방정식의 근의 공식과 응용",
    "이차방정식의 활용",
    "인수분해",
    "인수분해의 응용",
    "다항식의 곱셈",
  ];
  const seeds = [SEED0, 5150131, 777003, 424242];
  for (const sec of sections) {
    const byTier = new Map<string, { n: number; hit: number }>();
    for (const e of registeredTypes().filter((x) => x.unitSection === sec)) {
      for (const s of seeds) {
        let p;
        try {
          p = generateMiddleProblem(e.key, s);
        } catch {
          continue;
        }
        const row = byTier.get(p.difficulty) ?? { n: 0, hit: 0 };
        row.n += 1;
        if (DISCARD_MARK.test(p.solution)) row.hit += 1;
        byTier.set(p.difficulty, row);
      }
    }
    const parts = ["연산", "기본", "응용", "심화하"]
      .map((t) => {
        const r = byTier.get(t);
        if (!r || r.n === 0) return `${t} —`;
        return `${t} ${((r.hit / r.n) * 100).toFixed(0)}%`;
      })
      .join(" · ");
    // 반증 ④ 는 **아랫 세 칸**(연산·기본·응용)이 그 축을 쓸 때만 걸린다.
    const lower = ["연산", "기본", "응용"].some((t) => {
      const r = byTier.get(t);
      return r !== undefined && r.n > 0 && r.hit / r.n >= 0.5;
    });
    console.log(
      `  ${lower ? "🔴" : "  "} ${sec.padEnd(22)} ${parts}` +
        (lower ? "   ← 반증 ④ 위반: 비운다" : ""),
    );
  }
  console.log(
    "\n  🔴 `이차방정식의 활용` 만 반증 ④ 에 걸린다 — 그 축이 **연산부터** 쓰이고 있다.\n" +
      "     나머지 소단원은 반증 ④ 를 **통과**한다. 그것들을 안 세운 까닭은 «축이 없다»가\n" +
      "     아니라 **내가 지은 설계가 ㉠·㉡ 을 통과하지 못했다**는 것이다(보고서 §4).\n" +
      "     ⚠️ 이 수는 **하한**이다(표지를 손으로 골랐다). 실물은 보고서에 눈으로 본 것을 적었다.",
  );
}

function main(): void {
  const a = process.argv.slice(2);
  if (a.includes("--selftest")) return selftest();
  if (a.includes("--overlap")) return reportOverlap();
  if (a.includes("--empty")) {
    reportWhyNoMedianMid();
    reportWhyNoQuadratic();
    return;
  }
  reportEdgeAndSift();
  reportOverlap();
  reportWhyNoMedianMid();
  reportWhyNoQuadratic();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
