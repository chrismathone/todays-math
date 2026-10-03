// Local wireframe check. No app, database, network or real learner records.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const hifi = process.argv.includes("--hifi");
const url = pathToFileURL(path.resolve(`docs/design/mockups/english-listening-${hifi ? "hifi" : "wire"}.html`)).href;
const output = path.join(tmpdir(), `english-listening-${hifi ? "hifi" : "wire"}`);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
let views = 0;
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const variant of hifi ? ["H1", "H2", "H3", "H4"] : ["A", "B", "C", "D"]) {
      for (const scene of ["make", "classroom", "practice", "exam"]) {
        const key = hifi ? "theme" : "layout";
        const layout = hifi ? ["practice", "exam"].includes(scene) ? "B" : "A" : variant;
        await page.goto(`${url}?${key}=${variant}&scene=${scene}`);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator(`button[data-${key}="${variant}"]`).getAttribute("aria-pressed"), "true");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${variant}/${scene}/${width} overflows`);
        if (scene === "exam") {
          assert.equal(await page.getByRole("button", { name: "재생", exact: true }).count(), 0);
          await page.locator('[data-action="finish"]').click();
          await page.getByRole("status").filter({ hasText: "두 문제에 모두" }).waitFor();
        }
        if (scene === "practice") {
          assert.equal(await page.locator(".review").count(), 0);
          await page.locator('input[name="q0"]').nth(1).check();
          if (layout === "B") await page.locator('[data-action="next"]').click();
          await page.locator('input[name="q1"]').first().check();
          await page.locator('[data-action="finish"]').click();
          await page.locator(".review").waitFor();
        }
        if (scene === "make" && width === 1440 || scene === "practice" && width === 390) {
          await page.screenshot({ path: path.join(output, `${variant}-${scene}-${width}.png`), fullPage: true });
        }
        views++;
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ views, pageErrors: errors.length, screenshots: output }));
} finally {
  await browser.close();
}
