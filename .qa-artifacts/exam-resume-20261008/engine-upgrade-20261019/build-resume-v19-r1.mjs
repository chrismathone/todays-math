import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { bindCandidate, readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/', engine = base + 'engine-upgrade-20261019/';
const ref = path => ({path, sha256: sha256(fs.readFileSync(path))});
const write = (path, value) => fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
const createdAt = new Date().toISOString();
const current = readJson(base + 'current-authored-batches-v18.json');
const candidates = current.groups.flatMap(g => g.candidates);
assert.equal(candidates.length, 115);
assert.equal(new Set(candidates.map(c => c.twinExternalId)).size, 115);
for (const c of candidates) {
  const bound = bindCandidate(c.candidate.path);
  assert.equal(bound.candidateFileSha256, c.candidate.sha256, c.twinExternalId);
  for (const k of ['studentDigest', 'assetDigest', 'candidateDigest']) assert.equal(bound[k], c[k], c.twinExternalId + ':' + k);
}
const validation = readJson(engine + 'grade-gate-validation-r1.json');
assert(validation.sourceUnchanged && validation.realMiddleRenderEnabled);
for (const [path, digest] of Object.entries(validation.before)) assert.equal(sha256(fs.readFileSync(path)), digest, path);
const snapshot = readJson(engine + 'catalog-grade-snapshot-r1.json');
assert.equal(snapshot.registeredAuthored, 30); assert.equal(snapshot.selectableAuthored, 29);
const runs = ['vitest-integration-r7.json', 'grade-gate-tests-r1.json'];
const latest = new Map();
for (const file of runs) for (const r of readJson(engine + file).testResults) latest.set(r.name, r);
const tests = [...latest.values()].flatMap(r => r.assertionResults);
assert(!tests.some(t => t.status === 'failed'));
const vitest = {files: latest.size, passed: tests.filter(t => t.status === 'passed').length,
  skipped: tests.filter(t => t.status === 'skipped').length, failed:0, latestPerFileRuns:runs.map(f=>ref(engine+f)),
  scope:'Latest per-file composite, not a claim of a single all-files rerun. Current 18 exam-study files were rerun together with real middle renders.',
  previousSixSkipReason:'MIDDLE_RENDER was not 1 in examStudyMiddleFigures.test.ts; not a database or extension prerequisite. All six actually executed and passed in grade-gate-r1.'};
assert.equal(vitest.files, 63); assert.equal(vitest.passed, 967); assert.equal(vitest.skipped, 0);
const previous = readJson(base + 'engine-upgrades-progress-r10.json');
const codePaths = [...new Set([...previous.code.map(c=>c.path), ...Object.keys(validation.before).filter(p=>p.startsWith('src/lib/')),
  'src/contracts/examStudy.contract.ts','src/lib/examStudyAccess.ts','src/lib/examStudyRoutes.ts','src/lib/accountRouteAccess.ts'])];
const code = codePaths.map(p => ({...ref(p), normalizedLfSourceSha256:sha256(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n'))}));
const indexPath = base + 'current-authored-batches-v19.json';
write(indexPath, {...current, version:19, createdAt, previous:ref(base+'current-authored-batches-v18.json'),
  sameCurrent115IdsAndAuthorBytes:true, engineValidation:ref(engine+'grade-gate-validation-r1.json')});
const enginePath = base + 'engine-upgrades-progress-r11.json';
const closure = readJson(base+'status-ledger-v18.json').latestClosure;
const sourceAccess = {nDriveAvailable:fs.existsSync('N:/개인/기출'), checkedAt:createdAt,
  scope:'Current process access only; no network remap or original changes.', earlierConnectedReceipt:previous.sourceAccess,
  allSourcesExtracted:false};
write(enginePath, {...previous, kind:'exam-engine-upgrades-progress/v11',version:11,createdAt,
  previous:ref(base+'engine-upgrades-progress-r10.json'), currentCandidateIndex:ref(indexPath),code,
  checkpointDelta:'Integrate latest main13 engine/access commits; retain count correction; exclude actual M1 symbolic-sum method before offering, allocation or output. No new manual candidates or approvals.',
  integratedMainEngine:{...previous.integratedMainEngine,commit:cp.execFileSync('git',['rev-parse','4b3dee287'],{encoding:'utf8'}).trim(),
    authoredFamilies:30,selectableAuthoredFamilies:29,reviewedProfiles:5,requirementIds:50,
    remainingUniqueDemands:1,remainingSchoolCourseDemands:1,remainingReason:'M1 symbolic-sum required out-of-grade operations, not mathematical arithmetic failure.',
    catalogSnapshot:ref(engine+'catalog-grade-snapshot-r1.json'),
    evidence:ref('docs/reports/math-exam-engine-completion-20261019/README.md'),
    allStudentSurfaceCurriculumCertified:false,wholeSchoolOrCorpusCoverage:false},
  items:[...previous.items.map(i=>i.id==='U33'?{...i,change:'Latest main30 authored definitions,29 selectable after M1 method exclusion; five selected profiles,Daeryun M1 partial10/11,other4 selected scopes complete. No whole-exam or universal curriculum certification.'}:i.id==='U34'?{...i,mainComplement:'Preserve main studyChoiceBounds finite printed-domain guard alongside root deriveFormats correction.'}:i),
    {id:'U37',area:'Actual-method curriculum eligibility before generation and output',productionStatus:'implemented-on-feature-independently-audited',
      change:'Retain mathematical proofs for14 variants, but exclude M1 symbolic-sum requiring later-grade polynomial expansion. Catalog/coverage/factory/quotas/output/renamed requirement flags respect hold; manifest policy invalidates previous recipes. No unrelated-family grade approval.',
      primary:ref(base+'curriculum-reference-coprime-symbolic-sum-20261019-r1/curriculum-decision.json'),
      audit:ref(base+'engine-curriculum-gate-independent-20261019-r1/audit-report.json')}],
  validations:{...previous.validations,vitest,
    currentGradePolicy:ref(engine+'grade-gate-validation-r1.json'),
    currentGradeTypes:ref(engine+'grade-gate-types-r1.log'), currentGradeLint:ref(engine+'grade-gate-eslint-r1.log'),
    actualGradeIndependentAudit:ref(base+'engine-curriculum-gate-independent-20261019-r1/audit-report.json'),
    latestMainIntegration:ref(engine+'integration-source-bindings-r7.json'),
    actualMiddleFigureTests:6,middleFigureTuples:56,advancedFigureTuples:117,
    limitation:'Tuple SVG proofs are engine tests, not added manual candidate figures. Internal trusted factory metadata can lie; HTTP clients cannot inject families. A null specific hold is not universal grade approval.',
    fullAppBuildValidated:false},
  sourceAccess,latestClosure:closure,newAuthoredProblems:0,newImagegenRasters:0,
  wholeEngineComplete:false,wholeExtractionComplete:false,operationalLoads:0,dbWrites:0,deployed:false});
const oldLedger=readJson(base+'status-ledger-v18.json'), ledgerPath=base+'status-ledger-v19.json';
write(ledgerPath,{...oldLedger,kind:'execution-status-ledger/v19',version:19,createdAt,
  previousLedger:ref(base+'status-ledger-v18.json'),currentIndex:ref(indexPath),engine:ref(enginePath),
  currentSourceAccess:sourceAccess,wholeGoalComplete:false});
write(base+'continuation-index-v19.json',{...readJson(base+'continuation-index-v18.json'),kind:'exam-continuation-index/v19',version:19,createdAt,
  previousIndex:ref(base+'continuation-index-v18.json'),statusLedger:ref(ledgerPath),currentCandidateIndex:ref(indexPath),engine:ref(enginePath),
  progressReport:'docs/planning/tracks/reports/exam-twin-checkpoint-v19-20261019.md',sourceAccess,latestClosure:closure,
  nextActions:['Continue actual wheel/doubling seven-surface independent grade audits in existing Codex checkout.',
    'Implement native within-grade inverse-target templates with deterministic existence/uniqueness/figure/solution checks.',
    'When N access returns, continue original2025+ extraction and component correspondence;634 parser parent observations are not full extraction or unique certified sources.',
    'Retain q18/source/family/custody/rights/similarity/native holds; new metadata or author bytes require a new bound review.',
    'Checkpoint feature changes; immediately fetch target and main, preserve integration and rerun affected checks before fast-forward pushes.'],wholeGoalComplete:false});
console.log(JSON.stringify({counts:current.counts,vitest,sourceAccess:{nDriveAvailable:sourceAccess.nDriveAvailable},authoredTemplates:30,selectableTemplates:29,dbWrites:0}));
