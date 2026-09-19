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
 * «요청대로 고치기» 동작 더하기 ② — 도형·변환(원장님 2026-09-19 «추가할 수 있는 것 전부»).
 * 원·호·크기·색칠·수선·회전과, 같은 결의 쉬운 둘(중점·교점). 좌표는 점 이름으로 받고 코드가 계산한다.
 */
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "점 O 중심, 반지름 OA 인 원을 그려 주세요.",
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

describe("도형·변환 명령 스키마", () => {
  it.each([
    { op: "addCircle", center: "O", through: "A" },
    { op: "addCircle", center: { x: 150, y: 110 }, r: 40, dashed: true },
    { op: "addArc", center: "O", from: "A", to: "B" },
    { op: "addArc", center: "O", from: "A", to: "B", via: "C", dashed: true },
    { op: "resize", target: 3, r: 50 },
    { op: "resize", target: 3, scale: 1.5 },
    { op: "rotate", targets: [1, 2, 3], direction: "cw" },
    { op: "rotate", targets: "all", direction: "ccw" },
    { op: "fillRegion", at: ["A", "B", "C"] },
    { op: "fillRegion", at: { x: 120, y: 120 }, color: "#ffe08a" },
    { op: "fillRegion", at: "O" },
    { op: "addPerpendicular", from: "A", onto: ["B", "C"] },
    {
      op: "addPerpendicular",
      from: "A",
      onto: ["B", { x: 250, y: 170 }],
      foot: "H",
      dashed: true,
    },
    { op: "addMidpoint", from: "B", to: "C", label: "M" },
    {
      op: "addIntersection",
      lines: [
        ["A", "C"],
        ["B", "D"],
      ],
      label: "O",
    },
  ])("accepts %j", (command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
  });

  it.each([
    ["원 — 반지름도 지나는 점도 없음", { op: "addCircle", center: "O" }],
    [
      "원 — 반지름과 지나는 점을 둘 다",
      { op: "addCircle", center: "O", through: "A", r: 40 },
    ],
    ["원 — 반지름 0", { op: "addCircle", center: "O", r: 0 }],
    ["원 — 중심 없음", { op: "addCircle", through: "A" }],
    ["호 — 중심 없음", { op: "addArc", from: "A", to: "B" }],
    [
      "호 — 모르는 칸",
      { op: "addArc", center: "O", from: "A", to: "B", large: true },
    ],
    ["크기 — 바꿀 값 없음", { op: "resize", target: 3 }],
    ["크기 — 둘 다", { op: "resize", target: 3, r: 50, scale: 2 }],
    ["크기 — 배율 0", { op: "resize", target: 3, scale: 0 }],
    ["크기 — 배율 20", { op: "resize", target: 3, scale: 20 }],
    ["크기 — 번호 없음", { op: "resize", scale: 2 }],
    ["회전 — 방향 글자", { op: "rotate", targets: [1], direction: "left" }],
    ["회전 — 90 아닌 각", { op: "rotate", targets: [1], degrees: 45 }],
    ["회전 — 빈 목록", { op: "rotate", targets: [], direction: "cw" }],
    ["회전 — 번호 0", { op: "rotate", targets: [0], direction: "cw" }],
    ["회전 — 모르는 낱말", { op: "rotate", targets: "some", direction: "cw" }],
    ["색칠 — 점 둘", { op: "fillRegion", at: ["A", "B"] }],
    ["색칠 — 색 이름", { op: "fillRegion", at: "O", color: "grey" }],
    ["색칠 — 자리 없음", { op: "fillRegion", color: "#ffe08a" }],
    ["수선 — 직선 점 하나", { op: "addPerpendicular", from: "A", onto: ["B"] }],
    ["수선 — 직선 없음", { op: "addPerpendicular", from: "A" }],
    [
      "수선 — 발 좌표를 모델이 지음",
      { op: "addPerpendicular", from: "A", onto: ["B", "C"], x: 80, y: 170 },
    ],
    ["중점 — 끝 하나", { op: "addMidpoint", from: "B" }],
    ["교점 — 직선 하나", { op: "addIntersection", lines: [["A", "C"]] }],
  ])("rejects %s", (_name, command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(false);
  });
});

describe("지시문 — 명령마다 한 줄", () => {
  const prompt = buildFigureEditPrompt(request);
  const lineOf = (head: string) =>
    prompt.split("\n").filter((line) => line.startsWith(head));

  it.each([
    '{"op":"addCircle","center":P',
    '{"op":"addArc","center":P,"from":P,"to":P',
    '{"op":"resize","target":n',
    '{"op":"rotate","targets":',
    '{"op":"fillRegion","at":',
    '{"op":"addPerpendicular","from":P,"onto":[P,P]',
    '{"op":"addMidpoint","from":P,"to":P',
    '{"op":"addIntersection","lines":[[P,P],[P,P]]',
  ])("offers %s on one line", (head) => {
    expect(lineOf(head)).toHaveLength(1);
  });

  it("says the code computes feet, midpoints and crossings from point names", () => {
    expect(lineOf('{"op":"addPerpendicular"')[0]).toMatch(/foot/);
    expect(lineOf('{"op":"addCircle"')[0]).toMatch(
      /radius OA[^\n]*"through":"A"/,
    );
    expect(lineOf('{"op":"rotate"')[0]).toMatch(/90°/);
    expect(lineOf('{"op":"fillRegion"')[0]).toMatch(/\["A","B","C"\]/);
  });
});

describe("모델 응답 읽기 — 새 명령", () => {
  it("reads null as «not given» in the new commands", () => {
    expect(
      parseFigureEditResult(
        reply({
          commands: [
            { op: "addCircle", center: "O", through: "A", r: null },
            { op: "resize", target: 1, r: null, scale: 1.5 },
            { op: "fillRegion", at: ["A", "B", "C"], color: null },
            { op: "rotate", targets: "all", direction: "cw" },
            {
              op: "addPerpendicular",
              from: "A",
              onto: ["B", "C"],
              foot: null,
              dashed: null,
            },
          ],
        }),
      ).edits,
    ).toEqual([
      { op: "addCircle", center: "O", through: "A" },
      { op: "resize", target: 1, scale: 1.5 },
      { op: "fillRegion", at: ["A", "B", "C"] },
      { op: "rotate", targets: "all", direction: "cw" },
      { op: "addPerpendicular", from: "A", onto: ["B", "C"] },
    ]);
  });

  it("lists the shape commands in «what can be done» when nothing came back", () => {
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
      "크기",
      "회전",
      "색칠",
      "원",
      "호",
      "수선",
      "중점",
      "교점",
    ])
      expect(error?.message).toContain(word);
    expect(error!.message.length).toBeLessThanOrEqual(FIGURE_REASON_MAX);
  });
});
