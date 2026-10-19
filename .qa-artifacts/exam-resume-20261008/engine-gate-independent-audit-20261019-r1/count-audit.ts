import fs from 'node:fs';
import {asMultipleChoice,declaredClassificationCount} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/engine/deriveFormats.ts';
import {createRng} from 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib/elementary/rng.ts';
const content='다음 중 일차방정식인 것의 개수를 구하시오.\n$x+1=3$, $2x=4$, $x^2=1$, $x=x$, $1=2$';
const stem={content,answer:'$2$개',solution:'synthetic audit',familyKey:'audit',problemType:'계산'};
const results:any[]=[];
function attempt(name:string, s:any){try{const r=asMultipleChoice(s,createRng(1));results.push({name,bound:declaredClassificationCount(s.content),accepted:true,content:r.content,answer:r.answer});}catch(e){results.push({name,bound:declaredClassificationCount(s.content),accepted:false,error:String(e)});}}
attempt('valid-five-auto',stem);
attempt('valid-five-authored',{...stem,distractors:['$0$개','$1$개','$3$개','$5$개']});
for(const answer of ['$0$개','$5$개','$6$개','$-1$개','$2.5$개','$02$개'])attempt('answer-'+answer,{...stem,answer});
for(const n of [2,3,4,20,21])attempt('domain-'+n,{...stem,content:'다음 중 방정식인 것의 개수를 구하시오.\n'+Array.from({length:n},(_,i)=>`$x=${i}$`).join(', '),answer:'$0$개'});
for(const distractors of [['$0$개','$1$개','$3$개','$6$개'],['$0$개','$1$개','$3$개','$3$개'],['$0$개','$1$개','$2$개','$4$개'],['$0$개','$1$개','$3$개'],['$0$개','$1$개','$3$개','$4$개','$5$개']])attempt('bad-authored-'+distractors.join('|'),{...stem,distractors});
for(const [name,text] of Object.entries({unknown:'자연수 해의 개수를 구하시오.',extraLine:content+'\n추가 조건',duplicate:content.replace('$1=2$','$x=x$'),whitespaceDuplicate:content.replace('$1=2$','$ x=x $'),ellipsis:content.replace('$1=2$','$\\cdots$'),emptyMath:content.replace('$1=2$','$ $')}))attempt(name,{...stem,content:text,distractors:['$0$개','$1$개','$3$개','$6$개']});
fs.writeFileSync('.qa-artifacts/exam-resume-20261008/engine-gate-independent-audit-20261019-r1/count-boundary-results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
