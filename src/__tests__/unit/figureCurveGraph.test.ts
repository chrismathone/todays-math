/**
 * curveGraph kind — 쌍곡선(반비례)·포물선(이차함수)·직선을 한 kind 로 (elem-1, 물결 4A, 2026-08-24).
 *
 * 실제 엔진(render_spec.py → sanitize_svg)을 태운다. 모킹하지 않는다 —
 * 없는 축은 변이시킬 수 없다(CLAUDE.md 2026-08-19). 정본은 RPM 원본 지면
 * (1-1 정비례와 반비례 1077 · 3-1 이차함수 0962·1070)이고, 여기 불변식은 그 지면과
 * 물결 4 브리프에서 왔다.
 *
 * ## 기대값이 어디서 오나
 *
 * 「몇 px 이 되나」류는 **테스트에 적은 리터럴**이다 — 제품 상수를 읽어 기대값을 만들면
 * 상수를 바꿔도 기대값이 따라가서 영원히 초록이다(09 §4-20-d).
 * 다만 «두 파일이 같은 수를 쓰나»를 볼 때는 **양쪽을 다 읽어 견줘야** 한다 —
 * 그건 동어반복이 아니라 그 자체가 확인할 것이다(`figureSvgFrame.ts` ↔ 파이썬).
 *
 * 배치 상수에 묶이는 불변식(등척·경계·점근선)은 **그림 안 요소끼리** 견준다
 * (눈금 획의 간격 ↔ 곡선 위 점) — 레이아웃이 바뀌어도 불변식은 불변이어야 한다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  FIGURE_SVG_COMPACT_VIEWBOX,
  FIGURE_SVG_MID_MAX_PX,
  FIGURE_SVG_MID_VIEWBOX,
  figureSvgSize,
} from "@/lib/figure/figureSvgFrame";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

/** 문항 본문 글자 크기(px). `printGeometry.ts` 의 `line` 20.3125 = 12.5 × 1.625. */
const BODY_TEXT_PX = 12.5;

type Pt = [number, number];

async function svgOf(spec: unknown): Promise<string> {
  const r = await renderFigureSpec(spec);
  if (!r.ok) throw new Error(`렌더 실패: ${r.error}`);
  return r.svg;
}

async function errorOf(spec: unknown): Promise<string> {
  const r = await renderFigureSpec(spec);
  if (r.ok) throw new Error("던져야 하는데 그렸다");
  return r.error;
}

function viewBoxWidth(svg: string): number {
  return Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
}

function fontSizes(svg: string): number[] {
  return [...svg.matchAll(/<text[^>]*font-size="([\d.]+)"/g)].map((m) =>
    Number(m[1]),
  );
}

/** 굵은 꺾은선 = 곡선. 안내선(0.9)과 갈린다. */
function curvePolylines(svg: string): Pt[][] {
  return [
    ...svg.matchAll(/<polyline points="([^"]+)"[^>]*stroke-width="([\d.]+)"/g),
  ]
    .filter((m) => Number(m[2]) > 1.5)
    .map((m) =>
      m[1]!
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number) as Pt),
    );
}

/** 안내선(점선 4 3) 꺾은선 — mark 하나에 하나. 가운데 꼭짓점이 곧 그 점이다. */
function guideCorners(svg: string): Pt[] {
  return [
    ...svg.matchAll(/<polyline points="([^"]+)"[^>]*stroke-dasharray="4 3"/g),
  ].map((m) => {
    const pts = m[1]!
      .trim()
      .split(/\s+/)
      .map((p) => p.split(",").map(Number) as Pt);
    return pts[1]!;
  });
}

type Line = { x1: number; y1: number; x2: number; y2: number; sw: number };

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

/** 정수 눈금 짧은 획 — 길이 8 미만. */
function ticks(svg: string): Line[] {
  return svgLines(svg).filter((l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1) < 8);
}

/** 한 칸이 몇 px 인가 — **그림이 스스로 말한다**(가로 눈금 획 사이 간격). */
function unitPx(svg: string): number {
  const xs = ticks(svg)
    .filter((l) => Math.abs(l.x1 - l.x2) < 0.01)
    .map((l) => l.x1)
    .sort((a, b) => a - b);
  const gaps = xs.slice(1).map((x, i) => x - xs[i]!);
  return Math.min(...gaps);
}

/** 두 축이 만나는 자리 — 가장 긴 가로선·세로선의 교점. */
function origin(svg: string): Pt {
  const ls = svgLines(svg).filter((l) => l.sw === 1);
  const h = ls.find((l) => Math.abs(l.y1 - l.y2) < 0.01)!;
  const v = ls.find((l) => Math.abs(l.x1 - l.x2) < 0.01)!;
  return [v.x1, h.y1];
}

function texts(svg: string): string[] {
  return [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);
}

function arrowheads(svg: string): number {
  return [...svg.matchAll(/<polygon points="[^"]+" fill="#111111"\s*\/>/g)]
    .length;
}

/** 점에서 꺾은선까지의 거리 — 곡선이 그 점을 지나는가. */
function distToPolyline(pt: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 1; i < poly.length; i += 1) {
    const [ax, ay] = poly[i - 1]!;
    const [bx, by] = poly[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(
      0,
      Math.min(1, ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / len2),
    );
    best = Math.min(
      best,
      Math.hypot(pt[0] - (ax + t * dx), pt[1] - (ay + t * dy)),
    );
  }
  return best;
}

const HYPERBOLA = {
  version: "elem-1",
  kind: "curveGraph",
  curves: [{ type: "inverse", k: 6, label: "y=6/x" }],
  xRange: [-6, 6],
  yRange: [-6, 6],
  marks: [[2, 3]],
};

const PARABOLA = {
  version: "elem-1",
  kind: "curveGraph",
  curves: [{ type: "quadratic", a: 1, p: 0, q: -2 }],
  xRange: [-4, 4],
  yRange: [-4, 6],
  marks: [[2, 2]],
};

describe.skipIf(!hasEngine)(
  "[curveGraph] 교과 문법 — 좌표평면은 한 벌이다",
  () => {
    it("축 화살촉 둘 · 원점 O · 축 라벨 x·y — linearGraph 와 같은 문법", async () => {
      const svg = await svgOf(HYPERBOLA);
      expect(arrowheads(svg)).toBe(2);
      const t = texts(svg);
      expect(t).toContain("O");
      expect(t).toContain("x");
      expect(t).toContain("y");
    });

    it("정수 눈금 짧은 획 — 0 을 뺀 정수마다 하나 (±6 두 축 → 24개)", async () => {
      expect(ticks(await svgOf(HYPERBOLA)).length).toBe(24);
    });

    it("등척 — 가로 칸과 세로 칸이 같은 px", async () => {
      const svg = await svgOf(HYPERBOLA);
      const ys = ticks(svg)
        .filter((l) => Math.abs(l.y1 - l.y2) < 0.01)
        .map((l) => l.y1)
        .sort((a, b) => a - b);
      const vGap = Math.min(...ys.slice(1).map((y, i) => y - ys[i]!));
      expect(vGap).toBeCloseTo(unitPx(svg), 6);
    });

    it("marks 안내선 하나 + 숫자가 x·y 양쪽에 (0891 문법)", async () => {
      const svg = await svgOf(HYPERBOLA);
      expect(guideCorners(svg).length).toBe(1);
      expect(texts(svg)).toContain("2");
      expect(texts(svg)).toContain("3");
    });

    it("**곡선이 실제로 그 점을 지난다** — 안내선 꼭짓점이 곡선 위에 있다", async () => {
      // 안내선은 `marks` 가, 곡선은 표본 훑기가 따로 만든다. 둘이 만나야 그림이 참이다.
      const svg = await svgOf(HYPERBOLA);
      const corner = guideCorners(svg)[0]!;
      const near = Math.min(
        ...curvePolylines(svg).map((p) => distToPolyline(corner, p)),
      );
      expect(near).toBeLessThan(0.6);
    });

    it("쌍곡선은 **두 가지**다 — 굵은 꺾은선 둘, 원점 양쪽에 하나씩", async () => {
      const svg = await svgOf(HYPERBOLA);
      const polys = curvePolylines(svg);
      expect(polys.length).toBe(2);
      const [ax] = origin(svg);
      const sides = polys.map((p) =>
        p.every(([x]) => x > ax) ? 1 : p.every(([x]) => x < ax) ? -1 : 0,
      );
      expect(sides.slice().sort()).toEqual([-1, 1]);
    });

    it("k>0 이면 1·3사분면, k<0 이면 2·4사분면", async () => {
      for (const [k, quadrant] of [
        [6, 1],
        [-6, -1],
      ] as const) {
        const svg = await svgOf({
          ...HYPERBOLA,
          curves: [{ type: "inverse", k }],
          marks: [],
        });
        const [ax, ay] = origin(svg);
        for (const poly of curvePolylines(svg)) {
          for (const [x, y] of poly) {
            // 화면은 y 가 아래로 자란다 — 그래프 사분면 부호는 (x-ax) 와 (ay-y) 다.
            expect(Math.sign((x - ax) * (ay - y))).toBe(quadrant);
          }
        }
      }
    });

    it("점근선에 안 닿는다 — 곡선의 모든 점이 두 축에서 0.5칸 이상 떨어져 있다", async () => {
      const svg = await svgOf(HYPERBOLA);
      const [ax, ay] = origin(svg);
      const u = unitPx(svg);
      for (const poly of curvePolylines(svg)) {
        for (const [x, y] of poly) {
          expect(Math.abs(x - ax) / u).toBeGreaterThanOrEqual(0.5 - 1e-6);
          expect(Math.abs(y - ay) / u).toBeGreaterThanOrEqual(0.5 - 1e-6);
        }
      }
    });

    it("범위 밖으로 안 샌다 — 곡선의 모든 점이 눈금 상자 안에 있다", async () => {
      for (const spec of [HYPERBOLA, PARABOLA]) {
        const svg = await svgOf(spec);
        const t = ticks(svg);
        const xs = t
          .filter((l) => Math.abs(l.x1 - l.x2) < 0.01)
          .map((l) => l.x1);
        const ys = t
          .filter((l) => Math.abs(l.y1 - l.y2) < 0.01)
          .map((l) => l.y1);
        const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
        const [top, bot] = [Math.min(...ys), Math.max(...ys)];
        for (const poly of curvePolylines(svg)) {
          for (const [x, y] of poly) {
            expect(x).toBeGreaterThanOrEqual(lo - 0.05);
            expect(x).toBeLessThanOrEqual(hi + 0.05);
            expect(y).toBeGreaterThanOrEqual(top - 0.05);
            expect(y).toBeLessThanOrEqual(bot + 0.05);
          }
        }
      }
    });

    it("포물선은 팔 하나 · 꼭짓점이 맨 아래(a>0)·맨 위(a<0)", async () => {
      const up = await svgOf(PARABOLA);
      expect(curvePolylines(up).length).toBe(1);
      const [ax, ay] = origin(up);
      const u = unitPx(up);
      const lowest = curvePolylines(up)[0]!.reduce((a, b) =>
        a[1] > b[1] ? a : b,
      );
      expect((lowest[0] - ax) / u).toBeCloseTo(0, 1); // p = 0
      expect((ay - lowest[1]) / u).toBeCloseTo(-2, 1); // q = -2

      const down = await svgOf({
        ...PARABOLA,
        curves: [{ type: "quadratic", a: -1, p: 1, q: 3 }],
        marks: [[2, 2]],
      });
      const dOrigin = origin(down);
      const dU = unitPx(down);
      const highest = curvePolylines(down)[0]!.reduce((a, b) =>
        a[1] < b[1] ? a : b,
      );
      expect((highest[0] - dOrigin[0]) / dU).toBeCloseTo(1, 1);
      expect((dOrigin[1] - highest[1]) / dU).toBeCloseTo(3, 1);
    });

    it("직선과 겹쳐 그린다 — 굵은 직선 하나 + 곡선 둘, 교점 mark 는 둘 다 만족", async () => {
      const svg = await svgOf({
        ...HYPERBOLA,
        curves: [{ type: "inverse", k: 6 }],
        lines: [{ slope: 1, yIntercept: 0 }],
        marks: [[-3, -2]],
      });
      expect(svgLines(svg).filter((l) => l.sw > 1.5).length).toBe(1);
      expect(curvePolylines(svg).length).toBe(2);
    });

    it("같은 스펙이면 같은 SVG (결정적)", async () => {
      expect(await svgOf(HYPERBOLA)).toBe(await svgOf(HYPERBOLA));
    });
  },
);

describe.skipIf(!hasEngine)("[curveGraph] 지면 폭을 박는다", () => {
  it("범위·곡선이 무엇이든 viewBox 폭이 **정확히 240** 이다", async () => {
    const specs = [
      HYPERBOLA,
      PARABOLA,
      {
        ...PARABOLA,
        xRange: [-2, 2],
        yRange: [-1, 4],
        marks: [[2, 4]],
        curves: [{ type: "quadratic", a: 1 }],
      },
      {
        ...HYPERBOLA,
        xRange: [-6, 6],
        yRange: [-6, 6],
        curves: [{ type: "inverse", k: 12 }],
        marks: [],
      },
      {
        ...PARABOLA,
        xRange: [-5, 5],
        yRange: [-9, 3],
        curves: [{ type: "quadratic", a: 1, q: -9 }],
        marks: [[3, 0]],
      },
    ];
    for (const spec of specs) {
      expect(viewBoxWidth(await svgOf(spec)), JSON.stringify(spec.xRange)).toBe(
        240,
      );
    }
  });

  it("linearGraph 도 **같은 폭**이다 — 두 kind 가 한 시험지에 나란히 실린다", async () => {
    const line = await svgOf({
      version: "elem-1",
      kind: "linearGraph",
      lines: [{ slope: 1, yIntercept: 1 }],
      xRange: [-2, 2],
      yRange: [-2, 2],
      marks: [[1, 2]],
    });
    expect(viewBoxWidth(line)).toBe(viewBoxWidth(await svgOf(HYPERBOLA)));
  });

  it("글자 크기가 **한 값**이다 — 눈금 숫자와 식 라벨이 따로 놀지 않는다", async () => {
    const sizes = new Set([
      ...fontSizes(await svgOf(HYPERBOLA)),
      ...fontSizes(await svgOf(PARABOLA)),
      ...fontSizes(
        await svgOf({
          version: "elem-1",
          kind: "linearGraph",
          lines: [{ slope: 2, yIntercept: -1, label: "y=2x-1" }],
          xRange: [-4, 4],
          yRange: [-4, 4],
          marks: [[1, 1]],
        }),
      ),
    ]);
    expect([...sizes]).toEqual([13]);
  });

  it("그 폭이 지면에서 **mid 등급**이고, 그때 글자가 본문(12.5px) 이상이다", async () => {
    // 두 파일이 같은 수를 쓰는지 보는 자리다 — 그래서 양쪽을 다 읽는다.
    // 한쪽만 고치면 여기가 빨개진다(파이썬 `CP_VIEWBOX`·`CP_FONT` ↔ figureSvgFrame.ts).
    const svg = await svgOf(HYPERBOLA);
    const w = viewBoxWidth(svg);
    expect(figureSvgSize(svg)).toBe("mid");
    expect(w).toBeGreaterThan(FIGURE_SVG_COMPACT_VIEWBOX);
    expect(w).toBeLessThanOrEqual(FIGURE_SVG_MID_VIEWBOX);
    const onPaper = (fontSizes(svg)[0]! * FIGURE_SVG_MID_MAX_PX) / w;
    expect(onPaper).toBeGreaterThanOrEqual(BODY_TEXT_PX);
  });
});

describe.skipIf(!hasEngine)(
  "[curveGraph] 던지는 것 (D-70) — 그림이 곧 검산이다",
  () => {
    it("marks 가 어느 그래프 위에도 없으면 던진다", async () => {
      expect(await errorOf({ ...HYPERBOLA, marks: [[2, 4]] })).toContain(
        "그래프 위",
      );
    });

    it("허용치를 못 박는다 — 1e-6 어긋난 점은 던지고, 유리수 격자점은 통과한다", async () => {
      // ⑴ a 를 1e-6 만큼 흔들면 (1,1) 은 곡선 위가 아니다. 허용치가 헐거우면 통과한다.
      const base = {
        version: "elem-1",
        kind: "curveGraph",
        xRange: [-4, 4],
        yRange: [-2, 8],
      };
      expect(
        await errorOf({
          ...base,
          curves: [{ type: "quadratic", a: 0.999999 }],
          marks: [[1, 1]],
        }),
      ).toContain("그래프 위");
      // ⑵ 그런데 1/3 처럼 딱 안 떨어지는 계수의 격자점은 통과해야 한다 — 허용치가
      //    부동소수 반올림(~1e-15)보다는 넉넉해야 한다는 뜻이다.
      await svgOf({
        ...base,
        curves: [{ type: "quadratic", a: 1 / 3 }],
        marks: [[3, 3]],
      });
      await svgOf({
        ...base,
        curves: [{ type: "quadratic", a: 1 }],
        marks: [[1, 1]],
      });
    });

    it("marks 는 정수만 — (1.5, 2.25) 는 던진다", async () => {
      await errorOf({
        version: "elem-1",
        kind: "curveGraph",
        curves: [{ type: "quadratic", a: 1 }],
        xRange: [-4, 4],
        yRange: [-2, 8],
        marks: [[1.5, 2.25]],
      });
    });

    it("쌍곡선이 한 가지만 보이면 던진다 — 한 가지는 반비례가 아니다", async () => {
      // 범위가 3사분면 가지를 통째로 안 담는다(x ≤ -6 이 있어야 하는데 xlo = -1).
      // 「토막이 짧다」와 갈리는 자리다 — 아래 검사가 그 짝이다.
      const err = await errorOf({
        ...HYPERBOLA,
        curves: [{ type: "inverse", k: 6 }],
        xRange: [-1, 11],
        yRange: [-1, 11],
        marks: [],
      });
      expect(err).toContain("두 가지로 안 보입니다");
    });

    it("가지가 실오라기면 던진다 — 곡선이 아니라 흠집으로 보인다", async () => {
      const err = await errorOf({
        ...HYPERBOLA,
        curves: [{ type: "inverse", k: 30 }],
        marks: [],
      });
      expect(err).toContain("칸밖에 안 보입니다");
    });

    it("쌍곡선이 좌표축에 붙으면 던진다 — 점근선에 닿은 것처럼 보인다", async () => {
      const err = await errorOf({
        ...HYPERBOLA,
        curves: [{ type: "inverse", k: 1 }],
        marks: [],
      });
      expect(err).toContain("점근선");
    });

    it("포물선의 꼭짓점이 범위 밖이면 던진다", async () => {
      const err = await errorOf({
        ...PARABOLA,
        curves: [{ type: "quadratic", a: 1, q: -18 }],
        marks: [],
      });
      expect(err).toContain("꼭짓점");
    });

    it("포물선이 범위 안에서 거의 안 휘면 던진다 — 직선과 구별이 안 된다", async () => {
      const err = await errorOf({
        version: "elem-1",
        kind: "curveGraph",
        curves: [{ type: "quadratic", a: 0.125 }],
        xRange: [-2, 2],
        yRange: [-2, 2],
      });
      expect(err).toContain("휩니다");
    });

    it("k=0 · 모르는 type · 모르는 키 · 같은 곡선 둘 · curves 없음은 던진다", async () => {
      const base = {
        version: "elem-1",
        kind: "curveGraph",
        xRange: [-4, 4],
        yRange: [-4, 4],
      };
      await errorOf({ ...base, curves: [{ type: "inverse", k: 0 }] });
      await errorOf({ ...base, curves: [{ type: "cubic", a: 1 }] });
      await errorOf({ ...base, curves: [{ type: "quadratic", a: 1, b: 2 }] });
      await errorOf({
        ...base,
        curves: [
          { type: "quadratic", a: 1 },
          { type: "quadratic", a: 1 },
        ],
      });
      await errorOf({ ...base, curves: [] });
    });

    it("범위 규칙은 linearGraph 와 **한 벌**이다 — 원점 품기 · 4~12칸", async () => {
      const base = {
        version: "elem-1",
        kind: "curveGraph",
        curves: [{ type: "quadratic", a: 1 }],
        yRange: [-2, 8],
      };
      expect(await errorOf({ ...base, xRange: [1, 9] })).toContain("원점");
      expect(await errorOf({ ...base, xRange: [-6, 7] })).toContain("칸");
      expect(await errorOf({ ...base, xRange: [-1, 2] })).toContain("칸");
    });

    it("식 라벨이 그림보다 넓으면 던진다 — 잘린 라벨은 지면에서 티가 안 난다", async () => {
      const err = await errorOf({
        ...PARABOLA,
        curves: [{ type: "quadratic", a: 1, label: "가".repeat(20) }],
        marks: [],
      });
      expect(err).toContain("넓습니다");
    });
  },
);
