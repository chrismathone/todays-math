/**
 * 중1 물결 3A-유형 **그림 붙은 열셋**(`m1StatFig.ts`) — 독립 검산 + **물결 2D 계약**.
 *
 * ## 계약이 지키는 것: 그림과 발문이 **같은 수**를 말한다
 * 그림 따로 발문 따로면 「그럴듯한 오답 그림」이 된다 — 학생은 그림을 읽어 푸는데
 * 그 그림이 발문과 다른 자료를 그리고 있으면 답이 없다. 그래서
 *
 *  ⑴ `facts` 에 남긴 계급(`lo`·`w`·`n`)·도수(`f0..`)로 `figureSpec.classes`·`values` 를
 *     **다시 만들어** 대조하고,
 *  ⑵ 그 `figureSpec` 을 **실제 엔진에 태워** 그려 본다(모킹하지 않는다 — 없는 축은
 *     변이시킬 수 없다, CLAUDE.md 2026-08-19),
 *  ⑶ 답은 `facts` 에서 **다른 식으로** 다시 셈해 맞춘다.
 *
 * ⑵ 는 엔진(Python)이 있는 컴퓨터에서만 돈다. **그래서 ⑴·⑶ 을 따로 둔다** —
 * 엔진이 없는 곳에서 조용히 아무것도 안 세는 시험이 되면 안 된다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M1_STAT_FIG } from "../../lib/middle/m1StatFig";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import type { MidProblem } from "../../lib/middle/types";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31337, 5150, 60613];

type F = Record<string, number>;
type Spec = Record<string, unknown>;

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);

/** `facts` 에 낱개로 실린 배열을 되꺼낸다. */
function unpack(f: F, prefix: string, n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const v = f[`${prefix}${i}`];
    if (v === undefined) throw new Error(`facts.${prefix}${i} 가 없습니다`);
    return v;
  });
}

/** 그림 유형별 독립 검산 — 발문이 말하는 조건을 여기서 다시 세운다. */
const VERIFY: Record<string, (f: F) => boolean> = {
  // 01 줄기와 잎 — 변량을 되꺼내 갈래별로 다시 센다.
  "01": (f) => {
    const v = unpack(f, "v", f.m!);
    if (v.length !== f.m!) return false;
    if (![...v].sort((a, b) => a - b).every((x, i) => x === v[i])) return false;
    if (f.branch === 0) return f.ans! === v.length;
    if (f.branch === 1) return f.ans! === v[v.length - f.k!];
    return f.ans! === v.filter((x) => x >= f.cut!).length;
  },
  // 04 히스토그램 읽기 — 계급의 크기 · 총합 · 구간 합.
  "04": (f) => {
    const v = unpack(f, "f", f.n!);
    if (sum(v) !== f.total!) return false;
    if (f.branch === 0) return f.ans! === f.w!;
    if (f.branch === 1) return f.ans! === sum(v.slice(f.j!));
    return f.ans! === Math.max(...v);
  },
  // 05 직사각형의 넓이 — 넓이 = 계급의 크기 × 도수.
  "05": (f) => {
    const v = unpack(f, "f", f.n!);
    if (sum(v) !== f.total!) return false;
    if (f.branch === 0) return f.ans! === f.w! * f.total!;
    if (f.branch === 1) return f.ans! === f.w! * Math.max(...v);
    return f.ans! * Math.min(...v) === Math.max(...v);
  },
  // 06 찢긴 히스토그램 — 총합 − 보이는 합. 갈래 1 은 백분율로 총합을 먼저 얻는다.
  "06": (f) => {
    const v = unpack(f, "f", f.n!);
    if (sum(v) !== f.total!) return false;
    if (f.ans! !== v[f.h!]) return false;
    if (f.branch === 1) {
      if (f.j! <= f.h!) return false;
      if (sum(v.slice(f.j!)) !== f.cnt!) return false;
      return 100 * f.cnt! === f.p! * f.total!;
    }
    return true;
  },
  // 07 도수분포다각형 읽기.
  "07": (f) => {
    const v = unpack(f, "f", f.n!);
    if (sum(v) !== f.total!) return false;
    if (f.branch === 0) return f.ans! === f.n!;
    if (f.branch === 1) return f.ans! === f.total!;
    return f.ans! === sum(v.slice(f.j!));
  },
  // 08 넓이 — 「꺾은선 아래 넓이 = 직사각형 넓이의 합」이 교과서의 근거다.
  "08": (f) => {
    const v = unpack(f, "f", f.n!);
    if (sum(v) !== f.total!) return false;
    if (f.area! !== f.w! * f.total!) return false;
    return f.branch === 0 ? f.ans! === f.area! : f.ans! === f.total!;
  },
  // 10 두 다각형 비교 — 두 계열을 따로 되꺼내 견준다.
  "10": (f) => {
    const a = unpack(f, "f", f.n!);
    const b = unpack(f, "g", f.n!);
    if (sum(a) !== f.total! || sum(b) !== f.totalB!) return false;
    if (f.branch === 0) return f.ans! === a[f.i!]! - b[f.i!]! && f.ans! > 0;
    if (f.branch === 1) return f.ans! === sum(a);
    return f.ans! === sum(a.slice(f.j!)) - sum(b.slice(f.j!)) && f.ans! > 0;
  },
  // 12 상대도수 구하기 — 도수/총합. `p` 는 백분율 정수라 나눗셈 없이 본다.
  "12": (f) => {
    const v = unpack(f, "f", f.n!);
    const p = unpack(f, "p", f.n!);
    if (sum(v) !== f.total!) return false;
    if (sum(p) !== 100) return false;
    if (!v.every((x, i) => 100 * x === p[i]! * f.total!)) return false;
    const i = f.branch === 1 ? v.indexOf(Math.max(...v)) : f.i!;
    return Math.round(f.ans! * 100) === p[i]!;
  },
  // 13 상대도수의 분포표 — $A$ 가 도수·상대도수·총합 중 무엇이든 관계식은 하나다.
  "13": (f) => {
    const v = unpack(f, "f", f.n!);
    const p = unpack(f, "p", f.n!);
    if (sum(v) !== f.total! || sum(p) !== 100) return false;
    if (!v.every((x, i) => 100 * x === p[i]! * f.total!)) return false;
    if (f.branch === 0) return f.ans! === v[f.i!];
    if (f.branch === 1) return Math.round(f.ans! * 100) === p[f.i!];
    return f.ans! === f.total!;
  },
  // 14 찢긴 상대도수의 분포표 — 두 행이 같은 총합을 가리켜야 한다.
  "14": (f) =>
    100 * f.d1! === f.p1! * f.total! &&
    100 * f.d2! === f.p2! * f.total! &&
    f.ans! === f.d2! &&
    f.p1! !== f.p2!,
  // 17 상대도수의 분포 그래프 — 상대도수 합이 $100\%$.
  "17": (f) => {
    const p = unpack(f, "f", f.n!);
    if (sum(p) !== 100) return false;
    if (f.branch === 0) return 100 * f.ans! === p[f.i!]! * f.total!;
    return f.ans! === sum(p.slice(f.j!));
  },
  // 18 찢긴 상대도수 그래프 — 안 보이는 것은 $1$ 에서 나머지를 뺀 값.
  "18": (f) => {
    const p = unpack(f, "f", f.n!);
    if (sum(p) !== 100) return false;
    const hid = 100 - (sum(p) - p[f.h!]!);
    if (hid !== p[f.h!]) return false;
    if (f.branch === 0) return Math.round(f.ans! * 100) === p[f.h!];
    return 100 * f.ans! === p[f.h!]! * f.total!;
  },
  // 19 총합이 다른 두 집단 — 상대도수는 같아도 사람 수는 다르다.
  "19": (f) => {
    const a = unpack(f, "f", f.n!);
    const b = unpack(f, "g", f.n!);
    if (sum(a) !== 100 || sum(b) !== 100) return false;
    if (f.total! === f.totalB!) return false;
    const ca = (f.total! * a[f.i!]!) / 100;
    const cb = (f.totalB! * b[f.i!]!) / 100;
    return f.branch === 0 ? f.ans! === ca : f.ans! === ca - cb && f.ans! > 0;
  },
};

/** 그림이 발문과 같은 수를 말하는가 — 유형마다 `figureSpec` 에서 무엇을 볼지. */
const FIGURE_CHECK: Record<string, (f: F, spec: Spec) => void> = {
  "01": (f, spec) => {
    expect(spec.kind).toBe("table");
    expect(spec.align).toEqual(["center", "left"]);
    // 표의 줄기·잎을 **되읽어 변량을 복원**하고 facts 와 대조한다.
    const rows = spec.rows as string[][];
    const back: number[] = [];
    for (const [stem, leaf] of rows) {
      for (const d of leaf!.trim().split(/\s+/)) {
        back.push(Number(stem) * 10 + Number(d));
      }
    }
    expect(back.sort((a, b) => a - b)).toEqual(unpack(f, "v", f.m!));
  },
  "14": (f, spec) => {
    expect(spec.kind).toBe("table");
    const rows = spec.rows as string[][];
    expect(rows).toHaveLength(2);
    expect(Number(rows[0]![1])).toBe(f.d1!);
    // 찢긴 칸은 **비어 있어야** 한다 — 값이 보이면 문항이 성립하지 않는다.
    expect(rows[1]![1]).toBe("");
    expect(Number(rows[0]![2])).toBeCloseTo(f.p1! / 100, 10);
    expect(Number(rows[1]![2])).toBeCloseTo(f.p2! / 100, 10);
  },
};

/**
 * 그래프(히스토그램·다각형) 공통 대조 — 계급과 도수가 facts 와 같은가.
 *
 * `facts` 는 상대도수도 **백분율 정수**로 담는다(`f0..`). 그림에는 $100$ 으로
 * 나눈 소수가 실리므로 `scale` 로 되돌려 견준다.
 */
function checkGraph(f: F, spec: Spec, scale: number): void {
  const n = f.n!;
  const want = unpack(f, "f", n);
  expect(spec.classes).toEqual(
    Array.from({ length: n + 1 }, (_, i) => f.lo! + i * f.w!),
  );
  const got = spec.values as number[];
  expect(got).toHaveLength(n);
  got.forEach((v, i) => {
    expect(v * scale).toBeCloseTo(want[i]!, 10);
  });
}

describe("중1 3A — 그림이 붙은 통계 열셋", () => {
  it("자기 모듈만 훑는다 — 등록된 열셋과 번호가 맞다", () => {
    expect(M1_STAT_FIG.map((e) => e.rpmType)).toEqual([
      "01",
      "04",
      "05",
      "06",
      "07",
      "08",
      "10",
      "12",
      "13",
      "14",
      "17",
      "18",
      "19",
    ]);
    expect(new Set(M1_STAT_FIG.map((e) => e.rpmMinor))).toEqual(
      new Set(["도수분포표와 상대도수"]),
    );
  });

  it("09 는 보류다 — 엔진이 꺾은선의 찢김을 못 그린다", () => {
    // `hidden` 은 histogram 전용이다(09 §4-24). 막대를 안 그리는 것으로는
    // 「안 보인다」와 「도수 $0$」을 못 가르므로 찢긴 물결이 유일한 표시다.
    // 그 표시가 꺾은선에 생기는 날 이 검사가 빨개지고, 그때 09 를 낸다.
    expect(M1_STAT_FIG.some((e) => e.rpmType === "09")).toBe(false);
  });

  it("얇았던 두 단원(히스토그램·도수분포다각형)을 연다", () => {
    // 물결 3 계획 §0-㉡ — DB 자격 문항 5·7건인데 엔진 유형이 **0** 이던 자리다.
    const bySec = (s: string) =>
      M1_STAT_FIG.filter((e) => e.unitSection === s).length;
    expect(bySec("히스토그램")).toBe(3);
    expect(bySec("도수분포다각형")).toBe(3);
    expect(bySec("줄기와 잎 그림")).toBe(1);
    expect(bySec("상대도수")).toBe(6);
  });

  it("우리 단원 이름이 교육과정 시드(정본)에 실제로 있다", () => {
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_STAT_FIG) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  for (const e of M1_STAT_FIG) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.rpmType];
        expect(verify, `검산식 누락: ${e.rpmType}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed}: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("그림이 발문과 **같은 수**를 말한다 (물결 2D 계약)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const spec = p.figureSpec as Spec | null;
          expect(spec, `${e.key} 에 그림이 없다`).not.toBeNull();
          const special = FIGURE_CHECK[e.rpmType];
          if (special) {
            special(p.facts, spec!);
            continue;
          }
          if (spec!.kind === "table") {
            // 표는 각 행의 도수 칸이 facts 와 같아야 한다.
            const rows = spec!.rows as string[][];
            const v = unpack(p.facts, "f", p.facts.n!);
            v.forEach((x, i) => {
              const cell = rows[i]![1]!;
              if (cell !== "A") expect(Number(cell)).toBe(x);
            });
            expect(rows).toHaveLength(v.length + 1);
            continue;
          }
          const rel = spec!.yLabel === "(상대도수)";
          checkGraph(p.facts, spec!, rel ? 100 : 1);
          if (spec!.total !== undefined && !rel) {
            expect(spec!.total).toBe(p.facts.total);
          }
          if (spec!.hidden !== undefined) {
            expect(spec!.hidden).toEqual([p.facts.h]);
            // 찢긴 계급은 **안쪽**이어야 한다 — 양 끝을 가리면 읽을 것이 준다.
            expect(p.facts.h!).toBeGreaterThan(0);
            expect(p.facts.h!).toBeLessThan(p.facts.n! - 1);
          }
          if (spec!.series2 !== undefined) {
            const s2 = spec!.series2 as { values: number[]; label: string };
            const g = unpack(p.facts, "g", p.facts.n!);
            s2.values.forEach((v, i) => {
              expect(v * (rel ? 100 : 1)).toBeCloseTo(g[i]!, 10);
            });
            expect(spec!.label).toBeTruthy();
            expect(s2.label).toBeTruthy();
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.answer), p.answer).toEqual([]);
          expect(bareNumbers(p.solution), p.solution).toEqual([]);
        }
      });

      it("제품 전처리가 내 수식의 수를 바꾸지 않는다", () => {
        // 「정수 가분수 → 대분수」가 지면의 수를 고쳐 쓴다(2026-08-23, m1Stat 참조).
        const digits = (s: string) =>
          (s.match(/\$[^$]*\$/g) ?? []).join(" ").match(/\d+/g)?.join(",") ??
          "";
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const field of [p.content, p.answer, p.solution]) {
            expect(digits(preprocessMathText(field)), field).toBe(
              digits(field),
            );
          }
        }
      });
    });
  }

  it("상대도수가 한 계급에 쏠리지 않는다 (한 계급 ≤ 50%)", () => {
    // 변이 시험이 찾아 준 **없던 가드**다. 한 계급이 $75\%$ 를 먹으면 나머지 계급이
    // 지면에서 안 읽히는데(실렌더로 봤다), 상한을 없애도 시험이 전부 초록이었다 —
    // 「눈으로 보고 정한 규칙」이 코드에만 있고 아무도 안 지키고 있었다.
    const REL = ["12", "13", "17", "18", "19"];
    let checked = 0;
    for (const e of M1_STAT_FIG.filter((x) => REL.includes(x.rpmType))) {
      for (let s = 0; s < 120; s += 1) {
        const f = generateMiddleProblem(e.key, s * 7919 + 13).facts as F;
        // 12·13 은 백분율을 `p`, 17~19 는 `f`(+`g`) 에 담는다.
        for (const prefix of ["p", "f", "g"]) {
          if (f[`${prefix}0`] === undefined) continue;
          const arr = unpack(f, prefix, f.n!);
          if (sum(arr) !== 100) continue; // 도수 배열은 합이 100 이 아니다
          checked += 1;
          expect(Math.max(...arr), `${e.key} seed ${s}`).toBeLessThanOrEqual(
            50,
          );
        }
      }
    }
    expect(
      checked,
      "아무 상대도수도 안 봤다면 이 검사는 장식이다",
    ).toBeGreaterThan(100);
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_STAT_FIG) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("씨앗을 넓게 훑어도 던지지 않는다 (attempt 소진 없음)", () => {
    for (const e of M1_STAT_FIG) {
      for (let s = 0; s < 200; s += 1) {
        expect(() => generateMiddleProblem(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("모든 갈래가 실제로 나온다 — 죽은 갈래가 없다", () => {
    const seen: Record<string, Set<number>> = {};
    for (const e of M1_STAT_FIG) {
      seen[e.rpmType] = new Set();
      for (let s = 0; s < 300; s += 1) {
        const f = generateMiddleProblem(e.key, s * 7919 + 13).facts as F;
        seen[e.rpmType]!.add((f.branch ?? 0) as number);
      }
    }
    expect(seen["01"]).toEqual(new Set([0, 1, 2]));
    expect(seen["04"]).toEqual(new Set([0, 1, 2]));
    expect(seen["05"]).toEqual(new Set([0, 1, 2]));
    expect(seen["06"]).toEqual(new Set([0, 1]));
    expect(seen["07"]).toEqual(new Set([0, 1, 2]));
    expect(seen["08"]).toEqual(new Set([0, 1]));
    expect(seen["10"]).toEqual(new Set([0, 1, 2]));
    expect(seen["12"]).toEqual(new Set([0, 1]));
    expect(seen["13"]).toEqual(new Set([0, 1, 2]));
    expect(seen["14"]).toEqual(new Set([0]));
    expect(seen["17"]).toEqual(new Set([0, 1]));
    expect(seen["18"]).toEqual(new Set([0, 1]));
    expect(seen["19"]).toEqual(new Set([0, 1]));
  });
});

describe.skipIf(!hasEngine)("중1 3A — 그림이 실제로 그려진다", () => {
  // 「스펙이 그럴듯하다」와 「엔진이 그린다」는 다른 질문이다. 계급을 하나 늘리면
  // 가로 눈금이 겹쳐 **던지는** 자리가 있고(09 §4-24), 그 경계는 코드를 읽어서가
  // 아니라 **돌려 봐야** 안다. 그래서 모킹하지 않고 실제로 태운다.
  for (const e of M1_STAT_FIG) {
    it(`${e.rpmType} ${e.rpmTitle}`, async () => {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const r = await renderFigureSpec(p.figureSpec!);
        expect(
          r.ok,
          `${e.key} seed ${seed}: ${r.ok ? "" : r.error} ${JSON.stringify(p.figureSpec)}`,
        ).toBe(true);
        if (r.ok) {
          // 지면 등급은 viewBox 폭 하나로 갈린다 — 그래프는 240 에 박혀 있어야 하고
          // 표는 240 을 넘으면 안 된다(§4-24 ㉠).
          const w = Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)?.[1] ?? NaN);
          expect(w).toBeLessThanOrEqual(240);
          if (p.figureSpec!.kind !== "table") expect(w).toBe(240);
        }
      }
    });
  }
});
