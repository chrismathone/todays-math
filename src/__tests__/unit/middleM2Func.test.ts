/**
 * 중2 「일차함수」 함수 유형 18개 — 독립 검산 (물결 2C).
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * 조건식을 **여기서 다시 세워** 만족하는지 본다. 판별 유형(⑴01·⑴03)의
 * 진릿값 표도 여기 **따로** 적었다 — 생성기 풀이 틀리면 여기서 갈라진다.
 *
 * 그림 유형 셋(⑴07·⑴11·관계07)은 figureSpec ↔ facts 일치를 대조하고,
 * 실제 엔진으로 한 번 그려 본다 — marks 가 직선 밖이면 엔진이 던진다
 * (linearGraph 의 검산 겸용 규칙).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import { M2_FUNC } from "../../lib/middle/m2Func";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

const MINOR_G1 = "일차함수와 그 그래프  ⑴";
const MINOR_G2 = "일차함수와 그 그래프  ⑵";
const MINOR_REL = "일차함수와 일차방정식의 관계";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine =
  existsSync(VENDOR) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

/**
 * ⑴01·⑴03 판별 풀의 진릿값 — 생성기와 **별도로** 손으로 판정해 적었다.
 * (같은 상수를 import 하면 풀이 틀려도 영원히 초록이다.)
 */
const FUNC_TRUTH = [true, false, true, false, true, false, true, false];
const LINEAR_TRUTH = [true, false, true, false, false, true, false, true];

/** 유형별 독립 검산 — 발문의 조건식을 그대로 옮긴다. 키는 `중단원|번호`. */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // ⑴01 함수 판별 — 뽑힌 소재의 진릿값 수 == 답
  [`${MINOR_G1}|01`]: (f) =>
    [f.i0!, f.i1!, f.i2!, f.i3!].filter((i) => FUNC_TRUTH[i]!).length ===
      f.ans! && new Set([f.i0, f.i1, f.i2, f.i3]).size === 4,
  // ⑴02 f(p)+f(q) == (ap+b)+(aq+b)
  [`${MINOR_G1}|02`]: (f) =>
    f.a! * f.p! + f.b! + (f.a! * f.q! + f.b!) === f.ans! && f.p !== f.q,
  // ⑴03 일차함수 판별
  [`${MINOR_G1}|03`]: (f) =>
    [f.i0!, f.i1!, f.i2!, f.i3!, f.i4!].filter((i) => LINEAR_TRUTH[i]!)
      .length === f.ans! && new Set([f.i0, f.i1, f.i2, f.i3, f.i4]).size === 5,
  // ⑴04 (k, q) 가 그래프 위 — q == a·k + b
  [`${MINOR_G1}|04`]: (f) => f.a! * f.k! + f.b! === f.q!,
  // ⑴05 평행이동 — q == a·p + c
  [`${MINOR_G1}|05`]: (f) => f.a! * f.p! + f.c! === f.q!,
  // ⑴06 절편 — m·x0 + b == 0, 답 == x0 + b
  [`${MINOR_G1}|06`]: (f) =>
    f.m! * f.x0! + f.b! === 0 && f.x0! + f.b! === f.ans!,
  // ⑴07 그림 기울기 — 두 점이 직선 위 + 증가량·기울기 관계 (분수 기울기는 곱으로)
  [`${MINOR_G1}|07`]: (f) =>
    (f.y2! - f.y1!) * f.den! === f.num! * (f.x2! - f.x1!) &&
    f.y1! * f.den! === f.num! * f.x1! + f.b! * f.den! &&
    f.ans! * f.den! === f.num! * f.p! &&
    f.p! > 0,
  // ⑴08 두 점 기울기 — y2-y1 == m(x2-x1)
  [`${MINOR_G1}|08`]: (f) =>
    f.y2! - f.y1! === f.m! * (f.x2! - f.x1!) && f.x1! !== f.x2!,
  // ⑴09 세 점 한 직선 — AB 기울기 == BC 기울기 (교차곱)
  [`${MINOR_G1}|09`]: (f) =>
    (f.y2! - f.y1!) * (f.x3! - f.x2!) === (f.k! - f.y2!) * (f.x2! - f.x1!),
  // ⑴11 절편 넓이 — 2·넓이 == |x0·b|
  [`${MINOR_G1}|11`]: (f) => 2 * f.area! === Math.abs(f.x0! * f.b!),
  // ⑴12 함숫값 차 — d == m(p-q)
  [`${MINOR_G1}|12`]: (f) => f.m! * (f.p! - f.q!) === f.d! && f.p !== f.q,
  // ⑵03 평행 — mult·a - off == coef2, y절편은 달라야 한다
  [`${MINOR_G2}|03`]: (f) =>
    f.mult! * f.a! - f.off! === f.coef2! && f.c1 !== f.c2,
  // ⑵05 기울기·y절편 — k == m·p + b
  [`${MINOR_G2}|05`]: (f) => f.m! * f.p! + f.b! === f.k!,
  // ⑵06 기울기·한 점 — q == m·p + b
  [`${MINOR_G2}|06`]: (f) => f.m! * f.p! + f.b! === f.q!,
  // ⑵07 두 점 — 두 점이 y=mx+b 위
  [`${MINOR_G2}|07`]: (f) =>
    f.y1! === f.m! * f.x1! + f.b! && f.y2! === f.m! * f.x2! + f.b!,
  // ⑵09 온도 — 100(t0 - 답) == d·h
  [`${MINOR_G2}|09`]: (f) => 100 * (f.t0! - f.ans!) === f.d! * f.h!,
  // ⑵10 길이 — L0 - r·t == Lk, 아직 남아 있어야 한다
  [`${MINOR_G2}|10`]: (f) => f.L0! - f.r! * f.t! === f.Lk! && f.Lk! > 0,
  // 관계07 교점 — (p, q) 가 두 직선 다 만족, 기울기는 달라야 한다
  [`${MINOR_REL}|07`]: (f) =>
    f.q! === f.m1! * f.p! + f.b1! &&
    f.q! === f.m2! * f.p! + f.b2! &&
    f.m1 !== f.m2,
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다. */
const ANSWER_KEY: Record<string, string> = {
  [`${MINOR_G1}|01`]: "ans",
  [`${MINOR_G1}|02`]: "ans",
  [`${MINOR_G1}|03`]: "ans",
  [`${MINOR_G1}|04`]: "k",
  [`${MINOR_G1}|05`]: "c",
  [`${MINOR_G1}|06`]: "ans",
  [`${MINOR_G1}|07`]: "ans",
  [`${MINOR_G1}|08`]: "m",
  [`${MINOR_G1}|09`]: "k",
  [`${MINOR_G1}|11`]: "area",
  [`${MINOR_G1}|12`]: "m",
  [`${MINOR_G2}|03`]: "a",
  [`${MINOR_G2}|05`]: "k",
  [`${MINOR_G2}|06`]: "b",
  [`${MINOR_G2}|07`]: "b",
  [`${MINOR_G2}|09`]: "ans",
  [`${MINOR_G2}|10`]: "t",
  [`${MINOR_REL}|07`]: "p",
};

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

describe("중2 일차함수 함수 유형 18개", () => {
  // ⚠️ 중단원 이름으로 고르면 **같은 중단원의 남의 유형**까지 쓸어 담는다 —
  //    물결 2D 가 2-1 ⑵ 11·12 에 실물 맥락 유형을 냈다. 자기 모듈을 직접 훑는다
  //    (자기 유형은 자기 시험이 지킨다 — middleM2.test.ts 와 같은 규칙).
  const entries = M2_FUNC;

  it("18유형이 등록돼 있다 — ⑴ 11개 · ⑵ 6개 · 관계 1개", () => {
    expect(entries.length).toBe(18);
    expect(entries.filter((e) => e.rpmMinor === MINOR_G1).length).toBe(11);
    expect(entries.filter((e) => e.rpmMinor === MINOR_G2).length).toBe(6);
    expect(entries.filter((e) => e.rpmMinor === MINOR_REL).length).toBe(1);
  });

  it("우리 단원 7개에 나눠 붙는다 (DB 실측 리터럴 2026-08-23)", () => {
    const sections = new Set(entries.map((e) => e.unitSection));
    expect(sections).toEqual(
      new Set([
        "함수와 함숫값",
        "일차함수의 그래프의 성질",
        "일차함수의 그래프와 절편",
        "일차함수의 그래프와 기울기",
        "일차함수의 식 구하기",
        "일차함수의 활용(온도, 길이)",
        "일차함수의 그래프와 연립방정식의 해",
      ]),
    );
  });

  for (const e of entries) {
    const vkey = `${e.rpmMinor}|${e.rpmType}`;
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[vkey];
        expect(verify, `검산식 누락: ${vkey}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const key = ANSWER_KEY[vkey]!;
          expect(key, `답 키 누락: ${vkey}`).toBeDefined();
          expect(firstNumber(p.answer), `답 ${p.answer} vs facts.${key}`).toBe(
            p.facts[key],
          );
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
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  describe("그림 유형 — figureSpec ↔ facts 일치 (2D 계약 선행)", () => {
    const FIGURE_KEYS = [`${MINOR_G1}|07`, `${MINOR_G1}|11`, `${MINOR_REL}|07`];

    it("그림 유형 셋만 figureSpec 을 싣고, 나머지는 없다", () => {
      for (const e of entries) {
        const p = generateMiddleProblem(e.key, 20260823);
        const has = FIGURE_KEYS.includes(`${e.rpmMinor}|${e.rpmType}`);
        expect(Boolean(p.figureSpec), e.key).toBe(has);
      }
    });

    it("⑴07 — 그림의 직선·marks 가 facts 의 두 점·기울기와 같다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_G1 && x.rpmType === "07",
      )!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as {
          lines: { slope: number; yIntercept: number }[];
          marks: number[][];
        };
        const f = p.facts;
        expect(spec.lines[0]!.slope).toBe(f.num! / f.den!);
        expect(spec.lines[0]!.yIntercept).toBe(f.b);
        expect(spec.marks).toEqual([
          [f.x1, f.y1],
          [f.x2, f.y2],
        ]);
      }
    });

    it("⑴11 — 그림의 marks 가 두 절편이다", () => {
      const e = entries.find(
        (x) => x.rpmMinor === MINOR_G1 && x.rpmType === "11",
      )!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as { marks: number[][] };
        expect(spec.marks).toEqual([
          [p.facts.x0, 0],
          [0, p.facts.b],
        ]);
      }
    });

    it("관계07 — 그림이 두 직선이고 mark 가 교점 (p, q)다", () => {
      const e = entries.find((x) => x.rpmMinor === MINOR_REL)!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as {
          lines: { slope: number; yIntercept: number }[];
          marks: number[][];
        };
        expect(spec.lines.length).toBe(2);
        expect(spec.lines[0]!.slope).not.toBe(spec.lines[1]!.slope);
        expect(spec.marks).toEqual([[p.facts.p, p.facts.q]]);
      }
    });

    it("해설의 분수는 약분됐거나 그 자리에서 약분된다 — 4/2 로 끝나지 않는다", () => {
      // 「약분 안 된 분수」가 아니라 **「약분한 값이 바로 뒤에 안 따라오는 분수」**를 센다.
      // $\\dfrac{12}{4}=3$ 은 교과 계산 사슬(정상)이고, $\\dfrac{4}{2}$ 로 끝나면
      // 그대로 지면에 나간다(2026-08-23 실측 46자리 — 유형 07 이 그랬다).
      const gcd = (a: number, b: number): number =>
        b ? gcd(b, a % b) : Math.abs(a);
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

    describe.skipIf(!hasEngine)("실제 엔진 렌더", () => {
      it("그림 유형 셋의 figureSpec 이 실제로 그려진다 — 직선 밖 mark 면 엔진이 던진다", async () => {
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
