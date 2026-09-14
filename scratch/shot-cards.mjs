import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://localhost:3007/dev/card-states", { waitUntil: "networkidle" });

// 각 상태 카드의 «액션 줄»에 무엇이 있는지 센다
const report = await page.evaluate(() => {
  const secs = [...document.querySelectorAll("section")];
  return secs.map((s) => {
    const title = s.querySelector("h2")?.textContent?.trim() ?? "";
    const btns = [...s.querySelectorAll("button")].map((b) => ({
      t: (b.textContent ?? "").trim().slice(0, 14),
      disabled: b.disabled,
      x: Math.round(b.getBoundingClientRect().left),
    }));
    const reason = s.querySelector("[data-ineligible-reason]")?.textContent?.trim() ?? null;
    return { title, btns, reason };
  });
});
for (const r of report) {
  console.log(`\n${r.title}`);
  for (const b of r.btns) console.log(`   x=${String(b.x).padStart(4)}  ${b.disabled ? "[비활성] " : "         "}${b.t}`);
  if (r.reason) console.log(`   사유: ${r.reason}`);
}
console.log("\n오류:", errs.length ? errs.join(" || ") : "없음");
await page.screenshot({ path: `${out}/card-states.png`, fullPage: true });
await browser.close();
