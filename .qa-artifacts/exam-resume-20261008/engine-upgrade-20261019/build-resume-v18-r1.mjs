import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const engine = base + 'engine-upgrade-20261019/';
const ref = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const write = (path, x) => fs.writeFileSync(path, JSON.stringify(x, null, 2) + '\n', { flag:'wx', encoding:'utf8' });
const createdAt = new Date().toISOString();
const old = readJson(base + 'current-authored-batches-v17.json');
const all = old.groups.flatMap((g) => g.candidates);
assert.equal(all.length, 115);
for (const c of all) {
  const b = bindCandidate(c.candidate.path);
  assert.equal(b.candidateFileSha256, c.candidate.sha256);
  for (const key of ['studentDigest','assetDigest','candidateDigest']) assert.equal(b[key], c[key]);
}
assert.equal(old.counts.contentReviewPassed,15);
assert.equal(old.counts.contentReviewHeld,99);
assert.equal(old.counts.independentMathReviewed,114);
assert.equal(old.counts.loadable,0);
const validation = readJson(engine + 'count-domain-validation-r2.json');
assert(validation.unchangedDuringEveryCommand && validation.typecheckPassed && validation.eslintPassed);
for (const [p,h] of Object.entries(validation.before)) assert.equal(sha256(fs.readFileSync(p)), h, p);
const latest = new Map();
const runFiles = ['vitest-integration-r4.json','vitest-integration-r5.json','vitest-integration-r6.json',
  'count-choice-regressions-r1.json','count-domain-tests-r2.json'];
for (const f of runFiles) for (const row of readJson(engine + f).testResults) latest.set(row.name,row);
const assertions = [...latest.values()].flatMap((r) => r.assertionResults);
assert(!assertions.some((r) => r.status === 'failed'));
const indexPath = base + 'current-authored-batches-v18.json';
write(indexPath, { ...old, version:18, createdAt, previous:ref(base + 'current-authored-batches-v17.json'),
  counts:old.counts, sameCurrent115IdsAndAuthorBytes:true, engineValidation:ref(engine + 'count-domain-validation-r2.json') });
const priorEngine = readJson(base + 'engine-upgrades-progress-r9.json');
const enginePath = base + 'engine-upgrades-progress-r10.json';
write(enginePath, { ...priorEngine, kind:'exam-engine-upgrades-progress/v10', version:10, createdAt,
  previous:ref(base + 'engine-upgrades-progress-r9.json'), currentCandidateIndex:ref(indexPath), newAuthoredProblems:0,
  checkpointDelta:'Correct actual runtime count derivation after independent F1/F2 audit. Preserve original evidence; no new problems, solutions, classification or rights approvals.',
  code:priorEngine.code.map((c) => ({ ...ref(c.path), normalizedLfSourceSha256:sha256(fs.readFileSync(c.path,'utf8').replaceAll('\r\n','\n')) })),
  items:priorEngine.items.map((i) => i.id === 'U34' ? { ...i, productionStatus:'implemented-bounded-production-code-independently-rechecked',
    correction:'Restore literal opening math delimiter damaged by String.replace replacement semantics. Decline empty/ellipsis/whitespace-duplicate lists and block incomplete recognized questions before fallback. Direct64 runtime samples and independent78 boundary/25 refusal controls pass.' } : i),
  validations:{ ...priorEngine.validations,
    vitest:{files:latest.size,passed:assertions.filter((r)=>r.status==='passed').length,
      skipped:assertions.filter((r)=>r.status==='skipped').length,failed:0,latestPerFileRuns:runFiles.map((f)=>ref(engine+f))},
    currentCountCode:ref(engine+'count-domain-validation-r2.json'), directRuntime:ref(engine+'count-runtime-matrix-r2.json'),
    independentGateAudit:ref(base+'engine-gate-independent-audit-20261019-r1/audit-findings.json'),
    independentCountFix:ref(base+'engine-gate-independent-audit-20261019-r2/recheck-results.json'),
    limitations:'Earlier test passes preceded a formatting restoration that changed dollar delimiters. Those runs do not certify the later source bytes. New targeted tests, CLI matrix, types/lint and independent controls bind unchanged before/after hashes. Existing unaffected results remain per-file history.' },
  correctedImplementationFailure:{publishedCheckpoint:'e6844b5f189aefa6cba0d9ff5abe3bbfe1670c2e', historyRewritten:false,
    cause:'String.replace replacement text interprets $$ specially; formatting restoration changed executable template text after prior tests loaded.',
    beforeAudit:ref(base+'engine-gate-independent-audit-20261019-r1/audit-findings.json'),
    afterAudit:ref(base+'engine-gate-independent-audit-20261019-r2/recheck-results.json'),
    codeDuringTestsUnchanged:true, newSemanticApprovals:0},
  wholeEngineComplete:false, wholeExtractionComplete:false, operationalLoads:0, dbWrites:0 });
const priorLedger = readJson(base+'status-ledger-v17.json');
const ledgerPath = base+'status-ledger-v18.json';
write(ledgerPath,{...priorLedger,kind:'execution-status-ledger/v18',version:18,createdAt,
  previousLedger:ref(base+'status-ledger-v17.json'),currentIndex:ref(indexPath),engine:ref(enginePath),counts:old.counts,
  wholeGoalComplete:false});
write(base+'continuation-index-v18.json',{...readJson(base+'continuation-index-v17.json'),kind:'exam-continuation-index/v18',version:18,createdAt,
  previousIndex:ref(base+'continuation-index-v17.json'),statusLedger:ref(ledgerPath),currentCandidateIndex:ref(indexPath),engine:ref(enginePath),
  progressReport:'docs/planning/tracks/reports/exam-twin-checkpoint-v18-20261019.md',counts:old.counts,
  wholeGoalComplete:false});
console.log(JSON.stringify({counts:old.counts,latestFiles:latest.size,latestPassed:assertions.filter((r)=>r.status==='passed').length,
  skipped:assertions.filter((r)=>r.status==='skipped').length, directRuntimePassed:64, sharedWrites:0}));
