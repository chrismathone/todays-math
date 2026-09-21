import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NativeProblem from "@/components/unified/NativeProblem";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";

/**
 * 트랙 46 (2026-09-21) — 지면이 원장님 문제 22 의 〈보기〉 를 원본처럼 2열 2행으로 그린다.
 *
 * 문제 22 는 이미 인식된 문항이라 머리에 열 수가 없다(`<보기>`). 열 수를 아는 것은 작업실이 원본
 * 쪽에서 오려 낸 **그림 자리**다 — 검수 카드와 같은 규칙(`layoutQuotedBoxes`)으로 지면도 읽는다.
 * 인식 블록 경로(`ocr.blocks`)와 «내용 수정» 뒤 원문 경로(`contentEdited`) 둘 다.
 */

/** 작업실 저장본(workspace_document 62ce7f5e…, crop bb84e38a…)에서 옮긴 값 — 그림 주소만 흉내. */
const RECTS = [
  { x: 0.1044, y: 0.6173, width: 0.1718, height: 0.0921 },
  { x: 0.3086, y: 0.6176, width: 0.13, height: 0.0871 },
  { x: 0.1029, y: 0.7401, width: 0.1511, height: 0.06 },
  { x: 0.3074, y: 0.7369, width: 0.1296, height: 0.0643 },
];
const text = (value: string) => ({ type: "text" as const, value, rows: [] });
const choice = (number: number, value: string) => ({
  number,
  contents: [text(value)],
});
const Q22: StudioCrop = {
  id: "bb84e38a",
  sourceId: "62ce7f5e",
  sourceLabel: "[문명중][1][25-2-중간][미래엔] (완료).pdf",
  page: 4,
  rect: { x: 0.071, y: 0.548, width: 0.414, height: 0.357 },
  image: "/api/library/assets/crop22",
  figures: RECTS.map((rect, index) => ({
    id: `figure-${index + 1}`,
    rect,
    image: `/api/library/assets/figure-${index + 1}`,
  })),
  sourceWidthMm: 210,
  content:
    "아래 보기에서 $\\angle x$의 크기가 큰 것부터 순서대로 바르게 나열한 것은?\n\n> <보기>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]\n\n① ㄹ-ㄷ-ㄱ-ㄴ ② ㄹ-ㄷ-ㄴ-ㄱ ③ ㄷ-ㄹ-ㄱ-ㄴ ④ ㄹ-ㄱ-ㄷ-ㄴ ⑤ ㄱ-ㄴ-ㄷ-ㄹ",
  answer: "",
  solution: "",
  level: "secondary",
  grade: "중1",
  mode: "text",
  added: false,
  ocr: {
    number: 22,
    score: 5,
    topic: "다각형",
    blocks: [
      text("아래 보기에서 "),
      { type: "equation", value: "\\angle x", rows: [] },
      text("의 크기가 큰 것부터 순서대로 바르게 나열한 것은?"),
      text("<보기>\nㄱ. [그림1]\nㄴ. [그림2]\nㄷ. [그림3]\nㄹ. [그림4]"),
    ],
    choiceGroups: [
      choice(1, "ㄹ-ㄷ-ㄱ-ㄴ"),
      choice(2, "ㄹ-ㄷ-ㄴ-ㄱ"),
      choice(3, "ㄷ-ㄹ-ㄱ-ㄴ"),
      choice(4, "ㄹ-ㄱ-ㄷ-ㄴ"),
      choice(5, "ㄱ-ㄴ-ㄷ-ㄹ"),
    ],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "2x3",
    bodyMissing: false,
    choicesMissing: false,
  },
};

function paperBox(crop: StudioCrop) {
  const { container } = render(
    <NativeProblem problem={studioProblem(crop)} print />,
  );
  const grid = container.querySelector("[data-box-card] [data-hwpx-grid]");
  return {
    grid,
    cells: grid ? [...grid.querySelectorAll("[data-box-item]")] : [],
    looseFigures: container.querySelectorAll("[data-native-problem] > img")
      .length,
  };
}

describe("지면 〈보기〉 — 원본 그림 자리로 2열 2행 (원장님 문제 22)", () => {
  it("인식 블록 경로: 두 열 격자, 칸마다 라벨과 그림 하나", () => {
    const { grid, cells, looseFigures } = paperBox(Q22);
    expect(grid?.className).toContain("print:grid-cols-2");
    expect(cells).toHaveLength(4);
    cells.forEach((cell, index) => {
      expect(cell.textContent).toContain(`${"ㄱㄴㄷㄹ"[index]}.`);
      expect(cell.querySelectorAll("img")).toHaveLength(1);
      expect(cell.querySelector("img")?.getAttribute("src")).toBe(
        `/api/library/assets/figure-${index + 1}`,
      );
    });
    // 그림은 상자 안에 섰다 — 본문 밖으로 밀려난 그림이 없다.
    expect(looseFigures).toBe(0);
  });

  it("«내용 수정» 뒤 원문 경로도 같은 격자", () => {
    const { cells } = paperBox({
      ...Q22,
      ocr: { ...Q22.ocr!, contentEdited: true, blocks: [], choiceGroups: [] },
    });
    expect(cells).toHaveLength(4);
    for (const cell of cells)
      expect(cell.querySelectorAll("img")).toHaveLength(1);
  });

  it("그림 자리가 세로로만 서 있으면 예전처럼 1열", () => {
    const { grid } = paperBox({
      ...Q22,
      figures: Q22.figures!.map((figure, index) => ({
        ...figure,
        rect: { x: 0.1, y: 0.1 + index * 0.15, width: 0.17, height: 0.09 },
      })),
    });
    expect(grid).toBeNull();
  });
});

/**
 * 보기 번호 격자도 HWPX 에 칸을 알린다 — 분수 보기가 한글에서 번호와 다른 줄로 떨어지던 것(하네스 실측,
 * 작업실 지면·문제은행 지면 둘 다). 칸 안의 한 줄은 writer 가 세로 겹침으로 묶는다.
 */
describe("보기 번호 격자 — HWPX 격자 표시", () => {
  it("작업실 지면(NativeProblem)의 보기 격자", () => {
    const { container } = render(
      <NativeProblem problem={studioProblem(Q22)} print />,
    );
    const grid = container.querySelector("[data-native-choices]");
    expect(grid?.hasAttribute("data-hwpx-grid")).toBe(true);
    expect(
      grid?.querySelectorAll(":scope > [data-native-choice]"),
    ).toHaveLength(5);
  });
});
