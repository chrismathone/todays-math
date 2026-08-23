/**
 * netCone kind — 원뿔의 전개도 (elem-1, 물결 4A, 2026-08-24).
 *
 * 실제 엔진(render_spec.py → sanitize_svg)을 태운다. 모킹하지 않는다.
 * 정본은 RPM 1-2 0887·0888(p133)·0801(p121) — 모양만 봤다.
 *
 * ## 그림이 곧 검산이다
 *
 * 전개도가 **접히는가**는 「호의 길이 == 밑면 원의 둘레」하나로 끝난다. 그래서
 * 여기서는 중심각을 스펙과 견주는 것으로 그치지 않고 **그린 SVG 에서 호와 원을
 * 재서** 견준다 — 좌표를 손으로 맞추면 그 성질이 조용히 깨지기 때문이다.
 * 기대값은 스펙의 r·l 에서 **손으로 계산한 식**(2πr)이고 제품 상수가 아니다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { figureSvgSize } from "@/lib/figure/figureSvgFrame";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

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

type Sector = {
  apex: [number, number];
  radius: number;
  /** 중심각(도) — 그린 좌표에서 되읽은 값이다. */
  deg: number;
  /** 호의 길이(화면 단위). */
  arc: number;
};

/** 부채꼴 — `M apex L p0 A R R 0 large 1 p1 Z`. 두 끝점에서 중심각을 되읽는다. */
function sector(svg: string): Sector {
  const m =
    /<path d="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+) A ([\d.-]+) [\d.-]+ 0 \d 1 ([\d.-]+) ([\d.-]+) Z"/.exec(
      svg,
    );
  if (!m) throw new Error("부채꼴 path 를 못 찾았다");
  const [ax, ay, px, py, R, qx, qy] = m.slice(1).map(Number) as number[];
  const a0 = Math.atan2(py! - ay!, px! - ax!);
  const a1 = Math.atan2(qy! - ay!, qx! - ax!);
  const sweep = (((a1 - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return {
    apex: [ax!, ay!],
    radius: R!,
    deg: (sweep * 180) / Math.PI,
    arc: R! * sweep,
  };
}

function baseCircle(svg: string): { c: [number, number]; r: number } {
  const m = /<circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.-]+)"/.exec(svg);
  if (!m) throw new Error("밑면 원을 못 찾았다");
  return { c: [Number(m[1]), Number(m[2])], r: Number(m[3]) };
}

function texts(svg: string): string[] {
  return [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) =>
    m[1]!.trim(),
  );
}

function viewBoxWidth(svg: string): number {
  return Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
}

const PAIRS: Array<[number, number, number]> = [
  // r, l, 중심각(=360r/l, 손으로 계산한 값)
  [3, 9, 120],
  [4, 6, 240],
  [2, 12, 60],
  [5, 9, 200],
  [6, 8, 270],
  [1, 4, 90],
  [10, 12, 300],
];

describe.skipIf(!hasEngine)("[netCone] 그림이 곧 검산이다", () => {
  it("중심각이 360r/l 이다 — 그린 좌표에서 되읽어 견준다", async () => {
    for (const [r, l, deg] of PAIRS) {
      const s = sector(
        await svgOf({ version: "elem-1", kind: "netCone", r, l }),
      );
      expect(s.deg, `r=${r} l=${l}`).toBeCloseTo(deg, 1);
    }
  });

  it("**호의 길이 == 밑면 원의 둘레** — 이게 접히는지의 전부다", async () => {
    for (const [r, l] of PAIRS) {
      const svg = await svgOf({ version: "elem-1", kind: "netCone", r, l });
      const s = sector(svg);
      const base = baseCircle(svg);
      // 기대값은 스펙에서 손으로 세운 식이다 — 2πr(밑면 둘레).
      expect(s.arc / (2 * Math.PI * base.r), `r=${r} l=${l}`).toBeCloseTo(1, 3);
    }
  });

  it("한 배율이다 — 부채꼴 반지름 : 밑면 반지름 == l : r", async () => {
    for (const [r, l] of PAIRS) {
      const svg = await svgOf({ version: "elem-1", kind: "netCone", r, l });
      expect(
        sector(svg).radius / baseCircle(svg).r,
        `r=${r} l=${l}`,
      ).toBeCloseTo(l / r, 2);
    }
  });

  it("밑면 원이 호에 **닿는다** — 떨어지면 어디에 붙는 원인지 안 보인다", async () => {
    for (const [r, l] of PAIRS) {
      const svg = await svgOf({ version: "elem-1", kind: "netCone", r, l });
      const s = sector(svg);
      const base = baseCircle(svg);
      const d = Math.hypot(base.c[0] - s.apex[0], base.c[1] - s.apex[1]);
      expect(d, `r=${r} l=${l}`).toBeCloseTo(s.radius + base.r, 1);
    }
  });

  it("같은 스펙이면 같은 SVG (결정적)", async () => {
    const spec = { version: "elem-1", kind: "netCone", r: 3, l: 9 };
    expect(await svgOf(spec)).toBe(await svgOf(spec));
  });
});

describe.skipIf(!hasEngine)("[netCone] 치수는 엔진이 쓴다", () => {
  it("기본은 모선과 중심각 — 반지름은 그 둘이 정하므로 안 적는다 (§4-16)", async () => {
    const t = texts(
      await svgOf({ version: "elem-1", kind: "netCone", r: 3, l: 9 }),
    );
    expect(t).toContain("9 cm");
    expect(t).toContain("120°");
    expect(t).not.toContain("3 cm");
  });

  it("`labels` 로 무엇을 적을지 고른다 — 값은 **스펙이 아니라 r·l** 이 정한다", async () => {
    const only = texts(
      await svgOf({
        version: "elem-1",
        kind: "netCone",
        r: 3,
        l: 9,
        labels: ["slant"],
      }),
    );
    expect(only).toContain("9 cm");
    expect(only).not.toContain("120°");

    const all = texts(
      await svgOf({
        version: "elem-1",
        kind: "netCone",
        r: 3,
        l: 9,
        labels: ["slant", "angle", "radius"],
      }),
    );
    expect(all).toEqual(expect.arrayContaining(["9 cm", "120°", "3 cm"]));

    const none = texts(
      await svgOf({
        version: "elem-1",
        kind: "netCone",
        r: 3,
        l: 9,
        labels: [],
      }),
    );
    expect(none).toEqual([]);
  });
});

describe.skipIf(!hasEngine)("[netCone] 지면 폭을 박는다", () => {
  it("중심각이 30°~330° 어디든 viewBox 폭이 **정확히 240** 이고 mid 등급이다", async () => {
    for (const [r, l] of PAIRS) {
      const svg = await svgOf({ version: "elem-1", kind: "netCone", r, l });
      expect(viewBoxWidth(svg), `r=${r} l=${l}`).toBe(240);
      expect(figureSvgSize(svg)).toBe("mid");
    }
  });
});

describe.skipIf(!hasEngine)("[netCone] 던지는 것 (D-70)", () => {
  it("모선이 밑면 반지름 이하면 던진다 — 원뿔이 아니다", async () => {
    for (const [r, l] of [
      [3, 3],
      [4, 2],
    ] as const) {
      expect(
        await errorOf({ version: "elem-1", kind: "netCone", r, l }),
      ).toContain("원뿔이 아닙니다");
    }
  });

  it("중심각이 정수 도가 아니면 던진다 — 각도기로 못 읽는다", async () => {
    // (5, 12, 13) 직각삼각형 원뿔: 360×5/13 = 138.46…°
    expect(
      await errorOf({ version: "elem-1", kind: "netCone", r: 5, l: 13 }),
    ).toContain("정수 도");
  });

  it("중심각이 30° 미만 / 330° 초과면 던진다", async () => {
    expect(
      await errorOf({ version: "elem-1", kind: "netCone", r: 1, l: 15 }),
    ).toContain("부채꼴");
    expect(
      await errorOf({ version: "elem-1", kind: "netCone", r: 7, l: 7.2 }),
    ).toContain("부채꼴");
  });

  it("모르는 labels 값 · 모르는 키 · 빠진 키는 던진다", async () => {
    await errorOf({
      version: "elem-1",
      kind: "netCone",
      r: 3,
      l: 9,
      labels: ["height"],
    });
    await errorOf({ version: "elem-1", kind: "netCone", r: 3, l: 9, h: 8 });
    await errorOf({ version: "elem-1", kind: "netCone", r: 3 });
  });
});
