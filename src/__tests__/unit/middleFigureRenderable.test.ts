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

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

type XY = [number, number];
const DEG = Math.PI / 180;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** 생성기 fitPts 와 같은 220×190 — 배율만 맞출 뿐 MIN_DIM_SIDE_PX 는 안 본다. */
function fitPts(pts: Record<string, XY>): Record<string, XY> {
  const xs = Object.values(pts).map((p) => p[0]);
  const ys = Object.values(pts).map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = 22;
  const s = Math.min(
    (220 - 2 * m) / Math.max(maxX - minX, 1e-9),
    (190 - 2 * m) / Math.max(maxY - minY, 1e-9),
  );
  const out: Record<string, XY> = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    out[k] = [r2(m + (x - minX) * s), r2(190 - m - (y - minY) * s)];
  }
  return out;
}

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

  it("실측 경계: AB 80px 는 던지고 83px 는 그린다 — 참은 렌더이지 제품 상수가 아니다", async () => {
    // 생성기의 MIN_DIM_SIDE_PX 를 **읽지 않는다.** 그 상수를 기대값으로 쓰면
    // 상수를 70 으로 망가뜨려도 초록이다(CLAUDE.md 2026-08-18).
    // 자리는 실측 두 값이다: 12/16 @150° → 80px 던짐, 8/13 @120° → 83px 그림.
    const failSpec = twoSidesSpec(12, 16, 150);
    const passSpec = twoSidesSpec(8, 13, 120);
    expect(
      abPx(failSpec),
      "12/16 @150° 가 80px 근처가 아니면 이 검사는 다른 자리를 본다",
    ).toBeCloseTo(80, 0);
    expect(
      abPx(passSpec),
      "8/13 @120° 가 83px 근처가 아니면 이 검사는 다른 자리를 본다",
    ).toBeCloseTo(83, 0);
    const fail = await renderFigureSpec(failSpec);
    const pass = await renderFigureSpec(passSpec);
    expect(
      fail.ok,
      fail.ok ? "80px 가 그려지면 문턱 85 는 장식이다" : fail.error,
    ).toBe(false);
    expect(fail.ok ? "" : fail.error).toMatch(/d_AB/);
    expect(pass.ok, pass.ok ? "" : pass.error).toBe(true);
  }, 30_000);

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
