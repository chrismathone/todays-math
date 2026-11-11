// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import catalog from "../../../scripts/figure/engine-catalog.json";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { abortError } from "@/lib/dev-ai/cli-process";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import {
  parseFigureSpecResult,
  withTransparentBackground,
} from "@/lib/dev-ai/figure-spec";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { withLabelMetrics } from "@/lib/figure/mathjaxSubstitute";
import { validDevAiSvg } from "@/lib/dev-ai/svg";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { buildFigureComparisonImage } from "@/lib/dev-ai/figure-comparison";
import conceptMap from "../fixtures/quadrilateral-concept-map.spec.json";

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
// 작업실 재작도는 v2 바탕을 투명으로 고정해 저장한다(2026-09-19 — 흰 바탕 rect 가 편집기 1번 «사각형»이 됐다)
const transparent = (spec: object) => ({ ...spec, background: "transparent" });
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
    // 65.4° — 90° 에서 15° 넘게 빗나가 서버가 표시를 빼지 않고 모델에게 기하를 고치게 한다(figure-repair.ts)
    bad.points.C = [290, 100];
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: bad }))
      .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(result.spec).toEqual(transparent(triangle));
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

  // 원장님 2026-09-19 «원본 대조 멘트는 생성하지 마» — 대조와 그 결과로 두 번 다시 그리는 것은 그대로,
  // 끝까지 안 맞았을 때 warnings 에 넣던 «원본 대조 확인 필요: …» 문구만 없앤다. figureReview 는 싣는다(저장 형식).
  it("repairs clear source review issues twice, then keeps the review data without a source-comparison warning", async () => {
    const issue = "인쇄된 점 D를 원본과 비교해 주세요.\nnext label";
    run.mockImplementation(async ({ prompt }) =>
      prompt.includes("<rendered-spec-data>")
        ? JSON.stringify({ passed: false, issues: [issue] })
        : JSON.stringify({
            spec: triangle,
            warnings: ["변 BC 의 길이 표시가 흐립니다."],
          }),
    );
    const result = await redrawDevAiFigure(input);
    expect(run).toHaveBeenCalledTimes(6);
    expect(
      run.mock.calls.map(([args]) =>
        args.prompt.includes("<rendered-spec-data>") ? "review" : "generate",
      ),
    ).toEqual([
      "generate",
      "review",
      "generate",
      "review",
      "generate",
      "review",
    ]);
    // 다시 그릴 때 대조 지적을 모델에게 넘기는 것은 그대로다
    for (const call of [2, 4])
      expect(run.mock.calls[call][0].prompt).toContain(
        "원본 대조: 인쇄된 점 D를 원본과 비교해 주세요.",
      );
    expect(result.figureReview).toEqual({
      mode: "source-and-rendered-images",
      passed: false,
      issues: [issue],
    });
    // 모델이 스스로 낸 경고만 남는다
    expect(result.warnings).toEqual(["변 BC 의 길이 표시가 흐립니다."]);
    expect(result.warnings.join(" ")).not.toContain("원본 대조");
    expect(result.warnings.join(" ")).not.toContain("인쇄된 점 D");
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

  // 원장님 2026-09-18 «도형 AI 추론 강도 하자» — 작업실 세션 실측(그림 1662/q08): Codex astra 사양 생성 xhigh 242초 ·
  // medium 65초 · 대조 xhigh 26초 · medium 7~9초. xhigh 로는 사양 생성 한 번이 240초 도형 예산을 넘긴다.
  it("runs both the spec generation and the source review at medium reasoning effort", async () => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
      .mockResolvedValueOnce(pass);
    await redrawDevAiFigure(input);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls.map(([args]) => args.reasoningEffort)).toEqual([
      "medium",
      "medium",
    ]);
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
  // 가짜 시계에서 호출 수를 기다린다 — **시간을 밀지 않고**. vi.waitFor 는 가짜 시계를 쓰면 기다리는 동안 시계를 밀어,
  // 그 사이의 진짜 Python 렌더가 느리면(CPU 100% — 2026-09-18) 렌더 자체 제한 시간이 먼저 울려 «생성이 시간 안에 안 끝남»으로 빨갰다.
  // setImmediate·performance 는 가짜가 아니다(toFake 밖).
  const untilCalled = async (count: number, limitMs = 60_000) => {
    const started = performance.now();
    while (run.mock.calls.length < count) {
      if (performance.now() - started > limitMs)
        throw new Error(
          `추론 ${count}번을 ${limitMs}ms 안에 못 봤다(${run.mock.calls.length}번)`,
        );
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
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
    await untilCalled(3);
    await vi.advanceTimersByTimeAsync(240_001);
    const value = await result;
    expect(value.spec).toEqual(transparent(triangle));
    expect(validDevAiSvg(value.svg!)).toBe(true);
    expect(value.engine).toBe("todays-math-python");
    expect(value.figureReview).toEqual({
      mode: "source-and-rendered-images",
      passed: false,
      issues: [issue],
    });
    // 원장님 2026-09-19 — 대조 멘트는 없다. 시간 초과 안내는 대조 멘트가 아니라서 남는다.
    expect(value.warnings).toEqual([
      "도형 재작도가 오래 걸려 마지막으로 그린 결과를 사용합니다.",
    ]);
  });

  it("returns the render with a warning when the review itself runs out of time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    run.mockImplementation(async ({ prompt, signal }) =>
      prompt.includes("<rendered-spec-data>")
        ? pendingUntilAbort({ signal })
        : JSON.stringify({ spec: triangle }),
    );
    const result = inject(input);
    await untilCalled(2);
    await vi.advanceTimersByTimeAsync(240_001);
    const value = await result;
    expect(value.spec).toEqual(transparent(triangle));
    expect(value.figureReview).toEqual({
      mode: "source-and-rendered-images",
      passed: false,
      issues: [],
    });
    expect(value.warnings).toEqual([
      "도형 재작도가 오래 걸려 마지막으로 그린 결과를 사용합니다.",
    ]);
  });

  // 리드 결정 2026-09-19: 운영 처리기(handler.ts)의 240초는 요청 시작부터, 도형 쪽 240초는 칸을 얻은 뒤부터라
  // 처리기가 먼저 끊어 504 가 됐다 — 결함 4(마지막 렌더 돌려주기)가 운영에서 닿지 않았다.
  // 도형 쪽 마감 = min(칸을 얻은 뒤 240초, 처리기 끝 시각 − 10초).
  it.each([
    ["the handler leaves 100 s", 100_000, 90_000],
    ["the handler leaves 400 s", 400_000, 240_000],
  ])(
    "stops before the handler when %s, still returning the last render",
    async (_name, left, stopsAt) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
      run.mockImplementation(async ({ prompt, signal }) => {
        if (prompt.includes("<rendered-spec-data>"))
          return JSON.stringify({ passed: false, issues: ["점 D"] });
        if (prompt.includes("<previous-spec-data>"))
          return pendingUntilAbort({ signal });
        return JSON.stringify({ spec: triangle });
      });
      const result = redrawDevAiFigure(
        input,
        undefined,
        (call) =>
          run({ ...call, provider: input.provider, model: input.model }),
        Date.now() + left,
      );
      await untilCalled(3);
      let settled = false;
      void result.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(stopsAt - 1_000);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1_001);
      // 시계를 더 밀지 않고 기다린다 — 밀면 240초 시계가 울려 고치기 전에도 초록이 된다
      const waited = performance.now();
      while (!settled && performance.now() - waited < 5_000)
        await new Promise((resolve) => setImmediate(resolve));
      expect(settled).toBe(true);
      expect((await result).warnings).toEqual([
        "도형 재작도가 오래 걸려 마지막으로 그린 결과를 사용합니다.",
      ]);
    },
  );

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

// 원장님 2026-09-19 «충분히 우리 엔진으로 그릴 수 있을 것 같은데» — 사각형 관계 개념도를 모델이 두 번 «지원 엔진으로
// 표현할 수 없다»며 spec:null 로 포기했다(운영 로그). graph-1(axes:false)의 다각형·화살표 선분·한글 일반 글자로 그려진다.
// 사양은 픽스처 한 벌만 둔다 — 2026-09-20 에 리드가 눈으로 확인한 것을 옮겨 두었다(devAiFigureRefusal.test.ts 와 공유).
const CONCEPT_MAP = conceptMap;

describe("concept maps and flowcharts are drawn, not refused", () => {
  it("draws the quadrilateral concept map through the whole redraw pipeline", async () => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: CONCEPT_MAP }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(validDevAiSvg(result.svg!)).toBe(true);
    for (const text of [
      "사다리꼴",
      "평행사변형",
      "직사각형",
      "마름모",
      "정사각형",
      "㉠",
      "㉡",
      "㉢",
      "㉣",
      "㉤",
    ])
      expect(result.svg).toContain(`>${text}<`);
    // 상자 다섯 + 화살촉 다섯, 화살 줄기 다섯
    expect((result.svg!.match(/<polygon\b/g) ?? []).length).toBe(10);
    expect((result.svg!.match(/<line\b/g) ?? []).length).toBe(5);
  });

  it("tells the model to draw concept maps with graph-1 and to refuse only non-geometric images", async () => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: triangle }))
      .mockResolvedValueOnce(pass);
    await redrawDevAiFigure(input);
    const prompt = run.mock.calls[0][0].prompt;
    expect(prompt).toMatch(/concept maps?, flowcharts? and relation diagrams/i);
    for (const part of [
      "axes:false",
      "polygons",
      "arrow:true",
      "plain-text labels",
      "without $",
    ])
      expect(prompt).toContain(part);
    expect(prompt).toMatch(/spec:null ONLY/);
  });
});

// 원장님 2026-09-19 «도형 생성 시 사각형이 왜 생기나» — v2 엔진은 흰 바탕 rect 를 첫 도형으로 깐다
// (vendor/figure-engine/core/figure_scene.py:2906). 편집기가 그것을 1번 «사각형»으로 셌다. 엔진 기본값(white)은
// 지면·DB 그림 바이트가 걸려 그대로 두고, 작업실 재작도만 투명으로 넘긴다.
describe("studio redraw renders v2 on a transparent canvas", () => {
  const rects = (svg?: string) => (svg?.match(/<rect\b/g) ?? []).length;
  const canvas = { width: 340, height: 250 };

  it("the engine default still paints a white background rect", async () => {
    const rendered = await renderFigureSpec(withLabelMetrics(triangle), {
      typeset: false,
      strict: true,
    });
    expect(rendered.ok && rects(rendered.svg)).toBe(1);
  });

  it.each([
    ["no background", triangle],
    ["a white background", { ...triangle, background: "white" }],
    [
      "a white canvas background",
      { ...triangle, canvas: { ...canvas, background: "white" } },
    ],
    [
      "both backgrounds",
      {
        ...triangle,
        background: "white",
        canvas: { ...canvas, background: "white" },
      },
    ],
    ["an array canvas", { ...triangle, canvas: [340, 250] }],
  ])(
    "renders a v2 spec with %s transparently and stores that spec",
    async (_name, spec) => {
      run
        .mockResolvedValueOnce(JSON.stringify({ spec }))
        .mockResolvedValueOnce(pass);
      const result = await redrawDevAiFigure(input);
      // 배경 충돌(«background conflicts with canvas.background»)로 다시 그리지 않았다
      expect(run).toHaveBeenCalledTimes(2);
      expect(rects(result.svg)).toBe(0);
      expect(result.spec).toMatchObject({ background: "transparent" });
      const stored = (result.spec as { canvas?: unknown }).canvas;
      if (stored && !Array.isArray(stored))
        expect(stored).toMatchObject({ background: "transparent" });
      // 대조 단계도 저장될 spec 을 본다
      expect(run.mock.calls[1][0].prompt).toContain(
        '"background":"transparent"',
      );
      // 저장된 spec 을 다시 그려도 같은 그림이다
      const again = await renderFigureSpec(withLabelMetrics(result.spec!), {
        typeset: false,
        strict: true,
      });
      expect(again).toMatchObject({ ok: true, svg: result.svg });
    },
  );

  it.each([
    ["graph-1", catalog["graph-1"].example],
    ["elem-1", { version: "elem-1", kind: "cuboid", w: 4, d: 3, h: 2 }],
  ])("leaves %s specs as the model wrote them", async (_name, spec) => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(result.spec).toEqual(spec);
  });

  it("does not mutate the parsed model spec", () => {
    const spec = {
      version: 2 as const,
      background: "white",
      canvas: { ...canvas, background: "white" },
    };
    const before = structuredClone(spec);
    expect(withTransparentBackground(spec)).toEqual({
      version: 2,
      background: "transparent",
      canvas: { ...canvas, background: "transparent" },
    });
    expect(spec).toEqual(before);
  });
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
  it("reads the last spec object when the model writes its reasoning first (운영 2026-11-11 Sonnet 5.5)", () => {
    const spec = {
      spec: {
        version: "graph-1",
        xRange: [-7.2, 6.2],
        labels: [{ text: "{x}" }],
      },
      note: "",
      warnings: [],
    };
    const raw = `I estimated pixel positions {roughly}. Recomputing: {"spec": draft} was wrong.\n\n${JSON.stringify(spec)}`;
    expect(parseFigureSpecResult(raw).spec).toEqual(spec.spec);
    // 코드펜스로 감싸도 읽는다
    expect(
      parseFigureSpecResult("```json\n" + JSON.stringify(spec) + "\n```").spec,
    ).toEqual(spec.spec);
    // 글만 있고 spec 덩어리가 없으면 여전히 읽지 못한다
    expect(() => parseFigureSpecResult("I could not draw it.")).toThrow("스펙");
    // 맨 앞이 `{` 인 잘린 응답 — 끝없이 돌지 않고 «읽지 못했다»로 끝난다(2026-11-11 무한 반복)
    expect(() =>
      parseFigureSpecResult('{"spec": {"version": "graph-1"'),
    ).toThrow("스펙");
  });
  it("rejects nesting before recursive metrics work", () => {
    let nested: object = {};
    for (let i = 0; i < 40; i++) nested = { child: nested };
    expect(() =>
      parseFigureSpecResult(JSON.stringify({ spec: { version: 2, nested } })),
    ).toThrow();
  });
});
