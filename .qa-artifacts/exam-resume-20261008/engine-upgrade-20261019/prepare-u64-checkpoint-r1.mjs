import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const bind=p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});
const tests=read(e+'u64-engine-r2.json');assert.equal(tests.success,true);
assert.equal(tests.numPassedTests,422);assert.equal(tests.numFailedTests,0);assert.equal(tests.testResults.length,27);
const types=read(e+'u64-types-r1.json');assert.equal(types.rootErrors,0);assert.equal(types.globalDiagnostics.length,0);
const lint=read(e+'u64-eslint-r2.json');assert.equal(lint.length,5);assert(lint.every(r=>!r.errorCount&&!r.warningCount));
const transportNames=['render-boundary-prechange-transport-r1.json','render-boundary-postchange-transport-r1.json',
  'render-boundary-r1-order-hold-transport-r1.json','render-boundary-postchange-transport-r2.json'];
const refs=transportNames.flatMap(n=>[bind(e+n),...read(e+n).files]);
const evidence=[...new Map(refs.map(r=>[r.path,r])).values()];
for(const r of evidence){assert.equal(bind(r.path).sha256,r.sha256,r.path);assert(!/\.local\.|\.html$/.test(r.path));}
const current=read(e+'render-boundary-postchange-transport-r2.json');
const review=read(current.report.path);assert.equal(review.counts.assertionsPassed,121);assert.equal(review.counts.assertionsFailed,0);
const sources=['src/lib/examStudy/draftSnapshot.ts','src/lib/examStudy/generate.ts',
  'src/lib/examStudy/registry.ts','src/contracts/examStudy.contract.ts','src/__tests__/unit/examStudyDraftSnapshots.test.ts'];
for(const r of types.rootFiles)assert.equal(bind(r.path).sha256,r.sha256);
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(ent=>ent.isDirectory()?walk(p+'/'+ent.name):[p+'/'+ent.name]);
const prototype=walk(e+'render-boundary-prototype-r1');
const localFiles=['vitest-u64-red-r1.mts','vitest-u64-red-r2.mts','vitest-u64-engine-r1.mts',
  'u64-red-r1.log','u64-red-r2.log','u64-red-r2.json','u64-green-r1.log','u64-green-r1.json',
  'u64-engine-r1.log','u64-engine-r1.json','u64-engine-r2.log','u64-engine-r2.json',
  'u64-eslint-r1.json','u64-eslint-r2.json','u64-types-r1.log','u64-types-r1.json','check-u64-types-r1.mjs',
  'render-boundary-prechange-brief-r1.md','render-boundary-postchange-brief-r1.md','render-boundary-postchange-brief-r2.md',
  'push-engine-ownership-checkpoint-r1.json','prepare-u64-checkpoint-r1.mjs'].map(n=>e+n);
const report='docs/planning/tracks/reports/exam-engine-draft-ownership-20261020.md';
assert(!fs.existsSync(report));
fs.writeFileSync(report,`# 검산한 문항과 도형 렌더의 데이터 소유권 보완\n\n[최신 역할 분담](../brief-exam-engine-ownership-20261020.md)에 따라 생성 엔진만 수정했다. 이미 출제된 문항·DB·다른 컴퓨터의 지면/서술형 첫 묶음은 수정하지 않는다. 실제 작성178/정본선택174/전체수학·학년173/최종·적재0은 이전 집계 그대로다. 새 수작업 문항·blind 승인·그림·imagegen 수는 늘리지 않는다.\n\n독립 사전 점검 af3c3ce83은 신뢰된 factory/prepare의 실수로 생길 수 있는 세 결함을 합성 사례로 재현했다. 검산 뒤 렌더 콜백이 본문·답·해설·도형/매개변수를 바꿀 수 있었고, factory의 객체·중첩 참조 재사용이 앞선 후보를 바꾸며, 보관한 렌더 참조로 반환 결과의 중첩 값도 바꿀 수 있었다. 실제 은행 문항이나 DB 손상을 확인한 결과는 아니다.\n\n이제 factory 반환값을 즉시 별도 사본으로 만들고 깊이 동결한 뒤 검산한다. canonical 매개변수와 실제 객관식 파생 draft도 분리·보호한다. 렌더 콜백에는 또 다른 읽기 전용 사본을 넘기고, 결과의 중첩 데이터는 호출자가 소유하는 사본으로 반환한다. factory 원본을 동결하지 않아 객체 재사용 자체는 계속 가능하다. 일반 JS의 비엄격 모드에서는 쓰기가 예외 대신 무시될 수 있으나 검산값은 바뀌지 않는다. 임의 악성 함수/proxy/accessor에 대한 보안 sandbox를 주장하지 않는다.\n\n최초 복사 구현은 식별자용 정렬 직렬화를 재사용해 필드 순서를 바꿨고 확장 검사421개 중8개가 실패했다. 기존 일부 검증기가 매개변수·채점표 JSON의 순서를 비교하기 때문이다. 기존 검증기를 느슨하게 하지 않고, 순서를 보존하는 유한/plain 값 그래프 복사로 수정했다. 순환·비유한 수·지원 밖 prototype·undefined/빈 배열 칸은 보류하며, 객체의 선택적 undefined 필드는 생략하고 공유된 비순환 참조는 각각 분리한다. 최초 실패와 제한된 R1 독립 통과85검사, 순서 결함의4사례/10검사 추가 기록을 모두 보존한다. R1 통과를 현행 승인으로 재사용하지 않는다.\n\n현재 R2는 **27파일·422검사**가 통과했다. 기존 단위·학년·등록·완결 공급, API와 실제 strict Python 도형 경로를 포함한다. 독립 c23a46bb5는 **68개 한정 사례·121검사**와 기존 native family2개의 서술형 출력4개를 확인했다. parent와 independent 숫자, 과거 반복을 합산하지 않는다. 변경5파일 ESLint 오류/경고0, 실제 프로젝트 옵션·의존성으로 해당5파일의 TypeScript 진단0이며 프로젝트 전체 빌드/타입검사 주장은 아니다.\n\n정책 \`20261020-detached-immutable-drafts-r2\`를 manifest에 연결했다. 예전 대기 중 생성 요청의 지문은 현재 요청과 다르게 되어 기존 확인 경로의409/새로 읽기를 따른다. 이미 저장·출제된 문항을 다시 쓰거나 마이그레이션하지 않는다. SVG 바이트의 차이는 수학 지문에서 계속 제외하며, 원래 base 문항의 contentDigest를 보존하는 기존 객관식 정책도 바꾸지 않는다. 픽셀·SVG 의미 정확성, 학년·권리·출처·native 승인까지 증명한 것은 아니다.\n\n검증과 실패 산출물은 엔진 원장의 다음 버전과 current-source 해시로 연결한다. 최신 원격 main을 보존·통합하고 관련 검사를 다시 확인한 뒤 기능 브랜치만 fast-forward로 백업한다. 다른 컴퓨터의 DB 갱신·지면 제작·blind 결과는 해당 세션의 작업이며 여기서 재실행하지 않는다. 운영 쓰기·적재·배포는0이다.\n`,{flag:'wx'});
const receipt=e+'u64-checkpoint-preparation-r1.json';assert(!fs.existsSync(receipt));
const files=[...new Set([...sources,...evidence.map(r=>r.path),...prototype,...localFiles,report,receipt])];
fs.writeFileSync(receipt,JSON.stringify({utc:new Date().toISOString(),code:sources.map(bind),evidence,
  parentTests:bind(e+'u64-engine-r2.json'),parentPassed:422,independent:current.report,independentCommit:current.workerCommit,
  files,dbWrites:0,existingBankQuestionsChanged:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:files.length,code:sources.length,parentPassed:422,independentPassed:121,dbWrites:0}));
