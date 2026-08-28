/**
 * 입체 kind 셋 — hollowSolid · cutCuboid · revolvePlan (elem-1, 2026-08-23).
 *
 * 실제 엔진(render_spec.py → sanitize_svg)을 태운다. 모킹하지 않는다 —
 * 없는 축은 변이시킬 수 없다(CLAUDE.md 2026-08-19). 정본은 RPM 중학 1-2
 * p127(유형07·08)·p111(유형14)·p133(유형20)의 원본 지면이고, 여기 불변식은
 * 그 지면과 09-figure-engine-guide §4 에서 왔다.
 *
 * 기대값(0.15 등)은 **테스트에 적은 리터럴**이다 — 제품 상수를 읽으면 상수를
 * 바꿀 때 기대값이 따라가서 영원히 초록이다(09 §4-20-d).
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

/** <polygon points fill> 전부 — (점열, fill). `_fill_poly`/`_poly`/화살촉이 다 잡힌다. */
function polygons(svg: string): { pts: [number, number][]; fill: string }[] {
  return [
    ...svg.matchAll(/<polygon points="([^"]+)"(?:[^>]*?)fill="([^"]+)"/g),
  ].map((m) => ({
    pts: m[1]!.split(" ").map((p) => {
      const [x, y] = p.split(",");
      return [Number(x), Number(y)] as [number, number];
    }),
    fill: m[2]!,
  }));
}

function polylines(svg: string): { pts: [number, number][]; dash: boolean }[] {
  return [
    ...svg.matchAll(
      /<polyline points="([^"]+)"[^>]*?(stroke-dasharray="5 4")?\s*\/>/g,
    ),
  ].map((m) => ({
    pts: m[1]!.split(" ").map((p) => {
      const [x, y] = p.split(",");
      return [Number(x), Number(y)] as [number, number];
    }),
    dash: Boolean(m[2]),
  }));
}

function bbox(pts: [number, number][]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** 숨은 모서리 점선(5 4) 조각 수 — line 은 안 만든다(전부 polyline 으로 긋는다). */
function hiddenDashCount(svg: string): number {
  return [...svg.matchAll(/stroke-dasharray="5 4"/g)].length;
}

/** measured() 치수 곡선(6 4) 수 = 적힌 치수의 수. */
function measCount(svg: string): number {
  return [...svg.matchAll(/stroke-dasharray="6 4"/g)].length;
}

const HOLLOW_CYL = {
  version: "elem-1",
  kind: "hollowSolid",
  outer: { shape: "cylinder", r: 5, h: 10 },
  inner: { shape: "cylinder", r: 2 },
};

describe.skipIf(!hasEngine)("[입체 kind] hollowSolid", () => {
  it("원기둥⊖원기둥 — 윗면 타원과 개구부가 그려지고 숨은 윤곽은 점선이다", async () => {
    const r = await renderFigureSpec(HOLLOW_CYL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("<svg");
    // 숨은 윤곽 — 바깥 밑면 뒤쪽 호 + 구멍 실루엣 둘 + 구멍 밑 타원 (09 §4-14).
    expect(hiddenDashCount(r.svg)).toBeGreaterThanOrEqual(4);
    // 받은 치수(R·r·H) 전부 measured() 한 벌로 적는다 (09 §4-16 · §4-20).
    expect(measCount(r.svg)).toBe(3);
    expect(r.svg).toContain("5 cm");
    expect(r.svg).toContain("2 cm");
    expect(r.svg).toContain("10 cm");
  });

  it("윗면 타원 납작비는 0.15 — 축에 나란하다 (09 §4-15 · §4-20-d)", async () => {
    // r·h 가 다른 두 점에서 잰다 — 엉뚱한 요소(몸통 비 등)는 두 점에서 같은 값을
    // 낼 수 없다 (09 §4-20-d).
    for (const spec of [
      HOLLOW_CYL,
      {
        ...HOLLOW_CYL,
        outer: { shape: "cylinder", r: 2, h: 9 },
        inner: { shape: "cylinder", r: 0.8 },
      },
    ]) {
      const r = await renderFigureSpec(spec);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const top = polygons(r.svg).find((p) => p.fill === "#f2e6d4");
      expect(top).toBeTruthy();
      const b = bbox(top!.pts);
      const ratio = (b.maxY - b.minY) / (b.maxX - b.minX);
      expect(ratio).toBeGreaterThan(0.14);
      expect(ratio).toBeLessThan(0.16);
      // 축에 나란한가 — **좌·우 끝점의 y 가 같아야** 한다. 기울면(타원기둥) 한쪽 끝이
      // 올라가고 다른 쪽이 내려간다.
      //
      // ⚠️ 종전에는 «가장 낮은 꼭짓점의 x 가 가운데인가»를 **절대 1.0px** 로 물었다.
      //    그것은 기울기가 아니라 **표본이 하필 바닥에 걸렸는가**를 잰다 — 타원을 64점
      //    으로 찍으므로 바닥 표본은 최대 `R·sin(π/64)` 만큼 옆에 있고, 그 값은
      //    **도형이 커지면 같이 커진다.** 회전체 배율을 정본에 맞춰 올리는 순간
      //    (원장님 확정 2026-08-28) 멀쩡한 축나란 타원이 2.14px 로 빨개졌다.
      //    실측하면 두 타원 다 좌우 끝 y 차가 **정확히 0.0000** 이다 — 기울기는 없었고
      //    치우침만 하나는 0.0000, 하나는 0.0983 이었다(순전히 표본 탓).
      //    **재는 축이 틀리면 크기를 바꿀 때마다 거짓 빨강이 난다.**
      const left = top!.pts.reduce((a, c) => (c[0] < a[0] ? c : a));
      const right = top!.pts.reduce((a, c) => (c[0] > a[0] ? c : a));
      const height = b.maxY - b.minY;
      expect(height, "타원 높이를 못 쟀다").toBeGreaterThan(3);
      expect(Math.abs(left[1] - right[1]) / height).toBeLessThan(0.05);
    }
  });

  it("개구부 폭은 스펙의 r 비율대로다 — 그린 값이 적힌 값이다 (09 §4-21)", async () => {
    const r = await renderFigureSpec(HOLLOW_CYL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ps = polygons(r.svg);
    const top = ps.find((p) => p.fill === "#f2e6d4")!;
    const opening = ps.find((p) => p.fill === "#d4c09e")!;
    expect(opening).toBeTruthy();
    const rt = bbox(top.pts);
    const ro = bbox(opening.pts);
    const ratio = (ro.maxX - ro.minX) / (rt.maxX - rt.minX);
    expect(ratio).toBeGreaterThan(0.38); // 2/5
    expect(ratio).toBeLessThan(0.42);
  });

  it("직육면체⊖직육면체 — 개구부·구멍 세로선·바닥 윤곽이 있다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "hollowSolid",
      outer: { shape: "cuboid", w: 4, d: 3, h: 4.5 },
      inner: { shape: "cuboid", w: 2.2, d: 1.4 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const opening = polygons(r.svg).find(
      (p) => p.fill === "#d4c09e" && p.pts.length === 4,
    );
    expect(opening).toBeTruthy();
    // 직육면체 숨은 모서리 셋 + 구멍 세로 넷 + 구멍 바닥 넷 — 최소 7토막.
    expect(hiddenDashCount(r.svg)).toBeGreaterThanOrEqual(7);
    expect(measCount(r.svg)).toBe(5); // w·d·h + 구멍 w·d
  });

  it("정육면체⊖원기둥 — 구멍 타원은 그 면 위의 원 투영이고 반지름 점이 있다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "hollowSolid",
      outer: { shape: "cuboid", w: 5, d: 5, h: 5 },
      inner: { shape: "cylinder", r: 1.6 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const opening = polygons(r.svg).find(
      (p) => p.fill === "#d4c09e" && p.pts.length > 10,
    );
    expect(opening).toBeTruthy();
    expect(r.svg).toContain('r="2" fill="#111111"'); // 반지름 치수의 중심 점 (09 §4-16)
    expect(measCount(r.svg)).toBe(4); // w·d·h + r
  });

  it("구멍이 바깥에 너무 가까우면 던진다 — 조용한 폴백 금지", async () => {
    const bad = [
      { ...HOLLOW_CYL, inner: { shape: "cylinder", r: 4.9 } },
      {
        version: "elem-1",
        kind: "hollowSolid",
        outer: { shape: "cuboid", w: 4, d: 3, h: 4 },
        inner: { shape: "cuboid", w: 3.9, d: 1 },
      },
      // 원기둥에 직육면체 구멍 — 지원하지 않는 조합.
      { ...HOLLOW_CYL, inner: { shape: "cuboid", w: 1, d: 1 } },
      // 스펙 오타 키 — 엄격 검증.
      { ...HOLLOW_CYL, outer: { shape: "cylinder", r: 5, h: 10, rr: 1 } },
    ];
    for (const spec of bad) {
      const r = await renderFigureSpec(spec);
      expect(r.ok).toBe(false);
    }
  });
});

const CUT_NOTCH = {
  version: "elem-1",
  kind: "cutCuboid",
  w: 12,
  d: 9,
  h: 9,
  cut: { x: 3, w: 5, d: 3, h: 6 },
};

describe.skipIf(!hasEngine)("[입체 kind] cutCuboid", () => {
  it("윗·앞면에 닿은 홈(0849 무리) — 받은 치수 전부 + 숨은 모서리 점선", async () => {
    const r = await renderFigureSpec(CUT_NOTCH);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 바깥 w·d·h + 컷 w·d·h + 왼기둥 x — 받은 치수 일곱을 다 적는다 (09 §4-20).
    expect(measCount(r.svg)).toBe(7);
    for (const t of ["12 cm", "9 cm", "5 cm", "3 cm", "6 cm"]) {
      expect(r.svg).toContain(t);
    }
    expect(hiddenDashCount(r.svg)).toBeGreaterThanOrEqual(3);
  });

  it("앞면 세로 홈(0851 무리) — 깊은 홈의 가려진 모서리가 점선 토막으로 갈린다", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "cutCuboid",
      w: 11,
      d: 6,
      h: 9,
      cut: { x: 2, w: 3.5, d: 1.8 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // cut.h 를 뺐으니(바닥까지) 치수는 w·d·h + 컷 w·d + x = 6.
    expect(measCount(r.svg)).toBe(6);
    // 홈 안쪽 뒷벽의 세로 모서리는 **화면 안쪽**(볼록 껍질 안)에서 점선이 된다 —
    // 면-쌍 규칙(§4-14)은 앞을 보는 면의 모서리라 이것을 못 가른다. 가림 판정의 몫.
    const dashes = polylines(r.svg).filter((p) => p.dash);
    expect(dashes.length).toBeGreaterThanOrEqual(5);
    const whole = bbox(polylines(r.svg).flatMap((p) => p.pts));
    const interior = dashes.filter((p) => {
      const b = bbox(p.pts);
      return b.minX > whole.minX + 8 && b.maxX < whole.maxX - 8;
    });
    expect(interior.length).toBeGreaterThanOrEqual(1);
  });

  it("컷을 끊어 말하면 던진다 — 빈 컷·한 방향만·바깥보다 큰 컷·범위 초과", async () => {
    const bad = [
      { ...CUT_NOTCH, cut: {} },
      { ...CUT_NOTCH, cut: { w: 5 } }, // w·d·h 중 둘 이상이어야 한다
      { ...CUT_NOTCH, cut: { x: 3, w: 12, d: 3, h: 6 } }, // cut.w ≥ w
      { ...CUT_NOTCH, cut: { x: 10, w: 5, d: 3, h: 6 } }, // x + w > 바깥 w
      { ...CUT_NOTCH, cut: { x: 3, w: 5, d: 3, h: 6, deep: 1 } }, // 오타 키
      { ...CUT_NOTCH, cut: { x: 3, d: 3 } }, // w 없이 x
    ];
    for (const spec of bad) {
      const r = await renderFigureSpec(spec);
      expect(r.ok).toBe(false);
    }
  });
});

const REV_RECT = {
  version: "elem-1",
  kind: "revolvePlan",
  pieces: [{ shape: "rect", w: 3, h: 5 }],
};

describe.skipIf(!hasEngine)("[입체 kind] revolvePlan", () => {
  it("직사각형 + 축 — 축은 도형 위아래로 뻗는 실선, ℓ 라벨과 회전 화살표", async () => {
    const r = await renderFigureSpec(REV_RECT);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain("ℓ");
    const shape = polygons(r.svg).find((p) => p.fill === "#f4efe6");
    expect(shape).toBeTruthy();
    const sb = bbox(shape!.pts);
    // 축(세로 실선)은 도형보다 위·아래로 나가야 한다. 원본 지면(RPM p111)이 실선이다.
    const axis = [
      ...r.svg.matchAll(
        /<line x1="([0-9.]+)" y1="([0-9.]+)" x2="([0-9.]+)" y2="([0-9.]+)"[^>]*\/>/g,
      ),
    ]
      .map((m) => ({ x1: +m[1]!, y1: +m[2]!, x2: +m[3]!, y2: +m[4]! }))
      .find(
        (l) =>
          Math.abs(l.x1 - l.x2) < 0.01 &&
          l.y1 < sb.minY - 5 &&
          l.y2 > sb.maxY + 5,
      );
    expect(axis).toBeTruthy();
    // 축이 도형의 오른변에 붙는다(gap 0) — 원본 구도.
    expect(Math.abs(axis!.x1 - sb.maxX)).toBeLessThan(1.5);
    // 회전 화살표 — 축 꼭대기의 화살촉(작은 폴리곤).
    const head = polygons(r.svg).find(
      (p) => p.fill === "#111111" && p.pts.length === 3,
    );
    expect(head).toBeTruthy();
    expect(bbox(head!.pts).maxY).toBeLessThan(sb.minY);
  });

  it("직각 표시는 직각 모퉁이에만 — 직사각형 4 · 직각삼각형 1 · 사다리꼴 2", async () => {
    const marks = async (spec: unknown) => {
      const r = await renderFigureSpec(spec);
      expect(r.ok).toBe(true);
      if (!r.ok) return -1;
      return polylines(r.svg).filter((p) => {
        const b = bbox(p.pts);
        return (
          p.pts.length === 3 &&
          !p.dash &&
          b.maxX - b.minX < 14 &&
          b.maxY - b.minY < 14
        );
      }).length;
    };
    expect(await marks(REV_RECT)).toBe(4);
    expect(
      await marks({
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [{ shape: "rightTri", w: 3.5, h: 5 }],
      }),
    ).toBe(1);
    expect(
      await marks({
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [{ shape: "rightTrap", w: 4, w2: 2.5, h: 4.5 }],
      }),
    ).toBe(2);
    // 반원은 직각이 없다.
    expect(
      await marks({
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [{ shape: "semicircle", r: 3 }],
      }),
    ).toBe(0);
  });

  it("치수는 받은 것만 measured() 로 — 안 주면 안 적는다 (09 §4-20)", async () => {
    const bare = await renderFigureSpec(REV_RECT);
    expect(bare.ok).toBe(true);
    if (!bare.ok) return;
    expect(measCount(bare.svg)).toBe(0);
    const labeled = await renderFigureSpec({
      version: "elem-1",
      kind: "revolvePlan",
      pieces: [
        { shape: "rightTri", w: 5, h: 7, wLabel: "5 cm", hLabel: "7 cm" },
      ],
    });
    expect(labeled.ok).toBe(true);
    if (!labeled.ok) return;
    expect(measCount(labeled.svg)).toBe(2);
    expect(labeled.svg).toContain("5 cm");
    expect(labeled.svg).toContain("7 cm");
  });

  it("반원 반지름은 중심 점 + 반지름 선 자체가 치수선 (09 §4-16)", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "revolvePlan",
      pieces: [{ shape: "semicircle", r: 3, rLabel: "3 cm" }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain('r="2" fill="#111111"');
    expect(measCount(r.svg)).toBe(1);
    expect(r.svg).toContain("3 cm");
  });

  it("쌓을 수 없는 조합은 던진다 — 꼭짓점이 축에 닿는 조각 위·반원 혼용", async () => {
    const bad = [
      {
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [
          { shape: "rightTri", w: 3, h: 3 },
          { shape: "rect", w: 2, h: 2 },
        ],
      },
      {
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [
          { shape: "semicircle", r: 2 },
          { shape: "rect", w: 2, h: 2 },
        ],
      },
      {
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [{ shape: "원", r: 2 }],
      },
      {
        version: "elem-1",
        kind: "revolvePlan",
        pieces: [{ shape: "rect", w: 3, h: 5, top: 1 }],
      },
      { version: "elem-1", kind: "revolvePlan", pieces: [] },
    ];
    for (const spec of bad) {
      const r = await renderFigureSpec(spec);
      expect(r.ok).toBe(false);
    }
  });

  it("층 사이가 다르면 가로 턱이 생긴다 — 계단 두 층(0738④ 무리)", async () => {
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "revolvePlan",
      pieces: [
        { shape: "rect", w: 4, h: 2.5 },
        { shape: "rect", w: 2, h: 3 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const shape = polygons(r.svg).find((p) => p.fill === "#f4efe6");
    expect(shape).toBeTruthy();
    // L자 = 꼭짓점 6개 (직사각형끼리는 한 윤곽으로 붙는다).
    expect(shape!.pts.length).toBe(6);
  });
});
