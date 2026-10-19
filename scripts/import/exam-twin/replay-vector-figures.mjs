/** node --import tsx scripts/import/exam-twin/replay-vector-figures.mjs <new-dir> <candidate-json...> */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { newOutputPath, readJson, sha256 } from "./candidatePack.mjs";
import { assertLocalReplayEnvironment, assertReplayWorkingDirectory, replayVectorCandidate } from "./vectorReplay.mjs";

async function main() {
  const [directory, ...candidates] = process.argv.slice(2);
  assert(directory && candidates.length, "replay-vector-figures <new-dir> <candidate-json...>");
  assert(![directory, ...candidates].some((arg) => arg.startsWith("--")), "No apply, writer or approval mode exists");
  assertLocalReplayEnvironment(process.env);
  assertReplayWorkingDirectory(process.cwd(), fileURLToPath(import.meta.url));
  const vendor = "vendor/figure-engine/core";
  assert(fs.existsSync(path.join(vendor, "figure_scene.py")), "Run from the task worktree with its vendored engine");
  const sourceFiles = [fileURLToPath(import.meta.url),
    "scripts/import/exam-twin/vectorReplay.mjs", "scripts/import/exam-twin/candidatePack.mjs",
    "src/lib/figure/renderFigureSpec.ts", "src/lib/figure/mathjaxSubstitute.ts", "src/lib/figure/mathjaxLabel.ts",
    "scripts/figure/render_spec.py", "scripts/figure/engine_path.py", "node_modules/mathjax-full/package.json",
    ...fs.readdirSync(vendor).filter((name) => name.endsWith(".py")).map((name) => path.join(vendor, name)),
  ];
  const sourceHashes = Object.fromEntries(sourceFiles.map((file) => [file, sha256(fs.readFileSync(file))]));
  const output = newOutputPath(directory);
  fs.mkdirSync(output, { recursive: true });
  const { renderFigureSpec } = await import("../../../src/lib/figure/renderFigureSpec.ts");
  const reports = [];
  for (const [index, candidate] of candidates.entries()) {
    const result = await replayVectorCandidate(candidate, renderFigureSpec);
    const file = path.join(output, `candidate-${index + 1}-replay.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    reports.push({ path: file, sha256: sha256(fs.readFileSync(file)), status: result.status,
      assets: result.assets.length, reproduced: result.assets.filter((asset) => asset.status === "reproduced").length });
  }
  for (const [file, hash] of Object.entries(sourceHashes))
    assert.equal(sha256(fs.readFileSync(file)), hash, `Renderer source changed during replay: ${file}`);
  const allReproduced = reports.every((report) => report.status === "reproduced");
  fs.writeFileSync(path.join(output, "replay-manifest.json"), JSON.stringify({
    kind: "offline-vendored-vector-replay/v2", createdAt: new Date().toISOString(),
    renderer: "existing renderFigureSpec with strict:true; local vendored Python and MathJax",
    nodeVersion: process.version,
    pythonVersion: execFileSync(process.env.PYTHON_BIN || "python", ["--version"], { encoding: "utf8", windowsHide: true }).trim(),
    mathjaxFullVersion: readJson("node_modules/mathjax-full/package.json").version,
    sourceHashes, sourcesUnchanged: true, reports, allReproduced,
    limits: "Exact SVG bytes in this captured environment only; not mathematical, grade, rights, whole reader/print or raster-template approval",
    mathematicalApproval: false, gradeApproval: false, rightsApproval: false,
    nativeReaderParity: false, loadable: false, newManualQuestions: 0, newAuthoredFigures: 0, dbWrites: 0,
  }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ candidates: reports.length, reproduced: reports.reduce((s, r) => s + r.reproduced, 0), allReproduced, approval: false, dbWrites: 0 }));
  if (!allReproduced) process.exitCode = 2;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
