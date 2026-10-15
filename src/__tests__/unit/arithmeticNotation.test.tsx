import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { tokenizeMath } from "@/lib/math/segments";
import {
  arithmeticGeometryNotation as geometry,
  arithmeticProseNotation as prose,
} from "@/lib/arithmetic-v2/presentation/notation";

const segment = (name: string) => `\\overline{\\mathrm{${name}}}`;

describe("arithmetic semantic notation", () => {
  it("keeps length equality chains and perpendicular endpoints in complete math spans", () => {
    const result = geometry(
      "AB=AC=22 cm, BC=34 cm인 이등변삼각형 ABC에서 AD⊥BC이다.",
    );
    const math = tokenizeMath(result)
      .filter((p) => p.type !== "text")
      .map((p) => p.value);
    expect(math).toEqual([
      `${segment("AB")} = ${segment("AC")} = 22\\,\\mathrm{cm}`,
      `${segment("BC")} = 34\\,\\mathrm{cm}`,
      "\\triangle \\mathrm{ABC}",
      `${segment("AD")} \\perp ${segment("BC")}`,
    ]);
    expect(geometry(result)).toBe(result);
  });

  it("distinguishes an arc, chord, tangent line and tangent length with the same endpoints", () => {
    const result = geometry(
      "현 TP와 같은 호 TP, 접선 TP와 PO가 이루는 ∠TPO. 접선 PB의 길이",
    );
    expect(result).toContain(`현 $${segment("TP")}$`);
    expect(result).toContain("호 $\\widehat{TP}$");
    expect(result).toContain("접선 $\\overleftrightarrow{\\mathrm{TP}}$");
    expect(result).toContain(`접선 $${segment("PB")}$의 길이`);
    expect(result).toContain("$\\angle \\mathrm{TPO}$");
    const html = renderToStaticMarkup(<MarkdownRenderer content={result} />);
    expect(html).toContain("geom-arc-wrap");
    expect(html).toContain("overline-line");
    expect(html).not.toContain("katex-error");
  });

  it("does not infer lines for finite segments extended towards a point", () => {
    const result = geometry(
      "세 평행선 AD, BE, CF. AB=3 cm. BC를 C 쪽으로 연장한 직선. 반직선 AX",
    );
    for (const name of ["AD", "BE", "CF"])
      expect(result).toContain(`\\overleftrightarrow{\\mathrm{${name}}}`);
    for (const name of ["AB", "BC"]) expect(result).toContain(segment(name));
    expect(result).toContain("\\overrightarrow{\\mathrm{AX}}");
  });

  it("repairs authored segment math without nesting existing marks or changing trig expressions", () => {
    const source =
      "삼각형 $ABC$의 변 $\\mathrm{AB}=3\\,\\mathrm{cm}$, $\\frac{\\mathrm{AC}}{\\mathrm{BC}}$, 각 $A$, $\\sin A$, $\\angle ABC$, $\\overline{AB}$";
    const result = geometry(source);
    expect(result).toContain(`${segment("AB")}=3`);
    expect(result).toContain(`\\frac{${segment("AC")}}{${segment("BC")}}`);
    expect(result).toContain("각 $\\angle \\mathrm{A}$");
    expect(result).toContain("$\\sin A$");
    expect(result).toContain("$\\angle \\mathrm{ABC}$");
    expect(result).toContain("$\\overline{AB}$");
    expect(geometry(result)).toBe(result);
    expect(
      renderToStaticMarkup(<MarkdownRenderer content={result} />),
    ).not.toContain("katex-error");
  });

  it("keeps line names and scalar variables separate from physical units", () => {
    expect(geometry("ℓ∥m, 밑넓이 B=6 cm², 높이 h=2 cm")).toBe(
      "$\\ell \\parallel m$, 밑넓이 $B = 6\\,\\mathrm{cm}^{2}$, 높이 $h = 2\\,\\mathrm{cm}$",
    );
    expect(geometry("m와 cm 단위 바꾸기: 2 m")).toContain(
      "$\\mathrm{m}$와 $\\mathrm{cm}$",
    );
  });

  it("does not confuse 각각 with an angle and groups exact pi quantities before their units", () => {
    expect(geometry("넓이=8 cm², 둘레=12 cm")).toBe(
      "넓이$= 8\\,\\mathrm{cm}^{2}$, 둘레$= 12\\,\\mathrm{cm}$",
    );
    expect(geometry("D, E는 각각 AB, AC의 중점이다.")).toContain(
      `각각 $${segment("AB")}$`,
    );
    expect(geometry("부피 8π/3 cm³, 넓이 10/3 cm²")).toBe(
      "부피 $\\frac{8\\pi}{3}\\,\\mathrm{cm}^{3}$, 넓이 $\\frac{10}{3}\\,\\mathrm{cm}^{2}$",
    );
  });

  it("formats algebra conditions without geometry interpretation and preserves authored formulas", () => {
    expect(prose("x≠0, y≠0일 때 □에 알맞은 k를 구하시오.")).toBe(
      "$x \\ne 0$, $y \\ne 0$일 때 $\\square$에 알맞은 $k$를 구하시오.",
    );
    expect(prose("x=-3, 2x+1, % 앞의 수")).toBe(
      "$x = -3$, $2 x + 1$, $\\%$ 앞의 수",
    );
    expect(prose("$AB=2$와 $$x^2=9$$")).toBe("$AB=2$와 $$x^2=9$$");
  });
});
