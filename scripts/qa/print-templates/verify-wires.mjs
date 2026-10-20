import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {freemem} from 'node:os';
const root=process.cwd(),out=resolve(root,'.qa-artifacts/print-wire-review');
await mkdir(out,{recursive:true});if(freemem()<3*1024**3)throw Error('Need 3GiB free before Chromium.');const browser=await chromium.launch();
try{const page=await browser.newPage({viewport:{width:1700,height:1300}});
const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
await page.goto(pathToFileURL(resolve(root,'docs/design/mockups/answer-quick-key-wire-20261020.html')).href);await page.evaluate(()=>document.fonts.ready);
const quick=await page.evaluate(()=>[...document.querySelectorAll('.sample')].map(s=>{
const ids=new Set([...s.querySelectorAll('.cell>b,.stripe>b')].map(n=>Number(n.textContent)));
const n=Number(s.dataset.n);return {variant:Number(s.dataset.v),count:n,uniqueAnswerNumbers:ids.size,complete:Array.from({length:n},(_,i)=>i+1).every(i=>ids.has(i)),pages:s.querySelectorAll('.sheet').length,overflow:[...s.querySelectorAll('.sheet')].some(p=>p.scrollHeight>p.clientHeight+1),cellOverflow:[...s.querySelectorAll('.cell,.stripe')].filter(p=>p.scrollWidth>p.clientWidth+2).length};
}));
if(quick.length!==12||quick.some(s=>!s.complete||s.overflow||s.cellOverflow))throw Error(JSON.stringify(quick));
for(let i=0;i<4;i++)await page.locator(`.v${i} .sheet`).first().screenshot({path:resolve(out,`quick-${i+1}.png`)});
let template=null;
if(!process.argv.includes('--quick-only')){
await page.goto(pathToFileURL(resolve(root,'docs/design/mockups/print-templates-wire-20261020.html')).href);await page.evaluate(()=>document.fonts.ready);
template=await page.evaluate(()=>[...document.querySelectorAll('.mount')].map((m,i)=>{const shadow=m.shadowRoot;const p=shadow.querySelector('.wire-page')??shadow.querySelector('[data-unified-paper]');const q=shadow.querySelector('.paper-body');return {index:i,width:p?.offsetWidth,height:p?.offsetHeight,questions:shadow.querySelectorAll('[data-problem-body]').length,overflow:q?[...q.querySelectorAll('.q')].some(n=>n.getBoundingClientRect().bottom>q.getBoundingClientRect().bottom+1):false};}));
if(template.length!==34||template.some(m=>!m.questions||Math.abs(m.width-794)>1||Math.abs(m.height-1123)>1||m.overflow))throw Error(JSON.stringify(template));
for(const id of ['A','B','C','D'])await page.locator(`#${id} .gallery`).screenshot({path:resolve(out,`template-${id}.png`)});
}
if(errors.length||remote.length)throw Error(JSON.stringify({errors,remote}));
await writeFile(resolve(root,'docs/planning/tracks/reports/print-wires-verification-20261020.json'),JSON.stringify({quick,template,errors,remote},null,2));console.log(JSON.stringify({quick,template,errors,remote}));
}finally{await browser.close();}
