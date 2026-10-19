import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  digest,
  evaluateReview,
  normalizeAnswer,
  independentAnswerMatches,
  middle3CurriculumForExamYear,
  REVIEW_CHECKS,
  studentPayload,
  SURFACES,
  validateCandidate,
  readJson,
  sha256,
} from "./candidatePack.mjs";

test("sealed marked answers validate their annotated value and dimension against the actual option", () => {
  const mc = { questionType: "객관식", choices: ["1", "2", "3", "$\\frac{9\\sqrt{10}}{10}$", "5"], answer: "④" };
  assert.equal(independentAnswerMatches(mc, "④ 9√10/10"), true);
  assert.equal(independentAnswerMatches(mc, "④ 9/√10"), true);
  assert.equal(independentAnswerMatches(mc, "④ 9√10/100"), false);
  assert.equal(independentAnswerMatches(mc, "③ 9√10/10"), false);
  assert.equal(independentAnswerMatches(mc, "④ 9√10/10 cm"), false);
  assert.equal(independentAnswerMatches(mc, "④ x"), false);
  assert.equal(independentAnswerMatches({ ...mc, answer: "④ 99" }, "④ 99"), false);
  assert.equal(independentAnswerMatches(mc, "④"), true);
  const area = { ...mc, choices: ["1", "2", "3", "$18\\sqrt{3}\\,\\mathrm{cm}^2$", "5"] };
  assert.equal(independentAnswerMatches(area, "④ 18√3 cm²"), true);
  assert.equal(independentAnswerMatches(area, "④ 0.0018√3 m²"), true);
  for (const raw of ["④ 18√3 cm", "④ 18√3", "④ 18√3 m²", "④ 1 8√3 cm²", "④ 18√3 cm² 설명", "④ 18√3 cm² ③"]) {
    assert.equal(independentAnswerMatches(area, raw), false, raw);
  }
  assert.equal(independentAnswerMatches({ ...mc, questionType: "단답형" }, "④ 9√10/10"), false);
});

test("UTF-8 BOM parsing keeps raw-byte evidence distinct and rejects UTF-16 or corrupt UTF-8", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "twin-json-encoding-"));
  try {
    const file = path.join(dir, "input.json");
    const raw = Buffer.from('{"status":"solved","value":3}', "utf8");
    fs.writeFileSync(file, raw);
    const plain = readJson(file);
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), raw]);
    fs.writeFileSync(file, bom);
    assert.deepEqual(readJson(file), plain);
    assert.deepEqual(fs.readFileSync(file), bom);
    assert.notEqual(sha256(raw), sha256(bom));
    fs.writeFileSync(
      file,
      Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from('{"value":3}', "utf16le"),
      ]),
    );
    assert.throws(() => readJson(file), /UTF-16/);
    fs.writeFileSync(file, Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d]));
    assert.throws(() => readJson(file));
    fs.writeFileSync(
      file,
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf]), raw]),
    );
    assert.throws(() => readJson(file));
  } finally {
    if (fs.existsSync(path.join(dir, "input.json")))
      fs.unlinkSync(path.join(dir, "input.json"));
    fs.rmdirSync(dir);
  }
});

test("middle3 rollout cannot reuse 2015 source mapping for 2027", () => {
  assert.equal(middle3CurriculumForExamYear(2025), "2015");
  assert.equal(middle3CurriculumForExamYear(2026), "2015");
  assert.equal(middle3CurriculumForExamYear(2027), "2022");
  const outdated = structuredClone(candidate);
  outdated.metadata.sourceExamYear = 2027;
  assert.throws(() => validateCandidate(outdated), /curriculum mismatch/);
});

// Synthetic controls only. These are not verification reports for real twins.
test("ordinary program wording is not a logarithm, while explicit logarithms remain forbidden", () => {
  const ordinary = structuredClone(candidate);
  ordinary.content =
    "프로그램 A의 기록을 표로 나타냈다. 로그인과 블로그는 소재 이름이다.";
  const result = validateCandidate(ordinary);
  assert.deepEqual(result.surfaceKeywordViolations, []);
  assert.equal(result.semanticGradeReviewStillRequired, true);
  for (const text of [
    "로그함수를 이용하시오.",
    "로그의 성질",
    "$\\log_2 8$",
    "$log(8)$",
    "프로그램의 값에 로그를 취한다.",
  ]) {
    const forbidden = structuredClone(ordinary);
    forbidden.solution = text;
    assert(
      validateCandidate(forbidden).surfaceKeywordViolations.includes("로그"),
      text,
    );
  }
});

const candidate = {
  schemaVersion: 1,
  questionNumber: 2,
  twinExternalId: "exam-twin-test-q02",
  authorId: "synthetic-author",
  content: "이동 기록에서 빈칸을 구하시오.",
  choices: ["$1$", "$2$", "$3$", "$4$", "$5$"],
  answer: "③",
  solution: "좌표를 대입하여 이동량을 계산한다.",
  score: 4,
  questionType: "객관식",
  figureArtifacts: [],
  facts: { privateDerivedAnswer: 3 },
  variantDelta: {
    modes: ["inverse-target"],
    before: "value",
    after: "shift",
    sharedConcept: "vertical translation",
    sharedProcedure: "substitution",
  },
  curriculumReview: {
    grade: "중3",
    edition: "2015",
    status: "author-proposed",
    standardCodes: ["9수03-10"],
  },
  sourceReference: {
    externalId: "original-q02",
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
function control() {
  const binding = {
    candidate: structuredClone(candidate),
    validation: validateCandidate(candidate),
    studentDigest: "b".repeat(64),
    candidateDigest: "c".repeat(64),
    assetDigest: "d".repeat(64),
  };
  const solve = {
    studentDigest: binding.studentDigest,
    solverId: "synthetic-independent",
    answer: "③",
    solution: "별도 좌표 대입 과정",
    evidence: "synthetic control",
    status: "solved",
  };
  const review = {
    status: "verified",
    method: "independent-solve-then-review",
    verifierId: "synthetic-independent",
    studentDigest: binding.studentDigest,
    candidateDigest: binding.candidateDigest,
    assetDigest: binding.assetDigest,
    solveDigest: digest(solve),
    evidence: "synthetic control",
    checks: Object.fromEntries(REVIEW_CHECKS.map((k) => [k, true])),
    curriculumSurfaces: Object.fromEntries(SURFACES.map((k) => [k, "passed"])),
  };
  return { binding, solve, review };
}
test("student payload exposes no answer, solution, private calibration or origin key", () => {
  const payload = studentPayload(candidate);
  assert(
    !("answer" in payload) &&
      !("solution" in payload) &&
      !("facts" in payload) &&
      !("sourceReference" in payload),
  );
});
test("answer presentation permits TeX braces but preserves value and unit differences", () => {
  assert.equal(
    normalizeAnswer("$(6\\pi+9\\sqrt3)\\,\\mathrm{cm}^2$"),
    normalizeAnswer("$(6\\pi+9\\sqrt{3})\\,\\mathrm{cm}^{2}$"),
  );
  assert.notEqual(
    normalizeAnswer("$8\\,\\mathrm{cm}$"),
    normalizeAnswer("$8\\,\\mathrm{m}$"),
  );
  assert.notEqual(normalizeAnswer("$9\\sqrt3$"), normalizeAnswer("$9\\sqrt6$"));
});
test("different key order preserves semantic digest and content changes invalidate it", () => {
  assert.equal(digest({ a: 1, b: [2, 3] }), digest({ b: [2, 3], a: 1 }));
  assert.notEqual(digest({ a: 1 }), digest({ a: 2 }));
});
test("stale content/figure/solution evidence fails closed", () => {
  for (const key of [
    "studentDigest",
    "candidateDigest",
    "assetDigest",
    "solveDigest",
  ]) {
    const c = control();
    c.review[key] = "e".repeat(64);
    const result = evaluateReview(c.binding, c.solve, c.review);
    assert.equal(result.mathematicalVerified, false);
    assert.equal(result.loadable, false);
  }
});
test("author's self-review cannot pass independent verification", () => {
  const c = control();
  c.review.verifierId = candidate.authorId;
  assert.equal(
    evaluateReview(c.binding, c.solve, c.review).mathematicalVerified,
    false,
  );
});
test("uncertain or rejected surface/curriculum evidence blocks", () => {
  for (const status of ["pending", "rejected"]) {
    const c = control();
    c.review.curriculumSurfaces.studentSolution = status;
    const result = evaluateReview(c.binding, c.solve, c.review);
    assert.equal(result.gradeReviewed, false);
    assert.equal(result.overallVerified, false);
  }
});
test("detailed curriculum audit preserves each surface basis and fails closed without it", () => {
  const c = control();
  c.review.curriculumSurfaces = Object.fromEntries(
    SURFACES.map((s) => [
      s,
      { status: "passed", basis: "synthetic surface evidence" },
    ]),
  );
  assert.equal(
    evaluateReview(c.binding, c.solve, c.review).gradeReviewed,
    true,
  );
  c.review.curriculumSurfaces.studentSolution = { status: "passed" };
  assert.equal(
    evaluateReview(c.binding, c.solve, c.review).gradeReviewed,
    false,
  );
});
test("new math evidence never clears provenance, rights or production gates", () => {
  const c = control();
  const result = evaluateReview(c.binding, c.solve, c.review);
  assert.equal(result.mathematicalVerified, true);
  assert.equal(result.gradeReviewed, true);
  assert.equal(result.overallVerified, false);
  assert.equal(result.loadable, false);
  assert(result.reasons.includes("rights-review-pending"));
  const allCleared = evaluateReview(c.binding, c.solve, c.review, {
    sourceIdentity: "confirmed",
    taxonomy: "reviewed",
    rights: "cleared",
    similarity: "reviewed",
  });
  assert.equal(allCleared.loadable, false);
  assert(
    allCleared.reasons.includes("native-exam-twin-provenance-not-implemented"),
  );
  c.solve.answer = "③ 3";
  c.review.solveDigest = digest(c.solve);
  const annotated = evaluateReview(c.binding, c.solve, c.review);
  assert.equal(annotated.mathematicalVerified, true);
  assert.equal(annotated.loadable, false);
  c.solve.answer = "③ 4";
  c.review.solveDigest = digest(c.solve);
  const wrongAnnotation = evaluateReview(c.binding, c.solve, c.review);
  assert.equal(wrongAnnotation.mathematicalVerified, false);
  assert(wrongAnnotation.reasons.includes("independent-answer-mismatch"));
});
test("mathematics, grade and unresolved taxonomy are separate review dimensions", () => {
  const c = control();
  c.review.status = "pending";
  c.review.checks.unitFamilyFit = false;
  const result = evaluateReview(c.binding, c.solve, c.review);
  assert.equal(result.mathematicalVerified, true);
  assert.equal(result.gradeReviewed, true);
  assert.equal(result.loadable, false);
  c.review.curriculumSurfaces.studentSolution = "rejected";
  assert.equal(
    evaluateReview(c.binding, c.solve, c.review).gradeReviewed,
    false,
  );
});
test("known forbidden method in any student surface rejects", () => {
  for (const key of ["content", "answer", "solution"]) {
    const value = structuredClone(candidate);
    value[key] += " 미분";
    if (key === "answer") assert.throws(() => validateCandidate(value));
    else
      assert(
        validateCandidate(value).surfaceKeywordViolations.includes("미분"),
      );
  }
  const value = structuredClone(candidate);
  value.choices[4] += " 코사인 법칙";
  assert(
    validateCandidate(value).surfaceKeywordViolations.includes("코사인 법칙"),
  );
});
test("numeric-only variants, duplicate choices and original ID reuse reject", () => {
  const changed = structuredClone(candidate);
  changed.variantDelta.modes = ["numbers"];
  assert.throws(() => validateCandidate(changed));
  const duplicate = structuredClone(candidate);
  duplicate.choices[1] = duplicate.choices[0];
  assert.throws(() => validateCandidate(duplicate));
  const original = structuredClone(candidate);
  original.sourceReference.externalId = original.twinExternalId;
  assert.throws(() => validateCandidate(original));
});
test("metadata cannot silently change source year, curriculum, score or Unit UUID", () => {
  const old = structuredClone(candidate);
  old.metadata.sourceExamYear = 2024;
  assert.throws(() => validateCandidate(old));
  const changed = structuredClone(candidate);
  changed.metadata.curriculum.target = "2022";
  assert.throws(() => validateCandidate(changed));
  const wrongScore = structuredClone(candidate);
  wrongScore.metadata.score = 8;
  assert.throws(() => validateCandidate(wrongScore));
  const invalid = structuredClone(candidate);
  invalid.metadata.assignment.unitId = "invented-unit";
  assert.throws(() => validateCandidate(invalid));
});
