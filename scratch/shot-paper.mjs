import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3007/dev/print-paper", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const rep = await p.evaluate(() => {
  const rows = [...document.querySelectorAll("li, tr")]
    .map((el) => (el.textContent ?? "").trim().replace(/\s+/g, " "))
    .filter((t) => /\d\s*\/\s*\d|채움|got|want/.test(t) || /—/.test(t));
  const pages = document.querySelectorAll('[class*="a4Page"]').length;
  return { rows: rows.slice(0, 20), pages };
});
console.log("지면 장수:", rep.pages);
for (const r of rep.rows) console.log("  " + r.slice(0, 110));
console.log("오류:", errs.length ? errs.join(" | ") : "없음");
await p.screenshot({ path: `${out}/print-paper.png`, fullPage: false });
await b.close();
