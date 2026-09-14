import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://localhost:3007/dev/ui-wire", { waitUntil: "networkidle" });

for (const w of [1440, 1024]) {
  await page.click(`button:has-text("${w}px")`);
  await page.waitForTimeout(200);
  const rows = await page.$$eval("section section", (secs) =>
    secs
      .filter((s) => s.querySelector("header"))
      .map((s) => {
        const h = s.querySelector("header");
        const box = s.querySelector("div[style]");
        const r = h.getBoundingClientRect();
        // 헤더 안의 모든 글자 노드가 상자 밖으로 나갔는지
        const frame = box ? box.getBoundingClientRect() : null;
        let overflow = 0;
        for (const el of h.querySelectorAll("*")) {
          const b = el.getBoundingClientRect();
          if (frame && b.width > 0 && b.right > frame.right + 0.5) overflow += 1;
        }
        return {
          title: s.querySelector("h3")?.textContent?.trim().slice(0, 2),
          height: Math.round(r.height),
          scrollW: h.scrollWidth,
          clientW: h.clientWidth,
          overflowNodes: overflow,
        };
      }),
  );
  console.log(`\n== ${w}px ==`);
  for (const r of rows)
    console.log(
      `  ${r.title}  높이 ${String(r.height).padStart(3)}px  · 가로 ${r.scrollW}/${r.clientW}${r.scrollW > r.clientW ? " ← 넘침" : ""}  · 상자 밖 노드 ${r.overflowNodes}`,
    );
}
console.log("\n페이지 오류:", errs.length ? errs.join(" || ") : "없음");
await browser.close();
