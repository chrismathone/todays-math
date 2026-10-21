/**
 * 교과서 쌍둥이 시범 — 미리보기 HTML 을 PDF 로(원장님 검토용 · 저장소 밖) · 첫 쪽 화면 사진.
 *
 *   npx tsx scripts/qa/textbook-twin/pdf.ts <html 파일> <pdf 파일> [<png 파일>]
 *
 * Chromium 하나만 띄우고 끝나면 닫는다(리드 규칙 ③). 수식 글꼴(KaTeX CSS)이 다 실린 뒤에 찍는다.
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

async function main(): Promise<void> {
  const [html, pdf, png] = process.argv.slice(2);
  if (!html || !pdf) throw new Error("pdf.ts <html> <pdf> [png]");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 1600 },
    });
    await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (png) await page.screenshot({ path: png, fullPage: false });
    await page.pdf({
      path: pdf,
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
  } finally {
    await browser.close();
  }
  console.log(`PDF → ${pdf}`);
}

void main();
