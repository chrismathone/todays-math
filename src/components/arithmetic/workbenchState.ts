import type {
  ArithmeticAllocation,
  ArithmeticSkillSelection,
} from "@/contracts/arithmetic.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import { parseArithmeticSelection } from "@/lib/arithmetic/constraints";
import { listArithmeticSkills } from "@/lib/arithmetic/catalog";
import {
  findArithmeticPreset,
  listArithmeticPresets,
} from "@/lib/arithmeticPresets";

export type WorkbenchAllocation = ArithmeticAllocation & {
  id: string;
  presetId?: string;
  title: string;
};

export function presetAllocation(
  presetId: string,
  id: string,
): WorkbenchAllocation {
  const preset = findArithmeticPreset(presetId);
  if (!preset) throw new Error("연산 유형을 찾을 수 없습니다.");
  return {
    ...structuredClone(preset.selection),
    count: preset.defaultCount,
    id,
    presetId,
    title: preset.title,
  };
}

export function coreAllocation(
  item: WorkbenchAllocation,
): ArithmeticAllocation {
  return {
    skillId: item.skillId,
    constraints: item.constraints,
    count: item.count,
  } as ArithmeticAllocation;
}

/** Existing operands are never regenerated. Only the editable next-generation settings are restored. */
export function restoreWorkbenchAllocations(
  sheet: ArithmeticSheetPayload,
): WorkbenchAllocation[] {
  const groups = new Map<string, WorkbenchAllocation>();
  for (const { spec } of sheet.rounds[0].items) {
    const selection = parseArithmeticSelection(spec.skillId, spec.constraints);
    const key = selectionKey(selection);
    const previous = groups.get(key);
    if (previous) {
      previous.count++;
      continue;
    }
    const preset = listArithmeticPresets().find(
      (item) => selectionKey(item.selection) === key,
    );
    groups.set(key, {
      ...selection,
      count: 1,
      id: `restored-${groups.size}`,
      presetId: preset?.id,
      title:
        preset?.title ??
        `${listArithmeticSkills().find((item) => item.skillId === spec.skillId)?.label} · 직접 설정`,
    });
  }
  return [...groups.values()];
}

function selectionKey(selection: ArithmeticSkillSelection) {
  return JSON.stringify(
    parseArithmeticSelection(selection.skillId, selection.constraints),
  );
}
