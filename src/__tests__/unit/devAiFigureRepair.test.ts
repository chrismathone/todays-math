// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import {
  ENGINE_FAILURES,
  MAX_DROPPED,
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

  it(`stops after ${MAX_DROPPED} drops and shows the engine's reason`, async () => {
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
    expect((failure as Error).message).toMatch(
      /^도형을 그리지 못했습니다: dimension '.+' has no collision-free layout.* 원본은 유지됩니다\.$/,
    );
    expect(phases()).toEqual(["generate", "generate", "generate"]);
  });
});
