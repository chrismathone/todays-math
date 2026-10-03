import { describe, expect, it } from "vitest";
import { parseFigureDimensions } from "@/lib/figurePrintSize";
import {
  assessSeat,
  estimateProblemPx,
  JASEUP_RULER,
  EXAM_RULER,
} from "@/lib/printOverflow";
import { estimateExamProblemPx } from "@/lib/print/examRuler";
import { BANK_CHOICE_FIGURES } from "../fixtures/bankChoiceFigures";

const problem = (count: number) => ({
  id: "graph",
  orderIndex: 1,
  content: `알맞은 그래프는?\n\n${Array.from({ length: count }, (_, index) => `${index + 1}. [그림]`).join("\n")}`,
  answer: "①",
  solution: null,
  figureUrls: Array.from(
    { length: count },
    (_, index) => `/figures/${index}.png`,
  ),
  figureDims: Array.from({ length: count }, () => [200, 200]).flat(),
  figureSourceMm: Array(count).fill(70),
  choiceFigureIndex: Array.from({ length: count }, (_, index) => index + 1),
});

describe("B1 — 지면과 같은 연결 계획으로 재는 높이", () => {
  it.each(BANK_CHOICE_FIGURES)(
    "$id 의 격자는 그림을 통째로 쌓던 높이와 다르다",
    (p) => {
      const dims = parseFigureDimensions(
        p.figureUrls.length,
        p.figureDims,
        p.figureSourceMm,
        p.figureUrls,
      );
      const old = estimateProblemPx(p.content, dims);
      const linked = estimateProblemPx(
        p.content,
        dims,
        null,
        JASEUP_RULER,
        p.choiceFigureIndex,
      );
      expect(linked).not.toBe(old);
      expect(assessSeat(p, 500).px).toBe(linked);
      expect(assessSeat(p, 500).lines).toBe(
        Math.ceil(linked / JASEUP_RULER.line),
      );
      expect(estimateExamProblemPx({ ...p, orderIndex: 1 })).toBe(
        estimateProblemPx(
          p.content,
          dims,
          null,
          EXAM_RULER,
          p.choiceFigureIndex,
        ),
      );
    },
  );

  it("다섯·일곱·아홉 보기는 행이 하나씩 늘어 그 행 높이만큼 증가한다", () => {
    // 기존 파서는 같은 본문의 짝수 묶음을 OCR 중복으로 줄인다. 이 시험은 그 별도 규칙을 바꾸지 않는다.
    const heights = [5, 7, 9].map(
      (count) => assessSeat(problem(count), 1000).px,
    );
    const imageWidth =
      (JASEUP_RULER.problemColumn - 32) / 2 -
      (JASEUP_RULER.problemColumn - JASEUP_RULER.choiceTextColumn);
    expect(heights[2]! - heights[1]!).toBeCloseTo(
      imageWidth + JASEUP_RULER.choiceRowGap,
      5,
    );
    expect(heights[1]! - heights[0]!).toBeCloseTo(
      imageWidth + JASEUP_RULER.choiceRowGap,
      5,
    );
  });

  it("행마다 더 큰 비율의 그림을 세며 보기에는 통단 mm 폭을 쓰지 않는다", () => {
    const p = problem(5);
    const base = assessSeat(p, 1000).px;
    expect(
      assessSeat({ ...p, figureSourceMm: [10, 20, 30, 40, 50] }, 1000).px,
    ).toBe(base);
    const taller = {
      ...p,
      figureDims: [200, 400, 200, 200, 200, 200, 200, 200, 200, 200],
    };
    const imageWidth =
      (JASEUP_RULER.problemColumn - 32) / 2 -
      (JASEUP_RULER.problemColumn - JASEUP_RULER.choiceTextColumn);
    expect(assessSeat(taller, 1000).px - base).toBeCloseTo(imageWidth, 5);
  });

  it.each([[], [1], [1, 2, 2, 4, 5], [1, 2, 3, 4, 0]])(
    "불명확한 연결 %j 은 기존 자와 같다",
    (...links) => {
      const p = problem(5);
      expect(assessSeat({ ...p, choiceFigureIndex: links }, 500)).toEqual(
        assessSeat({ ...p, choiceFigureIndex: undefined }, 500),
      );
    },
  );

  it("그림 없는 긴 글 보기가 같은 격자에서 접힌 만큼 높아진다", () => {
    const p = problem(5);
    const mixed = {
      ...p,
      figureUrls: p.figureUrls.slice(0, 4),
      figureDims: p.figureDims.slice(0, 8),
      figureSourceMm: p.figureSourceMm.slice(0, 4),
      choiceFigureIndex: [1, 2, 3, 4],
    };
    const short = {
      ...mixed,
      content: p.content.replace("5. [그림]", "5. 없다"),
    };
    const long = {
      ...mixed,
      content: p.content.replace(
        "5. [그림]",
        `5. ${"해당하는 그래프가 없다 ".repeat(20)}`,
      ),
    };
    expect(assessSeat(long, 1000).px).toBeGreaterThan(
      assessSeat(short, 1000).px + JASEUP_RULER.line,
    );
  });
});
