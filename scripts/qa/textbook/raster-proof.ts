/** Actual PDF pixels for manual visual inspection, using the same local pdfjs runtime. */
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { launchExportBrowser } from "../../../src/lib/export/pdfServer";
import { verifyPdfQrPixels } from "../../../src/lib/textbook/render/qrVerify.server";
async function main() {
  const name = process.argv[2] ?? "textbook-synthetic-student",
    pdf = new Uint8Array(await readFile(`output/pdf/${name}.pdf`)),
    doc = await PDFDocument.load(pdf),
    count = doc.getPageCount(),
    browser = await launchExportBrowser();
  try {
    await verifyPdfQrPixels(browser, pdf, [], count, {
      rasterPages: [
        ...new Set([1, Math.min(2, count), Math.ceil(count / 2), count]),
      ],
      onRaster: async (n, png) => {
        await writeFile(`output/pdf/${name}-page-${n}.png`, png);
      },
    });
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
