import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const out=path.dirname(fileURLToPath(import.meta.url));const own=path.resolve(out,'../../..');const root=path.resolve(own,'../exam-extraction-resume-20261008');
const {chromium}=createRequire(import.meta.url)(path.join(root,'node_modules/playwright'));
const svgPath=path.join(out,'blind/figures/q22-1.svg');const png=path.join(out,'figures-view/q22-1-70mm.png');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert(!fs.existsSync(png));fs.mkdirSync(path.dirname(png),{recursive:true});
const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}.figure{width:70mm}.figure svg{width:100%;height:auto;display:block}</style><div class="figure">${fs.readFileSync(svgPath,'utf8')}</div>`;
const browser=await chromium.launch({headless:true});const context=await browser.newContext({deviceScaleFactor:2,viewport:{width:700,height:700}});
const page=await context.newPage();const network=[];await page.route('**/*',r=>{network.push(r.request().url());return r.abort();});
await page.setContent(html);const bounds=await page.locator('.figure').boundingBox();assert(bounds);assert(Math.abs(bounds.width/96*25.4-70)<.01);
await page.locator('.figure').screenshot({path:png});await browser.close();assert.equal(network.length,0);
const receipt={inputSvg:{path:'blind/figures/q22-1.svg',sha256:hash(svgPath)},png:{path:'figures-view/q22-1-70mm.png',sha256:hash(png)},
 intendedWidthMm:70,actualSvgWidthMm:bounds.width/96*25.4,actualCssBounds:bounds,deviceScaleFactor:2,
 method:'Existing local headless Playwright displays only supplied student SVG at70mm; no new math drawing or PDF',
 priorAttempt:{library:'installed cairosvg Python module',result:'cairo shared library absent; no render or input writes before failure; no install attempted'},
 networkRequests:network,coordinatesOrPixelsUsedAsMathematicalOracle:false,actualViewImageInspectionPending:true,
 noSourceFigureOrOriginalSolutionRead:true};
fs.writeFileSync(path.join(out,'figure-render-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({rendered:true,widthMm:receipt.actualSvgWidthMm,networkRequests:network}));
