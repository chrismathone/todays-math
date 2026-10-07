/** Offline planning package, never a production loader or a solver. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const reference = async (file) => ({ path: path.resolve(file).replaceAll("\\", "/"), sha256: sha(await readFile(file)) });
const writeNewJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const under = (root, child) => {
  const r = path.relative(path.resolve(root), path.resolve(child));
  return r !== "" && !r.startsWith("..") && !path.isAbsolute(r);
};

export function inspectPreparation(pack) {
  assert.equal(pack.kind, "twin-resume-preparation-only");
  assert.equal(pack.version, 1);
  assert.equal(pack.status, "planned-not-authored");
  assert.equal(pack.questions.length, 21);
  assert(pack.sourceFiles.filter((f) => f.required).length === 2);
  assert(pack.sourceFiles.filter((f) => f.required).every((f) => f.available && f.matchesHistoricalComparison));
  const ids = new Set();
  for (const [i, q] of pack.questions.entries()) {
    assert.equal(q.n, i + 1);
    assert.equal(q.twinExternalId, `${pack.batchId}-q${String(q.n).padStart(2, "0")}`);
    assert.notEqual(q.twinExternalId, q.sourceReference.externalId);
    assert(!ids.has(q.twinExternalId), "Twin IDs must be unique");
    ids.add(q.twinExternalId);
    assert.equal(q.source, "transformed");
    assert.equal(q.originProblemId, null, "Unloaded originals have no invented database origin");
    assert.equal(q.problemCode, null, "Do not reuse original codes");
    assert(q.design.modes.some((m) => ["structure", "context", "representation", "inverse-target"].includes(m)));
    assert(q.design.delta && q.design.newPresentation && q.design.solutionPlan);
    assert.equal(q.candidate, null, "Authored content requires a separate candidate contract and new review pack");
    assert.equal(q.independentVerification, null, "Old regeneration reports cannot approve new twins");
    assert.equal(q.review.gradeCurriculum, "pending", "Preparation cannot assert grade approval");
    assert.equal(q.review.rights, "pending");
    assert.equal(q.review.status, "pending");
    assert.equal(q.directUseAllowed, false);
    assert.equal(q.figure.status, q.figure.method === "none" ? "not-required" : "planned");
    assert.equal(q.figure.finalAssets.length, 0, "Reference crops are not regenerated assets");
    assert.equal(q.metadata.hasFigure, q.figure.method !== "none");
    assert.equal(q.metadata.sourceExamSemester, 2);
    assert.equal(q.metadata.curriculum.sourceExam, "2015");
    assert.equal(q.metadata.curriculum.target, "2015");
    assert(!Object.hasOwn(q.sourceReference, "answer"));
    assert(!Object.hasOwn(q.sourceReference, "solution"));
    if (q.metadata.assignment.status === "proposed") {
      assert(q.metadata.assignment.currentUnit);
      assert(q.metadata.assignment.currentRegistryMatch);
      assert.equal(q.metadata.assignment.currentUnit.id, q.metadata.assignment.unitId);
      assert.equal(q.metadata.assignment.currentUnit.grade, "중3");
      assert.equal(`mid:${q.metadata.assignment.currentRegistryMatch.key}`, q.metadata.assignment.familyKey);
      assert.equal(q.metadata.assignment.currentRegistryMatch.unitSection, q.metadata.assignment.currentUnit.section);
      assert(q.metadata.assignment.liveCount > 0);
    } else {
      assert.equal(q.metadata.assignment.status, "pending");
      assert.equal(q.metadata.assignment.familyKey, null);
    }
  }
  assert.deepEqual(pack.questions.filter((q) => q.metadata.assignment.status === "pending").map((q) => q.n), [10, 11, 14, 18, 20]);
  assert.equal(pack.questions.reduce((sum, q) => sum + q.metadata.score, 0), 100);
  return {
    preparationValid: true, planned: 21, authored: 0, twinVerified: 0, loadable: 0,
    metadataProposed: 16, metadataHeld: [10, 11, 14, 18, 20],
    gradeCurriculumPending: 21, productionWrites: false,
  };
}

async function prepare(designPath, outputDir) {
  const design = await json(designPath);
  const output = path.resolve(outputDir);
  assert(under(process.cwd(), output), "Output must stay within this task worktree");
  try { await access(output); throw new Error("Output already exists; choose a new version directory"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const indexPath = ".qa-artifacts/exam-resume-20261008/continuation-index.json";
  const bankPath = ".qa-artifacts/exam-resume-20261008/bank-read-20261008.json";
  const registryPath = ".qa-artifacts/exam-resume-20261008/registry-read-20261008.json";
  const index = await json(indexPath);
  const bank = await json(bankPath);
  const registry = await json(registryPath);
  const curriculum = design.curriculumEvidencePath ? await json(design.curriculumEvidencePath) : null;
  assert.equal(bank.transactionReadOnly, "on");
  const sourceDir = path.resolve(index.pilot.dir);
  assert(!under(sourceDir, output) && !under(output, sourceDir), "Source and output must be disjoint");
  const draftsPath = path.join(sourceDir, "drafts.json");
  const figuresPath = path.join(sourceDir, "figures/index.json");
  const proposalPath = index.pilot.unitProposal;
  const drafts = await json(draftsPath);
  const figures = (await json(figuresPath)).figures;
  const proposals = (await json(proposalPath)).problems;
  const sourceComparison = await json(path.join(index.originalArtifactRoot, "source-comparison-bumil.json"));
  const primaryHwp = sourceComparison.sources.hwpCopies.find((v) => v.path.includes("2025 기출모음"));
  assert(primaryHwp, "A selected completed HWP reference is required");
  const sourceEntries = [sourceComparison.sources.collection, sourceComparison.sources.work196, ...sourceComparison.sources.hwpCopies];
  const requiredPaths = new Set([sourceComparison.sources.collection.path, primaryHwp.path]);
  const sourceRefs = await Promise.all(sourceEntries.map(async (entry) => {
    try {
      const ref = await reference(entry.path);
      assert.equal(ref.sha256, entry.sha256, "Source differs from preserved comparison; recompare before reuse");
      return { ...ref, available: true, required: requiredPaths.has(entry.path), matchesHistoricalComparison: true };
    } catch (error) {
      if (error.code !== "ENOENT" || requiredPaths.has(entry.path)) throw error;
      return { path: entry.path.replaceAll("\\", "/"), historicalSha256: entry.sha256, available: false, required: false, status: "historical-duplicate-now-unavailable" };
    }
  }));
  const evidence = await Promise.all([designPath, design.directive, bankPath, registryPath, draftsPath, figuresPath, proposalPath, path.join(index.originalArtifactRoot, "source-comparison-bumil.json"), ...(design.curriculumEvidencePath ? [design.curriculumEvidencePath] : []), ...bank.ledgerChecks.map((v) => v.path)].map(reference));
  const questionPlans = drafts.map((draft) => {
    const n = draft.questionNumber;
    const entry = design.questions.find((v) => v.n === n);
    const p = proposals.find((v) => v.n === n);
    assert(entry && p);
    const unit = bank.units.find((v) => v.id === p.unitId) ?? null;
    const registryEntry = registry.entries.find((v) => v.key === p.registryKey) ?? null;
    const live = bank.liveFamilies.find((v) => v.unit_id === p.unitId && v.family_key === p.family);
    const curriculumMapping = curriculum?.question_mappings.find((v) => v.question_number === n);
    if (curriculum) assert.equal(curriculumMapping?.source_content_sha256_utf8, sha(draft.content), "Curriculum evidence is for a different source version");
    const standardCodes = curriculumMapping ? [...new Set([...curriculumMapping.primary_standard_codes, ...curriculumMapping.prerequisite_standard_codes])] : [];
    const standards = standardCodes.map((code) => {
      const standard = curriculum.achievement_standards.find((v) => v.code === code);
      assert(standard?.original_2015_pdf_locator.code_found && standard.original_2015_pdf_locator.same_text_after_whitespace_normalization);
      return { code, role: curriculumMapping.primary_standard_codes.includes(code) ? "primary-proposal" : "prerequisite-proposal", sourceId: standard.source_id, hwpLocator: standard.hwp_locator, pdfLocator: standard.original_2015_pdf_locator, status: "expert-proposal-not-candidate-approval" };
    });
    return {
      n, twinExternalId: `${design.batchId}-q${String(n).padStart(2, "0")}`,
      source: "transformed", originProblemId: null, problemCode: null,
      sourceReference: { externalId: draft.externalId, examId: draft.examId, school: draft.school, questionNumber: n, sourceFile: draft.sourceFile, sourceContentSha256: sha(draft.content), sourceObservation: p.evidence.observation, sharedConceptProcedure: p.evidence.requiredProcedure },
      design: entry,
      metadata: {
        grade: "중3", subject: "수학", curriculum: design.curriculum,
        sourceExamYear: 2025, sourceExamSemester: 2, sourceExamRound: "중간",
        questionType: draft.questionType, score: draft.score,
        difficultyProposal: draft.difficulty, difficultyStatus: "pending-new-candidate-review",
        problemTypeProposal: entry.problemTypeProposal, problemTypeStatus: "pending-new-candidate-review",
        hasFigure: entry.figureMethod !== "none",
        assignment: {
          status: p.status, unitId: p.unitId, familyKey: p.family,
          currentUnit: unit, currentRegistryMatch: registryEntry,
          liveCount: live?.live_count ?? null, checkedAt: bank.capturedAt,
          evidence: p.why,
          candidates: p.candidates.map((c) => ({ ...c,
            currentUnit: bank.units.find((v) => v.id === c.unitId) ?? null,
            currentRegistryMatch: registry.entries.find((v) => v.key === c.registryKey) ?? null,
            currentLiveCount: bank.liveFamilies.find((v) => v.unit_id === c.unitId && v.family_key === c.family)?.live_count ?? 0,
          })),
        },
        achievementStandardRefs: standards,
        achievementStandardStatus: curriculumMapping ? "expert-proposal-not-candidate-approval" : "pending-official-evidence-mapping",
        curriculumMethodProposal: curriculumMapping?.proposed_middle3_method ?? null,
        curriculumSpecificHold: curriculumMapping?.specific_gate_notes ?? null,
        sourceIdentityReview: design.sourceIdentityReview ?? { status: "not-yet-rechecked" },
        generatorRuleReview: { status: "pending-semantic-match", registryPath, historicalSourceSuggestions: p.evidence.engineSourceRefs },
      },
      schoolNamePolicy: { ...design.schoolAlias, originalOccurrencesInStem: draft.content.split(draft.school).length - 1, surfaces: ["content", "choices", "tables", "figureLabels", "solution"], review: "pending-new-candidate" },
      figure: { method: entry.figureMethod, plan: entry.figurePlan, status: entry.figureMethod === "none" ? "not-required" : "planned", sourceFigureCount: figures.filter((v) => v.number === n).length, finalAssets: [] },
      candidate: null, independentVerification: null,
      review: { status: "pending", gradeCurriculum: "pending", equivalentConceptAndMethod: "pending", distinctPresentation: "pending", naturalKorean: "pending", mathematicalCorrectness: "pending", figure: "pending", rights: "pending", similarity: "pending" },
      directUseAllowed: false,
    };
  });
  const pack = {
    kind: "twin-resume-preparation-only", version: 1, batchId: design.batchId,
    createdAt: new Date().toISOString(), status: "planned-not-authored",
    sourceExamId: index.pilot.examId, evidence, sourceFiles: sourceRefs,
    originalRegeneration: { questions: 21, role: "historical-source-only", adoptedAsTwinVerification: false },
    questions: questionPlans,
  };
  const summary = inspectPreparation(pack);
  // Re-read the source while creating an answer-free author reference copy.
  await mkdir(path.join(output, "source-reference/figures"), { recursive: true });
  const figureRefs = [];
  for (const figure of figures) {
    const source = path.join(sourceDir, "figures", figure.file);
    const ref = await reference(source);
    const target = path.join(output, "source-reference/figures", figure.file);
    await copyFile(source, target, 1); // COPYFILE_EXCL
    figureRefs.push({ n: figure.number, role: "source-reference-only", kind: figure.kind ?? "fig", path: `source-reference/figures/${figure.file}`, source: ref, sha256: ref.sha256, pixels: figure.px, sourceWidthMm: figure.widthMm });
  }
  pack.referenceFigures = figureRefs;
  await writeNewJson(path.join(output, "source-reference/problems.json"), drafts.map((v) => ({ n: v.questionNumber, content: v.content, questionType: v.questionType, score: v.score, figures: figureRefs.filter((f) => f.n === v.questionNumber).map((f) => f.path.replace("source-reference/", "")) })));
  await writeNewJson(path.join(output, "preparation.json"), pack);
  await writeNewJson(path.join(output, "dry-run.json"), { ...summary, status: "held", note: "No authored candidate, new figure, solver/verifier pack, final grade approval or rights approval exists. This command has no database writer.", perQuestion: pack.questions.map((q) => ({ n: q.n, twinExternalId: q.twinExternalId, loadable: false, reasons: ["candidate-not-authored", "grade-curriculum-review-pending", "new-solve-and-independent-verification-missing", "metadata-final-review-pending", "rights-similarity-pending", ...(q.figure.method === "none" ? [] : ["new-figure-not-made"]), ...(q.metadata.assignment.status === "pending" ? ["unit-family-hold"] : [])] })) });
  console.log(JSON.stringify(summary));
}

async function check(packDir) {
  const pack = await json(path.join(packDir, "preparation.json"));
  const result = inspectPreparation(pack);
  for (const ref of [...pack.evidence, ...pack.sourceFiles.filter((f) => f.available), ...pack.referenceFigures.map((f) => f.source)]) {
    assert.equal(sha(await readFile(ref.path)), ref.sha256, `Source evidence changed: ${ref.path}`);
  }
  for (const f of pack.referenceFigures) {
    assert.equal(sha(await readFile(path.join(packDir, f.path))), f.sha256, "Reference figure copy changed");
  }
  const source = await json(path.join(packDir, "source-reference/problems.json"));
  assert.equal(source.length, pack.questions.length);
  for (const [i, q] of source.entries()) {
    assert(!Object.hasOwn(q, "answer") && !Object.hasOwn(q, "solution"), "Reference pack must be answer-free");
    assert.equal(sha(q.content), pack.questions[i].sourceReference.sourceContentSha256);
  }
  console.log(JSON.stringify({ ...result, evidenceCurrent: true, referenceFigures: pack.referenceFigures.length, originalFilesPreserved: true }));
}

async function main() {
  const [command, a, b, ...rest] = process.argv.slice(2);
  assert(!rest.length && a && !a.startsWith("--"));
  if (command === "prepare" && b && !b.startsWith("--")) return prepare(a, b);
  if ((command === "check" || command === "dry-run") && !b) return check(a);
  throw new Error("Usage: prepare-twin-resume.mjs prepare <design-json> <new-directory> | check|dry-run <package-directory>. No --apply mode exists.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
