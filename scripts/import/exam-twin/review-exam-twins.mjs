/** Freeze authored content/assets, prepare a blind solve, then collect review. Offline only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  bindCandidate,
  containedPath,
  digest,
  evaluateReview,
  newOutputPath,
  readJson,
  REVIEW_CHECKS,
  sha256,
  SURFACES,
} from "./candidatePack.mjs";

const newJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
function newDirectory(directory) {
  const result = newOutputPath(directory);
  fs.mkdirSync(result, { recursive: true });
  return result;
}
export function currentPackage(directory) {
  const manifest = readJson(path.join(directory, "manifest.json"));
  assert.equal(manifest.kind, "authored-exam-twin-review/v1");
  assert.equal(
    new Set(manifest.questionNumbers).size,
    manifest.questionNumbers.length,
  );
  const bindings = manifest.bindings.map((previous) => {
    const current = bindCandidate(
      containedPath(directory, previous.privateCandidatePath),
    );
    assert.equal(
      current.candidateFileSha256,
      previous.candidateFileSha256,
      "Candidate file changed",
    );
    assert.equal(
      current.candidateDigest,
      previous.candidateDigest,
      "Candidate changed after freeze",
    );
    assert.equal(
      current.assetDigest,
      previous.assetDigest,
      "Figure spec/bytes changed after freeze",
    );
    assert.equal(
      current.studentDigest,
      previous.studentDigest,
      "Student payload changed after freeze",
    );
    return { ...current, privateCandidatePath: previous.privateCandidatePath };
  });
  assert.deepEqual(
    bindings.map((b) => b.candidate.questionNumber),
    manifest.questionNumbers,
  );
  assert.equal(
    digest(
      bindings.map((b) => ({
        id: b.candidate.twinExternalId,
        studentDigest: b.studentDigest,
        candidateDigest: b.candidateDigest,
        assetDigest: b.assetDigest,
      })),
    ),
    manifest.packageDigest,
  );
  return { manifest, bindings };
}
function freeze(directory, files) {
  assert(files.length > 0, "No authored candidates");
  const sourceBindings = files
    .map(bindCandidate)
    .sort((a, b) => a.candidate.questionNumber - b.candidate.questionNumber);
  assert.equal(
    new Set(sourceBindings.map((b) => b.candidate.questionNumber)).size,
    files.length,
  );
  assert.equal(
    new Set(sourceBindings.map((b) => b.candidate.twinExternalId)).size,
    files.length,
  );
  assert(
    sourceBindings.every((b) => !b.validation.surfaceKeywordViolations.length),
    "Known out-of-grade student surface cannot enter a solve pack",
  );
  const output = newDirectory(directory);
  fs.mkdirSync(path.join(output, "private"));
  const bindings = sourceBindings.map((b) => {
    const prefix = `q${String(b.candidate.questionNumber).padStart(2, "0")}`;
    fs.mkdirSync(path.join(output, "private", prefix));
    const candidate = structuredClone(b.candidate);
    for (const [index, asset] of b.assets.entries()) {
      const specName = `figure-${index + 1}.spec.json`;
      const svgName = `figure-${index + 1}.svg`;
      fs.copyFileSync(
        asset.sourceSpecPath,
        path.join(output, "private", prefix, specName),
        fs.constants.COPYFILE_EXCL,
      );
      fs.copyFileSync(
        asset.sourceSvgPath,
        path.join(output, "private", prefix, svgName),
        fs.constants.COPYFILE_EXCL,
      );
      candidate.figureArtifacts[index].specPath = specName;
      candidate.figureArtifacts[index].svgPath = svgName;
      for (const [resourceIndex, resource] of (
        asset.resources ?? []
      ).entries()) {
        const rasterName = `figure-${index + 1}-raster-${resourceIndex + 1}.png`;
        const generationName = `figure-${index + 1}-generation-${resourceIndex + 1}.json`;
        fs.copyFileSync(
          resource.sourceRasterPath,
          path.join(output, "private", prefix, rasterName),
          fs.constants.COPYFILE_EXCL,
        );
        fs.copyFileSync(
          resource.sourceGenerationPath,
          path.join(output, "private", prefix, generationName),
          fs.constants.COPYFILE_EXCL,
        );
        candidate.figureArtifacts[index].rasterResources[resourceIndex] = {
          path: rasterName,
          generationPath: generationName,
        };
      }
    }
    const relative = `private/${prefix}/candidate.json`;
    newJson(path.join(output, relative), candidate);
    const current = bindCandidate(path.join(output, relative));
    return {
      ...current,
      privateCandidatePath: relative,
      authoredInput: { path: b.candidateFile, sha256: b.candidateFileSha256 },
    };
  });
  const manifest = {
    kind: "authored-exam-twin-review/v1",
    version: 1,
    createdAt: new Date().toISOString(),
    questionNumbers: bindings.map((b) => b.candidate.questionNumber),
    packageDigest: digest(
      bindings.map((b) => ({
        id: b.candidate.twinExternalId,
        studentDigest: b.studentDigest,
        candidateDigest: b.candidateDigest,
        assetDigest: b.assetDigest,
      })),
    ),
    scope:
      "authored-subset; no source exam completeness or production authorization implied",
    bindings: bindings.map((b) => ({
      privateCandidatePath: b.privateCandidatePath,
      authoredInput: b.authoredInput,
      candidateFileSha256: b.candidateFileSha256,
      candidateDigest: b.candidateDigest,
      studentDigest: b.studentDigest,
      assetDigest: b.assetDigest,
      assets: b.assets.map((a) => ({
        role: a.role,
        specSha256: a.specSha256,
        svgSha256: a.svgSha256,
        intendedWidthMm: a.intendedWidthMm,
        studentPath: a.studentPath,
        ...(a.resources
          ? {
              resources: a.resources.map((r) => ({
                rasterSha256: r.rasterSha256,
                generationSha256: r.generationSha256,
                widthPx: r.widthPx,
                heightPx: r.heightPx,
              })),
            }
          : {}),
      })),
    })),
    independentReports:
      "external evidence only; no mathematical correctness inferred from IDs/digests/render or original answer agreement",
    gates: {
      sourceIdentity: "pending",
      taxonomy: "pending",
      rights: "pending",
      similarity: "pending",
    },
  };
  newJson(path.join(output, "manifest.json"), manifest);
  console.log(
    JSON.stringify({
      authoredFrozen: bindings.length,
      packageDigest: manifest.packageDigest,
      loadable: 0,
    }),
  );
}
function prepareBlind(directory, newBlindDirectory) {
  const { manifest, bindings } = currentPackage(directory);
  const output = newDirectory(newBlindDirectory);
  fs.mkdirSync(path.join(output, "figures"));
  fs.mkdirSync(path.join(output, "solve"));
  const students = bindings.map((b) => {
    for (const a of b.assets)
      fs.copyFileSync(
        a.sourceSvgPath,
        path.join(output, a.studentPath),
        fs.constants.COPYFILE_EXCL,
      );
    return { ...b.student, studentDigest: b.studentDigest };
  });
  newJson(path.join(output, "student-problems.json"), students);
  newJson(path.join(output, "blind-manifest.json"), {
    packageDigest: manifest.packageDigest,
    studentProblemsSha256: sha256(
      fs.readFileSync(path.join(output, "student-problems.json")),
    ),
    figures: bindings.flatMap((b) =>
      b.assets.map((a) => ({ path: a.studentPath, sha256: a.svgSha256 })),
    ),
  });
  fs.writeFileSync(
    path.join(output, "SOLVE-BRIEF.md"),
    "# 독립 풀이 — 새 문항만\n\n이 폴더의 student-problems.json과 figures/만 읽는다. 부모·저장소·원문·저자 답/해설/비공개 스펙을 열지 않는다. 답을 검색하지 않는다. 대상은 중3·2015 개정이다. 새 그림을 실제로 확인하고 허용된 학생 방법으로 독립 풀이한다. 부족한 조건/학년 불명은 pending으로 남긴다.\n\n각 solve/qNN.json: {studentDigest,solverId,answer,solution,evidence,status:'solved'|'pending'}. 5개 보기를 모두 검토하고 존재/유일성·양수 길이·부호·단위·그림 조건을 확인한다. 저자의 답을 본 뒤 독립 풀이 기록을 만들지 않는다.\n",
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      blindQuestions: students.length,
      answersOrPrivateFactsIncluded: false,
    }),
  );
}
function auditBlind(blindDirectory, manifest, bindings) {
  const blind = readJson(path.join(blindDirectory, "blind-manifest.json"));
  assert.equal(blind.packageDigest, manifest.packageDigest);
  assert.equal(
    sha256(fs.readFileSync(path.join(blindDirectory, "student-problems.json"))),
    blind.studentProblemsSha256,
    "Blind student input changed",
  );
  for (const a of blind.figures)
    assert.equal(
      sha256(fs.readFileSync(containedPath(blindDirectory, a.path))),
      a.sha256,
      "Blind figure changed",
    );
  const students = readJson(path.join(blindDirectory, "student-problems.json"));
  assert.deepEqual(
    students,
    bindings.map((b) => ({ ...b.student, studentDigest: b.studentDigest })),
    "Blind student input does not match frozen package",
  );
  assert.deepEqual(
    blind.figures,
    bindings.flatMap((b) =>
      b.assets.map((a) => ({ path: a.studentPath, sha256: a.svgSha256 })),
    ),
    "Blind figure manifest does not match frozen package",
  );
}
function verifyPack(directory, blindDirectory, newReviewDirectory) {
  const { manifest, bindings } = currentPackage(directory);
  auditBlind(blindDirectory, manifest, bindings);
  const inputs = bindings.map((b) => {
    const solvePath = path.join(
      blindDirectory,
      "solve",
      `q${String(b.candidate.questionNumber).padStart(2, "0")}.json`,
    );
    const solve = readJson(solvePath);
    assert.equal(solve.studentDigest, b.studentDigest);
    assert.equal(solve.status, "solved");
    assert(
      solve.solverId &&
        solve.solverId !== b.candidate.authorId &&
        solve.answer &&
        solve.solution &&
        solve.evidence,
    );
    return { ...b, solve, solveDigest: digest(solve), solvePath };
  });
  const output = newDirectory(newReviewDirectory);
  fs.mkdirSync(path.join(output, "reports"));
  newJson(
    path.join(output, "verification-inputs.json"),
    inputs.map((b) => ({
      candidate: b.candidate,
      assets: b.assets,
      studentDigest: b.studentDigest,
      candidateDigest: b.candidateDigest,
      assetDigest: b.assetDigest,
      independentSolve: b.solve,
      solveDigest: b.solveDigest,
    })),
  );
  newJson(path.join(output, "verification-manifest.json"), {
    packageDigest: manifest.packageDigest,
    verificationInputsSha256: sha256(
      fs.readFileSync(path.join(output, "verification-inputs.json")),
    ),
    blindDirectory: path.resolve(blindDirectory),
    originalSolveFileHashes: inputs.map((b) => ({
      n: b.candidate.questionNumber,
      path: b.solvePath,
      sha256: sha256(fs.readFileSync(b.solvePath)),
    })),
  });
  fs.writeFileSync(
    path.join(output, "VERIFY-BRIEF.md"),
    `# 독립 풀이 후 새 해설/학년 검토\n\n독립 solve를 먼저 작성한 별도 검수자가 후보의 답/해설/스펙을 검토한다. 원문 답 일치를 승인 기준으로 쓰지 않는다. 원문과 같은 개념/핵심 방법, 새 구조/소재/표현/역추론, 자연스러움과 목표 난이도를 검토한다. 각 reports/qNN.json에 {status:'verified'|'pending'|'rejected',studentDigest,candidateDigest,assetDigest,method:'independent-solve-then-review',verifierId,solveDigest,checks,evidence,curriculumSurfaces}를 기록한다.\n\nchecks: ${REVIEW_CHECKS.join(", ")}. 각 true는 구체적인 풀이·보기·그림·성취기준/학년/선수 근거를 필요로 한다. curriculumSurfaces 각 ${SURFACES.join(", ")}는 passed/pending/rejected로 판정한다. 학년 밖 필수 방법은 rejected, 불명은 pending. 코드/확률/원본 학교가 승인 근거가 아니다. 권리와 출처 승인은 이 검수의 수학 통과와 분리한다.\n`,
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      reviewQuestions: inputs.length,
      independentSolvesBoundBeforeAnswerExposure: true,
    }),
  );
}
export function auditCollectedPack(directory, blindDirectory, reviewDirectory) {
  const { manifest, bindings } = currentPackage(directory);
  auditBlind(blindDirectory, manifest, bindings);
  const verification = readJson(
    path.join(reviewDirectory, "verification-manifest.json"),
  );
  assert.equal(verification.packageDigest, manifest.packageDigest);
  assert.equal(
    sha256(
      fs.readFileSync(path.join(reviewDirectory, "verification-inputs.json")),
    ),
    verification.verificationInputsSha256,
  );
  for (const old of verification.originalSolveFileHashes)
    assert.equal(
      sha256(fs.readFileSync(old.path)),
      old.sha256,
      "Independent solve was edited after answers were exposed",
    );
  const results = bindings.map((b) => {
    const name = `q${String(b.candidate.questionNumber).padStart(2, "0")}.json`;
    const solve = readJson(path.join(blindDirectory, "solve", name));
    const reportPath = path.join(reviewDirectory, "reports", name);
    const report = fs.existsSync(reportPath) ? readJson(reportPath) : null;
    return {
      n: b.candidate.questionNumber,
      twinExternalId: b.candidate.twinExternalId,
      studentDigest: b.studentDigest,
      candidateDigest: b.candidateDigest,
      assetDigest: b.assetDigest,
      solveDigest: digest(solve),
      reportSha256: report ? sha256(fs.readFileSync(reportPath)) : null,
      ...evaluateReview(b, solve, report, manifest.gates),
    };
  });
  return {
    kind: "authored-exam-twin-review-result/v1",
    packageDigest: manifest.packageDigest,
    createdAt: new Date().toISOString(),
    authored: bindings.length,
    mathematicalVerified: results.filter((r) => r.mathematicalVerified).length,
    gradeReviewed: results.filter((r) => r.gradeReviewed).length,
    overallVerified: 0,
    loadable: 0,
    productionWrites: false,
    results,
  };
}
function collect(directory, blindDirectory, reviewDirectory, newResultFile) {
  const result = auditCollectedPack(directory, blindDirectory, reviewDirectory);
  const out = newOutputPath(newResultFile);
  newJson(out, result);
  console.log(
    JSON.stringify({
      authored: result.authored,
      mathematicalVerified: result.mathematicalVerified,
      gradeReviewed: result.gradeReviewed,
      overallVerified: 0,
      loadable: 0,
      productionWrites: false,
    }),
  );
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  assert(
    !args.some((a) => a.startsWith("--")),
    "No --apply/writer mode exists",
  );
  if (command === "freeze" && args.length >= 2)
    return freeze(args[0], args.slice(1));
  if (command === "blind" && args.length === 2) return prepareBlind(...args);
  if (command === "verify-pack" && args.length === 3)
    return verifyPack(...args);
  if (command === "collect" && args.length === 4) return collect(...args);
  if ((command === "check" || command === "dry-run") && args.length === 1) {
    const { manifest, bindings } = currentPackage(args[0]);
    console.log(
      JSON.stringify({
        authoredFrozen: bindings.length,
        packageDigest: manifest.packageDigest,
        newMathReviewRequired: true,
        gradeReviewRequired: true,
        loadable: 0,
        nativeProvenanceBlocked: true,
        productionWrites: false,
      }),
    );
    return;
  }
  throw new Error(
    "freeze <new-dir> <candidate-files...> | blind <package> <new-blind-dir> | verify-pack <package> <blind> <new-review-dir> | collect <package> <blind> <review> <new-result-json> | check|dry-run <package>",
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
