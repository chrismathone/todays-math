import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("http://localhost:3007/dev/print-specimen", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const r = await p.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const seen = new Map();
  for (const el of document.querySelectorAll("*")) {
    const ff = getComputedStyle(el).fontFamily;
    if (!seen.has(ff)) seen.set(ff, el.tagName + "." + (el.className || "").toString().slice(0, 30));
  }
  return {
    varSerif: root.getPropertyValue("--font-noto-serif-kr"),
    paperSerifOnRoot: root.getPropertyValue("--paper-font-serif"),
    families: [...seen.entries()].slice(0, 6),
    loaded: [...document.fonts].map((f) => `${f.family} ${f.status}`).slice(0, 6),
  };
});
console.log("--font-noto-serif-kr =", JSON.stringify(r.varSerif));
console.log("--paper-font-serif(root) =", JSON.stringify(r.paperSerifOnRoot));
console.log("적재된 웹폰트:", r.loaded.join(" | "));
for (const [ff, who] of r.families) console.log("  ", who, "=>", ff.slice(0, 90));
await b.close();
