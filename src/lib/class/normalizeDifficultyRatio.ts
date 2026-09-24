import type { Prisma } from "@prisma/client";

import { difficultyRatioSchema } from "@/contracts/common.contract";
import {
  DEFAULT_DIFFICULTY_RATIO,
  type DifficultyRatio,
} from "@/contracts/difficulty";

/**
 * Older class rows and the eywa sync used three or four difficulty keys.
 * Preserve customized counts; only the old factory preset becomes today's preset.
 */
export function normalizeStoredDifficultyRatio(
  value: Prisma.JsonValue,
): DifficultyRatio {
  const current = difficultyRatioSchema.safeParse(value);
  if (current.success) return current.data;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (
      keys.length === 3 &&
      keys.every((key) => ["easy", "mid", "hard"].includes(key))
    ) {
      const old = value as Record<"easy" | "mid" | "hard", unknown>;
      if (old.easy === 3 && old.mid === 4 && old.hard === 1)
        return { ...DEFAULT_DIFFICULTY_RATIO };
      return difficultyRatioSchema.parse({
        연산: 0,
        기본: old.easy,
        응용: old.mid,
        심화하: old.hard,
        심화중: 0,
        심화상: 0,
      });
    }

    if (
      keys.length === 4 &&
      keys.every((key) => ["연산", "기본", "응용", "심화"].includes(key))
    ) {
      const old = value as Record<"연산" | "기본" | "응용" | "심화", unknown>;
      return difficultyRatioSchema.parse({
        연산: old.연산,
        기본: old.기본,
        응용: old.응용,
        심화하: old.심화,
        심화중: 0,
        심화상: 0,
      });
    }
  }

  // Unknown/corrupt rows still fail visibly instead of silently changing counts.
  return difficultyRatioSchema.parse(value);
}
