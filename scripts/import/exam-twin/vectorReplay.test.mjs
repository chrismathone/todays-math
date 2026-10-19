import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertLocalReplayEnvironment, assertReplayWorkingDirectory, replayVectorCandidate } from "./vectorReplay.mjs";

function fixture() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "twin-vector-replay-"));
  const file = (name) => path.join(folder, name);
  const candidate = { schemaVersion: 1, questionNumber: 1, twinExternalId: "exam-twin-replay-test", authorId: "test-author",
    content: "길이를 구하시오.", answer: "1", solution: "주어진 길이를 대입한다.", score: 4, questionType: "단답형", choices: [],
    figureArtifacts: [{ role: "stem", specPath: "figure.json", svgPath: "figure.svg", intendedWidthMm: 70 }],
    variantDelta: { modes: ["inverse-target"], before: "output", after: "input", sharedConcept: "length", sharedProcedure: "relation" },
    curriculumReview: { grade: "중3", edition: "2015", status: "author-proposed", standardCodes: ["9수04-20"] },
    sourceReference: { externalId: "original-test", sourceContentSha256: "a".repeat(64) },
    metadata: { grade: "중3", curriculum: { sourceExam: "2015", target: "2015" }, sourceExamYear: 2025, questionType: "단답형", score: 4,
      difficultyProposal: "기본", difficultyStatus: "pending", problemTypeProposal: "test", problemTypeStatus: "pending",
      assignment: { status: "pending", unitId: null, familyKey: null, evidence: "synthetic hold" } },
  };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="1" cy="1" r="1"/></svg>';
  const save = () => fs.writeFileSync(file("candidate.json"), JSON.stringify(candidate));
  save(); fs.writeFileSync(file("figure.json"), '{"version":2}'); fs.writeFileSync(file("figure.svg"), svg);
  return { file, candidate, save, svg, close() {
    for (const name of ["candidate.json", "figure.json", "figure.svg", "pixel.png", "generation.json"])
      if (fs.existsSync(file(name))) fs.unlinkSync(file(name));
    fs.rmdirSync(folder);
  } };
}
const withFixture = (fn) => async () => { const f = fixture(); try { await fn(f); } finally { f.close(); } };

test("exact replay is strictly requested and never grants approval", withFixture(async (f) => {
  const result = await replayVectorCandidate(f.file("candidate.json"), async (spec, options) => {
    assert.deepEqual(options, { strict: true }); spec.version = 99;
    return { ok: true, svg: f.svg };
  });
  assert.equal(result.status, "reproduced");
  assert.equal(result.allVectorAssetsReproduced, true);
  assert.equal(JSON.parse(fs.readFileSync(f.file("figure.json"))).version, 2);
  for (const key of ["mathematicalApproval", "gradeApproval", "rightsApproval", "nativeReaderParity", "loadable"]) assert.equal(result[key], false);
  assert.equal(result.newAuthoredFigures, 0);
}));

test("changed saved SVG remains a mismatch even if its candidate binds", withFixture(async (f) => {
  fs.writeFileSync(f.file("figure.svg"), f.svg.replace('cx="1"', 'cx="2"'));
  const r = await replayVectorCandidate(f.file("candidate.json"), async () => ({ ok: true, svg: f.svg }));
  assert.equal(r.status, "held"); assert.equal(r.assets[0].status, "mismatch");
}));

test("renderer errors, missing SVG and dropped dimensions fail closed", withFixture(async (f) => {
  for (const render of [async () => { throw new Error("failed"); }, async () => ({ ok: false, error: "failed" }),
    async () => ({ ok: true }), async () => ({ ok: true, svg: f.svg, droppedDimensions: ["len"] })]) {
    const r = await replayVectorCandidate(f.file("candidate.json"), render);
    assert.equal(r.assets[0].status, "render-error"); assert.equal(r.allVectorAssetsReproduced, false);
  }
}));

test("unsupported spec is held before invoking a renderer", withFixture(async (f) => {
  fs.writeFileSync(f.file("figure.json"), '{"version":1}'); let calls = 0;
  const r = await replayVectorCandidate(f.file("candidate.json"), async () => { calls++; return { ok: true, svg: f.svg }; });
  assert.equal(calls, 0); assert.equal(r.assets[0].status, "unsupported"); assert.equal(r.status, "held");
}));

test("no figures cannot pass by an empty all operation", withFixture(async (f) => {
  f.candidate.figureArtifacts = []; f.save();
  const r = await replayVectorCandidate(f.file("candidate.json"), async () => { assert.fail("No renderer call expected"); });
  assert.equal(r.status, "no-figures"); assert.equal(r.allVectorAssetsReproduced, false);
}));

test("a bound raster inside a version2 spec cannot claim vector replay", withFixture(async (f) => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(f.file("pixel.png"), png);
  fs.writeFileSync(f.file("generation.json"), JSON.stringify({ tool: "built-in image_gen.imagegen", paidApiCliFallback: false, prompt: "Synthetic unit-test marker, not an actual image generation claim" }));
  fs.writeFileSync(f.file("figure.svg"), `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${png.toString("base64")}"/></svg>`);
  f.candidate.figureArtifacts[0].rasterResources = [{ path: "pixel.png", generationPath: "generation.json" }]; f.save();
  const r = await replayVectorCandidate(f.file("candidate.json"), async () => { assert.fail("Raster resources require a different review"); });
  assert.equal(r.status, "held"); assert.equal(r.assets[0].status, "unsupported"); assert.equal(r.allVectorAssetsReproduced, false);
}));

test("a renderer modifying an input cannot issue a valid replay receipt", withFixture(async (f) => {
  await assert.rejects(replayVectorCandidate(f.file("candidate.json"), async () => {
    fs.appendFileSync(f.file("figure.svg"), "\n"); return { ok: true, svg: f.svg };
  }), /Replay modified an input/);
}));

test("unsafe source SVG is rejected before renderer use", withFixture(async (f) => {
  fs.writeFileSync(f.file("figure.svg"), '<svg><script>alert(1)</script></svg>');
  await assert.rejects(replayVectorCandidate(f.file("candidate.json"), async () => { assert.fail("Unsafe source must not render"); }), /Unsafe figure/);
}));

test("offline CLI environment cannot silently select a service or external engine", () => {
  assertLocalReplayEnvironment({});
  for (const key of ["STUDIO_ENGINE_URL", "VERCEL", "FIGURE_ENGINE_PATH"])
    assert.throws(() => assertLocalReplayEnvironment({ [key]: "set" }), /must be unset/);
});

test("a saved SVG replaced between binding and snapshot cannot reproduce stale bytes", withFixture(async (f) => {
  const read = fs.readFileSync, target = f.file("figure.svg"); let reads = 0, calls = 0;
  fs.readFileSync = (file, ...args) => {
    const bytes = read(file, ...args);
    if (typeof file === "string" && path.resolve(file) === target && ++reads === 1)
      fs.writeFileSync(target, f.svg.replace('cx="1"', 'cx="2"'));
    return bytes;
  };
  try {
    await assert.rejects(replayVectorCandidate(f.file("candidate.json"), async () => { calls++; return { ok: true, svg: f.svg }; }), /Input changed after binding/);
    assert.equal(calls, 0);
  } finally { fs.readFileSync = read; }
}));

test("spec bytes replaced after snapshot are rejected even if restored before final hash check", withFixture(async (f) => {
  const read = fs.readFileSync, target = f.file("figure.json"), original = read(target); let reads = 0, calls = 0;
  fs.readFileSync = (file, ...args) => {
    const bytes = read(file, ...args);
    if (typeof file === "string" && path.resolve(file) === target) {
      reads++;
      if (reads === 2) fs.writeFileSync(target, '{"version":2,"style":{}}');
      if (reads === 3) fs.writeFileSync(target, original);
    }
    return bytes;
  };
  try {
    await assert.rejects(replayVectorCandidate(f.file("candidate.json"), async () => { calls++; return { ok: true, svg: f.svg }; }), /Render spec changed after binding/);
    assert.equal(calls, 0); assert.deepEqual(read(target), original);
  } finally { fs.readFileSync = read; }
}));

test("verified UTF-8 BOM spec bytes retain their identity during parsing", withFixture(async (f) => {
  fs.writeFileSync(f.file("figure.json"), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"version":2}')]));
  const r = await replayVectorCandidate(f.file("candidate.json"), async (spec) => { assert.equal(spec.version, 2); return { ok: true, svg: f.svg }; });
  assert.equal(r.status, "reproduced"); assert.equal(r.inputsMatchCapturedBinding, true);
  assert.equal(r.assets[0].renderedSpecSha256, r.assets[0].specSha256);
}));

test("CLI code and renderer fingerprints must belong to the same worktree", () => {
  const workspace = path.join(os.tmpdir(), "replay-owner-root"), suffix = path.join("scripts", "import", "exam-twin", "replay-vector-figures.mjs");
  assertReplayWorkingDirectory(workspace, path.join(workspace, suffix));
  for (const file of [path.join(workspace + "-other", suffix), path.join(workspace, "extra", suffix), path.join(workspace, "scripts", "different.mjs")])
    assert.throws(() => assertReplayWorkingDirectory(workspace, file), /own task worktree/);
});

test("candidate content replaced after first read is rejected before renderer use", withFixture(async (f) => {
  const read = fs.readFileSync, target = f.file("candidate.json"); let reads = 0, calls = 0;
  const replacement = { ...f.candidate, twinExternalId: "exam-twin-changed-candidate", content: "다른 조건", answer: "99" };
  fs.readFileSync = (file, ...args) => {
    const bytes = read(file, ...args);
    if (typeof file === "string" && path.resolve(file) === target && ++reads === 1)
      fs.writeFileSync(target, JSON.stringify(replacement));
    return bytes;
  };
  try {
    await assert.rejects(replayVectorCandidate(f.file("candidate.json"), async () => { calls++; return { ok: true, svg: f.svg }; }), /Input changed after binding/);
    assert.equal(calls, 0);
  } finally { fs.readFileSync = read; }
}));

test("generation record hash comes from the same bytes as its validated provenance", withFixture(async (f) => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
  const record = JSON.stringify({ tool: "built-in image_gen.imagegen", paidApiCliFallback: false, prompt: "Synthetic provenance race control; no real image generation" });
  fs.writeFileSync(f.file("pixel.png"), png); fs.writeFileSync(f.file("generation.json"), record);
  fs.writeFileSync(f.file("figure.svg"), `<svg><image href="data:image/png;base64,${png.toString("base64")}"/></svg>`);
  f.candidate.figureArtifacts[0].rasterResources = [{ path: "pixel.png", generationPath: "generation.json" }]; f.save();
  const read = fs.readFileSync, target = f.file("generation.json"); let reads = 0, calls = 0;
  fs.readFileSync = (file, ...args) => {
    const bytes = read(file, ...args);
    if (typeof file === "string" && path.resolve(file) === target && ++reads === 1)
      fs.writeFileSync(target, JSON.stringify({ tool: "unknown", paidApiCliFallback: true, prompt: "replacement" }));
    return bytes;
  };
  try {
    await assert.rejects(replayVectorCandidate(f.file("candidate.json"), async () => { calls++; return { ok: true, svg: f.svg }; }), /Input changed after binding/);
    assert.equal(calls, 0);
  } finally { fs.readFileSync = read; }
}));
