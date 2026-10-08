import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
if(fs.existsSync(path.join(root,'solve-freeze.json')))throw new Error('Blind results sealed; no preview overwrite.');
const req=createRequire('D:/todays-math/package.json');const {chromium}=req('playwright');const katex=req('katex');
const sha=b=>createHash('sha256').update(b).digest('hex');const questions=JSON.parse(fs.readFileSync(path.join(root,'student-problems.json'),'utf8'));
let css=fs.readFileSync('D:/todays-math/node_modules/katex/dist/katex.min.css','utf8').replace(/url\((fonts\/[^)]+)\)/g,(_,f)=>`url(data:font/woff;base64,${fs.readFileSync(path.join('D:/todays-math/node_modules/katex/dist',f)).toString('base64')})`);
css+="html,body{margin:0;background:white;color:#111;font-family:'Malgun Gothic','Segoe UI',sans-serif}*{box-sizing:border-box}article{width:70mm;font-size:12px;line-height:1.75}p{margin:9px 0}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #888;padding:2px;text-align:center}.katex{font-size:1.06em}.fig{display:flex;justify-content:center;margin:10px 0}.fig svg{height:auto;max-width:70mm}.opt{margin:9px 0}";
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const inline=s=>s.split(/(\$[^$]+\$)/g).map(t=>t.startsWith('$')?katex.renderToString(t.slice(1,-1),{throwOnError:true,strict:'error'}):esc(t)).join('');
function content(s){let html='',rs=[];function flush(){if(!rs.length)return;html+='<table>'+rs.filter(l=>!/^\|[\s:|\-]+\|$/.test(l)).map((l,i)=>'<tr>'+l.trim().slice(1,-1).split('|').map(t=>`<${i?'td':'th'}>${inline(t.trim())}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</table>';rs=[];}for(const l of s.split('\n')){if(l.trim().startsWith('|'))rs.push(l);else{flush();if(l.trim())html+='<p>'+inline(l)+'</p>';}}flush();return html;}
fs.mkdirSync(path.join(root,'inspection'),{recursive:true});const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:650,height:900},deviceScaleFactor:2});const requests=[];await page.route('**/*',r=>{requests.push(r.request().url());return r.abort();});const results=[];
for(const q of questions){
 const artifacts=[];fs.mkdirSync(path.join(root,'inspection','figures'),{recursive:true});
 for(let i=0;i<q.figures.length;i++){
  const f=q.figures[i],rel=f.svgPath??f.path,bytes=fs.readFileSync(path.join(root,rel));if(f.sha256&&sha(bytes)!==f.sha256)throw Error('Figure hash changed');
  const markup='<div class="fig">'+bytes.toString('utf8').replace('<svg ',`<svg style="width:${Math.min(f.intendedWidthMm??70,70)}mm" `)+'</div>';
  await page.setContent('<meta charset="utf-8"><style>'+css+'</style><article><p>q'+q.questionNumber+' / '+f.role+' / '+(i+1)+'</p>'+markup+'</article>');await page.evaluate(()=>document.fonts.ready);
  const png=`inspection/${rel.replace('.svg','.png')}`;await page.locator('article').screenshot({path:path.join(root,png)});
  artifacts.push({role:f.role,svgPath:rel,svgSha256:sha(bytes),widthMm:f.intendedWidthMm,png,pngSha256:sha(fs.readFileSync(path.join(root,png))),markup});
 }
 const stems=artifacts.filter(a=>a.role==='stem').map(a=>a.markup).join('');
 const choices=q.choices.map((t,i)=>{const f=artifacts.find(a=>a.role===`choice:${i+1}`);return '<div class="opt">'+'①②③④⑤'[i]+' '+(f?f.markup:inline(t))+'</div>';}).join('');
 const html='<meta charset="utf-8"><style>'+css+'</style><article><p>q'+q.questionNumber+' · '+q.score+'점</p>'+content(q.content)+stems+choices+'</article>';
 await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('article table,article .katex')].filter(e=>e.getBoundingClientRect().width>265).map(e=>({width:e.getBoundingClientRect().width,text:e.textContent.slice(0,90)})));
 const png=`inspection/q${String(q.questionNumber).padStart(2,'0')}.png`;await page.locator('article').screenshot({path:path.join(root,png)});
 results.push({questionNumber:q.questionNumber,studentDigest:q.studentDigest,columnWidthMm:70,png,pngSha256:sha(fs.readFileSync(path.join(root,png))),overflow,figureCount:q.figures.length,assets:artifacts.map(({markup,...a})=>a)});
}
await browser.close();fs.writeFileSync(path.join(root,'inspection/layout.json'),JSON.stringify({method:'student-only local Playwright+KaTeX; supplied SVG bytes inline, no author spec',networkRequests:requests,results},null,2)+'\n');console.log(JSON.stringify({questions:results.length,figures:results.reduce((s,r)=>s+r.figureCount,0),overflow:results.filter(r=>r.overflow.length),networkRequests:requests}));
