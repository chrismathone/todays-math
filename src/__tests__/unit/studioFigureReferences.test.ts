import { expect, it } from "vitest";
import { retainStudioFigures } from "@/components/unified/studioFigureReferences";
import type {
  StudioCrop,
  StudioFigure,
} from "@/components/unified/studioHelpers";

it("deleting a figure preserves identity in body, native tables, choices and subquestions", () => {
  const figures: StudioFigure[] = ["a", "b", "c"].map((id) => ({
    id,
    image: id,
    rect: { x: 0, y: 0, width: 1, height: 1 },
  }));
  const block = { type: "text" as const, value: "[그림3]", rows: [] };
  const crop = {
    content: "처음 [그림1] 다음 [그림2] 마지막 [그림3] 없는 참조 [그림9]",
    figures,
    ocr: {
      number: 17,
      blocks: [{ type: "table", value: "", rows: [["[그림1]", "[그림2]"]] }],
      choiceGroups: [{ number: 1, contents: [block] }],
      subQuestions: [
        {
          number: 1,
          contents: [block],
          choices: [{ number: 1, contents: [block] }],
        },
      ],
      confidence: "high",
      choicesLayout: "auto",
      bodyMissing: false,
      choicesMissing: false,
    },
  } as StudioCrop;
  const next = retainStudioFigures(crop, [figures[1], figures[2]]);
  expect(next.content).toBe(
    "처음  다음 [그림1] 마지막 [그림2] 없는 참조 [그림9]",
  );
  expect(next.ocr?.blocks[0].rows).toEqual([["", "[그림1]"]]);
  expect(next.ocr?.choiceGroups[0].contents[0].value).toBe("[그림2]");
  expect(next.ocr?.subQuestions[0].choices?.[0].contents[0].value).toBe(
    "[그림2]",
  );
  expect(crop.content).toContain("처음 [그림1]");
  expect(crop.ocr?.choiceGroups[0].contents[0].value).toBe("[그림3]");
  expect(retainStudioFigures(crop, figures)).toEqual({ figures });
});
