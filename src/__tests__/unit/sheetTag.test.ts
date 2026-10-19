/**
 * 시험지 태그(W8) — 정해진 여덟 · 하나 · 시험지와 연산 연습지에만 · 지면과 양식에는 없다.
 */
import { describe, expect, it } from "vitest";
import {
  SHEET_TAGS,
  isTaggableKind,
  readSheetTag,
  sheetTagSchema,
} from "@/contracts/sheetTag.contract";
import {
  arithmeticPresentationSchema,
  defaultArithmeticPresentation,
} from "@/contracts/arithmeticPresentation.contract";
import { printPresetInputSchema } from "@/contracts/printPreset.contract";

describe("sheet tags (W8)", () => {
  it("is the fixed list of eight", () => {
    expect(SHEET_TAGS).toEqual([
      "일일TEST",
      "주간TEST",
      "단원TEST",
      "숙제",
      "복습",
      "오답",
      "입학TEST",
      "내신대비",
    ]);
    expect(sheetTagSchema.safeParse("기말").success).toBe(false);
    expect(sheetTagSchema.safeParse(["일일TEST"]).success).toBe(false);
  });

  it("belongs only to 시험지 and 연산 연습지", () => {
    expect(["draft", "arithmeticSheet"].every(isTaggableKind)).toBe(true);
    expect(
      ["extraction", "conceptBlank", "printPreset"].some(isTaggableKind),
    ).toBe(false);
  });

  it("reads unknown or missing values as no tag", () => {
    expect(readSheetTag("숙제")).toBe("숙제");
    expect(readSheetTag(undefined)).toBeUndefined();
    expect(readSheetTag("기말")).toBeUndefined();
  });

  it("an arithmetic sheet carries it beside its output settings, validated", () => {
    const presentation = defaultArithmeticPresentation("학원");
    expect(
      arithmeticPresentationSchema.safeParse({ ...presentation, tag: "복습" })
        .success,
    ).toBe(true);
    expect(arithmeticPresentationSchema.safeParse(presentation).success).toBe(
      true,
    );
    expect(
      arithmeticPresentationSchema.safeParse({ ...presentation, tag: "기말" })
        .success,
    ).toBe(false);
  });

  it("is never part of a saved 양식", () => {
    expect(printPresetInputSchema.shape).not.toHaveProperty("tag");
  });
});
