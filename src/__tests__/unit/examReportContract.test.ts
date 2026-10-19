import { describe, expect, it } from "vitest";
import {
  examReportDaySchema,
  examReportPdfRequestSchema,
  examReportSnapshotSchema,
} from "@/contracts/eywaExamReport.contract";
import {
  reportBinding,
  reportCandidate,
  reportId,
} from "../helpers/examReportFeedFixture";

describe("성적표 계약의 짝", () => {
  it("미적용 저장소를 빈 목록으로만 표현한다", () => {
    const empty = {
      version: "v1",
      bindingId: reportBinding.id,
      date: "2026-10-24",
      availability: "not-installed",
      reports: [],
    };
    expect(examReportDaySchema.parse(empty)).toEqual(empty);
    expect(
      examReportDaySchema.safeParse({ ...empty, html: "<p>임의 지면</p>" })
        .success,
    ).toBe(false);
  });
  it("다운로드는 실제 날짜·발행본·에이와 학생·목록 지문을 모두 요구한다", () => {
    const valid = {
      date: "2026-10-24",
      publicationId: reportId(3),
      sourceStudentId: "eywa-student-1",
      sha256: "a".repeat(64),
    };
    expect(examReportPdfRequestSchema.parse(valid)).toEqual(valid);
    for (const invalid of [
      { ...valid, date: "2026-02-30" },
      { ...valid, sha256: "" },
      { ...valid, sourceStudentId: "student/other" },
      { ...valid, html: "new layout" },
    ])
      expect(examReportPdfRequestSchema.safeParse(invalid).success).toBe(false);
  });
  it("확정 snapshot은 완전한 채점과 일치하는 오답·문항 번호를 요구한다", () => {
    const { current } = reportCandidate();
    expect(examReportSnapshotSchema.safeParse(current).success).toBe(true);
    const missing = structuredClone(current);
    missing.report.questions = [];
    expect(examReportSnapshotSchema.safeParse(missing).success).toBe(false);
    const wrong = structuredClone(current);
    wrong.report.wrongQuestions = [];
    expect(examReportSnapshotSchema.safeParse(wrong).success).toBe(false);
    const repeated = structuredClone(current);
    repeated.report.questions.push(repeated.report.questions[0]);
    repeated.report.questionCount = 2;
    expect(examReportSnapshotSchema.safeParse(repeated).success).toBe(false);
  });
});
