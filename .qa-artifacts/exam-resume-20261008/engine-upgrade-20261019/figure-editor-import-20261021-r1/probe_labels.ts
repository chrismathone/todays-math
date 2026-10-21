import fs from 'node:fs';
import {typesetLabel as client,isSafeFragment as clientSafe} from '../../../../src/components/unified/figure-editor/mathjaxLabel';
import {typesetLabel as server,isSafeFragment as serverSafe} from '../../../../src/lib/figure/mathjaxLabel';
const rows=[];
for(const [name,render,safe] of [['client',client,clientSafe],['server',server,serverSafe]] as const){
 for(const [i,label] of ['$\\vec{AB}$','$\\vec{a}$','$\\overparen{ABC}$','$\\overline{AB}$'].entries()){
  const r=render(label);const tags=r?[...new Set([...r.inner.matchAll(/<\/?([a-zA-Z]+)/g)].map(m=>m[1]))]:[];
  if(r)fs.writeFileSync(new URL(`./label-probe-${name}-${i}.svg-fragment`,import.meta.url),r.inner);
  rows.push({name,label,rendered:!!r,safe:r?safe(r.inner):false,tags});
 }
}
fs.writeFileSync(new URL('./label-probe-results.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows));
