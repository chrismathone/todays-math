// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { DevAiFigureSpec, DevAiRequest } from "@/lib/dev-ai/contracts";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import { buildFigureSpecPrompt } from "@/lib/dev-ai/figure-prompt";
import { repairFigureSpec } from "@/lib/dev-ai/figure-repair";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));

const options = { strict: true, typeset: false };
const request: DevAiRequest = {
  action: "figure-redraw",
  provider: "codex",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "원본 도형 재작도",
};
const printedLabels = (svg: string) =>
  [...svg.matchAll(/data-mj="([^"]*)"/g)].map((match) => match[1]);

async function engineError(spec: DevAiFigureSpec) {
  const rendered = await renderFigureSpec(spec, options);
  if (rendered.ok)
    throw new Error("Fixture must reproduce an engine rejection");
  return rendered.error;
}

describe("figure redraw follow-up: preserve effective label text", () => {
  it("deduplicates an existing null-valued point-name label without adding a second A", async () => {
    const spec: DevAiFigureSpec = {
      version: 2,
      points: { A: [50, 50], B: [150, 50] },
      segments: { AB: ["A", "B"] },
      labels: { A: null, labelA: { point: "A", text: "A" } },
    };
    const before = structuredClone(spec);
    const error = await engineError(spec);
    expect(error).toContain("labels.labelA.point conflicts with its key");
    const fix = repairFigureSpec(spec, error, false);
    expect(fix).toBeDefined();
    expect(fix!.spec.points).toEqual(spec.points);
    const rendered = await renderFigureSpec(fix!.spec, options);
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) throw new Error(rendered.error);
    expect(printedLabels(rendered.svg)).toEqual(["A"]);
    expect(spec).toEqual(before);
  });

  it.each([undefined, null])(
    "preserves the point name when an additional label has text=%s",
    async (text) => {
      const spec: DevAiFigureSpec = {
        version: 2,
        points: { A: [50, 50], B: [150, 50] },
        segments: { AB: ["A", "B"] },
        labels: {
          A: "30°",
          labelA: { point: "A", ...(text === null ? { text } : {}) },
        },
      };
      const before = structuredClone(spec);
      const error = await engineError(spec);
      expect(error).toContain("labels.labelA.point conflicts with its key");

      // Python defines missing/null text as the referenced point name.
      const reference = await renderFigureSpec(
        { ...spec, labels: { A: text === null ? { text } : {} } },
        options,
      );
      expect(reference.ok).toBe(true);
      if (!reference.ok) throw new Error(reference.error);
      expect(printedLabels(reference.svg)).toEqual(["A"]);

      // Only inference and image comparison are stubbed; rendering/repair are real.
      const inference = vi.fn(async ({ phase }: { phase: string }) =>
        JSON.stringify(
          phase === "generate" ? { spec } : { passed: true, issues: [] },
        ),
      );
      const result = await redrawDevAiFigure(request, undefined, inference);
      expect(printedLabels(result.svg!).sort()).toEqual(["30°", "A"]);
      expect(result.warnings).toEqual([]);
      expect(inference.mock.calls.map(([call]) => call.phase)).toEqual([
        "generate",
        "review",
      ]);
      expect(spec).toEqual(before);
    },
  );

  it.each(["", 0, false])(
    "does not erase an additional label with invalid text=%s",
    async (text) => {
      const spec: DevAiFigureSpec = {
        version: 2,
        points: { A: [50, 50], B: [150, 50] },
        segments: { AB: ["A", "B"] },
        labels: { A: "A", labelA: { point: "A", text } },
      };
      const before = structuredClone(spec);
      const error = await engineError(spec);
      expect(error).toContain("labels.labelA.point conflicts with its key");
      for (const allowDrop of [false, true])
        expect(repairFigureSpec(spec, error, allowDrop)).toBeUndefined();
      expect(spec).toEqual(before);
    },
  );
});

describe("figure redraw follow-up: dimension aliases", () => {
  it("repairs equal aliases without changing another dimension's null-offset curvature", async () => {
    const first = {
      points: ["A", "B"],
      label: "5",
      offset: 10,
      curvature: 10,
    };
    const second = {
      points: ["C", "D"],
      label: "7",
      offset: null,
      curvature: 40,
    };
    const spec: DevAiFigureSpec = {
      version: 2,
      points: { A: [50, 50], B: [150, 50], C: [50, 200], D: [150, 200] },
      segments: { AB: ["A", "B"], CD: ["C", "D"] },
      dimensions: { first, second },
    };
    const before = structuredClone(spec);
    const error = await engineError(spec);
    expect(error).toContain("dimension provides both offset and curvature");
    const fix = repairFigureSpec(spec, error, false);
    expect(fix).toBeDefined();
    expect(spec).toEqual(before);
    expect(fix!.spec.dimensions).toEqual({
      first: { points: ["A", "B"], label: "5", offset: 10 },
      second,
    });
    const rendered = await renderFigureSpec(fix!.spec, options);
    const reference = await renderFigureSpec(
      {
        ...spec,
        dimensions: {
          first: { points: ["A", "B"], label: "5", offset: 10 },
          second,
        },
      },
      options,
    );
    expect(rendered.ok).toBe(true);
    expect(rendered).toEqual(reference);
  });

  it.each([false, true])(
    "leaves conflicting dimension aliases for inference (allowDrop=%s)",
    async (allowDrop) => {
      const spec: DevAiFigureSpec = {
        version: 2,
        points: { A: [50, 50], B: [150, 50] },
        segments: { AB: ["A", "B"] },
        dimensions: {
          d: { points: ["A", "B"], label: "5", offset: 10, curvature: 40 },
        },
      };
      const before = structuredClone(spec);
      const error = await engineError(spec);
      expect(error).toContain("dimension provides both offset and curvature");
      expect(repairFigureSpec(spec, error, allowDrop)).toBeUndefined();
      expect(spec).toEqual(before);
    },
  );
});

describe("figure redraw follow-up: graph aspect ratio", () => {
  it("teaches the padded plotting ratio and renders its square without distortion", async () => {
    const prompt = buildFigureSpecPrompt(request);
    expect(prompt).toMatch(/width\s*-\s*96/);
    expect(prompt).toMatch(/height\s*-\s*96/);
    expect(prompt).not.toContain(
      "Keep width:height equal to the xRange:yRange span ratio so squares stay square",
    );
    const result = await renderFigureSpec(
      {
        version: "graph-1",
        xRange: [0, 2],
        yRange: [0, 1],
        // (504 - 96) / (300 - 96) = 2 / 1.
        width: 504,
        height: 300,
        axes: false,
        polygons: [
          {
            points: [
              [0.5, 0.25],
              [1, 0.25],
              [1, 0.75],
              [0.5, 0.75],
            ],
          },
        ],
      },
      options,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    const polygon = /<polygon\b[^>]*\bpoints="([^"]+)"/.exec(result.svg);
    expect(polygon).not.toBeNull();
    const coordinates = polygon![1].split(/[\s,]+/).map(Number);
    const width = Math.abs(coordinates[2] - coordinates[0]);
    const height = Math.abs(coordinates[5] - coordinates[3]);
    expect(width).toBe(102);
    expect(height).toBe(width);
  });
});

describe("figure redraw follow-up: constructed circle angles", () => {
  it.each([
    [30, -25],
    [-30, 25],
  ])(
    "matches the documented y-down exception for on_circle angle %s",
    async (angle, expectedDeltaY) => {
      const prompt = buildFigureSpecPrompt(request);
      expect(prompt).toContain(
        "on_circle angle/angle_deg uses mathematical degrees",
      );
      expect(prompt).toMatch(/y\s*=\s*cy\s*-\s*r\s*\*\s*sin\(angle\)/);
      expect(prompt).toContain("+90 is above, -90 is below");
      const result = await renderFigureSpec(
        {
          version: 2,
          points: {
            O: [150, 150],
            P: { type: "on_circle", circle: "c", angle },
          },
          circles: { c: { center: "O", radius: 50 } },
          segments: { OP: ["O", "P"] },
        },
        options,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error);
      const line = /<line\b[^>]*>/.exec(result.svg)?.[0];
      expect(line).toBeDefined();
      const attr = (name: string) =>
        Number(new RegExp(`${name}="([^"]+)"`).exec(line!)?.[1]);
      expect(attr("x2")).toBeGreaterThan(attr("x1"));
      expect(attr("y2") - attr("y1")).toBeCloseTo(expectedDeltaY, 3);
    },
  );
});
