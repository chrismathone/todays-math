// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FigureEditCommandSchema } from "@/lib/dev-ai/figure-edit-contract";
import { buildFigureEditPrompt } from "@/lib/dev-ai/figure-edit-prompt";
import { parseFigureEditResult } from "@/lib/dev-ai/figure-edit";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";

vi.mock("server-only", () => ({}));

/**
 * «요청대로 고치기»의 `mirror` 계약·지시문 — 원장님 2026-09-20 «대칭(편집기 단추도)».
 * 축은 세로(좌우)·가로(상하) 또는 두 점이 정하는 직선. 적용은 편집기 단추와 같은 함수(figureMirror.ts).
 */
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "삼각형을 밑변 BC 에 대해 대칭시켜 주세요.",
  figure: {
    viewBox: [0, 0, 300, 240],
    elements: [
      {
        n: 1,
        kind: "선분",
        points: [
          [37, 26],
          [37, 206],
        ],
      },
    ],
    names: [{ name: "A", x: 37, y: 26 }],
  },
};
const reply = (value: unknown) => JSON.stringify(value);

describe("대칭 명령 스키마", () => {
  it.each([
    { op: "mirror", targets: "all", axis: "vertical" },
    { op: "mirror", targets: "all", axis: "horizontal" },
    { op: "mirror", targets: [1, 2, 3], axis: "vertical" },
    { op: "mirror", targets: [2], axis: ["B", "C"] },
    {
      op: "mirror",
      targets: [2],
      axis: [
        { x: 100, y: 0 },
        { x: 100, y: 200 },
      ],
    },
    { op: "mirror", targets: [1], axis: ["B", { x: 200, y: 40 }] },
  ])("accepts %j", (command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
  });

  it.each([
    ["축 없음", { op: "mirror", targets: "all" }],
    ["모르는 축", { op: "mirror", targets: [1], axis: "diagonal" }],
    ["점 하나", { op: "mirror", targets: [1], axis: ["B"] }],
    ["점 셋", { op: "mirror", targets: [1], axis: ["A", "B", "C"] }],
    ["빈 목록", { op: "mirror", targets: [], axis: "vertical" }],
    ["번호 0", { op: "mirror", targets: [0], axis: "vertical" }],
    ["모르는 낱말", { op: "mirror", targets: "some", axis: "vertical" }],
    ["번호 칸 이름이 다름", { op: "mirror", target: 1, axis: "vertical" }],
    [
      "군더더기 칸",
      { op: "mirror", targets: [1], axis: "vertical", degrees: 180 },
    ],
  ])("rejects %s", (_name, command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(false);
  });

  it("형식이 맞는 명령만 남고 나머지는 셈해서 알린다", () => {
    const { edits, warnings } = parseFigureEditResult(
      reply({
        commands: [
          { op: "mirror", targets: "all", axis: "vertical" },
          { op: "mirror", targets: "all", axis: "diagonal" },
        ],
      }),
    );
    expect(edits).toEqual([{ op: "mirror", targets: "all", axis: "vertical" }]);
    expect(warnings).toEqual(["형식이 맞지 않는 수정 명령 1개를 뺐습니다."]);
  });
});

describe("대칭 — 지시문·사유", () => {
  const prompt = buildFigureEditPrompt(request);

  it("명령마다 한 줄 — 대칭도 한 줄이다", () => {
    const lines = prompt
      .split("\n")
      .filter((line) => line.startsWith('{"op":"mirror","targets":'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"axis":"vertical"|"horizontal"|[P,P]');
  });

  it("회전 줄 바로 밑에 선다 — 모델이 둘을 견주어 고르게", () => {
    const at = (head: string) =>
      prompt.split("\n").findIndex((line) => line.startsWith(head));
    expect(at('{"op":"mirror"')).toBe(at('{"op":"rotate"') + 1);
  });

  it("할 수 있는 것 목록에 «대칭» 이 있다 — 빈 명령일 때 화면에 나간다", async () => {
    const { FigureEditError } = await import("@/lib/dev-ai/figure-edit");
    try {
      parseFigureEditResult(reply({ commands: [] }));
      expect.unreachable("빈 명령은 사유를 던진다");
    } catch (error) {
      expect(error).toBeInstanceOf(FigureEditError);
      expect((error as Error).message).toContain("대칭");
    }
  });
});
