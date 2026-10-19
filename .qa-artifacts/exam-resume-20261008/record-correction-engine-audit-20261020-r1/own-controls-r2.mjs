import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const base='.qa-artifacts/exam-resume-20261008/record-correction-engine-audit-20261020-r1/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const scope=read(base+'scope-input.json');
const load=async name=>{const f=scope.files.find(x=>x.path.endsWith('\\'+name));assert(f);return import(pathToFileURL(f.path).href);};
const {compareRecordCorrectionAnswer:compare}=await load('recordCorrectionAnswer.mjs');
const {constantValue,compareConstantParts}=await load('constantAnswers.mjs');
const {independentAnswerMatches,digest,evaluateReview}=await load('candidatePack.mjs');
const {unescapedMathCommandWarnings:warn}=await load('authoredMathNotation.mjs');
const q19Path='.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group11-review-20261020-r3/verification/';
const input=read(q19Path+'verification-inputs.json')[0];
const old=read('.qa-artifacts/exam-resume-20261008/nobyeon-sem1-group11-review-20261020-r2/verification/verification-inputs.json')[0];
const a=input.candidate.answer,b=input.independentSolve.answer,s=input.candidate.metadata.recordCorrectionAnswerSchema;
const before=JSON.stringify([a,b,s,input.independentSolve]);
const out=[];
function check(name,answer,schema=s,expected='not-equivalent'){
 const r=compare(a,answer,schema);assert(expected==='equivalent'?r.status==='equivalent':r.status!=='equivalent',name+': '+JSON.stringify(r));
 assert.equal(r.relationTruthProved,false);assert.equal(r.permitsGradeOrQuestionApproval,false);
 out.push({name,answer,schema,result:r});
}
check('actual sealed raw with commuted radical sum',b,s,'equivalent');
for(const [name,value] of [
 ['wrong record',b.replace('ㄴ','ㄱ')],['unknown record',b.replace('ㄴ','ㅎ')],['wrong corrected sign',b.replace('+8','-8')],['wrong total',b.replace('=27','=28')],['unequal tiny rational',b.replace('=27','=27+1/1000000')],['wrong unit',b.replace('=27','=27cm')],['wrong correction lhs',b.replace('\\dfrac{a}{b}=','\\dfrac{b}{a}=')],['wrong target sign',b.replace('+(b+3)^2=','-(b+3)^2=')],['wrong inner target sign',b.replace('+(b+3)^2=','+(b-3)^2=')],['additional part',b+',27'],['prose',b+' 설명'],['free symbol',b.replace('=27','=x')],['extra equality',b.replace('=27','=27=28')],['separated numerals',b.replace('=27','=2 7')],['wrong radical',b.replace('sqrt{2}','sqrt{3}')],['missing label',b.replace('ㄴ,','')],['unbalanced dollar',b+'$'],['zero denominator',b.replace('=27','=27/0')],['unevaluated relation',b.replace('6\\sqrt{2}+8','(b+3)^2')]])check(name,value);
for(const [name,shape] of [
 ['missing schema',undefined],['null schema',null],['changed version',{...s,version:2}],['changed kind',{...s,kind:'scalar'}],['changed corrected lhs',{...s,correctedExpression:'b/a'}],['changed total target',{...s,totalExpression:'a/b-(b+3)^2'}],['duplicate labels',{...s,recordLabels:['ㄴ','ㄴ']}],['extra approval key',{...s,gradeApproved:true}],['missing target key',Object.fromEntries(Object.entries(s).filter(([k])=>k!=='totalExpression'))]]) {
 // Deliberately pass undefined through directly; default function arguments would restore s.
 const r=compare(a,b,shape);assert.notEqual(r.status,'equivalent',name);out.push({name,result:r});
}
const original={...old.candidate};assert.equal(independentAnswerMatches(original,b),false);
assert.equal(independentAnswerMatches(input.candidate,b),true);
const expectedOld=structuredClone(input.candidate);delete expectedOld.metadata.recordCorrectionAnswerSchema;
assert.deepEqual(expectedOld,old.candidate);
for(const k of ['studentDigest','assetDigest','solveDigest'])assert.equal(input[k],old[k]);
assert.deepEqual(input.independentSolve,old.independentSolve);assert.deepEqual(input.assets,old.assets);
assert.notEqual(input.candidateDigest,old.candidateDigest);
const canonicalChecks={studentDigest:digest((({twinExternalId,questionNumber,questionType,score,content,choices,curriculumReview})=>({twinExternalId,questionNumber,grade:curriculumReview.grade,curriculum:curriculumReview.edition,questionType,score,content,choices,figures:[]}))(input.candidate)),candidateDigest:digest({candidate:input.candidate,assetBindings:[]}),solveDigest:digest(input.independentSolve),assetDigest:digest([])};
for(const [k,v] of Object.entries(canonicalChecks))assert.equal(v,input[k]);
// Separate parser self-match from mathematical truth: deliberately false equations can self-match.
const falseRelation=compare('ㄴ;a/b=0;0','ㄴ;a/b=0;a/b+(b+3)^2=0',s);
assert.equal(falseRelation.status,'equivalent');assert.equal(falseRelation.relationTruthProved,false);
const constants=[];
for(const [x,y,equal] of [[String.raw`8+6\sqrt2`,String.raw`6\sqrt{2}+8`,true],[String.raw`\sqrt8`,String.raw`2\sqrt2`,true],['0.5','1/2',true],['27','27.000001',false],['27','NaN',false],['27','Infinity',false],['1/0','1/0',false],['x','x',false],['sqrt(1000001)','sqrt(1000001)',false],['1 2','12',false]]){
 const r=compareConstantParts([{role:'v',value:x,unit:'none'}],[{role:'v',value:y,unit:'none'}]);assert.equal(r.status==='equivalent',equal);constants.push({x,y,equal,result:r});
}
const notation=[];
for(const [name,text,n] of [
 ['lost root',String.raw`$sqrt2$`,1],['lost fraction',String.raw`$frac{1}{2}$`,1],['lost dots',String.raw`$ldots$`,1],['valid TeX',String.raw`$\sqrt2+\frac{1}{2},\ldots$`,0],['ordinary outside text','sqrt2 frac{1}{2} ldots',0],['text literal',String.raw`$\text{sqrt2 frac{1}{2} ldots}$`,0],['nested literal',String.raw`$\text{a {sqrt2} ldots}+sqrt3$`,1],['operator literal',String.raw`$\operatorname{sqrt2}$`,0],['word substring',String.raw`$asqrt2+myldots$`,0],['escaped dollar',String.raw`\$sqrt2\$`,0],['double display',String.raw`$$sqrt2+cdots$$`,2],['astral prefix offset','😀 $sqrt2$',1]]){
 const r=warn(text);assert.equal(r.length,n,name);notation.push({name,text,warnings:r});
}
const limitations=[{name:'non-dollar math not scanned',text:String.raw`\(sqrt2\)`,warnings:warn(String.raw`\(sqrt2\)` )},{name:'unclosed dollar math not scanned',text:'$sqrt2',warnings:warn('$sqrt2')},{name:'valid TeX does not imply true equation',text:'$1=2$',warnings:warn('$1=2$')}];
assert.equal(JSON.stringify([a,b,s,input.independentSolve]),before);
const result={kind:'independent-bounded-u48-audit',recordControls:out,recordControlsCount:out.length,constantControls:constants,notationControls:notation,notationLimits:limitations,falseRelationSelfMatch: falseRelation,oldUnsupportedMultipart:{priorRootCollector:{math:0,grade:0,source:'user supplied actual root result; not rerun historical engine'},currentAdapterWithoutSchema:false,currentAdapterWithSchema:true},metadataOnly:{onlyCandidateDelta:'metadata.recordCorrectionAnswerSchema',exactStudentAnswerSolutionScoreRubricAssetsAndRawEqual:true,newQuestionOrBlindIncrement:0,canonicalChecks},limitations:['No validateCandidate/bindCandidate/CLI runs: these read solver_rules or private package files outside nine-file scope. Pure adapter/evaluateReview with explicit mocked validation only.','No DB, real package collection, native reader, full TeX parser, relation truth, general symbolic equivalence or grade approval from parser.']};
fs.writeFileSync(base+'own-controls-results.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(q19Path+'own-q19-r3-metadata-parse-check.json',JSON.stringify({metadataOnly:result.metadataOnly,oldUnsupportedMultipart:result.oldUnsupportedMultipart,currentComparison:out[0].result,recordControlEvidence:'record-correction-engine-audit-20261020-r1/own-controls-results.json'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({recordControls:out.length,constantControls:constants.length,notationControls:notation.length,oldNoSchema:false,currentTyped:true,rawUnchanged:true}));
