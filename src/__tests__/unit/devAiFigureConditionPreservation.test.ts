// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DevAiFigureSpec, DevAiRequest } from "@/lib/dev-ai/contracts";
import {
  redrawDevAiFigure,
  type FigureInference,
} from "@/lib/dev-ai/figure-engine";
import { ENGINE_FAILURES, repairFigureSpec } from "@/lib/dev-ai/figure-repair";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));
beforeEach(() => vi.clearAllMocks());
const input: DevAiRequest = {
  action: "figure-redraw",
  provider: "codex",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "원본 도형 재작도",
};
const triangle: DevAiFigureSpec = {
  version: 2,
  points: { A: [50, 30], B: [50, 210], C: [290, 210] },
  segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
  angles: { right_B: { vertex: "B", points: ["A", "C"], right: true } },
};
// Reproduces the reported engine errors, not the unavailable original model spec.
const offRight: DevAiFigureSpec = {
  ...triangle,
  points: {
    A: [50, 30],
    B: [50, 210],
    C: [290, 210 + 240 * Math.tan((9.33 * Math.PI) / 180)],
  },
};
const missingRay: DevAiFigureSpec = {
  version: 2,
  points: { O: [50, 210], A: [50, 30], B: [290, 210] },
  segments: { OB: ["O", "B"], AB: ["A", "B"] },
  angles: { ang_O: { vertex: "O", points: ["A", "B"], label: "θ" } },
};

describe("reported redraw condition failures", () => {
  it.each([
    [offRight, /right_B.*99\.33°/, ENGINE_FAILURES.rightAngleOff],
    [missingRay, /ang_O.*ray to 'A'/, ENGINE_FAILURES.rayNotDrawn],
  ])(
    "retains the rejected geometry on every repair stage",
    async (spec, message, pattern) => {
      const before = structuredClone(spec);
      const rendered = await renderFigureSpec(spec, {
        typeset: false,
        strict: true,
      });
      expect(rendered.ok).toBe(false);
      if (rendered.ok) throw new Error("fixture must fail");
      expect(rendered.error).toMatch(message);
      expect(rendered.error).toMatch(pattern);
      for (const allowDrop of [false, true])
        expect(
          repairFigureSpec(spec, rendered.error, allowDrop),
        ).toBeUndefined();
      expect(spec).toEqual(before);
    },
  );

  it("accepts source-guided coordinate correction with the right marker still present", async () => {
    const inference = vi
      .fn<FigureInference>()
      .mockResolvedValueOnce(JSON.stringify({ spec: offRight }))
      .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
      .mockResolvedValueOnce(JSON.stringify({ passed: true, issues: [] }));
    const result = await redrawDevAiFigure(input, undefined, inference);
    expect(inference.mock.calls.map(([call]) => call.phase)).toEqual([
      "generate",
      "generate",
      "review",
    ]);
    expect(inference.mock.calls[1][0].prompt).toContain('"right":true');
    expect(inference.mock.calls[1][0].prompt).toContain("99.33°");
    expect(result.spec?.angles).toEqual(triangle.angles);
    expect(result.figureReview?.passed).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it.each([offRight, missingRay])(
    "rejects the whole operation when two failed reviews end in an engine failure",
    async (finalSpec) => {
      const inference = vi
        .fn<FigureInference>()
        .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
        .mockResolvedValueOnce(
          JSON.stringify({
            passed: false,
            issues: ["원본의 선분 위치가 다릅니다."],
          }),
        )
        .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
        .mockResolvedValueOnce(
          JSON.stringify({
            passed: false,
            issues: ["각 표시를 원본과 맞춰 주세요."],
          }),
        )
        .mockResolvedValueOnce(JSON.stringify({ spec: finalSpec }));
      await expect(
        redrawDevAiFigure(input, undefined, inference),
      ).rejects.toMatchObject({
        message: expect.stringContaining("원본은 유지됩니다"),
        detail: expect.stringMatching(/right_B|ang_O/),
      });
      expect(inference.mock.calls.map(([call]) => call.phase)).toEqual([
        "generate",
        "review",
        "generate",
        "review",
        "generate",
      ]);
    },
  );
});
