import { describe, expect, it } from "vitest";
import { draftQuestionSelections } from "@/lib/problem/questionDraft";

const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const questionId = `q:v1:${"b".repeat(64)}`;
const raw = (problemId: string) => ({
  id: problemId,
  questionId,
  questionFormats: [
    {
      problemId,
      format: "short_answer",
      revision: "r",
      state: "available",
      reasonCode: null,
    },
  ],
});
describe("new question draft validation", () => {
  it("leaves older stored/custom payloads without question metadata alone", () => {
    const old = {
      problems: [
        { id, content: "saved original" },
        { id: other, content: "saved second" },
      ],
    };
    const before = JSON.stringify(old);
    expect(draftQuestionSelections(old)).toEqual([]);
    expect(JSON.stringify(old)).toBe(before);
  });
  it("validates the actual representation and rejects repeated question identity", () => {
    expect(draftQuestionSelections({ problems: [raw(id)] })).toEqual([
      { questionId, problemId: id, format: "short_answer", revision: "r" },
    ]);
    expect(() =>
      draftQuestionSelections({ problems: [raw(id), raw(other)] }),
    ).toThrow("여러 형식");
    expect(() =>
      draftQuestionSelections({
        problems: [{ ...raw(id), questionFormats: [] }],
      }),
    ).toThrow();
  });
});
