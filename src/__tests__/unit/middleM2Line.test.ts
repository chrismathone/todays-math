/**
 * 중2 「일차함수와 일차방정식」 24유형 — 독립 검산 (물결 5D).
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다 조건식을
 * **여기서 다시 세워** 만족하는지 본다. 그리고 생성기가 쓴 것과 **다른 관계식**을
 * 쓴다 — 같은 식을 옮겨 적으면 동어반복이다.
 *
 * 특히 이 단원에서 갈라야 하는 것 셋:
 *  1. **사분면** — 생성기는 부호표(`quadNotPassed`)로 정한다. 여기서는 그 표를
 *     옮겨 적지 않고 **직선 위의 점을 실제로 찍어** 어느 사분면에 드는지 센다.
 *     표를 두 벌 두면 한쪽만 틀려도 아무도 모른다.
 *  2. **$x$절편과 $y$절편** — 뒤집어 쓰는 실수가 잦아 갈래마다 둘을 **따로**
 *     계산해 맞댄다($m\cdot x_0+c=0$ 과 $y(0)=c$ 를 함께 본다).
 *  3. **$b=0$ 이면 일차함수가 아니다** — 관계01·02 는 $b\ne0$ 을 못 박고,
 *     관계05 는 반대로 「$x=t$ 는 함수가 아니다」를 확인한다.
 *
 * 그림 유형 넷(⑴13·⑵02·⑵14·관계12)은 figureSpec ↔ facts 를 대조하고, 실제
 * 엔진으로 한 번 그려 본다 — marks 가 직선 밖이면 엔진이 던진다(검산 겸용).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers, josaFaults } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M2_LINE } from "../../lib/middle/m2Line";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991];

const MINOR_G1 = "일차함수와 그 그래프  ⑴";
const MINOR_G2 = "일차함수와 그 그래프  ⑵";
const MINOR_REL = "일차함수와 일차방정식의 관계";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine =
  existsSync(VENDOR) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

/**
 * 직선 $y=mx+n$ 이 실제로 드는 사분면 — **점을 찍어** 센다.
 * 생성기의 부호표를 옮겨 적지 않으려는 것이 요지다.
 */
function quadrantsHit(m: number, n: number): Set<number> {
  const hit = new Set<number>();
  for (let i = -3000; i <= 3000; i += 1) {
    const x = i / 100;
    const y = m * x + n;
    if (x > 0 && y > 0) hit.add(1);
    else if (x < 0 && y > 0) hit.add(2);
    else if (x < 0 && y < 0) hit.add(3);
    else if (x > 0 && y < 0) hit.add(4);
  }
  return hit;
}

/** 지나지 않는 사분면 — 기울기·절편이 0 이 아니면 정확히 하나다. */
function quadMissed(m: number, n: number): number[] {
  const hit = quadrantsHit(m, n);
  return [1, 2, 3, 4].filter((q) => !hit.has(q));
}

/** 직선 $y=ax$ 가 선분 $\mathrm{AB}$ 와 만나는가 — 부호가 바뀌면 만난다. */
function meetsSegment(
  a: number,
  A: [number, number],
  B: [number, number],
): boolean {
  let pos = false;
  let neg = false;
  for (let i = 0; i <= 2000; i += 1) {
    const t = i / 2000;
    const x = A[0] + t * (B[0] - A[0]);
    const y = A[1] + t * (B[1] - A[1]);
    const g = a * x - y;
    if (Math.abs(g) < 1e-9) return true;
    if (g > 0) pos = true;
    else neg = true;
  }
  return pos && neg;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** 유형별 독립 검산 — 발문의 조건식을 여기서 다시 세운다. 키는 `중단원|번호`. */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // ⑴10 기울기·y절편으로 다음 점 — P 가 직선 위 + p·q 가 이동 규칙과 맞다
  [`${MINOR_G1}|10`]: (f) =>
    f.den! * f.q! === f.num! * f.p! + f.den! * f.b! &&
    f.p! === f.den! &&
    f.ans! === f.p! + f.q! &&
    gcd(Math.abs(f.num!), f.den!) === 1 &&
    f.b !== 0,
  // ⑴13 두 직선 + x축 — 두 x절편이 각각 자기 직선 위, 넓이는 밑변·높이로
  [`${MINOR_G1}|13`]: (f) =>
    f.m1! * f.x1! + f.c! === 0 &&
    f.m2! * f.x2! + f.c! === 0 &&
    f.m1 !== f.m2 &&
    f.x1! < 0 &&
    f.x2! > 0 &&
    2 * f.area! === Math.abs((f.x2! - f.x1!) * f.c!),
  // ⑵01 옳은 것의 개수 — 다섯 항목을 여기서 따로 판정한다(㉤ 는 점을 찍어서)
  [`${MINOR_G2}|01`]: (f) => {
    const truths = [
      (f.up === 1) === f.a! > 0,
      f.k === f.b,
      f.t === f.a,
      f.q === f.a! * f.p! + f.b!,
      !quadMissed(f.a!, f.b!).includes(f.n!),
    ];
    return truths.filter(Boolean).length === f.ans!;
  },
  // ⑵02 부호 — 묻는 식의 기울기·절편은 a·b 를 부호만 바꿔 쓴 것, 답은 점 찍어서
  [`${MINOR_G2}|02`]: (f) => {
    const asked = [Math.abs(f.m2!), Math.abs(f.n2!)].sort((x, y) => x - y);
    const given = [Math.abs(f.a!), Math.abs(f.b!)].sort((x, y) => x - y);
    const missed = quadMissed(f.m2!, f.n2!);
    return (
      asked[0] === given[0] &&
      asked[1] === given[1] &&
      f.m2 !== 0 &&
      f.n2 !== 0 &&
      missed.length === 1 &&
      missed[0] === f.quad!
    );
  },
  // ⑵04 일치 — 기울기가 같고 y절편도 같다
  [`${MINOR_G2}|04`]: (f) =>
    f.mult! * f.a! - f.off! === f.coef2! && f.ans! === f.a! + f.b!,
  // ⑵08 절편 둘 — x절편·y절편을 따로 확인한 뒤 점을 대입
  [`${MINOR_G2}|08`]: (f) =>
    f.m! * f.x0! === -f.c! &&
    f.t! === f.m! * f.s! + f.c! &&
    f.s !== f.x0 &&
    f.c !== 0,
  // ⑵13 도형 활용 — 넓이는 ½·BP·AB 로 다시 센다 (생성기는 계수 coef 로 낸다)
  [`${MINOR_G2}|13`]: (f) =>
    2 * f.S! === f.h! * f.v! * f.t! && f.v! * f.t! <= f.w! && f.t! > 0,
  // ⑵14 그래프 활용 — 그림의 두 점이 직선 위, 답은 같은 식으로
  [`${MINOR_G2}|14`]: (f) =>
    f.top! === f.m! * f.p! + f.c! &&
    f.ans! === f.m! * f.t! + f.c! &&
    f.m !== 0 &&
    f.p! > 0,
  // ⑵15 두 x절편 사이 거리 — 거리가 d, 답은 양수 하나뿐
  [`${MINOR_G2}|15`]: (f) =>
    f.m2! * f.x2! + f.b2! === 0 &&
    f.a! === -f.m1! * f.x1! &&
    Math.abs(f.x1! - f.x2!) === f.d! &&
    f.a! > 0 &&
    f.other! <= 0,
  // ⑵16 저금 — 처음 금액 + 매달 × 개월 = 목표
  [`${MINOR_G2}|16`]: (f) => f.c! + f.r! * f.t! === f.target! && f.t! > 0,
  // 관계01 — ax+by+c=0 과 y=mx+n 이 **모든 x 에서** 같은 직선인가
  [`${MINOR_REL}|01`]: (f) =>
    f.b !== 0 &&
    f.ans! === f.m! + f.n! &&
    [-3, -1, 0, 2, 5].every(
      (x) => f.a! * x + f.b! * (f.m! * x + f.n!) + f.c! === 0,
    ),
  // 관계02 그래프 위의 점 — 대입하면 0
  [`${MINOR_REL}|02`]: (f) =>
    f.a! * f.p! + f.b! * f.q! + f.c! === 0 && f.b !== 0 && f.c !== 0,
  // 관계03 부호 — y 에 대하여 푼 직선에 점을 찍어 사분면을 센다
  [`${MINOR_REL}|03`]: (f) => {
    const missed = quadMissed(-f.sa! / f.sb!, -f.sc! / f.sb!);
    return missed.length === 1 && missed[0] === f.quad!;
  },
  // 관계04 직선의 방정식 — 두 점이 **일반형 식을 실제로 만족**하는가
  [`${MINOR_REL}|04`]: (f) =>
    f.a! * f.x1! + f.b! * f.y1! + f.c! === 0 &&
    f.a! * f.x2! + f.b! * f.y2! + f.c! === 0 &&
    f.x1 !== f.x2 &&
    f.b !== 0 &&
    f.ans! === f.b! + f.c!,
  // 관계05 x=k·y=k — s 는 **y**좌표, t 는 **x**좌표다 (뒤집으면 여기서 갈린다)
  [`${MINOR_REL}|05`]: (f) =>
    f.s === f.q && f.t === f.p && f.ans! === f.s! + f.t!,
  // 관계06 네 직선 — 가로·세로 거리의 곱
  [`${MINOR_REL}|06`]: (f) =>
    f.w! === Math.abs(f.x2! - f.x1!) &&
    f.h! === Math.abs(f.y2! - f.y1!) &&
    f.area! === f.w! * f.h! &&
    f.w! > 0 &&
    f.h! > 0,
  // 관계08 교점으로 미지수 — 교점을 두 식에 각각 대입, 두 직선은 달라야 한다
  [`${MINOR_REL}|08`]: (f) =>
    f.a1! * f.p! + f.b1! * f.q! === f.c! &&
    f.a2! * f.p! + f.b! * f.q! === f.c2! &&
    f.a1! * f.b! - f.a2! * f.b1! !== 0 &&
    f.ans! === f.b! + f.c!,
  // 관계09 교점을 지나는 직선 — 교점이 두 식을 만족하고 새 직선도 지난다
  [`${MINOR_REL}|09`]: (f) =>
    f.a1! * f.p! + f.b1! * f.q! === f.c1! &&
    f.a2! * f.p! + f.b2! * f.q! === f.c2! &&
    f.a1! * f.b2! - f.a2! * f.b1! !== 0 &&
    f.q! === f.m! * f.p! + f.n!,
  // 관계10 세 직선 한 점 — 셋 다 (p, q) 를 지나고 기울기는 서로 다르다
  [`${MINOR_REL}|10`]: (f) =>
    f.q! === f.m1! * f.p! + f.n1! &&
    f.q! === f.m2! * f.p! + f.n2! &&
    f.q! === f.m3! * f.p! + f.a! &&
    new Set([f.m1, f.m2, f.m3]).size === 3,
  // 관계11 해의 개수 — 크라메르로 「해가 0개인가 무수히 많은가」를 직접 센다
  [`${MINOR_REL}|11`]: (f) => {
    const det = f.a! * f.b2! - f.a2! * f.b1!;
    const consistent =
      f.c1! * f.b2! - f.c2! * f.b1! === 0 && f.a! * f.c2! - f.a2! * f.c1! === 0;
    return det === 0 && consistent === (f.many === 1);
  },
  // 관계12 두 직선 + y축 — 교점이 두 직선 위, 넓이는 밑변(절편 차)·높이(|p|)
  [`${MINOR_REL}|12`]: (f) =>
    f.q! === f.m1! * f.p! + f.b1! &&
    f.q! === f.m2! * f.p! + f.b2! &&
    f.m1 !== f.m2 &&
    f.p !== 0 &&
    2 * f.area! === Math.abs(f.b1! - f.b2!) * Math.abs(f.p!),
  // 관계13 x좌표=y좌표인 점 — (k, k) 가 식을 만족한다
  [`${MINOR_REL}|13`]: (f) =>
    f.a! * f.k! + f.b! * f.k! + f.c! === 0 && f.a! + f.b! !== 0 && f.b !== 0,
  // 관계14 선분과 만날 조건 — 두 끝점의 y/x 가 경계다
  [`${MINOR_REL}|14`]: (f) =>
    f.ya! === f.ka! * f.xa! &&
    f.yb! === f.kb! * f.xb! &&
    f.ka !== f.kb &&
    f.aMax! === Math.max(f.ka!, f.kb!) &&
    f.aMin! === Math.min(f.ka!, f.kb!),
  // 관계15 넓이 이등분 — 중심이 직사각형의 대칭점이고 원점과 그 점의 기울기가 m
  [`${MINOR_REL}|15`]: (f) =>
    2 * f.cx! === f.x1! + f.x2! &&
    2 * f.cy! === f.y1! + f.y2! &&
    f.cy! === f.m! * f.cx! &&
    f.cx !== 0 &&
    f.m !== 0 &&
    f.x1 !== f.x2 &&
    f.y1 !== f.y2,
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다. */
const ANSWER_KEY: Record<string, string> = {
  [`${MINOR_G1}|10`]: "ans",
  [`${MINOR_G1}|13`]: "area",
  [`${MINOR_G2}|01`]: "ans",
  [`${MINOR_G2}|02`]: "quad",
  [`${MINOR_G2}|04`]: "ans",
  [`${MINOR_G2}|08`]: "t",
  [`${MINOR_G2}|13`]: "t",
  [`${MINOR_G2}|14`]: "ans",
  [`${MINOR_G2}|15`]: "a",
  [`${MINOR_G2}|16`]: "t",
  [`${MINOR_REL}|01`]: "ans",
  [`${MINOR_REL}|02`]: "c",
  [`${MINOR_REL}|03`]: "quad",
  [`${MINOR_REL}|04`]: "ans",
  [`${MINOR_REL}|05`]: "ans",
  [`${MINOR_REL}|06`]: "area",
  [`${MINOR_REL}|08`]: "ans",
  [`${MINOR_REL}|09`]: "n",
  [`${MINOR_REL}|10`]: "a",
  [`${MINOR_REL}|11`]: "a",
  [`${MINOR_REL}|12`]: "area",
  [`${MINOR_REL}|13`]: "k",
  [`${MINOR_REL}|14`]: "aMax",
  [`${MINOR_REL}|15`]: "m",
};

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

describe("중2 일차함수와 일차방정식 24유형", () => {
  // ⚠️ 중단원 이름으로 고르면 **같은 중단원의 남의 유형**까지 쓸어 담는다 —
  //    이 세 중단원에는 m2Func·m2Real 의 유형이 **실제로 20개** 있다.
  //    자기 배열을 직접 훑는다.
  const entries = M2_LINE;

  it("24유형이 등록돼 있다 — ⑴ 2개 · ⑵ 8개 · 관계 14개", () => {
    expect(entries.length).toBe(24);
    expect(entries.filter((e) => e.rpmMinor === MINOR_G1).length).toBe(2);
    expect(entries.filter((e) => e.rpmMinor === MINOR_G2).length).toBe(8);
    expect(entries.filter((e) => e.rpmMinor === MINOR_REL).length).toBe(14);
  });

  it("색인의 «남은 번호»만 낸다 — 이미 있는 번호를 또 내지 않는다", () => {
    // 2026-08-24 `scripts/middle/type-census.ts` 실측. 이 목록이 곧 5D 의 몫이다.
    const mine = (minor: string) =>
      entries
        .filter((e) => e.rpmMinor === minor)
        .map((e) => e.rpmType)
        .sort();
    expect(mine(MINOR_G1)).toEqual(["10", "13"]);
    expect(mine(MINOR_G2)).toEqual([
      "01",
      "02",
      "04",
      "08",
      "13",
      "14",
      "15",
      "16",
    ]);
    expect(mine(MINOR_REL)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
    ]);
  });

  it("우리 단원 7개에 나눠 붙는다 (prisma/seed-data/units.ts 리터럴)", () => {
    const sections = new Set(entries.map((e) => e.unitSection));
    expect(sections).toEqual(
      new Set([
        "일차함수의 그래프의 성질",
        "일차함수의 그래프와 절편",
        "일차함수의 그래프와 기울기",
        "일차함수의 식 구하기",
        "일차함수의 활용(속력, 도형, 기타)",
        "일차함수와 일차방정식",
        "일차함수의 그래프와 연립방정식의 해",
      ]),
    );
  });

  for (const e of entries) {
    const vkey = `${e.rpmMinor}|${e.rpmType}`;
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[vkey];
        expect(verify, `검산식 누락: ${vkey}`).toBeDefined();
        for (const seed of SEEDS) {
          for (let v = 0; v < 3; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              verify!(p.facts),
              `seed ${seed}/${v} 검산 실패: ${JSON.stringify(p.facts)}`,
            ).toBe(true);
          }
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const key = ANSWER_KEY[vkey];
        expect(key, `답 키 누락: ${vkey}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(firstNumber(p.answer), `답 ${p.answer} vs facts.${key}`).toBe(
            p.facts[key!],
          );
        }
      });

      it("실제 렌더러가 붉은 글자·raw 폴백 없이 그린다", () => {
        // KaTeX 는 unknown command 를 «에러»가 아니라 **#cc0000 붉은 글자**로 그린다
        // (CLAUDE.md 2026-08-14). 그래서 성공 여부는 실제 렌더로만 잰다 —
        // 이 검사가 `\times` 뒤에 글자가 붙어 생긴 `\timesx` 를 잡았다(⑵13, 실측).
        for (const seed of SEEDS) {
          for (let v = 0; v < 3; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const part of [p.content, p.answer, p.solution]) {
              const html = renderMathHtml(part);
              expect(/#cc0000/i.test(html), part).toBe(false);
              expect(html.includes("math-raw"), part).toBe(false);
            }
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  /**
   * 값이 맞아도 지면은 흉할 수 있다 — `\times-3`·`+-`·`1x`·분모가 음수인 분수는
   * KaTeX·bareNumbers 가드를 **전부 통과한다**(2026-08-24 4C·4D 교훈).
   * 그래서 값과 무관한 「지면 냄새」를 따로 센다.
   */
  it("지면 냄새가 없다 — 값 검사가 구조적으로 못 보는 자리", () => {
    const SMELLS: [string, RegExp][] = [
      ["더하기빼기", /\+-|--/],
      ["곱하기 뒤 음수", /\\times-/],
      ["계수 1", /(?<![\d.])1[a-zA-Z](?![a-zA-Z])/],
      ["지수 1", /\^1(?!\d)/],
      ["0 더하기", /\+0(?!\d)/],
      ["분모가 음수", /dfrac\{[^{}]*\}\{-/],
      ["빈 중괄호", /\{\}/],
      ["긴 소수", /\d\.\d{3,}/],
    ];
    const bad: string[] = [];
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (const p of generateMiddleSet(e.key, seed, 4)) {
          for (const text of [p.content, p.answer, p.solution]) {
            for (const [label, re] of SMELLS) {
              const m = text.match(re);
              if (m) bad.push(`${e.rpmMinor}|${e.rpmType} ${label} «${m[0]}»`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 5), `지면 냄새 ${bad.length}자리`).toEqual([]);
  });

  /**
   * 수식 뒤 조사 — 「$y=x+1$와」·「$x=3$를」은 KaTeX 도 bareNumbers 도 통과한다.
   * 판정은 **이 저장소가 이미 가진** `rules.ts` 의 `josaFaults` 로 한다 — 모듈의
   * `fixJosa` 와 다른 구현이라 한쪽이 틀리면 갈라진다(같은 함수를 부르면 동어반복).
   * 초판은 203자리가 틀려 있었다 — 발문마다 손으로 고르면 반드시 샌다.
   */
  it("수식 뒤 조사가 읽는 소리와 맞는다", () => {
    const bad: string[] = [];
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (const p of generateMiddleSet(e.key, seed, 4)) {
          for (const text of [p.content, p.answer, p.solution]) {
            for (const f of josaFaults(text)) {
              bad.push(`${e.rpmMinor}|${e.rpmType} «${f}»`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 5), `조사가 어긋난 자리 ${bad.length}개`).toEqual([]);
  });

  /**
   * 「로 / 으로」는 `rules.ts` 의 `josaFaults` 가 **안 본다** — 그래서 여기 따로 센다.
   * 「$y=3$로 둘러싸인」은 KaTeX 도 값 검사도 통과하고 지면에서만 걸린다.
   *
   * ⚠️ 이 표는 **한자 수사의 받침**이지 위 조사표가 아니다 — ㄹ받침(일·칠·팔)도
   * 「로」다. 조사표를 그대로 쓰면 「$x=1$으로」를 만든다.
   */
  it("수식 뒤 「로/으로」가 읽는 소리와 맞는다", () => {
    const RO_EXPECT: Record<string, string> = {
      "0": "으로", // 영 — ㅇ받침
      "1": "로", //  일 — ㄹ받침
      "2": "로", //  이
      "3": "으로", // 삼 — ㅁ받침
      "4": "로", //  사
      "5": "로", //  오
      "6": "으로", // 육 — ㄱ받침
      "7": "로", //  칠 — ㄹ받침
      "8": "로", //  팔 — ㄹ받침
      "9": "로", //  구
    };
    const RO = /\$([^$]*)\$ ?(으로|로)(?![가-힣])/g;
    const bad: string[] = [];
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (const p of generateMiddleSet(e.key, seed, 4)) {
          for (const text of [p.content, p.answer, p.solution]) {
            for (const m of text.matchAll(RO)) {
              const span = m[1]!;
              // 단위(`\mathrm{cm}`)는 낱말이 소리의 끝을 정한다 — 이 규칙 밖이다.
              if (span.includes("\\mathrm")) continue;
              const d = span.replace(/[)\]}\s]+$/, "").match(/(\d)$/);
              if (!d) continue;
              if (RO_EXPECT[d[1]!] !== m[2]) {
                bad.push(`${e.rpmMinor}|${e.rpmType} «${m[0]}»`);
              }
            }
          }
        }
      }
    }
    expect(
      bad.slice(0, 5),
      `「로/으로」가 어긋난 자리 ${bad.length}개`,
    ).toEqual([]);
  });

  it("해설의 분수는 약분됐거나 그 자리에서 약분된다 — 4/2 로 끝나지 않는다", () => {
    // 「약분 안 된 분수」가 아니라 **「약분한 값이 바로 뒤에 안 따라오는 분수」**를 센다.
    // $\\dfrac{12}{4}=3$ 은 교과 계산 사슬(정상)이고, $\\dfrac{4}{2}$ 로 끝나면
    // 그대로 지면에 나간다(m2Func 가 실측 46자리를 그렇게 찾았다).
    const FRAC = /dfrac{(-?\d+)}{(-?\d+)}/g;
    const bad: string[] = [];
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (const p of generateMiddleSet(e.key, seed, 4)) {
          for (const text of [p.content, p.answer, p.solution]) {
            for (const m of text.matchAll(FRAC)) {
              const n = Number(m[1]);
              const d = Number(m[2]);
              if (Math.abs(d) === 1 || gcd(n, d) !== Math.abs(d)) continue;
              const after = text
                .slice((m.index ?? 0) + m[0].length)
                .trimStart();
              if (after.startsWith("=" + String(n / d))) continue;
              bad.push(`${e.rpmMinor}|${e.rpmType} seed ${seed}: ${m[0]}`);
            }
          }
        }
      }
    }
    expect(
      bad.slice(0, 5),
      `약분 안 된 채 끝나는 분수 ${bad.length}자리`,
    ).toEqual([]);
  });

  describe("이 단원의 함정 — 시험이 따로 지킨다", () => {
    it("⑵02 — 지면에 **찍힌** 식에서 기울기·절편을 다시 읽어 답과 맞댄다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_G2 && x.rpmType === "02",
      )!;
      for (const seed of SEEDS) {
        for (let v = 0; v < 4; v += 1) {
          const p = generateMiddleProblem(e.key, seed, v);
          // 주어진 식 `$y=ax+b$` 뒤에는 「의 그래프이다」, 묻는 식 뒤에는 「의 그래프는」.
          const m = p.content.match(
            /일차함수 \$y=(-?)([ab])x([+-])([ab])\$의 그래프는/,
          );
          expect(m, `묻는 식을 못 읽음: ${p.content}`).not.toBeNull();
          const val = (name: string) =>
            name === "a" ? p.facts.a! : p.facts.b!;
          const slope = (m![1] === "-" ? -1 : 1) * val(m![2]!);
          const inter = (m![3] === "-" ? -1 : 1) * val(m![4]!);
          expect(m![2]).not.toBe(m![4]); // a·b 를 각각 한 번씩 쓴다
          expect(slope).toBe(p.facts.m2);
          expect(inter).toBe(p.facts.n2);
          const missed = quadMissed(slope, inter);
          expect(missed).toEqual([p.facts.quad]);
        }
      }
    });

    it("관계01·02 — $y$ 의 계수가 $0$ 이면 세로선이라 일차함수가 아니다", () => {
      for (const num of ["01", "02"]) {
        const e = entries.find(
          (x) => x.rpmMinor === MINOR_REL && x.rpmType === num,
        )!;
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 4)) {
            expect(p.facts.b, `${num} seed ${seed}`).not.toBe(0);
          }
        }
      }
    });

    it("관계05 — $x=t$ 는 세로선이라 함수가 아니고, $y=s$ 는 가로선이라 함수다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_REL && x.rpmType === "05",
      )!;
      for (const seed of SEEDS) {
        const f = generateMiddleProblem(e.key, seed).facts;
        // 세로선 x=t 위의 두 점은 x 가 같고 y 가 다르다 ⇒ 함수가 아니다.
        const onVert: [number, number][] = [
          [f.t!, f.q!],
          [f.t!, f.q! + 1],
        ];
        expect(onVert[0]![0]).toBe(onVert[1]![0]);
        expect(onVert[0]![1]).not.toBe(onVert[1]![1]);
        // 가로선 y=s 위의 점은 x 가 달라도 y 가 하나뿐이다 ⇒ 함수다.
        const ys = new Set([-4, 0, 3, 9].map(() => f.s!));
        expect(ys.size).toBe(1);
        // 그리고 t 는 **x**좌표, s 는 **y**좌표다 — 뒤집으면 여기서 갈린다.
        expect(f.t).toBe(f.p);
        expect(f.s).toBe(f.q);
      }
    });

    it("관계14 — 최댓값에서는 선분과 만나고, 그보다 크면 만나지 않는다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_REL && x.rpmType === "14",
      )!;
      for (const seed of SEEDS) {
        for (let v = 0; v < 3; v += 1) {
          const f = generateMiddleProblem(e.key, seed, v).facts;
          const A: [number, number] = [f.xa!, f.ya!];
          const B: [number, number] = [f.xb!, f.yb!];
          expect(meetsSegment(f.aMax!, A, B), `seed ${seed} 최댓값`).toBe(true);
          expect(meetsSegment(f.aMax! + 1, A, B), `seed ${seed} 넘으면`).toBe(
            false,
          );
          expect(meetsSegment(f.aMin!, A, B)).toBe(true);
          expect(meetsSegment(f.aMin! - 1, A, B)).toBe(false);
        }
      }
    });

    it("관계15 — 직사각형이 중심에 대하여 대칭이고 그 중심을 직선이 지난다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_REL && x.rpmType === "15",
      )!;
      for (const seed of SEEDS) {
        const f = generateMiddleProblem(e.key, seed).facts;
        // 네 꼭짓점을 중심에 대하여 뒤집으면 자기 자신으로 돌아온다.
        const verts: [number, number][] = [
          [f.x1!, f.y1!],
          [f.x2!, f.y1!],
          [f.x2!, f.y2!],
          [f.x1!, f.y2!],
        ];
        const key = (v: [number, number]) => `${v[0]},${v[1]}`;
        const set = new Set(verts.map(key));
        for (const v of verts) {
          expect(set.has(key([2 * f.cx! - v[0], 2 * f.cy! - v[1]]))).toBe(true);
        }
        // 원점을 지나는 직선 y=mx 가 그 중심을 지난다.
        expect(f.m! * f.cx!).toBe(f.cy);
      }
    });
  });

  describe("그림 유형 — figureSpec ↔ facts 일치", () => {
    const FIGURE_KEYS = [
      `${MINOR_G1}|13`,
      `${MINOR_G2}|02`,
      `${MINOR_G2}|14`,
      `${MINOR_REL}|12`,
    ];

    it("그림 유형 넷만 figureSpec 을 싣고, 나머지는 없다", () => {
      for (const e of entries) {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const has = FIGURE_KEYS.includes(`${e.rpmMinor}|${e.rpmType}`);
          expect(Boolean(p.figureSpec), e.key).toBe(has);
        }
      }
    });

    it("그림이 있는 유형만 발문이 「오른쪽 그림」을 말한다", () => {
      for (const e of entries) {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const says = p.content.includes("오른쪽 그림");
          expect(says, `${e.key}: 그림 없이 그림을 가리킨다`).toBe(
            Boolean(p.figureSpec),
          );
        }
      }
    });

    it("⑴13 — 두 직선과 marks(두 x절편·공통 y절편)가 facts 와 같다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_G1 && x.rpmType === "13",
      )!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as {
          lines: { slope: number; yIntercept: number }[];
          marks: number[][];
        };
        const f = p.facts;
        expect(spec.lines.map((l) => l.slope)).toEqual([f.m1, f.m2]);
        expect(spec.lines.every((l) => l.yIntercept === f.c)).toBe(true);
        expect(spec.marks).toEqual([
          [f.x1, 0],
          [f.x2, 0],
          [0, f.c],
        ]);
      }
    });

    it("⑵02 — 그림은 **주어진** 식 $y=ax+b$ 이고 눈금 숫자를 안 찍는다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_G2 && x.rpmType === "02",
      )!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as {
          lines: { slope: number; yIntercept: number }[];
          marks?: number[][];
        };
        expect(spec.lines).toEqual([
          { slope: p.facts.a, yIntercept: p.facts.b },
        ]);
        expect(spec.marks).toBeUndefined();
      }
    });

    it("⑵14 — marks 가 그래프에서 읽는 두 점 $(0, c)$·$(p, top)$ 이다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_G2 && x.rpmType === "14",
      )!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as {
          lines: { slope: number; yIntercept: number }[];
          marks: number[][];
        };
        expect(spec.lines[0]!.slope).toBe(p.facts.m);
        expect(spec.lines[0]!.yIntercept).toBe(p.facts.c);
        expect(spec.marks).toEqual([
          [0, p.facts.c],
          [p.facts.p, p.facts.top],
        ]);
      }
    });

    it("관계12 — marks 가 두 $y$절편과 교점이다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_REL && x.rpmType === "12",
      )!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as {
          lines: { slope: number; yIntercept: number }[];
          marks: number[][];
        };
        const f = p.facts;
        expect(spec.lines).toEqual([
          { slope: f.m1, yIntercept: f.b1 },
          { slope: f.m2, yIntercept: f.b2 },
        ]);
        expect(spec.marks).toEqual([
          [0, f.b1],
          [0, f.b2],
          [f.p, f.q],
        ]);
      }
    });

    it("범위는 원점을 품고 폭이 4~12칸이다 — 엔진이 그 밖을 던진다", () => {
      for (const vk of FIGURE_KEYS) {
        const e = entries.find((x) => `${x.rpmMinor}|${x.rpmType}` === vk)!;
        for (const seed of SEEDS) {
          for (let v = 0; v < 3; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            const spec = p.figureSpec as {
              xRange: number[];
              yRange: number[];
            };
            for (const [name, r] of [
              ["xRange", spec.xRange],
              ["yRange", spec.yRange],
            ] as const) {
              expect(r[0]!, `${vk} ${name} lo`).toBeLessThanOrEqual(-1);
              expect(r[1]!, `${vk} ${name} hi`).toBeGreaterThanOrEqual(1);
              expect(r[1]! - r[0]!, `${vk} ${name} 폭`).toBeGreaterThanOrEqual(
                4,
              );
              expect(r[1]! - r[0]!, `${vk} ${name} 폭`).toBeLessThanOrEqual(12);
            }
          }
        }
      }
    });

    describe.skipIf(!hasEngine)("실제 엔진 렌더", () => {
      it("그림 유형 넷의 figureSpec 이 실제로 그려진다 — 직선 밖 mark 면 엔진이 던진다", async () => {
        for (const vk of FIGURE_KEYS) {
          const e = entries.find((x) => `${x.rpmMinor}|${x.rpmType}` === vk)!;
          for (const seed of SEEDS.slice(0, 3)) {
            const p = generateMiddleProblem(e.key, seed);
            const r = await renderFigureSpec(p.figureSpec);
            expect(r.ok, `${vk} seed ${seed}: ${r.ok ? "" : r.error}`).toBe(
              true,
            );
          }
        }
      });
    });
  });
});
