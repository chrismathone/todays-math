import {
  ARITHMETIC_SKILL_NOTATION,
  type ArithmeticRange,
  type ArithmeticSkillSelection,
} from "@/contracts/arithmetic.contract";
import { listArithmeticSkills } from "@/lib/arithmetic/catalog";
import { findArithmeticPresetBySelection } from "@/lib/arithmeticPresets";

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

const fixed = (range: ArithmeticRange) =>
  range.min === range.max ? range.min : undefined;

/** An operand pinned to one value is the condition a teacher recognises («3 더하기»). */
export function arithmeticFixedOperandLabels(
  selection: ArithmeticSkillSelection,
): string[] {
  const labels: string[] = [];
  const pin = (range: ArithmeticRange, label: (value: number) => string) => {
    const value = fixed(range);
    if (value !== undefined) labels.push(label(value));
  };
  switch (selection.skillId) {
    case "one-digit-add":
    case "two-digit-vertical-add":
      pin(selection.constraints.left, (value) => `${value}에 더하기`);
      pin(selection.constraints.right, (value) => `더하는 수 ${value}`);
      break;
    case "one-digit-sub":
    case "two-digit-vertical-sub":
      pin(selection.constraints.minuend, (value) => `${value}에서 빼기`);
      pin(selection.constraints.subtrahend, (value) => `빼는 수 ${value}`);
      break;
    case "times-table":
      pin(selection.constraints.multiplier, (value) => `곱하는 수 ${value}`);
      break;
    case "two-digit-times-one":
      pin(
        selection.constraints.multiplicand,
        (value) => `곱해지는 수 ${value}`,
      );
      pin(selection.constraints.multiplier, (value) => `곱하는 수 ${value}`);
      break;
    case "two-digit-div-one":
      pin(selection.constraints.dividend, (value) => `나누어지는 수 ${value}`);
      pin(selection.constraints.divisor, (value) => `나누는 수 ${value}`);
      break;
  }
  return labels;
}

/**
 * The review/print group title: the authored card the teacher picked when the
 * saved spec still matches one, otherwise the skill with its conditions.
 * Display only — saved snapshots never carry it.
 */
export function arithmeticSelectionTitle(
  selection: ArithmeticSkillSelection,
): string {
  const labels = arithmeticFeatureLabels(selection);
  const notation = labels[labels.length - 1];
  const preset = findArithmeticPresetBySelection(selection);
  if (preset) return `${preset.title} · ${notation}`;
  const skill = listArithmeticSkills().find(
    (entry) => entry.skillId === selection.skillId,
  );
  return [
    skill?.label ?? selection.skillId,
    ...labels.slice(0, -1),
    ...arithmeticFixedOperandLabels(selection),
    notation,
  ].join(" · ");
}
