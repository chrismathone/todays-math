import { beforeEach, describe, expect, it, vi } from "vitest";
import { problemSourceReferenceSchema } from "@/contracts/problemSourceReference.contract";

const { findMany, findExams, findQuestions } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findExams: vi.fn(),
  findQuestions: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    problem: { findMany },
    exam: { findMany: findExams },
    examQuestion: { findMany: findQuestions },
  },
}));
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";

const original = {
  id: "30000000-0000-4000-8000-000000000001",
  problemCode: "J10101-A01-001",
  source: "past_exam",
  originProblemId: null,
  school: "학교 옛 표기",
  subject: "수학",
  examId: "school-2025-1-mid",
  questionNumber: 12,
  sourceMaterial: null,
};
const exam = {
  externalExamId: original.examId,
  school: "가람중",
  year: 2025,
  semester: 1,
  round: "중간",
  subject: "중1",
};
beforeEach(() => {
  findMany.mockReset();
  findExams.mockReset();
  findQuestions.mockReset().mockResolvedValue([]);
});

describe("generated problem source references", () => {
  it("batches shared origins, reads normalized exams, and keeps synthetic metadata untouched", async () => {
    findMany.mockResolvedValue([original]);
    findExams.mockResolvedValue([exam]);
    const rows = Array.from({ length: 40 }, (_, id) => ({
      id,
      originProblemId: original.id,
      source: "manual",
      familyKey: "mid:example",
      examId: null,
    }));
    const result = await withProblemSourceReferences(rows);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toEqual({
      AND: [{ pool: "shared" }, { id: { in: [original.id] } }],
    });
    expect(findExams).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({
      source: "manual",
      familyKey: "mid:example",
      examId: null,
      sourceReference: {
        problemId: original.id,
        problemCode: original.problemCode,
        source: "past_exam",
        exam: {
          school: "가람중",
          year: 2025,
          semester: 1,
          round: "중간",
          number: 12,
        },
      },
    });
    expect(
      problemSourceReferenceSchema.safeParse(result[0].sourceReference).success,
    ).toBe(true);
    expect(rows[0]).not.toHaveProperty("sourceReference");
  });

  it("does not query or infer a source for unlinked engine questions", async () => {
    const rows = [{ originProblemId: null, familyKey: "mid:example" }];
    expect(await withProblemSourceReferences(rows)).toEqual(rows);
    expect(findMany).not.toHaveBeenCalled();
    expect(findExams).not.toHaveBeenCalled();
    expect(findQuestions).not.toHaveBeenCalled();
  });

  it("uses the explicit exam-question link when normalized and legacy exam keys differ", async () => {
    findMany.mockResolvedValue([original]);
    findQuestions.mockResolvedValue([
      {
        problemId: original.id,
        number: 12,
        exam: { ...exam, externalExamId: "normalized-different-key" },
      },
    ]);
    const [result] = await withProblemSourceReferences([
      { originProblemId: original.id },
    ]);
    expect(result.sourceReference?.exam).toEqual({
      school: "가람중",
      year: 2025,
      semester: 1,
      round: "중간",
      subject: "중1",
      number: 12,
    });
    expect(findExams).not.toHaveBeenCalled();
  });

  it("does not choose an arbitrary exam when several explicit links disagree", async () => {
    findMany.mockResolvedValue([original]);
    findQuestions.mockResolvedValue([
      {
        problemId: original.id,
        number: 12,
        exam: { ...exam, externalExamId: "first" },
      },
      {
        problemId: original.id,
        number: 9,
        exam: { ...exam, year: 2024, externalExamId: "second" },
      },
    ]);
    const [result] = await withProblemSourceReferences([
      { originProblemId: original.id },
    ]);
    expect(result.sourceReference?.exam).toBeNull();
    expect(findExams).not.toHaveBeenCalled();
  });

  it("keeps source code and known fields when the exam record is missing, without parsing the ID", async () => {
    findMany.mockResolvedValue([
      { ...original, examId: "2025-fake-year-is-not-evidence" },
    ]);
    findExams.mockResolvedValue([]);
    const [result] = await withProblemSourceReferences([
      { originProblemId: original.id },
    ]);
    expect(result.sourceReference).toMatchObject({
      problemCode: original.problemCode,
      school: original.school,
      questionNumber: 12,
      exam: null,
    });
  });

  it("reads textbook publisher, author and material via the original without copying ownership", async () => {
    findMany.mockResolvedValue([
      {
        ...original,
        source: "school_textbook",
        examId: null,
        sourceMaterial: {
          kind: "소단원 평가",
          title: "다항식 확인",
          unitRaw: "다항식",
          book: {
            publisher: "천재교육",
            author: "김교사",
            title: "공통수학1",
            curriculum: "2022",
          },
        },
      },
    ]);
    const [result] = await withProblemSourceReferences([
      { originProblemId: original.id },
    ]);
    expect(result.sourceReference?.material).toEqual({
      publisher: "천재교육",
      author: "김교사",
      title: "공통수학1",
      curriculum: "2022",
      kind: "소단원 평가",
      materialTitle: "다항식 확인",
      unitRaw: "다항식",
    });
    expect(findExams).not.toHaveBeenCalled();
  });

  it("follows a recorded old chain in batches, rather than substituting a family representative", async () => {
    findMany
      .mockResolvedValueOnce([
        {
          ...original,
          id: "intermediate",
          source: "transformed",
          originProblemId: original.id,
        },
      ])
      .mockResolvedValueOnce([original]);
    findExams.mockResolvedValue([exam]);
    const [result] = await withProblemSourceReferences([
      { originProblemId: "intermediate" },
    ]);
    expect(result.sourceReference?.problemId).toBe(original.id);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it("omits attribution for deleted/inaccessible origins and cycles", async () => {
    findMany.mockResolvedValueOnce([]);
    expect(
      (await withProblemSourceReferences([{ originProblemId: original.id }]))[0]
        .sourceReference,
    ).toBeNull();
    findMany.mockResolvedValueOnce([
      { ...original, originProblemId: original.id },
    ]);
    expect(
      (await withProblemSourceReferences([{ originProblemId: original.id }]))[0]
        .sourceReference,
    ).toBeNull();
    expect(findExams).not.toHaveBeenCalled();
  });

  it("bounds corrupt long chains without exposing incomplete attribution", async () => {
    let n = 0;
    findMany.mockImplementation(async () => [
      { ...original, id: `link-${n++}`, originProblemId: `link-${n}` },
    ]);
    expect(
      (await withProblemSourceReferences([{ originProblemId: "link-0" }]))[0]
        .sourceReference,
    ).toBeNull();
    expect(findMany).toHaveBeenCalledTimes(8);
  });
});
