import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FigureSvg } from "@/components/concept-blank/paper/FigureSvg";
import type { FigureItem } from "@/contracts/conceptBlank.contract";
import { BANK_PARTS } from "@/lib/concept-blank/bank";
import {
  typesetConceptFigure,
  uprightUnits,
} from "@/lib/concept-blank/figureTypeset";

const item: FigureItem = {
  id: "figure-typeset",
  section: "중3::test::test",
  level: "중",
  prompt: "$y=ax^2$ 그래프",
  viewBox: "0 0 240 160",
  svg: '<path d="M20 140 L220 140" stroke="#222"/><text x="220" y="154" font-size="12" fill="#222">x</text><text x="10" y="16" font-size="12" fill="#222">y</text><text x="10" y="154" font-size="12" fill="#222">O</text><text x="110" y="154" font-size="12" fill="#222">2</text><text x="30" y="30" font-size="12" fill="#222">꼭짓점</text>',
  tags: [
    { x: 70, y: 40, w: 36, answer: "√2" },
    { x: 120, y: 60, w: 48, answer: "x축" },
  ],
  lines: [],
};

describe("concept blank figure math typography", () => {
  it("renders math paths on the first server and client render, preserving Korean text and geometry", () => {
    const server = renderToStaticMarkup(<FigureSvg item={item} />);
    const { container } = render(<FigureSvg item={item} />);
    const parsedServer = document.createElement("div");
    parsedServer.innerHTML = server;
    expect(container.innerHTML).toBe(parsedServer.innerHTML);
    for (const label of ["x", "y", "O", "2"]) {
      expect(
        container.querySelector(`[data-label="${label}"] path`),
      ).not.toBeNull();
      expect(
        [...container.querySelectorAll("text")].some(
          (node) => node.textContent === label,
        ),
      ).toBe(false);
    }
    expect(
      container.querySelector('path[d="M20 140 L220 140"]'),
    ).not.toBeNull();
    expect(container.querySelector("text")?.textContent).toBe("꼭짓점");
    expect(container.querySelector("svg")).toHaveAttribute(
      "viewBox",
      item.viewBox,
    );
    expect(container.querySelector("foreignObject, image, use")).toBeNull();
    expect(container.querySelector('[data-label="√2"]')).toBeNull();
  });

  // 전수 검토 2026-10-02 — 초3 그림에서 `1 km` 은 서고 `650 m` 만 기울어 찍혔다(홑 소문자를 변수로 보는 라벨 규칙).
  it("sets a one-letter unit after a number upright, and leaves lone letters as variables", () => {
    const text = (label: string) =>
      typesetConceptFigure(
        `<text x="10" y="20" font-size="11" fill="#1F1F23">${label}</text>`,
      )!;
    const glyphs = (label: string) =>
      [...text(label).matchAll(/data-c="([0-9A-F]+)"/g)].map((m) => m[1]);
    expect(uprightUnits("650 m")).toBe(String.raw`650\,\mathrm{m}`);
    expect(uprightUnits("2 kg 100 g")).toBe(
      String.raw`2\,\mathrm{kg}\,100\,\mathrm{g}`,
    );
    // 정자체 m(6D) · g(67) — 기울인 글자(1D45A · 1D454)가 아니다
    expect(glyphs("650 m")).toEqual(["36", "35", "30", "6D"]);
    expect(glyphs("2 kg 100 g").filter((c) => c === "67")).toHaveLength(2);
    expect(glyphs("2 kg 100 g")).not.toContain("1D454");
    // 홀로 선 글자 · 수에 붙은 글자는 변수 그대로
    for (const label of ["m", "x", "2a", "$650 m$", "x축"])
      expect(uprightUnits(label)).toBe(label);
    expect(glyphs("m")).toEqual(["1D45A"]);
    expect(glyphs("2a")).toContain("1D44E");
  });

  it("typesets answer tags, fits real glyph bounds and preserves mixed Korean", () => {
    const { container } = render(<FigureSvg item={item} answers />);
    for (const tag of item.tags) {
      const label = container.querySelector(`[data-label="${tag.answer}"]`)!;
      expect(label.querySelector("path")).not.toBeNull();
      expect(Number(label.getAttribute("data-w"))).toBeLessThanOrEqual(
        tag.w - 4 + 0.001,
      );
      const top =
        Number(label.getAttribute("data-base")) -
        Number(label.getAttribute("data-a"));
      const bottom =
        Number(label.getAttribute("data-base")) +
        Number(label.getAttribute("data-d"));
      expect(top).toBeGreaterThanOrEqual(tag.y + 1.99);
      expect(bottom).toBeLessThanOrEqual(tag.y + 16.01);
    }
    expect(
      container.querySelector('[data-label="x축"] text')?.textContent,
    ).toBe("축");
    expect(container.querySelector('[data-label="x축"] text')).toHaveAttribute(
      "font-family",
      "inherit",
    );
    expect(
      container.querySelector('[data-label="√2"] [data-mml-node="msqrt"]'),
    ).not.toBeNull();
  });

  it("preserves unsupported text layouts instead of losing the label", () => {
    const original =
      '<text x="10" y="20" font-size="12"><tspan>한글</tspan></text>';
    expect(typesetConceptFigure(original)).toBe(original);
    expect(
      typesetConceptFigure('<text x="?" y="20" font-size="12">x</text>'),
    ).toContain(">x</text>");
  });

  it("keeps hostile answer text inert during math typesetting and fallback", () => {
    for (const answer of [
      '<img src="x" onerror="alert(1)">',
      "\\href{javascript:alert(1)}{x}",
      '<script>alert("x")</script>',
    ]) {
      const { container, unmount } = render(
        <FigureSvg
          item={{ ...item, tags: [{ x: 20, y: 20, w: 80, answer }] }}
          answers
        />,
      );
      expect(
        container.querySelector(
          "script, img, image, a, foreignObject, [onerror], [href]",
        ),
      ).toBeNull();
      expect(container.querySelector("[data-cb-tag]")?.textContent).not.toBe(
        "",
      );
      unmount();
    }
  });

  it.each([
    "<script>alert(1)</script>",
    '<text onload = "alert(1)">x</text>',
    '<a href="javascript:alert(1)"><text>x</text></a>',
    "<foreignObject><p>html</p></foreignObject>",
    '<animate attributeName="href" values="javascript:alert(1)"/>',
  ])("rejects unsafe source fragments without injecting markup", (svg) => {
    const { container } = render(<FigureSvg item={{ ...item, svg }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps all existing bank figures renderable with their labels present", () => {
    for (const bank of Object.values(BANK_PARTS))
      for (const figure of bank.figures) {
        const svg = typesetConceptFigure(figure.svg);
        expect(svg, figure.id).not.toBeNull();
        const parsed = new DOMParser().parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
          "image/svg+xml",
        );
        expect(parsed.querySelector("parsererror"), figure.id).toBeNull();
        const before = new DOMParser().parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg">${figure.svg}</svg>`,
          "image/svg+xml",
        );
        const labels = [...parsed.querySelectorAll("[data-label]")].map(
          (node) => node.getAttribute("data-label"),
        );
        const plain = [...parsed.querySelectorAll("text")].map(
          (node) => node.textContent,
        );
        for (const text of before.querySelectorAll("text"))
          expect([...labels, ...plain], figure.id).toContain(text.textContent);
      }
  });
});
