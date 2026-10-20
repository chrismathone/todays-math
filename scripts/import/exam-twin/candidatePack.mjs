/** Authored twin review contract. No model calls, DB writer or approval-by-hash. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { compareConstantParts } from "./constantAnswers.mjs";
import {
  compareWrittenAnswerPresentation,
  isStandaloneMeasuredAnswer,
} from "./answerPresentation.mjs";
import { unescapedMathCommandWarnings } from "./authoredMathNotation.mjs";
import { compareCurriculumDeclarations } from "./curriculumDeclarations.mjs";
import { compareRecordCorrectionAnswer } from "./recordCorrectionAnswer.mjs";
import { compareNumberedConstantAssignments } from "./numberedConstantAssignments.mjs";

export const REVIEW_CHECKS = [
  "answerCorrect",
  "solutionCorrect",
  "existenceUniqueness",
  "choicesCorrect",
  "figureConsistent",
  "sameCoreConceptAndProcedure",
  "distinctPresentation",
  "naturalKorean",
  "curriculumAppropriate",
  "allStudentSurfacesInScope",
  "unitFamilyFit",
  "scoreAppropriate",
];
export const SURFACES = [
  "stem",
  "choices",
  "figuresAndTables",
  "notation",
  "answer",
  "studentSolution",
  "prerequisites",
];
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  assert(
    value !== undefined &&
      (typeof value !== "number" || Number.isFinite(value)),
    "Invalid digest value",
  );
  return JSON.stringify(value);
}
export const digest = (value) => sha256(canonicalJson(value));
function parseJsonArtifact(raw) {
  assert(
    !(raw[0] === 0xff && raw[1] === 0xfe) &&
      !(raw[0] === 0xfe && raw[1] === 0xff),
    "JSON artifact is UTF-16; preserve its raw bytes and create an explicit UTF-8 copy",
  );
  const offset = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf ? 3 : 0;
  const text = new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  }).decode(raw.subarray(offset));
  assert(
    !text.includes("\u0000"),
    "JSON artifact contains NUL bytes; preserve the raw file and create a new version",
  );
  return JSON.parse(text);
}
export const readJson = (file) => parseJsonArtifact(fs.readFileSync(file));

// UTF-8 decoding must not silently replace damaged diagram bytes. These checks
// establish readable transport only; native geometry and independent review remain.
function readableFigureText(text, label) {
  assert(
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/u.test(text),
    `Unreadable ${label}; preserve damaged bytes and create a new figure version`,
  );
  return text;
}
function readableFigureSpec(value) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    "Figure spec must be a JSON object; native geometry review is still required",
  );
  const pending = [value];
  while (pending.length) {
    const current = pending.pop();
    if (typeof current === "string") readableFigureText(current, "figure spec text");
    else if (current && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) {
        readableFigureText(key, "figure spec key");
        pending.push(child);
      }
    }
  }
}
// MOE 2022 general-education phase-in (93458): middle3 starts in 2027.
// This offline pilot supports middle3/2015. A 2022 candidate requires new
// template/standards and seven-surface review, never a relabel.
export function middle3CurriculumForExamYear(year) {
  assert(Number.isInteger(year) && year >= 2025);
  return year >= 2027 ? "2022" : "2015";
}

export function newOutputPath(input, workspace = process.cwd()) {
  const root = fs.realpathSync(workspace);
  const output = path.resolve(workspace, input);
  const within = path.relative(path.resolve(workspace), output);
  assert(
    within && !within.startsWith("..") && !path.isAbsolute(within),
    "Output must stay in this task worktree",
  );
  assert(
    !within
      .split(path.sep)
      .some((part) => ["node_modules", ".git"].includes(part.toLowerCase())),
    "Output dependency or junction escapes worktree artifact ownership",
  );
  let ancestor = output;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realAncestor = fs.realpathSync(ancestor);
  const realRelative = path.relative(root, realAncestor);
  assert(
    !realRelative.startsWith("..") && !path.isAbsolute(realRelative),
    "Output junction escapes worktree",
  );
  assert(
    !fs.existsSync(output),
    "Refuse to overwrite an existing review version",
  );
  return output;
}

export function containedPath(root, relative) {
  assert(
    typeof relative === "string" &&
      relative.length > 0 &&
      !path.isAbsolute(relative),
    "Expected a relative asset path",
  );
  const result = path.resolve(root, relative);
  const within = path.relative(path.resolve(root), result);
  assert(
    within && !within.startsWith("..") && !path.isAbsolute(within),
    "Asset path escapes its package",
  );
  const realRoot = fs.realpathSync(root);
  const realFile = fs.realpathSync(result);
  const realRelative = path.relative(realRoot, realFile);
  assert(
    realRelative &&
      !realRelative.startsWith("..") &&
      !path.isAbsolute(realRelative),
    "Asset symlink escapes package",
  );
  return result;
}

export function studentPayload(candidate, assets = []) {
  return {
    twinExternalId: candidate.twinExternalId,
    questionNumber: candidate.questionNumber,
    grade: candidate.curriculumReview.grade,
    curriculum: candidate.curriculumReview.edition,
    questionType: candidate.questionType,
    score: candidate.score,
    content: candidate.content,
    choices: candidate.choices.map((text, index) => {
      const a = assets.find((asset) => asset.role === `choice:${index + 1}`);
      return a && /^!\[[^\]]*\]\([^\n]+\)$/.test(text.trim())
        ? `![선택지 ${index + 1}의 그래프](${a.studentPath})`
        : text;
    }),
    figures: assets.map((a) => ({
      role: a.role,
      svgPath: a.studentPath,
      sha256: a.svgSha256,
      intendedWidthMm: a.intendedWidthMm,
    })),
  };
}

export function validateCandidate(candidate) {
  assert.equal(candidate.schemaVersion, 1);
  assert(
    Number.isInteger(candidate.questionNumber) && candidate.questionNumber > 0,
  );
  assert(/^exam-twin-/.test(candidate.twinExternalId));
  assert(typeof candidate.authorId === "string" && candidate.authorId.trim());
  for (const key of ["content", "answer", "solution"])
    assert(
      typeof candidate[key] === "string" && candidate[key].trim(),
      `Missing ${key}`,
    );
  assert(Number.isFinite(candidate.score) && candidate.score > 0);
  assert(["객관식", "단답형", "서술형"].includes(candidate.questionType));
  assert(Array.isArray(candidate.choices));
  if (candidate.questionType === "객관식") {
    assert.equal(candidate.choices.length, 5);
    assert(candidate.choices.every((v) => typeof v === "string" && v.trim()));
    assert.equal(
      new Set(candidate.choices.map((v) => v.replace(/\s/g, ""))).size,
      5,
      "Duplicate displayed choices",
    );
    assert(
      /^[①②③④⑤]$/.test(candidate.answer.trim()),
      "A single choice answer is required",
    );
  } else assert.equal(candidate.choices.length, 0);
  assert(Array.isArray(candidate.figureArtifacts));
  assert.equal(candidate.curriculumReview.grade, "중3");
  assert.equal(candidate.curriculumReview.edition, "2015");
  assert.equal(
    candidate.curriculumReview.status,
    "author-proposed",
    "Author cannot give final grade approval",
  );
  assert(
    Array.isArray(candidate.curriculumReview.standardCodes) &&
      candidate.curriculumReview.standardCodes.length,
  );
  assert(
    candidate.variantDelta?.modes.some((m) =>
      ["structure", "context", "representation", "inverse-target"].includes(m),
    ),
    "Numeric/name-only variants are insufficient",
  );
  for (const key of ["before", "after", "sharedConcept", "sharedProcedure"])
    assert(candidate.variantDelta[key], `Missing delta ${key}`);
  assert(
    candidate.sourceReference?.sourceContentSha256?.match(/^[a-f0-9]{64}$/),
  );
  assert.notEqual(
    candidate.twinExternalId,
    candidate.sourceReference.externalId,
  );
  const metadata = candidate.metadata;
  assert.equal(metadata?.grade, "중3");
  assert.equal(metadata.curriculum?.sourceExam, "2015");
  assert.equal(metadata.curriculum?.target, "2015");
  assert(
    Number.isInteger(metadata.sourceExamYear) &&
      metadata.sourceExamYear >= 2025,
    "Only 2025+ source exams",
  );
  assert.equal(
    metadata.curriculum.sourceExam,
    middle3CurriculumForExamYear(metadata.sourceExamYear),
    "Source year/grade curriculum mismatch",
  );
  assert.equal(metadata.questionType, candidate.questionType);
  assert.equal(metadata.score, candidate.score);
  assert(
    Object.hasOwn(metadata, "difficultyProposal") &&
      metadata.difficultyStatus &&
      Object.hasOwn(metadata, "problemTypeProposal") &&
      metadata.problemTypeStatus,
    "Missing classification evidence/status",
  );
  const assignment = metadata.assignment;
  assert(
    assignment && ["proposed", "pending"].includes(assignment.status),
    "Author taxonomy is proposed or held",
  );
  assert(
    assignment.unitId === null ||
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(assignment.unitId),
  );
  assert(
    assignment.familyKey === null || typeof assignment.familyKey === "string",
  );
  assert(assignment.evidence, "Taxonomy hold/proposal requires evidence");
  const rules = readJson(
    new URL("../exam-paper/solver_rules.json", import.meta.url),
  );
  const studentText = [
    candidate.content,
    ...candidate.choices,
    candidate.answer,
    candidate.solution,
  ].join("\n");
  // Ordinary nouns can contain the syllables 로그. This narrow lexical check
  // is only a rejection aid; every candidate still needs semantic grade review.
  const logarithmText = studentText.replace(
    /프로그래밍|프로그램|로그인|블로그|카탈로그/g,
    " ",
  );
  const violations = [...rules.forbiddenMethods, ...rules.forbiddenShapes]
    .filter((r) =>
      r.name === "로그"
        ? new RegExp(r.pattern, "i").test(logarithmText) ||
          /\\log\b|\blog(?=\s*(?:[_({0-9]|$))/i.test(logarithmText)
        : new RegExp(r.pattern, "i").test(studentText),
    )
    .map((r) => r.name);
  return {
    structurallyValid: true,
    curriculumMetadataComparison: compareCurriculumDeclarations(candidate),
    surfaceKeywordViolations: violations,
    studentMathNotationWarnings: [
      ["stem", candidate.content],
      ...candidate.choices.map((text, i) => [`choice-${i + 1}`, text]),
      ["answer", candidate.answer],
      ["studentSolution", candidate.solution],
    ].flatMap(([surface, text]) =>
      unescapedMathCommandWarnings(text).map((warning) => ({ surface, ...warning })),
    ),
    semanticGradeReviewStillRequired: true,
    // Preserve readable historical drafts, but never count a known copied MC
    // answer descriptor as valid metadata for a non-choice response.
    metadataAnswerFormatMismatch:
      candidate.questionType !== "객관식" &&
      typeof metadata.answerFormat === "string" &&
      ["single-choice", "single circled choice"].includes(
        metadata.answerFormat.trim().toLowerCase(),
      ),
  };
}

export function bindCandidate(file) {
  // Parse and hash the same captured bytes, even if the path is later replaced.
  const candidateBytes = fs.readFileSync(file);
  const candidate = parseJsonArtifact(candidateBytes);
  const validation = validateCandidate(candidate);
  const folder = path.dirname(file);
  const assetPath = (relative) => {
    // Author files may use a worktree-relative QA path. Resolve it only if the
    // resulting physical file is still inside this candidate's own directory.
    const local = relative.startsWith(".qa-artifacts/")
      ? path.relative(folder, path.resolve(relative))
      : relative;
    return containedPath(folder, local);
  };
  const assets = candidate.figureArtifacts.map((a, index) => {
    const role =
      a.role === "choice" && Number.isInteger(a.choiceNumber)
        ? `choice:${a.choiceNumber}`
        : a.role;
    assert(role === "stem" || /^choice:[1-5]$/.test(role));
    assert(
      Number.isFinite(a.intendedWidthMm) &&
        a.intendedWidthMm > 0 &&
        a.intendedWidthMm <= 100,
    );
    const spec = assetPath(a.specPath);
    const svg = assetPath(a.svgPath);
    const specBytes = fs.readFileSync(spec);
    readableFigureSpec(parseJsonArtifact(specBytes));
    const bytes = fs.readFileSync(svg);
    const markup = readableFigureText(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      "figure SVG",
    );
    const resources = (a.rasterResources ?? []).map((r) => {
      const rasterPath = assetPath(r.path);
      const generationPath = assetPath(r.generationPath);
      const png = fs.readFileSync(rasterPath);
      assert(
        png
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        "Only bound PNG raster resources are supported",
      );
      const generationBytes = fs.readFileSync(generationPath);
      const generation = parseJsonArtifact(generationBytes);
      assert.equal(generation.tool, "built-in image_gen.imagegen");
      assert.equal(generation.paidApiCliFallback, false);
      assert(typeof generation.prompt === "string" && generation.prompt.trim());
      assert(
        markup.includes(`data:image/png;base64,${png.toString("base64")}`),
        "Generated pixels are not bound into the authored figure",
      );
      return {
        sourceRasterPath: rasterPath,
        sourceGenerationPath: generationPath,
        rasterSha256: sha256(png),
        generationSha256: sha256(generationBytes),
        widthPx: png.readUInt32BE(16),
        heightPx: png.readUInt32BE(20),
      };
    });
    assert(
      markup.includes("<svg") &&
        !/<(?:script|foreignObject)\b|\bon\w+\s*=/i.test(markup),
      "Unsafe figure markup",
    );
    for (const reference of markup.matchAll(
      /(?:href|src)\s*=\s*["']([^"']+)/gi,
    )) {
      const value = reference[1];
      assert(
        value.startsWith("#") ||
          resources.some(
            (r) =>
              value ===
              `data:image/png;base64,${fs.readFileSync(r.sourceRasterPath).toString("base64")}`,
          ),
        "Unbound/external figure reference",
      );
    }
    return {
      role,
      sourceSpecPath: spec,
      sourceSvgPath: svg,
      specSha256: sha256(specBytes),
      svgSha256: sha256(bytes),
      intendedWidthMm: a.intendedWidthMm,
      studentPath: `figures/q${String(candidate.questionNumber).padStart(2, "0")}-${index + 1}.svg`,
      ...(resources.length ? { resources } : {}),
    };
  });
  const student = studentPayload(candidate, assets);
  const assetBindings = assets.map(
    ({ role, specSha256, svgSha256, intendedWidthMm, resources }) => ({
      role,
      specSha256,
      svgSha256,
      intendedWidthMm,
      ...(resources
        ? {
            resources: resources.map(
              ({ rasterSha256, generationSha256, widthPx, heightPx }) => ({
                rasterSha256,
                generationSha256,
                widthPx,
                heightPx,
              }),
            ),
          }
        : {}),
    }),
  );
  return {
    candidate,
    candidateFile: path.resolve(file),
    candidateFileSha256: sha256(candidateBytes),
    assets,
    validation,
    student,
    studentDigest: digest(student),
    assetDigest: digest(assetBindings),
    candidateDigest: digest({ candidate, assetBindings }),
  };
}

export function normalizeAnswer(text) {
  return String(text)
    .normalize("NFKC")
    .replace(/\$(.*?)\$/g, "$1")
    .replace(/^\\\(([\s\S]*)\\\)$/, "$1")
    .replace(/\\(?:left|right)|\\[,!; ]|[~\s]/g, "")
    .replace(/\\(?:dfrac|tfrac)/g, "\\frac")
    .replace(/\\sqrt([0-9])/g, "\\sqrt{$1}")
    .replace(/\^([0-9])/g, "^{$1}")
    .replace(/\\(?:mathrm|text)\{(cm|m)\}/g, "$1");
}

/** Compare sealed answer bytes without rewriting them. An optional value after
 * a choice mark must equal that actual option, including its explicit unit.
 * Unsupported notation remains a mismatch requiring review, never a guessed value.
 */
export function independentAnswerMatches(candidate, answer) {
  if (!answer) return false;
  if (candidate.questionType === "서술형" &&
      candidate.metadata?.answerFormat === "numbered-named-scalars-with-working")
    return compareNumberedConstantAssignments(candidate.answer, answer).status === "equivalent";
  if (candidate.questionType === "서술형" &&
      candidate.metadata?.answerFormat === "record-label-and-scalar-with-working")
    return compareRecordCorrectionAnswer(candidate.answer, answer,
      candidate.metadata.recordCorrectionAnswerSchema).status === "equivalent";
  const exact = normalizeAnswer(answer) === normalizeAnswer(candidate.answer);
  if (candidate.questionType !== "객관식" || candidate.choices?.length !== 5) {
    const compared = compareWrittenAnswerPresentation(candidate.answer, answer);
    if (isStandaloneMeasuredAnswer(candidate.answer))
      return compared.status === "equivalent";
    return exact || compared.status === "equivalent";
  }
  const marked = (x) => /^\s*([①-⑤])(?:\s+(.+?))?\s*$/u.exec(String(x));
  const expected = marked(candidate.answer), actual = marked(answer);
  if (!expected || !actual) return exact;
  if (expected[1] !== actual[1]) return false;
  const annotations = [expected[2], actual[2]].filter((x) => x !== undefined);
  if (annotations.length === 0) return true;
  const part = (value) => {
    if (typeof value !== "string" || /\d\s+\d/u.test(value)) return null;
    const normalized = normalizeAnswer(value.replace(/²/g, "^{2}").replace(/³/g, "^{3}"));
    const unit = /^(.*?)(cm|m)(?:\^\{([23])\})?$/u.exec(normalized);
    return {
      role: "selected-option",
      value: unit ? unit[1] : normalized,
      unit: unit ? unit[2] + (unit[3] ? `^${unit[3]}` : "") : "none",
    };
  };
  const selected = part(candidate.choices["①②③④⑤".indexOf(expected[1])]);
  if (!selected) return false;
  return annotations.every((value) => {
    const supplied = part(value);
    return supplied !== null &&
      compareConstantParts([selected], [supplied]).status === "equivalent";
  });
}

/** Serialization sanity before exposing answers. This is not a math/grade test. */
export function assertRawSolveReadable(solve, questionType) {
  assert(typeof solve.answer === "string" && solve.answer.trim(), "Raw answer is missing");
  assert(typeof solve.solution === "string" && solve.solution.trim(), "Raw solution is missing");
  assert(!/[?\uFFFD]/u.test(solve.answer), "Raw answer has an unresolved or damaged character");
  assert(!/\?\?|\uFFFD/u.test(solve.solution), "Raw solution has unresolved or damaged characters");
  if (questionType === "객관식")
    assert(/^\s*[①-⑤](?:(?:\s+|[:：,]\s*)[^?]+)?\s*$/u.test(solve.answer), "Raw MC answer needs a readable choice mark");
}

export function evaluateReview(binding, solve, review, gates = {}) {
  const reasons = [];
  let mathematicalVerified = false;
  let gradeReviewed = false;
  const fail = (reason) => reasons.push(reason);
  if (binding.validation.surfaceKeywordViolations.length)
    fail("student-surface-out-of-grade-keyword");
  if (binding.validation.metadataAnswerFormatMismatch)
    fail("metadata-answer-format-mismatch");
  if (binding.validation.curriculumMetadataComparison?.conflicts.length)
    fail("curriculum-metadata-declarations-conflict");
  if (binding.validation.studentMathNotationWarnings?.length)
    fail("student-math-notation-command-escape-held");
  if (!solve || !review) fail("independent-evidence-missing");
  else {
    if (
      solve.studentDigest !== binding.studentDigest ||
      review.studentDigest !== binding.studentDigest ||
      review.candidateDigest !== binding.candidateDigest ||
      review.assetDigest !== binding.assetDigest
    )
      fail("stale-review-digest");
    if (
      solve.solverId === binding.candidate.authorId ||
      review.verifierId === binding.candidate.authorId ||
      !solve.solverId ||
      !review.verifierId
    )
      fail("author-is-not-independent-verifier");
    if (
      review.method !== "independent-solve-then-review" ||
      review.solveDigest !== digest(solve)
    )
      fail("independent-solve-not-bound");
    if (!["verified", "pending", "rejected"].includes(review.status))
      fail("independent-review-status-missing");
    else if (review.status !== "verified")
      fail(`review-status-${review.status}`);
    if (solve.status !== "solved") fail("independent-solve-not-complete");
    try { assertRawSolveReadable(solve, binding.candidate.questionType); }
    catch { fail("independent-raw-proof-unreadable"); }
    if (
      !independentAnswerMatches(binding.candidate, solve.answer)
    )
      fail("independent-answer-mismatch");
    if (!solve.solution || !solve.evidence || !review.evidence)
      fail("independent-reasoning-missing");
    for (const key of REVIEW_CHECKS)
      if (review.checks?.[key] !== true) fail(`review-${key}-not-passed`);
    for (const surface of SURFACES) {
      const audit = review.curriculumSurfaces?.[surface];
      const status =
        typeof audit === "object" && audit !== null ? audit.status : audit;
      if (status !== "passed") fail(`curriculum-${surface}-not-passed`);
      if (
        typeof audit === "object" &&
        audit !== null &&
        !(audit.basis || audit.evidence)
      )
        fail(`curriculum-${surface}-basis-missing`);
    }
    // Each dimension is reported independently. A taxonomy hold cannot turn an
    // actually checked answer into an unchecked one; no partial pass permits use.
    const authentic = !reasons.some((r) =>
      /digest|independent|author-is/.test(r),
    );
    mathematicalVerified =
      authentic &&
      !binding.validation.studentMathNotationWarnings?.length &&
      !reasons.some((r) =>
        /review-(answer|solution|existence|choices|figure)/.test(r),
      );
    gradeReviewed =
      authentic &&
      !binding.validation.studentMathNotationWarnings?.length &&
      !reasons.some((r) =>
        /curriculum|out-of-grade-keyword|review-allStudentSurfaces/.test(r),
      );
  }
  if (gates.sourceIdentity !== "confirmed") fail("source-identity-held");
  if (gates.taxonomy !== "reviewed") fail("taxonomy-held");
  if (gates.rights !== "cleared") fail("rights-review-pending");
  if (gates.similarity !== "reviewed") fail("similarity-review-pending");
  // This task deliberately provides no native provenance/read-contract or writer.
  fail("native-exam-twin-provenance-not-implemented");
  return {
    mathematicalVerified,
    gradeReviewed,
    overallVerified: false,
    loadable: false,
    reasons: [...new Set(reasons)],
    productionWrites: false,
  };
}
