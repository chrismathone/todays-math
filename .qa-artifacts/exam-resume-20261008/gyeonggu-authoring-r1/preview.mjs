import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const root=path.dirname(fileURLToPath(import.meta.url));
if(fs.existsSync(path.join(root,'author-freeze.json')))throw new Error('Frozen author packet: create a new revision instead of overwriting inspected previews.');
const require=createRequire('D:/todays-math/package.json');
const {chromium}=require('playwright');const katex=require('katex');
const {bindCandidate}=await import(path.join(process.cwd(),'scripts/import/exam-twin/candidatePack.mjs').replaceAll('\\','/').replace(/^([A-Z]:)/,'file:///$1'));
const qa=path.join(root,'qa');fs.mkdirSync(qa,{recursive:true});
let css=fs.readFileSync('D:/todays-math/node_modules/katex/dist/katex.min.css','utf8').replace(/url\((fonts\/[^)]+)\)/g,(_,f)=>`url(data:font/${f.endsWith('.woff2')?'woff2':'woff'};base64,${fs.readFileSync(path.join('D:/todays-math/node_modules/katex/dist',f)).toString('base64')})`);
css+=`html,body{margin:0;background:#fff;color:#111;font-family:'Malgun Gothic','Segoe UI',sans-serif}*{box-sizing:border-box}.paper{width:70mm;margin:12px;font-size:12px;line-height:1.75}.figure{display:flex;justify-content:center;margin:14px 0}.figure svg{display:block;height:auto;overflow:visible}.tag{font-size:11px;color:#444}.solution{border-top:1px solid #aaa;margin-top:16px;padding-top:10px}.katex{font-size:1.08em}p{margin:8px 0}table{width:100%;border-collapse:collapse;font-size:11px;margin:10px 0}th,td{border:1px solid #aaa;padding:4px;text-align:center}.options{padding:0;list-style:none}.options li{margin:7px 0}.grid{display:grid;grid-template-columns:repeat(2,310px);gap:12px;padding:16px}.cell{width:310px;min-height:270px;padding:12px;border:1px solid #ddd}.cell p{font-size:12px}.cell svg{height:auto;display:block;overflow:visible}`;
function esc(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
function inline(s){return s.split(/(\$[^$]+\$)/g).map(x=>x.startsWith('$')?katex.renderToString(x.slice(1,-1),{throwOnError:true,strict:'error'}):esc(x)).join('');}
function markdown(s){const lines=s.split('\n');let out='',i=0;while(i<lines.length){if(!lines[i].trim()){i++;continue;}if(lines[i].trim().startsWith('|')){let rs=[];while(i<lines.length&&lines[i].trim().startsWith('|'))rs.push(lines[i++]);out+='<table>';for(let k=0;k<rs.length;k++){if(/^\|[\s:|\-]+\|$/.test(rs[k]))continue;out+='<tr>'+rs[k].trim().slice(1,-1).split('|').map(v=>`<${k===0?'th':'td'}>${inline(v.trim())}</${k===0?'th':'td'}>`).join('')+'</tr>';}out+='</table>';}else{out+='<p>'+inline(lines[i++])+'</p>';}}return out;}
const head=`<!doctype html><meta charset="utf-8"><style>${css}</style>`;
fs.writeFileSync(path.join(qa,'render.css'),css);
const savedHead='<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="render.css">';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:660,height:900},deviceScaleFactor:2});
let requests=[];await page.route('**/*',route=>{requests.push(route.request().url());return route.abort();});
let results=[],figures=[],bindings=[];
for(const q of fs.readdirSync(path.join(root,'candidates')).sort()){
  const file=path.join(root,'candidates',q,q+'.json');const c=JSON.parse(fs.readFileSync(file,'utf8'));const b=bindCandidate(file);
  bindings.push({questionNumber:c.questionNumber,candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,validation:b.validation});
  const fgs=c.figureArtifacts.map((a,i)=>{const svg=fs.readFileSync(path.join(root,'candidates',q,a.svgPath),'utf8');figures.push({q,index:i,svg,width:a.intendedWidthMm});return `<div class="figure">${svg.replace('<svg ',`<svg style="width:${a.intendedWidthMm}mm" `)}</div>`;}).join('');
  const opts=c.choices.length?'<ol class="options">'+c.choices.map((t,i)=>`<li>${'①②③④⑤'[i]} ${inline(t)}</li>`).join('')+'</ol>':'';
  const stem=`<article class="paper"><div class="tag">${q} · 중3 · 2015 · ${c.score}점</div>${markdown(c.content)}${fgs}${opts}</article>`;
  const full=`${head}${stem.replace('</article>',`<div class="solution"><div class="tag">새 저자 풀이 · ${inline(c.answer)}</div>${markdown(c.solution)}</div></article>`)}`;
  fs.writeFileSync(path.join(qa,q+'-author.html'),full.replace(head,savedHead));
  await page.setContent(head+stem);await page.evaluate(()=>document.fonts.ready);
  await page.locator('article').screenshot({path:path.join(qa,q+'-student.png')});
  await page.setContent(full);await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.paper .katex')].filter(e=>e.getBoundingClientRect().width>264.6).map(e=>({width:e.getBoundingClientRect().width,text:e.textContent.slice(0,150)})));
  await page.locator('article').screenshot({path:path.join(qa,q+'-author.png')});
  results.push({questionNumber:c.questionNumber,columnWidthMm:70,figureWidthsMm:c.figureArtifacts.map(a=>a.intendedWidthMm),studentPng:`qa/${q}-student.png`,authorPng:`qa/${q}-author.png`,mathOverflow:overflow,validation:b.validation});
}
for(let i=0;i<figures.length;i+=4){
  let body='<div class="grid">'+figures.slice(i,i+4).map(f=>`<div class="cell"><p>${f.q} / stem-${f.index+1} / ${f.width}mm</p>${f.svg.replace('<svg ',`<svg style="width:${f.width}mm" `)}</div>`).join('')+'</div>';
  await page.setContent(head+body);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.grid').screenshot({path:path.join(qa,`figures-${i/4+1}.png`)});
}
await browser.close();
fs.writeFileSync(path.join(root,'checks','preview-layout.json'),JSON.stringify({tool:'local Playwright + local KaTeX',networkRequests:requests,actualColumnWidthMm:70,authorInspectionPending:true,results},null,2)+'\n');
fs.writeFileSync(path.join(root,'checks','bindings-preflight.json'),JSON.stringify({canonicalContract:'candidatePack.mjs bindCandidate; candidateDigest=digest({candidate,assetBindings})',bindings},null,2)+'\n');
console.log(JSON.stringify({questions:results.length,figures:figures.length,overflow:results.filter(x=>x.mathOverflow.length).map(x=>({q:x.questionNumber,overflow:x.mathOverflow})),networkRequests:requests}));
