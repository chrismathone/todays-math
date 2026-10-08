import fs from 'node:fs';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3',input=root+'/evidence/resume-editorial-ctx_9cb9b54195a9/input-fraction-josa-final.json',rows=JSON.parse(fs.readFileSync(input)).rows;
const repl=(s,a,b)=>{if(!s.includes(a))throw Error('Missing '+a);return s.replace(a,b);};
const changes=rows.map(({proposal:r})=>{
 if(r.id==='m2-01-06-c5')return{id:r.id,cAfter:repl(r.cMarkedSentence,'{$\\frac{1}{6a^2}$}를','{$\\frac{1}{6a^2}$}을'),cAcceptedAnswers:r.cAcceptedAnswers};
 if(r.id==='m2-02-01-c10'){const k=structuredClone(r.bRequiredIdeas);k[0].anyOf[1]=repl(repl(k[0].anyOf[1],'$\\frac12$를','$\\frac12$을'),'$\\frac32<x+\\frac12<\\frac72$를','$\\frac32<x+\\frac12<\\frac72$을');return{id:r.id,bRequiredIdeas:k};}
 if(r.id==='m2-04-06-c6'){const k=structuredClone(r.bRequiredIdeas);k[1].anyOf[1]=repl(k[1].anyOf[1],'$\\frac15$는','$\\frac15$은');return{id:r.id,bRequiredIdeas:k};}
 if(r.id==='m1-01-01-xc10')return{id:r.id,bPrompt:repl(r.bPrompt,'\\frac23$을','\\frac23$를')};
 if(r.id==='m1-03-06-xc16')return{id:r.id,bAnswer:repl(r.bAnswer,'\\frac56$을','\\frac56$를')};
 if(r.id==='m2-01-01-xc20')return{id:r.id,bPrompt:repl(r.bPrompt,'\\times a}$가','\\times a}$이')};
 if(r.id==='m2-01-01-xc24'){const k=structuredClone(r.bRequiredIdeas);k[1].anyOf[0]=repl(k[1].anyOf[0],'\\frac34$로','\\frac34$으로');return{id:r.id,bRequiredIdeas:k};}
 if(r.id==='m2-01-02-xc25')return{id:r.id,cAfter:repl(r.cMarkedSentence,'\\frac7{99}$를','\\frac7{99}$을'),cAcceptedAnswers:r.cAcceptedAnswers};
 throw Error(r.id);
});
const notes=[
['m2-01-06-c5','거듭제곱4a²와역수곱을보여최종2a를구하는질문과기준이맞다.','6a²분의일은일로끝나므로역수뒤조사를을로고친다.','거듭제곱처리와0아닌나누는단항식의역수라는일반조건을유지한다.'],
['m2-02-01-c10','먼저1/2더한뒤2배하는다른바른순서도인정하며분자일·칠뒤조사를을로고친다.','a양수조건으로각변곱한뒤더한다는짧은방법칸을유지한다.'],
['m2-04-06-c6','추10g14cm와30g18cm에서기울기1/5·절편12의단위별뜻을설명한다. 분자일뒤은을쓴다.','같은증가량조건과두실제자료로기울기1/5및절편12를구한다.'],
['m1-01-01-xc10','분수2/3전체가밑인세제곱과괄호이유를묻고마지막삼분의이뒤조사를를로고친다.','분수전체를괄호로묶는짧고정확한방법을유지한다.'],
['m1-03-06-xc16','소수0.5를분수로바꾸고최소공배수6을곱해3x+2=5및x1을구한다. 마지막육분의오뒤를로고친다.','계수상수모두정수를만드는가장작은자연수6을유지한다.'],
['m2-01-01-xc20','a6이면1/4이고a9면1/6이라약분후분모소인수가다르다. 분자삼뒤이로고친다.','기약분수분모1또는2·5소인수를확인하며두소수순서도제시한다.','유한소수판별전약분과분모1허용조건을보존한다.'],
['m2-01-01-xc24','곱을약분하면3/4라유한소수다. 사분의삼뒤조사를으로로고친다.','약분한기약분수의분모로판정하는일반관계를유지한다.'],
['m2-01-02-xc25','23/99와7/99의순환마디23,07을구별하고0을보충하는이유를요구한다.','구십구분의칠뒤조사를을로고치며순환마디07을그대로유지한다.']
].map(([id,b,c,core])=>({id,b,c,...core?{core}:{}}));
const spec={label:'fraction-josa-final',input,changes,notes,rereadIds:changes.map(r=>r.id),reason:'Refined compact-fraction notation checker now reads the numerator; manual Korean readings verified per field. No mathematical answer change.'};
fs.writeFileSync('D:/tmp/concept-student-clear-20261006/middle-resume-fraction-josa-final-ctx_9cb9b54195a9.json',JSON.stringify(spec,null,2)+'\n');
const original=rows.find(r=>r.proposal.id==='m2-01-01-xc20').source;
const extra={generatedAt:new Date().toISOString(),sourceCommit:'13bf05dce',id:original.id,sourceIndex:2140,sourceFingerprint:rows.find(r=>r.proposal.id===original.id).proposal.sourceFingerprint,sourceEvidence:'evidence/source.json',originalExample:original.example,proposedExample:{...original.example,prompt:repl(original.example.prompt,'\\times a}$가','\\times a}$이')},reason:'분수는 분모 다음 분자를 읽으므로 마지막 삼 뒤 조사 이가 맞다.',status:'Planning-only source example correction; original source preserved. Existing normalizeProposal/proposedEntry does not apply an example override; Root owns integration decision.'};
fs.writeFileSync(root+'/source-example-correction-ctx_9cb9b54195a9.json',JSON.stringify(extra,null,2)+'\n');
