// Candidate destination: src/__tests__/unit/figureBakeGroups.test.ts
// Not executed in the worker: parent applies own-figureBake.patch first.
import { describe, expect, it } from "vitest";
import current from "@/lib/figure/asset-editor-geometry.json";
import legacy from "@/lib/figure/asset-editor-geometry-legacy-20261021.json";
import { bakeFigureObjects, bakeFigureSelection, type SelectionBounds } from "@/components/unified/figure-editor/figureBake";
import { isFigureAssetLayer } from "@/components/unified/figure-editor/figureAssetGeometry";

const NS = "http://www.w3.org/2000/svg";
const wrap = (body: string) => `<svg xmlns="${NS}" viewBox="0 0 1000 1000" data-n-last="17">${body}</svg>`;
const read = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");
function measured(svg: string, id: string): SelectionBounds | undefined {
  let found: SelectionBounds | undefined;
  bakeFigureObjects(svg, [id], (boxes) => { found = boxes.get(id); return null; });
  return found;
}
type Signature = [string, [string, string][], Signature[]];
function stock(entry: { signature: string }, slug = "airplane"): string {
  const doc = read(wrap(""));
  const group = doc.createElementNS(NS, "g");
  group.setAttribute("data-object-id", "asset");
  group.setAttribute("data-n", "17");
  group.setAttribute("data-asset", slug);
  group.setAttribute("transform", "translate(40 30) scale(0.5)");
  const build = ([tag, attrs, children]: Signature): Element => {
    const el = doc.createElementNS(NS, tag);
    attrs.forEach(([k, v]) => el.setAttribute(k, v));
    children.forEach((child) => el.append(build(child)));
    return el;
  };
  (JSON.parse(entry.signature) as Signature[]).forEach((child) => group.append(build(child)));
  doc.documentElement.append(group);
  return new XMLSerializer().serializeToString(doc);
}
const childrenGeometry = (el: Element): unknown => [...el.children].map((child) => [
  child.localName,
  [...child.attributes].filter((a) => a.name !== "xmlns").map((a) => [a.name, a.value]).sort(),
  childrenGeometry(child),
]);

describe("recursive ordinary groups retain registered asset frame boundaries", () => {
  it("measures nested ordinary group matrices once and moves only the group frame", () => {
    const svg = wrap('<g data-object-id="g" transform="translate(100 80) scale(2)"><g transform="translate(5 10)"><rect width="20" height="40"/></g></g>');
    expect(measured(svg, "g")).toEqual({ min: [110, 100], max: [150, 180], center: [130, 140] });
    const moved = bakeFigureSelection(svg, ["g"], () => [1, 0, 0, 1, 7, -3]);
    expect(measured(moved, "g")).toEqual({ min: [117, 97], max: [157, 177], center: [137, 137] });
    expect(childrenGeometry(read(moved).querySelector('[data-object-id="g"]')!))
      .toEqual(childrenGeometry(read(svg).querySelector('[data-object-id="g"]')!));
  });

  it("uses actual curve ink inside ordinary groups instead of its control hull", () => {
    const svg = wrap('<g data-object-id="g" transform="translate(10 20)"><g transform="scale(2)"><path d="M0 0 Q50 100 100 0"/></g></g>');
    const bounds = measured(svg, "g")!;
    expect(bounds.min).toEqual([10, 20]);
    expect(bounds.max[0]).toBeCloseTo(210, 8);
    expect(bounds.max[1]).toBeCloseTo(120, 8);
  });

  it.each([["current", current.assets.airplane], ["legacy39", legacy.assets.airplane]] as const)
  ("keeps %s registered container, number and child geometry under whole-matrix movement", (_, entry) => {
    const svg = stock(entry);
    const [w, h] = entry.viewBox;
    expect(isFigureAssetLayer(read(svg).querySelector('[data-asset]')!)).toBe(true);
    expect(measured(svg, "asset")).toEqual({ min: [40, 30], max: [40 + w / 2, 30 + h / 2], center: [40 + w / 4, 30 + h / 4] });
    const moved = bakeFigureSelection(svg, ["asset"], () => [1, 0, 0, 1, 7, -3]);
    const old = read(svg).querySelector('[data-asset]')!, next = read(moved).querySelector('[data-asset]')!;
    expect(childrenGeometry(next)).toEqual(childrenGeometry(old));
    expect(next.getAttribute("data-n")).toBe("17");
    expect(next.getAttribute("data-object-id")).toBe("asset");
    expect(isFigureAssetLayer(next)).toBe(true);
    expect(measured(moved, "asset")!.min).toEqual([47, 27]);
  });

  it.each(["unknown-slug", "added-math-line", "nonfinite-transform", "singular-transform"] as const)
  ("does not fall through registered-frame rejection for %s", (fault) => {
    const doc = read(stock(current.assets.airplane));
    const asset = doc.querySelector('[data-asset]')!;
    if (fault === "unknown-slug") asset.setAttribute("data-asset", "not-registered");
    if (fault === "added-math-line") {
      const line = doc.createElementNS(NS, "line");
      line.setAttribute("x2", "500"); asset.append(line);
    }
    if (fault === "nonfinite-transform") asset.setAttribute("transform", "translate(NaN 0)");
    if (fault === "singular-transform") asset.setAttribute("transform", "scale(0)");
    const svg = new XMLSerializer().serializeToString(doc);
    expect(isFigureAssetLayer(asset)).toBe(false);
    expect(measured(svg, "asset")).toBeUndefined();
    expect(bakeFigureSelection(svg, ["asset"], () => [1, 0, 0, 1, 7, -3])).toBe(svg);
  });
});
