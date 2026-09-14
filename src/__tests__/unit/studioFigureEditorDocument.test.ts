import { describe, expect, it } from "vitest";
import {
  addFigureObject,
  cleanFigureForSave,
  editFigureObject,
  figureObjects,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";
import {
  copyFigureSelection,
  pasteFigureSelection,
} from "@/components/unified/figure-editor/figureClipboard";
import {
  createFigureSaveResult,
  initialFigureSource,
  svgFromImage,
} from "@/components/unified/figure-editor/figureDocument";
import { typesetFigureSvg } from "@/components/unified/figure-editor/figureTypeset";
import {
  functionGraph,
  DEFAULT_FUNCTION,
} from "@/components/unified/figure-editor/functionGraph";
import { moveFigureHandle } from "@/components/unified/figure-editor/figureHandles";

const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");

describe("ported FigureEditor document", () => {
  it("retains every manual shape, edited handles, functions and math source through save/reopen", async () => {
    let svg = prepareFigureSvg();
    for (const type of [
      "line",
      "arrow",
      "curve",
      "circle",
      "ellipse",
      "rect",
      "text",
    ]) {
      svg = addFigureObject(
        svg,
        type,
        { x: 20, y: 30 },
        { x: 90, y: 110 },
        "$\\frac{1}{2}$",
      ).svg;
    }
    const line = figureObjects(svg)[0];
    svg = moveFigureHandle(svg, line.id, "end", { x: 125, y: 170 });
    svg = editFigureObject(svg, line.id, { transform: "translate(7 9)" });
    const graph = functionGraph({ ...DEFAULT_FUNCTION, axes: false });
    svg = pasteFigureSelection(svg, graph.svg, 0)!.svg;
    const rendered = await typesetFigureSvg(cleanFigureForSave(svg));
    const saved = createFigureSaveResult(
      svg,
      rendered,
      "data:image/png;base64,crop",
    );
    const reopened = initialFigureSource(saved.dataUrl, saved.svg);
    expect(reopened.error).toBe("");
    expect(saved.originalImage).toBe("data:image/png;base64,crop");
    expect(saved.svg).not.toContain("data-object-id");
    expect(svgFromImage(saved.dataUrl)).toContain("<path");
    expect(figureObjects(reopened.svg)).toHaveLength(8);
    expect(parse(reopened.svg).querySelector("line")?.getAttribute("x2")).toBe(
      "125",
    );
    expect(
      parse(reopened.svg).querySelector("line")?.getAttribute("transform"),
    ).toBe("translate(7 9)");
    expect(
      parse(reopened.svg).querySelector("text")?.getAttribute("data-mj"),
    ).toBe("$\\frac{1}{2}$");
    expect(
      parse(reopened.svg).querySelector("[data-function]")?.getAttribute("d"),
    ).toBe(graph.path);
    expect(
      parse(svgFromImage(saved.dataUrl)!).querySelector("text"),
    ).toBeNull();
  });

  it("keeps parent transforms and local arrow definitions on repeated paste", () => {
    const arrow = addFigureObject(
      prepareFigureSvg(),
      "arrow",
      { x: 1, y: 2 },
      { x: 20, y: 30 },
    );
    const moved = editFigureObject(arrow.svg, arrow.id, {
      transform: "rotate(20)",
    });
    const copied = copyFigureSelection(moved, [arrow.id])!;
    const first = pasteFigureSelection(prepareFigureSvg(), copied)!;
    const second = pasteFigureSelection(first.svg, copied)!;
    const doc = parse(second.svg);
    const markers = [...doc.querySelectorAll("marker")].map((node) => node.id);
    expect(new Set(markers).size).toBe(2);
    const lines = [...doc.querySelectorAll("line")];
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line?.getAttribute("transform")).toBe("rotate(20)");
      expect(markers).toContain(line.getAttribute("marker-end")!.slice(5, -1));
    }
  });

  it("sanitizes namespace tricks, scripts, CSS, event handlers and external references while retaining geometry", () => {
    const source = `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" xml:base="https://evil.example/" viewBox="0 0 NaN -2" width="600" height="400" onload="alert(1)">
      <style>body { display:none }</style><script>alert(1)</script><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">bad</div></foreignObject>
      <g xmlns="http://www.w3.org/1999/xhtml"><script>bad</script></g>
      <image href="https://evil.example/a.png"/><animate attributeName="href" to="javascript:alert(1)"/>
      <defs><marker id="arrow"><path d="M0 0L5 5"/></marker></defs>
      <g data-object-id="hostile&quot;]"><line x1="1" y1="2" x2="3" y2="4" onclick="bad()" marker-end="url(#arrow)" style="stroke:#123456;position:fixed;fill:url(https://evil.example/f);filter:url(#outside)"/></g>
      <use xlink:href="//evil.example/x"/><use href="#outside"/><use href="#arrow"/>
      <rect width="20" height="30" fill="url(https://evil.example/x)" style="stroke:u\\72l(//evil.example/x)"/>
      <text x="20" y="40" data-mj="$x^2$">x²</text>
    </svg>`;
    const sanitized = prepareFigureSvg(source);
    const doc = parse(sanitized);
    expect(doc.documentElement?.getAttribute("viewBox")).toBe("0 0 600 400");
    expect(
      doc.querySelector("script,style,foreignObject,image,animate"),
    ).toBeNull();
    expect(sanitized).not.toMatch(
      /evil\.example|onload|onclick|xml:base|position|filter|hostile/,
    );
    expect(doc.querySelector("line")?.getAttribute("marker-end")).toBe(
      "url(#arrow)",
    );
    expect(doc.querySelector("line")?.getAttribute("style")).toContain(
      "stroke",
    );
    expect(doc.querySelectorAll("use[href]")).toHaveLength(1);
    expect(doc.querySelector("text")?.getAttribute("data-mj")).toBe("$x^2$");
    expect(figureObjects(sanitized).map((object) => object.type)).toEqual([
      "line",
      "rect",
      "text",
    ]);
  });

  it("supports Unicode data URLs and imported SVG without xmlns, and contains malformed input", () => {
    const raw =
      '<svg width="120" height="80"><text x="10" y="20">원본 A</text></svg>';
    const binary = Array.from(new TextEncoder().encode(raw), (byte) =>
      String.fromCharCode(byte),
    ).join("");
    expect(svgFromImage(`data:image/svg+xml;base64,${btoa(binary)}`)).toBe(raw);
    expect(initialFigureSource(raw).svg).toContain("원본 A");
    expect(initialFigureSource(raw).svg).toContain('viewBox="0 0 120 80"');
    expect(initialFigureSource("raster.png", "<svg><").error).not.toBe("");
    expect(() =>
      prepareFigureSvg('<!DOCTYPE svg [<!ENTITY x "text">]><svg/>'),
    ).toThrow();
  });

  it("keeps Korean fallback text and never evaluates executable function expressions", async () => {
    const text = addFigureObject(
      prepareFigureSvg(),
      "text",
      { x: 10, y: 20 },
      { x: 10, y: 20 },
      "원본",
    );
    expect(await typesetFigureSvg(text.svg)).toContain("원본");
    expect(() =>
      functionGraph({ ...DEFAULT_FUNCTION, expression: "globalThis.alert(1)" }),
    ).toThrow();
    const inverse = functionGraph({
      ...DEFAULT_FUNCTION,
      expression: "1/x",
      axes: false,
      yMin: -10,
    });
    expect(inverse.path.match(/M/g)!.length).toBeGreaterThan(1);
    expect(inverse.path).not.toMatch(/NaN|Infinity/);
  });
});
