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

  // 추론이 취소 신호까지 안 끝나는 대역 — 줄 서기·시간 초과 시험용
  const pendingUntilAbort = ({ signal }: { signal?: AbortSignal }) =>
    new Promise<string>((_resolve, reject) => {
      if (!signal || signal.aborted) return reject(abortError());
      signal.addEventListener("abort", () => reject(abortError()), {
        once: true,
      });
    });
  // 동시 호출 시험은 추론을 직접 주입한다 — vitest 는 모킹한 «./cli» 를 동시에 동적 import 하면
  // 두 번째 호출에 진짜 모듈을 준다(2026-09-18 실측). 운영 경로는 모킹이 없어 무관하다.
  const inject = (request: DevAiRequest, signal?: AbortSignal) =>
    redrawDevAiFigure(request, signal, (call) =>
      run({ ...call, provider: request.provider, model: request.model }),
    );

  // 결함 3(2026-09-18): 240초 시계가 도형 칸을 얻기 전에 켜져, 줄 서서 기다린 시간이 예산에서 깎였다
  it("starts the 240 second budget only after a figure slot is granted, and cancels while queued", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    run.mockImplementation(pendingUntilAbort);
    const controllers = Array.from({ length: 4 }, () => new AbortController());
    const [first, second, third, queued] = controllers;
    try {
      const a = inject(input, first.signal).catch((e: Error) => e);
      const b = inject(input, second.signal).catch((e: Error) => e);
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
      const c = inject(input, third.signal).catch((e: Error) => e);
      // 줄에서 238초를 기다린다 — 아직 추론은 두 건뿐
      await vi.advanceTimersByTimeAsync(238_000);
      expect(run).toHaveBeenCalledTimes(2);
      // 줄에 선 채로 취소하면 곧바로 끝난다
      const d = inject(input, queued.signal).catch((e: Error) => e);
      queued.abort();
      expect(await d).toMatchObject({ code: "cancelled" });
      expect(run).toHaveBeenCalledTimes(2);
      first.abort();
      expect(await a).toMatchObject({ code: "cancelled" });
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(3));
      // 칸을 얻은 뒤 200초 — 옛 코드는 여기서 이미 «오래 걸려»로 끝났다
      await vi.advanceTimersByTimeAsync(200_000);
      let settled = false;
      void c.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(40_001);
      expect(await c).toMatchObject({
        message: expect.stringContaining("오래 걸려 원본을 유지"),
      });
      // 처음부터 칸을 쥔 둘째는 자기 예산 240초가 이미 끝났다
      expect(await b).toMatchObject({
        message: expect.stringContaining("오래 걸려 원본을 유지"),
      });
    } finally {
      // 시험이 중간에 죽어도 도형 칸을 남기지 않는다
      controllers.forEach((controller) => controller.abort());
    }
  });

  // 결함 4(2026-09-18): 1바퀴 렌더가 성공하고 대조만 불합격한 뒤 2바퀴가 240초를 넘기면 전부 버렸다
  it("returns the last successful render with a warning when the retry runs out of time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const issue = "점 D 위치를 원본과 맞춰 주세요.";
    run.mockImplementation(async ({ prompt, signal }) => {
      if (prompt.includes("<rendered-spec-data>"))
        return JSON.stringify({ passed: false, issues: [issue] });
      if (prompt.includes("<previous-spec-data>"))
        return pendingUntilAbort({ signal });
      return JSON.stringify({ spec: triangle });
    });
    const result = inject(input);
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(3));
    await vi.advanceTimersByTimeAsync(240_001);
    const value = await result;
    expect(value.spec).toEqual(triangle);
    expect(validDevAiSvg(value.svg!)).toBe(true);
    expect(value.engine).toBe("todays-math-python");
    expect(value.figureReview).toEqual({
      mode: "source-and-rendered-images",
      passed: false,
      issues: [issue],
    });
    expect(value.warnings).toContain(`원본 대조 확인 필요: ${issue}`);
    expect(value.warnings.join(" ")).toContain("오래 걸려");
  });

  it("returns the render with a warning when the review itself runs out of time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    run.mockImplementation(async ({ prompt, signal }) =>
      prompt.includes("<rendered-spec-data>")
        ? pendingUntilAbort({ signal })
        : JSON.stringify({ spec: triangle }),
    );
    const result = inject(input);
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(240_001);
    const value = await result;
    expect(value.spec).toEqual(triangle);
    expect(value.figureReview).toEqual({
      mode: "source-and-rendered-images",
      passed: false,
      issues: [],
    });
    expect(
      value.warnings.some((w) => w.startsWith("원본 대조 확인 필요: ")),
    ).toBe(true);
    expect(value.warnings.join(" ")).toContain("오래 걸려");
  });

  it("still keeps the original when a user cancels after a successful render", async () => {
    const user = new AbortController();
    run.mockImplementation(async ({ prompt, signal }) => {
      if (prompt.includes("<rendered-spec-data>")) {
        user.abort();
        return pendingUntilAbort({ signal });
      }
      return JSON.stringify({ spec: triangle });
    });
    await expect(inject(input, user.signal)).rejects.toMatchObject({
      code: "cancelled",
    });
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
