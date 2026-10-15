// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";

describe("arithmetic school-unit placement", () => {
  const catalog = listArithmeticV2Types();
  const find = (id: string) => catalog.find((entry) => entry.id === id)!;
  it("gives every available type an explicit semester and unit", () => {
    for (const entry of catalog) {
      expect([1, 2]).toContain(entry.curriculum.semester);
      expect(entry.curriculum.unit.trim().length).toBeGreaterThan(0);
    }
  });
  it("places Pythagoras in middle 2 and distinguishes root-dependent applications", () => {
    expect(find("m2-pythagoras-hypotenuse-integer")).toMatchObject({
      grade: "중2",
      curriculum: { semester: 2, unit: "피타고라스 정리" },
    });
    expect(find("m3-pythagoras-hypotenuse-surd")).toMatchObject({
      grade: "중3",
      curriculum: {
        semester: 1,
        unit: "제곱근과 실수",
        prerequisite: "중2 피타고라스·닮음 활용",
      },
    });
  });
  it("exposes trigonometry separately from circle properties", () => {
    expect(find("m3-trig-ratio").curriculum).toEqual({
      semester: 2,
      unit: "삼각비",
    });
    expect(find("m3-circle-central").curriculum).toEqual({
      semester: 2,
      unit: "원의 성질",
    });
  });
});
