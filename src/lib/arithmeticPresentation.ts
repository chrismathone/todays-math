import {
  ARITHMETIC_SKILL_NOTATION,
  type ArithmeticSkillSelection,
} from "@/contracts/arithmetic.contract";

/** Labels describe validated generation conditions. Popularity needs separate usage evidence. */
export function arithmeticFeatureLabels(
  selection: ArithmeticSkillSelection,
): string[] {
  const notation =
    ARITHMETIC_SKILL_NOTATION[selection.skillId] === "vertical"
      ? "세로셈"
      : "가로셈";
  switch (selection.skillId) {
    case "one-digit-add":
      return [
        selection.constraints.carry === "none"
          ? "받아올림 없음"
          : "받아올림 있음",
        notation,
      ];
    case "two-digit-vertical-add":
    case "two-digit-times-one":
      return [
        selection.constraints.carryCount
          ? `받아올림 ${selection.constraints.carryCount}회`
          : "받아올림 없음",
        notation,
      ];
    case "one-digit-sub":
      return ["음이 아닌 답", notation];
    case "two-digit-vertical-sub":
      return [
        selection.constraints.borrowCount ? "받아내림 1회" : "받아내림 없음",
        notation,
      ];
    case "times-table":
      return [
        `${[...selection.constraints.dans].sort((a, b) => a - b).join("·")}단`,
        notation,
      ];
    case "two-digit-div-one":
      return ["나머지 없음", notation];
  }
}
