import { chromium } from "@playwright/test";
import { freemem } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Run alone after the production measurement, never alongside another browser.
const out = resolve(
  "docs/design/mockups/answer-quick-key-h2-production-20261020",
);
await mkdir(out, { recursive: true });
const results = [];
for (const mode of ["default", "no-lcd"]) {
  if (freemem() < 3 * 2 ** 30) throw Error("Need 3GiB before Chromium");
  console.log(mode, (freemem() / 2 ** 30).toFixed(2), "GiB");
  const browser = await chromium.launch({
    args: mode === "no-lcd" ? ["--disable-lcd-text"] : [],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 1400 },
      deviceScaleFactor: 1,
    });
    await page.goto(
      pathToFileURL(
        resolve("docs/design/mockups/answer-quick-key-hifi-20261020.html"),
      ).href,
    );
    await page.waitForFunction(() => window.quickKeyHifiReady === true);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.body.classList.add("full"));
    const sample = page.locator(".sheet.h2").first();
    const metrics = await sample.evaluate((root) => {
      const cells = [...root.querySelectorAll(".key-cell")];
      return [10, 19, 25].map((number) => {
        const cell = cells.find(
          (c) => Number(c.querySelector(".number")?.textContent) === number,
        );
        const answer = cell.querySelector(".answer");
        const walker = document.createTreeWalker(answer, NodeFilter.SHOW_TEXT),
          leaves = [];
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (
            n.textContent.trim() &&
            !n.parentElement.closest(".katex-mathml")
          ) {
            n.parentElement.dataset.colorProbe = String(number);
            leaves.push({
              text: n.textContent,
              color: getComputedStyle(n.parentElement).color,
            });
          }
        }
        return { number, leaves };
      });
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument");
    const fonts = [];
    for (const number of [10, 19, 25]) {
      const { nodeId } = await cdp.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: `[data-color-probe="${number}"]`,
      });
      fonts.push({
        number,
        ...(await cdp.send("CSS.getPlatformFontsForNode", { nodeId })),
      });
      await sample
        .locator(".key-cell")
        .filter({ has: page.locator(`.number:text-is("${number}")`) })
        .first()
        .screenshot({ path: resolve(out, `color-${mode}-${number}.png`) });
    }
    await cdp.detach();
    results.push({ mode, metrics, fonts });
    await writeFile(
      resolve(out, "color-audit.json"),
      JSON.stringify(results, null, 2),
    );
  } finally {
    await browser.close();
    console.log("Chromium closed", mode);
  }
}
