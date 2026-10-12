import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const out=path.dirname(fileURLToPath(import.meta.url));const own=path.resolve(out,'../../..');const root=path.resolve(own,'../exam-extraction-resume-20261008');
const require=createRequire(path.join(root,'package.json'));const {chromium}=require('playwright');const katex=require('katex');
const sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
process.env.PYTHONDONTWRITEBYTECODE='1';process.env.FIGURE_ENGINE_PATH=path.join(root,'vendor/figure-engine');process.chdir(root);
const {renderFigureSpec}=await import(pathToFileURL(path.join(root,'src/lib/figure/renderFigureSpec.ts')).href);
const {UI_KATEX_OPTIONS}=await import(pathToFileURL(path.join(root,'src/lib/math/katexRender.ts')).href);
const specPath=path.join(out,'inputs/package/private/q22/figure-1.spec.json');const svgPath=path.join(out,'inputs/package/private/q22/figure-1.svg');
const spec=JSON.parse(fs.readFileSync(specPath,'utf8'));const result=await renderFigureSpec(spec,{strict:true,typeset:true});assert(result.ok,result.ok?'':result.error);
assert.equal(result.droppedDimensions?.length??0,0);fs.mkdirSync(path.join(out,'qa'),{recursive:true});
const regenerated=path.join(out,'qa/q22-strict-rerender.svg');assert(!fs.existsSync(regenerated));fs.writeFileSync(regenerated,result.svg);
const engineFiles=['src/lib/figure/renderFigureSpec.ts','scripts/figure/render_spec.py','scripts/figure/engine_path.py','src/lib/figure/mathjaxSubstitute.ts'];
fs.writeFileSync(path.join(out,'strict-engine-check.json'),JSON.stringify({strict:true,typeset:true,droppedDimensions:[],specSha256:sha(specPath),
 suppliedSvgSha256:sha(svgPath),rerenderedSvgSha256:sha(regenerated),rerenderByteIdentical:sha(svgPath)===sha(regenerated),
 suppliedSpecAndSvgUnedited:true,pythonBytecodeDisabled:true,rootSharedDependenciesWritten:false,engineFiles:engineFiles.map(p=>({path:path.join(root,p),sha256:sha(path.join(root,p))})),
 nativeProvenanceOrReaderParityApproved:false},null,2)+'\n');
const candidate=JSON.parse(fs.readFileSync(path.join(out,'inputs/package/private/q22/candidate.json'),'utf8'));
const dist=path.join(root,'node_modules/katex/dist');let css=fs.readFileSync(path.join(dist,'katex.min.css'),'utf8').replace(/url\((fonts\/[^)]+)\)/g,(_:string,f:string)=>`url(data:font/${f.endsWith('.woff2')?'woff2':'woff'};base64,${fs.readFileSync(path.join(dist,f)).toString('base64')})`);
css+=`body{margin:0;background:white;color:#111;font-family:'Malgun Gothic','Segoe UI',sans-serif}.paper{width:70mm;margin:12px;font-size:12px;line-height:1.75}.figure{margin:12px 0}.figure svg{width:70mm;height:auto;display:block}.katex{font-size:1.08em}p{margin:8px 0}.options{list-style:none;padding:0}.options li{margin:7px 0}.solution{border-top:1px solid #aaa;margin-top:16px;padding-top:10px}.tag{font-size:11px;color:#444}`;
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const inline=(s:string)=>s.split(/(\$[^$]+\$)/g).map(x=>x.startsWith('$')?katex.renderToString(x.slice(1,-1),{...UI_KATEX_OPTIONS,throwOnError:true}):esc(x)).join('');
const paras=(s:string)=>s.split(/\n\s*\n/).map(p=>`<p>${inline(p)}</p>`).join('');
const student=`<div class="tag">q22-r2 · 중3 · 2015 · 4점</div>${paras(candidate.content)}<div class="figure">${fs.readFileSync(svgPath,'utf8')}</div><ol class="options">${candidate.choices.map((s:string,i:number)=>`<li>${'①②③④⑤'[i]} ${inline(s)}</li>`).join('')}</ol>`;
const solution=`<div class="solution"><div class="tag">새 저자 답 · ${inline(candidate.answer)}</div>${paras(candidate.solution)}</div>`;
const html=`<!doctype html><meta charset="utf-8"><style>${css}</style><article class="paper">${student}${solution}</article>`;
fs.writeFileSync(path.join(out,'qa/q22-expanded.html'),html);
const browser=await chromium.launch({headless:true});const page=await browser.newPage({deviceScaleFactor:2,viewport:{width:1000,height:1000}});const requests:string[]=[];
await page.route('**/*',r=>{requests.push(r.request().url());return r.abort();});await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
const bounds=await page.locator('.paper').boundingBox();assert(bounds);assert(Math.abs(bounds.width/96*25.4-70)<.01);
const widths=await page.locator('.figure svg').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width/96*25.4));assert(widths.length===1&&Math.abs(widths[0]-70)<.01);
const overflow=await page.locator('.katex').evaluateAll(ns=>ns.map(n=>({text:n.textContent,width:n.getBoundingClientRect().width})).filter(n=>n.width>70/25.4*96+.5));assert.equal(overflow.length,0);
const png=path.join(out,'qa/q22-expanded.png');await page.locator('.paper').screenshot({path:png});
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><article class="paper">${student}</article>`);await page.evaluate(()=>document.fonts.ready);await page.locator('.paper').screenshot({path:path.join(out,'qa/q22-student.png')});
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><div class="figure">${fs.readFileSync(regenerated,'utf8')}</div>`);await page.locator('.figure').screenshot({path:path.join(out,'qa/q22-rerendered-figure.png')});
await browser.close();assert.equal(requests.length,0);
fs.writeFileSync(path.join(out,'render-preview-check.json'),JSON.stringify({method:'Offline local expanded supplied author solution and supplied student SVG; current KaTeX options, no operational UI',
 candidateFileSha256:sha(path.join(out,'inputs/package/private/q22/candidate.json')),actualColumnWidthMm:bounds.width/96*25.4,actualSvgWidthsMm:widths,
 overflow,networkRequests:requests,expandedPng:{path:'qa/q22-expanded.png',sha256:sha(png)},studentPng:{path:'qa/q22-student.png',sha256:sha(path.join(out,'qa/q22-student.png'))},
 regeneratedFigurePng:{path:'qa/q22-rerendered-figure.png',sha256:sha(path.join(out,'qa/q22-rerendered-figure.png'))},viewImageInspectionPending:true,
 noInputOrRawWrites:true,nativeReaderParity:false},null,2)+'\n');
console.log(JSON.stringify({strictEnginePassed:true,svgByteIdentical:sha(svgPath)===sha(regenerated),expandedColumnMm:bounds.width/96*25.4,overflow,networkRequests:requests}));
