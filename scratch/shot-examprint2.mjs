import { chromium } from "@playwright/test";
const out = "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:3007/dev/exam-print", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);

// 🔴 눈금 — 이 셀렉터가 «있는 것»을 실제로 세는가. 앞 회차의 `[class*="box"]` 는
//    상자 클래스에 box 라는 글자가 없어서 구조적으로 0이었다.
const gauge = await p.evaluate(() => {
  const probe = document.createElement("div");
  probe.setAttribute("data-box-card", "");
  document.body.appendChild(probe);
  const n = document.querySelectorAll("[data-box-card]").length;
  probe.remove();
  return n;
});

const r = await p.evaluate(() => {
  const t = document.body.innerText;
  const cards = [...document.querySelectorAll("[data-box-card]")];
  return {
    cardCount: cards.length,
    headerCount: document.querySelectorAll("[data-box-header]").length,
    hasRawMarker: /<상자>|<나열>|〈상자〉|〈나열〉/.test(t),
    cards: cards.map((c) => {
      const cs = getComputedStyle(c);
      const box = c.getBoundingClientRect();
      return {
        border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
        header: c.querySelector("[data-box-header]")?.textContent?.trim() ?? null,
        w: Math.round(box.width),
        h: Math.round(box.height),
        text: c.innerText.replace(/\s+/g, " ").slice(0, 90),
      };
    }),
  };
});
console.log("눈금(일부러 넣은 상자를 세나): ", gauge, gauge >= 1 ? "🟢 센다" : "🔴 못 센다 — 판정 거부");
if (gauge < 1) process.exit(1);
console.log("상자 카드:", r.cardCount, "· 머리 라벨:", r.headerCount);
console.log("날 마커(<상자>/<나열>):", r.hasRawMarker);
for (const c of r.cards) console.log(" ·", JSON.stringify(c));
console.log("오류:", errs.length ? errs.join(" | ") : "없음");
await p.screenshot({ path: `${out}/exam-print-box.png`, fullPage: true });
await b.close();
