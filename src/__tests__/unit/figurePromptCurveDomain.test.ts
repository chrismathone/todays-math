// @vitest-environment node
/**
 * 🔴 RED → 🟢 — **재작도 지시문: 곡선 구간(domain)은 원본에서 읽는다** (원장님 2026-09-21).
 *
 * «원본은 함수의 좌우 끝이 높이가 같은데, 그림은 좌우 끝 높이가 다르게 그려졌어. 왜 그럴까?»
 * 원본은 꼭짓점(x≈1.1) 양쪽으로 고르게 뻗은 아래로 볼록한 포물선인데, 다시 그린 그림은 왼쪽을 더 멀리 뻗어
 * 왼쪽 끝이 훨씬 높았다. **엔진은 받은 domain 을 그대로 그렸다** — 모델이 곡선의 시작·끝 x 를 원본에서 읽지 않고
 * 잡았고, 지시문에는 곡선 구간을 어떻게 정하라는 말이 한 줄도 없었다(비율·기울기·현의 높이뿐). 대조 검수도
 * «곡선 모양»만 봐서 끝 높이가 어긋난 것을 지나쳤다.
 *
 * 무엇을 잠그나 — 유료 AI 는 부르지 않는다. 지시문 **문장**과 흐름의 배선을 잠근다.
 * - 규칙은 다시 그리기 지시문에 **한 벌만** 있다(첫 판·되고치기 판·반박 판 모두). 손대다 두 벌이 되면 빨개진다 —
 *   같은 말을 다른 말로 한 벌 더 적어도 산문에서 `domain` 을 말하는 줄이 둘이 되어 걸린다.
 * - 대조 검수 지시문도 곡선 양 끝 높이를 **한 번** 본다(어긋나면 되고치기로 이어진다).
 * - **대칭으로 고쳐 주는 후처리는 없다** — 원본이 일부러 비대칭일 수 있다. 모델이 낸 비대칭 domain 은 그대로 그려진다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import {
  buildFigureReviewPrompt,
  buildFigureSpecPrompt,
} from "@/lib/dev-ai/figure-prompt";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: vi.fn() }));
vi.mock("@/lib/dev-ai/figure-comparison", () => ({
  buildFigureComparisonImage: vi.fn(
    async () => "data:image/png;base64,Y29tcGFyaXNvbg==",
  ),
}));
const run = vi.mocked(runSubscriptionCli);
beforeEach(() => vi.clearAllMocks());

/** 다시 그리기 지시문의 규칙 — 이 문장이 지시문 전체(계약 포함)에 한 번만 나와야 한다. */
const RULE = "domain is where the PRINTED curve actually starts and ends";
/** 대조 검수의 한 줄 — 검수 지시문에 한 번만. */
const CHECK = "compare where its two printed ends stop";

const count = (text: string, piece: string) => text.split(piece).length - 1;
/** 산문 — 계약 JSON·자료 블록 앞. 같은 규칙을 다른 말로 한 벌 더 적으면 여기서 `domain` 줄이 둘이 된다. */
const proseLines = (prompt: string, end: string) =>
  prompt.slice(0, prompt.indexOf(end)).split("\n");
const mentions = (lines: string[], word: RegExp) =>
  lines.filter((line) => word.test(line));

const input: DevAiRequest = {
  action: "figure-redraw",
  provider: "claude",
  grade: "중3",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "원본 도형을 또렷하게 재작도",
};
/** y = x² − 2.2x + 1 (꼭짓점 x = 1.1). domain [−1, 3] 은 왼쪽을 더 뻗는다 — 왼쪽 끝 4.2, 오른쪽 끝 3.4. */
const parabola = (domain: [number, number]) => ({
  version: "graph-1",
  xRange: [-2, 4],
  yRange: [-1, 5],
  curves: [{ coefficients: [1, -2.2, 1], domain }],
});
const lopsided = parabola([-1, 3]);
const even = parabola([-0.8, 3]); // 1.1 ± 1.9 — 양 끝 3.4
const pass = JSON.stringify({ passed: true, issues: [] });

describe("다시 그리기 지시문 — 곡선 구간 규칙은 한 벌", () => {
  const variants: [string, string][] = [
    ["첫 판", buildFigureSpecPrompt(input)],
    [
      "되고치기 판",
      buildFigureSpecPrompt(input, {
        spec: lopsided,
        error: "원본 대조: 곡선 왼쪽 끝이 더 높다",
      }),
    ],
    [
      "반박 판",
      buildFigureSpecPrompt(input, undefined, "엔진이 곡선을 지원하지 않는다"),
    ],
  ];

  it.each(variants)("%s — 규칙 문장이 한 번만 있다", (_, prompt) => {
    expect(count(prompt, RULE)).toBe(1);
  });

  it.each(variants)(
    "%s — 산문에서 domain 을 말하는 줄은 그 한 줄뿐이다",
    (_, prompt) => {
      const lines = mentions(
        proseLines(prompt, "ENGINE CONTRACT:"),
        /\bdomain\b/,
      );
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain(RULE);
    },
  );

  it("양 끝은 원본에서 읽고, 대칭 곡선의 두 끝이 같은 높이면 꼭짓점을 가운데로 둔다", () => {
    const [line] = mentions(
      proseLines(buildFigureSpecPrompt(input), "ENGINE CONTRACT:"),
      /\bdomain\b/,
    );
    expect(line).toMatch(/original/);
    expect(line).toMatch(/same height/);
    expect(line).toMatch(/symmetric/);
    expect(line).toMatch(/vertex/);
  });
});

describe("대조 검수 지시문 — 곡선 양 끝 높이를 본다", () => {
  const prompt = buildFigureReviewPrompt(input, lopsided, "<svg/>");

  it("검수 문장이 한 번만 있다", () => {
    expect(count(prompt, CHECK)).toBe(1);
  });

  it("산문에서 곡선 끝 높이를 말하는 줄은 그 한 줄뿐이다", () => {
    const lines = mentions(
      proseLines(prompt, "<redraw-instructions-data>"),
      /\bends?\b.*\bheight|\bheight.*\bends?\b/,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(CHECK);
  });
});

describe("흐름 — 모델이 실제로 받는 지시문과 그려지는 곡선", () => {
  it("비대칭 domain 은 읽은 그대로 그린다 — 대칭으로 고치는 후처리가 없다", async () => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: lopsided }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    expect(count(run.mock.calls[0][0].prompt, RULE)).toBe(1);
    expect(count(run.mock.calls[1][0].prompt, CHECK)).toBe(1);
    expect(
      (result.spec as { curves: { domain: number[] }[] }).curves[0].domain,
    ).toEqual([-1, 3]);
    // 그려진 곡선의 양 끝 — 화면 y 가 작을수록 높다. 왼쪽 끝(4.2)이 오른쪽 끝(3.4)보다 높게 선다.
    const d = /<path\b[^>]*\bd="(M[^"]+)"/.exec(result.svg!)![1];
    const xy = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const [x0, y0] = xy;
    const [x1, y1] = xy.slice(-2);
    expect(x0).toBeLessThan(x1);
    expect(y0).toBeLessThan(y1 - 5);
  });

  it("대조가 끝 높이를 지적하면 되고치기 판에도 규칙은 한 벌이고, 그 지적이 실린다", async () => {
    run
      .mockResolvedValueOnce(JSON.stringify({ spec: lopsided }))
      .mockResolvedValueOnce(
        JSON.stringify({
          passed: false,
          issues: ["포물선 왼쪽 끝이 원본보다 높다 — 양 끝 높이를 같게"],
        }),
      )
      .mockResolvedValueOnce(JSON.stringify({ spec: even }))
      .mockResolvedValueOnce(pass);
    const result = await redrawDevAiFigure(input);
    const again = run.mock.calls[2][0].prompt;
    expect(count(again, RULE)).toBe(1);
    expect(again).toContain("양 끝 높이를 같게");
    expect(
      (result.spec as { curves: { domain: number[] }[] }).curves[0].domain,
    ).toEqual([-0.8, 3]);
  });
});
