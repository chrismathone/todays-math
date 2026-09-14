import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseline = process.argv.includes("--baseline");
const output = path.resolve(".qa-artifacts/source-figures");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1240, height: 960 } });
const errors = [];
page.on("pageerror", (error) => {
  errors.push(error.message);
  console.error(error.message);
});
try {
  await page.goto("http://127.0.0.1:4327/");
  await page.locator("#indexed .visual-document svg").waitFor();
  await page.waitForTimeout(2000);
  const dimensions = await page
    .locator('[data-figure-index][role="button"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        const svg = node.querySelector("svg")?.getBoundingClientRect();
        return {
          id: node.closest("article").id,
          mode: node.closest("[data-mode]").dataset.mode,
          width: box.width,
          height: box.height,
          svgWidth: svg?.width,
          svgHeight: svg?.height,
          rawLabels: [...node.querySelectorAll("svg text")].map(
            (text) => text.textContent,
          ),
          overflow: node.scrollWidth > node.clientWidth + 1,
        };
      }),
    );
  await page.locator('#standalone [data-mode="read"] [role="button"]').hover();
  await page.screenshot({
    path: path.join(output, baseline ? "before.png" : "after.png"),
    fullPage: true,
  });
  await fs.writeFile(
    path.join(output, baseline ? "before.json" : "after.json"),
    JSON.stringify({ dimensions, errors }, null, 2),
  );
  if (!baseline) {
    for (const entry of dimensions.filter((entry) => entry.svgWidth)) {
      expect(
        entry.width - entry.svgWidth,
        `${entry.id}/${entry.mode}: frame width`,
      ).toBeLessThanOrEqual(16);
      expect(
        entry.height - entry.svgHeight,
        `${entry.id}/${entry.mode}: frame height`,
      ).toBeLessThanOrEqual(16);
      expect(entry.rawLabels.filter((label) => /\$/.test(label))).toEqual([]);
      expect(entry.overflow).toBe(false);
    }
    expect(errors).toEqual([]);
    for (const id of ["standalone", "indexed", "row", "choices", "table"]) {
      const article = page.locator(`#${id}`);
      const original = await article.locator("[data-value]").textContent();
      for (const mode of ["read", "edit"]) {
        const frame = article
          .locator(
            `[data-mode="${mode}"] [data-figure-index="0"][role="button"]`,
          )
          .first();
        await frame.click();
        await frame.press("Enter");
        await frame.press("Space");
      }
      await expect(article.locator("output")).toHaveText("0,0,0,0,0,0");
      await expect(article.locator("[data-value]")).toHaveText(original);
      if (["standalone", "indexed", "row"].includes(id)) {
        await article
          .getByRole("button", { name: "Redraw", exact: true })
          .click();
        for (const mode of ["read", "edit"]) {
          const frame = article
            .locator(
              `[data-mode="${mode}"] [data-figure-index="0"][role="button"]`,
            )
            .first();
          await expect(
            frame.locator('[data-label="$-3$"] path').first(),
          ).toBeAttached();
          await expect(frame.locator('[data-label="$-2$"]')).toHaveCount(0);
          await expect(frame.locator("svg").first()).toHaveAttribute(
            "viewBox",
            "0 0 240 360",
          );
          await expect(frame.locator("svg > path").first()).toHaveAttribute(
            "d",
            "M30 40 Q100 650 200 40 M30 180 H220 M140 20 V340",
          );
        }
        await expect(article.locator("[data-value]")).toHaveText(original);
      }
      // Toggling code view must not serialize prepared paths into stored source.
      await article
        .getByRole("button", { name: "원문 코드", exact: true })
        .click();
      await expect(article.locator("textarea")).toHaveValue(original);
      await article
        .getByRole("button", { name: "직접 편집으로", exact: true })
        .click();
      await expect(article.locator("[data-value]")).toHaveText(original);
    }
    await expect(
      page.locator('#locked [data-figure-index][role="button"]'),
    ).toHaveCount(0);
    for (const mode of ["read", "edit"]) {
      for (const id of ["standalone", "indexed", "left", "right"]) {
        const alignment = await page
          .locator(`#${id} [data-mode="${mode}"] .source-figure-frame`)
          .evaluate((frame) => {
            const box = frame.getBoundingClientRect();
            const parent = frame.parentElement.getBoundingClientRect();
            return {
              left: box.left - parent.left,
              right: parent.right - box.right,
              center: Math.abs(
                box.left + box.width / 2 - parent.left - parent.width / 2,
              ),
            };
          });
        expect(
          alignment[
            id === "left" ? "left" : id === "right" ? "right" : "center"
          ],
          `${id}/${mode}: source alignment`,
        ).toBeLessThanOrEqual(1);
      }
      await expect(
        page.locator(`#choices [data-mode="${mode}"] .choice`),
      ).toHaveCount(5);
      await expect(
        page.locator(`#table [data-mode="${mode}"] table tr`),
      ).toHaveCount(2);
      await expect(
        page.locator(`#table [data-mode="${mode}"] td [data-figure-index="0"]`),
      ).toHaveCount(1);
      const row = page.locator(`#row [data-mode="${mode}"] .figure-row`);
      const frames = await row
        .locator(".source-figure-frame")
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            x: node.getBoundingClientRect().x,
            y: node.getBoundingClientRect().y,
          })),
        );
      expect(frames[1].x).toBeGreaterThan(frames[0].x);
      expect(Math.abs(frames[1].y - frames[0].y)).toBeLessThan(2);
    }
    await page
      .locator("#indexed")
      .screenshot({ path: path.join(output, "indexed-read-edit.png") });
    await page.setViewportSize({ width: 390, height: 900 });
    const narrow = await page
      .locator(".source-figure-frame")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const frame = node.getBoundingClientRect();
          const svg = node.querySelector("svg")?.getBoundingClientRect();
          return {
            id: node.closest("article").id,
            mode: node.closest("[data-mode]").dataset.mode,
            x: frame.x,
            width: frame.width,
            height: frame.height,
            svgWidth: svg?.width,
            svgHeight: svg?.height,
          };
        }),
      );
    for (const frame of narrow) {
      expect(
        frame.x + frame.width,
        `${frame.id}/${frame.mode}: narrow overflow`,
      ).toBeLessThanOrEqual(390);
      expect(
        frame.width,
        `${frame.id}/${frame.mode}: visible width`,
      ).toBeGreaterThan(20);
      if (frame.svgWidth) {
        expect(frame.width - frame.svgWidth).toBeLessThanOrEqual(16);
        expect(frame.height - frame.svgHeight).toBeLessThanOrEqual(16);
      }
    }
    for (const mode of ["read", "edit"]) {
      const frames = await page
        .locator(`#row [data-mode="${mode}"] .source-figure-frame`)
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().y),
        );
      expect(
        frames[1],
        `${mode}: figures stack at narrow widths`,
      ).toBeGreaterThan(frames[0]);
    }
    await page
      .locator("#row")
      .screenshot({ path: path.join(output, "narrow-row.png") });
    await fs.writeFile(
      path.join(output, "interactions.json"),
      JSON.stringify(
        {
          clicksAndKeyboard: "30 callbacks with correct index",
          redraws: "read/edit paths and labels updated; source preserved",
          table: "2 rows with figures in cells",
          choices: 5,
          narrow,
          errors,
        },
        null,
        2,
      ),
    );
  }
  console.log(
    JSON.stringify({ output, baseline, dimensions, errors }, null, 2),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(output, "failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
