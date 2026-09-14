import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3007/dev/exam-print", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const r = await p.evaluate(() => {
  const t = document.body.innerText;
  return {
    pages: document.querySelectorAll('[class*="Page"], [class*="page"]').length,
    hasRawMarker: /<상자>|<나열>|〈상자〉|〈나열〉/.test(t),
    boxes: document.querySelectorAll('[class*="box"], blockquote').length,
    head: t.slice(0, 160).replace(/\s+/g, " "),
  };
});
console.log("장수 후보:", r.pages, "· 상자류 노드:", r.boxes);
console.log("날 마커(<상자>/<나열>) 발견:", r.hasRawMarker);
console.log("머리:", r.head);
console.log("오류:", errs.length ? errs.join(" | ") : "없음");
await p.screenshot({ path: `${out}/exam-print.png`, fullPage: false });
await b.close();
