import { expect, test } from "@playwright/test";
import {
  buildHwpxParts,
  HwpxPayloadSchema,
} from "../../src/lib/export/hwpxServer";
import { buildPdf, PdfPayloadSchema } from "../../src/lib/export/pdfServer";
import { gzipSync } from "node:zlib";

test("actual worksheet preview exports native HWPX and a matching PDF without desktop control", async ({
  page,
  browser,
}, testInfo) => {
  await page.goto("/?native");
  await page.getByRole("checkbox", { name: "배점 숨기기" }).uncheck();
  await expect(
    page.getByRole("button", { name: "HWPX 내보내기" }),
  ).toBeEnabled();
  const pageCount = await page
    .locator("[data-mathgen-document] [data-unified-paper]")
    .count();
  let measured: unknown;
  await page.route("**/api/exports/hwpx", async (route) => {
    measured = route.request().postDataJSON();
    const parts = await buildHwpxParts(HwpxPayloadSchema.parse(measured));
    await route.fulfill({
      json: { partsGzip: gzipSync(JSON.stringify(parts)).toString("base64") },
    });
  });
  const hwpxDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "HWPX 내보내기" }).click();
  await (await hwpxDownload).saveAs(testInfo.outputPath("worksheet.hwpx"));
  const payload = HwpxPayloadSchema.parse(measured);
  expect(payload.pages).toHaveLength(pageCount);
  const firstEquation = payload.pages
    .flatMap((p) => p.objects)
    .find((item) => item.type === "equation");
  expect(firstEquation?.latex).toContain("frac");
  const objects = payload.pages.flatMap((p) => p.objects);
  expect(objects.filter((item) => item.type === "image")).toHaveLength(2);
  expect(
    objects.some(
      (item) =>
        item.type === "text" &&
        item.text === "않은" &&
        item.bold &&
        item.underline,
    ),
  ).toBe(true);
  expect(objects.some((item) => item.text?.includes("3.0점"))).toBe(true);
  expect(objects.some((item) => item.text?.includes("[그림"))).toBe(false);
  // Preview zoom must not change the physical native document geometry.
  await page
    .getByRole("combobox", { name: "미리보기 확대" })
    .selectOption("0.5");
  const zoomed = await page.evaluate(async () => {
    const collect = (
      window as unknown as {
        collectHwpxLayout: (root: HTMLElement) => Promise<{ pages: unknown[] }>;
      }
    ).collectHwpxLayout;
    return (
      await collect(
        document.querySelector<HTMLElement>("[data-mathgen-document]")!,
      )
    ).pages;
  });
  expect(zoomed).toEqual(payload.pages);

  process.env.PDF_CHROMIUM_EXECUTABLE = browser.browserType().executablePath();
  await page.route("**/api/exports/pdf", async (route) => {
    const bytes = await buildPdf(
      PdfPayloadSchema.parse(route.request().postDataJSON()),
      "http://127.0.0.1:4191",
    );
    await route.fulfill({
      contentType: "application/pdf",
      body: Buffer.from(bytes),
    });
  });
  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 내려받기" }).click();
  await (await pdfDownload).saveAs(testInfo.outputPath("worksheet.pdf"));
  await page.screenshot({
    path: testInfo.outputPath("worksheet-preview.png"),
    fullPage: true,
  });
  await expect(page.getByRole("alert")).toHaveCount(0);
});
