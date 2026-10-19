/** Technical replay only. Exact rendering never grants math, curriculum or rights approval. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { bindCandidate, sha256 } from "./candidatePack.mjs";

export function assertLocalReplayEnvironment(env) {
  for (const key of ["STUDIO_ENGINE_URL", "VERCEL", "FIGURE_ENGINE_PATH"])
    assert(!env[key], `Offline vendored replay: ${key} must be unset`);
}

export function assertReplayWorkingDirectory(workspace, cliFile) {
  const relative = path.relative(path.resolve(workspace), path.resolve(cliFile)).split(path.sep).join("/");
  assert.equal(process.platform === "win32" ? relative.toLowerCase() : relative,
    "scripts/import/exam-twin/replay-vector-figures.mjs",
    "Run replay from its own task worktree; imported code and captured renderer sources must share that root");
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
  const expected = [[binding.candidateFile, binding.candidateFileSha256]];
  for (const asset of binding.assets) {
    expected.push([asset.sourceSpecPath, asset.specSha256], [asset.sourceSvgPath, asset.svgSha256]);
    for (const resource of asset.resources ?? [])
      expected.push([resource.sourceRasterPath, resource.rasterSha256],
        [resource.sourceGenerationPath, resource.generationSha256]);
  }
  const before = snapshot(expected.map(([file]) => file));
  for (const [file, hash] of expected)
    assert.equal(before[file], hash, `Input changed after binding: ${file}`);
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
      // Parse the exact bytes whose identity was checked, rather than rereading
      // a potentially replaced path inside the JSON parser. The binder already
      // validated their UTF-8/object shape; only an initial supported BOM is removed.
      const specBytes = fs.readFileSync(asset.sourceSpecPath);
      assert.equal(sha256(specBytes), asset.specSha256, `Render spec changed after binding: ${asset.sourceSpecPath}`);
      const specText = specBytes.toString("utf8");
      const spec = JSON.parse(specText.startsWith("\uFEFF") ? specText.slice(1) : specText);
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
      assets.push({ ...row, renderedSpecSha256: sha256(specBytes), replayedSvgSha256, exactByteParity,
        status: exactByteParity ? "reproduced" : "mismatch", droppedDimensions: [] });
    }
  } finally {
    for (const [file, hash] of Object.entries(before))
      assert.equal(sha256(fs.readFileSync(file)), hash, `Replay modified an input: ${file}`);
  }
  const allVectorAssetsReproduced = assets.length > 0 &&
    assets.every((asset) => asset.status === "reproduced");
  return {
    kind: "authored-vector-render-replay/v2",
    candidate: { path: binding.candidateFile, sha256: binding.candidateFileSha256 },
    twinExternalId: binding.candidate.twinExternalId,
    candidateDigest: binding.candidateDigest,
    studentDigest: binding.studentDigest,
    assetDigest: binding.assetDigest,
    status: allVectorAssetsReproduced ? "reproduced" : assets.length ? "held" : "no-figures",
    assets,
    allVectorAssetsReproduced,
    inputHashes: before,
    inputsMatchCapturedBinding: true,
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
