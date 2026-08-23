/**
 * linearGraph kind — 교과 좌표평면 일차함수 (elem-1, 물결 2C, 2026-08-23).
 *
 * 실제 엔진(render_spec.py → sanitize_svg)을 태운다. 모킹하지 않는다 —
 * 없는 축은 변이시킬 수 없다(CLAUDE.md 2026-08-19). 정본은 RPM 중학 2-1
 * 일차함수 단원 원본 지면(0891·0974·0882·0975)이고, 여기 불변식은 그 지면과
 * 계획서 §3(middle-engine-wave2-plan.md) 문법에서 왔다.
 *
 * 기대값은 **테스트에 적은 리터럴**이다 — 제품 상수를 읽으면 상수를 바꿀 때
 * 기대값이 따라가서 영원히 초록이다(09 §4-20-d). 다만 화면 px 리터럴은 layout
 * 상수에 묶이므로, 경계·등척 같은 핵심 불변식은 **그림 안 요소끼리** 견준다
 * (눈금 획의 위치 ↔ 직선 끝점) — 레이아웃이 바뀌어도 불변식은 불변이어야 한다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

type Line = { x1: number; y1: number; x2: number; y2: number; sw: number };

/** <line> 전부 — 좌표·굵기. 축(1)·눈금(0.9)·직선(1.9)·모눈이 다 잡힌다. */
function svgLines(svg: string): Line[] {
  return [
    ...svg.matchAll(
      /<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" stroke="[^"]*" stroke-width="([^"]+)"/g,
    ),
  ].map((m) => ({
    x1: Number(m[1]),
    y1: Number(m[2]),
    x2: Number(m[3]),
    y2: Number(m[4]),
    sw: Number(m[5]),
  }));
}

function len(l: Line): number {
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
}

/** 그래프 직선 — 축·눈금보다 굵은 것(실측 1.9). */
function graphLines(svg: string): Line[] {
  return svgLines(svg).filter((l) => l.sw > 1.5);
}

/** 정수 눈금 짧은 획 — 8px 미만의 짧은 <line>. */
function ticks(svg: string): Line[] {
  return svgLines(svg).filter((l) => len(l) < 8);
}

/** 화살촉 — <polygon fill=INK>. 축 둘이면 정확히 2개다. */
function arrowheads(svg: string): number {
  return [...svg.matchAll(/<polygon points="[^"]+" fill="#111111"\s*\/>/g)]
    .length;
}

/** 점선 안내선(4 3) — 절편이 아닌 marks 하나에 하나. */
function guides(svg: string): number {
  return [...svg.matchAll(/stroke-dasharray="4 3"/g)].length;
}

function texts(svg: string): string[] {
  return [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);
}

const POS = {
  version: "elem-1",
  kind: "linearGraph",
  lines: [{ slope: 2, yIntercept: -1, label: "y=2x-1" }],
  xRange: [-4, 4],
  yRange: [-4, 4],
  marks: [[1, 1]],
};

describe.skipIf(!hasEngine)("[linearGraph] 교과 문법", () => {
  it("축 화살촉 둘 · 원점 O · 축 라벨 x·y", async () => {
    const r = await renderFigureSpec(POS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(arrowheads(r.svg)).toBe(2);
    const t = texts(r.svg);
    expect(t).toContain("O");
    expect(t).toContain("x");
    expect(t).toContain("y");
  });

  it("정수 눈금 짧은 획 — 0 을 뺀 정수마다 하나 (span 8+8 → 16개)", async () => {
    const r = await renderFigureSpec(POS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(ticks(r.svg).length).toBe(16);
  });

  it("직선은 범위 경계까지 — 끝점의 y 가 맨 위·맨 아래 눈금 획의 y 와 같다", async () => {
    // y=2x-1, 범위 ±4: 보이는 토막은 (-1.5,-4)~(1.5,4) — 위·아래 경계에 닿는다.
    const r = await renderFigureSpec(POS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [line] = graphLines(r.svg);
    expect(line).toBeTruthy();
    const yTicks = ticks(r.svg).filter((t) => Math.abs(t.y1 - t.y2) < 0.01);
    const tickYs = yTicks.map((t) => t.y1);
    const topTick = Math.min(...tickYs); // y=+4 눈금
    const botTick = Math.max(...tickYs); // y=-4 눈금
    const ys = [line!.y1, line!.y2].sort((a, b) => a - b);
    expect(Math.abs(ys[0]! - topTick)).toBeLessThan(0.05);
    expect(Math.abs(ys[1]! - botTick)).toBeLessThan(0.05);
  });

  it("등척 — 기울기 2 직선의 화면 |dx/dy| 가 정확히 1/2 (09 §4-21)", async () => {
    const r = await renderFigureSpec(POS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [line] = graphLines(r.svg);
    const ratio = Math.abs((line!.x2 - line!.x1) / (line!.y2 - line!.y1));
    expect(ratio).toBeGreaterThan(0.49);
    expect(ratio).toBeLessThan(0.51);
  });

  it("marks(1,1) — 점선 안내선 하나 + 숫자 1 이 x·y 양쪽에", async () => {
    const r = await renderFigureSpec(POS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(guides(r.svg)).toBe(1);
    expect(texts(r.svg).filter((t) => t === "1").length).toBe(2);
  });

  it("식 라벨이 지면에 있다", async () => {
    const r = await renderFigureSpec(POS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(texts(r.svg)).toContain("y=2x-1");
  });

  it("절편 marks(0,6)·(2,0) — 안내선 없이 숫자만 (0974 문법)", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "linearGraph",
      lines: [{ slope: -3, yIntercept: 6 }],
      xRange: [-2, 4],
      yRange: [-2, 7],
      marks: [
        [0, 6],
        [2, 0],
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(guides(r.svg)).toBe(0);
    const t = texts(r.svg);
    expect(t).toContain("6");
    expect(t).toContain("2");
  });

  it("두 직선 교점 — 굵은 직선 둘, 교점 mark 는 두 직선 다 만족해야 통과", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "linearGraph",
      lines: [
        { slope: 1, yIntercept: 2, label: "y=x+2" },
        { slope: -2, yIntercept: 5, label: "y=-2x+5" },
      ],
      xRange: [-4, 5],
      yRange: [-3, 6],
      marks: [[1, 3]],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(graphLines(r.svg).length).toBe(2);
    expect(guides(r.svg)).toBe(1);
  });

  it("grid:true 면 모눈이 깔리고, 기본은 없다", async () => {
    const on = await renderFigureSpec({ ...POS, grid: true });
    const off = await renderFigureSpec(POS);
    expect(on.ok && off.ok).toBe(true);
    if (!on.ok || !off.ok) return;
    expect(on.svg).toContain("#c8d7e4");
    expect(off.svg).not.toContain("#c8d7e4");
  });

  it("같은 스펙이면 같은 SVG (결정적)", async () => {
    const a = await renderFigureSpec(POS);
    const b = await renderFigureSpec(POS);
    expect(a).toEqual(b);
  });
});

describe.skipIf(!hasEngine)("[linearGraph] 던지는 것 (D-70)", () => {
  it("marks 가 어느 직선 위에도 없으면 던진다 — 검산 겸용", async () => {
    const r = await renderFigureSpec({ ...POS, marks: [[2, 2]] }); // 2·2-1=3≠2
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("직선 위");
  });

  it("marks 는 정수만 — (1.5, 2) 는 던진다", async () => {
    const r = await renderFigureSpec({ ...POS, marks: [[1.5, 2]] });
    expect(r.ok).toBe(false);
  });

  it("기울기 극단 — 12 도, 0 도 던진다", async () => {
    for (const slope of [12, 0, 0.05]) {
      const r = await renderFigureSpec({
        ...POS,
        lines: [{ slope, yIntercept: -1 }],
        marks: [],
      });
      expect(r.ok, `slope ${slope}`).toBe(false);
    }
  });

  it("범위가 원점을 안 품으면 던진다", async () => {
    const r = await renderFigureSpec({ ...POS, xRange: [1, 9], marks: [] });
    expect(r.ok).toBe(false);
  });

  it("범위 폭 13칸은 던진다 (4~12칸)", async () => {
    const r = await renderFigureSpec({ ...POS, xRange: [-6, 7], marks: [] });
    expect(r.ok).toBe(false);
  });

  it("직선이 범위 구석만 스치면 던진다", async () => {
    const r = await renderFigureSpec({
      ...POS,
      lines: [{ slope: 1, yIntercept: 7.5 }],
      marks: [],
    });
    expect(r.ok).toBe(false);
  });

  it("직선이 범위 밖이면 던진다", async () => {
    const r = await renderFigureSpec({
      ...POS,
      lines: [{ slope: 1, yIntercept: 15 }],
      marks: [],
    });
    expect(r.ok).toBe(false);
  });

  it("같은 직선 둘 · 모르는 키 · 원점 mark 는 던진다", async () => {
    const dup = await renderFigureSpec({
      ...POS,
      lines: [
        { slope: 2, yIntercept: -1 },
        { slope: 2, yIntercept: -1 },
      ],
      marks: [],
    });
    expect(dup.ok).toBe(false);
    const unknown = await renderFigureSpec({
      ...POS,
      lines: [{ slope: 2, yIntercept: -1, color: "red" }],
      marks: [],
    });
    expect(unknown.ok).toBe(false);
    const origin = await renderFigureSpec({
      ...POS,
      lines: [{ slope: 2, yIntercept: 0 }],
      marks: [[0, 0]],
    });
    expect(origin.ok).toBe(false);
  });
});
