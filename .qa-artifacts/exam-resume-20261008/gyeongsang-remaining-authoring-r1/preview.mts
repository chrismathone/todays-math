import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const out=path.dirname(fileURLToPath(import.meta.url));const own=path.resolve(out,'../../..');const parent=path.resolve(own,'../exam-extraction-resume-20261008');
assert(!fs.existsSync(path.join(out,'author-freeze.json')),'Frozen author packet: new revision needed');
const require=createRequire(path.join(parent,'package.json'));
const {chromium}=require('playwright');const katex=require('katex');
const {bindCandidate}=await import(pathToFileURL(path.join(parent,'scripts/import/exam-twin/candidatePack.mjs')).href);
const {preprocessMarkdown}=await import(pathToFileURL(path.join(parent,'src/lib/math/markdownPreprocess.ts')).href);
const {checkPaperRender}=await import(pathToFileURL(path.join(parent,'src/lib/testchanger/mathRenderQa.ts')).href);
const {UI_KATEX_OPTIONS}=await import(pathToFileURL(path.join(parent,'src/lib/math/katexRender.ts')).href);
const {unified}=await import(pathToFileURL(path.join(parent,'node_modules/unified/index.js')).href);
const {default:remarkParse}=await import(pathToFileURL(path.join(parent,'node_modules/remark-parse/index.js')).href);
const {default:remarkGfm}=await import(pathToFileURL(path.join(parent,'node_modules/remark-gfm/index.js')).href);
const {default:remarkMath}=await import(pathToFileURL(path.join(parent,'node_modules/remark-math/index.js')).href);
const hash=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const qa=path.join(out,'qa');fs.mkdirSync(qa,{recursive:true});
const katexDist=path.join(parent,'node_modules/katex/dist');
let css=fs.readFileSync(path.join(katexDist,'katex.min.css'),'utf8').replace(/url\((fonts\/[^)]+)\)/g,(_:string,f:string)=>`url(data:font/${f.endsWith('.woff2')?'woff2':'woff'};base64,${fs.readFileSync(path.join(katexDist,f)).toString('base64')})`);
css+=`html,body{margin:0;background:#fff;color:#111;font-family:'Malgun Gothic','Segoe UI',sans-serif}*{box-sizing:border-box}.paper{width:70mm;margin:12px;font-size:12px;line-height:1.75}.figure{display:flex;justify-content:center;margin:14px 0}.figure svg{display:block;height:auto;overflow:visible}.tag{font-size:11px;color:#444}.solution{border-top:1px solid #aaa;margin-top:16px;padding-top:10px}.katex{font-size:1.08em}p{margin:8px 0}table{width:100%;border-collapse:collapse;font-size:11px;margin:10px 0}th,td{border:1px solid #aaa;padding:4px;text-align:center}.options{padding:0;list-style:none}.options li{margin:7px 0}.grid{display:grid;grid-template-columns:repeat(2,310px);gap:12px;padding:16px}.cell{width:310px;min-height:180px;padding:12px;border:1px solid #ddd}.cell p{font-size:12px}.cell svg{height:auto;display:block;overflow:visible}`;
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const inline=(s:string)=>s.split(/(\$[^$]+\$)/g).map(x=>x.startsWith('$')?katex.renderToString(x.slice(1,-1),{...UI_KATEX_OPTIONS,throwOnError:true}):esc(x)).join('');
function markdown(s:string){
 const safety=checkPaperRender(s);assert(safety.safe,safety.why.join(';'));
 const tree=unified().use(remarkParse).use(remarkGfm).use(remarkMath).parse(preprocessMarkdown(s));
 function walk(n:any):string{
  const children=()=> (n.children??[]).map(walk).join('');
  if(n.type==='text')return esc(n.value??'');
  if(n.type==='inlineMath'||n.type==='math')return katex.renderToString(n.value??'',{...UI_KATEX_OPTIONS,throwOnError:true,displayMode:n.type==='math'});
  if(n.type==='paragraph')return `<p>${children()}</p>`;
  if(n.type==='table')return `<table>${(n.children??[]).map((r:any,i:number)=>`<tr>${(r.children??[]).map((c:any)=>`<${i?'td':'th'}>${(c.children??[]).map(walk).join('')}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table>`;
  if(n.type==='strong')return `<strong>${children()}</strong>`;
  if(n.type==='emphasis')return `<em>${children()}</em>`;
  if(n.type==='break')return '<br>';
  if(n.type==='list')return `<${n.ordered?'ol':'ul'}>${children()}</${n.ordered?'ol':'ul'}>`;
  if(n.type==='listItem')return `<li>${children()}</li>`;
  return n.value?esc(n.value):children();
 }
 return walk(tree);
}
fs.writeFileSync(path.join(qa,'render.css'),css);const head=`<!doctype html><meta charset="utf-8"><style>${css}</style>`;
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:660,height:900},deviceScaleFactor:2});
const requests:string[]=[];await page.route('**/*',r=>{requests.push(r.request().url());return r.abort();});
const results=[],figures=[],bindings=[];
try{
 for(const tag of fs.readdirSync(path.join(out,'candidates')).sort()){
  const file=path.join(out,'candidates',tag,`${tag}.json`);const b=bindCandidate(file);const c=b.candidate;
  assert(b.validation.structurallyValid);assert.equal(b.validation.surfaceKeywordViolations.length,0);
  bindings.push({questionNumber:c.questionNumber,candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,validation:b.validation});
  const assets=c.figureArtifacts.map((a:any,i:number)=>{
   const svg=fs.readFileSync(path.join(out,'candidates',tag,a.svgPath),'utf8');figures.push({tag,i,svg,width:a.intendedWidthMm});
   return `<div class="figure">${svg.replace('<svg ',`<svg style="width:${a.intendedWidthMm}mm" `)}</div>`;
  }).join('');
  const options=c.choices.length?`<ol class="options">${c.choices.map((v:string,i:number)=>`<li>${'①②③④⑤'[i]} ${inline(v)}</li>`).join('')}</ol>`:'';
  const student=`<article class="paper"><div class="tag">${tag} · 중3 · 2015 · ${c.score}점</div>${markdown(c.content)}${assets}${options}</article>`;
  const full=head+student.replace('</article>',`<div class="solution"><div class="tag">새 저자 풀이 · ${inline(c.answer)}</div>${markdown(c.solution)}</div></article>`);
  fs.writeFileSync(path.join(qa,`${tag}-author.html`),full.replace(head,'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="render.css">'));
  await page.setContent(head+student);await page.evaluate(()=>document.fonts.ready);
  await page.locator('article').screenshot({path:path.join(qa,`${tag}-student.png`)});
  await page.setContent(full);await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.paper .katex,table')].filter(e=>e.getBoundingClientRect().width>264.7).map(e=>({width:e.getBoundingClientRect().width,text:e.textContent?.slice(0,100)})));
  const widths=await page.locator('.figure svg').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().width/96*25.4));
  for(const width of widths)assert(Math.abs(width-70)<.01);
  await page.locator('article').screenshot({path:path.join(qa,`${tag}-author.png`)});
  results.push({questionNumber:c.questionNumber,actualColumnWidthMm:70,actualSvgWidthsMm:widths,mathOrTableOverflow:overflow,
    studentPng:{path:`qa/${tag}-student.png`,sha256:hash(path.join(qa,`${tag}-student.png`))},
    expandedAuthorPng:{path:`qa/${tag}-author.png`,sha256:hash(path.join(qa,`${tag}-author.png`))}});
 }
 for(let i=0;i<figures.length;i+=4){
  const content=`<div class="grid">${figures.slice(i,i+4).map((f:any)=>`<div class="cell"><p>${f.tag} / ${f.width}mm</p>${f.svg.replace('<svg ',`<svg style="width:${f.width}mm" `)}</div>`).join('')}</div>`;
  await page.setContent(head+content);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.grid').screenshot({path:path.join(qa,`figures-${i/4+1}.png`)});
 }
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'preview-layout.json'),JSON.stringify({tool:'local Playwright + existing product Markdown/KaTeX preprocessing and safety check',
  networkRequests:requests,actualColumnWidthMm:70,nativeReaderParity:false,authorImageInspectionPending:true,results},null,2)+'\n');
fs.writeFileSync(path.join(out,'bindings-preflight.json'),JSON.stringify({contract:'current candidatePack.mjs bindCandidate',bindings,authorOnly:true},null,2)+'\n');
console.log(JSON.stringify({questions:results.length,figures:figures.length,overflow:results.filter(x=>x.mathOrTableOverflow.length),networkRequests:requests}));
