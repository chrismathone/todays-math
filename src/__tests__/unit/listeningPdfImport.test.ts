import { describe, expect, it } from "vitest";
import {
  listeningPdfAnswers,
  listeningPdfQuestionBoxes,
  type ListeningPdfText,
} from "@/components/english/bank/listeningPdfImport";

const text = (
  str: string,
  x: number,
  y: number,
  width = 30,
  height = 10.552256,
): ListeningPdfText => ({ str, x, y, width, height });

describe("original listening assessment PDF parsing", () => {
  it("keeps real columns and excludes the weekday date fragment in the official high1 2026 round2 header", () => {
    const boxes = listeningPdfQuestionBoxes(
      [
        text("1.", 36.813598, 123.989008),
        text(
          "대화를 듣고, 남자가 구입할 강아지 옷을 고르시오.",
          48,
          123.989008,
          295,
        ),
        text("①", 44, 170),
        text("2.", 36.813598, 227.23324),
        text("대화를 듣고, 주제를 고르시오.", 48, 227.23324, 200),
        text("13.", 376.769788, 123.989008),
        text("대화를 듣고, 여자가 할 일을 고르시오.", 394, 123.989008, 200),
        text("8. (화) 시행", 139.08, 92.64, 83.6813514, 15.96),
      ],
      728,
      1031,
      20,
    );
    expect(boxes.map((box) => box.number)).toEqual([1, 2, 13]);
    expect(boxes[0].x).toBeCloseTo(32.813598);
    expect(boxes[0].width).toBeCloseTo(331.95619);
    expect(boxes[0].prompt).toContain("강아지 옷");
  });

  it("parses explicit official answer pairs and rejects contradictory answers", () => {
    // Actual high1 round2 answer sheet is extracted in two interleaved columns.
    const answers = listeningPdfAnswers(
      "문항번호 정답 문항번호 정답 1 ③ 11 ⑤ 2 ② 12 ③ 3 ③ 13 ① 4 ② 14 ① 5 ④ 15 ② 6 ⑤ 16 ⑤ 7 ③ 17 ① 8 ⑤ 18 ⑤ 9 ② 19 ④ 10 ③ 20 ④",
    );
    expect(answers.size).toBe(20);
    expect(
      Array.from({ length: 20 }, (_, index) => answers.get(index + 1)),
    ).toEqual([2, 1, 2, 1, 3, 4, 2, 4, 1, 2, 4, 2, 0, 0, 1, 4, 0, 4, 3, 3]);
    expect(() => listeningPdfAnswers("1 ③ 1 ④")).toThrow("서로 다르게");
    expect(listeningPdfAnswers("1 2 3 4 5").size).toBe(0);
  });

  it.each(["【16-17】", "[16~17]"])(
    "keeps shared instructions with their own questions instead of the preceding illustration (%s)",
    (marker) => {
      const boxes = listeningPdfQuestionBoxes(
        [
          text("15.", 376.769788, 236.8262),
          text(
            "다음 그림의 상황에 적절한 대화를 고르시오.",
            394,
            236.8262,
            285,
          ),
          text("①", 389, 410),
          text(
            `${marker}대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한`,
            372,
            439.8,
            319.58,
            9.96,
          ),
          text("것을 고르시오.", 386.4, 455.28, 60.95, 9.96),
          text("16.", 377.04, 475.2, 14.3, 10.56),
          text("Woman: __________", 396.36, 475.2, 220, 9.96),
          text("① First response.", 389, 495, 200),
          text("17.", 377.04, 566.52, 14.3, 10.56),
          text("Woman: __________", 396.36, 566.52, 220, 9.96),
          text("① Another response.", 389, 585, 200),
        ],
        728,
        1031,
        20,
      );
      const [illustration, first, second] = boxes;
      expect(illustration.y + illustration.height).toBeLessThan(429.84);
      expect(first.y).toBeLessThanOrEqual(429.84);
      expect(first.x).toBeLessThan(372);
      expect(first.prompt).toContain("남자의 마지막 말");
      expect(second.prompt).toContain("남자의 마지막 말");
      expect(second.prompt).not.toContain("First response");
      expect(first.prompt).not.toContain("16.");
    },
  );

  it("excludes the printed listening-end notice below the last mock-exam question", () => {
    const [box] = listeningPdfQuestionBoxes(
      [
        text("17.", 88, 900),
        text("언급된 음식물이 아닌 것은?", 108, 900, 180),
        text("① onions ② cabbage ③ apples", 100, 930, 285),
        text("④ bread ⑤ mushrooms", 100, 950, 210),
        text(
          "이제 듣기 문제가 끝났습니다. 18번부터는 문제지의 지시에",
          113,
          1060,
          285,
          11.52,
        ),
        text("따라 답을 하시기 바랍니다.", 100, 1080, 220),
      ],
      800,
      1200,
      17,
    );
    expect(box.y + box.height).toBeLessThan(1048.48);
    expect(box.y + box.height).toBeGreaterThan(960);
  });
});
