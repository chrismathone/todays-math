import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3000/dev/retry-wire", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);

// 실데이터 규모부터 찍는다 — 시안이 무엇 위에 섰는지가 판정의 전제다.
const head = await p.evaluate(() => document.body.innerText.split("\n").slice(0, 6).join(" | "));
console.log("머리:", head.replace(/\s+/g, " ").slice(0, 200));

for (const key of ["A", "B", "C", "D"]) {
  await p.getByRole("button", { name: new RegExp(`^${key}\.`) }).click();
  await p.waitForTimeout(150);
  // 이 안에서 «한 학생을 다 채점하는 데» 몇 번 눌러야 하나 — 실제로 눌러 센다.
  const box = await p.evaluate(() => {
    const sec = document.querySelector("section");
    const r = sec?.getBoundingClientRect();
    return { h: Math.round(r?.height ?? 0), scrollH: document.documentElement.scrollHeight };
  });
  console.log(`  ${key}안 · 본문 높이 ${box.h}px · 문서 ${box.scrollH}px ${box.scrollH > 1000 ? "(스크롤 필요)" : ""}`);
  await p.screenshot({ path: `${out}/retry-wire-${key}.png`, fullPage: true });
}
console.log("오류:", errs.length ? errs.join(" | ") : "없음");
await b.close();
