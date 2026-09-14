import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const hits = [];
p.on("response", (r) => { if (/\.woff2?(\?|$)/i.test(r.url())) hits.push(`${r.status()} ${r.url().split("/").pop()}`); });
await p.goto("http://localhost:3007/dev/print-paper", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const r = await p.evaluate(() => {
  const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
  // 지면 본문 한 조각을 골라 폭을 잰다 — 자체 적재분이 안 붙으면 폭이 달라진다.
  const probe = document.createElement("span");
  probe.textContent = "다음 이차방정식의 두 근의 합을 구하시오";
  probe.style.cssText = "position:absolute;white-space:nowrap;font-size:12.5px;font-family:var(--paper-font-serif)";
  const host = document.querySelector('[class*="a4Page"]') ?? document.body;
  host.appendChild(probe);
  const withVar = probe.getBoundingClientRect().width;
  probe.style.fontFamily = '"Noto Serif KR"';
  const systemOnly = probe.getBoundingClientRect().width;
  probe.style.fontFamily = "notoSerifKR";
  const selfOnly = probe.getBoundingClientRect().width;
  probe.style.fontFamily = "Batang";
  const batang = probe.getBoundingClientRect().width;
  probe.remove();
  return { loaded, withVar, systemOnly, selfOnly, batang };
});
console.log("받은 웹폰트:", hits.join(" | ") || "없음");
console.log("적재 완료:", r.loaded.join(", ") || "없음");
console.log(`지면 스택 폭 ${r.withVar} · 자체적재만 ${r.selfOnly} · 시스템만 ${r.systemOnly} · Batang ${r.batang}`);
await b.close();
