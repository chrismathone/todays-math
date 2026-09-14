import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto("http://localhost:3007/dev/ui-wire", { waitUntil: "networkidle" });
await page.click('button:has-text("1024px")');
await page.waitForTimeout(300);
const sec = await page.$$("section");
for (const s of sec) {
  const h2 = await s.$("h2");
  if (h2 && (await h2.textContent())?.includes("UI-01")) {
    await s.screenshot({ path: `${out}/hdr-1024.png` });
    break;
  }
}
await browser.close();
console.log("찍음");
