import fs from 'node:fs';
import {asMultipleChoice,declaredClassificationCount} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/engine/deriveFormats.ts';
import {createRng} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/elementary/rng.ts';
import {generateMiddleProblem} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/middle/generate.ts';
const content='다음 중 일차방정식인 것의 개수를 구하시오.\n$x+1=3$, $2x=4$, $x^2=1$, $x=x$, $1=2$';
const stem={content,answer:'$2$개',solution:'synthetic',familyKey:'audit',problemType:'계산',distractors:['$0$개','$1$개','$3$개','$4$개']};
const adversarial=[];for(const [name,last] of [['ellipsis','\\cdots'],['blank',' '],['whitespace-duplicate',' x=x ']]){const s={...stem,content:content.replace('$1=2$',`$${last}$`)};try{const r=asMultipleChoice(s,createRng(1));adversarial.push({name,bound:declaredClassificationCount(s.content),accepted:true,choices:r.content.split('\n').slice(2)});}catch(e){adversarial.push({name,bound:declaredClassificationCount(s.content),accepted:false,error:String(e)});}}
const generated=[];for(let seed=1;seed<=64;seed++){try{const s=generateMiddleProblem('1-1|일차방정식의 풀이|09',seed,0);asMultipleChoice(s,createRng(seed));generated.push({seed,bound:declaredClassificationCount(s.content),success:true});}catch(e){generated.push({seed,success:false,error:String(e)});}}
const out={adversarial,actualGenerated64:{passed:generated.filter(x=>x.success).length,failed:generated.filter(x=>!x.success).length,results:generated}};
fs.writeFileSync('.qa-artifacts/exam-resume-20261008/engine-gate-independent-audit-20261019-r1/additional-count-results.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({adversarial,actualGenerated64:{passed:out.actualGenerated64.passed,failed:out.actualGenerated64.failed}},null,2));
