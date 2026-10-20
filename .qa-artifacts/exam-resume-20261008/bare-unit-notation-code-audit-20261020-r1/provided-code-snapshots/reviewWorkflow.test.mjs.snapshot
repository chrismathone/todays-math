import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  bindCandidate,
  digest,
  newOutputPath,
  sha256,
  REVIEW_CHECKS,
  SURFACES,
} from "./candidatePack.mjs";
import { composeImageFigure } from "./compose-image-figure.mjs";
import { summarizeReviewedBatch } from "./summarize-reviewed-batch.mjs";

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

test("a renderable lost radical command is held before freeze without changing its source", () => {
  const f = fixture();
  try {
    f.candidate.content += String.raw` $$\sqrt1, sqrt2, ldots$$`;
    const file = path.join(f.root, "candidate.json");
    fs.writeFileSync(file, JSON.stringify(f.candidate));
    const before = fs.readFileSync(file);
    const result = f.run("freeze", "package", "candidate.json");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lost math command escapes/);
    assert(!fs.existsSync(path.join(f.root, "package")));
    assert.deepEqual(fs.readFileSync(file), before);
    assert(bindCandidate(file).validation.studentMathNotationWarnings.length > 0);
  } finally {
    f.clean();
  }
});
test("a renderable lost unit marker in a choice is held before any blind package exists", () => {
  const f = fixture();
  try {
    f.candidate.choices[0] = "$15,mathrm{cm}$";
    const file = path.join(f.root, "candidate.json");
    fs.writeFileSync(file, JSON.stringify(f.candidate));
    const before = fs.readFileSync(file);
    const result = f.run("freeze", "package", "candidate.json");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lost math command escapes/);
    assert(!fs.existsSync(path.join(f.root, "package")));
    assert.deepEqual(fs.readFileSync(file), before);
    assert(bindCandidate(file).validation.studentMathNotationWarnings.some(x => x.token === "mathrm"));
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
test("collection rechecks blind student bytes after answer exposure", () => {
  const f = fixture();
  try {
    assert.equal(f.run("freeze", "package", "candidate.json").status, 0);
    assert.equal(f.run("blind", "package", "blind").status, 0);
    const students = JSON.parse(
      fs.readFileSync(path.join(f.root, "blind/student-problems.json")),
    );
    fs.writeFileSync(
      path.join(f.root, "blind/solve/q02.json"),
      JSON.stringify({
        studentDigest: students[0].studentDigest,
        solverId: "independent",
        answer: "②",
        solution: "control",
        evidence: "control",
        status: "solved",
      }),
    );
    assert.equal(f.run("verify-pack", "package", "blind", "verify").status, 0);
    fs.appendFileSync(path.join(f.root, "blind/student-problems.json"), " ");
    const result = f.run(
      "collect",
      "package",
      "blind",
      "verify",
      "result.json",
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Blind student input changed/);
    assert(!fs.existsSync(path.join(f.root, "result.json")));
  } finally {
    f.clean();
  }
});
test("batch counts select the exact current ID and never reuse an old question-number review", () => {
  const f = fixture();
  try {
    const roots = [];
    for (const revision of [1, 2]) {
      const root = path.join(f.root, `review-${revision}`);
      fs.mkdirSync(root);
      const name = `candidate-${revision}.json`;
      const candidate = {
        ...f.candidate,
        twinExternalId: `exam-twin-synthetic-revision-${revision}`,
        content: `control revision ${revision}`,
      };
      fs.writeFileSync(path.join(f.root, name), JSON.stringify(candidate));
      assert.equal(f.run("freeze", root + "/package", name).status, 0);
      assert.equal(
        f.run("blind", root + "/package", root + "/blind").status,
        0,
      );
      const binding = bindCandidate(
        root + "/package/private/q02/candidate.json",
      );
      const solve = {
        studentDigest: binding.studentDigest,
        solverId: "independent",
        answer: "②",
        solution: "control",
        evidence: "control",
        status: "solved",
      };
      fs.writeFileSync(root + "/blind/solve/q02.json", JSON.stringify(solve));
      assert.equal(
        f.run(
          "verify-pack",
          root + "/package",
          root + "/blind",
          root + "/verification",
        ).status,
        0,
      );
      fs.writeFileSync(
        root + "/verification/reports/q02.json",
        JSON.stringify({
          status: "pending",
          studentDigest: binding.studentDigest,
          candidateDigest: binding.candidateDigest,
          assetDigest: binding.assetDigest,
          method: "independent-solve-then-review",
          verifierId: "independent",
          solveDigest: digest(solve),
          evidence: "synthetic control; no actual content approval",
          checks: {},
          curriculumSurfaces: {},
        }),
      );
      roots.push(root);
    }
    const candidateFile = path.join(f.root, "candidate-2.json");
    const indexFile = path.join(f.root, "index.json");
    const index = {
      questions: [
        {
          n: 2,
          id: "exam-twin-synthetic-revision-2",
          candidate: candidateFile,
          sha256: sha256(fs.readFileSync(candidateFile)),
        },
      ],
    };
    fs.writeFileSync(indexFile, JSON.stringify(index));
    const result = summarizeReviewedBatch(indexFile, roots);
    assert.equal(result.counts.authored, 1);
    assert.equal(result.counts.historicalCandidateVersions, 2);
    assert.equal(
      result.questions[0].twinExternalId,
      "exam-twin-synthetic-revision-2",
    );
    assert.equal(
      result.supersededReviews[0].twinExternalId,
      "exam-twin-synthetic-revision-1",
    );
    assert.throws(
      () => summarizeReviewedBatch(indexFile, roots.slice(0, 1)),
      /exactly one selected review/,
    );
    index.questions[0].sha256 = "0".repeat(64);
    fs.writeFileSync(indexFile, JSON.stringify(index));
    assert.throws(
      () => summarizeReviewedBatch(indexFile, roots),
      /index author hash is stale/,
    );
  } finally {
    f.clean();
  }
});
test("a verified report cannot inflate content/classification passes while a required dimension is held", () => {
  const f = fixture();
  try {
    const root = path.join(f.root, "review");
    fs.mkdirSync(root);
    const source = path.join(f.root, "candidate.json");
    assert.equal(f.run("freeze", root + "/package", source).status, 0);
    assert.equal(f.run("blind", root + "/package", root + "/blind").status, 0);
    const b = bindCandidate(root + "/package/private/q02/candidate.json");
    const solve = { studentDigest: b.studentDigest, solverId: "independent", answer: "②",
      solution: "Synthetic independent control only", evidence: "control", status: "solved" };
    fs.writeFileSync(root + "/blind/solve/q02.json", JSON.stringify(solve));
    assert.equal(f.run("verify-pack", root + "/package", root + "/blind", root + "/verification").status, 0);
    const report = { status: "verified", studentDigest: b.studentDigest,
      candidateDigest: b.candidateDigest, assetDigest: b.assetDigest,
      method: "independent-solve-then-review", verifierId: "independent", solveDigest: digest(solve),
      evidence: "Synthetic count control, no actual question approval",
      checks: Object.fromEntries(REVIEW_CHECKS.map((k) => [k, true])),
      curriculumSurfaces: Object.fromEntries(SURFACES.map((s) => [s, { status: "passed", evidence: "control" }])) };
    const reportPath = root + "/verification/reports/q02.json";
    const indexPath = path.join(f.root, "index.json");
    fs.writeFileSync(indexPath, JSON.stringify({ questions: [{ n: 2, id: f.candidate.twinExternalId,
      candidate: source, sha256: sha256(fs.readFileSync(source)) }] }));
    for (const heldKey of ["unitFamilyFit", "distinctPresentation", "scoreAppropriate", "figureConsistent", "allStudentSurfacesInScope"]) {
      report.checks[heldKey] = false;
      fs.writeFileSync(reportPath, JSON.stringify(report));
      const actual = summarizeReviewedBatch(indexPath, [root]);
      assert.equal(actual.counts.contentReportVerified, 1);
      assert.equal(actual.counts.contentReviewPassed, 0, heldKey);
      assert.equal(actual.counts.contentReviewHeld, 1, heldKey);
      assert.deepEqual(actual.contentReviewHeldNumbers, [2]);
      assert.equal(actual.counts.overallVerified, 0);
      assert.equal(actual.counts.loadable, 0);
      if (heldKey === "unitFamilyFit") {
        assert.equal(actual.counts.mathematicalVerified, 1);
        assert.equal(actual.counts.gradeReviewed, 1);
      }
      report.checks[heldKey] = true;
    }
    fs.writeFileSync(reportPath, JSON.stringify(report));
    const passed = summarizeReviewedBatch(indexPath, [root]);
    assert.equal(passed.counts.contentReviewPassed, 1);
    assert.equal(passed.counts.contentReviewHeld, 0);
    assert.equal(passed.counts.loadable, 0);
  } finally { f.clean(); }
});

test("reason-only surface objects cannot inflate grade counts; explicit per-surface evidence retains independent math and holds", () => {
  const f = fixture();
  try {
    const root = path.join(f.root, "review"), source = path.join(f.root, "candidate.json");
    fs.mkdirSync(root);
    assert.equal(f.run("freeze", root + "/package", source).status, 0);
    assert.equal(f.run("blind", root + "/package", root + "/blind").status, 0);
    const b = bindCandidate(root + "/package/private/q02/candidate.json");
    const solve = { studentDigest: b.studentDigest, solverId: "independent", answer: "②",
      solution: "Synthetic independent control only", evidence: "control", status: "solved" };
    fs.writeFileSync(root + "/blind/solve/q02.json", JSON.stringify(solve));
    assert.equal(f.run("verify-pack", root + "/package", root + "/blind", root + "/verification").status, 0);
    const report = { status: "pending", studentDigest: b.studentDigest,
      candidateDigest: b.candidateDigest, assetDigest: b.assetDigest,
      method: "independent-solve-then-review", verifierId: "independent", solveDigest: digest(solve),
      evidence: "Synthetic report contract control, no actual grade approval",
      checks: { ...Object.fromEntries(REVIEW_CHECKS.map(k => [k, true])), unitFamilyFit: false },
      curriculumSurfaces: {} };
    const index = path.join(f.root, "index.json");
    fs.writeFileSync(index, JSON.stringify({ questions: [{ n: 2, id: f.candidate.twinExternalId,
      candidate: source, sha256: sha256(fs.readFileSync(source)) }] }));
    for (const field of ["reason", "basis", "evidence"]) {
      report.curriculumSurfaces = Object.fromEntries(SURFACES.map(surface =>
        [surface, { status: "passed", [field]: `Synthetic ${surface} evidence` }]));
      fs.writeFileSync(root + "/verification/reports/q02.json", JSON.stringify(report));
      const actual = summarizeReviewedBatch(index, [root]);
      assert.equal(actual.counts.mathematicalVerified, 1, field);
      assert.equal(actual.counts.gradeReviewed, field === "reason" ? 0 : 1, field);
      assert.equal(actual.counts.contentReviewPassed, 0, field);
      assert.equal(actual.counts.contentReviewHeld, 1, field);
      assert.equal(actual.counts.loadable, 0, field);
      if (field === "reason") for (const surface of SURFACES)
        assert(actual.questions[0].reasons.includes(`curriculum-${surface}-basis-missing`));
    }
  } finally { f.clean(); }
});

test("a verified written report cannot inflate classification counts with copied single-choice metadata", () => {
  const f = fixture();
  try {
    for (const answerFormat of ["single-choice", "scalar-with-working"]) {
      const root = path.join(f.root, answerFormat), source = path.join(f.root, "candidate.json");
      fs.mkdirSync(root);
      const candidate = { ...f.candidate, questionType: "서술형", choices: [], answer: "$3$",
        metadata: { ...f.candidate.metadata, questionType: "서술형", answerFormat } };
      fs.writeFileSync(source, JSON.stringify(candidate));
      assert.equal(f.run("freeze", root + "/package", source).status, 0);
      assert.equal(f.run("blind", root + "/package", root + "/blind").status, 0);
      const b = bindCandidate(root + "/package/private/q02/candidate.json");
      const solve = { studentDigest: b.studentDigest, solverId: "independent", answer: "3",
        solution: "Synthetic independent control only", evidence: "control", status: "solved" };
      fs.writeFileSync(root + "/blind/solve/q02.json", JSON.stringify(solve));
      assert.equal(f.run("verify-pack", root + "/package", root + "/blind", root + "/verification").status, 0);
      const report = { status: "verified", studentDigest: b.studentDigest,
        candidateDigest: b.candidateDigest, assetDigest: b.assetDigest,
        method: "independent-solve-then-review", verifierId: "independent", solveDigest: digest(solve),
        evidence: "Synthetic count control, no actual written problem approval",
        checks: Object.fromEntries(REVIEW_CHECKS.map(k => [k, true])),
        curriculumSurfaces: Object.fromEntries(SURFACES.map(s => [s, { status: "passed", basis: `Synthetic ${s} control` }])) };
      fs.writeFileSync(root + "/verification/reports/q02.json", JSON.stringify(report));
      const index = path.join(root, "index.json");
      fs.writeFileSync(index, JSON.stringify({ questions: [{ n: 2, id: candidate.twinExternalId,
        candidate: source, sha256: sha256(fs.readFileSync(source)) }] }));
      const actual = summarizeReviewedBatch(index, [root]);
      assert.equal(actual.counts.mathematicalVerified, 1);
      assert.equal(actual.counts.gradeReviewed, 1);
      assert.equal(actual.counts.contentReviewPassed, answerFormat === "single-choice" ? 0 : 1);
      assert.equal(actual.counts.contentReviewHeld, answerFormat === "single-choice" ? 1 : 0);
      assert.equal(actual.counts.loadable, 0);
    }
  } finally { f.clean(); }
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

test("local dependency and git directories cannot become artifact outputs either", () => {
  const f = fixture();
  try {
    fs.mkdirSync(path.join(f.root, "node_modules"));
    fs.mkdirSync(path.join(f.root, ".git"));
    assert.throws(
      () => newOutputPath("node_modules/new-review-proof.json", f.root),
      /artifact ownership/,
    );
    assert.throws(
      () => newOutputPath(".git/new-review-proof.json", f.root),
      /artifact ownership/,
    );
    assert.equal(
      fs.existsSync(path.join(f.root, "node_modules/new-review-proof.json")),
      false,
    );
  } finally {
    f.clean();
  }
});
