import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inverseMinimum, inverseMinimumStudyMetadata } from "../../../src/lib/examStudy/families/middle/inverseMinimum";

const b = ".qa-artifacts/exam-resume-20261008/";
const e = b + "engine-upgrade-20261019/";
const hash = (p: string) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const proposed = JSON.parse(fs.readFileSync(b + "inverse-minimum-proposal-20261020-r1/student-only24.json", "utf8"));
const drafts = Array.from({ length: 24 }, (_, i) => inverseMinimum.generate(0, i));
drafts.forEach((draft, i) => {
  assert.equal(draft.content, proposed.students[i].content);
  assert.equal(inverseMinimum.verify(draft).valid, true);
});
const output = e + "inverse-minimum-actual-drafts-r1.json";
fs.writeFileSync(output, JSON.stringify({ utc: new Date().toISOString(), drafts, metadata: inverseMinimumStudyMetadata,
  proposalSha256: hash(b + "inverse-minimum-proposal-20261020-r1/student-only24.json"),
  actualStudentTextsEqualProposal: true, newManualQuestions: 0, newManualFigures: 0,
  gradeApproved: false, rightsApproved: false, publicReleaseApproved: false, dbWrites: 0 }, null, 2) + "\n", { flag: "wx" });
const files = ["src/contracts/examStudy.contract.ts", "src/contracts/difficulty.ts",
  "src/lib/examStudy/requirements.ts", "src/lib/examStudy/releaseEligibility.ts",
  "src/lib/examStudy/families/middle/index.ts", "src/lib/examStudy/families/middle/inverseMinimum.ts",
  "src/lib/examStudy/families/middle/support.ts", "src/lib/examStudy/generate.ts", "src/lib/examStudy/evidence.ts",
  "src/lib/examStudy/registry.ts", "src/lib/examStudy/identity.ts", "src/lib/examStudy/curriculumEligibility.ts",
  "src/lib/examStudyRoutes.ts", "src/__tests__/unit/examStudyInverseMinimum.test.ts"];
fs.writeFileSync(e + "inverse-minimum-code-scope-r1.json", JSON.stringify({ utc: new Date().toISOString(),
  files: files.map(p => ({ path: path.resolve(p), sha256: hash(p) })),
  packet: { path: path.resolve(output), sha256: hash(output) },
  noFreshStudentBlindClaim: true, newManualQuestions: 0, dbWrites: 0 }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ actualDrafts: drafts.length, verified: drafts.length, matchesPreimplementationStudentProposal: true, public: 0 }));
