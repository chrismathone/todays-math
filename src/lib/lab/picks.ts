import type { ChoiceOption } from "./types";

export function qtyPicks(
  correct: number,
  distractors: number[],
  unit = "",
): ChoiceOption[] {
  const suffix = unit ? ` ${unit}` : "";
  const items = [correct, ...distractors.filter((n) => n !== correct)].map(
    (n) => ({
      id: String(n),
      label: `${n}${suffix}`,
    }),
  );
  const start = items.length ? (correct * 3) % items.length : 0;
  return [...items.slice(start), ...items.slice(0, start)];
}
