import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import puppeteer from 'puppeteer-core';

const out=path.dirname(fileURLToPath(import.meta.url));
const root=process.cwd();
const revision=process.argv[2]||'r1';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const code=JSON.parse(fs.readFileSync(path.join(out,'../typescript-root-files.json'),'utf8')).map(p=>({path:p,sha256:sha(p)}));
const results=[],errors=[],blocked=[],consoleErrors=[];
let browser,server,page;
const snapshot=()=>[...document.querySelectorAll('#figure-editor-canvas [data-object-id]')].map(el=>({
 id:el.getAttribute('data-object-id'),tag:el.localName,
 attributes:Object.fromEntries(['x','y','x1','y1','x2','y2','cx','cy','r','d','points','transform','data-mj'].filter(a=>el.hasAttribute(a)).map(a=>[a,el.getAttribute(a)]))
}));
try{
 server=await createServer({configFile:false,envDir:false,root:out,publicDir:path.join(root,'public'),
   cacheDir:path.join(out,'.vite-private-cache'),resolve:{alias:{'@':path.join(root,'src')}},
   esbuild:{jsx:'automatic'},define:{'process.env':'{}'},
   server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,fs.realpathSync(path.join(root,'node_modules'))]}}});
 await server.listen();
 const address=server.httpServer.address();const base=`http://127.0.0.1:${address.port}`;
 browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
   headless:true,pipe:true,args:['--disable-background-networking','--no-first-run']});
 page=await browser.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.setRequestInterception(true);
 page.on('request',r=>{const u=r.url();if(u.startsWith(base+'/')&&!u.includes('/api/')||u.startsWith('data:')||u.startsWith('blob:'))void r.continue();else{blocked.push(u);void r.abort();}});
 for(const [width,height] of [[1920,900],[1280,800],[1050,800],[768,800],[760,800],[390,800],[320,800],[1280,600]]){
   await page.setViewport({width,height,deviceScaleFactor:1});
   await page.goto(base,{waitUntil:'networkidle0',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('[aria-label="도형 편집 캔버스"]')?.getAttribute('aria-busy')==='false',{timeout:60000});
   await page.evaluate(()=>document.fonts.ready);
   const fold=await page.evaluateHandle(()=>[...document.querySelectorAll('button[aria-expanded]')].find(b=>b.textContent.includes('모눈')));
   await fold.asElement().click();await fold.dispose();
   await page.waitForSelector('input[aria-label="모눈 가로 칸"]',{visible:true});
   const geometryBefore=await page.evaluate(snapshot);
   const input=await page.$('input[aria-label="모눈 가로 칸"]');
   await input.click();await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');
   await page.keyboard.sendCharacter('12');await page.keyboard.press('Tab');
   await page.waitForFunction(()=>document.querySelector('input[aria-label="모눈 가로 칸"]')?.value==='12');
   await new Promise(r=>setTimeout(r,500));
   const geometryAfter=await page.evaluate(snapshot);
   const box=await page.evaluate(()=>{const d=document.querySelector('dialog').getBoundingClientRect();return{
     left:d.left,right:d.right,top:d.top,bottom:d.bottom,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,
     grid:document.querySelector('#figure-editor-canvas [data-grid]')?.getAttribute('data-grid'),
     rawMathLabels:document.querySelectorAll('#figure-editor-canvas text[data-mj]').length,
     vectorChips:document.querySelectorAll('[data-figure-list-number] svg[role="img"]').length,
     hiddenControls:[...document.querySelectorAll('[role="group"][hidden] input,[role="group"][hidden] button')].length
   };});
   const same=JSON.stringify(geometryBefore)===JSON.stringify(geometryAfter);
   const inViewport=box.left>=-.5&&box.right<=width+.5&&box.top>=-.5&&box.bottom<=height+.5&&box.documentWidth<=width;
   await input.evaluate(el=>el.scrollIntoView({block:'center'}));
   await page.screenshot({path:path.join(out,`viewport-${width}-${height}-${revision}.png`)});
   results.push({width,height,nonGridGeometryUnchanged:same,dialogAndDocumentFit:inViewport,box,
     screenshot:`viewport-${width}-${height}-${revision}.png`,passed:same&&inViewport&&!!box.grid&&box.rawMathLabels===0&&box.vectorChips===2});
 }
}catch(e){
 errors.push(String(e.stack||e));
 if(page&&!page.isClosed()){
   const state=await page.evaluate(()=>({text:document.body.innerText,input:document.querySelector('input[aria-label="모눈 가로 칸"]')?.value,active:document.activeElement?.outerHTML,svg:document.querySelector('#figure-editor-canvas')?.innerHTML})).catch(()=>null);
   fs.writeFileSync(path.join(out,`failure-state-${revision}.json`),JSON.stringify(state,null,2)+'\n');
   await page.screenshot({path:path.join(out,`failure-${revision}.png`)}).catch(()=>undefined);
 }
}
finally{if(browser)await browser.close();if(server)await server.close();}
const unchanged=code.every(r=>sha(r.path)===r.sha256);
const report={utc:new Date().toISOString(),results,errors,consoleErrors,blocked,code,sourcesUnchanged:unchanged,
 actualRootComponent:true,privateViteFixture:true,boundedTailwindScan:true,operationalAPIOrDBCalls:0,
 newAuthoredOrApprovedQuestions:0,pixelMathOracle:false,fullWorkspaceOrPrintReview:false,
 success:results.length===8&&results.every(r=>r.passed)&&!errors.length&&unchanged};
fs.writeFileSync(path.join(out,revision==='r1'?'browser-results.json':`browser-results-${revision}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({viewports:results.length,passed:results.filter(r=>r.passed).length,errors,consoleErrors:consoleErrors.length,sourcesUnchanged:unchanged}));
process.exitCode=report.success?0:1;
