import { describe, expect, it } from "vitest";
import {
  formatIntentFits,
  formatIntentSchema,
} from "@/contracts/formatIntent.contract";
import { testGenerateRequestSchema } from "@/contracts/test.contract";

describe("format issuance intent", () => {
  it("distinguishes omitted slots, a zero ban and an exact allocation", () => {
    expect(formatIntentFits({}, 8)).toBe(true);
    expect(formatIntentFits({ 객관식: 0 }, 8)).toBe(true);
    expect(formatIntentFits({ 객관식: 4, 단답형: 4, 서술형: 0 }, 8)).toBe(true);
    expect(formatIntentFits({ 객관식: 4, 단답형: 3, 서술형: 0 }, 8)).toBe(
      false,
    );
    expect(formatIntentFits({ 서술형: 9 }, 8)).toBe(false);
    expect(formatIntentSchema.safeParse({ 서술형: -1 }).success).toBe(false);
    expect(formatIntentSchema.safeParse({ 서술형: 0.5 }).success).toBe(false);
  });
  it("keeps old daily requests valid and validates a count-bound format request", () => {
    const old = {
      classId: "55555555-5555-4555-8555-555555555555",
      testType: "daily",
      testDate: "2026-10-18",
      problemCount: 8,
    };
    expect(testGenerateRequestSchema.safeParse(old).success).toBe(true);
    expect(
      testGenerateRequestSchema.safeParse({
        ...old,
        formats: { 객관식: 8, 단답형: 0, 서술형: 0 },
      }).success,
    ).toBe(true);
    expect(
      testGenerateRequestSchema.safeParse({ ...old, formats: { 객관식: 9 } })
        .success,
    ).toBe(false);
    expect(
      testGenerateRequestSchema.safeParse({ ...old, formats: { 주관식: 8 } })
        .success,
    ).toBe(false);
  });
});
