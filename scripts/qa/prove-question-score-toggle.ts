// Synthetic isolated browser only: no DB, AI, app server, live profile or physical printer.
// Run: npx tsx scripts/qa/prove-question-score-toggle.ts
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, type Browser, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  buildHwpxParts,
  HwpxPayloadSchema,
} from "../../src/lib/export/hwpxServer";
import { pdfDocument, PdfPayloadSchema } from "../../src/lib/export/pdfServer";

// Force the local, windowless XML writer; never contact a configured engine.
async function main() {
  delete process.env.STUDIO_ENGINE_URL;
  delete process.env.VERCEL;
  const root = process.cwd();
  const output = path.join(root, ".qa-artifacts/score-toggle");
  await mkdir(output, { recursive: true });
  const results: unknown[] = [];
  const errors: string[] = [];
  const evidence = {
    results,
    errors,
    physicalPrint: "pending",
    source: "synthetic-only",
  };
  const server = await createServer({
    configFile: false,
    envDir: false,
    root,
    mode: "test",
    cacheDir: path.join(output, "vite-cache"),
    optimizeDeps: { entries: ["scripts/qa/question-score-toggle-fixture.tsx"] },
    plugins: [
      react(),
      {
        name: "score-fixture",
        configureServer(vite) {
          vite.middlewares.use((request, response, next) => {
            if (request.url !== "/") return next();
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            void vite
              .transformIndexHtml(
                "/",
                '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/scripts/qa/question-score-toggle-fixture.tsx"></script></body></html>',
              )
              .then((html) => response.end(html));
          });
        },
      },
    ],
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser: Browser | undefined;
  try {
    await server.listen();
    const address = server.httpServer!.address() as { port: number };
    const origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/*", (route) =>
      route.request().url().startsWith(origin) ||
      route.request().url().startsWith("data:")
        ? route.continue()
        : route.abort(),
    );
    await page.goto(origin, { timeout: 60000 });
    await ready(page);
    const toggle = page.getByRole("checkbox", { name: "배점 숨기기" });
    assert.equal(
      await toggle.isChecked(),
      true,
      "Legacy fixture must default ON",
    );
    await page
      .getByRole("combobox", { name: "미리보기 확대" })
      .selectOption("1");
    for (const [template, label] of Object.entries({
      jeongtong: "정통",
      pyeongga: "평가원",
      modern: "모던",
      workbook: "워크북",
      jaseup: "자습",
      yuhyung: "유형",
    })) {
      await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
      const imageSignatures: string[] = [];
      for (const hidden of [true, false, true]) {
        await toggle.setChecked(hidden);
        await ready(page);
        const screen = await inspect(page);
        assert.equal(screen.items, 5);
        assert.equal(
          screen.overflow.length,
          0,
          JSON.stringify(screen.overflow),
        );
        assert.equal(screen.text.includes("3.0점"), !hidden);
        for (const point of ["2.0점", "4점", "4.5점", "6점", "7.5점"])
          assert.equal(
            screen.text.includes(point),
            !hidden,
            `${template} ${hidden} ${point}`,
          );
        assert.equal(
          screen.text.includes("99.0점"),
          false,
          "Edited OCR must not reintroduce stale metadata",
        );
        assert.ok(screen.math.some((value) => value.includes("x=3")));
        assert.ok(screen.math.some((value) => value.includes("[3,5]")));
        assert.equal(screen.figureText, "A [7점]");
        const images = JSON.stringify(screen.images);
        if (imageSignatures.length) assert.equal(images, imageSignatures[0]);
        imageSignatures.push(images);
        assert.equal(screen.images.length, 2);
        assert.equal(screen.sourceUnchanged, true);
        await page.emulateMedia({ media: "print" });
        const print = await inspect(page);
        assert.equal(print.text, screen.text);
        assert.equal(print.overflow.length, 0, JSON.stringify(print.overflow));
        await page.emulateMedia({ media: "screen" });
        // Third pass verifies reversibility after OFF; export each distinct setting once.
        if (imageSignatures.length === 3) continue;
        const prefix = `${template}-${hidden ? "hidden" : "visible"}`;
        let hwpxObjects = 0;
        let hwpxParts = "";
        await page.route("**/api/exports/hwpx", async (route) => {
          const payload = HwpxPayloadSchema.parse(
            route.request().postDataJSON(),
          );
          const objects = payload.pages.flatMap((sheet) => sheet.objects);
          hwpxObjects = objects.length;
          const text = objects.map((item) => item.text ?? "").join("");
          assert.equal(text.includes("3.0점"), !hidden);
          assert.equal(text.includes("2.0점"), !hidden);
          assert.equal(
            objects.filter((item) => item.type === "image").length,
            3,
          );
          const parts = await buildHwpxParts(payload);
          hwpxParts = Object.entries(parts)
            .filter(([name]) => /^Contents\/section/.test(name))
            .map(([, value]) => value)
            .join("\n");
          assert.equal(hwpxParts.includes("3.0점"), !hidden);
          assert.equal(hwpxParts.includes("2.0점"), !hidden);
          await route.fulfill({
            json: {
              partsGzip: gzipSync(JSON.stringify(parts)).toString("base64"),
            },
          });
        });
        const hwpDownload = page.waitForEvent("download");
        await page.getByRole("button", { name: "HWPX 내보내기" }).click();
        await (await hwpDownload).saveAs(path.join(output, `${prefix}.hwpx`));
        await writeFile(path.join(output, `${prefix}-hwpx.xml`), hwpxParts);
        await page.unroute("**/api/exports/hwpx");
        let pdfHtml = "";
        await page.route("**/api/exports/pdf", async (route) => {
          const input = PdfPayloadSchema.parse(route.request().postDataJSON());
          pdfHtml = input.html;
          assert.equal(pdfHtml.includes("3.0점"), !hidden);
          // Use the production PDF HTML builder in the same isolated browser process.
          const exportPage = await browser!.newPage({
            javaScriptEnabled: false,
          });
          try {
            await exportPage.route("**/*", (resource) =>
              resource.request().url().startsWith(origin) ||
              resource.request().url().startsWith("data:")
                ? resource.continue()
                : resource.abort(),
            );
            await exportPage.emulateMedia({ media: "print" });
            await exportPage.setContent(pdfDocument(input, origin));
            await exportPage.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all(
                [...document.images].map((image) => image.decode()),
              );
            });
            const bytes = await exportPage.pdf({
              preferCSSPageSize: true,
              printBackground: false,
            });
            await route.fulfill({
              contentType: "application/pdf",
              body: bytes,
            });
          } finally {
            await exportPage.close();
          }
        });
        const pdfDownload = page.waitForEvent("download");
        await page.getByRole("button", { name: "PDF 내려받기" }).click();
        const pdfPath = path.join(output, `${prefix}.pdf`);
        await (await pdfDownload).saveAs(pdfPath);
        await page.unroute("**/api/exports/pdf");
        const pdf = await getDocument({
          data: new Uint8Array(await readFile(pdfPath)),
          useSystemFonts: true,
        }).promise;
        let pdfText = "";
        for (let number = 1; number <= pdf.numPages; number++) {
          const sheet = await pdf.getPage(number);
          const text = await sheet.getTextContent();
          pdfText += text.items
            .map((item) => ("str" in item ? item.str : ""))
            .join("");
          if (number === 1 && template === "jeongtong") {
            const viewport = sheet.getViewport({ scale: 1 });
            const factory = pdf.canvasFactory as {
              create: (
                width: number,
                height: number,
              ) => {
                canvas: HTMLCanvasElement & {
                  toBuffer: (mime: string) => Buffer;
                };
                context: CanvasRenderingContext2D;
              };
              destroy: (canvas: unknown) => void;
            };
            const canvas = factory.create(viewport.width, viewport.height);
            await sheet.render({
              canvas: canvas.canvas,
              canvasContext: canvas.context,
              viewport,
            }).promise;
            await writeFile(
              path.join(output, `${prefix}-pdf.png`),
              canvas.canvas.toBuffer("image/png"),
            );
            factory.destroy(canvas);
          }
        }
        assert.equal(pdfText.includes("3.0점"), !hidden);
        assert.equal(pdfText.includes("2.0점"), !hidden);
        assert.equal(pdf.numPages, screen.pages);
        results.push({
          template,
          hidden,
          pages: screen.pages,
          hwpxObjects,
          sourceUnchanged: screen.sourceUnchanged,
          scores: !hidden,
          figures: screen.images.length + 1,
          overflow: screen.overflow.length,
          pdfPages: pdf.numPages,
          pdfText,
          pdfHtmlBytes: pdfHtml.length,
        });
        await pdf.loadingTask.destroy();
        await writeFile(
          path.join(output, "evidence.json"),
          JSON.stringify(evidence, null, 2),
        );
        await page.screenshot({
          path: path.join(output, `${prefix}-preview.png`),
        });
        console.log(`${prefix}: preview / print / PDF / HWPX verified`);
      }
    }
    await toggle.uncheck();
    await page.evaluate(() => window.scoreFixture.restore());
    await ready(page);
    assert.equal(await toggle.isChecked(), false);
    assert.equal((await inspect(page)).sourceUnchanged, true);
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(output, "evidence.json"),
      JSON.stringify(
        { ...evidence, restoredOff: true, scenarios: results.length },
        null,
        2,
      ),
    );
    console.log(`Evidence: ${path.join(output, "evidence.json")}`);
  } catch (error) {
    await writeFile(
      path.join(output, "failure.json"),
      JSON.stringify({ ...evidence, failure: String(error) }, null, 2),
    );
    throw error;
  } finally {
    await browser?.close();
    await server.close();
  }
}

void main();

async function ready(page: Page) {
  await page.waitForFunction(
    () =>
      document.querySelector('#worksheet-preview[aria-busy="false"]') &&
      document.querySelector("[data-unified-paper]"),
  );
}
async function inspect(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-mathgen-document]")!;
    const sheets = [...root.querySelectorAll("[data-unified-paper]")];
    const bodies = [...root.querySelectorAll("[data-problem-body]")];
    const overflow: string[] = [];
    for (const sheet of sheets) {
      const bounds = sheet
        .querySelector(".measure-body")!
        .getBoundingClientRect();
      for (const item of sheet.querySelectorAll<HTMLElement>(
        "[data-measure-idx]",
      )) {
        const box = item.getBoundingClientRect();
        if (
          box.bottom > bounds.bottom + 1 ||
          item.scrollWidth > item.clientWidth + 1
        )
          overflow.push(item.dataset.measureIdx!);
      }
    }
    return {
      pages: sheets.length,
      items: bodies.length,
      overflow,
      text: bodies
        .map((body) => {
          const copy = body.cloneNode(true) as Element;
          copy.querySelectorAll("svg, img").forEach((image) => image.remove());
          return copy.textContent;
        })
        .join("\n"),
      math: [...root.querySelectorAll("annotation")].map(
        (node) => node.textContent ?? "",
      ),
      figureText: root.querySelector("[data-figure-svg] text")?.textContent,
      images: [...root.querySelectorAll("img")].map((image) => ({
        src: image.src,
        alt: image.alt,
      })),
      sourceUnchanged: window.scoreFixture.snapshot().sourceUnchanged,
    };
  });
}
