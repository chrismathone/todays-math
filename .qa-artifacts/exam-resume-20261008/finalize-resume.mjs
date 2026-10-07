import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = ".qa-artifacts/exam-resume-20261008";
const load = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const writeNew = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const packPath = `${root}/bumil-twin-v2/prepared/preparation.json`;
const pack = load(packPath);
const curriculum = load(`${root}/curriculum-evidence.json`);
const contracts = load(`${root}/contract-audit.json`);
const next = load(`${root}/next-five-audit.json`);
const bank = load(`${root}/bank-read-20261008.json`);
const index = load(`${root}/continuation-index.json`);
assert.equal(hash(index.manifestPath), index.manifestSha256);
assert.equal(pack.questions.length, 21);
assert.equal(curriculum.question_mappings.length, 21);

const metadata = {
  version: 2, kind: "source-bound-curriculum-and-taxonomy-proposals-not-approval",
  batchId: pack.batchId, preparationSha256: hash(packPath),
  bankEvidence: { path: `${root}/bank-read-20261008.json`, sha256: hash(`${root}/bank-read-20261008.json`), capturedAt: bank.capturedAt, predicate: bank.livePredicate },
  officialEvidence: { path: `${root}/curriculum-evidence.json`, sha256: hash(`${root}/curriculum-evidence.json`), usedStandardCount: curriculum.verification.used_standard_count, standardApprovalScope: "texts-found-and-crosschecked; item mapping remains expert proposal", amendmentChain: "post-2020 full audit not claimed" },
  sourceIdentityReview: pack.questions[0].metadata.sourceIdentityReview,
  preservedVersions: [{ path: `${root}/bumil-twin-v1/prepared/preparation.json`, status: "superseded-plan-not-authored-not-approved", limitation: "Q11 plan equality was AB=BD; corrected to AD=BD in v2" }],
  questions: pack.questions.map((q) => {
    const mapping = curriculum.question_mappings.find((m) => m.question_number === q.n);
    assert.equal(q.sourceReference.sourceContentSha256, mapping.source_content_sha256_utf8);
    return { n: q.n, twinExternalId: q.twinExternalId, sourceExternalId: q.sourceReference.externalId, sourceContentSha256: q.sourceReference.sourceContentSha256,
      source: "transformed", originProblemId: null, nativeProvenance: "blocked-until-exam-twin-read-contract-support",
      actualUnitProposal: q.metadata.assignment, standards: q.metadata.achievementStandardRefs,
      sourceMethodProposal: mapping.proposed_middle3_method,
      changedQuestionMethodPlan: q.design.solutionPlan,
      transformedRepresentationAndTarget: { modes: q.design.modes, delta: q.design.delta, constraints: q.design.checks },
      specificGradeHold: mapping.specific_gate_notes,
      finalStatuses: { mathematicalCorrectness: "not-run", gradeCurriculum: "pending", metadata: "pending", rights: "pending", similarity: "pending", loadable: false },
    };
  }),
};
writeNew(`${root}/bumil-twin-v2/metadata-review.json`, metadata);

const stageDefinitions = [
  ["resume-setup", "complete", "latest directions, scoped read, source/copy hashes, first21/next5 plans, contracts/official evidence and local reviewable scripts"],
  ["source-extraction-content-dedup", "incomplete", "pilot historical comparison retained; next5 read-only source reuse audit; remaining inventory unreviewed"],
  ["new-twin-authoring", "planned", "21 source-bound structural/context/representation/inverse plans; no authored candidates"],
  ["new-vector-and-imagegen-assets", "planned", "all diagrams recreated later; built-in imagegen first for q10/q19; reference crops never final"],
  ["new-solve-independent-verification", "not-started", "only changed final body/facts/new figures form solver input; no old result reuse"],
  ["final-grade-metadata-rights-review", "pending", "16 taxonomy proposals/5 held; all21 new-candidate grade reviews pending; source provenance holds"],
  ["authored-twin-dry-run-contract", "not-implemented", "separate candidate/digest/asset/review contract needed; current script checks preparation only"],
  ["production-load-unlock-deploy", "outside-setup-authorization", "no production actions; protect82/three ledgers/permanent exclusion"],
  ["post-extraction-engine-upgrades", "not-implemented", "27 code-targeted candidates plus future corpus findings; actual implementation/tests required"],
];
const ledger = {
  version: 2, createdAt: new Date().toISOString(), branch: "chrismathone/exam-extraction-resume-20261008",
  latestDirective: "docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-1.md",
  latestDirectiveSha256: hash("docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-1.md"),
  scope: "resume-setup-only", baselineCommit: "6b14920ed", latestPackage: packPath,
  historicalInventory: { date: "2026-10-03", jobs: 1715, ready: 1388, hold: 323, registeredExams: 4, registeredRows: 82, completedPairsInReady: 643, notSelectedPairsInReady: 745, manifestPath: index.manifestPath, sha256: index.manifestSha256 },
  counts: { historicalSourceVerifications: 21, plannedTwins: 21, authoredTwins: 0, verifiedTwins: 0, loadableTwins: 0, taxonomyProposed: 16, taxonomyHeld: [10, 11, 14, 18, 20], finalGradePending: 21, imagegenImagesGenerated: 0, engineUpgradeCandidates: contracts.upgradeCandidates.length, engineUpgradesImplemented: 0 },
  stages: stageDefinitions.map(([id, status, evidence]) => ({ id, status, evidence })),
  workers: [
    { name: "exam-twin-contracts-20261008", branch: "chrismathone/exam-twin-contracts-20261008", commit: "5a56d5ba72353db0741b2d4435b2974a0f51eb52", status: "integrated-into-feature-branch" },
    { name: "exam-twin-next-five-20261008", branch: "chrismathone/exam-twin-next-five-20261008", commit: "e55809117", sourceAuditCommit: "1cdfe02b5", status: "integrated-into-feature-branch" },
    { name: "exam-twin-curriculum-20261008", branch: "chrismathone/exam-twin-curriculum-20261008", commit: "1b590efbc", status: "integrated-into-feature-branch" },
  ],
  currentReadScope: { capturedAt: bank.capturedAt, readOnly: bank.transactionReadOnly, unitCount: bank.units.length, eligibleFamilyCount: bank.liveFamilies.length, registryCount: 299, protectedRows: 82, unlocked: 0, correctionsMismatch: 0, globallyDeduplicated: false },
  nextFive: { ...next.summary, sourceReport: "docs/planning/tracks/reports/exam-twin-next-five-20261008.md", firstProductionGroup: "none-until-gates", preparationPriority: ["경구중", "경산중", "경암중", "경상중"], sourceIdentityYearHold: ["경신중"] },
  upgradeImplementationLedger: contracts.upgradeCandidates.map((u) => ({ id: u.id, title: u.title, status: "not-implemented", basis: u.basis, codeTargets: u.codeTargets, validationRequired: u.concreteValidation, implementationDependency: "reviewed extraction evidence plus mandatory curriculum/presentation/asset/review contract; no report-only completion" })),
  validation: { newPreparationTestsPassed: 9, existingLocalFilesPassed: 2, existingLocalTestsPassed: 36, workerExistingTests: contracts.verification, claimsNewTwinMathVerified: false, claimsImageEngineImplemented: false },
  prohibitionsRespected: ["no DB apply/write/delete/reload/unlock/deploy", "no source/old artifact writes", "no npm install/prisma generate", "no main or other active session file writes", "no paid APIs or imagegen CLI fallback", "no push"],
  worktreeRetention: "Workers clean/finished, preserved with branches and ignored source evidence because not merged into main; do not remove unmerged worktrees.",
};
writeNew(`${root}/status-ledger.json`, ledger);
const v2 = {
  version: 2, createdAt: ledger.createdAt, supersedes: `${root}/continuation-index.json` + " historical scope/direction; original artifact evidence retained",
  latestDirective: ledger.latestDirective, latestDirectiveSha256: ledger.latestDirectiveSha256,
  historicalOwnerDirection: index.historicalOwnerDirection,
  currentOwnerDirection: index.finalOwnerDirection,
  report: "docs/planning/tracks/reports/exam-twin-resume-ready-20261008.md",
  statusLedger: `${root}/status-ledger.json`, latestPackage: packPath,
  metadataReview: `${root}/bumil-twin-v2/metadata-review.json`,
  sourceIndex: `${root}/continuation-index.json`, sourceManifestSha256: index.manifestSha256,
  historicalInventory: ledger.historicalInventory, scope: ledger.scope, counts: ledger.counts,
  bankRead: `${root}/bank-read-20261008.json`, registryRead: `${root}/registry-read-20261008.json`,
  contractAudit: `${root}/contract-audit.json`, nextFiveAudit: `${root}/next-five-audit.json`, officialCurriculum: `${root}/curriculum-evidence.json`,
  nextActions: [
    "Resolve source/year/anonymized school and prohibited-ratio/complexity holds; retain current source metadata as nominal, never invent certainty.",
    "Author q2/q3/q15/q21 from v2 plans, separately review same method/difficulty/distinct natural presentation and whole-grade/curriculum suitability.",
    "Resolve taxonomy holds10/11/14/18/20; q7 grade-risk review precedes authoring.",
    "Author built-in-imagegen q10/q19 assets and exact math overlays; vector source for every diagram is new.",
    "Freeze changed content/facts/spec/assets and independent solver/verifier packs before new answers/solutions are accepted.",
    "Implement authored-twin contract/dry-run/provenance compatibility; current preparation script is not a loader.",
    "Continue next5 source verification then remaining2025+ queue; record exclusions and unselected pair routing.",
    "After reviewed extraction, implement and verify all useful feasible engine improvements tracked U01-U27 plus corpus findings.",
  ],
};
writeNew(`${root}/continuation-index-v2.json`, v2);
index.latestContinuation = { ...index.latestContinuation, package: `${root}/bumil-twin-v2/prepared`, metadataReview: v2.metadataReview, sourceIdentityReview: metadata.sourceIdentityReview, gradeRiskQuestions: [7, 11, 14, 19, 20], createdPreparationVersions: [1, 2] };
fs.writeFileSync(`${root}/continuation-index.json`, JSON.stringify(index, null, 2) + "\n");

const reportPath = v2.report;
const text = fs.readFileSync(reportPath, "utf8");
const marker = "아래 표는 작성 지시이며 새 문항 완성물이 아니다. 자세한 수치 제안·검산 조건·Unit UUID/live family와 변경 전 관찰은 계획 JSON에서 함께 확인한다.";
const modes = { structure: "구조", context: "소재", representation: "표현", "inverse-target": "역추론" };
const figure = { none: "없음", engine: "기존 엔진", "imagegen-plus-engine": "내장 imagegen+엔진" };
const table = ["| 번호 | 공유 개념/풀이 | 전환·새 구성 | 그림·새 풀이 검토 |", "|---|---|---|---|", ...pack.questions.map((q) => `| ${q.n} | ${q.sourceReference.sharedConceptProcedure} | ${q.design.modes.map((m) => modes[m]).join("·")}: ${q.design.newPresentation} | ${figure[q.figure.method]}; ${q.design.solutionPlan} |`)].join("\n");
assert(text.includes(marker));
fs.writeFileSync(reportPath, text.split(marker)[0] + marker + "\n\n" + table + "\n");
fs.writeFileSync(`${root}/continuation-prompt-v2.txt`, [
  "기출 쌍둥이/생성엔진 업그레이드 재개: 최신 addendum-1, reports/exam-twin-resume-ready-20261008.md와 continuation-index-v2.json/status-ledger.json부터 읽는다.",
  "숫자/이름만 바꾸지 않는다. 같은 개념/풀이 원리·목표 난이도를 유지하며 구조/소재/표현/질문 대상(역추론)을 바꾼다. 학년/적용 교육과정이 최우선 필수 관문: 위반 제외, 불명 보류. 본문/보기/그림/표기/답/학생 풀이/선수 전체 검토.",
  "최신 첫배치는 bumil-twin-v2. 이전v1은 미작성 계획으로 보존했고11번 AD=BD 관계를 v2에 수정했다. 계획21/작성0/새검증0/적재가능0. 단원제안16/보류5(10,11,14,18,20); 새학년검수21보류. q7은 삼각비 관계 평가 금지 해석을 먼저 검토한다.",
  "DB 읽기(00:57KST): READ ONLY repeatable snapshot, 중3Unit22/live-family302/registry299, 보호82행 잠금과 두보정 일치. 전량/내용 중복검사는 미완료. 경산여19 영구제외와 세원장 유지. node_modules정션: install/generate금지. 운영쓰기/apply/삭제/재적재/잠금해제/배포금지; main/다른세션 직접쓰기금지.",
  "범일중 선정 HWP/PDF 해시 유지, 옛196차 사본 지금불가. 머리말2025/바닥글26년 및 BI중 익명학교 관계는 출처보류. 다음5편106원문 참고·초안48·sol_ai43·그림71을 다시연결했지만 전체HWP/PDF 동등성은미승인; 경신2025/2024 연도/페이지 대응보류·배점차확인필요.",
  "우리 수준으로 새 답/해설/모든도형을 제작하고 새본문+새그림 기준 독립풀이/검산한다. 기존21검산을 재사용하지 않는다. 학교명은 학생노출내용에서 일관치환하고 실제출처는내부보존. 코드곤란이미지는 imagegen스킬/view_image/내장도구. 운영에서스킬직접호출가정금지, 검수asset/template+math facts부터지원. 유료API/CLI전환금지.",
  "prepare-twin-resume.mjs는 계획/해시/보류검사만 한다. 완성후보dry-run/loader 미구현. transformed/null-origin이 현행교재로오표시되는native-provenance갭과 새이미지serializer/배지/필터갭을 해결전적재금지. 원문FK를 지어내지 않는다.",
  "추출후27개 엔진 개선후보+새분석근거를 코드/테스트/렌더/검색까지구현하며 보고서만으로완료금지. 현재엔진개선구현0. TypeSafe AI분류/검수/라우팅은프로젝트skill+live docs, 계산/해시는코드. 권리/유사성은독립상태, 변형만으로허가단정금지.",
  "Orca Codex독립워커3개의커밋은현재feature브랜치에통합. main에는미통합이므로워크트리/브랜치/교육과정raw근거보존. 푸시전fetch/통합/관련검증; 준비작업은로컬커밋만.",
].join("\n\n") + "\n", { flag: "wx" });
console.log(JSON.stringify({ consolidated: true, preparationVersions: [1, 2], planned: 21, authored: 0, verified: 0, loadable: 0, upgradeCandidates: contracts.upgradeCandidates.length }));
