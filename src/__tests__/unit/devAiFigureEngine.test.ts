// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import catalog from "../../../scripts/figure/engine-catalog.json";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { abortError } from "@/lib/dev-ai/cli-process";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import { parseFigureSpecResult } from "@/lib/dev-ai/figure-spec";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { validDevAiSvg } from "@/lib/dev-ai/svg";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildFigureComparisonImage } from "@/lib/dev-ai/figure-comparison";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));
const input: DevAiRequest = {
  action: "figure-redraw",
  provider: "claude",
  grade: "중3",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "원본 도형을 또렷하게 재작도",
};
const triangle = catalog.v2_example;
const pass = JSON.stringify({ passed: true, issues: [] });
const run = vi.mocked(runSubscriptionCli);
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("real local Python subscription figure pipeline", () => {
  it("renders the actual v2 engine, keeps source/labels, and returns the public SVG contract", async () => {
    const before = structuredClone(input);
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(result).toMatchObject({
      content: "",
      answer: "",
      solution: "",
      spec: triangle,
      engine: "todays-math-python",
      figureReview: {
        mode: "source-and-rendered-images",
        passed: true,
        issues: [],
      },
    });
    expect(validDevAiSvg(result.svg!)).toBe(true);
    for (const label of ["A", "B", "C", "3"])
      expect(result.svg).toContain(`>${label}<`);
    expect(result.svg).not.toContain("stroke-dasharray");
    expect(input).toEqual(before);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls.every(([args]) => args.provider === "claude")).toBe(
      true,
    );
    expect(run.mock.calls[0][0].imageDataUrl).toBe(before.imageDataUrl);
    expect(run.mock.calls[1][0].imageDataUrl).toBe(
      "data:image/png;base64,Y29tcGFyaXNvbg==",
    );
    expect(buildFigureComparisonImage).toHaveBeenCalledWith(
      before.imageDataUrl,
      result.svg,
      expect.any(AbortSignal),
    );
    expect(run.mock.calls[0][0].prompt).toContain("Never output SVG");
    expect(run.mock.calls[1][0].prompt).toContain("actual pixels");
  });

  it.each([
    ["annotated graph", catalog["graph-1"].example],
    [
      "elementary chart",
      {
        version: "elem-1",
        kind: "barChart",
        values: [
          { label: "가", value: 3 },
          { label: "나", value: 5 },
        ],
        yMax: 6,
        yStep: 1,
      },
    ],
    ["solid", { version: "elem-1", kind: "cuboid", w: 4, d: 3, h: 2 }],
    [
      "shaded arc",
      {
        version: 2,
        points: { O: [100, 100], A: [160, 100], B: [100, 40] },
        circles: { c: { center: "O", radius: 60, draw: false } },
        regions: {
          sector: {
            boundary: [
              { seg: ["O", "A"] },
              { arc: { circle: "c", from: "A", to: "B", dir: "ccw" } },
              { seg: ["B", "O"] },
            ],
            fill: "#f2d5c8",
          },
        },
      },
    ],
    [
      "LaTeX labels",
      {
        ...catalog["graph-1"].example,
        labels: [{ at: [0, 5], text: "$\\frac{3}{2}$" }],
      },
    ],
  ])("connects the existing deterministic %s renderer", async (_name, spec) => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(validDevAiSvg(result.svg!)).toBe(true);
    expect(result.svg).not.toMatch(/<image\b|<script\b|\sonload\s*=/);
    if (_name === "annotated graph") {
      expect((result.svg!.match(/<line\b/g) ?? []).length).toBeGreaterThan(2);
      expect(result.svg).toContain("y = 9");
      expect(result.svg).toContain("<path");
    }
  });

  it("repairs a Python-rejected right angle using the original source and real diagnostic", async () => {
    const bad = structuredClone(triangle);
    bad.points.C = [290, 160];
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: bad }))
      .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(result.spec).toEqual(triangle);
    expect(run).toHaveBeenCalledTimes(3);
    expect(run.mock.calls[1][0].prompt).toContain("<previous-spec-data>");
    expect(run.mock.calls[1][0].prompt).toContain("perpendicular");
  });

  it("rejects an invalid spec after three attempts without falling back to model SVG", async () => {
    run.mockResolvedValue(
      JSON.stringify({
        spec: {
          version: 2,
          points: { A: [0, 0] },
          segments: { AB: ["A", "missing"] },
        },
        svg: "<svg><circle/></svg>",
      }),
    );
    await expect(redrawDevAiFigure(input)).rejects.toThrow("원본은 유지");
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("repairs clear source review issues and retains bounded warnings after the final review", async () => {
    run.mockImplementation(async ({ prompt }) =>
      prompt.includes("<rendered-spec-data>")
        ? JSON.stringify({
            passed: false,
            issues: ["인쇄된 점 D를 원본과 비교해 주세요.\nnext label"],
          })
        : JSON.stringify({ spec: triangle }),
    );
    const result = await redrawDevAiFigure(input);
    expect(run).toHaveBeenCalledTimes(6);
    expect(result.figureReview?.passed).toBe(false);
    expect(result.figureReview?.issues[0]).toBe(
      "인쇄된 점 D를 원본과 비교해 주세요.\nnext label",
    );
    expect(result.warnings.join(" ")).toContain("인쇄된 점 D");
    expect(validDevAiSvg(result.svg!)).toBe(true);
  });

  it.each([
    "not JSON",
    JSON.stringify({ svg: "<svg><circle/></svg>" }),
    JSON.stringify({ spec: null, note: "지원하지 않는 삽화입니다." }),
  ])("does not infer SVG success from unusable output %s", async (raw) => {
    run.mockResolvedValue(raw);
    await expect(redrawDevAiFigure(input)).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("never switches provider or retries a subscription failure", async () => {
    run.mockRejectedValueOnce(new Error("구독 한도"));
    await expect(redrawDevAiFigure(input)).rejects.toThrow("구독 한도");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("cancels before inference, during inference, and during a real Python render", async () => {
    const stopped = new AbortController();
    stopped.abort();
    await expect(
      redrawDevAiFigure(input, stopped.signal),
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(run).not.toHaveBeenCalled();
    const active = new AbortController();
    run.mockImplementationOnce(async ({ signal }) => {
      active.abort();
      expect(signal?.aborted).toBe(true);
      throw abortError();
    });
    await expect(redrawDevAiFigure(input, active.signal)).rejects.toMatchObject(
      { code: "cancelled" },
    );
    const python = new AbortController();
    const rendered = renderFigureSpec(triangle, { signal: python.signal });
    python.abort();
    expect(await rendered).toMatchObject({
      ok: false,
      error: "도형 생성이 취소되었습니다",
    });
  });

  it("enforces the 240 second whole-pipeline deadline", async () => {
    vi.useFakeTimers();
    run.mockImplementationOnce(
      ({ signal }) =>
        new Promise((_resolve, reject) =>
          signal!.addEventListener("abort", () => reject(abortError()), {
            once: true,
          }),
        ),
    );
    const result = expect(redrawDevAiFigure(input)).rejects.toThrow(
      "오래 걸려 원본을 유지",
    );
    await vi.advanceTimersByTimeAsync(240001);
    await result;
  });

  it.each([
    { ...catalog["graph-1"].example, svg: "<svg/>" },
    { ...catalog["graph-1"].example, axes: "false" },
    {
      ...catalog["graph-1"].example,
      curves: [{ type: "code", coefficients: [1] }],
    },
    {
      ...catalog["graph-1"].example,
      segments: [{ from: [0, 0], to: [1, 1], url: "https://example.com" }],
    },
  ])(
    "fails unsupported graph fields instead of silently dropping them",
    async (spec) => {
      const result = await renderFigureSpec(spec, {
        typeset: false,
        strict: true,
      });
      expect(result.ok).toBe(false);
    },
  );
});

describe("figure spec transport boundary", () => {
  it.each([
    {},
    { spec: [] },
    { spec: { version: "3" } },
    { spec: { version: 2, label: "가".repeat(24000) } },
  ])("rejects missing, unsupported and oversized specs", (value) => {
    expect(() => parseFigureSpecResult(JSON.stringify(value))).toThrow("스펙");
  });
  it("rejects nesting before recursive metrics work", () => {
    let nested: object = {};
    for (let i = 0; i < 40; i++) nested = { child: nested };
    expect(() =>
      parseFigureSpecResult(JSON.stringify({ spec: { version: 2, nested } })),
    ).toThrow();
  });
});
