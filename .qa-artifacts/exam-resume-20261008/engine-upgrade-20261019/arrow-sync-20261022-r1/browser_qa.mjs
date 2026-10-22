import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import puppeteer from 'puppeteer-core';
const out=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd(),revision=process.argv[2]||'r1';
const cases=JSON.parse(fs.readFileSync(path.join(out,'native-cases.json'),'utf8'));
const files=JSON.parse(fs.readFileSync(path.join(out,'root-files.json'),'utf8')).concat(['scripts/figure/graph_scene.py','scripts/figure/elementary.py','scripts/figure/figure_assets.py','vendor/figure-engine/core/figure_quality.py']);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const code=files.map(p=>({path:p,sha256:sha(p)}));
const errors=[],blocked=[],results=[];let server,browser,page;
try{
 server=await createServer({configFile:false,envDir:false,root:out,publicDir:false,cacheDir:path.join(out,'.vite-browser-private'),resolve:{alias:{'@':path.join(root,'src')}},server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,fs.realpathSync('node_modules')]}}});
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,pipe:true,args:['--disable-background-networking','--no-first-run']});
 page=await browser.newPage();await page.setViewport({width:720,height:820,deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));await page.setRequestInterception(true);
 page.on('request',r=>{const u=r.url();if((u.startsWith(base+'/')&&!u.includes('/api/'))||u.startsWith('data:')||u.startsWith('blob:'))void r.continue();else{blocked.push(u);void r.abort();}});
 await page.goto(base,{waitUntil:'networkidle0'});await page.waitForFunction(()=>!!window.arrowQA);
 for(const c of cases){
  results.push(await page.evaluate(async c=>{
   const q=window.arrowQA,svg=q.prepareFigureSvg(c.sanitized),objects=q.figureObjects(svg),id=objects[0]?.id;
   const read=s=>new DOMParser().parseFromString(s,'image/svg+xml');
   const doc=read(svg),line=doc.querySelector('line');
   const [x1,y1,x2,y2]=['x1','y1','x2','y2'].map(k=>Number(line.getAttribute(k)));
   const moved=q.editFigureObject(svg,id,{x1:String(x1+7),y1:String(y1+3),x2:String(x2+7),y2:String(y2+3)});
   const turned=q.rotateFigureSelection(svg,[id],'cw');
   const copied=q.copyFigureSelection(svg,[id]);const pasted=q.pasteFigureSelection(svg,copied,12);
   const pdoc=read(pasted.svg),ids=[...pdoc.querySelectorAll('[id]')].map(n=>n.id);
   const references=[...pdoc.querySelectorAll('[marker-start],[marker-end]')].flatMap(n=>['marker-start','marker-end'].map(k=>n.getAttribute(k)).filter(Boolean).map(v=>/#([^)]*)/.exec(v)?.[1]));
   // XML attribute order is not semantic; compare complete objects by sorted keys.
   const stable=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
   const sameAfterReopen=stable(q.figureObjects(q.prepareFigureSvg(svg)))===stable(objects);
   const pixels=async s=>{
    const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
    await image.decode();const canvas=document.createElement('canvas');canvas.width=240;canvas.height=200;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,240,200);ctx.drawImage(image,0,0,240,200);
    return {data:ctx.getImageData(0,0,240,200).data,url:canvas.toDataURL()};
   };
   const a=await pixels(c.sanitized),b=await pixels(svg);
   let channelDifference=0,differentPixels=0;
   for(let i=0;i<a.data.length;i+=4){let delta=0;for(let k=0;k<4;k++)delta+=Math.abs(a.data[i+k]-b.data[i+k]);channelDifference+=delta;if(delta)differentPixels++;}
   const row=document.createElement('div');row.style.cssText='display:flex;gap:20px;align-items:center;font:14px sans-serif';
   const name=document.createElement('span');name.textContent=c.name;name.style.width='90px';row.append(name);
   for(const url of [a.url,b.url]){const img=document.createElement('img');img.src=url;img.style.width='240px';row.append(img);}document.body.append(row);
   const state={name:c.name,objects:objects.length,markers:doc.querySelectorAll('marker').length,headObjects:doc.querySelectorAll('polygon[data-object-id]').length,sameAfterReopen,
    movedObjects:q.figureObjects(moved).length,rotatedObjects:q.figureObjects(turned).length,pastedObjects:q.figureObjects(pasted.svg).length,
    pastedReferenceIDsUnique:new Set(ids).size===ids.length,pastedReferencesPresent:references.every(r=>ids.includes(r)),
    nativePixels:{channelDifference,differentPixels},pngBefore:a.url,pngAfter:b.url};
   state.passed=state.objects===1&&state.markers===(c.metadata==='both'?2:1)&&state.headObjects===0&&sameAfterReopen&&state.movedObjects===1&&state.rotatedObjects===1&&state.pastedObjects===2&&state.pastedReferenceIDsUnique&&state.pastedReferencesPresent&&differentPixels===0;
   return state;
  },c));
 }
 await page.screenshot({path:path.join(out,`arrow-comparison-${revision}.png`),fullPage:true});
 for(const r of results){for(const side of ['Before','After']){fs.writeFileSync(path.join(out,`${r.name}-${side.toLowerCase()}-${revision}.png`),Buffer.from(r['png'+side].split(',')[1],'base64'));delete r['png'+side];}}
}catch(e){errors.push(String(e.stack||e));}finally{if(browser)await browser.close();if(server)await server.close();}
const sourcesUnchanged=code.every(r=>sha(r.path)===r.sha256);
const report={utc:new Date().toISOString(),actualCurrentRootParser:true,driver:'one headless Microsoft Edge Chromium page, private Vite, no Next production build',results,errors,blocked,code,sourcesUnchanged,dbWrites:0,apiCalls:0,success:results.length===7&&results.every(r=>r.passed)&&!errors.length&&!blocked.length&&sourcesUnchanged};
fs.writeFileSync(path.join(out,`browser-results-${revision}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:results.length,passed:results.filter(r=>r.passed).length,errors,blocked,sourcesUnchanged}));process.exitCode=report.success?0:1;
