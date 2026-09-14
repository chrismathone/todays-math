import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
const url = pathToFileURL("C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad/fontcmp.html").href;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const r = await p.evaluate(() => {
  const w = (id) => Math.round(document.getElementById(id).getBoundingClientRect().width * 100) / 100;
  return { s1: w("s1"), h1: w("h1"), s2: w("s2"), h2: w("h2") };
});
console.log(`본문 400  시스템 ${r.s1}  자체적재 ${r.h1}  차이 ${(r.h1 - r.s1).toFixed(2)}px`);
console.log(`굵게 800  시스템 ${r.s2}  자체적재 ${r.h2}  차이 ${(r.h2 - r.s2).toFixed(2)}px`);
await b.close();
