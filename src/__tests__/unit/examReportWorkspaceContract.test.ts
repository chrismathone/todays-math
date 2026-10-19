import { describe, expect, it } from "vitest";
import {
  examReportConfirmInputSchema,
  examReportNoteInputSchema,
  examReportOptionsSchema,
  examReportPrintInputSchema,
  examReportSettingsInputSchema,
} from "@/contracts/examReportWorkspace.contract";
import { EXAM_REPORT_NOTE_LIMIT } from "@/lib/examReport/settings";

describe("실제 성적표 편집 계약", () => {
  it("M1 저장값은 그대로 읽고 새 설정 요청은 S1만 받는다", () => {
    expect(examReportOptionsSchema.parse({ format: "M1" }).format).toBe("M1");
    const input = { expectedOptionsDigest: "a".repeat(64), options: {} };
    expect(examReportSettingsInputSchema.parse(input).options.format).toBe(
      "S1",
    );
    expect(
      examReportSettingsInputSchema.safeParse({
        ...input,
        options: { format: "M1" },
      }).success,
    ).toBe(false);
  });
  it("고정 180자 대신 DB와 같은 1000자만 하드 상한으로 둔다", () => {
    expect(EXAM_REPORT_NOTE_LIMIT).toBe(1000);
    expect(
      examReportNoteInputSchema.safeParse({
        expectedRevision: 1,
        teacherNote: "가".repeat(1000),
      }).success,
    ).toBe(true);
    expect(
      examReportNoteInputSchema.safeParse({
        expectedRevision: 1,
        teacherNote: "가".repeat(1001),
      }).success,
    ).toBe(false);
  });
  it("빈 문장 · 판 0은 허용하고, 긴 문장 · 판 누락 · 임의 필드는 거절한다", () => {
    expect(
      examReportNoteInputSchema.parse({ expectedRevision: 0, teacherNote: "" }),
    ).toEqual({ expectedRevision: 0, teacherNote: "" });
    expect(
      examReportNoteInputSchema.safeParse({
        expectedRevision: 1,
        teacherNote: "가".repeat(EXAM_REPORT_NOTE_LIMIT),
      }).success,
    ).toBe(true);
    for (const value of [
      { teacherNote: "문장" },
      { expectedRevision: -1, teacherNote: "" },
      {
        expectedRevision: 1,
        teacherNote: "가".repeat(EXAM_REPORT_NOTE_LIMIT + 1),
      },
      { expectedRevision: 1, teacherNote: "", state: "confirmed" },
    ])
      expect(examReportNoteInputSchema.safeParse(value).success).toBe(false);
    expect(
      examReportConfirmInputSchema.safeParse({ expectedRevision: 1 }).success,
    ).toBe(true);
  });
  it("반 설정은 이전 지문을 요구하고, 인쇄 기본은 확정된 학생만이다", () => {
    expect(examReportPrintInputSchema.parse({})).toEqual({
      scope: "confirmed",
      kind: "students",
    });
    expect(
      examReportPrintInputSchema.safeParse({ scope: "all", kind: "students" })
        .success,
    ).toBe(true);
    expect(
      examReportPrintInputSchema.safeParse({ scope: "unknown" }).success,
    ).toBe(false);
    expect(
      examReportSettingsInputSchema.safeParse({ options: {} }).success,
    ).toBe(false);
  });
});
