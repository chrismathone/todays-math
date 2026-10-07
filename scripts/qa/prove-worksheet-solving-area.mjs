// Synthetic components only; no application server, storage, DB, AI, or live browser.
// Run: node scripts/qa/prove-worksheet-solving-area.mjs
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = process.cwd();
const output = path.join(root, ".qa-artifacts/worksheet-solving-area");
await mkdir(output, { recursive: true });
const server = await createServer({
  configFile: false,
  envDir: false,
  root,
  mode: "test",
  cacheDir: path.join(output, "vite-cache"),
  optimizeDeps: { entries: ["scripts/qa/worksheet-solving-area-fixture.tsx"] },
  plugins: [
    react(),
    {
      name: "synthetic-fixture",
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== "/") return next();
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          void vite
            .transformIndexHtml(
              "/",
              '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/scripts/qa/worksheet-solving-area-fixture.tsx"></script></body></html>',
            )
            .then((html) => response.end(html));
        });
      },
    },
  ],
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ||
    route.request().url().startsWith("data:")
      ? route.continue()
      : route.abort(),
  );
  await page.goto(origin);
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector('#worksheet-preview[aria-busy="false"]') &&
        document.querySelector("[data-unified-paper]"),
      null,
      { timeout: 60000 },
    );
  await ready();
  console.log("Synthetic worksheet mounted");
  await page.getByRole("combobox", { name: "미리보기 확대" }).selectOption("1");
  const results = [];
  for (const template of [
    "jeongtong",
    "modern",
    "pyeongga",
    "workbook",
    "jaseup",
    "yuhyung",
  ]) {
    for (const layoutMode of ["spacing", "count"]) {
      for (const solvingArea of ["off", "blank", "ruled", "chalkboard"]) {
        await page.evaluate(
          (options) => window.setSolveFixtureOptions(options),
          { template, layoutMode, solvingArea, columns: 1, showAnswers: false },
        );
        await ready();
        const measure = await inspect(page);
        assert.equal(
          measure.items,
          12,
          "Every synthetic question must survive pagination",
        );
        assert.equal(
          measure.overflow.length,
          0,
          JSON.stringify({ template, layoutMode, solvingArea, ...measure }),
        );
        assert.equal(
          measure.workspaces,
          solvingArea === "off" ? 0 : measure.pages,
          JSON.stringify({ template, layoutMode, solvingArea, ...measure }),
        );
        if (solvingArea !== "off") {
          assert.ok(
            Math.abs(measure.ratio - 1.5) < 0.01,
            JSON.stringify(measure),
          );
          assert.ok(measure.headerFullWidth, "Header must remain full-width");
          assert.ok(
            measure.widthDelta < 0.1,
            "Actual question width must equal hidden measurement width",
          );
        }
        await page.emulateMedia({ media: "print" });
        const printed = await inspect(page);
        assert.equal(printed.pages, measure.pages);
        assert.equal(
          printed.overflow.length,
          0,
          JSON.stringify({ template, layoutMode, solvingArea, printed }),
        );
        assert.ok(
          Math.abs(printed.questionWidth - measure.questionWidth) < 0.1,
        );
        assert.equal(printed.workspaces, measure.workspaces);
        if (template === "jeongtong" && layoutMode === "spacing") {
          await page.pdf({
            path: path.join(output, `${solvingArea}.pdf`),
            preferCSSPageSize: true,
            printBackground: false,
          });
          await page.screenshot({
            path: path.join(output, `${solvingArea}-print.png`),
            fullPage: false,
          });
        }
        await page.emulateMedia({ media: "screen" });
        results.push({ template, layoutMode, solvingArea, ...measure });
      }
      for (const columnDivider of [false, true]) {
        await page.evaluate(
          (options) => window.setSolveFixtureOptions(options),
          { columns: 2, columnDivider, solvingArea: "chalkboard" },
        );
        await ready();
        const measure = await inspect(page);
        assert.equal(measure.items, 12);
        assert.equal(measure.workspaces, 0);
        assert.equal(measure.dividers, columnDivider ? measure.pages : 0);
        assert.equal(
          measure.overflow.length,
          0,
          JSON.stringify({ template, layoutMode, columnDivider, measure }),
        );
        await page.emulateMedia({ media: "print" });
        const printed = await inspect(page);
        assert.equal(printed.dividers, measure.dividers);
        assert.equal(printed.overflow.length, 0, JSON.stringify(printed));
        await page.emulateMedia({ media: "screen" });
        results.push({
          template,
          layoutMode,
          columns: 2,
          columnDivider,
          ...measure,
        });
      }
    }
  }
  await page.evaluate(() =>
    window.setSolveFixtureOptions({
      template: "jeongtong",
      columns: 1,
      solvingArea: "ruled",
      layoutMode: "spacing",
    }),
  );
  await ready();
  await page.evaluate(() => {
    window.typingProof = {
      sheet: document.querySelector("[data-unified-paper]"),
      removed: 0,
      empty: 0,
      progress: 0,
    };
    window.typingObserver = new MutationObserver(() => {
      const proof = window.typingProof;
      if (!proof.sheet.isConnected) proof.removed++;
      if (!document.querySelector("[data-unified-paper]")) proof.empty++;
      if (
        document.body.textContent.includes("시험지 미리보기를 준비하고 있어요")
      )
        proof.progress++;
    });
    window.typingObserver.observe(document.getElementById("root"), {
      childList: true,
      subtree: true,
    });
  });
  for (const name of [
    "제목",
    "학교/기관명",
    "학년",
    "과목",
    "시험 시간",
    "출제자",
  ]) {
    const input = page.getByRole("textbox", { name, exact: true });
    const typed = `Live ${name}`;
    await input.fill("");
    await input.pressSequentially(typed, { delay: 35 });
    assert.equal(await input.inputValue(), typed);
    assert.equal(
      await input.evaluate((element) => element === document.activeElement),
      true,
    );
    await ready();
    assert.ok(
      await page
        .locator("[data-unified-paper]")
        .first()
        .textContent()
        .then((text) => text.includes(typed)),
    );
    const focus = await input.evaluate((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      const scroller = document
        .getElementById("worksheet-settings-panel")
        .getBoundingClientRect();
      return {
        width: parseFloat(style.outlineWidth),
        offset: parseFloat(style.outlineOffset),
        fullyVisible:
          bounds.top >= scroller.top &&
          bounds.bottom <= scroller.bottom &&
          bounds.left >= scroller.left &&
          bounds.right <= scroller.right,
      };
    });
    assert.ok(
      focus.width > 0 && focus.width + focus.offset <= 0,
      JSON.stringify({ name, focus }),
    );
    assert.ok(focus.fullyVisible, JSON.stringify({ name, focus }));
  }
  const typing = await page.evaluate(() => {
    window.typingObserver.disconnect();
    const { removed, empty, progress } = window.typingProof;
    return { removed, empty, progress };
  });
  assert.deepEqual(typing, { removed: 0, empty: 0, progress: 0 });
  await page.screenshot({ path: path.join(output, "typing-preview.png") });
  assert.deepEqual(errors, []);
  const pdfs = [];
  for (const style of ["off", "blank", "ruled", "chalkboard"]) {
    const document = await getDocument({
      data: new Uint8Array(await readFile(path.join(output, `${style}.pdf`))),
      useSystemFonts: true,
    }).promise;
    const expected = results.find(
      (result) =>
        result.template === "jeongtong" &&
        result.layoutMode === "spacing" &&
        result.solvingArea === style,
    );
    assert.equal(document.numPages, expected.pages);
    const first = await document.getPage(1);
    const viewport = first.getViewport({ scale: 1 });
    const canvas = document.canvasFactory.create(
      viewport.width,
      viewport.height,
    );
    await first.render({ canvasContext: canvas.context, viewport }).promise;
    await writeFile(
      path.join(output, `${style}-pdf.png`),
      canvas.canvas.toBuffer("image/png"),
    );
    document.canvasFactory.destroy(canvas);
    pdfs.push({ style, pages: document.numPages, bounds: first.view });
    await document.loadingTask.destroy();
  }
  await writeFile(
    path.join(output, "evidence.json"),
    JSON.stringify(
      { scenarios: results.length, results, typing, pdfs, errors },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ scenarios: results.length, typing, errors, output }),
  );
} finally {
  await browser?.close();
  await server.close();
}

async function inspect(page) {
  return page.evaluate(() => {
    const sheets = [
      ...document.querySelectorAll(
        '[data-unified-paper][data-page-kind="questions"]',
      ),
    ];
    const overflow = [];
    let items = 0;
    for (const [pageIndex, sheet] of sheets.entries()) {
      const body = sheet.querySelector(".measure-body");
      const bounds = body.getBoundingClientRect();
      for (const item of sheet.querySelectorAll("[data-measure-idx]")) {
        items++;
        const box = item.getBoundingClientRect();
        if (
          box.bottom > bounds.bottom + 1 ||
          box.right > bounds.right + 1 ||
          box.left < bounds.left - 1
        )
          overflow.push({
            pageIndex,
            item: item.dataset.measureIdx,
            box: box.toJSON(),
            bounds: bounds.toJSON(),
          });
        if (item.scrollWidth > item.clientWidth + 1)
          overflow.push({
            pageIndex,
            horizontal: item.scrollWidth - item.clientWidth,
          });
      }
    }
    const sheet = sheets[0];
    const body = sheet.querySelector(".measure-body");
    const column = sheet.querySelector("[data-question-column]");
    const workspace = sheet.querySelector("[data-solving-area]");
    const item = sheet.querySelector("[data-measure-idx]");
    const measured = document.querySelector("[data-measure-items] > div");
    const outer = sheet.firstElementChild;
    const availableWidth =
      outer.getBoundingClientRect().width -
      parseFloat(getComputedStyle(outer).paddingLeft) -
      parseFloat(getComputedStyle(outer).paddingRight);
    const headerWidth = Math.max(
      ...[...outer.children]
        .filter((child) => child !== body && child !== outer.lastElementChild)
        .map((child) => child.getBoundingClientRect().width),
    );
    return {
      pages: sheets.length,
      items,
      overflow,
      workspaces: sheets.reduce(
        (sum, sheet) =>
          sum + sheet.querySelectorAll("[data-solving-area]").length,
        0,
      ),
      dividers: sheets.reduce(
        (sum, sheet) =>
          sum + sheet.querySelectorAll("[data-column-divider]").length,
        0,
      ),
      ratio:
        column && workspace
          ? column.getBoundingClientRect().width /
            workspace.getBoundingClientRect().width
          : null,
      headerFullWidth: Math.abs(headerWidth - availableWidth) < 0.1,
      questionWidth: (column ?? item).getBoundingClientRect().width,
      widthDelta: column
        ? Math.abs(
            column.getBoundingClientRect().width -
              measured.getBoundingClientRect().width,
          )
        : null,
    };
  });
}
