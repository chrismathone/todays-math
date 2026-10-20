import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='.qa-artifacts/exam-resume-20261008/',e=base+'engine-upgrade-20261019/';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bind=p=>({path:p,sha256:sha(fs.readFileSync(p))});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,obj)=>fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});
const head=git('rev-parse','HEAD'),main=git('rev-parse','origin/main');
git('merge-base','--is-ancestor',main,head);
const target=git('rev-parse','origin/chrismathone/exam-extraction-resume-20261008');
git('merge-base','--is-ancestor',target,head);
const tests=read(e+'u63-post-main-r2.json');
assert.equal(tests.success,true);assert.equal(tests.numFailedTests,0);
assert.equal(tests.testResults.length,12);assert(tests.numPassedTests>=193);
const prep=read(e+'engine-ownership-checkpoint-preparation-r1.json');
for(const r of prep.code)assert.equal(bind(r.path).sha256,r.sha256);
const previous=read(base+'engine-upgrades-progress-r42.json');
const production=prep.code.filter(r=>r.path.startsWith('src/lib/'));
const allPaths=[...new Set([...previous.code.map(r=>r.path),...prep.code.map(r=>r.path)])];
const code=allPaths.map(bind);assert.equal(code.length,106);
const independent=bind(base+'m3-method-grade-gate-code-audit-20261020-r2/own-postchange-report-r2.json');
assert.equal(independent.sha256,'4163fde1b8e5ef3e8e73372dc958771d00753a83dcc8f4376a1c8c1950c74d2d');
const policyDoc='docs/planning/tracks/brief-exam-engine-ownership-20261020.md';
const exclusions='docs/planning/tracks/reports/exam-engine-ownership-20261020/excluded-twins.json';
assert.equal(read(exclusions).excluded.length,178);
const validationPath=e+'engine-ownership-post-main-validation-r1.json';
const changedMain=git('diff','--name-only','aa904fd6e5dc7eda4ad1c3dc2bd29ee3335ac323',main)
  .split('\n').filter(p=>p.startsWith('src/')&&/\.(ts|tsx|css|json)$/.test(p));
const validation={utc:new Date().toISOString(),head,main,target,
  currentMainRelatedPassed:tests.numPassedTests,currentMainRelatedFailed:0,
  actualTestFiles:tests.testResults.length,tests:bind(e+'u63-post-main-r2.json'),
  code:[...new Map([...code,...changedMain.map(bind),bind(policyDoc),bind(exclusions)].map(r=>[r.path,r])).values()],
  independentReview:independent,dbWrites:0,fullAppBuildValidated:false,wholeBankAudited:false};
const report='docs/planning/tracks/reports/exam-engine-ownership-checkpoint-20261020.md';
const progress={...previous,kind:'exam-engine-upgrades-progress/v43',version:43,
  createdAt:new Date().toISOString(),previous:bind(base+'engine-upgrades-progress-r42.json'),report,
  latestUserDirection:'Engine code here; existing 118166-question audit/rebuild on the other computer. Other session does not change examStudy or named engine/render files and records defects only. Exclude this session twin lineage from shared-DB mutations.',
  ownership:bind(policyDoc),excludedTwinIds:bind(exclusions),code,
  items:[...previous.items,{id:'U63',area:'Four whole-M3-method grade gates before release/factories and neutral coefficient explanations',
    status:'implemented-parent-and-independent-passed-release-held',code:prep.code,
    parentPostMainTests:validation.tests,parentPostMainPassed:tests.numPassedTests,
    independentAudit:independent,independentAuditCommit:'2087e2dd1055c90940c6e3a7f4080eb7158ac1f9',
    replayRequests:860,gradeHardHolds:624,existingDegreeHardHolds:156,m3ReleaseHolds:80,
    extraControls:114,extraControlsAreNotNewQuestions:true,neutralExplanations:32,
    authorMathAnswerOrParameterChanges:0,dbWrites:0,publicReleaseApproved:false}],
  validations:{...previous.validations,latestEngineScope:bind(policyDoc),latestM3MethodHardening:independent,latestPostMain:validation.tests},
  currentCounts:{...previous.currentCounts},canonicalSelectionUnchanged:174,
  actualAuthoredIncludingUnselectedDrafts:178,additionalUnselectedAuthored:4,
  currentCountsDescribeCanonicalV50Only:true,canonicalIndex:bind(base+'current-authored-batches-v50.json'),
  upcomingWork:['Improve engine only; preserve existing issued/bank questions and the 178 owned twin identifiers.',
    'Inspect latest remote commits and the other computer\'s defect list before changing engine/render code.',
    'Validate engine conditions, answers, grade methods and figure/image asset reproducibility; no DB writes or deployment.'],
  pendingMethodGradeGateReview:null,pendingMethodGradeGateProductionChange:false,
  latestMainIntegration:{head,main,sourceConflictFiles:0,postIntegrationTests:validation.tests},
  checkpointDelta:'U63 actual code and ownership agreement; canonical174/173 unchanged, unselected4 kept separate. No new authoring, DB mutation, publication or release.',
  wholeEngineComplete:false,wholeExtractionComplete:false,operationalLoads:0,dbWrites:0,deployed:false};
const note=`# 엔진 담당 분리와 중3 방법 보완 체크포인트\n\n[최신 역할 분담](../brief-exam-engine-ownership-20261020.md)을 기록했다. 다른 컴퓨터의 기존 118,166문항 검수·재구축과 분리하고, 이 세션은 examStudy 및 명시된 엔진·렌더 코드의 개선을 담당한다. 다른 세션의 결함은 목록으로 받아 재현 후 수정한다. 현재 선택 174개와 미선택 초안 4개의 ID 178개를 DB 수정 제외 목록에 고정했다. 실제 DB 대응의 완전성이나 적재 승인을 뜻하지 않는다.\n\n[중3 방법 보완](exam-engine-grade-method-hardening-20261020.md)은 부모 193검사와 독립 검수 후 커밋했다. 최신 main \`${main.slice(0,9)}\`을 기능 브랜치에 충돌 없이 통합한 뒤 **${tests.testResults.length}파일·${tests.numPassedTests}검사 통과**를 다시 확인했다. 기존 중등/생성기 검사와 main의 초등 조사·blind 보완 대조를 포함한다. 다른 컴퓨터의 DB 갱신 커밋은 재실행하지 않았다. main의 학생 가이드 reader 변경도 보존했으며 공유 DB를 열지 않았다.\n\n정본은 v50의 선택174·수학/전체학년173·내용15통과/158보류·최종0을 유지한다. 실제 작성178과 미선택4를 분리한다. 엔진 코드106참조와 U63의 현행 근거를 엔진 원장 r43에 연결했다. 중간에 실패한 v51 정본 빌더의 사본은 그대로 남기며 이를 완료된 정본으로 가리키지 않는다.\n\n기존 출제 문항·DB·원본·82잠금·영구 제외의 변경은 0이다. 기능 브랜치만 fast-forward로 백업하며 main 병합·배포는 하지 않는다. 권리·유사성·실제 family·native/reader·2022 배치 등 미해결 상태는 유지한다.\n`;
// Every precondition above must pass before any outputs are created.
for(const p of [validationPath,base+'engine-upgrades-progress-r43.json',report,e+'engine-ownership-checkpoint-files-r1.json'])assert(!fs.existsSync(p),p);
write(validationPath,validation);write(base+'engine-upgrades-progress-r43.json',progress);
fs.writeFileSync(report,note,{flag:'wx'});
const outputs=[validationPath,base+'engine-upgrades-progress-r43.json',report,
  e+'u63-post-main-r2.json',e+'u63-post-main-r2.log',e+'vitest-u63-post-main-r2.mts',
  e+'finalize-engine-ownership-checkpoint-r1.mjs',e+'engine-ownership-checkpoint-files-r1.json'];
write(outputs.at(-1),{files:outputs,validation:validationPath,dbWrites:0});
console.log(JSON.stringify({passed:tests.numPassedTests,files:tests.testResults.length,code:106,main,head,dbWrites:0}));
