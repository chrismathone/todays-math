import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { FIGURE_ASSETS, PICTURE_ASSETS, ASSET_PROMPT_LIST } from "@/lib/figure/assetCatalog";
import { buildFigureSpecPrompt } from "@/lib/dev-ai/figure-prompt";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import { figureAssetRootFrame } from "@/components/unified/figure-editor/figureAssetGeometry";
import { mirrorFigureSelection } from "@/components/unified/figure-editor/figureMirror";
import { rotateFigureSelection } from "@/components/unified/figure-editor/figureRotate";
import { editFigureObject, figureNumbers, figureObjects, prepareFigureSvg, readFigureSvg, removeFigureObject } from "@/components/unified/figure-editor/figureSvgEditing";
import * as client from "@/components/unified/figure-editor/mathjaxLabel";
import * as server from "@/lib/figure/mathjaxLabel";
import registry from "@/lib/figure/asset-editor-geometry.json";

const body = (slug: string) => fs.readFileSync(`scripts/figure/assets/${slug}.svg`, "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const source = (slug = "house", transform = "translate(100 200)") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><g data-asset="${slug}" transform="${transform}">${body(slug)}</g><line x1="10" y1="10" x2="90" y2="10" stroke="#111"/></svg>`;
const picture = (svg: string) => figureObjects(svg).find((o) => o.attrs["data-asset"]);
const otherObjects = (svg: string) => figureObjects(svg).filter((o) => !o.attrs["data-asset"]);

describe("registered picture geometry stays one editable object", () => {
  it.each(FIGURE_ASSETS.map((a) => a.slug))("matches the actual %s stock body", (slug) => {
    const normalized = fs.readFileSync(`scripts/figure/assets/${slug}.svg`, "utf8").replace(/\r\n/g, "\n");
    const row = (registry.assets as Record<string, { sourceSHA256: string }>)[slug];
    expect(registry.sourceDigestKind).toBe("sha256-utf8-lf");
    expect(row.sourceSHA256).toBe(createHash("sha256").update(normalized).digest("hex"));
    const svg = prepareFigureSvg(source(slug));
    expect(figureObjects(svg)).toHaveLength(2);
    expect(picture(svg)?.attrs["data-asset"]).toBe(slug);
    expect(readFigureSvg(svg).querySelector("[data-asset] [data-object-id]")).toBeNull();
    expect([...figureNumbers(prepareFigureSvg(svg))]).toEqual([...figureNumbers(svg)]);
  });

  it("recognizes actual Python composition after sanitizer and stroke scaling", () => {
    const spec = { version: 2, points: { A: [80, 180], B: [180, 180], C: [180, 40] }, segments: { AB: ["A", "B"], BC: ["B", "C"] },
      assets: [{ asset: "building", from: "B", to: "C" }, { asset: "house", at: "A", width: 30 }] };
    const result = JSON.parse(execFileSync("python", ["-B", "scripts/figure/render_spec.py"], {
      input: JSON.stringify(spec), encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONIOENCODING: "utf-8" }, timeout: 30000,
    }));
    expect(result.error).toBeUndefined();
    const svg = prepareFigureSvg(result.svg);
    expect(figureObjects(svg).filter((o) => o.attrs["data-asset"]).map((o) => o.attrs["data-asset"])).toEqual(["building", "house"]);
    expect(figureObjects(svg)).toHaveLength(4);
  });

  it("preserves arbitrary math geometry behind unknown or forged markers", () => {
    for (const slug of ["unknown", "constructor", "house"]) {
      const raw = `<svg viewBox="0 0 500 500"><g data-asset="${slug}"><line x1="1" y1="2" x2="99" y2="80"/></g></svg>`;
      const svg = prepareFigureSvg(raw);
      expect(readFigureSvg(svg).querySelector("[data-asset]")).toBeNull();
      expect(figureObjects(svg)).toHaveLength(1);
      expect(figureObjects(svg)[0].attrs.x2).toBe("99");
    }
    const extra = source().replace("</g>", '<line x1="1" y1="2" x2="99" y2="80"/></g>');
    const svg = prepareFigureSvg(extra);
    expect(readFigureSvg(svg).querySelector("[data-asset]")).toBeNull();
    expect(figureObjects(svg).some((o) => o.attrs.x2 === "99")).toBe(true);
  });

  it("does not label a leaf or a changed stock path as a whole picture", () => {
    const leaf = prepareFigureSvg('<svg viewBox="0 0 500 500"><line data-asset="house" x1="1" y1="1" x2="90" y2="90"/></svg>');
    expect(picture(leaf)).toBeUndefined();
    const doc = readFigureSvg(source());
    doc.querySelector("[data-asset] polygon")!.setAttribute("points", "0,0 300,0 0,300");
    expect(picture(prepareFigureSvg(new XMLSerializer().serializeToString(doc)))).toBeUndefined();
  });

  it.each(["translate(NaN)", "translate(1e999)", "translate(10px)", "rotate(10 20)", "scale(0)", "matrix(1 0 0 0 0 0)", "translate(1,)" , "translate(10) garbage"])(
    "does not use identity fallback as a certified frame for %s", (transform) => {
      const svg = prepareFigureSvg(source("house", transform));
      expect(picture(svg)).toBeUndefined();
      expect(figureObjects(svg).some((o) => o.type === "polygon")).toBe(true);
    },
  );

  it("rejects an ambiguous parent transform and keeps its ordinary geometry", () => {
    const raw = source().replace('<g data-asset=', '<g transform="rotate(10 20)"><g data-asset=').replace('</g>', '</g></g>');
    expect(picture(prepareFigureSvg(raw))).toBeUndefined();
  });

  it("uses all four transformed frame corners rather than guessed path number pairs", () => {
    const svg = prepareFigureSvg(source("house", "translate(100 200) rotate(45)"));
    const doc = readFigureSvg(svg);
    expect(figureAssetRootFrame(doc.querySelector("[data-asset]")!)).toHaveLength(4);
    const described = describeFigureForEdit(svg).elements.find((e) => e.kind === "집");
    expect(described?.box).toEqual([29.3, 200, 170.7, 341.4]);
    expect(described?.points).toBeUndefined();
  });

  it.each(["rotate", "mirror"])("%s moves the selected picture atomically", (operation) => {
    const svg = prepareFigureSvg(source());
    const id = picture(svg)!.id;
    const beforeBody = readFigureSvg(svg).querySelector("[data-asset]")!.innerHTML;
    const next = operation === "rotate" ? rotateFigureSelection(svg, [id], "cw") : mirrorFigureSelection(svg, [id], "vertical");
    expect(picture(next)?.attrs.transform).not.toBe(picture(svg)?.attrs.transform);
    expect(readFigureSvg(next).querySelector("[data-asset]")!.innerHTML).toBe(beforeBody);
    expect(otherObjects(next)).toEqual(otherObjects(svg));
    expect([...figureNumbers(next)]).toEqual([...figureNumbers(svg)]);
    expect(picture(prepareFigureSvg(next))?.id).toBe(id);
  });

  it("honors size lock and deletes only the whole selected picture", () => {
    const svg = prepareFigureSvg(source());const id = picture(svg)!.id;
    const locked = editFigureObject(svg, id, { "data-size-locked": "true" });
    expect(rotateFigureSelection(locked, [id], "cw")).toBe(locked);
    expect(mirrorFigureSelection(locked, [id], "vertical")).toBe(locked);
    const removed = removeFigureObject(svg, id);
    expect(picture(removed)).toBeUndefined();expect(otherObjects(removed)).toEqual(otherObjects(svg));
  });
});

describe.each([["canvas", client], ["stored", server]] as const)("%s unit labels", (_name, labels) => {
  it.each(["30 m", "5 g", "2 mL"])("typesets %s upright without changing adjacent algebra", (raw) => {
    const laid = labels.typesetLabel(raw);expect(laid).not.toBeNull();
    expect(labels.isSafeFragment(laid!.inner)).toBe(true);
    expect(laid!.inner).not.toMatch(/data-c="1D45[4A]"/); // italic g/m
    const algebra = labels.typesetLabel("2m");expect(algebra?.inner).toContain('data-c="1D45A"');
  });
});

it("shares the allowed picture catalog and keeps planar/projection validation distinct", () => {
  expect(FIGURE_ASSETS).toHaveLength(39);expect(new Set(FIGURE_ASSETS.map((a) => a.slug)).size).toBe(39);
  expect(PICTURE_ASSETS.some((a) => a.slug === "house")).toBe(true);
  expect(PICTURE_ASSETS.some((a) => a.slug === "can")).toBe(false);
  expect(ASSET_PROMPT_LIST).toContain("house=집");expect(ASSET_PROMPT_LIST).not.toContain("can=");
  const prompt = buildFigureSpecPrompt({} as DevAiRequest, { spec: { version: 2 }, error: "right mismatch" });
  expect(prompt).toContain("PICTURE ASSETS");expect(prompt).toContain("A planar right:true");
  expect(prompt).toContain("never add it to silence a flat-geometry error");
  expect(prompt).toContain("Only if the original visibly shows a projected spatial right-angle mark");
});
