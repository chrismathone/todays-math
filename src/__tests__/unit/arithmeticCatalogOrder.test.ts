import { describe, expect, it } from "vitest";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2";
import { sortArithmeticCatalog } from "@/lib/arithmetic-v2/presentation/catalogOrder";

describe("catalog in textbook unit order", () => {
  const sorted = sortArithmeticCatalog(listArithmeticV2Types());

  it("keeps every type exactly once", () => {
    const all = listArithmeticV2Types();
    expect(sorted).toHaveLength(all.length);
    expect(new Set(sorted.map((t) => t.id)).size).toBe(all.length);
  });

  it("never splits a unit across other units and orders grades then semesters", () => {
    const seen = new Set<string>();
    let previous = "";
    let lastRank = -1;
    const grades = [
      "초1",
      "초2",
      "초3",
      "초4",
      "초5",
      "초6",
      "중1",
      "중2",
      "중3",
    ];
    for (const type of sorted) {
      const key = `${type.grade}:${type.curriculum.semester}:${type.curriculum.unit}`;
      if (key !== previous) {
        expect(seen.has(key), `${key} appears twice`).toBe(false);
        seen.add(key);
        previous = key;
      }
      const rank = grades.indexOf(type.grade) * 2 + type.curriculum.semester;
      expect(rank).toBeGreaterThanOrEqual(lastRank);
      lastRank = rank;
    }
  });

  it("lists 중3 as 제곱근 → 인수분해 → 이차방정식 → 이차함수 → 삼각비 → 원 → 통계", () => {
    const units = [
      ...new Set(
        sorted.filter((t) => t.grade === "중3").map((t) => t.curriculum.unit),
      ),
    ];
    expect(units).toEqual([
      "제곱근과 실수",
      "다항식의 곱셈과 인수분해",
      "이차방정식",
      "이차함수와 그래프",
      "삼각비",
      "원의 성질",
      "통계",
    ]);
  });

  it("puts an unknown unit after the known ones of its semester without dropping it", () => {
    const sample = sortArithmeticCatalog([
      { id: "x", grade: "중3", curriculum: { semester: 2, unit: "새 단원" } },
      { id: "y", grade: "중3", curriculum: { semester: 2, unit: "통계" } },
      { id: "z", grade: "중3", curriculum: { semester: 2, unit: "삼각비" } },
    ] as const);
    expect(sample.map((t) => t.id)).toEqual(["z", "y", "x"]);
  });
});
