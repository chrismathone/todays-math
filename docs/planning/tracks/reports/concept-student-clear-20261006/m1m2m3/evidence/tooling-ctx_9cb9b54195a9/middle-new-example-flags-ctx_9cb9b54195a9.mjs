import fs from 'node:fs';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3',dest=root+'/evidence/negative-example-observations-ctx_9cb9b54195a9.json';
if(fs.existsSync(dest))throw Error('Example observations already recorded');
const a=JSON.parse(fs.readFileSync(root+'/audit.json'));
const observations=[
{id:'m3-01-02-c7',needed:'분류 기준 없이 두 갈래를 고르라는 물음은 여러 답이 가능하다. 정수·정수가 아닌 유리수·무리수를 구별할 실제 수의 예가 필요하다.',provided:'제안 B에 -2, 1/3, 제곱근2와 세 분류 기준을 함께 제공했다.',evidence:'evidence/resume-editorial-ctx_9cb9b54195a9/verdicts-negative-75-89.json'},
{id:'m3-02-02-c9',needed:'일반 전개식과 완성된 인수분해식이 모두 보이면 계수의 짝을 스스로 고르는지 확인하기 어렵다. 고를 짝이 아직 주어지지 않은 실제 다항식이 필요하다.',provided:'제안 B에 2x²+7x+3을 제공하고 양의 정수 짝 및 중간항 확인을 요구했다. 일반 설명은 별도로 보존했다.',evidence:'evidence/resume-editorial-ctx_9cb9b54195a9/verdicts-negative-final-four.json'},
{id:'m3-05-02-c2',needed:'실제 삼각비 수치를 읽는 예에서는 표 자체가 필요하다. 현재 B는 주어진 행·열 배치에서 읽을 위치를 고르는 절차까지만 평가한다.',provided:'행·열의 방향과 찾을 cos35°는 B에 명시했다. 값 찾기까지 확장할 때에는 해당 표를 함께 보여야 한다.',evidence:'evidence/resume-editorial-ctx_9cb9b54195a9/verdicts-negative-90-99.json'}
].map(o=>{const r=a.rows.find(r=>r.id===o.id);if(!r)throw Error(o.id);const before=r.exampleNeeded??null;r.exampleNeeded=true;r.exampleReason=o.needed;return {...o,sourceIndex:r.sourceIndex,sourceFingerprint:r.sourceFingerprint,proposalFingerprint:r.proposalFingerprint,previousFlag:before,currentFlag:true};});
fs.writeFileSync(dest,JSON.stringify({recordedAt:new Date().toISOString(),scope:'Explicit metadata observations after actual per-ID reading; no content fingerprint or reader attribution changed.',rows:observations},null,2)+'\n');
fs.writeFileSync(root+'/audit.json',JSON.stringify(a,null,2)+'\n');fs.writeFileSync(root+'/proposal-cohorts.json',JSON.stringify(a,null,2)+'\n');
console.log(JSON.stringify({flagged:observations.map(o=>o.id),newFlags:observations.filter(o=>!o.previousFlag).length}));
