// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  findArithmeticPreset,
  listArithmeticPresets,
} from "@/lib/arithmeticPresets";
import { ARITHMETIC_SKILL_IDS, arithmeticDomainSize } from "@/lib/arithmetic";

describe("authored arithmetic presets", () => {
  it("provides stable, distinct supported selections with exact positive capacities", () => {
    const presets = listArithmeticPresets();
    expect(presets.length).toBeGreaterThanOrEqual(60);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(
      presets.length,
    );
    expect(
      new Set(presets.map((preset) => JSON.stringify(preset.selection))).size,
    ).toBe(presets.length);
    expect(new Set(presets.map((preset) => preset.selection.skillId))).toEqual(
      new Set(ARITHMETIC_SKILL_IDS),
    );
    for (const preset of presets) {
      expect(preset.id).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(preset.title.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
      expect(preset.domainSize).toBeGreaterThan(0);
      expect(preset.domainSize).toBe(
        arithmeticDomainSize(
          preset.selection.skillId,
          preset.selection.constraints,
        ),
      );
      expect(preset.defaultCount).toBe(Math.min(20, preset.domainSize));
      expect(findArithmeticPreset(preset.id)).toBe(preset);
      expect(Object.isFrozen(preset.selection.constraints)).toBe(true);
    }
    expect(findArithmeticPreset("unknown-preset")).toBeUndefined();
    expect(findArithmeticPreset("__proto__")).toBeUndefined();
    expect(listArithmeticPresets()).toBe(presets);
  });
});
