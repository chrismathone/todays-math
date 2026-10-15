import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const output =
  "C:/Creative/testautocreator/.qa-artifacts/arithmetic-notation-20261015/paper";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const id of [
    "m3-pythagoras-isosceles-height-surd",
    "m3-trig-area-given-sine",
    "m2-exponent-quotient-missing",
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1100, height: 1200 },
    });
    const result = { id, errors: [], blockedApi: [] };
    results.push(result);
    await context.route("**/api/**", (r) => {
      result.blockedApi.push(r.request().url());
      return r.abort("blockedbyclient");
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => result.errors.push(e.message));
    try {
      await page.goto(
        `http://127.0.0.1:3000/dev/arithmetic/grade-print?type=${id}&count=4&density=24`,
      );
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("[data-native-problem]")).toHaveCount(4);
      result.metrics = await page
        .locator("[data-native-problem]")
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const p = n.closest("[data-page-kind]"),
              b = n.getBoundingClientRect(),
              pb = p.getBoundingClientRect(),
              row = n.parentElement.getBoundingClientRect();
            const ink = [...n.querySelectorAll(".katex-html,img")].map((e) =>
              e.getBoundingClientRect(),
            );
            return {
              font: getComputedStyle(n).fontSize,
              inside:
                b.bottom <= row.bottom + 1 &&
                b.right <= row.right + 1 &&
                b.bottom < pb.bottom - 30,
              inkInside: ink.every(
                (i) => i.left >= b.left - 1 && i.right <= b.right + 1,
              ),
              errors: n.querySelectorAll(".katex-error").length,
              annotations: [...n.querySelectorAll("annotation")].map(
                (e) => e.textContent,
              ),
            };
          }),
        );
      await page
        .locator('[data-page-kind="questions"]')
        .first()
        .screenshot({ path: `${output}/${id}.png` });
      assert(
        result.metrics.every((m) => m.inside && m.inkInside && !m.errors),
        JSON.stringify(result.metrics),
      );
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.blockedApi, []);
      console.log(id, "PASS");
    } finally {
      await context.close();
      await writeFile(`${output}/proof.json`, JSON.stringify(results, null, 2));
    }
  }
} finally {
  await browser.close();
}
