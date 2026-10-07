import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.env.EXPLORER_QA_URL ?? "http://localhost:4310";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error("Local preview only");
const output = resolve(".qa-artifacts/explorer-relearn");
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
page.setDefaultTimeout(60_000);
const errors=[], api=[], rows=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("request",r=>{if(new URL(r.url()).pathname.startsWith("/api/"))api.push(r.method()+" "+new URL(r.url()).pathname);});
const assert=(value,message)=>{if(!value)throw new Error(message);};
async function capture(name) {
 const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,
   dialogWidth:document.querySelector("dialog[open]")?.getBoundingClientRect().width??0,
   width:innerWidth}));
 assert(geometry.overflow===0,name+" overflow"); rows.push({name,...geometry});
 await page.screenshot({path:resolve(output,name+".png"),fullPage:true});
}
async function queue() { return page.evaluate(()=>window.__EXPLORER_SRS_PREVIEW__.relearn.queue()); }
async function advance(ms) {
 await page.evaluate(ms=>{window.__EXPLORER_SRS_PREVIEW__.advance(ms);window.dispatchEvent(new Event("focus"));},ms);
 await page.getByRole("button",{name:"추가 확인 시작",exact:true}).waitFor();
}
async function fillCheck(dialog) {
 const answers=await page.evaluate(async()=>{
   const fixture=window.__EXPLORER_SRS_PREVIEW__,q=await fixture.relearn.queue(),item=q.items.find(i=>i.state==="ready");
   return q.contents[item.conceptId].concept.propositions.find(p=>p.id===item.propositionId).pieces.filter(p=>p.kind==="target").map(p=>p.target.text);
 });
 const fields=dialog.getByRole("textbox");
 assert(await fields.count()===answers.length,"all targets erased");
 for(let i=0;i<answers.length;i++) await fields.nth(i).fill(answers[i]);
 if(answers.length>1){await fields.first().focus();await page.keyboard.press("Tab");assert(await fields.nth(1).evaluate(n=>n===document.activeElement),"Tab moves blank");}
 await fields.last().press("Enter");
 await dialog.getByRole("button",{name:"原래 학습으로".replace("原","원"),exact:true}).waitFor();
}
try {
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+"/dev/explorer-srs");
 await page.waitForFunction(()=>!!window.__EXPLORER_SRS_PREVIEW__?.relearn);
 await page.getByRole("button",{name:"배울 개념 고르기",exact:true}).click();
 await page.getByRole("button",{name:/선택하고 시작$/}).first().click();
 const session=page.locator('[data-fading-session][data-fading-mode="cards"]');
 await session.waitFor();
 for(let guard=0;guard<8 && await session.getAttribute("data-step")==="1";guard++){
   if(await page.locator('[data-card-side="front"]').count()){await session.focus();await page.keyboard.press("Enter");}
   await page.getByRole("button",{name:/처음 봄$/}).click();
 }
 await page.getByRole("textbox",{name:/빈칸 답 입력/}).waitFor();
 await page.getByRole("button",{name:"아직 모르겠어요",exact:true}).click();
 await page.waitForFunction(async()=> (await window.__EXPLORER_SRS_PREVIEW__.relearn.queue()).counts.waiting>0);
 const recorded=await queue();
 const queuedCount=recorded.items.length;
 assert(queuedCount===2 && recorded.items.every(item=>item.origin==="missed"),"step giveup queues both erased propositions");
 await page.getByRole("button",{name:"풀이 나가기",exact:true}).click();
 await page.getByRole("button",{name:"나가기",exact:true}).last().click();
 await page.locator("[data-explorer-home]").waitFor();
 const before=await page.evaluate(()=>JSON.stringify(window.__EXPLORER_SRS_PREVIEW__.source.snapshot()));
 await advance(61_000);
 await page.getByRole("button",{name:"추가 확인 시작",exact:true}).click();
 const dialog=page.locator("dialog[open]");
 await dialog.waitFor();
 assert(await dialog.getByRole("region",{name:"추가 확인 기준안 대조"}).count()===0,"no canonical before grade");
 for(const width of [320,390,768,1920]){await page.setViewportSize({width,height:844});await capture(width+"-cold");}
 const firstKey=(await queue()).items.find(item=>item.state==="ready").key;
 await fillCheck(dialog);
 assert((await queue()).items.find(item=>item.key===firstKey)?.stage==="confirm","independent pass schedules five minutes");
 await capture("1920-result");
 await page.getByRole("button",{name:"원래 학습으로",exact:true}).click();
 for(let i=1;i<queuedCount;i++){
   await page.getByRole("button",{name:"추가 확인 시작",exact:true}).click();
   await fillCheck(dialog);
   await page.getByRole("button",{name:"원래 학습으로",exact:true}).click();
 }
 await advance(301_000);
 await page.getByRole("button",{name:"추가 확인 시작",exact:true}).click();
 await fillCheck(dialog);
 await page.getByRole("button",{name:"원래 학습으로",exact:true}).click();
 for(let i=1;i<queuedCount;i++){
   await page.getByRole("button",{name:"추가 확인 시작",exact:true}).click();
   await fillCheck(dialog);
   await page.getByRole("button",{name:"원래 학습으로",exact:true}).click();
 }
 assert((await queue()).items.length===0,"five-minute confirmations clear items");
 assert((await queue()).today.checks===2*queuedCount,"extra count separate and exact");
 assert(await page.evaluate(()=>JSON.stringify(window.__EXPLORER_SRS_PREVIEW__.source.snapshot()))===before,"long term and main session unchanged");
 assert(errors.length===0,errors.join("\n")); assert(api.length===0,"unexpected real API: "+api.join(","));
 await writeFile(resolve(output,"report.json"),JSON.stringify({rows,actualStepGiveup:true,checks:2*queuedCount,mainUnchanged:true,errors,api},null,2));
 process.stdout.write("Minute recall: actual step giveup, 1min/5min checks, four widths, unchanged main record, 0 errors/API.\n");
}catch(error){await page.screenshot({path:resolve(output,"failure.png"),fullPage:true});throw error;}
finally {await browser.close();}
