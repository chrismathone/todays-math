import { describe, expect, it } from "vitest";
import {
  arithmeticGeometryNames,
  arithmeticGeometryText,
} from "@/lib/arithmetic-v2/presentation/text";

describe("geometry display text", () => {
  it("spells polygon and polyhedron names without changing given quantities", () => {
    expect(
      arithmeticGeometryNames(
        "3각형 4각형 12각형 20각기둥 3각뿔대, 3 cm, 100°",
      ),
    ).toBe("삼각형 사각형 십이각형 이십각기둥 삼각뿔대, 3 cm, 100°");
  });
  it("uses roman units, powers and degrees through the common math renderer", () => {
    expect(arithmeticGeometryText("m와 cm: 2 m, 3.14 cm², 20°, 4 mL")).toBe(
      "$\\mathrm{m}$와 $\\mathrm{cm}$: $2\\,\\mathrm{m}$, $3.14\\,\\mathrm{cm}^{2}$, $20^{\\circ}$, $4\\,\\mathrm{mL}$",
    );
  });
  it("preserves authored inline and display math and is idempotent", () => {
    const before = "$m=2$와 $$h=3$$, 4 cm, 3각형";
    const after = arithmeticGeometryText(before);
    expect(after).toBe("$m=2$와 $$h=3$$, $4\\,\\mathrm{cm}$, 삼각형");
    expect(arithmeticGeometryText(after)).toBe(after);
  });
});
