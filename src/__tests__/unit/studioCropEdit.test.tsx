import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { applyStudioCropEdit } from "@/components/unified/studioCropEdit";
import {
  studioProblem,
  type StudioCrop,
} from "@/components/unified/studioHelpers";
import NativeProblem from "@/components/unified/NativeProblem";
import { MathgenProblemDataSchema } from "@/lib/mathgen/ocr";

const crop: StudioCrop = {
  id: "crop",
  sourceId: "source",
  sourceLabel: "원본",
  page: 1,
  rect: { x: 0, y: 0, width: 1, height: 1 },
  image: "data:image/png;base64,AA==",
  content: "옛 본문",
  answer: "",
  solution: "",
  level: "secondary",
  grade: "중3",
  mode: "text",
  added: true,
  ocr: {
    number: 17,
    topic: "이차방정식",
    blocks: [{ type: "text", value: "옛 본문", rows: [] }],
    choiceGroups: [],
    subQuestions: [],
    confidence: "low",
    choicesLayout: "3x2",
    bodyMissing: false,
    choicesMissing: false,
  },
};

describe("source visual edit metadata", () => {
  it("retains number/topic/layout and renders saved text instead of stale native blocks", () => {
    const edited = applyStudioCropEdit(crop, {
      content: "새 본문\n\n① $1$\n② $2$",
      reviewed: true,
      ocr: { ...crop.ocr!, number: 20, topic: "수정한 주제" },
    });
    expect(edited.ocr).toMatchObject({
      number: 20,
      topic: "수정한 주제",
      choicesLayout: "3x2",
      contentEdited: true,
      blocks: [],
      choiceGroups: [],
      subQuestions: [],
    });
    expect(edited.reviewed).toBe(true);
    // 내용을 고쳤다 — 판이 올라 시험지의 담은 판과 갈린다(«고친 뒤 반영 전»).
    expect(edited.revision).toBe(1);
    expect(MathgenProblemDataSchema.safeParse(edited.ocr).success).toBe(true);
    const html = renderToStaticMarkup(
      <NativeProblem problem={studioProblem(edited)} print={false} />,
    );
    expect(html).toContain("새 본문");
    expect(html).not.toContain("옛 본문");
    expect(html).toContain('data-native-choices="3x2"');
  });
  it("keeps native tables when saving unchanged content or metadata only", () => {
    const saved = applyStudioCropEdit(crop, {
      content: crop.content,
      ocr: { ...crop.ocr!, topic: "새 주제" },
    });
    expect(saved.ocr?.blocks).toEqual(crop.ocr?.blocks);
    expect(saved.ocr?.contentEdited).toBeUndefined();
    expect(applyStudioCropEdit(crop, { answer: "2" }).ocr).toBe(crop.ocr);
    expect(crop.ocr?.blocks[0].value).toBe("옛 본문");
  });
  it("검수 완료·취소는 상태라 판을 올리지 않고 다른 칸도 건드리지 않는다 (트랙 41 어긋남 3)", () => {
    const reviewed = applyStudioCropEdit(
      { ...crop, revision: 4 },
      { reviewed: true },
    );
    expect(reviewed).toEqual({ ...crop, revision: 4, reviewed: true });
    expect(applyStudioCropEdit(reviewed, { reviewed: false }).revision).toBe(4);
    // 검수 완료와 함께 내용을 고치면 내용 고침이다.
    expect(
      applyStudioCropEdit(reviewed, { reviewed: true, answer: "5" }).revision,
    ).toBe(5);
  });
});
