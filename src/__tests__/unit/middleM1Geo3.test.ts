/**
 * 중1 「원과 부채꼴」 16유형(`m1Geo3.ts`) + 「도수분포다각형」 09 — 독립 검산.
 *
 * 원과 부채꼴은 FigureSpec v2(`regions`·`arcs`·`on_circle`)를 처음 쓰는 자리다.
 * 09(도수분포다각형)는 `freqPolygon` kind 가 `hidden` 을 못 받아(09-figure-engine-guide
 * 보류 목록) `table` 로 대체했다 — 그래서 렌더 검사도 `m1StatFig.test.ts` 처럼 별도로 둔다.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts` 로 유형마다 조건식을 **여기서 다시** 세운다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import {
  M1_GEO3,
  SECTOR01_CLAIMS,
  SECTOR07_CLAIMS,
} from "../../lib/middle/m1Geo3";
import type { MidProblem } from "../../lib/middle/types";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31337];

const CIRCLE = M1_GEO3.filter((e) => e.rpmMinor === "원과 부채꼴");
const STAT09 = M1_GEO3.find(
  (e) => e.rpmMinor === "도수분포표와 상대도수" && e.rpmType === "09",
)!;

type F = Record<string, number>;

function near(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
}

// ── 01·07 명제 은행 — 테스트가 «자기 표»로 같은 판정을 다시 세운다 ─────────
const SECTOR01_TRUTH: readonly boolean[] = [
  true, // 현
  true, // 호
  true, // 부채꼴
  true, // 활꼴
  true, // 지름이 가장 긴 현
  true, // 중심각 180 = 반원
  false, // 같은 중심각인데 호가 다를 수 있다 (거짓 — 같다)
  false, // 같은 현인데 중심각이 다를 수 있다 (거짓 — 같다)
  true, // 부채꼴=활꼴은 중심각 180 뿐
  false, // 중심각 2배면 현도 2배 (거짓 — 현은 정비례 아님)
  true, // 중심각 2배면 호도 2배 (참 — 정비례)
  true, // 지름은 중심을 지나는 현
];

const SECTOR07_TRUTH: readonly boolean[] = [
  true, // 호의 길이
  true, // 부채꼴의 넓이
  false, // 현의 길이
  false, // 삼각형 OAB의 넓이
  false, // 부채꼴의 둘레의 길이
  false, // 활꼴의 넓이
];

function vkey(e: { rpmType: string }): string {
  return e.rpmType;
}

/** 스펙 JSON 안의 모든 수가 유한한지. */
function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/** `spec.labels`·`spec.angles[].label` 의 숫자 라벨만 뽑는다. */
function numericLabels(spec: Record<string, unknown>): number[] {
  const out: number[] = [];
  const scanText = (text: string) => {
    const m = /^(-?\d+(?:\.\d+)?)(?:\s*(?:cm|m|°|x°))?$/.exec(text.trim());
    if (m && !/^x/.test(text.trim())) out.push(Number(m[1]));
  };
  const labels = (spec.labels ?? {}) as Record<string, unknown>;
  for (const value of Object.values(labels)) {
    if (typeof value === "string") scanText(value);
  }
  const angles = (spec.angles ?? {}) as Record<
    string,
    { label?: unknown } | undefined
  >;
  for (const a of Object.values(angles)) {
    if (a && typeof a.label === "string") scanText(a.label);
  }
  return out;
}

/** 유형별 독립 검산 — 발문이 말하는 성질을 여기서 다시 세운다. */
const VERIFY: Record<string, (f: F) => boolean> = {
  "01": (f) => {
    const idx = [f.i0!, f.i1!, f.i2!, f.i3!, f.i4!];
    if (new Set(idx).size !== 5) return false;
    if (idx.some((i) => i < 0 || i >= SECTOR01_TRUTH.length)) return false;
    const x = idx.filter((i) => SECTOR01_TRUTH[i]!).length;
    return x === f.x;
  },
  "02": (f) =>
    f.a! % 10 === 0 && f.x! % 10 === 0 && f.a! * f.L2! === f.x! * f.L1!,
  "03": (f) => {
    if (f.p! + f.q! + f.r! !== f.total) return false;
    const vals = [f.p!, f.q!, f.r!];
    const target = f.target!;
    if (target < 0 || target > 2) return false;
    const x = (360 * vals[target]!) / f.total!;
    return Number.isInteger(x) && x === f.x;
  },
  "04": (f) => f.c1! * f.x! + f.off1! === f.c2! * f.x! + f.off2! && f.x! > 0,
  "05": (f) =>
    f.a! % 10 === 0 && f.x! % 10 === 0 && f.a! * f.S2! === f.x! * f.S1!,
  "06": (f) =>
    f.branch === 0
      ? f.c1! * f.x! + f.off1! === f.c2! * f.x! + f.off2!
      : f.r! > 0,
  "07": (f) => {
    const idx = [f.i0!, f.i1!, f.i2!, f.i3!, f.i4!, f.i5!].filter(
      (i) => i !== -1,
    );
    if (idx.length !== f.n) return false;
    if (new Set(idx).size !== idx.length) return false;
    if (idx.some((i) => i < 0 || i >= SECTOR07_TRUTH.length)) return false;
    const x = idx.filter((i) => SECTOR07_TRUTH[i]!).length;
    return x === f.x;
  },
  "08": (f) => f.r! === 3 * f.k! && near(f.coef!, (2 * f.r!) / 3),
  "11": (f) =>
    near(f.arcCoef!, (f.r! * f.x!) / 180) &&
    near(f.areaCoef!, (f.r! * f.r! * f.x!) / 360),
  "12": (f) =>
    near(f.outerCoef!, (f.r2! * f.x!) / 180) &&
    near(f.innerCoef!, (f.r1! * f.x!) / 180) &&
    f.straight === 2 * (f.r2! - f.r1!) &&
    near(f.arcSum!, f.outerCoef! + f.innerCoef!),
  "13": (f) =>
    near(f.areaCoef!, ((f.r2! * f.r2! - f.r1! * f.r1!) * f.x!) / 360),
  // 아르벨로스 — 전개한 식(半π(r1+r2)²−半πr1²−半πr2²)이 πr1r2 로 줄어드는지
  // «다른 식»으로 재확인한다 (생성기는 곱셈 r1*r2 하나만 썼다).
  "14": (f) => {
    const expanded =
      0.5 * (f.r1! + f.r2!) ** 2 - 0.5 * f.r1! ** 2 - 0.5 * f.r2! ** 2;
    return near(expanded, f.areaCoef!) && f.areaCoef === f.r1! * f.r2!;
  },
  // 정사각형+렌즈 — 부채꼴 하나 넓이(¼πs²)를 2배 한 값과 정사각형 넓이를 따로 잰다.
  "15": (f) => {
    const quarter = (f.s! * f.s!) / 4;
    return near(f.half!, 2 * quarter) && f.sq === f.s! * f.s!;
  },
  "16": (f) => f.straight === 4 * f.r! * (f.n! - 1) && f.n! >= 2 && f.n! <= 4,
  // 직사각형 둘레를 도는 원 — 네 변의 개별 띠 넓이 합(2rp+2rq)으로 다시 잰다.
  "17": (f) =>
    f.linCoef === 2 * f.r! * f.p! + 2 * f.r! * f.q! && f.piCoef === f.r! * f.r!,
  "18": (f) =>
    (f.a! * f.theta!) % 180 === 0 && f.coef === (f.a! * f.theta!) / 180,
};

/** 그림이 있어야 하는 유형 — 나머지(01·07)는 명제 나열이라 그림이 없다. */
const FIGURE_KEYS = new Set([
  "02",
  "03",
  "04",
  "05",
  "06",
  "08",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
]);

describe("중1 「원과 부채꼴」 16유형 + 「도수분포다각형」 09 (RPM 1-2)", () => {
  it("계획된 16유형이 전부 등록돼 있다(09·10 제외)", () => {
    const want = ["01", "02", "03", "04", "05", "06", "07", "08"].concat([
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
    ]);
    expect(CIRCLE.map((e) => e.rpmType).sort()).toEqual([...want].sort());
    expect(CIRCLE.length).toBe(16);
  });

  it("09·10(원의 둘레·부채꼴 기본 공식)은 이미 등록돼 있어 겹치지 않는다", () => {
    const all = registeredTypes();
    const dup = all.filter(
      (e) =>
        e.rpmBook === "1-2" &&
        e.rpmMinor === "원과 부채꼴" &&
        e.rpmType === "09",
    );
    // m1Book2.ts 가 이미 «원의 둘레의 길이와 넓이」 09 를 냈다 — 우리 09 는 다른 minor.
    expect(dup.length).toBe(1);
    expect(dup[0]!.rpmTitle).toBe("원의 둘레의 길이와 넓이");
  });

  it("전체 색인 커버리지 — 원과 부채꼴 18/18 · 도수분포표와 상대도수 19/19", () => {
    const all = registeredTypes();
    const sector = all.filter(
      (e) => e.rpmBook === "1-2" && e.rpmMinor === "원과 부채꼴",
    );
    const freq = all.filter(
      (e) => e.rpmBook === "1-2" && e.rpmMinor === "도수분포표와 상대도수",
    );
    expect(sector.length).toBe(18);
    expect(freq.length).toBe(19);
  });

  it("RPM 색인의 실제 제목·section을 쓴다 (표본 대조)", () => {
    const byKey = new Map(CIRCLE.map((e) => [e.rpmType, e]));
    expect(byKey.get("01")!.rpmTitle).toBe("원과 부채꼴");
    expect(byKey.get("04")!.rpmTitle).toBe("보조선을 그어 호의 길이 구하기");
    expect(byKey.get("11")!.rpmTitle).toBe(
      "부채꼴에서 색칠한 부분의 둘레의 길이와 넓이",
    );
    expect(byKey.get("16")!.rpmTitle).toBe("끈의 길이");
    expect(byKey.get("18")!.rpmTitle).toBe("도형을 회전시켰을 때 움직인 거리");
    for (const t of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
      expect(byKey.get(t)!.unitSection).toBe("원과 부채꼴");
    }
    for (const t of ["11", "12", "13", "14", "15", "16", "17", "18"]) {
      expect(byKey.get(t)!.unitSection).toBe("부채꼴의 호의 길이와 넓이");
    }
    expect(STAT09.rpmTitle).toBe("일부가 보이지 않는 도수분포다각형");
    expect(STAT09.unitSection).toBe("도수분포다각형");
    expect(STAT09.rpmMinor).toBe("도수분포표와 상대도수");
  });

  it("명제 표는 모듈과 테스트가 따로 들고 같은 값이어야 한다", () => {
    expect(SECTOR01_CLAIMS.length).toBe(SECTOR01_TRUTH.length);
    SECTOR01_CLAIMS.forEach(([text, ok], i) => {
      expect(ok, `01-${i}: ${text}`).toBe(SECTOR01_TRUTH[i]);
    });
    expect(SECTOR07_CLAIMS.length).toBe(SECTOR07_TRUTH.length);
    SECTOR07_CLAIMS.forEach(([text, ok], i) => {
      expect(ok, `07-${i}: ${text}`).toBe(SECTOR07_TRUTH[i]);
    });
  });

  for (const e of CIRCLE) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[vkey(e)];
        expect(verify, `검산식 누락: ${vkey(e)}`).toBeDefined();
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
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.answer), p.answer).toEqual([]);
          expect(bareNumbers(p.solution), p.solution).toEqual([]);
        }
      });

      it("그림: 있어야 하는 유형에만 있고, 스펙의 수는 전부 유한하다", () => {
        const want = FIGURE_KEYS.has(vkey(e));
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          if (want) {
            expect(p.figureSpec, `${vkey(e)} 그림 누락`).toBeTruthy();
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec.version).toBe(2);
            expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
            expect(
              Object.keys(spec.segments as Record<string, unknown>).length,
              "선분이 없는 도형",
            ).toBeGreaterThan(0);
          } else {
            expect(
              p.figureSpec ?? null,
              `${vkey(e)} seed ${seed} 는 그림이 없어야 한다`,
            ).toBe(null);
          }
        }
      });

      it("그림의 숫자 라벨은 전부 facts 에 있는 값이다 (그림 따로 발문 따로 금지)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          if (!p.figureSpec) continue;
          const spec = p.figureSpec as Record<string, unknown>;
          const values = new Set(Object.values(p.facts));
          for (const n of numericLabels(spec)) {
            expect(
              values.has(n),
              `${vkey(e)} seed ${seed}: 그림 라벨 ${n} 이 facts 에 없다 (${JSON.stringify(p.facts)})`,
            ).toBe(true);
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of CIRCLE) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  // ── 09 「일부가 보이지 않는 도수분포다각형」 — table 대체(엔진 hidden 제약) ──
  describe("09 일부가 보이지 않는 도수분포다각형 (table 대체)", () => {
    it("같은 씨앗이면 같은 문항", () => {
      expect(generateMiddleProblem(STAT09.key, 20260823)).toEqual(
        generateMiddleProblem(STAT09.key, 20260823),
      );
    });

    it("씨앗별 독립 검산 — 넓이÷계급크기=총합, 보이는 도수 합의 나머지=숨은 도수", () => {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(STAT09.key, seed);
        const f = p.facts;
        const n = f.n!;
        const values = Array.from({ length: n }, (_, i) => f[`f${i}`]!);
        const total = values.reduce((s, v) => s + v, 0);
        expect(total, JSON.stringify(f)).toBe(f.total);
        expect(f.area).toBe(f.w! * total);
        expect(f.area! / f.w!).toBe(total);
        if (f.branch === 0) {
          const seen = total - values[f.h!]!;
          expect(f.ans).toBe(total - seen);
          expect(f.ans).toBe(values[f.h!]);
        } else {
          expect(f.ans).toBe(total);
        }
      }
    });

    it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(STAT09.key, seed);
        expect(bareNumbers(p.content), p.content).toEqual([]);
        expect(bareNumbers(p.answer), p.answer).toEqual([]);
        expect(bareNumbers(p.solution), p.solution).toEqual([]);
      }
    });

    it("그림은 table 이고, 찢긴 계급은 빈 문자열 하나뿐이다", () => {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(STAT09.key, seed);
        expect(p.figureSpec, "그림 누락").toBeTruthy();
        const spec = p.figureSpec as {
          version: string;
          kind: string;
          rows: string[][];
        };
        expect(spec.version).toBe("elem-1");
        expect(spec.kind).toBe("table");
        const blanks = spec.rows.filter((r) => r[1] === "");
        expect(blanks.length, JSON.stringify(spec.rows)).toBe(1);
      }
    });

    it("4문항을 뽑으면 발문이 전부 다르다", () => {
      const set = generateMiddleSet(STAT09.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size).toBe(4);
    });
  });
});

describe.skipIf(!hasEngine)(
  "중1 「원과 부채꼴」 — 그림이 실제로 그려진다",
  () => {
    // 「스펙이 그럴듯하다」와 「엔진이 그린다」는 다른 질문이다. `regions` 사슬이
    // 안 닫히거나 방향이 틀리면 엔진이 던지거나 이상한 도형을 낸다 — 실제로 태운다.
    for (const e of CIRCLE) {
      if (!FIGURE_KEYS.has(vkey(e))) continue;
      it(`${e.rpmType} ${e.rpmTitle}`, async () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const r = await renderFigureSpec(p.figureSpec!);
          expect(
            r.ok,
            `${e.key} seed ${seed}: ${r.ok ? "" : r.error} ${JSON.stringify(p.figureSpec)}`,
          ).toBe(true);
        }
      });
    }

    it("09 표는 엔진이 실제로 그린다", async () => {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(STAT09.key, seed);
        const r = await renderFigureSpec(p.figureSpec!);
        expect(r.ok, r.ok ? "" : r.error).toBe(true);
        if (r.ok) {
          const w = Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)?.[1] ?? NaN);
          expect(w).toBeLessThanOrEqual(240);
        }
      }
    });
  },
);
