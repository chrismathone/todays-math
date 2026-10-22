import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import puppeteer from 'puppeteer-core';
const out=path.dirname(fileURLToPath(import.meta.url)),root=process.cwd(),revision=process.argv[2];
const pkg=path.join(out,'../independent-deps/node_modules/mathlive');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const code=JSON.parse(fs.readFileSync(path.join(out,'../root-files.json'),'utf8')).map(p=>({path:p,sha256:sha(p)}));
const results=[],errors=[],blocked=[],external=[],fontRequests=[];let server,browser,page;
const button=(text)=>`xpath/.//button[normalize-space(.)='${text}']`;
async function click(text){
 const handle=await page.waitForFunction(t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t||b.getAttribute('aria-label')===t||(t==='글자'&&b.title==='글자 (T)')),{},text);
 const b=handle.asElement();if(!b)throw Error(`Missing button ${text}`);await b.click();await handle.dispose();
}
try{
 server=await createServer({configFile:false,envDir:false,root:out,publicDir:path.join(root,'public'),cacheDir:path.join(out,'.vite-private'),resolve:{alias:[{find:'@',replacement:path.join(root,'src')},{find:'mathlive/fonts.css',replacement:path.join(pkg,'mathlive-fonts.css')},{find:'mathlive',replacement:path.join(pkg,'mathlive.mjs')}]},esbuild:{jsx:'automatic'},define:{'process.env':'{}'},server:{host:'127.0.0.1',port:0,strictPort:true,fs:{allow:[root,fs.realpathSync(path.join(root,'node_modules'))]}}});
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,pipe:true,args:['--disable-background-networking','--no-first-run','--disable-extensions','--renderer-process-limit=2']});
 page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.setRequestInterception(true);page.on('request',r=>{const u=r.url();if(u.includes('/mathlive/fonts/'))fontRequests.push(u);if((u.startsWith(base+'/')&&!u.includes('/api/'))||u.startsWith('data:')||u.startsWith('blob:'))void r.continue();else{external.push(u);blocked.push(u);void r.abort();}});
 for(const [width,height]of [[1280,900],[768,900],[390,900],[320,900]]){
  await page.setViewport({width,height,deviceScaleFactor:1});await page.goto(base,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.querySelector('[aria-label="도형 편집 캔버스"]')?.getAttribute('aria-busy')==='false'&&document.querySelector('#figure-editor-canvas [data-asset="house"]'),{timeout:60000});
  const beforeLoad=await page.evaluate(()=>!!customElements.get('math-field'));
  await click('글자');await click('수식편집기');await page.waitForSelector('math-field');
  const version=await page.evaluate(()=>document.querySelector('math-field').constructor.version);
  await page.evaluate(()=>{const m=document.querySelector('math-field');m.setValue('',{silenceNotifications:false});});
  await click('분수');await page.keyboard.type('1');await click('다음 칸');await page.keyboard.type('2');
  await page.evaluate(()=>document.fonts.ready);
  const latex=await page.evaluate(()=>document.querySelector('math-field').value);
  const fit=await page.evaluate(()=>{const b=document.querySelector('dialog').getBoundingClientRect();return b.left>=-.5&&b.right<=innerWidth+.5&&document.documentElement.scrollWidth<=innerWidth;});
  await page.screenshot({path:path.join(out,`math-${width}-${revision}.png`)});
  await click('수식');const tex=await page.$eval('input[aria-label$="수식"]',el=>el.value);
  const canvas=await page.$('#figure-editor-canvas');const box=await canvas.boundingBox();
  await page.mouse.click(box.x+box.width*.8,box.y+box.height*.65);
  await page.waitForFunction(()=>document.querySelectorAll('#figure-editor-canvas [data-mj],#figure-editor-canvas [data-label]').length>0);
  await page.evaluate(()=>{window.qaDownload=null;window.qaExportEvents=0;window.addEventListener('figure:png-exported',()=>window.qaExportEvents++);HTMLAnchorElement.prototype.click=function(){if(this.download)window.qaDownload={name:this.download,href:this.href};};});
  await click('PNG 저장');await page.waitForFunction(()=>window.qaDownload?.href.startsWith('data:image/png;'),{timeout:60000});
  const png=await page.evaluate(()=>window.qaDownload);const exportEvents=await page.evaluate(()=>window.qaExportEvents);const pngBytes=Buffer.from(png.href.split(',')[1],'base64');
  fs.writeFileSync(path.join(out,`export-${width}-${revision}.png`),pngBytes);
  const stayedOpen=await page.$('dialog')!==null;
  await click('수식편집기');await page.waitForSelector('math-field');
  const beforeApply=await page.evaluate(()=>{window.qaDeferSave=true;return document.querySelector('math-field').value;});
  await click('도형 적용');await page.waitForFunction(()=>typeof window.qaReleaseSave==='function');
  await page.evaluate(()=>document.querySelector('math-field').focus());await page.keyboard.type('9');
  const busyEditsBlocked=await page.evaluate(v=>document.querySelector('aside fieldset').inert&&document.querySelector('math-field').value===v,beforeApply);
  await page.evaluate(()=>window.qaReleaseSave());
  await page.waitForFunction(()=>!document.querySelector('dialog'),{timeout:60000});
  const saved=await page.evaluate(()=>window.qaSaved);await click('편집기 다시 열기');
  await page.waitForFunction(()=>document.querySelector('[aria-label="도형 편집 캔버스"]')?.getAttribute('aria-busy')==='false');
  const reopened=await page.evaluate(()=>[...document.querySelectorAll('#figure-editor-canvas [data-mj],#figure-editor-canvas [data-label]')].some(n=>(n.getAttribute('data-mj')||n.getAttribute('data-label')).includes('frac')));
  await page.screenshot({path:path.join(out,`reopened-${width}-${revision}.png`)});
  const fraction=/\\frac(?:12|\{1\}\{2\})/.test(latex)&&/\\frac(?:12|\{1\}\{2\})/.test(tex);
  const passed=version==='0.111.1'&&!beforeLoad&&fraction&&fit&&stayedOpen&&busyEditsBlocked&&exportEvents===1&&/^\d{12}_\d{6}\.png$/.test(png.name)&&pngBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&saved.svg.includes('frac')&&saved.dataUrl.startsWith('data:image/svg+xml')&&reopened;
  results.push({width,height,version,MathLiveRegisteredBeforeActivation:beforeLoad,fraction,latex,tex,fit,stayedOpen,busyEditsBlocked,exportEvents,downloadName:png.name,actualPNG_SHA256:crypto.createHash('sha256').update(pngBytes).digest('hex'),internalSVGPreserved:saved.svg.includes('frac')&&saved.dataUrl.startsWith('data:image/svg+xml'),reopened,passed});
 }
}catch(e){errors.push(String(e.stack||e));if(page&&!page.isClosed())await page.screenshot({path:path.join(out,`failure-${revision}.png`),fullPage:true}).catch(()=>{});}finally{if(browser)await browser.close();if(server)await server.close();}
const same=code.every(r=>sha(r.path)===r.sha256);
const report={utc:new Date().toISOString(),results,errors,blocked,external,fontRequests,code,sourcesUnchanged:same,actualRootEditor:true,driver:'one Edge Chromium page; private Vite and integrity-checked MathLive0.111.1; PNG anchor sink captured; actual host callback fixture, not shared DB',operationalCalls:0,sourceRepoWrites:0,wholeNextBuildOrPhysicalPrintCertified:false,success:results.length===4&&results.every(r=>r.passed)&&!errors.length&&!blocked.length&&same};
fs.writeFileSync(path.join(out,`browser-results-${revision}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({viewports:results.length,passed:results.filter(r=>r.passed).length,errors,blocked,sourcesUnchanged:same}));process.exitCode=report.success?0:1;
