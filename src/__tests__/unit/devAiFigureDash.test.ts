// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DevAiFigureSpec, DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildFigureComparisonImage } from "@/lib/dev-ai/figure-comparison";
import {
  redrawDevAiFigure,
  type FigureInference,
} from "@/lib/dev-ai/figure-engine";
import { ENGINE_FAILURES, repairFigureSpec } from "@/lib/dev-ai/figure-repair";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { withLabelMetrics } from "@/lib/figure/mathjaxSubstitute";
import productionFixture from "../fixtures/figure-redraw-axis-empty-dash.json";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Always exercise the vendored Python process, even with deployment env set.
  vi.stubEnv("STUDIO_ENGINE_URL", "");
  vi.stubEnv("VERCEL", "");
});
afterEach(() => vi.unstubAllEnvs());

const xAxis = { points: ["O", "X"], ticks: 1 };
const yAxis = { points: ["O", "Y"], parallel: 1 };
const auxiliary = { points: ["Q", "P"], dashed: "4 3" };
const axes = (
  xStyle: Record<string, unknown> = {},
  yStyle: Record<string, unknown> = {},
): DevAiFigureSpec => ({
  version: 2,
  points: {
    O: [40, 200],
    X: [260, 200],
    Y: [40, 30],
    P: [180, 80],
    Q: [40, 80],
  },
  segments: {
    xAxis: { ...xAxis, ...xStyle },
    yAxis: { ...yAxis, ...yStyle },
    dash_y: { ...auxiliary },
  },
});
const render = (spec: DevAiFigureSpec) =>
  renderFigureSpec(spec, { typeset: false, strict: true });
const engineError = async (spec: DevAiFigureSpec) => {
  const rendered = await render(spec);
  expect(rendered.ok).toBe(false);
  if (rendered.ok) throw new Error("The fixture must be rejected by Python");
  return rendered.error;
};
const repaired = async (
  spec: DevAiFigureSpec,
  pattern: RegExp = ENGINE_FAILURES.segmentDash,
) => {
  const before = structuredClone(spec);
  const error = await engineError(spec);
  expect(error).toMatch(pattern);
  const fix = repairFigureSpec(spec, error, false);
  expect(fix).toBeDefined();
  if (!fix) throw new Error(error);
  expect(fix.warning).toBeUndefined();
  expect(fix.dropped).not.toBe(true);
  expect(fix.note).toMatch(/\S/);
  expect(spec).toEqual(before);
  return fix.spec;
};

describe("Python-backed segment dash repair", () => {
  it.each([
    ["", "contain non-negative lengths and at least one positive length"],
    ["0 0", "contain non-negative lengths and at least one positive length"],
    [[4, 3], "be a numeric list"],
  ])("recognizes the real diagnostic for %j", async (dash, reason) => {
    const error = await engineError(axes({ dash }));
    expect(error).toContain(`segment 'xAxis' dash must ${reason}`);
    expect(error).toMatch(ENGINE_FAILURES.segmentDash);
  });

  describe.each(["dash", "dashed"])("%s aliases", (key) => {
    it.each([
      ["empty string", ""],
      ["whitespace", " \t\r\n "],
      ["numeric zero", 0],
      ["zero string", "0"],
      ["all-zero lengths", "0 0 0"],
      ["comma-separated zeros", "0, 0.0, -0"],
      ["empty array", []],
      ["all-zero array", [0, 0, -0]],
      ["false", false],
      ["solid", "solid"],
      ["none", "none"],
    ])("turns %s into solid without changing geometry", async (_name, dash) => {
      const fixed = await repaired(axes({ [key]: dash }));
      expect(fixed).toEqual(axes());
      const rendered = await render(fixed);
      expect(rendered.ok).toBe(true);
      if (!rendered.ok) throw new Error(rendered.error);
      expect(rendered.svg.match(/stroke-dasharray="4 3"/g)).toHaveLength(1);
      expect(rendered.svg.match(/stroke-dasharray=/g)).toHaveLength(1);
    });

    it.each([
      [[4, 3], "4 3"],
      [[0, 2.5, 1, 0], "0 2.5 1 0"],
      [[1.25], "1.25"],
      [true, "5 3"],
      ["dashed", "5 3"],
      ["dotted", "5 3"],
    ])(
      "preserves the lengths or existing meaning of %j",
      async (dash, expected) => {
        const fixed = await repaired(axes({ [key]: dash }));
        expect(fixed).toEqual(axes({ dashed: expected }));
        const rendered = await render(fixed);
        expect(rendered.ok).toBe(true);
        if (!rendered.ok) throw new Error(rendered.error);
        expect(rendered.svg).toContain(`stroke-dasharray="${expected}"`);
      },
    );
  });

  it("repairs x then y independently and retains the auxiliary dash (2026-10-02)", async () => {
    const spec = axes({ dash: "" }, { dash: "" });
    const before = structuredClone(spec);
    const firstError = await engineError(spec);
    expect(firstError).toContain("segment 'xAxis'");
    const first = await repaired(spec);
    expect(first).toEqual(axes({}, { dash: "" }));
    const firstBefore = structuredClone(first);
    expect(await engineError(first)).toContain("segment 'yAxis'");
    const second = await repaired(first);
    expect(second).toEqual(axes());
    expect((await render(second)).ok).toBe(true);
    expect(spec).toEqual(before);
    expect(first).toEqual(firstBefore);
  });

  it("repairs a named list record without changing its name, order, or marks", async () => {
    const spec = axes();
    spec.segments = [
      { name: "xAxis", ...xAxis, dashed: [] },
      { name: "yAxis", ...yAxis },
      { name: "dash_y", ...auxiliary },
    ];
    const fixed = await repaired(spec);
    expect(fixed).toEqual({
      ...axes(),
      segments: [
        { name: "xAxis", ...xAxis },
        { name: "yAxis", ...yAxis },
        { name: "dash_y", ...auxiliary },
      ],
    });
    expect((await render(fixed)).ok).toBe(true);
  });

  it.each([
    { dashed: "2.5 0 1 3" },
    { dash: "4, 3" },
    { dash: 4 },
    { dash: "4 3", dashed: "invalid fallback" },
    { dash: null, dashed: "invalid fallback" },
    { dashed: null },
  ])(
    "keeps valid styles intact while repairing another segment: %j",
    async (style) => {
      const valid = axes({}, style);
      const before = structuredClone(valid);
      expect((await render(valid)).ok).toBe(true);
      const fixed = await repaired(axes({ dash: "" }, style));
      expect(fixed).toEqual(valid);
      expect((await render(fixed)).ok).toBe(true);
      expect(valid).toEqual(before);
    },
  );

  it.each([
    [{ dash: "", dashed: "4 3" }, {}],
    [{ dash: 0, dashed: "4 3" }, {}],
    [{ dash: [0, 2.5, 0], dashed: null }, { dashed: "0 2.5 0" }],
    [{ dash: false, dashed: true }, {}],
    [{ dash: true, dashed: false }, { dashed: "5 3" }],
  ])("uses dash before dashed, like Python: %j", async (style, expected) => {
    const fixed = await repaired(axes(style));
    expect(fixed).toEqual(axes(expected));
    expect((await render(fixed)).ok).toBe(true);
  });

  it("does not reinterpret explicit null using dashed after an earlier rejection", async () => {
    const error = await engineError(axes({ dash: true }));
    const spec = axes({ dash: null, dashed: true });
    const before = structuredClone(spec);
    expect((await render(spec)).ok).toBe(true);
    for (const allowDrop of [false, true]) {
      const fixed = repairFigureSpec(spec, error, allowDrop)?.spec ?? spec;
      const rendered = await render(fixed);
      expect(rendered.ok).toBe(true);
      if (!rendered.ok) throw new Error(rendered.error);
      // Only the valid auxiliary line may be dashed; explicit null means solid.
      expect(rendered.svg.match(/stroke-dasharray=/g)).toHaveLength(1);
      expect(rendered.svg).toContain('stroke-dasharray="4 3"');
    }
    expect(spec).toEqual(before);
  });

  it.each([
    ["negative number", -1],
    ["negative string length", "4 -3"],
    ["negative array length", [4, -3]],
    ["NaN string", "NaN 3"],
    ["infinite string", "Infinity 3"],
    ["overflowing string", "1e309 3"],
    // JSON transports non-finite array entries as null; neither representation is safe.
    ["infinite array entry", [4, Infinity]],
    ["NaN array entry", [NaN, 3]],
    ["null array entry", [null, 3]],
    ["numeric strings in an array", ["4", "3"]],
    ["nested array", [[4, 3]]],
    ["malformed lengths", "4px 3"],
    ["object", { length: 4 }],
  ])(
    "leaves %s for bounded AI correction, including on the final attempt",
    async (_name, dash) => {
      const spec = axes({ dash, dashed: "4 3" });
      const before = structuredClone(spec);
      const error = await engineError(spec);
      expect(error).toMatch(/segment 'xAxis' dash must (?:be|contain)/);
      for (const allowDrop of [false, true])
        expect(repairFigureSpec(spec, error, allowDrop)).toBeUndefined();
      expect(spec).toEqual(before);
    },
  );
});

const arc = { circle: "c", from: "A", to: "B", dir: "ccw" };
const arcSpec = (style: Record<string, unknown> = {}): DevAiFigureSpec => ({
  version: 2,
  points: { O: [120, 120], A: [190, 120], B: [120, 50] },
  circles: { c: { center: "O", radius: 70, draw: false } },
  arcs: { quarter: { ...arc, ...style } },
});

describe("Python-backed arc dash repair", () => {
  it.each([
    ["empty string", "", undefined],
    ["whitespace", " \t\n ", undefined],
    ["numeric zero", 0, undefined],
    ["all-zero string", "0, 0", undefined],
    ["empty array", [], undefined],
    ["all-zero array", [0, -0], undefined],
    ["numeric array", [0, 2.5, 1], "0 2.5 1"],
    ["boolean", true, "5 3"],
    ["solid", "solid", undefined],
  ])(
    "repairs %s using the arc dash field and preserves the circle",
    async (_name, dash, expected) => {
      const fixed = await repaired(arcSpec({ dash }), ENGINE_FAILURES.arcDash);
      expect(fixed).toEqual(
        arcSpec(expected === undefined ? {} : { dash: expected }),
      );
      const rendered = await render(fixed);
      expect(rendered.ok).toBe(true);
      if (!rendered.ok) throw new Error(rendered.error);
      if (expected === undefined)
        expect(rendered.svg).not.toContain("stroke-dasharray");
      else expect(rendered.svg).toContain(`stroke-dasharray="${expected}"`);
    },
  );

  it.each([["4 -3"], [[4, -3]], ["NaN 3"], [[Infinity, 3]], ["4px 3"]])(
    "retains invalid arc lengths %j for model correction",
    async (dash) => {
      const spec = arcSpec({ dash });
      const before = structuredClone(spec);
      const error = await engineError(spec);
      expect(error).toMatch(ENGINE_FAILURES.arcDash);
      for (const allowDrop of [false, true])
        expect(repairFigureSpec(spec, error, allowDrop)).toBeUndefined();
      expect(spec).toEqual(before);
    },
  );

  it("leaves an already valid arc dash untouched during segment repair", async () => {
    const spec = {
      ...arcSpec({ dash: "2.5, 0, 3" }),
      segments: { OA: { points: ["O", "A"], dash: "" } },
    };
    const fixed = await repaired(spec);
    expect(fixed).toEqual({
      ...spec,
      segments: { OA: { points: ["O", "A"] } },
    });
    expect((await render(fixed)).ok).toBe(true);
  });

  it.each(["segments", "arcs"] as const)(
    "handles Python double-quoted names containing apostrophes in %s",
    async (table) => {
      const name = "O'A";
      const spec = {
        ...arcSpec(),
        [table]: {
          [name]:
            table === "arcs"
              ? { ...arc, dash: "" }
              : { points: ["O", "A"], dash: "" },
        },
      };
      const error = await engineError(spec);
      expect(error).toContain(
        `"${name}" dash must contain non-negative lengths`,
      );
      const fixed = await repaired(
        spec,
        table === "arcs"
          ? ENGINE_FAILURES.arcDash
          : ENGINE_FAILURES.segmentDash,
      );
      expect(fixed).toEqual({
        ...spec,
        [table]: { [name]: table === "arcs" ? arc : { points: ["O", "A"] } },
      });
      expect((await render(fixed)).ok).toBe(true);
    },
  );
});

it("replays the actual blank-axis spec with label metrics without hiding its later canvas rejection", async () => {
  const original = structuredClone(productionFixture) as DevAiFigureSpec;
  const before = structuredClone(original);
  let current = original;
  const expected = structuredClone(productionFixture);
  // Only the two dash properties may change while repairing the reported failure.
  const solidX: Record<string, unknown> = { ...expected.segments.xAxis };
  const solidY: Record<string, unknown> = { ...expected.segments.yAxis };
  delete solidX.dash;
  delete solidY.dash;
  const solidAxes = {
    ...expected,
    segments: { ...expected.segments, xAxis: solidX, yAxis: solidY },
  };
  const failures: string[] = [];
  for (let step = 0; step < 8; step++) {
    const rendered = await render(withLabelMetrics(current) as DevAiFigureSpec);
    expect(rendered.ok).toBe(false);
    if (rendered.ok)
      throw new Error("The captured source still has a clipped fixed canvas");
    failures.push(rendered.error);
    if (step < 2) {
      expect(rendered.error).toContain(
        `segment '${step === 0 ? "xAxis" : "yAxis"}' dash must contain`,
      );
    }
    const fix = repairFigureSpec(current, rendered.error, false);
    if (!fix) {
      expect(step).toBe(6);
      expect(rendered.error).toMatch(ENGINE_FAILURES.canvasClips);
      break;
    }
    expect(fix.warning).toBeUndefined();
    expect(fix.dropped).not.toBe(true);
    current = fix.spec;
    if (step === 1) expect(current).toEqual(solidAxes);
  }
  expect(failures).toHaveLength(7);
  for (const [index, name] of ["A", "B", "D", "lbl_1x"].entries())
    expect(failures[index + 2]).toContain(
      `label '${name}' has no line/circle/label-free position`,
    );
  // Later placement repairs must retain every label text and every math condition.
  expect(current.segments).toEqual(solidAxes.segments);
  for (const key of ["points", "circles", "arcs", "angles", "canvas"])
    expect(current[key]).toEqual(before[key]);
  const labels = current.labels as Record<string, { text: string }>;
  expect(Object.keys(labels)).toEqual(Object.keys(productionFixture.labels));
  for (const [name, label] of Object.entries(productionFixture.labels))
    expect(labels[name].text).toBe(label.text);
  expect(original).toEqual(before);
  expect(productionFixture).toEqual(before);
});

const input: DevAiRequest = {
  action: "figure-redraw",
  provider: "codex",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "원본 좌표축과 보조 점선을 보존해 재작도",
};

describe("redraw source review after dash repair", () => {
  it.each([true, false])(
    "retains source review with passed=%s after local repair",
    async (passed) => {
      const spec = axes({ dash: "" }, { dash: "" });
      const before = structuredClone(spec);
      const requestBefore = structuredClone(input);
      const issues = passed ? [] : ["원본의 보조선 위치를 확인해 주세요."];
      const inference = vi
        .fn<FigureInference>()
        .mockImplementation(async ({ phase }) =>
          JSON.stringify(phase === "generate" ? { spec } : { passed, issues }),
        );
      const result = await redrawDevAiFigure(input, undefined, inference);
      expect(result.spec).toEqual({ ...axes(), background: "transparent" });
      expect(result.figureReview).toEqual({
        mode: "source-and-rendered-images",
        passed,
        issues,
      });
      expect(result.warnings).toEqual([]);
      expect(result.svg?.match(/stroke-dasharray="4 3"/g)).toHaveLength(1);
      expect(result.svg?.match(/stroke-dasharray=/g)).toHaveLength(1);
      expect(inference.mock.calls.map(([call]) => call.phase)).toEqual(
        passed
          ? ["generate", "review"]
          : ["generate", "review", "generate", "review", "generate", "review"],
      );
      for (const [call] of inference.mock.calls.filter(
        ([call]) => call.phase === "review",
      )) {
        expect(call.imageDataUrl).toBe(
          "data:image/png;base64,Y29tcGFyaXNvbg==",
        );
        expect(call.prompt).toContain(
          '"dash_y":{"points":["Q","P"],"dashed":"4 3"}',
        );
        expect(call.prompt).not.toContain('"dash":""');
      }
      expect(buildFigureComparisonImage).toHaveBeenCalledTimes(passed ? 1 : 3);
      expect(buildFigureComparisonImage).toHaveBeenCalledWith(
        input.imageDataUrl,
        result.svg,
        expect.any(AbortSignal),
      );
      expect(spec).toEqual(before);
      expect(input).toEqual(requestBefore);
    },
  );

  it("rejects unreadable source review even when the repaired figure renders", async () => {
    const inference = vi
      .fn<FigureInference>()
      .mockImplementation(async ({ phase }) =>
        phase === "generate"
          ? JSON.stringify({ spec: axes({ dash: "" }, { dash: "" }) })
          : "not a review",
      );
    await expect(
      redrawDevAiFigure(input, undefined, inference),
    ).rejects.toThrow("원본 대조 응답을 읽지 못했습니다");
    expect(inference.mock.calls.map(([call]) => call.phase)).toEqual([
      "generate",
      "review",
    ]);
  });

  it("stops after three negative-dash generations and never claims source review", async () => {
    const spec = axes({ dash: "4 -3" });
    const inference = vi
      .fn<FigureInference>()
      .mockResolvedValue(JSON.stringify({ spec }));
    await expect(
      redrawDevAiFigure(input, undefined, inference),
    ).rejects.toMatchObject({
      message: expect.stringContaining("원본은 유지됩니다"),
      detail: expect.stringContaining(
        "segment 'xAxis' dash must contain non-negative lengths",
      ),
    });
    expect(inference.mock.calls.map(([call]) => call.phase)).toEqual([
      "generate",
      "generate",
      "generate",
    ]);
    expect(inference.mock.calls[1][0].prompt).toContain('"dash":"4 -3"');
    expect(buildFigureComparisonImage).not.toHaveBeenCalled();
  });
});
