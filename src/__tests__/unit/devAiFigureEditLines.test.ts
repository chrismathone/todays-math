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

/**
 * «요청대로 고치기» 동작 더하기 ④ — 직선·원(원장님 2026-09-20 «아직 없는 명령을 전부»).
 * 연장 · 평행선 · 수직이등분선 · 각의 이등분선 · 접선 · 외접원 · 내접원 · 원의 교점 · 호의 중점.
 * 좌표는 점 이름으로 받고 **코드가 계산한다** — 모델이 지은 외심·내심·접점을 믿지 않는다.
 */
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "선분 BC를 C쪽으로 연장해 주세요.",
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

describe("직선·원 명령 스키마", () => {
  it.each([
    { op: "extendLine", from: "A", to: "B" },
    { op: "extendLine", from: "A", to: "B", length: 40 },
    { op: "extendLine", from: "A", to: "B", until: "D" },
    {
      op: "extendLine",
      from: "A",
      to: { x: 120, y: 90 },
      until: ["C", "D"],
      dashed: true,
    },
    { op: "addParallel", through: "A", to: ["B", "C"] },
    { op: "addParallel", through: "A", to: ["B", "C"], length: 120 },
    { op: "addPerpendicularBisector", from: "B", to: "C" },
    { op: "addPerpendicularBisector", from: "B", to: "C", label: "M" },
    { op: "addAngleBisector", at: "A", from: "B", to: "C" },
    {
      op: "addAngleBisector",
      at: "A",
      from: "B",
      to: "C",
      until: ["B", "C"],
      label: "D",
    },
    { op: "addTangent", circle: "O", at: "A" },
    { op: "addTangent", circle: "O", at: "A", rightAngle: true },
    { op: "addTangent", circle: "O", from: "P", labels: ["S", "T"] },
    { op: "addTangent", circle: { x: 80, y: 80 }, from: "P" },
    { op: "addCircumcircle", points: ["A", "B", "C"] },
    { op: "addCircumcircle", points: ["A", "B", "C"], label: "O" },
    { op: "addIncircle", points: ["A", "B", "C"], label: "I", dashed: true },
    { op: "addCircleIntersection", circle: "O", other: "P" },
    {
      op: "addCircleIntersection",
      circle: "O",
      line: ["A", "B"],
      labels: ["P", "Q"],
    },
    { op: "addArcMidpoint", center: "O", from: "A", to: "B" },
    { op: "addArcMidpoint", center: "O", from: "A", to: "B", via: "C" },
  ])("accepts %j", (command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
  });

  it.each([
    [
      "연장 — 길이와 until 을 둘 다",
      { op: "extendLine", from: "A", to: "B", length: 30, until: "D" },
    ],
    ["연장 — 길이 0", { op: "extendLine", from: "A", to: "B", length: 0 }],
    ["연장 — 끝이 없음", { op: "extendLine", from: "A" }],
    [
      "연장 — until 이 점 셋",
      { op: "extendLine", from: "A", to: "B", until: ["C", "D", "E"] },
    ],
    ["평행선 — 기준이 점 하나", { op: "addParallel", through: "A", to: ["B"] }],
    ["평행선 — 지나는 점이 없음", { op: "addParallel", to: ["B", "C"] }],
    [
      "수직이등분선 — 모르는 칸",
      { op: "addPerpendicularBisector", from: "B", to: "C", count: 2 },
    ],
    [
      "각의 이등분선 — 꼭짓점이 없음",
      { op: "addAngleBisector", from: "B", to: "C" },
    ],
    ["접선 — 원이 없음", { op: "addTangent", at: "A" }],
    ["접선 — at 도 from 도 없음", { op: "addTangent", circle: "O" }],
    [
      "접선 — at 과 from 을 둘 다",
      { op: "addTangent", circle: "O", at: "A", from: "P" },
    ],
    [
      "접선 — 접점 이름 셋",
      { op: "addTangent", circle: "O", from: "P", labels: ["S", "T", "U"] },
    ],
    ["외접원 — 점 둘", { op: "addCircumcircle", points: ["A", "B"] }],
    ["외접원 — 점 넷", { op: "addCircumcircle", points: ["A", "B", "C", "D"] }],
    ["내접원 — 점이 없음", { op: "addIncircle" }],
    [
      "원의 교점 — 다른 원도 직선도 없음",
      { op: "addCircleIntersection", circle: "O" },
    ],
    [
      "원의 교점 — 다른 원과 직선을 둘 다",
      {
        op: "addCircleIntersection",
        circle: "O",
        other: "P",
        line: ["A", "B"],
      },
    ],
    ["호의 중점 — 끝이 하나", { op: "addArcMidpoint", center: "O", from: "A" }],
  ])("rejects %s", (_reason, command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(false);
  });
});

describe("지시문", () => {
  const prompt = buildFigureEditPrompt(request);
  it.each([
    ["extendLine", "extendLine"],
    ["addParallel", "addParallel"],
    ["addPerpendicularBisector", "addPerpendicularBisector"],
    ["addAngleBisector", "addAngleBisector"],
    ["addTangent", "addTangent"],
    ["addCircumcircle", "addCircumcircle"],
    ["addIncircle", "addIncircle"],
    ["addCircleIntersection", "addCircleIntersection"],
    ["addArcMidpoint", "addArcMidpoint"],
  ])("describes %s in one line", (_name, op) => {
    const line = prompt
      .split("\n")
      .find((row) => row.startsWith(`{"op":"${op}"`));
    expect(line).toBeTruthy();
    expect(line!.length).toBeLessThanOrEqual(300);
  });

  it("tells the model the code computes the centres and tangency points", () => {
    expect(prompt).toMatch(/the code (finds|computes)/i);
  });
});

describe("모델 응답 읽기", () => {
  it("keeps the new line and circle commands and drops nulls", () => {
    expect(
      parseFigureEditResult(
        reply({
          commands: [
            { op: "extendLine", from: "B", to: "C", length: null, until: null },
            { op: "addCircumcircle", points: ["A", "B", "C"], label: "O" },
            { op: "addTangent", circle: "O", from: "P", labels: null },
            {
              op: "addAngleBisector",
              at: "A",
              from: "B",
              to: "C",
              until: null,
            },
          ],
        }),
      ).edits,
    ).toEqual([
      { op: "extendLine", from: "B", to: "C" },
      { op: "addCircumcircle", points: ["A", "B", "C"], label: "O" },
      { op: "addTangent", circle: "O", from: "P" },
      { op: "addAngleBisector", at: "A", from: "B", to: "C" },
    ]);
  });

  it("lists the line and circle commands in «what can be done» when nothing came back", () => {
    const error = (() => {
      try {
        parseFigureEditResult(reply({ commands: [], note: "" }));
      } catch (e) {
        return e as FigureEditError;
      }
    })();
    expect(error).toBeInstanceOf(FigureEditError);
    expect(error?.status).toBe(422);
    for (const word of [
      "연장선",
      "평행선",
      "수직이등분선",
      "각의 이등분선",
      "접선",
      "외접원",
      "내접원",
    ])
      expect(error?.message).toContain(word);
    expect(error!.message.length).toBeLessThanOrEqual(FIGURE_REASON_MAX);
  });
});
