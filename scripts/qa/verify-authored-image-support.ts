/** Exercise saved imagegen assets through the native figure entrypoint.
 * NEW output directory only. No original edits, DB calls, approval or skill calls.
 * Usage: tsx scripts/qa/verify-authored-image-support.ts <new-out-dir> <candidate.json>...
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AUTHORED_IMAGE_KIND,
  imageBindingSha256,
  imageBytesSha256,
  imageMathBindingSchema,
  type SavedAuthoredImage,
} from "../../src/lib/engine/authoredImage";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { newOutputPath, readJson } from "../import/exam-twin/candidatePack.mjs";

function localFile(root: string, relative: string): string {
  assert(
    typeof relative === "string" &&
      relative.length > 0 &&
      !path.isAbsolute(relative),
  );
  const file = fs.realpathSync(path.resolve(root, relative));
  const rel = path.relative(fs.realpathSync(root), file);
  assert(
    rel && !rel.startsWith("..") && !path.isAbsolute(rel),
    "Asset escapes candidate directory",
  );
  return file;
}
const htmlEscape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

async function main() {
  const [output, ...candidates] = process.argv.slice(2);
  assert(
    output && candidates.length > 0,
    "NEW out-dir and candidate JSON paths required",
  );
  const dir = newOutputPath(output);
  // Check every path before creating output. All old evidence stays immutable.
  const inputs = candidates.map((file) => fs.realpathSync(file));
  assert(new Set(inputs).size === inputs.length, "Repeated candidate input");
  fs.mkdirSync(dir, { recursive: true });
  const results = [];
  const panels: string[] = [];
  for (const [index, file] of inputs.entries()) {
    const raw = fs.readFileSync(file);
    const candidate = readJson(file);
    const root = path.dirname(file);
    const artifacts = candidate.figureArtifacts;
    assert(Array.isArray(artifacts) && artifacts.length >= 2);
    const scene = artifacts.find((x) => x.rasterResources?.length === 1);
    const diagram = artifacts.find((x) => !x.rasterResources?.length);
    assert(
      scene && diagram,
      "Need separate authored illustration and engine diagram",
    );
    const resource = scene.rasterResources[0];
    const png = fs.readFileSync(localFile(root, resource.path));
    const generationBytes = fs.readFileSync(
      localFile(root, resource.generationPath),
    );
    const generation = JSON.parse(generationBytes.toString("utf8"));
    assert.equal(generation.tool, "built-in image_gen.imagegen");
    assert.equal(generation.paidApiCliFallback, false);
    assert(typeof generation.prompt === "string" && generation.prompt.trim());
    const sceneSpec = readJson(localFile(root, scene.specPath));
    const oldBinding = sceneSpec.mathematicalBinding;
    assert(oldBinding, "Existing explicit mathematical binding required");
    const diagramSpec = readJson(localFile(root, diagram.specPath));
    const renderedDiagram = await renderFigureSpec(diagramSpec, {
      strict: true,
    });
    assert(renderedDiagram.ok, renderedDiagram.ok ? "" : renderedDiagram.error);
    const binding = imageMathBindingSchema.parse({
      templateId: candidate.twinExternalId,
      templateVersion: "asset-adapter-preview-20261019-r1",
      studentContentSha256: imageBytesSha256(
        JSON.stringify({
          content: candidate.content,
          choices: candidate.choices,
        }),
      ),
      diagramSha256: imageBytesSha256(renderedDiagram.svg),
      curriculum: {
        grade: candidate.metadata.grade,
        edition: candidate.metadata.curriculum.target,
        examYear: candidate.metadata.sourceExamYear,
      },
      unitId: candidate.metadata.assignment.unitId,
      familyKey: candidate.metadata.assignment.familyKey,
      classificationSnapshotSha256: null,
      calculationAuthority: oldBinding.calculationAuthority,
      facts: oldBinding.facts,
      factRelations: oldBinding.factRelations,
      constraints: oldBinding.constraints,
      pointRoles: oldBinding.pointRoles,
      variant: {
        modes: candidate.variantDelta.modes,
        sharedConcept: candidate.variantDelta.sharedConcept,
        sharedProcedure: candidate.variantDelta.sharedProcedure,
        changeEvidence: candidate.variantDelta.after,
      },
    });
    const asset: SavedAuthoredImage = {
      assetId: `${candidate.twinExternalId}:scene`,
      png,
      binding,
      generation: {
        tool: generation.tool,
        paidApiCliFallback: false,
        generationSha256: imageBytesSha256(generationBytes),
        promptSha256: imageBytesSha256(generation.prompt),
      },
      // New adapter/diagram binding has no independent review. Old results are
      // retained, not relabelled as reviews of a new version or native surface.
      review: null,
    };
    const spec = {
      kind: AUTHORED_IMAGE_KIND,
      assetId: asset.assetId,
      assetSha256: imageBytesSha256(png),
      bindingSha256: imageBindingSha256(binding),
      generationSha256: asset.generation.generationSha256,
      promptSha256: asset.generation.promptSha256,
    };
    const assets = new Map([[asset.assetId, asset]]);
    const image = await renderFigureSpec(spec, {
      authoredImages: { assets, purpose: "preview" },
    });
    assert(image.ok, image.ok ? "" : image.error);
    const noContext = await renderFigureSpec(spec);
    const approved = await renderFigureSpec(spec, {
      authoredImages: { assets, purpose: "approved-display" },
    });
    assert(
      !noContext.ok && !approved.ok,
      "Pending asset must fail closed without preview resources",
    );
    const embedded = /href="data:image\/png;base64,([^"']+)"/.exec(image.svg);
    assert(
      embedded && Buffer.from(embedded[1]!, "base64").equals(png),
      "Illustration bytes changed",
    );
    const prefix = `candidate-${index + 1}`;
    fs.writeFileSync(path.join(dir, `${prefix}.scene.svg`), image.svg, {
      flag: "wx",
    });
    fs.writeFileSync(
      path.join(dir, `${prefix}.diagram.svg`),
      renderedDiagram.svg,
      { flag: "wx" },
    );
    fs.writeFileSync(
      path.join(dir, `${prefix}.binding.json`),
      JSON.stringify(binding, null, 2) + "\n",
      { flag: "wx" },
    );
    results.push({
      candidateId: candidate.twinExternalId,
      inputPath: file,
      inputSha256: imageBytesSha256(raw),
      spec,
      image: image.authoredImage,
      diagramSha256: binding.diagramSha256,
      pixelsUnchanged: true,
      strictDiagramRendered: true,
      noContextBlocked: true,
      approvedDisplayBlocked: true,
      newIndependentReview: false,
      loadable: false,
      dbWrites: 0,
    });
    panels.push(
      `<article><h2>${htmlEscape(candidate.twinExternalId)}</h2><p>검토용 · 승인/적재 불가</p><figure>${image.svg}</figure><figure>${renderedDiagram.svg}</figure></article>`,
    );
  }
  fs.writeFileSync(
    path.join(dir, "report.json"),
    JSON.stringify(
      {
        kind: "native-authored-image-support/v1",
        capturedAt: new Date().toISOString(),
        results,
        runtimeSkillInvocation: false,
        dbWrites: 0,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  fs.writeFileSync(
    path.join(dir, "preview.html"),
    `<!doctype html><html lang="ko"><meta charset="utf-8"><title>이미지 엔진 검토</title><style>body{font:14px sans-serif}article{break-after:page}figure{margin:10mm 0;width:70mm}figure svg{display:block;width:100%;height:auto}</style>${panels.join("\n")}</html>`,
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      candidates: results.length,
      pixelsUnchanged: true,
      strictDiagramsRendered: results.length,
      blockedUnreviewedAssets: results.length,
      loadable: 0,
      dbWrites: 0,
    }),
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Image support check failed",
  );
  process.exitCode = 1;
});
