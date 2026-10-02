// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { FigureSvg } from "@/components/concept-blank/paper/FigureSvg";

it("prints math labels and answers synchronously without window or DOMParser", () => {
  expect(typeof window).toBe("undefined");
  expect(typeof DOMParser).toBe("undefined");
  const html = renderToStaticMarkup(
    <FigureSvg
      answers
      item={{
        id: "ssr-figure",
        section: "중3::test::test",
        level: "중",
        prompt: "$x$축",
        viewBox: "0 0 120 100",
        svg: '<text x="20" y="20" font-size="12">x</text><text x="40" y="20" font-size="12">원점</text>',
        tags: [{ x: 30, y: 40, w: 40, answer: "$\\frac{1}{2}$" }],
        lines: [],
      }}
    />,
  );
  expect(html).toContain('data-label="x"');
  expect(html).toContain('data-mml-node="mfrac"');
  expect(html).toContain("<path");
  expect(html).toContain(">원점</text>");
  expect(html).not.toMatch(/foreignObject|<image|<use|>x<\/text>/);
});
