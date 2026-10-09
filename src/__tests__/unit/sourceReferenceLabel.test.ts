import { describe, expect, it } from "vitest";
import { sourceReferenceLabel } from "@/lib/problem/sourceReferenceLabel";
import {
  pastExamReference,
  textbookReference,
} from "../fixtures/problemSourceReference";

describe("sourceReferenceLabel", () => {
  it("labels a transformed question with its original exam, not as an actual past exam", () => {
    expect(
      sourceReferenceLabel({
        source: "transformed",
        sourceReference: pastExamReference,
      }),
    ).toBe("기출 변형 · OO중 2025년 1학기 중간 12번 기반");
  });

  it.each(["manual", "ai_generated"])(
    "labels %s as based on the exam",
    (source) => {
      expect(
        sourceReferenceLabel({ source, sourceReference: pastExamReference }),
      ).toBe("기출 기반 · OO중 2025년 1학기 중간 12번");
    },
  );

  it("shows the supplied textbook, material, unit and original question number", () => {
    expect(
      sourceReferenceLabel({
        source: "manual",
        sourceReference: textbookReference,
      }),
    ).toBe(
      "교과서 기반 · 천재교육(김화경) 수학 1 · 2022 개정 · 형성 평가 · 1단원 평가 · 소인수분해 · 3번",
    );
  });

  it("omits missing textbook fields and repeated material titles", () => {
    expect(
      sourceReferenceLabel({
        source: "transformed",
        sourceReference: {
          ...textbookReference,
          questionNumber: null,
          material: {
            ...textbookReference.material!,
            author: null,
            curriculum: "",
            unitRaw: null,
            materialTitle: "형성 평가",
          },
        },
      }),
    ).toBe("교과서 변형 · 천재교육 수학 1 · 형성 평가 기반");
  });

  it("falls back to the original code without interpreting its year-like digits", () => {
    expect(
      sourceReferenceLabel({
        source: "transformed",
        sourceReference: {
          ...pastExamReference,
          exam: null,
          school: null,
          subject: null,
          questionNumber: null,
          problemCode: "J20101-A01-012",
        },
      }),
    ).toBe("기출 변형 · J20101-A01-012 기반");
  });

  it("keeps verified school/subject/number when the exam relation is missing", () => {
    expect(
      sourceReferenceLabel({
        source: "manual",
        sourceReference: { ...pastExamReference, exam: null },
      }),
    ).toBe("기출 기반 · J20101-A01-012 · OO중 · 수학 · 12번");
  });

  it("does not invent exam fields or a question number for unknown values", () => {
    expect(
      sourceReferenceLabel({
        source: "manual",
        sourceReference: {
          ...pastExamReference,
          school: null,
          questionNumber: null,
          exam: {
            school: "",
            year: 0,
            semester: 0,
            round: "",
            subject: "",
            number: null,
          },
        },
      }),
    ).toBe("기출 기반 · J20101-A01-012");
  });

  it("does not infer a workbook/exam origin from a synthetic reference", () => {
    expect(
      sourceReferenceLabel({
        source: "manual",
        sourceReference: {
          ...pastExamReference,
          source: "ai_generated",
          exam: null,
          school: null,
          subject: null,
          questionNumber: null,
        },
      }),
    ).toBe("원문 기반 · J20101-A01-012");
  });

  it("uses the supplied source kind, not the existence of material, to distinguish workbooks", () => {
    expect(
      sourceReferenceLabel({
        source: "manual",
        sourceReference: { ...textbookReference, source: "transformed" },
      }),
    ).toBe(
      "문제집 기반 · 천재교육(김화경) 수학 1 · 2022 개정 · 형성 평가 · 1단원 평가 · 소인수분해 · 3번",
    );
  });

  it("returns no reference for old responses and explicitly missing references", () => {
    expect(sourceReferenceLabel({ source: "transformed" })).toBeNull();
    expect(
      sourceReferenceLabel({ source: "manual", sourceReference: null }),
    ).toBeNull();
  });
});
