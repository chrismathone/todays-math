import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import * as client from '../../../../src/components/unified/figure-editor/mathjaxLabel';
import * as server from '../../../../src/lib/figure/mathjaxLabel';

const sha=(p:string)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const previous=JSON.parse(fs.readFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrades-progress-r54.json','utf8'));
const same=()=>previous.code.every((r:{path:string;sha256:string})=>sha(r.path)===r.sha256);
assert(same());
const rows=[];
for(const [name,labels] of [['client',client],['server',server]] as const){
 for(const raw of ['$\\vec{AB}$','$\\vec{a}$','$\\overline{AB}$','$\\overparen{ABC}$']){
  const laid=labels.typesetLabel(raw);assert(laid&&labels.isSafeFragment(laid.inner));
  const placed=labels.placeLabel(laid,raw,50,50,16,'#111111');assert(placed);
  const doc=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${placed}</svg>`,'image/svg+xml');
  assert(doc.getElementsByTagName('path').length>0);assert.equal(doc.getElementsByTagName('text').length,0);
  rows.push({name,raw,passed:true});
 }
 for(const raw of ['<svg onload="alert(1)"><path/></svg>','<svg><script/></svg>',
  '<svg><foreignObject><div>html</div></foreignObject></svg>','<svg><image href="https://example.invalid/x"/></svg>',
  '<svg><use xlink:href="#glyph"/></svg>','<svg><path fill="url(https://example.invalid/x)"/></svg>',
  '<svg><animate attributeName="href"/></svg>','<svg><style>path{fill:red}</style></svg>']){
  assert.equal(labels.isSafeFragment(raw),false);rows.push({name,raw,passed:true});
 }
}
assert(same());
const report={utc:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 main:execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim(),passed:rows.length,failed:0,rows,
 sourceClosureUnchangedFromR54:true,boundCode:previous.code,wholeProjectOrBrowserRetested:false,dbWrites:0};
fs.writeFileSync(new URL('./post-main-labels-r1.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:rows.length,failed:0,unchangedCode:previous.code.length}));
