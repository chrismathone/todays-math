import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const phase = process.argv[2] || "after";
const out = "docs/planning/tracks/reports/print-spacing-20261020";
console.log("Launching Chromium", phase);
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
console.log("Chromium ready");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const results = [];
try {
  await page.goto(process.env.SPACING_URL || "http://127.0.0.1:3124", {
    timeout: 90000,
  });
  console.log("Fixture loaded");
  for (const template of ["정통", "모던"])
    for (const columns of [2, 1])
      for (const mixed of [false, true]) {
        console.log(template, columns, mixed);
        await page
          .getByRole("button", { name: new RegExp(`^${template} `) })
          .click();
        await page
          .getByRole("button", { name: `${columns}단`, exact: true })
          .click();
        await page
          .getByRole("checkbox", { name: "긴 문항 섞기" })
          .setChecked(mixed);
        await page
          .getByRole("button", {
            name: phase === "before" ? "좁게" : "스마트",
            exact: true,
          })
          .click();
        await page.waitForSelector('[data-spacing-ready="true"]');
        await page.waitForTimeout(300);
        const id = `${phase}-${template}-${columns}-${mixed ? "mixed" : "short"}`;
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${out}/${id}-pc.png` });
        const data = await page
          .locator("[data-mathgen-document]")
          .evaluate((root) =>
            Array.from(
              root.querySelectorAll("[data-unified-paper]"),
              (paper, p) => {
                const body = paper.querySelector(".measure-body");
                const items = Array.from(
                  body.querySelectorAll("[data-measure-idx]"),
                );
                return {
                  page: p + 1,
                  items: items.map((item, i) => {
                    const r = item.getBoundingClientRect();
                    const next = items[i + 1]?.getBoundingClientRect();
                    const col =
                      item.closest("[data-spacing-column]") ||
                      (body.children.length > 1 ? item.parentElement : body);
                    const bottom =
                      col.getBoundingClientRect().bottom -
                      (parseFloat(getComputedStyle(body).paddingBottom) || 0);
                    const slot = item.closest("[data-spacing-slot]");
                    return {
                      item: i + 1,
                      height: r.height,
                      allocated: slot
                        ? slot.getBoundingClientRect().bottom - r.bottom
                        : null,
                      blank:
                        next && Math.abs(next.x - r.x) < 2
                          ? next.top - r.bottom
                          : bottom - r.bottom,
                      x: r.x,
                      y: r.y,
                    };
                  }),
                };
              },
            ),
          );
        await page.emulateMedia({ media: "print" });
        await page.addStyleTag({
          content:
            "body > * { } main > label, main > div > :first-child {display:none!important} main, main > div {display:block!important;padding:0!important} [data-mathgen-document] {position:static!important;visibility:visible!important}",
        });
        const paper = page
          .locator("[data-mathgen-document] [data-unified-paper]")
          .first();
        await paper.screenshot({ path: `${out}/${id}-a4.png` });
        await page.emulateMedia({ media: "screen" });
        // Drop temporary print-only style before the next screen capture.
        await page
          .locator("style")
          .last()
          .evaluate((el) => el.remove());
        results.push({ id, pages: data });
      }
  await writeFile(
    `${out}/${phase}-measurements.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
} finally {
  await browser.close();
}
