import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type { ArithmeticV2SheetPayload } from "@/contracts/arithmeticV2.contract";

/** Regeneration from review preserves EACH saved round, including heterogeneous rounds. */
export function arithmeticV2ReviewRounds(sheet: ArithmeticV2SheetPayload) {
  return sheet.rounds.map((round) => {
    const counts = new Map<string, number>();
    for (const item of round.items)
      counts.set(item.typeId, (counts.get(item.typeId) ?? 0) + 1);
    return {
      allocations: [...counts].map(([typeId, count]) => ({ typeId, count })),
    };
  });
}

export function arithmeticReviewRounds(sheet: ArithmeticSheetPayload) {
  return sheet.rounds.map((round) => {
    const groups = new Map<
      string,
      {
        skillId: (typeof round.items)[number]["spec"]["skillId"];
        constraints: (typeof round.items)[number]["spec"]["constraints"];
        count: number;
      }
    >();
    for (const { spec } of round.items) {
      const key = JSON.stringify([spec.skillId, spec.constraints]);
      const previous = groups.get(key);
      if (previous) previous.count++;
      else
        groups.set(key, {
          skillId: spec.skillId,
          constraints: structuredClone(spec.constraints),
          count: 1,
        });
    }
    return { skills: [...groups.values()] };
  });
}
