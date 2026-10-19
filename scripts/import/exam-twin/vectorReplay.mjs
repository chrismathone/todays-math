/** Technical replay only. Exact rendering never grants math, curriculum or rights approval. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { bindCandidate, readJson, sha256 } from "./candidatePack.mjs";

export function assertLocalReplayEnvironment(env) {
  for (const key of ["STUDIO_ENGINE_URL", "VERCEL", "FIGURE_ENGINE_PATH"])
    assert(!env[key], `Offline vendored replay: ${key} must be unset`);
}

const snapshot = (files) => Object.fromEntries(
  [...new Set(files)].map((file) => [file, sha256(fs.readFileSync(file))]),
);

/** render receives an isolated spec and strict:true. Tests can inject a bounded renderer.
 * The CLI supplies the existing server renderer and separately hashes its source graph.
 */
export async function replayVectorCandidate(candidateFile, render) {
  assert.equal(typeof render, "function");
  const binding = bindCandidate(candidateFile);
  const files = [binding.candidateFile];
  for (const asset of binding.assets) {
    files.push(asset.sourceSpecPath, asset.sourceSvgPath);
    for (const resource of asset.resources ?? [])
      files.push(resource.sourceRasterPath, resource.sourceGenerationPath);
  }
  const before = snapshot(files);
  const assets = [];
  try {
    for (const [index, asset] of binding.assets.entries()) {
      const row = {
        index,
        role: asset.role,
        specSha256: asset.specSha256,
        expectedSvgSha256: asset.svgSha256,
        intendedWidthMm: asset.intendedWidthMm,
      };
      const spec = readJson(asset.sourceSpecPath);
      if (spec.version !== 2 || (asset.resources?.length ?? 0) > 0) {
        assets.push({ ...row, status: "unsupported", exactByteParity: false,
          reason: "Only plain FigureSpec v2 vectors are covered; raster assets/templates require separate provenance review" });
        continue;
      }
      let result;
      try {
        result = await render(structuredClone(spec), { strict: true });
      } catch (error) {
        assets.push({ ...row, status: "render-error", exactByteParity: false,
          reason: error instanceof Error ? error.message : "Renderer failed" });
        continue;
      }
      if (!result?.ok || typeof result.svg !== "string" || !result.svg.trim() ||
          (result.droppedDimensions?.length ?? 0) !== 0) {
        assets.push({ ...row, status: "render-error", exactByteParity: false,
          reason: result?.error ?? "Strict replay returned no SVG or dropped a dimension" });
        continue;
      }
      const replayedSvgSha256 = sha256(Buffer.from(result.svg, "utf8"));
      const exactByteParity = replayedSvgSha256 === asset.svgSha256;
      assets.push({ ...row, replayedSvgSha256, exactByteParity,
        status: exactByteParity ? "reproduced" : "mismatch", droppedDimensions: [] });
    }
  } finally {
    for (const [file, hash] of Object.entries(before))
      assert.equal(sha256(fs.readFileSync(file)), hash, `Replay modified an input: ${file}`);
  }
  const allVectorAssetsReproduced = assets.length > 0 &&
    assets.every((asset) => asset.status === "reproduced");
  return {
    kind: "authored-vector-render-replay/v1",
    candidate: { path: binding.candidateFile, sha256: binding.candidateFileSha256 },
    twinExternalId: binding.candidate.twinExternalId,
    candidateDigest: binding.candidateDigest,
    studentDigest: binding.studentDigest,
    assetDigest: binding.assetDigest,
    status: allVectorAssetsReproduced ? "reproduced" : assets.length ? "held" : "no-figures",
    assets,
    allVectorAssetsReproduced,
    inputHashes: before,
    inputsUnchanged: true,
    candidateValidation: binding.validation,
    mathematicalApproval: false,
    gradeApproval: false,
    rightsApproval: false,
    nativeReaderParity: false,
    loadable: false,
    newManualQuestions: 0,
    newAuthoredFigures: 0,
    dbWrites: 0,
  };
}
