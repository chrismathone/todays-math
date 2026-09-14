import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
const cdp = await p.context().newCDPSession(p);
await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
await p.goto("http://localhost:3007/dev/print-paper", { waitUntil: "networkidle" });
await p.emulateMedia({ media: "print" });
await p.evaluate(() => document.fonts.ready);
// 본문 글자를 **직접** 들고 있는 잎을 찾는다 — 컨테이너는 글자가 없어 늘 «(글자 없음)»이다.
const leaves = await p.evaluate(() => {
  const out = [];
  for (const box of document.querySelectorAll('[class*="problemText"]')) {
    for (const el of box.querySelectorAll("*")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim()).join("");
      if (/[가-힣]{2,}/.test(own)) { el.setAttribute("data-leaf", String(out.length)); out.push(own.slice(0, 40)); break; }
    }
    if (out.length >= 3) break;
  }
  return out;
});
console.log("잎 표본:", leaves.length, JSON.stringify(leaves));
if (!leaves.length) { console.log("🔴 표본 0 — 판정 거부"); process.exit(1); }
const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
for (let i = 0; i < leaves.length; i++) {
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-leaf="${i}"]` });
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  console.log(`  본문 잎 ${i}: ${fonts.map((f)=>`${f.familyName}×${f.glyphCount}`).join(", ")}`);
}
await b.close();
