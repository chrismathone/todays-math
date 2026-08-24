/**
 * 중2 「피타고라스 정리」 16유형 — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다 조건식을
 * **여기서 다시 세워** 만족하는지 본다(본보기 middleM3.test.ts 와 같은 계약).
 * 분수 답(09·10·13)은 값을 다시 계산하지 않고 **교차곱**으로 검산한다 —
 * 생성기와 같은 `frac()` 리듀스 코드를 옮겨 적으면 동어반복이다.
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991];
const BOOK = "2-2";
const MINOR = "피타고라스 정리";

const entries = () =>
  registeredTypes().filter((e) => e.rpmBook === BOOK && e.rpmMinor === MINOR);

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** `\dfrac{n}{d}` 또는 맨 정수를 [분자, 분모] 로. */
function fracOf(text: string): [number, number] {
  const dm = text.match(/\\dfrac\{(-?\d+)\}\{(\d+)\}/);
  if (dm) return [Number(dm[1]), Number(dm[2])];
  return [firstNumber(text), 1];
}

/** π 계수를 [분자, 분모] 로 — `\dfrac{n}{d}\pi` 또는 `n\pi`. */
function piCoefOf(text: string): [number, number] {
  const dm = text.match(/\\dfrac\{(-?\d+)\}\{(\d+)\}\\pi/);
  if (dm) return [Number(dm[1]), Number(dm[2])];
  const m = text.match(/(-?\d+)\\pi/);
  if (!m) throw new Error(`π 계수를 못 찾음: ${text}`);
  return [Number(m[1]), 1];
}

function allNumbers(text: string): number[] {
  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/** 유형별 독립 검산 — facts 의 값들이 만족해야 하는 관계식. */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  "01": (f) => f.p! * f.p! + f.q! * f.q! === f.r! * f.r!,
  "02": (f) =>
    f.half! * f.half! + f.h! * f.h! === f.leg! * f.leg! &&
    f.base! === 2 * f.half! &&
    f.area! === f.half! * f.h!,
  "03": (f) => f.w! * f.w! + f.h! * f.h! === f.d! * f.d!,
  "04": (f) =>
    f.hp! * f.hp! + f.hq! * f.hq! === f.side! * f.side! &&
    f.p! === 2 * f.hp! &&
    f.q! === 2 * f.hq!,
  "05": (f) => f.a! * f.a! + f.b! * f.b! === f.c2! && f.c! * f.c! === f.c2!,
  "06": (f) => f.a! * f.a! + f.b! * f.b! === f.c2! && f.c! * f.c! === f.c2!,
  "07": (f) => f.p! * f.p! + f.q! * f.q! === f.r! * f.r!,
  "08": (f) => {
    if (f.acute === 1) {
      return (
        f.lo! === f.q! &&
        f.hi! === f.r! &&
        f.p! * f.p! + f.q! * f.q! === f.r! * f.r!
      );
    }
    return (
      f.lo! === f.r! &&
      f.hi! === f.p! + f.q! &&
      f.p! * f.p! + f.q! * f.q! === f.r! * f.r!
    );
  },
  "09": (f) => f.a! * f.a! + f.b! * f.b! === f.c! * f.c!,
  "10": (f) => f.a! * f.a! + f.b! * f.b! === f.c! * f.c!,
  "11": (f) => f.pa! * f.pa! + f.pc! * f.pc! === f.pb! * f.pb! + f.pd! * f.pd!,
  "12": (f) => f.ab! * f.ab! + f.cd! * f.cd! === f.bc! * f.bc! + f.da! * f.da!,
  "13": (f) => f.num! === f.a! * f.a! + f.b! * f.b! && f.num! === f.c! * f.c!,
  "14": (f) => f.area! === (f.a! * f.b!) / 2,
  "15": (f) =>
    (f.p! + f.h!) * (f.p! + f.h!) + f.q! * f.q! === f.r! * f.r! &&
    f.leg! === f.p! + f.h!,
  "16": (f) => f.ae! * f.ae! === (f.w! - f.ae!) * (f.w! - f.ae!) + f.h! * f.h!,
};

/** 그림이 있어야 하는 유형(v2) — 없어야 하는 나머지는 모듈 주석에 이유가 있다. */
const V2_FIGURE_TYPES = new Set([
  "01",
  "02",
  "03",
  "04",
  "06",
  "09",
  "10",
  "16",
]);
/** elem-1 kind 를 쓰는 유형(15, 직육면체 겨냥도). */
const ELEM1_FIGURE_TYPES = new Set(["15"]);

describe("중2 피타고라스 정리 16유형", () => {
  it("01~16 이 전부 등록돼 있다", () => {
    const es = entries();
    expect(es.length).toBe(16);
    expect(es.map((e) => e.rpmType).sort()).toEqual(
      Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("우리 단원 이름은 RPM 제목 문구가 갈리는 자리(10번)에서 나뉜다", () => {
    const byType = new Map(entries().map((e) => [e.rpmType, e.unitSection]));
    for (let i = 1; i <= 9; i += 1) {
      expect(byType.get(String(i).padStart(2, "0"))).toBe("피타고라스 정리");
    }
    for (let i = 10; i <= 16; i += 1) {
      expect(byType.get(String(i).padStart(2, "0"))).toBe(
        "피타고라스 정리의 활용",
      );
    }
  });

  it("RPM 색인의 실제 제목을 쓴다 (지어낸 제목 금지 — 표본 대조)", () => {
    const byKey = new Map(entries().map((e) => [e.rpmType, e.rpmTitle]));
    expect(byKey.get("01")).toBe("직각삼각형의 변의 길이");
    expect(byKey.get("06")).toBe("피타고라스 정리의 증명 피타고라스의 방법");
    expect(byKey.get("11")).toBe("피타고라스 정리를 이용한 사각형의 성질 ⑴");
    expect(byKey.get("16")).toBe("피타고라스 정리 종이접기");
  });

  for (const e of entries()) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.rpmType];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
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

      it("그림: 있어야 하는 유형에만 있고, 스펙의 수는 전부 유한하다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          if (V2_FIGURE_TYPES.has(e.rpmType)) {
            expect(p.figureSpec, `${e.key} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe(2);
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
          } else if (ELEM1_FIGURE_TYPES.has(e.rpmType)) {
            expect(p.figureSpec, `${e.key} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe("elem-1");
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
          } else {
            expect(p.figureSpec ?? null, `${e.key} 는 그림이 없어야 한다`).toBe(
              null,
            );
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries()) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  // ── 답 문자열 대조 — 유형마다 형식이 달라 개별로 확인한다 ─────────────
  it("01 — 답이 mode 가 가리키는 변과 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|01", seed);
      const want = p.facts.mode === 0 ? p.facts.r : p.facts.q;
      expect(firstNumber(p.answer)).toBe(want);
    }
  });

  for (const [type, key] of [
    ["02", "area"],
    ["03", "d"],
    ["04", "side"],
    ["05", "c2"],
    ["06", "c2"],
    ["07", "r"],
    ["14", "area"],
    ["15", "r"],
    ["16", "ae"],
  ] as const) {
    it(`${type} — 답의 수가 facts.${key} 와 같다`, () => {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(`2-2|피타고라스 정리|${type}`, seed);
        expect(firstNumber(p.answer)).toBe(p.facts[key]);
      }
    });
  }

  it("08 — 답의 목록이 (lo,hi) 구간의 자연수 전부와 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|08", seed);
      const want: number[] = [];
      for (let x = p.facts.lo! + 1; x < p.facts.hi!; x += 1) want.push(x);
      expect(allNumbers(p.answer)).toEqual(want);
    }
  });

  it("09 — 답(CD)이 ab/c 와 교차곱으로 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|09", seed);
      const [n, d] = fracOf(p.answer);
      expect(n * p.facts.c!).toBe(d * p.facts.a! * p.facts.b!);
    }
  });

  it("10 — 답(BD)이 a²/c 와 교차곱으로 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|10", seed);
      const [n, d] = fracOf(p.answer);
      expect(n * p.facts.c!).toBe(d * p.facts.a! * p.facts.a!);
    }
  });

  it("11 — 답(PD)이 facts.pd 와 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|11", seed);
      expect(firstNumber(p.answer)).toBe(p.facts.pd);
    }
  });

  it("12 — 답(DA)이 facts.da 와 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|12", seed);
      expect(firstNumber(p.answer)).toBe(p.facts.da);
    }
  });

  it("13 — 답의 π 계수가 num/8 과 교차곱으로 같다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem("2-2|피타고라스 정리|13", seed);
      const [n, d] = piCoefOf(p.answer);
      expect(n * 8).toBe(d * p.facts.num!);
    }
  });
});
