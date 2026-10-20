import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base='.qa-artifacts/exam-resume-20261008/';
const engine=base+'engine-upgrade-20261019/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const bind=p=>({path:p,sha256:sha(fs.readFileSync(p))});
const indexPath=base+'current-authored-batches-v50.json';
const index=read(indexPath);
const selected=index.groups.flatMap(g=>g.candidates.map(c=>{
  assert.equal(bind(c.candidate.path).sha256,c.candidate.sha256);
  return {twinExternalId:c.twinExternalId,selection:'canonical-v50',candidate:c.candidate};
}));
assert.equal(selected.length,174);
const drafts=[['4','07'],['4','08'],['5','09'],['5','10']].map(([g,q])=>{
  const p=base+`gachang-group${g}-authoring-20261020-r2/gachang/q${q}.json`;
  const data=read(p);
  return {twinExternalId:data.twinExternalId,selection:'unselected-draft-not-approved',candidate:bind(p)};
});
const excluded=[...selected,...drafts].sort((a,b)=>a.twinExternalId.localeCompare(b.twinExternalId,'en'));
assert.equal(new Set(excluded.map(c=>c.twinExternalId)).size,178);
const target='docs/planning/tracks/reports/exam-engine-ownership-20261020/excluded-twins.json';
assert(!fs.existsSync(target));
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify({kind:'exam-engine-owned-twins-excluded-from-bank-rebuild/v1',
  createdAt:new Date().toISOString(),ownerBranch:'chrismathone/exam-extraction-resume-20261008',
  direction:'Exclude this session\'s twin question lineage from the other computer\'s shared-DB rebuild; engine code only here.',
  canonicalIndex:bind(indexPath),canonicalSelected:174,unselectedDrafts:4,totalIdentifiers:178,
  approvedForLoad:0,dbWrites:0,freshDbRead:false,completeDbIdentityMapping:false,
  prefixHint:'exam-twin-',prefixHintIsNotACompleteDbPredicate:true,
  historicalVersionsAndStoredLineageRequireSeparateExclusion:true,
  missingFromThisListDoesNotAuthorizeAnyDbMutation:true,excluded},null,2)+'\n',{flag:'wx'});
const transports=['m3-method-grade-gate-prechange-transport-r1.json',
  'm3-method-grade-gate-current-code-transport-r2.json','m3-method-grade-gate-postchange-transport-r2.json'];
const refs=transports.flatMap(n=>[bind(engine+n),...read(engine+n).files]);
const unique=[...new Map(refs.map(r=>[r.path,r])).values()];
for(const r of unique){assert.equal(bind(r.path).sha256,r.sha256,r.path);assert(!/\.local\.|\.html$/.test(r.path));}
const prod=['src/lib/examStudy/curriculumEligibility.ts',
  'src/lib/examStudy/families/middle/inverseCoefficient.ts','src/__tests__/unit/examStudyM3MethodGradeGates.test.ts'];
const scope=read(base+'m3-method-grade-gate-code-audit-20261020-r2/provided-scope.json');
// Scope records a different field shape from transport records; inspect code refs directly.
const copied=unique.filter(r=>r.path.includes('/provided-code/'));
for(const p of prod){const matches=copied.filter(r=>r.path.endsWith('/'+path.basename(p)));assert.equal(matches.length,1,p);assert.equal(bind(p).sha256,matches[0].sha256,p);}
const validationFiles=['u63-post-hardening-r1.json','u63-eslint-r1.json','u63-types-r1.json',
  'vitest-u63-post-hardening-r1.mts','check-u63-types-r1.mjs'].map(n=>engine+n);
const tests=read(engine+'u63-post-hardening-r1.json');
assert.equal(tests.numPassedTests,193);assert.equal(tests.numFailedTests,0);
assert.equal(read(engine+'u63-types-r1.json').rootErrors,0);
const files=[...unique.map(r=>r.path),...validationFiles,target,...prod,
  'docs/planning/tracks/brief-exam-engine-ownership-20261020.md',
  'docs/planning/tracks/brief-exam-extraction-resume-20261008.md',
  'docs/planning/tracks/reports/exam-engine-grade-method-hardening-20261020.md',
  engine+'prepare-engine-ownership-checkpoint-r1.mjs'];
const receipt=engine+'engine-ownership-checkpoint-preparation-r1.json';
assert(!fs.existsSync(receipt));
fs.writeFileSync(receipt,JSON.stringify({utc:new Date().toISOString(),excludedTwinIds:178,
  code:prod.map(bind),evidence:unique,priorParentTests:193,
  scopeKind:scope.kind??null,dbWrites:0,files:[...new Set([...files,receipt])]},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({excluded:178,canonical:174,drafts:4,evidenceBindings:unique.length,stageFiles:new Set(files).size+1,dbWrites:0}));
