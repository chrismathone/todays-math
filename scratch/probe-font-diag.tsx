import { chromium } from "@playwright/test";
import {
  paperDocument,
  renderPage,
  renderSlot,
  writeProbe,
} from "../scripts/qa/paperProbe";

async function main() {
  const url = writeProbe(
    "diag.html",
    await paperDocument([
      renderPage(
        "first",
        [
          renderSlot(
            {
              id: "d1",
              content: "다음 이차방정식의 두 근의 합을 구하시오. $x^2-5x+6=0$",
            },
            1,
          ),
        ],
        1,
      ),
    ]),
  );
  console.log(url);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1200 },
  });
  await page.goto(url, { waitUntil: "load" });

  const rows = await page.evaluate(() => {
    const out: Array<Record<string, string>> = [];
    const a4 = document.querySelector(".a4Page") as HTMLElement | null;
    out.push({
      sel: ".a4Page",
      varSerif: a4
        ? getComputedStyle(a4).getPropertyValue("--paper-font-serif")
        : "(없음)",
      font: a4 ? getComputedStyle(a4).fontFamily : "(없음)",
      styleAttr: a4 ? (a4.getAttribute("style") ?? "").slice(0, 120) : "(없음)",
    });
    for (const sel of [
      ".problemText",
      ".problemText p",
      ".questionNumber",
      ".academyName",
    ]) {
      const el = document.querySelector(sel) as HTMLElement | null;
      out.push({
        sel,
        varSerif: el
          ? getComputedStyle(el).getPropertyValue("--paper-font-serif")
          : "(없음)",
        font: el ? getComputedStyle(el).fontFamily : "(없음)",
        tag: el
          ? el.tagName + " · " + (el.textContent ?? "").slice(0, 24)
          : "(없음)",
      });
    }
    const pt = document.querySelector(".problemText");
    out.push({
      sel: "problemText HTML",
      html: pt ? pt.innerHTML.slice(0, 300) : "(없음)",
    });
    return out;
  });
  for (const r of rows) console.log(JSON.stringify(r, null, 1));

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument", { depth: -1 });
  for (const sel of [
    ".problemText",
    ".problemText p",
    ".questionNumber",
    ".academyName",
    ".conceptText",
  ]) {
    const f = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: sel,
    });
    if (!f.nodeId) {
      console.log(`CDP ${sel}: 노드 없음`);
      continue;
    }
    const r = await cdp.send("CSS.getPlatformFontsForNode", {
      nodeId: f.nodeId,
    });
    console.log(
      `CDP ${sel}: ` +
        (r.fonts
          .map((x) => x.familyName + "(" + x.glyphCount + ")")
          .join(" + ") || "없음"),
    );
  }

  const pdfPath =
    "D:/todays-math/node_modules/.cache/paper-probe/diag-screen.pdf";
  await page.pdf({ path: pdfPath, printBackground: true });
  console.log("PDF: " + pdfPath);
  await browser.close();
}
main();
