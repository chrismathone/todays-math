/**
 * 중등 생성기가 실은 FigureSpec 을 **제품 경로**가 실제로 그리는가.
 *
 * 적재기는 `render_spec.py` 를 직접 부른다. 제품은 `renderFigureSpec` 이
 * MathJax 로 조판한 상자로 배치한다. 「적재본이 있다」가 「제품이 그릴 수
 * 있다」가 아니다 — 2026-08-28 에 J30503-A09/A10 8건이 제품 경로에서
 * `dimension … has no collision-free layout` 으로 떨어졌다.
 *
 * ⚠️ **한 대표만 그리면 이 8건 같은 「특정 값에서만 실패」는 못 잡는다.**
 *    `figureLabelTypeset.test.ts` 가 종류마다 한 장만 그리고 `ok` 가 아니면
 *    건너뛴 것이 바로 그 구멍이다. 여기서는 값을 훑고, 실패는 건너뛰지 않는다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "@/lib/middle/generate";
import { fitPts } from "@/lib/middle/m3Trig";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

type XY = [number, number];
const DEG = Math.PI / 180;
const r2 = (v: number) => Math.round(v * 100) / 100;

function twoSidesSpec(
  ab: number,
  bc: number,
  angB: number,
): Record<string, unknown> {
  const k = 140 / Math.max(ab, bc);
  const pts = fitPts({
    B: [0, 0],
    C: [r2(bc * k), 0],
    A: [r2(ab * k * Math.cos(angB * DEG)), r2(ab * k * Math.sin(angB * DEG))],
  });
  return {
    version: 2,
    points: pts,
    segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
    angles: {
      a_B: { vertex: "B", points: ["A", "C"], label: `${angB}°` },
    },
    dimensions: {
      d_AB: { points: ["A", "B"], label: `${ab} cm`, side: "auto" },
      d_BC: { points: ["B", "C"], label: `${bc} cm`, side: "auto" },
    },
    labels: { A: "A", B: "B", C: "C" },
  };
}

function abPx(spec: Record<string, unknown>): number {
  const pts = spec.points as Record<string, XY>;
  const a = pts.A!;
  const b = pts.B!;
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

const KEY_08 = "3-2|삼각비의 활용|08";
const KEY_09 = "3-2|삼각비의 활용|09";
const KEY_10 = "3-2|삼각비의 활용|10";

/** 발문이 그림을 가리키는데 스펙이 없던 13유형 — 제품이 실제로 그려야 한다. */
const POINTER_KEYS = [
  "1-2|기본 도형|05",
  "1-2|기본 도형|07",
  "1-2|기본 도형|08",
  "1-2|기본 도형|09",
  "1-2|기본 도형|11",
  "1-2|위치 관계|14",
  "1-2|위치 관계|15",
  "1-2|위치 관계|16",
  "1-2|위치 관계|17",
  "1-2|위치 관계|20",
  "2-2|삼각형의 외심과 내심|10",
  "2-2|삼각형의 외심과 내심|11",
  "2-2|삼각형의 외심과 내심|13",
] as const;

/** 치수 둘을 다는 둔각 삼각형 — `figureLabelPlacement` 가 그리는 자리. */
const KNOWN_GOOD = {
  version: 2,
  points: { B: [96.03, 171.03], C: [192.03, 171.03], A: [16.03, 32.47] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  angles: { a_B: { vertex: "B", points: ["A", "C"], label: "120°" } },
  dimensions: {
    d_AB: { points: ["A", "B"], label: "10 cm", side: "auto" },
    d_BC: { points: ["B", "C"], label: "6 cm", side: "auto" },
  },
  labels: { A: "A", B: "B", C: "C" },
};

/** 적재 씨앗 + 기존 중등 시험 씨앗. 적재 씨앗을 빼면 이 8건이 구조적으로 0 이다. */
const SEEDS = [
  20260827, 20260826, 20260825, 20260823, 1, 7777, 424242, 99991, 31415,
];

describe.runIf(hasEngine)("중등 그림 — 생성기 스펙을 제품이 그린다", () => {
  it("양성 대조 — 엔진이 살아 있다 (아래 0건이 「못 그림」이 아님을 가른다)", async () => {
    const r = await renderFigureSpec(KNOWN_GOOD as never);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
  });

  it("활용 08·09·10 은 값까지 훑어 제품 경로로 그린다", async () => {
    const failed: string[] = [];
    const seen = new Set<string>();
    let drawn = 0;

    for (const seed of SEEDS) {
      for (let v = 0; v < 10; v += 1) {
        for (const key of [KEY_08, KEY_09, KEY_10]) {
          const p = generateMiddleProblem(key, seed, v);
          if (!p.figureSpec) {
            failed.push(`${key} s${seed} v${v}: figureSpec 없음`);
            continue;
          }
          const id = `${key}|${JSON.stringify(p.facts)}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const r = await renderFigureSpec(p.figureSpec as never);
          drawn += 1;
          if (!r.ok) {
            failed.push(
              `${key} s${seed} v${v} facts=${JSON.stringify(p.facts)}: ${r.error}`,
            );
          }
        }
      }
    }

    // 유형 10 표는 6행뿐이다. 08·09 는 각도·변·모드가 갈려 수십 종.
    // 분모가 작으면 「특정 값」을 안 밟은 초록이 된다.
    expect(drawn, "그린 스펙이 너무 적다 — 값을 안 훑었다").toBeGreaterThan(50);
    expect(failed, failed.join("\n")).toEqual([]);
  }, 180_000);

  it("활용 10 표 6행 전량이 그려진다 (한 씨앗의 일부만 보면 표가 샌다)", async () => {
    const set = generateMiddleSet(KEY_10, 20260827, 6);
    expect(set.length).toBe(6);
    const failed: string[] = [];
    for (const p of set) {
      const r = await renderFigureSpec(p.figureSpec as never);
      if (!r.ok) {
        failed.push(`${JSON.stringify(p.facts)}: ${r.error}`);
      }
    }
    expect(failed, failed.join("\n")).toEqual([]);
  }, 60_000);

  it("좁아서 치수를 못 놓으면 **그 치수만 빠지고 그림은 나온다** (원장님 확정 2026-08-29)", async () => {
    // 🔴 계약이 바뀌었다. 종전에는 치수 하나가 안 들어가면 **그림이 통째로 안 나왔다.**
    //    그러면 지면에 「그림과 같이…」만 남고 그림이 없다 — 치수 하나를 잃는 것보다
    //    훨씬 나쁘다. 원장님 지시: 「치수선이 들어갈 만한 공간이 없는 좁은 도형은
    //    억지로 치수선과 라벨을 입력하지 않도록 해.」
    //
    // 생성기의 `MIN_DIM_SIDE_PX` 를 **읽지 않는다.** 그 상수를 기대값으로 쓰면
    // 상수를 망가뜨려도 초록이다(CLAUDE.md 2026-08-18). 자리는 실측 두 값이다:
    //   5/16 @150° → AB 43px, 치수가 빠진다 · 12/16 @150° → AB 80px, 치수가 붙는다.
    //
    // ⚠️ 음성 대조가 **이 검사의 절반**이다. 「빠지는가」만 물으면 「늘 빠지는가」를
    //    구조적으로 못 본다 — 아래 `wide` 가 빈 `droppedDimensions` 를 요구한다.
    const narrow = twoSidesSpec(5, 16, 150);
    const wide = twoSidesSpec(12, 16, 150);
    expect(
      abPx(narrow),
      "5/16 @150° 가 43px 근처가 아니면 이 검사는 다른 자리를 본다",
    ).toBeCloseTo(43, 0);
    expect(
      abPx(wide),
      "12/16 @150° 가 80px 근처가 아니면 이 검사는 다른 자리를 본다",
    ).toBeCloseTo(80, 0);

    const thin = await renderFigureSpec(narrow);
    expect(thin.ok, thin.ok ? "" : thin.error).toBe(true);
    // 좁은 쪽은 **AB 치수만** 빠진다 — 나머지(d_BC)는 그대로 붙어야 한다.
    expect(thin.ok ? [...(thin.droppedDimensions ?? [])] : []).toEqual([
      "d_AB",
    ]);
    expect(thin.ok ? thin.svg : "").toContain("16 cm");

    const full = await renderFigureSpec(wide);
    expect(full.ok, full.ok ? "" : full.error).toBe(true);
    expect(
      full.ok ? [...(full.droppedDimensions ?? [])] : ["렌더 실패"],
      "넉넉한 도형에서도 치수가 빠지면 «늘 빠지는» 것이다",
    ).toEqual([]);
    expect(full.ok ? full.svg : "").toContain("12 cm");
  }, 30_000);

  it("그림 지시 13유형은 스펙을 싣고 제품 경로로 그린다", async () => {
    const failed: string[] = [];
    let drawn = 0;
    for (const seed of [20260827, 20260824, 7]) {
      for (const v of [0, 1, 2]) {
        for (const key of POINTER_KEYS) {
          const p = generateMiddleProblem(key, seed, v);
          if (!p.figureSpec) {
            failed.push(`${key} s${seed} v${v}: figureSpec 없음`);
            continue;
          }
          const r = await renderFigureSpec(p.figureSpec as never);
          drawn += 1;
          if (!r.ok) {
            failed.push(
              `${key} s${seed} v${v} facts=${JSON.stringify(p.facts)}: ${r.error}`,
            );
          }
        }
      }
    }
    expect(drawn, "그린 스펙이 너무 적다").toBeGreaterThan(50);
    expect(failed, failed.join("\n")).toEqual([]);
  }, 180_000);

  it("활용 10 은 그릴 수 없는 $\\overline{AD}$ 치수만 빼고 세 변은 싣는다", () => {
    const p = generateMiddleProblem(KEY_10, 20260827, 0);
    const spec = p.figureSpec as {
      dimensions?: Record<string, unknown>;
    };
    expect(Object.keys(spec.dimensions ?? {}).sort()).toEqual([
      "d_AB",
      "d_BC",
      "d_CD",
    ]);
  });
});
