/**
 * 원 계열 그림의 치수 — **발문이 말한 길이를 옮겨 단다** (원장님 확정 2026-08-25).
 *
 * > 「지름은 치수선이 너저분해지니까 빼고, 높이나 이런 너저분해지지않는 선에서 허용」
 *
 * 여기서 잠그는 넷:
 *  ① **지름에는 안 단다** — 원장님이 명시적으로 뺀 갈래.
 *  ② **답은 안 적는다** — 그림이 답을 말하면 문제가 성립하지 않는다(09 §2.2 ①).
 *  ③ **그린 길이와 적힌 값의 비가 같다** — 개형(비만 받는 빌더)에 길이를 적으면
 *     「길이 4 로 그려 놓고 8 cm 라 적는」 09 §4-21 의 그 결함이 된다.
 *     스스로 신고하지 않으므로 **재서** 잡는다.
 *  ④ **안 달기로 한 유형에는 하나도 안 붙는다** — 개형·현·등급이 뒤집히는 것들.
 *
 * ⚠️ 자를 제품에서 가져오지 않는다 — 좌표는 스펙에서 읽고 거리는 여기서 다시 잰다
 *    (CLAUDE.md 2026-08-18 「지표의 «참»이 제품에서 오면 안 된다」).
 */
import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";

const SEEDS = [20260826, 20260927, 1, 7777, 424242, 31337, 99991];
const VARIANTS = [0, 1];

/** 치수가 붙는 원 계열 유형. */
const DIMMED = [
  "3-2|원과 직선|01",
  "3-2|원과 직선|02",
  "3-2|원과 직선|07",
  "3-2|원과 직선|12",
  "3-2|원과 직선|13",
  "3-2|원과 직선|14",
  "3-2|원과 직선|16",
  "3-2|원주각의 활용|14",
] as const;

/**
 * 치수를 **안 다는** 유형과 까닭.
 *  - `09`·`10` — 그림이 **개형**(빌더가 각·비만 받는다). 적으면 그림이 값과 어긋난다.
 *  - `03`·`05`·`08`·`원주각 06` — 발문이 주는 것이 **현**이라 치수 곡선이 원둘레와
 *    부딪힌다(씨앗을 넓히면 던진다).
 *  - `11`·`15` — 달면 viewBox 폭이 160 을 넘어 **지면 등급이 뒤집힌다**(실측).
 */
const NO_DIMS = [
  "3-2|원과 직선|03",
  "3-2|원과 직선|05",
  "3-2|원과 직선|08",
  "3-2|원과 직선|09",
  "3-2|원과 직선|10",
  "3-2|원과 직선|11",
  "3-2|원과 직선|15",
  "3-2|원주각|06",
] as const;

type Spec = {
  points?: Record<string, [number, number] | Record<string, unknown>>;
  dimensions?: Record<string, { points: [string, string]; label: string }>;
};

function each(
  keys: readonly string[],
  run: (
    spec: Spec,
    problem: { content: string; answer: string },
    where: string,
  ) => void,
): void {
  for (const key of keys) {
    for (const seed of SEEDS) {
      for (const variant of VARIANTS) {
        const p = generateMiddleProblem(key, seed, variant);
        if (!p.figureSpec) continue;
        run(p.figureSpec as Spec, p, `${key} s${seed}v${variant}`);
      }
    }
  }
}

/** 스펙에서 좌표를 읽는다 — 배열 좌표만(`on_circle` 같은 구성점은 못 잰다). */
function xy(spec: Spec, name: string): [number, number] | null {
  const p = spec.points?.[name];
  return Array.isArray(p) && p.length === 2 ? [p[0], p[1]] : null;
}

/** 라벨에서 수 하나 — `12 cm` → 12, `(3+√3) cm` → null(못 재는 것은 안 센다). */
function labelValue(label: string): number | null {
  const bare = label.replace(/\s*(cm|m)$/, "").trim();
  return /^\d+(\.\d+)?$/.test(bare) ? Number(bare) : null;
}

const numbersOf = (s: string) => s.replace(/[^\d.]/g, "");

describe("원 계열 치수 — 발문이 말한 길이를 옮겨 단다", () => {
  it("치수가 실제로 붙는다 (이 시험이 빈 껍데기가 아니다)", () => {
    let dimmed = 0;
    each(DIMMED, (spec) => {
      if (Object.keys(spec.dimensions ?? {}).length > 0) dimmed += 1;
    });
    // 눈금 — 붙는 장이 없으면 아래 단언들은 아무것도 안 지킨다.
    expect(dimmed).toBeGreaterThan(50);
  });

  it("① 지름에는 치수를 안 단다", () => {
    const offenders: string[] = [];
    each(["3-2|원주각의 활용|14"], (spec, _p, where) => {
      // 이 유형의 지름은 `AB` 다(발문이 「$\overline{AB}$ 를 지름으로 하는 원」이라 한다).
      for (const dim of Object.values(spec.dimensions ?? {})) {
        const pair = [...dim.points].sort().join("");
        if (pair === "AB") offenders.push(`${where}: ${dim.label}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it("② 그림이 답을 말하지 않는다", () => {
    const offenders: string[] = [];
    each(DIMMED, (spec, p, where) => {
      for (const dim of Object.values(spec.dimensions ?? {})) {
        if (numbersOf(dim.label) === numbersOf(p.answer))
          offenders.push(`${where}: ${dim.label} = 답 ${p.answer}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it("③ 그린 길이의 비가 적힌 값의 비와 같다 (개형에 길이를 적지 않았다)", () => {
    const offenders: string[] = [];
    let compared = 0;
    each(DIMMED, (spec, _p, where) => {
      const dims = Object.values(spec.dimensions ?? {});
      const usable = dims
        .map((d) => ({
          v: labelValue(d.label),
          a: xy(spec, d.points[0]),
          b: xy(spec, d.points[1]),
        }))
        .filter((d) => d.v !== null && d.a && d.b)
        .map((d) => ({
          value: d.v as number,
          drawn: Math.hypot(d.a![0] - d.b![0], d.a![1] - d.b![1]),
        }));
      for (let i = 1; i < usable.length; i += 1) {
        compared += 1;
        const a = usable[0]!;
        const b = usable[i]!;
        const wanted = a.value / b.value;
        const got = a.drawn / b.drawn;
        // 1% — 좌표는 소수 둘째 자리까지 반올림돼 있다.
        if (Math.abs(got - wanted) > 0.01 * wanted)
          offenders.push(
            `${where}: 적힌 비 ${wanted.toFixed(3)} · 그린 비 ${got.toFixed(3)}`,
          );
      }
    });
    expect(compared).toBeGreaterThan(20); // 눈금 — 견줄 짝이 있어야 의미가 있다
    expect(offenders).toEqual([]);
  });

  it("④ 안 달기로 한 유형에는 하나도 안 붙는다", () => {
    const offenders: string[] = [];
    each(NO_DIMS, (spec, _p, where) => {
      if (Object.keys(spec.dimensions ?? {}).length > 0) offenders.push(where);
    });
    expect(offenders).toEqual([]);
  });
});
