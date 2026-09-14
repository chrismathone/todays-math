import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("http://localhost:3007/dev/print-paper", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const sels = await p.evaluate(() => {
  const sec = document.querySelector('[class*="problemText"], [class*="a4Page"], section[class*="page"]');
  if (!sec) return { err: "지면 섹션 없음" };
  const out = [];
  let i = 0;
  const walk = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode()) && i < 5) {
    const t = (n.textContent ?? "").trim();
    if (t.length < 4) continue;
    const el = n.parentElement;
    if (!el) continue;
    el.setAttribute("data-fp", String(i));
    out.push({ sel: `[data-fp="${i}"]`, text: t.slice(0, 18) });
    i += 1;
  }
  return { out };
});
if (sels.err) { console.log(sels.err); await b.close(); process.exit(0); }
const cdp = await p.context().newCDPSession(p);
await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
const doc = await cdp.send("DOM.getDocument", { depth: -1 });
for (const { sel, text } of sels.out) {
  const f = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
  const r = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: f.nodeId });
  const list = r.fonts.map((x) => `${x.familyName}(${x.glyphCount})${x.isCustomFont ? " [웹폰트]" : ""}`).join(" + ");
  console.log(`"${text}" -> ${list || "없음"}`);
}
await b.close();
