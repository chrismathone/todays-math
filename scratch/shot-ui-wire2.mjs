import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.goto("http://localhost:3007/dev/ui-wire", { waitUntil: "networkidle" });
const secs = await page.$$("section");
// 최상위 항목 섹션만 (h2 를 가진 것)
let i = 0;
for (const s of secs) {
  const h2 = await s.$("h2");
  if (!h2) continue;
  const t = (await h2.textContent())?.slice(0, 6).replace(/[^\w-]/g, "");
  await s.screenshot({ path: `${out}/wire-${t || i}.png` });
  i += 1;
}
console.log("섹션 캡처:", i);
// 390px 에서 가로 넘침이 나는지
await page.click('button:has-text("390px")');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
console.log("390px 선택 시 페이지 가로 넘침:", overflow);
await browser.close();
