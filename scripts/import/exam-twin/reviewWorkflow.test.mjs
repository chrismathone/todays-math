import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { bindCandidate, newOutputPath } from "./candidatePack.mjs";
import { composeImageFigure } from "./compose-image-figure.mjs";

const cli = path.resolve("scripts/import/exam-twin/review-exam-twins.mjs");
function fixture() {
  const root = fs.mkdtempSync(
    path.resolve(".qa-artifacts/exam-resume-20261008/twin-contract-test-"),
  );
  const candidate = {
    schemaVersion: 1,
    questionNumber: 2,
    twinExternalId: "exam-twin-synthetic-workflow-q02",
    authorId: "synthetic-author",
    content: "합성 시험용 기록을 완성하시오.",
    choices: ["1", "2", "3", "4", "5"],
    answer: "②",
    solution: "합성 시험용 풀이. 실제 쌍둥이 검산이 아니다.",
    score: 4,
    questionType: "객관식",
    figureArtifacts: [
      {
        role: "stem",
        specPath: "figure.json",
        svgPath: "figure.svg",
        intendedWidthMm: 70,
      },
    ],
    variantDelta: {
      modes: ["structure"],
      before: "before",
      after: "after",
      sharedConcept: "synthetic",
      sharedProcedure: "synthetic",
    },
    curriculumReview: {
      grade: "중3",
      edition: "2015",
      status: "author-proposed",
      standardCodes: ["9수03-10"],
    },
    sourceReference: {
      externalId: "synthetic-original",
      sourceContentSha256: "a".repeat(64),
    },
    metadata: {
      grade: "중3",
      curriculum: { sourceExam: "2015", target: "2015" },
      sourceExamYear: 2025,
      questionType: "객관식",
      score: 4,
      difficultyProposal: "기본",
      difficultyStatus: "pending",
      problemTypeProposal: "계산",
      problemTypeStatus: "pending",
      assignment: {
        status: "pending",
        unitId: null,
        familyKey: null,
        evidence: "synthetic hold",
      },
    },
  };
  fs.writeFileSync(
    path.join(root, "candidate.json"),
    JSON.stringify(candidate),
  );
  fs.writeFileSync(path.join(root, "figure.json"), "{}");
  fs.writeFileSync(
    path.join(root, "figure.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>',
  );
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: "utf8",
    });
  const clean = () => {
    const resolved = fs.realpathSync(root);
    const parent = fs.realpathSync(
      path.resolve(".qa-artifacts/exam-resume-20261008"),
    );
    assert(
      path.dirname(resolved) === parent &&
        path.basename(resolved).startsWith("twin-contract-test-"),
    );
    fs.rmSync(resolved, { recursive: true });
  };
  return { root, candidate, run, clean };
}
test("freeze and blind input bind actual assets; stale spec blocks dry-run", () => {
  const f = fixture();
  try {
    assert.equal(f.run("freeze", "package", "candidate.json").status, 0);
    assert.equal(f.run("blind", "package", "blind").status, 0);
    const students = JSON.parse(
      fs.readFileSync(path.join(f.root, "blind/student-problems.json")),
    );
    assert(
      !("answer" in students[0]) &&
        !("solution" in students[0]) &&
        !("sourceReference" in students[0]),
    );
    assert.equal(
      fs.readFileSync(path.join(f.root, "blind/figures/q02-1.svg"), "utf8"),
      fs.readFileSync(path.join(f.root, "figure.svg"), "utf8"),
    );
    fs.appendFileSync(
      path.join(f.root, "package/private/q02/figure-1.spec.json"),
      " ",
    );
    assert.notEqual(f.run("dry-run", "package").status, 0);
    assert.notEqual(f.run("check", "package", "--apply").status, 0);
  } finally {
    f.clean();
  }
});
test("independent solve is frozen before new answer exposure; later alteration rejects", () => {
  const f = fixture();
  try {
    assert.equal(f.run("freeze", "package", "candidate.json").status, 0);
    assert.equal(f.run("blind", "package", "blind").status, 0);
    const students = JSON.parse(
      fs.readFileSync(path.join(f.root, "blind/student-problems.json")),
    );
    const file = path.join(f.root, "blind/solve/q02.json");
    const solve = {
      studentDigest: students[0].studentDigest,
      solverId: "synthetic-independent",
      answer: "②",
      solution: "Synthetic independent control only",
      evidence: "synthetic",
      status: "solved",
    };
    fs.writeFileSync(file, JSON.stringify(solve));
    assert.equal(f.run("verify-pack", "package", "blind", "verify").status, 0);
    fs.appendFileSync(file, " ");
    const result = f.run(
      "collect",
      "package",
      "blind",
      "verify",
      "result.json",
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Independent solve was edited/);
    assert(!fs.existsSync(path.join(f.root, "result.json")));
  } finally {
    f.clean();
  }
});
test("image composition binds both generated pixels and generation record", () => {
  const f = fixture();
  try {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=",
      "base64",
    );
    const diagram = fs.readFileSync(path.join(f.root, "figure.svg"), "utf8");
    const composite = composeImageFigure(png, diagram);
    fs.writeFileSync(path.join(f.root, "figure.svg"), composite);
    fs.writeFileSync(path.join(f.root, "raster.png"), png);
    fs.writeFileSync(
      path.join(f.root, "generation.json"),
      JSON.stringify({
        tool: "built-in image_gen.imagegen",
        paidApiCliFallback: false,
        prompt: "synthetic control, no real image generation",
      }),
    );
    f.candidate.figureArtifacts[0].rasterResources = [
      { path: "raster.png", generationPath: "generation.json" },
    ];
    fs.writeFileSync(
      path.join(f.root, "candidate.json"),
      JSON.stringify(f.candidate),
    );
    const bound = bindCandidate(path.join(f.root, "candidate.json"));
    assert.equal(bound.assets[0].resources[0].widthPx, 1);
    assert.equal(f.run("freeze", "package", "candidate.json").status, 0);
    assert.equal(f.run("blind", "package", "blind").status, 0);
    fs.writeFileSync(
      path.join(f.root, "generation.json"),
      JSON.stringify({
        tool: "built-in image_gen.imagegen",
        paidApiCliFallback: false,
        prompt: "changed prompt",
      }),
    );
    assert.notEqual(
      bindCandidate(path.join(f.root, "candidate.json")).assetDigest,
      bound.assetDigest,
    );
    fs.writeFileSync(
      path.join(f.root, "figure.svg"),
      composite.replace("data:image/png;base64,", "https://example.com/"),
    );
    assert.throws(() => bindCandidate(path.join(f.root, "candidate.json")));
  } finally {
    f.clean();
  }
});
test("outputs cannot escape through a worktree dependency junction", () => {
  assert.throws(
    () => newOutputPath("node_modules/exam-twin-forbidden-output"),
    /junction escapes/,
  );
  assert.throws(() => newOutputPath("../outside-forbidden-output"));
});
