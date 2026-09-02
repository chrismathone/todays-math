/**
 * 중3 **확대 갈래 2차 물결**(`심화중`·`심화상`) — `src/lib/middle/m3Top2.ts` (D-116, `U` 접미사).
 *
 * ## 🔴 검산이 어디서 오나 — 생성기 규칙을 한 줄도 옮겨 적지 않는다
 *
 * 이 시험의 핵심은 **전수·독립 재계산**이다. 발문에 적힌 수만 읽어서
 *
 *   · `41U` — $x$ 를 $-500$ 부터 $500$ 까지 훑어 $c_1|x-p|+c_2|x-q|=R$ 인 값을 **전부** 모은다.
 *             (갈래를 나누는 대수는 한 줄도 안 쓴다 — 절댓값을 그대로 계산한다.)
 *   · `42U` — 여러 $a$ 에 대해 실제 이차식을 세워 **근의 공식**으로 두 절편을 구한다.
 *             (「축에 대칭」이라는 생성기의 길과 **다른 길**이다.)
 *   · `43U` — $x$ 를 훑어 $x^2-N$ 이 완전제곱이고 $y\ge1$ 인 것을 **전부** 모은다.
 *             (약수 짝·홀짝이라는 생성기의 길을 안 쓴다.)
 *   · `44U` — 두 직각변을 $1$ 부터 훑어 「곱이 넓이의 두 배 · 제곱의 합이 빗변의 제곱」인
 *             짝을 찾는다. (곱셈 공식 $(a\pm b)^2$ 를 안 쓴다.)
 *
 * 그 결과가 **지면 정답과 글자까지 같아야** 한다. 생성기가 쓴 식을 시험이 다시 적으면
 * 동어반복이 되어, 그 식이 틀린 날 둘이 사이좋게 틀린다(2026-08-18 「지표의 «참»이 제품
 * 상수에서 나오면 성적이 오른다」).
 *
 * 전수 검산은 **정답이 맞는가**와 **빠뜨린 답이 없는가**를 **동시에** 본다 —
 * 「모두 구하시오」류에서 뒤엣것이 빠지면 값 검산이 구조적으로 못 보는 부류가 생긴다.
 *
 * ## ⚠️ 왜 `generateMiddleProblem` 을 안 부르나
 *
 * `generate.ts` 에 `...M3_TOP_2` 를 넣는 것은 **리드가 한다**(이 세션은 공유 파일을 안
 * 건드린다). 그래서 이 시험은 그 함수가 하는 일을 **그 함수가 부르는 바로 그 함수들**
 * (`tidySolution`·`wrapDanClause`·`resolveMiddleTier`)로 다시 밟는다 — 규칙을 옮겨 적지
 * 않으려는 것이다. 그리고 **등록된 뒤에는** 「`generateMiddleProblem` 과 글자까지 같은가」를
 * 실제로 재는 검사가 켜진다(맨 아래). 등록 전에는 그 검사가 «아직 등록 안 됨»을 **찍는다** —
 * 조용히 통과시키면 「등록 뒤에도 같은가」가 영영 안 재어진다.
 *
 * ## 이 시험이 지키는 것
 *
 * ```
 * ㉠ 갈래 선언  — 확대 갈래로 나온다 (resolveMiddleTier 가 안 내린다)
 * ㉡ 값 검산    — 지면 정답이 «조건을 만족하는 값 전부»와 같다 (독립 재계산)
 * ㉢ 굳힘이 산다 — 굳힘을 인자로 받는 순수 함수를 흔들면 답이 실제로 달라진다
 * ㉣ 굳힘이 «선택»을 한다 — 극단만 집으면 우연 수준. 42U 는 «잴 축 없음»으로 따로 찍는다
 * ㉤ 해설이 걸음을 안 건너뛴다 (D-116 ⑸)
 * ㉥ 해설이 말하는 조건이 실제 판정과 어긋나지 않는다
 * ㉦ 지면 냄새 + KaTeX 렌더 — 값은 맞는데 글자가 나쁜 부류
 * ㉧ 계약 — facts.x · 맨 숫자 없음 · 그림을 안 가리킨다 · 조용한 기본값 없음
 * ```
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { isThin } from "../../../scripts/qa/probe-middle-solution-depth";
import { edgeScore, siftScore } from "../../../scripts/qa/probe-middle-top-m3";
import { bareNumbers } from "../../lib/elementary/rules";
import { createRng } from "../../lib/elementary/rng";
import type { Rng } from "../../lib/elementary/types";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import type { Sift } from "../../lib/middle/m3Top";
import {
  M3_TOP_2,
  planAbsSum,
  planAxisReflect,
  planDiffSquares,
  planHypArea,
  reduceFraction,
  solveAbsSumEquation,
  solveAxisReflection,
  solveDiffOfSquares,
  solveHypotenuseArea,
} from "../../lib/middle/m3Top2";
import { tidySolution } from "../../lib/middle/solutionText";
import { resolveMiddleTier } from "../../lib/middle/tier";
import type { MidProblem, TypeEntry } from "../../lib/middle/types";
import { wrapDanClause } from "../../lib/problemText";

const KEY_ABS = "3-1|제곱근의 뜻과 성질|41U";
const KEY_AXIS = "3-1|이차함수의 그래프 ⑴|42U";
const KEY_DIFF = "3-1|다항식의 인수분해|43U";
const KEY_TRIG = "3-2|삼각비|44U";

/** 씨앗 몇 개 × 변형 셋 — 지면 글자를 눈으로 견주는 검사에 쓴다. */
const SEEDS = [20260902, 7, 4242, 31337, 5150131, 777003, 424242, 99, 13579];
/** 값 검산·설계 검사에 쓰는 넓은 씨앗 — 브리프가 「최소 200」이라 못 박은 자리. */
const WIDE = Array.from({ length: 240 }, (_, i) => 20260902 + i * 7919);

const BY_KEY = new Map(M3_TOP_2.map((e) => [e.key, e]));

/** `generate.ts` 의 소금. 등록 뒤에는 아래 마지막 검사가 «글자까지 같은가»로 잠근다. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * `generateMiddleProblem` 이 하는 일 — **그 함수가 부르는 함수들로** 다시 밟는다.
 * (보기·「모두 고르시오」 가드는 이 넷에 보기가 없어 아무것도 안 한다.)
 */
function make(key: string, seed: number, variant = 0): MidProblem {
  const entry = BY_KEY.get(key);
  if (!entry) throw new Error(`m3Top2 에 없는 키: ${key}`);
  const p = entry.handler(createRng(seed + keySalt(key) + variant * 0x9e37));
  const solution = tidySolution(p.solution);
  const content = wrapDanClause(p.content);
  const difficulty = resolveMiddleTier(p.difficulty, content, !!p.figureSpec);
  return { ...p, solution, content, difficulty };
}

/** 답에서 처음 나오는 수 — 이웃 모듈의 제네릭 가드가 `facts.x` 와 견주는 그 값. */
function firstNumber(answer: string): number {
  const m = /-?\d+/.exec(answer);
  if (!m) throw new Error(`답에 수가 없다: ${answer}`);
  return Number(m[0]);
}

// ════════════════════════════════════════════════════════════════════════════
// 등록 메타 — 개수를 **얼린다**
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 2차 물결] 등록 메타", () => {
  it("유형은 정확히 넷이고 키가 그대로다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M3_TOP_2).toHaveLength(4);
    expect(M3_TOP_2.map((e) => e.key)).toEqual([
      KEY_ABS,
      KEY_AXIS,
      KEY_DIFF,
      KEY_TRIG,
    ]);
  });

  it("확장 번호는 «숫자+영문 대문자 한 글자» 라 RPM 색인과 영영 안 겹친다", () => {
    for (const e of M3_TOP_2) {
      expect(e.rpmType, e.key).toMatch(/^\d+U$/);
      expect(e.key.split("|"), e.key).toHaveLength(3);
      expect(e.grade).toBe("중3");
    }
    // 같은 학년 안에서 번호가 겹치면 `generate.ts` 가 키 충돌을 던진다.
    expect(new Set(M3_TOP_2.map((e) => e.rpmType)).size).toBe(4);
  });

  it("소단원 이름이 시드 정본과 **글자 그대로** 같다", () => {
    const mid3 = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중3").map((u) => u.section),
    );
    // 눈금 — 이 검사가 «아니오»를 낼 수 있나. 없는 이름은 반드시 걸려야 한다.
    expect(mid3.has("삼각비의 뜻")).toBe(true);
    expect(mid3.has("삼각비의뜻")).toBe(false);
    for (const e of M3_TOP_2) {
      expect(mid3.has(e.unitSection), `${e.key} → ${e.unitSection}`).toBe(true);
    }
  });

  it("갈래를 스스로 선언한다 — 밑단 규칙(`resolveMiddleTier`)이 안 내린다", () => {
    const got = new Map<string, Set<string>>();
    for (const e of M3_TOP_2) {
      const tiers = new Set<string>();
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) tiers.add(make(e.key, seed, v).difficulty);
      }
      got.set(e.key, tiers);
    }
    expect([...got.get(KEY_ABS)!]).toEqual(["심화상"]);
    expect([...got.get(KEY_AXIS)!]).toEqual(["심화중"]);
    expect([...got.get(KEY_DIFF)!]).toEqual(["심화상"]);
    expect([...got.get(KEY_TRIG)!]).toEqual(["심화중"]);
  });

  it("확대 갈래가 **둘 다** 선다 — 하나만 세우고 «세웠다»고 하지 않는다", () => {
    const tiers = new Set(
      M3_TOP_2.map((e) => make(e.key, 20260902).difficulty),
    );
    expect(tiers).toEqual(new Set(["심화중", "심화상"]));
  });

  it("씨앗을 넓게 훑어도 던지지 않는다", () => {
    for (const e of M3_TOP_2) {
      for (let s = 0; s < 120; s += 1) {
        expect(() => make(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("같은 씨앗이면 같은 결과 — AI 가 아니다", () => {
    for (const e of M3_TOP_2) {
      const a = make(e.key, 424242, 1);
      const b = make(e.key, 424242, 1);
      expect(a.content).toBe(b.content);
      expect(a.answer).toBe(b.answer);
      expect(a.solution).toBe(b.solution);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉡ 값 검산 — 발문의 수만 읽고 **다른 길로** 다시 계산한다
// ════════════════════════════════════════════════════════════════════════════

/** 41U 발문에서 $c_1$, $p$, $c_2$, $q$, $R$ 을 읽는다. */
function readAbsStem(content: string): {
  c1: number;
  p: number;
  c2: number;
  q: number;
  r: number;
} {
  const eq = /\$([^$]+)\$/.exec(content)![1]!;
  const m =
    /^(\d*)\\sqrt\{\(x([+-]\d+)\)\^\{2\}\}\+(\d*)\\sqrt\{\(x([+-]\d+)\)\^\{2\}\}=(\d+)$/.exec(
      eq,
    );
  if (!m) throw new Error(`41U 발문을 못 읽었다: ${eq}`);
  return {
    c1: m[1] === "" ? 1 : Number(m[1]),
    // `x-7` 은 $p=7$, `x+3` 은 $p=-3$ — 읽은 부호를 뒤집는다.
    p: -Number(m[2]),
    c2: m[3] === "" ? 1 : Number(m[3]),
    q: -Number(m[4]),
    r: Number(m[5]),
  };
}

describe("[중3 2차 물결] ㉡ 값 검산 — 생성기 식을 옮겨 적지 않는다", () => {
  it("41U — 절댓값을 그대로 계산해 훑은 해의 합이 지면 정답과 같다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_ABS, seed);
      const s = readAbsStem(p.content);
      // 🔴 여기가 이 시험의 값어치다 — 갈래를 나누는 대수를 한 줄도 안 쓴다.
      //
      // ⚠️ **정수만 훑으면 안 된다.** 그러면 「뿌리가 정수」라는 **생성기의 규칙**에
      //    기대게 되어 동어반복이 된다. 세 갈래의 일차식 계수는 $c_1+c_2\in\{3,4\}$ 와
      //    $|c_1-c_2|\in\{1,2\}$ 뿐이므로 분모가 $12$ 를 나눈다 — 그래서 **12분의 1
      //    간격**으로 훑으면 있을 수 있는 해를 하나도 안 빠뜨린다. $x=k/12$ 를 넣고
      //    양변에 $12$ 를 곱하면 **정수 산술**이라 부동소수 오차도 없다.
      const roots: number[] = [];
      for (let k = -6000; k <= 6000; k += 1) {
        if (
          s.c1 * Math.abs(k - 12 * s.p) + s.c2 * Math.abs(k - 12 * s.q) ===
          12 * s.r
        ) {
          roots.push(k / 12);
        }
      }
      expect(
        roots.length,
        `s${seed} 해가 둘이 아니다 (${roots.join(",")})\n${p.content}`,
      ).toBe(2);
      const sum = roots.reduce((a, b) => a + b, 0);
      expect(
        firstNumber(p.answer),
        `s${seed} 정답이 훑은 해의 합과 다르다\n${p.content}\n정답 ${p.answer}`,
      ).toBe(sum);
      expect(p.facts.x).toBe(sum);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("42U — 여러 $a$ 로 실제 이차식을 세워 **근의 공식**으로 절편을 구해 견준다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_AXIS, seed);
      const pts = /두 점 \$\((-?\d+),\\ k\)\$, \$\((-?\d+),\\ k\)\$/.exec(
        p.content,
      );
      const wm = /점 \$\((-?\d+),\\ 0\)\$도/.exec(p.content);
      if (!pts || !wm) throw new Error(`42U 발문을 못 읽었다\n${p.content}`);
      const x1 = Number(pts[1]);
      const x2 = Number(pts[2]);
      const w = Number(wm[1]);
      const ans = firstNumber(p.answer);

      const axis = (x1 + x2) / 2;
      for (const a of [1, -1, 2, -3, 5]) {
        const q = -a * (w - axis) * (w - axis);
        // $y=a(x-\text{axis})^2+q$ 를 전개한 $ax^2+Bx+C$
        const bb = -2 * a * axis;
        const cc = a * axis * axis + q;
        const f = (x: number): number => a * x * x + bb * x + cc;
        expect(f(x1), `s${seed} 두 점의 $y$좌표가 다르다`).toBe(f(x2));
        expect(f(x1), `s${seed} $k=0$ 이면 발문과 부딪힌다`).not.toBe(0);
        expect(f(w), `s${seed} $(w,0)$ 을 안 지난다`).toBe(0);
        const disc = bb * bb - 4 * a * cc;
        expect(disc, `s${seed} 판별식이 양수가 아니다`).toBeGreaterThan(0);
        // `+ 0` 은 $a<0$ 일 때 나오는 `-0` 을 `0` 으로 맞추는 것뿐이다 — 값은 안 바뀐다.
        const r1 = (-bb - Math.sqrt(disc)) / (2 * a) + 0;
        const r2 = (-bb + Math.sqrt(disc)) / (2 * a) + 0;
        expect(
          [r1, r2].sort((s1, s2) => s1 - s2),
          `s${seed} a=${a} 근의 공식이 낸 두 절편이 다르다\n${p.content}`,
        ).toEqual([w, ans].sort((s1, s2) => s1 - s2));
      }
      expect(p.facts.x).toBe(ans);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("43U — $x^2-N$ 이 완전제곱인 $x$ 를 전부 훑은 합이 지면 정답과 같다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_DIFF, seed);
      const n = Number(/\$x\^\{2\}-y\^\{2\}=(\d+)\$/.exec(p.content)![1]);
      // 🔴 약수 짝도 홀짝도 안 쓴다 — 정의 그대로 훑는다.
      const xs: number[] = [];
      for (let x = 1; x <= n; x += 1) {
        const y2 = x * x - n;
        if (y2 <= 0) continue;
        const y = Math.round(Math.sqrt(y2));
        if (y * y === y2 && y >= 1) xs.push(x);
      }
      const sum = xs.reduce((a, b) => a + b, 0);
      expect(
        firstNumber(p.answer),
        `s${seed} N=${n} 정답이 훑은 $x$ 전부의 합과 다르다 (${xs.join(",")})`,
      ).toBe(sum);
      expect(p.facts.x).toBe(sum);
      // 「모두 구하시오」이므로 답이 하나짜리면 설계가 무너진 것이다.
      expect(
        xs.length,
        `s${seed} N=${n} 살아남은 $x$ 가 ${xs.length}개`,
      ).toBeGreaterThanOrEqual(2);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });

  it("44U — 두 직각변을 훑어 찾은 삼각비가 지면 정답과 글자까지 같다", () => {
    let checked = 0;
    for (const seed of WIDE) {
      const p = make(KEY_TRIG, seed);
      const hyp = Number(/\\overline\{AB\}=(\d+)\$/.exec(p.content)![1]);
      const area = Number(/넓이가 \$(\d+)\$/.exec(p.content)![1]);
      const cmp = /\\angle A([<>])\\angle B/.exec(p.content)![1]!;
      const fn = /\$(\\sin|\\cos) A\$의 값/.exec(p.content)![1]!;

      // 🔴 곱셈 공식 $(a\pm b)^2$ 를 안 쓴다 — 두 직각변을 그냥 훑는다.
      const legs: [number, number][] = [];
      for (let a = 1; a < hyp; a += 1) {
        const b = (2 * area) / a;
        if (!Number.isInteger(b) || a >= b) continue;
        if (a * a + b * b === hyp * hyp) legs.push([a, b]);
      }
      expect(legs, `s${seed} 두 변이 하나로 안 정해진다`).toHaveLength(1);
      const [small, large] = legs[0]!;
      // 「큰 각의 대변이 더 길다」 — $\angle A<\angle B$ 면 $\overline{BC}$ 가 짧은 쪽
      const bc = cmp === "<" ? small : large;
      const ca = cmp === "<" ? large : small;
      const [num, den] = reduceFraction(fn === "\\sin" ? bc : ca, hyp);
      expect(
        p.answer,
        `s${seed} 빗변 ${hyp} 넓이 ${area} ${cmp} ${fn}\n${p.content}`,
      ).toBe(`$\\dfrac{${num}}{${den}}$`);
      expect(p.facts.x).toBe(num);
      expect(p.facts.den).toBe(den);
      // 진분수여야 한다 — 가분수는 지면 전처리가 대분수로 고쳐 쓴다(2026-08-24).
      expect(num, `s${seed} 가분수가 나왔다`).toBeLessThan(den);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉢ 굳힘이 항등식이 아니다 — 굳힘을 **인자로 받는 순수 함수**를 흔든다
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 2차 물결] ㉢ 굳힘을 지우면 답이 달라진다", () => {
  it("41U — 구간 조건을 끄면 죽은 뿌리까지 더해져 합이 달라진다", () => {
    for (const seed of WIDE) {
      const plan = planAbsSum(createRng(seed));
      const withSift = solveAbsSumEquation(
        plan.p,
        plan.q,
        plan.c1,
        plan.c2,
        plan.r,
        true,
      );
      const without = solveAbsSumEquation(
        plan.p,
        plan.q,
        plan.c1,
        plan.c2,
        plan.r,
        false,
      );
      expect(withSift.length).toBe(2);
      expect(without.length).toBe(3);
      const a = withSift.reduce((s, v) => s + v, 0);
      const b = without.reduce((s, v) => s + v, 0);
      expect(a).toBe(plan.answer);
      expect(b, `s${seed} 굳힘을 지워도 합이 그대로다`).not.toBe(a);
    }
  });

  it("43U — 홀짝 조건을 끄면 죽은 짝까지 세어져 합이 달라진다", () => {
    for (const seed of WIDE) {
      const plan = planDiffSquares(createRng(seed));
      const a = solveDiffOfSquares(plan.n, true).reduce((s, v) => s + v, 0);
      const b = solveDiffOfSquares(plan.n, false).reduce((s, v) => s + v, 0);
      expect(a).toBe(plan.answer);
      expect(b, `N=${plan.n} 굳힘을 지워도 합이 그대로다`).not.toBe(a);
      // 굳힘이 «일할 자리»가 있어야 한다 — $N\equiv0\pmod4$ 가 그것을 보장한다.
      expect(plan.n % 4, `N=${plan.n}`).toBe(0);
    }
  });

  it("44U — 각의 대소를 뒤집으면 답이 실제로 달라진다", () => {
    for (const seed of WIDE) {
      const plan = planHypArea(createRng(seed));
      const kept = solveHypotenuseArea(
        plan.s,
        plan.t,
        plan.hyp,
        plan.aIsSmaller,
        plan.ratio,
      );
      const flipped = solveHypotenuseArea(
        plan.s,
        plan.t,
        plan.hyp,
        !plan.aIsSmaller,
        plan.ratio,
      );
      expect(kept).toEqual(plan.answer);
      expect(flipped, `s${seed} 굳힘을 뒤집어도 답이 그대로다`).not.toEqual(
        kept,
      );
    }
  });

  it("42U — 두 대칭점을 지우면 답이 **하나로 안 굳는다**", () => {
    for (const seed of WIDE) {
      const plan = planAxisReflect(createRng(seed));
      expect(solveAxisReflection(plan.x1, plan.x2, plan.w)).toBe(plan.answer);
      // ⑴ 한 점을 흔들면 발문이 지시하는 축이 옮겨 가 답이 달라진다.
      for (const delta of [-2, -1, 1, 2]) {
        expect(solveAxisReflection(plan.x1 + delta, plan.x2, plan.w)).not.toBe(
          plan.answer,
        );
      }
      // ⑵ 두 점을 통째로 지우면 $(w,0)$ 만 남는데, 축을 다른 데 놓아도 **여전히
      //    조건을 만족하는 포물선**이 있고 그 다른 절편은 다르다 — 곧 답이 안 굳는다.
      for (const shift of [-1, 1]) {
        const pp = plan.p + shift;
        const q = -((plan.w - pp) * (plan.w - pp));
        const f = (x: number): number => (x - pp) * (x - pp) + q;
        expect(f(plan.w)).toBe(0);
        const other = 2 * pp - plan.w;
        expect(f(other)).toBe(0);
        expect(other, `s${seed} 축을 옮겨도 답이 같다`).not.toBe(plan.answer);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉣ 굳힘이 «선택»을 한다 — 극단만 집으면 우연 수준
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 2차 물결] ㉣ 굳힘을 **안 읽고** 찍으면 우연 수준을 못 넘는다", () => {
  const sifts = (plan: (r: Rng) => { sift: Sift }): Sift[] =>
    WIDE.map((s) => plan(createRng(s)).sift);

  it("후보를 견주는 세 갈래에서 `kept` 가 `candidates` 의 진부분집합이다", () => {
    for (const [name, plan] of [
      ["41U", planAbsSum],
      ["43U", planDiffSquares],
      ["44U", planHypArea],
    ] as const) {
      const s = siftScore(sifts(plan));
      expect(s.identity, `${name}: 굳힘이 아무도 안 거른 씨앗이 있다`).toBe(0);
      expect(s.broken, `${name}: 굳힘이 후보 밖 값을 냈다`).toBe(0);
      expect(s.n).toBe(WIDE.length);
    }
  });

  it("극단만 집으면 «우연 수준 + 10%p» 를 못 넘는다", () => {
    // 초6 에서 이것으로 병합이 두 번 막혔다(tier-fill-g6-w3-adversarial §7.1 R1).
    // ⚠️ **정직하게 적는다** — `41U`·`43U` 는 답이 «살아남은 것 전부의 합»이라 `kept` 의
    //    크기가 늘 $2$ 이상이고, 그래서 이 수치가 **구조적으로 0**이다. 곧 이 검사만으로는
    //    그 둘의 ㉠ 을 잰 것이 아니다. 그 둘의 진짜 ㉠ 은 바로 아래 두 검사
    //    (「죽는 자리 분포」·「사는 자리 모양」)이고, 이 검사가 실제로 «선택»을 재는 것은
    //    후보가 둘이고 답이 하나인 `44U` 뿐이다(실측 최대 52.5% · 우연 50%).
    for (const [name, plan] of [
      ["41U", planAbsSum],
      ["43U", planDiffSquares],
      ["44U", planHypArea],
    ] as const) {
      const e = edgeScore(sifts(plan));
      expect(
        Math.max(e.maxHit, e.minHit),
        `${name}: 극단 집기 max=${e.maxHit} min=${e.minHit} · 우연 ${e.chance}`,
      ).toBeLessThanOrEqual(e.chance + 0.1);
    }
  });

  it("41U — 죽는 갈래가 **왼·가운데·오른 셋 다** 나오고 한쪽으로 안 쏠린다", () => {
    // 🔴 자연 분포로 뽑으면 «가운데가 죽는» 자리가 압도적이다(실측 3085 : 95 : 98).
    //    그러면 「바깥 둘」로 찍는 학생이 거의 맞는다. 그 쏠림이 돌아오면 빨개진다.
    const count = [0, 0, 0];
    for (const seed of WIDE) count[planAbsSum(createRng(seed)).deadSlot] += 1;
    for (let i = 0; i < 3; i += 1) {
      expect(
        count[i],
        `죽는 자리 ${i} 가 안 나온다 (${count.join("/")})`,
      ).toBeGreaterThan(0);
      expect(count[i]! / WIDE.length, `죽는 자리 ${i} 가 쏠렸다`).toBeLessThan(
        0.55,
      );
    }
  });

  it("43U — 살아남은 자리가 **연속이 아니고**, 그 모양이 씨앗마다 갈린다", () => {
    const shapes = new Set<string>();
    for (const seed of WIDE) {
      const plan = planDiffSquares(createRng(seed));
      const flags = plan.rows.map((r) => (r.sameParity ? 1 : 0));
      shapes.add(flags.join(""));
      const idx = flags.map((f, i) => (f === 1 ? i : -1)).filter((i) => i >= 0);
      const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1]! + 1);
      expect(
        contiguous,
        `N=${plan.n} 사는 자리가 연속이다 (${idx.join(",")})`,
      ).toBe(false);
      // 죽는 짝이 하나뿐이면 「가장 큰 것만 버리기」로 찍힌다.
      expect(
        flags.filter((f) => f === 0).length,
        `N=${plan.n}`,
      ).toBeGreaterThanOrEqual(2);
    }
    expect(shapes.size, "자리 모양이 한 가지뿐이다").toBeGreaterThanOrEqual(5);
  });

  it("44U — 굳힘의 방향과 묻는 비의 **네 조합이 다** 나온다", () => {
    const combo = new Map<string, number>();
    for (const seed of WIDE) {
      const plan = planHypArea(createRng(seed));
      const k = `${plan.aIsSmaller ? "<" : ">"}${plan.ratio}`;
      combo.set(k, (combo.get(k) ?? 0) + 1);
    }
    expect([...combo.keys()].sort()).toEqual(["<0", "<1", ">0", ">1"]);
    for (const [k, n] of combo) {
      expect(n / WIDE.length, `조합 ${k} 가 쏠렸다`).toBeLessThan(0.45);
    }
  });

  it("42U — ㉣ 을 **잴 축이 없다**. 0 으로 찍지 않고 그 사실을 못 박는다", () => {
    // 「축이 없다」와 「축이 초록이다」는 다른 말이다(`m1Top.ts` 머리말 ⚠️).
    // 이 갈래는 값이 하나로 굳으므로 후보 목록(`sift`)이 설계에 **없다**.
    const plan = planAxisReflect(createRng(WIDE[0]!));
    expect(Object.keys(plan)).not.toContain("sift");
    expect(Object.keys(plan)).not.toContain("candidates");

    // 대신 「발문에 적힌 수 하나 찍기」가 **구조적으로 0%** 임을 불변식으로 잠근다.
    let leftward = 0;
    let rightward = 0;
    for (const seed of WIDE) {
      const p = planAxisReflect(createRng(seed));
      expect(p.w).not.toBe(p.p);
      expect(Math.abs(p.w - p.p)).not.toBe(p.d);
      expect(p.d).toBeGreaterThanOrEqual(1);
      expect(
        [p.x1, p.x2, p.w],
        `s${seed} 답이 발문에 적힌 수와 같다`,
      ).not.toContain(p.answer);
      if (p.answer > p.w) rightward += 1;
      else leftward += 1;
    }
    // 방향이 한쪽뿐이면 「$w$ 보다 큰 쪽」으로 찍힌다.
    expect(leftward).toBeGreaterThan(0);
    expect(rightward).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉤ 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸)
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 2차 물결] ㉤ 해설이 걸음을 건너뛰지 않는다", () => {
  it("전 씨앗에서 «생략 표지 뒤에 중간 결과 없음»이 0건이다", () => {
    const thin: string[] = [];
    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          if (isThin(p.content, p.solution))
            thin.push(`${e.key} s${seed}v${v}`);
        }
      }
    }
    expect(thin).toEqual([]);
  });

  it("41U — 후보 **셋을 하나씩 세우고** 각각 왜 살고 죽는지 적는다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_ABS, seed);
      const plan = planAbsSum(createRng(seed + keySalt(KEY_ABS)));
      for (const mark of ["㉠", "㉡", "㉢"]) {
        expect(p.solution, `s${seed}: ${mark} 가 해설에 없다`).toContain(mark);
      }
      for (const br of plan.branches) {
        // 「$x=…$이다」 — 후보를 실제로 **세운** 자리. 값만 찾으면 다른 수의
        // 부분 문자열에 걸려 «있다»가 거짓이 된다.
        expect(
          p.solution,
          `s${seed}: 후보 ${br.root} 를 해설이 세우지 않는다`,
        ).toContain(`$x=${br.root}$이다.`);
        expect(
          p.solution,
          `s${seed}: 후보 ${br.root} 의 구간 판정이 없다`,
        ).toContain(`조건 $${br.needText}$`);
      }
      expect(p.solution).toContain("만족시키지 않으므로 해가 아니다");
      expect(p.solution).toContain("만족시키므로 주어진 방정식의 해이다");
    }
  });

  it("43U — 약수 짝을 **하나도 빠뜨리지 않고** 다룬다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_DIFF, seed);
      const plan = planDiffSquares(createRng(seed + keySalt(KEY_DIFF)));
      plan.rows.forEach((r, i) => {
        const mark = ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥", "㉦", "㉧"][i]!;
        expect(p.solution, `s${seed}: ${mark} 가 없다`).toContain(
          `${mark} $(x-y,\\ x+y)=(${r.u},\\ ${r.v})$`,
        );
      });
      expect(p.solution).toContain("조건에 맞지 않는다");
    }
  });

  it("44U — 두 배정을 **둘 다 적고** 어느 쪽이 조건에 맞는지 밝힌다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_TRIG, seed);
      const plan = planHypArea(createRng(seed + keySalt(KEY_TRIG)));
      expect(p.solution).toContain(
        `㉠ $\\overline{BC}=${plan.t}$, $\\overline{CA}=${plan.s}$`,
      );
      expect(p.solution).toContain(
        `㉡ $\\overline{BC}=${plan.s}$, $\\overline{CA}=${plan.t}$`,
      );
      expect(p.solution).toContain(
        "어느 쪽이 $\\overline{BC}$인지 정해지지 않는다",
      );
      expect(p.solution).toContain("큰 각의 대변이 더 길다");
      expect(p.solution).toContain(
        `조건에 맞는 경우는 ${plan.aIsSmaller ? "㉡" : "㉠"}뿐이다`,
      );
    }
  });

  it("42U — $a$·$q$·$k$ 가 «하나로 정해지지 않는다»를 실제로 보인다", () => {
    for (const seed of SEEDS) {
      const p = make(KEY_AXIS, seed);
      expect(p.solution).toContain("축에 대하여 서로 대칭이다");
      expect(p.solution).toContain("하나로 정해지지 않는다");
      expect(p.solution).toContain("축의 방정식은");
      // 굳힘을 쓴 뒤에도 실제 값으로 한 번 확인해 보인다.
      expect(p.solution).toContain("실제로 $a=1$이면");
    }
  });

  it("㉥ 해설이 말하는 구간 조건이 **대입해 본 결과**와 어긋나지 않는다", () => {
    for (const seed of WIDE) {
      const plan = planAbsSum(createRng(seed));
      for (const br of plan.branches) {
        const inside =
          br.slot === 0
            ? br.root < plan.p
            : br.slot === 1
              ? br.root >= plan.p && br.root < plan.q
              : br.root >= plan.q;
        expect(
          br.alive,
          `s${seed} 후보 ${br.root}: 해설은 «${br.needText}» 라 하는데 실제가 다르다`,
        ).toBe(inside);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉦ 지면 냄새 + KaTeX — 값은 맞는데 글자가 나쁜 부류
// ════════════════════════════════════════════════════════════════════════════

const BAD: [RegExp, string][] = [
  [/\+-|-\+/, "부호가 붙어 나온다 (`+-`)"],
  [/--/, "부호가 겹쳐 나온다 (`--`)"],
  [/\\dfrac\{\}|\\frac\{\}/, "빈 분자 (2026-08-21)"],
  // ⚠️ 앞자리에 다른 숫자가 오면 안 된다 — `-91a` 는 멀쩡한 계수인데 이웃 모듈이 쓰는
  //    `[^\\a-zA-Z]1[a-z]` 는 그 `1a` 를 문다. **늘 우는 가드는 꺼진다**(2026-08-20).
  //    실제로 이 판이 42U 해설 다섯 줄을 거짓으로 걸었다. 아래 눈금이 그 자리를 잠근다.
  [/(?<![\\a-zA-Z0-9])1[a-z]\b/, "계수 1이 남았다 (`1x`)"],
  [/\^1\b/, "지수 1이 남았다"],
  [/\$\$/, "빈 수식"],
  [
    /[0-9]\s*번\s*그림|다음 그림|오른쪽 그림|아래 그림/,
    "그림이 없는데 그림을 가리킨다",
  ],
  [/시간를|수을|값를|해을/, "조사가 틀렸다"],
];

describe("[중3 2차 물결] ㉦ 지면 냄새", () => {
  it("눈금 — 이 검사가 «아니오» 를 낼 수 있다 (양성 5 · 음성 6)", () => {
    // 양성 — 걸려야 하는 것
    expect(BAD.some(([re]) => re.test("$2+-3$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("$\\dfrac{}{2}$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("$y=1x+2$"))).toBe(true);
    expect(BAD.some(([re]) => re.test("다음 그림에서 넓이를"))).toBe(true);
    // 이 줄이 실제로 42U 에서 나왔다 — 두 점이 다 음수인 씨앗의 중점 표기.
    expect(BAD.some(([re]) => re.test("$x=\\dfrac{-11+-1}{2}=-6$이다."))).toBe(
      true,
    );
    // 음성 — 멀쩡한 지면을 잡으면 늘 우는 가드가 된다(2026-08-20).
    expect(BAD.some(([re]) => re.test("$-4x+34=14$에서 $-4x=-20$이므로"))).toBe(
      false,
    );
    // 🔴 앞자리에 숫자가 있는 `1a` 는 계수 $1$ 이 아니다 — 첫 판이 이것을 거짓으로 걸었다.
    expect(
      BAD.some(([re]) => re.test("$y=a\\times(-3)^{2}+q=9a-100a=-91a$")),
    ).toBe(false);
    expect(BAD.some(([re]) => re.test("$q=-121a$이다."))).toBe(false);
    expect(
      BAD.some(([re]) =>
        re.test("$\\sin A=\\dfrac{40}{58}=\\dfrac{20}{29}$이다."),
      ),
    ).toBe(false);
    expect(BAD.some(([re]) => re.test("$2\\times4-(-7)=15$이다."))).toBe(false);
    expect(BAD.some(([re]) => re.test("$x^{2}-y^{2}=(x+y)(x-y)$이므로"))).toBe(
      false,
    );
  });

  it("전 씨앗의 발문·정답·해설에 냄새가 없다", () => {
    const hits: string[] = [];
    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          for (const [field, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            for (const [re, why] of BAD) {
              if (re.test(text))
                hits.push(`${e.key} s${seed}v${v} ${field}: ${why}`);
            }
          }
        }
      }
    }
    expect([...new Set(hits)].slice(0, 10)).toEqual([]);
  });

  it("KaTeX 로 실제 그려지고 붉은 글씨·중립 폴백이 없다", () => {
    // 「값이 맞나」와 「지면이 옳게 보이나」는 다른 질문이다(2026-08-24).
    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        const p = make(e.key, seed);
        for (const [field, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
        ] as const) {
          const html = renderMathHtml(text);
          expect(html, `${e.key} s${seed} ${field}`).not.toContain(
            "katex-error",
          );
          expect(html, `${e.key} s${seed} ${field}`).not.toMatch(
            /color:\s*#cc0000/i,
          );
          expect(html, `${e.key} s${seed} ${field}`).not.toContain("math-raw");
        }
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ㉧ 계약
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 2차 물결] ㉧ 계약", () => {
  it("`facts.x` 가 답의 첫 수다 (이웃 모듈과 같은 계약)", () => {
    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          expect(firstNumber(p.answer), `${e.key} s${seed}v${v}`).toBe(
            p.facts.x,
          );
        }
      }
    }
  });

  it("숫자는 전부 `$...$` 안에 있다", () => {
    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const p = make(e.key, seed, v);
          expect(bareNumbers(p.content), `${e.key} 발문`).toEqual([]);
          expect(bareNumbers(p.answer), `${e.key} 정답`).toEqual([]);
          expect(bareNumbers(p.solution), `${e.key} 해설`).toEqual([]);
        }
      }
    }
  });

  it("그림이 없다 — 이 넷은 그림 없이 완결된다", () => {
    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        expect(make(e.key, seed).figureSpec, e.key).toBeNull();
      }
    }
  });

  it("조용한 기본값을 안 낸다 — 못 만들면 **던진다**", () => {
    // `attempt` 가 다 떨어지는 자리. rng 가 늘 같은 값을 내면 같은(무효한) 매개변수를
    // 8000번 뽑고 던져야 한다 — 조용히 아무 문항이나 내면 안 된다.
    expect(() => planAbsSum(() => 0)).toThrow(/재시도 초과/);
    // 굳힘 함수의 전제가 깨지면 그 자리에서 던진다.
    expect(() => solveAbsSumEquation(1, 5, 2, 2, 7, false)).toThrow(
      /두 계수가 같으면/,
    );
    expect(() => reduceFraction(3, 0)).toThrow(/분모가 0/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 등록 뒤에 켜지는 검사 — 「`generateMiddleProblem` 과 글자까지 같은가」
// ════════════════════════════════════════════════════════════════════════════

describe("[중3 2차 물결] `generate.ts` 등록", () => {
  it("등록되면 `generateMiddleProblem` 과 글자까지 같다 (등록 전이면 그 사실을 찍는다)", () => {
    const registered = new Set(registeredTypes().map((e) => e.key));
    const mine = M3_TOP_2.map((e) => e.key);
    const covered = mine.filter((k) => registered.has(k));

    if (covered.length === 0) {
      // 리드가 `...M3_TOP_2` 한 줄을 넣기 전 상태다. 조용히 통과시키면 「등록 뒤에도
      // 같은가」가 영영 안 재어지므로, **어느 쪽인지**를 여기서 못 박는다.
      expect(mine.some((k) => registered.has(k))).toBe(false);
      return;
    }
    // 반쪽 등록은 결함이다 — 넷 중 셋만 들어가면 나머지 하나는 아무도 안 부른다.
    expect(covered.sort()).toEqual([...mine].sort());

    for (const e of M3_TOP_2) {
      for (const seed of SEEDS) {
        for (const v of [0, 1, 2]) {
          const mineP = make(e.key, seed, v);
          const theirs = generateMiddleProblem(e.key, seed, v);
          expect(theirs.content, `${e.key} s${seed}v${v} 발문`).toBe(
            mineP.content,
          );
          expect(theirs.answer, `${e.key} s${seed}v${v} 정답`).toBe(
            mineP.answer,
          );
          expect(theirs.solution, `${e.key} s${seed}v${v} 해설`).toBe(
            mineP.solution,
          );
          expect(theirs.difficulty, `${e.key} s${seed}v${v} 갈래`).toBe(
            mineP.difficulty,
          );
        }
      }
    }
  });

  it("등록 목록에 넣을 항목이 `TypeEntry` 모양을 갖췄다", () => {
    for (const e of M3_TOP_2 as TypeEntry[]) {
      expect(typeof e.handler).toBe("function");
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.rpmTitle.length).toBeGreaterThan(5);
    }
  });
});
