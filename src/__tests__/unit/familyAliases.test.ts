import { describe, expect, it } from "vitest";
import {
  canonicalFamilyKey,
  familyKeyVariants,
} from "@/lib/generator/familyAliases";
import { countFamilies, familyIdOf } from "@/lib/generator/familyKey";

describe("source-proven family aliases", () => {
  const unitId = "b107b8ef-1798-4878-aaaf-7bdf4eac5489";
  const key = (n: number) => `mid:2-1|연립일차방정식|${n}A`;

  it("shares the reasoning parent across coefficient positions, preserving the two solution cases", () => {
    const rows = [19, 20, 21, 22, 23, 24, 25, 26].map((n) => ({
      id: String(n),
      unitId,
      familyKey: key(n),
    }));
    expect(countFamilies(rows)).toBe(2);
    expect(familyIdOf(rows[0])).not.toBe(familyIdOf(rows[1]));
    expect(familyKeyVariants(unitId, key(23))).toEqual(
      [19, 21, 23, 25].map(key),
    );
    expect(
      canonicalFamilyKey(unitId, canonicalFamilyKey(unitId, key(25))),
    ).toBe(key(19));
  });

  it("does not merge the same spelling outside the proved unit or unknown/null types", () => {
    expect(canonicalFamilyKey("other-unit", key(25))).toBe(key(25));
    expect(
      countFamilies([
        { id: "a", unitId, familyKey: null },
        { id: "b", unitId, familyKey: " " },
      ]),
    ).toBe(2);
    expect(familyKeyVariants(unitId, "other-type")).toEqual(["other-type"]);
  });

  it("uses the delegated base identity while preserving unrelated combo types", () => {
    const unit = "761fad1c-913a-45e4-9639-93b4291390fd";
    const base = "mid:2-1|연립일차방정식|19";
    expect(
      canonicalFamilyKey(
        unit,
        "mid:중2|여러 가지 연립방정식의 풀이::중2|순환소수의 분수 표현",
      ),
    ).toBe(base);
    expect(familyKeyVariants(unit, base)).toHaveLength(2);
    expect(canonicalFamilyKey(unit, "mid:중2|다른 조합")).toBe(
      "mid:중2|다른 조합",
    );
  });
});
