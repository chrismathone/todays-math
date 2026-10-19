import { describe, expect, it } from "vitest";
import {
  arithmeticGeometryNames,
  arithmeticGeometryText,
  arithmeticTypeTitle,
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
  it("typesets variables in titles while preserving roman measurement units", () => {
    expect(arithmeticTypeTitle("자연수 - 분수")).toBe("자연수 $-$ 분수");
    expect(arithmeticTypeTitle("큰 수의 1/10·1/100·1/1000배")).toBe(
      "큰 수의 $\\frac{1}{10}$·$\\frac{1}{100}$·$\\frac{1}{1000}$배",
    );
    expect(arithmeticTypeTitle("두 자리 수 × 한 자리 수")).toBe(
      "두 자리 수 $\\times$ 한 자리 수",
    );
    expect(arithmeticTypeTitle("x²의 계수가 1인 이차식 인수분해")).toBe(
      "$x^{2}$의 계수가 1인 이차식 인수분해",
    );
    expect(arithmeticTypeTitle("cm·m: x^3와 y")).toBe(
      "$\\mathrm{cm}$·$\\mathrm{m}$: $x^{3}$와 $y$",
    );
  });
});
