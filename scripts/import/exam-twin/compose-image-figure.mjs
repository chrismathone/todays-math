/** Offline composition of immutable imagegen pixels and an existing engine diagram.
 * The scene and exact diagram are separate panels. No pixel measurement is a fact.
 * Runtime applications consume the saved asset/spec; this module invokes no skill/API.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { newOutputPath, readJson, sha256 } from "./candidatePack.mjs";

export function composeImageFigure(png, diagramSvg) {
  assert(
    png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  );
  const match = diagramSvg.match(
    /<svg\b[^>]*viewBox=["']([^"']+)["'][^>]*>([\s\S]*?)<\/svg>\s*$/,
  );
  assert(
    match && !/<(?:script|foreignObject)\b|\bon\w+\s*=/i.test(diagramSvg),
    "Expected an existing engine SVG",
  );
  const viewBox = match[1].split(/\s+/).map(Number);
  assert.equal(viewBox.length, 4);
  assert(viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 480" width="1000" height="480"><rect width="1000" height="480" fill="white"/><image x="0" y="30" width="460" height="400" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${png.toString("base64")}"/><svg x="490" y="25" width="500" height="430" viewBox="${match[1]}" preserveAspectRatio="xMidYMid meet">${match[2]}</svg></svg>\n`;
}

const [
  pngFile,
  engineSvgFile,
  generationFile,
  newSvgFile,
  newSpecFile,
  bindingFile,
] = process.argv.slice(2);
if (pngFile) {
  assert(
    bindingFile,
    "PNG engineSVG generationJSON newSVG newSpec mathBindingJSON required",
  );
  const generation = readJson(generationFile);
  assert.equal(generation.tool, "built-in image_gen.imagegen");
  assert.equal(generation.paidApiCliFallback, false);
  const binding = readJson(bindingFile);
  assert.equal(binding.curriculum.grade, "중3");
  assert.equal(binding.curriculum.edition, "2015");
  assert.equal(
    binding.calculationAuthority,
    "explicit-math-facts-not-image-pixels",
  );
  assert(binding.factRelations && binding.constraints && binding.pointRoles);
  const png = fs.readFileSync(pngFile);
  const diagram = fs.readFileSync(engineSvgFile, "utf8");
  const svg = composeImageFigure(png, diagram);
  fs.writeFileSync(newOutputPath(newSvgFile), svg, { flag: "wx" });
  fs.writeFileSync(
    newOutputPath(newSpecFile),
    JSON.stringify(
      {
        kind: "imagegen-scene-plus-engine-diagram/v1",
        panelLayout: "scene-left; exact-math-right; no cross-panel rays",
        generationSha256: sha256(fs.readFileSync(generationFile)),
        rasterSha256: sha256(png),
        engineSvgSha256: sha256(Buffer.from(diagram)),
        authoredSvgSha256: sha256(Buffer.from(svg)),
        mathematicalBinding: binding,
        status:
          "authored-pending-independent-whole-curriculum-visual-print-rights-review",
        runtimeSkillInvocation: false,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      rasterUnmodified: true,
      mathAuthority: "facts",
      runtimeSkillInvocation: false,
      loadable: false,
    }),
  );
}
