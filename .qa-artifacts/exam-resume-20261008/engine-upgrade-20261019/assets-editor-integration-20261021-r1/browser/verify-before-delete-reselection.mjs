import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import puppeteer from 'puppeteer-core';
const out=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd(),revision=process.argv[2];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const paths=[...new Set([...JSON.parse(fs.readFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrades-progress-r56.json','utf8')).code.map(r=>r.path),
 ...JSON.parse(fs.readFileSync(path.join(out,'../typescript-root-files.json'),'utf8')),'src/lib/figure/asset-editor-geometry.json','scripts/figure/build_asset_editor_registry.py'])];
const code=paths.map(p=>({path:p,sha256:sha(p)}));
const results=[],errors=[],blocked=[],consoleErrors=[];
let server,browser,page;
const asset=()=>{const el=document.querySelector('#figure-editor-canvas [data-asset]');return el?{transform:el.getAttribute('transform'),body:el.innerHTML,id:el.getAttribute('data-object-id'),n:el.getAttribute('data-n')}:null;};
const others=()=>[...document.querySelectorAll('#figure-editor-canvas [data-object-id]')].filter(el=>!el.hasAttribute('data-asset')).map(el=>({id:el.getAttribute('data-object-id'),html:el.outerHTML}));
async function shortcut(key){await page.keyboard.down('Control');await page.keyboard.press(key);await page.keyboard.up('Control');}
try{
 server=await createServer({configFile:false,envDir:false,root:out,publicDir:path.join(root,'public'),cacheDir:path.join(out,'.vite-private-cache'),
 resolve:{alias:{'@':path.join(root,'src')}},esbuild:{jsx:'automatic'},define:{'process.env':'{}'},
 server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,fs.realpathSync(path.join(root,'node_modules'))]}}});
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,pipe:true,args:['--disable-background-networking','--no-first-run']});
 page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.setRequestInterception(true);
 page.on('request',r=>{const u=r.url();if(u.startsWith(base+'/')&&!u.includes('/api/')||u.startsWith('data:')||u.startsWith('blob:'))void r.continue();else{blocked.push(u);void r.abort();}});
 for(const [width,height] of [[1280,800],[768,800],[390,800],[320,800]]){
  await page.setViewport({width,height,deviceScaleFactor:1});await page.goto(base,{waitUntil:'networkidle0',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('[aria-label="도형 편집 캔버스"]')?.getAttribute('aria-busy')==='false'&&document.querySelector('#figure-editor-canvas [data-asset]')&&!document.querySelector('#figure-editor-canvas text[data-mj]'),{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  const original=await page.evaluate(asset),unselected=await page.evaluate(others);
  await page.click(`[data-figure-list-number="${original.n}"]`);
  const button=await page.evaluateHandle(()=>[...document.querySelectorAll('section[aria-label="회전"] button')].find(b=>b.textContent.includes('시계 90°')&&!b.textContent.includes('반시계')));
  if(!button.asElement())throw Error('Actual rotate button unavailable');await button.asElement().click();await button.dispose();
  await page.waitForFunction(t=>document.querySelector('#figure-editor-canvas [data-asset]')?.getAttribute('transform')!==t,{},original.transform);
  const rotated=await page.evaluate(asset);
  await shortcut('z');await page.waitForFunction(t=>document.querySelector('#figure-editor-canvas [data-asset]')?.getAttribute('transform')===t,{},original.transform);
  const undone=await page.evaluate(asset);
  await shortcut('y');await page.waitForFunction(t=>document.querySelector('#figure-editor-canvas [data-asset]')?.getAttribute('transform')===t,{},rotated.transform);
  const redone=await page.evaluate(asset);
  const state=await page.evaluate(()=>{const d=document.querySelector('dialog').getBoundingClientRect();return{objectCount:document.querySelectorAll('#figure-editor-canvas [data-object-id]').length,
   rawMathLabels:document.querySelectorAll('#figure-editor-canvas text[data-mj]').length,
   unitUpright:!!document.querySelector('#figure-editor-canvas [data-label="30 m"] [data-c="6D"]')&&!document.querySelector('#figure-editor-canvas [data-label="30 m"] [data-c="1D45A"]'),
   childObjects:document.querySelectorAll('#figure-editor-canvas [data-asset] [data-object-id]').length,
   fit:d.left>=-.5&&d.right<=innerWidth+.5&&d.top>=-.5&&d.bottom<=innerHeight+.5&&document.documentElement.scrollWidth<=innerWidth};});
  const unchanged=JSON.stringify(await page.evaluate(others))===JSON.stringify(unselected);
  await page.screenshot({path:path.join(out,`asset-${width}-${height}-${revision}.png`)});
  // Delete the selected group using the actual keyboard binding, then undo it.
  await page.keyboard.press('Delete');await page.waitForFunction(()=>!document.querySelector('#figure-editor-canvas [data-asset]'));
  const onlyPictureDeleted=JSON.stringify(await page.evaluate(others))===JSON.stringify(unselected);
  await shortcut('z');await page.waitForFunction(()=>!!document.querySelector('#figure-editor-canvas [data-asset]'));
  const restored=await page.evaluate(asset);
  const passed=state.fit&&state.objectCount===8&&state.rawMathLabels===0&&state.unitUpright&&state.childObjects===0&&unchanged&&onlyPictureDeleted&&
   original.body===rotated.body&&original.body===undone.body&&original.body===redone.body&&original.body===restored.body&&original.n===rotated.n&&original.id===rotated.id;
  results.push({width,height,passed,state,unselectedGeometryUnchanged:unchanged,onlyPictureDeleted,original,rotated,undone,redone,restored});
 }
}catch(e){errors.push(String(e.stack||e));if(page&&!page.isClosed()){
 fs.writeFileSync(path.join(out,`failure-${revision}.json`),JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,svg:document.querySelector('#figure-editor-canvas')?.innerHTML})),null,2)+'\n');
 await page.screenshot({path:path.join(out,`failure-${revision}.png`)}).catch(()=>undefined);
}}finally{if(browser)await browser.close();if(server)await server.close();}
const same=code.every(r=>sha(r.path)===r.sha256);
const report={utc:new Date().toISOString(),results,errors,blocked,consoleErrors,code,sourcesUnchanged:same,actualRootComponent:true,
 operationalAPIOrDBCalls:0,newAuthoredOrApprovedQuestions:0,pixelMathOracle:false,wholeWorkspaceOrPrintCertified:false,
 success:results.length===4&&results.every(r=>r.passed)&&!errors.length&&same};
fs.writeFileSync(path.join(out,`browser-results-${revision}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({viewports:results.length,passed:results.filter(r=>r.passed).length,errors,sourcesUnchanged:same}));process.exitCode=report.success?0:1;
