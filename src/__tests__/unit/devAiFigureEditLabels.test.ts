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
 * «요청대로 고치기» 글자 명령(원장님 2026-09-20 «아직 없는 명령 전부») — 각의 크기 글자(`addAngle.text`)와
 * 점 이름(`addLabel`). 계약(수락/거절) · 지시문 한 줄씩 · 빈 명령 문구. 모델은 부르지 않는다(유료 호출 0).
 */
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "각 B 에 40° 표시",
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

describe("글자 명령 스키마", () => {
  it.each([
    [{ op: "addAngle", at: "B", from: "A", to: "C", text: "40°" }],
    [{ op: "addAngle", at: "B", from: "A", to: "C", text: "$x$", arcs: 2 }],
    [
      {
        op: "addAngle",
        at: { x: 10, y: 20 },
        from: "A",
        to: "C",
        text: "60°",
        right: false,
      },
    ],
    [{ op: "addLabel", at: "A", text: "D" }],
    [{ op: "addLabel", at: { x: 12.5, y: 30 }, text: "P′" }],
    [{ op: "addLabel", at: { x: 12.5, y: 30 }, text: "D", position: "SW" }],
    [{ op: "addLabel", at: "A", text: "M", position: "N" }],
    [{ op: "relabel", target: 3 }],
    [{ op: "relabel", target: 3, position: "NE" }],
  ])("accepts %j", (command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
  });

  it.each([
    [
      "각 글자 빈 값",
      { op: "addAngle", at: "B", from: "A", to: "C", text: " " },
    ],
    [
      "각 글자 제어문자",
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40\u0007°" },
    ],
    ["이름 자리 없음", { op: "addLabel", text: "D" }],
    ["이름 글자 없음", { op: "addLabel", at: "A" }],
    ["이름 빈 글자", { op: "addLabel", at: "A", text: "" }],
    ["모르는 쪽", { op: "addLabel", at: "A", text: "D", position: "UP" }],
    ["남는 칸", { op: "addLabel", at: "A", text: "D", dx: 3 }],
    ["이름 자리가 반쪽", { op: "addLabel", at: { x: 3 }, text: "D" }],
    ["자리 고칠 요소 없음", { op: "relabel", position: "N" }],
    ["자리 고치기 0번", { op: "relabel", target: 0 }],
    ["자리 고치기 모르는 쪽", { op: "relabel", target: 3, position: "UP" }],
    ["모르는 명령", { op: "renameLabel", target: 1, text: "D" }],
  ])("rejects %s", (_name, command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(false);
  });
});

describe("지시문", () => {
  const prompt = buildFigureEditPrompt(request);

  it("각 표시 줄에 크기 글자를 적는다", () => {
    const line = prompt
      .split("\n")
      .find((row) => row.startsWith('{"op":"addAngle"'));
    expect(line).toBeDefined();
    expect(line).toContain('"text"');
    expect(line!.length).toBeLessThanOrEqual(480);
  });

  it("점 이름 줄이 한 줄 있다", () => {
    const line = prompt
      .split("\n")
      .find((row) => row.startsWith('{"op":"addLabel"'));
    expect(line).toBeDefined();
    expect(line).toContain('"at"');
    expect(line).toContain('"text"');
    expect(line!.length).toBeLessThanOrEqual(260);
  });

  it("이름 자리 고치기 줄이 한 줄 있다", () => {
    const line = prompt
      .split("\n")
      .find((row) => row.startsWith('{"op":"relabel"'));
    expect(line).toBeDefined();
    expect(line).toContain('"target"');
    expect(line!.length).toBeLessThanOrEqual(260);
  });

  it("요청 글과 요소 목록은 그대로 실린다", () => {
    expect(prompt).toContain("각 B 에 40° 표시");
    expect(prompt).toContain('"names"');
  });
});

describe("빈 명령 문구", () => {
  const reason = () => {
    try {
      parseFigureEditResult(JSON.stringify({ commands: [], note: "" }));
    } catch (error) {
      return error as FigureEditError;
    }
    throw new Error("빈 명령은 사유와 함께 막아야 한다");
  };

  it("할 수 있는 것에 각의 크기·점 이름이 있다", () => {
    const message = reason().message;
    expect(message).toContain("각의 크기");
    expect(message).toContain("점 이름");
    expect(message).toContain("이름 자리 고치기");
    expect(message).toContain("지금 그림은 그대로입니다");
  });

  it("문장은 화면 한도 안이다", () => {
    expect(reason().message.length).toBeLessThanOrEqual(FIGURE_REASON_MAX);
  });
});

describe("모델 응답 읽기", () => {
  it("글자 명령을 그대로 읽는다", () => {
    const { edits } = parseFigureEditResult(
      JSON.stringify({
        commands: [
          { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
          { op: "addLabel", at: { x: 10, y: 20 }, text: "D" },
        ],
        note: "",
      }),
    );
    expect(edits).toEqual([
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
      { op: "addLabel", at: { x: 10, y: 20 }, text: "D" },
    ]);
  });

  it("모델이 null 로 채운 칸은 없는 칸으로 읽는다", () => {
    const { edits } = parseFigureEditResult(
      JSON.stringify({
        commands: [
          { op: "addLabel", at: "A", text: "D", position: null },
          {
            op: "addAngle",
            at: "B",
            from: "A",
            to: "C",
            text: "40°",
            right: null,
            arcs: null,
          },
        ],
        note: "",
      }),
    );
    expect(edits).toEqual([
      { op: "addLabel", at: "A", text: "D" },
      { op: "addAngle", at: "B", from: "A", to: "C", text: "40°" },
    ]);
  });
});
