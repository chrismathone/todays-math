/**
 * 도형 편집기 «면 만들기»(트랙 4) — 면 찾기의 평면 기하.
 *
 * 원장님 2026-09-19 «면을 쉽게 만들 수 있어야 색칠을 할 수가 있음». 채우기 통(누른 점을 둘러싼 가장 작은 닫힌 영역)과
 * 묶음 안쪽 채우기(선 묶음이 두른 바깥 테두리)가 이 계산을 쓴다. 화면과 무관한 순수 계산이라 DOM 없이 잰다.
 * 넓이는 방향(시계·반시계)을 떼고 잰다 — SVG 는 y 가 아래로 자라 방향이 뒤집혀 보인다.
 */
import { describe, expect, it } from "vitest";

import {
  arrangeFaceCurves,
  boundedFaces,
  closedOutlines,
  faceAt,
  interiorPoint,
  pointInRegion,
  ringArea,
  type FaceCurve,
  type Point,
} from "@/components/unified/figure-editor/figureFaceGeometry";

const P = (x: number, y: number): Point => ({ x, y });
const seg = (id: string, a: Point, b: Point): FaceCurve => ({
  id,
  points: [a, b],
  closed: false,
});
const loop = (id: string, ...points: Point[]): FaceCurve => ({
  id,
  points,
  closed: true,
});
/** 원은 표본점뿐 — 진짜 꼭짓점이 없다(figureFaceSources 가 원을 펴서 넘기는 모양과 같다). */
const circle = (id: string, c: Point, r: number, n = 180): FaceCurve => ({
  id,
  closed: true,
  corners: [],
  points: Array.from({ length: n }, (_, k) =>
    P(
      c.x + r * Math.cos((2 * Math.PI * k) / n),
      c.y + r * Math.sin((2 * Math.PI * k) / n),
    ),
  ),
});
const area = (ring: readonly Point[]) => Math.abs(ringArea(ring));
const triangleArea = (a: Point, b: Point, c: Point) =>
  Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
/** 상대 오차 — 원·곡선은 꺾은선으로 펴서 재므로 정확히 같지 않다. */
const near = (value: number, expected: number, relative: number) =>
  expect(Math.abs(value - expected) / expected).toBeLessThan(relative);

// △ABC — A 위, B 왼쪽 아래, C 오른쪽 아래. D 는 BC 위(△ABD 7200 · △ADC 14400 으로 넓이가 갈린다).
const A = P(120, 20),
  B = P(20, 200),
  C = P(260, 200),
  D = P(100, 200);
const triangle = [seg("AB", A, B), seg("BC", B, C), seg("CA", C, A)];

describe("faceAt — 누른 점을 둘러싼 가장 작은 닫힌 영역", () => {
  it("선분 세 개로 그린 삼각형 — 안을 누르면 그 삼각형", () => {
    const face = faceAt(arrangeFaceCurves(triangle), P(120, 150));
    expect(face).not.toBeNull();
    expect(area(face!.outer)).toBeCloseTo(triangleArea(A, B, C), 6);
    expect(face!.area).toBeCloseTo(21600, 6);
    expect(face!.holes).toEqual([]);
    expect([...face!.sourceIds].sort()).toEqual(["AB", "BC", "CA"]);
  });

  it("삼각형 안의 작은 삼각형 — AD 를 그으면 누른 쪽(△ABD·△ADC)만", () => {
    const arrangement = arrangeFaceCurves([...triangle, seg("AD", A, D)]);
    const left = faceAt(arrangement, P(80, 140))!;
    expect(left.area).toBeCloseTo(triangleArea(A, B, D), 6);
    expect(left.area).toBeCloseTo(7200, 6);
    expect([...left.sourceIds].sort()).toEqual(["AB", "AD", "BC"]);
    const right = faceAt(arrangement, P(160, 140))!;
    expect(right.area).toBeCloseTo(14400, 6);
    expect([...right.sourceIds].sort()).toEqual(["AD", "BC", "CA"]);
  });

  it("사각형 + 대각선 — 누른 쪽 삼각형만", () => {
    const arrangement = arrangeFaceCurves([
      loop("rect", P(40, 40), P(240, 40), P(240, 160), P(40, 160)),
      seg("diag", P(40, 40), P(240, 160)),
    ]);
    const upper = faceAt(arrangement, P(200, 60))!;
    expect(upper.area).toBeCloseTo(12000, 6);
    expect([...upper.sourceIds].sort()).toEqual(["diag", "rect"]);
    const lower = faceAt(arrangement, P(60, 140))!;
    expect(lower.area).toBeCloseTo(12000, 6);
    // 두 삼각형은 서로 다른 면이다 — 누른 점이 다른 쪽에 들지 않는다.
    expect(pointInRegion(P(60, 140), upper.outer, upper.holes)).toBe(false);
  });

  it("원과 현 — 활꼴만(현이 원 밖으로 삐져나와도)", () => {
    // 중심 (200,200) 반지름 100, 현 y=150. 활꼴 넓이 r²·acos(d/r) − d·√(r²−d²), d=50.
    const arrangement = arrangeFaceCurves([
      circle("circle", P(200, 200), 100),
      seg("chord", P(80, 150), P(320, 150)),
    ]);
    const cap = 10000 * Math.acos(0.5) - 50 * Math.sqrt(7500);
    const top = faceAt(arrangement, P(200, 120))!;
    near(top.area, cap, 0.003);
    expect([...top.sourceIds].sort()).toEqual(["chord", "circle"]);
    const rest = faceAt(arrangement, P(200, 250))!;
    near(rest.area, Math.PI * 10000 - cap, 0.003);
  });

  it("바깥을 누르면 없다 — 닫히지 않은 V 안도 없다", () => {
    expect(faceAt(arrangeFaceCurves(triangle), P(5, 5))).toBeNull();
    expect(
      faceAt(
        arrangeFaceCurves([seg("AB", A, B), seg("BC", B, C)]),
        P(120, 150),
      ),
    ).toBeNull();
    expect(faceAt(arrangeFaceCurves([]), P(0, 0))).toBeNull();
  });

  it("끝점이 조금 안 맞는 선 — 허용 오차 안이면 닫히고 밖이면 안 닫힌다", () => {
    // CA 가 A 에 1.5 모자라게 끝난다(AI 가 반올림한 좌표에서 흔하다).
    const loose = [
      seg("AB", A, B),
      seg("BC", B, C),
      seg("CA", C, P(121.2, 20.9)),
    ];
    const closed = faceAt(arrangeFaceCurves(loose, 2), P(120, 150));
    expect(closed).not.toBeNull();
    near(closed!.area, 21600, 0.01);
    expect(faceAt(arrangeFaceCurves(loose, 1), P(120, 150))).toBeNull();
    expect(faceAt(arrangeFaceCurves(loose, 0), P(120, 150))).toBeNull();
  });

  it("T 자로 조금 모자란 선 — 허용 오차 안이면 선 위로 붙는다", () => {
    // AD 가 BC 에 1.2 못 미친다. 붙으면 △ABD, 안 붙으면 매달린 선이라 삼각형 전체.
    // 붙을 때는 AD 가 가던 방향으로 늘인다 — D ≈ (99.87, 200). 그은 선이 곧게 남아 면 가장자리가 선 밑에 숨는다.
    const short = [...triangle, seg("AD", A, P(100, 198.8))];
    const snapped = faceAt(arrangeFaceCurves(short, 2), P(80, 140))!;
    near(snapped.area, 7200, 0.005);
    const D2 = snapped.outer.find(
      (p) => Math.abs(p.y - 200) < 1e-6 && p.x > 90,
    )!;
    expect(D2.x).toBeCloseTo(100 - 1.2 * (20 / 178.8), 6);
    const whole = faceAt(arrangeFaceCurves(short, 0), P(80, 140))!;
    expect(whole.area).toBeCloseTo(21600, 6);
    // 매달린 AD 는 걷힌다 — 면 테두리에 안으로 찌른 가시(A→D→A)가 남지 않는다.
    expect(whole.outer).toHaveLength(3);
    expect(whole.sourceIds).not.toContain("AD");
  });

  it("면 안에 떨어진 선분 — 구멍이 아니다(넓이 0 고리를 구멍으로 달지 않는다)", () => {
    const face = faceAt(
      arrangeFaceCurves([...triangle, seg("stray", P(100, 150), P(140, 150))]),
      P(120, 100),
    )!;
    expect(face.area).toBeCloseTo(21600, 6);
    expect(face.holes).toEqual([]);
    expect(face.sourceIds).not.toContain("stray");
  });

  it("두 선의 끝이 만난 자리가 원에 조금 못 미치면 — 함께 원 위로 붙는다", () => {
    // 현 y=80 과 반지름이 (245,80) 에서 만나는데 원(중심 (160,120) 반지름 95)은 x≈246.17 — 1.17 모자란다.
    // 끝점끼리 먼저 붙고 멈추면 활꼴이 옆 칸으로 새어 한 면이 된다(눈 확인 2026-09-19).
    const arrangement = arrangeFaceCurves(
      [
        circle("circle", P(160, 120), 95),
        seg("chord", P(75, 80), P(245, 80)),
        seg("radius", P(160, 120), P(245, 80)),
      ],
      2,
    );
    const d = 40,
      r = 95;
    near(
      faceAt(arrangement, P(160, 50))!.area,
      r * r * Math.acos(d / r) - d * Math.sqrt(r * r - d * d),
      0.01,
    );
  });

  it("늘여도 안 닿는 끝점(원에 스치는 방향) — 원의 표본점이 아니라 원 위 가장 가까운 점으로", () => {
    // 표본점 (0,−100) 이 1.41 거리에 있지만 원 위 가장 가까운 점은 (1,−100) 쪽이다.
    const { junctions } = arrangeFaceCurves(
      [
        circle("circle", P(0, 0), 100),
        seg("tangent", P(-60, -101), P(1, -101)),
      ],
      2,
    );
    expect(
      junctions.some(
        (p) => Math.abs(p.x - 1) < 0.05 && Math.abs(p.y + 100) < 0.05,
      ),
    ).toBe(true);
  });

  it("늘일 곳이 둘이면 끝 선분이 긴 선을 곧게 둔다 — 짧은 선이 따라 기운다", () => {
    // 긴 가로선과 짧은 빗선이 (95,50) 에서 만나고 세로선 x=96 에 1 모자란다.
    const { junctions } = arrangeFaceCurves(
      [
        seg("wall", P(96, 0), P(96, 100)),
        seg("long", P(0, 50), P(95, 50)),
        seg("short", P(85, 40), P(95, 50)),
      ],
      2,
    );
    expect(
      junctions.some(
        (p) => Math.abs(p.x - 96) < 1e-6 && Math.abs(p.y - 50) < 1e-6,
      ),
    ).toBe(true);
  });

  it("촘촘한 곡선의 끝점은 제 곡선의 이웃 표본점으로 끌려가지 않는다", () => {
    // 포물선 y = 60 + (x−240)²/120 이 x축(y=330) 위 (60,330)·(420,330) 에서 끝난다. 표본 간격이 허용 오차보다 좁다.
    const parabola: FaceCurve = {
      id: "graph",
      closed: false,
      points: Array.from({ length: 1201 }, (_, k) => {
        const x = 60 + (k * 360) / 1200;
        return P(x, 60 + (x - 240) ** 2 / 120);
      }),
    };
    const face = faceAt(
      arrangeFaceCurves(
        [
          seg("xaxis", P(30, 330), P(450, 330)),
          seg("yaxis", P(240, 350), P(240, 20)),
          parabola,
          seg("line", P(40, 240), P(440, 240)),
        ],
        2,
      ),
      P(300, 300),
    );
    expect(face).not.toBeNull();
    // x=240 · y=240 · y=330 · 오른쪽 가지 x = 240 + √(120(y−60)) 가 두른 칸
    const exact =
      Math.sqrt(120) * (2 / 3) * (Math.pow(270, 1.5) - Math.pow(180, 1.5));
    near(face!.area, exact, 0.01);
  });

  it("꼭짓점에서 조금 삐져나온 선 — 꼬리는 걷히고 면은 그대로", () => {
    const extend = (id: string, a: Point, b: Point) => {
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / length,
        uy = (b.y - a.y) / length;
      return seg(
        id,
        P(a.x - 5 * ux, a.y - 5 * uy),
        P(b.x + 5 * ux, b.y + 5 * uy),
      );
    };
    const face = faceAt(
      arrangeFaceCurves([
        extend("AB", A, B),
        extend("BC", B, C),
        extend("CA", C, A),
      ]),
      P(120, 150),
    )!;
    expect(face.area).toBeCloseTo(21600, 6);
    expect(face.outer).toHaveLength(3);
  });

  it("같은 자리를 두 번 지나는 선 — 겹쳐도 면은 하나", () => {
    const face = faceAt(
      arrangeFaceCurves([...triangle, seg("BC2", P(60, 200), P(300, 200))]),
      P(120, 150),
    )!;
    expect(face.area).toBeCloseTo(21600, 6);
  });

  it("두 원 사이를 누르면 구멍 난 면 — 안쪽 원을 누르면 안쪽 원", () => {
    const arrangement = arrangeFaceCurves([
      circle("outer", P(200, 200), 100),
      circle("inner", P(200, 200), 40),
    ]);
    const ring = faceAt(arrangement, P(270, 200))!;
    expect(ring.holes).toHaveLength(1);
    near(ring.area, Math.PI * (10000 - 1600), 0.003);
    expect([...ring.sourceIds].sort()).toEqual(["inner", "outer"]);
    expect(pointInRegion(P(200, 200), ring.outer, ring.holes)).toBe(false);
    const disk = faceAt(arrangement, P(200, 200))!;
    expect(disk.holes).toEqual([]);
    near(disk.area, Math.PI * 1600, 0.003);
  });

  it("원 안에 떨어진 삼각형 — 원 안 빈 곳의 면에는 삼각형이 구멍으로 든다", () => {
    const arrangement = arrangeFaceCurves([
      circle("circle", P(200, 200), 150),
      loop("tri", P(170, 180), P(230, 180), P(200, 230)),
    ]);
    const face = faceAt(arrangement, P(200, 100))!;
    expect(face.holes).toHaveLength(1);
    near(face.area, Math.PI * 22500 - 1500, 0.003);
    expect(faceAt(arrangement, P(200, 200))!.area).toBeCloseTo(1500, 6);
  });

  it("촘촘한 곡선(함수 그래프 1200점)도 한 점으로 뭉치지 않는다 — 포물선과 가로선 사이", () => {
    // y = 100 + (x−240)²/100 (화면에서 꼭짓점이 위), 가로선 y=200 과 x=140·340 에서 만난다. 넓이 40000/3.
    const parabola: FaceCurve = {
      id: "graph",
      closed: false,
      points: Array.from({ length: 1201 }, (_, k) => {
        const x = 40 + k / 3;
        return P(x, 100 + (x - 240) ** 2 / 100);
      }),
    };
    const started = performance.now();
    const face = faceAt(
      arrangeFaceCurves([parabola, seg("line", P(0, 200), P(480, 200))], 2),
      P(240, 150),
    )!;
    expect(performance.now() - started).toBeLessThan(2000);
    near(face.area, 40000 / 3, 0.005);
  });
});

describe("boundedFaces — 갇힌 면 전부", () => {
  it("삼각형 + AD 는 면 둘, 원과 현은 면 둘(둘 다 경계가 같은 두 선)", () => {
    expect(
      boundedFaces(arrangeFaceCurves([...triangle, seg("AD", A, D)]))
        .map((face) => Math.round(face.area))
        .sort((a, b) => a - b),
    ).toEqual([7200, 14400]);
    const caps = boundedFaces(
      arrangeFaceCurves([
        circle("circle", P(200, 200), 100),
        seg("chord", P(80, 150), P(320, 150)),
      ]),
    );
    expect(caps).toHaveLength(2);
    for (const face of caps)
      expect([...face.sourceIds].sort()).toEqual(["chord", "circle"]);
  });
});

describe("closedOutlines — 묶음이 두른 닫힌 영역(안쪽 채우기)", () => {
  it("세 선분이 삼각형을 이루면 테두리 하나", () => {
    const outlines = closedOutlines(arrangeFaceCurves(triangle));
    expect(outlines).toHaveLength(1);
    expect(outlines[0].area).toBeCloseTo(21600, 6);
    expect(area(outlines[0].outer)).toBeCloseTo(21600, 6);
  });

  it("삼각형 + 안쪽 선(AD) — 칸이 둘이어도 바깥 테두리 하나(삼각형 전체)", () => {
    const outlines = closedOutlines(
      arrangeFaceCurves([...triangle, seg("AD", A, D)]),
    );
    expect(outlines).toHaveLength(1);
    expect(outlines[0].area).toBeCloseTo(21600, 6);
  });

  it("열린 꺾은선(V)은 닫힌 영역이 아니다", () => {
    expect(
      closedOutlines(arrangeFaceCurves([seg("AB", A, B), seg("BC", B, C)])),
    ).toEqual([]);
  });

  it("떨어진 두 삼각형 — 테두리 둘", () => {
    const outlines = closedOutlines(
      arrangeFaceCurves([
        ...triangle,
        loop("far", P(400, 20), P(460, 20), P(430, 80)),
      ]),
    );
    expect(
      outlines.map((o) => Math.round(o.area)).sort((a, b) => a - b),
    ).toEqual([1800, 21600]);
  });

  it("사각형 안에 따로 떨어진 원 — 바깥 사각형 하나만(원은 그 안에 든다)", () => {
    const outlines = closedOutlines(
      arrangeFaceCurves([
        loop("square", P(0, 0), P(300, 0), P(300, 300), P(0, 300)),
        circle("circle", P(150, 150), 50),
      ]),
    );
    expect(outlines).toHaveLength(1);
    expect(outlines[0].area).toBeCloseTo(90000, 6);
  });

  it("허용 오차 안의 틈이면 닫힌 것으로 본다", () => {
    const loose = [
      seg("AB", A, B),
      seg("BC", B, C),
      seg("CA", C, P(121.2, 20.9)),
    ];
    expect(closedOutlines(arrangeFaceCurves(loose, 2))).toHaveLength(1);
    expect(closedOutlines(arrangeFaceCurves(loose, 0))).toEqual([]);
  });
});

describe("interiorPoint — 면 안쪽의 한 점(무게중심이 밖일 때도)", () => {
  it("오목한 ㄱ자 — 무게중심은 밖이지만 고른 점은 안", () => {
    const shape = [
      P(0, 0),
      P(100, 0),
      P(100, 20),
      P(20, 20),
      P(20, 100),
      P(0, 100),
    ];
    expect(pointInRegion(P(32.2, 32.2), shape)).toBe(false);
    expect(pointInRegion(interiorPoint(shape), shape)).toBe(true);
  });

  it("고리 — 구멍을 피해 고리 안의 점", () => {
    const outer = circle("o", P(200, 200), 100).points;
    const inner = circle("i", P(200, 200), 40).points;
    const point = interiorPoint(outer, [inner]);
    expect(pointInRegion(point, outer, [inner])).toBe(true);
    const r = Math.hypot(point.x - 200, point.y - 200);
    expect(r).toBeGreaterThan(40);
    expect(r).toBeLessThan(100);
  });
});

describe("junctions — 달라붙기 후보(교점·끝점)", () => {
  it("엇갈린 두 선분 — 교점 하나와 끝점 넷", () => {
    const { junctions } = arrangeFaceCurves([
      seg("a", P(0, 0), P(100, 100)),
      seg("b", P(0, 100), P(100, 0)),
    ]);
    expect(junctions).toHaveLength(5);
    expect(junctions.some((p) => Math.hypot(p.x - 50, p.y - 50) < 1e-6)).toBe(
      true,
    );
  });

  it("원 위의 표본점은 후보가 아니다 — 원과 선의 교점과 선의 끝점만", () => {
    const { junctions } = arrangeFaceCurves([
      circle("circle", P(200, 200), 100),
      seg("line", P(50, 190), P(350, 190)),
    ]);
    expect(junctions).toHaveLength(4);
    const x = Math.sqrt(10000 - 100);
    for (const expected of [P(200 + x, 190), P(200 - x, 190)])
      expect(
        junctions.some(
          (p) => Math.hypot(p.x - expected.x, p.y - expected.y) < 0.05,
        ),
      ).toBe(true);
  });
});
