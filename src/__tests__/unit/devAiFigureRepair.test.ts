// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import {
  ENGINE_FAILURES,
  FIGURE_REDRAW_FAILED,
  MAX_DROPPED,
  engineRejectionReason,
  repairFigureSpec,
} from "@/lib/dev-ai/figure-repair";
import { FigureRedrawError } from "@/lib/dev-ai/figure-spec";
import type { DevAiFigureSpec, DevAiRequest } from "@/lib/dev-ai/contracts";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));
const run = vi.mocked(runSubscriptionCli);
beforeEach(() => vi.clearAllMocks());
const input: DevAiRequest = {
  action: "figure-redraw",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "원본 도형을 재작도",
};
const pass = JSON.stringify({ passed: true, issues: [] });

// 원장님이 붙여 주신 운영 로그(2026-09-19 00:19~00:27 KST, 전부 502)의 여섯 사유를 실제 엔진에서 다시 만든다.
const triangle = (extra: Record<string, unknown> = {}): DevAiFigureSpec => ({
  version: 2,
  points: { A: [50, 30], B: [50, 210], C: [290, 210] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  labels: { A: "A", B: "B", C: "C" },
  ...extra,
});
// 16 갈래 바퀴살 한가운데의 점 O — 여덟 방향 × 다섯 거리 어디에도 이름표 자리가 없다
const spokes = (): DevAiFigureSpec => {
  const points: Record<string, number[]> = { O: [150, 150] };
  const segments: Record<string, string[]> = {};
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16;
    points[`P${i}`] = [150 + 60 * Math.cos(a), 150 + 60 * Math.sin(a)];
    segments[`s${i}`] = ["O", `P${i}`];
  }
  return { version: 2, points, segments, labels: { O: "O" } };
};
// 원장님 화면 2026-09-21 문제 22 <보기> ㄱ — 삼각형 ABC 안의 점 D·35°·20°·120°. 모델이 캔버스 320×280 을 박았고
// 이름표 B·C 가 아래로 2.95px 넘쳤다. 엔진 사유의 수치(content=(19.5, 12.052, 300.95, 282.95))까지 그대로 다시 만든다.
const insideD = (extra: Record<string, unknown> = {}): DevAiFigureSpec => ({
  version: 2,
  canvas: { width: 320, height: 280 },
  points: { A: [150, 30], B: [42.45, 260], C: [278, 260], D: [165, 175] },
  segments: {
    AB: ["A", "B"],
    BC: ["B", "C"],
    CA: ["C", "A"],
    DB: ["D", "B"],
    DC: ["D", "C"],
  },
  angles: {
    aB: { vertex: "B", points: ["A", "D"], label: "35°" },
    aC: { vertex: "C", points: ["D", "A"], label: "20°" },
    aD: { vertex: "D", points: ["B", "C"], label: "120°" },
  },
  labels: { A: "A", B: "B", C: "C", D: "D" },
  ...extra,
});
// 같은 화면 ㄷ — 외각 x·50°·30°. 모델이 이름표 열쇠를 점 이름이 아닌 lA 로 짓고 point:"A" 를 달았다.
const exteriorX = (
  labels: Record<string, unknown> = {
    lA: { point: "A", text: "A" },
    lB: { point: "B", text: "B" },
    lC: { point: "C", text: "C" },
    lD: { point: "D", text: "D" },
  },
): DevAiFigureSpec => ({
  version: 2,
  points: { A: [120, 30], B: [30, 200], C: [220, 200], D: [300, 200] },
  segments: {
    AB: ["A", "B"],
    BC: ["B", "C"],
    CA: ["C", "A"],
    CD: ["C", "D"],
  },
  angles: {
    aA: { vertex: "A", points: ["B", "C"], label: "50°" },
    aB: { vertex: "B", points: ["C", "A"], label: "30°" },
    aX: { vertex: "C", points: ["D", "A"], label: "x" },
  },
  labels,
});
const onCircle = (point: Record<string, unknown>): DevAiFigureSpec => ({
  version: 2,
  points: { O: [150, 150], P: { type: "on_circle", circle: "c", ...point } },
  circles: { c: { center: "O", radius: 60 } },
  segments: { OP: ["O", "P"] },
  labels: { O: "O", P: "P" },
});
const FIXTURES: Record<keyof typeof ENGINE_FAILURES, DevAiFigureSpec> = {
  offsetAndCurvature: triangle({
    dimensions: {
      dAB: { points: ["A", "B"], label: "5", offset: 10, curvature: 10 },
    },
  }),
  offsetNotPositive: triangle({
    dimensions: { dAB: { points: ["A", "B"], label: "5", offset: -8 } },
  }),
  // 85.24° — 운영 로그의 85.25°·89.10°·84.02°·80.59° 와 같은 «조금 빗나간» 직각
  rightAngleOff: triangle({
    points: { A: [50, 30], B: [50, 210], C: [290, 190] },
    angles: { rtB: { vertex: "B", points: ["A", "C"], right: true } },
  }),
  dimensionNoRoom: triangle({
    dimensions: {
      dimCA: { points: ["C", "A"], label: "10 cm" },
      dimAC: { points: ["A", "C"], label: "20 cm" },
    },
  }),
  labelNoRoom: spokes(),
  rayNotDrawn: triangle({
    segments: { AB: ["A", "B"], CA: ["C", "A"] },
    angles: { rtB: { vertex: "B", points: ["A", "C"], right: true } },
  }),
  canvasClips: insideD(),
  labelKeyConflict: exteriorX(),
  canvasInvalid: triangle({ canvas: { background: "transparent" } }),
  unknownTheme: triangle({ theme: "exam" }),
  rightWithArcs: triangle({
    angles: { rtB: { vertex: "B", points: ["A", "C"], right: true, arcs: 1 } },
  }),
  pointsAndEnds: triangle({
    segments: {
      AB: { points: ["A", "B"], p1: "A", p2: "B" },
      BC: ["B", "C"],
      CA: ["C", "A"],
    },
  }),
  angleAndAngleDeg: onCircle({ angle: 30, angle_deg: 30 }),
  duplicateName: triangle({
    angles: { B: { vertex: "B", points: ["A", "C"], right: true } },
  }),
};
const engineError = async (spec: DevAiFigureSpec) => {
  const rendered = await renderFigureSpec(spec, {
    typeset: false,
    strict: true,
  });
  return rendered.ok ? "" : rendered.error;
};

describe("the engine still words its failures the way the repair table reads them", () => {
  // 🔴 엔진 문구가 바뀌면 여기서 빨개진다 — 표가 조용히 아무것도 못 잡는 채로 초록이면 안 된다
  it.each(Object.keys(ENGINE_FAILURES) as (keyof typeof ENGINE_FAILURES)[])(
    "%s",
    async (key) => {
      const error = await engineError(FIXTURES[key]);
      expect(error).toMatch(/^도형을 그리지 못했습니다: /);
      expect(error).toMatch(ENGINE_FAILURES[key]);
    },
  );
  it("has a real engine fixture for every row", () => {
    expect(Object.keys(FIXTURES).sort()).toEqual(
      Object.keys(ENGINE_FAILURES).sort(),
    );
  });
});

describe("cheap fixes run before asking the model again", () => {
  it("keeps offset when a dimension gives both offset and curvature", async () => {
    const fix = repairFigureSpec(
      FIXTURES.offsetAndCurvature,
      await engineError(FIXTURES.offsetAndCurvature),
      false,
    );
    expect(fix?.warning).toBeUndefined();
    expect(fix?.spec.dimensions).toEqual({
      dAB: { points: ["A", "B"], label: "5", offset: 10 },
    });
    expect(await engineError(fix!.spec)).toBe("");
  });

  it("lets the engine place a dimension whose offset is not positive", async () => {
    const fix = repairFigureSpec(
      FIXTURES.offsetNotPositive,
      await engineError(FIXTURES.offsetNotPositive),
      false,
    );
    expect(fix?.warning).toBeUndefined();
    expect(fix?.spec.dimensions).toEqual({
      dAB: { points: ["A", "B"], label: "5" },
    });
    expect(await engineError(fix!.spec)).toBe("");
  });

  it("drops only the right-angle mark of a nearly right angle and says so — the geometry is not forced", async () => {
    const fix = repairFigureSpec(
      FIXTURES.rightAngleOff,
      await engineError(FIXTURES.rightAngleOff),
      false,
    );
    expect(fix?.spec.points).toEqual(FIXTURES.rightAngleOff.points);
    expect(fix?.spec.angles).toEqual({});
    expect(fix?.warning).toBe("∠B 의 직각 표시를 뺐습니다(그린 각 85.2°).");
    expect(await engineError(fix!.spec)).toBe("");
  });

  it("keeps the arc and its label when a labelled right angle is off", () => {
    const spec = triangle({
      angles: {
        rtB: { vertex: "B", points: ["A", "C"], right: true, label: "90°" },
      },
    });
    const fix = repairFigureSpec(
      spec,
      "도형을 그리지 못했습니다: angle 'rtB' is marked right but measures 86.00° — fix the geometry, not the mark",
      false,
    );
    expect(fix?.spec.angles).toEqual({
      rtB: { vertex: "B", points: ["A", "C"], label: "90°" },
    });
  });

  it("leaves a far-off right angle to the model until the last attempt", () => {
    const far =
      "도형을 그리지 못했습니다: angle 'rtB' is marked right but measures 106.70° — fix the geometry, not the mark";
    expect(
      repairFigureSpec(FIXTURES.rightAngleOff, far, false),
    ).toBeUndefined();
    expect(repairFigureSpec(FIXTURES.rightAngleOff, far, true)).toMatchObject({
      dropped: true,
      warning: "∠B 의 직각 표시를 뺐습니다(그린 각 106.7°).",
    });
  });

  it("frees a label the model pinned with dx/dy before dropping anything", async () => {
    const pinned = triangle({
      labels: { A: { text: "A", dx: 0, dy: 90 }, B: "B", C: "C" },
    });
    const error = await engineError(pinned);
    expect(error).toMatch(ENGINE_FAILURES.labelNoRoom);
    const fix = repairFigureSpec(pinned, error, false);
    expect(fix?.warning).toBeUndefined();
    expect(fix?.spec.labels).toEqual({ A: { text: "A" }, B: "B", C: "C" });
    expect(await engineError(fix!.spec)).toBe("");
  });

  it("frees a dimension the model pinned with side/offset before dropping it", () => {
    const spec = triangle({
      dimensions: {
        dimCA: { points: ["C", "A"], label: "10", side: "left", offset: 30 },
      },
    });
    const fix = repairFigureSpec(
      spec,
      "도형을 그리지 못했습니다: dimension 'dimCA' has no collision-free layout (clip/text/point/geometry/circle/dimension=(0, 0, 0, 0, 0, 1))",
      false,
    );
    expect(fix?.warning).toBeUndefined();
    expect(fix?.spec.dimensions).toEqual({
      dimCA: { points: ["C", "A"], label: "10" },
    });
  });

  it("works on list-shaped records too", () => {
    const spec = triangle({
      dimensions: [{ name: "dAB", points: ["A", "B"], label: "5", offset: -1 }],
    });
    const fix = repairFigureSpec(
      spec,
      "도형을 그리지 못했습니다: dimension 'dAB' offset must be positive",
      false,
    );
    expect(fix?.spec.dimensions).toEqual([
      { name: "dAB", points: ["A", "B"], label: "5" },
    ]);
  });
});

// 트랙 45(2026-09-21) — 원장님 두 거절과, 전수 조사에서 «뜻이 하나이고 고치는 법도 하나»로 가른 거절들.
describe("rejections with one meaning are fixed without asking the model", () => {
  const fixed = async (spec: DevAiFigureSpec) => {
    const error = await engineError(spec);
    expect(error).not.toBe("");
    const fix = repairFigureSpec(spec, error, false);
    expect(fix).toBeDefined();
    // 지면이 바뀌지 않는 교정이라 원장님 화면에는 알리지 않는다 — 무엇을 고쳤는지는 개발자 기록(note)에 남긴다
    expect(fix!.warning).toBeUndefined();
    expect(fix!.note).toMatch(/\S/);
    expect(await engineError(fix!.spec)).toBe("");
    return fix!;
  };
  const refused = async (spec: DevAiFigureSpec, row: RegExp) => {
    // toMatch(undefined) 는 초록이다 — 표에 그 행이 없으면 이 시험이 헛돈다
    expect(row).toBeInstanceOf(RegExp);
    const error = await engineError(spec);
    expect(error).toMatch(row);
    expect(repairFigureSpec(spec, error, true)).toBeUndefined();
  };

  it("drops the canvas when only engine-placed labels spill out of it (원장님 ㄱ)", async () => {
    expect(await engineError(insideD())).toBe(
      "도형을 그리지 못했습니다: fixed canvas clips scene content: content=(19.5, 12.052, 300.95, 282.95), canvas=(0, 0, 320, 280)",
    );
    const fix = await fixed(insideD());
    expect(fix.spec).not.toHaveProperty("canvas");
    const expected = insideD();
    delete expected.canvas;
    expect(fix.spec).toEqual(expected);
  });

  it("keeps the background when only the canvas carried it", async () => {
    const spec = insideD({
      canvas: { width: 320, height: 280, background: "transparent" },
    });
    const fix = await fixed(spec);
    expect(fix.spec.background).toBe("transparent");
    expect(fix.spec).not.toHaveProperty("canvas");
  });

  // 모델이 준 좌표 자체가 제 캔버스 밖이면 좌표와 틀이 서로 어긋난 것이다 — 넘친 양과 무관하게 되묻는다
  it.each([
    ["a point", insideD({ canvas: { width: 270, height: 280 } })],
    [
      "a drawn circle",
      insideD({
        circles: { c: { center: "D", radius: 200 } },
      }),
    ],
  ])(
    "asks the model when %s of its own lies outside its canvas",
    async (_what, spec) => {
      await refused(spec, ENGINE_FAILURES.canvasClips);
    },
  );

  it("re-keys labels by the point they name (원장님 ㄷ)", async () => {
    expect(await engineError(exteriorX())).toBe(
      "도형을 그리지 못했습니다: labels.lA.point conflicts with its key",
    );
    const fix = await fixed(exteriorX());
    expect(fix.spec.labels).toEqual({
      A: { point: "A", text: "A" },
      B: { point: "B", text: "B" },
      C: { point: "C", text: "C" },
      D: { point: "D", text: "D" },
    });
  });

  it.each([
    [
      "that point already has a label",
      { A: "A", lA: { point: "A", text: "A" } },
    ],
    [
      "two labels name the same point",
      { lA: { point: "A", text: "A" }, lA2: { point: "A", text: "A'" } },
    ],
    // 열쇠도 점 이름이면 열쇠와 point 중 어느 쪽이 맞는지 모른다
    ["the key is itself a point", { A: { point: "B", text: "B" } }],
    ["the named point does not exist", { lZ: { point: "Z", text: "Z" } }],
  ])("asks the model when %s", async (_what, labels) => {
    await refused(exteriorX(labels), ENGINE_FAILURES.labelKeyConflict);
  });

  // 캔버스는 저장본에 닿지 않는다 — 작업실이 저장 직전 fitFigureViewport 로 틀을 다시 잰다
  it.each([
    [{ background: "transparent" }],
    ["auto"],
    [[320]],
    [{ width: 0, height: 280 }],
    [{ width: "wide", height: 280 }],
    [{ width: 320, height: 280, padding: 12 }],
  ])("drops a canvas without a usable size: %j", async (canvas) => {
    const spec = triangle({ canvas });
    expect(await engineError(spec)).toMatch(ENGINE_FAILURES.canvasInvalid);
    const fix = await fixed(spec);
    expect(fix.spec).not.toHaveProperty("canvas");
  });

  it("drops an unknown theme — the engine has only one", async () => {
    const fix = await fixed(FIXTURES.unknownTheme);
    expect(fix.spec).toEqual(triangle());
  });

  it("drops arcs:1 from a right angle, whose square already replaces the arc", async () => {
    const fix = await fixed(FIXTURES.rightWithArcs);
    expect(fix.spec.angles).toEqual({
      rtB: { vertex: "B", points: ["A", "C"], right: true },
    });
  });

  it("asks the model when a right angle also asks for a double arc", async () => {
    await refused(
      triangle({
        angles: {
          rtB: { vertex: "B", points: ["A", "C"], right: true, arcs: 2 },
        },
      }),
      ENGINE_FAILURES.rightWithArcs,
    );
  });

  it.each([
    [
      "segment",
      triangle({
        segments: {
          AB: { points: ["A", "B"], p1: "A", p2: "B", dashed: "5 3" },
          BC: ["B", "C"],
          CA: ["C", "A"],
        },
      }),
      (spec: DevAiFigureSpec) =>
        expect(spec.segments).toMatchObject({
          AB: { points: ["A", "B"], dashed: "5 3" },
        }),
    ],
    [
      "angle",
      triangle({
        angles: { a: { vertex: "B", points: ["A", "C"], p1: "A", p2: "C" } },
      }),
      (spec: DevAiFigureSpec) =>
        expect(spec.angles).toEqual({
          a: { vertex: "B", points: ["A", "C"] },
        }),
    ],
    [
      "dimension",
      triangle({
        dimensions: {
          d: { points: ["B", "C"], p1: "B", p2: "C", label: "8" },
        },
      }),
      (spec: DevAiFigureSpec) =>
        expect(spec.dimensions).toEqual({
          d: { points: ["B", "C"], label: "8" },
        }),
    ],
    [
      "intersection",
      triangle({
        points: {
          A: [50, 30],
          B: [50, 210],
          C: [290, 210],
          P: {
            type: "intersection",
            segments: ["AC", "BM"],
            segment1: "AC",
            segment2: "BM",
          },
          M: [170, 30],
        },
        segments: {
          AB: ["A", "B"],
          BC: ["B", "C"],
          AC: ["A", "C"],
          BM: ["B", "M"],
        },
      }),
      (spec: DevAiFigureSpec) =>
        expect((spec.points as Record<string, unknown>).P).toEqual({
          type: "intersection",
          segments: ["AC", "BM"],
        }),
    ],
    [
      "on-circle angle",
      FIXTURES.angleAndAngleDeg,
      (spec: DevAiFigureSpec) =>
        expect((spec.points as Record<string, unknown>).P).toEqual({
          type: "on_circle",
          circle: "c",
          angle: 30,
        }),
    ],
  ])(
    "keeps one of two spellings that agree: %s",
    async (_what, spec, check) => {
      check((await fixed(spec)).spec);
    },
  );

  it.each([
    [
      triangle({
        segments: {
          AB: { points: ["A", "B"], p1: "A", p2: "C" },
          BC: ["B", "C"],
          CA: ["C", "A"],
        },
      }),
      ENGINE_FAILURES.pointsAndEnds,
    ],
    [onCircle({ angle: 30, angle_deg: 40 }), ENGINE_FAILURES.angleAndAngleDeg],
  ])("asks the model when two spellings disagree", async (spec, row) => {
    await refused(spec, row);
  });

  it.each([
    ["an angle named after its vertex", FIXTURES.duplicateName, "angles"],
    [
      "a dimension named after its side",
      triangle({ dimensions: { AB: { points: ["A", "B"], label: "5" } } }),
      "dimensions",
    ],
  ])("renames %s — its name is only a handle", async (_what, spec, table) => {
    const fix = await fixed(spec);
    const before = spec[table] as Record<string, unknown>;
    const after = fix.spec[table] as Record<string, unknown>;
    expect(Object.values(after)).toEqual(Object.values(before));
    expect(Object.keys(after)).toHaveLength(1);
    expect(Object.keys(after)[0]).not.toBe(Object.keys(before)[0]);
    expect(fix.spec.points).toEqual(spec.points);
  });

  it("asks the model when a point and a segment share a name — both are referenced", async () => {
    await refused(
      triangle({
        points: { A: [50, 30], B: [50, 210], C: [290, 210], AB: [120, 120] },
      }),
      ENGINE_FAILURES.duplicateName,
    );
  });
});

describe("the last attempt drops only the element the engine names", () => {
  it.each([
    ["dimensionNoRoom", "치수 CA 표시를 넣을 자리가 없어 뺐습니다."],
    [
      "labelNoRoom",
      "이름표 O 를 놓을 자리가 없어 뺐습니다. 그림 편집에서 넣어 주세요.",
    ],
    ["rayNotDrawn", "∠B 표시를 그릴 변이 없어 뺐습니다."],
  ] as const)("%s", async (key, warning) => {
    const error = await engineError(FIXTURES[key]);
    expect(repairFigureSpec(FIXTURES[key], error, false)).toBeUndefined();
    const fix = repairFigureSpec(FIXTURES[key], error, true);
    expect(fix).toMatchObject({ dropped: true, warning });
    expect(await engineError(fix!.spec)).toBe("");
  });

  it("does not touch elements the engine did not name", async () => {
    const fix = repairFigureSpec(
      FIXTURES.dimensionNoRoom,
      await engineError(FIXTURES.dimensionNoRoom),
      true,
    );
    expect(fix?.spec.dimensions).toEqual({
      dimAC: { points: ["A", "C"], label: "20 cm" },
    });
    expect(fix?.spec.labels).toEqual(FIXTURES.dimensionNoRoom.labels);
  });

  it("returns nothing for a reason it cannot fix", () => {
    expect(
      repairFigureSpec(
        triangle(),
        "도형을 그리지 못했습니다: segment 'AB' has unknown point ref 'missing'",
        true,
      ),
    ).toBeUndefined();
    expect(
      repairFigureSpec(
        { version: "graph-1", xRange: [0, 1], yRange: [0, 1] },
        "도형을 그리지 못했습니다: dimension provides both offset and curvature; use only one",
        true,
      ),
    ).toBeUndefined();
  });
});

describe("one element no longer throws away the whole figure", () => {
  const always = (spec: DevAiFigureSpec) =>
    run.mockImplementation(async ({ prompt }) =>
      prompt.includes("<rendered-spec-data>") ? pass : JSON.stringify({ spec }),
    );
  const phases = () =>
    run.mock.calls.map(([args]) =>
      args.prompt.includes("<rendered-spec-data>") ? "review" : "generate",
    );

  it.each(["offsetAndCurvature", "offsetNotPositive"] as const)(
    "fixes %s without asking the model again or warning",
    async (key) => {
      always(FIXTURES[key]);
      const result = await redrawDevAiFigure(input);
      expect(phases()).toEqual(["generate", "review"]);
      expect(result.warnings).toEqual([]);
      expect(result.figureReview?.passed).toBe(true);
    },
  );

  it("drops a nearly right angle's mark on the first attempt and says so", async () => {
    always(FIXTURES.rightAngleOff);
    const result = await redrawDevAiFigure(input);
    expect(phases()).toEqual(["generate", "review"]);
    expect(result.warnings).toEqual([
      "∠B 의 직각 표시를 뺐습니다(그린 각 85.2°).",
    ]);
    expect(result.spec?.angles).toEqual({});
  });

  it.each([
    ["dimensionNoRoom", "치수 CA 표시를 넣을 자리가 없어 뺐습니다."],
    [
      "labelNoRoom",
      "이름표 O 를 놓을 자리가 없어 뺐습니다. 그림 편집에서 넣어 주세요.",
    ],
    ["rayNotDrawn", "∠B 표시를 그릴 변이 없어 뺐습니다."],
  ] as const)(
    "asks the model twice, then draws %s without the named element",
    async (key, warning) => {
      always(FIXTURES[key]);
      const result = await redrawDevAiFigure(input);
      // 앞의 두 번은 모델이 원본을 보고 고칠 기회다 — 엔진 사유를 그대로 넘긴다
      expect(phases()).toEqual(["generate", "generate", "generate", "review"]);
      expect(run.mock.calls[1][0].prompt).toContain("<engine-error-data>");
      expect(result.warnings).toEqual([warning]);
      // 뺀 그림도 원본 대조를 거친다
      expect(result.figureReview).toMatchObject({ passed: true });
      expect(result.svg).toContain("<svg");
    },
  );

  // 원장님 2026-09-21 — 간단한 삼각형 둘이 세 번 되묻고도 못 그려 영어 엔진 사유가 그대로 나갔다.
  it.each(["canvasClips", "labelKeyConflict"] as const)(
    "draws 원장님's %s on the model's first answer — one generation, not three",
    async (key) => {
      const log = vi.spyOn(console, "warn").mockImplementation(() => {});
      always(FIXTURES[key]);
      const result = await redrawDevAiFigure(input);
      expect(phases()).toEqual(["generate", "review"]);
      expect(result.svg).toContain("<svg");
      expect(result.warnings).toEqual([]);
      // 조용히 고치지 않는다 — 무엇을 고쳤는지 서버 기록에 남는다
      expect(log).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[도형 재작도\] 엔진 거절을 사양 교정으로 풀었습니다: /,
        ),
      );
      log.mockRestore();
    },
  );

  it(`stops after ${MAX_DROPPED} drops and shows the reason in Korean`, async () => {
    const crowded = triangle({
      dimensions: Object.fromEntries(
        Array.from({ length: MAX_DROPPED + 2 }, (_, i) => [
          `d${i}`,
          { points: i % 2 ? ["A", "C"] : ["C", "A"], label: `${i + 1} cm` },
        ]),
      ),
    });
    always(crowded);
    const failure = await redrawDevAiFigure(input).catch((e: Error) => e);
    expect(failure).toBeInstanceOf(FigureRedrawError);
    expect((failure as Error).message).toBe(
      "치수 표시를 놓을 자리가 없어 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    );
    // 엔진 문구는 개발자용으로 따로 싣는다
    expect((failure as FigureRedrawError).detail).toMatch(
      /^도형을 그리지 못했습니다: dimension '.+' has no collision-free layout/,
    );
    expect(phases()).toEqual(["generate", "generate", "generate"]);
  });

  it("shows a plain Korean line for a reason it does not know", async () => {
    always(triangle({ segments: { AB: ["A", "missing"] } }));
    const failure = await redrawDevAiFigure(input).catch((e: Error) => e);
    expect(failure).toBeInstanceOf(FigureRedrawError);
    expect((failure as Error).message).toBe(FIGURE_REDRAW_FAILED);
    expect((failure as FigureRedrawError).detail).toBe(
      "도형을 그리지 못했습니다: segment 'AB' has unknown point ref 'missing'",
    );
  });
});

describe("the screen reads the engine's reason as one Korean line", () => {
  it("falls back to the plain line", () => {
    expect(FIGURE_REDRAW_FAILED).toBe(
      "도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    );
    expect(engineRejectionReason("도형을 그리지 못했습니다: whatever")).toBe(
      FIGURE_REDRAW_FAILED,
    );
  });

  // 표의 행마다 실제 엔진 사유로 — 사람 말이 붙은 행은 그 말이, 아니면 기본 한 줄이 나간다
  it.each(Object.keys(ENGINE_FAILURES) as (keyof typeof ENGINE_FAILURES)[])(
    "%s",
    async (key) => {
      const reason = engineRejectionReason(await engineError(FIXTURES[key]));
      expect(reason).toMatch(/^[^A-Za-z]+ 원본은 유지됩니다\.$/);
      expect(reason).toMatch(/도형을 다시 그리지 못했습니다\./);
    },
  );

  it.each([
    [
      "canvasClips",
      "그림이 틀 밖으로 넘쳐 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    ],
    [
      "labelKeyConflict",
      "점 이름표가 가리키는 점이 맞지 않아 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    ],
    [
      "rightAngleOff",
      "직각 표시와 그린 각이 맞지 않아 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    ],
    [
      "labelNoRoom",
      "점 이름을 놓을 자리가 없어 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    ],
    [
      "rayNotDrawn",
      "각 표시의 변이 그려지지 않아 도형을 다시 그리지 못했습니다. 원본은 유지됩니다.",
    ],
  ] as const)("says what went wrong for %s", async (key, reason) => {
    expect(engineRejectionReason(await engineError(FIXTURES[key]))).toBe(
      reason,
    );
  });
});
