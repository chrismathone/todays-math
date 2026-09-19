// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FigureEditCommandSchema } from "@/lib/dev-ai/figure-edit-contract";
import { buildFigureEditPrompt } from "@/lib/dev-ai/figure-edit-prompt";
import {
  FigureEditError,
  parseFigureEditResult,
} from "@/lib/dev-ai/figure-edit";
import { FIGURE_REASON_MAX } from "@/lib/dev-ai/figure-spec";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dev-ai/cli", () => ({ runSubscriptionCli: vi.fn() }));

/**
 * «요청대로 고치기» 표시 명령(원장님 2026-09-19 «추가할 수 있는 것 전부») — 치수 · 같은 길이 표시 · 평행 표시 · 겹 각.
 * 계약(수락/거절) · 지시문 한 줄씩 · 빈 명령 문구. 모델은 부르지 않는다.
 */
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "선분 AB 에 길이 7 치수 표시",
  figure: {
    viewBox: [0, 0, 300, 240],
    elements: [
      {
        n: 1,
        kind: "선분",
        points: [
          [0, 0],
          [100, 0],
        ],
      },
    ],
    names: [
      { name: "A", x: 0, y: 0 },
      { name: "B", x: 100, y: 0 },
    ],
  },
};

describe("표시 명령 스키마", () => {
  it.each([
    [{ op: "addDimension", from: "A", to: "B", text: "7" }],
    [{ op: "addDimension", from: "A", to: "B", text: "7 cm", side: "out" }],
    [
      {
        op: "addDimension",
        from: { x: 10, y: 20 },
        to: "B",
        text: "$x$",
        side: "below",
      },
    ],
    [{ op: "addTick", from: "A", to: "B" }],
    [{ op: "addTick", from: "A", to: "B", count: 3 }],
    [{ op: "addParallelMark", from: "A", to: "B" }],
    [{ op: "addParallelMark", from: "A", to: "B", count: 2 }],
    [{ op: "addAngle", at: "B", from: "A", to: "C", arcs: 2 }],
    [{ op: "addAngle", at: "B", from: "A", to: "C", arcs: 3, right: false }],
  ])("accepts %j", (command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
  });

  it.each([
    ["치수 값 없음", { op: "addDimension", from: "A", to: "B" }],
    ["치수 빈 값", { op: "addDimension", from: "A", to: "B", text: " " }],
    [
      "치수 모르는 쪽",
      { op: "addDimension", from: "A", to: "B", text: "7", side: "up" },
    ],
    ["눈금 끝 없음", { op: "addTick", from: "A" }],
    ["눈금 넷", { op: "addTick", from: "A", to: "B", count: 4 }],
    ["눈금 0", { op: "addTick", from: "A", to: "B", count: 0 }],
    ["눈금 소수", { op: "addTick", from: "A", to: "B", count: 1.5 }],
    ["평행 넷", { op: "addParallelMark", from: "A", to: "B", count: 4 }],
    [
      "평행 모르는 칸",
      { op: "addParallelMark", from: "A", to: "B", direction: "left" },
    ],
    ["호 넷", { op: "addAngle", at: "B", from: "A", to: "C", arcs: 4 }],
    ["호 0", { op: "addAngle", at: "B", from: "A", to: "C", arcs: 0 }],
  ])("rejects %s", (_name, command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(false);
  });
});

describe("지시문 — 명령마다 한 줄", () => {
  const prompt = buildFigureEditPrompt(request);
  const lineOf = (head: string) =>
    prompt.split("\n").filter((line) => line.startsWith(head));

  it("offers each mark in one short line", () => {
    for (const head of [
      '{"op":"addDimension","from":P,"to":P,"text":',
      '{"op":"addTick","from":P,"to":P,"count":',
      '{"op":"addParallelMark","from":P,"to":P,"count":',
    ]) {
      const lines = lineOf(head);
      expect(lines, head).toHaveLength(1);
      expect(lines[0].length, head).toBeLessThanOrEqual(260);
    }
    expect(lineOf('{"op":"addDimension"')[0]).toMatch(
      /"side":"out"\|"in"\|"above"\|"below"\|"left"\|"right"/,
    );
    expect(lineOf('{"op":"addParallelMark"')[0]).toMatch(/from[^\n]*to/);
  });

  it("offers nested arcs on the angle line, which stays one line", () => {
    const lines = lineOf('{"op":"addAngle"');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"arcs":1|2|3');
  });
});

describe("빈 명령 · 모델 응답", () => {
  it("names the marks among what can be done", () => {
    const error = (() => {
      try {
        parseFigureEditResult(JSON.stringify({ commands: [], note: "" }));
      } catch (e) {
        return e as FigureEditError;
      }
    })();
    expect(error).toBeInstanceOf(FigureEditError);
    expect(error!.message).toMatch(
      /할 수 있는 것: .*치수.*같은 길이 표시.*평행 표시/,
    );
    expect(error!.message.length).toBeLessThanOrEqual(FIGURE_REASON_MAX);
  });

  it("keeps mark commands from a model reply, reading null as not given", () => {
    expect(
      parseFigureEditResult(
        JSON.stringify({
          commands: [
            { op: "addDimension", from: "B", to: "C", text: "10", side: null },
            { op: "addTick", from: "A", to: "B", count: null },
            { op: "addParallelMark", from: "A", to: "D", count: 2 },
            {
              op: "addAngle",
              at: "B",
              from: "A",
              to: "C",
              arcs: 2,
              right: null,
            },
          ],
        }),
      ).edits,
    ).toEqual([
      { op: "addDimension", from: "B", to: "C", text: "10" },
      { op: "addTick", from: "A", to: "B" },
      { op: "addParallelMark", from: "A", to: "D", count: 2 },
      { op: "addAngle", at: "B", from: "A", to: "C", arcs: 2 },
    ]);
  });
});
