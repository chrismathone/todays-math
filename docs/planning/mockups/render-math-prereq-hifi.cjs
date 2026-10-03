"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("D:/todays-math/node_modules/playwright");

const htmlPath = path.resolve(
  __dirname,
  "../../design/mockups/math-prerequisite-hifi.html"
);
const shotDir = path.resolve(__dirname, "../../design/mockups/hifi-shots");

const widths = [
  ["pc", 1280],
  ["m390", 390],
  ["m320", 320],
];
const variants = ["h1", "h2", "h3", "h4"];
const parts = ["teacher", "reason", "supply"];

async function main() {
  fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "msedge",
  });
  const url = "file:///" + htmlPath.replace(/\\/g, "/");

  try {
    for (const [name, width] of widths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
      });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      for (const variant of variants) {
        for (const part of parts) {
          const locator = page.locator(
            "#" + variant + ' [data-shot="' + part + '"]'
          );
          await locator.screenshot({
            path: path.join(
              shotDir,
              variant + "-" + part + "-" + name + ".png"
            ),
          });
        }
      }
      const metrics = await page.evaluate((view) => {
        const detail = document.querySelector("#h2 .detail").getBoundingClientRect();
        const buttons = [...document.querySelectorAll("#h2 button, #h2 a.jump, #h2 input, #h2 select")];
        const short = buttons
          .map((node) => Math.round(node.getBoundingClientRect().height))
          .filter((height) => height < 44);
        const focused = document.querySelector('#h2 [data-focus="true"]');
        const focus = getComputedStyle(focused);
        return {
          view,
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
          detail: Math.round(detail.width),
          short: short.length,
          focus: focus.outlineWidth + " " + focus.outlineStyle,
        };
      }, width);
      console.log(JSON.stringify(metrics));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
