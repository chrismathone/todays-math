// @vitest-environment node
/**
 * 시험지 만들기 «이름 붙인 출제 조건»(W5 · 2026-10-16)의 계약 — 조건만 담는다(문항 · 지면은 없다),
 * 판은 1, 이름은 다듬어 1~40자, 난이도는 «지정 없음(null)»과 0 을 가른다, 모르는 칸은 거절한다.
 */
import { describe, expect, it } from "vitest";
import {
  EXAM_CONDITION_NAME_MAX,
  examConditionInputSchema,
  examConditionPayloadSchema,
  patchExamConditionSchema,
  saveExamConditionSchema,
  type ExamConditionInput,
} from "@/contracts/examCondition.contract";

const ladder = {
  연산: null,
  기본: 6,
  응용: 8,
  심화하: 4,
  심화중: 0,
  심화상: null,
};
const sampleCondition = (
  patch: Partial<ExamConditionInput> = {},
): ExamConditionInput => ({
  v: 1,
  name: "중2 확인 · 부등식 18",
  source: {
    group: "school_textbook",
    books: ["book-1"],
    kinds: [],
    materials: [],
    label: "교과서 · 중2 비상 · 자료 전부",
  },
  rows: [
    { unitId: "u1", label: "일차부등식의 해와 성질", count: 5, fixed: false },
    { unitId: "u2", label: "일차부등식의 풀이", count: 8, fixed: true },
    { unitId: "u3", label: "일차부등식의 활용", count: 5, fixed: false },
  ],
  total: 18,
  ladder,
  recent: true,
  familyRule: true,
  ...patch,
});

describe("exam condition contract (W5)", () => {
  it("accepts a full condition and trims the name", () => {
    const parsed = examConditionInputSchema.parse(
      sampleCondition({ name: "  중2 확인  " }),
    );
    expect(parsed.name).toBe("중2 확인");
    expect(parsed.ladder.심화중).toBe(0);
    expect(parsed.ladder.연산).toBeNull();
  });

  it("keeps «지정 없음» (null) apart from 0 and requires every ladder tier", () => {
    const missing = { ...ladder } as Record<string, number | null>;
    delete missing.심화상;
    expect(
      examConditionInputSchema.safeParse(
        sampleCondition({ ladder: missing as typeof ladder }),
      ).success,
    ).toBe(false);
    expect(
      examConditionInputSchema.safeParse(
        sampleCondition({ ladder: { ...ladder, 연산: -1 } }),
      ).success,
    ).toBe(false);
  });

  it.each([
    ["empty name", { name: "   " }],
    ["long name", { name: "가".repeat(EXAM_CONDITION_NAME_MAX + 1) }],
    ["version 2", { v: 2 as 1 }],
    ["no rows", { rows: [] }],
    [
      "duplicated scope",
      {
        rows: [
          { unitId: "u1", label: "a", count: 1, fixed: false },
          { unitId: "u1", label: "a", count: 2, fixed: false },
        ],
      },
    ],
    ["total 0", { total: 0 }],
  ])("refuses %s", (_label, patch) => {
    expect(
      examConditionInputSchema.safeParse(sampleCondition(patch)).success,
    ).toBe(false);
  });

  it("never carries problems or layout (strict)", () => {
    expect(
      examConditionInputSchema.safeParse({
        ...sampleCondition(),
        problems: [{ id: "p1" }],
      }).success,
    ).toBe(false);
    expect(
      examConditionInputSchema.safeParse({
        ...sampleCondition(),
        layout: { columns: 2 },
      }).success,
    ).toBe(false);
    expect(
      examConditionInputSchema.safeParse({
        ...sampleCondition(),
        rows: [
          {
            unitId: "u1",
            label: "a",
            count: 1,
            fixed: false,
            problemIds: ["p"],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("stores lastUsedAt beside the input", () => {
    expect(
      examConditionPayloadSchema.safeParse({
        ...sampleCondition(),
        lastUsedAt: "2026-10-16T01:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      examConditionPayloadSchema.safeParse(sampleCondition()).success,
    ).toBe(false);
  });

  it("save and patch requests are strict", () => {
    expect(
      saveExamConditionSchema.safeParse({ condition: sampleCondition() })
        .success,
    ).toBe(true);
    expect(
      saveExamConditionSchema.safeParse({
        condition: sampleCondition(),
        replace: { id: "c1", expectedRevision: 0 },
      }).success,
    ).toBe(false);
    expect(
      patchExamConditionSchema.safeParse({
        action: "rename",
        name: "새 이름",
        expectedRevision: 2,
      }).success,
    ).toBe(true);
    expect(
      patchExamConditionSchema.safeParse({ action: "touch" }).success,
    ).toBe(true);
    expect(
      patchExamConditionSchema.safeParse({ action: "touch", extra: 1 }).success,
    ).toBe(false);
  });
});
