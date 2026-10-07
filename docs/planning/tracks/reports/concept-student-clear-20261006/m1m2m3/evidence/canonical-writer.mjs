import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {split} from './middle-student-canonical.mjs';
import {normalizeDisplay,semanticMarkupKey} from './middle-student-markup.mjs';
const temp='D:/tmp/concept-student-clear-20261006';
const report='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const evidence=path.join(report,'evidence');fs.mkdirSync(evidence,{recursive:true});
const bytes=fs.readFileSync(`${temp}/m1m2m3.json`),source=JSON.parse(bytes.toString('utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
fs.writeFileSync(`${evidence}/source.json`,bytes);
const dir=`${temp}/middle-student-drafts`,manifest=JSON.parse(fs.readFileSync(`${dir}/manifest.json`,'utf8'));
const patches=JSON.parse(fs.readFileSync(`${temp}/middle-student-direct-cases.json`,'utf8'));
const amendments=fs.existsSync(`${temp}/middle-student-amendments.json`)?JSON.parse(fs.readFileSync(`${temp}/middle-student-amendments.json`,'utf8')):[];
const ideas={};
Object.assign(ideas,{
 'm1-01-01-c4':['1을 지우기','아직 살펴보지 않은 수 중 가장 작은 수를 남기기','남긴 수 자체를 제외한 배수를 지우기를 반복하기'],
 'm1-01-01-c8':['a^n은 a를 n번 곱하고 a×n은 a를 n번 더하기','2^3=2×2×2와 2×3=2+2+2의 구별'],
 'm1-03-06-c5':['3x-x=8-2로 모아 2x=6 얻기','0이 아닌 계수 2로 양변을 나누어 x=3 얻기'],
 'm1-03-11-c6':['반대 방향의 첫 만남에서는 걸은 거리의 합이 한 바퀴인 600m','같은 방향의 첫 만남에서는 빠른 사람이 한 바퀴 더 걸어 거리 차가 600m'],
 'm1-03-06-xc20':['+3을 이항하면 -3이어야 함','2x=9-3과 해 x=3'],
 'm2-01-03-c2':['10x=5.555…','10x-x에서 같은 소수 부분이 없어짐','9x=5에서 x=5/9'],
 'm2-01-03-c3':['한 자리 순환·한 자리 비순환의 약분 전 분모 90','100x-10x의 x 계수가 90이거나 9 뒤에 비순환 자리 수만큼 0을 붙이는 근거'],
 'm2-01-03-c4':['100x와 10x의 소수 부분이 같아 뺄 때 없어짐','정수 부분 123에서 12를 빼어 분자 111을 얻기','111/90 또는 동치 분수 37/30'],
 'm2-01-03-xc1':['10x-x=4에서 9x=4','분수 4/9'],
 'm2-04-01-c5':['3은 입력하는 x의 값','f(3)은 x=3일 때의 y값인 함숫값'],
 'm2-04-01-xc9':['f(2)=7과 f(-1)=1에서 합 8','f(1)=5여서 같지 않음','출력값의 합과 입력값을 먼저 더해 함수에 넣는 것은 다른 계산'],
 'm3-01-01-c5':['양수는 2개, 0은 1개, 음수는 없음','부호가 다른 두 실수의 제곱이 같은 양수','실수의 제곱은 0 이상이어서 음수가 되지 않음'],
 'm3-01-01-c10':['a≥0이면 a, a<0이면 -a','두 경우를 |a|로 나타냄'],
 'm3-01-01-xc6':['3의 제곱 9와 9의 양의 제곱근 3','양수에서 제곱 후 양의 제곱근을 구하면 처음 양수로 돌아옴'],
 'm3-05-03-c7':['사용할 예각 30도','높이 c sin30도','넓이 (1/2)ac sin30도'],
 'm3-07-03-xc14':['다섯 요약값의 위치는 중앙값을 중심으로 대칭','개별 자료값이 모두 보이지 않아 전체 자료 분포의 대칭을 단정할 수 없음'],
});
const s=String.raw;
for(const item of patches){
 if(ideas[item.id])item.patch.bRequiredIdeas=ideas[item.id].map(idea=>({anyOf:[idea]}));
 const roles={'m1-01-01-c4':'procedure','m1-01-01-c8':'definition','m1-01-01-xc13':'application','m1-03-06-c5':'procedure','m1-03-11-c6':'reason','m1-03-06-xc20':'reason','m2-01-03-c2':'procedure','m2-01-03-c3':'procedure','m2-01-03-c4':'reason','m2-01-03-xc1':'procedure','m2-04-01-c5':'definition','m2-04-01-xc9':'application','m3-01-01-c5':'reason','m3-01-01-c10':'definition','m3-01-01-xc6':'reason','m3-03-03-c1':'procedure','m3-05-03-c7':'application','m3-07-03-xc14':'reason'};
 item.patch.learningRole=roles[item.id];
 if(item.id==='m1-01-01-c4')item.patch.bRequiredIdeas=[{anyOf:[s`$1$을 지우기`]},{anyOf:['지워지지 않고 아직 살펴보지 않은 가장 작은 수부터 차례로 남기기']},{anyOf:['그 수는 남기고 그 수의 배수를 지우는 일을 되풀이하기','그 수 자체를 제외한 배수를 지우는 일을 되풀이하기']}];
 if(item.id==='m1-03-06-c5')item.patch.bRequiredIdeas=[{anyOf:[s`$x$가 있는 항과 상수항을 각각 모아 $2x=6$ 얻기`,s`반대쪽으로 모아 $-2x=-6$ 또는 같은 뜻의 식을 얻기`]},{anyOf:[s`양변을 $x$의 계수로 나누어 $x=3$ 얻기`]}];
 if(item.id==='m2-01-03-c3')item.patch.bRequiredIdeas=[{anyOf:['약분 전 분모 90']},{anyOf:['순환 한 자리로 9를 하나 쓰고 비순환 한 자리로 그 뒤에 0을 하나 붙이기','한 자리 비순환과 한 자리 순환을 고려해 100x-10x를 만들면 계수가 90이 됨']}];
 if(item.id==='m2-04-01-xc9')item.patch.bRequiredIdeas=[{anyOf:['함숫값의 합 f(2)+f(-1)=8']},{anyOf:['f(1)과 서로 같지 않음']},{anyOf:['두 출력값을 더하는 것과 입력값을 먼저 더해 넣는 것은 다른 계산']}];
 if(item.id==='m3-01-01-c5')item.patch.bRequiredIdeas=[{anyOf:[s`양수의 제곱근은 $2$개`]},{anyOf:[s`$0$의 제곱근은 $1$개`]},{anyOf:['음수의 제곱근은 없음']},{anyOf:['절댓값이 같고 부호만 다른 두 수를 제곱하면 같은 양수가 됨']},{anyOf:[s`어떤 수를 제곱해도 $0$ 이상이므로 음수가 되지 않음`,'제곱해서 음수가 되는 수는 없음']}];
 if(item.id==='m3-05-03-c7')item.patch.bRequiredIdeas=[{anyOf:[s`예각은 $30^\circ$`]},{anyOf:[s`높이는 $c\sin30^\circ$`,s`높이는 $\frac{c}{2}$`]},{anyOf:[s`넓이는 $\frac12ac\sin30^\circ$`,s`넓이는 $\frac{ac}{4}$`]}];
 if(item.id==='m1-01-01-c4'){item.patch.coreAfter=item.patch.cAfter;item.patch.coreReason='배수 모두 지우기는 남긴 소수 자체도 지우는 모순이 있어 그 수 자체를 제외하고, 지워진 수도 다음 후보에서 제외한다.';}
 if(item.id==='m2-01-03-c3'){item.patch.coreAfter=item.patch.cAfter;item.patch.coreReason='분모 규칙이 약분 전 표현에 해당한다는 필수 범위를 명시한다.';}
 if(item.id==='m2-01-03-c4'){item.patch.coreAfter=s`순환소수를 분수로 나타낼 때 분자는 소수점을 지우고 정수 부분부터 순환마디를 한 번 적은 수에서, 정수 부분과 소수점 아래 순환하지 않는 부분만 적은 수를 {뺀 값}이다.`;item.patch.coreReason='전체의 수와 앞부분이 무엇을 가리키는지 정수 부분과 소수점 아래 비순환 부분으로 명시한다.';}
 if(item.id==='m3-05-03-c7'){item.patch.coreAfter=s`삼각형의 두 변의 길이가 $a$, $c$이고 끼인각 $B$가 둔각일 때, 길이가 $a$인 변을 밑변으로 삼아 그 변을 늘리면 높이를 구할 직각삼각형이 생긴다. 이때 사용할 예각은 {$180^\circ-B$}이므로 높이는 $c\sin(180^\circ-B)$, 넓이는 $\frac12ac\sin(180^\circ-B)$이다.`;item.patch.coreReason='예각의 삼각비를 배운 중3 학생에게 정의하지 않은 둔각 sin B 대신 실제 높이에 쓰는 예각과 두 변을 밝힌다.';}
 if(['m3-01-01-xc6','m3-07-03-xc14'].includes(item.id)){
  item.patch.cDecision='exclude';delete item.patch.cAfter;delete item.patch.cAnswers;
  item.patch.cReason=item.id==='m3-01-01-xc6'?'거꾸로라는 임의 표현을 암기하는 빈칸이며, 예의 수를 가리면 앞 식을 그대로 복사하는 문제에 머문다.':'다섯 값의 자리/자료 전체라는 임의 긴 구절을 맞추는 것보다 자료 분포를 단정하지 못하는 이유를 B에서 설명해야 한다.';
  item.patch.exclusionReason='C: 관계의 이유나 자료 정보의 한계를 단답 낱말 암기로 확인하기 어려워 C에서는 제외하고 일반 학습 설명과 B 설명 질문은 유지한다.';
 }
}
fs.writeFileSync(`${report}/direct-review.json`,JSON.stringify(patches,null,2)+'\n');
fs.writeFileSync(`${report}/amendments.json`,JSON.stringify(amendments,null,2)+'\n');
const rowById=new Map(),authorEvidence=[],scopeById=new Map(),scopeEvidence=[],enrichmentById=new Map(),enrichmentEvidence=[],coreRepairById=new Map(),coreRepairEvidence=[];
for(const [kind,folder,prefix,target,evidenceList] of [['scope','middle-student-scope','scope',scopeById,scopeEvidence],['enrichment','middle-student-enrichment','enrich',enrichmentById,enrichmentEvidence],['core-repair','middle-student-core-repair','core',coreRepairById,coreRepairEvidence]]){
 const fromDir=`${temp}/${folder}`;if(!fs.existsSync(fromDir))continue;
 for(const name of fs.readdirSync(fromDir).filter(n=>new RegExp(`^${prefix}-[0-9]+\\.json$`).test(n)).sort()){
  const stem=name.slice(0,-5),extraRows=JSON.parse(fs.readFileSync(`${fromDir}/${name}`,'utf8'));
  const info={kind,stem,ids:extraRows.map(x=>x.id)};
  for(const suffix of ['-input.md','-raw.md','-meta.json']){
   const from=`${fromDir}/${stem}${suffix}`;if(!fs.existsSync(from))throw Error(`missing ${from}`);
   const relative=`evidence/${kind}/${stem}${suffix}`,content=fs.readFileSync(from);fs.mkdirSync(path.dirname(`${report}/${relative}`),{recursive:true});fs.writeFileSync(`${report}/${relative}`,content);
   info[suffix==='-input.md'?'input':suffix==='-raw.md'?'raw':'meta']={path:relative,sha256:sha(content)};
  }
  evidenceList.push(info);
  const coreInputs=kind==='core-repair'?JSON.parse(fs.readFileSync(`${fromDir}/${stem}-input.md`,'utf8').split('SOURCE AND CURRENT GENERAL EXPLANATIONS:\n')[1]):null;
  for(const row of extraRows)target.set(row.id,{...row,[`${kind}Evidence`]:`${kind}/${stem}`,...(coreInputs?{coreRepairBefore:coreInputs.find(x=>x.id===row.id).coreAfter}:{})});
 }
}
for(const batch of manifest.batches){
 const stem=`batch-${String(batch.batch).padStart(3,'0')}`,file=`${dir}/${stem}.json`;
 if(!fs.existsSync(file))continue;
 const rows=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(rows)||!rows.every(x=>typeof x.bReason==='string'&&typeof x.cReason==='string'))continue;
 if(JSON.stringify(rows.map(x=>x.id))!==JSON.stringify(batch.ids))throw Error(`${stem} ID mismatch`);
 let evidenceInfo={batch:batch.batch,ids:batch.ids};
 for(const suffix of ['-input.md','-raw.md','-meta.json']){
  const from=`${dir}/${stem}${suffix}`;
  if(!fs.existsSync(from))throw Error(`missing ${from}`);
  const relative=`evidence/author-drafts/${stem}${suffix}`;fs.mkdirSync(path.dirname(`${report}/${relative}`),{recursive:true});
  const b=fs.readFileSync(from);fs.writeFileSync(`${report}/${relative}`,b);
  evidenceInfo[suffix==='-input.md'?'input':suffix==='-raw.md'?'raw':'meta']={path:relative,sha256:sha(b)};
 }
 authorEvidence.push(evidenceInfo);
 for(const row of rows)rowById.set(row.id,{...row,authorBatch:batch.batch,readingProvenance:'isolated Claude no-tools per-ID content draft; not an independent approval'});
}
const directById=new Map(patches.map(x=>[x.id,x]));
const amendmentById=new Map(amendments.map(x=>[x.id,x]));
const markupAmendments=[];
const rows=source.entries.flatMap((entry,index)=>{
 const row=rowById.get(entry.id);if(!row)return [];
 const manual=directById.get(entry.id);
 const proposal={...row,...(scopeById.get(entry.id)||{}),...(enrichmentById.get(entry.id)||{}),...(manual?.patch||{}),...(amendmentById.get(entry.id)||{}),id:entry.id,sourceIndex:index,part:entry.part,sourceFingerprint:sha(JSON.stringify(entry)),sourceEvidence:{path:'evidence/source.json',index},directReview:manual?{path:'direct-review.json',id:entry.id,note:manual.directReviewNote}:amendmentById.has(entry.id)?{path:'amendments.json',id:entry.id}:null};
 const repaired=coreRepairById.get(entry.id);
 if(repaired&&proposal.coreRepairDecision==='reject'){proposal.coreRepairRejectedProposal=repaired.coreAfter;proposal.coreRepairEvidence=repaired['core-repairEvidence'];}
 else if(repaired&&repaired.coreRepairBefore===proposal.coreAfter){proposal.coreBeforeRepair=proposal.coreAfter;proposal.coreAfter=repaired.coreAfter;proposal.coreReason=repaired.coreReason;proposal.coreRepairReason=repaired.coreRepairReason;proposal.coreRepairEvidence=repaired['core-repairEvidence'];}
 else if(repaired)proposal.coreRepairStale=true;
 if(Array.isArray(proposal.bRequiredIdeas))proposal.bRequiredIdeas=proposal.bRequiredIdeas.map(idea=>typeof idea==='string'?{anyOf:[idea]}:idea);
 const normalize=(before,field)=>{const after=normalizeDisplay(before);if(before!==after){if(semanticMarkupKey(before)!==semanticMarkupKey(after))throw Error(`${entry.id} markup semantics changed: ${field}`);markupAmendments.push({id:entry.id,field,before,after,verification:'Only inline math delimiters and standard equivalent KaTeX operator spellings changed; semanticMarkupKey unchanged.'});}return after;};
 for(const field of ['bPrompt','bAnswer'])if(proposal[field])proposal[field]=normalize(proposal[field],field);
 if(proposal.bRequiredIdeas)proposal.bRequiredIdeas=proposal.bRequiredIdeas.map((idea,i)=>({anyOf:idea.anyOf.map((x,j)=>normalize(x,`bRequiredIdeas.${i}.${j}`))}));
 if(proposal.bDecision==='exclude'){proposal.bPrompt=null;proposal.bAnswer=null;proposal.bRequiredIdeas=null;}
 if(proposal.cDecision==='keep'){proposal.cFrozenSentence=entry.studentC;proposal.cFrozenDefinition=entry.definition;proposal.cFrozenAnswers=entry.answers;}
 if(!proposal.bRequiredIdeas&&proposal.bDecision!=='exclude')proposal.bRequiredIdeasPending=true;
 const marked=proposal.cDecision==='keep'?entry.definition:proposal.cAfter;
 const pieces=proposal.cDecision==='exclude'||!marked?[]:split(marked);
 const answers=pieces.filter(x=>x.kind==='key').map(x=>x.text);
 if(proposal.cDecision!=='exclude'&&marked){proposal.cMarkedSentence=marked;proposal.cSlotAnswers=answers;proposal.cStudentSentence=pieces.map(x=>x.kind==='key'?'□':x.text).join('');proposal.cAnswers=answers;}
 if(proposal.cDecision!=='exclude'&&Array.isArray(answers)){
  const variants=[...(proposal.synonyms||[]),...(proposal.contextualAnswers||[])];
  proposal.cSlots=answers.map((answer,index)=>({index,answer,equivalentAnswers:[answer,...variants.filter(x=>x.answer===answer).flatMap(x=>x.accept).map((x,j)=>normalize(x,`cSlots.${index}.${j}`))],equivalenceReview:'proposal only, independent verification required'}));
  proposal.lexicalSynonyms=(proposal.synonyms||[]).filter(x=>!x.answer.includes('$')&&!x.accept.some(y=>y.includes('$')));
  proposal.equivalentExpressions=(proposal.synonyms||[]).filter(x=>x.answer.includes('$')||x.accept.some(y=>y.includes('$')));
  delete proposal.synonyms;
 }
 if(proposal.cSlots&&manual){
  const additions={'m1-01-01-c4':{0:['그 수의 배수']},'m1-03-06-c5':{2:[s`$a$`,'미지수의 계수']},'m2-01-03-c2':{0:['소수점 아래 부분']},'m2-01-03-c4':{0:['소수점 앞 부분']},'m3-01-01-c5':{2:[s`$0$개이다`,'존재하지 않는다']},'m3-03-03-c1':{0:[s`$=$`],1:['문제의 뜻','문제의 상황','조건']},'m3-05-03-c7':{0:[s`$180^\circ-\angle B$`]}};
  for(const [index,accept] of Object.entries(additions[entry.id]||{})){const slot=proposal.cSlots[Number(index)];if(slot)slot.equivalentAnswers=[...new Set([...slot.equivalentAnswers,...accept])];}
 }
 if(proposal.cSlots)proposal.cAcceptedAnswers=proposal.cSlots.map((x,i)=>[...new Set(x.equivalentAnswers.map((a,j)=>j===0?a:normalize(a,`cSlots.${i}.${j}`)))]);
 proposal.proposalFingerprint=sha(JSON.stringify({bDecision:proposal.bDecision,bPrompt:proposal.bPrompt,bAnswer:proposal.bAnswer,bRequiredIdeas:proposal.bRequiredIdeas,cDecision:proposal.cDecision,cMarkedSentence:proposal.cMarkedSentence,cAcceptedAnswers:proposal.cAcceptedAnswers,coreAfter:proposal.coreAfter}));
 return [proposal];
});
const gradeCounts={};for(const e of source.entries)gradeCounts[e.part]=(gradeCounts[e.part]||0)+1;
const stat=key=>Object.fromEntries(['keep','rewrite','exclude'].map(decision=>[decision,rows.filter(x=>x[key]===decision).length]));
const body={sourceCommit:source.sourceCommit,grades:source.grades,sourceParts:gradeCounts,sourceSha256:sha(bytes),sourceFingerprintAlgorithm:'SHA-256 of UTF-8 JSON.stringify(source entry), preserving key order from evidence/source.json',status:rows.length===source.entries.length?'complete-proposal-draft-awaiting-independent-review':'partial-proposal-draft',scopeCount:source.entries.length,reviewedCount:rows.length,reviewedIds:rows.map(x=>x.id),pendingIds:source.entries.filter(x=>!rowById.has(x.id)).map(x=>x.id),readingDisclosure:'Every completed row was supplied with its B title, definition, actual studentC, answers and existing example to isolated Claude as content-author assistance. Direct Codex review is separately tagged. This is not a claim that Codex directly read all IDs and is not independent approval.',assessmentContract:{bPrompt:'visible question separate from general definition',bAnswer:'model answer aligned to bPrompt',bRequiredIdeas:'independent {anyOf:string[]} meanings; only what the question requests, mathematically equivalent replies permitted',cAfter:'proposed C clozeQuestion only; not a replacement for the learning definition',cKeep:'exact source studentC/definition/answers frozen explicitly',coreAfter:'only for actual math error or unclear grade language, preserving the general learning objective',excluded:'form-specific proposal; no IDs physically removed'},summary:{B:stat('bDecision'),C:stat('cDecision'),coreChanges:rows.filter(x=>x.coreAfter).length,examplesNeeded:rows.filter(x=>x.exampleNeeded).length,requiredIdeasPending:rows.filter(x=>x.bRequiredIdeasPending).length,learningRolePending:rows.filter(x=>!x.learningRole).length},authorEvidence,scopeEvidence,enrichmentEvidence,rows};
const target=rows.length===source.entries.length?'audit.json':'proposal-cohorts.json';
const editorial=fs.existsSync(`${report}/final-editorial.json`)?JSON.parse(fs.readFileSync(`${report}/final-editorial.json`,'utf8')):{rows:[]};
body.sourceDraftCount=rows.length;body.finalEditorialCount=editorial.rows.filter(e=>rows.some(r=>r.id===e.id&&r.proposalFingerprint===e.proposalFingerprint)).length;body.finalEditorialPendingIds=source.entries.filter(e=>!editorial.rows.some(x=>x.id===e.id&&rows.some(r=>r.id===x.id&&r.proposalFingerprint===x.proposalFingerprint))).map(x=>x.id);body.coreRepairEvidence=coreRepairEvidence;
fs.writeFileSync(`${report}/markup-amendments.json`,JSON.stringify(markupAmendments,null,2)+'\n');
fs.writeFileSync(`${report}/${target}`,JSON.stringify(body,null,2)+'\n');
console.log(JSON.stringify({target,rows:rows.length,total:source.entries.length,summary:body.summary,report}));
