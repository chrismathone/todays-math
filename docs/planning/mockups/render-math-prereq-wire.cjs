"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("D:/todays-math/node_modules/playwright");

const htmlPath = path.resolve(
  __dirname,
  "../../design/mockups/math-prerequisite-wire.html"
);
const shotDir = path.resolve(
  __dirname,
  "../../design/mockups/wire-shots"
);

const widths = [
  ["pc", 1280],
  ["m390", 390],
  ["m320", 320],
];
const wires = ["w1", "w2", "w3", "w4"];
const parts = ["teacher", "reason", "unavail"];

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
      for (const wire of wires) {
        for (const part of parts) {
          const locator = page.locator(
            "#" + wire + ' [data-shot="' + part + '"]'
          );
          await locator.screenshot({
            path: path.join(shotDir, wire + "-" + part + "-" + name + ".png"),
          });
        }
      }
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
