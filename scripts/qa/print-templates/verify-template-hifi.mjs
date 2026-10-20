import { chromium } from "@playwright/test";
import { freemem } from "node:os";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const out = resolve("docs/design/mockups/print-templates-hifi-20261020");
await mkdir(out, { recursive: true });
if (freemem() < 3 * 2 ** 30) throw Error("Need 3GiB free before Chromium");
console.log("Chromium gate", (freemem() / 2 ** 30).toFixed(2), "GiB");
// LCD edge colors were separately proven in stage 1. Gray AA keeps review captures clear.
const browser = await chromium.launch({ args: ["--disable-lcd-text"] });
try {
  const page = await browser.newPage({
    viewport: { width: 1700, height: 1300 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    remote = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) remote.push(request.url());
  });
  await page.goto(
    pathToFileURL(
      resolve("docs/design/mockups/print-templates-hifi-20261020.html"),
    ).href,
  );
  await page.waitForFunction(() => window.templateHifiReady === true);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#template").selectOption("workbook");
  if ((await page.locator("figure:visible").count()) !== 5)
    throw Error("Template filter failed");
  await page.locator("#template").selectOption("all");
  await page.locator("#size").click();
  const records = await page.locator(".mount").evaluateAll((nodes) =>
    nodes.map((node) => {
      const root = node.shadowRoot,
        sheet = root.querySelector(".wire-page"),
        body = root.querySelector(".paper-body");
      const r = sheet.getBoundingClientRect(),
        b = body.getBoundingClientRect(),
        footer = root.querySelector(".wire-foot").getBoundingClientRect();
      const items = [...root.querySelectorAll(".q > [data-measure-idx]")];
      const failures = [];
      for (const q of root.querySelectorAll(".q")) {
        const a = q.getBoundingClientRect();
        if (
          a.top < b.top - 1 ||
          a.bottom > b.bottom + 1 ||
          a.left < b.left - 1 ||
          a.right > b.right + 1 ||
          a.bottom > footer.top + 1
        )
          failures.push({
            kind: "question bounds",
            top: a.top - b.top,
            bottom: a.bottom - b.bottom,
            footer: a.bottom - footer.top,
            left: a.left - b.left,
            right: a.right - b.right,
          });
        if (q.scrollWidth > q.clientWidth + 1) failures.push("question scroll");
      }
      if (
        sheet.scrollHeight > sheet.clientHeight + 1 ||
        sheet.scrollWidth > sheet.clientWidth + 1
      )
        failures.push("page scroll");
      const fig = node.closest("figure");
      return {
        scheme: node.closest("section").id,
        template: fig.dataset.template,
        width: r.width,
        height: r.height,
        questions: items.length,
        numbers: items.map(
          (item) => item.querySelector("[data-question-number]").textContent,
        ),
        questionHtml: items.map((item) => item.outerHTML),
        failures,
        mode: sheet.className,
        heading: root.querySelector("h1").textContent,
        workAreas: root.querySelectorAll(".work").length,
        infoTables: root.querySelectorAll(".exam-info").length,
        notes: root.querySelectorAll(".note-box").length,
      };
    }),
  );
  if (
    records.length !== 30 ||
    records.some(
      (r) =>
        r.failures.length ||
        Math.abs(r.width - 793.7008) > 1 ||
        Math.abs(r.height - 1122.5197) > 1 ||
        r.questions < 3,
    )
  )
    throw Error(
      JSON.stringify(
        records
          .filter((r) => r.failures.length)
          .map(({ questionHtml, ...r }) => r),
        null,
        2,
      ),
    );
  for (const template of new Set(records.map((r) => r.template))) {
    const group = records.filter((r) => r.template === template);
    if (
      group.length !== 5 ||
      group.some(
        (r) =>
          JSON.stringify(r.questionHtml) !==
          JSON.stringify(group[0].questionHtml),
      )
    )
      throw Error(`Changed question DOM: ${template}`);
  }
  for (const record of records) {
    const selector = `#${record.scheme} figure[data-template="${record.template}"] .mount`;
    await page
      .locator(selector)
      .locator(".wire-page")
      .screenshot({
        path: resolve(
          out,
          `${record.scheme.toLowerCase()}-${record.template}.png`,
        ),
      });
    record.questionSha256 = createHash("sha256")
      .update(record.questionHtml.join("\n"))
      .digest("hex");
    delete record.questionHtml;
    console.log(
      record.scheme,
      record.template,
      record.questions,
      "questions, overflow 0",
    );
  }
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.locator("#T2 .print").click();
  await page.emulateMedia({ media: "print" });
  if ((await page.locator("figure:visible").count()) !== 6)
    throw Error("Selected scheme print must have exactly six pages");
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#size").click();
  const mobile = await page.evaluate(() => {
    window.scrollTo(0, 0);
    return {
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    };
  });
  if (mobile.document > mobile.viewport + 1)
    throw Error(`Mobile page overflow: ${JSON.stringify(mobile)}`);
  await page.screenshot({
    path: resolve(out, "mobile-review.png"),
    fullPage: false,
  });
  const source = await readFile(
    "docs/design/mockups/print-templates-hifi-20261020.html",
  );
  await writeFile(
    resolve(out, "measurements.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        browser: browser.version(),
        lcdText: false,
        sourceSha256: createHash("sha256").update(source).digest("hex"),
        records,
        errors,
        remote,
        mobile,
        filterPassed: true,
        printSelectionPassed: true,
      },
      null,
      2,
    ),
  );
  if (errors.length || remote.length)
    throw Error(JSON.stringify({ errors, remote }));
} finally {
  await browser.close();
  console.log("Chromium closed");
}
