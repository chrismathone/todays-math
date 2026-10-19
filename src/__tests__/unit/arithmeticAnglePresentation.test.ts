import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { inflateSync, strFromU8 } from "fflate";
import assets from "../../lib/arithmetic-v2/presentation/angles.assets.json";
import { presentArithmeticAngleSvg } from "../../lib/arithmetic-v2/presentation/angles";
import { angleEntries } from "../../../scripts/qa/arithmetic-angle-presentation-specs";
import { checkAnglePresentation } from "../../../scripts/qa/arithmetic-angle-presentation-proof";

describe("trusted elementary angle display adapter", () => {
  it("preserves every finite source geometry, given, target and label owner", () => {
    const entries = angleEntries();
    expect(entries).toHaveLength(912);
    expect(new Set(entries.map((e) => e.family)).size).toBe(8);
    for (const entry of entries) {
      const before = entry.original,
        svg = presentArithmeticAngleSvg(entry.id, before);
      expect(svg, entry.id).toBeTypeOf("string");
      checkAnglePresentation(entry, svg!);
      expect(entry.original).toBe(before);
    }
  });
  it("returns undefined for unsupported IDs/domains and noncanonical marker shapes", () => {
    const original = angleEntries()[0].original;
    for (const id of [
      "",
      "__proto__",
      "age-e4-angle-sum-v2-20-20",
      "age-e4-angle-sum-v1-21-20",
      "age-e4-angle-difference-v1-80-70",
      "age-e4-isosceles-base-angle-v1-60",
      "age-e4-angle-turn-remainder-v1-360",
    ])
      expect(presentArithmeticAngleSvg(id, original)).toBeUndefined();
    expect(
      presentArithmeticAngleSvg(angleEntries()[0].id, "<svg/>"),
    ).toBeUndefined();
  });
  it("locks the generated pack digest and honest compressed byte count", () => {
    const bytes = Buffer.from(assets.svgPack, "base64"),
      json = strFromU8(inflateSync(bytes));
    expect(bytes.length).toBe(assets.compressedBytes);
    expect(Buffer.byteLength(json)).toBe(assets.rawBytes);
    expect(createHash("sha256").update(json).digest("hex")).toBe(assets.sha256);
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(
      angleEntries()
        .map((e) => e.id)
        .sort(),
    );
  });
});
