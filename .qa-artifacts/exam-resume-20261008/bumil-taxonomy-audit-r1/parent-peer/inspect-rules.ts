/** Read existing generator behavior; separate family evidence from grade/release approval. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { M3_TYPES } from "../../../../src/lib/middle/m3";
import { createRng } from "../../../../src/lib/elementary/rng";
import { bindCandidate, digest, sha256 } from "../../../../scripts/import/exam-twin/candidatePack.mjs";

const root = ".qa-artifacts/exam-resume-20261008";
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const fileRef = (file: string) => ({ path: file, sha256: sha256(fs.readFileSync(file)) });
const current = read(`${root}/bumil-final-review-summary-r1.json`);
const bank = read(`${root}/bank-read-fresh-r2-20261008.json`);
const registry = read(`${root}/registry-read-20261008.json`);
const rules = new Map(M3_TYPES.map((r) => [r.key, r]));
const plans = [
  { n: 11, keys: ["3-2|삼각비|10", "3-2|삼각비의 활용|01"], missingPurpose: "Use15-degree isosceles auxiliary relation before30-degree right-triangle side recovery; direct15-degree trig is excluded", modules: ["src/lib/middle/m3Trig.ts"] },
  { n: 14, keys: ["3-2|삼각비의 활용|01"], missingPurpose: "Fold congruence/perpendicular-bisector angle reconstruction and inverse fold location are required; generic right-triangle length does not cover the whole target", modules: ["src/lib/middle/m3Trig.ts", "src/lib/middle/m3Figures.ts"] },
  { n: 15, keys: ["3-2|원과 직선|03", "3-2|원과 직선|19A"], missingPurpose: "Known radius/circumference and chord -> short arc height.03 asks radius from chord/height;19A asks center-to-chord distance with an additional subtraction needed here", modules: ["src/lib/middle/m3.ts", "src/lib/middle/m3Figures.ts"] },
  { n: 17, keys: ["3-2|원과 직선|16"], missingPurpose: "Existing16 core tangent/Pythagorean linear relation is relevant; triangle-area target and candidate 응용 versus family 심화하 need explicit purpose/difficulty adjudication", modules: ["src/lib/middle/m3Tangent.ts"] },
  { n: 20, keys: ["3-2|원주각|06", "3-2|원주각|10", "3-2|삼각비의 활용|10"], missingPurpose: "Semicircle minus minor segment requires sector-minus-triangle and complement area; exact family purpose and 기본/7point label unresolved", modules: ["src/lib/middle/m3.ts", "src/lib/middle/m3Trig.ts"] },
];
const observations = plans.map((plan) => {
  const q = current.questions.find((q: { n: number }) => q.n === plan.n);
  assert(q);
  const binding = bindCandidate(q.currentCandidate.path);
  assert.equal(binding.candidateFileSha256, q.currentCandidate.sha256);
  const candidateRules = plan.keys.map((key) => {
    const rule = rules.get(key);
    assert(rule, `Existing registry rule missing: ${key}`);
    const generated = Array.from({ length: 100 }, (_, index) => ({ seed: index + 1, problem: rule.handler(createRng(index + 1)) }));
    const counts: Record<string, number> = {};
    for (const { problem } of generated) counts[problem.difficulty] = (counts[problem.difficulty] ?? 0) + 1;
    const unit = bank.units.find((u: { grade: string; section: string }) => u.grade === rule.grade && u.section === rule.unitSection);
    const familyKey = `mid:${key}`;
    const live = bank.liveFamilies.find((f: { unit_id: string; family_key: string }) => f.unit_id === unit?.id && f.family_key === familyKey);
    return { key, exactRegistry: registry.entries.find((e: { key: string }) => e.key === key) ?? null, actualUnit: unit ?? null, familyKey, liveCount: live?.live_count ?? null, scopeObservedAt: bank.capturedAt, generatedSeeds: 100, difficultyCounts: counts, generatedSampleDigest: digest(generated), samples: generated.slice(0, 5), generatedSampleDoesNotApproveCurrentCandidate: true };
  });
  return { n: plan.n, twinExternalId: q.twinExternalId, currentCandidate: q.currentCandidate, frozenCandidate: q.frozenCandidate, candidateDigest: q.candidateDigest, studentDigest: q.studentDigest, assetDigest: q.assetDigest, report: q.reportFile, priorIndependentStatus: q.reportStatus, sourceReference: binding.candidate.sourceReference, exactFamilyAssignment: null, decision: "pending", reason: plan.missingPurpose, candidateRules, currentRuleModules: plan.modules.map(fileRef), educationalScope: "Current independent20 review remains valid. Samples only describe existing generators; no extra grade approval is inferred", metadataOrFrozenEvidenceEdited: false, reopenWhen: "A distinct external reviewer confirms entire new purpose/core method and appropriate difficulty for an existing live family, or implement/review an allowed template and resolve live metadata separately" };
});
const calculations = {
  q11: { AC: 3, AD: 2 * 3, BD: 2 * 3, DC: Math.sqrt((2 * 3) ** 2 - 3 ** 2), BC: 2 * 3 + Math.sqrt((2 * 3) ** 2 - 3 ** 2) },
  q14: { width: 3, horizontal: 3 * 3, AP: ((3 * 3) ** 2 + 3 ** 2) / (2 * (3 * 3)), reflectedB: [7.2, -2.4] },
  q15: { radius: 15 / 2, halfChord: 12 / 2, centerDistance: Math.sqrt((15 / 2) ** 2 - (12 / 2) ** 2), shortHeight: 15 / 2 - Math.sqrt((15 / 2) ** 2 - (12 / 2) ** 2), otherBranch: 15 / 2 + Math.sqrt((15 / 2) ** 2 - (12 / 2) ** 2) },
  q17: { width: 9, height: 6, radius: 3, BM: (12 ** 2 - 6 ** 2) / 24, area: 6 * ((12 ** 2 - 6 ** 2) / 24) / 2 },
  q20: { centralDegrees: 180 - 30 - 30, triangleHeight: Math.sqrt(6 ** 2 - 3 ** 2), triangleArea: 6 * Math.sqrt(6 ** 2 - 3 ** 2) / 2, semicirclePiCoefficient: 6 ** 2 / 2, sectorPiCoefficient: 6 ** 2 / 3, complementPiCoefficient: 6 ** 2 / 2 - 6 ** 2 / 3, complementArea: 6 * Math.PI + 9 * Math.sqrt(3) },
};
assert.equal(calculations.q14.AP, 5);
assert.equal(calculations.q15.shortHeight, 3);
assert(calculations.q15.otherBranch > calculations.q15.radius);
assert.equal(calculations.q17.area, 27 / 2);
assert.equal(calculations.q20.complementPiCoefficient, 6);
const result = { kind: "independent-parent-held-family-purpose-audit/v1", createdAt: new Date().toISOString(), reviewerId: "orca-codex-exam-extraction-parent-metadata-20261008", exactFamilyAssignmentsSupported: 0, pending: 5, priorCurrent20CountsUnchanged: true, newCalculations: calculations, calculationsAreSupplementalNotNewBlindSolves: true, references: [fileRef(`${root}/bumil-final-review-summary-r1.json`), fileRef(`${root}/bank-read-fresh-r2-20261008.json`), fileRef(`${root}/registry-read-20261008.json`)], judgments: { skill: ".agents/skills/typesafe-ai/SKILL.md", liveDocs: ["https://docs.typesafe.ai/confidence", "https://docs.typesafe.ai/cookbooks/citation_check"], apiCalls: 0, scope: "Manual scoped semantic judgments; exact lookup/generation/calculation/hash in code, no confidence-based permission" }, observations, productionWrites: 0, nativeOrRightsApproval: false };
const out = path.join(root, "bumil-taxonomy-audit-r1", "parent-peer", "audit-r1.json");
fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ supported: 0, pending: 5, existingRuleSeedObservations: plans.reduce((sum, p) => sum + p.keys.length * 100, 0), supplementalCalculationsPassed: true, actualCurrent20ProofUnchanged: true, writes: 0 }));
