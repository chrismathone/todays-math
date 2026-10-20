/** Select current authored IDs, never merge superseded reviews into current counts. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  bindCandidate,
  containedPath,
  digest,
  newOutputPath,
  readJson,
  sha256,
  REVIEW_CHECKS,
} from "./candidatePack.mjs";
import { auditCollectedPack, currentPackage } from "./review-exam-twins.mjs";

const fileEvidence = (file) => ({
  path: path.relative(process.cwd(), file).replaceAll("\\", "/"),
  sha256: sha256(fs.readFileSync(file)),
});
const contentAndClassificationPassed = (q) =>
  q.reportStatus === "verified" && q.mathematicalVerified && q.gradeReviewed &&
  !q.reasons.includes("metadata-answer-format-mismatch") &&
  REVIEW_CHECKS.every((key) => q.reviewChecks?.[key] === true);
function relocatedCandidateContent(candidate) {
  const copy = structuredClone(candidate);
  for (const asset of copy.figureArtifacts) {
    delete asset.specPath;
    delete asset.svgPath;
    for (const resource of asset.rasterResources ?? []) {
      delete resource.path;
      delete resource.generationPath;
    }
  }
  return digest(copy);
}

export function summarizeReviewedBatch(indexFile, reviewRoots) {
  const index = readJson(indexFile);
  assert.equal(
    new Set(index.questions.map((q) => q.n)).size,
    index.questions.length,
  );
  assert.equal(
    new Set(index.questions.map((q) => q.id)).size,
    index.questions.length,
  );
  const entries = reviewRoots.flatMap((root) => {
    const pack = path.join(root, "package");
    const blind = path.join(root, "blind");
    const review = path.join(root, "verification");
    const audited = auditCollectedPack(pack, blind, review);
    const { manifest, bindings } = currentPackage(pack);
    const verification = readJson(
      path.join(review, "verification-manifest.json"),
    );
    return bindings.map((b, i) => {
      const n = b.candidate.questionNumber;
      const reportFile = path.join(
        review,
        "reports",
        `q${String(n).padStart(2, "0")}.json`,
      );
      const solve = verification.originalSolveFileHashes.find((s) => s.n === n);
      assert(solve, "Missing pre-exposure independent solve hash");
      assert.equal(
        audited.results[i].twinExternalId,
        b.candidate.twinExternalId,
      );
      const prior = manifest.bindings[i];
      assert.equal(
        prior.authoredInput.sha256,
        sha256(fs.readFileSync(prior.authoredInput.path)),
        "Author file changed after freeze",
      );
      return {
        ...audited.results[i],
        reportStatus: readJson(reportFile).status,
        reviewChecks: readJson(reportFile).checks,
        sourceReference: b.candidate.sourceReference,
        metadata: b.candidate.metadata,
        variantDelta: b.candidate.variantDelta,
        packageDigest: manifest.packageDigest,
        authoredInput: prior.authoredInput,
        figureBindings: prior.assets,
        independentSolveFile: { path: solve.path, sha256: solve.sha256 },
        reportFile: fileEvidence(reportFile),
        verificationManifest: fileEvidence(
          path.join(review, "verification-manifest.json"),
        ),
        blindManifest: fileEvidence(path.join(blind, "blind-manifest.json")),
        frozenCandidate: fileEvidence(
          containedPath(pack, prior.privateCandidatePath),
        ),
        candidateContentWithoutRelocatedPaths: relocatedCandidateContent(
          b.candidate,
        ),
      };
    });
  });
  const questions = index.questions.map((q) => {
    assert.equal(
      sha256(fs.readFileSync(q.candidate)),
      q.sha256,
      "Current index author hash is stale",
    );
    const authored = bindCandidate(q.candidate);
    assert.equal(authored.candidate.twinExternalId, q.id);
    assert.equal(authored.candidate.questionNumber, q.n);
    const matches = entries.filter((e) => e.twinExternalId === q.id);
    assert.equal(
      matches.length,
      1,
      "Current ID must have exactly one selected review; do not choose by question number alone",
    );
    const e = matches[0];
    assert.equal(e.n, q.n);
    assert.equal(e.authoredInput.sha256, q.sha256);
    for (const key of ["studentDigest", "assetDigest"])
      assert.equal(e[key], authored[key], `Author/frozen ${key} mismatch`);
    assert.equal(
      e.candidateContentWithoutRelocatedPaths,
      relocatedCandidateContent(authored.candidate),
      "Author/frozen content differs beyond relocated asset filenames",
    );
    return {
      ...e,
      currentCandidate: fileEvidence(q.candidate),
      authorCandidateDigest: authored.candidateDigest,
    };
  });
  const selectedIds = new Set(questions.map((q) => q.twinExternalId));
  return {
    kind: "current-authored-twin-review-summary/v1",
    createdAt: new Date().toISOString(),
    index: fileEvidence(indexFile),
    selectionPolicy:
      "exact current author ID and raw author hash; prior versions retained, never reused",
    counts: {
      authored: questions.length,
      historicalCandidateVersions: entries.length,
      independentSolvesBound: questions.length,
      mathematicalVerified: questions.filter((q) => q.mathematicalVerified)
        .length,
      gradeReviewed: questions.filter((q) => q.gradeReviewed).length,
      contentReportVerified: questions.filter((q) => q.reportStatus === "verified").length,
      contentReviewPassed: questions.filter(contentAndClassificationPassed).length,
      contentReviewHeld: questions.filter((q) => q.reportStatus === "pending" ||
        (q.reportStatus === "verified" && !contentAndClassificationPassed(q))).length,
      figureInstances: questions.reduce(
        (sum, q) => sum + q.figureBindings.length,
        0,
      ),
      overallVerified: 0,
      loadable: 0,
      productionWrites: 0,
    },
    contentReviewPassedNumbers: questions
      .filter(contentAndClassificationPassed)
      .map((q) => q.n),
    contentReviewHeldNumbers: questions
      .filter((q) => q.reportStatus === "pending" ||
        (q.reportStatus === "verified" && !contentAndClassificationPassed(q)))
      .map((q) => q.n),
    supersededReviews: entries
      .filter((e) => !selectedIds.has(e.twinExternalId))
      .map((e) => ({
        n: e.n,
        twinExternalId: e.twinExternalId,
        reportFile: e.reportFile,
        reason:
          "New numeric conditions/assets/answer/solution require new independent proof",
      })),
    questions,
    reviewBindingDigest: digest(
      questions.map((q) => ({
        id: q.twinExternalId,
        student: q.studentDigest,
        candidate: q.candidateDigest,
        assets: q.assetDigest,
        solve: q.independentSolveFile.sha256,
        report: q.reportFile.sha256,
      })),
    ),
    limits: [
      "External review reports supply mathematical/curriculum evidence; hashes never calculate correctness",
      "Source identity/custody, taxonomy, rights/similarity and native reader/provenance remain separate unresolved gates",
      "No database, writer, operational approval or original-answer oracle",
    ],
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [index, output, ...roots] = process.argv.slice(2);
  assert(
    index &&
      output &&
      roots.length > 0 &&
      !process.argv.slice(2).some((a) => a.startsWith("--")),
    "<current-index> <new-summary-json> <review-root...>; no apply mode",
  );
  const result = summarizeReviewedBatch(index, roots);
  fs.writeFileSync(
    newOutputPath(output),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify(result.counts));
}
