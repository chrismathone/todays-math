import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import katex from 'katex';
import {createHash} from 'node:crypto';
const b='.qa-artifacts/exam-resume-20261008/inverse-tangent-rectangle-prototype-20261020-r1/',out=b+'author-preview-r1/';fs.mkdirSync(out);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),escape=t=>t.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const math=t=>t.split('$').map((s,i)=>i%2?katex.renderToString(s,{throwOnError:true,strict:'error'}):escape(s)).join('').replaceAll('\n\n','</p><p>');
const input=b+'private-drafts10.json',before=hash(input),items=JSON.parse(fs.readFileSync(input,'utf8')).privateDrafts;
const css=pathToFileURL(path.resolve('node_modules/katex/dist/katex.min.css')).href;
const cards=items.map(({caseId,draft})=>`<article id="${caseId}"><h2>${caseId}</h2><p>${math(draft.content)}</p><img src="../${caseId}.svg"/><details><summary>내부 해설</summary><p>${math(draft.answer)}</p><p>${math(draft.solution)}</p></details></article>`).join('');
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><link rel="stylesheet" href="${css}"><style>*{box-sizing:border-box}body{margin:0;font-family:'Malgun Gothic';font-size:15px;line-height:1.8}main{width:185mm;margin:auto}article{padding:14px 10px;border-bottom:1px solid #bbb}img{display:block;width:70mm;max-width:100%;margin:15px auto}p{margin:10px 0}.katex{font-size:1.04em}details{background:#f5f7f6;padding:10px}.sheet{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;width:1200px;padding:16px}.sheet figure{margin:0}.sheet img{width:100%;height:280px;object-fit:contain}.sheet p{font-size:12px}</style><main><p>내부 factory10조건 · 공개 생성 보류 · 새 수작업 문항/그림 집계0</p>${cards}</main></html>`;
fs.writeFileSync(out+'preview.html',html,{flag:'wx'});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1100,height:1200},deviceScaleFactor:1.4});
try{
 await page.goto(pathToFileURL(path.resolve(out+'preview.html')).href);await page.evaluate(()=>document.fonts.ready);
 const images=await page.locator('img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0));assert(images);
 const overflow=await page.locator('article').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).length);assert.equal(overflow,0);
 await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 for(const id of ['case01','case05','case10'])await page.locator('#'+id).screenshot({path:out+id+'.solution.png'});
 const contact=`<!doctype html><html><meta charset="utf-8"><style>.sheet{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;width:1200px;padding:16px;font-family:'Malgun Gothic'}figure{margin:0}img{width:100%;height:290px;object-fit:contain}p{font-size:12px}</style><div class="sheet">${items.map(({caseId,draft})=>`<figure><p>${caseId} · width${draft.parameters.width}/part${draft.parameters.upperPart}</p><img src="../${caseId}.svg"/></figure>`).join('')}</div></html>`;
 fs.writeFileSync(out+'contactsheet.html',contact,{flag:'wx'});await page.goto(pathToFileURL(path.resolve(out+'contactsheet.html')).href);await page.locator('img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));await page.locator('.sheet').screenshot({path:out+'figures10.png'});
 assert.equal(hash(input),before);fs.writeFileSync(out+'render-receipt.json',JSON.stringify({utc:new Date().toISOString(),inputSha256:before,internalCases:10,actualSvgLoads:10,overflow:0,figureWidthMm:70,selectedFullSolutionsScreenshotted:3,katexErrors:0,allSourceAndDraftsUnchanged:true,nativeReaderApproved:false,newManualQuestions:0,newCountedFigures:0,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({loaded:10,overflow,fullSolutionScreenshots:3,newManualCounts:0}));
}finally{await browser.close();}
