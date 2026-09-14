import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("http://localhost:3007/dev/print-specimen", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const cdp = await p.context().newCDPSession(p);
await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
const doc = await cdp.send("DOM.getDocument", { depth: -1 });
// 명조를 받는 «글자를 담은 잎» 노드를 계산값으로 찾는다 (클래스가 해시라 이름으로 못 찾는다)
const sels = await p.evaluate(() => {
  const out = [];
  let i = 0;
  for (const el of document.querySelectorAll("*")) {
    if (el.children.length > 0) continue;
    if (!(el.textContent ?? "").trim()) continue;
    const ff = getComputedStyle(el).fontFamily;
    if (!/noto-serif|NotoSerifKR|KoPubBatang/i.test(ff)) continue;
    el.setAttribute("data-fontprobe", String(i));
    out.push(`[data-fontprobe="${i}"]`);
    i += 1;
    if (i >= 4) break;
  }
  return out;
});
console.log("명조를 받는 노드", sels.length, "개를 찾았다");
for (const sel of sels) {
  const f = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
  if (!f.nodeId) { console.log(`${sel}: 노드 없음`); continue; }
  const r = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: f.nodeId });
  const list = r.fonts.map((x) => `${x.familyName}(${x.glyphCount})${x.isCustomFont ? " [웹폰트]" : ""}`).join(" + ");
  console.log(`${sel}: ${list || "없음"}`);
}
await b.close();
