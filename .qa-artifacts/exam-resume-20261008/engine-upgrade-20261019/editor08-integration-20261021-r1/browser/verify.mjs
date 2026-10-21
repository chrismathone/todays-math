import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import puppeteer from 'puppeteer-core';
const out=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd(),revision=process.argv[2];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=[...JSON.parse(fs.readFileSync(path.join(out,'../root-files.json'),'utf8')),
 'src/components/unified/figure-editor/figureAssetGeometry.ts','src/lib/figure/asset-editor-geometry.json',
 'src/lib/figure/asset-editor-geometry-legacy-20261021.json',...fs.readdirSync('public/figure-assets').map(p=>'public/figure-assets/'+p)];
const code=[...new Set(files)].map(p=>({path:p,sha256:sha(p)}));
const results=[],errors=[],blocked=[],consoleErrors=[];let server,browser,page;
const objects=()=>[...document.querySelectorAll('#figure-editor-canvas [data-object-id]')].map(el=>({id:el.getAttribute('data-object-id'),html:el.outerHTML}));
const asset=()=>{const el=document.querySelector('#figure-editor-canvas [data-asset="building-3d"]');return el?{id:el.getAttribute('data-object-id'),n:el.getAttribute('data-n'),transform:el.getAttribute('transform'),body:el.innerHTML}:null;};
const groups=()=>[...document.querySelectorAll('#figure-editor-canvas [data-object-id]')].map(el=>({id:el.getAttribute('data-object-id'),stack:JSON.parse(el.getAttribute('data-group-stack')||'[]'),group:el.getAttribute('data-group')}));
async function shortcut(key,shift=false){await page.keyboard.down('Control');if(shift)await page.keyboard.down('Shift');await page.keyboard.press(key);if(shift)await page.keyboard.up('Shift');await page.keyboard.up('Control');}
try{
 server=await createServer({configFile:false,envDir:false,root:out,publicDir:path.join(root,'public'),cacheDir:path.join(out,'.vite-private-cache'),
 resolve:{alias:{'@':path.join(root,'src')}},esbuild:{jsx:'automatic'},define:{'process.env':'{}'},
 server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,fs.realpathSync(path.join(root,'node_modules'))]}}});
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,pipe:true,args:['--disable-background-networking','--no-first-run']});
 page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 await page.setRequestInterception(true);page.on('request',r=>{const u=r.url();if((u.startsWith(base+'/')&&!u.includes('/api/'))||u.startsWith('data:')||u.startsWith('blob:'))void r.continue();else{blocked.push(u);void r.abort();}});
 for(const [width,height] of [[1280,800],[768,800],[390,800],[320,800]]){
  await page.setViewport({width,height,deviceScaleFactor:1});await page.goto(base,{waitUntil:'networkidle0',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('[aria-label="도형 편집 캔버스"]')?.getAttribute('aria-busy')==='false'&&document.querySelector('#figure-editor-canvas [data-asset="house"]')&&!document.querySelector('#figure-editor-canvas text[data-mj]'),{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);const original=await page.evaluate(objects);
  await page.click('button[aria-label="그림 넣기"]');
  await page.waitForSelector('[role=tab][aria-selected=true]');
  const menuInitial=await page.evaluate(()=>{const p=document.querySelector('[role=region][aria-label="그림 넣기"]'),b=p.getBoundingClientRect();return{fit:b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight,flat:p.querySelector('[role=tab][aria-selected=true]')?.textContent};});
  await page.click('[role=tab][aria-selected=true]');await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('[role=tab][aria-selected=true]')?.textContent.includes('입체'));
  await page.screenshot({path:path.join(out,`menu-${width}-${revision}.png`)});
  await page.click('button[title^="건물(입체) —"]');
  await page.waitForFunction(()=>document.querySelector('#figure-editor-canvas [data-asset="building-3d"]')&&document.querySelector('[aria-label="도형 편집 캔버스"]')?.getAttribute('aria-busy')==='false');
  const inserted=await page.evaluate(asset);
  const unchangedAfterInsert=JSON.stringify((await page.evaluate(objects)).filter(o=>o.id!==inserted.id))===JSON.stringify(original);
  const cursors=await page.evaluate(()=>[...document.querySelectorAll('[data-figure-handle]')].map(el=>({key:el.getAttribute('data-figure-handle'),cursor:el.style.cursor})));
  await shortcut('z');await page.waitForFunction(()=>!document.querySelector('#figure-editor-canvas [data-asset="building-3d"]'));
  const undoOnlyInsertion=JSON.stringify(await page.evaluate(objects))===JSON.stringify(original);
  await shortcut('y');await page.waitForFunction(()=>!!document.querySelector('#figure-editor-canvas [data-asset="building-3d"]'));
  const restored=await page.evaluate(asset);
  await page.evaluate(()=>document.querySelector('[aria-label="도형 편집 캔버스"]').focus());
  await shortcut('a');await shortcut('g');const inner=await page.evaluate(groups);
  await shortcut('g');const outer=await page.evaluate(groups);
  await shortcut('g',true);const once=await page.evaluate(groups);
  await shortcut('g',true);const twice=await page.evaluate(groups);
  const depth=d=>Math.max(...d.map(r=>r.stack.length));
  const groupLayers=[depth(inner),depth(outer),depth(once),depth(twice)];
  const current=await page.evaluate(objects);
  const unchangedAfterGroups=JSON.stringify(current.filter(o=>o.id!==inserted.id))===JSON.stringify(original);
  const state=await page.evaluate(()=>{const b=document.querySelector('dialog').getBoundingClientRect();return{fit:b.left>=-.5&&b.right<=innerWidth+.5&&document.documentElement.scrollWidth<=innerWidth,objects:document.querySelectorAll('#figure-editor-canvas [data-object-id]').length,childObjects:document.querySelectorAll('#figure-editor-canvas [data-asset] [data-object-id]').length,legacyHouse:!!document.querySelector('#figure-editor-canvas [data-asset="house"]')};});
  await page.screenshot({path:path.join(out,`editor-${width}-${revision}.png`)});
  const passed=menuInitial.fit&&menuInitial.flat.includes('평면')&&unchangedAfterInsert&&undoOnlyInsertion&&unchangedAfterGroups&&JSON.stringify(groupLayers)==='[1,2,1,0]'&&inserted.id===restored.id&&inserted.n===restored.n&&inserted.body===restored.body&&state.fit&&state.objects===original.length+1&&state.childObjects===0&&state.legacyHouse&&cursors.some(r=>r.cursor.endsWith('-resize'));
  results.push({width,height,passed,menuInitial,unchangedAfterInsert,undoOnlyInsertion,unchangedAfterGroups,groupLayers,state,cursors,insertedID:inserted.id,restoredID:restored.id});
 }
}catch(e){errors.push(String(e.stack||e));if(page&&!page.isClosed()){
 fs.writeFileSync(path.join(out,`failure-${revision}.json`),JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,svg:document.querySelector('#figure-editor-canvas')?.innerHTML})),null,2)+'\n');await page.screenshot({path:path.join(out,`failure-${revision}.png`)}).catch(()=>{});
}}finally{if(browser)await browser.close();if(server)await server.close();}
const same=code.every(r=>sha(r.path)===r.sha256);
const report={utc:new Date().toISOString(),results,errors,blocked,consoleErrors,code,sourcesUnchanged:same,actualRootComponent:true,driver:'private Vite+actual Root React components and content-derived public SVGs; not a Next production build',operationalAPIOrDBCalls:0,newAuthoredOrApprovedQuestions:0,wholeWorkspaceOrPrintCertified:false,success:results.length===4&&results.every(r=>r.passed)&&!errors.length&&!blocked.length&&same};
fs.writeFileSync(path.join(out,`browser-results-${revision}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({viewports:results.length,passed:results.filter(r=>r.passed).length,errors,blocked,sourcesUnchanged:same}));process.exitCode=report.success?0:1;
