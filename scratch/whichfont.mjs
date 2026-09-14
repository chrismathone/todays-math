import { chromium } from "@playwright/test";

const HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="a" style="font-family:'Batang';font-size:12.5px">이차방정식의 해</div>
<div id="b" style="font-family:'Malgun Gothic';font-size:12.5px">이차방정식의 해</div>
<div id="c" style="font-family:'Noto Serif KR';font-size:12.5px">이차방정식의 해</div>
<div id="d" style="font-family:serif;font-size:12.5px">이차방정식의 해</div>
</body></html>`;

async function probe(label, opts) {
  let browser;
  try {
    browser = await chromium.launch(opts);
  } catch (e) {
    console.log(`${label}: 못 띄움 — ${String(e).split("\n")[0]}`);
    return;
  }
  const page = await browser.newPage();
  await page.setContent(HTML);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument", { depth: -1 });
  const out = [];
  for (const sel of ["#a", "#b", "#c", "#d"]) {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    out.push(`${sel}=${fonts.map((f) => f.familyName + "(" + f.glyphCount + ")").join("+") || "없음"}`);
  }
  const ver = browser.version();
  console.log(`${label} [${ver}]  ` + out.join("  "));
  await browser.close();
}

await probe("headless shell (기본)", {});
await probe("full chromium      ", { channel: "chromium" });
await probe("설치된 Chrome      ", { channel: "chrome" });
await probe("Edge               ", { channel: "msedge" });
