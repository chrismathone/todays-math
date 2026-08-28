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
import { svgLabels } from "@/lib/figure/svgLabels";

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

/** 라벨 글 — 조판된 것(`<g data-label>`)과 그대로 나간 `<text>` 를 한 자로 읽는다. */
function texts(svg: string): string[] {
  return svgLabels(svg).map((l) => l.text);
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

  // ── 지면 폭 (물결 4A, 2026-08-24) ───────────────────────────────────
  //
  // 옛 구현은 폭이 범위·라벨에 따라 **126~238 로 떠다녔고**, 그래서 눈금 글자가
  // 지면에서 10.50px ~ 17.78px 이었다(실측). 그중 셋은 본문 12.5px 아래인데
  // 에러가 안 났다 — viewBox 폭 하나가 지면 등급을 가르기 때문이다.
  // 이제 `curveGraph` 와 **같은 폭**에 박혀 있다. 자세한 잠금은 figureCurveGraph.test.ts.
  it("**`O` 는 그래프가 지나는 사분면을 비킨다** — RPM 정본에서 배운 규칙", async () => {
    // 원장님 지시(2026-08-28): 「RPM 함수 파트를 보고 **선과 안 겹치게** 배치하는
    // 법을 학습해」. 실측(`measure-rpm-function-labels.py` · 원점 라벨 291개):
    // 고를 자리가 있을 때 **79.9%** 가 그래프가 안 지나는 사분면이고, 즐겨 쓰는
    // 순서는 왼아래 64.9% → 오른아래 14.4% 다.
    //
    // ⚠️ 자리를 좌표 리터럴로 박지 않는다 — 레이아웃 상수가 바뀌면 따라가야 한다.
    //    대신 **그림 안 요소끼리** 견준다: 원점(축 두 개의 교점) ↔ `O` 닻점,
    //    그리고 「직선이 `O` 상자를 지나는가」를 직접 잰다.
    const up = await renderFigureSpec({
      ...POS,
      lines: [{ slope: 1, yIntercept: 0 }],
      marks: [[2, 2]],
    });
    const down = await renderFigureSpec({
      ...POS,
      lines: [{ slope: -1, yIntercept: 0 }],
      marks: [[2, -2]],
    });
    expect(up.ok && down.ok).toBe(true);

    /** 축 두 개의 교점 — 굵기 1 인 긴 가로획·세로획. */
    function origin(svg: string): { x: number; y: number } {
      const axes = svgLines(svg).filter((l) => l.sw === 1 && len(l) > 80);
      const h = axes.find((l) => l.y1 === l.y2)!;
      const v = axes.find((l) => l.x1 === l.x2)!;
      return { x: v.x1, y: h.y1 };
    }
    function oLabel(svg: string) {
      const lab = svgLabels(svg).find((l) => l.text === "O")!;
      const half = 0.4 * lab.fontSize;
      return {
        x: lab.x,
        y: lab.y,
        box: [lab.x - half, lab.y - half, lab.x + half, lab.y + half] as const,
      };
    }
    /** 선분이 상자를 지나는가 — 촘촘히 훑는다(시험은 정확도보다 단순함). */
    function hits(l: Line, box: readonly number[]): boolean {
      for (let i = 0; i <= 600; i += 1) {
        const t = i / 600;
        const x = l.x1 + (l.x2 - l.x1) * t;
        const y = l.y1 + (l.y2 - l.y1) * t;
        if (x >= box[0]! && x <= box[2]! && y >= box[1]! && y <= box[3]!)
          return true;
      }
      return false;
    }

    for (const r of [up, down]) {
      const o = oLabel(r.svg!);
      for (const g of graphLines(r.svg!)) {
        expect(hits(g, o.box)).toBe(false);
      }
    }

    // 기울기가 양수면 왼아래(제3사분면)가 막힌다 → 오른쪽으로 간다.
    // 음수면 왼아래가 비니 정본 기본 자리에 남는다. **둘이 달라야** 한다 —
    // 한 자리에 못 박으면 이 줄이 빨개진다.
    const oUp = oLabel(up.svg!);
    const oDown = oLabel(down.svg!);
    expect(oUp.x - origin(up.svg!).x).toBeGreaterThan(0);
    expect(oDown.x - origin(down.svg!).x).toBeLessThan(0);
    // 둘 다 x축 **아래**다 (정본: 아래 두 사분면이 79.3%).
    expect(oUp.y - origin(up.svg!).y).toBeGreaterThan(0);
    expect(oDown.y - origin(down.svg!).y).toBeGreaterThan(0);
  });

  it("범위가 무엇이든 viewBox 폭이 240 이다 — 등급이 안 뒤집힌다", async () => {
    const cases = [
      { xRange: [-2, 2], yRange: [-2, 2], marks: [[1, 1]] },
      { xRange: [-4, 4], yRange: [-4, 4], marks: [[1, 1]] },
      { xRange: [-6, 6], yRange: [-6, 6], marks: [[1, 1]] },
      { xRange: [-1, 11], yRange: [-1, 11], marks: [[1, 1]] },
    ];
    for (const c of cases) {
      const r = await renderFigureSpec({
        ...POS,
        ...c,
        lines: [{ slope: 1, yIntercept: 0 }],
      });
      expect(r.ok, JSON.stringify(c.xRange)).toBe(true);
      if (!r.ok) continue;
      expect(
        Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)![1]),
        JSON.stringify(c.xRange),
      ).toBe(240);
    }
  });
});

describe.skipIf(!hasEngine)("[linearGraph] 던지는 것 (D-70)", () => {
  it("marks 가 어느 직선 위에도 없으면 던진다 — 검산 겸용", async () => {
    const r = await renderFigureSpec({ ...POS, marks: [[2, 2]] }); // 2·2-1=3≠2
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // 물결 4A 부터 이 판정은 `curveGraph` 와 **한 벌**이라 「그래프 위」로 말한다.
    expect(r.error).toContain("그래프 위");
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
